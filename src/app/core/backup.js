/*
 * EMT.core.backup — 備份匯出物件與匯入步驟（FE-06；architecture.md §7.5；FE-22 v0.8 升版 §7.8；
 *   FE-73 v0.15 升版 §4.10、§7.21.1；契約 README §6.1、§6.2、§6.3、IM-1～IM-10、MG-1～MG-8、V-IMP-01）
 * - buildBackup：組成 BackupFile 與檔名（AC-24-01、AC-24-02、AC-47-02）；schemaVersion 3，data 12 欄
 *   （persist.ensureWritable），並以匯出當天正規化學習紀錄
 * - importSteps：§6.2 步驟 1～5 與 7 的純函式（AC-24-05、AC-24-06、AC-24-08、AC-24-10、AC-24-11、AC-47-03、AC-47-06）；
 *   支援 schemaVersion 1、2（步驟 4 逐版遷移 data）與 3；
 *   步驟 6（確認對話框）、8（一次 setItem）、9（套用、重建單字集、提示）由 store 處理。
 * 本模組為純函式，不碰 DOM、不讀寫 localStorage，不修改任何傳入的參數。
 * Node 以 require 載入，瀏覽器掛到 EMT.core.backup（依賴 constants、wordkey、persist、learning，於呼叫時才取用，與載入順序無關）。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.EMT = root.EMT || {};
    root.EMT.core = root.EMT.core || {};
    root.EMT.core.backup = api;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // 取得依賴模組：Node 下 require，瀏覽器下讀 EMT.core.*
  // 瀏覽器建置依檔名排序載入 core（backup.js 早於 persist.js），因此不可在載入當下讀取，
  // 一律在函式被呼叫時才取（R6-1）。
  var isNode = typeof require === "function" && typeof module === "object";
  var g = typeof self !== "undefined" ? self : this;
  var NODE_PATH = { constants: "./constants.js", wordkey: "./wordkey.js", persist: "./persist.js", learning: "./learning.js" };

  /** 用到時才取 core 依賴模組；取不到時拋出明確錯誤 */
  function dep(name) {
    if (isNode) {
      return require(NODE_PATH[name]);
    }
    var mod = g && g.EMT && g.EMT.core && g.EMT.core[name];
    if (!mod) {
      throw new Error("[EMT.core.backup] 找不到 EMT.core." + name);
    }
    return mod;
  }
  function C() { return dep("constants"); }
  function WK() { return dep("wordkey"); }
  function P() { return dep("persist"); }
  function L() { return dep("learning"); }

  var BACKUP_KEYS = ["format", "schemaVersion", "exportedAt", "contentDataVersion", "data"];
  var FILENAME_PREFIX = "english-master-track-backup-";

  function hasOwn(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

  function pad2(n) {
    return (n < 10 ? "0" : "") + n;
  }

  /** 本地日期 YYYYMMDD（用 getFullYear／getMonth／getDate，不用 toISOString） */
  function localYmd(d) {
    return String(d.getFullYear()) + pad2(d.getMonth() + 1) + pad2(d.getDate());
  }

  /**
   * 只取 PersistedData 的欄位（v0.15 起 12 欄）並深拷貝，確保匯出不夾帶執行期狀態或內建內容（AC-24-02）。
   */
  function pickPersisted(data) {
    var out = {};
    P().DATA_KEYS.forEach(function (k) {
      if (data && hasOwn(data, k)) {
        out[k] = P().clone(data[k]);
      }
    });
    return out;
  }

  /**
   * 匯出（README §6.1）。
   * @param {object} data 記憶體中的 PersistedData（localStorage 停用時仍可匯出）
   * @param {string} contentDataVersion VOCAB_MANIFEST.dataVersion；非字串時填 ""
   * @param {Date} [now] 匯出時間，預設現在；其本地日期即 V-ST-09～V-ST-11 的 today
   * @returns {{filename: string, json: string}} filename = english-master-track-backup-YYYYMMDD.json（本地日期）
   */
  function buildBackup(data, contentDataVersion, now) {
    var t = now instanceof Date && !isNaN(now.getTime()) ? now : new Date();
    // v0.15：補齊並正規化 3 個新欄位，data 一律 12 欄（$defs/PersistedDataWritten）
    var out = P().ensureWritable(pickPersisted(data));
    // v0.8：以匯出當天正規化 todayLearned、learnedHistory，data 須符合 $defs/PersistedDataWritten（§6.1）
    var learned = L().normalizeLearning(out, P().localDate(t));
    out.todayLearned = learned.todayLearned;
    out.learnedHistory = learned.learnedHistory;
    var file = {
      format: C().BACKUP_FORMAT_ID,
      schemaVersion: C().CURRENT_SCHEMA_VERSION,
      exportedAt: t.toISOString(),
      contentDataVersion: typeof contentDataVersion === "string" ? contentDataVersion : "",
      data: pickPersisted(out) // 依 DATA_KEYS 的契約順序輸出 12 欄
    };
    return {
      filename: FILENAME_PREFIX + localYmd(t) + ".json",
      json: JSON.stringify(file, null, 2)
    };
  }

  /** 把 ctx.builtinKeys（Set／Map／陣列／含 has 的物件）轉成判斷函式；缺漏時視為空集合（C-6） */
  function toHas(src) {
    if (src && typeof src.has === "function") {
      return function (k) { return !!src.has(k); };
    }
    if (Array.isArray(src)) {
      var set = new Set(src);
      return function (k) { return set.has(k); };
    }
    return function () { return false; };
  }

  /** 預設 id 產生器：契約建議 "c_" + Date.now().toString(36) + "_" + 4 位亂數 */
  function defaultNewId(rand) {
    var r = typeof rand === "function" ? rand : Math.random;
    var s = "";
    for (var i = 0; i < 4; i++) {
      s += "abcdefghijklmnopqrstuvwxyz0123456789".charAt(Math.floor(r() * 36) % 36);
    }
    return "c_" + Date.now().toString(36) + "_" + s;
  }

  function fail(error, fileVersion) {
    var r = { ok: false, error: error };
    if (error === "version") {
      r.fileVersion = fileVersion;
    }
    return r;
  }

  /**
   * 匯入步驟 1～5、7（README §6.2；V-IMP-01）。不拋例外、不修改任何傳入參數。
   * @param {string} text 備份檔文字內容
   * @param {{builtinKeys?: Set<string>|Map<string,*>|string[], part5Length?: number,
   *          newId?: function(): string, random?: function(): number, today?: string,
   *          part5Ids?: Array<string|null>}} [ctx]
   *   builtinKeys：全部內建字庫的 wordKey 集合；part5Length：模擬測驗題庫長度（V-ST-05）；
   *   newId：id 重複時的產生器（測試用，可省略）；random：預設產生器的亂數來源；
   *   today：匯入當天的本地日期 YYYY-MM-DD（步驟 7 的 V-ST-09～V-ST-11，IM-8 (2)），缺省或不合法時以本地今天計；
   *   part5Ids（v0.15，選填）：題庫 id 陣列（part5flow.bankIdsOf 結果），有傳時步驟 7 依 UO-4 正規化目前題目（IM-10 (4)）。
   * @returns {{ok: false, error: "format"} | {ok: false, error: "version", fileVersion: number|null}
   *          | {ok: true, data: object, skipped: number}}
   */
  function importSteps(text, ctx) {
    // 依賴缺漏屬程式組裝錯誤，先在 try 之外取用，避免被誤判為檔案格式錯誤（R6-1、LD-3）
    C(); WK(); P(); L();
    try {
      return runImport(text, ctx || {});
    } catch (e) {
      return fail("format");
    }
  }

  function runImport(text, ctx) {
    // 步驟 1：空檔或 JSON.parse 失敗 → format
    if (typeof text !== "string") { return fail("format"); }
    var body = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
    if (body.trim() === "") { return fail("format"); }
    var file;
    try {
      file = JSON.parse(body);
    } catch (e) {
      return fail("format");
    }

    // 步驟 2：頂層不是物件，或 format 不符 → format
    if (!P().isPlainObject(file) || file.format !== C().BACKUP_FORMAT_ID) {
      return fail("format");
    }

    // 步驟 3：schemaVersion 缺失、非整數、不在 SUPPORTED_SCHEMA_VERSIONS → version
    if (!hasOwn(file, "schemaVersion")) {
      return fail("version", null);
    }
    var v = file.schemaVersion;
    var fileVersion = typeof v === "number" && isFinite(v) ? v : null;
    if (!Number.isInteger(v) || C().SUPPORTED_SCHEMA_VERSIONS.indexOf(v) === -1) {
      return fail("version", fileVersion);
    }

    // 步驟 4：schemaVersion < 3 → 以 persist.migrate 逐版只遷移 data（1 → 2 → 3、2 → 3；與 localStorage 共用遷移鏈）；
    //   data 不是物件 → format（MG-1、MG-5）。頂層 schemaVersion 原值保留給步驟 5（MG-4、MG-8），本函式不改寫 file。
    var migratedData = file.data;
    if (v < C().CURRENT_SCHEMA_VERSION) {
      if (!P().isPlainObject(file.data)) {
        return fail("format");
      }
      var m = P().migrate({ schemaVersion: v, data: file.data });
      if (!m.ok) {
        return fail("format");
      }
      migratedData = m.record.data;
    }

    // 步驟 5：BackupFile 頂層欄位 + data 以 PersistedData 驗證並檢查 V-ST-03 → format
    //   customVocab 的 id／wordKey 重複不在此擋下，交由步驟 7 清理（IM-1）
    var keys = Object.keys(file);
    for (var i = 0; i < keys.length; i++) {
      if (BACKUP_KEYS.indexOf(keys[i]) === -1) { return fail("format"); }
    }
    if (!P().isDateTime(file.exportedAt) || typeof file.contentDataVersion !== "string" || !hasOwn(file, "data")) {
      return fail("format");
    }
    if (!P().isPlainObject(migratedData)) {
      return fail("format");
    }
    // IM-8 (1)：schemaVersion 2、3 的 data 缺少 todayLearned／learnedHistory 或 shape 不符 → 整份不匯入
    //   （與讀 localStorage 的 RD-1「只重設該欄」不同）
    if (!hasOwn(migratedData, "todayLearned") || !P().isTodayLearnedShape(migratedData.todayLearned) ||
        !hasOwn(migratedData, "learnedHistory") || !P().isLearnedHistoryShape(migratedData.learnedHistory)) {
      return fail("format");
    }
    // IM-9：3 個新欄位缺少不算錯誤（步驟 7 補預設值）；存在但 shape 不符由 validatePersistedData 判為錯誤 → format
    if (!P().validatePersistedData(migratedData, { allowCustomDuplicates: true }).ok) {
      return fail("format");
    }

    // 步驟 7：清理（AC-24-08）
    var data = P().clone(migratedData);
    var isBuiltin = toHas(ctx.builtinKeys);
    var skipped = 0;
    var keptKeys = Object.create(null);
    var usedIds = Object.create(null);
    var kept = [];
    var pendingId = [];
    data.customVocab.forEach(function (item) {
      var k = WK().wordKey(item.word);
      // 與內建重複 → 略過；檔內 wordKey 重複 → 保留第一筆、略過其餘
      if (isBuiltin(k) || keptKeys[k]) {
        skipped += 1;
        return;
      }
      keptKeys[k] = true;
      if (usedIds[item.id]) {
        pendingId.push(item); // id 重複 → 稍後重新產生（不計略過）
      } else {
        usedIds[item.id] = true;
      }
      kept.push(item);
    });
    pendingId.forEach(function (item) {
      var id;
      var guard = 0;
      do {
        id = typeof ctx.newId === "function" ? ctx.newId() : defaultNewId(ctx.random);
        guard += 1;
        if (guard > 1000) { throw new Error("無法產生不重複的 id"); }
      } while (typeof id !== "string" || usedIds[id] || !/^c_[A-Za-z0-9_-]{1,64}$/.test(id));
      usedIds[id] = true;
      item.id = id;
    });
    data.customVocab = kept;

    // 已掌握 wordKey 不在「內建字庫 ∪ 清理後自訂單字」→ 略過
    data.masteredWordKeys = data.masteredWordKeys.filter(function (k) {
      if (isBuiltin(k) || keptKeys[k]) { return true; }
      skipped += 1;
      return false;
    });

    // v0.15（IM-10 (1)～(3)）：補預設值、答對紀錄與單字卡位置的項目層級正規化；不計入 skipped（IM-10 (5)）
    data = P().normalizeTrackItems(data);

    // 重算色級（V-ST-02）、part5.currentIndex 依 V-ST-05；
    // v0.8：以匯入當天依 V-ST-09～V-ST-11 正規化學習紀錄（IM-8 (2)），捨棄的項目不計入 skipped
    // v0.15：有 part5Ids 時於 V-ST-05 之後依匯入的開關值執行 UO-4（IM-10 (4)）
    data = P().normalizeAfterLoad(data, ctx.part5Length, ctx.today, ctx.part5Ids);

    // 防禦：清理後必須完全符合 Schema（v3）與 V-ST-03
    if (!P().validatePersistedData(data).ok) {
      return fail("format");
    }
    return { ok: true, data: data, skipped: skipped };
  }

  return Object.freeze({
    buildBackup: buildBackup,
    importSteps: importSteps
  });
});
