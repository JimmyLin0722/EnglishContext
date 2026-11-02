/*
 * EMT.core.persist — 持久化預設值、StorageRecord 驗證與遷移（FE-06；architecture.md §7.5；FE-22 v0.8 升版 §7.8）
 * 依據：契約 README §5.2、§5.3（MG-1～MG-4、RD-1、RD-2）、§7.7 V-ST-01～05、V-ST-09～V-ST-11；
 *       storage-schema.json（schemaVersion 2；1 只作為遷移輸入）。
 * 不引入 JSON Schema 套件，手寫驗證逐欄對照 storage-schema.json：
 *   型別、必填、additionalProperties: false、enum／const、pattern、整數範圍、uniqueItems、if/then/else，
 *   另加跨欄位規則 V-ST-03。
 * 本模組為純函式，不碰 DOM、不讀寫 localStorage（實際存取由 store 負責）。
 * Node 以 require 載入，瀏覽器掛到 EMT.core.persist。
 * 載入時只取用 constants、wordkey（LD-1）；goal、learning 於函式被呼叫時才取用，取不到時丟出含模組名稱的錯誤（LD-3）。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.EMT = root.EMT || {};
    root.EMT.core = root.EMT.core || {};
    root.EMT.core.persist = api;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // 取得依賴模組：Node 下 require，瀏覽器下讀 EMT.core.*
  // LD-1：載入時只取 constants、wordkey（建置保證最先載入）
  var isNode = typeof require === "function" && typeof module === "object";
  var g = typeof self !== "undefined" ? self : this;
  var C, WK;
  if (isNode) {
    C = require("./constants.js");
    WK = require("./wordkey.js");
  } else {
    C = g.EMT.core.constants;
    WK = g.EMT.core.wordkey;
  }
  var NODE_PATH = { goal: "./goal.js", learning: "./learning.js" };

  /** 其他 core 依賴於呼叫時才取（LD-1）；取不到屬程式組裝錯誤，丟出含模組名稱的 Error（LD-3） */
  function dep(name) {
    if (isNode) {
      return require(NODE_PATH[name]);
    }
    var mod = g && g.EMT && g.EMT.core && g.EMT.core[name];
    if (!mod) {
      throw new Error("[EMT.core.persist] 找不到 EMT.core." + name);
    }
    return mod;
  }
  function GOAL() { return dep("goal"); }
  function LEARN() { return dep("learning"); }

  // ── storage-schema.json 的列舉與樣式（逐字對照）──
  var COLOR_LEVEL_ENUM = ["orange", "brown", "green", "blue", "gold"];
  var OPEN_COLOR_ENUM = ["orange", "brown", "green"];
  var ORIGIN_ENUM = ["manual", "template"];
  var TEMPLATE_ID_ENUM = ["cs", "business", "biostat"];
  var PHASE_ENUM = ["question", "summary"];
  var OPTION_INDEX_ENUM = [0, 1, 2, 3];
  var LOCAL_DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
  var CUSTOM_ID_RE = /^c_[A-Za-z0-9_-]{1,64}$/;
  var NON_BLANK_RE = /\S/;
  // format: date-time（RFC 3339）；另以 Date.parse 確認可解析
  var DATE_TIME_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])[Tt]([01]\d|2[0-3]):[0-5]\d:([0-5]\d|60)(\.\d+)?([Zz]|[+-]([01]\d|2[0-3]):[0-5]\d)$/;

  // 各物件的欄位清單（同時作為 required 與 additionalProperties 的依據）
  var RECORD_KEYS = ["schemaVersion", "savedAt", "data"];
  // v0.8（schemaVersion 2）：必填 7 欄 → 9 欄
  var DATA_KEYS = ["goal", "customVocab", "masteredWordKeys", "vocabQuiz", "part5", "streak", "sttNoticeAcknowledged", "todayLearned", "learnedHistory"];
  // v1 的 7 個欄位（遷移時原值不動，MG-2）
  var V1_DATA_KEYS = DATA_KEYS.slice(0, 7);
  var GOAL_KEYS = ["draftScore", "appliedScore", "appliedColor", "effectiveColor"];
  var CUSTOM_KEYS = ["id", "word", "meaning", "phonetic", "pos", "collocation", "example", "academicContext", "origin", "templateId", "createdAt"];
  var QUIZ_KEYS = ["answered", "correct"];
  var PART5_KEYS = ["currentIndex", "lockedSelection", "phase", "roundAnswered", "roundCorrect", "totalAnswered", "totalCorrect"];
  var STREAK_KEYS = ["days", "lastActiveDate"];
  var TODAY_KEYS = ["date", "wordKeys"];

  // ── 共用小工具 ──

  function hasOwn(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

  function isPlainObject(v) {
    return typeof v === "object" && v !== null && !Array.isArray(v);
  }

  function isInteger(v) {
    return typeof v === "number" && Number.isInteger(v);
  }

  function isCount(v) {
    return isInteger(v) && v >= 0;
  }

  function isScore(v) {
    return isInteger(v) && v >= C.SCORE_MIN && v <= C.SCORE_MAX && v % C.SCORE_STEP === 0;
  }

  function isNonBlank(v) {
    return typeof v === "string" && NON_BLANK_RE.test(v);
  }

  function isDateTime(v) {
    return typeof v === "string" && DATE_TIME_RE.test(v) && !isNaN(Date.parse(v));
  }

  function inEnum(v, list) {
    return list.indexOf(v) !== -1;
  }

  /** JSON 相容資料的深拷貝（PersistedData 只含 JSON 值） */
  function clone(v) {
    return JSON.parse(JSON.stringify(v));
  }

  /** 是否為格式正確且實際存在的本地日期（V-ST-09、V-ST-10；與 learning.isValidLocalDate 相同規則） */
  function isRealLocalDate(s) {
    if (typeof s !== "string" || !LOCAL_DATE_RE.test(s)) { return false; }
    var y = Number(s.slice(0, 4));
    var mo = Number(s.slice(5, 7));
    var d = Number(s.slice(8, 10));
    var dt = new Date(2000, 0, 1);
    // 以 setFullYear 設定，避免 0～99 年被解讀成 1900 年代
    dt.setFullYear(y, mo - 1, d);
    return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d;
  }

  /** 裝置本地日期 YYYY-MM-DD（C-3；不用 toISOString，避免 UTC 偏移） */
  function localDate(now) {
    var d = now instanceof Date && !isNaN(now.getTime()) ? now : new Date();
    var ys = String(d.getFullYear());
    while (ys.length < 4) { ys = "0" + ys; }
    var m = d.getMonth() + 1;
    var day = d.getDate();
    return ys + "-" + (m < 10 ? "0" : "") + m + "-" + (day < 10 ? "0" : "") + day;
  }

  /** today 參數：合法日期字串原樣使用，否則以本地今天計 */
  function resolveToday(today) {
    return isRealLocalDate(today) ? today : localDate();
  }

  /** 今日紀錄預設值（README §5.2）。每次回傳新物件。 */
  function emptyToday() {
    return { date: null, wordKeys: [] };
  }

  /**
   * 遷移表：MIGRATIONS[v] = function (data_v) → data_(v+1)（README §5.3；localStorage 與備份匯入共用）。
   * 1 → 2（MG-1、MG-2）：data 必須是純物件，否則丟出例外（呼叫端分別判為 unreadable／format）；
   *   todayLearned、learnedHistory 一律覆寫為預設值（v1 內即使有這兩鍵也不採用），
   *   其餘 7 欄原值不動、不重算、不清理。回傳新物件，不修改傳入值。
   */
  var MIGRATIONS = Object.freeze({
    1: function (data) {
      if (!isPlainObject(data)) {
        throw new TypeError("MG-1：schemaVersion 1 的 data 不是物件");
      }
      var out = clone(data);
      out.todayLearned = emptyToday();
      out.learnedHistory = {};
      return out;
    }
  });

  /**
   * 檢查物件的必填欄位與多餘欄位（required + additionalProperties: false）。
   * 錯誤以「路徑: 說明」字串推入 errors。回傳 false 表示不是物件。
   */
  function checkShape(obj, keys, path, errors) {
    if (!isPlainObject(obj)) {
      errors.push(path + ": 必須是物件");
      return false;
    }
    keys.forEach(function (k) {
      if (!hasOwn(obj, k)) {
        errors.push(path + "." + k + ": 缺少必填欄位");
      }
    });
    Object.keys(obj).forEach(function (k) {
      if (keys.indexOf(k) === -1) {
        errors.push(path + "." + k + ": 不允許的欄位");
      }
    });
    return true;
  }

  function check(ok, path, message, errors) {
    if (!ok) {
      errors.push(path + ": " + message);
    }
  }

  // ── 各 $defs 的驗證 ──

  function validateGoal(goal, path, errors) {
    if (!checkShape(goal, GOAL_KEYS, path, errors)) { return; }
    if (hasOwn(goal, "draftScore")) { check(isScore(goal.draftScore), path + ".draftScore", "須為 10～990 的 5 的倍數整數", errors); }
    if (hasOwn(goal, "appliedScore")) { check(isScore(goal.appliedScore), path + ".appliedScore", "須為 10～990 的 5 的倍數整數", errors); }
    if (hasOwn(goal, "appliedColor")) { check(inEnum(goal.appliedColor, COLOR_LEVEL_ENUM), path + ".appliedColor", "不在 ColorLevel 列舉", errors); }
    if (hasOwn(goal, "effectiveColor")) { check(inEnum(goal.effectiveColor, OPEN_COLOR_ENUM), path + ".effectiveColor", "不在 OpenColorLevel 列舉", errors); }
  }

  function validateCustomItem(item, path, errors) {
    if (!checkShape(item, CUSTOM_KEYS, path, errors)) { return; }
    if (hasOwn(item, "id")) { check(typeof item.id === "string" && CUSTOM_ID_RE.test(item.id), path + ".id", "格式須為 c_[A-Za-z0-9_-]{1,64}", errors); }
    if (hasOwn(item, "word")) { check(isNonBlank(item.word), path + ".word", "須為非空字串", errors); }
    if (hasOwn(item, "meaning")) { check(isNonBlank(item.meaning), path + ".meaning", "須為非空字串", errors); }
    ["phonetic", "pos", "collocation", "example", "academicContext"].forEach(function (k) {
      if (hasOwn(item, k)) { check(typeof item[k] === "string", path + "." + k, "須為字串", errors); }
    });
    if (hasOwn(item, "origin")) { check(inEnum(item.origin, ORIGIN_ENUM), path + ".origin", "不在 manual／template 列舉", errors); }
    if (hasOwn(item, "templateId")) {
      // 列舉 + if/then/else：template → 範本代碼；其他 → null
      var tid = item.templateId;
      check(tid === null || inEnum(tid, TEMPLATE_ID_ENUM), path + ".templateId", "不在列舉", errors);
      if (item.origin === "template") {
        check(inEnum(tid, TEMPLATE_ID_ENUM), path + ".templateId", "origin 為 template 時須為範本代碼", errors);
      } else {
        check(tid === null, path + ".templateId", "origin 非 template 時須為 null", errors);
      }
    }
    if (hasOwn(item, "createdAt")) { check(isDateTime(item.createdAt), path + ".createdAt", "須為 ISO 8601 日期時間", errors); }
  }

  function validateQuiz(q, path, errors) {
    if (!checkShape(q, QUIZ_KEYS, path, errors)) { return; }
    if (hasOwn(q, "answered")) { check(isCount(q.answered), path + ".answered", "須為 ≥ 0 的整數", errors); }
    if (hasOwn(q, "correct")) { check(isCount(q.correct), path + ".correct", "須為 ≥ 0 的整數", errors); }
    // V-ST-03
    if (isCount(q.answered) && isCount(q.correct)) {
      check(q.correct <= q.answered, path + ".correct", "V-ST-03：correct 不得大於 answered", errors);
    }
  }

  function validatePart5(p, path, errors) {
    if (!checkShape(p, PART5_KEYS, path, errors)) { return; }
    ["currentIndex", "roundAnswered", "roundCorrect", "totalAnswered", "totalCorrect"].forEach(function (k) {
      if (hasOwn(p, k)) { check(isCount(p[k]), path + "." + k, "須為 ≥ 0 的整數", errors); }
    });
    if (hasOwn(p, "lockedSelection")) {
      check(p.lockedSelection === null || inEnum(p.lockedSelection, OPTION_INDEX_ENUM), path + ".lockedSelection", "須為 0～3 或 null", errors);
    }
    if (hasOwn(p, "phase")) { check(inEnum(p.phase, PHASE_ENUM), path + ".phase", "不在 question／summary 列舉", errors); }
    // V-ST-03：roundCorrect ≤ roundAnswered ≤ totalAnswered；totalCorrect ≤ totalAnswered
    if (isCount(p.roundCorrect) && isCount(p.roundAnswered)) {
      check(p.roundCorrect <= p.roundAnswered, path + ".roundCorrect", "V-ST-03：roundCorrect 不得大於 roundAnswered", errors);
    }
    if (isCount(p.roundAnswered) && isCount(p.totalAnswered)) {
      check(p.roundAnswered <= p.totalAnswered, path + ".roundAnswered", "V-ST-03：roundAnswered 不得大於 totalAnswered", errors);
    }
    if (isCount(p.totalCorrect) && isCount(p.totalAnswered)) {
      check(p.totalCorrect <= p.totalAnswered, path + ".totalCorrect", "V-ST-03：totalCorrect 不得大於 totalAnswered", errors);
    }
  }

  function validateStreak(s, path, errors) {
    if (!checkShape(s, STREAK_KEYS, path, errors)) { return; }
    if (hasOwn(s, "days")) { check(isCount(s.days), path + ".days", "須為 ≥ 0 的整數", errors); }
    if (hasOwn(s, "lastActiveDate")) {
      var d = s.lastActiveDate;
      check(d === null || (typeof d === "string" && LOCAL_DATE_RE.test(d)), path + ".lastActiveDate", "須為 YYYY-MM-DD 或 null", errors);
    }
  }

  /**
   * $defs/TodayLearnedState（shape）：純物件、恰有 date、wordKeys 兩鍵；date 為字串或 null；wordKeys 為陣列。
   * 項目內容（日期是否合法、是否為今天、wordKeys 各項）不在此檢查（V-ST-09）。
   * @param {*} t
   * @returns {boolean}
   */
  function isTodayLearnedShape(t) {
    if (!isPlainObject(t)) { return false; }
    if (Object.keys(t).length !== TODAY_KEYS.length || !hasOwn(t, "date") || !hasOwn(t, "wordKeys")) { return false; }
    return (t.date === null || typeof t.date === "string") && Array.isArray(t.wordKeys);
  }

  /**
   * $defs/LearnedHistory（shape）：純物件（陣列、null、字串、數字等皆不符）。項目內容由 V-ST-10 正規化。
   * @param {*} h
   * @returns {boolean}
   */
  function isLearnedHistoryShape(h) {
    return isPlainObject(h);
  }

  /**
   * 驗證 todayLearned。
   * - 一律檢查 shape（$defs/TodayLearnedState）
   * - written = true 時另檢查 $defs/TodayLearnedStateNormalized：date 為實際存在的日期或 null；
   *   wordKeys 為不重複、非空白、已依 C-2 正規化的字串；date 為 null 時 wordKeys 必須為空。
   *   有 today 時另檢查 V-ST-09：date 非 null 時必須等於 today。
   */
  function validateTodayLearned(t, path, written, today, errors) {
    if (!isTodayLearnedShape(t)) {
      errors.push(path + ": 不符 TodayLearnedState（須為恰含 date〔字串或 null〕、wordKeys〔陣列〕的物件）");
      return;
    }
    if (!written) { return; }
    if (t.date !== null) {
      check(isRealLocalDate(t.date), path + ".date", "須為實際存在的 YYYY-MM-DD 或 null", errors);
      if (today !== undefined) {
        check(t.date === today, path + ".date", "V-ST-09：須為今天（" + today + "）或 null", errors);
      }
    } else {
      check(t.wordKeys.length === 0, path + ".wordKeys", "date 為 null 時須為空陣列", errors);
    }
    var seen = Object.create(null);
    t.wordKeys.forEach(function (k, i) {
      var p = path + ".wordKeys[" + i + "]";
      if (!isNonBlank(k)) {
        errors.push(p + ": 須為非空字串");
        return;
      }
      check(!seen[k], p, "重複（uniqueItems）", errors);
      seen[k] = true;
      check(WK.wordKey(k) === k, p, "V-ST-09：不是 wordKey 正規化形式", errors);
    });
  }

  /**
   * 驗證 learnedHistory。
   * - 一律檢查 shape（$defs/LearnedHistory：純物件）
   * - written = true 時另檢查 $defs/LearnedHistoryNormalized：鍵為實際存在的日期、值為 ≥ 0 的整數、最多 30 筆；
   *   有 today 時另檢查 V-ST-10（鍵落在 [today − 29 天, today]）與 V-ST-11（與 todayLearned 一致）。
   */
  function validateLearnedHistory(h, todayLearned, path, written, today, errors) {
    if (!isLearnedHistoryShape(h)) {
      errors.push(path + ": 不符 LearnedHistory（須為物件）");
      return;
    }
    if (!written) { return; }
    var keys = Object.keys(h);
    check(keys.length <= C.LEARNED_HISTORY_DAYS, path, "最多 " + C.LEARNED_HISTORY_DAYS + " 筆（maxProperties）", errors);
    var oldest = today !== undefined ? LEARN().addDays(today, -(C.LEARNED_HISTORY_DAYS - 1)) : null;
    keys.forEach(function (k) {
      var p = path + "[" + JSON.stringify(k) + "]";
      check(isRealLocalDate(k), p, "鍵須為實際存在的 YYYY-MM-DD", errors);
      check(isCount(h[k]), p, "值須為 ≥ 0 的整數", errors);
      if (oldest !== null && isRealLocalDate(k)) {
        check(k >= oldest && k <= today, p, "V-ST-10：日期須在 " + oldest + "～" + today, errors);
      }
    });
    if (today !== undefined && isTodayLearnedShape(todayLearned)) {
      // V-ST-11：今天有紀錄 → h[today] = wordKeys.length；否則不得有今天的鍵
      var tp = path + "[" + JSON.stringify(today) + "]";
      if (todayLearned.date === today) {
        check(h[today] === todayLearned.wordKeys.length, tp, "V-ST-11：須等於今日已學數", errors);
      } else {
        check(!hasOwn(h, today), tp, "V-ST-11：今天無紀錄時不得有今天的鍵", errors);
      }
    }
  }

  /**
   * 驗證 PersistedData（storage-schema.json $defs/PersistedData + V-ST-03）。
   * @param {*} data
   * @param {{allowCustomDuplicates?: boolean, written?: boolean, today?: string}} [opts]
   *   allowCustomDuplicates = true 時不檢查 customVocab 的 id／wordKey 重複：
   *   供匯入步驟 5 使用，重複項目交由步驟 7 清理（略過或重新產生 id），見回饋上游。
   *   written = true 時 todayLearned、learnedHistory 以 $defs/PersistedDataWritten 的正規化格式驗證
   *   （程式寫出的 data：localStorage 寫入、匯出備份）；否則只檢查 shape（讀取、匯入步驟 5）。
   *   today（合法的 YYYY-MM-DD，只在 written 時使用）：另檢查 V-ST-09～V-ST-11 中與今天相關的規則。
   * @returns {{ok: boolean, errors: string[]}}
   */
  function validatePersistedData(data, opts) {
    var errors = [];
    var allowDup = !!(opts && opts.allowCustomDuplicates);
    var written = !!(opts && opts.written);
    var today = opts && isRealLocalDate(opts.today) ? opts.today : undefined;
    var path = "data";
    if (!checkShape(data, DATA_KEYS, path, errors)) {
      return { ok: false, errors: errors };
    }
    if (hasOwn(data, "goal")) { validateGoal(data.goal, path + ".goal", errors); }

    if (hasOwn(data, "customVocab")) {
      if (!Array.isArray(data.customVocab)) {
        errors.push(path + ".customVocab: 必須是陣列");
      } else {
        var ids = Object.create(null);
        var keys = Object.create(null);
        data.customVocab.forEach(function (item, i) {
          var p = path + ".customVocab[" + i + "]";
          validateCustomItem(item, p, errors);
          if (allowDup || !isPlainObject(item)) { return; }
          // V-ST-03：id 不重複、wordKey 不重複
          if (typeof item.id === "string") {
            check(!ids[item.id], p + ".id", "V-ST-03：id 重複", errors);
            ids[item.id] = true;
          }
          if (typeof item.word === "string") {
            var k = WK.wordKey(item.word);
            check(!keys[k], p + ".word", "V-ST-03：wordKey 重複", errors);
            keys[k] = true;
          }
        });
      }
    }

    if (hasOwn(data, "masteredWordKeys")) {
      if (!Array.isArray(data.masteredWordKeys)) {
        errors.push(path + ".masteredWordKeys: 必須是陣列");
      } else {
        var seen = Object.create(null);
        data.masteredWordKeys.forEach(function (k, i) {
          var p = path + ".masteredWordKeys[" + i + "]";
          if (!isNonBlank(k)) {
            errors.push(p + ": 須為非空字串");
            return;
          }
          // uniqueItems
          check(!seen[k], p, "重複（uniqueItems）", errors);
          seen[k] = true;
          // V-ST-03：已是 wordKey 正規化形式
          check(WK.wordKey(k) === k, p, "V-ST-03：不是 wordKey 正規化形式", errors);
        });
      }
    }

    if (hasOwn(data, "vocabQuiz")) { validateQuiz(data.vocabQuiz, path + ".vocabQuiz", errors); }
    if (hasOwn(data, "part5")) { validatePart5(data.part5, path + ".part5", errors); }
    if (hasOwn(data, "streak")) { validateStreak(data.streak, path + ".streak", errors); }
    if (hasOwn(data, "sttNoticeAcknowledged")) {
      check(typeof data.sttNoticeAcknowledged === "boolean", path + ".sttNoticeAcknowledged", "須為布林值", errors);
    }
    // v0.8：今日已學紀錄與近 30 天歷史
    if (hasOwn(data, "todayLearned")) {
      validateTodayLearned(data.todayLearned, path + ".todayLearned", written, today, errors);
    }
    if (hasOwn(data, "learnedHistory")) {
      validateLearnedHistory(data.learnedHistory, data.todayLearned, path + ".learnedHistory", written, today, errors);
    }
    return { ok: errors.length === 0, errors: errors };
  }

  /**
   * 驗證 StorageRecord（storage-schema.json 根結構，V-ST-01 + V-ST-03）。
   * schemaVersion 依 schema 為 const = CURRENT_SCHEMA_VERSION（2；v1 須先遷移再驗證）。
   * @param {*} record
   * @returns {{ok: boolean, errors: string[]}}
   */
  function validateStorageRecord(record) {
    var errors = [];
    if (!checkShape(record, RECORD_KEYS, "record", errors)) {
      return { ok: false, errors: errors };
    }
    if (hasOwn(record, "schemaVersion")) {
      check(record.schemaVersion === C.CURRENT_SCHEMA_VERSION, "record.schemaVersion", "須為 " + C.CURRENT_SCHEMA_VERSION, errors);
    }
    if (hasOwn(record, "savedAt")) {
      check(isDateTime(record.savedAt), "record.savedAt", "須為 ISO 8601 日期時間", errors);
    }
    if (hasOwn(record, "data")) {
      errors = errors.concat(validatePersistedData(record.data).errors);
    }
    return { ok: errors.length === 0, errors: errors };
  }

  /**
   * 預設值（契約 README §5.2，AC-18-02）。每次回傳新物件。
   * @returns {object} PersistedData
   */
  function defaultData() {
    var score = C.SCORE_DEFAULT;
    var color = GOAL().colorOf(score);
    return {
      goal: { draftScore: score, appliedScore: score, appliedColor: color, effectiveColor: GOAL().effectiveColorOf(color) },
      customVocab: [],
      masteredWordKeys: [],
      vocabQuiz: { answered: 0, correct: 0 },
      part5: { currentIndex: 0, lockedSelection: null, phase: "question", roundAnswered: 0, roundCorrect: 0, totalAnswered: 0, totalCorrect: 0 },
      streak: { days: 0, lastActiveDate: null },
      sttNoticeAcknowledged: false,
      todayLearned: emptyToday(),
      learnedHistory: {}
    };
  }

  /**
   * 讀取成功後的正規化（README §5.3「成功讀取後」）。回傳新物件，不修改傳入值。
   * - V-ST-02：以 appliedScore 重算 appliedColor、effectiveColor 覆蓋（AC-01-04）
   * - V-ST-05：part5.currentIndex ≥ 題庫長度 → currentIndex 0、lockedSelection null、phase "question"（AC-11-05）
   *   part5Length 不是 ≥ 0 的整數（呼叫端無法取得題庫長度）時不做 V-ST-05。
   * - （v0.8）V-ST-09～V-ST-11：以 learning.normalizeLearning(data, today) 正規化 todayLearned、learnedHistory
   *   （結果符合 $defs/PersistedDataWritten 的兩欄；只改記憶體，RD-2）
   * 傳入資料應已通過 validatePersistedData。
   * @param {object} data PersistedData
   * @param {number} part5Length 模擬測驗題庫長度
   * @param {string} [today] 本地日期 YYYY-MM-DD；缺省或不合法時以本地今天計
   * @returns {object} PersistedData
   */
  function normalizeAfterLoad(data, part5Length, today) {
    var out = clone(data);
    var color = GOAL().colorOf(out.goal.appliedScore);
    out.goal.appliedColor = color;
    out.goal.effectiveColor = GOAL().effectiveColorOf(color);
    if (isCount(part5Length) && out.part5.currentIndex >= part5Length) {
      out.part5.currentIndex = 0;
      out.part5.lockedSelection = null;
      out.part5.phase = "question";
    }
    var learned = LEARN().normalizeLearning(out, resolveToday(today));
    out.todayLearned = learned.todayLearned;
    out.learnedHistory = learned.learnedHistory;
    return out;
  }

  /**
   * RD-1：schemaVersion 2 的 data 中 todayLearned、learnedHistory 缺少或 shape 不符 → 只把該欄設為預設值。
   * 不修改傳入值；data 不是純物件時原樣回傳（交由後續驗證判為無法讀取）。
   * @param {*} data
   * @returns {{data: *, fieldsReset: string[]}}
   */
  function resetLearningFields(data) {
    if (!isPlainObject(data)) { return { data: data, fieldsReset: [] }; }
    var out = clone(data);
    var reset = [];
    if (!hasOwn(out, "todayLearned") || !isTodayLearnedShape(out.todayLearned)) {
      out.todayLearned = emptyToday();
      reset.push("todayLearned");
    }
    if (!hasOwn(out, "learnedHistory") || !isLearnedHistoryShape(out.learnedHistory)) {
      out.learnedHistory = {};
      reset.push("learnedHistory");
    }
    return { data: out, fieldsReset: reset };
  }

  /**
   * 依 MIGRATIONS 把記錄由舊版逐版遷移到 CURRENT_SCHEMA_VERSION（README §5.3；localStorage 與備份檔共用）。
   * 不修改傳入值。schemaVersion 不是整數、不在 SUPPORTED_SCHEMA_VERSIONS、大於目前版本、
   * 缺少遷移函式或遷移函式丟出例外（例如 MG-1 的 data 不是物件）→ ok: false。
   * @param {{schemaVersion: number, data: object}} record 至少含 schemaVersion 與 data
   * @returns {{ok: true, record: object, migrated: boolean} | {ok: false}}
   */
  function migrate(record) {
    try {
      if (!isPlainObject(record) || !isInteger(record.schemaVersion)) { return { ok: false }; }
      var v = record.schemaVersion;
      if (v > C.CURRENT_SCHEMA_VERSION || C.SUPPORTED_SCHEMA_VERSIONS.indexOf(v) === -1) { return { ok: false }; }
      var out = clone(record);
      var migrated = false;
      while (out.schemaVersion < C.CURRENT_SCHEMA_VERSION) {
        var fn = MIGRATIONS[out.schemaVersion];
        if (typeof fn !== "function") { return { ok: false }; }
        out.data = fn(out.data);
        out.schemaVersion += 1;
        migrated = true;
      }
      return { ok: true, record: out, migrated: migrated };
    } catch (e) {
      return { ok: false };
    }
  }

  /**
   * 解析 localStorage 主鍵的原始字串（README §5.3、AC-18-02、AC-18-05；architecture.md §7.8 流程圖）。
   * 對任何使用者輸入都不拋例外（依賴模組缺漏屬組裝錯誤，依 LD-3 照常丟出）。
   * - null／undefined（鍵不存在）→ kind "missing"，data = 預設值
   * - JSON 失敗、頂層不是物件、schemaVersion 缺失／非整數／不在 [1, 2]、data 不是物件、
   *   遷移或 RD-1 後仍不符 Schema、違反 V-ST-03
   *   → kind "unreadable"，data = 預設值（呼叫端把原字串寫入 STORAGE_KEYS.unreadable 並提示）
   * - schemaVersion 1 → 依 MG-1、MG-2 遷移後以 v2 完整驗證；通過 → kind "ok"、migrated = true
   *   （呼叫端依 MG-3 寫回一次，失敗不提示）
   * - schemaVersion 2 → RD-1 只重設缺少或 shape 不符的 todayLearned／learnedHistory，再完整驗證；
   *   通過 → kind "ok"、migrated = false、fieldsReset 列出被重設的欄位（不提示、不保存 unreadable）
   * 回傳的 data 尚未做 normalizeAfterLoad。
   * @param {string|null|undefined} rawString
   * @returns {{kind: "missing"|"ok"|"unreadable", data: object, migrated?: boolean,
   *           fieldsReset?: string[], errors?: string[]}}
   */
  function parseStored(rawString) {
    // 依賴缺漏屬程式組裝錯誤，先在 try 之外取用，避免被誤判為資料無法讀取（LD-3）
    GOAL(); LEARN();
    if (rawString === null || rawString === undefined) {
      return { kind: "missing", data: defaultData() };
    }
    try {
      if (typeof rawString !== "string") {
        return unreadable(["原始值不是字串"]);
      }
      var parsed;
      try {
        parsed = JSON.parse(rawString);
      } catch (e) {
        return unreadable(["JSON 解析失敗"]);
      }
      if (!isPlainObject(parsed)) {
        return unreadable(["頂層不是物件"]);
      }
      if (!hasOwn(parsed, "schemaVersion") || !isInteger(parsed.schemaVersion)) {
        return unreadable(["schemaVersion 缺失或非整數"]);
      }
      if (C.SUPPORTED_SCHEMA_VERSIONS.indexOf(parsed.schemaVersion) === -1) {
        return unreadable(["schemaVersion " + parsed.schemaVersion + " 不支援"]);
      }
      if (!isPlainObject(parsed.data)) {
        // MG-1（v1）與 v2 皆同：data 不是物件 → 無法讀取
        return unreadable(["data 不是物件"]);
      }
      var m = migrate(parsed);
      if (!m.ok) {
        return unreadable(["schemaVersion " + parsed.schemaVersion + " 遷移失敗"]);
      }
      var rec = m.record;
      var fieldsReset = [];
      if (!m.migrated) {
        // RD-1：只適用 schemaVersion 2（v1 遷移後兩欄必為預設值）
        var rd = resetLearningFields(rec.data);
        rec.data = rd.data;
        fieldsReset = rd.fieldsReset;
      }
      var result = validateStorageRecord(rec);
      if (!result.ok) {
        return unreadable(result.errors);
      }
      return { kind: "ok", data: rec.data, migrated: m.migrated, fieldsReset: fieldsReset };
    } catch (e) {
      return unreadable(["未預期的錯誤"]);
    }
  }

  function unreadable(errors) {
    return { kind: "unreadable", data: defaultData(), errors: errors };
  }

  /**
   * 組成要寫入 localStorage 的 StorageRecord（呼叫端以一次 setItem 寫入 JSON.stringify 結果）。
   * schemaVersion 一律為目前版本 2（MG-4）。
   * @param {object} data PersistedData
   * @param {Date} [now]
   * @returns {{schemaVersion: number, savedAt: string, data: object}}
   */
  function buildRecord(data, now) {
    var t = now instanceof Date ? now : new Date();
    return { schemaVersion: C.CURRENT_SCHEMA_VERSION, savedAt: t.toISOString(), data: data };
  }

  return Object.freeze({
    MIGRATIONS: MIGRATIONS,
    DATA_KEYS: Object.freeze(DATA_KEYS.slice()),
    V1_DATA_KEYS: Object.freeze(V1_DATA_KEYS.slice()),
    defaultData: defaultData,
    emptyToday: emptyToday,
    isTodayLearnedShape: isTodayLearnedShape,
    isLearnedHistoryShape: isLearnedHistoryShape,
    resetLearningFields: resetLearningFields,
    localDate: localDate,
    validatePersistedData: validatePersistedData,
    validateStorageRecord: validateStorageRecord,
    normalizeAfterLoad: normalizeAfterLoad,
    migrate: migrate,
    parseStored: parseStored,
    buildRecord: buildRecord,
    isDateTime: isDateTime,
    isPlainObject: isPlainObject,
    clone: clone
  });
});
