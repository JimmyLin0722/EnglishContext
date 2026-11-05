/*
 * legal-static.test.js — 權利與商標文字、無佐證說法的靜態檢查（FE-79）
 * 受測：tools/build.mjs 對專案實際原始碼的建置產物（write: false，不寫 dist/）、src/data/ 頂層 .js 的字串值、styles/40-part5.css
 * 依據：architecture.md v0.12 §7.23、§10.9「legal-static.test.js」列；契約 README §4.3 L-8、§7.8 V-LGL-02～V-LGL-06、§9 FB-63
 * 涵蓋：AC-06-01、AC-10-02、AC-23-02、AC-23-06、AC-23-08、AC-38-10、E-122、E-123
 *
 * - 建置程式不加權利文字規則（§5.7），檢查集中在本檔。
 * - 固定文字逐字照契約 L-8 複製，不從被測模組取值，避免來源改錯時測試一併跟著錯。
 * - 資料檔以 vm 載入後遞迴走訪字串值，因此不含註解（V-LGL-05 範圍外）；不含 _tools/、_records/。
 * - （v0.19，FE-87）V-LGL-05 範圍 (c)：關於我、聯絡我們、隱私權政策與 SEO 文字（AC-23-08）；LEGAL_STATEMENTS 與 LT-3、LT-5 逐字相同（V-SITE-02）。
 */
"use strict";

const { describe, test, before } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { pathToFileURL } = require("node:url");

const ROOT = path.resolve(__dirname, "..", "..", "..");
const DATA_DIR = path.join(ROOT, "src", "data");
const BUILD = path.join(ROOT, "tools", "build.mjs");
const PART5_CSS = path.join(ROOT, "src", "app", "styles", "40-part5.css");

/** 契約 README §4.3 L-8 固定文字 */
const LT_1 = "常用搭配詞";
const LT_2 = "題型參考 TOEIC®（多益）Part 5，非 ETS 官方或認可內容";
const LT_3 = "原創內容（例句、解析、Part 5 題目、長難句、句型）由 JimmyLin 以 AI 輔助編製，JimmyLin 就其享有的權利以 CC BY-SA 4.0 授權";
const LT_4 = "PWA 圖示由 AI 依 JimmyLin 的構想生成；圖示與名稱「EnglishContext」作為品牌標識使用，JimmyLin 保留其享有的權利，不適用 MIT 與 CC BY-SA 4.0";
const LT_5 = "TOEIC® 為 ETS 的註冊商標。本網站與 ETS 無關，亦未經其認可或核准。";
const LT_6 = "be interested in 表示「對……有興趣」，是常見的形容詞＋介系詞搭配。";

/** 交付 HTML 不得出現的舊文字（§10.9） */
const OLD_TEXTS = ["多益常考", "多益最常見", "題型對應多益 Part 5", "著作權人 JimmyLin", "保留所有權利"];

/** V-LGL-05 判定字組 */
const GROUP_A = ["多益", "TOEIC"];
const GROUP_B = ["常考", "必考", "最常考", "最常見", "最常用", "高頻"];
/** V-LGL-05 分句符號（FB-63）：全形。；？！、半形 ; ? !、後接空白或位於字串結尾的半形 .、換行 */
const SENTENCE_SPLIT = /[。；？！;?!\r\n]|\.(?=\s|$)/;

/** 字串中子字串出現次數（不重疊） */
function countOf(text, sub) {
  return text.split(sub).length - 1;
}

/** 回傳字串中同時含 A 組與 B 組字詞的句子 */
function claimSentences(s) {
  return s.split(SENTENCE_SPLIT).filter((part) =>
    GROUP_A.some((a) => part.includes(a)) && GROUP_B.some((b) => part.includes(b)));
}

/** 遞迴走訪字串值；visit(字串, 欄位路徑) */
function walkStrings(value, where, visit) {
  if (typeof value === "string") {
    visit(value, where);
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => walkStrings(v, where + "[" + i + "]", visit));
  } else if (value && typeof value === "object") {
    for (const k of Object.keys(value)) walkStrings(value[k], where + "." + k, visit);
  }
}

