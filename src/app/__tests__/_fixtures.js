/*
 * _fixtures.js — 頁面單元測試共用的小型內容資料與假物件（FE-19）
 * 依據：architecture.md v0.3 §10（不讀正式內容資料檔，改用本檔的 fixture）；
 *       契約 data-schema.ts（DataSourceEntry、BuiltinVocabItem、VocabManifest、ProjectLicenseInfo、
 *       DomainTemplate、Part5Question、DecoderSentence、ReadingStrategy、PhraseTemplate）
 *
 * 規則：
 * - 檔名不以 .test.js 結尾，npm test（node --test src/app/__tests__/*.test.js）不會把本檔當成測試執行。
 * - 每個 fixture 以函式回傳「新的深複製」，測試可自由修改而不互相影響。
 * - 文字值取自契約與 README 的範例；筆數刻意縮小，資料筆數與內容正確性屬 validate.mjs 的範圍。
 */
"use strict";

const path = require("node:path");

/** src/app 目錄（以 __dirname 組相對路徑，不寫死絕對路徑） */
const APP_DIR = path.join(__dirname, "..");

/** 深複製（fixture 皆為純 JSON 資料） */
function clone(x) {
  return JSON.parse(JSON.stringify(x));
}

// ─────────────────────────────────────────────────────────────
// 來源登錄（DataSourceEntry[]，契約 §2；README §4.3 的範例值）
// ─────────────────────────────────────────────────────────────

const CC_BY_SA_URL = "https://creativecommons.org/licenses/by-sa/4.0/";
const MIT_URL = "https://opensource.org/license/mit";

function confirmed(url) {
  return { status: "confirmed", confirmedAt: "2026-10-29", confirmedBy: "主控（AMS orchestrator）", evidenceUrl: url };
}

function wordlist(code, fullName, authors, originalItemCount, includedItemCount) {
  return {
    code: code,
    kind: "wordlist",
    name: code,
    fullName: fullName,
    version: "1.2",
    authors: authors,
    licenseName: "CC BY-SA 4.0",
    licenseUrl: CC_BY_SA_URL,
    homepageUrl: "https://www.newgeneralservicelist.com/",
    originUrl: "https://www.newgeneralservicelist.com/",
    confirmation: confirmed("https://www.newgeneralservicelist.com/"),
    modifications: ["合併 NGSL、TSL、BSL、NAWL 並去重", "重新編排頻率排名", "補充搭配詞、例句、學術情境欄位"],
    originalItemCount: originalItemCount,
    includedItemCount: includedItemCount,
    copyrightNotice: null,
    licenseText: null
  };
}

const BCP = ["Browne, C.", "Culligan, B.", "Phillips, J."];
const BC = ["Browne, C.", "Culligan, B."];

const REGISTRY = [
  wordlist("NGSL", "New General Service List", BCP, 2809, 2809),
  wordlist("TSL", "TOEIC Service List", BC, 1250, 1250),
  wordlist("BSL", "Business Service List", BC, 1744, 1744),
  wordlist("NAWL", "New Academic Word List", BCP, 959, 959),
  {
    code: "ECDICT",
    kind: "dictionary",
    name: "ECDICT",
    fullName: "ECDICT 英漢辭典資料庫",
    version: "master@ab22ad3",
    authors: ["Linwei（skywind3000）"],
    licenseName: "MIT",
    licenseUrl: MIT_URL,
    homepageUrl: "https://github.com/skywind3000/ECDICT",
    originUrl: "https://github.com/skywind3000/ECDICT",
    confirmation: confirmed("https://github.com/skywind3000/ECDICT"),
    modifications: ["簡體轉繁體台灣用語", "精簡釋義"],
    originalItemCount: null,
    includedItemCount: 5616,
    copyrightNotice: "Copyright (c) 2025 Linwei",
    // fixture 用的占位全文（正式全文由 pg-content 自 sources/ecdict/LICENSE 照錄）
    licenseText: "MIT License\n\nCopyright (c) 2025 Linwei\n\n（測試用占位文字）"
  },
  {
    code: "ORIGINAL",
    kind: "original",
    name: "原創",
    fullName: "EnglishContext 原創內容",
    version: "2026.10.30",
    authors: ["JimmyLin"],
    licenseName: "CC BY-SA 4.0",
    licenseUrl: CC_BY_SA_URL,
    homepageUrl: "",
    originUrl: "",
    confirmation: confirmed(""),
    modifications: [],
    originalItemCount: null,
    includedItemCount: null,
    copyrightNotice: null,
    licenseText: null
  }
];

