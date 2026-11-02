/*
 * FE-04 單元測試：內建字庫整理、截取上限、單字集、content.load 容錯
 * 執行：node --test src/app/__tests__/vocab.test.js
 * src/data/ 尚無資料檔，全部以本檔產生的 fixture 測試（N_B 2,809、N_G 5,620 為契約 §4.2 紀錄值）。
 */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const C = require("../core/constants.js");
const V = require("../core/vocab.js");
const content = require("../core/content.js");

const NB = 2809;
const NG = 5620;

// ── fixture ──────────────────────────────────────────────────────

/** 產生 n 筆內建單字；rank ≤ nb 的 sources 含 NGSL */
function makeBuiltin(n, nb) {
  const list = [];
  for (let r = 1; r <= n; r++) {
    list.push({
      rank: r,
      word: "word" + String(r).padStart(4, "0"),
      phonetic: "/wɝd/",
      pos: ["n."],
      meaning: "釋義" + r,
      collocation: "c",
      academicContext: r > nb ? "a" : "",
      example: "e.",
      sources: r <= nb ? (r % 7 === 0 ? ["NGSL", "TSL"] : ["NGSL"]) : ["TSL"],
      phoneticSource: "ORIGINAL",
      meaningSource: "ECDICT",
      contentSource: "ORIGINAL",
    });
  }
  return list;
}

/** 固定種子洗牌（模擬分檔載入順序不同） */
function shuffled(arr, seed) {
  const a = arr.slice();
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) % 2147483648;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function custom(word, createdAt, extra) {
  return Object.assign({
    id: "c_" + word.toLowerCase().replace(/[^a-z0-9]/g, ""),
    word, meaning: "自訂" + word, phonetic: "", pos: "", collocation: "", example: "",
    academicContext: "", origin: "manual", templateId: null, createdAt,
  }, extra || {});
}

/** 暫時攔截 console.warn，回傳收到的訊息 */
function captureWarn(fn) {
  const orig = console.warn;
  const msgs = [];
  console.warn = (...args) => { msgs.push(args.join(" ")); };
  try { fn(); } finally { console.warn = orig; }
  return msgs;
}

const FULL = makeBuiltin(NG, NB);
let PREPARED;
captureWarn(() => { PREPARED = V.prepareBuiltin(shuffled(FULL, 42), { nB: NB, nG: NG }); });

// ── prepareBuiltin ───────────────────────────────────────────────

test("prepareBuiltin：亂序輸入依 rank 遞增排序，不改動原陣列", () => {
  const raw = shuffled(FULL, 7);
  const firstBefore = raw[0];
  const p = V.prepareBuiltin(raw, { nB: NB, nG: NG });
  assert.equal(raw[0], firstBefore, "原陣列不可被排序");
  assert.equal(p.sorted.length, NG);
  for (let i = 0; i < p.sorted.length; i++) assert.equal(p.sorted[i].rank, i + 1);
});

test("prepareBuiltin：nB = sources 含 NGSL 的筆數、nG = 筆數；Map 以 wordKey 對照", () => {
  assert.equal(PREPARED.nB, NB);
  assert.equal(PREPARED.nG, NG);
  assert.equal(PREPARED.map.size, NG);
  assert.equal(PREPARED.map.get("word0001").rank, 1);
  assert.deepEqual(PREPARED.warnings, []);
});

test("prepareBuiltin：nB 不寫死，依資料實際計算（V-VOC-12）", () => {
  const small = makeBuiltin(50, 20);
  const p = V.prepareBuiltin(small);
  assert.equal(p.nB, 20);
  assert.equal(p.nG, 50);
});

test("prepareBuiltin：與 VOCAB_MANIFEST 不符時只 console.warn，不拋例外、仍以實際值為準", () => {
  let p;
  const msgs = captureWarn(() => { p = V.prepareBuiltin(FULL, { nB: 2800, nG: 6000 }); });
  assert.equal(p.nB, NB);
  assert.equal(p.nG, NG);
  assert.equal(msgs.length, 2);
  assert.match(msgs[0], /nB/);
  assert.match(msgs[1], /nG/);
});

