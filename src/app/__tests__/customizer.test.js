/*
 * customizer.test.js — 目標自訂器顯示文字單元測試（FE-09 測試移入，FE-19）
 * 受測：views/customizer.js 匯出的 helpers（formatInt、cardModels、estimateTexts、statusTexts）；FE-27 色級大卡片
 * 依據：architecture.md v0.3 §7.1（v0.3 決議：字量 nB／nG ≤ 0 視為資料缺漏，由 goal.js 統一處理，R3-1）
 * 涵蓋：AC-01-01、AC-01-07、AC-02-05、AC-02-06、AC-02-10、AC-26-01～AC-26-04、AC-22-04、C-6（字庫缺漏）；
 *       （FE-40）US-32、AC-32-01、AC-32-02、AC-32-04、AC-32-08、AC-32-11、AC-01-02、AC-03-05、AC-25-02
 */
"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");

const H = require("../views/customizer.js");
const G = require("../core/goal.js");
const C = require("../core/constants.js");

describe("customizer.test.js", () => {
  const NB = 2809;      // AC-02-05 例題值
  const NG = 6000;      // AC-02-05、AC-02-10 例題假設值

  test("formatInt", () => {
    assert.equal(H.formatInt(2809), "2,809");
    assert.equal(H.formatInt(0), "0");
    assert.equal(H.formatInt(1000), "1,000");
    assert.equal(H.formatInt(NaN), "—");
    assert.equal(H.formatInt(null), "—");
    assert.equal(H.formatInt(1234567), "1,234,567");
  });

  test("cardModels：5 張順序、分數範圍、內建字數與本系統建議字量（AC-01-01、AC-26-01）", () => {
    const M = H.cardModels(C.N_O, NB, NG, 600);
    assert.equal(M.length, 5);
    assert.deepEqual(M.map((x) => x.id), ["orange", "brown", "green", "blue", "gold"]);
    assert.deepEqual(M.map((x) => x.name), ["橘", "棕", "綠", "藍", "金"]);
    assert.deepEqual(M.map((x) => x.range), ["10～215 分", "220～465 分", "470～725 分", "730～855 分", "860～990 分"]);
    // 橘棕綠為 N_O、nB、nG 實際數字（不寫死：換一組值結果跟著變）；藍金「待定」
    assert.deepEqual(M.map((x) => x.vocab), ["1,000 字", "2,809 字", "6,000 字", "待定", "待定"]);
    assert.deepEqual(H.cardModels(C.N_O, 2500, 5620, 600).map((x) => x.vocab), ["1,000 字", "2,500 字", "5,620 字", "待定", "待定"]);
    assert.ok(M.every((x) => x.vocabNote === "本系統建議字量"));
    // 適用情境逐字取自契約 COLOR_LEVELS.scenarioZh
    assert.deepEqual(M.map((x) => x.scenario), C.COLOR_LEVELS.map((lv) => lv.scenarioZh));
  });

  test("cardModels：每日新字量 10、10、15、20、20，藍金標「僅供試算」（AC-26-01、Q-28）", () => {
    const M = H.cardModels(C.N_O, NB, NG, 600);
    assert.deepEqual(M.map((x) => x.daily), ["10 字/天", "10 字/天", "15 字/天", "20 字/天", "20 字/天"]);
    assert.deepEqual(M.map((x) => x.dailyNote), ["", "", "", "僅供試算", "僅供試算"]);
    // 與 core/goal.js 一致（不在本檔另寫數值）
    assert.deepEqual(M.map((x) => x.daily), C.COLOR_LEVELS.map((lv) => G.dailyNewWords(lv.scoreMin) + " 字/天"));
  });

  test("cardModels：藍金鎖定並顯示「即將開放」，橘棕綠不鎖定（AC-01-01、AC-26-01）", () => {
    const M = H.cardModels(C.N_O, NB, NG, 600);
    assert.deepEqual(M.map((x) => x.locked), [false, false, false, true, true]);
    assert.deepEqual(M.map((x) => x.badge), ["", "", "", "即將開放", "即將開放"]);
  });

  test("cardModels：選中 = colorOf(draftScore)，恰好一張（AC-26-02、AC-26-03）", () => {
    for (const s of [10, 215, 220, 300, 465, 470, 600, 725, 730, 855, 860, 990]) {
      const M = H.cardModels(C.N_O, NB, NG, s);
      const sel = M.filter((x) => x.selected).map((x) => x.id);
      assert.deepEqual(sel, [G.colorOf(s)], String(s));
    }
    assert.deepEqual(H.cardModels(C.N_O, NB, NG, 300).filter((x) => x.selected).map((x) => x.id), ["brown"]);
    // 分數無效（不在任何範圍）→ 沒有卡片選中，不拋例外
    assert.equal(H.cardModels(C.N_O, NB, NG, NaN).filter((x) => x.selected).length, 0);
  });

  test("cardModels：字庫缺漏（nB = nG = 0、undefined）→ 棕、綠顯示「—」，橘仍為 N_O（§7.1 v0.3、C-6）", () => {
    assert.deepEqual(H.cardModels(C.N_O, 0, 0, 600).map((x) => x.vocab), ["1,000 字", "—", "—", "待定", "待定"]);
    assert.deepEqual(H.cardModels(C.N_O, undefined, undefined, 600).map((x) => x.vocab), ["1,000 字", "—", "—", "待定", "待定"]);
  });

  test("cardModels 與畫面文字不含「官方門檻」「Tier」（AC-01-01）", () => {
    const all = JSON.stringify([H.cardModels(C.N_O, NB, NG, 600), H.TEXT]);
    assert.ok(!all.includes("官方門檻"));
    assert.ok(!/Tier/i.test(all));
  });

  test("estimateTexts（AC-02-05、AC-02-06、AC-02-10）", () => {
    let t = H.estimateTexts(G, 100, 0, NB, NG);
    assert.equal(t.color, "橘");
    assert.equal(t.target, "1,000 字");
    assert.equal(t.daily, "10 字/天");
    assert.equal(t.weeks, "15 週");
    assert.equal(H.estimateTexts(G, 300, 0, NB, NG).weeks, "41 週");
    assert.equal(H.estimateTexts(G, 300, 409, NB, NG).weeks, "35 週");
    assert.equal(H.estimateTexts(G, 600, 0, NB, NG).weeks, "58 週");
    t = H.estimateTexts(G, 100, 1200, NB, NG);
    assert.equal(t.weeks, "0 週");
    assert.ok(t.achieved);
    t = H.estimateTexts(G, 800, 0, NB, NG);
    assert.equal(t.color, "藍（即將開放）");
    assert.equal(t.target, "待定");
    assert.equal(t.daily, "20 字/天");
    assert.equal(t.weeks, "43 週");
    assert.ok(t.basedOnGreen && t.greenCap && !t.achieved);
    t = H.estimateTexts(G, 900, 7000, NB, NG);
    assert.equal(t.color, "金（即將開放）");
    assert.equal(t.weeks, "0 週");
    assert.ok(!t.achieved);
    const daily = [10, 215, 220, 465, 470, 725, 730, 855, 860, 990].map((s) => H.estimateTexts(G, s, 0, NB, NG).daily);
    assert.deepEqual(daily, ["10 字/天", "10 字/天", "10 字/天", "10 字/天", "15 字/天", "15 字/天", "20 字/天", "20 字/天", "20 字/天", "20 字/天"]);
  });

  test("estimateTexts：字量 0 視為資料缺漏 → 目標與週數「—」、未達成（§7.1 v0.3、R3-1）", () => {
    // 棕、綠：目標字量未知
    for (const s of [300, 600]) {
      const t = H.estimateTexts(G, s, 0, 0, 0);
      assert.equal(t.target, "—", String(s));
      assert.equal(t.weeks, "—", String(s));
      assert.equal(t.achieved, false, String(s));
    }
    // 已掌握數很大也不可判為「已達成」（舊規則下 c ≥ 0 會誤判）
    const big = H.estimateTexts(G, 300, 5000, 0, 0);
    assert.equal(big.achieved, false);
    assert.equal(big.weeks, "—");
    assert.equal(big.mastered, "5,000");
    // 綠色只缺 nG 也一樣
    assert.equal(H.estimateTexts(G, 600, 0, NB, 0).target, "—");
    // 藍、金：以 nG 為基準（T = nG），nG = 0 → 週數「—」、未達成
    for (const s of [800, 900]) {
      const t = H.estimateTexts(G, s, 0, 0, 0);
      assert.equal(t.target, "待定");
      assert.equal(t.weeks, "—");
      assert.equal(t.achieved, false);
      assert.equal(t.daily, "20 字/天");
    }
    // 橘：N_O 為契約常數，不受字庫缺漏影響
    const o = H.estimateTexts(G, 100, 0, 0, 0);
    assert.equal(o.target, "1,000 字");
    assert.equal(o.weeks, "15 週");
  });

  test("字量 0 的處理由 goal.js 統一負責：estimate 直接傳 0、負數、NaN 結果相同（§7.1 v0.3）", () => {
    for (const [nB, nG] of [[0, 0], [-1, -1], [NaN, NaN]]) {
      for (const s of [300, 600, 800]) {
        const e = G.estimate(s, 0, nB, nG);
        assert.equal(e.targetVocab, null, s + "/" + nB);
        assert.equal(e.weeks, null, s + "/" + nB);
        assert.equal(e.achieved, false, s + "/" + nB);
      }
      assert.equal(G.estimate(100, 0, nB, nG).targetVocab, 1000);
    }
  });

  test("statusTexts（AC-01-07）", () => {
    assert.deepEqual(H.statusTexts(G, { appliedScore: 730, appliedColor: "blue", effectiveColor: "green" }),
      { target: "藍", effective: "綠（內建上限）", score: "730", greenCap: true });
    assert.deepEqual(H.statusTexts(G, { appliedScore: 600, appliedColor: "green", effectiveColor: "green" }),
      { target: "綠", effective: "綠", score: "600", greenCap: false });
  });

  test("statusTexts：資料缺漏不拋例外", () => {
    const t = H.statusTexts(G, null);
    assert.equal(t.target, "—");
    assert.equal(t.effective, "—");
    assert.equal(t.score, "—");
    assert.equal(t.greenCap, false);
  });
});

