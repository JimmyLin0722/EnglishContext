/*
 * naming.test.js — R-15 功能更名畫面文字靜態檢查（FE-23）
 * 依據：architecture.md v0.4 §7.13（功能更名）、§10.1（naming.test.js 列）；契約 TAB_LABELS、NAV_TAB_ORDER；PRD R-15
 * 做法：讀 src/app/index.html（去除 HTML 註解）與 src/app/views/*.js 的字串常值（去除註解），
 *       - 不得含舊名稱「抽認卡」「自訂器」；
 *       - 「Part 5」只允許出現在 sources-page.js 的授權／來源文字（v0.17，FE-100：LT-2 已不含「Part 5」）；
 *         part5.js 另須有逐字等於 LT-2 的標題說明字串常值（v0.12，FE-78：契約 L-8 LT-2）；
 *       - 導覽 4 個按鈕文字依序 = TAB_LABELS[NAV_TAB_ORDER[i]]，data-tab 依序 = NAV_TAB_ORDER（v0.5，FE-38）；
 *       - 各 section 的 aria-label = TAB_LABELS[id 去掉 "view-"]；隱藏頁 section 保留、hidden、無 aria-label。
 *       - （v0.5，FE-38；AC-20-04、HT-2～HT-5）index.html 與主控台入口不含指向隱藏頁的 data-tab／data-go，
 *         可見文字與 aria-label 不含「解碼器」「句型庫」。
 * 識別字（TabId、data-tab、#view-*、CSS 類名）不在檢查範圍內，也不應更名。
 */
"use strict";

const { describe, test } = require("node:test");

/** （v0.12，FE-78；v0.17，FE-100 拿掉「Part 5」）模擬測驗標題說明：逐字照契約 README §4.3 L-8 LT-2 */
const LT_2 = "題型參考 TOEIC®（多益），非 ETS 官方或認可內容";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const C = require("../core/constants.js");

const APP_DIR = path.join(__dirname, "..");
const VIEWS_DIR = path.join(APP_DIR, "views");
const OLD_NAMES = ["抽認卡", "自訂器"];

/** 讀檔並去除 BOM */
function read(file) {
  return fs.readFileSync(file, "utf8").replace(/^﻿/, "");
}

/**
 * 從 JS 原始碼取出所有字串常值（"..."、'...'、`...` 的內容），略過 // 與 /* *\/ 註解及正規表示式常值。
 * 只做本測試需要的簡易詞法分析：樣板字串的 ${} 內容一併視為字串內容（views 不以樣板字串組畫面文字）。
 * @param {string} src
 * @returns {string[]}
 */
