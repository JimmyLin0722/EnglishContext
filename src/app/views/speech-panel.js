/*
 * views/speech-panel.js — 抽認卡語音面板（FE-12；v0.9 麥克風與收音條 FE-39）
 * 依據：architecture.md §4.4、§7.3、§7.6「TTS」「STT」、§7.11 A-5、A-6、§7.14、§9「收音條」；
 *       契約 SttResult、SttLight、SttStatus、RuntimeState.speech、PersistedData.sttNoticeAcknowledged、
 *       README §7.7 V-ST-08、§8 AC-21-03 列、§9.3 DS-02、DS-03；PRD Q-04、Q-14、Q-36、Q-37
 * 涵蓋：AC-07-01～AC-07-05、AC-08-01～AC-08-03、AC-08-06～AC-08-11、AC-08-13、AC-08-14、
 *       AC-21-02、AC-21-03、AC-22-03、AC-33-01～AC-33-08
 *
 * 提供 EMT.components.speechPanel（由 FE-11 抽認卡頁呼叫）：
 *   render(containerEl, card, state)
 *     - containerEl：卡片正面的 .fc-speech（每次都是新的空容器）；card：StudyCard；state：AppState。
 *     - 產生：「朗讀」1.0x、0.75x 按鈕；麥克風按鈕、5 格收音條與常駐「需要連網」標示；訊息列；分數區。
 *     - 首次 render 時訂閱 store；之後 "speech" tag 的變更（麥克風狀態、評分結果）由本元件自行更新，
 *       抽認卡頁不會為此重繪。
 *   reset()
 *     - 換卡、切換模式時呼叫：停止朗讀、中止聆聽（不提示）、停止音量分析並把收音條歸暗、清除訊息、
 *       麥克風回待機。**不釋放**麥克風音軌（同頁重用，Q-36、AC-33-01）。
 *   release()
 *     - 離開單字卡頁時呼叫（flashcards.hide）：reset() ＋ EMT.services.mic.release()，
 *       停止所有音軌並關閉音訊分析（AC-33-02）。
 *
 * 麥克風流程（AC-08-01、AC-08-02、AC-08-09、AC-08-10、AC-08-13、AC-08-14、§7.14 決定表）：
 *   不支援 SpeechRecognition → 只 toast「建議使用 Google Chrome / Edge」（不取得麥克風）
 *   聆聽中再按 → 停止並回待機（不提示）
 *   取得麥克風中再按 → 忽略（區域旗標，不進 store）
 *   離線 → 「語音辨識需要網路連線」（不取得麥克風）
 *   sttNoticeAcknowledged 為 false → 狀態 notice，以 ui.dialog 顯示說明：
 *       「我知道了」→ acknowledgeSttNotice 後取得麥克風；「取消」→ 回待機、不取得麥克風（下次仍顯示，V-ST-08）
 *   取得麥克風（EMT.services.mic.acquire，已持有音軌時直接重用）：
 *       permission → 「需要麥克風權限」與開啟方式，不辨識；notfound → 「找不到麥克風裝置」，不辨識；
 *       unavailable → 不提示，照常辨識、收音條全暗（AC-33-07）；released → 不提示、不辨識；
 *       完成時若已換卡（gen 改變）→ 不開始辨識（音軌留著供同頁重用）
 *   開始聆聽 → 狀態 listening（按鈕文字「聆聽中」、紅色閃爍）＋ mic.startMeter 依音量點亮收音條
 *   onresult → core/similarity 計分 → setSttResult、recordSttScored；辨識文字為空 → 「未偵測到語音，請再試一次」
 *   onerror：依 §7.6 對照表（audio-capture v0.5 改為「找不到麥克風裝置」）
 *   onend 無結果且非手動停止 → 「未偵測到語音，請再試一次」
 *   聆聽以任何方式結束 → 同一個工作中 mic.stopMeter() 並把 5 格設暗（AC-33-03）
 *   聆聽中音軌結束（拔除、被停用）→ 中止辨識、回待機、「找不到麥克風裝置」（AC-33-06）
 *
 * 隱私：不保存任何音訊；音量值只存在本元件的區域變數（只用來切換收音條 class），從不傳給 store action；
 *       評分結果只放執行期狀態（契約 RuntimeState.speech.lastResult，不持久化，AC-21-03）。
 *       本檔不直接存取麥克風，一律經 services/mic.js。
 * 安全：所有文字（含辨識結果與自訂單字）一律經 EMT.core.dom.el 以 textContent 寫入（C-7）。
 * 純邏輯（錯誤訊息對照、評分結果、分數區模型）於 Node 下以 module.exports 匯出供單元測試；
 * 瀏覽器下只登錄元件，載入時不操作 DOM。
 */