test("prepareBuiltin：與 manifest 相符或無 manifest 時不警告", () => {
  assert.deepEqual(captureWarn(() => V.prepareBuiltin(FULL, { nB: NB, nG: NG })), []);
  assert.deepEqual(captureWarn(() => V.prepareBuiltin(FULL)), []);
  assert.deepEqual(captureWarn(() => V.prepareBuiltin(FULL, null)), []);
});

test("prepareBuiltin：非陣列 → 空字庫（C-6）", () => {
  for (const raw of [undefined, null, 0, "x", {}, { length: 3 }]) {
    const p = V.prepareBuiltin(raw);
    assert.deepEqual(p.sorted, []);
    assert.equal(p.map.size, 0);
    assert.equal(p.nB, 0);
    assert.equal(p.nG, 0);
  }
});

test("prepareBuiltin：格式不符的元素略過並警告，不拋例外", () => {
  const raw = [null, 3, { rank: "1", word: "x" }, { rank: 2, word: "  " }, ...makeBuiltin(3, 3)];
  let p;
  const msgs = captureWarn(() => { p = V.prepareBuiltin(raw); });
  assert.equal(p.nG, 3);
  assert.equal(msgs.length, 1);
});

// ── limitOf ──────────────────────────────────────────────────────

test("limitOf：orange → N_O、brown → nB、green → nG；藍金比照綠", () => {
  assert.equal(V.limitOf("orange", NB, NG), C.N_O);
  assert.equal(V.limitOf("orange", NB, NG), 1000);
  assert.equal(V.limitOf("brown", NB, NG), NB);
  assert.equal(V.limitOf("green", NB, NG), NG);
  assert.equal(V.limitOf("blue", NB, NG), NG);
  assert.equal(V.limitOf("gold", NB, NG), NG);
});

// ── buildStudySet ────────────────────────────────────────────────

test("buildStudySet：橘、棕、綠截取數量依序為 1,000、N_B、N_G（AC-03-01～AC-03-03、AC-03-06）", () => {
  const counts = ["orange", "brown", "green"].map(
    (c) => V.buildStudySet(PREPARED.sorted, V.limitOf(c, PREPARED.nB, PREPARED.nG), []).length
  );
  assert.deepEqual(counts, [1000, NB, NG]);
  const orange = V.buildStudySet(PREPARED.sorted, 1000, []);
  assert.equal(orange[0].item.rank, 1);
  assert.equal(orange[999].item.rank, 1000);
  assert.ok(orange.every((c) => c.kind === "builtin" && c.wordKey === c.item.word));
  const green = V.buildStudySet(PREPARED.sorted, NG, []);
  assert.ok(green.every((c) => c.item.rank <= NG), "不含排名 > N_G 的單字");
});

test("buildStudySet：卡片結構符合契約 StudyCard", () => {
  const set = V.buildStudySet(PREPARED.sorted, 2, [custom("Latency", "2026-10-29T08:30:00.000Z")]);
  assert.deepEqual(Object.keys(set[0]).sort(), ["item", "kind", "wordKey"]);
  assert.equal(set[0].item, PREPARED.sorted[0], "item 直接參照內建資料");
  assert.deepEqual(set[2], { kind: "custom", wordKey: "latency", item: set[2].item });
});

test("buildStudySet：自訂字接在內建之後並依 createdAt 遞增（AC-03-01）", () => {
  const cv = [
    custom("Gamma", "2026-10-29T10:00:00.000Z"),
    custom("Alpha", "2026-10-29T08:00:00.000Z"),
    custom("Beta", "2026-10-29T09:00:00.000+08:00"), // = 01:00Z，最早
    custom("Delta", "2026-10-29T10:00:00.000Z"), // 與 Gamma 同時間，維持原順序
  ];
  const set = V.buildStudySet(PREPARED.sorted, 1000, cv);
  assert.equal(set.length, 1004);
  assert.deepEqual(set.slice(1000).map((c) => c.item.word), ["Beta", "Alpha", "Gamma", "Delta"]);
  assert.ok(set.slice(1000).every((c) => c.kind === "custom"));
  assert.equal(cv[0].word, "Gamma", "不改動 customVocab 原陣列順序");
});

