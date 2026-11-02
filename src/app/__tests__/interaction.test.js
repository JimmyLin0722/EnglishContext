/*
 * interaction.test.js — 介面互動核心單元測試（FE-21）
 * 依據：architecture.md v0.4 §7.10、§7.12、§10.1
 * 涵蓋：AC-28-01、AC-28-03～AC-28-06、AC-29-01、AC-29-02、AC-31-01
 */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");
const ia = require("../core/interaction.js");

const { UI, LIMITS } = ia;

test("UI 常數值完全依 §7.12", () => {
  assert.deepEqual(
    { ...UI, VIBRATE_WRONG: [...UI.VIBRATE_WRONG] },
    {
      NAV_BOTTOM_MAX_PX: 640,
      PAGE_ANIM_MS: 240,
      FLIP_ANIM_MS: 360,
      SLIDE_ANIM_MS: 200,
      ANSWER_ANIM_MS: 480,
      RING_ANIM_MS: 500,
      SWIPE_MIN_PX: 50,
      TAP_SLOP_PX: 10,
      CLICK_SUPPRESS_MS: 350,
      VIBRATE_CORRECT: 40,
      VIBRATE_WRONG: [60, 40, 60],
      TOUCH_MIN_PX: 44,
      ANIM_CLEANUP_MARGIN_MS: 50
    }
  );
  assert.deepEqual({ ...LIMITS }, {
    PAGE: 300, FLIP: 400, ANSWER: 600, VIBRATE: 200, NAV: 640, SWIPE: 50, TOUCH: 44
  });
});

test("UI 時間與尺寸值符合 PRD 上限（≤ 或依規定 ≥）", () => {
  assert.ok(UI.PAGE_ANIM_MS <= LIMITS.PAGE, "換頁 ≤ 300 ms（AC-31-01）");
  assert.ok(UI.FLIP_ANIM_MS <= LIMITS.FLIP, "翻卡 ≤ 400 ms（AC-28-01）");
  assert.ok(UI.SLIDE_ANIM_MS <= LIMITS.PAGE, "換卡滑入 ≤ 換頁上限（SD 訂）");
  assert.ok(UI.ANSWER_ANIM_MS <= LIMITS.ANSWER, "答題 ≤ 600 ms（AC-29-01）");
  assert.ok(UI.NAV_BOTTOM_MAX_PX <= LIMITS.NAV, "底部導覽斷點 ≤ 640px");
  assert.ok(UI.SWIPE_MIN_PX >= LIMITS.SWIPE, "滑動門檻 ≥ 50px（AC-28-03）");
  assert.ok(UI.TOUCH_MIN_PX >= LIMITS.TOUCH, "觸控尺寸 ≥ 44px");
  assert.ok(UI.VIBRATE_CORRECT <= LIMITS.VIBRATE);
  // 其他時間值為正數
  for (const k of ["RING_ANIM_MS", "TAP_SLOP_PX", "CLICK_SUPPRESS_MS", "ANIM_CLEANUP_MARGIN_MS"]) {
    assert.ok(Number.isFinite(UI[k]) && UI[k] > 0, k);
  }
});

test("patternTotal：兩種震動總長皆 ≤ 200 ms（AC-29-02）", () => {
  assert.equal(ia.patternTotal(ia.vibratePattern("correct")), 40);
  assert.equal(ia.patternTotal(ia.vibratePattern("wrong")), 160);
  assert.ok(ia.patternTotal(ia.vibratePattern("correct")) <= LIMITS.VIBRATE);
  assert.ok(ia.patternTotal(ia.vibratePattern("wrong")) <= LIMITS.VIBRATE);
});

test("UI、LIMITS、陣列與模組本身皆凍結", () => {
  assert.ok(Object.isFrozen(UI));
  assert.ok(Object.isFrozen(LIMITS));
  assert.ok(Object.isFrozen(UI.VIBRATE_WRONG));
  assert.ok(Object.isFrozen(ia));
  assert.throws(() => { UI.PAGE_ANIM_MS = 999; }, TypeError);
  assert.throws(() => { UI.VIBRATE_WRONG.push(1); }, TypeError);
  assert.throws(() => { UI.VIBRATE_WRONG[0] = 500; }, TypeError);
  assert.throws(() => { LIMITS.PAGE = 1; }, TypeError);
  assert.equal(UI.PAGE_ANIM_MS, 240);
  assert.deepEqual([...UI.VIBRATE_WRONG], [60, 40, 60]);
});

test("classifySwipe：dx = ±49 不算、±50 算", () => {
  assert.equal(ia.classifySwipe(49, 0), "none");
  assert.equal(ia.classifySwipe(-49, 0), "none");
  assert.equal(ia.classifySwipe(50, 0), "right");
  assert.equal(ia.classifySwipe(-50, 0), "left");
  assert.equal(ia.classifySwipe(-50, 10), "left");
  assert.equal(ia.classifySwipe(200, -30), "right");
});

