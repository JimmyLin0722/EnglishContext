/*
 * ad-core.test.js — EMT.core.ad 單元測試（FE-83）
 * 受測：core/ad.js
 * 依據：architecture.md v0.14 §4.12「EMT.core.ad」、§7.25.3、§7.25.4、§10.11；契約 data-schema.ts §17、README §13.2 AD-1～AD-6、轉移表
 * 涵蓋：V-AD-01、V-AD-02、AC-50-01、AC-50-02、AC-50-05、E-138、E-139、E-147
 *
 * - 不寫死「AD_SLOT_ID 必須為 null」：第二階段只改該行的值，測試仍須通過（AC-50-05）。第一階段的值由 FE-89 與 QA 以建置結果檢查。
 * - 判定函式以測試內的設定物件驗證，不依賴 AD_CONFIG 目前的值。
 */
"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const A = require("../core/ad.js");

const AD_PATH = path.join(__dirname, "..", "core", "ad.js");
const SCHEMA_PATH = path.join(__dirname, "..", "..", "..", "docs", "02-contract", "data-schema.ts");
const STATUSES = ["ineligible", "waiting", "loading", "filled", "collapsed", "dismissed"];
const EVENTS = ["load", "filled", "collapse", "dismiss"];

/** 測試用的已設定單元 ID（只存在於本測試） */
const SLOT = "1234567890";
const PUBLISHER = "ca-pub-0000000000000000";
const CONFIGURED = Object.freeze({ publisherId: PUBLISHER, adSlotId: SLOT });
const PROD = Object.freeze({ protocol: "https:", hostname: "jimmyfantasyworld.com" });

/** 取 data-schema.ts 中 export const NAME 的字面值（以 node:vm 求值） */
function contractLiteral(name) {
  const src = fs.readFileSync(SCHEMA_PATH, "utf8");
  const m = new RegExp("export const " + name + "\\b[^=]*=\\s*([\\s\\S]*?);\\r?\\n").exec(src);
  assert.ok(m, "data-schema.ts 找不到 " + name);
  return vm.runInNewContext("(" + m[1].replace(/\s+as const\s*$/, "") + ")");
}

