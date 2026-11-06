/*
 * ad-slot.test.js — 廣告版位容器與載入時機（FE-88）
 * 受測：ui/ad-slot.js、styles/85-ad.css、main.js 的啟動順序
 * 依據：architecture.md v0.14 §7.25.3「評估」「DS-47」「DS-48」、§10.11；
 *       契約 README §13.2 AD-5、AD-6、AD-7、AD-9、AD-10、AD-11、AD-14、§13.7 V-AD-02、V-AD-05
 * 涵蓋：US-52、AC-50-04、AC-51-02、AC-52-01、AC-52-02、AC-52-04、AC-52-06、AC-52-07、E-141、E-142
 *
 * 分兩部分：
 * (A) ad-slot 單元：假 document + 小型假 store + 假服務，逐條驗時機。
 * (B) 真實組裝：在 vm 沙箱依建置順序載入 core、state、services、ui、views/dashboard.js、main.js，
 *     假 document 上跑真實 router、真實 store、真實主控台、真實 services/ad.js，廣告腳本只是假節點。
 * 假 document 不做版面計算：高度、寬度、點擊位移等只能在瀏覽器量，本檔只驗節點與 CSS 規則文字。
 */
"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const SLOT = require("../ui/ad-slot.js");
const A = require("../core/ad.js");
const R = require("../core/reinit.js");
const C = require("../core/constants.js");
const PERSIST = require("../core/persist.js");

const APP_DIR = path.join(__dirname, "..");
const PUBLISHER = "ca-pub-4051803210893105";
const SLOT_VALUE = "1234567890";
const TODAY = "2026-11-05";

// ─────────────────────────────────────────────────────────────
// 假 DOM
// ─────────────────────────────────────────────────────────────

