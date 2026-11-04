/*
 * part5flow.test.js — EMT.core.part5flow 單元測試（FE-72）
 * 依據：architecture.md v0.10 §4.10「EMT.core.part5flow」、§7.21.3、§10.7；
 *       契約 README §5.11 CR-1～CR-8、UO-1～UO-9、§5.3 RD-3 (c)、§6.2 IM-10 (2)、(4)
 * 涵蓋：AC-45-01～AC-45-03、AC-45-05、AC-45-07、AC-46-02～AC-46-09、AC-47-05、V-ST-19、V-ST-20、E-109～E-112
 */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const F = require("../core/part5flow.js");

/** 題庫 id：p5-001 … p5-<q> */
function ids(q) {
  const out = [];
  for (let i = 1; i <= q; i++) out.push("p5-" + String(i).padStart(3, "0"));
  return out;
}
const B200 = Object.freeze(ids(200));

/** Part5Progress（預設：第 1 題、未作答、本輪與累計 0） */
function p5(patch) {
  return Object.freeze(Object.assign({
    currentIndex: 0, lockedSelection: null, phase: "question",
    roundAnswered: 0, roundCorrect: 0, totalAnswered: 0, totalCorrect: 0
  }, patch || {}));
}

/** v0.14 store.nextPart5 的結果（對照用；不含寫入） */
function v014Next(p, q) {
  if (p.phase !== "question" || p.lockedSelection === null) return p;
  if (p.currentIndex >= q - 1) return Object.assign({}, p, { lockedSelection: null, phase: "summary" });
  return Object.assign({}, p, { currentIndex: p.currentIndex + 1, lockedSelection: null });
}
/** v0.14 store.restartPart5 的結果 */
function v014Restart(p) {
  return Object.assign({}, p, { currentIndex: 0, lockedSelection: null, phase: "question", roundAnswered: 0, roundCorrect: 0 });
}

// ── bankIdsOf ──

test("bankIdsOf：非陣列 → []；無合法 id 的題目 → null；順序與長度同題庫", function () {
  assert.deepEqual(F.bankIdsOf(null), []);
  assert.deepEqual(F.bankIdsOf({ length: 2 }), []);
  assert.deepEqual(F.bankIdsOf([{ id: "p5-001" }, { id: "" }, { id: "  " }, { id: 3 }, null, {}, { id: "p5-007" }]),
    ["p5-001", null, null, null, null, null, "p5-007"]);
});

// ── normalizeIds ──

test("normalizeIds（RD-3 (c)、IM-10 (2)）：非陣列 → []；去除非字串、空白、重複；題庫外 id 保留且順序不變", function () {
  [undefined, null, "p5-001", 5, {}, { 0: "p5-001", length: 1 }].forEach(function (v) {
    assert.deepEqual(F.normalizeIds(v), []);
  });
  const raw = Object.freeze(["p5-009", 1, "", "   ", null, "p5-999", "p5-009", "p5-002", { id: "x" }, "p5-999", "P5-002"]);
  assert.deepEqual(F.normalizeIds(raw), ["p5-009", "p5-999", "p5-002", "P5-002"]);
  const clean = ["p5-001"];
  assert.notEqual(F.normalizeIds(clean), clean, "回傳新陣列");
  assert.deepEqual(F.correctSet(raw), new Set(["p5-009", "p5-999", "p5-002", "P5-002"]));
});

// ── countCorrect、isCorrectAt、nextUnanswered ──

test("countCorrect：重複 id、不存在 id 不計；null 題目永遠未答對；bankIds 有重複 id 只計一次", function () {
  const set = F.correctSet(["p5-002", "p5-002", "p5-999", "p5-003"]);
  assert.equal(F.countCorrect(B200, set), 2, "AC-45-07：p5-999 不計");
  assert.equal(F.countCorrect(["p5-001", null, "p5-003"], F.correctSet(["p5-001", "p5-003"])), 2);
  assert.equal(F.countCorrect(["p5-001", "p5-001"], F.correctSet(["p5-001"])), 1);
  assert.equal(F.countCorrect([], set), 0);
  assert.equal(F.countCorrect(null, set), 0);
  assert.equal(F.countCorrect(B200, null), 0);
  assert.equal(F.isCorrectAt(["p5-001", null], F.correctSet(["p5-001", "null"]), 1), false);
  assert.equal(F.isCorrectAt(B200, set, 1), true);
  assert.equal(F.isCorrectAt(B200, set, 0), false);
  assert.equal(F.isCorrectAt(B200, set, 200), false);
  assert.equal(F.isCorrectAt(B200, set, -1), false);
});