/** 以 vm 載入 src/data/ 頂層 .js（各檔獨立），回傳 { 檔名: window 上的全域資料 } */
function loadDataFiles() {
  const out = {};
  for (const name of fs.readdirSync(DATA_DIR)) {
    if (!name.endsWith(".js")) continue;
    const full = path.join(DATA_DIR, name);
    if (!fs.statSync(full).isFile()) continue;
    const win = {};
    vm.runInNewContext(fs.readFileSync(full, "utf8"), { window: win, self: win }, { filename: full });
    out[name] = win;
  }
  return out;
}

describe("legal-static.test.js", () => {
  describe("交付 HTML（build({ write: false })，專案實際原始碼）", () => {
    let html = "";
    let header = "";
    before(async () => {
      const { build } = await import(pathToFileURL(BUILD).href);
      html = build({ write: false, log() {}, warn() {} }).html;
      const m = html.match(/<!--([\s\S]*?)-->/);
      assert.ok(m, "找不到 HTML 開頭註解區");
      header = m[1].trim();
    });

    test("開頭註解區：第一行 = EnglishContext；含 MIT 聲明與條款全文、兩句資料授權、LT-4、條款網址（V-LGL-04）", () => {
      assert.equal(header.split(/\r?\n/)[0], "EnglishContext");
      assert.match(header, /Copyright \(c\) \d{4} JimmyLin/);
      for (const s of [
        "MIT License",
        "Permission is hereby granted, free of charge, to any person obtaining a copy",
        "The above copyright notice and this permission notice shall be included in all",
        'THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND',
        "單字資料以 CC BY-SA 4.0 授權",
        LT_3,
        LT_4,
        "https://creativecommons.org/licenses/by-sa/4.0/",
      ]) {
        assert.ok(header.includes(s), "開頭註解區缺少：" + s);
      }
    });

    test("開頭註解區：不含舊聲明與 LT-5（V-LGL-04、R-25 PM 判斷 (c)）", () => {
      assert.equal(header.includes("原創內容著作權人 JimmyLin"), false);
      assert.equal(header.includes("保留所有權利"), false);
      assert.equal(header.includes(LT_5), false);
      assert.equal(header.includes("TOEIC"), false);
    });

    test("全文：舊文字皆 0 次（含程式註解，FB-64）", () => {
      for (const s of OLD_TEXTS) assert.equal(countOf(html, s), 0, s);
    });

    test("全文：LT-1、LT-2、LT-3、LT-5、LT-6 至少 1 次（§10.9）", () => {
      for (const s of [LT_1, LT_2, LT_3, LT_5, LT_6]) assert.ok(countOf(html, s) >= 1, s);
    });
  });

  describe("資料字串（V-LGL-05、V-LGL-06）", () => {
    const files = loadDataFiles();

    test("前提：載入到題庫、字庫與解碼器等資料，字串數量合理（防止掃描空集合）", () => {
      for (const name of ["part5.js", "decoder.js", "phrasebank.js", "sources.js", "vocab-0001.js"]) {
        assert.ok(files[name], "應載入 " + name);
      }
      let n = 0;
      for (const [name, win] of Object.entries(files)) walkStrings(win, name, () => { n += 1; });
      assert.ok(n > 10000, "字串數量過少：" + n);
    });

    test("判定函式：分句符號依 FB-63；A、B 同句才命中", () => {
      assert.equal(claimSentences("多益最常考的字").length, 1);
      assert.equal(claimSentences("TOEIC 高頻字彙").length, 1);
      assert.equal(claimSentences("多益字彙。常考句型").length, 0);
      assert.equal(claimSentences("TOEIC；高頻").length, 0);
      assert.equal(claimSentences("TOEIC? 高頻").length, 0);
      assert.equal(claimSentences("TOEIC\n高頻").length, 0);
      assert.equal(claimSentences("TOEIC. 高頻").length, 0);
      assert.equal(claimSentences("TOEIC.高頻").length, 1, "半形句點未後接空白不分句");
      assert.equal(claimSentences("TOEIC Service List").length, 0, "字表名稱無 B 組字詞");
      assert.equal(claimSentences("入門：最高頻的生活基礎字彙").length, 0, "FB-63：無 A 組字詞");
    });

    test("逐一字串：「多益常考」「多益最常見」0 筆；A＋B 同句 0 筆", () => {
      const hits = [];
      for (const [name, win] of Object.entries(files)) {
        walkStrings(win, name, (s, where) => {
          if (s.includes("多益常考") || s.includes("多益最常見") || claimSentences(s).length > 0) {
            hits.push(where + "：" + s);
          }
        });
      }
      assert.deepEqual(hits, []);
    });

    test("p5-009 的 explanation.coreStrategy = LT-6（V-LGL-06）", () => {
      const bank = files["part5.js"].PART5_QUESTION_BANK;
      assert.ok(Array.isArray(bank), "應有 PART5_QUESTION_BANK");
      const q = bank.filter((x) => x.id === "p5-009");
      assert.equal(q.length, 1);
      assert.equal(q[0].explanation.coreStrategy, LT_6);
    });
  });

  describe("對外頁面文字（V-LGL-05 範圍 (c)，FE-87）", () => {
    const SITE = require("../core/site-content.js");
    const P = require("../views/sources-page.js");

    test("三頁、title、description、結構化資料與 SITE_NOSCRIPT：「多益常考」「多益最常見」0 筆；A＋B 同句 0 筆", () => {
      let n = 0;
      const hits = [];
      const scope = {
        SITE_PAGES: SITE.SITE_PAGES,
        LEGAL_STATEMENTS: SITE.LEGAL_STATEMENTS,
        SITE_HOME_SEO: SITE.SITE_HOME_SEO,
        SITE_HOME_JSON_LD: SITE.SITE_HOME_JSON_LD,
        SITE_NOSCRIPT: SITE.SITE_NOSCRIPT
      };
      walkStrings(scope, "site", (s, where) => {
        n += 1;
        if (s.includes("多益常考") || s.includes("多益最常見") || claimSentences(s).length > 0) hits.push(where + "：" + s);
      });
      assert.ok(n > 30, "字串數量過少：" + n);
      assert.deepEqual(hits, []);
    });

    test("LEGAL_STATEMENTS 逐字等於 LT-3、LT-5；資料來源頁與關於我都引用同一份（V-SITE-02、SC-1）", () => {
      assert.equal(SITE.LEGAL_STATEMENTS.originalContent, LT_3);
      assert.equal(SITE.LEGAL_STATEMENTS.trademark, LT_5);
      assert.equal(P.TEXT.originalLicense, LT_3);
      assert.equal(P.TEXT.trademarkNotice, LT_5);
      const texts = [];
      walkStrings(SITE.SITE_PAGES.find((p) => p.id === "about").blocks, "about", (s) => texts.push(s));
      assert.ok(texts.includes(LT_3));
      assert.ok(texts.includes(LT_5));
    });
  });

  test(".p5-heading-note 規則：不含 nowrap、text-overflow、overflow: hidden、height、max-height（V-LGL-02、E-123）", () => {
    const css = fs.readFileSync(PART5_CSS, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const bodies = [];
    const re = /([^{}]+)\{([^{}]*)\}/g;
    let m;
    while ((m = re.exec(css))) {
      if (/\.p5-heading-note\b/.test(m[1])) bodies.push(m[2]);
    }
    assert.ok(bodies.length >= 1, "應有 .p5-heading-note 規則");
    const body = bodies.join("\n");
    for (const bad of [/nowrap/i, /text-overflow/i, /overflow(-[xy])?\s*:\s*hidden/i, /(^|[\s;])(max-)?height\s*:/i]) {
      assert.doesNotMatch(body, bad);
    }
  });
});
