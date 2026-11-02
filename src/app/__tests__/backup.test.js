/*
 * backup.test.js — 備份匯出與匯入步驟單元測試（FE-06；FE-22 v0.8 升版）
 * 涵蓋：AC-24-01、AC-24-02、AC-24-03、AC-24-05、AC-24-06、AC-24-07、AC-24-08、AC-24-10、AC-24-11、AC-30-09、
 *       V-IMP-01、README §6.1、§6.2、§6.3、IM-8、MG-4
 */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const B = require("../core/backup.js");
const P = require("../core/persist.js");
const C = require("../core/constants.js");

// 測試以固定的本地日期為「今天」：匯出時間與匯入 ctx.today 一致
const TODAY = "2026-10-30";
const NOW = new Date(2026, 9, 30, 9, 2, 3); // 本地 2026-10-30

const BUILTIN = new Set(["ability", "analysis", "monetization", "pay off"]);

function item(id, word, extra) {
  return Object.assign({
    id: id, word: word, meaning: "釋義", phonetic: "", pos: "", collocation: "", example: "",
    academicContext: "", origin: "manual", templateId: null, createdAt: "2026-10-29T08:30:00.000Z"
  }, extra || {});
}

function sampleData() {
  return {
    goal: { draftScore: 300, appliedScore: 300, appliedColor: "brown", effectiveColor: "brown" },
    customVocab: [item("c_a1", "Bootstrap"), item("c_a2", "Overfitting")],
    masteredWordKeys: ["ability", "bootstrap"],
    vocabQuiz: { answered: 5, correct: 3 },
    part5: { currentIndex: 4, lockedSelection: 1, phase: "question", roundAnswered: 4, roundCorrect: 2, totalAnswered: 10, totalCorrect: 6 },
    streak: { days: 3, lastActiveDate: "2026-10-29" },
    sttNoticeAcknowledged: true,
    todayLearned: { date: TODAY, wordKeys: ["bootstrap", "ability"] },
    learnedHistory: { "2026-10-24": 3, "2026-10-30": 2 }
  };
}

/** v0.7（schemaVersion 1）備份的 data：只有 7 個既有欄位 */
function v1Data() {
  const d = sampleData();
  delete d.todayLearned;
  delete d.learnedHistory;
  return d;
}

function backupObj(data, extra) {
  return Object.assign({
    format: "english-master-track-backup",
    schemaVersion: 2,
    exportedAt: "2026-10-30T01:00:00.000Z",
    contentDataVersion: "2026.10.30",
    data: data
  }, extra || {});
}

function ctx(extra) {
  return Object.assign({ builtinKeys: BUILTIN, part5Length: 50, today: TODAY }, extra || {});
}

function expectFormat(text, label) {
  assert.deepEqual(B.importSteps(text, ctx()), { ok: false, error: "format" }, label);
}

// ── 匯出 ──

test("buildBackup：檔名使用本地日期 YYYYMMDD（AC-24-01）", () => {
  const r = B.buildBackup(sampleData(), "v1", new Date(2026, 0, 5, 23, 59, 59));
  assert.equal(r.filename, "english-master-track-backup-20260105.json");
  const r2 = B.buildBackup(sampleData(), "v1", new Date(2026, 11, 31, 0, 0, 1));
  assert.equal(r2.filename, "english-master-track-backup-20261231.json");
  assert.match(B.buildBackup(sampleData(), "v1").filename, /^english-master-track-backup-\d{8}\.json$/);
});

test("buildBackup：內容為合法 BackupFile，含全部使用者資料（AC-24-02）", () => {
  const now = NOW;
  const d = sampleData();
  const r = B.buildBackup(d, "2026.10.30", now);
  const obj = JSON.parse(r.json);
  assert.deepEqual(Object.keys(obj).sort(), ["contentDataVersion", "data", "exportedAt", "format", "schemaVersion"]);
  assert.equal(obj.format, "english-master-track-backup");
  assert.equal(obj.schemaVersion, 2);
  assert.equal(obj.exportedAt, now.toISOString());
  assert.equal(obj.contentDataVersion, "2026.10.30");
  assert.deepEqual(obj.data, d);
  assert.ok(P.validatePersistedData(obj.data).ok);
  assert.ok(P.validatePersistedData(obj.data, { written: true, today: TODAY }).ok);
  // contentDataVersion 無法取得時填 ""
  assert.equal(JSON.parse(B.buildBackup(d, undefined, now).json).contentDataVersion, "");
});

