/*
 * core/dom.js — 安全 DOM 建構（FE-02）
 * 依據：architecture.md §4.1「DOM 寫入」、契約 README §2 C-7
 * 涵蓋：AC-04-04、AC-04-09、AC-24-07
 *
 * 規則：
 * - 文字一律寫入 textContent（或建立 Text 節點），絕不解析 HTML 字串。
 * - 屬性一律 setAttribute；禁止 on* 屬性字串（事件只能經 props.on 以 addEventListener 綁定）。
 * - 連結類屬性禁止 javascript: 等可執行協定。
 * - 全專案禁止使用以字串插入 HTML 的 DOM API 與 document 的寫入 API（FE-18、QA 以 grep 驗證）。
 *
 * 載入時不觸碰 document；所有函式在呼叫時才取用 document（可傳入 doc 供測試注入）。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.EMT = root.EMT || {};
    root.EMT.core = root.EMT.core || {};
    root.EMT.core.dom = api;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";

  // 值會被當成網址解讀的屬性
  var URL_ATTRS = { href: 1, src: 1, action: 1, formaction: 1, "xlink:href": 1, srcdoc: 1 };
  // 可執行的網址協定（去除空白與控制字元後比對）
  var UNSAFE_URL_RE = /^(javascript|vbscript):/i;

  // 可注入的 document（測試用）；未設定時用全域 document
  var injectedDoc = null;

  /** 取得目前使用的 document */
  function getDoc() {
    if (injectedDoc) return injectedDoc;
    if (typeof document !== "undefined") return document;
    throw new Error("[EMT.core.dom] 找不到 document");
  }

  /**
   * 測試用：指定 document 物件；傳 null 還原。
   * @param {Document|null} doc
   */
  function setDocument(doc) {
    injectedDoc = doc || null;
  }

  /**
   * 檢查屬性名稱與值是否安全；不安全時丟出錯誤（屬程式錯誤，開發階段即應發現）。
   * @param {string} name 屬性名稱
   * @param {*} value 屬性值
   * @returns {string} 轉為字串的值
   */
  function checkAttr(name, value) {
    var n = String(name);
    var lower = n.toLowerCase();
    if (!/^[a-zA-Z_:][-a-zA-Z0-9_:.]*$/.test(n)) {
      throw new Error("[EMT.core.dom] 不合法的屬性名稱：" + n);
    }
    if (lower.indexOf("on") === 0) {
      throw new Error("[EMT.core.dom] 禁止以屬性字串綁定事件：" + n + "（請用 props.on）");
    }
    var v = String(value);
    if (URL_ATTRS[lower] === 1) {
      // 去除空白與控制字元後檢查協定，避免「java\tscript:」之類的繞過
      var compact = v.replace(/[\u0000- \u007f]/g, "");
      if (UNSAFE_URL_RE.test(compact) || lower === "srcdoc") {
        throw new Error("[EMT.core.dom] 不安全的屬性值：" + n);
      }
    }
    return v;
  }

  /**
   * 為元素設定屬性（null、undefined、false 略過；true 設為空字串的布林屬性）。
   * @param {Element} node
   * @param {Object<string, *>} attrs
   */
  function setAttrs(node, attrs) {
    if (!attrs) return;
    Object.keys(attrs).forEach(function (name) {
      var value = attrs[name];
      if (value === null || value === undefined || value === false) return;
      node.setAttribute(name, checkAttr(name, value === true ? "" : value));
    });
  }

  /**
   * 綁定事件。
   * @param {Element} node
   * @param {Object<string, Function>} handlers 事件名稱 → 處理函式
   */
  function bindEvents(node, handlers) {
    if (!handlers) return;
    Object.keys(handlers).forEach(function (type) {
      var fn = handlers[type];
      if (typeof fn === "function") node.addEventListener(type, fn);
    });
  }

  /**
   * 附加子節點：字串與數字轉為 Text 節點；null、undefined、false 略過；陣列攤平。
   * @param {Node} parent
   * @param {*} children
   */
  function append(parent, children) {
    if (children === null || children === undefined || children === false) return parent;
    if (Array.isArray(children)) {
      for (var i = 0; i < children.length; i++) append(parent, children[i]);
      return parent;
    }
    if (typeof children === "string" || typeof children === "number") {
      parent.appendChild(getDoc().createTextNode(String(children)));
      return parent;
    }
    if (children && typeof children === "object" && typeof children.nodeType === "number") {
      parent.appendChild(children);
      return parent;
    }
    throw new Error("[EMT.core.dom] 不支援的子節點型別");
  }

  /**
   * 建立 HTML 元素。
   * @param {string} tag 標籤名稱
   * @param {{ text?: *, attrs?: Object, on?: Object, className?: string }} [props]
   *   text → textContent；attrs → setAttribute；on → addEventListener；className → class
   * @param {*} [children] 子節點（字串一律為純文字）
   * @returns {HTMLElement}
   */
  function el(tag, props, children) {
    var node = getDoc().createElement(tag);
    var p = props || {};
    if (p.className) node.className = String(p.className);
    setAttrs(node, p.attrs);
    if (p.text !== undefined && p.text !== null) node.textContent = String(p.text);
    bindEvents(node, p.on);
    append(node, children);
    return node;
  }

  /**
   * 建立 SVG 元素（圖示用）。
   * @param {string} tag SVG 標籤名稱（svg、path、rect…）
   * @param {Object<string, *>} [attrs]
   * @param {*} [children] 子 SVG 節點
   * @returns {SVGElement}
   */
  function svg(tag, attrs, children) {
    var node = getDoc().createElementNS(SVG_NS, tag);
    setAttrs(node, attrs);
    append(node, children);
    return node;
  }

  /**
   * 移除所有子節點。
   * @param {Node} node
   * @returns {Node}
   */
  function clear(node) {
    if (!node) return node;
    while (node.firstChild) node.removeChild(node.firstChild);
    return node;
  }

  /**
   * 以純文字取代節點內容。
   * @param {Node} node
   * @param {*} text
   * @returns {Node}
   */
  function setText(node, text) {
    if (node) node.textContent = text === null || text === undefined ? "" : String(text);
    return node;
  }

  return {
    el: el,
    svg: svg,
    clear: clear,
    setText: setText,
    append: append,
    setAttrs: setAttrs,
    setDocument: setDocument
  };
});
