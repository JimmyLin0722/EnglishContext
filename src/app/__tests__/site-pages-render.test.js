// tools/site-pages.mjs 的單元測試（FE-85；architecture.md v0.14 §7.25.8、§10.11）
// 契約：DP-7、DP-8、SC-2～SC-4、SE-2～SE-7、V-SEO-02～V-SEO-05、V-SITE-04。純函式測試，不寫檔。
"use strict";

const { describe, test, before } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const SITE = require("../core/site-content.js");
const AD = require("../core/ad.js");
const MODULE = path.resolve(__dirname, "..", "..", "..", "tools", "site-pages.mjs");
const CSS = "body { color: #1f2937; }\n";

let P;
before(async () => {
  P = await import(pathToFileURL(MODULE).href);
});

const pageOf = (id) => SITE.SITE_PAGES.find((p) => p.id === id);
const render = (id) => P.renderStaticPage(pageOf(id), SITE, CSS);
const mainOf = (html) => html.slice(html.indexOf("<main>") + 6, html.indexOf("</main>"));

/** SC-4 的文字序列（靜態頁端）：依序取 h1,h2,h3,p,li 的文字 */
function textSequence(main) {
  const blocks = main.match(/<(h1|h2|h3|p|li)\b[^>]*>[\s\S]*?<\/\1>/g) || [];
  return blocks.map((b) =>
    b
      .replace(/<[^>]+>/g, "")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim()
  );
}

/** 由 SITE_PAGES 直接算出應有的文字序列（SC-2） */
function expectedSequence(page) {
  const inlineText = (inlines) => inlines.map((i) => i.text).join("");
  const out = [page.title];
  for (const b of page.blocks) {
    if (b.kind === "heading") out.push(b.text);
    else if (b.kind === "paragraph") out.push(inlineText(b.inlines));
    else if (b.kind === "list") out.push(...b.items.map(inlineText));
    else if (b.kind === "contactLine") out.push(SITE.SOURCES_CONTACT_TEXT);
  }
  return out;
}

describe("escapeHtml、escapeForScript", () => {
  test("跳脫 & < > \"，& 最先處理；非字串轉字串", () => {
    assert.equal(P.escapeHtml('a&b<c>d"e'), "a&amp;b&lt;c&gt;d&quot;e");
    assert.equal(P.escapeHtml("&lt;"), "&amp;lt;");
    assert.equal(P.escapeHtml(5), "5");
    assert.equal(P.escapeHtml("'｜®"), "'｜®");
  });

  test("escapeForScript：</ 與 <!-- 不會提早結束 script", () => {
    assert.equal(P.escapeForScript('{"a":"</script><!--"}'), '{"a":"<\\/script><\\!--"}');
  });
});

describe("renderHomeHead（SE-2、SE-4、SE-5、AD-15）", () => {
  test("順序固定、逐字、無 keywords、noindex、CR", () => {
    const seo = SITE.SITE_HOME_SEO;
    const lines = P.renderHomeHead(SITE, AD).split("\n");
    assert.deepEqual(lines, [
      `<title>${seo.documentTitle}</title>`,
      `<meta name="description" content="${seo.description}">`,
      '<link rel="canonical" href="https://jimmyfantasyworld.com/">',
      `<meta property="og:title" content="${seo.documentTitle}">`,
      `<meta property="og:description" content="${seo.description}">`,
      '<meta property="og:url" content="https://jimmyfantasyworld.com/">',
      '<meta property="og:type" content="website">',
      '<meta property="og:site_name" content="EnglishContext">',
      '<meta property="og:locale" content="zh_TW">',
      '<meta property="og:image" content="https://jimmyfantasyworld.com/icons/icon-512.png">',
      `<meta name="google-adsense-account" content="${AD.AD_CONFIG.publisherId}">`,
      `<script type="application/ld+json">${JSON.stringify(SITE.SITE_HOME_JSON_LD)}</script>`,
    ]);
    const all = lines.join("\n");
    assert.doesNotMatch(all, /keywords|noindex|\r/i);
  });

  test("值會跳脫；JSON-LD 內的 </script 不會結束標籤，解析後仍相同", () => {
    const site = Object.assign({}, SITE, {
      SITE_HOME_SEO: Object.assign({}, SITE.SITE_HOME_SEO, { documentTitle: 'A<B>&"C' }),
      SITE_HOME_JSON_LD: { name: "</script><!--x" },
    });
    const out = P.renderHomeHead(site, AD);
    assert.ok(out.includes("<title>A&lt;B&gt;&amp;&quot;C</title>"));
    assert.equal(out.split("</script>").length - 1, 1);
    const json = /<script type="application\/ld\+json">(.*)<\/script>/.exec(out)[1];
    assert.equal(json, '{"name":"<\\/script><\\!--x"}');
  });
});

