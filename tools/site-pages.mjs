// 對外頁面與 SEO 的輸出（FE-85；architecture.md v0.14 §4.12、§5.9 B-20～B-23、§7.25.8；
// 契約 README §10.2 DP-7～DP-10、§13.4 SC-2～SC-5、§13.5 SE-1～SE-8、§13.2 AD-15）
// 涵蓋：AC-50-09、AC-53-04、AC-55-01～AC-55-03、AC-56-01～AC-56-06、AC-57-03、AC-57-04
//
// - 純函式：不讀檔、不讀時間、亂數、環境變數；輸出換行一律 LF（DP-7、DP-10）。
// - site 參數 = core/site-content.js；ad 參數 = core/ad.js。文案只取自 site，本檔不另存副本（SC-1）。
// - check* 回傳不符項目的字串陣列（空陣列 = 通過），由 tools/build.mjs 轉為建置中止。

/** Open Graph 的固定值（SE-4） */
const OG_TYPE = "website";
const OG_SITE_NAME = "EnglishContext";
const OG_LOCALE = "zh_TW";

/** 靜態頁 <html> 開頭（DP-8） */
const STATIC_PAGE_START = '<!doctype html>\n<html lang="zh-Hant-TW">\n<head>\n<meta charset="utf-8">\n';
/** 靜態頁的 viewport（§7.25.8） */
const STATIC_VIEWPORT = '<meta name="viewport" content="width=device-width, initial-scale=1">';
/** 靜態頁唯一允許的圖示連結（避免 /favicon.ico 請求，DP-8、HD-4） */
const STATIC_ICON_LINK = '<link rel="icon" href="data:,">';
/** 資料來源頁的入口（SP-6）：靜態頁沒有對應檔案，連到應用程式內 */
const SOURCES_HREF = "./#sources";
/** 靜態頁共用連結必須出現的目標（AC-57-04） */
const STATIC_NAV_HREFS = Object.freeze(["about.html", "contact.html", "privacy.html", SOURCES_HREF]);

/** 跳脫 HTML 文字與屬性值（& < > "；SC-2、B-20） */
export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** B-3：內嵌於 <script> 前的跳脫（</ → <\/、<!-- → <\!--） */
export function escapeForScript(json) {
  return json.replace(/<!--/g, "<\\!--").replace(/<\//g, "<\\/");
}

/** <title>、description、canonical 與前 6 個 Open Graph 標記（首頁與靜態頁共用，順序固定） */
function seoLines(seo) {
  const title = escapeHtml(seo.documentTitle);
  const description = escapeHtml(seo.description);
  const url = escapeHtml(seo.canonicalUrl);
  return [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}">`,
    `<link rel="canonical" href="${url}">`,
    `<meta property="og:title" content="${title}">`,
    `<meta property="og:description" content="${description}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:type" content="${OG_TYPE}">`,
    `<meta property="og:site_name" content="${OG_SITE_NAME}">`,
    `<meta property="og:locale" content="${OG_LOCALE}">`,
  ];
}

/**
 * B-20：首頁 <head> 的 SEO 標記（SE-2、SE-4、SE-5、AD-15）。順序固定；結尾不含換行。
 * @param {object} site core/site-content.js
 * @param {object} ad core/ad.js
 * @returns {string}
 */
export function renderHomeHead(site, ad) {
  const seo = site.SITE_HOME_SEO;
  return [
    ...seoLines(seo),
    `<meta property="og:image" content="${escapeHtml(seo.ogImageUrl)}">`,
    `<meta name="google-adsense-account" content="${escapeHtml(ad.AD_CONFIG.publisherId)}">`,
    `<script type="application/ld+json">${escapeForScript(JSON.stringify(site.SITE_HOME_JSON_LD))}</script>`,
  ].join("\n");
}

/**
 * B-21：未執行 JavaScript 時的網站說明（SE-6）；標題用 h2（靜態標題列已有 h1）。
 * @param {object} site core/site-content.js
 * @returns {string}
 */
