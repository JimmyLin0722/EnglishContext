// QA 靜態檢查：交付產物與原始碼（AC-04-09、AC-19-01、AC-19-04、AC-21-02、AC-21-03、AC-23-06、AC-18-06 程式面）
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
const distFiles = fs.readdirSync(path.join(ROOT, "dist"));

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
  const hits = pats.filter(([re]) => re.test(html)).map(([, n]) => n);
  // 程式中動態載入外部資源的 API
  const dyn = [/\bfetch\s*\(/, /XMLHttpRequest/, /new\s+WebSocket/, /EventSource/, /navigator\.sendBeacon/, /importScripts/, /\.src\s*=\s*['"]https?:/].filter((re) => re.test(appJs)).map(String);
  const okFiles = distFiles.length === 1 && distFiles[0].endsWith(".html");
  rec("TC-S01", "AC-19-01", hits.length === 0 && dyn.length === 0 && okFiles && styles.length >= 1,
    `dist 檔案：${distFiles.join("、")}；<style> 區塊 ${styles.length}；外部資源樣式命中：${hits.join("、") || "無"}；程式網路 API：${dyn.join("、") || "無"}`);
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

// TC-S05 AC-21-03：不錄音、不存音訊
{
  const hits = [/MediaRecorder/, /getUserMedia/, /AudioContext/, /createMediaStreamSource/, /\bBlob\([^)]*audio/i].filter((re) => re.test(appJs)).map(String);
  rec("TC-S05", "AC-21-03（程式面）", hits.length === 0, `命中：${hits.join("、") || "無"}`);
}

// TC-S06 AC-23-06：開頭註解區授權聲明
{
  const head = html.slice(0, 4000);
  const c = head.match(/<!--([\s\S]*?)-->/);
  const t = c ? c[1] : "";
  const mitFull = ["Permission is hereby granted, free of charge", "The above copyright notice and this permission notice shall be included", 'THE SOFTWARE IS PROVIDED "AS IS"'].every((s) => t.includes(s));
  const ok = /Copyright \(c\) \d{4} JimmyLin/.test(t) && mitFull && t.includes("單字資料與原創內容（例句、解析、Part 5 題目、長難句、句型）以 CC BY-SA 4.0 授權，原創內容著作權人 JimmyLin") && t.includes("https://creativecommons.org/licenses/by-sa/4.0/");
  const charsetEnd = Buffer.byteLength(html.slice(0, html.indexOf('<meta charset="utf-8">') + 22), "utf8");
  rec("TC-S06", "AC-23-06", ok && charsetEnd <= 1024, `開頭註解含 MIT 全文與 Copyright=${mitFull}；CC BY-SA 聲明與網址=${ok}；<meta charset> 結束於第 ${charsetEnd} byte`);
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

// TC-S09 產物與原始碼一致（以 QA 自行重建的產物比對）
if (rebuilt && fs.existsSync(rebuilt)) {
  const b2 = fs.readFileSync(rebuilt);
  rec("TC-S09", "AC-19-01（交付物可追溯）", b2.equals(buf), `重建產物 ${b2.length.toLocaleString()} bytes；與 dist 位元組相同=${b2.equals(buf)}`);
}

const sum = { pass: results.filter((r) => r.result === "通過").length, fail: results.filter((r) => r.result === "失敗").length };
console.log(`靜態檢查：通過 ${sum.pass}、失敗 ${sum.fail}`);
if (out) { fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, JSON.stringify(results, null, 2)); }
