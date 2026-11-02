/*
 * services/download.js — 本機檔案下載（FE-08）
 * 依據：architecture.md §7.5「匯出」（Blob + URL.createObjectURL + <a download>）；契約 README §6.1
 * 涵蓋：AC-24-01（下載 1 個 .json 檔、不產生網路請求）
 *
 * EMT.services.download.saveText(filename, text, mimeType) → boolean
 * - 以 Blob 建立本機 blob: 網址，經暫時的 <a download> 觸發下載，下載後 revokeObjectURL。
 * - 不使用任何網路 API；blob: 為本機網址。
 * - 環境不支援（無 Blob／URL.createObjectURL）或過程拋例外時回傳 false，不拋出。
 * 寫法：工廠函式 create(env)，Node 下以 require 取得並注入假環境測試；瀏覽器下登錄單例。
 * 載入時只做登錄，不操作 DOM。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.EMT = root.EMT || {};
    root.EMT.services = root.EMT.services || {};
    root.EMT.services.download = api.create(root);
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // 釋放 blob 網址前的等待時間（毫秒）；立即釋放時部分瀏覽器會來不及開始下載
  var REVOKE_DELAY_MS = 1000;

  /**
   * 建立下載服務。
   * @param {{ document?: Document, Blob?: Function, URL?: object, setTimeout?: Function, EMT?: object }} env
   *   瀏覽器下傳入 window；測試時傳入假物件
   * @returns {{ saveText: function(string, string, string=): boolean, isSupported: function(): boolean }}
   */
  function create(env) {
    var g = env || {};

    /** 是否可下載 */
    function isSupported() {
      return typeof g.Blob === "function" && !!g.URL && typeof g.URL.createObjectURL === "function" &&
        !!g.document && typeof g.document.createElement === "function";
    }

    /** 取得建元素函式：優先用 core/dom.js（安全檢查），找不到時退回 createElement */
    function makeAnchor(href, filename) {
      var dom = g.EMT && g.EMT.core && g.EMT.core.dom;
      if (dom && typeof dom.el === "function") {
        return dom.el("a", { attrs: { href: href, download: filename, hidden: true } });
      }
      var a = g.document.createElement("a");
      a.setAttribute("href", href);
      a.setAttribute("download", filename);
      a.setAttribute("hidden", "");
      return a;
    }

    /**
     * 下載純文字檔。
     * @param {string} filename 檔名（含副檔名）
     * @param {string} text 檔案內容
     * @param {string} [mimeType] 預設 "application/json"
     * @returns {boolean} 是否已觸發下載
     */
    function saveText(filename, text, mimeType) {
      if (!isSupported()) return false;
      var url = null;
      var a = null;
      try {
        var blob = new g.Blob([String(text)], { type: mimeType || "application/json" });
        url = g.URL.createObjectURL(blob);
        a = makeAnchor(url, String(filename));
        var parent = g.document.body || g.document.documentElement;
        parent.appendChild(a);
        a.click();
        parent.removeChild(a);
      } catch (e) {
        if (a && a.parentNode) a.parentNode.removeChild(a);
        if (url) revoke(url, 0);
        return false;
      }
      revoke(url, REVOKE_DELAY_MS);
      return true;
    }

    /** 釋放 blob 網址（失敗忽略） */
    function revoke(url, delay) {
      function run() {
        try {
          if (typeof g.URL.revokeObjectURL === "function") g.URL.revokeObjectURL(url);
        } catch (e) {
          // 忽略
        }
      }
      if (delay > 0 && typeof g.setTimeout === "function") {
        g.setTimeout(run, delay);
      } else {
        run();
      }
    }

    return { saveText: saveText, isSupported: isSupported };
  }

  return { create: create, REVOKE_DELAY_MS: REVOKE_DELAY_MS };
});