describe("checkHomeHead（V-SEO-01～V-SEO-04）", () => {
  const wrap = (head) => `<html><head>${head}</head><body></body></html>`;

  test("完整標記通過；缺項、重複、多一段 JSON-LD、內容不符都回報", () => {
    const ok = P.renderHomeHead(SITE, AD);
    assert.deepEqual(P.checkHomeHead(wrap(ok), SITE, AD), []);
    const bad = [
      ok.replace(/<meta name="description"[^>]*>\n/, ""),
      ok + '\n<meta name="description" content="x">'.replace("x", SITE.SITE_HOME_SEO.description),
      ok + '\n<meta name="keywords" content="x">',
      ok + '\n<meta name="robots" content="noindex">',
      ok + '\n<script type="application/ld+json">{}</script>',
      ok.replace(/<script type="application\/ld\+json">.*<\/script>/, '<script type="application/ld+json">{"@type":"Course"}</script>'),
      ok.replace(/<script type="application\/ld\+json">.*<\/script>/, '<script type="application/ld+json">{oops</script>'),
      ok.replace(/<meta name="google-adsense-account"[^>]*>\n/, ""),
      ok.replace(/<meta property="og:image"[^>]*>\n/, ""),
    ];
    for (const b of bad) assert.ok(P.checkHomeHead(wrap(b), SITE, AD).length > 0, b.slice(-60));
    // <head> 之外又出現 JSON-LD 字樣也不通過
    assert.ok(P.checkHomeHead(wrap(ok) + "application/ld+json", SITE, AD).length > 0);
  });
});

describe("renderNoscript（SE-6、V-SEO-05）", () => {
  test("結構逐字：h2、p、ul、1 個 p 內 3 個正式網址連結；無 h1、無信箱", () => {
    const n = SITE.SITE_NOSCRIPT;
    const out = P.renderNoscript(SITE);
    assert.equal(
      out,
      `<noscript><div class="site-noscript"><h2>${n.title}</h2><p>${n.description}</p><ul>` +
        n.features.map((f) => `<li>${f}</li>`).join("") +
        "</ul><p>" +
        n.links.map((l) => `<a href="${l.href}">${l.text}</a>`).join(" ") +
        "</p></div></noscript>"
    );
    assert.doesNotMatch(out, /<h1|@/);
    assert.equal(n.links.length, 3);
  });
});