test("buildBackup：不含內建資料與執行期狀態（AC-24-02）", () => {
  const d = Object.assign(sampleData(), {
    studySet: [{ word: "ability" }],
    VOCAB_BANK: [{ word: "ability" }],
    PART5_QUESTION_BANK: [{ id: "p5-001" }],
    storageStatus: "ok"
  });
  const obj = JSON.parse(B.buildBackup(d, "v", new Date()).json);
  assert.deepEqual(Object.keys(obj.data).sort(), P.DATA_KEYS.slice().sort());
  assert.ok(!/studySet|VOCAB_BANK|PART5_QUESTION_BANK|storageStatus/.test(B.buildBackup(d, "v", new Date()).json));
  // 不修改傳入值
  assert.ok("studySet" in d);
});

test("匯出後再匯入：資料完全一致（往返）", () => {
  const d = sampleData();
  const r = B.importSteps(B.buildBackup(d, "v", NOW).json, ctx());
  assert.equal(r.ok, true);
  assert.equal(r.skipped, 0);
  assert.deepEqual(r.data, d);
});

// ── 匯入：格式錯誤 ──

test("匯入：空檔、空白、非 JSON → format（AC-24-05）", () => {
  for (const t of ["", "   \n", "﻿", "not json", "{", "{\"format\":", undefined, null, 42]) {
    expectFormat(t, JSON.stringify(t));
  }
});

test("匯入：頂層非物件或 format 錯 → format（步驟 2）", () => {
  for (const t of ["null", "[]", "1", "\"x\"", "true"]) {
    expectFormat(t, t);
  }
  expectFormat(JSON.stringify(backupObj(sampleData(), { format: "other" })), "format 不符");
  const noFormat = backupObj(sampleData());
  delete noFormat.format;
  expectFormat(JSON.stringify(noFormat), "缺 format");
  // format 錯但版本也錯 → 仍先回報 format
  expectFormat(JSON.stringify(backupObj(sampleData(), { format: "x", schemaVersion: 2 })), "format 優先於版本");
});

test("匯入：UTF-8 BOM 開頭仍可解析", () => {
  const r = B.importSteps("﻿" + JSON.stringify(backupObj(sampleData())), ctx());
  assert.equal(r.ok, true);
});

// ── 匯入：版本不相容 ──

test("匯入：版本缺失 → version，fileVersion null（AC-24-06）", () => {
  const o = backupObj(sampleData());
  delete o.schemaVersion;
  assert.deepEqual(B.importSteps(JSON.stringify(o), ctx()), { ok: false, error: "version", fileVersion: null });
});

test("匯入：版本 3、0、1.5、字串、null → version", () => {
  const cases = [[3, 3], [99, 99], [0, 0], [1.5, 1.5], [2.5, 2.5], ["1", null], ["2", null], [null, null], [-3, -3], [true, null], [{}, null]];
  for (const [v, fv] of cases) {
    const r = B.importSteps(JSON.stringify(backupObj(sampleData(), { schemaVersion: v })), ctx());
    assert.deepEqual(r, { ok: false, error: "version", fileVersion: fv }, String(v));
  }
});

test("匯入：版本檢查先於 data 驗證（版本 3 且 data 壞 → version）", () => {
  const r = B.importSteps(JSON.stringify(backupObj({ broken: true }, { schemaVersion: 3 })), ctx());
  assert.equal(r.error, "version");
});

// ── 匯入：data 驗證 ──

test("匯入：缺必要欄位 → format（AC-24-05）", () => {
  for (const k of ["exportedAt", "contentDataVersion", "data"]) {
    const o = backupObj(sampleData());
    delete o[k];
    expectFormat(JSON.stringify(o), "缺 " + k);
  }
  for (const k of P.DATA_KEYS) {
    const d = sampleData();
    delete d[k];
    expectFormat(JSON.stringify(backupObj(d)), "缺 data." + k);
  }
  const d = sampleData();
  delete d.customVocab[0].meaning;
  expectFormat(JSON.stringify(backupObj(d)), "缺 customVocab.meaning");
});

