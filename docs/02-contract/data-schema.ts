/**
 * ---
 * doc: CONTRACT-SCHEMA
 * version: 0.21
 * status: approved
 * author: sa-agent
 * approved_by: JimmyLin（授權主控代核）
 * approved_at: 2026-11-09
 * ---
 *
 * English Master Track — 資料契約（型別定義）
 *（專案代號仍為 English Master Track；v0.12 起 App 內顯示名稱為「EnglishContext」，見 §13 APP_DISPLAY_NAME 與 FROZEN_IDENTIFIERS。）
 *
 * 上游：docs/01-PRD.md v0.21（approved，JimmyLin，2026-11-09；Q-103～Q-108 全部決議 A），以第 6 章「人類決議」與 R-15～R-31 為準。
 * v0.21（PRD R-30：US-62 聆聽中即時顯示引擎聽到的文字，Q-103～Q-107；R-31：商標說明拿掉「Part 5」，Q-108）
 *   **不改持久化結構**（schemaVersion 維持 3，PersistedData 12 欄、StorageRecord、BackupFile 不變，localStorage 鍵數 2，不需遷移，Q-106 A）：
 *   §18 新增 interface SttStartOptions（語音辨識服務 start() 選項，含新增的 onInterim）；SttEngineEventKind 新增 "interim"；
 *   SttEndInfo 新增 lastInterimText；STT_FLOW_TEXTS 新增 labelInterim「聽到：」。即時文字**不進 AppState**（只在畫面模組內部變數，
 *   理由見 §10 RuntimeState 註解）。商標說明句改為「題型參考 TOEIC®（多益），非 ETS 官方或認可內容」：SITE_PAGES（about）、
 *   SITE_HOME_SEO、SITE_HOME_JSON_LD、SITE_NOSCRIPT 的值與相關註解同步（README L-8 LT-2）。規則見 README §14.6（IT）、MS-1 修訂、V-STT-11～V-STT-17。
 *   storage-schema.json 只改 meta。
 * v0.20（PRD R-29：US-58 麥克風準備中、US-59 無文字訊息分流、US-60 三種燈號都顯示辨識文字、US-61 窄視窗鍵盤焦點（BUG-005），Q-94～Q-102）
 *   **不改持久化結構**（schemaVersion 維持 3，PersistedData 12 欄、StorageRecord、BackupFile 不變，localStorage 鍵數 2，不需遷移）：
 *   SttStatus 新增 "preparing"；RuntimeState.speech 新增 preparingPhase（皆只在記憶體）。新增 §18（辨識事件、結束資訊、訊息分流、
 *   時間常數範圍、分數區文字列）。US-61 是版面與捲動行為，不涉資料契約。規則見 README §14（PR、MS、RT、KF、V-STT）。
 *   storage-schema.json 未修改，維持 v0.16。
 * v0.19（PRD R-27、R-28：US-49 已答對題數、US-50～US-52 廣告、US-53～US-55 隱私權政策／關於我／聯絡我們、US-56 SEO、US-57 入口與靜態頁，Q-81～Q-93）
 *   **不改持久化結構**（schemaVersion 維持 3，PersistedData 12 欄、StorageRecord、BackupFile 不變，localStorage 鍵數 2，不需遷移）：
 *   廣告與新頁面的狀態只放 RuntimeState（ad、sitePageReturnTab）。新增 §17；TabId +3 值；部署目錄 8 → 13 檔，預先快取 7 項不變；
 *   SOURCES_CONTACT_TEXT 改值。規則見 README §13（AS、AD、SP、SC、SE、ML）。storage-schema.json 未修改，維持 v0.16。
 * v0.18（PRD R-26：US-48 顯示全部時曾答對的題目為綠色鎖定、移除 AC-46-07，Q-77～Q-80）**不改持久化結構**
 *   （schemaVersion 維持 3，PersistedData 12 欄、BackupFile 不變，不需遷移）：已答對鎖定檢視完全由既有欄位推導。
 *   §15 新增 type Part5QuestionState；PART5_RECORD_TEXTS 新增 4 個鍵、移除 replayKeepRecords；Part5Progress 只改註解。
 *   規則見 README §5.11 LV、SM、HN、CR、UO。storage-schema.json 未修改，維持 v0.16。
 * v0.17（PRD R-25：模擬測驗標題說明、TOEIC® 商標聲明、單字卡搭配詞標籤、p5-009 解析、原創內容聲明、圖示與名稱聲明；
 *   修改 AC-06-01、AC-10-02、AC-23-02、AC-23-06、AC-38-08、AC-38-10，新增 AC-23-08）**只修訂註解**，
 *   不新增型別與常數、不改任何常數值；不改持久化結構（schemaVersion 維持 3，PersistedData 12 欄不變）。
 *   固定文字集中於 README §4.3 L-8（LT-1～LT-6），驗證見 README §7.8 V-LGL。storage-schema.json 未修改，維持 v0.16。
 * v0.16（PRD R-24：AC-36-03／AC-42-04 更新提示文字、新增 AC-23-07 資料來源頁聯絡 email）**只做文字層級修訂**，
 *   不改持久化結構（schemaVersion 維持 3，PersistedData 12 欄不變）：PWA_TEXTS.updateNotice／updateButton 改值；
 *   新增 §16 SOURCES_CONTACT_TEXT（README §4.3 L-7）。
 * **v0.15（PRD R-23：US-44 單字卡記住上次位置、US-45 模擬測驗答對紀錄、US-46 只練沒答對的題目、US-47 保存與相容，Q-63～Q-71）
 *   含 localStorage 持久化結構變更：schemaVersion 2 → 3（Q-63 已由人類核准，不適用主控代核）。**
 *   PersistedData 新增 3 個選填欄位 flashcardPosition（新型別 FlashcardPosition）、part5CorrectIds、part5UnansweredOnly；
 *   v2 → v3 遷移補預設值、既有 9 欄原值不動（README §5.3 MG-5～MG-8）；新欄位讀取只重設該欄（RD-3）；
 *   LEARNING_PROGRESS_FIELDS 6 → 7 欄（加 part5CorrectIds，Q-67 A）；新增 §15（Part5ViewKind、PART5_RECORD_TEXTS）。
 *   規則見 README §5.10 FP、§5.11 CR／UO、§5.12 WR、§6 IM-9～IM-10。鍵名 englishMasterTrack:state 不變（FROZEN）。
 *   **解讀規則（README C-8）**：本檔 v0.8～v0.14 段落中描述「目前」狀態的「schemaVersion 2」「PersistedData 9 欄」，
 *   v0.15 起一律讀作 CURRENT_SCHEMA_VERSION（3）與 PersistedData 12 欄；變更紀錄等歷史敘述照原意。
 * v0.14（PRD R-22：US-42 頁尾版本號、US-43 隱藏領域範本、AC-01-08 狀態列只顯示生效色級、AC-39-04「變更」改為按鈕，Q-58～Q-62）
 *   **不改**持久化結構（schemaVersion 維持 2），新增 §14 版本號常數；規則見 README §12、§5.8 HT-6～HT-9。
 * v0.12（PRD R-21 版面與視覺、US-38～US-41、Q-49～Q-57）**不改**持久化結構，內容見下方變更紀錄 0.12 列與 §13。
 * v0.11（PRD R-20 PWA、US-34～US-37、AC-24-12、Q-41～Q-48）**不改**持久化結構：schemaVersion 維持 2，
 *   PersistedData／StorageRecord／BackupFile 欄位不變，localStorage 鍵數維持 2；PWA 不寫入 localStorage 任何資料。
 *   新增 §12 PWA（manifest、部署目錄、service worker 與快取、頁面端記憶體狀態），RuntimeState 新增 pwa 欄位（不持久化）。
 *   規則見 README §10（DP、MF、HD、PE、SW、UP、IN、PV 各組規則與 V-PWA 驗證規則）。
 * v0.10（PRD R-19、Q-39）**不改**持久化結構：schemaVersion 維持 2，GoalState 欄位不變；只改首次預設分數常數（600 → 725）
 *   與註解（點卡片 = 該色 scoreMax、既有分數不轉換、分數驗證只用於資料層、畫面不顯示分數），規則見 README §5.9 GS-1～GS-8。
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
 * - pg-content 依 §2～§7 產出 src/data/ 的資料檔；pg-frontend 依 §1、§8～§15 實作 src/app/（v0.11 §12 PWA 含建置輸出；v0.12 §13 版面與視覺；
 *   v0.14 §14 版本號；v0.15 §15 模擬測驗答對紀錄；v0.16 §16 聯絡資訊；v0.19 §17 已答對顯示、廣告、對外頁面與 SEO；
 *   v0.20 §18 語音辨識準備中、訊息分流與辨識文字；v0.21 §18 加入聆聽中即時文字）。
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
 * | 0.10 | 2026-11-02 | sa-agent | 修訂已核准的 v0.9（主控代核），依 PRD v0.10（R-19、Q-39，JimmyLin 2026-11-02 核准）。status 改回 draft、核准欄位清空。
 * | 0.10 | 2026-11-02 | 主控 | 主控代核：只改預設常數與規則說明，未改持久化結構（schemaVersion 維持 2）。 |
 * |      |            |          | (1) SCORE_DEFAULT 600 → 725（Q-39 決議 B，= 綠色 scoreMax）；GoalState 預設值註解同步。
 * |      |            |          | (2) 點色級卡片的分數 = 該色 COLOR_LEVELS[].scoreMax（橘 215、棕 465、綠 725、藍 855、金 990），取代 Q-32；
 * |      |            |          |     以既有欄位推導，不新增常數（ColorLevelDefinition.scoreMax、COLOR_LEVELS 註解）。
 * |      |            |          | (3) SCORE_MIN／SCORE_MAX／SCORE_STEP 註明只用於資料層驗證（localStorage 讀取、備份匯入），畫面不再使用；
 * |      |            |          |     步進四捨五入只屬已暫停的 AC-02-09，資料層不做四捨五入。契約本來就沒有分數輸入錯誤訊息常數。
 * |      |            |          | (4) GoalState.draftScore／appliedScore 註解改寫：畫面不顯示分數、選中卡片 = Color(draftScore)、既有分數不轉換（R-19 六）。
 * |      |            |          | 型別數 59、契約常數 20、localStorage 鍵數 2 皆不變；PersistedData／StorageRecord／BackupFile 欄位不變，schemaVersion 維持 2，不需遷移。 |
 * | 0.11 | 2026-11-02 | sa-agent | 修訂已核准的 v0.10（主控代核），依 PRD v0.11（R-20 PWA、US-34～US-37、AC-24-12、Q-41～Q-48，JimmyLin 2026-11-02 核准）。
 * |      |            |          | status 改為 in-review、核准欄位清空，三檔同步。
 * |      |            |          | (1) 新增 §12 PWA：型別 PwaIconPurpose、PwaManifestIcon、PwaManifest、PwaDeployFileRole、PwaDeployFile、
 * |      |            |          |     PwaPageToSwMessage、PwaRuntimeState（7 個：interface 4、type 3）。
 * |      |            |          | (2) 新增契約常數 PWA_APP_NAME、PWA_THEME_COLOR、PWA_BACKGROUND_COLOR、PWA_MANIFEST、PWA_DEPLOY_FILES、
 * |      |            |          |     PWA_PRECACHE_URLS、PWA_CACHE_PREFIX、PWA_BUILD_ID_PATTERN、PWA_BUILD_ID_META_NAME、PWA_UPDATE_RECHECK_MS、PWA_TEXTS（11 個）。
 * |      |            |          | (3) RuntimeState 新增 pwa: PwaRuntimeState（記憶體，不持久化）；BeforeInstallPromptEvent、ServiceWorkerRegistration
 * |      |            |          |     等瀏覽器物件不得進入 AppState（同 SpeechRecognition 的禁放規則）。
 * |      |            |          | 型別數 59 → 66（interface 32、type 34）；契約常數 20 → 31；localStorage 鍵數維持 2；
 * |      |            |          | PersistedData／StorageRecord／BackupFile 欄位不變，schemaVersion 維持 2，不需遷移。內容資料檔（src/data/）格式不變。 |
 * | 0.12 | 2026-11-03 | sa-agent | 修訂已核准的 v0.11（主控代核），原因：PRD v0.12（R-21 版面與視覺，US-38～US-41、修改 30 條 AC，Q-49～Q-57，
 * |      |            |          | JimmyLin 2026-11-03 核准）。status 改為 in-review、核准欄位清空，三檔同步。
 * |      |            |          | (1) 新增 §13 版面與視覺：常數 APP_DISPLAY_NAME（「EnglishContext」，Q-49）、FROZEN_IDENTIFIERS（不隨改名變動的
 * |      |            |          |     鍵名、備份格式、匯出檔名前綴、交付檔名、快取前綴）、COLOR_TOKENS（品牌主色 #1e9bf0、深品牌色 #0866ad、
 * |      |            |          |     強調橘 #f7893b 配深色字 #1f2937、背景 #eef4fa、表面 #ffffff、文字）、SEMANTIC_COLORS（色級、對錯、燈號、
 * |      |            |          |     達成金色，值不變，AC-38-03）、LAYOUT_TEXTS（主控台與首次畫面文字與格式）；型別 DashboardRuntimeState。
 * |      |            |          | (2) RuntimeState 新增 dashboard（資料備份展開狀態，只在記憶體，AC-39-08）。
 * |      |            |          | (3) §12 PWA：PWA_THEME_COLOR／PWA_MANIFEST.theme_color #2f6fd6 → #1e9bf0（Q-54）；PWA_BACKGROUND_COLOR／
 * |      |            |          |     background_color #f6f7f9 → #eef4fa（AC-34-04、AC-38-02）；PWA_APP_NAME 改為等於 APP_DISPLAY_NAME；
 * |      |            |          |     PwaIconPurpose maskable 註解改為「文字與對話框落在 80% 安全圓內」（AC-34-03）；PWA_CACHE_PREFIX 註明不改。
 * |      |            |          | (4) 註解：ColorLevelDefinition.status／vocabTarget（藍、金列只顯示 🔒 與「即將開放」，Q-57）、DataSourceEntry.fullName
 * |      |            |          |     範例改「EnglishContext 原創內容」、STORAGE_KEYS／BACKUP_FORMAT_ID 註明不改、TAB_LABELS／NAV_TAB_ORDER
 * |      |            |          |     移除主控台模組入口（Q-50）、PWA_TEXTS 註明安裝按鈕與不互通說明只在「資料備份」展開時顯示。
 * |      |            |          | 型別數 66 → 67（interface 33、type 34）；契約常數 31 → 36；localStorage 鍵數維持 2；
 * |      |            |          | PersistedData／StorageRecord／BackupFile 欄位不變，schemaVersion 維持 2，不需遷移。
 * |      |            |          | 內容資料檔格式不變；只有 sources.js 的 ORIGINAL fullName 值須改（README §4.3、DS-19）。 |
 * | 0.13 | 2026-11-03 | sa-agent | 修訂已核准的 v0.12（主控代核），原因：PRD v0.13 修改 AC-38-01（SD-FB-39，JimmyLin 2026-11-03 核准）：
 * |      |            |          | 標題列品牌圖示（AC-38-05）的橘色「EC」對話框不受強調橘用途限制，與 App 圖示一致。status 改為 in-review、
 * |      |            |          | 核准欄位清空，三檔同步，上游改為 PRD v0.13。只改 COLOR_TOKENS.accent 註解（用途加入「標題列品牌圖示除外」）；
 * |      |            |          | 常數值不變。型別數 67、契約常數 36、localStorage 鍵數 2 皆不變；schemaVersion 維持 2，不需遷移。 |
 * | 0.14 | 2026-11-03 | sa-agent | 修訂已核准的 v0.13（主控代核），原因：PRD v0.14 R-22（US-42、US-43、AC-01-08、AC-39-04 等 13 條改寫，
 * |      |            |          | 暫停 AC-05-01～AC-05-05，Q-58～Q-62；JimmyLin 2026-11-03 核准）。status 改為 in-review、核准欄位清空，三檔同步。
 * |      |            |          | (1) 新增 §14 版本號：常數 APP_VERSION_META_NAME（"emt-app-version"）、APP_VERSION_PATTERN（SemVer X.Y.Z）、
 * |      |            |          |     BUILD_CODE_LENGTH（7）、VERSION_LINE_TEXT（「版本 {version}（建置 {build}）」）；版本號由建置寫入 HTML meta，
 * |      |            |          |     且在計算 BUILD_ID 之前寫入，只改版本號 BUILD_ID 也會改變（AC-42-04，README §12.1 VR-1～VR-9）。
 * |      |            |          | (2) LAYOUT_TEXTS：新增 levelStatus「目前色級：{color}」（AC-01-08）；goalLineCapped、goalLineSeparator 標記停用
 * |      |            |          |     （AC-39-04 v0.14：目標行只顯示生效色級、結尾不帶「・」）；changeLink 改註明為按鈕（Q-61）。
 * |      |            |          | (3) 註解：DomainTemplate／TemplateWord／DOMAIN_TEMPLATES 註明 v0.14 畫面入口隱藏、資料照常交付（US-43）；
 * |      |            |          |     CustomVocabOrigin "template" 既有資料照原值保留（AC-43-03）；GoalState.appliedColor 註明畫面不顯示；
 * |      |            |          |     PWA_BUILD_ID_META_NAME 註明畫面只顯示前 7 碼（AC-36-02 v0.14）。
 * |      |            |          | 型別數 67 不變；契約常數 36 → 40；localStorage 鍵數 2 不變；PersistedData／StorageRecord／BackupFile 欄位不變，
 * |      |            |          | schemaVersion 維持 2，不需遷移；內容資料檔（src/data/）格式與值皆不變（pg-content 無工作）。 |
 * | 0.15 | 2026-11-04 | sa-agent | 修訂已核准的 v0.14（主控代核），原因：PRD v0.15 R-23（US-44～US-47、AC-44-01～AC-47-08，修改 AC-18-01、
 * |      |            |          | AC-24-02、AC-32-02、AC-42-02，E-102～E-117，Q-63～Q-71；JimmyLin 2026-11-04 核准，Q-63 為人類核准的持久化結構變更）。
 * |      |            |          | status 改為 in-review、核准欄位清空，三檔同步。**本版含持久化結構變更，須由人類核准，不適用主控代核。**
 * |      |            |          | (1) CURRENT_SCHEMA_VERSION 2 → 3、SUPPORTED_SCHEMA_VERSIONS [1, 2] → [1, 2, 3]。
 * |      |            |          | (2) 新增 interface FlashcardPosition；PersistedData 新增選填 flashcardPosition、part5CorrectIds、part5UnansweredOnly
 * |      |            |          |     （程式寫出時三欄必定存在，storage-schema.json $defs/PersistedDataWritten）。
 * |      |            |          | (3) LEARNING_PROGRESS_FIELDS 加入 "part5CorrectIds"（7 欄，Q-67 A）；part5UnansweredOnly 為偏好設定，初始化時保留。
 * |      |            |          | (4) 新增 §15：type Part5ViewKind（模擬測驗畫面種類，執行期推導）、常數 PART5_RECORD_TEXTS（畫面文字）。
 * |      |            |          | (5) 註解：Part5Progress、BackupFile、StorageRecord、RuntimeState.flashcard.index、learningQuotaNoticeShown、
 * |      |            |          |     FROZEN_IDENTIFIERS.backupFormatId、APP_VERSION_META_NAME（本次 1.1.0，Q-70 A）、Part5Question.id（id 不改號，Q-71）。
 * |      |            |          | 型別數 67 → 69（interface 34、type 35）；契約常數 40 → 41；localStorage 鍵數維持 2；src/data/ 格式不變。 |
 * | 0.16 | 2026-11-04 | sa-agent | 修訂已核准的 v0.15，原因：PRD v0.16 R-24（JimmyLin 2026-11-04 核准；人類手改產物後決定併入 1.1.0）：
 * |      |            |          | 新增 AC-23-07（資料來源與授權頁聯絡 email），修改 AC-36-03、AC-42-04（更新提示文字）。status 改為 in-review、
 * |      |            |          | 核准欄位清空，三檔同步。**只做文字層級修訂**：
 * |      |            |          | (1) PWA_TEXTS.updateNotice「有新版本，重新整理」→「有新版本，請更新版本」；updateButton「重新整理」→「更新版本」；
 * |      |            |          |     PwaPageToSwMessage、PwaRuntimeState.reloadRequested 註解同步（行為不變，Q-43 決議 A）。
 * |      |            |          | (2) 契約原本沒有「資料來源與授權」頁的固定文字常數，新增 §16 SOURCES_CONTACT_TEXT（README §4.3 L-7）。
 * |      |            |          | 型別數 69 不變；契約常數 41 → 42；localStorage 鍵數 2 不變；schemaVersion 維持 3，不需遷移；src/data/ 不變。 |
 * | 0.17 | 2026-11-04 | sa-agent | 修訂已核准的 v0.16（主控代核），原因：PRD v0.17 R-25（JimmyLin 2026-11-04 核准）的文字修訂。status 改為 draft、
 * |      |            |          | 核准欄位清空。**只改註解**：ProjectLicenseInfo 與 copyrightHolder（只供 MIT 聲明與署名，不再組「著作權人」文字）、
 * |      |            |          | BuiltinVocabItem.collocation（標籤「常用搭配詞」）、§5 標題與 PART5_QUESTION_BANK（「題型參考 TOEIC®（多益）Part 5」）、
 * |      |            |          | Part5Explanation.coreStrategy（AC-23-08）、TAB_LABELS（模擬測驗標題說明由「可註明」改為逐字顯示）。
 * |      |            |          | 型別數 69、契約常數 42、localStorage 鍵數 2 皆不變；schemaVersion 維持 3，不需遷移；內容資料檔格式不變。 |
 * | 0.18 | 2026-11-04 | sa-agent | 修訂已核准的 v0.17（主控代核），原因：PRD v0.18 R-26（JimmyLin 2026-11-04 核准）。status 改為 draft、核准欄位清空。
 * |      |            |          | (1) §15 新增 type Part5QuestionState（"answered"｜"lockedReview"｜"idle"，執行期推導，不持久化）。
 * |      |            |          | (2) PART5_RECORD_TEXTS 新增 lockedReviewFeedback、summaryNoNewAnswers、filterHint、filterHintAllCorrect；
 * |      |            |          |     **移除 replayKeepRecords**（Q-77 A；理由見 README UO-7 末段）。
 * |      |            |          | (3) 註解：Part5ViewKind、Part5Progress、part5CorrectIds、APP_VERSION_META_NAME（本次 1.2.0，Q-79 A）。
 * |      |            |          | 型別數 69 → 70；契約常數 42 不變（PART5_RECORD_TEXTS 鍵值變更）；localStorage 鍵數 2 不變；
 * |      |            |          | schemaVersion 維持 3，不需遷移；內容資料檔格式與值不變。 |
 * | 0.19 | 2026-11-05 | sa-agent | 修訂已核准的 v0.18（主控代核），原因：PRD v0.19 R-27、R-28（JimmyLin 2026-11-05 核准）。status 改為 in-review、核准欄位清空。
 * |      |            |          | (1) 新增 §17：interface AnsweredSummary、AdConfig、AdRuntimeState、SiteSeoMeta、SitePage、FooterLinkItem；
 * |      |            |          |     type AdSlotStatus、SitePageId、SiteLinkTarget、SiteInline、SiteBlock；常數 18 個（ANSWERED_SUMMARY_TEXT、AD_*、SITE_*、
 * |      |            |          |     LEGAL_STATEMENTS、FOOTER_LINKS、ROBOTS_TXT、SITEMAP_XML）。
 * |      |            |          | (2) TabId、TAB_LABELS 新增 about、contact、privacy；RuntimeState 新增 ad、sitePageReturnTab（皆不持久化）。
 * |      |            |          | (3) PWA_DEPLOY_FILES 8 → 13；PwaDeployFileRole +3 值、PwaDeployFile.mime +1 值；PWA_PRECACHE_URLS 不變。
 * |      |            |          | (4) LAYOUT_TEXTS 移除 statAccuracyLabel、新增 statPart5Label；clearConfirmMustInclude 第 2 段改寫；SOURCES_CONTACT_TEXT 改為新信箱。
 * |      |            |          | 型別數 70 → 81；契約常數 42 → 60；localStorage 鍵數 2 不變；schemaVersion 維持 3，不需遷移；內容資料檔格式與值不變。 |
 * | 0.20 | 2026-11-05 | sa-agent | 修訂已核准的 v0.19（主控代核），原因：PRD v0.20 R-29（JimmyLin 2026-11-05 核准，Q-94～Q-102 全採 PM 建議）：
 * |      |            |          | 新增 US-58～US-61；修改 AC-08-01、AC-08-06、AC-08-07、AC-08-08、AC-08-10、AC-08-13、AC-22-03、AC-30-04、AC-31-03、
 * |      |            |          | AC-33-01、AC-33-03、AC-33-06、AC-33-07、AC-33-08、AC-42-02。status 改為 in-review、核准欄位清空。
 * |      |            |          | (1) SttStatus 新增 "preparing"（只在記憶體）；RuntimeState.speech 新增 preparingPhase: SttPreparingPhase | null。
 * |      |            |          | (2) 新增 §18：type SttEngineEventKind、SttPreparingPhase、SttNoTextOutcome、SttResultRowKind；
 * |      |            |          |     interface SttEndInfo、SttTimingRange；常數 STT_FLOW_TEXTS、STT_TIMING、STT_RESULT_ROWS。
 * |      |            |          | (3) 註解：SttResult（recognizedText 三種燈號都顯示、不清洗）、APP_VERSION_META_NAME（1.3.0、本次 1.3.1，Q-102 A）。
 * |      |            |          | 型別數 81 → 87（interface 42、type 45）；契約常數 60 → 63；localStorage 鍵數 2 不變；
 * |      |            |          | schemaVersion 維持 3，備份格式不變，不需遷移；內容資料檔格式與值不變（pg-content 無工作）。 |
 * | 0.21 | 2026-11-09 | sa-agent | 修訂已核准的 v0.20（主控代核），原因：PRD v0.21 R-30、R-31（JimmyLin 2026-11-09 核准，Q-103～Q-108 皆 A）：
 * |      |            |          | 新增 US-62（AC-62-01～AC-62-12）；修改 AC-08-10、AC-30-04、AC-42-02、AC-58-07、AC-59-01、AC-59-05、AC-10-02、AC-54-01。
 * |      |            |          | status 改為 in-review、核准欄位清空，三檔同步。
 * |      |            |          | (1) 新增 interface SttStartOptions（start() 選項：既有 8 項 + onInterim(text, info)）。
 * |      |            |          | (2) SttEngineEventKind 新增 "interim"（result 事件中沒有最終結果的部分，由服務區分）。
 * |      |            |          | (3) SttEndInfo 新增 lastInterimText（8 → 9 欄）；服務**不**在 end 時以即時文字代替最終結果，由呼叫端依 README MS-1 判定。
 * |      |            |          | (4) STT_FLOW_TEXTS 新增 labelInterim「聽到：」（Q-104 A）；SttNoTextOutcome、SttResult、LearningEventKind、RuntimeState、
 * |      |            |          |     APP_VERSION_META_NAME（本次 1.3.2，Q-105 A）註解更新；
 * |      |            |          |     RuntimeState 不新增欄位（即時文字只在畫面模組內部變數）。
 * |      |            |          | (5) R-31：SITE_PAGES（about「模擬測驗」項）、SITE_HOME_SEO.description（81 → 75 字元）、SITE_HOME_JSON_LD.description、
 * |      |            |          |     SITE_NOSCRIPT.description 改值；§5 標題、PART5_QUESTION_BANK、TAB_LABELS 註解同步。LEGAL_STATEMENTS（LT-3 的「Part 5 題目」）不改（Q-108 A）。
 * |      |            |          | 型別數 87 → 88（interface 43、type 45）；契約常數 63 不變（STT_FLOW_TEXTS 新增 1 鍵；4 個常數改值）；
 * |      |            |          | localStorage 鍵數 2 不變；schemaVersion 維持 3，備份格式不變，不需遷移；內容資料檔格式與值不變（pg-content 無工作）。 |
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

/**
 * 色級開放狀態。"open" = 開放；"locked" = 鎖定並標「即將開放」（AC-01-01）。
 * （v0.12，Q-57、AC-26-01）"locked" 的色級列只顯示名稱、🔒 與「即將開放」（LAYOUT_TEXTS.levelLocked），
 *   不顯示 scenarioZh、建議字量與每日新字量（右側空白或「—」），整列降低透明度。
 */
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
  /**
   * 必填。分數上限（含），5 的倍數。例：725。
   * （v0.10，R-19 二）同時是「色級上限分數」：點選該色卡片時 goal.draftScore 一律設為本值
   * （含目前已選中的色級、含鎖定的藍／金），取代 Q-32「已在範圍內則不變，否則設為下限」（README §5.9 GS-2）。
   */
  scoreMax: number;
  /** 必填。本版開放狀態。 */
  status: ColorLevelStatus;
  /**
   * 必填。每日新字量 W_d（字/天）。藍、金的 20 僅供試算（Q-28）。
   * （v0.12）藍、金的 20 只出現在一般難易度設定頁試算區與首次畫面試算摘要行（AC-02-10、AC-41-02），色級列不顯示（Q-57）。
   */
  dailyNewWords: number;
  /**
   * 必填。建議字量符號；藍、金為 null。
   * （v0.12，Q-57）「待定」只出現在一般難易度設定頁試算區（AC-02-10）；色級列與首次畫面摘要行都不顯示「待定」。
   */
  vocabTarget: VocabTargetSymbol | null;
  /**
   * 必填。適用情境說明（AC-01-01）。不得含「官方門檻」「Tier」字樣。
   * （v0.12，AC-26-01）只在橘、棕、綠列顯示為一行（過長截斷、不換成多行）；藍、金列不顯示。
   */
  scenarioZh: string;
}

