/*
 * views/customizer.js — 難易度設定頁（FE-09；R-15 畫面名稱更新，FE-23；色級大卡片，FE-27；首次畫面，FE-32）
 * 依據：architecture.md §4.2、§4.3（setDraftScore／clickColor／applyGoal）、§7.1（core/goal.js）、§9（v0.4 色級大卡片）；
 *       契約 COLOR_LEVELS、GoalState、SCORE_MIN、SCORE_MAX、SCORE_STEP、N_O；PRD 色級定義表、Q-15、Q-28、Q-32。
 * 涵蓋：AC-01-01～AC-01-03、AC-01-05～AC-01-07、AC-02-01、AC-02-02、AC-02-05～AC-02-10、AC-03-03、AC-22-04、
 *       AC-26-01～AC-26-04、AC-25-06（一般頁）；（FE-32）US-25、AC-25-01～AC-25-03、AC-25-10、AC-25-11、AC-18-02；
 *       （FE-40）US-32、AC-32-01、AC-32-02、AC-32-04、AC-32-08、AC-32-11、AC-01-02、AC-03-05；
 *       （FE-43，PRD v0.10 R-19、契約 v0.10 §5.9 GS-1～GS-8）AC-26-05、AC-26-06、AC-32-04（取消回原色級）
 *
 * （v0.10，FE-43；architecture.md v0.6 §7.17）只選色級、不顯示分數：
 * - 分數區（滑桿、輸入框、錯誤提示）程式保留（R-19 允許），但建立時即 hidden + inert，任何路徑都不改回可見；
 *   滑桿與輸入框另加 disabled、tabindex="-1"（不可見、不可聚焦，AC-26-05）
 * - 卡片不顯示分數範圍；狀態列不顯示「目前目標分數」；目標分數只存在資料中
 * - 「套用」「開始學習」不讀輸入框，直接以 store 的 draftScore 套用（GS-3、AC-26-06）
 *
 * 版面（掛在 #customizer-goal）：
 * - 狀態列（.cz-status-slot）：「目前目標色級」「目前生效色級」（藍、金套用後生效顯示「綠（內建上限）」）
 * - 色級區：橘、棕、綠、藍、金 5 張大卡片（整張為 <button>，aria-pressed 表示選中）；點擊呼叫 actions.clickColor
 *   （GS-2：draftScore = 該色 scoreMax）；選中卡片 = colorOf(draftScore)；只切換 aria-pressed 與選中 class，
 *   不重建卡片（AC-26-03、AC-22-04）
 * - 分數區（v0.10 隱藏且停用）：滑桿與數字輸入框雙向同步；每次有效變更呼叫 actions.setDraftScore
 * - 試算區：對應色級、建議總字量、每日新字量、預計週數與提示
 * - 「套用」按鈕（.cz-actions）：呼叫 actions.requestApplyGoal（未套用離開頁面不改生效色級）
 *   （v0.5，FE-40；architecture.md §7.15）回 "confirm" 時開初始化確認視窗（EMT.ui.dialog.confirm）：
 *   「確定」→ actions.confirmApplyGoal（失敗 toast「儲存空間不足，未套用」）；取消、Esc、點視窗外 → actions.cancelApplyGoal。
 *   視窗開啟中以區域旗標 pending 忽略再次按「套用」。本檔不直接呼叫 applyGoal（SD-FB-26，測試以原始碼掃描鎖定）。
 *   狀態列與按鈕區各自為獨立容器，供首次模式（FE-32）只替換這兩區
 * - （v0.4，FE-32）首次模式（runtime.entryMode = "firstRun"；architecture.md §7.9、契約 §5.5 FS-3）：
 *   標題下顯示引導文字（取代一般說明）；按鈕區改為「開始學習」（actions.startLearning）與
 *   「從備份還原」（EMT.ui.importFlow.start()）；隱藏狀態列與「套用」。
 *   收到 "entry" tag 切回一般模式時只重建按鈕區並顯示狀態列，不重建卡片與分數區。
 *   卡片、分數、試算在兩種模式行為相同（AC-26-*）；切到主控台由 router 依 "entry" tag 處理。
 *
 * 規則：
 * - 試算數值完全由 core/goal.js 計算（estimate、colorOf、levelOf…），本檔只負責顯示文字。
 * - DOM 只建立一次（啟動後閒置預建，或第一次 mount，以先到者為準）；之後的更新只改既有節點的文字與屬性，
 *   不重建（AC-02-07、AC-22-04）。閒置預建讓第一次切到本頁時不必在點擊事件內建 DOM（AC-22-01，BUG-002）。
 * - 所有文字以 textContent 寫入（經 EMT.core.dom），不使用任何 HTML 字串 API（C-7）。
 * - 純顯示邏輯（cardModels、estimateTexts、statusTexts、formatInt）不碰 DOM，Node 下可 require 測試。
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === "object" && module.exports) {
    // Node：匯出純函式供測試；createView 另外匯出，供以假的 root 測試建立時機（不碰真實 DOM）
    module.exports = Object.assign({}, api.helpers, { createView: api.createView });
  } else {
    root.EMT = root.EMT || {};
    if (root.EMT.views && typeof root.EMT.views.register === "function") {
      root.EMT.views.register("customizer", api.createView(root));
    }
  }
})(typeof self !== "undefined" ? self : this, function (root) {
  "use strict";

  // ── 取得 core 模組：Node 下 require，瀏覽器下讀 EMT.core.*（呼叫時才取用，LD-1）──
  var coreCache = null;
  function core() {
    if (coreCache) { return coreCache; }
    if (typeof require === "function" && typeof module === "object") {
      coreCache = { G: require("../core/goal.js"), C: require("../core/constants.js") };
    } else {
      var c = root.EMT.core;
      coreCache = { G: c.goal, C: c.constants };
    }
    return coreCache;
  }

  // ── 畫面文字（PRD 以「」標出者逐字使用）──
  var T = {
    title: "難易度設定",
    intro: "選擇色級即時試算，按「套用」後才會更新單字卡的單字集。",
    statusTarget: "目前目標色級",
    statusEffective: "目前生效色級",
    builtinCap: "（內建上限）",
    colorHeading: "色級",
    vocabNote: "本系統建議字量",
    vocabLabel: "內建字數",
    dailyLabel: "每日新字量",
    trialOnly: "僅供試算",
    picked: "已選擇",
    pending: "待定",
    comingSoon: "即將開放",
    scoreHeading: "目標分數",
    scoreSlider: "目標分數滑桿",
    scoreInput: "目標分數",
    invalid: "請輸入 10～990 的分數",
    estimateHeading: "試算結果",
    estColor: "對應色級", // （FE-43／FE-44 修正）不含「分數」字樣
    estTarget: "建議總字量",
    estDaily: "每日新字量",
    estWeeks: "預計週數",
    estMastered: "已掌握單字數",
    achieved: "已達成目標字量",
    basedOnGreen: "以目前內建字庫上限（綠）試算",
    greenCap: "目前內建字庫到綠色為止",
    apply: "套用",
    // （FE-32）首次畫面
    startLearning: "開始學習",
    restore: "從備份還原",
    firstRunGuide: "先選擇你的目標難易度，按「開始學習」後進入主控台。",
    applied: "已套用目標",
    // （FE-40）切換難易度初始化確認視窗（AC-32-01、Q-38；architecture.md §7.15 確認視窗表）
    reinitTitle: "切換難易度",
    reinitLine1: "目前已有學習統計資料，切換難易度將初始化學習紀錄。",
    reinitLine2: "建議先按「取消」，到主控台按「匯出備份」保存目前紀錄。",
    reinitOk: "確定",
    reinitCancel: "取消",
    applyFailed: "儲存空間不足，未套用",
    unknown: "—",
    wordsUnit: " 字",
    dailyUnit: " 字/天",
    weeksUnit: " 週"
  };

  // ── 純函式（不碰 DOM）──

  /**
   * 整數加千分位（2809 → "2,809"）；非有限數回傳「—」。
   * 不依賴 Intl，確保各瀏覽器輸出一致。
   * @param {number} n
   * @returns {string}
   */
  function formatInt(n) {
    if (typeof n !== "number" || !isFinite(n)) { return T.unknown; }
    var s = String(Math.round(Math.abs(n)));
    var out = "";
    while (s.length > 3) {
      out = "," + s.slice(-3) + out;
      s = s.slice(0, -3);
    }
    return (n < 0 ? "-" : "") + s + out;
  }

  /** 字庫數量：資料缺漏（非正數）時視為無法取得 */
  function positiveOrNull(n) {
    return typeof n === "number" && isFinite(n) && n > 0 ? n : null;
  }

  /**
   * 色級名稱（顯示用）：藍、金加註「（即將開放）」（AC-01-07、AC-02-10）。
   * @param {object} G core/goal.js
   * @param {string|null} colorId
   * @returns {string}
   */
  function colorLabel(G, colorId) {
    var lv = G.levelOf(colorId);
    if (!lv) { return T.unknown; }
    return G.isOpenColor(colorId) ? lv.nameZh : lv.nameZh + "（" + T.comingSoon + "）";
  }

  /**
   * 5 張色級卡片的顯示模型（AC-01-01、AC-26-01、AC-26-03）。順序同契約 COLOR_LEVELS（橘、棕、綠、藍、金）。
   * - （v0.10，AC-26-05）不含分數範圍（scoreMin／scoreMax 不顯示）
   * - 內建字數：橘 nO、棕 nB、綠 nG 的實際數字（非正數視為資料缺漏，顯示「—」）；藍、金「待定」
   * - 每日新字量：取自 core/goal.js dailyNewWords（橘 10、棕 10、綠 15、藍金 20）；藍、金加註「僅供試算」
   * - 選中：colorOf(draftScore)；分數無效時沒有卡片選中
   * @param {number} nO 橘色建議字量（契約常數 N_O）
   * @param {number} nB 棕色建議字量（實際資料計算）
   * @param {number} nG 綠色建議字量（實際資料計算）
   * @param {number} draftScore 目前草稿分數
   * @returns {Array<{id: string, name: string, vocab: string, vocabNote: string, daily: string,
   *          dailyNote: string, scenario: string, locked: boolean, badge: string, selected: boolean}>}
   */
  function cardModels(nO, nB, nG, draftScore) {
    var k = core();
    var G = k.G;
    var counts = { N_O: positiveOrNull(nO), N_B: positiveOrNull(nB), N_G: positiveOrNull(nG) };
    var selectedId = G.colorOf(draftScore);
    return k.C.COLOR_LEVELS.map(function (level) {
      var open = G.isOpenColor(level.id);
      var vocab;
      if (!open) {
        vocab = T.pending;
      } else {
        var n = Object.prototype.hasOwnProperty.call(counts, level.vocabTarget) ? counts[level.vocabTarget] : null;
        vocab = n === null ? T.unknown : formatInt(n) + T.wordsUnit;
      }
      var daily = G.dailyNewWords(level.scoreMin);
      return {
        id: level.id,
        name: level.nameZh,
        vocab: vocab,
        vocabNote: T.vocabNote,
        daily: daily === null ? T.unknown : formatInt(daily) + T.dailyUnit,
        dailyNote: open ? "" : T.trialOnly,
        scenario: level.scenarioZh,
        locked: !open,
        badge: open ? "" : T.comingSoon,
        selected: level.id === selectedId
      };
    });
  }

  /**
   * 試算區文字（AC-02-03～AC-02-06、AC-02-10）。數值全部來自 G.estimate。
   * @param {object} G core/goal.js
   * @param {number} score 已修正的分數
   * @param {number} mastered 已掌握單字數 CurrentVocab
   * @param {number} nB
   * @param {number} nG
   * @returns {{color: string, target: string, daily: string, weeks: string, achieved: boolean,
   *            basedOnGreen: boolean, greenCap: boolean, mastered: string}}
   */
  function estimateTexts(G, score, mastered, nB, nG) {
    var e = G.estimate(score, mastered, positiveOrNull(nB), positiveOrNull(nG));
    var open = G.isOpenColor(e.color);
    var target;
    if (!e.color) { target = T.unknown; }
    else if (!open) { target = T.pending; }
    else { target = e.targetVocab === null ? T.unknown : formatInt(e.targetVocab) + T.wordsUnit; }
    return {
      color: colorLabel(G, e.color),
      target: target,
      daily: e.dailyNewWords === null ? T.unknown : formatInt(e.dailyNewWords) + T.dailyUnit,
      weeks: e.weeks === null ? T.unknown : formatInt(e.weeks) + T.weeksUnit,
      achieved: !!e.achieved,
      basedOnGreen: !!e.basedOnGreen,
      greenCap: !!e.color && !open,
      mastered: formatInt(typeof mastered === "number" && mastered > 0 ? mastered : 0)
    };
  }

  /**
   * 狀態列文字（AC-01-02、AC-01-06、AC-01-07）。（v0.10，AC-26-05 (b)）不含目標分數。
   * @param {object} G core/goal.js
   * @param {{appliedColor: string, effectiveColor: string}} goal
   * @returns {{target: string, effective: string, greenCap: boolean}}
   */
  function statusTexts(G, goal) {
    var applied = goal && goal.appliedColor;
    var eff = goal && goal.effectiveColor;
    var lvEff = G.levelOf(eff);
    var lvApplied = G.levelOf(applied);
    var capped = !!lvApplied && !G.isOpenColor(applied);
    return {
      target: lvApplied ? lvApplied.nameZh : T.unknown,
      effective: lvEff ? (capped ? lvEff.nameZh + T.builtinCap : lvEff.nameZh) : T.unknown,
      greenCap: capped
    };
  }

  /**
   * 目前的進入模式（契約 EntryMode）：只有 runtime.entryMode === "firstRun" 時為首次模式，其餘（含缺漏）為一般。
   * @param {object} state AppState
   * @returns {"firstRun"|"main"}
   */
  function entryModeOf(state) {
    return state && state.runtime && state.runtime.entryMode === "firstRun" ? "firstRun" : "main";
  }

  /**
   * 按鈕區與狀態列的顯示模型（FE-32；AC-25-01、AC-25-06）。
   * - 首次：引導文字、「開始學習」（主要按鈕）、「從備份還原」；無「套用」、無狀態列、不顯示一般說明
   * - 一般：「套用」、狀態列、一般說明；無首次按鈕與引導文字
   * @param {string} entryMode "firstRun"｜"main"（其他值視為 "main"）
   * @returns {{mode: string, showStatus: boolean, showIntro: boolean, guide: string,
   *          buttons: Array<{action: string, text: string, primary: boolean}>}}
   */
  function actionsModel(entryMode) {
    if (entryMode === "firstRun") {
      return {
        mode: "firstRun",
        showStatus: false,
        showIntro: false,
        guide: T.firstRunGuide,
        buttons: [
          { action: "start", text: T.startLearning, primary: true },
          { action: "restore", text: T.restore, primary: false }
        ]
      };
    }
    return {
      mode: "main",
      showStatus: true,
      showIntro: true,
      guide: "",
      buttons: [{ action: "apply", text: T.apply, primary: true }]
    };
  }

  /**
   * （FE-40）初始化確認視窗的參數（AC-32-01、Q-38）：內文兩行以 \n 分行（dialog 以 pre-line 顯示），
   * 只有「確定」「取消」2 個按鈕。每次回傳新物件。
   * @returns {{title: string, message: string, okText: string, cancelText: string}}
   */
  function reinitDialogOptions() {
    return {
      title: T.reinitTitle,
      message: T.reinitLine1 + "\n" + T.reinitLine2,
      okText: T.reinitOk,
      cancelText: T.reinitCancel
    };
  }

  var helpers = {
    TEXT: T,
    reinitDialogOptions: reinitDialogOptions,
    entryModeOf: entryModeOf,
    actionsModel: actionsModel,
    formatInt: formatInt,
    colorLabel: colorLabel,
    cardModels: cardModels,
    estimateTexts: estimateTexts,
    statusTexts: statusTexts
  };

  // ── 頁面模組（瀏覽器）──

  /**
   * 建立難易度設定頁面模組。
   * @param {object} root 全域物件（window）
   * @returns {{mount: Function, show: Function, hide: Function}}
   */
  function createView(root) {
    var EMT = root.EMT;
    var D, G, C;            // core/dom、core/goal、core/constants（mount 時取用）
    var host = null;        // #customizer-goal
    var refs = {};          // 需要更新的節點
    var colorButtons = {};  // colorId → { node: button, base: 基本 class }
    var selectedColor;      // 目前標示選中的色級（undefined = 尚未標示）
    var unsubscribe = null;
    var typing = false;     // 數字輸入框正在輸入（input 事件期間不覆寫使用者正在打的字）
    var busy = false;       // 本頁自己呼叫 action 期間略過 store 通知（由事件處理自行局部更新）
    var mode = null;        // （FE-32）按鈕區目前呈現的進入模式："firstRun"｜"main"
    var pending = false;    // （FE-40）初始化確認視窗開啟中：忽略再次按「套用」

    function store() { return EMT.store; }

    /** 呼叫 store action；期間的通知由呼叫端自行局部更新，避免重複重繪 */
    function act(fn) {
      busy = true;
      try { return fn(store().actions); } finally { busy = false; }
    }
    function content() { return EMT.content || {}; }
    function goalState() { return store().getState().data.goal; }
    function masteredCount() {
      var keys = store().getState().data.masteredWordKeys;
      return Array.isArray(keys) ? keys.length : 0;
    }

    /** 標籤 + 數值的一列（數值節點存入 refs） */
    function row(label, key, extraClass) {
      var value = D.el("dd", { className: "cz-row__value" + (extraClass ? " " + extraClass : "") });
      refs[key] = value;
      return D.el("div", { className: "cz-row" }, [D.el("dt", { className: "cz-row__label", text: label }), value]);
    }

    /** 鎖定圖示（SVG，不用 emoji） */
    function lockIcon() {
      return D.svg("svg", { "class": "cz-lock", viewBox: "0 0 16 16", width: "16", height: "16", "aria-hidden": "true", focusable: "false" }, [
        D.svg("rect", { x: "3", y: "7", width: "10", height: "8", rx: "1.5" }),
        D.svg("path", { d: "M5 7V5a3 3 0 0 1 6 0v2", fill: "none", "stroke-width": "1.6" })
      ]);
    }

    /** 建立單一色級卡片（整張為 button；內容依 cardModels） */
    function buildColorCard(m) {
      var head = [D.el("span", { className: "cz-color__name", text: m.name })];
      if (m.locked) {
        head.push(D.el("span", { className: "cz-color__badge" }, [lockIcon(), D.el("span", { text: m.badge })]));
      }
      // 「已選擇」：僅在 aria-pressed="true" 時由 CSS 顯示（不只靠顏色，也給螢幕閱讀器）
      head.push(D.el("span", { className: "cz-color__picked", text: T.picked }));
      var daily = [D.el("span", { text: T.dailyLabel + "：" }), D.el("strong", { text: m.daily })];
      if (m.dailyNote) {
        daily.push(D.el("span", { className: "cz-color__note", text: "（" + m.dailyNote + "）" }));
      }
      var base = "cz-color cz-color--" + m.id + (m.locked ? " is-locked" : "");
      var btn = D.el("button", {
        className: base,
        attrs: { type: "button", "aria-pressed": "false", "data-color": m.id },
        on: { click: function () { onColorClick(m.id); } }
      }, [
        D.el("span", { className: "cz-color__head" }, head),
        D.el("span", { className: "cz-color__vocab" }, [
          D.el("span", { text: T.vocabLabel + "：" }),
          D.el("strong", { text: m.vocab }),
          D.el("span", { className: "cz-color__note", text: "（" + m.vocabNote + "）" })
        ]),
        D.el("span", { className: "cz-color__daily" }, daily),
        D.el("span", { className: "cz-color__scenario", text: m.scenario })
      ]);
      colorButtons[m.id] = { node: btn, base: base };
      return btn;
    }

    /** 建立整頁（只在 mount 時一次） */
    function build() {
      var ct = content();
      var levels = cardModels(C.N_O, ct.nB, ct.nG, goalState().draftScore).map(buildColorCard);

      // （v0.10，AC-26-05）滑桿與輸入框停用（disabled）且移出 Tab 順序（tabindex="-1"）：
      // 即使日後 CSS 誤改分數區的 display，也無法聚焦或輸入（architecture.md §7.17 三重保證之 (3)）
      var slider = D.el("input", {
        className: "cz-score__range",
        attrs: { type: "range", id: "cz-score-range", min: String(C.SCORE_MIN), max: String(C.SCORE_MAX),
          step: String(C.SCORE_STEP), "aria-label": T.scoreSlider, disabled: true, tabindex: "-1" },
        on: { input: onSliderInput, change: onSliderInput }
      });
      var input = D.el("input", {
        className: "cz-score__input",
        attrs: { type: "text", id: "cz-score-input", inputmode: "numeric", autocomplete: "off",
          "aria-describedby": "cz-score-error", maxlength: "10", disabled: true, tabindex: "-1" },
        on: { input: onNumberInput, change: onNumberCommit, blur: onNumberCommit }
      });
      var error = D.el("p", { className: "field__error cz-score__error", attrs: { id: "cz-score-error", role: "alert" } });
      error.hidden = true;
      refs.slider = slider;
      refs.input = input;
      refs.error = error;

      // 試算區（input 事件只更新這一區的文字節點）
      var note = D.el("p", { className: "cz-note", text: T.basedOnGreen });
      var achieved = D.el("p", { className: "cz-achieved", text: T.achieved });
      var cap = D.el("p", { className: "cz-warning", attrs: { role: "status" }, text: T.greenCap });
      refs.note = note;
      refs.achieved = achieved;
      refs.cap = cap;
      var estimate = D.el("section", { className: "card cz-estimate", attrs: { "aria-labelledby": "cz-estimate-title", "aria-live": "polite" } }, [
        D.el("h3", { className: "cz-heading", attrs: { id: "cz-estimate-title" }, text: T.estimateHeading }),
        D.el("dl", { className: "cz-rows" }, [
          row(T.estColor, "estColor", "cz-est-color"),
          row(T.estTarget, "estTarget", "cz-est-target"),
          row(T.estDaily, "estDaily", "cz-est-daily"),
          row(T.estWeeks, "estWeeks", "cz-est-weeks"),
          row(T.estMastered, "estMastered", "cz-est-mastered")
        ]),
        achieved,
        note,
        cap
      ]);

      var statusCap = D.el("p", { className: "cz-warning cz-status__cap", text: T.greenCap });
      refs.statusCap = statusCap;
      var status = D.el("section", { className: "card cz-status", attrs: { "aria-label": "目前目標狀態" } }, [
        D.el("dl", { className: "cz-rows cz-rows--status" }, [
          row(T.statusTarget, "stTarget", "cz-st-target"),
          row(T.statusEffective, "stEffective", "cz-st-effective")
        ]),
        statusCap
      ]);

      // 狀態列與按鈕區各放獨立容器（FE-32 首次模式只替換這兩區，不動卡片與分數區）
      var statusSlot = D.el("div", { className: "cz-status-slot" }, [status]);
      refs.statusSlot = statusSlot;

      // （FE-32）首次畫面引導文字與一般說明：依模式切換 hidden（renderMode）
      refs.guide = D.el("p", { className: "cz-guide", attrs: { id: "cz-guide" }, text: T.firstRunGuide });
      refs.intro = D.el("p", { className: "cz-intro", text: T.intro });

      // （v0.10，FE-43；GS-6、AC-26-05）分數區程式保留，但建立時即 hidden + inert；之後任何路徑都不改回可見。
      // 錯誤提示 #cz-score-error 在此區內，輸入元件停用後也不會再觸發
      var scoreSection = D.el("section", { className: "card cz-score", attrs: { "aria-labelledby": "cz-score-title", inert: "" } }, [
        D.el("h3", { className: "cz-heading", attrs: { id: "cz-score-title" }, text: T.scoreHeading }),
        D.el("div", { className: "cz-score__controls" }, [
          slider,
          D.el("div", { className: "field cz-score__field" }, [
            D.el("label", { className: "field__label", attrs: { "for": "cz-score-input" }, text: T.scoreInput + "（" + C.SCORE_MIN + "～" + C.SCORE_MAX + "）" }),
            input
          ])
        ]),
        error
      ]);
      scoreSection.hidden = true;
      refs.scoreSection = scoreSection;

      var page = D.el("div", { className: "cz" }, [
        D.el("h2", { className: "cz-title", text: T.title }),
        refs.guide,
        refs.intro,
        statusSlot,
        D.el("section", { className: "cz-colors-wrap", attrs: { "aria-labelledby": "cz-colors-title" } }, [
          D.el("h3", { className: "cz-heading", attrs: { id: "cz-colors-title" }, text: T.colorHeading }),
          D.el("div", { className: "cz-colors" }, levels)
        ]),
        scoreSection,
        estimate,
        // 按鈕區內容依進入模式建立（renderMode）
        refs.actions = D.el("div", { className: "btn-row cz-actions" })
      ]);
      D.clear(host);
      host.appendChild(page);
    }

    // ── 局部更新（只改既有節點）──

    /** 試算區：依分數更新文字與提示的顯示（AC-02-07：不重建節點） */
    function renderEstimate(score) {
      var ct = content();
      var t = estimateTexts(G, score, masteredCount(), ct.nB, ct.nG);
      D.setText(refs.estColor, t.color);
      D.setText(refs.estTarget, t.target);
      D.setText(refs.estDaily, t.daily);
      D.setText(refs.estWeeks, t.weeks);
      D.setText(refs.estMastered, t.mastered + T.wordsUnit);
      refs.achieved.hidden = !t.achieved;
      refs.note.hidden = !t.basedOnGreen;
      refs.cap.hidden = !t.greenCap;
      renderSelected(G.colorOf(score));
    }

    /**
     * 卡片選中狀態（AC-26-02、AC-26-03）：只改 aria-pressed 與選中 class，不重建卡片；
     * 選中色級沒變時不碰 DOM（拖曳滑桿時多數 input 事件不需更新，AC-22-04）。
     * @param {string|null} color
     */
    function renderSelected(color) {
      if (color === selectedColor) { return; }
      selectedColor = color;
      for (var id in colorButtons) {
        if (Object.prototype.hasOwnProperty.call(colorButtons, id)) {
          var on = id === color;
          var card = colorButtons[id];
          card.node.setAttribute("aria-pressed", on ? "true" : "false");
          card.node.className = on ? card.base + " is-selected" : card.base;
        }
      }
    }

    /** 依 actionsModel 的按鈕描述建立按鈕 */
    function buildActionButton(b) {
      if (b.action === "apply") {
        return D.el("button", {
          className: "btn btn--primary cz-apply",
          attrs: { type: "button", id: "cz-apply" },
          text: b.text,
          on: { click: onApply }
        });
      }
      if (b.action === "start") {
        return D.el("button", {
          className: "btn btn--primary cz-start",
          attrs: { type: "button", id: "cz-start" },
          text: b.text,
          on: { click: onStartLearning }
        });
      }
      return D.el("button", {
        className: "btn btn--secondary cz-restore",
        attrs: { type: "button", id: "cz-restore" },
        text: b.text,
        on: { click: onRestore }
      });
    }

    /**
     * （FE-32）依進入模式呈現按鈕區、狀態列、引導文字與一般說明。
     * 模式沒變時不碰 DOM；變更時只重建按鈕區（卡片、分數、試算區不動，AC-26-*）。
     * @param {"firstRun"|"main"} next
     */
    function renderMode(next) {
      if (next === mode) { return; }
      mode = next;
      var m = actionsModel(next);
      D.clear(refs.actions);
      for (var i = 0; i < m.buttons.length; i++) {
        refs.actions.appendChild(buildActionButton(m.buttons[i]));
      }
      refs.actions.className = "btn-row cz-actions" + (m.mode === "firstRun" ? " cz-actions--first-run" : "");
      refs.statusSlot.hidden = !m.showStatus;
      refs.guide.hidden = m.mode !== "firstRun";
      refs.intro.hidden = !m.showIntro;
    }

    /** 狀態列：目前目標色級、目前生效色級（v0.10 不顯示目標分數） */
    function renderStatus() {
      var t = statusTexts(G, goalState());
      D.setText(refs.stTarget, t.target);
      D.setText(refs.stEffective, t.effective);
      refs.statusCap.hidden = !t.greenCap;
    }

    /** 隱藏錯誤提示 */
    function clearError() {
      if (!refs.error.hidden) {
        refs.error.hidden = true;
        D.setText(refs.error, "");
        refs.input.removeAttribute("aria-invalid");
      }
    }

    /** 顯示錯誤提示（試算區維持上一個有效值，AC-02-02） */
    function showError(message) {
      D.setText(refs.error, message || T.invalid);
      refs.error.hidden = false;
      refs.input.setAttribute("aria-invalid", "true");
    }

    /** 依 store 的 draftScore 同步滑桿、輸入框（v0.10 已隱藏，同步無害）、試算區與選中卡片 */
    function syncDraft() {
      var score = goalState().draftScore;
      refs.slider.value = String(score);
      if (!typing) {
        refs.input.value = String(score);
        clearError();
      }
      renderEstimate(score);
    }

    // ── 事件處理 ──

    /** 滑桿：每次 input 即寫入 draftScore 並同步輸入框（AC-02-01） */
    function onSliderInput() {
      typing = false;
      var r = act(function (a) { return a.setDraftScore(Number(refs.slider.value)); });
      if (r && r.ok) {
        refs.input.value = String(r.score);
        clearError();
        renderEstimate(r.score);
      }
    }

    /**
     * 數字輸入框 input：有效就試算並同步滑桿，保留使用者輸入的字（723 不立刻改成 725）；
     * 無效就顯示提示，試算維持上一個有效值（AC-02-02）。
     */
    function onNumberInput() {
      typing = true;
      var r = act(function (a) { return a.setDraftScore(refs.input.value); });
      if (r && r.ok) {
        clearError();
        refs.slider.value = String(r.score);
        renderEstimate(r.score);
      } else {
        showError(r && r.error);
      }
    }

    /** 數字輸入框 change／blur：有效值修正顯示為 5 的倍數（723 → 725，AC-02-09） */
    function onNumberCommit() {
      typing = false;
      var r = G.parseScoreInput(refs.input.value);
      if (r.ok) {
        refs.input.value = String(r.score);
        clearError();
      }
      // 無效值保留原字與提示，讓使用者修正；試算維持上一個有效值
    }

    /**
     * 色級卡片（v0.10，GS-2：draftScore = 該色 scoreMax；藍、金不阻擋，AC-01-07）。
     * 在 handler 內同步完成 clickColor → renderEstimate，只改既有節點文字與 aria-pressed，不重建 DOM（AC-22-04）。
     */
    function onColorClick(colorId) {
      typing = false;
      act(function (a) { a.clickColor(colorId); });
      syncDraft();
    }

    /** 顯示 toast（模組缺漏時略過：toast 只是提示，不影響狀態） */
    function toast(text, kind) {
      if (EMT.ui && EMT.ui.toast && typeof EMT.ui.toast.show === "function") {
        EMT.ui.toast.show(text, { kind: kind });
      }
    }

    /** 依 store 同步分數區、試算、卡片選中與狀態列（AC-32-04、GS-8：取消後選中卡片回到 Color(appliedScore)） */
    function syncAll() {
      typing = false;
      syncDraft();
      renderStatus();
    }

    /**
     * 套用（AC-01-02、AC-01-07；v0.5 FE-40：AC-32-01、AC-32-04、AC-32-05～AC-32-07）。
     * 一律經 requestApplyGoal；需要初始化時先開確認視窗（architecture.md §7.15 流程）。
     * （v0.10，GS-3、AC-26-06）不讀隱藏的輸入框：直接以 store 的 draftScore 套用（未點卡片時即為原值）。
     */
    function onApply() {
      typing = false;
      if (pending) { return; }   // 視窗開啟中再按忽略（背景本已被遮罩攔截，此為保險）
      var res = act(function (a) { return a.requestApplyGoal(); });
      var status = res && res.status;
      if (status === "confirm") {
        // 尚未改任何狀態（CI-10）；選中卡片維持使用者選的色級直到視窗關閉
        syncDraft();
        openReinitDialog();
        return;
      }
      syncAll();
      if (status === "applied") { toast(T.applied, "success"); }
    }

    /**
     * （FE-40）初始化確認視窗（AC-32-01）。確定 → confirmApplyGoal；取消／Esc／點視窗外 → cancelApplyGoal（AC-32-04）。
     * store 的 action 不包在 act 內：其 goal 等 tag 通知照常讓各 view（含本頁）重繪；本頁另外補一次同步，確保輸入框值回到 draftScore。
     */
    function openReinitDialog() {
      var dialog = EMT.ui && EMT.ui.dialog;
      if (!dialog || typeof dialog.confirm !== "function") {
        // 程式組裝錯誤（LD-3）：狀態未改（requestApplyGoal 回 confirm 時不動任何資料），還原草稿後丟出
        store().actions.cancelApplyGoal();
        syncAll();
        throw new Error("[EMT.customizer] 缺少模組：EMT.ui.dialog");
      }
      pending = true;
      var p;
      try {
        p = Promise.resolve(dialog.confirm(reinitDialogOptions()));
      } catch (e) {
        p = Promise.reject(e);
      }
      return p.then(function (ok) {
        pending = false;
        var a = store().actions;
        if (ok === true) {
          var w = a.confirmApplyGoal();
          syncAll();
          if (w && w.ok) {
            toast(T.applied, "success");
          } else if (!w || w.reason !== "firstRun") {
            // quota／error：store 已還原記憶體 draftScore，localStorage 保持原值（AC-32-11 (b)、CI-7）
            toast(T.applyFailed, "error");
          }
        } else {
          a.cancelApplyGoal();
          syncAll();
        }
      }, function (e) {
        // 視窗本身出錯：視同取消（不套用、不清除），記錄錯誤
        pending = false;
        store().actions.cancelApplyGoal();
        syncAll();
        if (root.console) { root.console.error("[EMT.customizer] 確認視窗失敗", e); }
      });
    }

    /**
     * （FE-32）首次畫面「開始學習」（AC-25-02、AC-25-03、AC-18-02；契約 FS-4）。
     * （v0.10，GS-3）不讀隱藏的輸入框，直接以 store 的 draftScore 開始。
     */
    function onStartLearning() {
      typing = false;
      // 不包在 act 內：store 以 "entry"、"goal" tag 通知，本頁切回一般模式、router 切到主控台
      var a = store().actions;
      if (a && typeof a.startLearning === "function") { a.startLearning(); }
    }

    /** （FE-32）首次畫面「從備份還原」（AC-25-10、AC-25-11；契約 FS-5～FS-7）：流程與提示由 ui/import-flow.js 處理 */
    function onRestore() {
      typing = false;
      var ui = EMT.ui;
      var flow = ui && ui.importFlow;
      if (!flow || typeof flow.start !== "function") {
        // 程式組裝錯誤（LD-3）：不當成使用者輸入錯誤
        throw new Error("[EMT.customizer] 缺少模組：EMT.ui.importFlow");
      }
      var p = flow.start();
      if (p && typeof p.then === "function") {
        p.then(null, function (e) {
          if (root.console) { root.console.error("[EMT.customizer] 從備份還原失敗", e); }
        });
      }
    }

    /** store 通知：只處理與本頁有關的變更 */
    function onStoreChange(state, tags) {
      if (!refs.input) { return; }
      var list = Array.isArray(tags) ? tags : [];
      var all = list.indexOf("init") !== -1;
      // （FE-32）進入模式改變（首次 → 一般）：只重建按鈕區與狀態列（不受 busy 影響）
      if (all || list.indexOf("entry") !== -1) {
        renderMode(entryModeOf(state));
        if (!all && list.indexOf("goal") === -1) { renderStatus(); }
      }
      if (busy) { return; }
      if (all || list.indexOf("goal") !== -1) {
        renderStatus();
        syncDraft();
      } else if (list.indexOf("stats") !== -1 || list.indexOf("customVocab") !== -1) {
        // 已掌握單字數變動只影響週數
        renderEstimate(goalState().draftScore);
      }
    }

    /**
     * 建立頁面並訂閱 store（只執行一次；已建立時直接回傳）。
     * mount 與閒置預建共用，兩者誰先執行都得到相同的 DOM 與狀態。
     * @param {Element|null} sectionEl
     * @returns {boolean} 是否已建立
     */
    function ensureBuilt(sectionEl) {
      if (refs.input) { return true; }
      var dom = EMT.core || {};
      D = dom.dom;
      G = dom.goal;
      C = dom.constants;
      host = (sectionEl && sectionEl.querySelector && sectionEl.querySelector("#customizer-goal")) ||
        root.document.getElementById("customizer-goal");
      if (!host || !D || !G || !C || !store()) { return false; }
      build();
      renderMode(entryModeOf(store().getState()));
      renderStatus();
      syncDraft();
      if (!unsubscribe && typeof store().subscribe === "function") {
        unsubscribe = store().subscribe(onStoreChange);
      }
      return true;
    }

    /**
     * 閒置預建（BUG-002，AC-22-01）：啟動完成（data-ready）後於瀏覽器閒置時先建立 DOM，
     * 第一次切到難易度設定頁時只剩樣式計算與繪製。頁面仍為 hidden，不觸發排版。
     * 使用者若在閒置前就切過來，由 mount 照常建立，預建自動略過。
     * 載入時只登錄 load 事件，不讀取 document（LD-2）；document 留到閒置回呼內才取用。
     */
    function schedulePrebuild() {
      if (typeof root.addEventListener !== "function") { return; }
      var tries = 0;
      function idle(fn) {
        if (typeof root.requestIdleCallback === "function") { root.requestIdleCallback(fn, { timeout: 1000 }); }
        else { root.setTimeout(fn, 200); }
      }
      function run() {
        if (refs.input) { return; }
        var doc = root.document;
        // 啟動流程尚未完成（data-ready 未設定、store 未建立）時稍後再試，最多 20 次
        if (!doc || doc.documentElement.getAttribute("data-ready") !== "1" || !store()) {
          if (++tries <= 20) { idle(run); }
          return;
        }
        try { ensureBuilt(null); } catch (e) {
          if (root.console) { root.console.error("[EMT.customizer] 預建失敗", e); }
        }
      }
      root.addEventListener("load", function () { idle(run); });
    }

    schedulePrebuild();

    return {
      mount: function (sectionEl) {
        ensureBuilt(sectionEl);
      },
      show: function () {
        if (!host || !refs.input) { return; }
        // 重新進入頁面：丟棄上次未完成的無效輸入，回到已保存的 draftScore
        typing = false;
        renderStatus();
        syncDraft();
      },
      hide: function () {
        typing = false;
      }
    };
  }

  return { helpers: helpers, createView: createView };
});
