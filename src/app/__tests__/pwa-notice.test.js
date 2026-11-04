/*
 * pwa-notice.test.js — PWA 新版提示列與 main.js 接線（FE-50）
 * 受測：ui/pwa-notice.js（極簡假 DOM ＋ node:vm 載入 core/dom.js、core/pwa.js、ui/pwa-notice.js）、styles/80-pwa.css、main.js 原始碼順序
 * 依據：architecture.md v0.7 §4.2「v0.7 main.js 啟動順序」、§4.7「EMT.ui.pwaNotice」、§7.18.7、§10.4「pwa-notice.test.js」列
 * 涵蓋：AC-36-03、AC-27-03、AC-31-03、AC-37-01
 * （v0.11，FE-77）提示與按鈕文字改為 v0.16 新文字，並確認不含舊文字（architecture.md v0.11 §10.8、V-PWA-10）。
 */
"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const PWA = require("../core/pwa.js");

const APP_DIR = path.join(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(APP_DIR, rel), "utf8").replace(/^﻿/, "");

// ── 極簡假 DOM ──

function makeNode(tag) {
  const listeners = {};
  const n = {
    nodeType: tag === "#text" ? 3 : 1,
    tagName: tag.toUpperCase(),
    className: "",
    attrs: {},
    childNodes: [],
    hidden: false,
    disabled: false,
    _text: "",
    listeners,
    setAttribute(k, v) { this.attrs[k] = String(v); },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
    addEventListener(t, fn) { (listeners[t] = listeners[t] || []).push(fn); },
    appendChild(c) { this.childNodes.push(c); c.parentNode = this; return c; },
    removeChild(c) { this.childNodes.splice(this.childNodes.indexOf(c), 1); return c; },
    get firstChild() { return this.childNodes[0] || null; },
    get textContent() { return this.nodeType === 3 ? this._text : this._text + this.childNodes.map((c) => c.textContent).join(""); },
    set textContent(v) { this.childNodes = []; this._text = String(v); },
    click() {
      if (this.disabled) return; // 瀏覽器中停用的按鈕不觸發 click
      (listeners.click || []).forEach((fn) => fn({ type: "click", target: this }));
    }
  };
  return n;
}

/** 替身 store：getState、subscribe、emit */
function fakeStore(pwaPatch, rt) {
  let state = {
    data: {},
    runtime: Object.assign({ entryMode: "main", currentTab: "dashboard" }, rt || {}, {
      pwa: Object.assign(PWA.initialPwaState(), pwaPatch || {})
    })
  };
  const subs = [];
  return {
    getState: () => state,
    subscribe: (fn) => { subs.push(fn); return () => {}; },
    set(pwaPatch2, tags) {
      state = { data: state.data, runtime: Object.assign({}, state.runtime, { pwa: Object.assign({}, state.runtime.pwa, pwaPatch2) }) };
      subs.forEach((fn) => fn(state, tags || ["pwa"]));
    },
    subs
  };
}

/** 建立沙箱並載入 core/dom、core/pwa、ui/pwa-notice */
function setup(o = {}) {
  const host = o.noHost ? null : makeNode("div");
  if (host) {
    host.attrs.id = "pwa-update";
    host.hidden = true;
  }
  const document = {
    getElementById: (id) => (id === "pwa-update" ? host : null),
    createElement: (t) => makeNode(t),
    createTextNode: (t) => { const n = makeNode("#text"); n._text = t; return n; },
    createElementNS: (ns, t) => makeNode(t)
  };
  const sandbox = { document, console };
  sandbox.self = sandbox;
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  const files = ["core/dom.js", "core/pwa.js", "ui/pwa-notice.js"];
  for (const rel of files) vm.runInContext(read(rel), sandbox, { filename: rel });
  const store = o.store || fakeStore(o.pwa, o.rt);
  sandbox.EMT.store = store;
  return { sandbox, host, store, api: sandbox.EMT.ui.pwaNotice };
}

function button(host) {
  return host.childNodes.find((c) => c.tagName === "BUTTON");
}

