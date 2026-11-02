/*
 * ui/banner.js — 全域儲存警示列與讀取失敗提示（FE-07）
 * 依據：architecture.md §4.2（main.js 啟動順序）、§7.5；契約 README §5.3、StorageStatus
 * 涵蓋：AC-18-03、AC-18-04、AC-18-05
 *
 * EMT.ui.banner.render()
 * - storageStatus 為 "unavailable" 時，在 #app-banner 常駐顯示「進度將無法保存」（AC-18-03）。
 * - 啟動結果為 unreadable 時，以 toast 顯示「資料讀取失敗，已重設」（AC-18-05；每次啟動只顯示一次）。
 * - 一般寫入（非新增自訂單字、非匯入）遇容量不足時，以 toast 顯示「儲存空間不足」（§5.3「其他寫入」）；
 *   新增自訂單字與匯入的容量不足訊息由 view 依 action 回傳值顯示，本檔不重複提示。
 * - （v0.8，FE-25）學習紀錄寫入容量不足：store 於本工作階段第一次發 "learningQuota" tag，
 *   本檔以 toast 顯示「儲存空間不足」（LR-7、AC-30-14；store 保證只發一次）。
 * 文字一律經 EMT.core.dom（textContent）寫入。載入時只做登錄，不操作 DOM。
 */
(function (root) {
  "use strict";

  var EMT = (root.EMT = root.EMT || {});
  EMT.ui = EMT.ui || {};

  /** 畫面文字（PRD AC 原文） */
  var TEXT_UNAVAILABLE = "進度將無法保存";
  var TEXT_UNREADABLE = "資料讀取失敗，已重設";
  var TEXT_QUOTA = "儲存空間不足";

  var subscribed = false;
  var unreadableShown = false;

  /** 顯示 toast（toast 模組不存在則略過） */
  function toast(text) {
    if (EMT.ui.toast && typeof EMT.ui.toast.show === "function") {
      EMT.ui.toast.show(text, { kind: "error", ms: 5000 });
    }
  }

  /** 依目前狀態重繪警示列 */
  function paint() {
    var host = document.getElementById("app-banner");
    var store = EMT.store;
    if (!host || !store || typeof store.getState !== "function") return;
    var dom = EMT.core.dom;
    var unavailable = store.getState().runtime.storageStatus === "unavailable";
    dom.clear(host);
    if (unavailable) {
      host.appendChild(dom.el("p", {
        className: "app-banner__msg app-banner__msg--warn",
        attrs: { role: "alert" },
        text: TEXT_UNAVAILABLE
      }));
    }
  }

  /** store 通知：重新啟動或寫入狀態變化時處理 */
  function onChange(state, tags) {
    if (!tags) return;
    if (tags.indexOf("init") !== -1) paint();
    if (tags.indexOf("storage") !== -1 && EMT.store.getWriteStatus() === "quota") toast(TEXT_QUOTA);
    if (tags.indexOf("learningQuota") !== -1) toast(TEXT_QUOTA);
  }

  /** 啟動時呼叫（main.js）：繪製警示列、提示讀取失敗、訂閱後續變化 */
  function render() {
    var store = EMT.store;
    if (!store) return;
    paint();
    if (!unreadableShown && typeof store.getStartup === "function" && store.getStartup().status === "unreadable") {
      unreadableShown = true;
      toast(TEXT_UNREADABLE);
    }
    if (!subscribed && typeof store.subscribe === "function") {
      subscribed = true;
      store.subscribe(onChange);
    }
  }

  EMT.ui.banner = { render: render };
})(typeof self !== "undefined" ? self : this);
