/*
 * version-line.test.js — 頁尾版本行 EMT.ui.versionLine 單元測試（FE-64）
 * 依據：architecture.md v0.9 §4.9「EMT.ui.versionLine」、§7.20.1、§10.6「version-line.test.js」；
 *       契約 README §12.1 VR-5～VR-8、§12.4 V-VER-03～V-VER-05
 * 涵蓋：AC-42-01、AC-42-02、AC-42-03、AC-41-04、AC-23-02
 * 做法：假 document（querySelectorAll、getElementById、#footer-sources 與其 parent），core/dom.js 以 setDocument 注入。
 */
"use strict";

const { describe, test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const APP_DIR = path.join(__dirname, "..");
const D = require("../core/dom.js");
const VL = require("../ui/version-line.js");

const GOOD_ID = "3f9a2c1d77e2b6a4";
const GOOD_TEXT = "版本 1.0.0（建置 3f9a2c1）";

/** 極簡假節點 */
class FNode {
  constructor(doc, tag) {
    this.ownerDocument = doc;
    this.tagName = tag.toUpperCase();
    this.nodeType = tag === "#text" ? 3 : 1;
    this.childNodes = [];
    this.parentNode = null;
    this.attrs = {};
    this.listeners = {};
    this.className = "";
    this._text = "";
  }
  get nextSibling() {
    if (!this.parentNode) return null;
    const c = this.parentNode.childNodes;
    return c[c.indexOf(this) + 1] || null;
  }
  get previousSibling() {
    if (!this.parentNode) return null;
    const c = this.parentNode.childNodes;
    return c[c.indexOf(this) - 1] || null;
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
    this.childNodes = [];
    if (String(t) !== "") this.appendChild(this.ownerDocument.createTextNode(String(t)));
  }
  get textContent() { return this.nodeType === 3 ? this._text : this.childNodes.map((c) => c.textContent).join(""); }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  hasAttribute(k) { return k in this.attrs; }
  addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); }
}

/**
 * 建立假 document。
 * @param {{ version?: string|null|string[], buildId?: string|null|string[], footer?: boolean, qsaThrows?: boolean }} o
 *   version／buildId 為 null → 沒有該 meta；陣列 → 多個 meta
 */
function makeDoc(o = {}) {
  const doc = {
    queries: 0,
    createElement(tag) { return new FNode(doc, tag); },
    createElementNS(ns, tag) { return new FNode(doc, tag); },
    createTextNode(t) { const n = new FNode(doc, "#text"); n._text = String(t); return n; },
    querySelectorAll(sel) {
      doc.queries++;
      if (o.qsaThrows) throw new Error("boom");
      const m = /^meta\[name="([^"]+)"\]$/.exec(sel);
      if (!m) return [];
      return doc.metas.filter((x) => x.attrs.name === m[1]);
    },
    getElementById(id) {
      const walk = (n) => {
        if (n.nodeType === 1 && n.attrs.id === id) return n;
        for (const c of n.childNodes) {
          const r = walk(c);
          if (r) return r;
        }
        return null;
      };
      return walk(doc.body);
    },
    metas: []
  };
  const addMeta = (name, v) => {
    const list = v === null ? [] : Array.isArray(v) ? v : [v];
    for (const c of list) {
      const m = new FNode(doc, "meta");
      m.setAttribute("name", name);
      m.setAttribute("content", c);
      doc.metas.push(m);
    }
  };
  addMeta("emt-app-version", o.version === undefined ? "1.0.0" : o.version);
  addMeta("emt-build-id", o.buildId === undefined ? GOOD_ID : o.buildId);
  doc.body = new FNode(doc, "body");
  const footer = new FNode(doc, "footer");
  footer.setAttribute("id", "app-footer");
  doc.body.appendChild(footer);
  if (o.footer !== false) {
    const src = new FNode(doc, "button");
    src.setAttribute("id", "footer-sources");
    src.textContent = "資料來源與授權";
    footer.appendChild(src);
  }
  const back = new FNode(doc, "button");
  back.setAttribute("id", "footer-first-run-back");
  footer.appendChild(back);
  doc.footer = footer;
  return doc;
}

/** 收集 console.error 呼叫 */
let errors;
let origError;
beforeEach(() => {
  errors = [];
  origError = console.error;
  console.error = (...a) => errors.push(a);
});
afterEach(() => {
  console.error = origError;
  D.setDocument(null);
});

function lines(doc) {
  return doc.footer.childNodes.filter((n) => n.attrs.id === "app-version");
}

