/*
 * EMT.core.vocab — 內建字庫整理、色級截取上限與抽認卡單字集（FE-04；architecture.md §7.2）
 * 依據：契約 data-schema.ts §3 BuiltinVocabItem、§10 StudyCard；README §3.1 字庫分檔規則、
 *       V-VOC-12（N_B、N_G 以實際資料計算，與 VOCAB_MANIFEST 不符只警告）、V-ST-04（單字集組成）。
 * 本模組為純函式，不碰 DOM、不讀 window 全域資料、不讀 localStorage；
 * content.js 讀全域變數後呼叫 prepareBuiltin，store 以 limitOf + buildStudySet 建單字集。
 * Node 以 require 載入，瀏覽器掛到 EMT.core.vocab（需先載入 EMT.core.constants、EMT.core.wordkey）。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.EMT = root.EMT || {};
    root.EMT.core = root.EMT.core || {};
    root.EMT.core.vocab = api;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // 取得相依模組：Node 下 require，瀏覽器下讀 EMT.core.*
  var C, wordKey;
  if (typeof require === "function" && typeof module === "object") {
    C = require("./constants.js");
    wordKey = require("./wordkey.js").wordKey;
  } else {
    var g = typeof self !== "undefined" ? self : this;
    C = g.EMT.core.constants;
    wordKey = g.EMT.core.wordkey.wordKey;
  }

  /**
   * 內建單字 → wordKey 的快取。
   * 內建字庫載入後不再變動，快取可避免每次重建單字集都重算 5,620 次 normalize（AC-22-02）。
   */
  var builtinKeyCache = new WeakMap();

  /**
   * 取得內建單字的 wordKey（有快取）。
   * @param {object} item BuiltinVocabItem
   * @returns {string}
   */
  function builtinKeyOf(item) {
    var key = builtinKeyCache.get(item);
    if (key === undefined) {
      key = wordKey(item.word);
      builtinKeyCache.set(item, key);
    }
    return key;
  }

  /** 判斷是否為可用的內建單字物件（C-6 容錯：排除非物件、無排名、無單字的項目） */
  function isUsableBuiltin(item) {
    return !!item && typeof item === "object" &&
      typeof item.rank === "number" && isFinite(item.rank) &&
      typeof item.word === "string" && wordKey(item.word) !== "";
  }

  /** 是否為純物件（排除 null 與陣列） */
  function isPlainObject(x) {
    return !!x && typeof x === "object" && !Array.isArray(x);
  }

  /**
   * 整理內建字庫（AC-03-06、V-VOC-12）。
   * - raw 非陣列 → 空字庫。
   * - 複製後依 rank 遞增排序（分檔載入順序不影響結果，README §3.1）。
   * - 建 Map<wordKey, item>；wordKey 重複時保留排名較前者（資料應無重複，AC-03-07）。
   * - nB = sources 含 "NGSL" 的筆數；nG = 筆數（R-8）。
   * - 與 manifest 的 nB、nG 不符時只 console.warn，不中斷（V-VOC-12）。
   * @param {*} raw window.MASTER_VOCAB_DATABASE
   * @param {*} [manifest] window.VOCAB_MANIFEST（可省略；非物件時不比對）
   * @returns {{ sorted: object[], map: Map<string, object>, nB: number, nG: number, warnings: string[] }}
   */
  function prepareBuiltin(raw, manifest) {
    var warnings = [];
    var sorted = [];
    if (Array.isArray(raw)) {
      for (var i = 0; i < raw.length; i++) {
        if (isUsableBuiltin(raw[i])) {
          sorted.push(raw[i]);
        }
      }
      if (sorted.length !== raw.length) {
        warnings.push("內建字庫有 " + (raw.length - sorted.length) + " 筆格式不符，已略過");
      }
    }
    // Array.prototype.sort 為穩定排序；同 rank（資料錯誤）時維持原順序
    sorted.sort(function (a, b) { return a.rank - b.rank; });

    var map = new Map();
    var nB = 0;
    for (var j = 0; j < sorted.length; j++) {
      var item = sorted[j];
      var key = builtinKeyOf(item);
      if (!map.has(key)) {
        map.set(key, item);
      } else {
        warnings.push("內建字庫 wordKey 重複：" + key);
      }
      if (Array.isArray(item.sources) && item.sources.indexOf("NGSL") !== -1) {
        nB++;
      }
    }
    var nG = sorted.length;

    if (isPlainObject(manifest)) {
      if (manifest.nB !== nB) {
        warnings.push("VOCAB_MANIFEST.nB（" + manifest.nB + "）與實際計算值（" + nB + "）不符");
      }
      if (manifest.nG !== nG) {
        warnings.push("VOCAB_MANIFEST.nG（" + manifest.nG + "）與實際計算值（" + nG + "）不符");
      }
    }

    if (warnings.length > 0 && typeof console !== "undefined" && typeof console.warn === "function") {
      for (var w = 0; w < warnings.length; w++) {
        console.warn("[EMT.vocab] " + warnings[w]);
      }
    }

    return { sorted: sorted, map: map, nB: nB, nG: nG, warnings: warnings };
  }

  /**
   * 生效色級對應的內建字截取上限（AC-03-01～AC-03-03）。
   * orange → N_O（1,000）、brown → nB、green → nG；
   * 藍、金不會是生效色級，若誤傳一律比照綠（AC-03-03）。
   * @param {string} effectiveColor
   * @param {number} nB
   * @param {number} nG
   * @returns {number}
   */
  function limitOf(effectiveColor, nB, nG) {
    if (effectiveColor === "orange") { return C.N_O; }
    if (effectiveColor === "brown") { return nB; }
    return nG;
  }

  /**
   * 【SD-FB-03 唯一判斷點】自訂單字是否因與內建字 wordKey 相同而不放入單字集（V-ST-04）。
   * 現行設計（architecture.md §7.2）：只與「本次截取」的內建卡比對；
   * 該內建字不在目前色級範圍內時保留自訂卡，使該字仍出現一次。
   * 若契約改為「只要存在於全部內建字庫就不放」，改為 `return !!builtinMap && builtinMap.has(key);` 即可
   * （buildStudySet 已把 builtinMap 傳進來，呼叫端需傳入第 4 個參數）。
   * @param {string} key 自訂單字的 wordKey
   * @param {Set<string>} slicedKeys 本次截取的內建卡 wordKey 集合
   * @param {Map<string, object>|null} builtinMap 全部內建字庫（現行規則未使用）
   * @returns {boolean}
   */
  function isCustomShadowedByBuiltin(key, slicedKeys, builtinMap) {
    return slicedKeys.has(key);
  }

  /** 解析 createdAt 為毫秒；無法解析回 NaN */
  function timeOf(item) {
    return typeof item.createdAt === "string" ? Date.parse(item.createdAt) : NaN;
  }

  /**
   * 自訂單字依 createdAt 遞增排序（不改動原陣列；時間相同或無法解析時維持原順序，無法解析者排最後）。
   * @param {object[]} customVocab
   * @returns {object[]}
   */
  function sortCustomByCreatedAt(customVocab) {
    var list = [];
    for (var i = 0; i < customVocab.length; i++) {
      var it = customVocab[i];
      if (it && typeof it === "object") {
        list.push({ item: it, t: timeOf(it), i: i });
      }
    }
    list.sort(function (a, b) {
      var aBad = isNaN(a.t);
      var bBad = isNaN(b.t);
      if (aBad !== bBad) { return aBad ? 1 : -1; }
      if (!aBad && a.t !== b.t) { return a.t - b.t; }
      return a.i - b.i;
    });
    return list.map(function (x) { return x.item; });
  }

  /**
   * 建立抽認卡單字集（V-ST-04、AC-03-01～AC-03-04、AC-22-02）。
   * = builtinSorted 前 limit 筆（轉 StudyCard）+ 自訂單字依 createdAt 遞增；
   * 自訂單字是否因與內建重複而略過，由 isCustomShadowedByBuiltin 判斷（SD-FB-03）。
   * 自訂清單內 wordKey 重複（違反 V-ST-03，理論上不會發生）時只放第一筆。O(N)。
   * @param {object[]} builtinSorted prepareBuiltin().sorted
   * @param {number} limit limitOf() 的結果
   * @param {object[]} customVocab PersistedData.customVocab
   * @param {Map<string, object>} [builtinMap] prepareBuiltin().map（SD-FB-03 預留，現行規則未使用）
   * @returns {Array<{ kind: "builtin"|"custom", wordKey: string, item: object }>}
   */
  function buildStudySet(builtinSorted, limit, customVocab, builtinMap) {
    var builtin = Array.isArray(builtinSorted) ? builtinSorted : [];
    var n = (typeof limit === "number" && isFinite(limit)) ? Math.max(0, Math.floor(limit)) : 0;
    if (n > builtin.length) { n = builtin.length; }

    var result = new Array(n);
    var slicedKeys = new Set();
    for (var i = 0; i < n; i++) {
      var item = builtin[i];
      var key = builtinKeyOf(item);
      slicedKeys.add(key);
      result[i] = { kind: "builtin", wordKey: key, item: item };
    }

    if (Array.isArray(customVocab) && customVocab.length > 0) {
      var customs = sortCustomByCreatedAt(customVocab);
      var seenCustom = new Set();
      for (var j = 0; j < customs.length; j++) {
        var c = customs[j];
        var ck = wordKey(c.word);
        if (ck === "" || seenCustom.has(ck)) { continue; }
        seenCustom.add(ck);
        if (isCustomShadowedByBuiltin(ck, slicedKeys, builtinMap || null)) { continue; }
        result.push({ kind: "custom", wordKey: ck, item: c });
      }
    }
    return result;
  }

  return Object.freeze({
    prepareBuiltin: prepareBuiltin,
    limitOf: limitOf,
    buildStudySet: buildStudySet,
    isCustomShadowedByBuiltin: isCustomShadowedByBuiltin,
    sortCustomByCreatedAt: sortCustomByCreatedAt,
    builtinKeyOf: builtinKeyOf
  });
});
