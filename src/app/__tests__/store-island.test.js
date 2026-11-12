/*
 * store-island.test.js — 單字卡學完回饋 runtime.flashcard.islandFeedback（FE-106）
 * 依據：architecture.md v0.19 §4.16「EMT.store」、§7.32.9 store 段、§7.32.13、§10.15 FE-106 列；
 *       契約 data-schema.ts RuntimeState.flashcard.islandFeedback、IslandFeedback；
 *       README §15.1 IS-1、IS-2、IS-4，§15.5 LF-1～LF-6，§5.4 LR-1、LR-6，§5.12 WR，V-ISL-05～V-ISL-07。
 * 涵蓋：AC-69-02～AC-69-06、AC-64-08、AC-64-09、AC-72-02
 * （v0.21，FE-114）init() 預熱：architecture.md v0.21 §4.16「init() 預熱」、§7.32.15 P-5、§10.15 FE-114 列；AC-69-05、AC-70-03
 *
 * 做法：
 * - 合成字庫夾具：排名 1～3,000，前 2,809 筆 sources 含 NGSL（nB = 2,809、nG = 3,000），N_O = 1,000。
 * - 以注入的假 storage（計數 setItem、可設定容量不足、停用）驅動 store actions；時鐘固定在 2026-10-30。
 * - 單字以排名指定：W(r) = 排名 r 的內建字 wordKey。
 */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const S = require("../state/store.js");
const VOCAB = require("../core/vocab.js");
const P = require("../core/persist.js");
const C = require("../core/constants.js");
const G = require("../core/goal.js");
const WK = require("../core/wordkey.js");
const LEARN = require("../core/learning.js");
const ISL = require("../core/island.js");
const DASH = require("../views/dashboard.js");

const KEY = C.STORAGE_KEYS.state;
const TODAY = "2026-10-30";
const NOW = () => new Date("2026-10-30T10:00:00");

// 契約字面值（LF-6、ISLAND_STAGES[].levelUpText、ISLAND_TEXTS.feedback*）
const TXT_ORANGE_24 = "橘島又多掌握 1 個字（掌握 24%）";
const TXT_ORANGE_25 = "橘島又多掌握 1 個字（掌握 25%）";
const TXT_ORANGE_PALM = "橘島長出第一棵椰子樹！";
const TXT_BROWN_SPROUT = "棕島冒出新芽了！";
const TXT_SAILING_1 = "小船又前進了，再 1 個字靠岸";
const TXT_DOCKED = "今天的小船靠岸了！";

// ── 合成字庫夾具（共用同一份，sectionSizes 以陣列為鍵快取）──

function buildContent() {
  const raw = [];
  for (let r = 1; r <= 3000; r++) {
    raw.push({ rank: r, word: "word" + r, meaning: "釋義" + r, sources: r <= 2809 ? ["NGSL", "TSL"] : ["TSL"] });
  }
  const prepared = VOCAB.prepareBuiltin(raw, null);
  const part5 = [0, 1, 2].map((n) => ({
    id: "p5-00" + (n + 1), type: "grammar", sentence: "A _____ B.", options: ["a", "b", "c", "d"],
    correctIndex: 0, explanation: { coreStrategy: "x", structure: "y" }, source: "ORIGINAL"
  }));
  return {
    builtin: prepared.sorted, builtinMap: prepared.map, nB: prepared.nB, nG: prepared.nG,
    part5, templates: [], decoderSentences: [], manifest: { dataVersion: "2026.11.12" }
  };
}
const CONTENT = buildContent();

/** 排名 r 的內建字 wordKey */
function W(r) {
  return WK.wordKey("word" + r);
}

/** 排名 from～to 的 wordKey 陣列 */
function range(from, to) {
  const out = [];
  for (let r = from; r <= to; r++) { out.push(W(r)); }
  return out;
}

/** 各色級的代表分數（依 goal.colorOf 掃描取得，不寫死分數區間） */
function scoreOf(color) {
  for (let s = 10; s <= 990; s += 5) {
    if (G.colorOf(s) === color) { return s; }
  }
  throw new Error("找不到色級分數：" + color);
}

/**
 * 建立 PersistedData。
 * @param {{color?: string, mastered?: string[], learned?: string[], custom?: object[], streak?: object}} o
 */
function dataWith(o) {
  const d = P.defaultData();
  const color = o.color || "green";
  const score = scoreOf(color);
  d.goal = { draftScore: score, appliedScore: score, appliedColor: color, effectiveColor: G.effectiveColorOf(color) };
  d.masteredWordKeys = (o.mastered || []).slice();
  const learned = o.learned || [];
  d.todayLearned = { date: learned.length > 0 ? TODAY : null, wordKeys: learned.slice() };
  d.learnedHistory = learned.length > 0 ? { [TODAY]: learned.length } : {};
  if (o.custom) { d.customVocab = o.custom.slice(); }
  if (o.streak) { d.streak = o.streak; }
  return d;
}

function recordOf(data) {
  return JSON.stringify(P.buildRecord(data, new Date("2026-10-29T00:00:00Z")));
}

/** 假 localStorage：記錄 setItem 的鍵與寫出字串；quota → 寫主鍵拋容量不足；getThrows → 停用 */
function fakeStorage(initial) {
  const map = new Map(Object.entries(initial || {}));
  const s = {
    map,
    setCalls: [],
    writes: [],
    quota: false,
    getThrows: false,
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
      s.writes.push(String(v));
      map.set(k, String(v));
    }
  };
  return s;
}

