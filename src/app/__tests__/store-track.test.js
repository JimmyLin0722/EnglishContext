/*
 * store-track.test.js — 單字卡上次位置、模擬測驗答對紀錄與「只練沒答對」、寫入與容量不足提示（FE-74）
 * 依據：architecture.md v0.10 §4.10（Store API 新增與修改）、§7.21.2、§7.21.3、§7.21.5、§10.7 store-track.test.js 列；
 *       契約 README §5.10 FP-1～FP-9、§5.11 CR-1～CR-9、UO-1～UO-9、§5.12 WR-1～WR-5、§5.3 RD-4、§5.7 CI-8、CI-9、
 *       §6.2 步驟 9（FP-6）、§7.7 V-ST-18～V-ST-20、V-ST-22。
 * 涵蓋：AC-44-01～AC-44-10、AC-45-01～AC-45-03、AC-45-06、AC-45-08、AC-46-02～AC-46-05、AC-46-07～AC-46-10、
 *       AC-47-01、AC-47-02、AC-47-04、AC-47-07、AC-18-01、AC-32-02、AC-03-05、AC-04-08、AC-30-14
 * （v0.18，FE-80；architecture.md v0.13 §7.24.1、§10.10）LV-1～LV-7、UO-8、UO-10、CR-6、CR-10；
 *       AC-48-02、AC-48-05、AC-48-08、AC-48-09、AC-48-10、AC-48-11；V-ST-23、V-ST-24、V-ST-26
 *
 * 做法：
 * - 以注入的假 storage（計數 setItem、可設定 quota／一般例外／停用）與假 content（21 個內建字、6 題模擬測驗）測試 createStore。
 * - INV-FP（architecture §7.21.2）：以 tracked() 包裝 actions，每個 action（含 importBackup 的 Promise）之後斷言：
 *   單字集 N > 0 時記憶體 data.flashcardPosition 為 null（此時 index 必為 0）或等於 position.fromIndex(studySet, index)。
 * - 寫入主鍵的每一筆 data 都須通過 validatePersistedData(data, { written: true })（test.after，效能案例除外）。
 */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const S = require("../state/store.js");
const VOCAB = require("../core/vocab.js");
const P = require("../core/persist.js");
const C = require("../core/constants.js");
const POS = require("../core/position.js");
const PF = require("../core/part5flow.js");

const KEY = C.STORAGE_KEYS.state;
const UNREADABLE = C.STORAGE_KEYS.unreadable;
const TODAY = "2026-10-30";

// ── 假 storage ──

/** 寫入主鍵的內容；檔案結束時統一以 written 驗證 */
const allMainWrites = [];

/**
 * 假 localStorage：記錄 setItem 次數；getThrows → 存取拋例外（停用）；quota → 寫主鍵拋容量不足；otherError → 一般例外。
 * record = false 時不收集寫入內容（效能案例）。
 */
function fakeStorage(initial, record) {
  const map = new Map(Object.entries(initial || {}));
  const s = {
    map,
    setCalls: [],
    getThrows: false,
    quota: false,
    otherError: false,
    getItem(k) {
      if (s.getThrows) { throw new Error("SecurityError"); }
      return map.has(k) ? map.get(k) : null;
    },
    setItem(k, v) {
      if (s.getThrows) { throw new Error("SecurityError"); }
      s.setCalls.push(k);
      if (k === KEY && s.quota) {
        const e = new Error("quota"); e.name = "QuotaExceededError"; e.code = 22; throw e;
      }
      if (k === KEY && s.otherError) { throw new Error("boom"); }
      if (k === KEY && record !== false) { allMainWrites.push(String(v)); }
      map.set(k, String(v));
    }
  };
  return s;
}

test.after(() => {
  assert.ok(allMainWrites.length > 0);
  allMainWrites.forEach((t, i) => {
    const rec = JSON.parse(t);
    assert.equal(rec.schemaVersion, C.CURRENT_SCHEMA_VERSION, "第 " + (i + 1) + " 筆");
    assert.equal(P.validateStorageRecord(rec).ok, true, "第 " + (i + 1) + " 筆");
    const v = P.validatePersistedData(rec.data, { written: true });
    assert.equal(v.ok, true, "第 " + (i + 1) + " 筆 " + JSON.stringify(v.errors));
  });
});

// ── 假 content ──

/** 6 題模擬測驗（id p5-001～p5-006，正確選項皆為 0） */
function part5Bank(n) {
  const out = [];
  for (let i = 1; i <= (n === undefined ? 6 : n); i++) {
    out.push({
      id: "p5-00" + i, type: "grammar", sentence: "A _____ B.", options: ["a", "b", "c", "d"],
      correctIndex: 0, explanation: { coreStrategy: "x", structure: "y" }, source: "ORIGINAL"
    });
  }
  return out;
}

/** 21 個內建字：1～12 NGSL（棕）、13～21 TSL；extra 覆寫欄位 */
function fakeContent(extra) {
  const raw = [];
  for (let i = 1; i <= 20; i++) {
    raw.push({ rank: i, word: "word" + i, meaning: "釋義" + i, sources: i <= 12 ? ["NGSL"] : ["TSL"] });
  }
  raw.push({ rank: 21, word: "latency", meaning: "延遲", sources: ["TSL"] });
  const prepared = VOCAB.prepareBuiltin(raw, null);
  return Object.assign({
    builtin: prepared.sorted, builtinMap: prepared.map, nB: prepared.nB, nG: prepared.nG,
    part5: part5Bank(), templates: [{ id: "cs", nameZh: "資工", words: [{ word: "Bootstrap", meaning: "自助法" }] }],
    decoderSentences: [{}], manifest: { dataVersion: "2026.11.04" }
  }, extra || {});
}

function emptyVocabContent() {
  return fakeContent({ builtin: [], builtinMap: new Map(), nB: 0, nG: 0 });
}

function customItem(id, word, createdAt) {
  return {
    id, word, meaning: "自訂釋義", phonetic: "", pos: "", collocation: "", example: "", academicContext: "",
    origin: "manual", templateId: null, createdAt: createdAt || "2026-10-29T08:30:00.000Z"
  };
}

function recordOf(data) {
  return JSON.stringify(P.buildRecord(data, new Date("2026-10-29T00:00:00Z")));
}

function seq() {
  let i = 0;
  return () => { i = (i + 1) % 97; return i / 97; };
}

// ── INV-FP ──

/** INV-FP：N > 0 時位置為 null 且 index 0，或等於 fromIndex(studySet, index) */
function assertInv(store, label) {
  const st = store.getState();
  const set = st.runtime.studySet;
  if (set.length === 0) { return; }
  const pos = st.data.flashcardPosition;
  if (pos === null) {
    assert.equal(st.runtime.flashcard.index, 0, "INV-FP（null ⇒ 第 1 張）" + (label || ""));
  } else {
    assert.deepEqual(pos, POS.fromIndex(set, st.runtime.flashcard.index), "INV-FP " + (label || ""));
  }
  assert.ok(st.runtime.flashcard.index >= 0 && st.runtime.flashcard.index < set.length, "index 在範圍內 " + (label || ""));
}

/** 包裝 actions：每個 action 之後斷言 INV-FP（回傳 Promise 時於完成後斷言） */
function tracked(store) {
  const out = {};
  Object.keys(store.actions).forEach((name) => {
    out[name] = function () {
      const r = store.actions[name].apply(null, arguments);
      if (r && typeof r.then === "function") {
        return r.then((v) => { assertInv(store, name); return v; });
      }
      assertInv(store, name);
      return r;
    };
  });
  return out;
}

/**
 * 建立已 init 的 store。未指定 storage／initial 時預寫一般模式主鍵（預設資料）；firstRun: true → 主鍵不存在。
 * 回傳 a 為 tracked actions（每個 action 後斷言 INV-FP）。
 */
function makeStore(opts) {
  const o = opts || {};
  const initial = o.initial !== undefined ? o.initial : (o.firstRun ? {} : { [KEY]: recordOf(o.data || P.defaultData()) });
  const storage = o.storage || fakeStorage(initial, o.record);
  const store = S.createStore({
    storage, content: o.content || fakeContent(), rand: seq(),
    now: o.now || (() => new Date("2026-10-30T10:00:00"))
  });
  store.init();
  assertInv(store, "init");
  return { store, storage, a: tracked(store) };
}

function storedData(storage) {
  return JSON.parse(storage.map.get(KEY)).data;
}

function writesDuring(storage, fn) {
  const before = storage.setCalls.length;
  fn();
  return storage.setCalls.length - before;
}

