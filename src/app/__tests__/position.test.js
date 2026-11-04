/*
 * position.test.js — EMT.core.position 單元測試（FE-71）
 * 依據：architecture.md v0.10 §4.10、§7.21.2、§10.7；契約 README §5.10 FP-1、FP-2、§5.3 RD-3 (d)、§6.2 IM-10 (3)
 * 涵蓋：AC-44-01、AC-44-04、AC-44-05、AC-44-06、AC-44-07、AC-47-05、E-104～E-107、V-ST-18 (b)
 */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const P = require("../core/position.js");
const wordKey = require("../core/wordkey.js").wordKey;

/** 以單字建立單字集（StudyCard 只需 wordKey 與 word） */
function setOf(words) {
  return words.map(function (w) { return { word: w, wordKey: wordKey(w) }; });
}

/** 深度凍結，用來證明函式不修改傳入值（修改即拋例外） */
function freeze(o) {
  if (o && typeof o === "object") {
    Object.getOwnPropertyNames(o).forEach(function (k) { freeze(o[k]); });
    Object.freeze(o);
  }
  return o;
}

const BASE = ["ability", "account", "budget", "career", "deadline"];

// ── isShape ──

test("isShape：null 與合法物件為 true", function () {
  assert.equal(P.isShape(null), true);
  assert.equal(P.isShape({ wordKey: "a", ordinal: 1 }), true);
  assert.equal(P.isShape({ ordinal: 4000, wordKey: "" }), true, "空字串 wordKey 仍屬 shape（正規化時才判為 null）");
  assert.equal(P.isShape({ wordKey: "  Pay  Off ", ordinal: 3 }), true);
  const nullProto = Object.create(null);
  nullProto.wordKey = "a"; nullProto.ordinal = 2;
  assert.equal(P.isShape(nullProto), true);
});

test("isShape：錯誤 shape 一律為 false", function () {
  const bad = [
    undefined, 0, 1, "a", true, [], ["a", 1], {},
    { wordKey: "a" }, { ordinal: 1 },
    { wordKey: "a", ordinal: 1, extra: 0 },
    { wordKey: "a", ordinal: 0 }, { wordKey: "a", ordinal: -1 }, { wordKey: "a", ordinal: 1.5 },
    { wordKey: "a", ordinal: "10" }, { wordKey: "a", ordinal: NaN }, { wordKey: "a", ordinal: Infinity },
    { wordKey: 1, ordinal: 1 }, { wordKey: null, ordinal: 1 },
    new Date(), function () {}
  ];
  bad.forEach(function (v, i) { assert.equal(P.isShape(v), false, "案例 " + i); });
});

// ── normalize ──

test("normalize：wordKey 依 C-2 正規化（大小寫、前後與連續空白），回傳新物件且不改傳入值", function () {
  const src = freeze({ wordKey: "  Pay   Off ", ordinal: 7 });
  const r = P.normalize(src);
  assert.deepEqual(r, { wordKey: "pay off", ordinal: 7 });
  assert.notEqual(r, src);
  const already = { wordKey: "budget", ordinal: 3 };
  const r2 = P.normalize(already);
  assert.deepEqual(r2, already);
  assert.notEqual(r2, already, "即使已正規化也回傳新物件");
});

test("normalize：null、空白 wordKey、非 shape → null", function () {
  assert.equal(P.normalize(null), null);
  assert.equal(P.normalize(undefined), null);
  assert.equal(P.normalize({ wordKey: "", ordinal: 1 }), null);
  assert.equal(P.normalize({ wordKey: "   \t ", ordinal: 1 }), null);
  assert.equal(P.normalize([]), null);
  assert.equal(P.normalize({ wordKey: "a", ordinal: 0 }), null);
  assert.equal(P.normalize({ wordKey: 5, ordinal: 1 }), null);
  assert.equal(P.normalize({ wordKey: "a", ordinal: 1, x: 1 }), null);
  assert.equal(P.normalize("budget"), null);
});

// ── fromIndex ──

test("fromIndex：範圍內 → { wordKey, ordinal: index + 1 }；越界、非整數、卡片無 wordKey → null", function () {
  const set = freeze(setOf(BASE));
  assert.deepEqual(P.fromIndex(set, 0), { wordKey: "ability", ordinal: 1 });
  assert.deepEqual(P.fromIndex(set, 4), { wordKey: "deadline", ordinal: 5 });
  assert.equal(P.fromIndex(set, 5), null);
  assert.equal(P.fromIndex(set, -1), null);
  assert.equal(P.fromIndex(set, 1.5), null);
  assert.equal(P.fromIndex(set, "1"), null);
  assert.equal(P.fromIndex([], 0), null);
  assert.equal(P.fromIndex(null, 0), null);
  assert.equal(P.fromIndex([{ word: "x" }], 0), null);
  assert.equal(P.fromIndex([{ word: "x", wordKey: "" }], 0), null);
  assert.equal(P.fromIndex([null], 0), null);
});

