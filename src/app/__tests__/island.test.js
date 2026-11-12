/*
 * island.test.js — EMT.core.island 單元測試（FE-102）
 * 受測：core/island.js
 * 依據：architecture.md v0.19 §4.16、§7.32.1、§10.15；契約 data-schema.ts §19、README §15.2～§15.6、§15.8 V-ISL-01～V-ISL-05、FB-83～FB-85
 * 涵蓋：AC-64-02～AC-64-08、AC-65-01～AC-65-03、AC-66-02、AC-66-03、AC-67-01、AC-67-02、AC-69-02～AC-69-04、AC-71-01
 * FE-113：islandsOf 單筆快取案例（architecture.md v0.21 §4.16、§7.32.15 P-4、§10.15；AC-69-05、AC-70-03）
 *
 * - 常數期望值一律以 node:vm 取 data-schema.ts §19 的字面值做深度相等，本檔不另抄一份。
 * - 測試字庫：排名 1～5,620（前 2,809 筆含 NGSL）→ N_O 1,000、N_B 2,809、N_G 5,620，三區段 n = 1,000、1,809、2,811（同目前資料）。
 */
"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const I = require("../core/island.js");
const C = require("../core/constants.js");
const L = require("../core/layout.js");
const V = require("../core/vocab.js");
const ST = require("../core/streak.js");
const WK = require("../core/wordkey.js");

const APP_DIR = path.join(__dirname, "..");
const SOURCE_PATH = path.join(APP_DIR, "core", "island.js");
const SOURCE = fs.readFileSync(SOURCE_PATH, "utf8");
const SCHEMA_PATH = path.join(APP_DIR, "..", "..", "docs", "02-contract", "data-schema.ts");
const SCHEMA = fs.readFileSync(SCHEMA_PATH, "utf8");

/** 取 data-schema.ts 中 export const NAME 的字面值（去除型別註記與 as const，以 node:vm 求值） */
function contractLiteral(name) {
  const m = new RegExp("export const " + name + "\\b[^=]*=\\s*([\\s\\S]*?);\\r?\\n").exec(SCHEMA);
  assert.ok(m, "data-schema.ts 找不到 " + name);
  return vm.runInNewContext("(" + m[1].replace(/\s+as const\s*$/, "") + ")");
}

/** 遞迴檢查：物件與其中所有子物件都已凍結 */
function assertDeepFrozen(value, where) {
  if (!value || typeof value !== "object") return;
  assert.ok(Object.isFrozen(value), where + " 未凍結");
  for (const k of Object.keys(value)) assertDeepFrozen(value[k], where + "." + k);
}

/** 遞迴檢查：不含 undefined、NaN、Infinity、負數 */
function assertClean(value, where) {
  if (value === undefined) assert.fail(where + " 為 undefined");
  if (typeof value === "number") {
    assert.ok(Number.isFinite(value), where + " 不是有限數：" + value);
    assert.ok(value >= 0, where + " 為負數：" + value);
    return;
  }
  if (typeof value === "string") {
    assert.ok(!/NaN|undefined|Infinity/.test(value), where + " 含非法字樣：" + value);
    return;
  }
  if (value && typeof value === "object") {
    for (const k of Object.keys(value)) assertClean(value[k], where + "." + k);
  }
}

// ── 測試字庫（以 vocab.prepareBuiltin 整理，與正式資料同一條路徑）──

const TOTAL = 5620;
const RAW = [];
for (let r = 1; r <= TOTAL; r++) {
  RAW.push({ rank: r, word: "w" + r, sources: r <= 2809 ? ["NGSL"] : ["AWL"] });
}
const BUILTIN = V.prepareBuiltin(RAW);
const keyOf = (rank) => WK.wordKey("w" + rank);
/** 排名 from～to（含）的 wordKey */
function keys(from, to) {
  const out = [];
  for (let r = from; r <= to; r++) out.push(keyOf(r));
  return out;
}
/** 以測試字庫組 IslandState 的輸入 */
function input(extra) {
  return Object.assign({
    builtin: BUILTIN.sorted,
    builtinMap: BUILTIN.map,
    nB: BUILTIN.nB,
    nG: BUILTIN.nG,
    masteredWordKeys: [],
    effectiveColor: "green",
    streakDays: 0,
    k: 0,
    q: 200,
    x: 0,
    d: 10
  }, extra);
}
/** AC-64-03 資料：橘 250、棕 10、5 個自訂單字 */
const AC_64_03_KEYS = keys(1, 250).concat(keys(1001, 1010), ["myword1", "myword2", "myword3", "myword4", "myword5"]);

describe("測試字庫前提", () => {
  test("N_O 1,000、N_B 2,809、N_G 5,620；三區段 n 為 1,000、1,809、2,811", () => {
    assert.equal(C.N_O, 1000);
    assert.equal(BUILTIN.nB, 2809);
    assert.equal(BUILTIN.nG, 5620);
    assert.deepEqual(I.sectionSizes(BUILTIN.sorted, BUILTIN.nB, BUILTIN.nG), [1000, 1809, 2811]);
  });
});

describe("§19 常數：與 data-schema.ts 字面值深度相等且深度凍結", () => {
  const PAIRS = [
    ["STAGES", "ISLAND_STAGES"],
    ["THRESHOLDS", "ISLAND_THRESHOLDS"],
    ["LIST_ORDER", "ISLAND_LIST_ORDER"],
    ["STYLE_TOKENS", "ISLAND_STYLE_TOKENS"],
    ["TEXTS", "ISLAND_TEXTS"]
  ];
  for (const [local, contract] of PAIRS) {
    test(local + " = " + contract, () => {
      // vm 產生的物件原型不同，以 JSON 往返後比較純資料
      assert.deepEqual(JSON.parse(JSON.stringify(I[local])), JSON.parse(JSON.stringify(contractLiteral(contract))));
      assertDeepFrozen(I[local], local);
    });
  }
  test("匯出物件本身凍結", () => {
    assert.ok(Object.isFrozen(I));
  });
  test("STAGES 首尾相接涵蓋 0～100", () => {
    let next = 0;
    for (const s of I.STAGES) {
      assert.equal(s.minP, next);
      assert.ok(s.maxP >= s.minP);
      next = s.maxP + 1;
    }
    assert.equal(next, 101);
  });
});

