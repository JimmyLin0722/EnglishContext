/*
 * migrate-v3.test.js — 持久化 v2 → v3 遷移、RD-3、匯入 IM-9／IM-10（FE-73）
 * 依據：architecture.md v0.10 §4.10（persist、backup）、§7.21.1、§10.7 migrate-v3.test.js 列；
 *       契約 README §5.2、§5.3 MG-5～MG-8、RD-1、RD-3、RD-4、§6.2 步驟 3～9、IM-9、IM-10、§6.3（v0.15）、
 *       §7.7 V-ST-21、V-IMP-01；DS-32、SD-FB-62。
 * 涵蓋：AC-47-03、AC-47-04、AC-47-05、AC-47-06、E-113、E-114、E-116
 *
 * 做法：
 * - 以 FE-70 樣本（_samples/，唯讀）作為 v0.14／v0.7 實際寫出的資料；本檔只讀不寫，結束時比對 SHA-256 不變。
 * - 樣本日期 D = 2026-11-04（README）；store 以 now = D 當天 12:00（本地）啟動，另以 D + 1 驗證只有換日正規化差異（SD-FB-62）。
 * - 樣本的自訂單字與已掌握字屬真實字庫，store 與匯入 ctx 以 node:vm 載入 src/data/ 的真實內容資料（唯讀）。
 */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");

const C = require("../core/constants.js");
const P = require("../core/persist.js");
const B = require("../core/backup.js");
const L = require("../core/learning.js");
const PF = require("../core/part5flow.js");
const CONTENT = require("../core/content.js");
const dashboard = require("../views/dashboard.js");
const F = require("./_fixtures.js");

const SAMPLE_DIR = path.join(__dirname, "_samples");
const SAMPLE_FILES = ["v014-state.json", "v014-backup.json", "v07-state.json", "v07-backup.json"];
const DATA_DIR = path.join(__dirname, "..", "..", "data");
const KEY = C.STORAGE_KEYS.state;
const UNREADABLE = C.STORAGE_KEYS.unreadable;

/** 樣本本地日期 D 與 D + 1（README「本地日期」） */
const D = "2026-11-04";
const D1 = "2026-11-05";
const atD = () => new Date(2026, 10, 4, 12, 0, 0);
const atD1 = () => new Date(2026, 10, 5, 12, 0, 0);

const V1_KEYS = P.V1_DATA_KEYS.slice();
const V2_KEYS = P.V2_DATA_KEYS.slice();
const TRACK_KEYS = P.TRACK_KEYS.slice();
const TRACK_DEFAULTS = { flashcardPosition: null, part5CorrectIds: [], part5UnansweredOnly: false };

// ── 樣本（唯讀）──

function sha256(name) {
  return crypto.createHash("sha256").update(fs.readFileSync(path.join(SAMPLE_DIR, name))).digest("hex");
}
const HASH_BEFORE = Object.fromEntries(SAMPLE_FILES.map((f) => [f, sha256(f)]));

/** 樣本原字串（不重新排版） */
function sampleText(name) {
  return fs.readFileSync(path.join(SAMPLE_DIR, name), "utf8");
}
function sampleObj(name) {
  return JSON.parse(sampleText(name));
}

test.after(() => {
  // 樣本檔 diff 為 0（D-15）
  SAMPLE_FILES.forEach((f) => assert.equal(sha256(f), HASH_BEFORE[f], f + " 不得被修改"));
});

// ── 真實內容資料（src/data/，唯讀）──

let realContentCache = null;
/** 以 vm 沙箱依檔名順序載入 src/data/*.js，交給 core/content.load（與瀏覽器相同的全域變數） */
function realContent() {
  if (realContentCache) { return realContentCache; }
  const sandbox = {};
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  vm.createContext(sandbox);
  fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".js")).sort().forEach((f) => {
    vm.runInContext(fs.readFileSync(path.join(DATA_DIR, f), "utf8").replace(/^﻿/, ""), sandbox, { filename: f });
  });
  const g = {};
  ["MASTER_VOCAB_DATABASE", "DATA_SOURCE_REGISTRY", "VOCAB_MANIFEST", "PROJECT_LICENSE", "DOMAIN_TEMPLATES",
    "PART5_QUESTION_BANK", "DECODER_SENTENCES", "READING_STRATEGIES", "ACADEMIC_PHRASEBANK"].forEach((k) => {
    if (sandbox[k] !== undefined) { g[k] = JSON.parse(JSON.stringify(sandbox[k])); }
  });
  realContentCache = CONTENT.load(g);
  return realContentCache;
}

