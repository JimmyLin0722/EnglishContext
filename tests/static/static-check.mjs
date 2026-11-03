// QA 靜態檢查（第 4 輪更新 TC-S01、TC-S06 以符合 PRD v0.11；第 5 輪新增 TC-S11、TC-L-S01～S04，PRD v0.13）：交付產物與原始碼（AC-04-09、AC-19-01、AC-19-04、AC-21-02、AC-21-03、AC-23-06、AC-18-06 程式面）
// 用法：node tests/static/static-check.mjs [輸出 JSON] [重建產物路徑（選填，比對是否與 dist 相同）]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DIST = path.join(ROOT, "dist", "english-master-track.html");
const out = process.argv[2];
const rebuilt = process.argv[3];
const results = [];
function rec(tc, ac, ok, note) { results.push({ suite: "static", tc, ac, result: ok ? "通過" : "失敗", note }); console.log(`  ${ok ? "PASS" : "FAIL"} ${tc} ${ac} ${note}`); }

const buf = fs.readFileSync(DIST);
const html = buf.toString("utf8");
// 第 3 輪：dist/Ads.txt 為人類自行放置的 AdSense 檔（非建置產物，主控指示不列缺陷），排除於交付檔數檢查
const HUMAN_DIST = ["Ads.txt"];
// 第 4 輪（PRD v0.11 AC-19-01 修訂、契約 DP-1）：dist/ 另有 PWA 部署目錄 site/（內容另由 tests/static/pwa-static.mjs 驗 V-PWA-01）
const PWA_DIST = ["site"];
const distAll = fs.readdirSync(path.join(ROOT, "dist"));
const isHuman = (f) => HUMAN_DIST.some((h) => h.toLowerCase() === f.toLowerCase());
const distFiles = distAll.filter((f) => !isHuman(f) && !PWA_DIST.includes(f));

// 擷取程式區段（最後一個 <script>）與樣式
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
const styles = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]);
const appJs = scripts[scripts.length - 1] || "";

function walk(dir, acc = []) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) { if (f.name !== "__tests__") walk(p, acc); } else if (/\.(js|css|html)$/.test(f.name)) acc.push(p);
  }
  return acc;
}
const srcApp = walk(path.join(ROOT, "src", "app"));
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'\\])\/\/.*$/gm, "$1");

