/*
 * services/mic.js — 麥克風服務（FE-36）
 * 依據：architecture.md v0.5 §7.14「隱私與 API 限制」「麥克風生命週期」「services/mic.js API」「錯誤對照（DS-03）」；
 *       契約 README §8 AC-21-03 列、§9.3 DS-02、DS-03；PRD US-33、Q-36
 * 涵蓋：AC-33-01～AC-33-07、AC-08-09、AC-21-03
 *
 * 隱私限制（AC-21-03、NFR-3）：
 * - 只以 getUserMedia({ audio: true }) 取得音軌，接到 AnalyserNode 即時讀取音量；
 * - 不使用任何錄音 API，不錄製、不編碼、不輸出音訊，也不把任何節點接到 destination（避免回授與播放）；
 * - 不做任何網路傳送，不寫入 store、AppState 或任何瀏覽器儲存；音量值只存在本模組區域變數，用完即丟。
 *
 * 提供 EMT.services.mic：
 * - isSupported() → boolean：navigator.mediaDevices 存在且 getUserMedia 為函式
 * - isActive() → boolean：持有音軌且至少一條 readyState === "live"
 * - acquire() → Promise<{ ok: true, reused, metering } | { ok: false, reason }>，永不 reject
 *     reason：「permission」權限被拒、「notfound」找不到裝置、「unavailable」無法使用（照常辨識）、
 *             「released」取得中已被 release（呼叫端不顯示訊息）
 * - startMeter(onLevel) → boolean：每 meter.UPDATE_INTERVAL_MS 讀一次音量，只在亮格數改變時回呼 onLevel(k)
 * - stopMeter()：同步停止音量讀取；冪等
 * - onTrackEnded(fn)：設定音軌結束（拔除、被停用）時的唯一回呼
 * - release()：同步釋放全部資源；冪等
 * - tracks() → 目前持有音軌陣列的複本（只供 V-MIC 在 DevTools 檢查，程式其他地方不得呼叫）
 * - create(globalObject)：以指定的全域物件建立獨立實例（Node 測試注入替身）
 * 載入時不操作 DOM、不呼叫任何瀏覽器 API（LD-2）；所有回呼例外都被攔下。
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.EMT = root.EMT || {};
    root.EMT.services = root.EMT.services || {};
    root.EMT.services.mic = api;
  }
})(typeof self !== "undefined" ? self : this, function (defaultGlobal) {
  "use strict";

  /** getUserMedia 錯誤名稱 → 權限被拒（DS-03） */
  var PERMISSION_ERRORS = ["NotAllowedError", "PermissionDeniedError", "SecurityError"];

  /** getUserMedia 錯誤名稱 → 找不到裝置（DS-03） */
  var NOTFOUND_ERRORS = ["NotFoundError", "DevicesNotFoundError", "OverconstrainedError"];

  /**
   * 取得 core/meter（LD-1：於呼叫時取用）。不存在時視為組裝錯誤（LD-3）。
   */
  function meter() {
    var m = null;
    if (typeof require === "function" && typeof module === "object") {
      m = require("../core/meter.js");
    } else {
      m = defaultGlobal && defaultGlobal.EMT && defaultGlobal.EMT.core && defaultGlobal.EMT.core.meter;
    }
    if (!m) throw new Error("EMT.core.meter 未載入（services/mic.js）");
    return m;
  }

  /**
   * getUserMedia 失敗原因分類（§7.14 錯誤對照表）。
   * @param {*} err
   * @returns {"permission"|"notfound"|"unavailable"}
   */
  function reasonOfError(err) {
    var name = "";
    try {
      name = err && typeof err.name === "string" ? err.name : "";
    } catch (e) {
      name = "";
    }
    if (PERMISSION_ERRORS.indexOf(name) >= 0) return "permission";
    if (NOTFOUND_ERRORS.indexOf(name) >= 0) return "notfound";
    return "unavailable";
  }

  /** 安全呼叫回呼 */
  function call(fn, arg) {
    if (typeof fn !== "function") return;
    try {
      fn(arg);
    } catch (e) {
      if (typeof console !== "undefined") console.error("[EMT.services.mic] 回呼執行失敗", e);
    }
  }

  /** 吞掉可能回傳 Promise 的呼叫結果中的例外 */
  function swallow(result) {
    try {
      if (result && typeof result.then === "function") result.then(null, function () {});
    } catch (e) {
      /* 忽略 */
    }
  }

  /** 安全中斷節點連線 */
  function disconnect(node) {
    if (!node) return;
    try {
      if (typeof node.disconnect === "function") node.disconnect();
    } catch (e) {
      /* 忽略 */
    }
  }

  /** 安全關閉 AudioContext（Promise 例外吞掉） */
  function closeContext(ctx) {
    if (!ctx) return;
    try {
      if (typeof ctx.close === "function") swallow(ctx.close());
    } catch (e) {
      /* 忽略 */
    }
  }

  /** 安全停止音軌 */
  function stopTrack(t) {
    try {
      if (t && typeof t.stop === "function") t.stop();
    } catch (e) {
      /* 忽略 */
    }
  }

  /** 取出串流中的音軌陣列 */
  function tracksOf(stream) {
    try {
      if (stream && typeof stream.getAudioTracks === "function") return Array.prototype.slice.call(stream.getAudioTracks());
      if (stream && typeof stream.getTracks === "function") return Array.prototype.slice.call(stream.getTracks());
    } catch (e) {
      /* 忽略 */
    }
    return [];
  }

  /**
   * 以指定的全域物件建立麥克風實例。
   * @param {object} g 全域物件（瀏覽器為 window）
   */
  function create(g) {
    // 持有狀態（音量值與節點只存在這些區域變數）
    var stream = null; // 目前持有的串流
    var held = []; // 目前持有的音軌
    var unbinders = []; // 解除各音軌 ended 監聽的函式
    var ctx = null; // AudioContext（取得中即已建立）
    var source = null; // MediaStreamAudioSourceNode
    var analyser = null; // AnalyserNode（不接到 destination）
    var buffer = null; // 時域樣本緩衝
    var byteBuffer = null; // 只支援 getByteTimeDomainData 時的緩衝
    var timer = null; // 音量讀取計時器
    var epoch = 0; // 每次 release() 遞增，用來辨識取得中被釋放
    var pending = null; // 取得中的 Promise
    var endedCb = null; // onTrackEnded 回呼
    var pagehideBound = false; // pagehide 是否已登錄

    function mediaDevices() {
      try {
        var nav = g && g.navigator;
        var md = nav && nav.mediaDevices;
        return md && typeof md.getUserMedia === "function" ? md : null;
      } catch (e) {
        return null;
      }
    }

    function isSupported() {
      return mediaDevices() !== null;
    }

    function isActive() {
      if (!stream) return false;
      for (var i = 0; i < held.length; i++) {
        try {
          if (held[i] && held[i].readyState === "live") return true;
        } catch (e) {
          /* 忽略 */
        }
      }
      return false;
    }

    function stopMeter() {
      if (timer === null) return;
      var t = timer;
      timer = null;
      try {
        var clear = g && typeof g.clearInterval === "function" ? g.clearInterval : clearInterval;
        clear.call(g, t);
      } catch (e) {
        /* 忽略 */
      }
    }

    /** 拆除音量分析節點與 AudioContext */
    function teardownAudio() {
      disconnect(source);
      disconnect(analyser);
      closeContext(ctx);
      source = null;
      analyser = null;
      buffer = null;
      byteBuffer = null;
      ctx = null;
    }

    /** 同步釋放全部持有資源（不改 epoch） */
    function teardown() {
      stopMeter();
      var ts = held;
      var us = unbinders;
      stream = null;
      held = [];
      unbinders = [];
      for (var i = 0; i < us.length; i++) {
        try {
          us[i]();
        } catch (e) {
          /* 忽略 */
        }
      }
      for (var j = 0; j < ts.length; j++) stopTrack(ts[j]);
      teardownAudio();
    }

    function release() {
      epoch++;
      pending = null;
      teardown();
    }

    function onTrackEnded(fn) {
      endedCb = typeof fn === "function" ? fn : null;
    }

    function tracks() {
      return held.slice();
    }

    /** 音軌 ended（拔除、被停用）→ 清除持有狀態並通知（AC-33-06） */
    function bindEnded(s, t) {
      var handler = function () {
        if (stream !== s) return;
        teardown();
        call(endedCb);
      };
      try {
        if (typeof t.addEventListener === "function") {
          t.addEventListener("ended", handler);
          unbinders.push(function () {
            if (typeof t.removeEventListener === "function") t.removeEventListener("ended", handler);
          });
        } else {
          t.onended = handler;
          unbinders.push(function () {
            if (t.onended === handler) t.onended = null;
          });
        }
      } catch (e) {
        /* 忽略 */
      }
    }

    /** 第一次取得成功時登錄一次 pagehide → release（重新整理、關閉分頁） */
    function bindPagehide() {
      if (pagehideBound) return;
      try {
        if (g && typeof g.addEventListener === "function") {
          g.addEventListener("pagehide", function () {
            release();
          });
          pagehideBound = true;
        }
      } catch (e) {
        /* 忽略 */
      }
    }

    /** 同步建立 AudioContext（仍在使用者點擊處理中，符合自動播放政策）；失敗回 null */
    function newContext() {
      try {
        var C = g && (g.AudioContext || g.webkitAudioContext);
        if (typeof C !== "function") return null;
        return new C();
      } catch (e) {
        return null;
      }
    }

    /** 建立 source → analyser（不接到 destination）；失敗時拆除音訊節點，回傳是否可讀音量 */
    function setupAnalyser(s) {
      if (!ctx) return false;
      try {
        source = ctx.createMediaStreamSource(s);
        analyser = ctx.createAnalyser();
        analyser.fftSize = meter().fftSizeFor(ctx.sampleRate);
        source.connect(analyser);
        var size = analyser.fftSize;
        if (typeof size !== "number" || !(size > 0)) size = 2048;
        if (typeof analyser.getFloatTimeDomainData === "function") {
          buffer = new Float32Array(size);
        } else if (typeof analyser.getByteTimeDomainData === "function") {
          byteBuffer = new Uint8Array(size);
        } else {
          throw new Error("AnalyserNode 不支援時域讀取");
        }
        return true;
      } catch (e) {
        teardownAudio();
        return false;
      }
    }

    function acquire() {
      try {
        // 同頁重用：不再呼叫 getUserMedia（AC-33-01）
        if (isActive()) {
          if (ctx) {
            try {
              if (typeof ctx.resume === "function") swallow(ctx.resume());
            } catch (e) {
              /* 忽略 */
            }
          }
          return Promise.resolve({ ok: true, reused: true, metering: analyser !== null });
        }
        // 取得中再呼叫 → 共用同一個結果
        if (pending) return pending;
        // 持有的音軌已全部結束 → 清除後重新取得
        if (stream) teardown();

        var md = mediaDevices();
        if (!md) return Promise.resolve({ ok: false, reason: "unavailable" });

        var myEpoch = epoch;
        ctx = newContext();
        var myCtx = ctx;

        var p = new Promise(function (resolve) {
          var gum;
          try {
            gum = Promise.resolve(md.getUserMedia({ audio: true }));
          } catch (e) {
            gum = Promise.reject(e);
          }
          gum.then(
            function (s) {
              // 取得中已 release：停止晚到的音軌（AC-33-02）
              if (myEpoch !== epoch) {
                var late = tracksOf(s);
                for (var i = 0; i < late.length; i++) stopTrack(late[i]);
                closeContext(myCtx);
                resolve({ ok: false, reason: "released" });
                return;
              }
              pending = null;
              var ts = tracksOf(s);
              if (!s || ts.length === 0) {
                teardownAudio();
                resolve({ ok: false, reason: "unavailable" });
                return;
              }
              stream = s;
              held = ts;
              unbinders = [];
              for (var j = 0; j < ts.length; j++) bindEnded(s, ts[j]);
              bindPagehide();
              var metering = setupAnalyser(s);
              resolve({ ok: true, reused: false, metering: metering });
            },
            function (err) {
              if (myEpoch !== epoch) {
                closeContext(myCtx);
                resolve({ ok: false, reason: "released" });
                return;
              }
              pending = null;
              teardownAudio();
              resolve({ ok: false, reason: reasonOfError(err) });
            }
          ).then(null, function () {
            // 防護：任何意外例外都收斂為 unavailable
            if (myEpoch === epoch) pending = null;
            resolve({ ok: false, reason: "unavailable" });
          });
        });
        pending = p;
        return p;
      } catch (e) {
        pending = null;
        return Promise.resolve({ ok: false, reason: "unavailable" });
      }
    }

    /** 讀取一次時域樣本並換算亮格數 */
    function readLevel() {
      var m = meter();
      if (buffer) {
        analyser.getFloatTimeDomainData(buffer);
        return m.levelOfSamples(buffer);
      }
      analyser.getByteTimeDomainData(byteBuffer);
      return m.levelOfSamples(m.bytesToFloat(byteBuffer));
    }

    function startMeter(onLevel) {
      stopMeter();
      if (!analyser) {
        call(onLevel, 0);
        return false;
      }
      var last = null;
      var tick = function () {
        if (!analyser) {
          stopMeter();
          return;
        }
        var k;
        try {
          k = readLevel();
        } catch (e) {
          return;
        }
        if (k === last) return;
        last = k;
        call(onLevel, k);
      };
      try {
        var interval = meter().UPDATE_INTERVAL_MS;
        var set = g && typeof g.setInterval === "function" ? g.setInterval : setInterval;
        timer = set.call(g, tick, interval);
        return true;
      } catch (e) {
        timer = null;
        call(onLevel, 0);
        return false;
      }
    }

    return {
      isSupported: isSupported,
      isActive: isActive,
      acquire: acquire,
      startMeter: startMeter,
      stopMeter: stopMeter,
      onTrackEnded: onTrackEnded,
      release: release,
      tracks: tracks
    };
  }

  // 預設實例：建立時只設定區域變數，不呼叫任何瀏覽器 API（LD-2）
  var instance = create(defaultGlobal);

  return {
    isSupported: instance.isSupported,
    isActive: instance.isActive,
    acquire: instance.acquire,
    startMeter: instance.startMeter,
    stopMeter: instance.stopMeter,
    onTrackEnded: instance.onTrackEnded,
    release: instance.release,
    tracks: instance.tracks,
    reasonOfError: reasonOfError,
    create: create
  };
});
