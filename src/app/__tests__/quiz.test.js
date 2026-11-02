/*
 * quiz.test.js — 單字四選一出題單元測試（FE-05）
 * 涵蓋：AC-09-02、AC-09-05、AC-09-06、AC-09-07、FB-11
 */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const quiz = require("../core/quiz.js");

/** 建立內建卡（StudyCard） */
function builtin(word, meaning) {
  return { kind: "builtin", wordKey: word, item: { word: word, meaning: meaning } };
}
/** 建立自訂卡（StudyCard） */
function custom(word, meaning) {
  return { kind: "custom", wordKey: word, item: { id: "c_" + word, word: word, meaning: meaning } };
}

/** 可重現的亂數（mulberry32） */
function seeded(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SET = [
  builtin("latency", "延遲"),
  builtin("comply", "遵守"),
  builtin("allocate", "分配"),
  builtin("revenue", "營收"),
  builtin("mitigate", "減輕"),
  builtin("audit", "稽核")
];

function checkQuestion(q, set, index) {
  assert.ok(q, "應產生題目");
  assert.equal(q.wordKey, set[index].wordKey);
  assert.equal(q.options.length, 4);
  assert.equal(new Set(q.options).size, 4, "4 個選項互不相同");
  assert.ok([0, 1, 2, 3].includes(q.correctIndex));
  assert.equal(q.options[q.correctIndex], set[index].item.meaning.trim(), "正解為該字 meaning");
  assert.equal(q.selectedIndex, null);
  const others = new Set(set.filter((_, i) => i !== index).map((c) => c.item.meaning.trim()));
  q.options.forEach((o, i) => {
    if (i !== q.correctIndex) assert.ok(others.has(o), `誘答「${o}」應來自其他卡`);
  });
}

test("AC-09-02：4 個相異選項、正解為該字 meaning、誘答來自其他卡", () => {
  for (let seed = 1; seed <= 200; seed++) {
    const idx = seed % SET.length;
    checkQuestion(quiz.buildQuiz(SET, idx, seeded(seed)), SET, idx);
  }
});

test("meaning 前後空白會 trim，重複 meaning 會去重", () => {
  const set = [
    builtin("a", "  甲 "),
    builtin("b", "乙"),
    builtin("c", "乙 "),
    builtin("d", "甲"), // 與正解相同（trim 後），須排除
    builtin("e", "丙"),
    builtin("f", "丁")
  ];
  for (let seed = 1; seed <= 100; seed++) {
    const q = quiz.buildQuiz(set, 0, seeded(seed));
    checkQuestion(q, set, 0);
    assert.equal(q.options[q.correctIndex], "甲");
    assert.equal(q.options.filter((o) => o === "甲").length, 1);
  }
});

test("AC-09-05：自訂單字卡也能出題", () => {
  const set = SET.slice(0, 3).concat([custom("benchmark", "基準")]);
  for (let seed = 1; seed <= 50; seed++) {
    checkQuestion(quiz.buildQuiz(set, 3, seeded(seed)), set, 3);
  }
});

test("AC-09-06：單字集少於 4 個字 → null", () => {
  assert.equal(quiz.buildQuiz(SET.slice(0, 3), 0, seeded(1)), null);
  assert.equal(quiz.buildQuiz([], 0, seeded(1)), null);
  assert.equal(quiz.buildQuiz(null, 0), null);
});

test("FB-11：≥ 4 字但相異 meaning 不足 4 種 → null", () => {
  const set = [builtin("a", "甲"), builtin("b", "乙"), builtin("c", "丙"), builtin("d", " 甲 ")];
  for (let i = 0; i < set.length; i++) assert.equal(quiz.buildQuiz(set, i, seeded(i + 1)), null);
  const many = [];
  for (let i = 0; i < 100; i++) many.push(builtin("w" + i, ["甲", "乙", "丙"][i % 3]));
  assert.equal(quiz.buildQuiz(many, 0, seeded(7)), null);
});

test("剛好 4 個相異 meaning → 一定成功", () => {
  const set = SET.slice(0, 4);
  for (let seed = 1; seed <= 50; seed++) checkQuestion(quiz.buildQuiz(set, seed % 4, seeded(seed)), set, seed % 4);
});

test("大量重複 meaning、只有少數相異時仍能湊滿（線性掃描備援）", () => {
  const set = [];
  for (let i = 0; i < 1000; i++) set.push(builtin("w" + i, "重複"));
  set.push(builtin("x1", "一"), builtin("x2", "二"), builtin("x3", "三"));
  for (let seed = 1; seed <= 30; seed++) checkQuestion(quiz.buildQuiz(set, 0, seeded(seed)), set, 0);
});

test("索引不合法或該卡 meaning 為空 → null", () => {
  assert.equal(quiz.buildQuiz(SET, -1, seeded(1)), null);
  assert.equal(quiz.buildQuiz(SET, SET.length, seeded(1)), null);
  assert.equal(quiz.buildQuiz(SET, 1.5, seeded(1)), null);
  const set = SET.slice(0, 5).concat([builtin("blank", "   ")]);
  assert.equal(quiz.buildQuiz(set, 5, seeded(1)), null);
});

test("rand 回傳邊界值（0 與接近 1）仍產生合法題目", () => {
  checkQuestion(quiz.buildQuiz(SET, 2, () => 0), SET, 2);
  checkQuestion(quiz.buildQuiz(SET, 2, () => 0.9999999999), SET, 2);
});

test("AC-09-07：真實 Math.random 連續 20 次，正解位置不全相同", () => {
  // 單次失敗機率 4 × (1/4)^20 ≈ 3.6e-12，實務上不會誤判
  const positions = [];
  for (let i = 0; i < 20; i++) positions.push(quiz.buildQuiz(SET, 0).correctIndex);
  assert.ok(new Set(positions).size > 1, `正解位置：${positions.join(",")}`);
});

test("5,620 張集合出題 < 1 ms", () => {
  const big = [];
  for (let i = 0; i < 5620; i++) big.push(builtin("w" + i, "釋義" + i));
  // 暖機，避免把 JIT 編譯時間算進去
  for (let i = 0; i < 200; i++) quiz.buildQuiz(big, i, Math.random);
  const N = 1000;
  const times = [];
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < N; i++) {
    const s = process.hrtime.bigint();
    const q = quiz.buildQuiz(big, (i * 7) % big.length);
    times.push(Number(process.hrtime.bigint() - s) / 1e6);
    assert.ok(q);
  }
  const avg = Number(process.hrtime.bigint() - t0) / 1e6 / N;
  times.sort((a, b) => a - b);
  // 以 p99 判定，排除 GC／排程造成的單次離群值
  const p99 = times[Math.floor(N * 0.99) - 1];
  assert.ok(avg < 1, `平均 ${avg.toFixed(4)} ms`);
  assert.ok(p99 < 1, `p99 ${p99.toFixed(4)} ms`);
});