/** 假節點：只實作本測試路徑用到的 DOM 介面 */
class FNode {
  constructor(doc, tag, nodeType) {
    this.ownerDocument = doc;
    this.tagName = String(tag).toUpperCase();
    this.nodeType = nodeType || 1;
    this.childNodes = [];
    this.parentNode = null;
    this.attrs = {};
    this.listeners = {};
    this.hidden = false;
    this.disabled = false;
    this.style = { setProperty() {}, removeProperty() {} };
    this._text = "";
    const self = this;
    this.dataset = new Proxy({}, {
      get(t, k) { return self.attrs["data-" + String(k)]; },
      set(t, k, v) { self.setAttribute("data-" + String(k), v); return true; },
      deleteProperty(t, k) { delete self.attrs["data-" + String(k)]; return true; }
    });
    this.classList = {
      contains: (c) => self.className.split(/\s+/).includes(c),
      add: (c) => { if (!self.classList.contains(c)) self.className = (self.className + " " + c).trim(); },
      remove: (c) => { self.className = self.className.split(/\s+/).filter((x) => x && x !== c).join(" "); },
      toggle: (c, on) => {
        const want = on === undefined ? !self.classList.contains(c) : !!on;
        if (want) self.classList.add(c); else self.classList.remove(c);
        return want;
      }
    };
    // 不可列舉：斷言失敗時 assert 會展開整棵物件；節點互相參照，整棵展開會讓測試卡住數分鐘
    for (const k of ["ownerDocument", "childNodes", "parentNode", "listeners", "style", "dataset", "classList"]) {
      Object.defineProperty(this, k, { enumerable: false, writable: true, value: this[k] });
    }
  }
  get className() { return this.attrs.class || ""; }
  set className(v) { this.attrs.class = String(v); }
  get id() { return this.attrs.id || ""; }
  set id(v) { this.attrs.id = String(v); }
  get children() { return this.childNodes.filter((c) => c.nodeType === 1); }
  get firstChild() { return this.childNodes[0] || null; }
  get lastChild() { return this.childNodes[this.childNodes.length - 1] || null; }
  get nextSibling() {
    if (!this.parentNode) return null;
    const c = this.parentNode.childNodes;
    return c[c.indexOf(this) + 1] || null;
  }
  insertBefore(n, ref) {
    this.ownerDocument.ops.push(["insert", n, this]);
    if (n.parentNode) n.parentNode.removeChild(n);
    const i = ref ? this.childNodes.indexOf(ref) : this.childNodes.length;
    if (i < 0) throw new Error("insertBefore：ref 不是子節點");
    this.childNodes.splice(i, 0, n);
    n.parentNode = this;
    if (typeof this.ownerDocument.onInsert === "function") this.ownerDocument.onInsert(n, this);
    return n;
  }
  appendChild(n) { return this.insertBefore(n, null); }
  append(...list) { list.forEach((n) => this.appendChild(n)); }
  removeChild(n) {
    this.ownerDocument.ops.push(["remove", n, this]);
    const i = this.childNodes.indexOf(n);
    if (i < 0) throw new Error("removeChild：不是子節點");
    this.childNodes.splice(i, 1);
    n.parentNode = null;
    return n;
  }
  remove() { if (this.parentNode) this.parentNode.removeChild(this); }
  set textContent(t) {
    if (this.nodeType === 3) { this._text = String(t); return; }
    this.childNodes.slice().forEach((c) => this.removeChild(c));
    if (String(t) !== "") this.appendChild(this.ownerDocument.createTextNode(String(t)));
  }
  get textContent() { return this.nodeType === 3 ? this._text : this.childNodes.map((c) => c.textContent).join(""); }
  setAttribute(k, v) {
    this.attrs[k] = String(v);
    (this.ownerDocument.attrObservers || []).forEach((fn) => fn(this, k));
  }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  hasAttribute(k) { return k in this.attrs; }
  removeAttribute(k) { delete this.attrs[k]; }
  addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); }
  removeEventListener() {}
  contains(n) {
    for (let x = n; x; x = x.parentNode) if (x === this) return true;
    return false;
  }
  focus() {}
  /** 簡易選擇器：以空白分隔的後代選擇，每段可含 tag、#id、.class、[attr]、[attr="v"] */
  matchesOne(sel) {
    const parts = sel.match(/(^[a-zA-Z][\w-]*)|#[\w-]+|\.[\w-]+|\[[^\]]+\]/g) || [];
    return parts.every((p) => {
      if (p[0] === "#") return this.id === p.slice(1);
      if (p[0] === ".") return this.classList.contains(p.slice(1));
      if (p[0] === "[") {
        const m = p.slice(1, -1).match(/^([\w-]+)(?:=["']?([^"']*)["']?)?$/);
        return m[2] === undefined ? this.hasAttribute(m[1]) : this.getAttribute(m[1]) === m[2];
      }
      return this.tagName === p.toUpperCase();
    });
  }
  querySelectorAll(selector) {
    const segs = selector.trim().split(/\s+/);
    const out = [];
    const walk = (n) => {
      for (const c of n.children) {
        if (c.matchesOne(segs[segs.length - 1])) {
          let need = segs.length - 2;
          for (let p = c.parentNode; p && need >= 0; p = p.parentNode) {
            if (p.nodeType === 1 && p.matchesOne(segs[need])) need--;
          }
          if (need < 0) out.push(c);
        }
        walk(c);
      }
    };
    walk(this);
    return out;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
}

/** 假 document：html > head、body（#view-dashboard 在 main 內；main、footer 在 body 下） */
function fakeDocument(extraViews) {
  const doc = {
    ops: [],
    created: [],
    readyState: "complete",
    createElement(tag) {
      doc.created.push(String(tag).toLowerCase());
      return new FNode(doc, tag);
    },
    createElementNS(ns, tag) { return new FNode(doc, tag); },
    createTextNode(t) { const n = new FNode(doc, "#text", 3); n._text = String(t); return n; },
    createDocumentFragment() { return new FNode(doc, "#fragment", 11); },
    addEventListener() {},
    removeEventListener() {},
    getElementById(id) {
      const find = (n) => {
        if (n.id === id) return n;
        for (const c of n.children) { const r = find(c); if (r) return r; }
        return null;
      };
      return find(doc.documentElement);
    },
    querySelector(s) { return doc.documentElement.querySelector(s); },
    querySelectorAll(s) { return doc.documentElement.querySelectorAll(s); }
  };
  const mk = (tag, id) => { const n = new FNode(doc, tag); if (id) n.id = id; return n; };
  doc.documentElement = mk("html");
  doc.head = mk("head");
  doc.body = mk("body");
  const main = mk("main", "app-main");
  const footer = mk("footer", "app-footer");
  doc.documentElement.appendChild(doc.head);
  doc.documentElement.appendChild(doc.body);
  doc.body.appendChild(main);
  doc.body.appendChild(footer);
  const dash = mk("section", "view-dashboard");
  main.appendChild(dash);
  for (const v of extraViews || []) {
    const s = mk("section", "view-" + v);
    s.hidden = true;
    main.appendChild(s);
  }
  doc.ops.length = 0;
  doc.created.length = 0;
  return doc;
}

/** 把假 DOM 走訪成清單 */
function walk(node, out = []) {
  out.push(node);
  for (const c of node.children) walk(c, out);
  return out;
}

// ─────────────────────────────────────────────────────────────
// (A) ad-slot 單元
// ─────────────────────────────────────────────────────────────

const RECORD = { part5: { totalAnswered: 1 } };
const NO_RECORD = {};

/** 小型假 store：adEvent 走真實轉移表，通知同步 */
function fakeStore(o = {}) {
  const listeners = [];
  const s = {
    subscribeCount: 0,
    state: {
      data: o.data === undefined ? RECORD : o.data,
      runtime: {
        entryMode: o.entryMode || "main",
        currentTab: o.currentTab || "dashboard",
        ad: { status: o.status || "waiting" }
      }
    },
    events: [],
    getState: () => s.state,
    today: () => TODAY,
    subscribe(fn) {
      s.subscribeCount++;
      listeners.push(fn);
      return () => {};
    },
    notify(tags = ["x"]) {
      listeners.slice().forEach((fn) => fn(s.state, tags));
    },
    set(patch) {
      Object.assign(s.state.runtime, patch);
      s.notify();
    },
    setData(data) {
      s.state.data = data;
      s.notify(["dashboard"]);
    },
    actions: {
      adEvent(e) {
        s.events.push(e);
        const next = A.transition(s.state.runtime.ad.status, e);
        if (next === s.state.runtime.ad.status) return { changed: false };
        s.state.runtime.ad = { status: next };
        s.notify(["ad"]);
        return { changed: true };
      }
    }
  };
  return s;
}

/** 組裝一個受測實例 */
function harness(o = {}) {
  const doc = fakeDocument();
  const startBtn = new FNode(doc, "button");
  startBtn.className = "btn btn--accent db-start";
  startBtn.disabled = o.startDisabled === true;
  if (o.noButton !== true) doc.getElementById("view-dashboard").appendChild(startBtn);
  doc.ops.length = 0;
  doc.created.length = 0;

  const store = fakeStore(o);
  const raf = [];
  const timers = [];
  const loads = [];
  const service = {
    load(ins) {
      loads.push(ins);
      return true;
    }
  };
  const g = {
    document: doc,
    navigator: { onLine: o.online === undefined ? true : o.online },
    requestAnimationFrame: o.noRaf ? undefined : (fn) => { raf.push(fn); return raf.length; },
    setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; }
  };
  const ad = Object.assign({}, A, { AD_CONFIG: { publisherId: PUBLISHER, adSlotId: SLOT_VALUE } });
  const inst = SLOT.create(g, () => ({ store, ad, reinit: o.reinit || { hasLearningRecord: (d) => d === RECORD }, service }));
  return {
    doc, g, store, raf, timers, loads, inst, startBtn,
    flushRaf() { raf.splice(0).forEach((fn) => fn()); },
    flushTimers() { timers.splice(0).forEach((t) => t.fn()); },
    flush() { this.flushRaf(); this.flushTimers(); },
    slot() { return doc.getElementById("ad-slot"); }
  };
}