test("nextUnanswered：從 max(from, 0) 起第一題未答對；無 → -1；null 題目算未答對", function () {
  const set = F.correctSet(["p5-001", "p5-002", "p5-003", "p5-005"]);
  assert.equal(F.nextUnanswered(B200, set, 0), 3);
  assert.equal(F.nextUnanswered(B200, set, -5), 3);
  assert.equal(F.nextUnanswered(B200, set, 4), 5);
  assert.equal(F.nextUnanswered(B200, set, 200), -1);
  assert.equal(F.nextUnanswered(B200, set, NaN), 3);
  const q3 = ["p5-001", "p5-002", "p5-003"];
  assert.equal(F.nextUnanswered(q3, F.correctSet(q3), 0), -1);
  assert.equal(F.nextUnanswered(["p5-001", null], F.correctSet(["p5-001"]), 0), 1);
  assert.equal(F.nextUnanswered([], set, 0), -1);
});

// ── viewKind（UO-3）──

test("viewKind 全部分支：Q = 0、開關關閉、K < Q、K = Q 且鎖定題、K = Q 且 summary、K = Q 且未鎖定", function () {
  const q3 = ["p5-001", "p5-002", "p5-003"];
  const all = F.correctSet(q3);
  const some = F.correctSet(["p5-001"]);
  assert.equal(F.viewKind(p5(), [], all, true), "empty");
  assert.equal(F.viewKind(p5({ phase: "summary" }), null, all, true), "empty");
  // 開關關閉：全部答對也照 phase
  assert.equal(F.viewKind(p5(), q3, all, false), "question");
  assert.equal(F.viewKind(p5({ phase: "summary" }), q3, all, false), "summary");
  // K < Q
  assert.equal(F.viewKind(p5(), q3, some, true), "question");
  assert.equal(F.viewKind(p5({ phase: "summary" }), q3, some, true), "summary");
  // K = Q：剛作答鎖定 → 仍為 question（AC-46-04 (b) 排除條件）
  assert.equal(F.viewKind(p5({ currentIndex: 2, lockedSelection: 1 }), q3, all, true), "question");
  // K = Q：summary → allCorrect（作答結束進入）
  assert.equal(F.viewKind(p5({ phase: "summary", roundAnswered: 1, roundCorrect: 1 }), q3, all, true), "allCorrect");
  // K = Q：未鎖定題目（開啟開關、重新載入）→ allCorrect
  assert.equal(F.viewKind(p5(), q3, all, true), "allCorrect");
  // only 非 true 一律視為關閉
  assert.equal(F.viewKind(p5(), q3, all, "true"), "question");
  // 含 null 題目時 K 最多為非 null 題數，不會 allCorrect
  assert.equal(F.viewKind(p5(), ["p5-001", null], F.correctSet(["p5-001"]), true), "question");
});

// ── normalizeOnly（UO-4）──

test("normalizeOnly AC-46-04 (a)：開關開啟、目前曾答對且未作答 → 其後第一題未答對", function () {
  const set = F.correctSet(["p5-010", "p5-011", "p5-013"]);
  const before = p5({ currentIndex: 9, roundAnswered: 3, roundCorrect: 2, totalAnswered: 9, totalCorrect: 5 });
  const r = F.normalizeOnly(before, B200, set, true);
  assert.equal(r.changed, true);
  assert.equal(r.part5.currentIndex, 11, "p5-012");
  assert.equal(r.part5.phase, "question");
  assert.equal(r.part5.lockedSelection, null);
  ["roundAnswered", "roundCorrect", "totalAnswered", "totalCorrect"].forEach(function (k) {
    assert.equal(r.part5[k], before[k], k + " 不變");
  });
  assert.equal(before.currentIndex, 9, "不修改傳入值");
});

test("normalizeOnly AC-46-04 (b)：已作答鎖定 → 不移動；按下一題才跳", function () {
  const set = F.correctSet(["p5-010", "p5-011"]);
  const locked = p5({ currentIndex: 9, lockedSelection: 2, roundAnswered: 1, roundCorrect: 1 });
  const r = F.normalizeOnly(locked, B200, set, true);
  assert.equal(r.changed, false);
  assert.equal(r.part5, locked);
  const n = F.next(locked, B200, set, true);
  assert.equal(n.part5.currentIndex, 11, "跳過 p5-011 到 p5-012");
});

