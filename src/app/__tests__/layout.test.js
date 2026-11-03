/*
 * layout.test.js — 版面契約常數與純函式單元測試（FE-54）
 * 受測：core/layout.js
 * 依據：architecture.md v0.8 §4.8「EMT.core.layout」、§10.5「layout.test.js」列；契約 data-schema.ts §13、
 *       README §11.4 DB-4、§11.5 FT-4、§11.6 MT-1、§11.7 V-LAY-08
 * 涵蓋：V-LAY-08、AC-39-04、AC-41-02、AC-39-07、AC-40-01、AC-01-07、AC-25-02、AC-25-03
 * 常數期望值由 data-schema.ts §13 原文逐字複製（測試不讀 docs/）。
 */
"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const layout = require("../core/layout.js");
const constants = require("../core/constants.js");
const goal = require("../core/goal.js");

const LAYOUT_PATH = path.join(__dirname, "..", "core", "layout.js");

// ── 契約原文（data-schema.ts §13，逐字複製）──

const EXPECTED = {
  APP_DISPLAY_NAME: "EnglishContext",
  FROZEN_IDENTIFIERS: {
    storageStateKey: "englishMasterTrack:state",
    storageUnreadableKey: "englishMasterTrack:unreadable",
    backupFormatId: "english-master-track-backup",
    backupFileNamePrefix: "english-master-track-backup-",
    deliveryHtmlPath: "dist/english-master-track.html",
    pwaCachePrefix: "english-master-track-pwa-",
    buildIdMetaName: "emt-build-id",
  },
  COLOR_TOKENS: {
    brand: "#1e9bf0",
    brandDeep: "#0866ad",
    accent: "#f7893b",
    accentText: "#1f2937",
    themeColor: "#1e9bf0",
    background: "#eef4fa",
    surface: "#ffffff",
    text: "#1f2937",
    textMuted: "#5b6472",
  },
  SEMANTIC_COLORS: {
    level: {
      orange: "#e8833a",
      brown: "#8b5a2b",
      green: "#2e9e5b",
      blue: "#2f6fd6",
      gold: "#c9a227",
    },
    correct: "#15803d",
    wrong: "#b91c1c",
    sttLight: {
      green: "#16a34a",
      yellow: "#ca8a04",
      red: "#dc2626",
    },
    goalReached: "#c9a227",
  },
  LAYOUT_TEXTS: {
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
    firstRunTitle: "選擇你的目標",
    firstRunSubtitle: "之後可以在「難易度設定」隨時變更",
    vocabNoteLead: "本系統建議字量",
    levelLocked: "即將開放",
    summaryLine: "{color}級・每日 {daily} 字　預計 {weeks} 週",
    summaryLockedSuffix: "（以綠試算）",
    lockedNotice: "目前內建字庫到綠色為止",
    startLearning: "開始學習",
    restoreFromBackup: "從備份還原",
  },
};

/** 遞迴確認物件與所有子物件皆凍結 */
function assertDeepFrozen(v, where) {
  if (!v || typeof v !== "object") return;
  assert.ok(Object.isFrozen(v), `${where} 應凍結`);
  for (const k of Object.keys(v)) assertDeepFrozen(v[k], `${where}.${k}`);
}

/** 遞迴比對鍵順序 */
function assertKeyOrder(actual, expected, where) {
  if (!expected || typeof expected !== "object") return;
  assert.deepStrictEqual(Object.keys(actual), Object.keys(expected), `${where} 鍵順序`);
  for (const k of Object.keys(expected)) assertKeyOrder(actual[k], expected[k], `${where}.${k}`);
}

const LV = (id) => constants.COLOR_LEVELS.find((l) => l.id === id);

