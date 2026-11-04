/*
 * FE-34 單元測試：core/reinit.js 切換難易度初始化學習紀錄的純規則
 * 執行：node --test src/app/__tests__/reinit.test.js
 * 依據：architecture.md v0.5 §7.15（函式表）、§10.2 reinit.test.js 列；契約 README §5.2、§5.7 CI-1～CI-4 與
 *       「有學習紀錄」(a)～(f) 對照表、FB-33；data-schema.ts LEARNING_PROGRESS_FIELDS
 * 涵蓋：AC-01-07、AC-32-02、AC-32-03、AC-32-05、AC-32-06、AC-32-07、AC-32-10
 * （FE-73）v0.15：LEARNING_PROGRESS_FIELDS 7 欄（含 part5CorrectIds）；buildReinitData 另設 flashcardPosition = null、
 *       part5UnansweredOnly 保留（CI-4、FP-4、V-ST-14、AC-45-08、AC-44-08）；3 個新欄位不列入 CI-2。
 */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const C = require("../core/constants.js");
const R = require("../core/reinit.js");
const P = require("../core/persist.js");
const L = require("../core/learning.js");

const TODAY = "2026-11-02";
const day = (n) => L.addDays(TODAY, n);

/** 深層凍結（用來證明不修改輸入） */
function deepFreeze(o) {
  if (o && typeof o === "object") {
    Object.getOwnPropertyNames(o).forEach((k) => deepFreeze(o[k]));
    Object.freeze(o);
  }
  return o;
}

/** 深複製（測試資料皆為純 JSON） */
const clone = (x) => JSON.parse(JSON.stringify(x));

/** 自訂單字（11 欄齊全） */
function custom(id, word, meaning, origin, templateId, createdAt) {
  return {
    id: id,
    word: word,
    meaning: meaning,
    phonetic: "",
    pos: "n.",
    collocation: "",
    example: "",
    academicContext: "",
    origin: origin,
    templateId: templateId,
    createdAt: createdAt
  };
}

/** 全部學習欄位皆為預設（無學習紀錄）的綠色 600 資料 */
function emptyData(score) {
  const d = P.defaultData();
  if (score !== undefined) {
    const color = require("../core/goal.js").colorOf(score);
    const eff = require("../core/goal.js").effectiveColorOf(color);
    d.goal = { draftScore: score, appliedScore: score, appliedColor: color, effectiveColor: eff };
  }
  return d;
}

/** 有完整學習紀錄、自訂 3 字（含 monetization）、STT 已讀的資料（目前 600 綠，draftScore 300） */
function richData() {
  const d = emptyData(600);
  d.goal.draftScore = 300;
  d.customVocab = [
    custom("c_a1", "monetization", "貨幣化", "manual", null, "2026-10-01T01:02:03.000Z"),
    custom("c_b2", "cloud computing", "雲端運算", "template", "cs", "2026-10-02T01:02:03.000Z"),
    custom("c_c3", "yield", "產量", "template", "business", "2026-10-03T01:02:03.000Z")
  ];
  d.masteredWordKeys = ["monetization", "abandon"];
  d.vocabQuiz = { answered: 12, correct: 9 };
  d.part5 = { currentIndex: 4, lockedSelection: 2, phase: "question", roundAnswered: 4, roundCorrect: 3, totalAnswered: 24, totalCorrect: 18 };
  d.streak = { days: 5, lastActiveDate: TODAY };
  d.sttNoticeAcknowledged = true;
  d.todayLearned = { date: TODAY, wordKeys: ["abandon", "monetization"] };
  d.learnedHistory = { [day(-2)]: 7, [day(-1)]: 3, [TODAY]: 2 };
  // v0.15：上次位置、答對紀錄、只練沒答對開關（非預設值）
  d.flashcardPosition = { wordKey: "abandon", ordinal: 5 };
  d.part5CorrectIds = ["p5-001", "p5-007", "p5-999"];
  d.part5UnansweredOnly = true;
  return d;
}

const ALL_FALSE = { a: false, b: false, c: false, d: false, e: false, f: false };

// ── effectiveOf、effectiveChanged（AC-32-05、AC-01-07、CI-3）──────