describe("pwa-notice.test.js：ui/pwa-notice.js", () => {
  test("載入時只登錄（不操作 DOM）", () => {
    const s = setup();
    assert.equal(typeof s.api.init, "function");
    assert.equal(s.host.childNodes.length, 0);
  });

  test("updateVisible 假 → hidden；建立文字與按鈕（逐字）", () => {
    const s = setup({ pwa: { eligible: true, updateAvailable: false } });
    s.api.init({ onReload() {} });
    assert.equal(s.host.hidden, true);
    const span = s.host.childNodes[0];
    assert.equal(span.className, "pwa-update__text");
    assert.equal(span.textContent, "有新版本，請更新版本");
    const btn = button(s.host);
    assert.equal(btn.className, "btn btn--primary pwa-update__btn");
    assert.equal(btn.attrs.type, "button");
    assert.equal(btn.textContent, "更新版本");
  });

  test("updateVisible 真 → 顯示；\"pwa\" tag 後依新狀態切換", () => {
    const s = setup({ pwa: { eligible: true, updateAvailable: true } });
    s.api.init({ onReload() {} });
    assert.equal(s.host.hidden, false);
    s.store.set({ updateAvailable: false });
    assert.equal(s.host.hidden, true);
    s.store.set({ updateAvailable: true });
    assert.equal(s.host.hidden, false);
    // 其他 tag 不重繪
    s.store.set({ updateAvailable: false }, ["flashcard"]);
    assert.equal(s.host.hidden, false);
  });

  test("eligible 為 false（file://）時即使 updateAvailable 也不顯示", () => {
    const s = setup({ pwa: { eligible: false, updateAvailable: true } });
    s.api.init({ onReload() {} });
    assert.equal(s.host.hidden, true);
  });

  test("首次模式、任何頁面也顯示（UP-6）", () => {
    const s = setup({ pwa: { eligible: true, updateAvailable: true }, rt: { entryMode: "firstRun", currentTab: "customizer" } });
    s.api.init({ onReload() {} });
    assert.equal(s.host.hidden, false);
    assert.equal(s.host.textContent, "有新版本，請更新版本更新版本");
    // （v0.16，FE-77）舊文字不得再出現
    assert.ok(!s.host.textContent.includes("重新整理"));
  });

  test("點擊 2 次 → onReload 1 次且按鈕 disabled；onReload 拋例外被攔下", () => {
    const s = setup({ pwa: { eligible: true, updateAvailable: true } });
    let n = 0;
    s.api.init({ onReload() { n++; throw new Error("x"); } });
    const btn = button(s.host);
    btn.click();
    assert.equal(btn.disabled, true);
    // 即使停用屬性被繞過，處理器本身也只呼叫一次
    (btn.listeners.click || []).forEach((fn) => fn({}));
    btn.click();
    assert.equal(n, 1);
  });

  test("init 只執行一次；#pwa-update 不存在時不做事、不拋例外", () => {
    const s = setup({ pwa: { eligible: true, updateAvailable: true } });
    s.api.init({ onReload() {} });
    s.api.init({ onReload() {} });
    assert.equal(s.host.childNodes.length, 2);
    assert.equal(s.store.subs.length, 1);
    const t = setup({ noHost: true });
    assert.doesNotThrow(() => t.api.init({}));
    assert.equal(t.store.subs.length, 0);
  });
});

describe("pwa-notice.test.js：80-pwa.css", () => {
  const src = read("styles/80-pwa.css").replace(/\/\*[\s\S]*?\*\//g, "");

  /** 取出指定選擇器的規則本文 */
  function rule(sel) {
    const re = new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\{([^}]*)\\}");
    const m = re.exec(src);
    assert.ok(m, "找不到 " + sel);
    return m[1];
  }

  test(".pwa-update：sticky top 0、flex wrap、無 transition／animation（AC-31-03）", () => {
    const r = rule(".pwa-update");
    assert.match(r, /position:\s*sticky/);
    assert.match(r, /top:\s*0/);
    assert.match(r, /display:\s*flex/);
    assert.match(r, /flex-wrap:\s*wrap/);
    assert.doesNotMatch(r, /transition/);
    assert.doesNotMatch(r, /animation/);
    assert.doesNotMatch(src, /transition|animation|@keyframes/, "整份 80-pwa.css 不得有動畫");
    assert.doesNotMatch(src, /white-space:\s*nowrap/);
  });

  test(".pwa-update z-index 低於 toast（1000）與 dialog（1100）", () => {
    const z = Number(/z-index:\s*(\d+)/.exec(rule(".pwa-update"))[1]);
    assert.ok(z > 0 && z < 1000, String(z));
  });

  test("按鈕 ≥ 44px（var(--touch)）", () => {
    const r = rule(".pwa-update__btn");
    assert.match(r, /min-height:\s*var\(--touch\)/);
    assert.match(r, /min-width:\s*var\(--touch\)/);
  });
});