(function (root) {
  "use strict";

  var EMT = (root.EMT = root.EMT || {});

  // ════════════════════════════════════════════════════════════════
  // 畫面文字（PRD 以「」標出者逐字使用）
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
    micListening: "聆聽中",                               // AC-08-01
    micIdleLabel: "開始語音辨識",
    micListeningLabel: "聆聽中，再按一次停止",
    needNetwork: "需要連網",                              // AC-08-13、Q-04
    sttUnsupported: "建議使用 Google Chrome / Edge",      // AC-08-02
    offline: "語音辨識需要網路連線",                      // AC-08-14
    permission: "需要麥克風權限",                         // AC-08-09
    permissionHelp: "開啟方式：點網址列左側的圖示（鎖頭或資訊圖示），將「麥克風」設為允許，再按一次麥克風按鈕。",
    noDevice: "找不到麥克風裝置",                         // AC-33-05、AC-33-06（v0.9）
    noDeviceHelp: "請確認裝置已連接麥克風後再按一次",     // AC-33-05（v0.9）
    meterLabel: "收音音量",                               // §7.14 收音條 aria-label
    noSpeech: "未偵測到語音，請再試一次",                 // AC-08-10
    generic: "語音辨識發生錯誤，請稍後再試一次",
    noticeTitle: "語音辨識說明",
    // AC-08-13（v0.9）原文
    notice: "語音辨識由瀏覽器提供，您的語音會傳送到瀏覽器廠商（如 Google、Microsoft）的伺服器處理；本系統只即時讀取音量以顯示收音條，不錄音、不保存、不上傳錄音。停留在單字卡頁期間，瀏覽器可能持續顯示麥克風使用中圖示，離開單字卡頁即停止使用麥克風",
    noticeOk: "我知道了",
    noticeCancel: "取消",
    resultTitle: "辨識吻合度",                            // AC-08-11、Q-14
    resultNote: "此分數比對的是語音辨識出的文字，不代表音素層級的發音準確度", // AC-08-11
    tipYellow: "放慢速度或重聽 0.75x 示範",               // AC-08-07
    labelRecognized: "辨識文字",                          // AC-08-08
    labelTarget: "目標文字"
  };

  // 燈號文字（不只靠顏色辨識）
  var LIGHT_LABELS = { green: "綠燈", yellow: "黃燈", red: "紅燈" };

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
   * 分數區顯示模型（AC-08-06～AC-08-08、AC-08-11）。
   * @param {object|null} r SttResult
   * @returns {{title: string, scoreText: string, light: string, lightLabel: string, note: string,
   *            tip: string|null, compare: Array<{label: string, value: string}>|null}|null}
   */
  function resultModel(r) {
    if (!r || typeof r !== "object" || typeof r.score !== "number" || LIGHT_LABELS[r.light] === undefined) return null;
    return {
      title: TEXT.resultTitle,
      scoreText: String(r.score),
      light: r.light,
      lightLabel: LIGHT_LABELS[r.light],
      note: TEXT.resultNote,
      tip: r.light === "yellow" ? TEXT.tipYellow : null,
      compare: r.light === "red"
        ? [
          { label: TEXT.labelRecognized, value: String(r.recognizedText || "") },
          { label: TEXT.labelTarget, value: String(r.targetText || "") }
        ]
        : null
    };
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
    LIGHT_LABELS: LIGHT_LABELS,
    messageForError: messageForError,
    messageForAcquire: messageForAcquire,
    meterBarsOf: meterBarsOf,
    buildResult: buildResult,
    resultModel: resultModel,
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
  var gen = 0;            // 每次 reset／換卡遞增；非同步回呼（對話框、朗讀）據此判斷是否仍有效
  var unsubscribe = null;
  var shownResult = null; // 分數區目前顯示的 SttResult（參照比對，避免重複重建）
  var acquiringGen = -1;  // 取得麥克風中時記錄當時的 gen；等於目前 gen 即為「取得中」（區域旗標，不進 store）
  var meterActive = false; // 音量分析是否進行中（聆聽中才為 true）
  var shownLevel = 0;     // 收音條目前亮格數（只供重建 DOM 時還原顯示；不寫入任何狀態）
  var trackEndedBound = false; // 是否已向 mic 登錄音軌結束回呼

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

  /** 安全呼叫 store action */
  function act(name, arg) {
    var a = actions();
    if (typeof a[name] !== "function") return undefined;
    try {
      return a[name](arg);
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

  /** 是否正在取得麥克風（同一個 gen 內） */
  function isAcquiring() {
    return acquiringGen === gen;
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

  /** 音軌結束（拔除、被停用）：聆聽中 → 中止辨識並提示；未聆聽 → 不提示（AC-33-06） */
  function onTrackEnded() {
    try {
      var sp = speechOf(getState());
      if (sp.sttStatus !== "listening") {
        stopMeterNow();
        return;
      }
      gen++; // 讓本次聆聽晚到的回呼失效
      var stt = services().stt;
      try { if (stt && typeof stt.abort === "function") stt.abort(); } catch (e) { /* 忽略 */ }
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
    var children = [
      el("p", { className: "sp-result__title", text: m.title }),
      el("p", { className: "sp-result__score" }, [
        el("span", { className: "sp-result__badge", text: m.scoreText }),
        el("span", { className: "sp-result__light", text: m.lightLabel })
      ])
    ];
    if (m.tip) children.push(el("p", { className: "sp-result__tip", text: m.tip }));
    if (m.compare) {
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

  // ── 麥克風按鈕 ──

  function renderMic(sp) {
    if (!ui) return;
    var listening = sp.sttStatus === "listening";
    // 狀態已離開聆聽（含由其他途徑改變）→ 收音條不得停在亮格
    if (!listening && meterActive) stopMeterNow();
    var btn = ui.micBtn;
    btn.classList.toggle("is-listening", listening);
    btn.setAttribute("aria-pressed", listening ? "true" : "false");
    btn.setAttribute("data-status", sp.sttStatus || "idle");
    dom().setText(ui.micText, listening ? TEXT.micListening : TEXT.mic);
    btn.setAttribute("aria-label", listening ? TEXT.micListeningLabel : TEXT.micIdleLabel);
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

  function setStatus(s) {
    // 聆聽以任何方式結束（結果、逾時、無結果、錯誤、再按、start 失敗）都經過這裡：
    // 先在同一個工作中停止音量分析並歸暗（AC-33-03）
    if (s !== "listening") stopMeterNow();
    act("setSttStatus", s);
  }

  /**
   * 清除前次評分（RuntimeState.speech.lastResult）與分數區。
   * 每次按麥克風開始新的嘗試時呼叫；未進入聆聽就結束的分支（離線、無法開始、例外）
   * 也必須清除，否則提示訊息會與前次分數同時出現（AC-08-14「不顯示分數」，BUG-001）。
   */
  function clearResult() {
    act("setSttResult", null);
    // store 未通知（或缺少 action）時仍確保分數區隱藏
    renderResult(null);
  }

  /** 結束聆聽並顯示提示 */
  function endWith(m) {
    setStatus("idle");
    if (m) setMessage(m);
  }

  /** 實際開始聆聽 */
  function startListening(myGen) {
    var stt = services().stt;
    setMessage(null);
    clearResult();
    if (!stt || typeof stt.start !== "function") {
      endWith({ text: TEXT.sttUnsupported, help: "", kind: "error" });
      return;
    }
    // 先停止朗讀，避免麥克風收到示範語音
    var tts = services().tts;
    if (tts && typeof tts.stop === "function") tts.stop();

    setStatus("listening");

    var tgt = target;
    var r = stt.start({
      lang: "en-US",
      onResult: function (text) {
        if (myGen !== gen) return;
        var res = buildResult(text, tgt, similarity());
        setStatus("idle");
        if (!res) {
          setMessage({ text: TEXT.noSpeech, help: "", kind: "info" });
          return;
        }
        setMessage(null);
        act("setSttResult", res);
        act("recordSttScored");
      },
      onError: function (code) {
        if (myGen !== gen) return;
        endWith(messageForError(code));
      },
      onEnd: function (info) {
        if (myGen !== gen) return;
        var i = info || {};
        if (!i.manual && !i.hadResult && !i.hadError) {
          endWith({ text: TEXT.noSpeech, help: "", kind: "info" });
        } else {
          setStatus("idle");
        }
      }
    });

    if (!r || r.ok !== true) {
      var reason = r && r.reason;
      if (reason === "offline") endWith({ text: TEXT.offline, help: "", kind: "error" });
      else if (reason === "unsupported") {
        endWith(null);
        toast(TEXT.sttUnsupported, "error");
      } else endWith({ text: TEXT.generic, help: "", kind: "error" });
      return;
    }
    // 已進入聆聽：開始依音量點亮收音條（無 analyser 時 mic 會立即回報 0，收音條維持全暗）
    if (myGen === gen && speechOf(getState()).sttStatus === "listening") startMeter(myGen);
  }

  /**
   * 取得（或重用）麥克風後才開始辨識（§7.14 決定表；順序：acquire 結束後才 stt.start）。
   * @param {number} myGen 按下時的 gen
   */
  function acquireThenListen(myGen) {
    var m = micService();
    if (!m || typeof m.acquire !== "function") {
      // 沒有麥克風服務：視同 unavailable，照常辨識（AC-33-07）
      startListening(myGen);
      return;
    }
    acquiringGen = myGen;
    var p;
    try {
      p = m.acquire();
    } catch (e) {
      p = null;
    }
    Promise.resolve(p).then(function (r) {
      onAcquired(r, myGen);
    }, function () {
      // acquire 永不 reject；保險起見視同 unavailable
      onAcquired({ ok: false, reason: "unavailable" }, myGen);
    });
  }

  /** 取得麥克風結束 */
  function onAcquired(r, myGen) {
    if (acquiringGen === myGen) acquiringGen = -1;
    // 期間已換卡、切換模式或離開頁面：不開始辨識（音軌由 mic 保留供同頁重用，或已被 release）
    if (myGen !== gen || !attached()) return;
    try {
      if (r && r.ok === true) {
        startListening(myGen);
        return;
      }
      var reason = r && r.reason;
      if (reason === "released") return;          // 取得中已釋放：不顯示任何訊息
      var m = messageForAcquire(reason);
      if (m) {
        // permission／notfound：不辨識、不顯示分數、收音條全暗（AC-08-09、AC-33-05）
        clearResult();
        endWith(m);
        return;
      }
      startListening(myGen);                       // unavailable：照常辨識（AC-33-07）
    } catch (e) {
      if (typeof console !== "undefined") console.error("[EMT.components.speechPanel] 開始聆聽失敗", e);
      try { clearResult(); } catch (e2) { /* 忽略 */ }
      endWith({ text: TEXT.generic, help: "", kind: "error" });
    }
  }

  /** 說明對話框結束但不聆聽：notice → idle */
  function leaveNotice() {
    if (speechOf(getState()).sttStatus === "notice") setStatus("idle");
  }

  /** 首次說明（AC-08-13、V-ST-08） */
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
          // 按「我知道了」後才取得麥克風（AC-08-13）；取得期間按鈕回待機，再按由 acquiring 旗標忽略
          leaveNotice();
          acquireThenListen(myGen);
          return;
        }
      }
      // 取消（或期間已換卡、離開頁面）：不聆聽、回待機；下次仍會顯示說明
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
        // 再次按下：停止並回待機，不提示（AC-08-10）
        stt.stop();
        setStatus("idle");
        return;
      }
      if (isAcquiring()) return;                             // 取得麥克風中：忽略
      setMessage(null);
      if (typeof stt.isOnline === "function" && !stt.isOnline()) {
        // 離線不會進入 startListening，需在此清除前次分數（AC-08-14「不顯示分數」，BUG-001）
        clearResult();
        endWith({ text: TEXT.offline, help: "", kind: "error" }); // AC-08-14
        return;
      }
      var myGen = gen;
      var acknowledged = !!(st && st.data && st.data.sttNoticeAcknowledged === true);
      if (!acknowledged) {
        showNotice(myGen);
        return;
      }
      acquireThenListen(myGen);
    } catch (e) {
      if (typeof console !== "undefined") console.error("[EMT.components.speechPanel] 麥克風操作失敗", e);
      try { clearResult(); } catch (e2) { /* 忽略 */ }
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
      // 聆聽中改按朗讀：先中止聆聽，避免把示範語音當成使用者發音
      if (sp.sttStatus === "listening") {
        var stt = services().stt;
        if (stt && typeof stt.abort === "function") stt.abort();
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

  /** 停止所有語音活動（不改動畫面參照） */
  function stopAll() {
    gen++;
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
        // 麥克風在新容器上一定是待機；殘留的 notice 狀態由對話框結束時處理
        sync(st);
      } catch (e) {
        if (typeof console !== "undefined") console.error("[EMT.components.speechPanel] render 失敗", e);
      }
    },

    /**
     * 停止朗讀與聆聽（AC-07-03、AC-08-10）；同時停止音量分析、收音條歸暗。
     * 不釋放麥克風音軌（同頁重用，Q-36、AC-33-01）。
     */
    reset: function () {
      try {
        stopAll();
        stopMeterNow();
        cardKey = null;
        message = null;
        renderMessage();
        var sp = speechOf(getState());
        if (sp.sttStatus === "listening") setStatus("idle");
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