describe("ad-slot：ineligible（V-AD-02、DS-47、第一階段）", () => {
  test("ineligible：不訂閱、不建 DOM、不排程、不呼叫服務", () => {
    const h = harness({ status: "ineligible" });
    assert.equal(h.inst.init(), false);
    assert.equal(h.store.subscribeCount, 0);
    assert.deepEqual(h.doc.created, []);
    assert.deepEqual(h.doc.ops, []);
    assert.equal(h.raf.length, 0);
    assert.equal(h.timers.length, 0);
    assert.equal(h.loads.length, 0);
    assert.equal(h.slot(), null);
    assert.equal(h.doc.querySelector(".adsbygoogle"), null);
  });

  test("init 只生效 1 次", () => {
    const h = harness();
    assert.equal(h.inst.init(), true);
    assert.equal(h.inst.init(), false);
    assert.equal(h.store.subscribeCount, 1);
  });

  test("依賴取用拋例外：不往外拋", () => {
    const g = { document: fakeDocument(), navigator: {} };
    const inst = SLOT.create(g, () => { throw new Error("x"); });
    assert.equal(inst.init(), false);
  });
});

describe("ad-slot：載入時機（AD-6、AC-52-02、E-141）", () => {
  test("waiting 未載入前不建容器（DS-47）", () => {
    const h = harness({ data: NO_RECORD });
    h.inst.init();
    h.flush();
    assert.equal(h.slot(), null);
    assert.deepEqual(h.doc.created, []);
  });

  for (const [name, o] of [
    ["首次模式", { entryMode: "firstRun" }],
    ["不在主控台", { currentTab: "flashcards" }],
    ["無學習紀錄", { data: NO_RECORD }],
    ["按鈕不存在", { noButton: true }],
    ["按鈕 disabled", { startDisabled: true }]
  ]) {
    test(name + "：不載入", () => {
      const h = harness(o);
      h.inst.init();
      h.flush();
      h.store.notify();
      h.flush();
      assert.equal(h.loads.length, 0);
      assert.equal(h.slot(), null);
      assert.deepEqual(h.store.events, []);
    });
  }

  test("全部成立：不在通知當下執行，要等 rAF 再 setTimeout(0)（AD-6 (5)、AC-51-02）", () => {
    const h = harness();
    h.inst.init();
    assert.equal(h.raf.length, 1, "已排入 rAF");
    assert.equal(h.timers.length, 0);
    assert.equal(h.loads.length, 0);
    assert.equal(h.slot(), null);
    h.flushRaf();
    assert.equal(h.timers.length, 1);
    assert.equal(h.timers[0].ms, 0);
    assert.equal(h.loads.length, 0, "rAF 當下仍不載入");
    assert.equal(h.slot(), null);
    h.flushTimers();
    assert.equal(h.loads.length, 1);
    assert.deepEqual(h.store.events, ["load"]);
  });

  test("等待 rAF 期間多次通知：只排程 1 次、只載入 1 次", () => {
    const h = harness();
    h.inst.init();
    h.store.notify();
    h.store.notify();
    assert.equal(h.raf.length, 1);
    h.flush();
    h.store.notify();
    h.flush();
    assert.equal(h.loads.length, 1);
  });

  test("分頁在背景（rAF 不觸發）：維持 waiting，不算失敗；回到前景才載入", () => {
    const h = harness();
    h.inst.init();
    h.store.notify();
    assert.equal(h.store.state.runtime.ad.status, "waiting");
    assert.equal(h.loads.length, 0);
    h.flush();
    assert.equal(h.loads.length, 1);
  });

  test("沒有 requestAnimationFrame：仍以 setTimeout(0) 延後", () => {
    const h = harness({ noRaf: true });
    h.inst.init();
    assert.equal(h.loads.length, 0);
    assert.equal(h.timers.length, 1);
    h.flushTimers();
    assert.equal(h.loads.length, 1);
  });

  test("排程後離開主控台：不載入；回到主控台再評估後才載入（AD-6 (2)）", () => {
    const h = harness();
    h.inst.init();
    h.store.set({ currentTab: "part5" });
    h.flush();
    assert.equal(h.loads.length, 0);
    assert.equal(h.slot(), null);
    assert.equal(h.store.state.runtime.ad.status, "waiting");
    h.store.set({ currentTab: "dashboard" });
    h.flush();
    assert.equal(h.loads.length, 1);
  });

  test("排程後被隱藏（dismissed）：不載入、不建容器（AD-10）", () => {
    const h = harness();
    h.inst.init();
    h.store.actions.adEvent("dismiss");
    h.flush();
    assert.equal(h.loads.length, 0);
    assert.equal(h.slot(), null);
  });

  test("排程後學習紀錄消失：不載入", () => {
    const h = harness();
    h.inst.init();
    h.store.setData(NO_RECORD);
    h.flush();
    assert.equal(h.loads.length, 0);
  });

  test("主控台資料更新後才有紀錄：下一次通知即評估並載入（AC-52-02）", () => {
    const h = harness({ data: NO_RECORD });
    h.inst.init();
    h.flush();
    assert.equal(h.loads.length, 0);
    h.store.setData(RECORD);
    h.flush();
    assert.equal(h.loads.length, 1);
  });

  test("離線：轉 collapsed，不建容器、不呼叫服務；之後恢復連線也不重試（AC-51-04、AD-5）", () => {
    const h = harness({ online: false });
    h.inst.init();
    h.flush();
    assert.deepEqual(h.store.events, ["collapse"]);
    assert.equal(h.store.state.runtime.ad.status, "collapsed");
    assert.equal(h.loads.length, 0);
    assert.equal(h.slot(), null);
    h.g.navigator.onLine = true;
    h.store.notify();
    h.flush();
    assert.equal(h.loads.length, 0);
    assert.equal(h.store.state.runtime.ad.status, "collapsed");
  });

  test("navigator.onLine 不是 true（未定義）：視同離線", () => {
    const h = harness({ online: null });
    h.inst.init();
    h.flush();
    assert.equal(h.store.state.runtime.ad.status, "collapsed");
  });

  test("排程期間斷線：以執行當下為準", () => {
    const h = harness();
    h.inst.init();
    h.g.navigator.onLine = false;
    h.flush();
    assert.deepEqual(h.store.events, ["collapse"]);
    assert.equal(h.loads.length, 0);
  });

  test("通知當下只讀取目前的狀態，不依賴通知參數；學習中切頁不計算學習紀錄", () => {
    let calls = 0;
    const h = harness({ currentTab: "flashcards", reinit: { hasLearningRecord: () => { calls++; return true; } } });
    h.inst.init();
    for (let i = 0; i < 5; i++) h.store.notify(["flashcard"]);
    assert.equal(calls, 0);
  });

  test("hasLearningRecord 拋例外：靜默，不載入", () => {
    const h = harness({ reinit: { hasLearningRecord: () => { throw new Error("x"); } } });
    const orig = console.error;
    let errors = 0;
    console.error = () => { errors++; };
    try {
      h.inst.init();
      h.store.notify();
      h.flush();
    } finally {
      console.error = orig;
    }
    assert.equal(errors, 0);
    assert.equal(h.loads.length, 0);
  });
});

