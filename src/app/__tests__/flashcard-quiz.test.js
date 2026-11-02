/*
 * flashcard-quiz.test.js — 四選一測驗畫面模型單元測試（FE-13 測試移入，FE-19）
 * 受測：views/flashcard-quiz.js 匯出的純邏輯（optionState、quizModel）；搭配 core/quiz.js 與 state/store.js
 * 依據：architecture.md v0.3 §4.4（子元件讀 state.runtime.flashcard.quiz、state.data.vocabQuiz）、
 *       §4.3（測驗模式中單字集變動：目前題目保留、出新題失敗自動退回 card、不另顯示 toast、統計不變）
 * 涵蓋：AC-09-01～AC-09-04、AC-09-06、AC-24-07
 */
"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");

const L = require("../views/flashcard-quiz.js");
const { buildQuiz } = require("../core/quiz.js");
const F = require("./_fixtures.js");

describe("flashcard-quiz.test.js", () => {
  const set = ["apple:蘋果", "book:書", "cat:貓", "dog:狗", "egg:蛋"].map((s) => {
    const [w, m] = s.split(":");
    return { kind: "builtin", wordKey: w, item: { word: w, meaning: m, phonetic: "/x/" } };
  });
  set.push({ kind: "custom", wordKey: "fig", item: { word: "Fig", meaning: "無花果<script>", phonetic: "" } });

  /** 依 §4.4 結構組 AppState */
  function st(q, index, vq) {
    return {
      data: { vocabQuiz: vq || { answered: 3, correct: 2 } },
      runtime: { studySet: set, flashcard: { index, mode: "quiz", isFlipped: false, quiz: q } }
    };
  }
  const q0 = { wordKey: "book", options: ["貓", "書", "狗", "蛋"], correctIndex: 1, selectedIndex: null };

  test("optionState", () => {
    assert.equal(L.optionState(0, 1, null), "idle");
    assert.equal(L.optionState(1, 1, 1), "correct");
    assert.equal(L.optionState(1, 1, 2), "correct");
    assert.equal(L.optionState(2, 1, 2), "wrong");
    assert.equal(L.optionState(0, 1, 2), "neutral");
  });

  test("未作答：4 選項 A～D，皆可點", () => {
    const m = L.quizModel(st(q0, 1));
    assert.equal(m.status, "ok");
    assert.equal(m.word, "book");
    assert.deepEqual(m.options.map((o) => o.letter), ["A", "B", "C", "D"]);
    assert.deepEqual(m.options.map((o) => o.text), q0.options);
    assert.ok(m.options.every((o) => o.state === "idle" && !o.disabled && o.badge === ""));
    assert.equal(m.answered, false);
    assert.equal(m.feedback, "");
    assert.equal(m.stats, "單字測驗累計：已答 3 題，答對 2 題");
  });

  test("答對：正解綠、全部鎖定", () => {
    const m = L.quizModel(st({ ...q0, selectedIndex: 1 }, 1));
    assert.deepEqual(m.options.map((o) => o.state), ["neutral", "correct", "neutral", "neutral"]);
    assert.ok(m.options.every((o) => o.disabled));
    assert.equal(m.isCorrect, true);
    assert.equal(m.feedback, "答對了！");
    assert.equal(m.options[1].badge, "正確答案");
    assert.equal(m.hint, L.TEXT.nextHint);
  });

  test("答錯：所選紅、正解綠、全部鎖定", () => {
    const m = L.quizModel(st({ ...q0, selectedIndex: 3 }, 1));
    assert.deepEqual(m.options.map((o) => o.state), ["neutral", "correct", "neutral", "wrong"]);
    assert.ok(m.options.every((o) => o.disabled));
    assert.equal(m.isCorrect, false);
    assert.equal(m.feedback, "答錯了，正確答案是 B：書");
    assert.equal(m.options[3].badge, "你的選擇");
  });

  test("自訂單字可出題，最後一題提示；選項文字原樣（AC-24-07）", () => {
    const q = buildQuiz(set, 5, () => 0.3);
    assert.ok(q);
    const m = L.quizModel(st({ ...q, selectedIndex: 0 }, 5));
    assert.equal(m.status, "ok");
    assert.equal(m.word, "Fig");
    assert.equal(m.kind, "custom");
    assert.equal(m.phonetic, "");
    assert.ok(m.options.some((o) => o.text === "無花果<script>"));
    assert.equal(m.hint, L.TEXT.lastHint);
  });

  test("無題目或資料不合法 → AC-09-06 訊息", () => {
    for (const q of [null, undefined, {}, { ...q0, options: ["a", "b"] }, { ...q0, correctIndex: 4 }, { ...q0, correctIndex: "1" }]) {
      const m = L.quizModel(st(q, 0));
      assert.equal(m.status, "insufficient");
      assert.equal(m.feedback, "單字數不足 4 個，無法產生選項");
    }
    assert.equal(L.quizModel(undefined).status, "insufficient");
    assert.equal(L.quizModel({}).stats, "單字測驗累計：已答 0 題，答對 0 題");
  });

  test("只讀 state.runtime.flashcard，不讀扁平的 state.flashcard（§4.4 v0.3）", () => {
    const flat = { data: {}, flashcard: { index: 1, mode: "quiz", quiz: q0 }, studySet: set };
    assert.equal(L.quizModel(flat).status, "insufficient");
  });

  test("wordKey 不在目前索引時仍能找到單字；完全找不到時顯示 wordKey", () => {
    assert.equal(L.quizModel(st(q0, 0)).word, "book");
    assert.equal(L.quizModel(st({ ...q0, wordKey: "zzz" }, 0)).word, "zzz");
  });

  test("選項非字串不輸出 undefined/null", () => {
    const m = L.quizModel(st({ ...q0, options: [null, "書", undefined, 5] }, 1));
    assert.deepEqual(m.options.map((o) => o.text), ["", "書", "", "5"]);
  });

  test("selectedIndex 不合法視為未作答", () => {
    const m = L.quizModel(st({ ...q0, selectedIndex: 7 }, 1));
    assert.equal(m.answered, false);
  });

  // ── 與 store 串接 ──

  test("store 實際狀態：進入測驗模式 → quizModel 可組出題目；作答後統計更新（AC-09-01、AC-09-03、AC-09-04）", () => {
    const { a, store } = F.makeStore();
    assert.deepEqual(a.setFlashcardMode("quiz"), { ok: true });
    let s = store.getState();
    assert.equal(s.runtime.flashcard.mode, "quiz");
    let m = L.quizModel(s);
    assert.equal(m.status, "ok");
    assert.equal(m.word, "the");
    assert.equal(m.options.length, 4);
    assert.equal(m.stats, "單字測驗累計：已答 0 題，答對 0 題");

    const correct = s.runtime.flashcard.quiz.correctIndex;
    a.answerVocabQuiz(correct);
    s = store.getState();
    m = L.quizModel(s);
    assert.equal(m.isCorrect, true);
    assert.equal(m.stats, "單字測驗累計：已答 1 題，答對 1 題");
  });

  test("測驗模式中單字集變少：目前題目保留；換卡出題失敗自動退回 card、統計不變（§4.3 v0.3）", () => {
    const content = F.loadContent({ MASTER_VOCAB_DATABASE: [], VOCAB_MANIFEST: undefined });
    const { a, store } = F.makeStore({ content: content });
    const ids = ["Alpha:甲", "Beta:乙", "Gamma:丙", "Delta:丁"].map((p) => a.addCustomWord(F.customFields(...p.split(":"))).item.id);
    assert.deepEqual(a.setFlashcardMode("quiz"), { ok: true });
    const before = store.getState();
    const quiz = before.runtime.flashcard.quiz;
    const statsBefore = JSON.stringify(before.data.vocabQuiz);

    // (1) 刪掉非目前的卡：目前卡片仍在新集合 → 保留同一題（4 選項仍可作答）
    a.deleteCustomWord(ids[3]);
    let s = store.getState();
    assert.equal(s.runtime.studySet.length, 3);
    assert.equal(s.runtime.flashcard.mode, "quiz");
    assert.deepEqual(s.runtime.flashcard.quiz, quiz);
    assert.equal(L.quizModel(s).status, "ok");

    // (2) 換卡需要出新題，單字不足 → 自動退回 card、quiz = null、正面
    const tags = [];
    const off = store.subscribe((_st, t) => tags.push(...t));
    a.gotoCard(1);
    off();
    s = store.getState();
    assert.deepEqual(s.runtime.flashcard, { index: 1, isFlipped: false, mode: "card", quiz: null });
    assert.equal(s.runtime.speech.lastResult, null);
    assert.equal(JSON.stringify(s.data.vocabQuiz), statsBefore, "統計不變");
    assert.ok(!tags.includes("storage"), "自動退回不發 storage 提示");
    assert.equal(L.quizModel(s).status, "insufficient");

    // (3) 之後再點「測驗模式」才回 insufficient（由 FE-11 顯示 AC-09-06 訊息），維持 card
    assert.deepEqual(a.setFlashcardMode("quiz"), { ok: false, reason: "insufficient" });
    assert.equal(store.getState().runtime.flashcard.mode, "card");
  });

  test("測驗模式中刪除目前的卡且單字不足 → 直接退回 card（§4.3 v0.3）", () => {
    const content = F.loadContent({ MASTER_VOCAB_DATABASE: [], VOCAB_MANIFEST: undefined });
    const { a, store } = F.makeStore({ content: content });
    const ids = ["Alpha:甲", "Beta:乙", "Gamma:丙", "Delta:丁"].map((p) => a.addCustomWord(F.customFields(...p.split(":"))).item.id);
    a.setFlashcardMode("quiz");
    a.deleteCustomWord(ids[0]);
    const s = store.getState();
    assert.equal(s.runtime.flashcard.mode, "card");
    assert.equal(s.runtime.flashcard.quiz, null);
    assert.equal(s.runtime.flashcard.isFlipped, false);
  });
});