function tagLog(store) {
  const log = [];
  store.subscribe((st, tags) => log.push(tags.slice()));
  return log;
}

/** 以既有資料建立（修改預設資料後預寫主鍵） */
function storeWithData(mutate, opts) {
  const d = P.defaultData();
  mutate(d);
  return makeStore(Object.assign({ data: d }, opts || {}));
}

/** 模擬測驗目前畫面種類（與 views 相同的推導） */
function kindOf(store) {
  const d = store.getState().data;
  const ids = PF.bankIdsOf(part5Bank());
  return PF.viewKind(d.part5, ids, PF.correctSet(d.part5CorrectIds), d.part5UnansweredOnly);
}

// ════════════════════ V-ST-18：單字卡上次位置 ════════════════════

test("FP-3、AC-18-01：gotoCard 每次 setItem 恰 1 次、主鍵位置 = fromIndex；同一張、越界、非整數 → 0 次", () => {
  const { store, storage, a } = makeStore();
  const set = store.getState().runtime.studySet;
  [3, 4, 10, 0, 20].forEach((i) => {
    assert.equal(writesDuring(storage, () => a.gotoCard(i)), 1, "gotoCard(" + i + ")");
    assert.deepEqual(storedData(storage).flashcardPosition, POS.fromIndex(set, i));
    assert.deepEqual(store.getState().data.flashcardPosition, POS.fromIndex(set, i));
    assert.equal(store.getState().runtime.flashcard.index, i);
  });
  [20, -1, 21, 99, 1.5, "3", NaN, null].forEach((i) => {
    assert.equal(writesDuring(storage, () => a.gotoCard(i)), 0, "gotoCard(" + String(i) + ")");
  });
  assert.equal(store.getState().runtime.flashcard.index, 20);
});

test("FP-3、WR-1：翻面、切換模式、重複點擊 → 不因位置寫入；翻面寫學習紀錄時一併寫出目前位置", () => {
  const { store, storage, a } = makeStore();
  a.gotoCard(4);
  const pos = store.getState().data.flashcardPosition;
  assert.equal(writesDuring(storage, () => { a.setFlashcardMode("quiz"); a.setFlashcardMode("card"); a.gotoCard(4); }), 0);
  // 翻到背面 → 依 LR-3 寫學習紀錄（1 次），寫出內容帶目前位置
  assert.equal(writesDuring(storage, () => a.flipCard()), 1);
  assert.deepEqual(storedData(storage).flashcardPosition, pos);
  // 翻回正面 → 不寫入
  assert.equal(writesDuring(storage, () => a.flipCard()), 0);
  assert.equal(store.getState().data.flashcardPosition, pos);
});

test("AC-44-01、AC-44-09：測驗模式翻到第 8 張後重新載入 → 同一張、單字卡模式、正面；啟動不寫入（RD-4）", () => {
  const { store, storage, a } = makeStore();
  a.gotoCard(7);
  assert.equal(a.setFlashcardMode("quiz").ok, true);
  a.gotoCard(8); // 測驗模式換題 → 也寫入位置
  assert.deepEqual(storedData(storage).flashcardPosition, { wordKey: store.getState().runtime.studySet[8].wordKey, ordinal: 9 });
  const calls = storage.setCalls.length;
  const again = makeStore({ storage });
  assert.equal(storage.setCalls.length, calls, "啟動 setItem 0 次");
  const fc = again.store.getState().runtime.flashcard;
  assert.equal(fc.index, 8);
  assert.equal(fc.mode, "card");
  assert.equal(fc.isFlipped, false);
  assert.equal(fc.quiz, null);
  // 單字卡模式翻面後重新載入 → 正面
  again.a.flipCard();
  const third = makeStore({ storage });
  assert.equal(third.store.getState().runtime.flashcard.index, 8);
  assert.equal(third.store.getState().runtime.flashcard.isFlipped, false);
});

test("AC-44-02：上一張、下一張連續操作，每次重新載入都回到最後顯示的那張", () => {
  const { storage, a } = makeStore();
  const steps = [1, 2, 3, 2, 3, 4, 5, 4];
  steps.forEach((i) => {
    a.gotoCard(i);
    const again = makeStore({ storage });
    assert.equal(again.store.getState().runtime.flashcard.index, i);
  });
});

test("AC-44-03、FP-7：換卡與重新載入不改今日已學、學習歷史、打卡、已掌握", () => {
  const { store, storage, a } = storeWithData((d) => {
    d.todayLearned = { date: TODAY, wordKeys: ["word1"] };
    d.learnedHistory = { [TODAY]: 1 };
    d.streak = { days: 3, lastActiveDate: TODAY };
    d.masteredWordKeys = ["word2"];
  });
  const before = store.getState().data;
  for (let i = 1; i <= 10; i++) { a.gotoCard(i); }
  const after = storedData(storage);
  ["todayLearned", "learnedHistory", "streak", "masteredWordKeys", "vocabQuiz", "part5"].forEach((k) => {
    assert.deepEqual(after[k], JSON.parse(JSON.stringify(before[k])), k);
    assert.deepEqual(store.getState().data[k], before[k], k);
  });
  const again = makeStore({ storage });
  assert.deepEqual(again.store.getState().data.todayLearned, before.todayLearned);
  assert.deepEqual(again.store.getState().data.streak, before.streak);
});

test("AC-44-04：停在自訂單字 Beta，刪除其前的 Alpha 或新增其他字 → 仍是 Beta（以 wordKey 找回），位置與 customVocab 同一次寫入", () => {
  const { store, storage, a } = storeWithData((d) => {
    d.customVocab = [
      customItem("c_a", "Alpha", "2026-10-29T08:00:00.000Z"),
      customItem("c_b", "Beta", "2026-10-29T09:00:00.000Z")
    ];
  });
  a.gotoCard(22); // 21 內建 + Alpha(21)、Beta(22)
  a.flipCard();
  assert.equal(writesDuring(storage, () => a.deleteCustomWord("c_a")), 1);
  let st = store.getState();
  assert.equal(st.runtime.flashcard.index, 21);
  assert.equal(st.runtime.studySet[21].wordKey, "beta");
  assert.equal(st.runtime.flashcard.isFlipped, true, "同一張卡保留翻面");
  assert.deepEqual(storedData(storage).flashcardPosition, { wordKey: "beta", ordinal: 22 });
  assert.deepEqual(storedData(storage).customVocab.map((x) => x.id), ["c_b"]);
  // 新增其他字（排在後面）→ 仍為 Beta、同一次寫入
  let r;
  assert.equal(writesDuring(storage, () => { r = a.addCustomWord({ word: "Gamma", meaning: "丙" }); }), 1);
  assert.equal(r.ok, true);
  st = store.getState();
  assert.equal(st.runtime.studySet[st.runtime.flashcard.index].wordKey, "beta");
  assert.deepEqual(storedData(storage).flashcardPosition, { wordKey: "beta", ordinal: 22 });
  assert.equal(storedData(storage).customVocab.length, 2);
  // 範本注入 → 同樣經 placeCard
  assert.equal(writesDuring(storage, () => a.injectTemplate("cs")), 1);
  st = store.getState();
  assert.equal(st.runtime.studySet[st.runtime.flashcard.index].wordKey, "beta");
  // 重新載入
  const again = makeStore({ storage });
  const rt = again.store.getState().runtime;
  assert.equal(rt.studySet[rt.flashcard.index].wordKey, "beta");
});

test("AC-44-05 (a)、AC-04-08：刪除目前顯示的自訂單字 → 原本下一張；原為最後一張 → 前一張；重新載入相同", () => {
  const { store, storage, a } = storeWithData((d) => {
    d.customVocab = [
      customItem("c_a", "Alpha", "2026-10-29T08:00:00.000Z"),
      customItem("c_b", "Beta", "2026-10-29T09:00:00.000Z"),
      customItem("c_c", "Gamma", "2026-10-29T10:00:00.000Z")
    ];
  });
  a.gotoCard(22); // Beta
  a.deleteCustomWord("c_b");
  assert.equal(store.getState().runtime.flashcard.index, 22);
  assert.equal(store.getState().runtime.studySet[22].wordKey, "gamma");
  assert.deepEqual(storedData(storage).flashcardPosition, { wordKey: "gamma", ordinal: 23 });
  a.deleteCustomWord("c_c"); // Gamma 為最後一張
  assert.equal(store.getState().runtime.flashcard.index, 21);
  assert.equal(store.getState().runtime.studySet[21].wordKey, "alpha");
  const again = makeStore({ storage });
  assert.equal(again.store.getState().runtime.flashcard.index, 21);
});