export function renderNoscript(site) {
  const n = site.SITE_NOSCRIPT;
  const features = n.features.map((f) => `<li>${escapeHtml(f)}</li>`).join("");
  const links = n.links.map((l) => `<a href="${escapeHtml(l.href)}">${escapeHtml(l.text)}</a>`).join(" ");
  return (
    '<noscript><div class="site-noscript">' +
    `<h2>${escapeHtml(n.title)}</h2>` +
    `<p>${escapeHtml(n.description)}</p>` +
    `<ul>${features}</ul>` +
    `<p>${links}</p>` +
    "</div></noscript>"
  );
}

/** page 連結目標 → 靜態頁的網址（SC-2、SP-6）；未知目標 → 中止，不輸出壞連結 */
function hrefOfTarget(target, site) {
  if (target === "sources") return SOURCES_HREF;
  const page = site.SITE_PAGES.find((p) => p.id === target);
  if (!page) throw new Error(`靜態頁連結目標 ${JSON.stringify(target)} 不存在`);
  return page.staticPath;
}

/** SiteInline → HTML（SC-2） */
function renderInline(inline, site) {
  switch (inline.kind) {
    case "text":
      return escapeHtml(inline.text);
    case "external":
      return `<a href="${escapeHtml(inline.href)}" target="_blank" rel="noopener">${escapeHtml(inline.text)}</a>`;
    case "page":
      return `<a href="${escapeHtml(hrefOfTarget(inline.target, site))}">${escapeHtml(inline.text)}</a>`;
    default:
      throw new Error(`靜態頁遇到未知的行內類型 ${JSON.stringify(inline.kind)}`);
  }
}

function renderInlines(inlines, site) {
  return inlines.map((i) => renderInline(i, site)).join("");
}

/** SiteBlock → HTML 行（SC-2 靜態頁欄；SC-3 信箱行為純文字 <p>） */
function renderBlock(block, site) {
  switch (block.kind) {
    case "heading":
      return [`<h2>${escapeHtml(block.text)}</h2>`];
    case "paragraph":
      return [`<p>${renderInlines(block.inlines, site)}</p>`];
    case "list":
      return ["<ul>", ...block.items.map((item) => `<li>${renderInlines(item, site)}</li>`), "</ul>"];
    case "contactLine":
      return [`<p>${escapeHtml(site.SOURCES_CONTACT_TEXT)}</p>`];
    default:
      throw new Error(`靜態頁遇到未知的區塊類型 ${JSON.stringify(block.kind)}`);
  }
}

/**
 * B-23：單一靜態頁（DP-8、SE-3、SE-4、§7.25.8）。無 script、無 adsense meta、無 og:image、無外部資源。
 * @param {object} page SITE_PAGES 的一筆
 * @param {object} site core/site-content.js
 * @param {string} css 已正規化為 LF 的 CSS
 * @returns {string}
 */
export function renderStaticPage(page, site, css) {
  const home = `<a href="./">${escapeHtml(site.SITE_PAGE_TEXTS.homeLink)}</a>`;
  const links = site.FOOTER_LINKS.map(
    (l) => `<a href="${escapeHtml(hrefOfTarget(l.target, site))}">${escapeHtml(l.label)}</a>`
  );
  return (
    STATIC_PAGE_START +
    [
      STATIC_VIEWPORT,
      ...seoLines(page.seo),
      STATIC_ICON_LINK,
      `<style>\n${css.replace(/\s+$/, "")}\n</style>`,
      "</head>",
      "<body>",
      `<header class="sp-header">${home}</header>`,
      "<main>",
      `<h1>${escapeHtml(page.title)}</h1>`,
      ...page.blocks.flatMap((b) => renderBlock(b, site)),
      "</main>",
      `<nav class="sp-links" aria-label="網站資訊">${links.join("")}</nav>`,
      "</body>",
      "</html>",
    ].join("\n") +
    "\n"
  );
}