/**
 * 色級定義表（契約常數，值依 PRD 色級定義表）。
 * 判定規則：Color(S) = scoreMin ≤ S ≤ scoreMax 的那一列。
 * 生效色級 = Color(S) 為藍或金時取 "green"，否則同 Color(S)（PRD 名詞定義）。
 * （v0.10，R-19）點卡片的目標分數 scoreForCard(id) = COLOR_LEVELS.find(c => c.id === id).scoreMax，
 *   即 橘 215、棕 465、綠 725、藍 855、金 990（PRD「色級上限分數」）；不另設常數，避免與本表數值不一致。
 *   scoreMin／scoreMax 只用於內部判定 Color(S) 與上述推導，畫面不得顯示分數範圍（AC-01-01、AC-26-01、AC-26-05）。
 */
export const COLOR_LEVELS: readonly ColorLevelDefinition[] = [
  { id: "orange", nameZh: "橘", scoreMin: 10,  scoreMax: 215, status: "open",   dailyNewWords: 10, vocabTarget: "N_O", scenarioZh: "入門：最高頻的生活基礎字彙" },
  { id: "brown",  nameZh: "棕", scoreMin: 220, scoreMax: 465, status: "open",   dailyNewWords: 10, vocabTarget: "N_B", scenarioZh: "基礎：日常溝通與簡單職場用語" },
  { id: "green",  nameZh: "綠", scoreMin: 470, scoreMax: 725, status: "open",   dailyNewWords: 15, vocabTarget: "N_G", scenarioZh: "大學畢業門檻、基礎商務日常、職場多數情境、碩士先修" },
  { id: "blue",   nameZh: "藍", scoreMin: 730, scoreMax: 855, status: "locked", dailyNewWords: 20, vocabTarget: null,  scenarioZh: "高階商務談判、複雜文獻流暢處理" },
  { id: "gold",   nameZh: "金", scoreMin: 860, scoreMax: 990, status: "locked", dailyNewWords: 20, vocabTarget: null,  scenarioZh: "專業熟練者、近母語水準" },
] as const;

/**
 * 分數規則（Q-12；v0.10 依 R-19、Q-39 修訂）。
 * - SCORE_MIN／SCORE_MAX／SCORE_STEP：**只用於資料層驗證**——localStorage 讀取（§5.3，不合法 → AC-18-05 重設，E-11）
 *   與備份匯入（§6.2 步驟 5，不合法 → format，E-31）。值須為 10～990 的整數且為 5 的倍數（storage-schema.json $defs/Score）。
 *   資料層**不做四捨五入**：非 5 的倍數一律視為不合法，不修正。
 * - 畫面不再使用（R-19 一、七）：無分數滑桿與輸入框；「非 5 的倍數四捨五入」（AC-02-09）、
 *   「請輸入 10～990 的分數」（AC-02-02）皆屬 v0.10 暫停的 AC，不得出現在畫面（AC-26-05）。契約不定義該提示文字常數。
 * - SCORE_DEFAULT：首次使用、重設（AC-18-05）的預設分數 = 725（綠色 scoreMax；v0.10 依 Q-39 決議 B 由 600 改為 725）。
 *   只影響新產生的預設值；localStorage／備份中已存的分數（如 600）不轉換（R-19 六、README §5.9 GS-4）。
 */
export const SCORE_MIN = 10;
export const SCORE_MAX = 990;
export const SCORE_STEP = 5;
export const SCORE_DEFAULT = 725;

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
  /**
   * 必填。全名。例："New General Service List"、"EnglishContext 原創內容"。
   * （v0.12，Q-49、AC-38-10）ORIGINAL 的 fullName 固定為 "EnglishContext 原創內容"（原 "English Master Track 原創內容"），
   *   「資料來源與授權」頁顯示本值；pg-content 須修改 src/data/sources.js（README §4.3、DS-19）。其餘來源不變。
   */
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
 * 聲明文字由 pg-frontend 依 AC-23-02、AC-23-06 原文組字；本物件只提供數值。
 * （v0.17，R-25 五、六）原創內容聲明、圖示與名稱聲明的現行文字見 README §4.3 L-8（LT-3、LT-4），組字結果須逐字相同。
 */
