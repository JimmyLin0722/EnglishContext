/*
 * island-static.test.js — 島嶼風格第一階段靜態檢查：名稱、外部參照、字型、遊戲名稱、強調橘、檔案大小、載入時依賴（FE-111）
 * 受測：tools/build.mjs 對專案實際原始碼的建置產物（輸出到 os.tmpdir() 下的暫存目錄、不輸出部署目錄，不寫 dist/）、
 *       src/app/ 非測試檔原始碼、core/island.js、ui/island-map.js、ui/island-art.js、styles/11-island-map.css
 * 依據：architecture.md v0.20 §7.32.11、§7.32.12、§10.15「island-static.test.js」列、§4.1 LD-1；
 *       契約 README §15.6 IA-1、V-ISL-08、§15.7 IV-2、IV-4、IV-5、§11.2 VC-3、VC-8
 * 涵蓋：AC-63-02、AC-68-05、AC-68-06、AC-72-01、AC-72-03 (a)
 *
 * - 7 類判定：(1) AC-72-03 (a) 字詞 (2) 畫面字串不含舊名稱 (3) 外部參照與字型網址 (4) font-family 只含系統字型
 *   (5) 島嶼插圖不用強調橘 (6) 交付檔大小 (7) 3 個新模組載入時不取用其他模組。
 * - (1) 的 9 個字詞一律以 Unicode 碼位組字，本檔原始碼不得出現字詞本身（否則本檔會被當成命中；本檔另有自我檢查）。
 * - (2) 只檢查畫面可能顯示的字串：JS 字串常值（先去除註解）與 index.html 文字節點、aria-label、title；
 *   程式註解、內部識別（"dashboard"、view-dashboard、db-*）不在範圍（§7.32.11）。
 * - 任何判定失敗代表其他任務的檔案不符；本檔不修改受測檔。
 */
"use strict";

