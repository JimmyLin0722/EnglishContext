/*
 * persist.test.js — 持久化預設值、StorageRecord 驗證與遷移單元測試（FE-06；FE-22 v0.8 升版）
 * 涵蓋：AC-01-04、AC-11-05、AC-18-01、AC-18-02、AC-18-05、AC-30-09、AC-30-12、AC-30-13、
 *       V-ST-01～03、V-ST-05、V-ST-09～V-ST-11、README §5.2、§5.3（MG-1～MG-4、RD-1、RD-2）
 * （FE-42）v0.10：預設分數 725（C.SCORE_DEFAULT，Q-39、GS-7）；既有分數 600、735 原值保留（GS-4）；
 *       723、"600"、600.5 仍為 unreadable（不四捨五入，GS-5）。以 600 代表「v0.9 以前既有分數」的資料刻意保留。
 * （FE-73）v0.15 持久化升版：record() 產生目前版本（3）且 data 12 欄；v2Record() 明確走 MG-5～MG-6 遷移路徑；
 *       v1 遷移結果改為 3；新增 3 欄的 shape／written 驗證、RD-3、ensureWritable、normalizeAfterLoad 第 4 參數（UO-4）。
 *       樣本檔的 V-ST-21、RD-3 矩陣、IM-9、IM-10 另見 migrate-v3.test.js。
 */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const P = require("../core/persist.js");
const C = require("../core/constants.js");

function sampleData() {
  return {
    goal: { draftScore: 300, appliedScore: 300, appliedColor: "brown", effectiveColor: "brown" },
    customVocab: [
      { id: "c_mh8x2k1a_4f9q", word: "Monetization", meaning: "營利化；變現", phonetic: "", pos: "", collocation: "",
        example: "", academicContext: "", origin: "manual", templateId: null, createdAt: "2026-10-29T08:30:00.000Z" },
      { id: "c_t1", word: "Bootstrap", meaning: "自助抽樣", phonetic: "", pos: "n.", collocation: "", example: "",
        academicContext: "統計", origin: "template", templateId: "biostat", createdAt: "2026-10-29T08:31:00.000Z" }
    ],
    masteredWordKeys: ["monetization", "ability"],
    vocabQuiz: { answered: 5, correct: 3 },
    part5: { currentIndex: 4, lockedSelection: null, phase: "question", roundAnswered: 4, roundCorrect: 2, totalAnswered: 10, totalCorrect: 6 },
    streak: { days: 3, lastActiveDate: "2026-10-29" },
    sttNoticeAcknowledged: true,
    todayLearned: { date: "2026-10-29", wordKeys: ["monetization", "bootstrap"] },
    learnedHistory: { "2026-10-28": 3, "2026-10-29": 2 },
    // v0.15（schemaVersion 3）：非預設值，驗證讀寫原樣保留（含題庫中不存在的 id，Q-71 A）
    flashcardPosition: { wordKey: "bootstrap", ordinal: 2 },
    part5CorrectIds: ["p5-001", "p5-999"],
    part5UnansweredOnly: true
  };
}

/** v1 的 7 個既有欄位 */
const V1_KEYS = ["goal", "customVocab", "masteredWordKeys", "vocabQuiz", "part5", "streak", "sttNoticeAcknowledged"];
/** v2 的 9 個欄位 */
const V2_KEYS = V1_KEYS.concat(["todayLearned", "learnedHistory"]);
/** v0.15 新增的 3 個選填欄位 */
const TRACK_KEYS = ["flashcardPosition", "part5CorrectIds", "part5UnansweredOnly"];
const TRACK_DEFAULTS = { flashcardPosition: null, part5CorrectIds: [], part5UnansweredOnly: false };

/** 只保留 v2 的 9 欄（v0.14 以前程式寫出的 data 形狀） */
function v2Data() {
  const d = sampleData();
  TRACK_KEYS.forEach((k) => { delete d[k]; });
  return d;
}

/**
 * v0.7 程式（schemaVersion 1）實際寫入 localStorage 的格式：
 * persist.buildRecord 以 JSON.stringify 寫出、PersistedData 只有 7 欄（無 todayLearned、learnedHistory）。
 * 刻意放入會在遷移後「一般讀取流程」才處理的值（冗餘色級不一致、currentIndex 超出題庫），驗證 MG-2 不重算、不清理。
 */
const V07_RAW = JSON.stringify({
  schemaVersion: 1,
  savedAt: "2026-10-29T15:42:10.123Z",
  data: {
    goal: { draftScore: 455, appliedScore: 300, appliedColor: "orange", effectiveColor: "orange" },
    customVocab: [
      { id: "c_mh8x2k1a_4f9q", word: "Monetization", meaning: "營利化；變現", phonetic: "", pos: "n.",
        collocation: "monetization strategy", example: "We studied the monetization of open data.", academicContext: "",
        origin: "manual", templateId: null, createdAt: "2026-10-28T08:30:00.000Z" },
      { id: "c_mh8x2k1b_z0x1", word: "Bootstrap", meaning: "自助抽樣法", phonetic: "", pos: "n.", collocation: "",
        example: "", academicContext: "以重複抽樣估計統計量的分布", origin: "template", templateId: "biostat",
        createdAt: "2026-10-28T08:31:00.000Z" }
    ],
    masteredWordKeys: ["monetization", "ability", "pay off"],
    vocabQuiz: { answered: 12, correct: 9 },
    part5: { currentIndex: 999, lockedSelection: 2, phase: "question", roundAnswered: 7, roundCorrect: 5, totalAnswered: 27, totalCorrect: 19 },
    streak: { days: 4, lastActiveDate: "2026-10-29" },
    sttNoticeAcknowledged: true
  }
});

/** 目前版本（CURRENT_SCHEMA_VERSION）的紀錄 */
function record(data, extra) {
  return Object.assign({ schemaVersion: C.CURRENT_SCHEMA_VERSION, savedAt: "2026-10-29T08:30:00.000Z", data: data }, extra || {});
}

/** v2 紀錄（刻意建立 v2 遷移輸入）：資料只有 9 欄 */
function v2Record(extra) {
  return Object.assign({ schemaVersion: 2, savedAt: "2026-10-29T08:30:00.000Z", data: v2Data() }, extra || {});
}

/** v1 紀錄：資料只有 7 個既有欄位 */
function v1Record(extra) {
  const d = v2Data();
  delete d.todayLearned;
  delete d.learnedHistory;
  return Object.assign({ schemaVersion: 1, savedAt: "2026-10-29T08:30:00.000Z", data: d }, extra || {});
}

function raw(obj) {
  return JSON.stringify(obj);
}

/** 依路徑修改樣本資料後檢查 parseStored 為 unreadable */
function expectUnreadable(mutate, label) {
  const d = sampleData();
  const rec = record(d);
  mutate(rec, d);
  const r = P.parseStored(raw(rec));
  assert.equal(r.kind, "unreadable", label);
  assert.deepEqual(r.data, P.defaultData(), label + "：以預設值啟動");
}

