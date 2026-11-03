---
doc: CONTRACT
version: 0.13
status: approved
author: sa-agent
approved_by: JimmyLin（授權主控代核）
approved_at: 2026-11-03
---

# English Master Track — 資料契約總覽

> 上游：`docs/01-PRD.md` v0.13（approved，JimmyLin，2026-11-03），以第 6 章「人類決議」與 R-15～R-21 為準（v0.12 修訂內容見 §12 變更紀錄 0.12 列與 §11；v0.13 只改強調橘用途例外，見 0.13 列）；`english_master_track.md` 2.2 僅供參考（`tier`、`tierLabel`、`options`、`correctIndex` 依 Q-01、Q-03、Q-09、R-07 廢除）。
> 本契約共 3 個檔案，視為一組審核：本檔、`data-schema.ts`（型別）、`storage-schema.json`（localStorage 與備份檔的 JSON Schema）。核准方式：把本檔 frontmatter 改為 `status: approved`，並同步填寫 `data-schema.ts` 開頭註解與 `storage-schema.json` `meta` 的 `status`、`approved_by`、`approved_at`（v0.5 起三檔狀態一律一致，SD-FB-04）。
> 欄位的必填、值域、範例以 `data-schema.ts` 註解為準；本檔放總覽、規則、驗證與待辦。
> v0.2：依主控 2026-10-29 連網查證結果，四份字表與 ECDICT 授權改為已確認、可收錄；原始字表已置於 `sources/wordlists/`；`N_B`、`N_G` 改為實際值（§4.2）。
> v0.4：依 PRD v0.6 R-13（FB-10 決議）：釋義取自 ECDICT 轉繁體台灣用語後精簡（`meaningSource` = `"ECDICT"`，查無 4 筆為 `"ORIGINAL"`）；音標一律原創美式 IPA（`phoneticSource` 只能是 `"ORIGINAL"`）；卡片出處依欄位實際來源顯示。`sources/ecdict/` 全部到位（§3.2），新增釋義撰寫規則 M-1～M-7、卡片出處規則 L-6 與 V-VOC-15～18。
> v0.5：實作階段（/pg-run）釐清修訂，只補例外與註解，型別、常數、持久化結構皆不變（§9.1）：V-ST-04 截取範圍去重（SD-FB-03）、§6.2 匯入步驟 5 的 V-ST-03 例外與 BackupFile 頂層檢查（FE-06）、`ImportResult.fileVersion` 非數值處理（FE-06）、三檔狀態同步（SD-FB-04）。
> v0.6：實作階段（/pg-run 後段）第二次釐清修訂（§9.2 DF-07～DF-10）：§5.3 讀取失敗的重設時機（RS-1～RS-4）、匯入步驟 8 新增執行期錯誤碼 `write_failed`（IM-6、IM-7）、M-3 補 `s2twp` 過度轉換清單、FB-20 結案。不改 PRD；持久化結構不變，`schemaVersion` 維持 1。
> v0.7：依人類決議（JimmyLin，2026-10-30）：FB-25 採用新增詞性 `"pref."`（畫面「字首」），M-8、M-4、V-VOC-07 隨之修改；FB-24 定案 `write_failed` 文字為「儲存失敗，未匯入」。不改 PRD；持久化結構不變，`schemaVersion` 維持 1。
> **v0.8：依 PRD v0.8（R-15、R-16、R-17、US-25～US-31）修訂，含持久化結構變更 `schemaVersion` 1 → 2（PRD R-17 人類已同意）。依 PRD R-17 與 CLAUDE.md，本版須由人類核准，不適用主控代核。** 重點：(1) `PersistedData` 新增 `todayLearned`、`learnedHistory`，v1 → v2 遷移（§5.3 MG-1～MG-4）、欄位層級讀取規則（RD-1）、驗證 V-ST-09～V-ST-13；(2) 學習紀錄規則 LR-1～LR-8（§5.4）；(3) 首次進入規則 FS-1～FS-7（§5.5，不新增持久化欄位）；(4) 備份匯出版本 2、可匯入 1 與 2（§6.3、IM-8）；(5) R-15 畫面名稱改為「單字卡」「模擬測驗」「難易度設定」，新增常數 `TAB_LABELS`、`NAV_TAB_ORDER`，識別字不改；(6) Q-33 介面數值屬設計層（§5.6）。localStorage 鍵數維持 2。
> **v0.9：依 PRD v0.9（R-18、US-32、US-33、AC-20-04、Q-36～Q-38）增量修訂，不改持久化結構（`schemaVersion` 維持 2，`PersistedData`、`StorageRecord`、`BackupFile` 欄位不變）。** 重點：(1) 新增 §5.7 切換難易度初始化學習紀錄規則 CI-1～CI-10（「有學習紀錄」對應欄位、清除欄位與初始值、保留欄位、單次原子寫入），新增常數 `LEARNING_PROGRESS_FIELDS`；(2) 新增 §5.8 隱藏頁面規則 HT-1～HT-5，`NAV_TAB_ORDER` 由 6 項改為 4 項，新增常數 `HIDDEN_TAB_IDS`；`decoder.js`、`phrasebank.js` 格式不變、資料保留；(3) 收音條門檻 T1～T5 判定為架構常數，契約不定義，交 SD（§9.3 DS-01）；(4) 修改 LR-4、V-ST-12、§5.3「寫入：容量不足」列，新增 V-ST-14、V-ST-15。**三檔同步的例外**：依主控指示「沒有改動的檔案保持原樣」，`storage-schema.json` 本版未修改，維持 v0.8 approved；本版契約組合 = 本檔 v0.9 + `data-schema.ts` v0.9 + `storage-schema.json` v0.8（其內容對 v0.9 仍正確）。
> **v0.10：依 PRD v0.10（R-19、Q-39）增量修訂，不改持久化結構（`schemaVersion` 維持 2，`GoalState` 4 欄與 `PersistedData` 9 欄不變，不需遷移）。** 重點：(1) 首次／重設預設分數 `SCORE_DEFAULT` 600 → 725（Q-39 決議 B）；(2) 新增 §5.9 目標分數規則 GS-1～GS-8：選中卡片 = Color(`draftScore`)、點卡片 = 該色 `scoreMax`（取代 Q-32）、既有分數不轉換、分數驗證只用於資料層、畫面不顯示分數；(3) 修改 §5.2、FS-2、FS-3、CI-3、CI-9、FB-08、FB-35，新增 V-ST-16、FB-36、§9.4 DS-07～DS-10。三檔同步升為 v0.10（`storage-schema.json` 只改 description、examples 與 meta）。
> **v0.11：依 PRD v0.11（R-20 PWA、US-34～US-37、AC-24-12、Q-41～Q-48）增量修訂，不改持久化結構（`schemaVersion` 維持 2，localStorage 鍵數 2，`PersistedData` 9 欄、`StorageRecord`、`BackupFile` 不變，不需遷移）。PWA 不寫入 localStorage 任何資料。** 重點：新增 **§10 PWA 契約**——(1) 兩種交付形態對照（§10.1）；(2) 部署目錄 8 個檔案與圖示 PNG 規格 DP-1～DP-7（§10.2）；(3) manifest 欄位值 MF-1～MF-4（§10.3）；(4) HTML head 靜態／動態元素 HD-1～HD-5（§10.4）；(5) PWA 啟用條件（`file://` 判定）PE-1～PE-4（§10.5）；(6) service worker、快取名稱、建置識別碼、預先快取清單、清除舊快取 SW-1～SW-11（§10.6）；(7) 更新流程與 postMessage UP-1～UP-9（§10.7）；(8) 安裝按鈕 IN-1～IN-8（§10.8）；(9) 不互通說明 NT-1（§10.9）；(10) 儲存與隱私 PV-1～PV-7（§10.10）；(11) 驗證規則 V-PWA-01～V-PWA-12（§10.11）。`data-schema.ts` 新增 §12（7 個型別、11 個常數，`RuntimeState.pwa`）；`storage-schema.json` 只改 meta（新增 `browserStoragePolicy`，AC-21-03）。原「§10 變更紀錄」改為 §11。
> 專案代號、文件標題與識別字仍為 English Master Track；App 顯示名稱自 v0.12 起為「EnglishContext」（§11.1）。

---

## 1. 契約總覽

| 型別（`data-schema.ts`） | 用途 | 提供者 | 使用者 | 對應 FR / AC |
| :--- | :--- | :--- | :--- | :--- |
| `ColorLevel`、`OpenColorLevel`、`ColorLevelDefinition`、`COLOR_LEVELS`、`SCORE_*`、`N_O` | 5 色級定義、分數規則（v0.10：`scoreMax` 兼為點卡片的色級上限分數；`SCORE_MIN`／`MAX`／`STEP` 只用於資料層驗證；`SCORE_DEFAULT` = 725） | 契約常數（pg-frontend 實作） | pg-frontend | FR-1.1、FR-1.2、AC-01-01、AC-01-05、AC-02-03～AC-02-10、AC-26-05、AC-26-06、R-19、Q-39 |
| `DataSourceEntry`、`LicenseConfirmation`、`ProjectLicenseInfo` | 來源字表登錄、授權確認紀錄、專案授權 | pg-content | pg-frontend（卡片出處、資料來源與授權頁） | AC-23-01～AC-23-03、AC-23-05、AC-23-06 |
| `VocabManifest`、`RankSegment` | 內建字庫摘要（`N_B`、`N_G`、排名區段） | pg-content | pg-content 自驗、QA | AC-03-06、AC-03-08、AC-03-09 |
| `BuiltinVocabItem`、`PartOfSpeech`、`POS_LABELS` | 內建單字 | pg-content | pg-frontend | FR-1.3、FR-2.1、AC-03-01～AC-03-09、AC-06-01～AC-06-08、AC-23-01、AC-23-03、AC-23-04 |
| `DomainTemplate`、`TemplateWord` | 資工／商管／生醫統計範本 | pg-content | pg-frontend | FR-1.4、AC-05-01～AC-05-05 |
| `Part5Question`、`Part5Explanation`、`PART5_TYPE_LABELS`、`PART5_BLANK` | 模擬測驗題庫（題型對應多益 Part 5；識別字沿用 `Part5*`，R-15） | pg-content | pg-frontend | FR-3.1、FR-3.2、AC-10-01、AC-10-02、AC-11-01、AC-11-02 |
| `DecoderSentence`、`DecoderSegment`、`SyntaxRole` | 長難句與語法標籤 | pg-content | pg-frontend | FR-4.1、FR-4.2、AC-12-01～AC-12-03、AC-13-01、AC-13-03 |
| `ReadingStrategy` | 閱讀策略 3 主題 | pg-content | pg-frontend | FR-4.3、AC-14-01、AC-14-02 |
| `PhraseTemplate`、`PhraseCategory`、`PHRASE_CATEGORY_LABELS` | 學術句型庫 | pg-content | pg-frontend | FR-5.1、FR-5.2、AC-15-01～AC-16-03 |
| `PersistedData`、`StorageRecord`、`GoalState`、`CustomVocabItem`、`VocabQuizStats`、`Part5Progress`、`StreakState`、`CURRENT_SCHEMA_VERSION`、`SUPPORTED_SCHEMA_VERSIONS`、`STORAGE_KEYS` | localStorage 持久化資料（schemaVersion 2） | pg-frontend | pg-frontend、QA | FR-6.1、FR-6.2、AC-01-04、AC-02-08、AC-04-05、AC-09-04、AC-11-05、AC-17-01～AC-17-06、AC-18-01～AC-18-05、AC-30-12 |
| `TodayLearnedState`、`LearnedHistory`、`LEARNED_HISTORY_DAYS`、`DASHBOARD_CHART_DAYS`（v0.8） | 今日已學紀錄、近 30 天每日已學字數（持久化） | pg-frontend | pg-frontend、QA | FR-6.1、FR-6.2、US-30、AC-30-01～AC-30-14、AC-18-01、AC-24-02、AC-24-10、AC-24-11、R-17 |
| `BackupFile`、`ImportResult`、`ImportErrorCode` | JSON 備份匯出／匯入 | pg-frontend | pg-frontend、QA | AC-24-01～AC-24-11、AC-25-10、AC-25-11 |
| `AppState`、`RuntimeState`、`StudyCard`、`VocabQuizQuestion`、`SttResult`、`SttLight`、`SttStatus`、`TabId`、`StorageStatus` | 執行期狀態（不持久化） | pg-frontend | pg-frontend | AC-03-04、AC-03-05、AC-06-04、AC-06-05、AC-08-01～AC-08-12、AC-09-01～AC-09-07、AC-13-03、AC-16-01、AC-18-03、AC-28-08、AC-30-14 |
| `EntryMode`、`LearningEventKind`（v0.8） | 首次畫面／一般模式、「學過一個字」的學習行為（執行期，不持久化） | pg-frontend | pg-frontend、QA | US-25、AC-25-01～AC-25-11、US-30、AC-30-03、AC-30-04 |
| `TAB_LABELS`、`NAV_TAB_ORDER`（v0.8；v0.9 `NAV_TAB_ORDER` 改為 4 項；v0.12 主控台不再有模組入口） | 頁面畫面名稱與導覽順序（R-15、R-18 三） | 契約常數（pg-frontend 實作） | pg-frontend、QA | AC-10-02、AC-17-06、AC-20-03、AC-27-01、AC-27-04、AC-39-06 |
| `HIDDEN_TAB_IDS`（v0.9） | 隱藏頁面（解碼器、句型庫）；不可到達，嘗試進入時改顯示主控台 | 契約常數（pg-frontend 實作） | pg-frontend、QA | AC-20-04、E-68、R-18 三 |
| `LEARNING_PROGRESS_FIELDS`（v0.9） | 切換難易度初始化時清除的 6 個 `PersistedData` 欄位（白名單） | 契約常數（pg-frontend 實作） | pg-frontend、QA | US-32、AC-32-02、AC-32-03、AC-32-10、R-18 一 |
| `PwaManifest`、`PwaManifestIcon`、`PwaIconPurpose`、`PWA_MANIFEST`、`PWA_APP_NAME`、`PWA_THEME_COLOR`、`PWA_BACKGROUND_COLOR`（v0.11） | Web App Manifest 全部欄位值（安裝名稱「EnglishContext」、相對路徑、顏色、3 個圖示） | 契約常數 → pg-frontend（建置輸出 `manifest.webmanifest`） | 瀏覽器、QA | AC-34-01～AC-34-05、Q-42、§10.3 |
| `PwaDeployFile`、`PwaDeployFileRole`、`PWA_DEPLOY_FILES`（v0.11） | 部署目錄 8 個檔案的路徑、角色、MIME、圖示尺寸與用途 | 契約常數 → pg-frontend（建置）；圖示 PNG 由**主控**預先產生（Q-45） | 建置程式、`static.yml`、QA | AC-36-07、AC-34-01、AC-34-03、AC-34-05、Q-45、Q-46、§10.2 |
| `PWA_PRECACHE_URLS`、`PWA_CACHE_PREFIX`、`PWA_BUILD_ID_PATTERN`、`PWA_BUILD_ID_META_NAME`、`PwaPageToSwMessage`（v0.11） | 預先快取清單、快取名稱、建置識別碼、頁面 → service worker 訊息 | 契約常數 → pg-frontend（建置輸出 `sw.js`、頁面端註冊） | 瀏覽器、QA | AC-35-01、AC-36-01～AC-36-05、AC-37-05、§10.6、§10.7 |
| `PwaRuntimeState`（`RuntimeState.pwa`）、`PWA_UPDATE_RECHECK_MS`、`PWA_TEXTS`（v0.11） | 安裝按鈕、新版提示的記憶體狀態與畫面文字；不互通說明文字 | pg-frontend | pg-frontend、QA | AC-34-06～AC-34-10、AC-36-03、AC-36-06、AC-37-01～AC-37-04、AC-24-12、§10.5、§10.7～§10.9 |
| `APP_DISPLAY_NAME`、`FROZEN_IDENTIFIERS`（v0.12） | App 顯示名稱「EnglishContext」；不隨改名變動的鍵名、備份格式、匯出檔名前綴、交付檔名、快取前綴 | 契約常數（pg-frontend 實作；ORIGINAL 來源名稱由 pg-content 提供） | pg-frontend、pg-content、QA | AC-38-05、AC-38-10、E-94、Q-49、§11.1 |
| `COLOR_TOKENS`、`SEMANTIC_COLORS`（v0.12） | 品牌／強調／背景／表面／文字色 token；不得更動的語意色 | 契約常數（pg-frontend 實作 CSS） | pg-frontend、QA | AC-38-01～AC-38-04、AC-38-06、AC-34-04、Q-53～Q-55、§11.2 |
| `LAYOUT_TEXTS`（v0.12） | 主控台與首次畫面的文字與格式字串 | 契約常數（pg-frontend 實作） | pg-frontend、QA | AC-39-01～AC-39-08、AC-41-01、AC-41-02、AC-17-01、AC-30-10、§11.4、§11.5 |
| `DashboardRuntimeState`（`RuntimeState.dashboard`，v0.12） | 「資料備份」收合區塊展開狀態（記憶體，不持久化） | pg-frontend | pg-frontend、QA | AC-39-08、AC-24-12、AC-34-07、E-90、E-91、§11.4 DB-6 |

型別數（v0.12）：66 → **67** 個（33 個 `interface`、34 個 `type`）；新增 `DashboardRuntimeState`（interface）。契約常數 31 → **36**（新增 `APP_DISPLAY_NAME`、`FROZEN_IDENTIFIERS`、`COLOR_TOKENS`、`SEMANTIC_COLORS`、`LAYOUT_TEXTS`）。修改：`RuntimeState` 新增 `dashboard`（不持久化）；`PWA_THEME_COLOR`、`PWA_BACKGROUND_COLOR`、`PWA_MANIFEST` 的顏色值。`PersistedData`、`StorageRecord`、`BackupFile`、內容資料檔型別皆不變。

型別數（v0.11）：59 → **66** 個（32 個 `interface`、34 個 `type`）；新增 7 個：`PwaManifestIcon`、`PwaManifest`、`PwaDeployFile`、`PwaRuntimeState`（interface）、`PwaIconPurpose`、`PwaDeployFileRole`、`PwaPageToSwMessage`（type）。契約常數 20 → **31**（新增 `PWA_APP_NAME`、`PWA_THEME_COLOR`、`PWA_BACKGROUND_COLOR`、`PWA_MANIFEST`、`PWA_DEPLOY_FILES`、`PWA_PRECACHE_URLS`、`PWA_CACHE_PREFIX`、`PWA_BUILD_ID_PATTERN`、`PWA_BUILD_ID_META_NAME`、`PWA_UPDATE_RECHECK_MS`、`PWA_TEXTS`）。修改：`RuntimeState` 新增 `pwa`（不持久化）。`PersistedData`、`StorageRecord`、`BackupFile`、內容資料檔型別皆不變。

型別數（v0.9）：與 v0.8 相同 **59** 個（28 個 `interface`、31 個 `type`），型別定義無增減、無欄位變更；契約常數 18 → **20**（新增 `HIDDEN_TAB_IDS`、`LEARNING_PROGRESS_FIELDS`；`NAV_TAB_ORDER` 內容由 6 項改為 4 項）。`TabId` 仍含 `"decoder"`、`"phrasebank"`，`TAB_LABELS`、`RuntimeState.decoder`／`phrasebank` 保留（程式碼保留，R-18 三）。

型別數（v0.8）：`data-schema.ts` 共 **59** 個（28 個 `interface`、31 個 `type`），另有 **18** 個契約常數。v0.8 新增型別 4 個：`TodayLearnedState`（interface，持久化）、`LearnedHistory`（type，持久化）、`EntryMode`、`LearningEventKind`（type，執行期）；新增常數 4 個：`LEARNED_HISTORY_DAYS`、`DASHBOARD_CHART_DAYS`、`TAB_LABELS`、`NAV_TAB_ORDER`；修改：`PersistedData`（+2 必填欄位）、`StorageRecord.schemaVersion`（寫入 2）、`BackupFile`（匯出 2、匯入 1／2）、`RuntimeState`（+`entryMode`、+`learningQuotaNoticeShown`）、`CURRENT_SCHEMA_VERSION`（2）、`SUPPORTED_SCHEMA_VERSIONS`（`[1, 2]`）、`ImportResult.skipped` 註解。以下為 v0.7 以前的紀錄：`data-schema.ts` 共 55 個（27 個 `interface`、28 個 `type`），另有 14 個契約常數。v0.2 未新增型別；`DataSourceEntry` 新增 2 個必填欄位 `copyrightNotice`、`licenseText`（共 16 個欄位）。v0.4 型別與常數數量不變；`BuiltinVocabItem.phoneticSource` 的型別由 `DictFieldSource` 收窄為 `OriginalMarker`（R-13），`DictFieldSource` 仍供 `meaningSource` 使用。v0.5 型別、欄位、常數數量皆不變，只補註解。v0.6 型別數（55）與常數數（14）不變；執行期型別 `ImportErrorCode` 新增一個值 `"write_failed"`（不持久化，`storage-schema.json` 不涉及）。v0.7 型別數（55）與常數數（14）不變；`PartOfSpeech` 新增一個值 `"pref."`，契約常數 `POS_LABELS` 內容隨之新增 `"pref.": "字首"`（只用於內建字庫，不持久化）。

---

## 2. 共通約定

| 代號 | 規則 |
| :--- | :--- |
| C-1 | 字串 UTF-8；「非空」= `trim()` 後長度 ≥ 1；中文用繁體中文（台灣用語） |
| C-2 | **wordKey** = `word.normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase()`。所有「不分大小寫」比對都用 wordKey（AC-03-07、AC-04-06、AC-05-02、AC-05-04、AC-17-03、AC-24-08） |
| C-3 | 本地日期 `YYYY-MM-DD`（裝置本地時區）；時間戳 ISO 8601 |
| C-4 | 資料檔只含 `window.X = <JSON 相容字面值>;`（分檔串接形式見 §3），不含函式、`undefined` |
| C-5 | 原創內容的來源標記固定 `"ORIGINAL"`，畫面顯示「原創」（AC-23-04） |
| C-6 | 所有資料檔在 app 程式之前載入；前端讀全域變數時一律容忍「不存在／型別不符」，以空陣列處理，不得白屏 |
| C-7 | 前端呈現**所有**資料（內建內容、自訂單字、匯入內容）一律以 `textContent` 等純文字方式寫入 DOM（AC-04-09、AC-24-07）；長難句的上色以「每個 segment 一個元素 + class」實作，不得拼接 HTML 字串 |

---

## 3. 資料檔清單

### 3.1 交付資料檔（提供者：pg-content）

| 檔名 | 全域變數 | 型別 | 最少筆數（依 PRD 決議） |
| :--- | :--- | :--- | :--- |
| `src/data/sources.js` | `window.DATA_SOURCE_REGISTRY` | `DataSourceEntry[]` | = 實際使用的外部來源數 + 1（ORIGINAL）；不多不少（V-SRC-01）。v0.2 預期 6 筆：NGSL、TSL、BSL、NAWL、ECDICT、ORIGINAL |
| `src/data/sources.js` | `window.VOCAB_MANIFEST` | `VocabManifest` | 1 個物件 |
| `src/data/sources.js` | `window.PROJECT_LICENSE` | `ProjectLicenseInfo` | 1 個物件 |
| `src/data/vocab-0001.js`、`vocab-0501.js`…（檔名 = `vocab-` + 該檔起始排名 4 位數） | `window.MASTER_VOCAB_DATABASE` | `BuiltinVocabItem[]` | 合計恰好 `N_G` 筆（紀錄值 5,620）；排名 1～`N_O`（1,000）、1～`N_B`（2,809）皆完整（Q-03、Q-29、Q-30） |
| `src/data/templates.js` | `window.DOMAIN_TEMPLATES` | `DomainTemplate[]` | 恰好 3 個範本，各恰好 10 字（Q-11、AC-05-02、AC-05-03） |
| `src/data/part5.js` | `window.PART5_QUESTION_BANK` | `Part5Question[]` | ≥ 200 題，4 題型各 ≥ 50（Q-03、AC-10-01） |
| `src/data/decoder.js` | `window.DECODER_SENTENCES` | `DecoderSentence[]` | ≥ 50 句（Q-03、AC-12-03） |
| `src/data/decoder.js` | `window.READING_STRATEGIES` | `ReadingStrategy[]` | 恰好 3 主題（AC-14-01） |
| `src/data/phrasebank.js` | `window.ACADEMIC_PHRASEBANK` | `PhraseTemplate[]` | ≥ 100 則，4 類各 ≥ 25（Q-03、AC-15-02） |

（v0.9）`decoder.js`、`phrasebank.js` 的畫面入口隱藏（PRD R-18 三），但**檔案、全域變數、格式、最少筆數與驗證規則（V-DEC、V-RS、V-PH）全部不變**，照常交付並打包進 `.html`（AC-20-04「交付檔原始碼仍含長難句 50 句、閱讀策略與句型 100 則」、AC-23-04 原創標示仍驗收）。pg-content 不需為 v0.9 修改這兩個檔案。

（v0.11）PWA 不新增資料檔或 `window` 全域變數，本表不變；manifest、`sw.js`、圖示屬建置輸出與主控預產資產（§10.2），不屬 `src/data/`。

（v0.12）不新增資料檔、全域變數或欄位，最少筆數不變。**唯一的資料值修改**：`sources.js` 中 `code = "ORIGINAL"` 那筆的 `fullName` 由 `"English Master Track 原創內容"` 改為 `"EnglishContext 原創內容"`（Q-49、AC-38-10 (1)；§4.3、DS-19）；其他欄位（含 `name` = `"原創"`）不變。`src/data/` 任何字串（畫面會顯示者）不得含「English Master Track」（不分大小寫）。

**字庫分檔規則**：每檔涵蓋一段連續排名（每檔筆數由 SD 拆任務時決定，建議 ≤ 500），寫法固定為
`window.MASTER_VOCAB_DATABASE = (window.MASTER_VOCAB_DATABASE || []).concat([ ... ]);`
載入順序不影響結果；前端載入後一律依 `rank` 遞增排序再使用。

### 3.2 內容任務的唯讀輸入（`sources/`，非交付物）

`sources/` 位於專案根目錄（不是 `src/`），由人類／主控放置；**pg-content 只能讀、不能寫**，也不得打包進 `.html`。SD 拆任務時須把下列檔案列為對應 CT 任務的輸入。

| 檔案 | 內容 | 表頭／欄位 | 資料列數（主控實測） | 官網字數 | 用途 | 狀態 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `sources/wordlists/NGSL_12_stats.csv` | NGSL 1.2 | `Lemma,SFI Rank,SFI,Adjusted Frequency per Million (U)` | 2,809 | 2,809 | 排名 1～`N_B`；依 `SFI Rank` 遞增（第 1 名 the） | 已到位 |
| `sources/wordlists/TSL_12_stats.csv` | TSL 1.2 | `Word,TSL Rank,SFI,U` | 1,250 | 1,250 | R-2 區段；依 `TSL Rank` 遞增 | 已到位 |
| `sources/wordlists/BSL_120_stats.csv` | BSL 1.2 | `Word,BSL Rank,Band,SFI,U,...`（表頭與資料列帶多餘空欄） | 1,744 | 1,700 | R-3 區段；依 `BSL Rank` 遞增 | 已到位；筆數與官網不同，**以檔案實際筆數為準**；差異原因無法從檔案內容判定（CT-01，FB-20 已結案） |
| `sources/wordlists/NAWL_12_lemmatized_for_teaching.csv` | NAWL 1.2 | 無表頭；第 1 欄為詞頭，其後為詞形變化 | 959 | 957 | R-4 區段；**檔案無排名欄，依檔案列順序（目前為字母序）** | 已到位；筆數與官網不同，同上（FB-20 已結案） |
| `sources/wordlists/NGSL_12_lemmatized_for_teaching.csv`、`TSL_12_lemmatized_for_teaching.csv`、`BSL_120_lemmatized_for_teaching.csv` | 詞形變化表 | 第 1 欄詞頭，其後為變化形；含 `##` 註解行 | — | — | 僅供參考（例如撰寫例句時選用詞形）；**不參與排名與去重**（R-7） | 已到位 |
| `sources/ecdict/ecdict_subset.csv` | ECDICT 子集（**簡體原檔**） | 與 ECDICT 原檔相同 13 欄：`word,phonetic,definition,translation,pos,collins,oxford,tag,bnc,frq,exchange,detail,audio`；UTF-8、含表頭；欄位值原樣保留 | 5,616（`phonetic` 為空 65 列；`translation` 無空值） | ECDICT 全庫約 76 萬詞條 | **V-VOC-09 的比對依據**（`meaningSource` = `"ECDICT"` 者的 wordKey 必須在此檔）；M-3 遇到需看上下文的用詞時回查原文。**不作為釋義撰寫素材**（素材用 `_zhtw`） | 已到位 |
| `sources/ecdict/ecdict_subset_zhtw.csv` | ECDICT 子集（**繁體台灣用語版**） | 同上 13 欄、同列序；只有 `translation` 欄經處理（OpenCC 1.4.2 `s2twp` → `tw_terms.tsv` 取代），其餘欄位與簡體原檔相同 | 5,616（`translation` 有變動 5,295 列） | — | **pg-content 撰寫釋義（`meaning`）與詞性（`pos`）的素材**（M-1～M-7） | 已到位（v0.4 新增） |
| `sources/ecdict/tw_terms.tsv` | 補充對照表（大陸用詞 → 台灣用語，只收不必看上下文的詞） | Tab 分隔 2 欄（來源、取代）；`#` 開頭為註解行；長詞在前 | 7（不含註解） | — | 產出 `_zhtw` 的第二段處理；V-VOC-15 的檢查依據 | 已到位（v0.4 新增） |
| `sources/ecdict/ecdict_subset_missing.txt` | ECDICT 查無的 wordKey 清單 | 每行 1 個 wordKey，UTF-8 | 4（résumé、café、entrée、unauthorize） | — | 這些字的釋義、詞性由 pg-content 撰寫，`meaningSource` 標 `"ORIGINAL"`（E-37） | 已到位 |
| `sources/ecdict/LICENSE` | ECDICT MIT LICENSE 原文 | 原文照錄 | — | — | `DataSourceEntry.copyrightNotice`、`licenseText` 的依據（V-SRC-05） | 已到位 |
| `sources/ecdict/SOURCE.txt` | 下載網址、commit SHA `ab22ad36302cafc6349a050e2b60894855208055`、下載日期 2026-10-30、抽取與轉換紀錄 | 純文字 | — | — | `DataSourceEntry.version` = `"master@ab22ad3"` 的依據 | 已到位 |

**ECDICT 子集的產出方式（前置作業，已完成）**

| 項目 | 規定 |
| :--- | :--- |
| 執行者 | 主控，需連網；**不是** pg-content（無連網、不可寫 `sources/`、無法執行 OpenCC） |
| 執行狀態 | **已完成**（主控，2026-10-30）。SD 不需再列前置任務，只需把上表檔案列為字庫 CT 任務的輸入 |
| 輸入 | ECDICT GitHub `master`（commit `ab22ad3`）的 `ecdict.csv`（全庫）＋ 依 §4.1 R-1～R-4 與 C-2 算出的 `N_G` = 5,620 個 wordKey |
| 步驟 1：抽取 | 對每個 wordKey：先找 `word` 完全等於 wordKey 的列；沒有則找 `word.toLowerCase()` 等於 wordKey 的第一列；仍沒有則寫入 `missing.txt`。每個 wordKey 至多 1 列；欄位值原樣保留 → `ecdict_subset.csv` |
| 步驟 2：轉繁 | 複製 `ecdict_subset.csv`，只對 `translation` 欄執行 OpenCC 1.4.2（Python 套件 `opencc`，Apache License 2.0）設定 `s2twp`（簡體 → 繁體台灣用語，含詞彙轉換） |
| 步驟 3：補充用語 | 對步驟 2 結果的 `translation` 欄依 `tw_terms.tsv` 由上而下取代（長詞在前）→ `ecdict_subset_zhtw.csv`。需看上下文的詞刻意不取代，交由 pg-content 依 M-3 處理 |
| 版本紀錄 | `SOURCE.txt` 已記錄網址、commit SHA、下載日期、轉換工具與取代次數；`DataSourceEntry.version` = `"master@ab22ad3"` |
| 交付檢查（主控實測） | 子集 5,616 列 + missing 4 行 = 5,620 = `N_G`；子集 wordKey 不重複；`phonetic` 為空 65 列、`translation` 為空 0 列 |

**ECDICT 素材的讀取與釋義撰寫規則（給 pg-content，v0.4 新增；依 PRD R-13、AC-23-02、AC-23-03、E-37）**

