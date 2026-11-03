/*
 * services/pwa.js — PWA 頁面端服務（FE-48）
 * 依據：architecture.md v0.7 §4.7「EMT.services.pwa」、§7.18.4～§7.18.6、§7.18.8；
 *       契約 README §10.4 HD-2、§10.5 PE-1～PE-4、§10.6 SW-1、§10.7 UP-1～UP-9、§10.8 IN-2～IN-8、§10.10 PV-1、PV-2、PV-7、
 *       FB-40、FB-42
 * 涵蓋：AC-21-01、AC-21-03、AC-34-01、AC-34-02、AC-34-05～AC-34-10、AC-35-01、AC-35-04、AC-35-05、
 *       AC-36-03、AC-36-04、AC-36-06、AC-37-01～AC-37-06
 *
 * 提供 EMT.services.pwa：
 * - start({ onChange }) → { eligible, standalone }：只執行一次（再次呼叫回傳第一次的結果、不重複綁定）。
 *     以 EMT.core.pwa.isEligible 判定 PE-1；false → 立即回傳、不做任何其他事（PE-2：不碰 service worker、
 *     不加連結、不監聽安裝事件）。true → 判定 standalone、同步 onChange({ eligible: true, standalone })、
 *     在 head 末端加入 manifest 與 apple-touch-icon 兩個相對路徑連結（HD-2）、綁定安裝事件、
 *     於 window 的 load 之後（已 complete 則下一輪）註冊 ./sw.js（SW-1、PE-4）。
 * - requestInstall() → Promise<void>（永不 reject）：IN-5；先清空閉包事件並 onChange 隱藏按鈕，再呼叫一次 prompt()。
 * - requestReload()：UP-4；已要求過則不做事；有 waiting worker 時只送 { type: "SKIP_WAITING" }，否則直接重新載入。
 * - create(globalObject)：以指定的全域物件建立獨立實例（Node 測試注入替身，比照 services/mic.js）。
 *
 * 規則：
 * - 安裝事件、registration、worker 只存在實例閉包（PV-7），不進入 AppState；狀態只經 onChange 回報（store.setPwa）。
 * - 所有 Promise 錯誤靜默、不以主控台輸出錯誤或警告（PE-3）；onChange 例外一律攔下。
 * - 不讀寫任何瀏覽器儲存、不發出任何網路請求（註冊 ./sw.js 由瀏覽器取得）；對 worker 只送 SKIP_WAITING（PV-1、PV-2）。
 * - 載入時只建立預設實例的區域變數，不呼叫任何瀏覽器 API、不讀取其他模組（LD-2）。
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.EMT = root.EMT || {};
    root.EMT.services = root.EMT.services || {};
    root.EMT.services.pwa = api;
  }
})(typeof self !== "undefined" ? self : this, function (defaultGlobal) {
  "use strict";

  /** SW-1 註冊參數 */
  var SW_URL = "./sw.js";
  var SW_SCOPE = "./";

  /** HD-2 動態連結（相對路徑，DP-3） */
  var HEAD_LINKS = [
    { rel: "manifest", href: "manifest.webmanifest" },
    { rel: "apple-touch-icon", href: "icons/apple-touch-icon-180.png", sizes: "180x180" }
  ];

  function noop() {}

  /** 吞掉可能回傳 Promise 的呼叫結果中的例外（PE-3） */
  function swallow(result) {
    try {
      if (result && typeof result.then === "function") { result.then(null, noop); }
    } catch (e) {
      /* 忽略 */
    }
  }

  /**
   * 以指定全域物件建立實例。
   * @param {object} g 全域物件（瀏覽器為 self／window）
   */
  function create(g) {
    var started = null;       // 第一次 start 的結果 { eligible, standalone }
    var onChange = null;
    var eligible = false;
    var standalone = false;
    var registerScheduled = false;
    var registration = null;  // ServiceWorkerRegistration（只在閉包，PV-7）
    var deferredPrompt = null; // BeforeInstallPromptEvent（只在閉包，PV-7）
    var installSuppressed = false;
    var updateAvailable = false;
    var reloadRequested = false;
    var reloaded = false;
    var lastCheck = null;

    /** 取得 core/pwa（LD-1：於呼叫時取用）。不存在時視為組裝錯誤（LD-3）。 */
    function core() {
      var m = null;
      if (typeof require === "function" && typeof module === "object") {
        m = require("../core/pwa.js");
      } else {
        m = g && g.EMT && g.EMT.core && g.EMT.core.pwa;
      }
      if (!m) { throw new Error("EMT.core.pwa 未載入（services/pwa.js）"); }
      return m;
    }

    /** 回報狀態變更；回呼例外攔下（不輸出主控台） */
    function emit(patch) {
      if (typeof onChange !== "function") { return; }
      try {
        onChange(patch);
      } catch (e) {
        /* 忽略（PE-3） */
      }
    }

    /** 目前時間（performance.now()）；不可用時回 null（之後不做 UP-3 重新檢查） */
    function now() {
      try {
        var t = g.performance.now();
        return typeof t === "number" && isFinite(t) ? t : null;
      } catch (e) {
        return null;
      }
    }

    /** service worker 容器（只在 eligible 後才會被呼叫） */
    function container() {
      try {
        return g.navigator.serviceWorker || null;
      } catch (e) {
        return null;
      }
    }

    /** 目前頁面是否已由某個 service worker 控制 */
    function hasController() {
      var c = container();
      try {
        return !!(c && c.controller);
      } catch (e) {
        return false;
      }
    }

    /** 安全綁定事件 */
    function listen(target, type, fn, opts) {
      try {
        if (target && typeof target.addEventListener === "function") {
          if (opts) { target.addEventListener(type, fn, opts); } else { target.addEventListener(type, fn); }
          return true;
        }
      } catch (e) {
        /* 忽略 */
      }
      return false;
    }

    // ── HD-2：head 動態連結 ──

    function addHeadLinks() {
      try {
        var doc = g.document;
        var head = doc && (doc.head || (doc.getElementsByTagName && doc.getElementsByTagName("head")[0]));
        if (!head) { return; }
        HEAD_LINKS.forEach(function (spec) {
          try {
            if (typeof head.querySelector === "function" && head.querySelector('link[rel="' + spec.rel + '"]')) { return; }
            var el = doc.createElement("link");
            el.setAttribute("rel", spec.rel);
            if (spec.sizes) { el.setAttribute("sizes", spec.sizes); }
            el.setAttribute("href", spec.href);
            head.appendChild(el);
          } catch (e) {
            /* 忽略 */
          }
        });
      } catch (e) {
        /* 忽略 */
      }
    }

    // ── 安裝按鈕（IN-3～IN-6）──

    function onBeforeInstallPrompt(e) {
      if (installSuppressed || standalone) { return; }
      // 替身或不支援的事件：沒有 prompt 函式 → 忽略（FB-42）
      if (!e || typeof e.prompt !== "function") { return; }
      try {
        if (typeof e.preventDefault === "function") { e.preventDefault(); }
      } catch (x) {
        /* 忽略 */
      }
      deferredPrompt = e;
      emit({ installPromptAvailable: true });
    }

    function onAppInstalled() {
      deferredPrompt = null;
      installSuppressed = true;
      emit({ installPromptAvailable: false, installSuppressed: true });
    }

    /**
     * IN-5：按下「安裝 App」。閉包無事件 → 不做事（防連點）；有事件 → 先取出並清空、隱藏按鈕，再呼叫一次 prompt()，
     * 等待 userChoice；錯誤一律靜默。
     * @returns {Promise<void>} 永不 reject
     */
    function requestInstall() {
      var e = deferredPrompt;
      if (!e) { return Promise.resolve(); }
      deferredPrompt = null;
      installSuppressed = true;
      emit({ installPromptAvailable: false, installSuppressed: true });
      return new Promise(function (resolve) {
        function done() { resolve(); }
        var r;
        try {
          r = e.prompt();
        } catch (x) {
          done();
          return;
        }
        Promise.resolve(r).then(function () { return e.userChoice; }).then(done, done);
      });
    }

    // ── 更新流程（UP-2～UP-5）──

    function markUpdate() {
      if (updateAvailable) { return; }
      updateAvailable = true;
      emit({ updateAvailable: true });
    }

    function onUpdateFound() {
      var w = null;
      try {
        w = registration && registration.installing;
      } catch (e) {
        w = null;
      }
      if (!w) { return; }
      listen(w, "statechange", function () {
        var state = null;
        try { state = w.state; } catch (e) { state = null; }
        // 首次安裝（沒有 controller）不提示（UP-2）
        if (state === "installed" && hasController()) { markUpdate(); }
      });
    }

    function doReload() {
      if (reloaded) { return; }
      reloaded = true;
      try {
        g.location.reload();
      } catch (e) {
        /* 忽略 */
      }
    }

    function onControllerChange() {
      // 只有使用者按過「重新整理」才重新載入，且至多 1 次（UP-5）
      if (reloadRequested && !reloaded) { doReload(); }
    }

    function onVisibilityChange() {
      try {
        if (!registration || g.document.visibilityState !== "visible") { return; }
        var t = now();
        if (t === null || !core().needsRecheck(t, lastCheck)) { return; }
        lastCheck = t;
        emit({ lastUpdateCheckAt: t });
        swallow(registration.update());
      } catch (e) {
        /* 忽略（PE-3） */
      }
    }

    function onRegistered(reg) {
      if (!reg) { return; }
      registration = reg;
      lastCheck = now();
      var patch = { lastUpdateCheckAt: lastCheck };
      var waiting = null;
      try { waiting = reg.waiting; } catch (e) { waiting = null; }
      if (waiting && hasController()) {
        updateAvailable = true;
        patch.updateAvailable = true;
      }
      emit(patch);
      listen(reg, "updatefound", onUpdateFound);
      listen(container(), "controllerchange", onControllerChange);
      listen(g.document, "visibilitychange", onVisibilityChange);
    }

    /** SW-1 註冊；失敗靜默（PE-3），不呼叫 onChange */
    function register() {
      try {
        var c = container();
        if (!c || typeof c.register !== "function") { return; }
        var p = c.register(SW_URL, { scope: SW_SCOPE, updateViaCache: "none" });
        Promise.resolve(p).then(onRegistered).then(null, noop);
      } catch (e) {
        /* 忽略 */
      }
    }

    /** 在 load 之後註冊（PE-4）；只排程一次 */
    function scheduleRegister() {
      if (registerScheduled) { return; }
      registerScheduled = true;
      var ready = null;
      try { ready = g.document.readyState; } catch (e) { ready = null; }
      if (ready === "complete") {
        try {
          (typeof g.setTimeout === "function" ? g.setTimeout : setTimeout).call(g, register, 0);
        } catch (e) {
          /* 忽略 */
        }
      } else {
        listen(g, "load", register, { once: true });
      }
    }

    /**
     * UP-4：按「重新整理」。
     */
    function requestReload() {
      if (!eligible || reloadRequested) { return; }
      reloadRequested = true;
      emit({ reloadRequested: true });
      var w = null;
      try { w = registration && registration.waiting; } catch (e) { w = null; }
      if (w) {
        try {
          w.postMessage({ type: "SKIP_WAITING" });
        } catch (e) {
          /* 忽略 */
        }
      } else {
        // 已被其他分頁啟用（無 waiting）→ 直接重新載入
        doReload();
      }
    }

    /**
     * 啟動（只執行一次）。
     * @param {{onChange?: function(object): void}} [opts]
     * @returns {{eligible: boolean, standalone: boolean}}
     */
    function start(opts) {
      if (started) { return { eligible: started.eligible, standalone: started.standalone }; }
      var pwa = core();
      onChange = opts && typeof opts.onChange === "function" ? opts.onChange : null;

      // PE-1：以 getter 延後讀取，第 (1) 步不成立時不觸及 navigator
      var env = {
        get location() { return g.location; },
        get isSecureContext() { return g.isSecureContext; },
        get navigator() { return g.navigator; }
      };
      eligible = pwa.isEligible(env) === true;
      if (!eligible) {
        started = { eligible: false, standalone: false };
        return { eligible: false, standalone: false };
      }

      standalone = pwa.isStandalone({
        matchMedia: function (q) { return g.matchMedia(q); },
        get navigator() { return g.navigator; }
      }) === true;
      started = { eligible: true, standalone: standalone };

      emit({ eligible: true, standalone: standalone });
      addHeadLinks();
      listen(g, "beforeinstallprompt", onBeforeInstallPrompt);
      listen(g, "appinstalled", onAppInstalled);
      scheduleRegister();
      return { eligible: true, standalone: standalone };
    }

    return {
      start: start,
      requestInstall: requestInstall,
      requestReload: requestReload
    };
  }

  // 預設實例：建立時只設定區域變數，不呼叫任何瀏覽器 API（LD-2）
  var instance = create(defaultGlobal);

  return {
    start: instance.start,
    requestInstall: instance.requestInstall,
    requestReload: instance.requestReload,
    create: create
  };
});