describe("原始碼規則（doneWhen、LD-1、LD-3）", () => {
  test("不含 m / n * 100 形式的取整", () => {
    assert.ok(!/\/\s*[\w.]+\s*\*\s*100/.test(SOURCE), "出現「÷ n × 100」寫法");
    assert.ok(!/\*\s*100\s*\/|Math\.round/.test(SOURCE), "出現 ×100 ÷ 或 Math.round");
  });
  test("不呼叫 localStorage、document、Date，也不用 innerHTML", () => {
    for (const word of ["localStorage", "document", "Date", "innerHTML", "sessionStorage", "indexedDB"]) {
      assert.ok(!new RegExp("\\b" + word + "\\b").test(SOURCE), "原始碼含 " + word);
    }
  });
  test("瀏覽器環境：載入時不取用其他模組；呼叫時才取 EMT.core.constants，缺少時丟出含模組名稱的 Error", () => {
    const sandbox = { console };
    sandbox.self = sandbox;
    sandbox.window = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(SOURCE, sandbox, { filename: "island.js" });
    const api = sandbox.EMT.core.island;
    assert.equal(typeof api.state, "function");
    // 不需要 N_O 的函式照常可用
    assert.equal(api.percent(1, 1000), 1);
    assert.throws(() => api.sectionSizes([{ rank: 1 }], 0, 0), /EMT\.core\.constants/);
    vm.runInContext(fs.readFileSync(path.join(APP_DIR, "core", "constants.js"), "utf8"), sandbox, { filename: "constants.js" });
    assert.deepEqual(Array.from(api.sectionSizes([{ rank: 1 }, { rank: 1001 }], 2000, 3000)), [1, 1, 0]);
  });
});

describe("V-ISL-01：島嶼掌握率 P 與階段（IS-7、IS-8；AC-64-02、AC-64-03、E-178）", () => {
  test("IS-7 對照表", () => {
    const TABLE = [
      [1, 1000, 1], [240, 1000, 24], [249, 1000, 25], [250, 1000, 25], [490, 1000, 49], [500, 1000, 50],
      [990, 1000, 99], [999, 1000, 99], [1000, 1000, 100], [10, 1809, 1], [0, 1000, 0], [0, 1809, 0], [0, 1, 0]
    ];
    for (const [m, n, p] of TABLE) assert.equal(I.percent(m, n), p, m + "/" + n);
  });
  test("n = 0 → null；m > n → 100；不合法輸入不產生 NaN", () => {
    assert.equal(I.percent(0, 0), null);
    assert.equal(I.percent(5, 0), null);
    assert.equal(I.percent(1200, 1000), 100);
    for (const bad of [NaN, -3, Infinity, null, undefined, "5"]) {
      const a = I.percent(bad, 1000);
      const b = I.percent(5, bad);
      assert.ok(a === null || (Number.isInteger(a) && a >= 0 && a <= 100));
      assert.ok(b === null || (Number.isInteger(b) && b >= 0 && b <= 100));
    }
  });
  test("AC-64-02：橘島 m 依序 0～1,000 共 11 點 → P 與階段、清單階段文字", () => {
    const M = [0, 1, 240, 250, 490, 500, 740, 750, 990, 999, 1000];
    const P = [0, 1, 24, 25, 49, 50, 74, 75, 99, 99, 100];
    const STAGE = ["sand", "sprout", "sprout", "palm", "palm", "bloom", "bloom", "hut", "hut", "hut", "complete"];
    M.forEach((m, i) => {
      const st = I.state(input({ masteredWordKeys: keys(1, m) }));
      const orange = st.islands[0];
      assert.equal(orange.n, 1000);
      assert.equal(orange.m, m);
      assert.equal(orange.p, P[i], "m = " + m);
      assert.equal(orange.stage, STAGE[i], "m = " + m);
      assert.equal(I.stageOf(P[i]), STAGE[i]);
      const def = I.STAGES.find((s) => s.stage === STAGE[i]);
      assert.equal(I.listRowOf(orange).stageText, def.listText);
    });
  });
  test("AC-64-02：棕島、綠島以 P = 0、25、100 抽測", () => {
    const cases = [
      { island: 1, from: 1001, n: 1809 },
      { island: 2, from: 2810, n: 2811 }
    ];
    for (const c of cases) {
      for (const [m, p, stage] of [[0, 0, "sand"], [Math.ceil(c.n * 0.245), 25, "palm"], [c.n, 100, "complete"]]) {
        const st = I.state(input({ masteredWordKeys: keys(c.from, c.from + m - 1) }));
        assert.equal(st.islands[c.island].p, p, "島 " + c.island + " m = " + m);
        assert.equal(st.islands[c.island].stage, stage);
      }
    }
  });
  test("N_B 2,809、棕 m = 10 → P 1（新芽）", () => {
    const st = I.state(input({ masteredWordKeys: keys(1001, 1010) }));
    assert.deepEqual([st.islands[1].n, st.islands[1].m, st.islands[1].p, st.islands[1].stage], [1809, 10, 1, "sprout"]);
  });
  test("任一區段 n = 0 → p = null、stage = sand（E-178）", () => {
    // 字庫為空
    let st = I.state(input({ builtin: [], builtinMap: new Map(), nB: 0, nG: 0, masteredWordKeys: keys(1, 5) }));
    for (const isl of st.islands) assert.deepEqual([isl.n, isl.m, isl.p, isl.stage], [0, 0, null, "sand"]);
    // N_B = N_O → 棕島區段為空；N_G < N_B → 綠島區段為空
    st = I.state(input({ nB: 1000, nG: 900, masteredWordKeys: keys(1001, 1500) }));
    assert.deepEqual([st.islands[1].n, st.islands[1].p, st.islands[1].stage], [0, null, "sand"]);
    assert.deepEqual([st.islands[2].n, st.islands[2].p, st.islands[2].stage], [0, null, "sand"]);
    assertClean(st, "state");
  });
  test("sectionSizes 以 rank 計數（非邊界相減）、同一陣列快取且回傳值不影響快取", () => {
    const gappy = BUILTIN.sorted.filter((it) => it.rank % 2 === 0);
    assert.deepEqual(I.sectionSizes(gappy, 2809, 5620), [500, 904, 1406]);
    const first = I.sectionSizes(gappy, 2809, 5620);
    first[0] = 99999;
    assert.deepEqual(I.sectionSizes(gappy, 2809, 5620), [500, 904, 1406]);
    // nB、nG 不同時重新計算
    assert.deepEqual(I.sectionSizes(gappy, 1000, 2000), [500, 0, 500]);
    assert.deepEqual(I.sectionSizes(null, 2809, 5620), [0, 0, 0]);
    assert.deepEqual(I.sectionSizes([null, { rank: "3" }, { rank: 1.5 }, { rank: -1 }, { rank: 5 }], 2809, 5620), [1, 0, 0]);
  });
});

