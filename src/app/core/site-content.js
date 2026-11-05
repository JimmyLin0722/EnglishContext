/*
 * EMT.core.siteContent — 對外頁面文案與 SEO 常數的單一來源（FE-83）
 * 依據：architecture.md v0.14 §3.1、§4.12「EMT.core.siteContent」、§7.25.7、§7.25.9；
 *       契約 data-schema.ts §16、§17、README §13.4 SC-1、§13.6 ML-1～ML-3、§13.7 V-SITE-02、V-SEO-01、V-SEO-06、DS-49
 * 涵蓋：US-53、US-54、US-55、US-56、AC-53-02、AC-53-06、AC-54-01、AC-54-02、AC-55-01～AC-55-04、
 *       AC-56-01、AC-56-02、AC-56-03、AC-56-05～AC-56-09、AC-57-03
 *
 * - 全部常數與 data-schema.ts 逐字相同（site-content.test.js 以 node:vm 取契約字面值做深度相等）；不得自行改寫。
 * - 全部深度凍結且為 JSON 相容的純資料；不依賴 DOM，不持久化（SC-1、SC-6）。
 * - 本檔同時由 tools/build.mjs 以 createRequire 讀取：Node 下 module.exports 即同一個 api 物件。
 * - L1 模組：factory 無任何依賴，載入時不取用其他模組（LD-1）。
 * - 信箱只有 SOURCES_CONTACT_TEXT 這一種寫法（ML-1）；內文的信箱行只放 { kind: "contactLine" }，不另存地址（SC-3）。
 * - 文字一律純文字：應用內以 textContent 寫入，靜態頁由建置跳脫（SC-2）。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.EMT = root.EMT || {};
    root.EMT.core = root.EMT.core || {};
    root.EMT.core.siteContent = api;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // 深層凍結：物件與其中所有子物件、陣列都不可再修改
  function deepFreeze(obj) {
    Object.getOwnPropertyNames(obj).forEach(function (name) {
      var value = obj[name];
      if (value && typeof value === "object") {
        deepFreeze(value);
      }
    });
    return Object.freeze(obj);
  }

  // ── data-schema.ts §16、§17 常數（逐字複製，不得自行修改）──

  /** 信箱行（ML-1；每個字元之間各 1 個半形空格是刻意的防爬蟲設計，執行期不得組出無空白形式，ML-2） */
  var SOURCES_CONTACT_TEXT = "email: d o n c l y d e 0 7 2 2 @ g m a i l . c o m";

  /** 頁尾連結列（順序固定，各恰 1 次；AC-57-01） */
  var FOOTER_LINKS = [
    { target: "about", label: "關於我" },
    { target: "contact", label: "聯絡我們" },
    { target: "privacy", label: "隱私權政策" },
    { target: "sources", label: "資料來源與授權" }
  ];

  /** 跨頁共用的權利聲明（= README L-8 的 LT-3、LT-5；AC-54-01 (4)、SC-1） */
  var LEGAL_STATEMENTS = {
    originalContent: "原創內容（例句、解析、Part 5 題目、長難句、句型）由 JimmyLin 以 AI 輔助編製，JimmyLin 就其享有的權利以 CC BY-SA 4.0 授權",
    trademark: "TOEIC® 為 ETS 的註冊商標。本網站與 ETS 無關，亦未經其認可或核准。"
  };

  /** 靜態頁共用元素的文字（位於 <main> 之外，AC-57-04） */
  var SITE_PAGE_TEXTS = {
    homeLink: "回到網站首頁"
  };

  /** 正式網站來源（SEO 宣告用，結尾無斜線；AC-56-02、SE-1） */
  var SITE_ORIGIN = "https://jimmyfantasyworld.com";

  /** 3 個對外頁面的逐字文案（AC-53-02、AC-54-01、AC-55-01；應用內畫面與靜態頁共用，AC-57-03） */
  var SITE_PAGES = [
    {
      id: "about",
      title: "關於我",
      staticPath: "about.html",
      seo: {
        documentTitle: "關於我｜EnglishContext",
        description: "EnglishContext 的網站用途、主要功能、使用方式與內容權利說明。",
        canonicalUrl: "https://jimmyfantasyworld.com/about.html"
      },
      blocks: [
        { kind: "heading", text: "網站用途" },
        { kind: "paragraph", inlines: [{ kind: "text", text: "EnglishContext 的用途是提升英文能力、自我學習。" }] },
        { kind: "heading", text: "主要功能" },
        {
          kind: "list",
          items: [
            [{ kind: "text", text: "單字卡：翻卡、美式語音示範、語音辨識吻合度、四選一。" }],
            [{ kind: "text", text: "模擬測驗：題型參考 TOEIC®（多益）Part 5，非 ETS 官方或認可內容；作答後顯示解析。" }],
            [{ kind: "text", text: "學習進度：連續打卡、今日已學、已答對題數。" }]
          ]
        },
        { kind: "heading", text: "使用方式" },
        {
          kind: "list",
          items: [
            [{ kind: "text", text: "可離線使用（語音辨識需要連網；網站版須先連網開啟過一次）。" }],
            [{ kind: "text", text: "學習紀錄存在你使用的瀏覽器，可用備份匯出與匯入。" }]
          ]
        },
        { kind: "heading", text: "內容與權利" },
        // 兩段聲明以變數引用 LEGAL_STATEMENTS，不另存字串（SC-1）
        { kind: "paragraph", inlines: [{ kind: "text", text: LEGAL_STATEMENTS.originalContent }] },
        { kind: "paragraph", inlines: [{ kind: "text", text: LEGAL_STATEMENTS.trademark }] },
        { kind: "heading", text: "相關頁面" },
        {
          kind: "list",
          items: [
            [{ kind: "page", text: "資料來源與授權", target: "sources" }],
            [{ kind: "page", text: "隱私權政策", target: "privacy" }],
            [{ kind: "page", text: "聯絡我們", target: "contact" }]
          ]
        }
      ]
    },
    {
      id: "contact",
      title: "聯絡我們",
      staticPath: "contact.html",
      seo: {
        documentTitle: "聯絡我們｜EnglishContext",
        description: "EnglishContext 的聯絡方式。",
        canonicalUrl: "https://jimmyfantasyworld.com/contact.html"
      },
      // AC-55-01：內容區只有標題與 1 行信箱（Q-91 決議 B）
      blocks: [{ kind: "contactLine" }]
    },
    {
      id: "privacy",
      title: "隱私權政策",
      staticPath: "privacy.html",
      seo: {
        documentTitle: "隱私權政策｜EnglishContext",
        description: "EnglishContext 如何處理學習資料、廣告服務、Cookie 與識別碼、語音辨識，以及個人化廣告的退出方式。",
        canonicalUrl: "https://jimmyfantasyworld.com/privacy.html"
      },
      blocks: [
        { kind: "heading", text: "學習資料" },
        { kind: "paragraph", inlines: [{ kind: "text", text: "學習紀錄只存在你目前使用的瀏覽器。本系統沒有伺服器，不接收也不保存這些紀錄；備份檔由你自行保管。" }] },
        { kind: "heading", text: "廣告服務" },
        { kind: "paragraph", inlines: [{ kind: "text", text: "網站版（jimmyfantasyworld.com）使用 Google AdSense；以檔案開啟的版本不載入廣告。" }] },
        { kind: "heading", text: "Cookie 與識別碼" },
        { kind: "paragraph", inlines: [{ kind: "text", text: "Google 等第三方可能讀寫 Cookie 或使用識別碼，並依你造訪本網站或其他網站的紀錄投放廣告；這些資料由第三方依其政策處理。" }] },
        { kind: "heading", text: "個人化廣告退出方式" },
        {
          kind: "paragraph",
          inlines: [
            { kind: "text", text: "你可以到 Google 廣告設定關閉個人化廣告，說明請見：" },
            { kind: "external", text: "控制 Google 用於顯示廣告的資料", href: "https://support.google.com/My-Ad-Center-Help/answer/12156161" }
          ]
        },
        { kind: "heading", text: "語音辨識" },
        { kind: "paragraph", inlines: [{ kind: "text", text: "語音由瀏覽器廠商（如 Google、Microsoft）處理；本系統不錄音、不保存、不上傳錄音。" }] },
        { kind: "heading", text: "聯絡方式" },
        { kind: "contactLine" }
      ]
    }
  ];

  /** 首頁 SEO 標記值（AC-56-01～AC-56-03；Q-90 決議 B） */
  var SITE_HOME_SEO = {
    documentTitle: "EnglishContext｜英文單字卡與模擬測驗",
    description: "EnglishContext 是自我學習用的英文工具，提供單字卡、美式發音練習與模擬測驗；題型參考 TOEIC®（多益）Part 5，非 ETS 官方或認可內容。",
    canonicalUrl: "https://jimmyfantasyworld.com/",
    ogImageUrl: "https://jimmyfantasyworld.com/icons/icon-512.png"
  };

  /** 首頁結構化資料（Q-92 決議 A；鍵不得增減，AC-56-05、SE-5） */
  var SITE_HOME_JSON_LD = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "EnglishContext",
    url: "https://jimmyfantasyworld.com/",
    description: "EnglishContext 是自我學習用的英文工具，提供單字卡、美式發音練習與模擬測驗；題型參考 TOEIC®（多益）Part 5，非 ETS 官方或認可內容。"
  };

  /** 未執行 JavaScript 時的網站說明（AC-56-06、SE-6）；不含信箱，連結為正式網址（E-151） */
  var SITE_NOSCRIPT = {
    title: "EnglishContext",
    description: "EnglishContext 是自我學習用的英文工具，提供單字卡、美式發音練習與模擬測驗；題型參考 TOEIC®（多益）Part 5，非 ETS 官方或認可內容。",
    features: ["單字卡與美式發音練習", "模擬測驗（作答後顯示解析）", "學習進度（連續打卡、今日已學、已答對題數）"],
    links: [
      { text: "關於我", href: "https://jimmyfantasyworld.com/about.html" },
      { text: "聯絡我們", href: "https://jimmyfantasyworld.com/contact.html" },
      { text: "隱私權政策", href: "https://jimmyfantasyworld.com/privacy.html" }
    ]
  };

  /** robots.txt 逐字內容（換行 LF，結尾 1 個 LF；AC-56-08、SE-7） */
  var ROBOTS_TXT = "User-agent: *\nAllow: /\n\nSitemap: https://jimmyfantasyworld.com/sitemap.xml\n";

  /** sitemap.xml 逐字內容（換行 LF，結尾 1 個 LF；無 lastmod，AC-56-09、SE-8） */
  var SITEMAP_XML =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    "  <url><loc>https://jimmyfantasyworld.com/</loc></url>\n" +
    "  <url><loc>https://jimmyfantasyworld.com/about.html</loc></url>\n" +
    "  <url><loc>https://jimmyfantasyworld.com/contact.html</loc></url>\n" +
    "  <url><loc>https://jimmyfantasyworld.com/privacy.html</loc></url>\n" +
    "</urlset>\n";

  return deepFreeze({
    SITE_PAGES: SITE_PAGES,
    LEGAL_STATEMENTS: LEGAL_STATEMENTS,
    SOURCES_CONTACT_TEXT: SOURCES_CONTACT_TEXT,
    FOOTER_LINKS: FOOTER_LINKS,
    SITE_PAGE_TEXTS: SITE_PAGE_TEXTS,
    SITE_ORIGIN: SITE_ORIGIN,
    SITE_HOME_SEO: SITE_HOME_SEO,
    SITE_HOME_JSON_LD: SITE_HOME_JSON_LD,
    SITE_NOSCRIPT: SITE_NOSCRIPT,
    ROBOTS_TXT: ROBOTS_TXT,
    SITEMAP_XML: SITEMAP_XML
  });
});
