/*
 * FE-20 單元測試：今日學習紀錄核心 core/learning.js
 * 執行：node --test src/app/__tests__/learning.test.js
 * 依據：architecture.md v0.4 §7.7、§10.1「learning.test.js」列；契約 README §5.4 LR-1～LR-8、V-ST-09～V-ST-11
 * 涵蓋：AC-30-02、AC-30-03、AC-30-08、AC-30-09、AC-30-10、AC-30-13、AC-24-11
 */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { spawnSync } = require("node:child_process");

const C = require("../core/constants.js");
const L = require("../core/learning.js");

const CORE_DIR = path.join(__dirname, "..", "core");
const TODAY = "2026-10-30";

// 深度凍結測試輸入，確認函式不修改傳入值
function deepFreeze(obj) {
  if (obj && typeof obj === "object") {
    Object.getOwnPropertyNames(obj).forEach((k) => deepFreeze(obj[k]));
    Object.freeze(obj);
  }
  return obj;
}

// ── 模組載入（LD-1、LD-3） ─────────────────────────────────────────

test("learning.js：Node 以 require 載入，匯出 §7.7 全部函式且凍結", () => {
  const names = [
    "isValidLocalDate", "addDays", "compareDate", "emptyToday", "normalizeToday", "normalizeHistory",
    "syncHistory", "normalizeLearning", "record", "todayCount", "dailyGoal", "chartSeries", "masteryRate", "percentOf",
  ];
  names.forEach((n) => assert.equal(typeof L[n], "function", n));
  assert.ok(Object.isFrozen(L));
});

function loadInSandbox(files) {
  const sandbox = { console };
  sandbox.self = sandbox;
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const f of files) {
    vm.runInContext(fs.readFileSync(path.join(CORE_DIR, f), "utf8"), sandbox, { filename: f });
  }
  return sandbox;
}

test("learning.js：瀏覽器環境只需 constants、wordkey 即可載入並掛到 EMT.core.learning（LD-1）", () => {
  const sb = loadInSandbox(["constants.js", "wordkey.js", "learning.js"]);
  const api = sb.EMT.core.learning;
  assert.equal(typeof api.record, "function");
  // 只載入 constants、wordkey，其他 core 模組不存在也能正常運作
  assert.deepEqual(Object.keys(sb.EMT.core).sort(), ["constants", "learning", "wordkey"]);
  const r = api.record(null, null, " Latency ", TODAY);
  assert.equal(r.changed, true);
  assert.deepEqual(Array.from(r.todayLearned.wordKeys), ["latency"]);
  assert.equal(api.dailyGoal("green"), 15);
});

test("learning.js：缺少 wordkey 時載入丟出含模組名稱的 Error（LD-3）", () => {
  assert.throws(() => loadInSandbox(["constants.js", "learning.js"]), /EMT\.core\.wordkey/);
});

// ── 日期工具 ──────────────────────────────────────────────────────

test("isValidLocalDate：格式與實際存在的日期", () => {
  assert.equal(L.isValidLocalDate("2026-10-30"), true);
  assert.equal(L.isValidLocalDate("2024-02-29"), true); // 閏年
  assert.equal(L.isValidLocalDate("2026-02-29"), false);
  assert.equal(L.isValidLocalDate("2026-02-30"), false);
  assert.equal(L.isValidLocalDate("2026-13-40"), false);
  assert.equal(L.isValidLocalDate("2026-00-10"), false);
  assert.equal(L.isValidLocalDate("2026-04-31"), false);
  assert.equal(L.isValidLocalDate("yesterday"), false);
  assert.equal(L.isValidLocalDate("2026-1-5"), false);
  assert.equal(L.isValidLocalDate(" 2026-10-30"), false);
  assert.equal(L.isValidLocalDate("2026-10-30T00:00:00"), false);
  assert.equal(L.isValidLocalDate(null), false);
  assert.equal(L.isValidLocalDate(20261030), false);
  assert.equal(L.isValidLocalDate(undefined), false);
});

