/*
 * views/decoder.js — 長難句解碼器頁（FE-15）
 * 依據：architecture.md §4.2、§4.3、§7.6「淡化修飾語」、§9；契約 data-schema.ts §6、RuntimeState.decoder、README §2 C-6、C-7
 * 涵蓋：AC-12-01～AC-12-03、AC-13-01～AC-13-04、AC-14-01、AC-14-02
 *
 * 版面：
 *   1. 顏色圖例（四色 + 線條樣式 + 文字，色盲使用者可不靠顏色分辨）
 *   2. 句子區：每個 segment 一個 <span class="seg seg--<role>">，文字一律 textContent（C-7）
 *      noteZh 以 title 顯示，並可點擊（或 Enter／空白鍵）在下方說明區顯示
 *      下方顯示 translationZh 與句子所屬段落
 *   3. 切換控制：上一句／下一句與「第 i / N 句」（actions.setDecoderIndex）
 *      「淡化修飾語」按鈕（actions.toggleModifierDim）；淡化時句子容器加 is-dimmed，切換句子時保持
 *      「顯示角色文字」按鈕：在每個片段前顯示「主／動／受／修」小標籤（純介面狀態，不寫入 store）
 *   4. 閱讀策略：資料中的 3 個主題，以 <details> 展開
 * 頁面不提供任何讓使用者輸入句子的欄位（AC-12-03、Q-05）。
 *
 * 純邏輯函式（roleOf、segClass、positionText、sectionTitle、normalizeSentence）在 Node 下以
 * module.exports 匯出供測試；瀏覽器下只登錄 EMT.views，不在載入時操作 DOM。
 */