describe("pwa-notice.test.js：main.js 啟動順序（architecture §4.2 v0.7）", () => {
  const src = read("main.js");
  const at = (name) => src.indexOf('step("' + name + '"');

  test("pwa.start 在 store.init、banner.render 之後、router.start 之前；pwaNotice.init 在 bottomNav.init 之後；emt-ready 仍最後", () => {
    const order = ["content.load", "store.init", "banner.render", "pwa.start", "router.start", "bottomNav.init", "pwaNotice.init", "emt-ready"];
    const idx = order.map(at);
    for (let i = 0; i < order.length; i++) assert.ok(idx[i] >= 0, order[i]);
    assert.deepEqual([...idx].sort((a, b) => a - b), idx);
    assert.ok(src.lastIndexOf('step("') === at("emt-ready"), "emt-ready 為最後一個步驟");
  });

  test("接線：onChange → store.actions.setPwa；onReload → services.pwa.requestReload；模組不存在時略過", () => {
    assert.match(src, /EMT\.services\.pwa\.start\(\{/);
    assert.match(src, /EMT\.store\.actions\.setPwa\(p\)/);
    assert.match(src, /EMT\.ui\.pwaNotice\.init\(\{/);
    assert.match(src, /EMT\.services\.pwa\.requestReload\(\)/);
    assert.match(src, /EMT\.services && EMT\.services\.pwa && typeof EMT\.services\.pwa\.start === "function"/);
    assert.match(src, /EMT\.ui && EMT\.ui\.pwaNotice && typeof EMT\.ui\.pwaNotice\.init === "function"/);
  });

  test("main.js 以 vm 執行：file:// 下 pwa.start 回 false 後其他步驟照常、data-ready = 1、console.error 0 次", () => {
    const errors = [];
    const calls = [];
    const docEl = { attrs: {}, setAttribute(k, v) { this.attrs[k] = v; } };
    const sandbox = {
      console: { error: (...a) => errors.push(a), warn() {}, log() {} },
      document: { readyState: "complete", body: { dataset: {} }, documentElement: docEl, addEventListener() {} },
      performance: { mark: (n) => calls.push("mark:" + n) },
    };
    sandbox.self = sandbox;
    sandbox.EMT = {
      store: {
        init: () => calls.push("store.init"),
        getState: () => ({ runtime: { entryMode: "main" } }),
        actions: { setPwa: () => calls.push("setPwa") }
      },
      services: { pwa: { start: (o) => { calls.push("pwa.start"); assert.equal(typeof o.onChange, "function"); return { eligible: false, standalone: false }; }, requestReload: () => calls.push("reload") } },
      router: { start: (t) => calls.push("router.start:" + t) },
      ui: {
        banner: { render: () => calls.push("banner.render") },
        bottomNav: { init: () => calls.push("bottomNav.init") },
        pwaNotice: { init: (o) => { calls.push("pwaNotice.init"); assert.equal(typeof o.onReload, "function"); } }
      }
    };
    vm.createContext(sandbox);
    vm.runInContext(src, sandbox, { filename: "main.js" });
    assert.deepEqual(calls, ["store.init", "banner.render", "pwa.start", "router.start:dashboard", "bottomNav.init", "pwaNotice.init", "mark:emt-ready"]);
    assert.equal(docEl.attrs["data-ready"], "1");
    assert.equal(errors.length, 0);
  });
});