describe("V-ISL-02：區段歸屬與（目前目標未包含）（IS-6、IS-9；AC-64-03、AC-64-04）", () => {
  test("AC-64-03 資料 → 三島 m 250、10、0；P 25、1、0；自訂單字不計", () => {
    const st = I.state(input({ masteredWordKeys: AC_64_03_KEYS }));
    assert.deepEqual(st.islands.map((x) => x.m), [250, 10, 0]);
    assert.deepEqual(st.islands.map((x) => x.p), [25, 1, 0]);
    assert.deepEqual(st.islands.map((x) => x.stage), ["palm", "sprout", "sand"]);
    assert.deepEqual(st.islands.map((x) => x.island), ["orange", "brown", "green"]);
  });
  test("masteredCounts：重複 wordKey 只計 1 次；接受 Set；非陣列與缺 builtinMap → 0", () => {
    const dup = keys(1, 3).concat(keys(1, 3), [keyOf(1500), keyOf(1500)]);
    assert.deepEqual(I.masteredCounts(dup, BUILTIN.map, 2809, 5620), [3, 1, 0]);
    assert.deepEqual(I.masteredCounts(new Set(dup), BUILTIN.map, 2809, 5620), [3, 1, 0]);
    assert.deepEqual(I.masteredCounts(null, BUILTIN.map, 2809, 5620), [0, 0, 0]);
    assert.deepEqual(I.masteredCounts("w1", BUILTIN.map, 2809, 5620), [0, 0, 0]);
    assert.deepEqual(I.masteredCounts(dup, null, 2809, 5620), [0, 0, 0]);
    assert.deepEqual(I.masteredCounts([1, null, {}, keyOf(2)], BUILTIN.map, 2809, 5620), [1, 0, 0]);
  });
  test("自訂卡與內建同 wordKey（排名 3,000）掌握 → 計入綠島（FB-85、AC-69-03）", () => {
    const st = I.state(input({ effectiveColor: "orange", masteredWordKeys: [keyOf(3000)] }));
    assert.deepEqual(st.islands.map((x) => x.m), [0, 0, 1]);
  });
  test("生效色級橘時排名 1,500 的已掌握字計入棕島（不受生效色級影響）", () => {
    for (const color of ["orange", "brown", "green"]) {
      const st = I.state(input({ effectiveColor: color, masteredWordKeys: [keyOf(1500)] }));
      assert.deepEqual(st.islands.map((x) => x.m), [0, 1, 0], color);
      assert.equal(st.islands[1].p, 1);
    }
  });
  test("outOfGoal：橘 → 棕、綠；棕 → 綠；綠 → 無（藍、金與不認得的代碼比照綠）", () => {
    const of = (color) => I.islandsOf(input({ effectiveColor: color })).map((x) => x.outOfGoal);
    assert.deepEqual(of("orange"), [false, true, true]);
    assert.deepEqual(of("brown"), [false, false, true]);
    assert.deepEqual(of("green"), [false, false, false]);
    assert.deepEqual(of("blue"), [false, false, false]);
    assert.deepEqual(of("gold"), [false, false, false]);
    assert.deepEqual(of(undefined), [false, false, false]);
  });
  test("AC-64-04：outOfGoal 不改變 P 與階段", () => {
    const a = I.islandsOf(input({ effectiveColor: "orange", masteredWordKeys: AC_64_03_KEYS }));
    const b = I.islandsOf(input({ effectiveColor: "green", masteredWordKeys: AC_64_03_KEYS }));
    assert.deepEqual(a.map((x) => [x.p, x.stage]), b.map((x) => [x.p, x.stage]));
  });
});

describe("V-ISL-03：天氣、燈塔、小船（IS-11～IS-13；AC-64-05～AC-64-07、AC-67-01）", () => {
  test("天氣：S 0、1、6、7 → cloudy、sunny、sunny、rainbow", () => {
    assert.deepEqual([0, 1, 6, 7, 30].map(I.weatherOf), ["cloudy", "sunny", "sunny", "rainbow", "rainbow"]);
    for (const bad of [NaN, -1, null, undefined, Infinity]) assert.equal(I.weatherOf(bad), "cloudy");
  });
  test("打卡中斷：最後打卡日 3 天前、days 10 → S 0、cloudy（S 取 streak.displayDays）", () => {
    const s = ST.displayDays({ days: 10, lastActiveDate: "2026-11-09" }, "2026-11-12");
    assert.equal(s, 0);
    const st = I.state(input({ streakDays: s }));
    assert.equal(st.streakDays, 0);
    assert.equal(st.weather, "cloudy");
  });
  test("燈塔：K 0、1、49、50、200 → unbuilt、built、built、lit、lit；Q = 0 → K 0、unbuilt", () => {
    assert.deepEqual([0, 1, 49, 50, 200].map(I.lighthouseOf), ["unbuilt", "built", "built", "lit", "lit"]);
    for (const k of [0, 1, 49, 50, 200]) {
      const st = I.state(input({ k: k, q: 200 }));
      assert.equal(st.k, k);
      assert.equal(st.lighthouse, I.lighthouseOf(k));
    }
    const empty = I.state(input({ k: 7, q: 0 }));
    assert.deepEqual([empty.k, empty.q, empty.lighthouse], [0, 0, "unbuilt"]);
  });
  test("小船：D 10、X 0、5、9、10、15 → r 0、0.5、0.9、1、1", () => {
    const X = [0, 5, 9, 10, 15];
    const R = [0, 0.5, 0.9, 1, 1];
    const BOAT = ["sailing", "sailing", "sailing", "docked", "docked"];
    const REM = [10, 5, 1, 0, 0];
    X.forEach((x, i) => {
      const b = I.boatOf(x, 10);
      assert.deepEqual([b.boatRatio, b.boat, b.remaining], [R[i], BOAT[i], REM[i]], "X = " + x);
      const st = I.state(input({ x: x, d: 10 }));
      assert.deepEqual([st.x, st.d, st.boatRatio, st.boat, st.remaining], [x, 10, R[i], BOAT[i], REM[i]]);
    });
  });
  test("小船防呆：D < 1、非整數、NaN 以 1 計；X 不合法以 0 計", () => {
    for (const d of [0, -5, 2.5, NaN, null, Infinity]) {
      const b = I.boatOf(3, d);
      assert.deepEqual([b.boatRatio, b.boat, b.remaining], [1, "docked", 0], "d = " + d);
    }
    for (const x of [NaN, -2, null, undefined]) {
      const b = I.boatOf(x, 10);
      assert.deepEqual([b.boatRatio, b.boat, b.remaining], [0, "sailing", 10]);
    }
  });
});