test("normalizeOnly：其後已無未答對（K < Q）→ summary 且本輪計數不變；K = Q、開關關閉、summary、目前未答對 → 不動", function () {
  const q5 = ids(5);
  const set = F.correctSet(["p5-001", "p5-004", "p5-005"]);
  const before = p5({ currentIndex: 3, roundAnswered: 2, roundCorrect: 1 });
  const r = F.normalizeOnly(before, q5, set, true);
  assert.equal(r.changed, true);
  assert.deepEqual(r.part5, Object.assign({}, before, { phase: "summary" }));
  // K = Q
  const all = F.correctSet(q5);
  assert.equal(F.normalizeOnly(before, q5, all, true).changed, false);
  // 開關關閉
  assert.equal(F.normalizeOnly(before, q5, set, false).changed, false);
  // summary
  assert.equal(F.normalizeOnly(p5({ phase: "summary", currentIndex: 3 }), q5, set, true).changed, false);
  // 目前題目未答對
  assert.equal(F.normalizeOnly(p5({ currentIndex: 1 }), q5, set, true).changed, false);
  // 非物件
  assert.equal(F.normalizeOnly(null, q5, set, true).changed, false);
});

// ── recordAnswer（CR-2）──

test("recordAnswer AC-45-01：答對未曾答對 → 附加到末尾（新陣列）", function () {
  const before = Object.freeze(["p5-002"]);
  const r = F.recordAnswer(before, "p5-005", true);
  assert.equal(r.changed, true);
  assert.deepEqual(r.ids, ["p5-002", "p5-005"]);
  assert.deepEqual(before, ["p5-002"], "不修改傳入值");
  assert.equal(F.countCorrect(B200, F.correctSet(r.ids)), 2, "K + 1");
});

test("recordAnswer AC-45-02、AC-45-03：答錯、再答對、無合法 id → 原陣列不變", function () {
  const before = Object.freeze(["p5-005"]);
  [
    ["p5-006", false], ["p5-005", false], ["p5-005", true], [null, true], ["", true], ["  ", true], [5, true], ["p5-007", "true"]
  ].forEach(function (c) {
    const r = F.recordAnswer(before, c[0], c[1]);
    assert.equal(r.changed, false, JSON.stringify(c));
    assert.equal(r.ids, before);
  });
  assert.equal(F.recordAnswer(null, "p5-001", true).changed, false);
});

// ── next（開關關閉 = v0.14；開啟 = UO-5）──

test("next 開關關閉 AC-46-02：p5-001 作答後到 p5-002（不跳過曾答對）；最後一題 → summary；結果與 v0.14 相同", function () {
  const set = F.correctSet(["p5-002"]);
  const a = p5({ currentIndex: 0, lockedSelection: 1, roundAnswered: 1, roundCorrect: 0, totalAnswered: 1 });
  const r = F.next(a, B200, set, false);
  assert.equal(r.changed, true);
  assert.equal(r.part5.currentIndex, 1);
  assert.equal(r.part5.lockedSelection, null);
  assert.deepEqual(r.part5, v014Next(a, 200));
  const last = p5({ currentIndex: 199, lockedSelection: 0, roundAnswered: 200 });
  assert.deepEqual(F.next(last, B200, set, false).part5, v014Next(last, 200));
  assert.equal(F.next(last, B200, set, false).part5.phase, "summary");
});

test("next 前提不符（未作答、summary、非物件）→ 不變", function () {
  const set = F.correctSet([]);
  [p5(), p5({ phase: "summary", lockedSelection: null })].forEach(function (x) {
    [true, false].forEach(function (only) {
      const r = F.next(x, B200, set, only);
      assert.equal(r.changed, false);
      assert.equal(r.part5, x);
    });
  });
  assert.equal(F.next(undefined, B200, set, true).changed, false);
});

