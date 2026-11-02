/*
 * core/learning.js — 今日學習紀錄（FE-20）
 * 依據：architecture.md v0.4 §7.7；契約 README §5.4 LR-1～LR-8、§7.7 V-ST-09～V-ST-12、C-2、C-3；
 *       data-schema.ts TodayLearnedState、LearnedHistory、LEARNED_HISTORY_DAYS、DASHBOARD_CHART_DAYS、COLOR_LEVELS
 * 涵蓋：US-30、AC-30-02、AC-30-03、AC-30-05～AC-30-11、AC-30-13、AC-24-11
 * 全部純函式、不碰 DOM、不修改傳入值；日期一律為本地日期字串 "YYYY-MM-DD"。
 * 載入時只取用 constants、wordkey（LD-1）。Node 以 require 載入，瀏覽器掛到 EMT.core.learning。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.EMT = root.EMT || {};
    root.EMT.core = root.EMT.core || {};
    root.EMT.core.learning = api;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // LD-1：載入時只取 constants、wordkey（建置保證最先載入）；不存在視為組裝錯誤（LD-3）
  var C, WK;
  if (typeof require === "function" && typeof module === "object") {
    C = require("./constants.js");
    WK = require("./wordkey.js");
  } else {
    var g = typeof self !== "undefined" ? self : this;
    var core = g && g.EMT && g.EMT.core;
    C = core && core.constants;
    WK = core && core.wordkey;
  }
  if (!C) throw new Error("EMT.core.learning：缺少模組 EMT.core.constants");
  if (!WK) throw new Error("EMT.core.learning：缺少模組 EMT.core.wordkey");

  var DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
  var DEFAULT_DAILY_GOAL = 15; // 未知色級的防禦值（生效色級只會是橘棕綠）

  var hasOwn = Object.prototype.hasOwnProperty;

  function pad2(n) {
    return (n < 10 ? "0" : "") + n;
  }

  function pad4(n) {
    var s = String(n);
    while (s.length < 4) s = "0" + s;
    return s;
  }

  /** 純物件判定：排除 null、陣列、Date 等（V-ST-10 的「整欄型別錯」）。 */
  function isPlainObject(v) {
    return Object.prototype.toString.call(v) === "[object Object]";
  }

  /**
   * 是否為格式正確且實際存在的本地日期（V-ST-09、V-ST-10）。
   * 以本地 Date 回推年月日相同判定；"2026-02-30" → false。
   * @param {*} s
   * @returns {boolean}
   */
  function isValidLocalDate(s) {
    if (typeof s !== "string") return false;
    var m = DATE_RE.exec(s);
    if (!m) return false;
    var y = Number(m[1]);
    var mo = Number(m[2]);
    var d = Number(m[3]);
    var dt = new Date(2000, 0, 1);
    // 以 setFullYear 設定，避免 new Date(y, …) 把 0～99 年解讀成 1900 年代
    dt.setFullYear(y, mo - 1, d);
    return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d;
  }

  /**
   * 日期加減 n 天。以 Date.UTC 計算日曆日（不以毫秒加減本地時間，避開日光節約時間）。
   * 輸入不是合法日期或 n 不是整數時回 null。
   * @param {string} ymd
   * @param {number} n
   * @returns {string|null}
   */
  function addDays(ymd, n) {
    if (!isValidLocalDate(ymd) || !Number.isInteger(n)) return null;
    var m = DATE_RE.exec(ymd);
    var dt = new Date(0);
    dt.setUTCFullYear(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + n);
    return pad4(dt.getUTCFullYear()) + "-" + pad2(dt.getUTCMonth() + 1) + "-" + pad2(dt.getUTCDate());
  }

  /**
   * 比較兩個日期字串（格式固定，字典序 = 日期序）。
   * @returns {number} a < b → -1；相等 → 0；a > b → 1
   */
  function compareDate(a, b) {
    return a < b ? -1 : a > b ? 1 : 0;
  }

  /** 今日紀錄預設值（契約 §5.2）。每次回傳新物件。 */
  function emptyToday() {
    return { date: null, wordKeys: [] };
  }

  /**
   * V-ST-09：今日紀錄正規化。
   * 非物件、date 不合法或不是 today → 預設值；date = today → wordKeys 只留字串，依 C-2 正規化，捨棄空字串，重複只留第一次。
   * @param {*} t
   * @param {string} today
   * @returns {{date: (string|null), wordKeys: string[]}}
   */
  function normalizeToday(t, today) {
    if (!isPlainObject(t)) return emptyToday();
    if (!isValidLocalDate(t.date) || t.date !== today) return emptyToday();
    var src = Array.isArray(t.wordKeys) ? t.wordKeys : [];
    var seen = Object.create(null);
    var keys = [];
    for (var i = 0; i < src.length; i++) {
      if (typeof src[i] !== "string") continue;
      var k = WK.wordKey(src[i]);
      if (k === "" || seen[k]) continue;
      seen[k] = true;
      keys.push(k);
    }
    return { date: today, wordKeys: keys };
  }

  /**
   * V-ST-10：近 30 天歷史正規化。
   * 非純物件 → {}；只留鍵為合法日期、today − (LEARNED_HISTORY_DAYS − 1) ≤ 鍵 ≤ today、值為整數 ≥ 0 的項目。
   * @param {*} h
   * @param {string} today
   * @returns {Object<string, number>}
   */
  function normalizeHistory(h, today) {
    var out = {};
    if (!isPlainObject(h) || !isValidLocalDate(today)) return out;
    var oldest = addDays(today, -(C.LEARNED_HISTORY_DAYS - 1));
    var keys = Object.keys(h);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var v = h[k];
      if (!isValidLocalDate(k)) continue;
      if (compareDate(k, oldest) < 0 || compareDate(k, today) > 0) continue;
      if (!Number.isInteger(v) || v < 0) continue;
      out[k] = v;
    }
    return out;
  }

  /**
   * V-ST-11：今日紀錄與歷史的一致性（在 V-ST-09、V-ST-10 之後執行）。回傳新物件。
   * t.date = today → h[today] = wordKeys.length；否則刪除 h[today]。
   * @param {{date: (string|null), wordKeys: string[]}} t
   * @param {Object<string, number>} h
   * @param {string} today
   * @returns {Object<string, number>}
   */
  function syncHistory(t, h, today) {
    var out = {};
    var keys = isPlainObject(h) ? Object.keys(h) : [];
    for (var i = 0; i < keys.length; i++) {
      if (keys[i] !== today) out[keys[i]] = h[keys[i]];
    }
    if (t && t.date === today && Array.isArray(t.wordKeys)) {
      out[today] = t.wordKeys.length;
    }
    return out;
  }

  /**
   * 依序 V-ST-09 → V-ST-10 → V-ST-11 正規化資料中的兩欄。
   * @param {*} data PersistedData（可為不完整物件）
   * @param {string} today
   * @returns {{todayLearned: Object, learnedHistory: Object<string, number>}}
   */
  function normalizeLearning(data, today) {
    var src = isPlainObject(data) ? data : {};
    var t = normalizeToday(src.todayLearned, today);
    var h = normalizeHistory(src.learnedHistory, today);
    return { todayLearned: t, learnedHistory: syncHistory(t, h, today) };
  }

  /**
   * LR-3 (1)～(5)：記錄一次學習行為。
   * date ≠ today → 換日為 { date: today, wordKeys: [] }（換日本身不算 changed）；
   * wordKey 先依 C-2 正規化，空字串或已在清單 → changed: false；否則附加、h[today] = 長度並修剪歷史。
   * 回傳的 todayLearned、learnedHistory 一律為新物件，且已符合 V-ST-09～V-ST-11。
   * @param {*} t 目前的 todayLearned
   * @param {*} h 目前的 learnedHistory
   * @param {string} wordKey
   * @param {string} today
   * @returns {{changed: boolean, todayLearned: {date: string, wordKeys: string[]}, learnedHistory: Object<string, number>}}
   */
  function record(t, h, wordKey, today) {
    var base = normalizeToday(t, today);
    // (2) 換日
    var next = { date: today, wordKeys: base.wordKeys.slice() };
    var key = WK.wordKey(wordKey);
    var changed = false;
    // (3) 空字串或已學過 → 不改；(4) 否則附加
    if (key !== "" && next.wordKeys.indexOf(key) === -1) {
      next.wordKeys.push(key);
      changed = true;
    }
    // (4)(5) 歷史同步今日字數並修剪視窗外的鍵
    var hist = syncHistory(next, normalizeHistory(h, today), today);
    return { changed: changed, todayLearned: next, learnedHistory: hist };
  }

  /**
   * LR-6：今日已學數 X。
   * @returns {number}
   */
  function todayCount(t, today) {
    return t && t.date === today && Array.isArray(t.wordKeys) ? t.wordKeys.length : 0;
  }

  /**
   * LR-6：每日目標 D = COLOR_LEVELS 中生效色級的 dailyNewWords；未知色級回 15。
   * @param {string} effectiveColor
   * @returns {number}
   */
  function dailyGoal(effectiveColor) {
    for (var i = 0; i < C.COLOR_LEVELS.length; i++) {
      if (C.COLOR_LEVELS[i].id === effectiveColor) return C.COLOR_LEVELS[i].dailyNewWords;
    }
    return DEFAULT_DAILY_GOAL;
  }

  /**
   * LR-6、AC-30-08：長條圖資料，由舊到新 days 筆；最後一筆（today）一律用 x。
   * label 為不補零的 "M/D"（如 "10/30"）。
   * @param {Object<string, number>} h
   * @param {number} x 今日已學數
   * @param {string} today
   * @param {number} [days] 預設 DASHBOARD_CHART_DAYS
   * @returns {{date: string, label: string, count: number}[]}
   */
  function chartSeries(h, x, today, days) {
    var n = Number.isInteger(days) && days > 0 ? days : C.DASHBOARD_CHART_DAYS;
    var src = isPlainObject(h) ? h : {};
    var out = [];
    for (var i = 0; i < n; i++) {
      var date = addDays(today, -(n - 1 - i));
      if (date === null) return [];
      var count;
      if (i === n - 1) {
        count = Number.isInteger(x) && x >= 0 ? x : 0;
      } else {
        var v = hasOwn.call(src, date) ? src[date] : 0;
        count = Number.isInteger(v) && v >= 0 ? v : 0;
      }
      var m = DATE_RE.exec(date);
      out.push({ date: date, label: Number(m[2]) + "/" + Number(m[3]), count: count });
    }
    return out;
  }

  /**
   * AC-30-10、R-09：目前單字集掌握率。只計單字集內、wordKey 屬於已掌握清單的張數。
   * @param {{wordKey: string}[]} studySet
   * @param {string[]|Set<string>} masteredKeys
   * @returns {{numer: number, denom: number, percent: (number|null)}}
   */
  function masteryRate(studySet, masteredKeys) {
    var set = Array.isArray(studySet) ? studySet : [];
    var mastered = Object.create(null);
    if (masteredKeys && typeof masteredKeys.forEach === "function") {
      masteredKeys.forEach(function (k) {
        if (typeof k === "string") mastered[k] = true;
      });
    }
    var numer = 0;
    for (var i = 0; i < set.length; i++) {
      var card = set[i];
      if (card && typeof card.wordKey === "string" && mastered[card.wordKey]) numer++;
    }
    var denom = set.length;
    return { numer: numer, denom: denom, percent: denom === 0 ? null : Math.round((numer / denom) * 100) };
  }

  /**
   * AC-30-10、AC-17-04：百分比。answered 不是正整數 → null；結果夾在 0～100。
   * @param {number} correct
   * @param {number} answered
   * @returns {number|null}
   */
  function percentOf(correct, answered) {
    if (!Number.isInteger(answered) || answered <= 0) return null;
    if (typeof correct !== "number" || !isFinite(correct)) return null;
    var p = Math.round((correct / answered) * 100);
    return Math.min(100, Math.max(0, p));
  }

  return Object.freeze({
    isValidLocalDate: isValidLocalDate,
    addDays: addDays,
    compareDate: compareDate,
    emptyToday: emptyToday,
    normalizeToday: normalizeToday,
    normalizeHistory: normalizeHistory,
    syncHistory: syncHistory,
    normalizeLearning: normalizeLearning,
    record: record,
    todayCount: todayCount,
    dailyGoal: dailyGoal,
    chartSeries: chartSeries,
    masteryRate: masteryRate,
    percentOf: percentOf
  });
});
