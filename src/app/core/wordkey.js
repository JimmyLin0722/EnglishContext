/*
 * EMT.core.wordkey — 單字比對鍵（FE-03；契約 README / data-schema.ts 共通約定 C-2）
 * wordKey(word) = word.normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase()
 * 用於內建字庫去重、自訂單字重複判斷、範本注入去重、已掌握單字集合、匯入略過判斷。
 * 本模組不碰 DOM；Node 以 require 載入，瀏覽器掛到 EMT.core.wordkey。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.EMT = root.EMT || {};
    root.EMT.core = root.EMT.core || {};
    root.EMT.core.wordkey = api;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /**
   * 依 C-2 計算單字比對鍵。
   * 非字串（null、undefined、數字等）一律回傳空字串，呼叫端可據此判定為無效單字。
   * @param {string} word
   * @returns {string}
   */
  function wordKey(word) {
    if (typeof word !== "string") {
      return "";
    }
    return word.normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();
  }

  return Object.freeze({ wordKey: wordKey });
});
