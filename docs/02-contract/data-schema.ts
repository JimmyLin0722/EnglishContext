/**
 * ---
 * doc: CONTRACT-SCHEMA
 * version: 0.9
 * status: approved
 * author: sa-agent
 * approved_by: JimmyLin（授權主控代核）
 * approved_at: 2026-11-02
 * ---
 *
 * English Master Track — 資料契約（型別定義）
 *
 * 上游：docs/01-PRD.md v0.9（approved，JimmyLin，2026-11-02），以第 6 章「人類決議」與 R-15～R-18 為準。
 * v0.8 含 localStorage 持久化結構變更（schemaVersion 1 → 2，PRD R-17 人類已同意），依 PRD R-17 須由人類核准，不適用主控代核。
 * v0.9（PRD R-18）**不改**持久化結構：schemaVersion 維持 2，PersistedData／StorageRecord／BackupFile 欄位不變，storage-schema.json 未修改。
 * 畫面名稱（R-15）：「抽認卡」→「單字卡」、「Part 5」（本系統功能）→「模擬測驗」、「自訂器」→「難易度設定」。
 *   只改畫面文字與註解用語；識別字（型別名、欄位名、TabId 值 "flashcards"／"part5"／"customizer"、localStorage 鍵名）一律不改。
 * 參考：english_master_track.md 2.2（僅供參考；tier / tierLabel / options / correctIndex
 *       依 Q-01、Q-03、Q-09、R-07 已廢除，改用頻率排名 rank 與執行期產生選項）。
 * 搭配文件：docs/02-contract/storage-schema.json（localStorage 與備份檔的 JSON Schema）、
 *           docs/02-contract/README.md（總覽、驗證規則 V-xx、授權確認紀錄、回饋上游）。
 *
 * 本檔是「規格」不是實作：
 * - pg-content 依 §2～§7 產出 src/data/ 的資料檔；pg-frontend 依 §1、§8～§11 實作 src/app/。
 * - 兩方都不得自創欄位；欄位變更必須先改本契約（版本遞增）。
 * - 下方的 export const 是契約常數（值本身就是規格），pg-frontend 實作時須使用相同數值。
 *
 * ── 共通約定（全檔適用）──────────────────────────────────────────────
 * C-1 字串：一律 UTF-8；「非空」指 trim() 後長度 ≥ 1。中文用繁體中文（台灣用語）。
 * C-2 wordKey（單字比對鍵）：word.normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase()。
 *     用於：內建字庫去重（AC-03-07）、自訂單字重複判斷（AC-04-06）、範本注入去重（AC-05-02、AC-05-04）、
 *     已掌握單字集合（AC-17-03）、匯入略過判斷（AC-24-08）。
 * C-3 日期：本地日期一律 "YYYY-MM-DD"（裝置本地時區，AC-17-02）；時間戳一律 ISO 8601（含時區，如 "2026-10-29T08:30:00.000Z"）。
 * C-4 資料檔格式：每個資料檔只含「對 window 全域變數賦值」的敘述，右值必須是 JSON 相容字面值
 *     （不可含函式、undefined、註解以外的運算式），以便 Node 驗證與檔案大小控制（AC-19-04）。
 * C-5 原創標記：所有原創內容的來源標記固定為字串 "ORIGINAL"，畫面顯示為「原創」（AC-23-04）。
 *
 * ── 變更紀錄 ──────────────────────────────────────────────────────────
 * | 版本 | 日期       | 作者     | 說明 |
 * | 0.1  | 2026-10-29 | sa-agent | 初版。 |
 * | 0.2  | 2026-10-29 | sa-agent | 依主控 2026-10-29 連網查證：TSL、BSL、ECDICT 授權改為已確認；N_B = 2,809、N_G = 5,620 寫入註解；
 * |      |            |          | DataSourceEntry 新增必填欄位 copyrightNotice、licenseText（MIT 聲明保留，R-06(2)）；
 * |      |            |          | originalItemCount 改定義為「輸入檔實際詞頭數」；範例作者改為官網原文寫法。PersistedData 無變更（schemaVersion 仍為 1）。 |
 * | 0.3  | 2026-10-30 | sa-agent | 依 PRD v0.5 R-12（FB-12 決議 A）：DomainTemplate.words 註解改為 business 必含 Monetization；
 * |      |            |          | CustomVocabItem 範例由 Synergy 改為 Monetization（對應 AC-04-07）。型別與常數無增減；PersistedData 無變更（schemaVersion 仍為 1）。 |
 * | 0.4  | 2026-10-30 | sa-agent | 依 PRD v0.6 R-13（FB-10 決議）：BuiltinVocabItem.phoneticSource 型別由 DictFieldSource 收窄為 OriginalMarker
 * |      |            |          | （音標一律原創美式 IPA）；DictFieldSource 改為只供 meaningSource 使用；BuiltinVocabItem 範例 phoneticSource 改為 "ORIGINAL"；
 * |      |            |          | 新增卡片出處顯示規則（README L-6）；DataSourceEntry 的 ECDICT version = "master@ab22ad3"、modifications 恰為
 * |      |            |          | ["簡體轉繁體台灣用語", "精簡釋義"]、includedItemCount 只計 meaningSource。型別數（55）與契約常數數（14）不變；
 * |      |            |          | PersistedData 無變更（schemaVersion 仍為 1）。 |
 * | 0.5  | 2026-10-30 | sa-agent | 修訂已核准的 v0.4（/pg-run 階段 SD、PG 回饋，README §9.1 DF-01～DF-06）；status 改回 draft，與 README、
 * |      |            |          | storage-schema.json 同步（SD-FB-04）。只補註解：StudyCard 去重只比對本次截取的內建卡（V-ST-04）；
 * |      |            |          | CustomVocabItem.id 註明匯入例外（IM-1）；BackupFile.exportedAt 強制 date-time、頂層不得有多餘欄位（IM-2）；
 * |      |            |          | ImportResult.fileVersion 非數值一律 null（IM-3）；BuiltinVocabItem.word 註明單字 null 照常收錄（V-VOC-10）。型別數（55）與契約常數數（14）不變；
 * |      |            |          | PersistedData 無變更（schemaVersion 仍為 1）。 |
 * | 0.6  | 2026-10-30 | sa-agent | 修訂已核准的 v0.5（/pg-run 後段回饋，README §9.2 DF-07～DF-10）；status 改回 draft，三檔同步。
 * |      |            |          | 執行期型別 ImportErrorCode 新增 "write_failed"（README IM-6、IM-7，FE-07 #3）；STORAGE_KEYS 註明重設時機（RS-1～RS-4）；
 * |      |            |          | BuiltinVocabItem.pos 註明字首字寫法（M-8，不新增 PartOfSpeech 值）、meaning 註明過度轉換還原與原檔錯字更正；
 * |      |            |          | DataSourceEntry.includedItemCount 註明 ECDICT 以 CT-23 為準、畫面只顯示本欄（FB-20 結案）。
 * |      |            |          | 型別數（55）與契約常數數（14）不變；PersistedData／StorageRecord／BackupFile 無變更（schemaVersion 仍為 1）。 |
 * | 0.7  | 2026-10-30 | sa-agent | 修訂已核准的 v0.6，依人類決議（JimmyLin，2026-10-30）：
 * |      |            |          | FB-25 採用新增詞性：PartOfSpeech 新增 "pref."；契約常數 POS_LABELS 內容變更，新增 "pref.": "字首"（共 14 項）；
 * |      |            |          | BuiltinVocabItem.pos 註解改依 README M-8 v0.7（只有字首義 → 恰為 ["pref."]；有獨立用法且 meaning 末段為字首義 → "pref." 放 pos 最後）。
 * |      |            |          | FB-24 定案：ImportErrorCode 註解 write_failed 畫面文字定為「儲存失敗，未匯入」（去掉「暫定」）。
 * |      |            |          | 型別數（55）與契約常數數（14）不變；CustomVocabItem.pos、TemplateWord.pos 仍為自由字串，不受影響；
 * |      |            |          | PersistedData／StorageRecord／BackupFile 無變更（schemaVersion 仍為 1，不需遷移）。 |
 * | 0.8  | 2026-10-30 | sa-agent | 修訂已核准的 v0.7，依 PRD v0.8（R-15、R-16、R-17、US-25～US-31）。status 改回 draft，三檔同步。
 * |      |            |          | (1) 持久化結構變更：CURRENT_SCHEMA_VERSION 1 → 2、SUPPORTED_SCHEMA_VERSIONS [1] → [1, 2]；
 * |      |            |          |     PersistedData 新增必填欄位 todayLearned（新型別 TodayLearnedState）、learnedHistory（新型別 LearnedHistory）；
 * |      |            |          |     v1 → v2 遷移補預設值（README §5.3 MG-1～MG-4）；BackupFile 匯出版本 2、可匯入 1 與 2。
 * |      |            |          | (2) 新增契約常數 LEARNED_HISTORY_DAYS（30）、DASHBOARD_CHART_DAYS（7）、TAB_LABELS、NAV_TAB_ORDER。
 * |      |            |          | (3) 新增執行期型別 EntryMode、LearningEventKind；RuntimeState 新增 entryMode、learningQuotaNoticeShown。
 * |      |            |          | (4) R-15 更名：註解中的畫面用語改為「單字卡」「模擬測驗」「難易度設定」，識別字不改。
 * |      |            |          | 型別數 55 → 59（interface 28、type 31）；契約常數 14 → 18；localStorage 鍵數維持 2。 |
 * | 0.9  | 2026-11-02 | sa-agent | 修訂已核准的 v0.8，依 PRD v0.9（R-18、US-32、US-33、AC-20-04、Q-36～Q-38）。status 改回 draft。
 * | 0.9  | 2026-11-02 | 主控 | 主控代核：未改 PRD、未改持久化結構（schemaVersion 維持 2），符合 CLAUDE.md 授權範圍。 |
 * |      |            |          | (1) 隱藏解碼器、句型庫（R-18 三）：NAV_TAB_ORDER 由 6 項改為 4 項；新增契約常數 HIDDEN_TAB_IDS；
 * |      |            |          |     TabId、TAB_LABELS、RuntimeState.decoder／phrasebank 與 decoder.js、phrasebank.js 的型別保留不變（程式碼與資料保留）。
 * |      |            |          | (2) 初始化學習紀錄（R-18 一、US-32）：新增契約常數 LEARNING_PROGRESS_FIELDS（初始化時清除的 6 個 PersistedData 欄位）；
 * |      |            |          |     PersistedData、相關型別註解補「初始化時清除／保留」；規則見 README §5.7 CI-1～CI-10。
 * |      |            |          | (3) 收音條（R-18 二、US-33）：RuntimeState 禁放清單補 MediaStream、AudioContext、AnalyserNode 與音量數值；
 * |      |            |          |     門檻 T1～T5 屬架構常數，契約不定義（README §9.3 DS-01）。
 * |      |            |          | 型別數 59 不變；契約常數 18 → 20；localStorage 鍵數維持 2；持久化結構不變，schemaVersion 維持 2。 |
 */

