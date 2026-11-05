/*
 * contact-static.test.js — 聯絡行防爬蟲與更新提示新文字的靜態檢查（FE-77）
 * 受測：tools/build.mjs 對專案實際原始碼的建置產物（write: false，不寫 dist/）、src/app 非測試原始碼、styles/70-sources.css
 * 依據：architecture.md v0.11 §5.6、§7.22、§10.8「contact-static.test.js」列；契約 data-schema.ts §16、README §4.3 L-7、
 *       §9.9 DS-40、§9 FB-61、FB-62、§10.7 UP-6
 * 涵蓋：AC-23-07 (2)(3)、AC-36-03、AC-42-04
 *
 * - 去空格位址一律於執行期由 SOURCES_CONTACT_TEXT 推導，本檔不寫出其字面值（FB-62）。
 * - 建置程式不加防爬蟲規則（§5.6），靜態檢查集中在本檔。
 * - （v0.19，FE-87）常數移到 core/site-content.js；新增 ML-4 判定與 .site-page__contact 規則（architecture.md v0.14 §7.25.9；契約 ML-1、ML-4）。
 */
"use strict";

const { describe, test, before } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const P = require("../views/sources-page.js");

const ROOT = path.resolve(__dirname, "..", "..", "..");
const APP_DIR = path.join(ROOT, "src", "app");
const BUILD = path.join(ROOT, "tools", "build.mjs");

/** 聯絡行原值（取自模組常數） */
const CONTACT = P.SOURCES_CONTACT_TEXT;
/** 去空格位址（執行期推導，小寫比對用） */
const COMPACT = CONTACT.slice("email: ".length).split(" ").join("").toLowerCase();
/** 契約 ML-1：全站唯一的信箱行（逐字，不從被測模組取值） */
const ML_1 = "email: d o n c l y d e 0 7 2 2 @ g m a i l . c o m";
/** 契約 ML-4 判定式：字元間以單一空格分隔、含 @ 的字串 */
const SPACED_ADDRESS = /(?:[A-Za-z0-9._%+-] ){3,}@(?: [A-Za-z0-9._%+-])+/g;

const OLD_NOTICE = "有新版本，重新整理";
const NEW_NOTICE = "有新版本，請更新版本";
const NEW_BUTTON = "更新版本";

/** 字串中子字串出現次數（不重疊） */
function countOf(text, sub) {
  return text.split(sub).length - 1;
}

/** 不分大小寫是否含 mailto: 或去空格位址 */
function assertNoAddress(text, where) {
  assert.doesNotMatch(text, /mailto:/i, `${where} 不得含 mailto:`);
  assert.equal(text.toLowerCase().includes(COMPACT), false, `${where} 不得含去空格位址`);
}

/** 遞迴列出 src/app 中 __tests__ 以外、副檔名為 .js/.css/.html/.txt 的檔案 */
function listAppSources(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "__tests__") continue;
      listAppSources(full, out);
    } else if (/\.(js|css|html|txt)$/i.test(ent.name)) {
      out.push(full);
    }
  }
  return out;
}