// ─────────────────────────────────────────────────────────────
// 內建字庫（BuiltinVocabItem[]）：8 筆，N_B = 3（NGSL）、N_G = 8
// rank ≤ N_B 的 academicContext 可為 ""；rank > N_B 必須非空（AC-06-07、AC-06-08）
// ─────────────────────────────────────────────────────────────

function vocab(rank, word, phonetic, pos, meaning, sources, meaningSource, academicContext) {
  return {
    rank: rank,
    word: word,
    phonetic: phonetic,
    pos: pos,
    meaning: meaning,
    collocation: word + " + 名詞：the " + word + " policy",
    academicContext: academicContext,
    example: "The example sentence uses " + word + ".",
    sources: sources,
    phoneticSource: "ORIGINAL",
    meaningSource: meaningSource,
    contentSource: "ORIGINAL"
  };
}

const BUILTIN = [
  vocab(1, "the", "/ðə/", ["art."], "這個；那個（定冠詞）", ["NGSL"], "ECDICT", ""),
  vocab(2, "company", "/ˈkʌmpəni/", ["n."], "公司；陪伴", ["NGSL"], "ECDICT", ""),
  vocab(3, "meeting", "/ˈmitɪŋ/", ["n."], "會議；會面", ["NGSL"], "ECDICT", ""),
  vocab(4, "invoice", "/ˈɪnvɔɪs/", ["n.", "v."], "發票；開發票", ["TSL"], "ECDICT", "Invoices were sampled for the audit study."),
  vocab(5, "address", "/əˈdrɛs/", ["v.", "n."], "地址；處理（問題）", ["TSL", "BSL"], "ECDICT", "This study addresses the gap."),
  vocab(6, "café", "/kæˈfeɪ/", ["n."], "咖啡館", ["BSL"], "ORIGINAL", "Participants were recruited in a café."),
  vocab(7, "null", "/nʌl/", ["adj."], "無效的；零值的", ["BSL", "NAWL"], "ECDICT", "The null hypothesis was rejected."),
  vocab(8, "hypothesis", "/haɪˈpɑθəsɪs/", ["n."], "假說；假設", ["NAWL"], "ECDICT", "We tested the hypothesis that latency drops.")
];

const MANIFEST = {
  dataVersion: "2026.10.30",
  nO: 1000,
  nB: 3,
  nG: 8,
  segments: [
    { list: "NGSL", rankFrom: 1, rankTo: 3 },
    { list: "TSL", rankFrom: 4, rankTo: 5 },
    { list: "BSL", rankFrom: 6, rankTo: 7 },
    { list: "NAWL", rankFrom: 8, rankTo: 8 }
  ]
};

const LICENSE = {
  copyrightHolder: "JimmyLin",
  copyrightYear: 2026,
  codeLicense: "MIT",
  dataLicense: "CC BY-SA 4.0",
  dataLicenseUrl: CC_BY_SA_URL,
  codeLicenseUrl: MIT_URL
};

// ─────────────────────────────────────────────────────────────
// 領域範本（DomainTemplate[]，每個恰好 10 筆；不與內建字庫重複）
// ─────────────────────────────────────────────────────────────

function tplWord(word, meaning) {
  return {
    word: word,
    meaning: meaning,
    phonetic: "/ˈtɛst/",
    pos: "n. 名詞",
    collocation: word.toLowerCase() + " analysis",
    example: "The " + word.toLowerCase() + " was measured in the experiment.",
    academicContext: "We report " + word.toLowerCase() + " for each condition."
  };
}

