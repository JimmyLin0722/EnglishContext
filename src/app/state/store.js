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
 *   其他寫入 → 保留記憶體狀態，writeStatus 設為 "quota"，下次寫入再試（v0.15 起提示規則見下方 commitWrite）。
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
 * - （v0.11，FE-49）runtime.pwa（PwaRuntimeState，契約 PV-1、PV-7）：初始值取 core/pwa.initialPwaState()；
 *   只能經 actions.setPwa 更新（tag "pwa"，不寫入 localStorage、不進備份）；其他 action 以 assign 局部更新時保留原值。
 *
 * - （v0.15，FE-74）學習位置與作答紀錄（契約 §5.10～§5.12、architecture §4.10、§7.21.2、§7.21.3、§7.21.5）：
 *   一般寫入一律經 commitWrite（容量不足：記憶體保留、整個工作階段最多發 1 次 "learningQuota"，不發 "storage"；
 *   其他例外不提示）；writeData 寫出前呼叫 persist.ensureWritable。單字集重建一律經 placeCard（position.resolve，
 *   FP-2、FP-5、FP-6）；gotoCard 換卡即寫入 flashcardPosition（FP-3）；生效色級改變 → 位置 null、第 1 張，
 *   未改變 → 單字卡狀態全部不變（FP-4、FB-54）。模擬測驗轉移集中在 core/part5flow（CR-2、LV-1、LV-3、UO-1～UO-10），
 *   題庫為空時 part5 action 一律不動作。
 *
 * - （v0.19，FE-86）對外頁面與廣告的執行期狀態（契約 RuntimeState.ad、sitePageReturnTab、SP-3、SP-4、AD-5、AD-10；
 *   architecture §4.12、§7.25.3、§7.25.5）：只在記憶體，setItem 0 次、不進備份。setTab 維護返回目標；
 *   initAd 只生效 1 次；adEvent 經 core/ad.transition，有改變才通知 ["ad"]；confirmApplyGoal 成功路徑與
 *   importBackup 成功後無學習紀錄時同步轉 dismissed（SD-FB-82），clearPart5CorrectIds 不動。
 *
 * - （v0.20，FE-91）語音辨識準備中（契約 data-schema §10 SttStatus、RuntimeState.speech.preparingPhase、§18 SttPreparingPhase、
 *   README §14.1 PR-1、PR-2、PR-9、DS-63；architecture §4.13）：sttStatus 新增 "preparing"，runtime.speech 新增
 *   preparingPhase（啟動一律 null）。兩者只在記憶體，經 setSttStatus(status, phase) 更新（setItem 0 次、不進備份）。
 *
 * - （v0.23，FE-106）單字卡學完回饋（契約 RuntimeState.flashcard.islandFeedback、README §15.5 LF-1～LF-6、IS-1、IS-2；
 *   architecture §4.16「EMT.store」、§7.32.9）：flipCard（翻到背面）、answerVocabQuiz、recordSttScored 在 currentTab 為
 *   "flashcards" 時，以同一個 today 取套用前（B）與套用全部資料變更後（A）的島嶼快照（islandSnapshot），
 *   island.feedbackOf(B, A) 非 null → 放進同一次 commitWrite 的 runtime，tags 加 "islandFeedback"；null → 維持原值。
 *   生命週期：啟動、匯入為 null；換卡、切換模式、重建單字集保留；setTab 離開 "flashcards" 設 null（LF-3）。
 *   只在記憶體：不進 data、localStorage、備份；不增加 setItem 次數；寫入失敗時回饋照常（LF-5）。
 *
 * - （v0.21，FE-114）啟動預熱（architecture §4.16「init() 預熱」、§7.32.15 P-5）：init 建好初始狀態後、發出啟動通知前，
 *   島嶼模組已載入時以同一個 today 取 1 次快照並呼叫 feedbackOf(w, w)（結果丟棄），填入 islandsOf 單筆快取。
 *   不改 state、tags、setItem；例外吞掉。islandsOf 快取以參照比對：store 一律以 concat／filter 產生新的
 *   masteredWordKeys 陣列，不原地修改（§7.32.15 前提）。
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
        REINIT: require("../core/reinit.js"),
        PWA: require("../core/pwa.js"),
        POS: require("../core/position.js"),
        PF: require("../core/part5flow.js"),
        AD: require("../core/ad.js"),
        // （v0.23，FE-106）島嶼推算（學完回饋比較用）
        ISL: require("../core/island.js")
      };
    } else {
      var c = root.EMT.core;
      coreCache = {
        C: c.constants, WK: c.wordkey, GOAL: c.goal, VOCAB: c.vocab, CUSTOM: c.custom,
        STREAK: c.streak, QUIZ: c.quiz, P: c.persist, BACKUP: c.backup, LEARN: c.learning,
        REINIT: c.reinit, PWA: c.pwa, POS: c.position, PF: c.part5flow, AD: c.ad, ISL: c.island
      };
    }
    return coreCache;
  }

  /** （v0.11，FE-49）取得 core/pwa（呼叫時取用，LD-2）；不存在時視為組裝錯誤（LD-3） */
  function pwaCore() {
    var m = core().PWA;
    if (!m) { throw new Error("EMT.core.pwa 未載入（state/store.js）"); }
    return m;
  }

  // 契約列舉（data-schema.ts §7、§10）
  var TAB_IDS = ["dashboard", "customizer", "flashcards", "part5", "decoder", "phrasebank", "sources", "about", "contact", "privacy"];
  /** （v0.8）首次模式可停留的頁面（architecture §4.3 setTab、§7.9；v0.19 加 3 個對外頁面，SP-4） */
  var FIRST_RUN_TABS = ["customizer", "sources", "about", "contact", "privacy"];
  /** （v0.19）有返回目標的 4 個頁面（SP-3） */
  var SITE_RETURN_TABS = ["sources", "about", "contact", "privacy"];
  var STT_STATUSES = ["idle", "notice", "preparing", "listening"];
  /** （v0.20）準備中的子階段（data-schema §18 SttPreparingPhase） */
  var STT_PREPARING_PHASES = ["acquiringMic", "awaitingAudioStart", "fallbackWait"];
  var PHRASE_CATEGORIES = ["all", "gap", "aim", "findings", "limitations"];

  /** 一次通知全部區塊時使用的 tags */
  var ALL_TAGS = ["init", "goal", "studySet", "flashcard", "quiz", "speech", "stats", "streak",
    "customVocab", "part5", "decoder", "phrasebank", "tab", "storage", "learning", "islandFeedback"];

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

  /**
   * （v0.19）切頁後的返回目標（SP-3、architecture §7.25.5）：
   * 進入 4 頁 → 記下原頁面；在 4 頁之間切換 → 不覆蓋；離開 4 頁 → null。
   * @param {string} current 目前頁面
   * @param {string} next 下一頁
   * @param {string|null} saved 目前的 sitePageReturnTab
   * @returns {string|null}
   */
  function nextReturnTab(current, next, saved) {
    if (SITE_RETURN_TABS.indexOf(next) === -1) { return null; }
    return SITE_RETURN_TABS.indexOf(current) === -1 ? current : saved;
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

  /** 把索引夾在單字集範圍內；空集合 → 0 */
  function clampIndex(i, len) {
    if (len <= 0) { return 0; }
    if (i < 0) { return 0; }
    if (i > len - 1) { return len - 1; }
    return i;
  }

  /**
   * （v0.23，FE-106）學完回饋比較用的島嶼快照（architecture §7.32.9 islandSnap；契約 LF-1、IS-13、LR-6）。
   * 純函式：只讀傳入的內容與資料，不讀寫儲存、時鐘；回傳值只供當次 feedbackOf 比較，不得放進 data 或任何儲存（IS-1）。
   * - islands = island.islandsOf（內容的 builtin、builtinMap、nB、nG 與 data.masteredWordKeys、data.goal.effectiveColor）
   * - x = learning.todayCount(data.todayLearned, t)；d = learning.dailyGoal(data.goal.effectiveColor)
   * @param {object|function} src EMT.content 相容物件或回傳它的函式（缺漏、為空時三島 n = 0）
   * @param {object} data PersistedData
   * @param {string} t 本次 action 取 1 次的 today（YYYY-MM-DD）
   * @returns {{islands: object[], x: number, d: number}}
   */
  function islandSnapshot(src, data, t) {
    var K = core();
    var ct = readContent(src);
    var d = data && typeof data === "object" ? data : {};
    var goal = d.goal && typeof d.goal === "object" ? d.goal : {};
    return {
      islands: K.ISL.islandsOf({
        builtin: ct.builtin, builtinMap: ct.builtinMap, nB: ct.nB, nG: ct.nG,
        masteredWordKeys: d.masteredWordKeys, effectiveColor: goal.effectiveColor
      }),
      x: K.LEARN.todayCount(d.todayLearned || null, t),
      d: K.LEARN.dailyGoal(goal.effectiveColor)
    };
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
    /** （v0.19）initAd 是否已生效（AD-4 只在啟動時判定一次；只在模組內部，不進 state） */
    var adInitDone = false;

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
        // （v0.15）補齊並正規化 3 個新欄位，保證寫出 PersistedDataWritten（architecture §4.10 ensureWritable）。
        // ensureWritable 只處理這 3 欄但會深度複製整個物件；只傳入 3 欄再併回，避免每次換卡都複製整個 customVocab
        // （1,000 個自訂單字時約多 2 ms，§7.21.2 效能要求），結果與傳入整筆相同
        var tr = K.P.ensureWritable({
          flashcardPosition: data.flashcardPosition,
          part5CorrectIds: data.part5CorrectIds,
          part5UnansweredOnly: data.part5UnansweredOnly
        });
        var wd = assign(data, {
          flashcardPosition: tr.flashcardPosition,
          part5CorrectIds: tr.part5CorrectIds,
          part5UnansweredOnly: tr.part5UnansweredOnly
        });
        var lr = K.LEARN.normalizeLearning(wd, today());
        var out = assign(wd, { todayLearned: lr.todayLearned, learnedHistory: lr.learnedHistory });
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
        // （v0.23，FE-106）islandFeedback：學完回饋，頁面載入時 null（LF-3）
        flashcard: { index: 0, isFlipped: false, mode: "card", quiz: null, islandFeedback: null },
        speech: {
          ttsSupported: !!speech.ttsSupported,
          sttSupported: !!speech.sttSupported,
          sttStatus: "idle",
          // （v0.20，FE-91）準備中的子階段；只在記憶體，啟動一律 null（AC-58-12）
          preparingPhase: null,
          lastResult: null
        },
        decoder: { sentenceIndex: 0, isModifierDimmed: false },
        phrasebank: { category: "all", keyword: "" },
        storageStatus: storageStatus,
        // （v0.8）本工作階段是否已提示過學習紀錄容量不足（LR-7）
        learningQuotaNoticeShown: false,
        // （v0.8）首次進入判定結果（FS-1）；本工作階段只會 firstRun → main
        entryMode: entryMode === "firstRun" ? "firstRun" : "main",
        // （v0.11，FE-49）PWA 頁面端狀態（只在記憶體，不持久化，PV-1）；PE-1 由 main.js 經 setPwa 寫入
        pwa: pwaCore().initialPwaState(),
        // （v0.12，FE-55）主控台介面狀態（只在記憶體，不持久化，DB-6）；每次 init 皆為收合
        dashboard: { backupExpanded: false },
        // （v0.19，FE-86）廣告版位狀態（只在記憶體，AD-5）；啟動時由 main.js 經 initAd 設定
        ad: { status: "ineligible" },
        // （v0.19，FE-86）進入 4 個對外頁面之前的頁面（只在記憶體，SP-3）
        sitePageReturnTab: null
      };
    }

    /**
     * 換卡後的抽認卡狀態：正面、清除 STT 結果；測驗模式則為新卡重新出題（不足 → 回抽認卡模式，AC-09-06）。
     * （v0.23，FE-106）學完回饋 islandFeedback 帶入原值（換卡保留，LF-3）。
     * @returns {{flashcard: object, speech: object}}
     */
    function cardChanged(runtime, studySet, index) {
      var keep = runtime.flashcard.islandFeedback;
      var fc = {
        index: index, isFlipped: false, mode: runtime.flashcard.mode, quiz: null,
        islandFeedback: keep === undefined ? null : keep
      };
      if (fc.mode === "quiz") {
        fc.quiz = core().QUIZ.buildQuiz(studySet, index, rand);
        if (!fc.quiz) { fc.mode = "card"; }
      }
      return { flashcard: fc, speech: assign(runtime.speech, { lastResult: null }) };
    }

    /**
     * （v0.15，FE-74）單字集重建時決定目前卡片（FP-2、FP-5、FP-6；architecture §4.10 placeCard）。
     * 以 data.flashcardPosition 經 position.resolve 解析出新索引；新目前卡片與舊目前卡片（runtime.studySet[index]）
     * 的 wordKey 相同 → 保留翻面、模式與題目，否則依 cardChanged 重設。
     * 只計算、不寫入；呼叫端把回傳的 flashcardPosition 放進同一次寫入的 data（啟動與匯入步驟 9 只改記憶體，RD-4）。
     * 單字集為空時 position 為原紀錄（FP-2 (1)，紀錄不動）。
     * @param {object} runtime 目前（舊）執行期狀態
     * @param {object} data 新的 PersistedData（讀取其 flashcardPosition）
     * @param {object[]} newSet 新單字集
     * @returns {{runtime: object, flashcardPosition: (object|null)}}
     */
    function placeCard(runtime, data, newSet) {
      var r = core().POS.resolve(data.flashcardPosition, newSet);
      var oldCard = runtime.studySet ? runtime.studySet[runtime.flashcard.index] : null;
      var newCard = newSet[r.index];
      var rt;
      if (oldCard && newCard && oldCard.wordKey === newCard.wordKey) {
        rt = assign(runtime, { studySet: newSet, flashcard: assign(runtime.flashcard, { index: r.index }) });
      } else {
        var cc = cardChanged(runtime, newSet, r.index);
        rt = assign(runtime, { studySet: newSet, flashcard: cc.flashcard, speech: cc.speech });
      }
      // 無紀錄（null）→ 第 1 張，紀錄維持 null：null 與「第 1 張」等價（architecture §7.21.2 INV-FP），
      // 避免只因啟動或重建就把 null 改成 { wordKey, ordinal: 1 }（啟動後記憶體與 localStorage 相同，V-ST-21）
      var pos = r.kind === "none" && data.flashcardPosition === null ? null : r.position;
      return { runtime: rt, flashcardPosition: pos };
    }

    /** 回到第 1 張（index 0）：已是第 1 張則原物件；否則依 cardChanged 重設（FP-4 位置為 null 時用） */
    function firstCard(runtime) {
      if (runtime.flashcard.index === 0) { return runtime; }
      var cc = cardChanged(runtime, runtime.studySet, 0);
      return assign(runtime, { flashcard: cc.flashcard, speech: cc.speech });
    }

    /**
     * （v0.19，AD-10）把版位轉為 dismissed：狀態有改變才回傳新 runtime 並加 tag "ad"；終態與 ineligible 維持原物件（AD-5）。
     * 只計算、不提交，由呼叫端併入同一次通知（同步，≤ 100ms）。
     * @param {object} runtime
     * @param {string[]} tags 會被加入 "ad"
     * @returns {object} runtime
     */
    function dismissAd(runtime, tags) {
      var cur = runtime.ad.status;
      var next = core().AD.transition(cur, "dismiss");
      if (next === cur) { return runtime; }
      tags.push("ad");
      return assign(runtime, { ad: { status: next } });
    }

    /** 題庫 id 陣列（part5flow.bankIdsOf，順序與題庫相同） */
    function bankIds() {
      return core().PF.bankIdsOf(content().part5);
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
     * 只更新記憶體並通知（不寫入 localStorage）。
     * @param {object} data
     * @param {object} runtime
     * @param {string[]} tags
     */
    function commit(data, runtime, tags) {
      state = { data: data, runtime: runtime };
      notify(tags);
    }

    /**
     * （v0.15，FE-74）一般寫入的唯一提交函式（architecture §7.21.5、契約 WR-1～WR-3、V-ST-22；取代 v0.14 的
     * 「commit 寫入」與學習紀錄專用提交）。一次 setItem 後記憶體一律採用新 data（不回滾），再 notify(tags) 一次：
     * - 成功：writeStatus 由非 ok 回到 ok 時加 "storage" tag（banner 收起）
     * - quota：writeStatus = "quota"；本工作階段尚未提示（learningQuotaNoticeShown 為 false）→ 設 true 並加
     *   "learningQuota" tag（banner 提示「儲存空間不足」，整個工作階段最多 1 次，與 AC-30-14 共用旗標）；不加 "storage"
     * - error：writeStatus = "error"；不提示
     * - disabled／firstRun：沿用 noteWrite（不提示；首次守門不改 writeStatus）
     * @param {object} data 新的 PersistedData
     * @param {object} runtime 新的執行期狀態
     * @param {string[]} tags
     * @param {{bypassFirstRun?: boolean}} [opts] bypassFirstRun 供 startLearning 寫第一筆
     * @returns {{ok: true} | {ok: false, reason: string}} writeData 的結果
     */
    function commitWrite(data, runtime, tags, opts) {
      var o = opts || {};
      var w = writeData(data, o.bypassFirstRun === true);
      var rt = runtime;
      if (w.ok) {
        if (writeStatus !== "ok") {
          writeStatus = "ok";
          tags.push("storage");
        }
      } else if (w.reason === "quota" || w.reason === "error") {
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
      return w;
    }

    /**
     * （v0.8）以 learning.record 記錄一次學習事件（LR-1～LR-3）。不修改傳入值。
     * 只有「新增 wordKey」或「todayLearned 換日」時回傳 patch，否則 patch 為 null。
     * @param {object} d 目前的 PersistedData
     * @param {string} key wordKey（record 內會再以 C-2 正規化）
     * @param {string} [t] （v0.23）本次 action 已取的 today；省略時現取
     * @returns {{patch: (object|null), changed: boolean}}
     */
    function learnPatch(d, key, t) {
      var day = typeof t === "string" ? t : today();
      var r = core().LEARN.record(d.todayLearned, d.learnedHistory, key, day);
      var dayChanged = !d.todayLearned || d.todayLearned.date !== day;
      if (!r.changed && !dayChanged) { return { patch: null, changed: false }; }
      return { patch: { todayLearned: r.todayLearned, learnedHistory: r.learnedHistory }, changed: true };
    }

    /** 學習行為打卡（AC-17-02）；回傳新的 streak（未變時為原物件）。（v0.23）t 為本次 action 已取的 today，省略時現取 */
    function touchStreak(streak, t) {
      var next = core().STREAK.touch(streak, typeof t === "string" ? t : today());
      if (next.days === streak.days && next.lastActiveDate === streak.lastActiveDate) { return streak; }
      return next;
    }

    // ── 學完回饋（v0.23，FE-106；LF-1～LF-5）──

    /**
     * 套用前快照 B：只在單字卡頁（currentTab === "flashcards"）且島嶼模組已載入時計算，否則 null（不比較）。
     * @param {object} rt 目前 runtime
     * @param {object} data 套用前的 PersistedData
     * @param {string} t 本次 action 取 1 次的 today
     * @returns {object|null}
     */
    function feedbackBefore(rt, data, t) {
      if (rt.currentTab !== "flashcards" || !core().ISL) { return null; }
      return islandSnapshot(contentSrc, data, t);
    }

    /**
     * 以 B 與套用全部資料變更後的快照 A 決定回饋（LF-2）。得到回饋 → 回傳帶新 islandFeedback 的 runtime 並加 tag；
     * null 或未比較（before 為 null）→ 原 runtime 不變（維持原值，LF-3）。不修改傳入值、不寫入任何儲存（IS-1）。
     * @param {object} runtime 準備提交的 runtime
     * @param {object|null} before feedbackBefore 的結果
     * @param {object} newData 套用後的 PersistedData
     * @param {string} t 與 before 相同的 today
     * @param {string[]} tags 本次提交的 tags（會附加 "islandFeedback"）
     * @returns {object} runtime
     */
    function withFeedback(runtime, before, newData, t, tags) {
      if (!before) { return runtime; }
      var fb = core().ISL.feedbackOf(before, islandSnapshot(contentSrc, newData, t));
      if (!fb) { return runtime; }
      tags.push("islandFeedback");
      return assign(runtime, { flashcard: assign(runtime.flashcard, { islandFeedback: fb }) });
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
      /** （v0.21，FE-114）本次 init 已取得的 today；只有讀到紀錄時才取，預熱沿用同一天（未取時預熱才取） */
      var initDay = null;
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
          // （v0.15）第 4 參數傳題庫 id → V-ST-05 之後再做 UO-4（只改記憶體，RD-4）
          initDay = today();
          data = K.P.normalizeAfterLoad(parsed.data, ct.part5.length, initDay, K.PF.bankIdsOf(ct.part5));
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
      adInitDone = false;
      // （v0.15）FP-2：依紀錄解析目前卡片；記憶體中的紀錄更新為解析結果，不寫入（RD-4）
      var rt0 = initialRuntime(data, available ? "ok" : "unavailable", entryMode);
      var placed = placeCard(rt0, data, rt0.studySet);
      if (placed.flashcardPosition !== data.flashcardPosition) {
        data = assign(data, { flashcardPosition: placed.flashcardPosition });
      }
      state = { data: data, runtime: placed.runtime };
      initialized = true;
      warmIsland(K, initDay);
      notify(ALL_TAGS.slice());
      return { status: startup.status, migrated: startup.migrated };
    }

    /**
     * （v0.21，FE-114）啟動預熱（architecture §4.16「init() 預熱」、§7.32.15 P-5；AC-69-05、AC-70-03）：
     * 島嶼模組已載入時，以 init 的同一個 today 取 1 次快照 w，再呼叫 feedbackOf(w, w)（必為 null、丟棄），
     * 讓 islandsOf 單筆快取先填入、翻面路徑的函式先編譯，重新載入後第一次翻面不再付冷啟動成本。
     * 只讀 state.data 與內容：不改 state、不加 tags、不呼叫 setItem；任何例外吞掉，不影響啟動、不提示使用者。
     * @param {object} K core() 的結果
     * @param {string|null} t init 已取得的 today（YYYY-MM-DD）；null（未讀到紀錄）時在此取 1 次
     */
    function warmIsland(K, t) {
      if (!K.ISL) { return; }
      try {
        var w = islandSnapshot(contentSrc, state.data, typeof t === "string" ? t : today());
        K.ISL.feedbackOf(w, w);
      } catch (e) {
        // 預熱失敗不影響啟動（之後的學習事件照常各自計算）
      }
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
      commitWrite(data, state.runtime, ["goal"]);
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
     * 點色級卡片（v0.10 R-19；契約 GS-2、V-ST-16；AC-01-05、AC-01-07、AC-02-04、AC-26-02）：
     * draftScore = 該色 scoreMax（goal.scoreForCard），含目前選中色級與藍、金；未知色級 → draftScore 不變。
     * 寫入行為沿用 setDraft（一般模式照常寫入、首次模式只改記憶體；不觸發 CI-1）。
     * @param {string} colorId
     * @returns {{score: number}}
     */
    function clickColor(colorId) {
      ensureInit();
      var score = core().GOAL.scoreForCard(colorId);
      if (score === null) { return { score: state.data.goal.draftScore }; }
      setDraft(score);
      return { score: state.data.goal.draftScore };
    }

    /**
     * 套用（AC-01-02、AC-01-07、AC-03-05）：appliedScore = draftScore、重算色級；
     * （v0.15）生效色級改變 → 重建單字集、抽認卡回第 1 張正面、位置 null（FP-4）；未改變 → 單字卡狀態不變（FB-54）。
     * goal 未改變時不寫入（v0.14 行為）。
     */
    function applyGoal() {
      ensureInit();
      var g = appliedGoalState();
      var tags = ["goal", "studySet", "flashcard", "quiz", "speech"];
      if (g.changed) {
        commitWrite(g.data, g.runtime, tags);
      } else {
        commit(g.data, g.runtime, tags);
      }
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
      commit(data, state.runtime, ["goal"]);
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
      // 單字集只由 goal 與 customVocab 推導，兩者在 g.data 與 newData 相同。
      // （v0.15）buildReinitData 已設 flashcardPosition = null；生效色級未改變卻被直接呼叫時（UI 不會發生），
      // 也回到第 1 張以維持「null ⇔ 第 1 張」（INV-FP）
      // （v0.19）AD-10 (a)：初始化成功才隱藏版位；寫入失敗（上方已返回）資料未改變，不隱藏（SD-FB-82）
      state = { data: newData, runtime: dismissAd(firstCard(g.runtime), tags) };
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
     * 「套用」的狀態計算（applyGoal、confirmApplyGoal 與 startLearning 共用，不提交）：
     * appliedScore = draftScore、依 V-ST-02 重算色級。
     * （v0.15，FP-4、FB-54）生效色級改變 → 重建單字集、抽認卡回第 1 張正面（模式保持，測驗模式重新出題）、
     * flashcardPosition = null；未改變 → studySet、flashcard、speech、flashcardPosition 全部不變。
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
      var rt = state.runtime;
      if (goal.effectiveColor === d.goal.effectiveColor) {
        return { data: changed ? assign(d, { goal: goal }) : d, runtime: rt, changed: changed };
      }
      var data = assign(d, { goal: goal, flashcardPosition: null });
      var set = buildStudySet(data);
      var cc = cardChanged(rt, set, 0);
      return { data: data, runtime: assign(rt, { studySet: set, flashcard: cc.flashcard, speech: cc.speech }), changed: true };
    }

    /**
     * （v0.8）首次畫面「開始學習」（FS-4、AC-25-02、AC-25-03、AC-18-02）。只在 firstRun 有效，一般模式回 { ok: false }、不做事。
     * 等同 applyGoal ＋ 一次 setItem（繞過首次守門，不論分數是否改變都寫入第一筆）；
     * 寫入結果不影響進入：entryMode = "main"、currentTab = "dashboard"。
     * quota／error 走 commitWrite（v0.15：quota 依 WR-2 本工作階段最多提示 1 次；主鍵仍不存在，下次開啟仍是首次畫面，契約 FB-31 (a)）；
     * （v0.15）寫入的 flashcardPosition 為 null、抽認卡為第 1 張（FP-4 末句）；
     * storage 停用 → 不寫入、直接進入（write "disabled"，AC-25-08）。
     * @returns {{ok: true, write: "ok"|"quota"|"error"|"disabled"} | {ok: false}}
     */
    function startLearning() {
      ensureInit();
      if (state.runtime.entryMode !== "firstRun") { return { ok: false }; }
      var g = appliedGoalState();
      var tags = ["entry", "goal", "studySet", "flashcard", "quiz", "speech"];
      // （v0.15）FP-4 末句：第一筆寫入的位置為 null，抽認卡為第 1 張
      var data = g.data.flashcardPosition === null ? g.data : assign(g.data, { flashcardPosition: null });
      var runtime = assign(firstCard(g.runtime), { entryMode: "main", currentTab: "dashboard", sitePageReturnTab: null });
      var w = commitWrite(data, runtime, tags, { bypassFirstRun: true });
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
      // （v0.15）FP-5：單字集重建 → placeCard，解析後的位置與 customVocab 同一次寫入
      var placed = placeCard(state.runtime, data, buildStudySet(data));
      data = assign(data, { flashcardPosition: placed.flashcardPosition });

      // 先寫入；容量不足 → 丟棄新狀態（回滾，位置一併丟棄），不通知 banner（由 view 顯示「儲存空間不足」）
      var w = writeData(data);
      if (!w.ok && w.reason === "quota") {
        return { ok: false, reason: "quota" };
      }
      var tags = ["customVocab", "studySet", "flashcard"];
      noteWrite(w, tags);
      state = { data: data, runtime: placed.runtime };
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

      // （v0.15）FP-5：以 placeCard 定位（刪除目前卡片 → FP-2 (4) 的 min(ordinal, N) − 1，即原本下一張，
      // 原為最後一張則前一張，與 AC-04-08 相同；仍是同一張卡則保留翻面與題目），位置與 customVocab 同一次寫入
      var placed = placeCard(state.runtime, data, buildStudySet(data));
      data = assign(data, { flashcardPosition: placed.flashcardPosition });
      commitWrite(data, placed.runtime, ["customVocab", "studySet", "flashcard", "quiz", "stats"]);
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
      // （v0.15）FP-5：同 addCustomWord
      var placed = placeCard(state.runtime, data, buildStudySet(data));
      data = assign(data, { flashcardPosition: placed.flashcardPosition });

      // 先寫入；容量不足 → 丟棄新狀態（回滾），由 view 顯示「儲存空間不足」
      var w = writeData(data);
      if (!w.ok && w.reason === "quota") {
        return { injected: 0, skipped: r.skippedCount, reason: "quota" };
      }
      var tags = ["customVocab", "studySet", "flashcard"];
      noteWrite(w, tags);
      state = { data: data, runtime: placed.runtime };
      notify(tags);
      return { injected: r.items.length, skipped: r.skippedCount };
    }

    // ── actions：抽認卡 ──

    /**
     * 換卡（AC-06-04、AC-06-05）：超出範圍或同一張 → 不變、不寫入。
     * （v0.15，FP-3）index 實際改變時 flashcardPosition = position.fromIndex(studySet, index)，
     * 同一事件以 commitWrite 一次 setItem（全專案唯一改變 index 的使用者入口）；不改學習紀錄與打卡（FP-7）。
     * @param {number} index
     */
    function gotoCard(index) {
      ensureInit();
      var rt = state.runtime;
      if (typeof index !== "number" || index !== Math.floor(index) || index < 0 || index >= rt.studySet.length) { return; }
      if (index === rt.flashcard.index) { return; }
      var cc = cardChanged(rt, rt.studySet, index);
      var data = assign(state.data, { flashcardPosition: core().POS.fromIndex(rt.studySet, index) });
      commitWrite(data, assign(rt, { flashcard: cc.flashcard, speech: cc.speech }), ["flashcard", "quiz", "speech"]);
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
      var tags = ["flashcard"];
      // （v0.23）翻到背面才是學習行為（LR-1）：同一個 today 供打卡、學習紀錄與回饋前後快照使用（LF-1）
      var t = flipped ? today() : "";
      var before = flipped ? feedbackBefore(rt, d, t) : null;
      if (flipped) {
        var s = touchStreak(d.streak, t);
        if (s !== d.streak) {
          patch.streak = s;
          dirty = true;
          tags.push("streak");
        }
        var card = rt.studySet[rt.flashcard.index];
        var lp = card ? learnPatch(d, card.wordKey, t) : { patch: null, changed: false };
        if (lp.patch) {
          patch.todayLearned = lp.patch.todayLearned;
          patch.learnedHistory = lp.patch.learnedHistory;
          dirty = true;
          tags.push("learning");
        }
      }
      var newData = dirty ? assign(d, patch) : d;
      runtime = withFeedback(runtime, before, newData, t, tags);
      if (dirty) {
        commitWrite(newData, runtime, tags);
      } else {
        commit(d, runtime, tags);
      }
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
          commit(state.data, assign(rt, { flashcard: assign(rt.flashcard, { mode: "card", quiz: null }) }), ["flashcard", "quiz"]);
        }
        return { ok: true };
      }
      if (mode !== "quiz") { return { ok: false }; }
      if (rt.flashcard.mode === "quiz" && rt.flashcard.quiz) { return { ok: true }; }
      var q = core().QUIZ.buildQuiz(rt.studySet, rt.flashcard.index, rand);
      if (!q) { return { ok: false, reason: "insufficient" }; }
      commit(state.data, assign(rt, { flashcard: assign(rt.flashcard, { mode: "quiz", quiz: q, isFlipped: false }) }), ["flashcard", "quiz"]);
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
      // （v0.23）同一個 today 供打卡、學習紀錄與回饋前後快照使用（LF-1）
      var t = today();
      var before = feedbackBefore(rt, d, t);
      var patch = {
        vocabQuiz: { answered: d.vocabQuiz.answered + 1, correct: d.vocabQuiz.correct + (correct ? 1 : 0) },
        streak: touchStreak(d.streak, t)
      };
      if (correct && d.masteredWordKeys.indexOf(q.wordKey) === -1) {
        patch.masteredWordKeys = d.masteredWordKeys.concat([q.wordKey]);
      }
      var tags = ["quiz", "flashcard", "stats", "streak"];
      // （v0.8）學習事件 "vocabQuiz"（對錯皆算，LR-1），與統計、已掌握、打卡合併為一次寫入（LR-5）
      var lp = learnPatch(d, q.wordKey, t);
      if (lp.patch) {
        patch.todayLearned = lp.patch.todayLearned;
        patch.learnedHistory = lp.patch.learnedHistory;
        tags.push("learning");
      }
      var data = assign(d, patch);
      var runtime = assign(rt, { flashcard: assign(rt.flashcard, { quiz: assign(q, { selectedIndex: optionIndex }) }) });
      runtime = withFeedback(runtime, before, data, t, tags);
      commitWrite(data, runtime, tags);
      return { ok: true, correct: correct };
    }

    // ── actions：Part 5 ──

    /**
     * （v0.15）模擬測驗目前的推導值：題庫 id、答對集合、開關（已正規化為布林）、畫面種類（UO-3）。
     * @returns {{ids: Array<string|null>, set: Set<string>, only: boolean, kind: string}}
     */
    function part5Ctx() {
      var PF = core().PF;
      var d = state.data;
      var ids = bankIds();
      var set = PF.correctSet(d.part5CorrectIds);
      var only = d.part5UnansweredOnly === true;
      return { ids: ids, set: set, only: only, kind: PF.viewKind(d.part5, ids, set, only) };
    }

    /**
     * Part 5 作答（AC-11-03、AC-11-06）。已鎖定、結算中、題庫為空或（v0.15）畫面為 allCorrect → 忽略。
     * （v0.18，LV-3；AC-48-02）作答防護放在 store 層：part5flow.canAnswer 不符合（含曾答對的題目，不論開關）
     * → { ok: false }，part5、答對紀錄、streak、todayLearned 皆不變，不寫入。
     * 到達與重新載入已答對鎖定檢視皆不寫入 lockedSelection（LV-4）。
     * （v0.15，CR-2）答對且該題 id 未曾記錄 → 附加到 part5CorrectIds 末尾，與計數、打卡同一次 commitWrite。
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
      var ctx = part5Ctx();
      if (ctx.kind === "allCorrect" || !core().PF.canAnswer(p, ctx.ids, ctx.set)) { return { ok: false }; }
      var correct = i === bank[p.currentIndex].correctIndex;
      var part5 = assign(p, {
        lockedSelection: i,
        roundAnswered: p.roundAnswered + 1,
        roundCorrect: p.roundCorrect + (correct ? 1 : 0),
        totalAnswered: p.totalAnswered + 1,
        totalCorrect: p.totalCorrect + (correct ? 1 : 0)
      });
      var patch = { part5: part5, streak: touchStreak(d.streak) };
      var rec = core().PF.recordAnswer(d.part5CorrectIds, ctx.ids[p.currentIndex], correct);
      if (rec.changed) { patch.part5CorrectIds = rec.ids; }
      commitWrite(assign(d, patch), state.runtime, ["part5", "stats", "streak"]);
      return { ok: true, correct: correct };
    }

    /**
     * 下一題（AC-11-04）：須為本次作答結果或（v0.18）已答對鎖定檢視；開關關閉 → 依序前進，最後一題後進入本輪結算（UO-10），
     * 開關開啟 → 跳到其後第一題未答對，沒有則結算（UO-5）。題庫為空或 changed 為 false → 不寫入。計數不變。
     */
    function nextPart5() {
      ensureInit();
      var ctx = part5Ctx();
      if (ctx.ids.length === 0) { return; }
      var r = core().PF.next(state.data.part5, ctx.ids, ctx.set, ctx.only);
      if (!r.changed) { return; }
      commitWrite(assign(state.data, { part5: r.part5 }), state.runtime, ["part5"]);
    }

    /**
     * 重新開始（AC-11-07、UO-6）：本輪歸零、累計與答對紀錄保留；開關開啟時從第一題未答對開始。
     * 題庫為空 → 不動作；changed 為 false → 不寫入（沿用 v0.14：仍通知 "part5"）。
     */
    function restartPart5() {
      ensureInit();
      var ctx = part5Ctx();
      if (ctx.ids.length === 0) { return; }
      var r = core().PF.restart(state.data.part5, ctx.ids, ctx.set, ctx.only);
      if (r.changed) {
        commitWrite(assign(state.data, { part5: r.part5 }), state.runtime, ["part5"]);
      } else {
        commit(state.data, state.runtime, ["part5"]);
      }
    }

    /**
     * （v0.15，UO-1、UO-4、UO-8）切換「只練沒答對的題目」。
     * 非布林、題庫為空、與原值相同 → { changed: false }、不寫入；
     * 否則 part5flow.setOnly（關 → 開 做 UO-4 正規化；開 → 關 依切換前畫面分流，UO-8）→ 開關與 part5 同一次 commitWrite，tags ["part5"]。
     * 累計不變；本輪只有 UO-8 (a) 歸 0。
     * @param {boolean} on
     * @returns {{changed: boolean}}
     */
    function setPart5UnansweredOnly(on) {
      ensureInit();
      if (typeof on !== "boolean") { return { changed: false }; }
      var ctx = part5Ctx();
      if (ctx.ids.length === 0 || on === ctx.only) { return { changed: false }; }
      var d = state.data;
      var r = core().PF.setOnly({ part5: d.part5, ids: d.part5CorrectIds, only: ctx.only }, ctx.ids, on);
      if (!r.changed) { return { changed: false }; }
      commitWrite(assign(d, { part5: r.part5, part5UnansweredOnly: r.only }), state.runtime, ["part5"]);
      return { changed: true };
    }

    /**
     * （v0.15，CR-6；v0.18，CR-10）「清除答對紀錄，重新來過」確認「確定」後由 view 呼叫：
     * part5CorrectIds = []、第 1 題、本輪歸 0、累計不變、開關維持；一次 commitWrite，tags ["part5", "stats"]
     * （失敗依 WR-2，FB-60）。確認對話框由 view 顯示，「取消」時 view 不呼叫本 action（setItem 0 次）。
     * 題庫為空或 K = 0（含答對紀錄只含題庫不存在的 id）→ { ok: false }、不寫入；K ≥ 1 時不限畫面種類與開關。
     * @returns {{ok: boolean}}
     */
    function clearPart5CorrectIds() {
      ensureInit();
      var ctx = part5Ctx();
      if (ctx.ids.length === 0 || core().PF.countCorrect(ctx.ids, ctx.set) < 1) { return { ok: false }; }
      var d = state.data;
      var r = core().PF.clearAndRestart(d.part5);
      commitWrite(assign(d, { part5: r.part5, part5CorrectIds: r.ids }), state.runtime, ["part5", "stats"]);
      return { ok: true };
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
      // （v0.23）同一個 today 供打卡、學習紀錄與回饋前後快照使用（LF-1）
      var t = today();
      var s = touchStreak(d.streak, t);
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
      var lp = key !== "" ? learnPatch(d, key, t) : { patch: null, changed: false };
      if (lp.patch) {
        patch.todayLearned = lp.patch.todayLearned;
        patch.learnedHistory = lp.patch.learnedHistory;
        tags.push("learning");
      }
      if (tags.length === 0) { return; }
      var data = assign(d, patch);
      commitWrite(data, withFeedback(rt, feedbackBefore(rt, d, t), data, t, tags), tags);
    }

    /** 按「我知道了」（AC-08-13、V-ST-08） */
    function acknowledgeSttNotice() {
      ensureInit();
      var d = state.data;
      if (d.sttNoticeAcknowledged === true) { return; }
      commitWrite(assign(d, { sttNoticeAcknowledged: true }), state.runtime, ["speech"]);
    }

    /**
     * 設定語音辨識狀態（只在記憶體，setItem 0 次）。
     * （v0.20，FE-91）status = "preparing" 時 phase 必須是 STT_PREPARING_PHASES 之一，否則整次忽略；
     * 其他狀態 preparingPhase 一律為 null（忽略 phase）。狀態與子階段都沒變就不通知。
     * @param {"idle"|"notice"|"preparing"|"listening"} s
     * @param {"acquiringMic"|"awaitingAudioStart"|"fallbackWait"} [phase]
     */
    function setSttStatus(s, phase) {
      ensureInit();
      var rt = state.runtime;
      if (STT_STATUSES.indexOf(s) === -1) { return; }
      var p = null;
      if (s === "preparing") {
        if (STT_PREPARING_PHASES.indexOf(phase) === -1) { return; }
        p = phase;
      }
      var cur = rt.speech.preparingPhase === undefined ? null : rt.speech.preparingPhase;
      if (rt.speech.sttStatus === s && cur === p) { return; }
      commit(state.data, assign(rt, { speech: assign(rt.speech, { sttStatus: s, preparingPhase: p }) }), ["speech"]);
    }

    /** @param {object|null} r SttResult 或 null */
    function setSttResult(r) {
      ensureInit();
      var rt = state.runtime;
      var v = r && typeof r === "object" ? r : null;
      commit(state.data, assign(rt, { speech: assign(rt.speech, { lastResult: v }) }), ["speech"]);
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
      commit(state.data, assign(rt, { decoder: assign(rt.decoder, { sentenceIndex: idx }) }), ["decoder"]);
    }

    function toggleModifierDim() {
      ensureInit();
      var rt = state.runtime;
      commit(state.data, assign(rt, { decoder: assign(rt.decoder, { isModifierDimmed: !rt.decoder.isModifierDimmed }) }), ["decoder"]);
    }

    /** @param {"all"|"gap"|"aim"|"findings"|"limitations"} c */
    function setPhraseCategory(c) {
      ensureInit();
      var rt = state.runtime;
      if (PHRASE_CATEGORIES.indexOf(c) === -1 || rt.phrasebank.category === c) { return; }
      commit(state.data, assign(rt, { phrasebank: assign(rt.phrasebank, { category: c }) }), ["phrasebank"]);
    }

    /** @param {string} k 關鍵字原文 */
    function setPhraseKeyword(k) {
      ensureInit();
      var rt = state.runtime;
      var kw = typeof k === "string" ? k : "";
      if (rt.phrasebank.keyword === kw) { return; }
      commit(state.data, assign(rt, { phrasebank: assign(rt.phrasebank, { keyword: kw }) }), ["phrasebank"]);
    }

    /**
     * 由 router 呼叫；（v0.8）首次模式只接受 FIRST_RUN_TABS，其他值忽略（AC-25-01、AC-25-07、SP-4）。
     * （v0.9）HIDDEN_TAB_IDS（解碼器、句型庫）一律忽略，currentTab 永不為隱藏頁（HT-1、AC-20-04）；導向主控台由 router 負責。
     * （v0.19）維護 sitePageReturnTab（SP-3）；opts.resetReturn 為 true 時一律設 null（SP-6 的 #sources 入口），
     * 此時即使頁面相同也會更新。只改記憶體，setItem 0 次（SP-4）。
     * @param {string} tabId
     * @param {{resetReturn?: boolean}} [opts]
     */
    function setTab(tabId, opts) {
      ensureInit();
      var rt = state.runtime;
      if (TAB_IDS.indexOf(tabId) === -1) { return; }
      if (core().C.HIDDEN_TAB_IDS.indexOf(tabId) !== -1) { return; }
      if (rt.entryMode === "firstRun" && FIRST_RUN_TABS.indexOf(tabId) === -1) { return; }
      var ret = opts && opts.resetReturn === true ? null : nextReturnTab(rt.currentTab, tabId, rt.sitePageReturnTab);
      if (rt.currentTab === tabId && rt.sitePageReturnTab === ret) { return; }
      var next = assign(rt, { currentTab: tabId, sitePageReturnTab: ret });
      var tags = ["tab"];
      // （v0.23，FE-106）離開單字卡頁 → 學完回饋同一次提交設為 null（LF-3）；原值非 null 才加 tag
      if (rt.currentTab === "flashcards" && tabId !== "flashcards") {
        if (rt.flashcard.islandFeedback) { tags.push("islandFeedback"); }
        next = assign(next, { flashcard: assign(rt.flashcard, { islandFeedback: null }) });
      }
      commit(state.data, next, tags);
    }

    // ── actions：PWA（v0.11，FE-49）──

    /**
     * 更新 runtime.pwa（architecture §4.3 v0.7、契約 RuntimeState.pwa、PV-1、PV-7）。
     * 只接受 PWA_STATE_KEYS 的鍵；布林欄位只收 true／false，lastUpdateCheckAt 只收有限數或 null；
     * 其他鍵、型別錯誤、物件值（安裝事件、registration 等）一律忽略。
     * 有改變 → 以新物件取代 runtime.pwa 並通知 ["pwa"]；不寫入 localStorage（setItem 0 次，首次與一般模式相同）。
     * @param {object} patch
     * @returns {{changed: boolean}}
     */
    function setPwa(patch) {
      ensureInit();
      if (!patch || typeof patch !== "object") { return { changed: false }; }
      var P = pwaCore();
      var rt = state.runtime;
      var cur = rt.pwa && typeof rt.pwa === "object" ? rt.pwa : P.initialPwaState();
      var next = null;
      P.PWA_STATE_KEYS.forEach(function (k) {
        if (!hasOwn(patch, k)) { return; }
        var v = patch[k];
        var ok = k === "lastUpdateCheckAt"
          ? v === null || (typeof v === "number" && isFinite(v))
          : v === true || v === false;
        if (!ok || cur[k] === v) { return; }
        if (!next) { next = assign(cur, {}); }
        next[k] = v;
      });
      if (!next) { return { changed: false }; }
      commit(state.data, assign(rt, { pwa: next }), ["pwa"]);
      return { changed: true };
    }

    // ── actions：主控台介面狀態（v0.12，FE-55）──

    /**
     * 切換「資料備份」收合區塊（契約 RuntimeState.dashboard、README §11.4 DB-6、V-LAY-07；E-90、E-91）。
     * 只接受 true／false（其他值 → { changed: false }、不通知）；值相同不通知；
     * 不同 → 以新物件取代 runtime.dashboard 並通知 ["dashboard"]；不寫入 localStorage（setItem 0 次，首次與一般模式相同）。
     * 其他 action 一律以 assign 局部更新 runtime，因此切頁、匯入、startLearning、confirmApplyGoal 後本值保留。
     * @param {boolean} value
     * @returns {{changed: boolean}}
     */
    function setBackupExpanded(value) {
      ensureInit();
      if (value !== true && value !== false) { return { changed: false }; }
      var rt = state.runtime;
      var cur = !!(rt.dashboard && rt.dashboard.backupExpanded === true);
      if (cur === value) { return { changed: false }; }
      commit(state.data, assign(rt, { dashboard: { backupExpanded: value } }), ["dashboard"]);
      return { changed: true };
    }

    // ── actions：廣告版位（v0.19，FE-86）──

    /**
     * 設定啟動時的環境判定結果（AD-4，architecture §4.12）：本頁只生效 1 次，且只能由 ineligible 轉為 waiting。
     * 其他值忽略且不佔用這 1 次；不寫入 localStorage（setItem 0 次，首次與一般模式相同）。
     * @param {"waiting"|"ineligible"} status core/ad.initialStatus 的結果
     * @returns {{changed: boolean}}
     */
    function initAd(status) {
      ensureInit();
      if (adInitDone || (status !== "waiting" && status !== "ineligible")) { return { changed: false }; }
      adInitDone = true;
      var rt = state.runtime;
      if (status !== "waiting" || rt.ad.status !== "ineligible") { return { changed: false }; }
      commit(state.data, assign(rt, { ad: { status: status } }), ["ad"]);
      return { changed: true };
    }

    /**
     * 版位狀態事件（README §13.2 轉移表、AD-5）：經 core/ad.transition，有改變才通知 ["ad"]；setItem 0 次。
     * @param {"load"|"filled"|"collapse"|"dismiss"} event
     * @returns {{changed: boolean}}
     */
    function adEvent(event) {
      ensureInit();
      var rt = state.runtime;
      var next = core().AD.transition(rt.ad.status, event);
      if (next === rt.ad.status) { return { changed: false }; }
      commit(state.data, assign(rt, { ad: { status: next } }), ["ad"]);
      return { changed: true };
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
     * 步驟 9 套用到記憶體、重建單字集、（v0.15）依匯入的位置紀錄以 placeCard 定位（FP-6，單字卡模式、正面）；
     * localStorage 停用時只套用記憶體。（v0.15）importSteps 的 ctx 另帶 part5Ids（UO-4）。
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
          part5Ids: K.PF.bankIdsOf(ct.part5), // （v0.15）步驟 7 的 UO-4（IM-10 (4)）
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
          // （v0.15，FP-6）步驟 9：重建單字集後依匯入的紀錄解析目前卡片（單字卡模式、正面）；
          // 解析結果只改記憶體，步驟 8 已寫入備份值，下次寫入再寫出（RD-4）
          // （v0.23，FE-106）重設單字卡狀態時學完回饋一併設為 null（IS-4、LF-3）
          var base = assign(rt, {
            flashcard: { index: 0, isFlipped: false, mode: "card", quiz: null, islandFeedback: null },
            speech: assign(rt.speech, { lastResult: null })
          });
          var placed = placeCard(assign(base, { studySet: [] }), data, buildStudySet(data));
          var runtime = placed.runtime;
          if (placed.flashcardPosition !== data.flashcardPosition) {
            data = assign(data, { flashcardPosition: placed.flashcardPosition });
          }
          var tags = ["goal", "studySet", "flashcard", "quiz", "speech", "stats", "streak", "customVocab", "part5", "learning"];
          if (rt.flashcard.islandFeedback) { tags.push("islandFeedback"); }
          if (state.runtime.storageStatus !== "unavailable" && writeStatus !== "ok") {
            writeStatus = "ok";
            tags.push("storage");
          }
          if (rt.entryMode === "firstRun") {
            // 首次還原成功 → 進入主控台（FS-5），首次畫面上未生效的分數與卡片選擇捨棄（資料全以備份為準）
            runtime = assign(runtime, { entryMode: "main", currentTab: "dashboard", sitePageReturnTab: null });
            tags.push("entry");
          }
          // （v0.19）AD-10 (b)：資料已取代後判定；無學習紀錄 → 隱藏版位（首次還原同樣經此，SD-FB-82）
          if (!K.REINIT.hasLearningRecord(data, today())) {
            runtime = dismissAd(runtime, tags);
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
        setPart5UnansweredOnly: setPart5UnansweredOnly,
        clearPart5CorrectIds: clearPart5CorrectIds,
        recordSttScored: recordSttScored,
        acknowledgeSttNotice: acknowledgeSttNotice,
        setSttStatus: setSttStatus,
        setSttResult: setSttResult,
        setDecoderIndex: setDecoderIndex,
        toggleModifierDim: toggleModifierDim,
        setPhraseCategory: setPhraseCategory,
        setPhraseKeyword: setPhraseKeyword,
        setTab: setTab,
        setPwa: setPwa,
        setBackupExpanded: setBackupExpanded,
        initAd: initAd,
        adEvent: adEvent,
        exportBackup: exportBackup,
        importBackup: importBackup
      }
    };
  }

  return {
    createStore: createStore,
    browserStorage: browserStorage,
    detectSpeech: detectSpeech,
    isQuotaError: isQuotaError,
    islandSnapshot: islandSnapshot
  };
});