/** 以假 storage 與真實內容建立 store 並 init */
function storeWith(storage, now) {
  return F.makeStore({ storage: storage, content: realContent(), now: now || atD });
}

/** 匯入 ctx（與 store.importBackup 相同來源；v0.15 另帶 part5Ids） */
function importCtx(today, extra) {
  const ct = realContent();
  return Object.assign({ builtinKeys: ct.builtinMap, part5Length: ct.part5.length, today: today || D,
    part5Ids: PF.bankIdsOf(ct.part5) }, extra || {});
}

function pick(obj, keys) {
  const out = {};
  keys.forEach((k) => { out[k] = obj[k]; });
  return out;
}

function assertTrackDefaults(data, label) {
  TRACK_KEYS.forEach((k) => assert.deepEqual(data[k], TRACK_DEFAULTS[k], (label || "") + " " + k));
}

/** D + 1 的預期：V-ST-09～V-ST-11 換日正規化（todayLearned 回預設、learnedHistory 去掉超窗鍵與今天的鍵） */
function expectedHistoryAt(history, today) {
  const oldest = L.addDays(today, -(C.LEARNED_HISTORY_DAYS - 1));
  const out = {};
  Object.keys(history).forEach((k) => {
    if (k >= oldest && k <= today && k !== today) { out[k] = history[k]; }
  });
  return out;
}

// ════════════════════ 前提：樣本形狀 ════════════════════

test("前提：v014-state 為 schemaVersion 2、9 欄；v07-state 為 1、7 欄；樣本日期與 README 相同", () => {
  const s = sampleObj("v014-state.json");
  assert.equal(s.schemaVersion, 2);
  assert.deepEqual(Object.keys(s.data), V2_KEYS);
  assert.equal(s.data.todayLearned.date, D);
  assert.equal(s.data.streak.lastActiveDate, D);
  const v07 = sampleObj("v07-state.json");
  assert.equal(v07.schemaVersion, 1);
  assert.deepEqual(Object.keys(v07.data), V1_KEYS);
  assert.equal(P.localDate(atD()), D);
  assert.equal(P.localDate(atD1()), D1);
});

// ════════════════════ V-ST-21 (a)：v0.14 localStorage → v3 ════════════════════

test("V-ST-21 (a)：parseStored(v014-state) → ok、migrated、fieldsReset 空、前 9 欄與原 data 深度相等、3 欄為 null／[]／false", () => {
  const original = sampleObj("v014-state.json");
  const r = P.parseStored(sampleText("v014-state.json"));
  assert.equal(r.kind, "ok");
  assert.equal(r.migrated, true);
  assert.deepEqual(r.fieldsReset, []);
  assert.deepEqual(pick(r.data, V2_KEYS), original.data);
  assertTrackDefaults(r.data);
  assert.deepEqual(Object.keys(r.data), [...P.DATA_KEYS]);
  // 遷移結果以 v3 根結構驗證通過，寫出格式（PersistedDataWritten）亦通過
  const rec = P.buildRecord(r.data, atD());
  assert.equal(rec.schemaVersion, 3);
  assert.ok(P.validateStorageRecord(rec).ok);
  assert.ok(P.validatePersistedData(rec.data, { written: true, today: D }).ok);
});

