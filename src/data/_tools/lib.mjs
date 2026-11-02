// lib.mjs — 內容工具共用函式庫（CT-01）
// 依據：docs/02-contract/README.md（v0.4；R3-4／R6-5 起依 v0.6 M-3 補充表；R7-3 起依 v0.7 M-4、M-8）§2 C-1～C-7、§3.2 M-1～M-8、§4.1 R-1～R-8、§4.2 N-1～N-4、§7.0 V-IN-01～07；
//       docs/03-design/architecture.md（v0.3）§3、§8.1～§8.4（含 H-1 繁簡同形白名單）。
// 只使用 Node 內建模組；本目錄以底線開頭，建置時不打包（architecture.md D-1）。
// sources/ 為唯讀輸入，本檔所有函式只讀不寫。

import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

// ─────────────────────────────────────────────────────────────
// 路徑
// ─────────────────────────────────────────────────────────────

/** 專案根目錄（本檔位於 src/data/_tools/）。 */
export const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
/** 預設唯讀輸入目錄。 */
export const DEFAULT_SOURCES_DIR = join(PROJECT_ROOT, "sources");
/** 預設資料檔目錄。 */
export const DEFAULT_DATA_DIR = join(PROJECT_ROOT, "src", "data");

// ─────────────────────────────────────────────────────────────
// 契約常數
// ─────────────────────────────────────────────────────────────

/** 字表代碼，依 R-6 的排序（NGSL → TSL → BSL → NAWL）。 */
export const WORDLIST_ORDER = ["NGSL", "TSL", "BSL", "NAWL"];

/** 契約 §4.3「可收錄 = 是」的字表（R-5、L-1）。 */
export const CONFIRMED_WORDLISTS = ["NGSL", "TSL", "BSL", "NAWL"];

/** 契約 §4.2 紀錄值（V-IN-07、V-VOC-11 比對用）。 */
export const RECORDED = {
  nO: 1000,
  nB: 2809,
  nG: 5620,
  segments: [
    { list: "NGSL", rankFrom: 1, rankTo: 2809 },
    { list: "TSL", rankFrom: 2810, rankTo: 4059 },
    { list: "BSL", rankFrom: 4060, rankTo: 5228 },
    { list: "NAWL", rankFrom: 5229, rankTo: 5620 },
  ],
};

/** BuiltinVocabItem 的 12 個鍵，順序依 data-schema.ts 宣告順序（architecture.md §8.2）。 */
export const VOCAB_KEYS = [
  "rank", "word", "phonetic", "pos", "meaning", "collocation", "academicContext",
  "example", "sources", "phoneticSource", "meaningSource", "contentSource",
];

/** 由撰寫者填入的欄位（fill.mjs 可合併的欄位；meaningSource 另有限制）。 */
export const CONTENT_KEYS = ["phonetic", "pos", "meaning", "collocation", "academicContext", "example"];

/** 骨架欄位（S-2：不得改動）。 */
export const SKELETON_KEYS = ["rank", "word", "sources", "phoneticSource", "contentSource"];

/** PartOfSpeech（data-schema.ts；契約 v0.7 新增 "pref."，畫面「字首」）。 */
export const PART_OF_SPEECH = ["n.", "v.", "adj.", "adv.", "prep.", "conj.", "pron.", "det.", "art.", "num.", "aux.", "int.", "phr.", "pref."];

/**
 * 字庫分檔表（architecture.md §8.1）。academicContextRequired = rankFrom > N_B（AC-06-08）。
 */
export const VOCAB_FILES = [
  ["vocab-0001.js", 1, 400, "CT-03"],
  ["vocab-0401.js", 401, 800, "CT-04"],
  ["vocab-0801.js", 801, 1200, "CT-05"],
  ["vocab-1201.js", 1201, 1600, "CT-06"],
  ["vocab-1601.js", 1601, 2000, "CT-07"],
  ["vocab-2001.js", 2001, 2400, "CT-08"],
  ["vocab-2401.js", 2401, 2809, "CT-09"],
  ["vocab-2810.js", 2810, 3159, "CT-10"],
  ["vocab-3160.js", 3160, 3509, "CT-11"],
  ["vocab-3510.js", 3510, 3859, "CT-12"],
  ["vocab-3860.js", 3860, 4209, "CT-13"],
  ["vocab-4210.js", 4210, 4559, "CT-14"],
  ["vocab-4560.js", 4560, 4909, "CT-15"],
  ["vocab-4910.js", 4910, 5259, "CT-16"],
  ["vocab-5260.js", 5260, 5620, "CT-17"],
].map(([file, rankFrom, rankTo, task]) => ({ file, rankFrom, rankTo, task, academicContextRequired: rankFrom > RECORDED.nB }));