// ════════════════════════════════════════════════════════════════════
// §1 色級（ETS 證書顏色）— 提供者：契約常數（pg-frontend 實作）
// ════════════════════════════════════════════════════════════════════

/**
 * 色級代碼。依序為 橘、棕、綠、藍、金（AC-01-01 的顯示順序）。
 * 對應：FR-1.1、FR-1.2、AC-01-01、AC-02-04、Q-01。
 */
export type ColorLevel = "orange" | "brown" | "green" | "blue" | "gold";

/**
 * 本版開放的色級（可作為「生效色級」的值）。藍、金鎖定（Q-03）。
 * 對應：AC-01-07、AC-03-03、AC-18-02。
 */
export type OpenColorLevel = "orange" | "brown" | "green";

/** 色級開放狀態。"open" = 開放；"locked" = 鎖定並標「即將開放」（AC-01-01）。 */
export type ColorLevelStatus = "open" | "locked";

/**
 * 字量符號。實際數值見 README §4.2「字量紀錄」（v0.2 起為實際值）。
 * - "N_O"：1,000（Q-29 定案；NGSL SFI Rank 1～1000）
 * - "N_B"：NGSL 去重後實際字數 = 2,809（Q-30：功能詞不扣除）
 * - "N_G"：NGSL + TSL + BSL + NAWL 去重後實際字數 = 5,620（R-05、E-36；四份字表授權皆已確認）
 * N_B、N_G 為主控以 sources/wordlists 檔案試算之值；pg-content 產出時須以 C-2 wordKey 重新計算驗證，
 * 不一致時以驗證結果回報（README §4.2）。前端一律以實際資料計算，不得寫死（V-VOC-12）。
 */
export type VocabTargetSymbol = "N_O" | "N_B" | "N_G";

/**
 * 色級定義。對應：FR-1.1、FR-1.2、AC-01-01、AC-02-03、AC-02-04、AC-02-05、AC-02-10、Q-25、Q-28。
 */
export interface ColorLevelDefinition {
  /** 必填。色級代碼。 */
  id: ColorLevel;
  /** 必填。畫面名稱，值域 "橘" | "棕" | "綠" | "藍" | "金"。 */
  nameZh: "橘" | "棕" | "綠" | "藍" | "金";
  /** 必填。分數下限（含），5 的倍數。例：470。 */
  scoreMin: number;
  /** 必填。分數上限（含），5 的倍數。例：725。 */
  scoreMax: number;
  /** 必填。本版開放狀態。 */
  status: ColorLevelStatus;
  /** 必填。每日新字量 W_d（字/天）。藍、金的 20 僅供試算（Q-28）。 */
  dailyNewWords: number;
  /** 必填。建議字量符號；藍、金為 null，畫面顯示「待定」（AC-01-01、AC-02-10）。 */
  vocabTarget: VocabTargetSymbol | null;
  /** 必填。適用情境說明（AC-01-01）。不得含「官方門檻」「Tier」字樣。 */
  scenarioZh: string;
}

/**
 * 色級定義表（契約常數，值依 PRD 色級定義表）。
 * 判定規則：Color(S) = scoreMin ≤ S ≤ scoreMax 的那一列。
 * 生效色級 = Color(S) 為藍或金時取 "green"，否則同 Color(S)（PRD 名詞定義）。
 */
export const COLOR_LEVELS: readonly ColorLevelDefinition[] = [
  { id: "orange", nameZh: "橘", scoreMin: 10,  scoreMax: 215, status: "open",   dailyNewWords: 10, vocabTarget: "N_O", scenarioZh: "入門：最高頻的生活基礎字彙" },
  { id: "brown",  nameZh: "棕", scoreMin: 220, scoreMax: 465, status: "open",   dailyNewWords: 10, vocabTarget: "N_B", scenarioZh: "基礎：日常溝通與簡單職場用語" },
  { id: "green",  nameZh: "綠", scoreMin: 470, scoreMax: 725, status: "open",   dailyNewWords: 15, vocabTarget: "N_G", scenarioZh: "大學畢業門檻、基礎商務日常、職場多數情境、碩士先修" },
  { id: "blue",   nameZh: "藍", scoreMin: 730, scoreMax: 855, status: "locked", dailyNewWords: 20, vocabTarget: null,  scenarioZh: "高階商務談判、複雜文獻流暢處理" },
  { id: "gold",   nameZh: "金", scoreMin: 860, scoreMax: 990, status: "locked", dailyNewWords: 20, vocabTarget: null,  scenarioZh: "專業熟練者、近母語水準" },
] as const;

/** 分數規則（Q-12）：範圍 10～990、步進 5、預設 600；非 5 的倍數四捨五入到最近的 5 的倍數（AC-02-09）。 */
export const SCORE_MIN = 10;
export const SCORE_MAX = 990;
export const SCORE_STEP = 5;
export const SCORE_DEFAULT = 600;

/** 橘色建議字量 N_O（Q-29 定案）。N_B（紀錄值 2,809）、N_G（紀錄值 5,620）由資料計算，不設常數，見 §2 VocabManifest 與 README §4.2。 */
export const N_O = 1000;

// ════════════════════════════════════════════════════════════════════
// §2 資料來源與授權 — 提供者：pg-content（src/data/sources.js）
//    全域變數：window.DATA_SOURCE_REGISTRY、window.VOCAB_MANIFEST、window.PROJECT_LICENSE
// ════════════════════════════════════════════════════════════════════

/** 外部字表代碼。對應：AC-03-08、AC-23-01、AC-23-03、Q-06。 */
export type WordListCode = "NGSL" | "TSL" | "BSL" | "NAWL";

/** 外部辭典代碼（v0.4 起只作為詞性、釋義來源；音標一律原創，R-13）。對應：AC-23-01、AC-23-03。 */
export type DictionaryCode = "ECDICT";

/** 原創標記（共通約定 C-5）。對應：AC-23-04、Q-06、Q-31。 */
export type OriginalMarker = "ORIGINAL";

/** 所有來源代碼。 */
export type SourceCode = WordListCode | DictionaryCode | OriginalMarker;

/** 來源種類。"wordlist" = 字表；"dictionary" = 辭典；"original" = 本專案原創。 */
export type SourceKind = "wordlist" | "dictionary" | "original";

/** 授權名稱。新增其他授權需先改契約。 */
export type LicenseName = "CC BY-SA 4.0" | "MIT";

/**
 * 授權確認狀態。對應：AC-23-05、NFR-3、E-36、R-05、R-06。
 * - "confirmed"：已到原始官網或原始 GitHub 確認授權，可收錄。
 * - "unconfirmed"：尚未確認，**不可收錄**（內建字庫 sources 不得含該代碼）。
 * - "rejected"：已確認授權不相容，**不可收錄**。
 */
export type LicenseConfirmationStatus = "confirmed" | "unconfirmed" | "rejected";

/** 授權確認紀錄。對應：AC-23-05。權威紀錄在 README §4.3；資料檔只收 status = "confirmed" 的來源。 */
export interface LicenseConfirmation {
  /** 必填。確認狀態。 */
  status: LicenseConfirmationStatus;
  /** confirmed 時必填 "YYYY-MM-DD"；其他狀態為 null。例："2026-10-29"。 */
  confirmedAt: string | null;
  /** confirmed 時必填，確認人。例："主控（AMS orchestrator）"。其他狀態為 null。 */
  confirmedBy: string | null;
  /** confirmed 時必填，確認所依據的原始官網或原始 GitHub 頁面網址。其他狀態可為 null。 */
  evidenceUrl: string | null;
  /** 選填。備註（例：「官網原文：CC BY-SA 4.0 International」）。 */
  note?: string;
}

/**
 * 來源登錄（一筆 = 一份外部資料或原創內容）。
 * 對應：AC-23-01（卡片出處文字）、AC-23-02（資料來源與授權頁）、AC-23-03、AC-23-05。
 * 例：{ code: "NGSL", kind: "wordlist", name: "NGSL", fullName: "New General Service List", version: "1.2", ... }
 */