/**
 * 建立已 init 的 store；tab 預設 "flashcards"（學完回饋只在單字卡頁比較，LF-1）。
 * @param {object} data PersistedData（預寫主鍵，一般模式）
 * @param {{tab?: string, storage?: object, content?: object}} [opts]
 */
function makeStore(data, opts) {
  const o = opts || {};
  const storage = o.storage || fakeStorage({ [KEY]: recordOf(data) });
  let i = 0;
  const store = S.createStore({
    storage, content: o.content || CONTENT, now: NOW,
    rand: () => { i = (i + 1) % 97; return i / 97; }
  });
  store.init();
  const tab = o.tab === undefined ? "flashcards" : o.tab;
  if (tab) { store.actions.setTab(tab); }
  return { store, storage, a: store.actions };
}

function fb(store) {
  return store.getState().runtime.flashcard.islandFeedback;
}

function indexOfKey(store, key) {
  const i = store.getState().runtime.studySet.findIndex((c) => c.wordKey === key);
  assert.ok(i >= 0, "單字集中找不到 " + key);
  return i;
}

/** 換到 wordKey 所在的卡片（已在該張 → 不動） */
function goto(store, key) {
  const i = indexOfKey(store, key);
  if (store.getState().runtime.flashcard.index !== i) { store.actions.gotoCard(i); }
}

/** 換到 key 並在測驗模式作答；correct = true 選正確選項。回傳該次通知的 tags */
function answer(store, key, correct) {
  goto(store, key);
  assert.equal(store.actions.setFlashcardMode("quiz").ok, true);
  const q = store.getState().runtime.flashcard.quiz;
  assert.equal(q.wordKey, key);
  const log = [];
  const off = store.subscribe((_st, tags) => log.push(tags.slice()));
  const r = store.actions.answerVocabQuiz(correct ? q.correctIndex : (q.correctIndex + 1) % 4);
  off();
  assert.equal(r.ok, true);
  assert.equal(log.length, 1, "作答只通知 1 次");
  return log[0];
}

/** 換到 key 並在單字卡模式翻到背面。回傳該次通知的 tags */
function flipToBack(store, key) {
  goto(store, key);
  store.actions.setFlashcardMode("card");
  if (store.getState().runtime.flashcard.isFlipped) { store.actions.flipCard(); }
  const log = [];
  const off = store.subscribe((_st, tags) => log.push(tags.slice()));
  store.actions.flipCard();
  off();
  assert.equal(store.getState().runtime.flashcard.isFlipped, true);
  return log[0];
}

/** 換到 key 後完成一次 STT 評分（speech-panel 顯示分數後呼叫 recordSttScored）。回傳 tags */
function sttScore(store, key) {
  goto(store, key);
  const log = [];
  const off = store.subscribe((_st, tags) => log.push(tags.slice()));
  store.actions.recordSttScored();
  off();
  return log[0] || [];
}

/** 目前記憶體資料的島嶼快照（以 today 計算） */
function snapOf(store) {
  return S.islandSnapshot(CONTENT, store.getState().data, TODAY);
}

/** 遞迴收集 JSON 中所有物件鍵 */
function allKeys(text) {
  const keys = new Set();
  JSON.parse(text, function (k) { if (k !== "" && isNaN(Number(k))) { keys.add(k); } return arguments[1]; });
  return keys;
}

const ISLAND_KEYS = ["islandFeedback", "islands", "stage", "weather", "lighthouse", "boat"];

// ════════════════════ 夾具與快照 ════════════════════

test("夾具：nB 2,809、nG 3,000、N_O 1,000；快照三島 n = 1,000／1,809／191，x、d 依 LR-6", () => {
  assert.equal(CONTENT.nB, 2809);
  assert.equal(CONTENT.nG, 3000);
  assert.equal(C.N_O, 1000);
  const snap = S.islandSnapshot(CONTENT, dataWith({ mastered: range(1, 239), learned: range(2001, 2003) }), TODAY);
  assert.deepEqual(snap.islands.map((x) => x.n), [1000, 1809, 191]);
  assert.deepEqual(snap.islands.map((x) => x.m), [239, 0, 0]);
  assert.equal(snap.islands[0].p, 24);
  assert.equal(snap.x, 3);
  assert.equal(snap.d, 15);
  // 其他日期的 todayLearned → x = 0（LR-6）
  assert.equal(S.islandSnapshot(CONTENT, dataWith({ learned: range(1, 3) }), "2026-10-31").x, 0);
});

test("islandSnapshot：內容缺漏、為空或資料異常時不拋例外，三島 n = 0、P = null", () => {
  [null, undefined, {}, () => null, () => { throw new Error("x"); }].forEach((src) => {
    const snap = S.islandSnapshot(src, dataWith({ mastered: range(1, 5) }), TODAY);
    assert.deepEqual(snap.islands.map((x) => [x.n, x.m, x.p, x.stage]), [[0, 0, null, "sand"], [0, 0, null, "sand"], [0, 0, null, "sand"]]);
  });
  const snap = S.islandSnapshot(CONTENT, null, TODAY);
  assert.equal(snap.x, 0);
  assert.equal(Number.isFinite(snap.d), true);
});