/** 依檔名（basename）找分檔設定；找不到回 null。 */
export function vocabFileInfo(basename) {
  return VOCAB_FILES.find((f) => f.file === basename) || null;
}

/** 其他交付資料檔（契約 §3.1）與其全域變數。 */
export const DATA_FILES = {
  "sources.js": ["DATA_SOURCE_REGISTRY", "VOCAB_MANIFEST", "PROJECT_LICENSE"],
  "templates.js": ["DOMAIN_TEMPLATES"],
  "part5.js": ["PART5_QUESTION_BANK"],
  "decoder.js": ["DECODER_SENTENCES", "READING_STRATEGIES"],
  "phrasebank.js": ["ACADEMIC_PHRASEBANK"],
};

/** V-VOC-17：簡體原檔中需看上下文的七個詞（契約 v0.4 M-3 主表）。 */
export const CONTEXT_TERMS_V04 = ["质量", "程序", "水平", "注册", "文件", "文档", "地铁"];
/**
 * V-VOC-17：契約 v0.6 M-3 補充表（s2twp 過度轉換）新增的比對詞 10 個。
 * 「程序」已在 v0.4 主表；「身份」依契約不列入（s2twp 結果「身分」正確）。
 */
export const CONTEXT_TERMS_V06 = ["支持", "类型", "实例", "触摸", "局部", "保存", "社区", "连接", "循环", "菜单"];
/** V-VOC-17 全部比對詞（v0.4 7 個 + v0.6 10 個 = 17 個）。 */
export const CONTEXT_TERMS = [...CONTEXT_TERMS_V04, ...CONTEXT_TERMS_V06];

/**
 * H-1 繁簡同形白名單（architecture.md v0.3 §8.4，R3-4）：繁體中文本身也使用的字。
 * 只有同時出現在導出字集（simplifiedOnlyChars）中的字元才有作用；命中者由 H-1 錯誤降為 H-1W 警告。
 */
export const H1_HOMOGRAPH_WHITELIST = ["后", "干", "里", "范", "谷", "斗", "丑", "征", "准", "松", "系", "制", "只", "台", "面", "云", "余", "卷", "几", "志", "周", "致", "症"];

/** V-VOC-15（契約 v0.6 M-3 補充表）：meaning 不得含的 s2twp 過度轉換產物。 */
export const MEANING_FORBIDDEN_TERMS = ["例項"];

/**
 * V-VOC-07（契約 v0.7 M-8）：字首義以「（字首）」標示。
 * 只有字首義（meaning 以此開頭）→ pos 必須恰為 ["pref."]；字首義在末段 → pos 最後一個為 "pref."。
 */
export const PREFIX_MEANING_MARK = "（字首）";
export const PREFIX_POS = "pref.";
export const PREFIX_ONLY_POS = ["pref."];

/** M-4：ECDICT translation 開頭縮寫 → PartOfSpeech。 */
export const ECDICT_POS_MAP = {
  "n.": "n.", "v.": "v.", "vt.": "v.", "vi.": "v.", "a.": "adj.", "adj.": "adj.", "ad.": "adv.", "adv.": "adv.",
  "prep.": "prep.", "conj.": "conj.", "pron.": "pron.", "art.": "art.", "num.": "num.", "aux.": "aux.",
  "int.": "int.", "interj.": "int.", "pref.": "pref.",
};

/**
 * 音標允許字元（architecture.md §8.3 P-2、P-3、P-5、P-9）。
 * 多字元母音（eɪ oʊ aɪ aʊ ɔɪ）的組成字元 e、o、a 只能出現在雙母音中（另以 IPA_BARE_VOWEL_RE 檢查）。
 */
export const IPA_ALLOWED_CHARS = new Set([
  // 母音（含雙母音組成字元、捲舌母音）
  "i", "ɪ", "e", "ɛ", "æ", "ɑ", "ɔ", "o", "ʊ", "u", "ʌ", "ə", "a", "ɝ", "ɚ",
  // 子音（tʃ、dʒ 由 t、ʃ、d、ʒ 組成）
  "p", "b", "t", "d", "k", "g", "f", "v", "θ", "ð", "s", "z", "ʃ", "ʒ", "h", "m", "n", "ŋ", "l", "r", "w", "j",
  // 重音、空白、斜線
  "ˈ", "ˌ", " ", "/",
]);

/**
 * P-4 英式符號黑名單（H-2）。sym 為報告用符號，re 為比對規則。
 * R5-2：ɪə 排除美式 aɪə（quiet）、eɪə（player）、ɔɪə（lawyer）；ʊə 排除美式 oʊə（lower）、aʊə（power）。
 */
