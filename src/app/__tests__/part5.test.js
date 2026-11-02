/*
 * part5.test.js — Part 5 練習頁畫面模型單元測試（FE-14 測試移入，FE-19）
 * 受測：views/part5.js 匯出的純邏輯（splitSentence、splitStructure、optionState、buildViewModel）
 * 涵蓋：AC-10-02、AC-11-01、AC-11-02、AC-11-05、AC-11-07、C-6、C-7
 * 資料：一律使用 _fixtures.js（不讀正式內容資料檔）；題庫筆數（≥ 200、每題型 ≥ 50）屬 validate.mjs 的範圍
 */
"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const P = require("../views/part5.js");
const C = require("../core/constants.js");
const F = require("./_fixtures.js");

describe("part5.test.js", () => {
  test("splitSentence 依空格切段", () => {
    assert.deepEqual(P.splitSentence("A _____ b."), [{ kind: "text", text: "A " }, { kind: "blank" }, { kind: "text", text: " b." }]);
    assert.deepEqual(P.splitSentence("_____ x"), [{ kind: "blank" }, { kind: "text", text: " x" }]);
    assert.deepEqual(P.splitSentence("x _____"), [{ kind: "text", text: "x " }, { kind: "blank" }]);
    assert.deepEqual(P.splitSentence("no blank"), [{ kind: "text", text: "no blank" }]);
    assert.deepEqual(P.splitSentence(null), []);
    assert.deepEqual(P.splitSentence("<b>_____</b>"), [{ kind: "text", text: "<b>" }, { kind: "blank" }, { kind: "text", text: "</b>" }]);
  });

  test("splitStructure 只以前後空白的斜線分行", () => {
    assert.deepEqual(P.splitStructure("S: A / V: b / O: c / 修飾語: 讓步/因果"), ["S: A", "V: b", "O: c", "修飾語: 讓步/因果"]);
    assert.deepEqual(P.splitStructure("S: x / O: 無（被動語態）/ 修飾語: be responsible for + 名詞/V-ing"),
      ["S: x", "O: 無（被動語態）", "修飾語: be responsible for + 名詞/V-ing"]);
    assert.deepEqual(P.splitStructure(""), []);
    assert.deepEqual(P.splitStructure(undefined), []);
  });

  test("optionState 標色規則（AC-11-01）", () => {
    assert.equal(P.optionState(0, null, 1), "idle");
    // 選對：只有正解標綠
    assert.deepEqual([0, 1, 2, 3].map((i) => P.optionState(i, 1, 1)), ["locked", "correct", "locked", "locked"]);
    // 選錯：所選標紅、正解標綠
    assert.deepEqual([0, 1, 2, 3].map((i) => P.optionState(i, 3, 1)), ["locked", "correct", "locked", "wrong"]);
  });

  const q = (i, c) => ({
    id: "p5-00" + i, type: "connector", sentence: "S" + i + " _____ x.", options: ["a", "b", "c", "d"], correctIndex: c,
    explanation: { coreStrategy: "core" + i, structure: "S: a / V: b" }, source: "ORIGINAL"
  });
  const base = { currentIndex: 0, lockedSelection: null, phase: "question", roundAnswered: 0, roundCorrect: 0, totalAnswered: 0, totalCorrect: 0 };

  test("buildViewModel 空題庫（C-6）", () => {
    assert.equal(P.buildViewModel(base, []).kind, "empty");
    assert.equal(P.buildViewModel(base, undefined).kind, "empty");
    assert.equal(P.buildViewModel(null, null).kind, "empty");
  });

  test("buildViewModel 作答與鎖定", () => {
    const bank = [q(1, 0), q(2, 2), q(3, 3)];
    let v = P.buildViewModel({ ...base, currentIndex: 1 }, bank);
    assert.equal(v.kind, "question");
    assert.equal(v.number, 2);
    assert.equal(v.total, 3);
    assert.equal(v.typeLabel, "讓步/因果連接詞");
    assert.equal(v.locked, null);
    assert.ok(v.options.every((o) => o.state === "idle"));
    assert.deepEqual(v.options.map((o) => o.letter + o.text), ["Aa", "Bb", "Cc", "Dd"]);
    v = P.buildViewModel({ ...base, currentIndex: 1, lockedSelection: 0 }, bank);
    assert.equal(v.isCorrect, false);
    assert.deepEqual(v.options.map((o) => o.state), ["wrong", "locked", "correct", "locked"]);
    assert.equal(v.explanation.coreStrategy, "core2");
    assert.deepEqual(v.explanation.structureLines, ["S: a", "V: b"]);
    // 超出題庫 → 第 1 題（V-ST-05 防禦）
    assert.equal(P.buildViewModel({ ...base, currentIndex: 9 }, bank).number, 1);
    // 未知題型 → 不顯示標籤
    assert.equal(P.buildViewModel(base, [{ ...q(1, 0), type: "x" }]).typeLabel, "");
    // 資料缺漏不拋例外
    const bad = P.buildViewModel(base, [{}]);
    assert.equal(bad.valid, false);
    assert.equal(bad.options.length, 4);
  });

  test("buildViewModel 結算（AC-11-07）", () => {
    const v = P.buildViewModel({ ...base, phase: "summary", roundAnswered: 3, roundCorrect: 2, totalAnswered: 10, totalCorrect: 7 }, [q(1, 0)]);
    assert.deepEqual(v, { kind: "summary", roundCorrect: 2, roundAnswered: 3, totalCorrect: 7, totalAnswered: 10 });
  });

  test("fixture 題庫（符合 Part5Question，4 題型）每題皆可組出完整畫面（AC-10-02、AC-11-02）", () => {
    const bank = F.part5();
    bank.forEach((item, i) => {
      const v = P.buildViewModel({ ...base, currentIndex: i, lockedSelection: 0 }, bank);
      assert.ok(v.valid, item.id);
      assert.equal(v.segments.filter((s) => s.kind === "blank").length, 1, item.id);
      assert.equal(v.typeLabel, C.PART5_TYPE_LABELS[item.type], item.id);
      assert.ok(v.explanation.coreStrategy, item.id);
      assert.deepEqual(v.explanation.structureLines.map((l) => l.split(":")[0]), ["S", "V", "O", "修飾語"], item.id);
      assert.equal(v.options.filter((o) => o.state === "correct").length, 1, item.id);
    });
    // 四種題型標籤都能顯示
    const labels = bank.map((item, i) => P.buildViewModel({ ...base, currentIndex: i }, bank).typeLabel);
    assert.deepEqual(labels.slice().sort(), Object.values(C.PART5_TYPE_LABELS).slice().sort());
  });

  test("重新載入後回到同一題（AC-11-05）：store 保存的 currentIndex 經 buildViewModel 顯示為同一題", () => {
    const storage = F.fakeStorage();
    const s1 = F.makeStore({ storage: storage });
    const bank = F.part5();
    // 第 1、2 題作答並前進到第 3 題（未作答）
    s1.a.answerPart5(0);
    s1.a.nextPart5();
    s1.a.answerPart5(1);
    s1.a.nextPart5();
    const p1 = s1.store.getState().data.part5;
    assert.equal(p1.currentIndex, 2);
    assert.equal(p1.lockedSelection, null);

    // 以同一個 storage 重新建立 store（模擬重新載入）
    const s2 = F.makeStore({ storage: storage });
    const p2 = s2.store.getState().data.part5;
    assert.deepEqual(p2, p1);
    const v = P.buildViewModel(p2, bank);
    assert.equal(v.kind, "question");
    assert.equal(v.number, 3);
    assert.equal(v.total, 4);
    assert.equal(v.locked, null);
  });

  test("原始碼不含禁用 API、不直接改計數、不碰 localStorage（C-7）", () => {
    const src = fs.readFileSync(path.join(__dirname, "..", "views", "part5.js"), "utf8");
    assert.doesNotMatch(src, /innerHTML|outerHTML|insertAdjacentHTML|document\.write/);
    assert.doesNotMatch(src, /(roundAnswered|roundCorrect|totalAnswered|totalCorrect|currentIndex|lockedSelection)\s*(=[^=]|\+\+|\+=|-=)/);
    assert.doesNotMatch(src, /localStorage/);
  });
});