test("匯入：型別錯、多餘欄位、V-ST-03 → format", () => {
  const mutations = [
    (o) => { o.exportedAt = 123; },
    (o) => { o.contentDataVersion = 1; },
    (o) => { o.extra = 1; },
    (o) => { o.data = []; },
    (o) => { o.data.goal.appliedScore = "600"; },
    (o) => { o.data.goal.draftScore = 601; },
    (o) => { o.data.customVocab = "x"; },
    (o) => { o.data.customVocab[0].word = 5; },
    (o) => { o.data.customVocab[0].id = "bad id"; },
    (o) => { o.data.masteredWordKeys = [1]; },
    (o) => { o.data.masteredWordKeys = ["Ability"]; },
    (o) => { o.data.vocabQuiz.correct = 6; },
    (o) => { o.data.part5.totalCorrect = 11; },
    (o) => { o.data.part5.phase = 1; },
    (o) => { o.data.streak.days = "3"; },
    (o) => { o.data.sttNoticeAcknowledged = 1; },
    (o) => { o.data.extra = 1; }
  ];
  mutations.forEach((fn, i) => {
    const o = backupObj(sampleData());
    fn(o);
    expectFormat(JSON.stringify(o), "mutation " + i);
  });
});

// ── 匯入：清理與略過計數（步驟 7）──

test("匯入：自訂字與內建重複（不分大小寫）、檔內重複、不存在的已掌握 → 略過並計數（AC-24-08）", () => {
  const d = sampleData();
  d.customVocab = [
    item("c_1", "  MONETIZATION "),   // 與內建重複 → 略過
    item("c_2", "Bootstrap"),         // 保留
    item("c_3", "bootstrap"),         // 檔內重複 → 略過
    item("c_4", "Pay  Off"),          // 與內建（pay off）重複 → 略過
    item("c_5", "Overfitting")        // 保留
  ];
  d.masteredWordKeys = ["ability", "bootstrap", "monetization", "ghostword", "overfitting", "nope"];
  const r = B.importSteps(JSON.stringify(backupObj(d)), ctx());
  assert.equal(r.ok, true);
  assert.deepEqual(r.data.customVocab.map((x) => x.id), ["c_2", "c_5"]);
  assert.deepEqual(r.data.customVocab.map((x) => x.word), ["Bootstrap", "Overfitting"]);
  // 已掌握：ghostword、nope 不存在 → 略過；monetization 為內建 → 保留
  assert.deepEqual(r.data.masteredWordKeys, ["ability", "bootstrap", "monetization", "overfitting"]);
  assert.equal(r.skipped, 3 + 2);
  assert.ok(P.validatePersistedData(r.data).ok);
});

test("匯入：已掌握字只因重複自訂被略過的那筆不影響（略過字若為內建仍保留）", () => {
  const d = sampleData();
  d.customVocab = [item("c_1", "Analysis")];
  d.masteredWordKeys = ["analysis"];
  const r = B.importSteps(JSON.stringify(backupObj(d)), ctx());
  assert.equal(r.skipped, 1);
  assert.deepEqual(r.data.customVocab, []);
  assert.deepEqual(r.data.masteredWordKeys, ["analysis"]);
});

test("匯入：id 重複 → 重新產生，不計略過", () => {
  const d = sampleData();
  d.customVocab = [item("c_dup", "Alpha"), item("c_dup", "Beta"), item("c_x", "Gamma"), item("c_dup", "Delta")];
  d.masteredWordKeys = [];
  const ids = ["c_dup", "c_x", "c_new1", "c_new2"];
  let n = 0;
  const r = B.importSteps(JSON.stringify(backupObj(d)), ctx({ newId: () => ids[n++] }));
  assert.equal(r.ok, true);
  assert.equal(r.skipped, 0);
  assert.deepEqual(r.data.customVocab.map((x) => x.id), ["c_dup", "c_new1", "c_x", "c_new2"]);
  assert.deepEqual(r.data.customVocab.map((x) => x.word), ["Alpha", "Beta", "Gamma", "Delta"]);

  // 預設產生器：結果仍合法且不重複
  const r2 = B.importSteps(JSON.stringify(backupObj(d)), ctx());
  const got = r2.data.customVocab.map((x) => x.id);
  assert.equal(new Set(got).size, 4);
  assert.ok(got.every((id) => /^c_[A-Za-z0-9_-]{1,64}$/.test(id)));
  assert.ok(P.validatePersistedData(r2.data).ok);
});