test("effectiveOf：藍、金 → 綠；其他同 Color(S)；不在色級 → null", () => {
  assert.equal(R.effectiveOf(10), "orange");
  assert.equal(R.effectiveOf(300), "brown");
  assert.equal(R.effectiveOf(600), "green");
  assert.equal(R.effectiveOf(730), "green");
  assert.equal(R.effectiveOf(860), "green");
  assert.equal(R.effectiveOf(5), null);
});

test("effectiveChanged：600→650、600→730、600→860、730→600 皆為 false（AC-32-05、AC-01-07）", () => {
  const g600 = emptyData(600).goal;
  const g730 = emptyData(730).goal;
  assert.equal(g730.effectiveColor, "green");
  assert.equal(R.effectiveChanged(g600, 650), false);
  assert.equal(R.effectiveChanged(g600, 730), false);
  assert.equal(R.effectiveChanged(g600, 860), false);
  assert.equal(R.effectiveChanged(g730, 600), false);
  assert.equal(R.effectiveChanged(g730, 990), false);
});

test("effectiveChanged：600→300、300→600、橘→棕、棕→橘皆為 true（CI-3）", () => {
  assert.equal(R.effectiveChanged(emptyData(600).goal, 300), true);
  assert.equal(R.effectiveChanged(emptyData(300).goal, 600), true);
  assert.equal(R.effectiveChanged(emptyData(100).goal, 300), true);
  assert.equal(R.effectiveChanged(emptyData(300).goal, 100), true);
  assert.equal(R.effectiveChanged(emptyData(600).goal, 100), true);
});

test("effectiveChanged：比較記憶體中的 effectiveColor，不以 appliedColor 判斷", () => {
  // appliedColor 為藍、effectiveColor 為綠 → 套用 600 不算改變
  const g = { draftScore: 600, appliedScore: 730, appliedColor: "blue", effectiveColor: "green" };
  assert.equal(R.effectiveChanged(g, 600), false);
});

// ── recordFlags、hasLearningRecord（CI-2、AC-32-06、AC-32-07）────

test("全空（預設值）→ 6 項皆 false、hasLearningRecord false（AC-32-06）", () => {
  const d = emptyData(600);
  assert.deepEqual(R.recordFlags(d, TODAY), ALL_FALSE);
  assert.equal(R.hasLearningRecord(d, TODAY), false);
});

test("AC-32-07：六種單項成立狀態，各只有對應 1 項為 true", () => {
  const cases = {
    a: (d) => { d.masteredWordKeys = ["abandon"]; },
    b: (d) => { d.vocabQuiz = { answered: 1, correct: 0 }; },
    c: (d) => { d.part5.totalAnswered = 1; d.part5.roundAnswered = 1; },
    d: (d) => { d.todayLearned = { date: TODAY, wordKeys: ["abandon"] }; d.learnedHistory = { [TODAY]: 1 }; },
    e: (d) => { d.learnedHistory = { [day(-3)]: 4 }; },
    f: (d) => { d.streak = { days: 1, lastActiveDate: day(-5) }; }
  };
  for (const key of Object.keys(cases)) {
    const d = emptyData(600);
    cases[key](d);
    const flags = R.recordFlags(d, TODAY);
    assert.deepEqual(flags, { ...ALL_FALSE, [key]: true }, "狀態 " + key);
    assert.equal(R.hasLearningRecord(d, TODAY), true, "狀態 " + key);
  }
});

test("(d) 單獨成立時 learnedHistory 只有 today 一筆（= X）→ (e) 為 false（FB-33）", () => {
  const d = emptyData(600);
  d.todayLearned = { date: TODAY, wordKeys: ["a", "b", "c"] };
  d.learnedHistory = { [TODAY]: 3 };
  const f = R.recordFlags(d, TODAY);
  assert.equal(f.e, false);
  assert.equal(f.d, true);
});