test("AC-44-05 (b)(c)、AC-44-06：紀錄的字不在單字集 → min(ordinal, N)；錯誤 shape → 第 1 張；皆不寫入、無 unreadable", () => {
  const cases = [
    [{ wordKey: "nope", ordinal: 5 }, 4],
    [{ wordKey: "nope", ordinal: 999 }, 20],
    [{ wordKey: "  Word7  ", ordinal: 1 }, 6], // C-2 正規化後找到 word7
    [{ wordKey: 1, ordinal: 1 }, 0],
    [[1, 2], 0],
    ["word3", 0],
    [{ wordKey: "word3", ordinal: 0 }, 0]
  ];
  cases.forEach(([pos, idx]) => {
    const d = P.defaultData();
    const rec = JSON.parse(recordOf(d));
    rec.data.flashcardPosition = pos;
    const storage = fakeStorage({ [KEY]: JSON.stringify(rec) });
    const { store } = makeStore({ storage });
    const label = JSON.stringify(pos);
    assert.equal(store.getState().runtime.flashcard.index, idx, label);
    assert.deepEqual(storage.setCalls, [], label);
    assert.equal(storage.map.has(UNREADABLE), false, label);
    assert.equal(store.getStartup().status, "ok", label);
  });
});

test("AC-44-07、FP-2 (1)：單字集為空 → 空狀態、index 0、紀錄不動；之後新增單字再依紀錄解析", () => {
  const pos = { wordKey: "solo", ordinal: 5 };
  const { store, storage, a } = storeWithData((d) => { d.flashcardPosition = pos; }, { content: emptyVocabContent() });
  let st = store.getState();
  assert.equal(st.runtime.studySet.length, 0);
  assert.equal(st.runtime.flashcard.index, 0);
  assert.deepEqual(st.data.flashcardPosition, pos);
  assert.deepEqual(storage.setCalls, []);
  a.gotoCard(0);
  assert.deepEqual(storage.setCalls, []);
  // 新增 Solo → 以 wordKey 找到，寫出 { solo, 1 }
  a.addCustomWord({ word: "Solo", meaning: "唯一" });
  st = store.getState();
  assert.equal(st.runtime.studySet.length, 1);
  assert.deepEqual(storedData(storage).flashcardPosition, { wordKey: "solo", ordinal: 1 });
  // 刪到單字集為空 → 紀錄不動（仍寫出原紀錄）
  a.deleteCustomWord(st.data.customVocab[0].id);
  assert.equal(store.getState().runtime.studySet.length, 0);
  assert.deepEqual(store.getState().data.flashcardPosition, { wordKey: "solo", ordinal: 1 });
  assert.deepEqual(storedData(storage).flashcardPosition, { wordKey: "solo", ordinal: 1 });
});

test("AC-44-08 (a)、FP-4、AC-03-05：無學習紀錄時直接套用（生效色級改變）→ 位置 null、第 1 張，與 goal 同一次寫入；重新載入第 1 張", () => {
  const { store, storage, a } = makeStore();
  a.gotoCard(9);
  a.clickColor("brown");
  let r;
  assert.equal(writesDuring(storage, () => { r = a.requestApplyGoal(); }), 1);
  assert.deepEqual(r, { status: "applied" });
  assert.equal(store.getState().runtime.flashcard.index, 0);
  assert.equal(store.getState().data.flashcardPosition, null);
  assert.equal(storedData(storage).flashcardPosition, null);
  assert.equal(storedData(storage).goal.effectiveColor, "brown");
  assert.equal(makeStore({ storage }).store.getState().runtime.flashcard.index, 0);
});

test("AC-44-08 (a)(b)、AC-32-02、CI-9：有學習紀錄 → 確認「確定」位置 null、第 1 張；「取消」位置與卡片不變、setItem 0 次", () => {
  const { store, storage, a } = makeStore();
  a.gotoCard(6);
  a.flipCard(); // 產生學習紀錄
  const pos = store.getState().data.flashcardPosition;
  a.clickColor("brown");
  assert.equal(a.requestApplyGoal().status, "confirm");
  // 取消
  assert.equal(writesDuring(storage, () => a.cancelApplyGoal()), 0);
  assert.equal(store.getState().runtime.flashcard.index, 6);
  assert.equal(store.getState().data.flashcardPosition, pos);
  assert.deepEqual(storedData(storage).flashcardPosition, pos);
  assert.equal(makeStore({ storage }).store.getState().runtime.flashcard.index, 6);
  // 確定
  a.clickColor("brown");
  assert.equal(a.requestApplyGoal().status, "confirm");
  let r;
  assert.equal(writesDuring(storage, () => { r = a.confirmApplyGoal(); }), 1);
  assert.equal(r.ok, true);
  assert.equal(store.getState().runtime.flashcard.index, 0);
  assert.equal(store.getState().data.flashcardPosition, null);
  assert.equal(storedData(storage).flashcardPosition, null);
  assert.equal(makeStore({ storage }).store.getState().runtime.flashcard.index, 0);
});

test("FB-54：綠 → 藍 → 金 套用（生效色級未改變）→ 位置、flashcard、單字集皆不變", () => {
  const { store, storage, a } = makeStore();
  a.gotoCard(11);
  a.flipCard();
  const before = store.getState();
  ["blue", "gold"].forEach((c) => {
    a.clickColor(c);
    assert.equal(a.requestApplyGoal().status, "applied");
    const st = store.getState();
    assert.equal(st.runtime.flashcard, before.runtime.flashcard, c);
    assert.equal(st.runtime.studySet, before.runtime.studySet, c);
    assert.equal(st.data.flashcardPosition, before.data.flashcardPosition, c);
  });
  assert.deepEqual(storedData(storage).flashcardPosition, before.data.flashcardPosition);
});

test("FP-4 末句：首次「開始學習」寫入位置 null、第 1 張", () => {
  const { store, storage, a } = makeStore({ firstRun: true });
  a.gotoCard(3); // 首次模式：只改記憶體（守門）
  assert.deepEqual(storage.setCalls, []);
  a.clickColor("blue");
  assert.equal(writesDuring(storage, () => a.startLearning()), 1);
  assert.equal(storedData(storage).flashcardPosition, null);
  assert.equal(store.getState().data.flashcardPosition, null);
  assert.equal(store.getState().runtime.flashcard.index, 0);
  assert.equal(store.getState().runtime.entryMode, "main");
});

test("FP-6：匯入 → 步驟 9 依備份位置定位（單字卡模式、正面）；解析結果只改記憶體；備份的字不在單字集 → min(ordinal, N)", async () => {
  const src = makeStore();
  src.a.gotoCard(9);
  const json = src.a.exportBackup().json;
  assert.deepEqual(JSON.parse(json).data.flashcardPosition, { wordKey: src.store.getState().runtime.studySet[9].wordKey, ordinal: 10 });

  const dst = makeStore();
  dst.a.gotoCard(2);
  assert.equal(dst.a.setFlashcardMode("quiz").ok, true);
  const r = await dst.a.importBackup(json, () => true);
  assert.equal(r.ok, true);
  const fc = dst.store.getState().runtime.flashcard;
  assert.equal(fc.index, 9);
  assert.equal(fc.mode, "card");
  assert.equal(fc.isFlipped, false);

  // 備份位置的字不在匯入後的單字集（棕：12 張）→ min(10, 12) − 1 = 9；ordinal 超過 N → 最後一張
  const obj = JSON.parse(json);
  obj.data.flashcardPosition = { wordKey: "nope", ordinal: 50 };
  obj.data.goal = { draftScore: 300, appliedScore: 300, appliedColor: "brown", effectiveColor: "brown" };
  const dst2 = makeStore();
  const r2 = await dst2.a.importBackup(JSON.stringify(obj), () => true);
  assert.equal(r2.ok, true);
  assert.equal(dst2.store.getState().runtime.flashcard.index, 11);
  assert.deepEqual(dst2.store.getState().data.flashcardPosition, POS.fromIndex(dst2.store.getState().runtime.studySet, 11));
  // 步驟 8 寫入的是備份值（正規化後），解析結果在下次寫入才寫出（RD-4）
  assert.deepEqual(storedData(dst2.storage).flashcardPosition, { wordKey: "nope", ordinal: 50 });
  dst2.a.setDraftScore(310);
  assert.deepEqual(storedData(dst2.storage).flashcardPosition, POS.fromIndex(dst2.store.getState().runtime.studySet, 11));
});

// ════════════════════ V-ST-19／V-ST-20：答對紀錄與只練沒答對 ════════════════════