export const IPA_BRITISH_BLACKLIST = [
  { sym: "əʊ", re: /əʊ/u },
  { sym: "ɒ", re: /ɒ/u },
  { sym: "ɜ", re: /ɜ/u },
  { sym: "ɪə", re: /(?<![aeɔ])ɪə/u },
  { sym: "eə", re: /eə/u },
  { sym: "ʊə", re: /(?<![oa])ʊə/u },
  { sym: "ː", re: /ː/u },
];

/** e 只能接 ɪ、o 只能接 ʊ、a 只能接 ɪ／ʊ（P-2 母音只用列出的組合）。 */
export const IPA_BARE_VOWEL_RE = /e(?!ɪ)|o(?!ʊ)|a(?![ɪʊ])/u;

/** V-VOC-16：ECDICT 舊式標註字元。 */
export const ECDICT_LEGACY_PHONETIC_CHARS = ["'", ":", "ә"];

/** 契約 §4.3 來源登錄期望值（L-3、V-SRC-02）。ORIGINAL 的 version 需等於 VOCAB_MANIFEST.dataVersion（執行時比對）。 */
const CC_URL = "https://creativecommons.org/licenses/by-sa/4.0/";
const NGSL_SITE = "https://www.newgeneralservicelist.com/";
const BY_ORCH = "主控（Claude）代人類查證";
export const EXPECTED_REGISTRY = {
  NGSL: { kind: "wordlist", name: "NGSL", fullName: "New General Service List", version: "1.2", authors: ["Browne, C.", "Culligan, B.", "Phillips, J."], licenseName: "CC BY-SA 4.0", licenseUrl: CC_URL, homepageUrl: NGSL_SITE + "new-general-service-list", originUrl: NGSL_SITE + "new-general-service-list", confirmedAt: "2026-10-29", confirmedBy: BY_ORCH, evidenceUrl: NGSL_SITE + "new-general-service-list" },
  TSL: { kind: "wordlist", name: "TSL", fullName: "TOEIC Service List", version: "1.2", authors: ["Browne, C.", "Culligan, B."], licenseName: "CC BY-SA 4.0", licenseUrl: CC_URL, homepageUrl: NGSL_SITE + "toeic-service-list", originUrl: NGSL_SITE + "toeic-service-list", confirmedAt: "2026-10-29", confirmedBy: BY_ORCH, evidenceUrl: NGSL_SITE + "toeic-service-list" },
  BSL: { kind: "wordlist", name: "BSL", fullName: "Business Service List", version: "1.2", authors: ["Browne, C.", "Culligan, B."], licenseName: "CC BY-SA 4.0", licenseUrl: CC_URL, homepageUrl: NGSL_SITE + "business-service-list", originUrl: NGSL_SITE + "business-service-list", confirmedAt: "2026-10-29", confirmedBy: BY_ORCH, evidenceUrl: NGSL_SITE + "business-service-list" },
  NAWL: { kind: "wordlist", name: "NAWL", fullName: "New Academic Word List", version: "1.2", authors: ["Browne, C.", "Culligan, B.", "Phillips, J."], licenseName: "CC BY-SA 4.0", licenseUrl: CC_URL, homepageUrl: NGSL_SITE + "new-academic-word-list", originUrl: NGSL_SITE + "new-academic-word-list", confirmedAt: "2026-10-29", confirmedBy: BY_ORCH, evidenceUrl: NGSL_SITE + "new-academic-word-list" },
  ECDICT: { kind: "dictionary", name: "ECDICT", fullName: "ECDICT（英漢辭典資料庫）", version: "master@ab22ad3", authors: ["Linwei（skywind3000）"], licenseName: "MIT", licenseUrl: "https://github.com/skywind3000/ECDICT/blob/master/LICENSE", homepageUrl: "https://github.com/skywind3000/ECDICT", originUrl: "https://github.com/skywind3000/ECDICT", confirmedAt: "2026-10-29", confirmedBy: BY_ORCH, evidenceUrl: "https://github.com/skywind3000/ECDICT", modifications: ["簡體轉繁體台灣用語", "精簡釋義"] },
  ORIGINAL: { kind: "original", name: "原創", fullName: "English Master Track 原創內容", version: null, authors: ["JimmyLin"], licenseName: "CC BY-SA 4.0", licenseUrl: CC_URL, homepageUrl: undefined, originUrl: "", confirmedAt: "2026-10-29", confirmedBy: "JimmyLin", evidenceUrl: "docs/01-PRD.md Q-31", modifications: [] },
};

