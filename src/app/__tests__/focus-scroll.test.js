/*
 * focus-scroll.test.js — 窄視窗鍵盤焦點不被底部導覽列遮住的靜態檢查（FE-93，修正 BUG-005）
 * 受測：styles/00-base.css、styles/75-site-pages.css（讀檔解析，不執行瀏覽器）
 * 依據：architecture.md v0.15 §7.27.2、§10.12「focus-scroll.test.js」列；契約 README §14.4 KF-1、§9 DS-62
 * 涵蓋：AC-61-01、AC-61-02、AC-38-09、AC-27-03、AC-41-04、AC-57-01
 *
 * - 00-base.css：@media (max-width: 640px) 內有 html 的 scroll-padding-bottom（含 --emt-bottomnav-h 與
 *   safe-area-inset-bottom）、html.is-typing 為 0；媒體查詢外沒有 scroll-padding。
 * - 75-site-pages.css：一般頁尾連結等不再有 scroll-margin-bottom；首次畫面規則為 --emt-firstbar-h 減 --emt-bottomnav-h。
 * - 不使用 :has()。實際焦點遮擋比例由 Chrome 實測（§7.27.4），不在本檔。
 */
"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const STYLES = path.join(__dirname, "..", "styles");

/** 讀樣式檔並移除註解 */
function readCss(name) {
  return fs.readFileSync(path.join(STYLES, name), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
}

/**
 * 把 CSS 拆成頂層區塊：{ prelude, body }。@media 的 body 是內層文字（不含外層大括號）。
 * 只處理本專案用到的寫法（無字串內含大括號）。
 */
function topBlocks(css) {
  const out = [];
  let i = 0;
  while (i < css.length) {
    const open = css.indexOf("{", i);
    if (open < 0) break;
    let depth = 1;
    let j = open + 1;
    while (j < css.length && depth > 0) {
      if (css[j] === "{") depth++;
      else if (css[j] === "}") depth--;
      j++;
    }
    out.push({ prelude: css.slice(i, open).trim(), body: css.slice(open + 1, j - 1) });
    i = j;
  }
  return out;
}

/** 把一段（不含巢狀）的規則文字拆成 [{ selector, decls }] */
function rulesOf(text) {
  return topBlocks(text).map((b) => ({ selector: b.prelude.replace(/\s+/g, " ").trim(), decls: b.body }));
}

/** 取得宣告值（最後一個為準）；沒有回 null */
function declOf(decls, prop) {
  const re = new RegExp("(?:^|;|\\s)" + prop.replace(/-/g, "\\-") + "\\s*:\\s*([^;]+)", "g");
  let m;
  let last = null;
  while ((m = re.exec(decls))) last = m[1].trim();
  return last;
}

/** 取得 @media (max-width: 640px) 的內層規則，與媒體查詢外的頂層規則 */
function split640(css) {
  const blocks = topBlocks(css);
  const inside = [];
  const outside = [];
  for (const b of blocks) {
    if (/^@media\s*\(\s*max-width\s*:\s*640px\s*\)$/.test(b.prelude)) inside.push(...rulesOf(b.body));
    else if (b.prelude.startsWith("@")) outside.push({ selector: b.prelude, decls: b.body });
    else outside.push({ selector: b.prelude.replace(/\s+/g, " ").trim(), decls: b.body });
  }
  return { inside, outside };
}

describe("focus-scroll.test.js", () => {
  const base = readCss("00-base.css");
  const site = readCss("75-site-pages.css");

  test("00-base.css：≤ 640px 的 html 有 scroll-padding-bottom，值含 --emt-bottomnav-h 與 safe-area-inset-bottom（KF-1）", () => {
    const { inside } = split640(base);
    const html = inside.filter((r) => r.selector === "html");
    assert.equal(html.length, 1, "≤ 640px 區塊內恰有 1 條 html 規則");
    const v = declOf(html[0].decls, "scroll-padding-bottom");
    assert.ok(v, "html 有 scroll-padding-bottom");
    assert.match(v, /^calc\(/);
    assert.match(v, /var\(--emt-bottomnav-h\)/);
    assert.match(v, /env\(safe-area-inset-bottom, 0px\)/);
    assert.match(v, /\+ 8px\)$/);
    // 數值與 body 底部留白相同（56 + 安全區 + 8）
    const body = inside.filter((r) => r.selector === "body" && declOf(r.decls, "padding-bottom"));
    assert.equal(body.length, 1);
    assert.equal(declOf(body[0].decls, "padding-bottom"), v);
  });

  test("00-base.css：≤ 640px 的 html.is-typing scroll-padding-bottom 為 0（AC-27-03）", () => {
    const { inside } = split640(base);
    const typing = inside.filter((r) => r.selector === "html.is-typing");
    assert.equal(typing.length, 1);
    assert.equal(declOf(typing[0].decls, "scroll-padding-bottom"), "0");
    // 放在 html 規則之後（同權重以後者為準不影響，但維持閱讀順序）
    const idxHtml = inside.findIndex((r) => r.selector === "html");
    const idxTyping = inside.findIndex((r) => r.selector === "html.is-typing");
    assert.ok(idxHtml >= 0 && idxTyping > idxHtml);
  });

  test("00-base.css：媒體查詢外沒有 scroll-padding；body 不設 scroll-padding（AC-61-02）", () => {
    const { outside, inside } = split640(base);
    for (const r of outside) {
      assert.doesNotMatch(r.decls, /scroll-padding/, "≤ 640px 以外不得有 scroll-padding：" + r.selector);
    }
    for (const r of inside) {
      if (r.selector === "html" || r.selector === "html.is-typing") continue;
      assert.doesNotMatch(r.decls, /scroll-padding/, "只在 html 設定：" + r.selector);
    }
    // 全站沒有平滑捲動（減少動態下也沒有動畫）
    for (const name of fs.readdirSync(STYLES).filter((n) => n.endsWith(".css"))) {
      assert.doesNotMatch(readCss(name), /scroll-behavior\s*:\s*smooth/, name);
    }
  });

  test("75-site-pages.css：一般頁尾連結、返回按鈕、對外頁面連結不再有 scroll-margin-bottom", () => {
    const { inside, outside } = split640(site);
    const all = inside.concat(outside);
    const generic = [".footer-links .btn", ".site-return", ".site-page a", ".site-page__link"];
    for (const r of all) {
      if (!/scroll-margin/.test(r.decls)) continue;
      const sels = r.selector.split(",").map((s) => s.trim());
      for (const s of sels) {
        assert.equal(generic.includes(s), false, "不得再對一般選擇器設 scroll-margin：" + s);
        assert.ok(s.startsWith('body[data-entry="firstRun"]'), "只有首次畫面規則可設 scroll-margin：" + s);
      }
    }
    // scroll-margin 只出現在 ≤ 640px 區塊
    for (const r of outside) assert.doesNotMatch(r.decls, /scroll-margin/, r.selector);
  });

  test("75-site-pages.css：首次畫面規則為 --emt-firstbar-h 減 --emt-bottomnav-h（總和與 v1.3.0 相同，AC-41-04、AC-57-01）", () => {
    const { inside } = split640(site);
    const sel = 'body[data-entry="firstRun"][data-tab="customizer"] .footer-links .btn';
    const r = inside.filter((x) => x.selector === sel);
    assert.equal(r.length, 1);
    const v = declOf(r[0].decls, "scroll-margin-bottom");
    assert.equal(v, "calc(var(--emt-firstbar-h) - var(--emt-bottomnav-h))");
    // 加上 html 的 scroll-padding（導覽 + 安全區 + 8）後 = 首次底部列 + 安全區 + 8
    const num = (name) => {
      const m = base.match(new RegExp(name.replace(/-/g, "\\-") + "\\s*:\\s*(\\d+)px"));
      return m ? Number(m[1]) : NaN;
    };
    const nav = num("--emt-bottomnav-h");
    const first = num("--emt-firstbar-h");
    assert.equal(nav, 56);
    assert.equal(first, 184);
    assert.equal((first - nav) + (nav + 8), first + 8);
  });

  test("兩個樣式檔都不使用 :has()", () => {
    assert.doesNotMatch(base, /:has\(/);
    assert.doesNotMatch(site, /:has\(/);
  });
});
