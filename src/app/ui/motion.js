/*
 * ui/motion.js — 減少動態判斷與動畫 class 加上／移除（FE-24）
 * 依據：architecture.md v0.4 §4.5（motion 介面）、§7.11（A-1～A-5）、§7.12（ANIM_CLEANUP_MARGIN_MS）
 * 涵蓋：US-31；AC-31-01～AC-31-04
 *
 * EMT.ui.motion.reduced() → boolean
 *   matchMedia("(prefers-reduced-motion: reduce)").matches；matchMedia 不存在或出錯 → false。每次呼叫即時查詢。
 * EMT.ui.motion.enter(el, className, ms)
 *   reduced() 為真 → 不加 class、直接回傳；否則先取消同元素同名 class 的舊計時器並移除 class，
 *   再加上 class，setTimeout(ms + ANIM_CLEANUP_MARGIN_MS) 後移除。
 * EMT.ui.motion.cancel(el, className)
 *   立刻移除 class 並清除計時器。
 *
 * 規則：動畫只是表現層，不依賴 animationend（減少動態時 CSS 已關閉動畫，事件不會觸發；A-2）。
 * 計時器以「元素 + class 名稱」為鍵，存在 WeakMap（元素 → { className: timerId }）。
 * 載入時只做登錄，不操作 DOM、不讀其他模組成員（LD-2）。
 */
(function (root) {
  "use strict";

  var EMT = (root.EMT = root.EMT || {});
  EMT.ui = EMT.ui || {};

  var REDUCE_QUERY = "(prefers-reduced-motion: reduce)";
  // interaction 模組不存在時的退路（值同 §7.12）
  var FALLBACK_MARGIN_MS = 50;

  // 元素 → { className: timerId }；WeakMap 不存在的極舊環境改存在元素私有屬性
  var timers = typeof WeakMap === "function" ? new WeakMap() : null;
  var PRIVATE_KEY = "__emtMotionTimers";

  /** 取得元素的計時器表（create 為真時必要時建立） */
  function timerMap(el, create) {
    if (timers) {
      var m = timers.get(el);
      if (!m && create) {
        m = {};
        timers.set(el, m);
      }
      return m || null;
    }
    if (!el[PRIVATE_KEY] && create) el[PRIVATE_KEY] = {};
    return el[PRIVATE_KEY] || null;
  }

  /** 清除計時器（不移除 class） */
  function clearTimer(el, className) {
    var m = timerMap(el, false);
    if (m && Object.prototype.hasOwnProperty.call(m, className)) {
      clearTimeout(m[className]);
      delete m[className];
    }
  }

  /** 是否為可操作 classList 的元素 */
  function isEl(el) {
    return !!(el && el.classList && typeof el.classList.add === "function");
  }

  /** 移除 class 的額外延遲（ANIM_CLEANUP_MARGIN_MS）；呼叫時才取用 interaction 模組 */
  function cleanupMargin() {
    var core = EMT.core;
    var ia = core && core.interaction;
    var v = ia && ia.UI && ia.UI.ANIM_CLEANUP_MARGIN_MS;
    return typeof v === "number" && isFinite(v) && v >= 0 ? v : FALLBACK_MARGIN_MS;
  }

  /**
   * 使用者是否要求減少動態。
   * @returns {boolean}
   */
  function reduced() {
    var mm = root.matchMedia;
    if (typeof mm !== "function") return false;
    try {
      var q = mm.call(root, REDUCE_QUERY);
      return !!(q && q.matches);
    } catch (e) {
      return false;
    }
  }

  /**
   * 立刻移除動畫 class 並清除計時器。
   * @param {Element} el
   * @param {string} className
   */
  function cancel(el, className) {
    if (!isEl(el) || !className) return;
    clearTimer(el, className);
    el.classList.remove(className);
  }

  /**
   * 播放進場動畫：加上 class，ms + 餘裕後自動移除。
   * 重複呼叫時先取消前一次，再重新加上（同步移除再加上；需要重播同一動畫的呼叫端自行負責重排）。
   * @param {Element} el
   * @param {string} className
   * @param {number} ms 動畫長度（毫秒）
   * @returns {boolean} 是否實際加上 class
   */
  function enter(el, className, ms) {
    if (!isEl(el) || !className) return false;
    if (reduced()) {
      // 減少動態：不加 class；若先前殘留則一併清掉
      cancel(el, className);
      return false;
    }
    cancel(el, className);
    el.classList.add(className);
    var dur = typeof ms === "number" && isFinite(ms) && ms > 0 ? ms : 0;
    var m = timerMap(el, true);
    m[className] = setTimeout(function () {
      if (m[className] !== undefined) delete m[className];
      el.classList.remove(className);
    }, dur + cleanupMargin());
    return true;
  }

  EMT.ui.motion = {
    reduced: reduced,
    enter: enter,
    cancel: cancel
  };
})(typeof self !== "undefined" ? self : this);
