/*
 * dashboard.test.js — 主控台純邏輯與下載服務單元測試（FE-08 測試移入，FE-19；FE-31 今日學習進度）
 * 受測：views/dashboard.js（goalInfoOf、importMessage、progressModel、dashboardModel、ringGeometry）、services/download.js
 * 涵蓋：AC-17-04（v0.19 改驗已答對行）、AC-24-05、AC-24-06、AC-24-09、契約 IM-6（R6-4 write_failed）；
 *       （FE-31）AC-30-02、AC-30-05、AC-30-07、AC-30-08、AC-30-10、AC-17-01 統計標籤
 * v0.12（FE-58；architecture.md v0.8 §7.19.4、§10.5 dashboard.test.js 列；契約 DB-1～DB-6、V-LAY-07、V-LAY-08）：
 *       移除 summaryOf、ENTRIES（功能入口）案例；新增 dashboardModel 與假 DOM 版面案例（區塊順序、AC-39-06 文字次數、
 *       「開始今日學習」「變更」的 data-go、收合區塊與 setItem 0 次、收合時 NT-1 與安裝鈕不顯示）。
 * v0.19（FE-84；architecture.md v0.14 §7.25.1、§10.11；契約 AS-1～AS-4、AS-7、DB-5、V-ANS-01～V-ANS-03）：
 *       第 3 格改驗「模擬測驗」與已答對行；Q = 0 顯示「—」；作答、清除後更新；累計資料不影響顯示。
 * v0.19（FE-108；architecture.md v0.20 §7.32.2～§7.32.6、§7.32.8、§10.15 dashboard.test.js 列；契約 DB-1～DB-6、IS-1～IS-3、
 *       IS-14～IS-16、IA-1、IA-2、IA-5、IA-6、V-ISL-04、V-ISL-07、V-LAY-07、V-LAY-08、V-LAY-10）：
 *       移除主環形圖案例（ringGeometry、centerText、db-ring）；改驗群島頁 DB-1 順序（標題列 → 今日任務卡 → 地圖 → 清單 → 3 格
 *       → 近 7 天 → 資料備份）、今日任務卡內部順序與對話框 5 句、今日進度條屬性與 2 種填色、清單 5 列與 progressbar（含 P 為 null）、
 *       3 格狀態行 6 種、AC-39-06 各文字 1 次、show() 才播放地圖動畫與減少動態不播放、回到頁面即新值、瀏覽 setItem 0 次。
 */
"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");