test("defaultData：契約 §5.2 預設值（AC-18-02；v0.10 預設分數 725 = C.SCORE_DEFAULT）", () => {
  assert.equal(C.SCORE_DEFAULT, 725);
  assert.deepEqual(P.defaultData().goal, { draftScore: 725, appliedScore: 725, appliedColor: "green", effectiveColor: "green" });
  assert.deepEqual(P.defaultData(), {
    goal: { draftScore: C.SCORE_DEFAULT, appliedScore: C.SCORE_DEFAULT, appliedColor: "green", effectiveColor: "green" },
    customVocab: [],
    masteredWordKeys: [],
    vocabQuiz: { answered: 0, correct: 0 },
    part5: { currentIndex: 0, lockedSelection: null, phase: "question", roundAnswered: 0, roundCorrect: 0, totalAnswered: 0, totalCorrect: 0 },
    streak: { days: 0, lastActiveDate: null },
    sttNoticeAcknowledged: false,
    todayLearned: { date: null, wordKeys: [] },
    learnedHistory: {},
    flashcardPosition: null,
    part5CorrectIds: [],
    part5UnansweredOnly: false
  });
  // 每次回傳新物件
  const a = P.defaultData();
  a.customVocab.push(1);
  a.todayLearned.wordKeys.push("x");
  a.learnedHistory["2026-10-30"] = 1;
  a.part5CorrectIds.push("p5-001");
  assert.equal(P.defaultData().customVocab.length, 0);
  assert.deepEqual(P.defaultData().todayLearned, { date: null, wordKeys: [] });
  assert.deepEqual(P.defaultData().learnedHistory, {});
  assert.deepEqual(P.defaultData().part5CorrectIds, []);
  // v0.15：12 欄（必填 9 欄 + 選填 3 欄，順序同契約）
  assert.deepEqual([...P.DATA_KEYS], V2_KEYS.concat(TRACK_KEYS));
  assert.equal(P.DATA_KEYS.length, 12);
  assert.deepEqual([...P.REQUIRED_DATA_KEYS], V2_KEYS);
  assert.deepEqual([...P.V2_DATA_KEYS], V2_KEYS);
  assert.deepEqual([...P.TRACK_KEYS], TRACK_KEYS);
  assert.deepEqual([...P.V1_DATA_KEYS], V1_KEYS);
  assert.deepEqual(Object.keys(P.defaultData()), [...P.DATA_KEYS]);
});

test("預設值與樣本皆通過驗證；與 storage-schema.json 範例一致", () => {
  assert.ok(P.validatePersistedData(P.defaultData()).ok);
  assert.ok(P.validatePersistedData(P.defaultData(), { written: true }).ok);
  assert.ok(P.validatePersistedData(sampleData()).ok);
  const schema = require("../../../docs/02-contract/storage-schema.json");
  assert.equal(schema.properties.schemaVersion.const, C.CURRENT_SCHEMA_VERSION);
  assert.deepEqual(schema.$defs.BackupFile.properties.schemaVersion.enum, [...C.SUPPORTED_SCHEMA_VERSIONS]);
  assert.deepEqual(schema.$defs.PersistedData.required, [...P.REQUIRED_DATA_KEYS]);
  assert.deepEqual(Object.keys(schema.$defs.PersistedData.properties), [...P.DATA_KEYS]);
  assert.deepEqual(schema.$defs.PersistedDataWritten.allOf[1].required, [...P.TRACK_KEYS]);
  assert.deepEqual(schema.$defs.TodayLearnedState.required, ["date", "wordKeys"]);
  const example = schema.examples[0];
  assert.ok(P.validateStorageRecord(example).ok);
  assert.deepEqual(example.data, P.defaultData());
  // 範例 2：有今日紀錄與歷史，符合寫出格式（today = 2026-10-30）
  const ex2 = schema.examples[1];
  assert.ok(P.validateStorageRecord(ex2).ok);
  assert.ok(P.validatePersistedData(ex2.data, { written: true, today: "2026-10-30" }).ok);
  const r = P.parseStored(JSON.stringify(ex2));
  assert.equal(r.kind, "ok");
  assert.deepEqual(r.fieldsReset, []);
  assert.deepEqual(r.data, ex2.data);
  // 範例 3（v0.15）：3 個新欄位有值，符合寫出格式且讀回原樣
  const ex3 = schema.examples[2];
  assert.ok(P.validateStorageRecord(ex3).ok);
  assert.ok(P.validatePersistedData(ex3.data, { written: true }).ok);
  const r3 = P.parseStored(JSON.stringify(ex3));
  assert.equal(r3.kind, "ok");
  assert.equal(r3.migrated, false);
  assert.deepEqual(r3.fieldsReset, []);
  assert.deepEqual(r3.data, ex3.data);
});

test("parseStored：鍵不存在 → missing + 預設值", () => {
  for (const v of [null, undefined]) {
    const r = P.parseStored(v);
    assert.equal(r.kind, "missing");
    assert.deepEqual(r.data, P.defaultData());
  }
});

test("parseStored：合法資料 → ok，資料原樣保留", () => {
  const d = sampleData();
  const r = P.parseStored(raw(record(d)));
  assert.equal(r.kind, "ok");
  assert.equal(r.migrated, false);
  assert.deepEqual(r.fieldsReset, []);
  assert.deepEqual(r.data, d);
});

test("parseStored：非 JSON、空字串、非物件 → unreadable（AC-18-05）", () => {
  for (const s of ["", "   ", "{", "not json", "undefined", "null", "[]", "1", "\"str\"", "true", "[{}]"]) {
    const r = P.parseStored(s);
    assert.equal(r.kind, "unreadable", JSON.stringify(s));
    assert.deepEqual(r.data, P.defaultData());
  }
});

test("parseStored：schemaVersion 缺失、非整數、大於目前版本（4）、0、負數 → unreadable", () => {
  expectUnreadable((rec) => { delete rec.schemaVersion; }, "缺失");
  expectUnreadable((rec) => { rec.schemaVersion = "1"; }, "字串");
  expectUnreadable((rec) => { rec.schemaVersion = "2"; }, "字串 2");
  expectUnreadable((rec) => { rec.schemaVersion = "3"; }, "字串 3");
  expectUnreadable((rec) => { rec.schemaVersion = 1.5; }, "小數");
  expectUnreadable((rec) => { rec.schemaVersion = 2.0000001; }, "小數 2.0000001");
  expectUnreadable((rec) => { rec.schemaVersion = null; }, "null");
  expectUnreadable((rec) => { rec.schemaVersion = C.CURRENT_SCHEMA_VERSION + 1; }, "大於目前版本");
  expectUnreadable((rec) => { rec.schemaVersion = 99; }, "大於目前版本 99");
  expectUnreadable((rec) => { rec.schemaVersion = 0; }, "不在支援清單");
  expectUnreadable((rec) => { rec.schemaVersion = -1; }, "負數");
});

test("parseStored：根結構缺欄、多餘欄、savedAt 格式錯 → unreadable", () => {
  expectUnreadable((rec) => { delete rec.savedAt; }, "缺 savedAt");
  expectUnreadable((rec) => { delete rec.data; }, "缺 data");
  expectUnreadable((rec) => { rec.extra = 1; }, "根多餘欄");
  expectUnreadable((rec) => { rec.savedAt = "yesterday"; }, "savedAt 非日期時間");
  expectUnreadable((rec) => { rec.savedAt = 123; }, "savedAt 非字串");
  expectUnreadable((rec) => { rec.data = []; }, "data 為陣列");
});

test("parseStored：PersistedData 缺欄（7 個既有必填欄位）→ unreadable（新兩欄缺少依 RD-1，另測）", () => {
  for (const k of V1_KEYS) {
    expectUnreadable((rec, d) => { delete d[k]; }, "缺 " + k);
  }
  expectUnreadable((rec, d) => { delete d.goal.appliedScore; }, "缺 goal.appliedScore");
  expectUnreadable((rec, d) => { delete d.part5.lockedSelection; }, "缺 part5.lockedSelection");
  expectUnreadable((rec, d) => { delete d.streak.lastActiveDate; }, "缺 streak.lastActiveDate");
  expectUnreadable((rec, d) => { delete d.customVocab[0].phonetic; }, "缺 customVocab.phonetic");
});

test("parseStored：多餘欄位（各層 additionalProperties: false）→ unreadable", () => {
  expectUnreadable((rec, d) => { d.extra = true; }, "data 多餘欄");
  expectUnreadable((rec, d) => { d.goal.color = "green"; }, "goal 多餘欄");
  expectUnreadable((rec, d) => { d.customVocab[0].note = "x"; }, "customVocab 多餘欄");
  expectUnreadable((rec, d) => { d.vocabQuiz.wrong = 2; }, "vocabQuiz 多餘欄");
  expectUnreadable((rec, d) => { d.part5.x = 0; }, "part5 多餘欄");
  expectUnreadable((rec, d) => { d.streak.x = 0; }, "streak 多餘欄");
  // v1、v2 也是：遷移後以 v3 完整驗證
  assert.equal(P.parseStored(raw(v1Record({ extra: 1 }))).kind, "unreadable");
  const v1 = v1Record();
  v1.data.extra = true;
  assert.equal(P.parseStored(raw(v1)).kind, "unreadable");
  const v2 = v2Record();
  v2.data.extra = true;
  assert.equal(P.parseStored(raw(v2)).kind, "unreadable");
});