export interface DataSourceEntry {
  /** 必填。來源代碼，於陣列中唯一。 */
  code: SourceCode;
  /** 必填。來源種類；code 為字表代碼時必為 "wordlist"，"ECDICT" 為 "dictionary"，"ORIGINAL" 為 "original"。 */
  kind: SourceKind;
  /** 必填。卡片上顯示的簡稱。例："NGSL"、"ECDICT"、"原創"。 */
  name: string;
  /** 必填。全名。例："New General Service List"、"English Master Track 原創內容"。 */
  fullName: string;
  /** 必填。版本字串。例：字表 "1.2"；ECDICT 固定 "master@ab22ad3"（sources/ecdict/SOURCE.txt）；ORIGINAL 填資料版本（同 VocabManifest.dataVersion）。 */
  version: string;
  /**
   * 必填，至少 1 位。原作者，依官網原文寫法（README §4.3）。
   * 例：NGSL、NAWL 為 ["Browne, C.", "Culligan, B.", "Phillips, J."]；TSL、BSL 為 ["Browne, C.", "Culligan, B."]；
   *     ECDICT 為 ["Linwei（skywind3000）"]；ORIGINAL 為 ["JimmyLin"]。
   */
  authors: string[];
  /** 必填。授權名稱。 */
  licenseName: LicenseName;
  /** 必填。授權條款網址。例："https://creativecommons.org/licenses/by-sa/4.0/"。 */
  licenseUrl: string;
  /** 必填。官網網址（AC-23-02）；ORIGINAL 可填專案公開網址，尚無時填 ""。 */
  homepageUrl: string;
  /** 必填。原始官網或原始 GitHub 網址（AC-23-05）。ORIGINAL 填 ""。 */
  originUrl: string;
  /** 必填。授權確認紀錄。資料檔中 status 必須為 "confirmed"（V-SRC-02）。 */
  confirmation: LicenseConfirmation;
  /**
   * 必填，可為空陣列。本系統對該來源做的修改（AC-23-02、R-06(1)、README L-4）。
   * 字表例：["合併 NGSL、TSL、BSL、NAWL 並去重", "重新編排頻率排名", "補充搭配詞、例句、學術情境欄位"]。
   * ECDICT 恰為 ["簡體轉繁體台灣用語", "精簡釋義"]（v0.4，AC-23-02）；音標改寫屬原創，不得列入 ECDICT 的修改。
   * ORIGINAL 為 []。
   */
  modifications: string[];
  /**
   * 必填。原始資料筆數 = 該字表輸入檔（sources/wordlists/）去除表頭、空行、"##" 註解行後的不重複 wordKey 數；
   * 辭典與原創填 null。官網公布字數僅記錄於 README §4.3，與此值可能不同（例：BSL 官網 1,700、檔案 1,744）。
   * 例：NGSL 2809、TSL 1250、BSL 1744、NAWL 959（皆待 pg-content 驗證）。BSL、NAWL 與官網的差異無法從檔案解釋，以檔案為準（FB-20）。
   */
  originalItemCount: number | null;
  /**
   * 必填。內建字庫中引用此代碼的筆數：字表 = sources 含此代碼的筆數；ECDICT = meaningSource = "ECDICT" 的筆數
   * （v0.4 起 phoneticSource 恆為 "ORIGINAL"，不計入；上限 5616，v0.6 起預期因 M-6 改標原創而減少，
   * 最終實數以 CT-23 計算結果為準，README N-3）；ORIGINAL 填 null。
   * 「資料來源與授權」頁只顯示本欄，不顯示 originalItemCount 與官網字數（README FB-20，已結案）。
   */
  includedItemCount: number | null;
  /**
   * 必填（v0.2 新增）。原始著作權聲明行，原文照錄；無則 null。
   * ECDICT 必填 "Copyright (c) 2025 Linwei"（取自 LICENSE 檔原文）；CC BY-SA 字表與 ORIGINAL 填 null。
   * 「資料來源與授權」頁以純文字顯示（AC-23-02、R-06(2)）。
   */
  copyrightNotice: string | null;
  /**
   * 必填（v0.2 新增）。授權全文，原文照錄（保留換行 "\n"）；licenseName = "MIT" 時必填非空，其他填 null。
   * ECDICT 取自主控提供的 sources/ecdict/LICENSE（README §3.2）；不得自行改寫或憑記憶撰寫。
   * MIT 條款要求再散布時保留著作權聲明與許可聲明，故「資料來源與授權」頁需可展開顯示此全文（R-06(2)、AC-23-02）。
   */
  licenseText: string | null;
}

/**
 * 字庫排名區段（說明某段排名的字來自哪份字表）。對應：AC-03-08、R-05。
 * 例：{ list: "NGSL", rankFrom: 1, rankTo: 2809 }。
 * v0.2 預期值（待 pg-content 驗證）：NGSL 1～2809、TSL 2810～4059、BSL 4060～5228、NAWL 5229～5620。
 */
export interface RankSegment {
  /** 必填。該區段字的歸屬字表（依排名規則的「第一個出現字表」）。 */
  list: WordListCode;
  /** 必填。起始排名（含），≥ 1。 */
  rankFrom: number;
  /** 必填。結束排名（含），≥ rankFrom。 */
  rankTo: number;
}

/**
 * 內建字庫摘要（供 pg-content 自我驗證與 QA 對照 README §4.2；pg-frontend 以實際資料計算為準，見 V-VOC-12）。
 * 對應：AC-03-06、AC-03-08、AC-03-09、AC-23-05。
 */
export interface VocabManifest {
  /** 必填。資料版本，格式 "YYYY.MM.DD" 或 "YYYY.MM.DD-n"。例："2026.11.05"。 */
  dataVersion: string;
  /** 必填。固定 1000（= N_O）。 */
  nO: 1000;
  /** 必填。N_B = sources 含 "NGSL" 的筆數 = NGSL 去重字數。v0.2 紀錄值 2809。 */
  nB: number;
  /** 必填。N_G = MASTER_VOCAB_DATABASE 總筆數。v0.2 紀錄值 5620。 */
  nG: number;
  /** 必填。排名區段，依排名遞增、首尾相接、涵蓋 1～nG；順序固定 NGSL → TSL → BSL → NAWL（未收錄者略過）。 */
  segments: RankSegment[];
}

/**
 * 專案授權資訊。對應：AC-23-02、AC-23-06、Q-31、R-06。
 * 聲明文字由 pg-frontend 依 AC-23-02 原文組字；本物件只提供數值。
 */
export interface ProjectLicenseInfo {
  /** 必填。著作權人，固定 "JimmyLin"（Q-31）。 */
  copyrightHolder: "JimmyLin";
  /** 必填。MIT 聲明年份（R-06(5)：交付年份）。例：2026。 */
  copyrightYear: number;
  /** 必填。程式碼授權，固定 "MIT"。 */
  codeLicense: "MIT";
  /** 必填。單字資料與原創內容授權，固定 "CC BY-SA 4.0"。 */
  dataLicense: "CC BY-SA 4.0";
  /** 必填。固定 "https://creativecommons.org/licenses/by-sa/4.0/"。 */
  dataLicenseUrl: string;
  /** 必填。固定 "https://opensource.org/license/mit"。 */
  codeLicenseUrl: string;
}

// ════════════════════════════════════════════════════════════════════
// §3 內建字庫 — 提供者：pg-content（src/data/vocab-*.js，可分檔）
//    全域變數：window.MASTER_VOCAB_DATABASE（BuiltinVocabItem[]）
// ════════════════════════════════════════════════════════════════════

/**
 * 內建單字詞性代碼。畫面標籤見 POS_LABELS。
 * "pref."（v0.7 新增，人類決議 FB-25）：字首，只能依 README M-8 使用（只有字首義 → 恰為 ["pref."]；
 *   有獨立用法且 meaning 末段為字首義 → 放在 pos 最後）。
 * 對應：AC-06-02、FR-2.1。
 */
export type PartOfSpeech =
  | "n." | "v." | "adj." | "adv." | "prep." | "conj."
  | "pron." | "det." | "art." | "num." | "aux." | "int." | "phr." | "pref.";

/** 詞性畫面標籤（契約常數，共 14 項；v0.7 新增 "pref.": "字首"）。例：pos ["v.","n."] 顯示為「v. 動詞、n. 名詞」；
 *  pos ["pref."] 顯示為「pref. 字首」。 */
export const POS_LABELS: Readonly<Record<PartOfSpeech, string>> = {
  "n.": "名詞", "v.": "動詞", "adj.": "形容詞", "adv.": "副詞",
  "prep.": "介系詞", "conj.": "連接詞", "pron.": "代名詞", "det.": "限定詞",
  "art.": "冠詞", "num.": "數詞", "aux.": "助動詞", "int.": "感嘆詞", "phr.": "片語",
  "pref.": "字首",
};

/**
 * 詞性、釋義欄的來源（v0.4 起只用於 BuiltinVocabItem.meaningSource；phoneticSource 已收窄為 OriginalMarker）。
 * - "ECDICT"：由 sources/ecdict/ecdict_subset_zhtw.csv 的 translation 精簡而來（已修改：簡體轉繁體台灣用語、精簡釋義）；
 *   卡片顯示「ECDICT（MIT，已修改）」。
 * - "ORIGINAL"：本專案撰寫；卡片顯示「原創」。ECDICT 查無的 4 筆（résumé、café、entrée、unauthorize）必為此值（E-37）。
 * 對應：AC-23-01、AC-23-03、R-13；判定規則見 README §3.2 M-6、V-VOC-09。
 */
export type DictFieldSource = DictionaryCode | OriginalMarker;

/**
 * 內建單字。對應：FR-1.1、FR-1.3、FR-2.1、AC-03-01～AC-03-09、AC-06-01、AC-06-02、AC-06-07、AC-06-08、
 * AC-09-02、AC-23-01、AC-23-03、AC-23-04、E-37、NFR-3、Q-03、Q-26、Q-30、R-13。
 *
 * 範例：
 * { rank: 1, word: "the", phonetic: "/ðə/", pos: ["art."], meaning: "這個；那個（定冠詞）",
 *   collocation: "the + 名詞：the company policy", academicContext: "",
 *   example: "The meeting has been moved to Thursday.", sources: ["NGSL"],
 *   phoneticSource: "ORIGINAL", meaningSource: "ECDICT", contentSource: "ORIGINAL" }
 * → 卡片出處（README L-6）：「單字來源：NGSL 1.2（CC BY-SA 4.0）」「音標：原創；釋義：ECDICT（MIT，已修改）」。
 * ECDICT 查無的字（如 café）：phoneticSource "ORIGINAL"、meaningSource "ORIGINAL" →「音標：原創；釋義：原創」。
 */