const { describe, test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const { pathToFileURL } = require("node:url");

const ROOT = path.resolve(__dirname, "..", "..", "..");
const APP_DIR = path.join(ROOT, "src", "app");
const TESTS_DIR = path.join(APP_DIR, "__tests__");
const BUILD = path.join(ROOT, "tools", "build.mjs");

/** AC-19-04、IV-5：交付檔上限（bytes） */
const MAX_BYTES = 5242880;

/** 以 Unicode 碼位組字 */
function cp(...codes) {
  return String.fromCodePoint(...codes);
}

/**
 * AC-72-03 (a) 的 9 個字詞（以 Unicode 碼位組字，原始碼不出現字詞本身）。
 * 順序同 PRD：日文作品名全稱、簡稱、英文作品名、日文副標、公司英文名、公司中文名、系列中文名、系列英文名（含／不含重音）。
 */
const GAME_WORDS = Object.freeze([
  cp(0x52d5, 0x7269, 0x68ee, 0x53cb, 0x6703),
  cp(0x52d5, 0x68ee),
  cp(0x0041, 0x006e, 0x0069, 0x006d, 0x0061, 0x006c, 0x0020, 0x0043, 0x0072, 0x006f, 0x0073, 0x0073, 0x0069, 0x006e, 0x0067),
  cp(0x3042, 0x3064, 0x307e, 0x308c),
  cp(0x004e, 0x0069, 0x006e, 0x0074, 0x0065, 0x006e, 0x0064, 0x006f),
  cp(0x4efb, 0x5929, 0x5802),
  cp(0x5bf6, 0x53ef, 0x5922),
  cp(0x0050, 0x006f, 0x006b, 0x00e9, 0x006d, 0x006f, 0x006e),
  cp(0x0050, 0x006f, 0x006b, 0x0065, 0x006d, 0x006f, 0x006e)
]);

/** IA-1：畫面上不得出現的舊名稱 */
const OLD_NAMES = Object.freeze(["主控台", "學習主控台"]);

/** IV-5、IV-4、AC-72-01、AC-68-06：交付 HTML 不得出現的片段（不分大小寫） */
const FORBIDDEN_REFS = Object.freeze([
  "<image", "<use", "<foreignObject", "@font-face", "fonts.googleapis", "fonts.gstatic", "url(http", "@import"
]);

/** AC-68-06：允許的通用字族與 CSS 全域關鍵字（小寫比對） */
const GENERIC_FAMILIES = Object.freeze([
  "serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui", "ui-serif", "ui-sans-serif",
  "ui-monospace", "ui-rounded", "emoji", "math", "fangsong", "-apple-system", "blinkmacsystemfont"
]);
const CSS_WIDE_KEYWORDS = Object.freeze(["inherit", "initial", "unset", "revert", "revert-layer"]);

/** AC-68-06：允許的系統字型名稱（作業系統內建；小寫比對）。新增字型時須確認為系統內建，不得是網路字型 */
const SYSTEM_FONTS = Object.freeze([
  "microsoft jhenghei", "microsoft jhenghei ui", "microsoft yahei", "pingfang tc", "pingfang sc", "heiti tc",
  "noto sans tc", "noto sans cjk tc", "noto sans", "segoe ui", "segoe ui emoji", "segoe ui symbol",
  "lucida sans unicode", "arial unicode ms", "arial", "helvetica", "helvetica neue", "roboto",
  "consolas", "courier new", "menlo", "monaco", "sf mono", "liberation mono", "dejavu sans mono",
  "apple color emoji", "noto color emoji"
]);

// ─────────────────────────────────────────────────────────────
// 共用工具
// ─────────────────────────────────────────────────────────────

/** 讀文字檔（去除 BOM） */
function readText(file) {
  const text = fs.readFileSync(file, "utf8");
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/** 相對 src/app 的路徑（正斜線） */
function rel(file) {
  return path.relative(APP_DIR, file).split(path.sep).join("/");
}

/** 遞迴列出 src/app 下的檔案（不含 __tests__） */
function appFiles(dir = APP_DIR) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (full === TESTS_DIR) continue;
      out.push(...appFiles(full));
    } else if (ent.isFile()) {
      out.push(full);
    }
  }
  return out.sort();
}

/** 子字串出現次數（不重疊） */
function countOf(text, sub) {
  return text.split(sub).length - 1;
}

/**
 * 位元組層級的字詞命中數：以 UTF-8 搜尋（二進位檔也適用），並另以 NFD 拆解形式搜尋（含重音的字詞）。
 * @param {Buffer} buf
 * @returns {{ word: string, count: number }[]} 只列命中數 > 0 的字詞
 */
function gameWordHits(buf) {
  const hits = [];
  for (const word of GAME_WORDS) {
    const forms = Array.from(new Set([word.normalize("NFC"), word.normalize("NFD")]));
    let count = 0;
    for (const form of forms) {
      const needle = Buffer.from(form, "utf8");
      let at = buf.indexOf(needle);
      while (at >= 0) {
        count += 1;
        at = buf.indexOf(needle, at + needle.length);
      }
    }
    if (count > 0) hits.push({ word, count });
  }
  return hits;
}

/** 解開 JS 字串常值中的跳脫序列（\uXXXX、\u{...}、\xXX、常見單字元跳脫；其餘去掉反斜線） */
function unescapeJs(raw) {
  return raw.replace(/\\(u\{([0-9a-fA-F]+)\}|u([0-9a-fA-F]{4})|x([0-9a-fA-F]{2})|\r\n|[\s\S])/g, (all, seq, cp, u4, x2) => {
    if (cp) return String.fromCodePoint(parseInt(cp, 16));
    if (u4) return String.fromCharCode(parseInt(u4, 16));
    if (x2) return String.fromCharCode(parseInt(x2, 16));
    const map = { n: "\n", r: "\r", t: "\t", b: "\b", f: "\f", v: "\v", 0: "\0" };
    if (seq === "\n" || seq === "\r\n" || seq === "\r") return "";
    return Object.prototype.hasOwnProperty.call(map, seq) ? map[seq] : seq;
  });
}