test("next 開關開啟 AC-46-03：p5-002、p5-003 曾答對 → 從 p5-001 跳到 p5-004；跳過不計入本輪", function () {
  const set = F.correctSet(["p5-002", "p5-003"]);
  const a = p5({ currentIndex: 0, lockedSelection: 2, roundAnswered: 1, roundCorrect: 1, totalAnswered: 1, totalCorrect: 1 });
  const r = F.next(a, B200, set, true);
  assert.equal(r.changed, true);
  assert.equal(r.part5.currentIndex, 3, "第 4 / 200 題");
  assert.equal(r.part5.lockedSelection, null);
  assert.equal(r.part5.phase, "question");
  assert.equal(r.part5.roundAnswered, 1);
  assert.equal(r.part5.totalAnswered, 1);
});

test("next 開關開啟 AC-46-05：其後已無未答對 → summary；restart → 第一題未答對", function () {
  const q5 = ids(5);
  const set = F.correctSet(["p5-001", "p5-003", "p5-004", "p5-005"]);
  const a = p5({ currentIndex: 1, lockedSelection: 0, roundAnswered: 1, roundCorrect: 1, totalAnswered: 7, totalCorrect: 4 });
  // 目前在 p5-002（未答對、已作答答錯），其後 p5-003～p5-005 皆曾答對、之前 p5-001 曾答對 → K < Q
  const r = F.next(a, q5, set, true);
  assert.equal(r.part5.phase, "summary");
  assert.equal(r.part5.lockedSelection, null);
  assert.equal(F.viewKind(r.part5, q5, set, true), "summary");
  const s = F.restart(r.part5, q5, set, true);
  assert.equal(s.changed, true);
  assert.deepEqual(s.part5, { currentIndex: 1, lockedSelection: null, phase: "question", roundAnswered: 0, roundCorrect: 0, totalAnswered: 7, totalCorrect: 4 });
});

test("AC-46-06：開關開啟只剩最後 1 題未答對，答對後 viewKind 鎖定時仍為 question、按下一題 → allCorrect", function () {
  const q5 = ids(5);
  let ids0 = ["p5-001", "p5-002", "p5-003", "p5-004"];
  let p = p5({ currentIndex: 4, lockedSelection: 1, roundAnswered: 1, roundCorrect: 1 });
  ids0 = F.recordAnswer(ids0, q5[4], true).ids;
  const set = F.correctSet(ids0);
  assert.equal(F.viewKind(p, q5, set, true), "question");
  p = F.next(p, q5, set, true).part5;
  assert.equal(p.phase, "summary");
  assert.equal(F.viewKind(p, q5, set, true), "allCorrect");
});

test("next AC-46-09：開關開啟在 p5-010 已作答，關閉開關後按下一題 → p5-011（不跳過）", function () {
  const set = F.correctSet(["p5-011"]);
  const a = p5({ currentIndex: 9, lockedSelection: 3, roundAnswered: 2 });
  const off = F.setOnly({ part5: a, ids: ["p5-011"], only: true }, B200, false);
  assert.equal(off.changed, true);
  assert.equal(off.only, false);
  assert.equal(off.part5, a, "UO-8：part5 不變");
  const r = F.next(off.part5, B200, set, off.only);
  assert.equal(r.part5.currentIndex, 10);
  assert.equal(F.isCorrectAt(B200, set, 10), true, "帶「✓ 曾答對」");
});

// ── restart（UO-6）──

test("restart 開關關閉：與 v0.14 相同（第 1 題、本輪歸 0、累計不變）；已是起始狀態 → changed false", function () {
  const set = F.correctSet(["p5-001"]);
  const s = p5({ phase: "summary", currentIndex: 199, roundAnswered: 200, roundCorrect: 150, totalAnswered: 300, totalCorrect: 200 });
  const r = F.restart(s, B200, set, false);
  assert.equal(r.changed, true);
  assert.deepEqual(r.part5, v014Restart(s));
  const fresh = p5({ totalAnswered: 3, totalCorrect: 1 });
  const r2 = F.restart(fresh, B200, set, false);
  assert.equal(r2.changed, false);
  assert.equal(r2.part5, fresh);
});