describe("renderStaticPage（DP-8、SE-3、SC-2、§7.25.8）", () => {
  for (const id of ["about", "contact", "privacy"]) {
    test(`${id}：結構、SEO、共用連結；通過 checkStaticPage`, () => {
      const page = pageOf(id);
      const html = render(id);
      assert.deepEqual(P.checkStaticPage(html, page, AD), []);
      assert.ok(html.startsWith('<!doctype html>\n<html lang="zh-Hant-TW">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n'));
      assert.ok(html.endsWith("</body>\n</html>\n"));
      assert.doesNotMatch(html, /\r|<script|google-adsense-account|noindex|og:image|mailto:/i);
      const seo = page.seo;
      for (const line of [
        `<title>${seo.documentTitle}</title>`,
        `<meta name="description" content="${seo.description}">`,
        `<link rel="canonical" href="${seo.canonicalUrl}">`,
        `<meta property="og:title" content="${seo.documentTitle}">`,
        `<meta property="og:description" content="${seo.description}">`,
        `<meta property="og:url" content="${seo.canonicalUrl}">`,
        '<meta property="og:type" content="website">',
        '<meta property="og:site_name" content="EnglishContext">',
        '<meta property="og:locale" content="zh_TW">',
        '<link rel="icon" href="data:,">',
      ]) {
        assert.equal(html.split(line).length - 1, 1, line);
      }
      assert.ok(html.includes(`<style>\n${CSS}</style>`));
      assert.ok(html.includes('<header class="sp-header"><a href="./">回到網站首頁</a></header>'));
      // 共用元素都在 <main> 外（AC-55-01、AC-57-04）
      assert.ok(html.includes(
        '</main>\n<nav class="sp-links" aria-label="網站資訊"><a href="about.html">關於我</a><a href="contact.html">聯絡我們</a>' +
          '<a href="privacy.html">隱私權政策</a><a href="./#sources">資料來源與授權</a></nav>\n</body>'
      ));
      assert.ok(!mainOf(html).includes("回到網站首頁"));
      // SC-4：文字序列與 SITE_PAGES 相同
      assert.deepEqual(textSequence(mainOf(html)), expectedSequence(page));
    });
  }

  test("聯絡我們：<main> 恰標題與 1 行信箱，信箱為純文字（AC-55-01、SC-3）", () => {
    assert.equal(mainOf(render("contact")), `\n<h1>聯絡我們</h1>\n<p>${SITE.SOURCES_CONTACT_TEXT}</p>\n`);
    assert.ok(!pageOf("contact").seo.description.includes("@"));
  });

  test("關於我：page 連結指向相對路徑與 ./#sources（SC-2）；標題層級 h1 → h2（SP-7）", () => {
    const main = mainOf(render("about"));
    assert.ok(main.includes('<li><a href="./#sources">資料來源與授權</a></li>'));
    assert.ok(main.includes('<li><a href="privacy.html">隱私權政策</a></li>'));
    assert.ok(main.includes('<li><a href="contact.html">聯絡我們</a></li>'));
    assert.equal((main.match(/<h1>/g) || []).length, 1);
    assert.ok((main.match(/<h2>/g) || []).length >= 1);
    assert.doesNotMatch(main, /<h3/);
  });

  test("隱私權政策：external 含 target=_blank、rel=noopener；文字與連結在同一 p 內無多餘空白", () => {
    const main = mainOf(render("privacy"));
    assert.match(main, /<p>[^<]*：<a href="https:\/\/support\.google\.com\/[^"]+" target="_blank" rel="noopener">[^<]+<\/a><\/p>/);
  });

  test("文案、href 都跳脫，不當 HTML 拼接（SC-2、C-7）；未知 kind 與目標會丟錯，不輸出壞頁", () => {
    const page = {
      id: "x",
      title: "<T>",
      staticPath: "about.html",
      seo: { documentTitle: "<T>", description: '"d"', canonicalUrl: "https://e/?a=1&b=2" },
      blocks: [
        { kind: "heading", text: "<script>" },
        { kind: "paragraph", inlines: [{ kind: "external", text: "&", href: 'https://e/"x' }] },
      ],
    };
    const html = P.renderStaticPage(page, SITE, CSS);
    assert.ok(html.includes("<h1>&lt;T&gt;</h1>"));
    assert.ok(html.includes("<h2>&lt;script&gt;</h2>"));
    assert.ok(html.includes('<a href="https://e/&quot;x" target="_blank" rel="noopener">&amp;</a>'));
    assert.ok(html.includes('content="&quot;d&quot;"'));
    assert.ok(html.includes('href="https://e/?a=1&amp;b=2"'));
    assert.doesNotMatch(html, /<script/);
    const withBlock = (b) => Object.assign({}, page, { blocks: [b] });
    assert.throws(() => P.renderStaticPage(withBlock({ kind: "nope" }), SITE, CSS));
    assert.throws(() => P.renderStaticPage(withBlock({ kind: "paragraph", inlines: [{ kind: "nope" }] }), SITE, CSS));
    assert.throws(() => P.renderStaticPage(withBlock({ kind: "paragraph", inlines: [{ kind: "page", text: "t", target: "nope" }] }), SITE, CSS));
  });

  test("連續呼叫結果相同（DP-10）", () => {
    assert.equal(render("privacy"), render("privacy"));
  });
});

