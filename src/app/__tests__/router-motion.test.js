/*
 * router-motion.test.js — 換頁動畫、減少動態、CSS 動畫常數一致（FE-24）；首次進入模式（FE-32）
 * 依據：architecture.md v0.4 §4.2（router 新行為）、§4.5（motion 介面）、§7.11（A-1～A-4、換頁列）、§7.12、§10.1
 * 涵蓋：US-31；AC-31-01、AC-31-02、AC-31-03、AC-31-04、AC-22-01（performance.mark 輔助點）；
 *       （v0.5，FE-38）AC-20-04、HT-3、HT-5、E-68：隱藏頁守門與 hashchange 守門（§4.2 v0.5、§7.16、§10.2）
 * 做法：極簡假 DOM（getElementById、classList、hidden、setAttribute、dataset）＋ node:vm 載入
 *       core/constants.js、core/interaction.js、ui/motion.js、ui/router.js；計時器以假 setTimeout 手動推進；
 *       假 window.location、window.addEventListener("hashchange") 由測試手動觸發。
 */
"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const APP_DIR = path.join(__dirname, "..");
const interaction = require(path.join(APP_DIR, "core", "interaction.js"));

const F = require("./_fixtures.js");
const MAIN_KEY = require(path.join(APP_DIR, "core", "constants.js")).STORAGE_KEYS.state;

const TABS = ["dashboard", "customizer", "flashcards", "part5", "decoder", "phrasebank", "sources", "about", "contact", "privacy"];
// （v0.5）導覽按鈕 = NAV_TAB_ORDER（隱藏頁不在導覽中）
const NAV_TABS = ["dashboard", "customizer", "flashcards", "part5"];
const ENTER = "view--entering";

/** 讀取原始碼（去除 BOM） */
function source(rel) {
  return fs.readFileSync(path.join(APP_DIR, rel), "utf8").replace(/^﻿/, "");
}

// ─────────────────────────────────────────────────────────────
// 極簡假 DOM
// ─────────────────────────────────────────────────────────────

/** 假 classList */
function makeClassList() {
  const set = new Set();
  return {
    add: (c) => set.add(c),
    remove: (c) => set.delete(c),
    contains: (c) => set.has(c),
    toggle: (c, force) => {
      const on = force === undefined ? !set.has(c) : !!force;
      if (on) set.add(c);
      else set.delete(c);
      return on;
    },
    _set: set
  };
}

/** 假元素 */
function makeEl(id, attrs) {
  const a = Object.assign({}, attrs || {});
  const listeners = {};
  return {
    nodeType: 1,
    id: id,
    hidden: true,
    dataset: {},
    classList: makeClassList(),
    parentNode: null,
    children: [],
    setAttribute: (k, v) => { a[k] = String(v); },
    getAttribute: (k) => (Object.prototype.hasOwnProperty.call(a, k) ? a[k] : null),
    removeAttribute: (k) => { delete a[k]; },
    hasAttribute: (k) => Object.prototype.hasOwnProperty.call(a, k),
    addEventListener: (t, fn) => { (listeners[t] = listeners[t] || []).push(fn); },
    contains: function (n) { return n === this || this.children.indexOf(n) >= 0; },
    focus() {},
    _listeners: listeners
  };
}

/**
 * 建立沙箱並依建置順序載入 interaction、motion、router。
 * @param {{ reduce?: boolean, noMatchMedia?: boolean, noConstants?: boolean, hash?: string }} [opt]
 */
function setup(opt) {
  opt = opt || {};
  const els = {};
  for (const t of TABS) els["view-" + t] = makeEl("view-" + t);
  const nav = makeEl("app-nav");
  const navBtns = NAV_TABS.map((t) => {
    const b = makeEl(null, { "data-tab": t });
    b.parentNode = nav;
    nav.children.push(b);
    return b;
  });
  nav.querySelectorAll = () => navBtns;
  els["app-nav"] = nav;
  els["nav-toggle"] = makeEl("nav-toggle");

  const docListeners = {};
  const document = {
    getElementById: (id) => els[id] || null,
    addEventListener: (t, fn) => { (docListeners[t] = docListeners[t] || []).push(fn); },
    body: makeEl("body")
  };

  // 假計時器
  let now = 0;
  let seq = 0;
  const pending = new Map();
  const timers = {
    setTimeout: (fn, ms) => { const id = ++seq; pending.set(id, { at: now + ms, fn }); return id; },
    clearTimeout: (id) => { pending.delete(id); },
    advance(ms) {
      now += ms;
      for (const [id, t] of [...pending].sort((x, y) => x[1].at - y[1].at)) {
        if (t.at <= now && pending.has(id)) {
          pending.delete(id);
          t.fn();
        }
      }
    },
    count: () => pending.size,
    delays: () => [...pending.values()].map((t) => t.at - now)
  };

  const marks = [];
  const errors = [];
  const winListeners = {};
  const state = { reduce: !!opt.reduce, mmCalls: 0 };
  const sandbox = {
    console: { log() {}, info() {}, warn() {}, error: (...a) => errors.push(a), debug() {} },
    location: { hash: opt.hash || "", pathname: "/p/index.html", search: "?x=1" },
    addEventListener: (t, fn) => { (winListeners[t] = winListeners[t] || []).push(fn); },
    setTimeout: timers.setTimeout,
    clearTimeout: timers.clearTimeout,
    WeakMap: WeakMap,
    performance: { mark: (n) => marks.push(n) },
    scrollTo() {}
  };
  if (!opt.noMatchMedia) {
    sandbox.matchMedia = (q) => {
      state.mmCalls++;
      return { matches: q === "(prefers-reduced-motion: reduce)" && state.reduce, media: q };
    };
  }
  // （v0.19）假 history：replaceState 比照瀏覽器移除片段、不觸發 hashchange；noHistory／replaceThrows 模擬失敗（SP-6）
  const replaced = [];
  if (!opt.noHistory) {
    sandbox.history = {
      replaceState(st, title, url) {
        if (opt.replaceThrows) throw new Error("SecurityError");
        replaced.push({ st, title, url });
        sandbox.location.hash = "";
      }
    };
  }
  sandbox.self = sandbox;
  sandbox.window = sandbox;
  vm.createContext(sandbox);

  // 依建置層序載入（core → ui；ui 內 motion 早於 router）。載入時不得操作 DOM（LD-2）：document 在載入後才放入
  const files = (opt.noConstants ? [] : ["core/constants.js"]).concat(["core/interaction.js", "ui/motion.js", "ui/router.js"]);
  for (const rel of files) {
    vm.runInContext(source(rel), sandbox, { filename: rel });
  }
  sandbox.document = document;

  const EMT = sandbox.EMT;
  return {
    EMT,
    sandbox,
    els,
    navBtns,
    document,
    // 觸發 document 上的事件委派（[data-go] click 等）
    dispatch: (type, ev) => (docListeners[type] || []).forEach((fn) => fn(ev)),
    timers,
    marks,
    errors,
    winListeners,
    replaced,
    // 模擬網址列輸入片段：改 location.hash 並觸發 window 的 hashchange
    setHash: (h) => {
      sandbox.location.hash = h;
      (winListeners.hashchange || []).forEach((fn) => fn({ type: "hashchange" }));
    },
    state,
    view: (t) => els["view-" + t],
    shown: () => TABS.filter((t) => els["view-" + t].hidden === false),
    entering: () => TABS.filter((t) => els["view-" + t].classList.contains(ENTER))
  };
}

