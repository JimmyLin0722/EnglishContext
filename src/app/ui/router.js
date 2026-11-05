/*
 * ui/router.js — 頁面登錄與頁籤路由（FE-02）
 * 依據：architecture.md §4.2、§7.6「效能」、§9「導覽」；契約 TabId、RuntimeState.currentTab
 * 涵蓋：AC-20-03、AC-22-01；（v0.4，FE-24）US-31、AC-31-01～AC-31-03（換頁動畫，§4.2、§7.11）
 *
 * 提供：
 * - EMT.views.register(tabId, module)：module = { mount(rootEl), show(), hide() }，皆可省略；
 *   同一 tabId 可登錄多個模組，mount 只在該頁第一次顯示前呼叫一次。
 * - EMT.router.start(tabId)：綁定導覽事件並顯示起始頁（只生效一次）。
 * - EMT.router.go(tabId)：切換頁籤；只改 section 的 hidden 屬性並呼叫 hide／show，不重建 DOM。
 * - EMT.router.current()：目前頁面代碼。
 *
 * 導覽來源：#app-nav 內的 [data-tab] 按鈕；頁面任何位置的 [data-go] 元素（如頁尾「資料來源與授權」、
 * 主控台入口）點擊時導向其值。
 * （v0.4，FE-24）換頁動畫：切到不同頁時舊頁立即 hidden 並取消其進場 class（不做離場動畫）；
 * 新頁 hidden = false 後同步 EMT.ui.motion.enter(next, "view--entering", UI.PAGE_ANIM_MS)，
 * 並呼叫 performance.mark("emt-page-shown")（QA 量 AC-22-01 的輔助點）。同頁重複 go 不重播。
 * 起始頁（尚無目前頁面）不播放動畫，只做 mark。
 * （v0.4，FE-32）首次進入模式（§4.2 v0.4 router 新行為、§7.9；契約 §5.5 FS-2、FS-3）：
 * - go(tabId) 成功時設 document.body.dataset.tab = tabId（供 CSS 依目前頁面調整版面）。
 * - body[data-entry="firstRun"] 時只接受 FIRST_RUN_TABS，其他回 false（AC-25-01、AC-20-03、SP-4）。
 * - start() 訂閱 store：收到 "entry" tag 且 runtime.entryMode === "main" → body.dataset.entry = "main"、
 *   go("dashboard")（「開始學習」與首次還原成功共用此路徑，view 不直接切頁；換頁動畫照常）。
 * （v0.5，FE-38）隱藏頁守門（§4.2 v0.5 router 新行為、§7.16；契約 §5.8 HT-3、HT-5、DS-05；AC-20-04、E-68）：
 * - go(tabId) 遇 HIDDEN_TAB_IDS（呼叫時取 EMT.core.constants）→ 首次模式回 false、不切頁；
 *   一般模式改 go("dashboard") 並回 false。不顯示錯誤、不 console.error。[data-go]、程式內部呼叫皆經此守門，
 *   因此隱藏頁的 view 照常登錄（TAB_IDS、register 接受全部 TabId），但永遠不會 mount。
 * - start() 綁定 window 的 hashchange，並在啟動時檢查一次 location.hash：片段正規化（normalizeHash）後
 *   屬隱藏頁 → 一般模式 go("dashboard")、首次模式不動作；其他片段一律忽略（本系統不使用 hash 路由，不改網址）。
 * （v0.19，FE-86）對外頁面與返回（§4.12、§7.25.5；契約 SP-1～SP-6、DS-50；AC-57-01、AC-57-04、AC-20-04）：
 * - TAB_IDS 10 個、FIRST_RUN_TABS 5 個（與 store.js 同步）。
 * - go(tabId, opts)：opts.resetReturn 交給 store.setTab。切到不同頁時先同步外殼與 store，再呼叫新頁 show：
 *   show 內的 returnTarget()（返回按鈕文字）才讀得到本次的 sitePageReturnTab。
 * - back() → go(returnTarget())；returnTarget() 讀 runtime.sitePageReturnTab，null 時首次模式 customizer、一般模式 dashboard。
 *   返回目標只在記憶體，本檔不碰任何瀏覽器儲存（SP-4）。
 * - checkHash：片段正規化後恰為 sources → go("sources", { resetReturn: true })，再以 history.replaceState 移除片段
 *   （失敗靜默，SP-6）；隱藏頁片段與其他片段行為不變，不新增其他 hash 路由。
 * 載入時只做登錄，不操作 DOM、不讀其他模組成員（LD-2）。
 */
