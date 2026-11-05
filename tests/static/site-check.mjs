// QA 靜態檢查（第 9 輪，PRD v0.19 US-50、US-53～US-57；契約 V-AD-03、V-SITE-02～06、V-SEO-01～07、V-MAIL-02；architecture §10.11）
// 只以交付物與建置輸出判定，文字期望值抄自 PRD（SUT 常數只用於找位置，不當作判定標準）。建置輸出一律落在 QA_TMP，不寫 dist/。
// 用法：node tests/static/site-check.mjs [輸出 JSON]
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { buildAdTest, TEST_SLOT_ID } from "../tools/build-ad-test.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const out = process.argv[2];
const TMP = fs.mkdtempSync(path.join(process.env.QA_TMP || os.tmpdir(), "site-check-"));
const results = [];
const rec = (tc, ac, ok, note) => { results.push({ suite: "site-check", tc, ac, result: ok ? "通過" : "失敗", note }); console.log(`  ${ok ? "PASS" : "FAIL"} ${tc} ${ac} ${String(note).slice(0, 300)}`); };
const manual = (tc, ac, note) => { results.push({ suite: "site-check", tc, ac, result: "待人工", note }); console.log(`  MANUAL ${tc} ${ac} ${note}`); };
const SITE = path.join(ROOT, "dist/site"); const rd = (f) => fs.readFileSync(path.join(SITE, f), "utf8");
const DIST = path.join(ROOT, "dist/english-master-track.html");
const html = fs.readFileSync(DIST, "utf8"); const htmlB = fs.readFileSync(DIST);
const head = html.slice(0, html.indexOf("</head>"));
const J = (x) => JSON.stringify(x);
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
const PUB = "ca-pub-4051803210893105";
const CONTACT = "email: d o n c l y d e 0 7 2 2 @ g m a i l . c o m";
const HOME_TITLE = "EnglishContext｜英文單字卡與模擬測驗";
const HOME_DESC = "EnglishContext 是自我學習用的英文工具，提供單字卡、美式發音練習與模擬測驗；題型參考 TOEIC®（多益）Part 5，非 ETS 官方或認可內容。";
const PROD = "https://jimmyfantasyworld.com";
const PAGES = { about: { title: "關於我" }, contact: { title: "聯絡我們" }, privacy: { title: "隱私權政策" } };
const ML3 = new RegExp("[A-Za-z0-9._%+-]*" + String.fromCharCode(64) + "gm" + "ail" + "\\." + "c" + "om", "i");
const ML4 = /(?:[A-Za-z0-9._%+-] ){3,}@(?: [A-Za-z0-9._%+-])+/g;
const unesc = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
const meta = (h, attr, name) => [...h.matchAll(new RegExp(`<meta\\s+${attr}="${name}"\\s+content="([^"]*)"\\s*/?>`, "g"))].map((m) => unesc(m[1]));
const links = (h, rel) => [...h.matchAll(new RegExp(`<link\\s+rel="${rel}"\\s+href="([^"]*)"\\s*/?>`, "g"))].map((m) => m[1]);
const titleOf = (h) => [...h.matchAll(/<title>([^<]*)<\/title>/g)].map((m) => unesc(m[1]));
const langOf = (h) => (h.match(/<html[^>]*\blang="([^"]*)"/) || [])[1];
const noindex = (h) => /noindex/i.test(h.slice(0, h.indexOf("</head>")));
const mainOf = (h) => { const m = h.match(/<main>([\s\S]*?)<\/main>/); return m ? m[1] : null; };
const textOf = (fragment) => unesc(fragment.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());