describe("contact-static.test.js", () => {
  test("前提：常數形態正確、推導出的去空格位址非空且與原值不同", () => {
    assert.ok(CONTACT.startsWith("email: "));
    assert.equal(CONTACT, ML_1);
    assert.ok(COMPACT.length > 10);
    assert.ok(COMPACT.includes("@"));
    assert.notEqual(COMPACT, CONTACT.toLowerCase());
  });

  describe("建置產物（build({ write: false })，專案預設輸入）", () => {
    let r = null;
    before(async () => {
      const { build } = await import(pathToFileURL(BUILD).href);
      r = build({ write: false, log() {}, warn() {} });
    });

    test("交付 HTML：無 mailto:、無去空格位址（不分大小寫）；常數原值恰 1 次", () => {
      assertNoAddress(r.html, "交付 HTML");
      assert.equal(countOf(r.html, CONTACT), 1);
    });

    test("交付 HTML：無舊提示文字，含新提示與按鈕文字（AC-36-03）", () => {
      assert.equal(countOf(r.html, OLD_NOTICE), 0);
      assert.ok(r.html.includes(NEW_NOTICE));
      assert.ok(r.html.includes(NEW_BUTTON));
    });

    test("交付 HTML：emt-app-version 等於 package.json version（AC-42-04）", () => {
      const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
      const m = r.html.match(/<meta name="emt-app-version" content="([^"]*)">/);
      assert.ok(m, "找不到 emt-app-version meta");
      assert.equal(m[1], pkg.version);
      assert.equal(r.appVersion, pkg.version);
    });

    test("sw.js：無 mailto:、無去空格位址", () => {
      assert.ok(r.site, "應為 PWA 模式並產出部署檔");
      const sw = r.site.files.find((f) => f.path === "sw.js");
      assert.ok(sw, "找不到 sw.js");
      assertNoAddress(sw.bytes.toString("utf8"), "sw.js");
    });
  });

  test("src/app 非測試原始碼：無 mailto:、無去空格位址；常數原值只在 core/site-content.js 出現 1 次", () => {
    const files = listAppSources(APP_DIR);
    assert.ok(files.length > 10, "應掃描到原始碼檔案");
    const hits = [];
    for (const f of files) {
      const text = fs.readFileSync(f, "utf8");
      const rel = path.relative(APP_DIR, f).split(path.sep).join("/");
      assertNoAddress(text, rel);
      const n = countOf(text, CONTACT);
      if (n > 0) hits.push([rel, n]);
    }
    assert.deepEqual(hits, [["core/site-content.js", 1]]);
  });

  test("src/app 非測試原始碼：符合 ML-4 判定式的字串只有目前信箱 1 種，且只在 core/site-content.js（AC-23-07 (8)）", () => {
    const found = [];
    for (const f of listAppSources(APP_DIR)) {
      const rel = path.relative(APP_DIR, f).split(path.sep).join("/");
      for (const m of fs.readFileSync(f, "utf8").match(SPACED_ADDRESS) || []) found.push([rel, m]);
    }
    assert.deepEqual(found, [["core/site-content.js", ML_1.slice("email: ".length)]]);
  });

  test("75-site-pages.css 的 .site-page__contact 規則：次要文字、與 .src-contact 同字級、可換行；無 nowrap／user-select／--accent／#f7893b", () => {
    const css = fs.readFileSync(path.join(APP_DIR, "styles", "75-site-pages.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const m = css.match(/\.site-page__contact\s*\{([^{}]*)\}/);
    assert.ok(m, "應有 .site-page__contact 規則");
    assert.match(m[1], /color:\s*var\(--text-muted\)\s*;/);
    assert.match(m[1], /font-size:\s*0\.8125rem\s*;/);
    assert.match(m[1], /overflow-wrap:\s*anywhere\s*;/);
    for (const bad of [/nowrap/i, /user-select/i]) assert.doesNotMatch(m[1], bad);
    for (const bad of [/--accent/i, /#f7893b/i]) assert.doesNotMatch(css, bad, "整份樣式不用強調橘（AC-38-01）");
  });

  test("70-sources.css 的 .src-contact 規則：0.8125rem 或 0.75rem、overflow-wrap: anywhere；無 nowrap／user-select／--accent／#f7893b", () => {
    const css = fs.readFileSync(path.join(APP_DIR, "styles", "70-sources.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const rules = [];
    const re = /([^{}]+)\{([^{}]*)\}/g;
    let m;
    while ((m = re.exec(css))) {
      if (/\.src-contact\b/.test(m[1])) rules.push(m[2]);
    }
    assert.ok(rules.length >= 1, "應有 .src-contact 規則");
    const body = rules.join("\n");
    assert.match(body, /font-size:\s*(0\.8125rem|0\.75rem)\s*;/);
    assert.match(body, /overflow-wrap:\s*anywhere\s*;/);
    for (const bad of [/nowrap/i, /user-select/i, /--accent/i, /#f7893b/i]) {
      assert.doesNotMatch(body, bad);
    }
  });
});
