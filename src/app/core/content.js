/*
 * EMT.content — 讀取內容資料全域變數（FE-04；契約 data-schema.ts §11、README §2 C-6）
 * 讀取 9 個全域變數：MASTER_VOCAB_DATABASE、DATA_SOURCE_REGISTRY、VOCAB_MANIFEST、PROJECT_LICENSE、
 * DOMAIN_TEMPLATES、PART5_QUESTION_BANK、DECODER_SENTENCES、READING_STRATEGIES、ACADEMIC_PHRASEBANK。
 * 不存在或型別不符：陣列 → []、物件 → null，絕不拋例外（C-6，不得白屏）。
 * 字庫整理（排序、wordKey 對照、N_B／N_G）交給 EMT.core.vocab.prepareBuiltin，以便在 Node 測試。
 * 本檔為瀏覽器用，掛在 EMT.content（不是 EMT.core.content）；Node 下匯出同一個 API 供測試，
 * load(globalObj) 可傳入假的 window。
 * 注意：建置時 core 依檔名排序，content.js 早於 vocab.js 載入，因此 vocab 模組在 load() 時才取用。
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.EMT = root.EMT || {};
    root.EMT.content = api;
  }
})(typeof self !== "undefined" ? self : this, function (root) {
  "use strict";

  /** 陣列型全域變數：getter 名稱 → 全域變數名稱（字庫另行處理） */
  var ARRAY_GLOBALS = {
    templates: "DOMAIN_TEMPLATES",
    part5: "PART5_QUESTION_BANK",
    decoderSentences: "DECODER_SENTENCES",
    strategies: "READING_STRATEGIES",
    phrases: "ACADEMIC_PHRASEBANK",
    sources: "DATA_SOURCE_REGISTRY"
  };

  /** 物件型全域變數：getter 名稱 → 全域變數名稱 */
  var OBJECT_GLOBALS = {
    manifest: "VOCAB_MANIFEST",
    license: "PROJECT_LICENSE"
  };

  /** 字庫全域變數名稱 */
  var VOCAB_GLOBAL = "MASTER_VOCAB_DATABASE";

  /** 空集合（尚未 load 或 load 失敗時的狀態） */
  function emptyState() {
    return {
      builtin: [],
      builtinMap: new Map(),
      nB: 0,
      nG: 0,
      templates: [],
      part5: [],
      decoderSentences: [],
      strategies: [],
      phrases: [],
      sources: [],
      manifest: null,
      license: null
    };
  }

  var state = emptyState();

  /** 安全讀取全域變數（getter 拋例外也不中斷） */
  function readGlobal(g, name) {
    try {
      return g ? g[name] : undefined;
    } catch (e) {
      return undefined;
    }
  }

  /** 陣列 → 排除非物件元素的淺複製；非陣列 → [] */
  function asObjectArray(x) {
    if (!Array.isArray(x)) { return []; }
    var out = [];
    for (var i = 0; i < x.length; i++) {
      if (x[i] && typeof x[i] === "object") { out.push(x[i]); }
    }
    return out;
  }

  /** 純物件 → 原物件；其他 → null */
  function asObject(x) {
    return (x && typeof x === "object" && !Array.isArray(x)) ? x : null;
  }

  /** 取得 vocab 模組：Node 下 require，瀏覽器下讀 EMT.core.vocab；取不到回 null */
  function vocabModule() {
    try {
      if (typeof require === "function" && typeof module === "object") {
        return require("./vocab.js");
      }
      return (root && root.EMT && root.EMT.core && root.EMT.core.vocab) || null;
    } catch (e) {
      return null;
    }
  }

  /** 對外快照（淺複製 state，避免呼叫端改到內部參照的欄位） */
  function snapshot() {
    var s = {};
    for (var k in state) {
      if (Object.prototype.hasOwnProperty.call(state, k)) { s[k] = state[k]; }
    }
    return s;
  }

  /**
   * 讀取全部內容資料（main.js 啟動時呼叫一次；可重複呼叫）。
   * 任何資料缺漏或型別不符都不拋例外，對應欄位為空集合／0／null。
   * @param {object} [globalObj] 預設為瀏覽器全域（window／self）
   * @returns {object} 資料快照：{ builtin, builtinMap, nB, nG, templates, part5, decoderSentences,
   *                              strategies, phrases, sources, manifest, license }
   */
  function load(globalObj) {
    var g = globalObj || root;
    var next = emptyState();
    try {
      for (var a in ARRAY_GLOBALS) {
        if (Object.prototype.hasOwnProperty.call(ARRAY_GLOBALS, a)) {
          next[a] = asObjectArray(readGlobal(g, ARRAY_GLOBALS[a]));
        }
      }
      for (var o in OBJECT_GLOBALS) {
        if (Object.prototype.hasOwnProperty.call(OBJECT_GLOBALS, o)) {
          next[o] = asObject(readGlobal(g, OBJECT_GLOBALS[o]));
        }
      }
      var vocab = vocabModule();
      if (vocab) {
        var prepared = vocab.prepareBuiltin(readGlobal(g, VOCAB_GLOBAL), next.manifest);
        next.builtin = prepared.sorted;
        next.builtinMap = prepared.map;
        next.nB = prepared.nB;
        next.nG = prepared.nG;
      } else if (typeof console !== "undefined" && typeof console.warn === "function") {
        console.warn("[EMT.content] 找不到 EMT.core.vocab，內建字庫視為空");
      }
    } catch (e) {
      // 理論上不會發生；保底維持已讀到的部分，不讓啟動流程中斷
      if (typeof console !== "undefined" && typeof console.error === "function") {
        console.error("[EMT.content] 讀取內容資料失敗", e);
      }
    }
    state = next;
    return snapshot();
  }

  var api = { load: load };

  // getters：EMT.content.builtin、EMT.content.nB …（唯讀屬性，回傳最近一次 load 的結果）
  Object.keys(emptyState()).forEach(function (name) {
    Object.defineProperty(api, name, {
      enumerable: true,
      get: function () { return state[name]; }
    });
  });

  return Object.freeze(api);
});