test("parseStored：__proto__ 鍵視為多餘欄位，不污染原型", () => {
  const s = raw(record(sampleData())).replace("\"sttNoticeAcknowledged\":true", "\"sttNoticeAcknowledged\":true,\"__proto__\":{\"polluted\":1}");
  const r = P.parseStored(s);
  assert.equal(r.kind, "unreadable");
  assert.equal({}.polluted, undefined);
});

test("parseStored：型別錯、範圍錯、enum 錯、pattern 錯 → unreadable", () => {
  const cases = [
    [(r, d) => { d.goal.draftScore = "600"; }, "分數字串"],
    [(r, d) => { d.goal.draftScore = 602; }, "分數非 5 倍數"],
    [(r, d) => { d.goal.appliedScore = 5; }, "分數 < 10"],
    [(r, d) => { d.goal.appliedScore = 995; }, "分數 > 990"],
    [(r, d) => { d.goal.appliedScore = 600.5; }, "分數小數"],
    [(r, d) => { d.goal.appliedColor = "red"; }, "appliedColor 列舉"],
    [(r, d) => { d.goal.effectiveColor = "blue"; }, "effectiveColor 非開放色級"],
    [(r, d) => { d.customVocab = {}; }, "customVocab 非陣列"],
    [(r, d) => { d.customVocab[0] = "x"; }, "customVocab 元素非物件"],
    [(r, d) => { d.customVocab[0].id = "x_1"; }, "id pattern"],
    [(r, d) => { d.customVocab[0].id = "c_"; }, "id 太短"],
    [(r, d) => { d.customVocab[0].id = "c_" + "a".repeat(65); }, "id 太長"],
    [(r, d) => { d.customVocab[0].id = "c_a b"; }, "id 含空白"],
    [(r, d) => { d.customVocab[0].word = "   "; }, "word 空白"],
    [(r, d) => { d.customVocab[0].meaning = ""; }, "meaning 空"],
    [(r, d) => { d.customVocab[0].pos = null; }, "pos 非字串"],
    [(r, d) => { d.customVocab[0].origin = "import"; }, "origin 列舉"],
    [(r, d) => { d.customVocab[0].templateId = "cs"; }, "manual 但有 templateId"],
    [(r, d) => { d.customVocab[1].templateId = null; }, "template 但 templateId null"],
    [(r, d) => { d.customVocab[1].templateId = "law"; }, "templateId 列舉"],
    [(r, d) => { d.customVocab[0].createdAt = "2026/10/29"; }, "createdAt 格式"],
    [(r, d) => { d.masteredWordKeys = "a"; }, "masteredWordKeys 非陣列"],
    [(r, d) => { d.masteredWordKeys.push(""); }, "masteredWordKeys 空字串"],
    [(r, d) => { d.masteredWordKeys.push(3); }, "masteredWordKeys 非字串"],
    [(r, d) => { d.masteredWordKeys.push("ability"); }, "masteredWordKeys 重複"],
    [(r, d) => { d.vocabQuiz.answered = -1; }, "answered 負數"],
    [(r, d) => { d.vocabQuiz.answered = 1.5; }, "answered 小數"],
    [(r, d) => { d.part5.currentIndex = -1; }, "currentIndex 負數"],
    [(r, d) => { d.part5.lockedSelection = 4; }, "lockedSelection 超出"],
    [(r, d) => { d.part5.lockedSelection = "0"; }, "lockedSelection 字串"],
    [(r, d) => { d.part5.phase = "done"; }, "phase 列舉"],
    [(r, d) => { d.streak.days = -1; }, "days 負數"],
    [(r, d) => { d.streak.lastActiveDate = "2026-13-01"; }, "lastActiveDate 月份"],
    [(r, d) => { d.streak.lastActiveDate = "2026-1-1"; }, "lastActiveDate 格式"],
    [(r, d) => { d.sttNoticeAcknowledged = "false"; }, "布林字串"]
  ];
  for (const [fn, label] of cases) {
    expectUnreadable(fn, label);
  }
});

test("V-ST-03：跨欄位規則 → unreadable", () => {
  expectUnreadable((r, d) => { d.vocabQuiz = { answered: 2, correct: 3 }; }, "correct > answered");
  expectUnreadable((r, d) => { d.part5.roundCorrect = 5; }, "roundCorrect > roundAnswered");
  expectUnreadable((r, d) => { d.part5.roundAnswered = 11; d.part5.roundCorrect = 0; }, "roundAnswered > totalAnswered");
  expectUnreadable((r, d) => { d.part5.totalCorrect = 11; }, "totalCorrect > totalAnswered");
  expectUnreadable((r, d) => { d.customVocab[1].id = d.customVocab[0].id; }, "customVocab id 重複");
  expectUnreadable((r, d) => { d.customVocab[1].word = "  MONETIZATION "; }, "customVocab wordKey 重複");
  expectUnreadable((r, d) => { d.masteredWordKeys.push("Ability"); }, "masteredWordKeys 未正規化（大寫）");
  expectUnreadable((r, d) => { d.masteredWordKeys.push(" pay  off"); }, "masteredWordKeys 未正規化（空白）");
});

test("validatePersistedData：allowCustomDuplicates 只放寬 customVocab 的 id／wordKey 重複", () => {
  const d = sampleData();
  d.customVocab[1].id = d.customVocab[0].id;
  d.customVocab[1].word = "monetization";
  assert.equal(P.validatePersistedData(d).ok, false);
  assert.equal(P.validatePersistedData(d, { allowCustomDuplicates: true }).ok, true);
  d.vocabQuiz.correct = 99;
  assert.equal(P.validatePersistedData(d, { allowCustomDuplicates: true }).ok, false);
});

test("validateStorageRecord：回傳錯誤清單；schemaVersion 必須等於目前版本（3；v1、v2 須先遷移）", () => {
  const ok = P.validateStorageRecord(record(sampleData()));
  assert.deepEqual(ok, { ok: true, errors: [] });
  // 3 個新欄位為選填：只有 9 欄的 data 包在 v3 根結構仍通過
  assert.ok(P.validateStorageRecord(record(v2Data())).ok);
  for (const v of [1, 2, 4]) {
    const bad = P.validateStorageRecord(record(sampleData(), { schemaVersion: v }));
    assert.equal(bad.ok, false, String(v));
    assert.ok(bad.errors.length > 0);
  }
  // 9 欄必填：v1 的 7 欄資料直接驗證不通過
  assert.equal(P.validateStorageRecord(record(v1Record().data)).ok, false);
  assert.equal(P.validateStorageRecord(null).ok, false);
  assert.equal(P.validateStorageRecord([]).ok, false);
});

test("parseStored：任意字串輸入都不拋例外", () => {
  const seeds = [raw(record(sampleData())), raw(record(P.defaultData())), raw(v1Record()), raw(v2Record()), V07_RAW, "{\"schemaVersion\":1}", "{}"];
  let seed = 12345;
  const rand = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const inputs = [
    "\u0000", "\uD800", "{\"schemaVersion\":1,\"savedAt\":\"x\",\"data\":null}",
    "{\"schemaVersion\":1,\"savedAt\":\"2026-10-29T08:30:00.000Z\",\"data\":{\"goal\":null}}",
    "{\"schemaVersion\":1e400}", "{\"schemaVersion\":9007199254740993}", "[".repeat(5000), 42, {}, [], true,
    "{\"schemaVersion\":1,\"savedAt\":\"2026-10-29T08:30:00.000Z\",\"data\":[]}",
    "{\"schemaVersion\":2,\"savedAt\":\"2026-10-29T08:30:00.000Z\",\"data\":\"x\"}",
    "{\"schemaVersion\":2,\"savedAt\":\"2026-10-29T08:30:00.000Z\",\"data\":{\"todayLearned\":{\"__proto__\":1},\"learnedHistory\":[]}}"
  ];
  // 隨機截斷與替換字元
  for (let i = 0; i < 2000; i++) {
    const s = seeds[i % seeds.length];
    const cut = Math.floor(rand() * s.length);
    const pos = Math.floor(rand() * s.length);
    const ch = String.fromCharCode(Math.floor(rand() * 128));
    inputs.push(s.slice(0, cut));
    inputs.push(s.slice(0, pos) + ch + s.slice(pos + 1));
  }
  for (const s of inputs) {
    let r;
    assert.doesNotThrow(() => { r = P.parseStored(s); });
    assert.ok(["missing", "ok", "unreadable"].includes(r.kind));
    assert.ok(P.validatePersistedData(r.data).ok);
  }
});