describe("ad-slot：容器與廣告框（DS-47、AD-7、AD-9、AD-11、AD-14）", () => {
  function loadedHarness(o) {
    const h = harness(o);
    h.inst.init();
    h.flush();
    assert.equal(h.loads.length, 1);
    return h;
  }

  test("結構：#ad-slot 在 #app-main 之後、#app-footer 之前，且不在 #view-dashboard 內", () => {
    const h = loadedHarness();
    const slot = h.slot();
    const main = h.doc.getElementById("app-main");
    const footer = h.doc.getElementById("app-footer");
    assert.equal(slot.tagName, "ASIDE");
    assert.equal(slot.parentNode, h.doc.body);
    assert.equal(main.nextSibling, slot);
    assert.equal(slot.nextSibling, footer);
    assert.equal(h.doc.getElementById("view-dashboard").contains(slot), false);
    assert.equal(slot.getAttribute("aria-label"), "廣告版位");
    assert.equal(slot.className, "ad-slot");
  });

  test("廣告框屬性恰為 AD-7 列出的項目，交給服務的就是這個節點", () => {
    const h = loadedHarness();
    const ins = h.doc.querySelectorAll(".adsbygoogle");
    assert.equal(ins.length, 1);
    assert.equal(ins[0].tagName, "INS");
    assert.deepEqual(JSON.parse(JSON.stringify(ins[0].attrs)), {
      class: "adsbygoogle",
      style: "display:block",
      "data-ad-client": PUBLISHER,
      "data-ad-slot": SLOT_VALUE,
      "data-ad-format": "auto",
      "data-full-width-responsive": "false"
    });
    assert.equal(h.loads[0], ins[0]);
    assert.equal(ins[0].parentNode.className, "ad-slot__frame");
  });

  test("掛上文件前已是 loading；標籤 hidden（AD-5：高度 0、無標籤）", () => {
    const h = harness();
    let stateAtInsert = null;
    h.doc.onInsert = (n, parent) => {
      if (n.id === "ad-slot" && parent === h.doc.body) stateAtInsert = n.getAttribute("data-ad-state");
    };
    h.inst.init();
    h.flush();
    assert.equal(stateAtInsert, "loading");
    assert.equal(h.doc.querySelector(".ad-slot__label").hidden, true);
  });

  test("標籤只在 filled 顯示，文字逐字 AD_TEXTS.label；data-ad-state 依狀態同步", () => {
    const h = loadedHarness();
    const label = h.doc.querySelector(".ad-slot__label");
    assert.equal(label.textContent, A.AD_TEXTS.label);
    assert.equal(label.textContent, "廣告");
    h.store.actions.adEvent("filled");
    assert.equal(h.slot().getAttribute("data-ad-state"), "filled");
    assert.equal(label.hidden, false);
    h.store.actions.adEvent("dismiss");
    assert.equal(h.slot().getAttribute("data-ad-state"), "dismissed");
    assert.equal(label.hidden, true);
  });

  test("collapsed：標籤隱藏，節點保留", () => {
    const h = loadedHarness();
    const slot = h.slot();
    h.store.actions.adEvent("collapse");
    assert.equal(slot.getAttribute("data-ad-state"), "collapsed");
    assert.equal(h.doc.querySelector(".ad-slot__label").hidden, true);
    assert.equal(h.slot(), slot);
  });

  test("隱藏是同步的：adEvent 回來時畫面狀態已更新（AD-10 ≤ 100ms）", () => {
    const h = loadedHarness();
    h.store.actions.adEvent("filled");
    assert.equal(h.raf.length + h.timers.length, 0);
    h.store.actions.adEvent("dismiss");
    assert.equal(h.slot().getAttribute("data-ad-state"), "dismissed");
    assert.equal(h.raf.length + h.timers.length, 0);
  });

  test("切頁、資料更新：不再新增、移動或移除任何節點，也不再呼叫服務（AD-9）", () => {
    const h = loadedHarness();
    h.store.actions.adEvent("filled");
    const slot = h.slot();
    const ins = h.doc.querySelector(".adsbygoogle");
    h.doc.ops.length = 0;
    h.doc.created.length = 0;
    for (let i = 0; i < 3; i++) {
      h.store.set({ currentTab: "part5" });
      h.flush();
      h.store.set({ currentTab: "dashboard" });
      h.flush();
      h.store.setData(RECORD);
      h.flush();
    }
    assert.deepEqual(h.doc.ops, []);
    assert.deepEqual(h.doc.created, []);
    assert.equal(h.loads.length, 1);
    assert.equal(h.slot(), slot);
    assert.equal(h.doc.querySelector(".adsbygoogle"), ins);
    assert.equal(slot.getAttribute("data-ad-state"), "filled");
  });

  test("#app-footer 不存在：收合，不呼叫服務、不建立任何掛上文件的節點", () => {
    const h = harness();
    h.doc.getElementById("app-footer").remove();
    h.inst.init();
    h.flush();
    assert.deepEqual(h.store.events, ["load", "collapse"]);
    assert.equal(h.loads.length, 0);
    assert.equal(h.slot(), null);
  });

  test("學習資料不進入 DOM 屬性（AD-11）", () => {
    const secret = { part5: { totalAnswered: 7, correctIds: ["zzsentinelword"] } };
    const h = harness({ data: secret, reinit: R });
    h.store.today = () => TODAY;
    h.inst.init();
    h.flush();
    assert.equal(h.loads.length, 1);
    const dump = JSON.stringify(walk(h.slot()).map((n) => [n.attrs, n.textContent]));
    assert.doesNotMatch(dump, /zzsentinelword/);
    assert.doesNotMatch(dump, /totalAnswered/);
    assert.doesNotMatch(dump, /"7"/);
  });
});

