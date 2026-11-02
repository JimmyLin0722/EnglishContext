/*
 * FE-04 單元測試：自訂單字驗證、重複判斷、範本注入、建立自訂單字、刪除後索引
 * 執行：node --test src/app/__tests__/custom.test.js
 * src/data/ 尚無資料檔，範本與字庫皆為本檔 fixture（字形依契約範例：latency、Scalability、Monetization…）。
 */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const V = require("../core/vocab.js");
const U = require("../core/custom.js");

/** 契約 CustomVocabItem.id 格式 */
const ID_PATTERN = /^c_[A-Za-z0-9_-]{1,64}$/;

function builtinItem(rank, word, sources) {
  return {
    rank, word, phonetic: "/x/", pos: ["n."], meaning: "釋義" + rank, collocation: "c",
    academicContext: "", example: "e.", sources: sources || ["NGSL"],
    phoneticSource: "ORIGINAL", meaningSource: "ECDICT", contentSource: "ORIGINAL",
  };
}

const BUILTIN = V.prepareBuiltin([
  builtinItem(1, "the"), builtinItem(2, "address"), builtinItem(3, "synergy", ["BSL"]), builtinItem(4, "comply with"),
]);

function tw(word) {
  return {
    word, meaning: word + " 的釋義", phonetic: "/x/", pos: "n. 名詞", collocation: word + " c",
    example: word + " example.", academicContext: word + " context.",
  };
}

const CS = {
  id: "cs", label: "資工", source: "ORIGINAL",
  words: ["Latency", "Scalability", "Throughput", "Concurrency", "Idempotent",
    "Serialization", "Middleware", "Containerization", "Virtualization", "Sharding"].map(tw),
};

function customOf(word, extra) {
  return Object.assign({
    id: "c_" + word.toLowerCase().replace(/[^a-z0-9]/g, ""), word, meaning: "自訂", phonetic: "", pos: "",
    collocation: "", example: "", academicContext: "", origin: "manual", templateId: null,
    createdAt: "2026-10-29T08:30:00.000Z",
  }, extra || {});
}

// ── validateCustomFields ─────────────────────────────────────────

test("validateCustomFields：必填英文單字、中文釋義，trim 後為空即錯（AC-04-03）", () => {
  let r = U.validateCustomFields({ word: "   ", meaning: "\t\n" });
  assert.equal(r.ok, false);
  assert.deepEqual(r.fieldErrors, { word: U.ERROR_REQUIRED, meaning: U.ERROR_REQUIRED });
  r = U.validateCustomFields({ word: "Latency", meaning: "" });
  assert.deepEqual(r.fieldErrors, { meaning: "required" });
  r = U.validateCustomFields({ word: "", meaning: "延遲" });
  assert.deepEqual(r.fieldErrors, { word: "required" });
  r = U.validateCustomFields(undefined);
  assert.equal(r.ok, false);
  r = U.validateCustomFields({ word: 123, meaning: null });
  assert.equal(r.ok, false);
});

test("validateCustomFields：通過時 values 已 trim，選填欄位未填為空字串（AC-04-01）", () => {
  const r = U.validateCustomFields({ word: "  Monetization ", meaning: " 營利化；變現 ", pos: " n. " });
  assert.equal(r.ok, true);
  assert.deepEqual(r.fieldErrors, {});
  assert.deepEqual(r.values, {
    word: "Monetization", meaning: "營利化；變現", phonetic: "", pos: "n.", collocation: "", example: "",
  });
});

// ── isDuplicate ──────────────────────────────────────────────────

test("isDuplicate：Latency 對自訂清單的 latency 判為重複（AC-04-06）", () => {
  const cv = [customOf("latency")];
  assert.equal(U.isDuplicate("Latency", BUILTIN.map, cv), true);
  assert.equal(U.isDuplicate("  LATENCY  ", BUILTIN.map, cv), true);
  assert.equal(U.isDuplicate("Latency", BUILTIN.map, []), false);
});

test("isDuplicate：對內建字庫的 latency 判為重複，且不限目前色級範圍", () => {
  const map = V.prepareBuiltin([builtinItem(1, "the"), builtinItem(5000, "latency", ["TSL"])]).map;
  assert.equal(U.isDuplicate("Latency", map, []), true);
  assert.equal(U.isDuplicate("Synergy", BUILTIN.map, []), true);
  assert.equal(U.isDuplicate("Comply   With", BUILTIN.map, []), true, "多個空白視同一個（C-2）");
  assert.equal(U.isDuplicate("Monetization", BUILTIN.map, [customOf("latency")]), false);
});

test("isDuplicate：資料缺漏時不拋例外", () => {
  assert.equal(U.isDuplicate("x", null, undefined), false);
  assert.equal(U.isDuplicate("", BUILTIN.map, []), false);
  assert.equal(U.isDuplicate("x", new Map(), [null, { word: "X" }]), true);
});

// ── planTemplateInjection ────────────────────────────────────────