test("AC-45-01、CR-2：答對 → part5CorrectIds +1，與計數、打卡同一次 setItem", () => {
  const { store, storage, a } = makeStore();
  let r;
  assert.equal(writesDuring(storage, () => { r = a.answerPart5(0); }), 1);
  assert.deepEqual(r, { ok: true, correct: true });
  const d = storedData(storage);
  assert.deepEqual(d.part5CorrectIds, ["p5-001"]);
  assert.equal(d.part5.totalAnswered, 1);
  assert.equal(d.part5.totalCorrect, 1);
  assert.deepEqual(d.streak, { days: 1, lastActiveDate: TODAY });
  assert.deepEqual(store.getState().data.part5CorrectIds, ["p5-001"]);
});

test("AC-45-02、AC-45-03、LV-3：答錯不記錄；鎖定後重點不變、不寫入；曾答對的題目作答被拒、K 不變、setItem 0 次", () => {
  const { store, storage, a } = makeStore();
  a.answerPart5(1); // 答錯 p5-001
  assert.deepEqual(storedData(storage).part5CorrectIds, []);
  assert.equal(writesDuring(storage, () => a.answerPart5(0)), 0, "鎖定後重點");
  a.nextPart5();
  a.answerPart5(0); // 答對 p5-002
  a.nextPart5();
  a.answerPart5(0); // 答對 p5-003
  assert.deepEqual(storedData(storage).part5CorrectIds, ["p5-002", "p5-003"]);
  a.nextPart5(); a.answerPart5(2); a.nextPart5(); a.answerPart5(2); a.nextPart5(); a.answerPart5(2); a.nextPart5();
  assert.equal(store.getState().data.part5.phase, "summary");
  a.restartPart5();
  a.answerPart5(0); // p5-001 答錯過、未曾答對 → 可作答；答對附加到末尾
  assert.deepEqual(storedData(storage).part5CorrectIds, ["p5-002", "p5-003", "p5-001"]);
  a.nextPart5();
  // p5-002 曾答對 → 為 lockedReview，作答被拒（LV-3）
  const before = store.getState().data;
  [0, 3].forEach((i) => {
    let r;
    assert.equal(writesDuring(storage, () => { r = a.answerPart5(i); }), 0);
    assert.deepEqual(r, { ok: false });
  });
  assert.equal(store.getState().data, before, "狀態為同一參考");
  assert.equal(before.part5.lockedSelection, null);
  assert.deepEqual(storedData(storage).part5CorrectIds, ["p5-002", "p5-003", "p5-001"]);
});

test("LV-3、V-ST-23、AC-48-02：lockedReview 嘗試作答 → a、c、x、y、K、答對紀錄、streak、todayLearned 全部不變，setItem 0 次", () => {
  const { store, storage, a } = storeWithData((d) => {
    d.part5CorrectIds = ["p5-003", "p5-999"];
    Object.assign(d.part5, { currentIndex: 2, roundAnswered: 2, roundCorrect: 1, totalAnswered: 8, totalCorrect: 5 });
    d.streak = { days: 4, lastActiveDate: "2026-10-28" };
    d.todayLearned = { date: TODAY, wordKeys: ["alpha"] };
  });
  const before = JSON.stringify(store.getState().data);
  const ref = store.getState().data;
  const log = tagLog(store);
  [0, 1, 2, 3].forEach((i) => {
    let r;
    assert.equal(writesDuring(storage, () => { r = a.answerPart5(i); }), 0, "選項 " + i);
    assert.deepEqual(r, { ok: false }, "選項 " + i);
  });
  assert.equal(store.getState().data, ref);
  assert.equal(JSON.stringify(store.getState().data), before);
  assert.deepEqual(log, [], "不通知訂閱者");
});

test("LV-4、V-ST-23、AC-48-05：到達與重新載入 lockedReview → setItem 0 次（到達僅「下一題」寫題號 1 次）；lockedSelection 維持 null；重新載入不變", () => {
  const { store, storage, a } = storeWithData((d) => { d.part5CorrectIds = ["p5-002"]; });
  a.answerPart5(1);
  // 按「下一題」到達 lockedReview：只有「下一題」寫入題號 1 次（UO-10）
  assert.equal(writesDuring(storage, () => a.nextPart5()), 1);
  assert.equal(store.getState().data.part5.currentIndex, 1);
  assert.equal(store.getState().data.part5.lockedSelection, null);
  assert.equal(storedData(storage).part5.lockedSelection, null);
  const text = storage.map.get(KEY);
  const calls = storage.setCalls.length;
  // 重新載入：不寫入、狀態不變
  const again = makeStore({ storage });
  assert.equal(storage.setCalls.length, calls, "啟動不寫入");
  assert.equal(storage.map.get(KEY), text);
  const p = again.store.getState().data.part5;
  assert.equal(p.currentIndex, 1);
  assert.equal(p.lockedSelection, null);
  assert.equal(PF.questionState(p, ["p5-001", "p5-002", "p5-003", "p5-004", "p5-005", "p5-006"], PF.correctSet(["p5-002"]), false), "lockedReview");
});

test("UO-10、V-ST-24：lockedReview「下一題」1 次 setItem 只改題號；idle「下一題」0 次；K = Q 由第 i 題恰 Q − i + 1 次進入結算；重新開始回 lockedReview", () => {
  const all = ["p5-001", "p5-002", "p5-003", "p5-004", "p5-005", "p5-006"];
  const { store, storage, a } = storeWithData((d) => {
    d.part5CorrectIds = all.slice();
    Object.assign(d.part5, { currentIndex: 3, roundAnswered: 2, roundCorrect: 1, totalAnswered: 8, totalCorrect: 5 });
    d.streak = { days: 4, lastActiveDate: "2026-10-28" };
  });
  const streak = store.getState().data.streak;
  const today = store.getState().data.todayLearned;
  let steps = 0;
  while (store.getState().data.part5.phase === "question" && steps < 10) {
    assert.equal(writesDuring(storage, () => a.nextPart5()), 1);
    steps++;
  }
  assert.equal(steps, 6 - 4 + 1, "第 4 題起恰 3 次");
  const p = storedData(storage).part5;
  assert.deepEqual(p, { currentIndex: 5, lockedSelection: null, phase: "summary", roundAnswered: 2, roundCorrect: 1, totalAnswered: 8, totalCorrect: 5 });
  assert.deepEqual(store.getState().data.part5CorrectIds, all);
  assert.equal(store.getState().data.streak, streak);
  assert.equal(store.getState().data.todayLearned, today);
  assert.equal(kindOf(store), "summary", "E-126：開關關閉時不是 allCorrect");
  assert.equal(writesDuring(storage, () => a.restartPart5()), 1);
  assert.equal(kindOf(store), "question");
  assert.equal(store.getState().data.part5.currentIndex, 0);
  assert.equal(writesDuring(storage, () => assert.deepEqual(a.answerPart5(0), { ok: false })), 0, "AC-48-04：重新開始後仍鎖定");

  const idle = makeStore();
  assert.equal(writesDuring(idle.storage, () => idle.a.nextPart5()), 0, "idle 不前進、不寫入（AC-48-03）");
  assert.equal(idle.store.getState().data.part5.currentIndex, 0);
});

test("LV-7、AC-48-08 (c)：v1.1.0 留下曾答對題目的答錯結果 → 不重新計分；可「下一題」離開；回到該題時作答被拒", () => {
  const { store, storage, a } = storeWithData((d) => {
    d.part5CorrectIds = ["p5-001"];
    Object.assign(d.part5, { currentIndex: 0, lockedSelection: 2, roundAnswered: 2, roundCorrect: 1, totalAnswered: 9, totalCorrect: 5 });
  });
  assert.deepEqual(storage.setCalls, [], "不遷移、不寫入");
  const p0 = store.getState().data.part5;
  assert.equal(p0.lockedSelection, 2);
  assert.deepEqual(a.answerPart5(0), { ok: false });
  assert.equal(store.getState().data.part5, p0);
  a.nextPart5();
  const p1 = store.getState().data.part5;
  assert.equal(p1.currentIndex, 1);
  assert.equal(p1.lockedSelection, null);
  assert.equal(p1.totalAnswered, 9);
  assert.equal(p1.totalCorrect, 5);
  a.restartPart5();
  assert.equal(store.getState().data.part5.currentIndex, 0);
  assert.equal(store.getState().data.part5.lockedSelection, null);
  assert.deepEqual(a.answerPart5(0), { ok: false }, "回到該題為 lockedReview");
  assert.deepEqual(store.getState().data.part5CorrectIds, ["p5-001"]);
});