// ─────────────────────────────────────────────────────────────
// (B) 真實組裝：真實 main.js、router、store、主控台、services/ad.js
// ─────────────────────────────────────────────────────────────

const OTHER_VIEWS = ["customizer", "flashcards", "part5", "decoder", "phrasebank", "sources", "about", "contact", "privacy"];

/**
 * 在 vm 沙箱啟動 App。
 * @param {object} o slot（單元 ID；預設 SLOT_VALUE，null 代表維持來源的 null）、record（是否有學習紀錄）、firstRun、hash、online、location
 */
function bootApp(o = {}) {
  const doc = fakeDocument(OTHER_VIEWS);
  const nav = new FNode(doc, "nav");
  nav.id = "app-nav";
  doc.body.insertBefore(nav, doc.getElementById("app-main"));
  const toast = new FNode(doc, "div");
  toast.id = "toast-root";
  doc.body.appendChild(toast);

  const storage = new Map();
  if (!o.firstRun) {
    const data = PERSIST.defaultData();
    if (o.record !== false) data.part5 = Object.assign({}, data.part5, { totalAnswered: 2, totalCorrect: 1 });
    storage.set(C.STORAGE_KEYS.state, JSON.stringify(PERSIST.buildRecord(data, new Date("2026-11-01T00:00:00Z"))));
  }
  const raf = [];
  const timers = new Map();
  let timerId = 0;
  const errors = [];
  const observers = [];
  const pushes = [];
  const counters = { adsReads: 0, adsWrites: 0 };
  let adsValue;

  const sandbox = {
    console: {
      log() {}, info() {}, warn() {}, debug() {},
      error: (...a) => errors.push(a.map(String).join(" "))
    },
    document: doc,
    location: o.location || { protocol: "https:", hostname: "jimmyfantasyworld.com", hash: o.hash || "", pathname: "/", search: "", href: "https://jimmyfantasyworld.com/" },
    navigator: { onLine: o.online === undefined ? true : o.online, userAgent: "test", vibrate: undefined },
    localStorage: {
      getItem: (k) => (storage.has(k) ? storage.get(k) : null),
      setItem: (k, v) => { storage.set(k, String(v)); },
      removeItem: (k) => { storage.delete(k); },
      key: (i) => Array.from(storage.keys())[i] || null,
      get length() { return storage.size; }
    },
    performance: { mark() {}, now: () => 0 },
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    history: { replaceState() {} },
    requestAnimationFrame: (fn) => { raf.push(fn); return raf.length; },
    cancelAnimationFrame() {},
    setTimeout: (fn, ms) => { timerId++; timers.set(timerId, { fn, ms }); return timerId; },
    clearTimeout: (id) => { timers.delete(id); },
    addEventListener() {},
    removeEventListener() {},
    scrollTo() {},
    MutationObserver: class {
      constructor(cb) { this.cb = cb; observers.push(this); }
      observe(target) { this.target = target; this.active = true; }
      disconnect() { this.active = false; }
    }
  };
  sandbox.self = sandbox;
  sandbox.window = sandbox;
  Object.defineProperty(sandbox, "adsbygoogle", {
    configurable: true,
    get() { counters.adsReads++; return adsValue; },
    set(v) {
      counters.adsWrites++;
      adsValue = v;
      const orig = adsValue.push;
      adsValue.push = function (x) { pushes.push(x); return orig.call(this, x); };
    }
  });
  doc.attrObservers = [(node, key) => {
    if (key !== "data-ad-status") return;
    observers.filter((m) => m.active && m.target === node).forEach((m) => m.cb([{ attributeName: key }]));
  }];

  const ctx = vm.createContext(sandbox);
  const views = [];
  for (const rel of o.files) {
    let code = fs.readFileSync(path.join(APP_DIR, rel), "utf8");
    if (rel === "core/ad.js" && o.slot !== null) {
      assert.match(code, /var AD_SLOT_ID = [^;]*;/);
      code = code.replace(/var AD_SLOT_ID = [^;]*;/, "var AD_SLOT_ID = " + JSON.stringify(o.slot || SLOT_VALUE) + ";");
    }
    if (rel === "views/dashboard.js") {
      // 留住主控台模組，供測試呼叫真實的 mount 與 show
      const reg = sandbox.EMT.views.register;
      sandbox.EMT.views.register = (tab, mod) => { if (tab === "dashboard") views.push(mod); reg(tab, mod); };
    }
    vm.runInContext(code, ctx, { filename: rel });
  }

  const app = {
    doc, sandbox, storage, errors, pushes, counters, observers,
    EMT: sandbox.EMT,
    dashboard: views[0],
    scripts() { return walk(doc.head).filter((n) => n.tagName === "SCRIPT"); },
    slot() { return doc.getElementById("ad-slot"); },
    ins() { return doc.querySelectorAll(".adsbygoogle"); },
    status() { return sandbox.EMT.store.getState().runtime.ad.status; },
    flush() {
      for (let i = 0; i < 6; i++) {
        raf.splice(0).forEach((fn) => fn());
        // 只跑 0 毫秒的計時，10 秒逾時由 fireTimeout 控制
        for (const [id, t] of Array.from(timers)) {
          if (t.ms === 0 || t.ms === undefined) { timers.delete(id); t.fn(); }
        }
      }
    },
    fireTimeout() {
      for (const [id, t] of Array.from(timers)) {
        if (t.ms === A.AD_LOAD_TIMEOUT_MS) { timers.delete(id); t.fn(); }
      }
    },
    timeoutPending() { return Array.from(timers.values()).filter((t) => t.ms === A.AD_LOAD_TIMEOUT_MS).length; }
  };
  return app;
}

/** 依建置順序的檔案清單：對外頁面（FE-87 平行實作中）與其他 view 不載入，本檔只測主控台 */
async function appFiles() {
  const b = await import(require("node:url").pathToFileURL(path.join(APP_DIR, "..", "..", "tools", "build.mjs")).href);
  return b.listAppFiles(APP_DIR).filter((f) => !f.startsWith("views/") || f === "views/dashboard.js");
}