test("匯入：被略過的自訂字 id 不佔用（後續同 id 不需重新產生）", () => {
  const d = sampleData();
  d.customVocab = [item("c_1", "Ability"), item("c_1", "Zeta")];
  d.masteredWordKeys = [];
  const r = B.importSteps(JSON.stringify(backupObj(d)), ctx());
  assert.equal(r.skipped, 1);
  assert.deepEqual(r.data.customVocab.map((x) => x.id), ["c_1"]);
});

test("匯入：重算色級（V-ST-02）與 V-ST-05", () => {
  const d = sampleData();
  d.goal = { draftScore: 600, appliedScore: 900, appliedColor: "orange", effectiveColor: "orange" };
  d.part5.currentIndex = 60;
  const r = B.importSteps(JSON.stringify(backupObj(d)), ctx());
  assert.deepEqual(r.data.goal, { draftScore: 600, appliedScore: 900, appliedColor: "gold", effectiveColor: "green" });
  assert.equal(r.data.part5.currentIndex, 0);
  assert.equal(r.data.part5.lockedSelection, null);
  assert.equal(r.data.part5.phase, "question");
});

test("匯入：內建字庫缺漏（ctx 無 builtinKeys）時不拋例外，已掌握僅保留自訂字", () => {
  const d = sampleData();
  const r = B.importSteps(JSON.stringify(backupObj(d)), {});
  assert.equal(r.ok, true);
  assert.deepEqual(r.data.masteredWordKeys, ["bootstrap"]);
  assert.equal(r.skipped, 1);
  // 陣列形式的 builtinKeys
  const r2 = B.importSteps(JSON.stringify(backupObj(d)), { builtinKeys: ["ability"] });
  assert.equal(r2.skipped, 0);
  // Map 形式
  const r3 = B.importSteps(JSON.stringify(backupObj(d)), { builtinKeys: new Map([["ability", {}]]) });
  assert.equal(r3.skipped, 0);
});

test("匯入：XSS 字串原樣保留（AC-24-07）", () => {
  const xss = "<img src=x onerror=alert(1)>";
  const d = sampleData();
  d.customVocab = [item("c_x", xss, { meaning: "<script>alert(1)</script>", example: "\"><svg onload=alert(1)>", collocation: "&lt;b&gt;" })];
  d.masteredWordKeys = [xss];
  const r = B.importSteps(JSON.stringify(backupObj(d)), ctx());
  assert.equal(r.ok, true);
  assert.equal(r.skipped, 0);
  assert.equal(r.data.customVocab[0].word, xss);
  assert.equal(r.data.customVocab[0].meaning, "<script>alert(1)</script>");
  assert.equal(r.data.customVocab[0].example, "\"><svg onload=alert(1)>");
  assert.equal(r.data.customVocab[0].collocation, "&lt;b&gt;");
  assert.deepEqual(r.data.masteredWordKeys, [xss]);
});

// ── V-IMP-01：不修改傳入資料 ──

test("匯入失敗與成功時都不修改傳入的現有資料與 ctx（深度比較）", () => {
  const current = sampleData();
  const snapshot = JSON.parse(JSON.stringify(current));
  const builtin = new Set(BUILTIN);
  const c = { builtinKeys: builtin, part5Length: 50, current: current, today: TODAY };
  const bad = backupObj(sampleData());
  bad.data.vocabQuiz.correct = 99;
  const dup = sampleData();
  dup.customVocab = [item("c_1", "Ability"), item("c_2", "Zeta"), item("c_2", "Eta")];
  const texts = [
    "", "x", "[]", JSON.stringify(backupObj(sampleData(), { format: "y" })),
    JSON.stringify(backupObj(sampleData(), { schemaVersion: 3 })),
    JSON.stringify(backupObj(v1Data(), { schemaVersion: 1 })),
    JSON.stringify(backupObj("x", { schemaVersion: 1 })),
    JSON.stringify(backupObj(Object.assign(sampleData(), { todayLearned: [] }))),
    JSON.stringify(bad),
    JSON.stringify(backupObj(dup)),
    JSON.stringify(backupObj(current))
  ];
  for (const t of texts) {
    B.importSteps(t, c);
    assert.deepEqual(current, snapshot);
    assert.deepEqual([...builtin].sort(), [...BUILTIN].sort());
    assert.deepEqual(Object.keys(c).sort(), ["builtinKeys", "current", "part5Length", "today"]);
  }
  // 成功結果是新物件，修改它不影響 current
  const r = B.importSteps(JSON.stringify(backupObj(current)), c);
  assert.notEqual(r.data, current);
  r.data.customVocab.push(item("c_z", "Zed"));
  assert.deepEqual(current, snapshot);
});

