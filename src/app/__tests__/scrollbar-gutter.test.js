/*
 * scrollbar-gutter.test.js — 根元素捲軸寬度固定的靜態檢查（FE-96，修正 BUG-006、BUG-008）
 * 受測：styles/*.css（讀檔解析，不執行瀏覽器）
 * 依據：architecture.md v0.16 §7.29.3、§10.13「scrollbar-gutter.test.js」列；契約 README §13.2 AD-5、AD-14、§9.12 DS-48
 * 涵蓋：AC-52-05、AC-60-06、AC-20-01、AC-40-02
 *
 * - scrollbar-gutter 宣告只出現在 00-base.css 媒體查詢外、選擇器恰為 html 的規則，值為 stable（只有 1 個）。
 * - @media 內的 html 規則（KF-1 scroll-padding-bottom）不含 scrollbar-gutter。
 * - 任何樣式檔都沒有 100vw（保留捲軸寬度後 100vw 會超出可用寬度，造成水平捲軸）。
 * - 85-ad.css 沒有 html[data-ad-env] 規則（v0.14 條件規則已移除，SD-FB-80 由 SD-FB-94 取代）。
 * 實際位移由 Chrome 實測（§7.29.5），不在本檔。
 */
"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const STYLES = path.join(__dirname, "..", "styles");
const FILES = fs.readdirSync(STYLES).filter((f) => f.endsWith(".css")).sort();

/** 讀樣式檔並移除註解 */
function readCss(name) {
  return fs.readFileSync(path.join(STYLES, name), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
}

/**
 * 把 CSS 拆成規則：{ selector, body, media }。media 為所在 @ 規則的前導文字（頂層為 null）。
 * 只處理本專案用到的寫法（無字串內含大括號、@ 規則最多 1 層巢狀）。
 */
function rulesOf(css) {
  const out = [];
  function walk(text, media) {
    let i = 0;
    while (i < text.length) {
      const open = text.indexOf("{", i);
      if (open < 0) break;
      let depth = 1;
      let j = open + 1;
      while (j < text.length && depth > 0) {
        if (text[j] === "{") depth++;
        else if (text[j] === "}") depth--;
        j++;
      }
      const prelude = text.slice(i, open).trim();
      const body = text.slice(open + 1, j - 1);
      if (prelude.startsWith("@")) walk(body, prelude);
      else out.push({ selector: prelude, body, media });
      i = j;
    }
  }
  walk(css, null);
  return out;
}

/** 規則內的 scrollbar-gutter 宣告值 */
function gutterValues(body) {
  return [...body.matchAll(/scrollbar-gutter\s*:\s*([^;]+)/g)].map((m) => m[1].trim());
}

describe("scrollbar-gutter.test.js（v0.16 §7.29）", () => {
  test("樣式檔存在且包含 00-base.css、85-ad.css", () => {
    assert.ok(FILES.includes("00-base.css"));
    assert.ok(FILES.includes("85-ad.css"));
  });

  test("scrollbar-gutter 只在 00-base.css 媒體查詢外的 html 規則，值為 stable，且只有 1 個（AC-52-05、AC-60-06）", () => {
    const hits = [];
    for (const f of FILES) {
      const css = readCss(f);
      for (const r of rulesOf(css)) {
        for (const v of gutterValues(r.body)) hits.push({ file: f, selector: r.selector, media: r.media, value: v });
      }
      // 規則解析之外的殘留（例如寫在 @ 規則前導）也不允許
      const total = (css.match(/scrollbar-gutter/g) || []).length;
      const parsed = hits.filter((h) => h.file === f).length;
      assert.equal(total, parsed, f + "：scrollbar-gutter 出現在無法解析的位置");
    }
    assert.deepEqual(hits, [{ file: "00-base.css", selector: "html", media: null, value: "stable" }]);
  });

  test("@media 內的 html 規則不含 scrollbar-gutter；KF-1 的 scroll-padding-bottom 仍在", () => {
    const rules = rulesOf(readCss("00-base.css"));
    const inMedia = rules.filter((r) => r.media !== null && /(^|,)\s*html(\.is-typing)?\s*($|,)/.test(r.selector));
    assert.ok(inMedia.length >= 1, "預期 @media (max-width: 640px) 內有 html 規則");
    for (const r of inMedia) assert.doesNotMatch(r.body, /scrollbar-gutter/, r.media + " " + r.selector);
    assert.ok(inMedia.some((r) => /scroll-padding-bottom/.test(r.body)), "KF-1 scroll-padding-bottom 未被移除");
  });

  test("任何樣式檔都沒有 100vw（AC-20-01、AC-40-02）", () => {
    for (const f of FILES) assert.doesNotMatch(readCss(f), /100vw/, f);
  });

  test("85-ad.css 沒有 html[data-ad-env] 規則", () => {
    const css = readCss("85-ad.css");
    assert.doesNotMatch(css, /html\s*\[\s*data-ad-env/);
    assert.equal(rulesOf(css).filter((r) => r.selector.includes("data-ad-env")).length, 0);
  });
});