| 編號 | 規則 |
| :--- | :--- |
| M-1 | CSV 解析須支援 RFC 4180 雙引號欄位（欄內含 `,`、以 `""` 跳脫的引號）；`translation`、`definition` 的多個義項以**字面兩字元 `\n`**（反斜線 + n）分隔，不是真正換行。讀檔仍依 V-IN-01～03 |
| M-2 | **釋義素材**一律取 `ecdict_subset_zhtw.csv` 的 `translation`；精簡成卡片短釋義（`BuiltinVocabItem.meaning` 註解：建議 ≤ 30 字、全形「；」分隔），可刪減、合併、調整順序與標點，不得新增 ECDICT 沒有的義項（否則屬原創，見 M-6）。`[計]`、`[醫]` 等領域標記不得原樣保留在 `meaning`（可改寫為「（電腦）」等括註）。（v0.6，CT-09）**ECDICT 原檔錯字**（例：「決竅」應為「訣竅」、「遭透」應為「糟透」）：依原意更正為正確字，視為同一義項（屬精簡改寫，不是新增義項），`meaningSource` 維持 `"ECDICT"`；交付紀錄列出更正處（wordKey、原文、更正後）。QA 依 V-VOC-18 (2) 比對時，錯字更正視為「找得到對應」 |
| M-3 | **需看上下文的用詞**：OpenCC 與 `tw_terms.tsv` 無法正確處理，精簡時必須依該字英文詞義改成台灣用法。已知清單與方向見下表；遇到清單外的大陸用語同樣處理，並記入交付紀錄。**注意**：`s2twp` 對部分詞是「過度轉換」（`_zhtw` 已被改錯），必須回查簡體原檔 `ecdict_subset.csv` 判斷原詞 |
| M-4 | **詞性**：ECDICT 的 `pos` 欄多為空，詞性以 `translation` 各義項開頭的縮寫為準，對應：`n.`→`n.`、`v.`／`vt.`／`vi.`→`v.`、`a.`／`adj.`→`adj.`、`ad.`／`adv.`→`adv.`、`prep.`→`prep.`、`conj.`→`conj.`、`pron.`→`pron.`、`art.`→`art.`、`num.`→`num.`、`aux.`→`aux.`、`int.`／`interj.`→`int.`；其他縮寫或無標示時依英文詞義判斷。`pos` 只保留精簡後 `meaning` 實際涵蓋的詞性。（v0.7）`pref.`（字首）→ `pref.`，但只能依 M-8 的位置與條件使用 |
| M-5 | **音標**：一律由 pg-content 撰寫美式 IPA，`phoneticSource` = `"ORIGINAL"`（含 ECDICT 無音標的 65 筆、查無的 4 筆）。ECDICT `phonetic` 欄為英式舊式標註，**不得照抄或只加斜線**（V-VOC-16） |
| M-6 | **`meaningSource`**：wordKey 在 `ecdict_subset.csv` 且釋義依 M-2 由 ECDICT `translation` 精簡而來 → `"ECDICT"`；列於 `missing.txt` 的 4 筆 → `"ORIGINAL"`。若某字因 ECDICT 釋義不適用而整段改寫（未取用其義項），須標 `"ORIGINAL"` 並在交付紀錄逐筆列出 wordKey 與原因 |
| M-7 | 交付紀錄須附 V-VOC-17 的「上下文用詞清單」，以及 `meaningSource` = `"ORIGINAL"` 的完整 wordKey 清單（missing 的 4 筆 + 依 M-6 改寫者；v0.6 起已知會有後者，見 N-3） |
| M-8 | （v0.6，CT-13；v0.7 依人類決議 FB-25 改用 `"pref."`）**字首字**（BSL／NAWL 收錄的 pre、non、anti、mid、sub、ex、multi、inter 等）：統一寫法如下。(1) 該字**有獨立用法**（ECDICT 列有 n.／v.／adj.／prep. 等義項，如 ex「前妻；前夫」n.、sub「潛艇；替補」n.、mid「在…中間」prep.、anti「反對者」n.／「反對」prep.、inter「埋葬」v.）→ `pos` 先依獨立用法照 M-4 填寫；字首義若要保留，必須是 `meaning` 的**最後一段**（全形「；」分隔）並以「（字首）」開頭，此時 `pos` **最後**加上 `"pref."`，例 ex：`meaning`「前配偶；…；（字首）前任的」、`pos` `["n.","prep.","pref."]`。不保留字首義時 `pos` 不得含 `"pref."`。(2) **只有字首義**（如 non、multi）→ `pos` 必須**恰為** `["pref."]`（畫面「pref. 字首」），`meaning` 仍必須以「（字首）」開頭且只含字首義，例 non：「（字首）非；不；無」、multi：「（字首）多；多重」。(3) 不得用 `adj.`、`prep.`、`adv.`、`phr.` 表示字首義（v0.6 的 `["adj."]` 寫法廢止）。(4) `example`、`collocation` 以含該字首的常見複合字示範（如 `non-profit organization`）。(5) 交付紀錄列出所有適用本條的 wordKey 與採用的寫法（(1) 或 (2)）；已交付批次中不符本條者，由 pg-content 在後續批次的交付中一併修正並列出 |

M-3 需看上下文的用詞（主控於 `SOURCE.txt` 列出 6 個；「方向」欄為 SA 比對兩檔實際內容後補充）：

| 詞（`_zhtw` 中可能出現的寫法） | `s2twp` 的行為 | 台灣用法（依英文詞義） | 例 |
| :--- | :--- | :--- | :--- |
| 質量 | 未轉換 | 指 mass（物理）保留「質量」；指 quality 改「品質」 | quality 的 `_zhtw` 為「品質, 特性, 才能, 質量」→ 刪去或改為「品質」；mass 保留「質量」 |
| 程式（原簡體「程序」） | **過度轉換**：簡體原檔「程序」60 列，`_zhtw` 只剩 4 列，其餘被改為「程式」 | **只有**指電腦程式（program、software）時用「程式」；**電腦語境以外一律保留「程序」**（procedure、process、法律程序、議事程序、步驟、手續） | procedure 的 `_zhtw` 為「程式, 過程, 手續」→ 應為「程序；手續」 |
| 檔案、文件（原簡體「文件」「文档」） | **過度轉換**：簡體「文件」→「檔案」、「文档」→「文件」 | 指紙本或正式文書（document、paper）用「文件」；指電腦檔案（file）用「檔案」 | document 的 `_zhtw` 為「檔案, 公文, 文件」→ 應為「文件；公文」；file 的電腦義用「檔案」 |
| 水平 | 未轉換 | 指水平面、水平的（horizontal）保留；指程度、標準（level、standard）改「水準」或「程度」 | level：「水平；水準」視義項取捨 |
| 註冊 | 未轉換 | 公司、商標、網站帳號等保留「註冊」；登記入住、報到、選課等依情境改「登記」「報到」「選課」 | register、enrollment 依義項取捨 |
| 地鐵 | 未轉換 | 台灣捷運系統用「捷運」；泛指他國地下鐵可用「地鐵」 | subway：「地鐵；捷運」 |

M-3 補充：`s2twp` **過度轉換**清單（v0.6，CT-03 FB-02、CT-09；pg-content 前幾批實際發現）。`s2twp` 的詞彙轉換以**電腦／資訊用語**為主，會把一般詞也改成資訊用語。下表各詞在 `_zhtw` 出現時，必須回查簡體原檔 `ecdict_subset.csv` 的原詞，依英文詞義決定用法。本表與上表合稱「M-3 清單」，是後續批次撰寫與 QA 檢查（V-VOC-17、V-VOC-18）的依據；**清單外**的過度轉換同樣依「非電腦語境還原原詞的繁體字形」處理，並記入交付紀錄。

| 簡體原詞 | `_zhtw` 被改成 | 還原為原詞（繁體）的情況 | 保留轉換結果的情況 | 例 |
| :--- | :--- | :--- | :--- | :--- |
| 支持 | 支援 | 擁護、贊成、撐住、扶持（support a candidate／an idea、support the roof） | 技術支援、後勤支援、軟硬體支援（technical support、the device supports…） | support：「支持；擁護；支援」視義項取捨 |
| 类型 | 型別 | 一般的種類、類別（type、category、genre）→「類型」 | 程式語言的資料型別（data type） | type：「類型；種類」 |
| 实例 | 例項 | 例子、實際案例（instance、example、case）→「實例」 | **不保留**：「例項」非台灣用語。程式語境用「實例」或「執行個體」 | instance：「實例；例子」 |
| 触摸 | 觸控 | 用手碰觸（touch、feel）→「觸摸」 | 觸控螢幕、觸控操作（touchscreen、touch panel） | touch：「觸摸；碰」 |
| 局部 | 區域性 | 部分的、局部的（partial、local injury、localized）→「局部」 | 指地理區域的「區域性」（regional）可用；程式的區域變數用「區域」 | local：「當地的；局部的」 |
| 保存 | 儲存 | 保留、維護、防腐（preserve、conserve、keep）→「保存」 | 儲存檔案、儲存資料（save、store data） | preserve：「保存；維護」 |
| 社区 | 社群 | 住宅區、地方社會（community、neighborhood）→「社區」 | 網路社群、同好社群（online community） | community：「社區；社會；共同體」 |
| 连接 | 連線 | 一般語境的接合、連結、銜接（connect、link、joint）→「連接」（CT-03、CT-09 皆回報） | 只有網路連線、通訊連線（network connection） | connect：「連接；連結」 |
| 菜单 | 選單 | 餐廳、餐飲的 menu →「菜單」（CT-09） | 只有電腦語境（軟體選單、下拉選單） | menu：「菜單；（電腦）選單」 |
| 循环 | 迴圈 | 周而復始、流通（cycle、circulation、recycle）→「循環」 | 程式迴圈（loop 的程式義） | cycle：「循環；週期」；circulation：「循環；流通」 |
| 程序 | 程式 | 見上表「程式」列：電腦語境以外一律「程序」 | 電腦程式 | procedure：「程序；手續」 |
| 身份 | 身分 | **不需還原**：「身分」是台灣教育部標準用字，`s2twp` 結果正確 | 一律用「身分」（字庫內統一；QA 不把「身分」判為錯誤） | identity：「身分；同一性」 |

判斷原則：(1) 英文詞義屬電腦／資訊語境 → 可保留轉換結果（「例項」除外）；(2) 其他語境 → 還原為簡體原詞的繁體字形；(3) 同一義項不同時列兩種寫法（例：不寫「支持；支援」作為同一義項）。

**讀取字表檔的注意事項（給 pg-content）**：見 §7.0 V-IN-01～V-IN-07。

---

## 4. 內建字庫規則

### 4.1 頻率排名規則（Q-03、R-05；SA 定案：排名 `N_B` 之後採 TSL → BSL → NAWL）

| 規則 | 內容 |
| :--- | :--- |
| R-1 | 排名 1～`N_B`：NGSL 全部字，依 `NGSL_12_stats.csv` 的 `SFI Rank` 遞增（同名次依檔案列順序）；同一 wordKey 只保留第一次出現；功能詞不排除（Q-30、AC-03-09） |
| R-2 | 接著：已確認授權的 TSL 中、wordKey 未出現在 NGSL 的字，依 `TSL_12_stats.csv` 的 `TSL Rank` 遞增 |
| R-3 | 接著：已確認授權的 BSL 中、wordKey 未出現在 NGSL、TSL 的字，依 `BSL_120_stats.csv` 的 `BSL Rank` 遞增 |
| R-4 | 接著：NAWL 中、wordKey 未出現在前述字表的字，依 `NAWL_12_lemmatized_for_teaching.csv` 的檔案列順序（檔案無排名欄，目前為字母序，見 FB-19） |
| R-5 | 未確認授權的字表整份略過（不參與排名、不出現在 `sources`），後面的區段往前遞補（AC-23-05、E-36） |
| R-6 | `sources` 列出該字出現的**全部**已確認字表，依 NGSL → TSL → BSL → NAWL 排序（例：某字同在 NGSL 與 NAWL → `["NGSL","NAWL"]`，排名仍在 NGSL 區段）（AC-23-01） |
| R-7 | 跨字表比對只看 wordKey 完全相同，不做詞形還原或英美拼法合併（`analyse` 與 `analyze` 視為不同字） |
| R-8 | `N_O` = 1,000 固定；`N_B` = `sources` 含 `"NGSL"` 的筆數；`N_G` = 字庫總筆數。前端以實際資料計算這兩個值（V-VOC-12） |

### 4.2 字量紀錄（AC-03-06 的對照依據）

| 符號 | 定義 | 紀錄值 | 狀態 |
| :--- | :--- | :--- | :--- |
| `N_O` | NGSL `SFI Rank` 1～1000 | **1,000** | 定案（Q-29） |
| `N_B` | NGSL 去重字數 | **2,809** | 實際值（主控 2026-10-30 以 C-2 wordKey 依 R-1～R-4 實算）；pg-content 仍依 N-1 驗證 |
| `N_G` | NGSL + TSL + BSL + NAWL 去重字數 | **5,620** | 實際值（同上）；pg-content 仍依 N-1 驗證 |

**算法**（主控 2026-10-29 以小寫詞頭試算；2026-10-30 改以 C-2 wordKey 依 R-1～R-4 實算，各段新增數相同；依 NGSL → TSL → BSL → NAWL 順序加入）：

| 步驟 | 字表輸入筆數 | 與先前字表重疊 | 新增 | 累計 | 排名區段（預期） |
| :--- | :--- | :--- | :--- | :--- | :--- |
| NGSL | 2,809 | — | 2,809 | 2,809（= `N_B`） | 1～2,809 |
| + TSL | 1,250 | 0（與 NGSL 無重疊） | 1,250 | 4,059 | 2,810～4,059 |
| + BSL | 1,744 | 575（皆與 TSL 重疊） | 1,169 | 5,228 | 4,060～5,228 |
| + NAWL | 959 | 567（與前三者） | 392 | **5,620**（= `N_G`） | 5,229～5,620 |

| 規則 | 內容 |
| :--- | :--- |
| N-1 | 以上數字**以 `sources/wordlists` 檔案為準**。pg-content 產出字庫時必須依 C-2 wordKey（含 NFC、空白壓縮，不只小寫）與 V-IN-01～07 重新計算；結果與本表不一致時，不得自行改契約，須在交付紀錄回報實際值與差異原因，由 SA 修訂契約 |
| N-2 | `VOCAB_MANIFEST.nB`、`nG`、`segments` 必須等於驗證後的實際值；QA 驗 AC-03-06 以核准版本本表數字為準（若經 N-1 回報修訂，以修訂後版本為準） |
| N-3 | 預期 `includedItemCount`（R-6 全來源列出）：NGSL 2,809、TSL 1,250、BSL 1,744、NAWL 959；ECDICT = `meaningSource` = `"ECDICT"` 的筆數，上限 5,616（= 子集列數；依 M-6 改標原創者扣除）。`phoneticSource` 不計入（恆為 `"ORIGINAL"`）。**（v0.6，CT-10）** ECDICT 子集中有不少 TSL 多益高頻字缺少核心義（多益常用義），各批依 M-6 整段改寫並標 `"ORIGINAL"`，因此 ECDICT 筆數**預期會少於 5,616**，屬正常情況、不視為異常、不需修訂本契約；ECDICT 的 `includedItemCount` 最終實數以 **CT-23** 的計算結果為準（V-SRC-03），QA 以 CT-23 結果與字庫實際 `meaningSource` 計數比對，不以 5,616 比對。改標原創的 wordKey 仍須依 M-6、M-7 逐筆列出原因 |
| N-4 | **知會人類**：NAWL 959 字中有 567 字已在 NGSL／TSL／BSL，只新增 392 字；綠色字量 5,620 中學術字表的獨有貢獻僅約 7%（FB-18） |

### 4.3 來源字表登錄與授權確認紀錄（AC-23-05、R-05、R-06）

本表內容為主控於 2026-10-29 連網查證之官方頁面原文（確認人：主控（Claude）代人類查證）。SA 未親自連網，照錄主控提供的資料。

| 代碼 | 全名 | 版本 | 官網字數 | 原作者（官網原文） | 授權（官網原文） | 確認狀態 | 確認日期 | 確認人 | 原始出處網址 | 可收錄 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| NGSL | New General Service List | 1.2（2023-04） | 2,809 | Browne, C., Culligan, B., Phillips, J. | CC BY-SA 4.0 International | `confirmed` | 2026-10-29 | 主控（Claude）代人類查證 | https://www.newgeneralservicelist.com/new-general-service-list | 是 |
| NAWL | New Academic Word List | 1.2 | 957 | Browne, C., Culligan, B., Phillips, J. | CC BY-SA 4.0 International | `confirmed` | 2026-10-29 | 主控（Claude）代人類查證 | https://www.newgeneralservicelist.com/new-academic-word-list | 是 |
| TSL | TOEIC Service List | 1.2 | 1,250 | Browne, C., Culligan, B. | CC BY-SA 4.0 International | `confirmed` | 2026-10-29 | 主控（Claude）代人類查證 | https://www.newgeneralservicelist.com/toeic-service-list | 是 |
| BSL | Business Service List | 1.2 | 1,700 | Browne, C., Culligan, B. | CC BY-SA 4.0 International | `confirmed` | 2026-10-29 | 主控（Claude）代人類查證 | https://www.newgeneralservicelist.com/business-service-list | 是 |
| ECDICT | ECDICT（英漢辭典資料庫） | `master@ab22ad3`（commit `ab22ad36302cafc6349a050e2b60894855208055`，2026-10-24；下載 2026-10-30） | 約 76 萬詞條 | Linwei（skywind3000） | MIT（LICENSE 原文 "Copyright (c) 2025 Linwei"） | `confirmed` | 2026-10-29 | 主控（Claude）代人類查證 | https://github.com/skywind3000/ECDICT | 是（需保留 MIT 聲明：`copyrightNotice`、`licenseText`） |
| ORIGINAL | EnglishContext 原創內容（v0.12 由「English Master Track 原創內容」改名，Q-49、AC-38-10） | 同 `VOCAB_MANIFEST.dataVersion` | — | JimmyLin | CC BY-SA 4.0 | `confirmed` | 2026-10-29 | JimmyLin（PRD Q-31 決議） | — | 是 |

`DataSourceEntry` 對應值：`licenseName` 一律用契約值 `"CC BY-SA 4.0"`／`"MIT"`（「International」寫入 `confirmation.note`）；`licenseUrl` CC BY-SA 為 `https://creativecommons.org/licenses/by-sa/4.0/`，ECDICT 為 `https://github.com/skywind3000/ECDICT/blob/master/LICENSE`；`homepageUrl`、`originUrl`、`confirmation.evidenceUrl` 皆填上表「原始出處網址」；`version` 字表填 `"1.2"`（BSL 檔名雖為 `BSL_120`，官網版本為 1.2），ECDICT 填 `"master@ab22ad3"`；`originalItemCount` 填輸入檔實際數（見 N-3 與 `data-schema.ts`），非官網字數。

使用規則：

| 規則 | 內容 |
| :--- | :--- |
| L-1 | 只有本表「可收錄 = 是」的代碼能出現在 `BuiltinVocabItem.sources`、`meaningSource` 與 `DATA_SOURCE_REGISTRY`；`phoneticSource` 恆為 `"ORIGINAL"`（R-13） |
| L-2 | 狀態變更（如某來源改為 `rejected`）必須先修訂本表（契約版本遞增、送人類核准），pg-content 才能據以收錄或移除；`N_G` 隨之重算並回填 §4.2。v0.2 已依此規則把 TSL、BSL、ECDICT 改為 `confirmed` |
| L-5 | MIT 來源（ECDICT）的 `copyrightNotice`、`licenseText` 必須原文照錄，「資料來源與授權」頁以純文字顯示（可摺疊）；不得省略（R-06(2)） |
| L-3 | `DATA_SOURCE_REGISTRY` 的每筆資料必須與本表一致（名稱、版本、授權、網址、確認日期、確認人） |
| L-4 | 衍生的單字資料以 CC BY-SA 4.0 釋出，署名列原字表作者與修改者 JimmyLin。`modifications` 與 AC-23-02 一致：四份字表至少列出「合併、去重、重新編排頻率排名、補充欄位」（v0.4 未變）；ECDICT **恰為** `["簡體轉繁體台灣用語", "精簡釋義"]`；ORIGINAL 為 `[]`。**音標改寫不列入 ECDICT 的 `modifications`**（音標屬原創，不屬 ECDICT）；AC-23-02 要求的說明「音標改寫為美式 IPA，標為原創，不屬 ECDICT」由 pg-frontend 在「資料來源與授權」頁 ECDICT 區塊以固定文字顯示（R-06、R-13） |
| L-6 | （v0.4）卡片出處顯示（AC-23-01，pg-frontend）：字表出處依 `sources` 逐一顯示「`name` `version`（`licenseName`）」，例「單字來源：NGSL 1.2（CC BY-SA 4.0）」；音標、釋義**分開**依 `phoneticSource`、`meaningSource` 顯示：`"ECDICT"` →「ECDICT（MIT，已修改）」（= `name` +「（」+ `licenseName` +「，已修改）」），`"ORIGINAL"` →「原創」，例「音標：原創；釋義：ECDICT（MIT，已修改）」。顯示文字必須由該筆資料的來源標記推導，不得寫死同一段文字（NFR-3「卡片出處與欄位來源標記不一致數 = 0」） |

---

## 5. localStorage

### 5.1 鍵名表

| 鍵名 | 值 | 寫入者 | 說明 |
| :--- | :--- | :--- | :--- |
| `englishMasterTrack:state` | `JSON.stringify(StorageRecord)` | pg-frontend | 唯一主狀態；Schema = `storage-schema.json` 根結構（schemaVersion 2）。（v0.8）**本鍵是否存在 = 首次判定依據**（§5.5 FS-1，AC-25-01）；首次畫面期間不寫入 |
| `englishMasterTrack:unreadable` | 讀取失敗時的原始字串 | pg-frontend | AC-18-05 重設前保存，供人工救回；寫入失敗不報錯，但主鍵不得被覆蓋（§5.3 RS-1～RS-4）；下次讀取失敗時覆蓋 |

鍵數：2（v0.8 不變；今日已學紀錄與歷史放在主鍵的 `data` 內，不另開鍵，確保整筆一次寫入）。內建內容（字庫、題庫、例句、句型）**不寫入** localStorage（R-04）；不存音訊（AC-21-03）；不存語音實例、DOM、計時器等不可序列化物件。
加前綴的原因：Chrome 以 `file://` 開啟的本機 HTML 可能共用同一個 storage origin。
（v0.11）PWA **不新增任何鍵、不寫入任何資料**：安裝按鈕、新版提示、更新檢查時間只在記憶體（`RuntimeState.pwa`）；https 版與 `file://` 版的鍵名、欄位集合、`schemaVersion` 2 完全相同（AC-36-04、AC-37-06、§10.10 PV-1）。同一 `<帳號>.github.io` 網域下的其他專案也用同一個來源，本系統鍵名已有 `englishMasterTrack:` 前綴，不讀寫他人資料（E-80）。
（v0.12）版面與視覺**不新增任何鍵、不寫入任何資料**：「資料備份」展開狀態只在記憶體（`RuntimeState.dashboard`，§11.4 DB-6）。App 改名為「EnglishContext」**不改鍵名**（`FROZEN_IDENTIFIERS`，§11.1 NM-5；AC-38-10 (2)、E-94）。

### 5.2 預設值（首次使用、重設時，AC-18-02；v0.9 起亦為切換難易度初始化時 `LEARNING_PROGRESS_FIELDS` 6 欄的值，§5.7）

| 欄位 | 預設 |
| :--- | :--- |
| `goal` | `draftScore` 725、`appliedScore` 725、`appliedColor` `"green"`、`effectiveColor` `"green"`（= `SCORE_DEFAULT`；v0.10 依 Q-39 由 600 改為 725，只影響新產生的預設值，已存的分數不轉換，GS-4） |
| `customVocab`、`masteredWordKeys` | `[]` |
| `vocabQuiz` | `answered` 0、`correct` 0 |
| `part5` | `currentIndex` 0、`lockedSelection` null、`phase` `"question"`、其餘計數 0 |
| `streak` | `days` 0、`lastActiveDate` null |
| `sttNoticeAcknowledged` | false |
| `todayLearned`（v0.8） | `{ "date": null, "wordKeys": [] }` |
| `learnedHistory`（v0.8） | `{}` |

（v0.8）首次使用時，預設值只存在記憶體；按「開始學習」或備份還原成功前不寫入 localStorage（§5.5 FS-2）。

### 5.3 讀取、寫入與版本遷移

| 時機 | 規則 | 對應 AC |
| :--- | :--- | :--- |
| 啟動：存取拋例外 | `storageStatus = "unavailable"`，以預設值啟動，顯示「進度將無法保存」，本次工作階段不再嘗試寫入。（v0.8）`entryMode = "firstRun"`，每次開啟都顯示首次畫面（FS-6） | AC-18-03、AC-25-08 |
| 啟動：鍵不存在 | 以預設值啟動，不顯示錯誤。（v0.8）`entryMode = "firstRun"`，顯示首次畫面；不寫入主鍵（FS-1、FS-2） | AC-18-02、AC-25-01 |
| 啟動：JSON 解析失敗、不符 Schema、違反 V-ST-03（**完整**檢查，不適用 §6.2 的匯入例外） | 依 RS-1～RS-4 先保存原字串再重設主鍵，以預設值啟動，提示「資料讀取失敗，已重設」，不白屏。（v0.8）`entryMode = "main"`，不顯示首次畫面（FS-1）；`todayLearned`、`learnedHistory` 的問題**不屬於**本列，依 RD-1 只重設該欄 | AC-18-05、AC-25-09 |
| 啟動：`schemaVersion` 缺失、非整數、不在 `SUPPORTED_SCHEMA_VERSIONS`（`[1, 2]`，含大於 2） | 同上（視為無法讀取；原字串保留在 `unreadable` 鍵） | AC-18-05 |
| 啟動：`schemaVersion` = 1 | 依 MG-1～MG-4 遷移到 2，完整驗證後寫回；不顯示任何錯誤、不顯示首次畫面 | AC-30-12、E-51 |
| 啟動：`schemaVersion` = 2 | 先依 RD-1 處理兩個新欄位，再以根結構與完整 V-ST-03 驗證 | AC-30-13、E-52 |
| 啟動：成功讀取後 | 以 `appliedScore` 重算 `appliedColor`、`effectiveColor` 覆蓋；`part5.currentIndex` 超出題庫時依 V-ST-05 重設；（v0.8）以啟動當下的本地日期為今天，依 V-ST-09～V-ST-11 正規化 `todayLearned`、`learnedHistory` | AC-01-04、AC-11-05、AC-30-09、AC-30-13 |
| 寫入 | 任何 `PersistedData` 變更後，整筆 `StorageRecord` 以**一次** `setItem` 寫入（不分鍵、不部分寫入） | AC-18-01、AC-18-06 |
| 寫入：容量不足 | 新增自訂單字：記憶體回滾、不新增、提示「儲存空間不足」；其他寫入：保留記憶體狀態並提示，下次寫入再試。（v0.8）學習紀錄寫入（LR-7）：畫面照常計數，提示「儲存空間不足」**同一工作階段只一次**（`RuntimeState.learningQuotaNoticeShown`）。（v0.9）**例外**：切換難易度初始化（§5.7）寫入拋出任何例外 → 整個不套用、記憶體不變，提示「儲存空間不足，未套用」（CI-7）。原有 localStorage 值因 `setItem` 失敗而不變。「容量不足」的判定見 IM-7 | AC-18-04、AC-30-14、AC-32-11 |

**讀取失敗時的重設時機**（v0.6，FE-07 #1；適用上表「JSON 解析失敗…」「`schemaVersion` 缺失…」兩列，以及遷移後驗證失敗）：

| 編號 | 規則 | 對應 AC |
| :--- | :--- | :--- |
| RS-1 | **先保存、後覆蓋**：先把主鍵的原字串以一次 `setItem` 寫入 `englishMasterTrack:unreadable`（原值非字串時以 `String(值)` 保存），**寫入成功後**才可用預設值的 `StorageRecord` 覆蓋主鍵 `englishMasterTrack:state` | AC-18-05 |
| RS-2 | `unreadable` 鍵寫入失敗（任何例外，含容量不足）→ 本次啟動**不得主動覆寫主鍵**，主鍵保留原值供人工救回；不另外顯示錯誤，畫面行為與成功時相同（以預設值啟動、提示「資料讀取失敗，已重設」） | AC-18-05 |
| RS-3 | RS-1 的主鍵覆蓋可立即執行，也可延到第一次 `PersistedData` 寫入時（遷移後驗證失敗的路徑可不立即覆蓋）；主鍵覆蓋本身失敗時依「寫入」規則處理，不重試保存 `unreadable` | AC-18-05 |
| RS-4 | **限制（知會）**：RS-2 的保留只到本工作階段第一次 `PersistedData` 寫入為止，之後依一般「寫入」規則以整筆 `StorageRecord` 覆蓋主鍵。契約不為此暫停寫入，避免使用者新進度無法保存（AC-18-01 優先） | AC-18-01、AC-18-05 |

版本表與遷移規則：

| `schemaVersion` | 契約版本 | 說明 | 遷移 |
| :--- | :--- | :--- | :--- |
| 1 | 0.1～0.7 | 初版（v0.2～v0.7 只改內容資料檔、規則、註解與執行期型別，持久化結構不變）。v0.7 程式寫入的 localStorage 與匯出的備份皆為 1 | — |
| 2 | 0.8～ | `PersistedData` 新增必填 `todayLearned`、`learnedHistory`（PRD R-17，人類已同意） | 1 → 2：MG-1～MG-4 |

- `PersistedData` 任何結構變更（含新增選填欄位）都要：`CURRENT_SCHEMA_VERSION` + 1、提供 v→v+1 遷移規則、更新 `SUPPORTED_SCHEMA_VERSIONS`、更新 `storage-schema.json`（`schemaVersion` 的 `const`／`enum`）、在本表與變更紀錄登記。
- 版本只增不減；不提供降版。舊版程式讀到新版資料視為無法讀取（原字串保留於 `unreadable` 鍵）。**（v0.8 知會）** 使用者若改回 v0.7 程式開啟已升級為 2 的資料，v0.7 程式會依其 AC-18-05 重設；v0.7 程式也無法匯入本版匯出的備份（版本不相容）。見 FB-29。
- 備份檔與 localStorage 共用同一版本號與同一遷移鏈。

**v1 → v2 遷移規則**（v0.8；localStorage 讀取與備份匯入共用）：

| 編號 | 規則 | 對應 AC |
| :--- | :--- | :--- |
| MG-1 | 輸入：`schemaVersion` = 1 且 `data` 為純物件（非陣列、非 null）。`data` 不是物件 → localStorage 視為無法讀取（AC-18-05）、匯入視為 `format`。遷移前**不**另以 v1 schema 驗證，遷移後統一以 v2 驗證（MG-4） | AC-18-05、AC-24-05 |
| MG-2 | 動作：`data.todayLearned = { "date": null, "wordKeys": [] }`、`data.learnedHistory = {}`（**一律覆寫**；v1 資料本來就不應有這兩個鍵，若有也不採用）；`schemaVersion` 改為 2。其餘 7 欄（`goal`、`customVocab`、`masteredWordKeys`、`vocabQuiz`、`part5`、`streak`、`sttNoticeAcknowledged`）**原值不動**，不重算、不清理（色級重算、V-ST-05 等照一般讀取流程在遷移後執行） | AC-30-12、AC-24-10、E-51、E-55 |
| MG-3 | localStorage：遷移結果以完整 v2 根結構與 V-ST-03 驗證；通過後以**一次** `setItem` 寫回整筆 `StorageRecord`（`savedAt` 更新）。寫回失敗（任何例外）不提示、不影響本次使用，下次 `PersistedData` 寫入時再寫；驗證不通過 → 依 RS-1～RS-4 視為無法讀取。遷移成功不顯示「資料讀取失敗」、不顯示首次畫面 | AC-30-12、AC-25-05 |
| MG-4 | 備份匯入：§6.2 步驟 4 只遷移 `data`（同 MG-2），頂層 `schemaVersion` 原值保留供步驟 5 驗證（`BackupFile.schemaVersion` enum `[1, 2]`）；步驟 5 以 v2 的 `$defs/PersistedData` 驗證遷移後的 `data`。寫入 localStorage 的 `StorageRecord.schemaVersion` 一律為 2 | AC-24-10 |

**v2 新欄位的讀取規則**（v0.8；只適用讀 localStorage，匯入見 IM-8）：

| 編號 | 規則 | 對應 AC |
| :--- | :--- | :--- |
| RD-1 | `schemaVersion` = 2 且 `data` 為物件時，**在根結構驗證之前**先分別檢查 `data.todayLearned`、`data.learnedHistory`：鍵不存在，或不符 `storage-schema.json` 的 `$defs/TodayLearnedState`／`$defs/LearnedHistory`（shape）→ **只把該欄設為預設值**（§5.2），其他資料保留；不保存 `unreadable`、不提示「資料讀取失敗」、不觸發 AC-18-05。之後再以根結構與完整 V-ST-03 驗證整筆（此時兩欄必定通過 shape），其他欄位的錯誤仍依 AC-18-05 整體重設 | AC-30-13、E-52 |
| RD-2 | RD-1 的重設與 V-ST-09～V-ST-11 的正規化只改記憶體；結果在下一次 `PersistedData` 寫入時一併寫回（實作也可在啟動時立即寫回一次，失敗不提示）。不另外為此提示使用者 | AC-30-13 |