// ── resolve 四種情況 ──

test("resolve (1) N = 0 → kind empty、index 0、position 為傳入值原物件（===）", function () {
  const rec = freeze({ wordKey: "budget", ordinal: 3 });
  const r = P.resolve(rec, []);
  assert.equal(r.kind, "empty");
  assert.equal(r.index, 0);
  assert.equal(r.position, rec);
  const bad = freeze({ weird: true });
  assert.equal(P.resolve(bad, []).position, bad, "錯誤 shape 也原樣保留（紀錄不動）");
  assert.equal(P.resolve(null, []).position, null);
  assert.equal(P.resolve(rec, null).kind, "empty", "單字集非陣列視為空");
});

test("resolve (2) null 或錯誤 shape → kind none、第 1 張", function () {
  const set = freeze(setOf(BASE));
  [null, undefined, { wordKey: "", ordinal: 2 }, { wordKey: "a", ordinal: 0 }, [1, 2], "budget"].forEach(function (v) {
    const r = P.resolve(v, set);
    assert.equal(r.kind, "none");
    assert.equal(r.index, 0);
    assert.deepEqual(r.position, { wordKey: "ability", ordinal: 1 });
  });
});

test("resolve (3) 以 wordKey 找到 → kind found（含紀錄 wordKey 未正規化、ordinal 不符）", function () {
  const set = freeze(setOf(BASE));
  const r = P.resolve(freeze({ wordKey: "career", ordinal: 4 }), set);
  assert.deepEqual(r, { index: 3, position: { wordKey: "career", ordinal: 4 }, kind: "found" });
  const r2 = P.resolve({ wordKey: "  CAREER ", ordinal: 1 }, set);
  assert.deepEqual(r2, { index: 3, position: { wordKey: "career", ordinal: 4 }, kind: "found" });
});

test("resolve (4) 找不到 → kind fallback、index = min(ordinal, N) − 1", function () {
  const set = freeze(setOf(BASE));
  assert.deepEqual(P.resolve({ wordKey: "zzz", ordinal: 2 }, set),
    { index: 1, position: { wordKey: "account", ordinal: 2 }, kind: "fallback" });
  assert.deepEqual(P.resolve({ wordKey: "zzz", ordinal: 99 }, set),
    { index: 4, position: { wordKey: "deadline", ordinal: 5 }, kind: "fallback" });
});

test("AC-44-04：刪除前面的自訂單字後序號變小、再新增後 N 變大，仍以字找回同一張", function () {
  // 停在第 4 張自訂單字 "Latency"
  const before = setOf(BASE.concat(["Monetization", "Throughput", "Latency"]));
  const pos = P.fromIndex(before, 7);
  assert.deepEqual(pos, { wordKey: "latency", ordinal: 8 });
  // 刪除前面的 Monetization：Latency 序號 8 → 7
  const afterDelete = setOf(BASE.concat(["Throughput", "Latency"]));
  const r1 = P.resolve(pos, afterDelete);
  assert.equal(r1.kind, "found");
  assert.equal(r1.index, 6);
  assert.deepEqual(r1.position, { wordKey: "latency", ordinal: 7 });
  // 再新增 2 個：N 變大，仍是 Latency
  const afterAdd = setOf(BASE.concat(["Throughput", "Latency", "Middleware", "Concurrency"]));
  const r2 = P.resolve(r1.position, afterAdd);
  assert.equal(r2.kind, "found");
  assert.equal(afterAdd[r2.index].word, "Latency");
});

test("AC-44-05 (a)：刪除目前卡片 → 中間顯示原本的下一張、最後一張顯示前一張（同 AC-04-08）", function () {
  const words = BASE.concat(["Monetization", "Throughput", "Latency"]);
  const set = setOf(words);
  // 刪除中間（第 7 張 Throughput）
  const pos = P.fromIndex(set, 6);
  const afterMid = setOf(words.filter(function (w) { return w !== "Throughput"; }));
  const r = P.resolve(pos, afterMid);
  assert.equal(r.kind, "fallback");
  assert.equal(afterMid[r.index].word, "Latency", "原本的下一張");
  // 刪除最後一張（第 8 張 Latency）
  const posLast = P.fromIndex(set, 7);
  const afterLast = setOf(words.filter(function (w) { return w !== "Latency"; }));
  const r2 = P.resolve(posLast, afterLast);
  assert.equal(r2.kind, "fallback");
  assert.equal(afterLast[r2.index].word, "Throughput", "前一張");
  assert.equal(r2.index, afterLast.length - 1);
});