describe("契約常數（data-schema.ts §13）", () => {
  test("5 個常數逐值、逐鍵順序相同", () => {
    for (const [k, v] of Object.entries(EXPECTED)) {
      assert.deepStrictEqual(layout[k], v, k);
      assertKeyOrder(layout[k], v, k);
    }
  });

  test("全部深度凍結", () => {
    for (const k of Object.keys(EXPECTED)) assertDeepFrozen(layout[k], k);
    assertDeepFrozen(layout.UI_LAYOUT, "UI_LAYOUT");
    assert.ok(Object.isFrozen(layout));
  });

  test("分隔符號：U+30FB 與 U+3000", () => {
    assert.equal(layout.LAYOUT_TEXTS.goalLineSeparator, "・");
    assert.ok(layout.LAYOUT_TEXTS.goalLineSame.includes("・"));
    assert.ok(layout.LAYOUT_TEXTS.summaryLine.includes("字　預計"));
    assert.equal(layout.LAYOUT_TEXTS.statNoData, "—");
  });

  test("UI_LAYOUT 12 個值（architecture.md §4.8）", () => {
    assert.deepStrictEqual({ ...layout.UI_LAYOUT }, {
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
      FOCUS_OUTLINE_PX: 3,
    });
  });

  test("NARROW_MAX_PX = interaction.UI.NAV_BOTTOM_MAX_PX", () => {
    const interaction = require("../core/interaction.js");
    assert.equal(layout.UI_LAYOUT.NARROW_MAX_PX, interaction.UI.NAV_BOTTOM_MAX_PX);
  });

  test("APP_DISPLAY_NAME = PWA_APP_NAME", () => {
    const pwa = require("../core/pwa.js");
    assert.equal(layout.APP_DISPLAY_NAME, pwa.PWA_APP_NAME);
  });
});

