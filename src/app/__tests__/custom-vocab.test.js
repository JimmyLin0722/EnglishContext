/*
 * custom-vocab.test.js — 自訂單字表單與範本注入提示單元測試（FE-10 測試移入，FE-19）
 * 受測：views/custom-vocab.js 匯出的純邏輯（injectMessage、addFailureView、fieldErrorText、visibleSlice、
 *       templateButtons、FIELDS、CUSTOM_BADGE）；搭配 state/store.js 的實際回傳值驗證提示文字
 * 依據：architecture.md v0.3 §4.3、§7.5（範本注入容量不足 → 回滾 +「儲存空間不足」，R3-2、R3-3）
 * 涵蓋：AC-04-01、AC-04-03、AC-04-06、AC-05-01、AC-05-02、AC-05-04、AC-18-04
 * （v0.14，FE-68）新增範本區 hidden＋inert、可見文字無「範本」、EMPTY_TEXT、HT-9／AC-43-03 情境（AC-43-01～AC-43-03）
 */
"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");

const v = require("../views/custom-vocab.js");
const F = require("./_fixtures.js");
const C = require("../core/constants.js");

describe("custom-vocab.test.js", () => {
  test("injectMessage", () => {
    assert.equal(v.injectMessage({ injected: 10, skipped: 0 }), "已注入 10 個單字");
    assert.equal(v.injectMessage({ injected: 1 }), "已注入 1 個單字");
    assert.equal(v.injectMessage({ injected: 0, skipped: 10 }), "已注入 0 個單字（皆已存在）");
    assert.equal(v.injectMessage(null), "已注入 0 個單字（皆已存在）");
    assert.equal(v.injectMessage({ injected: NaN }), "已注入 0 個單字（皆已存在）");
  });

  test("injectMessage：reason quota →「儲存空間不足」，不顯示注入數（§4.3、§7.5、R3-3、AC-18-04）", () => {
    assert.equal(v.injectMessage({ injected: 0, skipped: 2, reason: "quota" }), "儲存空間不足");
    // 即使誤帶注入數也不得顯示「已注入 N 個單字」
    const m = v.injectMessage({ injected: 8, skipped: 0, reason: "quota" });
    assert.equal(m, "儲存空間不足");
    assert.ok(!m.includes("已注入"));
    // 與新增自訂字的容量不足提示一致
    assert.equal(m, v.addFailureView({ ok: false, reason: "quota" }).message);
  });

  test("範本注入與 store 串接：首次注入 10 個、再注入皆已存在（AC-05-02、AC-05-04）", () => {
    const { a, store } = F.makeStore();
    const r1 = a.injectTemplate("cs");
    assert.equal(v.injectMessage(r1), "已注入 10 個單字");
    const r2 = a.injectTemplate("cs");
    assert.equal(v.injectMessage(r2), "已注入 0 個單字（皆已存在）");
    assert.equal(store.getState().data.customVocab.length, 10);
  });

  test("範本注入遇容量不足：store 回滾、提示「儲存空間不足」；清出空間後再注入可完整注入（R3-2、R3-3）", () => {
    const { a, store, storage } = F.makeStore();
    storage.quota = true;
    const r = a.injectTemplate("business");
    assert.equal(r.reason, "quota");
    assert.equal(v.injectMessage(r), "儲存空間不足");
    assert.equal(store.getState().data.customVocab.length, 0);
    storage.quota = false;
    assert.equal(v.injectMessage(a.injectTemplate("business")), "已注入 10 個單字");
  });

  test("addFailureView", () => {
    let r = v.addFailureView({ ok: false, fieldErrors: { word: "required", meaning: "required" } });
    assert.ok(r.fieldErrors.word && r.fieldErrors.meaning);
    assert.equal(r.message, "");
    r = v.addFailureView({ ok: false, reason: "duplicate" });
    assert.equal(r.fieldErrors.word, "單字已存在");
    r = v.addFailureView({ ok: false, reason: "quota" });
    assert.equal(r.message, "儲存空間不足");
    r = v.addFailureView(undefined);
    assert.ok(r.message.length > 0);
  });

  test("addFailureView 與 store 串接：與內建字重複、容量不足（AC-04-06、AC-18-04）", () => {
    const { a, storage } = F.makeStore();
    assert.equal(v.addFailureView(a.addCustomWord(F.customFields("Meeting"))).fieldErrors.word, "單字已存在");
    storage.quota = true;
    assert.equal(v.addFailureView(a.addCustomWord(F.customFields("Monetization"))).message, "儲存空間不足");
    const empty = v.addFailureView(a.addCustomWord(F.customFields("", "")));
    assert.equal(empty.fieldErrors.word, "此欄位為必填，請輸入內容");
    assert.equal(empty.fieldErrors.meaning, "此欄位為必填，請輸入內容");
  });

  test("fieldErrorText", () => {
    assert.equal(v.fieldErrorText("required"), "此欄位為必填，請輸入內容");
    assert.ok(v.fieldErrorText("xx").length > 0);
  });

  test("visibleSlice", () => {
    const big = Array.from({ length: 450 }, (_, i) => i);
    let r = v.visibleSlice(big, 200);
    assert.equal(r.items.length, 200);
    assert.equal(r.total, 450);
    assert.equal(r.hasMore, true);
    r = v.visibleSlice(big, 400);
    assert.equal(r.items.length, 400);
    assert.equal(r.hasMore, true);
    r = v.visibleSlice(big, 600);
    assert.equal(r.items.length, 450);
    assert.equal(r.hasMore, false);
    r = v.visibleSlice(null, 200);
    assert.equal(r.total, 0);
    assert.equal(r.hasMore, false);
    r = v.visibleSlice([1, 2], 0);
    assert.equal(r.items.length, 2);
    assert.equal(v.PAGE_SIZE, 200);
  });

  test("templateButtons（AC-05-01）", () => {
    let b = v.templateButtons([]);
    assert.deepEqual(b.map((x) => x.label), ["資工", "商管", "生醫統計"]);
    assert.ok(b.every((x) => !x.available));
    b = v.templateButtons([{ id: "biostat", label: "生醫統計", words: [{}] }, { id: "cs", label: "資工", words: [{}] }]);
    assert.deepEqual(b.map((x) => x.id), ["cs", "business", "biostat"]);
    assert.deepEqual(b.map((x) => x.available), [true, false, true]);
    b = v.templateButtons(undefined);
    assert.equal(b.length, 3);
    // fixture（符合 DomainTemplate）三個範本皆可用
    assert.deepEqual(v.templateButtons(F.templates()).map((x) => [x.id, x.label, x.available]),
      [["cs", "資工", true], ["business", "商管", true], ["biostat", "生醫統計", true]]);
  });

  test("FIELDS 與標記", () => {
    assert.deepEqual(v.FIELDS.map((f) => f.key), ["word", "meaning", "phonetic", "pos", "collocation", "example"]);
    assert.deepEqual(v.FIELDS.filter((f) => f.required).map((f) => f.key), ["word", "meaning"]);
    assert.equal(v.FIELDS.find((f) => f.key === "example").label, "論文例句");
    assert.equal(v.CUSTOM_BADGE, "自訂擴充");
  });
});

