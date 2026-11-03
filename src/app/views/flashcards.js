/*
 * views/flashcards.js — 單字卡頁（FE-11；R-15 畫面名稱更新，FE-23；手勢與動畫，FE-28）
 * 依據：architecture.md §4.2、§4.3、§4.4、§7.6「效能」、v0.4 §7.10～§7.12；契約 StudyCard、BuiltinVocabItem、
 *       CustomVocabItem、POS_LABELS、DataSourceEntry、RuntimeState.flashcard、README §4.3 L-6、§5.6
 * 涵蓋：AC-03-04、AC-03-05、AC-04-08、AC-06-01～AC-06-07、AC-22-02、AC-23-01、AC-24-07、
 *       AC-28-01～AC-28-08、AC-31-03
 *
 * 手勢與動畫（FE-28）：
 *   - 翻面：沿用「兩面 hidden 切換、不重建 DOM」；isFlipped 改變時新顯示的那一面加 fc-face--flip-in，
 *     被隱藏的那一面立刻移除該 class。最終面只依 store 的 isFlipped（AC-28-08），不讀動畫結束事件。
 *   - 滑動：卡片根元素綁 touchstart／touchmove／touchend（passive，不取消預設行為；CSS touch-action: pan-y），
 *     依 swipeDecision 呼叫 actions.gotoCard（同步）；位移後 CLICK_SUPPRESS_MS 內的 click 不翻面（AC-28-05）；
 *     測驗模式一律不換題（AC-28-06）。只綁 Touch Events，不支援滑鼠拖曳。
 *   - 換卡滑入：卡片重建且索引改變時，新卡根元素加 fc-card--in-next（索引增加）／fc-card--in-prev（索引減少）。
 *   - 減少動態由 EMT.ui.motion 與 05-motion.css 處理，本檔不另寫判斷。
 *
 * 版面（mount 時建立一次，之後只更新文字與 hidden）：
 *   頂部列：「共 N 張」、「第 i / N 張」、「測驗模式」切換鈕（aria-pressed 表示目前是否在測驗模式）
 *   卡片區 .fc-stage：card 模式 = 單張卡片（正面／背面／出處）；quiz 模式 = 交給 FE-13 的容器
 *   導覽列：「上一張」「翻面」「下一張」（頭尾 disabled；quiz 模式不顯示「翻面」）
 *   空狀態：單字集為空時取代以上全部，顯示訊息與「前往難易度設定」
 *
 * 子元件掛載點（architecture.md §4.4；元件不存在時一律略過，不報錯）：
 *   EMT.components.speechPanel.render(containerEl, card, state)
 *     - containerEl：卡片正面的 <div class="fc-speech">，每次重建卡片時為「新的空容器」。
 *     - card：目前的 StudyCard（{ kind, wordKey, item }）；state：store.getState() 的 AppState（{ data, runtime }）。
 *     - 呼叫時機：換卡、單字集變更、從測驗模式切回、頁面 mount／show 時（即卡片 DOM 重建時）。
 *       只翻面（isFlipped 改變）不重建卡片、不重新呼叫；只有 "speech" tag 的變更（STT 狀態與結果）
 *       FE-11 也不呼叫，由 FE-12 自行 subscribe 更新容器內的分數區。
 *   EMT.components.speechPanel.reset()
 *     - 呼叫時機：換卡（卡片 DOM 重建前）、切換 card／quiz 模式（不釋放麥克風，同頁重用）。
 *   EMT.components.speechPanel.release()（v0.5）
 *     - 呼叫時機：離開本頁（hide）；= reset() ＋ 釋放麥克風（AC-33-02）。不存在時退回 reset()。
 *   EMT.components.flashcardQuiz.render(containerEl, state)
 *     - containerEl：<div class="fc-quiz">，進入測驗模式時建立一次；之後每次 store 通知含
 *       "flashcard"、"quiz"、"studySet" 任一 tag 時，以同一容器再次呼叫。render 須先清空容器再依 state 重繪（冪等）。
 *     - 作答由 FE-13 呼叫 actions.answerVocabQuiz；換題沿用本頁「上一張」「下一張」（store 換卡時自動重新出題）。
 *
 * 安全：所有資料（含匯入的自訂單字）一律經 EMT.core.dom.el 以 textContent 寫入（C-7、AC-24-07）。
 * 純邏輯（文字組裝）於 Node 下以 module.exports 匯出供單元測試；瀏覽器下只登錄頁面，載入時不操作 DOM。
 */