describe("LD-1：載入時不取用其他模組", () => {
  test("原始碼不含 require( 與 EMT.core.<其他模組>", () => {
    const src = fs.readFileSync(LAYOUT_PATH, "utf8");
    assert.ok(!/\brequire\s*\(/.test(src), "不得 require");
    assert.ok(!/EMT\.(core|store|ui|views|services)\.(?!layout\b)\w+/.test(src), "不得取用其他 EMT 模組");
    assert.ok(!/\b(document|localStorage|window)\./.test(src), "不得讀 DOM 或 window");
  });

  test("在空沙箱（只有 self）以 vm 執行不拋例外並登錄 EMT.core.layout", () => {
    const src = fs.readFileSync(LAYOUT_PATH, "utf8");
    const sandbox = {};
    sandbox.self = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(src, sandbox, { filename: "layout.js" });
    assert.ok(sandbox.EMT && sandbox.EMT.core && sandbox.EMT.core.layout);
    assert.equal(sandbox.EMT.core.layout.APP_DISPLAY_NAME, "EnglishContext");
    assert.equal(typeof sandbox.EMT.core.layout.goalLine, "function");
  });
});

describe("fill", () => {
  test("替換所有佔位符", () => {
    assert.equal(layout.fill("今日已學 {x} / {d} 字", { x: 3, d: 15 }), "今日已學 3 / 15 字");
    assert.equal(layout.fill("{a}{a}", { a: "x" }), "xx");
    assert.equal(layout.fill("無佔位", {}), "無佔位");
  });

  test("缺鍵 → TypeError", () => {
    assert.throws(() => layout.fill("{x} / {d}", { x: 1 }), TypeError);
    assert.throws(() => layout.fill("{x}", undefined), TypeError);
  });

  test("不做 HTML 跳脫（以 textContent 寫入）", () => {
    assert.equal(layout.fill("{n}", { n: "<b>" }), "<b>");
  });
});

describe("formatInt", () => {
  test("千分位與四捨五入", () => {
    assert.equal(layout.formatInt(0), "0");
    assert.equal(layout.formatInt(999), "999");
    assert.equal(layout.formatInt(1000), "1,000");
    assert.equal(layout.formatInt(2809), "2,809");
    assert.equal(layout.formatInt(5620), "5,620");
    assert.equal(layout.formatInt(1234567), "1,234,567");
    assert.equal(layout.formatInt(14.6), "15");
  });

  test("非有限數 → 「—」", () => {
    assert.equal(layout.formatInt(NaN), "—");
    assert.equal(layout.formatInt(Infinity), "—");
    assert.equal(layout.formatInt(null), "—");
    assert.equal(layout.formatInt("12"), "—");
  });

  test("與 views/customizer.js 的 formatInt 輸出相同", () => {
    const cz = require("../views/customizer.js");
    for (const n of [0, 7, 999, 1000, 2809, 5620, 10000, 1234567, 14.5, -1200]) {
      assert.equal(layout.formatInt(n), cz.formatInt(n), String(n));
    }
  });
});

describe("goalLine（DB-4）", () => {
  test("5 色逐字（後接「・變更」由 view 組合）", () => {
    const cases = [
      ["orange", "orange", "橘級・每日 10 字", false],
      ["brown", "brown", "棕級・每日 10 字", false],
      ["green", "green", "綠級・每日 15 字", false],
      ["blue", "green", "目標藍級・生效綠級（內建上限）・每日 15 字", true],
      ["gold", "green", "目標金級・生效綠級（內建上限）・每日 15 字", true],
    ];
    const full = [
      "橘級・每日 10 字・變更",
      "棕級・每日 10 字・變更",
      "綠級・每日 15 字・變更",
      "目標藍級・生效綠級（內建上限）・每日 15 字・變更",
      "目標金級・生效綠級（內建上限）・每日 15 字・變更",
    ];
    cases.forEach(([a, e, text, capped], i) => {
      const r = layout.goalLine(LV(a), LV(e));
      assert.deepStrictEqual(r, { text, capped }, a);
      assert.ok(!r.text.includes("變更"));
      assert.equal(r.text + layout.LAYOUT_TEXTS.goalLineSeparator + layout.LAYOUT_TEXTS.changeLink, full[i]);
    });
  });

  test("任一參數缺 → 「—」", () => {
    assert.deepStrictEqual(layout.goalLine(null, LV("green")), { text: "—", capped: false });
    assert.deepStrictEqual(layout.goalLine(LV("green"), undefined), { text: "—", capped: false });
  });
});

describe("summaryLine（FT-4）", () => {
  const N_B = 2809;
  const N_G = 5620;
  const EXPECT = {
    orange: "橘級・每日 10 字　預計 15 週",
    brown: "棕級・每日 10 字　預計 41 週",
    green: "綠級・每日 15 字　預計 54 週",
    blue: "藍級・每日 20 字　預計 41 週（以綠試算）",
    gold: "金級・每日 20 字　預計 41 週（以綠試算）",
  };

  test("5 色（以 goal.estimate 試算，N_B 2,809、N_G 5,620 → 15／41／54／41／41 週）", () => {
    const weeks = [];
    for (const lv of constants.COLOR_LEVELS) {
      const est = goal.estimate(lv.scoreMax, 0, N_B, N_G);
      weeks.push(est.weeks);
      assert.equal(layout.summaryLine(lv, est.dailyNewWords, est.weeks, est.basedOnGreen), EXPECT[lv.id], lv.id);
    }
    assert.deepStrictEqual(weeks, [15, 41, 54, 41, 41]);
  });

  test("weeks 為 null → 「—」；千分位", () => {
    assert.equal(layout.summaryLine(LV("green"), 15, null, false), "綠級・每日 15 字　預計 — 週");
    assert.equal(layout.summaryLine(LV("green"), 1500, 1200, false), "綠級・每日 1,500 字　預計 1,200 週");
  });

  test("不含分數與「待定」", () => {
    for (const s of Object.values(EXPECT)) {
      assert.ok(!/分|待定/.test(s));
    }
  });
});

describe("chartIsEmpty（§5.4 v0.12 段）", () => {
  test("全 0、空陣列、含 NaN → true", () => {
    assert.equal(layout.chartIsEmpty([0, 0, 0, 0, 0, 0, 0]), true);
    assert.equal(layout.chartIsEmpty([]), true);
    assert.equal(layout.chartIsEmpty([0, NaN, 0, Infinity, 0, 0, 0]), true);
    assert.equal(layout.chartIsEmpty(null), true);
  });

  test("任一 > 0 → false", () => {
    assert.equal(layout.chartIsEmpty([0, 0, 0, 0, 0, 0, 1]), false);
    assert.equal(layout.chartIsEmpty([3, NaN, 0, 0, 0, 0, 0]), false);
  });
});

describe("part5Progress（MT-1）", () => {
  test("question 1／N、5／N、N／N", () => {
    assert.deepStrictEqual(layout.part5Progress("question", 1, 20), { visible: true, now: 1, max: 20, percent: 5 });
    assert.deepStrictEqual(layout.part5Progress("question", 5, 20), { visible: true, now: 5, max: 20, percent: 25 });
    assert.deepStrictEqual(layout.part5Progress("question", 20, 20), { visible: true, now: 20, max: 20, percent: 100 });
    assert.deepStrictEqual(layout.part5Progress("question", 1, 3), { visible: true, now: 1, max: 3, percent: 33.3 });
  });

  test("summary → 100%", () => {
    assert.deepStrictEqual(layout.part5Progress("summary", 0, 20), { visible: true, now: 20, max: 20, percent: 100 });
  });

  test("empty 或 total 0 → 不顯示", () => {
    assert.equal(layout.part5Progress("empty", 0, 20).visible, false);
    assert.equal(layout.part5Progress("question", 1, 0).visible, false);
    assert.equal(layout.part5Progress("summary", 0, 0).visible, false);
  });
});