test("IS-13：store 快照的 d 與 views/dashboard.js goalInfoOf 推導的每日新字量相同（5 種色級）", () => {
  ["orange", "brown", "green", "blue", "gold"].forEach((color) => {
    const data = dataWith({ color });
    const d = S.islandSnapshot(CONTENT, data, TODAY).d;
    const info = DASH.goalInfoOf(data.goal);
    assert.equal(d, LEARN.dailyGoal(info.effectiveColorId), color);
    assert.equal(info.daily, d + " 字/天", color);
  });
});

// ════════════════════ V-ISL-05：LF-6 序列（AC-69-02、AC-69-03）════════════════════

test("AC-69-02：橘 m 239、X 3，四選一答對 W1（排名 300）→「橘島又多掌握 1 個字（掌握 24%）」；同一次 setItem、tags 加 islandFeedback", () => {
  const { store, storage } = makeStore(dataWith({ color: "green", mastered: range(1, 239), learned: range(2001, 2003) }));
  assert.equal(fb(store), null);
  goto(store, W(300));
  store.actions.setFlashcardMode("quiz");
  const calls = storage.setCalls.length;
  const tags = answer(store, W(300), true);
  assert.equal(storage.setCalls.length - calls, 1, "作答 setItem 恰 1 次（LF-5）");
  assert.deepEqual(fb(store), { kind: "mastered", island: "orange", text: TXT_ORANGE_24 });
  assert.equal(tags.filter((t) => t === "islandFeedback").length, 1);
  const snap = snapOf(store);
  assert.equal(snap.islands[0].m, 240);
  assert.equal(snap.x, 4);
  // 百分比與群島頁一致（同一個推算）
  assert.equal(snap.islands[0].p, 24);
});

test("AC-69-02：橘 m 244 答對 W2（排名 301）→ 245、P 25 升階「橘島長出第一棵椰子樹！」", () => {
  const { store } = makeStore(dataWith({ color: "green", mastered: range(1, 244), learned: range(2001, 2003) }));
  answer(store, W(301), true);
  assert.deepEqual(fb(store), { kind: "levelUp", island: "orange", text: TXT_ORANGE_PALM });
  assert.equal(snapOf(store).islands[0].p, 25);
});

test("V-ISL-05：橘 m 249 → 250 階段不變 →「橘島又多掌握 1 個字（掌握 25%）」", () => {
  const { store } = makeStore(dataWith({ color: "green", mastered: range(1, 249), learned: range(2001, 2003) }));
  answer(store, W(300), true);
  assert.deepEqual(fb(store), { kind: "mastered", island: "orange", text: TXT_ORANGE_25 });
});

test("AC-69-02：棕 m 0 → 1（P 1 升階）→「棕島冒出新芽了！」", () => {
  const { store } = makeStore(dataWith({ color: "green", learned: range(1, 3) }));
  answer(store, W(1500), true);
  assert.deepEqual(fb(store), { kind: "levelUp", island: "brown", text: TXT_BROWN_SPROUT });
});

test("AC-69-03（D = 10）：翻面 8 → 9「小船…再 1 個字」；STT 9 → 10「靠岸」；翻面 10 → 11 不變；自訂單字掌握 11 → 12 不變", () => {
  const { store, a } = makeStore(dataWith({ color: "brown", learned: range(2001, 2008) }));
  assert.equal(snapOf(store).d, 10);
  assert.equal(snapOf(store).x, 8);

  const t1 = flipToBack(store, W(500));
  assert.equal(snapOf(store).x, 9);
  assert.deepEqual(fb(store), { kind: "sailing", island: null, text: TXT_SAILING_1 });
  assert.ok(t1.includes("islandFeedback"));

  const t2 = sttScore(store, W(501));
  assert.equal(snapOf(store).x, 10);
  assert.deepEqual(fb(store), { kind: "docked", island: null, text: TXT_DOCKED });
  assert.ok(t2.includes("islandFeedback"));
  const docked = fb(store);

  const t3 = flipToBack(store, W(502));
  assert.equal(snapOf(store).x, 11);
  assert.equal(fb(store), docked, "X = 11 不產生新回饋，維持原值（同一物件）");
  assert.ok(!t3.includes("islandFeedback"));

  // 自訂單字（wordKey 不在內建字庫）首次掌握且 11 → 12 → 不產生
  const add = a.addCustomWord({ word: "Zyzzyva", meaning: "南美象鼻蟲" });
  assert.equal(add.ok, true);
  assert.equal(fb(store), docked, "新增自訂單字（單字集重建）保留回饋");
  const key = WK.wordKey("Zyzzyva");
  assert.equal(CONTENT.builtinMap.has(key), false);
  const t4 = answer(store, key, true);
  assert.equal(snapOf(store).x, 12);
  assert.ok(store.getState().data.masteredWordKeys.includes(key));
  assert.equal(fb(store), docked);
  assert.ok(!t4.includes("islandFeedback"));
});

// ════════════════════ AC-69-04：優先序與不改變數值的動作 ════════════════════

test("AC-69-04 (a)：同時升階且 X 達到 D → 升階文字；(b) 靠岸未升階 →「今天的小船靠岸了！」", () => {
  const s1 = makeStore(dataWith({ color: "brown", mastered: range(1, 244), learned: range(2001, 2009) }));
  answer(s1.store, W(301), true);
  assert.equal(snapOf(s1.store).x, 10);
  assert.deepEqual(fb(s1.store), { kind: "levelUp", island: "orange", text: TXT_ORANGE_PALM });

  const s2 = makeStore(dataWith({ color: "brown", mastered: range(1, 239), learned: range(2001, 2009) }));
  answer(s2.store, W(300), true);
  assert.equal(snapOf(s2.store).x, 10);
  assert.deepEqual(fb(s2.store), { kind: "docked", island: null, text: TXT_DOCKED });
});