// ─────────────────────────────────────────────────────────────
// ui/motion.js
// ─────────────────────────────────────────────────────────────

describe("ui/motion.js", () => {
  test("載入只登錄 EMT.ui.motion（reduced、enter、cancel）", () => {
    const { EMT } = setup();
    assert.equal(typeof EMT.ui.motion.reduced, "function");
    assert.equal(typeof EMT.ui.motion.enter, "function");
    assert.equal(typeof EMT.ui.motion.cancel, "function");
  });

  test("reduced()：每次呼叫即時查詢 matchMedia；matchMedia 不存在 → false", () => {
    const s = setup();
    assert.equal(s.EMT.ui.motion.reduced(), false);
    s.state.reduce = true;
    assert.equal(s.EMT.ui.motion.reduced(), true);
    s.state.reduce = false;
    assert.equal(s.EMT.ui.motion.reduced(), false);
    assert.ok(s.state.mmCalls >= 3);

    const n = setup({ noMatchMedia: true });
    assert.equal(n.EMT.ui.motion.reduced(), false);
  });

  test("enter：加上 class，ms + ANIM_CLEANUP_MARGIN_MS 後移除（不依賴 animationend）", () => {
    const s = setup();
    const el = s.view("dashboard");
    assert.equal(s.EMT.ui.motion.enter(el, "x-anim", 200), true);
    assert.ok(el.classList.contains("x-anim"));
    assert.deepEqual(s.timers.delays(), [200 + interaction.UI.ANIM_CLEANUP_MARGIN_MS]);
    s.timers.advance(249);
    assert.ok(el.classList.contains("x-anim"));
    s.timers.advance(1);
    assert.ok(!el.classList.contains("x-anim"));
    assert.equal(s.timers.count(), 0);
  });

  test("enter 重複呼叫：先取消舊計時器再重設，只保留一個計時器", () => {
    const s = setup();
    const el = s.view("dashboard");
    s.EMT.ui.motion.enter(el, "x-anim", 200);
    s.timers.advance(200);
    s.EMT.ui.motion.enter(el, "x-anim", 200);
    assert.equal(s.timers.count(), 1);
    s.timers.advance(100); // 舊計時器原本會在此時移除 class
    assert.ok(el.classList.contains("x-anim"));
    s.timers.advance(150);
    assert.ok(!el.classList.contains("x-anim"));
  });

  test("同元素不同 class 各自計時；cancel 立刻移除並清計時器", () => {
    const s = setup();
    const el = s.view("dashboard");
    s.EMT.ui.motion.enter(el, "a", 100);
    s.EMT.ui.motion.enter(el, "b", 300);
    assert.equal(s.timers.count(), 2);
    s.EMT.ui.motion.cancel(el, "a");
    assert.ok(!el.classList.contains("a"));
    assert.ok(el.classList.contains("b"));
    assert.equal(s.timers.count(), 1);
    s.timers.advance(400);
    assert.ok(!el.classList.contains("b"));
  });

  test("reduced() 為真時 enter 不加 class、不設計時器（AC-31-03）", () => {
    const s = setup({ reduce: true });
    const el = s.view("dashboard");
    assert.equal(s.EMT.ui.motion.enter(el, "x-anim", 200), false);
    assert.ok(!el.classList.contains("x-anim"));
    assert.equal(s.timers.count(), 0);
  });

  test("非元素或空 class 不拋例外", () => {
    const s = setup();
    const m = s.EMT.ui.motion;
    assert.doesNotThrow(() => m.enter(null, "a", 100));
    assert.doesNotThrow(() => m.enter({}, "a", 100));
    assert.doesNotThrow(() => m.cancel(undefined, "a"));
    assert.equal(m.enter(s.view("dashboard"), "", 100), false);
  });
});