// TC-S01 AC-19-01：單一 HTML、CSS 內嵌、無外部資源
{
  const pats = [
    [/<script[^>]*\ssrc\s*=/i, "<script src>"], [/<link[^>]*\shref\s*=/i, "<link href>"], [/@import/i, "@import"],
    [/url\(\s*['"]?\s*(https?:|\/\/)/i, "外部 url()"], [/<img\b/i, "<img>"], [/<iframe\b/i, "<iframe>"],
    [/cdn\.tailwindcss\.com/i, "tailwind CDN"], [/fonts\.googleapis|fonts\.gstatic/i, "外部字型"], [/@font-face/i, "@font-face"],
    [/\bcdn(js)?\.|jsdelivr|unpkg\.com/i, "CDN 網址"],
  ];
  // 第 4 輪：契約 HD-1／architecture B-7 逐字白名單 <link rel="icon" href="data:,">（恰 1 次），先自檢查用副本移除，其餘樣式一條都不放寬
  const WL = '<link rel="icon" href="data:,">';
  const wlCount = html.split(WL).length - 1;
  const checkHtml = html.replace(WL, "");
  const hits = pats.filter(([re]) => re.test(checkHtml)).map(([, n]) => n);
  if (wlCount !== 1) hits.push(`白名單連結出現 ${wlCount} 次（應 1 次）`);
  // 程式中動態載入外部資源的 API
  const dyn = [/\bfetch\s*\(/, /XMLHttpRequest/, /new\s+WebSocket/, /EventSource/, /navigator\.sendBeacon/, /importScripts/, /\.src\s*=\s*['"]https?:/].filter((re) => re.test(appJs)).map(String);
  const okFiles = distFiles.length === 1 && distFiles[0].endsWith(".html");
  rec("TC-S01", "AC-19-01", hits.length === 0 && dyn.length === 0 && okFiles && styles.length >= 1,
    `dist 建置產物：${distFiles.join("、")}＋PWA 部署目錄 ${distAll.filter((f) => PWA_DIST.includes(f)).join("、") || "無"}（人類自放檔案 ${distAll.filter(isHuman).join("、") || "無"} 不列入）；白名單 data: 圖示連結 ${wlCount} 次；<style> 區塊 ${styles.length}；外部資源樣式命中：${hits.join("、") || "無"}；程式網路 API：${dyn.join("、") || "無"}`);
}

// TC-S02 AC-19-04：檔案大小
rec("TC-S02", "AC-19-04", buf.length <= 5242880, `${buf.length.toLocaleString()} bytes（上限 5,242,880）`);

// TC-S03 AC-04-09：禁止的 DOM API 不出現於產品程式碼
{
  const bad = [];
  for (const f of srcApp.filter((p) => p.endsWith(".js"))) {
    const s = stripComments(fs.readFileSync(f, "utf8"));
    for (const re of [/\.innerHTML\b/, /\.outerHTML\b/, /insertAdjacentHTML/, /document\.write/, /createContextualFragment/, /\.srcdoc\b/, /DOMParser/, /\bon[a-z]+\s*=\s*["']/i, /setAttribute\(\s*["']on/i, /\beval\s*\(/, /new\s+Function\s*\(/]) {
      if (re.test(s)) bad.push(path.relative(ROOT, f) + " " + re);
    }
  }
  const distBad = [/\.innerHTML\b/, /\.outerHTML\b/, /insertAdjacentHTML/, /document\.write\s*\(/].filter((re) => re.test(appJs)).map(String);
  rec("TC-S03", "AC-04-09", bad.length === 0 && distBad.length === 0, `src/app 命中 ${bad.length}${bad.length ? "：" + bad.join("；") : ""}；產物程式命中 ${distBad.join("、") || "無"}`);
}

// TC-S04 AC-21-02：無付費金鑰、第三方語音 SDK
{
  const pats = [/AIza[0-9A-Za-z_-]{20,}/, /sk-[A-Za-z0-9]{20,}/, /api[_-]?key\s*[:=]/i, /subscription[_-]?key/i, /Ocp-Apim/i, /microsoft\.cognitiveservices|SpeechSDK/i, /speech\.googleapis|cloud\.google\.com\/speech/i, /amazonaws|polly/i, /ibm\s*watson/i, /bearer\s+[A-Za-z0-9]/i];
  const hits = pats.filter((re) => re.test(html)).map(String);
  rec("TC-S04", "AC-21-02", hits.length === 0, `命中：${hits.join("、") || "無"}`);
}

// TC-S05 AC-21-03：不錄音、不存音訊（第 3 輪改依 architecture §10 v0.5：允許 getUserMedia 只讀音量）
// (1) MediaRecorder 在產物與 src/app（__tests__ 除外）出現 0 次（含註解）；(2) getUserMedia 只出現在 services/mic.js；
// (3) mic.js 不出現錄製／輸出／傳送／儲存字串；(4) speech-panel 的 store action 呼叫不帶音量值
{
  const notes = [];
  let ok = true;
  const mrDist = (html.match(/MediaRecorder/g) || []).length;
  const mrSrc = srcApp.filter((p) => /MediaRecorder/.test(fs.readFileSync(p, "utf8"))).map((p) => path.relative(ROOT, p));
  if (mrDist || mrSrc.length) ok = false;
  notes.push(`(1) MediaRecorder：產物 ${mrDist} 次、src/app ${mrSrc.length} 檔${mrSrc.length ? "（" + mrSrc.join("、") + "）" : ""}`);
  const gumFiles = srcApp.filter((p) => /getUserMedia/.test(fs.readFileSync(p, "utf8"))).map((p) => path.relative(ROOT, p).split(path.sep).join("/"));
  const gumOk = gumFiles.every((f) => f === "src/app/services/mic.js");
  // 產物中的 getUserMedia 次數須等於 mic.js 原始碼中的次數（確認沒有其他模組在建置時帶入）
  const micSrc = fs.readFileSync(path.join(ROOT, "src/app/services/mic.js"), "utf8");
  const gumMic = (micSrc.match(/getUserMedia/g) || []).length, gumDist = (html.match(/getUserMedia/g) || []).length;
  if (!gumOk || gumDist !== gumMic) ok = false;
  notes.push(`(2) getUserMedia 出現於：${gumFiles.join("、") || "無"}；產物 ${gumDist} 次 = mic.js ${gumMic} 次：${gumDist === gumMic}`);
  const banned = ["destination", "Blob", "createObjectURL", "FileReader", "fetch", "XMLHttpRequest", "WebSocket", "sendBeacon", "localStorage", "indexedDB", "caches", "MediaRecorder"];
  const micHits = banned.filter((w) => micSrc.includes(w));
  if (micHits.length) ok = false;
  notes.push(`(3) mic.js 禁用字串命中：${micHits.join("、") || "無"}`);
  const sp = stripComments(fs.readFileSync(path.join(ROOT, "src/app/views/speech-panel.js"), "utf8"));
  const actCalls = [...sp.matchAll(/\bact\(\s*"([^"]+)"\s*(?:,\s*([^)]*))?\)/g)].map((m) => `${m[1]}(${(m[2] || "").trim()})`);
  const leak = actCalls.filter((c) => /level|bars|rms|db|volume/i.test(c));
  if (leak.length) ok = false;
  notes.push(`(4) speech-panel store action：${actCalls.join("、")}；含音量參數 ${leak.length}`);
  rec("TC-S05", "AC-21-03（程式面）", ok, notes.join("；"));
}

// TC-S06 AC-23-06：開頭註解區授權聲明
{
  const head = html.slice(0, 4000);
  const c = head.match(/<!--([\s\S]*?)-->/);
  const t = c ? c[1] : "";
  const mitFull = ["Permission is hereby granted, free of charge", "The above copyright notice and this permission notice shall be included", 'THE SOFTWARE IS PROVIDED "AS IS"'].every((s) => t.includes(s));
  const ok = /Copyright \(c\) \d{4} JimmyLin/.test(t) && mitFull && t.includes("單字資料與原創內容（例句、解析、Part 5 題目、長難句、句型）以 CC BY-SA 4.0 授權，原創內容著作權人 JimmyLin") && t.includes("https://creativecommons.org/licenses/by-sa/4.0/");
  // 第 4 輪（v0.11 AC-23-06 修訂，Q-48）：品牌標識聲明
  const brand = t.includes("PWA 圖示與名稱「EnglishContext」為品牌標識，著作權人 JimmyLin，保留所有權利，不適用 MIT 與 CC BY-SA 4.0");
  const charsetEnd = Buffer.byteLength(html.slice(0, html.indexOf('<meta charset="utf-8">') + 22), "utf8");
  rec("TC-S06", "AC-23-06", ok && brand && charsetEnd <= 1024, `開頭註解含 MIT 全文與 Copyright=${mitFull}；CC BY-SA 聲明與網址=${ok}；品牌標識聲明（v0.11）=${brand}；<meta charset> 結束於第 ${charsetEnd} byte`);
}

// TC-S07 安全：內嵌資料不得提前結束 <script>、無 javascript: 連結
{
  const scriptOpen = (html.match(/<script\b/gi) || []).length, scriptClose = (html.match(/<\/script>/gi) || []).length;
  const jsUrl = /href\s*=\s*["']\s*javascript:/i.test(html);
  rec("TC-S07", "AC-04-04、AC-24-07（產物）", scriptOpen === scriptClose && !jsUrl, `<script> 開 ${scriptOpen}／關 ${scriptClose}；javascript: 連結=${jsUrl}`);
}

// TC-S08 不打包內部檔：_tools、_records、__tests__ 與 sources/ 原始字表內容不得出現
{
  const markers = ["validate.mjs", "build-skeleton", "node:test", "describe(", "Lemma,SFI Rank", "ecdict_subset"];
  const hits = markers.filter((m) => html.includes(m));
  rec("TC-S08", "AC-19-01（D-1 不打包）", hits.length === 0, `命中：${hits.join("、") || "無"}`);
}

// TC-S10 AC-31-04（第 3 輪新增）：動畫、手勢、環形圖與長條圖以內嵌 CSS／SVG／原生 JS 實作，不引入外部函式庫
{
  const libs = [/\bgsap\b/i, /anime\.js|animejs/i, /hammer(\.min)?\.js|new\s+Hammer\(/i, /chart\.js|new\s+Chart\(/i, /\bd3\.(select|scale)/, /lottie/i, /swiper/i, /velocity\.js/i, /jquery|\$\.fn\./i, /framer-motion|popmotion/i, /tailwind/i];
  const hits = libs.filter((re) => re.test(html)).map(String);
  const css = styles.join("\n");
  const keyframes = (css.match(/@keyframes\s+[\w-]+/g) || []).map((k) => k.replace("@keyframes ", ""));
  const svgNs = /createElementNS\(\s*["']http:\/\/www\.w3\.org\/2000\/svg["']/.test(appJs) || /\bsvg\s*\(/.test(appJs);
  const ok = hits.length === 0 && keyframes.length > 0 && svgNs && buf.length <= 5242880;
  rec("TC-S10", "AC-31-04", ok, `外部動畫／圖表／手勢函式庫特徵命中：${hits.join("、") || "無"}；內嵌 @keyframes ${keyframes.length} 個（${keyframes.join("、")}）；SVG 以原生 DOM API 建立=${svgNs}；檔案 ${buf.length.toLocaleString()} bytes（AC-19-01 外部資源見 TC-S01）`);
}

// ═════════ 第 5 輪（PRD v0.13，版面與視覺）═════════
const cssAll = styles.join("\n");
const stripCss = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "");

// TC-S11（FE-44 起沿用的「卡片不建立分數範圍」檢查，AC-26-05、AC-01-01）：第 5 輪調整規則——只檢查程式與 CSS 規則（去除註解）。
// 原始產物以字串搜尋會命中 20-customizer.css 檔頭的歷史註解 1 次（記載 v0.10 刪除 .cz-color__range），註解不影響畫面，非缺陷。
{
  const raw = (html.match(/cz-color__range/g) || []).length;
  const inJs = (stripComments(appJs).match(/cz-color__range/g) || []).length;
  const inCss = (stripCss(cssAll).match(/cz-color__range/g) || []).length;
  rec("TC-S11", "AC-26-05、AC-01-01（程式面）", inJs === 0 && inCss === 0, `產物原始字串命中 ${raw} 次（CSS 註解）；去除註解後：程式 ${inJs} 次、CSS 規則 ${inCss} 次`);
}

// TC-L-S01 AC-38-07、AC-19-01、VC-8：CSS 無 @font-face、無 url(（含 data:）；字型為系統字型
{
  const ff = (cssAll.match(/@font-face/gi) || []).length; const urls = (stripCss(cssAll).match(/url\(/gi) || []).length;
  const fam = [...new Set((stripCss(cssAll).match(/font-family\s*:[^;}]+/gi) || []).map((x) => x.trim()))];
  rec("TC-L-S01", "AC-38-07、AC-19-01（VC-8）", ff === 0 && urls === 0, `@font-face ${ff}；CSS url( ${urls}；font-family 宣告 ${fam.length} 種：${fam.join("｜").slice(0, 300)}`);
}

// TC-L-S02 AC-38-10 (1)、V-LAY-05、NM-1、NM-4：<title>、授權註解第一行、畫面文字與 src/data 不含 English Master Track
{
  const titles = html.match(/<title>[^<]*<\/title>/g) || [];
  const c = html.match(/<!--([\s\S]*?)-->/); const firstLine = c ? c[1].split(/\r?\n/).map((x) => x.trim()).filter(Boolean)[0] : "";
  const bodyText = html.replace(/<script\b[\s\S]*?<\/script>/gi, "").replace(/<style\b[\s\S]*?<\/style>/gi, "").replace(/<!--[\s\S]*?-->/g, "").replace(/<[^>]+>/g, " ");
  const re = /english\s+master\s+track/i;
  const htmlHit = re.test(bodyText);
  const jsStr = [...stripComments(appJs).matchAll(/"((?:[^"\\\n]|\\.)*)"/g)].map((m) => m[1]).filter((x) => re.test(x));
  const dataDir = path.join(ROOT, "src", "data");
  const dataHits = [];
  (function walkD(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) { if (f.name !== "_records") walkD(p); } else if (/\.(js|mjs)$/.test(f.name) && /english\s*master\s*track/i.test(fs.readFileSync(p, "utf8"))) dataHits.push(path.relative(ROOT, p)); } })(dataDir);
  const ok = titles.length === 1 && titles[0] === "<title>EnglishContext</title>" && firstLine === "EnglishContext" && !htmlHit && jsStr.length === 0 && dataHits.length === 0;
  rec("TC-L-S02", "AC-38-10 (1)、AC-34-01、AC-34-02（V-LAY-05、NM-1、NM-4）", ok, `${titles.join("")}；授權註解第一行「${firstLine}」；HTML 文字節點命中=${htmlHit}；程式字串常值（空白分隔）命中 ${jsStr.length}${jsStr.length ? JSON.stringify(jsStr.slice(0, 3)) : ""}；src/data（不含 _records）命中 ${dataHits.join("、") || "無"}`);
}

// TC-L-S03 AC-38-10 (2)、NM-5：不改清單仍在產物中且逐字相同
{
  const sw = fs.existsSync(path.join(ROOT, "dist", "site", "sw.js")) ? fs.readFileSync(path.join(ROOT, "dist", "site", "sw.js"), "utf8") : "";
  const need = { "englishMasterTrack:state": html, "englishMasterTrack:unreadable": html, "english-master-track-backup": html, 'name="emt-build-id"': html, 'var CACHE_PREFIX = "english-master-track-pwa-";': sw };
  const miss = Object.entries(need).filter(([k, s]) => !s.includes(k)).map(([k]) => k);
  const prefix = /english-master-track-backup-/.test(appJs);
  rec("TC-L-S03", "AC-38-10 (2)（NM-5 FROZEN_IDENTIFIERS）", miss.length === 0 && prefix && fs.existsSync(DIST), `缺少 ${miss.join("、") || "無"}；匯出檔名前綴 english-master-track-backup- 存在=${prefix}；交付檔 dist/english-master-track.html 存在=${fs.existsSync(DIST)}（匯出檔名實測見 TC-38-10）`);
}

// TC-L-S04 AC-38-05、NM-2：標題列圖示為內嵌 SVG（不參照 icons/、無 xmlns、無 <img>／<image>／<text>）
{
  const m = html.match(/<svg class="app-logo"[\s\S]*?<\/svg>/);
  const svg = m ? m[0] : "";
  const ok = !!svg && Buffer.byteLength(svg) <= 1500 && !/xmlns|<image|<text|href|icons\//.test(svg) && /aria-hidden="true"/.test(svg) && !/<img\b/i.test(html) && (html.match(/class="app-logo"/g) || []).length === 1;
  rec("TC-L-S04", "AC-38-05（NM-2）", ok, `內嵌 svg.app-logo ${Buffer.byteLength(svg)} bytes（≤ 1,500）；含 xmlns/image/text/href/icons 路徑=${/xmlns|<image|<text|href|icons\//.test(svg)}；aria-hidden=${/aria-hidden="true"/.test(svg)}；產物 <img> ${(html.match(/<img\b/gi) || []).length}`);
}

// TC-S09 產物與原始碼一致（以 QA 自行重建的產物比對）
if (rebuilt && fs.existsSync(rebuilt)) {
  const b2 = fs.readFileSync(rebuilt);
  rec("TC-S09", "AC-19-01（交付物可追溯）", b2.equals(buf), `重建產物 ${b2.length.toLocaleString()} bytes；與 dist 位元組相同=${b2.equals(buf)}`);
}

const sum = { pass: results.filter((r) => r.result === "通過").length, fail: results.filter((r) => r.result === "失敗").length };
console.log(`靜態檢查：通過 ${sum.pass}、失敗 ${sum.fail}`);
if (out) { fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, JSON.stringify(results, null, 2)); }
