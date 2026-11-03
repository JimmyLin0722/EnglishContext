/*
 * views/part5.js — 模擬測驗頁（FE-14；題型對應多益 Part 5；R-15 畫面名稱更新，FE-23）
 * 依據：architecture.md §4.2（頁面登錄）、§4.3（Store API：answerPart5／nextPart5／restartPart5）；
 *       契約 data-schema.ts Part5Question、Part5Explanation、PART5_TYPE_LABELS、PART5_BLANK、Part5Progress；
 *       README §7.4 V-P5-01～07、§7.7 V-ST-05、FB-13（lockedSelection 重載後維持鎖定）。
 * 涵蓋：US-10、US-11、AC-10-02、AC-11-01～AC-11-07
 *
 * 規則：
 * - 所有計數與進度一律透過 store actions 變更，本檔不直接修改狀態。
 * - 畫面依 store 的 Part5Progress 與 EMT.content.part5 重繪；重新載入後自然還原題號與鎖定狀態。
 * - 所有文字以 textContent（core/dom.js）寫入，不解析 HTML。
 * - 題庫為空或資料缺漏時不拋例外（C-6）。
 *
 * 答題回饋（FE-29；architecture.md v0.4 §7.10、§7.11、§4.5；AC-29-01～AC-29-03、AC-28-06、AC-31-03）：
 * - 呼叫 answerPart5 前後比較 lockedSelection：只有「前為 null、後為非 null」才算本次作答（feedbackOf），
 *   答對 → 正確選項加 p5-opt--pop；答錯 → 所選選項加 p5-opt--shake（ui/motion.enter，不依賴動畫結束事件）；
 *   兩者皆經 services/haptics 震動一次。已鎖定再點、從狀態重繪（重新載入）不播放動畫、不震動。
 * - 顏色與 disabled 由重繪當下設定；動畫只改 transform（40-part5.css）。
 * - 只認點擊（AC-28-06）：選項清單以 touchstart／touchmove（passive）記錄位移，位移 ≥ TAP_SLOP_PX 視為滑動，
 *   觸控結束後 CLICK_SUPPRESS_MS 內的 click 忽略（shouldIgnoreClick）；滑鼠與鍵盤不受影響。
 *
 * （v0.12，FE-61；architecture.md v0.8 §7.19.6；契約 MT-1、MT-2；AC-40-01～AC-40-03）頁首 h2 之後插入作答進度條
 *   div.p5-progress[role=progressbar]（值取 EMT.core.layout.part5Progress，呼叫時取用）；題庫為空時不建節點；
 *   buildViewModel、作答、下一題、重新開始與焦點邏輯不變。
 *
 * 寫法：純邏輯（splitSentence、splitStructure、optionState、buildViewModel、feedbackOf、shouldIgnoreClick 等）
 * 在 Node 下以 module.exports 匯出供測試；
 * 瀏覽器下登錄為 EMT.views part5 模組。
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else if (root.EMT && root.EMT.views && typeof root.EMT.views.register === "function") {
    root.EMT.views.register("part5", api.view);
  }
})(typeof self !== "undefined" ? self : this, function (root) {
  "use strict";

  // 選項代號（OptionIndex 0～3 → A～D）
  var LETTERS = ["A", "B", "C", "D"];

  // 契約常數的備援值（constants.js 取不到時使用，內容與契約一致）
  var FALLBACK_BLANK = "_____";
  var FALLBACK_LABELS = {
    preposition_collocation: "固定介系詞搭配",
    part_of_speech: "詞性辨析",
    context_vocabulary: "上下文單字",
    connector: "讓步/因果連接詞"
  };

  // 畫面文字
  var TEXT = {
    empty: "題庫尚未載入",
    heading: "模擬測驗",
    headingNote: "題型對應多益 Part 5",
    progressLabel: "作答進度", // （v0.12，FE-61）進度條 aria-label（architecture.md §7.19.6）
    blank: "空格",
    next: "下一題",
    restart: "重新開始",
    summaryTitle: "本輪結算",
    core: "解題核心思路",
    structure: "句型語法拆解（S + V + O + 修飾語）",
    correct: "答對了！",
    wrongPrefix: "答錯了，正確答案是 ",
    badgeCorrect: "正確答案",
    badgeWrong: "你的選擇",
    badData: "這一題的資料不完整。"
  };

  /** 取得契約常數（Node 下 require，瀏覽器下讀 EMT.core.constants） */
  function constants() {
    var c = null;
    try {
      if (typeof require === "function" && typeof module === "object") {
        c = require("../core/constants.js");
      } else if (root.EMT && root.EMT.core) {
        c = root.EMT.core.constants;
      }
    } catch (e) {
      c = null;
    }
    return {
      blank: c && typeof c.PART5_BLANK === "string" && c.PART5_BLANK ? c.PART5_BLANK : FALLBACK_BLANK,
      labels: c && c.PART5_TYPE_LABELS ? c.PART5_TYPE_LABELS : FALLBACK_LABELS
    };
  }

  // ─────────────────────────────────────────────────────────────
  // 純邏輯
  // ─────────────────────────────────────────────────────────────

  /**
   * 把題目句依空格記號切成片段（AC-10-02）。
   * @param {*} sentence 題目句
   * @param {string} [blank] 空格記號，預設 PART5_BLANK
   * @returns {{ kind: "text"|"blank", text?: string }[]} 片段；空字串片段省略
   */
  function splitSentence(sentence, blank) {
    var mark = typeof blank === "string" && blank ? blank : FALLBACK_BLANK;
    var s = typeof sentence === "string" ? sentence : "";
    var out = [];
    var parts = s.split(mark);
    for (var i = 0; i < parts.length; i++) {
      if (i > 0) out.push({ kind: "blank" });
      if (parts[i] !== "") out.push({ kind: "text", text: parts[i] });
    }
    return out;
  }

  /**
   * 把句型語法拆解依斜線分行（例："S: … / V: … / O: … / 修飾語: …"）。
   * 只在斜線後緊接「短標籤 + 冒號」（S:、V:、O:、修飾語: 等）時切分，
   * 避免切到「讓步/因果」「V-ing/名詞」之類內文中的斜線；斜線前後空白可有可無。
   * @param {*} structure
   * @returns {string[]} 去除前後空白後的非空行；無內容回傳空陣列
   */
  function splitStructure(structure) {
    if (typeof structure !== "string") return [];
    return structure.split(/\s*\/\s*(?=[^\/:：\s][^\/:：]{0,11}[:：])/).map(function (x) { return x.trim(); }).filter(function (x) { return x !== ""; });
  }

  /**
   * 選項標色狀態（AC-11-01）。
   * @param {number} i 選項索引
   * @param {number|null} locked 已選索引；null 為未作答
   * @param {number} correctIndex 正解索引
   * @returns {"idle"|"correct"|"wrong"|"locked"} idle = 可作答；locked = 已鎖定但不標色
   */
  function optionState(i, locked, correctIndex) {
    if (locked === null || locked === undefined) return "idle";
    if (i === correctIndex) return "correct";
    if (i === locked) return "wrong";
    return "locked";
  }

  /** 是否為非負整數 */
  function isIndex(n) {
    return typeof n === "number" && isFinite(n) && n >= 0 && Math.floor(n) === n;
  }

  /**
   * 依進度與題庫組出畫面資料。
   * @param {object} progress Part5Progress（缺漏時以預設值處理）
   * @param {*} bank Part5Question[]
   * @param {{ blank?: string, labels?: object }} [consts] 契約常數
   * @returns {object}
   *   { kind: "empty" }
   *   { kind: "summary", roundCorrect, roundAnswered, totalCorrect, totalAnswered }
   *   { kind: "question", index, number, total, typeLabel, segments, options[], locked, correctIndex,
   *     isCorrect, valid, explanation: { coreStrategy, structureLines } }
   */
  function buildViewModel(progress, bank, consts) {
    var list = Array.isArray(bank) ? bank : [];
    var c = consts || constants();
    var p = progress && typeof progress === "object" ? progress : {};
    if (list.length === 0) return { kind: "empty" };

    if (p.phase === "summary") {
      return {
        kind: "summary",
        roundCorrect: isIndex(p.roundCorrect) ? p.roundCorrect : 0,
        roundAnswered: isIndex(p.roundAnswered) ? p.roundAnswered : 0,
        totalCorrect: isIndex(p.totalCorrect) ? p.totalCorrect : 0,
        totalAnswered: isIndex(p.totalAnswered) ? p.totalAnswered : 0
      };
    }

    // V-ST-05：超出題庫視為第 1 題（store 啟動時已處理，這裡僅防禦）
    var index = isIndex(p.currentIndex) && p.currentIndex < list.length ? p.currentIndex : 0;
    var q = list[index] && typeof list[index] === "object" ? list[index] : {};
    var rawOptions = Array.isArray(q.options) ? q.options : [];
    var correctIndex = isIndex(q.correctIndex) && q.correctIndex < 4 ? q.correctIndex : -1;
    var locked = isIndex(p.lockedSelection) && p.lockedSelection < 4 ? p.lockedSelection : null;
    var labels = c.labels || FALLBACK_LABELS;
    var typeLabel = typeof q.type === "string" && Object.prototype.hasOwnProperty.call(labels, q.type)
      ? labels[q.type] : "";

    var options = [];
    for (var i = 0; i < 4; i++) {
      var t = rawOptions[i];
      options.push({
        index: i,
        letter: LETTERS[i],
        text: t === null || t === undefined ? "" : String(t),
        state: optionState(i, locked, correctIndex)
      });
    }

    var ex = q.explanation && typeof q.explanation === "object" ? q.explanation : {};
    var valid = typeof q.sentence === "string" && q.sentence !== "" && rawOptions.length === 4 && correctIndex >= 0;

    return {
      kind: "question",
      index: index,
      number: index + 1,
      total: list.length,
      typeLabel: typeLabel,
      segments: splitSentence(q.sentence, c.blank),
      options: options,
      locked: locked,
      correctIndex: correctIndex,
      isCorrect: locked !== null && locked === correctIndex,
      valid: valid,
      explanation: {
        coreStrategy: typeof ex.coreStrategy === "string" ? ex.coreStrategy : "",
        structureLines: splitStructure(ex.structure)
      }
    };
  }

  // 答題動畫 class（§7.11；40-part5.css）
  var ANIM_CLASS = { correct: "p5-opt--pop", wrong: "p5-opt--shake" };

  /** 取得 interaction 模組（Node 下 require，瀏覽器下於呼叫時讀 EMT.core.interaction）；不存在視為組裝錯誤（LD-3） */
  function interaction() {
    var ia = null;
    if (typeof require === "function" && typeof module === "object") {
      ia = require("../core/interaction.js");
    } else if (root.EMT && root.EMT.core) {
      ia = root.EMT.core.interaction;
    }
    if (!ia || !ia.UI) throw new Error("[EMT.views.part5] 缺少模組 EMT.core.interaction");
    return ia;
  }

  /** 是否為合法 OptionIndex（0～3 整數） */
  function isOptionIndex(n) {
    return isIndex(n) && n < 4;
  }

  /**
   * 本次點擊的答題回饋（§7.11「顏色與鎖定」）：只有作答前 lockedSelection 為 null、作答後為合法索引才算本次作答。
   * 答對 → 正確選項（即所選）播放 pop；答錯 → 所選選項播放 shake。正確選項同時標綠，但不另加動畫。
   * @param {number|null} before 呼叫 action 前的 lockedSelection
   * @param {number|null} after 呼叫 action 後的 lockedSelection
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

  // ─────────────────────────────────────────────────────────────
  // 畫面（瀏覽器）
  // ─────────────────────────────────────────────────────────────

  var rootEl = null;      // #view-part5
  var unsubscribe = null;
  var pendingFocus = null; // 重繪後要聚焦的目標："next" | "question" | "restart"
  var touch = null;        // 選項清單的觸控狀態（跨重繪保留；只用於忽略滑動後補發的 click）

  /** 取用其他模組（呼叫時才取；不存在視為組裝錯誤，LD-3） */
  function need(group, name) {
    var E = root.EMT || {};
    var g = E[group];
    var m = g && g[name];
    if (!m) throw new Error("[EMT.views.part5] 缺少模組 EMT." + group + "." + name);
    return m;
  }

  /** 本次作答的動畫與震動（只在 feedbackOf 非 null 時呼叫） */
  function playFeedback(fb) {
    var btn = rootEl && typeof rootEl.querySelector === "function"
      ? rootEl.querySelector('[data-p5="option"][data-index="' + fb.index + '"]')
      : null;
    if (btn) need("ui", "motion").enter(btn, fb.className, interaction().UI.ANSWER_ANIM_MS);
    need("services", "haptics").vibrate(fb.haptic);
  }

  /** 點擊選項：交給 store 判定與計分（已鎖定時 store 會忽略），再依前後狀態決定回饋 */
  function onAnswer(index) {
    // 滑動後瀏覽器補發的 click 不算作答（AC-28-06）
    if (shouldIgnoreClick(touch, Date.now())) return;
    var p0 = progress();
    var before = p0 ? p0.lockedSelection : undefined;
    var qIndex = p0 ? p0.currentIndex : -1;
    pendingFocus = "next";
    var r = act("answerPart5", index);
    if (!r || !r.ok) pendingFocus = null;
    // store 已同步通知重繪；比較前後狀態，只有本次作答才播放動畫與震動
    var p1 = progress();
    var q = bank()[qIndex];
    var fb = feedbackOf(before, p1 ? p1.lockedSelection : null, q && typeof q === "object" ? q.correctIndex : null);
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

  function dom() {
    return root.EMT.core.dom;
  }

  function store() {
    return root.EMT && root.EMT.store;
  }

  /** （v0.12，FE-61）EMT.core.layout（呼叫時取用，LD-2）；Node 下 require */
  function layout() {
    if (typeof require === "function" && typeof module === "object") {
      return require("../core/layout.js");
    }
    return root.EMT && root.EMT.core ? root.EMT.core.layout : null;
  }

  /**
   * （v0.12，FE-61）作答進度條（MT-1）：role=progressbar、aria-valuemin 0、aria-valuemax N、aria-valuenow i；
   * 填色寬度 = percent%。visible 為 false（題庫為空）時回傳 null（不建節點）。
   * @param {object} vm buildViewModel 的結果
   * @param {number} total 題庫長度 N
   * @returns {Element|null}
   */
  function renderProgressBar(vm, total) {
    var L = layout();
    if (!L) return null;
    var p = L.part5Progress(vm.kind, vm.kind === "question" ? vm.number : 0, total);
    if (!p.visible) return null;
    var D = dom();
    var fill = D.el("span", { className: "p5-progress__fill" });
    fill.style.width = p.percent + "%";
    return D.el("div", {
      className: "p5-progress",
      attrs: {
        role: "progressbar",
        "aria-label": TEXT.progressLabel,
        "aria-valuemin": "0",
        "aria-valuemax": String(p.max),
        "aria-valuenow": String(p.now)
      }
    }, [fill]);
  }

  function bank() {
    try {
      var c = root.EMT && root.EMT.content;
      return c && Array.isArray(c.part5) ? c.part5 : [];
    } catch (e) {
      return [];
    }
  }

  function progress() {
    var s = store();
    if (!s || typeof s.getState !== "function") return null;
    var st = s.getState();
    return st && st.data ? st.data.part5 : null;
  }

  /** 呼叫 store action（不存在時忽略） */
  function act(name, arg) {
    var s = store();
    if (s && s.actions && typeof s.actions[name] === "function") {
      return arguments.length > 1 ? s.actions[name](arg) : s.actions[name]();
    }
    return undefined;
  }

  /** 題庫為空 */
  function renderEmpty() {
    var D = dom();
    return D.el("div", { className: "card p5-empty" }, [
      D.el("p", { className: "p5-empty__text", text: TEXT.empty })
    ]);
  }

  /** 結算畫面（AC-11-04、AC-11-07） */
  function renderSummary(vm) {
    var D = dom();
    var restartBtn = D.el("button", {
      className: "btn btn--primary p5-restart",
      attrs: { type: "button", "data-p5": "restart" },
      text: TEXT.restart,
      on: {
        click: function () {
          pendingFocus = "question";
          act("restartPart5");
        }
      }
    });
    return D.el("div", { className: "card p5-summary" }, [
      D.el("h3", { className: "p5-summary__title", attrs: { tabindex: "-1", "data-p5": "summary-title" }, text: TEXT.summaryTitle }),
      D.el("p", { className: "p5-summary__score", attrs: { "data-p5": "summary-score" },
        text: "答對 " + vm.roundCorrect + " / " + vm.roundAnswered }),
      D.el("p", { className: "p5-summary__total",
        text: "累計答對 " + vm.totalCorrect + " / " + vm.totalAnswered }),
      D.el("div", { className: "btn-row" }, [restartBtn])
    ]);
  }

  /** 題目句：文字片段 + 底線空格元素（AC-10-02） */
  function renderSentence(segments) {
    var D = dom();
    var nodes = segments.map(function (seg) {
      if (seg.kind === "blank") {
        return D.el("span", { className: "p5-blank", attrs: { "data-p5": "blank" } }, [
          D.el("span", { className: "visually-hidden", text: TEXT.blank })
        ]);
      }
      return seg.text;
    });
    return D.el("p", { className: "p5-sentence", attrs: { lang: "en", "data-p5": "sentence" } }, nodes);
  }

  /** 4 個選項按鈕（AC-11-01、AC-11-06） */
  function renderOptions(vm) {
    var D = dom();
    var items = vm.options.map(function (opt) {
      var children = [
        D.el("span", { className: "p5-option__letter", text: opt.letter + "." }),
        D.el("span", { className: "p5-option__text", attrs: { lang: "en" }, text: opt.text })
      ];
      if (opt.state === "correct") children.push(D.el("span", { className: "p5-option__badge", text: TEXT.badgeCorrect }));
      if (opt.state === "wrong") children.push(D.el("span", { className: "p5-option__badge", text: TEXT.badgeWrong }));
      var btn = D.el("button", {
        className: "p5-option p5-option--" + opt.state,
        attrs: {
          type: "button",
          "data-p5": "option",
          "data-index": String(opt.index),
          "data-state": opt.state,
          disabled: vm.locked !== null,
          "aria-pressed": vm.locked !== null ? (vm.locked === opt.index ? "true" : "false") : null
        },
        on: {
          click: function () {
            onAnswer(opt.index);
          }
        }
      }, children);
      return D.el("li", { className: "p5-options__item" }, [btn]);
    });
    var list = D.el("ol", { className: "p5-options", attrs: { "aria-label": "選項" } }, items);
    bindTouch(list);
    return list;
  }

  /** 作答結果與解析（AC-11-02） */
  function renderResult(vm) {
    var D = dom();
    var feedback = vm.isCorrect
      ? D.el("p", { className: "p5-feedback p5-feedback--correct", attrs: { "data-p5": "feedback" }, text: TEXT.correct })
      : D.el("p", { className: "p5-feedback p5-feedback--wrong", attrs: { "data-p5": "feedback" },
        text: vm.correctIndex >= 0 ? TEXT.wrongPrefix + LETTERS[vm.correctIndex] + "." : TEXT.badData });

    var lines = vm.explanation.structureLines.map(function (line) {
      return D.el("li", { attrs: { lang: "en" }, text: line });
    });
    return D.el("div", { className: "p5-result" }, [
      feedback,
      D.el("section", { className: "p5-explain", attrs: { "data-p5": "explanation", "aria-label": "解析" } }, [
        D.el("h3", { className: "p5-explain__title", attrs: { "data-p5": "core-title" }, text: TEXT.core }),
        D.el("p", { className: "p5-explain__body", attrs: { "data-p5": "core" }, text: vm.explanation.coreStrategy }),
        D.el("h3", { className: "p5-explain__title", attrs: { "data-p5": "structure-title" }, text: TEXT.structure }),
        D.el("ul", { className: "p5-structure", attrs: { "data-p5": "structure" } }, lines)
      ])
    ]);
  }

  /** 作答畫面 */
  function renderQuestion(vm) {
    var D = dom();
    var answered = vm.locked !== null;
    var children = [
      D.el("div", { className: "p5-meta" }, [
        D.el("h3", { className: "p5-number", attrs: { tabindex: "-1", "data-p5": "number" },
          text: "第 " + vm.number + " / " + vm.total + " 題" }),
        vm.typeLabel ? D.el("span", { className: "p5-type", attrs: { "data-p5": "type" }, text: vm.typeLabel }) : null
      ]),
      renderSentence(vm.segments),
      renderOptions(vm),
      // 作答結果以 live region 宣告
      D.el("div", { className: "p5-live", attrs: { "aria-live": "polite" } }, [answered ? renderResult(vm) : null])
    ];
    if (!vm.valid) {
      children.push(D.el("p", { className: "p5-warning", text: TEXT.badData }));
    }
    // 已作答才提供「下一題」（store 的 nextPart5 也只在已作答時才前進）
    if (answered) {
      children.push(D.el("div", { className: "btn-row p5-actions" }, [
        D.el("button", {
          className: "btn btn--primary p5-next",
          attrs: { type: "button", "data-p5": "next" },
          text: TEXT.next,
          on: {
            click: function () {
              pendingFocus = "question";
              act("nextPart5");
            }
          }
        })
      ]));
    }
    return D.el("div", { className: "card p5-question", attrs: { "data-index": String(vm.index) } }, children);
  }

  /** 依目前狀態重繪整頁 */
  function render() {
    if (!rootEl) return;
    var D = dom();
    var list = bank();
    var vm = buildViewModel(progress(), list);
    var body;
    if (vm.kind === "empty") body = renderEmpty();
    else if (vm.kind === "summary") body = renderSummary(vm);
    else body = renderQuestion(vm);

    D.clear(rootEl);
    D.append(rootEl, [
      D.el("div", { className: "p5" }, [
        D.el("h2", { className: "page-title p5-heading", text: TEXT.heading }),
        // （v0.12，FE-61）作答進度條：h2 之後、題型說明之前（MT-1）
        renderProgressBar(vm, list.length),
        D.el("p", { className: "p5-heading-note", text: TEXT.headingNote }),
        body
      ])
    ]);
    applyFocus(vm);
  }

  /** 使用者操作後把焦點移到合理位置（鍵盤與螢幕閱讀器友善） */
  function applyFocus(vm) {
    var target = pendingFocus;
    pendingFocus = null;
    if (!target || !rootEl) return;
    var sel = null;
    if (vm.kind === "summary") sel = '[data-p5="summary-title"]';
    else if (vm.kind === "question") sel = target === "next" ? '[data-p5="next"]' : '[data-p5="number"]';
    var node = sel ? rootEl.querySelector(sel) : null;
    if (node && typeof node.focus === "function") {
      try { node.focus(); } catch (e) { /* 忽略 */ }
    }
  }

  var view = {
    mount: function (el) {
      rootEl = el || (typeof document !== "undefined" ? document.getElementById("view-part5") : null);
      var s = store();
      if (s && typeof s.subscribe === "function" && !unsubscribe) {
        unsubscribe = s.subscribe(function (state, tags) {
          if (!tags || tags.indexOf("part5") >= 0) render();
        });
      }
      render();
    },
    show: function () {
      render();
    },
    hide: function () {
      pendingFocus = null;
    }
  };

  return {
    LETTERS: LETTERS,
    TEXT: TEXT,
    splitSentence: splitSentence,
    splitStructure: splitStructure,
    optionState: optionState,
    buildViewModel: buildViewModel,
    ANIM_CLASS: ANIM_CLASS,
    feedbackOf: feedbackOf,
    touchBegin: touchBegin,
    touchMove: touchMove,
    touchFinish: touchFinish,
    shouldIgnoreClick: shouldIgnoreClick,
    view: view
  };
});
