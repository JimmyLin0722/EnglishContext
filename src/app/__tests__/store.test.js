/*
 * store.test.js — 狀態 store 與 localStorage 轉接單元測試（FE-07）
 * 以注入的假 storage 與假 content 測試 createStore。
 * 涵蓋：AC-01-02、AC-01-04、AC-01-07、AC-02-08、AC-03-05、AC-04-05、AC-04-07、AC-04-08、AC-06-05、AC-08-13、
 *       AC-09-04、AC-11-03～AC-11-07、AC-17-02、AC-17-03、AC-18-01～AC-18-05、AC-24-03、AC-24-04、AC-24-09、
 *       契約 README §5.3、§6.2、V-ST-03～V-ST-06、V-IMP-01、DF-01
 * （v0.8，FE-25）今日學習紀錄：AC-30-03、AC-30-04、AC-30-06、AC-30-07、AC-30-09、AC-30-11～AC-30-14、
 *       AC-24-02、AC-24-10、AC-24-11、LR-1～LR-7、MG-3、RD-1、RD-2；寫入主鍵的每一筆 data 皆以
 *       validatePersistedData(data, { written: true }) 驗證（test.after）
 * （v0.8，FE-30）首次進入流程：AC-18-02、AC-18-03、AC-24-10、AC-25-01～AC-25-05、AC-25-07～AC-25-11、
 *       FS-1～FS-7、V-ST-13、V-IMP-01。makeStore 未指定 storage 時預寫一般模式主鍵；首次模式以 firstRun: true 建立
 * （v0.9，FE-37）切換難易度初始化與隱藏頁：AC-32-01～AC-32-11、AC-01-02、AC-01-07、AC-03-05、AC-17-02、AC-20-04、
 *       契約 §5.7 CI-1～CI-10、§5.8 HT-1、V-ST-14（以計數假 storage 斷言 setItem 次數）
 * （v0.10，FE-42）R-19、Q-39：預設分數 725（一律以 C.SCORE_DEFAULT 斷言，GS-7）；點卡片 = 該色 scoreMax（GS-2、V-ST-16）；
 *       既有分數不轉換（GS-3、GS-4、AC-26-06，依 FB-36 以 draftScore = appliedScore 預寫）；US-32 案例改為點卡片。
 *       以 600 代表「v0.9 以前既有分數」的 fixture（learnedData、existingStore(600)）刻意保留，不得改成 725（T-42）。
 * （v0.15，FE-74）一般寫入容量不足改為「learningQuota 整個工作階段至多 1 次、不發 storage」，一般例外不提示（WR-2、§7.21.5）；
 *       applyGoal 生效色級未改變不回第 1 張（FB-54）；deleteCustomWord 定位經 placeCard、結果同 AC-04-08；
 *       gotoCard 換卡依 FP-3 寫入位置。位置、答對紀錄、開關的完整案例見 store-track.test.js。
 * （v0.20，FE-91）sttStatus 4 種狀態與 preparingPhase 子階段規則（AC-58-01、AC-58-12、AC-59-07、V-STT-01、V-STT-10）：
 *       只在記憶體、setItem 0 次；寫入主鍵與匯出備份皆不含 sttStatus、preparingPhase。
 * （v0.23，FE-106）runtime.flashcard 形狀加 islandFeedback（啟動為 null）；學完回饋完整案例見 store-island.test.js。
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
const G = require("../core/goal.js");

const KEY = "englishMasterTrack:state";
const UNREADABLE = "englishMasterTrack:unreadable";

// ── 假 storage ──

/** 所有假 storage 寫入主鍵的內容；檔案結束時統一驗證（architecture §7.8、§10.1：每筆都須通過 written 驗證） */
const allMainWrites = [];

/**
 * 假 localStorage：記錄 setItem 次數；可設定 getItem 拋例外、setItem 拋容量不足。
 */
function fakeStorage(initial) {
  const map = new Map(Object.entries(initial || {}));
  const s = {
    map,
    setCalls: [],
    getThrows: false,
    quota: false,          // true → 寫入主鍵時拋 QuotaExceededError
    otherError: false,     // true → 寫入主鍵時拋一般錯誤
    getItem(k) {
      if (s.getThrows) { throw new Error("SecurityError"); }
      return map.has(k) ? map.get(k) : null;
    },
    setItem(k, v) {
      s.setCalls.push(k);
      if (k === KEY && s.quota) {
        const e = new Error("quota"); e.name = "QuotaExceededError"; e.code = 22; throw e;
      }
      if (k === KEY && s.otherError) { throw new Error("boom"); }
      if (k === KEY) { allMainWrites.push(String(v)); }
      map.set(k, String(v));
    }
  };
  return s;
}

// ── 假 content ──

function builtinItem(rank, word, meaning, sources) {
  return { rank, word, meaning, sources: sources || ["NGSL"] };
}

/** 20 個內建字：前 12 個 NGSL（nB = 12）、後 8 個 TSL（nG = 20），釋義各不相同 */
function fakeContent(extra) {
  const raw = [];
  for (let i = 1; i <= 20; i++) {
    raw.push(builtinItem(i, "word" + i, "釋義" + i, i <= 12 ? ["NGSL"] : ["TSL"]));
  }
  raw.push(builtinItem(21, "latency", "延遲", ["TSL"]));
  const prepared = VOCAB.prepareBuiltin(raw, null);
  const part5 = [0, 1, 2].map((n) => ({
    id: "p5-00" + (n + 1), type: "grammar", sentence: "A _____ B.", options: ["a", "b", "c", "d"],
    correctIndex: n, explanation: { coreStrategy: "x", structure: "y" }, source: "ORIGINAL"
  }));
  const templates = [{
    id: "cs", nameZh: "資工", words: [
      { word: "Bootstrap", meaning: "自助法", academicContext: "統計" },
      { word: "word1", meaning: "重複內建" },
      { word: "Overfitting", meaning: "過度擬合", academicContext: "" }
    ]
  }];
  return Object.assign({
    builtin: prepared.sorted, builtinMap: prepared.map, nB: prepared.nB, nG: prepared.nG,
    part5, templates, decoderSentences: [{}, {}, {}], manifest: { dataVersion: "2026.10.30" }
  }, extra || {});
}

/** 可調整時間的時鐘 */
function clock(iso) {
  const c = { t: new Date(iso || "2026-10-30T10:00:00") };
  c.now = () => new Date(c.t.getTime());
  c.addDays = (n) => { c.t = new Date(c.t.getTime() + n * 86400000); };
  c.addMinutes = (n) => { c.t = new Date(c.t.getTime() + n * 60000); };
  return c;
}

/** 斷言一筆寫入主鍵的字串：StorageRecord 合法、schemaVersion = 目前版本（C.CURRENT_SCHEMA_VERSION，v0.15 起 3）、data 通過 { written: true } 驗證 */
function assertWrittenValid(text, label) {
  const rec = JSON.parse(text);
  assert.equal(rec.schemaVersion, C.CURRENT_SCHEMA_VERSION, label);
  assert.equal(P.validateStorageRecord(rec).ok, true, label);
  const v = P.validatePersistedData(rec.data, { written: true });
  assert.equal(v.ok, true, (label || "") + " " + JSON.stringify(v.errors));
}

// 本檔所有測試寫入主鍵的每一筆 data 都須通過 validatePersistedData(data, { written: true })
test.after(() => {
  assert.ok(allMainWrites.length > 0);
  allMainWrites.forEach((t, i) => assertWrittenValid(t, "第 " + (i + 1) + " 筆寫入"));
});

/** 固定序列亂數（可重現） */
function seq() {
  let i = 0;
  return () => { i = (i + 1) % 97; return i / 97; };
}

/** （v0.8，FE-30）一般模式的預設主鍵內容：目前版本（v0.15 起 3）的預設資料（已按過「開始學習」的使用者） */
function mainRecord() {
  return JSON.stringify(P.buildRecord(P.defaultData(), new Date("2026-10-29T00:00:00Z")));
}

/**
 * 建立 store。（v0.8，FE-30）未指定 storage／initial 時預寫一般模式的主鍵（entryMode = "main"），
 * 讓既有案例照常驗證寫入；要測首次模式請傳 firstRun: true（主鍵不存在）。
 */
function makeStore(opts) {
  const o = opts || {};
  const initial = o.initial !== undefined ? o.initial : (o.firstRun ? {} : { [KEY]: mainRecord() });
  const storage = o.storage || fakeStorage(initial);
  const ck = o.clock || clock();
  const store = S.createStore({ storage, content: o.content || fakeContent(), now: ck.now, rand: o.rand || seq() });
  if (o.init !== false) { store.init(); }
  return { store, storage, clock: ck, a: store.actions };
}

