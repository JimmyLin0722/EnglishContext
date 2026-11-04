/*
 * EMT.core.position — 單字卡上次位置的解析與正規化（FE-71）
 * 依據：architecture.md v0.10 §4.10「EMT.core.position」、§7.21.2；
 *       契約 README §5.10 FP-1、FP-2、§5.3 RD-3 (d)、§6.2 IM-10 (3)、§7.7 V-ST-18 (b)；
 *       data-schema.ts FlashcardPosition；storage-schema.json $defs/FlashcardPosition、FlashcardPositionNormalized。
 * 涵蓋：AC-44-01、AC-44-04、AC-44-05、AC-44-06、AC-44-07、AC-47-05
 *
 * - L1 模組：載入時只取用 EMT.core.wordkey（LD-1）；不讀 DOM、不讀 window 資料、不碰儲存。
 * - 全部為純函式：不修改傳入值、對任何輸入不拋例外（型別不符回傳 null 或預設結果）。
 * - 何時解析、何時寫入由 store 決定（FE-74 的 placeCard、gotoCard）；本模組不呼叫任何寫入。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.EMT = root.EMT || {};
    root.EMT.core = root.EMT.core || {};
    root.EMT.core.position = api;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // 取得相依模組：Node 下 require，瀏覽器下讀 EMT.core.wordkey（建置順序保證先載入）
  var wordKey;
  if (typeof require === "function" && typeof module === "object") {
    wordKey = require("./wordkey.js").wordKey;
  } else {
    var g = typeof self !== "undefined" ? self : this;
    wordKey = g.EMT.core.wordkey.wordKey;
  }

  /** 純物件判斷：非 null、非陣列，原型為 Object.prototype 或 null */
  function isPlainObject(v) {
    if (v === null || typeof v !== "object" || Array.isArray(v)) {
      return false;
    }
    var proto = Object.getPrototypeOf(v);
    return proto === Object.prototype || proto === null;
  }

  /**
   * $defs/FlashcardPosition：null，或恰 2 鍵 wordKey（字串）、ordinal（整數 ≥ 1）的純物件。
   * 陣列、多餘鍵、缺鍵、ordinal 為 "10"／1.5／0／負數、wordKey 非字串皆為 false。
   * @param {*} v
   * @returns {boolean}
   */
  function isShape(v) {
    if (v === null) {
      return true;
    }
    if (!isPlainObject(v)) {
      return false;
    }
    var keys = Object.keys(v);
    if (keys.length !== 2) {
      return false;
    }
    if (!Object.prototype.hasOwnProperty.call(v, "wordKey") || !Object.prototype.hasOwnProperty.call(v, "ordinal")) {
      return false;
    }
    return typeof v.wordKey === "string" && Number.isInteger(v.ordinal) && v.ordinal >= 1;
  }

  /**
   * RD-3 (d)、IM-10 (3)：正規化為 FlashcardPositionNormalized 或 null。
   * isShape 為 false 或 v 為 null → null；wordKey 依 C-2 正規化，結果為空字串 → null。
   * 一律回傳新物件，不回傳傳入值本身。
   * @param {*} v
   * @returns {{wordKey: string, ordinal: number}|null}
   */
  function normalize(v) {
    if (v === null || !isShape(v)) {
      return null;
    }
    var key = wordKey(v.wordKey);
    if (key === "") {
      return null;
    }
    return { wordKey: key, ordinal: v.ordinal };
  }

  /** 單字集長度；非陣列視為空集合 */
  function sizeOf(studySet) {
    return Array.isArray(studySet) ? studySet.length : 0;
  }

  /**
   * 依目前索引建立位置紀錄（FP-1）。
   * 0 ≤ index < N 且該卡 wordKey 為非空字串 → { wordKey, ordinal: index + 1 }；否則 null。
   * @param {Array<{wordKey: string}>} studySet
   * @param {number} index
   * @returns {{wordKey: string, ordinal: number}|null}
   */
  function fromIndex(studySet, index) {
    var n = sizeOf(studySet);
    if (!Number.isInteger(index) || index < 0 || index >= n) {
      return null;
    }
    var card = studySet[index];
    if (!card || typeof card !== "object" || typeof card.wordKey !== "string" || card.wordKey === "") {
      return null;
    }
    return { wordKey: card.wordKey, ordinal: index + 1 };
  }

  /**
   * FP-2：把位置紀錄解析為 flashcard.index。
   * (1) N = 0 → { index: 0, position: 傳入值原物件, kind: "empty" }（紀錄不動）；
   * (2) 正規化後為 null → { index: 0, position: fromIndex(set, 0), kind: "none" }；
   * (3) 單字集中有相同 wordKey 的卡 → { index: i, position: fromIndex(set, i), kind: "found" }；
   * (4) 找不到 → i = min(ordinal, N) − 1 → { index: i, position: fromIndex(set, i), kind: "fallback" }。
   * 線性搜尋 O(N)。
   * @param {*} position
   * @param {Array<{wordKey: string}>} studySet
   * @returns {{index: number, position: *, kind: "empty"|"none"|"found"|"fallback"}}
   */
  function resolve(position, studySet) {
    var n = sizeOf(studySet);
    if (n === 0) {
      return { index: 0, position: position, kind: "empty" };
    }
    var p = normalize(position);
    if (p === null) {
      return { index: 0, position: fromIndex(studySet, 0), kind: "none" };
    }
    for (var i = 0; i < n; i++) {
      var card = studySet[i];
      if (card && card.wordKey === p.wordKey) {
        return { index: i, position: fromIndex(studySet, i), kind: "found" };
      }
    }
    var idx = Math.min(p.ordinal, n) - 1;
    return { index: idx, position: fromIndex(studySet, idx), kind: "fallback" };
  }

  /**
   * 兩個位置是否指向同一張卡：兩者皆非 null（且為物件），wordKey 與 ordinal 皆相同。
   * @param {*} a
   * @param {*} b
   * @returns {boolean}
   */
  function sameCard(a, b) {
    if (!a || !b || typeof a !== "object" || typeof b !== "object") {
      return false;
    }
    return a.wordKey === b.wordKey && a.ordinal === b.ordinal;
  }

  return Object.freeze({
    isShape: isShape,
    normalize: normalize,
    fromIndex: fromIndex,
    resolve: resolve,
    sameCard: sameCard
  });
});