// ─────────────────────────────────────────────────────────────
// ui/router.js 換頁
// ─────────────────────────────────────────────────────────────

describe("ui/router.js 換頁動畫（§7.11）", () => {
  test("切到不同頁：新頁顯示並加上 view--entering，PAGE_ANIM_MS + 50 後移除；performance.mark(\"emt-page-shown\")", () => {
    const s = setup();
    s.EMT.router.start("dashboard");
    assert.deepEqual(s.shown(), ["dashboard"]);
    assert.deepEqual(s.marks, ["emt-page-shown"]);

    assert.equal(s.EMT.router.go("flashcards"), true);
    assert.deepEqual(s.shown(), ["flashcards"]);
    assert.deepEqual(s.entering(), ["flashcards"]);
    assert.deepEqual(s.marks, ["emt-page-shown", "emt-page-shown"]);
    assert.deepEqual(s.timers.delays(), [interaction.UI.PAGE_ANIM_MS + interaction.UI.ANIM_CLEANUP_MARGIN_MS]);
    s.timers.advance(interaction.UI.PAGE_ANIM_MS + interaction.UI.ANIM_CLEANUP_MARGIN_MS);
    assert.deepEqual(s.entering(), []);
    assert.deepEqual(s.shown(), ["flashcards"]);
  });

  test("連續 go 3 頁（動畫進行中）→ 只有最後一頁 hidden = false，其餘無 view--entering（AC-31-02）", () => {
    const s = setup();
    s.EMT.router.start("dashboard");
    s.EMT.router.go("customizer");
    s.timers.advance(30);
    s.EMT.router.go("part5");
    s.timers.advance(30);
    s.EMT.router.go("sources");
    assert.deepEqual(s.shown(), ["sources"]);
    assert.deepEqual(s.entering(), ["sources"]);
    assert.equal(s.timers.count(), 1, "舊頁的計時器已清除");
    s.timers.advance(1000);
    assert.deepEqual(s.shown(), ["sources"]);
    assert.deepEqual(s.entering(), [], "動畫結束後不殘留進場 class");
    assert.equal(s.EMT.router.current(), "sources");
  });

  test("同頁重複 go 不重播動畫、不再 mark", () => {
    const s = setup();
    s.EMT.router.start("dashboard");
    s.EMT.router.go("part5");
    s.timers.advance(1000);
    const marks = s.marks.length;
    assert.equal(s.EMT.router.go("part5"), true);
    assert.deepEqual(s.entering(), []);
    assert.equal(s.timers.count(), 0);
    assert.equal(s.marks.length, marks);
  });

  test("起始頁（尚無目前頁面）不播放動畫", () => {
    const s = setup();
    s.EMT.router.start("customizer");
    assert.deepEqual(s.shown(), ["customizer"]);
    assert.deepEqual(s.entering(), []);
  });

  test("reduced() 為真時換頁不加 class，頁面照常切換（AC-31-03）", () => {
    const s = setup({ reduce: true });
    s.EMT.router.start("dashboard");
    s.EMT.router.go("flashcards");
    s.EMT.router.go("part5");
    assert.deepEqual(s.shown(), ["part5"]);
    assert.deepEqual(s.entering(), []);
    assert.equal(s.timers.count(), 0);
    assert.equal(s.marks.length, 3);
  });

  test("既有行為不變：mount 一次、show／hide、aria-current、setTab", () => {
    const s = setup();
    const calls = [];
    s.EMT.views.register("dashboard", {
      mount: () => calls.push("mount:d"),
      show: () => calls.push("show:d"),
      hide: () => calls.push("hide:d")
    });
    s.EMT.views.register("part5", {
      mount: () => calls.push("mount:p"),
      show: () => calls.push("show:p"),
      hide: () => calls.push("hide:p")
    });
    const tabs = [];
    s.EMT.store = { actions: { setTab: (t) => tabs.push(t) } };
    s.EMT.router.start("dashboard");
    s.EMT.router.go("part5");
    s.EMT.router.go("dashboard");
    s.EMT.router.go("dashboard");
    assert.deepEqual(calls, ["mount:d", "show:d", "mount:p", "hide:d", "show:p", "hide:p", "show:d"]);
    assert.deepEqual(tabs, ["dashboard", "part5", "dashboard", "dashboard"]);
    const cur = s.navBtns.filter((b) => b.getAttribute("aria-current") === "page").map((b) => b.getAttribute("data-tab"));
    assert.deepEqual(cur, ["dashboard"]);
    assert.equal(s.EMT.router.go("nope"), false);
  });

  test("motion 模組不存在時換頁照常（無動畫）", () => {
    const s = setup();
    delete s.EMT.ui.motion;
    s.EMT.router.start("dashboard");
    assert.equal(s.EMT.router.go("sources"), true);
    assert.deepEqual(s.shown(), ["sources"]);
    assert.deepEqual(s.entering(), []);
  });
});

// ─────────────────────────────────────────────────────────────
// 靜態檢查：05-motion.css、原始碼
// ─────────────────────────────────────────────────────────────

