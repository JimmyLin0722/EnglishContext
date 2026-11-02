/*
 * core/interaction.js — 介面互動核心（FE-21）
 * 依據：architecture.md v0.4 §7.10（手勢判斷）、§7.12（Q-33 設計常數）；契約 README §5.6（介面數值屬設計層）
 * 涵蓋：US-28、US-29、US-31；AC-28-01、AC-28-03～AC-28-06、AC-29-01、AC-29-02、AC-31-01
 * 純函式與常數，不依賴其他 core 模組、不碰 DOM；所有輸出物件皆凍結。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.EMT = root.EMT || {};
    root.EMT.core = root.EMT.core || {};
    root.EMT.core.interaction = api;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /**
   * Q-33 設計常數（§7.12）。動畫時間須與 05-motion.css 的 CSS 變數一致（A-4）。
   * 單位：*_PX 為 CSS 像素、*_MS 與震動值為毫秒。
   */
  var UI = Object.freeze({
    NAV_BOTTOM_MAX_PX: 640,
    PAGE_ANIM_MS: 240,
    FLIP_ANIM_MS: 360,
    SLIDE_ANIM_MS: 200,
    ANSWER_ANIM_MS: 480,
    RING_ANIM_MS: 500,
    SWIPE_MIN_PX: 50,
    TAP_SLOP_PX: 10,
    CLICK_SUPPRESS_MS: 350,
    VIBRATE_CORRECT: 40,
    VIBRATE_WRONG: Object.freeze([60, 40, 60]),
    TOUCH_MIN_PX: 44,
    ANIM_CLEANUP_MARGIN_MS: 50
  });

  /**
   * PRD 上限（供測試與 QA 引用）。
   * PAGE／FLIP／ANSWER／VIBRATE／NAV 為「不得超過」；SWIPE／TOUCH 為「不得小於」。
   */
  var LIMITS = Object.freeze({
    PAGE: 300,
    FLIP: 400,
    ANSWER: 600,
    VIBRATE: 200,
    NAV: 640,
    SWIPE: 50,
    TOUCH: 44
  });

  /** 是否為有限數值（NaN、Infinity、undefined、字串皆否）。 */
  function isNum(v) {
    return typeof v === "number" && isFinite(v);
  }

  /**
   * 判斷滑動方向（§7.10）：|dx| ≥ SWIPE_MIN_PX 且 |dx| > |dy| → "left"／"right"；否則 "none"。
   * 非數字輸入一律回 "none"，不拋例外。
   * @param {number} dx 結束 x − 開始 x
   * @param {number} dy 結束 y − 開始 y
   * @returns {"left"|"right"|"none"}
   */
  function classifySwipe(dx, dy) {
    if (!isNum(dx) || !isNum(dy)) return "none";
    var ax = Math.abs(dx);
    if (ax >= UI.SWIPE_MIN_PX && ax > Math.abs(dy)) {
      return dx < 0 ? "left" : "right";
    }
    return "none";
  }

  /**
   * 觸控位移是否小到可視為點擊：Math.hypot(dx, dy) < TAP_SLOP_PX。非數字輸入回 false。
   * @param {number} dx
   * @param {number} dy
   * @returns {boolean}
   */
  function isTap(dx, dy) {
    if (!isNum(dx) || !isNum(dy)) return false;
    return Math.hypot(dx, dy) < UI.TAP_SLOP_PX;
  }

  /**
   * 滑動後的目標卡片索引："left" → index + 1、"right" → index − 1；
   * 超出 0～n − 1、dir 為 "none" 或其他值、索引不合法 → null（首尾不動，AC-28-04）。
   * @param {number} index 目前索引
   * @param {number} n 卡片總數
   * @param {"left"|"right"|"none"} dir
   * @returns {number|null}
   */
  function swipeTarget(index, n, dir) {
    if (!isNum(index) || !isNum(n) || Math.floor(index) !== index || Math.floor(n) !== n) return null;
    if (index < 0 || index >= n) return null;
    var target;
    if (dir === "left") target = index + 1;
    else if (dir === "right") target = index - 1;
    else return null;
    return target >= 0 && target <= n - 1 ? target : null;
  }

  /**
   * 震動樣式："correct" → UI.VIBRATE_CORRECT、"wrong" → UI.VIBRATE_WRONG、其他 → null。
   * @param {string} kind
   * @returns {number|ReadonlyArray<number>|null}
   */
  function vibratePattern(kind) {
    if (kind === "correct") return UI.VIBRATE_CORRECT;
    if (kind === "wrong") return UI.VIBRATE_WRONG;
    return null;
  }

  /**
   * 震動總長（毫秒）：數字回本身；陣列回各元素總和（含停頓，非數字元素以 0 計）；其他回 0。
   * @param {*} p
   * @returns {number}
   */
  function patternTotal(p) {
    if (isNum(p)) return p;
    if (Array.isArray(p)) {
      var sum = 0;
      for (var i = 0; i < p.length; i++) {
        if (isNum(p[i])) sum += p[i];
      }
      return sum;
    }
    return 0;
  }

  return Object.freeze({
    UI: UI,
    LIMITS: LIMITS,
    classifySwipe: classifySwipe,
    isTap: isTap,
    swipeTarget: swipeTarget,
    vibratePattern: vibratePattern,
    patternTotal: patternTotal
  });
});
