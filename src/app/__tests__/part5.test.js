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
    // （v0.15，FE-75）各 kind 另附 k、q、only（未傳 record → k 0、only false）
    assert.deepEqual(v, { kind: "summary", roundCorrect: 2, roundAnswered: 3, totalCorrect: 7, totalAnswered: 10, k: 0, q: 1, only: false });
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
    for (const rel of ["core/constants.js", "core/dom.js", "core/layout.js", "core/part5flow.js"]) {
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

  test("位置：h2.p5-heading 之後、（v0.15）答對紀錄列與題型說明之前；h2 套 .page-title", () => {
    const rootEl = renderWith(prog({}), bankOf(4));
    const page = findAll(rootEl, (n) => n.className === "p5")[0];
    const kids = page.childNodes;
    assert.equal(kids[0].tagName, "H2");
    assert.ok(/(^| )p5-heading( |$)/.test(kids[0].className) && /(^| )page-title( |$)/.test(kids[0].className));
    assert.equal(kids[1].className, "p5-progress");
    // （v0.15，FE-75）進度條與題型說明之間為 div.p5-record（§7.21.4）
    assert.equal(kids[2].className, "p5-record");
    assert.equal(kids[3].className, "p5-heading-note");
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

// ─────────────────────────────────────────────────────────────
// （v0.15，FE-75）答對紀錄：計數行、「✓ 曾答對」、只練沒答對開關、全部答對畫面、清除確認對話框
// 依據：architecture.md v0.10 §4.10、§7.21.4、§10.7 part5.test.js 列；契約 data-schema §15 PART5_RECORD_TEXTS、
//       README §5.11 CR-4、CR-6、CR-9、UO-1、UO-3、UO-7、§11.6 MT-1
// 涵蓋：AC-45-04、AC-45-05、AC-46-01、AC-46-06、AC-46-08、AC-47-08
// （v0.18，FE-81；architecture.md v0.13 §7.24.2、§10.10；契約 LV-2、LV-6、SM-1～SM-3、HN-1、CR-10；
//   AC-48-01、AC-48-06、AC-48-09、AC-48-10、AC-48-11、AC-48-12；V-ST-23、V-ST-25、V-ST-26、V-ST-27）
// 做法：node:vm 依瀏覽器方式載入 core 模組與 views/part5.js；假 DOM 支援事件、[data-*] 選擇器與焦點；
//       store 分為假 store（固定狀態、記錄 action 呼叫）與真 store（F.makeStore 整合）。
// ─────────────────────────────────────────────────────────────

describe("part5.test.js — 答對紀錄與只練沒答對（v0.15，FE-75）", () => {
  const vm = require("node:vm");
  const APP = path.join(__dirname, "..");
  const T = C.PART5_RECORD_TEXTS;

  /** 假 DOM 節點：支援事件、[attr="v"] 選擇器、focus、核取方塊 click 切換 */
  function makeEnv() {
    const env = { focused: null };
    function makeNode(tag) {
      const n = {
        nodeType: tag === "#text" ? 3 : 1,
        tagName: tag.toUpperCase(),
        className: "",
        attrs: {},
        style: {},
        childNodes: [],
        listeners: {},
        checked: false,
        _text: "",
        setAttribute(k, v) { this.attrs[k] = String(v); },
        getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
        hasAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k); },
        removeAttribute(k) { delete this.attrs[k]; },
        addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); },
        dispatch(type, ev) {
          const e = Object.assign({ type, target: this, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } }, ev || {});
          for (const fn of (this.listeners[type] || []).slice()) fn(e);
          return e;
        },
        click() {
          if (this.tagName === "INPUT" && this.attrs.type === "checkbox") {
            this.checked = !this.checked;
            this.dispatch("click");
            this.dispatch("change");
            return;
          }
          this.dispatch("click");
        },
        focus() { env.focused = this; },
        appendChild(c) { this.childNodes.push(c); c.parentNode = this; return c; },
        removeChild(c) { this.childNodes.splice(this.childNodes.indexOf(c), 1); return c; },
        querySelector(sel) { return findAll(this, matcher(sel))[0] || null; },
        get firstChild() { return this.childNodes[0] || null; },
        get textContent() { return this.nodeType === 3 ? this._text : this._text + this.childNodes.map((c) => c.textContent).join(""); },
        set textContent(v) { this.childNodes = []; this._text = String(v); }
      };
      return n;
    }
    env.doc = {
      createElement: (t) => makeNode(t),
      createElementNS: (ns, t) => makeNode(t),
      createTextNode: (t) => { const n = makeNode("#text"); n._text = t; return n; }
    };
    return env;
  }
  /** 只支援 [attr="v"] 串接的選擇器 */
  function matcher(sel) {
    const parts = [...String(sel).matchAll(/\[([\w-]+)="([^"]*)"\]/g)].map((m) => [m[1], m[2]]);
    return (n) => parts.length > 0 && parts.every(([k, v]) => n.getAttribute(k) === v);
  }
  function findAll(n, pred, out = []) {
    if (n.nodeType === 1 && pred(n)) out.push(n);
    for (const c of n.childNodes || []) findAll(c, pred, out);
    return out;
  }
  const q$ = (rootEl, name) => findAll(rootEl, matcher('[data-p5="' + name + '"]'));
  const one = (rootEl, name) => q$(rootEl, name)[0] || null;
  const tick = () => new Promise((r) => setImmediate(r));

  /**
   * 載入 part5 並 mount。
   * @param {{ store: object, bank: object[], confirm?: Function }} o
   *   store：假 store 或真 store（F.makeStore）；confirm：EMT.ui.dialog.confirm 替身
   */
  function mountWith(o) {
    const env = makeEnv();
    const sandbox = { console: { log() {}, warn() {}, error() {} }, setTimeout, clearTimeout };
    sandbox.self = sandbox;
    vm.createContext(sandbox);
    for (const rel of ["core/constants.js", "core/dom.js", "core/layout.js", "core/part5flow.js", "core/interaction.js"]) {
      vm.runInContext(fs.readFileSync(path.join(APP, rel), "utf8"), sandbox, { filename: rel });
    }
    sandbox.EMT.core.dom.setDocument(env.doc);
    let view = null;
    sandbox.EMT.views = { register: (tab, m) => { if (tab === "part5") view = m; } };
    sandbox.EMT.content = { part5: o.bank };
    sandbox.EMT.store = o.store;
    env.vibrations = [];
    env.animations = [];
    sandbox.EMT.ui = {
      dialog: { confirm: o.confirm || (() => Promise.resolve(false)) },
      motion: { enter(node, cls) { env.animations.push(cls); } }
    };
    sandbox.EMT.services = { haptics: { vibrate(kind) { env.vibrations.push(kind); } } };
    vm.runInContext(fs.readFileSync(path.join(APP, "views/part5.js"), "utf8"), sandbox, { filename: "views/part5.js" });
    const rootEl = env.doc.createElement("section");
    view.mount(rootEl);
    return { rootEl, env, view };
  }

  /** 假 store：固定 data，記錄 action 呼叫；subscribe 回呼可手動觸發 */
  function fakeStore(data, results) {
    const calls = [];
    const subs = [];
    const actions = {};
    for (const name of ["answerPart5", "nextPart5", "restartPart5", "setPart5UnansweredOnly", "clearPart5CorrectIds"]) {
      actions[name] = (...args) => {
        calls.push({ name, args });
        return (results && results[name]) || { ok: true, changed: true };
      };
    }
    return {
      calls,
      getState: () => ({ data }),
      subscribe: (fn) => { subs.push(fn); return () => {}; },
      notify: (tags) => subs.forEach((fn) => fn({ data }, tags || ["part5"])),
      actions
    };
  }

  /** 題庫 n 題（以 fixture 4 題輪替；id 依 p5-001 起編） */
  function bankOf(n) {
    const src = F.part5();
    return Array.from({ length: n }, (_, i) => Object.assign({}, src[i % src.length], { id: "p5-" + String(i + 1).padStart(3, "0") }));
  }
  const idsOf = (bank) => bank.map((x) => x.id);
  const prog = (over) => Object.assign({
    currentIndex: 0, lockedSelection: null, phase: "question", roundAnswered: 0, roundCorrect: 0, totalAnswered: 0, totalCorrect: 0
  }, over);
  const dataOf = (part5, ids, only) => ({ part5, part5CorrectIds: ids || [], part5UnansweredOnly: only === true });
  /** 文字在字串中出現的次數 */
  const countOf = (text, needle) => text.split(needle).length - 1;
  const cardOf = (rootEl, name) => findAll(rootEl, (n) => n.className === name)[0];

  // ── buildViewModel ──

  test("buildViewModel：4 種 kind 與 k、q、only；question 附 correctBadge；allCorrect 附 inSummary 與本輪結算", () => {
    const bank = bankOf(4);
    // empty
    assert.deepEqual(P.buildViewModel(prog(), [], null, { ids: ["p5-001"], only: true }), { kind: "empty", k: 0, q: 0, only: true });
    // question：未傳 record（既有呼叫相容）
    let v = P.buildViewModel(prog(), bank);
    assert.equal(v.kind, "question");
    assert.equal(v.k, 0);
    assert.equal(v.q, 4);
    assert.equal(v.only, false);
    assert.equal(v.correctBadge, false);
    // question：曾答對（未作答、已作答）
    v = P.buildViewModel(prog({ currentIndex: 1 }), bank, null, { ids: ["p5-002", "p5-999", "p5-002"], only: false });
    assert.equal(v.correctBadge, true);
    assert.equal(v.k, 1, "題庫外 id 與重複 id 不計（CR-3）");
    v = P.buildViewModel(prog({ currentIndex: 1, lockedSelection: 0 }), bank, null, { ids: ["p5-002"] });
    assert.equal(v.correctBadge, true);
    // summary
    v = P.buildViewModel(prog({ phase: "summary", roundAnswered: 2, roundCorrect: 1 }), bank, null, { ids: ["p5-001"], only: true });
    assert.equal(v.kind, "summary");
    assert.deepEqual([v.k, v.q, v.only], [1, 4, true]);
    // allCorrect：開關開啟、K = Q、未鎖定的題目畫面
    v = P.buildViewModel(prog({ currentIndex: 2 }), bank, null, { ids: idsOf(bank), only: true });
    assert.deepEqual(v, { kind: "allCorrect", inSummary: false, roundCorrect: 0, roundAnswered: 0, k: 4, q: 4, only: true });
    // allCorrect：phase summary 且 y ≥ 1 → inSummary（SM-3）
    v = P.buildViewModel(prog({ phase: "summary", roundAnswered: 3, roundCorrect: 2 }), bank, null, { ids: idsOf(bank), only: true });
    assert.deepEqual(v, { kind: "allCorrect", inSummary: true, roundCorrect: 2, roundAnswered: 3, k: 4, q: 4, only: true });
    // allCorrect：phase summary 但 y = 0、或題目畫面中途 y ≥ 1 → 不顯示本輪結算（SM-3、FB-65）
    v = P.buildViewModel(prog({ phase: "summary" }), bank, null, { ids: idsOf(bank), only: true });
    assert.equal(v.inSummary, false);
    v = P.buildViewModel(prog({ roundAnswered: 3, roundCorrect: 2 }), bank, null, { ids: idsOf(bank), only: true });
    assert.equal(v.inSummary, false);
    // K = Q 但鎖定作答中 → 仍為 question（UO-3 排除條件）
    v = P.buildViewModel(prog({ currentIndex: 3, lockedSelection: 1 }), bank, null, { ids: idsOf(bank), only: true });
    assert.equal(v.kind, "question");
    assert.equal(v.correctBadge, true);
    // K = Q 但開關關閉 → question
    assert.equal(P.buildViewModel(prog(), bank, null, { ids: idsOf(bank), only: false }).kind, "question");
    // record 型別不符 → 預設值
    v = P.buildViewModel(prog(), bank, null, { ids: "p5-001", only: "true" });
    assert.deepEqual([v.k, v.only], [0, false]);
  });

  test("buildViewModel questionState（LV-1）與選項狀態（LV-2、LV-6）：3 種狀態；本次作答結果優先；超出題庫以防禦後題號推導", () => {
    const bank = bankOf(4); // fixture 第 1 題為第一筆
    const c0 = bank[0].correctIndex;
    const wrong0 = (c0 + 1) % 4;
    const states = (v) => v.options.map((o) => o.state);
    // idle
    let v = P.buildViewModel(prog(), bank, null, { ids: [], only: false });
    assert.equal(v.questionState, "idle");
    assert.ok(states(v).every((s) => s === "idle"));
    // lockedReview：只有正解 correct，其餘 locked；locked 欄位維持 null（LV-4）
    v = P.buildViewModel(prog(), bank, null, { ids: ["p5-001"], only: false });
    assert.equal(v.questionState, "lockedReview");
    assert.equal(v.locked, null);
    assert.deepEqual(states(v), [0, 1, 2, 3].map((i) => (i === c0 ? "correct" : "locked")));
    // answered：曾答對仍以本次結果為準（含 v1.1.0 答錯殘留，LV-7）
    v = P.buildViewModel(prog({ lockedSelection: wrong0 }), bank, null, { ids: ["p5-001"], only: false });
    assert.equal(v.questionState, "answered");
    assert.equal(v.options[wrong0].state, "wrong");
    assert.equal(v.options[c0].state, "correct");
    // 開關開啟且曾答對：不會顯示，推導為 idle；K = Q 時為 allCorrect
    assert.equal(P.buildViewModel(prog(), bank, null, { ids: ["p5-001"], only: true }).questionState, "idle");
    // 超出題庫 → 第 1 題
    v = P.buildViewModel(prog({ currentIndex: 99 }), bank, null, { ids: ["p5-001"], only: false });
    assert.equal(v.number, 1);
    assert.equal(v.questionState, "lockedReview");
    // 資料不完整（LV-6）：全部 locked
    const bad = bankOf(2);
    bad[0] = Object.assign({}, bad[0], { correctIndex: 9 });
    v = P.buildViewModel(prog(), bad, null, { ids: ["p5-001"], only: false });
    assert.equal(v.questionState, "lockedReview");
    assert.equal(v.valid, false);
    assert.ok(states(v).every((s) => s === "locked"));
    // 正解合法但句子為空：同樣不標綠
    bad[0] = Object.assign({}, bankOf(1)[0], { sentence: "" });
    v = P.buildViewModel(prog(), bad, null, { ids: ["p5-001"], only: false });
    assert.ok(states(v).every((s) => s === "locked"));
    // 沒有合法 id → idle（AC-48-09 (d)）
    bad[0] = Object.assign({}, bankOf(1)[0], { id: "" });
    v = P.buildViewModel(prog(), bad, null, { ids: ["", "null"], only: false });
    assert.equal(v.questionState, "idle");
    assert.equal(v.correctBadge, false);
  });

  test("FALLBACK_RECORD_TEXTS 與 constants.PART5_RECORD_TEXTS 逐字、逐鍵順序相同（§4.11）", () => {
    const src = fs.readFileSync(path.join(APP, "views", "part5.js"), "utf8").replace(/\r\n/g, "\n");
    const m = /var FALLBACK_RECORD_TEXTS = (\{[\s\S]*?\n  \});/.exec(src);
    assert.ok(m, "找不到 FALLBACK_RECORD_TEXTS");
    const fallback = vm.runInNewContext("(" + m[1] + ")");
    assert.equal(JSON.stringify(fallback), JSON.stringify(C.PART5_RECORD_TEXTS));
  });

  test("RECORD_TEXT 為定稿文字（§7.24.3）；確認內文逐字包含契約兩段；fillText 以 split／join 代入", () => {
    assert.deepEqual(Object.keys(P.RECORD_TEXT), ["confirmTitle", "confirmMessage"]);
    assert.equal(P.RECORD_TEXT.confirmTitle, "清除答對紀錄");
    assert.equal(P.RECORD_TEXT.confirmMessage, "將清除全部題目的答對紀錄，「已答對」會回到 0 題，並從第 1 題重新開始。累計答題數與正確率不受影響。");
    for (const part of T.clearConfirmMustInclude) assert.ok(P.RECORD_TEXT.confirmMessage.includes(part), part);
    assert.equal(P.fillText(T.correctCount, { k: 0, q: 200 }), "已答對 0 / 200 題");
    assert.equal(P.fillText(T.allCorrectTitle, { q: 200 }), "200 題全部答對！");
    assert.equal(P.fillText(null, { k: 1 }), "");
  });

  // ── 畫面 ──

  const bank200 = bankOf(200);
  const screens = [
    ["question", dataOf(prog({ currentIndex: 4 }), [])],
    ["summary", dataOf(prog({ phase: "summary", currentIndex: 199, roundAnswered: 5, roundCorrect: 3 }), ["p5-001"])],
    ["allCorrect", dataOf(prog({ phase: "summary", currentIndex: 199, roundAnswered: 2, roundCorrect: 2 }), idsOf(bank200), true)]
  ];
  for (const [kind, data] of screens) {
    test("三種畫面各恰 1 個計數行與 1 個開關（" + kind + "；AC-45-05、AC-46-01）", () => {
      const { rootEl } = mountWith({ store: fakeStore(data), bank: bank200 });
      const counts = q$(rootEl, "correct-count");
      const onlys = q$(rootEl, "only");
      assert.equal(counts.length, 1);
      assert.equal(onlys.length, 1);
      assert.equal(q$(rootEl, "only-label").length, 1);
      const k = kind === "question" ? 0 : kind === "summary" ? 1 : 200;
      assert.equal(counts[0].textContent, "已答對 " + k + " / 200 題");
      assert.equal(counts[0].tagName, "P");
      assert.equal(counts[0].className, "p5-record__count");
      const input = onlys[0];
      assert.equal(input.tagName, "INPUT");
      assert.equal(input.getAttribute("type"), "checkbox");
      assert.equal(input.checked, data.part5UnansweredOnly);
      const label = one(rootEl, "only-label");
      assert.equal(label.tagName, "LABEL");
      assert.equal(label.className, "p5-only");
      assert.equal(label.childNodes[0], input);
      assert.equal(label.childNodes[1].className, "p5-only__text");
      assert.equal(label.textContent, "只練沒答對的題目");
      // 位置：.p5 的第 3 個子節點（進度條之後、題型說明之前）
      const page = findAll(rootEl, (n) => n.className === "p5")[0];
      assert.equal(page.childNodes[1].className, "p5-progress");
      assert.equal(page.childNodes[2].className, "p5-record");
      assert.equal(page.childNodes[3].className, "p5-heading-note");
      // 不顯示題目 id、不含「範本」（CR-9）
      assert.doesNotMatch(rootEl.textContent, /p5-\d{3}|範本/);
    });
  }

  test("空題庫：不建立計數行與開關（SD-FB-64）", () => {
    const { rootEl } = mountWith({ store: fakeStore(dataOf(prog(), ["p5-001"], true)), bank: [] });
    assert.equal(q$(rootEl, "correct-count").length, 0);
    assert.equal(q$(rootEl, "only").length, 0);
    assert.equal(findAll(rootEl, (n) => n.className === "p5-record").length, 0);
  });

  test("曾答對題（lockedReview、answered）顯示「✓ 曾答對」於 .p5-meta 題型標籤後；lockedReview 選項全部停用（AC-45-04、LV-2）", () => {
    const bank = bankOf(10);
    // 已答對鎖定檢視
    let { rootEl } = mountWith({ store: fakeStore(dataOf(prog({ currentIndex: 4 }), ["p5-005"])), bank });
    let badge = q$(rootEl, "correct-badge");
    assert.equal(badge.length, 1);
    assert.equal(badge[0].textContent, "✓ 曾答對");
    assert.equal(badge[0].tagName, "SPAN");
    assert.equal(badge[0].className, "p5-badge");
    const meta = findAll(rootEl, (n) => n.className === "p5-meta")[0];
    const kids = meta.childNodes.map((n) => n.getAttribute("data-p5"));
    assert.deepEqual(kids, ["number", "type", "correct-badge"]);
    const opts = q$(rootEl, "option");
    assert.equal(opts.length, 4);
    assert.ok(opts.every((b) => b.hasAttribute("disabled")), "曾答對不可作答（LV-3）");
    // 已作答
    ({ rootEl } = mountWith({ store: fakeStore(dataOf(prog({ currentIndex: 4, lockedSelection: 0 }), ["p5-005"])), bank }));
    assert.equal(q$(rootEl, "correct-badge").length, 1);
  });

  test("未曾答對題：無任何標示，頁面無「未答對」「答錯過」（AC-45-04）", () => {
    const { rootEl } = mountWith({ store: fakeStore(dataOf(prog({ currentIndex: 5 }), ["p5-005"])), bank: bankOf(10) });
    assert.equal(q$(rootEl, "correct-badge").length, 0);
    assert.doesNotMatch(rootEl.textContent, /未答對|答錯過|曾答對/);
  });

  // ── 題目畫面 3 種狀態（LV-1、LV-2、LV-6） ──

  test("lockedReview（AC-48-01、LV-2）：題號、標示、正解綠色與「正確答案」、其餘 locked、4 個 disabled、無 aria-pressed=true、回饋逐字、兩段解析、「下一題」", () => {
    const bank = bankOf(10);
    const correctIndex = bank[4].correctIndex;
    const store = fakeStore(dataOf(prog({ currentIndex: 4 }), ["p5-005"]));
    const { rootEl, env } = mountWith({ store, bank });
    assert.equal(one(rootEl, "number").textContent, "第 5 / 10 題");
    assert.equal(one(rootEl, "correct-badge").textContent, "✓ 曾答對");
    const opts = q$(rootEl, "option");
    assert.equal(opts.length, 4);
    opts.forEach((b, i) => {
      assert.ok(b.hasAttribute("disabled"), "選項 " + i);
      assert.equal(b.getAttribute("aria-pressed"), "false", "選項 " + i);
      if (i === correctIndex) {
        assert.equal(b.getAttribute("data-state"), "correct");
        assert.match(b.className, /p5-option--correct/);
        assert.ok(b.textContent.includes("正確答案"));
      } else {
        assert.equal(b.getAttribute("data-state"), "locked");
        assert.match(b.className, /p5-option--locked/);
        assert.ok(!b.textContent.includes("正確答案"));
      }
    });
    const fb = one(rootEl, "feedback");
    assert.equal(fb.textContent, "你之前答對過這一題");
    assert.match(fb.className, /p5-feedback--correct/);
    assert.equal(one(rootEl, "core-title").textContent, "解題核心思路");
    assert.equal(one(rootEl, "core").textContent, bank[4].explanation.coreStrategy);
    assert.equal(one(rootEl, "structure-title").textContent, "句型語法拆解（S + V + O + 修飾語）");
    assert.ok(one(rootEl, "structure").childNodes.length >= 1);
    assert.equal(q$(rootEl, "next").length, 1);
    for (const bad of ["你的選擇", "答對了！", "答錯了", "上一題", "重做"]) {
      assert.ok(!rootEl.textContent.includes(bad), bad);
    }
    // 即使事件到達（繞過 disabled）：假 store 回 ok false → 不動畫、不震動（LV-3）
    store.actions.answerPart5 = (i) => { store.calls.push({ name: "answerPart5", args: [i] }); return { ok: false }; };
    opts[0].click();
    assert.deepEqual(env.vibrations, []);
    assert.deepEqual(env.animations, []);
    // 「下一題」呼叫 nextPart5
    one(rootEl, "next").click();
    assert.equal(store.calls.filter((c) => c.name === "nextPart5").length, 1);
  });

  test("idle、answered 行為不變：idle 無回饋與「下一題」、未停用；answered 依作答標色、aria-pressed、回饋（AC-11-01、AC-48-03）", () => {
    const bank = bankOf(4);
    const c0 = bank[0].correctIndex;
    const wrong0 = (c0 + 1) % 4;
    let { rootEl } = mountWith({ store: fakeStore(dataOf(prog(), [])), bank });
    assert.equal(q$(rootEl, "feedback").length, 0);
    assert.equal(q$(rootEl, "next").length, 0);
    assert.equal(q$(rootEl, "explanation").length, 0);
    q$(rootEl, "option").forEach((b) => {
      assert.ok(!b.hasAttribute("disabled"));
      assert.ok(!b.hasAttribute("aria-pressed"));
    });
    // 答對（曾答對且本次作答結果優先，LV-5）
    ({ rootEl } = mountWith({ store: fakeStore(dataOf(prog({ lockedSelection: c0 }), ["p5-001"])), bank }));
    assert.equal(one(rootEl, "feedback").textContent, "答對了！");
    assert.ok(!rootEl.textContent.includes("你之前答對過這一題"));
    assert.equal(q$(rootEl, "next").length, 1);
    assert.equal(q$(rootEl, "option")[c0].getAttribute("aria-pressed"), "true");
    // v1.1.0 留下的答錯結果（LV-7）：所選標紅、正解標綠、「你的選擇」
    ({ rootEl } = mountWith({ store: fakeStore(dataOf(prog({ lockedSelection: wrong0 }), ["p5-001"])), bank }));
    assert.equal(one(rootEl, "feedback").textContent, "答錯了，正確答案是 " + P.LETTERS[c0] + ".");
    assert.equal(q$(rootEl, "option")[wrong0].getAttribute("data-state"), "wrong");
    assert.equal(q$(rootEl, "option")[c0].getAttribute("data-state"), "correct");
    assert.ok(rootEl.textContent.includes("你的選擇"));
    assert.equal(one(rootEl, "correct-badge").textContent, "✓ 曾答對");
  });

  /** 第 1 題資料不完整的題庫 */
  function badBank(patch) {
    const bank = bankOf(3);
    bank[0] = Object.assign({}, bank[0], patch);
    return bank;
  }

  for (const [label, patch] of [
    ["correctIndex 不合法", { correctIndex: 7 }],
    ["correctIndex 非整數", { correctIndex: 1.5 }],
    ["sentence 為空字串", { sentence: "" }],
    ["sentence 非字串", { sentence: null }],
    ["options 長度不是 4", { options: ["a", "b", "c"] }]
  ]) {
    test("資料不完整的 lockedReview（LV-6；" + label + "）：無選項 correct、4 個 disabled、文字全畫面恰 1 次、「下一題」可點、不拋例外", () => {
      const store = fakeStore(dataOf(prog(), ["p5-001"]));
      const { rootEl } = mountWith({ store, bank: badBank(patch) });
      const opts = q$(rootEl, "option");
      assert.equal(opts.length, 4);
      assert.ok(opts.every((b) => b.getAttribute("data-state") === "locked"));
      assert.ok(opts.every((b) => b.hasAttribute("disabled")));
      assert.ok(opts.every((b) => b.getAttribute("aria-pressed") === "false"));
      assert.equal(one(rootEl, "correct-badge").textContent, "✓ 曾答對");
      assert.equal(one(rootEl, "correct-count").textContent, "已答對 1 / 3 題");
      assert.equal(countOf(rootEl.textContent, "這一題的資料不完整。"), 1);
      assert.equal(one(rootEl, "feedback").textContent, "這一題的資料不完整。");
      assert.match(one(rootEl, "feedback").className, /p5-feedback--wrong/);
      assert.equal(findAll(rootEl, (n) => n.className === "p5-warning").length, 0);
      assert.ok(!rootEl.textContent.includes("你之前答對過這一題"));
      assert.ok(!rootEl.textContent.includes("正確答案"));
      one(rootEl, "next").click();
      assert.deepEqual(store.calls.map((c) => c.name), ["nextPart5"]);
    });
  }

  test("資料不完整的 lockedReview：解析只顯示非空段落；兩段皆空時不建解析區（LV-6）", () => {
    const render = (explanation) => mountWith({
      store: fakeStore(dataOf(prog(), ["p5-001"])),
      bank: badBank({ correctIndex: 7, explanation })
    }).rootEl;
    let r = render({ coreStrategy: "核心", structure: "" });
    assert.equal(one(r, "core").textContent, "核心");
    assert.equal(q$(r, "structure-title").length, 0);
    assert.equal(q$(r, "structure").length, 0);
    r = render({ coreStrategy: "   ", structure: "S: a / V: b" });
    assert.equal(q$(r, "core-title").length, 0);
    assert.equal(q$(r, "core").length, 0);
    assert.equal(one(r, "structure").childNodes.length, 2);
    r = render({ coreStrategy: "", structure: "" });
    assert.equal(q$(r, "explanation").length, 0);
    assert.equal(q$(r, "feedback").length, 1);
    r = render(undefined);
    assert.equal(q$(r, "explanation").length, 0);
    assert.equal(q$(r, "next").length, 1);
  });

  test("資料不完整但非 lockedReview：idle、answered 維持原行為（.p5-warning，SD-FB-74）；無合法 id → idle、無標示（AC-48-09 (d)）", () => {
    let { rootEl } = mountWith({ store: fakeStore(dataOf(prog(), [])), bank: badBank({ correctIndex: 7 }) });
    assert.equal(findAll(rootEl, (n) => n.className === "p5-warning").length, 1);
    assert.equal(q$(rootEl, "feedback").length, 0);
    assert.ok(q$(rootEl, "option").every((b) => !b.hasAttribute("disabled")));
    ({ rootEl } = mountWith({ store: fakeStore(dataOf(prog({ lockedSelection: 0 }), [])), bank: badBank({ correctIndex: 7 }) }));
    assert.equal(findAll(rootEl, (n) => n.className === "p5-warning").length, 1);
    assert.equal(q$(rootEl, "next").length, 1);
    ({ rootEl } = mountWith({ store: fakeStore(dataOf(prog(), ["p5-001"])), bank: badBank({ id: "" }) }));
    assert.equal(q$(rootEl, "correct-badge").length, 0);
    assert.equal(one(rootEl, "correct-count").textContent, "已答對 0 / 3 題");
    assert.ok(q$(rootEl, "option").every((b) => !b.hasAttribute("disabled")));
  });

  // ── 結算（SM-1～SM-3） ──

  /** 結算區不得出現的字串（SM-2、V-ST-25） */
  function assertCleanSummary(text) {
    for (const bad of ["0 / 0", "NaN", "Infinity", "undefined", "%"]) {
      assert.ok(!text.includes(bad), bad + " 出現於：" + text);
    }
  }

  for (const only of [false, true]) {
    test("結算 y = 0（SM-2；開關" + (only ? "開啟" : "關閉") + "）：標題與 summaryNoNewAnswers；a ≥ 1 有累計行、a = 0 沒有；有「重新開始」、進度條 100%", () => {
      const bank = bankOf(4);
      const ids = only ? ["p5-001"] : idsOf(bank);
      let { rootEl } = mountWith({ store: fakeStore(dataOf(prog({ phase: "summary", currentIndex: 3, totalAnswered: 7, totalCorrect: 5 }), ids, only)), bank });
      let card = cardOf(rootEl, "card p5-summary");
      assert.equal(one(rootEl, "summary-title").textContent, "本輪結算");
      const none = one(rootEl, "summary-none");
      assert.equal(none.tagName, "P");
      assert.equal(none.className, "p5-summary__none");
      assert.equal(none.textContent, "本輪沒有新作答的題目");
      assert.equal(q$(rootEl, "summary-score").length, 0);
      assert.equal(findAll(rootEl, (n) => n.className === "p5-summary__total")[0].textContent, "累計答對 5 / 7");
      assert.equal(q$(rootEl, "restart").length, 1);
      assertCleanSummary(card.textContent);
      const bar = findAll(rootEl, (n) => n.className === "p5-progress")[0];
      assert.equal(bar.childNodes[0].style.width, "100%");
      // a = 0
      ({ rootEl } = mountWith({ store: fakeStore(dataOf(prog({ phase: "summary", currentIndex: 3 }), ids, only)), bank }));
      card = cardOf(rootEl, "card p5-summary");
      assert.equal(findAll(rootEl, (n) => n.className === "p5-summary__total").length, 0);
      assert.equal(one(rootEl, "summary-none").textContent, "本輪沒有新作答的題目");
      assertCleanSummary(card.textContent);
    });
  }

  test("結算 y ≥ 1（SM-1）：「答對 x / y」與累計行；無 summaryNoNewAnswers", () => {
    const { rootEl } = mountWith({
      store: fakeStore(dataOf(prog({ phase: "summary", roundAnswered: 3, roundCorrect: 0, totalAnswered: 3, totalCorrect: 0 }), [])),
      bank: bankOf(4)
    });
    assert.equal(one(rootEl, "summary-score").textContent, "答對 0 / 3");
    assert.equal(findAll(rootEl, (n) => n.className === "p5-summary__total")[0].textContent, "累計答對 0 / 3");
    assert.equal(q$(rootEl, "summary-none").length, 0);
    assert.ok(!rootEl.textContent.includes("本輪沒有新作答的題目"));
  });

  // ── 開關說明（HN-1）與常駐清除（CR-10） ──

  const b4 = bankOf(4);
  const c1 = b4[1].correctIndex;
  const nonAllCorrect = [
    ["idle 開關關閉、K = 0", dataOf(prog(), []), 0],
    ["idle 開關開啟、K = 0", dataOf(prog(), [], true), 0],
    ["idle 只含不存在的 id", dataOf(prog(), ["p5-999"]), 0],
    ["idle 開關關閉、K ≥ 1", dataOf(prog({ currentIndex: 1 }), ["p5-001"]), 1],
    ["idle 開關開啟、K ≥ 1", dataOf(prog({ currentIndex: 1 }), ["p5-001"], true), 1],
    ["answered K = 0", dataOf(prog({ lockedSelection: 0 }), []), 0],
    ["answered K ≥ 1", dataOf(prog({ currentIndex: 1, lockedSelection: c1 }), ["p5-002"]), 1],
    ["answered K = Q、開關開啟（UO-3 排除條件）", dataOf(prog({ lockedSelection: 0 }), idsOf(b4), true), 1],
    ["lockedReview", dataOf(prog(), ["p5-001"]), 1],
    ["lockedReview K = Q", dataOf(prog(), idsOf(b4)), 1],
    ["summary K = 0", dataOf(prog({ phase: "summary" }), []), 0],
    ["summary 只含不存在的 id", dataOf(prog({ phase: "summary" }), ["p5-999"], true), 0],
    ["summary K ≥ 1 開關關閉", dataOf(prog({ phase: "summary" }), ["p5-001"]), 1],
    ["summary K ≥ 1 開關開啟", dataOf(prog({ phase: "summary" }), ["p5-001"], true), 1],
    ["summary K = Q 開關關閉", dataOf(prog({ phase: "summary" }), idsOf(b4)), 1]
  ];
  for (const [label, data, clears] of nonAllCorrect) {
    test("HN-1、CR-10（" + label + "）：filterHint 恰 1 次、不顯示 filterHintAllCorrect；清除按鈕 " + clears + " 個", () => {
      const { rootEl } = mountWith({ store: fakeStore(data), bank: b4 });
      assert.equal(countOf(rootEl.textContent, T.filterHint), 1);
      assert.equal(countOf(rootEl.textContent, T.filterHintAllCorrect), 0);
      const hints = q$(rootEl, "filter-hint");
      assert.equal(hints.length, 1);
      assert.equal(hints[0].tagName, "P");
      assert.equal(hints[0].className, "p5-record__hint");
      assert.equal(hints[0].textContent, "關閉時顯示全部題目，答對過的題目會以綠色鎖定。");
      const buttons = q$(rootEl, "clear");
      assert.equal(buttons.length, clears);
      // .p5-record 子節點順序：計數、開關、說明、（K ≥ 1）清除
      const rec = findAll(rootEl, (n) => n.className === "p5-record")[0];
      const order = rec.childNodes.map((n) => n.getAttribute("data-p5"));
      assert.deepEqual(order, clears ? ["correct-count", "only-label", "filter-hint", "clear"] : ["correct-count", "only-label", "filter-hint"]);
      if (clears) {
        const b = buttons[0];
        assert.equal(b.tagName, "BUTTON");
        assert.equal(b.getAttribute("type"), "button");
        assert.equal(b.className, "btn btn--secondary p5-record__clear");
        assert.equal(b.textContent, "清除答對紀錄，重新來過");
      }
    });
  }

  test("題庫為空：兩句說明與清除按鈕都不顯示（HN-1、CR-10）", () => {
    const { rootEl } = mountWith({ store: fakeStore(dataOf(prog(), ["p5-001"], true)), bank: [] });
    assert.equal(q$(rootEl, "filter-hint").length, 0);
    assert.equal(q$(rootEl, "clear").length, 0);
    assert.ok(!rootEl.textContent.includes(T.filterHint));
    assert.ok(!rootEl.textContent.includes(T.filterHintAllCorrect));
  });

  test("allCorrect：標題、無題號與選項、唯一按鈕 clearAndRestart、filterHintAllCorrect 恰 1 次、進度條 100%；phase = summary 且 y ≥ 1 另有「答對 x / y」（AC-46-06、SM-3）", () => {
    const store = fakeStore(screens[2][1]);
    const { rootEl } = mountWith({ store, bank: bank200 });
    const title = one(rootEl, "allcorrect-title");
    assert.equal(title.textContent, "200 題全部答對！");
    assert.equal(title.tagName, "H3");
    assert.equal(title.getAttribute("tabindex"), "-1");
    assert.equal(findAll(rootEl, (n) => n.className === "p5-allcorrect__note").length, 0, "說明句已刪除（§7.24.3）");
    assert.equal(q$(rootEl, "number").length, 0);
    assert.equal(q$(rootEl, "option").length, 0);
    assert.equal(q$(rootEl, "restart").length, 0, "以清除按鈕取代「重新開始」");
    assert.equal(q$(rootEl, "replay").length, 0);
    assert.ok(!rootEl.textContent.includes("再練一次"));
    assert.equal(findAll(rootEl, (n) => n.tagName === "BUTTON").length, 1, "全畫面恰 1 個按鈕");
    assert.equal(q$(rootEl, "clear").length, 1);
    assert.equal(one(rootEl, "clear").textContent, "清除答對紀錄，重新來過");
    assert.equal(one(rootEl, "clear").tagName, "BUTTON");
    assert.equal(one(rootEl, "clear").className, "btn", "不用主要按鈕或強調橘（§7.24.2）");
    assert.ok(findAll(cardOf(rootEl, "card p5-allcorrect"), matcher('[data-p5="clear"]')).length === 1);
    assert.equal(countOf(rootEl.textContent, T.filterHintAllCorrect), 1);
    assert.equal(countOf(rootEl.textContent, T.filterHint), 0);
    assert.equal(one(rootEl, "filter-hint").textContent, "要檢視全部題目，請關閉上方的「只練沒答對的題目」。");
    assert.ok(!rootEl.textContent.includes(T.summaryNoNewAnswers));
    assert.equal(one(rootEl, "summary-score").textContent, "答對 2 / 2");
    assert.ok(rootEl.textContent.includes("本輪結算"));
    const bar = findAll(rootEl, (n) => n.className === "p5-progress")[0];
    assert.equal(bar.getAttribute("aria-valuenow"), "200");
    assert.equal(bar.getAttribute("aria-valuemax"), "200");
    assert.equal(bar.childNodes[0].style.width, "100%");
    // 未作答結束進入（開啟開關、重新載入）：無本輪結算
    const s2 = fakeStore(dataOf(prog({ currentIndex: 0 }), idsOf(bank200), true));
    const r2 = mountWith({ store: s2, bank: bank200 }).rootEl;
    assert.equal(q$(r2, "summary-score").length, 0);
    assert.ok(!r2.textContent.includes("本輪結算"));
    assert.equal(one(r2, "allcorrect-title").textContent, "200 題全部答對！");
    assert.equal(q$(r2, "clear").length, 1);
    // phase = summary 但 y = 0：不得出現「答對 0 / 0」、不顯示 summaryNoNewAnswers（SM-3）
    const s3 = fakeStore(dataOf(prog({ phase: "summary", currentIndex: 199 }), idsOf(bank200), true));
    const r3 = mountWith({ store: s3, bank: bank200 }).rootEl;
    assert.equal(q$(r3, "summary-score").length, 0);
    assert.ok(!r3.textContent.includes("本輪結算"));
    assert.ok(!r3.textContent.includes("0 / 0"));
    assert.ok(!r3.textContent.includes(T.summaryNoNewAnswers));
  });

  test("開關 change 與 Enter 皆呼叫 setPart5UnansweredOnly(input.checked)；焦點留在開關（AC-46-01）", () => {
    const store = fakeStore(dataOf(prog(), []), { setPart5UnansweredOnly: { changed: true } });
    const { rootEl, env } = mountWith({ store, bank: bankOf(4) });
    let input = one(rootEl, "only");
    // 觸控／點擊（含點 label）：原生切換 → change
    input.checked = true;
    input.dispatch("change");
    assert.deepEqual(store.calls.map((c) => [c.name, c.args]), [["setPart5UnansweredOnly", [true]]]);
    store.notify(["part5"]);
    assert.equal(env.focused, one(rootEl, "only"));
    // Enter：preventDefault → input.click()（切換並觸發 change）
    input = one(rootEl, "only");
    const ev = input.dispatch("keydown", { key: "Enter" });
    assert.equal(ev.defaultPrevented, true);
    assert.deepEqual(store.calls[1], { name: "setPart5UnansweredOnly", args: [true] });
    // 其他鍵不處理
    input.dispatch("keydown", { key: "a" });
    assert.equal(store.calls.length, 2);
    // 傳入值一律為布林
    assert.ok(store.calls.every((c) => typeof c.args[0] === "boolean"));
  });

  test("開關未變更（changed false）→ 主動重繪，核取方塊回到實際狀態", () => {
    const store = fakeStore(dataOf(prog(), []), { setPart5UnansweredOnly: { changed: false } });
    const { rootEl } = mountWith({ store, bank: bankOf(4) });
    const input = one(rootEl, "only");
    input.checked = true;
    input.dispatch("change");
    assert.equal(one(rootEl, "only").checked, false);
    assert.notEqual(one(rootEl, "only"), input);
  });

  test("清除：confirm 參數逐字（標題、內文含契約兩段、確定／取消）；取消 → action 0 次、焦點回清除按鈕（CR-6、AC-46-08）", async () => {
    const store = fakeStore(screens[2][1]);
    const seen = [];
    const { rootEl, env } = mountWith({ store, bank: bank200, confirm: (o) => { seen.push(o); return Promise.resolve(false); } });
    one(rootEl, "clear").click();
    await tick();
    assert.equal(seen.length, 1);
    assert.deepEqual(JSON.parse(JSON.stringify(seen[0])), {
      title: "清除答對紀錄",
      message: "將清除全部題目的答對紀錄，「已答對」會回到 0 題，並從第 1 題重新開始。累計答題數與正確率不受影響。",
      okText: "確定",
      cancelText: "取消"
    });
    for (const part of T.clearConfirmMustInclude) assert.ok(seen[0].message.includes(part), part);
    assert.equal(store.calls.length, 0, "取消不呼叫任何 action");
    assert.equal(env.focused, one(rootEl, "clear"));
    assert.equal(one(rootEl, "allcorrect-title").textContent, "200 題全部答對！", "留在全部答對畫面");
  });

  for (const [label, data] of [
    ["lockedReview", dataOf(prog(), ["p5-001"])],
    ["answered", dataOf(prog({ lockedSelection: 0 }), ["p5-001"])],
    ["idle", dataOf(prog({ currentIndex: 1 }), ["p5-001"])],
    ["summary", dataOf(prog({ phase: "summary" }), ["p5-001"])]
  ]) {
    test("清除（" + label + " 畫面，CR-10）：取消 → action 0 次、焦點回清除按鈕；確定 → clearPart5CorrectIds 1 次；對話框文字不變", async () => {
      const store = fakeStore(data);
      let answer = false;
      const seen = [];
      const { rootEl, env } = mountWith({ store, bank: bankOf(4), confirm: (o) => { seen.push(o); return Promise.resolve(answer); } });
      one(rootEl, "clear").click();
      await tick();
      assert.equal(store.calls.length, 0);
      assert.equal(env.focused, one(rootEl, "clear"));
      answer = true;
      one(rootEl, "clear").click();
      await tick();
      assert.deepEqual(store.calls.map((c) => c.name), ["clearPart5CorrectIds"]);
      assert.equal(seen[1].title, "清除答對紀錄");
      assert.equal(seen[1].message, "將清除全部題目的答對紀錄，「已答對」會回到 0 題，並從第 1 題重新開始。累計答題數與正確率不受影響。");
      assert.equal(seen[1].okText, "確定");
      assert.equal(seen[1].cancelText, "取消");
    });
  }

  test("清除：確定 → clearPart5CorrectIds 1 次；對話框開啟中再按不重複開啟", async () => {
    const store = fakeStore(screens[2][1]);
    let resolveFn = null;
    let opened = 0;
    const { rootEl } = mountWith({ store, bank: bank200, confirm: () => { opened++; return new Promise((r) => { resolveFn = r; }); } });
    one(rootEl, "clear").click();
    one(rootEl, "clear").click();
    assert.equal(opened, 1);
    resolveFn(true);
    await tick();
    assert.deepEqual(store.calls.map((c) => c.name), ["clearPart5CorrectIds"]);
  });

  test("清除：對話框拒絕（錯誤）→ 視同取消，不呼叫 action", async () => {
    const store = fakeStore(screens[2][1]);
    const { rootEl } = mountWith({ store, bank: bank200, confirm: () => Promise.reject(new Error("x")) });
    one(rootEl, "clear").click();
    await tick();
    assert.equal(store.calls.length, 0);
  });

  // ── 真 store 整合（F.makeStore；fixture 題庫 4 題） ──

  test("整合：答對後 K +1 與標示出現；開關開啟跳過曾答對題；全部答對關閉開關 → lockedReview → y = 0 結算 → 重新開始（AC-45-01、AC-46-03、AC-46-06、AC-46-08、AC-48-06、AC-48-10）", async () => {
    const content = F.loadContent();
    const { store, storage } = F.makeStore({ content });
    const bank = content.part5;
    assert.equal(bank.length, 4);
    let answer = true;
    const { rootEl, env } = mountWith({ store, bank, confirm: () => Promise.resolve(answer) });
    const vibrations = env.vibrations;
    const animations = env.animations;
    const count = () => one(rootEl, "correct-count").textContent;
    const clickOpt = (i) => findAll(rootEl, matcher('[data-p5="option"][data-index="' + i + '"]'))[0].click();
    const right = (j) => bank[j].correctIndex;
    const wrong = (j) => (bank[j].correctIndex + 1) % 4;
    assert.equal(count(), "已答對 0 / 4 題");
    assert.equal(q$(rootEl, "correct-badge").length, 0);

    // 第 1 題答對 → K = 1、標示出現（已作答）
    clickOpt(right(0));
    assert.equal(count(), "已答對 1 / 4 題");
    assert.equal(q$(rootEl, "correct-badge").length, 1);
    assert.equal(env.focused, one(rootEl, "next"));
    one(rootEl, "next").click();
    assert.equal(one(rootEl, "number").textContent, "第 2 / 4 題");
    assert.equal(q$(rootEl, "correct-badge").length, 0);
    // 第 2 題答對、第 3、4 題答錯 → 結算
    clickOpt(right(1)); one(rootEl, "next").click();
    clickOpt(wrong(2)); one(rootEl, "next").click();
    clickOpt(wrong(3)); one(rootEl, "next").click();
    assert.equal(q$(rootEl, "summary-title").length, 1);
    assert.equal(count(), "已答對 2 / 4 題");

    // 結算畫面開啟開關（真 store 寫入）→ 焦點在開關
    const before = storage.setCalls.length;
    one(rootEl, "only").click();
    assert.equal(store.getState().data.part5UnansweredOnly, true);
    assert.equal(storage.setCalls.length, before + 1);
    assert.equal(one(rootEl, "only").checked, true);
    assert.equal(env.focused, one(rootEl, "only"));
    // 重新開始 → 跳過曾答對的第 1、2 題，顯示第 3 題
    one(rootEl, "restart").click();
    assert.equal(one(rootEl, "number").textContent, "第 3 / 4 題");
    assert.equal(q$(rootEl, "correct-badge").length, 0);
    // 第 3 題答對 → 下一題為第 4 題；第 4 題答對（鎖定中仍顯示題目與解析）
    clickOpt(right(2)); one(rootEl, "next").click();
    assert.equal(one(rootEl, "number").textContent, "第 4 / 4 題");
    clickOpt(right(3));
    assert.equal(q$(rootEl, "number").length, 1);
    assert.equal(count(), "已答對 4 / 4 題");
    // 下一題 → 全部答對（作答結束進入：附本輪結算），焦點移到標題
    one(rootEl, "next").click();
    assert.equal(one(rootEl, "allcorrect-title").textContent, "4 題全部答對！");
    assert.equal(one(rootEl, "summary-score").textContent, "答對 2 / 2");
    assert.equal(env.focused, one(rootEl, "allcorrect-title"));
    assert.equal(q$(rootEl, "number").length, 0);
    assert.equal(q$(rootEl, "option").length, 0);
    const totals = () => { const p = store.getState().data.part5; return [p.totalAnswered, p.totalCorrect]; };
    const t0 = totals();
    assert.equal(q$(rootEl, "replay").length, 0);
    assert.equal(findAll(rootEl, (n) => n.tagName === "BUTTON").length, 1);
    const vib0 = vibrations.slice();
    const anim0 = animations.slice();

    // 全部答對畫面關閉開關（UO-8 (a)）→ 第 1 題 lockedReview、本輪 0、K 仍為 Q、累計不變、1 次寫入、焦點留在開關（AC-48-10）
    const off0 = storage.setCalls.length;
    one(rootEl, "only").click();
    assert.equal(storage.setCalls.length, off0 + 1);
    assert.equal(store.getState().data.part5UnansweredOnly, false);
    assert.equal(one(rootEl, "only").checked, false);
    assert.equal(env.focused, one(rootEl, "only"));
    const assertLocked = (n) => {
      assert.equal(one(rootEl, "number").textContent, "第 " + n + " / 4 題");
      assert.equal(one(rootEl, "correct-badge").textContent, "✓ 曾答對");
      assert.equal(one(rootEl, "feedback").textContent, "你之前答對過這一題");
      assert.ok(q$(rootEl, "option").every((b) => b.hasAttribute("disabled")));
      assert.equal(q$(rootEl, "clear").length, 1);
      assert.equal(q$(rootEl, "filter-hint")[0].textContent, T.filterHint);
      assert.equal(count(), "已答對 4 / 4 題");
      assert.deepEqual(totals(), t0);
      assert.equal(store.getState().data.part5.lockedSelection, null);
    };
    assertLocked(1);
    assert.equal(store.getState().data.part5.roundAnswered, 0);

    // 嘗試作答（繞過 disabled，事件仍到 store）：不計分、不寫入、不震動、無動畫（LV-3、AC-48-02）
    const try0 = storage.setCalls.length;
    const before0 = store.getState().data;
    [0, 1, 2, 3].forEach(clickOpt);
    assert.equal(storage.setCalls.length, try0);
    assert.equal(store.getState().data, before0);
    assert.deepEqual(vibrations, vib0);
    assert.deepEqual(animations, anim0);
    assertLocked(1);

    // 連按「下一題」：每次 1 次寫入、不計分；恰 Q 次進入 y = 0 結算（AC-48-06、AC-48-07）
    for (let n = 2; n <= 4; n++) {
      const w = storage.setCalls.length;
      one(rootEl, "next").click();
      assert.equal(storage.setCalls.length, w + 1);
      assert.equal(env.focused, one(rootEl, "number"));
      assertLocked(n);
    }
    one(rootEl, "next").click();
    assert.equal(one(rootEl, "summary-none").textContent, "本輪沒有新作答的題目");
    assert.equal(q$(rootEl, "summary-score").length, 0);
    assert.equal(findAll(rootEl, (n) => n.className === "p5-summary__total")[0].textContent, "累計答對 " + t0[1] + " / " + t0[0]);
    assert.equal(env.focused, one(rootEl, "summary-title"));
    assert.equal(q$(rootEl, "clear").length, 1);
    assert.deepEqual(totals(), t0);

    // 重新開始 → 第 1 題仍為 lockedReview（AC-48-04）
    one(rootEl, "restart").click();
    assertLocked(1);
    assert.equal(env.focused, one(rootEl, "number"));

    // K = Q 時開啟開關 → 全部答對（無本輪結算）
    one(rootEl, "only").click();
    assert.equal(q$(rootEl, "allcorrect-title").length, 1);
    assert.equal(q$(rootEl, "summary-score").length, 0);

    // 清除：取消 → 資料完全不變、setItem 0 次
    answer = false;
    const snap = storage.map.get("englishMasterTrack:state");
    const calls0 = storage.setCalls.length;
    one(rootEl, "clear").click();
    await tick();
    assert.equal(storage.setCalls.length, calls0);
    assert.equal(storage.map.get("englishMasterTrack:state"), snap);
    assert.equal(q$(rootEl, "allcorrect-title").length, 1);

    // 清除：確定 → K = 0、標示消失、開關維持開啟、第 1 題、累計不變、焦點在題號（AC-46-08）
    answer = true;
    one(rootEl, "clear").click();
    await tick();
    assert.equal(storage.setCalls.length, calls0 + 1);
    assert.equal(count(), "已答對 0 / 4 題");
    assert.equal(q$(rootEl, "correct-badge").length, 0);
    assert.equal(one(rootEl, "only").checked, true);
    assert.equal(one(rootEl, "number").textContent, "第 1 / 4 題");
    assert.deepEqual(totals(), t0);
    assert.equal(env.focused, one(rootEl, "number"));
    assert.equal(q$(rootEl, "clear").length, 0, "K = 0 入口消失（CR-6）");
  });

  test("整合（CR-10、AC-48-11）：開關關閉時由題目畫面清除 → K = 0、第 1 題 idle、可重新作答；本次作答結果一併放棄（E-133）", async () => {
    const content = F.loadContent();
    const { store, storage } = F.makeStore({ content });
    const bank = content.part5;
    const { rootEl, env } = mountWith({ store, bank, confirm: () => Promise.resolve(true) });
    const clickOpt = (i) => findAll(rootEl, matcher('[data-p5="option"][data-index="' + i + '"]'))[0].click();
    assert.equal(q$(rootEl, "clear").length, 0);
    clickOpt(bank[0].correctIndex);
    assert.equal(env.vibrations.length, 1, "實際作答照常震動");
    assert.equal(q$(rootEl, "clear").length, 1);
    one(rootEl, "next").click();
    clickOpt(bank[1].correctIndex); // 第 2 題作答結果未按下一題
    const p = store.getState().data.part5;
    const w = storage.setCalls.length;
    one(rootEl, "clear").click();
    await tick();
    assert.equal(storage.setCalls.length, w + 1);
    assert.equal(one(rootEl, "number").textContent, "第 1 / 4 題");
    assert.equal(one(rootEl, "correct-count").textContent, "已答對 0 / 4 題");
    assert.equal(q$(rootEl, "feedback").length, 0);
    assert.equal(q$(rootEl, "clear").length, 0);
    assert.equal(q$(rootEl, "next").length, 0);
    assert.ok(q$(rootEl, "option").every((b) => !b.hasAttribute("disabled")));
    const d = store.getState().data;
    assert.equal(d.part5.lockedSelection, null);
    assert.equal(d.part5.roundAnswered, 0);
    assert.equal(d.part5.totalAnswered, p.totalAnswered);
    assert.equal(d.part5.totalCorrect, p.totalCorrect);
    assert.equal(d.part5UnansweredOnly, false);
    assert.equal(env.focused, one(rootEl, "number"));
  });

  // ── 原始碼與樣式掃描 ──

  test("原始碼：不使用 innerHTML 等、確認對話框經 EMT.ui.dialog、不顯示題目 id", () => {
    const src = fs.readFileSync(path.join(APP, "views", "part5.js"), "utf8");
    assert.doesNotMatch(src, /innerHTML|outerHTML|insertAdjacentHTML|document\.write|window\.confirm/);
    assert.match(src, /dlg\.confirm\(/);
    assert.doesNotMatch(src, /role:\s*"switch"|"aria-live"[^\n]*correct-count/);
  });

  test("V-ST-27：views/part5.js、40-part5.css 不含已移除的 replay 與全部答對說明句字串", () => {
    const words = ["再練" + "一次", "replay" + "KeepRecords", "replayPart5" + "KeepRecords", 'data-p5="' + 'replay"', "allCorrect" + "Note", "p5-allcorrect__" + "note"];
    for (const rel of ["views/part5.js", "styles/40-part5.css"]) {
      const src = fs.readFileSync(path.join(APP, rel), "utf8");
      for (const w of words) assert.equal(src.indexOf(w), -1, rel + "：" + w);
    }
  });

  test("40-part5.css：新選擇器無 --accent、十六進位色值、transition、animation；.p5-only min-height var(--touch)；計數 tabular-nums", () => {
    const css = fs.readFileSync(path.join(APP, "styles", "40-part5.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const NEW = /\.p5-(record|only|badge|allcorrect|summary__none)/;
    const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ sel: m[1].trim(), body: m[2] }));
    const fresh = rules.filter((r) => NEW.test(r.sel));
    assert.ok(fresh.length >= 10, "新規則數 " + fresh.length);
    for (const r of fresh) {
      assert.doesNotMatch(r.body, /--accent|#[0-9a-fA-F]{3,8}\b|transition|animation/, r.sel);
    }
    assert.doesNotMatch(css, /#f7893b/i);
    const body = (sel) => {
      const r = rules.find((x) => x.sel === sel);
      assert.ok(r, sel);
      return r.body;
    };
    assert.match(body(".p5-only"), /min-height:\s*var\(--touch\)/);
    assert.match(body(".p5-only"), /min-width:\s*var\(--touch\)/);
    assert.match(body(".p5-record__count"), /font-variant-numeric:\s*tabular-nums/);
    assert.match(body(".p5-record"), /flex-wrap:\s*wrap/);
    assert.match(body(".p5-badge"), /color:\s*var\(--correct\)/);
    assert.match(body(".p5-only input"), /accent-color:\s*var\(--brand-deep\)/);
    assert.match(body(".p5-allcorrect__actions .btn"), /min-height:\s*var\(--touch\)/);
    // （v0.18，FE-81；§7.24.2）
    const hint = body(".p5-record__hint");
    assert.match(hint, /flex:\s*1 1 100%/);
    assert.match(hint, /font-size:\s*0\.875rem/);
    assert.match(hint, /color:\s*var\(--text-muted\)/);
    assert.match(hint, /overflow-wrap:\s*anywhere/);
    assert.doesNotMatch(hint, /nowrap|text-overflow|overflow:\s*hidden/);
    assert.match(body(".p5-record__clear"), /flex:\s*0 1 auto/);
    const none = body(".p5-summary__none");
    assert.match(none, /font-size:\s*1\.125rem/);
    assert.match(none, /font-weight:\s*600/);
    assert.match(none, /color:\s*var\(--text\)/);
    assert.ok(rules.some((r) => r.sel === ".p5-allcorrect__caption"), "caption 保留");
  });
});