test("AC-44-05 (b)(c)：字不在單字集時 i ≤ N → 第 i 張；i > N → 第 N 張", function () {
  const set = setOf(BASE);
  for (let i = 1; i <= 5; i++) {
    const r = P.resolve({ wordKey: "gone", ordinal: i }, set);
    assert.equal(r.index, i - 1, "i = " + i);
    assert.equal(r.position.ordinal, i);
  }
  [6, 50, 4000].forEach(function (i) {
    const r = P.resolve({ wordKey: "gone", ordinal: i }, set);
    assert.equal(r.index, 4, "i = " + i);
    assert.deepEqual(r.position, { wordKey: "deadline", ordinal: 5 });
  });
});

test("AC-44-07：單字集為空 → 空狀態、紀錄不動；之後單字集恢復仍可依紀錄找回", function () {
  const rec = { wordKey: "monetization", ordinal: 6 };
  const r = P.resolve(rec, []);
  assert.equal(r.kind, "empty");
  assert.equal(r.position, rec);
  const r2 = P.resolve(r.position, setOf(["Monetization"]));
  assert.equal(r2.kind, "found");
  assert.equal(r2.index, 0);
});

test("resolve 卡片無 wordKey 時 position 為 null、仍不拋例外", function () {
  const set = [{ word: "x" }, null, { word: "y", wordKey: "y" }];
  const r = P.resolve(null, set);
  assert.equal(r.kind, "none");
  assert.equal(r.position, null);
  const r2 = P.resolve({ wordKey: "y", ordinal: 1 }, set);
  assert.deepEqual(r2, { index: 2, position: { wordKey: "y", ordinal: 3 }, kind: "found" });
});

test("所有函式不修改傳入值、對任何輸入不拋例外", function () {
  const set = freeze(setOf(BASE));
  const inputs = [undefined, null, 0, "", "x", [], {}, [null], { wordKey: "a", ordinal: 1 }, freeze({ wordKey: "ability", ordinal: 1 })];
  inputs.forEach(function (a) {
    inputs.forEach(function (b) {
      assert.doesNotThrow(function () {
        P.isShape(a); P.normalize(a); P.sameCard(a, b);
        P.fromIndex(b, 0); P.fromIndex(set, a);
        P.resolve(a, b); P.resolve(a, set);
      });
    });
  });
});

// ── sameCard ──

test("sameCard：兩者皆非 null 且 wordKey、ordinal 相同才為 true", function () {
  assert.equal(P.sameCard({ wordKey: "a", ordinal: 1 }, { wordKey: "a", ordinal: 1 }), true);
  assert.equal(P.sameCard({ wordKey: "a", ordinal: 1 }, { wordKey: "a", ordinal: 2 }), false);
  assert.equal(P.sameCard({ wordKey: "a", ordinal: 1 }, { wordKey: "b", ordinal: 1 }), false);
  assert.equal(P.sameCard(null, null), false);
  assert.equal(P.sameCard(null, { wordKey: "a", ordinal: 1 }), false);
  assert.equal(P.sameCard(undefined, "a"), false);
});

// ── 效能 ──

test("效能：4,000 張單字集 resolve 100 次平均 < 5 ms", function () {
  const words = [];
  for (let i = 0; i < 4000; i++) words.push("word" + i);
  const set = setOf(words);
  const targets = [];
  for (let k = 0; k < 100; k++) {
    // 混合：最壞情況（找不到、走完整個集合）與找到靠後的字
    targets.push(k % 2 === 0 ? { wordKey: "missing" + k, ordinal: 3999 } : { wordKey: "word" + (3900 + k), ordinal: 1 });
  }
  const t0 = process.hrtime.bigint();
  for (let k = 0; k < 100; k++) P.resolve(targets[k], set);
  const avgMs = Number(process.hrtime.bigint() - t0) / 1e6 / 100;
  assert.ok(avgMs < 5, "平均 " + avgMs.toFixed(3) + " ms");
});

// ── 原始碼限制 ──

test("原始碼不含 document、localStorage、innerHTML（L1、LD-1）", function () {
  const src = fs.readFileSync(path.join(__dirname, "..", "core", "position.js"), "utf8");
  ["document", "localStorage", "innerHTML"].forEach(function (w) {
    assert.equal(src.indexOf(w), -1, w);
  });
});
