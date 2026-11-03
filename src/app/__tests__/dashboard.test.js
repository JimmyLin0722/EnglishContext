/*
 * dashboard.test.js — 主控台純邏輯與下載服務單元測試（FE-08 測試移入，FE-19；FE-31 今日學習進度）
 * 受測：views/dashboard.js（goalInfoOf、importMessage、progressModel、dashboardModel、ringGeometry）、services/download.js
 * 涵蓋：AC-17-04（正確率 0 題「—」、10 題 7 對 70%）、AC-24-05、AC-24-06、AC-24-09、契約 IM-6（R6-4 write_failed）；
 *       （FE-31）AC-30-02、AC-30-05、AC-30-07、AC-30-08、AC-30-10、AC-17-01 統計標籤
 * v0.12（FE-58；architecture.md v0.8 §7.19.4、§10.5 dashboard.test.js 列；契約 DB-1～DB-6、V-LAY-07、V-LAY-08）：
 *       移除 summaryOf、ENTRIES（功能入口）案例；新增 dashboardModel 與假 DOM 版面案例（區塊順序、AC-39-06 文字次數、
 *       「開始今日學習」「變更」的 data-go、收合區塊與 setItem 0 次、收合時 NT-1 與安裝鈕不顯示）。
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

  // ── 3 格數據（AC-17-04、AC-39-05；v0.12 summaryOf 併入 dashboardModel） ──

  test("summaryOf、ENTRIES 已移除（v0.12，DB-1）", () => {
    assert.equal("summaryOf" in D, false);
    assert.equal("ENTRIES" in D, false);
  });

  // ── 目標資訊 ──

  test("目標：600 綠（既有分數 fixture）；回傳不含 appliedScore（AC-17-06、AC-26-05 (c)）", () => {
    const g = D.goalInfoOf(base.goal);
    assert.equal("appliedScore" in g, false);
    assert.equal(g.appliedColor, "綠");
    assert.equal(g.effectiveColor, "綠");
    assert.equal(g.daily, "15 字/天");
  });

  // （v0.9，FE-66；DB-4 v0.14、E-92）生效色級不再附加「（內建上限）」
  test("目標：855 藍 → 生效「綠」（無「內建上限」）；990 金；每日新字量依生效色級（R6-2）", () => {
    let g = D.goalInfoOf({ draftScore: 855, appliedScore: 855, appliedColor: "blue", effectiveColor: "green" });
    assert.equal("appliedScore" in g, false);
    assert.equal(g.appliedColor, "藍");
    assert.equal(g.effectiveColor, "綠");
    assert.equal(g.effectiveColorId, "green");
    assert.equal(g.daily, "15 字/天");
    g = D.goalInfoOf({ draftScore: 990, appliedScore: 990, appliedColor: "gold", effectiveColor: "green" });
    assert.equal(g.appliedColor, "金");
    assert.equal(g.effectiveColor, "綠");
    assert.ok(!g.effectiveColor.includes("內建上限"));
    assert.equal(g.daily, "15 字/天");
  });

  test("目標：橘、棕；缺漏 → —", () => {
    assert.equal(D.goalInfoOf({ appliedScore: 100 }).appliedColor, "橘");
    assert.equal(D.goalInfoOf({ appliedScore: 300 }).daily, "10 字/天");
    assert.equal(D.goalInfoOf({ appliedScore: 100 }).daily, "10 字/天");
    assert.equal(D.goalInfoOf({ appliedScore: 725 }).daily, "15 字/天");
    const g = D.goalInfoOf(null);
    assert.equal("appliedScore" in g, false);
    assert.equal(g.appliedColor, "—");
    assert.equal(g.effectiveColor, "—");
  });

  test("（v0.10，FE-43）原始碼掃描：dashboard.js 不含「目前目標分數」，TEXT 無 appliedScore（AC-17-06、AC-26-05 (c)）", () => {
    const fs = require("node:fs");
    const path = require("node:path");
    const src = fs.readFileSync(path.join(__dirname, "..", "views", "dashboard.js"), "utf8");
    assert.ok(!src.includes("目前目標分數"));
    assert.equal("appliedScore" in D.TEXT, false);
    // 色級仍由 appliedScore 推導（欄位值與分數不一致時以分數為準）
    assert.equal(D.goalInfoOf({ appliedScore: 300, appliedColor: "green", effectiveColor: "green" }).appliedColor, "棕");
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

  test("原始碼：主控台不再有模組入口（無 NAV_TAB_ORDER 推導、無 data-go sources／part5）（DB-1、AC-39-06）", () => {
    const fs = require("node:fs");
    const path = require("node:path");
    const src = fs.readFileSync(path.join(__dirname, "..", "views", "dashboard.js"), "utf8");
    assert.doesNotMatch(src, /NAV_TAB_ORDER/);
    assert.doesNotMatch(src, /"data-go":\s*"(?:sources|part5|decoder|phrasebank)"/);
    assert.doesNotMatch(src, /dash-entr/);
    // view 不呼叫 setTab 或任何寫入 action（「開始今日學習」「變更」只走 [data-go]，DB-3）
    assert.doesNotMatch(src, /\.setTab\s*\(/);
    assert.doesNotMatch(src, /router\.go\s*\(/);
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
    // （v0.12，SD-FB-40）環形圖中央只顯示 X
    assert.equal(m.today.centerText, "18");
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
    assert.equal(m.mastery.label, "單字掌握率");
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

  test("畫面文字逐字（AC-30-01、AC-30-05、AC-30-10、AC-17-01）；v0.11 舊標籤已移除（AC-39-06）", () => {
    assert.equal(D.TEXT.goalDone, "今日目標達成");
    assert.equal(D.TEXT.accuracy, "模擬測驗正確率");
    assert.equal(D.TEXT.empty, "—");
    assert.equal(D.TEXT.todayTitle, "今日任務");
    assert.equal(D.TEXT.chartTitle, "近 7 天已學字數");
    const all = JSON.stringify(D.TEXT);
    for (const bad of ["單字掌握數", "目前目標色級", "目前生效色級", "功能入口", "學習統計", "目前目標", "今日學習進度", "目前單字集掌握率"]) {
      assert.ok(!all.includes(bad), bad);
    }
  });

  // ── dashboardModel（v0.12，FE-58；DB-2～DB-6） ──

  test("dashboardModel AC-39-05：打卡 3 天、200 字掌握 50（另 10 不在單字集）、10 題 7 對 → 「3」「天」「25%」「已掌握 60 字」「70%」", () => {
    const set = keys(200).map((k) => ({ wordKey: k }));
    const m = D.dashboardModel(stateOf(
      {
        masteredWordKeys: keys(50).concat(keys(10, "x")),
        part5: { ...base.part5, totalAnswered: 10, totalCorrect: 7 },
        streak: { days: 3, lastActiveDate: TODAY },
      },
      { studySet: set }
    ), TODAY);
    assert.deepEqual(m.stats, {
      streakValue: "3",
      streakUnit: "天",
      masteryText: "25%",
      masteredText: "已掌握 60 字",
      accuracyText: "70%",
    });
    assert.equal(m.stats.accuracyText, stats.accuracyText(10, 7));
  });

  test("dashboardModel：空資料 → 掌握率、正確率「—」、已掌握 0 字、打卡 0；不出現 NaN／Infinity（AC-30-10、E-48）", () => {
    for (const st of [stateOf(), null, {}, { data: null, runtime: null }]) {
      const m = D.dashboardModel(st, TODAY);
      assert.equal(m.stats.masteryText, "—");
      assert.equal(m.stats.accuracyText, "—");
      assert.equal(m.stats.masteredText.startsWith("已掌握 "), true);
      noBad(m);
    }
    const m = D.dashboardModel(stateOf({ masteredWordKeys: [], streak: { days: 0, lastActiveDate: null } }), TODAY);
    assert.equal(m.stats.masteredText, "已掌握 0 字");
    assert.equal(m.stats.streakValue, "0");
  });

  test("dashboardModel AC-30-05：X = 18、D = 15 → text「今日已學 18 / 15 字」、centerText「18」、done", () => {
    const m = D.dashboardModel(stateOf({ goal: goalOf(600), todayLearned: { date: TODAY, wordKeys: keys(18) } }), TODAY);
    assert.equal(m.today.text, "今日已學 18 / 15 字");
    assert.equal(m.today.centerText, "18");
    assert.equal(m.today.done, true);
    assert.equal(m.today.doneText, "今日目標達成");
  });

  // （v0.9，FE-66；DB-4 v0.14、AC-39-04）目標行只以生效色級組字，colorId 為生效色級，不再有 capped
  test("dashboardModel 目標行 5 色逐字（DB-4 v0.14；只看生效色級，不看 draftScore、appliedColor）", () => {
    const want = [
      [215, "橘級・每日 10 字", "orange"],
      [465, "棕級・每日 10 字", "brown"],
      [725, "綠級・每日 15 字", "green"],
      [855, "綠級・每日 15 字", "green"],
      [990, "綠級・每日 15 字", "green"],
    ];
    for (const [score, text, colorId] of want) {
      const g = { ...goalOf(score), draftScore: 10 }; // 草稿不同也不影響
      const m = D.dashboardModel(stateOf({ goal: g }), TODAY);
      assert.deepEqual(m.goal, { text, colorId }, String(score));
      assert.ok(!/分/.test(m.goal.text));
      assert.ok(!m.goal.text.endsWith("・"), "結尾無「・」");
      for (const w of ["目標", "生效", "內建上限", "藍", "金"]) assert.ok(!m.goal.text.includes(w), score + "：" + w);
    }
    assert.equal(D.dashboardModel(stateOf({ goal: null }), TODAY).goal.text, "—");
  });

  test("dashboardModel 近 7 天：全 0 → chart.empty；任一 > 0 → 非空（AC-39-07、§5.4 v0.12 段）", () => {
    assert.equal(D.dashboardModel(stateOf(), TODAY).chart.empty, true);
    assert.equal(D.dashboardModel(stateOf({ learnedHistory: { "2026-10-25": 0 } }), TODAY).chart.empty, true);
    const m = D.dashboardModel(stateOf({ todayLearned: { date: TODAY, wordKeys: keys(1) } }), TODAY);
    assert.equal(m.chart.empty, false);
    assert.equal(m.chart.bars.length, 7);
    assert.equal(m.chart.bars.at(-1).count, 1);
    assert.equal(D.dashboardModel(stateOf({ learnedHistory: { "2026-10-27": 10 } }), TODAY).chart.empty, false);
  });

  test("dashboardModel backupExpanded：依 runtime.dashboard（缺漏 → false）", () => {
    assert.equal(D.dashboardModel(stateOf(), TODAY).backupExpanded, false);
    assert.equal(D.dashboardModel(stateOf({}, { dashboard: { backupExpanded: true } }), TODAY).backupExpanded, true);
    assert.equal(D.dashboardModel(stateOf({}, { dashboard: { backupExpanded: "true" } }), TODAY).backupExpanded, false);
  });

  test("PROGRESS_TAGS、INSTALL_TAGS 含 \"dashboard\"", () => {
    assert.ok(D.PROGRESS_TAGS.includes("dashboard"));
    assert.ok(D.INSTALL_TAGS.includes("dashboard"));
    assert.equal(D.progressAffected(["dashboard"]), true);
    assert.equal(D.installAffected(["dashboard"]), true);
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

// ─────────────────────────────────────────────────────────────
// （v0.11，FE-51）備份區塊的不互通說明（NT-1）與「安裝 App」按鈕（IN-1、IN-4、IN-5）
// 依據：architecture.md v0.7 §4.7「views/dashboard.js」段、§7.18.6、§7.18.7、§10.4「dashboard.test.js」列
// 涵蓋：AC-24-12、AC-34-07～AC-34-10
// 做法：極簡假 DOM ＋ node:vm 依瀏覽器方式載入 core 模組與 views/dashboard.js；store 用 _fixtures 的真實 store（Node 版）
// ─────────────────────────────────────────────────────────────

describe("dashboard.test.js：NT-1 與安裝按鈕（v0.11，FE-51）", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const vm = require("node:vm");
  const F = require("./_fixtures.js");
  const PWA = require("../core/pwa.js");
  const APP_DIR = path.join(__dirname, "..");
  const read = (rel) => fs.readFileSync(path.join(APP_DIR, rel), "utf8");

  const NT1 = "學習紀錄只存在目前的瀏覽器與網址；檔案版、網頁版、主畫面 App 彼此不互通，可用匯出備份／匯入轉移";

  /** 極簡假節點：hidden 屬性與 hidden 特性同步 */
  function makeNode(tag) {
    const listeners = {};
    const classes = new Set();
    const n = {
      nodeType: tag === "#text" ? 3 : 1,
      tagName: tag.toUpperCase(),
      attrs: {},
      childNodes: [],
      style: {},
      disabled: false,
      _text: "",
      listeners,
      parentNode: null,
      classList: {
        add: (c) => classes.add(c),
        remove: (c) => classes.delete(c),
        contains: (c) => classes.has(c),
        toggle: (c, force) => {
          const on = force === undefined ? !classes.has(c) : !!force;
          if (on) classes.add(c); else classes.delete(c);
          return on;
        }
      },
      get className() { return [...classes].join(" "); },
      set className(v) { classes.clear(); String(v).split(/\s+/).filter(Boolean).forEach((c) => classes.add(c)); },
      get hidden() { return Object.prototype.hasOwnProperty.call(this.attrs, "hidden"); },
      set hidden(v) { if (v) this.attrs.hidden = ""; else delete this.attrs.hidden; },
      setAttribute(k, v) { if (k === "class") this.className = v; else this.attrs[k] = String(v); },
      getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
      removeAttribute(k) { delete this.attrs[k]; },
      addEventListener(t, fn) { (listeners[t] = listeners[t] || []).push(fn); },
      appendChild(c) { this.childNodes.push(c); c.parentNode = this; return c; },
      removeChild(c) { this.childNodes.splice(this.childNodes.indexOf(c), 1); c.parentNode = null; return c; },
      get firstChild() { return this.childNodes[0] || null; },
      get nextElementSibling() {
        const p = this.parentNode;
        if (!p) return null;
        const sib = p.childNodes.filter((c) => c.nodeType === 1);
        return sib[sib.indexOf(this) + 1] || null;
      },
      get textContent() { return this.nodeType === 3 ? this._text : this._text + this.childNodes.map((c) => c.textContent).join(""); },
      set textContent(v) { this.childNodes = []; this._text = String(v); },
      click() { if (!this.disabled) (listeners.click || []).forEach((fn) => fn({ type: "click", target: this })); }
    };
    return n;
  }

  function findAll(n, pred, out = []) {
    if (n.nodeType === 1 && pred(n)) out.push(n);
    for (const c of n.childNodes || []) findAll(c, pred, out);
    return out;
  }
  const byClass = (root, cls) => findAll(root, (n) => n.classList.contains(cls));

  /**
   * 載入 dashboard 並 mount。
   * @param {{ pwa?: object, tab?: string, firstRun?: boolean, noService?: boolean }} [o]
   */
  function setup(o = {}) {
    const document = {
      createElement: (t) => makeNode(t),
      createElementNS: (ns, t) => makeNode(t),
      createTextNode: (t) => { const n = makeNode("#text"); n._text = t; return n; }
    };
    const sandbox = { document, console: { log() {}, warn() {}, error() {} } };
    sandbox.self = sandbox;
    sandbox.window = sandbox;
    vm.createContext(sandbox);
    for (const rel of ["core/constants.js", "core/wordkey.js", "core/dom.js", "core/goal.js", "core/layout.js", "core/streak.js",
      "core/stats.js", "core/learning.js", "core/pwa.js"]) {
      vm.runInContext(read(rel), sandbox, { filename: rel });
    }
    const views = {};
    sandbox.EMT.views = { register: (tab, m) => { views[tab] = m; } };
    const calls = { install: 0 };
    if (!o.noService) {
      sandbox.EMT.services = { pwa: { requestInstall: () => { calls.install++; return Promise.resolve(); } } };
    }
    let preset;
    if (o.goal) {
      // （v0.9，FE-66）以指定 goal 預寫 schemaVersion 2 主鍵（模擬已套用藍／金後重新載入）
      const PERSIST = require("../core/persist.js");
      const data = PERSIST.defaultData();
      data.goal = o.goal;
      preset = F.fakeStorage({ "englishMasterTrack:state": JSON.stringify(PERSIST.buildRecord(data, new Date("2026-10-29T00:00:00Z"))) });
    }
    const { store, a, storage } = F.makeStore({ firstRun: o.firstRun, storage: preset });
    if (o.pwa) a.setPwa(o.pwa);
    if (o.tab) a.setTab(o.tab);
    // （v0.12，FE-58）預設展開「資料備份」（v0.11 既有案例檢查的是展開後的內容；收合行為另有案例）
    if (o.expanded !== false) a.setBackupExpanded(true);
    sandbox.EMT.store = store;
    vm.runInContext(read("views/dashboard.js"), sandbox, { filename: "views/dashboard.js" });
    const view = views.dashboard;
    const rootEl = makeNode("section");
    view.mount(rootEl);
    const backup = byClass(rootEl, "db-backup")[0];
    return { sandbox, store, a, storage, view, rootEl, backup, calls };
  }

  const installBox = (s) => byClass(s.rootEl, "dash-backup__install")[0];
  const installButtons = (s) => findAll(s.rootEl, (n) => n.getAttribute("data-action") === "install-app");
  const AVAILABLE = { eligible: true, standalone: false, installPromptAvailable: true, installSuppressed: false };

  test("NT-1：文字逐字、為按鈕列（匯出／匯入）的下一個兄弟節點；eligible 真假皆存在（AC-24-12）", () => {
    for (const pwa of [undefined, { eligible: true }]) {
      const s = setup({ pwa });
      const origin = byClass(s.backup, "dash-backup__origin");
      assert.equal(origin.length, 1);
      assert.equal(origin[0].tagName, "P");
      assert.equal(origin[0].textContent, NT1);
      assert.equal(origin[0].textContent, PWA.PWA_TEXTS.backupOriginNotice);
      const row = byClass(s.backup, "btn-row")[0];
      assert.ok(row.textContent.includes("匯出備份") && row.textContent.includes("匯入備份"));
      assert.equal(row.nextElementSibling, origin[0]);
      // 安裝區在 NT-1 之後
      assert.equal(origin[0].nextElementSibling, installBox(s));
    }
  });

  test("installVisible 假（初始、file://）：容器 hidden 且無子節點、無按鈕", () => {
    const s = setup();
    assert.equal(installBox(s).hidden, true);
    assert.equal(installBox(s).childNodes.length, 0);
    assert.equal(installButtons(s).length, 0);
  });

  test("installVisible 真：恰 1 個「安裝 App」按鈕（class、type、data-action）；點擊呼叫 requestInstall 1 次", () => {
    const s = setup({ pwa: AVAILABLE });
    const btns = installButtons(s);
    assert.equal(btns.length, 1);
    assert.equal(installBox(s).hidden, false);
    assert.equal(btns[0].textContent, "安裝 App");
    assert.equal(btns[0].tagName, "BUTTON");
    assert.equal(btns[0].getAttribute("type"), "button");
    assert.equal(btns[0].className, "btn btn--secondary dash-install");
    btns[0].click();
    assert.equal(s.calls.install, 1);
  });

  test("\"pwa\" tag 後依狀態增刪：事件到達 → 出現；requestInstall 前 suppressed → 消失；不重複建立", () => {
    const s = setup({ pwa: { eligible: true } });
    assert.equal(installButtons(s).length, 0);
    s.a.setPwa({ installPromptAvailable: true });
    assert.equal(installButtons(s).length, 1);
    s.a.setPwa({ lastUpdateCheckAt: 5 }); // 其他 pwa 欄位改變：按鈕不重複
    assert.equal(installButtons(s).length, 1);
    s.a.setPwa({ installPromptAvailable: false, installSuppressed: true });
    assert.equal(installButtons(s).length, 0);
    assert.equal(installBox(s).hidden, true);
    assert.equal(installBox(s).childNodes.length, 0);
  });

  test("（v0.12，IN-1）「資料備份」收合時 NT-1 與安裝鈕都不顯示；展開後 NT-1 為按鈕列下一個兄弟、安裝鈕出現（AC-24-12、AC-34-07、AC-34-08）", () => {
    const s = setup({ pwa: AVAILABLE, expanded: false });
    const body = byClass(s.rootEl, "db-backup__body")[0];
    assert.equal(body.hidden, true);
    assert.equal(installButtons(s).length, 0);
    assert.equal(installBox(s).hidden, true);
    const toggle = byClass(s.rootEl, "db-backup__toggle")[0];
    toggle.click();
    assert.equal(body.hidden, false);
    assert.equal(installButtons(s).length, 1);
    const origin = byClass(s.backup, "dash-backup__origin")[0];
    assert.equal(byClass(s.backup, "btn-row")[0].nextElementSibling, origin);
    toggle.click();
    assert.equal(body.hidden, true);
    assert.equal(installButtons(s).length, 0);
  });

  test("standalone、installSuppressed、非主控台頁、首次模式 → 不顯示", () => {
    assert.equal(installButtons(setup({ pwa: Object.assign({}, AVAILABLE, { standalone: true }) })).length, 0);
    assert.equal(installButtons(setup({ pwa: Object.assign({}, AVAILABLE, { installSuppressed: true }) })).length, 0);
    assert.equal(installButtons(setup({ pwa: AVAILABLE, tab: "flashcards" })).length, 0);
    assert.equal(installButtons(setup({ pwa: AVAILABLE, firstRun: true })).length, 0);
  });

  test("show() 重繪：切到其他頁時事件到達，回主控台 show() 後出現", () => {
    const s = setup({ pwa: { eligible: true }, tab: "flashcards" });
    s.a.setPwa({ installPromptAvailable: true });
    assert.equal(installButtons(s).length, 0);
    s.a.setTab("dashboard");
    s.view.show();
    assert.equal(installButtons(s).length, 1);
  });

  test("services.pwa 不存在時點擊不做事、不拋例外；點擊不換頁、不改學習資料", () => {
    const s = setup({ pwa: AVAILABLE, noService: true });
    const before = JSON.stringify(s.store.getState().data);
    assert.doesNotThrow(() => installButtons(s)[0].click());
    assert.equal(s.store.getState().runtime.currentTab, "dashboard");
    assert.equal(JSON.stringify(s.store.getState().data), before);
  });

  test("原始碼：不自動 prompt、無安裝橫幅或 iOS 說明（IN-4）；文字取 PWA_TEXTS", () => {
    const src = read("views/dashboard.js");
    assert.ok(!/\.prompt\(/.test(src));
    assert.ok(!src.includes("beforeinstallprompt"));
    assert.ok(src.includes("PWA_TEXTS.installButton"));
    assert.ok(src.includes("PWA_TEXTS.backupOriginNotice"));
    assert.deepEqual([...D.INSTALL_TAGS].includes("pwa"), true);
    assert.equal(D.installAffected(["pwa"]), true);
    assert.equal(D.installAffected(["flashcard"]), false);
  });

  // ── v0.12 版面（FE-58；DB-1～DB-6、V-LAY-07、V-LAY-08） ──

  /** 主控台本體（.dashboard）的直接子節點 */
  const bodyOf = (s) => byClass(s.rootEl, "dashboard")[0];
  /** 計算文字在本體中出現的次數 */
  const countText = (s, t) => bodyOf(s).textContent.split(t).length - 1;

  test("DB-1：本體 = 標題「學習主控台」→ 今日任務 → 3 格數據 → 近 7 天 → 資料備份（恰 4 個 section）", () => {
    const s = setup({ expanded: false });
    const kids = bodyOf(s).childNodes.filter((n) => n.nodeType === 1);
    assert.equal(kids[0].tagName, "H2");
    assert.equal(kids[0].textContent, "學習主控台");
    const sections = kids.slice(1);
    assert.equal(sections.length, 4);
    assert.ok(sections.every((n) => n.tagName === "SECTION" && n.classList.contains("card")));
    assert.deepEqual(sections.map((n) => ["db-today", "db-stats", "db-chart", "db-backup"].find((c) => n.classList.contains(c))),
      ["db-today", "db-stats", "db-chart", "db-backup"]);
    // 今日任務卡標題與圖表標題（SD-FB-41）；3 格數據區以 aria-label 命名
    assert.equal(byClass(sections[0], "section-title")[0].textContent, "今日任務");
    assert.equal(byClass(sections[2], "section-title")[0].textContent, "近 7 天已學字數");
    assert.equal(sections[1].getAttribute("aria-label"), "學習數據");
  });

  test("AC-39-06：列舉文字各 1 次；無舊標籤、無功能入口、無 data-go=sources；色級名稱只在目標行", () => {
    const s = setup({ expanded: true });
    for (const t of ["模擬測驗正確率", "單字掌握率", "連續打卡天數"]) assert.equal(countText(s, t), 1, t);
    const st = s.store.getState();
    const x = D.dashboardModel(st, s.store.today()).today;
    assert.equal(countText(s, x.x + " / " + x.d), 1, "X / D 只出現 1 次");
    for (const t of ["單字掌握數", "目前目標色級", "目前生效色級", "功能入口", "學習統計", "目前目標", "今日學習進度", "資料來源與授權"]) {
      assert.equal(countText(s, t), 0, t);
    }
    const gos = findAll(bodyOf(s), (n) => n.getAttribute("data-go") !== null).map((n) => n.getAttribute("data-go"));
    assert.deepEqual(gos, ["flashcards", "customizer"]);
    // 色級名稱（綠）只在目標行
    const goal = byClass(s.rootEl, "db-goal")[0];
    assert.equal(countText(s, "綠"), goal.textContent.split("綠").length - 1);
    assert.equal(byClass(s.rootEl, "db-ring").length, 1, "只有 1 個環形圖（無小環形圖）");
  });

  test("今日任務卡：環形圖與按鈕同一列（按鈕在右側欄）、目標行在下；「開始今日學習」btn--accent[data-go=flashcards]；「變更」[data-go=customizer]", () => {
    const s = setup({ expanded: false });
    const today = byClass(s.rootEl, "db-today")[0];
    const row = byClass(today, "db-today__row")[0];
    const rowKids = row.childNodes;
    assert.ok(rowKids[0].classList.contains("db-ring-wrap"));
    assert.ok(rowKids[1].classList.contains("db-today__side"));
    const start = byClass(rowKids[1], "db-start")[0];
    assert.equal(start.tagName, "BUTTON");
    assert.equal(start.textContent, "開始今日學習");
    assert.equal(start.getAttribute("data-go"), "flashcards");
    assert.equal(start.getAttribute("type"), "button");
    assert.ok(start.classList.contains("btn--accent"));
    const goal = byClass(today, "db-goal")[0];
    assert.ok(today.childNodes.indexOf(goal) > today.childNodes.indexOf(row), "目標行在列之後");
    // （v0.9，FE-66）子節點恰為 dot、text、db-change；無「・」分隔
    assert.equal(goal.textContent, "綠級・每日 15 字變更");
    assert.equal(goal.getAttribute("data-color"), "green");
    const kids = goal.childNodes.filter((n) => n.nodeType === 1);
    assert.deepEqual(kids.map((n) => n.className), ["db-goal__dot", "db-goal__text", "btn db-change"]);
    assert.equal(byClass(goal, "db-goal__sep").length, 0);
    assert.ok(!byClass(goal, "db-goal__text")[0].textContent.endsWith("・"));
    const change = byClass(goal, "db-change")[0];
    assert.equal(change.tagName, "BUTTON");
    assert.equal(change.getAttribute("type"), "button");
    assert.equal(change.textContent, "變更");
    assert.equal(change.getAttribute("data-go"), "customizer");
    assert.ok(!change.classList.contains("btn--link"));
    assert.ok(change.classList.contains("btn"));
    // 環形圖中央只顯示 X（aria-hidden）
    const center = byClass(today, "db-ring__value")[0];
    assert.equal(center.getAttribute("aria-hidden"), "true");
    assert.equal(center.textContent, "0");
    assert.equal(byClass(today, "db-today__text")[0].textContent, "今日已學 0 / 15 字");
  });

  test("（v0.9，FE-66）已套用藍（855）／金（990）：目標行「綠級・每日 15 字」、色點為生效色級 green；無「目標」「生效」「內建上限」", () => {
    for (const [score, color] of [[855, "blue"], [990, "gold"]]) {
      const s = setup({ expanded: false, goal: { draftScore: score, appliedScore: score, appliedColor: color, effectiveColor: "green" } });
      assert.equal(s.store.getState().data.goal.appliedColor, color, "資料不變（LS-5）");
      const goal = byClass(s.rootEl, "db-goal")[0];
      assert.equal(byClass(goal, "db-goal__text")[0].textContent, "綠級・每日 15 字");
      assert.equal(goal.getAttribute("data-color"), "green");
      for (const w of ["目標", "生效", "內建上限", "藍", "金", "・變更"]) assert.ok(!goal.textContent.includes(w), w);
    }
  });

  test("點「開始今日學習」「變更」：view 不改 store（setItem 0 次、currentTab 不變，由 router 的 [data-go] 委派處理）", () => {
    const s = setup({ expanded: false });
    const before = JSON.stringify(s.store.getState().data);
    const writes = s.storage.setCalls.length;
    byClass(s.rootEl, "db-start")[0].click();
    byClass(s.rootEl, "db-change")[0].click();
    assert.equal(s.storage.setCalls.length, writes);
    assert.equal(JSON.stringify(s.store.getState().data), before);
    assert.equal(s.store.getState().runtime.currentTab, "dashboard");
  });

  test("3 格數據：格內強調圖示 svg.db-stat__icon（aria-hidden）、數字與單位、小字「已掌握 N 字」", () => {
    const s = setup({ expanded: false });
    const streak = byClass(s.rootEl, "db-stat--streak")[0];
    const icon = byClass(streak, "db-stat__icon")[0];
    assert.equal(icon.tagName, "SVG");
    assert.equal(icon.getAttribute("aria-hidden"), "true");
    assert.equal(byClass(streak, "db-stat__unit")[0].textContent, "天");
    assert.equal(byClass(s.rootEl, "db-stat__sub")[0].textContent, "已掌握 0 字");
    assert.equal(byClass(s.rootEl, "db-stat--accuracy")[0].textContent, "模擬測驗正確率—");
  });

  test("近 7 天：無資料 → 只顯示「開始學習後會顯示紀錄」，長條 hidden；學 1 字後 show() → 長條（AC-39-07、E-88）", () => {
    const s = setup({ expanded: false });
    const bars = byClass(s.rootEl, "db-bars")[0];
    const empty = byClass(s.rootEl, "db-chart__empty")[0];
    assert.equal(bars.hidden, true);
    assert.equal(empty.hidden, false);
    assert.equal(empty.textContent, "開始學習後會顯示紀錄");
    // 今天學第 1 字（翻卡觸發學習紀錄）
    s.a.setTab("flashcards");
    s.a.flipCard();
    s.a.setTab("dashboard");
    s.view.show();
    assert.equal(s.store.getState().data.todayLearned.wordKeys.length, 1);
    assert.equal(bars.hidden, false);
    assert.equal(empty.hidden, true);
  });

  test("DB-6／V-LAY-07：預設收合（aria-expanded=false、body hidden）；點擊切換、setItem 0 次、localStorage 不變；節點不重建", () => {
    const s = setup({ expanded: false });
    const toggle = byClass(s.rootEl, "db-backup__toggle")[0];
    const body = byClass(s.rootEl, "db-backup__body")[0];
    assert.equal(toggle.tagName, "BUTTON");
    assert.equal(toggle.getAttribute("type"), "button");
    assert.equal(toggle.getAttribute("aria-controls"), "db-backup-body");
    assert.equal(body.getAttribute("id"), "db-backup-body");
    assert.equal(toggle.getAttribute("aria-expanded"), "false");
    assert.equal(body.hidden, true);
    assert.equal(toggle.textContent, "資料備份");
    // 收合時不顯示：說明、匯出、匯入、NT-1（皆在 hidden 的 body 內）
    for (const cls of ["dash-backup__hint", "btn-row", "dash-backup__origin", "dash-backup__install"]) {
      const n = byClass(s.backup, cls)[0];
      let p = n;
      let hiddenAncestor = false;
      while (p) { if (p.hidden) hiddenAncestor = true; p = p.parentNode; }
      assert.ok(hiddenAncestor, cls + " 應在收合區內");
    }
    const snap = JSON.stringify([...s.storage.map.entries()]);
    const writes = s.storage.setCalls.length;
    toggle.click();
    assert.equal(toggle.getAttribute("aria-expanded"), "true");
    assert.equal(body.hidden, false);
    assert.equal(s.store.getState().runtime.dashboard.backupExpanded, true);
    assert.equal(byClass(s.rootEl, "db-backup__toggle")[0], toggle, "toggle 節點不重建（焦點保留）");
    toggle.click();
    assert.equal(toggle.getAttribute("aria-expanded"), "false");
    assert.equal(body.hidden, true);
    assert.equal(s.storage.setCalls.length, writes, "setItem 0 次");
    assert.equal(JSON.stringify([...s.storage.map.entries()]), snap);
  });

  test("DB-6 (c)：展開後切頁再回主控台 show() 仍展開", () => {
    const s = setup({ expanded: false });
    byClass(s.rootEl, "db-backup__toggle")[0].click();
    s.a.setTab("flashcards");
    s.a.setTab("dashboard");
    s.view.show();
    assert.equal(byClass(s.rootEl, "db-backup__toggle")[0].getAttribute("aria-expanded"), "true");
    assert.equal(byClass(s.rootEl, "db-backup__body")[0].hidden, false);
  });

  test("原始碼：toggle 只呼叫 setBackupExpanded；匯入流程不呼叫（E-91）", () => {
    const src = read("views/dashboard.js");
    assert.equal(src.split("setBackupExpanded(").length - 1, 1, "只在 toggle 處理函式呼叫 1 次");
    const i = src.indexOf("function finishImport(");
    const j = src.indexOf("\n    }\n", i);
    assert.ok(!/setBackupExpanded/.test(src.slice(i, j)));
  });

  test("10-dashboard.css：720px 置中、環形圖 88px、長條區 104px／軌道 64px、空狀態 24px、3 欄、數值 28px、目標行 44px、箭頭無 transition", () => {
    const css = read("styles/10-dashboard.css").replace(/\/\*[\s\S]*?\*\//g, "");
    const rule = (sel) => {
      const m = new RegExp("(?:^|\\})\\s*" + sel.replace(/[.[\]="()]/g, "\\$&") + "\\s*\\{([^}]*)\\}").exec(css);
      assert.ok(m, sel);
      return m[1];
    };
    const v = (r, p) => (new RegExp("(?:^|;|\\s)" + p + ":\\s*([^;]+);").exec(r) || [])[1];
    assert.equal(v(rule(".dashboard"), "max-width"), "var(--content-narrow)");
    assert.equal(v(rule(".dashboard"), "margin-inline"), "auto");
    assert.equal(v(rule(".db-ring-wrap"), "width"), "88px");
    assert.equal(v(rule(".db-bars"), "height"), "104px");
    assert.ok(104 <= 120);
    assert.equal(v(rule(".db-bars__track"), "height"), "64px");
    assert.ok(64 <= 80);
    assert.equal(v(rule(".db-chart__empty"), "line-height"), "24px");
    assert.equal(v(rule(".db-stats"), "grid-template-columns"), "repeat(3, minmax(0, 1fr))");
    assert.equal(v(rule(".db-stat__value"), "font-size"), "1.75rem");
    assert.equal(v(rule(".db-goal"), "min-height"), "44px");
    assert.equal(v(rule(".db-backup__chev"), "transition"), "none");
    assert.equal(v(rule(".db-bars__fill"), "background"), "var(--chart-bar)");
    assert.equal(v(rule(".db-bars__item--today .db-bars__fill"), "background"), "var(--brand-deep)");
    assert.equal(v(rule(".db-stat__icon"), "fill"), "var(--accent)");
    assert.doesNotMatch(css, /\.dash-entr|\.db-mini/);
  });

  test("（v0.9，FE-66）原始碼不含 goalLineCapped、goalLineSeparator、builtinCap、btn--link、LAY.goalLine(、db-goal__sep", () => {
    const src = read("views/dashboard.js");
    for (const w of ["goalLineCapped", "goalLineSeparator", "builtinCap", "btn--link", "LAY.goalLine(", "db-goal__sep", "內建上限"]) {
      assert.ok(!src.includes(w), w);
    }
    assert.ok(src.includes("LAY.goalLineText("));
  });

  test("（v0.9，FE-66）10-dashboard.css：.db-change 外框按鈕（V-LAY-10）；.db-goal gap 8px；無 .db-goal__sep；無禁止色", () => {
    const css = read("styles/10-dashboard.css").replace(/\/\*[\s\S]*?\*\//g, "");
    const rule = (sel) => {
      const m = new RegExp("(?:^|\\})\\s*" + sel.replace(/[.[\]="():]/g, "\\$&") + "\\s*\\{([^}]*)\\}").exec(css);
      assert.ok(m, sel);
      return m[1];
    };
    const v = (r, p) => (new RegExp("(?:^|;|\\s)" + p + ":\\s*([^;]+);").exec(r) || [])[1];
    const c = rule(".db-change");
    assert.equal(v(c, "min-height"), "44px");
    assert.equal(v(c, "min-width"), "44px");
    assert.equal(v(c, "margin-left"), "auto");
    assert.equal(v(c, "padding"), "0 14px");
    assert.equal(v(c, "background"), "var(--surface)");
    assert.equal(v(c, "border"), "1px solid var(--brand-deep)");
    assert.equal(v(c, "color"), "var(--brand-deep)");
    assert.equal(v(c, "font-weight"), "600");
    assert.equal(v(c, "text-decoration"), "none");
    assert.equal(v(rule(".db-goal"), "gap"), "8px");
    assert.match(css, /@media \(hover: hover\)\s*\{\s*\.db-change:hover\s*\{\s*background: var\(--tint\);\s*\}/);
    assert.doesNotMatch(css, /\.db-goal__sep/);
    const block = css.slice(css.indexOf(".db-change"), css.indexOf("}", css.lastIndexOf(".db-change:hover")) + 1);
    for (const w of ["var(--accent)", "var(--border)", "#d5d9e0", "#f7893b", "color: var(--brand);"]) assert.ok(!block.includes(w), w);
  });

  test("10-dashboard.css：.dash-backup__origin 同 .dash-backup__hint 字級、overflow-wrap: anywhere、無 nowrap；.dash-install ≥ 44px", () => {
    const css = read("styles/10-dashboard.css").replace(/\/\*[\s\S]*?\*\//g, "");
    const rule = (sel) => {
      const m = new RegExp(sel.replace(/[.]/g, "\\.") + "\\s*\\{([^}]*)\\}").exec(css);
      assert.ok(m, sel);
      return m[1];
    };
    const fz = (r) => (/font-size:\s*([^;]+);/.exec(r) || [])[1];
    assert.equal(fz(rule(".dash-backup__origin")), fz(rule(".dash-backup__hint")));
    assert.match(rule(".dash-backup__origin"), /overflow-wrap:\s*anywhere/);
    assert.doesNotMatch(rule(".dash-backup__origin"), /nowrap|text-overflow/);
    assert.match(rule(".dash-install"), /min-height:\s*var\(--touch\)/);
    assert.match(rule(".dash-install"), /min-width:\s*var\(--touch\)/);
  });
});
