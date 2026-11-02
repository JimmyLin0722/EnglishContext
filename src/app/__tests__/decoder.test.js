/*
 * decoder.test.js — 長難句解碼器純邏輯單元測試（FE-15 測試移入，FE-19）
 * 受測：views/decoder.js 匯出的純邏輯（roleOf、segClass、positionText、sectionTitle、normalizeSentence、
 *       normalizeStrategies）；搭配 state/store.js 驗證淡化跨句保留；styles/50-decoder.css 靜態檢查
 * 依據：architecture.md v0.3 §7.6「淡化修飾語」（is-dimmed、opacity 0.3、grayscale、不設 transition）
 * 涵蓋：AC-12-01、AC-13-01～AC-13-03、AC-14-01、C-6、C-7
 * 資料：一律使用 _fixtures.js（不讀正式內容資料檔）；例句筆數（≥ 50）屬 validate.mjs 的範圍
 */
"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const h = require("../views/decoder.js");
const F = require("./_fixtures.js");

describe("decoder.test.js", () => {
  test("roleOf / segClass", () => {
    for (const r of ["subject", "verb", "object", "modifier", "plain"]) assert.equal(h.segClass(r), "seg seg--" + r);
    assert.equal(h.segClass("evil\" onclick"), "seg seg--plain");
    assert.equal(h.roleOf(undefined), "plain");
  });

  test("positionText", () => {
    assert.equal(h.positionText(0, 50), "第 1 / 50 句");
    assert.equal(h.positionText(49, 50), "第 50 / 50 句");
    assert.equal(h.positionText(99, 50), "第 50 / 50 句");
    assert.equal(h.positionText(-3, 50), "第 1 / 50 句");
    assert.equal(h.positionText(0, 0), "第 0 / 0 句");
    assert.equal(h.positionText(NaN, 3), "第 1 / 3 句");
  });

  test("sectionTitle", () => {
    assert.equal(h.sectionTitle("methodology", [{ id: "methodology", title: "方法論X" }]), "方法論X");
    assert.equal(h.sectionTitle("literature_review", []), "文獻回顧（Research Gap）");
    assert.equal(h.sectionTitle("zzz", null), "");
    assert.equal(h.sectionTitle(undefined, null), "");
  });

  test("normalizeSentence 容錯（C-6）", () => {
    const n = h.normalizeSentence({
      id: "ds-001",
      segments: [{ text: "A", role: "subject" }, null, { text: "", role: "verb" }, { text: "<img>", role: "bad", noteZh: 3 }],
      translationZh: "t",
      section: "abstract"
    });
    assert.deepEqual(n.segments, [{ text: "A", role: "subject", noteZh: "" }, { text: "<img>", role: "plain", noteZh: "" }]);
    assert.deepEqual(h.normalizeSentence(null), { id: "", segments: [], translationZh: "", section: "" });
  });

  test("normalizeStrategies", () => {
    assert.deepEqual(h.normalizeStrategies(null), []);
    const r = h.normalizeStrategies([{ id: "a", title: "T", tips: ["x", " ", 5] }, { id: "b" }]);
    assert.deepEqual(r, [{ id: "a", title: "T", tips: ["x"] }]);
  });

  test("fixture 例句（符合 DecoderSentence）：正規化後串接等於原文、含主詞與動詞、段落標題可取得（AC-12-01）", () => {
    const list = F.decoderSentences();
    const strategies = F.readingStrategies();
    for (const s of list) {
      const n = h.normalizeSentence(s);
      assert.equal(n.segments.map((x) => x.text).join(""), s.segments.map((x) => x.text).join(""), s.id);
      assert.ok(n.segments.some((x) => x.role === "subject") && n.segments.some((x) => x.role === "verb"), s.id);
      assert.ok(n.segments.some((x) => x.role === "modifier"), s.id);
      assert.ok(h.sectionTitle(n.section, strategies), s.id);
    }
  });

  test("閱讀策略 3 主題依契約順序與標題（AC-14-01）", () => {
    const st = h.normalizeStrategies(F.readingStrategies());
    assert.deepEqual(st.map((x) => x.title), ["Abstract 摘要", "方法論", "文獻回顧（Research Gap）"]);
    assert.ok(st.every((x) => x.tips.length > 0));
    // 資料缺 READING_STRATEGIES 時以契約固定標題補上
    for (const s of F.decoderSentences()) assert.ok(h.sectionTitle(s.section, null), s.id);
  });

  test("淡化狀態跨句保留（AC-13-03）：toggleModifierDim 後切換例句仍為淡化", () => {
    const { a, store } = F.makeStore();
    assert.deepEqual(store.getState().runtime.decoder, { sentenceIndex: 0, isModifierDimmed: false });
    a.toggleModifierDim();
    a.setDecoderIndex(1);
    assert.deepEqual(store.getState().runtime.decoder, { sentenceIndex: 1, isModifierDimmed: true });
    a.setDecoderIndex(2);
    assert.equal(store.getState().runtime.decoder.isModifierDimmed, true);
    // 索引夾在範圍內（fixture 3 句）
    a.setDecoderIndex(99);
    assert.equal(store.getState().runtime.decoder.sentenceIndex, 2);
    assert.equal(h.positionText(store.getState().runtime.decoder.sentenceIndex, F.decoderSentences().length), "第 3 / 3 句");
    a.toggleModifierDim();
    assert.equal(store.getState().runtime.decoder.isModifierDimmed, false);
    assert.equal(h.TEXT_DIM, "淡化修飾語");
  });

  test("淡化樣式：.is-dimmed .seg--modifier 為 opacity 0.3 + grayscale，且不設 transition（§7.6、AC-13-01）", () => {
    const css = fs.readFileSync(path.join(__dirname, "..", "styles", "50-decoder.css"), "utf8");
    const m = /\.is-dimmed\s+\.seg--modifier\s*\{([^}]*)\}/.exec(css);
    assert.ok(m, "找不到 .is-dimmed .seg--modifier 規則");
    assert.match(m[1], /opacity:\s*0?\.3\s*;/);
    assert.match(m[1], /filter:\s*grayscale\(1\)/);
    assert.doesNotMatch(css, /\.seg[^{]*\{[^}]*transition/, "片段不得設定 transition");
  });

  test("原始碼不含禁用 API（C-7）", () => {
    const src = fs.readFileSync(path.join(__dirname, "..", "views", "decoder.js"), "utf8");
    assert.doesNotMatch(src, /innerHTML|outerHTML|insertAdjacentHTML|document\.write/);
  });
});