test("importSteps：任意輸入不拋例外", () => {
  const bases = [JSON.stringify(backupObj(sampleData())), JSON.stringify(backupObj(v1Data(), { schemaVersion: 1 }))];
  let seed = 7;
  const rand = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  for (let i = 0; i < 2000; i++) {
    const base = bases[i % bases.length];
    const cut = Math.floor(rand() * base.length);
    const pos = Math.floor(rand() * base.length);
    const ch = String.fromCharCode(Math.floor(rand() * 128));
    for (const t of [base.slice(0, cut), base.slice(0, pos) + ch + base.slice(pos + 1)]) {
      let r;
      assert.doesNotThrow(() => { r = B.importSteps(t, ctx()); });
      assert.equal(typeof r.ok, "boolean");
      if (r.ok) { assert.ok(P.validatePersistedData(r.data).ok); }
      else { assert.ok(["format", "version"].includes(r.error)); }
    }
  }
});

// ── 回歸（R6-1）：瀏覽器建置的實際載入順序 ──
// 建置依檔名排序載入 core（只有 constants、wordkey 例外），backup.js 會早於 persist.js。
// 以 node:vm 模擬瀏覽器（只有 self／window，沒有 module、require），依 listAppFiles 的順序載入。

/** 依建置實際順序在 vm 沙箱中載入全部 core 檔，回傳沙箱與載入順序 */
async function loadCoreLikeBrowser() {
  const path = require("node:path");
  const fs = require("node:fs");
  const vm = require("node:vm");
  const { pathToFileURL } = require("node:url");
  const appDir = path.resolve(__dirname, "..");
  const build = await import(pathToFileURL(path.resolve(appDir, "..", "..", "tools", "build.mjs")).href);
  const order = build.listAppFiles(appDir).filter((f) => f.startsWith("core/"));
  const sandbox = { console: console };
  sandbox.self = sandbox;
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const rel of order) {
    const code = fs.readFileSync(path.join(appDir, rel), "utf8").replace(/^\uFEFF/, "");
    vm.runInContext(code, sandbox, { filename: rel });
  }
  return { sandbox: sandbox, order: order };
}

test("回歸 R6-1：依建置順序於瀏覽器環境載入，匯出與匯入正常", async () => {
  const { sandbox, order } = await loadCoreLikeBrowser();
  // 前提：重現問題的載入順序（backup.js 在 persist.js 之前）
  assert.ok(order.indexOf("core/backup.js") >= 0 && order.indexOf("core/persist.js") >= 0);
  assert.ok(order.indexOf("core/backup.js") < order.indexOf("core/persist.js"), "backup.js 應早於 persist.js 載入");
  assert.equal(typeof sandbox.module, "undefined");
  assert.equal(typeof sandbox.require, "undefined");

  const VB = sandbox.EMT.core.backup;
  const VP = sandbox.EMT.core.persist;
  assert.ok(VB && VP);

  // 匯出：不拋例外，內容正確
  const d = sampleData();
  let exp;
  assert.doesNotThrow(() => { exp = VB.buildBackup(d, "2026.10.30", new Date(2026, 9, 30, 9, 0, 0)); });
  assert.equal(exp.filename, "english-master-track-backup-20261030.json");
  const obj = JSON.parse(exp.json);
  assert.equal(obj.format, "english-master-track-backup");
  assert.equal(obj.schemaVersion, 2);
  assert.deepEqual(obj.data, d);

  // 匯入：剛匯出的檔案可匯入成功（不可被判成格式錯誤）
  let imp;
  assert.doesNotThrow(() => { imp = VB.importSteps(exp.json, ctx()); });
  assert.equal(imp.ok, true);
  assert.equal(imp.skipped, 0);
  assert.ok(VP.validatePersistedData(imp.data).ok);
  assert.deepEqual(JSON.parse(JSON.stringify(imp.data)), d);

  // 匯入錯誤分類仍正確
  assert.deepEqual(JSON.parse(JSON.stringify(VB.importSteps("not json", ctx()))), { ok: false, error: "format" });
  assert.deepEqual(
    JSON.parse(JSON.stringify(VB.importSteps(JSON.stringify(backupObj(d, { schemaVersion: 99 })), ctx()))),
    { ok: false, error: "version", fileVersion: 99 }
  );
});

