/*
 * EMT.core.ad — 廣告設定與純函式（FE-83）
 * 依據：architecture.md v0.14 §4.12「EMT.core.ad」、§5.9 B-25、§7.25.3；
 *       契約 data-schema.ts §17、README §13.2 AD-1～AD-6、轉移表、§13.7 V-AD-01、V-AD-02
 * 涵蓋：US-50、AC-50-01、AC-50-02、AC-50-05、E-138、E-139、E-147
 *
 * - 常數與 data-schema.ts §17 逐字相同；全部深度凍結。
 * - 只有環境判定、載入時機判定與狀態轉移：不碰 DOM、計時器、網路、學習資料，不寫入任何儲存（AD-11）。
 *   standalone、online、「開始今日學習」是否可點擊都由呼叫端以參數傳入。
 * - L1 模組：factory 無任何依賴，載入時不取用其他模組（LD-1）。
 * - 本檔同時由 tools/build.mjs 以 createRequire 讀取：Node 下 module.exports 即同一個 api 物件。
 * - 廣告單元 ID 的唯一宣告是下方 AD_SLOT_ID 那一行；取得單元 ID 後只改該行的值（AC-50-05）。
 *   建置的測試注入（B-25）也比對該行，所以同樣的宣告寫法在本檔只能出現 1 次，註解也不得出現。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.EMT = root.EMT || {};
    root.EMT.core = root.EMT.core || {};
    root.EMT.core.ad = api;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // 深層凍結：物件與其中所有子物件、陣列都不可再修改
  function deepFreeze(obj) {
    Object.getOwnPropertyNames(obj).forEach(function (name) {
      var value = obj[name];
      if (value && typeof value === "object") {
        deepFreeze(value);
      }
    });
    return Object.freeze(obj);
  }

  // ── data-schema.ts §17 常數（逐字複製，不得自行修改）──

  // 廣告單元 ID（AD-1）：未取得前不得以假值代替
  var AD_SLOT_ID = null;

  /** 廣告設定值（唯一來源，隨程式打包；AD-1） */
  var AD_CONFIG = {
    publisherId: "ca-pub-4051803210893105",
    adSlotId: AD_SLOT_ID
  };

  /** 正式環境主機名稱（恰等於比對；不含 www，AD-3） */
  var AD_PRODUCTION_HOSTNAME = "jimmyfantasyworld.com";

  /** 發布商 ID 格式（AD-2） */
  var AD_PUBLISHER_ID_PATTERN = "^ca-pub-[0-9]{16}$";

  /** 廣告單元 ID 格式（AD-2、E-139） */
  var AD_SLOT_ID_PATTERN = "^[0-9]{6,20}$";

  /** 廣告腳本網址（只可在 AD-6 全部成立時由程式加入；第一階段不得產生此請求） */
  var AD_SCRIPT_URL = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4051803210893105";

  /** 廣告腳本無結果的等待上限（毫秒；AD-8、AC-51-01 (e)） */
  var AD_LOAD_TIMEOUT_MS = 10000;

  /** 廣告相關畫面文字（AC-52-04） */
  var AD_TEXTS = {
    label: "廣告"
  };

  var PUBLISHER_RE = new RegExp(AD_PUBLISHER_ID_PATTERN);
  var SLOT_RE = new RegExp(AD_SLOT_ID_PATTERN);

  /** 版位狀態轉移表（README §13.2、AD-5）；未列出的組合維持原狀態，終態不回頭 */
  var TRANSITIONS = {
    waiting: { load: "loading", collapse: "collapsed", dismiss: "dismissed" },
    loading: { filled: "filled", collapse: "collapsed", dismiss: "dismissed" },
    filled: { dismiss: "dismissed" }
  };

  /**
   * AD-2：單元 ID 已設定 = adSlotId 是符合格式的字串，且 publisherId 是符合格式的字串。
   * null、空字串、佔位文字、格式不完整、非字串一律視為未設定（E-139）。
   * @param {*} config AdConfig
   * @returns {boolean}
   */
  function isSlotConfigured(config) {
    if (!config || typeof config !== "object") {
      return false;
    }
    var slot = config.adSlotId;
    var publisher = config.publisherId;
    return typeof slot === "string" && SLOT_RE.test(slot) &&
      typeof publisher === "string" && PUBLISHER_RE.test(publisher);
  }

  /**
   * AD-3：正式環境 = protocol 恰為 https: 且 hostname 恰為正式主機（不含 www，不做子字串比對）。
   * @param {*} loc 具 protocol、hostname 的物件（通常為 location）
   * @returns {boolean}
   */
  function isProductionLocation(loc) {
    return !!loc && loc.protocol === "https:" && loc.hostname === AD_PRODUCTION_HOSTNAME;
  }

  /**
   * AD-4：啟動時判定一次，整段 try，例外視為不成立。
   * 只有單元 ID 已設定、正式環境、明確不是獨立視窗（isStandalone === false）才回傳 "waiting"。
   * @param {{location: *, config: *, isStandalone: boolean}} opts isStandalone 由呼叫端依 IN-2 算好後傳入
   * @returns {"waiting"|"ineligible"}
   */
  function initialStatus(opts) {
    try {
      var eligible = isSlotConfigured(opts.config) && isProductionLocation(opts.location) && opts.isStandalone === false;
      return eligible ? "waiting" : "ineligible";
    } catch (e) {
      return "ineligible";
    }
  }

  /**
   * AD-6：載入時機判定（每次進入主控台與主控台資料更新時由呼叫端評估）。
   * status = "waiting"、entryMode = "main"、currentTab = "dashboard"、hasLearningRecord 皆成立時：
   * online 不是 true → "collapse"；否則 startReady 為 true → "load"。其餘 → null（不動作）。
   * @param {{status: *, entryMode: *, currentTab: *, hasLearningRecord: *, online: *, startReady: *}} ctx
   *   hasLearningRecord：reinit.hasLearningRecord 的結果；online：navigator.onLine；
   *   startReady：「開始今日學習」按鈕存在且未 disabled
   * @returns {"load"|"collapse"|null}
   */
  function decide(ctx) {
    if (!ctx || typeof ctx !== "object") {
      return null;
    }
    if (ctx.status !== "waiting" || ctx.entryMode !== "main" || ctx.currentTab !== "dashboard" || ctx.hasLearningRecord !== true) {
      return null;
    }
    if (ctx.online !== true) {
      return "collapse";
    }
    return ctx.startReady === true ? "load" : null;
  }

  /**
   * 狀態轉移（README §13.2 轉移表、AD-5）。未列出的組合回傳原狀態。
   * @param {*} status AdSlotStatus
   * @param {*} event "load" | "filled" | "collapse" | "dismiss"
   * @returns {*} 下一狀態
   */
  function transition(status, event) {
    if (typeof status !== "string" || typeof event !== "string") {
      return status;
    }
    if (!Object.prototype.hasOwnProperty.call(TRANSITIONS, status)) {
      return status;
    }
    var row = TRANSITIONS[status];
    return Object.prototype.hasOwnProperty.call(row, event) ? row[event] : status;
  }

  /**
   * AD-8：廣告框 data-ad-status 的值 → transition 事件。尚無結果或其他值 → null。
   * @param {*} value
   * @returns {"filled"|"collapse"|null}
   */
  function resultOfAdStatus(value) {
    if (value === "filled") {
      return "filled";
    }
    return value === "unfilled" ? "collapse" : null;
  }

  return deepFreeze({
    AD_CONFIG: AD_CONFIG,
    AD_PRODUCTION_HOSTNAME: AD_PRODUCTION_HOSTNAME,
    AD_PUBLISHER_ID_PATTERN: AD_PUBLISHER_ID_PATTERN,
    AD_SLOT_ID_PATTERN: AD_SLOT_ID_PATTERN,
    AD_SCRIPT_URL: AD_SCRIPT_URL,
    AD_LOAD_TIMEOUT_MS: AD_LOAD_TIMEOUT_MS,
    AD_TEXTS: AD_TEXTS,
    isSlotConfigured: isSlotConfigured,
    isProductionLocation: isProductionLocation,
    initialStatus: initialStatus,
    decide: decide,
    transition: transition,
    resultOfAdStatus: resultOfAdStatus
  });
});
