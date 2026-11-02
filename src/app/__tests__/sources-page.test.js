/*
 * sources-page.test.js — 資料來源與授權頁列出規則單元測試（FE-17 測試移入，FE-19）
 * 受測：views/sources-page.js 匯出的純邏輯（selectEntries、formatCount、countLabel、derivedAttribution、TEXT）
 * 依據：architecture.md v0.3 §7.6「資料來源頁列出辭典」：字表依字庫實際出現的 sources 列出；
 *       辭典只在至少一筆內建單字的 meaningSource 等於該代碼時列出，未使用 → 不列出並警告；
 *       字庫缺漏（C-6）時辭典與字表都不列出
 * 涵蓋：AC-23-02、契約 README FB-20、L-4
 * 資料：一律使用 _fixtures.js 的 DataSourceEntry（不讀正式內容資料檔）
 */
"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");

const P = require("../views/sources-page.js");
const F = require("./_fixtures.js");

describe("sources-page.test.js", () => {
  const REG = F.registry();

  test("fixture 6 筆 registry：字庫有四字表＋ECDICT → 列 4 字表 + 1 辭典，ORIGINAL 不列", () => {
    const b = [
      { sources: ["NGSL"], meaningSource: "ECDICT" },
      { sources: ["TSL", "BSL"], meaningSource: "ORIGINAL" },
      { sources: ["NAWL"], meaningSource: "ECDICT" }
    ];
    const r = P.selectEntries(REG, b);
    assert.deepEqual(r.wordlists.map((e) => e.code), ["NGSL", "TSL", "BSL", "NAWL"]);
    assert.deepEqual(r.dictionaries.map((e) => e.code), ["ECDICT"]);
    assert.equal(r.warnings.length, 0);
  });

  test("fixture 內建字庫（含 meaningSource ECDICT）→ ECDICT 必須列出（§7.6 QA 判定）", () => {
    const r = P.selectEntries(REG, F.builtin());
    assert.deepEqual(r.wordlists.map((e) => e.code), ["NGSL", "TSL", "BSL", "NAWL"]);
    assert.deepEqual(r.dictionaries.map((e) => e.code), ["ECDICT"]);
    assert.deepEqual(r.warnings, []);
    // 列出的字表數量 = 資料中出現的字表種類數（AC-23-02）
    const kinds = new Set(F.builtin().flatMap((x) => x.sources));
    assert.equal(r.wordlists.length, kinds.size);
  });

  test("辭典只在有單字 meaningSource 使用時列出；registry 有但未使用 → 不列出並警告（§7.6 v0.3）", () => {
    // 全部單字釋義皆原創：ECDICT 不列出
    const allOriginal = F.builtin().map((x) => Object.assign(x, { meaningSource: "ORIGINAL" }));
    const r = P.selectEntries(REG, allOriginal);
    assert.equal(r.dictionaries.length, 0);
    assert.ok(r.warnings.some((w) => w.includes("ECDICT")));
    assert.equal(r.wordlists.length, 4, "字表照常列出");
    // 只出現在 phoneticSource（契約固定 ORIGINAL，假設資料錯誤）不算使用
    const r2 = P.selectEntries(REG, [{ sources: ["NGSL"], phoneticSource: "ECDICT", meaningSource: "ORIGINAL" }]);
    assert.equal(r2.dictionaries.length, 0);
  });

  test("registry 多餘字表與字庫多出代碼皆產生警告；列出數 = 交集", () => {
    const b = [{ sources: ["NGSL", "XYZ"], meaningSource: "ORIGINAL" }];
    const r = P.selectEntries(REG, b);
    assert.deepEqual(r.wordlists.map((e) => e.code), ["NGSL"]);
    assert.equal(r.dictionaries.length, 0);
    assert.ok(r.warnings.some((w) => w.includes("TSL")));
    assert.ok(r.warnings.some((w) => w.includes("XYZ")));
    assert.ok(r.warnings.some((w) => w.includes("ECDICT")));
  });

  test("字庫缺漏（C-6）：辭典與字表都不列出", () => {
    for (const b of [[], undefined, null]) {
      const r = P.selectEntries(REG, b);
      assert.equal(r.wordlists.length, 0);
      assert.equal(r.dictionaries.length, 0);
    }
  });

  test("資料缺漏：非陣列、空陣列、壞元素不拋例外", () => {
    assert.doesNotThrow(() => P.selectEntries(undefined, null));
    const r = P.selectEntries([null, 3, {}], [null, { sources: "NGSL" }]);
    assert.equal(r.wordlists.length, 0);
  });

  test("formatCount 與 countLabel（FB-20：只用 includedItemCount）", () => {
    assert.equal(P.formatCount(5616), "5,616");
    assert.equal(P.formatCount(959), "959");
    assert.equal(P.formatCount(1234567), "1,234,567");
    assert.equal(P.formatCount(-1), null);
    assert.equal(P.formatCount(1.5), null);
    assert.equal(P.formatCount(null), null);
    assert.equal(P.countLabel({ kind: "wordlist", includedItemCount: 2809, originalItemCount: 9999 }), "本系統收錄 2,809 字");
    assert.equal(P.countLabel({ kind: "dictionary", includedItemCount: 5616 }), "提供釋義 5,616 筆");
    assert.equal(P.countLabel({ kind: "wordlist", includedItemCount: null, originalItemCount: 100 }), "未提供");
    // fixture registry 的 ECDICT
    assert.equal(P.countLabel(REG.find((e) => e.code === "ECDICT")), "提供釋義 5,616 筆");
  });

  test("derivedAttribution：作者去重並列修改者（L-4）", () => {
    const wl = REG.filter((e) => e.kind === "wordlist");
    const s = P.derivedAttribution(wl, "JimmyLin");
    assert.equal(s, "本系統衍生的單字資料以 CC BY-SA 4.0 釋出，署名：原字表作者 Browne, C.；Culligan, B.；Phillips, J.（NGSL、TSL、BSL、NAWL）；修改者 JimmyLin。");
    assert.ok(P.derivedAttribution([], null).includes("修改者 JimmyLin"));
  });

  test("三段授權聲明逐字與 AC-23-02 相同", () => {
    assert.equal(P.TEXT.codeLicense, "程式碼以 MIT 授權（Copyright JimmyLin）");
    assert.equal(P.TEXT.dataLicense, "單字資料以 CC BY-SA 4.0 授權");
    assert.equal(P.TEXT.originalLicense, "原創內容（例句、解析、Part 5 題目、長難句、句型）以 CC BY-SA 4.0 授權，著作權人 JimmyLin");
    assert.equal(P.TEXT.ecdictPhonetic, "音標改寫為美式 IPA，標為原創，不屬 ECDICT");
  });
});