test("AC-69-04 (c)：同一字再翻面、換卡、答對已掌握且今天已學過的字、STT 訊息或錯誤、準備中取消 → 回饋不變（同一物件）", () => {
  const { store, a } = makeStore(dataWith({ color: "brown", mastered: range(1, 239).concat([W(600)]), learned: range(2001, 2005).concat([W(600)]) }));
  flipToBack(store, W(500));
  const cur = fb(store);
  assert.deepEqual(cur, { kind: "sailing", island: null, text: "小船又前進了，再 3 個字靠岸" });
  const x0 = snapOf(store).x;

  const tagsSeen = [];
  const off = store.subscribe((_st, tags) => tagsSeen.push(...tags));
  // 翻回正面、同一字再翻到背面
  a.flipCard();
  a.flipCard();
  assert.equal(store.getState().runtime.flashcard.isFlipped, true);
  // 上一張／下一張（滑動同為 gotoCard）
  const i = store.getState().runtime.flashcard.index;
  a.gotoCard(i + 1);
  a.gotoCard(i);
  // 答對已掌握且今天已學過的字
  a.setFlashcardMode("quiz");
  goto(store, W(600));
  const q = store.getState().runtime.flashcard.quiz;
  a.answerVocabQuiz(q.correctIndex);
  // STT 出現 US-59 訊息或錯誤：不呼叫 recordSttScored，只改語音狀態
  a.setSttStatus("preparing", "acquiringMic");
  a.setSttStatus("listening");
  a.setSttStatus("idle");
  // 準備中取消
  a.setSttStatus("preparing", "awaitingAudioStart");
  a.setSttStatus("idle");
  // 同一字（今天已學、打卡已更新）STT 評分 → 無資料變更
  a.recordSttScored();
  a.setFlashcardMode("card");
  off();

  assert.equal(fb(store), cur);
  assert.equal(snapOf(store).x, x0);
  assert.ok(!tagsSeen.includes("islandFeedback"));
});

test("LF-1：不在單字卡頁時 3 種學習事件都不比較，islandFeedback 維持 null", () => {
  const { store } = makeStore(dataWith({ color: "green", mastered: range(1, 244), learned: range(2001, 2003) }), { tab: "dashboard" });
  const tags = answer(store, W(301), true);
  flipToBack(store, W(302));
  sttScore(store, W(303));
  assert.equal(fb(store), null);
  assert.ok(!tags.includes("islandFeedback"));
  assert.equal(snapOf(store).islands[0].p, 25, "資料照常更新");
});

// ════════════════════ LF-3：保留與清除 ════════════════════

test("LF-3：換卡、切換模式保留；setTab 離開 → null（tags 加 islandFeedback）、回來仍 null；null 時離開不加 tag", () => {
  const { store, a } = makeStore(dataWith({ color: "green", mastered: range(1, 239), learned: range(2001, 2003) }));
  answer(store, W(300), true);
  const cur = fb(store);
  assert.equal(cur.text, TXT_ORANGE_24);

  a.gotoCard(store.getState().runtime.flashcard.index + 1);
  assert.equal(fb(store), cur, "測驗模式換卡保留");
  a.setFlashcardMode("card");
  assert.equal(fb(store), cur, "切到單字卡模式保留");
  a.gotoCard(0);
  assert.equal(fb(store), cur, "單字卡模式換卡保留");
  a.setFlashcardMode("quiz");
  assert.equal(fb(store), cur, "切到測驗模式保留");
  a.setTab("flashcards");
  assert.equal(fb(store), cur, "同一頁 setTab 不清除");

  const log = [];
  const off = store.subscribe((_st, tags) => log.push(tags.slice()));
  a.setTab("dashboard");
  assert.equal(fb(store), null);
  assert.deepEqual(log[0].sort(), ["islandFeedback", "tab"]);
  a.setTab("flashcards");
  assert.equal(fb(store), null, "回到單字卡頁仍為 null");
  a.setTab("part5");
  off();
  assert.deepEqual(log[2], ["tab"], "原值 null 時不加 islandFeedback");
});

test("LF-3、IS-4：啟動為 null；匯入成功重設單字卡狀態時為 null；重新載入為 null", async () => {
  const { store, storage, a } = makeStore(dataWith({ color: "green", mastered: range(1, 239), learned: range(2001, 2003) }));
  assert.equal(fb(store), null);
  const json = a.exportBackup().json;
  answer(store, W(300), true);
  assert.notEqual(fb(store), null);

  const log = [];
  const off = store.subscribe((_st, tags) => log.push(tags.slice()));
  const r = await a.importBackup(json, () => true);
  off();
  assert.equal(r.ok, true);
  assert.equal(fb(store), null);
  assert.ok(log[0].includes("islandFeedback"));
  assert.deepEqual(Object.keys(store.getState().runtime.flashcard).sort(), ["index", "isFlipped", "islandFeedback", "mode", "quiz"]);

  // 再觸發一次後重新載入（同一 storage）→ null
  answer(store, W(300), true);
  assert.notEqual(fb(store), null);
  const again = makeStore(null, { storage, tab: null });
  assert.equal(fb(again.store), null);
});

// ════════════════════ LF-5、IS-1、V-ISL-07：不寫入 ════════════════════

