/*
 * main.js — 應用啟動（FE-02；v0.4 首次進入模式，FE-32）
 * 依據：architecture.md §4.2「main.js 啟動順序」（含 v0.4）、§7.9
 * 涵蓋：AC-22-05（emt-ready 量測點）
 *
 * DOMContentLoaded 後依序（模組存在才呼叫，單一步驟失敗不中斷後續）：
 *   EMT.content.load() → EMT.store.init() → EMT.ui.banner.render()
 *   → document.body.dataset.entry = runtime.entryMode（v0.4，FE-32；store 不存在時 "main"）
 *   → EMT.router.start(firstRun ? "customizer" : "dashboard")（v0.4，FE-32；AC-25-01、AC-25-05）
 *   → EMT.ui.bottomNav.init()（v0.4，FE-26）
 * （v0.7，FE-50）banner.render 之後 EMT.services.pwa.start({ onChange → store.actions.setPwa })（PE-1 判定；file:// 只判定即返回，
 *   service worker 延到 window load 後註冊，PE-4）；bottomNav.init 之後 EMT.ui.pwaNotice.init({ onReload → services.pwa.requestReload })。
 * emt-ready 位置不變：一般模式量到主控台入口可點擊，首次模式量到「開始學習」可點擊（AC-22-05）。
 * 最後 performance.mark("emt-ready")，並設 document.documentElement.dataset.ready = "1"。
 */
(function (root) {
  "use strict";

  var EMT = (root.EMT = root.EMT || {});

  /** 安全執行一個啟動步驟 */
  function step(name, fn) {
    try {
      fn();
    } catch (e) {
      if (typeof console !== "undefined") console.error("[EMT.main] " + name + " 失敗", e);
    }
  }

  /**
   * 目前的進入模式（v0.4，FE-32；契約 EntryMode）：store 不存在或讀取失敗時視為 "main"。
   * @returns {"firstRun"|"main"}
   */
  function entryModeOf() {
    try {
      var s = EMT.store;
      if (!s || typeof s.getState !== "function") return "main";
      var st = s.getState();
      return st && st.runtime && st.runtime.entryMode === "firstRun" ? "firstRun" : "main";
    } catch (e) {
      return "main";
    }
  }

  /** 啟動流程（只執行一次） */
  var booted = false;
  function boot() {
    if (booted) return;
    booted = true;

    step("content.load", function () {
      if (EMT.content && typeof EMT.content.load === "function") EMT.content.load();
    });
    step("store.init", function () {
      if (EMT.store && typeof EMT.store.init === "function") EMT.store.init();
    });
    step("banner.render", function () {
      if (EMT.ui && EMT.ui.banner && typeof EMT.ui.banner.render === "function") EMT.ui.banner.render();
    });
    // （v0.7，FE-50）PWA：PE-1 判定、動態連結、安裝事件；狀態經 store.actions.setPwa 寫入 runtime.pwa（不寫 localStorage）
    step("pwa.start", function () {
      if (EMT.services && EMT.services.pwa && typeof EMT.services.pwa.start === "function") {
        EMT.services.pwa.start({
          onChange: function (p) {
            if (EMT.store && EMT.store.actions && typeof EMT.store.actions.setPwa === "function") EMT.store.actions.setPwa(p);
          }
        });
      }
    });
    // （v0.4，FE-32）設定 body[data-entry]，CSS 據此隱藏首次模式的導覽列（§7.9）；須在 router.start 之前，
    // router.go 依此限制首次模式只能到 customizer、sources
    var entryMode = entryModeOf();
    step("entry", function () {
      if (document.body) document.body.dataset.entry = entryMode;
    });
    step("router.start", function () {
      if (EMT.router && typeof EMT.router.start === "function") {
        EMT.router.start(entryMode === "firstRun" ? "customizer" : "dashboard");
      }
    });
    // （v0.4，FE-26）手機底部導覽列：輸入時隱藏（architecture.md §4.2 v0.4 啟動順序、§4.5）
    step("bottomNav.init", function () {
      if (EMT.ui && EMT.ui.bottomNav && typeof EMT.ui.bottomNav.init === "function") EMT.ui.bottomNav.init();
    });
    // （v0.7，FE-50）新版提示列（UP-4、UP-6）
    step("pwaNotice.init", function () {
      if (EMT.ui && EMT.ui.pwaNotice && typeof EMT.ui.pwaNotice.init === "function") {
        EMT.ui.pwaNotice.init({
          onReload: function () {
            if (EMT.services && EMT.services.pwa && typeof EMT.services.pwa.requestReload === "function") EMT.services.pwa.requestReload();
          }
        });
      }
    });

    step("emt-ready", function () {
      if (typeof performance !== "undefined" && typeof performance.mark === "function") {
        performance.mark("emt-ready");
      }
    });
    document.documentElement.setAttribute("data-ready", "1");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    // 程式位於 </body> 前，某些情況下 DOMContentLoaded 已觸發
    boot();
  }
})(typeof self !== "undefined" ? self : this);