describe("checkStaticPage（DP-7、DP-8、V-SITE-04）", () => {
  const page = () => pageOf("privacy");
  const ok = () => render("privacy");

  test("每種違規都回報", () => {
    const base = ok();
    const inject = (s) => base.replace("</head>", s + "\n</head>");
    const bad = {
      script: inject("<script>1</script>"),
      jsonLd: inject('<script type="application/ld+json">{}</script>'),
      adsense: inject(`<meta name="google-adsense-account" content="${AD.AD_CONFIG.publisherId}">`),
      publisher: base.replace("<main>", `<main><!-- ${AD.AD_CONFIG.publisherId} -->`),
      noindex: inject('<meta name="robots" content="noindex">'),
      ogImage: inject('<meta property="og:image" content="x">'),
      externalCss: inject('<link rel="stylesheet" href="a.css">'),
      img: base.replace("<main>", '<main><img alt="">'),
      iframe: base.replace("<main>", "<main><iframe></iframe>"),
      cr: base.replace("<main>", "<main>\r"),
      bom: "﻿" + base,
      twoMains: base.replace("</main>", "</main><main></main>"),
      noMain: base.replace("<main>", "<div>").replace("</main>", "</div>"),
      twoH1: base.replace("<main>", "<h1>x</h1><main>"),
      wrongCanonical: base.replace(page().seo.canonicalUrl + '">', 'https://e/">'),
      wrongTitle: base.replace(`<title>${page().seo.documentTitle}</title>`, "<title>x</title>"),
      twoDescriptions: inject(`<meta name="description" content="${page().seo.description}">`),
      noHomeLink: base.replace('<a href="./">', '<a href="x">'),
      noSourcesLink: base.replace('<a href="./#sources">資料來源與授權</a></nav>', "</nav>"),
      storage: base.replace("</main>", "localStorage</main>"),
      sw: base.replace("</main>", "serviceWorker</main>"),
      mailto: base.replace("</main>", '<a href="mailto:x">x</a></main>'),
      importCss: base.replace("</style>", "@import 'a';</style>"),
      urlCss: base.replace("</style>", "a{background:url(a.png)}</style>"),
    };
    for (const [name, html] of Object.entries(bad)) {
      assert.ok(P.checkStaticPage(html, page(), AD).length > 0, name);
    }
    assert.deepEqual(P.checkStaticPage(base, page(), AD), []);
  });
});

describe("checkCrawlerFiles（SE-7、SE-8、V-SEO-07）", () => {
  test("真實常數通過；Disallow、lastmod、hash、loc 不符、CR、缺 Sitemap 行都回報", () => {
    assert.deepEqual(P.checkCrawlerFiles(SITE), []);
    const withRobots = (r) => Object.assign({}, SITE, { ROBOTS_TXT: r });
    const withMap = (m) => Object.assign({}, SITE, { SITEMAP_XML: m });
    assert.ok(P.checkCrawlerFiles(withRobots("User-agent: *\nDisallow: /\n\nSitemap: https://jimmyfantasyworld.com/sitemap.xml\n")).length > 0);
    assert.ok(P.checkCrawlerFiles(withRobots("User-agent: *\nAllow: /\n")).length > 0);
    assert.ok(P.checkCrawlerFiles(withRobots(SITE.ROBOTS_TXT.replace(/\n/g, "\r\n"))).length > 0);
    assert.ok(P.checkCrawlerFiles(withMap(SITE.SITEMAP_XML.replace("</url>\n", "<lastmod>2026</lastmod></url>\n"))).length > 0);
    assert.ok(P.checkCrawlerFiles(withMap(SITE.SITEMAP_XML.replace("about.html", "about.html#x"))).length > 0);
    assert.ok(P.checkCrawlerFiles(withMap(SITE.SITEMAP_XML.replace("about.html", "other.html"))).length > 0);
  });

  test("robots 允許爬蟲讀取全站；sitemap 恰 4 個 loc", () => {
    assert.match(SITE.ROBOTS_TXT, /^User-agent: \*\nAllow: \/\n/);
    assert.equal((SITE.SITEMAP_XML.match(/<loc>/g) || []).length, 4);
  });
});
