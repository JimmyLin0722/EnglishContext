/*
 * phrasebank.test.js — 學術句型庫篩選與複製降級單元測試（FE-16 測試移入，FE-19）
 * 受測：views/phrasebank.js 匯出的純邏輯（buildIndex、normalizeKeyword、filterIndex、CATEGORIES、訊息常數）、
 *       services/clipboard.js（copy）
 * 依據：architecture.md v0.3 §7.6「句型搜尋」（不做 debounce）、「剪貼簿」（只用 navigator.clipboard.writeText，
 *       失敗不退回 execCommand）
 * 涵蓋：AC-15-01、AC-15-02、AC-16-01～AC-16-04、C-6、C-7
 * 資料：一律使用 _fixtures.js（不讀正式內容資料檔）；句型筆數（100 則、4 類各 25）屬 validate.mjs 的範圍
 */
"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const L = require("../views/phrasebank.js");
const CB = require("../services/clipboard.js");
const F = require("./_fixtures.js");

describe("phrasebank.test.js", () => {
  const DATA = F.phrasebank();
  /** 與 §7.6 定義相同的比對基準（template + "\n" + descriptionZh，小寫） */
  const hay = (p) => (p.template + "\n" + p.descriptionZh).toLowerCase();

  test("fixture 全部可建索引；4 類分類篩選與「全部」（AC-15-01、AC-15-02）", () => {
    const idx = L.buildIndex(DATA);
    assert.equal(idx.length, DATA.length);
    assert.deepEqual(L.CATEGORIES, ["gap", "aim", "findings", "limitations"]);
    for (const c of L.CATEGORIES) {
      const r = L.filterIndex(idx, c, "");
      assert.equal(r.length, DATA.filter((p) => p.category === c).length, c);
      assert.ok(r.length > 0, c);
      assert.ok(r.every((e) => e.category === c), c);
    }
    assert.equal(L.filterIndex(idx, "all", "").length, DATA.length);
    // 篩選維持原順序
    assert.deepEqual(L.filterIndex(idx, "all", "").map((e) => e.phrase.id), DATA.map((p) => p.id));
  });

  test("關鍵字 gap 不分大小寫、與分類同時成立（AC-16-01）", () => {
    const idx = L.buildIndex(DATA);
    const expected = DATA.filter((p) => hay(p).includes("gap")).length;
    assert.equal(expected, 3, "fixture 前提：template 或說明含 gap 的有 3 則");
    for (const kw of ["gap", "GAP", " Gap "]) {
      const r = L.filterIndex(idx, "all", kw);
      assert.equal(r.length, expected, kw);
      for (const e of r) assert.ok(hay(e.phrase).includes("gap"), kw);
    }
    const g = L.filterIndex(idx, "aim", "gap");
    assert.ok(g.every((e) => e.category === "aim"));
    assert.equal(g.length, DATA.filter((p) => p.category === "aim" && hay(p).includes("gap")).length);
    assert.deepEqual(g.map((e) => e.phrase.id), ["ph-003"]);
  });

  test("中文說明可搜尋；exampleEn 不列入搜尋（AC-16-01）", () => {
    const idx = L.buildIndex([{ id: "ph-001", category: "gap", template: "A [x].", descriptionZh: "研究空白", exampleEn: "zebra", source: "ORIGINAL" }]);
    assert.equal(L.filterIndex(idx, "all", "研究").length, 1);
    assert.equal(L.filterIndex(idx, "all", "zebra").length, 0);
    assert.equal(L.filterIndex(idx, "all", "qqqqzz").length, 0);
    // fixture 中 ph-008 只有 exampleEn 含 gap，不應被找到
    assert.ok(!L.filterIndex(L.buildIndex(DATA), "all", "gap").some((e) => e.phrase.id === "ph-008"));
  });

  test("容錯：非陣列、非物件、缺欄位、未知分類（C-6）", () => {
    assert.deepEqual(L.buildIndex(undefined), []);
    assert.deepEqual(L.buildIndex(null), []);
    assert.equal(L.buildIndex([null, 1, {}, { category: "x", template: "a" }, { category: "gap", template: "" }, { category: "gap", template: "ok" }]).length, 1);
    assert.deepEqual(L.filterIndex(null, "all", ""), []);
    assert.equal(L.normalizeKeyword(undefined), "");
  });

  test("畫面訊息逐字（AC-16-02～AC-16-04）", () => {
    assert.equal(L.MSG_NO_RESULT, "找不到符合的句型");
    assert.equal(L.MSG_COPIED, "已複製");
    assert.equal(L.MSG_COPY_FAILED, "複製失敗，請手動選取");
  });

  test("clipboard.copy：成功寫入 template 原文（AC-16-03）", async () => {
    let got;
    const nav = { clipboard: { writeText: (t) => { got = t; return Promise.resolve(); } } };
    const t = DATA[0].template;
    assert.equal(await CB.copy(t, nav), true);
    assert.equal(got, t);
  });

  test("clipboard.copy：不存在／拒絕／拋例外 → false，不拋未處理例外（AC-16-04）", async () => {
    assert.equal(await CB.copy("a", undefined), false);
    assert.equal(await CB.copy("a", {}), false);
    assert.equal(await CB.copy("a", { clipboard: undefined }), false);
    assert.equal(await CB.copy("a", { clipboard: { writeText: () => Promise.reject(new Error("denied")) } }), false);
    assert.equal(await CB.copy("a", { clipboard: { writeText: () => { throw new Error("x"); } } }), false);
    assert.equal(await CB.copy("a", { get clipboard() { throw new Error("y"); } }), false);
  });

  test("搜尋無 setTimeout／debounce；無 innerHTML、execCommand（§7.6、C-7）", () => {
    const dir = path.join(__dirname, "..");
    const src = fs.readFileSync(path.join(dir, "views", "phrasebank.js"), "utf8") +
      fs.readFileSync(path.join(dir, "services", "clipboard.js"), "utf8");
    // BUG-002：計時器只允許出現在分批建立的 scheduleIdle／cancelIdle（閒置補卡片的備援），搜尋與篩選路徑不得使用
    const withoutIdle = src
      .replace(/function scheduleIdle\(fn\) \{[\s\S]*?\n  \}\n/, "")
      .replace(/function cancelIdle\(h\) \{[\s\S]*?\n  \}\n/, "");
    assert.notEqual(withoutIdle, src, "應找得到 scheduleIdle");
    assert.ok(!/setTimeout|clearTimeout|debounce|requestAnimationFrame/.test(withoutIdle));
    assert.ok(!/innerHTML|outerHTML|insertAdjacentHTML|document\.write|execCommand/.test(src));
  });
});