/** L-4：四份字表的 modifications 至少要涵蓋的關鍵詞。 */
export const WORDLIST_MODIFICATION_KEYWORDS = ["合併", "去重", "重新編排頻率排名", "補充"];

/** DataSourceEntry 的 16 個鍵。 */
export const SOURCE_ENTRY_KEYS = [
  "code", "kind", "name", "fullName", "version", "authors", "licenseName", "licenseUrl", "homepageUrl", "originUrl",
  "confirmation", "modifications", "originalItemCount", "includedItemCount", "copyrightNotice", "licenseText",
];

/** ProjectLicenseInfo 固定值（V-SRC-04）。copyrightYear 另檢查為整數。 */
export const EXPECTED_PROJECT_LICENSE = {
  copyrightHolder: "JimmyLin",
  codeLicense: "MIT",
  dataLicense: "CC BY-SA 4.0",
  dataLicenseUrl: CC_URL,
  codeLicenseUrl: "https://opensource.org/license/mit",
};

// ─────────────────────────────────────────────────────────────
// 讀檔（V-IN-01、V-IN-02）與 CSV（M-1）
// ─────────────────────────────────────────────────────────────

/**
 * V-IN-01：以位元組讀檔，UTF-8 嚴格解碼失敗改用 latin-1；去除開頭 BOM。
 * @returns {{ text: string, encoding: "utf-8" | "latin1" }}
 */
export function readTextWithEncoding(path) {
  const bytes = readFileSync(path);
  let text;
  let encoding = "utf-8";
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    // WHATWG TextDecoder 的 "latin1" 實為 windows-1252；改用 Buffer 以確保 ISO-8859-1
    text = Buffer.from(bytes).toString("latin1");
    encoding = "latin1";
  }
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  return { text, encoding };
}

/** V-IN-01：只回傳文字。 */
export function readText(path) {
  return readTextWithEncoding(path).text;
}

/** V-IN-02：換行以 /\r?\n/ 分割。 */
export function splitLines(text) {
  return text.split(/\r?\n/);
}

/**
 * RFC 4180 CSV 解析（M-1）：支援雙引號欄位（欄內含逗號、換行，以 "" 跳脫引號）；列尾 CRLF 或 LF。
 * 不轉換字面兩字元「\n」（義項分隔，見 splitSenses）。
 * @param {string} text
 * @param {{ trim?: boolean }} [opt] trim 預設 true（V-IN-02：每欄 trim，去除殘留 \r）
 * @returns {{ fields: string[], line: number }[]} line = 該列起始的實體行號（1 起算）
 */
export function parseCsv(text, opt = {}) {
  const trim = opt.trim !== false;
  const rows = [];
  let fields = [];
  let field = "";
  let inQuotes = false;
  let line = 1;
  let rowLine = 1;
  let fieldStarted = false; // 本欄是否已有字元（決定引號是否為欄位開頭）
  const pushField = () => { fields.push(trim ? field.trim() : field); field = ""; fieldStarted = false; };
  const pushRow = () => { pushField(); rows.push({ fields, line: rowLine }); fields = []; };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        if (c === "\n") line++;
        field += c;
      }
      continue;
    }
    if (c === '"' && !fieldStarted && field.trim() === "") { inQuotes = true; fieldStarted = true; field = ""; continue; }
    if (c === ",") { pushField(); continue; }
    if (c === "\r" && text[i + 1] === "\n") continue;
    if (c === "\n") { pushRow(); line++; rowLine = line; continue; }
    field += c;
    if (c !== " " && c !== "\t") fieldStarted = true;
  }
  if (field !== "" || fields.length > 0) pushRow();
  return rows;
}

/** M-1：translation／definition 的義項以字面兩字元「\n」分隔。 */
export function splitSenses(s) {
  return String(s || "").split("\\n").map((x) => x.trim()).filter(Boolean);
}

/** C-2 wordKey。 */
export function wordKey(word) {
  return String(word).normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();
}

/** 字元數（以 code point 計，中文 1 字 = 1）。 */
export function charLength(s) {
  return [...String(s)].length;
}

// ─────────────────────────────────────────────────────────────
// 字表（V-IN-03～V-IN-06）與排名（R-1～R-8）
// ─────────────────────────────────────────────────────────────