export interface ProjectLicenseInfo {
  /**
   * 必填。MIT 聲明的著作權人，固定 "JimmyLin"（Q-31）。
   * （v0.17，R-25）本欄仍供 MIT 聲明（Copyright JimmyLin）與衍生資料署名使用；
   *   畫面與 HTML 開頭註解不得再組出「著作權人 JimmyLin」「原創內容著作權人 JimmyLin」「保留所有權利」（AC-23-02、AC-23-06）。
   */
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
  /** 必填，非空。搭配詞（卡片正面，欄位標籤逐字為「常用搭配詞」，AC-06-01，v0.17，R-25 三）。原創。例："address the issue；mailing address"。 */
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
//    （v0.14，PRD R-22 二、US-43、Q-59）畫面入口暫停：難易度設定頁的「領域範本」區塊以 hidden + inert 隱藏，
//    但本節型別、templates.js 檔案、全域變數、最少筆數與 V-TPL 驗證全部不變，照常交付並打包進 .html
//    （AC-43-01「交付檔原始碼仍含 3 個範本資料與注入程式」）。pg-content 不需為 v0.14 修改 templates.js。
//    US-05（AC-05-01～AC-05-05）v0.14 暫停不驗收；畫面規則見 README §5.8 HT-6～HT-9。
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

/** 領域範本。對應：AC-05-01～AC-05-05（v0.14 暫停）、AC-43-01（資料保留）。 */
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
// §5 模擬測驗題庫（題型參考 TOEIC®（多益）；v0.21 依 R-31 拿掉「Part 5」；識別字沿用 part5／Part5*，R-15）— 提供者：pg-content（src/data/part5.js）
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
  /**
   * 必填，非空。「解題核心思路」（繁中，可夾英文）。
   * （v0.17，R-25 四）不得宣稱「多益常考」「多益最常見」等無佐證說法（AC-23-08、README V-LGL-05）；p5-009 的值見 README LT-6。
   */
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
  /**
   * 必填。格式 "p5-" + 3 位數字（"p5-001"～），唯一。
   * （v0.15，Q-71）本 id 是使用者「答對紀錄」（PersistedData.part5CorrectIds）的鍵：已交付的 id 不得改號、不得改指另一題；
   * 刪除的題目 id 不得重用於新題（README V-P5-08）。
   */
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
 * v0.15 由 2 升為 3（PRD R-23、Q-63，人類已核准）：PersistedData 新增 flashcardPosition、part5CorrectIds、part5UnansweredOnly。
 *   升版理由（README §5.3 版本表）：(1) 契約既有規則「PersistedData 任何結構變更（含新增選填欄位）都要 + 1」；
 *   (2) v0.14 程式以 additionalProperties: false 嚴格驗證 v2，新欄位若仍標 2，舊程式匯入時會誤報「格式錯誤」，
 *   升為 3 後舊程式顯示「備份檔版本不相容」（PRD E-117 預期行為）；(3) 遷移只做一次、可冪等（AC-47-04）。
 * 寫入 localStorage 與匯出備份一律寫此值。
 */
export const CURRENT_SCHEMA_VERSION = 3;

/**
 * 本程式可讀取（含可升級）的版本清單。AC-24-06 的「支援版本」顯示此清單（v0.15 畫面「1、2、3」）。
 * 1 = v0.7 程式寫入的 localStorage 資料與匯出的備份（AC-24-10、AC-30-12），讀入時依 README §5.3 MG-1～MG-4 遷移到 2，再依 MG-5～MG-8 遷移到 3。
 * 2 = v0.8～v0.14 程式寫入／匯出（AC-47-03、AC-47-04），讀入時依 MG-5～MG-8 遷移到 3。
 * 3 = v0.15 起。
 */
export const SUPPORTED_SCHEMA_VERSIONS: readonly number[] = [1, 2, 3];

/**
 * 近 N 天每日已學字數的保存天數（契約常數，PRD R-17、AC-30-09）。
 * 保存視窗 = [today − (LEARNED_HISTORY_DAYS − 1) 天, today]，即「今天往前第 29 天到今天」，最多 30 筆。
 */
export const LEARNED_HISTORY_DAYS = 30;

/** 主控台長條圖顯示天數（含今天，契約常數，AC-30-01、AC-30-08）。由左到右 = today − 6 天 … today。 */
export const DASHBOARD_CHART_DAYS = 7;

/**
 * localStorage 鍵名（契約常數）。file:// 下多個本機 HTML 可能共用同一個 origin，故加專案前綴。
 * （v0.12，Q-49、AC-38-10 (2)）App 名稱改為「EnglishContext」**不影響**鍵名：兩個鍵維持原值，不得改名、不得新增別名鍵
 *   （改名會讓既有使用者的學習紀錄讀不到）。見 §13 FROZEN_IDENTIFIERS。
 */
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
 * （v0.10）另對應 AC-01-05、AC-25-04、AC-26-02、AC-26-05、AC-26-06、AC-32-04；規則見 README §5.9 GS-1～GS-8。
 * 預設：{ draftScore: 725, appliedScore: 725, appliedColor: "green", effectiveColor: "green" }（v0.10 由 600 改為 725，Q-39）。
 * 畫面不顯示 draftScore、appliedScore 的數值（R-19 一、四；AC-17-06、AC-26-05），QA 以 localStorage 或匯出備份驗證。
 */
export interface GoalState {
  /**
   * 必填。難易度設定頁目前選中的分數（未套用也保存，AC-02-08；首次畫面只存在記憶體，FS-2）。10～990 且為 5 的倍數。
   * （v0.10）選中卡片 = Color(draftScore)；點卡片時設為該色 scoreMax（GS-2）；取消初始化確認時還原為 appliedScore（CI-9）。
   * v0.9 以前由滑桿／輸入框設定，可能是任意合法分數（如 600、735），讀取時不轉換（GS-4）。
   */
  draftScore: number;
  /**
   * 必填。最近一次按「套用」（首次畫面為「開始學習」）的分數，即 PRD「目標分數」。10～990 且為 5 的倍數。
   * 套用時 = draftScore；未點卡片直接套用時維持原值，不改寫為色級上限或下限（R-19 六、AC-26-06）。
   * （v0.10）主控台不再顯示本值（AC-17-06）。
   */
  appliedScore: number;
  /**
   * 必填。目前目標色級 = Color(appliedScore)，可為 blue／gold（AC-01-07）。冗餘欄位，讀取時以 appliedScore 重新計算覆蓋。
   * （v0.14，R-22 三、Q-60）只存在資料中（含備份）：難易度設定頁狀態列與主控台目標行**不顯示**本值（AC-01-08、AC-39-04）；
   * 藍、金的選擇只在色級列選中狀態（Color(draftScore)）與試算區呈現（AC-01-07、AC-02-10）。欄位與值域不變。
   */
  appliedColor: ColorLevel;
  /**
   * 必填。目前生效色級；appliedColor 為 blue／gold 時為 "green"。冗餘欄位，讀取時重新計算覆蓋。
   * （v0.14）畫面上「目前色級」一律指本值：狀態列 LAYOUT_TEXTS.levelStatus 與主控台目標行 goalLineSame 的 {color}（AC-01-08、AC-39-04）。
   */
  effectiveColor: OpenColorLevel;
}

/**
 * 自訂單字來源。"manual" = 表單新增；"template" = 領域範本注入。
 * （v0.14，US-43）畫面已無注入入口，本版不會再產生新的 "template" 項目；但既有（v0.13 以前注入，或匯入備份帶入）的
 * "template" 項目照原值保留，讀取、匯入、匯出、切換難易度初始化都不刪除、不改為 "manual"、不清空 templateId（AC-43-03、README HT-9）。
 * 值域不變（storage-schema.json 的 enum 未改）。
 */
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
 * （v0.15，R-23）**本型別欄位不變**。答對紀錄與「只練沒答對」開關放在 PersistedData 頂層（part5CorrectIds、part5UnansweredOnly），
 *   不放進本物件，理由：初始化（CI-4）整個 part5 回預設值，但開關須保留（Q-67 A）；「清除答對紀錄」不得動到累計（Q-65 C）。
 *   - currentIndex 仍為題庫索引，畫面「第 i / N 題」與進度條仍以題庫題號計算（Q-66 A，README MT-1）。
 *   - 開關開啟時，currentIndex 的移動改依 README §5.11 UO-4～UO-7（跳過曾答對的題目）；跳過的題目不計入 roundAnswered。
 *   - roundAnswered／roundCorrect／totalAnswered／totalCorrect 的計算與 v0.14 完全相同（AC-45-06）。
 * （v0.18，R-26）**本型別欄位仍不變**。v0.18 起曾答對的題目不可再作答（README LV-3），經過已答對鎖定檢視不改變任何計數。
 *   已答對鎖定檢視不存入本物件，由 lockedSelection、currentIndex、part5CorrectIds、part5UnansweredOnly 推導（Part5QuestionState，README LV-1）；
 *   不得為了顯示鎖定而把正解寫入 lockedSelection，否則會被當成本次作答（AC-48-02、AC-48-05）。
 */
export interface Part5Progress {
  /** 必填。目前題目在 PART5_QUESTION_BANK 的索引（0 起算；畫面「第 5 題」= 4）。≥ 題庫長度時視為 0（V-ST-05）。 */
  currentIndex: number;
  /**
   * 必填。目前題目已作答時所選的索引（鎖定狀態，重新載入後仍鎖定，AC-11-06）；未作答為 null。
   * （v0.18）非 null 一律代表「本次作答結果」，優先於已答對鎖定檢視（含 v1.1.0 留下的答錯結果，AC-48-08 (c)）；
   * null 只表示「沒有本次作答結果」，已答對鎖定檢視時也是 null（README LV-1）。
   */
  lockedSelection: OptionIndex | null;
  /** 必填。畫面階段。 */
  phase: Part5Phase;
  /** 必填。本輪答題數（結算「答對 x / y」的 y），按「重新開始」歸 0。 */
  roundAnswered: number;
  /** 必填。本輪答對數（x），0～roundAnswered。 */
  roundCorrect: number;
  /** 必填。累計答題數，「重新開始」不清除（AC-11-07）。（v0.19，R-27）照常更新，畫面不顯示；「有學習紀錄」判定仍使用（AC-49-06）。 */
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
 * 單字卡上次位置（v0.15 新增，schemaVersion 3；PRD US-44、R-23 一、Q-63、Q-68）。
 * 對應：FR-2.1、FR-6.2、AC-44-01～AC-44-10、AC-47-01～AC-47-06、AC-18-01、AC-24-02、E-102～E-108。
 * 意義：單字卡頁「第 i / N 張」所指的目前卡片。以 wordKey 為主鍵找回同一張；找不到時以 ordinal 作為退回依據。
 * 只記位置，不記單字卡／測驗模式與正反面（Q-68 A，AC-44-09）。
 * 例：{ wordKey: "monetization", ordinal: 10 }
 * 讀取還原（README §5.10 FP-2）：N = 目前單字集張數；N = 0 → 空狀態、紀錄不動；wordKey 在單字集 → 該張；
 *   否則第 min(ordinal, N) 張（AC-44-05）。
 * 「結構正確」（storage-schema.json $defs/FlashcardPosition）：null，或恰含下列 2 鍵的物件，wordKey 為字串、ordinal 為整數 ≥ 1。
 *   不符 = 整個欄位型別錯誤：讀 localStorage → 只把本欄重設為 null（AC-44-06 (c)、AC-47-05）；匯入備份 → 格式錯誤（AC-47-06 (c)）。
 */
export interface FlashcardPosition {
  /**
   * 必填。目前卡片的 wordKey（C-2 正規化形式；內建與自訂一視同仁，同 StudyCard.wordKey）。
   * 比對時一律先以 C-2 正規化再比對（不分大小寫，同 AC-04-06）。C-2 後為空字串 → 整筆視同無紀錄（null），不報錯。
   */
  wordKey: string;
  /**
   * 必填。目前卡片的序號 i（1 起算，= RuntimeState.flashcard.index + 1），整數 ≥ 1。
   * 只在 wordKey 找不到時使用：顯示第 min(ordinal, N) 張（AC-44-05、E-104）。不得大於當時單字集張數（程式寫出時）。
   */
  ordinal: number;
}

/**
 * 全部使用者資料（localStorage 與備份檔共用的資料本體）。
 * 對應：FR-6.2、AC-18-01、AC-18-02、AC-24-02、R-04、R-17、（v0.15）R-23、AC-47-01～AC-47-06。
 * 只放可序列化的使用者狀態；**不放**內建內容、語音辨識／合成實例、音訊（AC-21-03）、畫面暫態。
 * v0.8（schemaVersion 2）新增 todayLearned、learnedHistory 兩個必填欄位；其餘 7 欄與 v1 完全相同。
 * （v0.9，US-32）切換難易度初始化學習紀錄時：LEARNING_PROGRESS_FIELDS 列出的欄位回到 README §5.2 預設值；
 *   goal 改為新套用的值；customVocab、sttNoticeAcknowledged 原值保留。欄位集合不變（AC-32-10），規則見 README §5.7。
 * （v0.15，schemaVersion 3）新增 3 個**選填**欄位 flashcardPosition、part5CorrectIds、part5UnansweredOnly（Q-63 A：
 *   新資料一律選填，舊資料給預設值）。「選填」= 讀 localStorage、匯入備份時缺少此鍵不算錯誤，以預設值補上；
 *   程式寫出（localStorage 寫入、匯出備份）時 12 欄**一律寫出**（storage-schema.json $defs/PersistedDataWritten），
 *   因此同一版程式操作前後欄位集合不變（AC-32-10、AC-38-10 依 PRD 共通規則 2 改讀）。
 *   初始化時：part5CorrectIds 清空（LEARNING_PROGRESS_FIELDS）、part5UnansweredOnly 保留、flashcardPosition 設為 null（README CI-4、FP-4）。
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
  /**
   * 選填（v0.15 新增，schemaVersion 3；US-44）。單字卡上次位置；null 或缺少 = 無紀錄（從第 1 張開始）。預設 null。
   * 寫入時機：目前卡片每次改變時立即寫入（README FP-3）；生效色級改變（含初始化「確定」）時設為 null（FP-4、AC-44-08）。
   * 不屬「有學習紀錄」判定（CI-2），也不在 LEARNING_PROGRESS_FIELDS 中。
   */
  flashcardPosition?: FlashcardPosition | null;
  /**
   * 選填（v0.15 新增，schemaVersion 3；US-45、Q-64 A）。模擬測驗**曾答對**的題目 id（Part5Question.id），依首次答對的先後附加。預設 []。
   * 值域：每項為 trim 後非空的字串，不重複（程式寫出時）。**不**限定 "p5-" 格式、**不**與目前題庫比對：
   *   題庫中已不存在的 id 保留不刪除，只在統計與標示時忽略（Q-71 A，AC-45-07、E-109）。
   * 只記「曾答對」：答錯不移除、不記答錯或最近一次結果（Q-64 A，AC-45-03）。K（已答對數）不另存，由本欄 ∩ 題庫推導（README CR-3）。
   * 清空時機只有：初始化「確定」（LEARNING_PROGRESS_FIELDS，Q-67 A）、「清除答對紀錄，重新來過」確定（README CR-6；v0.18 起 K ≥ 1 時各畫面皆有入口，Q-78 B、CR-10）、
   *   讀取失敗整體重設（AC-18-05）、匯入覆蓋（以備份值為準）。「重新開始」（AC-11-07）不清除。
   * 例：["p5-001", "p5-005", "p5-010"]
   */
  part5CorrectIds?: string[];
  /**
   * 選填（v0.15 新增，schemaVersion 3；US-46、Q-69 A）。「只練沒答對的題目」開關。預設 false。
   * 屬偏好設定（與 sttNoticeAcknowledged 同性質）：初始化時**保留**（Q-67 A）；不屬「有學習紀錄」判定（AC-46-10）；
   *   隨 localStorage 與備份保存（Q-69 A）。開啟時出題規則見 README §5.11 UO-1～UO-10。
   *   （v0.18，R-26）開關同時決定顯示範圍：開啟 = 只顯示未答對；關閉 = 顯示全部，曾答對的題目為已答對鎖定檢視（Part5QuestionState）。欄位與預設值不變。
   */
  part5UnansweredOnly?: boolean;
}

/**
 * 學習進度紀錄欄位（契約常數，v0.9 新增，PRD US-32 名詞「學習進度紀錄」(1)～(6)、R-18 一；v0.15 加 (7)）。
 * 切換難易度並在確認視窗按「確定」時，**只有**這些欄被覆寫為 README §5.2 預設值（白名單）；PersistedData 其他欄位
 * （goal 依套用規則更新；flashcardPosition 依 FP-4 設為 null；customVocab、sttNoticeAcknowledged、part5UnansweredOnly
 *  與日後新增的任何使用設定欄位）一律原值保留。
 * 順序對應 PRD (1) 已掌握單字、(2) 四選一統計、(3) 模擬測驗、(4) 打卡、(5) 今日已學、(6) 近 30 天歷史、
 * （v0.15，Q-67 A）(7) 模擬測驗答對紀錄。
 * 對應：AC-32-02、AC-32-03、AC-32-10、AC-45-08；規則見 README §5.7 CI-1～CI-10。不持久化（常數本身不寫入 localStorage）。
 */
export const LEARNING_PROGRESS_FIELDS: readonly (keyof PersistedData)[] = [
  "masteredWordKeys",
  "vocabQuiz",
  "part5",
  "streak",
  "todayLearned",
  "learnedHistory",
  "part5CorrectIds",
];

/** localStorage 主鍵（STORAGE_KEYS.state）的值。 */
export interface StorageRecord {
  /**
   * 必填。結構版本，整數；本版寫入 = CURRENT_SCHEMA_VERSION（v0.15 起為 3）。
   * 讀到 1 → MG-1～MG-4 遷移到 2 → MG-5～MG-8 遷移到 3；讀到 2 → MG-5～MG-8 遷移到 3（README §5.3），遷移後寫回一次。
   */
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

/**
 * 備份檔格式識別字串（契約常數）。
 * （v0.12，Q-49、AC-38-10 (2)）App 改名不影響本值，維持 "english-master-track-backup"（v0.11 以前的備份須能匯入，AC-24-03）。
 */
export const BACKUP_FORMAT_ID = "english-master-track-backup";

/**
 * 備份檔。檔名 "english-master-track-backup-YYYYMMDD.json"（本地日期，AC-24-01）。
 * （v0.12，AC-38-10 (2)）檔名前綴 "english-master-track-backup-" 不隨 App 改名變動（FROZEN_IDENTIFIERS.backupFileNamePrefix）。
 * 對應：FR-6.2、AC-24-01～AC-24-11、Q-18、R-17。
 * 頂層恰好這 5 個鍵（v0.8 不變）；匯入步驟 5 依 storage-schema.json $defs/BackupFile 檢查，有多餘鍵、缺鍵或型別不符 → "format"（README §6.2 IM-2）。
 * 版本相容（v0.8，README §6.3）：
 *   - 匯出：schemaVersion = 2，data 含 todayLearned、learnedHistory（正規化後的值）。
 *   - 匯入 schemaVersion = 1（v0.7 程式匯出，data 無新欄位）：步驟 4 依 MG-1～MG-4 補預設值後照常匯入，不是錯誤（AC-24-10）。
 *   - 匯入 schemaVersion = 2：data 必須含兩個新欄位且 shape 正確，缺少或整個欄位型別錯誤 → "format"（AC-24-05、AC-24-11）；
 *     shape 正確但項目無效 → 步驟 7 以「匯入當天」為今天正規化捨棄，不報錯、不計入略過筆數（IM-8）。
 *   - format 識別字串不變，不另設備份專用版本號。
 * 版本相容（v0.15，README §6.3、IM-9、IM-10）：
 *   - 匯出：schemaVersion = 3，data 12 欄齊全（含 flashcardPosition、part5CorrectIds、part5UnansweredOnly），符合 $defs/PersistedDataWritten。
 *   - 匯入 1、2（v0.7、v0.8～v0.14 程式匯出）：步驟 4 依遷移鏈補新欄位預設值（第 1 張、無答對紀錄、開關關閉），照常匯入（AC-47-03）。
 *   - 匯入 3：三個新欄位**選填**，缺少 → 預設值；整個欄位型別錯誤（答對紀錄不是陣列、開關不是布林值、位置不是 null／物件、
 *     ordinal 不是正整數、wordKey 不是字串）→ "format"（AC-47-06 (c)）；項目層級無效（非字串或空白 id、重複 id、題庫中不存在的 id、
 *     位置的單字不在單字集）→ 不報錯、不計入略過筆數（AC-47-06 (a)(b)、Q-71 A）。
 *   - 舊版程式（v0.14 以前，支援 [1, 2] 或 [1]）匯入本版備份 → 其「備份檔版本不相容」，屬預期行為（PRD E-117，範圍外）。
 */
export interface BackupFile {
  /** 必填。固定 BACKUP_FORMAT_ID；不符視為格式錯誤（AC-24-05）。 */
  format: "english-master-track-backup";
  /**
   * 必填。備份格式版本號（AC-24-02）= 匯出當時的 CURRENT_SCHEMA_VERSION（v0.15 起匯出 3）。
   * 匯入接受 SUPPORTED_SCHEMA_VERSIONS（1、2、3）；缺失或不在清單內視為版本不相容（AC-24-06）。
   */
  schemaVersion: number;
  /**
   * 必填。匯出時間，RFC 3339 date-time（含時區），例："2026-10-30T01:02:03.000Z"。
   * 匯入時強制檢查（格式相符且 Date.parse 可解析），不符 → "format"（IM-2）。
   */
  exportedAt: string;
  /** 必填。內建字庫資料版本（VocabManifest.dataVersion；無法取得時填 ""）。匯入只檢查是字串，內容不影響匯入。 */
  contentDataVersion: string;
  /**
   * 必填。使用者資料，結構同 PersistedData（schemaVersion 1 的檔案於遷移前不含 todayLearned、learnedHistory；
   * schemaVersion 1、2 的檔案於遷移前不含 v0.15 的 3 個欄位）。
   */
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
 * （v0.19，R-28，Q-86 決議 C1）"about"、"contact"、"privacy" = 應用內的關於我、聯絡我們、隱私權政策；由頁尾連結進入，不在導覽列（README SP-1～SP-4）。
 */
export type TabId = "dashboard" | "customizer" | "flashcards" | "part5" | "decoder" | "phrasebank" | "sources" | "about" | "contact" | "privacy";

/**
 * 頁面畫面名稱（契約常數，v0.8 依 PRD R-15、AC-20-03、AC-10-02、AC-23-02）。
 * 導覽、頁面標題一律使用此文字。
 * （v0.17，R-25 一）模擬測驗頁必須顯示標題說明（AC-10-02、README LT-2）。（v0.21，R-31，Q-108 A）逐字為
 *   「題型參考 TOEIC®（多益），非 ETS 官方或認可內容」，說明中不得出現「Part 5」（v0.17～v0.20 為「…（多益）Part 5，非 ETS…」）。
 * （v0.12，Q-50 決議 A）主控台不再有模組入口；主控台頁面標題為 LAYOUT_TEXTS.dashboardTitle「學習主控台」（AC-39-01），
 *   導覽項文字仍為 dashboard「主控台」。
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
  about: "關於我",
  contact: "聯絡我們",
  privacy: "隱私權政策",
};

/**
 * 導覽列項目與順序（契約常數，AC-20-03、AC-27-01、AC-27-04）：恰好 4 項（v0.9 由 6 項改為 4 項，移除 decoder、phrasebank，R-18 三）。
 * "sources" 不在導覽列，（v0.12）只由頁尾連結進入（AC-23-02、AC-39-06）；（v0.19）"about"、"contact"、"privacy" 同樣不在導覽列（AC-57-01）。
 * （v0.12，Q-50 決議 A）主控台**不再有**模組入口與「資料來源與授權」入口（AC-17-06、AC-39-01、AC-39-06）；
 *   主控台本體只有「開始今日學習」（→ "flashcards"）與目標行「變更」（→ "customizer"）兩個換頁控制項（README HT-2、DB-3、DB-4）。
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
 * - "stt"：STT 評分完成並顯示分數（逾時、空結果、錯誤不算，AC-30-04）。（v0.21，Q-103 A）只有即時文字就結束、以最後一段
 *   即時文字評分（README IT-9）同樣算；顯示過即時文字但以手動停止、換卡、錯誤或 nomatch 結束不算（AC-62-06）。
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

/**
 * STT 評分結果（執行期，不持久化，AC-21-03、AC-60-07）。對應：AC-08-03～AC-08-08、AC-08-11、AC-08-12、AC-60-01～AC-60-07。
 * （v0.20，US-60）分數區依 §18 STT_RESULT_ROWS 決定文字列：綠、黃燈只顯示「辨識文字」；紅燈顯示「辨識文字」與「目標文字」（Q-98 A）。
 * 只有「清洗後非空」的辨識文字才會產生本物件；清洗後為空屬 US-59「有收到聲音」訊息，不產生 SttResult（AC-59-03、AC-60-04）。
 */
export interface SttResult {
  /**
   * 必填。辨識原文（未清洗）：語音辨識服務回傳的字串原樣保存，不改大小寫、不去標點（AC-60-01，例 "Latency."、"adress"、"kitten"）。
   * 唯一允許的處理是服務取出文字時的既有串接（各結果第 1 候選、各段 trim 後以 1 個半形空白連接，README RT-1）。
   * （v0.21，Q-103 A）只有即時文字就結束時，本欄 = 該次嘗試的 SttEndInfo.lastInterimText 原樣（README IT-9），
   *   分數區與計分和收到同文字的最終結果完全相同（AC-62-05）；有最終結果時一律用最終結果，不採用即時文字（AC-62-03 (a)）。
   * 畫面一律以 textContent 寫入，值元素 lang="en"（AC-60-05）；不得寫入 localStorage 或備份（AC-60-07）。
   * 這是引擎輸出，不代表使用者實際發音，也不是語言判斷結果（AC-60-03、Q-101 A）。
   */
  recognizedText: string;
  /** 必填。目標文字（卡片 word 原文）。（v0.20）只在紅燈顯示（STT_RESULT_ROWS.red）。 */
  targetText: string;
  /** 辨識吻合度 0～100 整數。 */
  score: number;
  /** 燈號。 */
  light: SttLight;
}

/**
 * 麥克風狀態（執行期，不持久化，AC-58-12）。
 * - "idle"：待機。按鈕文字「麥克風跟讀」；說明對話框顯示期間按鈕也是待機外觀，但狀態值為 "notice"。
 * - "notice"：顯示首次說明中（AC-08-13）。按「我知道了」→ "preparing"；按「取消」→ "idle"（不呼叫 getUserMedia）。
 * - "preparing"：（v0.20，US-58）準備中 = 按下麥克風後、進入聆聽中之前。從按下（或「我知道了」）起算，包含取得麥克風與
 *   權限詢問期間（Q-97 A），直到引擎確認開始收音（README PR-3）。按鈕文字 STT_FLOW_TEXTS.micPreparing「準備中」、
 *   aria-label STT_FLOW_TEXTS.micPreparingLabel；收音條 5 格全暗（AC-58-02）；不使用聆聽中的紅色與閃爍、無動畫（AC-58-13）。
 *   子階段見 RuntimeState.speech.preparingPhase。屬「未聆聽」（AC-33-03）。
 * - "listening"：聆聽中（AC-08-01）；收音條依音量點亮。
 * 轉移規則見 README §14.1 PR-1～PR-12。
 * 對應：AC-08-01、AC-08-13、AC-33-03、AC-58-01～AC-58-13。
 */
export type SttStatus = "idle" | "notice" | "preparing" | "listening";

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
 * （v0.20，US-58、US-59）T_READY、T_BUFFER、T_FALLBACK 的計時器 ID、嘗試代號（用來忽略遲到事件）、
 *   本次辨識的事件紀錄（§18 SttEndInfo 的旗標）只能放在 src/app 模組內部變數；不得寫入 PersistedData、localStorage、
 *   備份檔或任何其他儲存（AC-58-12、AC-59-07）。AppState 只多 speech.sttStatus 的 "preparing" 值與 speech.preparingPhase。
 * （v0.21，US-62、Q-106 A）**即時文字不進 AppState**：目前顯示的即時文字、即時文字列是否顯示，只放在語音畫面模組的內部變數
 *   （與 DOM），本介面**不新增欄位**；SttEndInfo.lastInterimText 只經回呼傳遞。理由：(1) 只供顯示、說話期間每秒可能更新多次，
 *   不應觸發全域狀態更新與重繪；(2) 不在 AppState 就不可能經由狀態快照被寫入 localStorage 或匯出備份（AC-62-10）；
 *   (3) 「即時文字列與分數區不同時出現」（AC-62-03）由同一個畫面模組在同一次更新內處理即可；(4) QA 以 DOM 驗證（V-STT-11～V-STT-17），
 *   不需讀狀態。即時文字不得寫入 PersistedData、localStorage、IndexedDB、Cache Storage、備份檔或任何其他儲存（README IT-8）。
 */
export interface RuntimeState {
  /** （v0.8）進入模式；啟動時依 README §5.5 FS-1 判定。 */
  entryMode: EntryMode;
  /**
   * 目前頁面；entryMode = "main" 啟動時為 "dashboard"。
   * entryMode = "firstRun" 時只能是 "customizer"（首次畫面）、"sources"，或（v0.19）"about"、"contact"、"privacy"（從頁尾開啟，返回後回到首次畫面，AC-25-07、AC-57-01）。
   * （v0.9）任何時候都不得為 HIDDEN_TAB_IDS 中的值（README §5.8 HT-1、HT-3，AC-20-04）。
   * 切換到其他頁面時，若原頁面為 "flashcards"，須釋放麥克風（PRD AC-33-02；釋放實作屬設計層）。
   */
  currentTab: TabId;
  /** 目前單字集（由 PersistedData.goal.effectiveColor + customVocab 推導的快取）。 */
  studySet: StudyCard[];
  /** 單字卡（識別字沿用 flashcard，R-15）。 */
  flashcard: {
    /**
     * 目前卡片索引（0 起算）；切換色級後歸 0（AC-03-05）。
     * （v0.15，US-44）啟動時與單字集每次重建（新增／刪除自訂單字、匯入）後，由 PersistedData.flashcardPosition 依 README §5.10 FP-2
     *   解析得出；使用者每次改變本值（上一張、下一張、滑動、測驗模式換題等）即依 FP-3 寫回 flashcardPosition（ordinal = index + 1）。
     *   單字集為空時為 0 且不顯示卡片（AC-06-06）。mode、isFlipped、quiz 不持久化，重新載入一律 "card"、正面（Q-68 A）。
     */
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
    /** 麥克風狀態。（v0.20）含 "preparing"；重新載入一律 "idle"（AC-58-12）。 */
    sttStatus: SttStatus;
    /**
     * （v0.20，US-58）準備中的子階段。必填；sttStatus ≠ "preparing" 時必為 null，= "preparing" 時必不為 null。
     * 只在記憶體，不寫入 localStorage、備份檔或任何儲存（AC-58-12）。值域與轉移見 §18 SttPreparingPhase、README PR-2。
     */
    preparingPhase: SttPreparingPhase | null;
    /**
     * 最近一次評分結果；切換卡片時清為 null。
     * （v0.20）按下麥克風進入 "preparing" 時也清為 null（AC-58-01「前次分數與訊息清除」，README PR-4）。
     */
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
   * （v0.15，AC-44-10 (b)、AC-47-07 (b)「同一工作階段只提示一次，與 AC-30-14 共用」）本旗標**同時**控制下列寫入容量不足的提示：
   *   單字卡位置（FP-3）、模擬測驗作答（含答對紀錄，CR-2）、開關切換（UO-1）、「下一題」、「重新開始」與「清除答對紀錄」（UO-5、UO-6、UO-10、CR-6；v0.18）。
   *   識別字沿用不改名（README §5.12 WR-2）。
   */
  learningQuotaNoticeShown: boolean;
  /**
   * （v0.11，R-20）PWA 的頁面端狀態（安裝按鈕、新版提示）。只存在記憶體，不寫入 localStorage、備份檔或任何儲存。
   * 啟動時依 README §10.5 PE-1 判定 eligible；其餘欄位初始值見 PwaRuntimeState 註解。
   * BeforeInstallPromptEvent、ServiceWorkerRegistration、ServiceWorker 物件不得放入本欄，只能放在 src/app 模組內部變數。
   */
  pwa: PwaRuntimeState;
  /**
   * （v0.12，R-21、AC-39-08）主控台的介面狀態（「資料備份」收合區塊）。只存在記憶體，不寫入 localStorage、備份檔或任何儲存；
   * 重新載入即回到初始值。見 §13 DashboardRuntimeState 與 README §11.4 DB-6。
   */
  dashboard: DashboardRuntimeState;
  /**
   * （v0.19，R-27）廣告版位狀態。只存在記憶體，不寫入 localStorage、備份檔或任何儲存；每次頁面載入重新判定（README §13.2）。
   * 腳本元素、廣告框 DOM、計時器不得放入本欄，只能放在 src/app 模組內部變數。
   */
  ad: AdRuntimeState;
  /**
   * （v0.19，R-28）進入「資料來源與授權」或應用內三頁之前的頁面，供返回用（AC-57-01，README SP-3）。
   * 只存在記憶體；初始 null。值不得為 "sources"、"about"、"contact"、"privacy" 或 HIDDEN_TAB_IDS 中的值。
   */
  sitePageReturnTab: TabId | null;
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
    /** src/data/templates.js，領域範本，恰好 3 筆。（v0.14）畫面入口隱藏，但照常載入、打包，不得刪除此全域變數（README HT-8）。 */
    DOMAIN_TEMPLATES?: DomainTemplate[];
    /** src/data/part5.js，模擬測驗題庫（題型參考 TOEIC®（多益）；v0.21 R-31），至少 200 題（每題型至少 50）。 */
    PART5_QUESTION_BANK?: Part5Question[];
    /** src/data/decoder.js，長難句，至少 50 句。 */
    DECODER_SENTENCES?: DecoderSentence[];
    /** src/data/decoder.js，閱讀策略，恰好 3 筆。 */
    READING_STRATEGIES?: ReadingStrategy[];
    /** src/data/phrasebank.js，學術句型，至少 100 則（每類至少 25）。 */
    ACADEMIC_PHRASEBANK?: PhraseTemplate[];
  }
}
// （v0.11）PWA 不新增任何 window 全域變數；pg-content 無 PWA 工作，src/data/ 格式不變。
// （v0.14）版本號不使用 window 全域變數，也不放在 src/data/；由建置寫入 HTML <meta name="emt-app-version">（§14）。

// ════════════════════════════════════════════════════════════════════
// §12 PWA（v0.11，PRD R-20、US-34～US-37、AC-24-12、Q-41～Q-48）
//     提供者：契約常數 → pg-frontend（建置程式產生 manifest、service worker、部署目錄；頁面端註冊與 UI）
//             圖示 PNG → 主控（Q-45 決議 A，預先產生，建置只複製）
//     使用者：瀏覽器、QA（V-PWA）
//     本節全部「不持久化」：不寫入 localStorage、備份檔、IndexedDB；Cache Storage 只放 PWA_PRECACHE_URLS 的回應。
//     規則：README §10（DP 部署目錄、MF manifest、HD HTML head、PE 啟用條件、SW service worker、UP 更新、IN 安裝按鈕、PV 隱私）。
// ════════════════════════════════════════════════════════════════════

/**
 * PWA 安裝名稱（manifest name／short_name、iOS apple-mobile-web-app-title 共用）。
 * （v0.12，Q-49）App 內顯示名稱也統一為「EnglishContext」：本常數值必須等於 §13 APP_DISPLAY_NAME（兩者為同一名稱，
 *   保留本常數名稱是為了不影響 v0.11 既有程式）。HTML <title>、標題列、授權註解作品名稱見 README §11.1 NM-1～NM-4。
 * 對應：AC-34-01、AC-34-02、AC-34-05、AC-34-09、AC-23-02、AC-23-06（品牌標識聲明中的名稱）、AC-38-05、AC-38-10。
 */
export const PWA_APP_NAME = "EnglishContext";

/**
 * manifest theme_color 與 HTML <meta name="theme-color"> 的值（兩者必須逐字相同，AC-34-04）。
 * 格式 #RRGGBB（小寫 hex）。（v0.12，Q-54 決議 A）= 品牌主色 COLOR_TOKENS.brand #1e9bf0（原 #2f6fd6，README FB-41 已解除）。
 * 對應：AC-34-01、AC-34-04、AC-38-02。
 */
export const PWA_THEME_COLOR = "#1e9bf0";

/**
 * manifest background_color。必須等於首次畫面 body 計算後的背景色（AC-34-04、AC-38-02），
 * （v0.12）= COLOR_TOKENS.background #eef4fa（rgb(238, 244, 250)；原 #f6f7f9）。
 * 若 SD 在 PRD 條件內改用其他背景值，本常數、PWA_MANIFEST.background_color 與 COLOR_TOKENS.background 須同時修訂（README DS-13、VC-5）。
 * 格式 #RRGGBB（小寫 hex）。對應：AC-34-01、AC-34-02（Android 啟動畫面背景）、AC-34-04、AC-38-02。
 */
export const PWA_BACKGROUND_COLOR = "#eef4fa";

/**
 * 圖示用途。"any" = 一般圖示（滿版不透明正方形）；"maskable" = 可套遮罩圖示。AC-34-01、AC-34-03。
 * （v0.12，AC-34-03、SD-FB-31）maskable 的判定：橘色「EC」對話框與「EnglishContext」字樣完整位於以圖示中心為圓心、
 *   直徑為邊長 80% 的安全圓內；不以縮放比例判定（主控實際產出縮放約 78%，符合）。見 README DP-4 (d)。
 */
export type PwaIconPurpose = "any" | "maskable";

/**
 * manifest icons 的一筆。對應：AC-34-01、AC-34-03。
 * 每筆只能有一個 purpose（不得寫 "any maskable" 合併值，AC-34-01「3 筆獨立項目」）。
 */
export interface PwaManifestIcon {
  /** 必填。相對於 manifest 檔的路徑（不以 "/" 或協定開頭），例 "icons/icon-192.png"。必須是 PWA_DEPLOY_FILES 中 role 為 "icon" 的 path。 */
  src: string;
  /** 必填。"<寬>x<高>"，必須與 PNG 實際像素相同，例 "192x192"。 */
  sizes: "192x192" | "512x512";
  /** 必填。固定 "image/png"。 */
  type: "image/png";
  /** 必填。單一值。 */
  purpose: PwaIconPurpose;
}

/**
 * Web App Manifest 的完整內容（建置輸出 manifest.webmanifest = JSON.stringify(PWA_MANIFEST) 的結果，見 README MF-1）。
 * 欄位集合**封閉**：只允許下列 10 個鍵，不得加入 shortcuts、share_target、protocol_handlers、file_handlers、
 * related_applications、prefer_related_applications、screenshots、scope_extensions 等（隱私與範圍，PV-4）。
 * 對應：AC-34-01、AC-34-02、AC-34-04、R-20 PM 判斷 (a)。
 */
export interface PwaManifest {
  /** 必填。= PWA_APP_NAME。 */
  name: "EnglishContext";
  /** 必填。= PWA_APP_NAME（14 字元，部分手機會截斷，屬 Q-42 已接受的取捨）。 */
  short_name: "EnglishContext";
  /** 必填。相對路徑 "./"；瀏覽器以 start_url 解析後 = 部署目錄網址（例 https://<帳號>.github.io/<專案>/）。 */
  id: "./";
  /** 必填。相對路徑 "./"，以 manifest 網址解析 = 部署目錄；不得是 "/"（網域根目錄，GitHub Pages 專案網站會 404）。 */
  start_url: "./";
  /** 必填。相對路徑 "./"，同上。 */
  scope: "./";
  /** 必填。固定 "standalone"（獨立視窗，無網址列與分頁列，AC-34-02）。 */
  display: "standalone";
  /** 必填。固定 "zh-Hant-TW"。 */
  lang: "zh-Hant-TW";
  /** 必填。= PWA_THEME_COLOR。 */
  theme_color: string;
  /** 必填。= PWA_BACKGROUND_COLOR。 */
  background_color: string;
  /** 必填。恰好 3 筆，順序固定：192 any、512 any、512 maskable。 */
  icons: readonly [PwaManifestIcon, PwaManifestIcon, PwaManifestIcon];
}

/** manifest 內容（契約常數；建置程式須輸出與此深度相等的 JSON）。 */
export const PWA_MANIFEST: PwaManifest = {
  name: "EnglishContext",
  short_name: "EnglishContext",
  id: "./",
  start_url: "./",
  scope: "./",
  display: "standalone",
  lang: "zh-Hant-TW",
  theme_color: "#1e9bf0",
  background_color: "#eef4fa",
  icons: [
    { src: "icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
};

/**
 * 部署目錄中檔案的角色。
 * "page" = index.html；"manifest" = manifest.webmanifest；"serviceWorker" = sw.js；
 * "icon" = manifest 參照的圖示；"appleTouchIcon" = iOS 主畫面圖示（不在 manifest 內）；"adsTxt" = ads.txt。
 * （v0.19，R-28）"robots" = robots.txt；"sitemap" = sitemap.xml；"staticPage" = about.html、contact.html、privacy.html（§17）。
 */
export type PwaDeployFileRole = "page" | "manifest" | "serviceWorker" | "icon" | "appleTouchIcon" | "adsTxt" | "robots" | "sitemap" | "staticPage";

/**
 * 部署目錄中的一個檔案。對應：AC-36-07、AC-34-01、AC-34-05、AC-35-01、Q-45、Q-46。
 * 部署目錄本身的名稱與位置（如 dist/site/）由 SD 決定；path 為相對於部署目錄根的路徑，部署後即相對於網址 …/<專案>/。
 */
export interface PwaDeployFile {
  /** 必填。相對路徑，只用小寫英數、"-"、"."、"/"；區分大小寫（GitHub Pages 執行環境區分大小寫）。例 "icons/icon-192.png"。 */
  path: string;
  /** 必填。角色。 */
  role: PwaDeployFileRole;
  /** 必填。部署伺服器應回應的 MIME（QA 檢查用；GitHub Pages 依副檔名決定）。 */
  mime: "text/html" | "application/manifest+json" | "text/javascript" | "image/png" | "text/plain" | "application/xml";
  /** 必填。是否在預先快取清單（PWA_PRECACHE_URLS）中。sw.js、ads.txt，（v0.19）robots.txt、sitemap.xml、靜態頁為 false。 */
  precached: boolean;
  /** PNG 必填，其他省略。正方形邊長（像素），實際像素必須相同。 */
  sizePx?: 180 | 192 | 512;
  /** role = "icon" 必填，其他省略。 */
  purpose?: PwaIconPurpose;
  /** 必填。產生方式：build = 建置程式產生；copy = 建置原樣複製（逐位元組相同）。 */
  producedBy: "build" | "copy";
}

/**
 * 部署目錄檔案清單（契約常數，v0.19 起恰好 13 個檔案，不多不少；AC-36-07）。
 * 圖示 PNG 共通規格（README DP-4）：PNG、正方形、不含透明度通道（色彩類型 RGB），四角無灰色或透明殘留（Q-41 決議 A）。
 */
export const PWA_DEPLOY_FILES: readonly PwaDeployFile[] = [
  { path: "index.html", role: "page", mime: "text/html", precached: true, producedBy: "build" },
  { path: "manifest.webmanifest", role: "manifest", mime: "application/manifest+json", precached: true, producedBy: "build" },
  { path: "sw.js", role: "serviceWorker", mime: "text/javascript", precached: false, producedBy: "build" },
  { path: "icons/icon-192.png", role: "icon", mime: "image/png", precached: true, sizePx: 192, purpose: "any", producedBy: "copy" },
  { path: "icons/icon-512.png", role: "icon", mime: "image/png", precached: true, sizePx: 512, purpose: "any", producedBy: "copy" },
  { path: "icons/icon-maskable-512.png", role: "icon", mime: "image/png", precached: true, sizePx: 512, purpose: "maskable", producedBy: "copy" },
  { path: "icons/apple-touch-icon-180.png", role: "appleTouchIcon", mime: "image/png", precached: true, sizePx: 180, producedBy: "copy" },
  { path: "ads.txt", role: "adsTxt", mime: "text/plain", precached: false, producedBy: "copy" },
  // （v0.19，R-28）以下 5 檔不進預先快取（README DP-9）。
  { path: "robots.txt", role: "robots", mime: "text/plain", precached: false, producedBy: "build" },
  { path: "sitemap.xml", role: "sitemap", mime: "application/xml", precached: false, producedBy: "build" },
  { path: "about.html", role: "staticPage", mime: "text/html", precached: false, producedBy: "build" },
  { path: "contact.html", role: "staticPage", mime: "text/html", precached: false, producedBy: "build" },
  { path: "privacy.html", role: "staticPage", mime: "text/html", precached: false, producedBy: "build" },
];

/**
 * 預先快取清單（PRD V-PWA 名詞「預先快取清單」；契約常數，恰好 7 項，順序不拘）。
 * 每項為相對於 sw.js 的網址；"./" 與 "./index.html" 是同一份 HTML 的兩個快取鍵（兩者內容逐位元組相同）。
 * 不含 sw.js（PRD 定義）、ads.txt，（v0.19）robots.txt、sitemap.xml、靜態頁。service worker 只攔截、只回應這 7 個網址的同源 GET（SW-6）。
 * 對應：AC-35-01、AC-35-02、AC-37-05、AC-21-03。
 */
export const PWA_PRECACHE_URLS: readonly string[] = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon-180.png",
];

/**
 * 本專案快取名稱前綴（PRD 名詞「本專案快取」）。快取名稱 = PWA_CACHE_PREFIX + BUILD_ID，
 * 例 "english-master-track-pwa-3fa9c01d77e2b6a4"。清除舊快取時只刪除以此前綴開頭、且不等於目前名稱者（SW-9，AC-36-05）。
 * 同一 <帳號>.github.io 網域下其他專案共用來源，因此前綴必須含專案識別（R-20 PM 判斷 (b)）。
 * （v0.12，Q-49）**不隨 App 改名變動**：SW-9 只刪除以本前綴開頭的舊快取，若改成其他前綴（如 "englishcontext-pwa-"），
 *   v0.11 已安裝使用者的舊快取將永遠不會被清除。見 §13 FROZEN_IDENTIFIERS。
 */
export const PWA_CACHE_PREFIX = "english-master-track-pwa-";

/**
 * 建置識別碼 BUILD_ID 的格式：16 個小寫十六進位字元。
 * 由建置程式依檔案內容自動計算（README SW-2：SHA-256 摘要取前 16 字元），不得手動填寫、不得含時間戳或隨機值（AC-36-01）。
 * 同一個 BUILD_ID 同時出現在：HTML <meta name="emt-build-id">、sw.js 的快取名稱（AC-36-02）。
 */
export const PWA_BUILD_ID_PATTERN = "^[0-9a-f]{16}$";

/**
 * HTML 中記錄建置識別碼的 <meta> name。寫法：<meta name="emt-build-id" content="<BUILD_ID>">（完整 16 字元畫面不顯示）。
 * file:// 版與 https 版是同一份 HTML，兩者都有此 meta（不產生請求）。對應：AC-36-02、AC-36-03（V-PWA 版本識別）。
 * （v0.14，AC-36-02、AC-42-01）畫面只在頁尾版本行顯示前 BUILD_CODE_LENGTH（7）個字元作為「建置碼」（§14、README §12.1）。
 */
export const PWA_BUILD_ID_META_NAME = "emt-build-id";

/**
 * 頁面回到前景時，距上次更新檢查達此毫秒數即呼叫 registration.update()（1 小時，AC-36-03 情境 (2)）。
 * 只用於記憶體中的時間比較，不持久化。
 */
export const PWA_UPDATE_RECHECK_MS = 3_600_000;

/** PWA 相關畫面文字（契約常數，逐字使用）。 */
export const PWA_TEXTS = {
  /** 主控台「資料備份」區塊內、backupOriginNotice 之後的安裝按鈕文字（AC-34-07，Q-44）；（v0.12）區塊收合時隨區塊隱藏（AC-39-08）。 */
  installButton: "安裝 App",
  /**
   * 新版提示文字（AC-36-03，Q-43 決議 A）。
   * （v0.16，R-24 一）由「有新版本，重新整理」改為本值；只改文字，顯示條件與更新行為不變（README UP-6）。逗號為全形「，」。
   */
  updateNotice: "有新版本，請更新版本",
  /**
   * 新版提示中的按鈕文字（AC-36-03）。
   * （v0.16，R-24 一）由「重新整理」改為本值；按下後的行為不變（README UP-4、UP-5）。
   */
  updateButton: "更新版本",
  /**
   * 「匯出備份」按鈕旁的固定說明（AC-24-12，Q-47 決議 B）；file:// 與 https 兩種開啟方式文字相同。
   * （v0.12）「資料備份」收合時與「匯出備份」按鈕一併隱藏；只要「匯出備份」可見，本文字就可見（AC-24-12、AC-39-08）。
   */
  backupOriginNotice: "學習紀錄只存在目前的瀏覽器與網址；檔案版、網頁版、主畫面 App 彼此不互通，可用匯出備份／匯入轉移",
} as const;

/**
 * 頁面 → service worker 的 postMessage 訊息（唯一一種）。對應：AC-36-03、AC-37-05。
 * - 頁面只在使用者按下「更新版本」（PWA_TEXTS.updateButton；v0.15 以前為「重新整理」）時，對 registration.waiting 送出 { type: "SKIP_WAITING" }（UP-4）。
 * - service worker 只接受 event.data 為物件、且 type 恰為 "SKIP_WAITING"、且不含其他鍵的訊息，收到後呼叫 self.skipWaiting()；
 *   其他任何訊息一律忽略（不回覆、不報錯）。
 * - service worker → 頁面：**不送任何訊息**；頁面以 navigator.serviceWorker 的 "controllerchange" 事件得知已換版（UP-5）。
 * - 訊息不得攜帶任何學習資料或 localStorage 內容（PV-2）。
 */
export type PwaPageToSwMessage = { type: "SKIP_WAITING" };

/**
 * PWA 頁面端狀態（RuntimeState.pwa；只存在記憶體，不持久化，重新載入即回到初始值）。
 * 理由：安裝按鈕是否顯示由瀏覽器每次重新觸發 beforeinstallprompt 決定（AC-34-09 (b)、AC-34-10），
 *       新版提示由 service worker 狀態推導（AC-36-03），兩者都不需要、也不得寫入 localStorage（R-20 (4)、AC-37-06）。
 * 對應：AC-34-06～AC-34-10、AC-36-03、AC-36-06、AC-37-01、AC-37-03、AC-37-04。
 */
export interface PwaRuntimeState {
  /**
   * 是否啟用 PWA 功能（README PE-1）。啟動時判定一次，本工作階段不再變更。
   * false 時：不註冊 service worker、不加入 manifest 與 apple-touch-icon 連結、不監聽 beforeinstallprompt、
   * 其餘欄位恆為初始值（安裝按鈕與新版提示永不顯示，AC-34-08 (a)、AC-37-01～AC-37-04）。
   */
  eligible: boolean;
  /**
   * 是否以已安裝的獨立視窗執行（README IN-2：display-mode standalone，或 iOS navigator.standalone === true）。
   * 啟動時判定一次。true 時安裝按鈕永不顯示（AC-34-08 (d)）。
   */
  standalone: boolean;
  /**
   * 是否持有可用的安裝事件（README IN-3）：收到 beforeinstallprompt 且已呼叫 preventDefault()、事件物件存在模組變數中時為 true。
   * 初始 false。按下「安裝 App」、收到 appinstalled 時設為 false。
   */
  installPromptAvailable: boolean;
  /**
   * 本次頁面期間是否不再顯示安裝按鈕（README IN-5、IN-6）。初始 false。
   * 按下「安裝 App」（不論接受、拒絕或出錯）或收到 appinstalled 後設為 true，之後同一頁面期間再收到 beforeinstallprompt 也忽略
   * （AC-34-09 (a)(b)）。重新載入回到 false。
   */
  installSuppressed: boolean;
  /**
   * 是否有已安裝完成、等待啟用的新版 service worker（README UP-2）：registration.waiting 存在
   * 且 navigator.serviceWorker.controller 不為 null 時為 true。初始 false。true 時顯示新版提示（AC-36-03）。
   */
  updateAvailable: boolean;
  /**
   * 使用者是否已按「更新版本」（PWA_TEXTS.updateButton，v0.16 前文字為「重新整理」；README UP-4、UP-5）。初始 false。只有為 true 時，"controllerchange" 才觸發 location.reload()，
   * 且整個頁面期間至多重新載入 1 次（首次安裝時 clients.claim() 造成的 controllerchange 不得重新載入）。
   */
  reloadRequested: boolean;
  /**
   * 上次呼叫 registration.update() 或註冊完成的時間（performance.now() 毫秒）；尚未註冊為 null。
   * 用於 PWA_UPDATE_RECHECK_MS 比較（UP-3）。不持久化。
   */
  lastUpdateCheckAt: number | null;
}

// 安裝按鈕是否顯示（推導值，不另存；README IN-1）：
//   eligible && !standalone && installPromptAvailable && !installSuppressed
//   && entryMode === "main" && currentTab === "dashboard" && dashboard.backupExpanded   ← （v0.12）新增最後一項，AC-34-07、AC-39-08
// 新版提示是否顯示（推導值；README UP-6）：eligible && updateAvailable（任何 entryMode、任何頁面）。

// ════════════════════════════════════════════════════════════════════
// §13 版面與視覺（v0.12，PRD R-21、US-38～US-41、Q-49～Q-57）
//     提供者：契約常數 → pg-frontend（src/app/ 的 HTML、CSS、畫面文字）；pg-content 只需改 sources.js ORIGINAL 的 fullName。
//     使用者：pg-frontend、QA（V-LAYOUT，README §11.7）
//     本節全部「不持久化」：不新增 localStorage 鍵或欄位，schemaVersion 維持 2；不新增 window 全域變數。
//     規則：README §11（NM 名稱、VC 色彩、DB 主控台、FT 首次畫面、MT 模擬測驗進度、V-LAY 驗證）。
//     版面尺寸（720px 內容寬、640px 斷點、圓角 16px、字級、陰影、動畫）屬設計層，由 SD 依 PRD AC 定為架構常數（README §5.6）。
// ════════════════════════════════════════════════════════════════════

/**
 * App 顯示名稱（Q-49 決議）。（v0.19，Q-90 決議 B）HTML <title> 改為 SITE_HOME_SEO.documentTitle，以本值開頭。用於：頁面頂端標題列名稱（AC-38-05）、「資料來源與授權」頁原創內容來源名稱
 * （"EnglishContext 原創內容"，由 sources.js 提供，§2 DataSourceEntry.fullName）、HTML 開頭授權註解第一行的作品名稱、
 * PWA 安裝名稱（= PWA_APP_NAME）。畫面文字（含對話框與 Toast）不得出現「English Master Track」（不分大小寫，AC-38-10 (1)）。
 * 對應：AC-38-05、AC-38-10、AC-34-01、AC-34-02、Q-49。
 */
export const APP_DISPLAY_NAME = "EnglishContext";

/**
 * 不隨 App 改名變動的識別字（Q-49：「備份格式與 localStorage 鍵名不得更動」；AC-38-10 (2)、E-94）。
 * 下列值與 v0.11 逐字相同，pg-frontend 不得改為含 "EnglishContext"／"englishcontext" 的新值，也不得另加別名：
 * - 改鍵名或備份格式 → 既有學習紀錄讀不到、v0.11 備份無法匯入（AC-38-10 (2)、AC-24-03）。
 * - 改快取前綴 → SW-9 無法辨識 v0.11 的舊快取，舊快取永遠清不掉（AC-36-05）。
 * - 改交付檔名 → 使用者既有的檔案捷徑失效，部署流程（DP-2）需另改。
 * 這些字串不屬「畫面文字」，出現在 localStorage、下載檔名、Cache Storage、檔案系統不違反 AC-38-10 (1)；
 * 但 App 自己的畫面不得把它們當作名稱顯示（下載檔名由瀏覽器下載介面顯示，不算 App 畫面）。
 */
export const FROZEN_IDENTIFIERS = {
  /** = STORAGE_KEYS.state。 */
  storageStateKey: "englishMasterTrack:state",
  /** = STORAGE_KEYS.unreadable。 */
  storageUnreadableKey: "englishMasterTrack:unreadable",
  /**
   * = BACKUP_FORMAT_ID（備份檔 format 欄位）。v0.12 改名時備份 schemaVersion 與欄位亦不變（storage-schema.json $defs/BackupFile）。
   * （v0.15）本值與 storageStateKey 仍不變；schemaVersion 依 Q-63 升為 3、data 新增 3 個選填欄位，屬人類核准的結構變更，
   *   不是改名（頂層 5 欄、format 字串、匯出檔名前綴皆不變）。
   */
  backupFormatId: "english-master-track-backup",
  /** 匯出檔名前綴；完整檔名 = 本值 + "YYYYMMDD" + ".json"（AC-24-01）。 */
  backupFileNamePrefix: "english-master-track-backup-",
  /** 交付檔（file:// 版）路徑；https 版部署目錄中的 index.html 與其逐位元組相同（README DP-2）。 */
  deliveryHtmlPath: "dist/english-master-track.html",
  /** = PWA_CACHE_PREFIX（本專案快取名稱前綴）。 */
  pwaCachePrefix: "english-master-track-pwa-",
  /** = PWA_BUILD_ID_META_NAME（建置識別碼 meta name，畫面不顯示）。 */
  buildIdMetaName: "emt-build-id",
} as const;

/**
 * 色彩 token（PRD R-21「色彩 token」表；契約常數）。格式 #rrggbb 小寫。
 * - 「固定」值（brand、accent、themeColor、surface）不得更動。
 * - 「建議」值（brandDeep、accentText、background）為 PRD 建議值；SD 可在 PRD 條件內改用其他值並記入 architecture.md，
 *   但 background 與 PWA_BACKGROUND_COLOR、PWA_MANIFEST.background_color 綁定，改動時三者須同時修訂（契約小修，README VC-5）。
 * - text／textMuted 沿用 v0.11。
 * 用途限制（README §11.2 VC-1～VC-8）：brand 與 accent 不得作為任何文字的 color，也不得作為白字元素的背景（AC-38-01、AC-38-04）。
 * 對應：AC-38-01、AC-38-02、AC-38-04、AC-38-06、AC-34-04、Q-53、Q-54。
 */
export const COLOR_TOKENS = {
  /** 品牌主色（固定，取自圖示）。只用於非文字品牌元素：主環形圖未達成時的進度色、模擬測驗進度條填色、選中導覽項的指示、標題列圖示。白字對比約 3.0:1。 */
  brand: "#1e9bf0",
  /** 深品牌色（建議值；條件：與 brand 色相差 ≤ 10°、白字對比 ≥ 4.5:1；建議值約 6.0:1）。白字主要按鈕底色（「套用」「匯出備份」等）、品牌色文字與連結。 */
  brandDeep: "#0866ad",
  /** 強調橘（固定，取自圖示）。只用於「開始今日學習」「開始學習」按鈕底色與連續打卡格的強調圖示（AC-38-01）；標題列品牌圖示（AC-38-05）的橘色「EC」對話框除外，不受此限（v0.13，與 App 圖示一致）。 */
  accent: "#f7893b",
  /** 強調橘按鈕上的文字（建議值，Q-53 決議 A：深色字；條件：對 accent ≥ 4.5:1，建議值約 6.0:1；不得為白字）。 */
  accentText: "#1f2937",
  /** manifest theme_color 與 <meta name="theme-color">（固定，Q-54 決議 A）= brand。 */
  themeColor: "#1e9bf0",
  /** body 背景（建議值，淡藍灰；條件：HSL 色相 190°～220°、飽和度 ≥ 15%、亮度 94%～98%；建議值約 210°、55%、96%）。= PWA_BACKGROUND_COLOR。 */
  background: "#eef4fa",
  /** 區塊卡片底色（固定）。 */
  surface: "#ffffff",
  /** 內文（沿用 v0.11）。對 background 與 surface 皆 ≥ 4.5:1。 */
  text: "#1f2937",
  /** 次要文字、說明（沿用 v0.11）。對 background 與 surface 皆 ≥ 4.5:1（對 #eef4fa 約 5.4:1）。 */
  textMuted: "#5b6472",
} as const;

/**
 * 語意色（契約常數；AC-38-03：與 v0.11 交付版**完全相同**，本版不得更動）。格式 #rrggbb 小寫。
 * 語意與出現位置不變（AC-08-06、AC-09-03、AC-11-01、AC-30-05）；藍色級的 level.blue 不得被 COLOR_TOKENS.brand 取代。
 * 依 Q-55 決議 A，這些色值的文字不在 AC-38-04 對比量測範圍內。
 */
export const SEMANTIC_COLORS = {
  /** 色級色（色級列色條、選中列框線與淡色底、目標行色級標示）。鍵同 ColorLevel。 */
  level: {
    orange: "#e8833a",
    brown: "#8b5a2b",
    green: "#2e9e5b",
    blue: "#2f6fd6",
    gold: "#c9a227",
  },
  /** 四選一與模擬測驗：答對。 */
  correct: "#15803d",
  /** 四選一與模擬測驗：答錯。 */
  wrong: "#b91c1c",
  /** STT 燈號。鍵同 SttLight。 */
  sttLight: {
    green: "#16a34a",
    yellow: "#ca8a04",
    red: "#dc2626",
  },
  /** 今日目標達成時主環形圖的金色（AC-30-05）。 */
  goalReached: "#c9a227",
} as const;

/**
 * 版面文字（契約常數，逐字使用；v0.12 新增或改寫的主控台與首次畫面文字）。
 * 含 {名稱} 的值為格式字串：pg-frontend 以實際值取代 {…}（含大括號），其餘字元逐字保留。佔位符：
 *   {color}／{target}／{effective} = COLOR_LEVELS[].nameZh（"橘"…"金"）；{daily} = 每日新字量整數；{weeks} = 預計週數整數；
 *   {x}、{d} = 今日已學數 X、每日新字量 D（US-30）；{n} = 單字掌握數。數字一律阿拉伯數字，不加千分位以外的符號（千分位與否由 SD 定，全畫面一致）。
 * 分隔符號：「・」為 U+30FB；試算摘要行「字」與「預計」之間為全形空白 U+3000（PRD AC-41-02 原文）。
 * 對應：AC-39-01～AC-39-08、AC-41-01、AC-41-02、AC-17-01、AC-30-10、AC-24-10、AC-32-02、AC-01-01、AC-26-01；
 *   （v0.14）AC-01-08（levelStatus）、AC-39-04（goalLineSame 一律使用、goalLineCapped／goalLineSeparator 停用、changeLink 改按鈕）。
 * （v0.14）自訂清單空狀態、單字卡空狀態的文字 PRD 未給原文，**不列為契約常數**，由 SD 定案（README HT-7、DS-27）。
 */
export const LAYOUT_TEXTS = {
  // ── 主控台（US-39）──
  /** 主控台頁面標題（AC-39-01：今日任務卡之前只允許此標題）。 */
  dashboardTitle: "學習主控台",
  /** 今日任務卡主環形圖文字（沿用 v0.8 US-30 格式；AC-39-02）。 */
  todayRing: "今日已學 {x} / {d} 字",
  /** 今日任務卡主按鈕（AC-39-02、AC-39-03）。強調橘底配 accentText 深色字。裝飾用箭頭等圖示若有，須 aria-hidden，不算入本文字。 */
  startToday: "開始今日學習",
  /**
   * 目標行文字部分（不含按鈕）。（v0.14，R-22 三、Q-60）**套用任何色級一律使用本格式**，{color} = goal.effectiveColor 的 nameZh、
   * {daily} = effectiveColor 的 dailyNewWords（R-14）。結尾不帶「・」；文字之後接行末的 changeLink 按鈕（README DB-4 v0.14）。
   * 結果：橘「橘級・每日 10 字」、棕「棕級・每日 10 字」、綠／藍／金「綠級・每日 15 字」。對應：AC-39-04、AC-17-06、AC-25-02、AC-25-03、E-92。
   */
  goalLineSame: "{color}級・每日 {daily} 字",
  /**
   * @deprecated （v0.14 停用，AC-39-04、Q-60）原為藍、金時的目標行（v0.12）。本版**不得渲染**：主控台目標行與難易度設定頁
   * 都不得出現「目標」「生效」「內建上限」字樣（AC-39-04、AC-01-08）。保留鍵只為相容既有程式引用；SD 可安排移除引用，
   * 下次契約修訂時刪除本鍵。
   */
  goalLineCapped: "目標{target}級・生效{effective}級（內建上限）・每日 {daily} 字",
  /**
   * @deprecated （v0.14 停用，AC-39-04「結尾不帶『・』」）原為目標行文字與「變更」之間的分隔。本版目標行文字與「變更」按鈕之間
   * **不得**插入此字元（文字與按鈕的間距屬設計層）。保留鍵只為相容既有程式引用，下次契約修訂時刪除。
   */
  goalLineSeparator: "・",
  /**
   * 目標行行末的「變更」（→ 一般難易度設定頁 currentTab = "customizer"，AC-39-04、AC-25-06）。
   * （v0.14，R-22 四、Q-61）**改為按鈕樣式**：元素為 <button>（或 role="button" 且可聚焦）；次要或外框按鈕（計算後背景不透明，
   * 或四邊邊框 ≥ 1 CSS px 且非 none）；無底線；文字、底色、邊框皆不得為 COLOR_TOKENS.accent（#f7893b）或 #d5d9e0；
   * 文字對比 ≥ 4.5:1；觸控目標 ≥ 44×44 CSS px；Tab 可聚焦且有可見焦點框。行為與 v0.13 連結相同（只改樣式）。
   * 鍵名沿用 changeLink（識別字不改），值不變。
   */
  changeLink: "變更",
  /** 3 格數據標籤（AC-39-05、AC-39-06）。順序固定：streak → mastery → part5（v0.19）。 */
  statStreakLabel: "連續打卡天數",
  /** 連續打卡天數的單位（AC-39-05）。 */
  statStreakUnit: "天",
  statMasteryLabel: "單字掌握率",
  /** 單字掌握率格的小字（Q-52 決議 A；{n} = masteredWordKeys.length，AC-17-03）。 */
  statMasteredCount: "已掌握 {n} 字",
  /**
   * （v0.19，R-27，AC-49-01）第 3 格標籤；內容為 ANSWERED_SUMMARY_TEXT（§17）。取代 v0.18 的 statAccuracyLabel（已移除，畫面不得再出現「正確率」，AC-49-07）。
   */
  statPart5Label: "模擬測驗",
  /** 無資料時的數值（單字集為空；v0.19 模擬測驗為 Q = 0，K = 0 不用本值；AC-30-10、AC-49-02、E-48）。U+2014。 */
  statNoData: "—",
  /** 近 7 天圖表空狀態（7 根全為 0 時唯一顯示的文字；AC-39-07 (b)、E-88）。 */
  chartEmpty: "開始學習後會顯示紀錄",
  /** 收合區塊標題（AC-39-08）。展開指示（如 ▾／▴、「展開」）屬設計層，不得取代本文字。 */
  backupSectionTitle: "資料備份",

  // ── 首次畫面（US-41、US-26）──
  /** 首次畫面標題（AC-41-01）。 */
  firstRunTitle: "選擇你的目標",
  /** 首次畫面副標（AC-41-01；SA 定案用「」，見 README FB-44）。 */
  firstRunSubtitle: "之後可以在「難易度設定」隨時變更",
  /** 色級列表上方說明行的開頭字樣（AC-01-01、AC-26-01：只出現 1 次）。該行其餘說明文字由 SD 定，不得含「官方門檻」「Tier」。 */
  vocabNoteLead: "本系統建議字量",
  /** 藍、金列的說明（AC-01-01、AC-26-01、Q-57）。前置 🔒 圖示屬設計層（須有替代文字或 aria-hidden 搭配本文字）。 */
  levelLocked: "即將開放",
  /** 試算摘要行（AC-41-02）。{color} 為選中列（Color(goal.draftScore)）；例「綠級・每日 15 字　預計 54 週」。 */
  summaryLine: "{color}級・每日 {daily} 字　預計 {weeks} 週",
  /** 選中藍、金時接在 summaryLine 之後（AC-41-02）；例「藍級・每日 20 字　預計 41 週（以綠試算）」。 */
  summaryLockedSuffix: "（以綠試算）",
  /** 選中藍、金時摘要行上方多出的一行（同 AC-01-07、AC-02-10 既有提示文字）。 */
  lockedNotice: "目前內建字庫到綠色為止",
  /** 固定底部列主要按鈕（沿用 v0.8，AC-25-02）。 */
  startLearning: "開始學習",
  /** 固定底部列連結（沿用 v0.8，AC-25-10）。 */
  restoreFromBackup: "從備份還原",

  // ── 難易度設定頁（v0.14，US-01）──
  /**
   * （v0.14，R-22 三、Q-60）一般難易度設定頁狀態列：**恰為一行**，{color} = **已套用**的 goal.effectiveColor 的 nameZh
   * （不看 draftScore；未按「套用」不改變）。冒號為全形「：」（U+FF1A），冒號後無空白。
   * 結果：套用橘「目前色級：橘」、棕「目前色級：棕」、綠／藍／金「目前色級：綠」；不附加「藍」「金」「內建上限」或任何註記。
   * 難易度設定頁任何位置都不得出現「目前目標色級」「目前生效色級」字樣，也不得有第二行色級資訊（AC-01-08）。
   * v0.12 以前的「目前目標色級」「目前生效色級」兩行標籤**不是**契約常數（契約未曾定義），v0.14 一併廢止。
   * 首次畫面沒有狀態列（FS-3、FT-1），不使用本文字。
   * 對應：AC-01-08、AC-01-02、AC-01-07、AC-25-03、AC-25-06、AC-26-06、AC-32-05、E-92。
   */
  levelStatus: "目前色級：{color}",
} as const;

/**
 * 主控台介面狀態（RuntimeState.dashboard；v0.12，AC-39-08、E-90、E-91）。
 * 只存在記憶體：不寫入 localStorage、備份檔或任何儲存（AC-39-08「(1)～(4) 前後本系統 localStorage 內容完全相同」）；
 * 重新載入、關閉分頁後回到初始值。規則見 README §11.4 DB-6。
 */
export interface DashboardRuntimeState {
  /**
   * 「資料備份」區塊是否展開。初始 false（每次頁面載入、含首次畫面進入主控台後皆為 false）。
   * - 只有使用者點擊（或 Enter／空白鍵）區塊標題列時切換；控制項 aria-expanded 與本值一致。
   * - 切換 currentTab 不改變本值（本次頁面期間維持，AC-39-08 (3)）。
   * - 匯入流程（選檔、確認對話框、結果提示）期間與完成後都不得自動改為 false（E-91）。
   * - false 時不渲染：備份說明、「匯出備份」「匯入備份」、PWA_TEXTS.backupOriginNotice、「安裝 App」（AC-24-12、AC-34-07）。
   */
  backupExpanded: boolean;
}

// ════════════════════════════════════════════════════════════════════
// §14 網站版本號（v0.14，PRD R-22 一、US-42、Q-58、Q-62）
//     提供者：建置（tools/，依 SD 安排）寫入 HTML；pg-frontend 讀取並渲染頁尾版本行。pg-content 無工作。
//     使用者：pg-frontend、QA（README §12.1 VR-1～VR-9、§12.4 V-VER-01～V-VER-06）
//     本節全部「不持久化」：版本號與建置碼不寫入 localStorage、備份檔或任何儲存（AC-42-03）；不新增 window 全域變數；
//     顯示版本行不產生任何網路請求（不讀取 package.json、不呼叫任何 API）。schemaVersion 維持 2。
// ════════════════════════════════════════════════════════════════════

/**
 * HTML 中記錄網站版本號的 <meta> name（比照 PWA_BUILD_ID_META_NAME）。
 * 寫法：<meta name="emt-app-version" content="X.Y.Z">，屬 HD-1 靜態元素（file:// 與 https 都有，不產生請求）。
 * - 來源：建置時專案根目錄 package.json 的 "version" 欄位（人類發布時手動維護；v0.14 發布 1.0.0，Q-58、Q-62；
 *   v0.15 發布 1.1.0，Q-70 A：授權主控本次實作時一次性修改 package.json，之後仍由人類維護；
 *   v0.18 發布 1.2.0，Q-79 A：同樣授權主控本次一次性修改，版本行為「版本 1.2.0（建置 xxxxxxx）」，AC-42-02；
 *   v0.19 第一階段發布 1.3.0，Q-85 A：同樣授權主控本次一次性修改，版本行為「版本 1.3.0（建置 xxxxxxx）」；
 *   v0.20 發布 1.3.1，Q-102 A：同樣授權主控本次一次性修改，版本行為「版本 1.3.1（建置 xxxxxxx）」；第二階段版本號屆時由人類決定；
 *   v0.21 發布 1.3.2，Q-105 A：同樣授權主控本次一次性修改，版本行為「版本 1.3.2（建置 xxxxxxx）」）。
 *   契約不寫死版本值。
 * - 原始模板中 content 為**固定佔位字串**（比照 emt-build-id 的佔位規則：以 "@@" 前後包夾、模板中恰出現 1 次且位於本 meta 內；
 *   佔位字串的實際值由 SD 定，建議 "@@APP_VERSION@@"）。建置以 package.json 的 version 取代後，產物不得殘留佔位字串。
 * - **寫入順序**：先寫入版本號，再以「已含版本號、emt-build-id 仍為佔位」的 HTML 計算 BUILD_ID（README SW-2 v0.14），
 *   因此只改 package.json 的 version 也會改變 BUILD_ID 與 service worker 快取版本（AC-42-04 (b)）。
 * - 本識別字為 v0.14 新增，**不屬** FROZEN_IDENTIFIERS（該常數維持與 v0.11 相同）；但日後同樣不得改名（README VR-2）。
 * 對應：AC-42-01、AC-42-02、AC-42-04、AC-36-02。
 */
export const APP_VERSION_META_NAME = "emt-app-version";

/**
 * 版本號 X.Y.Z 的格式（JavaScript RegExp 原始碼字串）：SemVer 2.0.0 的「主.次.修訂」三段，每段為非負整數、不得有前導 0
 * （"0" 本身可），不含 "v" 前綴、預發布標記（-beta）或建置中繼資料（+xxx）。例：合法 "1.0.0"、"1.0.1"、"0.10.3"；
 * 不合法 "v1.0.0"、"1.0"、"1.0.0-beta"、"01.0.0"、""。
 * 建置時 package.json 的 version 不符 → 建置中止（不得產出含錯誤版本號的交付檔，README VR-3）。
 * 對應：AC-42-02、Q-58。
 */
export const APP_VERSION_PATTERN = "^(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)$";

/**
 * 頁尾版本行中「建置碼」的長度：取 <meta name="emt-build-id"> content（16 個小寫十六進位字元，PWA_BUILD_ID_PATTERN）的前 7 個字元。
 * 例：BUILD_ID "3f9a2c1d77e2b6a4" → 建置碼 "3f9a2c1"。同時等於 sw.js 快取版本識別的前 7 字元（AC-42-02）。
 * 對應：AC-42-01、AC-42-02、AC-36-02。
 */
export const BUILD_CODE_LENGTH = 7;

/**
 * 頁尾版本行（契約常數，格式字串，逐字使用）。{version} = emt-app-version 的 content（X.Y.Z）；
 * {build} = emt-build-id 的 content 前 BUILD_CODE_LENGTH 字元。括號為全形「（」U+FF08、「）」U+FF09；
 * 「版本」與 {version}、「建置」與 {build} 之間各 1 個半形空白 U+0020；{version} 與「（」之間無空白。
 * 例：「版本 1.0.0（建置 3f9a2c1）」。
 * 位置：每個畫面（首次畫面、4 個功能區、「資料來源與授權」頁）頁尾「資料來源與授權」連結**正下方**恰 1 行；
 * 純文字（非連結、不可點擊、不可取得焦點）；以 textContent 寫入（C-7）。其餘規則見 README §12.1 VR-4～VR-7。
 * 對應：AC-42-01、AC-42-02、AC-42-03、AC-41-04。
 */
export const VERSION_LINE_TEXT = "版本 {version}（建置 {build}）";

// ════════════════════════════════════════════════════════════════════
// §15 模擬測驗答對紀錄與「只練沒答對」（v0.15，PRD R-23 二、US-45、US-46、Q-64～Q-67、Q-69、Q-71；
//     v0.18，PRD R-26、US-48、Q-77～Q-80）
//     提供者：pg-frontend（src/app/）。pg-content 只需維持 Part5Question.id 不改號（README V-P5-08）。
//     使用者：pg-frontend、QA（README §5.11 LV-1～LV-7、SM-1～SM-3、HN-1、CR-1～CR-10、UO-1～UO-10、V-ST-19～V-ST-21、V-ST-23～V-ST-27）
//     持久化欄位見 §8 PersistedData.part5CorrectIds、part5UnansweredOnly；本節型別與常數本身不持久化。
// ════════════════════════════════════════════════════════════════════

/**
 * 模擬測驗頁目前顯示的畫面種類（執行期**推導值**，不持久化、不另存；README §5.11 UO-3）。
 * 由 PersistedData.part5、part5CorrectIds、part5UnansweredOnly 與題庫每次繪製時推導；題庫為空時沿用既有空題庫處理，不使用本型別。
 * - "question"：題目畫面，內容再依 Part5QuestionState 分 3 種。顯示「第 i / N 題」、進度條、「已答對 K / Q 題」、開關、filterHint；曾答對時顯示 correctBadge。
 * - "summary"：本輪結算（part5.phase = "summary"，AC-11-04）。顯示「答對 x / y」（y = 0 時改顯示 summaryNoNewAnswers，README SM-2）、
 *   「重新開始」、「已答對 K / Q 題」、開關、filterHint。
 * - "allCorrect"：全部答對（開關開啟且 K = Q，且不是「剛作答、尚未按下一題」的鎖定題目；AC-46-06、E-111）。
 *   顯示 allCorrectTitle、「已答對 K / Q 題」、開關、filterHintAllCorrect，以及 clearAndRestart 1 個按鈕（取代「重新開始」，Q-77 A）；
 *   part5.phase = "summary" 且 y ≥ 1 時另同時顯示本輪結算「答對 x / y」（README SM-3）。進度條 100%、不顯示「第 i / N 題」、不顯示任何未作答題目。
 *   開關關閉時不會出現本畫面，K = Q 也一樣（AC-48-07）。
 * K ≥ 1 時，3 種畫面都有 clearAndRestart 入口（README CR-10，AC-48-11）。
 * 對應：AC-11-04、AC-40-01、AC-45-05、AC-46-04～AC-46-06、AC-46-08、AC-48-06、AC-48-07、AC-48-10～AC-48-12。
 */
export type Part5ViewKind = "question" | "summary" | "allCorrect";

/**
 * 題目畫面（Part5ViewKind = "question"）的 3 種狀態（v0.18；執行期**推導值**，不持久化、不另存；README §5.11 LV-1）。
 * 依序判定，同一時間只有一種：
 * - "answered"（本次作答結果）：part5.lockedSelection ≠ null。回饋文字「答對了！」或「答錯了，正確答案是 …」（AC-11-01、AC-11-02）；
 *   優先於鎖定檢視，含 v1.1.0 留下的答錯結果（AC-48-08 (c)）。
 * - "lockedReview"（已答對鎖定檢視）：lockedSelection = null、part5UnansweredOnly = false、目前題目曾答對。
 *   依 AC-48-01 顯示；不可作答，「下一題」可前進但不計分（AC-48-02）。
 * - "idle"（未作答）：其他情況，含答錯過但未曾答對的題目。選項可作答（AC-11-01）。
 *   開關開啟且 lockedSelection = null 且目前題目曾答對的組合不會顯示：K < Q 時已由 UO-4 移開，K = Q 時畫面為 "allCorrect"。
 * 對應：US-48、AC-11-04、AC-11-05、AC-45-03、AC-45-04、AC-46-02、AC-46-04、AC-48-01～AC-48-05、AC-48-08、AC-48-09。
 */
export type Part5QuestionState = "answered" | "lockedReview" | "idle";

/**
 * 模擬測驗答對紀錄與開關的畫面文字（契約常數；只收 PRD 原文，逐字使用）。
 * 佔位符：{k} = K（已答對數，答對紀錄 ∩ 題庫的不重複 id 數）；{q} = Q（題庫實際題數 PART5_QUESTION_BANK.length，不寫死 200）。
 * 數字為阿拉伯數字，以 tabular-nums 呈現（AC-45-05）。所有文字以 textContent 寫入（C-7、AC-47-08）。
 * 未列入本常數的文字（「全部答對」畫面的說明句、確認對話框的完整句子與標題）PRD 未給原文，由 SD 定案（README DS-35），
 * 限制：確認對話框必須包含 clearConfirmMustInclude 的兩段文字，且只有 confirmOk、confirmCancel 兩個按鈕（AC-46-08）。
 * （v0.18）「全部答對」畫面的說明句若保留，不得出現「再練一次」（AC-46-06）；交付檔不得再含「全部題目再練一次」（README V-ST-27）。
 * 對應：AC-45-01、AC-45-04、AC-45-05、AC-46-01、AC-46-06、AC-46-08、AC-48-01、AC-48-06、AC-48-11、AC-48-12。
 */
export const PART5_RECORD_TEXTS = {
  /**
   * 「曾答對」標示（AC-45-04）：✓ 符號加文字，位於題目區內、題型標籤附近；"answered" 與 "lockedReview" 皆顯示（只要該題曾答對）。
   * 不得只靠顏色；文字對比 ≥ 4.5:1；不得使用 COLOR_TOKENS.accent。未曾答對的題目不顯示任何標示（不得顯示「未答對」「答錯過」）。
   * ✓ 若以獨立元素呈現，可設 aria-hidden，但「曾答對」文字必須可被輔助技術讀取。
   */
  correctBadge: "✓ 曾答對",
  /** 進度條附近、題目之上的一行（AC-45-05）；question、summary、allCorrect 三種畫面各恰 1 次；K = 0 顯示 0，不顯示「—」。 */
  correctCount: "已答對 {k} / {q} 題",
  /** 開關標籤（AC-46-01）；原生核取方塊或 role="switch"；預設關閉。 */
  unansweredOnlyLabel: "只練沒答對的題目",
  /** 「全部答對」畫面的明確文字（AC-46-06），例「200 題全部答對！」。驚嘆號為全形「！」U+FF01。 */
  allCorrectTitle: "{q} 題全部答對！",
  /**
   * （v0.18 改）清除入口（AC-46-08、AC-48-11，Q-77 A、Q-78 B）：K ≥ 1 時各畫面恰 1 個，K = 0 時不顯示（README CR-10）；
   * 先顯示確認對話框，確定後清除答對紀錄（README CR-6）。「全部答對」畫面只有這 1 個按鈕。
   */
  clearAndRestart: "清除答對紀錄，重新來過",
  /** （v0.18）已答對鎖定檢視的回饋文字（AC-48-01）。不得沿用「答對了！」，以免假稱本次作答（README LV-2）。 */
  lockedReviewFeedback: "你之前答對過這一題",
  /** （v0.18）y = 0 時本輪結算的文字，取代「答對 x / y」（AC-48-06、E-125，README SM-2）。 */
  summaryNoNewAnswers: "本輪沒有新作答的題目",
  /** （v0.18）題目與結算畫面，開關附近恰 1 次；開關開啟或關閉都顯示（AC-48-12，Q-80 C，README HN-1）。 */
  filterHint: "關閉時顯示全部題目，答對過的題目會以綠色鎖定。",
  /** （v0.18）「全部答對」畫面，開關下方恰 1 次，不同時顯示 filterHint（AC-48-12，README HN-1）。引號為全形「」，括住的文字同 unansweredOnlyLabel。 */
  filterHintAllCorrect: "要檢視全部題目，請關閉上方的「只練沒答對的題目」。",
  /**
   * 確認對話框文字必須**包含**的兩段（AC-46-08）；完整句子由 SD 組成（DS-35、DS-51）。
   * （v0.19，R-27）第 2 段改寫；對話框不得再出現「累計答題數與正確率不受影響」與「正確率」（AC-49-07）。
   */
  clearConfirmMustInclude: ["將清除全部題目的答對紀錄", "「已答對」會回到 0 題"],
  /** 確認對話框按鈕（AC-46-08：只有這 2 個按鈕）。 */
  confirmOk: "確定",
  confirmCancel: "取消",
} as const;

// ════════════════════════════════════════════════════════════════════
// §16 「資料來源與授權」頁聯絡資訊（v0.16，PRD R-24 二、AC-23-07、E-118、E-119）
//     提供者：契約常數（pg-frontend 實作，src/app/）。pg-content 不涉及：src/data/sources.js 格式與值不變。
//     使用者：pg-frontend、QA（README §4.3 L-7、§9.9 DS-40）
//     本節常數不持久化：不寫入 localStorage、不寫入備份檔（storage-schema.json 不變）。
// ════════════════════════════════════════════════════════════════════

/**
 * 「資料來源與授權」頁的聯絡資訊行（契約常數，**逐字**使用，不得改寫、不得增減空格）。
 * （v0.19，R-28）改為新信箱；識別字沿用不改名。同一常數也用於隱私權政策與聯絡我們（SiteBlock "contactLine"，AC-53-02、AC-55-02），
 *   全站只有這一種寫法（README ML-1～ML-5）；下方「位置」規則以 README L-7 (5) 為準。
 * 值的構成：小寫 "email:" + 1 個半形空格 U+0020，其後位址的每個字元之間各 1 個半形空格（含 "." 與 "@" 前後），
 * 全部為半形 ASCII 字元，無全形字元；字母間空格是刻意的防爬蟲設計（R-24 二）。
 *
 * 使用規則（README L-7）：
 * - 位置：只在「資料來源與授權」頁內容區顯示恰 1 行（頁尾連結與版本行之上，AC-42-01）；其他畫面、頁尾、對話框、Toast 皆不顯示。
 * - 純文字：以 textContent 寫入（C-7）；該行及祖先元素不得是 <a>；不得有 href、tabindex、點擊處理器；Tab 不可取得焦點；
 *   點擊、長按、鍵盤操作皆不開郵件程式、不換頁、不報錯（E-118），可依瀏覽器預設選取文字。
 * - 防爬蟲：交付 HTML（含內嵌 JS、CSS）不得出現 "mailto:"，也不得出現去掉空格後的完整位址；
 *   程式不得以 replace、split/join、拼接等字串處理在執行期組出無空格位址（DOM、記憶體亦不得出現）。
 * - 不發網路請求：file:// 版請求數仍為 0（AC-21-01 (a)）；https 版仍只有 AC-37-05 允許的同源預先快取 GET。
 * - 樣式：該頁說明性次要文字；對比 ≥ 4.5:1（AC-38-04）、不使用 COLOR_TOKENS.accent（AC-38-01）；
 *   375px 預設字級維持 1 行、不產生水平捲軸，放大字級時換行可接受（E-119）。樣式與確切位置屬設計層。
 * - file:// 與 https 兩種形態皆顯示且文字相同；斷網照常顯示（AC-23-07 (4)）。
 * 對應：AC-23-07、E-118、E-119、R-24 二。
 */
export const SOURCES_CONTACT_TEXT = "email: d o n c l y d e 0 7 2 2 @ g m a i l . c o m";

// ════════════════════════════════════════════════════════════════════
// §17 已答對顯示、廣告、對外頁面與 SEO（v0.19，PRD R-27、R-28、US-49～US-57、Q-81～Q-93）
//     提供者：契約常數（pg-frontend 實作於 src/app/，建置程式共用；檔案位置由 SD 定）。pg-content 不涉及，src/data/ 不變。
//     使用者：pg-frontend、建置程式、QA（README §13 AS、AD、SP、SC、SE、ML；V-ANS、V-AD、V-SITE、V-SEO、V-MAIL）
//     本節全部不持久化：不新增 localStorage 鍵或欄位，schemaVersion 維持 3；不新增 window 全域變數。
// ════════════════════════════════════════════════════════════════════

// ── 已答對顯示（US-49）──────────────────────────────────────────────

/**
 * 已答對行的數值（執行期推導，不持久化）。對應：US-49、AC-49-01～AC-49-05、README AS-1、AS-2。
 * 推導（Q = 0 時回傳 null）：
 *   k = new Set(part5CorrectIds) 與題庫 id 交集的大小；q = 題庫長度；
 *   p = Math.floor((200 * k + q) / (2 * q))，k < q 時再取 Math.min(p, 99)。不得用 k / q * 100 再四捨五入（浮點誤差，AS-2）。
 */
export interface AnsweredSummary {
  /** 必填。已答對題數，0 ≤ k ≤ q。例 48。 */
  k: number;
  /** 必填。題庫題數，q ≥ 1。例 200。 */
  q: number;
  /** 必填。百分比整數，0～100；k < q 時最大 99。例 24。 */
  p: number;
}

/**
 * 已答對行（契約常數，逐字使用；AC-49-01）。斜線前後各 1 個半形空格，括號為全形。
 * 例「已答對 48 / 200 題（24%）」。主控台第 3 格與本輪結算區使用；模擬測驗頁進度條附近仍用 PART5_RECORD_TEXTS.correctCount（無百分比）。
 */
export const ANSWERED_SUMMARY_TEXT = "已答對 {k} / {q} 題（{p}%）";

// ── 廣告（US-50～US-52）──────────────────────────────────────────────

/**
 * 廣告設定。對應：US-50、AC-50-02、AC-50-05、README AD-1、AD-2。
 */
export interface AdConfig {
  /** 必填。發布商 ID，須符合 AD_PUBLISHER_ID_PATTERN。例 "ca-pub-4051803210893105"。 */
  publisherId: string;
  /**
   * 必填。廣告單元 ID，須符合 AD_SLOT_ID_PATTERN；未取得時為 null。
   * null 或任何不符格式的值 = 未設定 = 零廣告請求（AC-50-02、E-139）。不得以假值代替。例 null（第一階段）。
   */
  adSlotId: string | null;
}

/**
 * 廣告設定值（唯一來源，隨程式打包）。第一階段 adSlotId = null；人類獲准後只改此值即可（AC-50-05）。
 * publisherId 數字段須與 HTML meta、ads.txt 相同（README AD-15）。
 */
export const AD_CONFIG: AdConfig = {
  publisherId: "ca-pub-4051803210893105",
  adSlotId: null,
};

/** 正式環境主機名稱（恰等於比對；不含 www，AC-50-01、README AD-3）。 */
export const AD_PRODUCTION_HOSTNAME = "jimmyfantasyworld.com";

/** 發布商 ID 格式（README AD-2）。 */
export const AD_PUBLISHER_ID_PATTERN = "^ca-pub-[0-9]{16}$";

/** 廣告單元 ID 格式（SA 定案：只驗純數字與合理長度，不寫死位數；README AD-2、E-139）。 */
export const AD_SLOT_ID_PATTERN = "^[0-9]{6,20}$";

/**
 * 廣告腳本網址（依 Google 標準片段，第二階段啟用前由主控核對，FB-73）。
 * 只可在 README AD-6 全部成立時由程式加入；HTML 不得有靜態標籤（AC-19-01、AC-50-03）。第一階段不得產生此請求。
 */
export const AD_SCRIPT_URL = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4051803210893105";

/** 廣告腳本無結果的等待上限（毫秒，AC-51-01 (e)，README AD-8）。只用於記憶體計時。 */
export const AD_LOAD_TIMEOUT_MS = 10_000;

/** 廣告相關畫面文字（AC-52-04）。 */
export const AD_TEXTS = {
  /** 廣告上方緊鄰的標籤；對比 ≥ 4.5:1、不用強調橘；無廣告時不顯示。 */
  label: "廣告",
} as const;

/**
 * 廣告版位狀態（只在記憶體，不持久化）。轉移表見 README §13.2。
 * - "ineligible"：環境條件不成立（含單元 ID 未設定）；本頁終態。
 * - "waiting"：環境成立，尚未到載入時機（如無學習紀錄、不在主控台）。
 * - "loading"：已加入腳本，等待結果；高度 0、無外框、無標籤。
 * - "filled"：有廣告回傳；只在主控台可見。
 * - "collapsed"：離線、遭阻擋、腳本失敗、無回傳、逾時；本頁終態，不重試。
 * - "dismissed"：初始化或匯入後無學習紀錄；本頁終態。
 * 對應：AC-50-01、AC-50-02、AC-50-04、AC-51-01、AC-52-01、AC-52-02。
 */
export type AdSlotStatus = "ineligible" | "waiting" | "loading" | "filled" | "collapsed" | "dismissed";

/** RuntimeState.ad（只在記憶體）。初始值在啟動時依 README AD-4 判定。 */
export interface AdRuntimeState {
  /** 必填。版位狀態。例 "ineligible"。 */
  status: AdSlotStatus;
}

// ── 對外頁面（US-53～US-55、US-57）：單一文案來源 ─────────────────

/** 有應用內畫面與靜態頁的 3 個頁面（Q-86 決議 C1）。 */
export type SitePageId = "about" | "contact" | "privacy";

/** 頁內連結目標。"sources" 只有應用內畫面，靜態頁連到 "./#sources"（README SP-6）。 */
export type SiteLinkTarget = SitePageId | "sources";

/**
 * 段落內的行內內容。文字一律純文字，不得含 HTML。
 * - text：一般文字。
 * - external：外部連結；輸出 target="_blank" rel="noopener"（AC-53-03）。
 * - page：站內連結；應用內開啟畫面，靜態頁為相對連結（README SC-2）。
 */
export type SiteInline =
  | { kind: "text"; text: string }
  | { kind: "external"; text: string; href: string }
  | { kind: "page"; text: string; target: SiteLinkTarget };

/**
 * 頁面內容區塊。兩端渲染對照見 README SC-2；標題層級由渲染端決定（SP-7）。
 * - heading：小標題。
 * - paragraph：段落。
 * - list：清單；每項為 1 串行內內容。
 * - contactLine：輸出 SOURCES_CONTACT_TEXT 的信箱行，不得另存地址（README SC-3）。
 */
export type SiteBlock =
  | { kind: "heading"; text: string }
  | { kind: "paragraph"; inlines: SiteInline[] }
  | { kind: "list"; items: SiteInline[][] }
  | { kind: "contactLine" };

/** 頁面的 SEO 標記值（AC-56-01～AC-56-03）。 */
export interface SiteSeoMeta {
  /** 必填。<title> 與 og:title。例 "關於我｜EnglishContext"。 */
  documentTitle: string;
  /** 必填。meta description 與 og:description；不得含信箱。 */
  description: string;
  /** 必填。canonical 與 og:url，正式絕對網址。例 "https://jimmyfantasyworld.com/about.html"。 */
  canonicalUrl: string;
  /** 選填。og:image 絕對網址；只有首頁提供（AC-56-03）。 */
  ogImageUrl?: string;
}

/**
 * 一個對外頁面。應用內畫面與靜態頁都由這份資料產生（AC-57-03，README SC-1）。
 * 值須為 JSON 相容，不依賴 DOM，瀏覽器與 Node 建置皆可載入。
 */
export interface SitePage {
  /** 必填。頁面代碼，同時是 TabId。 */
  id: SitePageId;
  /** 必填。頁面名稱（應用內 h2、靜態頁 h1），= TAB_LABELS[id]。 */
  title: string;
  /** 必填。靜態頁路徑，相對於部署目錄，須在 PWA_DEPLOY_FILES 中。例 "about.html"。 */
  staticPath: "about.html" | "contact.html" | "privacy.html";
  /** 必填。SEO 標記。 */
  seo: SiteSeoMeta;
  /** 必填。內容區塊，依序輸出。 */
  blocks: SiteBlock[];
}

/** 頁尾連結列的一項（AC-57-01）。 */
export interface FooterLinkItem {
  /** 必填。目標頁面。 */
  target: SiteLinkTarget;
  /** 必填。連結文字，= TAB_LABELS[target]。 */
  label: string;
}

/**
 * 頁尾連結列（契約常數，順序固定，各恰 1 次；AC-57-01）。375px 可換行；版本行在其正下方（AC-42-01）。
 */
export const FOOTER_LINKS: readonly FooterLinkItem[] = [
  { target: "about", label: "關於我" },
  { target: "contact", label: "聯絡我們" },
  { target: "privacy", label: "隱私權政策" },
  { target: "sources", label: "資料來源與授權" },
];

/**
 * 跨頁共用的權利聲明（= README L-8 的 LT-3、LT-5，逐字）。「資料來源與授權」頁與關於我都引用此處，不得另存副本（AC-54-01 (4)、README SC-1）。
 */
export const LEGAL_STATEMENTS = {
  /** LT-3，AC-23-02。 */
  originalContent: "原創內容（例句、解析、Part 5 題目、長難句、句型）由 JimmyLin 以 AI 輔助編製，JimmyLin 就其享有的權利以 CC BY-SA 4.0 授權",
  /** LT-5，AC-23-02。 */
  trademark: "TOEIC® 為 ETS 的註冊商標。本網站與 ETS 無關，亦未經其認可或核准。",
} as const;

/** 靜態頁共用元素的文字（位於 <main> 之外，AC-57-04）。 */
export const SITE_PAGE_TEXTS = {
  /** 回到網站首頁的連結文字；href = "./"。 */
  homeLink: "回到網站首頁",
} as const;

/**
 * 正式網站來源（SEO 宣告用，結尾無斜線）。對應：AC-56-02、README SE-1。
 */
export const SITE_ORIGIN = "https://jimmyfantasyworld.com";

/**
 * 3 個對外頁面的逐字文案（契約常數，唯一來源）。文字依 AC-53-02、AC-54-01、AC-55-01 定稿；公開前請人類讀過（FB-71）。
 * 對應：AC-53-02、AC-53-06、AC-54-01、AC-54-02、AC-55-01、AC-55-02、AC-56-01、AC-57-03。
 */
export const SITE_PAGES: readonly SitePage[] = [
  {
    id: "about",
    title: "關於我",
    staticPath: "about.html",
    seo: {
      documentTitle: "關於我｜EnglishContext",
      description: "EnglishContext 的網站用途、主要功能、使用方式與內容權利說明。",
      canonicalUrl: "https://jimmyfantasyworld.com/about.html",
    },
    blocks: [
      { kind: "heading", text: "網站用途" },
      { kind: "paragraph", inlines: [{ kind: "text", text: "EnglishContext 的用途是提升英文能力、自我學習。" }] },
      { kind: "heading", text: "主要功能" },
      {
        kind: "list",
        items: [
          [{ kind: "text", text: "單字卡：翻卡、美式語音示範、語音辨識吻合度、四選一。" }],
          // （v0.21，R-31，AC-54-01）「：」與「；」之間 = README LT-2 逐字；拿掉「Part 5」。
          [{ kind: "text", text: "模擬測驗：題型參考 TOEIC®（多益），非 ETS 官方或認可內容；作答後顯示解析。" }],
          [{ kind: "text", text: "學習進度：連續打卡、今日已學、已答對題數。" }],
        ],
      },
      { kind: "heading", text: "使用方式" },
      {
        kind: "list",
        items: [
          [{ kind: "text", text: "可離線使用（語音辨識需要連網；網站版須先連網開啟過一次）。" }],
          [{ kind: "text", text: "學習紀錄存在你使用的瀏覽器，可用備份匯出與匯入。" }],
        ],
      },
      { kind: "heading", text: "內容與權利" },
      // 實作時由 LEGAL_STATEMENTS 引用，不得另存副本。
      { kind: "paragraph", inlines: [{ kind: "text", text: "原創內容（例句、解析、Part 5 題目、長難句、句型）由 JimmyLin 以 AI 輔助編製，JimmyLin 就其享有的權利以 CC BY-SA 4.0 授權" }] },
      { kind: "paragraph", inlines: [{ kind: "text", text: "TOEIC® 為 ETS 的註冊商標。本網站與 ETS 無關，亦未經其認可或核准。" }] },
      { kind: "heading", text: "相關頁面" },
      {
        kind: "list",
        items: [
          [{ kind: "page", text: "資料來源與授權", target: "sources" }],
          [{ kind: "page", text: "隱私權政策", target: "privacy" }],
          [{ kind: "page", text: "聯絡我們", target: "contact" }],
        ],
      },
    ],
  },
  {
    id: "contact",
    title: "聯絡我們",
    staticPath: "contact.html",
    seo: {
      documentTitle: "聯絡我們｜EnglishContext",
      description: "EnglishContext 的聯絡方式。",
      canonicalUrl: "https://jimmyfantasyworld.com/contact.html",
    },
    // AC-55-01：內容區只有標題與 1 行信箱（Q-91 決議 B）。
    blocks: [{ kind: "contactLine" }],
  },
  {
    id: "privacy",
    title: "隱私權政策",
    staticPath: "privacy.html",
    seo: {
      documentTitle: "隱私權政策｜EnglishContext",
      description: "EnglishContext 如何處理學習資料、廣告服務、Cookie 與識別碼、語音辨識，以及個人化廣告的退出方式。",
      canonicalUrl: "https://jimmyfantasyworld.com/privacy.html",
    },
    blocks: [
      { kind: "heading", text: "學習資料" },
      { kind: "paragraph", inlines: [{ kind: "text", text: "學習紀錄只存在你目前使用的瀏覽器。本系統沒有伺服器，不接收也不保存這些紀錄；備份檔由你自行保管。" }] },
      { kind: "heading", text: "廣告服務" },
      { kind: "paragraph", inlines: [{ kind: "text", text: "網站版（jimmyfantasyworld.com）使用 Google AdSense；以檔案開啟的版本不載入廣告。" }] },
      { kind: "heading", text: "Cookie 與識別碼" },
      { kind: "paragraph", inlines: [{ kind: "text", text: "Google 等第三方可能讀寫 Cookie 或使用識別碼，並依你造訪本網站或其他網站的紀錄投放廣告；這些資料由第三方依其政策處理。" }] },
      { kind: "heading", text: "個人化廣告退出方式" },
      {
        kind: "paragraph",
        inlines: [
          { kind: "text", text: "你可以到 Google 廣告設定關閉個人化廣告，說明請見：" },
          { kind: "external", text: "控制 Google 用於顯示廣告的資料", href: "https://support.google.com/My-Ad-Center-Help/answer/12156161" },
        ],
      },
      { kind: "heading", text: "語音辨識" },
      { kind: "paragraph", inlines: [{ kind: "text", text: "語音由瀏覽器廠商（如 Google、Microsoft）處理；本系統不錄音、不保存、不上傳錄音。" }] },
      { kind: "heading", text: "聯絡方式" },
      { kind: "contactLine" },
    ],
  },
];

// ── SEO 與爬蟲檔（US-56）────────────────────────────────────────────

/**
 * 首頁 SEO 標記值（AC-56-01～AC-56-03；Q-90 決議 B）。description 逐字同 PRD US-56，長度 75 字元
 * （v0.21，R-31，Q-108 A：拿掉「Part 5」，v0.19～v0.20 為 81 字元；「；」之後到「。」之前 = README LT-2；AC-56-07 限制仍符合）。
 */
export const SITE_HOME_SEO: SiteSeoMeta = {
  documentTitle: "EnglishContext｜英文單字卡與模擬測驗",
  description: "EnglishContext 是自我學習用的英文工具，提供單字卡、美式發音練習與模擬測驗；題型參考 TOEIC®（多益），非 ETS 官方或認可內容。",
  canonicalUrl: "https://jimmyfantasyworld.com/",
  ogImageUrl: "https://jimmyfantasyworld.com/icons/icon-512.png",
};

/**
 * 首頁結構化資料（Q-92 決議 A）。以 JSON.stringify 輸出到恰 1 段 application/ld+json；鍵不得增減（AC-56-05，README SE-5）。
 * name = APP_DISPLAY_NAME；url、description = SITE_HOME_SEO。
 */
export const SITE_HOME_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "EnglishContext",
  url: "https://jimmyfantasyworld.com/",
  description: "EnglishContext 是自我學習用的英文工具，提供單字卡、美式發音練習與模擬測驗；題型參考 TOEIC®（多益），非 ETS 官方或認可內容。",
} as const;

/**
 * 未執行 JavaScript 時的網站說明（放在 <noscript>；AC-56-06，README SE-6）。不含信箱；連結為正式網址（E-151）。
 * 標題用 h2；靜態標題列已有 h1（AC-56-04）。
 */
export const SITE_NOSCRIPT = {
  /** h2。 */
  title: "EnglishContext",
  /** 段落，= SITE_HOME_SEO.description（v0.21 同步拿掉「Part 5」）。 */
  description: "EnglishContext 是自我學習用的英文工具，提供單字卡、美式發音練習與模擬測驗；題型參考 TOEIC®（多益），非 ETS 官方或認可內容。",
  /** 主要功能清單；學習功能須啟用 JavaScript（E-150）。 */
  features: ["單字卡與美式發音練習", "模擬測驗（作答後顯示解析）", "學習進度（連續打卡、今日已學、已答對題數）"],
  /** 一般連結，順序固定。 */
  links: [
    { text: "關於我", href: "https://jimmyfantasyworld.com/about.html" },
    { text: "聯絡我們", href: "https://jimmyfantasyworld.com/contact.html" },
    { text: "隱私權政策", href: "https://jimmyfantasyworld.com/privacy.html" },
  ],
} as const;

/** robots.txt 逐字內容（換行 LF，結尾 1 個 LF；AC-56-08，README SE-7）。 */
export const ROBOTS_TXT = "User-agent: *\nAllow: /\n\nSitemap: https://jimmyfantasyworld.com/sitemap.xml\n";

/** sitemap.xml 逐字內容（換行 LF，結尾 1 個 LF；無 lastmod，AC-56-09、AC-36-01 (a)，README SE-8）。 */
export const SITEMAP_XML =
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  "  <url><loc>https://jimmyfantasyworld.com/</loc></url>\n" +
  "  <url><loc>https://jimmyfantasyworld.com/about.html</loc></url>\n" +
  "  <url><loc>https://jimmyfantasyworld.com/contact.html</loc></url>\n" +
  "  <url><loc>https://jimmyfantasyworld.com/privacy.html</loc></url>\n" +
  "</urlset>\n";

// ════════════════════════════════════════════════════════════════════
// §18 語音辨識準備中、訊息分流與辨識文字（v0.20，PRD R-29、US-58～US-60、Q-94～Q-99、Q-101）
//     （v0.21，PRD R-30、US-62、Q-103～Q-107）聆聽中即時文字：SttStartOptions、"interim"、SttEndInfo.lastInterimText、
//     STT_FLOW_TEXTS.labelInterim；規則見 README §14.6 IT-1～IT-10。
//     提供者：契約常數（pg-frontend 實作；services/stt.js 提供事件，views/speech-panel.js 決定狀態與訊息，模組分工由 SD 定）
//     使用者：pg-frontend、QA（V-STT-STUB 替身，README §14.5 V-STT-01～V-STT-17）
//     本節全部「不持久化」：不寫入 localStorage、備份檔或任何儲存；不新增 window 全域變數；pg-content 無工作。
//     SpeechRecognition 實例、計時器、事件物件不得放入 AppState（§10 RuntimeState 禁放規則）。
// ════════════════════════════════════════════════════════════════════

/**
 * 語音辨識服務必須能分辨並回報的引擎事件（SpeechRecognition 的同名事件）。對應：US-58、US-59、AC-58-03、AC-58-07、AC-58-08、
 * AC-59-01～AC-59-06。
 * - "audiostart"：開始收音事件（PRD US-58 名詞）。準備中收到 → 經 T_BUFFER 後進入聆聽中（AC-58-03）。
 * - "soundstart"：偵測到聲音。準備中收到 → 立即聆聽中（AC-58-07）。**不算偵測到語音**（AC-59-05 (c)）。
 * - "speechstart"：偵測到語音。準備中收到 → 立即聆聽中（AC-58-07）；記錄 speechDetected（US-59 分流依據）。
 * - "result"：辨識結果（文字可能為空，AC-59-03）。（v0.21）指**最終結果**：引擎 result 事件自 resultIndex 起任一結果的
 *   isFinal 不是 false（未提供 isFinal 的引擎視為最終）；呼叫端未提供 onInterim 時，每個 result 事件都屬本值（與 v0.20 相同）。
 * - "interim"：（v0.21，US-62）**即時文字**（暫時結果）：呼叫端提供 onInterim 時，引擎 result 事件自 resultIndex 起所有結果的
 *   isFinal 都是 false。不是瀏覽器的獨立事件名稱，由服務從 result 事件區分（README IT-2）。取出的文字為空時服務不回報（IT-3）。
 *   準備中收到 → 立即聆聽中（同 soundstart、speechstart，AC-62-02、README PR-5 (b)）。不是終結點，不評分（MS-2、IT-9）。
 * - "nomatch"：引擎有結果但無可用文字（AC-59-02）。
 * - "error"：錯誤，附 SpeechRecognitionErrorEvent.error 字串（not-allowed、audio-capture、network、no-speech、aborted 等）。
 * - "end"：本次辨識結束（附 SttEndInfo）。
 * 其他事件（audioend、soundend、speechend）不影響狀態與訊息，服務可不回報。
 * 本次嘗試已取消、逾時中止或被新嘗試取代後，任何事件都不得再影響畫面（AC-58-04 (b)、AC-58-05、AC-58-06，README PR-9）。
 * 「瀏覽器不支援 audiostart」的判定方式由 SD 訂定（AC-58-09），契約只要求服務能告知呼叫端「本次是否可依賴 audiostart」。
 */
export type SttEngineEventKind = "audiostart" | "soundstart" | "speechstart" | "interim" | "result" | "nomatch" | "error" | "end";

/**
 * 準備中的子階段（RuntimeState.speech.preparingPhase；只在記憶體）。對應：AC-58-01、AC-58-04、AC-58-06、AC-58-09、Q-96、Q-97。
 * - "acquiringMic"：已按下、正在取得麥克風（getUserMedia 或權限詢問未完成，AC-58-04 (a)）。不計入 T_READY（AC-58-06）。
 *   取得失敗依既有規則：權限拒絕 → AC-08-09；找不到裝置 → AC-33-05；其他原因 → 收音條全暗、照常開始辨識（AC-33-07）。
 * - "awaitingAudioStart"：已呼叫並回傳 start()，引擎可依賴 audiostart，正在等待（AC-58-02）；自 start() 回傳起套用 T_READY。
 *   收到 audiostart 後、T_BUFFER 尚未結束時仍為本值（畫面仍是準備中）。
 * - "fallbackWait"：已呼叫並回傳 start()，引擎不可依賴 audiostart（AC-58-09）；維持 T_FALLBACK 後進入聆聽中，不套用 T_READY。
 */
export type SttPreparingPhase = "acquiringMic" | "awaitingAudioStart" | "fallbackWait";

/**
 * 本次辨識結束資訊（服務 → 呼叫端，"end" 事件附帶；執行期，不持久化，AC-59-07）。
 * 擴充既有 onEnd({ manual, hadResult, hadError }) 的 3 欄，新增 5 欄；（v0.21）再新增 lastInterimText，共 9 欄。
 * 所有欄位在每次新的 start() 都重設為初始值（布林 false、errorCode null、lastInterimText ""；AC-59-06 末句）。
 * 每個回呼附的是**當下值的新複本**（呼叫端修改不影響服務）。
 * 欄位全部必填。對應：AC-58-07、AC-58-08、AC-59-01～AC-59-06、AC-62-02、AC-62-05、AC-62-06、README MS-1～MS-6、IT-3、IT-9。
 */
export interface SttEndInfo {
  /** 必填。使用者主動停止或取消（再按一次、換卡、切換模式、按 TTS、離開頁面）。true 時不提示（AC-08-10、AC-58-04、AC-58-10）。 */
  manual: boolean;
  /**
   * 必填。本次是否收到過最終結果 "result"（不論文字是否為空）。
   * （v0.21）即時文字（"interim"）**不**使本欄變 true；服務也不得在 end 時以即時文字「補發」result（README IT-4）。
   */
  hadResult: boolean;
  /** 必填。本次是否收到過 "error"（手動停止造成的 aborted 不算）。 */
  hadError: boolean;
  /** 必填。（v0.20）本次是否收到過 "audiostart"。 */
  audioStarted: boolean;
  /** 必填。（v0.20）本次是否收到過 "soundstart"。只用於轉入聆聽中，不算偵測到語音（AC-59-05 (c)）。 */
  soundStarted: boolean;
  /** 必填。（v0.20）本次是否收到過 "speechstart"（偵測到語音，AC-59-01、AC-59-04）。 */
  speechDetected: boolean;
  /** 必填。（v0.20）本次是否收到過 "nomatch"（AC-59-02）。 */
  nomatch: boolean;
  /** 必填。（v0.20）第一個 error 代碼；沒有錯誤為 null。例："no-speech"、"network"。 */
  errorCode: string | null;
  /**
   * 必填。（v0.21，US-62）本次最後一段**非空**即時文字（README IT-3 取出規則的結果，原樣，不清洗）；本次沒有收到過非空即時文字為 ""。
   * 「本次收到過即時文字」一律以 lastInterimText !== "" 判定（不另設布林旗標，避免兩欄不一致）。
   * 用途：(1) README MS-1 步驟 (2b) 只有即時文字就結束時評分的文字（Q-103 A、AC-62-05）；(2) MS-1 步驟 (4) 視同偵測到語音（Q-107 A、AC-62-06 (d)）。
   * 只在記憶體、只經回呼傳遞；不得寫入 AppState、localStorage、備份檔或任何儲存（AC-62-10）。例："adress"、"comply with"。
   */
  lastInterimText: string;
}

/**
 * （v0.21 新增）語音辨識服務 start() 的選項（services/stt.js 的呼叫介面；pg-frontend 內部的模組契約）。
 * 回呼名稱沿用 architecture.md §7.26（DS-57 由 SD 定案），本版新增 onInterim。所有欄位選填；未提供的回呼不呼叫。
 * 所有回呼的 info 皆為當下 SttEndInfo 的新複本。回呼內丟出的例外由服務攔下，不得成為未處理例外。
 * 本次嘗試已被 abort()、新的 start() 取代或已觸發 onEnd 後，任何回呼都不再呼叫（README PR-9、IT-7）。
 * start() 回傳值不變：{ ok: true, audioStartSupported: boolean } ｜ { ok: false, reason: "unsupported" ｜ "offline" ｜ "error" }。
 * 引擎設定：lang（預設 "en-US"，AC-08-01）、maxAlternatives = 1、continuous = false 不變；interimResults = 是否提供 onInterim（IT-1）。
 * 函式型別只用於模組之間呼叫，**不屬** AppState，不可序列化、不持久化。
 * 對應：FR-2.3、US-58、US-59、US-62、AC-58-03、AC-58-07、AC-62-01～AC-62-06、README IT-1～IT-4、DS-57、DS-64。
 */
export interface SttStartOptions {
  /** 選填。辨識語言；未提供或空字串時用 "en-US"（AC-08-01）。 */
  lang?: string;
  /** 選填。引擎 audiostart（SttEngineEventKind "audiostart"）。 */
  onAudioStart?: (info: SttEndInfo) => void;
  /** 選填。引擎 soundstart。 */
  onSoundStart?: (info: SttEndInfo) => void;
  /** 選填。引擎 speechstart。 */
  onSpeechStart?: (info: SttEndInfo) => void;
  /**
   * 選填。（v0.21，US-62）即時文字。**提供本回呼 = 要求暫時結果**（interimResults = true）；語音畫面每次嘗試都必須提供（US-62）。
   * text：README IT-3 取出的非空字串（只去除各段前後空白、以 1 個半形空白串接；不清洗標點、不改大小寫，AC-62-01）；
   *   取出為空時服務不呼叫本回呼、不改 lastInterimText（AC-62-01 末句）。
   * 呼叫前服務已把 info.lastInterimText 設為 text。本回呼只供顯示，呼叫端不得據此評分（IT-9 例外由呼叫端在 end 處理）。
   */
  onInterim?: (text: string, info: SttEndInfo) => void;
  /** 選填。最終結果（"result"）；text 依 README RT-1 取出，可能為空字串（AC-59-03）。 */
  onResult?: (text: string, info: SttEndInfo) => void;
  /** 選填。引擎 nomatch。 */
  onNomatch?: (info: SttEndInfo) => void;
  /** 選填。引擎 error；code = SpeechRecognitionErrorEvent.error（取不到時 "unknown"）。手動停止造成的 "aborted" 不通知。 */
  onError?: (code: string, info: SttEndInfo) => void;
  /** 選填。本次辨識結束；info.lastInterimText 為本次最後一段非空即時文字（是否以它評分由呼叫端依 MS-1 (2b)、IT-9 判定）。 */
  onEnd?: (info: SttEndInfo) => void;
}

/**
 * 沒有分數時的訊息種類（US-59、AC-58-06、AC-58-08）。判定順序見 README §14.2 MS-1。
 * - "heardNoWords"：偵測到語音但沒有文字、nomatch、或辨識文字清洗後為空 → STT_FLOW_TEXTS.heardNoWords。
 *   （v0.21）本次收到過即時文字（SttEndInfo.lastInterimText !== ""）也視同偵測到語音：之後的 no-speech 錯誤（Q-107 A、AC-62-06 (d)）、
 *   最終結果清洗後為空（AC-62-04）、只有即時文字但清洗後為空（AC-62-05 末句）皆為本值。
 * - "noSpeech"：已開始收音（或後備時間已到）但完全沒偵測到語音 → STT_FLOW_TEXTS.noSpeech（沿用 v1.3.0 原文）。
 * - "noResponse"：未經開始收音就結束，或 T_READY 逾時 → STT_FLOW_TEXTS.noResponse。
 * 錯誤代碼 not-allowed、audio-capture、network 等仍用既有訊息，不屬本型別（AC-58-08、AC-59-06 (c)）。
 */
export type SttNoTextOutcome = "heardNoWords" | "noSpeech" | "noResponse";

/** 時間常數範圍（毫秒，整數）。defaultMs 為契約預設值；SD 實測後可在 [minMs, maxMs] 內調整（含兩端），主控代核（README PR-11）。 */
export interface SttTimingRange {
  /** 必填。預設值（ms）。 */
  defaultMs: number;
  /** 必填。可調整下限（ms，含）。 */
  minMs: number;
  /** 必填。可調整上限（ms，含）。 */
  maxMs: number;
}

/** 分數區文字列種類（US-60）。"recognized" = 「辨識文字」；"target" = 「目標文字」。 */
export type SttResultRowKind = "recognized" | "target";

/**
 * 語音辨識流程的畫面文字（契約常數，逐字使用；以 textContent 或 setAttribute 寫入）。對應：AC-58-01、AC-58-06、AC-58-08、
 * AC-59-01～AC-59-05、AC-60-01、AC-08-08、Q-99 A。
 * - micPreparing：準備中按鈕文字（AC-58-01）。
 * - micPreparingLabel：準備中按鈕 aria-label（AC-58-01）。中間為全形逗號「，」U+FF0C。
 * - heardNoWords：US-59「有收到聲音」訊息（AC-59-01）。「英文單字」只是引導文字，不是語言判斷（Q-99、Q-101）。
 * - noSpeech：US-59「未偵測到語音」訊息（AC-59-05）；與 v1.3.0 原文相同，不改。
 * - noResponse：未經開始收音就結束或逾時（AC-58-06、AC-58-08）。
 * - labelRecognized、labelTarget：分數區文字列標籤（AC-08-08、AC-60-01），與 v1.3.0 相同，不改。
 * - labelInterim：（v0.21，US-62、Q-104 A）即時文字列標籤（AC-62-01、AC-62-11）。冒號為全形「：」U+FF1A，標籤元素只含這 3 個字元；
 *   即時文字放在另一個值元素（lang="en"），兩者都以 textContent 寫入（README IT-6）。
 * 既有的「麥克風跟讀」「聆聽中」「聆聽中，再按一次停止」、錯誤訊息與 AC-08-11 說明文字不變，由 SD 文字定稿表維持。
 * 本節訊息全部是 info 層級提示，不算評分，不改今日已學、打卡、掌握數（AC-30-04、AC-59-07）。
 * 實作端的常數鍵名可自訂（例：試作的 liveLabel），但值必須逐字等於本常數（V-STT-09、V-STT-15）。
 */
export const STT_FLOW_TEXTS = {
  micPreparing: "準備中",
  micPreparingLabel: "準備中，再按一次取消",
  heardNoWords: "有收到聲音，但沒聽出英文單字，請再說一次",
  noSpeech: "未偵測到語音，請再試一次",
  noResponse: "語音辨識沒有回應，請再試一次",
  labelRecognized: "辨識文字",
  labelTarget: "目標文字",
  labelInterim: "聽到：",
} as const;

/**
 * 準備中的時間常數（PRD US-58 名詞；架構常數的契約範圍）。對應：AC-58-03、AC-58-06、AC-58-09、Q-94 A、Q-95 C、Q-96 B。
 * - readyTimeout = **T_READY**：自 start() 回傳起等待開始收音事件的上限。預設 5000，可在 3000～10000 內調整；
 *   超出範圍須回 PM（AC-58-06）。只用於 preparingPhase = "awaitingAudioStart"；權限詢問期間不計入。
 * - buffer = **T_BUFFER**：收到 audiostart 到顯示「聆聽中」的緩衝。預設 0，可在 0～500 內調整（AC-58-03）。
 *   收到 soundstart、speechstart 時不再套用（AC-58-07）。
 * - fallback = **T_FALLBACK**（後備時間）：不可依賴 audiostart 時，自 start() 回傳起維持準備中的固定時間。預設 1500，
 *   可在 1000～2000 內調整（AC-58-09）。
 * **主控實測後可在上述範圍內代核調整**（調整後的實際值寫在 docs/03-design/architecture.md，契約常數維持預設與範圍，
 * 不需改契約；README PR-11）。值為毫秒整數。
 */
export const STT_TIMING: Readonly<Record<"readyTimeout" | "buffer" | "fallback", SttTimingRange>> = {
  readyTimeout: { defaultMs: 5000, minMs: 3000, maxMs: 10000 },
  buffer: { defaultMs: 0, minMs: 0, maxMs: 500 },
  fallback: { defaultMs: 1500, minMs: 1000, maxMs: 2000 },
} as const;

/**
 * 分數區各燈號顯示的文字列與順序（US-60、Q-98 A）。對應：AC-08-06～AC-08-08、AC-60-01、AC-60-02、AC-60-04。
 * - green、yellow：只有「辨識文字」1 列，不顯示「目標文字」（目標單字已在同一張卡片上）。
 * - red：「辨識文字」、「目標文字」2 列並列（AC-08-08，與 v1.3.0 相同）。
 * 分數區整體順序（AC-60-01）：分數與燈號 → 提示（只有黃燈，「放慢速度或重聽 0.75x 示範」）→ 本常數的文字列 → AC-08-11 說明。
 * 每列 = 標籤（STT_FLOW_TEXTS.labelRecognized／labelTarget）+ 值（SttResult.recognizedText／targetText）；值元素 lang="en"。
 * 沒有分數時（US-59 任一訊息、錯誤、取消）不顯示分數區，也不得出現空白的「辨識文字」標籤（AC-60-04）。
 */
export const STT_RESULT_ROWS: Readonly<Record<SttLight, readonly SttResultRowKind[]>> = {
  green: ["recognized"],
  yellow: ["recognized"],
  red: ["recognized", "target"],
} as const;

export {};
// 主控代核（2026-11-05）：依已核准 PRD v0.20 修訂；不改 PRD、不改 localStorage 持久化結構（schemaVersion 3，storage-schema.json 未改）；tsc --strict 通過。
// （v0.21，2026-11-09）sa-agent 依已核准 PRD v0.21 修訂，待主控代核；不改 localStorage 持久化結構（schemaVersion 3）。