### 5.4 今日已學紀錄的記錄規則（v0.8，pg-frontend；PRD US-30、R-17）

名詞：**today** = 事件發生當下（或畫面繪製當下）的裝置本地日期 `YYYY-MM-DD`（C-3）。**X**（今日已學數）、**D**（每日新字量）定義同 PRD US-30。

| 編號 | 規則 | 對應 AC |
| :--- | :--- | :--- |
| LR-1 | 學習行為（`LearningEventKind`）與觸發點：`"flip"` = 單字卡模式中 `flashcard.isFlipped` 由 false 變 true（翻回正面、換卡、滑動不算）；`"vocabQuiz"` = 四選一 `selectedIndex` 由 null 變非 null（對錯皆算；鎖定後再點不算）；`"stt"` = 產生 `SttResult` 並顯示分數（逾時、空結果、權限拒絕、離線、錯誤不算）。模擬測驗作答**不算**（但仍會打卡，`StreakState`） | AC-30-03、AC-30-04 |
| LR-2 | 記錄的鍵 = 該卡的 wordKey（`StudyCard.wordKey`／`VocabQuizQuestion.wordKey`，C-2），內建與自訂一視同仁 | AC-30-03 |
| LR-3 | 記錄步驟（每次學習行為，同步執行）：(1) 取 today；(2) `todayLearned.date ≠ today` → 換日：`todayLearned = { date: today, wordKeys: [] }`（前一天的字數已在 `learnedHistory`，不動）；(3) wordKey 已在 `wordKeys` → 結束，不改資料；(4) 否則附加到 `wordKeys` 末尾，`learnedHistory[today] = wordKeys.length`；(5) 依 V-ST-10 修剪 `learnedHistory`（刪除早於 today − 29 天與晚於 today 的鍵）；(6) 整筆 `StorageRecord` 一次 `setItem`（可與同一事件造成的打卡、`vocabQuiz`、`masteredWordKeys` 變更合併為一次寫入） | AC-30-03、AC-30-07、AC-30-09、AC-30-11、AC-18-01 |
| LR-4 | 刪除自訂單字、未觸發初始化的「套用」（含切換色級）等任何操作都**不**從 `wordKeys` 移除項目，`learnedHistory` 不回扣（AC-30-06）。只有下列三種操作會整欄取代：重設（AC-18-05）、匯入（§6.2）、（v0.9）切換難易度確認初始化（§5.7 CI-4，兩欄回到預設值） | AC-30-06、AC-32-02 |
| LR-5 | 打卡（`StreakState`）與今日已學各自獨立計算；同一事件兩者都更新時，一次寫入 | AC-17-02、AC-30-03 |
| LR-6 | 顯示（主控台每次繪製時以當下 today 計算，不需等學習行為；跨午夜後切換回主控台即反映新日期）：X = `todayLearned.date === today ? wordKeys.length : 0`；D = `COLOR_LEVELS` 中 `goal.effectiveColor` 的 `dailyNewWords`（橘 10、棕 10、綠 15；R-14）；X ≥ D 時為「今日目標達成」；長條圖 `DASHBOARD_CHART_DAYS`（7）根，由左到右 today − 6 天 … today，值 = `learnedHistory[日期] ?? 0`，**today 那根一律用 X**。顯示時不需寫入；記憶體中的換日正規化可延到下一次寫入 | AC-30-01、AC-30-02、AC-30-05、AC-30-07、AC-30-08 |
| LR-7 | 寫入失敗：容量不足（IM-7）→ 記憶體照常更新、畫面照常計數；`learningQuotaNoticeShown` 為 false 時提示「儲存空間不足」並設為 true（同一工作階段只一次）；localStorage 原值不變，下一次寫入再試。其他例外同樣不回滾記憶體、不提示。`storageStatus = "unavailable"` 時只更新記憶體 | AC-30-14、E-54、AC-18-03 |
| LR-8 | 首次畫面（`entryMode = "firstRun"`）沒有可觸發學習行為的頁面；即使有，也不得寫入主鍵（FS-2） | AC-25-04 |

主控台 3 格數據（v0.12 取代 v0.8 的 2 個小環形圖與「學習統計」區塊，AC-30-10、AC-39-05；Q-52 決議 A）屬計算顯示、不持久化：「連續打卡天數」= `StreakState` 顯示規則；「單字掌握率」（大字）= |`masteredWordKeys` ∩ 目前單字集 wordKey| ÷ 單字集張數（單字集為空顯示「—」），同格小字「已掌握 N 字」N = `masteredWordKeys.length`（含不在目前單字集者，AC-17-03）；「模擬測驗正確率」= `part5.totalCorrect ÷ part5.totalAnswered`（答題數 0 顯示「—」），四捨五入規則同 AC-17-04。文字見 `LAYOUT_TEXTS`，版面規則見 §11.4。
（v0.12）近 7 天圖表：LR-6 算出的 7 根值**全為 0**（含 today 那根 = X）→ 只顯示 `LAYOUT_TEXTS.chartEmpty`「開始學習後會顯示紀錄」，不畫長條、日期與「0」（AC-39-07 (b)、E-88）；任一根 > 0 → 照 LR-6 畫 7 根（AC-30-08）。判定只用 LR-6 的顯示值，不另存狀態。

### 5.5 首次進入流程的契約規則（v0.8，pg-frontend；PRD US-25、R-16 A、Q-34、Q-35；**不新增持久化欄位**）

| 編號 | 規則 | 對應 AC |
| :--- | :--- | :--- |
| FS-1 | **判定時機與條件**：只在應用啟動時判定一次（資料檔載入後、首次繪製前），結果存在 `RuntimeState.entryMode`，本工作階段內不再重新判定。`localStorage.getItem("englishMasterTrack:state")` 回傳 `null` → `"firstRun"`；回傳任何字串（含 `""`、無法解析、版本不符）→ `"main"`（無法讀取時依 AC-18-05 重設後進主控台）；存取 localStorage 拋例外 → `"firstRun"` 並 `storageStatus = "unavailable"`。`englishMasterTrack:unreadable` 鍵是否存在**不影響**判定 | AC-25-01、AC-25-05、AC-25-08、AC-25-09 |
| FS-2 | **首次畫面期間不寫入**：`entryMode = "firstRun"` 時不得對主鍵或 `unreadable` 鍵呼叫 `setItem`／`removeItem`；卡片選擇只存在記憶體（`goal.draftScore`），重新整理即回到預設 725、綠（v0.10，Q-39）。開啟「資料來源與授權」頁（`currentTab = "sources"`）不改變 `entryMode`，返回時回到首次畫面 | AC-25-04、AC-25-07、E-38、E-41 |
| FS-3 | 首次畫面只顯示 `customizer` 的色級卡片、試算、「開始學習」與「從備份還原」（v0.10 不顯示分數輸入與分數數值，GS-6）；不顯示自訂單字表單、領域範本區與導覽列（版面屬設計層）。（v0.12，Q-51）色級卡片改為精簡色級列、試算結果卡改為固定底部列中的一行試算摘要，標題與副標見 §11.5 FT-1～FT-6；資料行為（`draftScore`、FS-2 不寫入、FS-4、FS-5）不變 | AC-25-01、Q-35、AC-41-01、AC-41-02 |
| FS-4 | **「開始學習」**：等同「套用」——`goal.appliedScore = draftScore`，依 V-ST-02 重算色級，其他欄位為 §5.2 預設值（`todayLearned`、`learnedHistory` 為預設）；以一次 `setItem` 寫入完整 `StorageRecord`（`schemaVersion` 2）；接著 `entryMode = "main"`、`currentTab = "dashboard"`。寫入失敗（容量不足或其他例外）仍進入主控台，依 §5.3「寫入」規則提示，下次寫入再試；`storageStatus = "unavailable"` 時不寫入、直接進入（本工作階段可用） | AC-25-02、AC-25-03、AC-18-02、AC-25-08 |
| FS-5 | **「從備份還原」**：完全依 §6.2 步驟 1～9 與 IM-1～IM-8（含 v1 備份遷移、新欄位正規化）。步驟 9 成功 → `entryMode = "main"`、`currentTab = "dashboard"`，所有資料以備份為準，首次畫面上未生效的分數與卡片選擇捨棄。`storageStatus = "unavailable"` 時依步驟 9 只套用記憶體並進入主控台 | AC-25-10、E-58 |
| FS-6 | 還原失敗（`cancelled`、`format`、`version`、`quota`、`write_failed`）→ 維持 `entryMode = "firstRun"`，記憶體與 localStorage 皆不變（主鍵仍不存在），顯示對應訊息（`cancelled` 不提示），可再試或按「開始學習」。localStorage 停用時每次開啟都是首次畫面（可接受的限制） | AC-25-11、AC-25-08、E-39、E-57 |
| FS-7 | 首次畫面的「從備份還原」與主控台的匯入共用同一套匯入程序與錯誤碼；差異只在成功後的畫面切換（FS-5） | AC-25-10 |

### 5.6 介面互動數值（Q-33）——屬設計層

PRD Q-33 的介面數值（底部導覽 ≤ 640px、換頁動畫 ≤ 300ms、翻卡動畫 ≤ 400ms、答題動畫 ≤ 600ms、滑動門檻 50px 且水平位移大於垂直位移、震動 ≤ 200ms）、`prefers-reduced-motion`、觸控目標 ≥ 44×44 CSS px、圖示內嵌等（US-26～US-29、US-31）**不涉及資料檔或持久化結構**，契約不定義常數，由 SD 在 `architecture.md` 決定實作值（不得超過 PRD 上限），QA 依 PRD AC 驗收。契約只提供與狀態相關的部分：導覽項目與順序 `NAV_TAB_ORDER`、畫面名稱 `TAB_LABELS`、翻卡邏輯狀態 `flashcard.isFlipped`（AC-28-08 最終狀態依此值）、測驗模式下滑動不改 `VocabQuizQuestion.selectedIndex`（AC-28-06）。

（v0.12，R-21）同一原則：內容寬度 720px、640px 斷點、圓角 16px、陰影、字級、焦點框、固定底部列、進度條高度與動畫等版面數值**屬設計層**，由 SD 依 PRD AC-38～AC-41 定為架構常數。契約只定義：顏色值（`COLOR_TOKENS`、`SEMANTIC_COLORS`，因 `PWA_BACKGROUND_COLOR`／`theme_color` 與其綁定）、畫面文字（`LAYOUT_TEXTS`、`APP_DISPLAY_NAME`）、不可改的識別字（`FROZEN_IDENTIFIERS`）與狀態面規則（§11.4 DB-6 展開狀態、§11.6 MT-1 進度推導）。

### 5.7 切換難易度初始化學習紀錄（v0.9，pg-frontend；PRD US-32、R-18 一、Q-38；**不改持久化結構**）

名詞：**today** = 按下「套用」（判斷）或「確定」（寫入）當下的裝置本地日期（C-3）；`effective(S)` = 分數 S 依 V-ST-02 算出的生效色級；**新分數** = 按「套用」當下的 `goal.draftScore`。

| 編號 | 規則 | 對應 AC |
| :--- | :--- | :--- |
| CI-1 | **觸發條件**：只在 `entryMode = "main"`、一般難易度設定頁按「套用」時判斷。`effective(新分數) ≠ goal.effectiveColor`（**生效色級改變**）**且** CI-2「有學習紀錄」成立 → 跳出確認視窗；任一不成立 → 依一般「套用」規則直接套用，**不清除任何資料**。只點選色級卡片不判斷（AC-26-02；v0.10 已無調分數操作）。首次畫面「開始學習」（FS-4）、「從備份還原」（FS-5）、主控台匯入（§6.2）一律不觸發 | AC-01-02、AC-01-07、AC-26-02、AC-32-01、AC-32-05、AC-32-06、AC-32-08 |
| CI-2 | **有學習紀錄**：以按「套用」當下記憶體中的 `PersistedData` 判斷（localStorage 停用時同樣以記憶體為準），下表 (a)～(f) **任一**成立即為有 | AC-32-01、AC-32-06、AC-32-07 |
| CI-3 | **生效色級改變的判定例**：綠 → 綠（既有 600 → 點綠卡片 725，v0.10）、綠 ↔ 藍 ↔ 金（生效色級皆為綠）不算改變；橘 → 棕、棕 → 綠、綠 → 橘等算改變。比較對象是**記憶體中** `goal.effectiveColor`（啟動時已依 V-ST-02 重算） | AC-32-05、AC-01-07 |
| CI-4 | **按「確定」後的新資料**：以目前 `PersistedData` 為底建立一份**新物件**（不可就地修改現行資料），依下方「清除欄位」「保留欄位」兩表設定。清除採**白名單**：只有 `LEARNING_PROGRESS_FIELDS` 的 6 欄被覆寫，其餘欄位一律原值保留 | AC-32-02、AC-32-03、AC-32-10 |
| CI-5 | **單次原子寫入**：`storageStatus = "ok"` 時，把 CI-4 的新資料包成 `StorageRecord`（`schemaVersion` = 2、`savedAt` = 當下 ISO 8601、`data` = 新資料），對 `englishMasterTrack:state` **一次** `setItem`。不得拆成「先套用目標、再清除紀錄」等多次寫入；不得 `removeItem` 任何鍵；不碰 `englishMasterTrack:unreadable`；不新增鍵。`setItem` 成功後才以新資料取代記憶體並重繪（CI-8） | AC-32-02、AC-32-10、AC-32-11 |
| CI-6 | **localStorage 停用**（`storageStatus = "unavailable"`）：不寫入，直接以新資料取代記憶體並重繪；「進度將無法保存」持續顯示 | AC-32-11 (a)、AC-18-03 |
| CI-7 | **寫入失敗**：CI-5 的 `setItem` 拋出**任何**例外（IM-7 容量不足或其他）→ 丟棄新資料，記憶體 `PersistedData` 不變（localStorage 因 `setItem` 失敗而保持原值），畫面依 CI-9 回到按「套用」前的狀態，提示「儲存空間不足，未套用」。**不適用** §5.3「保留記憶體狀態、下次寫入再試」；不改 `learningQuotaNoticeShown`。不得出現只清除一部分、或畫面與儲存不一致 | AC-32-11 (b)、E-63 |
| CI-8 | **成功後的執行期狀態**（不持久化，同一般套用不同色級）：依新 `goal.effectiveColor` 重建 `studySet`；`flashcard.index = 0`、`isFlipped = false`（AC-03-05）；`speech.lastResult = null`；測驗模式下重新出題。主控台、難易度設定試算（CurrentVocab = 0）、模擬測驗頁（第 1 題未作答）都由新資料推導，不另存狀態 | AC-32-02、AC-03-05 |
| CI-9 | **取消**（「取消」、Esc、點視窗外，三者相同）：不建立新資料、**不呼叫 `setItem`**；記憶體中只把 `goal.draftScore` 改回 `goal.appliedScore`（選中卡片、試算回到原生效設定；v0.10 畫面已無分數輸入框與滑桿），其餘欄位不變。**例外於 §5.3「任何變更後寫入」**：此 `draftScore` 還原不立即寫入，隨下一次 `PersistedData` 寫入一併寫出，以符合 AC-32-04「localStorage 與按「套用」前完全相同」（重新載入的顯示見 FB-35）。單字卡位置不變 | AC-32-04、E-60 |
| CI-10 | **視窗開啟期間**：背景不可操作，因此不會發生任何學習行為（LR-1）或其他 `PersistedData` 寫入；按下任一按鈕前，記憶體與 localStorage 皆與按「套用」前相同 | AC-32-01 |

CI-2「有學習紀錄」與實際欄位的對應（PRD US-32 名詞表 (a)～(f)）：

| 項 | PRD 定義 | 判斷式（記憶體中的 `data`） | 說明 |
| :--- | :--- | :--- | :--- |
| (a) | 已掌握單字數 > 0 | `data.masteredWordKeys.length > 0` | 全部已掌握單字（含自訂、含不在目前單字集者），不與單字集取交集 |
| (b) | 四選一測驗答題數 > 0 | `data.vocabQuiz.answered > 0` | V-ST-03 保證 `correct ≤ answered`，不另看 `correct` |
| (c) | 模擬測驗累計答題數 > 0 | `data.part5.totalAnswered > 0` | 只看累計；`roundAnswered ≤ totalAnswered`（V-ST-03）已涵蓋。`currentIndex`、`lockedSelection`、`phase` 不列入判斷（PRD 未列），但初始化時仍會一併重設 |
| (d) | 今日已學數 X > 0 | `data.todayLearned.date === today && data.todayLearned.wordKeys.length > 0` | 同 LR-6 的 X |
| (e) | 近 30 天歷史中至少 1 天字數 > 0 | 存在鍵 k ∈ `data.learnedHistory`：k 為合法 `LocalDate`、today − 29 天 ≤ k ≤ **today − 1 天**、值 > 0 | **SA 定案：不看 today 那一天**。依 V-ST-11，`learnedHistory[today]` 恆等於 X，today 已由 (d) 涵蓋，(a)～(f) 的 OR 結果與含 today 時完全相同；排除後 AC-32-07「只讓 (d) 成立」的測試狀態才可能構造（FB-33）。視窗下限同 V-ST-10，跨午夜未正規化的舊鍵不計 |
| (f) | 有打卡紀錄 | `data.streak.lastActiveDate !== null \|\| data.streak.days > 0` | — |

清除欄位（= `LEARNING_PROGRESS_FIELDS`，按「確定」後的值；與 §5.2 預設值相同，即「清除網站資料後在首次畫面按開始學習」所得的值，AC-32-02）：

| PRD US-32 項目 | 欄位 | 初始化後的值 |
| :--- | :--- | :--- |
| (1) 已掌握單字集合（含自訂單字的掌握狀態） | `masteredWordKeys` | `[]` |
| (2) 四選一測驗答題數與答對數 | `vocabQuiz` | `{ "answered": 0, "correct": 0 }` |
| (3) 模擬測驗累計答題數、答對數與目前題號 | `part5` | `{ "currentIndex": 0, "lockedSelection": null, "phase": "question", "roundAnswered": 0, "roundCorrect": 0, "totalAnswered": 0, "totalCorrect": 0 }`（7 欄全部重設，含本輪計數與鎖定狀態） |
| (4) 打卡紀錄 | `streak` | `{ "days": 0, "lastActiveDate": null }` |
| (5) 今日已學紀錄 | `todayLearned` | `{ "date": null, "wordKeys": [] }` |
| (6) 近 30 天每日已學字數 | `learnedHistory` | `{}` |

保留欄位：

| 欄位 | 按「確定」後的值 | 對應 |
| :--- | :--- | :--- |
| `goal` | **改為新值**：`draftScore` = 新分數、`appliedScore` = 新分數、`appliedColor` = Color(新分數)、`effectiveColor` = `effective(新分數)`（同一般「套用」，V-ST-02） | AC-32-02 |
| `customVocab` | **原值**：陣列長度、順序、每筆 11 個欄位（含 `id`、`createdAt`）與確定前完全相同。自訂單字「只清除掌握狀態」= 其 wordKey 隨 `masteredWordKeys` 清空而移除；`CustomVocabItem` 本身沒有掌握欄位，不需修改 | AC-32-03、AC-32-10 |
| `sttNoticeAcknowledged` | **原值**（STT 說明已讀，屬使用設定） | AC-32-03、AC-08-13 |
| 其他使用設定 | `PersistedData` 目前沒有其他使用設定欄位。日後新增的任何欄位，除非契約明文加入 `LEARNING_PROGRESS_FIELDS`，一律保留 | CI-4 |
| `schemaVersion`、鍵名 | 不變：`schemaVersion` 2；鍵仍只有 §5.1 的 2 個；`PersistedData` 9 欄齊全（只有值改變） | AC-32-10 |

初始化後的學習行為照一般規則重新計：LR-3 以 `todayLearned.date = null` 視同換日，同一天再學初始化前學過的字會重新計入；打卡依 `StreakState` 規則由 `lastActiveDate = null` → `days = 1`（AC-32-09、AC-17-02）。

### 5.8 隱藏頁面（v0.9，pg-frontend；PRD R-18 三、AC-20-04、E-68）

| 編號 | 規則 | 對應 AC |
| :--- | :--- | :--- |
| HT-1 | **不變式**：`RuntimeState.currentTab` 任何時候都不得是 `HIDDEN_TAB_IDS`（`"decoder"`、`"phrasebank"`）中的值 | AC-20-04 |
| HT-2 | **入口**：導覽列（寬螢幕與 ≤ 640px 底部導覽列）= `NAV_TAB_ORDER` 4 項，依序「主控台」「難易度設定」「單字卡」「模擬測驗」；（v0.12，Q-50 決議 A）主控台**不再有**模組入口與「資料來源與授權」入口，主控台本體的換頁控制項只有「開始今日學習」（→ `flashcards`）與目標行「變更」（→ `customizer`）（§11.4 DB-3、DB-4）；頁尾「資料來源與授權」連結不變（`sources` 唯一入口）。任何導覽、入口、按鈕、連結都不得顯示 `TAB_LABELS.decoder`／`phrasebank` 文字或指向該頁 | AC-17-06、AC-20-03、AC-27-01、AC-27-04、AC-20-04 |
| HT-3 | **嘗試進入隱藏頁**（含手動輸入網址片段、程式內部呼叫切頁）：`entryMode = "main"` → 改為 `"dashboard"`；`entryMode = "firstRun"` → 維持首次畫面（`"customizer"`，FS-2）。不顯示錯誤、Console 無未處理錯誤。是否使用網址片段（hash）路由及其字串由 SD 決定；若使用，隱藏頁的片段一律依本條處理。重新載入一律從 `"dashboard"`（或首次畫面）開始；匯入備份不含頁面狀態，不影響本條 | AC-20-04、E-68 |
| HT-4 | `TabId`、`TAB_LABELS` 保留 `decoder`、`phrasebank` 兩項（未來開放用），但本版不得渲染到畫面 | AC-20-04 |
| HT-5 | **保留程式與資料**：`decoder.js`、`phrasebank.js` 照常載入、打包，格式與驗證規則（§7.5、§7.6）不變；`RuntimeState.decoder`／`phrasebank` 照常初始化。前端不得刪除這兩個全域變數或從建置中移除資料檔 | AC-20-04、AC-23-04 |

### 5.9 目標分數規則（v0.10，pg-frontend；PRD R-19、Q-39；**不改持久化結構**）

名詞：PRD 的「目標分數 S」在資料上對應 `goal.appliedScore`（已套用）；難易度設定頁的「選中卡片」與試算依 `goal.draftScore`（未套用也保存）。兩者在「套用」「開始學習」、初始化確認「確定」、匯入、預設值之後恆相等，只有點了卡片但尚未套用時不同。

| 編號 | 規則 | 對應 AC |
| :--- | :--- | :--- |
| GS-1 | **選中卡片** = Color(`goal.draftScore`)（`COLOR_LEVELS` 中 `scoreMin ≤ S ≤ scoreMax` 的那一列）；試算區（建議總字量、每日新字量、預計週數）依同一色級。一般頁與首次畫面相同 | AC-26-02、AC-26-06、AC-02-03～AC-02-06、AC-02-10 |
| GS-2 | **點選色級卡片**：`goal.draftScore` = 該色 `scoreMax`（橘 215、棕 465、綠 725、藍 855、金 990）。**一律**設定：含目前已選中的色級（如既有 600 點綠 → 725）、含鎖定的藍／金。**取代 Q-32**（不再有「範圍內不變／設為下限」）。只改 `draftScore`，`appliedScore`、`appliedColor`、`effectiveColor`、單字集不變；不觸發 CI-1 判斷。`entryMode = "main"` 時依 §5.3「寫入」寫出（同 v0.9 未套用的分數保存，AC-02-08）；首次畫面只改記憶體（FS-2） | AC-01-03、AC-01-05、AC-01-07、AC-02-04、AC-26-02、AC-26-04 |
| GS-3 | **套用／開始學習**：`appliedScore` = `draftScore`，依 V-ST-02 重算色級（規則同 v0.9，含 CI-1～CI-10）。**未點任何卡片直接按「套用」**時 `draftScore` 即為原值，`appliedScore` 寫入原值，不改寫為色級上限或下限 | AC-26-06、AC-01-04、AC-25-02、AC-25-03 |
| GS-4 | **既有分數不轉換**（R-19 六）：啟動讀取（§5.3）、v1 → v2 遷移（MG-2）、RD-1、匯入清理（§6.2 步驟 7）、初始化確認（CI-4）都**不得**把合法的 `draftScore`／`appliedScore` 改寫為色級上限；只依 V-ST-02 重算 `appliedColor`、`effectiveColor`。只有使用者點卡片（GS-2）才會改分數。不新增遷移、不改 `schemaVersion` | AC-26-06、AC-25-10、AC-01-05 (b)、E-69 |
| GS-5 | **分數驗證只在資料層**：`$defs/Score`（10～990 的整數且為 5 的倍數，`SCORE_MIN`／`SCORE_MAX`／`SCORE_STEP`）只在 (a) 讀 localStorage（不符 → 整筆無法讀取，RS-1～RS-4、AC-18-05、E-11）與 (b) 匯入備份（§6.2 步驟 5，不符 → `format`，AC-24-05、E-31）時檢查。資料層**不四捨五入**、不夾到範圍內。畫面產生的分數只有 `scoreMax` 5 個值與 `SCORE_DEFAULT`，必定合法 | AC-18-05、AC-24-05、E-16、E-25（暫停） |
| GS-6 | **畫面不顯示分數**（R-19 一、三、四、七）：難易度設定頁（一般頁、首次畫面）不顯示滑桿、數字輸入框、`scoreMin`～`scoreMax` 範圍文字；主控台不顯示 `appliedScore`。契約**沒有**定義分數輸入錯誤訊息常數；PRD AC-02-02 的「請輸入 10～990 的分數」屬暫停 AC，畫面不得出現。若保留隱藏的輸入元件程式，不得可見、不得可聚焦（實作方式屬設計層） | AC-01-01、AC-17-06、AC-25-01、AC-26-01、AC-26-05 |
| GS-7 | **預設值** = `SCORE_DEFAULT` 725（綠）：適用首次使用（記憶體預設，FS-2）、首次畫面重新整理（AC-25-04）、讀取失敗重設（AC-18-05）、localStorage 停用時的記憶體預設（AC-18-03） | AC-18-02、AC-25-01、AC-25-04、Q-39 |
| GS-8 | **取消初始化確認**（CI-9）：`draftScore` 還原為 `appliedScore`，因此選中卡片回到 Color(`appliedScore`)（如既有 600 → 綠卡片），分數本身仍為 600 不轉換 | AC-32-04 |

---

## 6. 備份匯出與匯入（US-24）

### 6.1 匯出

| 項目 | 規則 | 對應 AC |
| :--- | :--- | :--- |
| 內容 | `BackupFile`：`format` = `"english-master-track-backup"`、`schemaVersion` = 目前版本（v0.8 起為 2）、`exportedAt`、`contentDataVersion`、`data` = 記憶體中的 `PersistedData`（localStorage 停用時仍可匯出）。（v0.8）匯出前以匯出當下的 today 依 V-ST-09～V-ST-11 正規化 `todayLearned`、`learnedHistory`，`data` 須符合 `storage-schema.json` `$defs/PersistedDataWritten` | AC-24-01、AC-24-02、AC-30-09 |
| 不含 | 內建字庫、題庫、例句、句型、執行期狀態 | AC-24-02 |
| 檔名 | `english-master-track-backup-YYYYMMDD.json`（本地日期）。（v0.12）前綴不隨 App 改名變動（`FROZEN_IDENTIFIERS.backupFileNamePrefix`，§11.1 NM-5） | AC-24-01、AC-38-10 |
| 方式 | 本機產生檔案下載，不產生網路請求 | AC-24-01、AC-18-06 |

### 6.2 匯入（依序檢查，任一步失敗即停止，目前資料完全不變）

| 步驟 | 檢查／動作 | 失敗結果 | 對應 AC |
| :--- | :--- | :--- | :--- |
| 1 | 讀檔；空檔或 `JSON.parse` 失敗 | `format`：「備份檔格式錯誤，未匯入」 | AC-24-05 |
| 2 | 頂層不是物件，或 `format` 不等於 `"english-master-track-backup"` | `format` | AC-24-05 |
| 3 | `schemaVersion` 缺失、非整數或不在 `SUPPORTED_SCHEMA_VERSIONS` | `version`：「備份檔版本不相容」，列出檔案版本與支援版本（v0.8 起「1、2」）。檔案版本依 IM-3 顯示 | AC-24-06 |
| 4 | `schemaVersion` = 1 → 依 MG-1、MG-2、MG-4 只遷移 `data`（補 `todayLearned`、`learnedHistory` 預設值）；`data` 不是物件 → `format` | `format` | AC-24-06、AC-24-10 |
| 5 | (a) 頂層欄位以 `$defs/BackupFile` 驗證：`exportedAt` 為 date-time（IM-2）、`contentDataVersion` 為字串、`data` 存在、不得有 5 個欄位以外的多餘欄位；(b) `data` 以 `$defs/PersistedData` 驗證並檢查 V-ST-03，**但不檢查** `customVocab` 的 `id` 不重複、wordKey 不重複（IM-1）。（v0.8）`schemaVersion` = 2 的檔案 `data` 缺少 `todayLearned`／`learnedHistory`，或其 shape 不符（`$defs/TodayLearnedState`、`$defs/LearnedHistory`）→ `format`；項目層級無效不在此擋（IM-8） | `format` | AC-24-05、AC-24-11 |
| 6 | 顯示確認對話框「匯入將覆蓋目前所有進度」 | 取消 → `cancelled`，不提示錯誤 | AC-24-04 |
| 7 | 清理：自訂單字 wordKey 與內建字庫（**全部**排名，不限目前色級）重複 → 略過；檔內自訂單字 wordKey 重複 → 保留第一筆、略過其餘；`id` 重複 → 重新產生（不計略過；新 id 須符合 `^c_[A-Za-z0-9_-]{1,64}$` 且不與保留項重複）；已掌握 wordKey 不在「內建字庫 ∪ 清理後自訂單字」→ 略過；重算色級；`part5.currentIndex` 依 V-ST-05；（v0.8）以**匯入當天**（執行本步驟時的本地日期）為 today，依 V-ST-09～V-ST-11 正規化 `todayLearned`、`learnedHistory`（IM-8；`todayLearned.wordKeys` **不**與字庫比對、不因字不存在而略過）；**清理後以 `$defs/PersistedData` 與完整 V-ST-03 再驗一次**，不通過 → `format`（防禦性檢查，正常不會發生） | 清理後驗證失敗 → `format` | AC-24-08、AC-24-05 |
| 8 | 整筆 `StorageRecord` 以一次 `setItem` 寫入 | 容量不足（IM-7）→ `quota`：「儲存空間不足，未匯入」；其他寫入例外 → `write_failed`：「儲存失敗，未匯入」（v0.7 定案，IM-6、FB-24）。兩者皆記憶體與 localStorage 不變 | AC-24-09 |
| 9 | 套用到記憶體並重建單字集；提示「已匯入，略過 N 筆」（N = 步驟 7 略過的自訂單字數 + 已掌握單字數；不含捨棄的歷史項目與今日紀錄，IM-8）。（v0.8）從首次畫面匯入時另依 FS-5 切換為 `entryMode = "main"` 並進入主控台 | localStorage 停用時：只套用記憶體並維持「進度將無法保存」警示 | AC-24-03、AC-24-08、AC-25-10 |

匯入內容的所有字串一律以純文字呈現（C-7、AC-24-07）。

匯入規則補充（v0.5，依 FE-06 回饋釐清）：