test("(e) 視窗：today − 1、today − 29 → true；today、today − 30、未來日、非法鍵、值 0 → false", () => {
  const e = (h) => R.recordFlags({ ...emptyData(600), learnedHistory: h }, TODAY).e;
  assert.equal(e({ [day(-1)]: 1 }), true);
  assert.equal(e({ [day(-29)]: 1 }), true);
  assert.equal(e({ [TODAY]: 5 }), false);
  assert.equal(e({ [day(-30)]: 5 }), false);
  assert.equal(e({ [day(1)]: 5 }), false);
  assert.equal(e({ "2026-02-30": 5 }), false);
  assert.equal(e({ "not-a-date": 5 }), false);
  assert.equal(e({ "2026/10/30": 5 }), false);
  assert.equal(e({ [day(-1)]: 0 }), false);
  assert.equal(e({ [day(-1)]: -1 }), false);
  assert.equal(e({ [day(-1)]: "3" }), false);
  assert.equal(e({}), false);
  // 跨月：today − 29 = 2026-10-04
  assert.equal(day(-29), "2026-10-04");
  assert.equal(e({ "2026-10-04": 1 }), true);
  assert.equal(e({ "2026-10-03": 1 }), false);
});

test("(d)：date ≠ today → false；wordKeys 空 → false", () => {
  const dflag = (t) => R.recordFlags({ ...emptyData(600), todayLearned: t }, TODAY).d;
  assert.equal(dflag({ date: day(-1), wordKeys: ["abandon"] }), false);
  assert.equal(dflag({ date: null, wordKeys: [] }), false);
  assert.equal(dflag({ date: TODAY, wordKeys: [] }), false);
  assert.equal(dflag({ date: TODAY, wordKeys: ["abandon"] }), true);
});

test("(f)：lastActiveDate 非 null 或 days > 0 任一即成立", () => {
  const f = (s) => R.recordFlags({ ...emptyData(600), streak: s }, TODAY).f;
  assert.equal(f({ days: 0, lastActiveDate: null }), false);
  assert.equal(f({ days: 0, lastActiveDate: day(-10) }), true);
  assert.equal(f({ days: 2, lastActiveDate: null }), true);
});

test("(b)、(c)：只看 answered、totalAnswered；correct、currentIndex 等不列入判斷", () => {
  const d = emptyData(600);
  d.part5.currentIndex = 7;
  d.part5.phase = "summary";
  d.part5.lockedSelection = 1;
  assert.deepEqual(R.recordFlags(d, TODAY), ALL_FALSE);
});

test("欄位缺漏或型別不符視為該項不成立、不拋例外", () => {
  assert.deepEqual(R.recordFlags({}, TODAY), ALL_FALSE);
  assert.deepEqual(R.recordFlags(null, TODAY), ALL_FALSE);
  assert.deepEqual(R.recordFlags(undefined, TODAY), ALL_FALSE);
  assert.deepEqual(R.recordFlags({
    masteredWordKeys: "abc",
    vocabQuiz: [],
    part5: { totalAnswered: "3" },
    todayLearned: { date: TODAY, wordKeys: "abc" },
    learnedHistory: [1, 2],
    streak: null
  }, TODAY), ALL_FALSE);
  assert.equal(R.hasLearningRecord({}, TODAY), false);
});

// ── needsConfirm（CI-1）──────────────────────────────────────────

test("needsConfirm 四種組合：色級改變 × 有學習紀錄", () => {
  // 改變 + 有紀錄 → true（AC-32-01）
  const a = emptyData(600);
  a.goal.draftScore = 300;
  a.masteredWordKeys = ["abandon"];
  assert.equal(R.needsConfirm(a, TODAY), true);
  // 改變 + 無紀錄 → false（AC-32-06）
  const b = emptyData(600);
  b.goal.draftScore = 300;
  assert.equal(R.needsConfirm(b, TODAY), false);
  // 未改變 + 有紀錄 → false（AC-32-05）
  const c = emptyData(600);
  c.goal.draftScore = 730;
  c.vocabQuiz = { answered: 5, correct: 5 };
  assert.equal(R.needsConfirm(c, TODAY), false);
  // 未改變 + 無紀錄 → false
  const d = emptyData(600);
  d.goal.draftScore = 650;
  assert.equal(R.needsConfirm(d, TODAY), false);
});

test("needsConfirm：AC-32-05 綠 600 → 650 → 730 → 860 → 600 皆不跳視窗（有完整學習紀錄）", () => {
  const d = richData();
  for (const s of [650, 730, 860, 600]) {
    d.goal.draftScore = s;
    assert.equal(R.needsConfirm(d, TODAY), false, String(s));
  }
});

test("needsConfirm：資料不完整時回 false、不拋例外", () => {
  assert.equal(R.needsConfirm(null, TODAY), false);
  assert.equal(R.needsConfirm({}, TODAY), false);
});

