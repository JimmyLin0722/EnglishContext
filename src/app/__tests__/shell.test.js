/*
 * shell.test.js — 應用殼：手機底部導覽列（FE-26）
 * 依據：architecture.md v0.4 §9.1（底部導覽列）、§4.5（bottomNav 介面）、§7.12（NAV_BOTTOM_MAX_PX、TOUCH_MIN_PX）、§10.1（shell.test.js 列）
 * 涵蓋：US-27、AC-27-01～AC-27-05；AC-20-02、AC-20-03；AC-19-01（圖示不引用外部資源）
 * 做法：
 *   - 靜態讀 src/app/index.html（去除 HTML 註解）：導覽 4 鈕（v0.5，FE-38）順序 = NAV_TAB_ORDER、每鈕含內嵌 <svg>
 *     （無 xmlns、無 http、單一 path）與 .app-nav__label 文字 = TAB_LABELS；整份無 <img；viewport-fit=cover。
 *   - 靜態讀 styles/00-base.css：@media (max-width: 640px) 區塊含 position: fixed、bottom: 0、
 *     .app-nav__btn 的 min-height／min-width ≥ 44px（或 var(--touch)）、is-typing 隱藏規則；≥ 641px 隱藏圖示。
 *   - 以極簡假 DOM ＋ node:vm 載入 ui/bottom-nav.js：focusin 輸入框加 is-typing、focusout 移除、按鈕聚焦不加；重複 init 只綁一次。
 * 實機尺寸（getBoundingClientRect ≥ 44、文字不裁切、無水平捲軸）屬 headless 瀏覽器實測與 QA E2E。
 */
"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const C = require("../core/constants.js");
const interaction = require("../core/interaction.js");

const APP_DIR = path.join(__dirname, "..");

/** 讀檔並去除 BOM */
function read(rel) {
  return fs.readFileSync(path.join(APP_DIR, rel), "utf8").replace(/^\uFEFF/, "");
}

/** index.html（去除 HTML 註解） */
function indexHtml() {
  return read("index.html").replace(/<!--[\s\S]*?-->/g, "");
}

/** 取出 #app-nav 內的按鈕：[{ tab, inner }] */
function navButtons() {
  const nav = indexHtml().match(/<nav id="app-nav"[\s\S]*?<\/nav>/);
  assert.ok(nav, "找不到 #app-nav");
  return [...nav[0].matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)].map((m) => {
    const tab = m[1].match(/\bdata-tab="([^"]+)"/);
    return { attrs: m[1], tab: tab ? tab[1] : null, inner: m[2] };
  });
}

/** 去除 CSS 註解 */
function css() {
  return read("styles/00-base.css").replace(/\/\*[\s\S]*?\*\//g, "");
}

/**
 * 取出指定 @media 條件的區塊內容（以大括號配對；同條件多個區塊時串接）。
 * @param {string} src
 * @param {string} query 例："(max-width: 640px)"
 */
function mediaBlocks(src, query) {
  const out = [];
  const head = "@media " + query;
  let from = 0;
  for (;;) {
    const at = src.indexOf(head, from);
    if (at < 0) break;
    const open = src.indexOf("{", at);
    let depth = 0;
    let i = open;
    for (; i < src.length; i++) {
      if (src[i] === "{") depth++;
      else if (src[i] === "}") {
        depth--;
        if (depth === 0) break;
      }
    }
    out.push(src.slice(open + 1, i));
    from = i + 1;
  }
  return out.join("\n");
}

/** 取出區塊中某選擇器的宣告（選擇器需完全相同；多個規則時串接） */
function rulesOf(block, selector) {
  const out = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(block))) {
    const sels = m[1].split(",").map((s) => s.trim());
    if (sels.indexOf(selector) >= 0) out.push(m[2]);
  }
  return out.join("\n");
}