test("classifySwipe：|dx| = |dy| 與垂直為主 → none", () => {
  assert.equal(ia.classifySwipe(50, 50), "none");
  assert.equal(ia.classifySwipe(-80, 80), "none");
  assert.equal(ia.classifySwipe(80, -80), "none");
  assert.equal(ia.classifySwipe(60, 120), "none");
  assert.equal(ia.classifySwipe(-60, -61), "none");
  assert.equal(ia.classifySwipe(0, 300), "none");
  assert.equal(ia.classifySwipe(0, 0), "none");
});

test("classifySwipe：非數字輸入不構成滑動且不拋例外", () => {
  const bad = [NaN, undefined, null, "100", Infinity, -Infinity, {}, []];
  for (const v of bad) {
    assert.equal(ia.classifySwipe(v, 0), "none", String(v));
    assert.equal(ia.classifySwipe(100, v), "none", String(v));
  }
  assert.equal(ia.classifySwipe(), "none");
});

test("isTap：位移 < 10 為點擊", () => {
  assert.equal(ia.isTap(0, 0), true);
  assert.equal(ia.isTap(9, 0), true);
  assert.equal(ia.isTap(6, 7), true); // hypot ≈ 9.22
  assert.equal(ia.isTap(10, 0), false);
  assert.equal(ia.isTap(0, -10), false);
  assert.equal(ia.isTap(8, 8), false); // hypot ≈ 11.3
  assert.equal(ia.isTap(NaN, 0), false);
  assert.equal(ia.isTap(undefined, undefined), false);
  assert.equal(ia.isTap("1", 0), false);
});

test("swipeTarget：中間移動、首尾不動回 null（AC-28-04）", () => {
  assert.equal(ia.swipeTarget(0, 5, "left"), 1);
  assert.equal(ia.swipeTarget(3, 5, "right"), 2);
  assert.equal(ia.swipeTarget(4, 5, "left"), null, "最後一張再往左");
  assert.equal(ia.swipeTarget(0, 5, "right"), null, "第一張再往右");
  assert.equal(ia.swipeTarget(0, 1, "left"), null);
  assert.equal(ia.swipeTarget(0, 1, "right"), null);
  assert.equal(ia.swipeTarget(2, 5, "none"), null);
  assert.equal(ia.swipeTarget(2, 5, "up"), null);
  assert.equal(ia.swipeTarget(2, 5), null);
});

test("swipeTarget：不合法索引與總數回 null 且不拋例外", () => {
  assert.equal(ia.swipeTarget(0, 0, "left"), null);
  assert.equal(ia.swipeTarget(-1, 5, "left"), null);
  assert.equal(ia.swipeTarget(5, 5, "right"), null);
  assert.equal(ia.swipeTarget(1.5, 5, "left"), null);
  assert.equal(ia.swipeTarget(NaN, 5, "left"), null);
  assert.equal(ia.swipeTarget(1, undefined, "left"), null);
  assert.equal(ia.swipeTarget("1", 5, "left"), null);
});

test("classifySwipe + swipeTarget 串接", () => {
  assert.equal(ia.swipeTarget(2, 5, ia.classifySwipe(-60, 5)), 3);
  assert.equal(ia.swipeTarget(2, 5, ia.classifySwipe(60, 5)), 1);
  assert.equal(ia.swipeTarget(2, 5, ia.classifySwipe(-49, 0)), null);
  assert.equal(ia.swipeTarget(2, 5, ia.classifySwipe(NaN, 0)), null);
});

test("vibratePattern：correct／wrong／其他", () => {
  assert.equal(ia.vibratePattern("correct"), UI.VIBRATE_CORRECT);
  assert.equal(ia.vibratePattern("wrong"), UI.VIBRATE_WRONG);
  assert.equal(ia.vibratePattern("other"), null);
  assert.equal(ia.vibratePattern(undefined), null);
  assert.equal(ia.vibratePattern("Correct"), null);
});

test("patternTotal：數字、陣列（含停頓）、其他", () => {
  assert.equal(ia.patternTotal(40), 40);
  assert.equal(ia.patternTotal([60, 40, 60]), 160);
  assert.equal(ia.patternTotal([]), 0);
  assert.equal(ia.patternTotal([10, "x", NaN, 5]), 15);
  assert.equal(ia.patternTotal(null), 0);
  assert.equal(ia.patternTotal(undefined), 0);
  assert.equal(ia.patternTotal("40"), 0);
  assert.equal(ia.patternTotal(NaN), 0);
  assert.equal(ia.patternTotal({}), 0);
});

test("瀏覽器環境：掛到 EMT.core.interaction 且不依賴其他模組", () => {
  const src = fs.readFileSync(path.join(__dirname, "..", "core", "interaction.js"), "utf8");
  const sandbox = { self: {} };
  sandbox.self = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  const api = sandbox.EMT && sandbox.EMT.core && sandbox.EMT.core.interaction;
  assert.ok(api, "EMT.core.interaction 存在");
  assert.equal(api.UI.PAGE_ANIM_MS, 240);
  assert.equal(api.classifySwipe(-50, 0), "left");
  assert.ok(Object.isFrozen(api.UI));
  // 不碰 DOM、不讀其他 core 模組
  assert.doesNotMatch(src, /\bdocument\b|\bwindow\.|EMT\.core\.(?!interaction)/);
});