/** 同一操作序列：作答、翻面、STT、換卡、切換模式、離開單字卡頁 */
function runSequence(store) {
  answer(store, W(301), true);
  flipToBack(store, W(302));
  sttScore(store, W(303));
  answer(store, W(1500), true);
  answer(store, W(304), false);
  store.actions.setTab("dashboard");
}

test("LF-5、V-ISL-07：有無學完回饋（單字卡頁／群島頁執行）同一操作序列的 setItem 次數與寫出字串相同", () => {
  const data = dataWith({ color: "brown", mastered: range(1, 244), learned: range(2001, 2007) });
  const on = makeStore(data, { tab: "flashcards" });
  const off = makeStore(data, { tab: "dashboard" });
  const seen = [];
  on.store.subscribe((st) => { if (st.runtime.flashcard.islandFeedback) { seen.push(st.runtime.flashcard.islandFeedback.kind); } });
  const c0on = on.storage.setCalls.length;
  const c0off = off.storage.setCalls.length;
  runSequence(on.store);
  runSequence(off.store);
  assert.ok(seen.length > 0, "單字卡頁序列確實產生回饋");
  assert.equal(fb(off.store), null);
  assert.equal(on.storage.setCalls.length - c0on, off.storage.setCalls.length - c0off);
  assert.deepEqual(on.storage.writes, off.storage.writes);
  assert.deepEqual(on.store.getState().data, off.store.getState().data, "記憶體資料相同（回饋不改數值，AC-69-06）");
});

test("IS-1、V-ISL-07、AC-72-02：localStorage 與匯出備份不含島嶼鍵；schemaVersion 3、PersistedData 12 欄、備份頂層 5 欄", () => {
  const { store, storage, a } = makeStore(dataWith({ color: "brown", mastered: range(1, 244), learned: range(2001, 2007) }));
  runSequence(store);
  a.setTab("flashcards");
  answer(store, W(305), true);
  assert.notEqual(fb(store), null);
  assert.ok(storage.writes.length > 0);
  storage.writes.concat([storage.map.get(KEY)]).forEach((text, i) => {
    const keys = allKeys(text);
    ISLAND_KEYS.forEach((k) => assert.equal(keys.has(k), false, "第 " + (i + 1) + " 筆寫出含 " + k));
    const rec = JSON.parse(text);
    assert.equal(rec.schemaVersion, 3);
    assert.equal(Object.keys(rec.data).length, 12);
    assert.equal(P.validatePersistedData(rec.data, { written: true }).ok, true);
  });
  assert.deepEqual([...storage.map.keys()], [KEY], "本系統鍵不增加");
  const backup = a.exportBackup().json;
  const bk = allKeys(backup);
  ISLAND_KEYS.forEach((k) => assert.equal(bk.has(k), false, "備份含 " + k));
  const obj = JSON.parse(backup);
  assert.deepEqual(Object.keys(obj).sort(), ["contentDataVersion", "data", "exportedAt", "format", "schemaVersion"]);
  assert.equal(obj.schemaVersion, 3);
  assert.equal(Object.keys(obj.data).length, 12);
  assert.equal(Object.prototype.hasOwnProperty.call(store.getState().data, "islandFeedback"), false);
});

test("LF-5、E-180：寫入容量不足時回饋照常（以記憶體值比較），learningQuota 只提示 1 次", () => {
  const storage = fakeStorage({ [KEY]: recordOf(dataWith({ color: "brown", mastered: range(1, 239), learned: range(2001, 2008) })) });
  const { store } = makeStore(null, { storage });
  // 先換到 W1 並切到測驗模式（換卡寫入成功），之後才讓主鍵寫入容量不足
  goto(store, W(300));
  store.actions.setFlashcardMode("quiz");
  const stored = storage.map.get(KEY);
  storage.quota = true;
  const all = [];
  store.subscribe((_st, tags) => all.push(...tags));
  const t1 = answer(store, W(300), true);
  assert.deepEqual(fb(store), { kind: "mastered", island: "orange", text: TXT_ORANGE_24 });
  assert.ok(t1.includes("learningQuota"));
  assert.ok(t1.includes("islandFeedback"));
  flipToBack(store, W(301)); // 換卡、翻面皆寫入失敗
  assert.deepEqual(fb(store), { kind: "docked", island: null, text: TXT_DOCKED });
  assert.equal(all.filter((t) => t === "learningQuota").length, 1, "整個工作階段最多提示 1 次");
  assert.equal(snapOf(store).x, 10, "記憶體照常更新");
  assert.equal(storage.map.get(KEY), stored, "主鍵原值不變");
  assert.equal(store.getWriteStatus(), "quota");
});

test("LF-5、IS-2：localStorage 停用時回饋照常、setItem 0 次", () => {
  const storage = fakeStorage({});
  storage.getThrows = true;
  const { store, a } = makeStore(null, { storage, tab: null });
  assert.equal(store.getState().runtime.storageStatus, "unavailable");
  assert.equal(a.startLearning().ok, true);
  a.setTab("flashcards");
  answer(store, W(1500), true);
  assert.deepEqual(fb(store), { kind: "levelUp", island: "brown", text: TXT_BROWN_SPROUT });
  assert.equal(storage.setCalls.length, 0);
});

// ════════════════════ V-ISL-06：一般操作不倒退（AC-64-08）════════════════════