test("normalizeAfterLoad：以 appliedScore 重算色級（V-ST-02、AC-01-04）", () => {
  const d = sampleData();
  d.goal.appliedColor = "gold"; // 冗餘欄位被竄改也會被覆蓋
  d.goal.effectiveColor = "orange";
  const out = P.normalizeAfterLoad(d, 50);
  assert.equal(out.goal.appliedScore, 300);
  assert.equal(out.goal.appliedColor, "brown");
  assert.equal(out.goal.effectiveColor, "brown");
  // 不修改傳入值
  assert.equal(d.goal.appliedColor, "gold");

  const blue = sampleData();
  blue.goal.appliedScore = 800;
  assert.deepEqual(P.normalizeAfterLoad(blue, 50).goal, { draftScore: 300, appliedScore: 800, appliedColor: "blue", effectiveColor: "green" });
  const gold = sampleData();
  gold.goal.appliedScore = 990;
  const g = P.normalizeAfterLoad(gold, 50).goal;
  assert.equal(g.appliedColor, "gold");
  assert.equal(g.effectiveColor, "green");
});

// ── v0.10（FE-42）：既有分數不轉換（GS-4）、資料層驗證不四捨五入（GS-5） ──

test("GS-4：v3 與 v2（遷移）紀錄的既有分數 600、735 讀取後原值保留，色級依 V-ST-02 重算（AC-26-06）", () => {
  for (const [score, color, eff, build] of [
    [600, "green", "green", (d) => record(d)], [735, "blue", "green", (d) => record(d)],
    [600, "green", "green", (d) => { TRACK_KEYS.forEach((k) => { delete d[k]; }); return record(d, { schemaVersion: 2 }); }]
  ]) {
    const d = sampleData();
    // 冗餘色級刻意填錯，驗證只重算色級、不動分數
    d.goal = { draftScore: score, appliedScore: score, appliedColor: "orange", effectiveColor: "orange" };
    const r = P.parseStored(raw(build(d)));
    assert.equal(r.kind, "ok", String(score));
    assert.equal(r.data.goal.draftScore, score);
    assert.equal(r.data.goal.appliedScore, score);
    const n = P.normalizeAfterLoad(r.data, 50, "2026-10-30");
    assert.deepEqual(n.goal, { draftScore: score, appliedScore: score, appliedColor: color, effectiveColor: eff }, String(score));
    // 寫回後仍為原值（不改寫為色級上限或下限）
    const rec = P.buildRecord(n, new Date("2026-10-30T01:00:00.000Z"));
    assert.equal(rec.schemaVersion, C.CURRENT_SCHEMA_VERSION);
    assert.equal(rec.data.goal.draftScore, score);
    assert.equal(rec.data.goal.appliedScore, score);
    assert.deepEqual(P.parseStored(JSON.stringify(rec)).data.goal, n.goal);
  }
});

test("GS-4：v1 紀錄（MG-2 遷移）的既有分數 600、735 原值保留，遷移後一般讀取只重算色級", () => {
  for (const [score, color] of [[600, "green"], [735, "blue"]]) {
    const rec = v1Record();
    rec.data.goal = { draftScore: score, appliedScore: score, appliedColor: "brown", effectiveColor: "brown" };
    const r = P.parseStored(raw(rec));
    assert.equal(r.kind, "ok", String(score));
    assert.equal(r.migrated, true);
    assert.deepEqual(r.data.goal, rec.data.goal, "MG-2：遷移不動 goal");
    const n = P.normalizeAfterLoad(r.data, 50, "2026-10-30");
    assert.deepEqual(n.goal, { draftScore: score, appliedScore: score, appliedColor: color, effectiveColor: "green" });
  }
});

test("GS-5：723、\"600\"、600.5 仍為 unreadable（資料層不四捨五入），以預設值 725 啟動", () => {
  const cases = [
    [(r, d) => { d.goal.draftScore = 723; }, "draftScore 723"],
    [(r, d) => { d.goal.appliedScore = 723; }, "appliedScore 723"],
    [(r, d) => { d.goal.draftScore = "600"; }, "draftScore \"600\""],
    [(r, d) => { d.goal.appliedScore = "600"; }, "appliedScore \"600\""],
    [(r, d) => { d.goal.draftScore = 600.5; }, "draftScore 600.5"],
    [(r, d) => { d.goal.appliedScore = 600.5; }, "appliedScore 600.5"]
  ];
  for (const [mutate, label] of cases) {
    expectUnreadable(mutate, label);
    const d = sampleData();
    const rec = record(d);
    mutate(rec, d);
    assert.equal(P.parseStored(raw(rec)).data.goal.appliedScore, 725, label);
  }
});

test("normalizeAfterLoad：V-ST-05 currentIndex 在範圍內保留（AC-11-05）、超出時重設", () => {
  const d = sampleData();
  d.part5.lockedSelection = 2;
  const keep = P.normalizeAfterLoad(d, 50);
  assert.equal(keep.part5.currentIndex, 4);
  assert.equal(keep.part5.lockedSelection, 2);

  const over = sampleData();
  over.part5.currentIndex = 50;
  over.part5.lockedSelection = 1;
  over.part5.phase = "summary";
  const r = P.normalizeAfterLoad(over, 50);
  assert.deepEqual(r.part5, { currentIndex: 0, lockedSelection: null, phase: "question", roundAnswered: 4, roundCorrect: 2, totalAnswered: 10, totalCorrect: 6 });

  // 題庫長度未知 → 不重設
  assert.equal(P.normalizeAfterLoad(over, undefined).part5.currentIndex, 50);
  // 題庫為空 → 重設
  assert.equal(P.normalizeAfterLoad(sampleData(), 0).part5.currentIndex, 0);
});

