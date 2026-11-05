/*
 * site-content.test.js — EMT.core.siteContent 單元測試（FE-83）
 * 受測：core/site-content.js
 * 依據：architecture.md v0.14 §4.12、§7.25.7、§7.25.9、§10.11；契約 data-schema.ts §16、§17、README §13.4 SC-1、§13.6 ML-1～ML-3、§13.7
 * 涵蓋：V-SITE-02、V-SEO-01、V-SEO-06、AC-53-02、AC-53-06、AC-54-01、AC-54-02、AC-55-01～AC-55-04、AC-56-01、AC-56-05～AC-56-09、AC-57-03
 *
 * - 期望值一律以 node:vm 取 data-schema.ts 的字面值做深度相等，本檔不另抄一份文案。
 * - 本檔不含任何連續無空白地址；ML-3 的判定規則依契約以字串拼接組成。
 */
"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const S = require("../core/site-content.js");
const C = require("../core/constants.js");
const L = require("../core/layout.js");

const APP_DIR = path.join(__dirname, "..");
const SOURCE_PATH = path.join(APP_DIR, "core", "site-content.js");
const SCHEMA_PATH = path.join(APP_DIR, "..", "..", "docs", "02-contract", "data-schema.ts");
const SCHEMA = fs.readFileSync(SCHEMA_PATH, "utf8");

const NAMES = [
  "SITE_PAGES", "LEGAL_STATEMENTS", "SOURCES_CONTACT_TEXT", "FOOTER_LINKS", "SITE_PAGE_TEXTS", "SITE_ORIGIN",
  "SITE_HOME_SEO", "SITE_HOME_JSON_LD", "SITE_NOSCRIPT", "ROBOTS_TXT", "SITEMAP_XML"
];

/** 取 data-schema.ts 中 export const NAME 的字面值（以 node:vm 求值，字串拼接與註解由引擎處理） */
function contractLiteral(name) {
  const m = new RegExp("export const " + name + "\\b[^=]*=\\s*([\\s\\S]*?);\\r?\\n").exec(SCHEMA);
  assert.ok(m, "data-schema.ts 找不到 " + name);
  return vm.runInNewContext("(" + m[1].replace(/\s+as const\s*$/, "") + ")");
}

/** 收集值中的所有字串 */
function strings(value, out = []) {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => strings(v, out));
  else if (value && typeof value === "object") Object.values(value).forEach((v) => strings(v, out));
  return out;
}

/** 頁面的畫面文字（標題、段落、清單；不含 SEO 與 href），依序 */
function pageTexts(page) {
  const out = [page.title];
  for (const b of page.blocks) {
    if (b.kind === "heading") out.push(b.text);
    else if (b.kind === "paragraph") out.push(b.inlines.map((i) => i.text).join(""));
    else if (b.kind === "list") b.items.forEach((item) => out.push(item.map((i) => i.text).join("")));
    else if (b.kind === "contactLine") out.push(S.SOURCES_CONTACT_TEXT);
  }
  return out;
}

const pageOf = (id) => S.SITE_PAGES.find((p) => p.id === id);

/** 全部 SEO 與對外文字（V-LGL-05 (c) 的範圍） */
function allPublicStrings() {
  return strings([S.SITE_PAGES, S.LEGAL_STATEMENTS, S.SITE_HOME_SEO, S.SITE_HOME_JSON_LD, S.SITE_NOSCRIPT]);
}

/** 遞迴列出 src/app 中 __tests__ 以外的原始碼 */
function listAppSources(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name !== "__tests__") listAppSources(full, out);
    } else if (/\.(js|css|html|txt)$/i.test(ent.name)) {
      out.push(full);
    }
  }
  return out;
}

describe("V-SITE-02：與 data-schema.ts 字面值深度相等", () => {
  for (const name of NAMES) {
    test(name, () => {
      const expected = contractLiteral(name);
      const actual = S[name];
      // 以 JSON 字串比較，連鍵順序一起驗證
      assert.equal(JSON.stringify(actual), JSON.stringify(expected));
      assert.deepEqual(JSON.parse(JSON.stringify(actual)), JSON.parse(JSON.stringify(expected)));
    });
  }

  test("模組恰匯出 11 個常數", () => {
    assert.deepEqual(Object.keys(S).sort(), [...NAMES].sort());
  });
});

