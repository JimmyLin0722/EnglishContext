/*
 * views/flashcard-quiz.js — 四選一即時測驗模式（FE-13）
 * 依據：architecture.md §4.3（actions.answerVocabQuiz）、§4.4（EMT.components.flashcardQuiz）；
 *       契約 VocabQuizQuestion、VocabQuizStats、RuntimeState.flashcard.quiz、StudyCard
 * 涵蓋：US-09、AC-09-01～AC-09-07
 *
 * 介面：EMT.components.flashcardQuiz.render(containerEl, state)
 *   - containerEl：FE-11 的 <div class="fc-quiz">，進入測驗模式時建立一次、之後重複使用。
 *   - state：store.getState() 的 AppState（{ data, runtime }）。
 *   - 冪等：每次呼叫先清空容器，再依 state 重繪。
 *
 * 規則：
 * - 題目與選項只讀 runtime.flashcard.quiz（由 store 以 core/quiz.buildQuiz 產生並洗牌）；本檔不出題、不洗牌。
 * - 作答一律呼叫 store.actions.answerVocabQuiz；計數、已掌握、打卡由 store 處理，本檔不改狀態。
 * - 換題沿用抽認卡頁的「上一張」「下一張」（store 換卡時自動重新出題）。
 * - 作答後：正解標綠；選錯時所選標紅、正解同時標綠；該題 4 個選項全部 disabled。
 *   顏色之外另加文字標記（「正確答案」「你的選擇」），不只靠顏色傳達結果。
 * - 所有文字（含匯入的自訂單字與釋義）一律經 EMT.core.dom.el 以 textContent 寫入（C-7）。
 *
 * 答題回饋（FE-29；architecture.md v0.4 §7.10、§7.11、§4.5；AC-29-01～AC-29-03、AC-28-06、AC-31-03）：
 * - 呼叫 answerVocabQuiz 前後比較 selectedIndex：只有「前為 null、後為非 null」才算本次作答（feedbackOf），
 *   答對 → 正確選項加 qz-opt--pop；答錯 → 所選選項加 qz-opt--shake（ui/motion.enter，不依賴動畫結束事件）；
 *   兩者皆經 services/haptics 震動一次。已鎖定再點、從狀態重繪（重新載入）不播放動畫、不震動。
 * - 顏色與 disabled 由重繪當下設定；動畫只改 transform（32-quiz.css）。
 * - 只認點擊（AC-28-06）：選項清單以 touchstart／touchmove（passive）記錄位移，位移 ≥ TAP_SLOP_PX 視為滑動，
 *   觸控結束後 CLICK_SUPPRESS_MS 內的 click 忽略（shouldIgnoreClick）；滑鼠與鍵盤不受影響。
 *
 * 寫法：純邏輯（quizModel、feedbackOf、shouldIgnoreClick 等）在 Node 下以 module.exports 匯出供單元測試；
 *       瀏覽器下登錄為 EMT.components.flashcardQuiz，載入時不操作 DOM。
 */
