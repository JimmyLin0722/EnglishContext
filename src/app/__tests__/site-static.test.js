/*
 * site-static.test.js — v0.19 交付關卡：對專案實際原始碼建置後的靜態檢查（FE-89）
 * 受測：tools/build.mjs（write: false，不寫 dist/）的交付 HTML 與部署檔；src/app、tools 原始碼
 * 依據：architecture.md v0.14 §7.25.8、§7.25.9、§10.11；契約 README §13.4 SC-2、SC-4、§13.5 SE-1～SE-8、§13.6 ML-2～ML-4、
 *       §13.7 V-SITE-03、V-SITE-04、V-SEO-01～V-SEO-07、V-MAIL-02、V-ANS-03、DS-56
 * 涵蓋：AC-23-07、AC-23-08、AC-49-06、AC-49-07、AC-50-03、AC-50-09、AC-55-01、AC-55-04、AC-56-01～AC-56-09、AC-57-03、AC-57-04
 *
 * - 版本值與「單元 ID 為 null」不寫入本檔（§7.25.4、D-14）：第二階段只改廣告單元 ID 時，本檔不得失敗（AC-50-05）。
 * - 本檔不含任何連續無空白地址；ML-3 的判定規則依契約以字串拼接組成，範圍只限 src/app、tools 與建置輸出（§7.25.9）。
 * - 掃描全部 git ls-files 的 V-MAIL-01 不在此處，由 QA 執行（SD-FB-83）。
 */
"use strict";

const { describe, test, before } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const C = require("../core/constants.js");
const S = require("../core/site-content.js");
const AD = require("../core/ad.js");
const PWA = require("../core/pwa.js");

const ROOT = path.resolve(__dirname, "..", "..", "..");
const APP_DIR = path.join(ROOT, "src", "app");
const TOOLS_DIR = path.join(ROOT, "tools");
const BUILD = path.join(TOOLS_DIR, "build.mjs");

/** ML-3：連續地址判定（字串拼接組規則，本檔不含完整地址） */
const AT = String.fromCharCode(64);
const DOMAIN = "gm" + "ail" + "\\." + "c" + "om";
const CONTINUOUS_RE = new RegExp("[A-Za-z0-9._%+-]*" + AT + DOMAIN, "i");

/** ML-4：字元間以單一空格分隔、含 @ 的字串（契約逐字） */
const SPACED_RE = /(?:[A-Za-z0-9._%+-] ){3,}@(?: [A-Za-z0-9._%+-])+/g;

/** V-LGL-05 的 A、B 組字詞（AC-23-08） */
const GROUP_A = ["多益", "TOEIC"];
const GROUP_B = ["常考", "必考", "最常考", "最常見", "最常用", "高頻"];

/** 3 個靜態頁的檔名 */
const STATIC_PAGES = ["about.html", "contact.html", "privacy.html"];
/** 爬蟲規則須放行的使用者代理與路徑（V-SEO-07） */
const BOTS = ["Mediapartners-Google", "Google-Display-Ads-Bot", "Googlebot"];
const BOT_PATHS = ["/", "/index.html", "/about.html", "/contact.html", "/privacy.html"];

let result;
/** 部署檔內容（文字） */
const textOf = (p) => {
  const f = result.site.files.find((x) => x.path === p);
  assert.ok(f, "部署檔應存在：" + p);
  return Buffer.from(f.bytes).toString("utf8");
};
const pageOf = (id) => S.SITE_PAGES.find((p) => p.id === id);
const mainOf = (html) => html.slice(html.indexOf("<main>") + "<main>".length, html.indexOf("</main>"));
const headOf = (html) => html.slice(0, html.indexOf("</head>"));
const countOf = (text, sub) => text.split(sub).length - 1;
const metaContents = (html, attr, name) =>
  [...html.matchAll(new RegExp("<meta " + attr + '="' + name + '" content="([^"]*)">', "g"))].map((m) => unescapeHtml(m[1]));

function unescapeHtml(s) {
  return s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
}