describe("V-ISL-04：文字組字（AC-66-02、AC-66-03、AC-67-01、AC-65-01～AC-65-03、AC-71-01）", () => {
  test("AC-66-02：龜龜對話框 5 句（D 10、X 0、4、9、10、12）", () => {
    const EXPECT = [
      "再學 10 個字，今天的小船就靠岸囉！",
      "再學 6 個字，今天的小船就靠岸囉！",
      "再學 1 個字，今天的小船就靠岸囉！",
      "今天的小船靠岸了！想多學也可以，島上會更熱鬧。",
      "今天的小船靠岸了！想多學也可以，島上會更熱鬧。"
    ];
    [0, 4, 9, 10, 12].forEach((x, i) => {
      assert.equal(I.dialogText(I.state(input({ x: x, d: 10 }))), EXPECT[i]);
    });
  });
  test("AC-66-03：今日進度列 4 種（D 10、X 0、4、10、12）", () => {
    const CASES = [
      [0, "今日已學 0 / 10 字", 0, false],
      [4, "今日已學 4 / 10 字", 0.4, false],
      [10, "今日已學 10 / 10 字", 1, true],
      [12, "今日已學 12 / 10 字", 1, true]
    ];
    for (const [x, text, ratio, reached] of CASES) {
      const st = I.state(input({ x: x, d: 10 }));
      assert.equal(L.fill(L.LAYOUT_TEXTS.todayRing, { x: st.x, d: st.d }), text);
      assert.equal(st.boatRatio, ratio);
      assert.equal(st.boat === "docked", reached);
      assert.equal(I.TEXTS.todayGoalReached, "今日目標達成");
    }
  });
  test("AC-67-01：3 格狀態行（S 0、3、7；K 0、48、50；Q = 0）", () => {
    assert.deepEqual([0, 3, 7].map((s) => I.weatherText(I.state(input({ streakDays: s })).weather)), ["陰天", "晴天", "出現彩虹"]);
    assert.deepEqual([0, 48, 50].map((k) => I.lighthouseText(I.state(input({ k: k })).lighthouse)), ["燈塔待建", "燈塔蓋好", "燈塔點亮"]);
    assert.equal(I.lighthouseText(I.state(input({ k: 0, q: 0 })).lighthouse), "燈塔待建");
    assert.equal(I.weatherText("bogus"), "陰天");
    assert.equal(I.lighthouseText(undefined), "燈塔待建");
  });
  test("IA-2：島嶼清單 3 列開放島（AC-64-03 資料、生效橘）", () => {
    const st = I.state(input({ effectiveColor: "orange", masteredWordKeys: AC_64_03_KEYS }));
    assert.deepEqual(JSON.parse(JSON.stringify(st.islands.map(I.listRowOf))), [
      { name: "橘島", sub: "入門", right: "掌握 25%", stageText: "長出第一棵椰子樹", valueNow: 25, label: "橘島掌握率", fog: false },
      { name: "棕島", sub: "基礎", right: "掌握 1%", stageText: "冒出新芽了（目前目標未包含）", valueNow: 1, label: "棕島掌握率", fog: false },
      { name: "綠島", sub: "職場與商務", right: "掌握 0%", stageText: "還是一片沙灘，掌握第一個字就會冒芽（目前目標未包含）", valueNow: 0, label: "綠島掌握率", fog: false }
    ]);
  });
  test("IA-2：霧中島 2 列；非霧中島代碼拋 TypeError", () => {
    assert.deepEqual(JSON.parse(JSON.stringify(I.LIST_ORDER.slice(3).map(I.fogRowOf))), [
      { name: "藍島", sub: "高階商務", right: "尚未開放", stageText: "還在霧中，之後的版本開放", valueNow: null, label: null, fog: true },
      { name: "金島", sub: "近母語", right: "尚未開放", stageText: "還在霧中，之後的版本開放", valueNow: null, label: null, fog: true }
    ]);
    assert.throws(() => I.fogRowOf("orange"), TypeError);
    assert.throws(() => I.listRowOf({ island: "blue" }), TypeError);
    assert.throws(() => I.listRowOf(null), TypeError);
  });
  test("AC-71-01、IA-4：地圖文字替代範例逐字（AC-64-03 資料、S 3、K 48、X 4、D 15）", () => {
    const st = I.state(input({ masteredWordKeys: AC_64_03_KEYS, streakDays: 3, k: 48, q: 200, x: 4, d: 15 }));
    assert.equal(I.mapAltText(st),
      "群島地圖：橘島掌握 25%，一棵椰子樹；棕島掌握 1%，新芽；綠島掌握 0%，沙灘；藍島、金島尚未開放；" +
      "連續打卡 3 天，晴天；模擬測驗已答對 48 題，燈塔蓋好；今日小船 4 / 15 字，航行中");
  });
  test("文字替代不含「（目前目標未包含）」；數字不加千分位", () => {
    const st = I.state(input({ effectiveColor: "orange", masteredWordKeys: AC_64_03_KEYS, streakDays: 1500, k: 1200, q: 2000, x: 1234, d: 15 }));
    const alt = I.mapAltText(st);
    assert.ok(!alt.includes("（目前目標未包含）"));
    assert.ok(alt.includes("連續打卡 1500 天，出現彩虹"));
    assert.ok(alt.includes("模擬測驗已答對 1200 題，燈塔點亮"));
    assert.ok(alt.includes("今日小船 1234 / 15 字，已靠岸"));
    assert.ok(!/\d,\d/.test(alt));
  });
  test("AC-65-03、AC-67-02：同一資料下清單、文字替代的 P、階段、天氣、燈塔一致", () => {
    for (const mk of [AC_64_03_KEYS, keys(1, 999), keys(1, 1000).concat(keys(1001, 2809))]) {
      const st = I.state(input({ masteredWordKeys: mk, streakDays: 7, k: 50, x: 3, d: 10 }));
      const alt = I.mapAltText(st);
      for (const isl of st.islands) {
        const row = I.listRowOf(isl);
        const def = I.STAGES.find((s) => s.stage === isl.stage);
        assert.equal(row.right, "掌握 " + isl.p + "%");
        assert.equal(row.valueNow, isl.p);
        assert.equal(row.stageText, def.listText);
        assert.ok(alt.includes(row.name + "掌握 " + isl.p + "%，" + def.nameZh), alt);
      }
      assert.ok(alt.includes("，" + I.weatherText(st.weather) + "；"));
      assert.ok(alt.includes("，" + I.lighthouseText(st.lighthouse) + "；"));
    }
  });
  test("FB-84：n = 0 →「掌握 —」、valueNow null、文字替代「{島名}掌握 —，沙灘」", () => {
    const st = I.state(input({ nB: 1000, nG: 900 }));
    const row = I.listRowOf(st.islands[1]);
    assert.equal(row.right, "掌握 —");
    assert.equal(row.valueNow, null);
    assert.equal(row.label, "棕島掌握率");
    assert.equal(row.stageText, "還是一片沙灘，掌握第一個字就會冒芽");
    const alt = I.mapAltText(st);
    assert.ok(alt.includes("棕島掌握 —，沙灘；綠島掌握 —，沙灘；藍島"), alt);
    assert.ok(!alt.includes("—%"));
  });
  test("fillText：只取代 {名稱}、缺值拋 TypeError、數字為 String(n)", () => {
    assert.equal(I.fillText("掌握 {p}%", { p: 25 }), "掌握 25%");
    assert.equal(I.fillText("無佔位符", {}), "無佔位符");
    assert.equal(I.fillText("{a}{a}", { a: 0, b: 1 }), "00");
    assert.throws(() => I.fillText("掌握 {p}%", {}), TypeError);
    assert.throws(() => I.fillText("掌握 {p}%", { p: undefined }), TypeError);
    assert.throws(() => I.fillText("掌握 {p}%", null), TypeError);
  });
});