test("V-ISL-06、AC-64-08：四選一答錯、當天未學、刪除自訂單字、模擬測驗答錯、重新開始、打卡中斷 → 三島 P 與階段不下降", () => {
  const order = ISL.STAGES.map((s) => s.stage);
  function pairs(snap) {
    return snap.islands.map((x) => [x.p === null ? -1 : x.p, order.indexOf(x.stage)]);
  }
  function assertNotDown(before, after, label) {
    before.forEach((b, i) => {
      assert.ok(after[i][0] >= b[0], label + "：第 " + (i + 1) + " 島 P");
      assert.ok(after[i][1] >= b[1], label + "：第 " + (i + 1) + " 島階段");
    });
  }
  const custom = { id: "c_zyzzyva01", word: "Zyzzyva", meaning: "南美象鼻蟲", phonetic: "", pos: "", collocation: "", example: "", academicContext: "", origin: "manual", templateId: null, createdAt: "2026-10-29T08:30:00.000Z" };
  const data = dataWith({
    color: "green",
    mastered: range(1, 300).concat(range(1001, 1100), range(2810, 2830), [WK.wordKey("Zyzzyva")]),
    learned: range(2001, 2003),
    custom: [custom],
    streak: { days: 5, lastActiveDate: TODAY }
  });
  const { store, a } = makeStore(data);
  let prev = pairs(snapOf(store));
  assert.ok(prev.every((x) => x[1] >= 1), "各島已有新芽以上");

  answer(store, W(400), false);
  let cur = pairs(snapOf(store)); assertNotDown(prev, cur, "四選一答錯"); prev = cur;

  a.setTab("dashboard");
  cur = pairs(snapOf(store)); assertNotDown(prev, cur, "當天未學（只瀏覽）"); prev = cur;

  const del = a.deleteCustomWord(custom.id);
  assert.notEqual(del && del.ok, false);
  cur = pairs(snapOf(store)); assertNotDown(prev, cur, "刪除自訂單字"); prev = cur;

  a.setTab("part5");
  a.answerPart5(1);
  cur = pairs(snapOf(store)); assertNotDown(prev, cur, "模擬測驗答錯"); prev = cur;
  a.restartPart5();
  cur = pairs(snapOf(store)); assertNotDown(prev, cur, "重新開始"); prev = cur;

  // 打卡中斷：3 天後開啟（同一份已存資料）
  const later = S.createStore({ storage: fakeStorage({ [KEY]: recordOf(store.getState().data) }), content: CONTENT, now: () => new Date("2026-11-02T10:00:00") });
  later.init();
  cur = pairs(S.islandSnapshot(CONTENT, later.getState().data, "2026-11-02"));
  assertNotDown(prev, cur, "打卡中斷");
});

// ════════════════════ AC-64-09：回到群島頁即為新值 ════════════════════

test("AC-64-09：單字卡答對使橘 P 24 → 25 後回到群島頁，記憶體即為新值（P 25、X 4），不需重新載入", () => {
  const { store, a } = makeStore(dataWith({ color: "green", mastered: range(1, 244), learned: range(2001, 2003) }));
  const before = snapOf(store);
  assert.equal(before.islands[0].p, 24);
  assert.equal(before.x, 3);
  answer(store, W(301), true);
  a.setTab("dashboard");
  const after = snapOf(store);
  assert.equal(after.islands[0].p, 25);
  assert.equal(after.x, 4);
  assert.equal(fb(store), null);
});

// ════════════════════ AC-69-06：效能 ════════════════════

test("AC-69-06：3,000 個已掌握字時，學習事件（含前後快照）每次 < 50 ms（寬鬆門檻，量測 store 端成本）", () => {
  const all = range(1, 2999);
  const { store, a } = makeStore(dataWith({ color: "green", mastered: all, learned: range(1, 3) }));
  a.setFlashcardMode("card");
  goto(store, W(3000));
  const t0 = process.hrtime.bigint();
  a.flipCard();
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  assert.ok(ms < 50, "耗時 " + ms.toFixed(2) + " ms");
  assert.equal(snapOf(store).x, 4);
});

// ════════════════════ FE-114：init() 預熱（§4.16「init() 預熱」、§7.32.15 P-5）════════════════════
//
// 做法：在 require 快取中把 core/island.js 換成包裝物件（計數 islandsOf、feedbackOf，可設定只在 init 期間拋例外），
// 再重新載入 state/store.js（core() 在第一次 init 時才取用並快取模組），init 後立即還原兩個快取項，
// 不影響本檔其他案例使用的 S 與 ISL。island 模組不可用 = 快取 exports 設為 null（store 的 core().ISL 為假值）。

const STORE_PATH = require.resolve("../state/store.js");
const ISL_PATH = require.resolve("../core/island.js");

/**
 * 以替換後的 island 模組重新載入 store 並執行 fn(storeModule)；結束後還原 require 快取。
 * @param {object|null} islandExports 替換用的 island 模組（null → 不可用）
 * @param {function(object): *} fn
 */
function withIsland(islandExports, fn) {
  const islMod = require.cache[ISL_PATH];
  const origIsl = islMod.exports;
  const origStore = require.cache[STORE_PATH];
  delete require.cache[STORE_PATH];
  islMod.exports = islandExports;
  try {
    return fn(require(STORE_PATH));
  } finally {
    islMod.exports = origIsl;
    require.cache[STORE_PATH] = origStore;
  }
}

/**
 * 計數用的 island 包裝；throwIn = "islandsOf"｜"feedbackOf" 時只在 phase.initing 期間拋例外。
 * @param {{throwIn?: string}} [opts]
 */
