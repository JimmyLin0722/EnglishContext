/*
 * services/stt.js — 語音辨識（FE-12）
 * 依據：architecture.md §7.6「STT」；PRD Q-04
 *       v0.15（FE-90）：architecture.md §4.13、§7.26.2；契約 data-schema §18 SttEngineEventKind、SttEndInfo，README §14.1 PR-9、§14.3 RT-1、DS-57
 * 涵蓋：AC-08-01、AC-08-02、AC-08-09、AC-08-10、AC-08-14、AC-21-02、AC-21-03、
 *       AC-58-03、AC-58-07、AC-58-08、AC-58-09、AC-59-01～AC-59-06、AC-60-01
 *
 * 只使用瀏覽器原生 SpeechRecognition／webkitSpeechRecognition：
 * 不直接存取麥克風串流、不使用任何錄音 API，不取得、不保存任何音訊，也不使用第三方語音 SDK 或 API 金鑰。
 *
 * 提供 EMT.services.stt：
 * - isSupported() → boolean
 * - isOnline() → boolean：navigator.onLine 明確為 false 時回 false
 * - start({ lang, onAudioStart(info), onSoundStart(info), onSpeechStart(info), onResult(text, info), onNomatch(info),
 *          onError(code, info), onEnd(info) })
 *     → { ok: true, audioStartSupported } | { ok: false, reason }（回呼全部選填）
 *     reason：「unsupported」不支援、「offline」離線（AC-08-14）、「error」建立或啟動失敗。
 *     audioStartSupported：本次是否可依賴 audiostart；new 之後、rec.start() 之前以 "onaudiostart" in rec 判定（含原型鏈），
 *       判定拋例外視為 false（AC-58-09，§7.26.2）。
 *     設定 lang = "en-US"、interimResults = false、maxAlternatives = 1、continuous = false。
 *     onResult(text, info)：辨識原文（可能為空字串）。
 *     onError(code, info)：SpeechRecognitionErrorEvent.error（not-allowed、network、no-speech…）；手動停止造成的 aborted 不通知。
 *     onEnd(info)：本次聆聽結束。
 *     info = SttEndInfo 8 欄的新複本，順序固定：manual, hadResult, hadError, audioStarted, soundStarted, speechDetected,
 *       nomatch, errorCode（第一個非手動 aborted 的錯誤代碼，否則 null）。每次 start() 都重設為初始值。
 *     服務只依引擎順序原樣轉送事件與旗標，不重排、不決定訊息（DS-57）。
 *     同時只有一個聆聽工作；再次 start 會先中止前一個（其回呼不再觸發）。
 * - stop() → boolean：停止聆聽並標記為手動停止（不提示）；之後仍可能收到已辨識的結果。
 * - abort()：立即中止且不再觸發任何回呼（換卡、離開頁面）。
 * - isListening() → boolean
 * - transcriptOf(event)：純函式，取出辨識文字（供測試）。
 * - create(globalObject)：以指定的全域物件建立獨立實例（Node 測試注入假的 SpeechRecognition）。
 * 所有回呼的例外都被攔下，不拋出未處理例外。載入時不操作 DOM。
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.EMT = root.EMT || {};
    root.EMT.services = root.EMT.services || {};
    root.EMT.services.stt = api;
  }
})(typeof self !== "undefined" ? self : this, function (defaultGlobal) {
  "use strict";

  // 辨識語言（AC-08-01）
  var LANG = "en-US";

  /**
   * 從 SpeechRecognitionEvent 取出辨識文字：自 resultIndex 起串接各結果的第 1 個候選。
   * @param {object} ev
   * @returns {string} 取不到時回 ""
   */
  function transcriptOf(ev) {
    try {
      var results = ev && ev.results;
      if (!results || typeof results.length !== "number") return "";
      var start = typeof ev.resultIndex === "number" && ev.resultIndex >= 0 ? ev.resultIndex : 0;
      var parts = [];
      for (var i = start; i < results.length; i++) {
        var r = results[i];
        var alt = r && r[0];
        var t = alt && typeof alt.transcript === "string" ? alt.transcript : "";
        if (t.trim()) parts.push(t.trim());
      }
      return parts.join(" ");
    } catch (e) {
      return "";
    }
  }

  /** 安全呼叫回呼（最多 2 個參數） */
  function call(fn, a, b) {
    if (typeof fn !== "function") return;
    try {
      if (arguments.length > 2) fn(a, b);
      else fn(a);
    } catch (e) {
      if (typeof console !== "undefined") console.error("[EMT.services.stt] 回呼執行失敗", e);
    }
  }

  /**
   * 以指定的全域物件建立 STT 實例。
   * @param {object} g 全域物件（瀏覽器為 window）
   */
  function create(g) {
    // 目前聆聽工作 { rec, manual, hadResult, hadError, audioStarted, soundStarted, speechDetected, nomatch, errorCode }
    var session = null;

    /** 取得建構函式（不存在回 null） */
    function ctor() {
      try {
        var C = g && (g.SpeechRecognition || g.webkitSpeechRecognition);
        return typeof C === "function" ? C : null;
      } catch (e) {
        return null;
      }
    }

    function isSupported() {
      return ctor() !== null;
    }

    function isOnline() {
      try {
        var nav = g && g.navigator;
        return !(nav && nav.onLine === false);
      } catch (e) {
        return true;
      }
    }

    /** 解除 7 個事件處理器，讓遲到的事件不再影響畫面（DS-57） */
    function detach(rec) {
      try {
        rec.onaudiostart = null;
        rec.onsoundstart = null;
        rec.onspeechstart = null;
        rec.onresult = null;
        rec.onnomatch = null;
        rec.onerror = null;
        rec.onend = null;
      } catch (e) {
        /* 忽略 */
      }
    }

    /** 立即中止目前工作（不觸發回呼） */
    function abort() {
      var s = session;
      if (!s) return;
      session = null;
      s.manual = true;
      detach(s.rec);
      try {
        if (typeof s.rec.abort === "function") s.rec.abort();
        else if (typeof s.rec.stop === "function") s.rec.stop();
      } catch (e) {
        /* 忽略 */
      }
    }

    /**
     * 本次是否可依賴 audiostart（AC-58-09）：含原型鏈判定，拋例外視為 false。
     * @param {object} rec
     * @returns {boolean}
     */
    function audioStartSupportedOf(rec) {
      try {
        return "onaudiostart" in rec;
      } catch (e) {
        return false;
      }
    }

    /**
     * 開始聆聽。
     * @param {{lang?: string, onAudioStart?: Function, onSoundStart?: Function, onSpeechStart?: Function,
     *          onResult?: Function, onNomatch?: Function, onError?: Function, onEnd?: Function}} opts
     * @returns {{ok: boolean, audioStartSupported?: boolean, reason?: string}}
     */
    function start(opts) {
      try {
        var C = ctor();
        if (!C) return { ok: false, reason: "unsupported" };
        // 斷網時不啟動（AC-08-14）
        if (!isOnline()) return { ok: false, reason: "offline" };
        abort();

        var o = opts || {};
        var rec = new C();
        var s = {
          rec: rec, manual: false, hadResult: false, hadError: false,
          audioStarted: false, soundStarted: false, speechDetected: false, nomatch: false, errorCode: null
        };
        var live = function () { return session === s; };
        // 當下旗標的新複本（SttEndInfo 8 欄，順序固定）；呼叫端修改不影響服務
        var snap = function () {
          return {
            manual: s.manual,
            hadResult: s.hadResult,
            hadError: s.hadError,
            audioStarted: s.audioStarted,
            soundStarted: s.soundStarted,
            speechDetected: s.speechDetected,
            nomatch: s.nomatch,
            errorCode: s.errorCode
          };
        };
        // 須在 rec.start() 之前判定
        var audioStartSupported = audioStartSupportedOf(rec);

        rec.lang = typeof o.lang === "string" && o.lang ? o.lang : LANG;
        rec.interimResults = false;
        rec.maxAlternatives = 1;
        rec.continuous = false;

        // 一律以屬性指派綁定（§7.26.2），依引擎順序原樣轉送
        rec.onaudiostart = function () {
          if (!live()) return;
          s.audioStarted = true;
          call(o.onAudioStart, snap());
        };
        rec.onsoundstart = function () {
          if (!live()) return;
          s.soundStarted = true;
          call(o.onSoundStart, snap());
        };
        rec.onspeechstart = function () {
          if (!live()) return;
          s.speechDetected = true;
          call(o.onSpeechStart, snap());
        };
        rec.onresult = function (ev) {
          if (!live()) return;
          s.hadResult = true;
          call(o.onResult, transcriptOf(ev), snap());
        };
        rec.onnomatch = function () {
          if (!live()) return;
          s.nomatch = true;
          call(o.onNomatch, snap());
        };
        rec.onerror = function (ev) {
          if (!live()) return;
          var code = ev && typeof ev.error === "string" && ev.error ? ev.error : "unknown";
          // 手動停止造成的 aborted 不提示（architecture.md §7.6）
          if (s.manual && code === "aborted") return;
          s.hadError = true;
          // 只記第一個錯誤代碼
          if (s.errorCode === null) s.errorCode = code;
          call(o.onError, code, snap());
        };
        rec.onend = function () {
          if (!live()) return;
          session = null;
          detach(rec);
          call(o.onEnd, snap());
        };

        session = s;
        try {
          rec.start();
        } catch (e) {
          if (session === s) session = null;
          detach(rec);
          return { ok: false, reason: "error" };
        }
        return { ok: true, audioStartSupported: audioStartSupported };
      } catch (e) {
        session = null;
        return { ok: false, reason: "error" };
      }
    }

    /**
     * 使用者再次按下：停止聆聽，標記手動停止（AC-08-10，不提示）。
     * @returns {boolean} 是否有進行中的工作
     */
    function stop() {
      var s = session;
      if (!s) return false;
      s.manual = true;
      try {
        s.rec.stop();
      } catch (e) {
        // 停止失敗時直接中止
        abort();
      }
      return true;
    }

    function isListening() {
      return session !== null;
    }

    return {
      isSupported: isSupported,
      isOnline: isOnline,
      start: start,
      stop: stop,
      abort: abort,
      isListening: isListening
    };
  }

  var instance = create(defaultGlobal);

  return {
    LANG: LANG,
    isSupported: instance.isSupported,
    isOnline: instance.isOnline,
    start: instance.start,
    stop: instance.stop,
    abort: instance.abort,
    isListening: instance.isListening,
    transcriptOf: transcriptOf,
    create: create
  };
});
