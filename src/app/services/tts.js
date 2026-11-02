/*
 * services/tts.js — 語音朗讀（FE-12）
 * 依據：architecture.md §7.6「TTS」；PRD R-10
 * 涵蓋：AC-07-01～AC-07-05、AC-19-02（優先本機語音，離線仍可朗讀）
 *
 * 提供 EMT.services.tts：
 * - isSupported() → boolean：speechSynthesis 與 SpeechSynthesisUtterance 皆存在。
 * - speak(text, rate) → Promise<{ ok: true, voiceName } | { ok: false, reason }>，絕不 reject：
 *     1. 先 cancel() 目前朗讀（AC-07-03：不累積排隊）；
 *     2. 挑選 en-US 語音（不分大小寫、"_" 視同 "-"），優先 localService === true（R-10）；
 *     3. getVoices() 為空時等 voiceschanged 最多 1 秒；
 *     4. 仍無 en-US 語音 → reason "no-voice"（呼叫端提示「此裝置未安裝美式英語語音」，AC-07-05）。
 *   reason：「unsupported」不支援、「empty」無文字、「no-voice」無 en-US 語音、「aborted」等待語音期間又有新的朗讀或停止、「error」其他例外。
 * - stop()：停止朗讀，並作廢等待中的朗讀要求。
 * - pickVoice(voices)、isEnUs(lang)、normalizeRate(rate)：純函式（供測試）。
 * - create(globalObject)：以指定的全域物件建立一組獨立實例（Node 測試注入假的 speechSynthesis）。
 * 載入時不操作 DOM、不呼叫任何語音 API。
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.EMT = root.EMT || {};
    root.EMT.services = root.EMT.services || {};
    root.EMT.services.tts = api;
  }
})(typeof self !== "undefined" ? self : this, function (defaultGlobal) {
  "use strict";

  // 朗讀語言（AC-07-01、AC-07-02）
  var LANG = "en-US";
  // getVoices() 為空時等待 voiceschanged 的上限（毫秒）
  var VOICE_WAIT_MS = 1000;
  // 可用速度；其他值一律視為 1.0
  var RATES = [1, 0.75];

  // ════════════════════════════════════════════════════════════════
  // 純函式
  // ════════════════════════════════════════════════════════════════

  /**
   * 語言代碼是否為 en-US（不分大小寫、"_" 視同 "-"）。
   * @param {*} lang
   * @returns {boolean}
   */
  function isEnUs(lang) {
    if (typeof lang !== "string") return false;
    return lang.trim().replace(/_/g, "-").toLowerCase() === "en-us";
  }

  /**
   * 從語音清單挑選 en-US 語音：優先 localService === true（本機語音，離線可用，R-10），否則取第一個 en-US。
   * @param {Array<{lang?: string, localService?: boolean}>|ArrayLike} voices
   * @returns {object|null} 找不到回 null
   */
  function pickVoice(voices) {
    if (!voices || typeof voices.length !== "number") return null;
    var firstRemote = null;
    for (var i = 0; i < voices.length; i++) {
      var v = voices[i];
      if (!v || !isEnUs(v.lang)) continue;
      if (v.localService === true) return v;
      if (!firstRemote) firstRemote = v;
    }
    return firstRemote;
  }

  /**
   * 速度只接受 1.0、0.75，其他值回 1。
   * @param {*} rate
   * @returns {number}
   */
  function normalizeRate(rate) {
    var r = Number(rate);
    return RATES.indexOf(r) === -1 ? 1 : r;
  }

  // ════════════════════════════════════════════════════════════════
  // 實例
  // ════════════════════════════════════════════════════════════════

  /**
   * 以指定的全域物件建立 TTS 實例。
   * @param {object} g 全域物件（瀏覽器為 window）
   */
  function create(g) {
    // 每次 speak／stop 遞增；等待語音清單期間若有新要求，舊要求作廢
    var token = 0;
    // 保留目前的 utterance 參照，避免部分瀏覽器在朗讀中將其回收而中斷
    var current = null;

    /** 取得 speechSynthesis（不存在或存取拋例外回 null） */
    function synth() {
      try {
        return (g && g.speechSynthesis) || null;
      } catch (e) {
        return null;
      }
    }

    /** @returns {boolean} */
    function isSupported() {
      try {
        return !!(g && g.speechSynthesis && typeof g.SpeechSynthesisUtterance === "function");
      } catch (e) {
        return false;
      }
    }

    /** 目前語音清單（例外時回空陣列） */
    function getVoices() {
      try {
        var s = synth();
        var list = s && typeof s.getVoices === "function" ? s.getVoices() : null;
        return list && typeof list.length === "number" ? Array.prototype.slice.call(list) : [];
      } catch (e) {
        return [];
      }
    }

    /** 停止目前朗讀（不作廢 token，供 speak 內部使用） */
    function cancelNow() {
      try {
        var s = synth();
        if (s && typeof s.cancel === "function") s.cancel();
      } catch (e) {
        /* 忽略：停止失敗不影響後續 */
      }
    }

    /**
     * 等待語音清單載入（voiceschanged 或逾時，先到者為準）。
     * @param {number} ms
     * @returns {Promise<Array>}
     */
    function waitVoices(ms) {
      return new Promise(function (resolve) {
        var s = synth();
        var done = false;
        var timer = null;
        var prevHandler = null;
        var usedProp = false;

        function finish() {
          if (done) return;
          done = true;
          if (timer !== null) clearTimeout(timer);
          try {
            if (s && typeof s.removeEventListener === "function" && !usedProp) {
              s.removeEventListener("voiceschanged", onChange);
            } else if (s && usedProp) {
              s.onvoiceschanged = prevHandler;
            }
          } catch (e) {
            /* 忽略 */
          }
          resolve(getVoices());
        }

        function onChange() {
          if (getVoices().length > 0) finish();
        }

        try {
          if (s && typeof s.addEventListener === "function") {
            s.addEventListener("voiceschanged", onChange);
          } else if (s) {
            // 舊式介面：暫時接手 onvoiceschanged，結束時還原
            usedProp = true;
            prevHandler = s.onvoiceschanged || null;
            s.onvoiceschanged = function (ev) {
              if (typeof prevHandler === "function") {
                try { prevHandler.call(s, ev); } catch (e) { /* 忽略 */ }
              }
              onChange();
            };
          }
        } catch (e) {
          /* 無法監聽時只靠逾時 */
        }
        timer = setTimeout(finish, ms);
      });
    }

    /**
     * 實際朗讀（呼叫前已 cancel）。
     * @returns {{ok: boolean, reason?: string, voiceName?: string}}
     */
    function doSpeak(text, rate, voices) {
      var voice = pickVoice(voices);
      if (!voice) return { ok: false, reason: "no-voice" };
      var s = synth();
      if (!s || typeof s.speak !== "function") return { ok: false, reason: "unsupported" };
      var u = new g.SpeechSynthesisUtterance(text);
      u.lang = LANG;
      u.rate = rate;
      u.voice = voice;
      u.onend = function () {
        if (current === u) current = null;
      };
      // 被 cancel 打斷（interrupted／canceled）屬正常行為；其他錯誤只記錄，不拋出
      u.onerror = function (ev) {
        if (current === u) current = null;
        var code = ev && ev.error;
        if (code !== "interrupted" && code !== "canceled" && typeof console !== "undefined") {
          console.warn("[EMT.services.tts] 朗讀失敗：" + String(code));
        }
      };
      current = u;
      s.speak(u);
      return { ok: true, voiceName: String(voice.name || "") };
    }

    /**
     * 朗讀文字。
     * @param {string} text
     * @param {number} rate 1 或 0.75
     * @returns {Promise<object>}
     */
    function speak(text, rate) {
      return new Promise(function (resolve) {
        try {
          if (!isSupported()) {
            resolve({ ok: false, reason: "unsupported" });
            return;
          }
          var my = ++token;
          // 先停止目前朗讀（AC-07-03）
          cancelNow();
          current = null;
          var t = typeof text === "string" ? text.trim() : "";
          if (!t) {
            resolve({ ok: false, reason: "empty" });
            return;
          }
          var r = normalizeRate(rate);
          var voices = getVoices();
          if (voices.length > 0) {
            // 語音已就緒：同步 cancel → speak
            resolve(doSpeak(t, r, voices));
            return;
          }
          waitVoices(VOICE_WAIT_MS).then(function (vs) {
            if (my !== token) {
              resolve({ ok: false, reason: "aborted" });
              return;
            }
            try {
              cancelNow();
              resolve(doSpeak(t, r, vs));
            } catch (e) {
              resolve({ ok: false, reason: "error" });
            }
          });
        } catch (e) {
          resolve({ ok: false, reason: "error" });
        }
      });
    }

    /** 停止朗讀並作廢等待中的要求 */
    function stop() {
      token++;
      current = null;
      cancelNow();
    }

    return {
      isSupported: isSupported,
      speak: speak,
      stop: stop
    };
  }

  var instance = create(defaultGlobal);

  return {
    LANG: LANG,
    VOICE_WAIT_MS: VOICE_WAIT_MS,
    isSupported: instance.isSupported,
    speak: instance.speak,
    stop: instance.stop,
    pickVoice: pickVoice,
    isEnUs: isEnUs,
    normalizeRate: normalizeRate,
    create: create
  };
});