const TEMPLATES = [
  {
    id: "cs",
    label: "資工",
    words: [
      ["Latency", "延遲"], ["Scalability", "可擴展性"], ["Throughput", "吞吐量"], ["Concurrency", "並行"],
      ["Cache", "快取"], ["Compiler", "編譯器"], ["Kernel", "核心"], ["Bandwidth", "頻寬"],
      ["Overfitting", "過度擬合"], ["Encryption", "加密"]
    ].map((p) => tplWord(p[0], p[1])),
    source: "ORIGINAL"
  },
  {
    id: "business",
    label: "商管",
    words: [
      ["Monetization", "營利化"], ["Stakeholder", "利害關係人"], ["Liquidity", "流動性"], ["Revenue", "營收"],
      ["Procurement", "採購"], ["Equity", "股權"], ["Dividend", "股利"], ["Leverage", "槓桿"],
      ["Benchmarking", "標竿分析"], ["Outsourcing", "外包"]
    ].map((p) => tplWord(p[0], p[1])),
    source: "ORIGINAL"
  },
  {
    id: "biostat",
    label: "生醫統計",
    words: [
      ["Heterogeneous", "異質的"], ["Cohort", "世代"], ["Placebo", "安慰劑"], ["Prevalence", "盛行率"],
      ["Incidence", "發生率"], ["Covariate", "共變數"], ["Randomization", "隨機分派"], ["Biomarker", "生物標記"],
      ["Confounder", "干擾因子"], ["Morbidity", "罹病率"]
    ].map((p) => tplWord(p[0], p[1])),
    source: "ORIGINAL"
  }
];

// ─────────────────────────────────────────────────────────────
// Part 5（Part5Question[]）：每題型 1 題，共 4 題
// ─────────────────────────────────────────────────────────────

const PART5 = [
  {
    id: "p5-001",
    type: "preposition_collocation",
    sentence: "All employees must comply _____ the new safety regulations.",
    options: ["with", "to", "for", "at"],
    correctIndex: 0,
    explanation: {
      coreStrategy: "comply 固定搭配 with。",
      structure: "S: All employees / V: must comply with / O: the new safety regulations / 修飾語: 無"
    },
    source: "ORIGINAL"
  },
  {
    id: "p5-002",
    type: "part_of_speech",
    sentence: "The manager gave a _____ presentation to the board.",
    options: ["persuade", "persuasive", "persuasion", "persuasively"],
    correctIndex: 1,
    explanation: {
      coreStrategy: "冠詞與名詞之間需要形容詞。",
      structure: "S: The manager / V: gave / O: a persuasive presentation / 修飾語: to the board"
    },
    source: "ORIGINAL"
  },
  {
    id: "p5-003",
    type: "context_vocabulary",
    sentence: "Please _____ the attached invoice before Friday.",
    options: ["review", "remind", "retire", "relax"],
    correctIndex: 0,
    explanation: {
      coreStrategy: "依上下文，處理發票的動作為 review。",
      structure: "S: (You) / V: review / O: the attached invoice / 修飾語: before Friday"
    },
    source: "ORIGINAL"
  },
  {
    id: "p5-004",
    type: "connector",
    sentence: "_____ the delay, the project was completed on budget.",
    options: ["Although", "Despite", "Because", "Unless"],
    correctIndex: 1,
    explanation: {
      coreStrategy: "空格後為名詞片語，讓步語意用 Despite。",
      structure: "S: the project / V: was completed / O: 無（被動語態）/ 修飾語: Despite the delay、on budget"
    },
    source: "ORIGINAL"
  }
];

// ─────────────────────────────────────────────────────────────
// 長難句（DecoderSentence[]）與閱讀策略（ReadingStrategy[]）
// 每句至少各 1 段 subject、verb、modifier（V-DEC-03）
// ─────────────────────────────────────────────────────────────