(function (root) {
  "use strict";

  var EMT = (root.EMT = root.EMT || {});

  // 選項代號（OptionIndex 0～3 → A～D）
  var LETTERS = ["A", "B", "C", "D"];
  // 選項數量（契約 VocabQuizQuestion.options 固定 4 個）
  var OPTION_COUNT = 4;

  // 畫面文字
  var TEXT = {
    // AC-09-06 原文（與 FE-11 相同）
    insufficient: "單字數不足 4 個，無法產生選項",
    prompt: "選出這個單字的中文釋義",
    correct: "答對了！",
    wrongPrefix: "答錯了，正確答案是 ",
    badgeCorrect: "正確答案",
    badgeWrong: "你的選擇",
    nextHint: "按「下一張」進入下一題。",
    lastHint: "這是最後一題，可按「上一張」重新練習前面的單字。",
    statsPrefix: "單字測驗累計：已答 ",
    statsMiddle: " 題，答對 ",
    statsSuffix: " 題"
  };

  // ════════════════════════════════════════════════════════════════
  // 純邏輯（可在 Node 測試）
  // ════════════════════════════════════════════════════════════════

  /**
   * 安全轉字串：字串原樣、有限數字轉字串，其他一律 ""（畫面不出現 undefined／null 字樣）。
   * @param {*} v
   * @returns {string}
   */
  function str(v) {
    if (typeof v === "string") return v;
    if (typeof v === "number" && isFinite(v)) return String(v);
    return "";
  }

  /** 是否為合法 OptionIndex（0～3 整數） */
  function isOptionIndex(v) {
    return typeof v === "number" && v === Math.floor(v) && v >= 0 && v < OPTION_COUNT;
  }

  /** 非負整數（統計數字用）；不合法回 0 */
  function count(v) {
    return typeof v === "number" && isFinite(v) && v >= 0 ? Math.floor(v) : 0;
  }

  /**
   * 依題目 wordKey 找出卡片：優先目前索引那張（一般情況），否則在單字集中搜尋。
   * @param {Array<object>} set StudyCard[]
   * @param {number} index 目前卡片索引
   * @param {string} wordKey
   * @returns {object|null}
   */
  function findCard(set, index, wordKey) {
    if (!Array.isArray(set)) return null;
    var cur = set[index];
    if (cur && cur.wordKey === wordKey) return cur;
    for (var i = 0; i < set.length; i++) {
      if (set[i] && set[i].wordKey === wordKey) return set[i];
    }
    return null;
  }

  /**
   * 單一選項的顯示狀態（AC-09-03）。
   * 未作答 → "idle"；已作答：正解 → "correct"（綠）；所選且錯誤 → "wrong"（紅）；其他 → "neutral"。
   * @param {number} i 選項索引
   * @param {number} correctIndex
   * @param {number|null} selectedIndex
   * @returns {"idle"|"correct"|"wrong"|"neutral"}
   */
  function optionState(i, correctIndex, selectedIndex) {
    if (selectedIndex === null || selectedIndex === undefined) return "idle";
    if (i === correctIndex) return "correct";
    if (i === selectedIndex) return "wrong";
    return "neutral";
  }

  /**
   * 測驗區檢視模型。
   * @param {{data?: object, runtime?: object}} state AppState
   * @returns {{
   *   status: "ok"|"insufficient",
   *   word: string, phonetic: string, kind: string,
   *   answered: boolean, isCorrect: boolean,
   *   options: Array<{index:number, letter:string, text:string, state:string, disabled:boolean, badge:string}>,
   *   feedback: string, hint: string, stats: string
   * }}
   *   status "insufficient"：沒有題目或題目資料不合法（顯示 AC-09-06 訊息）。
   */
  function quizModel(state) {
    var st = state || {};
    var rt = st.runtime || {};
    var fc = rt.flashcard || {};
    var set = Array.isArray(rt.studySet) ? rt.studySet : [];
    var q = fc.quiz;
    var data = st.data || {};
    var vq = data.vocabQuiz || {};
    var stats = TEXT.statsPrefix + count(vq.answered) + TEXT.statsMiddle + count(vq.correct) + TEXT.statsSuffix;

    var bad = {
      status: "insufficient", word: "", phonetic: "", kind: "", answered: false, isCorrect: false,
      options: [], feedback: TEXT.insufficient, hint: "", stats: stats
    };
    if (!q || typeof q !== "object" || !Array.isArray(q.options) || q.options.length !== OPTION_COUNT ||
        !isOptionIndex(q.correctIndex)) {
      return bad;
    }
    var selected = isOptionIndex(q.selectedIndex) ? q.selectedIndex : null;
    var answered = selected !== null;

    var index = typeof fc.index === "number" ? fc.index : 0;
    var card = findCard(set, index, q.wordKey);
    var item = (card && card.item) || {};
    var word = str(item.word).trim() || str(q.wordKey);

    var options = [];
    for (var i = 0; i < OPTION_COUNT; i++) {
      var s = optionState(i, q.correctIndex, selected);
      options.push({
        index: i,
        letter: LETTERS[i],
        text: str(q.options[i]),
        state: s,
        disabled: answered,
        badge: s === "correct" ? TEXT.badgeCorrect : (s === "wrong" ? TEXT.badgeWrong : "")
      });
    }

    var isCorrect = answered && selected === q.correctIndex;
    var feedback = "";
    var hint = "";
    if (answered) {
      feedback = isCorrect
        ? TEXT.correct
        : TEXT.wrongPrefix + LETTERS[q.correctIndex] + "：" + str(q.options[q.correctIndex]);
      hint = index < set.length - 1 ? TEXT.nextHint : TEXT.lastHint;
    }

    return {
      status: "ok",
      word: word,
      phonetic: str(item.phonetic).trim(),
      kind: card && card.kind === "builtin" ? "builtin" : "custom",
      answered: answered,
      isCorrect: isCorrect,
      options: options,
      feedback: feedback,
      hint: hint,
      stats: stats
    };
  }

  // 答題動畫 class（§7.11；32-quiz.css）
  var ANIM_CLASS = { correct: "qz-opt--pop", wrong: "qz-opt--shake" };

  /** 取得 interaction 模組（Node 下 require，瀏覽器下於呼叫時讀 EMT.core.interaction）；不存在視為組裝錯誤（LD-3） */
  function interaction() {
    var ia = null;
    if (typeof require === "function" && typeof module === "object") {
      ia = require("../core/interaction.js");
    } else if (EMT.core) {
      ia = EMT.core.interaction;
    }
    if (!ia || !ia.UI) throw new Error("[EMT.components.flashcardQuiz] 缺少模組 EMT.core.interaction");
    return ia;
  }

  /**
   * 本次點擊的答題回饋（§7.11「顏色與鎖定」）：只有作答前 selectedIndex 為 null、作答後為合法索引才算本次作答。
   * 答對 → 正確選項（即所選）播放 pop；答錯 → 所選選項播放 shake。正確選項同時標綠，但不另加動畫。
   * @param {number|null} before 呼叫 action 前的 selectedIndex
   * @param {number|null} after 呼叫 action 後的 selectedIndex
   * @param {number} correctIndex
   * @returns {{ result: "correct"|"wrong", index: number, className: string, haptic: "correct"|"wrong" } | null}
   *   null：不是本次作答（已鎖定再點、store 忽略、資料不合法），不播放動畫、不震動
   */
  function feedbackOf(before, after, correctIndex) {
    if (before !== null) return null;
    if (!isOptionIndex(after) || !isOptionIndex(correctIndex)) return null;
    var kind = after === correctIndex ? "correct" : "wrong";
    return { result: kind, index: after, className: ANIM_CLASS[kind], haptic: kind };
  }

  /** 是否為有限數值 */
  function isNum(v) {
    return typeof v === "number" && isFinite(v);
  }

  /**
   * 觸控開始（只記 1 指）：記錄起點並清除「已滑動」標記；保留先前的忽略時間窗。
   * 座標不合法（例如多指）→ 直接視為滑動。
   * @param {object|null} prev 先前的觸控狀態
   * @param {number} x
   * @param {number} y
   * @returns {{ startX: number, startY: number, moved: boolean, suppressUntil: number }}
   */
  function touchBegin(prev, x, y) {
    var until = prev && isNum(prev.suppressUntil) ? prev.suppressUntil : 0;
    if (!isNum(x) || !isNum(y)) return { startX: 0, startY: 0, moved: true, suppressUntil: until };
    return { startX: x, startY: y, moved: false, suppressUntil: until };
  }

  /**
   * 觸控移動：位移（Math.hypot）≥ TAP_SLOP_PX 即標記為滑動（一經標記，本次觸控不再取消）。
   * @param {object} st touchBegin 的結果
   * @param {number} x
   * @param {number} y
   * @returns {object} 新狀態（不修改傳入物件）
   */
  function touchMove(st, x, y) {
    var s = st || touchBegin(null, x, y);
    var moved = s.moved || !isNum(x) || !isNum(y) || !interaction().isTap(x - s.startX, y - s.startY);
    return { startX: s.startX, startY: s.startY, moved: moved, suppressUntil: s.suppressUntil };
  }

  /**
   * 觸控結束（touchend／touchcancel）：本次為滑動 → 自 now 起 CLICK_SUPPRESS_MS 內的 click 忽略。
   * @param {object} st
   * @param {number} now 毫秒時間戳
   * @returns {object} 新狀態（moved 歸零，等待下一次觸控）
   */
  function touchFinish(st, now) {
    if (!st) return { startX: 0, startY: 0, moved: false, suppressUntil: 0 };
    var until = isNum(st.suppressUntil) ? st.suppressUntil : 0;
    if (st.moved && isNum(now)) until = Math.max(until, now + interaction().UI.CLICK_SUPPRESS_MS);
    return { startX: st.startX, startY: st.startY, moved: false, suppressUntil: until };
  }

  /**
   * click 是否屬於剛結束的滑動而應忽略（AC-28-06、E-42）。滑鼠與鍵盤點擊沒有觸控時間窗 → 不忽略。
   * @param {{ suppressUntil?: number }|null} touchState
   * @param {number} now 毫秒時間戳
   * @returns {boolean}
   */
  function shouldIgnoreClick(touchState, now) {
    if (!touchState || !isNum(touchState.suppressUntil) || !isNum(now)) return false;
    return now < touchState.suppressUntil;
  }

  var logic = {
    LETTERS: LETTERS,
    TEXT: TEXT,
    ANIM_CLASS: ANIM_CLASS,
    str: str,
    isOptionIndex: isOptionIndex,
    findCard: findCard,
    optionState: optionState,
    quizModel: quizModel,
    feedbackOf: feedbackOf,
    touchBegin: touchBegin,
    touchMove: touchMove,
    touchFinish: touchFinish,
    shouldIgnoreClick: shouldIgnoreClick
  };

  // Node（單元測試）：只匯出純邏輯，不登錄元件
  if (typeof module === "object" && module.exports) {
    module.exports = logic;
    return;
  }

  // ════════════════════════════════════════════════════════════════
  // 元件（瀏覽器）
  // ════════════════════════════════════════════════════════════════

  /** 取得 dom 建構 API */
  function dom() {
    return EMT.core.dom;
  }

  // 作答後重繪時，把焦點移到結果文字（被點的按鈕已 disabled，焦點會遺失）
  var focusFeedbackOnRender = false;
  // 最近一次 render 的容器（作答後在重繪結果中找出要播放動畫的選項）
  var lastContainer = null;
  // 選項清單的觸控狀態（跨重繪保留；只用於忽略滑動後補發的 click）
  var touch = null;

  /** 取用其他模組（呼叫時才取；不存在視為組裝錯誤，LD-3） */
  function need(group, name) {
    var g = EMT[group];
    var m = g && g[name];
    if (!m) throw new Error("[EMT.components.flashcardQuiz] 缺少模組 EMT." + group + "." + name);
    return m;
  }

  /** 目前的測驗題目（沒有題目回 null） */
  function currentQuiz() {
    var s = EMT.store;
    var st = s && typeof s.getState === "function" ? s.getState() : null;
    var fc = st && st.runtime && st.runtime.flashcard;
    return fc && fc.quiz && typeof fc.quiz === "object" ? fc.quiz : null;
  }

  /** 本次作答的動畫與震動（只在 feedbackOf 非 null 時呼叫） */
  function playFeedback(fb) {
    var btn = lastContainer && typeof lastContainer.querySelector === "function"
      ? lastContainer.querySelector('.fcq-option[data-index="' + fb.index + '"]')
      : null;
    if (btn) need("ui", "motion").enter(btn, fb.className, interaction().UI.ANSWER_ANIM_MS);
    need("services", "haptics").vibrate(fb.haptic);
  }

  /** 點擊選項：交給 store 判定與計分（已作答時 store 會忽略） */
  function onAnswer(optionIndex) {
    // 滑動後瀏覽器補發的 click 不算作答（AC-28-06）
    if (shouldIgnoreClick(touch, Date.now())) return;
    var s = EMT.store;
    var a = s && s.actions;
    if (!a || typeof a.answerVocabQuiz !== "function") return;
    var q0 = currentQuiz();
    var before = q0 ? q0.selectedIndex : undefined;
    focusFeedbackOnRender = true;
    var r = a.answerVocabQuiz(optionIndex);
    // store 忽略（例如已作答）時不搬移焦點
    if (!r || r.ok !== true) focusFeedbackOnRender = false;
    // store 已同步通知重繪；比較前後狀態，只有本次作答才播放動畫與震動
    var q1 = currentQuiz();
    var fb = feedbackOf(before, q1 ? q1.selectedIndex : null, q1 ? q1.correctIndex : null);
    if (fb) playFeedback(fb);
  }

  /** 觸控事件座標（只取 1 指；多指回 null） */
  function touchPoint(ev) {
    var list = ev && (ev.touches && ev.touches.length ? ev.touches : ev.changedTouches);
    if (!list || list.length !== 1) return null;
    return { x: list[0].clientX, y: list[0].clientY };
  }

  /** 在選項清單綁定觸控位移記錄（passive，不攔截捲動） */
  function bindTouch(listEl) {
    if (!listEl || typeof listEl.addEventListener !== "function") return;
    var opt = { passive: true };
    listEl.addEventListener("touchstart", function (ev) {
      var p = touchPoint(ev);
      touch = p ? touchBegin(touch, p.x, p.y) : touchBegin(touch, NaN, NaN);
    }, opt);
    listEl.addEventListener("touchmove", function (ev) {
      if (!touch) return;
      var p = touchPoint(ev);
      touch = p ? touchMove(touch, p.x, p.y) : touchMove(touch, NaN, NaN);
    }, opt);
    var finish = function () {
      if (touch) touch = touchFinish(touch, Date.now());
    };
    listEl.addEventListener("touchend", finish, opt);
    listEl.addEventListener("touchcancel", finish, opt);
  }

  /** 建立單一選項按鈕 */
  function buildOption(opt) {
    var el = dom().el;
    var children = [
      el("span", { className: "fcq-option__key", text: opt.letter, attrs: { "aria-hidden": "true" } }),
      el("span", { className: "fcq-option__text", text: opt.text })
    ];
    if (opt.badge) children.push(el("span", { className: "fcq-option__badge", text: opt.badge }));
    var attrs = {
      type: "button",
      "data-state": opt.state,
      "data-index": String(opt.index),
      "aria-label": opt.letter + "：" + opt.text + (opt.badge ? "（" + opt.badge + "）" : "")
    };
    var btn = el("button", {
      className: "fcq-option fcq-option--" + opt.state,
      attrs: attrs,
      on: { click: function () { onAnswer(opt.index); } }
    }, children);
    btn.disabled = !!opt.disabled;
    return el("li", { className: "fcq-options__item" }, [btn]);
  }

  /**
   * 依 state 重繪測驗區（冪等：先清空容器）。
   * @param {HTMLElement} containerEl
   * @param {{data: object, runtime: object}} state
   */
  function render(containerEl, state) {
    if (!containerEl) return;
    lastContainer = containerEl;
    var el = dom().el;
    var m = quizModel(state);
    dom().clear(containerEl);

    if (m.status !== "ok") {
      focusFeedbackOnRender = false;
      containerEl.appendChild(el("div", { className: "fcq fcq--na" }, [
        el("p", { className: "fcq-na", text: m.feedback, attrs: { role: "status" } })
      ]));
      return;
    }

    var head = [
      el("p", { className: "fcq-prompt", text: TEXT.prompt }),
      el("p", { className: "fcq-word", text: m.word, attrs: { lang: "en" } })
    ];
    if (m.phonetic) head.push(el("p", { className: "fcq-phonetic ipa", text: m.phonetic }));

    var list = el("ol", { className: "fcq-options", attrs: { "aria-label": "選項" } },
      m.options.map(buildOption));
    bindTouch(list);

    var feedback = el("p", {
      className: "fcq-feedback" + (m.answered ? (m.isCorrect ? " fcq-feedback--correct" : " fcq-feedback--wrong") : ""),
      text: m.feedback,
      attrs: { tabindex: "-1", "aria-live": "polite" }
    });
    feedback.hidden = !m.answered;
    var hint = el("p", { className: "fcq-hint", text: m.hint });
    hint.hidden = !m.hint;

    var wrap = el("div", {
      className: "fcq",
      attrs: { "data-answered": m.answered ? "true" : "false", "data-kind": m.kind }
    }, [
      el("div", { className: "fcq-head" }, head),
      list,
      feedback,
      hint,
      el("p", { className: "fcq-stats", text: m.stats })
    ]);
    containerEl.appendChild(wrap);

    if (focusFeedbackOnRender && m.answered) {
      focusFeedbackOnRender = false;
      try { feedback.focus({ preventScroll: true }); } catch (e) { feedback.focus(); }
    }
  }

  EMT.components = EMT.components || {};
  EMT.components.flashcardQuiz = { render: render };

  // 供除錯與測試存取純邏輯
  EMT.views = EMT.views || {};
  EMT.views.flashcardQuizLogic = logic;
})(typeof self !== "undefined" ? self : this);
