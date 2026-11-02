/*
 * streak.test.js — 連續打卡單元測試（FE-05）
 * 涵蓋：AC-17-02、AC-17-05、V-ST-07、FB-09
 */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const streak = require("../core/streak.js");

const EMPTY = { days: 0, lastActiveDate: null };

test("localDate：以本地時區輸出 YYYY-MM-DD", () => {
  assert.equal(streak.localDate(new Date(2026, 0, 1, 0, 5)), "2026-01-01");
  assert.equal(streak.localDate(new Date(2026, 11, 31, 23, 59, 59)), "2026-12-31");
  assert.equal(streak.localDate(new Date(2024, 1, 29, 12)), "2024-02-29");
  assert.match(streak.localDate(), /^\d{4}-\d{2}-\d{2}$/);
});

test("首次打卡 → 1", () => {
  assert.deepEqual(streak.touch(EMPTY, "2026-10-30"), { days: 1, lastActiveDate: "2026-10-30" });
  assert.deepEqual(streak.touch(null, "2026-10-30"), { days: 1, lastActiveDate: "2026-10-30" });
});

test("同日多次學習不重複累加", () => {
  let s = streak.touch(EMPTY, "2026-10-30");
  s = streak.touch(s, "2026-10-30");
  s = streak.touch(s, "2026-10-30");
  assert.deepEqual(s, { days: 1, lastActiveDate: "2026-10-30" });
});

test("AC-17-02：第 D 天與第 D+1 天 → 2", () => {
  let s = streak.touch(EMPTY, "2026-10-30");
  s = streak.touch(s, "2026-10-31");
  assert.deepEqual(s, { days: 2, lastActiveDate: "2026-10-31" });
});

test("AC-17-02：中斷一天（隔兩日）後再學習 → 重設 1", () => {
  const s = streak.touch({ days: 5, lastActiveDate: "2026-10-28" }, "2026-10-30");
  assert.deepEqual(s, { days: 1, lastActiveDate: "2026-10-30" });
  const s2 = streak.touch({ days: 5, lastActiveDate: "2026-01-01" }, "2026-10-30");
  assert.deepEqual(s2, { days: 1, lastActiveDate: "2026-10-30" });
});

test("AC-17-05：時鐘調回 → 不變、不為負、不累加", () => {
  const before = { days: 3, lastActiveDate: "2026-10-30" };
  const s = streak.touch(before, "2026-10-25");
  assert.deepEqual(s, { days: 3, lastActiveDate: "2026-10-30" });
  assert.ok(s.days >= 0);
  // 回到原日期也不累加
  assert.deepEqual(streak.touch(s, "2026-10-30"), { days: 3, lastActiveDate: "2026-10-30" });
  // 時鐘調回時 displayDays 也不為負
  assert.equal(streak.displayDays(before, "2026-10-25"), 3);
});

test("不修改傳入物件", () => {
  const before = { days: 2, lastActiveDate: "2026-10-29" };
  streak.touch(before, "2026-10-30");
  assert.deepEqual(before, { days: 2, lastActiveDate: "2026-10-29" });
});

test("跨月、跨年、閏年", () => {
  assert.equal(streak.touch({ days: 4, lastActiveDate: "2026-10-31" }, "2026-11-01").days, 5);
  assert.equal(streak.touch({ days: 4, lastActiveDate: "2026-12-31" }, "2027-01-01").days, 5);
  assert.equal(streak.touch({ days: 4, lastActiveDate: "2024-02-28" }, "2024-02-29").days, 5);
  assert.equal(streak.touch({ days: 4, lastActiveDate: "2024-02-29" }, "2024-03-01").days, 5);
  assert.equal(streak.touch({ days: 4, lastActiveDate: "2026-02-28" }, "2026-03-01").days, 5);
  assert.equal(streak.touch({ days: 4, lastActiveDate: "2026-02-27" }, "2026-03-01").days, 1);
});

test("日光節約時間切換日不影響日差", () => {
  // 美國 2026-03-08、歐洲 2026-03-29 開始 DST；美國 2026-11-01 結束
  assert.equal(streak.touch({ days: 1, lastActiveDate: "2026-03-07" }, "2026-03-08").days, 2);
  assert.equal(streak.touch({ days: 1, lastActiveDate: "2026-03-08" }, "2026-03-09").days, 2);
  assert.equal(streak.touch({ days: 1, lastActiveDate: "2026-03-29" }, "2026-03-30").days, 2);
  assert.equal(streak.touch({ days: 1, lastActiveDate: "2026-10-31" }, "2026-11-01").days, 2);
  assert.equal(streak.touch({ days: 1, lastActiveDate: "2026-11-01" }, "2026-11-02").days, 2);
});

test("displayDays：中斷顯示 0（FB-09），否則顯示 days", () => {
  const s = { days: 7, lastActiveDate: "2026-10-28" };
  assert.equal(streak.displayDays(s, "2026-10-28"), 7);
  assert.equal(streak.displayDays(s, "2026-10-29"), 7);
  assert.equal(streak.displayDays(s, "2026-10-30"), 0);
  assert.equal(streak.displayDays(s, "2027-01-01"), 0);
  assert.equal(streak.displayDays(EMPTY, "2026-10-30"), 0);
  // 中斷後學習 → 1
  assert.equal(streak.displayDays(streak.touch(s, "2026-10-30"), "2026-10-30"), 1);
});

test("V-ST-07：異常輸入下 days 永不為負", () => {
  const s = streak.touch({ days: -5, lastActiveDate: "2026-10-30" }, "2026-10-20");
  assert.ok(s.days >= 0);
  assert.equal(streak.displayDays({ days: -5, lastActiveDate: "2026-10-30" }, "2026-10-30"), 0);
  // 不合法日期視同未打卡
  assert.deepEqual(streak.touch({ days: 3, lastActiveDate: "2026-02-30" }, "2026-10-30"), {
    days: 1,
    lastActiveDate: "2026-10-30"
  });
  // today 不合法 → 維持原狀
  assert.deepEqual(streak.touch({ days: 3, lastActiveDate: "2026-10-30" }, "bad"), {
    days: 3,
    lastActiveDate: "2026-10-30"
  });
});
