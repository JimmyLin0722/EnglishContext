/*
 * site-pages.test.js — 應用內三頁與共用返回按鈕（FE-87）
 * 受測：views/site-pages.js、ui/site-return.js；與真實 ui/router.js、state/store.js 整合驗證返回與不寫入
 * 依據：architecture.md v0.14 §4.12、§7.25.5、§7.25.6、§10.11；契約 README §13.3 SP-3～SP-5、SP-7、§13.4 SC-2～SC-4、§13.6 ML-1、ML-2、
 *       §13.7 V-SITE-01、V-SITE-02、V-SITE-05、V-MAIL-02
 * 涵蓋：AC-53-01～AC-53-03、AC-54-01、AC-55-01～AC-55-03、AC-56-04、AC-57-01～AC-57-03、AC-25-07
 * 做法：以 node:vm 依建置方式（無 module、require）載入，配最小假 DOM；信箱行、標題等期望值逐字寫在本檔，不從被測模組取值。
 */
"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const F = require("./_fixtures.js");
const SITE = require("../core/site-content.js");
const C = require("../core/constants.js");

const APP = path.join(__dirname, "..");
/** 契約 ML-1 逐字 */
const CONTACT = "email: d o n c l y d e 0 7 2 2 @ g m a i l . c o m";

/** 最小假 DOM：只支援 core/dom.js 與受測模組用到的介面 */
function fakeDocument() {
  function node(tag) {
    return {
      nodeType: tag === "#text" ? 3 : 1,
      tagName: tag.toUpperCase(),
      className: "",
      attrs: {},
      childNodes: [],
      parentNode: null,
      listeners: {},
      focusCalls: [],
      _text: "",
      setAttribute(k, v) { this.attrs[k] = String(v); },
      getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
      addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); },
      appendChild(c) { this.childNodes.push(c); c.parentNode = this; return c; },
      removeChild(c) { this.childNodes.splice(this.childNodes.indexOf(c), 1); return c; },
      focus(opts) { this.focusCalls.push(opts); },
      get firstChild() { return this.childNodes[0] || null; },
      get textContent() { return this.nodeType === 3 ? this._text : this._text + this.childNodes.map((c) => c.textContent).join(""); },
      set textContent(v) { this.childNodes = []; this._text = String(v); }
    };
  }
  return {
    createElement: (t) => node(t),
    createTextNode: (t) => { const n = node("#text"); n._text = t; return n; },
    createElementNS: (ns, t) => node(t)
  };
}

/** 深度走訪元素 */
function findAll(n, pred, out = []) {
  if (n.nodeType === 1 && pred(n)) out.push(n);
  for (const c of n.childNodes) findAll(c, pred, out);
  return out;
}

/** 依標籤名找元素 */
const byTag = (n, ...tags) => findAll(n, (e) => tags.includes(e.tagName));

/** 內容區根元素 */
function contentOf(rootEl) {
  const list = findAll(rootEl, (e) => e.getAttribute("data-site-page-content") !== null);
  assert.equal(list.length, 1, "每頁恰 1 個內容區");
  return list[0];
}

/** SC-4：依序取 h2、h3、p、li 的文字，空白正規化後以換行連接（li 內的 p 不存在，不會重複） */
function sc4Text(contentEl) {
  return byTag(contentEl, "H2", "H3", "P", "LI")
    .map((e) => e.textContent.replace(/\s+/g, " ").trim())
    .join("\n");
}

/** 由 SITE_PAGES 資料算出 SC-4 期望序列 */
function expectedSequence(page) {
  const inlineText = (inlines) => inlines.map((i) => i.text).join("");
  const out = [page.title];
  for (const b of page.blocks) {
    if (b.kind === "heading") out.push(b.text);
    else if (b.kind === "paragraph") out.push(inlineText(b.inlines));
    else if (b.kind === "list") b.items.forEach((item) => out.push(inlineText(item)));
    else if (b.kind === "contactLine") out.push(CONTACT);
    else assert.fail("未知的 block：" + b.kind);
  }
  return out.map((s) => s.replace(/\s+/g, " ").trim()).join("\n");
}