/** 四份排名用字表的檔案與欄名（契約 §3.2）。NAWL 無表頭、無排名欄。 */
export const WORDLIST_FILES = {
  NGSL: { file: "NGSL_12_stats.csv", header: true, wordCol: "Lemma", rankCol: "SFI Rank", lemmaFile: "NGSL_12_lemmatized_for_teaching.csv" },
  TSL: { file: "TSL_12_stats.csv", header: true, wordCol: "Word", rankCol: "TSL Rank", lemmaFile: "TSL_12_lemmatized_for_teaching.csv" },
  BSL: { file: "BSL_120_stats.csv", header: true, wordCol: "Word", rankCol: "BSL Rank", lemmaFile: "BSL_120_lemmatized_for_teaching.csv" },
  NAWL: { file: "NAWL_12_lemmatized_for_teaching.csv", header: false, wordCol: null, rankCol: null, lemmaFile: "NAWL_12_lemmatized_for_teaching.csv" },
};

/** V-IN-03：空行、全欄皆空、第 1 欄 ## 開頭 → 略過。 */
function isSkippableRow(fields) {
  if (fields.every((f) => f === "")) return true;
  return fields[0].startsWith("##");
}

/**
 * 讀一份排名用字表（V-IN-01～V-IN-06）。
 * @returns {{ code, file, encoding, rows: {line, word, wordKey, rank}[], ordered: 同 rows 但依排名排序, anomalies: string[], report }}
 */
export function loadWordlist(code, sourcesDir = DEFAULT_SOURCES_DIR) {
  const spec = WORDLIST_FILES[code];
  if (!spec) throw new Error(`未知字表代碼：${code}`);
  const path = join(sourcesDir, "wordlists", spec.file);
  const { text, encoding } = readTextWithEncoding(path);
  const parsed = parseCsv(text).filter((r) => !isSkippableRow(r.fields));
  const anomalies = [];
  let wordIdx = 0;
  let rankIdx = -1;
  let data = parsed;
  let headerFields = null;
  if (spec.header) {
    // V-IN-04：第 1 列為表頭，以欄名定位
    const head = parsed[0];
    headerFields = head ? head.fields : [];
    data = parsed.slice(1);
    wordIdx = headerFields.indexOf(spec.wordCol);
    rankIdx = headerFields.indexOf(spec.rankCol);
    if (wordIdx !== 0) anomalies.push(`表頭第 1 欄不是「${spec.wordCol}」（實際：${headerFields[0] ?? "（無）"}）；詞頭仍取第 1 欄（V-IN-05）`);
    if (rankIdx < 0) anomalies.push(`表頭找不到排名欄「${spec.rankCol}」`);
  }
  const rows = [];
  data.forEach((r, i) => {
    const word = r.fields[0];
    if (word === "") { anomalies.push(`第 ${r.line} 行：詞頭為空，略過`); return; }
    let rank;
    if (spec.header) {
      const raw = rankIdx >= 0 ? (r.fields[rankIdx] ?? "") : "";
      if (!/^\d+$/.test(raw)) { anomalies.push(`第 ${r.line} 行：排名欄「${raw}」不是整數（詞頭 ${word}），列入異常、不參與排名`); return; }
      rank = parseInt(raw, 10);
    } else {
      rank = i + 1; // NAWL：依檔案列順序
    }
    rows.push({ line: r.line, word, wordKey: wordKey(word), rank, seq: i });
  });
  // 依排名遞增，同名次依檔案列順序（R-1～R-4）
  const ordered = rows.slice().sort((a, b) => a.rank - b.rank || a.seq - b.seq);
  // V-IN-06 報告
  const seen = new Map();
  const duplicates = [];
  for (const r of rows) {
    if (seen.has(r.wordKey)) duplicates.push({ wordKey: r.wordKey, lines: [seen.get(r.wordKey).line, r.line] });
    else seen.set(r.wordKey, r);
  }
  const nonAscii = rows.filter((r) => /[^\x00-\x7f]/.test(r.word)).map((r) => ({ word: r.word, line: r.line }));
  const rankValues = rows.map((r) => r.rank);
  const report = {
    code, file: `sources/wordlists/${spec.file}`, encoding, header: headerFields,
    dataRows: data.length, validRows: rows.length, uniqueWordKeys: seen.size,
    duplicates, nonAscii, anomalies,
    rankMin: rankValues.length ? Math.min(...rankValues) : null,
    rankMax: rankValues.length ? Math.max(...rankValues) : null,
    rankDuplicates: rankValues.length - new Set(rankValues).size,
  };
  return { code, file: spec.file, encoding, rows, ordered, anomalies, report };
}

/** V-IN-03～05：讀四份排名用字表。 */
export function loadWordlists(sourcesDir = DEFAULT_SOURCES_DIR, codes = CONFIRMED_WORDLISTS) {
  const out = {};
  for (const c of codes) out[c] = loadWordlist(c, sourcesDir);
  return out;
}