// ── buildReinitData（CI-4、AC-32-02、AC-32-03、AC-32-10）────────

function newGoal300() {
  return { draftScore: 300, appliedScore: 300, appliedColor: "brown", effectiveColor: "brown" };
}

test("buildReinitData：7 欄 deepEqual persist.defaultData() 對應欄；goal = 新值（AC-32-02、AC-45-08）", () => {
  const out = R.buildReinitData(richData(), newGoal300(), P.defaultData());
  const def = P.defaultData();
  for (const k of C.LEARNING_PROGRESS_FIELDS) {
    assert.deepEqual(out[k], def[k], k);
  }
  assert.deepEqual(out.masteredWordKeys, []);
  assert.deepEqual(out.vocabQuiz, { answered: 0, correct: 0 });
  assert.deepEqual(out.part5, { currentIndex: 0, lockedSelection: null, phase: "question", roundAnswered: 0, roundCorrect: 0, totalAnswered: 0, totalCorrect: 0 });
  assert.deepEqual(out.streak, { days: 0, lastActiveDate: null });
  assert.deepEqual(out.todayLearned, { date: null, wordKeys: [] });
  assert.deepEqual(out.learnedHistory, {});
  assert.deepEqual(out.part5CorrectIds, []);
  assert.equal(C.LEARNING_PROGRESS_FIELDS.length, 7);
  assert.deepEqual(out.goal, newGoal300());
  // 初始化後無學習紀錄
  assert.equal(R.hasLearningRecord(out, TODAY), false);
});

test("buildReinitData：customVocab 深度相等（順序、11 欄含 id、createdAt 不變）、sttNoticeAcknowledged 保留（AC-32-03）", () => {
  const src = richData();
  const before = clone(src);
  const out = R.buildReinitData(src, newGoal300(), P.defaultData());
  assert.deepEqual(out.customVocab, before.customVocab);
  assert.deepEqual(out.customVocab.map((c) => c.word), ["monetization", "cloud computing", "yield"]);
  out.customVocab.forEach((c) => assert.equal(Object.keys(c).length, 11));
  assert.equal(out.sttNoticeAcknowledged, true);
  // monetization 已不在已掌握清單（只清除掌握狀態）
  assert.ok(!out.masteredWordKeys.includes("monetization"));
});

test("buildReinitData：鍵集合與輸入相同（AC-32-10），且為新物件", () => {
  const src = richData();
  const out = R.buildReinitData(src, newGoal300(), P.defaultData());
  assert.notEqual(out, src);
  assert.deepEqual(Object.keys(out).sort(), Object.keys(src).sort());
  assert.equal(Object.keys(out).length, 12);
  assert.deepEqual(Object.keys(out).sort(), [...P.DATA_KEYS].sort());
});

test("buildReinitData（v0.15）：flashcardPosition = null（FP-4）、part5UnansweredOnly 保留、part5CorrectIds 清空（CI-4、V-ST-14）", () => {
  const src = richData();
  const out = R.buildReinitData(src, newGoal300(), P.defaultData());
  assert.equal(out.flashcardPosition, null);
  assert.equal(out.part5UnansweredOnly, true);
  assert.deepEqual(out.part5CorrectIds, []);
  // 開關關閉時同樣保留原值
  const off = { ...richData(), part5UnansweredOnly: false };
  assert.equal(R.buildReinitData(off, newGoal300(), P.defaultData()).part5UnansweredOnly, false);
  // 輸入原本就是 null 時仍為 null
  const none = { ...richData(), flashcardPosition: null };
  assert.equal(R.buildReinitData(none, newGoal300(), P.defaultData()).flashcardPosition, null);
});

test("CI-2（v0.15）：只有答對紀錄、上次位置、開關而 (a)～(f) 皆不成立 → 無學習紀錄（AC-46-10、FB-58）", () => {
  const d = emptyData(600);
  d.goal.draftScore = 300;
  d.flashcardPosition = { wordKey: "abandon", ordinal: 3 };
  d.part5CorrectIds = ["p5-001"];
  d.part5UnansweredOnly = true;
  assert.deepEqual(R.recordFlags(d, TODAY), ALL_FALSE);
  assert.equal(R.hasLearningRecord(d, TODAY), false);
  assert.equal(R.needsConfirm(d, TODAY), false);
});

