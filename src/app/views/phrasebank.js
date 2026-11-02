/*
 * views/phrasebank.js — 學術句型庫頁（FE-16）
 * 依據：architecture.md §4.1、§4.2、§4.3（setPhraseCategory／setPhraseKeyword）、§7.6「句型搜尋」「剪貼簿」；
 *       契約 data-schema.ts PhraseTemplate、PhraseCategory、PHRASE_CATEGORY_LABELS、RuntimeState.phrasebank
 * 涵蓋：AC-15-01～AC-15-03、AC-16-01～AC-16-04
 *
 * 行為：
 * - 分類篩選 5 個按鈕，文字逐字取 PHRASE_CATEGORY_LABELS（全部、研究空白 Gap、研究目的 Aim、研究結果 Findings、研究限制 Limitations）。
 * - 搜尋框：input 事件同步過濾（不做延遲合併），以預先算好的小寫 haystack（template + "\n" + descriptionZh）
 *   不分大小寫比對，且與分類條件同時成立；無結果顯示「找不到符合的句型」。
 * - 每則顯示 template、descriptionZh、exampleEn（有值時）與「複製」按鈕；複製內容 = template 原文。
 * - 複製成功 toast「已複製」；失敗 toast「複製失敗，請手動選取」並反白該則 template 文字。
 * - 分批建立句型節點（BUG-002、AC-22-01）：mount 時只同步建立首屏 FIRST_BATCH 則，其餘於本頁顯示中的閒置時
 *   （requestIdleCallback，不支援時改用計時器）依原順序分批補上；補上的節點依「目前」篩選條件設定 hidden。
 *   套用非預設條件（分類非「全部」或有關鍵字）時，只同步建立「符合條件但尚未建立」的節點（依原始索引插入正確位置），
 *   可見結果與一次建好完全相同；其餘節點仍由閒置工作依序補上（BUG-002 第 2 輪：避免第一次按鍵同步建立全部節點）。
 *   筆數與「找不到」判斷一律以完整索引計算，不受補齊進度影響。篩選只切換 hidden（100 則線性比對）。
 * - content-visibility（class pb-item--cv，content-visibility: auto）：
 *   首屏節點實際排版過一次後，閒置時以實測高度設定 contain-intrinsic-size 再啟用；
 *   首屏之後的節點（閒置補上或篩選時同步建立）建立時即啟用，contain-intrinsic-size 為「auto <已實測平均高度>px」，
 *   視窗外的新卡片不做樣式計算與排版（BUG-002 第 2 輪：避免閒置補卡片的排版成本落在下一次按鍵的繪製中）；
 *   卡片實際繪製過一次後，瀏覽器以 auto 記住實際高度。再次進入本頁或清單恢復顯示時只排版視窗內的卡片。
 * - 篩選條件存於 store 的 runtime.phrasebank；store 不存在時改用本頁區域狀態。
 *
 * 純邏輯（buildIndex、normalizeKeyword、filterIndex、countMatches、isDefaultFilter、missingMatches）可在 Node 下 require 測試；瀏覽器下只登錄頁面模組。
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === "object" && module.exports) {
    module.exports = api.logic;
  } else {
    var EMT = (root.EMT = root.EMT || {});
    if (EMT.views && typeof EMT.views.register === "function") {
      EMT.views.register("phrasebank", api.view);
    }
  }
})(typeof self !== "undefined" ? self : this, function (root) {
  "use strict";

  // 契約 PhraseCategory 與篩選項順序（"all" 為「全部」）
  var CATEGORIES = ["gap", "aim", "findings", "limitations"];
  var FILTERS = ["all"].concat(CATEGORIES);

  // 契約 PHRASE_CATEGORY_LABELS 的備援複本（EMT.core.constants 不存在時使用；內容須與契約逐字相同）
  var FALLBACK_LABELS = {
    all: "全部",
    gap: "研究空白 Gap",
    aim: "研究目的 Aim",
    findings: "研究結果 Findings",
    limitations: "研究限制 Limitations"
  };

  // 畫面文案（AC 原文逐字）
  var MSG_NO_RESULT = "找不到符合的句型"; // AC-16-02
  var MSG_COPIED = "已複製"; // AC-16-03
  var MSG_COPY_FAILED = "複製失敗，請手動選取"; // AC-16-04
  var MSG_NO_DATA = "目前沒有句型資料";

  // ── 純邏輯 ─────────────────────────────────────────────

  /** 是否為非空字串 */
  function isNonEmptyString(x) {
    return typeof x === "string" && x.trim() !== "";
  }

  /**
   * 建立搜尋索引：略過不合契約的項目（C-6 容錯），預先算小寫 haystack。
   * @param {Array<object>} phrases PhraseTemplate 陣列（非陣列視為空）
   * @returns {Array<{ phrase: object, category: string, haystack: string }>} 依原順序
   */
  function buildIndex(phrases) {
    var out = [];
    if (!Array.isArray(phrases)) return out;
    for (var i = 0; i < phrases.length; i++) {
      var p = phrases[i];
      if (!p || typeof p !== "object") continue;
      if (CATEGORIES.indexOf(p.category) === -1 || !isNonEmptyString(p.template)) continue;
      var desc = typeof p.descriptionZh === "string" ? p.descriptionZh : "";
      out.push({
        phrase: p,
        category: p.category,
        haystack: (p.template + "\n" + desc).toLowerCase()
      });
    }
    return out;
  }

  /**
   * 正規化關鍵字：轉字串、去頭尾空白、轉小寫。
   * @param {*} keyword
   * @returns {string}
   */
  function normalizeKeyword(keyword) {
    return typeof keyword === "string" ? keyword.trim().toLowerCase() : "";
  }

  /**
   * 判斷單一索引項是否符合條件（分類與關鍵字同時成立）。
   * @param {{ category: string, haystack: string }} entry
   * @param {string} category "all" 或 PhraseCategory；不合法視為 "all"
   * @param {string} kw 已正規化的關鍵字（空字串 = 不限）
   * @returns {boolean}
   */
  function matches(entry, category, kw) {
    if (category !== "all" && CATEGORIES.indexOf(category) !== -1 && entry.category !== category) return false;
    return kw === "" || entry.haystack.indexOf(kw) !== -1;
  }

  /**
   * 篩選：分類條件與關鍵字條件同時成立（AC-15-02、AC-16-01）。
   * @param {Array} index buildIndex 的結果
   * @param {string} category "all" 或 PhraseCategory
   * @param {string} keyword 關鍵字原文（內部正規化）
   * @returns {Array} 符合的索引項（維持原順序）
   */
  function filterIndex(index, category, keyword) {
    var kw = normalizeKeyword(keyword);
    var out = [];
    if (!Array.isArray(index)) return out;
    for (var i = 0; i < index.length; i++) {
      if (matches(index[i], category, kw)) out.push(index[i]);
    }
    return out;
  }

  /**
   * 計算符合條件的筆數（筆數顯示與「找不到」判斷用，與 filterIndex(...).length 相同）。
   * @param {Array} index buildIndex 的結果
   * @param {string} category
   * @param {string} keyword 關鍵字原文（內部正規化）
   * @returns {number}
   */
  function countMatches(index, category, keyword) {
    var kw = normalizeKeyword(keyword);
    var n = 0;
    if (!Array.isArray(index)) return 0;
    for (var i = 0; i < index.length; i++) {
      if (matches(index[i], category, kw)) n++;
    }
    return n;
  }

  /**
   * 是否為預設條件（「全部」且無關鍵字）；非預設條件須先同步建立所有符合條件的節點再篩選。
   * @param {string} category
   * @param {string} keyword
   * @returns {boolean}
   */
  function isDefaultFilter(category, keyword) {
    return (category === "all" || CATEGORIES.indexOf(category) === -1) && normalizeKeyword(keyword) === "";
  }

  /**
   * 列出「符合條件但尚未建立」的索引位置（非預設條件時同步建立用；BUG-002 第 2 輪）。
   * @param {Array} index buildIndex 的結果
   * @param {Array} built 與 index 等長（可較短）的陣列，已建立的位置為真值
   * @param {string} category
   * @param {string} keyword 關鍵字原文（內部正規化）
   * @returns {number[]} 遞增排列的索引位置
   */
  function missingMatches(index, built, category, keyword) {
    var kw = normalizeKeyword(keyword);
    var out = [];
    if (!Array.isArray(index)) return out;
    for (var i = 0; i < index.length; i++) {
      if (built && built[i]) continue;
      if (matches(index[i], category, kw)) out.push(i);
    }
    return out;
  }

  // 分批參數：首屏同步建立的筆數、閒置時每批上限
  var FIRST_BATCH = 12;
  var IDLE_BATCH = 16; // 首屏之後的節點建立時即啟用 content-visibility，視窗外不排版，每批可較大
  // 尚無實測高度時的卡片估計高度（與 60-phrasebank.css .pb-item--cv 的預設值相同）
  var DEFAULT_CARD_HEIGHT = 220;

  var logic = {
    CATEGORIES: CATEGORIES.slice(),
    FILTERS: FILTERS.slice(),
    MSG_NO_RESULT: MSG_NO_RESULT,
    MSG_COPIED: MSG_COPIED,
    MSG_COPY_FAILED: MSG_COPY_FAILED,
    buildIndex: buildIndex,
    normalizeKeyword: normalizeKeyword,
    matches: matches,
    filterIndex: filterIndex,
    countMatches: countMatches,
    isDefaultFilter: isDefaultFilter,
    missingMatches: missingMatches,
    FIRST_BATCH: FIRST_BATCH,
    IDLE_BATCH: IDLE_BATCH
  };

  // ── 頁面模組（瀏覽器） ─────────────────────────────────

  function EMT() {
    return (root && root.EMT) || {};
  }

  /** 取得類別標籤表 */
  function labels() {
    var C = EMT().core && EMT().core.constants;
    return (C && C.PHRASE_CATEGORY_LABELS) || FALLBACK_LABELS;
  }

  /** 取得句型資料（EMT.content 不存在時為空） */
  function loadPhrases() {
    try {
      // EMT.content.phrases：唯讀 getter，回傳最近一次 load() 的結果（FE-04）
      var c = EMT().content;
      if (c && Array.isArray(c.phrases)) return c.phrases;
    } catch (e) {
      if (typeof console !== "undefined") console.error("[EMT.views.phrasebank] 讀取句型失敗", e);
    }
    return [];
  }

  /** 取得 store（不存在回 null） */
  function getStore() {
    var s = EMT().store;
    return s && typeof s.getState === "function" ? s : null;
  }

  /** 目前篩選條件：優先讀 store，否則用區域狀態 */
  var localFilter = { category: "all", keyword: "" };
  function currentFilter() {
    var s = getStore();
    if (s) {
      try {
        var pb = s.getState().runtime.phrasebank;
        if (pb && typeof pb === "object") {
          return {
            category: FILTERS.indexOf(pb.category) !== -1 ? pb.category : "all",
            keyword: typeof pb.keyword === "string" ? pb.keyword : ""
          };
        }
      } catch (e) {
        if (typeof console !== "undefined") console.error("[EMT.views.phrasebank] 讀取狀態失敗", e);
      }
    }
    return localFilter;
  }

  /** 設定分類 */
  function setCategory(c) {
    var s = getStore();
    if (s && s.actions && typeof s.actions.setPhraseCategory === "function") {
      s.actions.setPhraseCategory(c);
    }
    localFilter = { category: c, keyword: localFilter.keyword };
  }

  /** 設定關鍵字 */
  function setKeyword(k) {
    var s = getStore();
    if (s && s.actions && typeof s.actions.setPhraseKeyword === "function") {
      s.actions.setPhraseKeyword(k);
    }
    localFilter = { category: localFilter.category, keyword: k };
  }

  // DOM 參照與狀態
  // ui.index 為完整索引；ui.items 與 ui.index 等長，ui.items[i] 為第 i 則已建立的節點（未建立為 null）；
  // ui.built 為已建立筆數；ui.next 為「尚未建立的最小索引」的下界（閒置依序補齊用）。DOM 中的順序恆與索引順序相同。
  var ui = null; // { root, buttons:{}, input, list, empty, count, index, items:[{entry, node, templateEl}|null], built, next, dom, labelMap }
  var applied = { category: null, keyword: null };
  var idleHandle = null; // 待執行的分批工作（{ kind, id }）
  var visible = false; // 本頁是否顯示中（mount／show 設為 true，hide 設為 false）

  /** 排入閒置工作：優先 requestIdleCallback，不支援時改用計時器 */
  function scheduleIdle(fn) {
    if (typeof root.requestIdleCallback === "function") {
      return { kind: "idle", id: root.requestIdleCallback(fn, { timeout: 1000 }) };
    }
    return { kind: "timeout", id: setTimeout(function () { fn(null); }, 16) };
  }

  /** 取消已排入的閒置工作 */
  function cancelIdle(h) {
    if (!h) return;
    if (h.kind === "idle" && typeof root.cancelIdleCallback === "function") root.cancelIdleCallback(h.id);
    else clearTimeout(h.id);
  }

  /**
   * 建立指定索引位置的節點（遞增排列），依原始索引插入清單中的正確位置；新節點依目前已套用的條件設定 hidden。
   * 由後往前處理：每個新節點插在「其後最近的已建立節點」之前，整體 O(n)，且全程不讀版面。
   * @param {number[]} positions 尚未建立的索引位置（遞增）
   * @param {number} [estimate] 有值時，新節點直接啟用 content-visibility，並以此估計高度作為 contain-intrinsic-size
   *   （"auto <估計>px"：實際繪製過一次後瀏覽器改記住實際高度）；視窗外的新卡片因此不做樣式計算與排版
   * @returns {number} 本次建立的筆數
   */
  function buildAt(positions, estimate) {
    if (!ui || !positions || positions.length === 0) return 0;
    var kw = normalizeKeyword(applied.keyword || "");
    var cat = applied.category || "all";
    var want = {};
    for (var p = 0; p < positions.length; p++) want[positions[p]] = true;
    var lo = positions[0];
    var nextNode = null; // 目前位置之後最近的已建立節點（null = 清單尾端）
    var n = 0;
    for (var i = ui.index.length - 1; i >= lo; i--) {
      var cur = ui.items[i];
      if (cur) { nextNode = cur.node; continue; }
      if (!want[i]) continue;
      var it = buildItem(ui.dom, ui.index[i], ui.labelMap);
      it.node.hidden = !matches(it.entry, cat, kw);
      if (estimate > 0) {
        if (it.node.style) it.node.style.containIntrinsicSize = "auto " + estimate + "px";
        if (it.node.classList) it.node.classList.add("pb-item--cv");
        it.cv = true;
      }
      ui.items[i] = it;
      if (nextNode) ui.list.insertBefore(it.node, nextNode);
      else ui.list.appendChild(it.node);
      nextNode = it.node;
      ui.built++;
      n++;
    }
    return n;
  }

  /**
   * 依原順序建立「尚未建立」的節點，最多 limit 則（mount 首屏與閒置補齊用）。
   * @param {number} limit
   * @param {number} [estimate] 同 buildAt；mount 首屏不給（首屏須實際排版並實測高度）
   * @returns {number} 本次建立的筆數
   */
  function buildNext(limit, estimate) {
    if (!ui) return 0;
    var positions = [];
    var i = ui.next;
    while (i < ui.index.length && positions.length < limit) {
      if (!ui.items[i]) positions.push(i);
      i++;
    }
    var n = buildAt(positions, estimate);
    // 跳過已建立的前段，下次從第一個未建立的位置開始
    while (ui.next < ui.index.length && ui.items[ui.next]) ui.next++;
    return n;
  }

  /** 是否已建立全部節點 */
  function isComplete() {
    return !ui || ui.built >= ui.index.length;
  }

  /**
   * 非預設條件篩選前呼叫：只同步建立「符合條件但尚未建立」的節點（BUG-002 第 2 輪），
   * 讓可見結果與一次建好相同；其餘節點仍交給閒置工作依序補上。
   * @param {string} category
   * @param {string} keyword
   */
  function buildMatches(category, keyword) {
    if (!ui || isComplete()) return;
    // 同步建立的卡片可能多達數十則（例如關鍵字「g」符合 65 則），直接啟用 content-visibility，
    // 只有落在視窗內的卡片在本次繪製中排版，避免按鍵到繪製超過 100ms（AC-16-01、AC-22-01）
    buildAt(missingMatches(ui.index, ui.items, category, keyword), estimateHeight());
  }

  /**
   * 估計卡片高度：取已實測卡片的平均值（四捨五入為整數），尚無實測值時用 DEFAULT_CARD_HEIGHT（與 CSS 預設相同）。
   * @returns {number}
   */
  function estimateHeight() {
    return ui && ui.measuredCount > 0 ? Math.round(ui.measuredSum / ui.measuredCount) : DEFAULT_CARD_HEIGHT;
  }

  /**
   * 對「已實際排版過」的節點啟用 content-visibility（class pb-item--cv），並以實測高度作為
   * contain-intrinsic-size，讓視窗外卡片略過排版時仍保有正確高度（捲動、scrollIntoView 不位移）。
   * 必須在節點顯示且已經過一次繪製後才呼叫（閒置工作開頭，此時版面已是最新，讀高度不會強制重排）。
   * @returns {number} 本次啟用的筆數
   */
  function promoteRendered() {
    var n = 0;
    if (!ui || !visible) return 0;
    for (var i = 0; i < ui.items.length; i++) {
      var it = ui.items[i];
      if (!it || it.cv || it.node.hidden) continue;
      var h = it.node.offsetHeight;
      if (!(h > 0)) continue; // 尚未排版（頁面或清單隱藏），下次再處理
      if (it.node.style) it.node.style.containIntrinsicSize = "auto " + h + "px";
      if (it.node.classList) it.node.classList.add("pb-item--cv");
      it.cv = true;
      ui.measuredSum += h;
      ui.measuredCount++;
      n++;
    }
    return n;
  }

  /** 是否還有已顯示但尚未啟用 content-visibility 的節點 */
  function hasUnpromoted() {
    if (!ui) return false;
    for (var i = 0; i < ui.items.length; i++) {
      var it = ui.items[i];
      if (it && !it.cv && !it.node.hidden) return true;
    }
    return false;
  }

  /**
   * 閒置時分批補上其餘節點（每批最多 IDLE_BATCH 則，閒置時間不足即讓出），並對已排版的節點啟用 content-visibility。
   * 頁面隱藏時暫停（hidden 區段內沒有版面，無法量高度），show 時繼續。
   */
  function scheduleRest() {
    if (!ui || !visible || idleHandle) return;
    if (isComplete() && !hasUnpromoted()) return;
    idleHandle = scheduleIdle(function (deadline) {
      idleHandle = null;
      var progressed = 0;
      try {
        // 先處理上一批（版面已更新），再建立新節點，避免讀高度時強制重排
        progressed += promoteRendered();
        var n = 0;
        while (ui && visible && !isComplete() && n < IDLE_BATCH) {
          if (n > 0 && deadline && typeof deadline.timeRemaining === "function" && deadline.timeRemaining() < 2) break;
          if (buildNext(1, estimateHeight()) === 0) break;
          n++;
        }
        progressed += n;
      } catch (e) {
        if (typeof console !== "undefined") console.error("[EMT.views.phrasebank] 分批建立失敗", e);
        return;
      }
      // 本輪完全沒有進展（例如節點尚無版面）就停止，待下次 show 或篩選時再排程，避免空轉
      if (progressed > 0) scheduleRest();
    });
  }

  /**
   * 處理複製（AC-16-03、AC-16-04）；所有錯誤 catch，不拋出未處理錯誤。
   * @param {string} template 句型原文
   * @param {Element} templateEl 失敗時要反白的元素
   */
  function onCopy(template, templateEl) {
    var svc = EMT().services && EMT().services.clipboard;
    var toast = EMT().ui && EMT().ui.toast;
    function notify(text, kind) {
      try {
        if (toast && typeof toast.show === "function") toast.show(text, { kind: kind });
      } catch (e) {
        if (typeof console !== "undefined") console.error("[EMT.views.phrasebank] toast 失敗", e);
      }
    }
    function fail() {
      notify(MSG_COPY_FAILED, "error");
      var ok = false;
      try {
        ok = !!(svc && typeof svc.selectNodeText === "function" && svc.selectNodeText(templateEl));
      } catch (e) {
        ok = false;
      }
      if (!ok && typeof console !== "undefined") console.warn("[EMT.views.phrasebank] 無法反白句型文字");
    }
    var p;
    try {
      p = svc && typeof svc.copy === "function" ? svc.copy(template) : Promise.resolve(false);
    } catch (e) {
      p = Promise.resolve(false);
    }
    Promise.resolve(p)
      .then(function (ok) {
        if (ok === true) notify(MSG_COPIED, "success");
        else fail();
      }, fail)
      .catch(function (e) {
        if (typeof console !== "undefined") console.error("[EMT.views.phrasebank] 複製處理失敗", e);
      });
  }

  /** 建立單則句型節點 */
  function buildItem(dom, entry, labelMap) {
    var p = entry.phrase;
    var templateEl = dom.el("p", { className: "pb-item__template", attrs: { lang: "en" }, text: p.template });
    var children = [
      dom.el("span", { className: "pb-item__cat pb-item__cat--" + entry.category, text: labelMap[entry.category] || entry.category }),
      templateEl
    ];
    if (isNonEmptyString(p.descriptionZh)) {
      children.push(dom.el("p", { className: "pb-item__desc", text: p.descriptionZh }));
    }
    if (isNonEmptyString(p.exampleEn)) {
      children.push(dom.el("p", { className: "pb-item__example" }, [
        dom.el("span", { className: "pb-item__example-label", text: "例句：" }),
        dom.el("span", { attrs: { lang: "en" }, text: p.exampleEn })
      ]));
    }
    var template = p.template;
    children.push(dom.el("div", { className: "pb-item__actions" }, [
      dom.el("button", {
        className: "btn btn--secondary pb-item__copy",
        attrs: { type: "button" },
        text: "複製",
        on: { click: function () { onCopy(template, templateEl); } }
      })
    ]));
    var node = dom.el("li", {
      className: "card pb-item",
      attrs: { "data-id": typeof p.id === "string" ? p.id : "", "data-category": entry.category }
    }, children);
    return { entry: entry, node: node, templateEl: templateEl };
  }

  /** 依篩選條件更新畫面（相同條件不重做） */
  function apply(force) {
    if (!ui) return;
    var f = currentFilter();
    if (!force && f.category === applied.category && f.keyword === applied.keyword) return;
    applied = { category: f.category, keyword: f.keyword };

    // 分類按鈕狀態
    for (var i = 0; i < FILTERS.length; i++) {
      var b = ui.buttons[FILTERS[i]];
      if (b) b.setAttribute("aria-pressed", FILTERS[i] === f.category ? "true" : "false");
    }
    // 搜尋框與狀態同步（輸入中值相同時不動，避免游標跳動）
    if (ui.input.value !== f.keyword) ui.input.value = f.keyword;

    // 非預設條件：只同步建立符合條件但尚未建立的節點，可見結果與一次建好相同（其餘仍由閒置補上）
    if (!isDefaultFilter(f.category, f.keyword)) buildMatches(f.category, f.keyword);

    var kw = normalizeKeyword(f.keyword);
    for (var j = 0; j < ui.items.length; j++) {
      var it = ui.items[j];
      if (!it) continue;
      var ok = matches(it.entry, f.category, kw);
      if (it.node.hidden === ok) it.node.hidden = !ok;
    }
    // 筆數以完整索引計算（未補齊的節點於建立時依目前條件設定 hidden）
    var shown = countMatches(ui.index, f.category, f.keyword);
    ui.list.hidden = shown === 0;
    ui.empty.hidden = shown !== 0;
    EMT().core.dom.setText(ui.empty, ui.index.length === 0 ? MSG_NO_DATA : MSG_NO_RESULT);
    EMT().core.dom.setText(ui.count, "顯示 " + shown + " 則，共 " + ui.index.length + " 則");
    // 新顯示的節點排版後補上 content-visibility；未補齊時繼續分批
    scheduleRest();
  }

  /** mount：建立頁面（只一次） */
  function mount(rootEl) {
    var dom = EMT().core.dom;
    var labelMap = labels();
    var index = buildIndex(loadPhrases());

    var buttons = {};
    var btnEls = FILTERS.map(function (key) {
      var b = dom.el("button", {
        className: "btn pb-filter__btn",
        attrs: { type: "button", "aria-pressed": key === "all" ? "true" : "false", "data-category": key },
        text: labelMap[key] || FALLBACK_LABELS[key],
        on: { click: function () { setCategory(key); apply(false); } }
      });
      buttons[key] = b;
      return b;
    });

    // 搜尋：input 事件同步過濾，不做延遲合併（AC-16-01、§7.6）
    var input = dom.el("input", {
      className: "pb-search__input",
      attrs: {
        type: "search",
        id: "pb-search",
        placeholder: "輸入關鍵字（英文句型或中文說明）",
        autocomplete: "off",
        spellcheck: "false"
      },
      on: { input: function () { setKeyword(input.value); apply(false); } }
    });

    var count = dom.el("p", { className: "pb-count", attrs: { "aria-live": "polite" } });
    var empty = dom.el("p", { className: "pb-empty", attrs: { role: "status" }, text: MSG_NO_RESULT });
    empty.hidden = true;
    var list = dom.el("ul", { className: "pb-list" });

    var page = dom.el("div", { className: "pb" }, [
      dom.el("h2", { className: "pb-title", text: "學術句型庫" }),
      dom.el("div", { className: "pb-filter", attrs: { role: "group", "aria-label": "句型分類" } }, btnEls),
      dom.el("div", { className: "pb-search field" }, [
        dom.el("label", { className: "field__label", attrs: { for: "pb-search" }, text: "關鍵字搜尋" }),
        input
      ]),
      count,
      empty,
      list
    ]);
    rootEl.appendChild(page);

    ui = {
      root: page, buttons: buttons, input: input, list: list, empty: empty, count: count,
      index: index, items: new Array(index.length), built: 0, next: 0, dom: dom, labelMap: labelMap,
      measuredSum: 0, measuredCount: 0
    };
    for (var k = 0; k < index.length; k++) ui.items[k] = null;

    // 狀態變更（例如其他途徑修改篩選條件）時同步畫面
    var s = getStore();
    if (s && typeof s.subscribe === "function") {
      s.subscribe(function () {
        try { apply(false); } catch (e) {
          if (typeof console !== "undefined") console.error("[EMT.views.phrasebank] 重繪失敗", e);
        }
      });
    }
    // 先建立首屏節點（mount 後路由即顯示本頁），再套用條件（非預設條件會同步建立符合的節點）；其餘閒置時補上（BUG-002）
    visible = true;
    applied = { category: null, keyword: null };
    buildNext(FIRST_BATCH);
    apply(true);
  }

  /** show：每次顯示時與狀態同步，並繼續未完成的分批工作 */
  function show() {
    visible = true;
    apply(false);
    scheduleRest();
  }

  /** hide：離開本頁時暫停分批工作（隱藏區段沒有版面） */
  function hide() {
    visible = false;
    cancelIdle(idleHandle);
    idleHandle = null;
  }

  return {
    logic: logic,
    view: { mount: mount, show: show, hide: hide }
  };
});