describe("V-ISL-05 純函式部分：學完回饋（LF-2、LF-6；AC-69-02～AC-69-04）", () => {
  /** 指定橘、棕已掌握數與 X 的快照（D 10） */
  function snap(orangeM, brownM, x, extraKeys) {
    const mk = keys(1, orangeM).concat(keys(1001, 1000 + brownM), extraKeys || []);
    return I.state(input({ masteredWordKeys: mk, x: x, d: 10 }));
  }

  test("LF-6：橘 239 → 240（X 3 → 4）→「橘島又多掌握 1 個字（掌握 24%）」", () => {
    const fb = I.feedbackOf(snap(239, 0, 3), snap(240, 0, 4));
    assert.deepEqual({ ...fb }, { kind: "mastered", island: "orange", text: "橘島又多掌握 1 個字（掌握 24%）" });
  });
  test("LF-6：橘 244 → 245 升階 →「橘島長出第一棵椰子樹！」", () => {
    const b = snap(244, 0, 4);
    const a = snap(245, 0, 5);
    assert.deepEqual([b.islands[0].p, a.islands[0].p], [24, 25]);
    assert.deepEqual({ ...I.feedbackOf(b, a) }, { kind: "levelUp", island: "orange", text: "橘島長出第一棵椰子樹！" });
  });
  test("FB-83：橘 249 → 250 階段不變 →「橘島又多掌握 1 個字（掌握 25%）」", () => {
    const b = snap(249, 0, 4);
    const a = snap(250, 0, 5);
    assert.deepEqual([b.islands[0].p, b.islands[0].stage, a.islands[0].stage], [25, "palm", "palm"]);
    assert.deepEqual({ ...I.feedbackOf(b, a) }, { kind: "mastered", island: "orange", text: "橘島又多掌握 1 個字（掌握 25%）" });
  });
  test("LF-6：棕 0 → 1 →「棕島冒出新芽了！」", () => {
    assert.deepEqual({ ...I.feedbackOf(snap(0, 0, 3), snap(0, 1, 4)) }, { kind: "levelUp", island: "brown", text: "棕島冒出新芽了！" });
  });
  test("LF-6：X 8 → 9（翻面）→「小船又前進了，再 1 個字靠岸」", () => {
    assert.deepEqual({ ...I.feedbackOf(snap(0, 0, 8), snap(0, 0, 9)) }, { kind: "sailing", island: null, text: "小船又前進了，再 1 個字靠岸" });
  });
  test("LF-6：X 9 → 10（STT 評分）→「今天的小船靠岸了！」", () => {
    assert.deepEqual({ ...I.feedbackOf(snap(0, 0, 9), snap(0, 0, 10)) }, { kind: "docked", island: null, text: "今天的小船靠岸了！" });
  });
  test("LF-6：X 10 → 11 → null", () => {
    assert.equal(I.feedbackOf(snap(0, 0, 10), snap(0, 0, 11)), null);
  });
  test("LF-6：自訂單字（wordKey 不在內建字庫）首次掌握且 X 11 → 12 → null", () => {
    assert.equal(I.feedbackOf(snap(0, 0, 11), snap(0, 0, 12, ["mycustomword"])), null);
  });
  test("AC-69-04 (a)：升階且 X 達到 D → 升階文字", () => {
    assert.deepEqual({ ...I.feedbackOf(snap(244, 0, 9), snap(245, 0, 10)) }, { kind: "levelUp", island: "orange", text: "橘島長出第一棵椰子樹！" });
  });
  test("AC-69-04 (b)：未升階、多掌握且 X 達到 D →「今天的小船靠岸了！」", () => {
    assert.deepEqual({ ...I.feedbackOf(snap(239, 0, 9), snap(240, 0, 10)) }, { kind: "docked", island: null, text: "今天的小船靠岸了！" });
  });
  test("AC-69-04 (c) 的純函式面：前後相同 → null", () => {
    const s = snap(240, 3, 5);
    assert.equal(I.feedbackOf(s, s), null);
    assert.equal(I.feedbackOf(s, snap(240, 3, 5)), null);
  });
  test("多掌握但 X 已 ≥ D：仍為「又多掌握」；X 未增加的多掌握也成立", () => {
    assert.equal(I.feedbackOf(snap(239, 0, 12), snap(240, 0, 13)).kind, "mastered");
    assert.equal(I.feedbackOf(snap(239, 0, 5), snap(240, 0, 5)).kind, "mastered");
  });
  test("其他升階文字（開花、小屋、完成）", () => {
    assert.equal(I.feedbackOf(snap(494, 0, 0), snap(495, 0, 0)).text, "橘島的樹林開花了！");
    assert.equal(I.feedbackOf(snap(744, 0, 0), snap(745, 0, 0)).text, "橘島蓋好小屋了！");
    assert.equal(I.feedbackOf(snap(999, 0, 0), snap(1000, 0, 0)).text, "橘島插上旗子，這座島完成了！");
  });
  test("資料異常同時兩島：取 LIST_ORDER 較前者（升階與多掌握各一）", () => {
    const b = snap(0, 0, 3);
    const a = snap(1, 1, 4);
    assert.equal(I.feedbackOf(b, a).island, "orange");
    // 只看 islands 欄位：手動組不依順序排列的快照，仍取橘
    const islandsB = [
      { island: "green", n: 10, m: 1, p: 10, stage: "sprout", outOfGoal: false },
      { island: "brown", n: 10, m: 1, p: 10, stage: "sprout", outOfGoal: false },
      { island: "orange", n: 10, m: 1, p: 10, stage: "sprout", outOfGoal: false }
    ];
    const islandsA = [
      { island: "green", n: 10, m: 2, p: 20, stage: "sprout", outOfGoal: false },
      { island: "brown", n: 10, m: 2, p: 20, stage: "sprout", outOfGoal: false },
      { island: "orange", n: 10, m: 2, p: 20, stage: "sprout", outOfGoal: false }
    ];
    const fb = I.feedbackOf({ islands: islandsB, x: 12, d: 10 }, { islands: islandsA, x: 12, d: 10 });
    assert.deepEqual({ ...fb }, { kind: "mastered", island: "orange", text: "橘島又多掌握 1 個字（掌握 20%）" });
  });
  test("不合法輸入 → null，不拋例外；回傳值凍結", () => {
    assert.equal(I.feedbackOf(null, null), null);
    assert.equal(I.feedbackOf({}, {}), null);
    assert.equal(I.feedbackOf(snap(0, 0, 0), null), null);
    assert.ok(Object.isFrozen(I.feedbackOf(snap(0, 0, 8), snap(0, 0, 9))));
  });
});

