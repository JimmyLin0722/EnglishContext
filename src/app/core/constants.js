/*
 * EMT.core.constants — 契約常數（FE-03）
 * 來源：docs/02-contract/data-schema.ts 的 export const（v0.4 的 14 個 + v0.8 新增 4 個），數值與字串逐字複製，不得自行修改。
 * （FE-20）v0.8 新增 TAB_LABELS、NAV_TAB_ORDER、LEARNED_HISTORY_DAYS、DASHBOARD_CHART_DAYS；
 * （FE-22）v0.8 持久化升版：CURRENT_SCHEMA_VERSION 1 → 2、SUPPORTED_SCHEMA_VERSIONS [1] → [1, 2]（契約 README §5.3）。
 * （FE-34）v0.9：NAV_TAB_ORDER 6 項 → 4 項（R-18 三）；新增 HIDDEN_TAB_IDS、LEARNING_PROGRESS_FIELDS（US-32）；TAB_LABELS 不變（HT-4）。
 * 契約變更時必須同步更新本檔與 src/app/__tests__/goal.test.js 的字面值斷言。
 * 本模組不碰 DOM；Node 以 require 載入，瀏覽器掛到 EMT.core.constants。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.EMT = root.EMT || {};
    root.EMT.core = root.EMT.core || {};
    root.EMT.core.constants = api;
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

  // §1 色級定義表（PRD 色級定義表；藍、金鎖定，dailyNewWords 20 僅供試算）
  var COLOR_LEVELS = [
    { id: "orange", nameZh: "橘", scoreMin: 10,  scoreMax: 215, status: "open",   dailyNewWords: 10, vocabTarget: "N_O", scenarioZh: "入門：最高頻的生活基礎字彙" },
    { id: "brown",  nameZh: "棕", scoreMin: 220, scoreMax: 465, status: "open",   dailyNewWords: 10, vocabTarget: "N_B", scenarioZh: "基礎：日常溝通與簡單職場用語" },
    { id: "green",  nameZh: "綠", scoreMin: 470, scoreMax: 725, status: "open",   dailyNewWords: 15, vocabTarget: "N_G", scenarioZh: "大學畢業門檻、基礎商務日常、職場多數情境、碩士先修" },
    { id: "blue",   nameZh: "藍", scoreMin: 730, scoreMax: 855, status: "locked", dailyNewWords: 20, vocabTarget: null,  scenarioZh: "高階商務談判、複雜文獻流暢處理" },
    { id: "gold",   nameZh: "金", scoreMin: 860, scoreMax: 990, status: "locked", dailyNewWords: 20, vocabTarget: null,  scenarioZh: "專業熟練者、近母語水準" }
  ];

  // §1 分數規則（Q-12）
  var SCORE_MIN = 10;
  var SCORE_MAX = 990;
  var SCORE_STEP = 5;
  var SCORE_DEFAULT = 600;

  // §1 橘色建議字量（Q-29）；N_B、N_G 由資料計算，不設常數
  var N_O = 1000;

  // §3 詞性畫面標籤（v0.7 新增 "pref.": "字首"，FB-25；內容與順序同 data-schema.ts）
  var POS_LABELS = {
    "n.": "名詞", "v.": "動詞", "adj.": "形容詞", "adv.": "副詞",
    "prep.": "介系詞", "conj.": "連接詞", "pron.": "代名詞", "det.": "限定詞",
    "art.": "冠詞", "num.": "數詞", "aux.": "助動詞", "int.": "感嘆詞", "phr.": "片語",
    "pref.": "字首"
  };

  // §5 Part 5 題型畫面標籤（AC-10-01 原文）
  var PART5_TYPE_LABELS = {
    preposition_collocation: "固定介系詞搭配",
    part_of_speech: "詞性辨析",
    context_vocabulary: "上下文單字",
    connector: "讓步/因果連接詞"
  };

  // §5 題目句中的空格記號：5 個半形底線
  var PART5_BLANK = "_____";

  // §7 句型類別篩選項標籤（AC-15-01 原文）
  var PHRASE_CATEGORY_LABELS = {
    all: "全部",
    gap: "研究空白 Gap",
    aim: "研究目的 Aim",
    findings: "研究結果 Findings",
    limitations: "研究限制 Limitations"
  };

  // §8 持久化（v0.8：寫入 2；讀取與匯入支援 1、2，1 依 MG-1～MG-4 遷移）
  var CURRENT_SCHEMA_VERSION = 2;
  var SUPPORTED_SCHEMA_VERSIONS = [1, 2];
  var STORAGE_KEYS = {
    state: "englishMasterTrack:state",
    unreadable: "englishMasterTrack:unreadable"
  };

  // §9 備份檔格式識別字串
  var BACKUP_FORMAT_ID = "english-master-track-backup";

  // §8（v0.8）近 N 天每日已學字數的保存天數（PRD R-17、AC-30-09）：保存視窗 = [today − 29 天, today]
  var LEARNED_HISTORY_DAYS = 30;

  // §8（v0.8）主控台長條圖顯示天數（含今天，AC-30-01、AC-30-08）
  var DASHBOARD_CHART_DAYS = 7;

  // §10（v0.8）頁面畫面名稱（R-15、AC-20-03）；識別字不改，只改畫面文字
  var TAB_LABELS = {
    dashboard: "主控台",
    customizer: "難易度設定",
    flashcards: "單字卡",
    part5: "模擬測驗",
    decoder: "解碼器",
    phrasebank: "句型庫",
    sources: "資料來源與授權"
  };

  // §8（v0.9）學習進度紀錄欄位（US-32、README §5.7 CI-4）：切換難易度初始化時只覆寫這 6 欄（白名單），順序同 data-schema.ts
  var LEARNING_PROGRESS_FIELDS = ["masteredWordKeys", "vocabQuiz", "part5", "streak", "todayLearned", "learnedHistory"];

  // §10（v0.9）導覽列項目與順序（AC-20-03、AC-27-01）：恰好 4 項，不含 "sources"、不含隱藏頁（R-18 三）
  var NAV_TAB_ORDER = ["dashboard", "customizer", "flashcards", "part5"];

  // §10（v0.9）隱藏頁面（AC-20-04、HT-1～HT-5）：currentTab 不得為這些值；TAB_LABELS 保留其文字供未來開放
  var HIDDEN_TAB_IDS = ["decoder", "phrasebank"];

  return deepFreeze({
    COLOR_LEVELS: COLOR_LEVELS,
    SCORE_MIN: SCORE_MIN,
    SCORE_MAX: SCORE_MAX,
    SCORE_STEP: SCORE_STEP,
    SCORE_DEFAULT: SCORE_DEFAULT,
    N_O: N_O,
    POS_LABELS: POS_LABELS,
    PART5_TYPE_LABELS: PART5_TYPE_LABELS,
    PART5_BLANK: PART5_BLANK,
    PHRASE_CATEGORY_LABELS: PHRASE_CATEGORY_LABELS,
    CURRENT_SCHEMA_VERSION: CURRENT_SCHEMA_VERSION,
    SUPPORTED_SCHEMA_VERSIONS: SUPPORTED_SCHEMA_VERSIONS,
    STORAGE_KEYS: STORAGE_KEYS,
    BACKUP_FORMAT_ID: BACKUP_FORMAT_ID,
    LEARNED_HISTORY_DAYS: LEARNED_HISTORY_DAYS,
    DASHBOARD_CHART_DAYS: DASHBOARD_CHART_DAYS,
    TAB_LABELS: TAB_LABELS,
    NAV_TAB_ORDER: NAV_TAB_ORDER,
    HIDDEN_TAB_IDS: HIDDEN_TAB_IDS,
    LEARNING_PROGRESS_FIELDS: LEARNING_PROGRESS_FIELDS
  });
});