// ── BUG-002 回歸：分批建立句型卡片（AC-22-01），篩選／搜尋結果須與一次建好相同（AC-15-02、AC-16-01、AC-16-02） ──

describe("phrasebank.test.js：分批建立（BUG-002）", () => {
  const vm = require("node:vm");
  const APP = path.join(__dirname, "..");

  test("countMatches 與 filterIndex 筆數相同；isDefaultFilter", () => {
    const idx = L.buildIndex(F.phrasebank());
    for (const c of L.FILTERS) for (const k of ["", "gap", " GAP ", "研究", "zzz"]) {
      assert.equal(L.countMatches(idx, c, k), L.filterIndex(idx, c, k).length, c + "/" + k);
    }
    assert.equal(L.countMatches(null, "all", ""), 0);
    assert.equal(L.isDefaultFilter("all", ""), true);
    assert.equal(L.isDefaultFilter("all", "   "), true);
    assert.equal(L.isDefaultFilter("bogus", ""), true);
    assert.equal(L.isDefaultFilter("gap", ""), false);
    assert.equal(L.isDefaultFilter("all", "g"), false);
  });

  // ── 最小假 DOM（只實作本頁與 core/dom.js 用到的 API） ──
  function makeDoc() {
    function node(tag, type) {
      return {
        nodeType: type, tagName: tag, children: [], attrs: {}, listeners: {}, hidden: false, value: "", className: "",
        _text: "", parent: null, style: {}, classes: new Set(),
        get classList() { const self = this; return { add: (c) => self.classes.add(c), contains: (c) => self.classes.has(c) }; },
        /** 模擬排版：自己與所有祖先都未隱藏、且接在頁面根節點下才有高度 */
        get offsetHeight() { let n = this; while (n) { if (n.hidden) return 0; if (n.isRoot) return 120; n = n.parent; } return 0; },
        get textContent() { return this.children.length ? this.children.map((c) => c.textContent).join("") : this._text; },
        set textContent(v) { this.children = []; this._text = String(v); },
        get firstChild() { return this.children[0] || null; },
        setAttribute(k, v) { this.attrs[k] = String(v); },
        getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; },
        addEventListener(t, fn) { (this.listeners[t] = this.listeners[t] || []).push(fn); },
        appendChild(c) {
          if (c.nodeType === 11) { for (const k of c.children) { k.parent = this; this.children.push(k); } c.children = []; } else { c.parent = this; this.children.push(c); }
          return c;
        },
        insertBefore(c, ref) {
          if (ref === null || ref === undefined) return this.appendChild(c);
          const at = this.children.indexOf(ref);
          if (at < 0) throw new Error("insertBefore：參考節點不在此父節點下");
          const add = c.nodeType === 11 ? c.children.splice(0) : [c];
          for (const k of add) k.parent = this;
          this.children.splice(at, 0, ...add);
          return c;
        },
        removeChild(c) { this.children.splice(this.children.indexOf(c), 1); return c; },
        fire(t) { for (const fn of this.listeners[t] || []) fn({ type: t }); }
      };
    }
    return {
      createElement: (t) => node(t, 1),
      createDocumentFragment: () => node("#fragment", 11),
      createTextNode: (s) => { const n = node("#text", 3); n._text = s; return n; }
    };
  }
  function find(n, pred, out = []) {
    if (pred(n)) out.push(n);
    for (const c of n.children || []) find(c, pred, out);
    return out;
  }

  /** 以瀏覽器模式載入 dom.js 與 phrasebank.js；閒置佇列由測試手動執行 */
  function loadView(phrases, { idle = true } = {}) {
    const doc = makeDoc();
    const idleQ = [];
    const timers = [];
    let view = null;
    const ctx = { document: doc, console };
    ctx.self = ctx;
    if (idle) {
      ctx.requestIdleCallback = (fn) => { idleQ.push(fn); return idleQ.length; };
      ctx.cancelIdleCallback = (id) => { idleQ[id - 1] = null; };
    }
    ctx.setTimeout = (fn) => { timers.push(fn); return timers.length; };
    ctx.clearTimeout = (id) => { timers[id - 1] = null; };
    vm.createContext(ctx);
    vm.runInContext(fs.readFileSync(path.join(APP, "core", "dom.js"), "utf8"), ctx);
    ctx.EMT.views = { register: (id, mod) => { if (id === "phrasebank") view = mod; } };
    ctx.EMT.content = { phrases };
    vm.runInContext(fs.readFileSync(path.join(APP, "views", "phrasebank.js"), "utf8"), ctx);
    const rootEl = doc.createElement("section");
    rootEl.isRoot = true;
    view.mount(rootEl);
    view.show();
    const q = idle ? idleQ : timers;
    const api = {
      rootEl,
      list: () => find(rootEl, (n) => n.tagName === "ul")[0],
      items: () => api.list().children,
      visibleIds: () => api.items().filter((n) => !n.hidden).map((n) => n.attrs["data-id"]),
      count: () => find(rootEl, (n) => n.className === "pb-count")[0].textContent,
      empty: () => find(rootEl, (n) => n.className === "pb-empty")[0],
      input: () => find(rootEl, (n) => n.tagName === "input")[0],
      button: (c) => find(rootEl, (n) => n.tagName === "button" && n.attrs["data-category"] === c)[0],
      search: (kw) => { const i = api.input(); i.value = kw; i.fire("input"); },
      pending: () => q.filter(Boolean).length,
      view,
      /** 已啟用 content-visibility 的節點 id */
      cvIds: () => api.items().filter((n) => n.classes.has("pb-item--cv")).map((n) => n.attrs["data-id"]),
      /** 執行一個閒置工作（deadline 給足時間） */
      step: () => {
        const i = q.findIndex(Boolean);
        if (i < 0) return false;
        const fn = q[i];
        q[i] = null;
        fn({ timeRemaining: () => 50, didTimeout: false });
        return true;
      },
      drain: () => { let n = 0; while (api.step()) if (++n > 1000) throw new Error("閒置迴圈未結束"); }
    };
    return api;
  }

  /** 產生 n 則合法句型（依 fixture 循環，id 唯一） */
  function bigData(n) {
    const base = F.phrasebank();
    return Array.from({ length: n }, (_, i) => Object.assign({}, base[i % base.length], { id: "ph-" + String(i + 1).padStart(3, "0") }));
  }
  const expectIds = (data, c, k) => L.filterIndex(L.buildIndex(data), c, k).map((e) => e.phrase.id);

  test("mount 只同步建立首屏，筆數以完整資料顯示；閒置補齊後順序與資料相同", () => {
    const data = bigData(100);
    const v = loadView(data);
    assert.equal(v.items().length, L.FIRST_BATCH);
    assert.equal(v.count(), "顯示 100 則，共 100 則");
    assert.equal(v.empty().hidden, true);
    assert.ok(v.pending() > 0);
    v.step();
    assert.ok(v.items().length > L.FIRST_BATCH && v.items().length <= L.FIRST_BATCH + L.IDLE_BATCH);
    v.drain();
    assert.equal(v.items().length, 100);
    assert.deepEqual(v.items().map((n) => n.attrs["data-id"]), data.map((p) => p.id));
    assert.deepEqual(v.visibleIds(), data.map((p) => p.id));
    assert.equal(v.pending(), 0);
    // 全部節點都已排版過，皆啟用 content-visibility，並寫入實測高度
    assert.deepEqual(v.cvIds(), data.map((p) => p.id));
    assert.ok(v.items().every((n) => n.style.containIntrinsicSize === "auto 120px"));
  });

  test("補齊前搜尋／切分類：同步建立符合的節點，結果與一次建好相同（AC-16-01、AC-15-02）", () => {
    const data = bigData(100);
    const v = loadView(data);
    v.search("GAP");
    assert.deepEqual(v.visibleIds(), expectIds(data, "all", "gap"));
    assert.equal(v.count(), "顯示 " + expectIds(data, "all", "gap").length + " 則，共 100 則");
    v.drain();
    assert.equal(v.pending(), 0, "處理完後不應留下閒置工作");
    // 顯示中的節點皆已啟用 content-visibility；首屏中被篩掉的節點尚未實測，維持原狀
    const cv = v.cvIds();
    assert.ok(expectIds(data, "all", "gap").every((id) => cv.includes(id)));
    const firstHidden = data.slice(0, L.FIRST_BATCH).map((p) => p.id).filter((id) => !expectIds(data, "all", "gap").includes(id));
    assert.ok(firstHidden.length > 0 && firstHidden.every((id) => !cv.includes(id)));
    assert.deepEqual(v.visibleIds(), expectIds(data, "all", "gap"));

    const v2 = loadView(data);
    v2.step();
    v2.button("aim").fire("click");
    assert.deepEqual(v2.visibleIds(), expectIds(data, "aim", ""));
    assert.equal(v2.button("aim").attrs["aria-pressed"], "true");
    v2.drain();
    assert.deepEqual(v2.items().map((n) => n.attrs["data-id"]), data.map((p) => p.id));
    assert.deepEqual(v2.visibleIds(), expectIds(data, "aim", ""));
  });

  // ── BUG-002 第 2 輪：補齊完成前的第一次按鍵不得同步建立全部剩餘節點 ──

  test("missingMatches：只列出符合且未建立的位置（遞增）", () => {
    const idx = L.buildIndex(bigData(30));
    const built = idx.map((_, i) => i < 5);
    const r = L.missingMatches(idx, built, "all", "gap");
    const all = L.filterIndex(idx, "all", "gap").map((e) => idx.indexOf(e));
    assert.deepEqual(r, all.filter((i) => i >= 5));
    assert.deepEqual(L.missingMatches(idx, null, "aim", ""), L.filterIndex(idx, "aim", "").map((e) => idx.indexOf(e)));
    assert.deepEqual(L.missingMatches(idx, idx.map(() => true), "all", ""), []);
    assert.deepEqual(L.missingMatches(null, [], "all", ""), []);
  });

  test("補齊前輸入關鍵字：只建立符合的節點，可見結果等於 filterIndex，DOM 順序依原始索引", () => {
    const data = bigData(100);
    const v = loadView(data);
    const firstIds = data.slice(0, L.FIRST_BATCH).map((p) => p.id);
    for (const kw of ["g", "gap", "研究"]) {
      const w = loadView(data);
      w.search(kw);
      const exp = expectIds(data, "all", kw);
      const extra = exp.filter((id) => !firstIds.includes(id));
      // 已建立 = 首屏 + 符合條件的其餘節點；沒有多建
      assert.equal(w.items().length, L.FIRST_BATCH + extra.length, kw);
      assert.deepEqual(w.visibleIds(), exp, kw);
      // DOM 順序與資料順序一致（子序列）
      const order = w.items().map((n) => data.findIndex((p) => p.id === n.attrs["data-id"]));
      assert.deepEqual(order, order.slice().sort((a, b) => a - b), kw);
      assert.equal(w.count(), "顯示 " + exp.length + " 則，共 100 則", kw);
    }
    // 補齊完成後順序與資料完全相同、可見結果仍等於 filterIndex
    v.search("gap");
    const n1 = v.items().length;
    assert.ok(n1 < 100);
    v.drain();
    assert.equal(v.items().length, 100);
    assert.deepEqual(v.items().map((n) => n.attrs["data-id"]), data.map((p) => p.id));
    assert.deepEqual(v.visibleIds(), expectIds(data, "all", "gap"));
    assert.equal(new Set(v.items()).size, 100, "不得重複建立節點");
  });

  test("首屏之後建立的節點（同步或閒置）建立時即啟用 content-visibility，估計高度取實測平均；首屏以實測高度啟用", () => {
    const data = bigData(100);
    // 尚無實測高度：用預設 220px（與 60-phrasebank.css 相同）
    const v = loadView(data);
    v.search("gap");
    const firstIds = data.slice(0, L.FIRST_BATCH).map((p) => p.id);
    const syncIds = expectIds(data, "all", "gap").filter((id) => !firstIds.includes(id));
    assert.ok(syncIds.length > 0, "fixture 前提：首屏之後仍有符合 gap 的句型");
    const byId = (id) => v.items().find((n) => n.attrs["data-id"] === id);
    for (const id of syncIds) {
      assert.ok(byId(id).classes.has("pb-item--cv"), id);
      assert.equal(byId(id).style.containIntrinsicSize, "auto 220px", id);
    }
    // 首屏節點尚未實測，不啟用
    assert.ok(firstIds.every((id) => !byId(id).classes.has("pb-item--cv")));
    v.drain();
    // 首屏可見節點以實測高度啟用（假 DOM 120px）；同步建立的維持當時的估計值（瀏覽器以 auto 記住實際高度）
    assert.ok(firstIds.filter((id) => !byId(id).hidden).every((id) => byId(id).style.containIntrinsicSize === "auto 120px"));
    assert.ok(syncIds.every((id) => byId(id).style.containIntrinsicSize === "auto 220px"));
    // 閒置補上的節點（含當下被篩掉的）建立時即啟用，估計值 = 首屏實測平均
    const idleIds = data.map((p) => p.id).filter((id) => !firstIds.includes(id) && !syncIds.includes(id));
    assert.ok(idleIds.every((id) => byId(id).classes.has("pb-item--cv") && byId(id).style.containIntrinsicSize === "auto 120px"));
    v.search("");
    v.drain();
    assert.deepEqual(v.cvIds(), data.map((p) => p.id));

    // 已有實測值：估計值改用實測平均
    const w = loadView(data);
    w.step(); // 首屏實測（假 DOM 120px）並補一批
    w.search("研究");
    const est = w.items().filter((n) => n.classes.has("pb-item--cv")).map((n) => n.style.containIntrinsicSize);
    assert.ok(est.length > 0 && est.every((s) => s === "auto 120px"), est.join(","));
  });

  test("部分補齊中再改條件：每次只補缺少的符合節點，閒置補上的節點依當時條件決定 hidden", () => {
    const data = bigData(80);
    const v = loadView(data);
    v.step(); // 首屏 + 一批
    v.search("gap");
    v.button("findings").fire("click");
    assert.deepEqual(v.visibleIds(), expectIds(data, "findings", "gap"));
    v.search("");
    assert.deepEqual(v.visibleIds(), expectIds(data, "findings", ""));
    v.step();
    v.button("all").fire("click");
    v.search("研究");
    assert.deepEqual(v.visibleIds(), expectIds(data, "all", "研究"));
    v.drain();
    assert.deepEqual(v.items().map((n) => n.attrs["data-id"]), data.map((p) => p.id));
    assert.deepEqual(v.visibleIds(), expectIds(data, "all", "研究"));
    v.search("");
    assert.deepEqual(v.visibleIds(), data.map((p) => p.id));
  });

  test("篩選與補齊交錯：每一步可見項目都等於 filterIndex 結果中已建立的部分", () => {
    const data = bigData(60);
    const v = loadView(data);
    const seq = [["all", "g"], ["all", ""], ["gap", ""], ["all", ""], ["all", "zzz"], ["all", ""], ["findings", "研究"]];
    v.step();
    for (const [c, k] of seq) {
      v.button(c).fire("click");
      v.search(k);
      const exp = expectIds(data, c, k);
      const built = v.items().map((n) => n.attrs["data-id"]);
      assert.deepEqual(v.visibleIds(), exp.filter((id) => built.includes(id)), c + "/" + k);
      assert.equal(v.count(), "顯示 " + exp.length + " 則，共 60 則", c + "/" + k);
      assert.equal(v.empty().hidden, exp.length !== 0);
      v.step();
    }
    v.drain();
    assert.deepEqual(v.visibleIds(), expectIds(data, "findings", "研究"));
    // 回到預設條件後，全部可見
    v.button("all").fire("click");
    v.search("");
    assert.deepEqual(v.visibleIds(), data.map((p) => p.id));
  });

  test("補齊中回到預設條件：後補的節點依目前條件顯示", () => {
    const data = bigData(40);
    const v = loadView(data);
    v.search("zzz");
    assert.equal(v.empty().hidden, false);
    assert.equal(v.empty().textContent, L.MSG_NO_RESULT);
    v.search("");
    v.drain();
    assert.deepEqual(v.visibleIds(), data.map((p) => p.id));
    assert.equal(v.count(), "顯示 40 則，共 40 則");
  });

  test("預設條件下補齊前，後補節點依原順序附加且可見（未建立部分不影響筆數）", () => {
    const data = bigData(30);
    const v = loadView(data);
    v.search("");
    v.button("all").fire("click");
    assert.equal(v.items().length, L.FIRST_BATCH, "預設條件不應強制補齊");
    v.drain();
    assert.deepEqual(v.visibleIds(), data.map((p) => p.id));
  });

  test("無 requestIdleCallback 時以計時器備援補齊；資料為空或少於首批時不排程", () => {
    const data = bigData(30);
    const v = loadView(data, { idle: false });
    assert.equal(v.items().length, L.FIRST_BATCH);
    v.drain();
    assert.deepEqual(v.items().map((n) => n.attrs["data-id"]), data.map((p) => p.id));

    const e = loadView([]);
    assert.equal(e.items().length, 0);
    assert.equal(e.pending(), 0);
    assert.equal(e.empty().hidden, false);
    assert.equal(e.empty().textContent, "目前沒有句型資料");
    assert.equal(e.count(), "顯示 0 則，共 0 則");

    const s = loadView(F.phrasebank());
    assert.equal(s.items().length, F.phrasebank().length);
    s.drain();
    assert.equal(s.pending(), 0);
    assert.equal(s.cvIds().length, F.phrasebank().length);
  });

  test("離開本頁暫停分批、回來繼續；隱藏中的節點不啟用 content-visibility", () => {
    const data = bigData(50);
    const v = loadView(data);
    v.step();
    const built = v.items().length;
    v.view.hide();
    v.rootEl.hidden = true;
    assert.equal(v.pending(), 0, "hide 應取消閒置工作");
    v.drain();
    assert.equal(v.items().length, built, "隱藏時不建立節點");
    v.rootEl.hidden = false;
    v.view.show();
    v.drain();
    assert.equal(v.items().length, 50);
    assert.deepEqual(v.cvIds(), data.map((p) => p.id));
    assert.deepEqual(v.visibleIds(), data.map((p) => p.id));
  });

  test("節點沒有版面時不空轉：本輪無進展即停止排程", () => {
    const data = bigData(20);
    const v = loadView(data);
    v.drain();
    v.button("gap").fire("click");
    v.drain();
    v.list().hidden = true; // 模擬清單無版面
    v.button("all").fire("click");
    v.list().hidden = true;
    let n = 0;
    while (v.step()) assert.ok(++n < 5, "不應無限排程");
  });
});