describe("FE-113：islandsOf 單筆快取（§4.16、§7.32.15 P-4；AC-69-05、AC-70-03）", () => {
  /** 會計數 get 次數的 builtinMap 替身（委派給真正的 Map） */
  function countingMap(base) {
    const spy = {
      calls: 0,
      get(key) { spy.calls++; return base.get(key); }
    };
    return spy;
  }
  /** 參照實作：只用 sectionSizes、masteredCounts、percent、stageOf，不經 islandsOf 快取 */
  function expected(inp) {
    const sizes = I.sectionSizes(inp.builtin, inp.nB, inp.nG);
    const counts = I.masteredCounts(inp.masteredWordKeys, inp.builtinMap, inp.nB, inp.nG);
    const gi = ["orange", "brown", "green", "blue", "gold"].indexOf(inp.effectiveColor);
    const g = gi >= 0 ? gi : 2;
    return ["orange", "brown", "green"].map((island, i) => {
      const n = sizes[i];
      const m = Math.min(counts[i], n);
      const p = I.percent(m, n);
      return { island, n, m, p, stage: I.stageOf(p), outOfGoal: i > g };
    });
  }
  /** 只含 islandsOf 欄位的輸入 */
  function isl(extra) {
    return Object.assign({
      builtin: BUILTIN.sorted,
      builtinMap: BUILTIN.map,
      nB: BUILTIN.nB,
      nG: BUILTIN.nG,
      masteredWordKeys: [],
      effectiveColor: "green"
    }, extra);
  }

  test("同一組參照連續呼叫 → 命中時 get 0 次、內容深度相等、每次都是新陣列與新物件", () => {
    const spy = countingMap(BUILTIN.map);
    const inp = isl({ builtinMap: spy, masteredWordKeys: AC_64_03_KEYS });
    const first = I.islandsOf(inp);
    assert.ok(spy.calls > 0, "第一次應重算");
    assert.deepEqual(first.map((x) => [x.m, x.p, x.stage]), [[250, 25, "palm"], [10, 1, "sprout"], [0, 0, "sand"]]);
    spy.calls = 0;
    const second = I.islandsOf(inp);
    assert.equal(spy.calls, 0, "命中時不得呼叫 builtinMap.get");
    assert.deepEqual(second, first);
    assert.notEqual(second, first);
    second.forEach((it, i) => assert.notEqual(it, first[i]));
    // 換一個外層物件、內容參照相同 → 仍命中
    const third = I.islandsOf(Object.assign({}, inp));
    assert.equal(spy.calls, 0);
    assert.deepEqual(third, first);
  });

  test("改動或凍結回傳值不污染快取；state() 凍結的是拷貝", () => {
    const spy = countingMap(BUILTIN.map);
    const inp = isl({ builtinMap: spy, masteredWordKeys: keys(1, 240) });
    const want = expected(inp);
    const a = I.islandsOf(inp);
    a[0].m = 99999;
    a[0].p = 77;
    a[1].stage = "complete";
    a.push({ island: "blue" });
    a.reverse();
    spy.calls = 0;
    assert.deepEqual(I.islandsOf(inp), want);
    assert.equal(spy.calls, 0);
    // state() 深度凍結自己的結果；之後 islandsOf 回傳值仍可修改，內容不變
    const st = I.state(Object.assign({ streakDays: 0, k: 0, q: 200, x: 0, d: 10 }, inp));
    assertDeepFrozen(st, "state");
    assert.deepEqual(st.islands.map((x) => Object.assign({}, x)), want);
    const after = I.islandsOf(inp);
    assert.ok(!Object.isFrozen(after) && !Object.isFrozen(after[0]), "快取本體不得被凍結");
    assert.deepEqual(after, want);
    assert.equal(spy.calls, 0);
  });

  test("builtin、builtinMap、nB、nG、masteredWordKeys（換陣列）、effectiveColor 各自改變 → 重算為正確值", () => {
    const spy = countingMap(BUILTIN.map);
    const base = isl({ builtinMap: spy, masteredWordKeys: AC_64_03_KEYS, effectiveColor: "green" });
    const gappy = BUILTIN.sorted.filter((it) => it.rank % 2 === 0);
    const smallMap = new Map(Array.from(BUILTIN.map).filter(([, it]) => it.rank > 100));
    const cases = [
      ["builtin", { builtin: gappy }],
      ["builtinMap", { builtinMap: countingMap(smallMap) }],
      ["nB", { nB: 1500 }],
      ["nG", { nG: 3000 }],
      ["masteredWordKeys", { masteredWordKeys: keys(1, 999).concat(keys(3000, 3010)) }],
      ["effectiveColor", { effectiveColor: "orange" }]
    ];
    for (const [name, change] of cases) {
      // 每輪先以基準填入快取，再只改一個鍵
      I.islandsOf(base);
      const inp = Object.assign({}, base, change);
      const want = expected(inp);
      const mapSpy = inp.builtinMap;
      mapSpy.calls = 0;
      const got = I.islandsOf(inp);
      assert.deepEqual(got, want, name);
      assert.ok(mapSpy.calls > 0, name + " 改變時應重算");
      assert.notDeepEqual(got, expected(base), name + " 的測試資料應讓結果不同");
      // 改變後的這組再呼叫 → 命中
      mapSpy.calls = 0;
      assert.deepEqual(I.islandsOf(inp), want, name + " 第二次");
      assert.equal(mapSpy.calls, 0, name + " 第二次應命中");
    }
    // 具體數值抽查
    assert.deepEqual(I.islandsOf(Object.assign({}, base, { nB: 1500 })).map((x) => [x.n, x.m]), [[1000, 250], [500, 10], [4120, 0]]);
    assert.deepEqual(I.islandsOf(Object.assign({}, base, { effectiveColor: "orange" })).map((x) => x.outOfGoal), [false, true, true]);
  });

  test("同一陣列原地加長 → 依長度偵測並重算", () => {
    const spy = countingMap(BUILTIN.map);
    const list = keys(1, 239);
    const inp = isl({ builtinMap: spy, masteredWordKeys: list });
    assert.deepEqual(I.islandsOf(inp).map((x) => x.m), [239, 0, 0]);
    list.push(keyOf(240));
    spy.calls = 0;
    const got = I.islandsOf(inp);
    assert.ok(spy.calls > 0);
    assert.deepEqual(got.map((x) => [x.m, x.p]), [[240, 24], [0, 0], [0, 0]]);
    list.push(keyOf(1001), keyOf(1002));
    assert.deepEqual(I.islandsOf(inp).map((x) => x.m), [240, 2, 0]);
    assert.deepEqual(I.islandsOf(inp), expected(inp));
  });

  test("Set 與非陣列輸入每次重算（不快取，且清掉舊快取）", () => {
    const spy = countingMap(BUILTIN.map);
    const set = new Set(AC_64_03_KEYS);
    const inp = isl({ builtinMap: spy, masteredWordKeys: set });
    for (let i = 0; i < 3; i++) {
      spy.calls = 0;
      assert.deepEqual(I.islandsOf(inp).map((x) => x.m), [250, 10, 0]);
      assert.ok(spy.calls > 0, "第 " + (i + 1) + " 次 Set 應重算");
    }
    // Set 原地加入也反映
    set.add(keyOf(251));
    assert.deepEqual(I.islandsOf(inp).map((x) => x.m), [251, 10, 0]);
    // 陣列命中後插入 Set／null 呼叫 → 下一次陣列呼叫重算
    const arr = isl({ builtinMap: spy, masteredWordKeys: AC_64_03_KEYS });
    I.islandsOf(arr);
    for (const other of [set, null]) {
      I.islandsOf(Object.assign({}, arr, { masteredWordKeys: other }));
      spy.calls = 0;
      assert.deepEqual(I.islandsOf(arr), expected(arr));
      assert.ok(spy.calls > 0, "非陣列呼叫後應重算");
    }
    assert.deepEqual(I.islandsOf(isl({ masteredWordKeys: null })).map((x) => x.m), [0, 0, 0]);
  });

  test("交錯兩組輸入 A、B、A 皆正確（單筆快取：回到 A 重算）", () => {
    const spy = countingMap(BUILTIN.map);
    const A = isl({ builtinMap: spy, masteredWordKeys: keys(1, 244), effectiveColor: "orange" });
    const B = isl({ builtinMap: spy, masteredWordKeys: keys(1, 245), effectiveColor: "orange" });
    const wantA = expected(A);
    const wantB = expected(B);
    assert.notDeepEqual(wantA, wantB);
    assert.deepEqual(I.islandsOf(A), wantA);
    assert.deepEqual(I.islandsOf(B), wantB);
    spy.calls = 0;
    assert.deepEqual(I.islandsOf(A), wantA);
    assert.ok(spy.calls > 0, "只留 1 筆，回到 A 應重算");
    assert.deepEqual(I.islandsOf(B), wantB);
    assert.deepEqual(I.islandsOf(A), wantA);
    // 對應翻面路徑：前後快照互不污染，feedbackOf 結果正確
    const snapOf = (inp) => I.state(Object.assign({ streakDays: 0, k: 0, q: 200, x: 11, d: 10 }, inp));
    assert.equal(I.feedbackOf(snapOf(A), snapOf(B)).text, "橘島長出第一棵椰子樹！");
    assert.equal(I.feedbackOf(snapOf(B), snapOf(B)), null);
  });

  test("瀏覽器環境：缺少 EMT.core.constants 時是否拋錯與未加快取前相同", () => {
    const sandbox = { console };
    sandbox.self = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(SOURCE, sandbox, { filename: "island.js" });
    const api = sandbox.EMT.core.island;
    // 不需要 N_O 的輸入（builtin 非陣列、builtinMap 不可查）照常回傳
    const none = api.islandsOf({ builtin: null, builtinMap: null, masteredWordKeys: [] });
    assert.deepEqual(Array.from(none, (x) => [x.n, x.m, x.p]), [[0, 0, null], [0, 0, null], [0, 0, null]]);
    assert.throws(() => api.islandsOf({ builtin: [{ rank: 1 }], builtinMap: null, masteredWordKeys: [] }), /EMT\.core\.constants/);
    assert.throws(() => api.islandsOf({ builtin: null, builtinMap: new Map(), masteredWordKeys: [] }), /EMT\.core\.constants/);
  });
});

