/*
 * persist.test.js — 持久化預設值、StorageRecord 驗證與遷移單元測試（FE-06；FE-22 v0.8 升版）
 * 涵蓋：AC-01-04、AC-11-05、AC-18-01、AC-18-02、AC-18-05、AC-30-09、AC-30-12、AC-30-13、
 *       V-ST-01～03、V-ST-05、V-ST-09～V-ST-11、README §5.2、§5.3（MG-1～MG-4、RD-1、RD-2）
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
    learnedHistory: { "2026-10-28": 3, "2026-10-29": 2 }
  };
}

/** v1 的 7 個既有欄位 */
const V1_KEYS = ["goal", "customVocab", "masteredWordKeys", "vocabQuiz", "part5", "streak", "sttNoticeAcknowledged"];

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

function record(data, extra) {
  return Object.assign({ schemaVersion: 2, savedAt: "2026-10-29T08:30:00.000Z", data: data }, extra || {});
}

/** v1 紀錄：資料只有 7 個既有欄位 */
function v1Record(extra) {
  const d = sampleData();
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

test("defaultData：契約 §5.2 預設值（AC-18-02）", () => {
  assert.deepEqual(P.defaultData(), {
    goal: { draftScore: 600, appliedScore: 600, appliedColor: "green", effectiveColor: "green" },
    customVocab: [],
    masteredWordKeys: [],
    vocabQuiz: { answered: 0, correct: 0 },
    part5: { currentIndex: 0, lockedSelection: null, phase: "question", roundAnswered: 0, roundCorrect: 0, totalAnswered: 0, totalCorrect: 0 },
    streak: { days: 0, lastActiveDate: null },
    sttNoticeAcknowledged: false,
    todayLearned: { date: null, wordKeys: [] },
    learnedHistory: {}
  });
  // 每次回傳新物件
  const a = P.defaultData();
  a.customVocab.push(1);
  a.todayLearned.wordKeys.push("x");
  a.learnedHistory["2026-10-30"] = 1;
  assert.equal(P.defaultData().customVocab.length, 0);
  assert.deepEqual(P.defaultData().todayLearned, { date: null, wordKeys: [] });
  assert.deepEqual(P.defaultData().learnedHistory, {});
  assert.deepEqual([...P.DATA_KEYS], V1_KEYS.concat(["todayLearned", "learnedHistory"]));
  assert.deepEqual([...P.V1_DATA_KEYS], V1_KEYS);
});

test("預設值與樣本皆通過驗證；與 storage-schema.json 範例一致", () => {
  assert.ok(P.validatePersistedData(P.defaultData()).ok);
  assert.ok(P.validatePersistedData(P.defaultData(), { written: true }).ok);
  assert.ok(P.validatePersistedData(sampleData()).ok);
  const schema = require("../../../docs/02-contract/storage-schema.json");
  assert.equal(schema.properties.schemaVersion.const, C.CURRENT_SCHEMA_VERSION);
  assert.deepEqual(schema.$defs.BackupFile.properties.schemaVersion.enum, [...C.SUPPORTED_SCHEMA_VERSIONS]);
  assert.deepEqual(schema.$defs.PersistedData.required, [...P.DATA_KEYS]);
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

test("parseStored：schemaVersion 缺失、非整數、3、0、負數 → unreadable", () => {
  expectUnreadable((rec) => { delete rec.schemaVersion; }, "缺失");
  expectUnreadable((rec) => { rec.schemaVersion = "1"; }, "字串");
  expectUnreadable((rec) => { rec.schemaVersion = "2"; }, "字串 2");
  expectUnreadable((rec) => { rec.schemaVersion = 1.5; }, "小數");
  expectUnreadable((rec) => { rec.schemaVersion = 2.0000001; }, "小數 2.0000001");
  expectUnreadable((rec) => { rec.schemaVersion = null; }, "null");
  expectUnreadable((rec) => { rec.schemaVersion = 3; }, "大於目前版本");
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
  // v1 也是：遷移後以 v2 完整驗證
  assert.equal(P.parseStored(raw(v1Record({ extra: 1 }))).kind, "unreadable");
  const v1 = v1Record();
  v1.data.extra = true;
  assert.equal(P.parseStored(raw(v1)).kind, "unreadable");
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

test("validateStorageRecord：回傳錯誤清單；schemaVersion 必須等於目前版本（2；v1 須先遷移）", () => {
  const ok = P.validateStorageRecord(record(sampleData()));
  assert.deepEqual(ok, { ok: true, errors: [] });
  for (const v of [1, 3]) {
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
  const seeds = [raw(record(sampleData())), raw(record(P.defaultData())), raw(v1Record()), V07_RAW, "{\"schemaVersion\":1}", "{}"];
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

test("MIGRATIONS 只有 1 → 2；migrate 對目前版本不變、v1 遷移、其他版本失敗", () => {
  assert.deepEqual(Object.keys(P.MIGRATIONS), ["1"]);
  assert.ok(Object.isFrozen(P.MIGRATIONS));
  assert.equal(C.CURRENT_SCHEMA_VERSION, 2);
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
  assert.equal(m1.record.schemaVersion, 2);
  assert.equal(m1.record.savedAt, v1.savedAt);
  assert.deepEqual(m1.record.data.todayLearned, { date: null, wordKeys: [] });
  assert.deepEqual(m1.record.data.learnedHistory, {});
  assert.deepEqual(v1, snapshot, "不修改傳入值");

  for (const v of [0, 3, -1, 1.5, "1", "2", null, undefined]) {
    assert.equal(P.migrate(record(sampleData(), { schemaVersion: v })).ok, false, String(v));
  }
  assert.equal(P.migrate(null).ok, false);
  // MG-1：v1 的 data 不是物件 → 遷移失敗
  for (const d of [null, [], "x", 1, true, undefined]) {
    assert.equal(P.migrate({ schemaVersion: 1, data: d }).ok, false, JSON.stringify(d));
    assert.throws(() => P.MIGRATIONS[1](d), TypeError);
  }
});

test("buildRecord：組成 StorageRecord（schemaVersion 2）並可被 parseStored 讀回", () => {
  const d = sampleData();
  const rec = P.buildRecord(d, new Date("2026-10-30T01:02:03.000Z"));
  assert.deepEqual(rec, { schemaVersion: 2, savedAt: "2026-10-30T01:02:03.000Z", data: d });
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

test("v1 遷移：v0.7 實際格式 → ok、migrated、7 欄與原值深度相等、兩欄為預設、schemaVersion 2（AC-30-12）", () => {
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
  assert.deepEqual(Object.keys(r.data), [...P.DATA_KEYS]);
  // 呼叫端依 MG-3 寫回：buildRecord 為 schemaVersion 2，且可再讀回（不再是 migrated）
  const rec = P.buildRecord(r.data, new Date("2026-10-30T01:00:00.000Z"));
  assert.equal(rec.schemaVersion, 2);
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

// ── v0.8（FE-22）：v2 讀取 RD-1（AC-30-13）──

test("RD-1：v2 的 todayLearned 缺少或 shape 不符 → 只重設該欄，其他資料保留、不視為無法讀取", () => {
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

test("RD-1：v2 的 learnedHistory 缺少或不是物件 → 只重設該欄", () => {
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

test("LD-1：persist.js 載入時不取用 goal、learning（只有 constants、wordkey 時可載入，呼叫時缺模組丟出含名稱的錯誤）", () => {
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
  assert.equal(VP.parseStored(V07_RAW).kind, "ok");
});