function storedData(storage) {
  return JSON.parse(storage.map.get(KEY)).data;
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

/**
 * （v0.10，FE-42）既有分數的資料：draftScore = appliedScore = score（FB-36），色級依 V-ST-02 計算。
 * 用來代表 v0.9 以前留下的分數（如 600、735），不得以預設值取代（GS-4）。
 */
function goalData(score) {
  const d = P.defaultData();
  const color = G.colorOf(score);
  d.goal = { draftScore: score, appliedScore: score, appliedColor: color, effectiveColor: G.effectiveColorOf(color) };
  return d;
}

/** （v0.10，FE-42）以既有分數建立一般模式 store */
function existingStore(score) {
  return makeStore({ initial: { [KEY]: recordOf(goalData(score)) } });
}

function backupText(data, extra) {
  return JSON.stringify(Object.assign({
    format: "english-master-track-backup", schemaVersion: 1, exportedAt: "2026-10-30T01:00:00.000Z",
    contentDataVersion: "2026.10.30", data
  }, extra || {}));
}

// ════════════════════════════ 啟動（§5.3） ════════════════════════════

test("首次啟動：預設值 725（C.SCORE_DEFAULT）／green／green、單字集 = 1～N_G、entryMode firstRun、首頁 customizer、setItem 0 次（AC-18-02、AC-25-01、FS-1、GS-7）", () => {
  const { store, storage } = makeStore({ firstRun: true });
  const st = store.getState();
  assert.equal(st.runtime.entryMode, "firstRun");
  assert.equal(C.SCORE_DEFAULT, 725);
  assert.deepEqual(st.data.goal, { draftScore: C.SCORE_DEFAULT, appliedScore: C.SCORE_DEFAULT, appliedColor: "green", effectiveColor: "green" });
  assert.equal(st.data.goal.appliedColor, "green");
  assert.equal(st.data.goal.effectiveColor, "green");
  assert.equal(st.runtime.storageStatus, "ok");
  assert.equal(st.runtime.studySet.length, 21);
  assert.equal(st.runtime.currentTab, "customizer");
  // （v0.23，FE-106）runtime.flashcard 5 欄，學完回饋啟動為 null（LF-3）
  assert.deepEqual(st.runtime.flashcard, { index: 0, isFlipped: false, mode: "card", quiz: null, islandFeedback: null });
  assert.equal(store.getStartup().status, "missing");
  assert.equal(storage.setCalls.length, 0);
});

test("getItem 拋例外 → unavailable、預設值 725，之後任何操作都不寫入（AC-18-03、GS-7）", () => {
  const storage = fakeStorage();
  storage.getThrows = true;
  const { store, a } = makeStore({ storage });
  assert.equal(store.getState().runtime.storageStatus, "unavailable");
  assert.equal(store.getStartup().status, "unavailable");
  assert.equal(store.getState().data.goal.appliedScore, C.SCORE_DEFAULT);
  assert.equal(store.getState().data.goal.draftScore, C.SCORE_DEFAULT);
  a.setDraftScore("300");
  a.applyGoal();
  assert.equal(a.addCustomWord({ word: "Monetization", meaning: "營利化" }).ok, true);
  a.flipCard();
  a.answerPart5(0);
  a.acknowledgeSttNotice();
  assert.equal(storage.setCalls.length, 0);
  // 功能在記憶體中仍可用
  assert.equal(store.getState().data.goal.appliedScore, 300);
  assert.equal(store.getState().data.customVocab.length, 1);
  assert.equal(store.getState().data.part5.totalAnswered, 1);
});

test("storage 未提供 → unavailable", () => {
  const store = S.createStore({ storage: null, content: fakeContent() });
  store.init();
  assert.equal(store.getState().runtime.storageStatus, "unavailable");
});

test("損壞資料 → 預設值 725、unreadable 鍵保存原字串、提示狀態 unreadable（AC-18-05、GS-7）", () => {
  const bad = "{not json";
  const { store, storage } = makeStore({ initial: { [KEY]: bad } });
  assert.equal(store.getStartup().status, "unreadable");
  assert.equal(storage.map.get(UNREADABLE), bad);
  assert.equal(store.getState().data.goal.appliedScore, C.SCORE_DEFAULT);
  assert.equal(store.getState().data.goal.draftScore, C.SCORE_DEFAULT);
  assert.equal(store.getState().runtime.storageStatus, "ok");
  // 主鍵已重設為合法預設值
  assert.equal(P.parseStored(storage.map.get(KEY)).kind, "ok");
  assert.equal(storedData(storage).goal.appliedScore, C.SCORE_DEFAULT);
});

test("違反 V-ST-03（customVocab wordKey 重複）啟動時視為無法讀取（IM-1 不適用於啟動）", () => {
  const d = P.defaultData();
  d.customVocab = [customItem("c_a", "Foo"), customItem("c_b", "foo")];
  const raw = recordOf(d);
  const { store, storage } = makeStore({ initial: { [KEY]: raw } });
  assert.equal(store.getStartup().status, "unreadable");
  assert.equal(storage.map.get(UNREADABLE), raw);
  assert.equal(store.getState().data.customVocab.length, 0);
});

test("schemaVersion 大於目前版本 → 無法讀取", () => {
  const raw = JSON.stringify({ schemaVersion: C.CURRENT_SCHEMA_VERSION + 1, savedAt: "2026-10-29T00:00:00.000Z", data: P.defaultData() });
  const { store, storage } = makeStore({ initial: { [KEY]: raw } });
  assert.equal(store.getStartup().status, "unreadable");
  assert.equal(storage.map.get(UNREADABLE), raw);
});

test("unreadable 鍵寫入失敗時不覆蓋主鍵（保留原值供救回）", () => {
  const storage = fakeStorage({ [KEY]: "garbage" });
  const orig = storage.setItem;
  storage.setItem = (k, v) => { if (k === UNREADABLE) { throw new Error("full"); } orig(k, v); };
  const { store } = makeStore({ storage });
  assert.equal(store.getStartup().status, "unreadable");
  assert.equal(storage.map.get(KEY), "garbage");
  assert.equal(store.getState().data.goal.appliedScore, C.SCORE_DEFAULT);
});

test("成功讀取：以 appliedScore 重算色級（V-ST-02）、part5 超出題庫重設（V-ST-05）（AC-01-04、AC-11-05）", () => {
  const d = P.defaultData();
  d.goal = { draftScore: 735, appliedScore: 300, appliedColor: "green", effectiveColor: "green" };
  d.part5.currentIndex = 99;
  d.part5.lockedSelection = 2;
  const { store, storage } = makeStore({ initial: { [KEY]: recordOf(d) } });
  const st = store.getState();
  assert.equal(store.getStartup().status, "ok");
  assert.equal(st.data.goal.draftScore, 735);
  assert.equal(st.data.goal.appliedColor, "brown");
  assert.equal(st.data.goal.effectiveColor, "brown");
  assert.equal(st.runtime.studySet.length, 12); // 棕 = nB
  assert.equal(st.data.part5.currentIndex, 0);
  assert.equal(st.data.part5.lockedSelection, null);
  assert.equal(storage.setCalls.length, 0);
});

test("Part 5 第 2 題（未作答）重新載入後仍在第 2 題（AC-11-05）", () => {
  const d = P.defaultData();
  d.part5.currentIndex = 1;
  const { store } = makeStore({ initial: { [KEY]: recordOf(d) } });
  assert.equal(store.getState().data.part5.currentIndex, 1);
});

test("尚未 init 就呼叫 action → 先讀取既有資料，不以預設值覆蓋", () => {
  const d = P.defaultData();
  d.goal = { draftScore: 300, appliedScore: 300, appliedColor: "brown", effectiveColor: "brown" };
  const { store, storage, a } = makeStore({ initial: { [KEY]: recordOf(d) }, init: false });
  a.acknowledgeSttNotice();
  assert.equal(store.getState().data.goal.appliedScore, 300);
  assert.equal(storedData(storage).goal.appliedScore, 300);
});

// ════════════════════════════ 一次寫入 ════════════════════════════

test("每個變更 PersistedData 的 action 後 setItem 只呼叫一次，寫入整筆 StorageRecord（savedAt 為 ISO）（AC-18-01）", async () => {
  const { store, storage, a } = makeStore();
  const steps = [
    ["setDraftScore", () => a.setDraftScore("733")], // → 735（與預設 725 不同才會寫入）
    ["clickColor", () => a.clickColor("brown")],
    ["applyGoal", () => a.applyGoal()],
    ["addCustomWord", () => a.addCustomWord({ word: "Monetization", meaning: "營利化" })],
    ["injectTemplate", () => a.injectTemplate("cs")],
    ["deleteCustomWord", () => a.deleteCustomWord(store.getState().data.customVocab[0].id)],
    ["flipCard", () => a.flipCard()],
    ["setFlashcardMode+answerVocabQuiz", () => { a.setFlashcardMode("quiz"); a.answerVocabQuiz(0); }],
    ["answerPart5", () => a.answerPart5(1)],
    ["nextPart5", () => a.nextPart5()],
    ["restartPart5", () => a.restartPart5()],
    ["acknowledgeSttNotice", () => a.acknowledgeSttNotice()]
  ];
  for (const [name, fn] of steps) {
    const before = storage.setCalls.length;
    fn();
    assert.equal(storage.setCalls.length - before, 1, name + " 應只寫入一次");
    assert.equal(storage.setCalls[storage.setCalls.length - 1], KEY, name);
    const rec = JSON.parse(storage.map.get(KEY));
    assert.equal(P.validateStorageRecord(rec).ok, true, name + " 寫入的 StorageRecord 應通過驗證");
    assert.match(rec.savedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    assert.deepEqual(rec.data, store.getState().data, name);
  }
  // recordSttScored：換一天才有打卡變更
  const before = storage.setCalls.length;
  a.recordSttScored(); // 同一天已打卡 → 無變更、不寫入
  assert.equal(storage.setCalls.length, before);
  // 匯入成功也只寫一次
  const r = await a.importBackup(backupText(P.defaultData()), () => true);
  assert.equal(r.ok, true);
  assert.equal(storage.setCalls.length - before, 1);
});

test("只改執行期狀態的 action 不寫入（v0.15：gotoCard 換卡依 FP-3 寫入，另見 store-track.test.js）", () => {
  const { storage, a } = makeStore();
  a.setTab("part5");
  a.setSttStatus("listening");
  a.setSttResult({ recognizedText: "x", targetText: "y", score: 50, light: "red" });
  a.setDecoderIndex(2);
  a.toggleModifierDim();
  a.setPhraseCategory("aim");
  a.setPhraseKeyword("gap");
  a.setFlashcardMode("quiz");
  a.setFlashcardMode("card");
  a.exportBackup();
  assert.equal(storage.setCalls.length, 0);
});

test("subscribe 收到 tags；unsubscribe 後不再通知", () => {
  const { store, a } = makeStore();
  const got = [];
  const un = store.subscribe((st, tags) => got.push(tags));
  a.setDraftScore(300);
  assert.deepEqual(got[0], ["goal"]);
  un();
  a.setDraftScore(500);
  assert.equal(got.length, 1);
});

// ════════════════════════════ 目標 ════════════════════════════

test("setDraftScore（v0.10 暫停 AC 的保留程式）：有效值修正為 5 的倍數並保存；無效回 error 訊息（AC-02-02、AC-02-08、AC-02-09）", () => {
  const { store, storage, a } = existingStore(600); // v0.9 既有分數
  assert.deepEqual(a.setDraftScore(" 723 "), { ok: true, score: 725 });
  assert.equal(storedData(storage).goal.draftScore, 725);
  assert.equal(store.getState().data.goal.appliedScore, 600); // 未套用
  const bad = a.setDraftScore("abc");
  assert.equal(bad.ok, false);
  assert.equal(bad.error, "請輸入 10～990 的分數");
  assert.equal(store.getState().data.goal.draftScore, 725);
});

test("draftScore 735 重新載入後仍為 735（AC-02-08）", () => {
  const { storage, a } = makeStore();
  a.setDraftScore("735");
  const again = makeStore({ storage });
  assert.equal(again.store.getState().data.goal.draftScore, 735);
});

const CARD_MAX = { orange: 215, brown: 465, green: 725, blue: 855, gold: 990 };

test("GS-2、AC-01-05：點卡片 = 該色上限；既有 600 點綠 → 725 (b)、300 點綠 → 725 (a)，皆寫入", () => {
  // (b) v0.9 既有分數 600（已在綠範圍內）
  const b = existingStore(600);
  assert.equal(b.store.getState().data.goal.draftScore, 600);
  let n = writesDuring(b.storage, () => { assert.deepEqual(b.a.clickColor("green"), { score: 725 }); });
  assert.ok(n >= 1, "一般模式點卡片使分數改變時照常寫入（AC-02-08）");
  assert.equal(storedData(b.storage).goal.draftScore, 725);
  assert.equal(b.store.getState().data.goal.appliedScore, 600, "未套用");
  b.a.applyGoal();
  assert.equal(storedData(b.storage).goal.appliedScore, 725);
  // (a) 既有分數 300（棕）
  const s = existingStore(300);
  n = writesDuring(s.storage, () => { assert.deepEqual(s.a.clickColor("green"), { score: 725 }); });
  assert.ok(n >= 1);
  s.a.applyGoal();
  assert.equal(s.store.getState().data.goal.appliedColor, "green");
  assert.equal(storedData(s.storage).goal.appliedScore, 725);
});

test("GS-2、AC-01-07、AC-26-04：點藍 855、點金 990；再點目前選中色級仍為上限；套用後生效色級為綠", () => {
  const { store, storage, a } = existingStore(600);
  assert.equal(a.clickColor("blue").score, 855);
  assert.equal(a.clickColor("blue").score, 855, "再點同色仍為上限");
  a.applyGoal();
  let g = store.getState().data.goal;
  assert.deepEqual(g, { draftScore: 855, appliedScore: 855, appliedColor: "blue", effectiveColor: "green" });
  assert.equal(store.getState().runtime.studySet.length, 21);
  assert.equal(storedData(storage).goal.appliedScore, 855);
  assert.equal(a.clickColor("gold").score, 990);
  a.applyGoal();
  g = store.getState().data.goal;
  assert.deepEqual(g, { draftScore: 990, appliedScore: 990, appliedColor: "gold", effectiveColor: "green" });
  assert.equal(storedData(storage).goal.appliedScore, 990);
  // 既有 735（藍範圍內、非上限）點藍 → 855
  const t = existingStore(735);
  assert.equal(t.a.clickColor("blue").score, 855);
  // 預設 725 再點綠：仍為 725，分數未變不寫入
  const d = makeStore();
  assert.equal(writesDuring(d.storage, () => { assert.equal(d.a.clickColor("green").score, 725); }), 0);
});

test("clickColor：未知色級 → draftScore 不變、不寫入；store 不再呼叫 scoreAfterColorClick", () => {
  const { store, storage, a } = existingStore(600);
  for (const bad of ["red", "", null, undefined]) {
    assert.equal(writesDuring(storage, () => { assert.deepEqual(a.clickColor(bad), { score: 600 }); }), 0, String(bad));
    assert.equal(store.getState().data.goal.draftScore, 600);
  }
  const src = fs.readFileSync(path.join(__dirname, "..", "state", "store.js"), "utf8");
  assert.equal(/scoreAfterColorClick/.test(src), false);
  assert.ok(/GOAL\.scoreForCard\(/.test(src));
});

test("V-ST-16、AC-02-04：依序點 5 色（各自套用）後 draftScore ∈ {215,465,725,855,990}，localStorage 依序 215、465、725、855、990", () => {
  const allowed = new Set(Object.values(CARD_MAX));
  for (const start of [10, 300, 600, 725, 735, 990]) {
    const { store, storage, a } = existingStore(start);
    const applied = [];
    for (const id of ["orange", "brown", "green", "blue", "gold", "green", "green", "orange"]) {
      a.clickColor(id);
      const ds = store.getState().data.goal.draftScore;
      assert.ok(allowed.has(ds), start + " 點 " + id + " → " + ds);
      assert.equal(ds, CARD_MAX[id]);
      assert.equal(G.colorOf(ds), id);
      if (applied.length < 5) {
        a.applyGoal();
        applied.push(storedData(storage).goal.appliedScore);
      }
    }
    assert.deepEqual(applied, [215, 465, 725, 855, 990], String(start));
  }
  // 首次模式同樣成立，且 setItem 0 次
  const f = makeStore({ firstRun: true });
  for (const id of Object.keys(CARD_MAX)) {
    f.a.clickColor(id);
    assert.ok(allowed.has(f.store.getState().data.goal.draftScore));
  }
  assert.equal(f.storage.setCalls.length, 0);
});

const AC_26_06 = [
  [10, "orange", 10], [215, "orange", 10], [220, "brown", 10], [465, "brown", 10], [470, "green", 15], [725, "green", 15],
  [730, "blue", 20], [855, "blue", 20], [860, "gold", 20], [990, "gold", 20], [600, "green", 15], [735, "blue", 20]
];

test("GS-3、GS-4、AC-26-06：12 個既有分數（draftScore = appliedScore，FB-36）→ 色級依 PRD、不點卡片套用後原值保留、schemaVersion 為目前版本、重建讀回仍為原值", () => {
  for (const [score, color, words] of AC_26_06) {
    const { store, storage, a } = existingStore(score);
    let g = store.getState().data.goal;
    assert.equal(g.draftScore, score, String(score));
    assert.equal(G.colorOf(g.draftScore), color, score + " 選中色級");
    assert.equal(G.dailyNewWords(g.draftScore), words, score + " 每日新字量");
    // 無學習紀錄 → 直接套用（不點卡片）
    assert.deepEqual(a.requestApplyGoal(), { status: "applied" }, String(score));
    g = store.getState().data.goal;
    const eff = G.effectiveColorOf(color);
    assert.deepEqual(g, { draftScore: score, appliedScore: score, appliedColor: color, effectiveColor: eff }, String(score));
    const rec = JSON.parse(storage.map.get(KEY));
    assert.equal(rec.schemaVersion, C.CURRENT_SCHEMA_VERSION, String(score));
    assert.equal(rec.data.goal.appliedScore, score, score + " localStorage 原值");
    assert.equal(rec.data.goal.draftScore, score, String(score));
    // 重新載入
    const again = makeStore({ storage });
    assert.deepEqual(again.store.getState().data.goal, g, score + " 重新載入");
    assert.equal(JSON.parse(storage.map.get(KEY)).data.goal.appliedScore, score);
  }
});

test("applyGoal：重建單字集，flashcard.index 為 0、正面；模式保持並重新出題（AC-01-02、AC-03-05）", () => {
  const { store, a } = makeStore();
  a.setDraftScore(300);
  a.applyGoal();
  assert.equal(store.getState().runtime.studySet.length, 12);
  a.gotoCard(5);
  a.flipCard();
  assert.equal(store.getState().runtime.flashcard.isFlipped, true);
  a.setDraftScore(600);
  a.applyGoal();
  let fc = store.getState().runtime.flashcard;
  assert.equal(store.getState().runtime.studySet.length, 21);
  assert.equal(fc.index, 0);
  assert.equal(fc.isFlipped, false);
  assert.equal(fc.mode, "card");
  // 測驗模式下套用：模式保持、為第 1 張重新出題
  a.gotoCard(4);
  assert.equal(a.setFlashcardMode("quiz").ok, true);
  a.setDraftScore(300);
  a.applyGoal();
  fc = store.getState().runtime.flashcard;
  assert.equal(fc.index, 0);
  assert.equal(fc.mode, "quiz");
  assert.equal(fc.quiz.wordKey, store.getState().runtime.studySet[0].wordKey);
  assert.equal(fc.quiz.selectedIndex, null);
});

test("（v0.15，FB-54、FP-4）applyGoal 生效色級未改變（綠 → 藍 → 金 → 綠、同色重套用）：單字卡索引、翻面、模式、題目、位置全部不變，不回第 1 張", () => {
  const { store, storage, a } = makeStore();
  assert.equal(store.getState().data.goal.effectiveColor, "green");
  a.gotoCard(5);
  a.flipCard();
  const before = store.getState();
  const pos = before.data.flashcardPosition;
  assert.deepEqual(pos, { wordKey: before.runtime.studySet[5].wordKey, ordinal: 6 });
  ["blue", "gold", "green"].forEach((color) => {
    a.clickColor(color);
    a.applyGoal();
    const st = store.getState();
    assert.equal(st.data.goal.effectiveColor, "green", color);
    assert.equal(st.runtime.studySet, before.runtime.studySet, color + "：單字集同一物件");
    assert.equal(st.runtime.flashcard, before.runtime.flashcard, color + "：flashcard 同一物件");
    assert.equal(st.runtime.speech, before.runtime.speech, color);
    assert.equal(st.data.flashcardPosition, pos, color);
    assert.deepEqual(storedData(storage).flashcardPosition, pos, color);
  });
  // 同色重套用（goal 未改變）→ 不寫入
  const calls = storage.setCalls.length;
  a.applyGoal();
  assert.equal(storage.setCalls.length, calls);
  assert.equal(store.getState().runtime.flashcard.index, 5);
  // 測驗模式下同色套用：題目保留
  a.flipCard();
  assert.equal(a.setFlashcardMode("quiz").ok, true);
  const quiz = store.getState().runtime.flashcard.quiz;
  a.clickColor("blue");
  a.applyGoal();
  assert.equal(store.getState().runtime.flashcard.quiz, quiz);
  // 生效色級改變 → 第 1 張、位置 null（與 goal 同一次寫入）
  a.clickColor("brown");
  assert.equal(writesDuring(storage, () => a.applyGoal()), 1);
  assert.equal(store.getState().runtime.flashcard.index, 0);
  assert.equal(store.getState().data.flashcardPosition, null);
  assert.equal(storedData(storage).flashcardPosition, null);
  assert.equal(storedData(storage).goal.effectiveColor, "brown");
});

test("已套用分數 300 重新載入後仍為棕（AC-01-04）", () => {
  const { storage, a } = makeStore();
  a.setDraftScore(300);
  a.applyGoal();
  const again = makeStore({ storage });
  assert.equal(again.store.getState().data.goal.effectiveColor, "brown");
  assert.equal(again.store.getState().data.goal.appliedScore, 300);
});

// ════════════════════════════ 自訂單字 ════════════════════════════

test("addCustomWord：驗證、重複、成功後加入單字集並保存（AC-04-03、AC-04-05、AC-04-06）", () => {
  const { store, storage, a } = makeStore();
  const r0 = a.addCustomWord({ word: "  ", meaning: "" });
  assert.equal(r0.ok, false);
  assert.deepEqual(r0.fieldErrors, { word: "required", meaning: "required" });
  assert.deepEqual(a.addCustomWord({ word: "Latency", meaning: "延遲" }), { ok: false, reason: "duplicate" });
  const r = a.addCustomWord({ word: "Monetization", meaning: "營利化；變現", pos: "n." });
  assert.equal(r.ok, true);
  assert.match(r.item.id, /^c_[A-Za-z0-9_-]{1,64}$/);
  assert.equal(a.addCustomWord({ word: "MONETIZATION", meaning: "x" }).reason, "duplicate");
  const st = store.getState();
  assert.equal(st.runtime.studySet.length, 22);
  assert.equal(st.runtime.studySet[21].kind, "custom");
  const again = makeStore({ storage });
  assert.deepEqual(again.store.getState().data.customVocab, st.data.customVocab);
});

test("新增自訂字遇 QuotaExceededError：記憶體回滾、原 storage 值不變、回 reason quota（AC-18-04）", () => {
  const { store, storage, a } = makeStore();
  a.addCustomWord({ word: "Alpha", meaning: "甲" });
  const savedBefore = storage.map.get(KEY);
  const stateBefore = store.getState();
  storage.quota = true;
  const r = a.addCustomWord({ word: "Beta", meaning: "乙" });
  assert.deepEqual(r, { ok: false, reason: "quota" });
  assert.equal(store.getState(), stateBefore);
  assert.equal(store.getState().data.customVocab.length, 1);
  assert.equal(storage.map.get(KEY), savedBefore);
  assert.equal(store.getWriteStatus(), "ok"); // 由 view 提示，不觸發 banner
});

test("其他寫入容量不足（v0.15 WR-2、§7.21.5）：保留記憶體、writeStatus quota；learningQuota 整個工作階段至多 1 次、不發 storage；下次成功恢復", () => {
  const { store, storage, a } = makeStore();
  const tagsSeen = [];
  store.subscribe((st, tags) => tagsSeen.push(tags));
  const saved = storage.map.get(KEY);
  storage.quota = true;
  a.setDraftScore(300);
  assert.equal(store.getState().data.goal.draftScore, 300);
  assert.equal(storage.map.get(KEY), saved);
  assert.equal(store.getWriteStatus(), "quota");
  assert.ok(tagsSeen[0].includes("learningQuota"));
  assert.equal(tagsSeen[0].includes("storage"), false);
  assert.equal(store.getState().runtime.learningQuotaNoticeShown, true);
  // 再次容量不足：不再提示
  a.setDraftScore(400);
  a.acknowledgeSttNotice();
  assert.equal(tagsSeen.flat().filter((t) => t === "learningQuota").length, 1);
  assert.equal(tagsSeen.flat().includes("storage"), false);
  storage.quota = false;
  a.setDraftScore(500);
  assert.equal(store.getWriteStatus(), "ok");
  assert.equal(storedData(storage).goal.draftScore, 500);
  // 由 quota 回到 ok → storage tag（banner 收起，沿用）
  assert.ok(tagsSeen[tagsSeen.length - 1].includes("storage"));
  // 恢復後再遇容量不足：同一工作階段仍不再提示
  storage.quota = true;
  a.setDraftScore(600);
  assert.equal(tagsSeen.flat().filter((t) => t === "learningQuota").length, 1);
});

test("其他寫入遇一般例外（v0.15 §7.21.5）：保留記憶體、writeStatus error、不提示（無 storage／learningQuota tag）", () => {
  const { store, storage, a } = makeStore();
  const log = [];
  store.subscribe((st, tags) => log.push(tags.slice()));
  storage.otherError = true;
  a.setDraftScore(300);
  assert.equal(store.getState().data.goal.draftScore, 300);
  assert.equal(store.getWriteStatus(), "error");
  assert.equal(log.flat().includes("storage"), false);
  assert.equal(log.flat().includes("learningQuota"), false);
  assert.equal(store.getState().runtime.learningQuotaNoticeShown, false);
});

test("deleteCustomWord：從清單與單字集移除、同步移除已掌握 wordKey（AC-04-07、V-ST-06）", () => {
  const d = P.defaultData();
  d.customVocab = [customItem("c_m", "monetization")];
  d.masteredWordKeys = ["monetization", "word1"];
  const { store, storage, a } = makeStore({ initial: { [KEY]: recordOf(d) } });
  assert.equal(store.getState().runtime.studySet.length, 22);
  assert.equal(a.deleteCustomWord("c_m").ok, true);
  const st = store.getState();
  assert.equal(st.data.customVocab.length, 0);
  assert.deepEqual(st.data.masteredWordKeys, ["word1"]);
  assert.equal(st.runtime.studySet.length, 21);
  assert.equal(a.deleteCustomWord("c_none").ok, false);
  const again = makeStore({ storage });
  assert.equal(again.store.getState().data.customVocab.length, 0);
});

test("DF-01：刪除與內建字同 wordKey 的自訂字時，不移除已掌握 wordKey（V-ST-06 例外）", () => {
  // 生效色級為橘時自訂字可與範圍外內建字共存；此處以內建 word15 模擬（內建資料更新後出現同名）
  const d = P.defaultData();
  d.goal = { draftScore: 300, appliedScore: 300, appliedColor: "brown", effectiveColor: "brown" };
  d.customVocab = [customItem("c_w", "Word15")];
  d.masteredWordKeys = ["word15"];
  const { store, a } = makeStore({ initial: { [KEY]: recordOf(d) } });
  // 棕 = 1～12，word15 不在範圍 → 放自訂卡
  assert.equal(store.getState().runtime.studySet.length, 13);
  a.deleteCustomWord("c_w");
  assert.deepEqual(store.getState().data.masteredWordKeys, ["word15"]);
  assert.equal(store.getState().runtime.studySet.length, 12);
});

test("刪除目前顯示的自訂字：顯示原本下一張；最後一張則前一張（AC-04-08；v0.15 經 placeCard，位置與 customVocab 同一次寫入，FP-5）", () => {
  const d = P.defaultData();
  d.customVocab = [
    customItem("c_a", "Alpha", "2026-10-29T08:00:00.000Z"),
    customItem("c_b", "Beta", "2026-10-29T09:00:00.000Z"),
    customItem("c_c", "Gamma", "2026-10-29T10:00:00.000Z")
  ];
  const { store, storage, a } = makeStore({ initial: { [KEY]: recordOf(d) } });
  // 21 內建 + 3 自訂；Beta 在索引 22
  a.gotoCard(22);
  a.flipCard();
  assert.equal(writesDuring(storage, () => a.deleteCustomWord("c_b")), 1);
  let rt = store.getState().runtime;
  assert.equal(rt.flashcard.index, 22);
  assert.equal(rt.studySet[22].wordKey, "gamma");
  assert.equal(rt.flashcard.isFlipped, false);
  assert.deepEqual(storedData(storage).flashcardPosition, { wordKey: "gamma", ordinal: 23 });
  assert.deepEqual(storedData(storage).customVocab.map((x) => x.id), ["c_a", "c_c"]);
  // 刪最後一張（Gamma，目前顯示）→ 前一張
  a.deleteCustomWord("c_c");
  rt = store.getState().runtime;
  assert.equal(rt.flashcard.index, 21);
  assert.equal(rt.studySet[21].wordKey, "alpha");
  assert.deepEqual(storedData(storage).flashcardPosition, { wordKey: "alpha", ordinal: 22 });
  // 刪除目前卡片之前的卡 → 仍顯示同一張、保留翻面
  a.addCustomWord({ word: "Delta", meaning: "丁" });
  a.gotoCard(22);
  a.flipCard();
  a.deleteCustomWord("c_a");
  rt = store.getState().runtime;
  assert.equal(rt.flashcard.index, 21);
  assert.equal(rt.studySet[21].wordKey, "delta");
  assert.equal(rt.flashcard.isFlipped, true);
  assert.deepEqual(storedData(storage).flashcardPosition, { wordKey: "delta", ordinal: 22 });
  // 重新載入 → 同一張（FP-2）
  const again = makeStore({ storage });
  assert.equal(again.store.getState().runtime.flashcard.index, 21);
  assert.equal(again.store.getState().runtime.studySet[21].wordKey, "delta");
});

test("刪到單字集為空 → index 0", () => {
  const empty = fakeContent({ builtin: [], builtinMap: new Map(), nB: 0, nG: 0 });
  const { store, a } = makeStore({ content: empty });
  const r = a.addCustomWord({ word: "Solo", meaning: "唯一" });
  a.deleteCustomWord(r.item.id);
  assert.equal(store.getState().runtime.studySet.length, 0);
  assert.equal(store.getState().runtime.flashcard.index, 0);
});

test("injectTemplate：只注入不存在的字，回傳筆數；再注入全部略過（AC-05-02、AC-05-04）", () => {
  const { store, storage, a } = makeStore();
  assert.deepEqual(a.injectTemplate("cs"), { injected: 2, skipped: 1 });
  const cv = store.getState().data.customVocab;
  assert.deepEqual(cv.map((x) => x.word), ["Bootstrap", "Overfitting"]);
  assert.equal(cv[0].origin, "template");
  assert.equal(cv[0].templateId, "cs");
  const calls = storage.setCalls.length;
  assert.deepEqual(a.injectTemplate("cs"), { injected: 0, skipped: 3 });
  assert.equal(storage.setCalls.length, calls);
  assert.deepEqual(a.injectTemplate("nope"), { injected: 0, skipped: 0 });
});

test("injectTemplate 遇容量不足：記憶體回滾、storage 不變、回 reason quota、不發 storage tag；解除後可完整注入（R3-2、AC-18-04）", () => {
  const { store, storage, a } = makeStore();
  a.addCustomWord({ word: "Alpha", meaning: "甲" });
  const before = store.getState();
  const saved = storage.map.get(KEY);
  const tagsSeen = [];
  store.subscribe((st, tags) => tagsSeen.push(tags));
  storage.quota = true;
  assert.deepEqual(a.injectTemplate("cs"), { injected: 0, skipped: 1, reason: "quota" });
  assert.equal(store.getState(), before);
  assert.deepEqual(store.getState().data.customVocab.map((x) => x.word), ["Alpha"]);
  assert.equal(storage.map.get(KEY), saved);
  assert.equal(store.getWriteStatus(), "ok");
  assert.equal(tagsSeen.length, 0); // 未通知（沒有 storage tag）
  storage.quota = false;
  assert.deepEqual(a.injectTemplate("cs"), { injected: 2, skipped: 1 });
  assert.deepEqual(storedData(storage).customVocab.map((x) => x.word), ["Alpha", "Bootstrap", "Overfitting"]);
  assert.ok(tagsSeen.every((t) => !t.includes("storage")));
});

test("injectTemplate 於 storage 停用時：保留記憶體、照常回報注入數（AC-18-03）", () => {
  const storage = fakeStorage();
  storage.getThrows = true;
  const { store, a } = makeStore({ storage });
  assert.deepEqual(a.injectTemplate("cs"), { injected: 2, skipped: 1 });
  assert.equal(store.getState().data.customVocab.length, 2);
  assert.equal(storage.setCalls.length, 0);
});

// ════════════════════════════ 抽認卡與四選一 ════════════════════════════

test("gotoCard：換卡回正面、清除 STT 結果；超出範圍或同一張不變（AC-06-04、AC-06-05）", () => {
  const { store, a } = makeStore();
  a.flipCard();
  a.setSttResult({ recognizedText: "a", targetText: "b", score: 10, light: "red" });
  const before = store.getState();
  a.gotoCard(0);
  a.gotoCard(-1);
  a.gotoCard(99);
  a.gotoCard(1.5);
  assert.equal(store.getState(), before);
  a.gotoCard(1);
  const rt = store.getState().runtime;
  assert.equal(rt.flashcard.index, 1);
  assert.equal(rt.flashcard.isFlipped, false);
  assert.equal(rt.speech.lastResult, null);
});

test("翻到背面打卡；同日不重複、隔日 +1、中斷重設為 1（AC-17-02）", () => {
  const { store, clock: ck, a } = makeStore();
  a.flipCard();
  assert.deepEqual(store.getState().data.streak, { days: 1, lastActiveDate: "2026-10-30" });
  a.flipCard(); // 翻回正面，不算
  a.flipCard();
  assert.equal(store.getState().data.streak.days, 1);
  ck.addDays(1);
  a.recordSttScored();
  assert.deepEqual(store.getState().data.streak, { days: 2, lastActiveDate: "2026-10-31" });
  ck.addDays(2);
  a.answerPart5(0);
  assert.deepEqual(store.getState().data.streak, { days: 1, lastActiveDate: "2026-11-02" });
});

test("setFlashcardMode：單字集不足 4 → insufficient、維持抽認卡（AC-09-06）", () => {
  const raw = [1, 2, 3].map((i) => builtinItem(i, "w" + i, "m" + i));
  const prepared = VOCAB.prepareBuiltin(raw, null);
  const { store, a } = makeStore({ content: fakeContent({ builtin: prepared.sorted, builtinMap: prepared.map, nB: 3, nG: 3 }) });
  assert.deepEqual(a.setFlashcardMode("quiz"), { ok: false, reason: "insufficient" });
  assert.equal(store.getState().runtime.flashcard.mode, "card");
  assert.equal(a.setFlashcardMode("bad").ok, false);
});

test("四選一：作答計數、鎖定後忽略；同一字答對兩次掌握數只 +1（AC-09-03、AC-09-04、AC-17-03）", () => {
  const { store, storage, a } = makeStore();
  assert.equal(a.answerVocabQuiz(0).ok, false); // 非測驗模式
  a.setFlashcardMode("quiz");
  const q = store.getState().runtime.flashcard.quiz;
  assert.equal(q.options.length, 4);
  const r = a.answerVocabQuiz(q.correctIndex);
  assert.deepEqual(r, { ok: true, correct: true });
  assert.deepEqual(store.getState().data.vocabQuiz, { answered: 1, correct: 1 });
  assert.deepEqual(store.getState().data.masteredWordKeys, [q.wordKey]);
  // 鎖定後重複作答不計
  const calls = storage.setCalls.length;
  assert.equal(a.answerVocabQuiz((q.correctIndex + 1) % 4).ok, false);
  assert.deepEqual(store.getState().data.vocabQuiz, { answered: 1, correct: 1 });
  assert.equal(storage.setCalls.length, calls);
  // 換卡再回來、重新出題，同一字再答對 → 掌握數不變
  a.gotoCard(1);
  a.gotoCard(0);
  const q2 = store.getState().runtime.flashcard.quiz;
  assert.equal(q2.wordKey, q.wordKey);
  assert.equal(q2.selectedIndex, null);
  a.answerVocabQuiz(q2.correctIndex);
  assert.deepEqual(store.getState().data.vocabQuiz, { answered: 2, correct: 2 });
  assert.equal(store.getState().data.masteredWordKeys.length, 1);
  // 答錯：answered + 1、correct 不變、不加入掌握
  a.gotoCard(1);
  const q3 = store.getState().runtime.flashcard.quiz;
  a.answerVocabQuiz((q3.correctIndex + 1) % 4);
  assert.deepEqual(store.getState().data.vocabQuiz, { answered: 3, correct: 2 });
  assert.equal(store.getState().data.masteredWordKeys.length, 1);
  // 重新載入後仍保存
  const again = makeStore({ storage });
  assert.deepEqual(again.store.getState().data.vocabQuiz, { answered: 3, correct: 2 });
  assert.deepEqual(again.store.getState().data.masteredWordKeys, [q.wordKey]);
});

// ════════════════════════════ Part 5 ════════════════════════════

test("Part 5：作答計數、鎖定後重複作答不變（AC-11-03、AC-11-06）", () => {
  const { store, storage, a } = makeStore();
  assert.deepEqual(a.answerPart5(0), { ok: true, correct: true }); // 題 1 正解 0
  let p = store.getState().data.part5;
  assert.equal(p.lockedSelection, 0);
  assert.deepEqual([p.roundAnswered, p.roundCorrect, p.totalAnswered, p.totalCorrect], [1, 1, 1, 1]);
  const calls = storage.setCalls.length;
  assert.equal(a.answerPart5(1).ok, false);
  assert.equal(a.answerPart5(0).ok, false);
  p = store.getState().data.part5;
  assert.deepEqual([p.roundAnswered, p.roundCorrect, p.totalAnswered, p.totalCorrect], [1, 1, 1, 1]);
  assert.equal(storage.setCalls.length, calls);
  // 鎖定狀態重新載入後仍鎖定（AC-11-06）
  const again = makeStore({ storage });
  assert.equal(again.store.getState().data.part5.lockedSelection, 0);
});

test("Part 5：未作答不可下一題；最後一題後進 summary；重新開始保留累計（AC-11-04、AC-11-07）", () => {
  const { store, a } = makeStore();
  a.nextPart5(); // 未作答 → 忽略
  assert.equal(store.getState().data.part5.currentIndex, 0);
  a.answerPart5(0); // 對
  a.nextPart5();
  let p = store.getState().data.part5;
  assert.equal(p.currentIndex, 1);
  assert.equal(p.lockedSelection, null);
  a.answerPart5(0); // 錯（正解 1）
  a.nextPart5();
  a.answerPart5(2); // 對
  a.nextPart5();
  p = store.getState().data.part5;
  assert.equal(p.phase, "summary");
  assert.deepEqual([p.roundAnswered, p.roundCorrect], [3, 2]);
  assert.equal(a.answerPart5(0).ok, false); // 結算中不作答
  a.restartPart5();
  p = store.getState().data.part5;
  assert.deepEqual(p, { currentIndex: 0, lockedSelection: null, phase: "question", roundAnswered: 0, roundCorrect: 0, totalAnswered: 3, totalCorrect: 2 });
});

test("Part 5 題庫為空時作答忽略、不白屏", () => {
  const { store, a } = makeStore({ content: fakeContent({ part5: [] }) });
  assert.equal(a.answerPart5(0).ok, false);
  assert.equal(store.getState().data.part5.totalAnswered, 0);
});

// ════════════════════════════ 語音與其他執行期狀態 ════════════════════════════

test("acknowledgeSttNotice 設為 true 並保存（AC-08-13、V-ST-08）；sttStatus 只接受 4 種列舉值（v0.20）", () => {
  const { store, storage, a } = makeStore();
  assert.equal(store.getState().data.sttNoticeAcknowledged, false);
  a.acknowledgeSttNotice();
  assert.equal(storedData(storage).sttNoticeAcknowledged, true);
  a.setSttStatus("notice");
  assert.equal(store.getState().runtime.speech.sttStatus, "notice");
  a.setSttStatus("weird");
  assert.equal(store.getState().runtime.speech.sttStatus, "notice");
  a.setSttStatus("preparing", "acquiringMic");
  assert.equal(store.getState().runtime.speech.sttStatus, "preparing");
  a.setSttStatus("listening");
  assert.equal(store.getState().runtime.speech.sttStatus, "listening");
  a.setSttStatus("idle");
  assert.equal(store.getState().runtime.speech.sttStatus, "idle");
});

// ── v0.20（FE-91）：準備中與子階段（architecture §4.13、§10.12） ──

test("runtime.speech 啟動時 preparingPhase 為 null，欄位集合固定 5 欄（AC-58-12）", () => {
  const { store } = makeStore();
  const sp = store.getState().runtime.speech;
  assert.equal(sp.sttStatus, "idle");
  assert.equal(sp.preparingPhase, null);
  assert.deepEqual(Object.keys(sp).sort(), ["lastResult", "preparingPhase", "sttStatus", "sttSupported", "ttsSupported"]);
  // 首次模式與重新 init 也一樣
  const f = makeStore({ firstRun: true });
  assert.equal(f.store.getState().runtime.speech.preparingPhase, null);
});

test("setSttStatus：preparing 的 3 種子階段生效；換卡等其他 action 保留 preparingPhase", () => {
  const { store, a } = makeStore();
  for (const ph of ["acquiringMic", "awaitingAudioStart", "fallbackWait"]) {
    a.setSttStatus("preparing", ph);
    const sp = store.getState().runtime.speech;
    assert.equal(sp.sttStatus, "preparing", ph);
    assert.equal(sp.preparingPhase, ph, ph);
  }
  a.setSttResult(null);
  assert.equal(store.getState().runtime.speech.preparingPhase, "fallbackWait");
  assert.equal(store.getState().runtime.speech.sttStatus, "preparing");
});

test("setSttStatus：preparing 缺少或錯誤子階段時整次忽略（狀態與子階段都不變、不通知）", () => {
  const { store, a } = makeStore();
  const got = [];
  store.subscribe((st, tags) => got.push(tags));
  const before = store.getState();
  for (const ph of [undefined, null, "", "listening", "AcquiringMic", 1, {}]) {
    a.setSttStatus("preparing", ph);
  }
  assert.equal(store.getState(), before);
  assert.equal(got.length, 0);
  // 已在準備中時，錯誤子階段也不改
  a.setSttStatus("preparing", "awaitingAudioStart");
  a.setSttStatus("preparing", "bogus");
  a.setSttStatus("preparing");
  assert.equal(store.getState().runtime.speech.preparingPhase, "awaitingAudioStart");
  assert.equal(got.length, 1);
});

test("setSttStatus：非 preparing 狀態的子階段一律為 null（忽略 phase）", () => {
  const { store, a } = makeStore();
  a.setSttStatus("preparing", "acquiringMic");
  a.setSttStatus("listening", "fallbackWait");
  assert.deepEqual([store.getState().runtime.speech.sttStatus, store.getState().runtime.speech.preparingPhase], ["listening", null]);
  a.setSttStatus("preparing", "fallbackWait");
  a.setSttStatus("idle", "acquiringMic");
  assert.deepEqual([store.getState().runtime.speech.sttStatus, store.getState().runtime.speech.preparingPhase], ["idle", null]);
  a.setSttStatus("notice", "awaitingAudioStart");
  assert.deepEqual([store.getState().runtime.speech.sttStatus, store.getState().runtime.speech.preparingPhase], ["notice", null]);
  // 不在列舉的狀態忽略
  a.setSttStatus("weird", "acquiringMic");
  assert.equal(store.getState().runtime.speech.sttStatus, "notice");
});

test("setSttStatus：狀態與子階段都沒變就不通知；有變才通知 [\"speech\"]；setItem 0 次", () => {
  const { store, storage, a } = makeStore();
  const got = [];
  store.subscribe((st, tags) => got.push(tags.slice()));
  const calls = storage.setCalls.length;
  a.setSttStatus("idle");
  assert.equal(got.length, 0, "idle → idle 不通知");
  a.setSttStatus("idle", "acquiringMic");
  assert.equal(got.length, 0, "idle（phase 忽略）不通知");
  a.setSttStatus("preparing", "acquiringMic");
  a.setSttStatus("preparing", "acquiringMic");
  assert.equal(got.length, 1, "同子階段不重複通知");
  a.setSttStatus("preparing", "awaitingAudioStart");
  assert.equal(got.length, 2, "子階段改變要通知");
  a.setSttStatus("listening");
  a.setSttStatus("listening");
  a.setSttStatus("idle");
  assert.equal(got.length, 4);
  for (const t of got) assert.deepEqual(t, ["speech"]);
  assert.equal(storage.setCalls.length, calls, "setItem 0 次");
});

test("寫入 localStorage 與匯出備份不含 sttStatus、preparingPhase（V-STT-10、AC-59-07）：schemaVersion 3、data 12 欄、頂層 5 欄", () => {
  const { store, storage, a } = makeStore();
  a.setSttStatus("preparing", "awaitingAudioStart");
  // 準備中觸發一次持久化寫入
  a.acknowledgeSttNotice();
  a.setDraftScore(300);
  const raw = storage.map.get(KEY);
  assert.ok(!/sttStatus|preparingPhase|preparing|awaitingAudioStart/.test(raw), raw);
  const rec = JSON.parse(raw);
  assert.equal(rec.schemaVersion, 3);
  assert.deepEqual(Object.keys(rec.data).sort(), P.DATA_KEYS.slice().sort());
  assert.equal(Object.keys(rec.data).length, 12);
  // 匯出備份
  const out = a.exportBackup();
  assert.ok(!/sttStatus|preparingPhase|awaitingAudioStart/.test(out.json));
  const file = JSON.parse(out.json);
  assert.equal(file.schemaVersion, 3);
  assert.equal(Object.keys(file).length, 5);
  assert.deepEqual(Object.keys(file.data).sort(), P.DATA_KEYS.slice().sort());
  // localStorage 鍵名只有主鍵
  assert.deepEqual([...storage.map.keys()], [KEY]);
  assert.equal(store.getState().runtime.speech.preparingPhase, "awaitingAudioStart");
});

test("解碼器淡化跨句保留；索引夾在範圍內；句型篩選與頁籤", () => {
  const { store, a } = makeStore();
  a.toggleModifierDim();
  a.setDecoderIndex(2);
  assert.deepEqual(store.getState().runtime.decoder, { sentenceIndex: 2, isModifierDimmed: true });
  a.setDecoderIndex(99);
  assert.equal(store.getState().runtime.decoder.sentenceIndex, 2);
  a.setPhraseCategory("findings");
  a.setPhraseCategory("bogus");
  a.setPhraseKeyword("Gap");
  assert.deepEqual(store.getState().runtime.phrasebank, { category: "findings", keyword: "Gap" });
  a.setTab("sources");
  a.setTab("nowhere");
  assert.equal(store.getState().runtime.currentTab, "sources");
});

// ════════════════════════════ 備份 ════════════════════════════

test("exportBackup：由記憶體產生，停用 storage 時仍可（AC-24-01、AC-24-02）", () => {
  const storage = fakeStorage();
  storage.getThrows = true;
  const { a } = makeStore({ storage });
  a.setDraftScore(300);
  const out = a.exportBackup();
  assert.equal(out.filename, "english-master-track-backup-20261030.json");
  const file = JSON.parse(out.json);
  assert.equal(file.contentDataVersion, "2026.10.30");
  assert.equal(file.data.goal.draftScore, 300);
});

test("匯入取消：資料與 storage 完全不變（AC-24-04）", async () => {
  const { store, storage, a } = makeStore();
  a.setDraftScore(300);
  const before = store.getState();
  const saved = storage.map.get(KEY);
  const calls = storage.setCalls.length;
  const d = P.defaultData();
  d.goal.draftScore = 800;
  let asked = 0;
  const r = await a.importBackup(backupText(d), () => { asked++; return Promise.resolve(false); });
  assert.equal(asked, 1);
  assert.deepEqual(r, { ok: false, error: "cancelled" });
  assert.equal(store.getState(), before);
  assert.equal(storage.map.get(KEY), saved);
  assert.equal(storage.setCalls.length, calls);
});

test("匯入格式錯誤／版本不符：不呼叫確認、資料不變（AC-24-05、AC-24-06）", async () => {
  const { store, a } = makeStore();
  const before = store.getState();
  let asked = 0;
  const confirm = () => { asked++; return true; };
  assert.deepEqual(await a.importBackup("", confirm), { ok: false, error: "format" });
  assert.deepEqual(await a.importBackup("{oops", confirm), { ok: false, error: "format" });
  assert.deepEqual(await a.importBackup(backupText(P.defaultData(), { schemaVersion: 4 }), confirm), { ok: false, error: "version", fileVersion: 4 });
  assert.deepEqual(await a.importBackup(backupText(P.defaultData(), { schemaVersion: "1" }), confirm), { ok: false, error: "version", fileVersion: null });
  assert.equal(asked, 0);
  assert.equal(store.getState(), before);
});

test("匯入寫入失敗（容量不足）：回 quota，記憶體與 storage 皆不變（AC-24-09）", async () => {
  const { store, storage, a } = makeStore();
  a.addCustomWord({ word: "Alpha", meaning: "甲" });
  const before = store.getState();
  const saved = storage.map.get(KEY);
  storage.quota = true;
  const d = P.defaultData();
  d.goal = { draftScore: 100, appliedScore: 100, appliedColor: "orange", effectiveColor: "orange" };
  const r = await a.importBackup(backupText(d), () => true);
  assert.deepEqual(r, { ok: false, error: "quota" });
  assert.equal(store.getState(), before);
  assert.equal(storage.map.get(KEY), saved);
});

test("匯入寫入失敗（非容量例外，如 SecurityError）：回 write_failed，記憶體與 storage 皆不變（IM-6、R6-4）", async () => {
  const { store, storage, a } = makeStore();
  a.addCustomWord({ word: "Alpha", meaning: "甲" });
  const before = store.getState();
  const saved = storage.map.get(KEY);
  const tagsSeen = [];
  store.subscribe((st, tags) => tagsSeen.push(tags));
  const orig = storage.setItem;
  storage.setItem = (k, v) => {
    if (k === KEY) { const e = new Error("denied"); e.name = "SecurityError"; e.code = 18; throw e; }
    return orig.call(storage, k, v);
  };
  const d = P.defaultData();
  d.vocabQuiz = { answered: 5, correct: 3 };
  const r = await a.importBackup(backupText(d), () => true);
  assert.deepEqual(r, { ok: false, error: "write_failed" });
  assert.equal(store.getState(), before);
  assert.equal(storage.map.get(KEY), saved);
  assert.equal(tagsSeen.length, 0);
  // 一般 Error（無 name／code）同樣歸為 write_failed
  storage.setItem = orig;
  storage.otherError = true;
  assert.deepEqual(await a.importBackup(backupText(d), () => true), { ok: false, error: "write_failed" });
  assert.equal(store.getState(), before);
  assert.equal(storage.map.get(KEY), saved);
});

test("匯入成功：套用、重建單字集、回傳略過筆數；重新建立 store 讀到相同資料（AC-24-03、AC-24-08）", async () => {
  const { store, storage, a } = makeStore();
  a.gotoCard(5);
  const d = P.defaultData();
  d.goal = { draftScore: 300, appliedScore: 300, appliedColor: "brown", effectiveColor: "brown" };
  d.customVocab = [customItem("c_a", "Latency"), customItem("c_b", "Bootstrap"), customItem("c_c", "bootstrap")];
  d.masteredWordKeys = ["word1", "bootstrap", "ghost"];
  d.vocabQuiz = { answered: 9, correct: 4 };
  d.part5 = { currentIndex: 2, lockedSelection: 1, phase: "question", roundAnswered: 2, roundCorrect: 1, totalAnswered: 7, totalCorrect: 5 };
  d.streak = { days: 4, lastActiveDate: "2026-10-29" };
  d.sttNoticeAcknowledged = true;
  const r = await a.importBackup(backupText(d), () => true);
  assert.deepEqual(r, { ok: true, skipped: 3 }); // Latency（內建）、bootstrap（檔內重複）、ghost
  const st = store.getState();
  assert.deepEqual(st.data.customVocab.map((x) => x.word), ["Bootstrap"]);
  assert.deepEqual(st.data.masteredWordKeys, ["word1", "bootstrap"]);
  assert.equal(st.runtime.studySet.length, 13); // 棕 12 + 自訂 1
  assert.equal(st.runtime.flashcard.index, 0);
  // 重新建立 store
  const again = makeStore({ storage });
  assert.equal(again.store.getStartup().status, "ok");
  assert.deepEqual(again.store.getState().data, st.data);
});

test("匯入時 storage 停用：只套用記憶體、不寫入、維持 unavailable", async () => {
  const storage = fakeStorage();
  storage.getThrows = true;
  const { store, a } = makeStore({ storage });
  const d = P.defaultData();
  d.vocabQuiz = { answered: 2, correct: 1 };
  const r = await a.importBackup(backupText(d), () => true);
  assert.equal(r.ok, true);
  assert.deepEqual(store.getState().data.vocabQuiz, { answered: 2, correct: 1 });
  assert.equal(store.getState().runtime.storageStatus, "unavailable");
  assert.equal(storage.setCalls.length, 0);
});

test("確認函式拋例外或 reject 視為取消", async () => {
  const { store, a } = makeStore();
  const before = store.getState();
  assert.equal((await a.importBackup(backupText(P.defaultData()), () => { throw new Error("x"); })).error, "cancelled");
  assert.equal((await a.importBackup(backupText(P.defaultData()), () => Promise.reject(new Error("y")))).error, "cancelled");
  assert.equal(store.getState(), before);
});

// ════════════════════════════ （v0.8）今日學習紀錄（FE-25；architecture §7.7、契約 §5.4） ════════════════════════════

const LEARN = require("../core/learning.js");

/** 今日已學數 X（LR-6） */
function xOf(store) {
  return LEARN.todayCount(store.getState().data.todayLearned, store.today());
}

/** 執行 fn，回傳期間 setItem 呼叫次數 */
function writesDuring(storage, fn) {
  const before = storage.setCalls.length;
  fn();
  return storage.setCalls.length - before;
}

/** 取得目前測驗題的錯誤選項索引 */
function wrongIndex(store) {
  return (store.getState().runtime.flashcard.quiz.correctIndex + 1) % 4;
}

test("store.today()：以注入的 now 取本地日期（AC-30-07）", () => {
  const { store, clock: ck } = makeStore({ clock: clock("2026-10-30T23:59:00") });
  assert.equal(store.today(), "2026-10-30");
  ck.addMinutes(2);
  assert.equal(store.today(), "2026-10-31");
});

test("初始 runtime.learningQuotaNoticeShown 為 false；data 含 todayLearned、learnedHistory 預設值", () => {
  const { store } = makeStore();
  const st = store.getState();
  assert.equal(st.runtime.learningQuotaNoticeShown, false);
  assert.deepEqual(st.data.todayLearned, { date: null, wordKeys: [] });
  assert.deepEqual(st.data.learnedHistory, {});
});

test("AC-30-03：X 依序為 1、1、1、2、3、4；每個學習事件 action 只寫入一次", () => {
  const { store, storage, a } = makeStore();
  const xs = [];
  const tagsSeen = [];
  store.subscribe((st, tags) => tagsSeen.push(tags));
  // 1. 單字卡 A（word1）翻到背面（同時打卡與記錄，合併一次寫入）
  assert.equal(writesDuring(storage, () => a.flipCard()), 1);
  assert.ok(tagsSeen[tagsSeen.length - 1].includes("learning"));
  assert.ok(tagsSeen[tagsSeen.length - 1].includes("streak"));
  xs.push(xOf(store));
  // 2. A 翻回正面（不記錄、不寫入）再翻到背面（已學過 → 無變更、不寫入）
  assert.equal(writesDuring(storage, () => a.flipCard()), 0);
  assert.equal(writesDuring(storage, () => a.flipCard()), 0);
  xs.push(xOf(store));
  // 3. 對 A 作答四選一（答錯）：統計 + 1，學習紀錄不變；一次寫入
  a.flipCard(); // 翻回正面
  assert.equal(a.setFlashcardMode("quiz").ok, true);
  assert.equal(store.getState().runtime.flashcard.quiz.wordKey, "word1");
  assert.equal(writesDuring(storage, () => a.answerVocabQuiz(wrongIndex(store))), 1);
  xs.push(xOf(store));
  // 4. 單字卡 B（word2）翻到背面
  a.setFlashcardMode("card");
  a.gotoCard(1);
  assert.equal(writesDuring(storage, () => a.flipCard()), 1);
  xs.push(xOf(store));
  // 5. 對 C 完成 STT 評分（wordKey 取 lastResult.targetText 正規化）
  a.setSttResult({ recognizedText: "word three", targetText: "  Word3 ", score: 80, light: "green" });
  assert.equal(writesDuring(storage, () => a.recordSttScored()), 1);
  xs.push(xOf(store));
  // 6. 對 E（word5）作答四選一（答對）：統計、已掌握、學習紀錄一次寫入
  a.gotoCard(4);
  a.setFlashcardMode("quiz");
  const q = store.getState().runtime.flashcard.quiz;
  assert.equal(q.wordKey, "word5");
  assert.equal(writesDuring(storage, () => a.answerVocabQuiz(q.correctIndex)), 1);
  xs.push(xOf(store));

  assert.deepEqual(xs, [1, 1, 1, 2, 3, 4]);
  const d = store.getState().data;
  assert.deepEqual(d.todayLearned, { date: "2026-10-30", wordKeys: ["word1", "word2", "word3", "word5"] });
  assert.deepEqual(d.learnedHistory, { "2026-10-30": 4 });
  assert.deepEqual(d.vocabQuiz, { answered: 2, correct: 1 });
  assert.deepEqual(d.masteredWordKeys, ["word5"]);
  assert.deepEqual(storedData(storage), d);
  assertWrittenValid(storage.map.get(KEY), "AC-30-03");
});

test("AC-30-04：只換卡未翻面、STT 未顯示分數、作答模擬測驗 → X 仍為 0（模擬測驗仍打卡）", () => {
  const { store, storage, a } = makeStore();
  // （v0.15，FP-3、FP-7）換卡每次寫入位置 1 次，但不改學習紀錄與打卡
  a.gotoCard(1);
  a.gotoCard(2);
  a.gotoCard(3);
  assert.equal(storage.setCalls.length, 3);
  assert.deepEqual(storedData(storage).flashcardPosition, { wordKey: store.getState().runtime.studySet[3].wordKey, ordinal: 4 });
  // STT 逾時／無結果／錯誤：speech-panel 只改執行期狀態、不呼叫 recordSttScored
  a.setSttStatus("listening");
  a.setSttResult(null);
  a.setSttStatus("idle");
  assert.equal(storage.setCalls.length, 3);
  assert.equal(xOf(store), 0);
  // 模擬測驗作答：打卡但不記錄
  assert.equal(writesDuring(storage, () => a.answerPart5(0)), 1);
  a.nextPart5();
  a.restartPart5();
  const d = store.getState().data;
  assert.equal(xOf(store), 0);
  assert.deepEqual(d.todayLearned, { date: null, wordKeys: [] });
  assert.deepEqual(d.learnedHistory, {});
  assert.deepEqual(d.streak, { days: 1, lastActiveDate: "2026-10-30" });
});

test("recordSttScored：lastResult 為 null 時退回目前卡；兩者都沒有則不記錄", () => {
  const { store, a } = makeStore();
  a.gotoCard(2);
  a.recordSttScored();
  assert.deepEqual(store.getState().data.todayLearned.wordKeys, ["word3"]);
  // targetText 正規化為空字串 → 退回目前卡
  a.gotoCard(6);
  a.setSttResult({ recognizedText: "", targetText: "   ", score: 0, light: "red" });
  a.recordSttScored();
  assert.deepEqual(store.getState().data.todayLearned.wordKeys, ["word3", "word7"]);
  // 單字集為空且無結果 → 不記錄（已打卡 → 完全不寫入）
  const empty = makeStore({ content: fakeContent({ builtin: [], builtinMap: new Map(), nB: 0, nG: 0 }) });
  empty.a.recordSttScored(); // 第一次：只打卡
  assert.equal(empty.storage.setCalls.length, 1);
  assert.deepEqual(empty.store.getState().data.todayLearned, { date: null, wordKeys: [] });
  assert.equal(writesDuring(empty.storage, () => empty.a.recordSttScored()), 0);
});

test("AC-30-06：刪除已學過的自訂單字 Y 後 X 不回扣；applyGoal、injectTemplate、gotoCard 不改學習紀錄", () => {
  const d0 = P.defaultData();
  d0.customVocab = [customItem("c_y", "Yonder")];
  const { store, a } = makeStore({ initial: { [KEY]: recordOf(d0) } });
  a.flipCard(); // word1
  a.gotoCard(1);
  a.flipCard(); // word2
  a.gotoCard(21); // 自訂字 Y
  assert.equal(store.getState().runtime.studySet[21].wordKey, "yonder");
  a.flipCard();
  assert.equal(xOf(store), 3);
  const before = store.getState().data;
  a.deleteCustomWord("c_y");
  a.setDraftScore(300);
  a.applyGoal();
  a.injectTemplate("cs");
  a.gotoCard(3);
  const after = store.getState().data;
  assert.equal(xOf(store), 3);
  assert.equal(after.todayLearned, before.todayLearned); // 同一物件：未被改動
  assert.equal(after.learnedHistory, before.learnedHistory);
  assert.deepEqual(after.todayLearned.wordKeys, ["word1", "word2", "yonder"]);
  assert.deepEqual(after.learnedHistory, { "2026-10-30": 3 });
});

test("AC-30-07：跨午夜 (b) 不學習 → X = 0、前一天 5 保留；(a) 再學一字 → X = 1", () => {
  const { store, storage, clock: ck, a } = makeStore({ clock: clock("2026-10-30T23:58:00") });
  for (let i = 0; i < 5; i++) {
    a.gotoCard(i);
    a.flipCard();
  }
  assert.equal(xOf(store), 5);
  ck.addMinutes(3); // 跨過午夜 → 2026-10-31
  // (b) 不做學習行為：以 store.today() 計算即反映新日期，不需寫入
  const calls = storage.setCalls.length;
  assert.equal(store.today(), "2026-10-31");
  assert.equal(xOf(store), 0);
  const series = LEARN.chartSeries(store.getState().data.learnedHistory, xOf(store), store.today());
  assert.deepEqual(series.slice(-2).map((p) => [p.date, p.count]), [["2026-10-30", 5], ["2026-10-31", 0]]);
  assert.equal(storage.setCalls.length, calls);
  // (a) 第 T+1 天學一個字（昨天學過的 word1 今天仍算新的一個）
  a.gotoCard(0);
  assert.equal(writesDuring(storage, () => a.flipCard()), 1);
  assert.equal(xOf(store), 1);
  const d = store.getState().data;
  assert.deepEqual(d.todayLearned, { date: "2026-10-31", wordKeys: ["word1"] });
  assert.deepEqual(d.learnedHistory, { "2026-10-30": 5, "2026-10-31": 1 });
  assert.deepEqual(d.streak, { days: 2, lastActiveDate: "2026-10-31" });
  const s2 = LEARN.chartSeries(d.learnedHistory, xOf(store), store.today());
  assert.deepEqual(s2.slice(-2).map((p) => p.count), [5, 1]);
  const v = P.validatePersistedData(storedData(storage), { written: true, today: "2026-10-31" });
  assert.equal(v.ok, true, JSON.stringify(v.errors));
});

test("AC-30-09：歷史只保留近 30 天（學習事件寫入時修剪）", () => {
  const d0 = P.defaultData();
  d0.learnedHistory = { "2026-09-30": 7, "2026-10-01": 3, "2026-10-29": 9 };
  const { store, storage, a } = makeStore({ initial: { [KEY]: recordOf(d0) } });
  // 啟動時已依 V-ST-10 正規化（今天 2026-10-30 → 最舊 2026-10-01）
  assert.deepEqual(store.getState().data.learnedHistory, { "2026-10-01": 3, "2026-10-29": 9 });
  a.flipCard();
  assert.deepEqual(storedData(storage).learnedHistory, { "2026-10-01": 3, "2026-10-29": 9, "2026-10-30": 1 });
});

test("AC-30-11：X = 6 重新建立 store 讀回相同 X 與歷史；已學過的字再學不重複計數、不寫入", () => {
  const d0 = P.defaultData();
  d0.learnedHistory = { "2026-10-28": 4, "2026-10-29": 8 };
  const { store, storage, a } = makeStore({ initial: { [KEY]: recordOf(d0) } });
  for (let i = 0; i < 6; i++) {
    a.gotoCard(i);
    a.flipCard();
  }
  assert.equal(xOf(store), 6);
  const data = store.getState().data;
  const again = makeStore({ storage });
  assert.equal(again.store.getStartup().status, "ok");
  assert.equal(xOf(again.store), 6);
  assert.deepEqual(again.store.getState().data.learnedHistory, { "2026-10-28": 4, "2026-10-29": 8, "2026-10-30": 6 });
  assert.deepEqual(again.store.getState().data, data);
  // 已學過的 word3 再翻一次：無變更 → 不寫入
  again.a.gotoCard(2);
  assert.equal(writesDuring(storage, () => again.a.flipCard()), 0);
  assert.equal(xOf(again.store), 6);
});

test("AC-30-12：v1 字串 → 自動遷移、一次寫回目前版本（v0.15 起 3）、既有資料不變、無 unreadable 鍵、無錯誤提示", () => {
  const v1 = {};
  const d0 = P.defaultData();
  d0.goal = { draftScore: 300, appliedScore: 300, appliedColor: "brown", effectiveColor: "brown" };
  d0.customVocab = [customItem("c_m", "Monetization")];
  d0.masteredWordKeys = ["word1", "monetization"];
  d0.vocabQuiz = { answered: 9, correct: 4 };
  d0.part5 = { currentIndex: 1, lockedSelection: null, phase: "question", roundAnswered: 1, roundCorrect: 1, totalAnswered: 7, totalCorrect: 5 };
  d0.streak = { days: 3, lastActiveDate: "2026-10-29" };
  d0.sttNoticeAcknowledged = true;
  for (const k of P.V1_DATA_KEYS) { v1[k] = d0[k]; }
  const raw = JSON.stringify({ schemaVersion: 1, savedAt: "2026-10-29T00:00:00.000Z", data: v1 });
  const { store, storage } = makeStore({ initial: { [KEY]: raw } });
  assert.deepEqual(store.getStartup(), { status: "ok", migrated: true });
  assert.deepEqual(storage.setCalls, [KEY]); // 一次寫回
  assert.equal(storage.map.has(UNREADABLE), false);
  const rec = JSON.parse(storage.map.get(KEY));
  assert.equal(rec.schemaVersion, C.CURRENT_SCHEMA_VERSION);
  assertWrittenValid(storage.map.get(KEY), "AC-30-12");
  const st = store.getState();
  for (const k of P.V1_DATA_KEYS) { assert.deepEqual(st.data[k], d0[k], k); }
  assert.deepEqual(rec.data, st.data);
  assert.equal(xOf(store), 0);
  assert.deepEqual(st.data.learnedHistory, {});
  assert.equal(store.getWriteStatus(), "ok");
  assert.equal(st.runtime.storageStatus, "ok");
});

test("AC-30-12：v1 遷移寫回失敗（容量不足）→ 不提示、照常使用，下次寫入再寫", () => {
  const v1 = {};
  const d0 = P.defaultData();
  d0.vocabQuiz = { answered: 2, correct: 2 };
  for (const k of P.V1_DATA_KEYS) { v1[k] = d0[k]; }
  const raw = JSON.stringify({ schemaVersion: 1, savedAt: "2026-10-29T00:00:00.000Z", data: v1 });
  const storage = fakeStorage({ [KEY]: raw });
  storage.quota = true;
  const tagsSeen = [];
  const { store, a } = makeStore({ storage, init: false });
  store.subscribe((st, tags) => tagsSeen.push(tags));
  store.init();
  assert.equal(store.getStartup().status, "ok");
  assert.equal(store.getWriteStatus(), "ok");
  assert.equal(storage.map.get(KEY), raw);
  assert.equal(storage.map.has(UNREADABLE), false);
  assert.deepEqual(store.getState().data.vocabQuiz, { answered: 2, correct: 2 });
  storage.quota = false;
  a.setDraftScore(500);
  assert.equal(JSON.parse(storage.map.get(KEY)).schemaVersion, C.CURRENT_SCHEMA_VERSION);
});

test("AC-30-13：學習紀錄欄位整欄型別錯誤只重設該欄，其他資料保留、不視為無法讀取、不寫入", () => {
  const d0 = P.defaultData();
  d0.vocabQuiz = { answered: 5, correct: 3 };
  d0.masteredWordKeys = ["word2"];
  d0.todayLearned = "garbage";
  d0.learnedHistory = [1, 2, 3];
  const { store, storage } = makeStore({ initial: { [KEY]: recordOf(d0) } });
  assert.equal(store.getStartup().status, "ok");
  assert.equal(storage.map.has(UNREADABLE), false);
  assert.equal(storage.setCalls.length, 0); // RD-2：不另寫回
  const st = store.getState().data;
  assert.deepEqual(st.todayLearned, { date: null, wordKeys: [] });
  assert.deepEqual(st.learnedHistory, {});
  assert.deepEqual(st.vocabQuiz, { answered: 5, correct: 3 });
  assert.deepEqual(st.masteredWordKeys, ["word2"]);
});

test("AC-30-13：無效歷史項目移除、重複單字只計 1 次、今日紀錄不是今天 → X = 0；下次學習寫回正規化結果", () => {
  const d0 = P.defaultData();
  d0.todayLearned = { date: "2026-10-30", wordKeys: ["Word1", "word1", " WORD2 ", "", 7] };
  d0.learnedHistory = {
    "2026-13-40": 3, "yesterday": 2, "2026-02-30": 1, "2026-10-25": -1, "2026-10-26": 1.5,
    "2026-10-27": "3", "2026-11-05": 9, "2026-10-28": 4, "2026-10-30": 99
  };
  const { store, storage, a } = makeStore({ initial: { [KEY]: recordOf(d0) } });
  assert.equal(store.getStartup().status, "ok");
  const st = store.getState().data;
  assert.deepEqual(st.todayLearned, { date: "2026-10-30", wordKeys: ["word1", "word2"] });
  assert.deepEqual(st.learnedHistory, { "2026-10-28": 4, "2026-10-30": 2 });
  assert.equal(xOf(store), 2);
  a.gotoCard(2);
  a.flipCard();
  assert.equal(xOf(store), 3);
  const v = P.validatePersistedData(storedData(storage), { written: true, today: "2026-10-30" });
  assert.equal(v.ok, true, JSON.stringify(v.errors));

  // 今日紀錄日期不是今天（過去或未來）→ X = 0，下一次學習以今天重新計數
  for (const date of ["2026-10-29", "2026-11-02", "2026-02-30"]) {
    const d1 = P.defaultData();
    d1.todayLearned = { date, wordKeys: ["word1", "word2"] };
    const s1 = makeStore({ initial: { [KEY]: recordOf(d1) } });
    assert.equal(s1.store.getStartup().status, "ok", date);
    assert.equal(xOf(s1.store), 0, date);
    s1.a.flipCard();
    assert.deepEqual(s1.store.getState().data.todayLearned, { date: "2026-10-30", wordKeys: ["word1"] }, date);
  }
});

test("AC-30-14：學習紀錄寫入容量不足 → X 照常增加、learningQuota tag 恰一次、storage 原值不變、無 storage tag", () => {
  const { store, storage, a } = makeStore();
  a.flipCard(); // word1：成功寫入
  const saved = storage.map.get(KEY);
  const tagsSeen = [];
  store.subscribe((st, tags) => tagsSeen.push(tags));
  storage.quota = true;
  a.gotoCard(1);
  assert.equal(writesDuring(storage, () => a.flipCard()), 1); // 嘗試一次 setItem
  assert.equal(xOf(store), 2);
  a.setFlashcardMode("quiz");
  a.gotoCard(2);
  a.answerVocabQuiz(0);
  assert.equal(xOf(store), 3);
  a.setFlashcardMode("card");
  a.setSttResult({ recognizedText: "x", targetText: "word9", score: 90, light: "green" });
  a.recordSttScored();
  assert.equal(xOf(store), 4);
  const all = tagsSeen.flat();
  assert.equal(all.filter((t) => t === "learningQuota").length, 1);
  assert.equal(all.includes("storage"), false);
  assert.equal(store.getState().runtime.learningQuotaNoticeShown, true);
  assert.equal(store.getWriteStatus(), "quota");
  assert.equal(storage.map.get(KEY), saved);
  // 解除後下一次寫入補寫全部資料
  storage.quota = false;
  a.gotoCard(5);
  a.flipCard();
  assert.equal(xOf(store), 5);
  assert.equal(store.getWriteStatus(), "ok");
  assert.deepEqual(storedData(storage).todayLearned.wordKeys, ["word1", "word2", "word3", "word9", "word6"]);
  // 再次容量不足：本工作階段不再提示
  storage.quota = true;
  a.gotoCard(6);
  a.flipCard();
  assert.equal(tagsSeen.flat().filter((t) => t === "learningQuota").length, 1);
  assert.equal(xOf(store), 6);
});

test("LR-7：學習紀錄寫入遇其他例外 → 不回滾、不提示（無 storage／learningQuota tag）", () => {
  const { store, storage, a } = makeStore();
  const tagsSeen = [];
  store.subscribe((st, tags) => tagsSeen.push(tags));
  const orig = storage.map.get(KEY);
  storage.otherError = true;
  a.flipCard();
  assert.equal(xOf(store), 1);
  const all = tagsSeen.flat();
  assert.equal(all.includes("storage"), false);
  assert.equal(all.includes("learningQuota"), false);
  assert.equal(store.getState().runtime.learningQuotaNoticeShown, false);
  assert.equal(storage.map.get(KEY), orig); // 寫入失敗，主鍵原值不變
});

test("LR-7：storage 停用時學習紀錄只更新記憶體", () => {
  const storage = fakeStorage();
  storage.getThrows = true;
  const { store, a } = makeStore({ storage });
  a.flipCard();
  a.gotoCard(1);
  a.flipCard();
  assert.equal(xOf(store), 2);
  assert.equal(storage.setCalls.length, 0);
  assert.equal(store.getState().runtime.learningQuotaNoticeShown, false);
});

test("匯入：ctx.today 為匯入當天，學習紀錄依 IM-8 正規化；v1 備份 X = 0（AC-24-10、AC-24-11）", async () => {
  const { store, a } = makeStore();
  a.flipCard();
  // v2 備份：今天的紀錄保留、無效歷史捨棄
  const d = P.defaultData();
  d.todayLearned = { date: "2026-10-30", wordKeys: ["word7", "Word7", "word8"] };
  d.learnedHistory = { "2026-10-29": 3, "2026-10-31": 5, "2026-10-28": -2 };
  let r = await a.importBackup(backupText(d, { schemaVersion: 2 }), () => true);
  assert.deepEqual(r, { ok: true, skipped: 0 });
  assert.deepEqual(store.getState().data.todayLearned, { date: "2026-10-30", wordKeys: ["word7", "word8"] });
  assert.deepEqual(store.getState().data.learnedHistory, { "2026-10-29": 3, "2026-10-30": 2 });
  // v1 備份：今日 0、歷史空
  const v1 = {};
  for (const k of P.V1_DATA_KEYS) { v1[k] = P.defaultData()[k]; }
  r = await a.importBackup(backupText(v1), () => true);
  assert.equal(r.ok, true);
  assert.equal(xOf(store), 0);
  assert.deepEqual(store.getState().data.learnedHistory, {});
});

test("exportBackup：以匯出當天正規化學習紀錄（AC-24-02）", () => {
  const { store, clock: ck, a } = makeStore({ clock: clock("2026-10-30T23:59:00") });
  a.flipCard();
  ck.addMinutes(2);
  const file = JSON.parse(a.exportBackup().json);
  assert.equal(file.schemaVersion, C.CURRENT_SCHEMA_VERSION);
  assert.deepEqual(file.data.todayLearned, { date: null, wordKeys: [] });
  assert.deepEqual(file.data.learnedHistory, { "2026-10-30": 1 });
  // 記憶體不受影響
  assert.equal(store.getState().data.todayLearned.date, "2026-10-30");
});

test("banner：收到 learningQuota tag 時 toast「儲存空間不足」", () => {
  const vm = require("node:vm");
  const src = fs.readFileSync(path.join(__dirname, "../ui/banner.js"), "utf8");
  const toasts = [];
  let listener = null;
  const sandbox = {
    document: { getElementById: () => null },
    EMT: {
      core: { dom: {} },
      ui: { toast: { show: (text) => toasts.push(text) } },
      store: {
        getState: () => ({ runtime: { storageStatus: "ok" } }),
        getStartup: () => ({ status: "ok", migrated: false }),
        getWriteStatus: () => "quota",
        subscribe: (fn) => { listener = fn; return () => {}; }
      }
    }
  };
  sandbox.self = sandbox;
  vm.runInNewContext(src, sandbox);
  sandbox.EMT.ui.banner.render();
  assert.equal(typeof listener, "function");
  listener({}, ["learning", "learningQuota"]);
  assert.deepEqual(toasts, ["儲存空間不足"]);
  listener({}, ["learning"]);
  assert.equal(toasts.length, 1);
});

// ════════════════════════════ 其他 ════════════════════════════

test("isQuotaError 判斷名稱與代碼", () => {
  assert.equal(S.isQuotaError({ name: "QuotaExceededError" }), true);
  assert.equal(S.isQuotaError({ name: "NS_ERROR_DOM_QUOTA_REACHED" }), true);
  assert.equal(S.isQuotaError({ code: 22 }), true);
  assert.equal(S.isQuotaError({ code: 1014 }), true);
  assert.equal(S.isQuotaError(new Error("x")), false);
});

test("content 缺漏（空物件）不白屏", () => {
  const store = S.createStore({ storage: fakeStorage(), content: {} });
  store.init();
  assert.equal(store.getState().runtime.studySet.length, 0);
  assert.equal(store.actions.setFlashcardMode("quiz").reason, "insufficient");
  assert.deepEqual(store.actions.injectTemplate("cs"), { injected: 0, skipped: 0 });
});

test("store.js 與 banner.js 不使用網路 API；store 以外不碰 localStorage", () => {
  const files = ["../state/store.js", "../ui/banner.js"].map((f) => fs.readFileSync(path.join(__dirname, f), "utf8"));
  for (const src of files) {
    assert.doesNotMatch(src, /\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon|navigator\.sendBeacon|importScripts/);
    assert.doesNotMatch(src, /innerHTML|outerHTML|insertAdjacentHTML|document\.write/);
  }
  assert.doesNotMatch(files[1], /localStorage/);
});

// ════════════════════════════ （v0.8）首次進入流程（FE-30；architecture §7.9、契約 §5.5 FS-1～FS-7） ════════════════════════════

/** 備份（schemaVersion 2，刻意以 v0.14 版本作為 MG-8 遷移輸入）：goal 300／棕 */
function brownBackupText() {
  const d = P.defaultData();
  d.goal = { draftScore: 300, appliedScore: 300, appliedColor: "brown", effectiveColor: "brown" };
  return backupText(d, { schemaVersion: 2 });
}

/** 收集所有通知的 tags */
function tagLog(store) {
  const log = [];
  store.subscribe((st, tags) => log.push(tags.slice()));
  return log;
}

test("FS-1：主鍵不存在 → firstRun（unreadable 鍵存在也不影響）；主鍵為任何字串 → main", () => {
  assert.equal(makeStore({ firstRun: true }).store.getState().runtime.entryMode, "firstRun");
  const withUnreadable = makeStore({ initial: { [UNREADABLE]: "舊的壞資料" } });
  assert.equal(withUnreadable.store.getState().runtime.entryMode, "firstRun");
  assert.equal(withUnreadable.store.getState().runtime.currentTab, "customizer");
  assert.equal(withUnreadable.storage.setCalls.length, 0);
  // 一般模式
  const main = makeStore();
  assert.equal(main.store.getState().runtime.entryMode, "main");
  assert.equal(main.store.getState().runtime.currentTab, "dashboard");
  // 損壞、版本不符 → main + unreadable 流程（AC-25-09）
  for (const raw of ["{not json", JSON.stringify({ schemaVersion: 9, savedAt: "2026-10-29T00:00:00.000Z", data: {} })]) {
    const { store, storage } = makeStore({ initial: { [KEY]: raw } });
    assert.equal(store.getState().runtime.entryMode, "main", raw);
    assert.equal(store.getState().runtime.currentTab, "dashboard", raw);
    assert.equal(store.getStartup().status, "unreadable", raw);
    assert.equal(storage.map.get(UNREADABLE), raw, raw);
  }
});

test("FS-1：主鍵為空字串 \"\" → main + unreadable 流程（原字串保存、主鍵重設、提示狀態 unreadable，AC-25-09）", () => {
  const { store, storage } = makeStore({ initial: { [KEY]: "" } });
  assert.equal(store.getState().runtime.entryMode, "main");
  assert.equal(store.getState().runtime.currentTab, "dashboard");
  assert.equal(store.getStartup().status, "unreadable");
  assert.equal(storage.map.get(UNREADABLE), "");
  assert.equal(P.parseStored(storage.map.get(KEY)).kind, "ok");
});

test("FS-2、V-ST-13：首次模式 setDraftScore、clickColor、setTab(\"sources\")、setTab(\"customizer\") 後 setItem 0 次（含 unreadable 鍵），只改記憶體（AC-25-04、AC-25-07）", () => {
  const { store, storage, a } = makeStore({ initial: { [UNREADABLE]: "舊的壞資料" } });
  const log = tagLog(store);
  assert.deepEqual(a.setDraftScore("735"), { ok: true, score: 735 });
  const clicked = a.clickColor("brown").score;
  a.setTab("sources");
  assert.equal(store.getState().runtime.currentTab, "sources");
  a.setTab("customizer");
  assert.equal(store.getState().runtime.currentTab, "customizer");
  assert.equal(storage.setCalls.length, 0);
  assert.equal(storage.map.has(KEY), false);
  assert.equal(storage.map.get(UNREADABLE), "舊的壞資料");
  // 記憶體有變、writeStatus 不變、無 storage tag
  assert.equal(store.getState().data.goal.draftScore, clicked);
  assert.equal(clicked, 465, "點棕 = 棕色上限（GS-2）");
  assert.equal(store.getState().runtime.entryMode, "firstRun");
  assert.equal(store.getWriteStatus(), "ok");
  assert.equal(log.flat().includes("storage"), false);
});

test("FS-2、LR-8：首次模式下其他會改 PersistedData 的 action 也不寫入（防禦）", () => {
  const { store, storage, a } = makeStore({ firstRun: true });
  const log = tagLog(store);
  a.applyGoal();
  assert.equal(a.addCustomWord({ word: "Monetization", meaning: "營利化" }).ok, true);
  assert.equal(a.injectTemplate("cs").injected, 2);
  a.deleteCustomWord(store.getState().data.customVocab[0].id);
  a.flipCard();
  a.setFlashcardMode("quiz");
  a.answerVocabQuiz(0);
  a.answerPart5(0);
  a.nextPart5();
  a.restartPart5();
  a.recordSttScored();
  a.acknowledgeSttNotice();
  assert.equal(storage.setCalls.length, 0);
  assert.equal(storage.map.has(KEY), false);
  assert.equal(store.getWriteStatus(), "ok");
  assert.equal(log.flat().includes("storage"), false);
  assert.equal(log.flat().includes("learningQuota"), false);
  assert.equal(store.getState().runtime.entryMode, "firstRun");
});

test("setTab：首次模式只接受 customizer、sources，其他值忽略（AC-25-01、AC-25-07）", () => {
  const { store, a } = makeStore({ firstRun: true });
  for (const t of ["dashboard", "flashcards", "part5", "decoder", "phrasebank", "nope"]) {
    a.setTab(t);
    assert.equal(store.getState().runtime.currentTab, "customizer", t);
  }
  a.setTab("sources");
  assert.equal(store.getState().runtime.currentTab, "sources");
});

test("AC-25-04：首次模式點過其他卡片後重新整理 → 仍為 firstRun、回預設 725／綠（GS-7）", () => {
  const { store, storage, a } = makeStore({ firstRun: true });
  a.clickColor("gold");
  a.clickColor("orange");
  assert.equal(store.getState().data.goal.draftScore, 215);
  const again = makeStore({ storage });
  assert.equal(again.store.getState().runtime.entryMode, "firstRun");
  assert.equal(again.store.getState().data.goal.draftScore, C.SCORE_DEFAULT);
  assert.equal(again.store.getState().data.goal.appliedScore, C.SCORE_DEFAULT);
  assert.equal(again.store.getState().data.goal.draftScore, 725);
  assert.equal(again.store.getState().data.goal.appliedColor, "green");
  assert.equal(storage.setCalls.length, 0);
});

test("startLearning：恰 1 次 setItem、schemaVersion 為目前版本、goal 套用目前分數、entryMode main、currentTab dashboard、tags 含 entry（AC-25-02、AC-25-03、FS-4）", () => {
  const { store, storage, a } = makeStore({ firstRun: true });
  a.setDraftScore(300);
  const log = tagLog(store);
  let r;
  assert.equal(writesDuring(storage, () => { r = a.startLearning(); }), 1);
  assert.deepEqual(r, { ok: true, write: "ok" });
  assert.deepEqual(storage.setCalls, [KEY]);
  const rec = JSON.parse(storage.map.get(KEY));
  assert.equal(rec.schemaVersion, C.CURRENT_SCHEMA_VERSION);
  assert.deepEqual(rec.data.goal, { draftScore: 300, appliedScore: 300, appliedColor: "brown", effectiveColor: "brown" });
  assert.deepEqual(rec.data.todayLearned, { date: null, wordKeys: [] });
  assert.deepEqual(rec.data.learnedHistory, {});
  const st = store.getState();
  assert.equal(st.runtime.entryMode, "main");
  assert.equal(st.runtime.currentTab, "dashboard");
  assert.equal(st.runtime.studySet.length, 12);
  assert.equal(st.runtime.flashcard.index, 0);
  assert.equal(log.length, 1);
  for (const t of ["entry", "goal", "studySet", "flashcard"]) { assert.ok(log[0].includes(t), t); }
  assert.equal(log[0].includes("storage"), false);
  // 進入後為一般模式：寫入恢復、setTab 不受限、再按 startLearning 無效
  assert.equal(writesDuring(storage, () => a.setDraftScore(500)), 1);
  a.setTab("part5");
  assert.equal(store.getState().runtime.currentTab, "part5");
  assert.deepEqual(a.startLearning(), { ok: false });
  // 重新開啟 → main、保留 300（套用值）
  const again = makeStore({ storage });
  assert.equal(again.store.getState().runtime.entryMode, "main");
  assert.equal(again.store.getState().data.goal.appliedScore, 300);
});

test("startLearning：未點卡片 → 以預設 725（C.SCORE_DEFAULT）／綠寫入第一筆（AC-18-02、GS-7）", () => {
  const { store, storage, a } = makeStore({ firstRun: true });
  assert.deepEqual(a.startLearning(), { ok: true, write: "ok" });
  assert.equal(storage.setCalls.length, 1);
  assert.deepEqual(storedData(storage).goal, { draftScore: C.SCORE_DEFAULT, appliedScore: C.SCORE_DEFAULT, appliedColor: "green", effectiveColor: "green" });
  assert.equal(storedData(storage).goal.appliedScore, 725);
  assert.equal(store.getState().runtime.entryMode, "main");
});

test("startLearning：一般模式呼叫回 { ok: false }、不寫入、不通知", () => {
  const { store, storage, a } = makeStore();
  const log = tagLog(store);
  const before = store.getState();
  assert.deepEqual(a.startLearning(), { ok: false });
  assert.equal(storage.setCalls.length, 0);
  assert.equal(log.length, 0);
  assert.equal(store.getState(), before);
});

test("startLearning 遇容量不足：仍進入 main、主鍵不存在、writeStatus quota 並發 learningQuota tag（v0.15 WR-2，不發 storage）；下次開啟仍 firstRun（FS-4、FB-31 (a)）", () => {
  const { store, storage, a } = makeStore({ firstRun: true });
  a.setDraftScore(300);
  storage.quota = true;
  const log = tagLog(store);
  assert.deepEqual(a.startLearning(), { ok: true, write: "quota" });
  assert.equal(storage.map.has(KEY), false);
  assert.equal(store.getState().runtime.entryMode, "main");
  assert.equal(store.getState().runtime.currentTab, "dashboard");
  assert.equal(store.getState().data.goal.appliedScore, 300);
  assert.equal(store.getWriteStatus(), "quota");
  assert.ok(log[0].includes("learningQuota"));
  assert.equal(log[0].includes("storage"), false);
  assert.ok(log[0].includes("entry"));
  // 主鍵仍不存在 → 重新開啟仍是首次畫面
  assert.equal(makeStore({ storage: fakeStorage(Object.fromEntries(storage.map)) }).store.getState().runtime.entryMode, "firstRun");
  // 本工作階段已是一般模式：下一次寫入再試，不再受首次守門
  storage.quota = false;
  a.setDraftScore(500);
  assert.equal(storage.map.has(KEY), true);
  assert.equal(store.getWriteStatus(), "ok");
});

test("startLearning 遇其他寫入例外：write error、仍進入 main、主鍵不存在", () => {
  const { store, storage, a } = makeStore({ firstRun: true });
  storage.otherError = true;
  assert.deepEqual(a.startLearning(), { ok: true, write: "error" });
  assert.equal(storage.map.has(KEY), false);
  assert.equal(store.getState().runtime.entryMode, "main");
  assert.equal(store.getWriteStatus(), "error");
});

test("unavailable：每次 init 皆 firstRun；startLearning 不寫入、直接進入（write disabled，AC-25-08、AC-18-03）", () => {
  const storage = fakeStorage();
  storage.getThrows = true;
  for (let i = 0; i < 2; i++) {
    const { store, a } = makeStore({ storage });
    assert.equal(store.getState().runtime.entryMode, "firstRun", "第 " + (i + 1) + " 次");
    assert.equal(store.getState().runtime.storageStatus, "unavailable");
    assert.equal(store.getState().runtime.currentTab, "customizer");
    a.setDraftScore(300);
    assert.deepEqual(a.startLearning(), { ok: true, write: "disabled" });
    assert.equal(store.getState().runtime.entryMode, "main");
    assert.equal(store.getState().data.goal.appliedScore, 300);
    a.flipCard();
    store.init(); // 同一 store 重新讀取也回到 firstRun
    assert.equal(store.getState().runtime.entryMode, "firstRun");
  }
  assert.equal(storage.setCalls.length, 0);
});

test("首次還原成功：entryMode main、currentTab dashboard、tag entry；goal 為備份值（300、棕），首次畫面的分數捨棄；恰 1 次 setItem（AC-25-10、FS-5）", async () => {
  const { store, storage, a } = makeStore({ firstRun: true });
  a.setDraftScore(900);
  a.setTab("sources");
  const log = tagLog(store);
  const r = await a.importBackup(brownBackupText(), () => true);
  assert.equal(r.ok, true);
  assert.deepEqual(storage.setCalls, [KEY]);
  const st = store.getState();
  assert.equal(st.runtime.entryMode, "main");
  assert.equal(st.runtime.currentTab, "dashboard");
  assert.deepEqual(st.data.goal, { draftScore: 300, appliedScore: 300, appliedColor: "brown", effectiveColor: "brown" });
  assert.equal(st.runtime.studySet.length, 12);
  assert.ok(log[log.length - 1].includes("entry"));
  assert.equal(JSON.parse(storage.map.get(KEY)).schemaVersion, C.CURRENT_SCHEMA_VERSION);
  assert.deepEqual(storedData(storage).goal, st.data.goal);
  const again = makeStore({ storage });
  assert.equal(again.store.getState().runtime.entryMode, "main");
  assert.equal(again.store.getState().data.goal.appliedColor, "brown");
});

test("首次還原 v1 備份成功：遷移後進入 main，學習紀錄為預設（AC-24-10）", async () => {
  const { store, storage, a } = makeStore({ firstRun: true });
  const d = P.defaultData();
  d.goal = { draftScore: 300, appliedScore: 300, appliedColor: "brown", effectiveColor: "brown" };
  delete d.todayLearned;
  delete d.learnedHistory;
  const r = await a.importBackup(backupText(d), () => true);
  assert.equal(r.ok, true);
  assert.equal(store.getState().runtime.entryMode, "main");
  assert.equal(store.getState().data.goal.appliedScore, 300);
  assert.deepEqual(storedData(storage).todayLearned, { date: null, wordKeys: [] });
  assert.equal(JSON.parse(storage.map.get(KEY)).schemaVersion, C.CURRENT_SCHEMA_VERSION);
});

test("首次還原失敗（cancelled、format、version、quota、write_failed）→ 維持 firstRun、記憶體不變、主鍵不存在（AC-25-11、FS-6、V-IMP-01）", async () => {
  const cases = [
    ["cancelled", (s) => s, brownBackupText(), () => false],
    ["format", (s) => s, "{not json", () => true],
    ["version", (s) => s, backupText(P.defaultData(), { schemaVersion: 9 }), () => true],
    ["quota", (s) => { s.quota = true; return s; }, brownBackupText(), () => true],
    ["write_failed", (s) => { s.otherError = true; return s; }, brownBackupText(), () => true]
  ];
  for (const [code, prep, text, confirm] of cases) {
    const storage = prep(fakeStorage({ [UNREADABLE]: "舊的壞資料" }));
    const { store, a } = makeStore({ storage });
    a.setDraftScore(735);
    const before = store.getState();
    const log = tagLog(store);
    const r = await a.importBackup(text, confirm);
    assert.equal(r.ok, false, code);
    assert.equal(r.error, code, code);
    assert.equal(store.getState(), before, code);
    assert.equal(store.getState().runtime.entryMode, "firstRun", code);
    assert.equal(store.getState().data.goal.draftScore, 735, code);
    assert.equal(storage.map.has(KEY), false, code);
    assert.equal(storage.map.get(UNREADABLE), "舊的壞資料", code);
    assert.equal(log.length, 0, code);
    assert.equal(store.getWriteStatus(), "ok", code);
    // 失敗後仍可按「開始學習」
    assert.equal(a.startLearning().ok, true, code);
    assert.equal(store.getState().runtime.entryMode, "main", code);
  }
});

test("首次還原於 storage 停用時：只套用記憶體並進入 main、不寫入（FS-5、契約 FB-31 (b)）", async () => {
  const storage = fakeStorage();
  storage.getThrows = true;
  const { store, a } = makeStore({ storage });
  const r = await a.importBackup(brownBackupText(), () => true);
  assert.equal(r.ok, true);
  assert.equal(store.getState().runtime.entryMode, "main");
  assert.equal(store.getState().runtime.currentTab, "dashboard");
  assert.equal(store.getState().data.goal.appliedScore, 300);
  assert.equal(storage.setCalls.length, 0);
});

test("一般模式匯入成功不發 entry tag、不改 currentTab", async () => {
  const { store, a } = makeStore();
  a.setTab("part5");
  const log = tagLog(store);
  const r = await a.importBackup(brownBackupText(), () => true);
  assert.equal(r.ok, true);
  assert.equal(log.flat().includes("entry"), false);
  assert.equal(store.getState().runtime.currentTab, "part5");
});

test("跨午夜後非學習 action 寫出的 todayLearned 已以今天正規化（LR-6，FE-25 回饋）；記憶體不受影響", () => {
  const ck = clock("2026-10-30T23:50:00");
  const { store, storage, a } = makeStore({ clock: ck });
  a.flipCard();
  assert.equal(xOf(store), 1);
  ck.addMinutes(20); // 跨到 10-31
  a.setDraftScore(300);
  const data = storedData(storage);
  assert.deepEqual(data.todayLearned, { date: null, wordKeys: [] });
  assert.deepEqual(data.learnedHistory, { "2026-10-30": 1 });
  const v = P.validatePersistedData(data, { written: true, today: store.today() });
  assert.equal(v.ok, true, JSON.stringify(v.errors));
  assert.equal(store.getState().data.todayLearned.date, "2026-10-30");
  assert.equal(xOf(store), 0);
});

// ════════════════════════════ （v0.9，FE-37）切換難易度初始化（§5.7 CI-1～CI-10） ════════════════════════════

const REINIT = require("../core/reinit.js");

/** 預設時鐘的今天（clock() = 2026-10-30T10:00 本地） */
const TODAY = "2026-10-30";

/**
 * 已掌握、四選一、模擬測驗、今日已學、歷史、打卡 (a)～(f) 全部成立的資料（600、綠），含 2 個自訂單字與 STT 已讀。
 * （v0.10，FE-42）600 為 PRD AC-32-01 的「v0.9 以前留下的既有分數」，明確預寫，不依賴預設值（T-42、GS-4）。
 */
function learnedData() {
  const d = goalData(600);
  d.customVocab = [customItem("c_1", "zeta", "2026-10-28T08:00:00.000Z"), customItem("c_2", "Bootstrap")];
  d.masteredWordKeys = ["word1", "zeta"];
  d.vocabQuiz = { answered: 5, correct: 3 };
  d.part5 = { currentIndex: 1, lockedSelection: 2, phase: "question", roundAnswered: 2, roundCorrect: 1, totalAnswered: 7, totalCorrect: 4 };
  d.streak = { days: 3, lastActiveDate: TODAY };
  d.todayLearned = { date: TODAY, wordKeys: ["word1", "word2"] };
  d.learnedHistory = { "2026-10-28": 4, "2026-10-29": 3, [TODAY]: 2 };
  d.sttNoticeAcknowledged = true;
  return d;
}

/** 以指定資料建立一般模式 store（extraInitial：另外預寫的鍵，如 unreadable） */
function storeWith(data, extraInitial) {
  return makeStore({ initial: Object.assign({ [KEY]: recordOf(data) }, extraInitial || {}) });
}

/** 只取 LEARNING_PROGRESS_FIELDS（v0.15 起 7 欄） */
function learningPart(data) {
  const out = {};
  C.LEARNING_PROGRESS_FIELDS.forEach((k) => { out[k] = data[k]; });
  return out;
}

test("CI-1、AC-32-01：既有 600（綠）點棕卡片 → 生效色級改變且有學習紀錄 → \"confirm\"；setItem 0 次、state 為同一物件、effectiveColor 仍綠、無通知", () => {
  const { store, storage, a } = storeWith(learnedData());
  assert.equal(a.clickColor("brown").score, 465);
  const before = store.getState();
  const log = tagLog(store);
  let r;
  assert.equal(writesDuring(storage, () => { r = a.requestApplyGoal(); }), 0);
  assert.deepEqual(r, { status: "confirm" });
  assert.equal(store.getState(), before);
  assert.equal(store.getState().data, before.data);
  assert.equal(store.getState().data.goal.effectiveColor, "green");
  assert.equal(store.getState().data.goal.appliedScore, 600);
  assert.equal(log.length, 0);
});

test("AC-32-05、AC-01-07：有學習紀錄、既有 600 時點綠 725 → 藍 855 → 金 990 → 綠 725 四步皆 \"applied\"，學習欄位不變", () => {
  const { store, storage, a } = storeWith(learnedData());
  assert.equal(store.getState().data.goal.appliedScore, 600);
  const fields = learningPart(store.getState().data);
  const steps = [["green", 725, "green"], ["blue", 855, "blue"], ["gold", 990, "gold"], ["green", 725, "green"]];
  for (const [card, score, color] of steps) {
    assert.equal(a.clickColor(card).score, score, card);
    assert.deepEqual(a.requestApplyGoal(), { status: "applied" }, String(score));
    assert.equal(storedData(storage).goal.appliedScore, score, String(score));
    const g = store.getState().data.goal;
    assert.equal(g.appliedScore, score, String(score));
    assert.equal(g.appliedColor, color, String(score));
    assert.equal(g.effectiveColor, "green", String(score));
    assert.deepEqual(learningPart(store.getState().data), fields, String(score));
  }
});

test("AC-32-06、AC-01-02：預設 725、(a)～(f) 皆不成立（只換卡）→ 點棕 465 直接 \"applied\"，生效色級棕、單字集重建", () => {
  const { store, a } = makeStore();
  assert.equal(store.getState().data.goal.appliedScore, C.SCORE_DEFAULT);
  a.gotoCard(2);
  assert.equal(a.clickColor("brown").score, 465);
  assert.deepEqual(a.requestApplyGoal(), { status: "applied" });
  const st = store.getState();
  assert.equal(st.data.goal.appliedScore, 465);
  assert.equal(st.data.goal.effectiveColor, "brown");
  assert.equal(st.runtime.studySet.length, 12);
  assert.equal(st.runtime.flashcard.index, 0);
});

test("AC-32-07：6 種狀態各只讓 (a)～(f) 其中一項成立 → 點棕卡片皆 \"confirm\"、setItem 0 次", () => {
  const states = {
    a: (d) => { d.masteredWordKeys = ["word3"]; },
    b: (d) => { d.vocabQuiz = { answered: 1, correct: 0 }; },
    c: (d) => { d.part5 = Object.assign(d.part5, { totalAnswered: 1, totalCorrect: 1 }); },
    // (d) 歷史只放 today 一筆（= X），依契約 FB-33 (e) 不成立
    d: (d) => { d.todayLearned = { date: TODAY, wordKeys: ["word1"] }; d.learnedHistory = { [TODAY]: 1 }; },
    e: (d) => { d.learnedHistory = { "2026-10-20": 2 }; },
    f: (d) => { d.streak = { days: 1, lastActiveDate: "2026-10-25" }; }
  };
  for (const flag of Object.keys(states)) {
    const d = P.defaultData();
    states[flag](d);
    const { store, storage, a } = storeWith(d);
    const fl = REINIT.recordFlags(store.getState().data, store.today());
    assert.deepEqual(Object.keys(fl).filter((k) => fl[k]), [flag], flag);
    a.clickColor("brown");
    let r;
    assert.equal(writesDuring(storage, () => { r = a.requestApplyGoal(); }), 0, flag);
    assert.deepEqual(r, { status: "confirm" }, flag);
  }
});

test("confirmApplyGoal 成功（AC-32-02、AC-32-03、AC-32-10、AC-03-05、CI-4、CI-5、CI-8、V-ST-14）：setItem 恰 1 次、LEARNING_PROGRESS_FIELDS（v0.15 起 7 欄）= 預設、保留欄位不變、鍵集合不變；重建 store 讀回相同", () => {
  const { store, storage, a } = storeWith(learnedData(), { [UNREADABLE]: "舊的壞資料" });
  a.gotoCard(3);
  a.setSttResult({ targetText: "word4", transcript: "word four", score: 80 });
  assert.equal(a.setFlashcardMode("quiz").ok, true);
  a.clickColor("brown");
  assert.equal(a.requestApplyGoal().status, "confirm");
  const before = store.getState();
  const keysBefore = Array.from(storage.map.keys()).sort();
  const log = tagLog(store);
  let r;
  assert.equal(writesDuring(storage, () => { r = a.confirmApplyGoal(); }), 1);
  assert.deepEqual(r, { ok: true, write: "ok" });
  assert.deepEqual(storage.setCalls.slice(-1), [KEY]);
  assert.deepEqual(Array.from(storage.map.keys()).sort(), keysBefore);
  assert.equal(storage.map.get(UNREADABLE), "舊的壞資料");

  const rec = JSON.parse(storage.map.get(KEY));
  assert.equal(rec.schemaVersion, C.CURRENT_SCHEMA_VERSION);
  const defaults = P.defaultData();
  for (const k of C.LEARNING_PROGRESS_FIELDS) {
    assert.deepEqual(rec.data[k], defaults[k], k);
    assert.deepEqual(store.getState().data[k], defaults[k], k);
  }
  // AC-32-02：確定後目標分數 465（棕上限，v0.10）
  const goal = { draftScore: 465, appliedScore: 465, appliedColor: "brown", effectiveColor: "brown" };
  assert.deepEqual(rec.data.goal, goal);
  assert.deepEqual(store.getState().data.goal, goal);
  assert.deepEqual(rec.data.customVocab, before.data.customVocab);
  assert.deepEqual(store.getState().data.customVocab, before.data.customVocab);
  assert.equal(rec.data.sttNoticeAcknowledged, true);
  assert.equal(store.getState().data.sttNoticeAcknowledged, true);
  assert.deepEqual(Object.keys(rec.data).sort(), Object.keys(before.data).sort());
  assert.deepEqual(Object.keys(store.getState().data).sort(), Object.keys(before.data).sort());
  // 不就地修改確定前的資料
  assert.equal(before.data.masteredWordKeys.length, 2);
  assert.equal(before.data.goal.appliedScore, 600);

  // 執行期（CI-8）：單字集 = 棕色內建 12 + 自訂 2；回第 1 張正面；模式保持並重新出題；lastResult 清除
  const rt = store.getState().runtime;
  assert.equal(rt.studySet.length, 12 + 2);
  assert.equal(rt.flashcard.index, 0);
  assert.equal(rt.flashcard.isFlipped, false);
  assert.equal(rt.flashcard.mode, "quiz");
  assert.ok(rt.flashcard.quiz);
  assert.equal(rt.flashcard.quiz.wordKey, rt.studySet[0].wordKey);
  assert.equal(rt.flashcard.quiz.selectedIndex, null);
  assert.equal(rt.speech.lastResult, null);
  assert.equal(store.getState().data.part5.currentIndex, 0);
  assert.equal(rt.entryMode, "main");
  assert.equal(log.length, 1);
  for (const t of ["goal", "studySet", "flashcard", "quiz", "speech", "stats", "streak", "part5", "learning"]) {
    assert.ok(log[0].includes(t), t);
  }

  // AC-32-02「重新載入」：以同一假 storage 重建 store 讀回相同
  const again = makeStore({ storage });
  assert.equal(again.store.getState().runtime.entryMode, "main");
  assert.deepEqual(again.store.getState().data, store.getState().data);
  assert.equal(again.store.getState().runtime.studySet.length, 14);
});

test("AC-32-09、AC-17-02：確定後同一天再把 A 翻到背面 → X = 1、歷史今天 = 1、連續打卡 = 1", () => {
  const { store, a } = storeWith(learnedData());
  a.clickColor("brown");
  assert.equal(a.requestApplyGoal().status, "confirm");
  assert.equal(a.confirmApplyGoal().ok, true);
  assert.equal(xOf(store), 0);
  assert.equal(store.getState().data.streak.days, 0);
  const st = store.getState();
  assert.equal(st.runtime.studySet[st.runtime.flashcard.index].wordKey, "word1");
  a.flipCard();
  assert.equal(xOf(store), 1);
  assert.deepEqual(store.getState().data.learnedHistory, { [TODAY]: 1 });
  assert.deepEqual(store.getState().data.streak, { days: 1, lastActiveDate: TODAY });
});

test("CI-7、AC-32-11 (b)：寫入遇容量不足與一般例外 → 回 { ok: false, reason }；記憶體學習欄位與 appliedScore 不變、draftScore 還原、storage 原值不變、無 storage／learningQuota tag", () => {
  for (const [reason, prep] of [["quota", (s) => { s.quota = true; }], ["error", (s) => { s.otherError = true; }]]) {
    const { store, storage, a } = storeWith(learnedData());
    a.gotoCard(2);
    a.clickColor("brown");
    assert.equal(a.requestApplyGoal().status, "confirm", reason);
    const before = store.getState();
    const stored = storage.map.get(KEY);
    prep(storage);
    const log = tagLog(store);
    let r;
    assert.doesNotThrow(() => { r = a.confirmApplyGoal(); }, reason);
    assert.deepEqual(r, { ok: false, reason }, reason);
    const st = store.getState();
    for (const k of C.LEARNING_PROGRESS_FIELDS) { assert.equal(st.data[k], before.data[k], reason + " " + k); }
    assert.equal(st.data.customVocab, before.data.customVocab, reason);
    assert.equal(st.data.goal.appliedScore, 600, reason);
    assert.equal(st.data.goal.effectiveColor, "green", reason);
    assert.equal(st.data.goal.draftScore, 600, reason + "：還原為既有 600，不轉 725（GS-8）");
    assert.equal(storage.map.get(KEY), stored, reason);
    assert.equal(st.runtime.studySet, before.runtime.studySet, reason);
    assert.equal(st.runtime.flashcard.index, 2, reason);
    assert.equal(st.runtime.learningQuotaNoticeShown, false, reason);
    assert.equal(store.getWriteStatus(), "ok", reason);
    const all = log.flat();
    assert.equal(all.includes("storage"), false, reason);
    assert.equal(all.includes("learningQuota"), false, reason);
    assert.deepEqual(log, [["goal"]], reason);
  }
});

test("CI-6、AC-32-11 (a)：storage 停用時 confirmApplyGoal 不寫入（setItem 0 次）、記憶體已初始化、write \"disabled\"", () => {
  const storage = fakeStorage();
  storage.getThrows = true;
  const { store, a } = makeStore({ storage });
  assert.equal(a.startLearning().write, "disabled");
  a.flipCard();
  assert.equal(xOf(store), 1);
  a.clickColor("brown");
  assert.equal(a.requestApplyGoal().status, "confirm");
  let r;
  assert.equal(writesDuring(storage, () => { r = a.confirmApplyGoal(); }), 0);
  assert.deepEqual(r, { ok: true, write: "disabled" });
  const st = store.getState();
  assert.equal(st.runtime.storageStatus, "unavailable");
  assert.equal(st.data.goal.effectiveColor, "brown");
  assert.deepEqual(learningPart(st.data), learningPart(P.defaultData()));
  assert.equal(xOf(store), 0);
  assert.equal(st.runtime.studySet.length, 12);
  assert.equal(store.getWriteStatus(), "disabled");
  assert.equal(storage.setCalls.length, 0);
});

test("CI-9、AC-32-04、GS-8：既有 600 點棕 → 取消 → setItem 0 次、draftScore 還原 600（不轉 725）、tag goal、單字卡位置與其他欄位不變", () => {
  const { store, storage, a } = storeWith(learnedData());
  a.gotoCard(4);
  assert.equal(a.clickColor("brown").score, 465);
  assert.equal(a.requestApplyGoal().status, "confirm");
  const before = store.getState();
  const stored = storage.map.get(KEY);
  const log = tagLog(store);
  assert.equal(writesDuring(storage, () => a.cancelApplyGoal()), 0);
  const st = store.getState();
  assert.equal(st.data.goal.draftScore, 600);
  assert.equal(G.colorOf(st.data.goal.draftScore), "green", "選中卡片回到綠");
  assert.deepEqual(st.data.goal, Object.assign({}, before.data.goal, { draftScore: 600 }));
  for (const k of C.LEARNING_PROGRESS_FIELDS) { assert.equal(st.data[k], before.data[k], k); }
  assert.equal(st.runtime, before.runtime);
  assert.equal(st.runtime.flashcard.index, 4);
  assert.equal(storage.map.get(KEY), stored);
  assert.deepEqual(log, [["goal"]]);
  // 已相同時再取消：不通知、不寫入
  assert.equal(writesDuring(storage, () => a.cancelApplyGoal()), 0);
  assert.equal(log.length, 1);
});

test("CI-1：首次模式 requestApplyGoal → \"ignored\"、confirmApplyGoal → firstRun，皆不寫入、不改狀態", () => {
  const { store, storage, a } = makeStore({ firstRun: true });
  a.setDraftScore(300);
  const before = store.getState();
  assert.deepEqual(a.requestApplyGoal(), { status: "ignored" });
  assert.deepEqual(a.confirmApplyGoal(), { ok: false, reason: "firstRun" });
  assert.equal(store.getState(), before);
  assert.equal(storage.setCalls.length, 0);
});

test("AC-32-08 (b)：主控台匯入生效色級不同的備份 → 以備份內容覆蓋、不另外清除", async () => {
  const { store, a } = storeWith(learnedData());
  const d = P.defaultData();
  d.goal = { draftScore: 300, appliedScore: 300, appliedColor: "brown", effectiveColor: "brown" };
  d.masteredWordKeys = ["word2"];
  d.vocabQuiz = { answered: 2, correct: 1 };
  d.streak = { days: 2, lastActiveDate: "2026-10-29" };
  d.learnedHistory = { "2026-10-29": 5 };
  const r = await a.importBackup(backupText(d, { schemaVersion: 2 }), () => true);
  assert.equal(r.ok, true);
  const st = store.getState().data;
  assert.equal(st.goal.effectiveColor, "brown");
  assert.deepEqual(st.masteredWordKeys, ["word2"]);
  assert.deepEqual(st.vocabQuiz, { answered: 2, correct: 1 });
  assert.deepEqual(st.streak, { days: 2, lastActiveDate: "2026-10-29" });
  assert.deepEqual(st.learnedHistory, { "2026-10-29": 5 });
});

test("AC-32-08 (a)：首次畫面 startLearning 選棕不經初始化判斷，照常進入", () => {
  const { store, a } = makeStore({ firstRun: true });
  a.setDraftScore(300);
  assert.equal(a.startLearning().ok, true);
  assert.equal(store.getState().runtime.entryMode, "main");
  assert.equal(store.getState().data.goal.effectiveColor, "brown");
});

test("confirmApplyGoal 成功時 noteWrite 照常：先前 writeStatus quota → 恢復 ok 並發 storage tag", () => {
  const { store, storage, a } = storeWith(learnedData());
  storage.quota = true;
  a.setDraftScore(300); // 一般寫入失敗 → writeStatus quota
  assert.equal(store.getWriteStatus(), "quota");
  storage.quota = false;
  assert.equal(a.requestApplyGoal().status, "confirm");
  const log = tagLog(store);
  assert.deepEqual(a.confirmApplyGoal(), { ok: true, write: "ok" });
  assert.equal(store.getWriteStatus(), "ok");
  assert.ok(log[0].includes("storage"));
});

// ════════════════════════════ （v0.9，FE-37）隱藏頁 setTab 守門（§5.8 HT-1） ════════════════════════════

test("HT-1、AC-20-04：一般模式 setTab(\"decoder\")、setTab(\"phrasebank\") → currentTab 不變、不通知", () => {
  const { store, a } = makeStore();
  assert.equal(store.getState().runtime.currentTab, "dashboard");
  const log = tagLog(store);
  a.setTab("decoder");
  a.setTab("phrasebank");
  assert.equal(store.getState().runtime.currentTab, "dashboard");
  a.setTab("flashcards");
  a.setTab("decoder");
  a.setTab("phrasebank");
  assert.equal(store.getState().runtime.currentTab, "flashcards");
  assert.equal(log.length, 1);
  for (const t of C.HIDDEN_TAB_IDS) {
    a.setTab(t);
    assert.notEqual(store.getState().runtime.currentTab, t);
  }
});

// ════════════════════════════ （v0.11，FE-49）runtime.pwa 與 setPwa（契約 RuntimeState.pwa、PV-1、PV-7、V-PWA-11） ════════════════════════════

const PWA = require("../core/pwa.js");

/** 一組改變全部 7 欄的合法 patch */
function fullPwaPatch() {
  return {
    eligible: true, standalone: true, installPromptAvailable: true, installSuppressed: true,
    updateAvailable: true, reloadRequested: true, lastUpdateCheckAt: 1234.5
  };
}

test("FE-49：初始 runtime.pwa 深度等於 initialPwaState()（一般與首次模式）", () => {
  assert.deepEqual(makeStore().store.getState().runtime.pwa, PWA.initialPwaState());
  assert.deepEqual(makeStore({ firstRun: true }).store.getState().runtime.pwa, PWA.initialPwaState());
  assert.deepEqual(Object.keys(makeStore().store.getState().runtime.pwa), [...PWA.PWA_STATE_KEYS]);
});

for (const mode of ["main", "firstRun"]) {
  test(`FE-49：setPwa 合法 patch → 通知 ["pwa"]、setItem 0 次、以新物件取代（${mode}，PV-1、AC-37-06）`, () => {
    const { store, storage, a } = makeStore({ firstRun: mode === "firstRun" });
    const before = store.getState().runtime.pwa;
    const log = tagLog(store);
    let r;
    assert.equal(writesDuring(storage, () => { r = a.setPwa({ eligible: true, standalone: false }); }), 0);
    assert.deepEqual(r, { changed: true });
    assert.deepEqual(log, [["pwa"]]);
    const after = store.getState().runtime.pwa;
    assert.notEqual(after, before);
    assert.equal(before.eligible, false, "舊物件不被就地修改");
    assert.equal(after.eligible, true);
    assert.equal(store.getState().runtime.entryMode, mode);
    assert.equal(writesDuring(storage, () => { a.setPwa(fullPwaPatch()); }), 0);
    assert.deepEqual(store.getState().runtime.pwa, fullPwaPatch());
    assert.equal(log.length, 2);
  });
}

test("FE-49：setPwa 相同值 → 不通知、changed false；lastUpdateCheckAt 可回到 null", () => {
  const { store, a } = makeStore();
  const log = tagLog(store);
  assert.deepEqual(a.setPwa({ eligible: false, lastUpdateCheckAt: null }), { changed: false });
  assert.deepEqual(a.setPwa({}), { changed: false });
  assert.deepEqual(a.setPwa(null), { changed: false });
  assert.deepEqual(a.setPwa("eligible"), { changed: false });
  assert.equal(log.length, 0);
  a.setPwa({ lastUpdateCheckAt: 5 });
  assert.deepEqual(a.setPwa({ lastUpdateCheckAt: 5 }), { changed: false });
  assert.deepEqual(a.setPwa({ lastUpdateCheckAt: null }), { changed: true });
  assert.equal(store.getState().runtime.pwa.lastUpdateCheckAt, null);
  assert.equal(log.length, 2);
});

test("FE-49：未知鍵、字串 \"true\"、數字 1、物件值、非有限數 → 忽略（PV-7）", () => {
  const { store, a } = makeStore();
  const log = tagLog(store);
  const fakeEvent = { prompt() {}, userChoice: Promise.resolve() };
  const r = a.setPwa({
    foo: true, eligible: "true", standalone: 1, installPromptAvailable: fakeEvent, updateAvailable: {},
    reloadRequested: null, lastUpdateCheckAt: NaN, registration: { waiting: null }, deferredPrompt: fakeEvent
  });
  assert.deepEqual(r, { changed: false });
  assert.equal(log.length, 0);
  assert.deepEqual(store.getState().runtime.pwa, PWA.initialPwaState());
  assert.deepEqual(a.setPwa({ lastUpdateCheckAt: Infinity }), { changed: false });
  assert.deepEqual(a.setPwa({ lastUpdateCheckAt: "12" }), { changed: false });
  // 混合：合法欄位照收、不合法欄位忽略
  assert.deepEqual(a.setPwa({ eligible: true, standalone: "yes", extra: 1 }), { changed: true });
  assert.deepEqual(Object.keys(store.getState().runtime.pwa), [...PWA.PWA_STATE_KEYS]);
  assert.equal(store.getState().runtime.pwa.standalone, false);
});

test("FE-49：importBackup、confirmApplyGoal、startLearning、setTab 前後 runtime.pwa 不變（AC-36-04）", async () => {
  // startLearning（首次模式）
  {
    const { store, a } = makeStore({ firstRun: true });
    a.setPwa(fullPwaPatch());
    a.startLearning();
    assert.deepEqual(store.getState().runtime.pwa, fullPwaPatch());
  }
  // importBackup（一般與首次模式）
  for (const firstRun of [false, true]) {
    const { store, a } = makeStore({ firstRun });
    a.setPwa(fullPwaPatch());
    const r = await a.importBackup(brownBackupText(), () => true);
    assert.equal(r.ok, true);
    assert.deepEqual(store.getState().runtime.pwa, fullPwaPatch());
  }
  // confirmApplyGoal、setTab、gotoCard
  {
    const { store, a } = storeWith(learnedData());
    a.setPwa(fullPwaPatch());
    a.clickColor("brown");
    assert.equal(a.requestApplyGoal().status, "confirm");
    assert.equal(a.confirmApplyGoal().ok, true);
    a.setTab("flashcards");
    a.gotoCard(1);
    a.flipCard();
    assert.deepEqual(store.getState().runtime.pwa, fullPwaPatch());
  }
});

test("FE-49：exportBackup JSON 不含 pwa；setPwa 前後 localStorage 鍵集合與 StorageRecord 欄位相同、schemaVersion 為目前版本（V-PWA-11 單元代理）", () => {
  const { storage, a } = makeStore();
  a.setDraftScore(300); // 寫入一次，確保主鍵為本版格式
  const keysBefore = Array.from(storage.map.keys()).sort();
  const recBefore = JSON.parse(storage.map.get(KEY));
  a.setPwa(fullPwaPatch());
  a.setDraftScore(305); // 之後的一般寫入也不帶 pwa
  const rec = JSON.parse(storage.map.get(KEY));
  assert.deepEqual(Array.from(storage.map.keys()).sort(), keysBefore);
  assert.deepEqual(Object.keys(rec).sort(), Object.keys(recBefore).sort());
  assert.deepEqual(Object.keys(rec.data).sort(), Object.keys(recBefore.data).sort());
  assert.equal(rec.schemaVersion, C.CURRENT_SCHEMA_VERSION);
  assert.ok(!storage.map.get(KEY).includes("pwa"));
  assert.ok(!storage.map.get(KEY).includes("installPromptAvailable"));
  const exp = a.exportBackup();
  assert.ok(!exp.json.includes("\"pwa\""));
  assert.ok(!exp.json.includes("installPromptAvailable"));
  assert.ok(!exp.json.includes("lastUpdateCheckAt"));
});

// ════════════════════════════ （v0.12，FE-55）runtime.dashboard 與 setBackupExpanded（DB-6、V-LAY-07、E-90、E-91） ════════════════════════════

/** localStorage 全部鍵值的快照（逐字比對用） */
function storageSnapshot(storage) {
  return JSON.stringify(Array.from(storage.map.entries()).sort((x, y) => (x[0] < y[0] ? -1 : 1)));
}

test("FE-55：初始 runtime.dashboard = { backupExpanded: false }（一般與首次模式）", () => {
  assert.deepEqual(makeStore().store.getState().runtime.dashboard, { backupExpanded: false });
  assert.deepEqual(makeStore({ firstRun: true }).store.getState().runtime.dashboard, { backupExpanded: false });
});

for (const mode of ["main", "firstRun"]) {
  test(`FE-55：setBackupExpanded(true／false) → 通知 ["dashboard"]、setItem 0 次、以新物件取代（${mode}，AC-39-08）`, () => {
    const { store, storage, a } = makeStore({ firstRun: mode === "firstRun" });
    const snap = storageSnapshot(storage);
    const before = store.getState().runtime.dashboard;
    const log = tagLog(store);
    let r;
    assert.equal(writesDuring(storage, () => { r = a.setBackupExpanded(true); }), 0);
    assert.deepEqual(r, { changed: true });
    assert.deepEqual(log, [["dashboard"]]);
    assert.notEqual(store.getState().runtime.dashboard, before);
    assert.equal(before.backupExpanded, false, "舊物件不被就地修改");
    assert.deepEqual(store.getState().runtime.dashboard, { backupExpanded: true });
    assert.equal(writesDuring(storage, () => { r = a.setBackupExpanded(false); }), 0);
    assert.deepEqual(r, { changed: true });
    assert.deepEqual(log, [["dashboard"], ["dashboard"]]);
    assert.deepEqual(store.getState().runtime.dashboard, { backupExpanded: false });
    assert.equal(store.getState().runtime.entryMode, mode);
    assert.equal(storageSnapshot(storage), snap, "localStorage 前後逐字相同");
  });
}

test("FE-55：同值與非布林 → changed false、不通知", () => {
  const { store, a } = makeStore();
  const log = tagLog(store);
  assert.deepEqual(a.setBackupExpanded(false), { changed: false });
  for (const v of ["true", 1, 0, null, undefined, {}, []]) {
    assert.deepEqual(a.setBackupExpanded(v), { changed: false }, String(v));
  }
  assert.equal(log.length, 0);
  a.setBackupExpanded(true);
  assert.deepEqual(a.setBackupExpanded(true), { changed: false });
  assert.equal(log.length, 1);
  assert.deepEqual(store.getState().runtime.dashboard, { backupExpanded: true });
});

test("FE-55：setTab 切頁後回主控台仍為 true（DB-6 (c)、E-90）", () => {
  const { store, storage, a } = makeStore();
  a.setBackupExpanded(true);
  const snap = storageSnapshot(storage);
  a.setTab("flashcards");
  a.setTab("part5");
  a.setTab("customizer");
  a.setTab("dashboard");
  assert.equal(store.getState().runtime.dashboard.backupExpanded, true);
  assert.equal(storageSnapshot(storage), snap);
});

test("FE-55：importBackup 成功、失敗、取消後保持（DB-6 (d)、E-91）", async () => {
  const { store, a } = makeStore();
  a.setBackupExpanded(true);
  // 失敗：格式錯誤
  let r = await a.importBackup("not json", () => true);
  assert.equal(r.ok, false);
  assert.equal(store.getState().runtime.dashboard.backupExpanded, true);
  // 取消
  r = await a.importBackup(brownBackupText(), () => false);
  assert.deepEqual(r, { ok: false, error: "cancelled" });
  assert.equal(store.getState().runtime.dashboard.backupExpanded, true);
  // 成功
  r = await a.importBackup(brownBackupText(), () => true);
  assert.equal(r.ok, true);
  assert.equal(store.getState().runtime.dashboard.backupExpanded, true);
});

test("FE-55：首次模式 startLearning、首次還原後 backupExpanded 不被重設", async () => {
  {
    const { store, a } = makeStore({ firstRun: true });
    a.setBackupExpanded(true);
    a.startLearning();
    assert.equal(store.getState().runtime.entryMode, "main");
    assert.equal(store.getState().runtime.dashboard.backupExpanded, true);
  }
  {
    const { store, a } = makeStore({ firstRun: true });
    a.setBackupExpanded(true);
    const r = await a.importBackup(brownBackupText(), () => true);
    assert.equal(r.ok, true);
    assert.equal(store.getState().runtime.entryMode, "main");
    assert.equal(store.getState().runtime.dashboard.backupExpanded, true);
  }
});

test("FE-55：confirmApplyGoal、cancelApplyGoal 後保持", () => {
  const { store, a } = storeWith(learnedData());
  a.setBackupExpanded(true);
  a.clickColor("brown");
  assert.equal(a.requestApplyGoal().status, "confirm");
  a.cancelApplyGoal();
  assert.equal(store.getState().runtime.dashboard.backupExpanded, true);
  a.clickColor("brown"); // 取消會還原草稿，重新選一次
  assert.equal(a.requestApplyGoal().status, "confirm");
  assert.equal(a.confirmApplyGoal().ok, true);
  assert.equal(store.getState().runtime.dashboard.backupExpanded, true);
});

test("FE-55：localStorage 與匯出備份 JSON 皆不含 dashboard／backupExpanded", () => {
  const { storage, a } = makeStore();
  a.setBackupExpanded(true);
  a.setDraftScore(300); // 之後的一般寫入也不帶 dashboard
  const raw = storage.map.get(KEY);
  assert.ok(!raw.includes("dashboard"));
  assert.ok(!raw.includes("backupExpanded"));
  const exp = a.exportBackup();
  assert.ok(!exp.json.includes("dashboard"));
  assert.ok(!exp.json.includes("backupExpanded"));
});
