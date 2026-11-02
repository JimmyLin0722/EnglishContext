/*
 * core/streak.js — 連續打卡（FE-05）
 * 依據：architecture.md §7.4；契約 StreakState 註解、README §7.7 V-ST-07、FB-09
 * 涵蓋：AC-17-02、AC-17-05
 * 純函式，不依賴 DOM 與其他 core 檔；不修改傳入物件。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.EMT = root.EMT || {};
    root.EMT.core = root.EMT.core || {};
    root.EMT.core.streak = api;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var MS_PER_DAY = 86400000;
  var DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

  function pad2(n) {
    return (n < 10 ? "0" : "") + n;
  }

  /**
   * 裝置本地時區的日期字串 "YYYY-MM-DD"（不用 toISOString，避免 UTC 偏移）。
   * @param {Date} [now] 預設為目前時間
   * @returns {string}
   */
  function localDate(now) {
    var d = now instanceof Date ? now : new Date();
    var y = d.getFullYear();
    var ys = String(y);
    while (ys.length < 4) ys = "0" + ys;
    return ys + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }

  /**
   * "YYYY-MM-DD" → 自 1970-01-01 起的日序（以 Date.UTC 計，避開日光節約時間）。格式或日期不合法回 null。
   * @param {string} s
   * @returns {number|null}
   */
  function dayNumber(s) {
    if (typeof s !== "string") return null;
    var m = DATE_RE.exec(s);
    if (!m) return null;
    var y = Number(m[1]);
    var mo = Number(m[2]);
    var d = Number(m[3]);
    var t = Date.UTC(y, mo - 1, d);
    // 驗證沒有溢位（例如 02-30）
    var back = new Date(t);
    if (back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) return null;
    return Math.round(t / MS_PER_DAY);
  }

  /** 取整數且 ≥ 0 的天數（V-ST-07：days 永不為負）。 */
  function safeDays(v) {
    return typeof v === "number" && isFinite(v) && v > 0 ? Math.floor(v) : 0;
  }

  /**
   * 打卡（學習行為發生時呼叫）。回傳新的 StreakState，不修改傳入物件。
   *   lastActiveDate 為 null（或不合法）→ days = 1
   *   today = last → 不變
   *   today = last + 1 → days + 1
   *   today ≥ last + 2 → days = 1
   *   today < last（時鐘調回）→ 不變（AC-17-05）
   *   lastActiveDate 一律設為 max(last, today)
   * @param {{days:number, lastActiveDate:(string|null)}|null} streak
   * @param {string} today 本地日期 "YYYY-MM-DD"
   * @returns {{days:number, lastActiveDate:(string|null)}}
   */
  function touch(streak, today) {
    var days = safeDays(streak && streak.days);
    var last = streak ? streak.lastActiveDate : null;
    var tNum = dayNumber(today);
    var lNum = dayNumber(last);

    // today 不合法：無法判斷，維持原狀
    if (tNum === null) {
      return { days: days, lastActiveDate: lNum === null ? null : last };
    }
    if (lNum === null) {
      return { days: 1, lastActiveDate: today };
    }

    var diff = tNum - lNum;
    if (diff < 0) {
      // 時鐘調回：天數不變、不累加；lastActiveDate 保留較晚者
      return { days: days, lastActiveDate: last };
    }
    if (diff === 0) {
      // 同日不重複累加；異常狀態 days = 0 時補成 1（今天確實有學習）
      return { days: days > 0 ? days : 1, lastActiveDate: last };
    }
    if (diff === 1) {
      return { days: days + 1, lastActiveDate: today };
    }
    return { days: 1, lastActiveDate: today };
  }

  /**
   * 顯示用天數：today ≥ last + 2（已中斷、尚未學習）→ 0；其餘 → days（FB-09）。
   * @param {{days:number, lastActiveDate:(string|null)}|null} streak
   * @param {string} today
   * @returns {number}
   */
  function displayDays(streak, today) {
    var days = safeDays(streak && streak.days);
    var lNum = dayNumber(streak ? streak.lastActiveDate : null);
    var tNum = dayNumber(today);
    if (lNum === null || tNum === null) return days;
    return tNum - lNum >= 2 ? 0 : days;
  }

  return {
    localDate: localDate,
    touch: touch,
    displayDays: displayDays,
    dayNumber: dayNumber
  };
});