/**
 * 依 R-1～R-8 計算排名。未列於 codes（未確認授權）的字表整份略過（R-5）。
 * @returns {{ items: {rank, word, wordKey, sources}[], nB, nG, segments, steps, byKey: Map }}
 */
export function computeRanking(lists, codes = CONFIRMED_WORDLISTS) {
  const order = WORDLIST_ORDER.filter((c) => codes.includes(c) && lists[c]);
  const keySets = {};
  for (const c of order) keySets[c] = new Set(lists[c].rows.map((r) => r.wordKey));
  const items = [];
  const byKey = new Map();
  const segments = [];
  const steps = [];
  for (const c of order) {
    const before = items.length;
    let overlap = 0;
    const inputKeys = new Set();
    for (const r of lists[c].ordered) {
      if (inputKeys.has(r.wordKey)) continue; // 表內重複：只保留第一次出現（R-1）
      inputKeys.add(r.wordKey);
      if (byKey.has(r.wordKey)) { overlap++; continue; }
      const item = { rank: items.length + 1, word: r.word, wordKey: r.wordKey, sources: null, firstList: c };
      items.push(item);
      byKey.set(r.wordKey, item);
    }
    const added = items.length - before;
    steps.push({ list: c, inputRows: lists[c].rows.length, inputUnique: inputKeys.size, overlap, added, cumulative: items.length });
    if (added > 0) segments.push({ list: c, rankFrom: before + 1, rankTo: items.length });
  }
  // R-6：sources 列出全部出現的已確認字表
  for (const it of items) it.sources = order.filter((c) => keySets[c].has(it.wordKey));
  const nB = items.filter((it) => it.sources.includes("NGSL")).length; // R-8
  return { items, nB, nG: items.length, segments, steps, byKey };
}

/** 讀 lemmatized 詞形表：wordKey → 詞形陣列（含詞頭）。不參與排名（R-7），僅供 H-4、素材參考。 */
export function loadLemmaForms(sourcesDir = DEFAULT_SOURCES_DIR) {
  const map = new Map();
  for (const c of WORDLIST_ORDER) {
    const path = join(sourcesDir, "wordlists", WORDLIST_FILES[c].lemmaFile);
    if (!existsSync(path)) continue;
    for (const r of parseCsv(readText(path))) {
      if (isSkippableRow(r.fields)) continue;
      const head = r.fields[0];
      if (!head) continue;
      const k = wordKey(head);
      const set = map.get(k) || new Set([head]);
      for (const f of r.fields) if (f) set.add(f);
      map.set(k, set);
    }
  }
  const out = new Map();
  for (const [k, s] of map) out.set(k, [...s]);
  return out;
}

// ─────────────────────────────────────────────────────────────
// ECDICT（§3.2）
// ─────────────────────────────────────────────────────────────

function loadEcdictCsv(path) {
  const rows = parseCsv(readText(path));
  const header = rows[0].fields;
  const idx = (name) => header.indexOf(name);
  const iw = idx("word"), ip = idx("phonetic"), it = idx("translation"), ipos = idx("pos");
  return rows.slice(1).filter((r) => !r.fields.every((f) => f === "")).map((r) => ({
    word: r.fields[iw], phonetic: r.fields[ip] ?? "", translation: r.fields[it] ?? "", pos: r.fields[ipos] ?? "",
  }));
}

/**
 * 讀 ECDICT 子集（簡體原檔 + 繁體台灣用語版）。
 * @returns {{ map: Map<wordKey, { word, simplified, zhtw, phonetic, pos }>, simplifiedRows, zhtwRows, orderMismatch: number }}
 * phonetic 為 ECDICT 原值（英式舊式標註），只供參考，不得照抄（M-5）。
 */
export function loadEcdict(sourcesDir = DEFAULT_SOURCES_DIR) {
  const simp = loadEcdictCsv(join(sourcesDir, "ecdict", "ecdict_subset.csv"));
  const zh = loadEcdictCsv(join(sourcesDir, "ecdict", "ecdict_subset_zhtw.csv"));
  const zhByKey = new Map(zh.map((r) => [wordKey(r.word), r]));
  let orderMismatch = 0;
  simp.forEach((r, i) => { if (!zh[i] || zh[i].word !== r.word) orderMismatch++; });
  const map = new Map();
  for (const r of simp) {
    const k = wordKey(r.word);
    if (map.has(k)) continue;
    const z = zhByKey.get(k);
    map.set(k, { word: r.word, simplified: r.translation, zhtw: z ? z.translation : null, phonetic: r.phonetic, pos: r.pos });
  }
  return { map, simplifiedRows: simp.length, zhtwRows: zh.length, orderMismatch };
}