test("restart 開關開啟：currentIndex = next(0)；全部答對（K = Q）仍被觸發 → 0，不出現無限跳題", function () {
  const set = F.correctSet(["p5-001", "p5-002"]);
  const s = p5({ phase: "summary", currentIndex: 50, roundAnswered: 10, roundCorrect: 7, totalAnswered: 10, totalCorrect: 7 });
  const r = F.restart(s, B200, set, true);
  assert.equal(r.part5.currentIndex, 2);
  assert.equal(r.part5.totalAnswered, 10);
  assert.equal(r.part5.totalCorrect, 7);
  const q3 = ids(3);
  const all = F.correctSet(q3);
  const r2 = F.restart(s, q3, all, true);
  assert.equal(r2.part5.currentIndex, 0);
  assert.equal(F.viewKind(r2.part5, q3, all, true), "allCorrect");
  // 開啟且已在 next(0) 的起始狀態 → 不寫入
  const at2 = p5({ currentIndex: 2 });
  assert.equal(F.restart(at2, B200, set, true).changed, false);
});

// ── setOnly（UO-1、UO-8）──

test("setOnly：非布林或與原值相同 → changed false；關 → 開 套 UO-4；開 → 關 part5 不變；不改任何計數", function () {
  const p = p5({ currentIndex: 9, roundAnswered: 4, roundCorrect: 3, totalAnswered: 20, totalCorrect: 12 });
  const st = Object.freeze({ part5: p, ids: Object.freeze(["p5-010"]), only: false });
  ["true", 1, null, undefined, false].forEach(function (on) {
    const r = F.setOnly(st, B200, on);
    assert.equal(r.changed, false, String(on));
    assert.equal(r.part5, p);
    assert.equal(r.only, false);
  });
  const on = F.setOnly(st, B200, true);
  assert.equal(on.changed, true);
  assert.equal(on.only, true);
  assert.equal(on.part5.currentIndex, 10, "AC-46-04 (a)");
  ["roundAnswered", "roundCorrect", "totalAnswered", "totalCorrect"].forEach(function (k) {
    assert.equal(on.part5[k], p[k], k);
  });
  const off = F.setOnly({ part5: on.part5, ids: st.ids, only: true }, B200, false);
  assert.equal(off.changed, true);
  assert.equal(off.only, false);
  assert.equal(off.part5, on.part5);
  assert.equal(F.setOnly({ part5: p, ids: [], only: true }, B200, true).changed, false);
  assert.doesNotThrow(function () { F.setOnly(null, B200, true); });
});

// ── replayKeepRecords、clearAndRestart（UO-7 (a)、CR-6、FB-56）──

test("replayKeepRecords：第 1 題、本輪歸 0、累計不變、不修改傳入值", function () {
  const s = p5({ phase: "summary", currentIndex: 199, roundAnswered: 5, roundCorrect: 5, totalAnswered: 240, totalCorrect: 201 });
  const r = F.replayKeepRecords(s);
  assert.deepEqual(r, { currentIndex: 0, lockedSelection: null, phase: "question", roundAnswered: 0, roundCorrect: 0, totalAnswered: 240, totalCorrect: 201 });
  assert.notEqual(r, s);
  // AC-46-07：開關改為關閉後 p5-001 未作答、帶曾答對（K 仍為 Q）
  const set = F.correctSet(B200);
  assert.equal(F.viewKind(r, B200, set, false), "question");
  assert.equal(F.isCorrectAt(B200, set, 0), true);
});

test("clearAndRestart：ids = []、part5 同 replay、累計不變；開關仍開啟時第 1 題為 question", function () {
  const s = p5({ phase: "summary", currentIndex: 3, roundAnswered: 2, roundCorrect: 2, totalAnswered: 240, totalCorrect: 201 });
  const r = F.clearAndRestart(s);
  assert.deepEqual(r.ids, []);
  assert.deepEqual(r.part5, F.replayKeepRecords(s));
  assert.equal(F.countCorrect(B200, F.correctSet(r.ids)), 0);
  assert.equal(F.viewKind(r.part5, B200, F.correctSet(r.ids), true), "question");
});

// ── 例外與不變式 ──

test("對任何輸入不拋例外", function () {
  const odd = [undefined, null, 0, "x", [], {}, [null], new Set(), { phase: "question", lockedSelection: 1, currentIndex: "a" }];
  odd.forEach(function (a) {
    odd.forEach(function (b) {
      assert.doesNotThrow(function () {
        F.bankIdsOf(a); F.normalizeIds(a); F.correctSet(a); F.countCorrect(a, b); F.isCorrectAt(a, b, 0);
        F.nextUnanswered(a, b, 0); F.viewKind(a, b, b, true); F.normalizeOnly(a, b, b, true);
        F.recordAnswer(a, b, true); F.next(a, b, b, true); F.next(a, b, b, false);
        F.restart(a, b, b, true); F.setOnly(a, b, true); F.replayKeepRecords(a); F.clearAndRestart(a);
      });
    });
  });
});