const DECODER_SENTENCES = [
  {
    id: "ds-001",
    segments: [
      { text: "Although prior studies focused on accuracy, ", role: "modifier", noteZh: "讓步子句" },
      { text: "the proposed model", role: "subject" },
      { text: " ", role: "plain" },
      { text: "reduces", role: "verb" },
      { text: " ", role: "plain" },
      { text: "inference latency", role: "object" },
      { text: " by 30 percent", role: "modifier" },
      { text: ".", role: "plain" }
    ],
    translationZh: "雖然先前研究著重準確度，本研究提出的模型將推論延遲降低了 30%。",
    section: "abstract",
    source: "ORIGINAL"
  },
  {
    id: "ds-002",
    segments: [
      { text: "Participants", role: "subject" },
      { text: ", recruited from three hospitals,", role: "modifier", noteZh: "分詞片語" },
      { text: " ", role: "plain" },
      { text: "completed", role: "verb" },
      { text: " ", role: "plain" },
      { text: "the questionnaire", role: "object" },
      { text: ".", role: "plain" }
    ],
    translationZh: "從三家醫院招募的受試者完成了問卷。",
    section: "methodology",
    source: "ORIGINAL"
  },
  {
    id: "ds-003",
    segments: [
      { text: "Few studies", role: "subject" },
      { text: " ", role: "plain" },
      { text: "have examined", role: "verb" },
      { text: " ", role: "plain" },
      { text: "this effect", role: "object" },
      { text: " in low-income settings", role: "modifier" },
      { text: ".", role: "plain" }
    ],
    translationZh: "很少研究探討此效應在低收入環境中的情形。",
    section: "literature_review",
    source: "ORIGINAL"
  }
];

const READING_STRATEGIES = [
  { id: "abstract", title: "Abstract 摘要", tips: ["先找研究目的與主要結果。", "注意數字與比較對象。"], source: "ORIGINAL" },
  { id: "methodology", title: "方法論", tips: ["找出受試者、工具與程序。"], source: "ORIGINAL" },
  { id: "literature_review", title: "文獻回顧（Research Gap）", tips: ["留意 however、few studies 等轉折。"], source: "ORIGINAL" }
];

// ─────────────────────────────────────────────────────────────
// 學術句型（PhraseTemplate[]）：4 類各 2 則，共 8 則
// 含 "gap" 的：ph-001（template）、ph-002（descriptionZh 的 Gap）、ph-003（template）
// ─────────────────────────────────────────────────────────────

const PHRASEBANK = [
  { id: "ph-001", category: "gap", template: "Little attention has been paid to the gap between [A] and [B].", descriptionZh: "指出兩者之間缺乏研究", source: "ORIGINAL" },
  { id: "ph-002", category: "gap", template: "Few studies have investigated [topic] in [context].", descriptionZh: "指出研究空白（Gap）", exampleEn: "Few studies have investigated latency in rural clinics.", source: "ORIGINAL" },
  { id: "ph-003", category: "aim", template: "This study aims to close the GAP in [field].", descriptionZh: "說明研究目的", source: "ORIGINAL" },
  { id: "ph-004", category: "aim", template: "The purpose of this paper is to [verb] [object].", descriptionZh: "說明本文目的", source: "ORIGINAL" },
  { id: "ph-005", category: "findings", template: "The results indicate that [finding].", descriptionZh: "陳述主要結果", source: "ORIGINAL" },
  { id: "ph-006", category: "findings", template: "[Variable] was significantly associated with [outcome].", descriptionZh: "陳述變項關聯", source: "ORIGINAL" },
  { id: "ph-007", category: "limitations", template: "Several limitations of this study should be noted.", descriptionZh: "提出研究限制", source: "ORIGINAL" },
  { id: "ph-008", category: "limitations", template: "The sample size was relatively small.", descriptionZh: "樣本數不足的限制", exampleEn: "The gap in sample size limited power.", source: "ORIGINAL" }
];

// ─────────────────────────────────────────────────────────────
// 對外函式
// ─────────────────────────────────────────────────────────────

/**
 * 假的 window：放入契約 §11 的 9 個資料全域變數（皆為新的複本）。
 * @param {object} [overrides] 覆寫或移除（值為 undefined）特定全域變數
 * @returns {object}
 */
function globals(overrides) {
  const g = {
    MASTER_VOCAB_DATABASE: clone(BUILTIN),
    DATA_SOURCE_REGISTRY: clone(REGISTRY),
    VOCAB_MANIFEST: clone(MANIFEST),
    PROJECT_LICENSE: clone(LICENSE),
    DOMAIN_TEMPLATES: clone(TEMPLATES),
    PART5_QUESTION_BANK: clone(PART5),
    DECODER_SENTENCES: clone(DECODER_SENTENCES),
    READING_STRATEGIES: clone(READING_STRATEGIES),
    ACADEMIC_PHRASEBANK: clone(PHRASEBANK)
  };
  const o = overrides || {};
  Object.keys(o).forEach((k) => {
    if (o[k] === undefined) delete g[k];
    else g[k] = o[k];
  });
  return g;
}