// ── BUG-002（AC-22-01）：閒置預建與清單分批掛上 ──
// 以真實的 core/dom.js（注入假 document）＋ fixture store 驗證：建立時機、只建立一次／只訂閱一次、
// 分批補齊後的 DOM 與「一次畫完」完全相同，以及補齊途中新增、刪除、注入、顯示更多的結果。
describe("custom-vocab.test.js：閒置預建與分批掛上（BUG-002）", () => {
  const D = require("../core/dom.js");

  /** 極簡假 DOM 節點：只實作 core/dom.js 與 custom-vocab.js 用到的部分 */
  class FNode {
    constructor(doc, tag) {
      this.ownerDocument = doc;
      this.tagName = tag;
      this.nodeType = tag === "#text" ? 3 : 1;
      this.childNodes = [];
      this.parentNode = null;
      this.attrs = {};
      this.listeners = {};
      this.hidden = false;
      this.className = "";
      this.value = "";
      this._text = "";
    }
    get firstChild() { return this.childNodes[0] || null; }
    get nextSibling() {
      if (!this.parentNode) return null;
      const c = this.parentNode.childNodes;
      return c[c.indexOf(this) + 1] || null;
    }
    insertBefore(n, ref) {
      if (n.parentNode) n.parentNode.removeChild(n);
      const i = ref ? this.childNodes.indexOf(ref) : this.childNodes.length;
      if (i < 0) throw new Error("insertBefore：ref 不是子節點");
      this.childNodes.splice(i, 0, n);
      n.parentNode = this;
      return n;
    }
    appendChild(n) { return this.insertBefore(n, null); }
    removeChild(n) {
      const i = this.childNodes.indexOf(n);
      if (i < 0) throw new Error("removeChild：不是子節點");
      this.childNodes.splice(i, 1);
      n.parentNode = null;
      return n;
    }
    set textContent(t) {
      if (this.nodeType === 3) { this._text = String(t); return; }
      this.childNodes.forEach((c) => { c.parentNode = null; });
      this.childNodes = [];
      if (String(t) !== "") this.appendChild(this.ownerDocument.createTextNode(String(t)));
    }
    get textContent() { return this.nodeType === 3 ? this._text : this.childNodes.map((c) => c.textContent).join(""); }
    setAttribute(k, val) { this.attrs[k] = String(val); }
    getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
    removeAttribute(k) { delete this.attrs[k]; }
    addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); }
    dispatch(type) { (this.listeners[type] || []).forEach((fn) => fn({ type, preventDefault() {} })); }
    click() { this.dispatch("click"); }
    focus() { this.ownerDocument.activeElement = this; }
  }

  function fakeDocument() {
    const doc = {
      created: 0,
      activeElement: null,
      createElement(tag) { doc.created++; return new FNode(doc, tag); },
      createElementNS(ns, tag) { doc.created++; return new FNode(doc, tag); },
      createTextNode(t) { const n = new FNode(doc, "#text"); n._text = String(t); return n; }
    };
    return doc;
  }

  /** 依 class 找出所有後代 */
  function findAll(node, cls, out = []) {
    for (const c of node.childNodes) {
      if (c.nodeType === 1 && (" " + c.className + " ").includes(" " + cls + " ")) out.push(c);
      findAll(c, cls, out);
    }
    return out;
  }
  const find = (node, cls) => findAll(node, cls)[0] || null;

  /** 序列化（不含事件）：用來比較兩個畫面是否完全相同 */
  function serialize(n) {
    if (n.nodeType === 3) return JSON.stringify(n._text);
    const attrs = Object.keys(n.attrs).sort().map((k) => k + "=" + JSON.stringify(n.attrs[k])).join(" ");
    return "<" + n.tagName + " class=" + JSON.stringify(n.className) + " " + attrs + (n.hidden ? " hidden" : "") + ">" +
      n.childNodes.map(serialize).join("") + "</" + n.tagName + ">";
  }

  /**
   * 建立測試環境。
   * @param {{ ready?: boolean, idle?: boolean, words?: number, storage?: object }} [o]
   *   idle = false 時 root 沒有任何排程函式（補掛同步執行，等同一次畫完）
   */
  function setup(o = {}) {
    const doc = fakeDocument();
    D.setDocument(doc);
    const { store, a, storage } = F.makeStore(o.storage ? { storage: o.storage } : undefined);
    for (let i = 0; i < (o.words || 0); i++) {
      const r = a.addCustomWord(F.customFields("qaword" + String.fromCharCode(97 + (i % 26)) + i, "釋義" + i));
      assert.ok(r.ok, "fixture 新增失敗：" + i);
    }
    const counter = { subscribe: 0 };
    const realSubscribe = store.subscribe;
    store.subscribe = (fn) => { counter.subscribe++; return realSubscribe(fn); };
    const host = new FNode(doc, "div");
    const idleQueue = [];
    const loadHandlers = [];
    const htmlAttrs = { "data-ready": o.ready === false ? null : "1" };
    const toasts = [];
    let docReads = 0;
    const fakeDoc = {
      documentElement: { getAttribute: (k) => htmlAttrs[k] },
      getElementById: (id) => (id === "customizer-custom" ? host : null)
    };
    const EMT = {
      core: { dom: D },
      store,
      content: { templates: F.templates() },
      ui: { toast: { show: (t) => toasts.push(t) } }
    };
    const root = {
      get document() { docReads++; return fakeDoc; },
      addEventListener(type, fn) { if (type === "load") loadHandlers.push(fn); },
      console: { error() {} }
    };
    if (o.idle !== false) root.requestIdleCallback = (fn) => { idleQueue.push(fn); return idleQueue.length; };
    const view = v.createView(EMT, root);
    return {
      doc, store, a, storage, host, view, counter, htmlAttrs, toasts, idleQueue,
      root,
      docReads: () => docReads,
      fireLoad() { loadHandlers.splice(0).forEach((fn) => fn()); },
      flushOne() { idleQueue.shift()({ timeRemaining: () => 50, didTimeout: false }); },
      flushIdle() { let n = 0; while (idleQueue.length && n < 200) { idleQueue.shift()({ timeRemaining: () => 50, didTimeout: false }); n++; } return n; },
      list: () => find(host, "cv-list"),
      words: () => findAll(find(host, "cv-list"), "cv-item__word").map((n) => n.textContent),
      storeWords: (lim = v.PAGE_SIZE) => store.getState().data.customVocab.slice(0, lim).map((x) => x.word),
      count: () => find(host, "cv-list__count").textContent,
      more: () => find(host, "cv-list__more")
    };
  }

  /**
   * 以「一次畫完」建立的參考畫面：以 env 目前保存的狀態（含範本來源）重新啟動 store，
   * root 沒有排程函式 → 補掛同步完成。
   */
  function reference(env, moreClicks = 0) {
    const r = setup({ idle: false, storage: F.fakeStorage(Object.fromEntries(env.storage.map)) });
    assert.deepEqual(r.store.getState().data.customVocab, env.store.getState().data.customVocab, "參考畫面的資料相同");
    r.view.mount(null);
    r.view.show();
    for (let i = 0; i < moreClicks; i++) r.more().click();
    const total = env.store.getState().data.customVocab.length;
    assert.equal(r.words().length, Math.min(total, v.PAGE_SIZE * (moreClicks + 1)), "參考畫面已一次畫完");
    return serialize(r.host);
  }

  test("syncCount／fillCount：隱藏中只掛 FIRST_BATCH；顯示中保留已掛筆數再多掛 FIRST_BATCH；補掛每次 FILL_BATCH", () => {
    const FB = v.FIRST_BATCH, LB = v.FILL_BATCH;
    assert.ok(FB > 0 && FB < v.PAGE_SIZE && LB > 0);
    assert.equal(v.syncCount(450, 0, false), FB);
    assert.equal(v.syncCount(5, 0, false), 5);
    assert.equal(v.syncCount(200, 200, false), FB);
    assert.equal(v.syncCount(200, 0, true), FB);
    assert.equal(v.syncCount(400, 200, true), 200 + FB);
    assert.equal(v.syncCount(199, 200, true), 199, "刪除後不超過總數");
    assert.equal(v.syncCount(0, 10, true), 0);
    assert.equal(v.syncCount(NaN, undefined, true), 0);
    assert.equal(v.fillCount(200, FB), FB + LB);
    assert.equal(v.fillCount(200, 190), 200);
    assert.equal(v.fillCount(-1, 3), 0);
  });

  test("建立 view 時不讀取 document、不排入閒置（LD-2）；load 事件本身也不建立", () => {
    const f = setup({ words: 3 });
    assert.equal(f.docReads(), 0);
    assert.equal(f.idleQueue.length, 0);
    assert.equal(f.host.childNodes.length, 0);
    f.fireLoad();
    assert.equal(f.docReads(), 0, "document 留到閒置回呼內才取用");
    assert.equal(f.idleQueue.length, 1);
    assert.equal(f.host.childNodes.length, 0);
  });

  test("load 後閒置預建；之後 mount、show 不重建、不重複訂閱；顯示後閒置補齊前 200 筆", () => {
    const f = setup({ words: 230 });
    f.fireLoad();
    f.flushOne();
    assert.equal(f.host.childNodes.length, 3, "閒置時建立表單、範本、清單 3 區");
    assert.equal(f.counter.subscribe, 1);
    assert.equal(f.words().length, v.FIRST_BATCH, "隱藏中只掛前 FIRST_BATCH 筆");
    assert.equal(f.count(), "共 230 個自訂單字（顯示前 200 個）", "筆數文字依完整清單");
    assert.equal(f.more().hidden, false);
    assert.equal(f.idleQueue.length, 0, "隱藏中不補掛");
    const sections = f.host.childNodes.slice();
    const created = f.doc.created;
    f.view.mount(null);
    f.view.show();
    assert.deepEqual(f.host.childNodes, sections, "mount 不重建");
    assert.equal(f.doc.created, created, "mount、show 不建立新節點（只排入補掛）");
    assert.equal(f.counter.subscribe, 1, "不重複訂閱");
    assert.equal(f.words().length, v.FIRST_BATCH, "show 時同步只有前 FIRST_BATCH 筆");
    f.flushIdle();
    assert.deepEqual(f.words(), f.storeWords(), "補齊後為前 200 筆，順序與 store 相同");
    assert.equal(serialize(f.host), reference(f), "與一次畫完的畫面完全相同");
  });

  test("使用者在閒置前就切到自訂器：mount 照常建立，之後的閒置預建略過", () => {
    const f = setup({ words: 3 });
    f.view.mount(null);
    f.view.show();
    assert.equal(f.host.childNodes.length, 3);
    assert.deepEqual(f.words(), f.storeWords());
    const sections = f.host.childNodes.slice();
    const created = f.doc.created;
    f.fireLoad();
    f.flushIdle();
    assert.deepEqual(f.host.childNodes, sections, "預建不重建");
    assert.equal(f.doc.created, created);
    assert.equal(f.counter.subscribe, 1);
  });

  test("啟動流程尚未完成（data-ready 未設定）時延後重試；一直未完成最多重試 20 次", () => {
    const f = setup({ ready: false });
    f.fireLoad();
    for (let i = 0; i < 3; i++) {
      assert.equal(f.idleQueue.length, 1);
      f.flushOne();
    }
    assert.equal(f.host.childNodes.length, 0);
    f.htmlAttrs["data-ready"] = "1";
    f.flushIdle();
    assert.equal(f.host.childNodes.length, 3);

    const g = setup({ ready: false });
    g.fireLoad();
    assert.equal(g.flushIdle(), 21, "第 1 次 + 重試 20 次");
    assert.equal(g.host.childNodes.length, 0);
  });

  test("空清單：顯示空狀態、清單隱藏、不排入補掛", () => {
    const f = setup();
    f.view.mount(null);
    f.view.show();
    assert.equal(find(f.host, "cv-list__empty").hidden, false);
    assert.equal(f.list().hidden, true);
    assert.equal(f.count(), "共 0 個自訂單字");
    assert.equal(f.idleQueue.length, 0);
    assert.equal(serialize(f.host), reference(f));
  });

  test("補齊途中：新增、刪除（已掛與未掛的項目）、範本注入、顯示更多，補齊後與一次畫完相同", () => {
    const f = setup({ words: 190 });
    f.view.mount(null);
    f.view.show();
    f.flushOne();
    const shown = f.words().length;
    assert.ok(shown > v.FIRST_BATCH && shown < 190, "補掛進行中：" + shown);

    // 新增（表單送出）
    find(f.host, "cv-form__field--word").childNodes[1].value = "qaNewWord";
    find(f.host, "cv-form__field--meaning").childNodes[1].value = "新字";
    find(f.host, "cv-form").dispatch("submit");
    assert.equal(f.toasts.at(-1), "已新增「qaNewWord」");
    assert.equal(f.count(), "共 191 個自訂單字");

    // 刪除已掛上的第 3 筆：其餘節點原地保留，後一筆遞補到同一索引
    const lis = findAll(f.list(), "cv-item");
    const keepPrev = lis[1], keepNext = lis[3];
    const delWord = f.words()[2];
    find(lis[2], "cv-item__delete").click();
    assert.equal(f.toasts.at(-1), "已刪除「" + delWord + "」");
    const lis2 = findAll(f.list(), "cv-item");
    assert.equal(lis2[1], keepPrev, "前一筆節點保留");
    assert.equal(lis2[2], keepNext, "後一筆遞補到被刪除的索引");
    assert.ok(!f.words().includes(delWord));

    // 刪除尚未掛上的項目
    const far = f.store.getState().data.customVocab[180];
    assert.ok(f.a.deleteCustomWord(far.id).ok);
    assert.equal(f.count(), "共 189 個自訂單字");

    // 範本注入：清單超過 200 → 出現「顯示更多」
    find(f.host, "cv-templates__btn").click();
    assert.equal(find(f.host, "cv-templates__status").textContent, "已注入 10 個單字");
    f.a.injectTemplate("business");
    f.a.injectTemplate("biostat");
    assert.equal(f.count(), "共 219 個自訂單字（顯示前 200 個）");
    assert.equal(f.more().hidden, false);

    // 顯示更多（補齊前按下）
    f.flushOne();
    f.more().click();
    assert.equal(f.count(), "共 219 個自訂單字");
    assert.equal(f.more().hidden, true);
    f.flushIdle();
    assert.deepEqual(f.words(), f.storeWords(400));
    // 參考畫面未按範本按鈕，範本狀態文字除外其餘須完全相同
    const strip = (s) => s.replace(/<p class="cv-templates__status"[^]*?<\/p>/, "");
    assert.equal(strip(serialize(f.host)), strip(reference(f, 1)));
  });

  test("補齊後刪除第 1 筆：第 201 筆同步遞補，只建立一個新節點，結果與一次畫完相同", () => {
    const f = setup({ words: 205 });
    f.view.mount(null);
    f.view.show();
    f.flushIdle();
    assert.deepEqual(f.words(), f.storeWords());
    const created = f.doc.created;
    const first = f.store.getState().data.customVocab[0];
    find(f.list(), "cv-item__delete").click();
    assert.deepEqual(f.words(), f.storeWords(), "第 201 筆遞補，同步完成");
    assert.ok(f.doc.created - created < 20, "只建立遞補的一筆，不重建全部：" + (f.doc.created - created));
    assert.ok(!f.words().includes(first.word));
    assert.equal(serialize(f.host), reference(f));
  });

  test("離開頁面卸下多餘節點；隱藏中資料變動 → 再次顯示時以最新資料分批補齊，結果相同", () => {
    const f = setup({ words: 120 });
    f.view.mount(null);
    f.view.show();
    f.flushIdle();
    assert.equal(f.words().length, 120);
    f.view.hide();
    assert.equal(f.words().length, v.FIRST_BATCH, "隱藏時只留前 FIRST_BATCH 筆");
    assert.equal(f.idleQueue.length, 0);
    // 隱藏中：刪除第 1 筆、新增 1 筆（例如其他頁匯入）
    const secondLi = findAll(f.list(), "cv-item")[1];
    f.a.deleteCustomWord(f.store.getState().data.customVocab[0].id);
    f.a.addCustomWord(F.customFields("qaHiddenAdd", "隱藏中新增"));
    assert.equal(f.count(), "共 120 個自訂單字", "隱藏中不渲染");
    f.view.show();
    assert.equal(f.words().length, v.FIRST_BATCH, "再次顯示同步只掛前 FIRST_BATCH 筆");
    assert.equal(findAll(f.list(), "cv-item")[0], secondLi, "未變動的項目重用節點");
    f.flushIdle();
    assert.deepEqual(f.words(), f.storeWords());
    assert.ok(f.words().includes("qaHiddenAdd"));
    assert.equal(serialize(f.host), reference(f));
    // 補掛途中離開：停止補掛，不拋例外；再顯示後補齊
    f.view.hide();
    f.view.show();
    f.view.hide();
    f.flushIdle();
    assert.equal(f.words().length, v.FIRST_BATCH);
    f.view.show();
    f.flushIdle();
    assert.equal(serialize(f.host), reference(f));
    assert.equal(f.counter.subscribe, 1);
  });

  test("切到本頁的第一個畫格不繪製本區，下一個畫格才顯示；離開頁面時取消，舊回呼不得提早顯示", () => {
    const f = setup({ words: 3 });
    const rafQueue = [];
    f.root.requestAnimationFrame = (fn) => { rafQueue.push(fn); return rafQueue.length; };
    const frame = () => rafQueue.splice(0).forEach((fn) => fn(0));
    f.view.mount(null);
    f.view.show();
    assert.equal(f.host.hidden, true, "點擊事件內先隱藏本區");
    assert.deepEqual(f.words(), f.storeWords(), "內容已就緒，只延後顯示");
    frame();
    assert.equal(f.host.hidden, true, "第一個畫格仍不繪製");
    frame();
    assert.equal(f.host.hidden, false, "下一個畫格顯示");
    assert.equal(rafQueue.length, 0);

    // 延後途中離開 → 立即恢復；再次顯示後，舊的回呼不可提早顯示
    f.view.hide();
    f.view.show();
    frame();
    f.view.hide();
    assert.equal(f.host.hidden, false, "離開頁面時恢復（頁面本身已隱藏）");
    f.view.show();
    assert.equal(f.host.hidden, true);
    frame(); // 舊的第 2 個回呼 + 新的第 1 個回呼
    assert.equal(f.host.hidden, true, "舊回呼作廢，不提早顯示");
    frame();
    assert.equal(f.host.hidden, false);
    assert.equal(f.counter.subscribe, 1);
  });

  test("新增失敗（重複、必填）訊息與焦點不受影響（AC-04-03、AC-04-06）", () => {
    const f = setup({ words: 1 });
    f.view.mount(null);
    f.view.show();
    const word = find(f.host, "cv-form__field--word").childNodes[1];
    const meaning = find(f.host, "cv-form__field--meaning").childNodes[1];
    word.value = "Meeting"; meaning.value = "會議";
    find(f.host, "cv-form").dispatch("submit");
    assert.equal(find(f.host, "cv-form__field--word").childNodes[2].textContent, "單字已存在");
    assert.equal(f.doc.activeElement, word);
    word.value = ""; meaning.value = "";
    find(f.host, "cv-form").dispatch("submit");
    assert.equal(find(f.host, "cv-form__field--meaning").childNodes[2].textContent, "此欄位為必填，請輸入內容");
    assert.equal(f.words().length, 1);
  });

  // ── （v0.14，FE-68）隱藏領域範本區塊與「範本」字樣（契約 HT-6～HT-9、DS-27、FB-51；architecture.md v0.9 §7.20.2）──

  /** 是否有 hidden 祖先（含自己）：假 DOM 的 hidden 屬性或 hidden 特性 */
  function hiddenUp(n) {
    for (let p = n; p; p = p.parentNode) {
      if (p.nodeType === 1 && (p.hidden === true || "hidden" in p.attrs)) return true;
    }
    return false;
  }

  /** 走訪 host 樹，收集可見文字（textContent 的文字節點、aria-label、title），略過有 hidden 祖先的節點 */
  function visibleTexts(node, out = []) {
    for (const c of node.childNodes) {
      if (hiddenUp(c)) continue;
      if (c.nodeType === 3) {
        if (c._text) out.push(c._text);
        continue;
      }
      for (const k of ["aria-label", "title"]) if (k in c.attrs) out.push(c.attrs[k]);
      visibleTexts(c, out);
    }
    return out;
  }

  test("HT-6：範本 section 同時有 hidden 與 inert 屬性、為 #customizer-custom 第 2 個子節點、仍含 3 個 data-template 按鈕（AC-43-01）", () => {
    const f = setup({ words: 2 });
    f.view.mount(null);
    f.view.show();
    assert.equal(f.host.childNodes.length, 3, "表單、範本、清單 3 區");
    const tpl = f.host.childNodes[1];
    assert.equal(tpl.tagName, "section");
    assert.equal(tpl.getAttribute("aria-labelledby"), "cv-tpl-title");
    assert.ok("hidden" in tpl.attrs, "hidden 屬性");
    assert.ok("inert" in tpl.attrs, "inert 屬性");
    const btns = findAll(tpl, "cv-templates__btn");
    assert.deepEqual(btns.map((b) => b.getAttribute("data-template")), ["cs", "business", "biostat"], "程式保留（HT-8）");
    // 表單與清單照常可見
    assert.ok(!("hidden" in f.host.childNodes[0].attrs));
    assert.ok(!("hidden" in f.host.childNodes[2].attrs));
    // 資料變動、顯示更多等路徑都不改回可見
    f.a.addCustomWord(F.customFields("Zymurgy", "釀造學"));
    f.view.hide();
    f.view.show();
    f.flushIdle();
    assert.ok("hidden" in tpl.attrs && "inert" in tpl.attrs);
  });

  test("HT-7：可見文字（含 aria-label、title；略過隱藏容器）不含「範本」——空清單與有範本單字兩種情況（AC-43-02）", () => {
    const empty = setup();
    empty.view.mount(null);
    empty.view.show();
    const t1 = visibleTexts(empty.host);
    assert.ok(t1.includes(v.EMPTY_TEXT), "空狀態可見");
    assert.deepEqual(t1.filter((t) => t.includes("範本")), []);
    // 隱藏容器內仍有原文（豁免、程式保留）
    assert.ok(find(empty.host, "cv-section__title") && empty.host.childNodes[1].textContent.includes("領域範本"));

    const f = setup();
    f.a.injectTemplate("cs");
    f.view.mount(null);
    f.view.show();
    f.flushIdle();
    assert.equal(f.words().length, 10);
    assert.deepEqual(visibleTexts(f.host).filter((t) => t.includes("範本")), []);
  });

  test("EMPTY_TEXT 逐字（DS-27）、不以「或」「、」「，」結尾；原始碼可見字串不含「注入領域範本」", () => {
    assert.equal(v.EMPTY_TEXT, "尚未新增自訂單字。可用上方表單新增。");
    assert.ok(v.EMPTY_TEXT.endsWith("。"));
    assert.ok(!/[或、，]$/.test(v.EMPTY_TEXT.slice(0, -1)));
    assert.ok(!/English Master Track/i.test(v.EMPTY_TEXT));
    const fs = require("node:fs");
    const path = require("node:path");
    const src = fs.readFileSync(path.join(__dirname, "..", "views", "custom-vocab.js"), "utf8");
    assert.ok(!src.includes("注入領域範本"));
    assert.ok(!src.includes("cv-item__source"), "不再建立來源標示（FB-51）");
    assert.ok(!src.includes('"範本：'), "不再組「範本：」字串");
  });

  test("HT-9／AC-43-03：10 個範本字 + 1 個表單字啟動 → 11 項皆只標「自訂擴充」；新增 latency → 單字已存在；刪除 1 個範本字；匯出欄位不變", () => {
    // 準備：v0.13 以前注入的 10 個資工字 + 表單新增 1 個字，寫入 localStorage；
    // （v0.15，FE-73）刻意改回 v0.14 的形狀（schemaVersion 2、data 9 欄）作為遷移輸入，驗證 HT-9 經 MG-5～MG-7 遷移後不變
    const prep = setup();
    assert.equal(prep.a.injectTemplate("cs").injected, 10);
    assert.ok(prep.a.addCustomWord(F.customFields("Zymurgy", "釀造學")).ok);
    const saved = Object.fromEntries(prep.storage.map);
    const KEY = "englishMasterTrack:state";
    const v2 = JSON.parse(saved[KEY]);
    v2.schemaVersion = 2;
    delete v2.data.flashcardPosition;
    delete v2.data.part5CorrectIds;
    delete v2.data.part5UnansweredOnly;
    saved[KEY] = JSON.stringify(v2);

    // 以該 localStorage 啟動：遷移後 3 欄為預設、customVocab 逐欄相同，主鍵寫回目前版本
    const f = setup({ storage: F.fakeStorage(saved) });
    const migrated = f.store.getState().data;
    assert.equal(migrated.flashcardPosition, null);
    assert.deepEqual(migrated.part5CorrectIds, []);
    assert.equal(migrated.part5UnansweredOnly, false);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(migrated.customVocab)), v2.data.customVocab);
    assert.equal(JSON.parse(f.storage.map.get(KEY)).schemaVersion, C.CURRENT_SCHEMA_VERSION);
    assert.deepStrictEqual(JSON.parse(f.storage.map.get(KEY)).data.customVocab, v2.data.customVocab);
    const before = JSON.parse(JSON.stringify(f.store.getState().data.customVocab));
    assert.equal(before.length, 11);
    assert.equal(before.filter((x) => x.origin === "template").length, 10);
    assert.ok(before.some((x) => x.word === "Latency") && before.some((x) => x.word === "Scalability"));
    f.view.mount(null);
    f.view.show();
    f.flushIdle();
    const items = findAll(f.host, "cv-item");
    assert.equal(items.length, 11);
    for (const li of items) {
      const badges = findAll(li, "cv-badge").map((n) => n.textContent);
      assert.deepEqual(badges, ["自訂擴充"]);
      assert.equal(find(li, "cv-item__source"), null);
      assert.ok(!li.textContent.includes("範本"));
    }

    // 以表單新增 latency → 欄位錯誤「單字已存在」，清單不變
    const word = find(f.host, "cv-form__field--word").childNodes[1];
    const meaning = find(f.host, "cv-form__field--meaning").childNodes[1];
    word.value = "latency"; meaning.value = "延遲";
    find(f.host, "cv-form").dispatch("submit");
    assert.equal(find(f.host, "cv-form__field--word").childNodes[2].textContent, "單字已存在");
    assert.equal(f.store.getState().data.customVocab.length, 11);

    // 刪除 1 個範本字（Latency）→ 10 項，其餘物件逐欄相同
    const idx = f.words().indexOf("Latency");
    assert.ok(idx >= 0);
    findAll(f.host, "cv-item__delete")[idx].click();
    f.flushIdle();
    const after = f.store.getState().data.customVocab;
    const expected = before.filter((x) => x.word !== "Latency");
    assert.equal(after.length, 10);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(after)), expected);
    assert.equal(findAll(f.host, "cv-item").length, 10);

    // 匯出：customVocab 與原值（去掉刪除者）相同，origin／templateId 保留
    const backup = JSON.parse(f.store.actions.exportBackup().json);
    assert.deepStrictEqual(backup.data.customVocab, expected);
    const tpl = backup.data.customVocab.filter((x) => x.origin === "template");
    assert.equal(tpl.length, 9);
    assert.ok(tpl.every((x) => x.templateId === "cs"));
  });
});
