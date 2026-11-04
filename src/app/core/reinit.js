/*
 * core/reinit.js — 切換難易度初始化學習紀錄的純規則（FE-34）
 * 依據：architecture.md v0.5 §7.15（函式表）、§4.6；契約 README §5.2 預設值、§5.7 CI-1～CI-4 與「有學習紀錄」對照表、
 *       §7.7 V-ST-02、V-ST-14；data-schema.ts LEARNING_PROGRESS_FIELDS、PersistedData
 * 涵蓋：US-32、AC-01-07、AC-32-01～AC-32-03、AC-32-05～AC-32-07、AC-32-10
 * 全部純函式、不碰 DOM、不修改傳入值。原子寫入（一次 setItem、失敗不替換記憶體）由 store.confirmApplyGoal 負責（DS-04）。
 * LD-1：載入時只取用 constants；goal、learning 一律在函式內取用（persist.defaultData() 由呼叫端傳入 defaults）。
 * Node 以 require 載入，瀏覽器掛到 EMT.core.reinit。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.EMT = root.EMT || {};
    root.EMT.core = root.EMT.core || {};
    root.EMT.core.reinit = api;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // LD-1：載入時只取 constants（建置保證最先載入）；不存在視為組裝錯誤（LD-3）
  var isNode = typeof require === "function" && typeof module === "object";
  var g = typeof self !== "undefined" ? self : this;
  var C;
  if (isNode) {
    C = require("./constants.js");
  } else {
    C = g && g.EMT && g.EMT.core && g.EMT.core.constants;
  }
  if (!C) throw new Error("EMT.core.reinit：缺少模組 EMT.core.constants");

  var NODE_PATH = { goal: "./goal.js", learning: "./learning.js" };

  /** 其他 core 依賴於呼叫時才取（LD-1）；取不到屬程式組裝錯誤，丟出含模組名稱的 Error（LD-3） */
  function dep(name) {
    if (isNode) {
      return require(NODE_PATH[name]);
    }
    var mod = g && g.EMT && g.EMT.core && g.EMT.core[name];
    if (!mod) {
      throw new Error("[EMT.core.reinit] 找不到 EMT.core." + name);
    }
    return mod;
  }
  function GOAL() { return dep("goal"); }
  function LEARN() { return dep("learning"); }

  var hasOwn = Object.prototype.hasOwnProperty;

  /** 純物件判定：排除 null、陣列、Date 等 */
  function isPlainObject(v) {
    return Object.prototype.toString.call(v) === "[object Object]";
  }

  /** 大於 0 的有限數字（型別不符視為不成立） */
  function isPositive(v) {
    return typeof v === "number" && isFinite(v) && v > 0;
  }

  /** 深複本（PersistedData 皆為 JSON 可表示的值）；不修改來源 */
  function clone(v) {
    if (Array.isArray(v)) {
      return v.map(clone);
    }
    if (v && typeof v === "object") {
      var out = {};
      Object.keys(v).forEach(function (k) {
        out[k] = clone(v[k]);
      });
      return out;
    }
    return v;
  }

  /**
   * 分數的生效色級（V-ST-02）：Color(S) 經藍、金 → 綠。分數不落在任何色級時為 null。
   * @param {number} score
   * @returns {string|null}
   */
  function effectiveOf(score) {
    var G = GOAL();
    var color = G.colorOf(score);
    return color === null ? null : G.effectiveColorOf(color);
  }

  /**
   * 生效色級是否改變（CI-3）：effective(新分數) ≠ 記憶體中的 goal.effectiveColor。
   * 綠 ↔ 藍 ↔ 金、同色級內調分數皆為 false。
   * @param {object} goalState GoalState
   * @param {number} newScore 按「套用」當下的 draftScore
   * @returns {boolean}
   */
  function effectiveChanged(goalState, newScore) {
    var current = isPlainObject(goalState) ? goalState.effectiveColor : undefined;
    return effectiveOf(newScore) !== current;
  }

  /**
   * 「有學習紀錄」(a)～(f) 逐項判斷（CI-2，逐字依契約 §5.7 對照表）。欄位缺漏或型別不符視為該項不成立。
   * (e) 只看 today − 29 ～ today − 1（不看 today，FB-33）。
   * @param {*} data 記憶體中的 PersistedData
   * @param {string} today 本地日期 YYYY-MM-DD
   * @returns {{a: boolean, b: boolean, c: boolean, d: boolean, e: boolean, f: boolean}}
   */
  function recordFlags(data, today) {
    var L = LEARN();
    var d = isPlainObject(data) ? data : {};

    // (a) 已掌握單字數 > 0
    var a = Array.isArray(d.masteredWordKeys) && d.masteredWordKeys.length > 0;

    // (b) 四選一測驗答題數 > 0
    var b = isPlainObject(d.vocabQuiz) && isPositive(d.vocabQuiz.answered);

    // (c) 模擬測驗累計答題數 > 0
    var c = isPlainObject(d.part5) && isPositive(d.part5.totalAnswered);

    // (d) 今日已學數 X > 0（date === today 才算，同 LR-6）
    var t = d.todayLearned;
    var dd = isPlainObject(t) && L.isValidLocalDate(today) && t.date === today &&
      Array.isArray(t.wordKeys) && t.wordKeys.length > 0;

    // (e) 近 30 天歷史（today − 29 ～ today − 1）中至少 1 天字數 > 0
    var e = false;
    var h = d.learnedHistory;
    if (isPlainObject(h) && L.isValidLocalDate(today)) {
      var lo = L.addDays(today, -29);
      var hi = L.addDays(today, -1);
      var keys = Object.keys(h);
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        if (L.isValidLocalDate(k) && L.compareDate(k, lo) >= 0 && L.compareDate(k, hi) <= 0 && isPositive(h[k])) {
          e = true;
          break;
        }
      }
    }

    // (f) 有打卡紀錄
    var s = d.streak;
    var f = isPlainObject(s) && ((hasOwn.call(s, "lastActiveDate") && s.lastActiveDate !== null && s.lastActiveDate !== undefined) ||
      isPositive(s.days));

    return { a: a, b: b, c: c, d: dd, e: e, f: f };
  }

  /**
   * 是否有學習紀錄（CI-2）：(a)～(f) 任一成立。
   * @param {*} data
   * @param {string} today
   * @returns {boolean}
   */
  function hasLearningRecord(data, today) {
    var fl = recordFlags(data, today);
    return fl.a || fl.b || fl.c || fl.d || fl.e || fl.f;
  }

  /**
   * 是否需要跳出確認視窗（CI-1）：生效色級改變且有學習紀錄。
   * @param {*} data 記憶體中的 PersistedData（新分數 = data.goal.draftScore）
   * @param {string} today
   * @returns {boolean}
   */
  function needsConfirm(data, today) {
    if (!isPlainObject(data) || !isPlainObject(data.goal)) {
      return false;
    }
    return effectiveChanged(data.goal, data.goal.draftScore) && hasLearningRecord(data, today);
  }

  /**
   * 建立初始化後的新資料（CI-4，白名單）。回傳新物件，不修改 data、newGoal、defaults。
   * - 先淺複製 data 的全部鍵（customVocab、sttNoticeAcknowledged 與日後新增欄位原值保留）
   * - goal = newGoal 的複本
   * - LEARNING_PROGRESS_FIELDS 欄位（v0.15 起 7 欄，含 part5CorrectIds）= defaults[欄] 的深複本
   *   （defaults 由呼叫端傳入 persist.defaultData()，AC-32-02、AC-45-08）
   * - （v0.15）flashcardPosition = null（CI-4 例外、FP-4、AC-44-08）；part5UnansweredOnly 隨淺複製保留原值
   * defaults 缺少任一欄 → 拋含欄位名的 Error（LD-3：程式組裝錯誤）。
   * @param {object} data 目前的 PersistedData
   * @param {object} newGoal 新套用的 GoalState
   * @param {object} defaults README §5.2 預設值
   * @returns {object} PersistedData
   */
  function buildReinitData(data, newGoal, defaults) {
    var fields = C.LEARNING_PROGRESS_FIELDS;
    if (!isPlainObject(defaults)) {
      throw new Error("[EMT.core.reinit] buildReinitData：defaults 不是物件，缺少欄位 " + fields.join("、"));
    }
    fields.forEach(function (name) {
      if (!hasOwn.call(defaults, name)) {
        throw new Error("[EMT.core.reinit] buildReinitData：defaults 缺少欄位 " + name);
      }
    });
    var src = isPlainObject(data) ? data : {};
    var out = {};
    Object.keys(src).forEach(function (k) {
      out[k] = src[k];
    });
    out.goal = clone(newGoal);
    fields.forEach(function (name) {
      out[name] = clone(defaults[name]);
    });
    // CI-4 例外：生效色級改變 → 單字卡位置回到第 1 張（FP-4），與初始化同一次寫入
    out.flashcardPosition = null;
    return out;
  }

  return Object.freeze({
    effectiveOf: effectiveOf,
    effectiveChanged: effectiveChanged,
    recordFlags: recordFlags,
    hasLearningRecord: hasLearningRecord,
    needsConfirm: needsConfirm,
    buildReinitData: buildReinitData
  });
});
