/*
 * EMT.core.custom — 自訂單字驗證、去重、範本注入、刪除後索引（FE-04；architecture.md §7.2）
 * 依據：契約 data-schema.ts §4 DomainTemplate／TemplateWord、§8 CustomVocabItem、§10 StudyCard；
 *       共通約定 C-1（非空 = trim 後長度 ≥ 1）、C-2（wordKey）；README V-ST-03、V-ST-06。
 * 本模組為純函式，不碰 DOM、不讀 window 全域資料、不讀 localStorage；
 * 狀態寫入（含容量不足回滾、移除已掌握 wordKey）由 store（FE-07）負責。
 * Node 以 require 載入，瀏覽器掛到 EMT.core.custom（需先載入 EMT.core.wordkey）。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.EMT = root.EMT || {};
    root.EMT.core = root.EMT.core || {};
    root.EMT.core.custom = api;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // 取得相依模組：Node 下 require，瀏覽器下讀 EMT.core.wordkey
  var wordKey;
  if (typeof require === "function" && typeof module === "object") {
    wordKey = require("./wordkey.js").wordKey;
  } else {
    var g = typeof self !== "undefined" ? self : this;
    wordKey = g.EMT.core.wordkey.wordKey;
  }

  /** 表單選填欄位（AC-04-01）；academicContext 表單無此欄，只由範本帶入 */
  var OPTIONAL_FORM_FIELDS = ["phonetic", "pos", "collocation", "example"];

  /** 範本代碼（契約 DomainTemplateId） */
  var TEMPLATE_IDS = ["cs", "business", "biostat"];

  /** id 亂數字元集（base36） */
  var ID_CHARS = "0123456789abcdefghijklmnopqrstuvwxyz";

  /** 欄位錯誤代碼：必填欄位 trim 後為空（AC-04-03）；提示文字由畫面決定 */
  var ERROR_REQUIRED = "required";

  /** 取字串欄位並 trim；非字串一律視為 "" */
  function str(x) {
    return typeof x === "string" ? x.trim() : "";
  }

  /**
   * 驗證自訂單字表單（AC-04-01、AC-04-03）。
   * 英文單字、中文釋義 trim 後必須非空；選填欄位未填存 ""。
   * 回傳的 values 已 trim，可直接交給 makeCustomItem。
   * @param {object} fields { word, meaning, phonetic?, pos?, collocation?, example? }
   * @returns {{ ok: boolean, fieldErrors: { word?: string, meaning?: string }, values: object }}
   */
  function validateCustomFields(fields) {
    var f = (fields && typeof fields === "object") ? fields : {};
    var values = { word: str(f.word), meaning: str(f.meaning) };
    for (var i = 0; i < OPTIONAL_FORM_FIELDS.length; i++) {
      values[OPTIONAL_FORM_FIELDS[i]] = str(f[OPTIONAL_FORM_FIELDS[i]]);
    }
    var fieldErrors = {};
    if (values.word === "") { fieldErrors.word = ERROR_REQUIRED; }
    if (values.meaning === "") { fieldErrors.meaning = ERROR_REQUIRED; }
    return { ok: Object.keys(fieldErrors).length === 0, fieldErrors: fieldErrors, values: values };
  }

  /** 自訂清單是否已有此 wordKey */
  function customHasKey(customVocab, key) {
    if (!Array.isArray(customVocab)) { return false; }
    for (var i = 0; i < customVocab.length; i++) {
      var it = customVocab[i];
      if (it && wordKey(it.word) === key) { return true; }
    }
    return false;
  }

  /**
   * 是否與既有單字重複（AC-04-06、E-19）。
   * wordKey 存在於「全部」內建字庫（不限目前色級範圍）或自訂清單 → 重複。
   * 例：自訂或內建已有 latency，再新增 Latency → true。
   * @param {string} word
   * @param {Map<string, object>|null} builtinMap prepareBuiltin().map
   * @param {object[]} customVocab
   * @returns {boolean}
   */
  function isDuplicate(word, builtinMap, customVocab) {
    var key = wordKey(word);
    if (key === "") { return false; }
    if (builtinMap && typeof builtinMap.has === "function" && builtinMap.has(key)) { return true; }
    return customHasKey(customVocab, key);
  }

  /**
   * 規劃範本注入（AC-05-02、AC-05-04）。
   * 依範本順序挑出 wordKey 尚不存在於內建字庫、自訂清單、及本次已挑選者的字；
   * 範本單字缺必填的 word／meaning（資料錯誤）也計入略過。
   * @param {object} template DomainTemplate
   * @param {Map<string, object>|null} builtinMap
   * @param {object[]} customVocab
   * @returns {{ toAdd: object[], skippedCount: number }} toAdd 為 TemplateWord（原物件）
   */
  function planTemplateInjection(template, builtinMap, customVocab) {
    var words = (template && Array.isArray(template.words)) ? template.words : [];
    var existing = new Set();
    if (Array.isArray(customVocab)) {
      for (var i = 0; i < customVocab.length; i++) {
        if (customVocab[i]) { existing.add(wordKey(customVocab[i].word)); }
      }
    }
    var toAdd = [];
    var skippedCount = 0;
    for (var j = 0; j < words.length; j++) {
      var w = words[j];
      var key = w ? wordKey(w.word) : "";
      var invalid = key === "" || str(w.meaning) === "";
      var exists = !invalid && (existing.has(key) ||
        (!!builtinMap && typeof builtinMap.has === "function" && builtinMap.has(key)));
      if (invalid || exists) {
        skippedCount++;
        continue;
      }
      existing.add(key);
      toAdd.push(w);
    }
    return { toAdd: toAdd, skippedCount: skippedCount };
  }

  /** 把 takenIds（Set 或陣列）轉成 Set */
  function toIdSet(takenIds) {
    if (takenIds instanceof Set) { return takenIds; }
    var s = new Set();
    if (Array.isArray(takenIds)) {
      for (var i = 0; i < takenIds.length; i++) { s.add(takenIds[i]); }
    }
    return s;
  }

  /** 產生 4 位 base36 亂數 */
  function rand4(rand) {
    var out = "";
    for (var i = 0; i < 4; i++) {
      var r = Number(rand());
      var idx = Math.floor((isFinite(r) ? r : 0) * 36);
      if (idx < 0) { idx = 0; }
      if (idx > 35) { idx = 35; }
      out += ID_CHARS.charAt(idx);
    }
    return out;
  }

  /**
   * 建立自訂單字（契約 CustomVocabItem）。
   * - id = "c_" + 時間（base36）+ "_" + 4 位亂數；若與 takenIds 重複則重抽（V-ST-03 id 不重複）。
   * - word、meaning trim；選填欄位未填存 ""（契約：不存 null、不省略）。
   * - origin "manual"：templateId = null，academicContext 恆為 ""（表單無此欄）。
   * - origin "template"：templateId 必須是 cs／business／biostat，academicContext 由範本帶入。
   * - createdAt = now 的 ISO 8601。
   * 呼叫端須先以 validateCustomFields 驗證；origin／templateId 不合法屬程式錯誤，拋 TypeError。
   * @param {object} fields
   * @param {"manual"|"template"} origin
   * @param {string|null} templateId
   * @param {number|Date} [now] 預設 Date.now()
   * @param {function(): number} [rand] 預設 Math.random
   * @param {Set<string>|string[]} [takenIds] 已使用的 id
   * @returns {object} CustomVocabItem
   */
  function makeCustomItem(fields, origin, templateId, now, rand, takenIds) {
    if (origin !== "manual" && origin !== "template") {
      throw new TypeError("makeCustomItem：origin 必須是 manual 或 template");
    }
    if (origin === "template" && TEMPLATE_IDS.indexOf(templateId) === -1) {
      throw new TypeError("makeCustomItem：origin 為 template 時 templateId 必須是 cs、business 或 biostat");
    }
    var f = (fields && typeof fields === "object") ? fields : {};
    var ms = now instanceof Date ? now.getTime() : (typeof now === "number" && isFinite(now) ? now : Date.now());
    var rnd = typeof rand === "function" ? rand : Math.random;
    var taken = toIdSet(takenIds);

    var base = "c_" + Math.max(0, Math.floor(ms)).toString(36) + "_";
    var id = base + rand4(rnd);
    for (var tries = 0; taken.has(id) && tries < 20; tries++) {
      id = base + rand4(rnd);
    }
    // 亂數來源異常（例如固定值）時，以流水號保證不重複
    for (var n = 2; taken.has(id); n++) {
      id = base + rand4(rnd) + "_" + n;
    }

    return {
      id: id,
      word: str(f.word),
      meaning: str(f.meaning),
      phonetic: str(f.phonetic),
      pos: str(f.pos),
      collocation: str(f.collocation),
      example: str(f.example),
      academicContext: origin === "template" ? str(f.academicContext) : "",
      origin: origin,
      templateId: origin === "template" ? templateId : null,
      createdAt: new Date(ms).toISOString()
    };
  }

  /**
   * 範本注入的便利函式：planTemplateInjection + makeCustomItem。
   * 每個字的 createdAt 依序 +1 毫秒，確保抽認卡中的順序與範本順序一致且重新載入後不變。
   * @param {object} template DomainTemplate
   * @param {Map<string, object>|null} builtinMap
   * @param {object[]} customVocab
   * @param {number|Date} [now]
   * @param {function(): number} [rand]
   * @returns {{ items: object[], skippedCount: number }}
   */
  function buildTemplateItems(template, builtinMap, customVocab, now, rand) {
    var plan = planTemplateInjection(template, builtinMap, customVocab);
    var ms = now instanceof Date ? now.getTime() : (typeof now === "number" && isFinite(now) ? now : Date.now());
    var taken = new Set();
    if (Array.isArray(customVocab)) {
      for (var i = 0; i < customVocab.length; i++) {
        if (customVocab[i] && typeof customVocab[i].id === "string") { taken.add(customVocab[i].id); }
      }
    }
    var items = [];
    for (var j = 0; j < plan.toAdd.length; j++) {
      var item = makeCustomItem(plan.toAdd[j], "template", template.id, ms + j, rand, taken);
      taken.add(item.id);
      items.push(item);
    }
    return { items: items, skippedCount: plan.skippedCount };
  }

  /**
   * 刪除自訂單字後的抽認卡索引（AC-04-08、E-24）。
   * studySet 為刪除「前」的單字集；回傳值為刪除「後」單字集中的索引。
   * 刪除位置 d、目前索引 i：
   *   d < i → i − 1；d === i → i 是最後一張則 i − 1，否則 i（即原本的下一張）；d > i → i；
   *   新集合為空 → 0（畫面顯示空狀態，AC-06-06）。
   * 被刪的自訂字不在單字集中（例如被內建卡取代，SD-FB-03）時單字集不變，只把 i 夾回有效範圍。
   * @param {Array<{ kind: string, wordKey: string }>} studySet
   * @param {number} currentIndex
   * @param {string} deletedWordKey
   * @returns {number}
   */
  function indexAfterDelete(studySet, currentIndex, deletedWordKey) {
    var set = Array.isArray(studySet) ? studySet : [];
    var len = set.length;
    var i = (typeof currentIndex === "number" && isFinite(currentIndex)) ? Math.floor(currentIndex) : 0;

    var d = -1;
    for (var k = 0; k < len; k++) {
      if (set[k] && set[k].kind === "custom" && set[k].wordKey === deletedWordKey) { d = k; break; }
    }

    var newLen = d === -1 ? len : len - 1;
    if (newLen <= 0) { return 0; }

    var next;
    if (d === -1 || d > i) {
      next = i;
    } else if (d < i) {
      next = i - 1;
    } else {
      next = (i === len - 1) ? i - 1 : i;
    }
    if (next < 0) { next = 0; }
    if (next > newLen - 1) { next = newLen - 1; }
    return next;
  }

  return Object.freeze({
    ERROR_REQUIRED: ERROR_REQUIRED,
    validateCustomFields: validateCustomFields,
    isDuplicate: isDuplicate,
    planTemplateInjection: planTemplateInjection,
    makeCustomItem: makeCustomItem,
    buildTemplateItems: buildTemplateItems,
    indexAfterDelete: indexAfterDelete
  });
});
