/*
 * sources-page.test.js — 資料來源與授權頁列出規則單元測試（FE-17 測試移入，FE-19）
 * 受測：views/sources-page.js 匯出的純邏輯（selectEntries、formatCount、countLabel、derivedAttribution、TEXT）
 * 依據：architecture.md v0.3 §7.6「資料來源頁列出辭典」：字表依字庫實際出現的 sources 列出；
 *       辭典只在至少一筆內建單字的 meaningSource 等於該代碼時列出，未使用 → 不列出並警告；
 *       字庫缺漏（C-6）時辭典與字表都不列出
 * 涵蓋：AC-23-02、契約 README FB-20、L-4
 * 資料：一律使用 _fixtures.js 的 DataSourceEntry（不讀正式內容資料檔）
 * （v0.11，FE-77）新增聯絡行案例（architecture.md v0.11 §7.22.2、§10.8；契約 data-schema.ts §16、README §4.3 L-7；AC-23-07）。
 *   去空格位址一律於執行期由常數推導，本檔不寫出其字面值（FB-62）。
 * （v0.19，FE-87）聲明與信箱改引用 core/site-content；新增返回按鈕案例（architecture.md v0.14 §7.25.6、§7.25.9；SC-1、SP-3、ML-1）。
 */
"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");

const P = require("../views/sources-page.js");
const F = require("./_fixtures.js");

