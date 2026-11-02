/*
 * services/haptics.js — 答題震動回饋（FE-29）
 * 依據：architecture.md v0.4 §4.5（haptics 介面）、§7.11（A-3：震動不屬於動畫）、§7.12（VIBRATE_CORRECT／VIBRATE_WRONG）
 * 涵蓋：US-29；AC-29-02、AC-29-03、AC-31-03
 *
 * 提供 EMT.services.haptics：
 * - vibrate(kind) → boolean：kind 為 "correct"／"wrong"；navigator.vibrate 為函式時，
 *   以 interaction.vibratePattern(kind) 呼叫「一次」並回傳 true。
 *   API 不存在、呼叫時拋例外、回傳 false、或 kind 不合法 → 靜默回 false（不 toast、不 console.error，AC-29-03）。
 * - 減少動態設定不影響震動（AC-31-03），本檔不查詢 prefers-reduced-motion。
 * - 全專案只有本檔呼叫 navigator.vibrate；呼叫端只在「本次點擊造成作答」時呼叫（§7.11 顏色與鎖定段）。
 *
 * 載入時只做登錄（LD-2）；interaction 模組在呼叫時才取用。
 * Node 下匯出同一個 API 供測試（vibrate 第 2 個參數可注入替身 navigator）。
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.EMT = root.EMT || {};
    root.EMT.services = root.EMT.services || {};
    root.EMT.services.haptics = api;
  }
})(typeof self !== "undefined" ? self : this, function (root) {
  "use strict";

  /** 取得 interaction 模組（Node 下 require，瀏覽器下讀 EMT.core.interaction）；不存在視為組裝錯誤（LD-3） */
  function interaction() {
    var ia = null;
    if (typeof require === "function" && typeof module === "object") {
      ia = require("../core/interaction.js");
    } else if (root.EMT && root.EMT.core) {
      ia = root.EMT.core.interaction;
    }
    if (!ia || typeof ia.vibratePattern !== "function") {
      throw new Error("[EMT.services.haptics] 缺少模組 EMT.core.interaction");
    }
    return ia;
  }

  /** 取得全域 navigator（不存在回 undefined） */
  function globalNavigator() {
    return typeof navigator !== "undefined" ? navigator : undefined;
  }

  /**
   * 依作答結果震動一次。
   * @param {"correct"|"wrong"} kind
   * @param {object} [nav] 測試用：替代的 navigator 物件；省略時用全域 navigator
   * @returns {boolean} 已送出震動 true；不支援或失敗 false
   */
  function vibrate(kind, nav) {
    var pattern = interaction().vibratePattern(kind);
    if (pattern === null || pattern === undefined) return false;
    var n = arguments.length >= 2 ? nav : globalNavigator();
    try {
      if (!n || typeof n.vibrate !== "function") return false;
      // 以 navigator 為 this 呼叫（部分瀏覽器要求）
      return n.vibrate(pattern) !== false;
    } catch (e) {
      // 不支援或被瀏覽器拒絕：靜默（AC-29-03）
      return false;
    }
  }

  return { vibrate: vibrate };
});