describe("§15.2 性質：1,000 組隨機輸入不變式", () => {
  // 固定種子的亂數（mulberry32），結果可重現
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rand = rng(20261112);
  const pick = (list) => list[Math.floor(rand() * list.length)];
  const int = (max) => Math.floor(rand() * (max + 1));
  const weird = () => pick([NaN, -1, -100, Infinity, -Infinity, null, undefined, "7", 2.5, 0]);
  const num = (max) => (rand() < 0.2 ? weird() : int(max));

  function randomBuiltin() {
    const kind = rand();
    if (kind < 0.05) return pick([null, undefined, "x", 42, {}]);
    if (kind < 0.1) return [];
    if (kind < 0.4) return BUILTIN.sorted;
    const size = int(300);
    const list = [];
    for (let i = 0; i < size; i++) {
      list.push(rand() < 0.05 ? pick([null, { rank: NaN }, { rank: -3 }, { rank: "9" }]) : { rank: 1 + int(3500), word: "r" + i });
    }
    return list;
  }
  function randomMap(builtin) {
    if (rand() < 0.05) return pick([null, {}, [], "map"]);
    const map = new Map();
    if (Array.isArray(builtin)) {
      builtin.forEach((it, i) => { if (it && typeof it === "object") map.set("r" + i, it); });
      if (builtin === BUILTIN.sorted) return BUILTIN.map;
    }
    // 資料異常：對照表含字庫外的排名
    if (rand() < 0.3) map.set("ghost", { rank: 1 + int(3500) });
    return map;
  }
  function randomKeys(map) {
    if (rand() < 0.05) return pick([null, undefined, "w1", 3, {}]);
    const out = [];
    const pool = map instanceof Map ? Array.from(map.keys()) : [];
    const size = int(400);
    for (let i = 0; i < size; i++) {
      const r = rand();
      if (r < 0.7 && pool.length) out.push(pick(pool));
      else if (r < 0.8) out.push(keyOf(1 + int(TOTAL)));
      else if (r < 0.9) out.push("custom" + int(50));
      else out.push(pick([null, 5, {}, ""]));
    }
    return rand() < 0.2 ? new Set(out) : out;
  }

  test("P 為 0～100 整數或 null、階段與 P 一致、m ≤ n；全部欄位無 NaN／Infinity／負數／undefined", () => {
    let prev = null;
    for (let i = 0; i < 1000; i++) {
      const builtin = randomBuiltin();
      const builtinMap = randomMap(builtin);
      const inp = {
        builtin: builtin,
        builtinMap: builtinMap,
        nB: rand() < 0.5 ? num(3000) : 2809,
        nG: rand() < 0.5 ? num(6000) : 5620,
        masteredWordKeys: randomKeys(builtinMap),
        effectiveColor: pick(["orange", "brown", "green", "blue", "gold", "red", null, undefined]),
        streakDays: num(40),
        k: num(300),
        q: num(300),
        x: num(40),
        d: rand() < 0.2 ? weird() : 1 + int(30)
      };
      const st = rand() < 0.02 ? I.state(pick([null, undefined, 5, "x"])) : I.state(inp);
      const where = "第 " + i + " 組";
      assertClean(st, where);
      assert.equal(st.islands.length, 3);
      assert.deepEqual(st.islands.map((x) => x.island), ["orange", "brown", "green"]);
      for (const isl of st.islands) {
        assert.ok(isl.p === null || (Number.isInteger(isl.p) && isl.p >= 0 && isl.p <= 100), where + " P = " + isl.p);
        assert.equal(isl.stage, I.stageOf(isl.p), where);
        assert.ok(Number.isInteger(isl.n) && Number.isInteger(isl.m) && isl.m <= isl.n, where + " m > n");
        assert.equal(isl.p === null, isl.n === 0, where);
        assert.equal(typeof isl.outOfGoal, "boolean");
      }
      assert.ok(Number.isInteger(st.streakDays) && Number.isInteger(st.k) && Number.isInteger(st.q) && Number.isInteger(st.x));
      assert.ok(st.k <= st.q, where + " k > q");
      assert.ok(Number.isInteger(st.d) && st.d >= 1, where + " d");
      assert.ok(st.boatRatio >= 0 && st.boatRatio <= 1);
      assert.equal(st.boat === "docked", st.boatRatio === 1);
      assert.equal(st.remaining, Math.max(st.d - st.x, 0));
      assert.equal(st.weather, I.weatherOf(st.streakDays));
      assert.equal(st.lighthouse, I.lighthouseOf(st.k));
      // 組字結果也不含非法字樣
      assertClean(I.mapAltText(st), where + " mapAlt");
      assertClean(I.dialogText(st), where + " dialog");
      st.islands.forEach((isl) => assertClean(I.listRowOf(isl), where + " row"));
      if (prev) {
        const fb = I.feedbackOf(prev, st);
        if (fb !== null) {
          assert.ok(["levelUp", "docked", "mastered", "sailing"].includes(fb.kind));
          assert.ok(typeof fb.text === "string" && fb.text.length > 0);
          assertClean(fb, where + " feedback");
        }
      }
      prev = st;
    }
  });
});