// ── 閒置預建（BUG-002，AC-22-01）：以假的 root／DOM 驗證建立時機與「只建立一次」 ──
describe("customizer.test.js：閒置預建", () => {
  /** 極簡假節點：只實作 customizer.js 用到的屬性與方法 */
  function fakeNode(tag) {
    const attrs = {};
    return {
      tag, children: [], hidden: false, value: "", textContent: "", appendCount: 0,
      setAttribute(k, v) { attrs[k] = String(v); },
      getAttribute(k) { return k in attrs ? attrs[k] : null; },
      removeAttribute(k) { delete attrs[k]; },
      appendChild(c) { this.children.push(c); this.appendCount++; return c; }
    };
  }
  /** 假的 core/dom：建立假節點並記錄建立數 */
  function fakeDom(counter) {
    const make = (tag, props, children) => {
      counter.nodes++;
      const n = fakeNode(tag);
      if (props && props.text != null) n.textContent = String(props.text);
      if (props && props.className) n.className = String(props.className);
      if (props && props.on) n.on = props.on;
      if (props && props.attrs) for (const k of Object.keys(props.attrs)) n.setAttribute(k, props.attrs[k]);
      for (const c of children || []) if (c) n.appendChild(c);
      return n;
    };
    return {
      el: make,
      svg: (tag, attrs, children) => make(tag, { attrs }, children),
      clear(node) { node.children.length = 0; },
      setText(node, t) { node.textContent = t == null ? "" : String(t); }
    };
  }
  /** 假的 window：可手動觸發 load 與閒置回呼 */
  function fakeRoot({ ready = true, entryMode, store: realStore, applyStatus = "applied", confirmResult = { ok: true, write: "ok" } } = {}) {
    const counter = { nodes: 0, subscribe: 0, startLearning: 0, restore: 0,
      applyGoal: 0, requestApplyGoal: 0, confirmApplyGoal: 0, cancelApplyGoal: 0 };
    // （FE-40）假 ui.dialog、ui.toast：dialog.confirm 回傳的 Promise 由測試手動 resolve
    const dialogCalls = [];
    const toasts = [];
    const subs = [];
    const host = fakeNode("div");
    const idleQueue = [];
    const loadHandlers = [];
    const htmlAttrs = { "data-ready": ready ? "1" : null };
    const state = { data: { goal: { draftScore: 600, appliedScore: 600, appliedColor: "green", effectiveColor: "green" }, masteredWordKeys: [] } };
    // （FE-32）entryMode 有指定時才放 runtime（既有案例維持「無 runtime → 一般模式」）
    if (entryMode) state.runtime = { entryMode };
    const notify = (tags) => subs.slice().forEach((fn) => fn(state, tags));
    const root = {
      EMT: {
        core: { dom: fakeDom(counter), goal: G, constants: C },
        content: { nB: NB, nG: NG },
        store: {
          getState: () => state,
          subscribe: (fn) => { counter.subscribe++; subs.push(fn); return () => {}; },
          // 與 store 相同語意的最小實作（setDraftScore、clickColor；AC-01-05、AC-01-07）
          actions: {
            setDraftScore(raw) {
              const r = G.parseScoreInput(raw);
              if (!r.ok) return { ok: false, error: r.message };
              state.data.goal.draftScore = r.score;
              return { ok: true, score: r.score };
            },
            clickColor(id) { state.data.goal.draftScore = G.scoreAfterColorClick(state.data.goal.draftScore, id); },
            applyGoal() { counter.applyGoal++; },
            // （FE-40）與 store 相同語意的最小實作（architecture.md §4.3 v0.5）
            requestApplyGoal() {
              counter.requestApplyGoal++;
              if (applyStatus === "applied") {
                const g = state.data.goal;
                g.appliedScore = g.draftScore;
                g.appliedColor = G.colorOf(g.draftScore);
                g.effectiveColor = G.effectiveColorOf(g.appliedColor);
                notify(["goal", "studySet", "flashcard", "quiz", "speech"]);
              }
              return { status: applyStatus };
            },
            confirmApplyGoal() {
              counter.confirmApplyGoal++;
              const g = state.data.goal;
              if (confirmResult.ok) {
                g.appliedScore = g.draftScore;
                g.appliedColor = G.colorOf(g.draftScore);
                g.effectiveColor = G.effectiveColorOf(g.appliedColor);
                notify(["goal", "studySet", "flashcard", "quiz", "speech", "stats", "streak", "part5", "learning"]);
              } else if (g.draftScore !== g.appliedScore) {
                g.draftScore = g.appliedScore;
                notify(["goal"]);
              }
              return confirmResult;
            },
            cancelApplyGoal() {
              counter.cancelApplyGoal++;
              const g = state.data.goal;
              if (g.draftScore !== g.appliedScore) { g.draftScore = g.appliedScore; notify(["goal"]); }
            },
            // 與 store 相同語意的最小實作（FS-4）：套用 draftScore、轉 main、以 entry、goal 等 tag 通知
            startLearning() {
              counter.startLearning++;
              if (!state.runtime || state.runtime.entryMode !== "firstRun") return { ok: false };
              const g = state.data.goal;
              g.appliedScore = g.draftScore;
              g.appliedColor = G.colorOf(g.draftScore);
              state.runtime.entryMode = "main";
              notify(["entry", "goal", "studySet", "flashcard", "quiz", "speech"]);
              return { ok: true, write: "ok" };
            }
          }
        },
        ui: {
          importFlow: { start() { counter.restore++; return Promise.resolve(null); } },
          dialog: { confirm(opts) { return new Promise((resolve) => { dialogCalls.push({ opts, resolve }); }); } },
          toast: { show(text, opts) { toasts.push({ text, kind: opts && opts.kind }); } }
        }
      },
      document: {
        documentElement: { getAttribute: (k) => htmlAttrs[k] },
        getElementById: (id) => (id === "customizer-goal" ? host : null)
      },
      addEventListener(type, fn) { if (type === "load") loadHandlers.push(fn); },
      requestIdleCallback(fn) { idleQueue.push(fn); return idleQueue.length; },
      setTimeout(fn) { idleQueue.push(fn); return idleQueue.length; },
      console: { error() {} }
    };
    if (realStore) {
      root.EMT.store = realStore;
      // 真實 store 的通知也要送到本頁：subscribe 交給真實 store，計數照記
      const sub = realStore.subscribe;
      realStore.subscribe = (fn) => { counter.subscribe++; return sub(fn); };
    }
    return {
      root, host, counter, htmlAttrs, state, notify, dialogCalls, toasts,
      fireLoad() { loadHandlers.splice(0).forEach((f) => f()); },
      flushOne() { idleQueue.shift()({ timeRemaining: () => 50 }); },
      flushIdle() { let n = 0; while (idleQueue.length && n < 50) { idleQueue.shift()({ timeRemaining: () => 50 }); n++; } return n; },
      idleCount: () => idleQueue.length
    };
  }
  const NB = 2809, NG = 6000;

  test("load 後閒置時先建立 DOM；之後 mount 不重建、不重複訂閱", () => {
    const f = fakeRoot();
    const view = H.createView(f.root);
    assert.equal(f.host.appendCount, 0, "建立 view 時不碰 DOM");
    f.fireLoad();
    assert.equal(f.host.appendCount, 0, "load 事件本身不建立，只排入閒置");
    f.flushIdle();
    assert.equal(f.host.appendCount, 1, "閒置時建立一次");
    assert.equal(f.counter.subscribe, 1);
    const nodes = f.counter.nodes;
    view.mount(null);
    view.show();
    assert.equal(f.host.appendCount, 1, "mount 不重建");
    assert.equal(f.counter.nodes, nodes, "mount 不建立新節點");
    assert.equal(f.counter.subscribe, 1, "不重複訂閱");
    // 色級按鈕依 draftScore 標示選取（600 → 綠）
    const page = f.host.children[0];
    assert.ok(page, "已掛上頁面");
  });

  test("使用者在閒置前就切到自訂器：mount 照常建立，之後的閒置預建略過", () => {
    const f = fakeRoot();
    const view = H.createView(f.root);
    view.mount(null);
    view.show();
    assert.equal(f.host.appendCount, 1);
    const nodes = f.counter.nodes;
    f.fireLoad();
    f.flushIdle();
    assert.equal(f.host.appendCount, 1, "預建不重建");
    assert.equal(f.counter.nodes, nodes);
    assert.equal(f.counter.subscribe, 1);
  });

  test("啟動流程尚未完成（data-ready 未設定）時延後重試，完成後才建立", () => {
    const f = fakeRoot({ ready: false });
    H.createView(f.root);
    f.fireLoad();
    // 先跑 3 輪閒置：尚未 ready，不建立，但每輪都再排入下一次
    for (let i = 0; i < 3; i++) {
      assert.equal(f.idleCount(), 1);
      f.flushOne();
    }
    assert.equal(f.idleCount(), 1, "仍在等待");
    assert.equal(f.host.appendCount, 0);
    f.htmlAttrs["data-ready"] = "1";
    f.flushIdle();
    assert.equal(f.host.appendCount, 1);
  });

  test("建立 view 時不讀取 document，也不排入閒置工作（LD-2：載入時只登錄）", () => {
    const f = fakeRoot();
    let reads = 0;
    const doc = f.root.document;
    Object.defineProperty(f.root, "document", { configurable: true, get() { reads++; return doc; } });
    H.createView(f.root);
    assert.equal(reads, 0);
    assert.equal(f.idleCount(), 0);
    f.fireLoad();
    assert.equal(f.idleCount(), 1);
  });

  test("一直未 ready：最多重試 20 次後停止，不建立也不拋例外", () => {
    const f = fakeRoot({ ready: false });
    H.createView(f.root);
    f.fireLoad();
    const n = f.flushIdle();
    assert.equal(n, 21, "第 1 次 + 重試 20 次");
    assert.equal(f.idleCount(), 0);
    assert.equal(f.host.appendCount, 0);
  });

  // ── FE-27 色級大卡片：選中狀態與分數輸入框、滑桿、點卡片交互同步 ──
  function walk(node, out = []) { out.push(node); for (const c of node.children || []) walk(c, out); return out; }
  function textOf(node) { return walk(node).map((x) => x.textContent || "").join(""); }
  function mounted(opt) {
    const f = fakeRoot(opt);
    const view = H.createView(f.root);
    view.mount(null);
    view.show();
    const all = walk(f.host);
    const cards = all.filter((x) => x.tag === "button" && x.getAttribute("data-color"));
    const byId = (id) => all.find((x) => x.getAttribute("id") === id);
    const pressed = () => cards.filter((b) => b.getAttribute("aria-pressed") === "true").map((b) => b.getAttribute("data-color"));
    const selClass = () => cards.filter((b) => / is-selected( |$)/.test(b.className)).map((b) => b.getAttribute("data-color"));
    return { f, view, all, cards, byId, pressed, selClass };
  }

  test("卡片：5 張 button、順序與內容、藍金鎖定圖示與「即將開放」（AC-01-01、AC-26-01）", () => {
    const { cards } = mounted();
    assert.deepEqual(cards.map((b) => b.getAttribute("data-color")), ["orange", "brown", "green", "blue", "gold"]);
    for (const b of cards) assert.equal(b.getAttribute("type"), "button");
    const t = cards.map(textOf);
    assert.ok(t[0].includes("1,000 字") && t[0].includes("本系統建議字量") && t[0].includes("10 字/天"));
    assert.ok(t[1].includes("2,809 字") && t[2].includes("6,000 字") && t[2].includes("15 字/天"));
    for (const i of [3, 4]) {
      assert.ok(t[i].includes("待定") && t[i].includes("20 字/天") && t[i].includes("僅供試算") && t[i].includes("即將開放"));
      assert.ok(walk(cards[i]).some((x) => x.tag === "svg"), "鎖定圖示為內嵌 SVG");
    }
    for (const i of [0, 1, 2]) {
      assert.ok(!t[i].includes("僅供試算") && !t[i].includes("即將開放"));
      assert.ok(!walk(cards[i]).some((x) => x.tag === "svg"));
    }
    assert.ok(t.every((x) => !x.includes("官方門檻") && !/Tier/i.test(x)));
  });

  test("卡片：初始選中 = colorOf(draftScore)；輸入 300、滑桿 730 只切換選中，不建立新節點（AC-26-03、AC-22-04）", () => {
    const { f, cards, byId, pressed, selClass } = mounted();
    assert.deepEqual(pressed(), ["green"]);
    assert.deepEqual(selClass(), ["green"]);
    const nodes = f.counter.nodes;
    const input = byId("cz-score-input");
    input.value = "300";
    input.on.input();
    assert.deepEqual(pressed(), ["brown"]);
    assert.deepEqual(selClass(), ["brown"]);
    const slider = byId("cz-score-range");
    slider.value = "730";
    slider.on.input();
    assert.deepEqual(pressed(), ["blue"]);
    assert.equal(input.value, "730");
    // 無效輸入：試算維持上一個有效值，選中不變
    input.value = "abc";
    input.on.input();
    assert.deepEqual(pressed(), ["blue"]);
    assert.equal(f.counter.nodes, nodes, "分數變更不建立任何節點");
    assert.equal(f.host.appendCount, 1, "不重建頁面");
    assert.equal(cards.length, 5);
  });

  test("卡片：點綠卡（分數 300 → 470）只有綠卡選中；點藍、金不阻擋（AC-26-02、AC-26-04、AC-01-05、AC-01-07）", () => {
    const { f, cards, byId, pressed } = mounted();
    f.state.data.goal.draftScore = 300;
    byId("cz-score-input").value = "300";
    byId("cz-score-input").on.input();
    const card = (id) => cards.find((b) => b.getAttribute("data-color") === id);
    const nodes = f.counter.nodes;
    card("green").on.click();
    assert.equal(f.state.data.goal.draftScore, 470);
    assert.deepEqual(pressed(), ["green"]);
    assert.equal(byId("cz-score-input").value, "470");
    assert.equal(byId("cz-score-range").value, "470");
    card("green").on.click();
    assert.equal(f.state.data.goal.draftScore, 470, "已在範圍內不變（Q-32）");
    card("blue").on.click();
    assert.equal(f.state.data.goal.draftScore, 730);
    assert.deepEqual(pressed(), ["blue"]);
    card("gold").on.click();
    assert.equal(f.state.data.goal.draftScore, 860);
    assert.deepEqual(pressed(), ["gold"]);
    assert.equal(f.counter.nodes, nodes, "點卡片不建立任何節點");
  });

  test("狀態列與「套用」各在獨立容器（.cz-status-slot、.cz-actions，供 FE-32）", () => {
    const { all } = mounted();
    const slot = all.filter((x) => x.className === "cz-status-slot");
    const actions = all.filter((x) => /(^| )cz-actions( |$)/.test(x.className || ""));
    assert.equal(slot.length, 1);
    assert.equal(actions.length, 1);
    assert.ok(walk(slot[0]).some((x) => /(^| )cz-status( |$)/.test(x.className || "")));
    assert.ok(walk(actions[0]).some((x) => x.getAttribute("id") === "cz-apply"));
    assert.ok(!walk(slot[0]).some((x) => x.getAttribute("id") === "cz-apply"));
  });

  // ── FE-32 首次模式：按鈕區與狀態列（architecture.md §7.9、§10.1 customizer.test.js 列） ──
  const cls = (x, c) => new RegExp("(^| )" + c + "( |$)").test(x.className || "");
  function parts(m) {
    const all = walk(m.f.host);
    const actions = all.find((x) => cls(x, "cz-actions"));
    const slot = all.find((x) => x.className === "cz-status-slot");
    const guide = all.find((x) => x.getAttribute("id") === "cz-guide");
    const intro = all.find((x) => cls(x, "cz-intro"));
    const buttons = actions.children.map((b) => ({ id: b.getAttribute("id"), text: b.textContent, className: b.className }));
    return { actions, slot, guide, intro, buttons };
  }

  test("首次模式：按鈕區為「開始學習」（主要按鈕）與「從備份還原」，無「套用」；狀態列隱藏；顯示引導文字（AC-25-01）", () => {
    const m = mounted({ entryMode: "firstRun" });
    const p = parts(m);
    assert.deepEqual(p.buttons.map((b) => b.text), ["開始學習", "從備份還原"]);
    assert.deepEqual(p.buttons.map((b) => b.id), ["cz-start", "cz-restore"]);
    assert.ok(/btn--primary/.test(p.buttons[0].className), "「開始學習」為主要按鈕");
    assert.ok(cls(p.actions, "cz-actions--first-run"));
    assert.ok(!walk(m.f.host).some((x) => x.getAttribute("id") === "cz-apply"), "無「套用」");
    assert.equal(p.slot.hidden, true, "狀態列隱藏");
    assert.equal(p.guide.hidden, false);
    assert.equal(p.guide.textContent, "先選擇你的目標難易度，按「開始學習」後進入主控台。");
    assert.equal(p.intro.hidden, true, "一般說明（提到「套用」）不顯示");
    // 卡片、分數、試算照常（AC-26-*）：600 → 綠
    assert.deepEqual(m.pressed(), ["green"]);
    assert.equal(m.cards.length, 5);
  });

  test("一般模式：按鈕區只有「套用」，狀態列顯示，無首次按鈕與引導文字（AC-25-06）", () => {
    for (const opt of [undefined, { entryMode: "main" }]) {
      const m = mounted(opt);
      const p = parts(m);
      assert.deepEqual(p.buttons.map((b) => b.text), ["套用"]);
      assert.ok(!cls(p.actions, "cz-actions--first-run"));
      assert.equal(p.slot.hidden, false);
      assert.equal(p.guide.hidden, true);
      assert.equal(p.intro.hidden, false);
    }
  });

  test("首次模式：卡片與分數操作和一般模式相同，且不建立新節點（AC-26-02、AC-26-03、AC-22-04）", () => {
    const m = mounted({ entryMode: "firstRun" });
    const nodes = m.f.counter.nodes;
    const card = (id) => m.cards.find((b) => b.getAttribute("data-color") === id);
    card("blue").on.click();
    assert.equal(m.f.state.data.goal.draftScore, 730);
    assert.deepEqual(m.pressed(), ["blue"]);
    const input = m.byId("cz-score-input");
    input.value = "720";
    input.on.input();
    assert.deepEqual(m.pressed(), ["green"]);
    assert.equal(m.f.counter.nodes, nodes);
  });

  test("「開始學習」：先寫入輸入框的有效分數再呼叫 startLearning；收到 entry tag 後只重建按鈕區、狀態列顯示（AC-25-02）", () => {
    const m = mounted({ entryMode: "firstRun" });
    const input = m.byId("cz-score-input");
    input.value = "720";
    input.on.input();
    const cardsBefore = m.cards.slice();
    const sliderBefore = m.byId("cz-score-range");
    const nodes = m.f.counter.nodes;
    const start = walk(m.f.host).find((x) => x.getAttribute("id") === "cz-start");
    start.on.click();
    assert.equal(m.f.counter.startLearning, 1);
    assert.equal(m.f.state.data.goal.appliedScore, 720);
    const p = parts(m);
    assert.deepEqual(p.buttons.map((b) => b.text), ["套用"]);
    assert.equal(p.slot.hidden, false);
    assert.equal(p.guide.hidden, true);
    assert.equal(p.intro.hidden, false);
    // 狀態列已更新為套用後的值
    const st = walk(m.f.host).find((x) => cls(x, "cz-st-score"));
    assert.equal(st.textContent, "720");
    // 卡片與分數區未重建：同一批節點，只新增「套用」1 個按鈕
    const after = walk(m.f.host).filter((x) => x.tag === "button" && x.getAttribute("data-color"));
    assert.deepEqual(after, cardsBefore);
    assert.equal(m.byId("cz-score-range"), sliderBefore);
    assert.equal(m.f.counter.nodes, nodes + 1);
    assert.equal(m.f.host.appendCount, 1, "不重建頁面");
  });

  test("「從備份還原」呼叫 EMT.ui.importFlow.start()；缺少模組時丟出含模組名稱的 Error（LD-3）", () => {
    const m = mounted({ entryMode: "firstRun" });
    const btn = walk(m.f.host).find((x) => x.getAttribute("id") === "cz-restore");
    btn.on.click();
    assert.equal(m.f.counter.restore, 1);
    assert.equal(m.f.counter.startLearning, 0);
    delete m.f.root.EMT.ui.importFlow;
    assert.throws(() => btn.on.click(), /EMT\.ui\.importFlow/);
  });

  test("還原成功的通知（entry + goal，非本頁發起）→ 切回一般模式並同步為備份的分數（AC-25-10、E-58）", () => {
    const m = mounted({ entryMode: "firstRun" });
    m.f.state.data.goal = { draftScore: 300, appliedScore: 300, appliedColor: "brown", effectiveColor: "brown" };
    m.f.state.runtime.entryMode = "main";
    m.f.notify(["goal", "studySet", "flashcard", "stats", "entry"]);
    assert.deepEqual(parts(m).buttons.map((b) => b.text), ["套用"]);
    assert.deepEqual(m.pressed(), ["brown"]);
    assert.equal(m.byId("cz-score-input").value, "300");
    // 模式未變的後續通知不重建按鈕區
    const nodes = m.f.counter.nodes;
    m.f.notify(["entry"]);
    m.f.notify(["goal"]);
    assert.equal(m.f.counter.nodes, nodes);
  });

  // ── FE-40 切換難易度初始化確認視窗（architecture.md §7.15、§10.2 customizer.test.js 列） ──
  const tick = () => new Promise((r) => setImmediate(r));
  const applyBtn = (m) => walk(m.f.host).find((x) => x.getAttribute("id") === "cz-apply");
  /** 一般模式掛載後把分數改成 score（輸入框 input 事件），回傳 mounted 物件 */
  function mountedAt(score, opt) {
    const m = mounted(opt);
    const input = m.byId("cz-score-input");
    input.value = String(score);
    input.on.input();
    return m;
  }

  test("FE-40：requestApplyGoal 回 \"confirm\" → 開視窗一次，參數同 reinitDialogOptions；開啟中再按「套用」不重複開窗（AC-32-01）", async () => {
    const m = mountedAt(300, { applyStatus: "confirm" });
    applyBtn(m).on.click();
    assert.equal(m.f.counter.requestApplyGoal, 1);
    assert.equal(m.f.counter.applyGoal, 0, "view 不直接呼叫 applyGoal");
    assert.equal(m.f.dialogCalls.length, 1);
    assert.deepEqual(m.f.dialogCalls[0].opts, H.reinitDialogOptions());
    // 視窗開啟期間：狀態未改（生效色級仍綠），輸入框仍顯示使用者選的 300
    assert.equal(m.f.state.data.goal.appliedScore, 600);
    assert.equal(m.byId("cz-score-input").value, "300");
    applyBtn(m).on.click();
    applyBtn(m).on.click();
    assert.equal(m.f.dialogCalls.length, 1, "不重複開窗");
    assert.equal(m.f.counter.requestApplyGoal, 1, "開啟中不再呼叫 requestApplyGoal");
    assert.equal(m.f.counter.confirmApplyGoal + m.f.counter.cancelApplyGoal, 0, "按下任一按鈕前不確認也不取消");
    m.f.dialogCalls[0].resolve(false);
    await tick();
    // 關閉後可再開
    m.byId("cz-score-input").value = "300";
    m.byId("cz-score-input").on.input();
    applyBtn(m).on.click();
    assert.equal(m.f.dialogCalls.length, 2);
  });

  test("FE-40：確定 → confirmApplyGoal 一次；成功時狀態列與分數區更新為新分數、不顯示失敗訊息（AC-32-02、AC-03-05）", async () => {
    const m = mountedAt(300, { applyStatus: "confirm" });
    applyBtn(m).on.click();
    m.f.dialogCalls[0].resolve(true);
    await tick();
    assert.equal(m.f.counter.confirmApplyGoal, 1);
    assert.equal(m.f.counter.cancelApplyGoal, 0);
    assert.equal(m.f.counter.applyGoal, 0);
    assert.equal(walk(m.f.host).find((x) => cls(x, "cz-st-score")).textContent, "300");
    assert.equal(walk(m.f.host).find((x) => cls(x, "cz-st-effective")).textContent, "棕");
    assert.deepEqual(m.pressed(), ["brown"]);
    assert.ok(!m.f.toasts.some((t) => t.text === "儲存空間不足，未套用"));
  });

  test("FE-40：確定但寫入失敗（quota、error）→ toast「儲存空間不足，未套用」（kind error）；分數區回到 600（AC-32-11 (b)）", async () => {
    for (const reason of ["quota", "error"]) {
      const m = mountedAt(300, { applyStatus: "confirm", confirmResult: { ok: false, reason } });
      applyBtn(m).on.click();
      m.f.dialogCalls[0].resolve(true);
      await tick();
      assert.equal(m.f.counter.confirmApplyGoal, 1, reason);
      assert.deepEqual(m.f.toasts, [{ text: "儲存空間不足，未套用", kind: "error" }], reason);
      assert.equal(m.byId("cz-score-input").value, "600", reason);
      assert.equal(m.byId("cz-score-range").value, "600", reason);
      assert.deepEqual(m.pressed(), ["green"], reason);
      assert.equal(walk(m.f.host).find((x) => cls(x, "cz-st-effective")).textContent, "綠", reason);
    }
  });

  test("FE-40：取消（Esc、點視窗外同樣 resolve(false)）→ cancelApplyGoal；輸入框、滑桿、選中卡片、試算回到 600（AC-32-04）", async () => {
    const m = mountedAt(300, { applyStatus: "confirm" });
    const estColor = walk(m.f.host).find((x) => cls(x, "cz-est-color"));
    assert.equal(estColor.textContent, "棕");
    const nodes = m.f.counter.nodes;
    applyBtn(m).on.click();
    m.f.dialogCalls[0].resolve(false);
    await tick();
    assert.equal(m.f.counter.cancelApplyGoal, 1);
    assert.equal(m.f.counter.confirmApplyGoal, 0);
    assert.equal(m.f.state.data.goal.draftScore, 600);
    assert.equal(m.byId("cz-score-input").value, "600");
    assert.equal(m.byId("cz-score-range").value, "600");
    assert.deepEqual(m.pressed(), ["green"]);
    assert.equal(estColor.textContent, "綠");
    assert.equal(walk(m.f.host).find((x) => cls(x, "cz-st-effective")).textContent, "綠");
    assert.equal(m.f.toasts.length, 0);
    assert.equal(m.f.counter.nodes, nodes, "不建立新節點");
  });

  test("FE-40：輸入框打字中（未 blur）就按「套用」再取消 → 輸入框仍被覆寫回 600（AC-32-04）", async () => {
    const m = mounted({ applyStatus: "confirm" });
    const input = m.byId("cz-score-input");
    input.value = "723";
    input.on.input();
    applyBtn(m).on.click();
    assert.equal(input.value, "725", "開窗時顯示修正後的分數");
    m.f.dialogCalls[0].resolve(false);
    await tick();
    assert.equal(input.value, "600");
  });

  test("FE-40：\"applied\" 不開窗、toast「已套用目標」；\"ignored\" 不開窗（AC-01-02、AC-32-05～AC-32-07）", async () => {
    const m = mountedAt(300, { applyStatus: "applied" });
    applyBtn(m).on.click();
    await tick();
    assert.equal(m.f.dialogCalls.length, 0);
    assert.equal(m.f.counter.requestApplyGoal, 1);
    assert.equal(m.f.counter.applyGoal, 0);
    assert.deepEqual(m.f.toasts, [{ text: "已套用目標", kind: "success" }]);
    assert.equal(walk(m.f.host).find((x) => cls(x, "cz-st-score")).textContent, "300");
    const n = mountedAt(300, { applyStatus: "ignored" });
    applyBtn(n).on.click();
    await tick();
    assert.equal(n.f.dialogCalls.length, 0);
    assert.equal(n.f.toasts.length, 0);
  });

  test("FE-40：首次模式仍為「開始學習」，按下不經 requestApplyGoal、不開窗（AC-25-02、AC-32-08）", () => {
    const m = mounted({ entryMode: "firstRun", applyStatus: "confirm" });
    assert.deepEqual(parts(m).buttons.map((b) => b.text), ["開始學習", "從備份還原"]);
    walk(m.f.host).find((x) => x.getAttribute("id") === "cz-start").on.click();
    assert.equal(m.f.counter.startLearning, 1);
    assert.equal(m.f.counter.requestApplyGoal, 0);
    assert.equal(m.f.dialogCalls.length, 0);
  });

  test("FE-40：缺少 EMT.ui.dialog → 丟出含模組名稱的 Error（LD-3），草稿已還原", () => {
    const m = mountedAt(300, { applyStatus: "confirm" });
    delete m.f.root.EMT.ui.dialog;
    assert.throws(() => applyBtn(m).on.click(), /EMT\.ui\.dialog/);
    assert.equal(m.f.counter.cancelApplyGoal, 1);
    assert.equal(m.byId("cz-score-input").value, "600");
  });

  // ── FE-40 與真實 store 整合（有學習紀錄、600 → 300） ──
  const F = require("./_fixtures.js");
  const P = require("../core/persist.js");
  const KEY = "englishMasterTrack:state";
  function learnedStore() {
    const d = P.defaultData();
    d.masteredWordKeys = ["word1", "word2", "word3", "word4", "word5"];
    d.part5 = Object.assign({}, d.part5, { totalAnswered: 10, totalCorrect: 6 });
    const storage = F.fakeStorage({ [KEY]: JSON.stringify(P.buildRecord(d, new Date("2026-10-29T00:00:00Z"))) });
    return F.makeStore({ storage });
  }

  test("FE-40 整合：真實 store，取消 → setItem 0 次、localStorage 與學習紀錄不變、輸入框回 600（AC-32-01、AC-32-04）", async () => {
    const s = learnedStore();
    const m = mountedAt(300, { store: s.store });
    // 「按套用前」的 localStorage（調分數本來就會寫入 draftScore；取消依 CI-9 不寫入，契約 FB-35）
    const raw = s.storage.map.get(KEY);
    const calls = s.storage.setCalls.length;
    applyBtn(m).on.click();
    assert.equal(m.f.dialogCalls.length, 1, "有學習紀錄且生效色級改變 → 開窗");
    assert.equal(s.store.getState().data.goal.effectiveColor, "green");
    assert.equal(s.storage.setCalls.length, calls, "開窗期間 setItem 0 次");
    m.f.dialogCalls[0].resolve(false);
    await tick();
    assert.equal(s.storage.setCalls.length, calls, "取消 setItem 0 次");
    assert.equal(s.storage.map.get(KEY), raw);
    assert.equal(s.store.getState().data.goal.draftScore, 600);
    assert.equal(s.store.getState().data.masteredWordKeys.length, 5);
    assert.equal(m.byId("cz-score-input").value, "600");
    assert.deepEqual(m.pressed(), ["green"]);
  });

  test("FE-40 整合：真實 store，確定 → 學習紀錄初始化、生效色級棕；quota 時 toast 失敗且 localStorage 不變（AC-32-02、AC-32-11）", async () => {
    const s = learnedStore();
    const m = mountedAt(300, { store: s.store });
    applyBtn(m).on.click();
    m.f.dialogCalls[0].resolve(true);
    await tick();
    const d = s.store.getState().data;
    assert.equal(d.goal.effectiveColor, "brown");
    assert.equal(d.masteredWordKeys.length, 0);
    assert.equal(d.part5.totalAnswered, 0);
    assert.equal(walk(m.f.host).find((x) => cls(x, "cz-st-effective")).textContent, "棕");
    assert.ok(!m.f.toasts.some((t) => t.kind === "error"));

    const q = learnedStore();
    const n = mountedAt(300, { store: q.store });
    const raw = q.storage.map.get(KEY);
    q.storage.quota = true;
    applyBtn(n).on.click();
    n.f.dialogCalls[0].resolve(true);
    await tick();
    assert.deepEqual(n.f.toasts, [{ text: "儲存空間不足，未套用", kind: "error" }]);
    assert.equal(q.storage.map.get(KEY), raw);
    assert.equal(q.store.getState().data.goal.effectiveColor, "green");
    assert.equal(q.store.getState().data.masteredWordKeys.length, 5);
    assert.equal(n.byId("cz-score-input").value, "600");
    assert.deepEqual(n.pressed(), ["green"]);
  });
});

