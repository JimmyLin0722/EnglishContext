/*
 * views/site-pages.js — 應用內「關於我」「聯絡我們」「隱私權政策」三頁（FE-87）
 * 依據：architecture.md v0.14 §4.12、§7.25.6、§7.25.7；契約 data-schema.ts §17、README §13.3 SP-3、SP-5、SP-7～SP-9、
 *       §13.4 SC-1～SC-6、§13.6 ML-1、ML-2
 * 涵蓋：US-53、US-54、US-55、US-57、AC-53-01～AC-53-03、AC-53-05、AC-54-01、AC-55-01～AC-55-03、AC-56-04、AC-57-01～AC-57-03
 *
 * 規則：
 * - 文案只取自 EMT.core.siteContent，本檔不存任何文案（SC-1）；隨程式打包，執行期不發請求（SC-5）。
 * - 全部經 core/dom.js 建立並以 textContent 寫入，不拼接 HTML（C-7、SC-2）。
 * - 內容區根元素標 data-site-page-content="{id}"，只含頁面名稱與 blocks；返回按鈕在內容區之外（SP-3、SC-4、AC-55-01）。
 * - 標題層級：頁面名稱 h2、heading h3（品牌標題列已是 h1，SP-7）。
 * - 信箱行：純文字 p，非連結，無 tabindex、title、aria-label、事件（SC-3、ML-2）。
 * - page 連結用 data-go，由 router 的委派事件切頁（同 SP-3）；本檔不碰 store 與瀏覽器儲存（SP-5、SC-6）。
 * - mount 建 1 次；show 只更新返回按鈕文字並把焦點移到 h2（§7.25.6）。
 *
 * 純邏輯（findPage、renderBlock、renderPage）傳入 dom 即可在 Node 測試；
 * 瀏覽器下登錄 3 個頁面，載入時不取用其他模組（LD-2），取用的模組不存在時丟出含模組名稱的 Error（LD-3）。
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.EMT = root.EMT || {};
    root.EMT.views = root.EMT.views || {};
    root.EMT.views.sitePages = api;
    if (typeof root.EMT.views.register === "function") {
      api.PAGE_IDS.forEach(function (id) {
        root.EMT.views.register(id, api.createModule(id));
      });
    }
  }
})(typeof self !== "undefined" ? self : this, function (root) {
  "use strict";

  /** 本檔登錄的頁面代碼（SP-1） */
  var PAGE_IDS = ["about", "contact", "privacy"];

  /** 取得 core/dom（呼叫時取用，LD-2） */
  function domApi() {
    var m = root && root.EMT && root.EMT.core && root.EMT.core.dom;
    if (!m) { throw new Error("EMT.core.dom 未載入（views/site-pages.js）"); }
    return m;
  }

  /** 取得 core/site-content（呼叫時取用，LD-2） */
  function siteContent() {
    var m = null;
    if (typeof require === "function" && typeof module === "object") {
      m = require("../core/site-content.js");
    } else {
      m = root.EMT && root.EMT.core && root.EMT.core.siteContent;
    }
    if (!m) { throw new Error("EMT.core.siteContent 未載入（views/site-pages.js）"); }
    return m;
  }

  /** 取得 ui/site-return（呼叫時取用，LD-2） */
  function siteReturn() {
    var m = null;
    if (typeof require === "function" && typeof module === "object") {
      m = require("../ui/site-return.js");
    } else {
      m = root.EMT && root.EMT.ui && root.EMT.ui.siteReturn;
    }
    if (!m) { throw new Error("EMT.ui.siteReturn 未載入（views/site-pages.js）"); }
    return m;
  }

  /**
   * 依代碼找頁面（純函式）；找不到回 null。
   * @param {Array<object>} pages SITE_PAGES
   * @param {string} id
   * @returns {object|null}
   */
  function findPage(pages, id) {
    var list = Array.isArray(pages) ? pages : [];
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].id === id) return list[i];
    }
    return null;
  }

  /**
   * 建立行內內容（SC-2）：text → 字串（由 dom.append 轉為文字節點）；external → a；page → data-go 按鈕。
   * @param {object} dom
   * @param {object} inline SiteInline
   * @returns {string|HTMLElement|null}
   */
  function renderInline(dom, inline) {
    if (inline.kind === "text") return inline.text;
    if (inline.kind === "external") {
      return dom.el("a", { attrs: { href: inline.href, target: "_blank", rel: "noopener" }, text: inline.text });
    }
    if (inline.kind === "page") {
      return dom.el("button", {
        className: "btn--link site-page__link",
        attrs: { type: "button", "data-go": inline.target },
        text: inline.text
      });
    }
    return null;
  }

  /** 把行內內容陣列轉為子節點 */
  function renderInlines(dom, inlines) {
    return inlines.map(function (inline) {
      return renderInline(dom, inline);
    });
  }

  /**
   * 建立區塊元素（SC-2、SC-3）。
   * @param {object} dom
   * @param {object} block SiteBlock
   * @param {string} contactText SOURCES_CONTACT_TEXT
   * @returns {HTMLElement|null} 不認識的 kind 回 null
   */
  function renderBlock(dom, block, contactText) {
    if (block.kind === "heading") {
      return dom.el("h3", { className: "site-page__heading", text: block.text });
    }
    if (block.kind === "paragraph") {
      return dom.el("p", null, renderInlines(dom, block.inlines));
    }
    if (block.kind === "list") {
      return dom.el("ul", null, block.items.map(function (item) {
        return dom.el("li", null, renderInlines(dom, item));
      }));
    }
    if (block.kind === "contactLine") {
      return dom.el("p", { className: "site-page__contact", text: contactText });
    }
    return null;
  }

  /**
   * 建立整頁（§7.25.6 的 DOM 結構）。
   * @param {object} dom
   * @param {object} page SitePage
   * @param {string} contactText SOURCES_CONTACT_TEXT
   * @param {HTMLElement} returnBtn 返回按鈕（放在內容區之外）
   * @returns {{ el: HTMLElement, title: HTMLElement }}
   */
  function renderPage(dom, page, contactText, returnBtn) {
    var title = dom.el("h2", { className: "site-page__title", attrs: { tabindex: "-1" }, text: page.title });
    var blocks = page.blocks.map(function (block) {
      return renderBlock(dom, block, contactText);
    });
    var content = dom.el("div", {
      className: "site-page__content",
      attrs: { "data-site-page-content": page.id }
    }, [title].concat(blocks));
    return { el: dom.el("div", { className: "site-page" }, [returnBtn, content]), title: title };
  }

  /**
   * 建立單一頁面的 router 模組。
   * @param {string} id PAGE_IDS 之一
   * @returns {{ mount: Function, show: Function }}
   */
  function createModule(id) {
    var returnBtn = null;
    var title = null;

    return {
      mount: function (rootEl) {
        var dom = domApi();
        var site = siteContent();
        var page = findPage(site.SITE_PAGES, id);
        if (!rootEl || !page) return;
        returnBtn = siteReturn().create(dom);
        var built = renderPage(dom, page, site.SOURCES_CONTACT_TEXT, returnBtn);
        title = built.title;
        dom.clear(rootEl);
        dom.append(rootEl, built.el);
      },
      show: function () {
        if (!returnBtn) return;
        siteReturn().refresh(returnBtn);
        // 鍵盤使用者從內容開始；router 隨後自行捲回頁首，這裡不捲動
        if (title && typeof title.focus === "function") title.focus({ preventScroll: true });
      }
    };
  }

  return {
    PAGE_IDS: PAGE_IDS,
    findPage: findPage,
    renderBlock: renderBlock,
    renderPage: renderPage,
    createModule: createModule
  };
});
