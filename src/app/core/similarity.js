/*
 * core/similarity.js — 辨識吻合度（FE-05）
 * 依據：architecture.md §7.3；契約 SttResult、SttLight；規格書 2.3、2.4、Q-23
 * 涵蓋：AC-08-03、AC-08-04、AC-08-05、AC-08-06、AC-08-10、AC-08-12
 * 純函式，不依賴 DOM 與其他 core 檔。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.EMT = root.EMT || {};
    root.EMT.core = root.EMT.core || {};
    root.EMT.core.similarity = api;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // 燈號門檻（AC-08-06）：≥ 90 綠燈；65～89 黃燈；< 65 紅燈
  var GREEN_MIN = 90;
  var YELLOW_MIN = 65;

  /**
   * 字串清洗：NFC 正規化、轉小寫、去除標點與所有空白（保留含重音字母與數字）。
   * Q-23 決議 A：不保留空白，例如 "Comply with." → "complywith"。
   * @param {string} s
   * @returns {string}
   */
  function clean(s) {
    if (typeof s !== "string") return "";
    return s.normalize("NFC").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  }

  /**
   * 編輯距離（Levenshtein）。兩列滾動陣列 DP：O(m·n) 時間、O(min(m, n)) 空間。
   * 以 UTF-16 碼元比較；clean 後的英文內容不受影響。
   * @param {string} a
   * @param {string} b
   * @returns {number}
   */
  function levenshtein(a, b) {
    a = typeof a === "string" ? a : "";
    b = typeof b === "string" ? b : "";
    if (a === b) return 0;
    // 讓 b 為較短字串，使陣列長度為 min(m, n) + 1
    if (a.length < b.length) {
      var t = a;
      a = b;
      b = t;
    }
    var m = a.length;
    var n = b.length;
    if (n === 0) return m;

    var prev = new Array(n + 1);
    var curr = new Array(n + 1);
    var j;
    for (j = 0; j <= n; j++) prev[j] = j;

    for (var i = 1; i <= m; i++) {
      curr[0] = i;
      var ca = a.charCodeAt(i - 1);
      for (j = 1; j <= n; j++) {
        var cost = ca === b.charCodeAt(j - 1) ? 0 : 1;
        var del = prev[j] + 1;
        var ins = curr[j - 1] + 1;
        var sub = prev[j - 1] + cost;
        curr[j] = del < ins ? (del < sub ? del : sub) : (ins < sub ? ins : sub);
      }
      var swap = prev;
      prev = curr;
      curr = swap;
    }
    return prev[n];
  }

  /**
   * 辨識吻合度 0～100 整數 = round((1 − 編輯距離 ÷ max(|a|, |b|)) × 100)。
   * 辨識結果清洗後為空 → 回 null（呼叫端提示「未偵測到語音，請再試一次」，不顯示分數，AC-08-10）。
   * @param {string} recognized 辨識原文
   * @param {string} target 目標文字
   * @returns {number|null}
   */
  function score(recognized, target) {
    var a = clean(recognized);
    if (a.length === 0) return null;
    var b = clean(target);
    var maxLen = Math.max(a.length, b.length);
    var d = levenshtein(a, b);
    var s = Math.round((1 - d / maxLen) * 100);
    // 防護：確保落在 0～100
    if (s < 0) s = 0;
    if (s > 100) s = 100;
    return s;
  }

  /**
   * 分數 → 燈號（SttLight）。非有限數值回 null。
   * @param {number} s
   * @returns {"green"|"yellow"|"red"|null}
   */
  function lightOf(s) {
    if (typeof s !== "number" || !isFinite(s)) return null;
    if (s >= GREEN_MIN) return "green";
    if (s >= YELLOW_MIN) return "yellow";
    return "red";
  }

  return {
    clean: clean,
    levenshtein: levenshtein,
    score: score,
    lightOf: lightOf
  };
});