test("MIGRATIONS 為 1 → 2、2 → 3；migrate 對目前版本不變、v1 逐版遷移到 3、其他版本失敗", () => {
  assert.deepEqual(Object.keys(P.MIGRATIONS), ["1", "2"]);
  assert.ok(Object.isFrozen(P.MIGRATIONS));
  assert.equal(C.CURRENT_SCHEMA_VERSION, 3);
  const rec = record(sampleData());
  const m = P.migrate(rec);
  assert.equal(m.ok, true);
  assert.equal(m.migrated, false);
  assert.deepEqual(m.record, rec);
  assert.notEqual(m.record, rec);

  const v1 = v1Record();
  const snapshot = JSON.parse(JSON.stringify(v1));
  const m1 = P.migrate(v1);
  assert.equal(m1.ok, true);
  assert.equal(m1.migrated, true);
  assert.equal(m1.record.schemaVersion, C.CURRENT_SCHEMA_VERSION);
  assert.equal(m1.record.savedAt, v1.savedAt);
  assert.deepEqual(m1.record.data.todayLearned, { date: null, wordKeys: [] });
  assert.deepEqual(m1.record.data.learnedHistory, {});
  TRACK_KEYS.forEach((k) => assert.deepEqual(m1.record.data[k], TRACK_DEFAULTS[k], "1 → 2 → 3：" + k));
  assert.deepEqual(v1, snapshot, "不修改傳入值");

  // 2 → 3（MG-5、MG-6）：9 欄原值不動，3 欄一律覆寫為預設（即使 v2 內已有這 3 鍵也不採用）
  const v2 = v2Record();
  v2.data.flashcardPosition = { wordKey: "x", ordinal: 1 };
  v2.data.part5CorrectIds = ["p5-001"];
  v2.data.part5UnansweredOnly = true;
  const snap2 = JSON.parse(JSON.stringify(v2));
  const m2 = P.migrate(v2);
  assert.equal(m2.ok, true);
  assert.equal(m2.migrated, true);
  assert.equal(m2.record.schemaVersion, 3);
  V2_KEYS.forEach((k) => assert.deepEqual(m2.record.data[k], v2.data[k], "MG-6：" + k + " 原值不動"));
  TRACK_KEYS.forEach((k) => assert.deepEqual(m2.record.data[k], TRACK_DEFAULTS[k], "MG-6：" + k + " 覆寫為預設"));
  assert.deepEqual(v2, snap2, "不修改傳入值");

  for (const v of [0, 4, -1, 1.5, "1", "2", "3", null, undefined]) {
    assert.equal(P.migrate(record(sampleData(), { schemaVersion: v })).ok, false, String(v));
  }
  assert.equal(P.migrate(null).ok, false);
  // MG-1、MG-5：v1、v2 的 data 不是物件 → 遷移失敗
  for (const d of [null, [], "x", 1, true, undefined]) {
    assert.equal(P.migrate({ schemaVersion: 1, data: d }).ok, false, JSON.stringify(d));
    assert.equal(P.migrate({ schemaVersion: 2, data: d }).ok, false, JSON.stringify(d));
    assert.throws(() => P.MIGRATIONS[1](d), TypeError);
    assert.throws(() => P.MIGRATIONS[2](d), TypeError);
  }
});

test("buildRecord：組成 StorageRecord（schemaVersion = 目前版本 3）並可被 parseStored 讀回", () => {
  const d = sampleData();
  const rec = P.buildRecord(d, new Date("2026-10-30T01:02:03.000Z"));
  assert.deepEqual(rec, { schemaVersion: C.CURRENT_SCHEMA_VERSION, savedAt: "2026-10-30T01:02:03.000Z", data: d });
  assert.equal(rec.schemaVersion, 3);
  const r = P.parseStored(JSON.stringify(rec));
  assert.equal(r.kind, "ok");
  assert.deepEqual(r.data, d);
});

test("XSS 字串原樣保留（不跳脫、不拒絕）", () => {
  const d = sampleData();
  d.customVocab[0].word = "<img src=x onerror=alert(1)>";
  d.customVocab[0].example = "<script>alert('x')</script>";
  d.masteredWordKeys = ["<img src=x onerror=alert(1)>"];
  const r = P.parseStored(raw(record(d)));
  assert.equal(r.kind, "ok");
  assert.equal(r.data.customVocab[0].word, "<img src=x onerror=alert(1)>");
  assert.equal(r.data.customVocab[0].example, "<script>alert('x')</script>");
});

// ── v0.8（FE-22）：v1 → v2 遷移（MG-1～MG-4，AC-30-12、AC-18-05）──

test("v1 遷移：v0.7 實際格式 → ok、migrated、7 欄與原值深度相等、兩欄與 3 個新欄為預設、schemaVersion 3（AC-30-12、AC-47-04）", () => {
  const original = JSON.parse(V07_RAW);
  const r = P.parseStored(V07_RAW);
  assert.equal(r.kind, "ok");
  assert.equal(r.migrated, true);
  assert.deepEqual(r.fieldsReset, []);
  assert.equal(r.errors, undefined);
  for (const k of V1_KEYS) {
    assert.deepEqual(r.data[k], original.data[k], k + " 原值不動（MG-2：不重算色級、不做 V-ST-05）");
  }
  assert.deepEqual(r.data.todayLearned, { date: null, wordKeys: [] });
  assert.deepEqual(r.data.learnedHistory, {});
  TRACK_KEYS.forEach((k) => assert.deepEqual(r.data[k], TRACK_DEFAULTS[k], k));
  assert.deepEqual(Object.keys(r.data), [...P.DATA_KEYS]);
  // 呼叫端依 MG-3、MG-7 寫回：buildRecord 為 schemaVersion 3，且可再讀回（不再是 migrated）
  const rec = P.buildRecord(r.data, new Date("2026-10-30T01:00:00.000Z"));
  assert.equal(rec.schemaVersion, C.CURRENT_SCHEMA_VERSION);
  assert.ok(P.validateStorageRecord(rec).ok);
  assert.ok(P.validatePersistedData(rec.data, { written: true, today: "2026-10-30" }).ok);
  const again = P.parseStored(JSON.stringify(rec));
  assert.equal(again.kind, "ok");
  assert.equal(again.migrated, false);
  assert.deepEqual(again.data, r.data);
  // 遷移後才走一般讀取流程：重算色級、V-ST-05、學習紀錄正規化
  const n = P.normalizeAfterLoad(r.data, 50, "2026-10-30");
  assert.deepEqual(n.goal, { draftScore: 455, appliedScore: 300, appliedColor: "brown", effectiveColor: "brown" });
  assert.equal(n.part5.currentIndex, 0);
  assert.deepEqual(n.todayLearned, { date: null, wordKeys: [] });
  assert.deepEqual(n.learnedHistory, {});
});

test("v1 遷移：v1 內即使已有 todayLearned／learnedHistory 也一律覆寫為預設（MG-2）", () => {
  for (const [t, h] of [
    [{ date: "2026-10-29", wordKeys: ["a"] }, { "2026-10-29": 1 }],
    ["garbage", []],
    [null, null]
  ]) {
    const rec = v1Record();
    rec.data.todayLearned = t;
    rec.data.learnedHistory = h;
    const r = P.parseStored(raw(rec));
    assert.equal(r.kind, "ok", JSON.stringify([t, h]));
    assert.equal(r.migrated, true);
    assert.deepEqual(r.data.todayLearned, { date: null, wordKeys: [] });
    assert.deepEqual(r.data.learnedHistory, {});
  }
});

test("v1 遷移：data 不是物件 → unreadable（MG-1）；7 欄有誤 → unreadable（遷移後完整驗證）", () => {
  for (const d of [null, [], "x", 1, true]) {
    const r = P.parseStored(raw({ schemaVersion: 1, savedAt: "2026-10-29T08:30:00.000Z", data: d }));
    assert.equal(r.kind, "unreadable", JSON.stringify(d));
    assert.deepEqual(r.data, P.defaultData());
  }
  assert.equal(P.parseStored(raw({ schemaVersion: 1, savedAt: "2026-10-29T08:30:00.000Z" })).kind, "unreadable");
  const cases = [
    (d) => { delete d.goal; },
    (d) => { d.vocabQuiz.correct = 99; },
    (d) => { d.masteredWordKeys.push("Ability"); },
    (d) => { d.customVocab[1].id = d.customVocab[0].id; }
  ];
  cases.forEach((fn, i) => {
    const rec = v1Record();
    fn(rec.data);
    assert.equal(P.parseStored(raw(rec)).kind, "unreadable", "case " + i);
  });
  const badRoot = v1Record({ savedAt: "x" });
  assert.equal(P.parseStored(raw(badRoot)).kind, "unreadable");
});

// ── v0.8（FE-22）：讀取 RD-1（AC-30-13）；v0.15 起適用 schemaVersion 3（含遷移後）──