/** 依建置方式載入本頁需要的模組（v0.19：文案取自 core/site-content，返回按鈕取自 ui/site-return） */
const PAGE_MODULES = ["core/dom.js", "core/pwa.js", "core/site-content.js", "ui/site-return.js", "views/sources-page.js"];

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

  // （v0.12，FE-78）固定文字逐字照契約 README §4.3 L-8（LT-3、LT-4、LT-5）
  const LT_3 = "原創內容（例句、解析、Part 5 題目、長難句、句型）由 JimmyLin 以 AI 輔助編製，JimmyLin 就其享有的權利以 CC BY-SA 4.0 授權";
  const BRAND = "PWA 圖示由 AI 依 JimmyLin 的構想生成；圖示與名稱「EnglishContext」作為品牌標識使用，JimmyLin 保留其享有的權利，不適用 MIT 與 CC BY-SA 4.0";
  const LT_5 = "TOEIC® 為 ETS 的註冊商標。本網站與 ETS 無關，亦未經其認可或核准。";

  test("三段授權聲明逐字與 AC-23-02 相同", () => {
    assert.equal(P.TEXT.codeLicense, "程式碼以 MIT 授權（Copyright JimmyLin）");
    assert.equal(P.TEXT.dataLicense, "單字資料以 CC BY-SA 4.0 授權");
    assert.equal(P.TEXT.originalLicense, LT_3);
    assert.equal(P.TEXT.ecdictPhonetic, "音標改寫為美式 IPA，標為原創，不屬 ECDICT");
  });

  test("（FE-78）TEXT.trademarkNotice 逐字等於 LT-5", () => {
    assert.equal(P.TEXT.trademarkNotice, LT_5);
  });

  // ── （v0.11，FE-52；v0.12，FE-78）PWA 圖示與名稱的品牌標識聲明（AC-23-02、Q-48） ──

  test("（FE-78）brandStatement 為單一參數，逐字等於 LT-4，名稱確實取自引數", () => {
    const pwa = require("../core/pwa.js");
    assert.equal(P.brandStatement.length, 1);
    assert.equal(P.brandStatement(pwa.PWA_APP_NAME), BRAND);
    assert.equal(P.brandStatement("測試名稱"), BRAND.replace("EnglishContext", "測試名稱"));
  });

  /**
   * 最小假 DOM（只支援 core/dom.js 用到的介面）
   * @param {{ listeners: Array<{ node: object, type: string }> }} [rec] 傳入時記錄每次 addEventListener（FE-77）
   */
  function fakeDocument(rec) {
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
        addEventListener(type) { if (rec) rec.listeners.push({ node: this, type }); },
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
    for (const rel of PAGE_MODULES) {
      vm.runInContext(fs.readFileSync(path.join(__dirname, "..", rel), "utf8"), sandbox, { filename: rel });
    }
    sandbox.EMT.core.dom.setDocument(fakeDocument());
    const rootEl = fakeDocument().createElement("section");
    sandbox.EMT.views.sourcesPage.render(rootEl, { sources: REG, builtin: F.builtin(), license });
    return rootEl;
  }

  test("（FE-78）render：聲明清單 5 條，依序為 codeLicense、dataLicense、LT-3、LT-4、LT-5；copyrightHolder 缺漏時文字不變", () => {
    for (const license of [F.license(), Object.assign(F.license(), { copyrightHolder: undefined }), undefined]) {
      const rootEl = renderInSandbox(license);
      const ul = findAll(rootEl, (n) => n.className === "src-statements")[0];
      assert.ok(ul);
      const items = ul.childNodes.map((li) => li.textContent);
      assert.deepEqual(items, [P.TEXT.codeLicense, P.TEXT.dataLicense, LT_3, BRAND, LT_5]);
    }
  });

  test("（FE-78）整頁文字含 LT-3～LT-5 各 1 次，不含舊聲明；derivedAttribution 署名仍取 copyrightHolder（V-LGL-03、T-93）", () => {
    const rootEl = renderInSandbox(Object.assign(F.license(), { copyrightHolder: "署名測試" }));
    const text = rootEl.textContent;
    for (const lt of [LT_3, BRAND, LT_5]) {
      assert.equal(text.split(lt).length - 1, 1, lt);
    }
    assert.ok(!text.includes("著作權人 JimmyLin"));
    assert.ok(!text.includes("著作權人"));
    assert.ok(!text.includes("保留所有權利"));
    const attrib = findAll(rootEl, (n) => n.className === "src-attrib")[0];
    assert.ok(attrib.textContent.endsWith("修改者 署名測試。"));
    const fallback = findAll(renderInSandbox(undefined), (n) => n.className === "src-attrib")[0];
    assert.ok(fallback.textContent.endsWith("修改者 JimmyLin。"));
  });

  test("（FE-52）core/pwa 未載入時 render 丟出含模組名稱的錯誤（LD-3）", () => {
    const fs = require("node:fs");
    const path = require("node:path");
    const vm = require("node:vm");
    const sandbox = { console: { warn() {}, error() {}, log() {} } };
    sandbox.self = sandbox;
    vm.createContext(sandbox);
    for (const rel of PAGE_MODULES.filter((r) => r !== "core/pwa.js")) {
      vm.runInContext(fs.readFileSync(path.join(__dirname, "..", rel), "utf8"), sandbox);
    }
    sandbox.EMT.core.dom.setDocument(fakeDocument());
    const rootEl = fakeDocument().createElement("section");
    assert.throws(() => sandbox.EMT.views.sourcesPage.render(rootEl, { sources: REG, builtin: F.builtin() }), /EMT\.core\.pwa/);
  });

  test("（FE-87）core/site-content、ui/site-return 未載入時 render 丟出含模組名稱的錯誤（LD-3）", () => {
    const fs = require("node:fs");
    const path = require("node:path");
    const vm = require("node:vm");
    for (const [missing, re] of [["core/site-content.js", /EMT\.core\.siteContent/], ["ui/site-return.js", /EMT\.ui\.siteReturn/]]) {
      const sandbox = { console: { warn() {}, error() {}, log() {} } };
      sandbox.self = sandbox;
      vm.createContext(sandbox);
      for (const rel of PAGE_MODULES.filter((r) => r !== missing)) {
        vm.runInContext(fs.readFileSync(path.join(__dirname, "..", rel), "utf8"), sandbox);
      }
      sandbox.EMT.core.dom.setDocument(fakeDocument());
      const rootEl = fakeDocument().createElement("section");
      assert.throws(() => sandbox.EMT.views.sourcesPage.render(rootEl, { sources: REG, builtin: F.builtin() }), re);
    }
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
    for (const rel of PAGE_MODULES) {
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
    assert.deepEqual(ul.childNodes.map((li) => li.textContent), [P.TEXT.codeLicense, P.TEXT.dataLicense, P.TEXT.originalLicense, BRAND, P.TEXT.trademarkNotice]);
  });

  test("畫面文字（render 結果與 TEXT）不分大小寫無「English Master Track」（AC-38-10 (1)、NM-6）；外部資料清單仍不列 ORIGINAL", () => {
    const rootEl = renderWithRegistry(REG);
    assert.doesNotMatch(rootEl.textContent, /english\s*master\s*track/i);
    assert.doesNotMatch(JSON.stringify(P.TEXT), /english\s*master\s*track/i);
    const cards = findAll(rootEl, (n) => n.className === "card src-card").map((n) => n.attrs["data-source"]);
    assert.ok(cards.length > 0);
    assert.ok(!cards.includes("ORIGINAL"));
  });

  // ── （v0.11，FE-77）聯絡行（AC-23-07 (1)(2)(7)、L-7、E-118；architecture.md §7.22.2、§10.8） ──

  /** 契約 ML-1 原文（逐字複製，不從被測模組取值） */
  const CONTACT = "email: d o n c l y d e 0 7 2 2 @ g m a i l . c o m";

  /** 去空格位址：執行期由常數推導（測試原始碼不寫字面值，FB-62） */
  function compactAddress(text) {
    return text.slice("email: ".length).split(" ").join("");
  }

  /** 依建置方式在 vm 載入並 render；同時記錄 addEventListener 呼叫 */
  function renderContact() {
    const fs = require("node:fs");
    const path = require("node:path");
    const vm = require("node:vm");
    const sandbox = { console: { warn() {}, error() {}, log() {} } };
    sandbox.self = sandbox;
    vm.createContext(sandbox);
    for (const rel of PAGE_MODULES) {
      vm.runInContext(fs.readFileSync(path.join(__dirname, "..", rel), "utf8"), sandbox, { filename: rel });
    }
    const rec = { listeners: [] };
    const doc = fakeDocument(rec);
    sandbox.EMT.core.dom.setDocument(doc);
    const rootEl = doc.createElement("section");
    sandbox.EMT.views.sourcesPage.render(rootEl, { sources: REG, builtin: F.builtin(), license: F.license() });
    return { rootEl, rec, api: sandbox.EMT.views.sourcesPage };
  }

  test("（FE-77）SOURCES_CONTACT_TEXT 逐字等於契約 ML-1，且結構為「email: 」＋22 個以單一半形空格分隔的單字元 token", () => {
    assert.equal(P.SOURCES_CONTACT_TEXT, CONTACT);
    const t = P.SOURCES_CONTACT_TEXT;
    assert.ok(t.startsWith("email: "));
    const tokens = t.slice("email: ".length).split(" ");
    assert.equal(tokens.length, 22);
    for (const tok of tokens) assert.equal(tok.length, 1, `token「${tok}」應為單一字元`);
    assert.doesNotMatch(t, /[^\x20-\x7e]/, "無全形或非 ASCII 字元");
    assert.doesNotMatch(t, / {2}/, "無連續空格");
    assert.equal(t.length, 50);
    // 推導出的去空格位址形態正確（不寫字面值）
    assert.match(compactAddress(t), /^[a-z0-9.]+@[a-z.]+$/);
  });

  test("（FE-77）render：恰 1 個 p.src-muted.src-contact，textContent 逐字為常數，且為 .src-page 最後一個子元素（在 .src-project 之後）", () => {
    const { rootEl, api } = renderContact();
    assert.equal(api.SOURCES_CONTACT_TEXT, CONTACT);
    const nodes = findAll(rootEl, (n) => typeof n.className === "string" && n.className.split(" ").includes("src-contact"));
    assert.equal(nodes.length, 1);
    const p = nodes[0];
    assert.equal(p.tagName, "P");
    assert.equal(p.className, "src-muted src-contact");
    assert.equal(p.textContent.trim(), CONTACT);
    assert.equal(p.childNodes.length, 0, "以 textContent 寫入，無子節點");
    const page = p.parentNode;
    assert.equal(page.className, "src-page");
    assert.equal(page.childNodes[page.childNodes.length - 1], p, "為最後一個子元素");
    const projectIdx = page.childNodes.findIndex((c) => c.className === "card src-project");
    assert.ok(projectIdx >= 0 && projectIdx < page.childNodes.indexOf(p), "位於授權聲明區之後");
  });

  test("（FE-77）聯絡行非連結、不可聚焦、無事件：自身與祖先非 A；無 href／tabindex／role／title／data-go；addEventListener 0 次", () => {
    const { rootEl, rec } = renderContact();
    const p = findAll(rootEl, (n) => n.className === "src-muted src-contact")[0];
    for (let n = p; n; n = n.parentNode) assert.notEqual(n.tagName, "A");
    for (const k of ["href", "tabindex", "tabIndex", "role", "title", "data-go"]) {
      assert.equal(Object.prototype.hasOwnProperty.call(p.attrs, k), false, `不得有 ${k}`);
    }
    assert.deepEqual(Object.keys(p.attrs), []);
    assert.equal(rec.listeners.filter((r) => r.node === p).length, 0);
  });

  test("（FE-77）整頁 textContent 無 mailto: 與去空格位址（不分大小寫），含常數原值恰 1 次", () => {
    const { rootEl } = renderContact();
    const text = rootEl.textContent;
    assert.ok(!/mailto:/i.test(text));
    assert.ok(!text.toLowerCase().includes(compactAddress(CONTACT).toLowerCase()));
    assert.equal(text.split(CONTACT).length - 1, 1);
  });

  test("（FE-77、FE-78）加入聯絡行後，既有聲明 5 條與「原創內容來源」照常", () => {
    const { rootEl } = renderContact();
    const ul = findAll(rootEl, (n) => n.className === "src-statements")[0];
    assert.deepEqual(ul.childNodes.map((li) => li.textContent), [P.TEXT.codeLicense, P.TEXT.dataLicense, P.TEXT.originalLicense, BRAND, P.TEXT.trademarkNotice]);
    assert.equal(findAll(rootEl, (n) => n.className === "src-original")[0].textContent, "原創內容來源：EnglishContext 原創內容");
  });

  // ── （v0.19，FE-87）共用文案與返回按鈕（SC-1、SP-3、ML-1；architecture.md v0.14 §7.25.6、§7.25.7） ──

  test("（FE-87）聲明與信箱都取自 core/site-content，本檔原始碼不留字面值（SC-1、ML-1）", () => {
    const fs = require("node:fs");
    const path = require("node:path");
    const SITE = require("../core/site-content.js");
    assert.equal(P.TEXT.originalLicense, SITE.LEGAL_STATEMENTS.originalContent);
    assert.equal(P.TEXT.trademarkNotice, SITE.LEGAL_STATEMENTS.trademark);
    assert.equal(P.SOURCES_CONTACT_TEXT, SITE.SOURCES_CONTACT_TEXT);
    const src = fs.readFileSync(path.join(__dirname, "..", "views", "sources-page.js"), "utf8");
    for (const literal of [LT_3, LT_5, CONTACT]) assert.equal(src.includes(literal), false, literal);
    assert.doesNotMatch(src, /(?:[A-Za-z0-9._%+-] ){3,}@(?: [A-Za-z0-9._%+-])+/, "不留任何空白形式的地址");
  });

  test("（FE-87）載入時不取用 core/site-content、ui/site-return（LD-2）", () => {
    const fs = require("node:fs");
    const path = require("node:path");
    const vm = require("node:vm");
    const sandbox = {};
    sandbox.self = sandbox;
    const reads = [];
    sandbox.EMT = {
      core: new Proxy({}, { get(t, k) { reads.push("core." + String(k)); return t[k]; } }),
      ui: new Proxy({}, { get(t, k) { reads.push("ui." + String(k)); return t[k]; } })
    };
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "views", "sources-page.js"), "utf8"), sandbox);
    assert.deepEqual(reads, []);
  });

  test("（FE-87）返回按鈕是 .src-page 第一個子元素，頁面名稱與既有內容順序不變；show 依 returnTarget 更新文字，點擊只呼叫 back", () => {
    const fs = require("node:fs");
    const path = require("node:path");
    const vm = require("node:vm");
    const sandbox = { console: { warn() {}, error() {}, log() {} } };
    sandbox.self = sandbox;
    vm.createContext(sandbox);
    for (const rel of ["core/constants.js"].concat(PAGE_MODULES)) {
      vm.runInContext(fs.readFileSync(path.join(__dirname, "..", rel), "utf8"), sandbox, { filename: rel });
    }
    let target = "flashcards";
    let backs = 0;
    sandbox.EMT.router = { returnTarget: () => target, back: () => { backs += 1; return true; } };
    const handlers = [];
    const doc = fakeDocument();
    const createElement = doc.createElement;
    doc.createElement = (t) => {
      const n = createElement(t);
      n.addEventListener = (type, fn) => handlers.push({ node: n, type, fn });
      return n;
    };
    sandbox.EMT.core.dom.setDocument(doc);
    const rootEl = doc.createElement("section");
    const page = sandbox.EMT.views.sourcesPage;
    page.render(rootEl, { sources: REG, builtin: F.builtin(), license: F.license() });
    const srcPage = rootEl.childNodes[0];
    const btn = srcPage.childNodes[0];
    assert.equal(btn.tagName, "BUTTON");
    assert.equal(btn.className, "btn btn--link site-return");
    assert.equal(btn.attrs.type, "button");
    assert.equal(srcPage.childNodes[1].tagName, "H2");
    assert.equal(srcPage.childNodes[1].textContent, "資料來源與授權");

    page.show();
    assert.equal(btn.textContent, "返回單字卡");
    target = "customizer";
    page.show();
    assert.equal(btn.textContent, "返回難易度設定");

    const click = handlers.find((h) => h.node === btn && h.type === "click");
    assert.ok(click, "應綁定 click");
    click.fn();
    assert.equal(backs, 1);
  });
});
