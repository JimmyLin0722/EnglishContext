/*
 * EMT.core.pwa — PWA 契約常數與純函式（FE-45）
 * 依據：architecture.md v0.7 §4.7「EMT.core.pwa」、§7.18.1；契約 data-schema.ts §12、README §10.5 PE-1、
 *       §10.7 UP-3、UP-6、§10.8 IN-1、IN-2、§10.11 V-PWA-08
 * 涵蓋：AC-24-12、AC-34-01、AC-34-02、AC-34-07、AC-34-08、AC-36-03、AC-37-01、AC-37-02、AC-37-04
 *
 * - 11 個 PWA_* 常數與 data-schema.ts §12 逐值相同、鍵順序相同（PWA_MANIFEST 的鍵順序決定 manifest 輸出位元組，MF-3），
 *   全部深度凍結；PWA 常數的單一來源在本檔（core/constants.js 不重複定義）。
 * - 純函式：不碰 DOM、不呼叫任何瀏覽器 API；所需的環境物件一律由呼叫端以參數傳入。
 * - 本檔同時由 tools/build.mjs 以 createRequire 讀取（FE-47）：Node 下 module.exports 即同一個 api 物件，
 *   不得依賴 window、document。factory 無任何依賴（LD-1）。
 * - （v0.11，FE-77；architecture.md v0.11 §7.22.1、契約 v0.16 UP-6）PWA_TEXTS 只改 updateNotice、updateButton 兩個值，
 *   其餘鍵與深度凍結不變。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.EMT = root.EMT || {};
    root.EMT.core = root.EMT.core || {};
    root.EMT.core.pwa = api;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // 深層凍結：物件與其中所有子物件、陣列都不可再修改
  function deepFreeze(obj) {
    Object.getOwnPropertyNames(obj).forEach(function (name) {
      var value = obj[name];
      if (value && typeof value === "object") {
        deepFreeze(value);
      }
    });
    return Object.freeze(obj);
  }

  // ── data-schema.ts §12 常數（逐字複製，不得自行修改）──

  /** PWA 安裝名稱（manifest name／short_name、apple-mobile-web-app-title 共用；Q-42） */
  var PWA_APP_NAME = "EnglishContext";

  /** manifest theme_color 與 <meta name="theme-color"> 的值（v0.12 = COLOR_TOKENS.themeColor = --brand，VC-5、AC-34-04） */
  var PWA_THEME_COLOR = "#1e9bf0";

  /** manifest background_color（FE-103 = COLOR_TOKENS.background = --bg，DS-13、VC-5、AC-34-04、AC-68-01） */
  var PWA_BACKGROUND_COLOR = "#eaf7fb";

  /** manifest 內容；鍵順序即輸出順序（MF-1、MF-3） */
  var PWA_MANIFEST = {
    name: "EnglishContext",
    short_name: "EnglishContext",
    id: "./",
    start_url: "./",
    scope: "./",
    display: "standalone",
    lang: "zh-Hant-TW",
    theme_color: "#1e9bf0",
    background_color: "#eaf7fb",
    icons: [
      { src: "icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ]
  };

  /** 部署目錄檔案清單（恰 13 檔，DP-1；v0.14，FE-85：末 5 檔不進預先快取，DP-9） */
  var PWA_DEPLOY_FILES = [
    { path: "index.html", role: "page", mime: "text/html", precached: true, producedBy: "build" },
    { path: "manifest.webmanifest", role: "manifest", mime: "application/manifest+json", precached: true, producedBy: "build" },
    { path: "sw.js", role: "serviceWorker", mime: "text/javascript", precached: false, producedBy: "build" },
    { path: "icons/icon-192.png", role: "icon", mime: "image/png", precached: true, sizePx: 192, purpose: "any", producedBy: "copy" },
    { path: "icons/icon-512.png", role: "icon", mime: "image/png", precached: true, sizePx: 512, purpose: "any", producedBy: "copy" },
    { path: "icons/icon-maskable-512.png", role: "icon", mime: "image/png", precached: true, sizePx: 512, purpose: "maskable", producedBy: "copy" },
    { path: "icons/apple-touch-icon-180.png", role: "appleTouchIcon", mime: "image/png", precached: true, sizePx: 180, producedBy: "copy" },
    { path: "ads.txt", role: "adsTxt", mime: "text/plain", precached: false, producedBy: "copy" },
    { path: "robots.txt", role: "robots", mime: "text/plain", precached: false, producedBy: "build" },
    { path: "sitemap.xml", role: "sitemap", mime: "application/xml", precached: false, producedBy: "build" },
    { path: "about.html", role: "staticPage", mime: "text/html", precached: false, producedBy: "build" },
    { path: "contact.html", role: "staticPage", mime: "text/html", precached: false, producedBy: "build" },
    { path: "privacy.html", role: "staticPage", mime: "text/html", precached: false, producedBy: "build" }
  ];

  /** 預先快取清單（恰 7 項；相對於 sw.js 的網址，SW-6） */
  var PWA_PRECACHE_URLS = [
    "./",
    "./index.html",
    "./manifest.webmanifest",
    "./icons/icon-192.png",
    "./icons/icon-512.png",
    "./icons/icon-maskable-512.png",
    "./icons/apple-touch-icon-180.png"
  ];

  /** 本專案快取名稱前綴（SW-9） */
  var PWA_CACHE_PREFIX = "english-master-track-pwa-";

  /** BUILD_ID 格式：16 個小寫十六進位字元（SW-2） */
  var PWA_BUILD_ID_PATTERN = "^[0-9a-f]{16}$";

  /** HTML 中記錄建置識別碼的 meta name（SW-2、HD-1） */
  var PWA_BUILD_ID_META_NAME = "emt-build-id";

  /** 回到前景時重新檢查更新的間隔（毫秒，1 小時；UP-3） */
  var PWA_UPDATE_RECHECK_MS = 3600000;

  /** PWA 相關畫面文字（逐字使用；v0.16 契約 UP-6：更新提示改為「請更新版本」，逗號為全形 U+FF0C，行為不變） */
  var PWA_TEXTS = {
    installButton: "安裝 App",
    updateNotice: "有新版本，請更新版本",
    updateButton: "更新版本",
    backupOriginNotice: "學習紀錄只存在目前的瀏覽器與網址；檔案版、網頁版、主畫面 App 彼此不互通，可用匯出備份／匯入轉移"
  };

  /** PwaRuntimeState 的 7 個鍵（契約介面順序） */
  var PWA_STATE_KEYS = [
    "eligible",
    "standalone",
    "installPromptAvailable",
    "installSuppressed",
    "updateAvailable",
    "reloadRequested",
    "lastUpdateCheckAt"
  ];

  // ── 純函式 ──

  /**
   * PwaRuntimeState 初始值（每次回傳新物件；6 個布林 false、lastUpdateCheckAt null）。
   * @returns {{eligible: boolean, standalone: boolean, installPromptAvailable: boolean,
   *            installSuppressed: boolean, updateAvailable: boolean, reloadRequested: boolean,
   *            lastUpdateCheckAt: (number|null)}}
   */
  function initialPwaState() {
    return {
      eligible: false,
      standalone: false,
      installPromptAvailable: false,
      installSuppressed: false,
      updateAvailable: false,
      reloadRequested: false,
      lastUpdateCheckAt: null
    };
  }

  /**
   * PE-1 判定式。依序檢查，前一步不成立即回 false、不再讀取後面的屬性：
   * (1) protocol 為 "https:"，或 "http:" 且 hostname 為 localhost／127.0.0.1（不成立時連 env.navigator 都不讀）；
   * (2) isSecureContext === true；
   * (3) "serviceWorker" in navigator 且值不是 null／undefined。
   * 整段 try，任何例外 → false。
   * @param {{location: object, isSecureContext: boolean, navigator: object}} env
   * @returns {boolean}
   */
  function isEligible(env) {
    try {
      if (!env) { return false; }
      var loc = env.location;
      if (!loc) { return false; }
      var protocol = loc.protocol;
      if (protocol === "http:") {
        var host = loc.hostname;
        if (host !== "localhost" && host !== "127.0.0.1") { return false; }
      } else if (protocol !== "https:") {
        return false;
      }
      if (env.isSecureContext !== true) { return false; }
      var nav = env.navigator;
      if (!nav || (typeof nav !== "object" && typeof nav !== "function")) { return false; }
      if (!("serviceWorker" in nav)) { return false; }
      var sw = nav.serviceWorker;
      return sw !== null && sw !== undefined;
    } catch (e) {
      return false;
    }
  }

  /**
   * IN-2 standalone 判定：matchMedia("(display-mode: standalone)").matches === true，
   * 或 navigator.standalone === true（iOS）。matchMedia 不是函式或拋例外 → 只看 navigator.standalone；全部例外 → false。
   * 注意：呼叫端傳入的 matchMedia 須已綁定 window（瀏覽器中未綁定呼叫會拋例外）。
   * @param {{matchMedia: function, navigator: object}} env
   * @returns {boolean}
   */
  function isStandalone(env) {
    try {
      if (!env) { return false; }
      var byMedia = false;
      try {
        if (typeof env.matchMedia === "function") {
          var mq = env.matchMedia("(display-mode: standalone)");
          byMedia = !!mq && mq.matches === true;
        }
      } catch (e) {
        byMedia = false;
      }
      if (byMedia) { return true; }
      var nav = env.navigator;
      return !!nav && nav.standalone === true;
    } catch (e) {
      return false;
    }
  }

  /** 取得 state.runtime.pwa；結構不符時回 null */
  function pwaOf(state) {
    var rt = state && state.runtime;
    var p = rt && rt.pwa;
    return p && typeof p === "object" ? p : null;
  }

  /**
   * IN-1「安裝 App」按鈕是否顯示（推導值，不另存）。
   * （v0.12，FE-58；IN-1 v0.12、AC-34-07）另需主控台「資料備份」區塊已展開（runtime.dashboard.backupExpanded === true）。
   * @param {{runtime: {pwa: object, entryMode: string, currentTab: string, dashboard: {backupExpanded: boolean}}}} state
   * @returns {boolean}
   */
  function installVisible(state) {
    var p = pwaOf(state);
    if (!p) { return false; }
    var db = state.runtime.dashboard;
    return p.eligible === true && p.standalone !== true && p.installPromptAvailable === true &&
      p.installSuppressed !== true && state.runtime.entryMode === "main" &&
      state.runtime.currentTab === "dashboard" &&
      !!db && db.backupExpanded === true;
  }

  /**
   * UP-6 新版提示是否顯示：eligible && updateAvailable（任何 entryMode、任何頁面）。
   * @param {{runtime: {pwa: object}}} state
   * @returns {boolean}
   */
  function updateVisible(state) {
    var p = pwaOf(state);
    if (!p) { return false; }
    return p.eligible === true && p.updateAvailable === true;
  }

  /**
   * UP-3：距上次更新檢查是否已達 PWA_UPDATE_RECHECK_MS。lastMs 不是有限數（含 null）→ false。
   * @param {number} nowMs performance.now()
   * @param {number|null} lastMs
   * @returns {boolean}
   */
  function needsRecheck(nowMs, lastMs) {
    if (typeof lastMs !== "number" || !isFinite(lastMs)) { return false; }
    if (typeof nowMs !== "number" || !isFinite(nowMs)) { return false; }
    return nowMs - lastMs >= PWA_UPDATE_RECHECK_MS;
  }

  return deepFreeze({
    PWA_APP_NAME: PWA_APP_NAME,
    PWA_THEME_COLOR: PWA_THEME_COLOR,
    PWA_BACKGROUND_COLOR: PWA_BACKGROUND_COLOR,
    PWA_MANIFEST: PWA_MANIFEST,
    PWA_DEPLOY_FILES: PWA_DEPLOY_FILES,
    PWA_PRECACHE_URLS: PWA_PRECACHE_URLS,
    PWA_CACHE_PREFIX: PWA_CACHE_PREFIX,
    PWA_BUILD_ID_PATTERN: PWA_BUILD_ID_PATTERN,
    PWA_BUILD_ID_META_NAME: PWA_BUILD_ID_META_NAME,
    PWA_UPDATE_RECHECK_MS: PWA_UPDATE_RECHECK_MS,
    PWA_TEXTS: PWA_TEXTS,
    PWA_STATE_KEYS: PWA_STATE_KEYS,
    initialPwaState: initialPwaState,
    isEligible: isEligible,
    isStandalone: isStandalone,
    installVisible: installVisible,
    updateVisible: updateVisible,
    needsRecheck: needsRecheck
  });
});