// ── FE-29：答題回饋（architecture.md v0.4 §7.10、§7.11、§10.1；AC-29-01、AC-28-06、AC-11-01、AC-11-06） ──
describe("part5.test.js — 答題回饋（FE-29）", () => {
  const { UI } = require("../core/interaction.js");

  test("feedbackOf：首次作答答對 → 正確選項 pop、震動 correct", () => {
    assert.deepEqual(P.feedbackOf(null, 1, 1), { result: "correct", index: 1, className: "p5-opt--pop", haptic: "correct" });
  });

  test("feedbackOf：首次作答答錯 → 所選選項 shake、震動 wrong", () => {
    assert.deepEqual(P.feedbackOf(null, 3, 0), { result: "wrong", index: 3, className: "p5-opt--shake", haptic: "wrong" });
  });

  test("feedbackOf：已鎖定再點、store 忽略、資料不合法 → null", () => {
    assert.equal(P.feedbackOf(2, 2, 2), null);
    assert.equal(P.feedbackOf(0, 0, 1), null);
    assert.equal(P.feedbackOf(null, null, 1), null);
    assert.equal(P.feedbackOf(undefined, 1, 1), null);
    assert.equal(P.feedbackOf(null, 1, undefined), null);
    assert.equal(P.feedbackOf(null, 1.5, 1), null);
  });

  test("feedbackOf 搭配 store：前後比較 lockedSelection；鎖定後再點計數不變且為 null；重新載入只鎖定不回饋", () => {
    const storage = F.fakeStorage();
    const { a, store } = F.makeStore({ storage: storage });
    const bank = F.part5();
    const s0 = store.getState().data.part5;
    assert.equal(s0.lockedSelection, null);
    const correctIndex = bank[s0.currentIndex].correctIndex;
    const wrong = (correctIndex + 1) % 4;
    assert.equal(a.answerPart5(wrong).ok, true);
    const s1 = store.getState().data.part5;
    assert.deepEqual(P.feedbackOf(s0.lockedSelection, s1.lockedSelection, correctIndex),
      { result: "wrong", index: wrong, className: "p5-opt--shake", haptic: "wrong" });
    // 已鎖定再點
    assert.equal(a.answerPart5(correctIndex).ok, false);
    const s2 = store.getState().data.part5;
    assert.equal(P.feedbackOf(s1.lockedSelection, s2.lockedSelection, correctIndex), null);
    assert.equal(s2.totalAnswered, s1.totalAnswered);
    // 重新載入：從儲存還原後只標色（view 模型為 wrong／correct），沒有「前為 null」的點擊 → 不回饋
    const again = F.makeStore({ storage: storage });
    const s3 = again.store.getState().data.part5;
    assert.equal(s3.lockedSelection, wrong);
    const vm = P.buildViewModel(s3, bank);
    assert.equal(vm.options[wrong].state, "wrong");
    assert.equal(vm.options[correctIndex].state, "correct");
    assert.equal(P.feedbackOf(s3.lockedSelection, s3.lockedSelection, correctIndex), null);
  });

  test("shouldIgnoreClick：觸控位移 ≥ 10 後 350 ms 內 click 忽略、滑鼠 click 不忽略", () => {
    let t = P.touchBegin(null, 20, 20);
    t = P.touchMove(t, 30, 20);
    t = P.touchFinish(t, 500);
    assert.equal(P.shouldIgnoreClick(t, 500), true);
    assert.equal(P.shouldIgnoreClick(t, 500 + UI.CLICK_SUPPRESS_MS - 1), true);
    assert.equal(P.shouldIgnoreClick(t, 500 + UI.CLICK_SUPPRESS_MS), false);
    // 位移 9 → 點擊
    let tap = P.touchBegin(null, 20, 20);
    tap = P.touchFinish(P.touchMove(tap, 29, 20), 500);
    assert.equal(P.shouldIgnoreClick(tap, 500), false);
    // 滑鼠／鍵盤：沒有觸控狀態
    assert.equal(P.shouldIgnoreClick(null, 500), false);
  });

  test("原始碼：不呼叫 Math.random、不直接呼叫震動 API、無 animationend 依賴、觸控監聽為 passive", () => {
    const src = fs.readFileSync(path.join(__dirname, "..", "views", "part5.js"), "utf8");
    assert.doesNotMatch(src, /Math\.random/);
    assert.doesNotMatch(src, /navigator\.vibrate/);
    assert.doesNotMatch(src, /animationend/);
    assert.match(src, /passive:\s*true/);
  });

  test("40-part5.css：pop／shake 關鍵影格只改 transform，時長使用 var(--emt-dur-answer)；標題說明為次要色", () => {
    const css = fs.readFileSync(path.join(__dirname, "..", "styles", "40-part5.css"), "utf8");
    assert.match(css, /\.p5-opt--pop\s*\{[^}]*animation:\s*p5-opt-pop\s+var\(--emt-dur-answer\)/);
    assert.match(css, /\.p5-opt--shake\s*\{[^}]*animation:\s*p5-opt-shake\s+var\(--emt-dur-answer\)/);
    const pop = css.match(/@keyframes p5-opt-pop\s*\{([\s\S]*?)\n\}/)[1];
    const shake = css.match(/@keyframes p5-opt-shake\s*\{([\s\S]*?)\n\}/)[1];
    assert.deepEqual(pop.match(/scale\([^)]*\)/g), ["scale(1)", "scale(1.06)", "scale(1)"]);
    assert.deepEqual(shake.match(/translateX\([^)]*\)/g),
      ["translateX(0)", "translateX(-6px)", "translateX(6px)", "translateX(-4px)", "translateX(4px)", "translateX(0)"]);
    for (const body of [pop, shake]) {
      assert.ok(body.match(/[a-z-]+(?=\s*:)/g).every((p) => p === "transform"), "關鍵影格只能改 transform");
    }
    assert.match(css, /\.p5-heading-note\s*\{[^}]*color:\s*var\(--text-muted\)/);
  });
});