test("planTemplateInjection：自訂為空時注入範本 10 字（AC-05-02）", () => {
  const p = U.planTemplateInjection(CS, BUILTIN.map, []);
  assert.equal(p.toAdd.length, 10);
  assert.equal(p.skippedCount, 0);
  assert.deepEqual(p.toAdd.slice(0, 2).map((w) => w.word), ["Latency", "Scalability"]);
});

test("planTemplateInjection：注入兩次，第二次 toAdd 為空（AC-05-04）", () => {
  const first = U.buildTemplateItems(CS, BUILTIN.map, [], Date.UTC(2026, 9, 29), () => 0.5);
  assert.equal(first.items.length, 10);
  const cv = first.items;
  const second = U.planTemplateInjection(CS, BUILTIN.map, cv);
  assert.deepEqual(second.toAdd, []);
  assert.equal(second.skippedCount, 10);
});

test("planTemplateInjection：已存在於自訂（大小寫不同）或內建者略過，N = 尚未存在的字數", () => {
  const tpl = { id: "business", label: "商管", source: "ORIGINAL",
    words: [tw("Monetization"), tw("Synergy"), tw("Address"), tw("Churn")] };
  const p = U.planTemplateInjection(tpl, BUILTIN.map, [customOf("CHURN")]);
  assert.deepEqual(p.toAdd.map((w) => w.word), ["Monetization"]);
  assert.equal(p.skippedCount, 3);
});

test("planTemplateInjection：範本內自身重複、缺必填欄位、資料缺漏皆不拋例外", () => {
  const tpl = { id: "biostat", words: [tw("Heterogeneous"), tw("heterogeneous"), null, { word: "", meaning: "x" }, { word: "Cohort", meaning: " " }] };
  const p = U.planTemplateInjection(tpl, null, null);
  assert.deepEqual(p.toAdd.map((w) => w.word), ["Heterogeneous"]);
  assert.equal(p.skippedCount, 4);
  assert.deepEqual(U.planTemplateInjection(undefined, BUILTIN.map, []), { toAdd: [], skippedCount: 0 });
  assert.deepEqual(U.planTemplateInjection({ id: "cs" }, BUILTIN.map, []), { toAdd: [], skippedCount: 0 });
});

// ── makeCustomItem ───────────────────────────────────────────────

test("makeCustomItem：id = c_ + base36 時間 + _ + 4 位亂數，符合契約格式", () => {
  const now = Date.UTC(2026, 9, 29, 8, 30, 0);
  const seq = [0, 0.5, 0.999999, 0.1];
  let k = 0;
  const item = U.makeCustomItem({ word: "Monetization", meaning: "營利化；變現" }, "manual", null, now, () => seq[k++]);
  assert.equal(item.id, "c_" + now.toString(36) + "_0iz3");
  assert.match(item.id, ID_PATTERN);
  assert.match(item.id, /^c_[0-9a-z]+_[0-9a-z]{4}$/);
  assert.equal(item.createdAt, "2026-10-29T08:30:00.000Z");
});

test("makeCustomItem：manual 的欄位、trim 與選填空字串（契約範例）", () => {
  const item = U.makeCustomItem(
    { word: "  Monetization  ", meaning: " 營利化；變現 ", academicContext: "不應寫入" },
    "manual", null, new Date("2026-10-29T08:30:00.000Z"), () => 0
  );
  assert.deepEqual(Object.assign({}, item, { id: "X" }), {
    id: "X", word: "Monetization", meaning: "營利化；變現", phonetic: "", pos: "", collocation: "",
    example: "", academicContext: "", origin: "manual", templateId: null, createdAt: "2026-10-29T08:30:00.000Z",
  });
  assert.deepEqual(Object.keys(item), ["id", "word", "meaning", "phonetic", "pos", "collocation",
    "example", "academicContext", "origin", "templateId", "createdAt"]);
  assert.ok(Object.values(item).every((v) => v !== undefined));
});

test("makeCustomItem：使用者輸入原文保存（不在資料層跳脫，呈現時以 textContent，AC-04-04）", () => {
  const xss = "<img src=x onerror=alert(1)>";
  const item = U.makeCustomItem({ word: xss, meaning: xss, example: xss }, "manual", null, 0, () => 0);
  assert.equal(item.word, xss);
  assert.equal(item.meaning, xss);
  assert.equal(item.example, xss);
});

test("makeCustomItem：template 帶入 academicContext 與 templateId", () => {
  const item = U.makeCustomItem(tw("Latency"), "template", "cs", 1000, () => 0.3);
  assert.equal(item.origin, "template");
  assert.equal(item.templateId, "cs");
  assert.equal(item.academicContext, "Latency context.");
  assert.equal(item.phonetic, "/x/");
  assert.equal(item.pos, "n. 名詞");
});

test("makeCustomItem：origin／templateId 不合法拋 TypeError", () => {
  assert.throws(() => U.makeCustomItem({ word: "a", meaning: "b" }, "import", null), TypeError);
  assert.throws(() => U.makeCustomItem({ word: "a", meaning: "b" }, "template", null), TypeError);
  assert.throws(() => U.makeCustomItem({ word: "a", meaning: "b" }, "template", "math"), TypeError);
});

