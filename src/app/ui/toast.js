/*
 * ui/toast.js — 純文字提示訊息（FE-02）
 * 依據：architecture.md §4.2
 *
 * EMT.ui.toast.show(text, { kind: "info"｜"success"｜"error", ms })
 * - 文字一律以 textContent 呈現（契約 README §2 C-7）。
 * - 掛在 #toast-root（role="status"、aria-live="polite"）；kind 為 error 時該則另加 role="alert"。
 * - 同時最多保留 MAX_VISIBLE 則，超過時移除最舊的。
 * 回傳 { close() } 可提前關閉。
 * 載入時只做登錄，不操作 DOM。
 */
(function (root) {
  "use strict";

  var EMT = (root.EMT = root.EMT || {});
  EMT.ui = EMT.ui || {};

  var KINDS = { info: 1, success: 1, error: 1 };
  var DEFAULT_MS = 3000;
  var MAX_VISIBLE = 3;

  /** 取得（必要時建立）掛載點 */
  function getRoot() {
    var r = document.getElementById("toast-root");
    if (!r) {
      r = EMT.core.dom.el("div", {
        className: "toast-root",
        attrs: { id: "toast-root", role: "status", "aria-live": "polite" }
      });
      document.body.appendChild(r);
    }
    return r;
  }

  /**
   * 顯示提示。
   * @param {*} text 訊息（轉為字串，純文字）
   * @param {{ kind?: "info"|"success"|"error", ms?: number }} [opts]
   * @returns {{ close: Function }}
   */
  function show(text, opts) {
    var o = opts || {};
    var kind = KINDS[o.kind] === 1 ? o.kind : "info";
    var ms = typeof o.ms === "number" && isFinite(o.ms) && o.ms > 0 ? o.ms : DEFAULT_MS;
    var dom = EMT.core.dom;
    var r = getRoot();

    var attrs = { "data-kind": kind };
    if (kind === "error") attrs.role = "alert";
    var node = dom.el("div", {
      className: "toast toast--" + kind,
      attrs: attrs,
      text: text === null || text === undefined ? "" : String(text)
    });

    // 超過上限時移除最舊的
    while (r.children.length >= MAX_VISIBLE) r.removeChild(r.firstElementChild);
    r.appendChild(node);

    var timer = null;
    function close() {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      if (node.parentNode) node.parentNode.removeChild(node);
    }
    timer = setTimeout(close, ms);
    node.addEventListener("click", close);
    return { close: close };
  }

  EMT.ui.toast = { show: show };
})(typeof self !== "undefined" ? self : this);