test("AC-48-09 (a)：localStorage 停用時工作階段內答對紀錄照常推導，p5-001 重新開始後被鎖定；重新載入後 K = 0", () => {
  const content = fakeContent();
  const storage = fakeStorage({});
  storage.getThrows = true;
  const store = S.createStore({ storage, content, rand: seq(), now: () => new Date("2026-10-30T10:00:00") });
  store.init();
  const a = store.actions;
  assert.deepEqual(a.answerPart5(0), { ok: true, correct: true });
  assert.deepEqual(store.getState().data.part5CorrectIds, ["p5-001"]);
  for (let i = 0; i < 6 && store.getState().data.part5.phase === "question"; i++) {
    a.nextPart5();
    if (store.getState().data.part5.phase === "question") { a.answerPart5(1); }
  }
  assert.equal(store.getState().data.part5.phase, "summary");
  a.restartPart5();
  assert.equal(store.getState().data.part5.currentIndex, 0);
  const before = store.getState().data;
  assert.deepEqual(a.answerPart5(0), { ok: false }, "工作階段內為 lockedReview");
  assert.equal(store.getState().data, before);
  const again = S.createStore({ storage, content, rand: seq(), now: () => new Date("2026-10-30T10:00:00") });
  again.init();
  assert.deepEqual(again.getState().data.part5CorrectIds, [], "重新載入後 K = 0");
  assert.deepEqual(again.actions.answerPart5(0), { ok: true, correct: true }, "回到未作答");
});

test("AC-48-09 (b)：容量已滿時工作階段內同為 lockedReview；不白屏；寫入狀態為 quota", () => {
  const { store, storage, a } = makeStore();
  storage.quota = true;
  assert.deepEqual(a.answerPart5(0), { ok: true, correct: true });
  assert.equal(store.getWriteStatus(), "quota");
  for (let i = 0; i < 6 && store.getState().data.part5.phase === "question"; i++) {
    a.nextPart5();
    if (store.getState().data.part5.phase === "question") { a.answerPart5(1); }
  }
  a.restartPart5();
  const before = store.getState().data;
  assert.deepEqual(before.part5CorrectIds, ["p5-001"]);
  assert.deepEqual(a.answerPart5(0), { ok: false });
  assert.equal(store.getState().data, before);
});

/**
 * 開關關閉的模擬測驗規則（參考模型）：未曾答對的題目與 v0.14 相同；
 * （v0.18）曾答對且無本次作答結果的題目不可作答（LV-3），「下一題」可前進（UO-10）。
 */
function v014Model(bank) {
  const m = { p: { currentIndex: 0, lockedSelection: null, phase: "question", roundAnswered: 0, roundCorrect: 0, totalAnswered: 0, totalCorrect: 0 }, correct: new Set() };
  m.answer = (i) => {
    const p = m.p;
    if (p.phase !== "question" || p.lockedSelection !== null || m.correct.has(bank[p.currentIndex].id)) { return; }
    const ok = i === bank[p.currentIndex].correctIndex;
    if (ok) { m.correct.add(bank[p.currentIndex].id); }
    m.p = Object.assign({}, p, { lockedSelection: i, roundAnswered: p.roundAnswered + 1, roundCorrect: p.roundCorrect + (ok ? 1 : 0),
      totalAnswered: p.totalAnswered + 1, totalCorrect: p.totalCorrect + (ok ? 1 : 0) });
  };
  m.next = () => {
    const p = m.p;
    if (p.phase !== "question" || (p.lockedSelection === null && !m.correct.has(bank[p.currentIndex].id))) { return; }
    m.p = p.currentIndex >= bank.length - 1 ? Object.assign({}, p, { lockedSelection: null, phase: "summary" })
      : Object.assign({}, p, { currentIndex: p.currentIndex + 1, lockedSelection: null });
  };
  m.restart = () => {
    m.p = Object.assign({}, m.p, { currentIndex: 0, lockedSelection: null, phase: "question", roundAnswered: 0, roundCorrect: 0 });
  };
  return m;
}

test("AC-45-06、CR-5、UO-2、LV-3、UO-10：開關關閉時計數、結算、主控台正確率與參考模型同一操作序列完全相同", () => {
  const { store, storage, a } = makeStore();
  const m = v014Model(part5Bank());
  const ops = [
    ["answer", 0], ["next"], ["answer", 1], ["next"], ["answer", 0], ["answer", 0], ["next"], ["answer", 2], ["next"],
    ["answer", 0], ["next"], ["answer", 0], ["next"], ["restart"], ["answer", 0], ["next"], ["answer", 3], ["next"],
    ["answer", 0], ["next"], ["next"], ["answer", 0], ["next"], ["answer", 0], ["next"], ["answer", 1], ["next"], ["restart"]
  ];
  ops.forEach(([op, arg], k) => {
    if (op === "answer") { a.answerPart5(arg); m.answer(arg); }
    if (op === "next") { a.nextPart5(); m.next(); }
    if (op === "restart") { a.restartPart5(); m.restart(); }
    const d = store.getState().data;
    assert.deepEqual(d.part5, m.p, "第 " + (k + 1) + " 步 " + op);
    assert.deepEqual(storedData(storage).part5, m.p, "第 " + (k + 1) + " 步（主鍵）");
    const rate = d.part5.totalAnswered === 0 ? null : d.part5.totalCorrect / d.part5.totalAnswered;
    const ref = m.p.totalAnswered === 0 ? null : m.p.totalCorrect / m.p.totalAnswered;
    assert.equal(rate, ref);
  });
  assert.deepEqual(store.getState().data.streak, { days: 1, lastActiveDate: TODAY });
  assert.deepEqual(store.getState().data.todayLearned, { date: null, wordKeys: [] }, "模擬測驗不計入今日已學");
});

test("AC-48-03：只含未曾答對題目的操作序列，計數與寫入與 v0.14 相同（每題作答 1 次寫入，idle 不可按「下一題」）", () => {
  const { store, storage, a } = makeStore();
  const v014 = { currentIndex: 0, lockedSelection: null, phase: "question", roundAnswered: 0, roundCorrect: 0, totalAnswered: 0, totalCorrect: 0 };
  let p = v014;
  // 全部答錯（皆未曾答對）；重新開始後仍可作答
  for (let round = 0; round < 2; round++) {
    for (let q = 0; q < 6; q++) {
      assert.equal(writesDuring(storage, () => a.nextPart5()), 0, "idle 不前進");
      assert.equal(writesDuring(storage, () => a.answerPart5(1)), 1);
      p = Object.assign({}, p, { lockedSelection: 1, roundAnswered: p.roundAnswered + 1, totalAnswered: p.totalAnswered + 1 });
      assert.deepEqual(store.getState().data.part5, p);
      assert.equal(writesDuring(storage, () => a.nextPart5()), 1);
      p = q === 5 ? Object.assign({}, p, { lockedSelection: null, phase: "summary" })
        : Object.assign({}, p, { lockedSelection: null, currentIndex: p.currentIndex + 1 });
      assert.deepEqual(store.getState().data.part5, p);
    }
    assert.equal(writesDuring(storage, () => a.restartPart5()), 1);
    p = Object.assign({}, p, { currentIndex: 0, lockedSelection: null, phase: "question", roundAnswered: 0, roundCorrect: 0 });
    assert.deepEqual(store.getState().data.part5, p);
  }
  assert.deepEqual(store.getState().data.part5CorrectIds, []);
});

test("AC-46-03、UO-5：開關開啟，p5-002、p5-003 曾答對 → p5-001 作答後「下一題」跳到 p5-004（第 4 題）；被跳過的題目不計入", () => {
  const { store, storage, a } = storeWithData((d) => { d.part5CorrectIds = ["p5-002", "p5-003"]; d.part5UnansweredOnly = true; });
  a.answerPart5(1);
  assert.equal(writesDuring(storage, () => a.nextPart5()), 1);
  const p = store.getState().data.part5;
  assert.equal(p.currentIndex, 3);
  assert.equal(p.lockedSelection, null);
  assert.equal(p.roundAnswered, 1);
  assert.equal(p.totalAnswered, 1);
  assert.equal(storedData(storage).part5.currentIndex, 3);
});

