/*
 * views/sources-page.js — 資料來源與授權頁（FE-17）
 * 依據：architecture.md §4.2；契約 DataSourceEntry、ProjectLicenseInfo、VocabManifest、README §4.3 L-4、L-5、§9 FB-20、FB-21
 * 涵蓋：US-23、AC-23-02
 *
 * 規則：
 * - 依 DATA_SOURCE_REGISTRY 列出 kind 為 "wordlist" 與 "dictionary" 的外部資料。
 * - 列出的字表 = 內建字庫 sources 實際出現的代碼 ∩ registry（依 registry 順序）；
 *   registry 有多餘或缺少時 console.warn（列出的字表數量 = 資料中字表種類數，AC-23-02）。
 * - 辭典（ECDICT）只在字庫有 meaningSource 為該代碼時列出；registry 有但未使用時 console.warn。
 * - 收錄筆數一律取 includedItemCount；不顯示官網字數與原始筆數欄位（FB-20）。
 * - 網址以純文字顯示，不做成連結（離線、AC-23-02「純文字顯示即可」）。
 * - ECDICT 的 copyrightNotice、licenseText 以 <details> 可摺疊、textContent 顯示（FB-21、L-5）。
 * - 所有文字經 EMT.core.dom（textContent）寫入，不解析 HTML（契約 C-7）。
 *
 * - （v0.11，FE-52）授權聲明清單在既有 3 條之後加「PWA 圖示與名稱」品牌標識聲明（AC-23-02、Q-48）；
 *   名稱於 render 時取 EMT.core.pwa.PWA_APP_NAME（LD-2；不存在依 LD-3 丟出錯誤）。
 * - （v0.12，FE-78；architecture.md v0.12 §7.23.1、契約 README §4.3 L-8）原創內容聲明 = LT-3、品牌標識聲明 = LT-4，
 *   品牌標識聲明之後加第 5 條商標聲明 = LT-5；品牌標識聲明不再使用 copyrightHolder，該欄位仍供 derivedAttribution 署名。
 * - （v0.11，FE-77；architecture.md v0.11 §7.22.2、契約 data-schema.ts §16、README §4.3 L-7、AC-23-07）
 *   .src-page 最後（授權聲明區之後）加 1 行聯絡資訊 p.src-muted.src-contact，以 textContent 寫入常數 SOURCES_CONTACT_TEXT。
 *   防爬蟲：常數為帶空格的原值，不做任何字串處理；不是連結、不可聚焦（無 href／tabindex／role／title／data-go）、
 *   不掛事件。全 src/app 非測試原始碼只有下方常數 1 處字面值，註解不重複寫出。
 *
 * 純邏輯（selectEntries、formatCount、countLabel、derivedAttribution、brandStatement）可在 Node 測試；
 * 瀏覽器下登錄 EMT.views.register("sources", { mount })。
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.EMT = root.EMT || {};
    root.EMT.views = root.EMT.views || {};
    root.EMT.views.sourcesPage = api;
    if (typeof root.EMT.views.register === "function") {
      root.EMT.views.register("sources", { mount: api.mount });
    }
  }
})(typeof self !== "undefined" ? self : this, function (root) {
  "use strict";

  /** 畫面固定文字（AC-23-02、Q-31 原文；originalLicense、trademarkNotice 逐字照契約 L-8 LT-3、LT-5） */
  var TEXT = {
    title: "資料來源與授權",
    intro: "本檔案使用下列外部資料。網址僅以文字列出，需要時請自行複製到瀏覽器開啟。",
    externalHeading: "外部資料",
    empty: "目前沒有可顯示的外部資料（內容資料缺漏）。",
    ecdictPhonetic: "音標改寫為美式 IPA，標為原創，不屬 ECDICT",
    licenseFull: "MIT 授權全文",
    licenseMissing: "（資料缺漏：未提供授權全文）",
    licenseHeading: "本系統的授權",
    codeLicense: "程式碼以 MIT 授權（Copyright JimmyLin）",
    dataLicense: "單字資料以 CC BY-SA 4.0 授權",
    originalLicense: "原創內容（例句、解析、Part 5 題目、長難句、句型）由 JimmyLin 以 AI 輔助編製，JimmyLin 就其享有的權利以 CC BY-SA 4.0 授權",
    trademarkNotice: "TOEIC® 為 ETS 的註冊商標。本網站與 ETS 無關，亦未經其認可或核准。",
    codeLicenseUrlLabel: "MIT 條款網址",
    dataLicenseUrlLabel: "CC BY-SA 4.0 條款網址",
    // （v0.12，FE-60；NM-3、SD-FB-49）原創內容來源一行的前綴；名稱取 registry 中 ORIGINAL 的 fullName，不寫死
    originalSource: "原創內容來源："
  };

  /**
   * （v0.11，FE-77）聯絡行文字：逐字照契約 data-schema.ts §16 複製（半形空格 U+0020 分隔，防爬蟲，L-7）。
   * 不得去空格、replace、split／join 或拼接。
   */
  var SOURCES_CONTACT_TEXT = "email: j i m m y l i n . 5 8 3 9 0 7 2 2 @ g m a i l . c o m";

  /** 欄位標籤 */
  var LABEL = {
    version: "版本",
    authors: "原作者",
    licenseName: "授權",
    licenseUrl: "授權條款網址",
    homepageUrl: "官網網址",
    count: "收錄筆數",
    modifications: "本系統的修改"
  };

  /** PROJECT_LICENSE 缺漏時的保底值（契約 ProjectLicenseInfo 的固定值） */
  var LICENSE_FALLBACK = {
    copyrightHolder: "JimmyLin",
    dataLicenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    codeLicenseUrl: "https://opensource.org/license/mit"
  };

  /** 輸出警告（環境沒有 console 時略過） */
  function warn(msg) {
    if (typeof console !== "undefined" && typeof console.warn === "function") {
      console.warn("[EMT.views.sources] " + msg);
    }
  }

  /** 是否為非空字串 */
  function isText(x) {
    return typeof x === "string" && x.length > 0;
  }

  /**
   * 選出要列出的外部資料（純函式）。
   * 字表：字庫 sources 出現的代碼 ∩ registry 中 kind = "wordlist" 者；
   * 辭典：registry 中 kind = "dictionary" 且字庫有 meaningSource 為該代碼者。
   * 皆依 registry 順序。
   * @param {Array<object>} registry DATA_SOURCE_REGISTRY（可為空或非陣列）
   * @param {Array<object>} builtin 內建字庫（可為空或非陣列）
   * @returns {{ wordlists: object[], dictionaries: object[], warnings: string[] }}
   */
  function selectEntries(registry, builtin) {
    var reg = Array.isArray(registry) ? registry : [];
    var items = Array.isArray(builtin) ? builtin : [];
    var warnings = [];

    // 統計字庫實際使用的字表代碼與釋義來源代碼
    var usedLists = {};
    var usedListOrder = [];
    var usedMeaning = {};
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (!it || typeof it !== "object") continue;
      var srcs = Array.isArray(it.sources) ? it.sources : [];
      for (var s = 0; s < srcs.length; s++) {
        var c = srcs[s];
        if (typeof c !== "string") continue;
        if (!usedLists[c]) {
          usedLists[c] = true;
          usedListOrder.push(c);
        }
      }
      if (typeof it.meaningSource === "string") usedMeaning[it.meaningSource] = true;
    }

    var wordlists = [];
    var dictionaries = [];
    var regLists = {};
    for (var r = 0; r < reg.length; r++) {
      var e = reg[r];
      if (!e || typeof e !== "object") continue;
      if (e.kind === "wordlist") {
        regLists[e.code] = true;
        if (usedLists[e.code]) wordlists.push(e);
        else warnings.push("registry 的字表 " + e.code + " 未出現在內建字庫 sources 中，不列出");
      } else if (e.kind === "dictionary") {
        if (usedMeaning[e.code]) dictionaries.push(e);
        else warnings.push("registry 的辭典 " + e.code + " 未被任何內建單字的 meaningSource 使用，不列出");
      }
    }
    for (var u = 0; u < usedListOrder.length; u++) {
      if (!regLists[usedListOrder[u]]) {
        warnings.push("內建字庫 sources 出現的代碼 " + usedListOrder[u] + " 不在 registry 的字表中，無法列出");
      }
    }
    return { wordlists: wordlists, dictionaries: dictionaries, warnings: warnings };
  }

  /**
   * 整數加千分位（不依賴語系設定）；非有限非負整數回 null。
   * @param {*} n
   * @returns {string|null}
   */
  function formatCount(n) {
    if (typeof n !== "number" || !isFinite(n) || n < 0 || Math.floor(n) !== n) return null;
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  /**
   * 收錄筆數文字（FB-20：只用 includedItemCount）。
   * @param {object} entry DataSourceEntry
   * @returns {string}
   */
  function countLabel(entry) {
    var n = formatCount(entry && entry.includedItemCount);
    if (n === null) return "未提供";
    return entry.kind === "dictionary" ? "提供釋義 " + n + " 筆" : "本系統收錄 " + n + " 字";
  }

  /**
   * 衍生單字資料的署名文字（L-4）：原字表作者（去重、依出現順序）＋修改者。
   * @param {object[]} wordlists 已列出的字表
   * @param {string} holder 修改者（PROJECT_LICENSE.copyrightHolder）
   * @returns {string}
   */
  function derivedAttribution(wordlists, holder) {
    var seen = {};
    var authors = [];
    var names = [];
    (wordlists || []).forEach(function (e) {
      if (isText(e.name)) names.push(e.name);
      (Array.isArray(e.authors) ? e.authors : []).forEach(function (a) {
        if (isText(a) && !seen[a]) {
          seen[a] = true;
          authors.push(a);
        }
      });
    });
    var who = isText(holder) ? holder : LICENSE_FALLBACK.copyrightHolder;
    var listPart = names.length ? "（" + names.join("、") + "）" : "";
    var authorPart = authors.length ? authors.join("；") : "未提供";
    return "本系統衍生的單字資料以 CC BY-SA 4.0 釋出，署名：原字表作者 " + authorPart + listPart +
      "；修改者 " + who + "。";
  }

  /**
   * （v0.11，FE-52；v0.12，FE-78）PWA 圖示與名稱的品牌標識聲明（AC-23-02、AC-23-06、Q-48）。
   * 組字結果須與契約 L-8 LT-4 逐字相同；名稱取 PWA_APP_NAME（NM-3）。
   * @param {string} appName PWA_APP_NAME
   * @returns {string}
   */
  function brandStatement(appName) {
    return "PWA 圖示由 AI 依 JimmyLin 的構想生成；圖示與名稱「" + appName + "」作為品牌標識使用，JimmyLin 保留其享有的權利，不適用 MIT 與 CC BY-SA 4.0";
  }

  /** （v0.11）取得 core/pwa（呼叫時取用，LD-2）；不存在時視為組裝錯誤（LD-3） */
  function pwaCore() {
    var m = null;
    if (typeof require === "function" && typeof module === "object") {
      m = require("../core/pwa.js");
    } else {
      m = root.EMT && root.EMT.core && root.EMT.core.pwa;
    }
    if (!m) { throw new Error("EMT.core.pwa 未載入（views/sources-page.js）"); }
    return m;
  }

  // ─────────────────────────────────────────────────────────────
  // 畫面
  // ─────────────────────────────────────────────────────────────

  /** 取得 dom 工具 */
  function domApi() {
    return root.EMT && root.EMT.core && root.EMT.core.dom;
  }

  /** 一列「標籤：值」 */
  function row(dom, label, value, valueClass) {
    return dom.el("div", { className: "src-row" }, [
      dom.el("dt", { className: "src-row__label", text: label }),
      dom.el("dd", { className: "src-row__value" + (valueClass ? " " + valueClass : ""), text: value })
    ]);
  }

  /** 純文字網址（不做成連結） */
  function urlText(x) {
    return isText(x) ? x : "未提供";
  }

  /** 建一份外部資料的卡片 */
  function entryCard(dom, e) {
    // 標題「名稱（全名）」；全名已以名稱開頭（如「ECDICT（英漢辭典資料庫）」）時只顯示全名，避免重複
    var name = isText(e.name) ? e.name : String(e.code || "");
    var heading = name;
    if (isText(e.fullName) && e.fullName !== name) {
      heading = e.fullName.indexOf(name) === 0 ? e.fullName : name + "（" + e.fullName + "）";
    }
    var authors = Array.isArray(e.authors) ? e.authors.filter(isText) : [];

    var mods = Array.isArray(e.modifications) ? e.modifications.filter(isText) : [];
    var modNodes = mods.length
      ? dom.el("ul", { className: "src-mods" }, mods.map(function (m) {
          return dom.el("li", { text: m });
        }))
      : dom.el("p", { className: "src-muted", text: "無" });

    var children = [
      dom.el("h4", { className: "src-card__title", text: heading }),
      dom.el("dl", { className: "src-fields" }, [
        row(dom, LABEL.version, isText(e.version) ? e.version : "未提供"),
        row(dom, LABEL.authors, authors.length ? authors.join("；") : "未提供"),
        row(dom, LABEL.licenseName, isText(e.licenseName) ? e.licenseName : "未提供"),
        row(dom, LABEL.licenseUrl, urlText(e.licenseUrl), "src-url"),
        row(dom, LABEL.homepageUrl, urlText(e.homepageUrl), "src-url"),
        row(dom, LABEL.count, countLabel(e))
      ]),
      dom.el("h5", { className: "src-card__sub", text: LABEL.modifications }),
      modNodes
    ];

    if (e.kind === "dictionary") {
      // ECDICT：音標說明（L-4 固定文字）與 MIT 全文（FB-21、L-5）
      children.push(dom.el("p", { className: "src-note", text: TEXT.ecdictPhonetic }));
      if (e.licenseName === "MIT" || isText(e.licenseText) || isText(e.copyrightNotice)) {
        var body = [];
        if (isText(e.copyrightNotice)) {
          body.push(dom.el("p", { className: "src-license-notice", text: e.copyrightNotice }));
        }
        if (isText(e.licenseText)) {
          body.push(dom.el("pre", { className: "src-license-text", text: e.licenseText }));
        } else {
          warn(String(e.code) + " 缺少 licenseText（L-5）");
          body.push(dom.el("p", { className: "src-muted", text: TEXT.licenseMissing }));
        }
        children.push(dom.el("details", { className: "src-license" }, [
          dom.el("summary", { className: "src-license__summary", text: TEXT.licenseFull })
        ].concat(body)));
      }
    }

    return dom.el("article", { className: "card src-card", attrs: { "data-source": String(e.code || "") } }, children);
  }

  /**
   * （v0.12，FE-60；契約 NM-3、§4.3）原創內容來源名稱：DATA_SOURCE_REGISTRY 中 code = "ORIGINAL" 項目的 fullName。
   * 無該項目、fullName 非字串或空白 → null（不顯示該行）。
   * @param {Array<object>} registry DATA_SOURCE_REGISTRY（可為空或非陣列）
   * @returns {string|null}
   */
  function originalSourceName(registry) {
    var reg = Array.isArray(registry) ? registry : [];
    for (var i = 0; i < reg.length; i++) {
      var e = reg[i];
      if (e && e.code === "ORIGINAL") {
        return isText(e.fullName) && e.fullName.trim() !== "" ? e.fullName : null;
      }
    }
    return null;
  }

  /** 本系統授權聲明區 */
  function licenseSection(dom, wordlists, license, registry) {
    var lic = license || {};
    var holder = isText(lic.copyrightHolder) ? lic.copyrightHolder : LICENSE_FALLBACK.copyrightHolder;
    var codeUrl = isText(lic.codeLicenseUrl) ? lic.codeLicenseUrl : LICENSE_FALLBACK.codeLicenseUrl;
    var dataUrl = isText(lic.dataLicenseUrl) ? lic.dataLicenseUrl : LICENSE_FALLBACK.dataLicenseUrl;
    // （v0.12，FE-60）聲明清單之前一行「原創內容來源：{fullName}」；名稱缺漏時不建節點（NM-3）
    var originalName = originalSourceName(registry);
    var original = originalName === null ? null
      : dom.el("p", { className: "src-original", text: TEXT.originalSource + originalName });
    return dom.el("section", { className: "card src-project", attrs: { "aria-labelledby": "src-license-heading" } }, [
      dom.el("h3", { className: "src-card__title", attrs: { id: "src-license-heading" }, text: TEXT.licenseHeading }),
      original,
      dom.el("ul", { className: "src-statements" }, [
        dom.el("li", { text: TEXT.codeLicense }),
        dom.el("li", { text: TEXT.dataLicense }),
        dom.el("li", { text: TEXT.originalLicense }),
        dom.el("li", { className: "src-statements__brand", text: brandStatement(pwaCore().PWA_APP_NAME) }),
        dom.el("li", { text: TEXT.trademarkNotice })
      ]),
      dom.el("p", { className: "src-attrib", text: derivedAttribution(wordlists, holder) }),
      dom.el("dl", { className: "src-fields" }, [
        row(dom, TEXT.codeLicenseUrlLabel, codeUrl, "src-url"),
        row(dom, TEXT.dataLicenseUrlLabel, dataUrl, "src-url")
      ])
    ]);
  }

  /**
   * 建立整頁內容（可傳入資料供測試）。
   * @param {HTMLElement} rootEl #view-sources
   * @param {{ sources?: object[], builtin?: object[], license?: object }} [data] 預設讀 EMT.content
   */
  function render(rootEl, data) {
    var dom = domApi();
    if (!rootEl || !dom) return;
    var content = data || (root.EMT && root.EMT.content) || {};
    var picked = selectEntries(content.sources, content.builtin);
    picked.warnings.forEach(warn);

    var entries = picked.wordlists.concat(picked.dictionaries);
    var list = entries.length
      ? entries.map(function (e) { return entryCard(dom, e); })
      : [dom.el("p", { className: "card src-muted", text: TEXT.empty })];

    dom.clear(rootEl);
    dom.append(rootEl, dom.el("div", { className: "src-page" }, [
      dom.el("h2", { className: "src-page__title", text: TEXT.title }),
      dom.el("p", { className: "src-muted", text: TEXT.intro }),
      dom.el("h3", { className: "src-section-title", text: TEXT.externalHeading }),
      dom.el("div", { className: "src-list" }, list),
      licenseSection(dom, picked.wordlists, content.license, content.sources),
      // （v0.11，FE-77）聯絡行：純文字段落、非連結、不可聚焦、無事件（§7.22.2）
      dom.el("p", { className: "src-muted src-contact", text: SOURCES_CONTACT_TEXT })
    ]));
  }

  /** router 的 mount（只呼叫一次；資料於啟動時已載入） */
  function mount(rootEl) {
    render(rootEl);
  }

  return {
    TEXT: TEXT,
    SOURCES_CONTACT_TEXT: SOURCES_CONTACT_TEXT,
    selectEntries: selectEntries,
    originalSourceName: originalSourceName,
    formatCount: formatCount,
    countLabel: countLabel,
    derivedAttribution: derivedAttribution,
    brandStatement: brandStatement,
    render: render,
    mount: mount
  };
});