// ═══ AC-50-03、AC-50-09、V-AD-03：同次建置兩檔相同、無靜態廣告標籤、AD-15 ═══
{
  const idx = fs.readFileSync(path.join(SITE, "index.html"));
  const staticAd = [...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]*)"[^>]*>/g)].map((m) => m[1]).filter((u) => /googlesyndication|adsbygoogle|doubleclick|googleads/.test(u));
  const scriptSrc = (html.match(/<script\b[^>]*\bsrc\s*=/gi) || []).length;
  const slotNull = html.split("var AD_SLOT_ID = null;").length - 1;
  rec("TC-50-03", "AC-50-03、AC-19-01、AC-36-07（V-AD-03、FB-74）", idx.equals(htmlB) && staticAd.length === 0 && scriptSrc === 0 && slotNull === 1,
    `交付 HTML 與 dist/site/index.html 位元組相同=${idx.equals(htmlB)}（SHA-256 ${sha(htmlB).slice(0, 16)}）；靜態廣告標籤 ${staticAd.length}；<script src> ${scriptSrc}；逐字 var AD_SLOT_ID = null; ${slotNull} 次（第一階段）`);
  const metaTag = `<meta name="google-adsense-account" content="${PUB}">`;
  const ads = fs.readFileSync(path.join(SITE, "ads.txt"), "utf8"); const adsSrc = fs.readFileSync(path.join(ROOT, "sources/deploy/ads.txt"), "utf8");
  const want = "google.com, pub-4051803210893105, DIRECT, f08c47fec0942fa0";
  rec("TC-50-09", "AC-50-09（V-AD-03、AD-15）", html.split(metaTag).length - 1 === 1 && head.includes(metaTag) && ads.trim() === want && ads === adsSrc,
    `meta ${html.split(metaTag).length - 1} 次（在 head=${head.includes(metaTag)}）；ads.txt 逐字=${ads.trim() === want}、與 sources/deploy 相同=${ads === adsSrc}；pub ID 一致=${want.includes(PUB.slice(3))}（file:// 請求 0 見 TC-56-10）`);
}
// ═══ AC-50-05、V-AD-03：只差 adSlotId 的兩次建置 ═══
{
  const A = path.join(TMP, "unset"); fs.mkdirSync(A, { recursive: true });
  const ra = spawnSync(process.execPath, ["tools/build.mjs", "--out", path.join(A, "english-master-track.html")], { cwd: ROOT, encoding: "utf8" });
  const b = await buildAdTest(path.join(TMP, "set"));
  const ha = fs.readFileSync(path.join(A, "english-master-track.html"), "utf8"); const hb = fs.readFileSync(b.out, "utf8");
  const idA = (ha.match(/emt-build-id" content="([0-9a-f]+)"/) || [])[1], idB = b.buildId;
  const norm = (s, id) => s.split(id).join("@@ID@@").replace(`var AD_SLOT_ID = "${TEST_SLOT_ID}";`, "var AD_SLOT_ID = null;");
  const sameHtml = norm(ha, idA) === norm(hb, idB);
  const filesA = fs.readdirSync(path.join(A, "site"), { recursive: true }).filter((f) => fs.statSync(path.join(A, "site", f)).isFile()).map((f) => f.split(path.sep).join("/"));
  const diff = filesA.filter((f) => !fs.readFileSync(path.join(A, "site", f)).equals(fs.readFileSync(path.join(b.site, f))));
  const swSame = norm(fs.readFileSync(path.join(A, "site/sw.js"), "utf8"), idA) === norm(fs.readFileSync(path.join(b.site, "sw.js"), "utf8"), idB);
  const bTwo = hb === fs.readFileSync(path.join(b.site, "index.html"), "utf8");
  const distHash = sha(htmlB); const reA = sha(fs.readFileSync(path.join(A, "english-master-track.html")));
  // 保護層：命令列參數與 dist 寫入
  const badArg = spawnSync(process.execPath, ["tools/build.mjs", "--ad-slot", "1234567890", "--out", path.join(TMP, "x.html")], { cwd: ROOT, encoding: "utf8" });
  let distGuard = "未中止"; try { const { build } = await import(pathToFileURL(path.join(ROOT, "tools/build.mjs")).href); build({ adSlotIdOverride: "1234567890", log() {}, warn() {} }); } catch (e) { distGuard = e.code || e.message; }
  const distAfter = sha(fs.readFileSync(DIST));
  rec("TC-50-05", "AC-50-05、AC-50-03（V-AD-03、§7.25.4 五層保護）", sameHtml && J(diff.sort()) === J(["index.html", "sw.js"]) && swSame && idA !== idB && bTwo && badArg.status !== 0 && distGuard === "AD_OVERRIDE" && distAfter === distHash,
    `未設定 ${idA}、已設定 ${idB}（不同=${idA !== idB}）；HTML 正規化後只差 adSlotId 與 BUILD_ID=${sameHtml}；13 檔中有差異：${diff.join("、")}；sw.js 只差 BUILD_ID=${swSame}；測試建置兩份 HTML 相同=${bTwo}；--ad-slot 參數結束碼 ${badArg.status}；寫入專案 dist 的注入 → ${distGuard}；dist 未被改動=${distAfter === distHash}；QA 重建未設定版與 dist 相同=${reA === distHash}`);
}
// ═══ AC-50-06（靜態部分）、AC-37-05：sw.js 不含廣告 ═══
{
  const sw = rd("sw.js"); const hits = ["adsbygoogle", "googlesyndication", "pagead", "doubleclick", PUB].filter((w) => sw.includes(w)); const pre = (sw.match(/var PRECACHE_URLS = (\[[^\]]*\])/) || [])[1] || "";
  const staticIn = ["about.html", "contact.html", "privacy.html", "robots.txt", "sitemap.xml", "ads.txt"].filter((f) => pre.includes(f));
  rec("TC-50-06s", "AC-50-06、AC-57-05、AC-35-01（V-AD-06 靜態、DP-9）", hits.length === 0 && staticIn.length === 0 && pre.length > 0, `sw.js 廣告字樣 ${hits.length}；預先快取清單 ${pre}；含靜態頁或爬蟲檔 ${staticIn.length}`);
}
// ═══ AC-56-01～03、AC-56-05、AC-56-06：首頁 ═══
{
  const t = titleOf(head); const d = meta(head, "name", "description");
  rec("TC-56-01", "AC-56-01、AC-34-01、AC-38-10（V-SEO-01）", t.length === 1 && t[0] === HOME_TITLE && d.length === 1 && d[0] === HOME_DESC && [...d[0]].length >= 50 && [...d[0]].length <= 160 && !/<meta\s+name="keywords"/.test(html),
    `title「${t.join("｜｜")}」；description ${d.length} 個、${[...(d[0] || "")].length} 字元；keywords=${/<meta\s+name="keywords"/.test(html)}`);
  const can = links(head, "canonical");
  rec("TC-56-02", "AC-56-02（V-SEO-02 首頁）", langOf(html) === "zh-Hant-TW" && can.length === 1 && can[0] === PROD + "/" && !noindex(html), `lang ${langOf(html)}；canonical ${J(can)}；noindex=${noindex(html)}`);
  const og = Object.fromEntries(["title", "description", "url", "type", "site_name", "locale", "image"].map((k) => [k, meta(head, "property", "og:" + k)]));
  const okOg = og.title[0] === HOME_TITLE && og.description[0] === HOME_DESC && og.url[0] === PROD + "/" && og.type[0] === "website" && og.site_name[0] === "EnglishContext" && og.locale[0] === "zh_TW" && og.image[0] === PROD + "/icons/icon-512.png" && Object.values(og).every((v) => v.length === 1);
  rec("TC-56-03", "AC-56-03（V-SEO-03 首頁；og:image 回應 200 待 D-4）", okOg && fs.existsSync(path.join(SITE, "icons/icon-512.png")), `${J(og).slice(0, 400)}；icon-512 存在部署目錄（本機模擬）；正式網址 200 由主控 D-4 驗證`);
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  let ld = null; try { ld = JSON.parse(blocks[0]); } catch { /* 下方判定 */ }
  rec("TC-56-05", "AC-56-05（V-SEO-04）", blocks.length === 1 && !!ld && ld["@type"] === "WebSite" && ld.name === "EnglishContext" && ld.url === PROD + "/" && ld.description === HOME_DESC && J(Object.keys(ld).sort()) === J(["@context", "@type", "description", "name", "url"]) && !ML4.test(blocks[0]), `${blocks.length} 段；鍵 ${ld ? Object.keys(ld).join("、") : "解析失敗"}；@type ${ld && ld["@type"]}`);
  ML4.lastIndex = 0;
  const ns = (html.match(/<noscript>([\s\S]*?)<\/noscript>/) || [])[1] || ""; const nsTxt = textOf(ns);
  const nsLinks = ["about.html", "contact.html", "privacy.html"].filter((f) => new RegExp(`<a [^>]*href="[^"]*${f}"`).test(ns));
  const hidden = /display:\s*none|visibility:\s*hidden|font-size:\s*0|left:\s*-\d/.test(ns);
  rec("TC-56-06", "AC-56-06、E-150、E-151（V-SEO-05，靜態；不閃現見 e2e-site TC-56-06b）", nsLinks.length === 3 && nsTxt.includes("EnglishContext") && /單字卡/.test(nsTxt) && /模擬測驗/.test(nsTxt) && !hidden && (ns.match(/<h1\b/g) || []).length <= 1, `noscript 文字「${nsTxt.slice(0, 200)}…」；一般連結 ${nsLinks.join("、")}；隱藏手法=${hidden}`);
}
// ═══ AC-56-01～04、AC-55-01、AC-57-03、AC-57-04：靜態頁 ═══
for (const [id, pg] of Object.entries(PAGES)) {
  const h = rd(id + ".html"); const hd = h.slice(0, h.indexOf("</head>")); const t = titleOf(hd); const d = meta(hd, "name", "description"); const can = links(hd, "canonical"); const url = `${PROD}/${id}.html`;
  const og = Object.fromEntries(["title", "description", "url", "type", "site_name", "locale"].map((k) => [k, meta(hd, "property", "og:" + k)]));
  const descAddr = d.some((x) => ML3.test(x) || /@/.test(x)); const main = mainOf(h);
  const heads = [...(main || "").matchAll(/<h([1-6])\b/g)].map((m) => Number(m[1])); const h1All = (h.match(/<h1\b/g) || []).length; const jump = heads.some((v, i) => i > 0 && v > heads[i - 1] + 1);
  rec(`TC-56-sp-${id}`, "AC-56-01、AC-56-02、AC-56-03、AC-56-04（V-SEO-01～03、靜態頁）", t.length === 1 && t[0] === `${pg.title}｜EnglishContext` && d.length === 1 && !descAddr && langOf(h) === "zh-Hant-TW" && can.length === 1 && can[0] === url && !noindex(h) && og.title[0] === t[0] && og.description[0] === d[0] && og.url[0] === url && og.type[0] === "website" && og.site_name[0] === "EnglishContext" && og.locale[0] === "zh_TW" && !!main && h1All === 1 && heads[0] === 1 && !jump && (h.match(/<main\b/g) || []).length === 1,
    `${id}.html：title「${t[0]}」、description「${d[0]}」、canonical ${can[0]}、og 一致；h1 ${h1All} 個、標題層級 ${heads.join(",")}、跳級=${jump}`);
  const scripts = (h.match(/<script\b/gi) || []).length; const ext = [...h.matchAll(/<(script|link|img|iframe|source|video|audio|object|embed)\b[^>]*(?:src|href)="(https?:[^"]*)"[^>]*>/g)].filter((m) => !/rel="canonical"/.test(m[0])).map((m) => m[2]); const extLink = /<link\b(?![^>]*rel="canonical")[^>]*href="(?!data:,)/.test(h);
  const nav = [...h.matchAll(/<a [^>]*href="([^"]*)"/g)].map((m) => m[1]); const needs = ["./", "about.html", "contact.html", "privacy.html", "./#sources"].filter((n) => !nav.includes(n));
  const inline = /<style>/.test(h) && !/<link\b[^>]*stylesheet/.test(h) && !/localStorage|serviceWorker/.test(h);
  rec(`TC-57-04-${id}`, "AC-57-04、AC-57-03（V-SITE-04）、AC-53-04（靜態部分）", scripts === 0 && ext.length === 0 && !extLink && needs.length === 0 && inline, `${id}.html：<script> ${scripts}；外部資源 ${ext.length}；缺少的連結 ${needs.join("、") || "無"}；CSS 內嵌且無 localStorage／serviceWorker=${inline}`);
}
{
  const c = textOf(mainOf(rd("contact.html"))); const dC = meta(rd("contact.html"), "name", "description")[0]; const mainC = mainOf(rd("contact.html"));
  const els = [...mainC.matchAll(/<([a-z0-9]+)\b/g)].map((m) => m[1]);
  rec("TC-55-01s", "AC-55-01、AC-55-02、AC-55-03（靜態頁 main）", c === `聯絡我們 ${CONTACT}` && J(els) === J(["h1", "p"]) && dC === "EnglishContext 的聯絡方式。" && titleOf(rd("contact.html"))[0] === "聯絡我們｜EnglishContext" && !/<form|<input|<textarea|<button|mailto:/i.test(rd("contact.html")), `main 文字「${c}」；元素 ${els.join("、")}；description「${dC}」；表單與 mailto 0`);
}
// ═══ AC-53-02、AC-54-01、AC-54-02：文案（靜態頁 main，與應用內同一來源，應用內見 e2e-site TC-57-03）═══
{
  const m = textOf(mainOf(rd("privacy.html")));
  const seq = ["隱私權政策", "學習資料", "學習紀錄只存在你目前使用的瀏覽器", "本系統沒有伺服器", "不接收也不保存", "備份檔由你自行保管", "廣告服務", "jimmyfantasyworld.com", "Google AdSense", "以檔案開啟的版本不載入廣告", "Cookie 與識別碼", "可能讀寫 Cookie 或使用識別碼", "依你造訪本網站或其他網站的紀錄投放廣告", "由第三方依其政策處理", "個人化廣告退出方式", "Google 廣告設定關閉個人化廣告", "語音辨識", "如 Google、Microsoft", "不錄音、不保存、不上傳錄音", "聯絡方式", CONTACT];
  let pos = -1; const missOrder = seq.filter((w) => { const i = m.indexOf(w, pos + 1); if (i < 0) return true; pos = i; return false; });
  const bad = ["不會傳送任何資料", "沒有第三方", "廣告無法讀取", "無法讀取學習資料", "不收集任何", "完全不連網", "零請求"].filter((w) => m.includes(w));
  const ext = [...mainOf(rd("privacy.html")).matchAll(/<a ([^>]*)>/g)].map((x) => x[1]); const noopener = ext.filter((x) => /https?:/.test(x)).every((x) => /rel="[^"]*noopener/.test(x));
  rec("TC-53-02", "AC-53-02、AC-53-03（外部連結）、AC-53-06", missOrder.length === 0 && bad.length === 0 && noopener && ext.some((x) => /support\.google\.com/.test(x)), `依序 (1)～(6) 缺少或順序錯：${missOrder.join("、") || "無"}；禁用宣稱 ${bad.join("、") || "0"}；外部連結 ${J(ext).slice(0, 240)}，rel noopener=${noopener}`);
  manual("TC-53-02h", "AC-53-02 (4)（FB-71：公開文案與退出連結由人類讀過；連結由主控於實作前依 Google 現行頁面核對）", "D-11：人類讀過公開文案；退出連結是否仍有效需連網確認");
  const a = textOf(mainOf(rd("about.html")));
  const seqA = ["關於我", "網站用途", "EnglishContext 的用途是提升英文能力、自我學習。", "主要功能", "單字卡", "翻卡", "美式語音示範", "語音辨識吻合度", "四選一", "模擬測驗", "題型參考 TOEIC®（多益）Part 5，非 ETS 官方或認可內容", "作答後顯示解析", "學習進度", "連續打卡", "今日已學", "已答對題數", "使用方式", "可離線使用", "語音辨識需要連網", "網站版須先連網開啟過一次", "學習紀錄存在你使用的瀏覽器", "備份匯出與匯入", "內容與權利", "原創內容（例句、解析、Part 5 題目、長難句、句型）由 JimmyLin 以 AI 輔助編製", "TOEIC® 為 ETS 的註冊商標。本網站與 ETS 無關，亦未經其認可或核准。", "資料來源與授權", "隱私權政策", "聯絡我們"];
  pos = -1; const missA = seqA.filter((w) => { const i = a.indexOf(w, pos + 1); if (i < 0) return true; pos = i; return false; });
  rec("TC-54-01", "AC-54-01", missA.length === 0, `依序 (1)～(5) 缺少或順序錯：${missA.join("、") || "無"}`);
  const BAN = ["學歷", "畢業", "碩士", "博士", "多益分數", "滿分", "團隊", "成員", "保證", "成效", "進步", "見證", "使用者人數"]; const hit = BAN.filter((w) => a.includes(w));
  const addr = ML4.test(a); ML4.lastIndex = 0;
  rec("TC-54-02", "AC-54-02、V-SEO-06", hit.length === 0 && !addr, `禁用字詞 ${hit.join("、") || "0 次"}；關於我不含信箱=${!addr}；QA 判讀：「提升英文能力」只作用途描述，無數字或結果`);
}
// ═══ AC-56-07、AC-23-08：用詞 ═══
{
  const srcs = { title: HOME_TITLE, description: HOME_DESC, noscript: textOf((html.match(/<noscript>([\s\S]*?)<\/noscript>/) || [])[1] || ""), about: textOf(mainOf(rd("about.html"))), contact: textOf(mainOf(rd("contact.html"))), privacy: textOf(mainOf(rd("privacy.html"))) };
  for (const f of ["about", "contact", "privacy"]) { const hd = rd(f + ".html"); srcs[f + "-seo"] = titleOf(hd)[0] + " " + meta(hd, "name", "description")[0]; }
  const AC2308 = ["多益常考", "多益最常見"]; const A = ["多益", "TOEIC"], B = ["常考", "必考", "最常考", "最常見", "最常用", "高頻"];
  const hits = []; const splitSent = (s) => s.split(/[。；？！;?!\n\r]/);
  for (const [k, v] of Object.entries(srcs)) { for (const w of AC2308) if (v.includes(w)) hits.push(k + ":" + w); for (const s of splitSent(v)) if (A.some((a) => s.includes(a)) && B.some((b) => s.includes(b))) hits.push(k + ":同句"); }
  const offi = []; for (const [k, v] of Object.entries(srcs)) for (const s of splitSent(v)) for (const w of ["官方", "認可", "認證", "授權機構"]) if (s.includes(w) && !/非 ETS 官方或認可|亦未經其認可或核准/.test(s)) offi.push(k + ":" + w + ":" + s.slice(0, 40));
  const cnt = (s, w) => s.split(w).length - 1; const dOk = cnt(HOME_DESC, "TOEIC") <= 1 && cnt(HOME_DESC, "多益") <= 1 && HOME_DESC.includes("TOEIC®") && /TOEIC®（多益）Part 5，非 ETS 官方或認可內容/.test(HOME_DESC);
  const tm = ["about", "contact", "privacy"].filter((f) => rd(f + ".html").includes("TOEIC") && !rd(f + ".html").includes("TOEIC® 為 ETS 的註冊商標。本網站與 ETS 無關，亦未經其認可或核准。"));
  rec("TC-56-07", "AC-56-07、AC-23-08（V-SEO-06）", hits.length === 0 && offi.length === 0 && dOk && !HOME_TITLE.includes("TOEIC") && tm.length === 0, `AC-23-08 字詞 ${hits.join("、") || "0"}；「官方」「認可」非否定句 ${offi.join("、") || "0"}；首頁 title 不含 TOEIC；description TOEIC ${cnt(HOME_DESC, "TOEIC")} 次、多益 ${cnt(HOME_DESC, "多益")} 次、帶 ®；出現 TOEIC 但缺商標聲明的靜態頁 ${tm.join("、") || "0"}`);
}
// ═══ AC-56-08、AC-56-09：爬蟲檔（本機解析；正式網址回應由主控 D-3）═══
{
  const robots = rd("robots.txt");
  const parse = (txt) => { const groups = []; let cur = null; for (const raw of txt.split(/\r?\n/)) { const l = raw.replace(/#.*/, "").trim(); if (!l) continue; const [k, ...v] = l.split(":"); const key = k.toLowerCase(); const val = v.join(":").trim(); if (key === "user-agent") { if (!cur || cur.rules.length) { cur = { agents: [], rules: [] }; groups.push(cur); } cur.agents.push(val.toLowerCase()); } else if (key === "allow" || key === "disallow") cur && cur.rules.push([key, val]); } return groups; };
  const groups = parse(robots);
  const allowed = (ua, p) => { const g = groups.find((x) => x.agents.includes(ua.toLowerCase())) || groups.find((x) => x.agents.includes("*")); if (!g) return true; let best = null; for (const [k, v] of g.rules) { if (v === "" ) continue; if (p.startsWith(v) && (!best || v.length > best[1].length || (v.length === best[1].length && k === "allow"))) best = [k, v]; } return !best || best[0] === "allow"; };
  const UAS = ["Mediapartners-Google", "Google-Display-Ads-Bot", "Googlebot"]; const PATHS = ["/", "/index.html", "/about.html", "/contact.html", "/privacy.html"]; const denied = UAS.flatMap((u) => PATHS.filter((p) => !allowed(u, p)).map((p) => u + p));
  const hasMap = /^Sitemap: https:\/\/jimmyfantasyworld\.com\/sitemap\.xml$/m.test(robots);
  rec("TC-56-08", "AC-56-08、E-155（V-SEO-07；本機解析，正式網址 200 由主控 D-3）", hasMap && denied.length === 0 && !/\r/.test(robots), `含 Sitemap=${hasMap}；3 個爬蟲 × 5 路徑遭拒 ${denied.length}；內容 ${J(robots)}`);
  const sm = rd("sitemap.xml"); const locs = [...sm.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]); const want = [PROD + "/", PROD + "/about.html", PROD + "/contact.html", PROD + "/privacy.html"];
  const xmlOk = sm.startsWith('<?xml version="1.0" encoding="UTF-8"?>') && /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/.test(sm) && (sm.match(/<url>/g) || []).length === 4 && (sm.match(/<\/url>/g) || []).length === 4 && sm.trim().endsWith("</urlset>");
  rec("TC-56-09", "AC-56-09（V-SEO-07；本機解析，正式網址 200 由主控 D-3）", xmlOk && J(locs) === J(want) && !/lastmod|#/.test(sm), `XML 結構=${xmlOk}；<loc> ${J(locs)}；lastmod 或 # =${/lastmod|#/.test(sm)}`);
}
// ═══ AC-57-03（單一來源）、AC-23-08、V-MAIL-02 ═══
{
  const srcFiles = (function walk(d, a = []) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (e.name !== "__tests__") walk(p, a); } else if (/\.(js|mjs|html|css)$/.test(e.name)) a.push(p); } return a; })(path.join(ROOT, "src/app")).concat(path.join(ROOT, "tools/build.mjs"), path.join(ROOT, "tools/site-pages.mjs"));
  const needle = "本系統沒有伺服器，不接收也不保存這些紀錄"; const where = srcFiles.filter((f) => fs.readFileSync(f, "utf8").includes(needle)).map((f) => path.relative(ROOT, f).split(path.sep).join("/"));
  rec("TC-57-03s", "AC-57-03（V-SITE-03 單一來源）", where.length === 1 && where[0] === "src/app/core/site-content.js", `隱私權政策 (1) 首句只出現於 ${where.join("、")}`);
  const deliver = { "交付 HTML": html, "about.html": rd("about.html"), "contact.html": rd("contact.html"), "privacy.html": rd("privacy.html") };
  const notes = []; let ok = true;
  for (const [k, v] of Object.entries(deliver)) { const m3 = ML3.test(v); const m4 = [...v.matchAll(ML4)].map((m) => m[0].trim()); const bad = m4.filter((x) => x !== CONTACT.replace(/^email: /, "")); const mt = v.includes("mailto:"); ok = ok && !m3 && bad.length === 0 && !mt; notes.push(`${k}：連續 ${m3 ? 1 : 0}、空白形式 ${m4.length} 處（不等於現行 ${bad.length}）、mailto ${mt ? 1 : 0}`); }
  const metaArea = [...head.matchAll(/<meta\b[^>]*>/g)].map((m) => m[0]).join("") + ((html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/) || [])[1] || ""); ML4.lastIndex = 0; const metaAddr = ML4.test(metaArea) || ML3.test(metaArea) || /d ?o ?n ?c ?l ?y ?d ?e/i.test(metaArea); ML4.lastIndex = 0;
  const emailIn = ["contact", "privacy"].every((f) => rd(f + ".html").includes(CONTACT)) && !rd("about.html").includes(CONTACT);
  const hint = ["請移除空白", "移除空白", "去掉空白"].filter((w) => html.includes(w) || rd("contact.html").includes(w));
  rec("TC-23-07s", "AC-23-07 (2)(8)、AC-55-02、AC-55-04（V-MAIL-02、ML-4）", ok && !metaAddr && emailIn && hint.length === 0, notes.join("；") + `；head 內 meta／JSON-LD 含地址=${metaAddr}；聯絡與隱私頁含信箱、關於我不含=${emailIn}；提示字樣 ${hint.length}`);
}
// ═══ AC-57-06、V-SITE-06、AC-36-01：決定性與改文案 ═══
{
  const hashDir = (d) => Object.fromEntries(fs.readdirSync(d, { recursive: true }).filter((f) => fs.statSync(path.join(d, f)).isFile()).map((f) => [f.split(path.sep).join("/"), sha(fs.readFileSync(path.join(d, f)))]));
  const a = path.join(TMP, "det-a"), b = path.join(TMP, "det-b");
  for (const x of [a, b]) { fs.mkdirSync(x, { recursive: true }); spawnSync(process.execPath, ["tools/build.mjs", "--out", path.join(x, "t.html")], { cwd: ROOT, encoding: "utf8" }); }
  const ha = hashDir(path.join(a, "site")), hb = hashDir(path.join(b, "site")); const diff = Object.keys(ha).filter((k) => ha[k] !== hb[k]);
  const hDist = hashDir(SITE); const distDiff = Object.keys(ha).filter((k) => ha[k] !== hDist[k]);
  const wantFiles = ["about.html", "ads.txt", "contact.html", "icons/apple-touch-icon-180.png", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "index.html", "manifest.webmanifest", "privacy.html", "robots.txt", "sitemap.xml", "sw.js"];
  const filesOk = J(Object.keys(hDist).sort()) === J(wantFiles); const forbidden = Object.keys(hDist).filter((f) => /^(docs|src|sources)\//.test(f));
  rec("TC-57-06a", "AC-57-06、AC-36-01、AC-36-07（V-SITE-06）", diff.length === 0 && distDiff.length === 0 && filesOk && forbidden.length === 0, `連續建置 2 次差異 ${diff.length} 檔；QA 重建與 dist/site 差異 ${distDiff.join("、") || "0"} 檔；部署目錄 ${Object.keys(hDist).length} 檔＝契約=${filesOk}；含 docs、src、sources ${forbidden.length}`);
  // 改 1 句文案（只改暫存複本）
  const app2 = path.join(TMP, "app2"); fs.cpSync(path.join(ROOT, "src/app"), app2, { recursive: true, filter: (s) => !s.includes("__tests__") });
  const scf = path.join(app2, "core/site-content.js"); const sc = fs.readFileSync(scf, "utf8"); fs.writeFileSync(scf, sc.replace("語音由瀏覽器廠商（如 Google、Microsoft）處理；", "語音由瀏覽器廠商（如 Google、Microsoft）處理（QA 改文案）；"));
  const c = path.join(TMP, "det-c"); fs.mkdirSync(c, { recursive: true }); const rc = spawnSync(process.execPath, ["tools/build.mjs", "--app", app2, "--out", path.join(c, "t.html")], { cwd: ROOT, encoding: "utf8" });
  if (rc.status !== 0) rec("TC-57-06b", "AC-57-06、AC-36-03（改文案）", false, "改文案建置失敗：" + (rc.stdout + rc.stderr).slice(-400));
  else { const hc = hashDir(path.join(c, "site")); const ch = Object.keys(ha).filter((k) => ha[k] !== hc[k]).sort(); const idOld = (fs.readFileSync(path.join(a, "t.html"), "utf8").match(/emt-build-id" content="([0-9a-f]+)"/) || [])[1]; const newHtml = fs.readFileSync(path.join(c, "t.html"), "utf8"); const idNew = (newHtml.match(/emt-build-id" content="([0-9a-f]+)"/) || [])[1];
    rec("TC-57-06b", "AC-57-06、AC-36-03、AC-57-03（改文案同步）", J(ch) === J(["index.html", "privacy.html", "sw.js"]) && idOld !== idNew && newHtml.includes("QA 改文案") && fs.readFileSync(path.join(c, "site/privacy.html"), "utf8").includes("QA 改文案") && !fs.readFileSync(path.join(c, "site/about.html"), "utf8").includes("QA 改文案"), `只改 1 處（暫存複本 core/site-content.js）：變更 ${ch.join("、")}；BUILD_ID ${idOld} → ${idNew}；HTML 與 privacy.html 同步`); }
  manual("TC-57-06h", "AC-57-06（部署網址新增檔案皆 200）", "由主控部署後 D-2、D-3 驗證");
}
// ═══ AC-50-10（靜態）：不自建同意視窗 ═══
{
  const ad = fs.readFileSync(path.join(ROOT, "src/app/services/ad.js"), "utf8") + fs.readFileSync(path.join(ROOT, "src/app/ui/ad-slot.js"), "utf8") + fs.readFileSync(path.join(ROOT, "src/app/core/ad.js"), "utf8");
  const code = ad.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, ""); const stor = /localStorage|sessionStorage|indexedDB|document\.cookie/.test(code); const consent = /consent|同意|__tcfapi|googlefc/i.test(code); const learn = /masteredWordKeys|part5CorrectIds|customVocab|todayLearned|learnedHistory/.test(code);
  rec("TC-50-10s", "AC-50-10（靜態部分：不自建同意、不保存）、AC-50-08（程式）", !stor && !consent && !learn, `廣告 3 模組去註解後：儲存 API=${stor}、同意相關=${consent}、讀學習欄位=${learn}`);
  manual("TC-50-10h", "AC-50-10、E-146", "第二階段待驗（不是通過）：歐洲經濟區、英國、瑞士網路環境下 Google 認證 CMP 的接受與拒絕，由人類於後台設定完成後實機確認");
}
const sum = { pass: results.filter((r) => r.result === "通過").length, fail: results.filter((r) => r.result === "失敗").length };
console.log(`site-check：通過 ${sum.pass}、失敗 ${sum.fail}、待人工 ${results.filter((r) => r.result === "待人工").length}`);
if (out) { fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, JSON.stringify(results, null, 2)); }