describe("真實組裝（main.js + router + store + dashboard + services/ad.js）", async () => {
  const files = await appFiles();
  const boot = (o) => bootApp(Object.assign({ files }, o));

  test("第一階段（AD_SLOT_ID 維持 null）正式網址：零請求、無版位、無 data-ad-env、未存取廣告全域、Console 無錯誤", () => {
    const app = boot({ slot: null });
    if (A.isSlotConfigured(A.AD_CONFIG)) return; // 第二階段填入 ID 後本案例不適用（AC-50-05）
    app.flush();
    assert.equal(app.status(), "ineligible");
    assert.equal(app.slot(), null);
    assert.equal(app.ins().length, 0);
    assert.equal(app.scripts().length, 0);
    assert.equal(app.counters.adsReads + app.counters.adsWrites, 0);
    assert.equal(app.doc.documentElement.getAttribute("data-ad-env"), null);
    assert.equal(app.doc.created.includes("ins"), false);
    assert.equal(app.doc.created.includes("script"), false);
    assert.equal(app.doc.querySelector("#view-dashboard .db-start") !== null, true, "主控台照常顯示");
    assert.deepEqual(app.errors, []);
  });

  test("已設定但在 file://：ineligible，零請求", () => {
    const app = boot({ location: { protocol: "file:", hostname: "", hash: "", pathname: "/x.html", search: "", href: "file:///x.html" } });
    app.flush();
    assert.equal(app.status(), "ineligible");
    assert.equal(app.slot(), null);
    assert.equal(app.scripts().length, 0);
    assert.deepEqual(app.errors, []);
  });

  test("有紀錄：boot 同步階段不請求；繪製後腳本 1 次、push 1 次；按鈕此時已可點擊", () => {
    const app = boot();
    assert.equal(app.doc.documentElement.getAttribute("data-ad-env"), "1");
    assert.equal(app.doc.documentElement.getAttribute("data-ready"), "1");
    assert.equal(app.status(), "waiting", "emt-ready 時尚未載入");
    assert.equal(app.scripts().length, 0);
    assert.ok(app.doc.querySelector("#view-dashboard .db-start"));
    app.flush();
    assert.equal(app.status(), "loading");
    assert.equal(app.scripts().length, 1);
    assert.equal(app.scripts()[0].src, A.AD_SCRIPT_URL);
    assert.equal(app.pushes.length, 1);
    assert.equal(JSON.stringify(app.pushes[0]), "{}");
    assert.equal(app.slot().getAttribute("data-ad-state"), "loading");
    assert.equal(app.doc.getElementById("app-main").nextSibling, app.slot());
    assert.equal(app.slot().nextSibling, app.doc.getElementById("app-footer"));
    assert.deepEqual(app.errors, []);
  });

  test("無紀錄：零請求（AC-52-02）", () => {
    const app = boot({ record: false });
    app.flush();
    assert.equal(app.status(), "waiting");
    assert.equal(app.scripts().length, 0);
    assert.equal(app.slot(), null);
    assert.equal(app.counters.adsReads + app.counters.adsWrites, 0);
    assert.deepEqual(app.errors, []);
  });

  test("首次模式：零請求，且不因 initAd 寫入 localStorage（DS-56）", () => {
    const app = boot({ firstRun: true });
    app.flush();
    assert.equal(app.EMT.store.getState().runtime.entryMode, "firstRun");
    assert.equal(app.status(), "waiting");
    assert.equal(app.scripts().length, 0);
    assert.equal(app.storage.size, 0);
    assert.deepEqual(app.errors, []);
  });

  test("離線開啟：collapsed，零請求，無容器（AC-51-04）", () => {
    const app = boot({ online: false });
    app.flush();
    assert.equal(app.status(), "collapsed");
    assert.equal(app.scripts().length, 0);
    assert.equal(app.slot(), null);
    assert.deepEqual(app.errors, []);
  });

  test("從 #sources 進入，主控台不是目前頁：不請求；切回主控台（\"tab\" 通知早於 show）後才載入 1 次", () => {
    const app = boot({ hash: "#sources" });
    app.flush();
    assert.equal(app.EMT.router.current(), "sources");
    assert.equal(app.scripts().length, 0);
    assert.equal(app.EMT.router.go("dashboard"), true);
    // go 同步階段：通知已發生、show 已跑完，但載入要等到繪製之後
    assert.equal(app.scripts().length, 0);
    assert.equal(app.status(), "waiting");
    app.flush();
    assert.equal(app.scripts().length, 1);
    assert.equal(app.pushes.length, 1);
    assert.deepEqual(app.errors, []);
  });

  test("排程後立刻切到別頁：不載入（AD-6 (2)）；切回才載入", () => {
    const app = boot();
    app.EMT.router.go("part5");
    app.flush();
    assert.equal(app.status(), "waiting");
    assert.equal(app.scripts().length, 0);
    app.EMT.router.go("dashboard");
    app.flush();
    assert.equal(app.scripts().length, 1);
    assert.deepEqual(app.errors, []);
  });

  test("切頁來回 3 次：版位節點同一個、父節點不變；腳本與 push 仍 1 次；body[data-tab] 同步（AC-52-06）", () => {
    const app = boot();
    app.flush();
    const ins = app.ins()[0];
    ins.setAttribute("data-ad-status", "filled");
    assert.equal(app.status(), "filled");
    const slot = app.slot();
    const parent = slot.parentNode;
    const frame = ins.parentNode;
    app.doc.ops.length = 0;
    app.doc.created.length = 0;
    for (let i = 0; i < 3; i++) {
      app.EMT.router.go("part5");
      app.flush();
      assert.equal(app.doc.body.getAttribute("data-tab"), "part5");
      app.EMT.router.go("dashboard");
      app.flush();
      assert.equal(app.doc.body.getAttribute("data-tab"), "dashboard");
    }
    assert.equal(app.slot(), slot);
    assert.equal(slot.parentNode, parent);
    assert.equal(app.ins().length, 1);
    assert.equal(app.ins()[0], ins);
    assert.equal(ins.parentNode, frame);
    assert.equal(app.scripts().length, 1);
    assert.equal(app.pushes.length, 1);
    assert.equal(app.doc.created.includes("ins"), false);
    assert.equal(app.doc.created.includes("script"), false);
    assert.equal(app.doc.ops.filter((op) => op[1] === slot || op[1] === ins || op[1] === frame).length, 0, "節點未被移動或移除");
    assert.deepEqual(app.errors, []);
  });

  test("主控台 D.clear + 真實 mount、show、renderProgress 重繪：版位仍是同一節點（DS-47）", () => {
    const app = boot();
    app.flush();
    const ins = app.ins()[0];
    ins.setAttribute("data-ad-status", "filled");
    const slot = app.slot();
    const section = app.doc.getElementById("view-dashboard");
    app.doc.ops.length = 0;

    // 真實主控台：再 mount 一次（內部會 D.clear(rootEl)）、show（renderProgress）
    const oldBtn = section.querySelector(".db-start");
    app.dashboard.mount(section);
    app.dashboard.show();
    assert.notEqual(section.querySelector(".db-start"), oldBtn, "主控台內容確實重建");
    // 主控台資料更新通知（PROGRESS_TAGS 含 "dashboard" → renderProgress）
    app.EMT.store.actions.setBackupExpanded(true);
    app.flush();

    assert.equal(app.slot(), slot);
    assert.equal(app.ins()[0], ins);
    assert.equal(slot.parentNode, app.doc.body);
    assert.equal(app.pushes.length, 1);
    assert.equal(app.scripts().length, 1);
    assert.equal(app.doc.ops.filter((op) => op[1] === slot || op[1] === ins).length, 0);
    assert.deepEqual(app.errors, []);
  });

  test("腳本結果：替身 unfilled → collapsed，無標籤；10 秒逾時 → collapsed；逾時後的 filled 被忽略（V-AD-04）", () => {
    const a = boot();
    a.flush();
    a.ins()[0].setAttribute("data-ad-status", "unfilled");
    assert.equal(a.status(), "collapsed");
    assert.equal(a.doc.querySelector(".ad-slot__label").hidden, true);
    assert.equal(a.timeoutPending(), 0, "結束後已清除計時");

    const b = boot();
    b.flush();
    assert.equal(b.timeoutPending(), 1);
    b.fireTimeout();
    assert.equal(b.status(), "collapsed");
    b.ins()[0].setAttribute("data-ad-status", "filled");
    assert.equal(b.status(), "collapsed");
    assert.equal(b.slot().getAttribute("data-ad-state"), "collapsed");
    assert.equal(b.doc.querySelector(".ad-slot__label").hidden, true);

    const c = boot();
    c.flush();
    c.scripts()[0].listeners.error.forEach((fn) => fn({ type: "error" }));
    assert.equal(c.status(), "collapsed");
    assert.deepEqual([a.errors, b.errors, c.errors].flat(), []);
  });

  test("腳本重新回報 filled 不會讓 dismissed 回頭；不留下持久化痕跡（AD-5、DS-56）", () => {
    const app = boot();
    app.flush();
    const before = app.storage.get(C.STORAGE_KEYS.state);
    app.EMT.store.actions.adEvent("dismiss");
    assert.equal(app.slot().getAttribute("data-ad-state"), "dismissed");
    app.ins()[0].setAttribute("data-ad-status", "filled");
    assert.equal(app.status(), "dismissed");
    const after = app.storage.get(C.STORAGE_KEYS.state);
    assert.equal(after, before, "廣告事件不寫入 localStorage");
    assert.deepEqual(Array.from(app.storage.keys()).filter((k) => /ad/i.test(k)), []);
    assert.doesNotMatch(String(after), /adSlot|adStatus|"ad"/);
  });
});