test("RD-1：v3 的 todayLearned 缺少或 shape 不符 → 只重設該欄，其他資料保留、不視為無法讀取", () => {
  const bad = [
    ["缺少", undefined],
    ["null", null],
    ["陣列", []],
    ["字串", "today"],
    ["數字", 3],
    ["缺 date", { wordKeys: [] }],
    ["缺 wordKeys", { date: null }],
    ["多餘鍵", { date: null, wordKeys: [], x: 1 }],
    ["date 為數字", { date: 20261029, wordKeys: [] }],
    ["date 為物件", { date: {}, wordKeys: [] }],
    ["wordKeys 非陣列", { date: "2026-10-29", wordKeys: "a" }],
    ["wordKeys 為物件", { date: "2026-10-29", wordKeys: { 0: "a" } }]
  ];
  for (const [label, v] of bad) {
    const d = sampleData();
    if (v === undefined) { delete d.todayLearned; } else { d.todayLearned = v; }
    const r = P.parseStored(raw(record(d)));
    assert.equal(r.kind, "ok", label);
    assert.equal(r.migrated, false, label);
    assert.deepEqual(r.fieldsReset, ["todayLearned"], label);
    assert.deepEqual(r.data.todayLearned, { date: null, wordKeys: [] }, label);
    const expected = sampleData();
    expected.todayLearned = { date: null, wordKeys: [] };
    assert.deepEqual(r.data, expected, label + "：其他欄位保留");
  }
});

test("RD-1：v3 的 learnedHistory 缺少或不是物件 → 只重設該欄", () => {
  for (const [label, v] of [["缺少", undefined], ["陣列", [3, 4]], ["null", null], ["字串", "x"], ["數字", 0], ["布林", true]]) {
    const d = sampleData();
    if (v === undefined) { delete d.learnedHistory; } else { d.learnedHistory = v; }
    const r = P.parseStored(raw(record(d)));
    assert.equal(r.kind, "ok", label);
    assert.deepEqual(r.fieldsReset, ["learnedHistory"], label);
    assert.deepEqual(r.data.learnedHistory, {}, label);
    assert.deepEqual(r.data.todayLearned, sampleData().todayLearned, label);
  }
  // 兩欄都壞 → 兩欄都重設
  const d = sampleData();
  delete d.todayLearned;
  d.learnedHistory = [];
  const r = P.parseStored(raw(record(d)));
  assert.equal(r.kind, "ok");
  assert.deepEqual(r.fieldsReset, ["todayLearned", "learnedHistory"]);
});

test("RD-1：shape 正確但內容無效 → 讀取不擋（ok、fieldsReset 空），由 normalizeAfterLoad 正規化（V-ST-09～V-ST-11）", () => {
  const d = sampleData();
  d.todayLearned = { date: "2026-02-30", wordKeys: [1, "  A  ", "a", ""] };
  d.learnedHistory = { "2026-13-40": 1, yesterday: 2, "2026-10-29": -1, "2026-10-28": 1.5, "2026-10-27": "3", "2026-10-26": 4, "2026-11-01": 9, "2026-09-30": 7 };
  const r = P.parseStored(raw(record(d)));
  assert.equal(r.kind, "ok");
  assert.deepEqual(r.fieldsReset, []);
  assert.deepEqual(r.data.learnedHistory, d.learnedHistory, "讀取時原樣保留，正規化屬下一步");
  const n = P.normalizeAfterLoad(r.data, 50, "2026-10-30");
  assert.deepEqual(n.todayLearned, { date: null, wordKeys: [] });
  // 2026-09-30 = today − 30 → 捨棄；2026-11-01 為未來 → 捨棄
  assert.deepEqual(n.learnedHistory, { "2026-10-26": 4 });
  assert.ok(P.validatePersistedData(n, { written: true, today: "2026-10-30" }).ok);
});

test("RD-1：新欄位重設後其他欄位仍有錯 → unreadable（AC-18-05）", () => {
  const d = sampleData();
  delete d.todayLearned;
  d.vocabQuiz.correct = 99;
  const r = P.parseStored(raw(record(d)));
  assert.equal(r.kind, "unreadable");
  assert.deepEqual(r.data, P.defaultData());
  // data 不是物件 → unreadable（不套用 RD-1）
  for (const v of [[], null, "x"]) {
    assert.equal(P.parseStored(raw(record(v))).kind, "unreadable", JSON.stringify(v));
  }
});

test("resetLearningFields：不修改傳入值；非物件原樣回傳", () => {
  const d = sampleData();
  d.todayLearned = [];
  const snap = JSON.parse(JSON.stringify(d));
  const r = P.resetLearningFields(d);
  assert.deepEqual(d, snap);
  assert.deepEqual(r.fieldsReset, ["todayLearned"]);
  assert.notEqual(r.data, d);
  assert.deepEqual(P.resetLearningFields(null), { data: null, fieldsReset: [] });
});

// ── v0.8（FE-22）：validatePersistedData shape／written 兩種模式 ──

test("validatePersistedData：shape 模式只擋整欄型別錯，written 模式要求正規化格式（$defs/PersistedDataWritten）", () => {
  const shapeOk = sampleData();
  shapeOk.todayLearned = { date: "yesterday", wordKeys: [1, "A", "a"] };
  shapeOk.learnedHistory = { bad: -1 };
  assert.ok(P.validatePersistedData(shapeOk).ok);
  assert.equal(P.validatePersistedData(shapeOk, { written: true }).ok, false);

  // 每個欄位單獨違反寫出格式
  const writtenBad = [
    (d) => { d.todayLearned = { date: "2026-02-30", wordKeys: [] }; },
    (d) => { d.todayLearned = { date: "2026-10-29", wordKeys: ["A"] }; },
    (d) => { d.todayLearned = { date: "2026-10-29", wordKeys: ["a", "a"] }; },
    (d) => { d.todayLearned = { date: "2026-10-29", wordKeys: [" "] }; },
    (d) => { d.todayLearned = { date: "2026-10-29", wordKeys: [3] }; },
    (d) => { d.todayLearned = { date: null, wordKeys: ["a"] }; },
    (d) => { d.learnedHistory = { "2026-10-29": 1.5 }; },
    (d) => { d.learnedHistory = { "2026-10-29": -1 }; },
    (d) => { d.learnedHistory = { "2026-10-29": "1" }; },
    (d) => { d.learnedHistory = { "2026-13-01": 1 }; },
    (d) => {
      const h = {};
      for (let i = 1; i <= 31; i++) { h["2026-08-" + String(i).padStart(2, "0")] = 1; }
      d.learnedHistory = h;
    }
  ];
  writtenBad.forEach((fn, i) => {
    const d = sampleData();
    fn(d);
    assert.ok(P.validatePersistedData(d).ok, "shape ok " + i);
    assert.equal(P.validatePersistedData(d, { written: true }).ok, false, "written bad " + i);
  });
  assert.ok(P.validatePersistedData(sampleData(), { written: true }).ok);

  // written 也包含 shape 與其他欄位
  const d = sampleData();
  d.todayLearned = [];
  assert.equal(P.validatePersistedData(d, { written: true }).ok, false);
  assert.equal(P.validatePersistedData(d).ok, false);
});

test("validatePersistedData：written + today 另檢查 V-ST-09～V-ST-11", () => {
  const today = "2026-10-29";
  assert.ok(P.validatePersistedData(sampleData(), { written: true, today: today }).ok);
  // date 不是今天
  assert.equal(P.validatePersistedData(sampleData(), { written: true, today: "2026-10-30" }).ok, false);
  // 歷史超出視窗
  const old = sampleData();
  old.learnedHistory["2026-09-30"] = 1; // today − 29 = 2026-09-30 → 視窗內
  assert.ok(P.validatePersistedData(old, { written: true, today: today }).ok);
  old.learnedHistory["2026-09-29"] = 1;
  assert.equal(P.validatePersistedData(old, { written: true, today: today }).ok, false);
  const future = sampleData();
  future.learnedHistory["2026-10-30"] = 1;
  assert.equal(P.validatePersistedData(future, { written: true, today: today }).ok, false);
  // V-ST-11 不一致
  const mismatch = sampleData();
  mismatch.learnedHistory[today] = 5;
  assert.equal(P.validatePersistedData(mismatch, { written: true, today: today }).ok, false);
  const nullToday = sampleData();
  nullToday.todayLearned = { date: null, wordKeys: [] };
  assert.equal(P.validatePersistedData(nullToday, { written: true, today: today }).ok, false, "今天無紀錄卻有今天的鍵");
  delete nullToday.learnedHistory[today];
  assert.ok(P.validatePersistedData(nullToday, { written: true, today: today }).ok);
  // today 不合法時忽略今天相關規則
  assert.ok(P.validatePersistedData(sampleData(), { written: true, today: "2026-02-30" }).ok);
});