(function (root) {
  "use strict";

  // ── 常數 ──

  /** 契約 SyntaxRole 的 5 種角色 */
  var ROLES = ["subject", "verb", "object", "modifier", "plain"];

  /** 圖例與角色文字（AC-12-01）；short 為「顯示角色文字」時片段前的小標籤 */
  var ROLE_INFO = {
    subject: { name: "主詞", short: "主" },
    verb: { name: "核心動詞", short: "動" },
    object: { name: "受詞／補語", short: "受" },
    modifier: { name: "修飾語／子句／插入語", short: "修" }
  };

  /** 圖例順序 */
  var LEGEND_ORDER = ["subject", "verb", "object", "modifier"];

  /** 段落標題後備值（資料缺 READING_STRATEGIES 時使用；文字與契約 ReadingStrategy.title 相同） */
  var SECTION_FALLBACK = {
    abstract: "Abstract 摘要",
    methodology: "方法論",
    literature_review: "文獻回顧（Research Gap）"
  };

  var TEXT_DIM = "淡化修飾語";
  var TEXT_UNDIM = "還原修飾語";
  var TEXT_LABELS_ON = "顯示角色文字";
  var TEXT_LABELS_OFF = "隱藏角色文字";
  var TEXT_NOTE_HINT = "點選帶有虛線框的片段，可查看語法說明。";

  // ── 純邏輯 ──

  /**
   * 正規化語法角色：非契約值一律視為 plain（不上色、不淡化）。
   * @param {*} role
   * @returns {"subject"|"verb"|"object"|"modifier"|"plain"}
   */
  function roleOf(role) {
    return ROLES.indexOf(role) !== -1 ? role : "plain";
  }

  /**
   * 片段的 class 字串。
   * @param {*} role
   * @returns {string} 例："seg seg--modifier"
   */
  function segClass(role) {
    return "seg seg--" + roleOf(role);
  }

  /**
   * 「第 i / N 句」文字（i 從 1 起算）；N 為 0 時回「第 0 / 0 句」。
   * @param {number} index 0 起算索引
   * @param {number} total 例句總數
   * @returns {string}
   */
  function positionText(index, total) {
    var n = typeof total === "number" && total > 0 ? Math.floor(total) : 0;
    if (n === 0) { return "第 0 / 0 句"; }
    var i = typeof index === "number" && isFinite(index) ? Math.floor(index) : 0;
    if (i < 0) { i = 0; }
    if (i > n - 1) { i = n - 1; }
    return "第 " + (i + 1) + " / " + n + " 句";
  }

  /**
   * 例句所屬段落的標題：優先用資料 READING_STRATEGIES 的 title，找不到用契約固定標題，
   * 仍找不到回空字串。
   * @param {*} section ReadingStrategyId
   * @param {Array<object>} strategies
   * @returns {string}
   */
  function sectionTitle(section, strategies) {
    if (typeof section !== "string" || !section) { return ""; }
    var list = Array.isArray(strategies) ? strategies : [];
    for (var k = 0; k < list.length; k++) {
      var s = list[k];
      if (s && s.id === section && typeof s.title === "string" && s.title) { return s.title; }
    }
    return Object.prototype.hasOwnProperty.call(SECTION_FALLBACK, section) ? SECTION_FALLBACK[section] : "";
  }

  /**
   * 將資料中的例句整理為顯示用結構（C-6 容錯：欄位缺漏或型別不符不拋例外）。
   * @param {*} s DecoderSentence
   * @returns {{ id: string, segments: Array<{text: string, role: string, noteZh: string}>,
   *             translationZh: string, section: string }}
   */
  function normalizeSentence(s) {
    var src = s && typeof s === "object" ? s : {};
    var segs = Array.isArray(src.segments) ? src.segments : [];
    var out = [];
    for (var k = 0; k < segs.length; k++) {
      var g = segs[k];
      if (!g || typeof g !== "object" || typeof g.text !== "string" || g.text === "") { continue; }
      out.push({
        text: g.text,
        role: roleOf(g.role),
        noteZh: typeof g.noteZh === "string" ? g.noteZh : ""
      });
    }
    return {
      id: typeof src.id === "string" ? src.id : "",
      segments: out,
      translationZh: typeof src.translationZh === "string" ? src.translationZh : "",
      section: typeof src.section === "string" ? src.section : ""
    };
  }

  /**
   * 整理閱讀策略：只保留有標題的主題，tips 只保留非空字串。
   * @param {*} list READING_STRATEGIES
   * @returns {Array<{ id: string, title: string, tips: string[] }>}
   */
  function normalizeStrategies(list) {
    var arr = Array.isArray(list) ? list : [];
    var out = [];
    for (var k = 0; k < arr.length; k++) {
      var s = arr[k];
      if (!s || typeof s !== "object" || typeof s.title !== "string" || !s.title) { continue; }
      var tips = [];
      var raw = Array.isArray(s.tips) ? s.tips : [];
      for (var t = 0; t < raw.length; t++) {
        if (typeof raw[t] === "string" && raw[t].trim() !== "") { tips.push(raw[t]); }
      }
      out.push({ id: typeof s.id === "string" ? s.id : "", title: s.title, tips: tips });
    }
    return out;
  }

  var helpers = {
    ROLES: ROLES,
    roleOf: roleOf,
    segClass: segClass,
    positionText: positionText,
    sectionTitle: sectionTitle,
    normalizeSentence: normalizeSentence,
    normalizeStrategies: normalizeStrategies,
    TEXT_DIM: TEXT_DIM,
    TEXT_UNDIM: TEXT_UNDIM
  };

  // Node（單元測試）：只匯出純邏輯
  if (typeof module === "object" && module.exports) {
    module.exports = helpers;
    return;
  }

  var EMT = (root.EMT = root.EMT || {});

  // ── 瀏覽器：頁面模組 ──

  /** 頁面元素參照與介面狀態 */
  var ui = null;
  var unsubscribe = null;
  /** 是否顯示角色文字小標籤（純介面狀態） */
  var showLabels = false;

  function dom() { return EMT.core.dom; }

  function store() { return EMT.store; }

  /** 內容資料（C-6：取不到時回空陣列） */
  function sentences() {
    var c = EMT.content;
    return c && Array.isArray(c.decoderSentences) ? c.decoderSentences : [];
  }

  function strategies() {
    var c = EMT.content;
    return c && Array.isArray(c.strategies) ? c.strategies : [];
  }

  /** 目前的解碼器狀態（store 不可用時回預設值） */
  function decoderState() {
    try {
      var st = store() && store().getState();
      var d = st && st.runtime && st.runtime.decoder;
      if (d) { return { sentenceIndex: d.sentenceIndex, isModifierDimmed: !!d.isModifierDimmed }; }
    } catch (e) {
      if (typeof console !== "undefined") console.error("[EMT.views.decoder] 讀取狀態失敗", e);
    }
    return { sentenceIndex: 0, isModifierDimmed: false };
  }

  function act(name, arg) {
    var s = store();
    if (s && s.actions && typeof s.actions[name] === "function") { s.actions[name](arg); }
  }

  /** 顏色圖例（AC-12-01） */
  function buildLegend() {
    var el = dom().el;
    var items = LEGEND_ORDER.map(function (role) {
      return el("li", { className: "dc-legend__item" }, [
        el("span", { className: "dc-swatch dc-swatch--" + role, attrs: { "aria-hidden": "true" }, text: ROLE_INFO[role].short }),
        el("span", { className: "dc-legend__name", text: ROLE_INFO[role].name })
      ]);
    });
    return el("div", { className: "dc-legend" }, [
      el("h3", { className: "dc-legend__title", text: "顏色圖例" }),
      el("ul", { className: "dc-legend__list" }, items),
      el("p", { className: "dc-legend__hint", text: "主詞為實線底線、核心動詞為粗雙底線、受詞／補語為虛線底線、修飾語為點線底線；可按「" + TEXT_LABELS_ON + "」在片段前標出角色。" })
    ]);
  }

  /** 顯示片段的語法說明 */
  function showNote(seg) {
    if (!ui) return;
    var label = ROLE_INFO[seg.role] ? ROLE_INFO[seg.role].name : "";
    dom().setText(ui.note, "「" + seg.text.trim() + "」" + (label ? "（" + label + "）" : "") + "：" + seg.noteZh);
  }

  /** 建立單一片段元素（C-7：一個 segment 一個元素 + class，文字 textContent） */
  function buildSegment(seg) {
    var el = dom().el;
    var attrs = {};
    var on = null;
    if (seg.role !== "plain" && ROLE_INFO[seg.role]) {
      attrs["data-label"] = ROLE_INFO[seg.role].short;
    }
    if (seg.noteZh) {
      attrs.title = (ROLE_INFO[seg.role] ? ROLE_INFO[seg.role].name + "：" : "") + seg.noteZh;
      attrs.tabindex = "0";
      attrs.role = "button";
      on = {
        click: function () { showNote(seg); },
        keydown: function (ev) {
          if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            showNote(seg);
          }
        }
      };
    } else if (ROLE_INFO[seg.role]) {
      attrs.title = ROLE_INFO[seg.role].name;
    }
    var cls = segClass(seg.role) + (seg.noteZh ? " seg--has-note" : "");
    return el("span", { className: cls, attrs: attrs, text: seg.text, on: on });
  }

  /** 依目前狀態重繪句子區與控制列 */
  function render() {
    if (!ui) return;
    var d = dom();
    var list = sentences();
    var total = list.length;
    var ds = decoderState();
    var idx = total > 0 ? Math.min(Math.max(Math.floor(ds.sentenceIndex) || 0, 0), total - 1) : 0;

    // 淡化狀態（AC-13-01～AC-13-03）：class 掛在跨句保留的容器上
    ui.stage.classList.toggle("is-dimmed", ds.isModifierDimmed);
    d.setText(ui.dimBtn, ds.isModifierDimmed ? TEXT_UNDIM : TEXT_DIM);
    ui.dimBtn.setAttribute("aria-pressed", ds.isModifierDimmed ? "true" : "false");

    ui.stage.classList.toggle("is-labeled", showLabels);
    d.setText(ui.labelBtn, showLabels ? TEXT_LABELS_OFF : TEXT_LABELS_ON);
    ui.labelBtn.setAttribute("aria-pressed", showLabels ? "true" : "false");

    d.setText(ui.pos, positionText(idx, total));
    ui.prevBtn.disabled = total === 0 || idx <= 0;
    ui.nextBtn.disabled = total === 0 || idx >= total - 1;
    ui.dimBtn.disabled = total === 0;
    ui.labelBtn.disabled = total === 0;

    d.clear(ui.sentence);
    d.setText(ui.note, TEXT_NOTE_HINT);
    if (total === 0) {
      d.setText(ui.sentence, "目前沒有可顯示的例句。");
      ui.sentence.classList.add("dc-sentence--empty");
      d.setText(ui.translation, "");
      d.setText(ui.section, "");
      ui.note.hidden = true;
      return;
    }
    ui.sentence.classList.remove("dc-sentence--empty");
    var s = normalizeSentence(list[idx]);
    var hasNote = false;
    for (var k = 0; k < s.segments.length; k++) {
      ui.sentence.appendChild(buildSegment(s.segments[k]));
      if (s.segments[k].noteZh) hasNote = true;
    }
    ui.note.hidden = !hasNote;
    d.setText(ui.translation, s.translationZh);
    var title = sectionTitle(s.section, strategies());
    d.setText(ui.section, title ? "所屬段落：" + title : "");
  }

  /** 閱讀策略區（AC-14-01、AC-14-02） */
  function buildStrategies() {
    var el = dom().el;
    var list = normalizeStrategies(strategies());
    var body;
    if (list.length === 0) {
      body = el("p", { className: "dc-empty", text: "目前沒有閱讀策略資料。" });
    } else {
      body = list.map(function (s) {
        return el("details", { className: "dc-strategy" }, [
          el("summary", { className: "dc-strategy__title", text: s.title }),
          el("ul", { className: "dc-strategy__tips" }, s.tips.map(function (t) {
            return el("li", { text: t });
          }))
        ]);
      });
    }
    return el("section", { className: "card dc-strategies", attrs: { "aria-labelledby": "dc-strategies-title" } }, [
      el("h3", { className: "dc-section-title", attrs: { id: "dc-strategies-title" }, text: "閱讀策略" }),
      body
    ]);
  }

  /** 建立頁面骨架（只在第一次顯示前呼叫一次） */
  function mount(rootEl) {
    var d = dom();
    var el = d.el;
    d.clear(rootEl);

    var prevBtn = el("button", {
      className: "btn btn--secondary dc-prev",
      attrs: { type: "button" },
      text: "上一句",
      on: { click: function () { act("setDecoderIndex", decoderState().sentenceIndex - 1); } }
    });
    var nextBtn = el("button", {
      className: "btn btn--secondary dc-next",
      attrs: { type: "button" },
      text: "下一句",
      on: { click: function () { act("setDecoderIndex", decoderState().sentenceIndex + 1); } }
    });
    var pos = el("span", { className: "dc-pos", attrs: { "aria-live": "polite" } });
    var dimBtn = el("button", {
      className: "btn btn--primary dc-dim",
      attrs: { type: "button", "aria-pressed": "false" },
      text: TEXT_DIM,
      on: { click: function () { act("toggleModifierDim"); } }
    });
    var labelBtn = el("button", {
      className: "btn btn--secondary dc-label-toggle",
      attrs: { type: "button", "aria-pressed": "false" },
      text: TEXT_LABELS_ON,
      on: { click: function () { showLabels = !showLabels; render(); } }
    });
    var sentence = el("p", { className: "dc-sentence", attrs: { lang: "en" } });
    var note = el("p", { className: "dc-note", attrs: { "aria-live": "polite" } });
    var translation = el("p", { className: "dc-translation" });
    var section = el("p", { className: "dc-section" });
    var stage = el("div", { className: "dc-stage" }, [sentence]);

    rootEl.appendChild(el("div", { className: "dc" }, [
      el("h2", { className: "dc-title", text: "長難句解碼器" }),
      el("section", { className: "card dc-main", attrs: { "aria-label": "例句" } }, [
        buildLegend(),
        el("div", { className: "dc-controls" }, [
          el("div", { className: "dc-nav" }, [prevBtn, pos, nextBtn]),
          el("div", { className: "btn-row dc-toggles" }, [dimBtn, labelBtn])
        ]),
        stage,
        note,
        translation,
        section
      ]),
      buildStrategies()
    ]));

    ui = {
      root: rootEl, prevBtn: prevBtn, nextBtn: nextBtn, pos: pos, dimBtn: dimBtn, labelBtn: labelBtn,
      stage: stage, sentence: sentence, note: note, translation: translation, section: section
    };

    var s = store();
    if (s && typeof s.subscribe === "function" && !unsubscribe) {
      unsubscribe = s.subscribe(function (state, tags) {
        if (!Array.isArray(tags) || tags.indexOf("decoder") !== -1) render();
      });
    }
    render();
  }

  function show() {
    render();
  }

  if (EMT.views && typeof EMT.views.register === "function") {
    EMT.views.register("decoder", { mount: mount, show: show });
  } else if (typeof console !== "undefined") {
    console.error("[EMT.views.decoder] 找不到 EMT.views.register");
  }
})(typeof self !== "undefined" ? self : this);