test("AC-46-04、UO-1、UO-4：開啟當下目前題目曾答對且未作答 → 跳到其後第一題未答對，與開關同一次 setItem；計數不變", () => {
  const { store, storage, a } = storeWithData((d) => {
    d.part5CorrectIds = ["p5-001", "p5-002"];
    d.part5.totalAnswered = 5; d.part5.totalCorrect = 3; d.part5.roundAnswered = 2; d.part5.roundCorrect = 1;
  });
  const before = store.getState().data.part5;
  let r;
  assert.equal(writesDuring(storage, () => { r = a.setPart5UnansweredOnly(true); }), 1);
  assert.deepEqual(r, { changed: true });
  const d = storedData(storage);
  assert.equal(d.part5UnansweredOnly, true);
  assert.equal(d.part5.currentIndex, 2);
  ["roundAnswered", "roundCorrect", "totalAnswered", "totalCorrect"].forEach((k) => assert.equal(d.part5[k], before[k], k));
  assert.equal(kindOf(store), "question");
});

test("AC-46-04 (b)、UO-4：已作答鎖定的曾答對題 → 開啟時不移動；其後皆曾答對 → summary", () => {
  // (b) 鎖定中
  const s1 = storeWithData((d) => { d.part5CorrectIds = ["p5-001"]; d.part5.lockedSelection = 0; });
  s1.a.setPart5UnansweredOnly(true);
  assert.equal(s1.store.getState().data.part5.currentIndex, 0);
  assert.equal(s1.store.getState().data.part5.lockedSelection, 0);
  // 目前 p5-005，其後 p5-005、p5-006 皆曾答對、之前仍有未答對 → summary
  const s2 = storeWithData((d) => { d.part5.currentIndex = 4; d.part5CorrectIds = ["p5-005", "p5-006"]; });
  s2.a.setPart5UnansweredOnly(true);
  assert.equal(s2.store.getState().data.part5.phase, "summary");
  assert.equal(kindOf(s2.store), "summary");
  // UO-6：結算畫面「重新開始」→ 第一題未答對
  s2.a.restartPart5();
  assert.equal(s2.store.getState().data.part5.currentIndex, 0);
  assert.equal(s2.store.getState().data.part5.phase, "question");
});

test("AC-46-05、UO-5、UO-6：開關開啟，其後沒有未答對 → 「下一題」進入結算；重新開始從第一題未答對開始", () => {
  const { store, a } = storeWithData((d) => {
    d.part5UnansweredOnly = true; d.part5CorrectIds = ["p5-001", "p5-005", "p5-006"]; d.part5.currentIndex = 3;
  });
  a.answerPart5(1); // p5-004 答錯
  a.nextPart5();
  assert.equal(store.getState().data.part5.phase, "summary");
  a.restartPart5();
  const p = store.getState().data.part5;
  assert.equal(p.currentIndex, 1);
  assert.equal(p.roundAnswered, 0);
  assert.equal(p.totalAnswered, 1);
});

test("AC-46-09、UO-8：開關由開變關 → part5 不變、1 次 setItem；之後依 v0.14 順序", () => {
  const { store, storage, a } = storeWithData((d) => { d.part5UnansweredOnly = true; d.part5CorrectIds = ["p5-002"]; });
  const p = store.getState().data.part5;
  assert.equal(writesDuring(storage, () => a.setPart5UnansweredOnly(false)), 1);
  assert.equal(store.getState().data.part5, p);
  assert.equal(storedData(storage).part5UnansweredOnly, false);
  a.answerPart5(0);
  a.nextPart5();
  assert.equal(store.getState().data.part5.currentIndex, 1, "不再跳過曾答對的 p5-002");
});

test("UO-1：非布林、與原值相同 → { changed: false }、不寫入；題庫為空 → part5 action 一律不動作", () => {
  const { store, storage, a } = makeStore();
  [undefined, null, 1, "true", {}].forEach((v) => {
    assert.deepEqual(a.setPart5UnansweredOnly(v), { changed: false }, String(v));
  });
  assert.deepEqual(a.setPart5UnansweredOnly(false), { changed: false });
  assert.deepEqual(storage.setCalls, []);

  const empty = makeStore({ content: fakeContent({ part5: [] }) });
  const before = empty.store.getState();
  assert.deepEqual(empty.a.setPart5UnansweredOnly(true), { changed: false });
  assert.deepEqual(empty.a.answerPart5(0), { ok: false });
  empty.a.nextPart5();
  empty.a.restartPart5();
  assert.deepEqual(empty.a.clearPart5CorrectIds(), { ok: false });
  assert.deepEqual(empty.storage.setCalls, []);
  assert.equal(empty.store.getState().data, before.data);
  assert.equal(store.getState().data.part5UnansweredOnly, false);
});

test("UO-3、UO-7、AC-46-06：K = Q − 1 時答對最後一題 → 鎖定時仍為 question；「下一題」→ allCorrect；allCorrect 時作答被拒", () => {
  const { store, storage, a } = storeWithData((d) => {
    d.part5UnansweredOnly = true; d.part5CorrectIds = ["p5-001", "p5-002", "p5-003", "p5-004", "p5-006"];
  });
  assert.equal(store.getState().data.part5.currentIndex, 4, "啟動 UO-4 跳到 p5-005");
  assert.deepEqual(storage.setCalls, [], "啟動不寫入（RD-4）");
  a.answerPart5(0);
  assert.equal(kindOf(store), "question");
  a.nextPart5();
  assert.equal(store.getState().data.part5.phase, "summary");
  assert.equal(kindOf(store), "allCorrect");
  assert.equal(writesDuring(storage, () => assert.deepEqual(a.answerPart5(0), { ok: false })), 0);
  // 本輪結算在 allCorrect 仍保留（inSummary）
  assert.equal(store.getState().data.part5.roundAnswered, 1);
});

test("UO-7：replay 動作已移除，不再匯出", () => {
  const { store } = makeStore();
  assert.equal(store.actions["replayPart5" + "KeepRecords"], undefined);
});

test("UO-8 (a)、AC-48-10、V-ST-26：allCorrect 三種進入方式關閉開關 → 第 1 題 lockedReview、本輪 0、K = Q、a、c 不變、1 次 setItem；重新載入不變；恰 Q 次進入 y = 0 結算", () => {
  const all = ["p5-001", "p5-002", "p5-003", "p5-004", "p5-005", "p5-006"];
  const entries = {
    // 作答結束進入：答對最後一題後按「下一題」
    answering() {
      const s = storeWithData((d) => {
        d.part5UnansweredOnly = true; d.part5CorrectIds = all.slice(0, 5);
        Object.assign(d.part5, { currentIndex: 5, totalAnswered: 39, totalCorrect: 29 });
      });
      s.a.answerPart5(0);
      s.a.nextPart5();
      return s;
    },
    // K = Q 時開啟開關進入：結算畫面（y ≥ 1）開啟
    toggle() {
      const s = storeWithData((d) => {
        d.part5CorrectIds = all.slice();
        Object.assign(d.part5, { currentIndex: 5, phase: "summary", roundAnswered: 2, roundCorrect: 2, totalAnswered: 40, totalCorrect: 30 });
      });
      s.a.setPart5UnansweredOnly(true);
      return s;
    },
    // 重新載入進入：開關開啟、K = Q 的舊資料
    reload() {
      return storeWithData((d) => {
        d.part5UnansweredOnly = true; d.part5CorrectIds = all.slice();
        Object.assign(d.part5, { currentIndex: 2, totalAnswered: 40, totalCorrect: 30 });
      });
    }
  };
  Object.keys(entries).forEach((name) => {
    const { store, storage, a } = entries[name]();
    assert.equal(kindOf(store), "allCorrect", name);
    let r;
    assert.equal(writesDuring(storage, () => { r = a.setPart5UnansweredOnly(false); }), 1, name);
    assert.deepEqual(r, { changed: true }, name);
    const d = storedData(storage);
    assert.equal(d.part5UnansweredOnly, false, name);
    assert.deepEqual(d.part5, { currentIndex: 0, lockedSelection: null, phase: "question", roundAnswered: 0, roundCorrect: 0, totalAnswered: 40, totalCorrect: 30 }, name);
    assert.deepEqual(d.part5CorrectIds, all, name);
    assert.equal(kindOf(store), "question", name);
    assert.deepEqual(a.answerPart5(0), { ok: false }, name + "：lockedReview");
    // 重新載入不變
    const again = makeStore({ storage });
    assert.deepEqual(again.store.getState().data.part5, d.part5, name);
    assert.equal(again.store.getState().data.part5UnansweredOnly, false, name);
    // 恰 Q 次「下一題」進入 y = 0 結算
    for (let i = 0; i < 6; i++) {
      assert.equal(store.getState().data.part5.phase, "question", name + " 第 " + i + " 次");
      a.nextPart5();
    }
    assert.equal(store.getState().data.part5.phase, "summary", name);
    assert.equal(store.getState().data.part5.roundAnswered, 0, name);
    assert.equal(kindOf(store), "summary", name);
  });
});

