// English Master Track 建置腳本（FE-01；architecture.md §5 B-1～B-9；v0.7 PWA 建置 FE-47，§5.1 B-10～B-16）
// 將 src/app/index.html 模板、授權標頭、樣式、內容資料與程式串接為單一離線 HTML；
// （v0.7）PWA 模式下另產生部署目錄（index.html、manifest.webmanifest、sw.js、4 張圖示、ads.txt，恰 8 檔）。
// 只使用 Node 內建模組（fs、path、vm、url、crypto、module），無 npm 相依。
// 可重現（AC-36-01）：不使用時間、亂數、環境變數；BUILD_ID 只由內容計算（§7.18.2）。
//
// 用法：
//   node tools/build.mjs [--out <path>] [--data <dir>] [--app <dir>] [--site <dir> | --no-site] [--ads <file>]
//     --out      產物路徑，預設 dist/english-master-track.html
//     --data     內容資料目錄，預設 src/data
//     --app      前端程式目錄（含 index.html、license-header.txt），預設 src/app；供測試以 fixture 建置
//     --site     部署目錄，預設為 --out 所在目錄下的 site（預設 --out 時即 dist/site）
//     --no-site  只輸出 HTML（HTML 位元組與完整建置相同）
//     --ads      ads.txt 來源，預設 sources/deploy/ads.txt
//
// 結束碼：0 成功；1 建置中止（錯誤訊息輸出至 stderr，不寫出產物、不動部署目錄）。

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
/** 專案根目錄（tools/ 的上一層） */
export const PROJECT_ROOT = path.resolve(SCRIPT_DIR, "..");

/** 預設路徑 */
export const DEFAULTS = Object.freeze({
  out: path.join(PROJECT_ROOT, "dist", "english-master-track.html"),
  data: path.join(PROJECT_ROOT, "src", "data"),
  app: path.join(PROJECT_ROOT, "src", "app"),
  ads: path.join(PROJECT_ROOT, "sources", "deploy", "ads.txt"),
});

/** PWA 契約常數的固定來源（B-11 (1)：固定取專案檔，不隨 --app 改變） */
export const PWA_CORE_FILE = path.join(PROJECT_ROOT, "src", "app", "core", "pwa.js");

/** 產物大小上限（AC-19-04） */
export const MAX_BYTES = 5242880;
/** 大小警告門檻 4.5 MiB（architecture.md §6） */
export const WARN_BYTES = 4718592;
/** 字元編碼宣告須完整出現在檔案前 1,024 bytes 內（HTML 規範；architecture.md §5 v0.2） */
export const CHARSET_MAX_BYTES = 1024;
/** 字元編碼宣告字串（B-1、B-7） */
export const CHARSET_META = '<meta charset="utf-8">';
/** 模板開頭固定順序（B-1，v0.2）：DOCTYPE → <html lang> → <head> → <meta charset> */
const TEMPLATE_HEAD_RE = /^\s*<!DOCTYPE html>\s*<html\b[^>]*>\s*<head>\s*<meta charset="utf-8">\s*/i;

/** 模板標記（B-1） */
export const MARKERS = Object.freeze({
  LICENSE: "<!-- @@LICENSE@@ -->",
  STYLES: "/* @@STYLES@@ */",
  DATA: "<!-- @@DATA@@ -->",
  APP: "<!-- @@APP@@ -->",
});

/** 字庫全域變數名稱（契約 §3.1） */
export const VOCAB_GLOBAL = "MASTER_VOCAB_DATABASE";

/** 已知資料檔的載入順序（B-2）；vocab-*.js 插在 sources.js 之後 */
const DATA_ORDER_HEAD = ["sources.js"];
const DATA_ORDER_TAIL = ["templates.js", "part5.js", "decoder.js", "phrasebank.js"];
const VOCAB_FILE_RE = /^vocab-.*\.js$/;

/** 程式層序（architecture.md §4.1） */
const APP_LAYERS = ["core", "state", "services", "ui", "views"];
/** core 內必須最先載入的檔案（建置特例） */
const CORE_FIRST = ["constants.js", "wordkey.js"];

