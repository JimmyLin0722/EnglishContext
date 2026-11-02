// English Master Track 建置腳本（FE-01；architecture.md §5 B-1～B-9）
// 將 src/app/index.html 模板、授權標頭、樣式、內容資料與程式串接為單一離線 HTML。
// 只使用 Node 內建模組，無 npm 相依。
//
// 用法：
//   node tools/build.mjs [--out <path>] [--data <dir>] [--app <dir>]
//     --out   產物路徑，預設 dist/english-master-track.html
//     --data  內容資料目錄，預設 src/data
//     --app   前端程式目錄（含 index.html、license-header.txt），預設 src/app；供測試以 fixture 建置
//
// 結束碼：0 成功；1 建置中止（錯誤訊息輸出至 stderr，不寫出產物）。

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
/** 專案根目錄（tools/ 的上一層） */
export const PROJECT_ROOT = path.resolve(SCRIPT_DIR, "..");

/** 預設路徑 */
export const DEFAULTS = Object.freeze({
  out: path.join(PROJECT_ROOT, "dist", "english-master-track.html"),
  data: path.join(PROJECT_ROOT, "src", "data"),
  app: path.join(PROJECT_ROOT, "src", "app"),
});

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
]);

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

/** 檢查產物大小、charset 位置與外部資源；違規即中止，回傳大小 */
export function checkOutput(html, warn) {
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
  for (const { name, re } of FORBIDDEN_PATTERNS) {
    const m = re.exec(html);
    if (m) {
      throw new BuildError(
        "EXTERNAL_RESOURCE",
        `產物含有禁止的外部資源樣式 ${name}（AC-19-01）：…${snippet(html, m.index)}…`
      );
    }
  }
  return bytes;
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
 * 執行建置。全部檢查通過後才寫出產物。
 * @param {{ out?: string, data?: string, app?: string, log?: (s: string) => void,
 *           warn?: (s: string) => void, write?: boolean, now?: Date }} [options]
 * @returns {{ html: string, bytes: number, sections: { name: string, bytes: number }[],
 *             vocabCount: number, vocabAvgBytes: number|null, warnings: string[], out: string }}
 */
export function build(options = {}) {
  const out = path.resolve(options.out || DEFAULTS.out);
  const dataDir = path.resolve(options.data || DEFAULTS.data);
  const appDir = path.resolve(options.app || DEFAULTS.app);
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
  const license = buildLicenseHeader(readText(licenseFile), data.license, warn, options.now);

  const parts = {
    LICENSE: license.header,
    STYLES: styles.css ? `\n${styles.css}` : "",
    DATA: `<script>\n${dataCode}\n</script>`,
    APP: `<script>\n${app.code}\n</script>`,
  };
  const html = fillTemplate(template, parts);

  // B-7
  const bytes = checkOutput(html, warn);

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

  if (options.write !== false) {
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, html, "utf8");
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
    `  警告：${warnings.length} 則`,
  ];
  log(report.join("\n"));

  return { html, bytes, sections, vocabCount: data.vocabCount, vocabAvgBytes, warnings, out };
}

/** 解析命令列參數 */
export function parseArgs(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const m = /^--(out|data|app)(?:=(.*))?$/.exec(a);
    if (!m) throw new BuildError("BAD_ARGS", `不認識的參數：${a}（可用 --out、--data、--app）`);
    const value = m[2] !== undefined ? m[2] : argv[++i];
    if (!value) throw new BuildError("BAD_ARGS", `參數 --${m[1]} 缺少值`);
    opts[m[1]] = value;
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