/** 宣告值為 ≥ 44px 或 var(--touch) */
function isTouchSize(v) {
  if (!v) return false;
  v = v.trim();
  if (v === "var(--touch)") return true;
  const px = v.match(/^(\d+(?:\.\d+)?)px$/);
  return !!px && Number(px[1]) >= interaction.UI.TOUCH_MIN_PX;
}

/** 從宣告字串取某屬性的值 */
function prop(decls, name) {
  const re = new RegExp("(?:^|;|\\s)" + name.replace(/[-]/g, "\\-") + "\\s*:\\s*([^;]+)", "g");
  let m;
  let last = null;
  while ((m = re.exec(decls))) last = m[1].trim();
  return last;
}

describe("shell.test.js：index.html 導覽", () => {
  test("4 個按鈕依序 = NAV_TAB_ORDER，data-tab 不變（v0.5，FE-38；AC-20-03、AC-27-01）", () => {
    const btns = navButtons();
    assert.deepEqual(btns.map((b) => b.tab), [...C.NAV_TAB_ORDER]);
    assert.deepEqual(btns.map((b) => b.tab), ["dashboard", "customizer", "flashcards", "part5"]);
    for (const b of btns) assert.match(b.attrs, /\bclass="app-nav__btn"/);
  });

  test("每個按鈕：內嵌 svg（class、viewBox、aria-hidden、focusable）＋ 單一 path fill=currentColor，無 xmlns、無 http", () => {
    for (const b of navButtons()) {
      const svgs = b.inner.match(/<svg\b[^>]*>/g) || [];
      assert.equal(svgs.length, 1, b.tab + " 應恰有 1 個 svg");
      const tag = svgs[0];
      assert.match(tag, /\bclass="app-nav__icon"/, b.tab);
      assert.match(tag, /\bviewBox="0 0 24 24"/, b.tab);
      assert.match(tag, /\baria-hidden="true"/, b.tab);
      assert.match(tag, /\bfocusable="false"/, b.tab);
      assert.doesNotMatch(b.inner, /xmlns/i, b.tab + " 不得寫 xmlns");
      assert.doesNotMatch(b.inner, /http/i, b.tab + " 不得含 http");
      const paths = b.inner.match(/<path\b[^>]*>/g) || [];
      assert.equal(paths.length, 1, b.tab + " 應為單一 path");
      assert.match(paths[0], /\bfill="currentColor"/, b.tab);
      const d = paths[0].match(/\bd="([^"]+)"/);
      assert.ok(d && d[1].length > 0 && d[1].length <= 320, b.tab + " path 長度約 300 bytes 內");
      assert.match(b.inner, /<\/svg>\s*<span class="app-nav__label">/, b.tab + " 圖示在文字之前");
    }
  });

  test("每個按鈕的文字（.app-nav__label）= TAB_LABELS[NAV_TAB_ORDER[i]]", () => {
    const labels = navButtons().map((b) => {
      const m = b.inner.match(/<span class="app-nav__label">([^<]*)<\/span>/);
      return m ? m[1].trim() : null;
    });
    assert.deepEqual(labels, C.NAV_TAB_ORDER.map((t) => C.TAB_LABELS[t]));
    assert.deepEqual(labels, ["主控台", "難易度設定", "單字卡", "模擬測驗"]);
  });

  test("（v0.5，FE-38；AC-20-04）導覽不含隱藏頁按鈕；可見文字不含「解碼器」「句型庫」", () => {
    const btns = navButtons();
    for (const t of C.HIDDEN_TAB_IDS) {
      assert.ok(!btns.some((b) => b.tab === t), "導覽不得含 " + t);
    }
    const html = indexHtml();
    assert.doesNotMatch(html, /data-(?:tab|go)="(?:decoder|phrasebank)"/);
    assert.ok(!html.includes("解碼器") && !html.includes("句型庫"));
  });

  test("（v0.5，FE-38；HT-5）#view-decoder、#view-phrasebank 保留：hidden、無 aria-label", () => {
    const html = indexHtml();
    for (const t of C.HIDDEN_TAB_IDS) {
      const m = html.match(new RegExp('<section\\b([^>]*\\bid="view-' + t + '"[^>]*)>\\s*</section>'));
      assert.ok(m, "#view-" + t + " 應保留為空 section");
      assert.match(m[1], /\shidden(?:\s|=|$)/, t + " 應 hidden");
      assert.doesNotMatch(m[1], /aria-label/, t + " 不得有 aria-label");
    }
  });

  test("整份 index.html 無 <img、無 emoji 圖示；viewport meta 含 viewport-fit=cover", () => {
    const html = indexHtml();
    assert.doesNotMatch(html, /<img/i);
    // 註解會原樣進入產物，故原始檔（含註解）也不得出現 xmlns
    assert.doesNotMatch(read("index.html"), /xmlns/i);
    assert.doesNotMatch(html, /\p{Extended_Pictographic}/u);
    const vp = html.match(/<meta name="viewport" content="([^"]*)">/);
    assert.ok(vp, "找不到 viewport meta");
    assert.match(vp[1], /\bviewport-fit=cover\b/);
    assert.match(vp[1], /\bwidth=device-width\b/);
  });

  test("viewport meta 位於 LICENSE 標記之後；開頭片段（B-1）不變", () => {
    const raw = read("index.html");
    assert.match(raw, /^\s*<!DOCTYPE html>\s*<html\b[^>]*>\s*<head>\s*<meta charset="utf-8">\s*<!-- @@LICENSE@@ -->/i);
    assert.ok(raw.indexOf("<!-- @@LICENSE@@ -->") < raw.indexOf('<meta name="viewport"'));
  });
});