/** 可重現的亂數（mulberry32） */
function rng(seed) {
  let t = seed >>> 0;
  return function () {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

test("隨機 1,000 組狀態不變式：currentIndex < Q、開關開啟時未鎖定題目畫面一律未答對、關閉時與 v0.14 相同、計數不變", function () {
  const rand = rng(20261104);
  for (let n = 0; n < 1000; n++) {
    const q = 1 + Math.floor(rand() * 30);
    const bank = ids(q).map(function (id) { return rand() < 0.03 ? null : id; });
    const correct = [];
    bank.forEach(function (id) { if (id !== null && rand() < rand()) correct.push(id); });
    if (rand() < 0.2) correct.push("p5-999");
    const set = F.correctSet(correct);
    const only = rand() < 0.6;
    const phase = rand() < 0.2 ? "summary" : "question";
    const base = p5({
      currentIndex: Math.floor(rand() * q),
      lockedSelection: phase === "question" && rand() < 0.5 ? Math.floor(rand() * 4) : null,
      phase: phase,
      roundAnswered: Math.floor(rand() * 10), roundCorrect: 0, totalAnswered: 50, totalCorrect: 20
    });
    const label = JSON.stringify({ n, q, only, base, correct });
    const counts = function (x) { return [x.totalAnswered, x.totalCorrect]; };

    // 啟動／開關開啟時的正規化
    const norm = F.normalizeOnly(base, bank, set, only).part5;
    const outs = [
      norm,
      F.next(norm, bank, set, only).part5,
      F.restart(norm, bank, set, only).part5,
      F.setOnly({ part5: base, ids: correct, only: !only }, bank, only).part5
    ];
    outs.forEach(function (o, i) {
      assert.ok(Number.isInteger(o.currentIndex) && o.currentIndex >= 0 && o.currentIndex < q, "currentIndex < Q #" + i + " " + label);
      assert.deepEqual(counts(o), counts(base), "累計不變 #" + i + " " + label);
      if (only && o.phase === "question" && o.lockedSelection === null && F.viewKind(o, bank, set, only) === "question") {
        assert.equal(F.isCorrectAt(bank, set, o.currentIndex), false, "UO-4 不變式 #" + i + " " + label);
      }
    });
    if (!only) {
      assert.deepEqual(F.next(base, bank, set, false).part5, v014Next(base, q), "關閉 next = v0.14 " + label);
      assert.deepEqual(F.restart(base, bank, set, false).part5, v014Restart(base), "關閉 restart = v0.14 " + label);
    }
    // 連續按「下一題」：每步皆可終止，最多 Q 步進入 summary
    let cur = norm;
    for (let step = 0; step <= q + 1 && cur.phase === "question"; step++) {
      cur = F.next(Object.assign({}, cur, { lockedSelection: 0 }), bank, set, only).part5;
      assert.ok(cur.currentIndex < q, label);
    }
    assert.equal(cur.phase, "summary", "有限步內結束 " + label);
  }
});

test("原始碼：無 require、無遞迴、nextUnanswered 單一迴圈、不碰 DOM 與儲存（LD-1、UO-9）", function () {
  const src = fs.readFileSync(path.join(__dirname, "..", "core", "part5flow.js"), "utf8");
  ["require", "document", "localStorage", "innerHTML", "window."].forEach(function (w) {
    assert.equal(src.indexOf(w), -1, w);
  });
  // 每個具名函式本體不呼叫自己
  const re = /function (\w+)\s*\(([^)]*)\)\s*\{/g;
  let m;
  while ((m = re.exec(src))) {
    const name = m[1];
    let depth = 1, i = re.lastIndex;
    while (depth > 0 && i < src.length) { if (src[i] === "{") depth++; else if (src[i] === "}") depth--; i++; }
    const body = src.slice(re.lastIndex, i);
    // 只看直接呼叫（排除 set.has( 這類成員呼叫）
    assert.equal(new RegExp("(^|[^.\\w])" + name + "\\s*\\(").test(body), false, name + " 不遞迴");
    if (name === "nextUnanswered") {
      assert.equal((body.match(/\b(for|while)\s*\(/g) || []).length, 1, "nextUnanswered 單一迴圈");
    }
  }
});