/** text 中 needle 的（不重疊）出現次數 */
function countOf(text, needle) {
  return text.split(needle).length - 1;
}

/** 檢查 SE-3／SE-4 共用標記是否各恰 1 次 */
function checkSeoLines(html, seo, problems) {
  for (const line of seoLines(seo)) {
    const n = countOf(html, line);
    if (n !== 1) problems.push(`${line} 應恰 1 次（目前 ${n} 次）`);
  }
}

/**
 * B-23：靜態頁結構檢查（DP-7、DP-8、SE-3、V-SITE-04）。
 * @param {string} html renderStaticPage 的結果
 * @param {object} page SITE_PAGES 的一筆
 * @param {object} ad core/ad.js
 * @returns {string[]} 不符項目
 */
export function checkStaticPage(html, page, ad) {
  const problems = [];
  if (!html.startsWith(STATIC_PAGE_START)) problems.push("開頭不是 DP-8 規定的 doctype、html lang、head、charset");
  if (html.includes("\r")) problems.push("含 CR 字元（DP-7）");
  if (html.charCodeAt(0) === 0xfeff) problems.push("含 BOM（DP-7）");
  if (countOf(html, STATIC_VIEWPORT) !== 1) problems.push("viewport 應恰 1 次");
  checkSeoLines(html, page.seo, problems);

  const forbidden = [
    ["<script", /<script\b/i],
    ["google-adsense-account", /google-adsense-account/i],
    ["adsbygoogle", /adsbygoogle/i],
    ["noindex", /noindex/i],
    ["og:image", /og:image/i],
    ["mailto:", /mailto:/i],
    ["localStorage", /localStorage/i],
    ["serviceWorker", /serviceWorker/i],
    ["@import", /@import/i],
    ["url(", /url\(/i],
    ["src=", /\ssrc\s*=/i],
    ["<img", /<img\b/i],
    ["<iframe", /<iframe\b/i],
  ];
  for (const [name, re] of forbidden) {
    if (re.test(html)) problems.push(`不得含 ${name}（DP-8）`);
  }
  if (ad && ad.AD_CONFIG && html.includes(ad.AD_CONFIG.publisherId)) {
    problems.push("不得含廣告發布商 ID（DP-8）");
  }

  const links = html.match(/<link\b[^>]*>/gi) || [];
  const allowedLinks = [`<link rel="canonical" href="${escapeHtml(page.seo.canonicalUrl)}">`, STATIC_ICON_LINK];
  if (links.length !== 2 || !allowedLinks.every((l) => links.includes(l))) {
    problems.push(`<link> 只能是 canonical 與 data: 圖示（目前 ${links.join("、") || "無"}）`);
  }

  const mains = html.match(/<main\b/gi) || [];
  const mainStart = html.indexOf("<main>");
  const mainEnd = html.indexOf("</main>");
  if (mains.length !== 1 || mainStart < 0 || mainEnd < mainStart || countOf(html, "</main>") !== 1) {
    problems.push("<main> 應恰 1 個");
  } else {
    const main = html.slice(mainStart, mainEnd);
    if (!main.startsWith(`<main>\n<h1>${escapeHtml(page.title)}</h1>\n`)) {
      problems.push("<main> 應以頁面名稱 h1 開頭");
    }
    if (!html.slice(0, mainStart).includes('<a href="./">')) problems.push("缺少回到網站首頁的連結（AC-57-04）");
    const after = html.slice(mainEnd);
    for (const href of STATIC_NAV_HREFS) {
      if (!after.includes(`<a href="${href}">`)) problems.push(`共用連結缺少 ${href}（AC-57-04）`);
    }
  }
  if ((html.match(/<h1\b/gi) || []).length !== 1) problems.push("<h1> 應恰 1 個（AC-56-04）");
  return problems;
}

/**
 * B-22、B-23：首頁 <head> 的 SEO 檢查（SE-2、SE-5、AD-15、V-SEO-01～V-SEO-04）。
 * 結構化資料以整份 HTML 計數，避免程式或資料夾帶第二段。
 * @param {string} html 最終或 BUILD_ID 前的 HTML
 * @param {object} site core/site-content.js
 * @param {object} ad core/ad.js
 * @returns {string[]} 不符項目
 */
export function checkHomeHead(html, site, ad) {
  const problems = [];
  const headEnd = html.search(/<\/head>/i);
  const head = headEnd < 0 ? "" : html.slice(0, headEnd);
  checkSeoLines(head, site.SITE_HOME_SEO, problems);

  const image = `<meta property="og:image" content="${escapeHtml(site.SITE_HOME_SEO.ogImageUrl)}">`;
  if (countOf(head, image) !== 1) problems.push(`${image} 應恰 1 次`);
  const adsense = `<meta name="google-adsense-account" content="${escapeHtml(ad.AD_CONFIG.publisherId)}">`;
  if (countOf(head, adsense) !== 1) problems.push(`${adsense} 應恰 1 次（AD-15）`);
  // 同名標記即使內容不同也不能多一個（SE-2：description、adsense meta 各恰 1 個）
  for (const name of ["description", "google-adsense-account"]) {
    if (countOf(head, `<meta name="${name}"`) !== 1) problems.push(`<meta name="${name}"> 應恰 1 個`);
  }
  if (/<meta\b[^>]*\bname=["']?keywords/i.test(head)) problems.push("不得有 keywords meta（AC-56-01）");
  if (/noindex/i.test(head)) problems.push("不得有 noindex（AC-56-02）");

  const open = '<script type="application/ld+json">';
  if (countOf(html, "application/ld+json") !== 1 || countOf(head, open) !== 1) {
    problems.push("application/ld+json 應恰 1 段且位於 <head>（SE-2）");
  } else {
    const start = head.indexOf(open) + open.length;
    const end = head.indexOf("</script>", start);
    let parsed = null;
    try {
      parsed = JSON.parse(head.slice(start, end));
    } catch (err) {
      problems.push("application/ld+json 不是合法 JSON（V-SEO-04）");
    }
    if (parsed !== null && JSON.stringify(parsed) !== JSON.stringify(site.SITE_HOME_JSON_LD)) {
      problems.push("application/ld+json 與 SITE_HOME_JSON_LD 不同（V-SEO-04）");
    }
  }
  return problems;
}

/**
 * B-23：robots.txt、sitemap.xml 常數的檢查（SE-7、SE-8、V-SEO-07）。
 * @param {object} site core/site-content.js
 * @returns {string[]} 不符項目
 */
export function checkCrawlerFiles(site) {
  const problems = [];
  const robots = site.ROBOTS_TXT;
  const sitemap = site.SITEMAP_XML;
  if (!robots.includes(`Sitemap: ${site.SITE_ORIGIN}/sitemap.xml\n`)) problems.push("robots.txt 缺少 Sitemap 行");
  if (/disallow/i.test(robots)) problems.push("robots.txt 不得有 Disallow（SE-7）");
  if (/lastmod/i.test(sitemap) || sitemap.includes("#")) problems.push("sitemap.xml 不得有 lastmod 或 hash 網址（SE-8）");
  if (robots.includes("\r") || sitemap.includes("\r")) problems.push("robots.txt、sitemap.xml 不得有 CR（DP-7）");
  const locs = [...sitemap.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);
  const expected = [site.SITE_HOME_SEO.canonicalUrl, ...site.SITE_PAGES.map((p) => p.seo.canonicalUrl)];
  if (JSON.stringify(locs) !== JSON.stringify(expected)) {
    problems.push(`sitemap.xml 的 <loc> 與 SITE_PAGES 的 canonical 不符：${locs.join("、")}`);
  }
  return problems;
}
