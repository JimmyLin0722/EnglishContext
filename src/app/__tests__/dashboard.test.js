/*
 * dashboard.test.js — 主控台純邏輯與下載服務單元測試（FE-08 測試移入，FE-19；FE-31 今日學習進度）
 * 受測：views/dashboard.js（summaryOf、goalInfoOf、importMessage、ENTRIES（v0.5 FE-38 改由 NAV_TAB_ORDER 推導）、progressModel、ringGeometry）、services/download.js
 * 涵蓋：AC-17-04（正確率 0 題「—」、10 題 7 對 70%）、AC-24-05、AC-24-06、AC-24-09、契約 IM-6（R6-4 write_failed）；
 *       （FE-31）AC-30-02、AC-30-05、AC-30-07、AC-30-08、AC-30-10、AC-17-01 統計標籤
 */
"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");

const D = require("../views/dashboard.js");
const DL = require("../services/download.js");
const stats = require("../core/stats.js");

describe("dashboard.test.js", () => {
  const base = {
    goal: { draftScore: 600, appliedScore: 600, appliedColor: "green", effectiveColor: "green" },
    customVocab: [],
    masteredWordKeys: ["a", "b", "c"],
    vocabQuiz: { answered: 0, correct: 0 },
    part5: { currentIndex: 0, lockedSelection: null, phase: "question", roundAnswered: 0, roundCorrect: 0, totalAnswered: 0, totalCorrect: 0 },
    streak: { days: 4, lastActiveDate: "2026-10-29" },
    sttNoticeAcknowledged: false
  };

  // ── 統計（AC-17-04） ──

  test("統計：0 題 → —（引用 stats.accuracyText）", () => {
    const s = D.summaryOf(base, "2026-10-30");
    assert.equal(s.accuracy, "—");
    assert.equal(s.accuracy, stats.accuracyText(0, 0));
    assert.equal(s.mastered, 3);
    assert.equal(s.streakDays, 4);
  });

  test("統計：10 題 7 對 → 70%；中斷 → 0 天", () => {
    const d = { ...base, part5: { ...base.part5, totalAnswered: 10, totalCorrect: 7 } };
    const s = D.summaryOf(d, "2026-11-05");
    assert.equal(s.accuracy, "70%");
    assert.equal(s.streakDays, 0);
  });

  test("統計：資料缺漏不拋錯", () => {
    const s = D.summaryOf(null, "2026-10-30");
    assert.deepEqual(s, { streakDays: 0, mastered: 0, accuracy: "—" });
  });

  // ── 目標資訊 ──

  test("目標：600 綠", () => {
    const g = D.goalInfoOf(base.goal);
    assert.equal(g.appliedScore, "600");
    assert.equal(g.appliedColor, "綠");
    assert.equal(g.effectiveColor, "綠");
    assert.equal(g.daily, "15 字/天");
  });

  test("目標：730 藍 → 生效「綠（內建上限）」；860 金；每日新字量依生效色級（R6-2）", () => {
    let g = D.goalInfoOf({ draftScore: 730, appliedScore: 730, appliedColor: "blue", effectiveColor: "green" });
    assert.equal(g.appliedColor, "藍");
    assert.equal(g.effectiveColor, "綠（內建上限）");
    assert.equal(g.effectiveColorId, "green");
    assert.equal(g.daily, "15 字/天");
    g = D.goalInfoOf({ draftScore: 860, appliedScore: 860, appliedColor: "gold", effectiveColor: "green" });
    assert.equal(g.appliedColor, "金");
    assert.equal(g.effectiveColor, "綠（內建上限）");
    assert.equal(g.daily, "15 字/天");
  });

  test("目標：橘、棕；缺漏 → —", () => {
    assert.equal(D.goalInfoOf({ appliedScore: 100 }).appliedColor, "橘");
    assert.equal(D.goalInfoOf({ appliedScore: 300 }).daily, "10 字/天");
    assert.equal(D.goalInfoOf({ appliedScore: 100 }).daily, "10 字/天");
    assert.equal(D.goalInfoOf({ appliedScore: 725 }).daily, "15 字/天");
    const g = D.goalInfoOf(null);
    assert.equal(g.appliedScore, "—");
    assert.equal(g.effectiveColor, "—");
  });

  // ── 匯入訊息（AC-24-03～AC-24-09、IM-3、IM-5、IM-6） ──

  test("匯入訊息逐字", () => {
    assert.deepEqual(D.importMessage({ ok: true, skipped: 3 }), { text: "已匯入，略過 3 筆", kind: "success" });
    assert.equal(D.importMessage({ ok: true, skipped: 0 }).text, "已匯入，略過 0 筆");
    assert.equal(D.importMessage({ ok: false, error: "format" }).text, "備份檔格式錯誤，未匯入");
    assert.equal(D.importMessage({ ok: false, error: "quota" }).text, "儲存空間不足，未匯入");
    assert.equal(D.importMessage({ ok: false, error: "cancelled" }), null);
    assert.equal(D.importMessage(undefined).text, "備份檔格式錯誤，未匯入");
    assert.equal(D.importMessage({ ok: false, error: "version", fileVersion: null }).text,
      "備份檔版本不相容（檔案版本：無；支援版本：1、2）");
    assert.equal(D.importMessage({ ok: false, error: "version", fileVersion: 2 }).text,
      "備份檔版本不相容（檔案版本：2；支援版本：1、2）");
    assert.equal(D.importMessage({ ok: false, error: "version", fileVersion: 1.5 }).text,
      "備份檔版本不相容（檔案版本：1.5；支援版本：1、2）");
    assert.equal(D.importMessage({ ok: false, error: "version" }).text,
      "備份檔版本不相容（檔案版本：無；支援版本：1、2）");
  });

  test("匯入訊息：write_failed（非容量的寫入例外，IM-6、R6-4）→「儲存失敗，未匯入」，不與格式錯誤混用", () => {
    const m = D.importMessage({ ok: false, error: "write_failed" });
    assert.deepEqual(m, { text: "儲存失敗，未匯入", kind: "error" });
    assert.notEqual(m.text, D.importMessage({ ok: false, error: "format" }).text);
    assert.notEqual(m.text, D.importMessage({ ok: false, error: "quota" }).text);
  });

  test("匯入訊息：store 實際回傳的 write_failed／quota 對應正確文字（R6-4、AC-24-09）", async () => {
    const F = require("./_fixtures.js");
    const backup = (st) => st.actions.exportBackup().json;

    const w = F.makeStore();
    const json = backup(w.store);
    w.storage.otherError = true;
    const r1 = await w.a.importBackup(json, () => Promise.resolve(true));
    assert.equal(r1.ok, false);
    assert.equal(D.importMessage(r1).text, "儲存失敗，未匯入");

    const q = F.makeStore();
    q.storage.quota = true;
    const r2 = await q.a.importBackup(backup(q.store), () => Promise.resolve(true));
    assert.equal(D.importMessage(r2).text, "儲存空間不足，未匯入");
  });

  // ── 模組入口（v0.5，FE-38；AC-17-06、AC-20-04、契約 §5.8 HT-2） ──

  test("入口 4 個：customizer、flashcards、part5、sources；label = TAB_LABELS；不含隱藏頁", () => {
    const C = require("../core/constants.js");
    assert.deepEqual(D.ENTRIES.map((e) => e.tab), ["customizer", "flashcards", "part5", "sources"]);
    assert.deepEqual(D.ENTRIES.map((e) => e.label), ["難易度設定", "單字卡", "模擬測驗", "資料來源與授權"]);
    for (const e of D.ENTRIES) {
      assert.equal(e.label, C.TAB_LABELS[e.tab], e.tab);
      assert.ok(!C.HIDDEN_TAB_IDS.includes(e.tab), e.tab);
    }
  });

  test("入口由 NAV_TAB_ORDER 推導（去掉 dashboard、加 sources）；每次讀取回傳新陣列", () => {
    const C = require("../core/constants.js");
    assert.deepEqual(D.ENTRIES.map((e) => e.tab), C.NAV_TAB_ORDER.filter((t) => t !== "dashboard").concat("sources"));
    assert.notEqual(D.ENTRIES, D.ENTRIES);
  });

  test("原始碼：入口不寫死隱藏頁代碼（不含 entry(\"decoder\")／entry(\"phrasebank\")）", () => {
    const fs = require("node:fs");
    const path = require("node:path");
    const src = fs.readFileSync(path.join(__dirname, "..", "views", "dashboard.js"), "utf8");
    assert.doesNotMatch(src, /entry\(\s*["'](?:decoder|phrasebank)["']\s*\)/);
    assert.match(src, /NAV_TAB_ORDER/);
  });

  // ── 今日學習進度（FE-31；architecture.md §10.1） ──

  const TODAY = "2026-10-30";
  const goalOf = (score) => {
    const g = require("../core/goal.js");
    const c = g.colorOf(score);
    return { draftScore: score, appliedScore: score, appliedColor: c, effectiveColor: g.effectiveColorOf(c) };
  };
  const keys = (n, p = "w") => Array.from({ length: n }, (_, i) => p + i);
  /** 組 store.getState() 形狀的 state */
  const stateOf = (dataPatch = {}, runtimePatch = {}) => ({
    data: { ...base, todayLearned: { date: null, wordKeys: [] }, learnedHistory: {}, ...dataPatch },
    runtime: { studySet: [], ...runtimePatch }
  });
  const noBad = (m) => {
    const txt = JSON.stringify(m);
    assert.ok(!/NaN|Infinity|null%|undefined/.test(txt), txt);
  };

  test("progressModel AC-30-02：生效色級橘 → D 10、綠 → 15、套用 730（目標藍、生效綠）→ 15", () => {
    assert.equal(D.progressModel(stateOf({ goal: goalOf(100) }), TODAY).today.d, 10);
    assert.equal(D.progressModel(stateOf({ goal: goalOf(300) }), TODAY).today.d, 10);
    assert.equal(D.progressModel(stateOf({ goal: goalOf(600) }), TODAY).today.d, 15);
    assert.equal(D.progressModel(stateOf({ goal: goalOf(730) }), TODAY).today.d, 15);
    assert.equal(D.progressModel(stateOf({ goal: goalOf(860) }), TODAY).today.d, 15);
  });

  test("progressModel AC-30-05：14/15 未達、15/15 滿圈達成、18/15 維持滿圈", () => {
    const at = (n) => D.progressModel(stateOf({ goal: goalOf(600), todayLearned: { date: TODAY, wordKeys: keys(n) } }), TODAY);
    let m = at(14);
    assert.equal(m.today.x, 14);
    assert.equal(m.today.done, false);
    assert.equal(m.today.text, "今日已學 14 / 15 字");
    assert.equal(m.today.doneText, "");
    assert.ok(Math.abs(m.today.ratio - 14 / 15) < 1e-9);
    m = at(15);
    assert.equal(m.today.done, true);
    assert.equal(m.today.ratio, 1);
    assert.equal(m.today.text, "今日已學 15 / 15 字");
    assert.equal(m.today.doneText, "今日目標達成");
    m = at(18);
    assert.equal(m.today.text, "今日已學 18 / 15 字");
    assert.equal(m.today.centerText, "18 / 15");
    assert.equal(m.today.done, true);
    assert.equal(m.today.ratio, 1);
    // 滿圈：dashoffset = 0
    assert.equal(Number(D.ringGeometry(m.today.ratio).dashoffset), 0);
  });

  test("progressModel AC-30-07：同一 data，today 前進一天 → X = 0、長條最右為新日期、前一日保留 5", () => {
    const st = stateOf({
      goal: goalOf(600),
      todayLearned: { date: TODAY, wordKeys: keys(5) },
      learnedHistory: { [TODAY]: 5 }
    });
    const before = D.progressModel(st, TODAY);
    assert.equal(before.today.x, 5);
    assert.equal(before.bars.at(-1).date, TODAY);
    assert.equal(before.bars.at(-1).count, 5);

    const m = D.progressModel(st, "2026-10-31");
    assert.equal(m.today.x, 0);
    assert.equal(m.today.text, "今日已學 0 / 15 字");
    assert.equal(m.bars.length, 7);
    assert.equal(m.bars.at(-1).date, "2026-10-31");
    assert.equal(m.bars.at(-1).label, "10/31");
    assert.equal(m.bars.at(-1).count, 0);
    assert.equal(m.bars.at(-2).date, TODAY);
    assert.equal(m.bars.at(-2).count, 5);
    // 不修改傳入值
    assert.deepEqual(st.data.todayLearned.wordKeys, keys(5));
    assert.deepEqual(st.data.learnedHistory, { [TODAY]: 5 });
  });

  test("progressModel AC-30-08：3、0、0、10、0、0、4，日期由左到右、高度與字數成比例", () => {
    const m = D.progressModel(stateOf({
      todayLearned: { date: TODAY, wordKeys: keys(4) },
      learnedHistory: { "2026-10-24": 3, "2026-10-27": 10, [TODAY]: 4 }
    }), TODAY);
    assert.deepEqual(m.bars.map((b) => b.count), [3, 0, 0, 10, 0, 0, 4]);
    assert.deepEqual(m.bars.map((b) => b.label), ["10/24", "10/25", "10/26", "10/27", "10/28", "10/29", "10/30"]);
    assert.deepEqual(m.bars.map((b) => b.isToday), [false, false, false, false, false, false, true]);
    assert.equal(m.maxCount, 10);
    assert.deepEqual(m.bars.map((b) => b.heightPct), [30, 0, 0, 100, 0, 0, 40]);
  });

  test("progressModel AC-30-08：今天那根一律用 X（歷史值不一致時以 X 為準）；全 0 → 高度 0", () => {
    let m = D.progressModel(stateOf({
      todayLearned: { date: TODAY, wordKeys: keys(2) },
      learnedHistory: { [TODAY]: 9 }
    }), TODAY);
    assert.equal(m.bars.at(-1).count, 2);
    m = D.progressModel(stateOf(), TODAY);
    assert.deepEqual(m.bars.map((b) => b.heightPct), [0, 0, 0, 0, 0, 0, 0]);
    assert.equal(m.maxCount, 0);
    noBad(m);
  });

  test("progressModel AC-30-10：200 字中掌握 50、另 10 個不在單字集 → 25%；10 題 7 對 → 70%", () => {
    const set = keys(200).map((k) => ({ wordKey: k }));
    const mastered = keys(50).concat(keys(10, "x"));
    const m = D.progressModel(stateOf(
      { masteredWordKeys: mastered, part5: { ...base.part5, totalAnswered: 10, totalCorrect: 7 } },
      { studySet: set }
    ), TODAY);
    assert.equal(m.mastery.label, "目前單字集掌握率");
    assert.equal(m.mastery.numer, 50);
    assert.equal(m.mastery.denom, 200);
    assert.equal(m.mastery.text, "25%");
    assert.equal(m.mastery.ratio, 0.25);
    assert.equal(m.accuracy.label, "模擬測驗正確率");
    assert.equal(m.accuracy.text, "70%");
    assert.equal(m.accuracy.ratio, 0.7);
    // 環形填滿比例與數字一致（誤差 ≤ 1 個百分點）
    const g = D.ringGeometry(m.mastery.ratio);
    const filled = 1 - Number(g.dashoffset) / Number(g.dasharray);
    assert.ok(Math.abs(filled * 100 - 25) <= 1);
    // 與統計區正確率文字一致（AC-17-04 四捨五入規則）
    assert.equal(m.accuracy.text, stats.accuracyText(10, 7));
  });

  test("progressModel AC-30-10：單字集為空、答題數 0 → 空環「—」，不出現 NaN、Infinity", () => {
    const m = D.progressModel(stateOf(), TODAY);
    assert.equal(m.mastery.percent, null);
    assert.equal(m.mastery.text, "—");
    assert.equal(m.mastery.ratio, 0);
    assert.equal(m.accuracy.percent, null);
    assert.equal(m.accuracy.text, "—");
    assert.equal(m.accuracy.ratio, 0);
    const g = D.ringGeometry(0);
    assert.equal(g.dashoffset, g.dasharray); // 空環
    noBad(m);
  });

  test("progressModel：state 缺漏或欄位異常不拋錯，D 退回 15", () => {
    for (const st of [null, undefined, {}, { data: null, runtime: null }, { data: { part5: { totalAnswered: NaN, totalCorrect: 1 } } }]) {
      const m = D.progressModel(st, TODAY);
      assert.equal(m.today.x, 0);
      assert.equal(m.today.d, 15);
      assert.equal(m.today.text, "今日已學 0 / 15 字");
      assert.equal(m.bars.length, 7);
      noBad(m);
    }
  });

  test("ringGeometry：比例夾在 0～1；異常值視為空環", () => {
    const full = D.ringGeometry(1);
    assert.equal(Number(full.dashoffset), 0);
    assert.equal(D.ringGeometry(2).dashoffset, full.dashoffset);
    assert.equal(D.ringGeometry(-1).dashoffset, full.dasharray);
    assert.equal(D.ringGeometry(NaN).dashoffset, full.dasharray);
    assert.equal(D.ringGeometry(Infinity).dashoffset, full.dasharray);
    const half = D.ringGeometry(0.5);
    assert.ok(Math.abs(Number(half.dashoffset) - Number(half.dasharray) / 2) < 0.01);
  });

  test("重繪 tag：learning、goal、studySet、part5、flashcard、storage 等觸發；無關 tag 不觸發", () => {
    for (const t of ["learning", "goal", "studySet", "part5", "flashcard", "storage"]) {
      assert.equal(D.progressAffected([t]), true, t);
    }
    assert.equal(D.progressAffected(["decoder", "phrasebank"]), false);
    assert.equal(D.progressAffected(undefined), true);
  });

  test("畫面文字逐字（AC-30-01、AC-30-05、AC-30-10、AC-17-01）", () => {
    assert.equal(D.TEXT.goalDone, "今日目標達成");
    assert.equal(D.TEXT.masteryRate, "目前單字集掌握率");
    assert.equal(D.TEXT.accuracyRate, "模擬測驗正確率");
    assert.equal(D.TEXT.accuracy, "模擬測驗正確率");
    assert.equal(D.TEXT.empty, "—");
  });

  test("dashboard.js 無禁用 API、無網路 API、無外部網址（C-7、離線）", () => {
    const fs = require("node:fs");
    const path = require("node:path");
    const src = fs.readFileSync(path.join(__dirname, "../views/dashboard.js"), "utf8");
    for (const bad of [/innerHTML/, /outerHTML/, /insertAdjacentHTML/, /document\.write/, /\bfetch\s*\(/,
      /XMLHttpRequest/, /WebSocket/, /sendBeacon/, /\beval\s*\(/, /new Function/, /xmlns/, /https?:/]) {
      assert.ok(!bad.test(src), String(bad));
    }
  });

  // ── 下載服務（AC-24-01） ──

  function fakeEnv(opts = {}) {
    const log = [];
    const body = {
      children: [],
      appendChild(n) { this.children.push(n); log.push("append"); },
      removeChild(n) { this.children.splice(this.children.indexOf(n), 1); log.push("remove"); }
    };
    const timers = [];
    const env = {
      Blob: function (parts, o) { this.parts = parts; this.type = o.type; log.push("blob:" + o.type); },
      URL: { createObjectURL: () => { log.push("create"); return "blob:x"; }, revokeObjectURL: (u) => log.push("revoke:" + u) },
      setTimeout: (fn, ms) => { timers.push([fn, ms]); },
      document: {
        body,
        createElement: () => {
          const a = {
            attrs: {},
            setAttribute(k, v) { this.attrs[k] = v; },
            click() { if (opts.throwClick) throw new Error("x"); log.push("click:" + this.attrs.download); },
            get parentNode() { return body.children.includes(a) ? body : null; }
          };
          return a;
        }
      }
    };
    return { env, log, timers };
  }

  test("download：Blob → createObjectURL → a download → click → 延遲 revoke", () => {
    const { env, log, timers } = fakeEnv();
    const svc = DL.create(env);
    assert.equal(svc.saveText("f-20261030.json", "{}", "application/json"), true);
    assert.deepEqual(log, ["blob:application/json", "create", "append", "click:f-20261030.json", "remove"]);
    assert.equal(timers.length, 1);
    timers[0][0]();
    assert.equal(log.at(-1), "revoke:blob:x");
  });

  test("download：不支援 → false；click 拋錯 → false 並釋放", () => {
    assert.equal(DL.create({}).saveText("a", "b"), false);
    const { env, log } = fakeEnv({ throwClick: true });
    assert.equal(DL.create(env).saveText("a.json", "{}"), false);
    assert.ok(log.includes("revoke:blob:x"));
  });
});