test("buildReinitData：未列入白名單的欄位（日後新增）原值保留（CI-4）", () => {
  const src = { ...richData(), futureSetting: { theme: "dark" } };
  const out = R.buildReinitData(src, newGoal300(), P.defaultData());
  assert.deepEqual(out.futureSetting, { theme: "dark" });
});

test("buildReinitData：輸入深度凍結後呼叫不拋例外，data、newGoal、defaults 皆不變", () => {
  const src = deepFreeze(richData());
  const goal = deepFreeze(newGoal300());
  const defs = deepFreeze(P.defaultData());
  const snap = [clone(src), clone(goal), clone(defs)];
  const out = R.buildReinitData(src, goal, defs);
  assert.deepEqual([clone(src), clone(goal), clone(defs)], snap);
  // 7 欄與 goal 為深複本，不與 defaults、newGoal 共用參照
  assert.notEqual(out.goal, goal);
  for (const k of C.LEARNING_PROGRESS_FIELDS) {
    if (defs[k] && typeof defs[k] === "object") assert.notEqual(out[k], defs[k], k);
  }
  // 結果本身可修改（不是凍結物件）
  out.masteredWordKeys.push("x");
  assert.deepEqual(defs.masteredWordKeys, []);
});

test("buildReinitData：結果經 normalizeLearning 後通過 validatePersistedData(…, { written: true })", () => {
  const out = R.buildReinitData(richData(), newGoal300(), P.defaultData());
  const learned = L.normalizeLearning(out, TODAY);
  const written = { ...out, todayLearned: learned.todayLearned, learnedHistory: learned.learnedHistory };
  const v = P.validatePersistedData(written, { written: true, today: TODAY });
  assert.equal(v.ok, true, v.errors.join("\n"));
  // 正規化前後相同（預設值本來就合法）
  assert.deepEqual(written, out);
});

test("buildReinitData：defaults 缺欄 → 拋含欄位名的 Error（LD-3）", () => {
  for (const k of C.LEARNING_PROGRESS_FIELDS) {
    const defs = P.defaultData();
    delete defs[k];
    assert.throws(() => R.buildReinitData(richData(), newGoal300(), defs), (err) => {
      return err instanceof Error && err.message.includes(k);
    }, k);
  }
  assert.throws(() => R.buildReinitData(richData(), newGoal300(), null), Error);
  assert.throws(() => R.buildReinitData(richData(), newGoal300(), undefined), Error);
});

// ── 模組形態與載入（LD-1）────────────────────────────────────────

test("API 凍結、只匯出 §7.15 的 6 個函式", () => {
  assert.ok(Object.isFrozen(R));
  assert.deepEqual(Object.keys(R).sort(), ["buildReinitData", "effectiveChanged", "effectiveOf", "hasLearningRecord", "needsConfirm", "recordFlags"]);
});

test("瀏覽器載入（LD-1）：只先載入 constants 即可載入 reinit；goal、learning 於呼叫時才取用", () => {
  const sandbox = { console: console };
  sandbox.self = sandbox;
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  const run = (f) => vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "core", f), "utf8"), sandbox, { filename: f });
  run("constants.js");
  run("reinit.js");
  const RR = sandbox.EMT.core.reinit;
  assert.equal(typeof RR.needsConfirm, "function");
  // 尚未載入 goal → 呼叫時拋出含模組名稱的 Error（LD-3）
  assert.throws(() => RR.effectiveOf(600), /goal/);
  run("wordkey.js");
  run("goal.js");
  run("learning.js");
  assert.equal(RR.effectiveOf(730), "green");
  const d = emptyData(600);
  d.goal.draftScore = 300;
  d.learnedHistory = { [day(-1)]: 2 };
  assert.equal(RR.needsConfirm(d, TODAY), true);
});

test("原始碼審查：reinit.js 載入時只取用 constants（其他 core 皆經 dep() 於函式內取得）", () => {
  const src = fs.readFileSync(path.join(__dirname, "..", "core", "reinit.js"), "utf8");
  const requires = [...src.matchAll(/require\("([^"]+)"\)/g)].map((m) => m[1]);
  assert.deepEqual(requires, ["./constants.js"]);
  assert.ok(!/EMT\.core\.(goal|learning|persist)\b/.test(src));
});
