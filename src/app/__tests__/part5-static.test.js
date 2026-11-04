/*
 * part5-static.test.js — 模擬測驗已答對鎖定檢視的文字與移除項目靜態檢查（FE-82）
 * 受測：tools/build.mjs 對專案實際原始碼的建置產物（write: false，不寫 dist/）、src/app/ 非 __tests__ 原始碼、
 *       core/constants.js、styles/40-part5.css
 * 依據：architecture.md v0.13 §10.10「part5-static.test.js 必含案例」、§7.24.3；契約 README §7.7 V-ST-25、V-ST-27、DS-44、DS-46
 * 涵蓋：AC-46-06、AC-48-01、AC-48-06、AC-48-12、E-134
 *
 * - 固定文字逐字照 PRD 複製，不從被測模組取值，避免來源改錯時測試一併跟著錯。
 * - 版本值不寫入本檔（§10.10、D-14），否則下次改版就會失敗；版本由建置結果另行檢查。
 */
"use strict";

const { describe, test, before } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const C = require("../core/constants.js");

const ROOT = path.resolve(__dirname, "..", "..", "..");
const APP_DIR = path.join(ROOT, "src", "app");
const BUILD = path.join(ROOT, "tools", "build.mjs");
const PART5_CSS = path.join(APP_DIR, "styles", "40-part5.css");

/** 已移除、不得殘留的字串（V-ST-27）；以串接組字，本檔不算殘留來源 */
const REMOVED = ["全部題目" + "再練一次", "再練" + "一次", "replay" + "KeepRecords", "replayPart5" + "KeepRecords"];

/** v0.18 新增的 4 段文字（PRD AC-48-01、AC-48-06、AC-48-12 原文） */
const NEW_TEXTS = {
  lockedReviewFeedback: "你之前答對過這一題",
  summaryNoNewAnswers: "本輪沒有新作答的題目",
  filterHint: "關閉時顯示全部題目，答對過的題目會以綠色鎖定。",
  filterHintAllCorrect: "要檢視全部題目，請關閉上方的「只練沒答對的題目」。"
};

/** 掃描範圍：src/app/ 非 __tests__ 的 .js、.css、.html、.txt */
const SCANNED_EXT = new Set([".js", ".css", ".html", ".txt"]);

/** 字串中子字串出現次數（不重疊） */
function countOf(text, sub) {
  return text.split(sub).length - 1;
}

/** 遞迴列出掃描範圍內的檔案 */
function listSources(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "__tests__") listSources(full, out);
    } else if (SCANNED_EXT.has(path.extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

describe("part5-static.test.js", () => {
  describe("交付 HTML（build({ write: false })，專案實際原始碼）", () => {
    let html = "";
    before(async () => {
      const { build } = await import(pathToFileURL(BUILD).href);
      html = build({ write: false, log() {}, warn() {} }).html;
      assert.ok(html.length > 1000, "建置產物過短");
    });

    test("已移除字串皆 0 次（V-ST-27）", () => {
      for (const s of REMOVED) assert.equal(countOf(html, s), 0, s);
    });

    test("4 段新文字各至少 1 次（V-ST-27）", () => {
      for (const [key, s] of Object.entries(NEW_TEXTS)) assert.ok(countOf(html, s) >= 1, key);
    });
  });

  describe("src/app/ 原始碼（不含 __tests__）", () => {
    const files = listSources(APP_DIR);

    test("前提：掃描到主要模組（防止掃描空集合）", () => {
      const rels = files.map((f) => path.relative(APP_DIR, f).split(path.sep).join("/"));
      for (const rel of ["core/part5flow.js", "core/constants.js", "state/store.js", "views/part5.js", "styles/40-part5.css", "index.html", "license-header.txt"]) {
        assert.ok(rels.includes(rel), "應掃描 " + rel);
      }
      assert.ok(rels.every((r) => !r.startsWith("__tests__/")));
    });

    test("已移除字串皆 0 筆，含註解（V-ST-27、§7.24.3）", () => {
      const hits = [];
      for (const f of files) {
        const src = fs.readFileSync(f, "utf8");
        for (const s of REMOVED) {
          if (src.includes(s)) hits.push(path.relative(APP_DIR, f) + "：" + s);
        }
      }
      assert.deepEqual(hits, []);
    });
  });

  describe("契約常數", () => {
    test("PART5_RECORD_TEXTS 的 4 個新鍵與 PRD 逐字相同（V-ST-27）", () => {
      for (const [key, s] of Object.entries(NEW_TEXTS)) assert.equal(C.PART5_RECORD_TEXTS[key], s, key);
    });

    test("filterHintAllCorrect 括住的文字 = unansweredOnlyLabel（AC-48-12）", () => {
      const m = /「([^」]*)」/.exec(C.PART5_RECORD_TEXTS.filterHintAllCorrect);
      assert.ok(m, "應有全形引號");
      assert.equal(m[1], C.PART5_RECORD_TEXTS.unansweredOnlyLabel);
    });

    test("CURRENT_SCHEMA_VERSION 仍為 3（DS-46）", () => {
      assert.equal(C.CURRENT_SCHEMA_VERSION, 3);
    });
  });

  test(".p5-record__hint 規則：不含 nowrap、text-overflow、overflow: hidden、--accent（HN-1、E-134）", () => {
    const css = fs.readFileSync(PART5_CSS, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const bodies = [];
    const re = /([^{}]+)\{([^{}]*)\}/g;
    let m;
    while ((m = re.exec(css))) {
      if (/\.p5-record__hint\b/.test(m[1])) bodies.push(m[2]);
    }
    assert.ok(bodies.length >= 1, "應有 .p5-record__hint 規則");
    const body = bodies.join("\n");
    for (const bad of [/nowrap/i, /text-overflow/i, /overflow(-[xy])?\s*:\s*hidden/i, /--accent/]) {
      assert.doesNotMatch(body, bad);
    }
  });
});