test("addDays：跨月、跨年、閏年", () => {
  assert.equal(L.addDays("2026-10-30", 0), "2026-10-30");
  assert.equal(L.addDays("2026-10-30", 2), "2026-11-01");
  assert.equal(L.addDays("2026-11-01", -1), "2026-10-31");
  assert.equal(L.addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(L.addDays("2027-01-01", -1), "2026-12-31");
  assert.equal(L.addDays("2027-01-05", -6), "2026-12-30");
  assert.equal(L.addDays("2024-02-28", 1), "2024-02-29");
  assert.equal(L.addDays("2026-02-28", 1), "2026-03-01");
  assert.equal(L.addDays("2026-10-30", -29), "2026-10-01");
  assert.equal(L.addDays("2026-03-15", -29), "2026-02-14");
});

test("addDays：日光節約日（美國 2026-03-08、2026-11-01；歐洲 2026-03-29、2026-10-25）前後連續", () => {
  const cases = [
    ["2026-03-07", 1, "2026-03-08"], ["2026-03-08", 1, "2026-03-09"], ["2026-03-09", -1, "2026-03-08"],
    ["2026-03-09", -2, "2026-03-07"], ["2026-10-31", 1, "2026-11-01"], ["2026-11-01", 1, "2026-11-02"],
    ["2026-11-02", -1, "2026-11-01"], ["2026-03-28", 2, "2026-03-30"], ["2026-10-26", -2, "2026-10-24"],
  ];
  for (const [d, n, want] of cases) assert.equal(L.addDays(d, n), want, `${d} ${n}`);
  // 逐日往前 400 天，每一步都恰好差 1 天、無重複或跳號
  let cur = "2027-01-31";
  const seen = new Set([cur]);
  for (let i = 0; i < 400; i++) {
    const prev = L.addDays(cur, -1);
    assert.equal(L.addDays(prev, 1), cur);
    assert.ok(!seen.has(prev));
    seen.add(prev);
    cur = prev;
  }
  assert.equal(cur, L.addDays("2027-01-31", -400));
});

test("addDays：不合法輸入回 null", () => {
  assert.equal(L.addDays("2026-02-30", 1), null);
  assert.equal(L.addDays("yesterday", 1), null);
  assert.equal(L.addDays("2026-10-30", 1.5), null);
  assert.equal(L.addDays(null, 1), null);
});

test("日期計算與時區無關：子行程以 TZ=America/New_York 執行結果相同（平台不支援則略過）", (t) => {
  const script = `
    const L = require(${JSON.stringify(path.join(CORE_DIR, "learning.js"))});
    const out = {
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      a: [L.addDays("2026-03-08", 1), L.addDays("2026-03-09", -1), L.addDays("2026-11-01", 1), L.addDays("2026-11-02", -1), L.addDays("2026-12-31", 1)],
      valid: [L.isValidLocalDate("2026-03-08"), L.isValidLocalDate("2026-11-01"), L.isValidLocalDate("2026-02-30")],
      h: L.normalizeHistory({ "2026-02-08": 1, "2026-02-07": 2, "2026-03-09": 3 }, "2026-03-09"),
      c: L.chartSeries({ "2026-03-08": 5 }, 1, "2026-03-09").map((x) => x.label + ":" + x.count),
    };
    process.stdout.write(JSON.stringify(out));
  `;
  const res = spawnSync(process.execPath, ["-e", script], { env: { ...process.env, TZ: "America/New_York" }, encoding: "utf8" });
  if (res.status !== 0) {
    t.skip("子行程執行失敗：" + res.stderr);
    return;
  }
  const out = JSON.parse(res.stdout);
  if (out.tz !== "America/New_York") {
    t.skip("此平台不支援以 TZ 環境變數設定時區（實際：" + out.tz + "）");
    return;
  }
  assert.deepEqual(out.a, ["2026-03-09", "2026-03-08", "2026-11-02", "2026-11-01", "2027-01-01"]);
  assert.deepEqual(out.valid, [true, true, false]);
  // 2026-03-09 往前 29 天 = 2026-02-08（含），02-07 捨棄
  assert.deepEqual(out.h, { "2026-02-08": 1, "2026-03-09": 3 });
  assert.deepEqual(out.c, ["3/3:0", "3/4:0", "3/5:0", "3/6:0", "3/7:0", "3/8:5", "3/9:1"]);
});

test("compareDate：字典序 = 日期序", () => {
  assert.equal(L.compareDate("2026-09-30", "2026-10-01"), -1);
  assert.equal(L.compareDate("2026-10-30", "2026-10-30"), 0);
  assert.equal(L.compareDate("2027-01-01", "2026-12-31"), 1);
});

// ── V-ST-09 今日紀錄 ──────────────────────────────────────────────

test("emptyToday：預設值，每次回傳新物件", () => {
  const a = L.emptyToday();
  const b = L.emptyToday();
  assert.deepEqual(a, { date: null, wordKeys: [] });
  assert.notEqual(a, b);
  assert.notEqual(a.wordKeys, b.wordKeys);
});

test("normalizeToday（V-ST-09、AC-30-13）：日期無效或不是今天 → 預設值", () => {
  const bad = [
    { date: "2026-10-29", wordKeys: ["a"] }, // 過去
    { date: "2026-10-31", wordKeys: ["a"] }, // 未來（時鐘被調回）
    { date: "2026-13-40", wordKeys: ["a"] },
    { date: "2026-02-30", wordKeys: ["a"] },
    { date: "yesterday", wordKeys: ["a"] },
    { date: null, wordKeys: ["a"] }, // date 為 null 時 wordKeys 一律 []
    { date: 20261030, wordKeys: ["a"] },
    { wordKeys: ["a"] },
  ];
  for (const t of bad) assert.deepEqual(L.normalizeToday(t, TODAY), { date: null, wordKeys: [] }, JSON.stringify(t));
  // 整欄型別錯誤
  for (const t of [null, undefined, [], "x", 3, true]) {
    assert.deepEqual(L.normalizeToday(t, TODAY), { date: null, wordKeys: [] });
  }
});

test("normalizeToday（V-ST-09 (b)）：今天 → 只留字串、C-2 正規化、捨棄空白、重複只留第一次", () => {
  const t = { date: TODAY, wordKeys: ["Latency", " latency ", "the", 5, null, "", "   ", "Take\t Into  Account", "THE", { a: 1 }, "monetization"] };
  assert.deepEqual(L.normalizeToday(t, TODAY), {
    date: TODAY,
    wordKeys: ["latency", "the", "take into account", "monetization"],
  });
  // wordKeys 不是陣列（shape 錯，防禦）→ 視為空
  assert.deepEqual(L.normalizeToday({ date: TODAY, wordKeys: "abc" }, TODAY), { date: TODAY, wordKeys: [] });
});

// ── V-ST-10 歷史 ──────────────────────────────────────────────────

test("normalizeHistory（V-ST-10、AC-30-13）：捨棄各種無效項目", () => {
  const h = {
    "2026-10-30": 4,
    "2026-10-29": 0,
    "2026-10-01": 7, // 今天往前第 29 天（含）
    "2026-09-30": 9, // 往前第 30 天 → 捨棄
    "2026-10-31": 2, // 未來 → 捨棄
    "2026-13-40": 1,
    "2026-02-30": 1,
    "yesterday": 1,
    "2026-10-28": -1,
    "2026-10-27": 1.5,
    "2026-10-26": "3",
    "2026-10-25": null,
    "2026-10-24": NaN,
    "2026-10-23": Infinity,
    "2026-10-22": 12,
  };
  assert.deepEqual(L.normalizeHistory(h, TODAY), {
    "2026-10-30": 4,
    "2026-10-29": 0,
    "2026-10-01": 7,
    "2026-10-22": 12,
  });
});

test("normalizeHistory：整欄型別錯誤 → {}", () => {
  for (const h of [null, undefined, [], [1, 2], "x", 3, true, new Date()]) {
    assert.deepEqual(L.normalizeHistory(h, TODAY), {});
  }
});

test("normalizeHistory（AC-30-09）：60 天連續紀錄修剪為最多 30 筆，範圍為今天往前第 29 天到今天", () => {
  const h = {};
  for (let i = 0; i < 60; i++) h[L.addDays(TODAY, -i)] = i;
  const out = L.normalizeHistory(h, TODAY);
  const keys = Object.keys(out).sort();
  assert.equal(keys.length, C.LEARNED_HISTORY_DAYS);
  assert.equal(keys[0], L.addDays(TODAY, -29));
  assert.equal(keys[29], TODAY);
});

// ── V-ST-11 一致性 ────────────────────────────────────────────────

test("syncHistory（V-ST-11）：今天 → 覆寫為長度；date 為 null → 刪除今天的鍵", () => {
  const h = deepFreeze({ "2026-10-29": 3, "2026-10-30": 99 });
  assert.deepEqual(L.syncHistory({ date: TODAY, wordKeys: ["a", "b"] }, h, TODAY), { "2026-10-29": 3, "2026-10-30": 2 });
  assert.deepEqual(L.syncHistory({ date: TODAY, wordKeys: [] }, h, TODAY), { "2026-10-29": 3, "2026-10-30": 0 });
  assert.deepEqual(L.syncHistory({ date: null, wordKeys: [] }, h, TODAY), { "2026-10-29": 3 });
  assert.deepEqual(L.syncHistory({ date: TODAY, wordKeys: ["a"] }, {}, TODAY), { "2026-10-30": 1 });
});

test("normalizeLearning（V-ST-09～V-ST-11、AC-30-13、AC-24-11）", () => {
  // 日期不是今天 → X = 0，今天的鍵移除，其他歷史保留
  let r = L.normalizeLearning({ todayLearned: { date: "2026-10-29", wordKeys: ["a"] }, learnedHistory: { "2026-10-29": 1, "2026-10-30": 5 } }, TODAY);
  assert.deepEqual(r, { todayLearned: { date: null, wordKeys: [] }, learnedHistory: { "2026-10-29": 1 } });
  // 今天、重複與未正規化 → 只計 1 次，歷史今天 = 長度
  r = L.normalizeLearning({ todayLearned: { date: TODAY, wordKeys: ["A", "a", " a "] }, learnedHistory: { "2026-10-30": 7 } }, TODAY);
  assert.deepEqual(r, { todayLearned: { date: TODAY, wordKeys: ["a"] }, learnedHistory: { "2026-10-30": 1 } });
  // 整欄型別錯誤只重設該欄
  r = L.normalizeLearning({ todayLearned: "bad", learnedHistory: { "2026-10-28": 2 } }, TODAY);
  assert.deepEqual(r, { todayLearned: { date: null, wordKeys: [] }, learnedHistory: { "2026-10-28": 2 } });
  r = L.normalizeLearning({ todayLearned: { date: TODAY, wordKeys: ["x"] }, learnedHistory: [] }, TODAY);
  assert.deepEqual(r, { todayLearned: { date: TODAY, wordKeys: ["x"] }, learnedHistory: { "2026-10-30": 1 } });
  // 缺欄位或 data 不是物件
  assert.deepEqual(L.normalizeLearning({}, TODAY), { todayLearned: { date: null, wordKeys: [] }, learnedHistory: {} });
  assert.deepEqual(L.normalizeLearning(null, TODAY), { todayLearned: { date: null, wordKeys: [] }, learnedHistory: {} });
});

// ── LR-3 記錄 ─────────────────────────────────────────────────────

test("record（AC-30-03）：A flip、A 再 flip、A quiz、B flip、C stt、E quiz → X 依序 1、1、1、2、3、4", () => {
  let t = { date: null, wordKeys: [] };
  let h = {};
  const events = ["A", "A", "a", "B", "C", "E"];
  const xs = [];
  const changed = [];
  for (const w of events) {
    const r = L.record(t, h, w, TODAY);
    t = r.todayLearned;
    h = r.learnedHistory;
    xs.push(L.todayCount(t, TODAY));
    changed.push(r.changed);
    // 每次記錄後歷史今天 = X（V-ST-11）
    assert.equal(h[TODAY], L.todayCount(t, TODAY));
  }
  assert.deepEqual(xs, [1, 1, 1, 2, 3, 4]);
  assert.deepEqual(changed, [true, false, false, true, true, true]);
  assert.deepEqual(t, { date: TODAY, wordKeys: ["a", "b", "c", "e"] });
});

test("record（LR-3 (2)、AC-30-07）：換日後重新計數，前一日歷史保留；換日本身不算 changed", () => {
  const t = deepFreeze({ date: "2026-10-29", wordKeys: ["a", "b", "c"] });
  const h = deepFreeze({ "2026-10-29": 3 });
  // 換日後同一個字仍算今天的新字
  let r = L.record(t, h, "a", TODAY);
  assert.equal(r.changed, true);
  assert.deepEqual(r.todayLearned, { date: TODAY, wordKeys: ["a"] });
  assert.deepEqual(r.learnedHistory, { "2026-10-29": 3, "2026-10-30": 1 });
  // 空字串：換日但 changed = false，回傳換日後的物件
  r = L.record(t, h, "   ", TODAY);
  assert.equal(r.changed, false);
  assert.deepEqual(r.todayLearned, { date: TODAY, wordKeys: [] });
  assert.equal(r.learnedHistory["2026-10-29"], 3);
  assert.equal(L.todayCount(r.todayLearned, TODAY), 0);
  // 非字串的 wordKey 也視為空
  assert.equal(L.record(t, h, null, TODAY).changed, false);
});

test("record（AC-30-09、AC-30-13）：記錄時修剪超出 30 天與未來的歷史，並以 C-2 正規化 wordKey", () => {
  const h = { "2026-09-30": 9, "2026-10-01": 8, "2026-11-05": 3, "2026-10-15": -2 };
  const r = L.record({ date: TODAY, wordKeys: ["Latency", "latency"] }, h, " LATENCY ", TODAY);
  // 既有清單正規化後已含 latency → 不變
  assert.equal(r.changed, false);
  assert.deepEqual(r.todayLearned, { date: TODAY, wordKeys: ["latency"] });
  assert.deepEqual(r.learnedHistory, { "2026-10-01": 8, "2026-10-30": 1 });
  const r2 = L.record(r.todayLearned, r.learnedHistory, "Take  Into Account", TODAY);
  assert.equal(r2.changed, true);
  assert.deepEqual(r2.todayLearned.wordKeys, ["latency", "take into account"]);
  assert.equal(Object.keys(r2.learnedHistory).length <= C.LEARNED_HISTORY_DAYS, true);
});

test("todayCount（LR-6）", () => {
  assert.equal(L.todayCount({ date: TODAY, wordKeys: ["a", "b"] }, TODAY), 2);
  assert.equal(L.todayCount({ date: "2026-10-29", wordKeys: ["a", "b"] }, TODAY), 0);
  assert.equal(L.todayCount({ date: null, wordKeys: [] }, TODAY), 0);
  assert.equal(L.todayCount(null, TODAY), 0);
  assert.equal(L.todayCount(undefined, TODAY), 0);
});

// ── 主控台顯示用計算 ──────────────────────────────────────────────

test("dailyGoal（AC-30-02、R-14）：依 COLOR_LEVELS 的 dailyNewWords，未知色級回 15", () => {
  assert.equal(L.dailyGoal("orange"), 10);
  assert.equal(L.dailyGoal("brown"), 10);
  assert.equal(L.dailyGoal("green"), 15);
  for (const c of C.COLOR_LEVELS) assert.equal(L.dailyGoal(c.id), c.dailyNewWords);
  assert.equal(L.dailyGoal("purple"), 15);
  assert.equal(L.dailyGoal(undefined), 15);
  assert.equal(L.dailyGoal(null), 15);
});

test("chartSeries（AC-30-08）：7 根由舊到新為 3、0、0、10、0、0、4，label 不補零", () => {
  const h = deepFreeze({ "2026-10-24": 3, "2026-10-27": 10, "2026-10-30": 4 });
  const s = L.chartSeries(h, 4, TODAY);
  assert.equal(s.length, C.DASHBOARD_CHART_DAYS);
  assert.deepEqual(s.map((x) => x.count), [3, 0, 0, 10, 0, 0, 4]);
  assert.deepEqual(s.map((x) => x.label), ["10/24", "10/25", "10/26", "10/27", "10/28", "10/29", "10/30"]);
  assert.deepEqual(s.map((x) => x.date), ["2026-10-24", "2026-10-25", "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30"]);
});

test("chartSeries（LR-6）：today 那根一律用 X；跨月與跨年 label", () => {
  // 歷史中的今天值與 X 不同時以 X 為準
  assert.equal(L.chartSeries({ "2026-10-30": 9 }, 2, TODAY)[6].count, 2);
  // 跨午夜：today 前進一天 → 最右為新日期且為 X（0），前一日保留
  const s = L.chartSeries({ "2026-10-30": 4 }, 0, "2026-10-31");
  assert.deepEqual(s.slice(-2).map((x) => [x.label, x.count]), [["10/30", 4], ["10/31", 0]]);
  // 跨月、跨年
  assert.deepEqual(L.chartSeries({}, 1, "2026-03-02").map((x) => x.label), ["2/24", "2/25", "2/26", "2/27", "2/28", "3/1", "3/2"]);
  assert.deepEqual(L.chartSeries({ "2026-12-31": 5 }, 1, "2027-01-02").map((x) => x.label + ":" + x.count),
    ["12/27:0", "12/28:0", "12/29:0", "12/30:0", "12/31:5", "1/1:0", "1/2:1"]);
  // 無效值當 0，不出現 NaN
  const bad = L.chartSeries({ "2026-10-29": "3", "2026-10-28": -1 }, NaN, TODAY);
  bad.forEach((x) => assert.ok(Number.isInteger(x.count) && x.count >= 0));
  // 自訂天數
  assert.equal(L.chartSeries({}, 0, TODAY, 3).length, 3);
});

test("masteryRate（AC-30-10、R-09）：200 張、50 掌握、10 個集外掌握 → 25%；空集合 → null", () => {
  const studySet = [];
  for (let i = 0; i < 200; i++) studySet.push({ wordKey: "w" + i, word: "w" + i });
  const mastered = [];
  for (let i = 0; i < 50; i++) mastered.push("w" + i);
  for (let i = 0; i < 10; i++) mastered.push("out" + i);
  deepFreeze(studySet);
  deepFreeze(mastered);
  assert.deepEqual(L.masteryRate(studySet, mastered), { numer: 50, denom: 200, percent: 25 });
  assert.deepEqual(L.masteryRate(studySet, new Set(mastered)), { numer: 50, denom: 200, percent: 25 });
  assert.deepEqual(L.masteryRate([], mastered), { numer: 0, denom: 0, percent: null });
  assert.deepEqual(L.masteryRate(null, null), { numer: 0, denom: 0, percent: null });
  // 四捨五入，比例不超過 100%
  assert.equal(L.masteryRate([{ wordKey: "a" }, { wordKey: "b" }, { wordKey: "c" }], ["a", "x", "y", "z"]).percent, 33);
});

test("percentOf（AC-30-10、AC-17-04）：10 題對 7 → 70；0 題 → null；夾在 0～100", () => {
  assert.equal(L.percentOf(7, 10), 70);
  assert.equal(L.percentOf(2, 3), 67);
  assert.equal(L.percentOf(0, 0), null);
  assert.equal(L.percentOf(0, -1), null);
  assert.equal(L.percentOf(1, 1.5), null);
  assert.equal(L.percentOf(1, NaN), null);
  assert.equal(L.percentOf(NaN, 10), null);
  assert.equal(L.percentOf(12, 10), 100);
  assert.equal(L.percentOf(-1, 10), 0);
});

// ── 不修改輸入 ────────────────────────────────────────────────────

test("全部函式不修改傳入值（深度凍結輸入後呼叫）", () => {
  const t = deepFreeze({ date: TODAY, wordKeys: ["B", "a", "a"] });
  const h = deepFreeze({ "2026-09-01": 1, "2026-10-29": 2, "2026-10-30": 5 });
  const data = deepFreeze({ todayLearned: t, learnedHistory: h, goal: { effectiveColor: "green" } });
  const snapshot = JSON.stringify(data);
  L.normalizeToday(t, TODAY);
  L.normalizeHistory(h, TODAY);
  L.syncHistory(t, h, TODAY);
  L.normalizeLearning(data, TODAY);
  const r = L.record(t, h, "c", TODAY);
  L.record(t, h, "a", "2026-10-31");
  L.todayCount(t, TODAY);
  L.chartSeries(h, 3, TODAY);
  assert.equal(JSON.stringify(data), snapshot);
  // 回傳值是新物件，可自由修改，不影響輸入
  assert.notEqual(r.todayLearned, t);
  assert.notEqual(r.learnedHistory, h);
  r.todayLearned.wordKeys.push("z");
  r.learnedHistory["2026-10-01"] = 1;
  assert.equal(JSON.stringify(data), snapshot);
});