| 編號 | 規則 | 對應 AC |
| :--- | :--- | :--- |
| IM-1 | **V-ST-03 的匯入例外**：步驟 5 只放寬 V-ST-03 中「`customVocab` 的 `id` 不重複、wordKey 不重複」兩項（這兩種重複由步驟 7 清理，否則步驟 7 永遠執行不到）；V-ST-03 其餘項目（計數上下限、`masteredWordKeys` 已正規化）以及 Schema 的單筆欄位檢查（`id` 格式、必填欄位、型別等）步驟 5 仍嚴格檢查。步驟 7 清理後再做完整 V-ST-03。**本例外只適用匯入**；啟動讀取 localStorage（§5.3）一律完整檢查，重複即視為無法讀取（AC-18-05） | AC-24-05、AC-24-08、AC-18-05 |
| IM-2 | 步驟 5 (a) 的依據是 `storage-schema.json` `$defs/BackupFile`（`required` 5 欄、`additionalProperties: false`）。`format: "date-time"` 在 JSON Schema 2020-12 預設只是註記，**本契約規定為強制檢查**：值須符合 RFC 3339 date-time（含時區，如 `2026-10-30T01:02:03.000Z` 或 `+08:00`）且 `Date.parse` 可解析。同一規則適用 `StorageRecord.savedAt`、`CustomVocabItem.createdAt`。`contentDataVersion` 只檢查是字串（可為 `""`），內容不影響匯入 | AC-24-05 |
| IM-3 | `ImportResult.fileVersion`（執行期，不持久化）：鍵不存在 → `null`；值為有限數字（含非整數、負數、0，如 `1.5`、`2`）→ 原值；其他（字串 `"1"`、`null`、物件、布林等）→ `null`。畫面：數字以 `String(值)` 顯示，`null` 顯示「無」（意指「無有效版本號」）。字串 `"1"` 不是合法版本號，判為 `version` 錯誤、顯示「無」為預期行為 | AC-24-06 |
| IM-4 | 步驟 5～7 皆為純計算、不寫入任何狀態，實作可在確認對話框（步驟 6）之前先完成步驟 7 的清理與驗證，只要確認前不改動記憶體與 localStorage、取消時丟棄結果即可（V-IMP-01）。「略過 N 筆」以步驟 7 結果為準 | AC-24-04、AC-24-08 |
| IM-5 | 步驟 1～7 任何未預期例外一律視為 `format`，不得白屏或拋出未處理錯誤 | AC-24-05 |
| IM-6 | （v0.6，FE-07 #3）步驟 8 `setItem` 拋出的例外分兩類：符合 IM-7 → `quota`；其他（如 `SecurityError`、瀏覽器在工作階段中途停用儲存、未知例外）→ 執行期錯誤碼 `write_failed`。處理與 `quota` 相同：不套用、記憶體與 localStorage 皆不變、不白屏。畫面文字為「儲存失敗，未匯入」（v0.7 依人類決議定案，FB-24 已解除）；`write_failed` 不提供 `fileVersion`。步驟 8 只在 localStorage 可用時執行；停用時依步驟 9 只套用記憶體，不產生 `write_failed` | AC-24-09 |
| IM-7 | **容量不足的判定**（§5.3「寫入：容量不足」與步驟 8 共用）：例外物件 `e` 符合任一條件即為容量不足：`e.name === "QuotaExceededError"`、`e.name === "NS_ERROR_DOM_QUOTA_REACHED"`、`e.code === 22`、`e.code === 1014`。其餘皆不是容量不足 | AC-18-04、AC-24-09 |
| IM-8 | （v0.8）**新欄位的匯入處理分兩層**：(1) 欄位層級——`schemaVersion` 2 的檔案缺少 `todayLearned`／`learnedHistory`，或 shape 不符（`todayLearned` 不是物件、缺 `date`／`wordKeys`、有多餘鍵、`date` 非字串且非 null、`wordKeys` 不是陣列；`learnedHistory` 不是物件，如陣列、null、字串）→ 步驟 5 判 `format`，**整份不匯入**（與讀 localStorage 的 RD-1「只重設該欄」不同，依 PRD R-17 (b)）；(2) 項目層級——shape 正確但內容無效（歷史鍵不是合法日期如 `2026-13-40`、`yesterday`；值為負數、非整數、非數字；日期晚於匯入當天或早於匯入當天往前第 29 天；`todayLearned.date` 不是匯入當天；`wordKeys` 含非字串、空白、未正規化或重複項）→ 步驟 7 依 V-ST-09～V-ST-11 捨棄或重設，不報錯、**不計入**「略過 N 筆」。`schemaVersion` 1 的檔案經步驟 4 遷移後兩欄必為預設值 | AC-24-05、AC-24-10、AC-24-11、E-55、E-56 |

### 6.3 備份格式版本號（v0.8）

| 項目 | 規則 | 對應 AC |
| :--- | :--- | :--- |
| 版本號欄位 | `BackupFile.schemaVersion` 即 AC-24-02 的「備份格式版本號」，與 localStorage 的 `StorageRecord.schemaVersion` 共用同一版本號與遷移鏈；`format` 識別字串不變，不另設備份專用版本號 | AC-24-02 |
| 本版匯出 | `schemaVersion` = 2；`data` 含 `todayLearned`（日期與當天已學單字清單）、`learnedHistory`（近 30 天每日字數）；頂層仍恰為 5 欄 | AC-24-02 |
| 本版匯入 | 支援 `[1, 2]`。1 = v0.7 程式匯出（`data` 無新欄位）→ 遷移後照常匯入，今日已學數 0、歷史為空，不顯示格式錯誤或版本不相容；2 = 本版匯出 → 依 IM-8 | AC-24-06、AC-24-10、AC-24-11 |
| 不支援 | 缺失、非整數、0、負數、≥ 3 → `version`，訊息列出檔案版本（IM-3）與支援版本「1、2」 | AC-24-06 |
| 反向相容（知會） | v0.7 程式只支援 `[1]`，匯入本版（2）的備份會顯示版本不相容；不提供降版匯出（FB-29） | — |

---

## 7. 驗證規則

pg-content 必須以 Node 執行資料檔逐條自驗（V-IN、V-SRC、V-VOC、V-TPL、V-P5、V-DEC、V-RS、V-PH）；pg-frontend 實作 V-ST、V-IMP；QA 以本節為驗收依據。

### 7.0 讀取輸入檔（`sources/`，pg-content；v0.2 新增）

| 編號 | 規則 |
| :--- | :--- |
| V-IN-01 | 以位元組讀檔：先以 UTF-8 嚴格解碼（`new TextDecoder("utf-8", { fatal: true })`），失敗則以 ISO-8859-1（latin-1）解碼；去除開頭 BOM。部分字表檔為 latin-1，不可直接當 UTF-8 讀 |
| V-IN-02 | 換行以 `/\r?\n/` 分割（檔案為 CRLF）；每個欄位 `trim()`，去除殘留 `\r` |
| V-IN-03 | 略過空行、全欄皆空的列，以及第 1 欄以 `##` 開頭的註解行（`*_lemmatized_for_teaching.csv` 含註解行） |
| V-IN-04 | `*_stats.csv` 第 1 列為表頭須略過；`NAWL_12_lemmatized_for_teaching.csv` 無表頭，第 1 列即資料。表頭與資料列可能帶多餘空欄（BSL），以欄名定位，不以欄數判斷 |
| V-IN-05 | 詞頭 = 第 1 欄；排名欄（`SFI Rank`／`TSL Rank`／`BSL Rank`）以整數解析，非整數列列入異常報告；NAWL 以檔案列順序為序 |
| V-IN-06 | 每份字表報告：資料列數、不重複 wordKey 數、表內重複 wordKey、含非 ASCII 字元的詞頭；BSL（1,744 vs 官網 1,700）、NAWL（959 vs 官網 957）的差異須在交付紀錄說明原因（例：重複、註解、變體），**排名以檔案實際內容為準**。（v0.6）已檢查上述項目仍無法從檔案內容解釋時，記為「無法判定」並列出已檢查項目即可，不擋交付（CT-01 已依此回報，FB-20 結案） |
| V-IN-07 | 依 §4.1 計算 `N_B`、`N_G` 與各區段，並與 §4.2 紀錄值比對；不一致依 N-1 回報 |

### 7.1 來源登錄（`sources.js`）

| 編號 | 規則 | 對應 AC |
| :--- | :--- | :--- |
| V-SRC-01 | `DATA_SOURCE_REGISTRY` 的 `code` 不重複，且集合 = 字庫 `sources` 出現過的代碼 ∪（有任何 `meaningSource` = `"ECDICT"` 時的 `"ECDICT"`）∪ `{"ORIGINAL"}`，不多不少 | AC-23-02、AC-23-03 |
| V-SRC-02 | 每筆 `confirmation.status` = `"confirmed"`，且 `confirmedAt`、`confirmedBy`、`evidenceUrl` 皆非空（ORIGINAL 的 `evidenceUrl` 填 `"docs/01-PRD.md Q-31"`）；內容與 §4.3 一致（L-3） | AC-23-05 |
| V-SRC-03 | `includedItemCount` = 字庫中引用該代碼的實際筆數 | AC-23-02 |
| V-SRC-04 | `PROJECT_LICENSE` 各欄位等於 `data-schema.ts` 註明的固定值 | AC-23-06 |
| V-SRC-05 | （v0.2）`licenseName` = `"MIT"` 的來源：`copyrightNotice`、`licenseText` 皆非空，且與 `sources/ecdict/LICENSE` 原文一致；其他來源兩欄皆為 null | AC-23-02 |

### 7.2 內建字庫（`vocab-*.js`）

| 編號 | 規則 | 對應 AC |
| :--- | :--- | :--- |
| V-VOC-01 | 每筆恰有 `BuiltinVocabItem` 的 12 個鍵，無多餘鍵；型別正確 | — |
| V-VOC-02 | `rank` 為 1～`N_G` 連續不重複的整數 | AC-03-08 |
| V-VOC-03 | wordKey 全庫不重複 | AC-03-07 |
| V-VOC-04 | 排名 1～`N_B` 的 wordKey 序列 = `NGSL_12_stats.csv` 依 `SFI Rank` 排序去重後序列（集合相同、順序相同）；至少包含 the、of、a、and、to、in、he、it、can、will | AC-03-08、AC-03-09 |
| V-VOC-05 | 排名 > `N_B` 的 `sources` 不含 `"NGSL"`，第一個元素屬於 TSL／BSL／NAWL；整體順序符合 §4.1 R-2～R-4 | AC-03-08 |
| V-VOC-06 | `sources` 至少 1 個、不重複、依 NGSL → TSL → BSL → NAWL 排序，且只含 §4.3 可收錄的代碼；未確認字表為唯一來源的字數 = 0 | AC-23-03、AC-23-05 |
| V-VOC-07 | `word`、`phonetic`、`meaning`、`collocation`、`example` 皆非空；`phonetic` 以 `/` 開頭與結尾；`pos` 至少 1 個、不重複、皆屬 `PartOfSpeech`；（v0.7，M-8）字首字自動檢查：(a) `meaning`（trim 後）以「（字首）」開頭 → `pos` 必須恰為 `["pref."]`；(b) `meaning` 含「（字首）」但不在開頭 → 該段必須是最後一段（最後一個全形「；」之後以「（字首）」開頭），且 `pos` 長度 ≥ 2、最後一個元素為 `"pref."`；(c) `pos` 含 `"pref."` → `meaning` 必須含「（字首）」，且 `"pref."` 只能在 `pos` 最後一個位置 | AC-06-01、AC-06-02、AC-06-07 |
| V-VOC-08 | 排名 > `N_B` 的 `academicContext` 非空；排名 ≤ `N_B` 可為 `""`（不得為 null 或省略） | AC-06-07、AC-06-08 |
| V-VOC-09 | （v0.4 改寫）`contentSource` = `"ORIGINAL"`；**`phoneticSource` 全部 = `"ORIGINAL"`**（標 `"ECDICT"` 的筆數 = 0）；`meaningSource` ∈ {`"ECDICT"`,`"ORIGINAL"`}；`meaningSource` = `"ECDICT"` 者其 wordKey 必須存在於簡體原檔 `ecdict_subset.csv`；列於 `ecdict_subset_missing.txt` 的 4 筆（résumé、café、entrée、unauthorize）必須 = `"ORIGINAL"`；其他 `"ORIGINAL"` 須在交付紀錄列出原因（M-6） | AC-23-03、AC-23-04、E-37、NFR-3 |
| V-VOC-10 | （v0.5 改寫，見 §9.1 DF-06）目的是攔截序列化／組字錯誤，不是禁止英文單字 null、undefined。(1) **錯誤**：任何字串欄位 `trim()` 後不分大小寫**等於** `"undefined"` 或 `"null"`。唯一例外：wordKey = `"null"` 那一筆（BSL／NAWL 收錄，紀錄排名 4,646）的 `word` 欄可等於 `"null"`；若日後字庫出現 wordKey = `"undefined"`，同理只豁免其 `word` 欄。(2) **錯誤**：任何字串欄位含 `<` 或 `>`（不變）。(3) **只報告（警告，不擋交付）**：字串欄位含**獨立單字** `undefined` 或 `null`（`/\b(undefined\|null)\b/i`），且該筆 wordKey 不是該字本身；pg-content 在交付紀錄逐筆列出並說明為合法用法（如 `null hypothesis`）。wordKey = `"null"` 那一筆的各欄位含 null 字樣（如 `collocation` 的 `null hypothesis`、例句）**明文允許**，不列警告。字中含 null 的字串（`nullify`、`annul`）不屬獨立單字，不報告 | AC-06-07 |
| V-VOC-11 | `VOCAB_MANIFEST.nB` = `sources` 含 NGSL 的筆數、`nG` = 總筆數、`segments` 首尾相接涵蓋 1～`nG` 且與 R-1～R-4 一致；`nB`、`nG` 與 §4.2 紀錄值一致 | AC-03-06 |
| V-VOC-12 | （前端）`N_B`、`N_G` 以實際資料計算；與 `VOCAB_MANIFEST` 不符時只在 Console 警告，不中斷 | AC-03-06 |
| V-VOC-13 | 每個分檔涵蓋一段連續排名，檔名起始排名與檔內最小 `rank` 相同 | — |
| V-VOC-14 | （建議）同一 `meaning` 文字盡量不重複，以利四選一產生相異選項 | AC-09-02 |
| V-VOC-15 | （v0.4，自動檢查）`meaning` 不得包含 `tw_terms.tsv` 任一資料行「來源」欄的字串（略過 `#` 註解行），即補充對照表已取代的大陸用詞不得殘留；`meaning` 不得含 `[計]`、`[醫]` 等方括號領域標記（M-2）；（v0.6）`meaning` 不得含「例項」（`s2twp` 過度轉換產物，非台灣用語，M-3 補充表） | AC-23-02、C-1 |
| V-VOC-16 | （v0.4，自動檢查）`phonetic` 不得含 ECDICT 舊式標註字元：ASCII 撇號 `'`（重音應為 IPA `ˈ` U+02C8、`ˌ` U+02CC）、ASCII 冒號 `:`（長音如需標示用 `ː` U+02D0）、西里爾字母 `ә`（U+04D9，IPA schwa 應為 `ə` U+0259）。美式／英式的判斷無法自動化，由 V-VOC-18 抽查 | AC-23-03、NFR-3 |
| V-VOC-17 | （v0.4，清單 + 人工）pg-content 列出所有 `meaningSource` = `"ECDICT"` 且 `ecdict_subset.csv` 該字 `translation` 含「质量」「程序」「水平」「注册」「文件」「文档」「地铁」任一詞的單字（wordKey、英文詞義、最終 `meaning`），附於交付紀錄；QA **全數**檢查是否已依 M-3 改為台灣用法。**（v0.6）** 比對詞增加 M-3 補充表的「支持」「类型」「实例」「触摸」「局部」「保存」「社区」「连接」「循环」「菜单」（「身份」不列入，`s2twp` 結果正確）；v0.6 核准前已交付的批次，由 pg-content 以腳本補產這 10 詞的清單（只補清單；清單中不符 M-3 的釋義才需修正） | AC-23-02、C-1 |
| V-VOC-18 | （v0.4，QA 抽查）QA 依 SD 訂的抽樣比例抽查 `meaningSource` = `"ECDICT"` 的單字：(1) `meaning` 無簡體字殘留、無大陸用語；(2) 義項皆可在 `ecdict_subset_zhtw.csv` 同字 `translation` 找到對應（精簡而非新增，M-2；依 M-3 還原用詞、依 M-2 更正原檔錯字者視為有對應）；(3) `pos` 與 `meaning` 涵蓋的詞性一致（M-4）。另抽查 `phonetic` 為美式 IPA（如 `/ˈtoʊ.../` 而非英式 `/...əʊ/`）。抽查不合格率超過 SD 訂的門檻時，整批退回 | AC-23-03、R-01、R-13 |

### 7.3 領域範本（`templates.js`）

| 編號 | 規則 | 對應 AC |
| :--- | :--- | :--- |
| V-TPL-01 | 恰好 3 筆，順序與 `label` 為 cs「資工」、business「商管」、biostat「生醫統計」；每筆 `words` 恰好 10 筆，7 個欄位皆非空 | AC-05-01～AC-05-03 |
| V-TPL-02 | cs 含 wordKey `latency`、`scalability`；biostat 含 `heterogeneous`；business 含 `monetization`（v0.3 依 PRD R-12，取代規格書舉例的 Synergy；`synergy` 屬內建字庫 BSL Rank 1564，business 範本不得收錄，見 V-TPL-03） | AC-05-02、AC-05-03 |
| V-TPL-03 | 30 個範本單字的 wordKey 皆**不存在**於內建字庫（否則注入時會被略過，AC-05-02、AC-05-03 不成立；見 FB-12）。與 V-TPL-02 衝突時本條優先 | AC-05-02、AC-05-03 |
| V-TPL-04 | 30 個 wordKey 彼此不重複 | AC-05-04 |

### 7.4 模擬測驗題庫（`part5.js`，題型對應多益 Part 5）

| 編號 | 規則 | 對應 AC |
| :--- | :--- | :--- |
| V-P5-01 | 總數 ≥ 200；4 個 `type` 各 ≥ 50 | AC-10-01 |
| V-P5-02 | `id` 符合 `^p5-\d{3}$` 且不重複 | — |
| V-P5-03 | `sentence` 恰好含 1 個 `_____`（5 個半形底線），不含其他連續底線 | AC-10-02 |
| V-P5-04 | `options` 長度恰為 4，皆非空，trim 後不分大小寫互不相同，不含 `_____` | AC-10-02 |
| V-P5-05 | `correctIndex` ∈ 0～3；`options[correctIndex]` 填入空格後為唯一正確答案；全題庫正解位置 A～D 各佔 20%～30% | AC-11-01 |
| V-P5-06 | `explanation.coreStrategy`、`explanation.structure` 皆非空 | AC-11-02 |
| V-P5-07 | `source` = `"ORIGINAL"`；陣列順序即出題順序 | AC-11-04、AC-23-04 |

### 7.5 長難句、閱讀策略（`decoder.js`）

（v0.9）頁面隱藏，PRD 對應的 US-12～US-14 本版不驗收，但資料保留於交付檔，本節規則仍適用（pg-content 自驗；QA 驗 AC-20-04 資料保留與 AC-23-04 原創標示）。

| 編號 | 規則 | 對應 AC |
| :--- | :--- | :--- |
| V-DEC-01 | `DECODER_SENTENCES` ≥ 50 筆；`id` 符合 `^ds-\d{3}$` 且不重複 | AC-12-03 |
| V-DEC-02 | `segments` ≥ 2 段、每段 `text` 長度 ≥ 1；全部 `text` 直接串接後：首尾無空白、無連續兩個空白、以 `.`、`?` 或 `!` 結尾 | AC-12-01 |
| V-DEC-03 | 每句至少 1 段 `subject`、1 段 `verb`、1 段 `modifier` | AC-12-02、AC-13-01 |
| V-DEC-04 | `role` ∈ `SyntaxRole`；`translationZh` 非空；`section` ∈ `ReadingStrategyId`；`source` = `"ORIGINAL"` | AC-12-01、AC-23-04 |
| V-RS-01 | `READING_STRATEGIES` 恰好 3 筆，順序與標題為 abstract「Abstract 摘要」、methodology「方法論」、literature_review「文獻回顧（Research Gap）」；`tips` ≥ 1 則且皆非空 | AC-14-01 |

### 7.6 句型庫（`phrasebank.js`）

（v0.9）同 §7.5：US-15、US-16 本版不驗收，本節規則仍適用。

| 編號 | 規則 | 對應 AC |
| :--- | :--- | :--- |
| V-PH-01 | 總數 ≥ 100；4 個 `category` 各 ≥ 25 | AC-15-02 |
| V-PH-02 | `id` 符合 `^ph-\d{3}$` 且不重複；`template` 非空且 trim 後不分大小寫不重複；`descriptionZh` 非空 | AC-16-01、AC-16-03 |
| V-PH-03 | `source` = `"ORIGINAL"`；`exampleEn` 若存在則非空 | AC-23-04 |

### 7.7 狀態與匯入（pg-frontend）

| 編號 | 規則 | 對應 AC |
| :--- | :--- | :--- |
| V-ST-01 | 讀入的 `StorageRecord` 必須通過 `storage-schema.json` 驗證。（v0.8）`schemaVersion` 1 先依 MG-1～MG-4 遷移再驗證；`todayLearned`、`learnedHistory` 先依 RD-1 處理（缺少或 shape 不符只重設該欄），不因這兩欄觸發整體重設 | AC-18-05、AC-30-12、AC-30-13 |
| V-ST-02 | `appliedColor` = Color(`appliedScore`)；`effectiveColor` = `appliedColor` 為 blue／gold 時 `"green"`，否則同 `appliedColor`；讀取時一律重算覆蓋 | AC-01-07、AC-17-06 |
| V-ST-03 | `vocabQuiz.correct ≤ answered`；`part5.roundCorrect ≤ roundAnswered ≤ totalAnswered`；`part5.totalCorrect ≤ totalAnswered`；`customVocab` 的 `id` 不重複、wordKey 不重複；`masteredWordKeys` 已是 wordKey 正規化形式。**例外**（v0.5）：匯入 §6.2 步驟 5 不檢查 `customVocab` 的 `id`／wordKey 不重複，步驟 7 清理後再完整檢查（IM-1）；啟動讀取 localStorage 一律完整檢查 | AC-18-05、AC-24-05 |
| V-ST-04 | 單字集 = 內建排名 1～N（orange `N_O`、brown `N_B`、green `N_G`）+ 全部自訂單字（依 `createdAt` 遞增）；若內建資料更新後與既有自訂單字 wordKey 相同，單字集只放內建那張，自訂資料保留不刪。**（v0.5 釐清，SD-FB-03）去重只比對「本次截取」的內建卡**（排名 1～N）：該內建字在範圍內 → 只放內建卡、略過自訂卡；不在範圍內（例：生效色級為橘、該內建字排名 3,000）→ 放自訂卡。效果：每個 wordKey 在單字集中恰好出現一次，且不會因色級較低而讓使用者的自訂字消失。「共 N 張」= 截取的內建張數 + 未被略過的自訂張數（AC-03-04）。註：新增自訂單字、範本注入、匯入仍與**全部**內建字庫比對（AC-04-06、AC-05-02、AC-24-08、§6.2 步驟 7），此情況只會因內建資料更新而出現 | AC-03-01～AC-03-04 |
| V-ST-05 | `part5.currentIndex` ≥ 題庫長度時重設為 0，`lockedSelection` = null、`phase` = `"question"` | AC-11-05 |
| V-ST-06 | 四選一答對才把 wordKey 加入 `masteredWordKeys`（已存在則不變）；刪除自訂單字時同時移除其 wordKey（FB-07）；**例外**（v0.5，配合 V-ST-04）：該 wordKey 仍存在於內建字庫（全部排名）時不移除，因掌握紀錄以 wordKey 計、屬於內建那張 | AC-17-03、AC-04-07 |
| V-ST-07 | `streak` 依 `StreakState` 註解的打卡與顯示規則；`days` 永不為負 | AC-17-02、AC-17-05 |
| V-ST-08 | `sttNoticeAcknowledged` 只在按「我知道了」時設為 true | AC-08-13 |
| V-ST-09 | （v0.8）`todayLearned` 正規化（today = 啟動、匯入步驟 7、匯出、記錄時的本地日期）：(a) `date` 必須是符合 `LocalDate` 格式且**實際存在**的日期（以 `new Date(y, m − 1, d)` 回推年月日相同判定；`2026-02-30` 不存在）且等於 today，否則整欄設為 `{ date: null, wordKeys: [] }`（X = 0；含過去、未來、格式錯）；(b) `date` = today 時，`wordKeys` 只保留字串項目，各項依 C-2 正規化，捨棄正規化後為空者，重複者只保留第一次出現；(c) `date` 為 null 時 `wordKeys` 一律設為 `[]`。不報錯、不提示 | AC-30-13、AC-24-11、E-52、E-56 |
| V-ST-10 | （v0.8）`learnedHistory` 正規化：只保留同時符合下列條件的項目，其餘捨棄：鍵符合 `LocalDate` 格式且實際存在、today − 29 天 ≤ 鍵 ≤ today（以本地日曆日比較，不以毫秒差計算，避免日光節約時間誤差）、值為整數且 ≥ 0（`Number.isInteger`）。結果最多 `LEARNED_HISTORY_DAYS`（30）筆。不報錯、不提示 | AC-30-09、AC-30-13、AC-24-11、E-52、E-53、E-56 |
| V-ST-11 | （v0.8）一致性（在 V-ST-09、V-ST-10 之後執行）：`todayLearned.date` = today → `learnedHistory[today] = wordKeys.length`（覆寫原值）；`todayLearned.date` 為 null → 刪除 `learnedHistory[today]`（今天顯示 0，與 X 一致）。程式寫出的 `data` 須符合 `$defs/PersistedDataWritten` | AC-30-09、AC-30-11、AC-24-11 |
| V-ST-12 | （v0.8）學習紀錄只依 §5.4 LR-1～LR-8 變更：同一 wordKey 同一天只計 1 次；刪除自訂單字、未觸發初始化的套用不移除 `wordKeys` 也不回扣 `learnedHistory`；模擬測驗作答、未翻面瀏覽、STT 失敗不記錄。（v0.9）切換難易度確認初始化時兩欄整欄回到預設值（§5.7） | AC-30-03～AC-30-07、AC-30-11、AC-32-02 |
| V-ST-13 | （v0.8）首次判定與首次畫面期間的寫入限制依 §5.5 FS-1～FS-7：主鍵不存在才是首次；首次畫面期間對主鍵、`unreadable` 鍵的寫入次數 = 0；只有「開始學習」或備份還原成功才寫入第一筆 | AC-25-01、AC-25-04、AC-25-07、AC-25-09～AC-25-11 |
| V-ST-14 | （v0.9）切換難易度初始化依 §5.7 CI-1～CI-10：只在生效色級改變且有學習紀錄時跳出確認視窗；「確定」後 `LEARNING_PROGRESS_FIELDS` 6 欄 = §5.2 預設值、`goal` = 新值、`customVocab` 與 `sttNoticeAcknowledged` 與確定前深度相等；一次 `setItem`，失敗時記憶體與 localStorage 皆不變；取消時 `setItem` 呼叫次數 = 0 | AC-32-01～AC-32-11 |
| V-ST-15 | （v0.9）隱藏頁面依 §5.8 HT-1～HT-5：導覽恰為 `NAV_TAB_ORDER` 4 項；`currentTab` 永不屬於 `HIDDEN_TAB_IDS`；`decoder.js`、`phrasebank.js` 仍在交付檔中 | AC-20-03、AC-20-04、AC-27-01 |
| V-ST-16 | （v0.10）目標分數依 §5.9 GS-1～GS-8：點卡片後 `draftScore` ∈ {215, 465, 725, 855, 990} 且等於該色 `scoreMax`；預設值為 725；合法的既有分數在讀取、遷移、匯入、未點卡片直接套用後皆維持原值；不合法分數只在讀取（AC-18-05）與匯入（`format`）時處理，不四捨五入；畫面不出現分數數值、分數範圍與分數輸入錯誤提示 | AC-01-05、AC-18-02、AC-25-04、AC-26-05、AC-26-06 |
| V-IMP-01 | 匯入依 §6.2 順序與 IM-1～IM-8；任何失敗或取消不改動記憶體與 localStorage | AC-24-04～AC-24-06、AC-24-09、AC-24-10、AC-24-11、AC-25-11 |

---

## 8. PRD 資料相關 AC 對照

