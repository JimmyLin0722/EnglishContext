/*
 * ui/import-flow.js — 首次畫面「從備份還原」的共用匯入流程（FE-32）
 * 依據：architecture.md v0.4 §2（L4 共用模組）、§4.5（importFlow 介面）、§7.9；
 *       契約 ImportResult、ImportErrorCode、README §6.2（步驟 1～9）、IM-3、IM-5、IM-6、§5.5 FS-5～FS-7
 * 涵蓋：US-25；AC-25-10、AC-25-11（行為沿用 AC-24-03～AC-24-11）
 *
 * EMT.ui.importFlow.start() → Promise<ImportResult | null>
 *   建立隱藏 <input type="file" accept=".json,application/json"> 並開啟檔案選擇 →
 *   FileReader.readAsText → store.actions.importBackup(text, confirmFn)；
 *   confirmFn 以 ui.dialog.confirm 顯示「匯入將覆蓋目前所有進度」（對話框不可用時視為取消）。
 *   依結果以 toast 提示（文字由 messageOf 產生；cancelled 不提示）。選檔取消回 null（不提示）。
 *   成功後的切頁不在此處：store 以 "entry" tag 通知，由 router 切到主控台（FS-5）。
 * messageOf(result) → { text, kind } | null（純函式）
 *   文字與 views/dashboard.js 的 importMessage 完全相同（first-run.test.js 逐一比對，兩處不得分歧）。
 *   主控台本版不改用此模組（SD-FB-14，降低回歸風險），故文字在此另列一份。
 *
 * 規則：
 * - 讀檔失敗、importBackup 拋例外或 Promise 被拒絕 → 視為 format（IM-5）。
 * - 必要模組（store、core.dom）不存在 → 丟出含模組名稱的 Error（LD-3，不當成檔案格式錯誤）。
 * - 載入時只做登錄，不操作 DOM、不讀其他模組成員（LD-2）。
 * - 所有文字以 textContent 呈現（toast、dialog 皆如此，C-7）。
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === "object" && module.exports) {
    // Node：匯出純函式供測試（start 需要瀏覽器環境，測試以 vm 沙箱載入）
    module.exports = api;
  } else {
    root.EMT = root.EMT || {};
    root.EMT.ui = root.EMT.ui || {};
    root.EMT.ui.importFlow = api;
  }
})(typeof self !== "undefined" ? self : this, function (root) {
  "use strict";

  // ── 取得 constants：Node 下 require，瀏覽器下讀 EMT.core.constants（呼叫時才取用，LD-2）──
  function constants() {
    if (typeof require === "function" && typeof module === "object") {
      return require("../core/constants.js");
    }
    var c = root.EMT && root.EMT.core && root.EMT.core.constants;
    if (!c) throw new Error("[EMT.ui.importFlow] 缺少模組：EMT.core.constants");
    return c;
  }

  // ── 畫面文字（與 views/dashboard.js TEXT 的匯入相關文字逐字相同；AC 引號內文案）──
  var TEXT = {
    importDialogTitle: "匯入備份",
    importConfirm: "匯入將覆蓋目前所有進度",          // AC-24-04
    importOk: "匯入",
    importCancel: "取消",
    importFormat: "備份檔格式錯誤，未匯入",            // AC-24-05
    importVersion: "備份檔版本不相容",                  // AC-24-06
    importQuota: "儲存空間不足，未匯入",                // AC-24-09
    importWriteFailed: "儲存失敗，未匯入",              // IM-6（FB-24）
    versionNone: "無"                                   // IM-3
  };

  /** 略過筆數：非正數或非有限數 → 0 */
  function safeCount(v) {
    return typeof v === "number" && isFinite(v) && v > 0 ? Math.floor(v) : 0;
  }

  /**
   * 匯入結果 → 提示文字（AC-24-04～AC-24-09、AC-25-11）。cancelled 不提示 → 回 null。
   * @param {object} result ImportResult
   * @returns {{ text: string, kind: "success"|"error" } | null}
   */
  function messageOf(result) {
    var r = result && typeof result === "object" ? result : { ok: false, error: "format" };
    if (r.ok === true) {
      return { text: "已匯入，略過 " + safeCount(r.skipped) + " 筆", kind: "success" };
    }
    switch (r.error) {
      case "cancelled":
        return null;
      case "version": {
        // IM-3：有限數字以 String(值) 顯示，其餘顯示「無」
        var fv = r.fileVersion;
        var fileText = typeof fv === "number" && isFinite(fv) ? String(fv) : TEXT.versionNone;
        var supported = constants().SUPPORTED_SCHEMA_VERSIONS.join("、");
        return {
          text: TEXT.importVersion + "（檔案版本：" + fileText + "；支援版本：" + supported + "）",
          kind: "error"
        };
      }
      case "quota":
        return { text: TEXT.importQuota, kind: "error" };
      case "write_failed":
        return { text: TEXT.importWriteFailed, kind: "error" };
      default:
        // format 與任何未預期結果（IM-5）
        return { text: TEXT.importFormat, kind: "error" };
    }
  }

  // ── 瀏覽器流程 ──

  var FORMAT = { ok: false, error: "format" };

  // 進行中的流程：{ stage: "choosing"|"importing", promise, finish(value), cleanup() }
  var active = null;

  /** 取用 EMT 成員；不存在時丟出含模組名稱的 Error（LD-3） */
  function need(name, value) {
    if (!value) throw new Error("[EMT.ui.importFlow] 缺少模組：" + name);
    return value;
  }

  /** 顯示 toast（toast 模組不存在時略過，不影響匯入結果） */
  function toast(msg) {
    var EMT = root.EMT || {};
    var t = EMT.ui && EMT.ui.toast;
    if (msg && t && typeof t.show === "function") t.show(msg.text, { kind: msg.kind });
  }

  /** 確認對話框（AC-24-04）；對話框不可用時視為取消 */
  function confirmImport() {
    var EMT = root.EMT || {};
    var dlg = EMT.ui && EMT.ui.dialog;
    if (!dlg || typeof dlg.confirm !== "function") return false;
    return dlg.confirm({
      title: TEXT.importDialogTitle,
      message: TEXT.importConfirm,
      okText: TEXT.importOk,
      cancelText: TEXT.importCancel
    });
  }

  /**
   * 開始「從備份還原」流程。
   * 檔案選擇視窗開啟中再次呼叫：前一次以 null 結束（部分瀏覽器不發出 cancel 事件，避免卡住）；
   * 已在讀檔或匯入中再次呼叫：回傳同一個 Promise，不重複匯入。
   * @returns {Promise<object|null>} ImportResult；選檔取消回 null
   */
  function start() {
    var EMT = root.EMT || {};
    var store = need("EMT.store", EMT.store);
    var D = need("EMT.core.dom", EMT.core && EMT.core.dom);
    need("EMT.store.actions.importBackup", store.actions && typeof store.actions.importBackup === "function");
    var doc = root.document;

    if (active) {
      if (active.stage === "importing") return active.promise;
      active.finish(null);
    }

    var flow = { stage: "choosing" };
    var input = D.el("input", {
      className: "visually-hidden",
      attrs: { type: "file", accept: ".json,application/json", tabindex: "-1", "aria-hidden": "true" }
    });

    flow.promise = new Promise(function (resolve) {
      var done = false;
      flow.finish = function (value) {
        if (done) return;
        done = true;
        if (active === flow) active = null;
        if (input.parentNode) input.parentNode.removeChild(input);
        resolve(value);
      };
    });

    /** 匯入結束：提示並結束流程 */
    function finishImport(result) {
      toast(messageOf(result));
      flow.finish(result);
    }

    /** 讀入檔案文字後呼叫 store 匯入（契約 §6.2；IM-5：任何例外皆為 format） */
    function importText(text) {
      var p;
      try {
        p = Promise.resolve(store.actions.importBackup(text, confirmImport));
      } catch (e) {
        p = Promise.resolve(FORMAT);
      }
      p.then(function (r) {
        finishImport(r && typeof r === "object" ? r : FORMAT);
      }, function () {
        finishImport(FORMAT);
      });
    }

    /** 選檔後讀取（AC-24-03、AC-24-05） */
    function onChange() {
      var file = input.files && input.files[0];
      if (!file) {
        flow.finish(null);
        return;
      }
      flow.stage = "importing";
      try {
        var reader = new root.FileReader();
        reader.addEventListener("load", function () {
          importText(typeof reader.result === "string" ? reader.result : "");
        });
        reader.addEventListener("error", function () {
          finishImport(FORMAT);
        });
        reader.readAsText(file);
      } catch (e) {
        finishImport(FORMAT);
      }
    }

    input.addEventListener("change", onChange);
    // 選檔視窗取消（支援 cancel 事件的瀏覽器）：不提示，回 null
    input.addEventListener("cancel", function () {
      if (flow.stage === "choosing") flow.finish(null);
    });

    active = flow;
    // 掛到 body 再開啟（部分瀏覽器對未掛載的 input 不開啟選檔視窗）；結束時移除
    if (doc && doc.body) doc.body.appendChild(input);
    try {
      input.click();
    } catch (e) {
      flow.finish(null);
    }
    return flow.promise;
  }

  return {
    TEXT: TEXT,
    messageOf: messageOf,
    start: start
  };
});
