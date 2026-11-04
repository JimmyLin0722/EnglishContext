/*
 * pwa-core.test.js — PWA 契約常數與純函式單元測試（FE-45）
 * 受測：core/pwa.js
 * 依據：architecture.md v0.7 §4.7「EMT.core.pwa」、§10.4「pwa-core.test.js」列；契約 data-schema.ts §12、README §10.5、§10.7、§10.8、§10.11
 * 涵蓋：V-PWA-08、IN-1、IN-2、UP-3、UP-6；AC-34-01、AC-34-02、AC-34-07、AC-34-08、AC-36-03、AC-37-01、AC-37-02、AC-37-04、AC-24-12
 * （v0.11，FE-77）PWA_TEXTS 文字依 data-schema.ts v0.16 更新（architecture.md v0.11 §7.22.1、§10.8）。
 * 常數期望值由 data-schema.ts §12 原文逐字複製（測試不讀 docs/）。
 */
"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");

const pwa = require("../core/pwa.js");

// ── 契約原文（data-schema.ts §12，逐字複製）──

const EXPECTED = {
  PWA_APP_NAME: "EnglishContext",
  PWA_THEME_COLOR: "#1e9bf0",
  PWA_BACKGROUND_COLOR: "#eef4fa",
  PWA_MANIFEST: {
    name: "EnglishContext",
    short_name: "EnglishContext",
    id: "./",
    start_url: "./",
    scope: "./",
    display: "standalone",
    lang: "zh-Hant-TW",
    theme_color: "#1e9bf0",
    background_color: "#eef4fa",
    icons: [
      { src: "icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  },
  PWA_DEPLOY_FILES: [
    { path: "index.html", role: "page", mime: "text/html", precached: true, producedBy: "build" },
    { path: "manifest.webmanifest", role: "manifest", mime: "application/manifest+json", precached: true, producedBy: "build" },
    { path: "sw.js", role: "serviceWorker", mime: "text/javascript", precached: false, producedBy: "build" },
    { path: "icons/icon-192.png", role: "icon", mime: "image/png", precached: true, sizePx: 192, purpose: "any", producedBy: "copy" },
    { path: "icons/icon-512.png", role: "icon", mime: "image/png", precached: true, sizePx: 512, purpose: "any", producedBy: "copy" },
    { path: "icons/icon-maskable-512.png", role: "icon", mime: "image/png", precached: true, sizePx: 512, purpose: "maskable", producedBy: "copy" },
    { path: "icons/apple-touch-icon-180.png", role: "appleTouchIcon", mime: "image/png", precached: true, sizePx: 180, producedBy: "copy" },
    { path: "ads.txt", role: "adsTxt", mime: "text/plain", precached: false, producedBy: "copy" },
  ],
  PWA_PRECACHE_URLS: [
    "./",
    "./index.html",
    "./manifest.webmanifest",
    "./icons/icon-192.png",
    "./icons/icon-512.png",
    "./icons/icon-maskable-512.png",
    "./icons/apple-touch-icon-180.png",
  ],
  PWA_CACHE_PREFIX: "english-master-track-pwa-",
  PWA_BUILD_ID_PATTERN: "^[0-9a-f]{16}$",
  PWA_BUILD_ID_META_NAME: "emt-build-id",
  PWA_UPDATE_RECHECK_MS: 3_600_000,
  PWA_TEXTS: {
    installButton: "安裝 App",
    // （v0.16 契約 UP-6，FE-77）新文字；逗號為全形 U+FF0C
    updateNotice: "有新版本，請更新版本",
    updateButton: "更新版本",
    backupOriginNotice: "學習紀錄只存在目前的瀏覽器與網址；檔案版、網頁版、主畫面 App 彼此不互通，可用匯出備份／匯入轉移",
  },
};

/** 遞迴確認物件與所有子物件皆凍結 */
function assertDeepFrozen(v, where) {
  if (!v || typeof v !== "object") return;
  assert.ok(Object.isFrozen(v), `${where} 應凍結`);
  for (const k of Object.keys(v)) assertDeepFrozen(v[k], `${where}.${k}`);
}

describe("契約常數（data-schema.ts §12）", () => {
  test("11 個常數逐值相同", () => {
    assert.equal(Object.keys(EXPECTED).length, 11);
    for (const [k, v] of Object.entries(EXPECTED)) {
      assert.deepStrictEqual(pwa[k], v, k);
    }
  });

  test("PWA_MANIFEST 鍵順序與契約相同、鍵恰 10 個；icons 每筆鍵順序相同", () => {
    assert.deepStrictEqual(Object.keys(pwa.PWA_MANIFEST), Object.keys(EXPECTED.PWA_MANIFEST));
    assert.equal(Object.keys(pwa.PWA_MANIFEST).length, 10);
    pwa.PWA_MANIFEST.icons.forEach((icon, i) => {
      assert.deepStrictEqual(Object.keys(icon), Object.keys(EXPECTED.PWA_MANIFEST.icons[i]));
    });
    // 輸出位元組由鍵順序決定（MF-3）
    assert.equal(JSON.stringify(pwa.PWA_MANIFEST), JSON.stringify(EXPECTED.PWA_MANIFEST));
  });

  test("PWA_DEPLOY_FILES 恰 8 檔、PWA_PRECACHE_URLS 恰 7 項；precached 與清單一致", () => {
    assert.equal(pwa.PWA_DEPLOY_FILES.length, 8);
    assert.equal(pwa.PWA_PRECACHE_URLS.length, 7);
    const precachedPaths = pwa.PWA_DEPLOY_FILES.filter((f) => f.precached).map((f) => "./" + f.path);
    for (const p of precachedPaths) {
      assert.ok(pwa.PWA_PRECACHE_URLS.includes(p), p);
    }
    assert.ok(pwa.PWA_PRECACHE_URLS.includes("./"));
  });

  test("常數全部深度凍結（含 PWA_STATE_KEYS 與 api 物件本身）", () => {
    assert.ok(Object.isFrozen(pwa));
    for (const k of [...Object.keys(EXPECTED), "PWA_STATE_KEYS"]) assertDeepFrozen(pwa[k], k);
    assert.throws(() => { "use strict"; pwa.PWA_MANIFEST.icons[0].src = "x"; }, TypeError);
    assert.throws(() => { "use strict"; pwa.PWA_PRECACHE_URLS.push("./x"); }, TypeError);
  });

  test("PWA_BUILD_ID_PATTERN 可編譯並只接受 16 個小寫十六進位", () => {
    const re = new RegExp(pwa.PWA_BUILD_ID_PATTERN);
    assert.ok(re.test("0123456789abcdef"));
    assert.ok(!re.test("0123456789ABCDEF"));
    assert.ok(!re.test("0123456789abcde"));
    assert.ok(!re.test("0123456789abcdef0"));
  });
});

describe("PWA_STATE_KEYS、initialPwaState", () => {
  test("7 個鍵；初始值 6 個布林 false、lastUpdateCheckAt null", () => {
    assert.deepStrictEqual([...pwa.PWA_STATE_KEYS], [
      "eligible", "standalone", "installPromptAvailable", "installSuppressed",
      "updateAvailable", "reloadRequested", "lastUpdateCheckAt",
    ]);
    const s = pwa.initialPwaState();
    assert.deepStrictEqual(Object.keys(s), [...pwa.PWA_STATE_KEYS]);
    assert.deepStrictEqual(s, {
      eligible: false, standalone: false, installPromptAvailable: false, installSuppressed: false,
      updateAvailable: false, reloadRequested: false, lastUpdateCheckAt: null,
    });
  });

  test("每次回傳新物件（修改不影響下一次）", () => {
    const a = pwa.initialPwaState();
    const b = pwa.initialPwaState();
    assert.notEqual(a, b);
    a.eligible = true;
    assert.equal(pwa.initialPwaState().eligible, false);
  });
});

// ── V-PWA-08 判定表 ──

/**
 * 建立 PE-1 的 env，記錄 navigator 與 navigator.serviceWorker 的讀取次數。
 * @param {string} href
 * @param {{secure?: boolean, sw?: "ok"|"missing"|"null"|"throws", navThrows?: boolean}} [o]
 */
function envOf(href, o = {}) {
  const u = new URL(href);
  const counter = { nav: 0, sw: 0 };
  const nav = {};
  if (o.sw === "throws") {
    Object.defineProperty(nav, "serviceWorker", { enumerable: true, get() { counter.sw++; throw new Error("SecurityError"); } });
  } else if (o.sw === "null") {
    Object.defineProperty(nav, "serviceWorker", { enumerable: true, get() { counter.sw++; return null; } });
  } else if (o.sw !== "missing") {
    Object.defineProperty(nav, "serviceWorker", { enumerable: true, get() { counter.sw++; return { register() {} }; } });
  }
  const env = {
    location: { protocol: u.protocol, hostname: u.hostname, href },
    isSecureContext: o.secure !== undefined ? o.secure : u.protocol === "https:" || u.hostname === "localhost" || u.hostname === "127.0.0.1",
  };
  Object.defineProperty(env, "navigator", {
    enumerable: true,
    get() {
      counter.nav++;
      if (o.navThrows) throw new Error("nav");
      return nav;
    },
  });
  return { env, counter };
}

describe("isEligible（PE-1、V-PWA-08）", () => {
  test("file:///… → false，且 navigator getter 讀取 0 次", () => {
    const { env, counter } = envOf("file:///C:/x/english-master-track.html", { secure: true });
    assert.equal(pwa.isEligible(env), false);
    assert.equal(counter.nav, 0);
    assert.equal(counter.sw, 0);
  });

  test("https://x.github.io/p/ 且有 serviceWorker → true", () => {
    const { env } = envOf("https://x.github.io/p/");
    assert.equal(pwa.isEligible(env), true);
  });

  test("http://localhost:8080/ → true；http://127.0.0.1/ → true", () => {
    assert.equal(pwa.isEligible(envOf("http://localhost:8080/").env), true);
    assert.equal(pwa.isEligible(envOf("http://127.0.0.1/").env), true);
  });

  test("http://192.168.0.2/ → false，且 navigator getter 讀取 0 次", () => {
    const { env, counter } = envOf("http://192.168.0.2/", { secure: true });
    assert.equal(pwa.isEligible(env), false);
    assert.equal(counter.nav, 0);
  });

  test("https 但 navigator.serviceWorker 不存在 → false；值為 null → false", () => {
    assert.equal(pwa.isEligible(envOf("https://x.github.io/p/", { sw: "missing" }).env), false);
    assert.equal(pwa.isEligible(envOf("https://x.github.io/p/", { sw: "null" }).env), false);
  });

  test("存取 navigator.serviceWorker 拋例外 → false；navigator 本身拋例外 → false", () => {
    assert.equal(pwa.isEligible(envOf("https://x.github.io/p/", { sw: "throws" }).env), false);
    assert.equal(pwa.isEligible(envOf("https://x.github.io/p/", { navThrows: true }).env), false);
  });

  test("isSecureContext 不為 true → false 且不讀 navigator", () => {
    const { env, counter } = envOf("https://x.github.io/p/", { secure: false });
    assert.equal(pwa.isEligible(env), false);
    assert.equal(counter.nav, 0);
  });

  test("about:、blob:、data: → false；env／location 缺漏或 getter 拋例外 → false", () => {
    for (const href of ["about:blank", "blob:https://x.github.io/1", "data:text/html,1"]) {
      const { env, counter } = envOf(href, { secure: true });
      assert.equal(pwa.isEligible(env), false, href);
      assert.equal(counter.nav, 0, href);
    }
    assert.equal(pwa.isEligible(undefined), false);
    assert.equal(pwa.isEligible({}), false);
    const bad = {};
    Object.defineProperty(bad, "location", { get() { throw new Error("x"); } });
    assert.equal(pwa.isEligible(bad), false);
  });
});

describe("isStandalone（IN-2）", () => {
  const mm = (matches) => (q) => ({ media: q, matches });

  test("matchMedia 為真 → true", () => {
    assert.equal(pwa.isStandalone({ matchMedia: mm(true), navigator: {} }), true);
  });

  test("navigator.standalone === true（iOS）→ true", () => {
    assert.equal(pwa.isStandalone({ matchMedia: mm(false), navigator: { standalone: true } }), true);
  });

  test("皆假 → false；standalone 為字串 \"true\" → false", () => {
    assert.equal(pwa.isStandalone({ matchMedia: mm(false), navigator: {} }), false);
    assert.equal(pwa.isStandalone({ matchMedia: mm(false), navigator: { standalone: "true" } }), false);
  });

  test("matchMedia 拋例外 → 只看 navigator.standalone；全部例外 → false", () => {
    const boom = () => { throw new Error("x"); };
    assert.equal(pwa.isStandalone({ matchMedia: boom, navigator: { standalone: true } }), true);
    assert.equal(pwa.isStandalone({ matchMedia: boom, navigator: {} }), false);
    const env = { matchMedia: boom };
    Object.defineProperty(env, "navigator", { get() { throw new Error("y"); } });
    assert.equal(pwa.isStandalone(env), false);
    assert.equal(pwa.isStandalone({ matchMedia: "x", navigator: null }), false);
    assert.equal(pwa.isStandalone(null), false);
  });
});

// ── IN-1、UP-6、UP-3 ──

function stateOf(pwaPatch = {}, rt = {}) {
  return {
    data: {},
    runtime: Object.assign(
      { entryMode: "main", currentTab: "dashboard", dashboard: { backupExpanded: true } },
      rt,
      {
        pwa: Object.assign(pwa.initialPwaState(), {
          eligible: true, standalone: false, installPromptAvailable: true, installSuppressed: false,
        }, pwaPatch),
      }
    ),
  };
}

describe("installVisible（IN-1；v0.12 加 backupExpanded）", () => {
  test("7 個條件全成立 → true", () => {
    assert.equal(pwa.installVisible(stateOf()), true);
  });

  test("（v0.12，FE-58）「資料備份」收合（backupExpanded false）或 runtime.dashboard 缺漏 → false（AC-34-07、AC-24-12）", () => {
    assert.equal(pwa.installVisible(stateOf({}, { dashboard: { backupExpanded: false } })), false);
    assert.equal(pwa.installVisible(stateOf({}, { dashboard: undefined })), false);
    assert.equal(pwa.installVisible(stateOf({}, { dashboard: null })), false);
    assert.equal(pwa.installVisible(stateOf({}, { dashboard: { backupExpanded: "true" } })), false);
    assert.equal(pwa.installVisible(stateOf({}, { dashboard: { backupExpanded: true } })), true);
  });

  test("6 個條件逐一不成立皆 false", () => {
    assert.equal(pwa.installVisible(stateOf({ eligible: false })), false);
    assert.equal(pwa.installVisible(stateOf({ standalone: true })), false);
    assert.equal(pwa.installVisible(stateOf({ installPromptAvailable: false })), false);
    assert.equal(pwa.installVisible(stateOf({ installSuppressed: true })), false);
    assert.equal(pwa.installVisible(stateOf({}, { entryMode: "firstRun" })), false);
    for (const tab of ["customizer", "flashcards", "part5", "sources"]) {
      assert.equal(pwa.installVisible(stateOf({}, { currentTab: tab })), false, tab);
    }
  });

  test("結構不完整 → false", () => {
    assert.equal(pwa.installVisible(null), false);
    assert.equal(pwa.installVisible({ runtime: {} }), false);
    assert.equal(pwa.installVisible({}), false);
  });
});

describe("updateVisible（UP-6）", () => {
  test("eligible && updateAvailable → true；任一不成立 → false；不看 entryMode／currentTab", () => {
    assert.equal(pwa.updateVisible(stateOf({ updateAvailable: true })), true);
    assert.equal(pwa.updateVisible(stateOf({ updateAvailable: true }, { entryMode: "firstRun", currentTab: "customizer" })), true);
    assert.equal(pwa.updateVisible(stateOf({ updateAvailable: false })), false);
    assert.equal(pwa.updateVisible(stateOf({ updateAvailable: true, eligible: false })), false);
    assert.equal(pwa.updateVisible(null), false);
  });
});

describe("needsRecheck（UP-3）", () => {
  test("lastMs null → false；差 3,599,999 → false；差 3,600,000 → true", () => {
    assert.equal(pwa.needsRecheck(5_000_000, null), false);
    assert.equal(pwa.needsRecheck(3_599_999 + 100, 100), false);
    assert.equal(pwa.needsRecheck(3_600_000 + 100, 100), true);
    assert.equal(pwa.needsRecheck(3_600_000, 0), true);
  });

  test("非有限數 → false", () => {
    assert.equal(pwa.needsRecheck(5_000_000, NaN), false);
    assert.equal(pwa.needsRecheck(5_000_000, undefined), false);
    assert.equal(pwa.needsRecheck(NaN, 0), false);
    assert.equal(pwa.needsRecheck(Infinity, 0), false);
  });
});