describe("customizer.test.js：首次模式按鈕區模型（FE-32）", () => {
  test("actionsModel(\"firstRun\")：「開始學習」「從備份還原」、無「套用」、無狀態列、有引導文字", () => {
    const m = H.actionsModel("firstRun");
    assert.equal(m.mode, "firstRun");
    assert.deepEqual(m.buttons.map((b) => b.text), ["開始學習", "從備份還原"]);
    assert.deepEqual(m.buttons.map((b) => b.primary), [true, false]);
    assert.ok(!m.buttons.some((b) => b.text === "套用"));
    assert.equal(m.showStatus, false);
    assert.equal(m.showIntro, false);
    assert.ok(m.guide.includes("開始學習"));
  });

  test("actionsModel(\"main\")（與其他值）：只有「套用」、顯示狀態列、無引導文字", () => {
    for (const v of ["main", undefined, null, "boot"]) {
      const m = H.actionsModel(v);
      assert.equal(m.mode, "main");
      assert.deepEqual(m.buttons.map((b) => b.text), ["套用"]);
      assert.equal(m.showStatus, true);
      assert.equal(m.showIntro, true);
      assert.equal(m.guide, "");
    }
  });

  test("entryModeOf：只有 runtime.entryMode === \"firstRun\" 為首次", () => {
    assert.equal(H.entryModeOf({ runtime: { entryMode: "firstRun" } }), "firstRun");
    assert.equal(H.entryModeOf({ runtime: { entryMode: "main" } }), "main");
    assert.equal(H.entryModeOf({ data: {} }), "main");
    assert.equal(H.entryModeOf(null), "main");
  });

  test("與真實 store 整合：首次 store 的 entryModeOf 為 firstRun，startLearning 後為 main", () => {
    const F = require("./_fixtures.js");
    const m = F.makeStore({ firstRun: true });
    assert.equal(H.entryModeOf(m.store.getState()), "firstRun");
    m.a.startLearning();
    assert.equal(H.entryModeOf(m.store.getState()), "main");
  });
});