// ── v0.8（FE-22）：匯出 schemaVersion 2 與學習紀錄正規化（§6.1、AC-24-02）──

test("buildBackup：schemaVersion 2；data 以匯出當天（本地）正規化 todayLearned、learnedHistory，符合 PersistedDataWritten", () => {
  const d = sampleData();
  d.todayLearned = { date: "2026-10-29", wordKeys: ["a", "b"] }; // 前一天 → 歸零
  d.learnedHistory = {
    "2026-10-29": 2, "2026-10-01": 1, "2026-09-30": 9 /* today − 30 → 捨棄 */, "2026-10-31": 5 /* 未來 → 捨棄 */,
    "2026-13-40": 1, yesterday: 2, "2026-10-20": -1, "2026-10-21": 1.5, "2026-10-22": "3"
  };
  const snap = JSON.parse(JSON.stringify(d));
  const obj = JSON.parse(B.buildBackup(d, "v", NOW).json);
  assert.equal(obj.schemaVersion, 2);
  assert.equal(obj.schemaVersion, C.CURRENT_SCHEMA_VERSION);
  assert.deepEqual(obj.data.todayLearned, { date: null, wordKeys: [] });
  assert.deepEqual(obj.data.learnedHistory, { "2026-10-29": 2, "2026-10-01": 1 });
  assert.ok(P.validatePersistedData(obj.data, { written: true }).ok);
  assert.ok(P.validatePersistedData(obj.data, { written: true, today: TODAY }).ok);
  // 其他 7 欄不受影響、不修改傳入值
  for (const k of P.V1_DATA_KEYS) { assert.deepEqual(obj.data[k], d[k], k); }
  assert.deepEqual(d, snap);

  // 今天的紀錄：wordKeys 正規化、去重，歷史的今天與之一致（V-ST-11）
  const t = sampleData();
  t.todayLearned = { date: TODAY, wordKeys: ["  Pay  Off ", "pay off", "", 3, "Ability"] };
  t.learnedHistory = { [TODAY]: 99 };
  const o2 = JSON.parse(B.buildBackup(t, "v", NOW).json);
  assert.deepEqual(o2.data.todayLearned, { date: TODAY, wordKeys: ["pay off", "ability"] });
  assert.deepEqual(o2.data.learnedHistory, { [TODAY]: 2 });
  assert.ok(P.validatePersistedData(o2.data, { written: true, today: TODAY }).ok);
});

test("buildBackup：記憶體資料缺兩欄時補預設值（仍為 9 欄、通過寫出格式）", () => {
  const obj = JSON.parse(B.buildBackup(v1Data(), "v", NOW).json);
  assert.deepEqual(Object.keys(obj.data), [...P.DATA_KEYS]);
  assert.deepEqual(obj.data.todayLearned, { date: null, wordKeys: [] });
  assert.deepEqual(obj.data.learnedHistory, {});
  assert.ok(P.validatePersistedData(obj.data, { written: true, today: TODAY }).ok);
});

test("buildBackup：未指定 now 時以本地今天正規化", () => {
  const today = P.localDate(new Date());
  const d = sampleData();
  d.todayLearned = { date: today, wordKeys: ["x"] };
  d.learnedHistory = {};
  const obj = JSON.parse(B.buildBackup(d, "v").json);
  assert.deepEqual(obj.data.todayLearned, { date: today, wordKeys: ["x"] });
  assert.deepEqual(obj.data.learnedHistory, { [today]: 1 });
});

// ── v0.8（FE-22）：匯入 v1 備份（AC-24-10、MG-4）──

test("匯入 v1 備份：data 遷移、兩欄為預設、其餘照常清理與匯入，不判格式錯誤或版本不相容（AC-24-10）", () => {
  const d = v1Data();
  const r = B.importSteps(JSON.stringify(backupObj(d, { schemaVersion: 1 })), ctx());
  assert.equal(r.ok, true);
  assert.equal(r.skipped, 0);
  assert.deepEqual(r.data.todayLearned, { date: null, wordKeys: [] });
  assert.deepEqual(r.data.learnedHistory, {});
  for (const k of P.V1_DATA_KEYS) { assert.deepEqual(r.data[k], d[k], k); }
  assert.deepEqual(Object.keys(r.data).sort(), [...P.DATA_KEYS].sort());
  assert.ok(P.validatePersistedData(r.data).ok);
  assert.ok(P.validatePersistedData(r.data, { written: true, today: TODAY }).ok);
  // store 寫入 localStorage 的 StorageRecord 一律為 2（MG-4）
  assert.equal(P.buildRecord(r.data).schemaVersion, 2);
});