describe("styles/05-motion.css 與原始碼靜態檢查", () => {
  const css = source("styles/05-motion.css");
  const cssNoComment = css.replace(/\/\*[\s\S]*?\*\//g, "");

  /** 讀 :root 中的 CSS 變數（毫秒） */
  function cssVarMs(name) {
    const m = cssNoComment.match(new RegExp("--" + name + "\\s*:\\s*(\\d+(?:\\.\\d+)?)(ms|s)\\s*;"));
    assert.ok(m, "找不到 --" + name);
    return m[2] === "s" ? Number(m[1]) * 1000 : Number(m[1]);
  }

  test("5 個動畫時間變數 = interaction.UI 對應值，且 ≤ PRD 上限（A-4、§7.12）", () => {
    const U = interaction.UI;
    const L = interaction.LIMITS;
    const pairs = [
      ["emt-dur-page", U.PAGE_ANIM_MS, L.PAGE],
      ["emt-dur-flip", U.FLIP_ANIM_MS, L.FLIP],
      ["emt-dur-slide", U.SLIDE_ANIM_MS, L.PAGE], // PRD 未訂；SD 訂 ≤ 換頁上限
      ["emt-dur-answer", U.ANSWER_ANIM_MS, L.ANSWER],
      ["emt-dur-ring", U.RING_ANIM_MS, null] // PRD 未訂
    ];
    for (const [name, js, limit] of pairs) {
      const v = cssVarMs(name);
      assert.equal(v, js, "--" + name + " 須等於 interaction.UI");
      if (limit !== null) assert.ok(v <= limit, "--" + name + " 超過上限 " + limit);
    }
    assert.ok(/:root\s*\{[^}]*--emt-dur-page/.test(cssNoComment), "變數須定義在 :root");
  });

  test("換頁動畫：@keyframes emt-view-in 與 .view.view--entering 使用 --emt-dur-page", () => {
    assert.ok(/@keyframes\s+emt-view-in\s*\{/.test(cssNoComment));
    assert.ok(
      /\.view\.view--entering\s*\{[^}]*animation\s*:\s*emt-view-in\s+var\(--emt-dur-page\)\s+ease-out\s+both\s*;/.test(cssNoComment)
    );
  });

  test("含 prefers-reduced-motion: reduce 全域規則（animation: none、transition: none）（A-3、AC-31-03）", () => {
    const m = cssNoComment.match(/@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)\s*\{([\s\S]*)\}\s*$/);
    assert.ok(m, "找不到 reduce 媒體查詢");
    const body = m[1];
    assert.ok(/\*\s*,\s*\*::before\s*,\s*\*::after\s*\{/.test(body), "須套用 *, *::before, *::after");
    assert.ok(/animation\s*:\s*none\s*!important/.test(body));
    assert.ok(/transition\s*:\s*none\s*!important/.test(body));
  });

  test("CSS 不含 @import、外部 url（AC-31-04、AC-19-01）", () => {
    assert.ok(!/@import/i.test(css));
    assert.ok(!/url\(/i.test(cssNoComment));
  });

  test("motion.js、router.js 不依賴 animationend，不用 Web Animations API／requestAnimationFrame（A-1、A-2）", () => {
    for (const rel of ["ui/motion.js", "ui/router.js"]) {
      const code = source(rel).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      assert.ok(!/animationend/i.test(code), rel + " 含 animationend");
      assert.ok(!/\.animate\(/.test(code), rel + " 含 Web Animations API");
      assert.ok(!/requestAnimationFrame/.test(code), rel + " 含 requestAnimationFrame");
      assert.ok(!/innerHTML|outerHTML|insertAdjacentHTML|document\.write/.test(code), rel + " 含禁用 API");
    }
  });

  test("載入時不操作 DOM、不讀其他模組成員（LD-2）：沙箱無 document 也能載入，只登錄", () => {
    const sandbox = { console: console };
    sandbox.self = sandbox;
    sandbox.window = sandbox;
    // 以 getter 攔截載入期間對 EMT.core／EMT.store 的讀取
    vm.createContext(sandbox);
    const reads = [];
    vm.runInContext(
      "self.EMT = {}; Object.defineProperty(self.EMT, 'core', { get: function () { __r('core'); return undefined; }, configurable: true });" +
        "Object.defineProperty(self.EMT, 'store', { get: function () { __r('store'); return undefined; }, configurable: true });",
      Object.assign(sandbox, { __r: (n) => reads.push(n) })
    );
    for (const rel of ["ui/motion.js", "ui/router.js"]) {
      assert.doesNotThrow(() => vm.runInContext(source(rel), sandbox, { filename: rel }), rel);
    }
    assert.deepEqual(reads, []);
    assert.equal(typeof sandbox.EMT.ui.motion.enter, "function");
    assert.equal(typeof sandbox.EMT.router.go, "function");
  });
});

// ─────────────────────────────────────────────────────────────
// （FE-32）首次進入模式：§4.2 v0.4 router 新行為、§7.9；契約 FS-2、FS-3、FS-5
// ─────────────────────────────────────────────────────────────

describe("ui/router.js 首次進入模式（FE-32）", () => {
  /** 最小 store 替身：subscribe 收集回呼，emit 模擬 store 通知 */
  function fakeStore(entryMode) {
    const subs = [];
    const tabs = [];
    const state = { runtime: { entryMode } };
    return {
      state,
      tabs,
      subs,
      subscribe(fn) { subs.push(fn); return () => {}; },
      actions: { setTab: (t) => tabs.push(t) },
      emit(tags) { subs.slice().forEach((fn) => fn(state, tags)); }
    };
  }

  /** 首次模式沙箱：body[data-entry="firstRun"]，從 customizer 起始 */
  function firstRun() {
    const s = setup();
    s.store = fakeStore("firstRun");
    s.EMT.store = s.store;
    return s;
  }

  test("go() 成功時設 body.dataset.tab（一般模式亦同）", () => {
    const s = setup();
    s.EMT.router.start("dashboard");
    const doc = s.document;
    assert.equal(doc.body.dataset.tab, "dashboard");
    s.EMT.router.go("part5");
    assert.equal(doc.body.dataset.tab, "part5");
    assert.equal(s.EMT.router.go("nope"), false);
    assert.equal(doc.body.dataset.tab, "part5");
  });

  test("首次模式：go(\"dashboard\") 等非 customizer／sources 回 false，畫面與 data-tab 不變（AC-25-01、AC-20-03）", () => {
    const s = firstRun();
    const doc = s.document;
    doc.body.dataset.entry = "firstRun";
    s.EMT.router.start("customizer");
    assert.deepEqual(s.shown(), ["customizer"]);
    assert.equal(doc.body.dataset.tab, "customizer");
    for (const t of ["dashboard", "flashcards", "part5", "decoder", "phrasebank"]) {
      assert.equal(s.EMT.router.go(t), false, t);
    }
    assert.deepEqual(s.shown(), ["customizer"]);
    assert.equal(s.EMT.router.current(), "customizer");
    assert.equal(doc.body.dataset.tab, "customizer");
    assert.deepEqual(s.store.tabs, ["customizer"], "被拒絕的頁面不呼叫 setTab");
  });

  test("（v0.19）首次模式：4 個對外頁面都可開啟；back() 回到首次畫面（AC-25-07、SP-4）", () => {
    const s = firstRun();
    const doc = s.document;
    doc.body.dataset.entry = "firstRun";
    s.EMT.router.start("customizer");
    for (const t of ["sources", "about", "contact", "privacy"]) {
      // 經 [data-go] 委派（document click，頁尾 4 個按鈕）
      vmClick(s, makeEl(null, { "data-go": t }));
      assert.deepEqual(s.shown(), [t]);
      assert.equal(doc.body.dataset.tab, t);
      assert.equal(s.EMT.router.back(), true, t);
      assert.deepEqual(s.shown(), ["customizer"]);
      assert.equal(doc.body.dataset.tab, "customizer");
      assert.equal(doc.body.dataset.entry, "firstRun");
    }
    // 首次模式下主控台入口類的 [data-go] 不生效
    vmClick(s, makeEl(null, { "data-go": "dashboard" }));
    assert.deepEqual(s.shown(), ["customizer"]);
  });

  test("首次模式：start 起始頁不播動畫；起始頁不合法時不退回主控台", () => {
    const s = firstRun();
    const doc = s.document;
    doc.body.dataset.entry = "firstRun";
    s.EMT.router.start("dashboard");
    assert.deepEqual(s.shown(), []);
    assert.equal(s.EMT.router.current(), null);
  });

  test("收到 \"entry\" tag 且 entryMode 為 main → data-entry=\"main\"、切到主控台並播放換頁動畫", () => {
    const s = firstRun();
    const doc = s.document;
    doc.body.dataset.entry = "firstRun";
    s.EMT.router.start("customizer");
    assert.equal(s.store.subs.length, 1, "start 時訂閱 store");
    s.store.state.runtime.entryMode = "main";
    s.store.emit(["entry", "goal", "studySet", "flashcard"]);
    assert.equal(doc.body.dataset.entry, "main");
    assert.deepEqual(s.shown(), ["dashboard"]);
    assert.deepEqual(s.entering(), ["dashboard"], "由首次畫面切到主控台播放換頁動畫");
    assert.equal(doc.body.dataset.tab, "dashboard");
    // 進入後一般模式：各頁皆可到達
    assert.equal(s.EMT.router.go("flashcards"), true);
  });

  test("沒有 entry tag，或 entryMode 仍為 firstRun → 不切頁", () => {
    const s = firstRun();
    const doc = s.document;
    doc.body.dataset.entry = "firstRun";
    s.EMT.router.start("customizer");
    s.store.emit(["goal"]);
    s.store.emit(["entry"]); // entryMode 仍 firstRun
    assert.equal(doc.body.dataset.entry, "firstRun");
    assert.deepEqual(s.shown(), ["customizer"]);
    s.store.state.runtime.entryMode = "main";
    s.store.emit(["goal", "storage"]);
    assert.equal(doc.body.dataset.entry, "firstRun");
    assert.deepEqual(s.shown(), ["customizer"]);
  });

  test("重複 start 只訂閱一次；store 沒有 subscribe 時照常啟動", () => {
    const s = firstRun();
    s.EMT.router.start("customizer");
    s.EMT.router.start("customizer");
    assert.equal(s.store.subs.length, 1);
    const n = setup();
    n.EMT.store = { actions: { setTab() {} } };
    assert.doesNotThrow(() => n.EMT.router.start("dashboard"));
    assert.deepEqual(n.shown(), ["dashboard"]);
  });
});

// ─────────────────────────────────────────────────────────────
// （v0.5，FE-38）隱藏頁守門：§4.2 v0.5 router 新行為、§7.16；契約 §5.8 HT-3、HT-5；AC-20-04、E-68
// ─────────────────────────────────────────────────────────────

describe("ui/router.js 隱藏頁守門（FE-38）", () => {
  /** 登錄隱藏頁模組並記錄呼叫 */
  function spyHidden(s) {
    const calls = [];
    for (const t of ["decoder", "phrasebank"]) {
      s.EMT.views.register(t, {
        mount: () => calls.push("mount:" + t),
        show: () => calls.push("show:" + t),
        hide: () => calls.push("hide:" + t)
      });
    }
    return calls;
  }

  test("TAB_IDS 與 register 接受 10 個 TabId（v0.19，SP-1；隱藏頁照常登錄，HT-5）；isHiddenTab 依 HIDDEN_TAB_IDS", () => {
    const s = setup();
    assert.deepEqual([...s.EMT.router.TAB_IDS], TABS);
    assert.equal(TABS.length, 10);
    assert.doesNotThrow(() => spyHidden(s));
    assert.equal(s.EMT.router.isTabId("decoder"), true);
    assert.equal(s.EMT.router.isHiddenTab("decoder"), true);
    assert.equal(s.EMT.router.isHiddenTab("phrasebank"), true);
    for (const t of ["dashboard", "customizer", "flashcards", "part5", "sources", "about", "contact", "privacy", "nope"]) {
      assert.equal(s.EMT.router.isHiddenTab(t), false, t);
    }
  });

  test("一般模式 go(\"decoder\")／go(\"phrasebank\") → 回 false、改顯示主控台；隱藏頁不 mount、section 維持 hidden；無 console.error", () => {
    const s = setup();
    const calls = spyHidden(s);
    const tabs = [];
    s.EMT.store = { actions: { setTab: (t) => tabs.push(t) } };
    s.EMT.router.start("dashboard");
    s.EMT.router.go("part5");
    assert.equal(s.EMT.router.go("decoder"), false);
    assert.equal(s.EMT.router.current(), "dashboard");
    assert.deepEqual(s.shown(), ["dashboard"]);
    assert.equal(s.document.body.dataset.tab, "dashboard");
    s.EMT.router.go("flashcards");
    assert.equal(s.EMT.router.go("phrasebank"), false);
    assert.equal(s.EMT.router.current(), "dashboard");
    assert.equal(s.view("decoder").hidden, true);
    assert.equal(s.view("phrasebank").hidden, true);
    assert.deepEqual(calls, [], "隱藏頁的 mount／show／hide 皆不呼叫");
    assert.ok(!tabs.includes("decoder") && !tabs.includes("phrasebank"), "setTab 不收到隱藏頁");
    const cur = s.navBtns.filter((b) => b.getAttribute("aria-current") === "page").map((b) => b.getAttribute("data-tab"));
    assert.deepEqual(cur, ["dashboard"]);
    assert.deepEqual(s.errors, []);
  });

  test("一般模式 [data-go=\"decoder\"] 點擊 → 主控台", () => {
    const s = setup();
    s.EMT.router.start("dashboard");
    s.EMT.router.go("part5");
    vmClick(s, makeEl(null, { "data-go": "decoder" }));
    assert.deepEqual(s.shown(), ["dashboard"]);
    assert.deepEqual(s.errors, []);
  });

  test("首次模式 go(\"decoder\") → false 且仍在 customizer；hashchange 到隱藏頁也不動作", () => {
    const s = setup();
    const calls = spyHidden(s);
    s.document.body.dataset.entry = "firstRun";
    s.EMT.router.start("customizer");
    assert.equal(s.EMT.router.go("decoder"), false);
    assert.equal(s.EMT.router.go("phrasebank"), false);
    assert.equal(s.EMT.router.current(), "customizer");
    assert.deepEqual(s.shown(), ["customizer"]);
    s.setHash("#decoder");
    assert.deepEqual(s.shown(), ["customizer"]);
    assert.equal(s.document.body.dataset.entry, "firstRun");
    assert.deepEqual(calls, []);
    assert.deepEqual(s.errors, []);
  });

  test("hashchange 到 #decoder、#view-phrasebank、#/decoder、#VIEW-Decoder、#phrasebank → 主控台；網址不被修改", () => {
    const s = setup();
    const calls = spyHidden(s);
    s.EMT.router.start("dashboard");
    for (const h of ["#decoder", "#view-phrasebank", "#/decoder", "#VIEW-Decoder", "#phrasebank", "#/view-decoder"]) {
      s.EMT.router.go("part5");
      s.setHash(h);
      assert.deepEqual(s.shown(), ["dashboard"], h);
      assert.equal(s.EMT.router.current(), "dashboard", h);
      assert.equal(s.sandbox.location.hash, h, "不改網址：" + h);
    }
    assert.deepEqual(calls, []);
    assert.deepEqual(s.errors, []);
  });

  test("其他片段（#flashcards、#part5、#about、#contact、#privacy、#sourcesx、#、空字串、#decoderx）→ 不切頁、不改網址（v0.19，SP-6 不新增其他 hash 路由）", () => {
    const s = setup();
    s.EMT.router.start("dashboard");
    s.EMT.router.go("part5");
    for (const h of ["#flashcards", "#part5", "#about", "#contact", "#privacy", "#view-about", "#sourcesx", "#sources/x", "#", "", "#decoderx", "#nope"]) {
      s.setHash(h);
      assert.deepEqual(s.shown(), ["part5"], h);
      assert.equal(s.sandbox.location.hash, h, h);
    }
    assert.deepEqual(s.replaced, []);
    assert.deepEqual(s.errors, []);
  });

  test("啟動時 location.hash = \"#phrasebank\" → 主控台（起始頁為其他頁亦同）", () => {
    const a = setup({ hash: "#phrasebank" });
    a.EMT.router.start("dashboard");
    assert.deepEqual(a.shown(), ["dashboard"]);
    const b = setup({ hash: "#view-decoder" });
    b.EMT.router.start("part5");
    assert.deepEqual(b.shown(), ["dashboard"]);
    const c = setup({ hash: "#flashcards" });
    c.EMT.router.start("part5");
    assert.deepEqual(c.shown(), ["part5"], "其他片段忽略");
    assert.deepEqual([...a.errors, ...b.errors, ...c.errors], []);
  });

  test("start(\"decoder\")（一般模式）→ 顯示主控台，隱藏頁不 mount", () => {
    const s = setup();
    const calls = spyHidden(s);
    s.EMT.router.start("decoder");
    assert.deepEqual(s.shown(), ["dashboard"]);
    assert.deepEqual(calls, []);
  });

  test("hashchange 只綁一次（重複 start）；載入時不綁定（LD-2）", () => {
    const s = setup();
    assert.equal((s.winListeners.hashchange || []).length, 0, "載入時不綁定");
    s.EMT.router.start("dashboard");
    s.EMT.router.start("dashboard");
    assert.equal(s.winListeners.hashchange.length, 1);
  });

  test("constants 模組不存在時以契約預設值守門", () => {
    const s = setup({ noConstants: true });
    s.EMT.router.start("dashboard");
    s.EMT.router.go("part5");
    assert.equal(s.EMT.router.go("decoder"), false);
    assert.deepEqual(s.shown(), ["dashboard"]);
  });

  test("HIDDEN_TAB_IDS 於呼叫時取用 EMT.core.constants（非載入時快照）", () => {
    const s = setup();
    s.EMT.router.start("dashboard");
    const real = s.EMT.core.constants;
    s.EMT.core.constants = Object.assign({}, real, { HIDDEN_TAB_IDS: ["part5"] });
    assert.equal(s.EMT.router.go("part5"), false);
    assert.equal(s.EMT.router.go("decoder"), true, "替換後 decoder 不再屬隱藏頁");
    s.EMT.core.constants = real;
  });

  test("normalizeHash：去 #、去開頭 /、去開頭 view-、轉小寫；非字串回空字串", () => {
    const { EMT } = setup();
    const n = EMT.router.normalizeHash;
    assert.equal(n("#decoder"), "decoder");
    assert.equal(n("#/decoder"), "decoder");
    assert.equal(n("#view-phrasebank"), "phrasebank");
    assert.equal(n("#/view-Decoder"), "decoder");
    assert.equal(n("#PHRASEBANK"), "phrasebank");
    assert.equal(n("decoder"), "decoder");
    assert.equal(n("#"), "");
    assert.equal(n(""), "");
    assert.equal(n(undefined), "");
    assert.equal(n(null), "");
    assert.equal(n("#flashcards"), "flashcards");
  });
});

// ─────────────────────────────────────────────────────────────
// （v0.19，FE-86）對外頁面的返回與 #sources：§4.12、§7.25.5；契約 SP-3、SP-4、SP-6、V-SITE-01、V-SITE-07
// ─────────────────────────────────────────────────────────────

describe("ui/router.js 對外頁面與 #sources（FE-86）", () => {
  /** 以真實 store 建立沙箱；firstRun 時 body[data-entry="firstRun"] */
  function withStore(opt) {
    const o = opt || {};
    const m = F.makeStore({ firstRun: !!o.firstRun });
    const s = setup({ hash: o.hash, noHistory: o.noHistory, replaceThrows: o.replaceThrows });
    s.document.body.dataset.entry = o.firstRun ? "firstRun" : "main";
    s.EMT.store = m.store;
    s.m = m;
    s.ret = () => m.store.getState().runtime.sitePageReturnTab;
    s.cur = () => m.store.getState().runtime.currentTab;
    s.EMT.router.start(o.firstRun ? "customizer" : "dashboard");
    return s;
  }

  test("單字卡 → 關於我 → 返回：回到單字卡，返回目標清為 null", () => {
    const s = withStore();
    s.EMT.router.go("flashcards");
    s.EMT.router.go("about");
    assert.equal(s.EMT.router.returnTarget(), "flashcards");
    assert.equal(s.EMT.router.back(), true);
    assert.deepEqual(s.shown(), ["flashcards"]);
    assert.equal(s.ret(), null);
  });

  test("單字卡 → 關於我 → 隱私權政策 → 資料來源 → 返回：仍回到單字卡（4 頁之間不覆蓋）", () => {
    const s = withStore();
    s.EMT.router.go("flashcards");
    for (const t of ["about", "privacy", "sources"]) s.EMT.router.go(t);
    assert.equal(s.ret(), "flashcards");
    s.EMT.router.back();
    assert.deepEqual(s.shown(), ["flashcards"]);
  });

  test("首次畫面 → 聯絡我們 → 返回：回到首次畫面、無導覽、setItem 0 次、無狀態鍵（SP-4）", () => {
    const s = withStore({ firstRun: true });
    const calls = s.m.storage.setCalls.length;
    s.EMT.router.go("contact");
    assert.equal(s.ret(), "customizer");
    assert.equal(s.EMT.router.returnTarget(), "customizer");
    s.EMT.router.back();
    assert.deepEqual(s.shown(), ["customizer"]);
    assert.equal(s.document.body.dataset.entry, "firstRun");
    assert.equal(s.m.store.getState().runtime.entryMode, "firstRun");
    assert.equal(s.m.storage.setCalls.length, calls);
    assert.equal(s.m.storage.getItem(MAIN_KEY), null);
  });

  test("returnTarget：sitePageReturnTab 為 null 時，一般模式 dashboard、首次模式 customizer；無 store 亦同（SP-3）", () => {
    assert.equal(withStore().EMT.router.returnTarget(), "dashboard");
    assert.equal(withStore({ firstRun: true }).EMT.router.returnTarget(), "customizer");
    const n = setup();
    assert.equal(n.EMT.router.returnTarget(), "dashboard");
    n.document.body.dataset.entry = "firstRun";
    assert.equal(n.EMT.router.returnTarget(), "customizer");
  });

  test("returnTarget：不合法的值（隱藏頁、4 頁之一、未知值）與 getState 拋例外 → 退回預設", () => {
    const s = setup();
    for (const v of ["decoder", "sources", "about", "nope", 1, undefined]) {
      s.EMT.store = { getState: () => ({ runtime: { sitePageReturnTab: v } }), actions: { setTab() {} } };
      assert.equal(s.EMT.router.returnTarget(), "dashboard", String(v));
    }
    s.EMT.store = { getState() { throw new Error("x"); }, actions: { setTab() {} } };
    assert.equal(s.EMT.router.returnTarget(), "dashboard");
  });

  test("新頁 show 執行時 returnTarget() 已是本次切頁後的值（FE-87 的返回按鈕文字依此）", () => {
    const s = withStore();
    const seen = [];
    s.EMT.views.register("about", { show: () => seen.push(s.EMT.router.returnTarget()) });
    s.EMT.router.go("part5");
    s.EMT.router.go("about");
    assert.deepEqual(seen, ["part5"]);
    assert.equal(s.document.body.dataset.tab, "about");
  });

  test("4 個頁面時導覽無 aria-current；導覽仍 4 鈕（AC-20-03）", () => {
    const s = withStore();
    assert.equal(s.navBtns.length, 4);
    for (const t of ["about", "contact", "privacy", "sources"]) {
      s.EMT.router.go(t);
      assert.deepEqual(s.navBtns.filter((b) => b.getAttribute("aria-current") === "page"), [], t);
    }
  });

  test("啟動帶 #sources：開啟資料來源頁、返回目標 null、片段被移除且保留路徑與查詢；返回 → 主控台（V-SITE-07）", () => {
    const s = withStore({ hash: "#sources" });
    assert.deepEqual(s.shown(), ["sources"]);
    assert.equal(s.ret(), null);
    assert.deepEqual(s.replaced.map((r) => [r.st, r.title, r.url]), [[null, "", "/p/index.html?x=1"]]);
    assert.equal(s.sandbox.location.hash, "");
    s.EMT.router.back();
    assert.deepEqual(s.shown(), ["dashboard"]);
  });

  test("首次模式啟動帶 #sources：開啟資料來源頁、仍為首次模式、無狀態鍵；返回 → 首次畫面（V-SITE-07、SP-4）", () => {
    const s = withStore({ firstRun: true, hash: "#sources" });
    assert.deepEqual(s.shown(), ["sources"]);
    assert.equal(s.ret(), null);
    assert.equal(s.replaced.length, 1);
    assert.equal(s.document.body.dataset.entry, "firstRun");
    assert.equal(s.m.storage.getItem(MAIN_KEY), null);
    assert.deepEqual(s.m.storage.setCalls, []);
    s.EMT.router.back();
    assert.deepEqual(s.shown(), ["customizer"]);
  });

  test("模擬測驗中 hashchange 為 #sources：返回目標 null，返回 → 主控台（SP-6）", () => {
    const s = withStore();
    s.EMT.router.go("part5");
    s.setHash("#sources");
    assert.deepEqual(s.shown(), ["sources"]);
    assert.equal(s.ret(), null);
    assert.equal(s.sandbox.location.hash, "");
    s.EMT.router.back();
    assert.deepEqual(s.shown(), ["dashboard"]);
  });

  test("已在資料來源頁（由單字卡進入）又 hashchange 為 #sources：返回目標清為 null，並重呼 show 讓返回文字同步（SP-6）", () => {
    const s = withStore();
    const shows = [];
    s.EMT.views.register("sources", { show: () => shows.push(s.EMT.router.returnTarget()) });
    s.EMT.router.go("flashcards");
    s.EMT.router.go("sources");
    s.setHash("#sources");
    assert.deepEqual(shows, ["flashcards", "dashboard"]);
    assert.equal(s.ret(), null);
    assert.deepEqual(s.shown(), ["sources"]);
  });

  test("正規化後恰為 sources 才開啟：#view-sources、#/sources、#SOURCES 開啟（SD-FB-84）", () => {
    for (const h of ["#view-sources", "#/sources", "#SOURCES", "#/view-Sources"]) {
      const s = withStore();
      s.EMT.router.go("part5");
      s.setHash(h);
      assert.deepEqual(s.shown(), ["sources"], h);
      assert.equal(s.replaced.length, 1, h);
    }
  });

  test("replaceState 拋例外或 history 不存在：照常開啟、不拋出、無 console.error（SP-6 失敗靜默）", () => {
    for (const o of [{ replaceThrows: true }, { noHistory: true }]) {
      const s = withStore(Object.assign({ hash: "#sources" }, o));
      assert.deepEqual(s.shown(), ["sources"]);
      assert.deepEqual(s.errors, []);
    }
  });

  test("隱藏頁片段回歸：一般模式主控台、首次模式不動作；皆不呼叫 replaceState、返回目標不受影響（AC-20-04）", () => {
    const a = withStore();
    a.EMT.router.go("part5");
    a.setHash("#decoder");
    assert.deepEqual(a.shown(), ["dashboard"]);
    assert.equal(a.sandbox.location.hash, "#decoder");
    assert.deepEqual(a.replaced, []);
    const b = withStore({ firstRun: true });
    b.setHash("#phrasebank");
    assert.deepEqual(b.shown(), ["customizer"]);
    assert.equal(b.sandbox.location.hash, "#phrasebank");
    assert.deepEqual(b.replaced, []);
    assert.deepEqual(b.m.storage.setCalls, []);
  });

  test("原始碼不碰瀏覽器儲存（SP-4、SP-5：返回目標只在記憶體）", () => {
    assert.doesNotMatch(source("ui/router.js"), /localStorage|sessionStorage|indexedDB/);
  });
});

/** 模擬點擊：觸發 document 上的 click 委派 */
function vmClick(s, target) {
  s.dispatch("click", { target, preventDefault() {} });
}