(function (root) {
  "use strict";

  var EMT = (root.EMT = root.EMT || {});

  // 契約 TabId 的全部值（data-schema.ts §10）
  var TAB_IDS = ["dashboard", "customizer", "flashcards", "part5", "decoder", "phrasebank", "sources", "about", "contact", "privacy"];
  var DEFAULT_TAB = "dashboard";
  // 首次模式的預設返回目標（SP-3）
  var FIRST_RUN_HOME_TAB = "customizer";
  // （v0.4，FE-32）首次模式可到達的頁面（契約 FS-2、FS-3、SP-4；與 store.setTab 的限制一致）
  var FIRST_RUN_TABS = ["customizer", "sources", "about", "contact", "privacy"];
  // （v0.19）有返回目標的 4 個頁面（SP-3）；不得作為返回目標（契約 RuntimeState.sitePageReturnTab）
  var SITE_RETURN_TABS = ["sources", "about", "contact", "privacy"];
  // （v0.19）唯一有導向行為的頁面片段（SP-6）
  var SOURCES_HASH = "sources";
  // （v0.5，FE-38）constants 模組不存在時的退路（值同契約 HIDDEN_TAB_IDS）
  var FALLBACK_HIDDEN_TAB_IDS = ["decoder", "phrasebank"];
  // 換頁進場動畫 class（05-motion.css）
  var ENTER_CLASS = "view--entering";
  // interaction 模組不存在時的退路（值同 §7.12 PAGE_ANIM_MS）
  var FALLBACK_PAGE_MS = 240;

  // tabId → 模組陣列；tabId → 是否已 mount
  var registry = {};
  var mounted = {};
  var currentTab = null;
  var started = false;
  var unsubscribeStore = null;

  /** 是否為合法的 TabId */
  function isTabId(tabId) {
    return TAB_IDS.indexOf(tabId) >= 0;
  }

  /** 隱藏頁清單：EMT.core.constants.HIDDEN_TAB_IDS（呼叫時取用，LD-2） */
  function hiddenTabIds() {
    var core = EMT.core;
    var c = core && core.constants;
    var list = c && c.HIDDEN_TAB_IDS;
    return Array.isArray(list) ? list : FALLBACK_HIDDEN_TAB_IDS;
  }

  /** 是否為隱藏頁（HT-3） */
  function isHiddenTab(tabId) {
    return hiddenTabIds().indexOf(tabId) >= 0;
  }

  /**
   * 網址片段正規化（純函式）：去開頭 "#"、去開頭 "/"、去開頭 "view-"、轉小寫。
   * 例："#/decoder" → "decoder"、"#view-Phrasebank" → "phrasebank"。非字串回 ""。
   * @param {string} hash
   * @returns {string}
   */
  function normalizeHash(hash) {
    if (typeof hash !== "string") return "";
    var h = hash.replace(/^#+/, "").replace(/^\/+/, "").toLowerCase();
    if (h.indexOf("view-") === 0) h = h.slice(5);
    return h;
  }

  /** 安全呼叫模組方法；單一模組出錯不影響其他頁面與導覽 */
  function callSafe(mod, method, arg) {
    if (!mod || typeof mod[method] !== "function") return;
    try {
      mod[method](arg);
    } catch (e) {
      if (typeof console !== "undefined") console.error("[EMT.router] " + method + " 失敗", e);
    }
  }

  /** 取得頁面 section */
  function sectionOf(tabId) {
    return document.getElementById("view-" + tabId);
  }

  /**
   * 登錄頁面模組。
   * @param {string} tabId 契約 TabId
   * @param {{ mount?: Function, show?: Function, hide?: Function }} mod
   */
  function register(tabId, mod) {
    if (!isTabId(tabId)) throw new Error("[EMT.views] 未知的頁面代碼：" + tabId);
    if (!mod || typeof mod !== "object") throw new Error("[EMT.views] 模組必須是物件");
    (registry[tabId] = registry[tabId] || []).push(mod);
    // 頁面已 mount 且正在顯示時才登錄的模組：補 mount 與 show，維持「mount 一次、顯示時 show」的約定
    if (mounted[tabId]) {
      var sec = sectionOf(tabId);
      callSafe(mod, "mount", sec);
      if (currentTab === tabId) callSafe(mod, "show");
    }
  }

  /** 呼叫時才取用 motion 模組（LD-2）；不存在時回 null，換頁照常只是沒有動畫 */
  function motion() {
    var ui = EMT.ui;
    var m = ui && ui.motion;
    return m && typeof m.enter === "function" && typeof m.cancel === "function" ? m : null;
  }

  /** 換頁動畫長度：EMT.core.interaction.UI.PAGE_ANIM_MS（呼叫時取用） */
  function pageAnimMs() {
    var core = EMT.core;
    var ia = core && core.interaction;
    var v = ia && ia.UI && ia.UI.PAGE_ANIM_MS;
    return typeof v === "number" && isFinite(v) && v > 0 ? v : FALLBACK_PAGE_MS;
  }

  /** 標記新頁面開始顯示（performance.mark 存在才呼叫） */
  function markShown() {
    var perf = root.performance;
    if (perf && typeof perf.mark === "function") {
      try { perf.mark("emt-page-shown"); } catch (e) { /* 部分環境不支援，忽略 */ }
    }
  }

  /** document.body（測試環境可能不存在） */
  function body() {
    return typeof document !== "undefined" && document ? document.body : null;
  }

  /** 是否為首次進入模式（body[data-entry="firstRun"]） */
  function isFirstRun() {
    var b = body();
    return !!(b && b.dataset && b.dataset.entry === "firstRun");
  }

  /** 設定 body[data-tab]（目前頁面代碼） */
  function markBodyTab(tabId) {
    var b = body();
    if (b && b.dataset) b.dataset.tab = tabId;
  }

  /** 設定導覽按鈕的 aria-current */
  function markNav(tabId) {
    var nav = document.getElementById("app-nav");
    if (!nav) return;
    var btns = nav.querySelectorAll("[data-tab]");
    for (var i = 0; i < btns.length; i++) {
      if (btns[i].getAttribute("data-tab") === tabId) btns[i].setAttribute("aria-current", "page");
      else btns[i].removeAttribute("aria-current");
    }
  }

  /** 設定手機版選單展開狀態 */
  function setMenuOpen(open) {
    var nav = document.getElementById("app-nav");
    var toggle = document.getElementById("nav-toggle");
    if (nav) nav.classList.toggle("is-open", !!open);
    if (toggle) toggle.setAttribute("aria-expanded", open ? "true" : "false");
  }

  /** 選單是否展開 */
  function isMenuOpen() {
    var nav = document.getElementById("app-nav");
    return !!(nav && nav.classList.contains("is-open"));
  }

  /**
   * 同步外殼（導覽、body[data-tab]、選單）與 store.currentTab。
   * @param {string} tabId
   * @param {{resetReturn?: boolean}} [opts]
   */
  function syncShell(tabId, opts) {
    markNav(tabId);
    markBodyTab(tabId);
    setMenuOpen(false);

    // 同步執行期狀態（store 存在才呼叫）
    var store = EMT.store;
    if (store && store.actions && typeof store.actions.setTab === "function") {
      try {
        store.actions.setTab(tabId, opts);
      } catch (e2) {
        if (typeof console !== "undefined") console.error("[EMT.router] setTab 失敗", e2);
      }
    }
  }

  /**
   * 切換頁籤。
   * @param {string} tabId 契約 TabId；不合法時忽略
   * @param {{resetReturn?: boolean}} [opts] resetReturn：不記錄返回目標（SP-6 的 #sources 入口）
   * @returns {boolean} 是否切換成功
   */
  function go(tabId, opts) {
    if (!isTabId(tabId)) return false;
    // （v0.5）隱藏頁：首次模式維持原頁；一般模式改顯示主控台（HT-3、E-68，不顯示錯誤）
    if (isHiddenTab(tabId)) {
      if (!isFirstRun()) go(DEFAULT_TAB);
      return false;
    }
    // 首次模式只能在難易度設定與 4 個對外頁面之間往返（AC-25-01、AC-25-07、SP-4）
    if (isFirstRun() && FIRST_RUN_TABS.indexOf(tabId) < 0) return false;
    var next = sectionOf(tabId);
    if (!next) return false;

    // 第一次顯示前 mount（只一次）
    var mods = registry[tabId] || [];
    if (!mounted[tabId]) {
      mounted[tabId] = true;
      for (var m = 0; m < mods.length; m++) callSafe(mods[m], "mount", next);
    }

    if (currentTab !== tabId) {
      var mo = motion();
      var hadPrev = !!currentTab;
      // 隱藏舊頁：立即隱藏並取消進場動畫（不做離場動畫，連點時畫面上永遠只有一個 view；AC-31-02）
      if (currentTab) {
        var prev = sectionOf(currentTab);
        if (prev) {
          prev.hidden = true;
          if (mo) mo.cancel(prev, ENTER_CLASS);
        }
        var prevMods = registry[currentTab] || [];
        for (var h = 0; h < prevMods.length; h++) callSafe(prevMods[h], "hide");
      }
      next.hidden = false;
      // 與顯示同一個工作中加上進場 class：動畫自第一個影格開始，不強制重排（§7.11、AC-22-01）
      if (mo && hadPrev) mo.enter(next, ENTER_CLASS, pageAnimMs());
      markShown();
      currentTab = tabId;
      // （v0.19）先同步再 show：show 內的 returnTarget() 須讀到本次切頁後的返回目標（§7.25.6）
      syncShell(tabId, opts);
      for (var s = 0; s < mods.length; s++) callSafe(mods[s], "show");
      if (typeof root.scrollTo === "function") {
        try { root.scrollTo(0, 0); } catch (e) { /* 部分環境不支援，忽略 */ }
      }
      return true;
    }

    syncShell(tabId, opts);
    // （v0.19）已在同一頁又經 #sources 進入：返回目標被清除，重呼 show 讓返回按鈕文字同步（SP-6）
    if (opts && opts.resetReturn === true) {
      for (var r = 0; r < mods.length; r++) callSafe(mods[r], "show");
    }
    return true;
  }

  /**
   * （v0.19）返回目標（SP-3）：runtime.sitePageReturnTab；為 null 或不是可返回的頁面時，
   * 首次模式回 customizer、一般模式回 dashboard。
   * @returns {string} TabId
   */
  function returnTarget() {
    var saved = null;
    var store = EMT.store;
    if (store && typeof store.getState === "function") {
      try {
        var st = store.getState();
        saved = st && st.runtime ? st.runtime.sitePageReturnTab : null;
      } catch (e) {
        saved = null;
      }
    }
    if (isTabId(saved) && !isHiddenTab(saved) && SITE_RETURN_TABS.indexOf(saved) < 0) return saved;
    return isFirstRun() ? FIRST_RUN_HOME_TAB : DEFAULT_TAB;
  }

  /**
   * （v0.19）返回進入對外頁面之前的畫面（SP-3、SP-4）；只切頁，不寫入任何儲存。
   * @returns {boolean} 是否切換成功
   */
  function back() {
    return go(returnTarget());
  }

  /** 往上找具有指定屬性的元素（不超過 boundary） */
  function closestWithAttr(node, attr) {
    while (node && node.nodeType === 1) {
      if (node.hasAttribute(attr)) return node;
      node = node.parentNode;
    }
    return null;
  }

  /** 綁定導覽、選單鈕與 [data-go] 委派事件 */
  function bindEvents() {
    var nav = document.getElementById("app-nav");
    if (nav) {
      nav.addEventListener("click", function (ev) {
        var btn = closestWithAttr(ev.target, "data-tab");
        if (btn && nav.contains(btn)) go(btn.getAttribute("data-tab"));
      });
    }

    var toggle = document.getElementById("nav-toggle");
    if (toggle) {
      toggle.addEventListener("click", function () {
        setMenuOpen(!isMenuOpen());
      });
    }

    // 任何 [data-go] 元素（頁尾、主控台入口等）
    document.addEventListener("click", function (ev) {
      var target = closestWithAttr(ev.target, "data-go");
      if (!target) return;
      var tab = target.getAttribute("data-go");
      if (isTabId(tab)) {
        ev.preventDefault();
        go(tab);
      }
    });

    // Esc 收合手機版選單（對話框開啟時由對話框處理）
    document.addEventListener("keydown", function (ev) {
      if ((ev.key === "Escape" || ev.key === "Esc") && isMenuOpen()) {
        setMenuOpen(false);
        if (toggle) toggle.focus();
      }
    });
  }

  /**
   * （v0.19）移除網址片段，重新載入時回到一般起始畫面（SP-6）；replaceState 不會再觸發 hashchange。
   * 環境不支援或拋例外（部分 file:// 環境）→ 靜默略過。
   */
  function removeHash() {
    var loc = root.location;
    var hist = root.history;
    if (!loc || !hist || typeof hist.replaceState !== "function") return;
    try {
      hist.replaceState(null, "", String(loc.pathname || "") + String(loc.search || ""));
    } catch (e) {
      /* 失敗靜默（SP-6） */
    }
  }

  /**
   * 檢查目前網址片段（只由 start 與 hashchange 呼叫）：
   * （v0.19）恰為 sources → 開啟資料來源頁並移除片段，首次模式也可（SP-6）；
   * （v0.5）屬隱藏頁 → 一般模式顯示主控台，首次模式不動作；其他片段不動作。後兩者不改網址。
   * @returns {boolean} 是否因片段而切頁
   */
  function checkHash() {
    var loc = root.location;
    var tab = normalizeHash(loc && typeof loc.hash === "string" ? loc.hash : "");
    if (tab === SOURCES_HASH) {
      if (!go(SOURCES_HASH, { resetReturn: true })) return false;
      removeHash();
      return true;
    }
    if (!tab || !isHiddenTab(tab) || isFirstRun()) return false;
    go(DEFAULT_TAB);
    return true;
  }

  /** 綁定 window 的 hashchange（不存在 addEventListener 的環境略過） */
  function bindHashChange() {
    if (typeof root.addEventListener !== "function") return;
    root.addEventListener("hashchange", function () {
      checkHash();
    });
  }

  /**
   * store 通知（v0.4，FE-32）：首次模式結束（"entry" tag 且 entryMode 為 main）→ 解除導覽隱藏並切到主控台。
   * @param {object} state AppState
   * @param {string[]} tags
   */
  function onStoreChange(state, tags) {
    if (!Array.isArray(tags) || tags.indexOf("entry") < 0) return;
    var rt = state && state.runtime;
    if (!rt || rt.entryMode !== "main") return;
    var b = body();
    if (b && b.dataset) b.dataset.entry = "main";
    go("dashboard");
  }

  /** 訂閱 store（只一次；store 不存在時略過） */
  function subscribeStore() {
    if (unsubscribeStore) return;
    var store = EMT.store;
    if (!store || typeof store.subscribe !== "function") return;
    try {
      unsubscribeStore = store.subscribe(onStoreChange) || function () {};
    } catch (e) {
      if (typeof console !== "undefined") console.error("[EMT.router] 訂閱 store 失敗", e);
    }
  }

  /**
   * 啟動路由：綁定事件並顯示起始頁。重複呼叫時等同 go。
   * @param {string} [tabId] 起始頁，預設 dashboard
   */
  function start(tabId) {
    if (!started) {
      started = true;
      bindEvents();
      bindHashChange();
    }
    subscribeStore();
    if (!go(isTabId(tabId) ? tabId : DEFAULT_TAB)) go(DEFAULT_TAB);
    // （v0.5）啟動時檢查一次網址片段（AC-20-04）
    checkHash();
  }

  EMT.views = EMT.views || {};
  EMT.views.register = register;

  EMT.router = {
    TAB_IDS: TAB_IDS.slice(),
    start: start,
    go: go,
    back: back,
    returnTarget: returnTarget,
    current: function () {
      return currentTab;
    },
    isTabId: isTabId,
    isHiddenTab: isHiddenTab,
    normalizeHash: normalizeHash,
    closeMenu: function () {
      setMenuOpen(false);
    }
  };
})(typeof self !== "undefined" ? self : this);