export interface BuiltinVocabItem {
  /** 必填。頻率排名，整數 1～N_G，全庫連續不重複（AC-03-08）。排名規則見 README §4.1。也是內建單字的穩定識別。 */
  rank: number;
  /** 必填，非空。單字或片語，依來源字表的寫法（多為小寫）。全庫 wordKey 不重複（AC-03-07）。例："address"。
   *  英文單字 null（BSL／NAWL，紀錄排名 4,646）照常收錄：word = "null"，各欄位可含 null 字樣（README V-VOC-10，v0.5）。 */
  word: string;
  /**
   * 必填，非空。美式 IPA，前後以 "/" 包住，由 pg-content 撰寫（不得照抄 ECDICT 的英式舊式標註，README M-5）。
   * 不得含 ASCII "'"、":"、西里爾 "ә"（V-VOC-16）；重音用 "ˈ"／"ˌ"。例："/əˈdrɛs/"。
   */
  phonetic: string;
  /** 必填，至少 1 個，不重複。依常用程度排序；取自 ECDICT 時依 README M-4 對應（vt./vi. → "v."、a. → "adj."、ad. → "adv."）。例：["n.", "v."]。
   * 字首字（pre、non、multi…）依 README M-8（v0.7，人類決議 FB-25）：只有字首義者 pos 恰為 ["pref."]，
   * 且 meaning 以「（字首）」開頭（例 non：pos ["pref."]、meaning "（字首）非；不；無"）；有獨立用法者 pos 依獨立用法，
   * 若 meaning 最後一段為「（字首）…」，pos 最後加上 "pref."（例 ex：pos ["n.","prep.","pref."]）。
   * "pref." 只能用於上述兩種情況；不得以 adj.／prep.／adv.／phr. 表示字首義（V-VOC-07）。 */
  pos: PartOfSpeech[];
  /**
   * 必填，非空。繁體中文（台灣用語）釋義，亦作為四選一選項文字（AC-09-02），
   * 建議 ≤ 30 字、以全形分號「；」分隔多義。例："地址；向…發表演說"。
   * meaningSource = "ECDICT" 時以 ecdict_subset_zhtw.csv 的 translation 精簡而成，需依 README M-2、M-3 修正
   * 需看上下文的用詞（如 procedure →「程序」而非「程式」）；不得含 [計] 等領域標記（V-VOC-15）。
   * v0.6：s2twp 過度轉換（支持→支援、类型→型別、实例→例項、菜单→選單、连接→連線…）依 README M-3 補充表還原；
   * 不得含「例項」（V-VOC-15）。ECDICT 原檔錯字（決竅→訣竅、遭透→糟透）依原意更正，meaningSource 維持 "ECDICT"（M-2）。
   */
  meaning: string;
  /** 必填，非空。多益常考搭配詞（卡片正面，AC-06-01）。原創。例："address the issue；mailing address"。 */
  collocation: string;
  /**
   * 必填（鍵必須存在），值可為 ""。學術文獻應用情境（卡片背面，AC-06-02）。原創。
   * rank ≤ N_B 可為 ""（畫面隱藏該欄，AC-06-07）；rank > N_B 必須非空（AC-06-08）。
   */
  academicContext: string;
  /** 必填，非空。完整英文例句（卡片背面，AC-06-02）。原創。 */
  example: string;
  /**
   * 必填，至少 1 個，不重複，依 NGSL → TSL → BSL → NAWL 順序排列。
   * 列出該字出現的「全部」已確認授權字表（AC-23-01）；只能含 README §4.3 中 status = confirmed 的代碼（AC-23-05）。
   */
  sources: WordListCode[];
  /**
   * 必填，固定 "ORIGINAL"（v0.4 由 DictFieldSource 收窄，R-13）。音標一律原創美式 IPA，
   * 沒有任何一筆可為 "ECDICT"（AC-23-03、NFR-3「音標標為 ECDICT 的筆數 = 0」、V-VOC-09）。卡片顯示「音標：原創」（AC-23-01）。
   */
  phoneticSource: OriginalMarker;
  /**
   * 必填。pos 與 meaning 的來源，值域 "ECDICT" | "ORIGINAL"（AC-23-01、AC-23-03）。
   * wordKey 在 ecdict_subset.csv 且釋義由 ECDICT 精簡而來 → "ECDICT"；列於 ecdict_subset_missing.txt 的 4 筆 → "ORIGINAL"
   * （README M-6、V-VOC-09）。卡片依此值顯示「釋義：ECDICT（MIT，已修改）」或「釋義：原創」（README L-6）。
   */
  meaningSource: DictFieldSource;
  /** 必填，固定 "ORIGINAL"。表示 collocation、academicContext、example 為原創（AC-23-04）。 */
  contentSource: OriginalMarker;
}

// ════════════════════════════════════════════════════════════════════
// §4 領域範本 — 提供者：pg-content（src/data/templates.js）
//    全域變數：window.DOMAIN_TEMPLATES（DomainTemplate[]）
// ════════════════════════════════════════════════════════════════════

/** 範本代碼。"cs" = 資工、"business" = 商管、"biostat" = 生醫統計。對應：AC-05-01。 */
export type DomainTemplateId = "cs" | "business" | "biostat";

/**
 * 範本單字。注入後轉成 CustomVocabItem（origin = "template"），畫面標「自訂擴充」（AC-04-02、AC-23-01）。
 * 對應：FR-1.4、AC-05-02、AC-05-03、AC-05-05、Q-11。
 * 例：{ word: "latency", phonetic: "/ˈleɪtənsi/", pos: "n. 名詞", meaning: "延遲；潛伏期", collocation: "network latency",
 *       example: "The new cache reduced latency by 40 percent.", academicContext: "We measured end-to-end latency under ..." }
 */
export interface TemplateWord {
  /** 必填，非空。英文單字。不得與內建字庫或其他範本單字的 wordKey 重複（V-TPL-03、V-TPL-04）。 */
  word: string;
  /** 必填，非空。繁中釋義。 */
  meaning: string;
  /** 必填，非空。美式 IPA。 */
  phonetic: string;
  /** 必填，非空。詞性自由文字（與自訂單字同格式）。例："n. 名詞"。 */
  pos: string;
  /** 必填，非空。搭配詞。原創。 */
  collocation: string;
  /** 必填，非空。完整例句（論文例句）。原創。 */
  example: string;
  /** 必填，非空。學術文獻應用情境。原創。 */
  academicContext: string;
}

/** 領域範本。對應：AC-05-01～AC-05-05。 */
export interface DomainTemplate {
  /** 必填。範本代碼；陣列順序固定 cs、business、biostat。 */
  id: DomainTemplateId;
  /** 必填。按鈕文字，依 id 分別為 "資工"、"商管"、"生醫統計"。 */
  label: "資工" | "商管" | "生醫統計";
  /**
   * 必填，恰好 10 筆（AC-05-02、AC-05-03）。cs 必含 Latency、Scalability；biostat 必含 Heterogeneous；
   * business 必含 Monetization（AC-05-03、PRD R-12，取代規格書舉例的 Synergy）。
   * synergy 屬內建字庫（BSL Rank 1564），依 V-TPL-03 不得收入任何範本（README V-TPL-02、V-TPL-03）。
   */
  words: TemplateWord[];
  /** 必填，固定 "ORIGINAL"。 */
  source: OriginalMarker;
}

// ════════════════════════════════════════════════════════════════════
// §5 模擬測驗題庫（題型對應多益 Part 5；識別字沿用 part5／Part5*，R-15）— 提供者：pg-content（src/data/part5.js）
//    全域變數：window.PART5_QUESTION_BANK（Part5Question[]）
// ════════════════════════════════════════════════════════════════════

/** Part 5 題型代碼。對應：FR-3.1、AC-10-01、AC-10-02。 */
export type Part5QuestionType =
  | "preposition_collocation"  // 固定介系詞搭配
  | "part_of_speech"           // 詞性辨析
  | "context_vocabulary"       // 上下文單字
  | "connector";               // 讓步/因果連接詞

/** 題型畫面標籤（契約常數，AC-10-01 原文）。 */
export const PART5_TYPE_LABELS: Readonly<Record<Part5QuestionType, string>> = {
  preposition_collocation: "固定介系詞搭配",
  part_of_speech: "詞性辨析",
  context_vocabulary: "上下文單字",
  connector: "讓步/因果連接詞",
};

/** 題目句中的空格記號：5 個半形底線，每題恰好出現 1 次。 */
export const PART5_BLANK = "_____";

/** 選項索引。0～3 對應畫面 A～D。 */
export type OptionIndex = 0 | 1 | 2 | 3;

/** Part 5 解析。對應：FR-3.2、AC-11-02。 */
export interface Part5Explanation {
  /** 必填，非空。「解題核心思路」（繁中，可夾英文）。 */
  coreStrategy: string;
  /** 必填，非空。「句型語法拆解（S + V + O + 修飾語）」。例："S: The manager / V: approved / O: the budget / 修飾語: despite the delay"。 */
  structure: string;
}

/**
 * Part 5 題目。對應：FR-3.1、FR-3.2、AC-10-01、AC-10-02、AC-11-01、AC-11-02、AC-23-04、Q-03。
 * 例：{ id: "p5-001", type: "preposition_collocation",
 *       sentence: "All employees must comply _____ the new safety regulations.",
 *       options: ["with", "to", "for", "at"], correctIndex: 0,
 *       explanation: { coreStrategy: "comply 固定搭配 with …", structure: "S: All employees / V: must comply with / O: the new safety regulations" },
 *       source: "ORIGINAL" }
 */
export interface Part5Question {
  /** 必填。格式 "p5-" + 3 位數字（"p5-001"～），唯一。 */
  id: string;
  /** 必填。題型。 */
  type: Part5QuestionType;
  /** 必填，非空。英文題目句，含恰好 1 個 PART5_BLANK。 */
  sentence: string;
  /** 必填，恰好 4 個，trim 後不分大小寫互不相同，皆非空。 */
  options: [string, string, string, string];
  /** 必填。正解索引；題意唯一正解。 */
  correctIndex: OptionIndex;
  /** 必填。解析。 */
  explanation: Part5Explanation;
  /** 必填，固定 "ORIGINAL"。 */
  source: OriginalMarker;
}

// ════════════════════════════════════════════════════════════════════
// §6 長難句解碼器 — 提供者：pg-content（src/data/decoder.js）
//    全域變數：window.DECODER_SENTENCES（DecoderSentence[]）、window.READING_STRATEGIES（ReadingStrategy[]）
//    （v0.9）畫面入口隱藏（PRD R-18 三，HIDDEN_TAB_IDS），本節型別與資料檔格式不變；資料檔照常交付並打包（AC-20-04、AC-23-04）。
// ════════════════════════════════════════════════════════════════════

/**
 * 語法角色。對應：FR-4.1、FR-4.2、AC-12-01、AC-13-01。
 * - "subject" 主詞（藍色系）
 * - "verb" 核心動詞（紅色系）
 * - "object" 受詞／補語（綠色系）
 * - "modifier" 修飾語／子句／插入語（紫色系；淡化對象）
 * - "plain" 不上色的連接文字與標點（不淡化）
 */