| AC | 契約欄位／規則 |
| :--- | :--- |
| AC-01-01、AC-02-03、AC-02-04、AC-02-10 | `COLOR_LEVELS`（`scoreMin`、`scoreMax`、`status`、`dailyNewWords`、`vocabTarget`、`scenarioZh`）；（v0.12 AC-01-01 精簡列表）`LAYOUT_TEXTS.vocabNoteLead`、`levelLocked`、§11.5 FT-3 |
| AC-01-03、AC-01-04、AC-01-07、AC-02-08（AC-01-06 v0.10 暫停） | `GoalState.draftScore`／`appliedScore`／`appliedColor`／`effectiveColor`、V-ST-02、§5.9 GS-1～GS-3 |
| AC-01-05、AC-02-04、AC-26-02、AC-26-04（v0.10 點卡片 = 上限） | `COLOR_LEVELS[].scoreMax`、§5.9 GS-2、V-ST-16 |
| AC-18-02、AC-25-01、AC-25-04（v0.10 預設 725） | `SCORE_DEFAULT`、§5.2、FS-2、§5.9 GS-7 |
| AC-26-05（v0.10 畫面不顯示分數） | §5.9 GS-6（契約無分數輸入錯誤訊息常數；`SCORE_*` 只用於資料層） |
| AC-26-06、AC-25-10（v0.10 既有分數不轉換） | `$defs/Score`、§5.9 GS-3～GS-5、V-ST-02、V-ST-16 |
| AC-02-01、AC-02-02、AC-02-07、AC-02-09、AC-26-03（v0.10 暫停） | 無資料欄位；`SCORE_STEP` 四捨五入不再用於畫面（GS-5、GS-6） |
| AC-02-05、AC-02-06 | `N_O`、§4.2、`masteredWordKeys.length`（CurrentVocab） |
| AC-03-01～AC-03-06 | `BuiltinVocabItem.rank`、V-ST-04、§4.2 |
| AC-03-07～AC-03-09 | wordKey（C-2）、§4.1、V-VOC-02～V-VOC-05 |
| AC-04-01～AC-04-08 | `CustomVocabItem`、V-ST-03、V-ST-06 |
| AC-04-09、AC-24-07 | C-7 |
| AC-05-01～AC-05-05 | `DomainTemplate`、`TemplateWord`、V-TPL-01～04 |
| AC-06-01、AC-06-02、AC-06-07、AC-06-08 | `BuiltinVocabItem` 各欄、V-VOC-07、V-VOC-08、V-VOC-10 |
| AC-08-13 | `sttNoticeAcknowledged`、V-ST-08 |
| AC-08-03～AC-08-12 | `SttResult`、`SttLight`（執行期，不持久化） |
| AC-09-02、AC-09-06、AC-09-07 | `VocabQuizQuestion`、V-VOC-14 |
| AC-09-04、AC-17-03 | `vocabQuiz`、`masteredWordKeys` |
| AC-10-01、AC-10-02、AC-11-01、AC-11-02 | `Part5Question`、V-P5-01～07 |
| AC-11-03～AC-11-07、AC-17-04 | `Part5Progress` |
| AC-12-01～AC-12-03、AC-13-01、AC-13-03（v0.9 暫停） | `DecoderSentence`、`DecoderSegment.role`、`RuntimeState.decoder` |
| AC-14-01（v0.9 暫停） | `ReadingStrategy`、V-RS-01 |
| AC-15-01～AC-16-03（v0.9 暫停） | `PhraseTemplate`、`PHRASE_CATEGORY_LABELS`、`RuntimeState.phrasebank` |
| AC-17-01、AC-17-02、AC-17-05、AC-17-06 | `StreakState`、`GoalState`、`COLOR_LEVELS`；（v0.12 3 格數據、目標行、移除功能入口與「目前目標／生效色級」欄位）`LAYOUT_TEXTS.stat*`、`goalLine*`、§5.4 末段、§11.4 DB-1～DB-5、HT-2 |
| AC-18-01～AC-18-06 | §5 |
| AC-21-03 | `PersistedData` 不含音訊；`RuntimeState` 禁放語音實例；（v0.9）`MediaStream`、`AudioContext`、`AnalyserNode` 與收音條音量值不得進入 `AppState` 或任何儲存（`RuntimeState` 註解） |
| AC-23-01～AC-23-06 | `DataSourceEntry`、`BuiltinVocabItem.sources`／`phoneticSource`／`meaningSource`／`contentSource`、`ProjectLicenseInfo`、§4.3、L-4、L-6、V-SRC-01～05 |
| AC-23-02（ECDICT 修改說明）、AC-23-03、E-37、NFR-3（音標標 ECDICT = 0、出處不一致 = 0） | §3.2 M-1～M-7、L-4、L-6、V-VOC-09、V-VOC-15～18 |
| AC-24-01～AC-24-09 | `BackupFile`、`ImportResult`、`ImportErrorCode`、§6（含 IM-1～IM-7） |
| AC-18-05（重設時機） | §5.3 RS-1～RS-4 |
| AC-19-04 | C-4（純資料字面值，利於 SD 估算大小） |
| AC-10-02、AC-17-06、AC-20-03、AC-27-01（v0.8 畫面名稱與導覽順序） | `TAB_LABELS`、`NAV_TAB_ORDER`、`TabId`（識別字不改，R-15） |
| AC-18-01、AC-24-02（v0.8 新增的今日紀錄與歷史） | `PersistedData.todayLearned`、`learnedHistory`、§6.1、§6.3 |
| AC-18-02、AC-25-01～AC-25-11 | `EntryMode`、`RuntimeState.entryMode`、`STORAGE_KEYS.state`、§5.5 FS-1～FS-7、V-ST-13 |
| AC-24-06、AC-24-10、AC-24-11 | `SUPPORTED_SCHEMA_VERSIONS`、`BackupFile.schemaVersion`、§5.3 MG-1～MG-4、§6.2 步驟 3～7、IM-8、§6.3 |
| AC-26-01、AC-26-02、AC-26-04（AC-26-03 v0.10 暫停） | `COLOR_LEVELS`（`dailyNewWords`、`vocabTarget`、`status`、`scenarioZh`；`scoreMin`／`scoreMax` 不顯示）；（v0.12 精簡列表，首次畫面與一般頁相同）`SEMANTIC_COLORS.level`、`LAYOUT_TEXTS.levelLocked`、§11.5 FT-3；列的尺寸與透明度屬設計層 |
| AC-27-01～AC-27-05、AC-28-01～AC-28-08、AC-29-01～AC-29-03、AC-31-01～AC-31-04 | 設計層（§5.6）；狀態面：`NAV_TAB_ORDER`、`flashcard.isFlipped`、`VocabQuizQuestion.selectedIndex`、`Part5Progress.lockedSelection` |
| AC-30-01、AC-30-02、AC-30-05、AC-30-08、AC-30-10 | §5.4 LR-6（X、D、長條圖）與末段（v0.12 3 格數據算法、空狀態；小環形圖已移除）、`DASHBOARD_CHART_DAYS`、`COLOR_LEVELS.dailyNewWords`、`LAYOUT_TEXTS.todayRing`／`stat*`、`SEMANTIC_COLORS.goalReached`、`COLOR_TOKENS.brand`（未達成進度色） |
| AC-30-03、AC-30-04、AC-30-06、AC-30-07、AC-30-11 | `LearningEventKind`、`TodayLearnedState`、§5.4 LR-1～LR-5、V-ST-12 |
| AC-30-09、AC-30-12、AC-30-13 | `LearnedHistory`、`LEARNED_HISTORY_DAYS`、MG-1～MG-4、RD-1、RD-2、V-ST-09～V-ST-11 |
| AC-30-14 | §5.4 LR-7、`RuntimeState.learningQuotaNoticeShown`、IM-7 |
| AC-01-02、AC-01-07、AC-03-05、AC-11-07、AC-17-02、AC-25-02、AC-25-06、AC-26-02、AC-30-06（v0.9 修訂部分） | §5.7 CI-1、CI-3、CI-8；LR-4、V-ST-12 |
| AC-32-01、AC-32-04～AC-32-08 | §5.7 CI-1～CI-3、CI-9、CI-10（「有學習紀錄」對應表）、`GoalState.effectiveColor` |
| AC-32-02、AC-32-03、AC-32-09、AC-32-10 | `LEARNING_PROGRESS_FIELDS`、§5.2 預設值、§5.7 CI-4、CI-5、CI-8（清除／保留欄位表）、V-ST-14 |
| AC-32-11 | §5.7 CI-5～CI-7、IM-7、`StorageStatus` |
| AC-33-01～AC-33-08 | **無持久化欄位**；音訊物件與音量不得進入 `AppState`／儲存（`RuntimeState` 註解）；門檻 T1～T5、分析方式、音軌釋放屬設計層（§9.3 DS-01～DS-03） |
| AC-20-03、AC-20-04、AC-27-01、AC-27-04、AC-17-06（v0.9 導覽 4 項） | `NAV_TAB_ORDER`、`HIDDEN_TAB_IDS`、`TabId`、§5.8 HT-1～HT-5、V-ST-15 |
| AC-34-01 | `PWA_MANIFEST`、`PwaManifest`、`PwaManifestIcon`、§10.3 MF-1～MF-4、HD-2、V-PWA-02、V-PWA-03 |
| AC-34-02 | `PWA_MANIFEST`（`name`、`start_url`、`display`、`background_color`）、MF-2、PE-1；首次畫面／主控台沿用 §5.5 FS-1 |
| AC-34-03 | `PWA_DEPLOY_FILES`（`sizePx`、`purpose`）、§10.2 DP-4（v0.12 (d) 改以 80% 安全圓判定）、DP-5、V-PWA-03 |
| AC-34-04 | `PWA_THEME_COLOR`（v0.12 `#1e9bf0`）、`PWA_BACKGROUND_COLOR`（v0.12 `#eef4fa` = `COLOR_TOKENS.background`）、HD-1、V-PWA-04、VC-5 |
| AC-34-05（iOS 實機） | `PWA_APP_NAME`、`icons/apple-touch-icon-180.png`（DP-4）、HD-1（`apple-mobile-web-app-title`、`apple-mobile-web-app-capable`）、HD-2（動態 `apple-touch-icon`）、FB-38、FB-43 |
| AC-34-06、AC-34-08 | `PwaRuntimeState`（`eligible`、`standalone`、`installPromptAvailable`、`installSuppressed`）、§10.5 PE-1～PE-3、§10.8 IN-1～IN-3、FB-40 |
| AC-34-07、AC-34-09、AC-34-10 | `PWA_TEXTS.installButton`、`RuntimeState.pwa`、§10.8 IN-1～IN-7、V-PWA-09、FB-42；（v0.12 位於「資料備份」展開區內）`RuntimeState.dashboard.backupExpanded`、DB-6 |
| AC-35-01 | `PWA_PRECACHE_URLS`、`PWA_CACHE_PREFIX`、§10.6 SW-1、SW-4、SW-5、`storage-schema.json` `meta.browserStoragePolicy.cacheStorage`、FB-39 |
| AC-35-02、AC-35-03 | `PWA_PRECACHE_URLS`（`./` 與 `./index.html`）、SW-6 |
| AC-35-04、AC-22-05（v0.12 量測點改為「開始今日學習」可點擊） | PE-4（PWA 初始化不阻擋首次繪製）、SW-6（快取優先）、`LAYOUT_TEXTS.startToday`／`startLearning` |
| AC-35-05 | SW-4（安裝失敗不留下部分快取）、PE-3 |
| AC-36-01、AC-36-02 | `PWA_BUILD_ID_PATTERN`、`PWA_BUILD_ID_META_NAME`、§10.6 SW-2、SW-3、V-PWA-06 |
| AC-36-03 | §10.7 UP-1～UP-7、`PwaPageToSwMessage`、`PWA_TEXTS.updateNotice`／`updateButton`、`PWA_UPDATE_RECHECK_MS`、SW-1（`updateViaCache: "none"`）、SW-4（`cache: "reload"`） |
| AC-36-04、AC-37-06 | §5.1、§10.10 PV-1、UP-8；`storage-schema.json` 結構未改（`schemaVersion` 2） |
| AC-36-05 | `PWA_CACHE_PREFIX`、SW-9 |
| AC-36-06 | UP-9 |
| AC-36-07 | `PWA_DEPLOY_FILES`、§10.2 DP-1～DP-3、DP-6、V-PWA-01 |
| AC-37-01、AC-37-02 | §10.5 PE-1、PE-2、§10.4 HD-1～HD-3、V-PWA-07 |
| AC-37-03、AC-37-04 | PE-1、PE-3、V-PWA-08 |
| AC-37-05 | §10.10 PV-2～PV-7、SW-6～SW-8、SW-10、MF-1（封閉欄位集合）、HD-4（favicon）、FB-37 |
| AC-21-01、AC-21-03（v0.11 修訂） | §10.10 PV-3、PV-5、PV-6；`storage-schema.json` `meta.browserStoragePolicy` |
| AC-19-01（v0.11 修訂） | §10.2 DP-2、§10.4 HD-3（同目錄相對路徑、`file://` 下不得產生請求） |
| AC-24-12 | `PWA_TEXTS.backupOriginNotice`、§10.9 NT-1；（v0.12 收合規則）`RuntimeState.dashboard.backupExpanded`、DB-6 |
| AC-23-02、AC-23-06（v0.11 品牌標識聲明） | 聲明文字由 pg-frontend 依 PRD 原文組字，名稱取 `PWA_APP_NAME`、著作權人取 `ProjectLicenseInfo.copyrightHolder`；`sources.js` 格式不變。（v0.12）「資料來源與授權」只由頁尾連結開啟（HT-2）；ORIGINAL `fullName` 改為「EnglishContext 原創內容」（§4.3，pg-content 修改值，DS-19） |
| AC-24-01、AC-24-10、AC-30-12、AC-32-02（v0.12 改寫部分） | AC-24-01：DB-6（先展開「資料備份」）、§6.1 檔名不變；AC-24-10、AC-30-12、AC-32-02：§5.4 末段近 7 天空狀態、`LAYOUT_TEXTS.chartEmpty`；AC-32-02「已掌握 0 字」：`LAYOUT_TEXTS.statMasteredCount` |
| AC-25-01～AC-25-03、AC-25-06、AC-25-10、AC-26-06（v0.12 改寫部分） | §5.5 FS-3、§11.5 FT-1～FT-6（首次畫面標題、摘要行）；§11.4 DB-4（目標行格式、依 `goal.appliedColor`／`effectiveColor`）；資料行為依 FS-4、FS-5、GS-3 不變 |
| AC-33-02（v0.12 刪除「主控台入口」字樣） | HT-2（主控台無模組入口）；`RuntimeState.currentTab` 註解（離開 `flashcards` 釋放麥克風）不變 |
| AC-36-01（v0.12 (b) 改為「會進入交付 HTML 的字元」） | §10.6 SW-2 不變（BUILD_ID 以寫入前的 HTML 計算，資料檔註解被建置捨棄時 HTML 不變、BUILD_ID 不變，屬正確行為）、V-PWA-06（v0.12 文字同步） |
| AC-38-01～AC-38-04、AC-38-06 | `COLOR_TOKENS`、`SEMANTIC_COLORS`、§11.2 VC-1～VC-8、V-LAY-01～V-LAY-04 |
| AC-38-05、AC-38-10、E-94 | `APP_DISPLAY_NAME`、`FROZEN_IDENTIFIERS`、§11.1 NM-1～NM-6、§4.3 ORIGINAL、V-LAY-05、V-LAY-06 |
| AC-38-07、AC-38-08、AC-38-09 | 設計層（§5.6 v0.12 段）；AC-38-08 單字卡結構與 `RuntimeState.flashcard` 不變；AC-38-09 展開收合狀態：DB-6 |
| AC-39-01～AC-39-07、AC-39-09、AC-39-10 | §11.4 DB-1～DB-5、`LAYOUT_TEXTS`（主控台段）、§5.4 末段、HT-2；尺寸與位置屬設計層 |
| AC-39-08、E-90、E-91 | `DashboardRuntimeState`、`RuntimeState.dashboard`、§11.4 DB-6、V-LAY-07；`storage-schema.json` 未改 |
| AC-40-01～AC-40-03 | §11.6 MT-1、MT-2（進度由 `part5.currentIndex`、`phase`、題庫長度推導，不新增狀態）、`COLOR_TOKENS.brand`、`SEMANTIC_COLORS.correct`／`wrong` |
| AC-41-01～AC-41-04、E-93 | §11.5 FT-1～FT-6、`LAYOUT_TEXTS`（首次畫面段）、`COLOR_LEVELS`、`goal.draftScore`（GS-1）、§5.5 FS-2～FS-5；固定底部列與捲動行為屬設計層 |

---

## 9. 回饋上游

「影響 PRD」= 需要回 `/pm-draft` 修訂；「待辦」= 不改 PRD，但需人類／主控／SD 處理。

| 編號 | 事項 | 對象 | 類型 | 建議 |
| :--- | :--- | :--- | :--- | :--- |
| FB-01 | ~~TSL、BSL 授權未確認~~ | — | **已解除（v0.2）** | 主控 2026-10-29 查官網：TSL、BSL 1.2 皆 CC BY-SA 4.0 International，已登錄 §4.3，可收錄 |
| FB-02 | ~~ECDICT commit SHA 與 LICENSE 原文未存檔~~ | — | **已解除（v0.4）** | 主控已存 `sources/ecdict/SOURCE.txt`（commit `ab22ad3`，`version` = `"master@ab22ad3"`，§4.3）與 `sources/ecdict/LICENSE` |
| FB-03 | ~~NGSL、NAWL 版本、作者、網址、字數未核對~~ | — | **已解除（v0.2）** | 四份字表官網原文已登錄 §4.3 |
| FB-04 | ~~ECDICT 子集未到位~~ | — | **已解除（v0.4）** | 主控已產出 `sources/ecdict/` 全部檔案（含繁體版 `ecdict_subset_zhtw.csv`、`tw_terms.tsv`），§3.2 狀態改為已到位；SD 不需再列前置任務 |
| FB-05 | `N_B` = 2,809、`N_G` = 5,620；主控 2026-10-30 已改以 C-2 wordKey 依 R-1～R-4 實算，各段新增 NGSL 2,809、TSL 1,250、BSL 1,169、NAWL 392，與 §4.2 一致；ECDICT 子集 5,616 + missing 4 = 5,620 亦吻合 | pg-content、QA | **大部分解除（v0.4）**；剩餘待辦 | 剩餘：pg-content 產出字庫時仍依 V-IN-07、N-1 自行重算驗證；不一致時回報，由 SA 再修訂契約 |
| FB-06 | AC-04-01 表單「論文例句」對應哪個卡片欄位不明確；契約定為 `example`（卡背「完整例句」），手動自訂單字的 `academicContext` 恆為空（依 AC-06-07 呈現） | PM | 影響 PRD（輕微，可選） | 若希望對應到「學術文獻應用情境」，請 PM 在 AC-04-01 註明，契約再改 |
| FB-07 | PRD 未規範刪除「已掌握」的自訂單字時掌握數是否減少；契約定為同時移除（掌握數 −1），與 AC-24-08「不存在的已掌握單字不計入」一致 | PM | 影響 PRD（輕微，確認即可） | 請 PM 確認或補一條 AC |
| FB-08 | ~~AC-02-08「已設定目標分數 735」可解讀為未套用~~ | — | **已解除（v0.10）** | PRD v0.10 AC-02-08 改寫為「已點選藍色卡片並套用（855）」，不再有歧義；契約仍同時保存 `draftScore` 與 `appliedScore`（GS-1～GS-3） |
| FB-09 | PRD 未規範打卡中斷（相隔 ≥ 2 天）但尚未學習時顯示的天數；契約定為顯示 0，學習後變 1 | PM | 影響 PRD（輕微，確認即可） | 請 PM 確認或補 AC |
| FB-10 | ~~ECDICT 釋義為簡體、音標多為英式標註，AC-23-01 範例「音標、釋義：ECDICT」可能不成立~~ | — | **已解除（v0.4）** | 依 PRD v0.6 R-13：釋義轉繁精簡標 ECDICT、音標全部原創、卡片依欄位來源顯示。契約已改 V-VOC-09、L-4、新增 L-6、M-1～M-7、V-VOC-15～18；`phoneticSource` 型別收窄為 `"ORIGINAL"`。SD 拆任務時納入 M-3 人工修正與 V-VOC-18 抽查比例 |
| FB-11 | AC-09-06 只規範「少於 4 個字」；單字集 ≥ 4 字但相異釋義不足 4 種時也無法出題；契約定為顯示同一提示 | PM | 待辦（知會） | 不需改 PRD |
| FB-12 | ~~`synergy` 在 `BSL_120_stats.csv`（BSL Rank 1564）屬內建字庫，「商管」範本注入時會被略過，AC-05-03「自訂清單包含 Synergy」無法成立~~ | — | **已解除（v0.3）** | 依 PRD v0.5 R-12，人類決議採建議 A：AC-05-03 商管代表字改為 Monetization（已確認不在 `sources/wordlists/` 任何 csv），AC-04-07 範例字改為 `monetization`。契約 V-TPL-02 改為 business 範本必須含 wordKey `monetization`；V-TPL-03 不變 |
| FB-13 | AC-11-05 未規範「已作答未按下一題」時重新載入的狀態；契約保存 `lockedSelection`，重載後維持鎖定，避免重複計分（AC-11-06） | PM | 待辦（知會） | 不需改 PRD |
| FB-14 | AC-06-01、AC-06-07 只允許學術情境空白，因此所有內建單字（含功能詞）的 `collocation`、`example` 都必填，內容量約 `N_G` × 2 筆原創文字 | SD | 待辦（知會，R-01） | SD 依排名區間分批拆 CT 任務並訂抽樣比例 |
| FB-15 | 排名 `N_B` 之後的排序採 PRD 建議 TSL → BSL → NAWL，各段依原表順序（§4.1） | 人類 | 待辦（知會，SA 定案） | 契約核准即視為同意 |
| FB-16 | R-11（自訂空白顯示「—」或隱藏）未決；契約只規定未填欄位存 `""`，呈現依現行 AC-06-07，不自行統一 | 人類 | 待辦（知會） | 維持現狀 |
| FB-17 | 字庫欄位名稱與重複的來源代碼佔檔案大小；契約已用短代碼（`"NGSL"` 等），是否需更精簡由 SD 依 AC-19-04 估算 | SD | 待辦（知會，R-02） | SD 估算後若接近 5 MB 再提契約修訂；v0.2 `N_G` = 5,620，可據此估算 |
| FB-18 | （v0.2 新增）NAWL 959 字中 567 字已在 NGSL／TSL／BSL，只新增 392 字；綠色 5,620 字中學術字表獨有貢獻約 7%。對「碩士先修」情境（`COLOR_LEVELS.green.scenarioZh`）的學術字量支撐較弱 | 人類 | 待辦（知會） | 不影響契約；若人類希望加重學術字，需回 PM 討論排名規則或色級設計 |
| FB-19 | （v0.2 新增）NAWL 輸入檔無排名欄、為字母序，R-4 只能依檔案列順序，排名 5,229～5,620 不代表頻率高低 | 人類、PM | 待辦（知會） | 若需依頻率排序，需人類另行提供含排名的 NAWL 統計檔（如官網 stats 版），契約再改 R-4 |
| FB-20 | （v0.2 新增）BSL、NAWL 檔案筆數（1,744、959）與官網字數（1,700、957）不同；契約以檔案為準，`originalItemCount` 填檔案實數，「資料來源與授權」頁若同時顯示官網字數可能讓使用者困惑 | 人類、SD | **已結案（v0.6）** | CT-01 回饋 2：已檢查重複、註解、變體，差異**無法從檔案內容解釋**（V-IN-06 記為「無法判定」）。依 SD 決議（architecture.md 回饋表 FB-20，FE-17）：畫面不顯示官網字數與 `originalItemCount`，只顯示實際收錄數 `includedItemCount`；`originalItemCount` 仍填檔案實數供 QA；排名以檔案為準不變。人類若想查明差異，需向字表作者或官網確認，不影響本專案交付 |
| FB-21 | （v0.2 新增）R-06(2) 要求保留 MIT 聲明，契約新增 `copyrightNotice`、`licenseText` 並要求「資料來源與授權」頁顯示全文；AC-23-02 未列此項但不衝突 | PM、SD | 待辦（知會） | SD 設計頁面時納入可摺疊的授權全文區；PM 可選擇補進 AC-23-02 |
| FB-22 | （v0.4 新增）SA 比對兩檔發現 `s2twp` 對部分詞是**過度轉換**而非「未轉換」：簡體「程序」60 列在 `_zhtw` 只剩 4 列（procedure 已被改成「程式」）；簡體「文件」→「檔案」、「文档」→「文件」（document 變成「檔案, 公文, 文件」）。`SOURCE.txt` 寫「程序（procedure 保留）」易誤解為 `_zhtw` 仍保留原詞 | 主控、SD | 待辦（知會） | 不需重新產檔；契約已在 M-3 註明須回查簡體原檔，V-VOC-17 以簡體原檔的詞建清單。SD 估算 CT 工作量時把此項人工修正納入；主控可選擇在 `SOURCE.txt` 補註 |
| FB-23 | （v0.5 新增）AC-06-07「畫面不得出現 `undefined`、`null` 字樣」的情境是「欄位為空」；內建字庫收錄英文單字 null（排名 4,646），該卡會正當顯示 null 字樣（如 `null hypothesis`） | QA、PM | 待辦（知會） | 不需改 PRD；QA 驗 AC-06-07 時以「空欄位是否顯示 undefined／null」為準，wordKey = `null` 的卡片內容不算違反（V-VOC-10、DF-06） |
| FB-24 | ~~（v0.6 新增，FE-07 #3）匯入步驟 8 非容量不足的寫入例外，PRD 無對應文字~~ | — | **已解除（v0.7，依人類決議）** | JimmyLin 2026-10-30 決議：`write_failed` 畫面文字定為「儲存失敗，未匯入」（原暫定文字直接定案），IM-6、§6.2 步驟 8 已同步。一般寫入（§5.3，非匯入）的非容量例外提示本次未決議，維持現行契約（未規定提示文字） |
| FB-25 | ~~（v0.6 新增，CT-13）`PartOfSpeech` 沒有「字首」，純字首字借用 `["adj."]`，畫面顯示「形容詞」~~ | — | **已解除（v0.7，依人類決議）** | JimmyLin 2026-10-30 決議採用新增詞性：`PartOfSpeech` 新增 `"pref."`、`POS_LABELS` 新增「字首」；M-8 寫法 (2) 改為恰為 `["pref."]`，寫法 (1) 字首義在末段時 `pos` 最後加 `"pref."`；M-4、V-VOC-07 同步。非持久化，`schemaVersion` 維持 1 |
| FB-26 | （v0.6 新增，CT-10）ECDICT 子集中不少 TSL 多益高頻字缺少核心義，依 M-6 改標 `"ORIGINAL"`，ECDICT `includedItemCount` 將少於 5,616 | 人類、QA | 待辦（知會） | 不需改 PRD；N-3 已註明最終實數以 CT-23 為準。AC-23-03「釋義來源依實際標示」仍成立 |
| FB-27 | （v0.8 新增）AC-24-11 規定捨棄無效歷史項目但未說明是否計入 AC-24-08 的「略過 N 筆」；契約定為**不計入**（N 只計自訂單字與已掌握單字，IM-8），避免使用者把「歷史過期被修剪」誤解為資料遺失 | PM | 影響 PRD（輕微，確認即可） | 若希望計入或另行提示，請 PM 在 AC-24-11 註明 |
| FB-28 | （v0.8 新增）AC-30-13 的「今日紀錄日期不是今天」未區分「合法的過去／未來日期」與「格式錯誤或不存在的日期字串」（如 `"yesterday"`、`"2026-02-30"`）；契約把後者也視為「不是今天」（項目層級，X = 0），只有 `date` 非字串且非 null 才算「整個欄位型別錯誤」。因此匯入時 `todayLearned.date = "yesterday"` 不會被拒絕（AC-24-11 的格式錯誤只限 shape 不符，IM-8） | PM、QA | 待辦（知會，SA 定案） | 不需改 PRD；QA 依 IM-8、V-ST-09 判定 |
| FB-29 | （v0.8 新增）降版不相容：資料升級為 `schemaVersion` 2 後，若使用者改回 v0.7 程式，v0.7 會依 AC-18-05 重設（原字串保留在 `unreadable` 鍵）；v0.7 程式也無法匯入本版匯出的備份（版本不相容）。PRD 未要求降版相容 | 人類 | 待辦（知會） | 不需改 PRD；如需要，可在發布說明提醒「升級後請勿再用舊版檔案開啟」 |
| FB-30 | （v0.8 新增）為滿足 AC-30-09「今天的歷史字數等於 X」，當 `todayLearned` 不是今天（X = 0，例如該欄損壞被重設）而 `learnedHistory` 仍有今天的紀錄時，契約刪除今天的歷史紀錄（V-ST-11）；另依 AC-30-13，時鐘被調回時「未來日期」的歷史會被刪除，時鐘調回正確後不會恢復 | 人類、QA | 待辦（知會） | 不需改 PRD；兩者皆依 PRD 文字直接推得 |
| FB-31 | （v0.8 新增）PRD 未規範：(a) 首次畫面按「開始學習」時 localStorage 寫入失敗（容量不足等）；(b) localStorage 停用時從首次畫面「從備份還原」。契約定為 (a) 仍進入主控台並依 §5.3 提示，但主鍵仍不存在，下次開啟會再顯示首次畫面（直到某次寫入成功）；(b) 依 §6.2 步驟 9 只套用記憶體並進入主控台（FS-4、FS-5） | PM | 影響 PRD（輕微，確認即可） | 請 PM 確認，或補進 AC-25-08／AC-25-11 |
| FB-32 | （v0.8 新增）`todayLearned.wordKeys` 為完整單字清單（PRD R-17 指定「今日已學單字清單」），未設固定上限；單日學習全部 5,620 字的極端情況約增加 70 KB，仍遠低於 localStorage 常見 5 MB 上限 | SD | 待辦（知會） | 不需改 PRD；SD 估算容量時納入 |
| FB-33 | （v0.9 新增）US-32「有學習紀錄」(d) 今日已學數 X > 0 與 (e) 近 30 天歷史有字數 > 0 的日子，在資料上必然連動：依 V-ST-11 `learnedHistory[today]` 恆等於 X，因此 X > 0 時 (e) 也成立，AC-32-07「只讓 (d) 成立、其餘 5 項不成立」的狀態無法構造。契約把 (e) 定為**只看 today 以外的日子**（today − 29 ～ today − 1，§5.7 CI-2），(a)～(f) 的 OR 判斷結果與 PRD 原文完全相同 | PM、QA | 待辦（知會，SA 定案） | 不需改 PRD；QA 構造 AC-32-07 的 (d) 狀態時，歷史只放 today 一筆（= X），依本契約判 (e) 不成立 |
| FB-34 | （v0.9 新增）AC-32-11 (b)、E-63 對初始化寫入的**任何**例外都顯示「儲存空間不足，未套用」；與匯入不同（匯入區分 `quota` 與 `write_failed`「儲存失敗，未匯入」，IM-6）。非容量原因（如 `SecurityError`）時訊息與實因不符 | PM | 影響 PRD（輕微，可選） | 契約依 PRD 原文（CI-7）。若希望與匯入一致，請 PM 在 AC-32-11 補「其他寫入例外顯示『儲存失敗，未套用』」，契約再改 |
| FB-35 | （v0.9 新增）AC-32-04 要求取消後分數回到 600，且 localStorage 與按「套用」前完全相同；但按「套用」前改分數時 `goal.draftScore`（例 300）已依 AC-02-08 寫入。契約定為取消時只還原記憶體 `draftScore`、不立即寫入（CI-9），下一次寫入時才寫出 600。若使用者取消後、任何寫入前就重新載入，滑桿會顯示 300（生效色級仍為綠、單字集不變，同 AC-01-03、AC-01-06 的「未套用」狀態）。**（v0.10 更新）** 畫面已無滑桿；點棕卡片時 `draftScore` = 465 已寫入，取消後任何寫入前重新載入，選中卡片會是棕（GS-1），生效色級仍為綠、單字集不變（同 AC-01-03） | PM、QA | 影響 PRD（輕微，確認即可） | 請 PM 確認此行為可接受；若希望重新載入也選中綠卡片，需放寬 AC-32-04 為「localStorage 中除 `draftScore` 外皆相同」，契約改為取消時立即寫入 |
| FB-36 | （v0.10 新增）AC-26-06 的前置條件「目標分數分別設為 10、215、…、735（以 DevTools 修改）」只寫一個值，但資料有 `draftScore`（決定選中卡片，GS-1）與 `appliedScore`（目標分數）兩欄。若只改 `appliedScore`、`draftScore` 仍是別的值，選中卡片與「直接套用」後的分數會依 `draftScore`，AC 不成立 | QA、PM | 待辦（知會，SA 定案） | 不需改 PRD；QA 構造 AC-26-06 狀態時**兩欄設為同一值**（與正常套用後的資料一致），`appliedColor`／`effectiveColor` 可任填合法值（讀取時依 V-ST-02 重算）；匯入備份的方式同理 |
| FB-37 | （v0.11 新增）AC-37-05 要求頁面請求「全部在部署目錄內」，但 HTML 沒有 `<link rel="icon">` 時，Chrome 會自動請求網域根目錄的 `/favicon.ico`（不在部署目錄、也不在預先快取清單），違反該 AC。契約以 HD-4 規定 HTML 靜態放 `<link rel="icon" href="data:,">`（`data:` 網址不產生網路請求），https 版可改指向預先快取清單內的 `icons/icon-192.png` | PM、QA | 待辦（知會，SA 定案） | 不需改 PRD；QA 驗 AC-37-05 時若看到 `/favicon.ico` 請求即為缺陷 |
| FB-38 | **已解除（v0.12）**：PRD v0.12 AC-34-05 已改為「檢查載入後的頁面元素」並註明連結由程式動態加入。原文：（v0.11 新增）AC-34-01、AC-34-05 寫「檢查原始碼」頁面有 manifest 與 `<link rel="apple-touch-icon">`，但 R-20 PM 判斷 (d) 與 AC-37-01 要求 `file://` 下不得讀取 manifest，契約因此禁止 HTML 靜態寫入這兩個 `<link>`，只在 PE-1 成立時以程式加入（HD-2、HD-3）。交付 HTML 原始檔中**不會**有這兩個標籤 | QA、PM | 待辦（知會，SA 定案） | 不需改 PRD；QA 以載入後的 DOM（DevTools Elements）檢查，原始檔只檢查加入連結的程式與 PE-1 條件。若 PM 希望文字一致，可把 AC-34-05「檢查原始碼」改為「檢查載入後的頁面元素」 |
| FB-39 | （v0.11 新增）AC-35-01 要求「本專案快取恰為 1 個」。依 Q-43 決議 A，新版已安裝但使用者尚未按「重新整理」期間，舊版快取（使用中）與新版快取（等待中）會同時存在，共 2 個；新版啟用時才刪除舊版（SW-9） | QA | 待辦（知會） | 不需改 PRD；AC-35-01 為首次造訪情境不受影響；AC-36-05 依 PRD 在 V2 **啟用後**檢查。QA 不要在等待期間以 AC-35-01 判定 |
| FB-40 | **已解除（v0.12）**：PRD v0.12 AC-34-08 已補註 (e) 按鈕是否出現由瀏覽器決定、不視為缺陷。原文：（v0.11 新增）AC-34-08 (e)「已安裝後以瀏覽器分頁開啟」不顯示按鈕：網頁無法可靠判斷「本應用已安裝但目前在分頁中」（`getInstalledRelatedApps` 需要 manifest `related_applications`，契約 MF-1 為隱私禁止此欄）。契約依賴 Chromium「已安裝時不觸發 `beforeinstallprompt`」的行為（IN-3），沒有另外的偵測 | PM、QA | 待辦（知會） | 不需改 PRD；若某瀏覽器版本在已安裝時仍觸發事件，按鈕會出現，屬瀏覽器行為，建議比照 AC-34-09 (b) 的「是否再次觸發由瀏覽器決定，不視為缺陷」處理；如 PM 同意，可於 AC-34-08 補註 |
| FB-41 | **已解除（v0.12）**：PRD v0.12 Q-54 決議 A，`theme_color` 改為 `#1e9bf0`；`background_color` 依 AC-34-04、AC-38-02 改為新背景 `#eef4fa`（§10.3、VC-5）。原文：（v0.11 新增）PRD 未指定 `theme_color` 的色值（AC-34-01 只要求格式 `#RRGGBB`、AC-34-04 只要求與 meta 相同）。SA 定為 App 主色 `#2f6fd6`（`--primary`）；`background_color` 依 AC-34-04 定為首次畫面 body 背景 `#f6f7f9`（`--bg`） | 人類 | 待辦（知會，SA 定案） | 契約核准即視為同意；若人類想改用圖示的藍色，只需改 `PWA_THEME_COLOR` 與 `PWA_MANIFEST.theme_color`（不涉持久化，可由主控代核） |
| FB-42 | （v0.11 新增）AC-34-07 允許 QA「以替身事件觸發」`beforeinstallprompt`。契約 IN-3 規定只接受具有 `prompt` 函式的事件（避免按下按鈕時拋出錯誤，AC-34-09 (c)），以 `new Event("beforeinstallprompt")` 建立的空事件會被忽略、按鈕不顯示 | QA | 待辦（知會） | 不需改 PRD；替身事件須附 `prompt()`（回傳 Promise）與 `userChoice`（Promise，值 `{ outcome: "accepted" \| "dismissed" }`），並可呼叫 `preventDefault()` |
| FB-43 | （v0.11 新增）AC-34-05（iOS 實機）：iOS Safari 是否採用「載入後才由程式加入」的 `<link rel="apple-touch-icon">` 與 manifest，SA 無法驗證；契約另加靜態 `apple-mobile-web-app-capable`、`apple-mobile-web-app-title`（不產生請求）降低風險（HD-1） | 人類、SD | 待辦（知會，風險） | 不需改 PRD；人類實機驗證若圖示不正確，可改為 HTML 靜態寫入 `apple-touch-icon`（Chrome／Edge 在 `file://` 下不讀取此標籤，不影響 AC-37-01 的 Chrome／Edge 驗證），屬契約小修，可由主控代核 |
| FB-44 | （v0.12 新增）PRD 與樣稿 `docs/mockups/v0.12-layout-demo.html` 的文字不一致：(a) AC-41-01 副標寫作「之後可以在『難易度設定』隨時變更」，『』是引號內再引用的寫法，樣稿顯示為「難易度設定」；(b) 樣稿收合區塊標題為「資料備份與安裝」，PRD 為「資料備份」（AC-39-08）；(c) 樣稿按鈕為「開始今日學習 →」，PRD 為「開始今日學習」 | QA、PM | 待辦（知會，SA 定案） | 依 PRD「樣稿與 AC 不一致時以 AC 為準」：(a) 畫面字串定為 `之後可以在「難易度設定」隨時變更`（`LAYOUT_TEXTS.firstRunSubtitle`）；(b) 用「資料備份」；(c) 文字為「開始今日學習」，箭頭若加須為 `aria-hidden` 裝飾。PM 若要 (a) 顯示『』，改常數即可（主控代核） |
| FB-45 | （v0.12 新增）AC-39-04 目標行規定「分別套用」各色後的文字，未說明在一般難易度設定頁**點了卡片但未按「套用」**時主控台顯示什麼 | PM、QA | 待辦（知會，SA 定案） | 契約定為目標行一律依已套用值 `goal.appliedColor`／`effectiveColor`（DB-4），與 AC-17-06「每日新字量依生效色級」一致；未套用的 `draftScore` 不影響主控台。不需改 PRD |
| FB-46 | （v0.12 新增）PRD 未給出下列畫面文字：(a) AC-39-08 展開後的「備份說明」；(b) AC-01-01 列表上方「本系統建議字量」說明行除這幾個字以外的內容；(c) AC-38-07 要求主控台各區塊有標題（≥ 18px），但今日任務卡、3 格數據、近 7 天圖表的標題文字未定（樣稿為「今日任務」「近 7 天」） | SD、PM | 待辦（知會） | 契約不定義這些文字（`LAYOUT_TEXTS` 只收 PRD 原文），由 SD 在 architecture.md 定案，限制：不得含「English Master Track」、「官方門檻」「Tier」、分數；AC-39-06 列舉的唯一性文字（「單字掌握率」等）不得在標題中重複出現。PM 若要固定文字，補進 AC 後契約再加常數 |
| FB-47 | （v0.12 新增）AC-40-01 要求進度條 `aria-valuenow` = i（第 i 題），但結算畫面沒有「第 i / N 題」 | QA | 待辦（知會，SA 定案） | 契約定為結算畫面 `aria-valuenow` = N、填滿 100%（MT-1）；與 AC-40-01「結算畫面為 100%」一致 |
| FB-48 | （v0.12 新增）PRD 色彩 token 表說「建議值由 SD 定為架構常數」，但 `background_color` 依 AC-34-04 須等於 body 背景，而 manifest 值是契約常數（§10.3）。契約因此把 token 定為 `COLOR_TOKENS`（固定值不得改；建議值為預設） | SD、主控 | 待辦（知會，SA 定案） | SD 若在 PRD 條件內改用其他背景值，須同時提契約小修改 `COLOR_TOKENS.background`、`PWA_BACKGROUND_COLOR`、`PWA_MANIFEST.background_color`（不涉持久化，主控代核，VC-5）；`brandDeep`、`accentText` 改值只需記入 architecture.md 並通過 VC-2、VC-3 條件，契約常數同步更新即可 |
| FB-49 | （v0.12 新增）AC-38-10 (1) 要求畫面文字不出現「English Master Track」（不分大小寫），(2) 又要求匯出檔名前綴 `english-master-track-backup-` 不變。下載檔名會出現在瀏覽器的下載介面 | QA | 待辦（知會，SA 定案） | 契約把瀏覽器下載介面、DevTools、Cache Storage、localStorage 中出現的 `FROZEN_IDENTIFIERS` 視為**不屬 App 畫面文字**，不違反 (1)；App 自己的畫面（含匯出成功提示、錯誤訊息）不得顯示檔名或這些識別字（NM-6）。且 `english-master-track` 以連字號分隔，本來就不等於「English Master Track」字樣 |

