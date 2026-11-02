/*
 * similarity.test.js — 辨識吻合度單元測試（FE-05）
 * 涵蓋：AC-08-03、AC-08-04、AC-08-05、AC-08-06、AC-08-10、AC-08-12
 */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const sim = require("../core/similarity.js");

test("clean：轉小寫、去標點與空白、保留重音字母", () => {
  assert.equal(sim.clean("Latency."), "latency");
  assert.equal(sim.clean("Comply with."), "complywith");
  assert.equal(sim.clean("  hello,\tworld!\n"), "helloworld");
  assert.equal(sim.clean("Café"), "café");
  assert.equal(sim.clean("Café"), "café"); // NFC 正規化
  assert.equal(sim.clean("COVID-19"), "covid19");
  assert.equal(sim.clean(""), "");
  assert.equal(sim.clean(null), "");
  assert.equal(sim.clean(undefined), "");
});

test("levenshtein：基本數值", () => {
  assert.equal(sim.levenshtein("address", "adress"), 1);
  assert.equal(sim.levenshtein("sitting", "kitten"), 3);
  assert.equal(sim.levenshtein("kitten", "sitting"), 3);
  assert.equal(sim.levenshtein("complywith", "compliedwith"), 3);
  assert.equal(sim.levenshtein("", "abc"), 3);
  assert.equal(sim.levenshtein("abc", ""), 3);
  assert.equal(sim.levenshtein("", ""), 0);
  assert.equal(sim.levenshtein("same", "same"), 0);
  assert.equal(sim.levenshtein("flaw", "lawn"), 2);
});

test("AC-08-03：latency / Latency. → 100", () => {
  assert.equal(sim.score("Latency.", "latency"), 100);
});

test("AC-08-04：address / adress → 86", () => {
  assert.equal(sim.score("adress", "address"), 86);
});

test("AC-08-05：sitting / kitten → 57", () => {
  assert.equal(sim.score("kitten", "sitting"), 57);
});

test("AC-08-12：comply with → 100 與 75（黃燈）", () => {
  assert.equal(sim.score("Comply with.", "comply with"), 100);
  const s = sim.score("complied with", "comply with");
  assert.equal(s, 75);
  assert.equal(sim.lightOf(s), "yellow");
  // doneWhen 指定的呼叫寫法
  assert.equal(sim.score("comply with", "complied with"), 75);
  assert.equal(sim.lightOf(75), "yellow");
});

test("AC-08-06：100、90、89、65、64、0 的燈號", () => {
  const got = [100, 90, 89, 65, 64, 0].map(sim.lightOf);
  assert.deepEqual(got, ["green", "green", "yellow", "yellow", "red", "red"]);
});

test("AC-08-10：空辨識結果回 null", () => {
  assert.equal(sim.score("", "latency"), null);
  assert.equal(sim.score("   ", "latency"), null);
  assert.equal(sim.score("...!?", "latency"), null);
  assert.equal(sim.score(null, "latency"), null);
  assert.equal(sim.score(undefined, "latency"), null);
});

test("score 範圍在 0～100 整數", () => {
  const cases = [["xyz", "latency"], ["a", "abcdefghij"], ["latency", ""], ["abc", "abc"]];
  for (const [r, t] of cases) {
    const s = sim.score(r, t);
    assert.ok(Number.isInteger(s) && s >= 0 && s <= 100, `${r}/${t} → ${s}`);
  }
  assert.equal(sim.score("latency", ""), 0);
});

test("lightOf：非數值回 null", () => {
  assert.equal(sim.lightOf(null), null);
  assert.equal(sim.lightOf(NaN), null);
  assert.equal(sim.lightOf(Infinity), null);
});