/** 產物禁止出現的外部資源樣式（B-7、AC-19-01）與錄音 API（v0.5，AC-21-03） */
export const FORBIDDEN_PATTERNS = Object.freeze([
  { name: "<script src>", re: /<script[^>]*\ssrc=/i },
  { name: "<link href>", re: /<link[^>]*\shref=/i },
  { name: "@import", re: /@import/i },
  { name: "url(http…)", re: /url\(\s*['"]?https?:/i },
  { name: "<img", re: /<img/i },
  { name: "<iframe", re: /<iframe/i },
  { name: "cdn.", re: /cdn\./i },
  { name: "fonts.googleapis", re: /fonts\.googleapis/i },
  { name: "cdn.tailwindcss.com", re: /cdn\.tailwindcss\.com/i },
  // v0.5（FE-41）：錄音 API 出現數須為 0，含註解（AC-21-03、NFR-3）
  { name: "MediaRecorder", re: /MediaRecorder/ },
  // v0.7（FE-47）：PWA 附屬檔不得以靜態 <link> 參照（HD-3）
  {
    name: "<link rel=PWA 附屬檔>",
    re: /<link\b[^>]*\brel=["']?(?:manifest|apple-touch-icon|apple-touch-startup-image|preload|prefetch|modulepreload)\b/i,
  },
]);

/**
 * B-7 逐字白名單（v0.7）：PWA 模式下必須恰 1 次；檢查 FORBIDDEN_PATTERNS 前只從檢查用副本移除這一個字串，
 * FORBIDDEN_PATTERNS 本身一條都不放寬（HD-1、HD-4）。
 */
export const ALLOWED_STATIC_TAGS = Object.freeze(['<link rel="icon" href="data:,">']);

/** 建置識別碼佔位（B-10、B-15） */
export const BUILD_ID_PLACEHOLDER = "@@BUILD_ID@@";
/** sw 範本中預先快取清單的佔位（B-15） */
export const PRECACHE_PLACEHOLDER = "/* @@PRECACHE_URLS@@ */";
/** sw 範本相對 --app 的位置（B-11 (2)） */
const SW_TEMPLATE_REL = path.join("pwa", "sw.template.js");
/** sw.js 允許的事件監聽種類（SW-10、B-15） */
const SW_ALLOWED_EVENTS = ["install", "activate", "fetch", "message"];
/** sw.js 禁用字串（B-15、V-PWA-05） */
export const SW_FORBIDDEN_STRINGS = Object.freeze([
  "importScripts", "indexedDB", "localStorage", "sessionStorage", '"push"', '"sync"', "periodicsync",
  "notificationclick", "backgroundfetch", "BroadcastChannel", "navigationPreload", "caches.match(",
  "http://", "https://", "@@",
]);
/** PNG 檔頭簽章（V-PWA-03） */
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** 建置中止錯誤；code 供測試判斷原因 */
export class BuildError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "BuildError";
    this.code = code;
  }
}

// ─────────────────────────────────────────────────────────────
// 共用小工具
// ─────────────────────────────────────────────────────────────

/** 字串的 UTF-8 位元組數 */
export function byteLen(s) {
  return Buffer.byteLength(s, "utf8");
}

/** 讀文字檔並去除 UTF-8 BOM */
function readText(file) {
  return fs.readFileSync(file, "utf8").replace(/^﻿/, "");
}

/** 檔名字母序比較（不受語系影響） */
function byName(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** 擷取命中位置附近的文字，方便錯誤訊息定位 */
function snippet(text, index, radius = 40) {
  const start = Math.max(0, index - radius);
  return text.slice(start, index + radius).replace(/\s+/g, " ");
}

// ─────────────────────────────────────────────────────────────
// B-1 模板標記檢查
// ─────────────────────────────────────────────────────────────

/**
 * 檢查模板標記並回傳各標記位置。
 * 規則：4 個標記各恰好 1 次；模板開頭依序為 <!DOCTYPE html>、<html lang>、<head>、
 * <meta charset="utf-8">，LICENSE 緊接在其後（中間只能有空白）（v0.2）；
 * STYLES 在 <style>…</style> 內；DATA 在 APP 之前，兩者都在 </body> 之前。
 * @param {string} template
 * @returns {{ LICENSE: number, STYLES: number, DATA: number, APP: number }}
 */
export function checkTemplate(template) {
  const pos = {};
  for (const [key, marker] of Object.entries(MARKERS)) {
    const first = template.indexOf(marker);
    if (first < 0) {
      throw new BuildError("MARKER_MISSING", `index.html 缺少標記 ${marker}`);
    }
    if (template.indexOf(marker, first + marker.length) >= 0) {
      throw new BuildError("MARKER_DUPLICATE", `index.html 的標記 ${marker} 出現超過 1 次`);
    }
    pos[key] = first;
  }

  // v0.2：charset 必須在授權標頭之前，確保落在前 1,024 bytes 內
  const head = TEMPLATE_HEAD_RE.exec(template);
  if (!head || head[0].length !== pos.LICENSE) {
    throw new BuildError(
      "MARKER_POSITION",
      `index.html 開頭必須依序為 <!DOCTYPE html>、<html lang>、<head>、${CHARSET_META}，` +
        `且 ${MARKERS.LICENSE} 緊接在 ${CHARSET_META} 之後`
    );
  }

  const styleOpen = template.lastIndexOf("<style", pos.STYLES);
  const styleClose = template.indexOf("</style", pos.STYLES);
  const styleCloseBefore = template.lastIndexOf("</style", pos.STYLES);
  if (styleOpen < 0 || styleClose < 0 || styleCloseBefore > styleOpen) {
    throw new BuildError("MARKER_POSITION", `index.html 的 ${MARKERS.STYLES} 必須在 <style> 內`);
  }

  if (pos.DATA > pos.APP) {
    throw new BuildError(
      "MARKER_POSITION",
      `index.html 的 ${MARKERS.DATA} 必須在 ${MARKERS.APP} 之前`
    );
  }
  const bodyClose = template.search(/<\/body>/i);
  if (bodyClose < 0 || pos.APP > bodyClose) {
    throw new BuildError(
      "MARKER_POSITION",
      `index.html 的 ${MARKERS.DATA}、${MARKERS.APP} 必須在 </body> 之前`
    );
  }
  return pos;
}

/**
 * 依標記位置一次組合產物（不用 String.replace，避免內容中的 $& 等被解讀，
 * 也避免已插入的內容再被當成標記替換）。
 */
export function fillTemplate(template, parts) {
  const pos = checkTemplate(template);
  const order = Object.keys(MARKERS).sort((a, b) => pos[a] - pos[b]);
  let out = "";
  let cursor = 0;
  for (const key of order) {
    out += template.slice(cursor, pos[key]) + parts[key];
    cursor = pos[key] + MARKERS[key].length;
  }
  return out + template.slice(cursor);
}

// ─────────────────────────────────────────────────────────────
// B-2 資料收集、B-3 內嵌安全
// ─────────────────────────────────────────────────────────────

/**
 * 列出資料目錄中要打包的檔案並排序（只看第一層；_ 開頭不打包，D-1）。
 * @returns {{ files: string[], unknown: string[] }} 檔名（不含路徑）
 */
export function listDataFiles(dataDir) {
  if (!fs.existsSync(dataDir) || !fs.statSync(dataDir).isDirectory()) {
    return { files: [], unknown: [] };
  }
  const names = fs
    .readdirSync(dataDir, { withFileTypes: true })
    .filter((d) => d.isFile() && d.name.endsWith(".js") && !d.name.startsWith("_"))
    .map((d) => d.name);
  const set = new Set(names);
  const head = DATA_ORDER_HEAD.filter((n) => set.has(n));
  const vocab = names.filter((n) => VOCAB_FILE_RE.test(n)).sort(byName);
  const tail = DATA_ORDER_TAIL.filter((n) => set.has(n));
  const known = new Set([...head, ...vocab, ...tail]);
  const unknown = names.filter((n) => !known.has(n)).sort(byName);
  return { files: [...head, ...vocab, ...tail, ...unknown], unknown };
}

/** 檢查值是否為 JSON 相容字面值（C-4：不含函式、undefined、非有限數值等） */
function assertJsonCompatible(value, where) {
  const seen = new Set();
  (function walk(v, p) {
    const t = typeof v;
    if (v === null || t === "string" || t === "boolean") return;
    if (t === "number") {
      if (!Number.isFinite(v)) throw new BuildError("DATA_NOT_JSON", `${where}：${p} 不是有限數值`);
      return;
    }
    if (t === "undefined" || t === "function" || t === "symbol" || t === "bigint") {
      throw new BuildError("DATA_NOT_JSON", `${where}：${p} 的型別 ${t} 不符合 C-4（JSON 相容字面值）`);
    }
    if (seen.has(v)) throw new BuildError("DATA_NOT_JSON", `${where}：${p} 有循環參照`);
    seen.add(v);
    if (Array.isArray(v)) {
      for (let i = 0; i < v.length; i++) {
        if (!(i in v)) throw new BuildError("DATA_NOT_JSON", `${where}：${p}[${i}] 為空洞（undefined）`);
        walk(v[i], `${p}[${i}]`);
      }
    } else {
      for (const k of Object.keys(v)) walk(v[k], `${p}.${k}`);
    }
    seen.delete(v);
  })(value, where);
}

/**
 * 以 node:vm 在 { window: {} } 沙箱執行單一資料檔，回傳它定義的全域變數。
 * @returns {Record<string, unknown>}
 */
export function runDataFile(file) {
  const code = readText(file);
  const sandbox = { window: {} };
  try {
    vm.runInNewContext(code, sandbox, { filename: file, timeout: 10000 });
  } catch (err) {
    throw new BuildError("DATA_EXEC", `資料檔執行失敗（C-4）：${path.basename(file)}：${err && err.message}`);
  }
  const globals = {};
  for (const key of Object.keys(sandbox.window)) {
    assertJsonCompatible(sandbox.window[key], `${path.basename(file)} window.${key}`);
    globals[key] = sandbox.window[key];
  }
  return globals;
}

/** 依 rank 遞增穩定排序；rank 非數值者排最後 */
export function sortByRank(items) {
  return items
    .map((item, i) => ({ item, i }))
    .sort((a, b) => {
      const ra = a.item && typeof a.item.rank === "number" ? a.item.rank : Infinity;
      const rb = b.item && typeof b.item.rank === "number" ? b.item.rank : Infinity;
      return ra === rb ? a.i - b.i : ra - rb;
    })
    .map((x) => x.item);
}

/** B-3：資料 JSON 內嵌於 <script> 前的跳脫（</ → <\/、<!-- → <\!--） */
export function escapeForScript(json) {
  return json.replace(/<!--/g, "<\\!--").replace(/<\//g, "<\\/");
}

/**
 * B-2：收集資料並輸出 window.X=<json>; 列。
 * 所有 vocab 檔的 MASTER_VOCAB_DATABASE 合併、依 rank 排序為單一陣列（與 concat 等價，契約 §3.1），
 * 輸出位置在第一個提供字庫的檔案處。
 * @returns {{ lines: { name: string, code: string, count?: number }[], files: string[], vocabCount: number }}
 */
export function collectData(dataDir, warn) {
  const { files, unknown } = listDataFiles(dataDir);
  for (const n of unknown) warn(`資料目錄有未列於契約的檔案，排在最後打包：${n}`);
  if (files.length === 0) {
    warn(`資料目錄沒有可打包的資料檔：${dataDir}（前端依 C-6 容錯）`);
  } else {
    const has = new Set(files);
    for (const n of [...DATA_ORDER_HEAD, ...DATA_ORDER_TAIL]) {
      if (!has.has(n)) warn(`缺少資料檔 ${n}（前端依 C-6 容錯）`);
    }
    if (!files.some((n) => VOCAB_FILE_RE.test(n))) warn("缺少字庫資料檔 vocab-*.js（前端依 C-6 容錯）");
  }

  /** 依首次出現順序保存的全域變數 */
  const values = new Map();
  const owner = new Map();
  let vocab = null;
  for (const name of files) {
    const globals = runDataFile(path.join(dataDir, name));
    const keys = Object.keys(globals);
    if (keys.length === 0) warn(`資料檔沒有定義任何 window 全域變數：${name}`);
    for (const key of keys) {
      if (key === VOCAB_GLOBAL) {
        const arr = globals[key];
        if (!Array.isArray(arr)) {
          throw new BuildError("DATA_NOT_JSON", `${name}：window.${VOCAB_GLOBAL} 必須是陣列`);
        }
        if (vocab === null) {
          vocab = [];
          values.set(VOCAB_GLOBAL, vocab);
        }
        vocab.push(...arr);
        continue;
      }
      if (values.has(key)) {
        warn(`window.${key} 同時由 ${owner.get(key)} 與 ${name} 定義，以後者為準（與瀏覽器載入行為一致）`);
      }
      values.set(key, globals[key]);
      owner.set(key, name);
    }
  }

  const lines = [];
  for (const [key, value] of values) {
    const v = key === VOCAB_GLOBAL ? sortByRank(value) : value;
    const code = `window.${key}=${escapeForScript(JSON.stringify(v))};`;
    lines.push(key === VOCAB_GLOBAL ? { name: key, code, count: v.length } : { name: key, code });
  }
  return { lines, files, vocabCount: vocab ? vocab.length : 0, license: values.get("PROJECT_LICENSE") };
}

// ─────────────────────────────────────────────────────────────
// B-4 程式收集
// ─────────────────────────────────────────────────────────────

/** 遞迴列出目錄下的 .js（排除 __tests__ 與 _ 開頭的檔案／目錄），回傳相對 appDir 的路徑（/ 分隔） */
function listJs(appDir, rel) {
  const abs = path.join(appDir, rel);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) return [];
  const entries = fs.readdirSync(abs, { withFileTypes: true }).sort((a, b) => byName(a.name, b.name));
  const out = [];
  for (const d of entries) {
    if (d.name.startsWith("_")) continue; // 含 __tests__（D-1）
    const childRel = rel + "/" + d.name;
    if (d.isDirectory()) out.push(...listJs(appDir, childRel));
    else if (d.isFile() && d.name.endsWith(".js")) out.push(childRel);
  }
  return out;
}

/**
 * 依 §4.1 串接順序列出程式檔：core（constants.js、wordkey.js 最先）→ state → services → ui → views → main.js。
 * @returns {string[]} 相對 appDir 的路徑
 */
export function listAppFiles(appDir) {
  const result = [];
  for (const layer of APP_LAYERS) {
    let files = listJs(appDir, layer);
    if (layer === "core") {
      const first = CORE_FIRST.map((n) => "core/" + n).filter((f) => files.includes(f));
      files = [...first, ...files.filter((f) => !first.includes(f))];
    }
    result.push(...files);
  }
  if (fs.existsSync(path.join(appDir, "main.js"))) result.push("main.js");
  return result;
}

/** B-3、B-4：串接程式；程式含 </script 字樣即中止 */
export function collectApp(appDir, warn) {
  const files = listAppFiles(appDir);
  if (files.length === 0) warn(`沒有找到任何程式檔：${appDir}`);
  const chunks = [];
  for (const rel of files) {
    const code = readText(path.join(appDir, rel));
    const hit = /<\/script/i.exec(code);
    if (hit) {
      throw new BuildError(
        "CODE_SCRIPT_CLOSE",
        `程式 ${rel} 含有 </script 字樣，會提早結束內嵌 <script>：…${snippet(code, hit.index)}…`
      );
    }
    if (code.includes("<!--")) warn(`程式 ${rel} 含有 <!-- 字樣，請確認不會影響內嵌 <script> 解析`);
    chunks.push(`/* ${rel} */\n${code.replace(/\s+$/, "")}\n`);
  }
  return { code: chunks.join("\n"), files };
}

// ─────────────────────────────────────────────────────────────
// B-5 樣式
// ─────────────────────────────────────────────────────────────

/** 串接 styles/*.css（檔名序）；含 @import、url(http 即中止 */
export function collectStyles(appDir) {
  const dir = path.join(appDir, "styles");
  if (!fs.existsSync(dir)) return { css: "", files: [] };
  const files = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isFile() && d.name.endsWith(".css") && !d.name.startsWith("_"))
    .map((d) => d.name)
    .sort(byName);
  const chunks = [];
  for (const name of files) {
    const css = readText(path.join(dir, name));
    if (/@import/i.test(css)) {
      throw new BuildError("CSS_IMPORT", `樣式 ${name} 含有 @import（AC-19-01 禁止外部資源）`);
    }
    if (/url\(\s*['"]?\s*https?:/i.test(css)) {
      throw new BuildError("CSS_EXTERNAL_URL", `樣式 ${name} 含有 url(http…)（AC-19-01 禁止外部資源）`);
    }
    if (/<\/style/i.test(css)) {
      throw new BuildError("CSS_STYLE_CLOSE", `樣式 ${name} 含有 </style 字樣，會提早結束內嵌 <style>`);
    }
    chunks.push(`/* ${name} */\n${css.replace(/\s+$/, "")}\n`);
  }
  return { css: chunks.join("\n"), files };
}

// ─────────────────────────────────────────────────────────────
// B-6 授權標頭
// ─────────────────────────────────────────────────────────────

/**
 * 產生授權標頭註解。{{YEAR}} 換成 PROJECT_LICENSE.copyrightYear；缺資料時用當年並警告。
 * 內容含 -- 會破壞 HTML 註解 → 中止。
 */
export function buildLicenseHeader(text, license, warn, now = new Date()) {
  let year = license && Number.isInteger(license.copyrightYear) ? license.copyrightYear : null;
  if (year === null) {
    year = now.getFullYear();
    warn(`找不到 PROJECT_LICENSE.copyrightYear，授權標頭年份改用當年 ${year}`);
  }
  const body = text.replace(/\{\{YEAR\}\}/g, String(year)).replace(/\s+$/, "");
  if (body.includes("--")) {
    throw new BuildError("LICENSE_DOUBLE_DASH", "license-header.txt 不可含連續兩個減號（會破壞 HTML 註解）");
  }
  if (body.startsWith(">") || body.startsWith("->")) {
    throw new BuildError("LICENSE_COMMENT", "license-header.txt 不可以 > 開頭（會破壞 HTML 註解）");
  }
  return { header: `<!--\n${body}\n-->`, year };
}

// ─────────────────────────────────────────────────────────────
// B-7 產物檢查
// ─────────────────────────────────────────────────────────────

/**
 * 檢查 charset 宣告位置（v0.2）：結束位置以 UTF-8 bytes 計 ≤ 1,024，且其前無非 ASCII 字元。
 * @returns {number} charset 宣告結束位置（bytes）
 */
export function checkCharset(html) {
  const at = html.search(/<meta charset="utf-8">/i);
  if (at < 0) {
    throw new BuildError("CHARSET_POSITION", `產物缺少 ${CHARSET_META}（AC-19-03）`);
  }
  const before = html.slice(0, at);
  if (/[^\x00-\x7f]/.test(before)) {
    throw new BuildError("CHARSET_POSITION", `產物的 ${CHARSET_META} 之前不可有非 ASCII 字元`);
  }
  const end = byteLen(before) + byteLen(CHARSET_META);
  if (end > CHARSET_MAX_BYTES) {
    throw new BuildError(
      "CHARSET_POSITION",
      `產物的 ${CHARSET_META} 結束於第 ${end} bytes，超過前 ${CHARSET_MAX_BYTES} bytes 限制`
    );
  }
  return end;
}

/**
 * 檢查產物大小、charset 位置與外部資源；違規即中止，回傳大小。
 * （v0.7）opts.pwa 為 true 時：ALLOWED_STATIC_TAGS 每個字串須恰 1 次，檢查 FORBIDDEN_PATTERNS 前只從檢查用副本移除；
 * 另檢查不得殘留 @@BUILD_ID@@、emt-build-id 的值符合 PWA_BUILD_ID_PATTERN（opts.buildIdPattern）。
 * @param {string} html
 * @param {(s: string) => void} warn
 * @param {{ pwa?: boolean, metaName?: string, buildIdPattern?: string }} [opts]
 */
export function checkOutput(html, warn, opts = {}) {
  checkCharset(html);
  const bytes = byteLen(html);
  if (bytes > MAX_BYTES) {
    throw new BuildError(
      "SIZE_LIMIT",
      `產物 ${bytes.toLocaleString("en-US")} bytes 超過上限 ${MAX_BYTES.toLocaleString("en-US")} bytes（AC-19-04）`
    );
  }
  if (bytes > WARN_BYTES) {
    warn(
      `產物 ${bytes.toLocaleString("en-US")} bytes 超過 4.5 MiB 警告門檻，請 FE-18 評估啟用 B-9 第 2 層壓縮`
    );
  }
  let checked = html;
  if (opts.pwa) {
    for (const tag of ALLOWED_STATIC_TAGS) {
      const n = countOf(checked, tag);
      if (n !== 1) {
        throw new BuildError("PWA_HEAD", `產物中 ${tag} 必須恰 1 次（目前 ${n} 次，HD-1、HD-4）`);
      }
      const at = checked.indexOf(tag);
      checked = checked.slice(0, at) + checked.slice(at + tag.length);
    }
  }
  for (const { name, re } of FORBIDDEN_PATTERNS) {
    const m = re.exec(checked);
    if (m) {
      throw new BuildError(
        "EXTERNAL_RESOURCE",
        `產物含有禁止的外部資源樣式 ${name}（AC-19-01）：…${snippet(checked, m.index)}…`
      );
    }
  }
  if (opts.pwa) {
    if (html.includes(BUILD_ID_PLACEHOLDER)) {
      throw new BuildError("PWA_HEAD", `產物仍含 ${BUILD_ID_PLACEHOLDER}（B-7）`);
    }
    const metaRe = new RegExp(`<meta name="${opts.metaName}" content="([^"]*)">`);
    const m = metaRe.exec(html);
    if (!m || !new RegExp(opts.buildIdPattern).test(m[1])) {
      throw new BuildError("PWA_HEAD", `產物的 <meta name="${opts.metaName}"> 缺少或值不符 ${opts.buildIdPattern}`);
    }
  }
  return bytes;
}

/** 字串 needle 在 text 中（不重疊）出現的次數 */
export function countOf(text, needle) {
  if (!needle) return 0;
  let n = 0;
  let at = text.indexOf(needle);
  while (at >= 0) {
    n++;
    at = text.indexOf(needle, at + needle.length);
  }
  return n;
}

/** 以位置取代唯一的 needle（不用 String.replace，避免 $& 等被解讀） */
function replaceOnce(text, needle, value) {
  const at = text.indexOf(needle);
  return text.slice(0, at) + value + text.slice(at + needle.length);
}

// ─────────────────────────────────────────────────────────────
// v0.7 PWA（B-10～B-16；architecture.md §5.1、§7.18.2）
// ─────────────────────────────────────────────────────────────

/** 讀取 PWA 契約常數（B-11 (1)；固定專案檔，Node 下 module.exports 即同一 api 物件） */
export function loadPwaCore() {
  const require = createRequire(import.meta.url);
  return require(PWA_CORE_FILE);
}

/**
 * B-10：判定 PWA 模式。模板中 @@BUILD_ID@@ 恰 1 次且位於 <meta name="emt-build-id" content="@@BUILD_ID@@"> → true；
 * 0 次 → false；其他情況中止。
 * @param {string} template
 * @param {string} metaName PWA_BUILD_ID_META_NAME
 * @returns {boolean}
 */
export function detectPwaMode(template, metaName) {
  const n = countOf(template, BUILD_ID_PLACEHOLDER);
  if (n === 0) return false;
  if (n > 1) {
    throw new BuildError("PWA_TEMPLATE", `index.html 的 ${BUILD_ID_PLACEHOLDER} 出現 ${n} 次（必須恰 1 次）`);
  }
  const meta = `<meta name="${metaName}" content="${BUILD_ID_PLACEHOLDER}">`;
  if (countOf(template, meta) !== 1) {
    throw new BuildError("PWA_TEMPLATE", `index.html 的 ${BUILD_ID_PLACEHOLDER} 必須位於 ${meta}`);
  }
  return true;
}

/**
 * V-PWA-03：PNG 簽章、第一個區塊為 IHDR、寬 = 高 = sizePx、位元深度 8、色彩類型 2、無 tRNS 區塊。
 * @param {Buffer} buf
 * @param {number} sizePx
 * @returns {string[]} 不符項目（空陣列 = 通過）
 */
export function checkPng(buf, sizePx) {
  const problems = [];
  if (!Buffer.isBuffer(buf) || buf.length < 33 || !buf.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return ["不是 PNG（簽章不符或檔案過短）"];
  }
  if (buf.toString("latin1", 12, 16) !== "IHDR") {
    return ["第一個區塊不是 IHDR"];
  }
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const bitDepth = buf[24];
  const colorType = buf[25];
  if (width !== sizePx || height !== sizePx) problems.push(`尺寸 ${width}×${height}（應為 ${sizePx}×${sizePx}）`);
  if (bitDepth !== 8) problems.push(`位元深度 ${bitDepth}（應為 8）`);
  if (colorType !== 2) problems.push(`色彩類型 ${colorType}（應為 2 = RGB）`);
  let offset = 8;
  while (offset + 8 <= buf.length) {
    const len = buf.readUInt32BE(offset);
    const type = buf.toString("latin1", offset + 4, offset + 8);
    if (type === "tRNS") {
      problems.push("含 tRNS 區塊（透明度）");
      break;
    }
    if (type === "IEND") break;
    offset += 12 + len;
  }
  return problems;
}

/**
 * B-11：讀取並檢查 PWA 輸入（sw 範本、4 張圖示、--bg、ads.txt）。
 * @returns {{ swTemplate: string, icons: { path: string, bytes: Buffer }[], ads: Buffer|null }}
 */
export function readPwaInputs(appDir, pwa, site, adsFile) {
  // (2) sw 範本
  const swFile = path.join(appDir, SW_TEMPLATE_REL);
  if (!fs.existsSync(swFile)) {
    throw new BuildError("PWA_SW_TEMPLATE", `找不到 service worker 範本 ${swFile}`);
  }
  const swTemplate = readText(swFile);
  if (countOf(swTemplate, BUILD_ID_PLACEHOLDER) !== 1 || countOf(swTemplate, PRECACHE_PLACEHOLDER) !== 1) {
    throw new BuildError(
      "PWA_SW_TEMPLATE",
      `sw 範本的 ${BUILD_ID_PLACEHOLDER} 與 ${PRECACHE_PLACEHOLDER} 必須各恰 1 次`
    );
  }

  // (3) 圖示：依 PWA_DEPLOY_FILES 順序
  const icons = [];
  for (const f of pwa.PWA_DEPLOY_FILES) {
    if (typeof f.sizePx !== "number") continue;
    const name = f.path.replace(/^icons\//, "");
    const file = path.join(appDir, "assets", "icons", name);
    if (!fs.existsSync(file)) {
      throw new BuildError("PWA_ICON", `找不到圖示 ${name}（${file}）`);
    }
    const bytes = fs.readFileSync(file);
    const problems = checkPng(bytes, f.sizePx);
    if (problems.length) {
      throw new BuildError("PWA_ICON", `圖示 ${name} 不符 V-PWA-03：${problems.join("；")}`);
    }
    icons.push({ path: f.path, bytes });
  }

  // (4) DS-13：--bg = PWA_BACKGROUND_COLOR
  const baseCss = path.join(appDir, "styles", "00-base.css");
  const css = fs.existsSync(baseCss) ? readText(baseCss) : "";
  const bg = /--bg\s*:\s*([^;}\s]+)/.exec(css);
  if (!bg || bg[1].toLowerCase() !== pwa.PWA_BACKGROUND_COLOR.toLowerCase()) {
    throw new BuildError(
      "PWA_BG_COLOR",
      `styles/00-base.css 的 --bg（${bg ? bg[1] : "未定義"}）與 PWA_BACKGROUND_COLOR ${pwa.PWA_BACKGROUND_COLOR} 不同（DS-13、AC-34-04）`
    );
  }

  // (5) ads.txt（只在輸出部署目錄時需要；內容原樣）
  let ads = null;
  if (site !== false) {
    try {
      ads = fs.readFileSync(adsFile);
    } catch (err) {
      throw new BuildError("ADS_MISSING", `找不到或無法讀取 ads.txt：${adsFile}`);
    }
  }
  return { swTemplate, icons, ads };
}

/**
 * B-12：HD-1 靜態元素各逐字恰 1 次且皆在 </head> 之前；<title>English Master Track</title> 恰 1 次。
 * @param {string} html HTML₀（仍含佔位）
 * @returns {string[]} HD-1 元素清單
 */
export function checkPwaHead(html, pwa) {
  const elements = [
    `<meta name="theme-color" content="${pwa.PWA_THEME_COLOR}">`,
    `<meta name="apple-mobile-web-app-title" content="${pwa.PWA_APP_NAME}">`,
    '<meta name="apple-mobile-web-app-capable" content="yes">',
    '<meta name="mobile-web-app-capable" content="yes">',
    '<meta name="apple-mobile-web-app-status-bar-style" content="default">',
    `<meta name="${pwa.PWA_BUILD_ID_META_NAME}" content="${BUILD_ID_PLACEHOLDER}">`,
    ALLOWED_STATIC_TAGS[0],
  ];
  const headEnd = html.search(/<\/head>/i);
  for (const e of elements) {
    const n = countOf(html, e);
    if (n !== 1) throw new BuildError("PWA_HEAD", `HTML 的 HD-1 元素 ${e} 必須恰 1 次（目前 ${n} 次）`);
    if (headEnd < 0 || html.indexOf(e) > headEnd) {
      throw new BuildError("PWA_HEAD", `HTML 的 HD-1 元素 ${e} 必須位於 </head> 之前`);
    }
  }
  const title = "<title>English Master Track</title>";
  if (countOf(html, title) !== 1) {
    throw new BuildError("PWA_HEAD", `HTML 的 ${title} 必須恰 1 次`);
  }
  return elements;
}

/**
 * B-13：manifest.webmanifest 的內容（UTF-8 無 BOM），並自我驗證 V-PWA-02。
 * @returns {string}
 */
export function buildManifest(pwa) {
  const text = JSON.stringify(pwa.PWA_MANIFEST, null, 2) + "\n";
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new BuildError("PWA_MANIFEST", "manifest 不是合法 JSON");
  }
  const deployPaths = new Set(pwa.PWA_DEPLOY_FILES.map((f) => f.path));
  if (
    JSON.stringify(parsed) !== JSON.stringify(pwa.PWA_MANIFEST) ||
    Object.keys(parsed).length !== 10 ||
    !Array.isArray(parsed.icons) ||
    !parsed.icons.every((i) => deployPaths.has(i.src))
  ) {
    throw new BuildError("PWA_MANIFEST", "manifest 與 PWA_MANIFEST 不符（V-PWA-02、MF-1）");
  }
  return text;
}

/**
 * B-14：BUILD_ID = SHA-256（依序 7 筆「路徑\n位元組長度\n」+ 內容 + "\n"）的十六進位前 16 字元（SW-2）。
 * @param {{ path: string, bytes: Buffer }[]} records
 * @returns {string}
 */
export function computeBuildId(records) {
  const h = crypto.createHash("sha256");
  for (const r of records) {
    h.update(Buffer.from(`${r.path}\n${r.bytes.length}\n`, "utf8"));
    h.update(r.bytes);
    h.update(Buffer.from("\n", "utf8"));
  }
  return h.digest("hex").slice(0, 16);
}

/**
 * B-15：注入 BUILD_ID 與預先快取清單，並對注入後 sw.js 做 V-PWA-05 檢查。
 * @returns {string} sw.js 內容
 */
export function buildServiceWorker(swTemplate, buildId, pwa) {
  const prefixLine = `var CACHE_PREFIX = ${JSON.stringify(pwa.PWA_CACHE_PREFIX)};`;
  if (countOf(swTemplate, prefixLine) !== 1) {
    throw new BuildError("PWA_SW", `sw 範本必須逐字含 ${prefixLine} 恰 1 次`);
  }
  const list = pwa.PWA_PRECACHE_URLS.map((u) => JSON.stringify(u)).join(", ");
  const sw = replaceOnce(replaceOnce(swTemplate, BUILD_ID_PLACEHOLDER, buildId), PRECACHE_PLACEHOLDER, list);
  if (!sw.includes(`var BUILD_ID = "${buildId}";`)) {
    throw new BuildError("PWA_SW", "sw.js 缺少 var BUILD_ID = \"<BUILD_ID>\";（V-PWA-05）");
  }
  if (!sw.includes(`var PRECACHE_URLS = [${list}];`)) {
    throw new BuildError("PWA_SW", "sw.js 的預先快取清單與 PWA_PRECACHE_URLS 不符（V-PWA-05）");
  }
  for (const s of SW_FORBIDDEN_STRINGS) {
    if (sw.includes(s)) throw new BuildError("PWA_SW", `sw.js 含禁用字串 ${s}（V-PWA-05、SW-10）`);
  }
  if (sw.includes("self.on")) {
    throw new BuildError("PWA_SW", "sw.js 不得以 self.on… 屬性指派事件（SW-10）");
  }
  const types = [...sw.matchAll(/addEventListener\(\s*(["'])([^"']*)\1/g)].map((m) => m[2]);
  const total = countOf(sw, "addEventListener(");
  const ok =
    total === SW_ALLOWED_EVENTS.length &&
    types.length === total &&
    SW_ALLOWED_EVENTS.every((t) => types.filter((x) => x === t).length === 1);
  if (!ok) {
    throw new BuildError(
      "PWA_SW",
      `sw.js 的事件監聽必須恰為 ${SW_ALLOWED_EVENTS.join("、")} 各 1 次（目前：${types.join("、") || "無"}）`
    );
  }
  return sw;
}

/** 遞迴列出目錄內容（相對路徑，/ 分隔）；回傳 { files, dirs } */
function listTree(dir, rel = "") {
  const files = [];
  const dirs = [];
  for (const d of fs.readdirSync(path.join(dir, rel), { withFileTypes: true }).sort((a, b) => byName(a.name, b.name))) {
    const r = rel ? `${rel}/${d.name}` : d.name;
    if (d.isDirectory()) {
      dirs.push(r);
      const sub = listTree(dir, r);
      files.push(...sub.files);
      dirs.push(...sub.dirs);
    } else {
      files.push(r);
    }
  }
  return { files, dirs };
}

/**
 * B-16 前置：部署目錄若已存在，只允許 PWA_DEPLOY_FILES 的路徑與 icons/ 目錄；有其他任何檔案或目錄 → 中止且不刪除。
 */
export function checkSiteDir(siteDir, pwa) {
  if (!fs.existsSync(siteDir)) return;
  if (!fs.statSync(siteDir).isDirectory()) {
    throw new BuildError("SITE_DIR_UNEXPECTED", `部署目錄 ${siteDir} 已存在且不是目錄（未刪除任何檔案）`);
  }
  const allowedFiles = new Set(pwa.PWA_DEPLOY_FILES.map((f) => f.path));
  const allowedDirs = new Set(["icons"]);
  const { files, dirs } = listTree(siteDir);
  const extra = [...files.filter((f) => !allowedFiles.has(f)), ...dirs.filter((d) => !allowedDirs.has(d))];
  if (extra.length) {
    throw new BuildError(
      "SITE_DIR_UNEXPECTED",
      `部署目錄 ${siteDir} 含有非部署檔案（未刪除任何檔案）：${extra.slice(0, 5).join("、")}${extra.length > 5 ? "…" : ""}`
    );
  }
}

/** B-16 (3)：寫完回讀驗證 V-PWA-01 */
function verifySite(siteDir, siteFiles, outFile, pwa) {
  const expected = pwa.PWA_DEPLOY_FILES.map((f) => f.path).sort(byName);
  const { files } = listTree(siteDir);
  if (JSON.stringify(files.sort(byName)) !== JSON.stringify(expected)) {
    throw new BuildError("PWA_SITE_VERIFY", `部署目錄檔案集合不符：${files.join("、")}`);
  }
  for (const f of siteFiles) {
    if (!fs.readFileSync(path.join(siteDir, f.path)).equals(f.bytes)) {
      throw new BuildError("PWA_SITE_VERIFY", `部署目錄 ${f.path} 回讀內容與預期不同`);
    }
  }
  const index = fs.readFileSync(path.join(siteDir, "index.html"));
  if (!index.equals(fs.readFileSync(outFile))) {
    throw new BuildError("PWA_SITE_VERIFY", "部署目錄 index.html 與交付 HTML 位元組不同（DP-2）");
  }
}

// ─────────────────────────────────────────────────────────────
// B-9（備用，未實作）
// ─────────────────────────────────────────────────────────────

/**
 * B-9 第 2 層壓縮介面（備用）。只在 B-7 警告時由 FE-18 啟用：
 * 把 MASTER_VOCAB_DATABASE 改輸出為「欄位名陣列 + 值陣列」並附 10 行以內的還原函式，
 * 於其他資料與程式之前還原為契約形狀的 BuiltinVocabItem[]（執行期介面不變）。
 * @param {object[]} items 已依 rank 排序的字庫
 * @returns {string} 取代 window.MASTER_VOCAB_DATABASE=…; 的程式碼
 */
// TODO(FE-18)：B-7 觸發 4.5 MiB 警告時實作，並在 collectData 以選項切換。
export function compressVocabLayer2(items) {
  void items;
  throw new BuildError("NOT_IMPLEMENTED", "B-9 第 2 層壓縮尚未實作（預留給 FE-18）");
}

// ─────────────────────────────────────────────────────────────
// 主流程
// ─────────────────────────────────────────────────────────────

/**
 * 執行建置。全部檢查在記憶體完成後才寫出產物（中止時 out 與部署目錄都不寫、不刪）。
 * 執行順序（§5.1）：B-1～B-6 → B-10～B-15 → B-7（對最終 HTML）→ B-16 → B-8。
 * @param {{ out?: string, data?: string, app?: string, site?: string|false, ads?: string,
 *           log?: (s: string) => void, warn?: (s: string) => void, write?: boolean, now?: Date }} [options]
 *   site：部署目錄；未指定時為 out 所在目錄下的 site；false = 不輸出部署目錄（--no-site）
 * @returns {{ html: string, bytes: number, sections: { name: string, bytes: number }[],
 *             vocabCount: number, vocabAvgBytes: number|null, warnings: string[], out: string,
 *             buildId: string|null, site: { dir: string, files: { path: string, bytes: Buffer }[] }|null }}
 */
export function build(options = {}) {
  const out = path.resolve(options.out || DEFAULTS.out);
  const dataDir = path.resolve(options.data || DEFAULTS.data);
  const appDir = path.resolve(options.app || DEFAULTS.app);
  const site =
    options.site === false ? false : path.resolve(options.site || path.join(path.dirname(out), "site"));
  const adsFile = path.resolve(options.ads || DEFAULTS.ads);
  const log = options.log || ((s) => console.log(s));
  const warnings = [];
  const warn = (s) => {
    warnings.push(s);
    (options.warn || ((m) => console.warn(`[警告] ${m}`)))(s);
  };

  // B-1
  const templateFile = path.join(appDir, "index.html");
  if (!fs.existsSync(templateFile)) {
    throw new BuildError("TEMPLATE_MISSING", `找不到模板 ${templateFile}`);
  }
  const template = readText(templateFile);
  checkTemplate(template);
  // PWA 模式的初步判斷（只計數，不中止；正式檢查在 B-10）：決定 B-6 缺年份時是否升級為中止
  const pwaCandidate = countOf(template, BUILD_ID_PLACEHOLDER) > 0;

  // B-2、B-3
  const data = collectData(dataDir, warn);
  const dataCode = data.lines.map((l) => l.code).join("\n");

  // B-3、B-4
  const app = collectApp(appDir, warn);

  // B-5
  const styles = collectStyles(appDir);

  // B-6
  const licenseFile = path.join(appDir, "license-header.txt");
  if (!fs.existsSync(licenseFile)) {
    throw new BuildError("LICENSE_MISSING", `找不到授權標頭 ${licenseFile}`);
  }
  if (pwaCandidate && !(data.license && Number.isInteger(data.license.copyrightYear))) {
    // PWA 模式：不得以當年代替（跨年會讓 BUILD_ID 改變而不自知，§5.1 可重現性檢查）
    throw new BuildError("LICENSE_YEAR", "PWA 模式下必須提供 PROJECT_LICENSE.copyrightYear（不得以當年代替）");
  }
  const license = buildLicenseHeader(readText(licenseFile), data.license, warn, options.now);

  const parts = {
    LICENSE: license.header,
    STYLES: styles.css ? `\n${styles.css}` : "",
    DATA: `<script>\n${dataCode}\n</script>`,
    APP: `<script>\n${app.code}\n</script>`,
  };
  const html0 = fillTemplate(template, parts);

  // B-10 PWA 模式
  const pwa = pwaCandidate ? loadPwaCore() : null;
  const pwaMode = pwaCandidate ? detectPwaMode(template, pwa.PWA_BUILD_ID_META_NAME) : false;
  if (!pwaMode && site !== false) {
    throw new BuildError(
      "PWA_TEMPLATE",
      `index.html 沒有 ${BUILD_ID_PLACEHOLDER}（非 PWA 模式），不能輸出部署目錄；請加 --no-site 或 site: false`
    );
  }
  if (pwaMode && countOf(html0, BUILD_ID_PLACEHOLDER) !== 1) {
    throw new BuildError("PWA_TEMPLATE", `組合後的 HTML 中 ${BUILD_ID_PLACEHOLDER} 必須恰 1 次（程式或資料不得含此字串）`);
  }

  let html = html0;
  let buildId = null;
  let siteFiles = null;
  if (pwaMode) {
    // B-11 PWA 輸入
    const inputs = readPwaInputs(appDir, pwa, site, adsFile);
    // B-12 HTML head
    checkPwaHead(html0, pwa);
    // B-13 manifest
    const manifest = buildManifest(pwa);
    // B-14 BUILD_ID
    buildId = computeBuildId([
      { path: "index.html", bytes: Buffer.from(html0, "utf8") },
      { path: "manifest.webmanifest", bytes: Buffer.from(manifest, "utf8") },
      ...inputs.icons,
      { path: "sw.js", bytes: Buffer.from(inputs.swTemplate, "utf8") },
    ]);
    if (!new RegExp(pwa.PWA_BUILD_ID_PATTERN).test(buildId)) {
      throw new BuildError("PWA_TEMPLATE", `BUILD_ID ${buildId} 不符 ${pwa.PWA_BUILD_ID_PATTERN}`);
    }
    // B-15 注入
    html = replaceOnce(html0, BUILD_ID_PLACEHOLDER, buildId);
    const sw = buildServiceWorker(inputs.swTemplate, buildId, pwa);
    if (site !== false) {
      const byPath = new Map([
        ["index.html", Buffer.from(html, "utf8")],
        ["manifest.webmanifest", Buffer.from(manifest, "utf8")],
        ["sw.js", Buffer.from(sw, "utf8")],
        ["ads.txt", inputs.ads],
        ...inputs.icons.map((i) => [i.path, i.bytes]),
      ]);
      siteFiles = pwa.PWA_DEPLOY_FILES.map((f) => ({ path: f.path, bytes: byPath.get(f.path) }));
    }
  }

  // B-7（對最終 HTML）
  const bytes = checkOutput(
    html,
    warn,
    pwaMode ? { pwa: true, metaName: pwa.PWA_BUILD_ID_META_NAME, buildIdPattern: pwa.PWA_BUILD_ID_PATTERN } : {}
  );

  // B-8 報告
  const sections = [
    { name: "授權標頭", bytes: byteLen(parts.LICENSE) },
    { name: "CSS", bytes: byteLen(parts.STYLES) },
    ...data.lines.map((l) => ({ name: `資料 window.${l.name}`, bytes: byteLen(l.code) })),
    { name: "程式", bytes: byteLen(parts.APP) },
  ];
  const counted = sections.reduce((a, s) => a + s.bytes, 0);
  sections.push({ name: "模板與其他", bytes: bytes - counted });
  const vocabLine = data.lines.find((l) => l.name === VOCAB_GLOBAL);
  const vocabAvgBytes = vocabLine && vocabLine.count > 0 ? byteLen(vocabLine.code) / vocabLine.count : null;

  // B-16 輸出（部署目錄的內容檢查先於任何寫入）
  if (options.write !== false) {
    if (siteFiles) checkSiteDir(site, pwa);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, html, "utf8");
    if (siteFiles) {
      fs.rmSync(site, { recursive: true, force: true });
      for (const f of siteFiles) {
        const abs = path.join(site, ...f.path.split("/"));
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        fs.writeFileSync(abs, f.bytes);
      }
      verifySite(site, siteFiles, out, pwa);
    }
  }

  const fmt = (n) => n.toLocaleString("en-US");
  const report = [
    "建置完成",
    `  產物：${out}`,
    `  總大小：${fmt(bytes)} bytes（上限 ${fmt(MAX_BYTES)}）`,
    "  各區段：",
    ...sections.map((s) => `    ${s.name}：${fmt(s.bytes)} bytes`),
    `  字庫：${fmt(data.vocabCount)} 筆` +
      (vocabAvgBytes === null ? "" : `，平均每筆 ${vocabAvgBytes.toFixed(1)} bytes`),
    `  資料檔：${data.files.length} 個；程式檔：${app.files.length} 個；樣式檔：${styles.files.length} 個`,
    `  PWA 模式：${pwaMode ? "是" : "否"}` + (buildId ? `；BUILD_ID：${buildId}` : ""),
    ...(siteFiles
      ? [`  部署目錄：${site}`, ...siteFiles.map((f) => `    ${f.path}：${fmt(f.bytes.length)} bytes`)]
      : []),
    `  警告：${warnings.length} 則`,
  ];
  log(report.join("\n"));

  return {
    html,
    bytes,
    sections,
    vocabCount: data.vocabCount,
    vocabAvgBytes,
    warnings,
    out,
    buildId,
    site: siteFiles ? { dir: site, files: siteFiles } : null,
  };
}

/** 解析命令列參數（v0.7：新增 --site、--ads、--no-site；--site 與 --no-site 不可同時出現） */
export function parseArgs(argv) {
  const opts = {};
  let noSite = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--no-site") {
      noSite = true;
      continue;
    }
    const m = /^--(out|data|app|site|ads)(?:=(.*))?$/.exec(a);
    if (!m) {
      throw new BuildError("BAD_ARGS", `不認識的參數：${a}（可用 --out、--data、--app、--site、--no-site、--ads）`);
    }
    const value = m[2] !== undefined ? m[2] : argv[++i];
    if (!value) throw new BuildError("BAD_ARGS", `參數 --${m[1]} 缺少值`);
    opts[m[1]] = value;
  }
  if (noSite) {
    if (opts.site !== undefined) throw new BuildError("BAD_ARGS", "--site 與 --no-site 不可同時使用");
    opts.site = false;
  }
  return opts;
}

/** 是否以命令列直接執行本檔 */
function isMain() {
  if (!process.argv[1]) return false;
  const self = path.resolve(fileURLToPath(import.meta.url));
  const entry = path.resolve(process.argv[1]);
  return process.platform === "win32" ? self.toLowerCase() === entry.toLowerCase() : self === entry;
}

if (isMain()) {
  try {
    build(parseArgs(process.argv.slice(2)));
  } catch (err) {
    if (err instanceof BuildError) {
      console.error(`[建置中止] ${err.code}：${err.message}`);
    } else {
      console.error("[建置中止] 未預期的錯誤：", err);
    }
    process.exitCode = 1;
  }
}
