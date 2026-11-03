/*
 * views/dashboard.js — 學習主控台與備份匯出／匯入（FE-08；FE-31 今日學習進度；v0.12 FE-58 主控台改版）
 * 依據：architecture.md §4.2、§7.5、v0.4 §7.7、§7.11、§9；v0.8 §4.8「views/dashboard.js」、§7.19.4（DOM 樹與表格）、§7.19.10；
 *       契約 GoalState、StreakState、Part5Progress、BackupFile、ImportResult、COLOR_LEVELS、TodayLearnedState、LearnedHistory、
 *       DASHBOARD_CHART_DAYS、RuntimeState.dashboard、LAYOUT_TEXTS 主控台段；
 *       README §5.4 LR-6 與 v0.12 段、§6.1、§6.2（IM-1～IM-5）、§10.8 IN-1（v0.12）、§10.9 NT-1、§11.4 DB-1～DB-6、C-7
 * 涵蓋：US-17、US-24、US-30、US-39；AC-39-01～AC-39-10、AC-17-01、AC-17-06、AC-24-01、AC-24-03～AC-24-12、
 *       AC-30-01、AC-30-05、AC-30-07、AC-30-08、AC-30-10、AC-30-12、AC-31-03、AC-34-07、AC-34-08、AC-38-*
 *
 * 畫面（v0.12，DOM 順序 = 畫面順序 = Tab 順序；DB-1）：
 * - h2「學習主控台」
 * - (1) 今日任務卡 section.card.db-today：h3「今日任務」→ 列（主環形圖 88px：中央只顯示 X，SD-FB-40；
 *   右側「今日已學 X / D 字」、「今日目標達成」、button「開始今日學習」[data-go=flashcards]）→ 目標行
 *   （色點 + layout.goalLineText + button.btn.db-change「變更」[data-go=customizer]；v0.14 起只依生效色級，DB-4）
 * - （v0.9，FE-66；契約 v0.14 DB-4、AC-39-04、Q-61）目標行一律以生效色級組字（藍、金套用時為「綠級・每日 15 字」），
 *   不再顯示目標與生效兩個色級的對照註記與「・」分隔；色點亦依生效色級；「變更」改為外框按鈕（10-dashboard.css）。
 * - (2) 3 格數據 section.card.db-stats（aria-label「學習數據」）：連續打卡天數（強調橘圖示 + 數字 + 天）→
 *   單字掌握率（大字 % + 小字「已掌握 N 字」）→ 模擬測驗正確率；無資料「—」（DB-5）
 * - (3) 近 7 天圖表 section.card.db-chart：ol.db-bars（7 根）或空狀態「開始學習後會顯示紀錄」（layout.chartIsEmpty）
 * - (4) 「資料備份」收合區塊 section.card.db-backup：標題列 toggle（aria-expanded = runtime.dashboard.backupExpanded）→
 *   展開區：備份說明 → 「匯出備份」「匯入備份」→ NT-1 → 「安裝 App」（IN-1）→ 隱藏 file input（DB-6）
 * - 移除：功能入口（ENTRIES）、學習統計、目前目標、2 個小環形圖、「今日學習進度」標題；本體不再有 data-go="sources"
 * - 「開始今日學習」「變更」只以 [data-go] 交給 router（view 不呼叫 setTab 或任何寫入 action）；
 *   toggle 只呼叫 store.actions.setBackupExpanded（不寫 localStorage）；訂閱 "dashboard" tag 時只更新 aria-expanded、
 *   展開區 hidden 與安裝區，節點不重建（焦點留在 toggle）
 * 所有文字以 textContent 呈現（經 core/dom.js）；版面文字於呼叫時取 EMT.core.layout（LD-2）。
 *
 * 寫法：純邏輯（dashboardModel、goalInfoOf、importMessage、progressModel、ringGeometry）以 module.exports 匯出供 Node 測試；
 * 瀏覽器下登錄 EMT.views "dashboard"，載入時不操作 DOM。
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
        LAY: require("../core/layout.js")
      };
    } else {
      var c = root.EMT.core;
      coreCache = { C: c.constants, GOAL: c.goal, STREAK: c.streak, LEARN: c.learning, LAY: c.layout };
    }
    return coreCache;
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

  // ── 畫面文字（AC 引號內文案逐字使用；v0.12 主控台版面文字取 EMT.core.layout.LAYOUT_TEXTS）──
  var TEXT = {
    title: "學習主控台",
    accuracy: "模擬測驗正確率",
    // （v0.12，SD-FB-41）今日任務卡標題、3 格數據區的 aria-label、近 7 天圖表標題
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

  /**
   * 環形圖幾何（SVG viewBox 0 0 120 120；半徑 52、線寬 12；CSS 縮為 88px）。
   * 以周長作為 stroke-dasharray，stroke-dashoffset = 周長 × (1 − 比例) 表示填滿比例。
   */
  var RING = Object.freeze({ size: 120, r: 52, stroke: 12 });
  var RING_CIRC = 2 * Math.PI * RING.r;

  /** 會影響今日任務卡、3 格數據、近 7 天圖表的 store tag（AC-30-07 (b)：show() 時另外重繪；v0.12 加 "dashboard"） */
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

  /**
   * 環形圖的 stroke-dasharray／stroke-dashoffset（AC-30-05、AC-30-10）。
   * @param {number} ratio 0～1（超出夾住；異常值視為 0，即空環）
   * @returns {{ dasharray: string, dashoffset: string }}
   */
  function ringGeometry(ratio) {
    var r = clampRatio(ratio);
    // 取到小數 3 位，避免屬性值出現過長浮點數
    return {
      dasharray: RING_CIRC.toFixed(3),
      dashoffset: (RING_CIRC * (1 - r)).toFixed(3)
    };
  }

  /**
   * 今日進度、掌握率、正確率與近 7 天長條的計算值（FE-31；契約 README §5.4 LR-6）。dashboardModel 由此組出畫面文字。
   * - 主環：X = learning.todayCount、D = learning.dailyGoal(生效色級)；X 可超過 D；X ≥ D → done、滿圈。
   * - 掌握率 = learning.masteryRate(runtime.studySet, data.masteredWordKeys)；
   *   正確率 = learning.percentOf(part5.totalCorrect, part5.totalAnswered)；null → 「—」。
   * - 長條：learning.chartSeries(learnedHistory, X, today)，由舊到新 7 筆；高度 = 字數 ÷ 最大字數（全 0 → 0）。
   * 不修改傳入值；state 缺漏時以預設值計算，不拋錯。
   * @param {{data: object, runtime: object}|null} state store.getState() 的結果
   * @param {string} today 本地日期 YYYY-MM-DD（store.today()）
   * @returns {{
   *   today: { x: number, d: number, done: boolean, ratio: number, text: string, centerText: string, doneText: string },
   *   mastery: { label: string, numer: number, denom: number, percent: (number|null), ratio: number, text: string },
   *   accuracy: { label: string, percent: (number|null), ratio: number, text: string },
   *   bars: { date: string, label: string, count: number, heightPct: number, isToday: boolean }[],
   *   maxCount: number
   * }}
   */
  function progressModel(state, today) {
    var K = core();
    var L = K.LEARN;
    var LT = K.LAY.LAYOUT_TEXTS;
    var st = state && typeof state === "object" ? state : {};
    var d = st.data && typeof st.data === "object" ? st.data : {};
    var rt = st.runtime && typeof st.runtime === "object" ? st.runtime : {};

    // 主環形圖（AC-30-01、AC-30-02、AC-30-05、AC-30-07）
    var x = L.todayCount(d.todayLearned || null, today);
    // 生效色級與「每日新字量」同一推導（goalInfoOf；R-14：依生效色級）
    var effectiveId = goalInfoOf(d.goal || null).effectiveColorId;
    var goal = L.dailyGoal(effectiveId);
    var done = x >= goal;
    var todayModel = {
      x: x,
      d: goal,
      done: done,
      ratio: done ? 1 : clampRatio(x / goal),
      // 「今日已學 X / D 字」（LAYOUT_TEXTS.todayRing；AC-39-02）
      text: K.LAY.fill(LT.todayRing, { x: K.LAY.formatInt(x), d: K.LAY.formatInt(goal) }),
      // （v0.12，SD-FB-40）環形圖中央只顯示 X，「X / D」在畫面只出現 1 次（AC-39-06）
      centerText: K.LAY.formatInt(x),
      doneText: done ? TEXT.goalDone : ""
    };

    // 掌握率、正確率（AC-30-10、AC-39-05）
    var mr = L.masteryRate(Array.isArray(rt.studySet) ? rt.studySet : [],
      Array.isArray(d.masteredWordKeys) ? d.masteredWordKeys : []);
    var p5 = d.part5 && typeof d.part5 === "object" ? d.part5 : {};
    var acc = L.percentOf(p5.totalCorrect, p5.totalAnswered);

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
      accuracy: {
        label: LT.statAccuracyLabel,
        percent: acc,
        ratio: acc === null ? 0 : clampRatio(acc / 100),
        text: percentText(acc)
      },
      bars: bars,
      maxCount: max
    };
  }

  /**
   * （v0.12，FE-58）主控台全部顯示值（architecture.md §4.8；契約 DB-2～DB-6）。文字全部經 EMT.core.layout。
   * @param {{data: object, runtime: object}|null} state store.getState() 的結果
   * @param {string} today 本地日期 YYYY-MM-DD
   * @returns {{
   *   today: { x: number, d: number, done: boolean, ratio: number, text: string, centerText: string, doneText: string },
   *   goal: { text: string, colorId: (string|null) },
   *   stats: { streakValue: string, streakUnit: string, masteryText: string, masteredText: string, accuracyText: string },
   *   chart: { empty: boolean, bars: object[] },
   *   backupExpanded: boolean
   * }}
   */
  function dashboardModel(state, today) {
    var K = core();
    var LAY = K.LAY;
    var LT = LAY.LAYOUT_TEXTS;
    var st = state && typeof state === "object" ? state : {};
    var d = st.data && typeof st.data === "object" ? st.data : {};
    var rt = st.runtime && typeof st.runtime === "object" ? st.runtime : {};
    var p = progressModel(st, today);

    // 目標行（DB-4 v0.14）：只以生效色級組字與上色（goalInfoOf 以 appliedScore 推導生效色級）
    var info = goalInfoOf(d.goal || null);

    // 3 格數據（DB-5）
    var streakDays = K.STREAK.displayDays(d.streak || null, today);
    var masteredN = Array.isArray(d.masteredWordKeys) ? d.masteredWordKeys.length : 0;

    return {
      today: p.today,
      goal: { text: LAY.goalLineText(K.GOAL.levelOf(info.effectiveColorId)), colorId: info.effectiveColorId },
      stats: {
        streakValue: LAY.formatInt(streakDays),
        streakUnit: LT.statStreakUnit,
        masteryText: p.mastery.text,
        masteredText: LAY.fill(LT.statMasteredCount, { n: LAY.formatInt(masteredN) }),
        accuracyText: p.accuracy.text
      },
      chart: {
        empty: LAY.chartIsEmpty(p.bars.map(function (b) { return b.count; })),
        bars: p.bars
      },
      backupExpanded: !!(rt.dashboard && rt.dashboard.backupExpanded === true)
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

  // ── 畫面 ──

  /**
   * 建立主控台頁面模組（瀏覽器用）。
   * @returns {{ mount: function(Element): void, show: function(): void, hide: function(): void }}
   */
  function createView() {
    var EMT = root.EMT;
    var refs = null;     // 需要更新的節點
    var busy = false;    // 匯入或匯出進行中
    var unsubscribe = null;

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
     * 建立 SVG 主環形圖（底圈 + 進度圈）。進度圈初始為空環。
     * @returns {{ svg: SVGElement, bar: SVGElement }}
     */
    function ringSvg() {
      var D = dom();
      var c = String(RING.size / 2);
      var g = ringGeometry(0);
      /** 圓的共用屬性 + 額外屬性 */
      function circleAttrs(extra) {
        var out = { cx: c, cy: c, r: String(RING.r), fill: "none", "stroke-width": String(RING.stroke) };
        Object.keys(extra).forEach(function (k) { out[k] = extra[k]; });
        return out;
      }
      var track = D.svg("circle", circleAttrs({ "class": "db-ring__track" }));
      // 由 12 點鐘方向順時針填滿
      var bar = D.svg("circle", circleAttrs({
        "class": "db-ring__bar",
        "stroke-dasharray": g.dasharray,
        "stroke-dashoffset": g.dashoffset,
        transform: "rotate(-90 " + c + " " + c + ")"
      }));
      var node = D.svg("svg", {
        "class": "db-ring",
        viewBox: "0 0 " + RING.size + " " + RING.size,
        "aria-hidden": "true",
        focusable: "false"
      }, [track, bar]);
      return { svg: node, bar: bar };
    }

    /** 設定進度圈比例；值未改變時不動屬性（transition 只在數值改變時播放，§7.11） */
    function setRing(bar, ratio) {
      var g = ringGeometry(ratio);
      if (bar.getAttribute("stroke-dashoffset") !== g.dashoffset) {
        bar.setAttribute("stroke-dashoffset", g.dashoffset);
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

    /** 依 dashboardModel 更新今日任務卡、3 格數據、近 7 天圖表（只改屬性與 textContent，不重建節點） */
    function renderProgress() {
      if (!refs) return;
      var D = dom();
      var m = dashboardModel(currentState(), progressToday());

      // 今日任務卡（AC-30-05：達成 → 滿圈金色 + 「今日目標達成」）
      setRing(refs.ring.bar, m.today.ratio);
      refs.ring.svg.classList.toggle("db-ring--done", m.today.done);
      D.setText(refs.center, m.today.centerText);
      D.setText(refs.todayText, m.today.text);
      D.setText(refs.doneText, m.today.doneText);
      refs.doneText.hidden = !m.today.done;

      // 目標行（DB-4 v0.14：文字與色點皆為生效色級）
      D.setText(refs.goalText, m.goal.text);
      refs.goalLine.setAttribute("data-color", m.goal.colorId || "");

      // 3 格數據（DB-5）
      D.setText(refs.streakValue, m.stats.streakValue);
      D.setText(refs.masteryValue, m.stats.masteryText);
      D.setText(refs.masteredSub, m.stats.masteredText);
      D.setText(refs.accuracyValue, m.stats.accuracyText);

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
      var st = currentState();
      var cur = !!(st && st.runtime && st.runtime.dashboard && st.runtime.dashboard.backupExpanded === true);
      s.actions.setBackupExpanded(!cur);
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
        renderProgress();
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

    /** (1) 今日任務卡 */
    function buildToday() {
      var D = dom();
      var LT = core().LAY.LAYOUT_TEXTS;
      var ring = ringSvg();
      var center = D.el("span", { className: "db-ring__value", attrs: { "aria-hidden": "true" }, text: "" });
      var todayText = D.el("p", { className: "db-today__text", text: "" });
      var doneText = D.el("p", { className: "db-today__done", attrs: { "aria-live": "polite" }, text: "" });
      doneText.hidden = true;
      var startBtn = D.el("button", {
        className: "btn btn--accent db-start",
        attrs: { type: "button", "data-go": "flashcards" },
        text: LT.startToday
      });
      var goalText = D.el("span", { className: "db-goal__text", text: "" });
      // （v0.9，Q-61、AC-39-04）「變更」為外框按鈕（不再是連結樣式）；行為沿用 router 的 [data-go] 委派
      var changeBtn = D.el("button", {
        className: "btn db-change",
        attrs: { type: "button", "data-go": "customizer" },
        text: LT.changeLink
      });
      var goalLine = D.el("p", { className: "db-goal", attrs: { "data-color": "" } }, [
        D.el("span", { className: "db-goal__dot", attrs: { "aria-hidden": "true" } }),
        goalText,
        changeBtn
      ]);
      var section = D.el("section", { className: "card db-today", attrs: { "aria-labelledby": "db-today-h" } }, [
        D.el("h3", { className: "section-title", attrs: { id: "db-today-h" }, text: TEXT.todayTitle }),
        D.el("div", { className: "db-today__row" }, [
          D.el("div", { className: "db-ring-wrap" }, [ring.svg, center]),
          D.el("div", { className: "db-today__side" }, [todayText, doneText, startBtn])
        ]),
        goalLine
      ]);
      return { section: section, ring: ring, center: center, todayText: todayText, doneText: doneText,
        startBtn: startBtn, goalLine: goalLine, goalText: goalText, changeBtn: changeBtn };
    }

    /** (2) 3 格數據（同一張卡片內；格本身無邊框與背景） */
    function buildStats() {
      var D = dom();
      var LT = core().LAY.LAYOUT_TEXTS;
      var streakValue = D.el("span", { className: "db-stat__num", text: TEXT.empty });
      var masteryValue = D.el("p", { className: "db-stat__value", text: TEXT.empty });
      var masteredSub = D.el("p", { className: "db-stat__sub", text: "" });
      var accuracyValue = D.el("p", { className: "db-stat__value", text: TEXT.empty });
      var section = D.el("section", { className: "card db-stats", attrs: { "aria-label": TEXT.statsLabel } }, [
        D.el("div", { className: "db-stat db-stat--streak" }, [
          D.el("p", { className: "db-stat__label", text: LT.statStreakLabel }),
          D.el("p", { className: "db-stat__value" }, [
            streakIcon(),
            streakValue,
            D.el("span", { className: "db-stat__unit", text: LT.statStreakUnit })
          ])
        ]),
        D.el("div", { className: "db-stat db-stat--mastery" }, [
          D.el("p", { className: "db-stat__label", text: LT.statMasteryLabel }),
          masteryValue,
          masteredSub
        ]),
        D.el("div", { className: "db-stat db-stat--accuracy" }, [
          D.el("p", { className: "db-stat__label", text: LT.statAccuracyLabel }),
          accuracyValue
        ])
      ]);
      return { section: section, streakValue: streakValue, masteryValue: masteryValue,
        masteredSub: masteredSub, accuracyValue: accuracyValue };
    }

    /** (3) 近 7 天圖表：長條（節點固定 DASHBOARD_CHART_DAYS 組）與空狀態 */
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

      var today = buildToday();
      var stats = buildStats();
      var chart = buildChart();

      // (4) 「資料備份」收合區塊（DB-6）：預設收合
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

      var page = D.el("div", { className: "dashboard" }, [
        D.el("h2", { className: "page-title dash-title", text: LT.dashboardTitle }),
        today.section,
        stats.section,
        chart.section,
        backupSection
      ]);

      refs = {
        ring: today.ring,
        center: today.center,
        todayText: today.todayText,
        doneText: today.doneText,
        startBtn: today.startBtn,
        goalLine: today.goalLine,
        goalText: today.goalText,
        streakValue: stats.streakValue,
        masteryValue: stats.masteryValue,
        masteredSub: stats.masteredSub,
        accuracyValue: stats.accuracyValue,
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

      // 先在未掛上文件前繪製初值：進度圈不會從空環播放 transition（只在數值改變時播放，§7.11）
      renderProgress();
      renderInstall();

      D.clear(rootEl);
      rootEl.appendChild(page);

      // 訂閱 store：相關 tag（PROGRESS_TAGS，含 "dashboard"）才重繪；安裝區依 INSTALL_TAGS
      var s = store();
      if (s && typeof s.subscribe === "function" && !unsubscribe) {
        unsubscribe = s.subscribe(function (state, tags) {
          if (progressAffected(tags)) renderProgress();
          if (installAffected(tags)) renderInstall();
        });
      }
    }

    function show() {
      // 回到主控台時更新（目標可能已在難易度設定變更；跨日時打卡與今日已學數也要更新，AC-30-07 (b)）
      renderProgress();
      renderInstall();
    }

    function hide() {
      // 保留訂閱；不需處理
    }

    return { mount: mount, show: show, hide: hide };
  }

  return {
    TEXT: TEXT,
    goalInfoOf: goalInfoOf,
    importMessage: importMessage,
    progressModel: progressModel,
    dashboardModel: dashboardModel,
    ringGeometry: ringGeometry,
    PROGRESS_TAGS: PROGRESS_TAGS,
    progressAffected: progressAffected,
    INSTALL_TAGS: INSTALL_TAGS,
    installAffected: installAffected,
    createView: createView
  };
});
