/*
 * EMT.core.layout — 版面與視覺契約常數與純函式（FE-54）
 * 依據：architecture.md v0.8 §2（v0.8 段）、§4.8「EMT.core.layout」、§7.19；契約 data-schema.ts §13、
 *       README §11.4 DB-4、§11.5 FT-4、§11.6 MT-1、§5.4 v0.12 段、§11.7 V-LAY-08
 * 涵蓋：AC-39-04、AC-39-07、AC-40-01、AC-41-02、AC-01-07、AC-25-02、AC-25-03
 *
 * - 5 個契約常數（APP_DISPLAY_NAME、FROZEN_IDENTIFIERS、COLOR_TOKENS、SEMANTIC_COLORS、LAYOUT_TEXTS）
 *   與 data-schema.ts §13 逐值、逐鍵順序相同，全部深度凍結。
 * - UI_LAYOUT：§7.19 引用的版面常數；CSS 以同值寫死（tokens.test.js 比對）。
 * - L1 模組：載入時不取用任何其他模組（LD-1）、不讀 DOM 與 window 資料；
 *   goalLine／summaryLine 以參數接收 COLOR_LEVELS 項目，不自行取用 constants／goal。
 * - 所有回傳字串都不做 HTML 跳脫：呼叫端一律以 textContent 寫入。
 * - （v0.9，FE-65；契約 v0.14 §13、README §12.2 LS-1、§11.4 DB-4）LAYOUT_TEXTS 新增最後一鍵 levelStatus；
 *   新增 goalLineText（主控台目標行，只以生效色級組字）與 levelStatusText（難易度設定頁狀態列）。
 *   goalLineCapped、goalLineSeparator 兩鍵保留（契約仍含），但 view 不得再使用；goalLine 標記 @deprecated。
 * - （v0.10，FE-72；契約 v0.15 §11.6 MT-1）part5Progress 新增 kind "allCorrect"（同 summary：100%、now = max）；
 *   其他函式、LAYOUT_TEXTS 與載入規則（LD-1）不變。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.EMT = root.EMT || {};
    root.EMT.core = root.EMT.core || {};
    root.EMT.core.layout = api;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // 深層凍結：物件與其中所有子物件、陣列都不可再修改
  function deepFreeze(obj) {
    Object.getOwnPropertyNames(obj).forEach(function (name) {
      var value = obj[name];
      if (value && typeof value === "object") {
        deepFreeze(value);
      }
    });
    return Object.freeze(obj);
  }

  // ── data-schema.ts §13 常數（逐字複製，不得自行修改）──

  /** App 顯示名稱（Q-49；<title>、標題列、授權註解第一行；= PWA_APP_NAME） */
  var APP_DISPLAY_NAME = "EnglishContext";

  /** 不隨改名變動的識別字（NM-5；與 v0.11 逐字相同） */
  var FROZEN_IDENTIFIERS = {
    storageStateKey: "englishMasterTrack:state",
    storageUnreadableKey: "englishMasterTrack:unreadable",
    backupFormatId: "english-master-track-backup",
    backupFileNamePrefix: "english-master-track-backup-",
    deliveryHtmlPath: "dist/english-master-track.html",
    pwaCachePrefix: "english-master-track-pwa-",
    buildIdMetaName: "emt-build-id"
  };

  /** 色彩 token（VC；畫面實際顏色以 00-base.css 的 CSS 變數為準，本常數供測試比對） */
  var COLOR_TOKENS = {
    brand: "#1e9bf0",
    brandDeep: "#0866ad",
    accent: "#f7893b",
    accentText: "#1f2937",
    themeColor: "#1e9bf0",
    background: "#eef4fa",
    surface: "#ffffff",
    text: "#1f2937",
    textMuted: "#5b6472"
  };

  /** 語意色（AC-38-03：與 v0.11 完全相同） */
  var SEMANTIC_COLORS = {
    level: {
      orange: "#e8833a",
      brown: "#8b5a2b",
      green: "#2e9e5b",
      blue: "#2f6fd6",
      gold: "#c9a227"
    },
    correct: "#15803d",
    wrong: "#b91c1c",
    sttLight: {
      green: "#16a34a",
      yellow: "#ca8a04",
      red: "#dc2626"
    },
    goalReached: "#c9a227"
  };

  /** 版面文字（逐字使用；「・」為 U+30FB，摘要行「字」與「預計」之間為全形空白 U+3000） */
  var LAYOUT_TEXTS = {
    // ── 主控台（US-39）──
    dashboardTitle: "學習主控台",
    todayRing: "今日已學 {x} / {d} 字",
    startToday: "開始今日學習",
    goalLineSame: "{color}級・每日 {daily} 字",
    goalLineCapped: "目標{target}級・生效{effective}級（內建上限）・每日 {daily} 字",
    goalLineSeparator: "・",
    changeLink: "變更",
    statStreakLabel: "連續打卡天數",
    statStreakUnit: "天",
    statMasteryLabel: "單字掌握率",
    statMasteredCount: "已掌握 {n} 字",
    statAccuracyLabel: "模擬測驗正確率",
    statNoData: "—",
    chartEmpty: "開始學習後會顯示紀錄",
    backupSectionTitle: "資料備份",

    // ── 首次畫面（US-41、US-26）──
    firstRunTitle: "選擇你的目標",
    firstRunSubtitle: "之後可以在「難易度設定」隨時變更",
    vocabNoteLead: "本系統建議字量",
    levelLocked: "即將開放",
    summaryLine: "{color}級・每日 {daily} 字　預計 {weeks} 週",
    summaryLockedSuffix: "（以綠試算）",
    lockedNotice: "目前內建字庫到綠色為止",
    startLearning: "開始學習",
    restoreFromBackup: "從備份還原",

    // ── 難易度設定頁（v0.14，US-01）──
    levelStatus: "目前色級：{color}"
  };

  // ── 架構常數（architecture.md §4.8；CSS 以同值寫死）──
  var UI_LAYOUT = {
    CONTENT_NARROW_PX: 720,
    CARD_RADIUS_PX: 16,
    NARROW_MAX_PX: 640,
    FIRSTBAR_RESERVE_PX: 184,
    CHART_TRACK_PX: 64,
    CHART_AREA_MAX_PX: 120,
    CHART_EMPTY_MAX_PX: 48,
    PROGRESS_BAR_PX: 6,
    LOGO_PX: 32,
    SECTION_TITLE_PX: 18,
    STAT_VALUE_PX: 28,
    FOCUS_OUTLINE_PX: 3
  };

  /**
   * 格式字串替換：把 {key} 換成 String(values[key])。
   * 模板中出現但 values 沒有的鍵 → 拋 TypeError（屬程式錯誤）。不做 HTML 跳脫。
   * @param {string} template
   * @param {object} values
   * @returns {string}
   */
  function fill(template, values) {
    var src = values || {};
    return String(template).replace(/\{(\w+)\}/g, function (all, key) {
      if (!Object.prototype.hasOwnProperty.call(src, key)) {
        throw new TypeError("layout.fill：缺少佔位符 {" + key + "} 的值");
      }
      return String(src[key]);
    });
  }

  /**
   * 整數四捨五入後加千分位（2809 → "2,809"）；非有限數 → statNoData「—」。
   * 輸出與 views/customizer.js 的 formatInt 相同（全畫面一致）。
   * @param {number} n
   * @returns {string}
   */
  function formatInt(n) {
    if (typeof n !== "number" || !isFinite(n)) { return LAYOUT_TEXTS.statNoData; }
    var s = String(Math.round(Math.abs(n)));
    var out = "";
    while (s.length > 3) {
      out = "," + s.slice(-3) + out;
      s = s.slice(0, -3);
    }
    return (n < 0 ? "-" : "") + s + out;
  }

  /**
   * @deprecated v0.9（契約 v0.14 DB-4）起 view 不得呼叫，改用 goalLineText；保留供既有測試（T-70）。
   * DB-4 目標行（不含「・變更」，view 另建可點擊節點）。
   * @param {object} applied 已套用色級（COLOR_LEVELS 項目）
   * @param {object} effective 生效色級（COLOR_LEVELS 項目）
   * @returns {{ text: string, capped: boolean }}
   */
  function goalLine(applied, effective) {
    if (!applied || !effective) { return { text: LAYOUT_TEXTS.statNoData, capped: false }; }
    var daily = formatInt(effective.dailyNewWords);
    if (applied.id === effective.id) {
      return { text: fill(LAYOUT_TEXTS.goalLineSame, { color: applied.nameZh, daily: daily }), capped: false };
    }
    return {
      text: fill(LAYOUT_TEXTS.goalLineCapped, { target: applied.nameZh, effective: effective.nameZh, daily: daily }),
      capped: true
    };
  }

  /**
   * （v0.9）DB-4 v0.14 主控台目標行：一律以「生效」色級組字 goalLineSame（結尾不帶「・」，不附註記）。
   * 例：橘「橘級・每日 10 字」、棕「棕級・每日 10 字」、綠「綠級・每日 15 字」；呼叫端以生效色級呼叫，藍、金自然為綠。
   * @param {object} effective 生效色級（COLOR_LEVELS 項目）
   * @returns {string} 缺參數 → statNoData「—」
   */
  function goalLineText(effective) {
    if (!effective) { return LAYOUT_TEXTS.statNoData; }
    return fill(LAYOUT_TEXTS.goalLineSame, {
      color: effective.nameZh,
      daily: formatInt(effective.dailyNewWords)
    });
  }

  /**
   * （v0.9）LS-1 難易度設定頁狀態列：「目前色級：{生效色級}」（只看已套用的 effectiveColor）。
   * @param {object} effective 生效色級（COLOR_LEVELS 項目）
   * @returns {string} 缺參數 → 「目前色級：—」
   */
  function levelStatusText(effective) {
    return fill(LAYOUT_TEXTS.levelStatus, { color: effective ? effective.nameZh : LAYOUT_TEXTS.statNoData });
  }

  /**
   * FT-4 試算摘要行；capped（藍、金）時接「（以綠試算）」；weeks 為 null → 「—」。
   * @param {object} level 選中色級（COLOR_LEVELS 項目）
   * @param {number} daily 每日新字量
   * @param {number|null} weeks 預計週數
   * @param {boolean} capped
   * @returns {string}
   */
  function summaryLine(level, daily, weeks, capped) {
    if (!level) { return LAYOUT_TEXTS.statNoData; }
    var text = fill(LAYOUT_TEXTS.summaryLine, {
      color: level.nameZh,
      daily: formatInt(daily),
      weeks: weeks === null ? LAYOUT_TEXTS.statNoData : formatInt(weeks)
    });
    return capped ? text + LAYOUT_TEXTS.summaryLockedSuffix : text;
  }

  /**
   * 近 7 天空狀態判定（§5.4 v0.12 段）：空陣列或每個值皆為 0（非有限數視為 0）→ true。
   * @param {number[]} counts
   * @returns {boolean}
   */
  function chartIsEmpty(counts) {
    if (!Array.isArray(counts) || counts.length === 0) { return true; }
    for (var i = 0; i < counts.length; i++) {
      var v = counts[i];
      if (typeof v === "number" && isFinite(v) && v !== 0) { return false; }
    }
    return true;
  }

  /**
   * MT-1 模擬測驗進度條推導。
   * （v0.10，FE-72；MT-1 v0.15）kind = "allCorrect"（全部答對畫面）與 "summary" 相同：進度條 100%、now = max。
   * @param {"question"|"summary"|"allCorrect"|"empty"} kind
   * @param {number} number 畫面「第 i / N 題」的 i（kind = "question" 時使用）
   * @param {number} total 題數 N
   * @returns {{ visible: boolean, now: number, max: number, percent: number }}
   */
  function part5Progress(kind, number, total) {
    var max = typeof total === "number" && isFinite(total) ? Math.floor(total) : 0;
    if (max <= 0 || kind === "empty" || (kind !== "question" && kind !== "summary" && kind !== "allCorrect")) {
      return { visible: false, now: 0, max: max > 0 ? max : 0, percent: 0 };
    }
    if (kind === "summary" || kind === "allCorrect") {
      return { visible: true, now: max, max: max, percent: 100 };
    }
    var now = typeof number === "number" && isFinite(number) ? Math.round(number) : 0;
    if (now < 0) { now = 0; }
    if (now > max) { now = max; }
    return { visible: true, now: now, max: max, percent: Math.round(now / max * 1000) / 10 };
  }

  return deepFreeze({
    APP_DISPLAY_NAME: APP_DISPLAY_NAME,
    FROZEN_IDENTIFIERS: FROZEN_IDENTIFIERS,
    COLOR_TOKENS: COLOR_TOKENS,
    SEMANTIC_COLORS: SEMANTIC_COLORS,
    LAYOUT_TEXTS: LAYOUT_TEXTS,
    UI_LAYOUT: UI_LAYOUT,
    fill: fill,
    formatInt: formatInt,
    goalLine: goalLine,
    goalLineText: goalLineText,
    levelStatusText: levelStatusText,
    summaryLine: summaryLine,
    chartIsEmpty: chartIsEmpty,
    part5Progress: part5Progress
  });
});
