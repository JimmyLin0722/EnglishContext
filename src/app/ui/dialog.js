/*
 * ui/dialog.js — 自製確認對話框（FE-02）
 * 依據：architecture.md §4.2（不用 window.confirm）
 *
 * EMT.ui.dialog.confirm({ title, message, okText, cancelText }) → Promise<boolean>
 * - 按「確定」→ true；按「取消」、按 Esc、點背景 → false。
 * - 開啟時焦點移入對話框（取消鈕，避免誤觸破壞性操作）；Tab 在對話框內循環；關閉後焦點還原。
 * - 所有文字以 textContent 呈現（契約 README §2 C-7）；message 內的換行以 CSS pre-line 顯示。
 * - 同時只開一個：開新對話框時，前一個以 false 結束。
 * 載入時只做登錄，不操作 DOM。
 */
(function (root) {
  "use strict";

  var EMT = (root.EMT = root.EMT || {});
  EMT.ui = EMT.ui || {};

  var DEFAULT_OK = "確定";
  var DEFAULT_CANCEL = "取消";

  var active = null; // 目前開啟中的對話框 { finish(result) }
  var seq = 0;

  /** 取得（必要時建立）掛載點 */
  function getRoot() {
    var r = document.getElementById("dialog-root");
    if (!r) {
      r = EMT.core.dom.el("div", { className: "dialog-root", attrs: { id: "dialog-root" } });
      document.body.appendChild(r);
    }
    return r;
  }

  /** 對話框內可取得焦點的元素 */
  function focusables(box) {
    var list = box.querySelectorAll("button, [href], input, select, textarea, [tabindex]");
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var n = list[i];
      if (!n.disabled && n.getAttribute("tabindex") !== "-1") out.push(n);
    }
    return out;
  }

  /** 純文字或空字串 */
  function str(v, fallback) {
    if (v === null || v === undefined || v === "") return fallback;
    return String(v);
  }

  /**
   * 開啟確認對話框。
   * @param {{ title?: string, message?: string, okText?: string, cancelText?: string }} [opts]
   * @returns {Promise<boolean>}
   */
  function confirm(opts) {
    var o = opts || {};
    if (active) active.finish(false);

    return new Promise(function (resolve) {
      var dom = EMT.core.dom;
      var r = getRoot();
      var id = "dialog-" + ++seq;
      var previousFocus = document.activeElement;
      var done = false;

      var title = str(o.title, "");
      var message = str(o.message, "");

      var cancelBtn = dom.el("button", {
        className: "btn btn--secondary",
        attrs: { type: "button", "data-action": "cancel" },
        text: str(o.cancelText, DEFAULT_CANCEL),
        on: { click: function () { finish(false); } }
      });
      var okBtn = dom.el("button", {
        className: "btn btn--primary",
        attrs: { type: "button", "data-action": "ok" },
        text: str(o.okText, DEFAULT_OK),
        on: { click: function () { finish(true); } }
      });

      var boxAttrs = { role: "dialog", "aria-modal": "true", tabindex: "-1" };
      if (title) boxAttrs["aria-labelledby"] = id + "-title";
      else boxAttrs["aria-label"] = "確認";
      if (message) boxAttrs["aria-describedby"] = id + "-msg";

      var box = dom.el("div", { className: "dialog", attrs: boxAttrs }, [
        title ? dom.el("h2", { className: "dialog__title", attrs: { id: id + "-title" }, text: title }) : null,
        message ? dom.el("p", { className: "dialog__message", attrs: { id: id + "-msg" }, text: message }) : null,
        dom.el("div", { className: "dialog__actions" }, [cancelBtn, okBtn])
      ]);

      var backdrop = dom.el("div", {
        className: "dialog-backdrop",
        on: {
          click: function (ev) {
            if (ev.target === backdrop) finish(false);
          }
        }
      }, box);

      function onKeydown(ev) {
        if (ev.key === "Escape" || ev.key === "Esc") {
          ev.preventDefault();
          ev.stopPropagation();
          finish(false);
          return;
        }
        if (ev.key === "Tab") {
          // 焦點限制在對話框內
          var f = focusables(box);
          if (f.length === 0) return;
          var first = f[0];
          var last = f[f.length - 1];
          if (ev.shiftKey && (document.activeElement === first || !box.contains(document.activeElement))) {
            ev.preventDefault();
            last.focus();
          } else if (!ev.shiftKey && (document.activeElement === last || !box.contains(document.activeElement))) {
            ev.preventDefault();
            first.focus();
          }
        }
      }

      function finish(result) {
        if (done) return;
        done = true;
        document.removeEventListener("keydown", onKeydown, true);
        if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
        if (document.body) document.body.classList.remove("has-dialog");
        if (active === handle) active = null;
        if (previousFocus && typeof previousFocus.focus === "function" && document.contains(previousFocus)) {
          try { previousFocus.focus(); } catch (e) { /* 忽略 */ }
        }
        resolve(result);
      }

      var handle = { finish: finish };
      active = handle;

      // 以捕獲階段攔截鍵盤，Esc 不會再觸發其他元件
      document.addEventListener("keydown", onKeydown, true);
      r.appendChild(backdrop);
      if (document.body) document.body.classList.add("has-dialog");
      cancelBtn.focus();
    });
  }

  EMT.ui.dialog = {
    confirm: confirm,
    /** 是否有對話框開啟中 */
    isOpen: function () {
      return active !== null;
    }
  };
})(typeof self !== "undefined" ? self : this);
