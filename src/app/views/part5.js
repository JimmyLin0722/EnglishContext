/*
 * views/part5.js — 模擬測驗頁（FE-14；標題說明為契約 L-8 LT-2，FE-78；R-15 畫面名稱更新，FE-23）
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
 * （v0.15，FE-75；architecture.md v0.10 §4.10、§7.21.4；契約 data-schema §15 PART5_RECORD_TEXTS、Part5ViewKind、
 *   README §5.11 CR-4、CR-6、CR-9、UO-1、UO-3、UO-7、§11.6 MT-1；AC-45-04、AC-45-05、AC-46-01、AC-46-06～AC-46-08）
 * - buildViewModel 第 4 參數 record = { ids, only }（缺省 { ids: [], only: false }）；畫面種類以 part5flow.viewKind 推導
 *   （empty／question／summary／allCorrect，不存在 store）；各 kind 附 k（已答對題數）、q（題庫題數）、only。
 * - 題庫非空時於進度條之後建立 div.p5-record：「已答對 K / Q 題」與原生核取方塊「只練沒答對的題目」；
 *   曾答對的題目在 .p5-meta 題型標籤後顯示「✓ 曾答對」；allCorrect 畫面以清除按鈕取代「重新開始」。
 * - 「清除答對紀錄，重新來過」先經 EMT.ui.dialog.confirm，回 true 才呼叫 clearPart5CorrectIds；取消不呼叫任何 action。
 * - 契約文字取 constants.PART5_RECORD_TEXTS；SD 定稿文字（對話框標題與內文）放在 RECORD_TEXT 並匯出。
 *   一律 textContent（C-7），不顯示題目 id（CR-9）。
 *
 * （v0.18，FE-81；architecture.md v0.13 §4.11、§7.24.2、§7.24.3；契約 README §5.11 LV-2、LV-6、SM-1～SM-3、HN-1、CR-10、UO-7；
 *   AC-11-04、AC-46-06、AC-48-01、AC-48-06、AC-48-09、AC-48-11、AC-48-12）
 * - question 依 part5flow.questionState 分 answered、lockedReview、idle；lockedReview 不可作答，有回饋、解析與「下一題」，
 *   鎖定只由狀態推導，本檔不寫入任何狀態（LV-4）。資料不完整時回饋為 TEXT.badData，全畫面恰 1 次，解析只顯示非空段落（LV-6）。
 * - 結算 y = 0 顯示 summaryNoNewAnswers，a ≥ 1 才顯示累計行（SM-2）；allCorrect 只在 phase = summary 且 y ≥ 1 顯示本輪結算（SM-3）。
 * - .p5-record 於開關後顯示開關說明（HN-1）；K ≥ 1 且不是 allCorrect 時另有清除按鈕；allCorrect 的清除按鈕為唯一按鈕（CR-10、UO-7）。
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
    headingNote: "題型參考 TOEIC®（多益）Part 5，非 ETS 官方或認可內容",
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

  // （v0.15，FE-75）契約 PART5_RECORD_TEXTS 的備援值（constants.js 取不到時使用，內容與 data-schema §15 一致）
  var FALLBACK_RECORD_TEXTS = {
    correctBadge: "✓ 曾答對",
    correctCount: "已答對 {k} / {q} 題",
    unansweredOnlyLabel: "只練沒答對的題目",
    allCorrectTitle: "{q} 題全部答對！",
    clearAndRestart: "清除答對紀錄，重新來過",
    lockedReviewFeedback: "你之前答對過這一題",
    summaryNoNewAnswers: "本輪沒有新作答的題目",
    filterHint: "關閉時顯示全部題目，答對過的題目會以綠色鎖定。",
    filterHintAllCorrect: "要檢視全部題目，請關閉上方的「只練沒答對的題目」。",
    clearConfirmMustInclude: ["將清除全部題目的答對紀錄", "累計答題數與正確率不受影響"],
    confirmOk: "確定",
    confirmCancel: "取消"
  };

  // （v0.15，FE-75）SD 定稿文字（architecture.md §7.21.4 文字定稿表，逐字）
  var RECORD_TEXT = {
    confirmTitle: "清除答對紀錄",
    confirmMessage: "將清除全部題目的答對紀錄，「已答對」會回到 0 題，並從第 1 題重新開始。累計答題數與正確率不受影響。"
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
      labels: c && c.PART5_TYPE_LABELS ? c.PART5_TYPE_LABELS : FALLBACK_LABELS,
      // （v0.15，FE-75）答對紀錄相關文字
      record: c && c.PART5_RECORD_TEXTS ? c.PART5_RECORD_TEXTS : FALLBACK_RECORD_TEXTS
    };
  }

  /** （v0.15，FE-75）EMT.core.part5flow（Node 下 require，瀏覽器下於呼叫時讀取）；不存在視為組裝錯誤（LD-3） */
  function part5flow() {
    var pf = null;
    if (typeof require === "function" && typeof module === "object") {
      pf = require("../core/part5flow.js");
    } else if (root.EMT && root.EMT.core) {
      pf = root.EMT.core.part5flow;
    }
    if (!pf || typeof pf.viewKind !== "function") throw new Error("[EMT.views.part5] 缺少模組 EMT.core.part5flow");
    return pf;
  }

  /**
   * （v0.15，FE-75）以 {k}、{q} 代入契約文字（split／join，不用正規表示式）。
   * @param {*} template 例「已答對 {k} / {q} 題」
   * @param {{ k?: number, q?: number }} values
   * @returns {string}
   */
  function fillText(template, values) {
    var t = typeof template === "string" ? template : "";
    var v = values || {};
    if (v.k !== undefined) t = t.split("{k}").join(String(v.k));
    if (v.q !== undefined) t = t.split("{q}").join(String(v.q));
    return t;
  }

  /**
   * （v0.15，FE-75）答對紀錄參數正規化：缺省或型別不符 → { ids: [], only: false }。
   * @param {*} record { ids, only }
   * @returns {{ ids: Array, only: boolean }}
   */
  function normalizeRecord(record) {
    var r = record && typeof record === "object" ? record : {};
    return { ids: Array.isArray(r.ids) ? r.ids : [], only: r.only === true };
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
   * @param {{ ids?: string[], only?: boolean }} [record] （v0.15）答對紀錄與開關；缺省 { ids: [], only: false }
   * @returns {object} （v0.15）各 kind 皆附 k（已答對題數）、q（題庫題數）、only（開關）
   *   { kind: "empty" }
   *   { kind: "summary", roundCorrect, roundAnswered, totalCorrect, totalAnswered }
   *   { kind: "allCorrect", inSummary, roundCorrect, roundAnswered }（v0.15，UO-3、UO-7）
   *   { kind: "question", index, number, total, typeLabel, segments, options[], locked, correctIndex,
   *     isCorrect, valid, explanation: { coreStrategy, structureLines }, correctBadge, questionState }（v0.18，LV-1）
   */
  function buildViewModel(progress, bank, consts, record) {
    var list = Array.isArray(bank) ? bank : [];
    var c = consts || constants();
    var p = progress && typeof progress === "object" ? progress : {};
    var rec = normalizeRecord(record);
    var PF = part5flow();
    var bankIds = PF.bankIdsOf(list);
    var set = PF.correctSet(rec.ids);
    var kCount = PF.countCorrect(bankIds, set);
    var qCount = list.length;
    // UO-3：畫面種類每次繪製時推導（不存在 store）
    var kind = PF.viewKind(p, bankIds, set, rec.only);
    if (kind === "empty") return { kind: "empty", k: 0, q: 0, only: rec.only };

    var roundC = isIndex(p.roundCorrect) ? p.roundCorrect : 0;
    var roundA = isIndex(p.roundAnswered) ? p.roundAnswered : 0;

    // （v0.15，UO-7；v0.18，SM-3）全部答對：不顯示題目；phase = summary 且 y ≥ 1 才另顯示本輪結算（AC-46-06）
    if (kind === "allCorrect") {
      return {
        kind: "allCorrect",
        inSummary: p.phase === "summary" && roundA >= 1,
        roundCorrect: roundC,
        roundAnswered: roundA,
        k: kCount,
        q: qCount,
        only: rec.only
      };
    }

    if (kind === "summary") {
      return {
        kind: "summary",
        roundCorrect: roundC,
        roundAnswered: roundA,
        totalCorrect: isIndex(p.totalCorrect) ? p.totalCorrect : 0,
        totalAnswered: isIndex(p.totalAnswered) ? p.totalAnswered : 0,
        k: kCount,
        q: qCount,
        only: rec.only
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
    var valid = typeof q.sentence === "string" && q.sentence !== "" && rawOptions.length === 4 && correctIndex >= 0;
    // （v0.18，LV-1）以防禦後的題號與作答值推導，畫面狀態與本函式其他欄位一致
    var qState = PF.questionState({ currentIndex: index, lockedSelection: locked }, bankIds, set, rec.only);

    var options = [];
    for (var i = 0; i < 4; i++) {
      var t = rawOptions[i];
      options.push({
        index: i,
        letter: LETTERS[i],
        text: t === null || t === undefined ? "" : String(t),
        // （v0.18，LV-2、LV-6）lockedReview 只標正解；資料不完整時全部為 locked
        state: qState === "lockedReview"
          ? (valid && i === correctIndex ? "correct" : "locked")
          : optionState(i, locked, correctIndex)
      });
    }

    var ex = q.explanation && typeof q.explanation === "object" ? q.explanation : {};

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
      },
      // （v0.15，CR-4 (a)）目前題目曾答對（未作答、已作答皆顯示標示）
      correctBadge: PF.isCorrectAt(bankIds, set, index),
      questionState: qState,
      k: kCount,
      q: qCount,
      only: rec.only
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
  var pendingFocus = null; // 重繪後要聚焦的目標："next" | "question" | "restart" | "only"（v0.15）
  var confirming = false;  // （v0.15）清除確認對話框開啟中（避免重複開啟）
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

  /** （v0.15，FE-75）答對紀錄與開關（state.data.part5CorrectIds、part5UnansweredOnly）；取不到 → 預設值 */
  function record() {
    var s = store();
    var st = s && typeof s.getState === "function" ? s.getState() : null;
    var d = st && st.data ? st.data : {};
    return normalizeRecord({ ids: d.part5CorrectIds, only: d.part5UnansweredOnly });
  }

  /** 呼叫 store action（不存在時忽略） */
  function act(name, arg) {
    var s = store();
    if (s && s.actions && typeof s.actions[name] === "function") {
      return arguments.length > 1 ? s.actions[name](arg) : s.actions[name]();
    }
    return undefined;
  }

  /**
   * （v0.15，FE-75；CR-4 (b)、UO-1；AC-45-05、AC-46-01）計數行與「只練沒答對的題目」開關。
   * 開關為原生核取方塊，整個 label 為觸控目標；change → setPart5UnansweredOnly(input.checked)；
   * 原生核取方塊不回應 Enter，keydown Enter 時補 input.click()（觸發原生切換與 change）。
   * （v0.18，HN-1、CR-10）開關之後為說明文字；K ≥ 1 且畫面不是 allCorrect 時再加清除按鈕。
   * @param {object} vm buildViewModel 的結果（kind、k、q、only）
   * @param {object} T 契約文字 PART5_RECORD_TEXTS
   * @returns {Element}
   */
  function renderRecord(vm, T) {
    var D = dom();
    var input = D.el("input", {
      attrs: { type: "checkbox", "data-p5": "only", checked: vm.only === true },
      on: {
        change: function () {
          pendingFocus = "only";
          var r = act("setPart5UnansweredOnly", input.checked === true);
          // store 未變更（或不存在）時不會通知重繪：主動重繪，讓核取方塊回到實際狀態
          if (!r || !r.changed) render();
        },
        keydown: function (ev) {
          if (ev && ev.key === "Enter") {
            if (typeof ev.preventDefault === "function") ev.preventDefault();
            input.click();
          }
        }
      }
    });
    input.checked = vm.only === true;
    return D.el("div", { className: "p5-record" }, [
      D.el("p", { className: "p5-record__count", attrs: { "data-p5": "correct-count" },
        text: fillText(T.correctCount, { k: vm.k, q: vm.q }) }),
      D.el("label", { className: "p5-only", attrs: { "data-p5": "only-label" } }, [
        input,
        D.el("span", { className: "p5-only__text", text: T.unansweredOnlyLabel })
      ]),
      D.el("p", { className: "p5-record__hint", attrs: { "data-p5": "filter-hint" },
        text: vm.kind === "allCorrect" ? T.filterHintAllCorrect : T.filterHint }),
      vm.k >= 1 && vm.kind !== "allCorrect" ? renderClearButton(T, "btn btn--secondary p5-record__clear") : null
    ]);
  }

  /**
   * （v0.18，FE-81；CR-10）「清除答對紀錄，重新來過」按鈕：.p5-record 與全部答對畫面共用，事件都走 onClearRequest。
   * @param {object} T 契約文字 PART5_RECORD_TEXTS
   * @param {string} className
   * @returns {Element}
   */
  function renderClearButton(T, className) {
    return dom().el("button", {
      className: className,
      attrs: { type: "button", "data-p5": "clear" },
      text: T.clearAndRestart,
      on: {
        click: function () {
          onClearRequest();
        }
      }
    });
  }

  /**
   * （v0.15，FE-75；CR-6；AC-46-08）清除確認對話框：true → clearPart5CorrectIds；
   * false（取消、Esc、點遮罩）→ 不呼叫任何 action，焦點回到清除按鈕。
   * @returns {Promise|undefined} 對話框流程（已有對話框開啟中時回 undefined）
   */
  function onClearRequest() {
    if (confirming) return undefined;
    var T = constants().record;
    var dlg = root.EMT && root.EMT.ui && root.EMT.ui.dialog;
    if (!dlg || typeof dlg.confirm !== "function") throw new Error("[EMT.views.part5] 缺少模組 EMT.ui.dialog");
    confirming = true;
    var p;
    try {
      p = Promise.resolve(dlg.confirm({
        title: RECORD_TEXT.confirmTitle,
        message: RECORD_TEXT.confirmMessage,
        okText: T.confirmOk,
        cancelText: T.confirmCancel
      }));
    } catch (e) {
      p = Promise.reject(e);
    }
    return p.then(function (ok) {
      confirming = false;
      if (ok === true) {
        pendingFocus = "question";
        var r = act("clearPart5CorrectIds");
        if (!r || !r.ok) pendingFocus = null;
        return;
      }
      focusSelector('[data-p5="clear"]');
    }, function (e) {
      // 對話框本身出錯：視同取消（資料不變）
      confirming = false;
      if (root.console) root.console.error("[EMT.views.part5] 確認視窗失敗", e);
    });
  }

  /**
   * （v0.15，FE-75；v0.18，FE-81；UO-7、SM-3；AC-46-06、AC-46-08）全部答對畫面：標題、（phase = summary 且 y ≥ 1 時）本輪結算、
   * 清除按鈕（唯一按鈕，不可復原所以不用主要按鈕樣式）。
   * 不顯示題目、選項與「第 i / N 題」。
   */
  function renderAllCorrect(vm, T) {
    var D = dom();
    var children = [
      D.el("h3", { className: "p5-allcorrect__title", attrs: { tabindex: "-1", "data-p5": "allcorrect-title" },
        text: fillText(T.allCorrectTitle, { q: vm.q }) })
    ];
    if (vm.inSummary) {
      children.push(D.el("p", { className: "p5-allcorrect__caption", text: TEXT.summaryTitle }));
      children.push(D.el("p", { className: "p5-summary__score", attrs: { "data-p5": "summary-score" },
        text: "答對 " + vm.roundCorrect + " / " + vm.roundAnswered }));
    }
    children.push(D.el("div", { className: "btn-row p5-allcorrect__actions" }, [renderClearButton(T, "btn")]));
    return D.el("div", { className: "card p5-allcorrect" }, children);
  }

  /** 題庫為空 */
  function renderEmpty() {
    var D = dom();
    return D.el("div", { className: "card p5-empty" }, [
      D.el("p", { className: "p5-empty__text", text: TEXT.empty })
    ]);
  }

  /** 結算畫面（AC-11-04、AC-11-07；v0.18，SM-1、SM-2：y = 0 改顯示 summaryNoNewAnswers，a = 0 無累計行） */
  function renderSummary(vm, T) {
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
      vm.roundAnswered >= 1
        ? D.el("p", { className: "p5-summary__score", attrs: { "data-p5": "summary-score" },
          text: "答對 " + vm.roundCorrect + " / " + vm.roundAnswered })
        : D.el("p", { className: "p5-summary__none", attrs: { "data-p5": "summary-none" }, text: T.summaryNoNewAnswers }),
      vm.totalAnswered >= 1
        ? D.el("p", { className: "p5-summary__total",
          text: "累計答對 " + vm.totalCorrect + " / " + vm.totalAnswered })
        : null,
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

  /** 4 個選項按鈕（AC-11-01、AC-11-06；v0.18，LV-2：lockedReview 全部 disabled，沒有 aria-pressed=true） */
  function renderOptions(vm) {
    var D = dom();
    var items = vm.options.map(function (opt) {
      var children = [
        D.el("span", { className: "p5-option__letter", text: opt.letter + "." }),
        D.el("span", { className: "p5-option__text", attrs: { lang: "en" }, text: opt.text })
      ];
      if (opt.state === "correct") children.push(D.el("span", { className: "p5-option__badge", text: TEXT.badgeCorrect }));
      if (opt.state === "wrong") children.push(D.el("span", { className: "p5-option__badge", text: TEXT.badgeWrong }));
      var inactive = vm.questionState !== "idle";
      var btn = D.el("button", {
        className: "p5-option p5-option--" + opt.state,
        attrs: {
          type: "button",
          "data-p5": "option",
          "data-index": String(opt.index),
          "data-state": opt.state,
          disabled: inactive,
          "aria-pressed": inactive ? (vm.locked === opt.index ? "true" : "false") : null
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

  /**
   * 回饋文字（AC-11-02；v0.18，LV-2、LV-6）。
   * @param {object} vm question 的畫面資料
   * @param {object} T 契約文字 PART5_RECORD_TEXTS
   * @returns {{ correct: boolean, text: string }}
   */
  function feedbackText(vm, T) {
    if (vm.questionState === "lockedReview") {
      return vm.valid ? { correct: true, text: T.lockedReviewFeedback } : { correct: false, text: TEXT.badData };
    }
    if (vm.isCorrect) return { correct: true, text: TEXT.correct };
    return { correct: false, text: vm.correctIndex >= 0 ? TEXT.wrongPrefix + LETTERS[vm.correctIndex] + "." : TEXT.badData };
  }

  /** 作答結果或已答對鎖定檢視的回饋與解析（AC-11-02、AC-48-01）；資料不完整的鎖定檢視只顯示非空段落（LV-6） */
  function renderResult(vm, T) {
    var D = dom();
    var fb = feedbackText(vm, T);
    var feedback = D.el("p", {
      className: "p5-feedback p5-feedback--" + (fb.correct ? "correct" : "wrong"),
      attrs: { "data-p5": "feedback" },
      text: fb.text
    });

    var core = vm.explanation.coreStrategy;
    var lines = vm.explanation.structureLines.map(function (line) {
      return D.el("li", { attrs: { lang: "en" }, text: line });
    });
    var partial = vm.questionState === "lockedReview" && !vm.valid;
    var showCore = !partial || core.trim() !== "";
    var showStructure = !partial || lines.length > 0;
    var parts = [];
    if (showCore) {
      parts.push(D.el("h3", { className: "p5-explain__title", attrs: { "data-p5": "core-title" }, text: TEXT.core }));
      parts.push(D.el("p", { className: "p5-explain__body", attrs: { "data-p5": "core" }, text: core }));
    }
    if (showStructure) {
      parts.push(D.el("h3", { className: "p5-explain__title", attrs: { "data-p5": "structure-title" }, text: TEXT.structure }));
      parts.push(D.el("ul", { className: "p5-structure", attrs: { "data-p5": "structure" } }, lines));
    }
    return D.el("div", { className: "p5-result" }, [
      feedback,
      parts.length > 0
        ? D.el("section", { className: "p5-explain", attrs: { "data-p5": "explanation", "aria-label": "解析" } }, parts)
        : null
    ]);
  }

  /** 作答畫面 */
  function renderQuestion(vm, T) {
    var D = dom();
    var badgeText = T && typeof T.correctBadge === "string" ? T.correctBadge : FALLBACK_RECORD_TEXTS.correctBadge;
    // （v0.18，LV-1、LV-2）answered、lockedReview 都有回饋、解析與「下一題」
    var hasResult = vm.questionState !== "idle";
    var children = [
      D.el("div", { className: "p5-meta" }, [
        D.el("h3", { className: "p5-number", attrs: { tabindex: "-1", "data-p5": "number" },
          text: "第 " + vm.number + " / " + vm.total + " 題" }),
        vm.typeLabel ? D.el("span", { className: "p5-type", attrs: { "data-p5": "type" }, text: vm.typeLabel }) : null,
        // （v0.15，CR-4 (a)；AC-45-04）曾答對才建立標示；未曾答對不顯示任何標示
        vm.correctBadge ? D.el("span", { className: "p5-badge", attrs: { "data-p5": "correct-badge" }, text: badgeText }) : null
      ]),
      renderSentence(vm.segments),
      renderOptions(vm),
      // 作答結果以 live region 宣告
      D.el("div", { className: "p5-live", attrs: { "aria-live": "polite" } }, [hasResult ? renderResult(vm, T) : null])
    ];
    // 資料不完整的鎖定檢視已在回饋位置顯示，不重複（LV-6）
    if (!vm.valid && vm.questionState !== "lockedReview") {
      children.push(D.el("p", { className: "p5-warning", text: TEXT.badData }));
    }
    // 未作答（idle）沒有「下一題」（store 的 nextPart5 也不前進，AC-48-03）
    if (hasResult) {
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
    var c = constants();
    var T = c.record;
    var vm = buildViewModel(progress(), list, c, record());
    var body;
    if (vm.kind === "empty") body = renderEmpty();
    else if (vm.kind === "summary") body = renderSummary(vm, T);
    else if (vm.kind === "allCorrect") body = renderAllCorrect(vm, T);
    else body = renderQuestion(vm, T);

    D.clear(rootEl);
    D.append(rootEl, [
      D.el("div", { className: "p5" }, [
        D.el("h2", { className: "page-title p5-heading", text: TEXT.heading }),
        // （v0.12，FE-61）作答進度條：h2 之後、題型說明之前（MT-1）
        renderProgressBar(vm, list.length),
        // （v0.15，FE-75）計數行與開關：進度條之後、題型說明之前；題庫為空時不建立（SD-FB-64）
        vm.kind === "empty" ? null : renderRecord(vm, T),
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
    // （v0.15，§7.21.4 互動表）開關操作後焦點留在開關；進入全部答對畫面時移到標題
    if (target === "only") sel = '[data-p5="only"]';
    else if (vm.kind === "summary") sel = '[data-p5="summary-title"]';
    else if (vm.kind === "allCorrect") sel = '[data-p5="allcorrect-title"]';
    else if (vm.kind === "question") sel = target === "next" ? '[data-p5="next"]' : '[data-p5="number"]';
    focusSelector(sel);
  }

  /** 聚焦 rootEl 內符合選擇器的元素（不存在時忽略） */
  function focusSelector(sel) {
    var node = sel && rootEl && typeof rootEl.querySelector === "function" ? rootEl.querySelector(sel) : null;
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
    RECORD_TEXT: RECORD_TEXT,
    fillText: fillText,
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