export type SyntaxRole = "subject" | "verb" | "object" | "modifier" | "plain";

/** 句子片段（扁平、不巢狀）。對應：AC-12-01、AC-13-01。 */
export interface DecoderSegment {
  /** 必填，長度 ≥ 1。片段原文，含其前後需要的空白；全部片段依序直接串接 = 完整句子（V-DEC-02）。 */
  text: string;
  /** 必填。語法角色。 */
  role: SyntaxRole;
  /** 選填，非空。片段的語法說明。例："讓步子句"、"分詞構句"。 */
  noteZh?: string;
}

/** 閱讀策略主題代碼。對應：FR-4.3、AC-14-01。 */
export type ReadingStrategyId = "abstract" | "methodology" | "literature_review";

/**
 * 長難句。對應：FR-4.1～FR-4.2、AC-12-01～AC-12-03、AC-13-01、AC-13-03、AC-23-04、Q-05。
 * 例：{ id: "ds-001", segments: [
 *        { text: "Although prior studies focused on accuracy, ", role: "modifier", noteZh: "讓步子句" },
 *        { text: "the proposed model", role: "subject" }, { text: " ", role: "plain" },
 *        { text: "reduces", role: "verb" }, { text: " ", role: "plain" },
 *        { text: "inference latency", role: "object" }, { text: " by 30 percent", role: "modifier" },
 *        { text: ".", role: "plain" } ],
 *      translationZh: "雖然先前研究著重準確度，本研究提出的模型將推論延遲降低了 30%。",
 *      section: "abstract", source: "ORIGINAL" }
 */
export interface DecoderSentence {
  /** 必填。格式 "ds-" + 3 位數字，唯一。陣列順序 = 切換順序。 */
  id: string;
  /** 必填，至少 2 段；至少各 1 段 subject、verb、modifier（V-DEC-03）。 */
  segments: DecoderSegment[];
  /** 必填，非空。繁中翻譯。 */
  translationZh: string;
  /** 必填。該句典型出現的論文段落。 */
  section: ReadingStrategyId;
  /** 必填，固定 "ORIGINAL"。 */
  source: OriginalMarker;
}

/** 閱讀策略。對應：FR-4.3、AC-14-01、AC-14-02。 */
export interface ReadingStrategy {
  /** 必填。主題代碼；陣列恰好 3 筆，順序 abstract、methodology、literature_review。 */
  id: ReadingStrategyId;
  /** 必填。標題，依 id 分別為 "Abstract 摘要"、"方法論"、"文獻回顧（Research Gap）"。 */
  title: "Abstract 摘要" | "方法論" | "文獻回顧（Research Gap）";
  /** 必填，至少 1 則，每則非空。閱讀心法條列（建議 3～6 則）。 */
  tips: string[];
  /** 必填，固定 "ORIGINAL"。 */
  source: OriginalMarker;
}

// ════════════════════════════════════════════════════════════════════
// §7 學術句型庫 — 提供者：pg-content（src/data/phrasebank.js）
//    全域變數：window.ACADEMIC_PHRASEBANK（PhraseTemplate[]）
//    （v0.9）畫面入口隱藏（PRD R-18 三，HIDDEN_TAB_IDS），本節型別與資料檔格式不變；資料檔照常交付並打包（AC-20-04、AC-23-04）。
// ════════════════════════════════════════════════════════════════════

/** 句型類別。對應：FR-5.1、AC-15-01、AC-15-02。 */
export type PhraseCategory = "gap" | "aim" | "findings" | "limitations";

/** 句型類別篩選項標籤（契約常數，AC-15-01 原文）；"all" 為「全部」。 */
export const PHRASE_CATEGORY_LABELS: Readonly<Record<PhraseCategory | "all", string>> = {
  all: "全部",
  gap: "研究空白 Gap",
  aim: "研究目的 Aim",
  findings: "研究結果 Findings",
  limitations: "研究限制 Limitations",
};

/**
 * 學術句型。對應：FR-5.1、FR-5.2、AC-15-01～AC-15-03、AC-16-01、AC-16-03、AC-23-04。
 * 例：{ id: "ph-001", category: "gap", template: "Little attention has been paid to [topic] in the context of [field].",
 *       descriptionZh: "指出某主題在特定領域缺乏研究", source: "ORIGINAL" }
 */
export interface PhraseTemplate {
  /** 必填。格式 "ph-" + 3 位數字，唯一。 */
  id: string;
  /** 必填。類別。 */
  category: PhraseCategory;
  /** 必填，非空。英文句型模板；「複製」寫入剪貼簿的內容 = 此欄原文（AC-16-03）。可替換處以半形方括號標示，如 "[topic]"。 */
  template: string;
  /** 必填，非空。繁中說明；與 template 一起作為關鍵字搜尋範圍（AC-16-01）。 */
  descriptionZh: string;
  /** 選填，非空。套用後的完整例句。不列入搜尋與複製。 */
  exampleEn?: string;
  /** 必填，固定 "ORIGINAL"。 */
  source: OriginalMarker;
}

// ════════════════════════════════════════════════════════════════════
// §8 持久化狀態（localStorage 實際存的內容）— 提供者：pg-frontend
//    JSON Schema：storage-schema.json；鍵名與遷移：README §5
// ════════════════════════════════════════════════════════════════════

/**
 * 目前的 localStorage 結構版本（= 備份格式版本號，兩者共用）。
 * v0.8 由 1 升為 2（PRD R-17，人類已同意）：PersistedData 新增 todayLearned、learnedHistory。
 * 寫入 localStorage 與匯出備份一律寫此值。
 */
export const CURRENT_SCHEMA_VERSION = 2;

/**
 * 本程式可讀取（含可升級）的版本清單。AC-24-06 的「支援版本」顯示此清單（畫面「1、2」）。
 * 1 = v0.7 程式寫入的 localStorage 資料與匯出的備份（AC-24-10、AC-30-12），讀入時依 README §5.3 MG-1～MG-4 遷移到 2。
 */
export const SUPPORTED_SCHEMA_VERSIONS: readonly number[] = [1, 2];

/**
 * 近 N 天每日已學字數的保存天數（契約常數，PRD R-17、AC-30-09）。
 * 保存視窗 = [today − (LEARNED_HISTORY_DAYS − 1) 天, today]，即「今天往前第 29 天到今天」，最多 30 筆。
 */
export const LEARNED_HISTORY_DAYS = 30;

/** 主控台長條圖顯示天數（含今天，契約常數，AC-30-01、AC-30-08）。由左到右 = today − 6 天 … today。 */
export const DASHBOARD_CHART_DAYS = 7;

/** localStorage 鍵名（契約常數）。file:// 下多個本機 HTML 可能共用同一個 origin，故加專案前綴。 */
export const STORAGE_KEYS = {
  /**
   * 主狀態，值 = JSON.stringify(StorageRecord)。
   * （v0.8）首次判定：啟動時 getItem(state) 回傳 null（鍵不存在）= 首次（AC-25-01）；鍵存在（任何值，含 "" 與無法解析的內容）= 非首次（AC-25-09）。
   * 首次畫面期間不得寫入本鍵；只在按「開始學習」或備份還原成功時寫入第一次（README §5.5 FS-1～FS-7）。
   */
  state: "englishMasterTrack:state",
  /** 讀取失敗時保存的原始字串（AC-18-05 重設前的備援，盡力寫入，失敗可忽略）。值 = 原始字串。 */
  unreadable: "englishMasterTrack:unreadable",
  // 重設時機（v0.6，README §5.3 RS-1～RS-4）：先寫 unreadable，成功後才以預設值覆蓋 state；
  // 寫 unreadable 失敗 → 本次啟動不主動覆寫 state（保留原值供救回，直到第一次 PersistedData 寫入）。
} as const;

/**
 * 目標設定。對應：FR-1.1、FR-1.2、AC-01-03、AC-01-04、AC-01-06、AC-01-07、AC-02-08、AC-17-06、AC-18-02。
 * 預設：{ draftScore: 600, appliedScore: 600, appliedColor: "green", effectiveColor: "green" }。
 */
export interface GoalState {
  /** 必填。滑桿／輸入框目前的有效分數（未套用也保存，AC-02-08）。10～990 且為 5 的倍數。 */
  draftScore: number;
  /** 必填。最近一次按「套用」的分數（「目前目標分數」，AC-17-06）。10～990 且為 5 的倍數。 */
  appliedScore: number;
  /** 必填。目前目標色級 = Color(appliedScore)，可為 blue／gold（AC-01-07）。冗餘欄位，讀取時以 appliedScore 重新計算覆蓋。 */
  appliedColor: ColorLevel;
  /** 必填。目前生效色級；appliedColor 為 blue／gold 時為 "green"。冗餘欄位，讀取時重新計算覆蓋。 */
  effectiveColor: OpenColorLevel;
}

/** 自訂單字來源。"manual" = 表單新增；"template" = 領域範本注入。 */
export type CustomVocabOrigin = "manual" | "template";

/**
 * 自訂單字（持久化）。對應：FR-1.4、AC-04-01～AC-04-09、AC-05-02～AC-05-05、AC-24-07、Q-10、Q-20。
 * 未填的選填欄位一律存 ""（不存 null、不省略）；畫面呈現依 AC-06-07（R-11 未決，契約不規範顯示「—」或隱藏）。
 * 例：{ id: "c_mh8x2k1a_4f9q", word: "Monetization", meaning: "營利化；變現", phonetic: "", pos: "", collocation: "",
 *       example: "", academicContext: "", origin: "manual", templateId: null, createdAt: "2026-10-29T08:30:00.000Z" }
 */