test("V-ST-21 (a)：以 v014-state 預寫的假 storage（now = D 12:00）→ init 恰 1 次 setItem、主鍵 v3 12 欄、前 9 欄不變、無 unreadable、entryMode main；再 init → setItem 0 次、位元組不變（AC-47-04）", () => {
  const original = sampleObj("v014-state.json");
  const storage = F.fakeStorage({ [KEY]: sampleText("v014-state.json") });
  const { store } = storeWith(storage, atD);

  // 第一次 init：MG-7 寫回一次
  assert.deepEqual(storage.setCalls, [KEY]);
  assert.deepEqual(store.getStartup(), { status: "ok", migrated: true });
  assert.equal(storage.map.has(UNREADABLE), false);
  assert.equal(store.getState().runtime.entryMode, "main");
  const written = storage.map.get(KEY);
  const rec = JSON.parse(written);
  assert.deepEqual(Object.keys(rec), ["schemaVersion", "savedAt", "data"]);
  assert.equal(rec.schemaVersion, 3);
  assert.equal(rec.schemaVersion, C.CURRENT_SCHEMA_VERSION);
  assert.deepEqual(Object.keys(rec.data), [...P.DATA_KEYS]);
  assert.equal(Object.keys(rec.data).length, 12);
  // SD-FB-62：以樣本自身日期 D 執行，前 9 欄（含今日紀錄與歷史）與遷移前深度相等
  assert.deepEqual(pick(rec.data, V2_KEYS), original.data);
  assertTrackDefaults(rec.data, "主鍵");
  assert.ok(P.validateStorageRecord(rec).ok);
  assert.ok(P.validatePersistedData(rec.data, { written: true, today: D }).ok);
  // 記憶體與寫出相同
  assert.deepEqual(JSON.parse(JSON.stringify(store.getState().data)), rec.data);

  // 第二次 init：不再遷移（冪等），讀取路徑不呼叫 setItem（RD-4），主鍵位元組不變
  const callsBefore = storage.setCalls.length;
  const again = storeWith(storage, atD);
  assert.equal(storage.setCalls.length, callsBefore, "第二次 init setItem 0 次");
  assert.equal(storage.map.get(KEY), written, "主鍵位元組不變");
  assert.deepEqual(again.store.getStartup(), { status: "ok", migrated: false });
  assert.equal(again.store.getState().runtime.entryMode, "main");
  assert.deepEqual(JSON.parse(JSON.stringify(again.store.getState().data)), rec.data);
  assert.equal(storage.map.has(UNREADABLE), false);
});

test("V-ST-21 (a)：D + 1 啟動只有換日正規化差異（todayLearned 回預設、learnedHistory 去掉超窗鍵），其餘欄位深度相等（SD-FB-62）", () => {
  const original = sampleObj("v014-state.json");
  const storage = F.fakeStorage({ [KEY]: sampleText("v014-state.json") });
  const { store } = storeWith(storage, atD1);
  assert.deepEqual(storage.setCalls, [KEY]);
  const rec = JSON.parse(storage.map.get(KEY));
  assert.equal(rec.schemaVersion, 3);
  const same = V2_KEYS.filter((k) => k !== "todayLearned" && k !== "learnedHistory");
  assert.deepEqual(pick(rec.data, same), pick(original.data, same));
  assert.deepEqual(rec.data.todayLearned, { date: null, wordKeys: [] });
  assert.deepEqual(rec.data.learnedHistory, expectedHistoryAt(original.data.learnedHistory, D1));
  assertTrackDefaults(rec.data);
  assert.ok(P.validatePersistedData(rec.data, { written: true, today: D1 }).ok);
  assert.equal(store.getState().runtime.entryMode, "main");
  // 再 init 仍為 0 次寫入
  const n = storage.setCalls.length;
  storeWith(storage, atD1);
  assert.equal(storage.setCalls.length, n);
});

// ════════════════════ V-ST-21 (b)：v0.7 localStorage → v3 ════════════════════

