/*
 * views/speech-panel.js — 抽認卡語音面板（FE-12；v0.9 麥克風與收音條 FE-39；v0.15 準備中與訊息分流 FE-92）
 * 依據：architecture.md §4.4、§7.3、§7.6「TTS」「STT」、§7.11 A-5、A-6、§7.14、§9「收音條」；
 *       契約 SttResult、SttLight、SttStatus、RuntimeState.speech、PersistedData.sttNoticeAcknowledged、
 *       README §7.7 V-ST-08、§8 AC-21-03 列、§9.3 DS-02、DS-03；PRD Q-04、Q-14、Q-36、Q-37
 *       v0.15（FE-92）：architecture.md §4.13、§7.26.1～§7.26.9；契約 data-schema §18 STT_FLOW_TEXTS、STT_TIMING、
 *       STT_RESULT_ROWS、SttNoTextOutcome，README §14.1 PR-1～PR-12、§14.2 MS-1～MS-6、§14.3 RT-1～RT-6、DS-58～DS-61
 *       v0.16（FE-95）：architecture.md §4.14、§7.28.3（第 1 次按下先畫出準備中再取得麥克風，修正 BUG-007）
 * 涵蓋：AC-07-01～AC-07-05、AC-08-01～AC-08-03、AC-08-06～AC-08-11、AC-08-13、AC-08-14、
 *       AC-21-02、AC-21-03、AC-22-03、AC-33-01～AC-33-08、AC-58-01～AC-58-13、AC-59-01～AC-59-07、AC-60-01～AC-60-07
 *
 * 提供 EMT.components.speechPanel（由 FE-11 抽認卡頁呼叫）：
 *   render(containerEl, card, state)
 *     - containerEl：卡片正面的 .fc-speech（每次都是新的空容器）；card：StudyCard；state：AppState。
 *     - 產生：「朗讀」1.0x、0.75x 按鈕；麥克風按鈕、5 格收音條與常駐「需要連網」標示；訊息列；分數區。
 *     - 首次 render 時訂閱 store；之後 "speech" tag 的變更（麥克風狀態、評分結果）由本元件自行更新，
 *       抽認卡頁不會為此重繪。
 *   reset()
 *     - 換卡、切換模式時呼叫：停止朗讀、中止準備中或聆聽中的嘗試（不提示）、停止音量分析並把收音條歸暗、
 *       清除訊息、麥克風回待機。**不釋放**麥克風音軌（同頁重用，Q-36、AC-33-01）。
 *   release()
 *     - 離開單字卡頁時呼叫（flashcards.hide）：reset() ＋ EMT.services.mic.release()，
 *       停止所有音軌並關閉音訊分析（AC-33-02）。
 *
 * 麥克風流程（v0.15 狀態機，architecture §7.26.4；嘗試代號 §7.26.3）：
 *   不支援 SpeechRecognition → 只 toast「建議使用 Google Chrome / Edge」（不取得麥克風）
 *   說明對話框顯示中（notice）→ 忽略
 *   聆聽中再按 → stt.stop()、本次嘗試已判定（遲到的 result 不評分，SD-FB-85）、回待機、不提示
 *   準備中再按 → 取消（cancelAttempt）、回待機、不提示（AC-58-04）
 *   離線 → 不經過準備中，清除分數並顯示「語音辨識需要網路連線」（SD-FB-90）
 *   sttNoticeAcknowledged 為 false → 狀態 notice，以 ui.dialog 顯示說明（不清除畫面，FB-78）：
 *       「我知道了」→ acknowledgeSttNotice 後開始嘗試；「取消」→ 回待機、畫面不變（下次仍顯示，V-ST-08）
 *   開始嘗試（beginAttempt）：新代號、停止朗讀、清除前次分數與訊息 → 準備中／acquiringMic
 *       （v0.16 FE-95，§7.28.3）尚未持有音軌時，等「準備中」畫出（rAF → setTimeout 0，後備 50 ms）才取得麥克風；
 *       延後期間取消、換卡、離頁不會呼叫 acquire（BUG-007、AC-58-01）
 *   取得麥克風（EMT.services.mic.acquire，已持有音軌時直接重用；取得中再呼叫共用同一個 Promise）：
 *       permission → 「需要麥克風權限」；notfound → 「找不到麥克風裝置」；released → 不提示；
 *       unavailable → 照常辨識、收音條全暗（AC-33-07）；成功 → stt.start()
 *   stt.start() 回傳 audioStartSupported：true → awaitingAudioStart（T_READY 逾時）；false → fallbackWait（T_FALLBACK 後聆聽中）
 *   audiostart（經 T_BUFFER）、soundstart、speechstart → 聆聽中＋ mic.startMeter（收音條只從這裡點亮，PR-3）
 *   result／nomatch／error／end → outcomeOf 判定（每次嘗試只判定 1 次）：評分、錯誤訊息或 3 種分流訊息之一
 *   聆聽以任何方式結束 → 同一個工作中 mic.stopMeter() 並把 5 格設暗（AC-33-03）
 *   準備中或聆聽中音軌結束（拔除、被停用）→ 取消、回待機、「找不到麥克風裝置」（AC-33-06、AC-58-11）
 *
 * 隱私：不保存任何音訊；音量值只存在本元件的區域變數（只用來切換收音條 class），從不傳給 store action；
 *       評分結果只放執行期狀態（契約 RuntimeState.speech.lastResult，不持久化，AC-21-03）；
 *       辨識事件旗標只放模組變數 att，不進 store（AC-59-07）。本檔不直接存取麥克風，一律經 services/mic.js。
 * 安全：所有文字（含辨識結果與自訂單字）一律經 EMT.core.dom.el 以 textContent 寫入（C-7、RT-3）。
 * 純邏輯（錯誤訊息對照、評分結果、分數區模型、訊息判定 outcomeOf）於 Node 下以 module.exports 匯出供單元測試；
 * 瀏覽器下只登錄元件，載入時不操作 DOM。
 */