### 9.1 下游回饋處理紀錄（v0.5，/pg-run 階段）

| 編號 | 來源 | 事項 | 決議 | 修改位置 |
| :--- | :--- | :--- | :--- | :--- |
| DF-01 | SD-FB-03 | 自訂字與不在目前色級範圍的內建字同 wordKey 時的處理 | **確認 SD 做法**：只與本次截取的內建卡去重，範圍外保留自訂卡；另補 V-ST-06 刪除時的對應例外 | V-ST-04、V-ST-06；`data-schema.ts` `StudyCard` 註解 |
| DF-02 | SD-FB-04 | `data-schema.ts` 的 status 與 README 不同步 | 三檔一起改為 `draft`、version 0.5、核准欄位清空；日後三檔狀態一律同步 | 三檔 frontmatter／meta |
| DF-03 | FE-06 回饋 1 | §6.2 步驟 5 的 V-ST-03 與步驟 7 清理衝突 | **採 FE-06 做法**：步驟 5 放寬 `customVocab` id／wordKey 不重複，清理後完整驗 V-ST-03；讀 localStorage 仍嚴格 | §6.2 步驟 5、7，IM-1，V-ST-03，§5.3；`storage-schema.json` `BackupFile` 說明 |
| DF-04 | FE-06 回饋 2 | `fileVersion` 為字串 `"1"` 時回傳 null、顯示「無」 | **接受**，型別維持 `number \| null`：只有有限數字原樣回傳，其他一律 null，「無」意指無有效版本號 | IM-3；`data-schema.ts` `ImportResult` 註解 |
| DF-05 | FE-06 回饋 3 | 步驟 5 驗證 BackupFile 頂層欄位 | **確認**：依 `$defs/BackupFile`；`date-time` 規定為強制檢查（RFC 3339 + `Date.parse`），亦適用 `savedAt`、`createdAt` | §6.2 步驟 5、IM-2；`data-schema.ts` `BackupFile` 註解；`storage-schema.json` |
| DF-06 | CT-01 | V-VOC-10「不得包含 null」擋掉內建字 null（排名 4,646）及 `null hypothesis` | **改寫 V-VOC-10**：錯誤只限欄位值「等於」`undefined`／`null`（豁免 wordKey = null 的 `word` 欄）；獨立單字出現改為警告；null 本身那筆各欄位明文允許 | V-VOC-10、FB-23 |

另：步驟 5～7 可先於確認對話框執行（IM-4）、未預期例外視為 `format`（IM-5），皆為依現行實作補寫的釐清。

### 9.2 下游回饋處理紀錄（v0.6，/pg-run 後段）

| 編號 | 來源 | 事項 | 決議 | 修改位置 |
| :--- | :--- | :--- | :--- | :--- |
| DF-07 | FE-07 #1 | 讀取失敗時何時以預設值覆蓋主鍵 | **確認 FE 現行做法**：先存 `unreadable`，成功才覆蓋主鍵；存不進去就保留主鍵原值。補註保留只到第一次寫入為止（RS-4） | §5.1、§5.3 RS-1～RS-4、§8 |
| DF-08 | FE-07 #3 | 匯入步驟 8 非容量不足的寫入例外一律回 `quota`，訊息與實因不符 | **新增執行期錯誤碼 `write_failed`**，暫定文字「儲存失敗，未匯入」，交 PM 定案（FB-24）；容量不足判定寫成 IM-7 | §6.2 步驟 8、IM-6、IM-7、V-IMP-01；`data-schema.ts` `ImportErrorCode`、`ImportResult` 註解 |
| DF-09 | CT-03 FB-02、CT-09、CT-13、CT-10 | `s2twp` 過度轉換不只 M-3 所列；ECDICT 原檔錯字；字首字詞性；ECDICT 筆數減少 | M-3 新增過度轉換補充表（支持、类型、实例、触摸、局部、保存、社区、连接、循环、菜单、程序、身份）與判斷原則；V-VOC-15 擋「例項」；V-VOC-17 擴充比對詞；M-2 錯字更正規則；新增 M-8 字首字寫法（不新增詞性）；N-3 註明 ECDICT 筆數以 CT-23 為準 | §3.2 M-2、M-3、M-4、M-7、M-8，§4.2 N-3，V-VOC-07、15、17、18，FB-25、FB-26；`data-schema.ts` `BuiltinVocabItem.pos`／`meaning` 註解 |
| DF-10 | CT-01 回饋 2 | BSL／NAWL 筆數差異無法解釋 | FB-20 **結案**，依 SD 決議畫面只顯示 `includedItemCount`；V-IN-06 允許記為「無法判定」 | §3.2、V-IN-06、FB-20 |

### 9.3 回饋下游（v0.9，給 SD）

| 編號 | 事項 | 契約的立場 | 請 SD 處理 |
| :--- | :--- | :--- | :--- |
| DS-01 | **收音條門檻 T1～T5**（Q-37 決議 A，AC-33-04） | **判定為架構常數，契約不定義**。理由：不持久化、不屬 pg-content 與 pg-frontend 之間的交接資料（只有 pg-frontend 使用），PRD R-18 二也註明「SA：契約不需改」；只在一處定義可避免兩份文件數值不一致 | 在 `architecture.md` 以常數記錄：預設 T1～T5 = **−50、−40、−30、−20、−10 dBFS**；音量 = 最近一個 ≤ 100ms 分析視窗的 RMS，dBFS = 20 × log10(RMS)（滿刻度 0 dBFS；RMS = 0 視為全暗）；音量 ≥ Tn 即點亮第 n 格，亮格從左側連續。**可調範圍**（範圍內由主控代核、不改 PRD）：每格在預設值 ±10 dB 以內；T1 < T2 < T3 < T4 < T5 且相鄰差 ≥ 6 dB；T5 ≤ −9 dBFS。超出範圍須回 PM 修訂 PRD。QA 依架構記錄的值推算 AC-33-04 的 6 段測試音源 |
| DS-02 | 麥克風取得與釋放時機（Q-36 決議 A，AC-33-01、AC-33-02） | 契約只規定：音訊物件不得進入 `AppState`；離開 `"flashcards"` 須釋放（`RuntimeState.currentTab` 註解）；不持久化任何音量值 | 訂定：首次取得時機（STT 支援、說明已讀之後）、同頁重用、離開單字卡頁／重新整理／關閉分頁 1 秒內停止所有音軌與音量分析；更新架構 §7.6 的「不使用 `getUserMedia`」限制與 §10 靜態檢查（只禁止 `MediaRecorder`） |
| DS-03 | `getUserMedia` 錯誤對照（AC-08-09、AC-33-05～AC-33-07、E-04、E-64、E-65） | 執行期，不涉及契約型別；`SttStatus` 不變 | 訂定錯誤名稱 → 訊息對照（權限 →「需要麥克風權限」、`NotFoundError` →「找不到麥克風裝置」、不可用或其他 → 靜默退回 v0.8 行為、收音條全暗），以及 SpeechRecognition `audio-capture` 對應哪個訊息 |
| DS-04 | 初始化確認視窗與原子寫入（US-32） | §5.7 CI-1～CI-10 已定資料面規則（觸發、清除／保留欄位、一次 `setItem`、失敗不套用、取消不寫入） | 設計確認視窗（文字依 AC-32-01、Q-38；Esc／點視窗外 = 取消；背景不可操作；減少動態時無淡入）與「先建新物件、成功才替換記憶體」的實作位置；拆 FE 任務時列 V-ST-14 |
| DS-05 | 隱藏解碼器、句型庫（R-18 三） | `NAV_TAB_ORDER` 改為 4 項、新增 `HIDDEN_TAB_IDS`、§5.8 HT-1～HT-5；資料檔格式不變 | 架構 §7.13 導覽常數與主控台入口改用契約常數；若用 hash 路由，隱藏頁片段依 HT-3 導向主控台；保留解碼器、句型庫程式與資料的打包 |
| DS-06 | 工作範圍 | 持久化結構、`storage-schema.json`、內容資料檔格式皆未變 | v0.9 不需新增 CT 任務（pg-content 無工作）；遷移規則不變，不需新增遷移任務 |

### 9.4 回饋下游（v0.10，給 SD；PRD R-19、Q-39）

| 編號 | 事項 | 契約的立場 | 請 SD 處理 |
| :--- | :--- | :--- | :--- |
| DS-07 | 點卡片設分數（R-19 二） | GS-2：`draftScore` = 該色 `COLOR_LEVELS[].scoreMax`，一律設定；不新增常數 | 移除 Q-32 的「範圍內不變／設為下限」邏輯，改用 `scoreMax`；點卡片未套用的保存與首次畫面不寫入沿用現行做法 |
| DS-08 | 預設分數 725（Q-39） | `SCORE_DEFAULT` = 725 | 架構中若另有寫死 600 的預設值（首次畫面、重設、localStorage 停用）全部改為引用 `SCORE_DEFAULT`；既有資料不遷移、不轉換（GS-4） |
| DS-09 | 隱藏分數輸入與分數顯示（R-19 一、三、四、七） | GS-6；`SCORE_MIN`／`MAX`／`STEP` 只留給資料層驗證（GS-5） | 設計難易度設定頁（一般、首次）移除或隱藏滑桿、輸入框（不可見、不可聚焦，AC-26-05）與分數範圍文字；主控台移除目標分數；畫面輸入的驗證提示與四捨五入程式可保留但不得觸發；AC-22-04 量測點改為點卡片 |
| DS-10 | 工作範圍 | 持久化結構不變（`schemaVersion` 2）、內容資料檔格式不變 | 不需 CT 任務（pg-content 無工作）、不需遷移任務；FE 任務列 V-ST-16 與 AC-26-05、AC-26-06；QA 構造 AC-26-06 狀態依 FB-36 |

### 9.5 回饋下游（v0.11，給 SD；PRD R-20、Q-41～Q-48）

| 編號 | 事項 | 契約的立場 | 請 SD 處理 |
| :--- | :--- | :--- | :--- |
| DS-11 | 建置流程（AC-36-01、AC-36-02、AC-36-07） | §10.2 DP-1～DP-7、§10.6 SW-2、SW-3：部署目錄恰 8 檔、BUILD_ID 由內容計算、不得含時間戳 | 決定部署目錄名稱與位置（例 `dist/site/`）；在 `tools/build.mjs` 加入：產生 `manifest.webmanifest`、計算 BUILD_ID、寫入 HTML meta 與 `sw.js`、複製圖示與 `ads.txt`、V-PWA-01～V-PWA-06 的建置期檢查（不符即中止）。**檢查現有建置是否寫入時間、隨機值或絕對路徑**（會破壞 AC-36-01 (a) 逐位元組相同） |
| DS-12 | `ads.txt` 的來源位置（Q-46） | DP-6：內容與目前 `dist/ads.txt` 逐位元組相同、檔名小寫 | `dist/` 是建置輸出，目前 `ads.txt` 只存在於 `dist/`；若建置會清空 `dist/`，檔案會遺失。請指定來源位置（例如 `src/app/assets/ads.txt`，或另設非 PG 目錄由主控放置）並列入任務 |
| DS-13 | `background_color` 與 CSS 的一致（AC-34-04） | `PWA_BACKGROUND_COLOR` = `--bg`（v0.11 為 `#f6f7f9`；**v0.12 改為 `#eef4fa`**，DS-21、VC-5） | 架構記錄兩者必須相同；建議建置時讀取 `00-base.css` 的 `--bg` 比對，不同即中止；若日後改 `--bg`，同步提契約小修 |
| DS-14 | 圖示 PNG（Q-41、Q-45） | DP-4、DP-5：檔名、尺寸、不透明、maskable 安全區；由主控產生 | 決定 `src/app/` 下的資產目錄（建議 `src/app/assets/icons/`）；主控產圖不列為 PG 任務；FE 建置任務只複製並以 V-PWA-03 檢查 |
| DS-15 | `static.yml`（Q-46，主控修改一次） | DP-1：整個部署目錄上傳 | 提供主控修改內容：建置後上傳部署目錄（取代逐檔 `cp`），不含 `docs/`、`src/`、`sources/` |
| DS-16 | 頁面端模組與 UI | §10.4～§10.9：HD、PE、UP、IN、NT 規則與 `RuntimeState.pwa` | 新增 PWA 模組的位置與初始化時機（PE-4：不阻擋首次繪製，建議 `load` 事件後註冊）；新版提示的位置與樣式（不被底部導覽列遮住、非彈出式、減少動態無動畫，AC-27-03、AC-31-03）；安裝按鈕與 NT-1 說明放主控台「匯出備份」區塊 |
| DS-17 | 測試策略 | V-PWA-01～V-PWA-12 | 單元測試：PE-1 判定表、IN 狀態機（替身事件，FB-42）、UP 流程（替身 registration）；建置測試：AC-36-01 三種情境；V-PWA (b) 本機 `localhost` 靜態伺服器的啟動方式 |
| DS-18 | 工作範圍 | `src/data/` 格式不變、持久化結構不變（`schemaVersion` 2） | 不需 CT 任務、不需遷移任務；FE 任務列 V-PWA-01～V-PWA-12 與 AC-34～AC-37、AC-24-12、AC-23-02、AC-23-06（品牌標識聲明） |

### 9.6 回饋下游（v0.12，給 SD；PRD R-21、Q-49～Q-57）

| 編號 | 事項 | 契約的立場 | 請 SD 處理 |
| :--- | :--- | :--- | :--- |
| DS-19 | ORIGINAL 來源名稱（Q-49、AC-38-10 (1)） | §4.3：`fullName` = `"EnglishContext 原創內容"`；格式與其他欄位不變 | 列 **1 個 CT 任務**（pg-content）：改 `src/data/sources.js` ORIGINAL 的 `fullName`，以及產生該檔的 `src/data/_tools/lib.mjs` 中同一字串，重跑 V-SRC 自驗。`src/app/__tests__/_fixtures.js` 的同名字串屬 FE 範圍 |
| DS-20 | 名稱與不改清單（NM） | §11.1 NM-1～NM-6、`FROZEN_IDENTIFIERS` | FE 任務：`<title>`、標題列 `h1`、`license-header.txt` 第一行改為「EnglishContext」；建置期檢查（V-PWA-04 現為檢查「English Master Track」）與既有測試（`build.test.js`、`shell.test.js` 斷言舊 `<title>`）同步改寫；**不得**改 `STORAGE_KEYS`、`BACKUP_FORMAT_ID`、匯出檔名、`dist/english-master-track.html`、`PWA_CACHE_PREFIX`、`emt-build-id` |
| DS-21 | 色彩 token（VC） | `COLOR_TOKENS`、`SEMANTIC_COLORS`、§11.2 VC-1～VC-8 | (1) 把 CSS 變數對應到 token；**注意 v0.11 `--primary` = `#2f6fd6` 同時是藍色級色**：白字按鈕改用 `brandDeep`，藍色級維持 `#2f6fd6`（AC-38-03），兩者須拆成不同變數；(2) `--bg` 改為 `#eef4fa`，DS-13 的建置期比對改為 `--bg` = `PWA_BACKGROUND_COLOR`；(3) AC-38-01 以 `border-color` 也算出現強調橘，「開始今日學習」「開始學習」按鈕的邊框不得計算為 `#f7893b`（用 `border: none` 或其他色）；品牌主色同理不得出現在文字 `color`；(4) 按鈕邊框不得用 `#d5d9e0`（AC-38-06） |
| DS-22 | 主控台重排（DB） | §11.4 DB-1～DB-6、`RuntimeState.dashboard`、IN-1（v0.12 加 `backupExpanded`）、NT-1 | 決定區塊元件、720px 置中、3 格並排、空狀態高度、收合控制項（`aria-expanded`）；刪除功能入口、「學習統計」「目前目標」區塊與 2 個小環形圖；「安裝 App」與不互通說明移入展開區；FE 單元測試列 V-LAY-07（展開狀態不寫 localStorage、切頁維持、匯入中不收合） |
| DS-23 | 首次畫面（FT） | §11.5 FT-1～FT-6、`LAYOUT_TEXTS` 首次畫面段 | 精簡色級列（與一般難易度設定頁共用元件）、固定底部列（≤ 640px 固定、內容底部留白避免遮住頁尾連結與 Toast，AC-41-04）；摘要行數值與試算區共用同一計算函式（FT-4） |
| DS-24 | 模擬測驗進度條（MT） | §11.6 MT-1、MT-2（純推導，不新增狀態） | 進度條元件與 `role="progressbar"` 屬性；720px 置中；減少動態無轉場 |
| DS-25 | 工作範圍 | 持久化結構不變（`schemaVersion` 2、鍵 2、無遷移）；`src/data/` 只改 1 個字串值（DS-19） | CT 任務 1 個（DS-19）；其餘皆 FE；QA 依 V-LAY-01～V-LAY-08 與 PRD AC-38～AC-41 驗收 |

---

## 10. PWA 契約（v0.11，PRD R-20、US-34～US-37、AC-24-12、Q-41～Q-48；**不改持久化結構**）

型別與常數見 `data-schema.ts` §12。本節所有路徑皆為**相對於部署目錄根**（部署後即相對於 `https://<帳號>.github.io/<專案>/`），不得以 `/` 或協定開頭。

### 10.1 兩種交付形態

| 項目 | `file://` 版（雙擊開啟交付 HTML） | https 版（GitHub Pages；`localhost` 測試） | 對應 AC |
| :--- | :--- | :--- | :--- |
| HTML | `dist/english-master-track.html` | 部署目錄 `index.html`，與左欄**逐位元組相同** | AC-36-07、AC-19-01 |
| PWA 啟用（PE-1） | 否 | 是（瀏覽器支援 service worker 時） | AC-37-04 |
| service worker | 不註冊（0 個） | 恰 1 個，`./sw.js`，scope = 部署目錄 | AC-37-01、AC-35-01 |
| manifest、apple-touch-icon 連結 | 不加入、不讀取 | 啟動時以程式加入（HD-2） | AC-37-01、AC-34-01、AC-34-05 |
| 網路請求 | 0 | 只有預先快取清單 7 個網址與 `sw.js` 的同源 GET | AC-21-01、AC-37-05 |
| Cache Storage | 本系統快取 0 個 | 本專案快取（啟用後 1 個） | AC-21-03、AC-35-01 |
| 「安裝 App」按鈕 | 永不顯示 | 依 IN-1 | AC-34-07、AC-34-08 |
| 新版提示 | 永不顯示 | 依 UP-6 | AC-36-03、AC-37-01 |
| 不互通說明（NT-1） | 顯示 | 顯示（文字相同） | AC-24-12 |
| localStorage | 鍵 2 個、`schemaVersion` 2 | 相同（各來源各自一份） | AC-36-04、AC-37-06 |

### 10.2 部署目錄（DP）

部署目錄恰為下列 8 個檔案（= `PWA_DEPLOY_FILES`）：

| 路徑 | 角色 | MIME | 尺寸／用途 | 產生方式 | 預先快取 | 參照者 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `index.html` | 頁面 | `text/html` | — | 建置（= `dist/english-master-track.html`） | 是（`./`、`./index.html` 兩個鍵） | 瀏覽器、`start_url` |
| `manifest.webmanifest` | manifest | `application/manifest+json` | — | 建置（= `PWA_MANIFEST`） | 是 | HTML 動態 `<link rel="manifest">` |
| `sw.js` | service worker | `text/javascript` | — | 建置（嵌入 BUILD_ID、快取名稱、預先快取清單） | **否** | 頁面 `register()` |
| `icons/icon-192.png` | 圖示 | `image/png` | 192×192，`any` | 複製（主控預產） | 是 | manifest `icons[0]`；可作 https 版 favicon（HD-4） |
| `icons/icon-512.png` | 圖示 | `image/png` | 512×512，`any` | 複製（主控預產） | 是 | manifest `icons[1]` |
| `icons/icon-maskable-512.png` | 圖示 | `image/png` | 512×512，`maskable` | 複製（主控預產） | 是 | manifest `icons[2]` |
| `icons/apple-touch-icon-180.png` | iOS 主畫面圖示 | `image/png` | 180×180（不在 manifest 內） | 複製（主控預產） | 是 | HTML 動態 `<link rel="apple-touch-icon">` |
| `ads.txt` | ads.txt | `text/plain` | — | 複製 | **否** | 無（不被頁面或 service worker 請求） |

| 編號 | 規則 | 對應 AC |
| :--- | :--- | :--- |
| DP-1 | 建置產出**一個**部署目錄（名稱與位置由 SD 定，例 `dist/site/`），內容恰為上表 8 檔，不多不少；不含 `docs/`、`src/`、`sources/`、source map、`english-master-track.html` 副本或其他檔案。`.github/workflows/static.yml` 整個上傳該目錄（Q-46，由主控修改一次） | AC-36-07 |
| DP-2 | `index.html` 與 `dist/english-master-track.html` 逐位元組相同（同一份 HTML 同時作為 `file://` 版與 https 版） | AC-36-07、AC-19-01 |
| DP-3 | 檔名與資料夾名全部小寫，HTML、manifest、`sw.js` 中的參照字串必須與上表路徑**大小寫完全相同**（GitHub 的 Linux 執行環境區分大小寫） | AC-36-07、AC-34-01 |
| DP-4 | **圖示 PNG 規格**（Q-41 決議 A）：(a) PNG 格式、正方形、實際像素 = 表列尺寸；(b) 不含透明度通道（IHDR 色彩類型 2 = RGB、位元深度 8，且無 `tRNS` 區塊）；(c) `any` 圖示與 `apple-touch-icon-180`：取自來源圖裁掉灰色外框與陰影後的藍色方塊，四角補滿藍色成滿版正方形，保留橘色「EC」對話框與「EnglishContext」字樣；(d) `icon-maskable-512`：同 (c) 的圖案縮小後置中，四周以同一藍色補邊；**判定標準**：橘色「EC」對話框與「EnglishContext」字樣完整位於以圖示中心為圓心、直徑為邊長 80% 的安全圓內（v0.12 依 PRD AC-34-03、SD-FB-31 刪除「約縮至 85%」，不以縮放比例判定；主控實際產出約 78%，符合） | AC-34-01、AC-34-03、AC-34-05 |
| DP-5 | **圖示來源**（Q-45 決議 A）：原圖 `sources/pwa/PWA_Icon.jpg`；由**主控**依 DP-4 產生 4 個 PNG，放在 `src/app/` 下的資產目錄（路徑由 SD 定，建議 `src/app/assets/icons/`），檔名與上表 `icons/` 下的檔名相同；產生方式記錄於 `sources/pwa/`。建置**只複製**（逐位元組相同），不縮放、不重新編碼；任何一檔缺少或不符 DP-4 (a)(b) 時建置中止 | AC-34-03、AC-36-01 (c) |
| DP-6 | `ads.txt`：內容與目前 `dist/ads.txt` 逐位元組相同（1 行 `google.com, pub-4051803210893105, DIRECT, f08c47fec0942fa0`），檔名小寫；HTML 不參照、不預先快取、頁面與 service worker 不請求。來源位置由 SD 定（DS-12）。註：專案子路徑下的 `ads.txt` 不會被廣告系統讀取（R-20 風險 (5)），契約只負責照原樣部署 | AC-36-07 |
| DP-7 | 文字檔編碼：`index.html`、`manifest.webmanifest`、`sw.js` 皆 UTF-8、無 BOM | AC-34-01 |

### 10.3 Web App Manifest（MF）

| 欄位 | 值 | 規則 | 對應 AC |
| :--- | :--- | :--- | :--- |
| `name` | `"EnglishContext"` | = `PWA_APP_NAME` = `APP_DISPLAY_NAME`（Q-42；v0.12 起 App 內名稱也相同，Q-49） | AC-34-01、AC-34-02 |
| `short_name` | `"EnglishContext"` | 同上 | AC-34-01、AC-34-02 |
| `id` | `"./"` | 相對路徑，解析後 = 部署目錄 | AC-34-01 |
| `start_url` | `"./"` | 相對於 manifest 網址解析 = 部署目錄（不是網域根目錄） | AC-34-01、AC-34-02 |
| `scope` | `"./"` | 同上；與 service worker scope 相同 | AC-34-01、AC-35-01 |
| `display` | `"standalone"` | — | AC-34-01、AC-34-02 |
| `lang` | `"zh-Hant-TW"` | — | AC-34-01 |
| `theme_color` | `"#1e9bf0"` | = `PWA_THEME_COLOR` = `COLOR_TOKENS.themeColor`（v0.12 由 `#2f6fd6` 改，Q-54 決議 A）；= HTML `<meta name="theme-color">` | AC-34-01、AC-34-04、AC-38-02 |
| `background_color` | `"#eef4fa"` | = `PWA_BACKGROUND_COLOR` = `COLOR_TOKENS.background` = 首次畫面 body 背景（v0.12 由 `#f6f7f9` 改，AC-34-04、AC-38-02；DS-13、VC-5） | AC-34-01、AC-34-02、AC-34-04、AC-38-02 |
| `icons` | 3 筆，見下 | 順序固定；每筆單一 `purpose` | AC-34-01、AC-34-03 |

`icons`：`{ "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" }`、`{ "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" }`、`{ "src": "icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }`。

| 編號 | 規則 | 對應 AC |
| :--- | :--- | :--- |
| MF-1 | `manifest.webmanifest` 為合法 JSON，與 `PWA_MANIFEST` **深度相等**；鍵集合**封閉**為上表 10 個，不得加入 `description`、`orientation`、`shortcuts`、`share_target`、`protocol_handlers`、`file_handlers`、`related_applications`、`prefer_related_applications`、`screenshots` 等任何其他鍵（`share_target` 等會讓外部資料流入，`related_applications` 會連到外部商店，PV-4） | AC-34-01、AC-37-05 |
| MF-2 | 所有網址欄位為相對路徑（不以 `/`、`http`、`https` 開頭）；`icons[].src` 相對於 manifest 網址解析，必須指向 `PWA_DEPLOY_FILES` 中的檔案 | AC-34-01、AC-34-02 |
| MF-3 | manifest **不含** BUILD_ID 或任何隨建置變動的值；輸出位元組只由 `PWA_MANIFEST` 決定（鍵順序同常數；縮排格式由 SD 定，但每次建置相同） | AC-36-01 (a) |
| MF-4 | （v0.12 改寫，Q-49）manifest `name`／`short_name`、HD-1 的 `apple-mobile-web-app-title`、HTML `<title>`、標題列、授權註解作品名稱一律為「EnglishContext」（§11.1 NM-1～NM-4）；不再有「只用於安裝名稱」的限制。識別字依 `FROZEN_IDENTIFIERS` 不改（NM-5） | AC-34-01、AC-34-02、AC-38-10 |

### 10.4 HTML head（HD）

| 編號 | 規則 | 對應 AC |
| :--- | :--- | :--- |
| HD-1 | **靜態元素**（寫在 HTML 中，`file://` 與 https 都有，皆不產生網路請求）：`<meta name="theme-color" content="#1e9bf0">`（v0.12，Q-54）、`<meta name="apple-mobile-web-app-title" content="EnglishContext">`、`<meta name="apple-mobile-web-app-capable" content="yes">`、`<meta name="mobile-web-app-capable" content="yes">`（兩者並存，避免 Chrome 對單獨的 `apple-mobile-web-app-capable` 發出已淘汰警告，AC-37-01）、`<meta name="apple-mobile-web-app-status-bar-style" content="default">`、`<meta name="emt-build-id" content="<BUILD_ID>">`（SW-2）、`<link rel="icon" href="data:,">`（HD-4）。（v0.12，Q-49）`<title>EnglishContext</title>`（原「English Master Track」，NM-1） | AC-34-04、AC-34-05、AC-36-02、AC-37-01、AC-38-10 |
| HD-2 | **動態元素**（只在 PE-1 成立時，於啟動時以程式加入 `<head>`）：`<link rel="manifest" href="manifest.webmanifest">`、`<link rel="apple-touch-icon" sizes="180x180" href="icons/apple-touch-icon-180.png">`。可選：把 HD-1 的 icon 連結 `href` 改為 `icons/icon-192.png`。所有 `href` 為相對路徑（DP-3） | AC-34-01、AC-34-05、AC-37-01 |
| HD-3 | **禁止的靜態元素**：HTML 原始碼不得含 `<link rel="manifest">`、`<link rel="apple-touch-icon">`、`<link rel="apple-touch-startup-image">`、指向檔案的 `<link rel="icon">`、對 PWA 附屬檔的 `preload`／`prefetch`，以及任何 `<script src>`（R-20 PM 判斷 (d)：靜態 manifest 連結在 `file://` 下會被 Chrome 讀取並報錯）。QA 驗 AC-34-01、AC-34-05 的連結以載入後的 DOM 為準（FB-38） | AC-37-01、AC-37-02、AC-19-01 |
| HD-4 | **favicon**：靜態 `<link rel="icon" href="data:,">` 防止瀏覽器自動請求網域根目錄 `/favicon.ico`（在部署目錄外，違反 AC-37-05，FB-37）。https 版若改指向 `icons/icon-192.png`（HD-2 可選），仍在預先快取清單內 | AC-37-05、AC-21-01 |
| HD-5 | HD-1 的靜態元素中，只有 `<meta name="emt-build-id">` 的 `content` 隨建置改變；其餘逐字固定 | AC-36-01 |

### 10.5 PWA 啟用條件與 `file://` 判定（PE）

