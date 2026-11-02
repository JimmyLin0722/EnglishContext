/*
 * state/store.js — 應用程式狀態 store 與 localStorage 轉接（FE-07）
 * 依據：architecture.md §4.3（Store API）、§7.5（持久化與匯入）；
 *       契約 data-schema.ts AppState／RuntimeState／PersistedData／StorageRecord／StorageStatus／STORAGE_KEYS；
 *       README §5.1～§5.3、§6.2（步驟 6、8、9 與 IM-1～IM-5）、§7.7 V-ST-01～08、V-IMP-01。
 * 涵蓋：AC-01-02～AC-01-07、AC-02-08、AC-03-05、AC-04-05、AC-04-07、AC-04-08、AC-06-05、AC-08-13、
 *       AC-09-04、AC-11-03～AC-11-07、AC-17-02、AC-17-03、AC-18-01～AC-18-06、AC-24-03、AC-24-04、AC-24-09
 *
 * 規則：
 * - 全專案只有本檔讀寫 localStorage；每次 PersistedData 變更以「一次」setItem 寫入整筆 StorageRecord。
 * - 啟動（§5.3）：存取拋例外 → storageStatus "unavailable"，本次工作階段不再寫入；
 *   鍵不存在 → 預設值；無法讀取 → 原字串盡力寫入 STORAGE_KEYS.unreadable 後以預設值啟動。
 * - 容量不足：新增自訂單字、範本注入 → 記憶體回滾、回 reason "quota"；匯入 → 回 error "quota"、記憶體不變
 *   （匯入遇容量不足以外的寫入例外 → error "write_failed"，契約 IM-6）；
 *   其他寫入 → 保留記憶體狀態，writeStatus 設為 "quota" 並以 tags ["storage"] 通知（banner 顯示提示），下次寫入再試。
 * - （v0.8，FE-25）學習事件（flipCard／answerVocabQuiz／recordSttScored）以 core/learning.record 更新
 *   todayLearned、learnedHistory，與打卡、統計、已掌握合併為一次 setItem，tags 加 "learning"（§7.7、LR-1～LR-5）；
 *   學習紀錄寫入遇容量不足 → 記憶體保留、不發 "storage"，本工作階段第一次發 "learningQuota"（LR-7）。
 *   init 以 store.today() 正規化學習紀錄；v1 遷移後驗證並寫回 schemaVersion 2（MG-3）。
 * - （v0.8，FE-30）首次進入流程（§5.5 FS-1～FS-7、architecture §7.9）：init 判定 runtime.entryMode
 *   （getItem 拋例外 → firstRun + unavailable；null → firstRun；任何字串 → main）；firstRun 期間寫入守門
 *   （writeData 回 reason "firstRun"，不呼叫 setItem、不改 writeStatus、不發 storage tag，V-ST-13）；
 *   只有 startLearning 與 importBackup 步驟 8 可寫第一筆，進入後 entryMode = "main"、tag "entry"。
 * - 寫出主鍵前以 today 正規化 todayLearned、learnedHistory（LR-6「換日正規化延到下一次寫入」），
 *   避免跨午夜後的非學習寫入把前一天的 todayLearned.date 寫出（只影響寫出內容，不改記憶體）。
 * - 狀態以「換新物件」方式更新（不就地修改），getState() 回傳的物件呼叫端不可修改。
 * - 不使用任何網路 API（AC-18-06）。
 *
 * - （v0.9，FE-37）切換難易度初始化（契約 §5.7 CI-1～CI-10、architecture §7.15）：一般模式「套用」改經 requestApplyGoal
 *   （生效色級改變且有學習紀錄 → 回 "confirm"、不改任何狀態）；confirmApplyGoal 以 reinit.buildReinitData 建新物件、
 *   一次 setItem，成功（或 storage 停用）才替換記憶體；失敗（quota／error）只還原記憶體 draftScore。
 *   cancelApplyGoal 只還原記憶體 draftScore、不寫入（CI-9）。setTab 忽略 HIDDEN_TAB_IDS（HT-1）。
 *
 * 寫法：工廠函式 createStore({ storage, content, now, rand, speechSupport })，Node 下以 require 取得並注入假資料測試；
 * 瀏覽器下以 window.localStorage 與 EMT.content 建立單例 EMT.store（載入時只建立，不讀 storage；main.js 呼叫 init()）。
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.EMT = root.EMT || {};
    root.EMT.store = api.createStore({
      storage: api.browserStorage(root),
      content: function () { return root.EMT && root.EMT.content; },
      speechSupport: api.detectSpeech(root)
    });
  }
})(typeof self !== "undefined" ? self : this, function (root) {
  "use strict";

  // ── 取得 core 模組：Node 下 require，瀏覽器下讀 EMT.core.*（呼叫時才取用）──
  var coreCache = null;
  function core() {
    if (coreCache) { return coreCache; }
    if (typeof require === "function" && typeof module === "object") {
      coreCache = {
        C: require("../core/constants.js"),
        WK: require("../core/wordkey.js"),
        GOAL: require("../core/goal.js"),
        VOCAB: require("../core/vocab.js"),
        CUSTOM: require("../core/custom.js"),
        STREAK: require("../core/streak.js"),
        QUIZ: require("../core/quiz.js"),
        P: require("../core/persist.js"),
        BACKUP: require("../core/backup.js"),
        LEARN: require("../core/learning.js"),
        REINIT: require("../core/reinit.js")
      };
    } else {
      var c = root.EMT.core;
      coreCache = {
        C: c.constants, WK: c.wordkey, GOAL: c.goal, VOCAB: c.vocab, CUSTOM: c.custom,
        STREAK: c.streak, QUIZ: c.quiz, P: c.persist, BACKUP: c.backup, LEARN: c.learning,
        REINIT: c.reinit
      };
    }
    return coreCache;
  }

  // 契約列舉（data-schema.ts §7、§10）
  var TAB_IDS = ["dashboard", "customizer", "flashcards", "part5", "decoder", "phrasebank", "sources"];
  /** （v0.8）首次模式可停留的頁面（architecture §4.3 setTab、§7.9） */
  var FIRST_RUN_TABS = ["customizer", "sources"];
  var STT_STATUSES = ["idle", "notice", "listening"];
  var PHRASE_CATEGORIES = ["all", "gap", "aim", "findings", "limitations"];

  /** 一次通知全部區塊時使用的 tags */
  var ALL_TAGS = ["init", "goal", "studySet", "flashcard", "quiz", "speech", "stats", "streak",
    "customVocab", "part5", "decoder", "phrasebank", "tab", "storage", "learning"];

  // ── 共用小工具（純函式）──

  function hasOwn(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

  /** 淺複製物件並套用變更 */
  function assign(base, patch) {
    var out = {};
    var k;
    for (k in base) { if (hasOwn(base, k)) { out[k] = base[k]; } }
    for (k in patch) { if (hasOwn(patch, k)) { out[k] = patch[k]; } }
    return out;
  }

  /** 是否為 0～3 的選項索引 */
  function isOptionIndex(i) {
    return i === 0 || i === 1 || i === 2 || i === 3;
  }

  /**
   * 判斷 setItem 例外是否為容量不足（architecture.md §7.5）。
   * @param {*} e
   * @returns {boolean}
   */
  function isQuotaError(e) {
    if (!e) { return false; }
    return e.name === "QuotaExceededError" || e.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      e.code === 22 || e.code === 1014;
  }

  /**
   * 瀏覽器 localStorage 轉接：每次呼叫時才取用 window.localStorage，
   * 讓「取用本身就拋例外」（停用、無痕模式）也能被 store 捕捉。
   * @param {object} g 全域物件
   */
  function browserStorage(g) {
    return {
      getItem: function (k) { return g.localStorage.getItem(k); },
      setItem: function (k, v) { g.localStorage.setItem(k, v); }
    };
  }

  /** 偵測語音 API（AC-07-04、AC-08-02）；只做存在判斷，不建立任何實例 */
  function detectSpeech(g) {
    var tts = false;
    var stt = false;
    try {
      tts = !!(g && g.speechSynthesis && typeof g.SpeechSynthesisUtterance === "function");
      stt = !!(g && (g.SpeechRecognition || g.webkitSpeechRecognition));
    } catch (e) {
      // 偵測失敗視為不支援
    }
    return { ttsSupported: tts, sttSupported: stt };
  }

  /** 讀取內容資料（EMT.content 或假資料），缺漏一律以空集合處理（C-6） */
  function readContent(src) {
    var c = null;
    try {
      c = typeof src === "function" ? src() : src;
    } catch (e) {
      c = null;
    }
    c = c && typeof c === "object" ? c : {};
    function arr(name) {
      try { return Array.isArray(c[name]) ? c[name] : []; } catch (e) { return []; }
    }
    var map = null;
    try { map = c.builtinMap && typeof c.builtinMap.has === "function" ? c.builtinMap : null; } catch (e) { map = null; }
    var nB = 0;
    var nG = 0;
    var manifest = null;
    try {
      nB = typeof c.nB === "number" && isFinite(c.nB) ? c.nB : 0;
      nG = typeof c.nG === "number" && isFinite(c.nG) ? c.nG : 0;
      manifest = c.manifest && typeof c.manifest === "object" ? c.manifest : null;
    } catch (e) {
      // 保持預設
    }
    return {
      builtin: arr("builtin"),
      builtinMap: map || new Map(),
      nB: nB,
      nG: nG,
      part5: arr("part5"),
      templates: arr("templates"),
      decoderSentences: arr("decoderSentences"),
      manifest: manifest
    };
  }

  /** 是否為已知範本代碼的範本 */
  function findTemplate(templates, templateId) {
    for (var i = 0; i < templates.length; i++) {
      if (templates[i] && templates[i].id === templateId) { return templates[i]; }
    }
    return null;
  }

  /** 在單字集中找 wordKey 的位置；找不到回 -1 */
  function indexOfKey(studySet, key) {
    for (var i = 0; i < studySet.length; i++) {
      if (studySet[i].wordKey === key) { return i; }
    }
    return -1;
  }

  /** 把索引夾在單字集範圍內；空集合 → 0 */
  function clampIndex(i, len) {
    if (len <= 0) { return 0; }
    if (i < 0) { return 0; }
    if (i > len - 1) { return len - 1; }
    return i;
  }

  /**
   * 建立 store。
   * @param {{
   *   storage?: {getItem: function(string): (string|null), setItem: function(string, string): void}|null,
   *   content?: object|function(): object,
   *   now?: function(): Date,
   *   rand?: function(): number,
   *   speechSupport?: {ttsSupported: boolean, sttSupported: boolean}
   * }} [options]
   *   storage：localStorage 相容物件（測試注入假物件；null／缺漏 → 視為停用）
   *   content：EMT.content 相容物件或回傳它的函式（builtin、builtinMap、nB、nG、part5、templates、decoderSentences、manifest）
   *   now：目前時間（預設 new Date()）；rand：[0, 1) 亂數（預設 Math.random）
   * @returns {object} store：{ init, getState, subscribe, getStartup, getWriteStatus, today, actions }
   */
  function createStore(options) {
    var opts = options || {};
    var storage = opts.storage;
    var contentSrc = opts.content;
    var nowFn = typeof opts.now === "function" ? opts.now : function () { return new Date(); };
    var rand = typeof opts.rand === "function" ? opts.rand : Math.random;
    var speech = opts.speechSupport && typeof opts.speechSupport === "object" ? opts.speechSupport : { ttsSupported: false, sttSupported: false };

    var state = null;
    var initialized = false;
    var listeners = [];
    /** 啟動結果："ok"｜"missing"｜"unreadable"｜"unavailable"；migrated = 是否經過遷移並寫回 */
    var startup = { status: "missing", migrated: false };
    /** 最近一次「一般寫入」的結果："ok"｜"quota"｜"error"｜"disabled" */
    var writeStatus = "ok";

    function now() {
      var d = nowFn();
      return d instanceof Date && !isNaN(d.getTime()) ? d : new Date();
    }

    function today() {
      return core().STREAK.localDate(now());
    }

    function content() {
      return readContent(contentSrc);
    }

    // ── localStorage 轉接（只有這兩個函式碰 storage）──

    /**
     * 以一次 setItem 寫入整筆 StorageRecord（§5.3、AC-18-01）。
     * （v0.8）首次模式（entryMode = "firstRun"）時不呼叫 setItem、回 reason "firstRun"（FS-2、V-ST-13）；
     * 只有 startLearning 與匯入步驟 8 以 bypassFirstRun = true 繞過守門。
     * 寫出前以 today 正規化學習紀錄（LR-6、V-ST-09～V-ST-11），只影響寫出的內容，不改記憶體。
     * @param {object} data PersistedData
     * @param {boolean} [bypassFirstRun]
     * @returns {{ok: true} | {ok: false, reason: "disabled"|"quota"|"error"|"firstRun"}}
     */
    function writeData(data, bypassFirstRun) {
      if (state && state.runtime.storageStatus === "unavailable") {
        return { ok: false, reason: "disabled" };
      }
      if (!bypassFirstRun && state && state.runtime.entryMode === "firstRun") {
        return { ok: false, reason: "firstRun" };
      }
      var K = core();
      try {
        var lr = K.LEARN.normalizeLearning(data, today());
        var out = assign(data, { todayLearned: lr.todayLearned, learnedHistory: lr.learnedHistory });
        var text = JSON.stringify(K.P.buildRecord(out, now()));
        storage.setItem(K.C.STORAGE_KEYS.state, text);
        return { ok: true };
      } catch (e) {
        return { ok: false, reason: isQuotaError(e) ? "quota" : "error" };
      }
    }

    /** 盡力寫入（失敗忽略），只用於 unreadable 鍵與重設 */
    function tryWrite(key, value) {
      try {
        storage.setItem(key, value);
        return true;
      } catch (e) {
        return false;
      }
    }

    // ── 執行期狀態推導 ──

    /** 依 PersistedData 建單字集（V-ST-04） */
    function buildStudySet(data) {
      var K = core();
      var ct = content();
      var limit = K.VOCAB.limitOf(data.goal.effectiveColor, ct.nB, ct.nG);
      return K.VOCAB.buildStudySet(ct.builtin, limit, data.customVocab, ct.builtinMap);
    }

    /** 初始執行期狀態；（v0.8）firstRun 時 currentTab = "customizer"（FS-1、architecture §4.3 init） */
    function initialRuntime(data, storageStatus, entryMode) {
      return {
        currentTab: entryMode === "firstRun" ? "customizer" : "dashboard",
        studySet: buildStudySet(data),
        flashcard: { index: 0, isFlipped: false, mode: "card", quiz: null },
        speech: {
          ttsSupported: !!speech.ttsSupported,
          sttSupported: !!speech.sttSupported,
          sttStatus: "idle",
          lastResult: null
        },
        decoder: { sentenceIndex: 0, isModifierDimmed: false },
        phrasebank: { category: "all", keyword: "" },
        storageStatus: storageStatus,
        // （v0.8）本工作階段是否已提示過學習紀錄容量不足（LR-7）
        learningQuotaNoticeShown: false,
        // （v0.8）首次進入判定結果（FS-1）；本工作階段只會 firstRun → main
        entryMode: entryMode === "firstRun" ? "firstRun" : "main"
      };
    }

    /**
     * 換卡後的抽認卡狀態：正面、清除 STT 結果；測驗模式則為新卡重新出題（不足 → 回抽認卡模式，AC-09-06）。
     * @returns {{flashcard: object, speech: object}}
     */
    function cardChanged(runtime, studySet, index) {
      var fc = { index: index, isFlipped: false, mode: runtime.flashcard.mode, quiz: null };
      if (fc.mode === "quiz") {
        fc.quiz = core().QUIZ.buildQuiz(studySet, index, rand);
        if (!fc.quiz) { fc.mode = "card"; }
      }
      return { flashcard: fc, speech: assign(runtime.speech, { lastResult: null }) };
    }

    /**
     * 單字集重建後，盡量停在原本那張卡（以 wordKey 定位；找不到則夾回範圍）。
     * 卡片沒變 → 保留翻面與題目；卡片變了 → 依 cardChanged 重設。
     */
    function keepCurrentCard(runtime, newSet) {
      var oldSet = runtime.studySet;
      var oldCard = oldSet[runtime.flashcard.index];
      var idx = oldCard ? indexOfKey(newSet, oldCard.wordKey) : -1;
      if (idx !== -1) {
        return assign(runtime, { studySet: newSet, flashcard: assign(runtime.flashcard, { index: idx }) });
      }
      var changed = cardChanged(runtime, newSet, clampIndex(runtime.flashcard.index, newSet.length));
      return assign(runtime, { studySet: newSet, flashcard: changed.flashcard, speech: changed.speech });
    }

    // ── 訂閱與提交 ──

    function notify(tags) {
      var list = listeners.slice();
      for (var i = 0; i < list.length; i++) {
        try {
          list[i](state, tags);
        } catch (e) {
          if (typeof console !== "undefined" && typeof console.error === "function") {
            console.error("[EMT.store] 訂閱者執行失敗", e);
          }
        }
      }
    }

    /**
     * 一般寫入失敗時更新 writeStatus；狀態改變時加上 "storage" tag。
     * （v0.8）首次模式守門（reason "firstRun"）不是寫入失敗：不改 writeStatus、不發 storage tag（FS-2）。
     */
    function noteWrite(result, tags) {
      if (!result.ok && result.reason === "firstRun") { return; }
      var next = result.ok ? "ok" : result.reason;
      if (next !== writeStatus) {
        writeStatus = next;
        tags.push("storage");
      }
    }

    /**
     * 提交新狀態。dataChanged = true 時先寫入（一次 setItem）；容量不足等失敗仍保留記憶體狀態（§5.3「其他寫入」）。
     * @param {object} data
     * @param {object} runtime
     * @param {string[]} tags
     * @param {boolean} dataChanged
     */
    function commit(data, runtime, tags, dataChanged) {
      if (dataChanged) {
        noteWrite(writeData(data), tags);
      }
      state = { data: data, runtime: runtime };
      notify(tags);
    }

    /**
     * （v0.8）提交含學習紀錄變更的新狀態（LR-3 (6)、LR-5、LR-7；architecture §7.7「LR-7 實作」）。
     * 一次 setItem；學習紀錄實際改變且寫入失敗（quota／error）時：記憶體保留、writeStatus 更新但不發 "storage" tag；
     * quota 且本工作階段尚未提示 → learningQuotaNoticeShown 設 true 並發 "learningQuota" tag（banner 提示一次）。
     * 學習紀錄未改變、寫入成功或 storage 停用 → 沿用 commit（noteWrite）。
     * @param {object} data
     * @param {object} runtime
     * @param {string[]} tags
     * @param {boolean} dataChanged
     * @param {boolean} learningChanged
     */
    function commitLearning(data, runtime, tags, dataChanged, learningChanged) {
      if (!dataChanged || !learningChanged) {
        commit(data, runtime, tags, dataChanged);
        return;
      }
      var w = writeData(data);
      var rt = runtime;
      if (!w.ok && (w.reason === "quota" || w.reason === "error")) {
        writeStatus = w.reason;
        if (w.reason === "quota" && !rt.learningQuotaNoticeShown) {
          rt = assign(rt, { learningQuotaNoticeShown: true });
          tags.push("learningQuota");
        }
      } else {
        noteWrite(w, tags);
      }
      state = { data: data, runtime: rt };
      notify(tags);
    }

    /**
     * （v0.8）以 learning.record 記錄一次學習事件（LR-1～LR-3）。不修改傳入值。
     * 只有「新增 wordKey」或「todayLearned 換日」時回傳 patch，否則 patch 為 null。
     * @param {object} d 目前的 PersistedData
     * @param {string} key wordKey（record 內會再以 C-2 正規化）
     * @returns {{patch: (object|null), changed: boolean}}
     */
    function learnPatch(d, key) {
      var day = today();
      var r = core().LEARN.record(d.todayLearned, d.learnedHistory, key, day);
      var dayChanged = !d.todayLearned || d.todayLearned.date !== day;
      if (!r.changed && !dayChanged) { return { patch: null, changed: false }; }
      return { patch: { todayLearned: r.todayLearned, learnedHistory: r.learnedHistory }, changed: true };
    }

    /** 學習行為打卡（AC-17-02）；回傳新的 streak（未變時為原物件） */
    function touchStreak(streak) {
      var next = core().STREAK.touch(streak, today());
      if (next.days === streak.days && next.lastActiveDate === streak.lastActiveDate) { return streak; }
      return next;
    }

    // ── 啟動 ──

    /**
     * 依契約 §5.3 讀取 localStorage 並建立初始狀態（AC-18-02、AC-18-03、AC-18-05、AC-01-04、AC-11-05）。
     * 可重複呼叫（重新讀取）。
     * @returns {{status: "ok"|"missing"|"unreadable"|"unavailable", migrated: boolean}}
     */
    function init() {
      var K = core();
      var ct = content();
      var raw;
      var available = true;
      try {
        if (!storage || typeof storage.getItem !== "function" || typeof storage.setItem !== "function") {
          throw new Error("storage 不可用");
        }
        raw = storage.getItem(K.C.STORAGE_KEYS.state);
      } catch (e) {
        available = false;
      }

      var data;
      // （v0.8）首次判定（FS-1）：存取拋例外或鍵不存在 → firstRun；任何字串（含 ""、損壞、版本不符）→ main。
      // unreadable 鍵是否存在不影響判定
      var entryMode = "main";
      if (!available) {
        // 存取拋例外 → 停用，本次工作階段不再嘗試寫入（AC-18-03）；每次開啟都是首次畫面（AC-25-08）
        data = K.P.defaultData();
        startup = { status: "unavailable", migrated: false };
        entryMode = "firstRun";
      } else {
        var parsed = K.P.parseStored(raw);
        if (parsed.kind === "ok") {
          // （v0.8）以今天正規化 todayLearned、learnedHistory（V-ST-09～V-ST-11）；
          // RD-1 的 fieldsReset 不提示、不另寫回，等下一次寫入一併寫回（RD-2、SD-FB-17）
          data = K.P.normalizeAfterLoad(parsed.data, ct.part5.length, today());
          startup = { status: "ok", migrated: false };
          if (parsed.migrated) {
            // 遷移後依 §5.3 驗證再以一次 setItem 寫回（MG-3：schemaVersion 2，失敗不提示）
            var record = K.P.buildRecord(data, now());
            if (K.P.validateStorageRecord(record).ok) {
              tryWrite(K.C.STORAGE_KEYS.state, JSON.stringify(record));
              startup.migrated = true;
            } else {
              tryWrite(K.C.STORAGE_KEYS.unreadable, raw);
              data = K.P.defaultData();
              startup = { status: "unreadable", migrated: false };
            }
          }
        } else if (parsed.kind === "missing") {
          // 首次使用：預設值，不顯示錯誤、不寫入（AC-18-02、FS-2）
          data = parsed.data;
          startup = { status: "missing", migrated: false };
          entryMode = "firstRun";
        } else {
          // 無法讀取：原字串盡力保存到 unreadable 鍵；保存成功才以預設值覆蓋主鍵，
          // 保存失敗時保留原值供人工救回（AC-18-05）
          data = parsed.data;
          if (tryWrite(K.C.STORAGE_KEYS.unreadable, typeof raw === "string" ? raw : String(raw))) {
            tryWrite(K.C.STORAGE_KEYS.state, JSON.stringify(K.P.buildRecord(data, now())));
          }
          startup = { status: "unreadable", migrated: false };
        }
      }

      writeStatus = available ? "ok" : "disabled";
      state = { data: data, runtime: initialRuntime(data, available ? "ok" : "unavailable", entryMode) };
      initialized = true;
      notify(ALL_TAGS.slice());
      return { status: startup.status, migrated: startup.migrated };
    }

    /** 尚未 init 就呼叫 action 時先 init，避免以預設值覆蓋已儲存資料 */
    function ensureInit() {
      if (!initialized) { init(); }
    }

    // ── 公開 API ──

    function getState() {
      ensureInit();
      return state;
    }

    function subscribe(fn) {
      if (typeof fn !== "function") { return function () {}; }
      listeners.push(fn);
      return function unsubscribe() {
        var i = listeners.indexOf(fn);
        if (i !== -1) { listeners.splice(i, 1); }
      };
    }

    function getStartup() {
      return { status: startup.status, migrated: startup.migrated };
    }

    function getWriteStatus() {
      return writeStatus;
    }

    // ── actions：目標 ──

    /** 更新 goal 的 draftScore（未套用也保存，AC-02-08） */
    function setDraft(score) {
      var d = state.data;
      if (d.goal.draftScore === score) {
        return;
      }
      var data = assign(d, { goal: assign(d.goal, { draftScore: score }) });
      commit(data, state.runtime, ["goal"], true);
    }

    /**
     * 輸入分數（AC-02-02、AC-02-08、AC-02-09）。
     * @param {string|number} raw
     * @returns {{ok: true, score: number} | {ok: false, error: string}}
     */
    function setDraftScore(raw) {
      ensureInit();
      var r = core().GOAL.parseScoreInput(raw);
      if (!r.ok) { return { ok: false, error: r.message }; }
      setDraft(r.score);
      return { ok: true, score: r.score };
    }

    /**
     * 點色級按鈕（Q-32、AC-01-05、AC-01-07）。
     * @param {string} colorId
     * @returns {{score: number}}
     */
    function clickColor(colorId) {
      ensureInit();
      var score = core().GOAL.scoreAfterColorClick(state.data.goal.draftScore, colorId);
      setDraft(score);
      return { score: state.data.goal.draftScore };
    }

    /**
     * 套用（AC-01-02、AC-01-07、AC-03-05）：appliedScore = draftScore、重算色級、重建單字集，
     * 抽認卡回第 1 張正面；模式保持，測驗模式則重新出題。
     */
    function applyGoal() {
      ensureInit();
      var g = appliedGoalState();
      commit(g.data, g.runtime, ["goal", "studySet", "flashcard", "quiz", "speech"], g.changed);
    }

    /**
     * （v0.9）一般難易度設定頁「套用」的唯一入口（CI-1、AC-01-02、AC-01-07、AC-32-01、AC-32-05～AC-32-07）。
     * - 首次模式 → "ignored"（首次畫面用 startLearning）
     * - 生效色級改變且有學習紀錄（reinit.needsConfirm）→ "confirm"：不改任何狀態、不呼叫 setItem（CI-10）
     * - 其他 → 既有 applyGoal()（不清除任何資料）→ "applied"
     * @returns {{status: "applied"|"confirm"|"ignored"}}
     */
    function requestApplyGoal() {
      ensureInit();
      if (state.runtime.entryMode === "firstRun") { return { status: "ignored" }; }
      if (core().REINIT.needsConfirm(state.data, today())) { return { status: "confirm" }; }
      applyGoal();
      return { status: "applied" };
    }

    /**
     * 記憶體中把 draftScore 改回 appliedScore（CI-9；不寫入，以 commit(…, false) 通知 "goal"）。
     * @returns {boolean} 是否有變更
     */
    function revertDraft() {
      var d = state.data;
      if (d.goal.draftScore === d.goal.appliedScore) { return false; }
      var data = assign(d, { goal: assign(d.goal, { draftScore: d.goal.appliedScore }) });
      commit(data, state.runtime, ["goal"], false);
      return true;
    }

    /**
     * （v0.9）確認視窗「確定」：套用並初始化學習紀錄（CI-4～CI-8、DS-04、AC-32-02、AC-32-03、AC-32-09～AC-32-11）。
     * 1. 以 appliedGoalState() 算新 goal 與執行期，reinit.buildReinitData 建立新物件（現行 state.data 不被觸碰）
     * 2. storage 正常 → writeData 一次 setItem（不 removeItem、不碰 unreadable 鍵）
     * 3. quota／error → 不替換記憶體，只還原記憶體 draftScore（不寫入）；不改 writeStatus、不發 storage／learningQuota tag、
     *    不改 learningQuotaNoticeShown（CI-7）
     * 4. 成功或 storage 停用（不寫入，CI-6）→ 以新資料取代記憶體，執行期依 CI-8 重建
     * @returns {{ok: true, write: "ok"|"disabled"} | {ok: false, reason: "quota"|"error"|"firstRun"}}
     */
    function confirmApplyGoal() {
      ensureInit();
      if (state.runtime.entryMode === "firstRun") { return { ok: false, reason: "firstRun" }; }
      var K = core();
      var g = appliedGoalState();
      var newData = K.REINIT.buildReinitData(state.data, g.data.goal, K.P.defaultData());
      var w = writeData(newData);
      if (!w.ok && (w.reason === "quota" || w.reason === "error")) {
        revertDraft();
        return { ok: false, reason: w.reason };
      }
      var tags = ["goal", "studySet", "flashcard", "quiz", "speech", "stats", "streak", "part5", "learning"];
      noteWrite(w, tags);
      // CI-8：g.runtime 已依新 goal 重建 studySet、flashcard 回第 1 張正面（模式保持、測驗模式重新出題）、lastResult = null；
      // 單字集只由 goal 與 customVocab 推導，兩者在 g.data 與 newData 相同
      state = { data: newData, runtime: g.runtime };
      notify(tags);
      return { ok: true, write: w.ok ? "ok" : "disabled" };
    }

    /**
     * （v0.9）確認視窗「取消」／Esc／點視窗外（CI-9、AC-32-04）：只在記憶體把 draftScore 改回 appliedScore，
     * setItem 0 次（契約 FB-35）；單字卡位置與其他欄位不變。
     */
    function cancelApplyGoal() {
      ensureInit();
      revertDraft();
    }

    /**
     * 「套用」的狀態計算（applyGoal 與 startLearning 共用，不提交）：
     * appliedScore = draftScore、依 V-ST-02 重算色級、重建單字集、抽認卡回第 1 張正面（模式保持，測驗模式重新出題）。
     * @returns {{data: object, runtime: object, changed: boolean}}
     */
    function appliedGoalState() {
      var K = core();
      var d = state.data;
      var score = d.goal.draftScore;
      var color = K.GOAL.colorOf(score);
      var goal = { draftScore: score, appliedScore: score, appliedColor: color, effectiveColor: K.GOAL.effectiveColorOf(color) };
      var changed = goal.appliedScore !== d.goal.appliedScore || goal.appliedColor !== d.goal.appliedColor ||
        goal.effectiveColor !== d.goal.effectiveColor;
      var data = changed ? assign(d, { goal: goal }) : d;
      var set = buildStudySet(data);
      var rt = state.runtime;
      var cc = cardChanged(rt, set, 0);
      return { data: data, runtime: assign(rt, { studySet: set, flashcard: cc.flashcard, speech: cc.speech }), changed: changed };
    }

    /**
     * （v0.8）首次畫面「開始學習」（FS-4、AC-25-02、AC-25-03、AC-18-02）。只在 firstRun 有效，一般模式回 { ok: false }、不做事。
     * 等同 applyGoal ＋ 一次 setItem（繞過首次守門，不論分數是否改變都寫入第一筆）；
     * 寫入結果不影響進入：entryMode = "main"、currentTab = "dashboard"。
     * quota／error 走 noteWrite（banner 提示；主鍵仍不存在，下次開啟仍是首次畫面，契約 FB-31 (a)）；
     * storage 停用 → 不寫入、直接進入（write "disabled"，AC-25-08）。
     * @returns {{ok: true, write: "ok"|"quota"|"error"|"disabled"} | {ok: false}}
     */
    function startLearning() {
      ensureInit();
      if (state.runtime.entryMode !== "firstRun") { return { ok: false }; }
      var g = appliedGoalState();
      var tags = ["entry", "goal", "studySet", "flashcard", "quiz", "speech"];
      var w = writeData(g.data, true);
      noteWrite(w, tags);
      state = { data: g.data, runtime: assign(g.runtime, { entryMode: "main", currentTab: "dashboard" }) };
      notify(tags);
      return { ok: true, write: w.ok ? "ok" : w.reason };
    }

    // ── actions：自訂單字 ──

    /**
     * 新增自訂單字（AC-04-02～AC-04-06、AC-18-04）。容量不足 → 記憶體回滾、原 storage 值不變。
     * @param {object} fields { word, meaning, phonetic?, pos?, collocation?, example? }
     * @returns {{ok: true, item: object} | {ok: false, fieldErrors?: object, reason?: "duplicate"|"quota"}}
     */
    function addCustomWord(fields) {
      ensureInit();
      var K = core();
      var ct = content();
      var v = K.CUSTOM.validateCustomFields(fields);
      if (!v.ok) { return { ok: false, fieldErrors: v.fieldErrors }; }
      var d = state.data;
      if (K.CUSTOM.isDuplicate(v.values.word, ct.builtinMap, d.customVocab)) {
        return { ok: false, reason: "duplicate" };
      }
      var taken = d.customVocab.map(function (it) { return it.id; });
      var item = K.CUSTOM.makeCustomItem(v.values, "manual", null, now(), rand, taken);
      var data = assign(d, { customVocab: d.customVocab.concat([item]) });

      // 先寫入；容量不足 → 丟棄新狀態（回滾），不通知 banner（由 view 顯示「儲存空間不足」）
      var w = writeData(data);
      if (!w.ok && w.reason === "quota") {
        return { ok: false, reason: "quota" };
      }
      var tags = ["customVocab", "studySet", "flashcard"];
      noteWrite(w, tags);
      state = { data: data, runtime: keepCurrentCard(state.runtime, buildStudySet(data)) };
      notify(tags);
      return { ok: true, item: item };
    }

    /**
     * 刪除自訂單字（AC-04-07、AC-04-08、V-ST-06）。
     * 同步移除已掌握 wordKey；但該 wordKey 仍存在於內建字庫（全部排名）時不移除（DF-01）。
     * @param {string} id
     * @returns {{ok: boolean}}
     */
    function deleteCustomWord(id) {
      ensureInit();
      var K = core();
      var ct = content();
      var d = state.data;
      var target = null;
      for (var i = 0; i < d.customVocab.length; i++) {
        if (d.customVocab[i].id === id) { target = d.customVocab[i]; break; }
      }
      if (!target) { return { ok: false }; }
      var key = K.WK.wordKey(target.word);
      var mastered = d.masteredWordKeys;
      if (!ct.builtinMap.has(key) && mastered.indexOf(key) !== -1) {
        mastered = mastered.filter(function (k) { return k !== key; });
      }
      var data = assign(d, {
        customVocab: d.customVocab.filter(function (it) { return it.id !== id; }),
        masteredWordKeys: mastered
      });

      var rt = state.runtime;
      var oldSet = rt.studySet;
      var oldCard = oldSet[rt.flashcard.index];
      var newSet = buildStudySet(data);
      var idx = K.CUSTOM.indexAfterDelete(oldSet, rt.flashcard.index, key);
      idx = clampIndex(idx, newSet.length);
      var runtime;
      if (oldCard && newSet[idx] && newSet[idx].wordKey === oldCard.wordKey) {
        // 仍是同一張卡：保留翻面與題目
        runtime = assign(rt, { studySet: newSet, flashcard: assign(rt.flashcard, { index: idx }) });
      } else {
        var cc = cardChanged(rt, newSet, idx);
        runtime = assign(rt, { studySet: newSet, flashcard: cc.flashcard, speech: cc.speech });
      }
      commit(data, runtime, ["customVocab", "studySet", "flashcard", "quiz", "stats"], true);
      return { ok: true };
    }

    /**
     * 注入領域範本（AC-05-02、AC-05-04、AC-18-04）：只加入 wordKey 尚不存在者。
     * 容量不足 → 比照 addCustomWord 記憶體回滾、不設 writeStatus、不發 storage tag（architecture §4.3、§7.5）；
     * localStorage 停用（disabled）→ 保留記憶體、照常回報注入數（AC-18-03）。
     * @param {string} templateId
     * @returns {{injected: number, skipped: number, reason?: "quota"}}
     */
    function injectTemplate(templateId) {
      ensureInit();
      var K = core();
      var ct = content();
      var tpl = findTemplate(ct.templates, templateId);
      if (!tpl) { return { injected: 0, skipped: 0 }; }
      var d = state.data;
      var r = K.CUSTOM.buildTemplateItems(tpl, ct.builtinMap, d.customVocab, now(), rand);
      if (r.items.length === 0) { return { injected: 0, skipped: r.skippedCount }; }
      var data = assign(d, { customVocab: d.customVocab.concat(r.items) });

      // 先寫入；容量不足 → 丟棄新狀態（回滾），由 view 顯示「儲存空間不足」
      var w = writeData(data);
      if (!w.ok && w.reason === "quota") {
        return { injected: 0, skipped: r.skippedCount, reason: "quota" };
      }
      var tags = ["customVocab", "studySet", "flashcard"];
      noteWrite(w, tags);
      state = { data: data, runtime: keepCurrentCard(state.runtime, buildStudySet(data)) };
      notify(tags);
      return { injected: r.items.length, skipped: r.skippedCount };
    }

    // ── actions：抽認卡 ──

    /**
     * 換卡（AC-06-04、AC-06-05）：超出範圍或同一張 → 不變。
     * @param {number} index
     */
    function gotoCard(index) {
      ensureInit();
      var rt = state.runtime;
      if (typeof index !== "number" || index !== Math.floor(index) || index < 0 || index >= rt.studySet.length) { return; }
      if (index === rt.flashcard.index) { return; }
      var cc = cardChanged(rt, rt.studySet, index);
      commit(state.data, assign(rt, { flashcard: cc.flashcard, speech: cc.speech }), ["flashcard", "quiz", "speech"], false);
    }

    /**
     * 翻卡；翻到背面算學習行為並打卡（AC-17-02）。
     * （v0.8）翻到背面時另記錄學習事件 "flip"（LR-1；翻回正面不記錄），與打卡合併為一次寫入（LR-5）。
     */
    function flipCard() {
      ensureInit();
      var rt = state.runtime;
      if (rt.flashcard.mode !== "card" || rt.studySet.length === 0) { return; }
      var flipped = !rt.flashcard.isFlipped;
      var runtime = assign(rt, { flashcard: assign(rt.flashcard, { isFlipped: flipped }) });
      var d = state.data;
      var patch = {};
      var dirty = false;
      var learned = false;
      var tags = ["flashcard"];
      if (flipped) {
        var s = touchStreak(d.streak);
        if (s !== d.streak) {
          patch.streak = s;
          dirty = true;
          tags.push("streak");
        }
        var card = rt.studySet[rt.flashcard.index];
        var lp = card ? learnPatch(d, card.wordKey) : { patch: null, changed: false };
        if (lp.patch) {
          patch.todayLearned = lp.patch.todayLearned;
          patch.learnedHistory = lp.patch.learnedHistory;
          dirty = true;
          learned = true;
          tags.push("learning");
        }
      }
      commitLearning(dirty ? assign(d, patch) : d, runtime, tags, dirty, learned);
    }

    /**
     * 切換抽認卡／測驗模式（AC-09-01、AC-09-06）。
     * @param {"card"|"quiz"} mode
     * @returns {{ok: true} | {ok: false, reason?: "insufficient"}}
     */
    function setFlashcardMode(mode) {
      ensureInit();
      var rt = state.runtime;
      if (mode === "card") {
        if (rt.flashcard.mode !== "card") {
          commit(state.data, assign(rt, { flashcard: assign(rt.flashcard, { mode: "card", quiz: null }) }), ["flashcard", "quiz"], false);
        }
        return { ok: true };
      }
      if (mode !== "quiz") { return { ok: false }; }
      if (rt.flashcard.mode === "quiz" && rt.flashcard.quiz) { return { ok: true }; }
      var q = core().QUIZ.buildQuiz(rt.studySet, rt.flashcard.index, rand);
      if (!q) { return { ok: false, reason: "insufficient" }; }
      commit(state.data, assign(rt, { flashcard: assign(rt.flashcard, { mode: "quiz", quiz: q, isFlipped: false }) }), ["flashcard", "quiz"], false);
      return { ok: true };
    }

    /**
     * 四選一作答（AC-09-03、AC-09-04、AC-17-03）。已作答（鎖定）或不在測驗模式 → 忽略。
     * 答對才把 wordKey 加入已掌握（已存在則不變，V-ST-06）；打卡。
     * @param {number} optionIndex
     * @returns {{ok: true, correct: boolean} | {ok: false}}
     */
    function answerVocabQuiz(optionIndex) {
      ensureInit();
      var rt = state.runtime;
      var q = rt.flashcard.quiz;
      if (rt.flashcard.mode !== "quiz" || !q || q.selectedIndex !== null || !isOptionIndex(optionIndex)) {
        return { ok: false };
      }
      var correct = optionIndex === q.correctIndex;
      var d = state.data;
      var patch = {
        vocabQuiz: { answered: d.vocabQuiz.answered + 1, correct: d.vocabQuiz.correct + (correct ? 1 : 0) },
        streak: touchStreak(d.streak)
      };
      if (correct && d.masteredWordKeys.indexOf(q.wordKey) === -1) {
        patch.masteredWordKeys = d.masteredWordKeys.concat([q.wordKey]);
      }
      var tags = ["quiz", "flashcard", "stats", "streak"];
      // （v0.8）學習事件 "vocabQuiz"（對錯皆算，LR-1），與統計、已掌握、打卡合併為一次寫入（LR-5）
      var lp = learnPatch(d, q.wordKey);
      if (lp.patch) {
        patch.todayLearned = lp.patch.todayLearned;
        patch.learnedHistory = lp.patch.learnedHistory;
        tags.push("learning");
      }
      var data = assign(d, patch);
      var runtime = assign(rt, { flashcard: assign(rt.flashcard, { quiz: assign(q, { selectedIndex: optionIndex }) }) });
      commitLearning(data, runtime, tags, true, lp.changed);
      return { ok: true, correct: correct };
    }

    // ── actions：Part 5 ──

    /**
     * Part 5 作答（AC-11-03、AC-11-06）。已鎖定、結算中或題庫為空 → 忽略。
     * @param {number} i 選項索引 0～3
     * @returns {{ok: true, correct: boolean} | {ok: false}}
     */
    function answerPart5(i) {
      ensureInit();
      var bank = content().part5;
      var d = state.data;
      var p = d.part5;
      if (p.phase !== "question" || p.lockedSelection !== null || !isOptionIndex(i) ||
          p.currentIndex >= bank.length || !bank[p.currentIndex]) {
        return { ok: false };
      }
      var correct = i === bank[p.currentIndex].correctIndex;
      var part5 = assign(p, {
        lockedSelection: i,
        roundAnswered: p.roundAnswered + 1,
        roundCorrect: p.roundCorrect + (correct ? 1 : 0),
        totalAnswered: p.totalAnswered + 1,
        totalCorrect: p.totalCorrect + (correct ? 1 : 0)
      });
      var data = assign(d, { part5: part5, streak: touchStreak(d.streak) });
      commit(data, state.runtime, ["part5", "stats", "streak"], true);
      return { ok: true, correct: correct };
    }

    /**
     * 下一題（AC-11-04）：須已作答；最後一題後進入本輪結算（phase "summary"）。
     */
    function nextPart5() {
      ensureInit();
      var bank = content().part5;
      var d = state.data;
      var p = d.part5;
      if (p.phase !== "question" || p.lockedSelection === null) { return; }
      var part5;
      if (p.currentIndex >= bank.length - 1) {
        part5 = assign(p, { lockedSelection: null, phase: "summary" });
      } else {
        part5 = assign(p, { currentIndex: p.currentIndex + 1, lockedSelection: null });
      }
      commit(assign(d, { part5: part5 }), state.runtime, ["part5"], true);
    }

    /** 重新開始（AC-11-07）：回第 1 題、本輪歸零，累計保留 */
    function restartPart5() {
      ensureInit();
      var d = state.data;
      var p = d.part5;
      var part5 = assign(p, { currentIndex: 0, lockedSelection: null, phase: "question", roundAnswered: 0, roundCorrect: 0 });
      var changed = p.currentIndex !== 0 || p.lockedSelection !== null || p.phase !== "question" ||
        p.roundAnswered !== 0 || p.roundCorrect !== 0;
      commit(changed ? assign(d, { part5: part5 }) : d, state.runtime, ["part5"], changed);
    }

    // ── actions：語音 ──

    /**
     * STT 完成評分（AC-17-02 學習行為）→ 打卡。
     * （v0.8）另記錄學習事件 "stt"（LR-1）：wordKey 取 lastResult.targetText 正規化，無則目前卡；兩者都沒有則不記錄。
     * speech-panel 只在顯示分數後呼叫（逾時、空結果、錯誤不呼叫）。打卡與學習紀錄合併為一次寫入（LR-5）。
     */
    function recordSttScored() {
      ensureInit();
      var K = core();
      var d = state.data;
      var rt = state.runtime;
      var patch = {};
      var tags = [];
      var s = touchStreak(d.streak);
      if (s !== d.streak) {
        patch.streak = s;
        tags.push("streak");
      }
      var key = "";
      var lr = rt.speech.lastResult;
      if (lr && typeof lr.targetText === "string") { key = K.WK.wordKey(lr.targetText); }
      if (key === "") {
        var card = rt.studySet[rt.flashcard.index];
        key = card && typeof card.wordKey === "string" ? card.wordKey : "";
      }
      var lp = key !== "" ? learnPatch(d, key) : { patch: null, changed: false };
      if (lp.patch) {
        patch.todayLearned = lp.patch.todayLearned;
        patch.learnedHistory = lp.patch.learnedHistory;
        tags.push("learning");
      }
      if (tags.length === 0) { return; }
      commitLearning(assign(d, patch), rt, tags, true, lp.changed);
    }

    /** 按「我知道了」（AC-08-13、V-ST-08） */
    function acknowledgeSttNotice() {
      ensureInit();
      var d = state.data;
      if (d.sttNoticeAcknowledged === true) { return; }
      commit(assign(d, { sttNoticeAcknowledged: true }), state.runtime, ["speech"], true);
    }

    /** @param {"idle"|"notice"|"listening"} s */
    function setSttStatus(s) {
      ensureInit();
      var rt = state.runtime;
      if (STT_STATUSES.indexOf(s) === -1 || rt.speech.sttStatus === s) { return; }
      commit(state.data, assign(rt, { speech: assign(rt.speech, { sttStatus: s }) }), ["speech"], false);
    }

    /** @param {object|null} r SttResult 或 null */
    function setSttResult(r) {
      ensureInit();
      var rt = state.runtime;
      var v = r && typeof r === "object" ? r : null;
      commit(state.data, assign(rt, { speech: assign(rt.speech, { lastResult: v }) }), ["speech"], false);
    }

    // ── actions：解碼器、句型庫、頁籤 ──

    /** @param {number} i 例句索引（夾在題庫範圍內） */
    function setDecoderIndex(i) {
      ensureInit();
      if (typeof i !== "number" || !isFinite(i)) { return; }
      var len = content().decoderSentences.length;
      var idx = clampIndex(Math.floor(i), len);
      var rt = state.runtime;
      if (rt.decoder.sentenceIndex === idx) { return; }
      // 淡化狀態跨句保留（AC-13-03）
      commit(state.data, assign(rt, { decoder: assign(rt.decoder, { sentenceIndex: idx }) }), ["decoder"], false);
    }

    function toggleModifierDim() {
      ensureInit();
      var rt = state.runtime;
      commit(state.data, assign(rt, { decoder: assign(rt.decoder, { isModifierDimmed: !rt.decoder.isModifierDimmed }) }), ["decoder"], false);
    }

    /** @param {"all"|"gap"|"aim"|"findings"|"limitations"} c */
    function setPhraseCategory(c) {
      ensureInit();
      var rt = state.runtime;
      if (PHRASE_CATEGORIES.indexOf(c) === -1 || rt.phrasebank.category === c) { return; }
      commit(state.data, assign(rt, { phrasebank: assign(rt.phrasebank, { category: c }) }), ["phrasebank"], false);
    }

    /** @param {string} k 關鍵字原文 */
    function setPhraseKeyword(k) {
      ensureInit();
      var rt = state.runtime;
      var kw = typeof k === "string" ? k : "";
      if (rt.phrasebank.keyword === kw) { return; }
      commit(state.data, assign(rt, { phrasebank: assign(rt.phrasebank, { keyword: kw }) }), ["phrasebank"], false);
    }

    /**
     * 由 router 呼叫；（v0.8）首次模式只接受 customizer、sources，其他值忽略（AC-25-01、AC-25-07）。
     * （v0.9）HIDDEN_TAB_IDS（解碼器、句型庫）一律忽略，currentTab 永不為隱藏頁（HT-1、AC-20-04）；導向主控台由 router 負責。
     */
    function setTab(tabId) {
      ensureInit();
      var rt = state.runtime;
      if (TAB_IDS.indexOf(tabId) === -1 || rt.currentTab === tabId) { return; }
      if (core().C.HIDDEN_TAB_IDS.indexOf(tabId) !== -1) { return; }
      if (rt.entryMode === "firstRun" && FIRST_RUN_TABS.indexOf(tabId) === -1) { return; }
      commit(state.data, assign(rt, { currentTab: tabId }), ["tab"], false);
    }

    // ── actions：備份 ──

    /**
     * 匯出（AC-24-01、AC-24-02）：由記憶體狀態產生，localStorage 停用時仍可。
     * @returns {{filename: string, json: string}}
     */
    function exportBackup() {
      ensureInit();
      var m = content().manifest;
      var ver = m && typeof m.dataVersion === "string" ? m.dataVersion : "";
      // buildBackup 以 now 的本地日期正規化 todayLearned、learnedHistory（契約 §6.1）
      return core().BACKUP.buildBackup(state.data, ver, now());
    }

    /**
     * 匯入（契約 §6.2、IM-1～IM-5、V-IMP-01）。
     * 步驟 1～5、7 由 core/backup.importSteps 先完成（IM-4，確認前不改動任何狀態）；
     * 步驟 6 呼叫 confirmFn（view 傳入，內部呼叫 ui.dialog.confirm）；
     * 步驟 8 一次 setItem，容量不足 → quota、其他例外 → write_failed（IM-6、IM-7），記憶體與 localStorage 皆不變；
     * 步驟 9 套用到記憶體、重建單字集、抽認卡回第 1 張；localStorage 停用時只套用記憶體。
     * （v0.8）首次模式（FS-5～FS-7）：步驟 8 繞過首次守門寫入第一筆；步驟 9 成功另設 entryMode = "main"、
     * currentTab = "dashboard"、tag "entry"；取消與任何失敗維持 firstRun，記憶體與 localStorage 不變。
     * @param {string} text 備份檔內容
     * @param {function(): (boolean|Promise<boolean>)} confirmFn
     * @returns {Promise<{ok: true, skipped: number} | {ok: false, error: string, fileVersion?: number|null}>}
     */
    function importBackup(text, confirmFn) {
      ensureInit();
      var K = core();
      var ct = content();
      var r;
      try {
        r = K.BACKUP.importSteps(text, {
          builtinKeys: ct.builtinMap,
          part5Length: ct.part5.length,
          random: rand,
          today: today() // （v0.8）步驟 7 以匯入當天正規化學習紀錄（IM-8 (2)）
        });
      } catch (e) {
        r = { ok: false, error: "format" }; // IM-5
      }
      if (!r.ok) {
        var fail = { ok: false, error: r.error };
        if (r.error === "version") { fail.fileVersion = hasOwn(r, "fileVersion") ? r.fileVersion : null; }
        return Promise.resolve(fail);
      }

      var asked;
      try {
        asked = typeof confirmFn === "function" ? confirmFn() : false;
      } catch (e) {
        asked = false;
      }
      return Promise.resolve(asked).then(function (yes) { return yes; }, function () { return false; })
        .then(function (yes) {
          if (yes !== true) { return { ok: false, error: "cancelled" }; }
          var data = r.data;
          if (state.runtime.storageStatus !== "unavailable") {
            var w = writeData(data, true);
            if (!w.ok) {
              // 任何寫入失敗都不套用（AC-24-09）；容量不足（IM-7）→ quota，其他例外 → write_failed（IM-6）
              return { ok: false, error: w.reason === "quota" ? "quota" : "write_failed" };
            }
          }
          var rt = state.runtime;
          var set = buildStudySet(data);
          var runtime = assign(rt, {
            studySet: set,
            flashcard: { index: 0, isFlipped: false, mode: "card", quiz: null },
            speech: assign(rt.speech, { lastResult: null })
          });
          var tags = ["goal", "studySet", "flashcard", "quiz", "speech", "stats", "streak", "customVocab", "part5", "learning"];
          if (state.runtime.storageStatus !== "unavailable" && writeStatus !== "ok") {
            writeStatus = "ok";
            tags.push("storage");
          }
          if (rt.entryMode === "firstRun") {
            // 首次還原成功 → 進入主控台（FS-5），首次畫面上未生效的分數與卡片選擇捨棄（資料全以備份為準）
            runtime = assign(runtime, { entryMode: "main", currentTab: "dashboard" });
            tags.push("entry");
          }
          state = { data: data, runtime: runtime };
          notify(tags);
          return { ok: true, skipped: r.skipped };
        });
    }

    return {
      init: init,
      getState: getState,
      subscribe: subscribe,
      getStartup: getStartup,
      getWriteStatus: getWriteStatus,
      today: today,
      actions: {
        setDraftScore: setDraftScore,
        clickColor: clickColor,
        applyGoal: applyGoal,
        requestApplyGoal: requestApplyGoal,
        confirmApplyGoal: confirmApplyGoal,
        cancelApplyGoal: cancelApplyGoal,
        startLearning: startLearning,
        addCustomWord: addCustomWord,
        deleteCustomWord: deleteCustomWord,
        injectTemplate: injectTemplate,
        gotoCard: gotoCard,
        flipCard: flipCard,
        setFlashcardMode: setFlashcardMode,
        answerVocabQuiz: answerVocabQuiz,
        answerPart5: answerPart5,
        nextPart5: nextPart5,
        restartPart5: restartPart5,
        recordSttScored: recordSttScored,
        acknowledgeSttNotice: acknowledgeSttNotice,
        setSttStatus: setSttStatus,
        setSttResult: setSttResult,
        setDecoderIndex: setDecoderIndex,
        toggleModifierDim: toggleModifierDim,
        setPhraseCategory: setPhraseCategory,
        setPhraseKeyword: setPhraseKeyword,
        setTab: setTab,
        exportBackup: exportBackup,
        importBackup: importBackup
      }
    };
  }

  return {
    createStore: createStore,
    browserStorage: browserStorage,
    detectSpeech: detectSpeech,
    isQuotaError: isQuotaError
  };
});
