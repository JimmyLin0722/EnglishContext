/*
 * EMT.services.ad — 廣告環境判定、腳本載入與結果監看（FE-88）
 * 依據：architecture.md v0.14 §7.25.3「分工」「啟動」「載入流程」「隱私」；契約 README §13.2 AD-4、AD-7、AD-8、AD-11、AD-13、V-AD-02、V-AD-04
 * 涵蓋：US-50、US-51、AC-50-01、AC-50-02、AC-50-07、AC-50-08、AC-50-10、AC-51-01、AC-51-04
 *
 * EMT.services.ad.start({ initAd, adEvent, getStatus })
 * - 啟動時判定一次（AD-4）。不成立 → 只回傳 "ineligible"，不讀 AD_SCRIPT_URL、不碰廣告全域變數、不建立任何節點。
 * - 成立 → initAd("waiting")，並設 html[data-ad-env]（SD-FB-80 的 scrollbar-gutter 依此生效）。
 *
 * EMT.services.ad.load(insEl)（由 ui/ad-slot.js 在狀態已轉 loading 後呼叫；本頁至多執行 1 次）
 * - 順序：開始監看與計時 → 加入腳本 → push({})。push 參數恆為空物件（AD-7、AD-11）。
 * - 結果：只判定 1 次，先確認狀態仍是 loading；結束時 disconnect、clearTimeout。不重試（AD-8）。
 *
 * 隱私（AD-11）：本檔不取用 store，只經呼叫端傳入的 3 個函式得知版位狀態與回報事件，拿不到學習資料。
 * 全部靜默（AD-8）：不提示使用者、不輸出錯誤訊息到主控台；任何例外都視為失敗並收合版位。
 * 不自建同意視窗、不讀取或保存同意狀態（AD-13）；不寫入任何瀏覽器儲存（DS-56）。
 * 載入時只做登錄，不讀 document、不取用其他模組（LD-2）；Node 下 module.exports 供測試。
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.EMT = root.EMT || {};
    root.EMT.services = root.EMT.services || {};
    root.EMT.services.ad = api;
  }
})(typeof self !== "undefined" ? self : this, function (root) {
  "use strict";

  /** 廣告框上回報結果的屬性（AD-8） */
  var STATUS_ATTR = "data-ad-status";

  /**
   * 呼叫時才取用 core 模組（LD-2）：Node 以 require，瀏覽器以 EMT.core.<name>。
   * @param {"ad"|"pwa"} name
   * @returns {object}
   */
  function coreOf(name) {
    if (typeof module === "object" && module.exports && typeof require === "function") {
      return name === "ad" ? require("../core/ad.js") : require("../core/pwa.js");
    }
    return root.EMT.core[name];
  }

  /**
   * 是否為獨立視窗（判定同 IN-2，不依賴 pwa.eligible）。
   * core/pwa.isStandalone 會把 matchMedia 不可用或拋例外當成「不是獨立視窗」；對廣告而言那是「無法確認」，
   * AD-4 要求例外視為不成立，所以此時回傳 null，讓 initialStatus 判為 ineligible。
   * @param {object} g 全域物件
   * @param {object} pwaCore core/pwa.js
   * @returns {boolean|null} true、false，或無法確認時 null
   */
  function standaloneOf(g, pwaCore) {
    var known = typeof g.matchMedia === "function";
    var result = pwaCore.isStandalone({
      matchMedia: function (query) {
        try {
          return g.matchMedia(query);
        } catch (e) {
          known = false;
          throw e;
        }
      },
      navigator: g.navigator
    });
    if (result === true) { return true; }
    return known ? false : null;
  }

  /**
   * 建立服務實例（測試注入替身；預設實例使用瀏覽器全域）。
   * @param {object} g 全域物件（location、navigator、matchMedia、document、MutationObserver、計時器、adsbygoogle）
   * @param {{ad?: object, pwa?: object}} [deps] 測試可替換 core 模組
   * @returns {{start: function, load: function}}
   */
  function create(g, deps) {
    var d = deps || {};
    var callbacks = null;
    var started = false;
    var startedStatus = "ineligible";
    var loadCalled = false;

    function adCore() {
      return d.ad || coreOf("ad");
    }

    function pwaCore() {
      return d.pwa || coreOf("pwa");
    }

    /**
     * AD-4：以 getter 延後讀取，前面的條件不成立時不碰後面的環境物件；例外由 initialStatus 視為不成立。
     * @returns {"waiting"|"ineligible"}
     */
    function computeStatus() {
      return adCore().initialStatus({
        config: adCore().AD_CONFIG,
        get location() { return g.location; },
        get isStandalone() { return standaloneOf(g, pwaCore()); }
      });
    }

    /**
     * 啟動判定（只生效 1 次）。不拋例外。
     * @param {{initAd: function(string): void, adEvent: function(string): void, getStatus: function(): string}} opts
     * @returns {"waiting"|"ineligible"}
     */
    function start(opts) {
      if (started) { return startedStatus; }
      started = true;
      try {
        if (computeStatus() !== "waiting") { return startedStatus; }
        callbacks = opts;
        opts.initAd("waiting");
        g.document.documentElement.setAttribute("data-ad-env", "1");
        startedStatus = "waiting";
      } catch (e) {
        /* 判定或初始化失敗：視為環境不成立（AD-4），靜默 */
      }
      return startedStatus;
    }

    /** 目前版位狀態；讀取失敗回 null（任何結果都會被忽略） */
    function statusNow() {
      try {
        return callbacks.getStatus();
      } catch (e) {
        return null;
      }
    }

    /** 回報事件（靜默） */
    function report(event) {
      try {
        callbacks.adEvent(event);
      } catch (e) {
        /* 靜默（AD-8） */
      }
    }

    /**
     * 加入腳本並要求廣告（AD-7、AD-8）。
     * @param {Element} ins 由 ui/ad-slot.js 建立的廣告框
     * @returns {boolean} 本次呼叫是否已加入腳本並完成 push
     */
    function load(ins) {
      if (loadCalled || startedStatus !== "waiting") { return false; }
      loadCalled = true;

      var settled = false;
      var timer = null;
      var observer = null;

      /** 結束監看並回報結果；只生效 1 次，狀態已離開 loading（例如已 dismissed）時不回報 */
      function settle(event) {
        if (settled) { return; }
        settled = true;
        if (observer) {
          try { observer.disconnect(); } catch (e) { /* 靜默 */ }
        }
        if (timer !== null) { g.clearTimeout(timer); }
        if (statusNow() === "loading") { report(event); }
      }

      if (!ins || statusNow() !== "loading") {
        settle("collapse");
        return false;
      }

      var ad = adCore();
      try {
        // 1. 開始監看：MutationObserver 不存在時只剩逾時，結果仍收斂到 collapsed
        if (typeof g.MutationObserver === "function") {
          observer = new g.MutationObserver(function () {
            var result = ad.resultOfAdStatus(ins.getAttribute(STATUS_ATTR));
            if (result) { settle(result); }
          });
          observer.observe(ins, { attributes: true, attributeFilter: [STATUS_ATTR] });
        }
        timer = g.setTimeout(function () { settle("collapse"); }, ad.AD_LOAD_TIMEOUT_MS);

        // 2. 加入腳本（本頁至多 1 次，由 loadCalled 保證）
        var script = g.document.createElement("script");
        script.async = true;
        script.crossOrigin = "anonymous";
        script.addEventListener("error", function () { settle("collapse"); });
        script.src = ad.AD_SCRIPT_URL;
        g.document.head.appendChild(script);

        // 3. 要求廣告：參數恆為空物件（AD-7、AD-11）
        g.adsbygoogle = g.adsbygoogle || [];
        g.adsbygoogle.push({});
      } catch (e) {
        settle("collapse");
        return false;
      }
      return true;
    }

    return { start: start, load: load };
  }

  // 預設實例：建立時只設定區域變數，不呼叫任何瀏覽器 API（LD-2）
  var instance = create(root);

  return {
    start: instance.start,
    load: instance.load,
    create: create
  };
});