| 編號 | 規則 | 對應 AC |
| :--- | :--- | :--- |
| PE-1 | **判定式**（啟動時判定一次，結果存 `RuntimeState.pwa.eligible`，本工作階段不變；整段包在 `try` 內，任何例外 → `false`）。依序檢查，前一步不成立即為 `false`，不再執行後面步驟：(1) `location.protocol === "https:"`，或 `location.protocol === "http:"` 且 `location.hostname` 為 `"localhost"` 或 `"127.0.0.1"`；(2) `window.isSecureContext === true`；(3) `"serviceWorker" in navigator` 且 `navigator.serviceWorker` 不是 `null`／`undefined`。**第 (1) 步在前**：`file:`、其他主機的 `http:`、`about:`、`blob:`、`data:` 等一律在第 (1) 步判定為 `false`，不觸及 `navigator.serviceWorker` | AC-37-01、AC-37-02、AC-37-04、E-71、E-73 |
| PE-2 | `eligible = false` 時**全部不做**：不呼叫 `navigator.serviceWorker` 的任何方法（含 `register`、`getRegistration(s)`）、不存取 `caches`、不加入 HD-2 的連結、不監聽 `beforeinstallprompt`／`appinstalled`、不顯示安裝按鈕與新版提示；`RuntimeState.pwa` 其餘欄位維持初始值。NT-1 說明照常顯示 | AC-37-01、AC-37-02、AC-34-08 (a)、AC-24-12 |
| PE-3 | `eligible = true` 時任何 PWA 動作失敗（manifest／圖示／`sw.js` 404、`register()` 拒絕、安裝時寫入快取失敗、配額不足、`update()` 失敗、離線）：一律在 Promise 的 `catch` 中靜默處理，不拋出未處理錯誤、不以 `console.error` 輸出、畫面不顯示錯誤；安裝按鈕與新版提示不顯示（狀態維持初始值）；線上功能照常。瀏覽器自動記錄的資源載入 404 訊息不在此限 | AC-37-03、AC-35-05、AC-34-06、E-72、E-76 |
| PE-4 | PWA 初始化**不得**影響既有啟動流程：不讀寫 localStorage、不改變 `entryMode` 判定（§5.5）、不延後首次繪製；service worker 註冊時機由 SD 定（建議 `window` 的 `load` 事件之後）。HD-2 的連結可在首次繪製前或後加入 | AC-22-05、AC-35-04、AC-36-04 |

### 10.6 Service worker 與快取（SW）

| 編號 | 規則 | 對應 AC |
| :--- | :--- | :--- |
| SW-1 | **註冊**：`navigator.serviceWorker.register("./sw.js", { scope: "./", updateViaCache: "none" })`。腳本與頁面同源、位於部署目錄根；scope 解析後 = 部署目錄（不是網域根目錄）。`updateViaCache: "none"` 使瀏覽器檢查更新時不取 HTTP 快取 | AC-35-01、AC-36-03 |
| SW-2 | **BUILD_ID**（建置識別碼 = 快取版本識別）：建置時計算，格式 `PWA_BUILD_ID_PATTERN`（16 個小寫十六進位字元）= 以 SHA-256（Node 內建 `crypto`）對下列輸入依固定順序計算的十六進位摘要前 16 字元：(1) 寫入 BUILD_ID **之前**的 HTML（meta 的 `content` 為固定佔位字串）；(2) `manifest.webmanifest`；(3) 4 個圖示 PNG（依 `PWA_DEPLOY_FILES` 順序）；(4) 寫入任何值**之前**的 service worker 範本原始碼。每項以「相對路徑 + 位元組長度 + 內容」分隔（具體分隔格式由 SD 定，但必須固定）。不得納入時間、隨機值、絕對路徑、環境變數；`ads.txt` 不納入。結果：內容不變 → 相同；`src/app/`、`src/data/` 任一會進入交付 HTML 的字元或任一圖示改變 → 不同（v0.12 依 PRD AC-36-01 (b) 釐清） | AC-36-01、AC-36-02 |
| SW-3 | **`sw.js` 內嵌值**：`BUILD_ID`（同 HTML `<meta name="emt-build-id">`）、`CACHE_NAME = "english-master-track-pwa-" + BUILD_ID`、`PRECACHE_URLS` = `PWA_PRECACHE_URLS`（7 項）。不得使用 `importScripts`、不得含任何絕對網址或其他來源網址 | AC-36-02、AC-37-05 |
| SW-4 | **install**：開啟 `CACHE_NAME`，對 `PRECACHE_URLS` 每一項以 `new Request(url, { cache: "reload" })` 向伺服器取得（不取 HTTP 快取，R-20 PM 判斷 (c)）；每個回應須 `ok`（狀態 200）才寫入；任一項失敗 → 刪除 `CACHE_NAME` 並讓 install 失敗（`waitUntil` 的 Promise 拒絕），不留下部分快取。install 中**不得**呼叫 `skipWaiting()`。`./` 與 `./index.html` 兩鍵的內容須逐位元組相同（可各自請求，或取一次後以 `clone()` 寫入兩鍵，由 SD 定） | AC-35-01、AC-35-05、AC-36-03 |
| SW-5 | **activate**：先依 SW-9 刪除舊的本專案快取，再呼叫 `self.clients.claim()` | AC-35-01、AC-36-05 |
| SW-6 | **fetch**：只在同時符合下列條件時呼叫 `event.respondWith`：`request.method === "GET"`、請求網址與 `sw.js` 同源、去掉 hash 後的網址（**含查詢字串**比對）恰等於 `PRECACHE_URLS` 某一項以 `sw.js` 網址解析後的結果。回應方式：只從 `caches.open(CACHE_NAME)` 的快取比對（**不得**用全域 `caches.match()`，避免讀到同網域其他專案的快取）；命中 → 回傳快取；未命中 → `fetch(event.request)` 直接轉送，結果**不寫入**快取。其餘請求一律不呼叫 `respondWith`（不攔截） | AC-35-02、AC-35-03、AC-37-05、E-80 |
| SW-7 | 快取只在 install（SW-4）時寫入；fetch、message、activate 都不寫入任何快取 | AC-37-05、AC-21-03 |
| SW-8 | **message**：只處理 `PwaPageToSwMessage`——`event.data` 為物件、`type === "SKIP_WAITING"`、且沒有其他鍵 → `self.skipWaiting()`；其他訊息一律忽略，不回覆。service worker 不對頁面送出任何訊息 | AC-36-03、AC-37-05 |
| SW-9 | **清除舊快取**：`caches.keys()` 中名稱**以 `PWA_CACHE_PREFIX` 開頭且不等於 `CACHE_NAME`** 者刪除；不以此前綴開頭的快取（同網域其他專案、手動建立者）不得讀取、修改或刪除 | AC-36-05、E-80 |
| SW-10 | **禁止**：`importScripts`、IndexedDB、`push`／`sync`／`periodicsync`／`notificationclick`／`backgroundfetch*` 監聽、`BroadcastChannel`、`clients.matchAll` 後 `postMessage`、`navigationPreload`、讀取請求本文、存取 `localStorage`。只允許 `install`、`activate`、`fetch`、`message` 4 種監聽 | AC-37-05 |
| SW-11 | `sw.js` 本身不在預先快取清單；瀏覽器依 SW-1 自行向伺服器取得 | AC-35-01、AC-37-05 |

### 10.7 更新流程與頁面 ↔ service worker 訊息（UP；Q-43 決議 A）

| 編號 | 規則 | 對應 AC |
| :--- | :--- | :--- |
| UP-1 | 版本 V2 部署後，瀏覽器在頁面導覽（開啟 App、重新載入）時依 SW-1 取得新的 `sw.js`；位元組不同即安裝 V2（SW-4）。契約不另加定時輪詢 | AC-36-03 |
| UP-2 | **偵測新版**：`register()` 成功後設 `lastUpdateCheckAt` = 現在；若 `registration.waiting` 存在且 `navigator.serviceWorker.controller` 不為 null → `updateAvailable = true`。另監聽 `registration` 的 `updatefound`：新 worker 的 `statechange` 變為 `"installed"` 且 `controller` 不為 null → `updateAvailable = true`。`controller` 為 null（首次安裝）時不設定 | AC-36-03 |
| UP-3 | **回到前景**：`document.visibilityState` 變為 `"visible"` 且 `performance.now() − lastUpdateCheckAt ≥ PWA_UPDATE_RECHECK_MS`（1 小時）→ 呼叫 `registration.update()`（失敗靜默，PE-3），並更新 `lastUpdateCheckAt` | AC-36-03 情境 (2) |
| UP-4 | **按「重新整理」**：設 `reloadRequested = true`；若 `registration.waiting` 存在 → 對它 `postMessage({ type: "SKIP_WAITING" })`；不存在（已被其他分頁啟用）→ 直接 `location.reload()`。重複點擊不再送訊息 | AC-36-03 |
| UP-5 | **`controllerchange`**：只有 `reloadRequested = true` 時呼叫 `location.reload()`，且頁面期間至多 1 次；其他情況（首次安裝 `clients.claim()`、其他分頁觸發換版）不重新載入 | AC-36-03 |
| UP-6 | **新版提示**：`eligible && updateAvailable` 時顯示 `PWA_TEXTS.updateNotice`「有新版本，重新整理」與按鈕 `PWA_TEXTS.updateButton`「重新整理」；任何 `entryMode`、任何頁面皆可顯示；純文字、非彈出視窗、不阻擋操作、不被底部導覽列遮住、減少動態下無動畫（位置與樣式屬設計層） | AC-36-03、AC-27-03、AC-31-03 |
| UP-7 | **不按「重新整理」**：頁面維持 V1 正常運作；不自動 `skipWaiting()`、不自動重新載入；關閉本應用全部視窗與分頁後重新開啟，由瀏覽器依預設生命週期啟用 V2 | AC-36-03、E-79 |
| UP-8 | 更新過程不讀寫 localStorage；V2 啟動後依 §5.3 照常讀取（`schemaVersion` 2、鍵名不變；首次畫面者仍無狀態鍵） | AC-36-04 |
| UP-9 | **離線**：更新檢查失敗靜默（PE-3），`updateAvailable` 維持 false，不顯示提示、不報錯，以 V1 快取開啟；恢復連網後再開啟即依 UP-1 更新 | AC-36-06、E-78 |

訊息總表：

| 方向 | 訊息 | 時機 | 內容限制 |
| :--- | :--- | :--- | :--- |
| 頁面 → service worker | `{ "type": "SKIP_WAITING" }`（`PwaPageToSwMessage`） | UP-4，只送給 `registration.waiting` | 不得有其他鍵；不含任何學習資料（PV-2） |
| service worker → 頁面 | 無 | — | 頁面以 `controllerchange` 事件得知換版（UP-5） |

### 10.8 「安裝 App」按鈕（IN；Q-44 決議 B）

| 編號 | 規則 | 對應 AC |
| :--- | :--- | :--- |
| IN-1 | **顯示條件**（推導值，不另存）：`eligible && !standalone && installPromptAvailable && !installSuppressed && entryMode === "main" && currentTab === "dashboard" && dashboard.backupExpanded`（v0.12 新增最後一項，AC-34-07、AC-39-08、E-90）。不成立時不渲染（不佔版面、不留空白）。位置：主控台「資料備份」收合區塊的展開內容中、NT-1 說明文字之後（v0.12；區塊內順序見 DB-6）；文字 `PWA_TEXTS.installButton`「安裝 App」；觸控目標 ≥ 44×44 CSS px。首次畫面、導覽列、難易度設定、單字卡、模擬測驗、「資料來源與授權」頁皆不顯示 | AC-34-07、AC-34-08 |
| IN-2 | **standalone 判定**（啟動時一次）：`matchMedia("(display-mode: standalone)").matches === true` 或 `navigator.standalone === true`（iOS）→ `standalone = true`；例外 → `false` | AC-34-08 (d) |
| IN-3 | **`beforeinstallprompt`**（只在 `eligible` 時監聽）：`installSuppressed` 或 `standalone` 為 true → 忽略；事件沒有 `prompt` 函式 → 忽略（FB-42）；否則呼叫 `event.preventDefault()`（不讓瀏覽器自動跳出迷你橫幅，R-20 風險 (4)），把事件存在**模組內部變數**（不得放入 `AppState`），`installPromptAvailable = true` 並重繪主控台。瀏覽器未觸發事件前按鈕不顯示 | AC-34-07、AC-34-08 (c)(e)(f) |
| IN-4 | 不自動呼叫 `prompt()`；不顯示任何自製的安裝橫幅、浮動提示或 iOS 專用說明（Q-44 未採選項 C） | AC-34-07、AC-34-08 (b) |
| IN-5 | **按下按鈕**：模組變數無事件 → 不做任何事（防連點）。有事件 → 取出並清空變數、`installPromptAvailable = false`、`installSuppressed = true`、立即重繪（按鈕消失），然後呼叫一次 `event.prompt()`，再等待 `event.userChoice`（兩者的錯誤皆靜默）。不論接受或拒絕：本次頁面期間不再顯示、不顯示任何訊息、不換頁、不改學習資料。重新載入後只在瀏覽器再次觸發事件時才顯示 | AC-34-09 (a)(b)(c)、E-84、E-85 |
| IN-6 | **`appinstalled`**（只在 `eligible` 時監聽）：清空模組變數、`installPromptAvailable = false`、`installSuppressed = true`、重繪 | AC-34-09 (a) |
| IN-7 | 解除安裝後：契約不另存「曾安裝」狀態；瀏覽器重新觸發事件時依 IN-3 再顯示 | AC-34-10、E-86 |
| IN-8 | 安裝按鈕的任何狀態都不寫入 localStorage（PV-1） | AC-37-06 |

### 10.9 不互通說明（NT；Q-47 決議 B）

| 編號 | 規則 | 對應 AC |
| :--- | :--- | :--- |
| NT-1 | （v0.12）只要「匯出備份」按鈕可見（`dashboard.backupExpanded = true`，DB-6），就在同一區塊、緊接「匯出備份」「匯入備份」之後顯示；收合時與按鈕一併不渲染（AC-24-12 v0.12）。主控台「匯出備份」按鈕所在區塊、緊接按鈕之後，常駐顯示 `PWA_TEXTS.backupOriginNotice`（逐字：「學習紀錄只存在目前的瀏覽器與網址；檔案版、網頁版、主畫面 App 彼此不互通，可用匯出備份／匯入轉移」）；`file://` 與 https 文字相同，不受 `eligible`、`storageStatus` 影響；以 `textContent` 寫入（C-7）；不是彈出視窗、不需關閉；不被裁切或被底部導覽列遮住（版面屬設計層） | AC-24-12、E-81 |

### 10.10 儲存與隱私（PV）

| 編號 | 規則 | 對應 AC |
| :--- | :--- | :--- |
| PV-1 | **localStorage 不變**：PWA 頁面端模組與 `sw.js` 都不呼叫 `localStorage`／`sessionStorage`；鍵仍只有 §5.1 的 2 個，`schemaVersion` 2，`PersistedData` 9 欄不變。`RuntimeState.pwa` 全部欄位只在記憶體（理由：安裝按鈕依瀏覽器每次觸發的事件決定、新版提示依 service worker 狀態推導，皆不需跨工作階段保存） | AC-36-04、AC-37-06、R-20 (4) |
| PV-2 | service worker 不讀取、不接收、不傳送學習資料：頁面不把任何 `AppState` 內容送給 service worker；唯一訊息為 `SKIP_WAITING`（SW-8）；無背景同步、無推播 | AC-37-05 |
| PV-3 | **網路請求**：`file://` 版 = 0。https 版只允許同源、部署目錄內的 GET：`PWA_PRECACHE_URLS` 7 項與 `sw.js`（含瀏覽器的更新檢查）；跨來源請求 = 0；帶本文的請求（POST、PUT 等）= 0；本系統不在任何網址加查詢字串；載入完成後的學習操作（翻卡、作答、STT、匯出入備份）請求 = 0 | AC-21-01、AC-37-05、NFR-3 |
| PV-4 | manifest 鍵集合封閉（MF-1），不含 `share_target`、`protocol_handlers`、`file_handlers`、`related_applications` 等會把外部資料帶入或連到外部的欄位 | AC-37-05 |
| PV-5 | **Cache Storage**：`file://` 版本系統快取 0 個；https 版只有名稱為 `english-master-track-pwa-<BUILD_ID>` 的本專案快取（啟用後 1 個，更新等待期間可暫為 2 個，FB-39），每個快取的項目恰為 `PWA_PRECACHE_URLS` 7 項的伺服器回應；不含 `sw.js`、`ads.txt`、備份檔、音訊、音量或任何使用者資料。同 `storage-schema.json` `meta.browserStoragePolicy.cacheStorage` | AC-21-03、AC-35-01、AC-37-05 |
| PV-6 | IndexedDB：兩種版本都不建立任何資料庫；不使用 cookie | AC-21-03、AC-37-05 |
| PV-7 | 安裝事件物件（`BeforeInstallPromptEvent`）、`ServiceWorkerRegistration`、`ServiceWorker` 只能放在 `src/app` 模組內部變數，不得進入 `AppState`、備份檔或任何儲存（同 `RuntimeState` 禁放規則） | 品質要求、AC-21-03 |

### 10.11 驗證規則（V-PWA；pg-frontend 建置與單元測試、QA 驗收）

| 編號 | 規則 | 對應 AC |
| :--- | :--- | :--- |
| V-PWA-01 | 部署目錄的檔案集合 = `PWA_DEPLOY_FILES` 的 `path` 集合（8 個，大小寫相同）；`index.html` 與 `dist/english-master-track.html` 位元組相同；`ads.txt` 與來源逐位元組相同 | AC-36-07 |
| V-PWA-02 | `manifest.webmanifest`：UTF-8 無 BOM、`JSON.parse` 成功、與 `PWA_MANIFEST` 深度相等、鍵恰為 10 個 | AC-34-01 |
| V-PWA-03 | 每個 PNG：檔頭為 PNG 簽章；IHDR 寬 = 高 = `sizePx`；色彩類型 2、位元深度 8；無 `tRNS` 區塊。maskable 安全區與四角顏色由 QA 以 DevTools 遮罩預覽與目視驗收（AC-34-03） | AC-34-01、AC-34-03、AC-34-05 |
| V-PWA-04 | HTML：含 HD-1 全部靜態元素，`theme-color` = `PWA_THEME_COLOR`；`emt-build-id` 符合 `PWA_BUILD_ID_PATTERN`；不含 HD-3 禁止的元素；（v0.12）`<title>` 為「EnglishContext」（= `APP_DISPLAY_NAME`），`theme-color` 為 `#1e9bf0` | AC-34-04、AC-36-02、AC-37-01、AC-19-01、AC-38-10 |
| V-PWA-05 | `sw.js`：`BUILD_ID` 與 HTML 相同；`CACHE_NAME` = `PWA_CACHE_PREFIX` + `BUILD_ID`；預先快取清單與 `PWA_PRECACHE_URLS` 集合相同；原始碼不含 `importScripts`、`indexedDB`、`localStorage`、`"push"`、`"sync"`、`http://`、`https://`；只有 SW-10 允許的 4 種監聽 | AC-36-02、AC-37-05 |
| V-PWA-06 | 建置可重現：同一原始碼連續建置 2 次，`index.html`、`manifest.webmanifest`、`sw.js` 逐位元組相同；改 `src/app/` 或 `src/data/` 中 1 個**會進入交付 HTML** 的字元、或替換 1 張圖示 PNG 後，BUILD_ID 不同、`sw.js` 不同；只改不進入交付 HTML 的內容（如被建置捨棄的資料檔註解）時 HTML 與 BUILD_ID 不變，屬正確行為（v0.12 依 PRD AC-36-01 (b)）；全程不需手動修改版本號 | AC-36-01 |
| V-PWA-07 | `file://` 執行期：`getRegistrations()` 為空、DOM 無 manifest／apple-touch-icon 連結、Network 請求 0、Console 無錯誤與 manifest／service worker／圖示警告、無安裝按鈕與新版提示、NT-1 說明顯示 | AC-37-01、AC-37-02 |
| V-PWA-08 | PE-1 判定表（單元測試）：`file:///…` → false；`https://x.github.io/p/` 且有 `serviceWorker` → true；`http://localhost:8080/` → true；`http://127.0.0.1/` → true；`http://192.168.0.2/` → false；https 但 `navigator.serviceWorker` 不存在 → false；存取 `navigator.serviceWorker` 拋例外 → false | AC-37-04、AC-37-03 |
| V-PWA-09 | 安裝按鈕狀態機（單元測試，替身事件依 FB-42）：事件前不顯示；事件後只在主控台顯示；按下後立即消失且 `prompt()` 只被呼叫 1 次（含快速連點 2 次）；接受、拒絕後本頁不再顯示（再次觸發事件也不顯示）；`appinstalled` 後不顯示；`standalone` 或 `eligible = false` 時永不顯示 | AC-34-07～AC-34-10 |
| V-PWA-10 | 更新流程：首次安裝不顯示提示且不重新載入；有 waiting worker 且有 controller 時顯示提示；按「重新整理」送出恰 1 則 `{ type: "SKIP_WAITING" }`，`controllerchange` 後重新載入恰 1 次；未按時不換版；離線時不提示 | AC-36-03、AC-36-06 |
| V-PWA-11 | 儲存：PWA 啟用前後 localStorage 鍵名與 `StorageRecord` 欄位集合相同、`schemaVersion` 2；Cache Storage 依 PV-5；V2 啟用後舊本專案快取已刪、非前綴快取保留；IndexedDB 無本系統資料庫 | AC-36-04、AC-36-05、AC-37-06、AC-21-03、AC-35-01 |
| V-PWA-12 | 請求：V-PWA (a) 完整操作後，所有請求為同源、部署目錄內、GET、網址屬 `PWA_PRECACHE_URLS` 或 `sw.js`；無 `/favicon.ico` 等部署目錄外請求 | AC-37-05、AC-21-01 |

---

## 11. 版面與視覺契約（v0.12，PRD R-21、US-38～US-41、Q-49～Q-57；**不改持久化結構**）

型別與常數見 `data-schema.ts` §13。PRD 原則「只改版面與視覺，功能行為不變」：本節以外的既有規則（§5～§10）全部繼續成立，除非下文明文修改。版面尺寸與動畫屬設計層（§5.6 v0.12 段）。

### 11.1 名稱（NM；Q-49 決議）

| 編號 | 規則 | 對應 AC |
| :--- | :--- | :--- |
| NM-1 | HTML `<title>` = `APP_DISPLAY_NAME`「EnglishContext」（HD-1、V-PWA-04 同步） | AC-38-10 (1)、AC-34-01、AC-34-02 |
| NM-2 | 頁面頂端標題列（首次畫面、4 個功能區、「資料來源與授權」頁）由左到右：品牌小圖示 + 名稱文字 `APP_DISPLAY_NAME`。圖示為 PWA `any` 圖示的縮小版，**內嵌**於 HTML（`data:` 網址或內嵌 SVG），不得參照 `icons/` 檔案（`file://` 請求數須為 0）；裝飾用（`alt=""` 或 `aria-hidden="true"`），名稱以文字呈現 | AC-38-05、AC-19-01、AC-21-01 |
| NM-3 | 「資料來源與授權」頁原創內容來源名稱取 `DATA_SOURCE_REGISTRY` 中 ORIGINAL 的 `fullName`（v0.12 值「EnglishContext 原創內容」，§4.3），pg-frontend 不得寫死；品牌標識聲明（AC-23-02、Q-48）文字不變，名稱仍取 `PWA_APP_NAME` | AC-38-10 (1)、AC-23-02 |
| NM-4 | HTML 開頭授權註解**第一行**的作品名稱 = 「EnglishContext」；其餘聲明文字（MIT、CC BY-SA 4.0、著作權人 JimmyLin、品牌標識聲明）逐字不變 | AC-38-10 (1)(3)、AC-23-06 |
| NM-5 | **不改清單**（`FROZEN_IDENTIFIERS`，與 v0.11 逐字相同）：localStorage 鍵 `englishMasterTrack:state`、`englishMasterTrack:unreadable`；備份 `format` `english-master-track-backup` 與 `schemaVersion` 2、欄位；匯出檔名前綴 `english-master-track-backup-`；交付檔 `dist/english-master-track.html`；快取前綴 `english-master-track-pwa-`（**改了會讓 SW-9 認不出 v0.11 的舊快取，舊快取永遠清不掉**）；`emt-build-id`。不得新增別名鍵、不得做「新舊鍵名」遷移 | AC-38-10 (2)、AC-36-04、AC-36-05、AC-24-03、E-94 |
| NM-6 | App 的畫面文字（首次畫面、4 個功能區、「資料來源與授權」頁、對話框、Toast、更新提示）不得出現「English Master Track」（不分大小寫），也不得把 NM-5 的識別字或下載檔名當作文字顯示。瀏覽器下載介面、DevTools、程式註解、文件不屬畫面文字（FB-49） | AC-38-10 (1) |

### 11.2 色彩（VC；PRD 色彩 token 表、Q-53～Q-55）

| token（`COLOR_TOKENS`） | 值 | 固定／建議 | 用途 |
| :--- | :--- | :--- | :--- |
| `brand` 品牌主色 | `#1e9bf0` | 固定 | 非文字品牌元素：主環形圖未達成時的進度色、模擬測驗進度條填色、選中導覽項的指示、標題列圖示 |
| `brandDeep` 深品牌色 | `#0866ad` | 建議 | 白字主要按鈕底色（「套用」「匯出備份」等）、品牌色文字與連結 |
| `accent` 強調橘 | `#f7893b` | 固定 | 只用於「開始今日學習」「開始學習」按鈕底色、連續打卡格的強調圖示；標題列品牌圖示（AC-38-05）的橘色「EC」對話框除外（v0.13） |
| `accentText` 橘鈕文字 | `#1f2937` | 建議 | 強調橘按鈕上的文字（深色字，Q-53 決議 A） |
| `themeColor` | `#1e9bf0` | 固定 | manifest `theme_color`、`<meta name="theme-color">`（Q-54 決議 A） |
| `background` 背景 | `#eef4fa` | 建議 | `body` 背景；= `PWA_BACKGROUND_COLOR` |
| `surface` 表面 | `#ffffff` | 固定 | 區塊卡片底色 |
| `text`／`textMuted` | `#1f2937`／`#5b6472` | 沿用 v0.11 | 內文、說明 |

| 編號 | 規則 | 對應 AC |
| :--- | :--- | :--- |
| VC-1 | `brand` 只用於上表用途；任何元素的文字 `color` 不得為 `brand`；白字元素的背景不得為 `brand`（白字對比約 3.0:1） | AC-38-01、AC-38-04 |
| VC-2 | `brandDeep` 條件：與 `brand` 的 HSL 色相差 ≤ 10°、白字對比 ≥ 4.5:1（建議值約 205.8°，差 1.5°；約 6.0:1） | AC-38-04 |
| VC-3 | `accent` 只出現在「開始今日學習」「開始學習」按鈕底色與連續打卡格的強調圖示；**標題列品牌圖示（AC-38-05）除外**：其橘色「EC」對話框與 App 圖示一致，可使用 `accent`，且不列入本條與 V-LAY-01 的計算（v0.13，PRD AC-38-01、SD-FB-39）；其他元素計算後的 `color`、`background-color`、`border-color`、SVG `fill`／`stroke` 都不得等於 `accent`（**含這兩個按鈕自己的邊框**）。按鈕文字為 `accentText`（不得白字，對 `accent` ≥ 4.5:1，建議值約 6.0:1）；打卡格的數字文字不得為橘色 | AC-38-01、AC-38-04、AC-39-02、AC-39-05 |
| VC-4 | `body` 背景 = `background`（條件：HSL 色相 190°～220°、飽和度 ≥ 15%、亮度 94%～98%）；區塊卡片背景 = `surface`、`box-shadow` 不為 `none`、邊框寬度 0；卡片內統計格邊框寬度 0；按鈕不得以 v0.11 灰框線色 `#d5d9e0` 為邊框 | AC-38-02、AC-38-06 |
| VC-5 | **綁定**：`COLOR_TOKENS.background` = `PWA_BACKGROUND_COLOR` = `PWA_MANIFEST.background_color` = 首次畫面 `body` 計算後背景；`COLOR_TOKENS.themeColor` = `PWA_THEME_COLOR` = `PWA_MANIFEST.theme_color` = `<meta name="theme-color">`。任何一處改值，其餘須同時改（契約小修，不涉持久化，主控代核；FB-48） | AC-34-04、AC-38-02 |
| VC-6 | `SEMANTIC_COLORS`（色級 5 色、答對／答錯、STT 3 燈號、達成金色）與 v0.11 逐字相同，語意與位置不變；藍色級 `#2f6fd6` 不得被 `brand` 取代（v0.11 的 `--primary` 與藍色級同值，須拆開，DS-21） | AC-38-03、AC-40-03 |
| VC-7 | 對比：一般文字 ≥ 4.5:1、大字（≥ 24 CSS px，或 ≥ 18.66 CSS px 且粗細 ≥ 700）≥ 3:1；量測範圍依 AC-38-04；停用按鈕與 `SEMANTIC_COLORS` 文字不量測（Q-55 決議 A）。`text`、`textMuted` 對 `background`（約 13.3:1、5.4:1）與 `surface` 皆符合 | AC-38-04 |
| VC-8 | 不新增外部字型或外部資源；色彩一律以 CSS 內嵌 | AC-38-07、AC-19-01 |

### 11.3 只在記憶體的介面狀態（v0.12 總表）

| 狀態 | 存放 | 持久化 | 說明 |
| :--- | :--- | :--- | :--- |
| 「資料備份」展開／收合 | `RuntimeState.dashboard.backupExpanded` | 否 | DB-6；PRD AC-39-08 明定不寫入 localStorage、重新載入回到收合 |
| 首次畫面選中列 | `goal.draftScore`（既有欄位） | 首次畫面期間否（FS-2）；一般頁依 GS-2 | 不新增欄位 |
| 模擬測驗進度條 | 由 `part5.currentIndex`、`part5.phase`、題庫長度推導 | 不另存 | MT-1 |
| 近 7 天空狀態 | 由 LR-6 顯示值推導 | 不另存 | §5.4 末段 |

v0.12 沒有任何 PRD 要求跨工作階段記住的新介面狀態，因此 `schemaVersion` 維持 2、`PersistedData` 9 欄不變。日後若要求記住展開狀態等，屬持久化結構變更，須回 PM 並由人類核准（CLAUDE.md）。

### 11.4 主控台（DB；US-39、Q-50、Q-52、Q-56）

| 編號 | 規則 | 對應 AC |
| :--- | :--- | :--- |
| DB-1 | **區塊與順序**（DOM 順序 = 畫面順序）：頁面標題 `LAYOUT_TEXTS.dashboardTitle`「學習主控台」→ (1) 今日任務卡 → (2) 3 格數據 → (3) 近 7 天圖表 → (4) 「資料備份」收合區塊 → 頁尾（含「資料來源與授權」連結）。**移除**（v0.11 有、v0.12 不得出現）：「功能入口」區塊與通往難易度設定／單字卡／模擬測驗的模組入口按鈕、主控台本體內的「資料來源與授權」入口、「學習統計」「目前目標」區塊、「目前目標色級」「目前生效色級」「單字掌握數」標籤、2 個小環形圖、圖示磚 | AC-39-01、AC-39-06、AC-17-06、AC-30-01 |
| DB-2 | **今日任務卡**：主環形圖文字 `LAYOUT_TEXTS.todayRing`（X、D 依 LR-6）；未達成（X < D）進度色 `COLOR_TOKENS.brand`，達成（X ≥ D）為 `SEMANTIC_COLORS.goalReached`；按鈕 `LAYOUT_TEXTS.startToday`（`accent` 底、`accentText` 字）；目標行（DB-4） | AC-39-02、AC-30-05、AC-38-01 |
| DB-3 | **「開始今日學習」**：結果與點導覽「單字卡」相同——`currentTab = "flashcards"`（導覽選中項同步）；單字集為空時顯示 AC-06-06 空狀態。**不得**改動任何 `PersistedData`、不得呼叫 `setItem`（X、打卡、掌握數不變） | AC-39-03、E-89 |
| DB-4 | **目標行**：依**已套用**的 `goal.appliedColor`、`goal.effectiveColor`（不看 `draftScore`，FB-45）。兩者相同 → `goalLineSame`（`{color}` = `appliedColor` 的 `nameZh`）；不同（藍、金）→ `goalLineCapped`（`{target}` = `appliedColor`、`{effective}` = `effectiveColor` 的 `nameZh`）；`{daily}` 一律 = `effectiveColor` 的 `dailyNewWords`（R-14）。之後接 `goalLineSeparator` 與可點擊的 `changeLink`「變更」→ `currentTab = "customizer"`（一般難易度設定頁，AC-25-06）。不顯示分數。結果：橘「橘級・每日 10 字・變更」、棕「棕級・每日 10 字・變更」、綠「綠級・每日 15 字・變更」、藍「目標藍級・生效綠級（內建上限）・每日 15 字・變更」、金「目標金級・生效綠級（內建上限）・每日 15 字・變更」 | AC-39-04、AC-17-06、AC-01-02、AC-01-07、AC-25-02、AC-25-03、AC-26-06、E-92 |
| DB-5 | **3 格數據**（同一列並排，順序固定）：「連續打卡天數」數值 + 單位「天」（`StreakState` 顯示規則；格內有 `accent` 強調圖示）→「單字掌握率」大字百分比 + 小字 `statMasteredCount`「已掌握 N 字」→「模擬測驗正確率」百分比；算法見 §5.4 末段；無資料顯示 `statNoData`「—」，不得 NaN／Infinity；不使用環形圖 | AC-39-05、AC-17-01、AC-30-10、E-48 |
| DB-6 | **「資料備份」收合區塊**：標題 `backupSectionTitle`「資料備份」+ 展開指示，控制項有 `aria-expanded` = `RuntimeState.dashboard.backupExpanded`。(a) 初始值 `false`：每次頁面載入、從首次畫面進入主控台時皆為收合；(b) 只有使用者點擊（或 Tab 後 Enter／空白鍵）標題列時切換；(c) 切換 `currentTab` 不改變此值（本次頁面期間維持）；(d) 匯入流程（選檔、確認對話框、成功或失敗提示）期間與之後都不自動收合；(e) 收合時不渲染備份說明、「匯出備份」「匯入備份」、`PWA_TEXTS.backupOriginNotice`、「安裝 App」；展開時依此順序顯示（「安裝 App」依 IN-1）；(f) 展開狀態**不寫入** localStorage、備份檔或任何儲存，操作前後本系統 localStorage 內容完全相同 | AC-39-08、AC-24-01、AC-24-12、AC-34-07、AC-38-09、E-90、E-91 |

