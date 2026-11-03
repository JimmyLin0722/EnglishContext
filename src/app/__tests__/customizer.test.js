/*
 * customizer.test.js — 目標自訂器顯示文字單元測試（FE-09 測試移入，FE-19）
 * 受測：views/customizer.js 匯出的 helpers（formatInt、cardModels、estimateTexts、statusTexts）；FE-27 色級大卡片
 * 依據：architecture.md v0.3 §7.1（v0.3 決議：字量 nB／nG ≤ 0 視為資料缺漏，由 goal.js 統一處理，R3-1）
 * 涵蓋：AC-01-01、AC-01-07、AC-02-05、AC-02-06、AC-02-10、AC-26-01～AC-26-04、AC-22-04、C-6（字庫缺漏）；
 *       （FE-40）US-32、AC-32-01、AC-32-02、AC-32-04、AC-32-08、AC-32-11、AC-01-02、AC-03-05、AC-25-02；
 *       （FE-43，architecture.md v0.6 §7.17、§10.3；契約 v0.10 GS-1～GS-8）AC-26-05、AC-26-06、AC-32-04（取消回原色級）、
 *       AC-01-05、AC-02-04、AC-22-04（點卡片不重建 DOM）
 * v0.10：分數區隱藏且停用，畫面以點卡片設定分數（GS-2：該色 scoreMax）；原「輸入框／滑桿建立狀態」的案例已改為點卡片，
 *       滑桿與輸入框同步案例只留一則並標註「v0.10 暫停，程式保留」。
 * v0.12（FE-57；architecture.md v0.8 §7.19.5、§10.5 customizer.test.js 列；契約 FT-1～FT-6）：cardModels → levelRows（精簡色級列）、
 *       新增 firstRunSummary；首次畫面改為標題「選擇你的目標」＋副標＋固定底部列（鎖定行、摘要行、#cz-start、#cz-restore）；
 *       涵蓋 AC-26-01、AC-41-01、AC-41-02、AC-41-04（Tab 順序以 DOM 順序代理）、AC-01-01、AC-25-01～AC-25-03、AC-25-10。
 */
"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");