export interface CustomVocabItem {
  /**
   * 必填。格式 "c_" + [A-Za-z0-9_-]{1,64}，唯一；建議 "c_" + Date.now().toString(36) + "_" + 4 位亂數。刪除時用此鍵（AC-04-07）。
   * 唯一性（與 word 的 wordKey 唯一性）屬 V-ST-03：讀 localStorage 時嚴格檢查；匯入時步驟 5 暫不檢查，
   * 由步驟 7 清理（id 重複重新產生、wordKey 重複保留第一筆）後再完整檢查（README §6.2 IM-1）。
   */
  id: string;
  /** 必填，非空。英文單字（trim 後保存，保留大小寫）。wordKey 不得與內建字庫或其他自訂單字重複（AC-04-06）。 */
  word: string;
  /** 必填，非空。中文釋義（trim 後保存）。 */
  meaning: string;
  /** 必填（可為 ""）。表單「音標」。 */
  phonetic: string;
  /** 必填（可為 ""）。表單「詞性」，自由文字。 */
  pos: string;
  /** 必填（可為 ""）。表單「搭配詞」。 */
  collocation: string;
  /** 必填（可為 ""）。表單「論文例句」→ 卡片背面「完整例句」（對應見 README 回饋上游 FB-06）。 */
  example: string;
  /** 必填（可為 ""）。學術情境；表單無此欄，manual 恆為 ""，template 由範本帶入。 */
  academicContext: string;
  /** 必填。來源。 */
  origin: CustomVocabOrigin;
  /** 必填。origin = "template" 時為範本代碼，"manual" 時為 null。 */
  templateId: DomainTemplateId | null;
  /** 必填。建立時間 ISO 8601。單字卡中自訂單字依此遞增排序、接在內建單字之後。 */
  createdAt: string;
}

/**
 * 單字四選一統計。對應：FR-2.4、FR-6.1、AC-09-04、AC-17-03。
 * 規則：每答一題 answered + 1；答對時 correct + 1，並把該字 wordKey 加入 masteredWordKeys（已存在則不變）。
 */
export interface VocabQuizStats {
  /** 必填。累計答題數，整數 ≥ 0。 */
  answered: number;
  /** 必填。累計答對數，整數 0～answered。 */
  correct: number;
}

/** 模擬測驗畫面階段。"question" = 作答中；"summary" = 本輪結算（AC-11-04）。 */
export type Part5Phase = "question" | "summary";

/**
 * 模擬測驗進度（識別字沿用 Part5Progress／part5，R-15）。對應：FR-3.2、FR-6.1、AC-11-03～AC-11-07、AC-17-04、AC-18-01。
 * 預設：{ currentIndex: 0, lockedSelection: null, phase: "question", roundAnswered: 0, roundCorrect: 0, totalAnswered: 0, totalCorrect: 0 }。
 */
export interface Part5Progress {
  /** 必填。目前題目在 PART5_QUESTION_BANK 的索引（0 起算；畫面「第 5 題」= 4）。≥ 題庫長度時視為 0（V-ST-05）。 */
  currentIndex: number;
  /** 必填。目前題目已作答時所選的索引（鎖定狀態，重新載入後仍鎖定，AC-11-06）；未作答為 null。 */
  lockedSelection: OptionIndex | null;
  /** 必填。畫面階段。 */
  phase: Part5Phase;
  /** 必填。本輪答題數（結算「答對 x / y」的 y），按「重新開始」歸 0。 */
  roundAnswered: number;
  /** 必填。本輪答對數（x），0～roundAnswered。 */
  roundCorrect: number;
  /** 必填。累計答題數（正確率分母），「重新開始」不清除（AC-11-07）。 */
  totalAnswered: number;
  /** 必填。累計答對數，0～totalAnswered。 */
  totalCorrect: number;
}

/**
 * 連續打卡。對應：FR-6.1、AC-17-02、AC-17-05、Q-08。
 * 打卡規則（學習行為 = 翻卡、四選一作答、模擬測驗作答、STT 評分；today = 本地日期）：
 *   註：打卡的學習行為與 US-30「學過一個字」（LearningEventKind）不同：模擬測驗作答會打卡，但不計入今日已學數（AC-30-04）。
 *   lastActiveDate 為 null → days = 1；today = last → 不變；today = last + 1 天 → days + 1；
 *   today ≥ last + 2 天 → days = 1；today < last（時鐘調回）→ 不變（AC-17-05）。以上皆把 lastActiveDate 設為 max(last, today)。
 * 顯示規則：today ≥ last + 2 天（已中斷、尚未學習）時顯示 0；其餘顯示 days（見 README FB-09）。
 * 預設：{ days: 0, lastActiveDate: null }。
 */
export interface StreakState {
  /** 必填。連續打卡天數，整數 ≥ 0。 */
  days: number;
  /** 必填。最近一次打卡的本地日期 "YYYY-MM-DD"；從未打卡為 null。 */
  lastActiveDate: string | null;
}

/**
 * 今日已學紀錄（v0.8 新增，schemaVersion 2）。對應：FR-6.1、FR-6.2、US-30、AC-30-03～AC-30-07、AC-30-11～AC-30-14、
 * AC-18-01、AC-24-02、AC-24-10、AC-24-11、R-17、E-49～E-56。
 * 今日已學數 X = (date === 今天本地日期) ? wordKeys.length : 0（README §5.4 LR-6）。
 * 預設：{ date: null, wordKeys: [] }（首次使用、v1 → v2 遷移、欄位整個型別錯誤時重設，README MG-2、V-ST-09）。
 * 例：{ date: "2026-10-30", wordKeys: ["latency", "the", "monetization"] }
 *
 * 「結構正確」（shape，storage-schema.json $defs/TodayLearnedState）與「正規化後」（$defs/TodayLearnedStateNormalized）分兩層：
 *   - shape 不符（非物件、缺鍵、多餘鍵、date 不是字串也不是 null、wordKeys 不是陣列）= 「整個欄位型別錯誤」：
 *     讀 localStorage → 只把本欄重設為預設值；匯入備份 → 格式錯誤（README V-ST-09、IM-8）。
 *   - shape 正確但內容無效（date 不是合法日期或不是今天、wordKeys 有非字串／空白／重複項）→ 依 V-ST-09 正規化，不報錯。
 * 程式寫出（localStorage、備份匯出）的值一律是正規化後的值。
 */
export interface TodayLearnedState {
  /**
   * 必填。wordKeys 所屬的本地日期 "YYYY-MM-DD"（C-3）；從未學過或已重設為 null。
   * 正規化後只可能是 null 或「今天」；不是今天（過去、未來、格式錯、不存在的日期如 "2026-02-30"）→ 整欄重設為預設值（X = 0）。
   */
  date: string | null;
  /**
   * 必填，可為空陣列。當天學過的不重複單字 wordKey（C-2 正規化形式，內建與自訂皆可），依首次學過的順序附加。
   * 值域：每項為 trim 後非空、已 C-2 正規化的字串；不重複。date 為 null 時必須為 []。
   * 上限：不設固定上限（長度最多 = 當天學過的相異單字數，受內建 N_G 筆 + 自訂單字數限制）。
   * 不與目前字庫、單字集比對：刪除自訂單字、未觸發初始化的套用後仍保留（AC-30-06 不回扣）；匯入時也不因字不存在而略過（與 masteredWordKeys 不同）。
   * （v0.9）切換難易度確認初始化時，本欄整欄重設為預設值（README §5.7、AC-32-02、AC-30-06）。
   */
  wordKeys: string[];
}

/**
 * 近 30 天每日已學字數（v0.8 新增，schemaVersion 2）。對應：US-30、AC-30-01、AC-30-07～AC-30-09、AC-30-11～AC-30-13、
 * AC-18-01、AC-24-02、AC-24-10、AC-24-11、R-17、E-49、E-52、E-53、E-56。
 * 形式：JSON 物件，鍵 = 本地日期 "YYYY-MM-DD"，值 = 當天學過的不重複單字數（整數 ≥ 0）。只存日期 → 字數，不存單字清單（R-17 (4)）。
 * 預設：{}。例：{ "2026-10-24": 3, "2026-10-27": 10, "2026-10-30": 4 }（今天 = 2026-10-30 時對應 AC-30-08）。
 * 正規化規則（V-ST-10）：只保留鍵為合法日期、落在 [today − 29 天, today]、值為整數 ≥ 0 的項目，最多 LEARNED_HISTORY_DAYS（30）筆；
 *   其餘項目捨棄，不報錯。鍵的順序無意義（顯示依日期排序）。
 * 一致性（V-ST-11）：todayLearned.date = today 時 learnedHistory[today] = todayLearned.wordKeys.length；
 *   todayLearned.date ≠ today（X = 0）時不得有 today 鍵。
 * shape 不符（不是物件：陣列、null、字串、數字等）=「整個欄位型別錯誤」，處理同 TodayLearnedState。
 */
export type LearnedHistory = Record<string, number>;

/**
 * 全部使用者資料（localStorage 與備份檔共用的資料本體）。
 * 對應：FR-6.2、AC-18-01、AC-18-02、AC-24-02、R-04、R-17。
 * 只放可序列化的使用者狀態；**不放**內建內容、語音辨識／合成實例、音訊（AC-21-03）、畫面暫態。
 * v0.8（schemaVersion 2）新增 todayLearned、learnedHistory 兩個必填欄位；其餘 7 欄與 v1 完全相同。
 * （v0.9，US-32）切換難易度初始化學習紀錄時：LEARNING_PROGRESS_FIELDS 列出的 6 欄回到 README §5.2 預設值；
 *   goal 改為新套用的值；customVocab、sttNoticeAcknowledged 原值保留。欄位集合不變（AC-32-10），規則見 README §5.7。
 */
export interface PersistedData {
  /** 必填。目標設定。 */
  goal: GoalState;
  /** 必填，可為空陣列。自訂單字（含範本注入）。（v0.9）切換難易度初始化時整個陣列原值保留（順序、各欄位含 id、createdAt 皆不變，AC-32-03）。 */
  customVocab: CustomVocabItem[];
  /** 必填，可為空陣列。已掌握單字的 wordKey（不重複）。單字掌握數 = 此陣列長度（AC-17-03、AC-02-05 的 CurrentVocab）。 */
  masteredWordKeys: string[];
  /** 必填。單字四選一統計。 */
  vocabQuiz: VocabQuizStats;
  /** 必填。模擬測驗進度（識別字沿用 part5，R-15）。 */
  part5: Part5Progress;
  /** 必填。連續打卡。 */
  streak: StreakState;
  /** 必填。「STT 說明已讀」（AC-08-13）。預設 false。（v0.9）屬使用設定，切換難易度初始化時保留原值（AC-32-03）。 */
  sttNoticeAcknowledged: boolean;
  /** 必填（v0.8 新增）。今日已學紀錄。預設 { date: null, wordKeys: [] }。 */
  todayLearned: TodayLearnedState;
  /** 必填（v0.8 新增）。近 30 天每日已學字數。預設 {}。 */
  learnedHistory: LearnedHistory;
}