// ── FE-29：答題回饋（architecture.md v0.4 §7.10、§7.11、§10.1；AC-29-01、AC-28-06、AC-09-03） ──
describe("flashcard-quiz.test.js — 答題回饋（FE-29）", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const { UI } = require("../core/interaction.js");

  test("feedbackOf：首次作答答對 → 正確選項 pop、震動 correct", () => {
    assert.deepEqual(L.feedbackOf(null, 2, 2), { result: "correct", index: 2, className: "qz-opt--pop", haptic: "correct" });
  });

  test("feedbackOf：首次作答答錯 → 所選選項 shake、震動 wrong", () => {
    assert.deepEqual(L.feedbackOf(null, 0, 3), { result: "wrong", index: 0, className: "qz-opt--shake", haptic: "wrong" });
  });

  test("feedbackOf：已鎖定再點、store 忽略、資料不合法 → null（不播動畫、不震動）", () => {
    assert.equal(L.feedbackOf(1, 1, 1), null);
    assert.equal(L.feedbackOf(0, 0, 3), null);
    assert.equal(L.feedbackOf(null, null, 2), null);
    assert.equal(L.feedbackOf(undefined, 1, 1), null);
    assert.equal(L.feedbackOf(null, 4, 1), null);
    assert.equal(L.feedbackOf(null, 1, -1), null);
  });

  test("feedbackOf 搭配 store：前後比較 selectedIndex；已鎖定再點為 null 且計數不變", () => {
    const content = F.loadContent({ MASTER_VOCAB_DATABASE: [], VOCAB_MANIFEST: undefined });
    const { a, store } = F.makeStore({ content: content });
    ["Alpha:甲", "Beta:乙", "Gamma:丙", "Delta:丁", "Echo:戊"].forEach((p) => a.addCustomWord(F.customFields(...p.split(":"))));
    a.setFlashcardMode("quiz");
    const q0 = store.getState().runtime.flashcard.quiz;
    const answered0 = store.getState().data.vocabQuiz.answered;
    const wrong = (q0.correctIndex + 1) % 4;
    a.answerVocabQuiz(wrong);
    const q1 = store.getState().runtime.flashcard.quiz;
    const fb = L.feedbackOf(q0.selectedIndex, q1.selectedIndex, q1.correctIndex);
    assert.deepEqual(fb, { result: "wrong", index: wrong, className: "qz-opt--shake", haptic: "wrong" });
    // 已鎖定再點：前為非 null → null，計數不變
    a.answerVocabQuiz(q1.correctIndex);
    const q2 = store.getState().runtime.flashcard.quiz;
    assert.equal(L.feedbackOf(q1.selectedIndex, q2.selectedIndex, q2.correctIndex), null);
    assert.equal(store.getState().data.vocabQuiz.answered, answered0 + 1);
  });

  test("shouldIgnoreClick：觸控位移 ≥ 10 後 350 ms 內 click 忽略，之後恢復", () => {
    let t = L.touchBegin(null, 100, 100);
    t = L.touchMove(t, 106, 108); // hypot = 10
    assert.equal(t.moved, true);
    t = L.touchFinish(t, 1000);
    assert.equal(t.suppressUntil, 1000 + UI.CLICK_SUPPRESS_MS);
    assert.equal(L.shouldIgnoreClick(t, 1000), true);
    assert.equal(L.shouldIgnoreClick(t, 1349), true);
    assert.equal(L.shouldIgnoreClick(t, 1350), false);
    assert.equal(L.shouldIgnoreClick(t, 5000), false);
  });

  test("shouldIgnoreClick：位移 < 10 的點擊、滑鼠或鍵盤（無觸控狀態）不忽略", () => {
    let t = L.touchBegin(null, 100, 100);
    t = L.touchMove(t, 105, 108); // hypot ≈ 9.43
    assert.equal(t.moved, false);
    t = L.touchFinish(t, 1000);
    assert.equal(L.shouldIgnoreClick(t, 1000), false);
    assert.equal(L.shouldIgnoreClick(null, 1000), false);
    assert.equal(L.shouldIgnoreClick({}, 1000), false);
  });

  test("觸控狀態：一經滑動不因回到原點而取消；新觸控清除 moved 但保留時間窗；多指視為滑動；不修改輸入", () => {
    let t = L.touchBegin(null, 0, 0);
    t = L.touchMove(t, 0, 30);
    t = L.touchMove(t, 0, 0);
    assert.equal(t.moved, true);
    t = L.touchFinish(t, 2000);
    const t2 = L.touchBegin(t, 5, 5);
    assert.equal(t2.moved, false);
    assert.equal(t2.suppressUntil, 2000 + UI.CLICK_SUPPRESS_MS);
    assert.equal(L.touchBegin(null, NaN, NaN).moved, true);
    const frozen = Object.freeze(L.touchBegin(null, 1, 1));
    assert.doesNotThrow(() => L.touchFinish(Object.freeze(L.touchMove(frozen, 50, 1)), 10));
  });

  test("原始碼：不呼叫 Math.random、不直接改計數、不直接呼叫震動 API、無 animationend 依賴", () => {
    const src = fs.readFileSync(path.join(__dirname, "..", "views", "flashcard-quiz.js"), "utf8");
    assert.doesNotMatch(src, /Math\.random/);
    assert.doesNotMatch(src, /navigator\.vibrate/);
    assert.doesNotMatch(src, /animationend/);
    assert.doesNotMatch(src, /(answered|correct|selectedIndex)\s*(\+\+|\+=|-=)/);
    assert.doesNotMatch(src, /innerHTML|outerHTML|insertAdjacentHTML|document\.write/);
    assert.match(src, /passive:\s*true/);
  });

  test("32-quiz.css：pop／shake 關鍵影格只改 transform，時長使用 var(--emt-dur-answer)", () => {
    const css = fs.readFileSync(path.join(__dirname, "..", "styles", "32-quiz.css"), "utf8");
    assert.match(css, /\.qz-opt--pop\s*\{[^}]*animation:\s*qz-opt-pop\s+var\(--emt-dur-answer\)/);
    assert.match(css, /\.qz-opt--shake\s*\{[^}]*animation:\s*qz-opt-shake\s+var\(--emt-dur-answer\)/);
    const pop = css.match(/@keyframes qz-opt-pop\s*\{([\s\S]*?)\n\}/)[1];
    const shake = css.match(/@keyframes qz-opt-shake\s*\{([\s\S]*?)\n\}/)[1];
    assert.deepEqual(pop.match(/scale\([^)]*\)/g), ["scale(1)", "scale(1.06)", "scale(1)"]);
    assert.deepEqual(shake.match(/translateX\([^)]*\)/g),
      ["translateX(0)", "translateX(-6px)", "translateX(6px)", "translateX(-4px)", "translateX(4px)", "translateX(0)"]);
    for (const body of [pop, shake]) {
      assert.ok(body.match(/[a-z-]+(?=\s*:)/g).every((p) => p === "transform"), "關鍵影格只能改 transform");
    }
  });
});
