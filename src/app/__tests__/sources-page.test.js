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

  // ── （v0.11，FE-52）PWA 圖示與名稱的品牌標識聲明（AC-23-02、Q-48） ──

  /** PRD AC-23-02 品牌標識聲明原文（逐字複製） */
  const BRAND = "PWA 圖示與名稱「EnglishContext」為品牌標識，著作權人 JimmyLin，保留所有權利，不適用 MIT 與 CC BY-SA 4.0";

  test("（FE-52）brandStatement 逐字等於 AC-23-02；copyrightHolder 缺漏時仍為 JimmyLin", () => {
    const pwa = require("../core/pwa.js");
    assert.equal(P.brandStatement(pwa.PWA_APP_NAME, "JimmyLin"), BRAND);
    assert.equal(P.brandStatement(pwa.PWA_APP_NAME, undefined), BRAND);
    assert.equal(P.brandStatement(pwa.PWA_APP_NAME, ""), BRAND);
  });

  /** 最小假 DOM（只支援 core/dom.js 用到的介面） */
  function fakeDocument() {
    function node(tag) {
      const n = {
        nodeType: tag === "#text" ? 3 : 1,
        tagName: tag.toUpperCase(),
        className: "",
        attrs: {},
        childNodes: [],
        _text: "",
        setAttribute(k, v) { this.attrs[k] = String(v); },
        getAttribute(k) { return this.attrs[k]; },
        addEventListener() {},
        appendChild(c) { this.childNodes.push(c); c.parentNode = this; return c; },
        removeChild(c) { this.childNodes.splice(this.childNodes.indexOf(c), 1); return c; },
        get firstChild() { return this.childNodes[0] || null; },
        get textContent() { return this.nodeType === 3 ? this._text : this._text + this.childNodes.map((c) => c.textContent).join(""); },
        set textContent(v) { this.childNodes = []; this._text = String(v); }
      };
      return n;
    }
    return {
      createElement: (t) => node(t),
      createTextNode: (t) => { const n = node("#text"); n._text = t; return n; },
      createElementNS: (ns, t) => node(t)
    };
  }

  function findAll(n, pred, out = []) {
    if (pred(n)) out.push(n);
    for (const c of n.childNodes || []) findAll(c, pred, out);
    return out;
  }

  /** 依建置方式（無 module）在 vm 載入 core/dom、core/pwa 與本頁，render 授權區 */
  function renderInSandbox(license) {
    const fs = require("node:fs");
    const path = require("node:path");
    const vm = require("node:vm");
    const sandbox = { console: { warn() {}, error() {}, log() {} } };
    sandbox.self = sandbox;
    vm.createContext(sandbox);
    for (const rel of ["core/dom.js", "core/pwa.js", "views/sources-page.js"]) {
      vm.runInContext(fs.readFileSync(path.join(__dirname, "..", rel), "utf8"), sandbox, { filename: rel });
    }
    sandbox.EMT.core.dom.setDocument(fakeDocument());
    const rootEl = fakeDocument().createElement("section");
    sandbox.EMT.views.sourcesPage.render(rootEl, { sources: REG, builtin: F.builtin(), license });
    return rootEl;
  }

  test("（FE-52）render：聲明清單 4 條，第 4 條逐字為品牌標識聲明，既有 3 條不變；copyrightHolder 缺漏仍為 JimmyLin", () => {
    for (const license of [F.license(), Object.assign(F.license(), { copyrightHolder: undefined }), undefined]) {
      const rootEl = renderInSandbox(license);
      const ul = findAll(rootEl, (n) => n.className === "src-statements")[0];
      assert.ok(ul);
      const items = ul.childNodes.map((li) => li.textContent);
      assert.deepEqual(items, [P.TEXT.codeLicense, P.TEXT.dataLicense, P.TEXT.originalLicense, BRAND]);
    }
  });

  test("（FE-52）core/pwa 未載入時 render 丟出含模組名稱的錯誤（LD-3）", () => {
    const fs = require("node:fs");
    const path = require("node:path");
    const vm = require("node:vm");
    const sandbox = { console: { warn() {}, error() {}, log() {} } };
    sandbox.self = sandbox;
    vm.createContext(sandbox);
    for (const rel of ["core/dom.js", "views/sources-page.js"]) {
      vm.runInContext(fs.readFileSync(path.join(__dirname, "..", rel), "utf8"), sandbox);
    }
    sandbox.EMT.core.dom.setDocument(fakeDocument());
    const rootEl = fakeDocument().createElement("section");
    assert.throws(() => sandbox.EMT.views.sourcesPage.render(rootEl, { sources: REG, builtin: F.builtin() }), /EMT\.core\.pwa/);
  });

  // ── （v0.12，FE-60）原創內容來源（契約 NM-3、§4.3；architecture.md §7.19.8、SD-FB-49；AC-38-10 (1)） ──

  /** 以指定 registry render，回傳根節點 */
  function renderWithRegistry(registry) {
    const fs = require("node:fs");
    const path = require("node:path");
    const vm = require("node:vm");
    const sandbox = { console: { warn() {}, error() {}, log() {} } };
    sandbox.self = sandbox;
    vm.createContext(sandbox);
    for (const rel of ["core/dom.js", "core/pwa.js", "views/sources-page.js"]) {
      vm.runInContext(fs.readFileSync(path.join(__dirname, "..", rel), "utf8"), sandbox, { filename: rel });
    }
    sandbox.EMT.core.dom.setDocument(fakeDocument());
    const rootEl = fakeDocument().createElement("section");
    sandbox.EMT.views.sourcesPage.render(rootEl, { sources: registry, builtin: F.builtin(), license: F.license() });
    return rootEl;
  }

  test("originalSourceName：fixture → 「EnglishContext 原創內容」；無 ORIGINAL、fullName 空白或非字串 → null", () => {
    assert.equal(P.originalSourceName(REG), "EnglishContext 原創內容");
    assert.equal(P.originalSourceName(REG.filter((e) => e.code !== "ORIGINAL")), null);
    assert.equal(P.originalSourceName([{ code: "ORIGINAL", fullName: "  " }]), null);
    assert.equal(P.originalSourceName([{ code: "ORIGINAL", fullName: 3 }]), null);
    assert.equal(P.originalSourceName(null), null);
    assert.equal(P.originalSourceName([null, { code: "ORIGINAL", fullName: "X 原創" }]), "X 原創");
  });

  test("render：授權區在聲明清單之前顯示「原創內容來源：EnglishContext 原創內容」（名稱取自 registry，不寫死）", () => {
    const rootEl = renderWithRegistry(REG);
    const lines = findAll(rootEl, (n) => n.className === "src-original");
    assert.equal(lines.length, 1);
    assert.equal(lines[0].tagName, "P");
    assert.equal(lines[0].textContent, "原創內容來源：EnglishContext 原創內容");
    const section = lines[0].parentNode;
    const ul = findAll(section, (n) => n.className === "src-statements")[0];
    assert.equal(section.childNodes.indexOf(lines[0]) + 1, section.childNodes.indexOf(ul), "緊接在聲明清單之前");
    // 換一個名稱，畫面跟著變（不寫死）
    const reg2 = REG.map((e) => (e.code === "ORIGINAL" ? Object.assign({}, e, { fullName: "測試原創" }) : e));
    assert.equal(findAll(renderWithRegistry(reg2), (n) => n.className === "src-original")[0].textContent, "原創內容來源：測試原創");
    // 原始碼不寫死名稱
    const src = require("node:fs").readFileSync(require("node:path").join(__dirname, "..", "views", "sources-page.js"), "utf8");
    assert.ok(!src.includes("EnglishContext 原創內容"));
  });

  test("render：registry 無 ORIGINAL → 不建「原創內容來源」節點；既有聲明照常", () => {
    const rootEl = renderWithRegistry(REG.filter((e) => e.code !== "ORIGINAL"));
    assert.equal(findAll(rootEl, (n) => n.className === "src-original").length, 0);
    const ul = findAll(rootEl, (n) => n.className === "src-statements")[0];
    assert.deepEqual(ul.childNodes.map((li) => li.textContent), [P.TEXT.codeLicense, P.TEXT.dataLicense, P.TEXT.originalLicense, BRAND]);
  });

  test("畫面文字（render 結果與 TEXT）不分大小寫無「English Master Track」（AC-38-10 (1)、NM-6）；外部資料清單仍不列 ORIGINAL", () => {
    const rootEl = renderWithRegistry(REG);
    assert.doesNotMatch(rootEl.textContent, /english\s*master\s*track/i);
    assert.doesNotMatch(JSON.stringify(P.TEXT), /english\s*master\s*track/i);
    const cards = findAll(rootEl, (n) => n.className === "card src-card").map((n) => n.attrs["data-source"]);
    assert.ok(cards.length > 0);
    assert.ok(!cards.includes("ORIGINAL"));
  });
});