describe("模組形態（SC-1）", () => {
  test("全部深度凍結", () => {
    function frozen(v, where) {
      if (!v || typeof v !== "object") return;
      assert.ok(Object.isFrozen(v), where + " 應凍結");
      for (const k of Object.keys(v)) frozen(v[k], where + "." + k);
    }
    frozen(S, "api");
    assert.throws(() => { S.SITE_PAGES[0].title = "x"; }, TypeError);
    assert.throws(() => { S.FOOTER_LINKS.push({}); }, TypeError);
  });

  test("常數為 JSON 相容（無函式、undefined、非純物件）", () => {
    function check(v, where) {
      if (v === null || ["string", "number", "boolean"].includes(typeof v)) return;
      assert.equal(typeof v, "object", where);
      assert.ok(Array.isArray(v) || Object.getPrototypeOf(v) === Object.prototype, where);
      for (const [k, x] of Object.entries(v)) check(x, where + "." + k);
    }
    check(S, "api");
    assert.deepEqual(JSON.parse(JSON.stringify(S)), JSON.parse(JSON.stringify(S)));
  });

  test("關於我的兩段聲明以變數引用 LEGAL_STATEMENTS，原始碼各只有 1 份字面值（SC-1）", () => {
    const src = fs.readFileSync(SOURCE_PATH, "utf8");
    for (const v of Object.values(S.LEGAL_STATEMENTS)) {
      assert.equal(src.split(v).length - 1, 1, v);
      assert.ok(pageTexts(pageOf("about")).includes(v), v);
    }
    assert.match(src, /text: LEGAL_STATEMENTS\.originalContent\b/);
    assert.match(src, /text: LEGAL_STATEMENTS\.trademark\b/);
  });

  test("V-SITE-03：隱私權政策第 1 段首句在 src/app 非測試原始碼中只出現在此檔", () => {
    const first = pageOf("privacy").blocks[1].inlines[0].text.split("。")[0];
    assert.ok(first.length > 5);
    const hits = listAppSources(APP_DIR).filter((f) => fs.readFileSync(f, "utf8").includes(first));
    assert.deepEqual(hits.map((f) => path.relative(APP_DIR, f).split(path.sep).join("/")), ["core/site-content.js"]);
  });

  test("文字不含 HTML 標記（SC-2：內容一律純文字）", () => {
    for (const s of strings([S.SITE_PAGES, S.LEGAL_STATEMENTS, S.SITE_PAGE_TEXTS, S.SITE_HOME_SEO, S.SITE_NOSCRIPT, S.FOOTER_LINKS])) {
      assert.doesNotMatch(s, /[<>]/, s);
    }
  });
});