/**
 * 學習進度紀錄欄位（契約常數，v0.9 新增，PRD US-32 名詞「學習進度紀錄」(1)～(6)、R-18 一）。
 * 切換難易度並在確認視窗按「確定」時，**只有**這 6 欄被覆寫為 README §5.2 預設值（白名單）；PersistedData 其他欄位
 * （goal 依套用規則更新；customVocab、sttNoticeAcknowledged 與日後新增的任何使用設定欄位）一律原值保留。
 * 順序對應 PRD (1) 已掌握單字、(2) 四選一統計、(3) 模擬測驗、(4) 打卡、(5) 今日已學、(6) 近 30 天歷史。
 * 對應：AC-32-02、AC-32-03、AC-32-10；規則見 README §5.7 CI-1～CI-10。不持久化（常數本身不寫入 localStorage）。
 */
export const LEARNING_PROGRESS_FIELDS: readonly (keyof PersistedData)[] = [
  "masteredWordKeys",
  "vocabQuiz",
  "part5",
  "streak",
  "todayLearned",
  "learnedHistory",
];

/** localStorage 主鍵（STORAGE_KEYS.state）的值。 */
export interface StorageRecord {
  /** 必填。結構版本，整數；本版寫入 = CURRENT_SCHEMA_VERSION（2）。讀到 1 時先遷移（README §5.3 MG-1～MG-4）。 */
  schemaVersion: number;
  /** 必填。最後寫入時間 ISO 8601。 */
  savedAt: string;
  /** 必填。使用者資料。 */
  data: PersistedData;
}

// ════════════════════════════════════════════════════════════════════
// §9 備份檔（匯出／匯入）— 提供者：pg-frontend
//    JSON Schema：storage-schema.json 的 $defs/BackupFile；流程：README §6
// ════════════════════════════════════════════════════════════════════

/** 備份檔格式識別字串（契約常數）。 */
export const BACKUP_FORMAT_ID = "english-master-track-backup";

/**
 * 備份檔。檔名 "english-master-track-backup-YYYYMMDD.json"（本地日期，AC-24-01）。
 * 對應：FR-6.2、AC-24-01～AC-24-11、Q-18、R-17。
 * 頂層恰好這 5 個鍵（v0.8 不變）；匯入步驟 5 依 storage-schema.json $defs/BackupFile 檢查，有多餘鍵、缺鍵或型別不符 → "format"（README §6.2 IM-2）。
 * 版本相容（v0.8，README §6.3）：
 *   - 匯出：schemaVersion = 2，data 含 todayLearned、learnedHistory（正規化後的值）。
 *   - 匯入 schemaVersion = 1（v0.7 程式匯出，data 無新欄位）：步驟 4 依 MG-1～MG-4 補預設值後照常匯入，不是錯誤（AC-24-10）。
 *   - 匯入 schemaVersion = 2：data 必須含兩個新欄位且 shape 正確，缺少或整個欄位型別錯誤 → "format"（AC-24-05、AC-24-11）；
 *     shape 正確但項目無效 → 步驟 7 以「匯入當天」為今天正規化捨棄，不報錯、不計入略過筆數（IM-8）。
 *   - format 識別字串不變，不另設備份專用版本號。
 */
export interface BackupFile {
  /** 必填。固定 BACKUP_FORMAT_ID；不符視為格式錯誤（AC-24-05）。 */
  format: "english-master-track-backup";
  /**
   * 必填。備份格式版本號（AC-24-02）= 匯出當時的 CURRENT_SCHEMA_VERSION（本版匯出 2）。
   * 匯入接受 SUPPORTED_SCHEMA_VERSIONS（1、2）；缺失或不在清單內視為版本不相容（AC-24-06）。
   */
  schemaVersion: number;
  /**
   * 必填。匯出時間，RFC 3339 date-time（含時區），例："2026-10-30T01:02:03.000Z"。
   * 匯入時強制檢查（格式相符且 Date.parse 可解析），不符 → "format"（IM-2）。
   */
  exportedAt: string;
  /** 必填。內建字庫資料版本（VocabManifest.dataVersion；無法取得時填 ""）。匯入只檢查是字串，內容不影響匯入。 */
  contentDataVersion: string;
  /** 必填。使用者資料，結構同 PersistedData（schemaVersion 1 的檔案於遷移前不含 todayLearned、learnedHistory）。 */
  data: PersistedData;
}

/**
 * 匯入失敗原因（執行期，不持久化）。訊息文字依 PRD：format →「備份檔格式錯誤，未匯入」；version →「備份檔版本不相容」；
 * quota →「儲存空間不足，未匯入」；cancelled → 不提示。
 * - quota：步驟 8 setItem 例外符合容量不足判定（README IM-7：name 為 QuotaExceededError／NS_ERROR_DOM_QUOTA_REACHED，或 code 為 22／1014）。
 * - write_failed（v0.6 新增，README IM-6）：步驟 8 setItem 拋出容量不足以外的例外。處理同 quota（記憶體與 localStorage 皆不變）。
 *   畫面文字「儲存失敗，未匯入」（v0.7 依人類決議定案，README FB-24 已解除）。
 * 對應：AC-24-04～AC-24-06、AC-24-09。
 */
export type ImportErrorCode = "format" | "version" | "quota" | "write_failed" | "cancelled";

/**
 * 匯入結果（執行期，不持久化）。對應：AC-24-03～AC-24-09。
 * fileVersion（只在 error = "version" 時提供，README §6.2 IM-3）：
 *   - 檔案無 schemaVersion 鍵 → null
 *   - 值為有限數字（含 0、負數、非整數，如 1.5、2）→ 原值；畫面以 String(值) 顯示
 *   - 其他（字串 "1"、null、物件、布林等）→ null
 *   null 時畫面顯示「無」（意指無有效版本號）。字串 "1" 不是合法版本號，顯示「無」為預期行為。
 */
export type ImportResult =
  | { ok: true; /** 略過筆數 N（AC-24-08）= 略過的自訂單字數 + 已掌握單字數；捨棄的歷史項目與今日紀錄不計入（IM-8）。 */ skipped: number }
  | { ok: false; error: ImportErrorCode; /** 見上方 fileVersion 規則。 */ fileVersion?: number | null };

// ════════════════════════════════════════════════════════════════════
// §10 執行期狀態（不持久化）— 提供者：pg-frontend
// ════════════════════════════════════════════════════════════════════

/**
 * 頁面代碼。對應：AC-17-06、AC-20-03、AC-20-04、AC-23-02、AC-27-01。
 * 識別字不因 R-15 更名而改（"customizer" = 難易度設定、"flashcards" = 單字卡、"part5" = 模擬測驗）；畫面文字見 TAB_LABELS。
 * （v0.9，R-18 三）"decoder"、"phrasebank" 保留在型別中（程式碼保留、未來可再開放），但屬 HIDDEN_TAB_IDS：
 *   RuntimeState.currentTab 不得為這兩個值（README §5.8 HT-1～HT-5）。
 */
export type TabId = "dashboard" | "customizer" | "flashcards" | "part5" | "decoder" | "phrasebank" | "sources";

/**
 * 頁面畫面名稱（契約常數，v0.8 依 PRD R-15、AC-20-03、AC-10-02、AC-23-02）。
 * 導覽、主控台入口、頁面標題一律使用此文字。模擬測驗頁說明可另註「題型對應多益 Part 5」（AC-10-02）。
 * （v0.9）decoder、phrasebank 的文字保留供未來開放使用；本版畫面任何導覽、入口、標題都不得顯示這兩項（AC-20-04、HT-4）。
 */
export const TAB_LABELS: Readonly<Record<TabId, string>> = {
  dashboard: "主控台",
  customizer: "難易度設定",
  flashcards: "單字卡",
  part5: "模擬測驗",
  decoder: "解碼器",
  phrasebank: "句型庫",
  sources: "資料來源與授權",
};

/**
 * 導覽列項目與順序（契約常數，AC-20-03、AC-27-01、AC-27-04）：恰好 4 項（v0.9 由 6 項改為 4 項，移除 decoder、phrasebank，R-18 三）。
 * "sources" 不在導覽列，由主控台入口與頁尾連結進入（AC-17-06、AC-23-02）。
 * 主控台模組入口（AC-17-06）= 本陣列去掉 "dashboard" 後的 3 項（同順序）+「資料來源與授權」入口（README HT-2）。
 * 寬螢幕導覽與 ≤ 640px 底部導覽列共用此順序；斷點、圖示等屬設計層（README §5.6）。
 */
export const NAV_TAB_ORDER: readonly TabId[] = ["dashboard", "customizer", "flashcards", "part5"];

/**
 * 隱藏頁面（契約常數，v0.9 新增，PRD R-18 三、AC-20-04、E-68）。
 * 本版任何畫面操作、重新載入、匯入備份或手動輸入網址片段都不得使 RuntimeState.currentTab 成為這些值；
 * 嘗試進入時改為 "dashboard"（首次畫面期間則維持首次畫面，README §5.8 HT-3）。
 * 程式碼、RuntimeState.decoder／phrasebank 與資料檔（decoder.js、phrasebank.js）保留，資料格式不變（HT-5）。
 * 未來開放時須先修訂 PRD，再把項目移回 NAV_TAB_ORDER 並自本陣列移除。
 */
export const HIDDEN_TAB_IDS: readonly TabId[] = ["decoder", "phrasebank"];

/**
 * 進入模式（執行期，v0.8 新增，US-25）。不持久化；由啟動時 localStorage 主鍵是否存在推導（README §5.5 FS-1）。
 * - "firstRun"：首次畫面（全螢幕難易度設定 + 「開始學習」+「從備份還原」），不顯示導覽列與主控台（AC-25-01）。
 * - "main"：一般模式（導覽列、主控台與全部功能）。
 * 只能由 "firstRun" 轉為 "main"（按「開始學習」或備份還原成功，FS-4、FS-5），本工作階段不會反向。
 */