test("V-ST-21 (b)：v07-state → parseStored 直接到 3（1 → 2 → 3），7 欄原值、學習紀錄 2 欄與 3 欄為預設", () => {
  const original = sampleObj("v07-state.json");
  const r = P.parseStored(sampleText("v07-state.json"));
  assert.equal(r.kind, "ok");
  assert.equal(r.migrated, true);
  assert.deepEqual(r.fieldsReset, []);
  assert.deepEqual(pick(r.data, V1_KEYS), original.data);
  assert.deepEqual(r.data.todayLearned, { date: null, wordKeys: [] });
  assert.deepEqual(r.data.learnedHistory, {});
  assertTrackDefaults(r.data);
  assert.deepEqual(Object.keys(r.data), [...P.DATA_KEYS]);
});

test("V-ST-21 (b)：以 v07-state 預寫的假 storage → init 恰 1 次 setItem、主鍵 v3 12 欄；再 init → 0 次、位元組不變", () => {
  const storage = F.fakeStorage({ [KEY]: sampleText("v07-state.json") });
  const { store } = storeWith(storage, atD);
  assert.deepEqual(storage.setCalls, [KEY]);
  assert.deepEqual(store.getStartup(), { status: "ok", migrated: true });
  assert.equal(storage.map.has(UNREADABLE), false);
  const written = storage.map.get(KEY);
  const rec = JSON.parse(written);
  assert.equal(rec.schemaVersion, 3);
  assert.deepEqual(Object.keys(rec.data), [...P.DATA_KEYS]);
  assertTrackDefaults(rec.data);
  assert.ok(P.validatePersistedData(rec.data, { written: true, today: D }).ok);
  const n = storage.setCalls.length;
  storeWith(storage, atD);
  assert.equal(storage.setCalls.length, n);
  assert.equal(storage.map.get(KEY), written);
});

// ════════════════════ V-ST-21 (c)：v0.14、v0.7 備份匯入 ════════════════════

test("V-ST-21 (c)：v014-backup 匯入成功、skipped 0、9 欄逐一相等、3 欄預設（AC-47-03、MG-8）", () => {
  const file = sampleObj("v014-backup.json");
  assert.equal(file.schemaVersion, 2);
  const r = B.importSteps(sampleText("v014-backup.json"), importCtx(D));
  assert.equal(r.ok, true);
  assert.equal(r.skipped, 0);
  V2_KEYS.forEach((k) => assert.deepEqual(r.data[k], file.data[k], k));
  assertTrackDefaults(r.data);
  assert.deepEqual(Object.keys(r.data), [...P.DATA_KEYS]);
  assert.ok(P.validatePersistedData(r.data, { written: true, today: D }).ok);
});

test("V-ST-21 (c)：v07-backup 匯入成功、skipped 0、7 欄逐一相等、學習紀錄與 3 欄為預設（AC-24-10、AC-47-03）", () => {
  const file = sampleObj("v07-backup.json");
  assert.equal(file.schemaVersion, 1);
  const r = B.importSteps(sampleText("v07-backup.json"), importCtx(D));
  assert.equal(r.ok, true);
  assert.equal(r.skipped, 0);
  V1_KEYS.forEach((k) => assert.deepEqual(r.data[k], file.data[k], k));
  assert.deepEqual(r.data.todayLearned, { date: null, wordKeys: [] });
  assert.deepEqual(r.data.learnedHistory, {});
  assertTrackDefaults(r.data);
});

test("V-ST-21 (c)：首次畫面以 store.importBackup 匯入兩個備份 → 主鍵 schemaVersion 3、12 欄、既有欄位與備份相同", async () => {
  for (const [name, keys] of [["v014-backup.json", V2_KEYS], ["v07-backup.json", V1_KEYS]]) {
    const file = sampleObj(name);
    const storage = F.fakeStorage();
    const { store, a } = F.makeStore({ storage: storage, content: realContent(), now: atD, firstRun: true });
    const r = await a.importBackup(sampleText(name), () => true);
    assert.deepEqual(r, { ok: true, skipped: 0 }, name);
    assert.deepEqual(storage.setCalls, [KEY], name);
    const rec = JSON.parse(storage.map.get(KEY));
    assert.equal(rec.schemaVersion, 3, name);
    assert.deepEqual(Object.keys(rec.data), [...P.DATA_KEYS], name);
    keys.forEach((k) => assert.deepEqual(rec.data[k], file.data[k], name + " " + k));
    assertTrackDefaults(rec.data, name);
    assert.equal(store.getState().runtime.entryMode, "main");
  }
});

