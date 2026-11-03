/*
 * ui/pwa-notice.js — PWA 新版提示列（FE-50）
 * 依據：architecture.md v0.7 §4.7「EMT.ui.pwaNotice」、§7.18.5、§7.18.7；契約 README §10.7 UP-4、UP-6、PWA_TEXTS
 * 涵蓋：AC-36-03、AC-27-03、AC-31-03、AC-37-01
 *
 * EMT.ui.pwaNotice.init({ onReload })
 * - 只執行一次；取得 #pwa-update（不存在則不做事）。
 * - 以 core/dom.js 建立文字 <span class="pwa-update__text">（PWA_TEXTS.updateNotice）與
 *   <button type="button" class="btn btn--primary pwa-update__btn">（PWA_TEXTS.updateButton）。
 * - 訂閱 store，依 EMT.core.pwa.updateVisible(state)（eligible && updateAvailable）切換容器 hidden；
 *   init 時也依目前狀態繪製一次。任何進入模式、任何頁面皆可顯示（UP-6）。
 * - 按鈕點擊 → 設 disabled、呼叫 onReload()（例外攔下）；之後不再呼叫（防連點，UP-4）。
 * - 純文字、非彈出視窗、不阻擋操作；樣式見 styles/80-pwa.css（無 transition、animation）。
 * 載入時只做登錄，不操作 DOM、不讀取其他模組（LD-2）。
 */
(function (root) {
  "use strict";

  var EMT = (root.EMT = root.EMT || {});
  EMT.ui = EMT.ui || {};

  var inited = false;
  var host = null;
  var button = null;
  var clicked = false;
  var onReloadFn = null;

  /** 取得 core/pwa（呼叫時取用）；不存在時視為組裝錯誤（LD-3） */
  function pwaCore() {
    var m = EMT.core && EMT.core.pwa;
    if (!m) throw new Error("EMT.core.pwa 未載入（ui/pwa-notice.js）");
    return m;
  }

  /** 依狀態切換提示列 */
  function paint(state) {
    if (!host) return;
    var visible = false;
    try {
      visible = pwaCore().updateVisible(state) === true;
    } catch (e) {
      visible = false;
    }
    host.hidden = !visible;
  }

  function onClick() {
    if (clicked) return;
    clicked = true;
    if (button) {
      button.disabled = true;
      button.setAttribute("aria-disabled", "true");
    }
    if (typeof onReloadFn === "function") {
      try {
        onReloadFn();
      } catch (e) {
        /* 忽略（PE-3：不顯示錯誤） */
      }
    }
  }

  /**
   * 啟動時呼叫（main.js，bottomNav.init 之後）。
   * @param {{ onReload?: function(): void }} [opts]
   */
  function init(opts) {
    if (inited) return;
    inited = true;
    host = document.getElementById("pwa-update");
    if (!host) return;
    onReloadFn = opts && typeof opts.onReload === "function" ? opts.onReload : null;
    var dom = EMT.core.dom;
    var texts = pwaCore().PWA_TEXTS;
    button = dom.el("button", {
      className: "btn btn--primary pwa-update__btn",
      attrs: { type: "button" },
      text: texts.updateButton,
      on: { click: onClick }
    });
    dom.clear(host);
    dom.append(host, [
      dom.el("span", { className: "pwa-update__text", text: texts.updateNotice }),
      button
    ]);
    var store = EMT.store;
    if (store && typeof store.getState === "function") {
      paint(store.getState());
      if (typeof store.subscribe === "function") {
        store.subscribe(function (state, tags) {
          if (!tags || tags.indexOf("pwa") !== -1 || tags.indexOf("init") !== -1) paint(state);
        });
      }
    } else {
      host.hidden = true;
    }
  }

  EMT.ui.pwaNotice = { init: init };
})(typeof self !== "undefined" ? self : this);
