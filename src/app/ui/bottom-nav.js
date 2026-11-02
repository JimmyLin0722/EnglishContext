/*
 * ui/bottom-nav.js — 手機底部導覽列：輸入時隱藏（FE-26）
 * 依據：architecture.md v0.4 §4.5（bottomNav 介面）、§9.1（底部導覽列）
 * 涵蓋：US-27；AC-27-03（虛擬鍵盤開啟時導覽列不遮住輸入欄）
 *
 * EMT.ui.bottomNav.init()
 *   於 document 綁定 focusin／focusout：焦點在輸入元件（見 isTypingTarget）時，
 *   document.documentElement.classList.add("is-typing")，離開時移除；
 *   CSS（00-base.css，≤ 640px）據此隱藏導覽列與底部留白。重複呼叫只綁一次。
 * EMT.ui.bottomNav.isTypingTarget(el) → boolean（純函式，供測試）
 *   input（type 為 text、search、number、email、url、tel、password 或未指定）、textarea、select → true；
 *   其他（按鈕、核取方塊、滑桿、null）→ false。
 *
 * 載入時只做登錄，不操作 DOM、不讀其他模組成員（LD-2）。
 */
(function (root) {
  "use strict";

  var EMT = (root.EMT = root.EMT || {});
  EMT.ui = EMT.ui || {};

  var TYPING_CLASS = "is-typing";
  // 會開啟虛擬鍵盤的 input type（§4.5）；空字串代表未指定 type
  var TYPING_INPUT_TYPES = ["", "text", "search", "number", "email", "url", "tel", "password"];

  var bound = false;

  /**
   * 元素是否為會開啟虛擬鍵盤的輸入元件。
   * @param {*} el
   * @returns {boolean}
   */
  function isTypingTarget(el) {
    if (!el || el.nodeType !== 1 || typeof el.tagName !== "string") return false;
    var tag = el.tagName.toUpperCase();
    if (tag === "TEXTAREA" || tag === "SELECT") return true;
    if (tag !== "INPUT") return false;
    var type = typeof el.getAttribute === "function" ? el.getAttribute("type") : null;
    type = type == null ? "" : String(type).trim().toLowerCase();
    return TYPING_INPUT_TYPES.indexOf(type) >= 0;
  }

  /** 設定或移除 html 的 is-typing class */
  function setTyping(on) {
    var html = document.documentElement;
    if (!html || !html.classList) return;
    if (on) html.classList.add(TYPING_CLASS);
    else html.classList.remove(TYPING_CLASS);
  }

  function onFocusIn(ev) {
    setTyping(isTypingTarget(ev && ev.target));
  }

  function onFocusOut(ev) {
    // 焦點直接移到另一個輸入元件時維持 is-typing，避免導覽列閃現
    setTyping(isTypingTarget(ev && ev.relatedTarget));
  }

  /** 綁定事件（只綁一次）；並依目前焦點同步一次狀態 */
  function init() {
    if (bound) return;
    if (typeof document === "undefined" || !document || typeof document.addEventListener !== "function") return;
    bound = true;
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    setTyping(isTypingTarget(document.activeElement));
  }

  EMT.ui.bottomNav = {
    init: init,
    isTypingTarget: isTypingTarget
  };
})(typeof self !== "undefined" ? self : this);
