/*
 * stats.test.js — 正確率單元測試（FE-05）
 * 涵蓋：AC-17-04
 */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const stats = require("../core/stats.js");

test("AC-17-04：答題 10、答對 7 → 70%", () => {
  assert.equal(stats.accuracyText(10, 7), "70%");
});

test("四捨五入至整數", () => {
  assert.equal(stats.accuracyText(3, 2), "67%");
  assert.equal(stats.accuracyText(3, 1), "33%");
  assert.equal(stats.accuracyText(8, 5), "63%"); // 62.5 → 63
  assert.equal(stats.accuracyText(1, 1), "100%");
  assert.equal(stats.accuracyText(5, 0), "0%");
});

test("AC-17-04：答題數 0 → 「—」", () => {
  assert.equal(stats.accuracyText(0, 0), "—");
});

test("任何輸入都不出現 NaN 或 Infinity", () => {
  const inputs = [
    [0, 0], [0, 5], [-1, 0], [NaN, 1], [Infinity, 1], [10, NaN], [10, Infinity],
    [10, -3], [10, 20], [undefined, undefined], [null, null], ["10", "7"]
  ];
  for (const [a, c] of inputs) {
    const t = stats.accuracyText(a, c);
    assert.ok(!/NaN|Infinity/.test(t), `${a}/${c} → ${t}`);
    assert.ok(t === "—" || /^\d{1,3}%$/.test(t), `${a}/${c} → ${t}`);
  }
});
