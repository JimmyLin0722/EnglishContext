/*
 * EMT.core.goal — 分數、色級與試算（FE-03；architecture.md §7.1）
 * 依據：PRD 色級定義表、Q-12、Q-15、Q-25、Q-28、Q-32；契約常數 COLOR_LEVELS、SCORE_*、N_O。
 * 本模組為純函式，不碰 DOM、不讀 window 全域資料、不讀 localStorage；
 * N_B、N_G 由呼叫端依實際資料計算後以參數傳入（V-VOC-12，不得寫死）。
 * Node 以 require 載入，瀏覽器掛到 EMT.core.goal（需先載入 EMT.core.constants）。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.EMT = root.EMT || {};
    root.EMT.core = root.EMT.core || {};
    root.EMT.core.goal = api;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // 取得契約常數：Node 下 require，瀏覽器下讀 EMT.core.constants
  var C;
  if (typeof require === "function" && typeof module === "object") {
    C = require("./constants.js");
  } else {
    var g = typeof self !== "undefined" ? self : this;
    C = g.EMT.core.constants;
  }

  /** 分數輸入無效時的提示文字（AC-02-02 原文） */
  var SCORE_INVALID_MESSAGE = "請輸入 10～990 的分數";

  /** 開放色級：藍、金以外皆開放（以契約 status 判斷） */
  function isOpenColor(colorId) {
    var level = levelOf(colorId);
    return !!level && level.status === "open";
  }

  /**
   * 依色級代碼取得契約中的色級定義；找不到回傳 null。
   * @param {string} colorId
   */
  function levelOf(colorId) {
    for (var i = 0; i < C.COLOR_LEVELS.length; i++) {
      if (C.COLOR_LEVELS[i].id === colorId) {
        return C.COLOR_LEVELS[i];
      }
    }
    return null;
  }

  /**
   * 分數修正（AC-02-09）：四捨五入到最近的 5 的倍數，並夾在 SCORE_MIN～SCORE_MAX。
   * 723 → 725、722 → 720。
   * @param {number} x
   * @returns {number}
   */
  function normalizeScore(x) {
    var n = Math.round(x / C.SCORE_STEP) * C.SCORE_STEP;
    if (n < C.SCORE_MIN) { n = C.SCORE_MIN; }
    if (n > C.SCORE_MAX) { n = C.SCORE_MAX; }
    return n;
  }

  /** 字串分數只接受十進位寫法（architecture.md v0.2 §7.1） */
  var DECIMAL_SCORE_PATTERN = /^[0-9]+(\.[0-9]+)?$/;

  /**
   * 解析使用者輸入的分數（AC-02-02、AC-02-09；architecture.md v0.2 §7.1）。
   * - raw 為 number（滑桿）：有限數才接受
   * - 其餘轉字串後 trim，只接受十進位寫法 /^[0-9]+(\.[0-9]+)?$/；
   *   正負號、指數（1e2）、十六／八／二進位（0x64）、Infinity、全形數字、千分位逗號一律無效
   * - 原值 < 10 或 > 990 → 無效
   * - 其餘以 normalizeScore 修正（小數可接受，例：722.5 → 725）
   * @param {string|number} raw
   * @returns {{ok: true, score: number} | {ok: false, message: string}}
   */
  function parseScoreInput(raw) {
    var x;
    if (typeof raw === "number") {
      x = raw;
    } else {
      var text = raw === null || raw === undefined ? "" : String(raw).trim();
      if (!DECIMAL_SCORE_PATTERN.test(text)) {
        return { ok: false, message: SCORE_INVALID_MESSAGE };
      }
      x = Number(text);
    }
    if (!isFinite(x)) {
      return { ok: false, message: SCORE_INVALID_MESSAGE };
    }
    if (x < C.SCORE_MIN || x > C.SCORE_MAX) {
      return { ok: false, message: SCORE_INVALID_MESSAGE };
    }
    return { ok: true, score: normalizeScore(x) };
  }

  /**
   * 分數對應色級 Color(S)（AC-02-04）：scoreMin ≤ S ≤ scoreMax 的色級代碼。
   * S 應為已修正（5 的倍數）的分數；不落在任何範圍時回傳 null。
   * @param {number} S
   * @returns {string|null}
   */
  function colorOf(S) {
    for (var i = 0; i < C.COLOR_LEVELS.length; i++) {
      var lv = C.COLOR_LEVELS[i];
      if (S >= lv.scoreMin && S <= lv.scoreMax) {
        return lv.id;
      }
    }
    return null;
  }

  /**
   * 生效色級（AC-01-07、V-ST-02）：藍、金 → 綠（內建上限），其他不變。
   * @param {string} colorId
   * @returns {string}
   */
  function effectiveColorOf(colorId) {
    if (colorId === "blue" || colorId === "gold") {
      return "green";
    }
    return colorId;
  }

  /**
   * 每日新字量 W_d（AC-02-03）：橘 10、棕 10、綠 15、藍 20、金 20。
   * 分數不落在任何色級時回傳 null。
   * @param {number} S
   * @returns {number|null}
   */
  function dailyNewWords(S) {
    var level = levelOf(colorOf(S));
    return level ? level.dailyNewWords : null;
  }

  /**
   * 建議總字量 TargetVocab(S)（AC-02-05、AC-02-10）：橘 N_O、棕 nB、綠 nG；藍、金 null（畫面顯示「待定」）。
   * （v0.3 R3-1）nB、nG 不是大於 0 的有限數（含 0、負數、NaN、null、undefined）時
   * 視為資料缺漏，回傳 null；橘色 N_O 為契約常數，不受影響。
   * @param {number} S
   * @param {number} nB
   * @param {number} nG
   * @returns {number|null}
   */
  function targetVocab(S, nB, nG) {
    var level = levelOf(colorOf(S));
    if (!level) { return null; }
    var value = null;
    if (level.vocabTarget === "N_O") { value = C.N_O; }
    else if (level.vocabTarget === "N_B") { value = positiveCountOrNull(nB); }
    else if (level.vocabTarget === "N_G") { value = positiveCountOrNull(nG); }
    return isFiniteNumber(value) ? value : null;
  }

  function isFiniteNumber(v) {
    return typeof v === "number" && isFinite(v);
  }

  /** 字量必須為大於 0 的有限數，否則視為資料缺漏回傳 null（architecture.md v0.3 §7.1） */
  function positiveCountOrNull(v) {
    return isFiniteNumber(v) && v > 0 ? v : null;
  }

  /**
   * 試算（AC-02-05、AC-02-06、AC-02-10）。
   * - T = targetVocab(S) ?? nG（藍、金以綠色字量試算；nG 同樣須 > 0，否則 T 為 null）
   * - W = dailyNewWords(S)
   * - weeks = max(0, ⌈(T − c) ÷ (W × 7)⌉)；T 無法取得（資料缺漏）時 weeks 為 null
   * - achieved = 開放色級且 T 不為 null 且 c ≥ T
   * - basedOnGreen = 藍、金（畫面旁註「以目前內建字庫上限（綠）試算」）
   * @param {number} S 已修正的分數
   * @param {number} c 已掌握單字數 CurrentVocab
   * @param {number} nB 棕色建議字量（實際資料計算）
   * @param {number} nG 綠色建議字量（實際資料計算）
   * @returns {{color: string|null, targetVocab: number|null, dailyNewWords: number|null,
   *            weeks: number|null, achieved: boolean, basedOnGreen: boolean}}
   */
  function estimate(S, c, nB, nG) {
    var color = colorOf(S);
    var tv = targetVocab(S, nB, nG);
    var W = dailyNewWords(S);
    var open = isOpenColor(color);
    var T = tv !== null ? tv : (open ? null : positiveCountOrNull(nG));
    var mastered = isFiniteNumber(c) && c > 0 ? c : 0;
    var weeks = null;
    if (T !== null && isFiniteNumber(W) && W > 0) {
      weeks = Math.max(0, Math.ceil((T - mastered) / (W * 7)));
    }
    return {
      color: color,
      targetVocab: tv,
      dailyNewWords: W,
      weeks: weeks,
      achieved: open && T !== null && mastered >= T,
      basedOnGreen: color === "blue" || color === "gold"
    };
  }

  /**
   * 點擊色級按鈕後的分數（AC-01-05、AC-01-07；Q-15、Q-32）：
   * 目前分數已在該色範圍內 → 不變；否則設為該色 scoreMin。未知色級回傳原分數。
   * @param {number} S
   * @param {string} colorId
   * @returns {number}
   */
  function scoreAfterColorClick(S, colorId) {
    var level = levelOf(colorId);
    if (!level) { return S; }
    if (S >= level.scoreMin && S <= level.scoreMax) {
      return S;
    }
    return level.scoreMin;
  }

  return Object.freeze({
    SCORE_INVALID_MESSAGE: SCORE_INVALID_MESSAGE,
    levelOf: levelOf,
    isOpenColor: isOpenColor,
    parseScoreInput: parseScoreInput,
    normalizeScore: normalizeScore,
    colorOf: colorOf,
    effectiveColorOf: effectiveColorOf,
    dailyNewWords: dailyNewWords,
    targetVocab: targetVocab,
    estimate: estimate,
    scoreAfterColorClick: scoreAfterColorClick
  });
});
