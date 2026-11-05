/*
 * EMT.ui.adSlot — 廣告版位容器與載入時機（FE-88）
 * 依據：architecture.md v0.14 §7.25.3「評估」「DS-47」「隱私」；契約 README §13.2 AD-5、AD-6、AD-7、AD-9、AD-10、AD-11、AD-14、V-AD-05
 * 涵蓋：US-52、AC-50-04、AC-51-02、AC-52-01、AC-52-02、AC-52-04、AC-52-06、AC-52-07、E-141、E-142
 *
 * EMT.ui.adSlot.init()（main.js 在 router.start、bottomNav.init 之後呼叫；只生效 1 次）
 * - ineligible：立即結束，不訂閱、不建 DOM（第一階段頁面上完全沒有版位）。
 * - waiting：訂閱 store，每次通知評估 core/ad.decide；init 時也評估 1 次，因為 router.start 的通知早於訂閱。
 * - decide 有結果 → requestAnimationFrame 再 setTimeout(0)，確保在繪製之後（AD-6 (5)、AC-51-02）。
 *   分頁在背景時 rAF 不觸發，回到前景才繼續，不算失敗。
 * - 執行前重新評估：router 先發 "tab" 通知、之後才呼叫新頁 show，通知當下的畫面還沒更新；
 *   等待期間也可能已切頁、被隱藏或斷線。一律以執行當下的結果為準（AD-6）。
 *
 * DS-47：容器與廣告框只建立 1 次，插在 #app-footer 之前（位於 #app-main 之外，主控台重繪碰不到）。
 * 之後不移除、不換父節點、不重新 push。切頁不經本檔：顯示與否只靠 body[data-tab] 與 styles/85-ad.css。
 * 本檔之後的工作只有同步 data-ad-state 與標籤的 hidden。
 *
 * 隱私（AD-11）：學習資料只用於判斷是否載入，結果不寫入 DOM、不傳給 services/ad.js。
 * 全部靜默：不輸出錯誤訊息到主控台（AD-8）。
 * 載入時只做登錄，不讀 document、不取用其他模組（LD-2）；Node 下 module.exports 供測試。
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.EMT = root.EMT || {};
    root.EMT.ui = root.EMT.ui || {};
    root.EMT.ui.adSlot = api;
  }
})(typeof self !== "undefined" ? self : this, function (root) {
  "use strict";

  // DOM 識別（architecture.md §7.25.3 DS-47）
  var SLOT_ID = "ad-slot";
  var SLOT_ARIA_LABEL = "廣告版位";
  var FOOTER_ID = "app-footer";
  var START_BUTTON_SELECTOR = "#view-dashboard .db-start";

  /**
   * 預設依賴：呼叫時才取用（LD-2）。
   * @returns {{store: object, ad: object, reinit: object, service: object}}
   */
  function defaultDeps() {
    if (typeof module === "object" && module.exports && typeof require === "function") {
      return { store: null, ad: require("../core/ad.js"), reinit: require("../core/reinit.js"), service: require("../services/ad.js") };
    }
    var emt = root.EMT;
    return { store: emt.store, ad: emt.core.ad, reinit: emt.core.reinit, service: emt.services.ad };
  }

  /**
   * 建立實例（測試注入替身；預設實例使用瀏覽器全域）。
   * @param {object} g 全域物件（document、navigator、requestAnimationFrame、setTimeout）
   * @param {function(): {store: object, ad: object, reinit: object, service: object}} [getDeps]
   * @returns {{init: function(): boolean}}
   */
  function create(g, getDeps) {
    var deps = null;
    var initialized = false;
    var pending = false;
    var refs = null;

    /** 目前版位狀態 */
    function statusNow() {
      return deps.store.getState().runtime.ad.status;
    }

    /**
     * AD-6 評估。不在主控台時不必計算學習紀錄（學習中的每次通知都會經過這裡）。
     * @returns {"load"|"collapse"|null}
     */
    function evaluate() {
      var st = deps.store.getState();
      var rt = st.runtime;
      if (rt.ad.status !== "waiting" || rt.currentTab !== "dashboard") { return null; }
      var btn = g.document.querySelector(START_BUTTON_SELECTOR);
      return deps.ad.decide({
        status: rt.ad.status,
        entryMode: rt.entryMode,
        currentTab: rt.currentTab,
        hasLearningRecord: deps.reinit.hasLearningRecord(st.data, deps.store.today()) === true,
        online: g.navigator.onLine,
        startReady: !!btn && btn.disabled !== true
      });
    }

    /**
     * 建立容器與廣告框（只會成功 1 次，DS-47）。屬性依 AD-7，不加入其他 data-*（AD-11）。
     * 找不到 #app-footer → 不建立；run 會因此收合版位。
     */
    function build() {
      var doc = g.document;
      var footer = doc.getElementById(FOOTER_ID);
      if (!footer || !footer.parentNode) { return; }
      var config = deps.ad.AD_CONFIG;

      var slot = doc.createElement("aside");
      slot.setAttribute("id", SLOT_ID);
      slot.setAttribute("class", "ad-slot");
      slot.setAttribute("aria-label", SLOT_ARIA_LABEL);

      var label = doc.createElement("p");
      label.setAttribute("class", "ad-slot__label");
      label.textContent = deps.ad.AD_TEXTS.label;
      label.hidden = true;

      var frame = doc.createElement("div");
      frame.setAttribute("class", "ad-slot__frame");

      var ins = doc.createElement("ins");
      ins.setAttribute("class", "adsbygoogle");
      ins.setAttribute("style", "display:block");
      ins.setAttribute("data-ad-client", config.publisherId);
      ins.setAttribute("data-ad-slot", config.adSlotId);
      ins.setAttribute("data-ad-format", "auto");
      ins.setAttribute("data-full-width-responsive", "false");

      frame.appendChild(ins);
      slot.appendChild(label);
      slot.appendChild(frame);
      refs = { slot: slot, label: label, ins: ins };
      // 掛上文件前就設好狀態：不會有一瞬間未套用高度 0 的畫面
      sync();
      footer.parentNode.insertBefore(slot, footer);
    }

    /** 同步 data-ad-state 與標籤；只寫入狀態屬性，不動節點位置（AD-9） */
    function sync() {
      var status = statusNow();
      if (!refs) {
        // ineligible、waiting，以及未曾載入就 collapsed、dismissed：都不建容器（DS-47）
        if (status === "loading") { build(); }
        return;
      }
      if (refs.slot.getAttribute("data-ad-state") !== status) {
        refs.slot.setAttribute("data-ad-state", status);
      }
      refs.label.hidden = status !== "filled";
    }

    /** 繪製之後執行：以當下狀態重新評估，條件已不成立就等下一次通知 */
    function run() {
      pending = false;
      try {
        var action = evaluate();
        if (action === "collapse") {
          deps.store.actions.adEvent("collapse");
        } else if (action === "load") {
          deps.store.actions.adEvent("load");
          if (refs && refs.ins) {
            deps.service.load(refs.ins);
          } else {
            deps.store.actions.adEvent("collapse");
          }
        }
      } catch (e) {
        /* 靜默（AD-8）：廣告失敗不得影響學習 */
      }
    }

    /** 排程執行（等待期間不重複排程） */
    function schedule() {
      if (pending) { return; }
      pending = true;
      var later = function () { g.setTimeout(run, 0); };
      if (typeof g.requestAnimationFrame === "function") {
        g.requestAnimationFrame(later);
      } else {
        later();
      }
    }

    /** 每次 store 通知：同步畫面；還在 waiting 才評估 */
    function onChange() {
      try {
        sync();
        if (evaluate()) { schedule(); }
      } catch (e) {
        /* 靜默（AD-8） */
      }
    }

    /**
     * 初始化（只生效 1 次）。不拋例外。
     * @returns {boolean} 是否已開始監看（ineligible 或失敗時 false）
     */
    function init() {
      if (initialized) { return false; }
      initialized = true;
      try {
        deps = getDeps();
        if (statusNow() === "ineligible") { return false; }
        deps.store.subscribe(onChange);
        onChange();
        return true;
      } catch (e) {
        return false;
      }
    }

    return { init: init };
  }

  // 預設實例：建立時只設定區域變數，不呼叫任何瀏覽器 API（LD-2）
  var instance = create(root, defaultDeps);

  return {
    init: instance.init,
    create: create
  };
});