/**
 * 以 core/content.js 的 load() 讀取 fixture，回傳 store 可用的 content 快照。
 * @param {object} [overrides] 同 globals()
 * @returns {object}
 */
function loadContent(overrides) {
  const content = require(path.join(APP_DIR, "core", "content.js"));
  return content.load(globals(overrides));
}

/**
 * 假 localStorage（與 store.test.js 同一做法）：quota = true 時寫入主鍵拋 QuotaExceededError；
 * otherError = true 時寫入主鍵拋一般錯誤。
 * @param {object} [initial] 初始鍵值
 */
function fakeStorage(initial) {
  const KEY = "englishMasterTrack:state";
  const map = new Map(Object.entries(initial || {}));
  const s = {
    map: map,
    setCalls: [],
    quota: false,
    otherError: false,
    getItem(k) {
      return map.has(k) ? map.get(k) : null;
    },
    setItem(k, v) {
      s.setCalls.push(k);
      if (k === KEY && s.quota) {
        const e = new Error("quota");
        e.name = "QuotaExceededError";
        e.code = 22;
        throw e;
      }
      if (k === KEY && s.otherError) throw new Error("SecurityError");
      map.set(k, String(v));
    }
  };
  return s;
}

/** localStorage 主鍵（契約 STORAGE_KEYS.state） */
const MAIN_KEY = "englishMasterTrack:state";

/** 固定序列亂數（可重現） */
function seqRand() {
  let i = 0;
  return () => {
    i = (i + 1) % 97;
    return i / 97;
  };
}

/**
 * 以 fixture 建立已 init 的 store。
 * （v0.8，FE-30）主鍵不存在會進入首次模式（契約 FS-1、FS-2，期間不寫入）；為讓既有案例維持一般模式，
 * 預設在假 storage 預寫一筆合法的目前版本（CURRENT_SCHEMA_VERSION，v0.15 起為 3）主鍵（以 buildRecord(defaultData()) 產生）（直接放進 map，不計入 setCalls）。
 * 傳入的 storage 已有主鍵則不動；opts.firstRun = true 時不預寫（測首次模式）。
 * @param {{content?: object, storage?: object, now?: Function, speechSupport?: object, firstRun?: boolean}} [opts]
 * @returns {{store: object, a: object, storage: object}}
 */
function makeStore(opts) {
  const o = opts || {};
  const S = require(path.join(APP_DIR, "state", "store.js"));
  const storage = o.storage || fakeStorage();
  if (!o.firstRun && storage && storage.map instanceof Map && !storage.map.has(MAIN_KEY)) {
    const PERSIST = require(path.join(APP_DIR, "core", "persist.js"));
    storage.map.set(MAIN_KEY, JSON.stringify(PERSIST.buildRecord(PERSIST.defaultData(), new Date("2026-10-29T00:00:00Z"))));
  }
  const store = S.createStore({
    storage: storage,
    content: o.content || loadContent(),
    now: o.now || (() => new Date("2026-10-30T10:00:00")),
    rand: o.rand || seqRand(),
    speechSupport: o.speechSupport
  });
  store.init();
  return { store: store, a: store.actions, storage: storage };
}

/** 自訂單字表單欄位（addCustomWord 的輸入） */
function customFields(word, meaning) {
  return { word: word, meaning: meaning === undefined ? "自訂釋義" : meaning, phonetic: "", pos: "", collocation: "", example: "", academicContext: "" };
}

module.exports = {
  APP_DIR: APP_DIR,
  clone: clone,
  registry: () => clone(REGISTRY),
  builtin: () => clone(BUILTIN),
  manifest: () => clone(MANIFEST),
  license: () => clone(LICENSE),
  templates: () => clone(TEMPLATES),
  part5: () => clone(PART5),
  decoderSentences: () => clone(DECODER_SENTENCES),
  readingStrategies: () => clone(READING_STRATEGIES),
  phrasebank: () => clone(PHRASEBANK),
  globals: globals,
  loadContent: loadContent,
  fakeStorage: fakeStorage,
  seqRand: seqRand,
  makeStore: makeStore,
  customFields: customFields
};
