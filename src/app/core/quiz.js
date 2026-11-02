/*
 * core/quiz.js — 單字四選一出題（FE-05）
 * 依據：architecture.md §7.4；契約 VocabQuizQuestion、OptionIndex、StudyCard、README FB-11
 * 涵蓋：AC-09-02、AC-09-05、AC-09-06、AC-09-07
 * 純函式，不依賴 DOM 與其他 core 檔；亂數以參數注入。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.EMT = root.EMT || {};
    root.EMT.core = root.EMT.core || {};
    root.EMT.core.quiz = api;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var OPTION_COUNT = 4;
  var DISTRACTOR_COUNT = OPTION_COUNT - 1;
  // 隨機索引抽樣的最多嘗試次數；失敗才線性掃描
  var MAX_SAMPLE_TRIES = 50;

  /** 取卡片 meaning（trim 後）；不合法回 ""。StudyCard 的 meaning 位於 item.meaning。 */
  function meaningOf(card) {
    var item = card && card.item;
    var m = item && item.meaning;
    return typeof m === "string" ? m.trim() : "";
  }

  /** 0 ≤ 結果 < n 的整數；rand 回傳異常值時夾回範圍內。 */
  function randInt(rand, n) {
    var r = Number(rand());
    if (!(r >= 0)) r = 0;
    var k = Math.floor(r * n);
    return k >= n ? n - 1 : k;
  }

  /** Fisher–Yates 洗牌（就地）。 */
  function shuffle(arr, rand) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = randInt(rand, i + 1);
      var t = arr[i];
      arr[i] = arr[j];
      arr[j] = t;
    }
    return arr;
  }

  /**
   * 從單字集中挑出 3 個與正解及彼此相異的誘答釋義。不足回 null。
   * 先以隨機索引抽樣（最多 50 次），湊不滿才線性掃描所有其他卡（單字集很小或重複多時）。
   */
  function pickDistractors(studySet, index, answer, rand) {
    var n = studySet.length;
    var picked = [];
    var seen = Object.create(null);
    seen[answer] = true;

    if (n > 1) {
      for (var t = 0; t < MAX_SAMPLE_TRIES && picked.length < DISTRACTOR_COUNT; t++) {
        // 從「索引 ≠ index」的 n − 1 張中隨機抽一張
        var k = randInt(rand, n - 1);
        if (k >= index) k += 1;
        var m = meaningOf(studySet[k]);
        if (m && !seen[m]) {
          seen[m] = true;
          picked.push(m);
        }
      }
    }
    if (picked.length === DISTRACTOR_COUNT) return picked;

    // 線性掃描：收集剩餘的相異候選，再隨機補足
    var pool = [];
    for (var i = 0; i < n; i++) {
      if (i === index) continue;
      var mm = meaningOf(studySet[i]);
      if (mm && !seen[mm]) {
        seen[mm] = true;
        pool.push(mm);
      }
    }
    if (picked.length + pool.length < DISTRACTOR_COUNT) return null;
    shuffle(pool, rand);
    while (picked.length < DISTRACTOR_COUNT) picked.push(pool.pop());
    return picked;
  }

  /**
   * 產生四選一題目（VocabQuizQuestion）。
   * 正解 = 該卡 meaning（trim）；誘答取自單字集其他卡的 meaning（trim 後去重並排除正解）。
   * 單字集少於 4 張、相異 meaning 不足 4 種、索引不合法或該卡 meaning 為空 → 回 null
   * （呼叫端提示「單字數不足 4 個，無法產生選項」，AC-09-06、FB-11）。
   * @param {Array<{kind:string, wordKey:string, item:{meaning:string}}>} studySet 單字集（StudyCard[]）
   * @param {number} index 題目卡片索引
   * @param {function():number} [rand] 回傳 [0, 1) 的亂數函式，預設 Math.random
   * @returns {{wordKey:string, options:string[], correctIndex:number, selectedIndex:null}|null}
   */
  function buildQuiz(studySet, index, rand) {
    if (typeof rand !== "function") rand = Math.random;
    if (!Array.isArray(studySet) || studySet.length < OPTION_COUNT) return null;
    if (typeof index !== "number" || index !== Math.floor(index) || index < 0 || index >= studySet.length) {
      return null;
    }
    var card = studySet[index];
    var answer = meaningOf(card);
    if (!answer) return null;

    var distractors = pickDistractors(studySet, index, answer, rand);
    if (!distractors) return null;

    var options = shuffle([answer].concat(distractors), rand);
    return {
      wordKey: card.wordKey,
      options: options,
      correctIndex: options.indexOf(answer),
      selectedIndex: null
    };
  }

  return {
    buildQuiz: buildQuiz,
    shuffle: shuffle
  };
});