test("buildStudySet：自訂字與本次截取的內建字重複時只放內建那張（V-ST-04）", () => {
  const cv = [custom("WORD0005", "2026-10-29T08:00:00.000Z"), custom("Latency", "2026-10-29T09:00:00.000Z")];
  const set = V.buildStudySet(PREPARED.sorted, 1000, cv);
  assert.equal(set.length, 1001);
  assert.equal(set.filter((c) => c.wordKey === "word0005").length, 1);
  assert.equal(set[4].kind, "builtin");
  assert.equal(set[1000].wordKey, "latency");
});

test("buildStudySet：與截取範圍外的內建字重複時保留自訂卡（SD-FB-03 現行設計）", () => {
  const cv = [custom("word3000", "2026-10-29T08:00:00.000Z")];
  const orange = V.buildStudySet(PREPARED.sorted, 1000, cv, PREPARED.map);
  assert.equal(orange.length, 1001);
  assert.deepEqual([orange[1000].kind, orange[1000].wordKey], ["custom", "word3000"]);
  const green = V.buildStudySet(PREPARED.sorted, NG, cv, PREPARED.map);
  assert.equal(green.length, NG);
  assert.equal(green.filter((c) => c.wordKey === "word3000").length, 1);
  assert.equal(green[2999].kind, "builtin");
  // 判斷集中在單一函式
  assert.equal(V.isCustomShadowedByBuiltin("word3000", new Set(["word0001"]), PREPARED.map), false);
  assert.equal(V.isCustomShadowedByBuiltin("word0001", new Set(["word0001"]), PREPARED.map), true);
});

test("buildStudySet：空字庫、空自訂、limit 異常皆不拋例外", () => {
  assert.deepEqual(V.buildStudySet([], 1000, []), []);
  assert.deepEqual(V.buildStudySet(undefined, NaN, undefined), []);
  assert.equal(V.buildStudySet(PREPARED.sorted, -5, null).length, 0);
  assert.equal(V.buildStudySet(PREPARED.sorted.slice(0, 10), 1000, []).length, 10, "字庫不足 limit 時取全部");
  const onlyCustom = V.buildStudySet([], 1000, [custom("Scalability", "2026-10-29T08:00:00.000Z")]);
  assert.deepEqual(onlyCustom.map((c) => c.wordKey), ["scalability"]);
});

test("buildStudySet：自訂清單內 wordKey 重複（資料異常）時只放一張", () => {
  const cv = [custom("Latency", "2026-10-29T08:00:00.000Z"), custom("latency ", "2026-10-29T09:00:00.000Z", { id: "c_x" })];
  const set = V.buildStudySet([], 0, cv);
  assert.equal(set.length, 1);
  assert.equal(set[0].item.word, "Latency");
});

test("buildStudySet 效能：5,620 筆內建 + 30 筆自訂 < 10 ms（AC-22-02）", () => {
  const cv = [];
  for (let i = 0; i < 30; i++) {
    cv.push(custom("customword" + i, new Date(Date.UTC(2026, 9, 29, 0, 0, 30 - i)).toISOString()));
  }
  V.buildStudySet(PREPARED.sorted, NG, cv, PREPARED.map); // 暖機
  const times = [];
  for (let k = 0; k < 20; k++) {
    const t0 = process.hrtime.bigint();
    const set = V.buildStudySet(PREPARED.sorted, NG, cv, PREPARED.map);
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    times.push(ms);
    assert.equal(set.length, NG + 30);
  }
  const max = Math.max(...times);
  console.log(`  buildStudySet 5,650 筆：最大 ${max.toFixed(3)} ms，平均 ${(times.reduce((a, b) => a + b, 0) / times.length).toFixed(3)} ms`);
  assert.ok(max < 10, `最大耗時 ${max} ms 應 < 10 ms`);
});

