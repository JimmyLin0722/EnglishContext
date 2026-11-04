/*
 * EMT.core.part5flow — 模擬測驗答對紀錄與「只練沒答對」的狀態轉移（FE-72）
 * 依據：architecture.md v0.10 §4.10「EMT.core.part5flow」、§7.21.3；
 *       契約 README §5.11 CR-1～CR-8、UO-1～UO-9、§5.3 RD-3 (c)、§6.2 IM-10 (2)、(4)、§11.6 MT-1（v0.15）、
 *       data-schema.ts §15 Part5ViewKind、§7.7 V-ST-19、V-ST-20、§9.8 DS-34。
 * 涵蓋：AC-45-01～AC-45-03、AC-45-05、AC-45-07、AC-46-02～AC-46-06、AC-46-08、AC-46-09、AC-47-05
 *
 * （v0.18，FE-80；architecture.md v0.13 §4.11、§7.24.1；契約 README §5.11 LV-1、LV-3、LV-4、UO-8、UO-10；
 *   AC-48-01～AC-48-05、AC-48-07、AC-48-10）新增 questionState、canAnswer；next 可由已答對鎖定檢視前進；
 *   開關由開變關依切換前畫面種類分流。鎖定狀態為推導值，本模組不為了顯示鎖定而設定 lockedSelection（LV-4）。
 *
 * - L1 模組：載入時不取用任何其他模組（LD-1）；不讀 DOM、不讀 window 資料、不碰儲存。
 * - 全部為純函式：不修改傳入值、對任何輸入不拋例外、不遞迴；nextUnanswered 為單一有界迴圈（UO-9）。
 * - 題庫 id 以 bankIds 陣列傳入（bankIdsOf 結果）；null 代表該題沒有合法 id：永遠「未答對」、不可被記錄。
 * - 名詞：Q = bankIds.length；set = correctSet(part5CorrectIds)；only = part5UnansweredOnly；p5 = Part5Progress。
 * - store 只負責取 bankIds、組 data 與寫入；寫入與否以回傳的 changed 判斷。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.EMT = root.EMT || {};
    root.EMT.core = root.EMT.core || {};
    root.EMT.core.part5flow = api;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /** 淺複製並套用 patch，回傳新物件（不修改 base） */
  function assign(base, patch) {
    var out = {};
    var k;
    for (k in base) {
      if (Object.prototype.hasOwnProperty.call(base, k)) { out[k] = base[k]; }
    }
    for (k in patch) {
      if (Object.prototype.hasOwnProperty.call(patch, k)) { out[k] = patch[k]; }
    }
    return out;
  }

  /** 是否為可用的 Part5Progress（非 null 物件） */
  function isProgress(p5) {
    return !!p5 && typeof p5 === "object" && !Array.isArray(p5);
  }

  /** 題庫 id 陣列；非陣列視為空題庫 */
  function idsOf(bankIds) {
    return Array.isArray(bankIds) ? bankIds : [];
  }

  /** 答對集合查詢；非 Set 一律視為空集合 */
  function has(set, id) {
    return !!set && typeof set.has === "function" && set.has(id) === true;
  }

  /** 非空字串（trim 後長度 ≥ 1） */
  function isIdString(v) {
    return typeof v === "string" && v.trim() !== "";
  }

  /**
   * 題庫 → 題目 id 陣列（與題庫同順序、同長度）。
   * 非陣列 → []；題目沒有合法 id（非字串或 trim 後為空）→ 該位置為 null。
   * @param {*} bank PART5_QUESTION_BANK
   * @returns {Array<string|null>}
   */
  function bankIdsOf(bank) {
    if (!Array.isArray(bank)) {
      return [];
    }
    var out = new Array(bank.length);
    for (var i = 0; i < bank.length; i++) {
      var q = bank[i];
      out[i] = q && typeof q === "object" && isIdString(q.id) ? q.id : null;
    }
    return out;
  }

  /**
   * RD-3 (c)、IM-10 (2)：答對紀錄正規化。
   * 非陣列 → []；捨棄非字串與 trim 後為空者；完全相同的字串只留第一次；
   * 其餘原值、原順序保留（含題庫不存在的 id，Q-71 A）。一律回傳新陣列。
   * @param {*} raw
   * @returns {string[]}
   */
  function normalizeIds(raw) {
    if (!Array.isArray(raw)) {
      return [];
    }
    var seen = new Set();
    var out = [];
    for (var i = 0; i < raw.length; i++) {
      var v = raw[i];
      if (!isIdString(v) || seen.has(v)) { continue; }
      seen.add(v);
      out.push(v);
    }
    return out;
  }

  /**
   * 答對集合。
   * @param {*} ids part5CorrectIds
   * @returns {Set<string>}
   */
  function correctSet(ids) {
    return new Set(normalizeIds(ids));
  }

  /**
   * K：題庫中曾答對的題數（非 null 且在集合中、同一 id 只計一次；0 ≤ K ≤ Q）。
   * @param {Array<string|null>} bankIds
   * @param {Set<string>} set
   * @returns {number}
   */
  function countCorrect(bankIds, set) {
    var list = idsOf(bankIds);
    var counted = new Set();
    for (var i = 0; i < list.length; i++) {
      var id = list[i];
      if (id !== null && has(set, id) && !counted.has(id)) {
        counted.add(id);
      }
    }
    return counted.size;
  }

  /**
   * 曾答對(j)：bankIds[j] 非 null 且在答對集合中。
   * @param {Array<string|null>} bankIds
   * @param {Set<string>} set
   * @param {number} j
   * @returns {boolean}
   */
  function isCorrectAt(bankIds, set, j) {
    var list = idsOf(bankIds);
    if (!Number.isInteger(j) || j < 0 || j >= list.length) {
      return false;
    }
    var id = list[j];
    return id !== null && id !== undefined && has(set, id);
  }

  /**
   * next(f)：從 max(from, 0) 到 Q − 1 的第一個「未答對」題號；沒有 → -1。
   * 單一有界迴圈（UO-9）；from 非有限數值視為 0。
   * @param {Array<string|null>} bankIds
   * @param {Set<string>} set
   * @param {number} from
   * @returns {number}
   */
  function nextUnanswered(bankIds, set, from) {
    var list = idsOf(bankIds);
    var start = typeof from === "number" && isFinite(from) && from > 0 ? Math.ceil(from) : 0;
    for (var j = start; j < list.length; j++) {
      var id = list[j];
      if (id === null || id === undefined || !has(set, id)) {
        return j;
      }
    }
    return -1;
  }

  /** 開關開啟且全部答對（Q > 0、K = Q） */
  function isAllDone(bankIds, set, only) {
    var q = idsOf(bankIds).length;
    return only === true && q > 0 && countCorrect(bankIds, set) === q;
  }

  /**
   * UO-3：畫面種類（每次繪製時推導，不持久化）。
   * Q = 0 → "empty"；allDone 且不是「題目畫面且已鎖定作答」→ "allCorrect"；
   * 否則 phase = "summary" → "summary"；否則 "question"。
   * @param {object} p5 Part5Progress
   * @param {Array<string|null>} bankIds
   * @param {Set<string>} set
   * @param {boolean} only
   * @returns {"empty"|"question"|"summary"|"allCorrect"}
   */
  function viewKind(p5, bankIds, set, only) {
    if (idsOf(bankIds).length === 0) {
      return "empty";
    }
    var p = isProgress(p5) ? p5 : {};
    var lockedQuestion = p.phase === "question" && p.lockedSelection !== null && p.lockedSelection !== undefined;
    if (isAllDone(bankIds, set, only) && !lockedQuestion) {
      return "allCorrect";
    }
    if (p.phase === "summary") {
      return "summary";
    }
    return "question";
  }

  /**
   * UO-4：不變式正規化。開關開啟、題目畫面、未鎖定、目前題目曾答對、K < Q →
   * 移到其後第一題未答對；其後沒有 → phase = "summary"（本輪計數不變）。其他情況不變。
   * @returns {{part5: object, changed: boolean}}
   */
  function normalizeOnly(p5, bankIds, set, only) {
    if (only !== true || !isProgress(p5) || p5.phase !== "question" || p5.lockedSelection !== null) {
      return { part5: p5, changed: false };
    }
    var q = idsOf(bankIds).length;
    if (!isCorrectAt(bankIds, set, p5.currentIndex) || countCorrect(bankIds, set) >= q) {
      return { part5: p5, changed: false };
    }
    var j = nextUnanswered(bankIds, set, p5.currentIndex);
    if (j >= 0) {
      return { part5: assign(p5, { currentIndex: j }), changed: true };
    }
    return { part5: assign(p5, { phase: "summary" }), changed: true };
  }

  /**
   * CR-2：作答答對且 id 未曾記錄 → 附加到陣列末尾（回傳新陣列）；否則原陣列、changed false。
   * @param {string[]} ids part5CorrectIds
   * @param {string|null} id 該題 id（bankIds[currentIndex]）
   * @param {boolean} correct 是否答對
   * @returns {{ids: string[], changed: boolean}}
   */
  function recordAnswer(ids, id, correct) {
    if (correct !== true || !isIdString(id) || !Array.isArray(ids) || ids.indexOf(id) >= 0) {
      return { ids: ids, changed: false };
    }
    return { ids: ids.concat([id]), changed: true };
  }

  /**
   * LV-1：題目畫面狀態（每次繪製時推導，不持久化），依序判定：
   * lockedSelection 非 null、非 undefined → "answered"（本次作答結果優先）；
   * 開關關閉且目前題目曾答對 → "lockedReview"；否則 "idle"。p5 不是物件 → "idle"。
   * 只在 viewKind = "question" 時有意義。
   * @param {object} p5 Part5Progress
   * @param {Array<string|null>} bankIds
   * @param {Set<string>} set
   * @param {boolean} only
   * @returns {"answered"|"lockedReview"|"idle"}
   */
  function questionState(p5, bankIds, set, only) {
    if (!isProgress(p5)) {
      return "idle";
    }
    if (p5.lockedSelection !== null && p5.lockedSelection !== undefined) {
      return "answered";
    }
    return only !== true && isCorrectAt(bankIds, set, p5.currentIndex) ? "lockedReview" : "idle";
  }

  /**
   * LV-3：作答防護。phase = "question"、lockedSelection = null、目前題目不是曾答對才可作答；不看開關。
   * @param {object} p5 Part5Progress
   * @param {Array<string|null>} bankIds
   * @param {Set<string>} set
   * @returns {boolean}
   */
  function canAnswer(p5, bankIds, set) {
    return isProgress(p5) && p5.phase === "question" && p5.lockedSelection === null &&
      !isCorrectAt(bankIds, set, p5.currentIndex);
  }

  /**
   * 「下一題」。前提：phase = "question" 且 questionState 不是 "idle"，否則回傳原值、changed false。
   * 開關關閉 → UO-10（answered、lockedReview 皆可前進；最後一題 → summary，否則 +1）；
   * 開關開啟 → UO-5：j = next(currentIndex + 1)，有 → 該題，無 → summary。
   * 只改 currentIndex 或 phase 與 lockedSelection，計數不變。
   * @returns {{part5: object, changed: boolean}}
   */
  function next(p5, bankIds, set, only) {
    if (!isProgress(p5) || p5.phase !== "question" || questionState(p5, bankIds, set, only) === "idle") {
      return { part5: p5, changed: false };
    }
    var q = idsOf(bankIds).length;
    var toSummary = { lockedSelection: null, phase: "summary" };
    if (only !== true) {
      if (p5.currentIndex >= q - 1) {
        return { part5: assign(p5, toSummary), changed: true };
      }
      return { part5: assign(p5, { currentIndex: p5.currentIndex + 1, lockedSelection: null }), changed: true };
    }
    var j = nextUnanswered(bankIds, set, p5.currentIndex + 1);
    if (j >= 0) {
      return { part5: assign(p5, { currentIndex: j, lockedSelection: null }), changed: true };
    }
    return { part5: assign(p5, toSummary), changed: true };
  }

  /**
   * UO-6「重新開始」：本輪歸 0、未鎖定、題目畫面；currentIndex = 開關開啟 ? max(next(0), 0) : 0；累計不變。
   * 與原值逐欄相同時 changed false（沿用 v0.14 不寫入的行為）。
   * @returns {{part5: object, changed: boolean}}
   */
  function restart(p5, bankIds, set, only) {
    if (!isProgress(p5)) {
      return { part5: p5, changed: false };
    }
    var idx = only === true ? Math.max(nextUnanswered(bankIds, set, 0), 0) : 0;
    var patch = { currentIndex: idx, lockedSelection: null, phase: "question", roundAnswered: 0, roundCorrect: 0 };
    var changed = p5.currentIndex !== idx || p5.lockedSelection !== null || p5.phase !== "question" ||
      p5.roundAnswered !== 0 || p5.roundCorrect !== 0;
    return changed ? { part5: assign(p5, patch), changed: true } : { part5: p5, changed: false };
  }

  /**
   * UO-1、UO-8：切換「只練沒答對」。
   * on 非布林或與原值相同 → changed false；關 → 開 時再套 UO-4 正規化；
   * 開 → 關 時依切換前畫面種類分流（UO-8）：allCorrect → (a) 第 1 題、本輪歸 0；其他 → (b) part5 同一參考。
   * 累計不變；本輪只有 UO-8 (a) 歸 0（UO-1）。
   * @param {{part5: object, ids: string[], only: boolean}} state
   * @param {Array<string|null>} bankIds
   * @param {boolean} on
   * @returns {{part5: object, only: boolean, changed: boolean}}
   */
  function setOnly(state, bankIds, on) {
    var st = state && typeof state === "object" ? state : {};
    if (typeof on !== "boolean" || on === st.only) {
      return { part5: st.part5, only: st.only, changed: false };
    }
    if (on) {
      var r = normalizeOnly(st.part5, bankIds, correctSet(st.ids), true);
      return { part5: r.part5, only: true, changed: true };
    }
    var wasAllCorrect = st.only === true && isProgress(st.part5) &&
      viewKind(st.part5, bankIds, correctSet(st.ids), true) === "allCorrect";
    return { part5: wasAllCorrect ? freshRound(st.part5) : st.part5, only: false, changed: true };
  }

  /** 本輪歸 0、回第 1 題、累計保留的新 Part5Progress（UO-8 (a)、CR-6 共用） */
  function freshRound(p5) {
    var p = isProgress(p5) ? p5 : {};
    return {
      currentIndex: 0,
      lockedSelection: null,
      phase: "question",
      roundAnswered: 0,
      roundCorrect: 0,
      totalAnswered: p.totalAnswered,
      totalCorrect: p.totalCorrect
    };
  }

  /**
   * CR-6「清除答對紀錄，重新來過」（確認後）：第 1 題、本輪歸 0、累計不變、ids = []。呼叫端保留 only。
   * @param {object} p5
   * @returns {{part5: object, ids: string[]}}
   */
  function clearAndRestart(p5) {
    return { part5: freshRound(p5), ids: [] };
  }

  return Object.freeze({
    bankIdsOf: bankIdsOf,
    normalizeIds: normalizeIds,
    correctSet: correctSet,
    countCorrect: countCorrect,
    isCorrectAt: isCorrectAt,
    nextUnanswered: nextUnanswered,
    viewKind: viewKind,
    questionState: questionState,
    canAnswer: canAnswer,
    normalizeOnly: normalizeOnly,
    recordAnswer: recordAnswer,
    next: next,
    restart: restart,
    setOnly: setOnly,
    clearAndRestart: clearAndRestart
  });
});