describe("shell.test.js：00-base.css 底部導覽規則", () => {
  const src = css();
  const small = mediaBlocks(src, "(max-width: 640px)");
  const wide = mediaBlocks(src, "(min-width: 641px)");

  test("斷點 640 = interaction.UI.NAV_BOTTOM_MAX_PX；兩個 @media 區塊皆存在", () => {
    assert.equal(interaction.UI.NAV_BOTTOM_MAX_PX, 640);
    assert.ok(small.length > 0, "缺 @media (max-width: 640px)");
    assert.ok(wide.length > 0, "缺 @media (min-width: 641px)");
  });

  test("≤ 640px：.app-nav 固定在底部、4 欄（v0.5，FE-38；欄數 = NAV_TAB_ORDER.length）、高度含安全區", () => {
    const nav = rulesOf(small, ".app-nav");
    assert.ok(nav, "≤ 640px 缺 .app-nav 規則");
    assert.equal(rulesOf(small, ".app-nav.is-open"), nav, ".app-nav.is-open 與 .app-nav 同規則");
    assert.equal(prop(nav, "position"), "fixed");
    assert.equal(prop(nav, "bottom"), "0");
    assert.equal(prop(nav, "left"), "0");
    assert.equal(prop(nav, "right"), "0");
    assert.equal(prop(nav, "display"), "grid");
    assert.match(prop(nav, "grid-template-columns"), /^repeat\(4,/);
    assert.match(prop(nav, "grid-template-columns"), new RegExp("^repeat\\(" + C.NAV_TAB_ORDER.length + ","));
    assert.match(prop(nav, "height"), /var\(--emt-bottomnav-h\)/);
    assert.match(prop(nav, "height"), /env\(safe-area-inset-bottom/);
    assert.match(src, /--emt-bottomnav-h:\s*56px/);
  });

  test("≤ 640px：.app-nav__btn 的 min-height、min-width ≥ 44px（或 var(--touch)）", () => {
    const btn = rulesOf(small, ".app-nav__btn");
    assert.ok(isTouchSize(prop(btn, "min-height")), "min-height = " + prop(btn, "min-height"));
    assert.ok(isTouchSize(prop(btn, "min-width")), "min-width = " + prop(btn, "min-width"));
    assert.match(src, /--touch:\s*44px/);
    // 56px 的導覽高度本身也 ≥ 44
    assert.ok(56 >= interaction.UI.TOUCH_MIN_PX);
  });

  test("≤ 640px：文字不換行、選單鈕隱藏、body 留白與 toast 上移、輸入中隱藏", () => {
    assert.equal(prop(rulesOf(small, ".app-nav__label"), "white-space"), "nowrap");
    assert.equal(prop(rulesOf(small, ".btn.app-nav-toggle"), "display"), "none");
    assert.match(prop(rulesOf(small, "body"), "padding-bottom"), /var\(--emt-bottomnav-h\)/);
    assert.match(prop(rulesOf(small, ".toast-root"), "bottom"), /var\(--emt-bottomnav-h\)/);
    assert.equal(prop(rulesOf(small, "html.is-typing .app-nav"), "display"), "none");
    assert.equal(prop(rulesOf(small, "html.is-typing body"), "padding-bottom"), "8px");
  });

  test("≥ 641px：隱藏圖示（641～767 維持選單、≥ 768 維持單列頁籤）", () => {
    assert.equal(prop(rulesOf(wide, ".app-nav__icon"), "display"), "none");
    const tablet = mediaBlocks(src, "(min-width: 768px)");
    assert.equal(prop(rulesOf(tablet, ".btn.app-nav-toggle"), "display"), "none");
    assert.equal(prop(rulesOf(tablet, ".app-nav"), "display"), "flex");
    // 基礎（641～767）：未展開時隱藏，展開為 2 欄（v0.5：4 鈕 = 2 × 2）
    const base = src.replace(/@media[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, "");
    assert.equal(prop(rulesOf(base, ".app-nav"), "display"), "none");
    assert.equal(prop(rulesOf(base, ".app-nav.is-open"), "display"), "grid");
  });

  test("寬螢幕（≥ 641px、≥ 768px）導覽不為 position: fixed", () => {
    const tablet = mediaBlocks(src, "(min-width: 768px)");
    assert.notEqual(prop(rulesOf(tablet, ".app-nav"), "position"), "fixed");
    assert.notEqual(prop(rulesOf(wide, ".app-nav"), "position"), "fixed");
  });
});

// ─────────────────────────────────────────────────────────────
// ui/bottom-nav.js（假 DOM）
// ─────────────────────────────────────────────────────────────

/** 假 classList */
function makeClassList() {
  const set = new Set();
  return {
    add: (c) => set.add(c),
    remove: (c) => set.delete(c),
    contains: (c) => set.has(c)
  };
}

/** 假元素 */
function makeEl(tag, attrs) {
  const a = Object.assign({}, attrs || {});
  return {
    nodeType: 1,
    tagName: tag.toUpperCase(),
    getAttribute: (k) => (Object.prototype.hasOwnProperty.call(a, k) ? a[k] : null)
  };
}

/** 建立沙箱並載入 ui/bottom-nav.js */
function setup() {
  const listeners = {};
  const html = { nodeType: 1, tagName: "HTML", classList: makeClassList() };
  const document = {
    documentElement: html,
    activeElement: null,
    addEventListener: (t, fn) => { (listeners[t] = listeners[t] || []).push(fn); }
  };
  const sandbox = { document: document, console: console };
  sandbox.self = sandbox;
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read("ui/bottom-nav.js"), sandbox, { filename: "ui/bottom-nav.js" });
  const fire = (type, target, relatedTarget) => {
    for (const fn of listeners[type] || []) fn({ type: type, target: target, relatedTarget: relatedTarget || null });
  };
  return { sandbox, html, document, listeners, fire, api: sandbox.EMT.ui.bottomNav };
}

describe("shell.test.js：ui/bottom-nav.js", () => {
  test("載入時只登錄（不綁事件、不改 class）", () => {
    const s = setup();
    assert.equal(typeof s.api.init, "function");
    assert.equal(typeof s.api.isTypingTarget, "function");
    assert.deepEqual(Object.keys(s.listeners), []);
    assert.equal(s.html.classList.contains("is-typing"), false);
  });

  test("isTypingTarget：文字類 input、textarea、select 為真；按鈕、核取方塊、滑桿、null 為假", () => {
    const { api } = setup();
    for (const t of [null, "text", "search", "number", "email", "url", "tel", "password", "TEXT"]) {
      const attrs = t === null ? {} : { type: t };
      assert.equal(api.isTypingTarget(makeEl("input", attrs)), true, "input type=" + t);
    }
    assert.equal(api.isTypingTarget(makeEl("textarea")), true);
    assert.equal(api.isTypingTarget(makeEl("select")), true);
    for (const t of ["checkbox", "radio", "range", "button", "submit", "file", "color"]) {
      assert.equal(api.isTypingTarget(makeEl("input", { type: t })), false, "input type=" + t);
    }
    assert.equal(api.isTypingTarget(makeEl("button", { type: "button" })), false);
    assert.equal(api.isTypingTarget(makeEl("div")), false);
    assert.equal(api.isTypingTarget(null), false);
    assert.equal(api.isTypingTarget(undefined), false);
    assert.equal(api.isTypingTarget({ nodeType: 3 }), false);
  });

  test("focusin 輸入框 → 加 is-typing；focusout → 移除", () => {
    const s = setup();
    s.api.init();
    const input = makeEl("input", { type: "text" });
    s.fire("focusin", input);
    assert.equal(s.html.classList.contains("is-typing"), true);
    s.fire("focusout", input, null);
    assert.equal(s.html.classList.contains("is-typing"), false);
  });

  test("按鈕聚焦不加 is-typing；從輸入框移到按鈕會移除", () => {
    const s = setup();
    s.api.init();
    const btn = makeEl("button", { type: "button" });
    s.fire("focusin", btn);
    assert.equal(s.html.classList.contains("is-typing"), false);
    const ta = makeEl("textarea");
    s.fire("focusin", ta);
    assert.equal(s.html.classList.contains("is-typing"), true);
    s.fire("focusout", ta, btn);
    s.fire("focusin", btn);
    assert.equal(s.html.classList.contains("is-typing"), false);
  });

  test("焦點在兩個輸入框之間移動時維持 is-typing", () => {
    const s = setup();
    s.api.init();
    const a = makeEl("input");
    const b = makeEl("input", { type: "search" });
    s.fire("focusin", a);
    s.fire("focusout", a, b);
    assert.equal(s.html.classList.contains("is-typing"), true);
    s.fire("focusin", b);
    assert.equal(s.html.classList.contains("is-typing"), true);
  });

  test("重複呼叫 init 只綁一次", () => {
    const s = setup();
    s.api.init();
    s.api.init();
    s.api.init();
    assert.equal((s.listeners.focusin || []).length, 1);
    assert.equal((s.listeners.focusout || []).length, 1);
  });

  test("init 時若焦點已在輸入框，立即加 is-typing", () => {
    const s = setup();
    s.document.activeElement = makeEl("select");
    s.api.init();
    assert.equal(s.html.classList.contains("is-typing"), true);
  });
});

describe("shell.test.js：main.js 啟動順序", () => {
  test("bottomNav.init 在 router.start 之後、emt-ready 之前，且包在 step() 中（存在才呼叫）", () => {
    const src = read("main.js");
    const iStart = src.indexOf('step("router.start"');
    const iNav = src.indexOf('step("bottomNav.init"');
    const iReady = src.indexOf('step("emt-ready"');
    assert.ok(iStart >= 0 && iNav > iStart && iReady > iNav, "順序：router.start → bottomNav.init → emt-ready");
    assert.match(src, /EMT\.ui && EMT\.ui\.bottomNav && typeof EMT\.ui\.bottomNav\.init === "function"/);
  });
});