test("buildStudySet 效能：首次建置（無 wordKey 快取）也 < 10 ms", () => {
  // 單次量測易受機器負載干擾（曾偶發 10.89 ms），改為：先預熱 JIT，
  // 再以多份「全新、無 wordKey 快取」的資料各量一次，取中位數判定；門檻維持 10 ms。
  const base = V.prepareBuiltin(makeBuiltin(NG, NB)).sorted;
  const freshCopy = () => base.map((x) => Object.assign({}, x));
  // 預熱：讓 buildStudySet 與 wordKey 計算路徑先被最佳化（不列入量測）
  for (let k = 0; k < 5; k++) V.buildStudySet(freshCopy(), NG, []);
  const RUNS = 15;
  const times = [];
  for (let k = 0; k < RUNS; k++) {
    const fresh = freshCopy(); // 每次都是無快取的新物件，量到的仍是「首次建置」
    const t0 = process.hrtime.bigint();
    const set = V.buildStudySet(fresh, NG, []);
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    times.push(ms);
    assert.equal(set.length, NG);
  }
  const sorted = times.slice().sort((a, b) => a - b);
  const median = sorted[Math.floor(RUNS / 2)];
  console.log(`  buildStudySet 首次（含 wordKey 計算）：中位數 ${median.toFixed(3)} ms，最小 ${sorted[0].toFixed(3)} ms，最大 ${sorted[RUNS - 1].toFixed(3)} ms（${RUNS} 次）`);
  assert.ok(median < 10, `中位數耗時 ${median} ms 應 < 10 ms`);
});

// ── content.load ─────────────────────────────────────────────────

const EMPTY_SHAPE = {
  builtin: [], nB: 0, nG: 0, templates: [], part5: [], decoderSentences: [],
  strategies: [], phrases: [], sources: [], manifest: null, license: null,
};

function assertEmpty(snap) {
  for (const [k, v] of Object.entries(EMPTY_SHAPE)) assert.deepEqual(snap[k], v, k);
  assert.ok(snap.builtinMap instanceof Map);
  assert.equal(snap.builtinMap.size, 0);
}

test("content.load：window 無任何資料全域變數時不拋例外，回傳空集合（C-6）", () => {
  let snap;
  assert.doesNotThrow(() => { snap = content.load({}); });
  assertEmpty(snap);
  // getters 也是空集合
  assertEmpty(content);
});

test("content.load：型別不符一律回空陣列／null", () => {
  const win = {
    MASTER_VOCAB_DATABASE: { 0: 1 },
    DATA_SOURCE_REGISTRY: "x",
    VOCAB_MANIFEST: [],
    PROJECT_LICENSE: 5,
    DOMAIN_TEMPLATES: null,
    PART5_QUESTION_BANK: {},
    DECODER_SENTENCES: 1,
    READING_STRATEGIES: true,
    ACADEMIC_PHRASEBANK: "[]",
  };
  assertEmpty(content.load(win));
});

test("content.load：全域變數 getter 拋例外也不中斷", () => {
  const win = {};
  Object.defineProperty(win, "DOMAIN_TEMPLATES", { get() { throw new Error("boom"); } });
  win.PART5_QUESTION_BANK = [{ id: "p5-001" }];
  const snap = content.load(win);
  assert.deepEqual(snap.templates, []);
  assert.equal(snap.part5.length, 1);
});