### 11.5 首次畫面與色級列（FT；US-41、US-26、Q-51、Q-57）

| 編號 | 規則 | 對應 AC |
| :--- | :--- | :--- |
| FT-1 | **首次畫面順序**：標題列（NM-2）→ `firstRunTitle`「選擇你的目標」→ `firstRunSubtitle`「之後可以在「難易度設定」隨時變更」（FB-44）→ 說明行（以 `vocabNoteLead`「本系統建議字量」開頭，整個列表上方只 1 次）→ 5 個色級列（FT-3）。不再有獨立的「試算結果」卡；不顯示導覽列、自訂單字表單、領域範本（FS-3）；頁尾「資料來源與授權」連結照常 | AC-41-01、AC-25-01、AC-01-01 |
| FT-2 | **固定底部列**（只在首次畫面）：由上到下 [選中藍或金時多一行 `lockedNotice`「目前內建字庫到綠色為止」] → 試算摘要行（FT-4）→ `startLearning`「開始學習」（`accent` 底、`accentText` 字）→ `restoreFromBackup`「從備份還原」。行為依 FS-4、FS-5、FS-6，不因版面改變 | AC-41-02、AC-25-02、AC-25-03、AC-25-10、AC-25-11 |
| FT-3 | **色級列**（首次畫面與一般難易度設定頁共用）：依 `COLOR_LEVELS` 順序 5 列。`status = "open"`（橘、棕、綠）：色條 `SEMANTIC_COLORS.level[id]`、名稱 `nameZh`、說明 `scenarioZh`（一行，過長截斷）、右側內建字數（`N_O`／`N_B`／`N_G` 實際數字）與 `dailyNewWords` 字/天。`status = "locked"`（藍、金）：名稱、🔒、說明 `levelLocked`「即將開放」；右側空白或「—」，**不得**出現「待定」、數字或「20 字/天」；整列降低透明度。選中列 = Color(`goal.draftScore`)（GS-1），框線與淡色底為該色級色並在名稱旁顯示 ✓；同時只 1 列選中；點列依 GS-2。不顯示分數與分數範圍 | AC-26-01、AC-01-01、AC-26-02、AC-26-04、AC-26-05 |
| FT-4 | **試算摘要行**：選中色級 L = Color(`goal.draftScore`)；`{color}` = L 的 `nameZh`；`{daily}` = L 的 `dailyNewWords`；`{weeks}` = 與一般難易度設定頁試算區**同一個計算**（AC-02-05，首次畫面 CurrentVocab = 0；藍、金以 `N_G` 試算）。格式 `summaryLine`；L 為藍、金時後接 `summaryLockedSuffix`「（以綠試算）」並顯示 FT-2 的 `lockedNotice`。不顯示分數與「待定」。以 `N_B` = 2,809、`N_G` = 5,620 為例：橘「橘級・每日 10 字　預計 15 週」、棕「棕級・每日 10 字　預計 41 週」、綠「綠級・每日 15 字　預計 54 週」、藍「藍級・每日 20 字　預計 41 週（以綠試算）」、金「金級・每日 20 字　預計 41 週（以綠試算）」 | AC-41-02、AC-02-03、AC-02-05、AC-02-10、AC-26-05 |
| FT-5 | 點選色級列後摘要行即時更新（≤ 100ms）；首次畫面期間不寫入 localStorage（FS-2） | AC-41-02、AC-22-04、AC-25-04 |
| FT-6 | 一般難易度設定頁使用 FT-3 的色級列，但保留原有試算區、「套用」、自訂單字表單與領域範本（AC-25-06）；FT-2 的固定底部列與 FT-4 摘要行只屬首次畫面 | AC-26-01、AC-25-06 |

### 11.6 模擬測驗進度（MT；US-40）

| 編號 | 規則 | 對應 AC |
| :--- | :--- | :--- |
| MT-1 | **進度推導**（不新增狀態）：N = 畫面「第 i / N 題」所用的題數（題庫長度 `PART5_QUESTION_BANK.length`）；`part5.phase = "question"` 時 i = `part5.currentIndex + 1`、填滿 i ÷ N、`aria-valuenow` = i；`phase = "summary"` 時填滿 100%、`aria-valuenow` = N（FB-47）；`aria-valuemax` = N、`role="progressbar"`。「重新開始」後依既有規則 `currentIndex` = 0 → 1 ÷ N；重新載入後由持久化的 `part5` 推導（AC-11-05）。N = 0（題庫為空）時不顯示進度條，沿用既有空題庫處理 | AC-40-01、AC-11-05 |
| MT-2 | 進度條填色 `COLOR_TOKENS.brand`；作答選項對錯色 `SEMANTIC_COLORS.correct`／`wrong` 不變；`Part5Progress` 欄位與寫入時機不變 | AC-40-01、AC-40-03、AC-38-03 |

### 11.7 驗證規則（V-LAY；pg-frontend 單元測試、QA 驗收）

| 編號 | 規則 | 對應 AC |
| :--- | :--- | :--- |
| V-LAY-01 | 色彩掃描：計算後 `color`／`background-color`／`border-color`／`fill`／`stroke` 等於 `#f7893b` 的元素只有 VC-3 所列（標題列品牌圖示除外，其內部元素不列入計算，v0.13）；文字 `color` 等於 `#1e9bf0` 或 `#f7893b` 的元素數 = 0；白字元素背景為這兩色的數 = 0 | AC-38-01 |
| V-LAY-02 | `body` 背景 = `COLOR_TOKENS.background` = manifest `background_color`；`<meta name="theme-color">` = manifest `theme_color` = `#1e9bf0`；區塊卡片背景 `#ffffff` | AC-38-02、AC-34-04 |
| V-LAY-03 | `SEMANTIC_COLORS` 各值與 v0.11 交付版計算後顏色相同 | AC-38-03 |
| V-LAY-04 | 對比依 VC-7（AC-38-04 列舉的文字）；強調橘按鈕為深色字 | AC-38-04 |
| V-LAY-05 | `<title>`、標題列名稱 = `APP_DISPLAY_NAME`；「資料來源與授權」頁顯示「EnglishContext 原創內容」；授權註解第一行為「EnglishContext」；畫面可見文字（含對話框、Toast）以 `/english\s*master\s*track/i` 搜尋結果 = 0；`src/data/` 字串同（§3.1） | AC-38-05、AC-38-10 (1) |
| V-LAY-06 | `FROZEN_IDENTIFIERS` 各值與 v0.11 相同；v0.11 寫入的 localStorage 開啟後直接進主控台、資料不變；v0.11 備份可匯入；匯出檔名前綴不變；v0.11 已安裝者更新後舊快取被 SW-9 刪除 | AC-38-10 (2)、AC-36-04、AC-36-05、E-94 |
| V-LAY-07 | `backupExpanded`：載入後為 false 且 `aria-expanded="false"`；點擊後 true；切頁後回主控台仍 true；匯入流程中不變；重新載入回 false；整個過程本系統 localStorage `setItem` 呼叫次數 = 0（只操作展開收合時） | AC-39-08、E-90、E-91 |
| V-LAY-08 | 文字：DB-4 五種目標行、FT-4 五種摘要行、`chartEmpty`、DB-5 三格標籤與「已掌握 N 字」與 `LAYOUT_TEXTS` 逐字相同；AC-39-06 列舉文字在主控台本體各只出現 1 次；主控台本體無模組入口與「資料來源與授權」連結（只在頁尾） | AC-39-04～AC-39-07、AC-41-02、AC-17-01 |

---

## 12. 變更紀錄

| 版本 | 日期 | 作者 | 說明 |
| :--- | :--- | :--- | :--- |
| 0.1 | 2026-10-29 | sa-agent | 初版：依 PRD v0.4 建立資料契約。`data-schema.ts` 定義 55 個型別（27 interface、28 type）與 14 個契約常數；`storage-schema.json` 定義 `StorageRecord`（schemaVersion 1）與 `BackupFile`；localStorage 2 個鍵；資料檔 6 個、全域變數 9 個；驗證規則 V-SRC／V-VOC／V-TPL／V-P5／V-DEC／V-RS／V-PH／V-ST／V-IMP；來源字表登錄（NGSL、NAWL 已確認；TSL、BSL、ECDICT 未確認、不可收錄）；回饋上游 FB-01～FB-17 |
| 0.2 | 2026-10-29 | sa-agent | 依主控 2026-10-29 連網查證修訂：(1) §4.3 四份字表與 ECDICT 改為 `confirmed`、可收錄，作者、版本、網址改為官網原文；(2) §4.2 `N_B` = 2,809、`N_G` = 5,620 由估計改為實際值並列算法、預期排名區段、驗證規則 N-1～N-4；(3) 新增 §3.2 唯讀輸入檔清單（`sources/wordlists/`）與 ECDICT 子集前置任務規格；(4) 新增 V-IN-01～07（latin-1／CRLF／`##` 註解）、V-SRC-05、L-5；修改 R-1～R-4、V-VOC-04、V-VOC-09、V-TPL-02／03；(5) `DataSourceEntry` 新增 `copyrightNotice`、`licenseText`，`originalItemCount` 改為輸入檔實數；(6) FB-01、FB-03 解除，FB-02、FB-04、FB-05 部分解除，FB-12 確認衝突（synergy 在 BSL），新增 FB-18～FB-21。持久化結構無變更，`schemaVersion` 維持 1 |
| 0.3 | 2026-10-30 | sa-agent | 依 PRD v0.5（approved，JimmyLin，2026-10-30）R-12 修訂：(1) 三個契約檔的上游引用改為 PRD v0.5；(2) V-TPL-02 取消 synergy 暫停，改為 business 範本必須含 wordKey `monetization`（V-TPL-03 不變）；(3) FB-12 標為已解除；(4) `data-schema.ts` 的 `DomainTemplate.words` 註解與 `CustomVocabItem` 範例由 Synergy 改為 Monetization。型別數、契約常數、localStorage 鍵數皆不變；持久化結構無變更，`schemaVersion` 維持 1 |
| 0.4 | 2026-10-30 | sa-agent | 依 PRD v0.6（approved，JimmyLin，2026-10-30）R-13、AC-23-01～03、E-37、NFR-3 修訂（FB-10 決議）：(1) 三個契約檔上游改為 PRD v0.6；(2) §3.2 `sources/ecdict/` 全部改為已到位，新增 `ecdict_subset_zhtw.csv`、`tw_terms.tsv` 兩列並分列 `LICENSE`、`SOURCE.txt`；子集產出方式補上轉繁（OpenCC `s2twp`）與補充對照表兩步驟，狀態改為已完成；釋義素材為 `_zhtw`，簡體原檔作為 V-VOC-09 比對依據；(3) 新增 M-1～M-7（CSV 解析、精簡釋義、上下文用詞、詞性對應、音標原創、`meaningSource` 判定、交付紀錄）與 M-3 用詞表；(4) V-VOC-09 改為 `phoneticSource` 全部 `"ORIGINAL"`、`meaningSource` ∈ {ECDICT, ORIGINAL}、missing 4 筆必為 ORIGINAL；新增 V-VOC-15～18（對照表殘留、舊式音標字元、上下文用詞清單全檢、QA 抽查）；V-SRC-01、L-1、N-3 只以 `meaningSource` 計 ECDICT；(5) L-4 ECDICT `modifications` 恰為「簡體轉繁體台灣用語」「精簡釋義」，音標改寫不列入；新增 L-6 卡片出處顯示規則；(6) §4.3 ECDICT `version` = `master@ab22ad3`；§4.2 註明主控已以 C-2 wordKey 實算；(7) FB-02、FB-04、FB-10 已解除，FB-05 大部分解除，新增 FB-22（`s2twp` 過度轉換）；(8) `data-schema.ts`：`BuiltinVocabItem.phoneticSource` 型別由 `DictFieldSource` 收窄為 `OriginalMarker`，相關註解與範例更新。型別數（55）、契約常數（14）、localStorage 鍵數（2）皆不變；持久化結構無變更，`schemaVersion` 維持 1 |
| 0.5 | 2026-10-30 | sa-agent | 修訂已核准的 v0.4（JimmyLin，2026-10-30），原因：/pg-run 實作階段 SD、PG 回報需釐清事項（§9.1 DF-01～DF-06）。三檔 `status` 改回 `draft`、核准欄位清空並同步（SD-FB-04）。(1) V-ST-04 釐清只與本次截取的內建卡去重（SD-FB-03），V-ST-06 補刪除例外；(2) §6.2 步驟 5 放寬 `customVocab` id／wordKey 不重複、步驟 7 清理後完整再驗，新增 IM-1～IM-5（V-ST-03 匯入例外、BackupFile 頂層檢查與 date-time 強制、`fileVersion` 非數值為 null、步驟 5～7 可先於確認執行、未預期例外視為 format）；§5.3 註明讀取時完整檢查；(3) V-VOC-10 改為「等於」才算錯誤，豁免 wordKey = null 的 `word`，獨立單字改為警告（CT-01）；新增 FB-23。型別數（55）、契約常數（14）、localStorage 鍵數（2）皆不變；不改 PRD；持久化結構無變更，`schemaVersion` 維持 1。**主控代核**（2026-10-30，依 CLAUDE.md「第 4 階段自動化授權」：未改 PRD、未改持久化結構） |
| 0.6 | 2026-10-30 | sa-agent | 修訂已核准的 v0.5（主控代核），原因：/pg-run 後段 PG 回報需釐清事項（§9.2 DF-07～DF-10）。三檔 `status` 改回 `draft`、核准欄位清空並同步。(1) §5.3 新增 RS-1～RS-4：讀取失敗先存 `unreadable`、成功才覆蓋主鍵，失敗保留主鍵原值（FE-07 #1）；(2) 執行期型別 `ImportErrorCode` 新增 `"write_failed"`，§6.2 步驟 8 分流，新增 IM-6（暫定文字「儲存失敗，未匯入」）、IM-7（容量不足判定）；新增 FB-24 交 PM 定案文字（FE-07 #3）；(3) M-3 新增 `s2twp` 過度轉換補充表與判斷原則（CT-03 FB-02、CT-09），V-VOC-15 擋「例項」、V-VOC-17 擴充比對詞、V-VOC-18 註明還原與錯字更正視為有對應；M-2 新增 ECDICT 原檔錯字更正規則（CT-09）；(4) 新增 M-8 字首字詞性寫法，不新增 `PartOfSpeech` 值，V-VOC-07 補自動檢查，新增 FB-25（CT-13）；(5) N-3 註明 ECDICT 筆數預期少於 5,616、以 CT-23 為準，新增 FB-26（CT-10）；(6) FB-20 結案、V-IN-06 允許「無法判定」（CT-01）。型別數（55）、契約常數（14）、localStorage 鍵數（2）不變；不改 PRD；`PersistedData`、`StorageRecord`、`BackupFile` 欄位不變，`schemaVersion` 維持 1。**主控代核**（2026-10-30，依 CLAUDE.md「第 4 階段自動化授權」：未改 PRD、未改持久化結構） |
| 0.7 | 2026-10-30 | sa-agent | 修訂已核准的 v0.6（主控代核），原因：人類決議（JimmyLin，2026-10-30）FB-24、FB-25。三檔 `status` 改回 `draft`、核准欄位清空並同步。(1) FB-25 採用新增詞性：`data-schema.ts` `PartOfSpeech` 新增 `"pref."`；契約常數 `POS_LABELS` **內容變更**，新增 `"pref.": "字首"`（由 13 項變 14 項）；`BuiltinVocabItem.pos` 註解同步；(2) M-8 寫法 (2) 改為 `pos` 恰為 `["pref."]`、`meaning` 仍以「（字首）」開頭；寫法 (1) 規定字首義只能放 `meaning` 最後一段，此時 `pos` 最後加 `"pref."`；(3) 廢止 `["adj."]` 表示字首義；M-4 新增 `pref.` → `pref.` 對應；(4) V-VOC-07 字首檢查改為 (a)～(c) 三條，全部可自動檢查（不再需人工確認末段字首義）；(5) FB-24 定案 `write_failed` 文字「儲存失敗，未匯入」，IM-6、§6.2 步驟 8、`ImportErrorCode` 註解去掉「暫定」；(6) FB-24、FB-25 標為已解除。型別數（55）、契約常數數（14）、localStorage 鍵數（2）不變；不改 PRD；`PersistedData`、`StorageRecord`、`BackupFile` 不變（`CustomVocabItem.pos` 為自由字串，已確認不受影響），`schemaVersion` 維持 1，不需遷移。**主控代核**（2026-10-30，內容依 JimmyLin 對 FB-24、FB-25 的決議；未改 PRD、未改持久化結構） |
| 0.8 | 2026-10-30 | sa-agent | 修訂已核准的 v0.7（主控代核），原因：PRD v0.8（approved，JimmyLin，2026-10-30）新增 R-15（功能更名）、R-16（介面互動、首次進入流程）、R-17（今日已學字數與近 30 天歷史，**人類已同意持久化結構 1 → 2**）。三檔 `status` 改回 `draft`、核准欄位清空並同步；**本版含持久化結構變更，依 PRD R-17 須由人類核准，不適用主控代核**。(1) `schemaVersion` 1 → 2：`PersistedData` 新增必填 `todayLearned`（新型別 `TodayLearnedState`）、`learnedHistory`（新型別 `LearnedHistory`）；`CURRENT_SCHEMA_VERSION` = 2、`SUPPORTED_SCHEMA_VERSIONS` = `[1, 2]`；§5.2 預設值、§5.3 版本表新增 2；新增遷移規則 MG-1～MG-4（補預設值、既有 7 欄不動）與讀取規則 RD-1、RD-2（新欄位缺少或型別錯誤只重設該欄）；(2) 新增 §5.4 學習紀錄規則 LR-1～LR-8、§5.5 首次進入規則 FS-1～FS-7（不新增持久化欄位）、§5.6 註明 Q-33 介面數值屬設計層；(3) 備份：匯出版本 2、匯入支援 1／2，§6.2 步驟 3、4、5、7、9 修改，新增 IM-8、§6.3；(4) 新增驗證規則 V-ST-09～V-ST-13，修改 V-ST-01、V-IMP-01；(5) `storage-schema.json`：根 `schemaVersion` const 2、`PersistedData` required 9 欄、新增 `$defs/TodayLearnedState`、`TodayLearnedStateNormalized`、`LearnedHistory`、`LearnedHistoryNormalized`、`PersistedDataWritten`，`BackupFile.schemaVersion` enum `[1, 2]`；(6) R-15：新增契約常數 `TAB_LABELS`、`NAV_TAB_ORDER`，註解與 §1、§7.4 改用「單字卡」「模擬測驗」「難易度設定」，識別字（`TabId` 的 `flashcards`／`part5`／`customizer`、型別名、鍵名）不改；(7) 新增執行期型別 `EntryMode`、`LearningEventKind`，`RuntimeState` 新增 `entryMode`、`learningQuotaNoticeShown`；新增常數 `LEARNED_HISTORY_DAYS`、`DASHBOARD_CHART_DAYS`；(8) §8 補 v0.8 AC 對照；新增 FB-27～FB-32。型別數 55 → 59（interface 28、type 31）；契約常數 14 → 18；localStorage 鍵數維持 2 |
| 0.9 | 2026-11-02 | sa-agent | 修訂已核准的 v0.8（JimmyLin，2026-10-30），原因：PRD v0.9（approved，JimmyLin，2026-11-02）新增 R-18（一、切換難易度初始化學習紀錄 US-32；二、麥克風只詢問一次與收音條 US-33；三、隱藏解碼器與句型庫 AC-20-04）與 Q-36～Q-38 決議。本檔與 `data-schema.ts` 的 `status` 改回 `draft`、`version` 0.9、核准欄位清空；`storage-schema.json` 未修改（維持 v0.8 approved，主控指示「沒有改動的檔案保持原樣」，為 SD-FB-04 三檔同步的例外）。(1) 新增 §5.7 CI-1～CI-10：觸發條件、「有學習紀錄」(a)～(f) 對應欄位（(e) 不看 today，FB-33）、清除 6 欄與初始值、保留欄位（`customVocab` 原值只清掌握狀態、`sttNoticeAcknowledged` 保留、`goal` 改新值）、單次原子寫入、停用與寫入失敗處理、取消不寫入；新增常數 `LEARNING_PROGRESS_FIELDS`；(2) 新增 §5.8 HT-1～HT-5，`NAV_TAB_ORDER` 6 → 4 項，新增常數 `HIDDEN_TAB_IDS`；§3.1、§7.5、§7.6 註明 `decoder.js`、`phrasebank.js` 格式與資料保留；(3) 修改 §5.3「寫入：容量不足」列、LR-4、V-ST-12，新增 V-ST-14、V-ST-15；§8 補 v0.9 AC 對照；(4) 收音條門檻判定為架構常數，新增 §9.3 回饋下游 DS-01～DS-06；(5) 新增 FB-33～FB-35。型別數 59 不變；契約常數 18 → 20；localStorage 鍵數維持 2；**持久化結構不變，`schemaVersion` 維持 2，備份格式不變**。依 CLAUDE.md，本版未改 PRD、未改持久化結構，符合主控代核條件 |
| 0.10 | 2026-11-02 | sa-agent | 修訂已核准的 v0.9（主控代核），原因：PRD v0.10（approved，JimmyLin，2026-11-02）R-19（難易度設定只選色級、不顯示分數，取代 Q-32）與 Q-39（首次預設分數改為 725）。三檔 `status` 改回 `draft`、`version` 0.10、核准欄位清空，上游改為 PRD v0.10（`storage-schema.json` 由 v0.8 直接升為 v0.10，恢復三檔同步）。(1) `data-schema.ts`：`SCORE_DEFAULT` 600 → 725；`ColorLevelDefinition.scoreMax`、`COLOR_LEVELS` 註明兼為點卡片的色級上限分數（不新增常數）；`SCORE_*` 註明只用於資料層驗證、不四捨五入、畫面不用；`GoalState` 註解與預設值更新；(2) `storage-schema.json`：只改 `Score`、`GoalState`、`draftScore` 的 description 與 examples 第 1 筆（600 → 725），結構關鍵字全部未動；(3) 本檔：新增 §5.9 GS-1～GS-8、V-ST-16、FB-36、§9.4 DS-07～DS-10；修改 §5.2 預設值、FS-2、FS-3、CI-1、CI-3、CI-9、§1、§8；FB-08 解除；FB-35 補 v0.10 說明。型別數 59、契約常數 20、localStorage 鍵數 2 皆不變；**持久化結構不變，`schemaVersion` 維持 2，既有分數不轉換、不需遷移**。未改 PRD、未改持久化結構，符合 CLAUDE.md 主控代核條件 |
| 0.11 | 2026-11-02 | sa-agent | 修訂已核准的 v0.10（主控代核），原因：PRD v0.11（approved，JimmyLin，2026-11-02）新增 R-20 PWA（US-34～US-37、AC-24-12，Q-41～Q-48 全部已決議）。三檔 `status` 改為 `in-review`、`version` 0.11、核准欄位清空並同步，上游改為 PRD v0.11。(1) 新增 **§10 PWA 契約**：§10.1 兩種交付形態對照；§10.2 部署目錄 8 檔與 DP-1～DP-7（含圖示 PNG 尺寸、用途、不透明與 maskable 安全區規格，主控預產、建置只複製，`ads.txt` 照原樣部署）；§10.3 manifest 欄位值與 MF-1～MF-4（`name`／`short_name`「EnglishContext」、`id`／`start_url`／`scope` 為 `"./"`、`standalone`、`zh-Hant-TW`、`theme_color` `#2f6fd6`、`background_color` `#f6f7f9`、3 個圖示、鍵集合封閉）；§10.4 HTML head HD-1～HD-5（靜態 meta 含 `apple-mobile-web-app-title`、`emt-build-id`、`data:` favicon；manifest 與 apple-touch-icon 只動態加入）；§10.5 啟用條件 PE-1～PE-4（`file://` 判定順序、不啟用時全部不做、失敗靜默、不影響啟動）；§10.6 service worker SW-1～SW-11（`./sw.js`、`updateViaCache: "none"`、BUILD_ID 由內容 SHA-256 計算、快取名稱 `english-master-track-pwa-<BUILD_ID>`、預先快取 7 項、`cache: "reload"`、只回應清單內同源 GET、只清除本專案前綴的舊快取、禁止 API）；§10.7 更新流程 UP-1～UP-9 與訊息總表（只有頁面 → service worker 的 `SKIP_WAITING`）；§10.8 安裝按鈕 IN-1～IN-8；§10.9 不互通說明 NT-1；§10.10 儲存與隱私 PV-1～PV-7；§10.11 驗證規則 V-PWA-01～V-PWA-12。(2) §1 新增 4 列與 v0.11 型別數；§5.1 註明 PWA 不新增鍵；§8 新增 AC-34～AC-37、AC-24-12、AC-19-01／AC-21-01／AC-21-03／AC-23-02／AC-23-06（v0.11 修訂部分）對照。(3) 新增回饋上游 FB-37～FB-43、回饋下游 §9.5 DS-11～DS-18。(4) 原「§10 變更紀錄」改為 §11。(5) `data-schema.ts` 新增 §12（7 個型別、11 個常數）、`RuntimeState.pwa`；`storage-schema.json` 只改 meta（新增 `browserStoragePolicy`，AC-21-03）。型別數 59 → 66、契約常數 20 → 31、localStorage 鍵數維持 2；**持久化結構不變，`schemaVersion` 維持 2，不需遷移**；`src/data/` 格式不變（pg-content 無工作）。未改 PRD、未改持久化結構，符合 CLAUDE.md 主控代核條件 |
| 0.12 | 2026-11-03 | sa-agent | 修訂已核准的 v0.11（主控代核），原因：PRD v0.12（approved，JimmyLin，2026-11-03）新增 R-21 版面與視覺（US-38～US-41，修改 30 條既有 AC，Q-49～Q-57 全部已決議）。三檔 `status` 改為 `in-review`、`version` 0.12、核准欄位清空並同步，上游改為 PRD v0.12。(1) 新增 **§11 版面與視覺契約**：§11.1 名稱 NM-1～NM-6（App 顯示名稱「EnglishContext」用於 `<title>`、標題列、ORIGINAL 來源名稱、授權註解第一行；鍵名、備份格式、匯出檔名前綴、交付檔名、快取前綴 `english-master-track-pwa-` 明定不改）；§11.2 色彩 VC-1～VC-8（`COLOR_TOKENS`、`SEMANTIC_COLORS`、背景與 theme 綁定）；§11.3 只在記憶體的介面狀態總表；§11.4 主控台 DB-1～DB-6（區塊順序、移除功能入口與小環形圖、「開始今日學習」、目標行、3 格數據、「資料備份」收合狀態不持久化）；§11.5 首次畫面與色級列 FT-1～FT-6；§11.6 模擬測驗進度 MT-1～MT-2；§11.7 驗證 V-LAY-01～V-LAY-08。(2) §10 PWA 同步：MF 表 `theme_color` `#2f6fd6` → `#1e9bf0`（Q-54）、`background_color` `#f6f7f9` → `#eef4fa`（AC-34-04、AC-38-02）、HD-1 `theme-color` 與 `<title>EnglishContext</title>`、MF-4 改寫、DP-4 (d) maskable 改以 80% 安全圓判定（實際約 78%）、IN-1 顯示條件加 `dashboard.backupExpanded`、NT-1 收合規則、SW-2 與 V-PWA-04、V-PWA-06 文字同步、DS-13 背景值。(3) 修改 §1（新增 4 列與 v0.12 型別數）、§3.1、§4.3 ORIGINAL 全名、§5.1、§5.4 末段（3 格數據與近 7 天空狀態）、FS-3、§5.6、HT-2（移除主控台模組入口）、§6.1、§8（新增 AC-38～AC-41 與 v0.12 改寫 AC 的對照，移除小環形圖與功能入口的對照）。(4) FB-38、FB-40、FB-41 已解除；新增回饋上游 FB-44～FB-49、回饋下游 §9.6 DS-19～DS-25。(5) 原「§11 變更紀錄」改為 §12。(6) `data-schema.ts` 新增 §13（型別 `DashboardRuntimeState`；常數 `APP_DISPLAY_NAME`、`FROZEN_IDENTIFIERS`、`COLOR_TOKENS`、`SEMANTIC_COLORS`、`LAYOUT_TEXTS`）、`RuntimeState.dashboard`，修改 PWA 顏色常數；`storage-schema.json` 只改 meta。型別數 66 → 67、契約常數 31 → 36、localStorage 鍵數維持 2；**持久化結構不變，`schemaVersion` 維持 2，不需遷移**；`src/data/` 格式不變，只有 ORIGINAL `fullName` 一個值要改（1 個 CT 任務，DS-19）。未改 PRD、未改持久化結構，符合 CLAUDE.md 主控代核條件 |
| 0.13 | 2026-11-03 | sa-agent | 修訂已核准的 v0.12（主控代核），原因：PRD v0.13（approved，JimmyLin，2026-11-03）依 SD-FB-39 修改 AC-38-01：標題列品牌圖示（AC-38-05）的橘色「EC」對話框不受強調橘用途限制，與 App 圖示一致。三檔 `status` 改為 `in-review`、`version` 0.13、核准欄位清空並同步，上游改為 PRD v0.13。只改：(1) VC-3 加入「標題列品牌圖示除外」；(2) V-LAY-01 註明標題列品牌圖示不列入計算；(3) §11.2 token 表 `accent` 用途同步（與 PRD 色彩 token 表一致）；(4) `data-schema.ts` `COLOR_TOKENS.accent` 註解同步（值不變）；`storage-schema.json` 只改 meta。型別數 67、契約常數 36、localStorage 鍵數 2 皆不變；**持久化結構不變，`schemaVersion` 維持 2，不需遷移**；`src/data/` 不受影響。未改 PRD、未改持久化結構，符合 CLAUDE.md 主控代核條件 |

> **主控代核（2026-11-02）**：v0.9 依 PRD v0.9（JimmyLin 核准）增量修訂，未改 PRD、未改持久化結構（schemaVersion 維持 2、備份格式不變），符合 CLAUDE.md 主控代核範圍。`storage-schema.json` 內容無變動，維持 v0.8 approved，三檔版本不同步屬本版例外。FB-33～FB-35 接受 SA 處理方式，於下次 PRD 修訂時交 PM 確認。

> **主控代核（2026-11-02，v0.10）**：依 PRD v0.10（JimmyLin 核准）修訂；只改常數 SCORE_DEFAULT（600 → 725）、規則說明與範例，未改持久化結構（schemaVersion 維持 2、無遷移），符合 CLAUDE.md 主控代核範圍。三檔版本已同步為 0.10。FB-36 接受 SA 處理方式（構造 AC-26-06 測試狀態時 draftScore 與 appliedScore 設為同值）。

> **主控代核（2026-11-02，v0.11）**：依 PRD v0.11（JimmyLin 核准）新增 §10 PWA 契約；未改 PRD、未改持久化結構（schemaVersion 維持 2、localStorage 仍 2 鍵、無遷移），符合 CLAUDE.md 主控代核範圍。FB-37～FB-43 接受 SA 處理方式，FB-38、FB-40 於下次 PRD 修訂時交 PM 調整文字。三檔版本同步為 0.11。

> **主控代核（2026-11-03，v0.12）**：依 PRD v0.12（JimmyLin 核准）新增 §11 版面與視覺契約、同步 PWA theme／background 色；未改 PRD、未改持久化結構（schemaVersion 維持 2、localStorage 仍 2 鍵、無遷移；展開狀態只放記憶體），符合 CLAUDE.md 主控代核範圍。FB-44～FB-49 接受 SA 處理方式。三檔版本同步為 0.12。

> **主控代核（2026-11-03，v0.13）**：依 PRD v0.13（JimmyLin 核准）只修 VC-3、V-LAY-01、§11.2 accent 列與 COLOR_TOKENS.accent 註解，加入「標題列品牌圖示（AC-38-05）除外」；§11.2 一併修改接受。未改持久化結構（schemaVersion 2），符合主控代核範圍。
