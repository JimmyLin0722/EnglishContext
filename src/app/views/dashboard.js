/*
 * views/dashboard.js — 群島頁（原主控台）與備份匯出／匯入（FE-08；FE-31 今日學習進度；v0.12 FE-58；v0.19 FE-108 群島頁改版）
 * 依據：architecture.md §4.2、§7.5、v0.4 §7.7、§9；v0.8 §4.8「views/dashboard.js」、§7.19.10；
 *       v0.20 §4.16「views/dashboard.js」、§7.32.2～§7.32.6、§7.32.8、§7.32.10、§7.32.11、§7.32.13；
 *       v0.21 §7.32.15 效能修正 P-1～P-3（FE-116）；
 *       契約 GoalState、StreakState、Part5Progress、BackupFile、ImportResult、COLOR_LEVELS、TodayLearnedState、LearnedHistory、
 *       DASHBOARD_CHART_DAYS、RuntimeState.dashboard、LAYOUT_TEXTS 群島頁段、§19 ISLAND_TEXTS；
 *       README §5.4 LR-6 與 v0.12 段、§6.1、§6.2（IM-1～IM-5）、§10.8 IN-1（v0.12）、§10.9 NT-1、§11.4 DB-1～DB-6、
 *       §15.1 IS-1～IS-3、§15.4 IS-14～IS-16、§15.6 IA-1、IA-2、IA-5、IA-6、C-7
 * 涵蓋：US-17、US-24、US-30、US-39、US-63～US-67、US-70、US-71；AC-39-01～AC-39-10、AC-17-01、AC-17-06、AC-24-01、
 *       AC-24-03～AC-24-12、AC-30-01、AC-30-05、AC-30-07、AC-30-08、AC-30-10、AC-30-12、AC-31-03、AC-34-07、AC-34-08、
 *       AC-38-*、AC-63-01～AC-63-05、AC-64-01、AC-64-09、AC-64-10、AC-65-01～AC-65-04、AC-66-01～AC-66-04、
 *       AC-67-01、AC-67-02、AC-70-01、AC-70-02、AC-71-02、AC-71-03、AC-72-02
 *
 * 畫面（v0.19 FE-108，DOM 順序 = 畫面順序 = Tab 順序；DB-1、§7.32.2）：
 * - 標題列 div.db-head：h2「我的群島」（左側 islandArt.titleDeco，aria-hidden）＋ 目標標籤 p.db-goal
 *   （膠囊 span.db-goal__tag：色點 + layout.goalLineText；button.btn.db-change「變更」[data-go=customizer]；只依生效色級，DB-4）
 * - (1) 今日任務卡 section.card.db-today：h3.visually-hidden「今日任務」（SD-FB-107）→ 龜龜 + 「島主 龜龜」+ 對話框（IS-14）
 *   → 今日進度列「今日已學 X / D 字」+ 橫向 progressbar（IS-15）+「今日目標達成」→ button「開始今日學習」[data-go=flashcards]
 * - (2) 地圖 div.card.db-map：內含 islandMap.build 的 div[role=img]；islandMap.signature 相同就沿用同一節點，
 *   show() 只以 setPlay 同步動畫 class（重播靠頁面 hidden 切換，§7.32.8「重播」；FE-116 P-1）
 * - (3) 島嶼清單 section.db-isles：h3「島嶼」+ 5 列（island.listRowOf × 3、fogRowOf × 2；IA-2）
 * - (4) 3 格數據 section.db-stats（aria-label「學習數據」）：連續打卡天數 + 天氣行 → 單字掌握率 + 「已掌握 N 字」
 *   → 模擬測驗已答對行 + 燈塔行（DB-5）；每格為區塊卡片樣式
 * - (5) 近 7 天圖表 section.card.db-chart；(6) 「資料備份」收合區塊 section.card.db-backup（DB-6，既有）
 * - 移除：主環形圖（含幾何與樣式）、未使用的頁面標題文字常數；本體不再有 data-go="sources"
 * - 單一來源（IS-3）：對話框、今日進度列、地圖、清單、3 格狀態行、地圖 aria-label 全部取自同一次 dashboardModel 的 island。
 * - 島嶼狀態每次繪製即時推算，不寫入任何儲存（IS-1、IS-2）；地圖與清單無事件、無 tabindex（AC-64-10）。
 * - 「開始今日學習」「變更」只以 [data-go] 交給 router（view 不呼叫 setTab 或任何寫入 action）；
 *   toggle 只呼叫 store.actions.setBackupExpanded（不寫 localStorage）；訂閱 "dashboard" tag 時只更新 aria-expanded、
 *   展開區 hidden 與安裝區，節點不重建（焦點留在 toggle）
 * 所有文字以 textContent／setAttribute 呈現（經 core/dom.js；IA-6）；版面文字於呼叫時取 EMT.core.layout（LD-2）。
 *
 * （v0.19，FE-84；architecture.md v0.14 §7.25.1、§7.25.2；契約 README §13.1 AS-1、AS-3、AS-4、AS-7、§11.4 DB-5、DS-51；
 *   AC-49-01、AC-49-02、AC-49-04、AC-49-08）第 3 格為標籤「模擬測驗」與已答對行（K、Q、P 由 part5flow.answeredSummary 計算，
 *   與模擬測驗頁同一份題庫與同一個函式）；Q = 0 顯示 statNoData。totalAnswered、totalCorrect 照常保存但不再顯示。
 *
 * - （FE-116，§7.32.15）清單 5 列內容鍵相同不重建（P-2）；頁面隱藏期間的 PROGRESS_TAGS 通知不同步繪製，
 *   改以閒置排程預先重算、重建（P-3；idleScheduler）；show() 一律以當下狀態重算（AC-64-09）。
 *
 * 寫法：純邏輯（dashboardModel、goalInfoOf、importMessage、progressModel、contentSnapshot、idleScheduler）以 module.exports
 * 匯出供 Node 測試；瀏覽器下登錄 EMT.views "dashboard"，載入時不操作 DOM。
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.EMT = root.EMT || {};
    if (root.EMT.views && typeof root.EMT.views.register === "function") {
      root.EMT.views.register("dashboard", api.createView());
    }
  }
})(typeof self !== "undefined" ? self : this, function (root) {
  "use strict";

  // ── 取得 core 模組：Node 下 require，瀏覽器下讀 EMT.core.*（呼叫時才取用）──
  var coreCache = null;
  function core() {
    if (coreCache) return coreCache;
    if (typeof require === "function" && typeof module === "object") {
      coreCache = {
        C: require("../core/constants.js"),
        GOAL: require("../core/goal.js"),
        STREAK: require("../core/streak.js"),
        LEARN: require("../core/learning.js"),
        LAY: require("../core/layout.js"),
        PF: require("../core/part5flow.js"),
        ISL: require("../core/island.js")
      };
    } else {
      var c = root.EMT.core;
      coreCache = { C: c.constants, GOAL: c.goal, STREAK: c.streak, LEARN: c.learning, LAY: c.layout, PF: c.part5flow,
        ISL: c.island };
    }
    if (!coreCache.ISL) {
      coreCache = null;
      throw new Error("EMT.core.island 未載入（views/dashboard.js）");
    }
    return coreCache;
  }

  /** （v0.19，FE-108）取得 ui 模組 islandMap／islandArt（瀏覽器下呼叫時取用，LD-2）；不存在時視為組裝錯誤（LD-3） */
  function uiModule(name) {
    var m = root && root.EMT && root.EMT.ui ? root.EMT.ui[name] : null;
    if (!m) throw new Error("EMT.ui." + name + " 未載入（views/dashboard.js）");
    return m;
  }

  /** （v0.11，FE-51）取得 core/pwa（呼叫時取用，LD-2）；不存在時視為組裝錯誤（LD-3） */
  function pwaCore() {
    var m = null;
    if (typeof require === "function" && typeof module === "object") {
      m = require("../core/pwa.js");
    } else {
      m = root.EMT && root.EMT.core && root.EMT.core.pwa;
    }
    if (!m) throw new Error("EMT.core.pwa 未載入（views/dashboard.js）");
    return m;
  }

  /** （v0.11，FE-51；v0.12 加 "dashboard"）會影響「安裝 App」按鈕顯示條件（IN-1）的 tags */
  var INSTALL_TAGS = ["pwa", "tab", "entry", "init", "dashboard"];

  /** tags 是否含會影響安裝按鈕的項目；tags 缺漏時視為需要重繪 */
  function installAffected(tags) {
    if (!Array.isArray(tags)) return true;
    for (var i = 0; i < tags.length; i++) {
      if (INSTALL_TAGS.indexOf(tags[i]) !== -1) return true;
    }
    return false;
  }

  // ── 畫面文字（AC 引號內文案逐字使用；v0.12 起群島頁版面文字取 EMT.core.layout.LAYOUT_TEXTS）──
  var TEXT = {
    // （v0.12，SD-FB-41）今日任務卡標題（v0.19 起只給螢幕閱讀器，SD-FB-107）、3 格數據區的 aria-label、近 7 天圖表標題
    todayTitle: "今日任務",
    statsLabel: "學習數據",
    chartTitle: "近 7 天已學字數",
    chartUnit: "字",
    backupHint: "備份檔只含你的學習資料，不含內建字庫與題庫；可在其他裝置的同一個檔案匯入還原。",
    exportBtn: "匯出備份",
    importBtn: "匯入備份",
    importDialogTitle: "匯入備份",
    importConfirm: "匯入將覆蓋目前所有進度",          // AC-24-04
    importOk: "匯入",
    importCancel: "取消",
    importFormat: "備份檔格式錯誤，未匯入",            // AC-24-05
    importVersion: "備份檔版本不相容",                  // AC-24-06
    importQuota: "儲存空間不足，未匯入",                // AC-24-09
    // 匯入步驟 8 非容量不足的寫入例外（契約 IM-6）；已定案（FB-24，JimmyLin 2026-10-30）
    importWriteFailed: "儲存失敗，未匯入",
    versionNone: "無",                                  // IM-3
    exportDone: "已匯出備份",
    exportFail: "此瀏覽器無法下載檔案，未匯出",
    goalDone: "今日目標達成",                           // AC-30-05
    empty: "—"
  };

  /** 會影響今日任務卡、地圖、島嶼清單、3 格數據、近 7 天圖表的 store tag（AC-30-07 (b)：show() 時另外重繪；v0.12 加 "dashboard"） */
  var PROGRESS_TAGS = ["init", "learning", "goal", "studySet", "customVocab", "part5", "flashcard", "stats", "streak",
    "storage", "dashboard"];

  // ── 純邏輯 ──

  /**
   * 已套用色級與生效色級（AC-17-06、AC-01-07）。
   * （v0.9，DB-4 v0.14）目標色級為藍、金時生效色級為「綠」（不再附加任何註記）；其餘兩者相同。
   * 每日新字量取生效色級的 dailyNewWords（藍、金顯示綠的 15）。
   * （v0.10）回傳不含 appliedScore（目標分數只存在資料中，畫面不顯示）。
   * @param {object|null} goal GoalState
   * @returns {{ appliedColor: string, appliedColorId: (string|null),
   *             effectiveColor: string, effectiveColorId: (string|null), daily: string }}
   */
  function goalInfoOf(goal) {
    var K = core();
    var g = goal && typeof goal === "object" ? goal : {};
    var score = typeof g.appliedScore === "number" && isFinite(g.appliedScore) ? g.appliedScore : null;
    // 色級以 appliedScore 推導（契約：appliedColor／effectiveColor 為冗餘欄位）；分數異常時退回欄位值
    var appliedId = score !== null ? K.GOAL.colorOf(score) : null;
    if (!appliedId && K.GOAL.levelOf(g.appliedColor)) appliedId = g.appliedColor;
    var effectiveId = appliedId ? K.GOAL.effectiveColorOf(appliedId) : null;
    if (!effectiveId && K.GOAL.levelOf(g.effectiveColor)) effectiveId = g.effectiveColor;

    var applied = K.GOAL.levelOf(appliedId);
    var effective = K.GOAL.levelOf(effectiveId);
    var effectiveText = effective ? effective.nameZh : TEXT.empty;

    // 每日新字量依「生效色級」顯示（人類決議 R6-2，2026-10-30）：藍、金生效為綠 → 15
    var daily = effective && typeof effective.dailyNewWords === "number" ? effective.dailyNewWords : null;
    return {
      appliedColor: applied ? applied.nameZh : TEXT.empty,
      appliedColorId: applied ? applied.id : null,
      effectiveColor: effectiveText,
      effectiveColorId: effective ? effective.id : null,
      daily: daily !== null ? daily + " 字/天" : TEXT.empty
    };
  }

  /** 非負整數；異常值 → 0 */
  function safeCount(v) {
    return typeof v === "number" && isFinite(v) && v > 0 ? Math.floor(v) : 0;
  }

  /**
   * 匯入結果 → 提示文字（AC-24-04～AC-24-09）。cancelled 不提示 → 回 null。
   * （ui/import-flow.js 的 messageOf 與本函式輸出逐字相同，first-run.test.js 比對；不得改動文字，SD-FB-14）
   * @param {object} result ImportResult
   * @returns {{ text: string, kind: "success"|"error" } | null}
   */
  function importMessage(result) {
    var K = core();
    var r = result && typeof result === "object" ? result : { ok: false, error: "format" };
    if (r.ok === true) {
      return { text: "已匯入，略過 " + safeCount(r.skipped) + " 筆", kind: "success" };
    }
    switch (r.error) {
      case "cancelled":
        return null;
      case "version": {
        // IM-3：有限數字以 String(值) 顯示，其餘顯示「無」
        var fv = r.fileVersion;
        var fileText = typeof fv === "number" && isFinite(fv) ? String(fv) : TEXT.versionNone;
        var supported = K.C.SUPPORTED_SCHEMA_VERSIONS.join("、");
        return {
          text: TEXT.importVersion + "（檔案版本：" + fileText + "；支援版本：" + supported + "）",
          kind: "error"
        };
      }
      case "quota":
        return { text: TEXT.importQuota, kind: "error" };
      case "write_failed":
        return { text: TEXT.importWriteFailed, kind: "error" };
      default:
        // format 與任何未預期結果（IM-5）
        return { text: TEXT.importFormat, kind: "error" };
    }
  }

  /** 0～1 的有限比例；異常值 → 0 */
  function clampRatio(v) {
    if (typeof v !== "number" || !isFinite(v) || v <= 0) return 0;
    return v >= 1 ? 1 : v;
  }

  /** 百分比文字：null → 「—」（AC-30-10、AC-17-04：不得出現 NaN、Infinity） */
  function percentText(p) {
    return typeof p === "number" && isFinite(p) ? p + "%" : TEXT.empty;
  }

  /** 0～1 比例 → 百分比數值（小數 1 位，供 style.width；異常值 → 0） */
  function ratioPct(ratio) {
    return Math.round(clampRatio(ratio) * 1000) / 10;
  }

  /**
   * （v0.19，FE-108）島嶼推算用的內容快照 { builtin, builtinMap, nB, nG }（§4.16）。
   * content 省略（undefined／null）時取 EMT.content；都沒有或欄位缺漏 → 空字庫（三島 n = 0、P 為 null），不拋例外（C-6）。
   * 只讀不寫；回傳值不保存（IS-1）。
   * @param {*} [content]
   * @returns {{ builtin: Array, builtinMap: (Map|null), nB: number, nG: number }}
   */
  function contentSnapshot(content) {
    var out = { builtin: [], builtinMap: null, nB: 0, nG: 0 };
    var c = content;
    try {
      if (c === undefined || c === null) c = root && root.EMT ? root.EMT.content : null;
      if (!c || typeof c !== "object") return out;
      if (Array.isArray(c.builtin)) out.builtin = c.builtin;
      if (c.builtinMap && typeof c.builtinMap.get === "function") out.builtinMap = c.builtinMap;
      if (typeof c.nB === "number" && isFinite(c.nB)) out.nB = c.nB;
      if (typeof c.nG === "number" && isFinite(c.nG)) out.nG = c.nG;
    } catch (e) {
      // getter 例外：視為內容缺漏
      return { builtin: [], builtinMap: null, nB: 0, nG: 0 };
    }
    return out;
  }

  /** （v0.19，FE-84）模擬測驗題庫：與 views/part5.js 相同的取得方式（AS-1）；取不到 → 空題庫 */
  function part5Bank() {
    var c = root && root.EMT && root.EMT.content;
    return c && Array.isArray(c.part5) ? c.part5 : [];
  }

  /**
   * 今日進度、掌握率、已答對行與近 7 天長條的計算值（FE-31；契約 README §5.4 LR-6）。dashboardModel 由此組出畫面文字。
   * - 今日進度：X = learning.todayCount、D = learning.dailyGoal(生效色級)；X 可超過 D；X ≥ D → done、進度條填滿。
   * - 掌握率 = learning.masteryRate(runtime.studySet, data.masteredWordKeys)；
   *   已答對行 = part5flow.answeredSummary(題庫 id, part5CorrectIds)（AS-1～AS-4）；Q = 0 → statNoData「—」。
   * - 長條：learning.chartSeries(learnedHistory, X, today)，由舊到新 7 筆；高度 = 字數 ÷ 最大字數（全 0 → 0）。
   * 不修改傳入值；state 缺漏時以預設值計算，不拋錯。
   * @param {{data: object, runtime: object}|null} state store.getState() 的結果
   * @param {string} today 本地日期 YYYY-MM-DD（store.today()）
   * @param {*} [bank] 模擬測驗題庫；省略時取 EMT.content.part5
   * @returns {{
   *   today: { x: number, d: number, done: boolean, ratio: number, valueNow: number, fillPct: number, text: string, doneText: string },
   *   mastery: { label: string, numer: number, denom: number, percent: (number|null), ratio: number, text: string },
   *   answered: { label: string, summary: ({k: number, q: number, p: number}|null), text: string },
   *   bars: { date: string, label: string, count: number, heightPct: number, isToday: boolean }[],
   *   maxCount: number
   * }}
   */
  function progressModel(state, today, bank) {
    var K = core();
    var L = K.LEARN;
    var LT = K.LAY.LAYOUT_TEXTS;
    var st = state && typeof state === "object" ? state : {};
    var d = st.data && typeof st.data === "object" ? st.data : {};
    var rt = st.runtime && typeof st.runtime === "object" ? st.runtime : {};

    // 今日進度列（AC-30-01、AC-30-02、AC-30-05、AC-30-07；v0.19 IS-15 橫向進度條）
    var x = L.todayCount(d.todayLearned || null, today);
    // 生效色級與「每日新字量」同一推導（goalInfoOf；R-14：依生效色級）
    var effectiveId = goalInfoOf(d.goal || null).effectiveColorId;
    var goal = L.dailyGoal(effectiveId);
    var done = x >= goal;
    var ratio = done ? 1 : clampRatio(x / goal);
    var todayModel = {
      x: x,
      d: goal,
      done: done,
      ratio: ratio,
      // progressbar 的 aria-valuenow = min(X, D)；填滿寬度（%）= r × 100（IS-15）
      valueNow: Math.min(x, goal),
      fillPct: ratioPct(ratio),
      // 「今日已學 X / D 字」（LAYOUT_TEXTS.todayRing；AC-39-02）；畫面只出現 1 次，進度條以 aria-valuetext 重述（AC-39-06）
      text: K.LAY.fill(LT.todayRing, { x: K.LAY.formatInt(x), d: K.LAY.formatInt(goal) }),
      doneText: done ? TEXT.goalDone : ""
    };

    // 掌握率、已答對行（AC-30-10、AC-39-05、AS-4）
    var mr = L.masteryRate(Array.isArray(rt.studySet) ? rt.studySet : [],
      Array.isArray(d.masteredWordKeys) ? d.masteredWordKeys : []);
    var bankIds = K.PF.bankIdsOf(bank === undefined ? part5Bank() : bank);
    var answered = K.PF.answeredSummary(bankIds, d.part5CorrectIds);

    // 近 7 天長條圖（AC-30-08）；最右（today）一律用 X
    var series = L.chartSeries(d.learnedHistory || null, x, today);
    var max = 0;
    for (var i = 0; i < series.length; i++) {
      if (series[i].count > max) max = series[i].count;
    }
    var bars = series.map(function (b, idx) {
      return {
        date: b.date,
        label: b.label,
        count: b.count,
        // 與字數成比例；全為 0 時高度 0（不出現 NaN）
        heightPct: max > 0 ? Math.round((b.count / max) * 1000) / 10 : 0,
        isToday: idx === series.length - 1
      };
    });

    return {
      today: todayModel,
      mastery: {
        label: LT.statMasteryLabel,
        numer: mr.numer,
        denom: mr.denom,
        percent: mr.percent,
        ratio: mr.percent === null ? 0 : clampRatio(mr.percent / 100),
        text: percentText(mr.percent)
      },
      answered: {
        label: LT.statPart5Label,
        summary: answered,
        text: K.PF.answeredSummaryText(answered) || LT.statNoData
      },
      bars: bars,
      maxCount: max
    };
  }

  /**
   * （v0.19，FE-108）島嶼清單 5 列（IA-2；順序 island.LIST_ORDER）：開放島 listRowOf、霧中島 fogRowOf。
   * 每列多帶 id（島嶼代碼）與 fillPct（進度條填滿 %；P 為 null 或霧中島 → 0）。
   * @param {object} ISL core/island.js
   * @param {object} st IslandState
   * @returns {object[]}
   */
  function islesOf(ISL, st) {
    var open = {};
    (st && Array.isArray(st.islands) ? st.islands : []).forEach(function (pr) {
      if (pr && typeof pr.island === "string") open[pr.island] = pr;
    });
    return ISL.LIST_ORDER.map(function (id) {
      var row = open[id] ? ISL.listRowOf(open[id]) : ISL.fogRowOf(id);
      return {
        id: id,
        name: row.name,
        sub: row.sub,
        right: row.right,
        stageText: row.stageText,
        valueNow: row.valueNow,
        label: row.label,
        fog: row.fog,
        fillPct: typeof row.valueNow === "number" ? row.valueNow : 0
      };
    });
  }

  /**
   * （v0.12，FE-58；v0.19 FE-108）群島頁全部顯示值（architecture.md §4.8、§4.16、§7.32.1；契約 DB-2～DB-6、IS-3）。
   * 文字全部經 EMT.core.layout 與 EMT.core.island。島嶼值每次呼叫即時推算，不寫入任何儲存（IS-1）。
   * @param {{data: object, runtime: object}|null} state store.getState() 的結果
   * @param {string} today 本地日期 YYYY-MM-DD
   * @param {*} [bank] 模擬測驗題庫；省略時取 EMT.content.part5
   * @param {*} [content] 內容快照 { builtin, builtinMap, nB, nG }；省略時取 EMT.content（都沒有 → 三島 n = 0、P null）
   * @returns {{
   *   today: { x: number, d: number, done: boolean, ratio: number, valueNow: number, fillPct: number, text: string, doneText: string },
   *   goal: { text: string, colorId: (string|null) },
   *   stats: { streakValue: string, streakUnit: string, masteryText: string, masteredText: string, answeredText: string,
   *            weatherText: string, lighthouseText: string },
   *   chart: { empty: boolean, bars: object[] },
   *   backupExpanded: boolean,
   *   island: object, dialog: string, isles: object[], mapAlt: string
   * }}
   */
  function dashboardModel(state, today, bank, content) {
    var K = core();
    var LAY = K.LAY;
    var LT = LAY.LAYOUT_TEXTS;
    var ISL = K.ISL;
    var st = state && typeof state === "object" ? state : {};
    var d = st.data && typeof st.data === "object" ? st.data : {};
    var rt = st.runtime && typeof st.runtime === "object" ? st.runtime : {};
    var p = progressModel(st, today, bank);

    // 目標行（DB-4 v0.14）：只以生效色級組字與上色（goalInfoOf 以 appliedScore 推導生效色級）
    var info = goalInfoOf(d.goal || null);

    // 3 格數據（DB-5）
    var streakDays = K.STREAK.displayDays(d.streak || null, today);
    var masteredN = Array.isArray(d.masteredWordKeys) ? d.masteredWordKeys.length : 0;

    // 島嶼（IS-3 單一來源）：S、K、Q、X、D 與 3 格、今日進度列同一組值；Q = 0 時 K = 0
    var ct = contentSnapshot(content);
    var sum = p.answered.summary;
    var island = ISL.state({
      builtin: ct.builtin,
      builtinMap: ct.builtinMap,
      nB: ct.nB,
      nG: ct.nG,
      masteredWordKeys: d.masteredWordKeys,
      effectiveColor: info.effectiveColorId,
      streakDays: streakDays,
      k: sum ? sum.k : 0,
      q: sum ? sum.q : 0,
      x: p.today.x,
      d: p.today.d
    });

    return {
      today: p.today,
      goal: { text: LAY.goalLineText(K.GOAL.levelOf(info.effectiveColorId)), colorId: info.effectiveColorId },
      stats: {
        streakValue: LAY.formatInt(streakDays),
        streakUnit: LT.statStreakUnit,
        masteryText: p.mastery.text,
        masteredText: LAY.fill(LT.statMasteredCount, { n: LAY.formatInt(masteredN) }),
        answeredText: p.answered.text,
        // 第 1 格天氣行（IS-11）、第 3 格燈塔行（IS-12）
        weatherText: ISL.weatherText(island.weather),
        lighthouseText: ISL.lighthouseText(island.lighthouse)
      },
      chart: {
        empty: LAY.chartIsEmpty(p.bars.map(function (b) { return b.count; })),
        bars: p.bars
      },
      backupExpanded: !!(rt.dashboard && rt.dashboard.backupExpanded === true),
      island: island,
      dialog: ISL.dialogText(island),
      isles: islesOf(ISL, island),
      mapAlt: ISL.mapAltText(island)
    };
  }

  /** tags 是否含會影響今日任務卡、數據與圖表的項目；tags 缺漏時視為需要重繪 */
  function progressAffected(tags) {
    if (!Array.isArray(tags)) return true;
    for (var i = 0; i < tags.length; i++) {
      if (PROGRESS_TAGS.indexOf(tags[i]) !== -1) return true;
    }
    return false;
  }

  /** （FE-116，§7.32.15）閒置排程：requestIdleCallback 的 timeout 與 setTimeout 後備的延遲（毫秒） */
  var IDLE_TIMEOUT_MS = 500;
  var IDLE_FALLBACK_MS = 100;

  /**
   * （FE-116，§7.32.15 P-3）依 host 上可用的 API 建立閒置排程器：
   * - 有 requestIdleCallback → request(fn) = requestIdleCallback(fn, { timeout: 500 })，cancel 用 cancelIdleCallback
   * - 否則有 setTimeout → request(fn) = setTimeout(fn, 100)，cancel 用 clearTimeout
   * - 兩者皆無 → request 回 null、不執行 fn
   * cancel(null／undefined) 不做事。API 以 host 為 this 呼叫；不產生、不控制任何動畫格。
   * @param {*} host 通常為 window／self
   * @returns {{ request: function(Function): *, cancel: function(*): void }}
   */
  function idleScheduler(host) {
    var h = host && (typeof host === "object" || typeof host === "function") ? host : null;
    if (h && typeof h.requestIdleCallback === "function") {
      return {
        request: function (fn) { return h.requestIdleCallback(fn, { timeout: IDLE_TIMEOUT_MS }); },
        cancel: function (handle) {
          if (handle === null || handle === undefined) return;
          if (typeof h.cancelIdleCallback === "function") h.cancelIdleCallback(handle);
        }
      };
    }
    if (h && typeof h.setTimeout === "function") {
      return {
        request: function (fn) { return h.setTimeout(fn, IDLE_FALLBACK_MS); },
        cancel: function (handle) {
          if (handle === null || handle === undefined) return;
          if (typeof h.clearTimeout === "function") h.clearTimeout(handle);
        }
      };
    }
    return {
      request: function () { return null; },
      cancel: function () {}
    };
  }

  // ── 畫面 ──

  /**
   * 建立群島頁頁面模組（瀏覽器用）。
   * @param {{ idle?: { request: function(Function): *, cancel: function(*): void } }} [opts]
   *   idle：（FE-116）閒置排程器替身（單元測試注入）；省略時用 idleScheduler(root)
   * @returns {{ mount: function(Element): void, show: function(): void, hide: function(): void }}
   */
  function createView(opts) {
    var EMT = root.EMT;
    var refs = null;     // 需要更新的節點
    var busy = false;    // 匯入或匯出進行中
    var unsubscribe = null;
    var visible = false; // 群島頁是否正在顯示（show 後為 true、hide 後為 false）
    // （FE-116，§7.32.15）以下狀態只在本模組，不進 store、不持久化
    var mapFig = null;   // 目前的地圖節點（islandMap.build 回傳的 div.db-map__figure）
    var mapSig = null;   // 目前地圖節點的簽章（islandMap.signature）
    var mapAlt = null;   // 目前地圖節點的 aria-label
    var islesKey = null; // 目前清單 5 列的內容鍵（JSON.stringify(m.isles)）
    var dirty = false;   // 隱藏期間收到 PROGRESS_TAGS 後為 true；prepare 或 show 繪製完成後為 false
    var idle = null;     // 待執行的閒置排程 { api, handle, done }；無則 null
    var idleApiCache = opts && opts.idle && typeof opts.idle.request === "function" ? opts.idle : null;

    /** 閒置排程器（opts.idle 優先；否則依 root 建立，呼叫時才取用） */
    function idleApi() {
      if (!idleApiCache) idleApiCache = idleScheduler(root);
      return idleApiCache;
    }

    function dom() { return EMT.core.dom; }

    function store() { return EMT.store || null; }

    function toast(text, kind) {
      if (EMT.ui && EMT.ui.toast && typeof EMT.ui.toast.show === "function") {
        EMT.ui.toast.show(text, { kind: kind || "info", ms: kind === "error" ? 5000 : 3000 });
      }
    }

    function todayStr() {
      return core().STREAK.localDate(new Date());
    }

    /** 目前日期：優先用 store.today()（LR-6：每次繪製以當下 today 計算） */
    function progressToday() {
      var s = store();
      if (s && typeof s.today === "function") {
        try {
          return s.today();
        } catch (e) {
          // 改用本機日期
        }
      }
      return todayStr();
    }

    function currentState() {
      var s = store();
      if (!s || typeof s.getState !== "function") return null;
      try {
        return s.getState() || null;
      } catch (e) {
        return null;
      }
    }

    /**
     * （v0.19，FE-108）減少動態是否成立（EMT.ui.motion.reduced；模組不存在時視為成立，不播放地圖動畫）。
     * @returns {boolean}
     */
    function motionReduced() {
      var mo = EMT.ui && EMT.ui.motion;
      if (!mo || typeof mo.reduced !== "function") return true;
      try {
        return mo.reduced() === true;
      } catch (e) {
        return true;
      }
    }

    /** 連續打卡格的強調橘圖示（裝飾；fill 由 CSS .db-stat__icon 給 --accent，VC-3） */
    function streakIcon() {
      var D = dom();
      return D.svg("svg", { "class": "db-stat__icon", viewBox: "0 0 24 24", "aria-hidden": "true", focusable: "false" }, [
        D.svg("path", { d: "M12 2c1 3.5-1.5 5-3 7.5S7.5 15 9 17.5c-1.5-.5-3-2-3-4.5C4 15 4 17 5 19c1.5 2.5 4 3 7 3s6-1.5 7-4.5c1-3.5-.5-6.5-3-9 .5 2.5-.5 4-1.5 4.5C15 8.5 14 5 12 2z" })
      ]);
    }

    /** 「資料備份」展開指示（裝飾；展開時以 CSS 旋轉 180 度，無 transition） */
    function chevronIcon() {
      var D = dom();
      return D.svg("svg", { "class": "db-backup__chev", viewBox: "0 0 24 24", "aria-hidden": "true", focusable: "false" }, [
        D.svg("path", { d: "M6 9l6 6 6-6", fill: "none", stroke: "currentColor", "stroke-width": "2" })
      ]);
    }

    /**
     * 島嶼清單一列（IA-2、§7.32.5）：色點、島名＋副標、靠右文字、進度條、階段文字。
     * 開放島進度條為 progressbar（P 為 null 時省略 aria-valuenow、填滿 0）；霧中島進度條 aria-hidden、無子元素、無 aria-label。
     * 無事件、無 tabindex（AC-64-10）；文字以 textContent、屬性以 setAttribute 寫入（IA-6）。
     * @param {object} row dashboardModel().isles 的一列
     * @returns {HTMLLIElement}
     */
    function isleRow(row) {
      var D = dom();
      var bar;
      if (row.fog) {
        bar = D.el("div", { className: "db-isle__bar", attrs: { "aria-hidden": "true" } });
      } else {
        var attrs = { role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100" };
        if (typeof row.valueNow === "number") attrs["aria-valuenow"] = String(row.valueNow);
        if (row.label !== null && row.label !== undefined) attrs["aria-label"] = row.label;
        var fill = D.el("span", { className: "db-isle__fill" });
        fill.style.width = row.fillPct + "%";
        bar = D.el("div", { className: "db-isle__bar", attrs: attrs }, [fill]);
      }
      return D.el("li", { className: "db-isle db-isle--" + row.id + (row.fog ? " is-fog" : " is-open") }, [
        D.el("span", { className: "db-isle__dot", attrs: { "aria-hidden": "true" } }),
        D.el("p", { className: "db-isle__title" }, [
          D.el("span", { className: "db-isle__name", text: row.name }),
          D.el("span", { className: "db-isle__sub", text: row.sub })
        ]),
        D.el("p", { className: "db-isle__right", text: row.right }),
        bar,
        D.el("p", { className: "db-isle__stage", text: row.stageText })
      ]);
    }

    /**
     * 依 dashboardModel 更新群島頁（IS-3：全部取自同一次推算；§7.32.15 流程）。
     * - 今日任務卡、目標標籤、3 格數據、近 7 天：只改屬性與 textContent，不重建節點
     * - 島嶼清單：內容鍵與目前相同就不重建（P-2）；不同才重建 5 列（無可聚焦元素，不影響焦點）
     * - 地圖：無節點、簽章不同、或 show 時 replay → 以 build 換上，play = (show 或 prepare) 且非減少動態，
     *   mount 與 live 一律不播放（AC-70-01、AC-70-02）；否則沿用同一節點（P-1）：show 時 setPlay 同步動畫 class，
     *   文字替代不同才改 aria-label
     * @param {"mount"|"show"|"live"|"prepare"} mode
     * @param {boolean} [replay] mode 為 show 時：true 表示 show() 未經 hide()，一律重建並播放（§7.32.8 保底）
     */
    function renderProgress(mode, replay) {
      if (!refs) return;
      var D = dom();
      var m = dashboardModel(currentState(), progressToday());

      // 今日任務卡（IS-14、IS-15；AC-30-05：達成 → 填滿金色 + 「今日目標達成」）
      D.setText(refs.dialog, m.dialog);
      D.setText(refs.todayText, m.today.text);
      refs.todayBar.setAttribute("aria-valuemax", String(m.today.d));
      refs.todayBar.setAttribute("aria-valuenow", String(m.today.valueNow));
      refs.todayBar.setAttribute("aria-valuetext", m.today.text);
      refs.todayFill.style.width = m.today.fillPct + "%";
      refs.todayFill.classList.toggle("db-today__fill--done", m.today.done);
      D.setText(refs.doneText, m.today.doneText);
      refs.doneText.hidden = !m.today.done;

      // 目標標籤（DB-4 v0.14：文字與色點皆為生效色級）
      D.setText(refs.goalText, m.goal.text);
      refs.goalLine.setAttribute("data-color", m.goal.colorId || "");

      // 地圖（§7.32.4、§7.32.8、§7.32.15 P-1）
      var IM = uiModule("islandMap");
      var sig = IM.signature(m.island);
      if (!mapFig || sig !== mapSig || (mode === "show" && replay === true)) {
        var play = (mode === "show" || mode === "prepare") && !motionReduced();
        var fig = IM.build(m.island, { play: play });
        D.clear(refs.mapBox);
        refs.mapBox.appendChild(fig);
        mapFig = fig;
        mapSig = sig;
        mapAlt = m.mapAlt;
      } else {
        if (mode === "show") IM.setPlay(mapFig, !motionReduced());
        if (m.mapAlt !== mapAlt) {
          mapFig.setAttribute("aria-label", m.mapAlt);
          mapAlt = m.mapAlt;
        }
      }

      // 島嶼清單（IA-2；P-2：內容相同不重建）
      var key = JSON.stringify(m.isles);
      if (key !== islesKey) {
        D.clear(refs.islesList);
        for (var r = 0; r < m.isles.length; r++) refs.islesList.appendChild(isleRow(m.isles[r]));
        islesKey = key;
      }

      // 3 格數據（DB-5）＋ 天氣、燈塔狀態行（IS-11、IS-12）
      D.setText(refs.streakValue, m.stats.streakValue);
      D.setText(refs.weatherLine, m.stats.weatherText);
      D.setText(refs.masteryValue, m.stats.masteryText);
      D.setText(refs.masteredSub, m.stats.masteredText);
      D.setText(refs.answeredValue, m.stats.answeredText);
      D.setText(refs.lighthouseLine, m.stats.lighthouseText);

      // 近 7 天（AC-39-07）：空狀態只顯示一行文字；否則 7 根長條，節點固定，只改高度與文字
      refs.bars.hidden = m.chart.empty;
      refs.chartEmpty.hidden = !m.chart.empty;
      for (var i = 0; i < refs.barCells.length; i++) {
        var b = m.chart.bars[i];
        var cell = refs.barCells[i];
        if (!b) {
          cell.item.hidden = true;
          continue;
        }
        cell.item.hidden = false;
        D.setText(cell.count, core().LAY.formatInt(b.count));
        D.setText(cell.label, b.label);
        cell.fill.style.height = b.heightPct + "%";
        cell.item.classList.toggle("db-bars__item--today", b.isToday);
        cell.item.setAttribute("data-date", b.date);
        cell.item.setAttribute("aria-label", b.label + " " + b.count + " " + TEXT.chartUnit);
      }

      renderBackup(m.backupExpanded);
    }

    /** 「資料備份」收合狀態（DB-6）：只改 aria-expanded、展開區 hidden 與 class，不重建節點（焦點留在 toggle） */
    function renderBackup(expanded) {
      if (!refs) return;
      var on = expanded === true;
      refs.toggle.setAttribute("aria-expanded", on ? "true" : "false");
      refs.backupBody.hidden = !on;
      refs.backupSection.classList.toggle("is-expanded", on);
    }

    function setBusy(v) {
      busy = !!v;
      if (!refs) return;
      refs.exportBtn.disabled = busy;
      refs.importBtn.disabled = busy;
    }

    /** 「資料備份」標題列：切換展開（store 只改記憶體，不寫 localStorage；V-LAY-07） */
    function onToggleBackup() {
      var s = store();
      if (!s || !s.actions || typeof s.actions.setBackupExpanded !== "function") return;
      s.actions.setBackupExpanded(!backupExpandedNow());
    }

    /** 匯出（AC-24-01） */
    function onExport() {
      if (busy) return;
      var s = store();
      var dl = EMT.services && EMT.services.download;
      var file = null;
      try {
        file = s && s.actions ? s.actions.exportBackup() : null;
      } catch (e) {
        file = null;
      }
      if (!file || !dl || !dl.saveText(file.filename, file.json, "application/json")) {
        toast(TEXT.exportFail, "error");
        return;
      }
      toast(TEXT.exportDone, "success");
    }

    /** 確認對話框（AC-24-04）；對話框不可用時視為取消 */
    function confirmImport() {
      var dlg = EMT.ui && EMT.ui.dialog;
      if (!dlg || typeof dlg.confirm !== "function") return false;
      return dlg.confirm({
        title: TEXT.importDialogTitle,
        message: TEXT.importConfirm,
        okText: TEXT.importOk,
        cancelText: TEXT.importCancel
      });
    }

    /** 依匯入結果提示並更新畫面（不改變「資料備份」展開狀態，E-91） */
    function finishImport(result) {
      var msg = importMessage(result);
      if (msg) toast(msg.text, msg.kind);
      if (result && result.ok === true) {
        onProgressChange();
      }
      setBusy(false);
    }

    /** 讀入檔案文字後呼叫 store 匯入（契約 §6.2；IM-5：任何例外皆為 format） */
    function importText(text) {
      var s = store();
      var p;
      try {
        if (!s || !s.actions || typeof s.actions.importBackup !== "function") throw new Error("store 不可用");
        p = Promise.resolve(s.actions.importBackup(text, confirmImport));
      } catch (e) {
        p = Promise.resolve({ ok: false, error: "format" });
      }
      p.then(finishImport, function () {
        finishImport({ ok: false, error: "format" });
      });
    }

    /** 選檔後讀取（AC-24-03、AC-24-05） */
    function onFileChosen() {
      var input = refs.fileInput;
      var file = input.files && input.files[0];
      if (!file) return;
      setBusy(true);
      // 讀完後清空選取，讓同一檔案可再次選擇
      try {
        var reader = new FileReader();
        reader.addEventListener("load", function () {
          input.value = "";
          importText(typeof reader.result === "string" ? reader.result : "");
        });
        reader.addEventListener("error", function () {
          input.value = "";
          finishImport({ ok: false, error: "format" });
        });
        reader.readAsText(file);
      } catch (e) {
        input.value = "";
        finishImport({ ok: false, error: "format" });
      }
    }

    /** （v0.11，FE-51）「安裝 App」：交給 services/pwa（IN-5）；Promise 錯誤靜默、不顯示任何訊息 */
    function onInstallClick() {
      var svc = EMT.services && EMT.services.pwa;
      if (!svc || typeof svc.requestInstall !== "function") return;
      try {
        var p = svc.requestInstall();
        if (p && typeof p.then === "function") p.then(null, function () {});
      } catch (e) {
        // 靜默（PE-3）
      }
    }

    /** （v0.11，FE-51；v0.12 IN-1 含 backupExpanded）重繪安裝區：成立時恰 1 個按鈕；不成立時 hidden 且無子節點 */
    function renderInstall() {
      if (!refs || !refs.installBox) return;
      var box = refs.installBox;
      var visible = pwaCore().installVisible(currentState()) === true;
      if (!visible) {
        dom().clear(box);
        box.hidden = true;
        return;
      }
      if (!box.firstChild) {
        box.appendChild(dom().el("button", {
          className: "btn btn--secondary dash-install",
          attrs: { type: "button", "data-action": "install-app" },
          text: pwaCore().PWA_TEXTS.installButton,
          on: { click: onInstallClick }
        }));
      }
      box.hidden = false;
    }

    function onImportClick() {
      if (busy || !refs) return;
      refs.fileInput.click();
    }

    /** 標題列：h2「我的群島」（左側裝飾小圖 aria-hidden）＋ 目標標籤與「變更」（DB-1、DB-4、IS-16、AC-63-01、AC-66-04） */
    function buildHead() {
      var D = dom();
      var LT = core().LAY.LAYOUT_TEXTS;
      var goalText = D.el("span", { className: "db-goal__text", text: "" });
      // （v0.9，Q-61、AC-39-04）「變更」為外框按鈕（不是連結樣式）；行為沿用 router 的 [data-go] 委派
      var changeBtn = D.el("button", {
        className: "btn db-change",
        attrs: { type: "button", "data-go": "customizer" },
        text: LT.changeLink
      });
      var goalLine = D.el("p", { className: "db-goal", attrs: { "data-color": "" } }, [
        D.el("span", { className: "db-goal__tag" }, [
          D.el("span", { className: "db-goal__dot", attrs: { "aria-hidden": "true" } }),
          goalText
        ]),
        changeBtn
      ]);
      var head = D.el("div", { className: "db-head" }, [
        D.el("h2", { className: "page-title dash-title" }, [
          uiModule("islandArt").titleDeco("dash-title__deco"),
          D.el("span", { className: "dash-title__text", text: LT.dashboardTitle })
        ]),
        goalLine
      ]);
      return { head: head, goalLine: goalLine, goalText: goalText, changeBtn: changeBtn };
    }

    /** (1) 今日任務卡（DB-2、§7.32.3）：龜龜與對話框 → 今日進度列 → 「開始今日學習」 */
    function buildToday() {
      var D = dom();
      var LT = core().LAY.LAYOUT_TEXTS;
      var ISL = core().ISL;
      // 對話框不是 aria-live 區域（IS-14）
      var dialog = D.el("p", { className: "db-host__bubble", text: "" });
      var todayText = D.el("p", { className: "db-today__text", text: "" });
      var todayFill = D.el("span", { className: "db-today__fill" });
      var todayBar = D.el("div", {
        className: "db-today__bar",
        attrs: { role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "1", "aria-valuenow": "0", "aria-valuetext": "" }
      }, [todayFill]);
      var doneText = D.el("p", { className: "db-today__done", attrs: { "aria-live": "polite" }, text: "" });
      doneText.hidden = true;
      var startBtn = D.el("button", {
        className: "btn btn--accent db-start",
        attrs: { type: "button", "data-go": "flashcards" },
        text: LT.startToday
      });
      var section = D.el("section", { className: "card db-today", attrs: { "aria-labelledby": "db-today-h" } }, [
        // （SD-FB-107）可見標題會違反 AC-39-02 的由上到下順序，只給螢幕閱讀器標題導覽
        D.el("h3", { className: "visually-hidden", attrs: { id: "db-today-h" }, text: TEXT.todayTitle }),
        D.el("div", { className: "db-host" }, [
          uiModule("islandArt").turtle("db-host__turtle"),
          D.el("div", { className: "db-host__talk" }, [
            D.el("p", { className: "db-host__name", text: ISL.TEXTS.hostName }),
            dialog
          ])
        ]),
        D.el("div", { className: "db-today__progress" }, [
          D.el("div", { className: "db-today__row" }, [todayText, todayBar]),
          doneText
        ]),
        startBtn
      ]);
      return { section: section, dialog: dialog, todayText: todayText, todayBar: todayBar, todayFill: todayFill,
        doneText: doneText, startBtn: startBtn };
    }

    /** (2) 地圖框（§7.32.4）：內容由 renderProgress 以 islandMap.build 重建；無事件、無 tabindex（AC-64-10） */
    function buildMap() {
      return dom().el("div", { className: "card db-map" });
    }

    /** (3) 島嶼清單（IA-2、§7.32.5）：h3「島嶼」＋ ul（5 列由 renderProgress 建立） */
    function buildIsles() {
      var D = dom();
      var list = D.el("ul", { className: "db-isles__list" });
      var section = D.el("section", { className: "db-isles", attrs: { "aria-labelledby": "db-isles-h" } }, [
        D.el("h3", { className: "section-title", attrs: { id: "db-isles-h" }, text: core().ISL.TEXTS.listTitle }),
        list
      ]);
      return { section: section, list: list };
    }

    /** (4) 3 格數據（DB-5、§7.32.6）：每格為區塊卡片樣式；第 1 格天氣行、第 3 格燈塔行 */
    function buildStats() {
      var D = dom();
      var LT = core().LAY.LAYOUT_TEXTS;
      var streakValue = D.el("span", { className: "db-stat__num", text: TEXT.empty });
      var weatherLine = D.el("p", { className: "db-stat__status", text: "" });
      var masteryValue = D.el("p", { className: "db-stat__value", text: TEXT.empty });
      var masteredSub = D.el("p", { className: "db-stat__sub", text: "" });
      var answeredValue = D.el("p", { className: "db-stat__value db-stat__value--answered", text: TEXT.empty });
      var lighthouseLine = D.el("p", { className: "db-stat__status", text: "" });
      var section = D.el("section", { className: "db-stats", attrs: { "aria-label": TEXT.statsLabel } }, [
        D.el("div", { className: "db-stat db-stat--streak" }, [
          D.el("p", { className: "db-stat__label", text: LT.statStreakLabel }),
          D.el("p", { className: "db-stat__value" }, [
            streakIcon(),
            streakValue,
            D.el("span", { className: "db-stat__unit", text: LT.statStreakUnit })
          ]),
          weatherLine
        ]),
        D.el("div", { className: "db-stat db-stat--mastery" }, [
          D.el("p", { className: "db-stat__label", text: LT.statMasteryLabel }),
          masteryValue,
          masteredSub
        ]),
        D.el("div", { className: "db-stat db-stat--answered" }, [
          D.el("p", { className: "db-stat__label", text: LT.statPart5Label }),
          answeredValue,
          lighthouseLine
        ])
      ]);
      return { section: section, streakValue: streakValue, weatherLine: weatherLine, masteryValue: masteryValue,
        masteredSub: masteredSub, answeredValue: answeredValue, lighthouseLine: lighthouseLine };
    }

    /** (5) 近 7 天圖表：長條（節點固定 DASHBOARD_CHART_DAYS 組）與空狀態 */
    function buildChart() {
      var D = dom();
      var days = core().C.DASHBOARD_CHART_DAYS;
      var n = typeof days === "number" && days > 0 ? Math.floor(days) : 7;
      var cells = [];
      var items = [];
      for (var i = 0; i < n; i++) {
        var count = D.el("span", { className: "db-bars__count", attrs: { "aria-hidden": "true" }, text: "0" });
        var fill = D.el("span", { className: "db-bars__fill" });
        var label = D.el("span", { className: "db-bars__label", attrs: { "aria-hidden": "true" }, text: "" });
        var item = D.el("li", { className: "db-bars__item" }, [
          count,
          D.el("span", { className: "db-bars__track" }, fill),
          label
        ]);
        cells.push({ item: item, count: count, fill: fill, label: label });
        items.push(item);
      }
      var bars = D.el("ol", { className: "db-bars", attrs: { "aria-labelledby": "db-chart-h" } }, items);
      var empty = D.el("p", { className: "db-chart__empty", text: core().LAY.LAYOUT_TEXTS.chartEmpty });
      empty.hidden = true;
      var section = D.el("section", { className: "card db-chart", attrs: { "aria-labelledby": "db-chart-h" } }, [
        D.el("h3", { className: "section-title", attrs: { id: "db-chart-h" }, text: TEXT.chartTitle }),
        bars,
        empty
      ]);
      return { section: section, bars: bars, empty: empty, cells: cells };
    }

    function mount(rootEl) {
      if (!rootEl) return;
      var D = dom();
      var LT = core().LAY.LAYOUT_TEXTS;

      var fileInput = D.el("input", {
        className: "visually-hidden",
        attrs: { type: "file", accept: ".json,application/json", tabindex: "-1", "aria-hidden": "true" },
        on: { change: onFileChosen }
      });
      var exportBtn = D.el("button", {
        className: "btn btn--primary",
        attrs: { type: "button", "data-action": "export-backup" },
        text: TEXT.exportBtn,
        on: { click: onExport }
      });
      var importBtn = D.el("button", {
        className: "btn btn--secondary",
        attrs: { type: "button", "data-action": "import-backup" },
        text: TEXT.importBtn,
        on: { click: onImportClick }
      });

      // （v0.11，FE-51）安裝區（IN-1）；內容由 renderInstall 依狀態增刪
      var installBox = D.el("div", { className: "dash-backup__install", attrs: { hidden: true } });

      var head = buildHead();
      var today = buildToday();
      var mapBox = buildMap();
      var isles = buildIsles();
      var stats = buildStats();
      var chart = buildChart();

      // (6) 「資料備份」收合區塊（DB-6）：預設收合
      var toggle = D.el("button", {
        className: "db-backup__toggle",
        attrs: { type: "button", "aria-expanded": "false", "aria-controls": "db-backup-body" },
        on: { click: onToggleBackup }
      }, [D.el("span", { className: "db-backup__label", text: LT.backupSectionTitle }), chevronIcon()]);
      var backupBody = D.el("div", { className: "db-backup__body", attrs: { id: "db-backup-body" } }, [
        D.el("p", { className: "dash-backup__hint", text: TEXT.backupHint }),
        D.el("div", { className: "btn-row" }, [exportBtn, importBtn]),
        // （v0.11，FE-51）NT-1：按鈕列的下一個兄弟節點（AC-24-12）
        D.el("p", { className: "dash-backup__origin", text: pwaCore().PWA_TEXTS.backupOriginNotice }),
        installBox,
        fileInput
      ]);
      backupBody.hidden = true;
      var backupSection = D.el("section", { className: "card db-backup", attrs: { "aria-labelledby": "db-backup-h" } }, [
        D.el("h3", { className: "section-title db-backup__head", attrs: { id: "db-backup-h" } }, [toggle]),
        backupBody
      ]);

      // DB-1：標題列 → 今日任務卡 → 地圖 → 島嶼清單 → 3 格數據 → 近 7 天 → 資料備份
      var page = D.el("div", { className: "dashboard" }, [
        head.head,
        today.section,
        mapBox,
        isles.section,
        stats.section,
        chart.section,
        backupSection
      ]);

      refs = {
        dialog: today.dialog,
        todayText: today.todayText,
        todayBar: today.todayBar,
        todayFill: today.todayFill,
        doneText: today.doneText,
        startBtn: today.startBtn,
        goalLine: head.goalLine,
        goalText: head.goalText,
        mapBox: mapBox,
        islesList: isles.list,
        streakValue: stats.streakValue,
        weatherLine: stats.weatherLine,
        masteryValue: stats.masteryValue,
        masteredSub: stats.masteredSub,
        answeredValue: stats.answeredValue,
        lighthouseLine: stats.lighthouseLine,
        bars: chart.bars,
        chartEmpty: chart.empty,
        barCells: chart.cells,
        toggle: toggle,
        backupBody: backupBody,
        backupSection: backupSection,
        exportBtn: exportBtn,
        importBtn: importBtn,
        fileInput: fileInput,
        installBox: installBox
      };

      // 新的 DOM：地圖與清單尚未建立
      mapFig = null;
      mapSig = null;
      mapAlt = null;
      islesKey = null;

      // 先在未掛上文件前繪製初值（地圖不播放動畫；第一次 show() 簽章相同只 setPlay，啟動時少建 1 次地圖）
      renderProgress("mount");
      renderInstall();

      D.clear(rootEl);
      rootEl.appendChild(page);

      // 訂閱 store：相關 tag（PROGRESS_TAGS，含 "dashboard"）才處理；安裝區依 INSTALL_TAGS。
      // 停留期間：簽章不同才以 play: false 重建地圖（不重播，§7.32.8）；隱藏期間：只排閒置預先重建（§7.32.15 P-3）
      var s = store();
      if (s && typeof s.subscribe === "function" && !unsubscribe) {
        unsubscribe = s.subscribe(function (state, tags) {
          if (progressAffected(tags)) onProgressChange(tags);
          if (installAffected(tags)) renderInstall();
        });
      }
    }

    /** 目前狀態的「資料備份」展開值（runtime.dashboard.backupExpanded；缺漏 → false） */
    function backupExpandedNow() {
      var st = currentState();
      return !!(st && st.runtime && st.runtime.dashboard && st.runtime.dashboard.backupExpanded === true);
    }

    /**
     * （FE-116，§7.32.15）進度相關資料變更：頁面顯示中 → 立即以 live 重算；
     * 隱藏中 → 不重算、不動文字與地圖、清單，標記 dirty，並在無待執行排程時排 1 次閒置預先重建（連續通知只排 1 次）。
     * 隱藏中收到 "dashboard" tag 時仍同步「資料備份」收合狀態（只改 3 個屬性、不重算 dashboardModel；DB-6 節點不重建）。
     * @param {string[]} [tags] 通知的 tags；省略（匯入完成）視為一般變更
     */
    function onProgressChange(tags) {
      if (visible) {
        renderProgress("live");
        return;
      }
      if (!Array.isArray(tags) || tags.indexOf("dashboard") !== -1) renderBackup(backupExpandedNow());
      dirty = true;
      schedulePrepare();
    }

    /** 排 1 個閒置工作執行 prepare；排程器不可用（request 回 null）時不排程，show() 照樣重算與重建 */
    function schedulePrepare() {
      if (idle) return;
      var api = idleApi();
      var task = { api: api, handle: null, done: false };
      idle = task;
      var handle = null;
      try {
        handle = api.request(function () { prepare(task); });
      } catch (e) {
        handle = null;
      }
      if (task.done) return; // 排程器同步執行了回呼
      if (handle === null || handle === undefined) {
        if (idle === task) idle = null;
        return;
      }
      task.handle = handle;
    }

    /** 取消待執行的閒置工作 */
    function cancelPrepare() {
      var task = idle;
      idle = null;
      if (!task) return;
      task.done = true;
      try {
        task.api.cancel(task.handle);
      } catch (e) {
        // 取消失敗：task.done 已設，回呼即使執行也不做事
      }
    }

    /** 閒置工作：頁面仍隱藏且有未繪製的變更 → 預先重算並重建（play 依減少動態；display: none 下動畫不執行） */
    function prepare(task) {
      if (task.done) return;
      task.done = true;
      if (idle === task) idle = null;
      if (visible || !dirty) return;
      renderProgress("prepare");
      dirty = false;
    }

    function show() {
      // 回到群島頁時以當下狀態與 today 重算（目標可能已變更；跨日時打卡與今日已學數也要更新，AC-30-07 (b)、IS-3、AC-64-09）。
      // 地圖簽章相同 → 沿用並以 setPlay 同步動畫 class（頁面由 hidden 變為顯示，CSS 動畫自動從頭播放）；
      // 不同 → 以 play 依減少動態重建（AC-70-01、AC-70-02）。未經 hide() 再呼叫 → 一律重建並播放（§7.32.8 保底）
      var replay = visible === true;
      visible = true;
      cancelPrepare();
      renderProgress("show", replay);
      dirty = false;
      renderInstall();
    }

    function hide() {
      // 保留訂閱；隱藏期間的變更改由閒置排程預先重建（§7.32.15）
      visible = false;
    }

    return { mount: mount, show: show, hide: hide };
  }

  return {
    TEXT: TEXT,
    goalInfoOf: goalInfoOf,
    importMessage: importMessage,
    progressModel: progressModel,
    dashboardModel: dashboardModel,
    contentSnapshot: contentSnapshot,
    PROGRESS_TAGS: PROGRESS_TAGS,
    progressAffected: progressAffected,
    INSTALL_TAGS: INSTALL_TAGS,
    installAffected: installAffected,
    idleScheduler: idleScheduler,
    createView: createView
  };
});