function countingIsland(opts) {
  const o = opts || {};
  const calls = { islandsOf: 0, feedbackOf: 0 };
  const phase = { initing: false };
  const mod = Object.assign({}, ISL, {
    islandsOf(input) {
      calls.islandsOf += 1;
      if (o.throwIn === "islandsOf" && phase.initing) { throw new Error("預熱失敗（測試）"); }
      return ISL.islandsOf(input);
    },
    feedbackOf(b, a) {
      calls.feedbackOf += 1;
      if (o.throwIn === "feedbackOf" && phase.initing) { throw new Error("預熱失敗（測試）"); }
      return ISL.feedbackOf(b, a);
    }
  });
  return { mod, calls, phase };
}

/**
 * 以指定 island 模組建立 store 並 init；回傳 init 結果、啟動通知 tags 與 init 期間的 setItem。
 * @param {object|null} islandExports
 * @param {object} storage fakeStorage
 * @param {{initing: boolean}} [phase]
 */
function bootWith(islandExports, storage, phase) {
  return withIsland(islandExports, (SS) => {
    let i = 0;
    const store = SS.createStore({
      storage, content: CONTENT, now: NOW,
      rand: () => { i = (i + 1) % 97; return i / 97; }
    });
    const tags = [];
    store.subscribe((_st, t) => tags.push(t.slice()));
    if (phase) { phase.initing = true; }
    let result;
    try {
      result = store.init();
    } finally {
      if (phase) { phase.initing = false; }
    }
    return {
      store, storage, a: store.actions, result, tags,
      setCalls: storage.setCalls.slice(), writes: storage.writes.slice()
    };
  });
}

/** 4 種啟動情境的 storage 產生器（ok、missing、unreadable、unavailable） */
const BOOT_CASES = [
  ["ok", () => fakeStorage({ [KEY]: recordOf(dataWith({ color: "green", mastered: range(1, 244), learned: range(2001, 2003) })) })],
  ["missing", () => fakeStorage({})],
  ["unreadable", () => fakeStorage({ [KEY]: "{損壞的 JSON" })],
  ["unavailable", () => { const s = fakeStorage({}); s.getThrows = true; return s; }]
];

test("FE-114：init() 在 island 模組可用時呼叫 islandsOf 與 feedbackOf 各 1 次（4 種啟動情境）；之後非學習 action 不再呼叫", () => {
  BOOT_CASES.forEach(([label, mk]) => {
    const w = countingIsland();
    const b = bootWith(w.mod, mk(), w.phase);
    assert.deepEqual(w.calls, { islandsOf: 1, feedbackOf: 1 }, label);
    assert.equal(b.result.status, label, label + "：startup 結果");
    // 只預熱這 1 次：讀狀態、換頁不觸發島嶼推算
    b.store.getState();
    b.a.setTab("dashboard");
    assert.deepEqual(w.calls, { islandsOf: 1, feedbackOf: 1 }, label + "：init 之後不再預熱");
  });
});

test("FE-114：預熱前後 getState() 深度相等、啟動通知 tags 不變、init 的 setItem 次數與寫出字串與無預熱時相同", () => {
  BOOT_CASES.forEach(([label, mk]) => {
    const w = countingIsland();
    const warm = bootWith(w.mod, mk(), w.phase);
    const cold = bootWith(null, mk());
    assert.deepEqual(w.calls, { islandsOf: 1, feedbackOf: 1 }, label + "：有預熱");
    assert.deepEqual(warm.store.getState(), cold.store.getState(), label + "：state 深度相等");
    assert.deepEqual(warm.tags, cold.tags, label + "：啟動通知 tags 相同");
    assert.equal(warm.tags.length, 1, label + "：啟動只通知 1 次");
    assert.ok(warm.tags[0].includes("islandFeedback"), label + "：啟動 tags 含 islandFeedback（既有約定）");
    assert.deepEqual(warm.setCalls, cold.setCalls, label + "：setItem 次數與鍵相同");
    assert.deepEqual(warm.writes, cold.writes, label + "：寫出字串相同");
    assert.deepEqual(warm.result, cold.result, label + "：startup 結果相同");
    assert.deepEqual(warm.store.getStartup(), cold.store.getStartup(), label + "：getStartup 相同");
    assert.equal(warm.store.getWriteStatus(), cold.store.getWriteStatus(), label + "：writeStatus 相同");
    assert.equal(warm.store.getState().runtime.flashcard.islandFeedback, null, label + "：啟動回饋為 null");
  });
});

test("FE-114：island 模組不可用、預熱拋例外（islandsOf／feedbackOf）或模組缺函式 → init() 照常完成、不拋例外、結果與無預熱相同", () => {
  const variants = [
    ["不可用", () => ({ mod: null })],
    ["islandsOf 拋例外", () => countingIsland({ throwIn: "islandsOf" })],
    ["feedbackOf 拋例外", () => countingIsland({ throwIn: "feedbackOf" })],
    ["模組缺函式", () => ({ mod: {} })]
  ];
  BOOT_CASES.forEach(([label, mk]) => {
    const cold = bootWith(null, mk());
    variants.forEach(([vLabel, mkIsl]) => {
      const w = mkIsl();
      const name = label + "／" + vLabel;
      let b;
      assert.doesNotThrow(() => { b = bootWith(w.mod, mk(), w.phase); }, name);
      assert.equal(b.result.status, label, name);
      assert.deepEqual(b.store.getState(), cold.store.getState(), name + "：state");
      assert.deepEqual(b.tags, cold.tags, name + "：tags");
      assert.deepEqual(b.setCalls, cold.setCalls, name + "：setItem");
      assert.deepEqual(b.writes, cold.writes, name + "：寫出");
      if (w.calls) { assert.equal(w.calls.islandsOf, 1, name + "：有嘗試預熱"); }
    });
  });
});