test("makeCustomItem：id 與 takenIds 重複時重抽，亂數固定時仍保證不重複", () => {
  const now = 1000;
  const a = U.makeCustomItem({ word: "a", meaning: "b" }, "manual", null, now, () => 0);
  const b = U.makeCustomItem({ word: "c", meaning: "d" }, "manual", null, now, () => 0, [a.id]);
  assert.notEqual(a.id, b.id);
  assert.match(b.id, ID_PATTERN);
  const c = U.makeCustomItem({ word: "e", meaning: "f" }, "manual", null, now, () => 0, new Set([a.id, b.id]));
  assert.ok(![a.id, b.id].includes(c.id));
  assert.match(c.id, ID_PATTERN);
});

test("makeCustomItem：預設使用目前時間與 Math.random", () => {
  const before = Date.now();
  const item = U.makeCustomItem({ word: "a", meaning: "b" }, "manual", null);
  const t = Date.parse(item.createdAt);
  assert.ok(t >= before && t <= Date.now());
  assert.match(item.id, /^c_[0-9a-z]+_[0-9a-z]{4}$/);
});

test("buildTemplateItems：createdAt 依範本順序遞增，id 不重複，加入單字集後順序同範本", () => {
  const now = Date.UTC(2026, 9, 29, 8, 30, 0);
  const r = U.buildTemplateItems(CS, BUILTIN.map, [customOf("Sharding")], now, () => 0);
  assert.equal(r.items.length, 9);
  assert.equal(r.skippedCount, 1);
  assert.equal(new Set(r.items.map((x) => x.id)).size, 9);
  assert.ok(r.items.every((x) => x.origin === "template" && x.templateId === "cs" && ID_PATTERN.test(x.id)));
  for (let i = 1; i < r.items.length; i++) {
    assert.ok(Date.parse(r.items[i].createdAt) > Date.parse(r.items[i - 1].createdAt));
  }
  const set = V.buildStudySet(BUILTIN.sorted, 4, r.items.slice().reverse());
  assert.deepEqual(set.slice(4).map((c) => c.item.word), CS.words.slice(0, 9).map((w) => w.word));
});

// ── indexAfterDelete（AC-04-08、E-24）────────────────────────────

/** 建單字集：內建 3 張 + 自訂 X、Y、Z */
function studySet() {
  return V.buildStudySet(BUILTIN.sorted, 3, [
    customOf("X", { createdAt: "2026-10-29T01:00:00.000Z" }),
    customOf("Y", { createdAt: "2026-10-29T02:00:00.000Z" }),
    customOf("Z", { createdAt: "2026-10-29T03:00:00.000Z" }),
  ]);
}

test("indexAfterDelete：刪除目前卡 → 顯示原本的下一張（索引不變）", () => {
  const set = studySet(); // the, address, synergy, x, y, z
  assert.equal(set.length, 6);
  const i = U.indexAfterDelete(set, 3, "x");
  assert.equal(i, 3);
  const after = set.filter((c) => c.wordKey !== "x");
  assert.equal(after[i].wordKey, "y", "原本的下一張");
});

test("indexAfterDelete：刪除目前卡之前的卡 → 索引 − 1，仍顯示同一張", () => {
  const set = studySet();
  const i = U.indexAfterDelete(set, 5, "x");
  assert.equal(i, 4);
  assert.equal(set.filter((c) => c.wordKey !== "x")[i].wordKey, "z");
});

test("indexAfterDelete：刪除目前卡之後的卡 → 索引不變", () => {
  const set = studySet();
  assert.equal(U.indexAfterDelete(set, 1, "z"), 1);
});

test("indexAfterDelete：刪除最後一張（且為目前卡）→ 顯示前一張", () => {
  const set = studySet();
  const i = U.indexAfterDelete(set, 5, "z");
  assert.equal(i, 4);
  assert.equal(set.filter((c) => c.wordKey !== "z")[i].wordKey, "y");
});

test("indexAfterDelete：刪到空 → 0（顯示空狀態）", () => {
  let set = V.buildStudySet([], 0, [customOf("Only")]);
  assert.equal(U.indexAfterDelete(set, 0, "only"), 0);
  // 連續刪除直到為空
  set = V.buildStudySet([], 0, [customOf("A", { createdAt: "2026-10-29T01:00:00.000Z" }), customOf("B", { createdAt: "2026-10-29T02:00:00.000Z" })]);
  let idx = 1;
  idx = U.indexAfterDelete(set, idx, "b");
  assert.equal(idx, 0);
  set = set.filter((c) => c.wordKey !== "b");
  idx = U.indexAfterDelete(set, idx, "a");
  assert.equal(idx, 0);
  assert.equal(U.indexAfterDelete([], 3, "a"), 0);
});

test("indexAfterDelete：被刪字不在單字集（被內建卡取代）時單字集不變，索引夾回有效範圍", () => {
  const set = studySet();
  assert.equal(U.indexAfterDelete(set, 2, "synergy"), 2, "synergy 為內建卡，不受刪除自訂影響");
  assert.equal(U.indexAfterDelete(set, 9, "nope"), 5);
  assert.equal(U.indexAfterDelete(set, -1, "nope"), 0);
});