function stringLiterals(src) {
  const out = [];
  let i = 0;
  const n = src.length;
  // 上一個有意義的字元，用來判斷 "/" 是除號還是正規表示式開頭
  let prev = "";
  while (i < n) {
    const ch = src[i];
    const next = src[i + 1];
    if (ch === "/" && next === "/") {
      const end = src.indexOf("\n", i);
      i = end < 0 ? n : end;
      continue;
    }
    if (ch === "/" && next === "*") {
      const end = src.indexOf("*/", i + 2);
      i = end < 0 ? n : end + 2;
      continue;
    }
    if (ch === "\"" || ch === "'" || ch === "`") {
      let j = i + 1;
      let buf = "";
      while (j < n && src[j] !== ch) {
        if (src[j] === "\\") { buf += src[j + 1] || ""; j += 2; continue; }
        buf += src[j];
        j++;
      }
      out.push(buf);
      i = j + 1;
      prev = "a";
      continue;
    }
    if (ch === "/" && (prev === "" || /[(,=:[!&|?{};+\-*%<>~^]/.test(prev))) {
      // 正規表示式常值：跳到未跳脫、不在字元類別內的結尾 "/"
      let j = i + 1;
      let inClass = false;
      while (j < n && src[j] !== "\n") {
        const c = src[j];
        if (c === "\\") { j += 2; continue; }
        if (c === "[") inClass = true;
        else if (c === "]") inClass = false;
        else if (c === "/" && !inClass) break;
        j++;
      }
      i = j + 1;
      prev = "a";
      continue;
    }
    if (!/\s/.test(ch)) prev = ch;
    i++;
  }
  return out;
}

/** 去除 HTML 註解後的 index.html */
function indexHtml() {
  return read(path.join(APP_DIR, "index.html")).replace(/<!--[\s\S]*?-->/g, "");
}

/** views/*.js 檔名清單（依字母序） */
function viewFiles() {
  return fs.readdirSync(VIEWS_DIR).filter((f) => f.endsWith(".js")).sort();
}

describe("naming.test.js", () => {
  test("詞法分析自我檢查：註解不計、字串常值取出", () => {
    const src = [
      "// 抽認卡註解",
      "/* 自訂器 */",
      "var a = \"單字卡\", b = 'x\\'y', r = /\"[/]\"/g;",
      "var c = `t`; var d = 4 / 2; var e = \"z\";"
    ].join("\n");
    assert.deepEqual(stringLiterals(src), ["單字卡", "x'y", "t", "z"]);
  });

  test("index.html（不含註解）不得含「抽認卡」「自訂器」", () => {
    const html = indexHtml();
    for (const w of OLD_NAMES) {
      assert.ok(!html.includes(w), "index.html 仍含「" + w + "」");
    }
  });

  test("index.html（不含註解）不得含「Part 5」", () => {
    assert.ok(!indexHtml().includes("Part 5"), "index.html 仍含「Part 5」");
  });

  test("views/*.js 的字串常值不得含「抽認卡」「自訂器」", () => {
    const hits = [];
    for (const f of viewFiles()) {
      for (const s of stringLiterals(read(path.join(VIEWS_DIR, f)))) {
        for (const w of OLD_NAMES) {
          if (s.includes(w)) hits.push(f + "：" + s);
        }
      }
    }
    assert.deepEqual(hits, []);
  });

  test("views/*.js 的字串常值含「Part 5」者只在 sources-page.js 授權文字（v0.17，FE-100）", () => {
    const hits = [];
    for (const f of viewFiles()) {
      for (const s of stringLiterals(read(path.join(VIEWS_DIR, f)))) {
        if (!s.includes("Part 5")) continue;
        if (f === "sources-page.js") continue;               // 授權與資料來源文字（R-15 不改；LT-3 的「Part 5 題目」）
        hits.push(f + "：" + s);
      }
    }
    assert.deepEqual(hits, []);
  });

  test("（v0.17，FE-100）part5.js 有逐字等於 LT-2 的標題說明字串常值，且 LT-2 不含「Part 5」", () => {
    assert.equal(LT_2.includes("Part 5"), false);
    const lits = stringLiterals(read(path.join(VIEWS_DIR, "part5.js")));
    assert.ok(lits.includes(LT_2), "part5.js 應有標題說明 LT-2");
  });

  test("（v0.12，FE-78）views/*.js 字串常值不含已廢止的標題說明與搭配詞標籤（V-LGL-01、V-LGL-02）", () => {
    const OLD_TEXTS = ["題型對應多益", "多益常考", "多益最常見"];
    const hits = [];
    for (const f of viewFiles()) {
      for (const s of stringLiterals(read(path.join(VIEWS_DIR, f)))) {
        for (const w of OLD_TEXTS) {
          if (s.includes(w)) hits.push(f + "：" + s);
        }
      }
    }
    assert.deepEqual(hits, []);
  });

  test("導覽 4 個按鈕：data-tab 依序 = NAV_TAB_ORDER，文字依序 = TAB_LABELS[NAV_TAB_ORDER[i]]", () => {
    const html = indexHtml();
    const nav = html.match(/<nav id="app-nav"[\s\S]*?<\/nav>/);
    assert.ok(nav, "找不到 #app-nav");
    // （FE-26）按鈕內含 svg 圖示與 .app-nav__label：取按鈕全部內容，去除標籤後比對文字
    const btns = [...nav[0].matchAll(/<button\b[^>]*\bdata-tab="([^"]+)"[^>]*>([\s\S]*?)<\/button>/g)];
    const text = (m) => m[2].replace(/<[^>]*>/g, "").trim();
    assert.deepEqual(btns.map((m) => m[1]), [...C.NAV_TAB_ORDER]);
    assert.deepEqual(btns.map(text), C.NAV_TAB_ORDER.map((t) => C.TAB_LABELS[t]));
    assert.deepEqual(btns.map(text), ["群島", "難易度設定", "單字卡", "模擬測驗"]);
  });

  test("10 個 section：id 為 view-<TabId>；可見頁 aria-label = TAB_LABELS，隱藏頁保留 hidden、無 aria-label（HT-5）", () => {
    const secs = [...indexHtml().matchAll(/<section\b([^>]*)>/g)]
      .map((m) => m[1])
      .filter((a) => /\bid="view-/.test(a))
      .map((a) => ({
        id: a.match(/\bid="view-([^"]+)"/)[1],
        label: (a.match(/\baria-label="([^"]*)"/) || [])[1],
        hidden: /\shidden(?:\s|=|$)/.test(a)
      }));
    assert.deepEqual(secs.map((x) => x.id),
      ["dashboard", "customizer", "flashcards", "part5", "decoder", "phrasebank", "sources", "about", "contact", "privacy"]);
    for (const x of secs) {
      assert.equal(x.hidden, true, "section #view-" + x.id + " 起始應 hidden");
      if (C.HIDDEN_TAB_IDS.includes(x.id)) {
        assert.equal(x.label, undefined, "隱藏頁 #view-" + x.id + " 不得有 aria-label");
      } else {
        assert.equal(x.label, C.TAB_LABELS[x.id], "section #view-" + x.id + " 的 aria-label");
      }
    }
  });

  test("（AC-20-04）index.html（不含註解）無指向隱藏頁的 data-tab／data-go；文字與 aria-label 不含「解碼器」「句型庫」", () => {
    const html = indexHtml();
    for (const t of C.HIDDEN_TAB_IDS) {
      assert.doesNotMatch(html, new RegExp('data-(?:tab|go)="' + t + '"'), t);
    }
    for (const t of C.HIDDEN_TAB_IDS) {
      assert.ok(!html.includes(C.TAB_LABELS[t]), "index.html 含「" + C.TAB_LABELS[t] + "」");
    }
    const labels = [...html.matchAll(/\baria-label="([^"]*)"/g)].map((m) => m[1]);
    assert.ok(labels.length > 0);
    for (const l of labels) {
      assert.ok(!l.includes("解碼器") && !l.includes("句型庫"), "aria-label：" + l);
    }
  });

  test("（v0.19，FE-104；IA-1、AC-63-02、V-ISL-08）index.html（不含註解）文字節點與 aria-label、title 不含「主控台」「學習主控台」", () => {
    const OLD = ["主控台", "學習主控台"];
    const html = indexHtml();
    // 文字節點：去除 <script>、<style> 內容後，取標籤之間的文字
    const body = html.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, "");
    const texts = [...body.matchAll(/>([^<]+)</g)].map((m) => m[1].trim()).filter(Boolean);
    assert.ok(texts.length > 0);
    const attrs = [...html.matchAll(/\b(?:aria-label|title)="([^"]*)"/g)].map((m) => m[1]);
    assert.ok(attrs.length > 0);
    // <title> 元素文字也在 texts 內
    for (const s of texts.concat(attrs)) {
      for (const w of OLD) assert.ok(!s.includes(w), "index.html 含「" + w + "」：" + s);
    }
    // 群島頁 section 與導覽第 1 項
    assert.match(html, /<section id="view-dashboard" class="view" aria-label="群島" hidden>/);
    assert.equal(C.TAB_LABELS.dashboard, "群島");
  });

  test("（v0.19，FE-104；AC-63-01、AC-27-05）導覽第 1 項為「群島」＋ 內嵌單一 path 島嶼圖示（無外部資源）", () => {
    const nav = indexHtml().match(/<nav id="app-nav"[\s\S]*?<\/nav>/)[0];
    const first = nav.match(/<button\b[^>]*\bdata-tab="dashboard"[^>]*>([\s\S]*?)<\/button>/);
    assert.ok(first, "找不到第 1 項");
    const inner = first[1];
    assert.match(inner, /<span class="app-nav__label">群島<\/span>/);
    assert.equal((inner.match(/<svg\b/g) || []).length, 1);
    assert.equal((inner.match(/<path\b/g) || []).length, 1);
    assert.doesNotMatch(inner, /<(?:img|image|use)\b|href=|url\(|xmlns|#f7893b/i);
  });

  test("（v0.12，FE-58；AC-39-01、AC-39-06、DB-1）主控台本體無模組入口與 data-go=sources；只有「開始今日學習」→ flashcards、「變更」→ customizer", () => {
    const D = require("../views/dashboard.js");
    assert.equal("ENTRIES" in D, false, "功能入口已移除");
    const lits = stringLiterals(read(path.join(VIEWS_DIR, "dashboard.js")));
    // data-go 值只有 flashcards、customizer（v0.19，FE-108：「變更」移到標題列，原始碼與 Tab 順序皆為「變更」→「開始今日學習」）
    const src = read(path.join(VIEWS_DIR, "dashboard.js"));
    const gos = [...src.matchAll(/"data-go":\s*"([^"]+)"/g)].map((m) => m[1]);
    assert.deepEqual(gos, ["customizer", "flashcards"]);
    assert.ok(!lits.includes("sources"), "不含 sources 頁代碼");
    for (const t of C.HIDDEN_TAB_IDS) assert.ok(!lits.includes(t), t);
    // 模組名稱不作為主控台按鈕文字（TAB_LABELS 的 4 個功能區名稱與「資料來源與授權」）
    for (const tab of ["customizer", "flashcards", "part5", "sources"]) {
      assert.ok(!lits.includes(C.TAB_LABELS[tab]), C.TAB_LABELS[tab]);
    }
  });

  test("（AC-20-04）views/*.js 字串常值不以隱藏頁代碼作為 data-tab／data-go 值或 router.go 參數", () => {
    // 隱藏頁本身（decoder.js、phrasebank.js）依 HT-5 不改，只以 register 登錄自己，不在檢查範圍
    const hits = [];
    for (const f of viewFiles()) {
      if (f === "decoder.js" || f === "phrasebank.js") continue;
      const lits = stringLiterals(read(path.join(VIEWS_DIR, f)));
      for (const t of C.HIDDEN_TAB_IDS) {
        if (lits.includes(t)) hits.push(f + "：\"" + t + "\"");
        if (lits.some((s) => s.includes('data-tab="' + t + '"') || s.includes('data-go="' + t + '"'))) {
          hits.push(f + "：data-* = " + t);
        }
      }
    }
    assert.deepEqual(hits, []);
  });

  test("主控台第 3 格標籤為「模擬測驗」（v0.19，AS-4）；無「模擬測驗正確率」、statAccuracyLabel、「單字掌握數」", () => {
    const D = require("../views/dashboard.js");
    const L = require("../core/layout.js");
    assert.equal(L.LAYOUT_TEXTS.statPart5Label, "模擬測驗");
    assert.equal(Object.prototype.hasOwnProperty.call(D.TEXT, "accuracy"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(L.LAYOUT_TEXTS, "statAccuracyLabel"), false);
    const src = read(path.join(VIEWS_DIR, "dashboard.js"));
    assert.ok(src.includes("LT.statPart5Label"));
    assert.ok(!src.includes("statAccuracyLabel"));
    const lits = stringLiterals(src);
    for (const bad of ["單字掌握數", "正確率", "累計答對"]) {
      assert.ok(!lits.some((s) => s.includes(bad)), bad);
    }
  });

  test("各頁標題與說明（§7.13）", () => {
    const P5 = require("../views/part5.js");
    const p5src = read(path.join(VIEWS_DIR, "part5.js"));
    const czLits = stringLiterals(read(path.join(VIEWS_DIR, "customizer.js")));
    const fcLits = stringLiterals(read(path.join(VIEWS_DIR, "flashcards.js")));
    assert.ok(czLits.includes("難易度設定"));
    // （v0.10，FE-43；R-19）說明文字不再引導輸入或查看目標分數
    assert.ok(czLits.includes("選擇色級即時試算，按「套用」後才會更新單字卡的單字集。"));
    assert.ok(!czLits.includes("選擇色級或輸入目標分數即時試算，按「套用」後才會更新單字卡的單字集。"));
    assert.ok(fcLits.includes("單字卡"));
    // （v0.14，FE-68；DS-27、AC-43-02）空狀態不再提及領域範本
    assert.ok(fcLits.includes("請到難易度設定選擇色級並按「套用」，或新增自訂單字。"));
    assert.ok(!fcLits.some((s) => s.includes("範本")), "單字卡畫面文字不含「範本」");
    assert.ok(!fcLits.some((s) => s.includes("目標分數")), "單字卡畫面文字不提目標分數");
    assert.ok(fcLits.includes("前往難易度設定"));
    assert.ok(stringLiterals(p5src).includes("模擬測驗"));
    if (P5 && P5.TEXT) {
      assert.equal(P5.TEXT.heading, "模擬測驗");
      assert.equal(P5.TEXT.headingNote, LT_2);
    }
  });
});