// ════════════════════ V-ST-21 (d)：RD-3 矩陣 ════════════════════

/** v3 主鍵（以 v014-state 為底，3 欄填入合法的非預設值） */
function v3Record() {
  const s = sampleObj("v014-state.json");
  s.schemaVersion = 3;
  s.data.flashcardPosition = { wordKey: "monetization", ordinal: 3 };
  s.data.part5CorrectIds = ["p5-001", "p5-003", "p5-999"];
  s.data.part5UnansweredOnly = true;
  return s;
}

const RD3_BAD = {
  flashcardPosition: [[], "monetization", { wordKey: 1, ordinal: 1 }, { wordKey: "a", ordinal: 0 }],
  part5CorrectIds: [{}, null, "p5-001", 5],
  part5UnansweredOnly: ["true", 0, 1, null]
};

test("RD-3 矩陣（AC-47-05、E-116）：每欄 4 種錯誤 shape → 只重設該欄、其他 11 欄深度相等、fieldsReset 列出、非 unreadable", () => {
  const base = v3Record();
  const baseParsed = P.parseStored(JSON.stringify(base));
  assert.equal(baseParsed.kind, "ok");
  assert.deepEqual(baseParsed.fieldsReset, []);
  assert.deepEqual(baseParsed.data, base.data);
  for (const k of TRACK_KEYS) {
    RD3_BAD[k].forEach((bad) => {
      const rec = v3Record();
      rec.data[k] = bad;
      const label = k + " = " + JSON.stringify(bad);
      const r = P.parseStored(JSON.stringify(rec));
      assert.equal(r.kind, "ok", label);
      assert.equal(r.migrated, false, label);
      assert.deepEqual(r.fieldsReset, [k], label);
      assert.deepEqual(r.data[k], TRACK_DEFAULTS[k], label);
      P.DATA_KEYS.filter((x) => x !== k).forEach((x) => assert.deepEqual(r.data[x], base.data[x], label + "：" + x + " 不變"));
    });
  }
});

test("RD-3 矩陣（store）：錯誤 shape 的 v3 主鍵 → 不寫 unreadable、不提示讀取失敗（status ok）、啟動不呼叫 setItem（RD-4）", () => {
  for (const k of TRACK_KEYS) {
    RD3_BAD[k].forEach((bad) => {
      const rec = v3Record();
      rec.data[k] = bad;
      const text = JSON.stringify(rec);
      const storage = F.fakeStorage({ [KEY]: text });
      const { store } = storeWith(storage, atD);
      const label = k + " = " + JSON.stringify(bad);
      assert.deepEqual(store.getStartup(), { status: "ok", migrated: false }, label);
      assert.deepEqual(storage.setCalls, [], label);
      assert.equal(storage.map.has(UNREADABLE), false, label);
      assert.equal(storage.map.get(KEY), text, label);
      assert.deepEqual(store.getState().data[k], TRACK_DEFAULTS[k], label);
    });
  }
});