describe("version-line.test.js：合法值", () => {
  test("建立 1 個 p#app-version.app-footer__version，文字逐字，位於 #footer-sources 的下一個兄弟；無 tabindex／role、非 a／button", () => {
    const doc = makeDoc();
    D.setDocument(doc);
    const r = VL.init(doc);
    assert.deepEqual(r, { rendered: true, text: GOOD_TEXT });
    const ls = lines(doc);
    assert.equal(ls.length, 1);
    const p = ls[0];
    assert.equal(p.tagName, "P");
    assert.equal(p.className, "app-footer__version");
    assert.equal(p.textContent, GOOD_TEXT);
    assert.equal(p.previousSibling.attrs.id, "footer-sources");
    assert.equal(doc.getElementById("footer-sources").nextSibling, p);
    assert.equal(p.nextSibling.attrs.id, "footer-first-run-back", "返回連結維持在版本行之後");
    for (const k of ["tabindex", "role", "href"]) assert.ok(!(k in p.attrs), k);
    assert.deepEqual(Object.keys(p.listeners), []);
    assert.equal(errors.length, 0);
  });

  test("重複 init 仍只有 1 個（重入安全）；同一份 document 只讀一次 meta", () => {
    const doc = makeDoc();
    D.setDocument(doc);
    VL.init(doc);
    const q = doc.queries;
    VL.init(doc);
    VL.init(doc);
    assert.equal(lines(doc).length, 1);
    assert.equal(lines(doc)[0].textContent, GOOD_TEXT);
    assert.equal(doc.queries, q, "meta 只讀一次");
  });

  test("版本號取自 meta（非寫死）：0.10.3 與另一個 BUILD_ID", () => {
    const doc = makeDoc({ version: "0.10.3", buildId: "abcdef0123456789" });
    D.setDocument(doc);
    assert.equal(VL.init(doc).text, "版本 0.10.3（建置 abcdef0）");
  });

  test("readMeta：恰 1 個才回傳 content", () => {
    assert.equal(VL.readMeta(makeDoc(), "emt-app-version"), "1.0.0");
    assert.equal(VL.readMeta(makeDoc({ version: null }), "emt-app-version"), null);
    assert.equal(VL.readMeta(makeDoc({ version: ["1.0.0", "1.0.0"] }), "emt-app-version"), null);
  });
});

describe("version-line.test.js：V-VER-04 異常值", () => {
  const cases = {
    "缺版本 meta": { version: null },
    "缺 BUILD_ID meta": { buildId: null },
    "版本 meta 2 個": { version: ["1.0.0", "1.0.1"] },
    "BUILD_ID meta 2 個": { buildId: [GOOD_ID, GOOD_ID] },
    "版本為佔位": { version: "@@APP_VERSION@@" },
    "版本 v1.0.0": { version: "v1.0.0" },
    "版本 1.0": { version: "1.0" },
    "BUILD_ID 為佔位": { buildId: "@@BUILD_ID@@" },
    "BUILD_ID 15 位": { buildId: GOOD_ID.slice(0, 15) },
    "BUILD_ID 大寫": { buildId: GOOD_ID.toUpperCase() },
    "querySelectorAll 拋錯": { qsaThrows: true }
  };
  for (const [name, o] of Object.entries(cases)) {
    test(name + " → 不建節點、rendered:false、不拋錯、console.error 0 次", () => {
      const doc = makeDoc(o);
      D.setDocument(doc);
      let r;
      assert.doesNotThrow(() => { r = VL.init(doc); });
      assert.deepEqual(r, { rendered: false, text: null });
      assert.equal(lines(doc).length, 0);
      assert.equal(errors.length, 0);
      const all = doc.footer.textContent;
      for (const w of ["@@", "undefined", "null", "（建置 ）", "版本"]) assert.ok(!all.includes(w), w);
    });
  }

  test("無 #footer-sources → 不建；已存在的版本行在不合法時移除", () => {
    const doc = makeDoc({ footer: false });
    D.setDocument(doc);
    assert.deepEqual(VL.init(doc), { rendered: false, text: null });
    assert.equal(lines(doc).length, 0);

    const bad = makeDoc({ version: "v1.0.0" });
    D.setDocument(bad);
    const stale = new FNode(bad, "p");
    stale.setAttribute("id", "app-version");
    bad.footer.insertBefore(stale, bad.getElementById("footer-sources").nextSibling);
    VL.init(bad);
    assert.equal(lines(bad).length, 0);
  });

  test("core/dom.js 建立節點時拋錯 → 仍不拋出、不 console.error", () => {
    const doc = makeDoc();
    doc.createElement = () => { throw new Error("no"); };
    D.setDocument(doc);
    assert.deepEqual(VL.init(doc), { rendered: false, text: null });
    assert.equal(errors.length, 0);
  });
});