const H = require("../views/customizer.js");
const G = require("../core/goal.js");
const C = require("../core/constants.js");
const L = require("../core/layout.js");

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

  test("levelRows：5 列順序、名稱、說明、內建字數與 字/天；不含分數與分數範圍（FT-3、AC-26-01、AC-26-05）", () => {
    const M = H.levelRows(C.N_O, NB, NG, 600);
    assert.equal(M.length, 5);
    assert.deepEqual(M.map((x) => x.id), ["orange", "brown", "green", "blue", "gold"]);
    assert.deepEqual(M.map((x) => x.name), ["橘", "棕", "綠", "藍", "金"]);
    assert.deepEqual(Object.keys(M[0]).sort(), ["dailyText", "desc", "id", "locked", "name", "selected", "vocabText"]);
    assert.ok(!/\d+～\d+/.test(JSON.stringify(M)), "模型文字不含分數範圍");
    assert.ok(!/分/.test(JSON.stringify(M.map((x) => [x.desc, x.vocabText, x.dailyText]))), "不含「分」");
    // 開放列：N_O、nB、nG 實際數字（換一組值結果跟著變）
    assert.deepEqual(M.map((x) => x.vocabText), ["1,000 字", "2,809 字", "6,000 字", null, null]);
    assert.deepEqual(H.levelRows(C.N_O, 2500, 5620, 600).map((x) => x.vocabText), ["1,000 字", "2,500 字", "5,620 字", null, null]);
    assert.deepEqual(M.map((x) => x.dailyText), ["10 字/天", "10 字/天", "15 字/天", null, null]);
    // 說明：開放列為 scenarioZh，鎖定列為「即將開放」
    assert.deepEqual(M.map((x) => x.desc), [
      C.COLOR_LEVELS[0].scenarioZh, C.COLOR_LEVELS[1].scenarioZh, C.COLOR_LEVELS[2].scenarioZh, "即將開放", "即將開放"
    ]);
    assert.deepEqual(M.map((x) => x.locked), [false, false, false, true, true]);
  });

  test("levelRows：鎖定列（藍金）vocabText／dailyText 為 null，整列不含「待定」、數字、「20 字/天」（Q-57、AC-26-01）", () => {
    const M = H.levelRows(C.N_O, NB, NG, 600);
    for (const r of M.filter((x) => x.locked)) {
      assert.equal(r.vocabText, null);
      assert.equal(r.dailyText, null);
      const t = JSON.stringify([r.name, r.desc]);
      assert.ok(!t.includes("待定") && !/\d/.test(t) && !t.includes("20 字/天"), r.id);
    }
    // 開放列的每日字量與 core/goal.js 一致（不在本檔另寫數值）
    assert.deepEqual(M.slice(0, 3).map((x) => x.dailyText), C.COLOR_LEVELS.slice(0, 3).map((lv) => G.dailyNewWords(lv.scoreMin) + " 字/天"));
  });

  test("levelRows：選中 = colorOf(draftScore)，恰好一列（AC-26-02、AC-26-03）", () => {
    for (const s of [10, 215, 220, 300, 465, 470, 600, 725, 730, 855, 860, 990]) {
      const M = H.levelRows(C.N_O, NB, NG, s);
      assert.deepEqual(M.filter((x) => x.selected).map((x) => x.id), [G.colorOf(s)], String(s));
    }
    assert.equal(H.levelRows(C.N_O, NB, NG, NaN).filter((x) => x.selected).length, 0);
  });

  test("levelRows：字庫缺漏（nB = nG = 0、undefined）→ 棕、綠顯示「—」，橘仍為 N_O（§7.1 v0.3、C-6）", () => {
    assert.deepEqual(H.levelRows(C.N_O, 0, 0, 600).map((x) => x.vocabText), ["1,000 字", "—", "—", null, null]);
    assert.deepEqual(H.levelRows(C.N_O, undefined, undefined, 600).map((x) => x.vocabText), ["1,000 字", "—", "—", null, null]);
  });

  test("levelRows 與畫面文字不含「官方門檻」「Tier」、「已選擇」「僅供試算」（AC-01-01）", () => {
    const all = JSON.stringify([H.levelRows(C.N_O, NB, NG, 600), H.TEXT]);
    assert.ok(!all.includes("官方門檻"));
    assert.ok(!/Tier/i.test(all));
    assert.ok(!all.includes("已選擇"));
    assert.ok(!all.includes("僅供試算"));
    assert.ok(!("cardModels" in H), "cardModels 已改為 levelRows");
  });

  test("firstRunSummary：5 色逐字（N_B 2,809、N_G 5,620；FT-4、AC-41-02）", () => {
    const want = {
      orange: ["橘級・每日 10 字\u3000預計 15 週", false],
      brown: ["棕級・每日 10 字\u3000預計 41 週", false],
      green: ["綠級・每日 15 字\u3000預計 54 週", false],
      blue: ["藍級・每日 20 字\u3000預計 41 週（以綠試算）", true],
      gold: ["金級・每日 20 字\u3000預計 41 週（以綠試算）", true],
    };
    for (const lv of C.COLOR_LEVELS) {
      assert.deepEqual(H.firstRunSummary(G, lv.scoreMax, 2809, 5620), { text: want[lv.id][0], locked: want[lv.id][1] }, lv.id);
      assert.deepEqual(H.firstRunSummary(G, lv.scoreMin, 2809, 5620), { text: want[lv.id][0], locked: want[lv.id][1] }, lv.id + " min");
    }
    // 不含分數與「待定」
    for (const lv of C.COLOR_LEVELS) assert.ok(!/分|待定/.test(H.firstRunSummary(G, lv.scoreMax, 2809, 5620).text));
  });

  test("firstRunSummary 與 estimateTexts 使用同一個試算：每日字量與週數一致（FT-4）", () => {
    for (const s of [10, 215, 300, 465, 600, 725, 800, 990]) {
      const e = H.estimateTexts(G, s, 0, NB, NG);
      const sum = H.firstRunSummary(G, s, NB, NG).text;
      assert.ok(sum.includes("每日 " + e.daily.replace(" 字/天", "") + " 字"), s + "：" + sum);
      assert.ok(sum.includes("預計 " + e.weeks.replace(" 週", "") + " 週"), s + "：" + sum);
    }
    // 字庫缺漏 → 週數「—」
    assert.equal(H.firstRunSummary(G, 600, 0, 0).text, "綠級・每日 15 字\u3000預計 — 週");
    assert.deepEqual(H.firstRunSummary(G, NaN, NB, NG), { text: "—", locked: false });
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

  test("statusTexts（AC-01-07）：不含目標分數（AC-26-05 (b)）", () => {
    assert.deepEqual(H.statusTexts(G, { appliedScore: 855, appliedColor: "blue", effectiveColor: "green" }),
      { target: "藍", effective: "綠（內建上限）", greenCap: true });
    assert.deepEqual(H.statusTexts(G, { appliedScore: 600, appliedColor: "green", effectiveColor: "green" }),
      { target: "綠", effective: "綠", greenCap: false });
    assert.ok(!("score" in H.statusTexts(G, { appliedScore: 600, appliedColor: "green", effectiveColor: "green" })));
  });

  test("畫面文字：一般說明不再提及輸入分數；狀態列與卡片不使用「目前目標分數」與分數單位（GS-6）", () => {
    assert.equal(H.TEXT.intro, "選擇色級即時試算，按「套用」後才會更新單字卡的單字集。");
    assert.ok(!("statusScore" in H.TEXT));
    assert.ok(!("scoreUnit" in H.TEXT));
    // （FE-43／FE-44 修正）試算區標題不含「分數」字樣
    assert.equal(H.TEXT.estColor, "對應色級");
    assert.ok(!H.TEXT.estColor.includes("分數"));
  });

  test("statusTexts：資料缺漏不拋例外", () => {
    const t = H.statusTexts(G, null);
    assert.equal(t.target, "—");
    assert.equal(t.effective, "—");
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
  // score：測試替身 store 的既有分數（draftScore = appliedScore），預設 600 代表「v0.9 以前的既有分數」fixture（GS-4），
  // 不代表預設值（預設值為 C.SCORE_DEFAULT，見真實 store 案例）
  function fakeRoot({ ready = true, entryMode, store: realStore, applyStatus = "applied", confirmResult = { ok: true, write: "ok" }, score = 600 } = {}) {
    const counter = { nodes: 0, subscribe: 0, startLearning: 0, restore: 0, setDraftScore: 0, clickColor: 0,
      applyGoal: 0, requestApplyGoal: 0, confirmApplyGoal: 0, cancelApplyGoal: 0 };
    // （FE-40）假 ui.dialog、ui.toast：dialog.confirm 回傳的 Promise 由測試手動 resolve
    const dialogCalls = [];
    const toasts = [];
    const subs = [];
    const host = fakeNode("div");
    const idleQueue = [];
    const loadHandlers = [];
    const htmlAttrs = { "data-ready": ready ? "1" : null };
    const c0 = G.colorOf(score);
    const state = { data: { goal: { draftScore: score, appliedScore: score, appliedColor: c0, effectiveColor: G.effectiveColorOf(c0) }, masteredWordKeys: [] } };
    // （FE-32）entryMode 有指定時才放 runtime（既有案例維持「無 runtime → 一般模式」）
    if (entryMode) state.runtime = { entryMode };
    const notify = (tags) => subs.slice().forEach((fn) => fn(state, tags));
    const root = {
      EMT: {
        core: { dom: fakeDom(counter), goal: G, constants: C, layout: L },
        content: { nB: NB, nG: NG },
        store: {
          getState: () => state,
          subscribe: (fn) => { counter.subscribe++; subs.push(fn); return () => {}; },
          // 與 store 相同語意的最小實作（setDraftScore、clickColor；v0.10 GS-2：點卡片 = 該色 scoreMax）
          actions: {
            setDraftScore(raw) {
              counter.setDraftScore++;
              const r = G.parseScoreInput(raw);
              if (!r.ok) return { ok: false, error: r.message };
              state.data.goal.draftScore = r.score;
              return { ok: true, score: r.score };
            },
            clickColor(id) { counter.clickColor++; state.data.goal.draftScore = G.scoreAfterColorClick(state.data.goal.draftScore, id); },
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
      // setDraftScore 呼叫計數（GS-3：「套用」「開始學習」不得從輸入框回寫）
      const setDraft = realStore.actions.setDraftScore;
      realStore.actions.setDraftScore = (raw) => { counter.setDraftScore++; return setDraft(raw); };
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

  test("色級列：5 個 button.cz-level、順序與內容、藍金鎖定圖示與「即將開放」、右側「—」（FT-3、AC-01-01、AC-26-01）", () => {
    const { cards, all } = mounted();
    assert.deepEqual(cards.map((b) => b.getAttribute("data-color")), ["orange", "brown", "green", "blue", "gold"]);
    for (const b of cards) {
      assert.equal(b.getAttribute("type"), "button");
      assert.ok(/(^| )cz-level( |$)/.test(b.className), b.className);
      // 結構：色條（aria-hidden）→ 主體（名稱、說明）→ 右側
      assert.deepEqual(b.children.map((c) => c.className), ["cz-level__bar", "cz-level__main", "cz-level__side"]);
      assert.equal(b.children[0].getAttribute("aria-hidden"), "true");
    }
    const t = cards.map(textOf);
    assert.ok(t[0].includes("1,000 字") && t[0].includes("10 字/天"));
    assert.ok(t[1].includes("2,809 字") && t[2].includes("6,000 字") && t[2].includes("15 字/天"));
    for (const i of [3, 4]) {
      const side = cards[i].children[2];
      assert.equal(textOf(side), "—");
      assert.ok(t[i].includes("即將開放"));
      assert.ok(!t[i].includes("待定") && !t[i].includes("20 字/天") && !t[i].includes("僅供試算"));
      assert.ok(walk(cards[i]).some((x) => x.tag === "svg" && x.getAttribute("aria-hidden") === "true"), "鎖定圖示為內嵌 SVG（aria-hidden）");
      assert.ok(/ is-locked( |$)/.test(cards[i].className));
    }
    for (const i of [0, 1, 2]) {
      assert.ok(!t[i].includes("僅供試算") && !t[i].includes("即將開放"));
      assert.ok(!walk(cards[i]).some((x) => x.tag === "svg"));
    }
    assert.ok(t.every((x) => !x.includes("官方門檻") && !/Tier/i.test(x) && !x.includes("已選擇")));
    // 列表上方說明行恰 1 個，以「本系統建議字量」開頭，且列內不再重複（AC-01-01）
    const notes = all.filter((x) => /(^| )cz-vocab-note( |$)/.test(x.className || ""));
    assert.equal(notes.length, 1);
    assert.equal(notes[0].textContent, "本系統建議字量：右側為內建字數與每日新字量");
    assert.ok(t.every((x) => !x.includes("本系統建議字量")));
    // 色級列容器 role=group
    const group = all.find((x) => /(^| )cz-levels( |$)/.test(x.className || ""));
    assert.equal(group.getAttribute("role"), "group");
    assert.deepEqual(group.children, cards);
  });

  test("色級列：✓ 節點 aria-hidden，每列 1 個（顯示與否由 CSS 依 aria-pressed 控制）", () => {
    const { cards } = mounted();
    for (const b of cards) {
      const checks = walk(b).filter((x) => x.className === "cz-level__check");
      assert.equal(checks.length, 1);
      assert.equal(checks[0].textContent, "✓");
      assert.equal(checks[0].getAttribute("aria-hidden"), "true");
    }
  });

  const card = (m, id) => m.cards.find((b) => b.getAttribute("data-color") === id);
  /** 可見節點：自身與所有祖先皆非 hidden（模擬全域 [hidden] { display: none }） */
  function visibleNodes(node, out = []) {
    if (node.hidden) return out;
    out.push(node);
    for (const c of node.children || []) visibleNodes(c, out);
    return out;
  }
  const visibleText = (node) => visibleNodes(node).map((x) => x.textContent || "").join("");
  const estDailyOf = (m) => walk(m.f.host).find((x) => / cz-est-daily( |$)/.test(x.className || "")).textContent;

  test("卡片：初始選中 = colorOf(draftScore)；依序點卡片只切換選中，不建立新節點（AC-26-03、AC-22-04）", () => {
    const { f, cards, pressed, selClass } = mounted();
    assert.deepEqual(pressed(), ["green"]);
    assert.deepEqual(selClass(), ["green"]);
    const m = { cards };
    const nodes = f.counter.nodes;
    card(m, "brown").on.click();
    assert.deepEqual(pressed(), ["brown"]);
    assert.deepEqual(selClass(), ["brown"]);
    card(m, "blue").on.click();
    assert.deepEqual(pressed(), ["blue"]);
    assert.deepEqual(selClass(), ["blue"]);
    assert.equal(f.counter.nodes, nodes, "點卡片不建立任何節點");
    assert.equal(f.host.appendCount, 1, "不重建頁面");
    assert.equal(cards.length, 5);
  });

  test("卡片：預寫 300（棕）→ 點綠 → 725、只有綠卡選中；點藍 855、點金 990 不阻擋（GS-2、AC-01-05、AC-01-07、AC-26-02、AC-26-04）", () => {
    const m = mounted({ score: 300 });
    assert.deepEqual(m.pressed(), ["brown"]);
    const nodes = m.f.counter.nodes;
    card(m, "green").on.click();
    assert.equal(m.f.state.data.goal.draftScore, 725);
    assert.deepEqual(m.pressed(), ["green"]);
    card(m, "green").on.click();
    assert.equal(m.f.state.data.goal.draftScore, 725, "再點目前選中色級仍為上限");
    card(m, "blue").on.click();
    assert.equal(m.f.state.data.goal.draftScore, 855);
    assert.deepEqual(m.pressed(), ["blue"]);
    card(m, "gold").on.click();
    assert.equal(m.f.state.data.goal.draftScore, 990);
    assert.deepEqual(m.pressed(), ["gold"]);
    assert.equal(m.f.counter.setDraftScore, 0, "點卡片不經 setDraftScore");
    assert.equal(m.f.counter.nodes, nodes, "點卡片不建立任何節點");
  });

  test("卡片：依序點 5 色 → draftScore 為 215、465、725、855、990，選中卡片 = 所點色級（AC-02-04、V-ST-16）", () => {
    const m = mounted();
    const ids = ["orange", "brown", "green", "blue", "gold"];
    const got = ids.map((id) => { card(m, id).on.click(); assert.deepEqual(m.pressed(), [id]); return m.f.state.data.goal.draftScore; });
    assert.deepEqual(got, [215, 465, 725, 855, 990]);
  });

  test("（v0.10 暫停，程式保留）滑桿與輸入框 handler 仍可同步 draftScore 與選中卡片（AC-02-01、AC-02-02、AC-02-09、AC-26-03）", () => {
    const { f, byId, pressed } = mounted();
    const nodes = f.counter.nodes;
    const input = byId("cz-score-input");
    input.value = "300";
    input.on.input();
    assert.deepEqual(pressed(), ["brown"]);
    const slider = byId("cz-score-range");
    slider.value = "730";
    slider.on.input();
    assert.deepEqual(pressed(), ["blue"]);
    assert.equal(input.value, "730");
    input.value = "abc";
    input.on.input();
    assert.deepEqual(pressed(), ["blue"], "無效輸入：選中不變");
    assert.equal(f.counter.nodes, nodes);
  });

  // ── FE-43 AC-26-05：分數區隱藏且不可聚焦、卡片與狀態列無分數（單元層代理；正式驗收見 QA E2E） ──
  for (const opt of [{ entryMode: "firstRun" }, undefined, { entryMode: "main" }]) {
    const label = opt && opt.entryMode === "firstRun" ? "首次模式" : "一般模式";
    test("AC-26-05（" + label + "）：分數區 hidden 且 inert；滑桿、輸入框 disabled 且 tabindex=-1", () => {
      const m = mounted(opt);
      const sec = m.all.filter((x) => x.tag === "section" && / ?cz-score( |$)/.test(x.className || "") && /(^| )card( |$)/.test(x.className || ""));
      assert.equal(sec.length, 1, "分數區存在（程式保留）");
      assert.equal(sec[0].hidden, true);
      assert.equal(sec[0].getAttribute("inert"), "");
      for (const id of ["cz-score-range", "cz-score-input"]) {
        const el = m.byId(id);
        assert.ok(el, id);
        assert.notEqual(el.getAttribute("disabled"), null, id + " disabled");
        assert.equal(el.getAttribute("tabindex"), "-1", id);
      }
      // 錯誤提示在隱藏區內
      assert.ok(walk(sec[0]).includes(m.byId("cz-score-error")));
      const vis = visibleNodes(m.f.host);
      assert.ok(!vis.some((x) => x.getAttribute("id") === "cz-score-range" || x.getAttribute("id") === "cz-score-input"), "無可見的滑桿或輸入框");
    });

    test("AC-26-05（" + label + "）：依序點 5 張卡片後分數區仍隱藏、無可見「請輸入 10～990 的分數」；卡片無分數範圍、可見文字無目標分數", () => {
      const m = mounted(opt);
      const sec = m.all.find((x) => x.tag === "section" && / cz-score( |$)/.test(x.className || ""));
      for (const id of ["orange", "brown", "green", "blue", "gold"]) card(m, id).on.click();
      // 各種 store 通知與重新顯示後仍不改回可見
      m.f.notify(["goal"]);
      m.f.notify(["init"]);
      m.view.show();
      assert.equal(sec.hidden, true);
      assert.equal(m.byId("cz-score-error").hidden, true);
      const text = visibleText(m.f.host);
      assert.ok(!text.includes("請輸入 10～990 的分數"));
      assert.ok(!text.includes("目前目標分數"));
      assert.ok(!/\d+～\d+/.test(text), "可見文字無分數範圍");
      for (const b of m.cards) assert.ok(!/\d+～\d+/.test(textOf(b)) && !/\d+ 分/.test(textOf(b)), b.getAttribute("data-color"));
      assert.ok(!m.all.some((x) => / ?cz-color__range( |$)/.test(x.className || "")), "不建立 .cz-color__range");
    });
  }

  test("AC-26-05 (b)：狀態列只有「目前目標色級」「目前生效色級」，無「目前目標分數」", () => {
    const m = mounted();
    const slot = m.all.find((x) => x.className === "cz-status-slot");
    const labels = walk(slot).filter((x) => x.tag === "dt").map((x) => x.textContent);
    assert.deepEqual(labels, ["目前目標色級", "目前生效色級"]);
    assert.ok(!textOf(slot).includes("目前目標分數"));
    assert.ok(!m.all.some((x) => / ?cz-st-score( |$)/.test(x.className || "")));
  });

  test("說明文字：一般頁 intro 為「選擇色級即時試算，按「套用」後才會更新單字卡的單字集。」", () => {
    const m = mounted();
    assert.equal(m.all.find((x) => / ?cz-intro( |$)/.test(x.className || "")).textContent, "選擇色級即時試算，按「套用」後才會更新單字卡的單字集。");
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
    const title = all.find((x) => x.tag === "h2");
    const subtitle = all.find((x) => cls(x, "cz-subtitle"));
    const colorHeading = all.find((x) => x.getAttribute("id") === "cz-colors-title");
    const estimate = all.find((x) => cls(x, "cz-estimate"));
    const firstBar = all.find((x) => cls(x, "cz-firstbar"));
    const page = m.f.host.children[0];
    // 目前「可見」的按鈕（自身與祖先皆非 hidden）：「套用」區與固定底部列
    const vis = visibleNodes(m.f.host);
    const buttons = vis.filter((x) => x.tag === "button" && !x.getAttribute("data-color"))
      .map((b) => ({ id: b.getAttribute("id"), text: b.textContent, className: b.className }));
    return { all, page, actions, slot, guide, intro, title, subtitle, colorHeading, estimate, firstBar, buttons };
  }

  test("首次模式：標題「選擇你的目標」→ 副標 → 說明行 → 5 列 → 固定底部列；狀態列／試算卡／套用 hidden（FT-1、FT-2、AC-41-01、AC-25-01）", () => {
    const m = mounted({ entryMode: "firstRun", score: C.SCORE_DEFAULT });
    const p = parts(m);
    assert.equal(p.title.textContent, "選擇你的目標");
    assert.ok(cls(p.title, "page-title"));
    assert.equal(p.subtitle.hidden, false);
    assert.equal(p.subtitle.textContent, "之後可以在「難易度設定」隨時變更");
    assert.equal(p.slot.hidden, true, "狀態列隱藏");
    assert.equal(p.intro.hidden, true, "一般說明（提到「套用」）不顯示");
    assert.equal(p.estimate.hidden, true, "試算結果卡隱藏");
    assert.equal(p.actions.hidden, true, "「套用」區隱藏");
    assert.equal(p.colorHeading.hidden, true, "色級區標題隱藏");
    assert.equal(p.guide, undefined, "舊引導文字 #cz-guide 不再建立");
    assert.ok(!visibleNodes(m.f.host).some((x) => x.getAttribute("id") === "cz-apply"), "無可見「套用」");
    assert.equal(p.firstBar.hidden, false);
    // 可見順序（DOM 順序 = Tab 順序）：標題 → 副標 → 說明行 → 5 列 → 鎖定行（hidden）→ 摘要行 → 開始學習 → 從備份還原
    const vis = visibleNodes(m.f.host);
    const idx = (pred) => vis.findIndex(pred);
    const order = [
      idx((x) => x === p.title),
      idx((x) => x === p.subtitle),
      idx((x) => cls(x, "cz-vocab-note")),
      idx((x) => x === m.cards[0]),
      idx((x) => x === m.cards[4]),
      idx((x) => cls(x, "cz-firstbar__summary")),
      idx((x) => x.getAttribute("id") === "cz-start"),
      idx((x) => x.getAttribute("id") === "cz-restore"),
    ];
    assert.ok(order.every((i) => i >= 0), JSON.stringify(order));
    assert.deepEqual(order.slice().sort((a, b) => a - b), order, "順序");
    // 底部列內部順序：鎖定行 → 摘要行 → 開始學習 → 從備份還原
    assert.deepEqual(p.firstBar.children.map((x) => x.className), ["cz-firstbar__locked", "cz-firstbar__summary", "btn btn--accent cz-start", "btn btn--link cz-restore"]);
    assert.deepEqual(p.buttons.map((b) => b.text), ["開始學習", "從備份還原"]);
    assert.deepEqual(p.buttons.map((b) => b.id), ["cz-start", "cz-restore"]);
    assert.ok(/btn--accent/.test(p.buttons[0].className), "「開始學習」為強調橘按鈕");
    // 底部列在 .cz 頁面的最後（位於色級列之後、頁尾之前）
    assert.equal(p.page.children[p.page.children.length - 1], p.firstBar);
    // 預設 SCORE_DEFAULT（725）→ 綠；摘要行逐字、鎖定行隱藏
    assert.deepEqual(m.pressed(), ["green"]);
    assert.equal(walk(p.firstBar).find((x) => cls(x, "cz-firstbar__summary")).textContent, "綠級・每日 15 字\u3000預計 " + G.estimate(725, 0, NB, NG).weeks + " 週");
    assert.equal(p.firstBar.children[0].hidden, true);
    assert.equal(p.firstBar.children[0].getAttribute("role"), "status");
    assert.equal(p.firstBar.children[1].getAttribute("aria-live"), "polite");
    assert.equal(m.cards.length, 5);
  });

  test("首次模式：點藍 → 鎖定行顯示、摘要行加「（以綠試算）」；點綠 → 鎖定行隱藏；不建立新節點（FT-2、FT-5、AC-41-02）", () => {
    const m = mounted({ entryMode: "firstRun", score: C.SCORE_DEFAULT });
    const p = parts(m);
    const locked = p.firstBar.children[0];
    const summary = p.firstBar.children[1];
    const nodes = m.f.counter.nodes;
    card(m, "blue").on.click();
    assert.equal(locked.hidden, false);
    assert.equal(locked.textContent, "目前內建字庫到綠色為止");
    assert.ok(summary.textContent.startsWith("藍級・每日 20 字\u3000預計 "));
    assert.ok(summary.textContent.endsWith("週（以綠試算）"));
    card(m, "gold").on.click();
    assert.equal(locked.hidden, false);
    assert.ok(summary.textContent.startsWith("金級・每日 20 字"));
    card(m, "orange").on.click();
    assert.equal(locked.hidden, true);
    assert.equal(summary.textContent, "橘級・每日 10 字\u3000預計 15 週");
    assert.equal(m.f.counter.nodes, nodes, "點色級不建立節點");
    assert.equal(m.f.host.appendCount, 1);
  });

  test("一般模式：標題「難易度設定」、狀態列、色級標題、試算卡、「套用」可見；固定底部列與副標 hidden（FT-6、AC-25-06）", () => {
    for (const opt of [undefined, { entryMode: "main" }]) {
      const m = mounted(opt);
      const p = parts(m);
      assert.equal(p.title.textContent, "難易度設定");
      assert.deepEqual(p.buttons.map((b) => b.text), ["套用"]);
      assert.equal(p.buttons[0].id, "cz-apply");
      assert.equal(p.slot.hidden, false);
      assert.equal(p.intro.hidden, false);
      assert.equal(p.estimate.hidden, false);
      assert.equal(p.actions.hidden, false);
      assert.equal(p.colorHeading.hidden, false);
      assert.equal(p.colorHeading.textContent, "色級");
      assert.ok(cls(p.colorHeading, "section-title"));
      assert.equal(p.subtitle.hidden, true);
      assert.equal(p.firstBar.hidden, true, "固定底部列只屬首次畫面");
      assert.ok(!visibleNodes(m.f.host).some((x) => cls(x, "cz-firstbar__summary")));
      assert.equal(p.guide, undefined);
    }
  });

  test("首次模式：點卡片和一般模式相同（藍 855、綠 725），且不建立新節點（AC-26-02、AC-26-03、AC-22-04）", () => {
    const m = mounted({ entryMode: "firstRun", score: C.SCORE_DEFAULT });
    const nodes = m.f.counter.nodes;
    card(m, "blue").on.click();
    assert.equal(m.f.state.data.goal.draftScore, 855);
    assert.deepEqual(m.pressed(), ["blue"]);
    card(m, "green").on.click();
    assert.equal(m.f.state.data.goal.draftScore, 725);
    assert.deepEqual(m.pressed(), ["green"]);
    assert.equal(m.f.counter.nodes, nodes);
  });

  test("「開始學習」：不讀輸入框（setDraftScore 0 次）、直接 startLearning；收到 entry tag 後只重建按鈕區、狀態列顯示（AC-25-02、GS-3）", () => {
    const m = mounted({ entryMode: "firstRun", score: C.SCORE_DEFAULT });
    card(m, "brown").on.click();
    // 隱藏的輸入框即使有值也不得成為分數來源
    m.byId("cz-score-input").value = "990";
    const cardsBefore = m.cards.slice();
    const sliderBefore = m.byId("cz-score-range");
    const nodes = m.f.counter.nodes;
    const start = walk(m.f.host).find((x) => x.getAttribute("id") === "cz-start");
    start.on.click();
    assert.equal(m.f.counter.startLearning, 1);
    assert.equal(m.f.counter.setDraftScore, 0, "setDraftScore 0 次");
    assert.equal(m.f.state.data.goal.appliedScore, 465);
    const p = parts(m);
    assert.deepEqual(p.buttons.map((b) => b.text), ["套用"]);
    assert.equal(p.slot.hidden, false);
    assert.equal(p.firstBar.hidden, true);
    assert.equal(p.title.textContent, "難易度設定");
    assert.equal(p.estimate.hidden, false);
    assert.equal(p.intro.hidden, false);
    // 狀態列已更新為套用後的色級
    assert.equal(walk(m.f.host).find((x) => cls(x, "cz-st-target")).textContent, "棕");
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

  test("還原成功的通知（entry + goal，非本頁發起）→ 切回一般模式並同步為備份的色級（AC-25-10、E-58）", () => {
    const m = mounted({ entryMode: "firstRun" });
    m.f.state.data.goal = { draftScore: 300, appliedScore: 300, appliedColor: "brown", effectiveColor: "brown" };
    m.f.state.runtime.entryMode = "main";
    m.f.notify(["goal", "studySet", "flashcard", "stats", "entry"]);
    assert.deepEqual(parts(m).buttons.map((b) => b.text), ["套用"]);
    assert.deepEqual(m.pressed(), ["brown"]);
    assert.equal(walk(m.f.host).find((x) => cls(x, "cz-st-target")).textContent, "棕");
    // 模式未變的後續通知不重建按鈕區
    const nodes = m.f.counter.nodes;
    m.f.notify(["entry"]);
    m.f.notify(["goal"]);
    assert.equal(m.f.counter.nodes, nodes);
  });

  // ── FE-43 AC-26-06：既有分數原值保留，不點卡片「套用」不從輸入框回寫（GS-3） ──
  test("AC-26-06：預寫 735 → 選中藍、試算每日新字量 20；不點卡片按「套用」→ setDraftScore 0 次、appliedScore 735", () => {
    const m = mounted({ score: 735 });
    assert.deepEqual(m.pressed(), ["blue"]);
    assert.equal(estDailyOf(m), "20 字/天");
    m.byId("cz-score-input").value = "600";   // 隱藏輸入框的值不得影響套用
    applyBtn(m).on.click();
    assert.equal(m.f.counter.setDraftScore, 0);
    assert.equal(m.f.counter.requestApplyGoal, 1);
    assert.equal(m.f.state.data.goal.appliedScore, 735);
    assert.equal(m.f.state.data.goal.draftScore, 735);
    assert.deepEqual(m.pressed(), ["blue"]);
  });

  // ── FE-40 切換難易度初始化確認視窗（architecture.md §7.15、§10.2；v0.10 改以點卡片建立狀態、以選中卡片判定） ──
  const tick = () => new Promise((r) => setImmediate(r));
  function applyBtn(m) { return walk(m.f.host).find((x) => x.getAttribute("id") === "cz-apply"); }
  /** 一般模式掛載（既有 600，綠）後點 colorId 卡片，回傳 mounted 物件 */
  function mountedAt(colorId, opt) {
    const m = mounted(opt);
    card(m, colorId).on.click();
    return m;
  }

  test("FE-40：requestApplyGoal 回 \"confirm\" → 開視窗一次，參數同 reinitDialogOptions；開啟中再按「套用」不重複開窗（AC-32-01）", async () => {
    const m = mountedAt("brown", { applyStatus: "confirm" });
    applyBtn(m).on.click();
    assert.equal(m.f.counter.requestApplyGoal, 1);
    assert.equal(m.f.counter.applyGoal, 0, "view 不直接呼叫 applyGoal");
    assert.equal(m.f.counter.setDraftScore, 0, "「套用」不從輸入框回寫（GS-3）");
    assert.equal(m.f.dialogCalls.length, 1);
    assert.deepEqual(m.f.dialogCalls[0].opts, H.reinitDialogOptions());
    // 視窗開啟期間：狀態未改（生效色級仍綠），選中卡片仍為使用者選的棕
    assert.equal(m.f.state.data.goal.appliedScore, 600);
    assert.deepEqual(m.pressed(), ["brown"]);
    applyBtn(m).on.click();
    applyBtn(m).on.click();
    assert.equal(m.f.dialogCalls.length, 1, "不重複開窗");
    assert.equal(m.f.counter.requestApplyGoal, 1, "開啟中不再呼叫 requestApplyGoal");
    assert.equal(m.f.counter.confirmApplyGoal + m.f.counter.cancelApplyGoal, 0, "按下任一按鈕前不確認也不取消");
    m.f.dialogCalls[0].resolve(false);
    await tick();
    // 關閉後可再開
    card(m, "brown").on.click();
    applyBtn(m).on.click();
    assert.equal(m.f.dialogCalls.length, 2);
  });

  test("FE-40：確定 → confirmApplyGoal 一次；成功時狀態列與選中卡片更新為棕、不顯示失敗訊息（AC-32-02、AC-03-05）", async () => {
    const m = mountedAt("brown", { applyStatus: "confirm" });
    applyBtn(m).on.click();
    m.f.dialogCalls[0].resolve(true);
    await tick();
    assert.equal(m.f.counter.confirmApplyGoal, 1);
    assert.equal(m.f.counter.cancelApplyGoal, 0);
    assert.equal(m.f.counter.applyGoal, 0);
    assert.equal(m.f.state.data.goal.appliedScore, 465);
    assert.equal(walk(m.f.host).find((x) => cls(x, "cz-st-target")).textContent, "棕");
    assert.equal(walk(m.f.host).find((x) => cls(x, "cz-st-effective")).textContent, "棕");
    assert.deepEqual(m.pressed(), ["brown"]);
    assert.ok(!m.f.toasts.some((t) => t.text === "儲存空間不足，未套用"));
  });

  test("FE-40：確定但寫入失敗（quota、error）→ toast「儲存空間不足，未套用」（kind error）；選中卡片回到綠、draftScore 600（AC-32-11 (b)、GS-8）", async () => {
    for (const reason of ["quota", "error"]) {
      const m = mountedAt("brown", { applyStatus: "confirm", confirmResult: { ok: false, reason } });
      applyBtn(m).on.click();
      m.f.dialogCalls[0].resolve(true);
      await tick();
      assert.equal(m.f.counter.confirmApplyGoal, 1, reason);
      assert.deepEqual(m.f.toasts, [{ text: "儲存空間不足，未套用", kind: "error" }], reason);
      assert.equal(m.f.state.data.goal.draftScore, 600, reason);
      assert.deepEqual(m.pressed(), ["green"], reason);
      assert.equal(estDailyOf(m), "15 字/天", reason);
      assert.equal(walk(m.f.host).find((x) => cls(x, "cz-st-effective")).textContent, "綠", reason);
    }
  });

  test("FE-40 + FE-43（AC-32-04、GS-8）：既有 600 點棕 →「套用」→ 取消 → 綠卡 aria-pressed=true、其餘 false、每日新字量 15、draftScore 600", async () => {
    const m = mountedAt("brown", { applyStatus: "confirm" });
    assert.equal(m.f.state.data.goal.draftScore, 465);
    assert.equal(estDailyOf(m), "10 字/天");
    const estColor = walk(m.f.host).find((x) => cls(x, "cz-est-color"));
    assert.equal(estColor.textContent, "棕");
    const nodes = m.f.counter.nodes;
    applyBtn(m).on.click();
    m.f.dialogCalls[0].resolve(false);
    await tick();
    assert.equal(m.f.counter.cancelApplyGoal, 1);
    assert.equal(m.f.counter.confirmApplyGoal, 0);
    assert.equal(m.f.state.data.goal.draftScore, 600, "回到原值 600（不轉 725）");
    assert.deepEqual(m.cards.map((b) => b.getAttribute("aria-pressed")), ["false", "false", "true", "false", "false"]);
    assert.equal(estDailyOf(m), "15 字/天");
    assert.equal(estColor.textContent, "綠");
    assert.equal(walk(m.f.host).find((x) => cls(x, "cz-st-effective")).textContent, "綠");
    assert.equal(m.f.toasts.length, 0);
    assert.equal(m.f.counter.nodes, nodes, "不建立新節點");
  });

  test("FE-40：\"applied\" 不開窗、toast「已套用目標」；\"ignored\" 不開窗（AC-01-02、AC-32-05～AC-32-07）", async () => {
    const m = mountedAt("brown", { applyStatus: "applied" });
    applyBtn(m).on.click();
    await tick();
    assert.equal(m.f.dialogCalls.length, 0);
    assert.equal(m.f.counter.requestApplyGoal, 1);
    assert.equal(m.f.counter.applyGoal, 0);
    assert.equal(m.f.counter.setDraftScore, 0);
    assert.deepEqual(m.f.toasts, [{ text: "已套用目標", kind: "success" }]);
    assert.equal(m.f.state.data.goal.appliedScore, 465);
    assert.equal(walk(m.f.host).find((x) => cls(x, "cz-st-target")).textContent, "棕");
    const n = mountedAt("brown", { applyStatus: "ignored" });
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
    assert.equal(m.f.counter.setDraftScore, 0);
    assert.equal(m.f.dialogCalls.length, 0);
  });

  test("FE-40：缺少 EMT.ui.dialog → 丟出含模組名稱的 Error（LD-3），草稿已還原、選中卡片回綠", () => {
    const m = mountedAt("brown", { applyStatus: "confirm" });
    delete m.f.root.EMT.ui.dialog;
    assert.throws(() => applyBtn(m).on.click(), /EMT\.ui\.dialog/);
    assert.equal(m.f.counter.cancelApplyGoal, 1);
    assert.equal(m.f.state.data.goal.draftScore, 600);
    assert.deepEqual(m.pressed(), ["green"]);
  });

  // ── FE-40／FE-43 與真實 store 整合（有學習紀錄、既有 600 綠 → 點棕 465） ──
  const F = require("./_fixtures.js");
  const P = require("../core/persist.js");
  const KEY = "englishMasterTrack:state";
  /** 既有分數 score（v0.9 以前的 600 等，GS-4）+ 學習紀錄 */
  function learnedStore(score = 600) {
    const d = P.defaultData();
    const c = G.colorOf(score);
    d.goal = { draftScore: score, appliedScore: score, appliedColor: c, effectiveColor: G.effectiveColorOf(c) };
    d.masteredWordKeys = ["word1", "word2", "word3", "word4", "word5"];
    d.part5 = Object.assign({}, d.part5, { totalAnswered: 10, totalCorrect: 6 });
    const storage = F.fakeStorage({ [KEY]: JSON.stringify(P.buildRecord(d, new Date("2026-10-29T00:00:00Z"))) });
    return F.makeStore({ storage });
  }

  test("FE-40 整合：真實 store，取消 → setItem 0 次、localStorage 與學習紀錄不變、綠卡選中、draftScore 600（AC-32-01、AC-32-04、GS-8）", async () => {
    const s = learnedStore();
    assert.equal(s.store.getState().data.goal.draftScore, 600, "既有分數原值保留（GS-4）");
    const m = mountedAt("brown", { store: s.store });
    assert.equal(s.store.getState().data.goal.draftScore, 465);
    // 「按套用前」的 localStorage（點卡片本來就會寫入 draftScore；取消依 CI-9 不寫入，契約 FB-35）
    const raw = s.storage.map.get(KEY);
    const calls = s.storage.setCalls.length;
    applyBtn(m).on.click();
    assert.equal(m.f.counter.setDraftScore, 0, "「套用」不從輸入框回寫");
    assert.equal(m.f.dialogCalls.length, 1, "有學習紀錄且生效色級改變 → 開窗");
    assert.equal(s.store.getState().data.goal.effectiveColor, "green");
    assert.equal(s.storage.setCalls.length, calls, "開窗期間 setItem 0 次");
    m.f.dialogCalls[0].resolve(false);
    await tick();
    assert.equal(s.storage.setCalls.length, calls, "取消 setItem 0 次");
    assert.equal(s.storage.map.get(KEY), raw);
    assert.equal(s.store.getState().data.goal.draftScore, 600);
    assert.equal(s.store.getState().data.masteredWordKeys.length, 5);
    assert.deepEqual(m.cards.map((b) => b.getAttribute("aria-pressed")), ["false", "false", "true", "false", "false"]);
    assert.equal(estDailyOf(m), "15 字/天");
  });

  test("FE-40 整合：真實 store，確定 → 學習紀錄初始化、生效色級棕；quota 時 toast 失敗、localStorage 不變、綠卡選中（AC-32-02、AC-32-11）", async () => {
    const s = learnedStore();
    const m = mountedAt("brown", { store: s.store });
    applyBtn(m).on.click();
    m.f.dialogCalls[0].resolve(true);
    await tick();
    const d = s.store.getState().data;
    assert.equal(d.goal.appliedScore, 465);
    assert.equal(d.goal.effectiveColor, "brown");
    assert.equal(d.masteredWordKeys.length, 0);
    assert.equal(d.part5.totalAnswered, 0);
    assert.equal(walk(m.f.host).find((x) => cls(x, "cz-st-effective")).textContent, "棕");
    assert.ok(!m.f.toasts.some((t) => t.kind === "error"));

    const q = learnedStore();
    const n = mountedAt("brown", { store: q.store });
    const raw = q.storage.map.get(KEY);
    q.storage.quota = true;
    applyBtn(n).on.click();
    n.f.dialogCalls[0].resolve(true);
    await tick();
    assert.deepEqual(n.f.toasts, [{ text: "儲存空間不足，未套用", kind: "error" }]);
    assert.equal(q.storage.map.get(KEY), raw);
    assert.equal(q.store.getState().data.goal.effectiveColor, "green");
    assert.equal(q.store.getState().data.goal.draftScore, 600);
    assert.equal(q.store.getState().data.masteredWordKeys.length, 5);
    assert.deepEqual(n.pressed(), ["green"]);
  });

  test("AC-26-06 整合：真實 store 預寫 735 → 選中藍、每日新字量 20；不點卡片「套用」→ setDraftScore 0 次、appliedScore 與 localStorage 皆 735", () => {
    const P2 = require("../core/persist.js");
    const d = P2.defaultData();
    d.goal = { draftScore: 735, appliedScore: 735, appliedColor: "blue", effectiveColor: "green" };
    const storage = F.fakeStorage({ [KEY]: JSON.stringify(P2.buildRecord(d, new Date("2026-10-29T00:00:00Z"))) });
    const s = F.makeStore({ storage });
    const m = mounted({ store: s.store });
    assert.deepEqual(m.pressed(), ["blue"]);
    assert.equal(estDailyOf(m), "20 字/天");
    applyBtn(m).on.click();
    assert.equal(m.f.counter.setDraftScore, 0);
    assert.equal(s.store.getState().data.goal.appliedScore, 735);
    assert.equal(JSON.parse(storage.map.get(KEY)).data.goal.appliedScore, 735);
  });

  test("真實 store 預設資料：選中綠、draftScore === C.SCORE_DEFAULT（AC-18-02、GS-7）", () => {
    const s = F.makeStore();
    const m = mounted({ store: s.store });
    assert.equal(s.store.getState().data.goal.draftScore, C.SCORE_DEFAULT);
    assert.deepEqual(m.pressed(), ["green"]);
    const f = F.makeStore({ firstRun: true });
    const n = mounted({ store: f.store });
    assert.equal(f.store.getState().data.goal.draftScore, C.SCORE_DEFAULT);
    assert.deepEqual(n.pressed(), ["green"]);
  });
});

describe("customizer.test.js：首次模式按鈕區模型（FE-32）", () => {
  test("actionsModel(\"firstRun\")：標題「選擇你的目標」、副標、「開始學習」「從備份還原」、固定底部列；無「套用」、狀態列、試算卡（FT-1、FT-2）", () => {
    const m = H.actionsModel("firstRun");
    assert.equal(m.mode, "firstRun");
    assert.equal(m.title, "選擇你的目標");
    assert.deepEqual(m.buttons.map((b) => b.text), ["開始學習", "從備份還原"]);
    assert.deepEqual(m.buttons.map((b) => b.primary), [true, false]);
    assert.ok(!m.buttons.some((b) => b.text === "套用"));
    assert.equal(m.showSubtitle, true);
    assert.equal(m.showStatus, false);
    assert.equal(m.showIntro, false);
    assert.equal(m.showColorHeading, false);
    assert.equal(m.showEstimate, false);
    assert.equal(m.showFirstBar, true);
    assert.equal(m.guide, "", "舊引導文字不再顯示");
  });

  test("actionsModel(\"main\")（與其他值）：標題「難易度設定」、只有「套用」、顯示狀態列與試算卡、無固定底部列", () => {
    for (const v of ["main", undefined, null, "boot"]) {
      const m = H.actionsModel(v);
      assert.equal(m.mode, "main");
      assert.equal(m.title, "難易度設定");
      assert.deepEqual(m.buttons.map((b) => b.text), ["套用"]);
      assert.equal(m.showStatus, true);
      assert.equal(m.showIntro, true);
      assert.equal(m.showColorHeading, true);
      assert.equal(m.showEstimate, true);
      assert.equal(m.showFirstBar, false);
      assert.equal(m.showSubtitle, false);
      assert.equal(m.guide, "");
    }
  });

  test("T.title、T.intro 字串不變（naming.test.js 檢查）", () => {
    assert.equal(H.TEXT.title, "難易度設定");
    assert.equal(H.TEXT.intro, "選擇色級即時試算，按「套用」後才會更新單字卡的單字集。");
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

  test("原始碼掃描（FE-43，GS-3、GS-6）：分數區只在建立時設 hidden = true；「套用」「開始學習」不讀輸入框", () => {
    const src = fs.readFileSync(path.join(__dirname, "..", "views", "customizer.js"), "utf8");
    assert.ok(/scoreSection\.hidden\s*=\s*true/.test(src));
    assert.ok(!/scoreSection\.hidden\s*=\s*false/.test(src), "不得把分數區改回可見");
    assert.ok(!/cz-color__range/.test(src), "卡片不建立分數範圍節點");
    const body = (name) => {
      const i = src.indexOf("function " + name + "(");
      const j = src.indexOf("\n    }\n", i);
      assert.ok(i >= 0 && j > i, name);
      return src.slice(i, j);
    };
    for (const fn of ["onApply", "onStartLearning"]) {
      const b = body(fn);
      assert.ok(!/refs\.input/.test(b) && !/setDraftScore/.test(b) && !/parseScoreInput/.test(b), fn + " 不讀輸入框");
    }
  });
});