test("RD-3 (a)(c)(d)：缺鍵補預設（不列入 fieldsReset）；ids 捨棄非字串／空白／重複、題庫外 id 保留且順序不變；wordKey 依 C-2", () => {
  const miss = v3Record();
  TRACK_KEYS.forEach((k) => { delete miss.data[k]; });
  const r0 = P.parseStored(JSON.stringify(miss));
  assert.equal(r0.kind, "ok");
  assert.equal(r0.migrated, false);
  assert.deepEqual(r0.fieldsReset, []);
  assertTrackDefaults(r0.data);

  const items = v3Record();
  items.data.part5CorrectIds = [1, "p5-003", "", "   ", null, "p5-003", "p5-999", { id: "p5-001" }, "p5-001"];
  items.data.flashcardPosition = { wordKey: "  MONETIZATION  ", ordinal: 3 };
  const r = P.parseStored(JSON.stringify(items));
  assert.equal(r.kind, "ok");
  assert.deepEqual(r.fieldsReset, []);
  assert.deepEqual(r.data.part5CorrectIds, ["p5-003", "p5-999", "p5-001"]);
  assert.deepEqual(r.data.flashcardPosition, { wordKey: "monetization", ordinal: 3 });

  const blank = v3Record();
  blank.data.flashcardPosition = { wordKey: "   ", ordinal: 2 };
  const rb = P.parseStored(JSON.stringify(blank));
  assert.equal(rb.kind, "ok");
  assert.equal(rb.data.flashcardPosition, null);
  assert.deepEqual(rb.fieldsReset, []);

  // 其他欄位仍有錯 → 依 AC-18-05 整體重設
  const other = v3Record();
  other.data.part5CorrectIds = {};
  other.data.vocabQuiz.correct = 999;
  assert.equal(P.parseStored(JSON.stringify(other)).kind, "unreadable");
});

test("RD-3：v2 主鍵內即使有 3 個新鍵（含壞值）也一律以 MG-6 覆寫為預設（不採用、不列入 fieldsReset）", () => {
  const s = sampleObj("v014-state.json");
  s.data.flashcardPosition = { wordKey: "monetization", ordinal: 1 };
  s.data.part5CorrectIds = "bad";
  s.data.part5UnansweredOnly = true;
  const r = P.parseStored(JSON.stringify(s));
  assert.equal(r.kind, "ok");
  assert.equal(r.migrated, true);
  assert.deepEqual(r.fieldsReset, []);
  assertTrackDefaults(r.data);
});

// ════════════════════ RD-1 回歸（T-76）════════════════════

test("RD-1 回歸（T-76）：v2 主鍵 todayLearned／learnedHistory shape 錯 → 遷移後仍只重設該欄、migrated、非 unreadable", () => {
  const original = sampleObj("v014-state.json");
  for (const [k, bad] of [["todayLearned", []], ["todayLearned", "x"], ["learnedHistory", []], ["learnedHistory", null]]) {
    const s = sampleObj("v014-state.json");
    s.data[k] = bad;
    const text = JSON.stringify(s);
    const label = k + " = " + JSON.stringify(bad);
    const r = P.parseStored(text);
    assert.equal(r.kind, "ok", label);
    assert.equal(r.migrated, true, label);
    assert.deepEqual(r.fieldsReset, [k], label);
    assert.deepEqual(r.data[k], k === "todayLearned" ? { date: null, wordKeys: [] } : {}, label);
    V2_KEYS.filter((x) => x !== k).forEach((x) => assert.deepEqual(r.data[x], original.data[x], label + "：" + x));
    assertTrackDefaults(r.data, label);
    // store：遷移寫回一次，不寫 unreadable
    const storage = F.fakeStorage({ [KEY]: text });
    const { store } = storeWith(storage, atD);
    assert.deepEqual(store.getStartup(), { status: "ok", migrated: true }, label);
    assert.deepEqual(storage.setCalls, [KEY], label);
    assert.equal(storage.map.has(UNREADABLE), false, label);
    assert.equal(JSON.parse(storage.map.get(KEY)).schemaVersion, 3, label);
  }
  // v1 同樣：遷移後 RD-1 照常執行（兩欄必為預設，結果不變）
  const r1 = P.parseStored(sampleText("v07-state.json"));
  assert.deepEqual(r1.fieldsReset, []);
});

// ════════════════════ IM-9：v3 備份的新欄位 shape 錯 → format ════════════════════

/** v3 備份（以 v014-backup 為底，3 欄填入合法的非預設值） */
function v3Backup() {
  const o = sampleObj("v014-backup.json");
  o.schemaVersion = 3;
  o.data.flashcardPosition = { wordKey: "monetization", ordinal: 3 };
  o.data.part5CorrectIds = ["p5-001", "p5-003"];
  o.data.part5UnansweredOnly = false;
  return o;
}