// ─────────────────────────────────────────────────────────────
// 靜態規則
// ─────────────────────────────────────────────────────────────

describe("85-ad.css（DS-48、AC-52-03～AC-52-05）", () => {
  const CSS = fs.readFileSync(path.join(APP_DIR, "styles", "85-ad.css"), "utf8");
  const NO_COMMENT = CSS.replace(/\/\*[\s\S]*?\*\//g, "");

  /** 取出選擇器恰包含 needle 的所有規則內容 */
  function rulesOf(needle) {
    const out = [];
    const re = /([^{}]+)\{([^{}]*)\}/g;
    let m;
    while ((m = re.exec(NO_COMMENT))) {
      if (m[1].includes(needle)) out.push({ selector: m[1].trim(), body: m[2] });
    }
    return out;
  }

  test("loading：height 0、max-height 0、overflow hidden；不得用 display none、visibility hidden", () => {
    const rules = rulesOf('[data-ad-state="loading"]');
    assert.equal(rules.length, 1);
    const b = rules[0].body;
    assert.match(b, /(^|\s|;)height:\s*0/);
    assert.match(b, /max-height:\s*0/);
    assert.match(b, /overflow:\s*hidden/);
    assert.match(b, /padding-block:\s*0/);
    assert.match(b, /border:\s*0/);
    assert.doesNotMatch(b, /display\s*:/);
    assert.doesNotMatch(b, /visibility/);
    assert.ok(!rules[0].selector.includes("data-tab"), "loading 不論目前頁面都相同");
  });

  test("filled 預設隱藏，只有 body[data-tab=dashboard] 顯示，且 margin-block ≥ 48px", () => {
    const rules = rulesOf('[data-ad-state="filled"]');
    const plain = rules.find((r) => !r.selector.includes("data-tab"));
    const dash = rules.find((r) => r.selector.includes('body[data-tab="dashboard"]'));
    assert.match(plain.body, /display:\s*none/);
    assert.match(dash.body, /display:\s*block/);
    const m = dash.body.match(/margin-block:\s*(\d+)px/);
    assert.ok(m && Number(m[1]) >= 48);
    assert.equal(rules.length, 2, "沒有其他頁面顯示 filled 的規則");
  });

  test("collapsed、dismissed：display none", () => {
    for (const s of ['[data-ad-state="collapsed"]', '[data-ad-state="dismissed"]']) {
      assert.match(rulesOf(s)[0].body, /display:\s*none/);
    }
  });

  test("不用強調色、固定定位、動畫（AC-52-03、AC-52-04）", () => {
    for (const re of [/--accent/, /position\s*:/, /fixed/, /sticky/, /transition/, /animation/, /\.card\b/, /url\(/, /@import/]) {
      assert.doesNotMatch(NO_COMMENT, re);
    }
    // 註解也不提這些屬性值，避免掃描誤判
    assert.doesNotMatch(CSS, /fixed|sticky/);
  });

  test("基本寬度與標籤樣式依 DS-48；85-ad.css 不再設定 scrollbar-gutter（v0.16 §7.29）", () => {
    const base = rulesOf(".ad-slot").find((r) => r.selector === ".ad-slot");
    assert.match(base.body, /box-sizing:\s*border-box/);
    assert.match(base.body, /width:\s*100%/);
    assert.match(base.body, /max-width:\s*calc\(var\(--content-narrow\) \+ 32px\)/);
    assert.match(base.body, /margin:\s*0 auto/);
    const label = rulesOf(".ad-slot__label")[0];
    assert.match(label.body, /color:\s*var\(--text-muted\)/);
    const gutter = rulesOf("scrollbar-gutter");
    assert.equal(gutter.length, 0, "scrollbar-gutter 不是選擇器");
    // v0.16 §7.29：改由 00-base.css 的 html 無條件設定，本檔不再有 html[data-ad-env] 規則
    assert.equal(rulesOf("html[data-ad-env]").length, 0);
    assert.equal((NO_COMMENT.match(/scrollbar-gutter/g) || []).length, 0);
  });
});

describe("靜態規則（DS-47、AD-7、AD-11、B-7、LD-2）", () => {
  const READ = (rel) => fs.readFileSync(path.join(APP_DIR, rel), "utf8");
  const SLOT_SRC = READ("ui/ad-slot.js");
  const SERVICE_SRC = READ("services/ad.js");
  const MAIN_SRC = READ("main.js");
  const CODE = SLOT_SRC.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  test("本任務原始檔不觸發建置的 FORBIDDEN_PATTERNS（含註解）", async () => {
    const b = await import(require("node:url").pathToFileURL(path.join(APP_DIR, "..", "..", "tools", "build.mjs")).href);
    for (const [name, src] of [["ad-slot", SLOT_SRC], ["services/ad", SERVICE_SRC], ["main", MAIN_SRC], ["css", READ("styles/85-ad.css")]]) {
      for (const p of b.FORBIDDEN_PATTERNS) {
        assert.doesNotMatch(src, p.re, name + " 觸發 " + p.name);
      }
      assert.doesNotMatch(src, /<\/script/i);
    }
  });

  test("ad-slot 不移除、不搬動節點，也不存起節點再塞回（DS-47）", () => {
    for (const re of [/removeChild/, /\.remove\(/, /replaceChild/, /replaceWith/, /innerHTML/, /insertAdjacent/, /cloneNode/]) {
      assert.doesNotMatch(CODE, re);
    }
    // insertBefore 全檔 1 處
    assert.equal((CODE.match(/insertBefore\(/g) || []).length, 1);
  });

  test("ad-slot 不處理切頁顯示：不讀 data-tab，不動 display（DS-47）", () => {
    assert.doesNotMatch(CODE, /data-tab/);
    assert.doesNotMatch(CODE, /dataset\.tab/);
    assert.doesNotMatch(CODE, /\.style\./);
    assert.doesNotMatch(CODE, /display:\s*none/);
  });

  test("ad-slot 不輸出到主控台、不碰瀏覽器儲存與廣告全域（AD-8、AD-11、DS-56）", () => {
    for (const re of [/console\./, /localStorage/, /sessionStorage/, /adsbygoogle\s*=/, /\.push\(/, /focus\(/]) {
      assert.doesNotMatch(CODE, re);
    }
  });

  test("service 呼叫只傳廣告框，不傳學習資料（AD-11）", () => {
    const calls = CODE.match(/service\.load\(([^)]*)\)/g) || [];
    assert.deepEqual(calls, ["service.load(refs.ins)"]);
  });

  test("main.js 順序：store.init → ad.start → router.start → bottomNav.init → adSlot.init → emt-ready；皆用 step 包裹", () => {
    const order = ['step("store.init"', 'step("ad.start"', 'step("router.start"', 'step("bottomNav.init"', 'step("adSlot.init"', 'step("emt-ready"'];
    const pos = order.map((s) => MAIN_SRC.indexOf(s));
    pos.forEach((p, i) => assert.ok(p >= 0, "缺少 " + order[i]));
    assert.deepEqual(pos.slice().sort((x, y) => x - y), pos);
  });

  test("main.js 交給服務的函式只有 3 個，getStatus 只回傳版位狀態（AD-11）", () => {
    const m = MAIN_SRC.match(/EMT\.services\.ad\.start\(\{([\s\S]*?)\}\);/);
    assert.ok(m);
    assert.deepEqual((m[1].match(/^\s*(\w+):/gm) || []).map((s) => s.trim().replace(":", "")), ["initAd", "adEvent", "getStatus"]);
    assert.match(m[1], /getState\(\)\.runtime\.ad\.status/);
    assert.doesNotMatch(m[1], /\.data\b/);
  });

  test("建置清單包含本任務的模組（services/ad.js 在 ui 之前）", async () => {
    const b = await import(require("node:url").pathToFileURL(path.join(APP_DIR, "..", "..", "tools", "build.mjs")).href);
    const list = b.listAppFiles(APP_DIR);
    assert.ok(list.includes("services/ad.js"));
    assert.ok(list.includes("ui/ad-slot.js"));
    assert.ok(list.indexOf("services/ad.js") < list.indexOf("ui/ad-slot.js"));
    assert.ok(list.indexOf("ui/ad-slot.js") < list.indexOf("main.js"));
  });

  test("載入 ui/ad-slot.js 不取用任何模組或 DOM（LD-2）", () => {
    const sandbox = { self: {} };
    vm.runInContext(SLOT_SRC, vm.createContext(sandbox), { filename: "ui/ad-slot.js" });
    assert.equal(typeof sandbox.self.EMT.ui.adSlot.init, "function");
  });
});