test("FE-114：預熱後（含重新載入後第一次翻面）LF-6 序列結果與預熱失敗時相同，且符合既有期望", () => {
  /** 答對 W301（245，升階）、W302（246） */
  function seqLevel(b) {
    b.a.setTab("flashcards");
    const out = [];
    answer(b.store, W(301), true); out.push(fb(b.store));
    answer(b.store, W(302), true); out.push(fb(b.store));
    return out;
  }
  /** D = 10、X = 8：重新載入後第一次翻面 → 再 1 個字；STT → 靠岸；再翻面 → 維持 */
  function seqBoat(b) {
    b.a.setTab("flashcards");
    const out = [];
    flipToBack(b.store, W(500)); out.push(fb(b.store));
    sttScore(b.store, W(501)); out.push(fb(b.store));
    flipToBack(b.store, W(502)); out.push(fb(b.store));
    return out;
  }
  const dLevel = dataWith({ color: "green", mastered: range(1, 244), learned: range(2001, 2003) });
  const dBoat = dataWith({ color: "brown", learned: range(2001, 2008) });

  const w1 = countingIsland();
  const warmLevel = seqLevel(bootWith(w1.mod, fakeStorage({ [KEY]: recordOf(dLevel) }), w1.phase));
  const w2 = countingIsland({ throwIn: "islandsOf" });
  const coldLevel = seqLevel(bootWith(w2.mod, fakeStorage({ [KEY]: recordOf(dLevel) }), w2.phase));
  assert.deepEqual(warmLevel, coldLevel);
  assert.deepEqual(warmLevel, [
    { kind: "levelUp", island: "orange", text: TXT_ORANGE_PALM },
    { kind: "mastered", island: "orange", text: TXT_ORANGE_25 }
  ]);

  const w3 = countingIsland();
  const warmBoat = seqBoat(bootWith(w3.mod, fakeStorage({ [KEY]: recordOf(dBoat) }), w3.phase));
  const w4 = countingIsland({ throwIn: "feedbackOf" });
  const coldBoat = seqBoat(bootWith(w4.mod, fakeStorage({ [KEY]: recordOf(dBoat) }), w4.phase));
  assert.deepEqual(warmBoat, coldBoat);
  assert.deepEqual(warmBoat, [
    { kind: "sailing", island: null, text: TXT_SAILING_1 },
    { kind: "docked", island: null, text: TXT_DOCKED },
    { kind: "docked", island: null, text: TXT_DOCKED }
  ]);
  assert.equal(w3.calls.feedbackOf, 1 + 3, "預熱 1 次 + 3 次學習事件各 1 次（不在其他 action 另外預熱）");
});

test("FE-114（islandsOf 快取前提，§7.32.15）：store 的掌握變動一律產生新的 masteredWordKeys 陣列，不原地修改舊陣列", () => {
  const custom = { id: "c_zyzzyva01", word: "Zyzzyva", meaning: "南美象鼻蟲", phonetic: "", pos: "", collocation: "", example: "", academicContext: "", origin: "manual", templateId: null, createdAt: "2026-10-29T08:30:00.000Z" };
  const zKey = WK.wordKey("Zyzzyva");
  const { store, a } = makeStore(dataWith({ color: "green", mastered: range(1, 10).concat([zKey]), learned: range(2001, 2003), custom: [custom] }));

  // 答對新字 → 新陣列，舊陣列長度與內容不變
  const m0 = store.getState().data.masteredWordKeys;
  const snap0 = m0.slice();
  answer(store, W(300), true);
  const m1 = store.getState().data.masteredWordKeys;
  assert.notEqual(m1, m0, "答對新字產生新陣列");
  assert.deepEqual(m0, snap0, "舊陣列未被原地修改");
  assert.equal(m1.length, m0.length + 1);

  // 答錯、答對已掌握的字 → 掌握清單不變（同一參照：快取命中且結果仍正確）
  answer(store, W(301), false);
  assert.equal(store.getState().data.masteredWordKeys, m1, "答錯不動掌握清單");
  answer(store, W(300), true);
  assert.equal(store.getState().data.masteredWordKeys, m1, "答對已掌握字不動掌握清單");

  // 刪除已掌握的自訂單字 → 新陣列（filter），舊陣列不變
  const snap1 = m1.slice();
  assert.notEqual(a.deleteCustomWord(custom.id).ok, false);
  const m2 = store.getState().data.masteredWordKeys;
  assert.notEqual(m2, m1, "刪除自訂單字產生新陣列");
  assert.deepEqual(m1, snap1, "舊陣列未被原地修改");
  assert.equal(m2.includes(zKey), false);

  // store 快照與以新陣列（略過快取）重算的結果一致（快取不回傳舊結果）
  const fresh = ISL.islandsOf({
    builtin: CONTENT.builtin, builtinMap: CONTENT.builtinMap, nB: CONTENT.nB, nG: CONTENT.nG,
    masteredWordKeys: m2.slice(), effectiveColor: store.getState().data.goal.effectiveColor
  });
  assert.deepEqual(snapOf(store).islands, fresh);
});