/** 在這些符號或關鍵字之後的「/」視為正規表示式開頭 */
const REGEX_PREV_PUNCT = "(,=:[!&|?{};+-*%<>~^";
const REGEX_PREV_WORDS = new Set([
  "return", "typeof", "case", "do", "else", "in", "of", "new", "delete", "void", "throw", "instanceof", "yield", "await"
]);

/**
 * 極簡 JS 掃描器：去除註解，回傳全部字串常值（含樣板字串的固定片段，已解開跳脫）。
 * 正規表示式常值整段略過（其中的引號不視為字串）。
 * @param {string} src
 * @returns {string[]}
 */
function jsStrings(src) {
  const strings = [];
  const n = src.length;

  /**
   * 掃描程式碼；stopAtBrace = true 時遇到未配對的「}」即回傳（樣板字串的 ${...} 結束處）。
   * @returns {number} 停止位置
   */
  function scanCode(i, stopAtBrace) {
    let prev = "";
    let depth = 0;
    while (i < n) {
      const c = src[i];
      const d = src[i + 1];
      if (c === "/" && d === "/") {
        const end = src.indexOf("\n", i);
        i = end < 0 ? n : end;
        continue;
      }
      if (c === "/" && d === "*") {
        const end = src.indexOf("*/", i + 2);
        i = end < 0 ? n : end + 2;
        continue;
      }
      if (c === '"' || c === "'") {
        let j = i + 1;
        while (j < n && src[j] !== c) j += src[j] === "\\" ? 2 : 1;
        strings.push(unescapeJs(src.slice(i + 1, j)));
        i = j + 1;
        prev = "str";
        continue;
      }
      if (c === "`") {
        i = scanTemplate(i + 1);
        prev = "str";
        continue;
      }
      if (c === "/") {
        if (prev === "" || REGEX_PREV_PUNCT.includes(prev) || REGEX_PREV_WORDS.has(prev)) {
          let j = i + 1;
          let inClass = false;
          while (j < n) {
            const ch = src[j];
            if (ch === "\\") { j += 2; continue; }
            if (ch === "\n") break;
            if (inClass) { if (ch === "]") inClass = false; }
            else if (ch === "[") inClass = true;
            else if (ch === "/") break;
            j += 1;
          }
          j += 1;
          while (j < n && /[a-z]/i.test(src[j])) j += 1;
          i = j;
          prev = "str";
        } else {
          prev = "/";
          i += 1;
        }
        continue;
      }
      if (/\s/.test(c)) {
        i += 1;
        continue;
      }
      if (/[A-Za-z0-9_$]/.test(c)) {
        let j = i;
        while (j < n && /[A-Za-z0-9_$]/.test(src[j])) j += 1;
        prev = src.slice(i, j);
        i = j;
        continue;
      }
      if (c === "{") depth += 1;
      if (c === "}") {
        if (stopAtBrace && depth === 0) return i + 1;
        depth -= 1;
      }
      prev = c;
      i += 1;
    }
    return i;
  }

  /** 掃描樣板字串（起點在反引號之後）；固定片段加入 strings，${...} 內以 scanCode 遞迴 */
  function scanTemplate(i) {
    let chunk = "";
    while (i < n) {
      const c = src[i];
      if (c === "\\") { chunk += src.slice(i, i + 2); i += 2; continue; }
      if (c === "`") { strings.push(unescapeJs(chunk)); return i + 1; }
      if (c === "$" && src[i + 1] === "{") {
        strings.push(unescapeJs(chunk));
        chunk = "";
        i = scanCode(i + 2, true);
        continue;
      }
      chunk += c;
      i += 1;
    }
    strings.push(unescapeJs(chunk));
    return i;
  }

  scanCode(0, false);
  return strings;
}