/** ecdict_subset_missing.txt → wordKey 集合。 */
export function loadMissing(sourcesDir = DEFAULT_SOURCES_DIR) {
  const set = new Set();
  for (const l of splitLines(readText(join(sourcesDir, "ecdict", "ecdict_subset_missing.txt")))) {
    const t = l.trim();
    if (t) set.add(wordKey(t));
  }
  return set;
}

/** tw_terms.tsv → [{ from, to }]（略過空行與 # 註解行）。 */
export function loadTwTerms(sourcesDir = DEFAULT_SOURCES_DIR) {
  const out = [];
  for (const l of splitLines(readText(join(sourcesDir, "ecdict", "tw_terms.tsv")))) {
    if (!l.trim() || l.trim().startsWith("#")) continue;
    const [from, to] = l.split("\t");
    if (from && from.trim()) out.push({ from: from.trim(), to: (to ?? "").trim() });
  }
  return out;
}

/** sources/ecdict/LICENSE 原文（換行統一為 \n，去除結尾空白行）。 */
export function loadEcdictLicense(sourcesDir = DEFAULT_SOURCES_DIR) {
  return readText(join(sourcesDir, "ecdict", "LICENSE")).replace(/\r\n/g, "\n").replace(/\s+$/, "");
}

/**
 * H-1：簡體專用字集 = 簡體原檔 translation 出現、但 _zhtw translation 從未出現的漢字。
 * 只取漢字（\p{Script=Han}），標點與英數不列入。
 */
export function simplifiedOnlyChars(ecdict) {
  const zhChars = new Set();
  const simpChars = new Set();
  for (const v of ecdict.map.values()) {
    for (const ch of v.zhtw ?? "") zhChars.add(ch);
    for (const ch of v.simplified ?? "") simpChars.add(ch);
  }
  const out = new Set();
  for (const ch of simpChars) if (/\p{Script=Han}/u.test(ch) && !zhChars.has(ch)) out.add(ch);
  return out;
}

/**
 * H-1／H-1W（R3-4）：把導出字集依白名單拆成兩組。
 * @returns {{ derived: Set<string>, errorChars: Set<string>, warnChars: Set<string> }}
 *   derived = 導出字集（扣除前）；errorChars = 扣除白名單後（H-1 錯誤）；warnChars = 白名單 ∩ 導出字集（H-1W 警告）
 */
export function splitH1Chars(derived, whitelist = H1_HOMOGRAPH_WHITELIST) {
  const wl = new Set(whitelist);
  const errorChars = new Set();
  const warnChars = new Set();
  for (const ch of derived) (wl.has(ch) ? warnChars : errorChars).add(ch);
  return { derived, errorChars, warnChars };
}

/** V-VOC-17：簡體 translation 命中的 CONTEXT_TERMS。 */
export function contextHits(simplified) {
  return CONTEXT_TERMS.filter((t) => String(simplified || "").includes(t));
}

// ─────────────────────────────────────────────────────────────
// 資料檔
// ─────────────────────────────────────────────────────────────

/**
 * 以 node:vm 在 { window: {} } 沙箱執行資料檔（C-4）並回傳 window。
 * 執行失敗會拋出 Error（呼叫端負責攔截）。
 */
export function loadDataFile(path) {
  const code = readText(path);
  const sandbox = { window: {} };
  vm.runInNewContext(code, sandbox, { filename: path, timeout: 10000 });
  return sandbox.window;
}

/** 依 VOCAB_KEYS 順序重建物件（多餘鍵附在最後，以便驗證器偵測）。 */
export function orderVocabItem(item) {
  const out = {};
  for (const k of VOCAB_KEYS) if (Object.prototype.hasOwnProperty.call(item, k)) out[k] = item[k];
  for (const k of Object.keys(item)) if (!VOCAB_KEYS.includes(k)) out[k] = item[k];
  return out;
}

/** architecture.md §8.2 分檔格式。 */
export function serializeVocabFile(items, rankFrom, rankTo) {
  const sorted = items.slice().sort((a, b) => a.rank - b.rank);
  const lines = sorted.map((it) => JSON.stringify(orderVocabItem(it)));
  return [
    `// 內建字庫 排名 ${rankFrom}～${rankTo}（契約 §3.1；由 _tools 產生，請勿手動調整骨架欄位）`,
    "window.MASTER_VOCAB_DATABASE = (window.MASTER_VOCAB_DATABASE || []).concat([",
    lines.join(",\n"),
    "]);",
    "",
  ].join("\n");
}

// ─────────────────────────────────────────────────────────────
// 其他共用
// ─────────────────────────────────────────────────────────────