export type EntryMode = "firstRun" | "main";

/**
 * 「學過一個字」的學習行為（執行期，v0.8 新增，US-30 名詞定義、R-17 (2)）。不持久化。
 * - "flip"：單字卡模式中卡片由正面翻到背面（翻回正面不算，AC-30-03）
 * - "vocabQuiz"：四選一作答（對錯皆算；只在 selectedIndex 由 null 變為非 null 時算一次）
 * - "stt"：STT 評分完成並顯示分數（逾時、空結果、錯誤不算，AC-30-04）
 * 模擬測驗作答、滑動或按鈕換卡、未翻面瀏覽皆不算（AC-30-04）。記錄規則見 README §5.4 LR-1～LR-8。
 */
export type LearningEventKind = "flip" | "vocabQuiz" | "stt";

/**
 * 單字卡單字集的一張卡（統一內建與自訂的檢視模型）。
 * 單字集 = 內建 rank 1～N（N 依生效色級：orange → N_O、brown → N_B、green → N_G）依 rank 遞增，
 *          + 全部 customVocab 依 createdAt 遞增（AC-03-01～AC-03-04）。
 * 去重（V-ST-04，v0.5 釐清）：自訂單字的 wordKey 只與「本次截取」的內建卡（rank 1～N）比對；
 *   在範圍內 → 只放內建卡（自訂資料保留不刪）；不在範圍內 → 放自訂卡。每個 wordKey 在單字集中恰好出現一次。
 *   例：生效色級 orange（N = 1,000），自訂字 wordKey 與內建 rank 3,000 相同 → 放自訂卡；改為 green 後 → 改放內建卡。
 */
export type StudyCard =
  | { kind: "builtin"; wordKey: string; item: BuiltinVocabItem }
  | { kind: "custom"; wordKey: string; item: CustomVocabItem };

/**
 * 單字四選一題目（執行期產生，Q-09 A）。對應：AC-09-02、AC-09-03、AC-09-06、AC-09-07。
 * options 為正解 + 3 個取自目前單字集其他字的 meaning，trim 後互不相同，每次隨機排序。
 * 單字集中可用的相異 meaning 不足 4 種時，視同 AC-09-06（見 README FB-11）。
 */
export interface VocabQuizQuestion {
  /** 題目單字的 wordKey。 */
  wordKey: string;
  /** 4 個中文釋義選項。 */
  options: [string, string, string, string];
  /** 正解索引。 */
  correctIndex: OptionIndex;
  /** 使用者所選；未作答為 null；非 null 即鎖定。 */
  selectedIndex: OptionIndex | null;
}

/** STT 燈號：score ≥ 90 green、65～89 yellow、< 65 red（AC-08-06）。 */
export type SttLight = "green" | "yellow" | "red";

/** STT 評分結果（執行期，不持久化，AC-21-03）。對應：AC-08-03～AC-08-08、AC-08-11、AC-08-12。 */
export interface SttResult {
  /** 辨識原文（未清洗）。 */
  recognizedText: string;
  /** 目標文字（卡片 word 原文）。 */
  targetText: string;
  /** 辨識吻合度 0～100 整數。 */
  score: number;
  /** 燈號。 */
  light: SttLight;
}

/** 麥克風狀態。"notice" = 顯示首次說明中（AC-08-13）。 */
export type SttStatus = "idle" | "notice" | "listening";

/** localStorage 可用狀態。"unavailable" 時顯示「進度將無法保存」（AC-18-03），但所有功能可在本次工作階段使用。 */
export type StorageStatus = "ok" | "unavailable";

/**
 * 執行期狀態（全部不寫入 localStorage）。
 * 禁止事項：SpeechRecognition、SpeechSynthesisUtterance、計時器、DOM 節點等不可序列化物件
 *           不得放入 AppState，只能放在 src/app 模組內部變數（品質要求、AC-21-03）。
 * （v0.9，US-33）同上，getUserMedia 取得的 MediaStream／MediaStreamTrack、AudioContext、AnalyserNode 等音訊物件
 *   只能放在 src/app 模組內部變數；收音條亮格數（0～5）、RMS／dBFS 音量值屬即時畫面暫態，
 *   不得寫入 PersistedData、localStorage、備份檔或任何其他儲存（AC-21-03、NFR-3）。
 *   是否把亮格數放進 RuntimeState、門檻 T1～T5、分析視窗與音軌釋放時機由 SD 決定（README §9.3 DS-01～DS-03）。
 */
export interface RuntimeState {
  /** （v0.8）進入模式；啟動時依 README §5.5 FS-1 判定。 */
  entryMode: EntryMode;
  /**
   * 目前頁面；entryMode = "main" 啟動時為 "dashboard"。
   * entryMode = "firstRun" 時只能是 "customizer"（首次畫面）或 "sources"（從頁尾開啟，返回後回到首次畫面，AC-25-07）。
   * （v0.9）任何時候都不得為 HIDDEN_TAB_IDS 中的值（README §5.8 HT-1、HT-3，AC-20-04）。
   * 切換到其他頁面時，若原頁面為 "flashcards"，須釋放麥克風（PRD AC-33-02；釋放實作屬設計層）。
   */
  currentTab: TabId;
  /** 目前單字集（由 PersistedData.goal.effectiveColor + customVocab 推導的快取）。 */
  studySet: StudyCard[];
  /** 單字卡（識別字沿用 flashcard，R-15）。 */
  flashcard: {
    /** 目前卡片索引（0 起算）；切換色級後歸 0（AC-03-05）。 */
    index: number;
    /**
     * 是否顯示背面（邏輯狀態，動畫期間也以此為準）；切換卡片時設 false（AC-06-05）。
     * 由 false 變 true 時觸發學習行為 "flip"（LR-1）；動畫中連續點擊依點擊次數切換，最終狀態由此值決定（AC-28-08）。
     */
    isFlipped: boolean;
    /** "card" = 單字卡模式；"quiz" = 測驗模式（AC-09-01）。 */
    mode: "card" | "quiz";
    /** 測驗模式下的目前題目；非測驗模式為 null。 */
    quiz: VocabQuizQuestion | null;
  };
  /** 語音。 */
  speech: {
    /** 瀏覽器是否支援 SpeechSynthesis（AC-07-04）。 */
    ttsSupported: boolean;
    /** 瀏覽器是否支援 SpeechRecognition（AC-08-02）。 */
    sttSupported: boolean;
    /** 麥克風狀態。 */
    sttStatus: SttStatus;
    /** 最近一次評分結果；切換卡片時清為 null。 */
    lastResult: SttResult | null;
  };
  /** 長難句解碼器。（v0.9 頁面隱藏，欄位保留；啟動時照常初始化為 sentenceIndex 0、isModifierDimmed false，本版不使用。） */
  decoder: {
    /** 目前例句索引。 */
    sentenceIndex: number;
    /** 是否淡化修飾語；切換例句時保持（AC-13-03）。 */
    isModifierDimmed: boolean;
  };
  /** 句型庫。（v0.9 頁面隱藏，欄位保留；啟動時照常初始化為 category "all"、keyword ""，本版不使用。） */
  phrasebank: {
    /** 目前分類篩選。 */
    category: PhraseCategory | "all";
    /** 目前關鍵字（原文；比對時不分大小寫，AC-16-01）。 */
    keyword: string;
  };
  /** localStorage 可用狀態。 */
  storageStatus: StorageStatus;
  /**
   * （v0.8）本工作階段是否已因「學習紀錄寫入容量不足」提示過「儲存空間不足」（AC-30-14、E-54：同一工作階段只提示一次）。
   * 啟動時 false；不持久化。只控制學習紀錄（LR-7）的提示，不影響新增自訂單字等其他寫入的提示（AC-18-04）。
   */
  learningQuotaNoticeShown: boolean;
}

/** 應用程式狀態 = 持久化資料 + 執行期狀態。對應：規格書 2.2 AppState（已依 PRD 改寫）。 */
export interface AppState {
  /** 會寫入 localStorage 與備份檔的資料。 */
  data: PersistedData;
  /** 不持久化的畫面與裝置狀態。 */
  runtime: RuntimeState;
}

// ════════════════════════════════════════════════════════════════════
// §11 全域變數宣告（資料檔 → 前端的唯一介面）
// ════════════════════════════════════════════════════════════════════

/**
 * 所有內容資料檔都在 app 程式之前載入；前端讀取時一律視為「可能不存在」，
 * 不存在或不是陣列／物件時以空陣列／null 處理，不得白屏（pg-frontend 自訂要求）。
 */
declare global {
  interface Window {
    /** src/data/vocab-*.js（可多檔串接），內建字庫。恰好 N_G 筆（v0.2 紀錄值 5,620，以驗證結果為準）。 */
    MASTER_VOCAB_DATABASE?: BuiltinVocabItem[];
    /** src/data/sources.js，來源登錄（只含已確認授權且實際使用的來源 + ORIGINAL；v0.2 預期 6 筆：NGSL、TSL、BSL、NAWL、ECDICT、ORIGINAL）。 */
    DATA_SOURCE_REGISTRY?: DataSourceEntry[];
    /** src/data/sources.js，內建字庫摘要。 */
    VOCAB_MANIFEST?: VocabManifest;
    /** src/data/sources.js，專案授權資訊。 */
    PROJECT_LICENSE?: ProjectLicenseInfo;
    /** src/data/templates.js，領域範本，恰好 3 筆。 */
    DOMAIN_TEMPLATES?: DomainTemplate[];
    /** src/data/part5.js，模擬測驗題庫（題型對應多益 Part 5），至少 200 題（每題型至少 50）。 */
    PART5_QUESTION_BANK?: Part5Question[];
    /** src/data/decoder.js，長難句，至少 50 句。 */
    DECODER_SENTENCES?: DecoderSentence[];
    /** src/data/decoder.js，閱讀策略，恰好 3 筆。 */
    READING_STRATEGIES?: ReadingStrategy[];
    /** src/data/phrasebank.js，學術句型，至少 100 則（每類至少 25）。 */
    ACADEMIC_PHRASEBANK?: PhraseTemplate[];
  }
}

export {};