/** SC-4 的文字序列（靜態頁端）：依序取 h1,h2,h3,p,li 的文字，正規化空白 */
function textSequence(main) {
  return (main.match(/<(h1|h2|h3|p|li)\b[^>]*>[\s\S]*?<\/\1>/g) || []).map((b) =>
    unescapeHtml(b.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim()
  );
}

/** SC-2：由 SITE_PAGES 算出應有的文字序列（應用內畫面由 site-pages.test.js 對同一序列驗證） */
function expectedSequence(page) {
  const inlineText = (inlines) => inlines.map((i) => i.text).join("");
  const out = [page.title];
  for (const b of page.blocks) {
    if (b.kind === "heading") out.push(b.text);
    else if (b.kind === "paragraph") out.push(inlineText(b.inlines));
    else if (b.kind === "list") out.push(...b.items.map(inlineText));
    else if (b.kind === "contactLine") out.push(S.SOURCES_CONTACT_TEXT);
  }
  return out.map((t) => t.replace(/\s+/g, " ").trim());
}

/** 遞迴列出文字檔；含 NUL 位元組者視為二進位，略過（ML-3） */
function listTextFiles(dir, skip = () => false, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (skip(ent.name)) continue;
    if (ent.isDirectory()) {
      listTextFiles(full, skip, out);
    } else {
      const buf = fs.readFileSync(full);
      if (!buf.includes(0)) out.push({ file: full, text: buf.toString("utf8") });
    }
  }
  return out;
}

/** 移除 JS／CSS 註解與 HTML 註解（V-ANS-03 只看畫面文字來源；FB-64 程式註解不算） */
function stripComments(src) {
  return src
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
}

/** robots.txt 只有「*」群組時的判定：是否放行 agent 讀取 pathname */
function robotsAllows(txt, agent, pathname) {
  const groups = [];
  let cur = null;
  for (const raw of txt.split("\n")) {
    const line = raw.trim();
    const m = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(line);
    if (!m) continue;
    const key = m[1].toLowerCase();
    if (key === "user-agent") {
      if (!cur || cur.rules.length > 0) { cur = { agents: [], rules: [] }; groups.push(cur); }
      cur.agents.push(m[2].toLowerCase());
    } else if ((key === "allow" || key === "disallow") && cur) {
      cur.rules.push({ allow: key === "allow", path: m[2] });
    }
  }
  const lower = agent.toLowerCase();
  const group = groups.find((g) => g.agents.includes(lower)) || groups.find((g) => g.agents.includes("*"));
  if (!group) return true;
  // 最長路徑優先，相同長度時 Allow 優先（RFC 9309）；空的 Disallow 不生效
  const hits = group.rules.filter((r) => r.path !== "" && pathname.startsWith(r.path));
  hits.sort((a, b) => b.path.length - a.path.length || Number(b.allow) - Number(a.allow));
  return hits.length === 0 ? true : hits[0].allow;
}

before(async () => {
  const { build } = await import(pathToFileURL(BUILD).href);
  result = build({ write: false, log() {}, warn() {} });
  assert.ok(result.site, "應有部署目錄內容");
});

