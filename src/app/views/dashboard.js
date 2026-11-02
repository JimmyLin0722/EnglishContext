/*
 * views/dashboard.js — 學習主控台與備份匯出／匯入（FE-08；FE-31 今日學習進度）
 * 依據：architecture.md §4.2、§7.5、v0.4 §7.7、§7.11、§9；契約 GoalState、StreakState、VocabQuizStats、Part5Progress、
 *       BackupFile、ImportResult、COLOR_LEVELS、TodayLearnedState、LearnedHistory、DASHBOARD_CHART_DAYS；
 *       README §5.4 LR-6（含小環形圖段）、§6.1、§6.2（IM-1～IM-5）、C-7
 * 涵蓋：US-17、US-24、US-30、AC-17-01、AC-17-04、AC-17-06、AC-24-01、AC-24-03～AC-24-08、
 *       AC-30-01、AC-30-02、AC-30-05、AC-30-07、AC-30-08、AC-30-10、AC-31-03
 *
 * 畫面：
 * - （FE-31）今日學習進度區（位於統計區之前）：主環形圖「今日已學 X / D 字」、
 *   2 個小環形圖（目前單字集掌握率、模擬測驗正確率）、近 7 天長條圖。
 *   顯示值全部由純函式 progressModel(state, today) 計算，view 只依模型繪製；
 *   環形以內嵌 SVG（core/dom.js 的 svg()）繪製，長條以 div 繪製，文字一律 textContent。
 * - 統計區：連續打卡天數、單字掌握數、模擬測驗正確率（訂閱 store，只重繪本區）。
 * - 目標區：目前目標分數、目前目標色級、目前生效色級、每日新字量（顯示頁面與匯入成功時更新）。
 * - 入口：導覽模組（NAV_TAB_ORDER 去掉 dashboard）與「資料來源與授權」，以 data-go 交給 router 切換。
 *   （v0.5，FE-38）入口由 NAV_TAB_ORDER 推導，不含隱藏頁（AC-17-06、AC-20-04、契約 §5.8 HT-2）。
 * - 備份：匯出（store.actions.exportBackup → services/download）、匯入（FileReader → store.actions.importBackup）。
 * 所有文字以 textContent 呈現（經 core/dom.js）。
 *
 * 寫法：純邏輯（summaryOf、goalInfoOf、importMessage、progressModel、ringGeometry）以 module.exports 匯出供 Node 測試；
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
        STATS: require("../core/stats.js"),
        LEARN: require("../core/learning.js")
      };
    } else {
      var c = root.EMT.core;
      coreCache = { C: c.constants, GOAL: c.goal, STREAK: c.streak, STATS: c.stats, LEARN: c.learning };
    }
    return coreCache;
  }

  // ── 畫面文字（AC 引號內文案逐字使用）──
  var TEXT = {
    title: "學習主控台",
    statsTitle: "學習統計",
    streak: "連續打卡天數",
    mastered: "單字掌握數",
    accuracy: "模擬測驗正確率",
    goalTitle: "目前目標",
    appliedScore: "目前目標分數",
    appliedColor: "目前目標色級",
    effectiveColor: "目前生效色級",
    daily: "每日新字量",
    builtinCap: "（內建上限）",
    entriesTitle: "功能入口",
    backupTitle: "資料備份",
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
    // （FE-31）今日學習進度（AC-30-01、AC-30-05、AC-30-08、AC-30-10）
    progressTitle: "今日學習進度",
    todayPrefix: "今日已學 ",       // 「今日已學 X / D 字」
    todaySuffix: " 字",
    goalDone: "今日目標達成",
    masteryRate: "目前單字集掌握率",
    accuracyRate: "模擬測驗正確率",
    chartTitle: "近 7 天已學字數",
    chartUnit: "字",
    empty: "—"
  };

  /**
   * 環形圖幾何（SVG viewBox 0 0 120 120；半徑 52、線寬 12）。
   * 以周長作為 stroke-dasharray，stroke-dashoffset = 周長 × (1 − 比例) 表示填滿比例。
   */
  var RING = Object.freeze({ size: 120, r: 52, stroke: 12 });
  var RING_CIRC = 2 * Math.PI * RING.r;

  /** 會影響今日學習進度區的 store tag（AC-30-07 (b)：show() 時另外重繪） */
  var PROGRESS_TAGS = ["init", "learning", "goal", "studySet", "customVocab", "part5", "flashcard", "stats", "storage"];

  /**
   * 模組入口項目（R-15，FE-23）：顯示名稱改由 C.TAB_LABELS[tab] 取得，不再寫死。
   * label 以 getter 於讀取時才取用 constants（LD-2：載入時不得讀取其他模組成員）。
   */
  function entry(tab) {
    return {
      tab: tab,
      get label() { return core().C.TAB_LABELS[tab]; }
    };
  }

  /**
   * 模組入口（AC-17-06；v0.5，FE-38）：NAV_TAB_ORDER 去掉 dashboard 後加上 sources
   * （customizer、flashcards、part5、sources）。於讀取時計算（LD-2），隱藏頁不會出現。
   * @returns {{ tab: string, label: string }[]}
   */
  function entries() {
    var order = core().C.NAV_TAB_ORDER || [];
    var tabs = [];
    for (var i = 0; i < order.length; i++) {
      if (order[i] !== "dashboard") tabs.push(order[i]);
    }
    tabs.push("sources");
    return tabs.map(entry);
  }

  /** 非負整數；異常值 → 0 */
  function safeCount(v) {
    return typeof v === "number" && isFinite(v) && v > 0 ? Math.floor(v) : 0;
  }

  // ── 純邏輯 ──

  /**
   * 統計區數值（AC-17-01、AC-17-04）。
   * @param {object|null} data PersistedData
   * @param {string} today 本地日期 YYYY-MM-DD
   * @returns {{ streakDays: number, mastered: number, accuracy: string }}
   */
  function summaryOf(data, today) {
    var K = core();
    var d = data && typeof data === "object" ? data : {};
    var p5 = d.part5 && typeof d.part5 === "object" ? d.part5 : {};
    return {
      streakDays: K.STREAK.displayDays(d.streak || null, today),
      mastered: Array.isArray(d.masteredWordKeys) ? d.masteredWordKeys.length : 0,
      // 正確率一律交給 stats.accuracyText：0 題 → 「—」
      accuracy: K.STATS.accuracyText(p5.totalAnswered, p5.totalCorrect)
    };
  }

  /**
   * 目標區顯示文字（AC-17-06、AC-01-07）。
   * 目標色級為藍、金時，生效色級顯示「綠（內建上限）」；其餘兩者相同。
   * 每日新字量取生效色級的 dailyNewWords（藍、金顯示綠的 15）。
   * @param {object|null} goal GoalState
   * @returns {{ appliedScore: string, appliedColor: string, appliedColorId: (string|null),
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
    if (effective && appliedId !== effectiveId) effectiveText += TEXT.builtinCap;

    // 每日新字量依「生效色級」顯示（人類決議 R6-2，2026-10-30）：藍、金生效為綠 → 15
    var daily = effective && typeof effective.dailyNewWords === "number" ? effective.dailyNewWords : null;
    return {
      appliedScore: score !== null ? String(score) : TEXT.empty,
      appliedColor: applied ? applied.nameZh : TEXT.empty,
      appliedColorId: applied ? applied.id : null,
      effectiveColor: effectiveText,
      effectiveColorId: effective ? effective.id : null,
      daily: daily !== null ? daily + " 字/天" : TEXT.empty
    };
  }

  /**
   * 匯入結果 → 提示文字（AC-24-04～AC-24-09）。cancelled 不提示 → 回 null。
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
   * 今日學習進度區的全部顯示值（FE-31；契約 README §5.4 LR-6 與小環形圖段）。
   * - 主環：X = learning.todayCount、D = learning.dailyGoal(生效色級)；X 可超過 D；X ≥ D → done、滿圈。
   * - 小環：目前單字集掌握率 = learning.masteryRate(runtime.studySet, data.masteredWordKeys)；
   *         模擬測驗正確率 = learning.percentOf(part5.totalCorrect, part5.totalAnswered)；null → 空環「—」。
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
      text: TEXT.todayPrefix + x + " / " + goal + TEXT.todaySuffix,
      centerText: x + " / " + goal,
      doneText: done ? TEXT.goalDone : ""
    };

    // 小環形圖（AC-30-10）
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
        label: TEXT.masteryRate,
        numer: mr.numer,
        denom: mr.denom,
        percent: mr.percent,
        ratio: mr.percent === null ? 0 : clampRatio(mr.percent / 100),
        text: percentText(mr.percent)
      },
      accuracy: {
        label: TEXT.accuracyRate,
        percent: acc,
        ratio: acc === null ? 0 : clampRatio(acc / 100),
        text: percentText(acc)
      },
      bars: bars,
      maxCount: max
    };
  }

  /** tags 是否含會影響今日學習進度區的項目；tags 缺漏時視為需要重繪 */
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

    function currentData() {
      var s = store();
      if (!s || typeof s.getState !== "function") return null;
      try {
        var st = s.getState();
        return st && st.data ? st.data : null;
      } catch (e) {
        return null;
      }
    }

    function todayStr() {
      return core().STREAK.localDate(new Date());
    }

    /** 一個數值卡片：標題 + 數值節點 */
    function statItem(label, cls) {
      var D = dom();
      var value = D.el("p", { className: "dash-stat__value" + (cls ? " " + cls : ""), text: TEXT.empty });
      var item = D.el("div", { className: "dash-stat" }, [
        D.el("p", { className: "dash-stat__label", text: label }),
        value
      ]);
      return { item: item, value: value };
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
     * 建立一個 SVG 環形圖（底圈 + 進度圈）。進度圈初始為空環。
     * @param {string} cls 額外類名（db-ring--main／db-ring--small）
     * @returns {{ svg: SVGElement, bar: SVGElement }}
     */
    function ringSvg(cls) {
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
        "class": "db-ring " + cls,
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

    /** 小環形圖區塊：標題 + 環 + 中央數值 */
    function smallRing(label) {
      var D = dom();
      var ring = ringSvg("db-ring--small");
      var value = D.el("span", { className: "db-ring__value db-ring__value--small", text: TEXT.empty });
      var item = D.el("div", { className: "db-mini" }, [
        D.el("p", { className: "db-mini__label", text: label }),
        D.el("div", { className: "db-ring-wrap db-ring-wrap--small" }, [ring.svg, value])
      ]);
      return { item: item, ring: ring, value: value };
    }

    /** 今日學習進度區重繪（FE-31）：只依 progressModel 的結果改屬性與 textContent */
    function renderProgress() {
      if (!refs || !refs.progress) return;
      var D = dom();
      var P = refs.progress;
      var m = progressModel(currentState(), progressToday());

      // 主環形圖（AC-30-05：達成 → 滿圈金色 + 「今日目標達成」）
      setRing(P.main.bar, m.today.ratio);
      P.main.svg.classList.toggle("db-ring--done", m.today.done);
      P.mainWrap.classList.toggle("db-today--done", m.today.done);
      D.setText(P.center, m.today.centerText);
      D.setText(P.todayText, m.today.text);
      D.setText(P.doneText, m.today.doneText);
      P.doneText.hidden = !m.today.done;

      // 小環形圖（AC-30-10：null → 空環「—」）
      setRing(P.mastery.ring.bar, m.mastery.ratio);
      D.setText(P.mastery.value, m.mastery.text);
      P.mastery.ring.svg.classList.toggle("db-ring--empty", m.mastery.percent === null);
      setRing(P.accuracy.ring.bar, m.accuracy.ratio);
      D.setText(P.accuracy.value, m.accuracy.text);
      P.accuracy.ring.svg.classList.toggle("db-ring--empty", m.accuracy.percent === null);

      // 近 7 天長條圖（AC-30-08）：節點固定 DASHBOARD_CHART_DAYS 組，只改高度與文字
      for (var i = 0; i < P.bars.length; i++) {
        var b = m.bars[i];
        var cell = P.bars[i];
        if (!b) {
          cell.item.hidden = true;
          continue;
        }
        cell.item.hidden = false;
        D.setText(cell.count, String(b.count));
        D.setText(cell.label, b.label);
        cell.fill.style.height = b.heightPct + "%";
        cell.item.classList.toggle("db-bars__item--today", b.isToday);
        cell.item.setAttribute("data-date", b.date);
        cell.item.setAttribute("aria-label", b.label + " " + b.count + " " + TEXT.chartUnit);
      }
    }

    /** 建立今日學習進度區（節點只建一次；之後 renderProgress 更新） */
    function buildProgress() {
      var D = dom();
      var main = ringSvg("db-ring--main");
      var center = D.el("span", { className: "db-ring__value", attrs: { "aria-hidden": "true" }, text: "" });
      var todayText = D.el("p", { className: "db-today__text", text: "" });
      var doneText = D.el("p", { className: "db-today__done", attrs: { "aria-live": "polite" }, text: "" });
      doneText.hidden = true;
      var mainWrap = D.el("div", { className: "db-today" }, [
        D.el("div", { className: "db-ring-wrap db-ring-wrap--main" }, [main.svg, center]),
        todayText,
        doneText
      ]);
      var mastery = smallRing(TEXT.masteryRate);
      var accuracy = smallRing(TEXT.accuracyRate);

      var days = core().C.DASHBOARD_CHART_DAYS;
      var n = typeof days === "number" && days > 0 ? Math.floor(days) : 7;
      var bars = [];
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
        bars.push({ item: item, count: count, fill: fill, label: label });
        items.push(item);
      }

      var section = D.el("section", { className: "card dash-section db-progress", attrs: { "aria-labelledby": "dash-progress-h" } }, [
        D.el("h3", { className: "dash-section__title", attrs: { id: "dash-progress-h" }, text: TEXT.progressTitle }),
        D.el("div", { className: "db-rings" }, [
          mainWrap,
          D.el("div", { className: "db-minis" }, [mastery.item, accuracy.item])
        ]),
        D.el("h4", { className: "db-bars__title", attrs: { id: "dash-chart-h" }, text: TEXT.chartTitle }),
        D.el("ol", { className: "db-bars", attrs: { "aria-labelledby": "dash-chart-h" } }, items)
      ]);

      return {
        section: section,
        refs: {
          main: main,
          mainWrap: mainWrap,
          center: center,
          todayText: todayText,
          doneText: doneText,
          mastery: mastery,
          accuracy: accuracy,
          bars: bars
        }
      };
    }

    /** 統計區重繪（只改 textContent） */
    function renderStats() {
      if (!refs) return;
      var D = dom();
      var s = summaryOf(currentData(), todayStr());
      D.setText(refs.streak, s.streakDays + " 天");
      D.setText(refs.mastered, s.mastered + " 字");
      D.setText(refs.accuracy, s.accuracy);
    }

    /** 目標區重繪 */
    function renderGoal() {
      if (!refs) return;
      var D = dom();
      var data = currentData();
      var info = goalInfoOf(data ? data.goal : null);
      D.setText(refs.score, info.appliedScore);
      D.setText(refs.appliedColor, info.appliedColor);
      D.setText(refs.effectiveColor, info.effectiveColor);
      D.setText(refs.daily, info.daily);
      refs.appliedColor.setAttribute("data-color", info.appliedColorId || "");
      refs.effectiveColor.setAttribute("data-color", info.effectiveColorId || "");
    }

    function setBusy(v) {
      busy = !!v;
      if (!refs) return;
      refs.exportBtn.disabled = busy;
      refs.importBtn.disabled = busy;
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

    /** 依匯入結果提示並更新畫面 */
    function finishImport(result) {
      var msg = importMessage(result);
      if (msg) toast(msg.text, msg.kind);
      if (result && result.ok === true) {
        renderGoal();
        renderStats();
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

    function onImportClick() {
      if (busy || !refs) return;
      refs.fileInput.click();
    }

    function mount(rootEl) {
      if (!rootEl) return;
      var D = dom();

      var st = statItem(TEXT.streak);
      var ma = statItem(TEXT.mastered);
      var ac = statItem(TEXT.accuracy);

      var score = statItem(TEXT.appliedScore);
      var applied = statItem(TEXT.appliedColor, "dash-color");
      var effective = statItem(TEXT.effectiveColor, "dash-color");
      var daily = statItem(TEXT.daily);

      var entryItems = entries().map(function (en) {
        return D.el("li", { className: "dash-entries__item" },
          D.el("button", {
            className: "btn dash-entry" + (en.tab === "sources" ? " dash-entry--sources" : ""),
            attrs: { type: "button", "data-go": en.tab },
            text: en.label
          }));
      });

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

      var progress = buildProgress();

      var page = D.el("div", { className: "dashboard" }, [
        D.el("h2", { className: "dash-title", text: TEXT.title }),
        progress.section,
        D.el("section", { className: "card dash-section", attrs: { "aria-labelledby": "dash-stats-h" } }, [
          D.el("h3", { className: "dash-section__title", attrs: { id: "dash-stats-h" }, text: TEXT.statsTitle }),
          D.el("div", { className: "dash-stats" }, [st.item, ma.item, ac.item])
        ]),
        D.el("section", { className: "card dash-section", attrs: { "aria-labelledby": "dash-goal-h" } }, [
          D.el("h3", { className: "dash-section__title", attrs: { id: "dash-goal-h" }, text: TEXT.goalTitle }),
          D.el("div", { className: "dash-stats dash-stats--goal" }, [score.item, applied.item, effective.item, daily.item])
        ]),
        D.el("section", { className: "card dash-section", attrs: { "aria-labelledby": "dash-entries-h" } }, [
          D.el("h3", { className: "dash-section__title", attrs: { id: "dash-entries-h" }, text: TEXT.entriesTitle }),
          D.el("ul", { className: "dash-entries" }, entryItems)
        ]),
        D.el("section", { className: "card dash-section", attrs: { "aria-labelledby": "dash-backup-h" } }, [
          D.el("h3", { className: "dash-section__title", attrs: { id: "dash-backup-h" }, text: TEXT.backupTitle }),
          D.el("p", { className: "dash-backup__hint", text: TEXT.backupHint }),
          D.el("div", { className: "btn-row" }, [exportBtn, importBtn]),
          fileInput
        ])
      ]);

      refs = {
        progress: progress.refs,
        streak: st.value,
        mastered: ma.value,
        accuracy: ac.value,
        score: score.value,
        appliedColor: applied.value,
        effectiveColor: effective.value,
        daily: daily.value,
        exportBtn: exportBtn,
        importBtn: importBtn,
        fileInput: fileInput
      };

      // 先在未掛上文件前繪製初值：進度圈不會從空環播放 transition（只在數值改變時播放，§7.11）
      renderProgress();
      renderStats();
      renderGoal();

      D.clear(rootEl);
      rootEl.appendChild(page);

      // 訂閱 store：重繪統計區；相關 tag（PROGRESS_TAGS）才重繪今日學習進度區
      var s = store();
      if (s && typeof s.subscribe === "function" && !unsubscribe) {
        unsubscribe = s.subscribe(function (state, tags) {
          renderStats();
          if (progressAffected(tags)) renderProgress();
        });
      }
    }

    function show() {
      // 回到主控台時更新（目標可能已在難易度設定變更；跨日時打卡與今日已學數也要更新，AC-30-07 (b)）
      renderProgress();
      renderStats();
      renderGoal();
    }

    function hide() {
      // 保留訂閱；不需處理
    }

    return { mount: mount, show: show, hide: hide };
  }

  return {
    TEXT: TEXT,
    // 讀取時才由 NAV_TAB_ORDER 推導（LD-2）；每次讀取回傳新陣列
    get ENTRIES() { return entries(); },
    summaryOf: summaryOf,
    goalInfoOf: goalInfoOf,
    importMessage: importMessage,
    progressModel: progressModel,
    ringGeometry: ringGeometry,
    PROGRESS_TAGS: PROGRESS_TAGS,
    progressAffected: progressAffected,
    createView: createView
  };
});
