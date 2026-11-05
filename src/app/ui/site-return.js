/*
 * ui/site-return.js — 對外頁面共用的返回按鈕（FE-87）
 * 依據：architecture.md v0.14 §4.12「EMT.ui.siteReturn」、§7.25.5、§7.25.6；契約 README §13.3 SP-3、SP-4
 * 涵蓋：US-57、AC-53-01、AC-55-01、AC-57-01、AC-25-07
 *
 * EMT.ui.siteReturn
 * - create(dom) → button.btn.btn--link.site-return：點擊只呼叫 EMT.router.back()，本檔不改 store、不碰瀏覽器儲存。
 *   建立時不寫文字：mount 早於本次切頁的 store 同步，文字一律由 view 的 show 呼叫 refresh 寫入。
 * - refresh(btn)：文字依 EMT.router.returnTarget() 更新為「返回{TAB_LABELS[目標]}」。
 * - returnText(target, labels)：組字純函式，可單獨測試。
 * 按鈕由各頁放在內容區（data-site-page-content）之外，不算入 AC-55-01 的內容。
 * 載入時只做登錄，不讀 document、不取用其他模組（LD-2）；取用的模組不存在時丟出含模組名稱的 Error（LD-3）。
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.EMT = root.EMT || {};
    root.EMT.ui = root.EMT.ui || {};
    root.EMT.ui.siteReturn = api;
  }
})(typeof self !== "undefined" ? self : this, function (root) {
  "use strict";

  /** 取得 core/constants（呼叫時取用，LD-2） */
  function constants() {
    var m = null;
    if (typeof require === "function" && typeof module === "object") {
      m = require("../core/constants.js");
    } else {
      m = root.EMT && root.EMT.core && root.EMT.core.constants;
    }
    if (!m) { throw new Error("EMT.core.constants 未載入（ui/site-return.js）"); }
    return m;
  }

  /** 取得 router（呼叫時取用，LD-2） */
  function router() {
    var r = root && root.EMT && root.EMT.router;
    if (!r) { throw new Error("EMT.router 未載入（ui/site-return.js）"); }
    return r;
  }

  /**
   * 返回按鈕文字（純函式）。
   * @param {string} target 返回目標 TabId
   * @param {Object<string, string>} labels TAB_LABELS
   * @returns {string}
   */
  function returnText(target, labels) {
    var label = labels && labels[target];
    return "返回" + (typeof label === "string" ? label : "");
  }

  /**
   * 建立返回按鈕。
   * @param {object} dom EMT.core.dom
   * @returns {HTMLButtonElement}
   */
  function create(dom) {
    return dom.el("button", {
      className: "btn btn--link site-return",
      attrs: { type: "button" },
      on: {
        click: function () {
          router().back();
        }
      }
    });
  }

  /**
   * 依目前的返回目標更新按鈕文字。
   * @param {HTMLElement} btn create 建立的按鈕
   */
  function refresh(btn) {
    if (!btn) return;
    btn.textContent = returnText(router().returnTarget(), constants().TAB_LABELS);
  }

  return {
    returnText: returnText,
    create: create,
    refresh: refresh
  };
});
