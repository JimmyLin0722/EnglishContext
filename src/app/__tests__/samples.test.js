/*
 * samples.test.js — v0.14／v0.7 持久化樣本自身檢查（FE-70；architecture.md v0.10 §7.21.1、§10.7、D-15）
 * 只檢查 _samples/ 內的樣本檔本身，與程式版本無關（schemaVersion 升為 3 之後仍須通過）。
 * 涵蓋：AC-47-03、AC-47-04（樣本涵蓋的既有資料）、契約 DS-32。
 */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const DIR = path.join(__dirname, "_samples");
const FILES = ["v014-state.json", "v014-backup.json", "v07-state.json", "v07-backup.json"];

/** v0.14（schemaVersion 2）的 9 個 data 欄位，順序同契約 */
const V2_KEYS = ["goal", "customVocab", "masteredWordKeys", "vocabQuiz", "part5", "streak",
  "sttNoticeAcknowledged", "todayLearned", "learnedHistory"];
/** v0.7（schemaVersion 1）的 7 個 data 欄位 */
const V1_KEYS = V2_KEYS.slice(0, 7);
const BACKUP_TOP = ["format", "schemaVersion", "exportedAt", "contentDataVersion", "data"];

function raw(name) {
  return fs.readFileSync(path.join(DIR, name));
}
function parse(name) {
  return JSON.parse(raw(name).toString("utf8"));
}
function sorted(a) {
  return a.slice().sort();
}

test("4 個樣本皆可 JSON.parse 且頂層為物件", function () {
  FILES.forEach(function (f) {
    const o = parse(f);
    assert.equal(typeof o, "object", f);
    assert.ok(o !== null && !Array.isArray(o), f);
  });
});

test("v014-state：頂層恰 schemaVersion、savedAt、data；schemaVersion 2；data 恰 9 鍵；原字串為單行", function () {
  const text = raw("v014-state.json").toString("utf8");
  assert.ok(!/\n/.test(text), "localStorage 原字串不應含換行（未重新排版）");
  const o = JSON.parse(text);
  assert.deepEqual(sorted(Object.keys(o)), sorted(["schemaVersion", "savedAt", "data"]));
  assert.equal(o.schemaVersion, 2);
  assert.equal(typeof o.savedAt, "string");
  assert.deepEqual(sorted(Object.keys(o.data)), sorted(V2_KEYS));
  // JSON.stringify 單行輸出：重新序列化應與原字串相同（證明未經排版）
  assert.equal(JSON.stringify(o), text);
});

test("v014-backup：頂層恰 5 鍵、format、schemaVersion 2、data 9 鍵；為 2 格縮排的匯出檔", function () {
  const text = raw("v014-backup.json").toString("utf8");
  const o = JSON.parse(text);
  assert.deepEqual(Object.keys(o), BACKUP_TOP);
  assert.equal(o.format, "english-master-track-backup");
  assert.equal(o.schemaVersion, 2);
  assert.deepEqual(sorted(Object.keys(o.data)), sorted(V2_KEYS));
  assert.equal(JSON.stringify(o, null, 2), text);
});

test("v07-state：schemaVersion 1、data 7 鍵", function () {
  const o = parse("v07-state.json");
  assert.deepEqual(sorted(Object.keys(o)), sorted(["schemaVersion", "savedAt", "data"]));
  assert.equal(o.schemaVersion, 1);
  assert.deepEqual(sorted(Object.keys(o.data)), sorted(V1_KEYS));
});

test("v07-backup：頂層 5 鍵、schemaVersion 1、data 7 鍵，其餘與 v014-backup 相同", function () {
  const o = parse("v07-backup.json");
  assert.deepEqual(Object.keys(o), BACKUP_TOP);
  assert.equal(o.format, "english-master-track-backup");
  assert.equal(o.schemaVersion, 1);
  assert.deepEqual(sorted(Object.keys(o.data)), sorted(V1_KEYS));
  const src = parse("v014-backup.json");
  V1_KEYS.forEach(function (k) { assert.deepEqual(o.data[k], src.data[k], k); });
  assert.equal(o.exportedAt, src.exportedAt);
  assert.equal(o.contentDataVersion, src.contentDataVersion);
});

test("v014 樣本涵蓋 AC-47-04 的既有資料：範本來源自訂單字、鎖定中的題目、草稿 ≠ 已套用", function () {
  [parse("v014-state.json").data, parse("v014-backup.json").data].forEach(function (d, i) {
    const label = i === 0 ? "state" : "backup";
    assert.ok(d.customVocab.some(function (c) { return c.origin === "template"; }), label + " 應含 origin template");
    assert.ok(d.customVocab.some(function (c) { return c.origin === "manual"; }), label + " 應含 origin manual");
    assert.notEqual(d.part5.lockedSelection, null, label + " part5.lockedSelection");
    assert.notEqual(d.goal.draftScore, d.goal.appliedScore, label + " goal 草稿與已套用");
    assert.equal(d.sttNoticeAcknowledged, true, label);
    assert.ok(d.vocabQuiz.answered > d.vocabQuiz.correct && d.vocabQuiz.correct > 0, label + " 測驗模式對錯皆有");
    assert.ok(d.part5.totalAnswered > d.part5.totalCorrect && d.part5.totalCorrect > 0, label + " 模擬測驗對錯皆有");
  });
});

test("README.md 記錄的 4 個樣本 SHA-256 與檔案相符，且載明唯讀", function () {
  const readme = fs.readFileSync(path.join(DIR, "README.md"), "utf8");
  assert.ok(readme.indexOf("本目錄唯讀，後續任務不得重新產生或改寫") >= 0);
  FILES.forEach(function (f) {
    const re = new RegExp("`" + f.replace(/\./g, "\\.") + "`[^\\n]*?`([0-9a-f]{64})`");
    const m = readme.match(re);
    assert.ok(m, "README 應記錄 " + f + " 的 SHA-256");
    const actual = crypto.createHash("sha256").update(raw(f)).digest("hex");
    assert.equal(m[1], actual, f);
  });
});