test("UO-8 (b)、AC-46-09 (a)：K = Q 但顯示本次作答結果時關閉開關 → part5 同一參考、1 次 setItem", () => {
  const all = ["p5-001", "p5-002", "p5-003", "p5-004", "p5-005", "p5-006"];
  const { store, storage, a } = storeWithData((d) => {
    d.part5UnansweredOnly = true; d.part5CorrectIds = all.slice(0, 5); d.part5.currentIndex = 5;
  });
  a.answerPart5(0);
  const p = store.getState().data.part5;
  assert.equal(kindOf(store), "question");
  assert.equal(writesDuring(storage, () => a.setPart5UnansweredOnly(false)), 1);
  assert.equal(store.getState().data.part5, p);
  assert.equal(store.getState().data.part5.lockedSelection, 0);
});

test("CR-6、CR-10、AC-48-11、AC-46-08、FB-60：K ≥ 1 時開關開啟與關閉、question、summary、allCorrect 皆生效 → ids []、開關維持、第 1 題、累計不變、streak 不變、1 次 setItem", () => {
  const all = ["p5-001", "p5-002", "p5-003", "p5-004", "p5-005", "p5-006", "p5-999"];
  [
    ["關閉 lockedReview", (d) => { d.part5CorrectIds = ["p5-001"]; }, "question"],
    ["關閉 idle", (d) => { d.part5CorrectIds = ["p5-001"]; d.part5.currentIndex = 1; }, "question"],
    ["關閉 answered（E-133）", (d) => { d.part5CorrectIds = ["p5-001"]; d.part5.currentIndex = 1; d.part5.lockedSelection = 2; }, "question"],
    ["關閉 summary", (d) => { d.part5CorrectIds = ["p5-001"]; d.part5.phase = "summary"; d.part5.roundAnswered = 2; }, "summary"],
    ["開啟 idle", (d) => { d.part5UnansweredOnly = true; d.part5CorrectIds = ["p5-001"]; d.part5.currentIndex = 1; }, "question"],
    ["開啟 summary", (d) => { d.part5UnansweredOnly = true; d.part5CorrectIds = ["p5-006"]; d.part5.phase = "summary"; }, "summary"],
    ["開啟 allCorrect", (d) => { d.part5UnansweredOnly = true; d.part5CorrectIds = all.slice(); }, "allCorrect"]
  ].forEach(([name, patch, kind]) => {
    const { store, storage, a } = storeWithData((d) => {
      patch(d);
      d.part5.totalAnswered = 12; d.part5.totalCorrect = 9;
      d.streak = { days: 4, lastActiveDate: "2026-10-28" };
    });
    const only = store.getState().data.part5UnansweredOnly;
    assert.equal(kindOf(store), kind, name);
    assert.deepEqual(storage.setCalls, [], name);
    let r;
    assert.equal(writesDuring(storage, () => { r = a.clearPart5CorrectIds(); }), 1, name);
    assert.deepEqual(r, { ok: true }, name);
    const d = storedData(storage);
    assert.deepEqual(d.part5CorrectIds, [], name);
    assert.equal(d.part5UnansweredOnly, only, name);
    assert.deepEqual(d.part5, { currentIndex: 0, lockedSelection: null, phase: "question", roundAnswered: 0, roundCorrect: 0, totalAnswered: 12, totalCorrect: 9 }, name);
    assert.deepEqual(d.streak, { days: 4, lastActiveDate: "2026-10-28" }, name + "：不打卡");
    assert.equal(kindOf(store), "question", name);
    // 此時 K = 0，再次呼叫不動作
    assert.equal(writesDuring(storage, () => assert.deepEqual(a.clearPart5CorrectIds(), { ok: false })), 0, name);
  });
});

test("CR-10、E-132：K = 0、答對紀錄只含題庫不存在的 id → { ok: false }、setItem 0 次、紀錄保留", () => {
  [[], ["p5-999", "p5-888"]].forEach((ids) => {
    [true, false].forEach((only) => {
      const { store, storage, a } = storeWithData((d) => { d.part5CorrectIds = ids.slice(); d.part5UnansweredOnly = only; });
      const before = store.getState().data;
      assert.equal(writesDuring(storage, () => assert.deepEqual(a.clearPart5CorrectIds(), { ok: false })), 0);
      assert.equal(store.getState().data, before);
      assert.deepEqual(before.part5CorrectIds, ids);
    });
  });
});

test("CR-6、AC-46-08、FB-60：clear 通知 part5、stats；未呼叫時 0 次；題庫不存在的 id 一併清空", () => {
  const all = ["p5-001", "p5-002", "p5-003", "p5-004", "p5-005", "p5-006", "p5-999"];
  const { store, storage, a } = storeWithData((d) => {
    d.part5UnansweredOnly = true; d.part5CorrectIds = all.slice();
    Object.assign(d.part5, { currentIndex: 2, totalAnswered: 12, totalCorrect: 9 });
  });
  assert.equal(kindOf(store), "allCorrect");
  // view 顯示確認對話框、按「取消」→ 不呼叫 action
  assert.deepEqual(storage.setCalls, []);
  const log = tagLog(store);
  let r;
  assert.equal(writesDuring(storage, () => { r = a.clearPart5CorrectIds(); }), 1);
  assert.deepEqual(r, { ok: true });
  assert.ok(log[0].includes("part5") && log[0].includes("stats"));
  const d = storedData(storage);
  assert.deepEqual(d.part5CorrectIds, []);
  assert.equal(d.part5UnansweredOnly, true);
  assert.deepEqual(d.part5, { currentIndex: 0, lockedSelection: null, phase: "question", roundAnswered: 0, roundCorrect: 0, totalAnswered: 12, totalCorrect: 9 });
  assert.equal(kindOf(store), "question");
});

test("AC-45-08、CI-4、CI-8：初始化「確定」→ ids []、開關保留、位置 null；開關開啟時第 1 題不移動", () => {
  const { store, storage, a } = storeWithData((d) => {
    d.part5UnansweredOnly = true; d.part5CorrectIds = ["p5-001", "p5-003"]; d.part5.currentIndex = 1;
    d.part5.totalAnswered = 4; d.part5.totalCorrect = 2;
  });
  a.gotoCard(5);
  a.clickColor("brown");
  assert.equal(a.requestApplyGoal().status, "confirm");
  assert.equal(a.confirmApplyGoal().ok, true);
  const d = storedData(storage);
  assert.deepEqual(d.part5CorrectIds, []);
  assert.equal(d.part5UnansweredOnly, true);
  assert.equal(d.flashcardPosition, null);
  assert.equal(d.part5.currentIndex, 0);
  assert.equal(store.getState().data.part5.currentIndex, 0);
  const again = makeStore({ storage });
  assert.equal(again.store.getState().data.part5UnansweredOnly, true);
  assert.equal(again.store.getState().data.part5.currentIndex, 0);
});

test("AC-46-10、AC-47-01：開關、答對紀錄、位置在重新載入後保留；啟動 UO-4 只改記憶體（RD-4）", () => {
  const { store, storage, a } = makeStore();
  a.answerPart5(0);
  a.nextPart5();
  a.answerPart5(0);
  a.nextPart5();
  a.setPart5UnansweredOnly(true);
  a.gotoCard(13);
  const d = store.getState().data;
  const text = storage.map.get(KEY);
  const again = makeStore({ storage });
  const d2 = again.store.getState().data;
  assert.equal(d2.part5UnansweredOnly, true);
  assert.deepEqual(d2.part5CorrectIds, d.part5CorrectIds);
  assert.equal(again.store.getState().runtime.flashcard.index, 13);
  assert.equal(storage.map.get(KEY), text, "啟動不寫入");
  // 啟動時目前題目曾答對且未作答 → 記憶體跳題，主鍵不變
  const rec = JSON.parse(text);
  rec.data.part5 = Object.assign(rec.data.part5, { currentIndex: 0, lockedSelection: null, phase: "question" });
  const st2 = fakeStorage({ [KEY]: JSON.stringify(rec) });
  const third = makeStore({ storage: st2 });
  assert.equal(third.store.getState().data.part5.currentIndex, 2);
  assert.deepEqual(st2.setCalls, []);
});

