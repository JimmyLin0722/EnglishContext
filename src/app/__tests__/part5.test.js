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

// ─────────────────────────────────────────────────────────────
// （v0.12，FE-61）作答進度條與內容寬（architecture.md v0.8 §7.19.6、§10.5 part5.test.js 列；契約 MT-1、MT-2）
// 涵蓋：AC-40-01、AC-40-02、AC-40-03
// 做法：node:vm 依瀏覽器方式載入 core/dom、constants、layout 與 views/part5.js；假 DOM 與假 store（只讀 part5 進度）
// ─────────────────────────────────────────────────────────────

describe("part5.test.js — 作答進度條（v0.12，FE-61）", () => {
  const vm = require("node:vm");
  const APP = path.join(__dirname, "..");

  function makeNode(tag) {
    const n = {
      nodeType: tag === "#text" ? 3 : 1,
      tagName: tag.toUpperCase(),
      className: "",
      attrs: {},
      style: {},
      childNodes: [],
      _text: "",
      setAttribute(k, v) { this.attrs[k] = String(v); },
      getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
      removeAttribute(k) { delete this.attrs[k]; },
      addEventListener() {},
      appendChild(c) { this.childNodes.push(c); c.parentNode = this; return c; },
      removeChild(c) { this.childNodes.splice(this.childNodes.indexOf(c), 1); return c; },
      querySelector() { return null; },
      get firstChild() { return this.childNodes[0] || null; },
      get textContent() { return this.nodeType === 3 ? this._text : this._text + this.childNodes.map((c) => c.textContent).join(""); },
      set textContent(v) { this.childNodes = []; this._text = String(v); }
    };
    return n;
  }
  const fakeDoc = () => ({
    createElement: (t) => makeNode(t),
    createElementNS: (ns, t) => makeNode(t),
    createTextNode: (t) => { const n = makeNode("#text"); n._text = t; return n; }
  });
  function findAll(n, pred, out = []) {
    if (n.nodeType === 1 && pred(n)) out.push(n);
    for (const c of n.childNodes || []) findAll(c, pred, out);
    return out;
  }

  /** 題庫 n 題（以 fixture 4 題輪替，id 不重複） */
  function bankOf(n) {
    const src = F.part5();
    return Array.from({ length: n }, (_, i) => Object.assign({}, src[i % src.length], { id: "q" + (i + 1) }));
  }

  /**
   * 載入 part5 並 mount，回傳根節點。
   * @param {object} part5 Part5Progress
   * @param {object[]} bank 題庫
   */
  function renderWith(part5, bank) {
    const sandbox = { console: { log() {}, warn() {}, error() {} } };
    sandbox.self = sandbox;
    vm.createContext(sandbox);
    for (const rel of ["core/constants.js", "core/dom.js", "core/layout.js"]) {
      vm.runInContext(fs.readFileSync(path.join(APP, rel), "utf8"), sandbox, { filename: rel });
    }
    sandbox.EMT.core.dom.setDocument(fakeDoc());
    let view = null;
    sandbox.EMT.views = { register: (tab, m) => { if (tab === "part5") view = m; } };
    sandbox.EMT.content = { part5: bank };
    sandbox.EMT.store = {
      getState: () => ({ data: { part5 } }),
      subscribe: () => () => {},
      actions: {}
    };
    vm.runInContext(fs.readFileSync(path.join(APP, "views/part5.js"), "utf8"), sandbox, { filename: "views/part5.js" });
    const rootEl = fakeDoc().createElement("section");
    view.mount(rootEl);
    return rootEl;
  }

  const prog = (over) => Object.assign({
    currentIndex: 0, lockedSelection: null, phase: "question", roundAnswered: 0, roundCorrect: 0, totalAnswered: 0, totalCorrect: 0
  }, over);
  const barOf = (rootEl) => findAll(rootEl, (n) => n.className === "p5-progress");

  for (const [label, part5, n, now, pct] of [
    ["第 1 題", prog({ currentIndex: 0 }), 10, 1, 10],
    ["第 5 題", prog({ currentIndex: 4 }), 10, 5, 50],
    ["第 N 題", prog({ currentIndex: 9 }), 10, 10, 100],
    ["第 1 題（N = 3，1 ÷ 3）", prog({ currentIndex: 0 }), 3, 1, 33.3],
    ["結算（aria-valuenow = N、100%）", prog({ phase: "summary", currentIndex: 9 }), 10, 10, 100],
  ]) {
    test("MT-1 " + label + "：role=progressbar、aria-label、valuemin 0、valuemax N、valuenow、填色寬度", () => {
      const rootEl = renderWith(part5, bankOf(n));
      const bars = barOf(rootEl);
      assert.equal(bars.length, 1);
      const bar = bars[0];
      assert.equal(bar.getAttribute("role"), "progressbar");
      assert.equal(bar.getAttribute("aria-label"), "作答進度");
      assert.equal(bar.getAttribute("aria-valuemin"), "0");
      assert.equal(bar.getAttribute("aria-valuemax"), String(n));
      assert.equal(bar.getAttribute("aria-valuenow"), String(now));
      const fill = bar.childNodes[0];
      assert.equal(fill.className, "p5-progress__fill");
      assert.equal(fill.style.width, pct + "%");
      // 與畫面「第 i / N 題」一致（question 時）
      if (part5.phase === "question") {
        assert.ok(rootEl.textContent.includes(now + " / " + n), rootEl.textContent.slice(0, 80));
      }
    });
  }

  test("位置：h2.p5-heading 之後、題型說明之前；h2 套 .page-title", () => {
    const rootEl = renderWith(prog({}), bankOf(4));
    const page = findAll(rootEl, (n) => n.className === "p5")[0];
    const kids = page.childNodes;
    assert.equal(kids[0].tagName, "H2");
    assert.ok(/(^| )p5-heading( |$)/.test(kids[0].className) && /(^| )page-title( |$)/.test(kids[0].className));
    assert.equal(kids[1].className, "p5-progress");
    assert.equal(kids[2].className, "p5-heading-note");
  });

  test("空題庫：不建立進度條（MT-1 N = 0）", () => {
    const rootEl = renderWith(prog({}), []);
    assert.equal(barOf(rootEl).length, 0);
    assert.ok(rootEl.textContent.includes(P.TEXT.empty));
  });

  test("40-part5.css：.p5 max-width var(--content-narrow) 置中；進度條 6px --track、填色 --brand、transition: none；標題 18px／700", () => {
    const css = fs.readFileSync(path.join(APP, "styles", "40-part5.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const rule = (sel) => {
      const m = new RegExp("(?:^|\\})\\s*" + sel.replace(/[.]/g, "\\.") + "\\s*\\{([^}]*)\\}").exec(css);
      assert.ok(m, sel);
      return m[1];
    };
    const v = (r, p) => (new RegExp("(?:^|;|\\s)" + p + ":\\s*([^;]+);").exec(r) || [])[1];
    assert.equal(v(rule(".p5"), "max-width"), "var(--content-narrow)");
    assert.equal(v(rule(".p5"), "margin-inline"), "auto");
    assert.equal(v(rule(".p5-progress"), "height"), "6px");
    assert.equal(v(rule(".p5-progress"), "background"), "var(--track)");
    assert.equal(v(rule(".p5-progress__fill"), "background"), "var(--brand)");
    assert.equal(v(rule(".p5-progress__fill"), "transition"), "none");
    for (const sel of [".p5-number", ".p5-explain__title", ".p5-summary__title"]) {
      assert.equal(v(rule(sel), "font-size"), "1.125rem", sel);
      assert.equal(v(rule(sel), "font-weight"), "700", sel);
    }
    // 作答選項維持 --border 外框與對錯色（AC-38-03、AC-40-03）
    assert.match(rule(".p5-option"), /border:\s*2px solid var\(--border\)/);
    assert.match(rule(".p5-option--correct"), /border-color:\s*var\(--correct\)/);
    assert.match(rule(".p5-option--wrong"), /border-color:\s*var\(--wrong\)/);
  });
});