// ── v0.8（FE-22）：normalizeAfterLoad 的第 3 參數 today ──

test("normalizeAfterLoad：以 today 套 V-ST-09～V-ST-11；結果通過 written 驗證；不修改傳入值", () => {
  const d = sampleData();
  const snap = JSON.parse(JSON.stringify(d));
  const same = P.normalizeAfterLoad(d, 50, "2026-10-29");
  assert.deepEqual(same.todayLearned, { date: "2026-10-29", wordKeys: ["monetization", "bootstrap"] });
  assert.deepEqual(same.learnedHistory, { "2026-10-28": 3, "2026-10-29": 2 });
  // 跨日：前一天的紀錄歸零，歷史保留（AC-30-07、AC-30-09）
  const next = P.normalizeAfterLoad(d, 50, "2026-10-30");
  assert.deepEqual(next.todayLearned, { date: null, wordKeys: [] });
  assert.deepEqual(next.learnedHistory, { "2026-10-28": 3, "2026-10-29": 2 });
  assert.ok(P.validatePersistedData(next, { written: true, today: "2026-10-30" }).ok);
  // 一致性：歷史中的今天被 todayLearned 長度覆寫
  const inc = sampleData();
  inc.learnedHistory["2026-10-29"] = 99;
  assert.equal(P.normalizeAfterLoad(inc, 50, "2026-10-29").learnedHistory["2026-10-29"], 2);
  assert.deepEqual(d, snap);
});

test("normalizeAfterLoad：today 缺省或不合法時以本地今天計", () => {
  const today = P.localDate(new Date());
  const d = sampleData();
  d.todayLearned = { date: today, wordKeys: ["x"] };
  d.learnedHistory = {};
  for (const t of [undefined, null, "", "2026-02-30", 20261030]) {
    const n = P.normalizeAfterLoad(d, 50, t);
    assert.deepEqual(n.todayLearned, { date: today, wordKeys: ["x"] }, String(t));
    assert.deepEqual(n.learnedHistory, { [today]: 1 }, String(t));
  }
});

test("localDate：本地日期 YYYY-MM-DD", () => {
  assert.equal(P.localDate(new Date(2026, 0, 5, 23, 59, 59)), "2026-01-05");
  assert.equal(P.localDate(new Date(2026, 11, 31, 0, 0, 0)), "2026-12-31");
  assert.match(P.localDate(), /^\d{4}-\d{2}-\d{2}$/);
  assert.match(P.localDate(new Date(NaN)), /^\d{4}-\d{2}-\d{2}$/);
});

test("isTodayLearnedShape／isLearnedHistoryShape 對照 $defs/TodayLearnedState、$defs/LearnedHistory", () => {
  assert.ok(P.isTodayLearnedShape({ date: null, wordKeys: [] }));
  assert.ok(P.isTodayLearnedShape({ date: "anything", wordKeys: [1, null] }));
  for (const v of [null, [], "x", {}, { date: null }, { wordKeys: [] }, { date: 1, wordKeys: [] }, { date: null, wordKeys: {} }, { date: null, wordKeys: [], z: 0 }]) {
    assert.equal(P.isTodayLearnedShape(v), false, JSON.stringify(v));
  }
  assert.ok(P.isLearnedHistoryShape({}));
  assert.ok(P.isLearnedHistoryShape({ x: "y" }));
  for (const v of [null, [], "x", 1, true, undefined]) {
    assert.equal(P.isLearnedHistoryShape(v), false, String(v));
  }
});

test("LD-1：persist.js 載入時不取用 goal、learning、position、part5flow（只有 constants、wordkey 時可載入，呼叫時缺模組丟出含名稱的錯誤）", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const vm = require("node:vm");
  const sandbox = { console: console };
  sandbox.self = sandbox;
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const f of ["constants.js", "wordkey.js", "persist.js"]) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "core", f), "utf8"), sandbox, { filename: f });
  }
  const VP = sandbox.EMT.core.persist;
  assert.ok(VP);
  assert.throws(() => VP.parseStored("{}"), /EMT\.core\.(goal|learning)/);
  assert.throws(() => VP.defaultData(), /EMT\.core\.goal/);
  for (const f of ["goal.js", "learning.js"]) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "core", f), "utf8"), sandbox, { filename: f });
  }
  // v0.15：position、part5flow 也在呼叫時才取用（LD-3：缺漏時丟出含名稱的錯誤，不誤判為資料無法讀取）
  assert.throws(() => VP.parseStored(V07_RAW), /EMT\.core\.position/);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "core", "position.js"), "utf8"), sandbox, { filename: "position.js" });
  assert.throws(() => VP.parseStored(V07_RAW), /EMT\.core\.part5flow/);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "core", "part5flow.js"), "utf8"), sandbox, { filename: "part5flow.js" });
  assert.equal(VP.parseStored(V07_RAW).kind, "ok");
});

// ── v0.15（FE-73）：3 個新欄位（flashcardPosition、part5CorrectIds、part5UnansweredOnly）──

test("trackDefaults：§5.2 預設值，每次回傳新物件", () => {
  assert.deepEqual(P.trackDefaults(), TRACK_DEFAULTS);
  const a = P.trackDefaults();
  a.part5CorrectIds.push("x");
  assert.deepEqual(P.trackDefaults().part5CorrectIds, []);
});

test("isTrackShape：對照 $defs/FlashcardPosition、$defs/Part5CorrectIds、boolean", () => {
  assert.ok(P.isTrackShape("flashcardPosition", null));
  assert.ok(P.isTrackShape("flashcardPosition", { wordKey: "a", ordinal: 1 }));
  assert.ok(P.isTrackShape("flashcardPosition", { wordKey: "   ", ordinal: 3 }), "內容無效不屬 shape");
  for (const v of [[], "a", 1, true, {}, { wordKey: "a" }, { ordinal: 1 }, { wordKey: 1, ordinal: 1 }, { wordKey: "a", ordinal: 0 },
    { wordKey: "a", ordinal: 1.5 }, { wordKey: "a", ordinal: "10" }, { wordKey: "a", ordinal: 1, x: 0 }, undefined]) {
    assert.equal(P.isTrackShape("flashcardPosition", v), false, JSON.stringify(v));
  }
  assert.ok(P.isTrackShape("part5CorrectIds", []));
  assert.ok(P.isTrackShape("part5CorrectIds", [1, null, "  "]), "項目層級不屬 shape");
  for (const v of [{}, null, "p5-001", 1, true, undefined]) {
    assert.equal(P.isTrackShape("part5CorrectIds", v), false, String(v));
  }
  assert.ok(P.isTrackShape("part5UnansweredOnly", true));
  assert.ok(P.isTrackShape("part5UnansweredOnly", false));
  for (const v of ["true", 0, 1, null, undefined, {}]) {
    assert.equal(P.isTrackShape("part5UnansweredOnly", v), false, String(v));
  }
  assert.equal(P.isTrackShape("goal", {}), false);
});