test("AC-47-02、V-IMP-01：匯出 → 清空 storage → 首次畫面匯入 → 位置、答對紀錄、開關 3 項還原；重新載入相同", async () => {
  const src = makeStore();
  src.a.answerPart5(0);
  src.a.nextPart5();
  src.a.answerPart5(1);
  src.a.nextPart5();
  src.a.answerPart5(0);
  src.a.setPart5UnansweredOnly(true);
  src.a.gotoCard(15);
  const srcData = src.store.getState().data;
  const json = src.a.exportBackup().json;
  const exported = JSON.parse(json);
  assert.equal(exported.schemaVersion, C.CURRENT_SCHEMA_VERSION);
  assert.deepEqual(exported.data.part5CorrectIds, ["p5-001", "p5-003"]);
  assert.equal(exported.data.part5UnansweredOnly, true);

  // 清除網站資料 → 首次畫面
  const dst = makeStore({ firstRun: true });
  assert.equal(dst.store.getState().runtime.entryMode, "firstRun");
  const r = await dst.a.importBackup(json, () => true);
  assert.equal(r.ok, true);
  const st = dst.store.getState();
  assert.equal(st.runtime.entryMode, "main");
  assert.equal(st.runtime.flashcard.index, 15);
  assert.deepEqual(st.data.flashcardPosition, srcData.flashcardPosition);
  assert.deepEqual(st.data.part5CorrectIds, srcData.part5CorrectIds);
  assert.equal(st.data.part5UnansweredOnly, true);
  assert.deepEqual(st.data.part5, srcData.part5);
  const again = makeStore({ storage: dst.storage });
  assert.equal(again.store.getState().runtime.flashcard.index, 15);
  assert.deepEqual(again.store.getState().data.part5CorrectIds, srcData.part5CorrectIds);
  assert.equal(again.store.getState().data.part5UnansweredOnly, true);
});

test("AC-47-04、V-ST-21：v0.14 樣本（schemaVersion 2）啟動 → 第 1 張、K = 0、開關關閉；換卡後寫入 v3 位置", () => {
  const text = fs.readFileSync(path.join(__dirname, "_samples", "v014-state.json"), "utf8");
  const storage = fakeStorage({ [KEY]: text });
  const { store, a } = makeStore({ storage, now: () => new Date(2026, 10, 4, 12, 0, 0) });
  assert.deepEqual(store.getStartup(), { status: "ok", migrated: true });
  assert.deepEqual(storage.setCalls, [KEY], "MG-7 寫回 1 次");
  const st = store.getState();
  assert.equal(st.runtime.flashcard.index, 0);
  assert.equal(st.runtime.flashcard.mode, "card");
  assert.equal(st.data.flashcardPosition, null);
  assert.deepEqual(st.data.part5CorrectIds, []);
  assert.equal(st.data.part5UnansweredOnly, false);
  a.gotoCard(2);
  assert.deepEqual(storedData(storage).flashcardPosition, POS.fromIndex(st.runtime.studySet, 2));
  assert.equal(JSON.parse(storage.map.get(KEY)).schemaVersion, 3);
});

// ════════════════════ V-ST-22：寫入失敗 ════════════════════

test("V-ST-22、WR-2、AC-44-10 (b)、AC-47-07 (b)、AC-30-14：容量不足下混合 20 次寫入 → learningQuota 恰 1 次、無 storage、記憶體照常、主鍵原值不變", () => {
  const { store, storage, a } = makeStore();
  a.answerPart5(0); // p5-001 答對（容量充足時）
  const saved = storage.map.get(KEY);
  storage.quota = true;
  const log = tagLog(store);
  const ops = [
    () => a.gotoCard(1), () => a.flipCard(), () => a.gotoCard(2), () => a.clickColor("blue"), () => a.nextPart5(),
    () => a.answerPart5(0), () => a.setPart5UnansweredOnly(true), () => a.gotoCard(3), () => a.flipCard(), () => a.nextPart5(),
    () => a.answerPart5(1), () => a.setPart5UnansweredOnly(false), () => a.clickColor("gold"), () => a.gotoCard(4), () => a.flipCard(),
    () => a.nextPart5(), () => a.answerPart5(0), () => a.setPart5UnansweredOnly(true), () => a.gotoCard(5), () => a.clickColor("green")
  ];
  const before = storage.setCalls.length;
  ops.forEach((f) => f());
  assert.equal(storage.setCalls.length - before, 20, "每次都嘗試寫入");
  assert.equal(log.flat().filter((t) => t === "learningQuota").length, 1);
  assert.equal(log.flat().includes("storage"), false);
  assert.equal(storage.map.get(KEY), saved);
  assert.equal(store.getWriteStatus(), "quota");
  const st = store.getState();
  assert.equal(st.runtime.learningQuotaNoticeShown, true);
  assert.equal(st.runtime.flashcard.index, 5);
  assert.deepEqual(st.data.flashcardPosition, POS.fromIndex(st.runtime.studySet, 5));
  assert.deepEqual(st.data.part5CorrectIds, ["p5-001", "p5-002", "p5-004"]);
  assert.equal(st.data.part5UnansweredOnly, true);
  assert.equal(st.data.part5.totalAnswered, 4);
  // 解除後下一次寫入成功、寫出全部記憶體值
  storage.quota = false;
  a.gotoCard(6);
  assert.equal(store.getWriteStatus(), "ok");
  assert.deepEqual(storedData(storage).part5CorrectIds, ["p5-001", "p5-002", "p5-004"]);
});

test("WR-2：其他寫入例外 → 記憶體照常、不提示", () => {
  const { store, storage, a } = makeStore();
  storage.otherError = true;
  const log = tagLog(store);
  a.gotoCard(3);
  a.answerPart5(0);
  a.setPart5UnansweredOnly(true);
  assert.equal(store.getState().runtime.flashcard.index, 3);
  assert.deepEqual(store.getState().data.part5CorrectIds, ["p5-001"]);
  assert.equal(log.flat().includes("learningQuota"), false);
  assert.equal(log.flat().includes("storage"), false);
  assert.equal(store.getWriteStatus(), "error");
});

test("WR-3、FP-9、AC-44-10 (a)、AC-47-07 (a)：localStorage 停用 → 記憶體照常、setItem 0 次；重新載入回預設", () => {
  const storage = fakeStorage({});
  storage.getThrows = true;
  const { store, a } = makeStore({ storage });
  assert.equal(store.getState().runtime.storageStatus, "unavailable");
  a.startLearning();
  a.gotoCard(7);
  a.setTab("part5");
  a.setTab("flashcards");
  assert.equal(store.getState().runtime.flashcard.index, 7, "同一工作階段回到單字卡頁仍為該張");
  a.answerPart5(0);
  a.setPart5UnansweredOnly(true);
  assert.deepEqual(store.getState().data.part5CorrectIds, ["p5-001"]);
  assert.equal(store.getState().data.part5UnansweredOnly, true);
  assert.deepEqual(storage.setCalls, []);
  const again = makeStore({ storage });
  const st = again.store.getState();
  assert.equal(st.runtime.flashcard.index, 0);
  assert.deepEqual(st.data.part5CorrectIds, []);
  assert.equal(st.data.part5UnansweredOnly, false);
});

// ════════════════════ 效能 ════════════════════

test("效能（architecture §7.21.2、T-78）：1,000 個自訂單字狀態下 200 次 gotoCard 平均 < 5 ms（Node）", () => {
  const d = P.defaultData();
  d.customVocab = [];
  for (let i = 0; i < 1000; i++) {
    const n = String(i).padStart(4, "0");
    d.customVocab.push(Object.assign(customItem("c_" + n, "custom" + n, new Date(Date.UTC(2026, 9, 1, 0, 0, i)).toISOString()), {
      meaning: "自訂釋義第 " + n + " 個", example: "This is example sentence number " + n + ".", collocation: "custom collocation " + n
    }));
  }
  const { store, storage, a } = makeStore({ data: d, record: false });
  const N = store.getState().runtime.studySet.length;
  assert.equal(N, 1021);
  const rand = seq();
  const targets = [];
  let prev = 0;
  for (let k = 0; k < 200; k++) {
    let t = Math.floor(rand() * N);
    if (t === prev) { t = (t + 1) % N; }
    targets.push(t);
    prev = t;
  }
  const calls = storage.setCalls.length;
  const t0 = process.hrtime.bigint();
  targets.forEach((t) => store.actions.gotoCard(t));
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  const avg = ms / 200;
  assert.equal(storage.setCalls.length - calls, 200);
  assertInv(store, "效能");
  console.log("[FE-74 效能] 1,000 個自訂單字（N = " + N + "）200 次 gotoCard：總計 " + ms.toFixed(1) + " ms、平均 " + avg.toFixed(3) + " ms／次");
  assert.ok(avg < 5, "平均 " + avg.toFixed(3) + " ms");
  a.gotoCard(0);
});
