/*
 * tokens.test.js — 色彩 token、共用元件樣式與 CSS 禁止寫法（FE-56）
 * 受測：styles/00-base.css（:root、body、.card）與 styles/*.css 全部檔案（禁止寫法掃描）
 * 依據：architecture.md v0.8 §7.19.1、§7.19.2、§10.5「tokens.test.js」列；契約 README §11.2 VC-1～VC-8、data-schema.ts §13
 * 涵蓋：AC-38-01～AC-38-04、AC-38-06、AC-38-07、AC-34-04、VC-1～VC-8
 * 期望值在測試內以字面值寫出（不讀 docs/）；對比以 WCAG 2.x 相對亮度公式在本檔計算。
 * 本檔每次 npm test 都掃描全部樣式檔：之後任何任務新增違規寫法都會失敗（§7.19.1）。
 */
"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const layout = require("../core/layout.js");
const pwa = require("../core/pwa.js");

const STYLES_DIR = path.join(__dirname, "..", "styles");

/** 讀檔、去除 BOM 與 CSS 註解 */
function readCss(name) {
  return fs.readFileSync(path.join(STYLES_DIR, name), "utf8").replace(/^﻿/, "").replace(/\/\*[\s\S]*?\*\//g, "");
}

const CSS_FILES = fs.readdirSync(STYLES_DIR).filter((f) => f.endsWith(".css")).sort();

/**
 * 極簡 CSS 解析：回傳所有一般規則 [{ selector, decls, media }]（@media 內的規則一併展開）。
 * @param {string} src 已去除註解的 CSS
 */
function parseRules(src, media = "") {
  const out = [];
  let i = 0;
  while (i < src.length) {
    const open = src.indexOf("{", i);
    if (open < 0) break;
    const head = src.slice(i, open).trim();
    // 找對應的右大括號
    let depth = 0;
    let j = open;
    for (; j < src.length; j++) {
      if (src[j] === "{") depth++;
      else if (src[j] === "}") {
        depth--;
        if (depth === 0) break;
      }
    }
    const body = src.slice(open + 1, j);
    if (head.startsWith("@")) {
      out.push(...parseRules(body, head));
    } else {
      out.push({ selector: head, decls: body, media });
    }
    i = j + 1;
  }
  return out;
}

/** 從宣告字串取某屬性的最後一個值 */
function prop(decls, name) {
  const re = new RegExp("(?:^|;|\\s)" + name.replace(/-/g, "\\-") + "\\s*:\\s*([^;]+)", "g");
  let m;
  let last = null;
  while ((m = re.exec(decls))) last = m[1].trim();
  return last;
}

const BASE = readCss("00-base.css");
const BASE_RULES = parseRules(BASE);

/** 00-base.css 第一個（非 @media）:root 規則的變數表 */
function rootVars() {
  const vars = {};
  for (const r of BASE_RULES) {
    if (r.selector !== ":root" || r.media) continue;
    const re = /(--[\w-]+)\s*:\s*([^;]+);/g;
    let m;
    while ((m = re.exec(r.decls))) {
      if (!(m[1] in vars)) vars[m[1]] = m[2].trim();
    }
  }
  return vars;
}

const VARS = rootVars();

/** 規則選擇器完全等於 selector（逗號分隔清單之一）的宣告（不含 @media） */
function baseRule(selector) {
  return BASE_RULES.filter((r) => !r.media && r.selector.split(",").map((s) => s.trim()).includes(selector))
    .map((r) => r.decls).join("\n");
}

// ── WCAG 與色彩計算 ──

function hexToRgb(hex) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  assert.ok(m, "不是 #rrggbb：" + hex);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance(hex) {
  const c = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function hsl(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  if (h < 0) h += 360;
  return { h, s: s * 100, l: l * 100 };
}

// ── 期望值（契約 COLOR_TOKENS、SEMANTIC_COLORS 與 architecture.md §7.19.1，逐字） ──

const COLOR_TOKENS = {
  brand: "#1e9bf0",
  brandDeep: "#0866ad",
  accent: "#f7893b",
  accentText: "#1f2937",
  themeColor: "#1e9bf0",
  background: "#eef4fa",
  surface: "#ffffff",
  text: "#1f2937",
  textMuted: "#5b6472",
};

/** COLOR_TOKENS 鍵 → CSS 變數（themeColor 無 CSS 變數，= --brand） */
const TOKEN_VAR = {
  brand: "--brand",
  brandDeep: "--brand-deep",
  accent: "--accent",
  accentText: "--accent-text",
  themeColor: "--brand",
  background: "--bg",
  surface: "--surface",
  text: "--text",
  textMuted: "--text-muted",
};

/** v0.11 語意色變數（AC-38-03：不得更動） */
const SEMANTIC_VARS_V011 = {
  "--color-orange": "#e8833a",
  "--color-brown": "#8b5a2b",
  "--color-green": "#2e9e5b",
  "--color-blue": "#2f6fd6",
  "--color-gold": "#c9a227",
  "--correct": "#15803d",
  "--correct-bg": "#dcfce7",
  "--wrong": "#b91c1c",
  "--wrong-bg": "#fee2e2",
  "--light-green": "#16a34a",
  "--light-yellow": "#ca8a04",
  "--light-red": "#dc2626",
};

/** §7.19.1 新增與改值的介面變數 */
const UI_VARS = {
  "--primary": "#0866ad",
  "--primary-hover": "#06558e",
  "--tint": "#e6f0fa",
  "--track": "#dbe7f3",
  "--chart-bar": "#9cc3e6",
  "--line": "#e3e8ef",
  "--border": "#d5d9e0",
  "--focus": "#0866ad",
  "--radius": "8px",
  "--radius-cta": "12px",
  "--radius-card": "16px",
  "--shadow-card": "0 1px 3px rgba(16, 40, 80, 0.08), 0 4px 14px rgba(16, 40, 80, 0.06)",
  "--content-narrow": "720px",
  "--emt-firstbar-h": "184px",
};

describe("tokens：00-base.css :root（§7.19.1）", () => {
  test("COLOR_TOKENS 測試字面值 = layout.COLOR_TOKENS（契約 §13）", () => {
    assert.deepStrictEqual({ ...layout.COLOR_TOKENS }, COLOR_TOKENS);
  });

  test("--brand…--text-muted = COLOR_TOKENS（AC-38-01、AC-38-02）", () => {
    for (const [k, v] of Object.entries(TOKEN_VAR)) {
      assert.equal((VARS[v] || "").toLowerCase(), COLOR_TOKENS[k], `${v}（${k}）`);
    }
  });

  test("色級、對錯、燈號變數 = v0.11 值（AC-38-03、VC-6）", () => {
    for (const [k, v] of Object.entries(SEMANTIC_VARS_V011)) {
      assert.equal((VARS[k] || "").toLowerCase(), v, k);
    }
    // 與契約 SEMANTIC_COLORS 一致
    const S = layout.SEMANTIC_COLORS;
    for (const id of Object.keys(S.level)) assert.equal(VARS["--color-" + id], S.level[id]);
    assert.equal(VARS["--correct"], S.correct);
    assert.equal(VARS["--wrong"], S.wrong);
    for (const id of Object.keys(S.sttLight)) assert.equal(VARS["--light-" + id], S.sttLight[id]);
    assert.equal(VARS["--color-gold"], S.goalReached);
  });

  test("介面變數值（§7.19.1 表）；--primary 與 --color-blue 不同值（DS-21）", () => {
    for (const [k, v] of Object.entries(UI_VARS)) {
      assert.equal(VARS[k], v, k);
    }
    assert.notEqual(VARS["--primary"], VARS["--color-blue"]);
    assert.equal(VARS["--primary"], VARS["--brand-deep"]);
  });

  test("UI_LAYOUT 與 CSS 寫死值一致（720、16、184、focus 3px）", () => {
    const U = layout.UI_LAYOUT;
    assert.equal(VARS["--content-narrow"], U.CONTENT_NARROW_PX + "px");
    assert.equal(VARS["--radius-card"], U.CARD_RADIUS_PX + "px");
    assert.equal(VARS["--emt-firstbar-h"], U.FIRSTBAR_RESERVE_PX + "px");
    assert.match(prop(baseRule(":focus-visible"), "outline"), new RegExp("^" + U.FOCUS_OUTLINE_PX + "px solid var\\(--focus\\)$"));
    assert.equal(prop(baseRule(":focus-visible"), "outline-offset"), "2px");
  });

  test("--bg 為檔案中第一個 --bg 宣告，值 = PWA_BACKGROUND_COLOR = manifest background_color（VC-5、B-11）", () => {
    const first = BASE.match(/--bg\s*:\s*([^;]+);/);
    assert.ok(first);
    assert.equal(first[1].trim().toLowerCase(), pwa.PWA_BACKGROUND_COLOR);
    assert.equal(pwa.PWA_MANIFEST.background_color, COLOR_TOKENS.background);
    assert.equal(pwa.PWA_THEME_COLOR, COLOR_TOKENS.themeColor);
    assert.equal(pwa.PWA_MANIFEST.theme_color, COLOR_TOKENS.themeColor);
  });

  test("--bg HSL：色相 190°～220°、飽和度 ≥ 15%、亮度 94%～98%（VC-4）", () => {
    const c = hsl(VARS["--bg"]);
    assert.ok(c.h >= 190 && c.h <= 220, "色相 " + c.h);
    assert.ok(c.s >= 15, "飽和度 " + c.s);
    assert.ok(c.l >= 94 && c.l <= 98, "亮度 " + c.l);
  });

  test("--brand-deep 與 --brand 色相差 ≤ 10°（VC-2）", () => {
    const d = Math.abs(hsl(VARS["--brand-deep"]).h - hsl(VARS["--brand"]).h);
    assert.ok(Math.min(d, 360 - d) <= 10, "色相差 " + d);
  });
});

describe("tokens：WCAG 對比（AC-38-04、VC-7）", () => {
  const W = "#ffffff";
  const cases = [
    ["--text 對 --bg", VARS["--text"], VARS["--bg"]],
    ["--text 對 --surface", VARS["--text"], VARS["--surface"]],
    ["--text-muted 對 --bg", VARS["--text-muted"], VARS["--bg"]],
    ["--text-muted 對 --surface", VARS["--text-muted"], VARS["--surface"]],
    ["白 對 --primary", W, VARS["--primary"]],
    ["白 對 --primary-hover", W, VARS["--primary-hover"]],
    ["--accent-text 對 --accent", VARS["--accent-text"], VARS["--accent"]],
    ["--brand-deep 對 --tint", VARS["--brand-deep"], VARS["--tint"]],
    ["--brand-deep 對 --surface", VARS["--brand-deep"], VARS["--surface"]],
    ["--brand-deep 對 --bg", VARS["--brand-deep"], VARS["--bg"]],
  ];
  for (const [name, fg, bg] of cases) {
    test(name + " ≥ 4.5", () => {
      const r = contrast(fg, bg);
      assert.ok(r >= 4.5, `${name} = ${r.toFixed(2)}`);
    });
  }

  test("反向確認：白 對 --brand < 4.5（--brand 不可作白字底，VC-1）；白 對 --accent < 4.5（不得白字，VC-3）", () => {
    assert.ok(contrast(W, VARS["--brand"]) < 4.5);
    assert.ok(contrast(W, VARS["--accent"]) < 4.5);
  });

  test("鎖定列：--text 以 0.85 透明度疊在白底後仍 ≥ 4.5（§7.19.5、Q-57）", () => {
    const fg = hexToRgb(VARS["--text"]);
    const mix = fg.map((v) => Math.round(v * 0.85 + 255 * 0.15));
    const hex = "#" + mix.map((v) => v.toString(16).padStart(2, "0")).join("");
    assert.ok(contrast(hex, W) >= 4.5, hex + " = " + contrast(hex, W).toFixed(2));
  });
});

describe("tokens：共用元件樣式（§7.19.2）", () => {
  test("body：background var(--bg)、font-variant-numeric: tabular-nums（AC-38-02、AC-38-07）", () => {
    const body = baseRule("body");
    assert.equal(prop(body, "background"), "var(--bg)");
    assert.equal(prop(body, "font-variant-numeric"), "tabular-nums");
  });

  test(".card：--surface 底、border 0、圓角 var(--radius-card) = 16px、box-shadow 非 none（AC-38-06、VC-4）", () => {
    const card = baseRule(".card");
    assert.equal(prop(card, "background"), "var(--surface)");
    assert.equal(prop(card, "border"), "0");
    assert.equal(prop(card, "border-radius"), "var(--radius-card)");
    assert.equal(VARS["--radius-card"], "16px");
    const sh = prop(card, "box-shadow");
    assert.ok(sh && sh !== "none");
  });

  test(".btn：透明 1px 邊框、--tint 底、--brand-deep 字；.btn--primary 白字 --primary 底；.btn--link --brand-deep", () => {
    const btn = baseRule(".btn");
    assert.equal(prop(btn, "border"), "1px solid transparent");
    assert.equal(prop(btn, "background"), "var(--tint)");
    assert.equal(prop(btn, "color"), "var(--brand-deep)");
    assert.equal(prop(btn, "border-radius"), "var(--radius)");
    const primary = baseRule(".btn--primary");
    assert.equal(prop(primary, "background"), "var(--primary)");
    assert.equal(prop(primary, "border-color"), "transparent");
    const link = baseRule(".btn--link");
    assert.equal(prop(link, "color"), "var(--brand-deep)");
  });

  test(".btn--accent：--accent 底、--accent-text 字、邊框透明、圓角 12px、粗體、min-height 48px（VC-3、AC-39-02）", () => {
    const a = baseRule(".btn--accent");
    assert.equal(prop(a, "background"), "var(--accent)");
    assert.equal(prop(a, "color"), "var(--accent-text)");
    assert.equal(prop(a, "border-color"), "transparent");
    assert.equal(prop(a, "border-radius"), "var(--radius-cta)");
    assert.equal(prop(a, "font-weight"), "700");
    assert.equal(prop(a, "min-height"), "48px");
    // hover 不換底色
    const hovers = BASE_RULES.filter((r) => /\.btn--accent:hover/.test(r.selector));
    for (const r of hovers) {
      assert.equal(prop(r.decls, "background"), null);
      assert.equal(prop(r.decls, "background-color"), null);
    }
  });

  test(".page-title 22px／700；.section-title 18px／700（AC-38-07）", () => {
    assert.equal(prop(baseRule(".page-title"), "font-size"), "1.375rem");
    assert.equal(prop(baseRule(".page-title"), "font-weight"), "700");
    assert.equal(prop(baseRule(".section-title"), "font-size"), "1.125rem");
    assert.equal(1.125 * 16, layout.UI_LAYOUT.SECTION_TITLE_PX);
    assert.equal(prop(baseRule(".section-title"), "font-weight"), "700");
  });

  test("頁首、頁尾、導覽分隔線用 --line；選中導覽文字不得為 --brand", () => {
    assert.match(prop(baseRule(".app-header"), "box-shadow"), /var\(--line\)/);
    assert.match(prop(baseRule(".app-footer"), "border-top"), /var\(--line\)/);
    for (const r of BASE_RULES.filter((x) => /aria-current/.test(x.selector))) {
      const c = prop(r.decls, "color");
      assert.notEqual(c, "var(--brand)", r.selector + " @ " + r.media);
    }
  });

  test("輸入框維持 1px solid var(--border)", () => {
    const input = BASE_RULES.find((r) => !r.media && /^input\[type="text"\]/.test(r.selector));
    assert.ok(input);
    assert.equal(prop(input.decls, "border"), "1px solid var(--border)");
  });
});

describe("tokens：§7.19.1 禁止寫法（掃描全部 styles/*.css）", () => {
  test("樣式檔清單非空且含 00-base.css", () => {
    assert.ok(CSS_FILES.includes("00-base.css"));
    assert.ok(CSS_FILES.length >= 10);
  });

  for (const file of CSS_FILES) {
    const src = readCss(file);
    const rules = parseRules(src);

    test(`${file}：(1) 無 color: var(--brand)／var(--accent)`, () => {
      assert.doesNotMatch(src, /(?<![-\w])color\s*:\s*var\(--(brand|accent)\)/);
    });

    test(`${file}：(2) var(--accent) 只出現在 .btn--accent 或 .db-stat__icon 規則`, () => {
      for (const r of rules) {
        if (!/var\(--accent\)/.test(r.decls)) continue;
        if (r.selector === ":root") continue;
        assert.match(r.selector, /\.btn--accent|\.db-stat__icon/, "選擇器：" + r.selector);
      }
    });

    test(`${file}：(3) #f7893b、#1e9bf0 字面值只在 :root`, () => {
      for (const r of rules) {
        if (r.selector === ":root") continue;
        assert.doesNotMatch(r.decls, /#f7893b|#1e9bf0/i, "選擇器：" + r.selector);
      }
      // 規則之外（例如選擇器本身）也不得出現
      const outside = rules.filter((r) => r.selector !== ":root").map((r) => r.selector).join("\n");
      assert.doesNotMatch(outside, /#f7893b|#1e9bf0/i);
    });

    test(`${file}：(4) 選擇器含 .btn 或 .card 的規則不得用 var(--border) 或 #d5d9e0`, () => {
      for (const r of rules) {
        if (!/\.(btn|card)(?![\w])/.test(r.selector)) continue;
        assert.doesNotMatch(r.decls, /var\(--border\)|#d5d9e0/i, "選擇器：" + r.selector);
      }
    });

    test(`${file}：(5) 無 @font-face、無 url(`, () => {
      assert.doesNotMatch(src, /@font-face/i);
      assert.doesNotMatch(src, /url\(/i);
    });
  }
});