const D = require("../views/dashboard.js");
const DL = require("../services/download.js");

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
      "備份檔版本不相容（檔案版本：無；支援版本：1、2、3）");
    assert.equal(D.importMessage({ ok: false, error: "version", fileVersion: 2 }).text,
      "備份檔版本不相容（檔案版本：2；支援版本：1、2、3）");
    assert.equal(D.importMessage({ ok: false, error: "version", fileVersion: 1.5 }).text,
      "備份檔版本不相容（檔案版本：1.5；支援版本：1、2、3）");
    assert.equal(D.importMessage({ ok: false, error: "version" }).text,
      "備份檔版本不相容（檔案版本：無；支援版本：1、2、3）");
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
    assert.equal(m.today.done, true);
    assert.equal(m.today.ratio, 1);
    // （v0.19，IS-15）進度條：aria-valuenow = min(X, D)、填滿 100%；不再有環形圖中央數字
    assert.equal(m.today.valueNow, 15);
    assert.equal(m.today.fillPct, 100);
    assert.equal("centerText" in m.today, false);
    m = at(14);
    assert.equal(m.today.valueNow, 14);
    assert.equal(m.today.fillPct, 93.3);
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

  /** n 題模擬測驗（dashboard 只用到 id） */
  const bankN = (n) => Array.from({ length: n }, (_, i) => ({ id: "p5-" + String(i + 1).padStart(3, "0") }));
  const firstIds = (n) => bankN(n).map((q) => q.id);

  test("progressModel AC-30-10：200 字中掌握 50、另 10 個不在單字集 → 25%；K = 48、Q = 200 → 已答對行（不由累計計算）", () => {
    const set = keys(200).map((k) => ({ wordKey: k }));
    const mastered = keys(50).concat(keys(10, "x"));
    const m = D.progressModel(stateOf(
      { masteredWordKeys: mastered, part5CorrectIds: firstIds(48), part5: { ...base.part5, totalAnswered: 300, totalCorrect: 210 } },
      { studySet: set }
    ), TODAY, bankN(200));
    assert.equal(m.mastery.label, "單字掌握率");
    assert.equal(m.mastery.numer, 50);
    assert.equal(m.mastery.denom, 200);
    assert.equal(m.mastery.text, "25%");
    assert.equal(m.mastery.ratio, 0.25);
    assert.equal(m.answered.label, "模擬測驗");
    assert.deepEqual(m.answered.summary, { k: 48, q: 200, p: 24 });
    assert.equal(m.answered.text, "已答對 48 / 200 題（24%）");
    assert.ok(!JSON.stringify(m).includes("70%"), "由累計計算的數字不再出現（AC-49-01）");
    assert.equal(Object.prototype.hasOwnProperty.call(m, "accuracy"), false);
  });

  test("progressModel AC-30-10：單字集為空、Q = 0 → 「—」，不出現 NaN、Infinity", () => {
    const m = D.progressModel(stateOf(), TODAY);
    assert.equal(m.mastery.percent, null);
    assert.equal(m.mastery.text, "—");
    assert.equal(m.mastery.ratio, 0);
    assert.equal(m.answered.summary, null);
    assert.equal(m.answered.text, "—");
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

  test("（v0.19，FE-108；AC-39-01、AC-63-02）主環形圖程式已移除；dashboard.js 字串常值不含「主控台」；TEXT 無 title", () => {
    const fs = require("node:fs");
    const path = require("node:path");
    const src = fs.readFileSync(path.join(__dirname, "..", "views", "dashboard.js"), "utf8");
    assert.equal("ringGeometry" in D, false);
    assert.equal("title" in D.TEXT, false);
    // 註解以外的程式碼不含環形圖識別字
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    for (const w of ["ringSvg", "setRing", "ringGeometry", "RING", "db-ring", "dashoffset", "dasharray", "centerText"]) {
      assert.ok(!code.includes(w), w);
    }
    // 字串常值（含單、雙引號）不含「主控台」「學習主控台」（IA-1、V-ISL-08）
    const lits = [...code.matchAll(/"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'/g)].map((m) => m[1] !== undefined ? m[1] : m[2]);
    assert.ok(lits.length > 50);
    for (const l of lits) assert.ok(!l.includes("主控台"), l);
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
    assert.equal(Object.prototype.hasOwnProperty.call(D.TEXT, "accuracy"), false);
    assert.equal(D.TEXT.empty, "—");
    assert.equal(D.TEXT.todayTitle, "今日任務");
    assert.equal(D.TEXT.chartTitle, "近 7 天已學字數");
    const all = JSON.stringify(D.TEXT);
    for (const bad of ["單字掌握數", "目前目標色級", "目前生效色級", "功能入口", "學習統計", "目前目標", "今日學習進度", "目前單字集掌握率", "正確率", "累計答對"]) {
      assert.ok(!all.includes(bad), bad);
    }
  });

  // ── dashboardModel（v0.12，FE-58；DB-2～DB-6） ──

  test("dashboardModel AC-39-05：打卡 3 天、200 字掌握 50（另 10 不在單字集）、K = 48、Q = 200 → 「3」「天」「25%」「已掌握 60 字」、已答對行", () => {
    const set = keys(200).map((k) => ({ wordKey: k }));
    const m = D.dashboardModel(stateOf(
      {
        masteredWordKeys: keys(50).concat(keys(10, "x")),
        part5CorrectIds: firstIds(48),
        part5: { ...base.part5, totalAnswered: 10, totalCorrect: 7 },
        streak: { days: 3, lastActiveDate: TODAY },
      },
      { studySet: set }
    ), TODAY, bankN(200));
    assert.deepEqual(m.stats, {
      streakValue: "3",
      streakUnit: "天",
      masteryText: "25%",
      masteredText: "已掌握 60 字",
      answeredText: "已答對 48 / 200 題（24%）",
      weatherText: "晴天",
      lighthouseText: "燈塔蓋好",
    });
  });

  test("V-ANS-01 畫面字串：Q = 200，K = 0、1、7、29、199、200；K = 0 不顯示「—」（AC-49-02、AC-17-04）", () => {
    for (const [k, text] of [
      [0, "已答對 0 / 200 題（0%）"], [1, "已答對 1 / 200 題（1%）"], [7, "已答對 7 / 200 題（4%）"],
      [29, "已答對 29 / 200 題（15%）"], [199, "已答對 199 / 200 題（99%）"], [200, "已答對 200 / 200 題（100%）"]
    ]) {
      const m = D.dashboardModel(stateOf({ part5CorrectIds: firstIds(k) }), TODAY, bankN(200));
      assert.equal(m.stats.answeredText, text);
      noBad(m);
    }
  });

  test("AC-17-04、AC-49-04：累計 10 題 7 對不影響第 3 格；不存在與重複的 id 不計，K ≤ Q", () => {
    let m = D.dashboardModel(stateOf({ part5CorrectIds: firstIds(7), part5: { ...base.part5, totalAnswered: 10, totalCorrect: 7 } }), TODAY, bankN(200));
    assert.equal(m.stats.answeredText, "已答對 7 / 200 題（4%）");
    m = D.dashboardModel(stateOf({ part5CorrectIds: ["p5-001", "p5-001", "p5-999", "", 7] }), TODAY, bankN(3));
    assert.equal(m.stats.answeredText, "已答對 1 / 3 題（33%）");
    m = D.dashboardModel(stateOf({ part5CorrectIds: firstIds(5).concat(["p5-999"]) }), TODAY, bankN(5));
    assert.equal(m.stats.answeredText, "已答對 5 / 5 題（100%）");
  });

  test("AS-4、V-ANS-01：Q = 0 或題庫異常 → 「—」，K ≥ 1 的舊紀錄也不產生「0 / 0」", () => {
    for (const bank of [[], null, 7, "x"]) {
      const m = D.dashboardModel(stateOf({ part5CorrectIds: ["p5-001"] }), TODAY, bank);
      assert.equal(m.stats.answeredText, "—");
      assert.ok(!JSON.stringify(m).includes("0 / 0"));
      noBad(m);
    }
  });

  test("dashboardModel：空資料 → 掌握率、已答對行「—」、已掌握 0 字、打卡 0；不出現 NaN／Infinity（AC-30-10、E-48）", () => {
    for (const st of [stateOf(), null, {}, { data: null, runtime: null }]) {
      const m = D.dashboardModel(st, TODAY);
      assert.equal(m.stats.masteryText, "—");
      assert.equal(m.stats.answeredText, "—");
      assert.equal(m.stats.masteredText.startsWith("已掌握 "), true);
      noBad(m);
    }
    const m = D.dashboardModel(stateOf({ masteredWordKeys: [], streak: { days: 0, lastActiveDate: null } }), TODAY);
    assert.equal(m.stats.masteredText, "已掌握 0 字");
    assert.equal(m.stats.streakValue, "0");
  });

  test("dashboardModel AC-30-05：X = 18、D = 15 → text「今日已學 18 / 15 字」、valueNow 15、done", () => {
    const m = D.dashboardModel(stateOf({ goal: goalOf(600), todayLearned: { date: TODAY, wordKeys: keys(18) } }), TODAY);
    assert.equal(m.today.text, "今日已學 18 / 15 字");
    assert.equal(m.today.valueNow, 15);
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

  // ── 群島（v0.19，FE-108；IS-3、IS-11～IS-15、IA-2、IA-4、DB-5、V-ISL-04） ──

  const WK = require("../core/wordkey.js");
  /** 合成內容：排名 1～n 的內建字（w1…wn） */
  const contentOf = (n, nB, nG) => {
    const builtin = Array.from({ length: n }, (_, i) => ({ rank: i + 1, word: "w" + (i + 1) }));
    return { builtin, builtinMap: new Map(builtin.map((b) => [WK.wordKey(b.word), b])), nB, nG };
  };
  /** 排名 from～to 的 wordKey */
  const wk = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => WK.wordKey("w" + (from + i)));
  /** AC-64-03 資料：N_B 2,809、N_G 3,000；已掌握橘 250、棕 10、5 個自訂單字；S 3、K 48 / Q 200、X 4 / D 15 */
  const ac6403 = () => ({
    state: stateOf({
      goal: goalOf(600),
      masteredWordKeys: wk(1, 250).concat(wk(1001, 1010), ["custom a", "custom b", "custom c", "custom d", "custom e"]),
      streak: { days: 3, lastActiveDate: TODAY },
      part5CorrectIds: firstIds(48),
      todayLearned: { date: TODAY, wordKeys: keys(4) }
    }),
    content: contentOf(3000, 2809, 3000)
  });

  test("dashboardModel 群島 AC-64-03、IA-4：文字替代逐字、清單 5 列、對話框、3 格狀態行（同一個 IslandState，IS-3）", () => {
    const { state, content } = ac6403();
    const m = D.dashboardModel(state, TODAY, bankN(200), content);
    assert.equal(m.mapAlt, "群島地圖：橘島掌握 25%，一棵椰子樹；棕島掌握 1%，新芽；綠島掌握 0%，沙灘；藍島、金島尚未開放；"
      + "連續打卡 3 天，晴天；模擬測驗已答對 48 題，燈塔蓋好；今日小船 4 / 15 字，航行中");
    assert.equal(m.dialog, "再學 11 個字，今天的小船就靠岸囉！");
    assert.deepEqual(m.isles, [
      { id: "orange", name: "橘島", sub: "入門", right: "掌握 25%", stageText: "長出第一棵椰子樹", valueNow: 25, label: "橘島掌握率", fog: false, fillPct: 25 },
      { id: "brown", name: "棕島", sub: "基礎", right: "掌握 1%", stageText: "冒出新芽了", valueNow: 1, label: "棕島掌握率", fog: false, fillPct: 1 },
      { id: "green", name: "綠島", sub: "職場與商務", right: "掌握 0%", stageText: "還是一片沙灘，掌握第一個字就會冒芽", valueNow: 0, label: "綠島掌握率", fog: false, fillPct: 0 },
      { id: "blue", name: "藍島", sub: "高階商務", right: "尚未開放", stageText: "還在霧中，之後的版本開放", valueNow: null, label: null, fog: true, fillPct: 0 },
      { id: "gold", name: "金島", sub: "近母語", right: "尚未開放", stageText: "還在霧中，之後的版本開放", valueNow: null, label: null, fog: true, fillPct: 0 }
    ]);
    assert.equal(m.stats.weatherText, "晴天");
    assert.equal(m.stats.lighthouseText, "燈塔蓋好");
    // 3 格「已掌握 N 字」依 §5.4 末段（含自訂單字，N = 265），與島嶼值互相獨立（IS-10）
    assert.equal(m.stats.masteredText, "已掌握 265 字");
    // 單一來源：清單、文字替代、3 格、今日進度列取自同一個 island（V-ISL-04）
    assert.deepEqual(m.island.islands.map((i) => i.p), [25, 1, 0]);
    assert.deepEqual([m.island.streakDays, m.island.k, m.island.q, m.island.x, m.island.d], [3, 48, 200, 4, 15]);
    assert.equal(m.island.x, m.today.x);
    assert.equal(m.island.d, m.today.d);
    assert.equal(m.stats.streakValue, String(m.island.streakDays));
    noBad(m);
  });

  test("dashboardModel 群島：第 4 參數省略（無 EMT.content）或內容異常 → 三島 n = 0、P null「掌握 —」，不拋例外（§4.16、FB-84）", () => {
    const st = stateOf({ masteredWordKeys: ["the", "company"] });
    for (const c of [undefined, null, {}, 7, { builtin: 5, builtinMap: {}, nB: NaN, nG: "x" }]) {
      const m = D.dashboardModel(st, TODAY, undefined, c);
      assert.deepEqual(m.island.islands.map((i) => [i.n, i.m, i.p, i.stage]), [[0, 0, null, "sand"], [0, 0, null, "sand"], [0, 0, null, "sand"]]);
      const open = m.isles.slice(0, 3);
      assert.deepEqual(open.map((r) => [r.right, r.valueNow, r.fillPct, r.label]),
        [["掌握 —", null, 0, "橘島掌握率"], ["掌握 —", null, 0, "棕島掌握率"], ["掌握 —", null, 0, "綠島掌握率"]]);
      assert.ok(m.mapAlt.startsWith("群島地圖：橘島掌握 —，沙灘；棕島掌握 —，沙灘；綠島掌握 —，沙灘；"));
      assert.ok(!/NaN|Infinity|undefined/.test(m.mapAlt + JSON.stringify(m.isles)));
    }
    // 內容快照：只取 4 欄
    assert.deepEqual(Object.keys(D.contentSnapshot(contentOf(3, 2, 3))).sort(), ["builtin", "builtinMap", "nB", "nG"]);
  });

  test("dashboardModel 群島 AC-64-04：生效橘 → 棕、綠加「（目前目標未包含）」；文字替代不加註記（IS-9）", () => {
    const content = contentOf(3000, 2809, 3000);
    const m = D.dashboardModel(stateOf({ goal: goalOf(100), masteredWordKeys: wk(1500, 1500) }), TODAY, [], content);
    assert.deepEqual(m.isles.slice(0, 3).map((r) => r.stageText),
      ["還是一片沙灘，掌握第一個字就會冒芽", "冒出新芽了（目前目標未包含）", "還是一片沙灘，掌握第一個字就會冒芽（目前目標未包含）"]);
    assert.equal(m.isles[1].valueNow, 1, "排名 1,500 計入棕島（不受生效色級影響）");
    assert.ok(!m.mapAlt.includes("目前目標未包含"));
    const g = D.dashboardModel(stateOf({ goal: goalOf(600) }), TODAY, [], content);
    assert.ok(g.isles.every((r) => !r.stageText.includes("目前目標未包含")));
  });

  test("dashboardModel 對話框 AC-66-02（D = 10：X 0、4、9、10、12 → 5 句）與今日進度列 AC-66-03", () => {
    const want = [
      [0, "再學 10 個字，今天的小船就靠岸囉！", 0, 0, false],
      [4, "再學 6 個字，今天的小船就靠岸囉！", 4, 40, false],
      [9, "再學 1 個字，今天的小船就靠岸囉！", 9, 90, false],
      [10, "今天的小船靠岸了！想多學也可以，島上會更熱鬧。", 10, 100, true],
      [12, "今天的小船靠岸了！想多學也可以，島上會更熱鬧。", 10, 100, true]
    ];
    for (const [x, dialog, now, pct, done] of want) {
      const m = D.dashboardModel(stateOf({ goal: goalOf(100), todayLearned: { date: TODAY, wordKeys: keys(x) } }), TODAY);
      assert.equal(m.dialog, dialog, "X = " + x);
      assert.equal(m.today.text, "今日已學 " + x + " / 10 字");
      assert.equal(m.today.valueNow, now);
      assert.equal(m.today.fillPct, pct);
      assert.equal(m.today.done, done);
      assert.equal(m.today.doneText, done ? "今日目標達成" : "");
      assert.ok(m.mapAlt.endsWith("今日小船 " + x + " / 10 字，" + (done ? "已靠岸" : "航行中")));
    }
  });

  test("dashboardModel 3 格狀態行 AC-67-01：S 0／3／7 → 陰天／晴天／出現彩虹；K 0／48／50 → 燈塔待建／蓋好／點亮；Q = 0 → 「—」＋燈塔待建", () => {
    for (const [streak, text] of [
      [{ days: 0, lastActiveDate: null }, "陰天"],
      [{ days: 3, lastActiveDate: TODAY }, "晴天"],
      [{ days: 7, lastActiveDate: TODAY }, "出現彩虹"],
      [{ days: 10, lastActiveDate: "2026-10-27" }, "陰天"] // 最後打卡日 3 天前：S = 0（AC-64-06）
    ]) {
      const m = D.dashboardModel(stateOf({ streak }), TODAY, []);
      assert.equal(m.stats.weatherText, text, JSON.stringify(streak));
      assert.ok(m.mapAlt.includes("連續打卡 " + m.stats.streakValue + " 天，" + text), "地圖文字替代同一個 S（AC-67-02）");
    }
    for (const [k, text] of [[0, "燈塔待建"], [48, "燈塔蓋好"], [50, "燈塔點亮"]]) {
      const m = D.dashboardModel(stateOf({ part5CorrectIds: firstIds(k) }), TODAY, bankN(200));
      assert.equal(m.stats.lighthouseText, text, "K = " + k);
      assert.ok(m.stats.answeredText.startsWith("已答對 " + k + " / 200 題"));
      assert.ok(m.mapAlt.includes("模擬測驗已答對 " + k + " 題，" + text));
    }
    const q0 = D.dashboardModel(stateOf({ part5CorrectIds: ["p5-001"] }), TODAY, []);
    assert.equal(q0.stats.answeredText, "—");
    assert.equal(q0.stats.lighthouseText, "燈塔待建");
    assert.equal(q0.island.k, 0);
  });

  test("dashboardModel 只讀：不修改傳入的 state（IS-1、IS-2）", () => {
    const { state, content } = ac6403();
    const before = JSON.stringify(state);
    D.dashboardModel(state, TODAY, bankN(200), content);
    assert.equal(JSON.stringify(state), before);
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
   * @param {{ pwa?: object, tab?: string, firstRun?: boolean, noService?: boolean, content?: object,
   *           goal?: object, data?: object, reduced?: boolean }} [o]
   *   content：同時作為 store 的 content 與 EMT.content（與正式環境相同，題庫來自同一份快照）
   *   goal、data：（v0.19，FE-108 加 data）預寫主鍵的 PersistedData 欄位（其餘為預設值）
   *   reduced：EMT.ui.motion.reduced() 的回傳值（可再以回傳的 flags.reduced 切換）
   *   idle：（FE-116）閒置排程器替身 { request, cancel }；給定時以 createView({ idle }) 建立頁面模組（不經 register）。
   *     省略時走瀏覽器登錄路徑；沙箱無 requestIdleCallback／setTimeout → idleScheduler 不排程，不留真實計時器
   * 回傳 counts.build：（FE-116）islandMap.build 的呼叫次數（以包裝物件計數，行為不變）
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
    // （v0.19，FE-108）群島頁另需 core/island.js、ui/island-art.js、ui/island-map.js（建置串接順序 core → ui → views）
    for (const rel of ["core/constants.js", "core/wordkey.js", "core/dom.js", "core/goal.js", "core/layout.js", "core/streak.js",
      "core/stats.js", "core/learning.js", "core/pwa.js", "core/part5flow.js", "core/island.js",
      "ui/island-art.js", "ui/island-map.js"]) {
      vm.runInContext(read(rel), sandbox, { filename: rel });
    }
    const flags = { reduced: o.reduced === true };
    sandbox.EMT.ui.motion = { reduced: () => flags.reduced };
    // （FE-116）islandMap.build 計數替身：包裝物件取代登錄值，其餘匯出原樣
    const counts = { build: 0 };
    const realMap = sandbox.EMT.ui.islandMap;
    sandbox.EMT.ui.islandMap = Object.assign({}, realMap, {
      build: (st, op) => { counts.build++; return realMap.build(st, op); }
    });
    const views = {};
    sandbox.EMT.views = { register: (tab, m) => { views[tab] = m; } };
    const calls = { install: 0 };
    if (!o.noService) {
      sandbox.EMT.services = { pwa: { requestInstall: () => { calls.install++; return Promise.resolve(); } } };
    }
    let preset;
    if (o.goal || o.data) {
      // （v0.9，FE-66）以指定 goal 預寫目前版本（v0.15 起 3）主鍵（模擬已套用藍／金後重新載入；buildRecord 一律寫目前版本）
      const PERSIST = require("../core/persist.js");
      const data = Object.assign(PERSIST.defaultData(), o.data || {});
      if (o.goal) data.goal = o.goal;
      preset = F.fakeStorage({ "englishMasterTrack:state": JSON.stringify(PERSIST.buildRecord(data, new Date("2026-10-29T00:00:00Z"))) });
    }
    if (o.content) sandbox.EMT.content = o.content;
    const { store, a, storage } = F.makeStore({ firstRun: o.firstRun, storage: preset, content: o.content });
    if (o.pwa) a.setPwa(o.pwa);
    if (o.tab) a.setTab(o.tab);
    // （v0.12，FE-58）預設展開「資料備份」（v0.11 既有案例檢查的是展開後的內容；收合行為另有案例）
    if (o.expanded !== false) a.setBackupExpanded(true);
    sandbox.EMT.store = store;
    let view;
    if (o.idle) {
      // 暫時提供 module，讓 dashboard.js 走 module.exports 分支取得 api（沙箱無 require，core 仍取 EMT.core.*）
      sandbox.module = { exports: {} };
      vm.runInContext(read("views/dashboard.js"), sandbox, { filename: "views/dashboard.js" });
      const api = sandbox.module.exports;
      delete sandbox.module;
      view = api.createView({ idle: o.idle });
    } else {
      vm.runInContext(read("views/dashboard.js"), sandbox, { filename: "views/dashboard.js" });
      view = views.dashboard;
    }
    const rootEl = makeNode("section");
    view.mount(rootEl);
    const backup = byClass(rootEl, "db-backup")[0];
    return { sandbox, store, a, storage, view, rootEl, backup, calls, flags, counts };
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

  // ── v0.19 群島頁版面（FE-108；DB-1～DB-6、V-LAY-07、V-LAY-08、V-LAY-10、IS-3、IA-2、IA-6、§7.32.2～§7.32.6） ──

  /** 群島頁本體（.dashboard） */
  const bodyOf = (s) => byClass(s.rootEl, "dashboard")[0];
  /** 計算文字在本體中出現的次數（textContent；aria-label 等屬性不計，IA-5） */
  const countText = (s, t) => bodyOf(s).textContent.split(t).length - 1;
  /** 元素子節點 */
  const elKids = (n) => n.childNodes.filter((c) => c.nodeType === 1);
  /** store 的 today（_fixtures.makeStore 的 now 為 2026-10-30） */
  const TODAY = "2026-10-30";
  const keys = (n, p = "w") => Array.from({ length: n }, (_, i) => p + i);
  /** 以 data 預寫（今天 2026-10-30，store now 同日） */
  const withData = (data, extra = {}) => setup(Object.assign({ expanded: false, data }, extra));

  test("DB-1：本體 = 標題列 → 今日任務卡 → 地圖 → 島嶼清單 → 3 格數據 → 近 7 天 → 資料備份（AC-39-01、AC-63-01）", () => {
    const s = setup({ expanded: false });
    const kids = elKids(bodyOf(s));
    const ORDER = ["db-head", "db-today", "db-map", "db-isles", "db-stats", "db-chart", "db-backup"];
    assert.deepEqual(kids.map((n) => ORDER.find((c) => n.classList.contains(c))), ORDER);
    assert.deepEqual(kids.map((n) => n.tagName), ["DIV", "SECTION", "DIV", "SECTION", "SECTION", "SECTION", "SECTION"]);
    // 今日任務卡、地圖框、近 7 天、資料備份為 .card；清單與 3 格不是單一卡片（每列、每格各自為卡片樣式，§7.32.5、§7.32.6）
    assert.deepEqual(kids.map((n) => n.classList.contains("card")), [false, true, true, false, false, true, true]);
    assert.equal(kids[1].getAttribute("aria-labelledby"), "db-today-h");
    assert.equal(kids[3].getAttribute("aria-labelledby"), "db-isles-h");
    assert.equal(kids[4].getAttribute("aria-label"), "學習數據");
    assert.equal(byClass(kids[5], "section-title")[0].textContent, "近 7 天已學字數");
    assert.equal(byClass(s.rootEl, "db-ring").length + byClass(s.rootEl, "db-ring-wrap").length, 0, "無環形圖");
  });

  test("標題列：h2「我的群島」（左側裝飾 aria-hidden）＋ 目標標籤膠囊與「變更」按鈕（DB-4、IS-16、AC-63-01、AC-66-04）", () => {
    const s = setup({ expanded: false });
    const head = byClass(s.rootEl, "db-head")[0];
    const [h2, goal] = elKids(head);
    assert.equal(h2.tagName, "H2");
    assert.ok(h2.classList.contains("page-title"));
    assert.equal(h2.textContent, "我的群島");
    const deco = elKids(h2)[0];
    assert.equal(deco.tagName, "SVG");
    assert.ok(deco.classList.contains("isl-art--title") && deco.classList.contains("dash-title__deco"));
    assert.equal(deco.getAttribute("aria-hidden"), "true");
    assert.equal(deco.getAttribute("focusable"), "false");
    // 目標標籤：膠囊（色點 + 文字）→「變更」；無「・」分隔
    assert.equal(goal.tagName, "P");
    assert.equal(goal.className, "db-goal");
    assert.equal(goal.textContent, "綠級・每日 15 字變更");
    assert.equal(goal.getAttribute("data-color"), "green");
    assert.deepEqual(elKids(goal).map((n) => n.className), ["db-goal__tag", "btn db-change"]);
    const tag = elKids(goal)[0];
    assert.deepEqual(elKids(tag).map((n) => n.className), ["db-goal__dot", "db-goal__text"]);
    assert.equal(elKids(tag)[0].getAttribute("aria-hidden"), "true");
    assert.equal(byClass(goal, "db-goal__text")[0].textContent, "綠級・每日 15 字");
    assert.equal(byClass(goal, "db-goal__sep").length, 0);
    const change = byClass(goal, "db-change")[0];
    assert.equal(change.tagName, "BUTTON");
    assert.equal(change.getAttribute("type"), "button");
    assert.equal(change.textContent, "變更");
    assert.equal(change.getAttribute("data-go"), "customizer");
    assert.ok(change.classList.contains("btn"));
    assert.ok(!change.classList.contains("btn--link"));
    // 目標行不在今日任務卡內（DB-2）
    assert.equal(byClass(byClass(s.rootEl, "db-today")[0], "db-goal").length, 0);
  });

  test("今日任務卡內部順序（DB-2、AC-39-02、AC-66-01）：visually-hidden h3 → 龜龜＋名稱＋對話框 → 今日進度列 → 「開始今日學習」", () => {
    const s = setup({ expanded: false });
    const today = byClass(s.rootEl, "db-today")[0];
    const kids = elKids(today);
    assert.deepEqual(kids.map((n) => n.className), ["visually-hidden", "db-host", "db-today__progress", "btn btn--accent db-start"]);
    // （SD-FB-107）標題只給螢幕閱讀器
    assert.equal(kids[0].tagName, "H3");
    assert.equal(kids[0].getAttribute("id"), "db-today-h");
    assert.equal(kids[0].textContent, "今日任務");
    // 龜龜（aria-hidden、不可聚焦）在左，名稱與對話框在右
    const [turtle, talk] = elKids(kids[1]);
    assert.equal(turtle.tagName, "SVG");
    assert.ok(turtle.classList.contains("isl-art--turtle") && turtle.classList.contains("db-host__turtle"));
    assert.equal(turtle.getAttribute("aria-hidden"), "true");
    assert.equal(turtle.getAttribute("focusable"), "false");
    assert.equal(talk.className, "db-host__talk");
    const [name, bubble] = elKids(talk);
    assert.equal(name.className, "db-host__name");
    assert.equal(name.textContent, "島主 龜龜");
    assert.equal(bubble.className, "db-host__bubble");
    assert.equal(bubble.textContent, "再學 15 個字，今天的小船就靠岸囉！");
    // 對話框不是即時區域（IS-14）
    assert.equal(bubble.getAttribute("aria-live"), null);
    assert.equal(bubble.getAttribute("role"), null);
    // 今日進度列：文字 + 進度條，「今日目標達成」在其下
    const [row, done] = elKids(kids[2]);
    assert.equal(row.className, "db-today__row");
    assert.deepEqual(elKids(row).map((n) => n.className), ["db-today__text", "db-today__bar"]);
    assert.equal(elKids(row)[0].textContent, "今日已學 0 / 15 字");
    assert.equal(done.className, "db-today__done");
    assert.equal(done.getAttribute("aria-live"), "polite");
    assert.equal(done.hidden, true);
    // 「開始今日學習」
    const start = kids[3];
    assert.equal(start.tagName, "BUTTON");
    assert.equal(start.textContent, "開始今日學習");
    assert.equal(start.getAttribute("data-go"), "flashcards");
    assert.equal(start.getAttribute("type"), "button");
  });

  test("對話框 5 句（AC-66-02，D = 10：X 0、4、9、10、12）", () => {
    const orange = { draftScore: 100, appliedScore: 100, appliedColor: "orange", effectiveColor: "orange" };
    for (const [x, text] of [
      [0, "再學 10 個字，今天的小船就靠岸囉！"],
      [4, "再學 6 個字，今天的小船就靠岸囉！"],
      [9, "再學 1 個字，今天的小船就靠岸囉！"],
      [10, "今天的小船靠岸了！想多學也可以，島上會更熱鬧。"],
      [12, "今天的小船靠岸了！想多學也可以，島上會更熱鬧。"]
    ]) {
      const s = withData({ goal: orange, todayLearned: { date: TODAY, wordKeys: keys(x) } });
      assert.equal(byClass(s.rootEl, "db-host__bubble")[0].textContent, text, "X = " + x);
    }
  });

  test("今日進度條（IS-15、AC-66-03、AC-30-05）：progressbar 屬性、填滿比例、X < D 品牌色／X ≥ D 金色 class 與「今日目標達成」", () => {
    const orange = { draftScore: 100, appliedScore: 100, appliedColor: "orange", effectiveColor: "orange" };
    for (const [x, now, width, done] of [[0, "0", "0%", false], [4, "4", "40%", false], [10, "10", "100%", true], [12, "10", "100%", true]]) {
      const s = withData({ goal: orange, todayLearned: { date: TODAY, wordKeys: keys(x) } });
      const bar = byClass(s.rootEl, "db-today__bar")[0];
      const fill = elKids(bar)[0];
      const text = "今日已學 " + x + " / 10 字";
      assert.equal(byClass(s.rootEl, "db-today__text")[0].textContent, text);
      assert.equal(bar.getAttribute("role"), "progressbar");
      assert.equal(bar.getAttribute("aria-valuemin"), "0");
      assert.equal(bar.getAttribute("aria-valuemax"), "10");
      assert.equal(bar.getAttribute("aria-valuenow"), now, "aria-valuenow = min(X, D)");
      assert.equal(bar.getAttribute("aria-valuetext"), text);
      assert.equal(fill.className.split(" ")[0], "db-today__fill");
      assert.equal(fill.style.width, width);
      assert.equal(fill.classList.contains("db-today__fill--done"), done, "X ≥ D 金色");
      const doneEl = byClass(s.rootEl, "db-today__done")[0];
      assert.equal(doneEl.hidden, !done);
      assert.equal(doneEl.textContent, done ? "今日目標達成" : "");
      // 「X / D」只在進度列文字 1 次（進度條以 aria-valuetext 重述，不另顯示數字；AC-39-06）
      assert.equal(countText(s, x + " / 10"), 1);
    }
  });

  test("地圖框（§7.32.4、IA-3、IA-4）：div.card.db-map > 1 個 div.db-map__figure[role=img]，aria-label = 同一次推算的文字替代", () => {
    const content = F.loadContent();
    const s = setup({ expanded: false, content, data: { masteredWordKeys: ["the", "company"] } });
    const map = byClass(s.rootEl, "db-map")[0];
    assert.equal(map.tagName, "DIV");
    const figs = elKids(map);
    assert.equal(figs.length, 1);
    assert.equal(figs[0].className, "db-map__figure");
    assert.equal(figs[0].getAttribute("role"), "img");
    const want = D.dashboardModel(s.store.getState(), s.store.today(), content.part5, content).mapAlt;
    assert.equal(figs[0].getAttribute("aria-label"), want);
    assert.ok(want.startsWith("群島地圖：橘島掌握 25%，一棵椰子樹；棕島掌握 —，沙灘；綠島掌握 —，沙灘；"));
    const svgs = elKids(figs[0]);
    assert.equal(svgs.length, 1);
    assert.equal(svgs[0].getAttribute("aria-hidden"), "true");
  });

  test("島嶼清單（IA-2、AC-65-01、AC-65-02）：h3「島嶼」＋ 5 列結構；開放島 progressbar（含 P 為 null）；霧中島 aria-hidden", () => {
    // fixture 字庫 8 字全在橘島區段（N_O = 1,000）：橘 n = 8、m = 2 → P 25；棕、綠 n = 0 → P null
    const content = F.loadContent();
    const s = setup({ expanded: false, content, data: { masteredWordKeys: ["the", "company"] } });
    const sec = byClass(s.rootEl, "db-isles")[0];
    const [h3, ul] = elKids(sec);
    assert.equal(h3.tagName, "H3");
    assert.equal(h3.className, "section-title");
    assert.equal(h3.getAttribute("id"), "db-isles-h");
    assert.equal(h3.textContent, "島嶼");
    assert.equal(ul.tagName, "UL");
    assert.equal(ul.className, "db-isles__list");
    const rows = elKids(ul);
    assert.deepEqual(rows.map((r) => r.className), [
      "db-isle db-isle--orange is-open", "db-isle db-isle--brown is-open", "db-isle db-isle--green is-open",
      "db-isle db-isle--blue is-fog", "db-isle db-isle--gold is-fog"
    ]);
    for (const r of rows) {
      assert.equal(r.tagName, "LI");
      assert.deepEqual(elKids(r).map((n) => n.className), ["db-isle__dot", "db-isle__title", "db-isle__right", "db-isle__bar", "db-isle__stage"]);
      assert.equal(elKids(r)[0].getAttribute("aria-hidden"), "true", "色點 aria-hidden");
    }
    const part = (r, cls) => byClass(r, cls)[0];
    assert.deepEqual(rows.map((r) => [part(r, "db-isle__name").textContent, part(r, "db-isle__sub").textContent, part(r, "db-isle__right").textContent]), [
      ["橘島", "入門", "掌握 25%"], ["棕島", "基礎", "掌握 —"], ["綠島", "職場與商務", "掌握 —"],
      ["藍島", "高階商務", "尚未開放"], ["金島", "近母語", "尚未開放"]
    ]);
    assert.deepEqual(rows.map((r) => part(r, "db-isle__stage").textContent), [
      "長出第一棵椰子樹", "還是一片沙灘，掌握第一個字就會冒芽", "還是一片沙灘，掌握第一個字就會冒芽",
      "還在霧中，之後的版本開放", "還在霧中，之後的版本開放"
    ]);
    // 開放島：progressbar、min 0、max 100、now = P、aria-label「{島}掌握率」；P 為 null → 省略 aria-valuenow、填滿 0
    const bars = rows.map((r) => part(r, "db-isle__bar"));
    assert.deepEqual(bars.slice(0, 3).map((b) => [b.getAttribute("role"), b.getAttribute("aria-valuemin"), b.getAttribute("aria-valuemax"),
      b.getAttribute("aria-valuenow"), b.getAttribute("aria-label"), elKids(b)[0].style.width]), [
      ["progressbar", "0", "100", "25", "橘島掌握率", "25%"],
      ["progressbar", "0", "100", null, "棕島掌握率", "0%"],
      ["progressbar", "0", "100", null, "綠島掌握率", "0%"]
    ]);
    assert.ok(bars.slice(0, 3).every((b) => elKids(b)[0].className === "db-isle__fill"));
    // 霧中島：不是 progressbar、aria-hidden、無子元素、無 aria-label
    for (const b of bars.slice(3)) {
      assert.equal(b.getAttribute("role"), null);
      assert.equal(b.getAttribute("aria-hidden"), "true");
      assert.equal(b.getAttribute("aria-label"), null);
      assert.equal(b.getAttribute("aria-valuenow"), null);
      assert.equal(elKids(b).length, 0);
    }
    // 清單 P 與地圖文字替代一致（AC-65-03）
    const alt = byClass(s.rootEl, "db-map__figure")[0].getAttribute("aria-label");
    assert.ok(alt.includes("橘島掌握 25%，一棵椰子樹"));
  });

  test("地圖與清單無事件、無 tabindex（AC-64-10、AC-71-02）；群島頁本體的 data-go 依 Tab 順序為「變更」→「開始今日學習」", () => {
    const s = setup({ expanded: false, content: F.loadContent() });
    for (const cls of ["db-map", "db-isles"]) {
      const nodes = findAll(byClass(s.rootEl, cls)[0], () => true);
      assert.ok(nodes.length > 10, cls);
      for (const n of nodes) {
        assert.equal(n.getAttribute("tabindex"), null, cls + " 內無 tabindex");
        assert.deepEqual(Object.keys(n.listeners), [], cls + " 內無事件");
        assert.ok(n.tagName !== "BUTTON" && n.tagName !== "A" && n.tagName !== "INPUT", cls + " 內無控制項");
      }
    }
    const gos = findAll(bodyOf(s), (n) => n.getAttribute("data-go") !== null).map((n) => n.getAttribute("data-go"));
    assert.deepEqual(gos, ["customizer", "flashcards"]);
  });

  test("3 格數據（DB-5、AC-67-01）：第 1 格天氣行、第 3 格燈塔行在最下方；第 2 格不加行", () => {
    const s = withData({ streak: { days: 3, lastActiveDate: TODAY } });
    const cells = elKids(byClass(s.rootEl, "db-stats")[0]);
    assert.deepEqual(cells.map((c) => c.className), ["db-stat db-stat--streak", "db-stat db-stat--mastery", "db-stat db-stat--answered"]);
    assert.deepEqual(elKids(cells[0]).map((n) => n.className), ["db-stat__label", "db-stat__value", "db-stat__status"]);
    assert.deepEqual(elKids(cells[1]).map((n) => n.className), ["db-stat__label", "db-stat__value", "db-stat__sub"]);
    assert.deepEqual(elKids(cells[2]).map((n) => n.className), ["db-stat__label", "db-stat__value db-stat__value--answered", "db-stat__status"]);
    assert.equal(byClass(cells[0], "db-stat__num")[0].textContent, "3");
    assert.equal(byClass(cells[0], "db-stat__status")[0].textContent, "晴天");
    // 未設定 EMT.content：Q = 0 →「—」，燈塔行仍為「燈塔待建」（IS-12）
    assert.equal(byClass(cells[2], "db-stat__value--answered")[0].textContent, "—");
    assert.equal(byClass(cells[2], "db-stat__status")[0].textContent, "燈塔待建");
    const s0 = setup({ expanded: false });
    assert.equal(byClass(s0.rootEl, "db-stat__status")[0].textContent, "陰天");
    const s7 = withData({ streak: { days: 7, lastActiveDate: TODAY } });
    assert.equal(byClass(s7.rootEl, "db-stat__status")[0].textContent, "出現彩虹");
  });

  test("AC-39-06、V-LAY-08：列舉文字各 1 次；色級名稱「{色}級」只在目標標籤（島名不計）；無舊標籤、功能入口、環形圖", () => {
    const s = setup({ expanded: true, content: F.loadContent(), data: { masteredWordKeys: ["the"], streak: { days: 3, lastActiveDate: TODAY } } });
    const st = s.store.getState();
    const m = D.dashboardModel(st, s.store.today(), s.sandbox.EMT.content.part5, s.sandbox.EMT.content);
    for (const t of ["模擬測驗", "單字掌握率", "連續打卡天數", m.stats.answeredText, m.today.x + " / " + m.today.d, "綠級"]) {
      assert.equal(countText(s, t), 1, t);
    }
    assert.ok(m.stats.answeredText.startsWith("已答對 "));
    for (const t of ["橘級", "棕級", "藍級", "金級", "正確率", "累計答對", "單字掌握數", "目前目標色級", "目前生效色級", "功能入口",
      "學習統計", "目前目標", "今日學習進度", "資料來源與授權", "主控台"]) {
      assert.equal(countText(s, t), 0, t);
    }
    // 島名可出現（地圖與清單），不屬色級名稱（IA-5）
    assert.ok(countText(s, "橘島") >= 2);
    assert.equal(byClass(s.rootEl, "db-ring").length, 0);
  });

  test("show() 才播放地圖動畫；減少動態不播放；停留期間簽章改變才重建且不播放；隱藏期間不同步重建（AC-70-01、AC-70-02、AC-31-03、§7.32.8、§7.32.15）", () => {
    // 預設 setup 走瀏覽器登錄路徑：沙箱無 requestIdleCallback／setTimeout → 隱藏期間不排程，show() 同步重算
    const s = setup({ expanded: false });
    const fig = () => byClass(s.rootEl, "db-map__figure")[0];
    const playing = () => byClass(fig(), "isl-map")[0].classList.contains("isl-map--play");
    assert.equal(playing(), false, "mount 時不播放");
    s.view.show();
    assert.equal(playing(), true, "show() 播放");
    const shown = fig();
    // 停留期間收到 PROGRESS_TAGS 通知、簽章不變（"dashboard"：setBackupExpanded）→ 同一節點
    s.a.setBackupExpanded(true);
    assert.equal(fig(), shown, "簽章不變 → 沿用");
    // 停留期間簽章改變（翻到背面：今日已學 + 1、打卡）→ 重建但不播放
    s.a.setTab("flashcards");
    s.a.flipCard();
    assert.notEqual(fig(), shown, "簽章改變 → 重建");
    assert.equal(playing(), false, "停留期間不重播");
    s.a.flipCard(); // 翻回正面
    // 離開群島頁：通知不同步繪製（無閒置排程器 → 也不預先重建）
    s.view.hide();
    const hiddenFig = fig();
    s.a.gotoCard(1);
    s.a.flipCard();
    assert.equal(fig(), hiddenFig, "隱藏期間不重建地圖");
    assert.equal(byClass(s.rootEl, "db-today__text")[0].textContent, "今日已學 1 / 15 字", "隱藏期間文字不更新");
    // 回到群島頁：以當下狀態重算，簽章改變 → 重建並播放
    s.a.setTab("dashboard");
    s.view.show();
    assert.notEqual(fig(), hiddenFig);
    assert.equal(playing(), true, "進入即播放");
    assert.equal(byClass(s.rootEl, "db-today__text")[0].textContent, "今日已學 2 / 15 字");
    // 狀態未變：離開再進入 → 同一節點、帶 isl-map--play（重播靠頁面 hidden 切換）
    const again = fig();
    s.view.hide();
    s.view.show();
    assert.equal(fig(), again);
    assert.equal(playing(), true, "沿用時以 isl-map--play 判定播放");
    // 減少動態：show() 沿用並移除動畫 class
    s.flags.reduced = true;
    s.view.hide();
    s.view.show();
    assert.equal(fig(), again);
    assert.equal(playing(), false, "減少動態不播放");
    const r = setup({ expanded: false, reduced: true });
    r.view.show();
    assert.equal(byClass(byClass(r.rootEl, "db-map__figure")[0], "isl-map")[0].classList.contains("isl-map--play"), false);
  });

  // ── v0.21 效能修正（FE-116；§7.32.15 P-1～P-3、§10.15） ──

  /** 閒置排程器替身：request 只記錄、不執行；run() 手動執行全部待執行工作 */
  function fakeIdle() {
    const tasks = new Map();
    let seq = 0;
    const log = { requests: 0, cancels: [] };
    return {
      log,
      api: {
        request(fn) { log.requests++; seq++; tasks.set(seq, fn); return seq; },
        cancel(h) { log.cancels.push(h); tasks.delete(h); }
      },
      pending: () => tasks.size,
      run() {
        const fns = [...tasks.values()];
        tasks.clear();
        fns.forEach((fn) => fn({ didTimeout: false, timeRemaining: () => 50 }));
      }
    };
  }
  const figOf = (s) => byClass(s.rootEl, "db-map__figure")[0];
  const playOf = (s) => byClass(figOf(s), "isl-map")[0].classList.contains("isl-map--play");
  const islesOf = (s) => elKids(byClass(s.rootEl, "db-isles__list")[0]);
  /** 執行 fn 期間的 setItem 次數 */
  const writesDuring = (s, fn) => { const n = s.storage.setCalls.length; fn(); return s.storage.setCalls.length - n; };
  /**
   * 以包裝 store 覆寫 getState().data 的部分欄位（真實 store 不變、通知仍由真實 store 發出）；
   * 回傳 box，設定 box.patch 即生效。用於構造「只改 P」等狀態。
   */
  function overrideData(s) {
    const real = s.store;
    const box = { patch: null };
    s.sandbox.EMT.store = Object.assign(Object.create(real), {
      getState() {
        const st = real.getState();
        return box.patch ? Object.assign({}, st, { data: Object.assign({}, st.data, box.patch) }) : st;
      }
    });
    return box;
  }

  test("FE-116 P-1：mount → show() 只 build 1 次；hide → show() 狀態未變 → build 0 次、同一 figure、svg 有 isl-map--play", () => {
    const idle = fakeIdle();
    const s = setup({ expanded: false, idle: idle.api });
    assert.equal(s.counts.build, 1, "mount 建 1 次");
    const mounted = figOf(s);
    assert.equal(playOf(s), false);
    s.view.show();
    assert.equal(s.counts.build, 1, "首次 show() 簽章相同 → 只 setPlay");
    assert.equal(figOf(s), mounted);
    assert.equal(playOf(s), true);
    let w = writesDuring(s, () => {
      for (let i = 0; i < 3; i++) {
        s.view.hide();
        s.view.show();
      }
    });
    assert.equal(s.counts.build, 1, "狀態未變 → build 0 次");
    assert.equal(figOf(s), mounted, "同一 figure");
    assert.equal(playOf(s), true);
    assert.equal(byClass(s.rootEl, "db-map__figure").length, 1);
    assert.equal(idle.log.requests, 0, "無資料變更 → 不排閒置工作");
    assert.equal(w, 0, "setItem 0 次");
  });

  test("FE-116 P-1：減少動態 → 沿用的 svg 無 isl-map--play；解除後再進入 → setPlay 加回（AC-70-02）", () => {
    const s = setup({ expanded: false, reduced: true, idle: fakeIdle().api });
    s.view.show();
    const f = figOf(s);
    assert.equal(playOf(s), false);
    s.view.hide();
    s.view.show();
    assert.equal(figOf(s), f);
    assert.equal(playOf(s), false, "reduced 時無該 class");
    s.flags.reduced = false;
    s.view.hide();
    s.view.show();
    assert.equal(figOf(s), f);
    assert.equal(playOf(s), true);
    s.flags.reduced = true;
    s.view.hide();
    s.view.show();
    assert.equal(playOf(s), false, "setPlay 移除");
    assert.equal(s.counts.build, 1);
  });

  test("FE-116 P-1：只改 P（同階段）→ 沿用並更新 aria-label；階段改變 → 重建並播放", () => {
    const content = F.loadContent();
    const wk = [...content.builtinMap.keys()];
    assert.ok(wk.length >= 4);
    const s = setup({ expanded: false, content, idle: fakeIdle().api, data: { masteredWordKeys: wk.slice(0, 2) } });
    const box = overrideData(s);
    s.view.show();
    const f = figOf(s);
    const alt0 = f.getAttribute("aria-label");
    assert.ok(alt0.includes("橘島掌握 25%，一棵椰子樹"));
    const builds = s.counts.build;
    // 2 → 3 字：P 25 → 38，仍為「一棵椰子樹」
    box.patch = { masteredWordKeys: wk.slice(0, 3) };
    s.view.hide();
    s.view.show();
    assert.equal(s.counts.build, builds, "簽章不變 → 不重建");
    assert.equal(figOf(s), f);
    const want = D.dashboardModel(s.sandbox.EMT.store.getState(), s.store.today(), content.part5, content).mapAlt;
    assert.notEqual(want, alt0);
    assert.equal(f.getAttribute("aria-label"), want, "aria-label 更新為新的文字替代");
    assert.ok(want.includes("橘島掌握 38%，一棵椰子樹"));
    assert.equal(playOf(s), true);
    // 2 → 4 字：P 50「開花」→ 階段改變 → 重建（play 依減少動態）
    box.patch = { masteredWordKeys: wk.slice(0, 4) };
    s.view.hide();
    s.view.show();
    assert.equal(s.counts.build, builds + 1, "階段改變 → 重建");
    assert.notEqual(figOf(s), f);
    assert.equal(playOf(s), true);
    assert.ok(figOf(s).getAttribute("aria-label").includes("橘島掌握 50%，開花"));
  });

  test("FE-116：停留期間通知 → 簽章不同才重建，且不播放（AC-70-01）", () => {
    const idle = fakeIdle();
    const s = setup({ expanded: false, idle: idle.api });
    s.view.show();
    const f = figOf(s);
    const builds = s.counts.build;
    s.a.setBackupExpanded(true);
    s.a.setBackupExpanded(false);
    assert.equal(s.counts.build, builds, "簽章不變 → 不重建");
    assert.equal(figOf(s), f);
    assert.equal(playOf(s), true, "沿用節點不動動畫 class");
    s.a.setTab("flashcards");
    s.a.flipCard();
    assert.equal(s.counts.build, builds + 1, "簽章改變 → 重建 1 次");
    assert.notEqual(figOf(s), f);
    assert.equal(playOf(s), false, "live 不播放");
    assert.equal(byClass(s.rootEl, "db-today__text")[0].textContent, "今日已學 1 / 15 字");
    s.a.flipCard();
    assert.equal(s.counts.build, builds + 1, "翻回正面：簽章不變");
    assert.equal(idle.log.requests, 0, "顯示中不排閒置工作");
  });

  test("FE-116 P-3：隱藏期間通知 → 當下 DOM 不變、build 0 次、只排 1 次閒置工作；執行後重建並帶 isl-map--play，之後 show() build 0 次", () => {
    const idle = fakeIdle();
    const s = setup({ expanded: false, idle: idle.api });
    s.view.show();
    s.view.hide();
    s.a.setTab("flashcards");
    const f = figOf(s);
    const lis = islesOf(s);
    const textOf = (cls) => byClass(s.rootEl, cls)[0].textContent;
    const before = ["db-today__text", "db-host__bubble", "db-stat__num", "db-stat__status", "db-bars"].map(textOf);
    const builds = s.counts.build;
    s.a.flipCard(); // 背面：學習 + 打卡
    s.a.flipCard(); // 正面
    s.a.gotoCard(1);
    s.a.flipCard();
    assert.equal(s.counts.build, builds, "build 0 次");
    assert.equal(figOf(s), f);
    assert.deepEqual(islesOf(s), lis, "清單節點不變");
    assert.deepEqual(["db-today__text", "db-host__bubble", "db-stat__num", "db-stat__status", "db-bars"].map(textOf), before,
      "文字不變");
    assert.equal(idle.log.requests, 1, "連續通知只排 1 次");
    assert.equal(idle.pending(), 1);
    // 執行閒置工作 → 預先重算、重建（play 依減少動態；頁面 hidden 下動畫不執行）
    let w = writesDuring(s, () => idle.run());
    assert.equal(w, 0, "預先重建 setItem 0 次");
    assert.equal(s.counts.build, builds + 1);
    const prepared = figOf(s);
    assert.notEqual(prepared, f);
    assert.equal(playOf(s), true, "預先重建帶 isl-map--play");
    assert.equal(textOf("db-today__text"), "今日已學 2 / 15 字");
    // 回到群島頁：簽章相同 → 沿用
    s.a.setTab("dashboard");
    w = writesDuring(s, () => s.view.show());
    assert.equal(w, 0);
    assert.equal(s.counts.build, builds + 1, "之後 show() build 0 次");
    assert.equal(figOf(s), prepared);
    assert.equal(playOf(s), true);
    assert.equal(idle.log.cancels.length, 0, "無待執行工作可取消");
    // 下次隱藏期間的變更會再排 1 次
    s.view.hide();
    s.a.setTab("flashcards");
    s.a.flipCard();
    assert.equal(idle.log.requests, 2);
  });

  test("FE-116 P-3：閒置工作執行前 show() → 取消排程並同步重建（AC-64-09）；之後回呼即使執行也不重建", () => {
    const idle = fakeIdle();
    const s = setup({ expanded: false, idle: idle.api });
    s.view.show();
    s.view.hide();
    s.a.setTab("flashcards");
    s.a.flipCard();
    assert.equal(idle.pending(), 1);
    const f = figOf(s);
    const builds = s.counts.build;
    s.a.setTab("dashboard");
    s.view.show();
    assert.deepEqual(idle.log.cancels, [1], "取消待執行的閒置工作");
    assert.equal(idle.pending(), 0);
    assert.equal(s.counts.build, builds + 1, "同步重建");
    assert.notEqual(figOf(s), f);
    assert.equal(playOf(s), true);
    assert.equal(byClass(s.rootEl, "db-today__text")[0].textContent, "今日已學 1 / 15 字", "回來即新值");
    idle.run();
    assert.equal(s.counts.build, builds + 1);
    // 回呼在 show() 之後才到（取消未生效的替身）：頁面顯示中 → 不做事
    const leaky = { fns: [], request(fn) { this.fns.push(fn); return 7; }, cancel() {} };
    const t = setup({ expanded: false, idle: leaky });
    t.view.show();
    t.view.hide();
    t.a.setTab("flashcards");
    t.a.flipCard();
    t.view.show();
    const n = t.counts.build;
    const tf = figOf(t);
    leaky.fns.forEach((fn) => fn());
    assert.equal(t.counts.build, n, "已取消的工作不重建");
    assert.equal(figOf(t), tf);
  });

  test("FE-116：show() 未經 hide() 再呼叫 → 重建並播放（§7.32.8 保底）；減少動態時重建但不播放", () => {
    const s = setup({ expanded: false, idle: fakeIdle().api });
    s.view.show();
    const f = figOf(s);
    const builds = s.counts.build;
    s.view.show();
    assert.equal(s.counts.build, builds + 1);
    assert.notEqual(figOf(s), f);
    assert.equal(playOf(s), true);
    s.flags.reduced = true;
    s.view.show();
    assert.equal(s.counts.build, builds + 2);
    assert.equal(playOf(s), false);
  });

  test("FE-116 P-2：清單內容不變 → li 為同一節點；內容改變才重建", () => {
    const s = setup({ expanded: false, idle: fakeIdle().api });
    s.view.show();
    const lis = islesOf(s);
    assert.equal(lis.length, 5);
    s.view.hide();
    s.view.show();
    s.a.setBackupExpanded(true);
    s.view.show();
    assert.deepEqual(islesOf(s), lis);
    lis.forEach((li, i) => assert.equal(islesOf(s)[i], li, "第 " + (i + 1) + " 列同一節點"));
    // 內容改變（無內容快照時三島 P 為 null，只有今日進度變 → 清單內容不變）
    s.a.setTab("flashcards");
    s.a.flipCard();
    assert.equal(islesOf(s)[0], lis[0], "清單內容不受今日進度影響");
    // 有內容快照：掌握字數改變 → 橘島列內容改變 → 重建
    const content = F.loadContent();
    const t = setup({ expanded: false, content, idle: fakeIdle().api });
    const box = overrideData(t);
    t.view.show();
    const before = islesOf(t);
    box.patch = { masteredWordKeys: ["the"] };
    t.view.hide();
    t.view.show();
    assert.notEqual(islesOf(t)[0], before[0]);
    assert.equal(byClass(islesOf(t)[0], "db-isle__right")[0].textContent, "掌握 13%");
  });

  test("FE-116 idleScheduler(host)：requestIdleCallback（timeout 500）優先、否則 setTimeout（100 ms）、兩者皆無 → request 回 null", () => {
    const log = [];
    const fn = () => log.push("ran");
    // 有 requestIdleCallback（同時有 setTimeout 也不用）
    const h1 = {
      requestIdleCallback(f, o) { log.push(["ric", f === fn, o]); return 11; },
      cancelIdleCallback(h) { log.push(["cic", h]); },
      setTimeout() { log.push("st"); return 99; },
      clearTimeout() { log.push("ct"); }
    };
    const s1 = D.idleScheduler(h1);
    assert.equal(s1.request(fn), 11);
    s1.cancel(11);
    s1.cancel(null);
    assert.deepEqual(log.splice(0), [["ric", true, { timeout: 500 }], ["cic", 11]]);
    // 只有 setTimeout
    const h2 = {
      setTimeout(f, ms) { log.push(["st", f === fn, ms]); return 22; },
      clearTimeout(h) { log.push(["ct", h]); }
    };
    const s2 = D.idleScheduler(h2);
    assert.equal(s2.request(fn), 22);
    s2.cancel(22);
    s2.cancel(undefined);
    assert.deepEqual(log.splice(0), [["st", true, 100], ["ct", 22]]);
    // 兩者皆無
    for (const h of [{}, null, undefined, 0]) {
      const s3 = D.idleScheduler(h);
      assert.equal(s3.request(fn), null);
      assert.doesNotThrow(() => s3.cancel(null));
      assert.doesNotThrow(() => s3.cancel(5));
    }
    assert.deepEqual(log, [], "不執行 fn、不呼叫任何 API");
  });

  test("FE-116 原始碼：不用 requestAnimationFrame、Web Animations API、強制重排；地圖與清單無事件與 tabindex（AC-70-03、AC-64-10）", () => {
    const src = read("views/dashboard.js");
    for (const bad of [/requestAnimationFrame/, /\.animate\s*\(/, /getAnimations/, /offsetWidth|offsetHeight|getBoundingClientRect|getComputedStyle/]) {
      assert.ok(!bad.test(src), String(bad));
    }
    const s = setup({ expanded: false, content: F.loadContent(), idle: fakeIdle().api });
    s.view.show();
    s.view.hide();
    s.view.show();
    for (const cls of ["db-map", "db-isles"]) {
      const nodes = findAll(byClass(s.rootEl, cls)[0], () => true);
      assert.ok(nodes.every((n) => Object.keys(n.listeners).length === 0), cls + " 無事件");
      assert.ok(nodes.every((n) => n.getAttribute("tabindex") === null), cls + " 無 tabindex");
    }
  });

  test("回到群島頁即新值（AC-64-09、IS-3）：單字卡答對 1 字後 show() → 對話框、今日進度、地圖、清單、3 格都是新值", () => {
    const content = F.loadContent();
    const s = setup({ expanded: false, content });
    s.view.show();
    const right0 = () => byClass(byClass(s.rootEl, "db-isle--orange")[0], "db-isle__right")[0].textContent;
    assert.equal(right0(), "掌握 0%");
    assert.equal(byClass(s.rootEl, "db-host__bubble")[0].textContent, "再學 15 個字，今天的小船就靠岸囉！");
    s.view.hide();
    s.a.setTab("flashcards");
    assert.equal(s.a.setFlashcardMode("quiz").ok, true);
    const q = s.store.getState().runtime.flashcard.quiz;
    assert.equal(s.a.answerVocabQuiz(q.correctIndex).ok, true);
    s.a.setFlashcardMode("card");
    s.a.setTab("dashboard");
    s.view.show();
    // 橘 n = 8、m = 1 → P 13（新芽）；X = 1
    assert.equal(right0(), "掌握 13%");
    assert.equal(byClass(s.rootEl, "db-host__bubble")[0].textContent, "再學 14 個字，今天的小船就靠岸囉！");
    assert.equal(byClass(s.rootEl, "db-today__text")[0].textContent, "今日已學 1 / 15 字");
    assert.equal(byClass(s.rootEl, "db-stat__sub")[0].textContent, "已掌握 1 字");
    const m = D.dashboardModel(s.store.getState(), s.store.today(), content.part5, content);
    const alt = byClass(s.rootEl, "db-map__figure")[0].getAttribute("aria-label");
    assert.equal(alt, m.mapAlt);
    assert.ok(alt.includes("橘島掌握 13%，新芽") && alt.includes("今日小船 1 / 15 字，航行中"));
  });

  test("瀏覽群島頁 setItem 0 次、localStorage 不變、不含島嶼鍵（AC-72-02、IS-1、IS-2、V-ISL-07）", () => {
    const s = setup({ expanded: false, content: F.loadContent(), data: { masteredWordKeys: ["the"] } });
    const snap = JSON.stringify([...s.storage.map.entries()]);
    const writes = s.storage.setCalls.length;
    s.view.show();
    s.view.hide();
    s.view.show();
    byClass(s.rootEl, "db-backup__toggle")[0].click();
    byClass(s.rootEl, "db-backup__toggle")[0].click();
    s.view.show();
    assert.equal(s.storage.setCalls.length, writes, "setItem 0 次");
    assert.equal(JSON.stringify([...s.storage.map.entries()]), snap);
    for (const k of ["islands", "stage", "weather", "lighthouse", "boat", "islandFeedback", "mapAlt", "dialog"]) {
      assert.ok(!snap.includes('"' + k + '"'), k);
    }
    // IslandState 不進入 AppState
    const st = s.store.getState();
    assert.equal("island" in st.data, false);
    assert.equal("island" in st.runtime, false);
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
    assert.equal(byClass(s.rootEl, "db-stat--accuracy").length, 0);
    // 未設定 EMT.content：Q = 0 顯示「—」（AS-4）；（v0.19）最下方為燈塔行（IS-12）
    assert.equal(byClass(s.rootEl, "db-stat--answered")[0].textContent, "模擬測驗—燈塔待建");
  });

  // ── 第 3 格（v0.19，FE-84；AS-3、AS-4、V-ANS-02） ──

  /** 與 store 共用同一份 content，並取得目前第 1 題的正確選項與答錯選項 */
  function setupAnswered() {
    const s = setup({ expanded: false, content: F.loadContent() });
    const bank = s.sandbox.EMT.content.part5;
    const value = () => byClass(s.rootEl, "db-stat__value--answered")[0].textContent;
    return { s, bank, value };
  }

  test("第 3 格：標籤「模擬測驗」、值元素 class、已答對行在主控台恰 1 次（AC-49-01）", () => {
    const { s, bank, value } = setupAnswered();
    const cell = byClass(s.rootEl, "db-stat--answered")[0];
    assert.equal(byClass(cell, "db-stat__label")[0].textContent, "模擬測驗");
    const el = byClass(cell, "db-stat__value--answered")[0];
    assert.equal(el.tagName, "P");
    assert.ok(el.classList.contains("db-stat__value"));
    const text = "已答對 0 / " + bank.length + " 題（0%）";
    assert.equal(value(), text);
    assert.equal(countText(s, text), 1);
    assert.equal(countText(s, "正確率"), 0);
  });

  test("V-ANS-02：作答答對 → K + 1 並即時更新；答錯 → 不變；清除 → K = 0，累計照常保留（AC-49-04、AC-49-05、AC-46-08）", () => {
    // （FE-116，§7.32.15 P-3）群島頁隱藏時以閒置排程預先重建：每次讀值前先執行待執行的閒置工作（替身）
    const idle = fakeIdle();
    const s = setup({ expanded: false, content: F.loadContent(), idle: idle.api });
    const bank = s.sandbox.EMT.content.part5;
    const value = () => {
      idle.run();
      return byClass(s.rootEl, "db-stat__value--answered")[0].textContent;
    };
    const line = (k) => {
      const p = Math.floor((200 * k + bank.length) / (2 * bank.length));
      return "已答對 " + k + " / " + bank.length + " 題（" + p + "%）";
    };
    assert.ok(bank.length >= 2, "fixture 至少 2 題");
    s.a.setTab("part5");
    s.a.answerPart5(bank[0].correctIndex);
    assert.equal(value(), line(1));
    s.a.nextPart5();
    s.a.answerPart5((bank[1].correctIndex + 1) % 4);
    assert.equal(value(), line(1), "答錯不變");
    assert.deepEqual([s.store.getState().data.part5.totalAnswered, s.store.getState().data.part5.totalCorrect], [2, 1], "累計照常更新（AS-7）");
    const r = s.a.clearPart5CorrectIds();
    assert.equal(r.ok, true);
    assert.equal(value(), line(0), "清除後主控台不需換頁即更新");
    assert.deepEqual([s.store.getState().data.part5.totalAnswered, s.store.getState().data.part5.totalCorrect], [2, 1], "清除不動累計");
  });

  test("畫面只讀不寫：K、Q、P 不寫入任何儲存（AS-7）；第 3 格不含累計數字", () => {
    const { s, bank } = setupAnswered();
    s.a.answerPart5(bank[0].correctIndex);
    const raw = s.storage.map.get("englishMasterTrack:state");
    const data = JSON.parse(raw).data;
    const writes = s.storage.setCalls.length;
    s.view.show();
    assert.equal(s.storage.setCalls.length, writes, "重繪不寫入");
    assert.equal(s.storage.map.get("englishMasterTrack:state"), raw);
    assert.deepEqual(data.part5CorrectIds, [bank[0].id]);
    for (const key of ["answeredSummary", "answered", "k", "q", "p"]) {
      assert.equal(Object.prototype.hasOwnProperty.call(data, key), false, key);
    }
  });

  test("原始碼：第 3 格走 answeredSummary／answeredSummaryText；不再引用累計欄位、statAccuracyLabel、percentOf", () => {
    const src = read("views/dashboard.js").replace(/\/\*[\s\S]*?\*\//g, "");
    assert.ok(src.includes("PF.answeredSummary("));
    assert.ok(src.includes("PF.answeredSummaryText("));
    for (const w of ["statAccuracyLabel", "totalAnswered", "totalCorrect", "percentOf", "accuracy", "正確率"]) {
      assert.ok(!src.includes(w), w);
    }
    assert.ok(D.PROGRESS_TAGS.includes("part5"), "清除紀錄後主控台須更新");
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

  test("10-dashboard.css：720px 置中、長條區 104px／軌道 64px、空狀態 24px、3 欄、數值 28px、目標行 44px、箭頭無 transition", () => {
    const css = read("styles/10-dashboard.css").replace(/\/\*[\s\S]*?\*\//g, "");
    const rule = (sel) => {
      const m = new RegExp("(?:^|\\})\\s*" + sel.replace(/[.[\]="()]/g, "\\$&") + "\\s*\\{([^}]*)\\}").exec(css);
      assert.ok(m, sel);
      return m[1];
    };
    const v = (r, p) => (new RegExp("(?:^|;|\\s)" + p + ":\\s*([^;]+);").exec(r) || [])[1];
    assert.equal(v(rule(".dashboard"), "max-width"), "var(--content-narrow)");
    assert.equal(v(rule(".dashboard"), "margin-inline"), "auto");
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
    // （v0.19，FE-84）已答對行 ≥ 14px、可換行、tabular-nums；無 --accent、nowrap（§7.25.1、AC-49-08）
    const ans = rule(".db-stat__value--answered");
    assert.equal(v(ans, "font-size"), "0.875rem");
    assert.ok(0.875 * 16 >= 14);
    assert.equal(v(ans, "line-height"), "1.35");
    assert.equal(v(ans, "font-variant-numeric"), "tabular-nums");
    assert.equal(v(ans, "overflow-wrap"), "anywhere");
    assert.doesNotMatch(ans, /--accent|nowrap|ellipsis/);
    assert.ok(css.indexOf(".db-stat__value--answered") > css.indexOf(".db-stat__value {"), "須在基底規則之後才能覆寫字級");
  });

  test("（v0.9，FE-66）原始碼不含 goalLineCapped、goalLineSeparator、builtinCap、btn--link、LAY.goalLine(、db-goal__sep", () => {
    const src = read("views/dashboard.js");
    for (const w of ["goalLineCapped", "goalLineSeparator", "builtinCap", "btn--link", "LAY.goalLine(", "db-goal__sep", "內建上限"]) {
      assert.ok(!src.includes(w), w);
    }
    assert.ok(src.includes("LAY.goalLineText("));
  });

  test("（v0.9，FE-66；v0.19 FE-108）10-dashboard.css：.db-change 外框按鈕（V-LAY-10：外框沿用 .btn 的 2px 外框色、圓角 14px）；.db-goal gap 8px；無 .db-goal__sep；無禁止色", () => {
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
    assert.equal(v(c, "padding"), "0 14px");
    assert.equal(v(c, "background"), "var(--surface)");
    // 外框與圓角不覆寫：沿用全域 .btn（border: var(--outline-w) solid var(--outline)、var(--radius-btn) = 14px，§7.32.7）
    for (const p of ["border", "border-width", "border-color", "border-style", "border-radius"]) assert.equal(v(c, p), undefined, p);
    const base = read("styles/00-base.css").replace(/\/\*[\s\S]*?\*\//g, "");
    const btn = (/(?:^|\})\s*\.btn\s*\{([^}]*)\}/.exec(base) || [])[1];
    assert.ok(btn, ".btn");
    assert.equal(v(btn, "border"), "var(--outline-w) solid var(--outline)");
    assert.equal(v(btn, "border-radius"), "var(--radius-btn)");
    assert.match(base, /--outline-w:\s*2px;/);
    assert.match(base, /--radius-btn:\s*14px;/);
    assert.equal(v(c, "color"), "var(--brand-deep)");
    assert.equal(v(c, "font-weight"), "600");
    assert.equal(v(c, "text-decoration"), "none");
    assert.equal(v(rule(".db-goal"), "gap"), "8px");
    assert.match(css, /@media \(hover: hover\)\s*\{\s*\.db-change:hover\s*\{\s*background: var\(--tint\);\s*\}/);
    assert.doesNotMatch(css, /\.db-goal__sep/);
    const block = css.slice(css.indexOf(".db-change"), css.indexOf("}", css.lastIndexOf(".db-change:hover")) + 1);
    for (const w of ["var(--accent)", "var(--border)", "#d5d9e0", "#f7893b", "color: var(--brand);"]) assert.ok(!block.includes(w), w);
  });

  test("（v0.19，FE-108）10-dashboard.css 群島頁：今日任務卡與地圖框外框／陰影、地圖 480px 置中、進度條無轉場、清單列與 3 格卡片樣式、無環形圖規則", () => {
    const css = read("styles/10-dashboard.css").replace(/\/\*[\s\S]*?\*\//g, "");
    const rule = (sel) => {
      const m = new RegExp("(?:^|\\})\\s*" + sel.replace(/[.[\]="():]/g, "\\$&") + "\\s*\\{([^}]*)\\}").exec(css);
      assert.ok(m, sel);
      return m[1];
    };
    const v = (r, p) => (new RegExp("(?:^|;|\\s)" + p + ":\\s*([^;]+);").exec(r) || [])[1];
    // 標題列（DB-1、AC-66-04：可換行）
    const head = rule(".db-head");
    assert.equal(v(head, "display"), "flex");
    assert.equal(v(head, "flex-wrap"), "wrap");
    assert.equal(v(head, "justify-content"), "space-between");
    const tag = rule(".db-goal__tag");
    assert.equal(v(tag, "border"), "var(--outline-w) solid var(--outline)");
    assert.equal(v(tag, "border-radius"), "999px");
    assert.equal(v(tag, "background"), "var(--surface)");
    // 今日任務卡：3px 外框、立體陰影（§7.32.3、AC-68-02）
    const today = rule(".db-today");
    assert.equal(v(today, "border-width"), "var(--outline-w-strong)");
    assert.equal(v(today, "box-shadow"), "var(--shadow-pop)");
    assert.equal(v(today, "display"), "grid");
    assert.equal(v(rule(".db-host__turtle"), "flex"), "none");
    const bubble = rule(".db-host__bubble");
    assert.equal(v(bubble, "background"), "var(--dialog-bg)");
    assert.equal(v(bubble, "border-radius"), "16px 16px 16px 4px");
    assert.equal(v(bubble, "overflow-wrap"), "anywhere");
    assert.equal(v(rule(".db-host__talk"), "min-width"), "0");
    const bar = rule(".db-today__bar");
    assert.equal(v(bar, "height"), "14px");
    assert.equal(v(bar, "background"), "var(--isl-track)");
    assert.equal(v(bar, "border"), "var(--outline-w) solid var(--outline)");
    assert.equal(v(rule(".db-today__fill"), "background"), "var(--brand)");
    assert.equal(v(rule(".db-today__fill"), "transition"), "none");
    assert.equal(v(rule(".db-today__fill--done"), "background"), "var(--color-gold)");
    assert.equal(v(rule(".db-today__text"), "white-space"), "nowrap");
    assert.equal(v(rule(".db-start"), "width"), "100%");
    assert.equal(v(rule(".db-start"), "min-height"), "52px");
    // 地圖框：最大寬 480px 置中、3px 外框、圓角 26px、海面底、立體陰影、cursor default（AC-63-04、AC-64-10）
    const map = rule(".db-map");
    assert.equal(v(map, "max-width"), "480px");
    assert.equal(v(map, "margin-inline"), "auto");
    assert.equal(v(map, "border-width"), "var(--outline-w-strong)");
    assert.equal(v(map, "border-radius"), "26px");
    assert.equal(v(map, "padding"), "0");
    assert.equal(v(map, "overflow"), "hidden");
    assert.equal(v(map, "background"), "var(--sea)");
    assert.equal(v(map, "box-shadow"), "var(--shadow-pop)");
    assert.equal(v(map, "cursor"), "default");
    // 島嶼清單（§7.32.5、AC-65-01、AC-65-04）
    assert.equal(v(rule(".db-isles"), "cursor"), "default");
    assert.equal(v(rule(".db-isles__list"), "list-style"), "none");
    const isle = rule(".db-isle");
    assert.equal(v(isle, "grid-template-columns"), "28px minmax(0, 1fr) auto");
    assert.equal(v(isle, "min-height"), "44px");
    assert.equal(v(isle, "border"), "var(--outline-w) solid var(--outline)");
    assert.equal(v(isle, "border-radius"), "16px");
    assert.equal(v(isle, "background"), "var(--surface)");
    assert.equal(v(rule(".db-isle.is-fog"), "background"), "var(--fog-row)");
    assert.equal(v(rule(".db-isle.is-fog .db-isle__dot"), "opacity"), "0.5");
    assert.equal(v(rule(".db-isle__right"), "font-variant-numeric"), "tabular-nums");
    assert.equal(v(rule(".db-isle__title"), "min-width"), "0");
    assert.equal(v(rule(".db-isle__bar"), "height"), "8px");
    assert.equal(v(rule(".db-isle__fill"), "transition"), "none");
    for (const id of ["orange", "brown", "green", "blue", "gold"]) {
      assert.match(css, new RegExp("\\.db-isle--" + id + " \\.db-isle__dot[^{]*\\{\\s*background: var\\(--color-" + id + "\\);"), id);
    }
    for (const id of ["orange", "brown", "green"]) {
      assert.match(css, new RegExp("\\.db-isle--" + id + " \\.db-isle__fill \\{\\s*background: var\\(--color-" + id + "\\);"), id);
    }
    // 3 格：同一列；每格為區塊卡片樣式（白底、2px 外框、圓角 16px）；狀態行 12px、--text-muted
    const stat = rule(".db-stat");
    assert.equal(v(stat, "border"), "var(--outline-w) solid var(--outline)");
    assert.equal(v(stat, "border-radius"), "16px");
    assert.equal(v(stat, "background"), "var(--surface)");
    assert.equal(v(stat, "padding"), "12px 8px");
    const status = rule(".db-stat__status");
    assert.equal(v(status, "font-size"), "12px");
    assert.equal(v(status, "color"), "var(--text-muted)");
    assert.equal(v(status, "overflow-wrap"), "anywhere");
    // 移除環形圖規則；無強調橘字面值；var(--accent) 只在 .db-stat__icon
    assert.doesNotMatch(css, /\.db-ring/);
    assert.doesNotMatch(css, /#f7893b/i);
    assert.equal(css.split("var(--accent)").length - 1, 1);
    // cursor: pointer 只在「資料備份」標題列按鈕（既有控制項）；地圖、清單相關規則不設 pointer（AC-64-10）
    const blocks = [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)].map((m) => ({ sel: m[1].trim(), body: m[2] }));
    const pointer = blocks.filter((b) => /cursor:\s*pointer/.test(b.body)).map((b) => b.sel);
    assert.deepEqual(pointer, [".db-backup__toggle"]);
    // 版面不使用 transition（除 none 之外）
    for (const b of blocks) {
      const t = v(b.body, "transition");
      if (t !== undefined) assert.equal(t, "none", b.sel);
    }
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