/** mulberry32 固定種子 PRNG，回傳 [0, 1) 的函式。 */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 簡易參數解析：--key value、--flag。 */
export function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const k = a.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("--")) { out[k] = next; i++; }
      else out[k] = true;
    } else out._.push(a);
  }
  return out;
}

// ─────────────────────────────────────────────────────────────
// 直接執行（node lib.mjs --help／--ranking／--report）
// ─────────────────────────────────────────────────────────────

const LIB_HELP = `用法：
  node src/data/_tools/lib.mjs --help                 顯示本說明
  node src/data/_tools/lib.mjs --ranking [--sources <目錄>]   依 R-1～R-8 重算並印出 N_B、N_G、區段、各步驟新增數（V-IN-07）
  node src/data/_tools/lib.mjs --report  [--sources <目錄>]   印出四份字表的 V-IN-06 報告與 H-1 簡體專用字集大小

本檔主要作為其他工具的函式庫（import "./lib.mjs"），匯出：
  讀檔：readText、readTextWithEncoding（V-IN-01）、splitLines（V-IN-02）、parseCsv（RFC 4180，M-1）、splitSenses
  字表：wordKey（C-2）、loadWordlist、loadWordlists（V-IN-03～06）、computeRanking（R-1～R-8）、loadLemmaForms
  ECDICT：loadEcdict、loadMissing、loadTwTerms、loadEcdictLicense、simplifiedOnlyChars（H-1）、splitH1Chars（H-1／H-1W）、contextHits（V-VOC-17）
  資料檔：loadDataFile（node:vm 沙箱）、serializeVocabFile（architecture.md §8.2 格式）、orderVocabItem
  常數：VOCAB_FILES（§8.1 15 檔）、VOCAB_KEYS、RECORDED（§4.2）、CONTEXT_TERMS（V-VOC-17，17 詞）、H1_HOMOGRAPH_WHITELIST（23 字）、
        MEANING_FORBIDDEN_TERMS（V-VOC-15）、PREFIX_MEANING_MARK、PREFIX_POS、PREFIX_ONLY_POS（V-VOC-07／M-8 v0.7）、IPA_ALLOWED_CHARS、
        IPA_BRITISH_BLACKLIST、EXPECTED_REGISTRY（§4.3）、EXPECTED_PROJECT_LICENSE、PART_OF_SPEECH、ECDICT_POS_MAP
  其他：mulberry32、parseArgs`;

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = parseArgs(process.argv.slice(2));
  const dir = resolve(a.sources && a.sources !== true ? a.sources : DEFAULT_SOURCES_DIR);
  try {
    if (a.ranking) {
      const R = computeRanking(loadWordlists(dir));
      console.log(`N_B = ${R.nB}（契約 ${RECORDED.nB}）　N_G = ${R.nG}（契約 ${RECORDED.nG}）`);
      for (const s of R.steps) console.log(`  ${s.list}：輸入 ${s.inputRows}、不重複 ${s.inputUnique}、與先前重疊 ${s.overlap}、新增 ${s.added}、累計 ${s.cumulative}`);
      for (const s of R.segments) console.log(`  區段 ${s.list} ${s.rankFrom}～${s.rankTo}`);
      const same = R.nB === RECORDED.nB && R.nG === RECORDED.nG && JSON.stringify(R.segments) === JSON.stringify(RECORDED.segments);
      console.log(same ? "與契約 §4.2 一致" : "與契約 §4.2 不一致（依 N-1 回報）");
      process.exitCode = same ? 0 : 1;
    } else if (a.report) {
      const lists = loadWordlists(dir);
      for (const c of CONFIRMED_WORDLISTS) {
        const r = lists[c].report;
        console.log(`${c}　${r.file}　編碼 ${r.encoding}　資料列 ${r.dataRows}　有效 ${r.validRows}　不重複 wordKey ${r.uniqueWordKeys}　表內重複 ${r.duplicates.length}　非 ASCII 詞頭 ${r.nonAscii.map((x) => x.word).join("、") || "無"}　排名 ${r.rankMin}～${r.rankMax}（重複名次 ${r.rankDuplicates}）　異常 ${r.anomalies.length}`);
      }
      const h1 = splitH1Chars(simplifiedOnlyChars(loadEcdict(dir)));
      console.log(`H-1 簡體專用字集：導出 ${h1.derived.size} 字；扣除繁簡同形白名單後 ${h1.errorChars.size} 字（錯誤）；降為警告 H-1W ${h1.warnChars.size} 字：${[...h1.warnChars].join("") || "無"}`);
    } else console.log(LIB_HELP);
  } catch (e) { console.error(`lib.mjs：${e.message}`); process.exitCode = 1; }
}