test("content.load：讀取 9 個全域變數並整理字庫，getters 回傳相同結果", () => {
  const win = {
    MASTER_VOCAB_DATABASE: shuffled(makeBuiltin(30, 12), 3),
    DATA_SOURCE_REGISTRY: [{ code: "NGSL" }, null, { code: "ORIGINAL" }],
    VOCAB_MANIFEST: { dataVersion: "2026.11.05", nO: 1000, nB: 12, nG: 30, segments: [] },
    PROJECT_LICENSE: { copyrightHolder: "JimmyLin" },
    DOMAIN_TEMPLATES: [{ id: "cs", label: "資工", words: [], source: "ORIGINAL" }],
    PART5_QUESTION_BANK: [{ id: "p5-001" }, { id: "p5-002" }],
    DECODER_SENTENCES: [{ id: "ds-001" }],
    READING_STRATEGIES: [{ id: "abstract" }, { id: "methodology" }, { id: "literature_review" }],
    ACADEMIC_PHRASEBANK: [{ id: "ph-001" }],
  };
  let snap;
  const msgs = captureWarn(() => { snap = content.load(win); });
  assert.deepEqual(msgs, []);
  assert.equal(snap.builtin.length, 30);
  assert.deepEqual(snap.builtin.slice(0, 3).map((x) => x.rank), [1, 2, 3]);
  assert.equal(snap.nB, 12);
  assert.equal(snap.nG, 30);
  assert.equal(snap.builtinMap.get("word0007").rank, 7);
  assert.equal(snap.sources.length, 2, "排除非物件元素");
  assert.equal(snap.manifest.dataVersion, "2026.11.05");
  assert.equal(snap.license.copyrightHolder, "JimmyLin");
  assert.equal(snap.templates[0].id, "cs");
  assert.equal(snap.part5.length, 2);
  assert.equal(snap.decoderSentences.length, 1);
  assert.equal(snap.strategies.length, 3);
  assert.equal(snap.phrases.length, 1);
  for (const k of Object.keys(snap)) assert.equal(content[k], snap[k], "getter " + k);
  assert.throws(() => { "use strict"; content.nB = 99; }, TypeError, "getters 為唯讀");
});

test("瀏覽器載入：依建置順序（content.js 早於 vocab.js）執行後 EMT.content.load 正常", () => {
  const sandbox = {};
  sandbox.self = sandbox;
  sandbox.window = sandbox;
  sandbox.console = { warn() {}, error() {}, log() {} };
  vm.createContext(sandbox);
  // 模擬分檔：兩個 vocab 檔以 concat 串接（README §3.1），故意後段先載入
  const all = makeBuiltin(20, 8);
  vm.runInContext(
    "window.MASTER_VOCAB_DATABASE = (window.MASTER_VOCAB_DATABASE || []).concat(" + JSON.stringify(all.slice(10)) + ");",
    sandbox
  );
  vm.runInContext(
    "window.MASTER_VOCAB_DATABASE = (window.MASTER_VOCAB_DATABASE || []).concat(" + JSON.stringify(all.slice(0, 10)) + ");",
    sandbox
  );
  for (const f of ["constants.js", "wordkey.js", "content.js", "custom.js", "goal.js", "vocab.js"]) {
    const src = fs.readFileSync(path.join(__dirname, "..", "core", f), "utf8");
    vm.runInContext(src, sandbox, { filename: f });
  }
  const EMT = sandbox.EMT;
  assert.equal(typeof EMT.content.load, "function");
  assert.equal(typeof EMT.core.vocab.buildStudySet, "function");
  assert.equal(typeof EMT.core.custom.indexAfterDelete, "function");
  const snap = EMT.content.load();
  assert.equal(snap.nG, 20);
  assert.equal(snap.nB, 8);
  assert.equal(EMT.content.builtin[0].rank, 1);
  assert.equal(EMT.content.templates.length, 0);
  assert.equal(EMT.core.vocab.buildStudySet(EMT.content.builtin, EMT.core.vocab.limitOf("brown", snap.nB, snap.nG), []).length, 8);
});

test("瀏覽器載入：完全沒有資料檔時 EMT.content.load 不拋例外", () => {
  const sandbox = {};
  sandbox.self = sandbox;
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const f of ["constants.js", "wordkey.js", "content.js", "vocab.js"]) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "core", f), "utf8"), sandbox, { filename: f });
  }
  let snap;
  assert.doesNotThrow(() => { snap = sandbox.EMT.content.load(); });
  // 沙箱物件屬另一個 realm，改以 JSON 與長度比對
  for (const k of ["builtin", "templates", "part5", "decoderSentences", "strategies", "phrases", "sources"]) {
    assert.equal(snap[k].length, 0, k);
  }
  assert.equal(snap.builtinMap.size, 0);
  assert.equal(snap.nB, 0);
  assert.equal(snap.nG, 0);
  assert.equal(snap.manifest, null);
  assert.equal(snap.license, null);
});