describe("契約常數（data-schema.ts §17）", () => {
  test("常數與 data-schema.ts 字面值相同", () => {
    for (const name of ["AD_PRODUCTION_HOSTNAME", "AD_PUBLISHER_ID_PATTERN", "AD_SLOT_ID_PATTERN", "AD_SCRIPT_URL", "AD_LOAD_TIMEOUT_MS"]) {
      assert.equal(A[name], contractLiteral(name), name);
    }
    assert.deepEqual(JSON.parse(JSON.stringify(A.AD_TEXTS)), JSON.parse(JSON.stringify(contractLiteral("AD_TEXTS"))));
    assert.equal(A.AD_CONFIG.publisherId, contractLiteral("AD_CONFIG").publisherId);
    assert.deepEqual(Object.keys(A.AD_CONFIG), Object.keys(contractLiteral("AD_CONFIG")));
  });

  test("AD_CONFIG：publisherId 合法；adSlotId 為 null 或合法值（不得以假值代替，AC-50-05、AD-1）", () => {
    assert.match(A.AD_CONFIG.publisherId, new RegExp(A.AD_PUBLISHER_ID_PATTERN));
    const slot = A.AD_CONFIG.adSlotId;
    assert.ok(slot === null || (typeof slot === "string" && new RegExp(A.AD_SLOT_ID_PATTERN).test(slot)), "adSlotId：" + slot);
  });

  test("AD_SCRIPT_URL 的 client 與 AD_CONFIG.publisherId 相同", () => {
    assert.equal(new URL(A.AD_SCRIPT_URL).searchParams.get("client"), A.AD_CONFIG.publisherId);
    assert.equal(new URL(A.AD_SCRIPT_URL).protocol, "https:");
  });

  test("原始碼恰 1 行 AD_SLOT_ID 宣告，AD_CONFIG 引用它（§5.9 B-25 只取代此行）", () => {
    const src = fs.readFileSync(AD_PATH, "utf8");
    const declared = src.match(/var AD_SLOT_ID = [^\n]*/g) || [];
    assert.equal(declared.length, 1, "宣告字樣只能出現 1 次（含註解）");
    assert.match(src, /^ {2}var AD_SLOT_ID = (null|"[0-9]{6,20}");\r?$/m);
    assert.match(src, /adSlotId: AD_SLOT_ID\b/);
    // 建置的靜態廣告框檢查（§5.9）：程式與註解都不得出現此樣式
    assert.doesNotMatch(src, /<ins\b[^>]*adsbygoogle/i);
  });

  test("不碰 DOM、計時器、網路與儲存（程式本體不含這些 API）", () => {
    const code = fs.readFileSync(AD_PATH, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    for (const bad of [/\bdocument\b/, /\bwindow\b/, /\bnavigator\b/, /\blocalStorage\b/, /\bsetTimeout\b/, /\bfetch\b/, /\bXMLHttpRequest\b/, /\brequire\b\s*\(/]) {
      assert.doesNotMatch(code, bad);
    }
  });

  test("api 深度凍結", () => {
    assert.ok(Object.isFrozen(A));
    assert.ok(Object.isFrozen(A.AD_CONFIG));
    assert.ok(Object.isFrozen(A.AD_TEXTS));
    assert.throws(() => { A.AD_CONFIG.adSlotId = SLOT; }, TypeError);
  });
});

describe("V-AD-02：單元 ID 判定（AD-2）", () => {
  const cases = [
    [null, false], ["", false], ["TODO", false], ["123", false], ["12345", false],
    ["123456", true], ["12345678901234567890", true], ["123456789012345678901", false],
    [" 1234567 ", false], ["1234567\n", false], ["12345a7", false], ["１２３４５６７", false],
    [1234567, false], [undefined, false], [true, false], [{}, false], [["1234567"], false]
  ];
  for (const [slot, expected] of cases) {
    test(JSON.stringify(slot) + " → " + expected, () => {
      assert.equal(A.isSlotConfigured({ publisherId: PUBLISHER, adSlotId: slot }), expected);
      // 未設定時正式環境也是 ineligible
      assert.equal(A.initialStatus({ location: PROD, config: { publisherId: PUBLISHER, adSlotId: slot }, isStandalone: false }), expected ? "waiting" : "ineligible");
    });
  }

  test("publisherId 不合法 → 未設定", () => {
    for (const pub of [null, "", "ca-pub-123", "pub-0000000000000000", "ca-pub-00000000000000000", 123, undefined]) {
      assert.equal(A.isSlotConfigured({ publisherId: pub, adSlotId: SLOT }), false, String(pub));
    }
  });

  test("config 不是物件 → 未設定，不拋例外", () => {
    for (const c of [null, undefined, "x", 1, true]) assert.equal(A.isSlotConfigured(c), false);
  });
});

describe("V-AD-01：環境判定（AD-3、AD-4）", () => {
  const parse = (u) => { const x = new URL(u); return { protocol: x.protocol, hostname: x.hostname }; };

  const ineligibleUrls = [
    "file:///C:/x/english-master-track.html",
    "http://localhost:8080/",
    "https://localhost/",
    "http://jimmyfantasyworld.com/",
    "https://www.jimmyfantasyworld.com/",
    "https://x.github.io/p/",
    "https://jimmyfantasyworld.com.evil.example/",
    "https://evil-jimmyfantasyworld.com/",
    "https://sub.jimmyfantasyworld.com/"
  ];
  for (const url of ineligibleUrls) {
    test(url + " → ineligible", () => {
      assert.equal(A.isProductionLocation(parse(url)), false);
      assert.equal(A.initialStatus({ location: parse(url), config: CONFIGURED, isStandalone: false }), "ineligible");
    });
  }

  test("正式網址 + 瀏覽器分頁 + 已設定單元 ID → waiting", () => {
    assert.equal(A.isProductionLocation(parse("https://jimmyfantasyworld.com/")), true);
    assert.equal(A.isProductionLocation(parse("https://jimmyfantasyworld.com/about.html?a=1#x")), true);
    assert.equal(A.initialStatus({ location: PROD, config: CONFIGURED, isStandalone: false }), "waiting");
  });

  test("正式網址 + 獨立視窗 → ineligible（E-147）", () => {
    assert.equal(A.initialStatus({ location: PROD, config: CONFIGURED, isStandalone: true }), "ineligible");
  });

  test("正式網址 + 未設定單元 ID → ineligible（AC-50-02）", () => {
    assert.equal(A.initialStatus({ location: PROD, config: { publisherId: PUBLISHER, adSlotId: null }, isStandalone: false }), "ineligible");
  });

  test("isStandalone 不是明確的 false → ineligible（條件無法確認時不載入廣告）", () => {
    for (const v of [undefined, null, 0, "", "false", {}]) {
      assert.equal(A.initialStatus({ location: PROD, config: CONFIGURED, isStandalone: v }), "ineligible", String(v));
    }
  });

  test("判定拋例外 → ineligible（AD-4）", () => {
    const boom = () => { throw new Error("boom"); };
    const throwing = [
      { get location() { return boom(); }, config: CONFIGURED, isStandalone: false },
      { location: { get protocol() { return boom(); }, hostname: PROD.hostname }, config: CONFIGURED, isStandalone: false },
      { location: PROD, config: { get adSlotId() { return boom(); }, publisherId: PUBLISHER }, isStandalone: false },
      { location: PROD, config: CONFIGURED, get isStandalone() { return boom(); } }
    ];
    for (const opts of throwing) assert.equal(A.initialStatus(opts), "ineligible");
  });

  test("引數異常 → ineligible，不拋例外", () => {
    for (const opts of [undefined, null, {}, "x", { location: null, config: null }]) {
      assert.equal(A.initialStatus(opts), "ineligible");
    }
    for (const loc of [null, undefined, "https://jimmyfantasyworld.com/", {}]) {
      assert.equal(A.isProductionLocation(loc), false);
    }
  });

  test("判定只用傳入的參數，不存取 document 與 adsbygoogle（V-AD-02）", () => {
    const sandbox = {};
    sandbox.self = sandbox;
    let scriptAccess = 0;
    Object.defineProperty(sandbox, "adsbygoogle", { get() { scriptAccess++; return undefined; } });
    Object.defineProperty(sandbox, "document", { get() { scriptAccess++; return undefined; } });
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(AD_PATH, "utf8"), sandbox, { filename: "core/ad.js" });
    const status = vm.runInContext(
      "EMT.core.ad.initialStatus({ location: { protocol: 'file:', hostname: '' }, config: { publisherId: 'x', adSlotId: null }, isStandalone: false })",
      sandbox
    );
    assert.equal(status, "ineligible");
    assert.equal(scriptAccess, 0, "document 與 adsbygoogle 未被存取");
  });
});

describe("decide（AD-6）", () => {
  const VALUES = {
    status: STATUSES,
    entryMode: ["main", "firstRun"],
    currentTab: ["dashboard", "part5", "about"],
    hasLearningRecord: [true, false],
    online: [true, false],
    startReady: [true, false]
  };

  test("全組合：與規則模型相同", () => {
    let count = 0;
    for (const status of VALUES.status) for (const entryMode of VALUES.entryMode) for (const currentTab of VALUES.currentTab)
      for (const hasLearningRecord of VALUES.hasLearningRecord) for (const online of VALUES.online) for (const startReady of VALUES.startReady) {
        const ctx = { status, entryMode, currentTab, hasLearningRecord, online, startReady };
        const base = status === "waiting" && entryMode === "main" && currentTab === "dashboard" && hasLearningRecord;
        const expected = !base ? null : !online ? "collapse" : startReady ? "load" : null;
        assert.equal(A.decide(ctx), expected, JSON.stringify(ctx));
        count++;
      }
    assert.equal(count, 6 * 2 * 3 * 2 * 2 * 2);
  });

  const ok = { status: "waiting", entryMode: "main", currentTab: "dashboard", hasLearningRecord: true, online: true, startReady: true };

  test("全部成立 → load；離線 → collapse（不論按鈕是否可點擊）", () => {
    assert.equal(A.decide(ok), "load");
    assert.equal(A.decide({ ...ok, online: false }), "collapse");
    assert.equal(A.decide({ ...ok, online: false, startReady: false }), "collapse");
  });

  test("按鈕尚未就緒 → 不動作（下次通知再評估，AD-6 (5)）", () => {
    assert.equal(A.decide({ ...ok, startReady: false }), null);
  });

  test("online 不是 true → collapse（AD-6 (4)：navigator.onLine === true 才載入）", () => {
    for (const v of [undefined, null, 0, "true"]) assert.equal(A.decide({ ...ok, online: v }), "collapse", String(v));
  });

  test("真值但非 true 的條件不算成立；ctx 異常 → null", () => {
    assert.equal(A.decide({ ...ok, hasLearningRecord: 1 }), null);
    assert.equal(A.decide({ ...ok, startReady: 1 }), null);
    for (const c of [null, undefined, "x", 1, {}]) assert.equal(A.decide(c), null);
  });
});

describe("transition（README §13.2 轉移表、AD-5）", () => {
  const TABLE = {
    ineligible: {},
    waiting: { load: "loading", collapse: "collapsed", dismiss: "dismissed" },
    loading: { filled: "filled", collapse: "collapsed", dismiss: "dismissed" },
    filled: { dismiss: "dismissed" },
    collapsed: {},
    dismissed: {}
  };

  test("6 個狀態 × 4 個事件全表", () => {
    for (const s of STATUSES) for (const e of EVENTS) {
      assert.equal(A.transition(s, e), TABLE[s][e] || s, s + " + " + e);
    }
  });

  test("終態不回頭（ineligible、collapsed、dismissed）；filled 只能 dismiss", () => {
    for (const s of ["ineligible", "collapsed", "dismissed"]) for (const e of EVENTS) assert.equal(A.transition(s, e), s);
    // 逾時後才到的 filled 被忽略（AD-8）
    assert.equal(A.transition(A.transition("loading", "collapse"), "filled"), "collapsed");
    assert.equal(A.transition("filled", "collapse"), "filled");
    assert.equal(A.transition("filled", "load"), "filled");
  });

  test("任意事件序列都只往前走，不回到先前狀態", () => {
    const rank = { waiting: 0, loading: 1, filled: 2, collapsed: 3, dismissed: 3 };
    for (const a of EVENTS) for (const b of EVENTS) for (const c of EVENTS) {
      let s = "waiting";
      for (const e of [a, b, c]) {
        const n = A.transition(s, e);
        assert.ok(rank[n] >= rank[s], s + " → " + n);
        s = n;
      }
    }
  });

  test("未知狀態與事件回傳原狀態，不命中原型鏈鍵", () => {
    assert.equal(A.transition("waiting", "x"), "waiting");
    assert.equal(A.transition("x", "load"), "x");
    assert.equal(A.transition("waiting", "constructor"), "waiting");
    assert.equal(A.transition("constructor", "load"), "constructor");
    assert.equal(A.transition("__proto__", "toString"), "__proto__");
    assert.equal(A.transition(null, "load"), null);
    assert.equal(A.transition("waiting", undefined), "waiting");
  });
});

describe("resultOfAdStatus（AD-8）", () => {
  test("filled → filled；unfilled → collapse；其他 → null", () => {
    assert.equal(A.resultOfAdStatus("filled"), "filled");
    assert.equal(A.resultOfAdStatus("unfilled"), "collapse");
    for (const v of [null, undefined, "", "FILLED", "done", 1]) assert.equal(A.resultOfAdStatus(v), null);
  });

  test("回傳的事件接得上轉移表", () => {
    assert.equal(A.transition("loading", A.resultOfAdStatus("filled")), "filled");
    assert.equal(A.transition("loading", A.resultOfAdStatus("unfilled")), "collapsed");
  });
});
