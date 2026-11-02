/*
 * core/stats.js — 正確率（FE-05）
 * 依據：architecture.md §7.4
 * 涵蓋：AC-17-04
 * 純函式，不依賴 DOM 與其他 core 檔。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.EMT = root.EMT || {};
    root.EMT.core = root.EMT.core || {};
    root.EMT.core.stats = api;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // 答題數為 0（或資料異常）時顯示的符號
  var EMPTY = "—";

  /**
   * 正確率文字：answered 為 0 → 「—」；否則 round(correct ÷ answered × 100) + "%"。
   * 任何非有限數值、負數或 correct > answered 的異常輸入皆不會產生 NaN／Infinity。
   * @param {number} answered 答題數
   * @param {number} correct 答對數
   * @returns {string}
   */
  function accuracyText(answered, correct) {
    if (typeof answered !== "number" || !isFinite(answered) || answered <= 0) return EMPTY;
    var c = typeof correct === "number" && isFinite(correct) && correct > 0 ? correct : 0;
    if (c > answered) c = answered;
    return Math.round((c / answered) * 100) + "%";
  }

  return {
    accuracyText: accuracyText
  };
});
