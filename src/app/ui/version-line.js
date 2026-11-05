/*
 * ui/version-line.js — 頁尾版本行（FE-64）
 * 依據：architecture.md v0.9 §4.9「EMT.ui.versionLine」、§7.20.1；契約 data-schema.ts §14、README §12.1 VR-5～VR-8、
 *       §12.4 V-VER-03～V-VER-05、§11.2 VC-3、VC-7、§9.7 DS-30
 * 涵蓋：US-42、AC-42-01、AC-42-02、AC-42-03、AC-41-04、AC-36-02、AC-23-02
 *
 * EMT.ui.versionLine.init(doc?)
 * - 只從 DOM 讀 name 為 emt-app-version 與 emt-build-id 兩個 meta 的 content（各須恰 1 個），
 *   交給 EMT.core.version.versionLineText 組字；同一份 document 只讀一次（結果存模組變數）。
 * - 文字合法且有 #footer-links（v0.19，FE-86：錨點由 #footer-sources 改為頁尾連結列，VR-7、architecture §7.25.6）
 *   → 以 core/dom.js 建立 <p id="app-version" class="app-footer__version">（textContent），
 *   插在 #footer-links 之後（「正下方」）；已存在則只更新文字（重入安全）。不設 tabindex、role、事件。
 * - 文字不合法（任一 meta 缺少／重複、版本或 BUILD_ID 不符格式）或找不到 #footer-links → 不建節點，已存在則移除（VR-8）。
 * - 整個 init 包在 try 內：任何例外回 { rendered: false, text: null }，不拋出、不輸出錯誤訊息到主控台。
 * - 不發任何請求、不讀檔、不碰 store 與瀏覽器儲存；版本號一律來自 meta，本檔不寫死任何版本號（VR-5、VR-6）。
 * - 頁尾位於 #app-main 之外，所有畫面共用同一個節點 → 每個畫面恰 1 行（由 DOM 結構保證）。
 * 載入時只做登錄，不讀 document、不取用其他模組（LD-2）；Node 下 module.exports 供測試。
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.EMT = root.EMT || {};
    root.EMT.ui = root.EMT.ui || {};
    root.EMT.ui.versionLine = api;
  }
})(typeof self !== "undefined" ? self : this, function (root) {
  "use strict";

  /** 版本行元素 id 與 class（architecture.md §7.20.1） */
  var LINE_ID = "app-version";
  var LINE_CLASS = "app-footer__version";
  /** 版本行的錨點：頁尾連結列（v0.19，FE-86） */
  var ANCHOR_ID = "footer-links";

  /** 已讀取的 document 與組好的文字（同一份 document 只讀一次） */
  var readDoc = null;
  var readText = null;

  /**
   * 呼叫時才取用 core 模組（LD-2）：Node 以 require，瀏覽器以 EMT.core.<name>；取不到 → null。
   * @param {"version"|"pwa"|"dom"} name
   * @returns {object|null}
   */
  function core(name) {
    if (typeof module === "object" && module.exports && typeof require === "function") {
      try {
        if (name === "version") return require("../core/version.js");
        if (name === "pwa") return require("../core/pwa.js");
        if (name === "dom") return require("../core/dom.js");
      } catch (e) {
        return null;
      }
      return null;
    }
    var emt = root && root.EMT;
    return emt && emt.core && emt.core[name] ? emt.core[name] : null;
  }

  /**
   * 讀取 <meta name="…"> 的 content：恰 1 個才回傳，否則 null。
   * @param {Document} doc
   * @param {string} name
   * @returns {string|null}
   */
  function readMeta(doc, name) {
    var list = doc.querySelectorAll('meta[name="' + name + '"]');
    if (!list || list.length !== 1) return null;
    var v = list[0].getAttribute("content");
    return typeof v === "string" ? v : null;
  }

  /**
   * 依 meta 組出版本行文字（同一份 document 只讀一次）；不合法 → null。
   * @param {Document} doc
   * @returns {string|null}
   */
  function lineTextOf(doc) {
    if (readDoc === doc) return readText;
    var ver = core("version");
    var pwa = core("pwa");
    var text = null;
    if (ver && pwa) {
      text = ver.versionLineText(readMeta(doc, ver.APP_VERSION_META_NAME), readMeta(doc, pwa.PWA_BUILD_ID_META_NAME));
    }
    readDoc = doc;
    readText = typeof text === "string" ? text : null;
    return readText;
  }

  /** 移除既有的版本行（若有） */
  function removeLine(doc) {
    var old = doc.getElementById(LINE_ID);
    if (old && old.parentNode) old.parentNode.removeChild(old);
  }

  /**
   * 建立或更新頁尾版本行。
   * @param {Document} [doc] 預設 root.document
   * @returns {{ rendered: boolean, text: string|null }}
   */
  function init(doc) {
    var d = doc || null;
    try {
      if (!d) d = root && root.document;
      if (!d) return { rendered: false, text: null };
      var text = lineTextOf(d);
      var anchor = d.getElementById(ANCHOR_ID);
      if (text === null || !anchor || !anchor.parentNode) {
        removeLine(d);
        return { rendered: false, text: null };
      }
      var dom = core("dom");
      var line = d.getElementById(LINE_ID);
      if (line) {
        if (dom && typeof dom.setText === "function") dom.setText(line, text);
        else line.textContent = text;
      } else {
        if (!dom || typeof dom.el !== "function") return { rendered: false, text: null };
        line = dom.el("p", { className: LINE_CLASS, attrs: { id: LINE_ID }, text: text });
      }
      if (anchor.nextSibling !== line) anchor.parentNode.insertBefore(line, anchor.nextSibling);
      return { rendered: true, text: text };
    } catch (e) {
      // VR-8：不拋出、不輸出錯誤；盡量移除可能殘留的部分節點
      try {
        if (d) removeLine(d);
      } catch (e2) {
        /* 忽略 */
      }
      return { rendered: false, text: null };
    }
  }

  return {
    LINE_ID: LINE_ID,
    LINE_CLASS: LINE_CLASS,
    readMeta: readMeta,
    init: init
  };
});
