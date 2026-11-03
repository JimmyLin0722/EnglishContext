/*
 * views/custom-vocab.js — 自訂單字表單、自訂清單（刪除）與領域範本注入（FE-10）
 * 依據：architecture.md §4.2（EMT.views.register，自訂器頁 = customizer + custom-vocab）、§7.2；
 *       契約 CustomVocabItem、DomainTemplate、TemplateWord、README §2 C-7；architecture.md FB-06。
 * 涵蓋：US-04、US-05、US-24；AC-04-01～AC-04-04、AC-04-06、AC-04-07、AC-05-01～AC-05-05、AC-24-07
 *
 * - 掛在 #customizer-custom（自訂器頁內）。
 * - 表單送出呼叫 EMT.store.actions.addCustomWord；刪除呼叫 deleteCustomWord；範本呼叫 injectTemplate。
 *   狀態寫入、去重、容量不足處理、已掌握例外（DF-01）全部由 store 負責，本檔只依回傳值顯示訊息。
 * - 所有資料（使用者輸入、匯入內容、範本）一律經 core/dom.js 以 textContent 寫入（C-7）。
 * - 清單很長時只渲染前 PAGE_SIZE 筆，「顯示更多」每次再加 PAGE_SIZE 筆。
 * - 效能（BUG-002，AC-22-01）：
 *   1. DOM 只建立一次：啟動完成後於閒置時預建（與 customizer.js 同一模式），或第一次 mount，以先到者為準；
 *      store 只訂閱一次。
 *   2. 清單分批掛上：頁面隱藏中或剛顯示時只掛前 FIRST_BATCH 筆，其餘在頁面顯示後於閒置時每次 FILL_BATCH 筆補上，
 *      直到「前 limit 筆」全部掛上，最終 DOM 與一次畫完相同。頁面顯示中的新增、刪除、注入、顯示更多，
 *      已掛上的節點原地保留（以項目物件為鍵重用），最多再同步多掛 FIRST_BATCH 筆，其餘照樣閒置補上。
 *      離開頁面時卸下第 FIRST_BATCH 筆之後的節點（保留於快取），下次切回只需繪製少量節點。
 *   筆數文字、空狀態、「顯示更多」按鈕一律在同一事件內依完整清單更新，不受分批影響。
 *
 * （v0.14，FE-68；契約 README §5.8 HT-6～HT-9、DS-27、DS-28、FB-51；architecture.md v0.9 §7.20.2）
 * - 領域範本區塊（buildTemplates 回傳的 section.card.cv-section，即 HT-6 的「同一個外層容器」）建立時即帶
 *   hidden 與 inert 兩個屬性，之後任何路徑都不改回可見；容器內的標題、說明、按鈕、注入結果與 onTemplate、
 *   injectMessage、templateButtons、templateLabel、TEMPLATE_ORDER 全部保留（HT-8），只是不可觸發。
 * - 畫面文字不得出現「範本」二字（HT-7；隱藏容器內文字豁免）：origin = "template" 的清單項目只顯示「自訂擴充」，
 *   不另顯示領域名稱（FB-51 由 SD 定案）；自訂清單空狀態改為 EMPTY_TEXT（DS-27 定案文字）。
 *   已注入的範本單字照原值保留、照常顯示與刪除（HT-9），本檔不需特別處理。
 *
 * 純邏輯（訊息文字、欄位錯誤文字、清單截取、分批筆數）另以 module.exports 匯出供 Node 測試；
 * 瀏覽器下載入時只做登錄與 load 事件登記，不讀取 document、不操作 DOM（LD-2）。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    var EMT = (root.EMT = root.EMT || {});
    if (EMT.views && typeof EMT.views.register === "function") {
      EMT.views.register("customizer", api.createView(EMT, root));
    }
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /** 清單一次渲染的筆數 */
  var PAGE_SIZE = 200;

  /** 清單同步掛上的筆數上限（首次顯示、或顯示中資料變動時新增掛上的筆數，BUG-002） */
  var FIRST_BATCH = 20;

  /** 閒置時每次補掛的筆數（BUG-002） */
  var FILL_BATCH = 30;

  /** 自訂字標記文字（AC-04-02） */
  var CUSTOM_BADGE = "自訂擴充";

  /** 自訂清單空狀態文字（v0.14 DS-27 定案；仍引導使用表單，不提及已隱藏的功能，HT-7 (a)） */
  var EMPTY_TEXT = "尚未新增自訂單字。可用上方表單新增。";

  /** 範本按鈕順序與預設名稱（AC-05-01）；名稱優先使用 DOMAIN_TEMPLATES 的 label */
  var TEMPLATE_ORDER = [
    { id: "cs", label: "資工" },
    { id: "business", label: "商管" },
    { id: "biostat", label: "生醫統計" }
  ];

  /**
   * 表單欄位定義（AC-04-01；論文例句存入 example，FB-06）。
   * multiline 為 true 時使用 textarea。
   */
  var FIELDS = [
    { key: "word", label: "英文單字", required: true, multiline: false, lang: "en" },
    { key: "meaning", label: "中文釋義", required: true, multiline: false, lang: null },
    { key: "phonetic", label: "音標", required: false, multiline: false, lang: null },
    { key: "pos", label: "詞性", required: false, multiline: false, lang: null },
    { key: "collocation", label: "搭配詞", required: false, multiline: false, lang: "en" },
    { key: "example", label: "論文例句", required: false, multiline: true, lang: "en" }
  ];

  /** 欄位錯誤代碼 → 提示文字（代碼由 EMT.core.custom 定義） */
  var FIELD_ERROR_TEXT = {
    required: "此欄位為必填，請輸入內容"
  };

  var MSG_DUPLICATE = "單字已存在";
  var MSG_QUOTA = "儲存空間不足";
  var MSG_UNKNOWN = "新增失敗，請再試一次";
  var MSG_TEMPLATE_MISSING = "範本資料缺漏，無法注入";

  // ── 純函式 ──

  /**
   * 欄位錯誤代碼轉提示文字。
   * @param {string} code
   * @returns {string}
   */
  function fieldErrorText(code) {
    if (Object.prototype.hasOwnProperty.call(FIELD_ERROR_TEXT, code)) return FIELD_ERROR_TEXT[code];
    return "此欄位內容不正確";
  }

  /**
   * 範本注入結果訊息（AC-05-02、AC-05-04、AC-18-04）。
   * 容量不足（reason "quota"）只回「儲存空間不足」，不回注入數（architecture §12.2 R3-3）。
   * @param {{ injected: number, reason?: string }} result injectTemplate 的回傳值
   * @returns {string}
   */
  function injectMessage(result) {
    if (result && result.reason === "quota") return MSG_QUOTA;
    var n = result && typeof result.injected === "number" && isFinite(result.injected) && result.injected > 0
      ? Math.floor(result.injected) : 0;
    return n > 0 ? "已注入 " + n + " 個單字" : "已注入 0 個單字（皆已存在）";
  }

  /**
   * addCustomWord 失敗結果 → 表單層級訊息與欄位錯誤。
   * @param {object} result addCustomWord 的回傳值
   * @returns {{ fieldErrors: Object<string,string>, message: string }} fieldErrors 為欄位 → 提示文字
   */
  function addFailureView(result) {
    var r = result || {};
    var out = { fieldErrors: {}, message: "" };
    if (r.fieldErrors && typeof r.fieldErrors === "object") {
      Object.keys(r.fieldErrors).forEach(function (k) {
        out.fieldErrors[k] = fieldErrorText(r.fieldErrors[k]);
      });
      return out;
    }
    if (r.reason === "duplicate") {
      // 重複屬於英文單字欄位的錯誤（AC-04-06）
      out.fieldErrors.word = MSG_DUPLICATE;
      return out;
    }
    out.message = r.reason === "quota" ? MSG_QUOTA : MSG_UNKNOWN;
    return out;
  }

  /**
   * 清單截取：只取前 limit 筆（limit 至少 PAGE_SIZE）。
   * @param {Array} list
   * @param {number} limit
   * @returns {{ items: Array, total: number, hasMore: boolean }}
   */
  function visibleSlice(list, limit) {
    var arr = Array.isArray(list) ? list : [];
    var n = typeof limit === "number" && isFinite(limit) && limit > 0 ? Math.floor(limit) : PAGE_SIZE;
    return { items: arr.slice(0, n), total: arr.length, hasMore: arr.length > n };
  }

  /**
   * 清單本次要同步掛上的筆數（BUG-002）。
   * - 頁面隱藏中（預建）：只掛前 FIRST_BATCH 筆。
   * - 頁面顯示中：保留已掛上的筆數，最多再多掛 FIRST_BATCH 筆（新增、注入、顯示更多立即可見）。
   * 其餘由 fillCount 於閒置時補上。
   * @param {number} total 應顯示的總筆數（visibleSlice 的 items 長度）
   * @param {number} attached 目前已掛上的筆數
   * @param {boolean} visible 頁面是否顯示中
   * @returns {number} 0～total
   */
  function syncCount(total, attached, visible) {
    var t = typeof total === "number" && total > 0 ? Math.floor(total) : 0;
    var a = typeof attached === "number" && attached > 0 ? Math.floor(attached) : 0;
    return Math.min(t, visible ? a + FIRST_BATCH : FIRST_BATCH);
  }

  /**
   * 閒置補掛一次後的筆數（BUG-002）。
   * @param {number} total 應顯示的總筆數
   * @param {number} attached 目前已掛上的筆數
   * @returns {number} 0～total
   */
  function fillCount(total, attached) {
    var t = typeof total === "number" && total > 0 ? Math.floor(total) : 0;
    var a = typeof attached === "number" && attached > 0 ? Math.floor(attached) : 0;
    return Math.min(t, a + FILL_BATCH);
  }

  /**
   * 範本按鈕資料：固定 3 個（cs、business、biostat），名稱取自 DOMAIN_TEMPLATES 的 label；
   * 資料缺漏的範本 available = false（按鈕停用）。
   * @param {Array} templates EMT.content.templates
   * @returns {Array<{ id: string, label: string, available: boolean }>}
   */
  function templateButtons(templates) {
    var list = Array.isArray(templates) ? templates : [];
    return TEMPLATE_ORDER.map(function (t) {
      var found = null;
      for (var i = 0; i < list.length; i++) {
        if (list[i] && list[i].id === t.id) { found = list[i]; break; }
      }
      var label = found && typeof found.label === "string" && found.label.trim() !== "" ? found.label.trim() : t.label;
      return { id: t.id, label: label, available: !!(found && Array.isArray(found.words) && found.words.length > 0) };
    });
  }

  /** 範本代碼 → 名稱（v0.14 起清單不再顯示來源名稱，FB-51；保留供日後開放，HT-8） */
  function templateLabel(buttons, id) {
    for (var i = 0; i < buttons.length; i++) {
      if (buttons[i].id === id) return buttons[i].label;
    }
    return "";
  }

  /** 安全轉字串（非字串顯示空字串） */
  function s(x) {
    return typeof x === "string" ? x : "";
  }

  // ── 畫面 ──

  /**
   * 建立頁面模組。
   * @param {object} EMT 全域命名空間
   * @param {object} [root] 全域物件（window）；提供 document、load 事件與閒置排程。測試可傳入假的 root
   * @returns {{ mount: Function, show: Function, hide: Function }}
   */
  function createView(EMT, root) {
    var win = root || {};
    var host = null;          // #customizer-custom
    var built = false;        // DOM 是否已建立（只建立一次）
    var unsubscribe = null;   // store 訂閱（只訂閱一次）
    var items = [];           // 應顯示的項目（前 limit 筆，略過空值）
    var attached = [];        // 目前掛在 listEl 的項目（依序，為 items 的前綴）
    var nodeOf = new Map();   // 項目物件 → li（重用已建立的節點）
    var fillPending = false;  // 是否已排入閒置補掛
    var revealToken = 0;      // 延後顯示的序號（離開頁面或再次顯示時作廢舊的回呼）
    var inputs = {};          // key → input／textarea
    var errorNodes = {};      // key → 錯誤提示元素
    var formMsg = null;       // 表單層級訊息
    var tplStatus = null;     // 範本注入結果
    var listEl = null;        // 清單 ul
    var countEl = null;       // 筆數
    var moreBtn = null;       // 顯示更多
    var emptyEl = null;       // 空狀態
    var buttons = [];         // 範本按鈕資料
    var limit = PAGE_SIZE;
    var lastList = null;      // 上次渲染的 customVocab 參照（未變則不重建）
    var visible = false;
    var dirty = true;         // 隱藏期間資料變動 → 顯示時再渲染

    function dom() { return EMT.core.dom; }
    function store() { return EMT.store; }

    /** 取目前自訂清單 */
    function currentList() {
      var st = store();
      if (!st || typeof st.getState !== "function") return [];
      var state = st.getState();
      var cv = state && state.data && state.data.customVocab;
      return Array.isArray(cv) ? cv : [];
    }

    function toast(text, kind) {
      if (EMT.ui && EMT.ui.toast && typeof EMT.ui.toast.show === "function") {
        EMT.ui.toast.show(text, { kind: kind || "info" });
      }
    }

    // ── 表單 ──

    function setFieldError(key, text) {
      var node = errorNodes[key];
      var input = inputs[key];
      if (!node || !input) return;
      dom().setText(node, text || "");
      node.hidden = !text;
      if (text) input.setAttribute("aria-invalid", "true");
      else input.removeAttribute("aria-invalid");
    }

    function clearErrors() {
      FIELDS.forEach(function (f) { setFieldError(f.key, ""); });
      dom().setText(formMsg, "");
      formMsg.hidden = true;
    }

    function readForm() {
      var out = {};
      FIELDS.forEach(function (f) { out[f.key] = inputs[f.key] ? inputs[f.key].value : ""; });
      return out;
    }

    function resetForm() {
      FIELDS.forEach(function (f) { if (inputs[f.key]) inputs[f.key].value = ""; });
    }

    function onSubmit(ev) {
      if (ev && typeof ev.preventDefault === "function") ev.preventDefault();
      clearErrors();
      var st = store();
      if (!st || !st.actions || typeof st.actions.addCustomWord !== "function") {
        dom().setText(formMsg, MSG_UNKNOWN);
        formMsg.hidden = false;
        return;
      }
      var r = st.actions.addCustomWord(readForm());
      if (r && r.ok) {
        resetForm();
        toast("已新增「" + s(r.item && r.item.word) + "」", "success");
        if (inputs.word) inputs.word.focus();
        return;
      }
      var v = addFailureView(r);
      var firstBad = null;
      FIELDS.forEach(function (f) {
        if (v.fieldErrors[f.key]) {
          setFieldError(f.key, v.fieldErrors[f.key]);
          if (!firstBad) firstBad = inputs[f.key];
        }
      });
      if (v.message) {
        dom().setText(formMsg, v.message);
        formMsg.hidden = false;
      }
      if (firstBad) firstBad.focus();
    }

    function buildField(f) {
      var d = dom();
      var id = "cv-" + f.key;
      var errId = id + "-error";
      var attrs = { id: id, name: f.key, autocomplete: "off", "aria-describedby": errId };
      if (f.required) attrs["aria-required"] = "true";
      if (f.lang) attrs.lang = f.lang;
      if (f.key === "word") { attrs.autocapitalize = "off"; attrs.spellcheck = "false"; }
      var input;
      if (f.multiline) {
        input = d.el("textarea", { attrs: Object.assign({ rows: "3" }, attrs) });
      } else {
        input = d.el("input", { attrs: Object.assign({ type: "text" }, attrs) });
      }
      inputs[f.key] = input;
      var err = d.el("p", { className: "field__error", attrs: { id: errId } });
      err.hidden = true;
      errorNodes[f.key] = err;
      var label = d.el("label", { className: "field__label", attrs: { "for": id } }, [
        f.label,
        d.el("span", { className: "cv-form__hint", text: f.required ? "（必填）" : "（選填）" })
      ]);
      return d.el("div", { className: "field cv-form__field cv-form__field--" + f.key }, [label, input, err]);
    }

    function buildForm() {
      var d = dom();
      formMsg = d.el("p", { className: "cv-form__message", attrs: { role: "alert" } });
      formMsg.hidden = true;
      var form = d.el("form", {
        className: "cv-form",
        attrs: { novalidate: true, "aria-label": "新增自訂單字" },
        on: { submit: onSubmit }
      }, [
        d.el("div", { className: "cv-form__grid" }, FIELDS.map(buildField)),
        formMsg,
        d.el("div", { className: "btn-row" }, [
          d.el("button", { className: "btn btn--primary", attrs: { type: "submit" }, text: "新增單字" })
        ])
      ]);
      return d.el("section", { className: "card cv-section", attrs: { "aria-labelledby": "cv-form-title" } }, [
        d.el("h2", { className: "cv-section__title", attrs: { id: "cv-form-title" }, text: "新增自訂單字" }),
        form
      ]);
    }

    // ── 範本 ──

    function onTemplate(id) {
      var st = store();
      if (!st || !st.actions || typeof st.actions.injectTemplate !== "function") return;
      var r = st.actions.injectTemplate(id);
      if (r && r.reason === "quota") {
        // 容量不足：store 已回滾，只以 toast 顯示「儲存空間不足」，不顯示注入數（R3-3、AC-18-04）
        tplStatus.hidden = true;
        dom().setText(tplStatus, "");
        toast(injectMessage(r), "error");
        return;
      }
      dom().setText(tplStatus, injectMessage(r));
      tplStatus.hidden = false;
    }

    function buildTemplates() {
      var d = dom();
      buttons = templateButtons(EMT.content && EMT.content.templates);
      var anyMissing = false;
      var btns = buttons.map(function (b) {
        if (!b.available) anyMissing = true;
        return d.el("button", {
          className: "btn btn--secondary cv-templates__btn",
          attrs: { type: "button", "data-template": b.id, disabled: !b.available },
          text: b.label,
          on: { click: function () { onTemplate(b.id); } }
        });
      });
      tplStatus = d.el("p", { className: "cv-templates__status", attrs: { role: "status", "aria-live": "polite" } });
      tplStatus.hidden = true;
      // （v0.14，HT-6）外層容器同時帶 hidden 與 inert：不渲染、不可聚焦、不可觸發；之後任何路徑都不改回可見
      return d.el("section", {
        className: "card cv-section",
        attrs: { "aria-labelledby": "cv-tpl-title", hidden: true, inert: "" }
      }, [
        d.el("h2", { className: "cv-section__title", attrs: { id: "cv-tpl-title" }, text: "領域範本" }),
        d.el("p", { className: "cv-section__desc", text: "一鍵加入領域常用單字，已存在的字會自動略過。" }),
        d.el("div", { className: "btn-row cv-templates" }, btns),
        anyMissing ? d.el("p", { className: "cv-section__desc", text: MSG_TEMPLATE_MISSING }) : null,
        tplStatus
      ]);
    }

    // ── 清單 ──

    function onDelete(item) {
      var st = store();
      if (!st || !st.actions || typeof st.actions.deleteCustomWord !== "function") return;
      var r = st.actions.deleteCustomWord(item.id);
      if (r && r.ok) toast("已刪除「" + s(item.word) + "」", "info");
    }

    function buildItem(item) {
      var d = dom();
      // （v0.14，HT-7 (b)、FB-51）origin = "template" 的項目與表單新增的字相同，只標「自訂擴充」
      var meta = [d.el("span", { className: "cv-badge", text: CUSTOM_BADGE })];
      var main = d.el("div", { className: "cv-item__main" }, [
        d.el("div", { className: "cv-item__head" }, [
          d.el("span", { className: "cv-item__word", attrs: { lang: "en" }, text: s(item.word) }),
          s(item.phonetic) ? d.el("span", { className: "cv-item__phonetic ipa", text: s(item.phonetic) }) : null,
          s(item.pos) ? d.el("span", { className: "cv-item__pos", text: s(item.pos) }) : null
        ]),
        d.el("div", { className: "cv-item__meaning", text: s(item.meaning) }),
        d.el("div", { className: "cv-item__meta" }, meta)
      ]);
      var del = d.el("button", {
        className: "btn btn--secondary cv-item__delete",
        attrs: { type: "button", "aria-label": "刪除 " + s(item.word) },
        text: "刪除",
        on: { click: function () { onDelete(item); } }
      });
      return d.el("li", { className: "cv-item" }, [main, del]);
    }

    /** 取得項目的 li（已建立過就重用） */
    function nodeFor(item) {
      var n = nodeOf.get(item);
      if (!n) {
        n = buildItem(item);
        nodeOf.set(item, n);
      }
      return n;
    }

    /**
     * 讓 listEl 的子節點恰為 items 的前 n 筆（BUG-002）。
     * 先卸下不在前 n 筆的節點，再依序對齊；已在正確位置的節點原地不動，尾端只做附加。
     * 卸下的節點仍留在 nodeOf，之後再掛上時不必重建。
     * @param {number} n
     */
    function attachPrefix(n) {
      var want = items.slice(0, n);
      var keep = new Set(want);
      for (var i = 0; i < attached.length; i++) {
        if (keep.has(attached[i])) continue;
        var old = nodeOf.get(attached[i]);
        if (old && old.parentNode === listEl) listEl.removeChild(old);
      }
      var cur = listEl.firstChild;
      for (var j = 0; j < want.length; j++) {
        var node = nodeFor(want[j]);
        if (cur === node) {
          cur = cur.nextSibling;
        } else if (cur) {
          listEl.insertBefore(node, cur);
        } else {
          listEl.appendChild(node);
        }
      }
      // 不屬於清單的殘留節點（正常不會發生）一併移除，確保子節點與 want 完全一致
      while (cur) {
        var next = cur.nextSibling;
        listEl.removeChild(cur);
        cur = next;
      }
      attached = want;
    }

    /** 閒置排程：優先 requestIdleCallback，否則 setTimeout；都沒有時直接執行 */
    function idle(fn) {
      if (typeof win.requestIdleCallback === "function") win.requestIdleCallback(fn, { timeout: 500 });
      else if (typeof win.setTimeout === "function") win.setTimeout(fn, 16);
      else fn();
    }

    /** 頁面顯示中且尚未補齊時，排入下一次閒置補掛 */
    function scheduleFill() {
      if (fillPending || !visible || !listEl || attached.length >= items.length) return;
      fillPending = true;
      idle(fillStep);
    }

    /** 閒置補掛一批；頁面已隱藏則停止（下次顯示再繼續） */
    function fillStep() {
      fillPending = false;
      if (!visible || !listEl) return;
      attachPrefix(fillCount(items.length, attached.length));
      scheduleFill();
    }

    function renderList(force) {
      if (!listEl) return;
      var list = currentList();
      if (!force && list === lastList) return;
      lastList = list;
      var d = dom();
      var view = visibleSlice(list, limit);
      items = view.items.filter(function (it) { return !!it; });
      attachPrefix(syncCount(items.length, attached.length, visible));
      // 快取只保留仍在前 limit 筆中的項目（已刪除或超出範圍的節點釋放）
      var kept = new Map();
      items.forEach(function (it) {
        var n = nodeOf.get(it);
        if (n) kept.set(it, n);
      });
      nodeOf = kept;
      scheduleFill();
      d.setText(countEl, view.total > view.items.length
        ? "共 " + view.total + " 個自訂單字（顯示前 " + view.items.length + " 個）"
        : "共 " + view.total + " 個自訂單字");
      emptyEl.hidden = view.total > 0;
      listEl.hidden = view.total === 0;
      moreBtn.hidden = !view.hasMore;
    }

    function buildList() {
      var d = dom();
      countEl = d.el("p", { className: "cv-list__count", attrs: { "aria-live": "polite" } });
      emptyEl = d.el("p", { className: "cv-list__empty", text: EMPTY_TEXT });
      listEl = d.el("ul", { className: "cv-list", attrs: { "aria-label": "自訂單字清單" } });
      moreBtn = d.el("button", {
        className: "btn btn--secondary cv-list__more",
        attrs: { type: "button" },
        text: "顯示更多",
        on: { click: function () { limit += PAGE_SIZE; renderList(true); } }
      });
      moreBtn.hidden = true;
      return d.el("section", { className: "card cv-section", attrs: { "aria-labelledby": "cv-list-title" } }, [
        d.el("h2", { className: "cv-section__title", attrs: { id: "cv-list-title" }, text: "自訂單字清單" }),
        countEl, emptyEl, listEl, moreBtn
      ]);
    }

    // ── 生命週期 ──

    /** store 通知：只處理自訂清單變動；隱藏中只標記，顯示時再渲染 */
    function onStoreChange(state, tags) {
      if (!Array.isArray(tags) || tags.indexOf("customVocab") === -1) return;
      if (visible) renderList(false);
      else dirty = true;
    }

    /**
     * 建立頁面並訂閱 store（只執行一次；已建立時直接回傳）。
     * mount 與閒置預建共用，兩者誰先執行都得到相同的 DOM 與狀態。
     * @param {Element|null} sectionEl
     * @returns {boolean} 是否已建立
     */
    function ensureBuilt(sectionEl) {
      if (built) return true;
      var doc = win.document;
      host = (doc && typeof doc.getElementById === "function" && doc.getElementById("customizer-custom")) || sectionEl || null;
      if (!host || !EMT.core || !EMT.core.dom) return false;
      var d = dom();
      d.clear(host);
      d.append(host, [buildForm(), buildTemplates(), buildList()]);
      built = true;
      renderList(true);
      dirty = false;
      var st = store();
      if (!unsubscribe && st && typeof st.subscribe === "function") {
        unsubscribe = st.subscribe(onStoreChange) || true;
      }
      return true;
    }

    /**
     * 閒置預建（BUG-002，AC-22-01）：啟動完成（data-ready）後於瀏覽器閒置時先建立 DOM（清單只掛前 FIRST_BATCH 筆），
     * 第一次切到自訂器時不必在點擊事件內建立。頁面仍為 hidden，不觸發排版。
     * 使用者若在閒置前就切過來，由 mount 照常建立，預建自動略過。
     * 載入時只登錄 load 事件，不讀取 document（LD-2）；document 留到閒置回呼內才取用。
     */
    function schedulePrebuild() {
      if (typeof win.addEventListener !== "function") return;
      var tries = 0;
      function later(fn) {
        if (typeof win.requestIdleCallback === "function") win.requestIdleCallback(fn, { timeout: 1000 });
        else if (typeof win.setTimeout === "function") win.setTimeout(fn, 200);
      }
      function run() {
        if (built) return;
        var doc = win.document;
        // 啟動流程尚未完成（data-ready 未設定、store 未建立）時稍後再試，最多 20 次
        if (!doc || !doc.documentElement || doc.documentElement.getAttribute("data-ready") !== "1" || !store()) {
          if (++tries <= 20) later(run);
          return;
        }
        try { ensureBuilt(null); } catch (e) {
          if (win.console) win.console.error("[EMT.custom-vocab] 預建失敗", e);
        }
      }
      win.addEventListener("load", function () { later(run); });
    }

    schedulePrebuild();

    function mount(sectionEl) {
      ensureBuilt(sectionEl);
    }

    /**
     * 切到本頁的第一個畫格先不繪製本區（BUG-002，AC-22-01）：
     * 本區位於目標設定區下方（1366×900 時頂端約 1017px，在首屏之外），卻佔自訂器頁約六成的版面物件。
     * 顯示時先設 host.hidden，等第一個畫格繪製完成後的下一個畫格才顯示，
     * 讓點擊後的第一次繪製只需處理首屏的目標設定區。內容與事件不變，只延後一個畫格出現。
     * 沒有 requestAnimationFrame 的環境（Node 測試）不延後。
     */
    function deferReveal() {
      if (!host || typeof win.requestAnimationFrame !== "function") return;
      var token = ++revealToken;
      host.hidden = true;
      win.requestAnimationFrame(function () {
        // 第 1 個回呼在第一個畫格的排版之前執行；再排一次，於下一個畫格才顯示
        win.requestAnimationFrame(function () {
          if (token === revealToken && visible) host.hidden = false;
        });
      });
    }

    /** 取消尚未完成的延後顯示並恢復 host（頁面隱藏中恢復不會觸發排版） */
    function cancelReveal() {
      revealToken++;
      if (host && host.hidden) host.hidden = false;
    }

    function show() {
      if (!built) {
        visible = true;
        return;
      }
      // 先以「隱藏中」規則渲染（只同步掛前 FIRST_BATCH 筆），顯示後其餘交給閒置補掛
      if (dirty) {
        dirty = false;
        renderList(false);
      }
      visible = true;
      deferReveal();
      scheduleFill();
    }

    function hide() {
      visible = false;
      cancelReveal();
      // 卸下第 FIRST_BATCH 筆之後的節點（保留於快取），下次切回只需繪製少量節點
      if (listEl && attached.length > FIRST_BATCH) attachPrefix(FIRST_BATCH);
    }

    return { mount: mount, show: show, hide: hide };
  }

  return {
    PAGE_SIZE: PAGE_SIZE,
    FIRST_BATCH: FIRST_BATCH,
    FILL_BATCH: FILL_BATCH,
    syncCount: syncCount,
    fillCount: fillCount,
    CUSTOM_BADGE: CUSTOM_BADGE,
    EMPTY_TEXT: EMPTY_TEXT,
    FIELDS: FIELDS,
    fieldErrorText: fieldErrorText,
    injectMessage: injectMessage,
    addFailureView: addFailureView,
    visibleSlice: visibleSlice,
    templateButtons: templateButtons,
    createView: createView
  };
});