/** 建立沙箱並依建置順序載入指定模組；views.register 登錄結果放在 registered */
function loadSandbox(extra) {
  const sandbox = { console: { warn() {}, error() {}, log() {} } };
  sandbox.self = sandbox;
  vm.createContext(sandbox);
  const registered = {};
  const files = ["core/constants.js", "core/dom.js", "core/site-content.js", "ui/site-return.js"];
  for (const rel of files) vm.runInContext(fs.readFileSync(path.join(APP, rel), "utf8"), sandbox, { filename: rel });
  sandbox.EMT.views = { register(id, mod) { registered[id] = mod; } };
  vm.runInContext(fs.readFileSync(path.join(APP, "views/site-pages.js"), "utf8"), sandbox, { filename: "views/site-pages.js" });
  const doc = fakeDocument();
  sandbox.EMT.core.dom.setDocument(doc);
  sandbox.EMT.router = Object.assign({ returnTarget: () => "dashboard", back() { return true; } }, extra);
  return { sandbox, registered, doc };
}

/** 掛載並顯示一頁 */
function open(id, extra) {
  const ctx = loadSandbox(extra);
  const rootEl = ctx.doc.createElement("section");
  ctx.registered[id].mount(rootEl);
  ctx.registered[id].show();
  return Object.assign(ctx, { rootEl });
}