/** 解開常見 HTML 字元參照 */
function decodeHtml(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (a, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (a, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (a, k) => ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: String.fromCharCode(0xa0) })[k]);
}

/**
 * index.html 的畫面字串：文字節點（不含註解、script、style 內容）與 aria-label、title 屬性值。
 * @returns {{ texts: string[], attrs: { name: string, value: string }[] }}
 */
function htmlScreenStrings(html) {
  const body = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "<script></script>")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "<style></style>");
  const texts = [];
  for (const m of body.matchAll(/>([^<]+)</g)) {
    const t = decodeHtml(m[1]).trim();
    if (t) texts.push(t);
  }
  const attrs = [];
  for (const tag of body.matchAll(/<[A-Za-z][^>]*>/g)) {
    for (const m of tag[0].matchAll(/\s(aria-label|title)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) {
      attrs.push({ name: m[1].toLowerCase(), value: decodeHtml(m[2] !== undefined ? m[2] : m[3]) });
    }
  }
  return { texts, attrs };
}

/** 以逗號切開字族清單（引號內的逗號不切），回傳去除引號、小寫後的名稱 */
function splitFamilies(value) {
  const out = [];
  let cur = "";
  let quote = null;
  for (const ch of value) {
    if (quote) {
      if (ch === quote) quote = null;
      else cur += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim().replace(/\s+/g, " ").toLowerCase());
}

/**
 * 收集文字中的字型宣告與 CSS 自訂屬性定義。
 * @returns {{ decls: { kind: string, value: string }[], vars: Map<string, string[]> }}
 */
function fontDeclsOf(text) {
  const decls = [];
  const clean = (v) => v.replace(/!important/i, "").trim();
  for (const m of text.matchAll(/(?<![-\w"'])font-family\s*:\s*([^;{}<\n]+)/gi)) decls.push({ kind: "font-family", value: clean(m[1]) });
  for (const m of text.matchAll(/["']font-family["']\s*:\s*(?:"([^"]*)"|'([^']*)')/gi)) decls.push({ kind: "font-family", value: clean(m[1] !== undefined ? m[1] : m[2]) });
  for (const m of text.matchAll(/\sfont-family\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) decls.push({ kind: "font-family", value: clean(m[1] !== undefined ? m[1] : m[2]) });
  for (const m of text.matchAll(/\bfontFamily\s*[:=]\s*(?:"([^"]*)"|'([^']*)'|`([^`]*)`)/g)) decls.push({ kind: "font-family", value: clean(m[1] || m[2] || m[3] || "") });
  for (const m of text.matchAll(/(?<![-\w])font\s*:\s*([^;{}<\n]+)/gi)) decls.push({ kind: "font", value: clean(m[1]) });
  const vars = new Map();
  for (const m of text.matchAll(/(--[\w-]+)\s*:\s*([^;{}<\n]+)/g)) {
    if (!vars.has(m[1])) vars.set(m[1], []);
    vars.get(m[1]).push(m[2].trim());
  }
  return { decls, vars };
}

/**
 * 判定字族清單：每個項目為系統字型或通用字族；var(--x[, 後備]) 依自訂屬性定義展開。
 * @returns {string[]} 不合格項目（空陣列 = 合格）
 */
function badFamilies(value, vars, seen = new Set()) {
  const v = value.trim();
  if (CSS_WIDE_KEYWORDS.includes(v.toLowerCase())) return [];
  const varMatch = /^var\(\s*(--[\w-]+)\s*(?:,\s*([\s\S]*))?\)$/.exec(v);
  if (varMatch) {
    const name = varMatch[1];
    if (seen.has(name)) return ["循環的 " + name];
    const defs = vars.get(name) || [];
    if (defs.length === 0 && varMatch[2] === undefined) return ["找不到定義 " + name];
    const bad = [];
    for (const def of defs) bad.push(...badFamilies(def, vars, new Set([...seen, name])));
    if (varMatch[2] !== undefined) bad.push(...badFamilies(varMatch[2], vars, seen));
    return bad;
  }
  return splitFamilies(v).filter((f) => !GENERIC_FAMILIES.includes(f) && !SYSTEM_FONTS.includes(f));
}

/** font 簡寫：CSS 全域關鍵字合格；否則取字級（須帶單位，可帶 /行高）之後的字族清單判定 */
function badFontShorthand(value, vars) {
  const v = value.trim();
  if (CSS_WIDE_KEYWORDS.includes(v.toLowerCase())) return [];
  const m = /(?:^|\s)[\d.]+(?:px|em|rem|%|pt|vw|vh|ch|ex)(?:\/\S+)?\s+(.+)$/i.exec(v);
  if (!m) return ["無法解析的 font 簡寫：" + v];
  return badFamilies(m[1], vars);
}

// ─────────────────────────────────────────────────────────────
// 建置產物（暫存目錄，不寫 dist/）
// ─────────────────────────────────────────────────────────────

let tmpDir = null;
let outFile = null;
let html = "";

before(async () => {
  const { build } = await import(pathToFileURL(BUILD).href);
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "emt-island-static-"));
  outFile = path.join(tmpDir, "english-master-track.html");
  html = build({ out: outFile, site: false, log() {}, warn() {} }).html;
});

after(() => {
  if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ─────────────────────────────────────────────────────────────
// 檢查工具本身（避免掃描器靜默失效而讓判定變成永遠通過）
// ─────────────────────────────────────────────────────────────

describe("檢查工具自我驗證", () => {
  test("jsStrings：去除註解、收集字串與樣板片段、略過正規表示式、解開跳脫", () => {
    const src = [
      "// 主控台 註解一",
      "/* 主控台 註解二 */",
      "var a = \"甲\", b = 'B\\'s';",
      "var re = /[\"'`]/g; var c = 4 / 2 / 1;",
      "var t = `前${ { k: \"內\" }.k }後`;",
      "var u = \"\\u7fa4\\u5cf6\";"
    ].join("\n");
    const got = jsStrings(src);
    assert.deepEqual(got, ["甲", "B's", "前", "內", "後", "群島"]);
    assert.ok(!got.some((s) => s.includes("主控台")));
  });

  test("jsStrings 對實際原始碼可用：core/constants.js 含「群島」、views/customizer.js 含確認視窗第 2 行", () => {
    const constants = jsStrings(readText(path.join(APP_DIR, "core", "constants.js")));
    assert.ok(constants.includes("群島"), "constants.js 字串常值中找不到「群島」");
    const customizer = jsStrings(readText(path.join(APP_DIR, "views", "customizer.js")));
    assert.ok(customizer.some((s) => s.includes("到「群島」頁按「匯出備份」")), "customizer.js 找不到 AC-32-01 第 2 行");
  });

  test("htmlScreenStrings：略過註解與 script，收集文字節點、aria-label、title", () => {
    const got = htmlScreenStrings('<!-- 主控台 --><nav aria-label="甲"><a title=\'乙\'>丙&amp;丁</a></nav><script>var x = "主控台";</script>');
    assert.deepEqual(got.texts, ["丙&丁"]);
    assert.deepEqual(got.attrs, [{ name: "aria-label", value: "甲" }, { name: "title", value: "乙" }]);
  });

  test("字型判定：系統字型與通用字族合格、var() 展開、網路字型不合格", () => {
    const vars = new Map([["--f", ['system-ui, "Noto Sans TC", sans-serif']], ["--bad", ['"Open Sans", sans-serif']]]);
    assert.deepEqual(badFamilies("var(--f)", vars), []);
    assert.deepEqual(badFamilies('Consolas, "Courier New", monospace', vars), []);
    assert.deepEqual(badFamilies("var(--bad)", vars), ["open sans"]);
    assert.deepEqual(badFamilies('"Some Web Font", sans-serif', vars), ["some web font"]);
    assert.deepEqual(badFontShorthand("inherit", vars), []);
    assert.deepEqual(badFontShorthand('700 16px/1.5 "Lobster", serif', vars), ["lobster"]);
  });

  test("遊戲字詞以碼位組字：共 9 個、互不相同；位元組搜尋可命中（含重音拆解形式）", () => {
    assert.equal(GAME_WORDS.length, 9);
    assert.equal(new Set(GAME_WORDS).size, 9);
    const sample = Buffer.from("x" + GAME_WORDS[4] + "y" + GAME_WORDS[7].normalize("NFD") + "z", "utf8");
    assert.deepEqual(gameWordHits(sample).map((h) => h.word), [GAME_WORDS[4], GAME_WORDS[7]]);
  });

  test("本測試檔原始碼不含 9 個字詞本身（doneWhen；避免本檔被當成命中）", () => {
    assert.deepEqual(gameWordHits(fs.readFileSync(__filename)), []);
  });
});

// ─────────────────────────────────────────────────────────────
// (1) AC-72-03 (a)：遊戲名稱
// ─────────────────────────────────────────────────────────────

describe("(1) AC-72-03 (a)、IV-5：9 個字詞命中 = 0", () => {
  test("交付 HTML 命中 0 次", () => {
    assert.ok(html.length > 0, "建置產物為空");
    assert.deepEqual(gameWordHits(Buffer.from(html, "utf8")), []);
  });

  test("src/app/ 非測試檔（含二進位圖示，以位元組搜尋）命中 0 次", () => {
    const files = appFiles();
    assert.ok(files.length > 30, "src/app 檔案數過少：" + files.length);
    const hits = [];
    for (const f of files) {
      for (const h of gameWordHits(fs.readFileSync(f))) hits.push(rel(f) + "：第 " + (GAME_WORDS.indexOf(h.word) + 1) + " 個字詞 " + h.count + " 次");
    }
    assert.deepEqual(hits, []);
  });
});

// ─────────────────────────────────────────────────────────────
// (2) AC-63-02、IA-1、V-ISL-08：畫面字串不含舊名稱
// ─────────────────────────────────────────────────────────────

describe("(2) AC-63-02、V-ISL-08：畫面字串不含「主控台」「學習主控台」", () => {
  test("src/app/ 非測試 .js 的字串常值（去除註解後）命中 0 次", () => {
    const jsFiles = appFiles().filter((f) => f.endsWith(".js"));
    assert.ok(jsFiles.some((f) => rel(f) === "views/dashboard.js"));
    assert.ok(jsFiles.some((f) => rel(f) === "main.js"));
    const hits = [];
    for (const f of jsFiles) {
      for (const s of jsStrings(readText(f))) {
        for (const name of OLD_NAMES) {
          if (s.includes(name)) hits.push(rel(f) + "：" + JSON.stringify(s.length > 60 ? s.slice(0, 60) + "…" : s));
        }
      }
    }
    assert.deepEqual(Array.from(new Set(hits)), []);
  });

  test("index.html 文字節點、aria-label、title 命中 0 次；#view-dashboard 的 aria-label 為「群島」", () => {
    const src = readText(path.join(APP_DIR, "index.html"));
    const { texts, attrs } = htmlScreenStrings(src);
    assert.ok(attrs.length > 0, "index.html 找不到任何 aria-label／title");
    const hits = [];
    for (const name of OLD_NAMES) {
      for (const t of texts) if (t.includes(name)) hits.push("文字：" + t);
      for (const a of attrs) if (a.value.includes(name)) hits.push(a.name + "：" + a.value);
    }
    assert.deepEqual(hits, []);
    const tag = /<[^>]*\bid="view-dashboard"[^>]*>/.exec(src);
    assert.ok(tag, "index.html 找不到 #view-dashboard");
    assert.match(tag[0], /\saria-label="群島"/);
  });

  test("views/dashboard.js 已刪除 TEXT.title「學習主控台」（§7.32.11）", () => {
    const strings = jsStrings(readText(path.join(APP_DIR, "views", "dashboard.js")));
    assert.ok(!strings.includes("學習主控台"));
  });
});

// ─────────────────────────────────────────────────────────────
// (3) AC-72-01、AC-68-06、IV-4、IV-5、VC-8：外部參照與字型網址
// ─────────────────────────────────────────────────────────────

describe("(3) AC-72-01、AC-68-06、IV-5：交付 HTML 無外部素材與字型參照", () => {
  for (const frag of FORBIDDEN_REFS) {
    test("交付 HTML 不含 " + frag + "（不分大小寫）", () => {
      assert.equal(countOf(html.toLowerCase(), frag.toLowerCase()), 0);
    });
  }

  test("ui/island-map.js、ui/island-art.js 的字串常值不建立 image、use、symbol、foreignObject 元素，也不寫 href 屬性", () => {
    const banned = ["image", "use", "symbol", "foreignobject", "href", "xlink:href"];
    for (const f of ["ui/island-map.js", "ui/island-art.js"]) {
      const strings = jsStrings(readText(path.join(APP_DIR, f))).map((s) => s.toLowerCase());
      for (const b of banned) assert.ok(!strings.includes(b), f + " 含字串 \"" + b + "\"");
    }
  });
});

// ─────────────────────────────────────────────────────────────
// (4) AC-68-06、IV-4、VC-8：font-family 只含系統字型與通用字族
// ─────────────────────────────────────────────────────────────

describe("(4) AC-68-06、IV-4：font-family 只列系統字型名稱與通用字族", () => {
  test("交付 HTML 的全部 font-family／font 宣告合格（var() 依自訂屬性定義展開）", () => {
    const { decls, vars } = fontDeclsOf(html);
    assert.ok(decls.some((d) => d.kind === "font-family"), "交付 HTML 找不到任何 font-family 宣告");
    const bad = [];
    for (const d of decls) {
      const list = d.kind === "font" ? badFontShorthand(d.value, vars) : badFamilies(d.value, vars);
      if (list.length > 0) bad.push(d.kind + ": " + d.value + " → " + list.join("、"));
    }
    assert.deepEqual(bad, []);
  });

  test("src/app/ 非測試 .css／.js／.html 的全部 font-family／font 宣告合格（含 site/static-page.css）", () => {
    const files = appFiles().filter((f) => /\.(css|js|html)$/.test(f));
    const all = files.map((f) => ({ f, text: readText(f) }));
    // 自訂屬性定義跨檔共用（styles/*.css 串接後同一份 :root）
    const vars = new Map();
    for (const { text } of all) {
      for (const [k, v] of fontDeclsOf(text).vars) vars.set(k, (vars.get(k) || []).concat(v));
    }
    const bad = [];
    for (const { f, text } of all) {
      for (const d of fontDeclsOf(text).decls) {
        const list = d.kind === "font" ? badFontShorthand(d.value, vars) : badFamilies(d.value, vars);
        if (list.length > 0) bad.push(rel(f) + " " + d.kind + ": " + d.value + " → " + list.join("、"));
      }
    }
    assert.deepEqual(bad, []);
  });
});

// ─────────────────────────────────────────────────────────────
// (5) AC-68-05、IV-2、VC-3：島嶼插圖不用強調橘
// ─────────────────────────────────────────────────────────────

describe("(5) AC-68-05、IV-2、VC-3：島嶼插圖檔不含強調橘", () => {
  for (const f of ["ui/island-map.js", "ui/island-art.js", "styles/11-island-map.css"]) {
    test(f + " 不含 f7893b（不分大小寫）與 var(--accent)", () => {
      const text = readText(path.join(APP_DIR, f));
      assert.doesNotMatch(text, /f7893b/i);
      assert.doesNotMatch(text, /var\(\s*--accent\s*[,)]/i);
    });
  }
});

// ─────────────────────────────────────────────────────────────
// (6) AC-72-01、AC-19-04、IV-5：交付檔大小
// ─────────────────────────────────────────────────────────────

describe("(6) AC-72-01、IV-5：交付檔 ≤ 5,242,880 bytes", () => {
  test("暫存建置的交付檔大小 ≤ 上限，且與回傳的 HTML 位元組數相同", () => {
    const size = fs.statSync(outFile).size;
    assert.equal(size, Buffer.byteLength(html, "utf8"));
    assert.ok(size <= MAX_BYTES, "交付檔 " + size + " bytes 超過 " + MAX_BYTES);
  });
});

// ─────────────────────────────────────────────────────────────
// (7) LD-1、LD-2：3 個新模組載入時不取用其他模組
// ─────────────────────────────────────────────────────────────

describe("(7) LD-1：core/island.js、ui/island-map.js、ui/island-art.js 在 vm 沙箱單獨載入時不讀其他模組", () => {
  const MODULES = [
    ["core/island.js", "core", "island"],
    ["ui/island-map.js", "ui", "islandMap"],
    ["ui/island-art.js", "ui", "islandArt"]
  ];

  test("3 個模組皆在建置清單中（core/island.js 在 state/ 之前，兩個 ui 模組在 views/ 之前）", async () => {
    const { listAppFiles } = await import(pathToFileURL(BUILD).href);
    const files = listAppFiles(APP_DIR);
    for (const [f] of MODULES) assert.ok(files.includes(f), "建置清單缺少 " + f);
    assert.ok(files.indexOf("core/island.js") < files.findIndex((x) => x.startsWith("state/")));
    for (const f of ["ui/island-map.js", "ui/island-art.js"]) {
      assert.ok(files.indexOf(f) < files.findIndex((x) => x.startsWith("views/")), f + " 應在 views/ 之前");
    }
  });

  for (const [f, layer, name] of MODULES) {
    test(f + "：載入時不讀 EMT 其他模組與環境，只登錄 EMT." + layer + "." + name, () => {
      const reads = [];
      const sandbox = {};
      sandbox.self = sandbox;
      sandbox.window = sandbox;
      for (const env of ["document", "location", "navigator", "localStorage", "require", "setTimeout", "requestAnimationFrame", "matchMedia"]) {
        Object.defineProperty(sandbox, env, { configurable: true, get() { reads.push(env); return undefined; } });
      }
      // 各層的任何讀取都視為取用其他模組；模組自己的指派正常保存
      const assigned = { core: {}, ui: {} };
      const layerProxy = (key) => new Proxy(assigned[key], {
        get(target, k) { reads.push("EMT." + key + "." + String(k)); return target[k]; },
        set(target, k, v) { target[k] = v; return true; }
      });
      const emtTarget = { core: layerProxy("core"), ui: layerProxy("ui") };
      sandbox.EMT = new Proxy(emtTarget, {
        // 登錄用的 EMT.core／EMT.ui 允許讀取；其他鍵（store、services、components…）視為取用其他模組
        get(target, k) { if (k !== "core" && k !== "ui") reads.push("EMT." + String(k)); return target[k]; },
        set(target, k, v) { target[k] = v; return true; }
      });
      vm.createContext(sandbox);
      vm.runInContext(readText(path.join(APP_DIR, f)), sandbox, { filename: f });
      assert.deepEqual(reads, []);
      assert.deepEqual(Object.keys(assigned[layer]), [name]);
      assert.deepEqual(Object.keys(assigned[layer === "core" ? "ui" : "core"]), []);
      const api = assigned[layer][name];
      assert.ok(api && typeof api === "object", "EMT." + layer + "." + name + " 未登錄");
    });
  }
});