describe("customizer.test.js：初始化確認視窗（FE-40）", () => {
  const fs = require("node:fs");
  const path = require("node:path");

  test("reinitDialogOptions：標題、內文逐字含 AC-32-01 兩段文字（以 \\n 分兩行）、只有「確定」「取消」", () => {
    const o = H.reinitDialogOptions();
    assert.deepEqual(Object.keys(o).sort(), ["cancelText", "message", "okText", "title"]);
    assert.equal(o.title, "切換難易度");
    assert.ok(o.message.includes("目前已有學習統計資料，切換難易度將初始化學習紀錄"));
    assert.ok(o.message.includes("建議先按「取消」，到主控台按「匯出備份」保存目前紀錄"));
    assert.deepEqual(o.message.split("\n"), [
      "目前已有學習統計資料，切換難易度將初始化學習紀錄。",
      "建議先按「取消」，到主控台按「匯出備份」保存目前紀錄。"
    ]);
    assert.equal(o.okText, "確定");
    assert.equal(o.cancelText, "取消");
    assert.notEqual(H.reinitDialogOptions(), o, "每次回傳新物件");
    assert.equal(H.TEXT.applyFailed, "儲存空間不足，未套用");
  });

  test("「匯出備份」與主控台按鈕文字一致（Q-38）", () => {
    const src = fs.readFileSync(path.join(__dirname, "..", "views", "dashboard.js"), "utf8");
    assert.ok(/exportBtn:\s*"匯出備份"/.test(src));
  });

  test("原始碼掃描：customizer.js 不含 .applyGoal( 呼叫（SD-FB-26），且呼叫 requestApplyGoal", () => {
    const src = fs.readFileSync(path.join(__dirname, "..", "views", "customizer.js"), "utf8");
    assert.ok(!/\.applyGoal\s*\(/.test(src));
    assert.ok(/\.requestApplyGoal\s*\(/.test(src));
  });
});