test("匯入 v1 備份：步驟 7 清理與略過計數照常（AC-24-08）", () => {
  const d = v1Data();
  d.customVocab = [item("c_1", "Ability"), item("c_2", "Bootstrap")];
  d.masteredWordKeys = ["bootstrap", "ghost"];
  const r = B.importSteps(JSON.stringify(backupObj(d, { schemaVersion: 1 })), ctx());
  assert.equal(r.ok, true);
  assert.equal(r.skipped, 2);
  assert.deepEqual(r.data.customVocab.map((x) => x.id), ["c_2"]);
  assert.deepEqual(r.data.masteredWordKeys, ["bootstrap"]);
});

test("匯入 v1 備份：v1 內即使有 todayLearned／learnedHistory（含壞值）也一律覆寫（MG-2）", () => {
  for (const [t, h] of [[{ date: TODAY, wordKeys: ["a"] }, { [TODAY]: 1 }], ["bad", []], [null, null]]) {
    const d = v1Data();
    d.todayLearned = t;
    d.learnedHistory = h;
    const r = B.importSteps(JSON.stringify(backupObj(d, { schemaVersion: 1 })), ctx());
    assert.equal(r.ok, true, JSON.stringify([t, h]));
    assert.deepEqual(r.data.todayLearned, { date: null, wordKeys: [] });
    assert.deepEqual(r.data.learnedHistory, {});
  }
});

test("匯入 v1 備份：data 不是物件 → format（MG-1）；7 欄有誤 → format", () => {
  for (const v of [null, [], "x", 1, true]) {
    expectFormat(JSON.stringify(backupObj(v, { schemaVersion: 1 })), "data " + JSON.stringify(v));
  }
  const noData = backupObj(v1Data(), { schemaVersion: 1 });
  delete noData.data;
  expectFormat(JSON.stringify(noData), "缺 data");
  const bad = v1Data();
  bad.vocabQuiz.correct = 99;
  expectFormat(JSON.stringify(backupObj(bad, { schemaVersion: 1 })), "V-ST-03");
  const extra = v1Data();
  extra.extra = 1;
  expectFormat(JSON.stringify(backupObj(extra, { schemaVersion: 1 })), "多餘欄");
  // 頂層欄位錯誤仍為 format（MG-4：步驟 5 檢查頂層）
  expectFormat(JSON.stringify(backupObj(v1Data(), { schemaVersion: 1, exportedAt: "x" })), "exportedAt");
});

// ── v0.8（FE-22）：匯入 v2 的兩欄（IM-8，AC-24-05、AC-24-11）──

test("匯入 v2：todayLearned／learnedHistory 缺少或 shape 不符 → format，整份不匯入（IM-8 (1)）", () => {
  const todayBad = [undefined, null, [], "x", 1, {}, { date: null }, { wordKeys: [] }, { date: null, wordKeys: [], x: 1 },
    { date: 20261030, wordKeys: [] }, { date: TODAY, wordKeys: "a" }, { date: TODAY, wordKeys: {} }];
  for (const v of todayBad) {
    const d = sampleData();
    if (v === undefined) { delete d.todayLearned; } else { d.todayLearned = v; }
    expectFormat(JSON.stringify(backupObj(d)), "todayLearned " + JSON.stringify(v));
  }
  for (const v of [undefined, null, [], [1, 2], "x", 0, true]) {
    const d = sampleData();
    if (v === undefined) { delete d.learnedHistory; } else { d.learnedHistory = v; }
    expectFormat(JSON.stringify(backupObj(d)), "learnedHistory " + JSON.stringify(v));
  }
});