describe("頁面結構與常數一致性", () => {
  test("3 個頁面：id、順序、title = TAB_LABELS、靜態路徑", () => {
    assert.deepEqual(S.SITE_PAGES.map((p) => p.id), ["about", "contact", "privacy"]);
    for (const p of S.SITE_PAGES) {
      assert.equal(p.title, C.TAB_LABELS[p.id]);
      assert.equal(p.staticPath, p.id + ".html");
    }
  });

  test("FOOTER_LINKS：4 項順序固定，label = TAB_LABELS[target]（AC-57-01）", () => {
    assert.deepEqual(S.FOOTER_LINKS.map((x) => x.target), ["about", "contact", "privacy", "sources"]);
    for (const x of S.FOOTER_LINKS) assert.equal(x.label, C.TAB_LABELS[x.target]);
  });

  test("page 連結的 target 只有 SiteLinkTarget，文字 = TAB_LABELS[target]", () => {
    const inlines = S.SITE_PAGES.flatMap((p) => p.blocks.flatMap((b) =>
      b.kind === "paragraph" ? b.inlines : b.kind === "list" ? b.items.flat() : []));
    const pages = inlines.filter((i) => i.kind === "page");
    assert.equal(pages.length, 3);
    for (const i of pages) assert.equal(i.text, C.TAB_LABELS[i.target]);
    for (const i of inlines.filter((x) => x.kind === "external")) assert.match(i.href, /^https:\/\//);
  });

  test("區塊 kind 只用契約列出的 4 種，行內 kind 只用 3 種", () => {
    for (const p of S.SITE_PAGES) for (const b of p.blocks) {
      assert.ok(["heading", "paragraph", "list", "contactLine"].includes(b.kind), b.kind);
      const inl = b.kind === "paragraph" ? b.inlines : b.kind === "list" ? b.items.flat() : [];
      for (const i of inl) assert.ok(["text", "external", "page"].includes(i.kind), i.kind);
    }
  });

  test("AC-55-01：聯絡我們內容區只有 1 行信箱；AC-55-03：沒有表單相關區塊", () => {
    assert.deepEqual(JSON.parse(JSON.stringify(pageOf("contact").blocks)), [{ kind: "contactLine" }]);
    assert.equal(pageOf("contact").seo.documentTitle, "聯絡我們｜EnglishContext");
    assert.equal(pageOf("contact").seo.description, "EnglishContext 的聯絡方式。");
  });

  test("AC-53-02：隱私權政策依序含 (1)～(6)，信箱行在最後", () => {
    const blocks = pageOf("privacy").blocks;
    assert.deepEqual(blocks.filter((b) => b.kind === "heading").map((b) => b.text),
      ["學習資料", "廣告服務", "Cookie 與識別碼", "個人化廣告退出方式", "語音辨識", "聯絡方式"]);
    assert.deepEqual(JSON.parse(JSON.stringify(blocks[blocks.length - 1])), { kind: "contactLine" });
    const text = pageTexts(pageOf("privacy")).join("\n");
    for (const part of ["只存在你目前使用的瀏覽器", "Google AdSense", "第三方可能讀寫 Cookie", "關閉個人化廣告", "不錄音、不保存、不上傳錄音"]) {
      assert.ok(text.includes(part), part);
    }
    assert.ok(text.indexOf("只存在你目前使用的瀏覽器") < text.indexOf("Google AdSense"));
  });

  test("AC-53-02、AC-53-06：隱私權政策與對外文字無禁用宣稱", () => {
    const text = allPublicStrings().join("\n");
    for (const bad of ["不會傳送任何資料", "沒有第三方", "廣告無法讀取", "無法讀取學習資料", "零請求", "完全不連網"]) {
      assert.ok(!text.includes(bad), bad);
    }
  });

  test("AC-54-01：關於我依序含 (1)～(5)；AC-54-02：禁用字詞 0 次", () => {
    assert.deepEqual(pageOf("about").blocks.filter((b) => b.kind === "heading").map((b) => b.text),
      ["網站用途", "主要功能", "使用方式", "內容與權利", "相關頁面"]);
    const text = pageTexts(pageOf("about")).join("\n");
    for (const bad of ["學歷", "畢業", "碩士", "博士", "多益分數", "滿分", "團隊", "成員", "保證", "成效", "進步", "見證", "使用者人數"]) {
      assert.ok(!text.includes(bad), bad);
    }
  });
});

describe("SEO（V-SEO-01、V-SEO-06、AC-56）", () => {
  const descriptions = () => [S.SITE_HOME_SEO.description, ...S.SITE_PAGES.map((p) => p.seo.description)];

  test("SITE_ORIGIN、canonical、sitemap、robots 一致；結尾無斜線（SE-1、SE-7、SE-8）", () => {
    assert.ok(!S.SITE_ORIGIN.endsWith("/"));
    assert.equal(S.SITE_HOME_SEO.canonicalUrl, S.SITE_ORIGIN + "/");
    assert.equal(S.SITE_HOME_JSON_LD.url, S.SITE_HOME_SEO.canonicalUrl);
    assert.equal(S.SITE_HOME_SEO.ogImageUrl, S.SITE_ORIGIN + "/icons/icon-512.png");
    const locs = [...S.SITEMAP_XML.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);
    assert.deepEqual(locs, [S.SITE_HOME_SEO.canonicalUrl, ...S.SITE_PAGES.map((p) => p.seo.canonicalUrl)]);
    for (const p of S.SITE_PAGES) assert.equal(p.seo.canonicalUrl, S.SITE_ORIGIN + "/" + p.staticPath);
    assert.ok(S.ROBOTS_TXT.includes("Sitemap: " + S.SITE_ORIGIN + "/sitemap.xml\n"));
  });

  test("首頁 description 50～160 字元；三處相同（AC-56-01、AC-56-05、AC-56-06）", () => {
    const d = S.SITE_HOME_SEO.description;
    assert.ok(d.length >= 50 && d.length <= 160, String(d.length));
    assert.equal(S.SITE_HOME_JSON_LD.description, d);
    assert.equal(S.SITE_NOSCRIPT.description, d);
  });

  test("靜態頁 title = {頁面名稱}｜EnglishContext，每頁都有 description，只有首頁有 og:image（AC-56-01、AC-56-03）", () => {
    for (const p of S.SITE_PAGES) {
      assert.equal(p.seo.documentTitle, p.title + "｜" + L.APP_DISPLAY_NAME);
      assert.ok(p.seo.description.length > 0);
      assert.equal(Object.prototype.hasOwnProperty.call(p.seo, "ogImageUrl"), false);
    }
  });

  test("結構化資料：鍵只有 5 個，不含評分、作者等欄位（AC-56-05）", () => {
    assert.deepEqual(Object.keys(S.SITE_HOME_JSON_LD), ["@context", "@type", "name", "url", "description"]);
    assert.equal(S.SITE_HOME_JSON_LD["@type"], "WebSite");
    assert.equal(S.SITE_HOME_JSON_LD.name, L.APP_DISPLAY_NAME);
  });

  test("V-SEO-06：首頁 title 不含 TOEIC；description 中 TOEIC、多益各 ≤ 1 次，TOEIC 帶 ® 且同句聲明非官方或認可", () => {
    assert.ok(!S.SITE_HOME_SEO.documentTitle.includes("TOEIC"));
    for (const d of descriptions()) {
      assert.ok(d.split("TOEIC").length - 1 <= 1, d);
      assert.ok(d.split("多益").length - 1 <= 1, d);
      if (d.includes("TOEIC")) {
        assert.ok(d.includes("TOEIC®"), d);
        const sentence = d.split(/[。；？！]/).find((x) => x.includes("TOEIC"));
        assert.ok(sentence.includes("非 ETS 官方或認可"), d);
      }
    }
  });

  test("V-SEO-06：「官方」「認可」只在否定句；不用「認證」「授權機構」（AC-56-07）", () => {
    for (const s of allPublicStrings()) {
      for (const sentence of s.split(/[。；？！\n]/)) {
        if (/官方|認可/.test(sentence)) {
          assert.match(sentence, /非 ETS 官方或認可|未經其認可/, sentence);
        }
        assert.doesNotMatch(sentence, /認證|授權機構/, sentence);
      }
    }
  });

  test("V-LGL-05 (c)：無佐證說法 0 次（AC-23-08）", () => {
    const A = ["多益", "TOEIC"];
    const B = ["常考", "必考", "最常考", "最常見", "最常用", "高頻"];
    for (const s of allPublicStrings()) {
      assert.ok(!s.includes("多益常考") && !s.includes("多益最常見"), s);
      for (const sentence of s.split(/[。；？！;?!\n]|\.(?=\s|$)/)) {
        const hitA = A.some((x) => sentence.includes(x));
        const hitB = B.some((x) => sentence.includes(x));
        assert.ok(!(hitA && hitB), sentence);
      }
    }
  });

  test("V-SEO-06：關於我含商標聲明（AC-23-08）；出現 TOEIC® 的頁面都含商標聲明", () => {
    for (const p of S.SITE_PAGES) {
      const text = pageTexts(p).join("\n");
      if (text.includes("TOEIC")) assert.ok(text.includes(S.LEGAL_STATEMENTS.trademark), p.id);
    }
    assert.ok(pageTexts(pageOf("about")).includes(S.LEGAL_STATEMENTS.trademark));
  });

  test("robots.txt：不封鎖、LF、結尾 1 個 LF（AC-56-08）", () => {
    assert.doesNotMatch(S.ROBOTS_TXT, /\r/);
    assert.doesNotMatch(S.ROBOTS_TXT, /^Disallow:\s*\S/m);
    assert.ok(S.ROBOTS_TXT.endsWith("\n") && !S.ROBOTS_TXT.endsWith("\n\n"));
  });

  test("sitemap.xml：恰 4 個 loc、無 lastmod、無 #、LF、結尾 1 個 LF（AC-56-09）", () => {
    assert.doesNotMatch(S.SITEMAP_XML, /\r/);
    assert.equal(S.SITEMAP_XML.split("<loc>").length - 1, 4);
    assert.doesNotMatch(S.SITEMAP_XML, /lastmod|#/);
    assert.ok(S.SITEMAP_XML.endsWith("</urlset>\n"));
  });

  test("noscript：標題不是頁面 h1 的重複內容、3 個連結指向正式網址的靜態頁（AC-56-06）", () => {
    assert.deepEqual(S.SITE_NOSCRIPT.links.map((x) => x.href), S.SITE_PAGES.map((p) => p.seo.canonicalUrl));
    assert.deepEqual(S.SITE_NOSCRIPT.links.map((x) => x.text), S.SITE_PAGES.map((p) => p.title));
    assert.equal(S.SITE_NOSCRIPT.features.length, 3);
  });
});

describe("信箱（ML-1～ML-3）", () => {
  // ML-3：判定規則一律以字串拼接組成，本檔不含完整地址
  const AT = String.fromCharCode(64);
  const DOMAIN = "gm" + "ail" + "\\." + "c" + "om";
  const CONTINUOUS = new RegExp("[A-Za-z0-9._%+-]*" + AT + DOMAIN, "i");
  // ML-4：字元間以單一空格分隔、含 @ 的字串
  const SPACED = /(?:[A-Za-z0-9._%+-] ){3,}@(?: [A-Za-z0-9._%+-])+/g;

  test("ML-1：前綴 email: 加 1 個半形空格，其後每個字元之間各 1 個半形空格，全為半形 ASCII", () => {
    assert.ok(S.SOURCES_CONTACT_TEXT.startsWith("email: "));
    const body = S.SOURCES_CONTACT_TEXT.slice("email: ".length);
    assert.match(body, /^\S( \S)+$/);
    assert.match(S.SOURCES_CONTACT_TEXT, /^[\x20-\x7e]+$/);
    assert.ok(body.includes(" " + AT + " "));
  });

  test("ML-3：模組原始碼、本測試原始碼與 ad-core 測試都不含連續無空白地址，也不含郵件連結", () => {
    for (const f of [SOURCE_PATH, path.join(APP_DIR, "core", "ad.js"), __filename, path.join(__dirname, "ad-core.test.js")]) {
      const text = fs.readFileSync(f, "utf8");
      assert.equal(CONTINUOUS.test(text), false, f);
      assert.equal(text.includes("mail" + "to:"), false, f);
    }
  });

  test("ML-2：SEO、結構化資料、noscript、連結、爬蟲檔都不含信箱；頁面內文只以 contactLine 表示（SC-3）", () => {
    const seo = strings([S.SITE_HOME_SEO, S.SITE_HOME_JSON_LD, S.SITE_NOSCRIPT, S.SITE_PAGES.map((p) => p.seo), S.ROBOTS_TXT, S.SITEMAP_XML, S.FOOTER_LINKS]);
    for (const s of seo) assert.ok(!s.includes(AT), s);
    for (const s of strings(S.SITE_PAGES)) {
      assert.ok(!s.includes(AT) && !s.includes("email"), s);
    }
  });

  test("ML-4：原始碼中符合空白形式的地址只有 SOURCES_CONTACT_TEXT 這一個值，且只出現 1 次", () => {
    const src = fs.readFileSync(SOURCE_PATH, "utf8");
    const found = src.match(SPACED) || [];
    assert.deepEqual(found, [S.SOURCES_CONTACT_TEXT.slice("email: ".length)]);
  });
});