test("normalizeTrackItems／ensureWritable：缺鍵補預設、ids 去非字串／空白／重複且保留題庫外 id、wordKey 依 C-2；不修改傳入值", () => {
  const d = v2Data();
  const snap = JSON.parse(JSON.stringify(d));
  const out = P.ensureWritable(d);
  TRACK_KEYS.forEach((k) => assert.deepEqual(out[k], TRACK_DEFAULTS[k], k));
  V2_KEYS.forEach((k) => assert.deepEqual(out[k], d[k], k));
  assert.deepEqual(d, snap);
  assert.notEqual(out, d);
  assert.ok(P.validatePersistedData(out, { written: true }).ok);

  const e = sampleData();
  e.part5CorrectIds = ["p5-003", 7, "", "  ", null, "p5-003", "p5-999", "p5-001"];
  e.flashcardPosition = { wordKey: "  Pay   Off ", ordinal: 7 };
  const n = P.normalizeTrackItems(e);
  assert.deepEqual(n.part5CorrectIds, ["p5-003", "p5-999", "p5-001"]);
  assert.deepEqual(n.flashcardPosition, { wordKey: "pay off", ordinal: 7 });
  assert.equal(n.part5UnansweredOnly, true);
  const blank = sampleData();
  blank.flashcardPosition = { wordKey: "   ", ordinal: 2 };
  assert.equal(P.normalizeTrackItems(blank).flashcardPosition, null);
  // 已正規化的值為恆等（冪等）
  assert.deepEqual(P.ensureWritable(sampleData()), sampleData());
  assert.deepEqual(P.ensureWritable(P.ensureWritable(e)), P.ensureWritable(e));
  // 非物件原樣回傳
  for (const v of [null, [], "x", 1]) {
    assert.equal(P.ensureWritable(v), v);
  }
});

test("validatePersistedData（v0.15）：必填 9 欄、允許 12 欄；3 欄存在時檢查 shape；written 要求 3 欄存在且為 Normalized", () => {
  assert.ok(P.validatePersistedData(v2Data()).ok, "缺 3 欄 = 選填");
  assert.equal(P.validatePersistedData(v2Data(), { written: true }).ok, false, "written 要求 12 欄");
  for (const k of TRACK_KEYS) {
    const d = sampleData();
    delete d[k];
    assert.ok(P.validatePersistedData(d).ok, "缺 " + k);
    assert.equal(P.validatePersistedData(d, { written: true }).ok, false, "written 缺 " + k);
  }
  const shapeBad = [
    ["flashcardPosition", []], ["flashcardPosition", "a"], ["flashcardPosition", { wordKey: 1, ordinal: 1 }],
    ["flashcardPosition", { wordKey: "a", ordinal: 0 }], ["flashcardPosition", { wordKey: "a" }],
    ["flashcardPosition", { wordKey: "a", ordinal: 1, x: 1 }],
    ["part5CorrectIds", {}], ["part5CorrectIds", null], ["part5CorrectIds", "p5-001"],
    ["part5UnansweredOnly", "true"], ["part5UnansweredOnly", 0], ["part5UnansweredOnly", 1], ["part5UnansweredOnly", null]
  ];
  for (const [k, v] of shapeBad) {
    const d = sampleData();
    d[k] = v;
    const r = P.validatePersistedData(d);
    assert.equal(r.ok, false, k + " " + JSON.stringify(v));
    assert.ok(r.errors.some((e) => e.indexOf("data." + k) === 0), k);
  }
  // shape 正確但非 Normalized：只在 written 擋
  const writtenBad = [
    (d) => { d.flashcardPosition = { wordKey: "Bootstrap", ordinal: 2 }; },
    (d) => { d.flashcardPosition = { wordKey: "  ", ordinal: 2 }; },
    (d) => { d.flashcardPosition = { wordKey: "", ordinal: 2 }; },
    (d) => { d.part5CorrectIds = ["p5-001", "p5-001"]; },
    (d) => { d.part5CorrectIds = ["p5-001", " "]; },
    (d) => { d.part5CorrectIds = [1]; }
  ];
  writtenBad.forEach((fn, i) => {
    const d = sampleData();
    fn(d);
    assert.ok(P.validatePersistedData(d).ok, "shape ok " + i);
    assert.equal(P.validatePersistedData(d, { written: true }).ok, false, "written bad " + i);
  });
  // 題庫外 id、null 位置皆為合法寫出值（Q-71 A、FB-59）
  const ok = sampleData();
  ok.flashcardPosition = null;
  ok.part5CorrectIds = ["p5-999", "anything"];
  assert.ok(P.validatePersistedData(ok, { written: true }).ok);
});

test("normalizeAfterLoad（v0.15）：先補齊 3 欄；有 part5Ids 才做 UO-4（V-ST-05 之後），未傳不做", () => {
  const bank = ["p5-001", "p5-002", "p5-003", "p5-004"];
  const d = sampleData();
  d.part5 = { currentIndex: 1, lockedSelection: null, phase: "question", roundAnswered: 1, roundCorrect: 1, totalAnswered: 3, totalCorrect: 2 };
  d.part5CorrectIds = ["p5-002", "p5-003"];
  d.part5UnansweredOnly = true;
  const snap = JSON.parse(JSON.stringify(d));
  // 未傳 part5Ids：舊呼叫端行為不變
  assert.equal(P.normalizeAfterLoad(d, 4, "2026-10-29").part5.currentIndex, 1);
  // 有傳：目前題目曾答對 → 跳到其後第一題未答對（p5-004）
  const n = P.normalizeAfterLoad(d, 4, "2026-10-29", bank);
  assert.equal(n.part5.currentIndex, 3);
  assert.deepEqual(n.part5CorrectIds, ["p5-002", "p5-003"]);
  assert.deepEqual(d, snap, "不修改傳入值");
  // 其後全部曾答對 → summary（本輪計數不變）
  const tail = sampleData();
  tail.part5 = Object.assign({}, d.part5, { currentIndex: 2 });
  tail.part5CorrectIds = ["p5-003", "p5-004"];
  tail.part5UnansweredOnly = true;
  const s = P.normalizeAfterLoad(tail, 4, "2026-10-29", bank);
  assert.equal(s.part5.phase, "summary");
  assert.equal(s.part5.roundAnswered, 1);
  // 開關關閉 → 不動
  const off = Object.assign(sampleData(), { part5: d.part5, part5CorrectIds: d.part5CorrectIds, part5UnansweredOnly: false });
  assert.equal(P.normalizeAfterLoad(off, 4, "2026-10-29", bank).part5.currentIndex, 1);
  // V-ST-05 先執行：currentIndex 超出 → 0，再依 UO-4 跳過曾答對的 p5-001
  const over = Object.assign(sampleData(), { part5: Object.assign({}, d.part5, { currentIndex: 9 }), part5CorrectIds: ["p5-001"], part5UnansweredOnly: true });
  assert.equal(P.normalizeAfterLoad(over, 4, "2026-10-29", bank).part5.currentIndex, 1);
  // 缺 3 欄的資料 → 補預設
  const v2 = P.normalizeAfterLoad(v2Data(), 4, "2026-10-29", bank);
  TRACK_KEYS.forEach((k) => assert.deepEqual(v2[k], TRACK_DEFAULTS[k], k));
});

test("RD-3（單元）：resetTrackFields 缺鍵補預設不列入 fieldsReset、shape 不符只重設該欄並列入；非物件原樣回傳", () => {
  const d = v2Data();
  const r0 = P.resetTrackFields(d);
  assert.deepEqual(r0.fieldsReset, []);
  TRACK_KEYS.forEach((k) => assert.deepEqual(r0.data[k], TRACK_DEFAULTS[k], k));
  const bad = sampleData();
  bad.flashcardPosition = [];
  bad.part5UnansweredOnly = "true";
  const snap = JSON.parse(JSON.stringify(bad));
  const r = P.resetTrackFields(bad);
  assert.deepEqual(r.fieldsReset, ["flashcardPosition", "part5UnansweredOnly"]);
  assert.equal(r.data.flashcardPosition, null);
  assert.equal(r.data.part5UnansweredOnly, false);
  assert.deepEqual(r.data.part5CorrectIds, ["p5-001", "p5-999"]);
  assert.deepEqual(bad, snap, "不修改傳入值");
  assert.deepEqual(P.resetTrackFields(null), { data: null, fieldsReset: [] });
  // parseStored 對 v3 一律 RD-1 → RD-3，fieldsReset 依序合併
  const both = sampleData();
  both.todayLearned = [];
  both.part5CorrectIds = { 0: "p5-001" };
  const p = P.parseStored(raw(record(both)));
  assert.equal(p.kind, "ok");
  assert.equal(p.migrated, false);
  assert.deepEqual(p.fieldsReset, ["todayLearned", "part5CorrectIds"]);
});