test("匯入 v2：項目層級無效 → 步驟 7 捨棄或重設，不報錯、不計入略過數（IM-8 (2)、AC-24-11）", () => {
  const d = sampleData();
  d.todayLearned = { date: TODAY, wordKeys: [1, "  Bootstrap ", "bootstrap", "", "   ", null, "Ghost Word"] };
  d.learnedHistory = {
    "2026-13-40": 1, yesterday: 2, "2026-02-30": 3, "2026-10-29": -1, "2026-10-28": 1.5, "2026-10-27": "3",
    "2026-10-26": null, "2026-10-31": 4 /* 晚於匯入當天 */, "2026-09-30": 5 /* 早於 today − 29 */,
    "2026-10-01": 6 /* today − 29 → 保留 */, "2026-10-25": 0, [TODAY]: 77 /* 與今日數不一致 → 覆寫 */
  };
  const r = B.importSteps(JSON.stringify(backupObj(d)), ctx());
  assert.equal(r.ok, true);
  assert.equal(r.skipped, 0);
  // wordKeys 不與字庫比對（ghost word 保留）
  assert.deepEqual(r.data.todayLearned, { date: TODAY, wordKeys: ["bootstrap", "ghost word"] });
  assert.deepEqual(r.data.learnedHistory, { "2026-10-01": 6, "2026-10-25": 0, [TODAY]: 2 });
  assert.ok(P.validatePersistedData(r.data, { written: true, today: TODAY }).ok);

  // todayLearned.date 不是匯入當天（過去、未來、格式錯、不存在的日期）→ 重設，歷史保留
  for (const date of ["2026-10-29", "2026-10-31", "yesterday", "2026-02-30", ""]) {
    const x = sampleData();
    x.todayLearned = { date: date, wordKeys: ["a", "b", "c"] };
    x.learnedHistory = { "2026-10-29": 3 };
    const rr = B.importSteps(JSON.stringify(backupObj(x)), ctx());
    assert.equal(rr.ok, true, date);
    assert.equal(rr.skipped, 0, date);
    assert.deepEqual(rr.data.todayLearned, { date: null, wordKeys: [] }, date);
    assert.deepEqual(rr.data.learnedHistory, { "2026-10-29": 3 }, date);
  }
});

test("匯入 v2：略過數只計自訂單字與已掌握，與學習紀錄捨棄數無關", () => {
  const d = sampleData();
  d.customVocab = [item("c_1", "Ability"), item("c_2", "Bootstrap")];
  d.masteredWordKeys = ["ghost"];
  d.learnedHistory = { bad: 1, "2026-10-29": -5 };
  const r = B.importSteps(JSON.stringify(backupObj(d)), ctx());
  assert.equal(r.ok, true);
  assert.equal(r.skipped, 2);
});

test("匯入：ctx.today 缺省或不合法時以本地今天計", () => {
  const today = P.localDate(new Date());
  const d = sampleData();
  d.todayLearned = { date: today, wordKeys: ["x"] };
  d.learnedHistory = {};
  for (const t of [undefined, "2026-02-30", 123]) {
    const c = ctx();
    if (t === undefined) { delete c.today; } else { c.today = t; }
    const r = B.importSteps(JSON.stringify(backupObj(d)), c);
    assert.equal(r.ok, true, String(t));
    assert.deepEqual(r.data.todayLearned, { date: today, wordKeys: ["x"] }, String(t));
    assert.deepEqual(r.data.learnedHistory, { [today]: 1 }, String(t));
  }
});

test("匯入：支援版本字串為「1、2」（AC-24-06 訊息來源）；v2 匯出的備份可在同一天匯入", () => {
  assert.equal(C.SUPPORTED_SCHEMA_VERSIONS.join("、"), "1、2");
  const exp = B.buildBackup(sampleData(), "v", NOW);
  const r = B.importSteps(exp.json, ctx());
  assert.equal(r.ok, true);
  assert.deepEqual(r.data, sampleData());
});

test("匯入失敗時（v1／v2 各分支）不修改傳入的現有資料（V-IMP-01、AC-25-11）", () => {
  const current = sampleData();
  const snapshot = JSON.parse(JSON.stringify(current));
  const c = ctx({ current: current });
  const texts = [
    JSON.stringify(backupObj(null, { schemaVersion: 1 })),
    JSON.stringify(backupObj(Object.assign(sampleData(), { learnedHistory: [] }))),
    JSON.stringify(backupObj(Object.assign(sampleData(), { todayLearned: { date: 1, wordKeys: [] } }))),
    JSON.stringify(backupObj(sampleData(), { schemaVersion: 0 })),
    JSON.stringify(backupObj(sampleData(), { schemaVersion: "2" }))
  ];
  for (const t of texts) {
    const r = B.importSteps(t, c);
    assert.equal(r.ok, false);
    assert.deepEqual(current, snapshot);
  }
});