describe("site-pages.test.js", () => {
  test("登錄 about、contact、privacy 三頁，模組皆有 mount、show；載入時不取用其他模組（LD-2）", () => {
    const { registered } = loadSandbox();
    assert.deepEqual(Object.keys(registered), ["about", "contact", "privacy"]);
    for (const m of Object.values(registered)) {
      assert.equal(typeof m.mount, "function");
      assert.equal(typeof m.show, "function");
    }
    const sandbox = {};
    sandbox.self = sandbox;
    const reads = [];
    sandbox.EMT = {
      core: new Proxy({}, { get(t, k) { reads.push("core." + String(k)); return t[k]; } }),
      ui: new Proxy({}, { get(t, k) { reads.push("ui." + String(k)); return t[k]; } }),
      views: {}
    };
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(path.join(APP, "views/site-pages.js"), "utf8"), sandbox);
    vm.runInContext(fs.readFileSync(path.join(APP, "ui/site-return.js"), "utf8"), sandbox);
    assert.deepEqual(reads, []);
  });

  for (const id of ["about", "contact", "privacy"]) {
    test(id + "：恰 1 個內容區，文字序列等於 SITE_PAGES（SC-4、AC-57-03）；標題層級 h2 → h3，無 h1（SP-7）", () => {
      const { rootEl } = open(id);
      const page = SITE.SITE_PAGES.find((p) => p.id === id);
      const content = contentOf(rootEl);
      assert.equal(content.getAttribute("data-site-page-content"), id);
      assert.equal(sc4Text(content), expectedSequence(page));
      const h2 = byTag(rootEl, "H2");
      assert.equal(h2.length, 1);
      assert.equal(h2[0].textContent, page.title);
      assert.equal(h2[0].className, "site-page__title");
      assert.equal(h2[0].getAttribute("tabindex"), "-1");
      assert.equal(byTag(rootEl, "H1").length, 0);
      const headings = page.blocks.filter((b) => b.kind === "heading").map((b) => b.text);
      assert.deepEqual(byTag(rootEl, "H3").map((e) => e.textContent), headings);
      for (const h of byTag(rootEl, "H3")) assert.equal(h.className, "site-page__heading");
    });

    test(id + "：返回按鈕在內容區之外且為第一個元素（SP-3、§7.25.6）", () => {
      const { rootEl } = open(id);
      const wrap = rootEl.childNodes[0];
      assert.equal(wrap.className, "site-page");
      assert.equal(wrap.childNodes.length, 2);
      const [btn, content] = wrap.childNodes;
      assert.equal(btn.tagName, "BUTTON");
      assert.equal(btn.className, "btn btn--link site-return");
      assert.equal(btn.getAttribute("type"), "button");
      assert.equal(content.className, "site-page__content");
      assert.equal(findAll(content, (e) => e.className.includes("site-return")).length, 0);
    });

    test(id + "：show 把焦點移到 h2 且不捲動；重複 show 不重建 DOM（mount 建 1 次）", () => {
      const { rootEl, registered } = open(id);
      const h2 = byTag(rootEl, "H2")[0];
      assert.equal(h2.focusCalls.length, 1);
      assert.equal(h2.focusCalls[0].preventScroll, true);
      registered[id].show();
      assert.equal(byTag(rootEl, "H2")[0], h2);
      assert.equal(h2.focusCalls.length, 2);
    });

    test(id + "：無表單元件與提交按鈕（AC-55-03）", () => {
      const { rootEl } = open(id);
      assert.equal(byTag(rootEl, "FORM", "INPUT", "TEXTAREA", "SELECT").length, 0);
      for (const b of byTag(rootEl, "BUTTON")) assert.notEqual(b.getAttribute("type"), "submit");
    });
  }

  test("聯絡我們：內容區恰為標題與 1 行信箱，無其他文字（AC-55-01、Q-91 決議 B）", () => {
    const { rootEl } = open("contact");
    const content = contentOf(rootEl);
    assert.deepEqual(content.childNodes.map((c) => c.tagName), ["H2", "P"]);
    assert.equal(content.childNodes[0].textContent, "聯絡我們");
    assert.equal(content.childNodes[1].textContent, CONTACT);
    assert.equal(content.textContent, "聯絡我們" + CONTACT);
    // 內容區外只有返回按鈕，沒有說明句或提示
    assert.equal(rootEl.childNodes.length, 1);
    assert.equal(rootEl.childNodes[0].childNodes.length, 2);
  });

  for (const id of ["contact", "privacy"]) {
    test(id + "：信箱行為純文字 p，逐字同 ML-1；非連結，無 tabindex、title、aria-label、事件（SC-3、ML-2、AC-55-02）", () => {
      const { rootEl } = open(id);
      const lines = findAll(rootEl, (e) => e.className === "site-page__contact");
      assert.equal(lines.length, 1);
      const p = lines[0];
      assert.equal(p.tagName, "P");
      assert.equal(p.textContent, CONTACT);
      assert.equal(p.childNodes.length, 0, "以 textContent 寫入");
      assert.deepEqual(Object.keys(p.attrs), []);
      assert.deepEqual(Object.keys(p.listeners), []);
      for (let n = p; n; n = n.parentNode) assert.notEqual(n.tagName, "A");
    });
  }

  test("關於我不顯示信箱；全部頁面沒有 mailto:（AC-23-07 (7)、V-MAIL-02）", () => {
    assert.equal(open("about").rootEl.textContent.includes(CONTACT), false);
    assert.equal(findAll(open("about").rootEl, (e) => e.className === "site-page__contact").length, 0);
    for (const id of ["about", "contact", "privacy"]) {
      const { rootEl } = open(id);
      for (const e of findAll(rootEl, () => true)) {
        assert.doesNotMatch(JSON.stringify(e.attrs), /mailto:/i);
      }
    }
  });

  test("隱私權政策：外部連結 target=_blank、rel=noopener，文字與網址取自 SITE_PAGES（SC-2、AC-53-03）", () => {
    const { rootEl } = open("privacy");
    const links = byTag(rootEl, "A");
    assert.equal(links.length, 1);
    const data = SITE.SITE_PAGES.find((p) => p.id === "privacy").blocks
      .filter((b) => b.kind === "paragraph").flatMap((b) => b.inlines).filter((i) => i.kind === "external");
    assert.equal(data.length, 1);
    assert.equal(links[0].textContent, data[0].text);
    assert.equal(links[0].getAttribute("href"), data[0].href);
    assert.equal(links[0].getAttribute("target"), "_blank");
    assert.equal(links[0].getAttribute("rel"), "noopener");
  });

  test("關於我：3 個頁面連結為 data-go 按鈕，目標 sources、privacy、contact（AC-54-01 (5)、SC-2）；非表單提交", () => {
    const { rootEl } = open("about");
    const links = findAll(rootEl, (e) => e.className === "btn--link site-page__link");
    assert.deepEqual(links.map((b) => [b.tagName, b.getAttribute("data-go"), b.getAttribute("type"), b.textContent]), [
      ["BUTTON", "sources", "button", "資料來源與授權"],
      ["BUTTON", "privacy", "button", "隱私權政策"],
      ["BUTTON", "contact", "button", "聯絡我們"]
    ]);
    // 切頁交給 router 的委派事件，連結本身不綁事件
    for (const b of links) assert.deepEqual(Object.keys(b.listeners), []);
  });

  test("不認識的區塊與行內類型：略過不拋例外；文案中的 HTML 字元僅為純文字（C-7）", () => {
    const { sandbox } = loadSandbox();
    const api = sandbox.EMT.views.sitePages;
    const dom = sandbox.EMT.core.dom;
    assert.equal(api.renderBlock(dom, { kind: "unknown" }, CONTACT), null);
    const p = api.renderBlock(dom, { kind: "paragraph", inlines: [{ kind: "text", text: "<b>x</b>" }, { kind: "unknown", text: "y" }] }, CONTACT);
    assert.equal(p.textContent, "<b>x</b>");
    assert.equal(byTag(p, "B").length, 0);
    assert.equal(api.findPage(null, "about"), null);
    assert.equal(api.findPage([null, { id: "about" }], "about").id, "about");
    assert.equal(api.findPage([{ id: "about" }], "nope"), null);
  });

  test("LD-3：缺少 core/site-content 或 ui/site-return 時，mount 丟出含模組名稱的錯誤", () => {
    for (const [missing, re] of [["core/site-content.js", /EMT\.core\.siteContent/], ["ui/site-return.js", /EMT\.ui\.siteReturn/], ["core/dom.js", /EMT\.core\.dom/]]) {
      const sandbox = { console: { warn() {}, error() {}, log() {} } };
      sandbox.self = sandbox;
      vm.createContext(sandbox);
      const registered = {};
      for (const rel of ["core/constants.js", "core/dom.js", "core/site-content.js", "ui/site-return.js"].filter((r) => r !== missing)) {
        vm.runInContext(fs.readFileSync(path.join(APP, rel), "utf8"), sandbox);
      }
      sandbox.EMT.views = { register(id, mod) { registered[id] = mod; } };
      vm.runInContext(fs.readFileSync(path.join(APP, "views/site-pages.js"), "utf8"), sandbox);
      assert.throws(() => registered.about.mount(fakeDocument().createElement("section")), re);
    }
  });

  test("原始碼：不存文案；無 mailto:、無網路或儲存 API（SC-1、SC-5、SC-6）", () => {
    for (const rel of ["views/site-pages.js", "ui/site-return.js"]) {
      const src = fs.readFileSync(path.join(APP, rel), "utf8");
      for (const bad of [/mailto:/i, /\bfetch\s*\(/, /XMLHttpRequest/, /localStorage/, /setItem/, /sendBeacon/, /\.inner[H]TML/, /\.outer[H]TML/, /insertAdjacent[H]TML/]) {
        assert.doesNotMatch(src, bad, rel);
      }
    }
    const src = fs.readFileSync(path.join(APP, "views/site-pages.js"), "utf8");
    assert.equal(src.includes(SITE.LEGAL_STATEMENTS.trademark), false);
    assert.equal(src.includes(CONTACT), false);
    assert.equal(src.includes("學習紀錄只存在你目前使用的瀏覽器"), false);
  });

  test("75-site-pages.css：不用強調橘；.site-page 限寬與可換行（§7.25.6、AC-38-01）", () => {
    const css = fs.readFileSync(path.join(APP, "styles/75-site-pages.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    assert.doesNotMatch(css, /--accent|#f7893b/i);
    const body = css.match(/\.site-page\s*\{([^{}]*)\}/)[1];
    assert.match(body, /max-width:\s*var\(--content-narrow\)/);
    assert.match(body, /overflow-wrap:\s*anywhere/);
    assert.match(css, /\.site-page a,\s*\.site-page__link\s*\{\s*color:\s*var\(--primary\)/);
    assert.match(css, /\.site-noscript\s*\{/);
  });

  describe("ui/site-return.js", () => {
    test("returnText：「返回」加 TAB_LABELS；4 個功能區與難易度設定逐字", () => {
      const R = require("../ui/site-return.js");
      assert.equal(R.returnText("dashboard", C.TAB_LABELS), "返回主控台");
      assert.equal(R.returnText("customizer", C.TAB_LABELS), "返回難易度設定");
      assert.equal(R.returnText("flashcards", C.TAB_LABELS), "返回單字卡");
      assert.equal(R.returnText("part5", C.TAB_LABELS), "返回模擬測驗");
      assert.equal(R.returnText("nope", C.TAB_LABELS), "返回");
      assert.equal(R.returnText("dashboard", null), "返回");
    });

    test("create 不綁定 router 以外的行為：點擊只呼叫 back；refresh 文字隨 returnTarget 改變；缺 router 丟出含模組名稱的錯誤", () => {
      let target = "part5";
      let backs = 0;
      const { sandbox } = loadSandbox({ returnTarget: () => target, back: () => { backs += 1; return true; } });
      const R = sandbox.EMT.ui.siteReturn;
      const btn = R.create(sandbox.EMT.core.dom);
      assert.equal(btn.textContent, "", "文字由 show 寫入，mount 時的返回目標尚未同步");
      R.refresh(btn);
      assert.equal(btn.textContent, "返回模擬測驗");
      target = "customizer";
      R.refresh(btn);
      assert.equal(btn.textContent, "返回難易度設定");
      btn.listeners.click[0]();
      assert.equal(backs, 1);
      assert.doesNotThrow(() => R.refresh(null));
      sandbox.EMT.router = undefined;
      assert.throws(() => R.refresh(btn), /EMT\.router/);
      assert.throws(() => btn.listeners.click[0](), /EMT\.router/);
    });
  });

  // ── 與真實 router、store 整合（§7.25.5 的返回表；SP-4、SP-5） ──
  describe("與真實 router、store 整合", () => {
    const SITE_TABS = ["about", "contact", "privacy", "sources"];

    /**
     * 載入真實 ui/router.js，配 _fixtures 的真實 store 與計數 storage。
     * store 由 Node 端建立，返回目標透過 EMT.store 交給 router。
     */
    function harness(opts) {
      const o = opts || {};
      const m = F.makeStore({ firstRun: o.firstRun });
      const before = new Map(m.storage.map);
      let setItems = 0;
      const origSet = m.storage.setItem;
      m.storage.setItem = function () { setItems += 1; return origSet.apply(this, arguments); };

      const doc = fakeDocument();
      const sections = {};
      for (const id of C.NAV_TAB_ORDER.concat(["customizer", "dashboard"], SITE_TABS)) {
        const s = doc.createElement("section");
        s.hidden = true;
        sections["view-" + id] = s;
      }
      const documentStub = {
        body: { dataset: { entry: o.firstRun ? "firstRun" : "main" } },
        getElementById: (id) => sections[id] || null,
        addEventListener() {}
      };
      const sandbox = { console: { warn() {}, error() {}, log() {} }, document: documentStub };
      sandbox.self = sandbox;
      sandbox.window = sandbox;
      vm.createContext(sandbox);
      const load = (rel) => vm.runInContext(fs.readFileSync(path.join(APP, rel), "utf8"), sandbox, { filename: rel });
      ["core/constants.js", "core/dom.js", "core/pwa.js", "core/site-content.js", "ui/site-return.js", "ui/router.js", "views/site-pages.js", "views/sources-page.js"].forEach(load);
      sandbox.EMT.core.dom.setDocument(doc);
      sandbox.EMT.store = m.store;
      const net = [];
      sandbox.fetch = () => { net.push("fetch"); };
      sandbox.XMLHttpRequest = function () { net.push("xhr"); };
      const router = sandbox.EMT.router;
      const btnOf = (id) => findAll(sections["view-" + id], (e) => e.className === "btn btn--link site-return")[0];
      return { m, router, sections, btnOf, net, before, setItemCount: () => setItems };
    }

    test("單字卡 → 關於我 → 隱私權政策 → 資料來源：每頁文字皆「返回單字卡」，返回回到單字卡（§7.25.5）", () => {
      const h = harness();
      h.router.start("flashcards");
      for (const id of ["about", "privacy", "sources"]) {
        assert.equal(h.router.go(id), true);
        assert.equal(h.btnOf(id).textContent, "返回單字卡", id);
        assert.equal(h.sections["view-" + id].hidden, false);
      }
      h.btnOf("sources").listeners.click[0]();
      assert.equal(h.router.current(), "flashcards");
      assert.equal(h.m.store.getState().runtime.sitePageReturnTab, null);
    });

    test("同一頁再次進入時文字隨新的返回目標更新（第一次 mount 與之後都正確，FE-86 時序）", () => {
      const h = harness();
      h.router.start("part5");
      h.router.go("contact");
      assert.equal(h.btnOf("contact").textContent, "返回模擬測驗");
      h.router.back();
      h.router.go("dashboard");
      h.router.go("contact");
      assert.equal(h.btnOf("contact").textContent, "返回主控台");
    });

    test("首次模式：4 頁文字皆「返回難易度設定」，返回仍在首次畫面；setItem 0 次，localStorage 前後相同（SP-4、AC-25-07）", () => {
      const h = harness({ firstRun: true });
      h.router.start("customizer");
      for (const id of SITE_TABS) {
        assert.equal(h.router.go(id), true, id);
        assert.equal(h.btnOf(id).textContent, "返回難易度設定", id);
        h.btnOf(id).listeners.click[0]();
        assert.equal(h.router.current(), "customizer");
      }
      assert.equal(h.setItemCount(), 0);
      assert.deepEqual([...h.m.storage.map], [...h.before]);
      assert.equal(h.m.store.getState().runtime.entryMode, "firstRun");
    });

    test("離線可讀：開啟三頁與資料來源不發請求、一般模式也不呼叫 setItem（SP-5、V-SITE-05）", () => {
      const h = harness();
      h.router.start("dashboard");
      const baseline = h.setItemCount();
      for (const id of SITE_TABS) {
        h.router.go(id);
        h.router.back();
      }
      assert.deepEqual(h.net, []);
      assert.equal(h.setItemCount(), baseline);
    });
  });
});