describe("version-line.test.js：瀏覽器載入（LD-2）", () => {
  test("在只有 self／window 的沙箱載入 core/dom、pwa、version 與本檔：只登錄 EMT.ui.versionLine、不讀 document", () => {
    let reads = 0;
    const sandbox = { console };
    sandbox.self = sandbox;
    sandbox.window = sandbox;
    Object.defineProperty(sandbox, "document", { get() { reads++; return undefined; }, configurable: true });
    vm.createContext(sandbox);
    for (const rel of ["core/dom.js", "core/pwa.js", "core/version.js", "ui/version-line.js"]) {
      vm.runInContext(fs.readFileSync(path.join(APP_DIR, rel), "utf8"), sandbox, { filename: rel });
    }
    assert.equal(reads, 0, "載入時不讀 document");
    assert.equal(typeof sandbox.EMT.ui.versionLine.init, "function");
    // 瀏覽器路徑：以 EMT.core.* 取用模組並建立版本行
    const doc = makeDoc();
    Object.defineProperty(sandbox, "document", { get() { return doc; }, configurable: true });
    assert.deepEqual(JSON.parse(JSON.stringify(sandbox.EMT.ui.versionLine.init())), { rendered: true, text: GOOD_TEXT });
    assert.equal(lines(doc).length, 1);
  });
});

describe("version-line.test.js：原始碼掃描與接線（V-VER-05）", () => {
  const read = (rel) => fs.readFileSync(path.join(APP_DIR, rel), "utf8");

  test("ui/version-line.js、core/version.js：無 fetch、XMLHttpRequest、import(、package.json、localStorage；無寫死版本號與 @@", () => {
    for (const rel of ["ui/version-line.js", "core/version.js"]) {
      const src = read(rel);
      for (const w of ["fetch", "XMLHttpRequest", "import(", "package.json", "localStorage", "sessionStorage", "@@"]) {
        assert.ok(!src.includes(w), rel + "：" + w);
      }
      // 版本字面值：去除註解後檢查（註解中的章節編號如 §7.20.1 不算；core/version.js 由 version.test.js 連註解一起檢查）
      const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      assert.doesNotMatch(code, /\d+\.\d+\.\d+/, rel + "：版本字面值");
    }
    const src = read("ui/version-line.js");
    assert.ok(!/console\.error/.test(src));
    assert.ok(!/tabindex|role:/.test(src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")));
  });

  test("src/app 非測試 .js（不含 pwa/）全部不含字串 package.json", () => {
    const hits = [];
    const walk = (rel) => {
      for (const d of fs.readdirSync(path.join(APP_DIR, rel), { withFileTypes: true })) {
        const r = rel ? rel + "/" + d.name : d.name;
        if (d.isDirectory()) {
          if (d.name === "__tests__" || d.name === "pwa" || d.name === "assets") continue;
          walk(r);
        } else if (d.name.endsWith(".js") && read(r).includes("package.json")) {
          hits.push(r);
        }
      }
    };
    walk("");
    assert.deepEqual(hits, []);
  });

  test("main.js：step(\"versionLine.init\") 在 banner.render 之後、pwa.start 與 router.start 之前", () => {
    const src = read("main.js");
    const at = src.indexOf('step("versionLine.init"');
    assert.ok(at > 0);
    assert.ok(src.indexOf('step("banner.render"') < at);
    assert.ok(at < src.indexOf('step("pwa.start"'));
    assert.ok(at < src.indexOf('step("router.start"'));
    assert.match(src, /EMT\.ui\.versionLine\.init\(\)/);
  });

  test("00-base.css：.app-footer__version 有 white-space: nowrap、color: var(--text-muted)，無 --accent／--brand、背景", () => {
    const css = read("styles/00-base.css");
    const m = /\.app-footer__version\s*\{([^}]*)\}/.exec(css);
    assert.ok(m, "規則存在");
    const body = m[1];
    assert.match(body, /white-space:\s*nowrap/);
    assert.match(body, /color:\s*var\(--text-muted\)/);
    assert.match(body, /font-size:\s*0\.75rem/);
    assert.match(body, /margin:\s*4px 0 0/);
    assert.ok(!/--accent|--brand|background/.test(body));
  });
});