test("IM-9 矩陣（AC-47-06 (c)、V-IMP-01）：3 欄存在但 shape 不符 → format", () => {
  const bad = [
    ["flashcardPosition", []], ["flashcardPosition", "monetization"], ["flashcardPosition", { wordKey: 1, ordinal: 1 }],
    ["flashcardPosition", { wordKey: "a", ordinal: 0 }], ["flashcardPosition", { wordKey: "a" }], ["flashcardPosition", { ordinal: 1 }],
    ["flashcardPosition", { wordKey: "a", ordinal: 1, extra: true }], ["flashcardPosition", { wordKey: "a", ordinal: 1.5 }],
    ["flashcardPosition", { wordKey: "a", ordinal: "10" }],
    ["part5CorrectIds", {}], ["part5CorrectIds", null], ["part5CorrectIds", "p5-001"],
    ["part5UnansweredOnly", "true"], ["part5UnansweredOnly", 0], ["part5UnansweredOnly", 1], ["part5UnansweredOnly", null]
  ];
  for (const [k, v] of bad) {
    const o = v3Backup();
    o.data[k] = v;
    assert.deepEqual(B.importSteps(JSON.stringify(o), importCtx(D)), { ok: false, error: "format" }, k + " = " + JSON.stringify(v));
  }
});

test("IM-9：flashcardPosition: null 合法（FB-59）；3 欄缺少不算錯誤、補預設值；合法值原樣匯入", () => {
  const o = v3Backup();
  o.data.flashcardPosition = null;
  const r = B.importSteps(JSON.stringify(o), importCtx(D));
  assert.equal(r.ok, true);
  assert.equal(r.data.flashcardPosition, null);

  for (const k of TRACK_KEYS) {
    const m = v3Backup();
    delete m.data[k];
    const rm = B.importSteps(JSON.stringify(m), importCtx(D));
    assert.equal(rm.ok, true, "缺 " + k);
    assert.deepEqual(rm.data[k], TRACK_DEFAULTS[k], "缺 " + k);
  }

  const ok = B.importSteps(JSON.stringify(v3Backup()), importCtx(D));
  assert.equal(ok.ok, true);
  assert.equal(ok.skipped, 0);
  assert.deepEqual(ok.data.flashcardPosition, { wordKey: "monetization", ordinal: 3 });
  assert.deepEqual(ok.data.part5CorrectIds, ["p5-001", "p5-003"]);
  assert.equal(ok.data.part5UnansweredOnly, false);
});

test("IM-9（store）：format 時不呼叫確認、記憶體與 localStorage 不變", async () => {
  const storage = F.fakeStorage({ [KEY]: sampleText("v014-state.json") });
  const { store, a } = storeWith(storage, atD);
  const before = store.getState();
  const mainBefore = storage.map.get(KEY);
  const calls = storage.setCalls.length;
  const o = v3Backup();
  o.data.part5UnansweredOnly = "true";
  let asked = 0;
  const r = await a.importBackup(JSON.stringify(o), () => { asked++; return true; });
  assert.deepEqual(r, { ok: false, error: "format" });
  assert.equal(asked, 0);
  assert.equal(store.getState(), before);
  assert.equal(storage.setCalls.length, calls);
  assert.equal(storage.map.get(KEY), mainBefore);
});

// ════════════════════ IM-10：項目層級 ════════════════════

test("IM-10 (2)(3)(5)（AC-47-06 (a)(b)、AC-45-07）：非字串、空白、重複 id 捨棄、題庫外 id 保留、wordKey 依 C-2 → 成功且 skipped 不變", () => {
  const baseline = B.importSteps(JSON.stringify(v3Backup()), importCtx(D));
  const o = v3Backup();
  o.data.part5CorrectIds = [7, "p5-003", "  ", "", null, "p5-003", "p5-999", false, "p5-001", "p5-999"];
  o.data.flashcardPosition = { wordKey: "  Not-In  The   Set ", ordinal: 9999 };
  const r = B.importSteps(JSON.stringify(o), importCtx(D));
  assert.equal(r.ok, true);
  assert.equal(r.skipped, baseline.skipped, "項目層級不計入略過筆數");
  assert.deepEqual(r.data.part5CorrectIds, ["p5-003", "p5-999", "p5-001"]);
  // 不與單字集比對：不存在的單字照存（步驟 9 依 FP-2 解析）
  assert.deepEqual(r.data.flashcardPosition, { wordKey: "not-in the set", ordinal: 9999 });
  const blank = v3Backup();
  blank.data.flashcardPosition = { wordKey: " \t ", ordinal: 2 };
  const rb = B.importSteps(JSON.stringify(blank), importCtx(D));
  assert.equal(rb.ok, true);
  assert.equal(rb.data.flashcardPosition, null);
  assert.ok(P.validatePersistedData(r.data, { written: true, today: D }).ok);
});