describe("部署目錄與單一來源（V-SITE-03、V-SITE-04、AC-36-07）", () => {
  test("部署檔恰為 PWA_DEPLOY_FILES 的 13 項；index.html 與交付 HTML 相同", () => {
    const got = result.site.files.map((f) => f.path).sort();
    assert.equal(got.length, 13);
    assert.deepEqual(got, PWA.PWA_DEPLOY_FILES.map((f) => f.path).sort());
    assert.equal(textOf("index.html"), result.html);
  });

  test("前提：SC-4 文字序列非空，且 3 頁的標題各在第一項", () => {
    for (const p of S.SITE_PAGES) {
      const seq = textSequence(mainOf(textOf(p.staticPath)));
      assert.ok(seq.length >= 2, p.id);
      assert.equal(seq[0], p.title);
    }
  });

  test("V-SITE-03：3 頁靜態頁 <main> 的文字序列與 SITE_PAGES 完全相同", () => {
    for (const p of S.SITE_PAGES) {
      assert.deepEqual(textSequence(mainOf(textOf(p.staticPath))), expectedSequence(p), p.id);
    }
  });

  test("V-SITE-03：文案字串只出現在 core/site-content.js 這 1 個原始檔", () => {
    const needle = "學習紀錄只存在你目前使用的瀏覽器";
    const files = [
      ...listTextFiles(APP_DIR, (n) => n === "__tests__"),
      ...listTextFiles(TOOLS_DIR),
    ].filter((f) => f.text.includes(needle));
    assert.deepEqual(
      files.map((f) => path.relative(ROOT, f.file).split(path.sep).join("/")),
      ["src/app/core/site-content.js"]
    );
  });

  test("V-SITE-04：靜態頁 <script> 0、恰 1 個 <main>、有回首頁與 4 個入口；無外部資源、無 noindex、無廣告", () => {
    for (const name of STATIC_PAGES) {
      const html = textOf(name);
      assert.doesNotMatch(html, /<script\b/i, name);
      assert.equal(countOf(html, "<main>"), 1, name);
      assert.equal(countOf(html, "</main>"), 1, name);
      assert.equal(countOf(html, '<a href="./">' + S.SITE_PAGE_TEXTS.homeLink + "</a>"), 1, name);
      for (const href of ["about.html", "contact.html", "privacy.html", "./#sources"]) {
        const nav = html.slice(html.indexOf('<nav class="sp-links"'));
        assert.equal(countOf(nav, 'href="' + href + '"'), 1, name + " " + href);
      }
      assert.match(html, /<link rel="icon" href="data:,">/, name + "：無 favicon 請求");
      assert.doesNotMatch(html, /adsbygoogle|google-adsense-account/, name);
      assert.doesNotMatch(html, /noindex/i, name);
      assert.doesNotMatch(html, /url\(|@import/, name);
      assert.doesNotMatch(html, /localStorage|serviceWorker/, name);
      // 外部資源：src 屬性 0；非 <a> 的 href 只可為 canonical 與 data: 圖示
      assert.doesNotMatch(html, /\ssrc=/i, name);
    }
  });

  test("外部連結含 rel=\"noopener\"（AC-53-03）", () => {
    const links = [...mainOf(textOf("privacy.html")).matchAll(/<a\b[^>]*href="https?:[^>]*>/g)].map((m) => m[0]);
    assert.ok(links.length >= 1, "隱私權政策應有外部連結");
    for (const a of links) assert.match(a, /rel="[^"]*noopener[^"]*"/, a);
  });
});

describe("SEO（V-SEO-01～V-SEO-07、AC-56）", () => {
  test("V-SEO-01：首頁 title、description 逐字；description 恰 1 個、50～160 字元；無 keywords", () => {
    const head = headOf(result.html);
    assert.equal(countOf(head, "<title>" + S.SITE_HOME_SEO.documentTitle + "</title>"), 1);
    assert.deepEqual(metaContents(head, "name", "description"), [S.SITE_HOME_SEO.description]);
    const len = S.SITE_HOME_SEO.description.length;
    assert.ok(len >= 50 && len <= 160, "長度 " + len);
    assert.doesNotMatch(head, /name="keywords"/);
  });

  test("V-SEO-01：靜態頁 title = {頁面名稱}｜EnglishContext；description 恰 1 個且不含信箱", () => {
    for (const p of S.SITE_PAGES) {
      const head = headOf(textOf(p.staticPath));
      assert.equal(countOf(head, "<title>" + p.title + "｜EnglishContext</title>"), 1, p.id);
      assert.deepEqual(metaContents(head, "name", "description"), [p.seo.description], p.id);
      assert.doesNotMatch(p.seo.description, /email|@/, p.id);
      assert.doesNotMatch(head, /name="keywords"/, p.id);
    }
  });

  test("V-SEO-02：lang、canonical；無 noindex", () => {
    assert.match(result.html, /<html lang="zh-Hant-TW"/);
    const canon = (h) => [...h.matchAll(/<link rel="canonical" href="([^"]*)">/g)].map((m) => m[1]);
    assert.deepEqual(canon(headOf(result.html)), [S.SITE_ORIGIN + "/"]);
    assert.doesNotMatch(headOf(result.html), /noindex/i);
    for (const p of S.SITE_PAGES) {
      const html = textOf(p.staticPath);
      assert.match(html, /<html lang="zh-Hant-TW"/, p.id);
      assert.deepEqual(canon(headOf(html)), [S.SITE_ORIGIN + "/" + p.staticPath], p.id);
    }
  });

  test("V-SEO-03：Open Graph 依 SE-4；og:url = canonical；og:image 在部署目錄", () => {
    const check = (html, title, desc, url) => {
      assert.deepEqual(metaContents(html, "property", "og:title"), [title]);
      assert.deepEqual(metaContents(html, "property", "og:description"), [desc]);
      assert.deepEqual(metaContents(html, "property", "og:url"), [url]);
      assert.deepEqual(metaContents(html, "property", "og:type"), ["website"]);
      assert.deepEqual(metaContents(html, "property", "og:site_name"), ["EnglishContext"]);
      assert.deepEqual(metaContents(html, "property", "og:locale"), ["zh_TW"]);
    };
    const head = headOf(result.html);
    check(head, S.SITE_HOME_SEO.documentTitle, S.SITE_HOME_SEO.description, S.SITE_HOME_SEO.canonicalUrl);
    const [img] = metaContents(head, "property", "og:image");
    assert.equal(img, S.SITE_ORIGIN + "/icons/icon-512.png");
    const rel = img.slice(S.SITE_ORIGIN.length + 1);
    assert.ok(result.site.files.some((f) => f.path === rel), rel);
    for (const p of S.SITE_PAGES) {
      const h = headOf(textOf(p.staticPath));
      check(h, p.seo.documentTitle, p.seo.description, p.seo.canonicalUrl);
      assert.deepEqual(metaContents(h, "property", "og:image"), [], p.id);
    }
  });

  test("V-SEO-04：結構化資料恰 1 段，深度相等於 SITE_HOME_JSON_LD，鍵只有 5 個", () => {
    const blocks = [...result.html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    assert.equal(blocks.length, 1);
    const data = JSON.parse(blocks[0][1]);
    assert.deepEqual(data, { ...S.SITE_HOME_JSON_LD });
    assert.deepEqual(Object.keys(data).sort(), ["@context", "@type", "description", "name", "url"]);
  });

  test("V-SEO-05：<noscript> 含名稱、說明、功能與 3 個一般連結；不含 h1", () => {
    const blocks = [...result.html.matchAll(/<noscript>([\s\S]*?)<\/noscript>/g)];
    assert.equal(blocks.length, 1);
    const ns = blocks[0][1];
    assert.ok(ns.includes(S.SITE_NOSCRIPT.title));
    assert.ok(ns.includes(S.SITE_NOSCRIPT.description));
    for (const f of S.SITE_NOSCRIPT.features) assert.ok(ns.includes(f), f);
    for (const l of S.SITE_NOSCRIPT.links) assert.ok(ns.includes('<a href="' + l.href + '">' + l.text + "</a>"), l.text);
    assert.doesNotMatch(ns, /<h1\b/);
  });

  test("V-SEO-06：無佐證說法 0；官方、認可只在否定句；首頁 title 無 TOEIC；description 次數；含商標聲明", () => {
    const texts = [
      ...headOf(result.html).replace(/<!--[\s\S]*?-->/g, "").match(/<title>[^<]*|content="[^"]*"/g),
      ...STATIC_PAGES.map((n) => textSequence(mainOf(textOf(n))).join("\n")),
      ...STATIC_PAGES.map((n) => headOf(textOf(n)).replace(/<style>[\s\S]*?<\/style>/, "")),
      S.SITE_NOSCRIPT.description,
      ...S.SITE_NOSCRIPT.features,
    ];
    for (const t of texts) {
      assert.equal(countOf(t, "多益常考"), 0, t);
      assert.equal(countOf(t, "多益最常見"), 0, t);
      for (const sentence of t.split(/[。；？！.;?!\n]/)) {
        const both = GROUP_A.some((a) => sentence.includes(a)) && GROUP_B.some((b) => sentence.includes(b));
        assert.equal(both, false, sentence);
        if (/官方|認可/.test(sentence)) assert.match(sentence, /非|未經/, sentence);
      }
    }
    assert.doesNotMatch(S.SITE_HOME_SEO.documentTitle, /TOEIC/);
    const d = S.SITE_HOME_SEO.description;
    assert.ok(countOf(d, "TOEIC") <= 1 && countOf(d, "多益") <= 1);
    assert.ok(d.includes("TOEIC®"));
    for (const n of STATIC_PAGES) {
      const seq = textSequence(mainOf(textOf(n))).join("\n");
      if (seq.includes("TOEIC®")) assert.ok(seq.includes(S.LEGAL_STATEMENTS.trademark), n);
    }
  });

  test("V-SEO-07：robots.txt、sitemap.xml 逐字；3 個爬蟲可讀；sitemap 恰 4 個 loc", () => {
    const robots = textOf("robots.txt");
    assert.equal(robots, S.ROBOTS_TXT);
    assert.ok(robots.includes("Sitemap: " + S.SITE_ORIGIN + "/sitemap.xml"));
    for (const bot of BOTS) {
      for (const p of BOT_PATHS) assert.equal(robotsAllows(robots, bot, p), true, bot + " " + p);
    }
    const sm = textOf("sitemap.xml");
    assert.equal(sm, S.SITEMAP_XML);
    const locs = [...sm.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);
    assert.deepEqual(locs, [S.SITE_ORIGIN + "/", ...STATIC_PAGES.map((n) => S.SITE_ORIGIN + "/" + n)]);
    assert.doesNotMatch(sm, /lastmod|#/);
  });

  test("robots 判定函式本身可判出封鎖（防止恆真）", () => {
    assert.equal(robotsAllows("User-agent: *\nDisallow: /\n", "Googlebot", "/about.html"), false);
    assert.equal(robotsAllows("User-agent: Googlebot\nDisallow: /index.html\n", "Googlebot", "/index.html"), false);
    assert.equal(robotsAllows("User-agent: *\nDisallow:\n", "Googlebot", "/"), true);
  });
});

describe("廣告（V-AD-03、AC-50-03、AC-50-06、AC-50-09）", () => {
  test("交付 HTML 無指向廣告的靜態標籤；有 AD-15 meta，pub ID 與 ads.txt 一致", () => {
    assert.doesNotMatch(result.html, /<script\s[^>]*\bsrc=/i);
    assert.doesNotMatch(result.html, /<link\s[^>]*href=["'][^"']*(googlesyndication|adsbygoogle)/i);
    assert.equal(
      countOf(headOf(result.html), '<meta name="google-adsense-account" content="' + AD.AD_CONFIG.publisherId + '">'),
      1
    );
    const digits = AD.AD_CONFIG.publisherId.replace("ca-pub-", "");
    assert.equal(textOf("ads.txt").trim(), "google.com, pub-" + digits + ", DIRECT, f08c47fec0942fa0");
  });

  test("AD_SCRIPT_URL 不在 sw.js 與預先快取清單（AC-50-06）", () => {
    const sw = textOf("sw.js");
    assert.equal(countOf(sw, AD.AD_SCRIPT_URL), 0);
    assert.doesNotMatch(sw, /adsbygoogle|googlesyndication/);
    for (const u of PWA.PWA_PRECACHE_URLS) assert.doesNotMatch(u, /adsbygoogle|googlesyndication/);
  });
});

describe("信箱（V-MAIL-02、ML-2～ML-4、AC-23-07、AC-55-04）", () => {
  test("ML-3 規則本身可命中連續形式，也不會誤判空白形式（防止恆假）", () => {
    assert.ok(CONTINUOUS_RE.test("x" + AT + "gm" + "ail" + ".c" + "om"));
    assert.ok(!CONTINUOUS_RE.test(S.SOURCES_CONTACT_TEXT));
  });

  test("ML-3：src/app、tools 文字檔命中 0", () => {
    const hits = [...listTextFiles(APP_DIR), ...listTextFiles(TOOLS_DIR)]
      .filter((f) => CONTINUOUS_RE.test(f.text))
      .map((f) => path.relative(ROOT, f.file));
    assert.deepEqual(hits, []);
  });

  test("ML-3：建置輸出（交付 HTML 與全部文字部署檔）命中 0", () => {
    assert.equal(CONTINUOUS_RE.test(result.html), false);
    for (const f of result.site.files) {
      if (Buffer.from(f.bytes).includes(0)) continue;
      assert.equal(CONTINUOUS_RE.test(Buffer.from(f.bytes).toString("utf8")), false, f.path);
    }
  });

  test("ML-4：交付 HTML 與 3 個靜態頁的空白形式全部等於現行值", () => {
    const current = S.SOURCES_CONTACT_TEXT.slice("email: ".length);
    const scan = (text) => [...new Set(text.match(SPACED_RE) || [])];
    assert.deepEqual(scan(result.html), [current]);
    assert.deepEqual(scan(textOf("contact.html")), [current]);
    assert.deepEqual(scan(textOf("privacy.html")), [current]);
    assert.deepEqual(scan(textOf("about.html")), [], "關於我不顯示信箱");
  });

  test("V-MAIL-02：mailto: 0；聯絡我們與隱私權政策含信箱行，且不在連結內；head 不含地址", () => {
    assert.equal(countOf(result.html, "mailto:"), 0);
    for (const n of STATIC_PAGES) assert.equal(countOf(textOf(n), "mailto:"), 0, n);
    assert.ok(result.html.includes(S.SOURCES_CONTACT_TEXT));
    for (const n of ["contact.html", "privacy.html"]) {
      assert.equal(countOf(mainOf(textOf(n)), "<p>" + S.SOURCES_CONTACT_TEXT + "</p>"), 1, n);
    }
    for (const h of [result.html, ...STATIC_PAGES.map(textOf)]) {
      assert.doesNotMatch(headOf(h).replace(/<style>[\s\S]*?<\/style>/, ""), /d o n c l y|email:/);
    }
  });

  test("聯絡我們 <main> 只有標題與 1 行信箱；無表單控制項（AC-55-01、AC-55-03）", () => {
    const html = textOf("contact.html");
    assert.deepEqual(textSequence(mainOf(html)), [pageOf("contact").title, S.SOURCES_CONTACT_TEXT]);
    assert.doesNotMatch(html, /<(form|input|textarea|button)\b/i);
  });
});

describe("已答對顯示與資料不變（V-ANS-03、DS-56）", () => {
  test("畫面文字來源（constants、site-content、views、ui、index.html）去註解後無「正確率」「累計答對」", () => {
    const words = ["正確" + "率", "累計" + "答對"];
    const roots = [path.join(APP_DIR, "views"), path.join(APP_DIR, "ui")];
    const files = [
      path.join(APP_DIR, "core", "constants.js"),
      path.join(APP_DIR, "core", "site-content.js"),
      path.join(APP_DIR, "index.html"),
      ...roots.flatMap((d) => listTextFiles(d).map((f) => f.file)),
    ];
    assert.ok(files.length > 5, "防止掃描空集合");
    const hits = [];
    for (const f of files) {
      const code = stripComments(fs.readFileSync(f, "utf8"));
      for (const w of words) if (code.includes(w)) hits.push(path.relative(APP_DIR, f) + "：" + w);
    }
    assert.deepEqual(hits, []);
  });

  test("CURRENT_SCHEMA_VERSION 為 3", () => {
    assert.equal(C.CURRENT_SCHEMA_VERSION, 3);
  });
});