(function (root) {
  "use strict";

  var EMT = (root.EMT = root.EMT || {});

  // ════════════════════════════════════════════════════════════════
  // 畫面文字（PRD 以「」標出者逐字使用；v0.15 新增 4 段逐字等於契約 STT_FLOW_TEXTS）
  // ════════════════════════════════════════════════════════════════
  var TEXT = {
    ttsGroup: "朗讀",
    ttsNormal: "1.0x",
    ttsSlow: "0.75x",
    ttsNormalLabel: "以 1.0 倍速朗讀",
    ttsSlowLabel: "以 0.75 倍速朗讀",
    ttsUnsupported: "此瀏覽器不支援語音朗讀",            // AC-07-04
    ttsNoVoice: "此裝置未安裝美式英語語音",               // AC-07-05
    mic: "麥克風跟讀",
    micPreparing: "準備中",                               // AC-58-01（v0.15）
    micListening: "聆聽中",                               // AC-08-01
    micIdleLabel: "開始語音辨識",
    micPreparingLabel: "準備中，再按一次取消",            // AC-58-01（v0.15；全形逗號）
    micListeningLabel: "聆聽中，再按一次停止",
    needNetwork: "需要連網",                              // AC-08-13、Q-04
    sttUnsupported: "建議使用 Google Chrome / Edge",      // AC-08-02
    offline: "語音辨識需要網路連線",                      // AC-08-14
    permission: "需要麥克風權限",                         // AC-08-09
    permissionHelp: "開啟方式：點網址列左側的圖示（鎖頭或資訊圖示），將「麥克風」設為允許，再按一次麥克風按鈕。",
    noDevice: "找不到麥克風裝置",                         // AC-33-05、AC-33-06（v0.9）
    noDeviceHelp: "請確認裝置已連接麥克風後再按一次",     // AC-33-05（v0.9）
    meterLabel: "收音音量",                               // §7.14 收音條 aria-label
    heardNoWords: "有收到聲音，但沒聽出英文單字，請再說一次", // AC-59-01～AC-59-04（v0.15）
    noSpeech: "未偵測到語音，請再試一次",                 // AC-08-10、AC-59-05
    noResponse: "語音辨識沒有回應，請再試一次",           // AC-58-06、AC-58-08（v0.15）
    generic: "語音辨識發生錯誤，請稍後再試一次",
    noticeTitle: "語音辨識說明",
    // AC-08-13（v0.9）原文
    notice: "語音辨識由瀏覽器提供，您的語音會傳送到瀏覽器廠商（如 Google、Microsoft）的伺服器處理；本系統只即時讀取音量以顯示收音條，不錄音、不保存、不上傳錄音。停留在單字卡頁期間，瀏覽器可能持續顯示麥克風使用中圖示，離開單字卡頁即停止使用麥克風",
    noticeOk: "我知道了",
    noticeCancel: "取消",
    resultTitle: "辨識吻合度",                            // AC-08-11、Q-14
    resultNote: "此分數比對的是語音辨識出的文字，不代表音素層級的發音準確度", // AC-08-11
    tipYellow: "放慢速度或重聽 0.75x 示範",               // AC-08-07
    labelRecognized: "辨識文字",                          // AC-08-08、AC-60-01
    labelTarget: "目標文字"
  };

  /**
   * 準備中的時間常數（ms；architecture §7.26.1，全檔唯一來源）。
   * 契約範圍：readyTimeoutMs 3000～10000、bufferMs 0～500、fallbackMs 1000～2000（STT_TIMING）；
   * 調整只改這 1 處（主控代核），單元測試只驗證範圍。
   */
  var TIMING = Object.freeze({ readyTimeoutMs: 5000, bufferMs: 0, fallbackMs: 1500 });

  /**
   * （v0.16，architecture §7.28.3）第 1 次按下時「準備中」畫出後才取得麥克風的後備延遲（ms）。
   * 分頁在背景、requestAnimationFrame 被暫停時，最晚此時間後仍會取得。不屬於契約 STT_TIMING，不放進 TIMING。
   */
  var PAINT_FALLBACK_MS = 50;

  // 燈號文字（不只靠顏色辨識）
  var LIGHT_LABELS = { green: "綠燈", yellow: "黃燈", red: "紅燈" };

  // 分數區各燈號的文字列（契約 STT_RESULT_ROWS，Q-98 A）：綠、黃只顯示「辨識文字」；紅燈加「目標文字」
  var RESULT_ROWS = { green: ["recognized"], yellow: ["recognized"], red: ["recognized", "target"] };

  // 速度（AC-07-01、AC-07-02）
  var RATE_NORMAL = 1;
  var RATE_SLOW = 0.75;

  // ════════════════════════════════════════════════════════════════
  // 純邏輯（可在 Node 測試）
  // ════════════════════════════════════════════════════════════════

  /**
   * 依 SpeechRecognition 錯誤代碼決定提示。
   * @param {string} code
   * @returns {{text: string, help: string, kind: string}} 一律回傳提示（手動停止的 aborted 不會傳入）
   */
  function messageForError(code) {
    switch (code) {
      case "not-allowed":
      case "service-not-allowed":
        return { text: TEXT.permission, help: TEXT.permissionHelp, kind: "error" };
      case "audio-capture":
        // v0.5 修訂（契約 DS-03、PRD R-18 二 (d)）：與麥克風取得失敗 notfound 同訊息
        return { text: TEXT.noDevice, help: TEXT.noDeviceHelp, kind: "error" };
      case "network":
        return { text: TEXT.offline, help: "", kind: "error" };
      case "no-speech":
        return { text: TEXT.noSpeech, help: "", kind: "info" };
      // aborted：手動停止造成的已由 services/stt.js 濾掉不回呼；
      // 會傳到這裡的是非手動中止，依 §7.6 對照表視同其他錯誤（走 default）
      default:
        return { text: TEXT.generic, help: "", kind: "error" };
    }
  }

  /**
   * 依 mic.acquire() 的失敗原因決定提示（§7.14 錯誤對照，DS-03）。
   * @param {string} reason "permission" | "notfound" | "unavailable" | "released"
   * @returns {{text: string, help: string, kind: string}|null}
   *   null = 不提示（unavailable 照常辨識；released 為取得中已離開頁面）
   */
  function messageForAcquire(reason) {
    switch (reason) {
      case "permission":
        return { text: TEXT.permission, help: TEXT.permissionHelp, kind: "error" };   // AC-08-09
      case "notfound":
        return { text: TEXT.noDevice, help: TEXT.noDeviceHelp, kind: "error" };       // AC-33-05
      default:
        return null;                                                                   // AC-33-07
    }
  }

  /**
   * 取得 core/meter（呼叫時取用；Node 測試下改以 require 載入）；不存在回 null。
   */
  function meterLib() {
    var m = EMT.core && EMT.core.meter;
    if (!m && typeof module === "object" && module.exports && typeof require === "function") {
      try {
        m = require("../core/meter.js");
      } catch (e) {
        m = null;
      }
    }
    return m && typeof m.barsModel === "function" ? m : null;
  }

  // 收音條格數（與 core/meter.BAR_COUNT 相同；meter 不存在時的後備）
  var BAR_COUNT = 5;

  /**
   * 收音條模型：長度 5 的布林陣列，前 level 個為 true（委派 meter.barsModel）。
   * meter 不存在或回傳格式不符時一律全暗。
   * @param {number} level 亮格數 0～5
   * @returns {boolean[]}
   */
  function meterBarsOf(level) {
    var dark = [];
    for (var i = 0; i < BAR_COUNT; i++) dark.push(false);
    var m = meterLib();
    if (!m) return dark;
    var bars;
    try {
      bars = m.barsModel(level);
    } catch (e) {
      return dark;
    }
    if (!bars || bars.length !== BAR_COUNT) return dark;
    var out = [];
    for (var j = 0; j < BAR_COUNT; j++) out.push(bars[j] === true);
    return out;
  }

  /**
   * 由辨識文字與目標文字產生 SttResult（契約）；辨識文字清洗後為空回 null（不顯示分數，AC-08-10）。
   * @param {string} recognized 辨識原文
   * @param {string} target 目標文字（卡片 word 原文）
   * @param {{score: Function, lightOf: Function}} sim core/similarity
   * @returns {{recognizedText: string, targetText: string, score: number, light: string}|null}
   */
  function buildResult(recognized, target, sim) {
    if (!sim || typeof sim.score !== "function" || typeof sim.lightOf !== "function") return null;
    var rec = typeof recognized === "string" ? recognized : "";
    var tgt = typeof target === "string" ? target : "";
    var s = sim.score(rec, tgt);
    if (s === null || typeof s !== "number" || !isFinite(s)) return null;
    var light = sim.lightOf(s);
    if (!light) return null;
    return { recognizedText: rec, targetText: tgt, score: s, light: light };
  }

  /**
   * 分數區顯示模型（AC-08-06～AC-08-08、AC-08-11、AC-60-01～AC-60-04）。
   * （v0.15）compare 依 RESULT_ROWS 一律為陣列：綠、黃 1 列「辨識文字」，紅燈 2 列；值為引擎原文（RT-1）。
   * @param {object|null} r SttResult
   * @returns {{title: string, scoreText: string, light: string, lightLabel: string, note: string,
   *            tip: string|null, compare: Array<{label: string, value: string}>}|null}
   */
  function resultModel(r) {
    if (!r || typeof r !== "object" || typeof r.score !== "number" || LIGHT_LABELS[r.light] === undefined) return null;
    var rows = RESULT_ROWS[r.light];
    var compare = [];
    for (var i = 0; i < rows.length; i++) {
      if (rows[i] === "recognized") compare.push({ label: TEXT.labelRecognized, value: String(r.recognizedText || "") });
      else compare.push({ label: TEXT.labelTarget, value: String(r.targetText || "") });
    }
    return {
      title: TEXT.resultTitle,
      scoreText: String(r.score),
      light: r.light,
      lightLabel: LIGHT_LABELS[r.light],
      note: TEXT.resultNote,
      tip: r.light === "yellow" ? TEXT.tipYellow : null,
      compare: compare
    };
  }

  /**
   * 訊息判定（MS-1，architecture §7.26.5；純函式）。第一個成立的條件為準：
   *   1 manual 或 info.manual → none；2 hadText → score；
   *   3 errorCode 不是 null 也不是 "no-speech" → error；
   *   4 speechDetected 或 nomatch，或 hadResult 但 hadText 為假 → heardNoWords；
   *   5 errorCode === "no-speech" 或 confirmed → noSpeech；6 其他 → noResponse。
   * @param {{manual?: boolean, hadText?: boolean, info?: object, confirmed?: boolean}} input
   * @returns {{kind: string, code?: string}}
   */
  function outcomeOf(input) {
    var o = input && typeof input === "object" ? input : {};
    var i = o.info && typeof o.info === "object" ? o.info : {};
    var code = typeof i.errorCode === "string" && i.errorCode ? i.errorCode : null;
    if (o.manual === true || i.manual === true) return { kind: "none" };
    if (o.hadText === true) return { kind: "score" };
    if (code !== null && code !== "no-speech") return { kind: "error", code: code };
    if (i.speechDetected === true || i.nomatch === true || i.hadResult === true) return { kind: "heardNoWords" };
    if (code === "no-speech" || o.confirmed === true) return { kind: "noSpeech" };
    return { kind: "noResponse" };
  }

  /**
   * 卡片的目標文字（word 原文；非字串回 ""）。
   * @param {object} card StudyCard
   * @returns {string}
   */
  function targetOf(card) {
    var item = card && card.item;
    return item && typeof item.word === "string" ? item.word : "";
  }

  var logic = {
    TEXT: TEXT,
    TIMING: TIMING,
    PAINT_FALLBACK_MS: PAINT_FALLBACK_MS,
    LIGHT_LABELS: LIGHT_LABELS,
    messageForError: messageForError,
    messageForAcquire: messageForAcquire,
    meterBarsOf: meterBarsOf,
    buildResult: buildResult,
    resultModel: resultModel,
    outcomeOf: outcomeOf,
    targetOf: targetOf
  };

  if (typeof module === "object" && module.exports) {
    module.exports = logic;
    return;
  }

  // ════════════════════════════════════════════════════════════════
  // 瀏覽器端
  // ════════════════════════════════════════════════════════════════

  var ui = null;          // 目前面板的 DOM 參照
  var cardKey = null;     // 目前卡片的 wordKey
  var target = "";        // 目前卡片的目標文字
  var message = null;     // 訊息列內容 { text, help, kind }
  var gen = 0;            // 嘗試代號：每次 beginAttempt／取消／reset 遞增；非同步回呼據此判斷是否仍有效（§7.26.3）
  var unsubscribe = null;
  var shownResult = null; // 分數區目前顯示的 SttResult（參照比對，避免重複重建）
  var acquiringGen = -1;  // 正在呼叫 mic.acquire() 的代號（只表示「本代號正在取得」，不再用來忽略再按，PR-7）
  var meterActive = false; // 音量分析是否進行中（聆聽中才為 true）
  var shownLevel = 0;     // 收音條目前亮格數（只供重建 DOM 時還原顯示；不寫入任何狀態）
  var trackEndedBound = false; // 是否已向 mic 登錄音軌結束回呼
  /**
   * 目前嘗試（§7.26.3；只在模組內，不進 store）：
   * { id, confirmed, decided, stage, info, timers: { ready, buffer, fallback, frame, paint } }
   * （v0.16）frame：等待「準備中」畫出的 requestAnimationFrame 代號；paint：畫出後（或後備）取得麥克風的計時器
   * stage："acquiringMic" | "awaitingAudioStart" | "fallbackWait" | "listening"
   */
  var att = null;

  function dom() {
    return EMT.core.dom;
  }

  function services() {
    return EMT.services || {};
  }

  function store() {
    return EMT.store || null;
  }

  function actions() {
    var s = store();
    return (s && s.actions) || {};
  }

  /** 安全呼叫 store action（最多 2 個參數；只傳實際給的參數） */
  function act(name, arg, arg2) {
    var a = actions();
    if (typeof a[name] !== "function") return undefined;
    try {
      if (arguments.length > 2) return a[name](arg, arg2);
      if (arguments.length > 1) return a[name](arg);
      return a[name]();
    } catch (e) {
      if (typeof console !== "undefined") console.error("[EMT.components.speechPanel] " + name + " 失敗", e);
      return undefined;
    }
  }

  function getState() {
    var s = store();
    if (!s || typeof s.getState !== "function") return null;
    try {
      return s.getState();
    } catch (e) {
      return null;
    }
  }

  function toast(text, kind) {
    var t = EMT.ui && EMT.ui.toast;
    if (t && typeof t.show === "function") {
      try { t.show(text, { kind: kind || "info" }); } catch (e) { /* 忽略 */ }
    }
  }

  /** RuntimeState.speech（缺漏時以服務偵測補上） */
  function speechOf(st) {
    var sp = st && st.runtime && st.runtime.speech;
    if (sp && typeof sp === "object") return sp;
    var sv = services();
    return {
      ttsSupported: !!(sv.tts && sv.tts.isSupported && sv.tts.isSupported()),
      sttSupported: !!(sv.stt && sv.stt.isSupported && sv.stt.isSupported()),
      sttStatus: "idle",
      preparingPhase: null,
      lastResult: null
    };
  }

  function similarity() {
    return EMT.core && EMT.core.similarity;
  }

  /** services/mic（不存在時回 null，流程退回 v0.8：不讀音量、照常辨識） */
  function micService() {
    var m = services().mic;
    return m && typeof m === "object" ? m : null;
  }

  // ── 計時器（呼叫時取用 root.setTimeout／clearTimeout，方便測試注入假時鐘；§7.26.3） ──

  function hasTimer() {
    return typeof root.setTimeout === "function";
  }

  function setTimer(fn, ms) {
    try {
      return root.setTimeout(fn, ms);
    } catch (e) {
      return null;
    }
  }

  function clearTimer(id) {
    if (id === null || id === undefined) return;
    try {
      if (typeof root.clearTimeout === "function") root.clearTimeout(id);
    } catch (e) { /* 忽略 */ }
  }

  /** 取消畫格回呼（v0.16；root.cancelAnimationFrame 不存在或拋例外時忽略） */
  function cancelFrame(id) {
    if (id === null || id === undefined) return;
    try {
      if (typeof root.cancelAnimationFrame === "function") root.cancelAnimationFrame(id);
    } catch (e) { /* 忽略 */ }
  }

  /** 清除嘗試的計時器（ready、buffer、fallback；v0.16 加畫格 frame 與延後取得 paint） */
  function clearTimers(a) {
    if (!a || !a.timers) return;
    clearTimer(a.timers.ready);
    clearTimer(a.timers.buffer);
    clearTimer(a.timers.fallback);
    cancelFrame(a.timers.frame);
    clearTimer(a.timers.paint);
    a.timers.ready = null;
    a.timers.buffer = null;
    a.timers.fallback = null;
    a.timers.frame = null;
    a.timers.paint = null;
  }

  // ── 嘗試代號（§7.26.3） ──

  /** 代號 id 的嘗試是否仍有效（未取消、未被取代、未判定） */
  function live(id) {
    return id === gen && att !== null && att.id === id && !att.decided;
  }

  /** 空白的辨識事件旗標（SttEndInfo 8 欄初始值） */
  function blankInfo() {
    return {
      manual: false, hadResult: false, hadError: false, audioStarted: false,
      soundStarted: false, speechDetected: false, nomatch: false, errorCode: null
    };
  }

  /**
   * 合併服務送來的旗標到本次嘗試（服務未提供 info 時以事件本身補上）。
   * 布林旗標只會由 false 變 true；errorCode 只記第一個。
   */
  function mergeInfo(a, info, patch) {
    var cur = a.info;
    var srcs = [info, patch];
    for (var s = 0; s < srcs.length; s++) {
      var src = srcs[s];
      if (!src || typeof src !== "object") continue;
      for (var k in cur) {
        if (!Object.prototype.hasOwnProperty.call(cur, k)) continue;
        if (k === "errorCode") {
          if (cur.errorCode === null && typeof src.errorCode === "string" && src.errorCode) cur.errorCode = src.errorCode;
        } else if (src[k] === true) {
          cur[k] = true;
        }
      }
    }
  }

  /** 本次嘗試是否已確認開始收音（§7.26.5） */
  function confirmedOf(a) {
    return !!(a && (a.confirmed || a.info.audioStarted || a.info.soundStarted || a.info.speechDetected));
  }

  // ── 收音條（§7.14、§7.11 A-6：只切換 is-on class，無漸變） ──

  function renderBars(level) {
    shownLevel = level;
    if (!ui || !ui.bars) return;
    var model = meterBarsOf(level);
    for (var i = 0; i < ui.bars.length; i++) {
      ui.bars[i].classList.toggle("is-on", model[i] === true);
    }
  }

  /** 同步停止音量分析並把 5 格設暗（不等計時器，AC-33-03 聆聽結束 ≤ 100 ms） */
  function stopMeterNow() {
    meterActive = false;
    var m = micService();
    if (m && typeof m.stopMeter === "function") {
      try { m.stopMeter(); } catch (e) { /* 忽略 */ }
    }
    renderBars(0);
  }

  /** 進入聆聽後開始讀取音量；回呼只切換收音條，不寫入任何狀態 */
  function startMeter(myGen) {
    renderBars(0);
    var m = micService();
    if (!m || typeof m.startMeter !== "function") return;
    meterActive = true;
    try {
      m.startMeter(function (level) {
        if (!meterActive || myGen !== gen) return;
        renderBars(level);
      });
    } catch (e) {
      meterActive = false;
      renderBars(0);
    }
  }

  /** 狀態是否為準備中或聆聽中（尚在嘗試中） */
  function isBusy(sp) {
    return sp.sttStatus === "preparing" || sp.sttStatus === "listening";
  }

  /** 音軌結束（拔除、被停用）：準備中或聆聽中 → 取消並提示；其他狀態 → 只歸暗（AC-33-06、AC-58-11） */
  function onTrackEnded() {
    try {
      var sp = speechOf(getState());
      if (!isBusy(sp)) {
        stopMeterNow();
        return;
      }
      cancelAttempt();
      endWith({ text: TEXT.noDevice, help: TEXT.noDeviceHelp, kind: "error" });
    } catch (e) {
      if (typeof console !== "undefined") console.error("[EMT.components.speechPanel] 音軌結束處理失敗", e);
    }
  }

  /** 向 mic 登錄音軌結束回呼（只登錄一次） */
  function bindTrackEnded() {
    if (trackEndedBound) return;
    var m = micService();
    if (!m || typeof m.onTrackEnded !== "function") return;
    try {
      m.onTrackEnded(onTrackEnded);
      trackEndedBound = true;
    } catch (e) { /* 忽略 */ }
  }

  /** 面板是否仍在畫面上 */
  function attached() {
    return !!(ui && ui.container && ui.container.isConnected !== false && ui.container.firstChild === ui.root);
  }

  // ── 訊息列 ──

  function setMessage(m) {
    message = m || null;
    renderMessage();
  }

  function renderMessage() {
    if (!ui) return;
    var box = ui.msg;
    dom().clear(box);
    if (!message) {
      box.hidden = true;
      box.removeAttribute("data-kind");
      return;
    }
    box.hidden = false;
    box.setAttribute("data-kind", message.kind || "info");
    box.appendChild(dom().el("p", { className: "sp-msg__text", text: message.text }));
    if (message.help) box.appendChild(dom().el("p", { className: "sp-msg__help", text: message.help }));
  }

  // ── 分數區 ──

  function renderResult(r) {
    if (!ui) return;
    if (r === shownResult) return;
    shownResult = r;
    var box = ui.result;
    dom().clear(box);
    // 只顯示屬於目前卡片的結果
    var m = r && r.targetText === target ? resultModel(r) : null;
    if (!m) {
      box.hidden = true;
      box.removeAttribute("data-light");
      return;
    }
    var el = dom().el;
    box.hidden = false;
    box.setAttribute("data-light", m.light);
    // 順序：標題 → 分數與燈號 → 提示（黃燈）→ 文字列 → 說明（RT-2、AC-60-01）
    var children = [
      el("p", { className: "sp-result__title", text: m.title }),
      el("p", { className: "sp-result__score" }, [
        el("span", { className: "sp-result__badge", text: m.scoreText }),
        el("span", { className: "sp-result__light", text: m.lightLabel })
      ])
    ];
    if (m.tip) children.push(el("p", { className: "sp-result__tip", text: m.tip }));
    if (m.compare && m.compare.length) {
      children.push(el("dl", { className: "sp-compare" }, m.compare.map(function (row) {
        return el("div", { className: "sp-compare__row" }, [
          el("dt", { className: "sp-compare__label", text: row.label }),
          el("dd", { className: "sp-compare__value", text: row.value, attrs: { lang: "en" } })
        ]);
      })));
    }
    children.push(el("p", { className: "sp-result__note", text: m.note }));
    dom().append(box, children);
  }

  // ── 麥克風按鈕（§7.26.7） ──

  function renderMic(sp) {
    if (!ui) return;
    var listening = sp.sttStatus === "listening";
    var preparing = sp.sttStatus === "preparing";
    // 狀態已離開聆聽（含準備中與其他途徑改變）→ 收音條不得停在亮格
    if (!listening && meterActive) stopMeterNow();
    var btn = ui.micBtn;
    btn.classList.toggle("is-listening", listening);
    btn.classList.toggle("is-preparing", preparing);
    btn.setAttribute("aria-pressed", listening || preparing ? "true" : "false");
    btn.setAttribute("data-status", sp.sttStatus || "idle");
    dom().setText(ui.micText, listening ? TEXT.micListening : preparing ? TEXT.micPreparing : TEXT.mic);
    btn.setAttribute("aria-label", listening ? TEXT.micListeningLabel : preparing ? TEXT.micPreparingLabel : TEXT.micIdleLabel);
    if (!sp.sttSupported) {
      btn.setAttribute("aria-disabled", "true");
      btn.setAttribute("title", TEXT.sttUnsupported);
    } else {
      btn.removeAttribute("aria-disabled");
      btn.removeAttribute("title");
    }
  }

  /** 依目前狀態同步面板（語音狀態變更時由 store 通知呼叫） */
  function sync(st) {
    if (!ui || !st) return;
    var sp = speechOf(st);
    renderMic(sp);
    renderResult(sp.lastResult || null);
  }

  function onStore(st, tags) {
    if (!attached()) return;
    var list = Array.isArray(tags) ? tags : [];
    if (list.indexOf("speech") === -1 && list.indexOf("init") === -1) return;
    sync(st || getState());
  }

  // ── STT 流程 ──

  /**
   * 設定語音狀態。離開聆聽（結果、逾時、無結果、錯誤、再按、取消、start 失敗）都經過這裡：
   * 先在同一個工作中停止音量分析並歸暗（AC-33-03）。
   * @param {string} s idle | notice | preparing | listening
   * @param {string} [phase] s 為 preparing 時的子階段
   */
  function setStatus(s, phase) {
    if (s !== "listening") stopMeterNow();
    if (s === "preparing") act("setSttStatus", s, phase);
    else act("setSttStatus", s);
  }

  /**
   * 清除前次評分（RuntimeState.speech.lastResult）與分數區。
   * 只在開始新的嘗試（beginAttempt）與離線點按時呼叫（PR-4、FB-78、BUG-001）。
   */
  function clearResult() {
    act("setSttResult", null);
    // store 未通知（或缺少 action）時仍確保分數區隱藏
    renderResult(null);
  }

  /** 結束並顯示提示 */
  function endWith(m) {
    setStatus("idle");
    if (m) setMessage(m);
  }

  /**
   * 取消目前嘗試（準備中再按、TTS、音軌結束；reset／release 經 stopAll 同樣處理）：
   * 代號失效、清計時器、stt.abort()（先解除處理器再中止）、att = null。不改狀態、不提示。
   */
  function cancelAttempt() {
    gen++;
    if (att) clearTimers(att);
    att = null;
    acquiringGen = -1;
    var stt = services().stt;
    try { if (stt && typeof stt.abort === "function") stt.abort(); } catch (e) { /* 忽略 */ }
  }

  /** 進入聆聽中：清計時器 → 狀態 listening → 開始讀音量（收音條只從這裡點亮，PR-3） */
  function enterListening(id) {
    if (!live(id)) return;
    clearTimers(att);
    att.confirmed = true;
    att.stage = "listening";
    setStatus("listening");
    if (live(id)) startMeter(id);
  }

  /** 進入準備中的某個子階段（stage 同步記在 att，畫面依 store 的 preparingPhase） */
  function enterPhase(id, phase) {
    if (!live(id)) return;
    att.stage = phase;
    setStatus("preparing", phase);
  }

  /**
   * 判定並結束本次嘗試（每次嘗試只呼叫 1 次：live 檢查 decided，MS-2）。
   * @param {number} id
   * @param {{kind: string, code?: string}} out outcomeOf 的結果
   * @param {object|null} res 評分結果（kind = score 時）
   */
  function finish(id, out, res) {
    if (!live(id)) return;
    att.decided = true;
    clearTimers(att);
    setStatus("idle");
    var k = out && out.kind;
    if (k === "score" && res) {
      setMessage(null);
      act("setSttResult", res);
      act("recordSttScored");
    } else if (k === "error") {
      setMessage(messageForError(out.code));
    } else if (k === "heardNoWords" || k === "noSpeech" || k === "noResponse") {
      setMessage({ text: TEXT[k], help: "", kind: "info" });
    }
    // none：不提示
  }

  /** 以失敗訊息結束嘗試（取得失敗、start 失敗、例外） */
  function failAttempt(id, m) {
    if (att && att.id === id) {
      att.decided = true;
      clearTimers(att);
    }
    endWith(m);
  }

  /** 終結事件：依 outcomeOf 判定 */
  function onTerminal(id, hadText, res) {
    if (!live(id)) return;
    var out = outcomeOf({ manual: false, hadText: hadText, info: att.info, confirmed: confirmedOf(att) });
    finish(id, out, res);
  }

  /** 開始收音事件（§7.26.4 事件處理表） */
  function onAudioStartEvent(id) {
    if (!live(id) || att.stage === "listening") return;
    att.confirmed = true;
    if (att.stage === "fallbackWait") {
      enterListening(id);
      return;
    }
    // acquiringMic（start 內同步觸發）或 awaitingAudioStart
    clearTimer(att.timers.ready);
    att.timers.ready = null;
    if (TIMING.bufferMs <= 0 || !hasTimer()) {
      enterListening(id);
      return;
    }
    if (att.timers.buffer === null) {
      att.timers.buffer = setTimer(function () {
        if (!live(id) || att.stage === "listening") return;
        enterListening(id);
      }, TIMING.bufferMs);
      if (att.timers.buffer === null) enterListening(id);
    }
  }

  /** 偵測到聲音或語音：準備中立即聆聽（AC-58-07） */
  function onSoundOrSpeechEvent(id) {
    if (!live(id) || att.stage === "listening") return;
    att.confirmed = true;
    enterListening(id);
  }

  /**
   * 實際開始辨識（取得麥克風完成後）。
   * @param {number} id 嘗試代號
   */
  function startListening(id) {
    if (!live(id)) return;
    var stt = services().stt;
    if (!stt || typeof stt.start !== "function") {
      failAttempt(id, { text: TEXT.sttUnsupported, help: "", kind: "error" });
      return;
    }
    var tgt = target;
    var r = stt.start({
      lang: "en-US",
      onAudioStart: function (info) {
        if (!live(id)) return;
        mergeInfo(att, info, { audioStarted: true });
        onAudioStartEvent(id);
      },
      onSoundStart: function (info) {
        if (!live(id)) return;
        mergeInfo(att, info, { soundStarted: true });
        onSoundOrSpeechEvent(id);
      },
      onSpeechStart: function (info) {
        if (!live(id)) return;
        mergeInfo(att, info, { speechDetected: true });
        onSoundOrSpeechEvent(id);
      },
      onResult: function (text, info) {
        if (!live(id)) return;
        mergeInfo(att, info, { hadResult: true });
        // MS-4：沿用 core/similarity 的清洗；buildResult 為 null 一律視為清洗後為空
        var res = buildResult(text, tgt, similarity());
        onTerminal(id, res !== null, res);
      },
      onNomatch: function (info) {
        if (!live(id)) return;
        mergeInfo(att, info, { nomatch: true });
        onTerminal(id, false, null);
      },
      onError: function (code, info) {
        if (!live(id)) return;
        var c = typeof code === "string" && code ? code : "unknown";
        mergeInfo(att, info, { hadError: true, errorCode: c });
        onTerminal(id, false, null);
      },
      onEnd: function (info) {
        if (!live(id)) return;
        mergeInfo(att, info, null);
        onTerminal(id, false, null);
      }
    });

    if (!r || r.ok !== true) {
      if (!att || att.id !== id || att.decided) return;
      var reason = r && r.reason;
      if (reason === "offline") failAttempt(id, { text: TEXT.offline, help: "", kind: "error" });
      else if (reason === "unsupported") {
        failAttempt(id, null);
        toast(TEXT.sttUnsupported, "error");
      } else failAttempt(id, { text: TEXT.generic, help: "", kind: "error" });
      return;
    }
    // start 內同步觸發的事件已讓嘗試前進或結束 → 不再設定子階段與計時器（§7.26.4）
    if (!live(id) || att.stage !== "acquiringMic") return;
    if (r.audioStartSupported === true) {
      enterPhase(id, "awaitingAudioStart");
      if (!live(id) || !hasTimer()) return;   // 沒有計時器（測試沙箱）：不設 T_READY
      att.timers.ready = setTimer(function () {
        if (!live(id) || confirmedOf(att)) return;
        try { stt.abort(); } catch (e) { /* 忽略 */ }
        finish(id, outcomeOf({ manual: false, hadText: false, info: att.info, confirmed: false }), null);
      }, TIMING.readyTimeoutMs);
      return;
    }
    // 不可依賴 audiostart（AC-58-09）：維持 T_FALLBACK 後進入聆聽中，不套用 T_READY
    enterPhase(id, "fallbackWait");
    if (!live(id)) return;
    if (!hasTimer()) {
      enterListening(id);
      return;
    }
    att.timers.fallback = setTimer(function () {
      if (!live(id) || att.stage !== "fallbackWait") return;
      att.confirmed = true;
      enterListening(id);
    }, TIMING.fallbackMs);
    if (att.timers.fallback === null) enterListening(id);
  }

  /**
   * 取得（或重用）麥克風後才開始辨識（§7.14 決定表；順序：acquire 結束後才 stt.start）。
   * acquiringMic 不計時（AC-58-06、E-157）。
   * @param {number} id 嘗試代號
   */
  function acquireThenListen(id) {
    var m = micService();
    if (!m || typeof m.acquire !== "function") {
      // 沒有麥克風服務：視同 unavailable，照常辨識（AC-33-07）
      startListening(id);
      return;
    }
    acquiringGen = id;
    var p;
    try {
      p = m.acquire();
    } catch (e) {
      p = null;
    }
    Promise.resolve(p).then(function (r) {
      onAcquired(r, id);
    }, function () {
      // acquire 永不 reject；保險起見視同 unavailable
      onAcquired({ ok: false, reason: "unavailable" }, id);
    });
  }

  /** 取得麥克風結束 */
  function onAcquired(r, id) {
    if (acquiringGen === id) acquiringGen = -1;
    // 已取消、換卡、切換模式或離開頁面：不開始辨識（音軌由 mic 保留供同頁重用，或已被 release）
    if (!live(id) || !attached()) return;
    try {
      if (r && r.ok === true) {
        startListening(id);
        return;
      }
      var reason = r && r.reason;
      if (reason === "released") {                  // 取得中已釋放：不顯示任何訊息、回待機
        failAttempt(id, null);
        return;
      }
      var m = messageForAcquire(reason);
      if (m) {
        // permission／notfound：不辨識、不顯示分數、收音條全暗（AC-08-09、AC-33-05）
        failAttempt(id, m);
        return;
      }
      startListening(id);                           // unavailable：照常辨識（AC-33-07）
    } catch (e) {
      if (typeof console !== "undefined") console.error("[EMT.components.speechPanel] 開始聆聽失敗", e);
      failAttempt(id, { text: TEXT.generic, help: "", kind: "error" });
    }
  }

  /**
   * （v0.16，architecture §7.28.3）等「準備中」實際畫到畫面上之後才執行 fn，最多執行 1 次。
   * requestAnimationFrame 的回呼在該畫格繪製「之前」執行，所以回呼內只設 setTimeout(run, 0)，
   * 讓 run 在繪製之後才執行（不得在 rAF 回呼內直接取得，否則音訊環境建構的約 110 ms 仍會擋住這個畫格）。
   * 另設 PAINT_FALLBACK_MS 後備：分頁在背景、rAF 被暫停時最晚 50 ms 後仍會取得。
   * 沒有 requestAnimationFrame（Node 測試沙箱）或呼叫拋例外 → 同步執行（與 v1.3.1 相同）。
   * 延後期間的取消、reset、release、TTS 都經 clearTimers 與 live(id) 失效，fn 不會被呼叫。
   * @param {number} id 嘗試代號
   * @param {Function} fn
   */
  function afterPaint(id, fn) {
    var done = false;
    function run() {
      if (done) return;
      if (!live(id) || !att || att.stage !== "acquiringMic" || !attached()) return;
      done = true;
      cancelFrame(att.timers.frame);
      clearTimer(att.timers.paint);
      att.timers.frame = null;
      att.timers.paint = null;
      fn();
    }
    if (typeof root.requestAnimationFrame !== "function") {
      fn();
      return;
    }
    var frameId;
    try {
      frameId = root.requestAnimationFrame(function () {
        if (!live(id)) return;
        att.timers.frame = null;
        clearTimer(att.timers.paint);
        att.timers.paint = hasTimer() ? setTimer(run, 0) : null;
        if (att.timers.paint === null) run();
      });
    } catch (e) {
      fn();
      return;
    }
    att.timers.frame = frameId === undefined ? null : frameId;
    if (hasTimer()) att.timers.paint = setTimer(run, PAINT_FALLBACK_MS);
  }

  /**
   * 開始一次嘗試（按下或「我知道了」）：新代號、停止朗讀、清除前次分數與訊息、進入準備中／acquiringMic。
   * （v0.16）已持有音軌時照舊同步取得（重用約 1 ms）；否則等「準備中」畫出後才取得（afterPaint，BUG-007）。
   */
  function beginAttempt() {
    if (att) clearTimers(att);
    gen++;
    var id = gen;
    att = {
      id: id, confirmed: false, decided: false, stage: "acquiringMic", info: blankInfo(),
      timers: { ready: null, buffer: null, fallback: null, frame: null, paint: null }
    };
    // 先停止朗讀，避免麥克風收到示範語音（§7.26.7）
    var tts = services().tts;
    try { if (tts && typeof tts.stop === "function") tts.stop(); } catch (e) { /* 忽略 */ }
    setMessage(null);
    clearResult();
    setStatus("preparing", "acquiringMic");
    var m = micService();
    var active = false;
    try {
      active = !!(m && typeof m.isActive === "function" && m.isActive() === true);
    } catch (e) {
      active = false;
    }
    if (active) {
      acquireThenListen(id);
      return;
    }
    afterPaint(id, function () { acquireThenListen(id); });
  }

  /** 說明對話框結束但不聆聽：notice → idle */
  function leaveNotice() {
    if (speechOf(getState()).sttStatus === "notice") setStatus("idle");
  }

  /** 首次說明（AC-08-13、V-ST-08）；未讀時不清除畫面（FB-78） */
  function showNotice(myGen) {
    var dlg = EMT.ui && EMT.ui.dialog;
    if (!dlg || typeof dlg.confirm !== "function") {
      // 無法顯示說明時不開始聆聽（未告知前不傳送語音）
      setStatus("idle");
      return;
    }
    setStatus("notice");
    var p;
    try {
      p = dlg.confirm({
        title: TEXT.noticeTitle,
        message: TEXT.notice,
        okText: TEXT.noticeOk,
        cancelText: TEXT.noticeCancel
      });
    } catch (e) {
      setStatus("idle");
      return;
    }
    Promise.resolve(p).then(function (ok) {
      if (ok === true) {
        // 只在按「我知道了」時記錄已讀（V-ST-08）
        act("acknowledgeSttNotice");
        if (myGen === gen && attached()) {
          // 按「我知道了」後才開始嘗試、取得麥克風（AC-08-13）
          leaveNotice();
          beginAttempt();
          return;
        }
      }
      // 取消（或期間已換卡、離開頁面）：不聆聽、回待機、畫面不變；下次仍會顯示說明
      leaveNotice();
    }, leaveNotice);
  }

  function onMicClick(ev) {
    if (ev && typeof ev.stopPropagation === "function") ev.stopPropagation();
    try {
      var st = getState();
      var sp = speechOf(st);
      var stt = services().stt;

      if (!sp.sttSupported || !stt || !stt.isSupported || !stt.isSupported()) {
        toast(TEXT.sttUnsupported, "error");                 // AC-08-02
        return;
      }
      if (sp.sttStatus === "notice") return;                 // 說明對話框開啟中
      if (sp.sttStatus === "listening") {
        // 再次按下：停止並回待機，不提示（AC-08-10）；之後遲到的結果不評分（SD-FB-85）
        if (att) {
          att.decided = true;
          clearTimers(att);
        }
        try { stt.stop(); } catch (e) { /* 忽略 */ }
        setStatus("idle");
        return;
      }
      if (sp.sttStatus === "preparing") {
        // 準備中再按 = 取消（PR-7、AC-58-04）：不等結果、不提示
        cancelAttempt();
        setStatus("idle");
        return;
      }
      if (typeof stt.isOnline === "function" && !stt.isOnline()) {
        // 離線不經過準備中（SD-FB-90），需在此清除前次分數（AC-08-14「不顯示分數」，BUG-001）
        setMessage(null);
        clearResult();
        endWith({ text: TEXT.offline, help: "", kind: "error" }); // AC-08-14
        return;
      }
      var acknowledged = !!(st && st.data && st.data.sttNoticeAcknowledged === true);
      if (!acknowledged) {
        showNotice(gen);
        return;
      }
      beginAttempt();
    } catch (e) {
      if (typeof console !== "undefined") console.error("[EMT.components.speechPanel] 麥克風操作失敗", e);
      try { clearResult(); } catch (e2) { /* 忽略 */ }
      if (att) {
        att.decided = true;
        clearTimers(att);
      }
      endWith({ text: TEXT.generic, help: "", kind: "error" });
    }
  }

  // ── TTS ──

  function onTtsClick(rate, ev) {
    if (ev && typeof ev.stopPropagation === "function") ev.stopPropagation();
    try {
      var sp = speechOf(getState());
      var tts = services().tts;
      if (!sp.ttsSupported || !tts || !tts.isSupported || !tts.isSupported()) {
        toast(TEXT.ttsUnsupported, "error");                 // AC-07-04
        return;
      }
      // 準備中或聆聽中改按朗讀：先取消嘗試並回待機，避免把示範語音當成使用者發音（AC-58-10）
      if (isBusy(sp)) {
        cancelAttempt();
        setStatus("idle");
      }
      Promise.resolve(tts.speak(target, rate)).then(function (r) {
        if (!r || r.ok) return;
        if (r.reason === "no-voice") toast(TEXT.ttsNoVoice, "error");        // AC-07-05
        else if (r.reason === "unsupported") toast(TEXT.ttsUnsupported, "error");
      }, function () { /* speak 不會 reject；保險起見忽略 */ });
    } catch (e) {
      if (typeof console !== "undefined") console.error("[EMT.components.speechPanel] 朗讀失敗", e);
    }
  }

  // ── 建立 DOM ──

  function build(container, st) {
    var el = dom().el;
    var sp = speechOf(st);

    function ttsButton(text, label, rate) {
      var attrs = { type: "button", "aria-label": label, "data-rate": String(rate) };
      if (!sp.ttsSupported) {
        // 停用狀態仍可點擊以顯示 toast（AC-07-04）；滑過以 title 提示
        attrs["aria-disabled"] = "true";
        attrs.title = TEXT.ttsUnsupported;
      }
      return el("button", {
        className: "btn btn--secondary sp-tts__btn",
        attrs: attrs,
        text: text,
        on: { click: function (ev) { onTtsClick(rate, ev); } }
      });
    }

    var ttsRow = el("div", { className: "sp-tts", attrs: { role: "group", "aria-label": TEXT.ttsGroup } }, [
      el("span", { className: "sp-tts__label", text: TEXT.ttsGroup }),
      ttsButton(TEXT.ttsNormal, TEXT.ttsNormalLabel, RATE_NORMAL),
      ttsButton(TEXT.ttsSlow, TEXT.ttsSlowLabel, RATE_SLOW)
    ]);

    var micDot = el("span", { className: "sp-mic__dot", attrs: { "aria-hidden": "true" } });
    var micText = el("span", { className: "sp-mic__text", text: TEXT.mic });
    var micBtn = el("button", {
      className: "btn btn--secondary sp-mic",
      attrs: { type: "button", "aria-pressed": "false" },
      on: { click: onMicClick }
    }, [micDot, micText]);
    var badge = el("span", { className: "sp-net", text: TEXT.needNetwork });
    // 5 格收音條：常駐、固定大小，只切換各格 is-on（AC-33-03；§7.14 DOM）
    var bars = [];
    for (var b = 0; b < BAR_COUNT; b++) bars.push(el("span", { className: "sp-meter__bar" }));
    var meterEl = el("span", { className: "sp-meter", attrs: { role: "img", "aria-label": TEXT.meterLabel } }, bars);

    var sttRow = el("div", { className: "sp-stt" }, [micBtn, meterEl, badge]);
    var msg = el("div", { className: "sp-msg", attrs: { role: "status", "aria-live": "polite", hidden: true } });
    var result = el("div", { className: "sp-result", attrs: { "aria-live": "polite", hidden: true } });

    var rootEl = el("div", { className: "sp-panel" }, [ttsRow, sttRow, msg, result]);
    dom().clear(container);
    container.appendChild(rootEl);

    ui = {
      container: container,
      root: rootEl,
      micBtn: micBtn,
      micText: micText,
      bars: bars,
      msg: msg,
      result: result
    };
    shownResult = undefined;
    // 聆聽中重建面板（同一張卡重繪）時還原收音條；其他情況一律全暗
    renderBars(meterActive ? shownLevel : 0);
  }

  /** 停止所有語音活動並讓目前嘗試失效（不改動畫面參照） */
  function stopAll() {
    gen++;
    if (att) clearTimers(att);
    att = null;
    acquiringGen = -1;
    var sv = services();
    try { if (sv.tts && typeof sv.tts.stop === "function") sv.tts.stop(); } catch (e) { /* 忽略 */ }
    try { if (sv.stt && typeof sv.stt.abort === "function") sv.stt.abort(); } catch (e) { /* 忽略 */ }
  }

  var component = {
    /**
     * @param {HTMLElement} containerEl 卡片正面 .fc-speech
     * @param {object} card StudyCard
     * @param {object} state AppState
     */
    render: function (containerEl, card, state) {
      if (!containerEl || !EMT.core || !EMT.core.dom) return;
      try {
        var key = card && typeof card.wordKey === "string" ? card.wordKey : "";
        // 未經 reset 就換卡時自行停止（保險）
        if (cardKey !== null && key !== cardKey) component.reset();
        cardKey = key;
        target = targetOf(card);
        var st = state || getState();
        build(containerEl, st);
        renderMessage();
        if (!unsubscribe) {
          var s = store();
          if (s && typeof s.subscribe === "function") unsubscribe = s.subscribe(onStore);
        }
        bindTrackEnded();
        // 同一張卡重繪（如翻面）時沿用目前狀態；殘留的 notice 狀態由對話框結束時處理
        sync(st);
      } catch (e) {
        if (typeof console !== "undefined") console.error("[EMT.components.speechPanel] render 失敗", e);
      }
    },

    /**
     * 停止朗讀、取消準備中或聆聽中的嘗試（AC-07-03、AC-08-10、AC-58-10，不提示）；
     * 同時停止音量分析、收音條歸暗。不釋放麥克風音軌（同頁重用，Q-36、AC-33-01）。
     */
    reset: function () {
      try {
        stopAll();
        stopMeterNow();
        cardKey = null;
        message = null;
        renderMessage();
        var sp = speechOf(getState());
        if (isBusy(sp)) setStatus("idle");
      } catch (e) {
        if (typeof console !== "undefined") console.error("[EMT.components.speechPanel] reset 失敗", e);
      }
    },

    /**
     * 離開單字卡頁：reset() ＋ 釋放麥克風（停止所有音軌、關閉音訊分析，AC-33-02）。
     * mic.release() 為同步，呼叫結束時音軌即為 ended。
     */
    release: function () {
      component.reset();
      var m = micService();
      if (m && typeof m.release === "function") {
        try {
          m.release();
        } catch (e) {
          if (typeof console !== "undefined") console.error("[EMT.components.speechPanel] 釋放麥克風失敗", e);
        }
      }
    }
  };

  EMT.components = EMT.components || {};
  EMT.components.speechPanel = component;
  EMT.components.speechPanelLogic = logic;
})(typeof self !== "undefined" ? self : this);