(function (root) {
  "use strict";

  var EMT = (root.EMT = root.EMT || {});

  // 頁面代碼
  var TAB_ID = "flashcards";
  // 自訂單字選填欄位留空時的顯示（AC-06-07、Q-20）
  var EMPTY_MARK = "—";
  // 自訂單字的出處文字（AC-23-01）
  var CUSTOM_ORIGIN_TEXT = "自訂擴充";
  // 單字數不足時的提示（AC-09-06 原文）
  var INSUFFICIENT_MESSAGE = "單字數不足 4 個，無法產生選項";
  // 來源登錄中「原創」來源的代碼（契約 OriginalMarker）；查不到登錄時的後備顯示
  var ORIGINAL_CODE = "ORIGINAL";
  var ORIGINAL_FALLBACK = "原創";
  // 動畫 class（architecture.md §7.11）
  var FLIP_IN_CLASS = "fc-face--flip-in";
  var SLIDE_NEXT_CLASS = "fc-card--in-next";
  var SLIDE_PREV_CLASS = "fc-card--in-prev";

  // ════════════════════════════════════════════════════════════════
  // 純邏輯（可在 Node 測試）
  // ════════════════════════════════════════════════════════════════

  /**
   * 安全轉字串：字串原樣、數字轉字串，其他（undefined、null、物件）一律為 ""，確保畫面不出現 undefined／null 字樣。
   * 注意：內容本身就是 "null"（如排名 4,646 的單字 null）時照常顯示（README V-VOC-10）。
   * @param {*} v
   * @returns {string}
   */
  function str(v) {
    if (typeof v === "string") return v;
    if (typeof v === "number" && isFinite(v)) return String(v);
    return "";
  }

  /** 去除前後空白後是否為空 */
  function isBlank(v) {
    return str(v).trim() === "";
  }

  /**
   * 以 code 在來源登錄（DATA_SOURCE_REGISTRY）中查表。
   * @param {string} code
   * @param {Array<object>} registry
   * @returns {object|null}
   */
  function findSource(code, registry) {
    if (!Array.isArray(registry)) return null;
    for (var i = 0; i < registry.length; i++) {
      var e = registry[i];
      if (e && typeof e === "object" && e.code === code) return e;
    }
    return null;
  }

  /**
   * 字表出處單項：「name version（licenseName）」（README L-6）。查無登錄時只顯示代碼。
   * @param {string} code 字表代碼
   * @param {Array<object>} registry
   * @returns {string}
   */
  function wordListLabel(code, registry) {
    var e = findSource(code, registry);
    if (!e) return str(code);
    var text = str(e.name) || str(code);
    if (!isBlank(e.version)) text += " " + str(e.version);
    if (!isBlank(e.licenseName)) text += "（" + str(e.licenseName) + "）";
    return text;
  }

  /**
   * 欄位來源顯示（音標、釋義；README L-6）：
   * - 原創來源（kind "original" 或代碼 ORIGINAL）→ 登錄中的 name（「原創」）。
   * - 其他來源（如 ECDICT）→ name +「（」+ licenseName +「，已修改）」；modifications 為空時不加「，已修改」。
   * 文字全部由登錄資料推導，不寫死來源名稱與授權（NFR-3 出處不一致數 = 0）。
   * @param {string} code 欄位來源代碼（phoneticSource／meaningSource 的值）
   * @param {Array<object>} registry
   * @returns {string}
   */
  function fieldSourceLabel(code, registry) {
    var e = findSource(code, registry);
    if (!e) return code === ORIGINAL_CODE ? ORIGINAL_FALLBACK : str(code);
    var name = str(e.name) || str(code);
    if (e.kind === "original" || code === ORIGINAL_CODE) return name;
    var parts = [];
    if (!isBlank(e.licenseName)) parts.push(str(e.licenseName));
    if (Array.isArray(e.modifications) && e.modifications.length > 0) parts.push("已修改");
    return parts.length > 0 ? name + "（" + parts.join("，") + "）" : name;
  }

  /**
   * 出處文字（AC-23-01）。
   * 內建卡 → ["單字來源：NGSL 1.2（CC BY-SA 4.0）、…", "音標：原創；釋義：<依 meaningSource 推導>"]
   * 自訂卡 → ["自訂擴充"]（不顯示字表出處）
   * @param {{kind: string, item: object}} card StudyCard
   * @param {Array<object>} registry DATA_SOURCE_REGISTRY
   * @returns {string[]}
   */
  function attributionLines(card, registry) {
    if (!card || card.kind !== "builtin") return [CUSTOM_ORIGIN_TEXT];
    var item = card.item || {};
    var lines = [];
    var codes = Array.isArray(item.sources) ? item.sources : [];
    var labels = [];
    for (var i = 0; i < codes.length; i++) {
      var label = wordListLabel(codes[i], registry);
      if (label) labels.push(label);
    }
    if (labels.length > 0) lines.push("單字來源：" + labels.join("、"));
    var fields = [];
    if (!isBlank(item.phoneticSource)) fields.push("音標：" + fieldSourceLabel(item.phoneticSource, registry));
    if (!isBlank(item.meaningSource)) fields.push("釋義：" + fieldSourceLabel(item.meaningSource, registry));
    if (fields.length > 0) lines.push(fields.join("；"));
    return lines;
  }

  /**
   * 詞性文字（AC-06-02）。
   * 內建：pos 陣列依 POS_LABELS 顯示為「v. 動詞、n. 名詞」（查無標籤只顯示代碼）；自訂：原文字。
   * @param {{kind: string, item: object}} card
   * @param {Object<string,string>} posLabels
   * @returns {string}
   */
  function posText(card, posLabels) {
    var item = (card && card.item) || {};
    if (card && card.kind === "builtin") {
      var list = Array.isArray(item.pos) ? item.pos : [];
      var out = [];
      for (var i = 0; i < list.length; i++) {
        var code = str(list[i]);
        if (!code) continue;
        var label = posLabels && typeof posLabels[code] === "string" ? posLabels[code] : "";
        out.push(label ? code + " " + label : code);
      }
      return out.join("、");
    }
    return str(item.pos).trim();
  }

  /**
   * 卡片檢視模型（AC-06-01、AC-06-02、AC-06-07）。
   * 欄位規則：
   * - 內建：值為空的欄位整欄（標題與內容）隱藏；學術情境空字串屬正常情況（rank ≤ N_B）。
   * - 自訂：選填欄位空白顯示「—」（音標、搭配詞、詞性、學術情境、完整例句）。
   * 回傳的 front／back 每欄 { key, label, value }，value 一定是非空字串。
   * @param {{kind: string, wordKey: string, item: object}} card
   * @param {{posLabels?: object, registry?: Array<object>}} ctx
   * @returns {{ kind: string, word: string, phonetic: string, front: Array, back: Array, attribution: string[] }}
   */
  function cardModel(card, ctx) {
    var c = ctx || {};
    var item = (card && card.item) || {};
    var custom = !card || card.kind !== "builtin";

    // 依卡片種類決定空值呈現：自訂 → 「—」；內建 → null（整欄隱藏）
    function fill(v) {
      var s = str(v).trim();
      if (s) return s;
      return custom ? EMPTY_MARK : null;
    }
    function push(list, key, label, v) {
      var value = fill(v);
      if (value !== null) list.push({ key: key, label: label, value: value });
    }

    var front = [];
    push(front, "collocation", "多益常考搭配詞", item.collocation);

    var back = [];
    push(back, "pos", "詞性", posText(card, c.posLabels));
    push(back, "meaning", "中文釋義", item.meaning);
    push(back, "academicContext", "學術文獻應用情境", item.academicContext);
    push(back, "example", "完整例句", item.example);

    var phonetic = str(item.phonetic).trim();
    return {
      kind: custom ? "custom" : "builtin",
      word: str(item.word).trim(),
      phonetic: phonetic || (custom ? EMPTY_MARK : ""),
      front: front,
      back: back,
      attribution: attributionLines(card, c.registry)
    };
  }

  /**
   * 頂部計數文字（AC-03-04、AC-06-04）。
   * @param {number} index 目前索引（0 起算）
   * @param {number} total 單字集張數
   * @returns {{ total: string, position: string, hasPrev: boolean, hasNext: boolean }}
   */
  function counterModel(index, total) {
    var n = typeof total === "number" && total > 0 ? Math.floor(total) : 0;
    var i = typeof index === "number" && isFinite(index) ? Math.floor(index) : 0;
    if (i < 0) i = 0;
    if (n > 0 && i > n - 1) i = n - 1;
    return {
      total: "共 " + n + " 張",
      position: n > 0 ? "第 " + (i + 1) + " / " + n + " 張" : "",
      hasPrev: n > 0 && i > 0,
      hasNext: n > 0 && i < n - 1
    };
  }

  // ─── 手勢與動畫（FE-28） ───

  /**
   * 取得 core/interaction（呼叫時才取用，LD-2）。瀏覽器讀 EMT.core.interaction；Node 下以 require 取得。
   * 不存在時視為程式組裝錯誤，丟出含模組名稱的 Error（LD-3）。
   */
  function interaction() {
    var c = EMT.core && EMT.core.interaction;
    if (c) return c;
    if (typeof require === "function" && typeof module === "object") return require("../core/interaction.js");
    throw new Error("[EMT.views.flashcards] 缺少模組 EMT.core.interaction");
  }

  /**
   * 滑動結束後的決定（§7.10）：mode 不是 "card" → none（AC-28-06）；
   * 否則依 classifySwipe、swipeTarget 決定目標索引，首尾越界或未達門檻 → none（AC-28-04、AC-28-05）。
   * @param {string} mode RuntimeState.flashcard.mode
   * @param {number} index 目前索引
   * @param {number} n 單字集張數
   * @param {number} dx 結束 x − 開始 x
   * @param {number} dy 結束 y − 開始 y
   * @returns {{action: "goto", index: number} | {action: "none"}}
   */
  function swipeDecision(mode, index, n, dx, dy) {
    if (mode !== "card") return { action: "none" };
    var ia = interaction();
    var target = ia.swipeTarget(index, n, ia.classifySwipe(dx, dy));
    return target === null ? { action: "none" } : { action: "goto", index: target };
  }

  /**
   * 觸控是否已位移（任一軸 ≥ TAP_SLOP_PX，§7.10 touchmove）。非數字回 false。
   * @param {number} dx
   * @param {number} dy
   * @returns {boolean}
   */
  function movedBeyondSlop(dx, dy) {
    if (typeof dx !== "number" || typeof dy !== "number" || !isFinite(dx) || !isFinite(dy)) return false;
    var slop = interaction().UI.TAP_SLOP_PX;
    return Math.abs(dx) >= slop || Math.abs(dy) >= slop;
  }

  /**
   * touchend 後的 click 抑制截止時間：有位移 → now + CLICK_SUPPRESS_MS；否則 0（不抑制）。
   * @param {boolean} moved
   * @param {number} now
   * @returns {number}
   */
  function suppressUntilAfter(moved, now) {
    return moved ? now + interaction().UI.CLICK_SUPPRESS_MS : 0;
  }

  /**
   * click 是否落在抑制時間窗內（now < until）。
   * @param {number} now
   * @param {number} until
   * @returns {boolean}
   */
  function suppressClick(now, until) {
    return typeof now === "number" && typeof until === "number" && now < until;
  }

  /**
   * 換卡滑入方向：索引增加 → in-next、減少 → in-prev；相同或任一非整數 → null（不播放）。
   * @param {number|null} prevIndex 上一張卡的索引（先前不是卡片時為 null）
   * @param {number} nextIndex
   * @returns {string|null}
   */
  function slideClassFor(prevIndex, nextIndex) {
    if (typeof prevIndex !== "number" || typeof nextIndex !== "number") return null;
    if (Math.floor(prevIndex) !== prevIndex || Math.floor(nextIndex) !== nextIndex) return null;
    if (nextIndex > prevIndex) return SLIDE_NEXT_CLASS;
    if (nextIndex < prevIndex) return SLIDE_PREV_CLASS;
    return null;
  }

  /**
   * 依 isFlipped 切換卡片兩面（只改 hidden、data-flipped 與動畫 class，不重建 DOM）。
   * animate 為真且翻面狀態實際改變時：被隱藏的一面 motion.cancel、新顯示的一面 motion.enter(FLIP_IN_CLASS)。
   * 新顯示的一面剛由 display: none 變為顯示，動畫會從第一格重新開始，不需強制重排。
   * motion 不存在時只切換，不播放動畫。
   * @param {{root: object, front: object, back: object}} card buildCard 的回傳
   * @param {boolean} flipped
   * @param {{enter: Function, cancel: Function}|null} motion EMT.ui.motion
   * @param {boolean} animate
   * @returns {boolean} 翻面狀態是否改變
   */
  function applyFlipTo(card, flipped, motion, animate) {
    if (!card || !card.root) return false;
    var f = !!flipped;
    var was = card.root.getAttribute("data-flipped") === "true";
    card.front.hidden = f;
    card.back.hidden = !f;
    card.root.setAttribute("data-flipped", f ? "true" : "false");
    var changed = was !== f;
    if (changed && animate && motion && typeof motion.enter === "function") {
      var shown = f ? card.back : card.front;
      var gone = f ? card.front : card.back;
      if (typeof motion.cancel === "function") motion.cancel(gone, FLIP_IN_CLASS);
      motion.enter(shown, FLIP_IN_CLASS, interaction().UI.FLIP_ANIM_MS);
    }
    return changed;
  }

  var logic = {
    EMPTY_MARK: EMPTY_MARK,
    CUSTOM_ORIGIN_TEXT: CUSTOM_ORIGIN_TEXT,
    INSUFFICIENT_MESSAGE: INSUFFICIENT_MESSAGE,
    str: str,
    findSource: findSource,
    wordListLabel: wordListLabel,
    fieldSourceLabel: fieldSourceLabel,
    attributionLines: attributionLines,
    posText: posText,
    cardModel: cardModel,
    counterModel: counterModel,
    FLIP_IN_CLASS: FLIP_IN_CLASS,
    SLIDE_NEXT_CLASS: SLIDE_NEXT_CLASS,
    SLIDE_PREV_CLASS: SLIDE_PREV_CLASS,
    swipeDecision: swipeDecision,
    movedBeyondSlop: movedBeyondSlop,
    suppressUntilAfter: suppressUntilAfter,
    suppressClick: suppressClick,
    slideClassFor: slideClassFor,
    applyFlipTo: applyFlipTo
  };

  // Node（單元測試）：只匯出純邏輯，不登錄頁面
  if (typeof module === "object" && module.exports) {
    module.exports = logic;
    return;
  }

  // ════════════════════════════════════════════════════════════════
  // 頁面（瀏覽器）
  // ════════════════════════════════════════════════════════════════

  /** 取得 dom 建構 API */
  function dom() {
    return EMT.core.dom;
  }

  /** 取得子元件（不存在回 null） */
  function component(name) {
    var c = EMT.components && EMT.components[name];
    return c && typeof c === "object" ? c : null;
  }

  /** 安全呼叫子元件方法；子元件出錯不影響本頁 */
  function callComponent(name, method, args) {
    var c = component(name);
    if (!c || typeof c[method] !== "function") return false;
    try {
      c[method].apply(c, args || []);
      return true;
    } catch (e) {
      if (typeof console !== "undefined") console.error("[EMT.views.flashcards] " + name + "." + method + " 失敗", e);
      return false;
    }
  }

  /** 停止語音（換卡、切換模式、離開頁面） */
  function resetSpeech() {
    callComponent("speechPanel", "reset");
  }

  /** 離開本頁：停止語音並釋放麥克風（speechPanel.release；不存在時退回 reset） */
  function releaseSpeech() {
    var c = component("speechPanel");
    if (c && typeof c.release === "function") callComponent("speechPanel", "release");
    else resetSpeech();
  }

  /** 顯示 toast（toast 模組不存在時略過） */
  function toast(text, kind) {
    var t = EMT.ui && EMT.ui.toast;
    if (t && typeof t.show === "function") t.show(text, { kind: kind || "info" });
  }

  /** 契約常數 POS_LABELS */
  function posLabels() {
    var k = EMT.core && EMT.core.constants;
    return (k && k.POS_LABELS) || {};
  }

  /** 來源登錄 */
  function registry() {
    var c = EMT.content;
    return (c && Array.isArray(c.sources)) ? c.sources : [];
  }

  // 頁面元素（mount 時建立）
  var ui = null;
  // 目前卡片區代表的內容（"empty"｜"card|<index>|<wordKey>"｜"quiz"）；不同才重建卡片區
  var renderedKey = null;
  // store 訂閱的解除函式（頁面常駐，目前不需解除，保留供除錯）
  var unsubscribe = null;
  // 目前顯示卡片的索引（卡片模式且已建立卡片時才有值；決定換卡滑入方向）
  var lastCardIndex = null;
  // 進行中的觸控：{ x, y, moved }；非單指或已結束為 null
  var gesture = null;
  // 此時間之前的卡片 click 一律忽略（滑動後瀏覽器補發的 click，AC-28-05）
  var suppressUntil = 0;

  /** 建立頁面骨架（只執行一次） */
  function build(rootEl) {
    var el = dom().el;
    ui = {};
    ui.total = el("span", { className: "fc-total" });
    ui.position = el("span", { className: "fc-position", attrs: { "aria-live": "polite" } });
    ui.modeBtn = el("button", {
      className: "btn fc-mode-btn",
      text: "測驗模式",
      attrs: { type: "button", "aria-pressed": "false" },
      on: { click: onToggleMode }
    });
    ui.toolbar = el("div", { className: "fc-toolbar" }, [
      el("div", { className: "fc-counter" }, [ui.total, ui.position]),
      ui.modeBtn
    ]);

    ui.stage = el("div", { className: "fc-stage" });

    ui.prevBtn = el("button", {
      className: "btn fc-prev",
      text: "上一張",
      attrs: { type: "button" },
      on: { click: function () { step(-1); } }
    });
    ui.flipBtn = el("button", {
      className: "btn btn--primary fc-flip",
      text: "翻面",
      attrs: { type: "button" },
      on: { click: onFlip }
    });
    ui.nextBtn = el("button", {
      className: "btn fc-next",
      text: "下一張",
      attrs: { type: "button" },
      on: { click: function () { step(1); } }
    });
    ui.nav = el("div", { className: "fc-nav" }, [ui.prevBtn, ui.flipBtn, ui.nextBtn]);

    ui.main = el("div", { className: "fc-main" }, [ui.toolbar, ui.stage, ui.nav]);

    ui.empty = el("div", { className: "card fc-empty", attrs: { hidden: true } }, [
      el("p", { className: "fc-empty__msg", text: "目前單字集是空的，沒有可以顯示的單字卡。" }),
      // （v0.10，FE-43；AC-06-06、R-19）提示不再提及目標分數：畫面只選色級
      el("p", { className: "fc-empty__hint", text: "請到難易度設定選擇色級並按「套用」，或新增自訂單字、注入領域範本。" }),
      el("button", {
        className: "btn btn--primary fc-empty__go",
        text: "前往難易度設定",
        attrs: { type: "button" },
        on: { click: function () { if (EMT.router) EMT.router.go("customizer"); } }
      })
    ]);

    dom().append(rootEl, [
      el("div", { className: "fc" }, [
        el("h2", { className: "fc-title", text: "單字卡" }),
        ui.main,
        ui.empty
      ])
    ]);
  }

  /** 目前狀態（store 不存在時回 null） */
  function getState() {
    var s = EMT.store;
    if (!s || typeof s.getState !== "function") return null;
    try {
      var st = s.getState();
      return st && st.runtime ? st : null;
    } catch (e) {
      return null;
    }
  }

  /** 取得 actions */
  function actions() {
    var s = EMT.store;
    return (s && s.actions) || {};
  }

  /** 上一張／下一張（頭尾按鈕已 disabled，store 也會忽略越界） */
  function step(delta) {
    var st = getState();
    if (!st) return;
    var i = st.runtime.flashcard.index + delta;
    if (i < 0 || i >= st.runtime.studySet.length) return;
    if (typeof actions().gotoCard === "function") actions().gotoCard(i);
  }

  /** 翻面（AC-06-02、AC-06-03） */
  function onFlip() {
    if (typeof actions().flipCard === "function") actions().flipCard();
  }

  /** 動畫模組（不存在回 null：只切換、不播放） */
  function motion() {
    var m = EMT.ui && EMT.ui.motion;
    return m && typeof m.enter === "function" ? m : null;
  }

  /** 目前時間（毫秒；觸控與 click 判斷共用同一時鐘） */
  function now() {
    var p = root.performance;
    return p && typeof p.now === "function" ? p.now() : Date.now();
  }

  /** touchstart（passive）：只記單指起點 */
  function onTouchStart(ev) {
    var t = ev.touches;
    if (!t || t.length !== 1) {
      gesture = null;
      return;
    }
    gesture = { x: t[0].clientX, y: t[0].clientY, moved: false };
  }

  /** touchmove（passive）：任一軸位移 ≥ TAP_SLOP_PX 標記為已位移；不取消預設行為，垂直捲動交給瀏覽器 */
  function onTouchMove(ev) {
    if (!gesture) return;
    var t = ev.touches;
    if (!t || t.length !== 1) {
      // 多指（如縮放）：放棄本次手勢，並擋掉隨後的 click
      gesture = null;
      suppressUntil = suppressUntilAfter(true, now());
      return;
    }
    if (movedBeyondSlop(t[0].clientX - gesture.x, t[0].clientY - gesture.y)) gesture.moved = true;
  }

  /** touchend（passive）：測驗模式忽略；依 swipeDecision 換卡（同步，AC-28-03） */
  function onTouchEnd(ev) {
    var g = gesture;
    gesture = null;
    if (!g) return;
    var st = getState();
    if (!st) return;
    var fc = st.runtime.flashcard || {};
    // 測驗模式不換題（AC-28-06）
    if (fc.mode !== "card") return;
    var c = ev.changedTouches && ev.changedTouches[0];
    if (!c) return;
    var dx = c.clientX - g.x;
    var dy = c.clientY - g.y;
    suppressUntil = suppressUntilAfter(g.moved || movedBeyondSlop(dx, dy), now());
    var set = Array.isArray(st.runtime.studySet) ? st.runtime.studySet : [];
    var d = swipeDecision(fc.mode, fc.index, set.length, dx, dy);
    if (d.action === "goto" && typeof actions().gotoCard === "function") actions().gotoCard(d.index);
  }

  /** touchcancel：瀏覽器接手（如開始捲動），放棄手勢並擋掉可能的 click */
  function onTouchCancel() {
    if (gesture) suppressUntil = suppressUntilAfter(true, now());
    gesture = null;
  }

  /** 點擊卡片翻面；滑動後補發的 click、點到卡片內的按鈕、連結、輸入框或語音面板時不翻（AC-28-02、AC-28-05） */
  function onCardClick(ev) {
    if (suppressClick(now(), suppressUntil)) return;
    var t = ev.target;
    while (t && t !== ev.currentTarget) {
      if (t.nodeType === 1) {
        var tag = t.tagName;
        if (tag === "BUTTON" || tag === "A" || tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
        if (t.classList && t.classList.contains("fc-speech")) return;
      }
      t = t.parentNode;
    }
    // 使用者正在選取文字時不翻面
    if (typeof root.getSelection === "function") {
      var sel = root.getSelection();
      if (sel && !sel.isCollapsed && String(sel).length > 0) return;
    }
    onFlip();
  }

  /** 「測驗模式」切換鈕（AC-09-01、AC-09-06） */
  function onToggleMode() {
    var st = getState();
    if (!st || typeof actions().setFlashcardMode !== "function") return;
    var next = st.runtime.flashcard.mode === "quiz" ? "card" : "quiz";
    var r = actions().setFlashcardMode(next);
    if (r && r.ok === false && r.reason === "insufficient") toast(INSUFFICIENT_MESSAGE, "error");
  }

  /** 建立一張卡片的 DOM（只渲染當前一張，AC-22-02） */
  function buildCard(card, model) {
    var el = dom().el;

    function fieldList(fields) {
      return el("dl", { className: "fc-fields" }, fields.map(function (f) {
        return el("div", { className: "fc-field fc-field--" + f.key }, [
          el("dt", { className: "fc-field__label", text: f.label }),
          el("dd", { className: "fc-field__value", text: f.value, attrs: f.key === "example" || f.key === "collocation" ? { lang: "en" } : null })
        ]);
      }));
    }

    var speech = el("div", { className: "fc-speech" });

    var frontChildren = [
      el("p", { className: "fc-word", text: model.word, attrs: { lang: "en" } })
    ];
    if (model.phonetic) frontChildren.push(el("p", { className: "fc-phonetic ipa", text: model.phonetic }));
    if (model.front.length > 0) frontChildren.push(fieldList(model.front));
    frontChildren.push(speech);

    var front = el("div", { className: "fc-face fc-front" }, frontChildren);
    var back = el("div", { className: "fc-face fc-back", attrs: { hidden: true } }, [
      el("p", { className: "fc-word fc-word--small", text: model.word, attrs: { lang: "en" } }),
      fieldList(model.back)
    ]);
    var attrib = el("div", { className: "fc-attrib" }, model.attribution.map(function (line) {
      return el("p", { className: "fc-attrib__line", text: line });
    }));

    var cardEl = el("div", {
      className: "card fc-card fc-card--" + model.kind,
      attrs: { "data-flipped": "false" },
      on: { click: onCardClick }
    }, [front, back, attrib]);

    // 觸控手勢（passive，不攔截捲動；§7.10）
    var passive = { passive: true };
    cardEl.addEventListener("touchstart", onTouchStart, passive);
    cardEl.addEventListener("touchmove", onTouchMove, passive);
    cardEl.addEventListener("touchend", onTouchEnd, passive);
    cardEl.addEventListener("touchcancel", onTouchCancel, passive);

    return { root: cardEl, front: front, back: back, speech: speech };
  }

  /**
   * 依 isFlipped 切換正反面（不重建 DOM，不重新掛語音面板）。
   * animate 為真時，翻面狀態有改變才播放翻轉動畫（AC-28-01）；新建卡片時不播放。
   */
  function applyFlip(flipped, animate) {
    if (!ui.card) return;
    applyFlipTo(ui.card, flipped, motion(), !!animate);
    ui.flipBtn.setAttribute("aria-pressed", flipped ? "true" : "false");
  }

  /**
   * 依狀態重繪（只動受影響部分）。
   * @param {object} st AppState
   * @param {boolean} force 強制重建卡片區
   */
  function render(st, force) {
    if (!ui || !st) return;
    var rt = st.runtime || {};
    var set = Array.isArray(rt.studySet) ? rt.studySet : [];
    var fc = rt.flashcard || { index: 0, isFlipped: false, mode: "card" };
    var n = set.length;

    // 空狀態（AC-06-06、AC-04-08）
    if (n === 0) {
      if (renderedKey !== "empty") {
        resetSpeech();
        dom().clear(ui.stage);
        ui.card = null;
        ui.quiz = null;
        renderedKey = "empty";
        lastCardIndex = null;
      }
      ui.main.hidden = true;
      ui.empty.hidden = false;
      return;
    }
    ui.main.hidden = false;
    ui.empty.hidden = true;

    var cm = counterModel(fc.index, n);
    dom().setText(ui.total, cm.total);
    dom().setText(ui.position, cm.position);
    ui.prevBtn.disabled = !cm.hasPrev;
    ui.nextBtn.disabled = !cm.hasNext;

    var quiz = fc.mode === "quiz";
    ui.modeBtn.setAttribute("aria-pressed", quiz ? "true" : "false");
    ui.modeBtn.classList.toggle("is-active", quiz);
    ui.flipBtn.hidden = quiz;

    var idx = Math.min(Math.max(fc.index, 0), n - 1);
    var card = set[idx];
    var key = quiz ? "quiz" : "card|" + idx + "|" + (card ? card.wordKey : "");

    if (force || key !== renderedKey) {
      // 卡片區內容改變：先停止語音（換卡、切換模式，AC-07-03、AC-08-10）
      if (renderedKey !== null && renderedKey !== "empty") resetSpeech();
      var prevWasQuiz = renderedKey === "quiz";
      renderedKey = key;
      if (quiz) {
        lastCardIndex = null;
        gesture = null;
        if (!prevWasQuiz || !ui.quiz || force) {
          dom().clear(ui.stage);
          ui.card = null;
          ui.quiz = dom().el("div", { className: "card fc-quiz" });
          ui.stage.appendChild(ui.quiz);
        }
      } else {
        dom().clear(ui.stage);
        ui.quiz = null;
        var model = cardModel(card, { posLabels: posLabels(), registry: registry() });
        var prevIdx = lastCardIndex;
        ui.card = buildCard(card, model);
        ui.stage.appendChild(ui.card.root);
        applyFlip(!!fc.isFlipped, false);
        lastCardIndex = idx;
        gesture = null;
        // 換卡滑入（按鈕與滑動皆適用）；回到本頁（force）或索引未變（刪除後同位置換字）不播放
        var slide = force ? null : slideClassFor(prevIdx, idx);
        if (slide && motion()) motion().enter(ui.card.root, slide, interaction().UI.SLIDE_ANIM_MS);
        callComponent("speechPanel", "render", [ui.card.speech, card, st]);
        return;
      }
    }

    if (quiz) {
      // 測驗模式：每次相關變更都交給 FE-13 重繪（冪等）
      if (!callComponent("flashcardQuiz", "render", [ui.quiz, st])) {
        if (!ui.quiz.firstChild) {
          ui.quiz.appendChild(dom().el("p", { className: "fc-quiz__na", text: "測驗模式目前無法使用。" }));
        }
      }
    } else {
      applyFlip(!!fc.isFlipped, true);
    }
  }

  /** store 通知：只在單字卡相關範圍變更時重繪 */
  var WATCH_TAGS = { init: 1, studySet: 1, flashcard: 1, quiz: 1, customVocab: 1 };
  function onStore(st, tags) {
    var hit = false;
    var list = Array.isArray(tags) ? tags : [];
    for (var i = 0; i < list.length; i++) {
      if (WATCH_TAGS[list[i]] === 1) { hit = true; break; }
    }
    if (hit) render(st, false);
  }

  var view = {
    /** 第一次顯示前建立骨架並訂閱 store */
    mount: function (rootEl) {
      if (ui || !rootEl) return;
      build(rootEl);
      var s = EMT.store;
      if (s && typeof s.subscribe === "function") unsubscribe = s.subscribe(onStore);
      // 首次繪製交給緊接著的 show()，避免重複掛載語音面板
    },
    /** 回到本頁：依最新狀態重繪（重建卡片區以重新掛語音面板） */
    show: function () {
      render(getState(), true);
    },
    /**
     * 離開本頁：停止朗讀與聆聽（AC-07-03、AC-08-10），並釋放麥克風（AC-33-02，§4.4 v0.5）。
     * 語音面板沒有 release 時退回 reset。
     */
    hide: function () {
      releaseSpeech();
    }
  };

  // 供除錯與測試存取純邏輯
  EMT.views = EMT.views || {};
  EMT.views.flashcardsLogic = logic;

  if (typeof EMT.views.register === "function") {
    EMT.views.register(TAB_ID, view);
  }
})(typeof self !== "undefined" ? self : this);