test("IM-10 (4)：開關開啟且 currentIndex 指向曾答對的題目 → 匯入後（V-ST-05 之後）已跳到其後第一題未答對", () => {
  const bank = PF.bankIdsOf(realContent().part5);
  assert.ok(bank.length >= 5);
  const o = v3Backup();
  o.data.part5 = { currentIndex: 2, lockedSelection: null, phase: "question", roundAnswered: 2, roundCorrect: 2, totalAnswered: 6, totalCorrect: 4 };
  o.data.part5CorrectIds = [bank[2], bank[3]];
  o.data.part5UnansweredOnly = true;
  const r = B.importSteps(JSON.stringify(o), importCtx(D));
  assert.equal(r.ok, true);
  assert.equal(r.data.part5.currentIndex, 4);
  assert.equal(r.data.part5.phase, "question");
  // 計數不變（UO-4 只移動題號）
  assert.equal(r.data.part5.roundAnswered, 2);
  assert.equal(r.data.part5.totalAnswered, 6);
  // 開關關閉 → 不跳
  o.data.part5UnansweredOnly = false;
  assert.equal(B.importSteps(JSON.stringify(o), importCtx(D)).data.part5.currentIndex, 2);
  // V-ST-05 先執行：currentIndex 超出題庫 → 0，再跳過曾答對的第 1 題
  const over = v3Backup();
  over.data.part5 = { currentIndex: bank.length + 5, lockedSelection: null, phase: "question", roundAnswered: 0, roundCorrect: 0, totalAnswered: 0, totalCorrect: 0 };
  over.data.part5CorrectIds = [bank[0]];
  over.data.part5UnansweredOnly = true;
  assert.equal(B.importSteps(JSON.stringify(over), importCtx(D)).data.part5.currentIndex, 1);
  // 未傳 part5Ids（舊呼叫端）→ 不做 UO-4
  o.data.part5UnansweredOnly = true;
  const noIds = importCtx(D);
  delete noIds.part5Ids;
  assert.equal(B.importSteps(JSON.stringify(o), noIds).data.part5.currentIndex, 2);
});

// ════════════════════ 版本錯誤訊息（AC-24-06、§6.3 v0.15）════════════════════

test("版本：schemaVersion 4、0、\"3\" → version；支援版本文字為「1、2、3」", () => {
  for (const [v, fv] of [[4, 4], [0, 0], ["3", null]]) {
    const o = v3Backup();
    o.schemaVersion = v;
    const r = B.importSteps(JSON.stringify(o), importCtx(D));
    assert.deepEqual(r, { ok: false, error: "version", fileVersion: fv }, JSON.stringify(v));
    const msg = dashboard.importMessage(r).text;
    assert.ok(msg.endsWith("支援版本：1、2、3）"), msg);
  }
  assert.equal(C.SUPPORTED_SCHEMA_VERSIONS.join("、"), "1、2、3");
  assert.equal(dashboard.importMessage({ ok: false, error: "version", fileVersion: 4 }).text,
    "備份檔版本不相容（檔案版本：4；支援版本：1、2、3）");
  // localStorage：4 → 無法讀取（舊版程式讀新版資料的對稱情況）
  const s = v3Record();
  s.schemaVersion = 4;
  assert.equal(P.parseStored(JSON.stringify(s)).kind, "unreadable");
});
