/*
 * services/clipboard.js — 剪貼簿（FE-16）
 * 依據：architecture.md §7.6「剪貼簿」；PRD E-15
 * 涵蓋：AC-16-03、AC-16-04
 *
 * 提供 EMT.services.clipboard：
 * - copy(text) → Promise<boolean>：只用 navigator.clipboard.writeText；
 *   API 不存在、呼叫時拋例外或 Promise 被拒 → resolve(false)，絕不 reject（不退回舊式 document 複製指令）。
 * - selectNodeText(node) → boolean：以 Selection／Range 反白節點全部文字（複製失敗時讓使用者手動複製）。
 * 載入時不操作 DOM；Node 下匯出同一個 API 供測試（copy 第 2 個參數可注入假的 navigator）。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.EMT = root.EMT || {};
    root.EMT.services = root.EMT.services || {};
    root.EMT.services.clipboard = api;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /** 取得全域 navigator（不存在回 undefined） */
  function globalNavigator() {
    return typeof navigator !== "undefined" ? navigator : undefined;
  }

  /**
   * 將文字寫入剪貼簿。
   * @param {string} text 要複製的文字（原文寫入，不做任何修改）
   * @param {object} [nav] 測試用：替代的 navigator 物件；省略時用全域 navigator
   * @returns {Promise<boolean>} 成功 true；API 不可用或被拒 false
   */
  function copy(text, nav) {
    var n = arguments.length >= 2 ? nav : globalNavigator();
    try {
      var cb = n ? n.clipboard : undefined;
      if (!cb || typeof cb.writeText !== "function") return Promise.resolve(false);
      var value = text === null || text === undefined ? "" : String(text);
      // writeText 若回非 Promise 值也以 Promise.resolve 包裝；被拒一律轉為 false
      return Promise.resolve(cb.writeText(value)).then(
        function () { return true; },
        function () { return false; }
      );
    } catch (e) {
      // 例如 getter 拋例外、權限政策阻擋
      return Promise.resolve(false);
    }
  }

  /**
   * 以 Selection／Range 反白節點內全部文字。
   * @param {Node} node 要反白的節點
   * @returns {boolean} 是否成功反白
   */
  function selectNodeText(node) {
    try {
      if (!node || typeof document === "undefined" || typeof window === "undefined") return false;
      if (typeof window.getSelection !== "function" || typeof document.createRange !== "function") return false;
      var sel = window.getSelection();
      if (!sel) return false;
      var range = document.createRange();
      range.selectNodeContents(node);
      sel.removeAllRanges();
      sel.addRange(range);
      return true;
    } catch (e) {
      return false;
    }
  }

  return {
    copy: copy,
    selectNodeText: selectNodeText
  };
});
