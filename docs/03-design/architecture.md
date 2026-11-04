---
doc: ARCH
version: 0.11
status: approved
author: sd-agent
approved_by: JimmyLin（對話中授權「修正好測試沒問題就直接推」，主控代填欄位）
approved_at: 2026-11-04
---

# English Master Track — 系統架構與設計

> 上游：`docs/01-PRD.md` v0.16（approved，JimmyLin，2026-11-04；R-24）、`docs/02-contract/` v0.16（三檔 approved，主控代核，2026-11-04；只改文字常數與規則）。v0.10 時的上游：`docs/01-PRD.md` v0.15（approved，JimmyLin，2026-11-04）、`docs/02-contract/` v0.15（README.md、data-schema.ts、storage-schema.json 三檔 approved，JimmyLin 核准 Q-63 持久化結構變更，2026-11-04）、`package.json` `version` 本版由主控改為 `1.1.0`（Q-70 A，tasks.json MC-04）。v0.9 以前的內容仍有效，除非本版明文修改。**契約 C-8 同樣適用本文件**：v0.4～v0.9 段落中描述「目前」持久化結構的「`schemaVersion` 2」「`PersistedData` 9 欄」「欄位集合不變」，v0.10 起讀作「`CURRENT_SCHEMA_VERSION`（3）、12 欄，且該段所述操作不改變版本與欄位集合」；遷移 MG-1～MG-4 等歷史敘述照原意。
> 搭配文件：`docs/03-design/tasks.json` v0.10（共 102 個任務：既有 101 個全部 `done` 不變；v0.11 新增 FE-77 共 1 個，見 §12.10）。v0.10 時為 v0.9（101 個任務：v0.10 新增 FE-70～FE-76 共 7 個、CT-25 共 1 個，另有主控手動項目 MC-04，見 §12.9）。
> **v0.11 增量導讀**（上游改為 PRD v0.16（approved，JimmyLin，2026-11-04；R-24）、契約 v0.16（三檔 approved，主控代核：`PWA_TEXTS` 新文字、`SOURCES_CONTACT_TEXT`、L-7、DS-40、FB-61、FB-62）；新增 AC-23-07，修改 AC-36-03、AC-42-04 文字，E-118～E-120）：**只改文字**，不改持久化結構（`schemaVersion` 3、鍵數 2）、不改 `src/data/`、不改建置程式、網站版本維持 1.1.0。(1) 新版提示文字改為「有新版本，請更新版本」、按鈕「更新版本」，行為依 Q-43 決議 A 不變（§7.22.1）；**改讀規則**：v0.10 以前段落（§1、§7.18、§10.4、§12.6～§12.9、T-49、SD-FB-63 等）提到的「有新版本，重新整理」「按『重新整理』」一律讀作新文字，歷史敘述照原意。(2) 「資料來源與授權」頁內容區末端新增 1 行聯絡資訊（`SOURCES_CONTACT_TEXT`，純文字、非連結、防爬蟲，§7.22.2）。(3) 單元測試與交付 HTML 靜態檢查（§10.8），重新建置取代人類手改的 `dist/`（FB-61、QA BUG-004）。(4) 使用者決定本次**不另跑 QA 輪次**：驗收由 PG 自測＋主控檢查（§10.8）。任務只有 FE-77（§12.10）。同步修訂 §1、§3（D-16）、§5.6、§7.22、§10.8、§11（T-87～T-90）、§12.10、§13.8、§14、§15（SD-FB-65～SD-FB-67）。
> **v0.10 增量導讀**（PRD R-23、US-44～US-47、AC-44-01～AC-47-08，修改 AC-18-01／24-02／32-02／42-02，E-102～E-117，Q-63～Q-71；契約 v0.15 C-8、§5.3 MG-5～MG-8、RD-3、RD-4、§5.10 FP-1～FP-9、§5.11 CR-1～CR-9、UO-1～UO-9、§5.12 WR-1～WR-5、§6 IM-9、IM-10、§7 V-P5-08、V-ST-18～V-ST-22、§5.7 CI 修改、data-schema §15、§9.8 DS-32～DS-39、FB-54～FB-60）：**持久化結構 `schemaVersion` 2 → 3**（鍵名、鍵數不變；`PersistedData` 加 3 個選填欄位）。(1) 遷移與讀取：`core/persist.js` 新增 `MIGRATIONS[2]`（MG-6）、**任何版本**遷移後一律先做 RD-1 再做 RD-3（修正現行「遷移過就跳過 RD-1」的寫法，T-76）；測試夾具改用 v0.14 交付檔實際寫出的 localStorage 與備份原文（FE-70，§7.21.1）。(2) 單字卡位置：新 L1 模組 `core/position.js`（FP-2 解析）；store 以單一入口 `gotoCard` 寫入、`placeCard` 統一處理單字集重建（取代刪除自訂單字的舊定位邏輯，§7.21.2）。(3) 模擬測驗：新 L1 模組 `core/part5flow.js` 集中「作答、下一題、重新開始、開關、全部再練、清除紀錄」的狀態轉移與 UO-3 畫面種類（§7.21.3）；畫面新增「已答對 K / Q 題」、「✓ 曾答對」、開關、「全部答對」畫面與確認對話框，文字定稿見 §7.21.4。(4) 容量不足提示收斂為 store 單一函式 `commitWrite`，整個工作階段最多提示 1 次（§7.21.5）。(5) 題目 id 穩定性檢查列為 CT-25（§7.21.6）；網站版本 1.1.0 由主控 MC-04 修改（§7.21.7）。同步修訂 §1、§2、§3（D-15）、§4.10、§5.5、§6.6、§10.7、§11（T-75～T-86）、§12.9、§13.7、§14、§15（SD-FB-57～SD-FB-64）。
> **v0.9 增量導讀**（PRD R-22、US-42、US-43、AC-01-08、改寫 AC-39-04 等 13 條、暫停 AC-05-01～05、Q-58～Q-62；契約 §12 VR／LS／V-VER、§5.8 HT-6～HT-9、data-schema §14、§9.7 DS-26～DS-31、FB-50～FB-53）：**不改持久化結構**（`schemaVersion` 2）、不改 `src/data/`。(1) 網站版本號：建置讀 `package.json` `version` → SemVer 驗證 → 取代 `@@APP_VERSION@@` → **之後**才算 BUILD_ID（§5.4）；新模組 `core/version.js`（§14 常數與純函式，建置與頁面共用）與 `ui/version-line.js`（啟動時讀兩個 meta、在頁尾「資料來源與授權」正下方建立版本行，不合法整行不建，§7.20.1）。(2) 領域範本區塊 `hidden` + `inert`；空狀態文字定案、自訂清單來源標示只留「自訂擴充」（§7.20.2）。(3) 難易度設定頁狀態列改為一行「目前色級：{生效色級}」（§7.20.3）。(4) 主控台目標行一律 `goalLineSame`（依生效色級）、移除「・」，「變更」改外框按鈕（§7.20.4）。同步修訂 §1、§3、§4.9、§5.4、§6.5、§10.6、§11（T-67～T-74）、§12.8、§13.6、§14、§15（SD-FB-50～SD-FB-56）。
> **v0.8 增量導讀**（PRD R-21、US-38～US-41、Q-49～Q-57，修改 30 條 AC；契約 §11 NM／VC／DB／FT／MT／V-LAY、data-schema §13、§9.6 DS-19～DS-25、FB-44～FB-49）：版面與視覺改版，**功能行為與持久化結構不變**（`schemaVersion` 2）。重點：CSS token 重整（`--primary` 改為深品牌色、新增 `--brand`／`--accent`／`--line`／`--track`、卡片圓角 16px 加陰影去灰框，§7.19.1～§7.19.2）；標題列內嵌 SVG 圖示與名稱「EnglishContext」（§7.19.3）；主控台改為今日任務卡 → 3 格數據 → 近 7 天圖表 → 收合「資料備份」、720px 置中（§7.19.4）；首次畫面與難易度設定頁改精簡色級列，首次畫面固定底部列（§7.19.5）；模擬測驗進度條與 720px（§7.19.6）；單字卡頁只換配色（§7.19.7）；PWA `theme_color`／`background_color`／`<title>` 同步（§7.19.9）；效能、減少動態、鍵盤與無障礙評估（§7.19.10）。新模組 `core/layout.js`（契約 §13 常數與純函式）；`store` 新增 `runtime.dashboard` 與 `setBackupExpanded`。同步修訂 §1、§2、§3、§4.8、§5.3、§6.4、§9、§10.5、§11（T-55～T-66）、§12.7、§13.5、§14、§15（SD-FB-39～SD-FB-49）。`src/data/` 只改 ORIGINAL `fullName`（CT-24，DS-19）。
> **v0.7 增量導讀**（PRD R-20、US-34～US-37、AC-24-12、Q-41～Q-48；契約 §10 DP／MF／HD／PE／SW／UP／IN／NT／PV、V-PWA-01～12、§9.5 DS-11～DS-18、FB-37～FB-43）：加入 PWA。同一份 HTML 兩種形態——`file://` 雙擊（不註冊、零請求）與 https 部署目錄 `dist/site/`（manifest、service worker、圖示、`ads.txt`）。建置新增 B-10～B-16（PWA 輸入、BUILD_ID、`sw.js` 注入、部署目錄），B-7 以「逐字白名單」允許唯一的靜態 `<link rel="icon" href="data:,">`（§5.1）；GitHub Actions 改為 CI 建置後整個上傳 `dist/site/`（§5.2，主控執行）；新模組 `core/pwa.js`、`services/pwa.js`、`ui/pwa-notice.js`、`pwa/sw.template.js`、`tools/serve.mjs`（§3、§4.7、§7.18）。同步修訂 §1、§3、§5、§6.3、§9、§10.4、§11（T-45～T-54）、§12.6、§13.4、§14、§15（SD-FB-31～SD-FB-38）。**不改持久化結構**（`schemaVersion` 2）、不改 `src/data/`、不建 CT 任務。
> **v0.6 增量導讀**（PRD R-19、Q-39、Q-40；契約 §5.9 GS-1～GS-8、V-ST-16、§9.4 DS-07～DS-10、FB-36）：難易度設定改為「只選色級、不顯示分數」。點卡片設為該色 `scoreMax`（取代 Q-32，§7.1）；預設分數一律引用 `SCORE_DEFAULT`（725）；首次畫面與一般頁隱藏滑桿、輸入框（不可見、不可聚焦）、卡片移除分數範圍、狀態列與主控台移除目標分數（§7.17）；AC-22-04 量測點改為點卡片；取消初始化確認時卡片回到原色級。同步修訂 §1、§3、§4.3、§7.9、§9、§10.3、§11（T-40～T-44）、§12.5、§13.3、§14、§15（SD-FB-28～SD-FB-30）。**不改持久化結構**（`schemaVersion` 2）、不改 `src/data/`。
> **v0.5 增量導讀**（PRD R-18、契約 §5.7、§5.8、§9.3 DS-01～DS-06）：麥克風與收音條（§7.14，推翻原「不使用 `getUserMedia`」限制，仍禁止錄音）、切換難易度初始化確認視窗（§7.15）、隱藏解碼器與句型庫（§7.16）；同步修訂 §7.6（STT 與錯誤對照）、§7.11（減少動態）、§7.13（導覽 4 項）、§9（底部導覽 4 欄）、§10（靜態檢查、V-MIC 實機驗證、§10.2）、§11（T-32～T-39）、§12.4 批次、§13.2 AC 對照、§14 DS 回應、§15 SD-FB-20～SD-FB-27。
> 本文件只做設計，不改需求與契約；有疑義寫在 §15「回饋上游」。
> **v0.4 增量導讀**：功能更名 R-15（§7.13）、首次進入流程與狀態機（§7.9）、學習事件記錄點（§7.7）、v1 → v2 遷移（§7.8）、手勢判斷（§7.10）、動畫與減少動態（§7.11）、Q-33 設計常數（§7.12）、底部導覽斷點（§9.1）、測試命令與新增測試（§10.1）、容量估算（§6.1）、批次（§12.3）、AC 對照（§13.1）。

---

## 1. 設計摘要

| 項目 | 決定 | 依據 |
| :--- | :--- | :--- |
| 交付物 | `dist/english-master-track.html` 單一檔案，CSS、JS、資料全部內嵌 | NFR-1、AC-19-01～AC-19-04 |
| 前端技術 | 原生 JavaScript（ES2020，classic script，不用 ES module）＋ 原生 DOM API；**零執行期相依套件**、零框架 | 離線、`file://` 可執行（AC-19-03）、檔案大小（AC-19-04） |
| 樣式 | 手寫 CSS（CSS 自訂屬性 + 行動優先 RWD），依頁面分檔，建置時串接成一個 `<style>` | Q-17、AC-19-01、AC-20-01 |
| 建置 | `tools/build.mjs`（Node 內建模組，**無 npm 相依**）：串接資料、程式、樣式、授權標頭 → 單一 HTML，並做大小與外部資源檢查 | 主控補充 6、AC-19-01、AC-19-04、AC-23-06 |
| 狀態 | 單一 store（`AppState` = `PersistedData` + `RuntimeState`），所有寫入走 action，一次 `setItem` 寫整筆 `StorageRecord` | 契約 §5.3、AC-18-01 |
| 內容資料 | `src/data/*.js`，每檔只含 `window.X = <JSON 字面值>`（C-4）；字庫依排名分 15 檔 | 契約 §3.1、V-VOC-13 |
| 內容工具 | `src/data/_tools/*.mjs`（pg-content 撰寫）：讀 `sources/`、算排名、產骨架、匯出素材、合併、抽樣、驗證；**不打包** | 契約 §7「pg-content 必須以 Node 自驗」、R-01 |
| 測試 | 單元：`node --test`（Node 內建）；資料：`_tools/validate.mjs`；E2E：QA 以 Playwright 對建置產物（`tests/`）；人工：語音、離線、RWD、效能、原創性 | §10 |
| （v0.4）介面互動 | 動畫全部用內嵌 CSS `@keyframes`／`transition`；手勢用原生 Touch Events；震動用 `navigator.vibrate`；圖示、環形圖、長條圖用內嵌 SVG 或 CSS。**不引入任何函式庫**；動畫時間只放在 CSS 變數與 `core/interaction.js` 常數兩處，以單元測試比對一致 | AC-31-04、Q-33、§7.11、§7.12 |
| （v0.4）持久化 v2 | `schemaVersion` 2：`PersistedData` 加 `todayLearned`、`learnedHistory`；遷移、讀取規則、備份 v1／v2 匯入全部在 `core/persist.js`、`core/backup.js`；學習紀錄的純規則在新模組 `core/learning.js` | 契約 §5.3～§5.4、§6.3、R-17、§7.7、§7.8 |
| （v0.4）首次進入 | 執行期 `entryMode`（`firstRun`／`main`）由 store 在啟動時判定一次；首次畫面重用難易度設定頁（`customizer`），導覽以 `body[data-entry]` 的 CSS 隱藏；首次期間 store 不寫入 localStorage | 契約 §5.5 FS-1～FS-7、§7.9 |
| （v0.5）麥克風與收音條 | **允許** `navigator.mediaDevices.getUserMedia({ audio: true })` + Web Audio `AnalyserNode` 只讀即時音量；**仍禁止**錄音 API（`MediaRecorder`）、`Blob`／`createObjectURL` 輸出音訊、連到 `destination`、任何網路傳送；不保存任何音訊或音量值。音軌只在停留單字卡頁期間保留（Q-36），離開單字卡頁、重新整理、關閉分頁時釋放。新模組 `services/mic.js`（L3）、`core/meter.js`（L1） | R-18 二、US-33、AC-21-03、契約 DS-01～DS-03、§7.14 |
| （v0.5）切換難易度初始化 | 「套用」時生效色級改變且有學習紀錄 → 確認視窗；「確定」以白名單 `LEARNING_PROGRESS_FIELDS` 建立**新物件**並以**一次** `setItem` 寫入，成功才替換記憶體，失敗整個不套用。純規則在新模組 `core/reinit.js`；store 新增 `requestApplyGoal`／`confirmApplyGoal`／`cancelApplyGoal` | R-18 一、US-32、契約 §5.7 CI-1～CI-10、DS-04、§7.15 |
| （v0.5）隱藏頁面 | 導覽改為 `NAV_TAB_ORDER` 4 項；主控台入口 3 項 + 資料來源；router、store 以 `HIDDEN_TAB_IDS` 守門（嘗試進入改顯示主控台）；解碼器、句型庫的 view 程式、CSS、資料檔照常打包，只是永遠不會被 mount | R-18 三、AC-20-04、契約 §5.8 HT-1～HT-5、DS-05、§7.16 |
| （v0.6）只選色級、不顯示分數 | 點卡片 → `draftScore` = 該色 `scoreMax`（`goal.scoreForCard`）；預設分數一律引用 `SCORE_DEFAULT`（725）；分數區（滑桿、輸入框、錯誤提示）**保留程式**但整區以 `hidden` + `inert` 隱藏、兩個輸入元件另加 `disabled` 與 `tabindex="-1"`；卡片不建立分數範圍節點；狀態列與主控台不建立「目前目標分數」節點；目標分數只存在資料中 | R-19、Q-39、契約 §5.9 GS-1～GS-8、DS-07～DS-10、§7.17 |
| （v0.7）交付形態 | **同一份 HTML** 兩種用法：`dist/english-master-track.html`（`file://` 雙擊，**保留**）與部署目錄 `dist/site/index.html`（逐位元組相同）；`dist/site/` 恰 8 檔（契約 DP-1） | R-20 (1)、AC-19-01、AC-36-07、DP-1、DP-2 |
| （v0.7）PWA 啟用 | 啟動時以 `core/pwa.js` `isEligible` 判定一次（PE-1：https，或 http 且主機 `localhost`／`127.0.0.1`，且 `isSecureContext`，且有 `navigator.serviceWorker`）；不成立 → 全部不做（PE-2）。manifest 與 `apple-touch-icon` 連結**只以程式加入**（HD-2），HTML 原始檔不含 | AC-37-01～AC-37-04、PE-1～PE-4、HD-2、HD-3 |
| （v0.7）service worker | `src/app/pwa/sw.template.js`（不打包進 HTML）；建置注入 BUILD_ID 與預先快取清單輸出 `dist/site/sw.js`；只快取 7 個靜態網址、只攔截這 7 個網址的同源 GET；更新採「提示後使用者按下才換版」（Q-43 A） | SW-1～SW-11、UP-1～UP-9、AC-35-*、AC-36-03～AC-36-06 |
| （v0.7）建置識別碼 | BUILD_ID = SHA-256（Node 內建 `crypto`）對「注入前 HTML、manifest、4 張圖示、`sw` 範本」依固定格式計算取前 16 字元；**不含時間、亂數、絕對路徑**；寫入 HTML `<meta name="emt-build-id">` 與 `sw.js` | SW-2、AC-36-01、AC-36-02 |
| （v0.7）部署 | `.github/workflows/static.yml` 改為：Node 22 → `npm run build`（**不執行 `npm ci`**：零相依、無 lockfile）→ 驗證 → 整個上傳 `dist/site/`；由主控依 §5.2 修改一次（Q-46） | AC-36-07、DS-15 |
| （v0.7）PWA 畫面 | 主控台「匯出備份」區塊：按鈕列之後常駐 NT-1 說明，其後在 IN-1 成立時渲染「安裝 App」；新版提示為頁首下方的 sticky 文字列（`#pwa-update`），任何頁面、任何 `entryMode` 皆可顯示 | AC-24-12、AC-34-07～AC-34-10、AC-36-03、NT-1、IN-1、UP-6 |
| （v0.8）色彩 token | `00-base.css` `:root` 定義契約 `COLOR_TOKENS`（`--brand`、`--brand-deep`、`--accent`、`--accent-text`、`--bg`、`--surface`、`--text`、`--text-muted`）；沿用變數名 `--primary` 但值改為深品牌色 `#0866ad`（既有 `var(--primary)` 自動改為白字可達 4.5:1 的顏色）；色級、對錯、燈號、達成金色變數**逐字不變**；`--border`（`#d5d9e0`）只留給表單輸入框、作答選項、收音條暗格；分隔線改 `--line` | VC-1～VC-8、AC-38-01～AC-38-04、§7.19.1 |
| （v0.8）卡片與按鈕 | `.card`：白底、圓角 16px、陰影、無邊框；`.btn`：邊框透明、次要按鈕淡藍底；新增 `.btn--accent`（強調橘底、深色字，只給「開始今日學習」「開始學習」）；全域 `font-variant-numeric: tabular-nums`；焦點框 3px 深品牌色。單字卡頁卡片幾何維持 v0.11（只換配色） | AC-38-06、AC-38-07、AC-38-08、AC-38-09、§7.19.2 |
| （v0.8）名稱與圖示 | `<title>`、標題列 `h1`、授權註解第一行改為「EnglishContext」；標題列左側 32px **內嵌 SVG**（不寫 `xmlns`、`aria-hidden`、無 `<img>`、無 data URI）；`FROZEN_IDENTIFIERS`（鍵名、備份格式、匯出檔名、交付檔名、快取前綴、`emt-build-id`）一律不改 | NM-1～NM-6、AC-38-05、AC-38-10、§7.19.3 |
| （v0.8）版面常數 | 內容寬 720px（主控台、模擬測驗、難易度設定）置中；斷點沿用 640px（= `NAV_BOTTOM_MAX_PX`）；首次畫面 ≤ 640px 固定底部列，預留 184px；近 7 天長條軌道 64px；進度條高 6px；以上收在 `core/layout.js` `UI_LAYOUT` 與 CSS 變數 | 契約 §5.6 v0.12 段、AC-39-10、AC-40-02、AC-41-03、AC-39-07 |
| （v0.8）新介面狀態 | 只有 `RuntimeState.dashboard.backupExpanded`（記憶體、tag `"dashboard"`、不寫 localStorage）；進度條、空狀態、首次選中列皆為推導值 | 契約 §11.3、DB-6、MT-1 |
| （v0.9）網站版本號 | 唯一來源 = 建置時 `package.json` `version`；建置寫入 `<meta name="emt-app-version">`（佔位 `@@APP_VERSION@@`），寫入後才計算 BUILD_ID；頁面只讀 DOM 中兩個 meta，**不**讀檔、不發請求、不持久化；常數與純函式集中在 `core/version.js`（建置以 `createRequire` 共用，比照 `core/pwa.js`） | VR-1～VR-9、AC-42-01～AC-42-04 |
| （v0.9）頁尾版本行 | `ui/version-line.js` 在 `main.js` 啟動時執行一次：兩個 meta 皆合法才建立 `p#app-version`（插在 `#footer-sources` 之後）；任一不合法則不建節點、不拋錯。頁尾為全站共用的 `#app-footer`，因此每個畫面恰 1 行 | VR-5、VR-7、VR-8、AC-42-01、AC-41-04 |
| （v0.9）領域範本 | `custom-vocab.js` 範本 `section` 建立時即帶 `hidden` + `inert`；注入程式、`templates.js` 照常打包；畫面文字移除「範本」；`origin = "template"` 項目只標「自訂擴充」 | HT-6～HT-9、AC-43-01～AC-43-03 |
| （v0.9）色級顯示 | 難易度設定頁狀態列 = `levelStatus` 一行；主控台目標行 = `goalLineSame`（依生效色級，色點也依生效色級）＋外框按鈕「變更」；`goalLineCapped`、`goalLineSeparator` 只保留在常數中、不再渲染 | LS-1～LS-5、DB-4（v0.14）、AC-01-08、AC-39-04 |
| （v0.10）持久化 v3 | `CURRENT_SCHEMA_VERSION` 3、`SUPPORTED_SCHEMA_VERSIONS` `[1, 2, 3]`；`PersistedData` 加選填 `flashcardPosition`、`part5CorrectIds`、`part5UnansweredOnly`，**程式寫出一律 12 欄**；遷移鏈 1 → 2 → 3 由 `persist.migrate` 逐版執行，localStorage 讀取與備份匯入共用；遷移後依 MG-7 寫回一次 | MG-5～MG-8、RD-3、RD-4、IM-9、IM-10、AC-47-03、AC-47-04 |
| （v0.10）單字卡位置 | 純規則在新 L1 模組 `core/position.js`；store 只有一個換卡入口 `gotoCard`（按鈕、滑動、測驗模式換題共用）在同一事件內 `setItem`；單字集重建（新增／刪除自訂單字、匯入、啟動）一律走 store 內部 `placeCard`（FP-2），不再使用 `custom.indexAfterDelete` 與 `keepCurrentCard`；生效色級改變時位置設 `null`、未改變時位置與目前卡片**不變**（FB-54） | FP-1～FP-9、AC-44-01～AC-44-10 |
| （v0.10）答對紀錄與只練沒答對 | 狀態轉移全部在新 L1 模組 `core/part5flow.js`（純函式、單元測試涵蓋全部邊界）；`K`、畫面種類（`Part5ViewKind`）每次繪製時推導，不另存；開關正規化（UO-4）在啟動、匯入、開啟開關三處呼叫；題號與進度條維持題庫題號（Q-66 A） | CR-1～CR-9、UO-1～UO-9、AC-45-01～AC-46-10 |
| （v0.10）容量不足提示 | store 一般寫入收斂為 `commitWrite`：記憶體保留、`learningQuotaNoticeShown` 為 false 時發 `"learningQuota"` tag 由 banner 提示 1 次；新增自訂單字、範本注入、初始化、匯入維持各自的既有處理 | WR-2、DS-36、AC-44-10、AC-47-07 |
| （v0.10）網站版本 | `package.json` `version` 由主控改為 `1.1.0`（MC-04）；建置與頁面程式不變（版本值不寫死） | Q-70 A、DS-38、AC-42-02 |
| （v0.11）更新提示文字 | 只改 `core/pwa.js` `PWA_TEXTS.updateNotice`「有新版本，請更新版本」、`updateButton`「更新版本」；`ui/pwa-notice.js`、`services/pwa.js` 本來就逐字取常數，**不改**；顯示條件與按下後行為不變 | R-24 一、UP-4～UP-7、AC-36-03、E-120 |
| （v0.11）資料來源頁聯絡行 | 常數 `SOURCES_CONTACT_TEXT` 定義在 `views/sources-page.js`（唯一一處字面值，帶空格）；`render` 在 `.src-page` 最後加 1 個 `<p class="src-muted src-contact">`，以 `textContent` 寫入；不是連結、無 `tabindex`、無事件；樣式 `font-size: 0.8125rem`、`overflow-wrap: anywhere`（§7.22.2） | R-24 二、L-7、AC-23-07、E-118、E-119 |
| （v0.11）交付物 | 以 `npm run build` 重新產生 `dist/`，取代人類手改的 `dist/english-master-track.html`（FB-61、QA BUG-004）；版本仍 1.1.0，BUILD_ID 隨內容改變屬預期 | DS-40 (4)、AC-36-07 |

---

## 2. 架構圖與分層

```
┌──────────────────────────── dist/english-master-track.html（單一檔案）────────────────────────────┐
│ <!DOCTYPE html><html lang><head><meta charset="utf-8">（前 1,024 bytes 內，v0.2）                   │
│ <!-- 授權標頭：MIT 全文 + CC BY-SA 4.0 聲明（AC-23-06），緊接在 charset 之後 -->                     │
│ <style>  styles/*.css 串接  </style>                                                               │
│ <body>  index.html 殼：頁首、儲存警示列、導覽、7 個 <section>、頁尾、toast、dialog 掛載點            │
│                                                                                                    │
│ ┌─ 資料層（pg-content，src/data/）── 先載入 ─────────────────────────────────────────────────────┐ │
│ │ window.DATA_SOURCE_REGISTRY / VOCAB_MANIFEST / PROJECT_LICENSE      ← sources.js               │ │
│ │ window.MASTER_VOCAB_DATABASE（15 檔 concat，建置時合併為一個陣列）  ← vocab-XXXX.js           │ │
│ │ window.DOMAIN_TEMPLATES / PART5_QUESTION_BANK / DECODER_SENTENCES /                            │ │
│ │        READING_STRATEGIES / ACADEMIC_PHRASEBANK                     ← 其餘資料檔                │ │
│ └────────────────────────────────────────────────────────────────────────────────────────────────┘ │
│              │ 唯一介面：window 全域變數（契約 §11），前端一律容忍缺漏（C-6）                       │
│ ┌─ 程式層（pg-frontend，src/app/）── 一個 <script>，依層序串接 ──────────────────────────────────┐ │
│ │ L1 core/      純函式（無 DOM、無 localStorage）：常數、分數試算、wordKey、單字集、自訂字、       │ │
│ │               相似度、打卡、四選一、正確率、持久化驗證／遷移、備份匯入匯出、內容讀取、         │ │
│ │               （v0.4）學習紀錄 learning、介面互動常數與手勢判斷 interaction                    │ │
│ │               （v0.5）收音條音量計算 meter、切換難易度初始化規則 reinit                         │ │
│ │                 ↑ Node 可直接 require 做單元測試                                               │ │
│ │ L2 state/     store：AppState、actions、訂閱、localStorage 轉接（例外／容量）、（v0.4）entryMode、│ │
│ │               學習事件記錄                                                                     │ │
│ │ L3 services/  瀏覽器 API 包裝：TTS、STT、剪貼簿、檔案下載、（v0.4）震動 haptics、               │ │
│ │               （v0.5）麥克風 mic（getUserMedia + AnalyserNode，只讀音量、不錄音）              │ │
│ │ L4 ui/        共用元件：路由（頁籤、換頁動畫、首次模式限制）、toast、確認對話框、儲存警示列、    │ │
│ │               （v0.4）motion（減少動態判斷與動畫 class）、bottom-nav、import-flow（共用匯入流程）│ │
│ │ L5 views/     各頁面：主控台、難易度設定（含首次畫面）、自訂單字、單字卡（+語音面板、四選一）、│ │
│ │               模擬測驗、解碼器、句型庫、資料來源與授權（v0.4 畫面名稱依 R-15，識別字不改）     │ │
│ │               （v0.5 解碼器、句型庫隱藏：照常登錄與打包，但 router 拒絕進入，永不 mount）       │ │
│ │ main.js       啟動：content.load → store.init → banner → 設 body[data-entry] →                 │ │
│ │               router.start(firstRun ? "customizer" : "dashboard") → bottomNav.init（v0.4）     │ │
│ └────────────────────────────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────────────────┘
      ▲ 唯讀輸入（不打包）                                         ▼ 使用者狀態
  sources/wordlists、sources/ecdict  ──(_tools)──► src/data     localStorage「englishMasterTrack:state」
```

| 層 | 可以依賴 | 不可以 | 說明 |
| :--- | :--- | :--- | :--- |
| 資料層 | — | 函式、`undefined`、HTML 字串 | 契約 C-4、V-VOC-10 |
| L1 core | 其他 core 模組（v0.3：`constants`、`wordkey` 可在載入時取用；其餘 core 依賴一律在函式被呼叫時才取用，見 §4.1 LD-1；不得循環依賴） | DOM、`window` 全域資料、`localStorage`、`Math.random` 以外的副作用 | 可在 Node 測試；亂數以參數注入（預設 `Math.random`） |
| L2 state | L1 | DOM | 唯一能讀寫 `localStorage` 的地方 |
| L3 services | L1 | 直接改 store | 只包裝瀏覽器 API，回呼通知呼叫端 |
| L4 ui | L1、L2 | — | 所有 DOM 寫入經 `core/dom.js`（純文字） |
| L5 views | L1～L4 | 互相直接呼叫（只能透過 store 或 §4.4、§4.5 的元件介面） | 每頁一檔，各自的 CSS 檔 |

（v0.7）新模組的層別：`core/pwa.js` 屬 L1（PWA 契約常數與純函式，無依賴；**同時**被 `tools/build.mjs` 以 `createRequire` 讀取，作為建置與頁面共用的唯一常數來源）；`services/pwa.js` 屬 L3（包裝 `navigator.serviceWorker`、`beforeinstallprompt`、`appinstalled`、`visibilitychange` 與 `<head>` 連結加入；不直接改 store，以 `onChange(patch)` 回呼通知 `main.js`）；`ui/pwa-notice.js` 屬 L4（新版提示列；「重新整理」動作由 `main.js` 以回呼注入，L4 不呼叫 L3）。`src/app/pwa/sw.template.js` **不屬任何層**：不打包進 HTML，只由建置讀取、注入後輸出為 `dist/site/sw.js`，在 service worker 全域執行（無 `window`、無 `EMT`）。

```
                 ┌─────────── 瀏覽器分頁（同一份 HTML）────────────┐
 file:// 開啟 ──►│ main.js → services.pwa.start()                   │
                 │   core.pwa.isEligible() = false → 全部不做（PE-2）│──► 0 個請求、0 個 SW
                 └──────────────────────────────────────────────────┘
                 ┌──────────────────────────────────────────────────┐
 https/localhost►│ isEligible() = true                              │
                 │  ├ <head> 加 manifest、apple-touch-icon（HD-2）   │──► GET manifest.webmanifest、icons/*
                 │  ├ beforeinstallprompt／appinstalled → setPwa     │
                 │  └ load 後 register("./sw.js")（SW-1）            │──► GET sw.js（updateViaCache: none）
                 │       updatefound／waiting → setPwa(updateAvailable)
                 │       「重新整理」→ postMessage SKIP_WAITING → controllerchange → reload 1 次
                 └──────────────────────────────────────────────────┘
                         ▲ 只回應 7 個預先快取網址（SW-6）
                 ┌─────── dist/site/sw.js（Cache "english-master-track-pwa-<BUILD_ID>"）───────┐
                 │ install：cache:"reload" 取 7 項 → 全部 200 才寫入 │ activate：刪本前綴舊快取 → claim │
                 └─────────────────────────────────────────────────────────────────────────────┘
```

（v0.9）新模組的層別：`core/version.js` 屬 L1（契約 §14 常數與純函式；**載入時不取用任何模組**，`PWA_BUILD_ID_PATTERN` 在函式被呼叫時才向 `core/pwa.js` 取用，LD-1；**同時**被 `tools/build.mjs` 以 `createRequire` 讀取，作為建置與頁面共用的唯一版本常數來源，比照 `core/pwa.js`）；`ui/version-line.js` 屬 L4（載入時只登錄 `EMT.ui.versionLine`，LD-2；`init()` 才讀 `document`）。資料流：`package.json` →（建置）→ HTML `<meta name="emt-app-version">`、`<meta name="emt-build-id">` →（啟動時讀一次）→ `p#app-version` 的 `textContent`。不經過 store、不寫 localStorage。

（v0.10）新模組的層別：`core/position.js`、`core/part5flow.js` 皆屬 L1。`position.js` 載入時只取 `wordkey`（LD-1 允許）；`part5flow.js` 載入時**不取用任何模組**（只處理字串 id 與 `Part5Progress`，題庫以 `bankIds` 陣列傳入）。`core/persist.js`、`core/backup.js` 於**函式被呼叫時**才向兩者取用（LD-1；Node 以 `require`、瀏覽器以 `EMT.core.position`／`EMT.core.part5flow`，取不到依 LD-3 丟出含模組名稱的錯誤）。建置依檔名排序串接 core（`constants.js`、`wordkey.js` 最先），兩個新檔不需修改 `tools/build.mjs`（§5.5）。資料流：

```
localStorage／備份 ──persist.parseStored／backup.importSteps──► PersistedData（12 欄，已 RD-3／IM-10、UO-4）
        ▲                                                            │
        │ commitWrite（一次 setItem）                                 ▼
  store actions ◄── views（flashcards：gotoCard；part5：answer／next／restart／開關／再練／清除）
        │  placeCard = position.resolve(flashcardPosition, studySet) → runtime.flashcard.index
        └─ part5flow.*（狀態轉移）；views/part5 以 part5flow.viewKind 推導畫面種類與 K
```

（v0.8）新模組 `core/layout.js` 屬 L1：契約 §13 常數（`APP_DISPLAY_NAME`、`FROZEN_IDENTIFIERS`、`COLOR_TOKENS`、`SEMANTIC_COLORS`、`LAYOUT_TEXTS`）與版面純函式（格式字串、千分位、目標行、試算摘要行、空狀態判定、進度條推導）；**載入時不取用任何模組**（LD-1），Node 可直接 `require`；不讀 DOM、不讀 `window` 資料。CSS 變數是畫面實際使用的顏色來源，`core/layout.js` 的 `COLOR_TOKENS` 只供測試比對與文件化（`tokens.test.js` 讀 CSS 與常數比對，§10.5）。

（v0.5）新模組的層別：`core/meter.js`、`core/reinit.js` 屬 L1（遵守 LD-1：載入時只取 `constants`；`reinit` 呼叫 `goal`、`learning`、`persist` 一律在函式內取用）；`services/mic.js` 屬 L3（只包裝 `getUserMedia`、`AudioContext`，不改 store；音訊物件與音量值**不得**進入 `AppState`，契約 AC-21-03 對照）。

（v0.4）新模組的層別：`core/learning.js`、`core/interaction.js` 屬 L1（遵守 LD-1：載入時只取 `constants`、`wordkey`）；`services/haptics.js` 屬 L3；`ui/motion.js`、`ui/bottom-nav.js`、`ui/import-flow.js` 屬 L4（遵守 LD-2：載入時只登錄）。首次畫面的「從備份還原」與主控台的匯入是兩個 view，不得互相呼叫，因此共用流程放在 L4 的 `ui/import-flow.js`（§4.5）。

---

## 3. 目錄結構與負責代理

```
（專案根目錄）
├─ package.json                        pg-frontend  FE-01（scripts：build、test、validate:data；無 dependencies；engines node >= 22，見 §5）→ FE-47（v0.7：加 `serve`）
├─ .github/workflows/static.yml        主控（MC-03，Q-46 授權修改一次；內容見 §5.2）
├─ tools/
│  ├─ build.mjs                        pg-frontend  FE-01（FE-18 可調整壓縮層級）→ FE-41（v0.5：B-7 新增禁止 `MediaRecorder`）→ FE-47（v0.7：B-10～B-16 PWA、B-7 白名單、`--site`／`--no-site`／`--ads`）
│  └─ serve.mjs                        pg-frontend  FE-47（v0.7 新增）V-PWA (b) 本機靜態伺服器（Node 內建 `http`，§10.4）
├─ dist/
│  ├─ english-master-track.html        pg-frontend  FE-18 → FE-33 → FE-41 → FE-44 → FE-53（建置產物，`file://` 用，**保留**；其他任務建置一律輸出到 scratchpad）
│  ├─ ads.txt                          人類（舊位置；MC-01 複製到 `sources/deploy/` 後保留，MC-03 改 workflow 時由主控刪除）
│  └─ site/                            pg-frontend  FE-53（v0.7 新增，部署目錄，建置產物；恰 8 檔，契約 DP-1）
│     ├─ index.html                    = dist/english-master-track.html（逐位元組相同，DP-2）
│     ├─ manifest.webmanifest          建置產生（MF-1～MF-3）
│     ├─ sw.js                         建置由 src/app/pwa/sw.template.js 注入產生（SW-3）
│     ├─ ads.txt                       建置自 sources/deploy/ads.txt 原樣複製（DP-6）
│     └─ icons/                        建置自 src/app/assets/icons/ 原樣複製（4 張 PNG，DP-5）
├─ tests/                              qa           （E2E 與驗收腳本；QA 可在 package.json 加 devDependencies）
├─ sources/                            人類／主控    唯讀輸入，不打包（契約 §3.2）
│  ├─ pwa/PWA_Icon.jpg                 人類（Q-45 原圖）；`sources/pwa/README.md` 主控記錄 PNG 產生方式（MC-02）
│  └─ deploy/ads.txt                   主控（MC-01，v0.7 新增；ads.txt 的唯一來源，DS-12）
└─ src/
   ├─ data/                            pg-content
   │  ├─ sources.js                    CT-02 建立、CT-23 回填計數與 dataVersion
   │  ├─ vocab-0001.js … vocab-5260.js CT-02 產骨架；CT-03～CT-17 各填一檔（見 §8.1）
   │  ├─ templates.js                  CT-18
   │  ├─ part5.js                      CT-19（前 100 題）→ CT-20（後 100 題、交錯排序、重編 id）
   │  ├─ decoder.js                    CT-21（DECODER_SENTENCES、READING_STRATEGIES）
   │  ├─ phrasebank.js                 CT-22
   │  ├─ _tools/                       （底線開頭：不打包）
   │  │  ├─ lib.mjs                    CT-01  讀檔（V-IN）、CSV（M-1）、wordKey、排名（R-1～R-8）、ECDICT、分檔表
   │  │  ├─ validate.mjs               CT-01  契約 V-* 全規則 + SD 自查規則 H-1～H-7
   │  │  ├─ material.mjs               CT-01  匯出某分檔的撰寫素材到 scratchpad
   │  │  ├─ fill.mjs                   CT-01  把撰寫結果依 rank 合併回分檔（保留骨架欄位）
   │  │  ├─ sample.mjs                 CT-01  固定種子抽樣（自查與 QA 共用）
   │  │  └─ build-skeleton.mjs         CT-02  產生 15 個骨架分檔與 sources.js
   │  └─ _records/                     （不打包）交付紀錄，QA 驗 V-VOC-17、M-7 的依據
   │     ├─ CT-01.md、CT-02.md         CT-01、CT-02
   │     ├─ vocab-XXXX.md（15 份）      CT-03～CT-17 各一份
   │     ├─ templates.md               CT-18
   │     ├─ part5.md                   CT-19 → CT-20
   │     ├─ decoder.md                 CT-21
   │     ├─ phrasebank.md              CT-22
   │     └─ CT-23-summary.md           CT-23
   └─ app/                             pg-frontend（v0.4 修改者以「→」接在原任務之後，依序執行）
      ├─ index.html                    FE-01 建最小模板 → FE-02 完成殼 → FE-23 更名 → FE-26 底部導覽圖示 → FE-32 首次模式（body[data-entry]、返回鈕）→ FE-38（v0.5：導覽移除解碼器、句型庫 2 鈕；兩個 section 保留但去掉 aria-label）→ FE-50（v0.7：HD-1 靜態元素、`emt-build-id` 佔位、`#pwa-update` 掛載點）
      ├─ license-header.txt            FE-01  授權標頭模板（{{YEAR}}）（v0.4 不改：授權文字中的「Part 5」屬授權聲明，R-15 保留）→ FE-47（v0.7：加品牌標識聲明，AC-23-06）
      ├─ main.js                       FE-02 → FE-26（呼叫 bottomNav.init）→ FE-32（依 entryMode 啟動）→ FE-50（v0.7：pwa.start、pwaNotice.init）
      ├─ pwa/                          （v0.7 新增；不打包進 HTML：建置的 listAppFiles 只收 core／state／services／ui／views 與 main.js）
      │  └─ sw.template.js             FE-46  service worker 範本（含 `@@BUILD_ID@@`、`/* @@PRECACHE_URLS@@ */` 佔位，§7.18.3）
      ├─ assets/                       （v0.7 新增；不打包進 HTML，建置只原樣複製）
      │  └─ icons/                     主控（MC-02，Q-45 授權；PG 不得修改）
      │     ├─ icon-192.png            192×192 RGB，any
      │     ├─ icon-512.png            512×512 RGB，any
      │     ├─ icon-maskable-512.png   512×512 RGB，maskable（圖案縮至 78%，文字在 80% 安全圓內）
      │     └─ apple-touch-icon-180.png 180×180 RGB
      ├─ core/
      │  ├─ dom.js                     FE-02  安全 DOM 建構（只用 textContent）
      │  ├─ constants.js               FE-03 → FE-20（TAB_LABELS、NAV_TAB_ORDER、LEARNED_HISTORY_DAYS、DASHBOARD_CHART_DAYS）→ FE-22（schemaVersion 2、[1, 2]）→ FE-34（v0.5：NAV_TAB_ORDER 4 項、HIDDEN_TAB_IDS、LEARNING_PROGRESS_FIELDS）→ FE-42（v0.6：SCORE_DEFAULT 725）
      │  ├─ wordkey.js                 FE-03  C-2
      │  ├─ goal.js                    FE-03  分數、色級、試算 → FE-42（v0.6：scoreForCard、點卡片 = scoreMax）
      │  ├─ content.js                 FE-04  讀全域資料（C-6 容錯）
      │  ├─ vocab.js                   FE-04  字庫排序、N_B/N_G、單字集
      │  ├─ custom.js                  FE-04  自訂字驗證、去重、範本注入、刪除後索引
      │  ├─ similarity.js              FE-05  字串清洗、編輯距離、吻合度、燈號
      │  ├─ streak.js                  FE-05  本地日期、打卡、顯示天數
      │  ├─ quiz.js                    FE-05  四選一出題
      │  ├─ stats.js                   FE-05  正確率
      │  ├─ persist.js                 FE-06 → FE-22  預設值、StorageRecord 驗證、V-ST、遷移鏈（v0.4：MG-1～MG-4、RD-1）
      │  ├─ backup.js                  FE-06 → FE-22  匯出物件、匯入步驟 1～7（v0.4：版本 1／2、IM-8）
      │  ├─ learning.js                FE-20（v0.4 新增）今日已學紀錄、歷史正規化、主控台進度數值（§7.7）
      │  ├─ interaction.js             FE-21（v0.4 新增）Q-33 設計常數、滑動判斷、震動樣式（§7.10、§7.12）
      │  ├─ meter.js                   FE-35（v0.5 新增）收音條門檻 T1～T5、RMS、dBFS、亮格數、分析視窗大小（§7.14）
      │  ├─ reinit.js                  FE-34（v0.5 新增）生效色級是否改變、「有學習紀錄」(a)～(f)、初始化新資料（§7.15）
      │  ├─ pwa.js                     FE-45（v0.7 新增）PWA 契約常數（PWA_*）、PE-1 判定、IN-2、IN-1／UP-6 顯示條件、UP-3 重查判斷、初始 PwaRuntimeState（§4.7、§7.18）→ FE-56（v0.8：theme／background 色值）→ FE-58（v0.8：IN-1 加 `dashboard.backupExpanded`）
      │  └─ layout.js                  FE-54（v0.8 新增）契約 §13 常數、UI_LAYOUT 版面常數、fill／formatInt／goalLine／summaryLine／chartIsEmpty／part5Progress（§4.8、§7.19）
      ├─ state/
      │  └─ store.js                   FE-07 → FE-25（v2、學習事件）→ FE-30（entryMode、首次流程）→ FE-37（v0.5：切換難易度初始化、隱藏頁守門）→ FE-42（v0.6：clickColor 改用 scoreForCard）→ FE-49（v0.7：RuntimeState.pwa、actions.setPwa）
      ├─ services/
      │  ├─ download.js                FE-08
      │  ├─ tts.js                     FE-12
      │  ├─ stt.js                     FE-12（v0.5 不改）
      │  ├─ clipboard.js               FE-16
      │  ├─ haptics.js                 FE-29（v0.4 新增）navigator.vibrate 包裝
      │  ├─ mic.js                     FE-36（v0.5 新增）取得／重用／釋放麥克風音軌、AnalyserNode 音量讀取（§7.14）
      │  └─ pwa.js                     FE-48（v0.7 新增）PE-1 套用、HD-2 連結、SW 註冊與更新流程（UP）、安裝事件（IN）（§4.7、§7.18）
      ├─ ui/
      │  ├─ router.js                  FE-02 → FE-24（換頁動畫）→ FE-32（首次模式限制、entry 切換）→ FE-38（v0.5：隱藏頁守門、hashchange 守門）
      │  ├─ toast.js                   FE-02
      │  ├─ dialog.js                  FE-02
      │  ├─ banner.js                  FE-07 → FE-25（學習紀錄容量不足提示一次）
      │  ├─ motion.js                  FE-24（v0.4 新增）減少動態判斷、動畫 class 加上與移除
      │  ├─ bottom-nav.js              FE-26（v0.4 新增）輸入中隱藏底部導覽列
      │  ├─ import-flow.js             FE-32（v0.4 新增）選檔 → 確認 → 匯入 → 提示的共用流程
      │  └─ pwa-notice.js              FE-50（v0.7 新增）新版提示列「有新版本，重新整理」（UP-6）
      ├─ views/
      │  ├─ dashboard.js               FE-08 → FE-23（更名）→ FE-31（今日學習進度）→ FE-38（v0.5：模組入口 3 項 + 資料來源）→ FE-43（v0.6：移除目標分數）→ FE-51（v0.7：NT-1 說明、「安裝 App」按鈕）
      │  ├─ customizer.js              FE-09 → FE-23（更名）→ FE-27（大卡片）→ FE-32（首次畫面）→ FE-40（v0.5：初始化確認視窗）→ FE-43（v0.6：隱藏分數區、卡片無分數範圍）
      │  ├─ custom-vocab.js            FE-10
      │  ├─ flashcards.js              FE-11 → FE-23（更名）→ FE-28（手勢、翻轉動畫）→ FE-39（v0.5：hide 時釋放麥克風）
      │  ├─ speech-panel.js            FE-12（v0.4 不改；STT 學習事件由 store 的 recordSttScored 記錄）→ FE-39（v0.5：麥克風取得流程、收音條、錯誤對照、說明文字）
      │  ├─ flashcard-quiz.js          FE-13 → FE-29（答題回饋、只認點擊）
      │  ├─ part5.js                   FE-14 → FE-23（更名）→ FE-29（答題回饋）
      │  ├─ decoder.js                 FE-15（v0.5 不改、不刪；入口隱藏，HT-5）
      │  ├─ phrasebank.js              FE-16（v0.5 不改、不刪；入口隱藏，HT-5）
      │  └─ sources-page.js            FE-17 → FE-52（v0.7：品牌標識聲明，AC-23-02）
      ├─ styles/
      │  ├─ 00-base.css                FE-02 → FE-26（底部導覽）→ FE-32（首次模式隱藏規則）→ FE-38（v0.5：底部導覽 4 欄）
      │  ├─ 05-motion.css              FE-24（v0.4 新增）動畫時間 CSS 變數、換頁動畫、減少動態總開關
      │  ├─ 10-dashboard.css           FE-08 → FE-31 → FE-43（v0.6：目標區少一項的版面，如需要）→ FE-51（v0.7：NT-1 說明、安裝按鈕）
      │  ├─ 20-customizer.css          FE-09 → FE-27 → FE-32 → FE-43（v0.6：移除分數範圍樣式、卡片版面）
      │  ├─ 21-custom-vocab.css        FE-10
      │  ├─ 30-flashcards.css          FE-11 → FE-28
      │  ├─ 31-speech.css              FE-12 → FE-39（v0.5：5 格收音條，無 transition）
      │  ├─ 32-quiz.css                FE-13 → FE-29
      │  ├─ 40-part5.css               FE-14 → FE-29
      │  ├─ 50-decoder.css             FE-15（v0.5 不改、照常打包）
      │  ├─ 60-phrasebank.css          FE-16（v0.5 不改、照常打包）
      │  ├─ 70-sources.css             FE-17
      │  ├─ 80-pwa.css                 FE-50（v0.7 新增）新版提示列（sticky、無動畫）
      │  └─ 90-overrides.css           FE-18 → FE-33 → FE-41 → FE-44 → FE-53  跨頁 RWD 修正（只在整合時發現問題才寫）
      └─ __tests__/                    （不打包）
         ├─ goal.test.js               FE-03 → FE-20 → FE-22 → FE-34（v0.5 常數）→ FE-42（v0.6：725、scoreForCard）
         ├─ vocab.test.js、custom.test.js            FE-04
         ├─ similarity.test.js、streak.test.js、quiz.test.js、stats.test.js   FE-05
         ├─ persist.test.js            FE-06 → FE-22 → FE-42（v0.6：預設 725、既有分數不轉換）
         ├─ backup.test.js             FE-06 → FE-22 → FE-41
         ├─ store.test.js              FE-07 → FE-25 → FE-30 → FE-37 → FE-42（v0.6：點卡片 = scoreMax、預設 725、GS-1～GS-8）
         ├─ build.test.js              FE-01 → FE-41（v0.5：MediaRecorder 中止案例）
         ├─ _fixtures.js               FE-19 → FE-30 → FE-37 → FE-42（如需新增既有分數 fixture）  共用小型 fixture（底線開頭，不符合 *.test.js，不會被 npm test 當成測試檔）
         ├─ load-order.test.js         FE-19 → FE-33 → FE-41 → FE-44  依建置順序載入全部 src/app 檔的回歸測試（§4.1 LD-1～LD-3）
         ├─ dashboard.test.js          FE-19 → FE-22（支援版本字串）→ FE-31 → FE-38 → FE-43（v0.6：無目標分數）
         ├─ customizer.test.js         FE-19 → FE-27 → FE-32 → FE-40 → FE-43（v0.6：分數區隱藏、點卡片、AC-26-05／06）
         ├─ custom-vocab.test.js       FE-19  （FE-10）
         ├─ flashcards.test.js         FE-19 → FE-28 → FE-39
         ├─ speech.test.js             FE-19  （FE-12：tts、stt、speech-panel）→ FE-39
         ├─ flashcard-quiz.test.js     FE-19 → FE-29
         ├─ part5.test.js              FE-19 → FE-29
         ├─ decoder.test.js            FE-19  （FE-15）
         ├─ phrasebank.test.js         FE-19  （FE-16：phrasebank、clipboard）
         ├─ sources-page.test.js       FE-19  （FE-17）
         ├─ learning.test.js           FE-20（v0.4 新增）
         ├─ interaction.test.js        FE-21（v0.4 新增）
         ├─ naming.test.js             FE-23（v0.4 新增）R-15 畫面文字靜態檢查 → FE-38（導覽 4 鈕、隱藏頁文字）→ FE-43（v0.6：難易度設定說明文字）
         ├─ router-motion.test.js      FE-24 → FE-32（v0.4 新增）換頁、減少動態、CSS 常數一致、首次模式限制 → FE-38（隱藏頁守門）
         ├─ shell.test.js              FE-26（v0.4 新增）導覽順序、文字、內嵌圖示、底部導覽 CSS → FE-38（4 鈕、4 欄）
         ├─ haptics.test.js            FE-29（v0.4 新增）
         ├─ first-run.test.js          FE-32（v0.4 新增）首次畫面、import-flow 訊息 → FE-43（v0.6：首次預設 725、還原後選中卡片）
         ├─ reinit.test.js             FE-34（v0.5 新增）
         ├─ meter.test.js              FE-35（v0.5 新增）
         ├─ mic.test.js                FE-36（v0.5 新增）
         ├─ pwa-core.test.js           FE-45（v0.7 新增）常數與契約一致、V-PWA-08 判定表、IN-1／UP-6／UP-3
         ├─ sw.test.js                 FE-46（v0.7 新增）以 vm 執行注入後的範本：install／activate／fetch／message（V-PWA-05、SW-4～SW-10）
         ├─ pwa-service.test.js        FE-48（v0.7 新增）替身 navigator／registration／安裝事件：PE-2、HD-2、SW-1、UP-2～UP-5、IN-3～IN-6、V-PWA-09／10、原始碼掃描
         └─ pwa-notice.test.js         FE-50（v0.7 新增）新版提示列顯示條件、按鈕只觸發一次
```

（v0.8）檔案異動（新增檔標「新」；其餘接在目錄樹既有「→」之後）：

| 檔案 | v0.8 任務 | 內容 |
| :--- | :--- | :--- |
| `src/data/sources.js`、`src/data/_tools/lib.mjs`、`src/data/_records/CT-24.md`（新） | CT-24（pg-content） | ORIGINAL `fullName` = 「EnglishContext 原創內容」（DS-19） |
| `core/layout.js`（新）、`__tests__/layout.test.js`（新） | FE-54 | §4.8 |
| `state/store.js`、`__tests__/store.test.js` | FE-55 | `runtime.dashboard`、`setBackupExpanded` |
| `index.html`、`license-header.txt`、`styles/00-base.css`、`core/pwa.js`、`tools/build.mjs`、`__tests__/build.test.js`、`__tests__/shell.test.js`、`__tests__/pwa-core.test.js`、`__tests__/tokens.test.js`（新） | FE-56 | token、共用樣式、標題列圖示與名稱、PWA 色值、B-12 標題 |
| `views/customizer.js`、`styles/20-customizer.css`、`styles/21-custom-vocab.css`、`__tests__/customizer.test.js`、`__tests__/first-run.test.js` | FE-57 | 精簡色級列、首次畫面固定底部列 |
| `views/dashboard.js`、`styles/10-dashboard.css`、`core/pwa.js`、`__tests__/dashboard.test.js`、`__tests__/pwa-core.test.js`、`__tests__/naming.test.js` | FE-58（在 FE-56 之後） | 主控台改版、IN-1 |
| `styles/30-flashcards.css`、`styles/31-speech.css`、`styles/32-quiz.css`、`styles/80-pwa.css` | FE-59 | 只換配色、單字卡頁幾何固定 |
| `views/sources-page.js`、`styles/70-sources.css`、`__tests__/sources-page.test.js`、`__tests__/_fixtures.js` | FE-60 | 原創內容來源名稱（NM-3） |
| `views/part5.js`、`styles/40-part5.css`、`__tests__/part5.test.js` | FE-61 | 進度條、720px |
| `dist/english-master-track.html`、`dist/site/` 8 檔、`__tests__/load-order.test.js`、`styles/90-overrides.css` | FE-62 | 整合建置與自檢 |

（v0.9）檔案異動（新增檔標「新」；paths 省略前綴 `src/app/`，`tools/`、`dist/` 除外）：

| 檔案 | v0.9 任務 | 內容 |
| :--- | :--- | :--- |
| `core/version.js`（新）、`__tests__/version.test.js`（新）、`index.html`、`tools/build.mjs`、`__tests__/build.test.js`、`__tests__/shell.test.js` | FE-63 | §14 常數與純函式；HD-1 加 `emt-app-version` meta；建置 B-17～B-19（§5.4） |
| `ui/version-line.js`（新）、`main.js`、`styles/00-base.css`、`__tests__/version-line.test.js`（新） | FE-64（在 FE-63 之後） | 頁尾版本行（§7.20.1） |
| `core/layout.js`、`__tests__/layout.test.js` | FE-65 | `LAYOUT_TEXTS.levelStatus`；新增 `goalLineText`、`levelStatusText`（§4.9） |
| `views/dashboard.js`、`styles/10-dashboard.css`、`__tests__/dashboard.test.js` | FE-66（在 FE-65 之後） | 目標行與「變更」外框按鈕（§7.20.4） |
| `views/customizer.js`、`styles/20-customizer.css`、`__tests__/customizer.test.js` | FE-67（在 FE-65 之後） | 狀態列一行（§7.20.3） |
| `views/custom-vocab.js`、`views/flashcards.js`、`__tests__/custom-vocab.test.js`、`__tests__/flashcards.test.js`、`__tests__/naming.test.js` | FE-68 | 範本區 `hidden` + `inert`、移除「範本」字樣（§7.20.2） |
| `dist/english-master-track.html`、`dist/site/` 8 檔、`__tests__/load-order.test.js`、`styles/90-overrides.css` | FE-69 | 整合建置與自檢 |

（v0.9）不改：`src/data/` 全部（含 `templates.js`，HT-8；DS-31）、`core/custom.js`（注入程式保留）、`core/persist.js`、`core/backup.js`（`origin = "template"` 照常讀寫，HT-9）、`state/store.js`（`injectTemplate` 保留）、`core/pwa.js`、`pwa/sw.template.js`、`styles/21-custom-vocab.css`（全域 `[hidden] { display: none !important }` 已確保隱藏，HT-6 不需改樣式）、`package.json`（主控已依 Q-62 改為 1.0.0；建置**唯讀**）、`.github/workflows/static.yml`（CI 照常 `npm run build`，`package.json` 已在 git 中）。

| 代號 | 規則 |
| :--- | :--- |
| D-14 | （v0.9）同 D-6～D-13：v0.9 對既有檔案的修改由 FE-63～FE-69 承接；**同一批次的任務沒有任何共用 path**；需要兩個任務修改的檔案一律以 `dependsOn` 串到不同批次（本版沒有任何檔案被兩個 v0.9 任務修改）。`src/data/` 不改、不建 CT 任務（DS-31）。建置**只讀** `package.json`，任何 PG 任務不得修改它（版本號由人類發布時維護，Q-58、Q-62） |

（v0.10）檔案異動（新增檔標「新」；paths 省略前綴 `src/app/`，`src/data/`、`tools/`、`dist/`、`package.json` 除外）：

| 檔案 | v0.10 任務 | 內容 |
| :--- | :--- | :--- |
| `__tests__/_samples/v014-state.json`（新）、`v014-backup.json`（新）、`v07-state.json`（新）、`v07-backup.json`（新）、`README.md`（新）、`__tests__/samples.test.js`（新） | FE-70 | 凍結 v0.14／v0.7 實際寫出的資料原文，作為 v2 → v3 遷移測試夾具（§7.21.1） |
| `core/position.js`（新）、`__tests__/position.test.js`（新） | FE-71 | FP-2 解析與位置正規化（§4.10） |
| `core/part5flow.js`（新）、`__tests__/part5flow.test.js`（新）、`core/layout.js`、`__tests__/layout.test.js` | FE-72 | 模擬測驗狀態轉移與 UO-3；`part5Progress` 支援 `"allCorrect"`（MT-1） |
| `src/data/_tools/validate.mjs`、`src/data/_records/part5-ids.json`（新）、`src/data/_records/CT-25.md`（新） | CT-25（pg-content） | V-P5-08 題目 id 穩定性檢查（§7.21.6） |
| `package.json` | MC-04（主控） | `version` 改為 `1.1.0`（Q-70 A） |
| `core/constants.js`、`core/persist.js`、`core/backup.js`、`core/reinit.js`、`__tests__/migrate-v3.test.js`（新）、`__tests__/persist.test.js`、`__tests__/backup.test.js`、`__tests__/reinit.test.js`、`__tests__/goal.test.js`、`__tests__/_fixtures.js`、`__tests__/store.test.js`、`__tests__/first-run.test.js`、`__tests__/dashboard.test.js`、`__tests__/custom-vocab.test.js` | FE-73（在 FE-70～FE-72 之後） | schemaVersion 3、MG-5～MG-8、RD-3、IM-9、IM-10、CI-4、`PART5_RECORD_TEXTS`；既有測試的 `schemaVersion` 2 字面值改寫（DS-32） |
| `state/store.js`、`__tests__/store.test.js`、`__tests__/store-track.test.js`（新） | FE-74（在 FE-73 之後） | FP-2～FP-6、CR-2、UO-1～UO-8 掛點、3 個新 action、`commitWrite`（§4.10、§7.21.2～§7.21.5） |
| `views/part5.js`、`styles/40-part5.css`、`__tests__/part5.test.js` | FE-75（在 FE-74 之後） | 計數行、標示、開關、全部答對畫面、確認對話框（§7.21.4） |
| `dist/english-master-track.html`、`dist/site/` 8 檔、`__tests__/load-order.test.js`、`styles/90-overrides.css` | FE-76（在全部 v0.10 任務與 MC-04 之後） | 整合建置與自檢 |

（v0.10）不改：`views/flashcards.js`（只讀 `runtime.flashcard.index`，還原由 store 完成；FP-8 不提示）、`views/flashcard-quiz.js`、`views/dashboard.js`（CR-4 (c) 主控台不顯示 K）、`views/customizer.js`、`views/custom-vocab.js`、`ui/banner.js`（已處理 `"learningQuota"` tag；`"storage"` + quota 的分支在 v0.10 後不再被觸發但保留，§7.21.5）、`ui/dialog.js`（`confirm` 已支援 Esc 與點遮罩 = 取消）、`core/custom.js`（`indexAfterDelete` 保留於模組與其測試，但 store 不再呼叫，§7.21.2）、`core/learning.js`、`core/layout.js` 以外的版面模組、`tools/build.mjs`、`pwa/sw.template.js`、`index.html`、`src/data/` 的全部資料檔（DS-39；CT-25 只改 `_tools/` 與 `_records/`）、`.github/workflows/static.yml`。

| 代號 | 規則 |
| :--- | :--- |
| D-15 | （v0.10）同 D-6～D-14：v0.10 對既有檔案的修改由 FE-70～FE-76、CT-25 承接；**同一批次的任務沒有任何共用 path**。被兩個 v0.10 任務修改的檔案只有 `__tests__/store.test.js`（FE-73 只改 `schemaVersion` 等字面值與因 v3 而必須調整的斷言 → FE-74 改行為斷言），以 `dependsOn` 串到不同批次。`package.json` 只由主控 MC-04 修改一次（Q-70 A），任何 PG 任務仍不得修改。`__tests__/_samples/` 由 FE-70 建立後**唯讀**：後續任務不得重新產生或改寫（它代表 v0.14 已交付程式的輸出，改寫即失去比對意義） |
| D-16 | （v0.11）v0.11 只有 1 個任務 FE-77，修改 `core/pwa.js`、`views/sources-page.js`、`styles/70-sources.css`、`__tests__/pwa-core.test.js`、`__tests__/pwa-notice.test.js`、`__tests__/sources-page.test.js`，新增 `__tests__/contact-static.test.js`，並重新產生 `dist/` 9 檔；與已 `done` 任務的檔案重疊不影響平行（無其他待執行任務）。**不改**：`ui/pwa-notice.js`、`services/pwa.js`、`pwa/sw.template.js`（註解中的舊按鈕名稱不影響行為，不進入本任務範圍，SD-FB-66）、`core/constants.js`、`tools/build.mjs`、`index.html`、`src/data/`、`package.json` |

（v0.8 記載）不改：`core/constants.js`（`STORAGE_KEYS` 等屬 `FROZEN_IDENTIFIERS`）、`core/backup.js`、`core/persist.js`、`main.js`、`ui/router.js`（「開始今日學習」「變更」沿用既有 `[data-go]` 委派）、`views/flashcards.js`、`views/speech-panel.js`、`views/flashcard-quiz.js`、`styles/05-motion.css`、`pwa/sw.template.js`、`src/app/assets/icons/`、`styles/50-decoder.css`、`styles/60-phrasebank.css`（隱藏頁）。

（v0.7）既有測試檔的修改：`build.test.js` FE-01 → FE-41 → **FE-47**（PWA 建置、可重現、白名單）；`store.test.js` … → FE-42 → **FE-49**（`setPwa`、初始 `pwa`）；`shell.test.js` FE-26 → FE-38 → **FE-50**（HD-1、`#pwa-update`）；`dashboard.test.js` … → FE-43 → **FE-51**（NT-1、安裝按鈕）；`sources-page.test.js` FE-19 → **FE-52**；`load-order.test.js` … → FE-44 → **FE-53**。

規則：

| 代號 | 規則 |
| :--- | :--- |
| D-1 | 檔名或目錄以 `_` 開頭（`src/data/_tools/`、`src/data/_records/`）與 `src/app/__tests__/` **一律不打包** |
| D-2 | 每個檔案只屬於一個任務；後續任務需改同一檔時以 `dependsOn` 串接（`index.html`：FE-01 → FE-02；`sources.js`：CT-02 → CT-23；`part5.js`、`_records/part5.md`：CT-19 → CT-20；`tools/build.mjs`：FE-01 → FE-18；各 `vocab-XXXX.js`：CT-02 → 對應批次任務） |
| D-3 | 建置產物：除 FE-18 外，任務驗證建置時一律 `--out` 到 scratchpad，不寫 `dist/` |
| D-4 | 驗證用暫存檔（素材、撰寫中的分段 JSON、fixture）放 scratchpad；需要留存給 QA 的只有 `_records/` |
| D-5 | `package.json` **不得**設 `"type": "module"`（core 檔需以 CommonJS 被測試 `require`）；建置與工具一律用 `.mjs` |
| D-6 | （v0.4）既有 `done` 任務的 tasks.json 內容不改；v0.4 對既有檔案的修改一律由新任務（FE-20～FE-33）承接，該檔加入新任務的 `paths`，並以 `dependsOn` 串成上方目錄樹「→」所示的順序。同一檔案的兩個新任務不會同批執行（§12.3） |
| D-8 | （v0.5）同 D-6：v0.5 對既有檔案的修改由 FE-34～FE-41 承接；**FE-34～FE-41 彼此之間沒有任何共用 path**（每個檔案在 v0.5 只屬於一個新任務），與既有 `done` 任務的串接見上方目錄樹「→」 |
| D-9 | （v0.5）`src/data/` 本版**不改**、不建 CT 任務（契約 DS-06）：`decoder.js`、`phrasebank.js` 格式與內容不變、照常打包（HT-5、AC-20-04、AC-23-04）；收音條與初始化不涉及內容資料 |
| D-10 | （v0.6）同 D-6、D-8：v0.6 對既有檔案的修改由 FE-42～FE-44 承接；**FE-42～FE-44 彼此之間沒有任何共用 path**，並以 `dependsOn` 串成 FE-42 → FE-43 → FE-44（每批 1 個任務）。`src/data/` 不改、不建 CT 任務（契約 DS-10）；`core/persist.js` 已引用 `C.SCORE_DEFAULT`，**不需修改**（只改其測試）|
| D-11 | （v0.7）同 D-6、D-8、D-10：v0.7 對既有檔案的修改由 FE-45～FE-53 承接；**FE-45～FE-53 彼此之間沒有任何共用 path**。`src/data/` 不改、不建 CT 任務（契約 DS-18）。`src/app/assets/icons/*.png`、`sources/deploy/ads.txt`、`sources/pwa/README.md`、`.github/workflows/static.yml` 由**主控**放置或修改（tasks.json `manualSteps` MC-01～MC-03），**不屬任何 PG 任務**；PG 只讀取，不得修改（QA 越界檢查請視為授權例外，SD-FB-33） |
| D-12 | （v0.7）`src/app/pwa/`、`src/app/assets/` 不打包進 HTML（建置只收 §4.1 的 5 層目錄與 `main.js`）；`src/app/pwa/sw.template.js` 不得被任何 `src/app` 模組 `require` 或讀取 |
| D-13 | （v0.8）同 D-6、D-8、D-10、D-11：v0.8 對既有檔案的修改由 CT-24、FE-54～FE-62 承接；**同一批次的任務沒有任何共用 path**。唯一被兩個 v0.8 任務修改的檔案是 `core/pwa.js` 與 `__tests__/pwa-core.test.js`（FE-56 改色值 → FE-58 改 IN-1），以 `dependsOn` 串接、分屬第 1、2 批。`src/data/` 只改 ORIGINAL `fullName` 一個值（CT-24，契約 DS-19、DS-25）；`_fixtures.js` 的同名字串屬 FE-60 |
| D-7 | （v0.4）`src/data/` 本版**不改**：R-15 更名不涉及內容資料（題型標籤 `PART5_TYPE_LABELS` 與授權文字中的「Part 5」屬題型與授權用語，保留），R-16、R-17 只涉及介面與持久化。因此不建 CT 任務 |

---

## 4. 模組介面約定（平行開發的契約）

### 4.1 模組寫法（`src/app/` 全部 `.js`）

| 項目 | 約定 |
| :--- | :--- |
| 命名空間 | 全部掛在 `window.EMT`：`EMT.core.<name>`、`EMT.store`、`EMT.services.<name>`、`EMT.ui.<name>`、`EMT.views`（登錄表）、`EMT.components.<name>`、`EMT.content` |
| core 檔 | UMD 寫法：`(function (root, factory) { var api = factory(); if (typeof module === "object" && module.exports) { module.exports = api; } else { root.EMT = root.EMT || {}; root.EMT.core = root.EMT.core || {}; root.EMT.core.<name> = api; } })(typeof self !== "undefined" ? self : this, function () { … });`。core 之間的依賴：Node 下 `require("./constants.js")`，瀏覽器下讀 `EMT.core.constants`（在 factory 內以 `typeof require === "function" && typeof module === "object"` 判斷） |
| 其他層 | IIFE，只做登錄，不在載入時執行 DOM 操作；實際動作在 `main.js` 啟動後 |
| 串接順序 | 建置依層序 `core → state → services → ui → views → main.js`；同層依檔名字母序。core 內 `constants.js`、`wordkey.js` 最先（建置特例）。**（v0.3）建置不另外定義其他模組間的依賴順序**；正確性改由下表 LD-1～LD-3 保證 |
| DOM 寫入 | 一律經 `EMT.core.dom.el(tag, props, children)`：`props.text` → `textContent`；屬性只用 `setAttribute`（禁止 `on*` 屬性字串）；**全專案禁止** `innerHTML`、`outerHTML`、`insertAdjacentHTML`、`document.write`（C-7、AC-04-09；FE-18 以 grep 驗證） |
| 文案 | PRD AC 中以「」標出的畫面文字必須**逐字**使用（QA 以文字比對） |

**模組取用時機（v0.3，回應 R6-1）**

背景：建置依檔名排序載入 core，`backup.js` 早於 `persist.js`；`backup.js` 曾在 factory 執行時（載入時）讀取 `EMT.core.persist`，瀏覽器中得到 `undefined` 而出錯（Node 下以 `require` 取用，單元測試測不到）。決議：**不改建置順序**（同層再加依賴排序會讓建置腳本需要解析依賴圖，且新增模組時容易漏設），改以下列規則約束程式寫法。

| 代號 | 規則 |
| :--- | :--- |
| LD-1 | core 模組在載入時（factory 本體、頂層 `var`）**只能**取用 `EMT.core.constants`、`EMT.core.wordkey`（建置保證最先載入）；取用其他 core 模組一律寫在**被呼叫的函式內**（例如 `function dep(name) { … }` 於每次呼叫時取得）。Node 下的 `require` 不受順序影響，但為使兩種環境行為一致，同樣放在函式內 |
| LD-2 | state、services、ui、views 與 `main.js` 在載入時只做登錄（掛上 `EMT.*`），**不得**在載入時讀取其他模組的成員、不得讀取資料全域變數、不得操作 DOM；一律等 `main.js` 於 `DOMContentLoaded` 後啟動 |
| LD-3 | 取用的模組不存在時，視為程式組裝錯誤：丟出含模組名稱的 `Error`（不得被當成使用者輸入錯誤吞掉；例如匯入流程不得把它判為「檔案格式錯誤」） |

回歸測試位置：

| 範圍 | 位置 | 內容 |
| :--- | :--- | :--- |
| R6-1 原案例 | `src/app/__tests__/backup.test.js`「回歸 R6-1：依建置順序於瀏覽器環境載入，匯出與匯入正常」 | 以 `tools/build.mjs` 的 `listAppFiles` 取得實際順序，在 `node:vm` 沙箱（無 `module`、`require`）依序載入全部 core，斷言 `backup.js` 早於 `persist.js` 且匯出、匯入可正常執行 |
| 全部模組 | `src/app/__tests__/load-order.test.js`（FE-19） | 依 `listAppFiles` 的順序把 `src/app` 全部檔案（不含 `main.js`）載入只有 `self`／`window`／`console` 的 `vm` 沙箱：載入不拋例外（LD-1、LD-2）；載入後 `EMT.core.*` 每個 core 模組皆存在 |

### 4.2 頁面登錄（FE-02 提供）

| API | 說明 |
| :--- | :--- |
| `EMT.views.register(tabId, module)` | `module = { mount(rootEl), show(), hide() }`；同一 `tabId` 可登錄多個模組（自訂器頁 = `customizer` + `custom-vocab`）。`mount` 只在第一次顯示前呼叫一次 |
| `EMT.router.go(tabId)` | 切換頁籤：隱藏舊 section、顯示新 section、呼叫該頁所有模組 `show()`；同步 `store.actions.setTab` |
| `index.html` 掛載點 | `#app-banner`、`#app-nav`、`#view-dashboard`、`#view-customizer`（內含 `#customizer-goal`、`#customizer-custom`）、`#view-flashcards`、`#view-part5`、`#view-decoder`、`#view-phrasebank`、`#view-sources`、`#app-footer`（含「資料來源與授權」連結）、`#toast-root`、`#dialog-root` |
| `EMT.ui.toast.show(text, { kind: "info"｜"success"｜"error", ms })` | 純文字 toast |
| `EMT.ui.dialog.confirm({ title, message, okText, cancelText }) → Promise<boolean>` | 自製模態對話框（不用 `window.confirm`），文字一律 `textContent` |
| `main.js` 啟動順序 | `DOMContentLoaded` 後依序呼叫（存在才呼叫）：`EMT.content.load()` → `EMT.store.init()` → `EMT.ui.banner.render()` → `EMT.router.start("dashboard")`；最後 `performance.mark("emt-ready")` 並設 `document.documentElement.dataset.ready = "1"`（供 AC-22-05 量測） |
| （v0.4）`main.js` 啟動順序 | `content.load()` → `store.init()` → `banner.render()` → 設 `document.body.dataset.entry = state.runtime.entryMode`（`"firstRun"`／`"main"`；store 不存在時視為 `"main"`）→ `router.start(entryMode === "firstRun" ? "customizer" : "dashboard")` → `EMT.ui.bottomNav.init()` → `performance.mark("emt-ready")`、`data-ready = "1"`。AC-22-05 的量測終點：一般模式為主控台入口可點擊、首次模式為「開始學習」可點擊，兩者都在 `router.start` 同步 `mount` 完成後，故 `emt-ready` 位置不變即可作為兩種模式的量測點 |
| （v0.4）`index.html` 掛載點與屬性 | `<body data-entry="boot">`：啟動前隱藏導覽列、選單鈕與所有 view，避免首次模式閃現導覽（§7.9）；`body[data-entry]` 由 `main.js`／router 設定，`body[data-tab]` 由 router 設定為目前頁面代碼。`#app-nav` 內 6 個按鈕依 `NAV_TAB_ORDER`，每個含內嵌 `<svg class="app-nav__icon" aria-hidden="true">` 與 `<span class="app-nav__label">`（文字 = `TAB_LABELS`）；頁尾新增 `#footer-first-run-back`（`data-go="customizer"`，文字「返回難易度設定」，只在首次模式且目前為 `sources` 時以 CSS 顯示，AC-25-07）。**`<body>` 屬性不放在 `<html>` 上**，避免動到 B-1 檢查的開頭片段 |
| （v0.4）`EMT.router` 新增行為 | `go(tabId)`：(1) 首次模式（`body[data-entry="firstRun"]`）只接受 `customizer`、`sources`，其他回 `false`；(2) 換頁動畫依 §7.11；(3) 新頁 `hidden = false` 之後同步 `performance.mark("emt-page-shown")`（QA 量 AC-22-01 的輔助點）；(4) 設 `body.dataset.tab`。`start()` 時訂閱 store：收到 `"entry"` tag 且 `runtime.entryMode === "main"` → `body.dataset.entry = "main"`、`go("dashboard")`（首次「開始學習」與首次還原成功共用此路徑，view 不直接切頁） |
| （v0.5）`index.html` 導覽 | `#app-nav` 只剩 4 個按鈕，依 `NAV_TAB_ORDER`（主控台、難易度設定、單字卡、模擬測驗）；**刪除** `data-tab="decoder"`、`data-tab="phrasebank"` 兩鈕（含其 SVG）。`#view-decoder`、`#view-phrasebank` 兩個 `<section>` **保留**（空、永遠 `hidden`），但移除 `aria-label`（不在任何可存取名稱中出現「解碼器」「句型庫」），供未來開放時恢復（§7.16） |
| （v0.7）`main.js` 啟動順序 | `content.load()` → `store.init()` → `banner.render()` → **`services.pwa.start({ onChange: patch => store.actions.setPwa(patch) })`**（同步完成 PE-1 判定；`eligible` 時於回呼內先 `setPwa({ eligible: true, standalone })`、加入 HD-2 連結、綁定安裝事件，SW 註冊延到 `window` `load` 之後，PE-4）→ 設 `body.dataset.entry` → `router.start(…)` → `bottomNav.init()` → **`ui.pwaNotice.init({ onReload: () => services.pwa.requestReload() })`** → `emt-ready`。兩個新步驟各自包在既有 `step()` 內，失敗不影響其他步驟；`file://` 下 `start` 只做 PE-1 第 (1) 步即返回 |
| （v0.7）`index.html` 新增 | `<head>`：在 `<title>` 之後依序加入 HD-1 的 7 個靜態元素（逐字，見 §5.1 B-12）；其中 `<meta name="emt-build-id" content="@@BUILD_ID@@">` 的佔位由建置替換。`<body>`：`#app-banner` 之後加 `<div id="pwa-update" class="pwa-update" role="status" hidden></div>`（不在 `#app-main` 內，首次模式、boot 皆不受隱藏規則影響）。**不得**寫入任何 `<link rel="manifest">`、`<link rel="apple-touch-icon">` 或其他指向檔案的 `<link>`（HD-3），註解中也不得出現 `<link` 字樣 |
| （v0.5）`EMT.router` 新增行為 | (1) `go(tabId)`：`tabId` 屬 `HIDDEN_TAB_IDS`（呼叫時取 `EMT.core.constants`）→ 首次模式回 `false`、不切頁；一般模式改為 `go("dashboard")` 並回 `false`。不顯示錯誤、不 `console.error`（HT-3、E-68）。(2) `start()` 綁定 `window` 的 `hashchange`，啟動時也檢查一次 `location.hash`：片段正規化（去 `#`、去開頭 `/`、去開頭 `view-`、轉小寫）後屬 `HIDDEN_TAB_IDS` → 一般模式 `go("dashboard")`、首次模式不動作；其他片段一律忽略（本系統**不使用** hash 路由，不改網址）。(3) 其餘行為不變 |

### 4.3 Store API（FE-07 提供；views 只能透過它改狀態）

| API | 行為重點 | AC |
| :--- | :--- | :--- |
| `store.init()` | 依契約 §5.3 讀取；判定 `storageStatus`；以 `appliedScore` 重算色級；建單字集 | AC-18-02、AC-18-03、AC-18-05 |
| `store.getState()` | 回傳 `AppState`（唯讀，呼叫端不可改）。（v0.3 補註）結構為 `{ data, runtime }`：`data` = `PersistedData`（目標、自訂字、已掌握、統計、打卡等），`runtime` = `RuntimeState`；抽認卡狀態在 `state.runtime.flashcard`（`{ index, isFlipped, mode, quiz }`），語音狀態在 `state.runtime.speech`。`subscribe` 回呼的 `state` 與 §4.4 子元件 `render(…, state)` 的 `state` 皆為同一結構 | — |
| `store.subscribe(fn) → unsubscribe` | 每次 action 後呼叫 `fn(state, tags)`；`tags` 為變更範圍字串陣列（如 `["goal"]`、`["studySet"]`、`["flashcard"]`），view 依此只重繪受影響區塊 | AC-22-01～AC-22-04 |
| `actions.setDraftScore(raw) → { ok, score?, error? }` | 以 `goal.parseScoreInput` 驗證、修正為 5 的倍數、存 `draftScore`（未套用也保存）；`error` 填 `parseScoreInput` 回傳的 `message`（即 `SCORE_INVALID_MESSAGE`，§7.1）。**（v0.6）程式保留，但畫面已無呼叫路徑**（分數區隱藏且停用，§7.17）；view 不得在「套用」「開始學習」前呼叫 | ~~AC-02-02、AC-02-09~~（v0.10 暫停）、AC-02-08 |
| `actions.clickColor(colorId)` | ~~Q-32 規則調整 `draftScore`~~ **（v0.6，GS-2）** `draftScore` = `goal.scoreForCard(colorId)`（該色 `scoreMax`），一律設定（含目前選中色級、含藍金）；未知色級 → `draftScore` 不變。回傳形狀沿用現行 `{ score }`。其餘不變（只改 `draftScore`、不觸發 CI-1、一般模式照常寫入、首次模式只改記憶體） | AC-01-05、AC-01-07、AC-02-04、AC-26-02、AC-26-04 |
| `actions.applyGoal()` | `appliedScore = draftScore`、重算色級、重建單字集、抽認卡回第 1 張正面 | AC-01-02、AC-03-05 |
| `actions.addCustomWord(fields) → { ok, fieldErrors?, reason?: "duplicate"｜"quota" }` | 驗證、wordKey 去重、容量不足時回滾 | AC-04-02～AC-04-06、AC-18-04 |
| `actions.deleteCustomWord(id)` | 同步移除已掌握 wordKey（V-ST-06）、調整抽認卡索引（AC-04-08） | AC-04-07、AC-04-08 |
| `actions.injectTemplate(templateId) → { injected, skipped, reason?: "quota" }` | 注入尚未存在的字。（v0.3）容量不足時比照 `addCustomWord`：丟棄新狀態（記憶體回滾）、回 `{ injected: 0, skipped, reason: "quota" }`，不設 `writeStatus`、不以 `storage` tag 通知 banner；由 view 顯示「儲存空間不足」（不顯示「已注入 N 個單字」）。localStorage 停用（`disabled`）時沿用 AC-18-03：保留記憶體、照常回報注入數。理由見 §7.5 | AC-05-02、AC-05-04、AC-18-04 |
| `actions.gotoCard(index)`、`actions.flipCard()` | 換卡時 `isFlipped = false`、`lastResult = null`；翻卡算學習行為 | AC-06-04、AC-06-05、AC-17-02 |
| `actions.setFlashcardMode("card"｜"quiz") → { ok, reason?: "insufficient" }` | 進測驗模式時出題；不足 4 個相異釋義回 `insufficient` | AC-09-01、AC-09-06 |
| （v0.3）測驗模式中單字集變動 | 確認沿用 FE-07 現行做法。`applyGoal`、`deleteCustomWord`、`injectTemplate`、`importBackup` 等重建單字集後：(1) 目前這張卡仍在新集合中 → 保留目前題目（已產生的 4 選項仍可作答）；(2) 目前的卡已不在新集合、或之後換卡（`gotoCard`）需要出新題時，`buildQuiz` 回 `null`（少於 4 張或相異釋義不足）→ 自動退回 `mode = "card"`、`quiz = null`、`isFlipped = false`、STT `lastResult = null`。自動退回**不另外顯示 toast**（使用者沒有點「測驗模式」）；`data.vocabQuiz` 統計不變。之後使用者再點「測驗模式」才依 AC-09-06 顯示「單字數不足 4 個，無法產生選項」並維持抽認卡模式。QA 判定：退回後畫面為卡片模式、無未處理例外、統計數字不變 | AC-09-06（「維持抽認卡模式」的延伸） |
| `actions.answerVocabQuiz(optionIndex)` | 已作答則忽略；計數、答對加入已掌握、打卡 | AC-09-03、AC-09-04、AC-17-03 |
| `actions.answerPart5(i)`、`actions.nextPart5()`、`actions.restartPart5()` | 依 `Part5Progress` 規則；鎖定後重複點擊不計 | AC-11-01～AC-11-07 |
| `actions.recordSttScored()`、`actions.acknowledgeSttNotice()` | 打卡；設定已讀 | AC-17-02、AC-08-13 |
| `actions.setSttStatus(s)`、`actions.setSttResult(r)` | 執行期語音狀態 | AC-08-01、AC-08-10 |
| `actions.setDecoderIndex(i)`、`actions.toggleModifierDim()` | 淡化狀態跨句保留 | AC-13-03 |
| `actions.setPhraseCategory(c)`、`actions.setPhraseKeyword(k)` | 篩選條件 | AC-15-02、AC-16-01 |
| `actions.setTab(tabId)` | 由 router 呼叫 | — |
| `actions.exportBackup() → { filename, json }` | 由記憶體狀態產生（localStorage 停用時仍可） | AC-24-01 |
| `actions.importBackup(text, confirmFn) → Promise<ImportResult>` | 依契約 §6.2；`confirmFn` 由 view 傳入（呼叫 `ui.dialog.confirm`） | AC-24-03～AC-24-09 |

**v0.4 新增與修改（FE-25、FE-30）**

| API | 行為重點 | AC |
| :--- | :--- | :--- |
| `store.getState().runtime` | 新增 `entryMode`（`"firstRun"`／`"main"`，契約 FS-1）與 `learningQuotaNoticeShown`（啟動 `false`）。`data` 新增 `todayLearned`、`learnedHistory`（契約 §5.2 預設值） | AC-25-01、AC-30-14 |
| `store.today() → "YYYY-MM-DD"` | 以 store 注入的 `now` 取本地日期（`streak.localDate`）；主控台與測試一律用它，不自行 `new Date()`，以便以假時鐘測跨午夜 | AC-30-07 |
| `store.init()` | 依 §7.9 判定 `entryMode`；`parseStored` 的 v1 遷移與 RD-1 由 `persist` 處理（§7.8），`normalizeAfterLoad(data, part5Length, today)` 加今天參數；v1 遷移且驗證通過 → 以一次 `setItem` 寫回（MG-3，失敗不提示）；`entryMode = "firstRun"` 時 `currentTab = "customizer"`，否則 `"dashboard"` | AC-25-01、AC-25-05、AC-25-08、AC-25-09、AC-30-12、AC-30-13 |
| 寫入守門（FS-2） | `entryMode === "firstRun"` 時，所有一般 action 只改記憶體，**不呼叫 `setItem`**（`writeData` 回 `{ ok: false, reason: "firstRun" }`，不改 `writeStatus`、不發 `storage` tag）。只有 `startLearning`、`importBackup` 步驟 8 可寫第一筆 | AC-25-04、AC-25-07、V-ST-13 |
| `actions.startLearning() → { ok: true, write: "ok"｜"quota"｜"error"｜"disabled" }` | 僅首次模式有效（一般模式呼叫回 `{ ok: false }`、不做事）。等同 `applyGoal`（`appliedScore = draftScore`、V-ST-02、重建單字集、單字卡回第 1 張）＋ 一次 `setItem`；寫入結果不影響進入：`entryMode = "main"`、`currentTab = "dashboard"`，通知 tags 含 `"entry"`、`"goal"`、`"studySet"`、`"flashcard"`；`quota`／`error` 走既有 `noteWrite`（banner toast「儲存空間不足」） | AC-25-02、AC-25-03、AC-18-02、FS-4 |
| `actions.setTab(tabId)` | 首次模式只接受 `customizer`、`sources`；其他值忽略（不改 `currentTab`） | AC-25-01、AC-25-07 |
| `actions.importBackup`（首次模式） | 流程不變；步驟 9 成功時另設 `entryMode = "main"`、`currentTab = "dashboard"`，tags 加 `"entry"`；失敗或取消時 `entryMode` 維持 `"firstRun"`，記憶體與 localStorage 不變。步驟 7 的 ctx 傳入 `today`（匯入當天），供 IM-8 正規化 | AC-25-10、AC-25-11、AC-24-11、FS-5、FS-6 |
| `actions.flipCard()` | 原行為不變；另在**單字卡模式**且 `isFlipped` 由 `false` 變 `true` 時記錄學習事件 `"flip"`（wordKey = 目前卡）。翻回正面不記錄 | AC-30-03、LR-1 |
| `actions.answerVocabQuiz(i)` | 原行為不變；`selectedIndex` 由 `null` 變非 `null` 時記錄 `"vocabQuiz"`（wordKey = `quiz.wordKey`，對錯皆算）；已作答再點不記錄 | AC-30-03、LR-1 |
| `actions.recordSttScored()` | 原行為不變（打卡）；另記錄 `"stt"`：wordKey 取 `wordKey(runtime.speech.lastResult.targetText)`，`lastResult` 為 `null` 時退回目前卡片的 wordKey；兩者都沒有則不記錄。speech-panel 只在顯示分數後呼叫（FE-12 現行做法），逾時、空結果、錯誤不呼叫，故不需修改 | AC-30-03、AC-30-04、LR-1 |
| 學習事件寫入 | 同一 action 的打卡、`vocabQuiz`、`masteredWordKeys`、`todayLearned`、`learnedHistory` 變更合併為一次 `setItem`（LR-3 (6)、LR-5）。通知 tag 加 `"learning"`。容量不足依 §7.7「LR-7 實作」 | AC-30-14、AC-18-01 |
| `actions.answerPart5`、`gotoCard`、`deleteCustomWord`、`applyGoal`、`injectTemplate` | **不**記錄學習事件、不改 `todayLearned`／`learnedHistory`（模擬測驗作答仍打卡） | AC-30-04、AC-30-06、LR-4 |
| `actions.exportBackup()` | `backup.buildBackup` 以匯出當下日期正規化兩個新欄位（契約 §6.1） | AC-24-02、AC-30-09 |
| 通知 tags（新增） | `"learning"`：今日紀錄或歷史改變；`"entry"`：`entryMode` 改變；`"learningQuota"`：本工作階段第一次學習紀錄容量不足（banner 以 toast 顯示「儲存空間不足」） | — |

**v0.5 新增與修改（FE-37；契約 §5.7 CI-1～CI-10、§5.8 HT-1）**

| API | 行為重點 | AC |
| :--- | :--- | :--- |
| `actions.requestApplyGoal() → { status: "applied" } ｜ { status: "confirm" } ｜ { status: "ignored" }` | **一般難易度設定頁「套用」的唯一入口**。`entryMode === "firstRun"` → `"ignored"`（首次畫面用 `startLearning`，CI-1）。以 `reinit.needsConfirm(data, today())`（生效色級改變且有學習紀錄）判斷：成立 → **不改任何狀態、不呼叫 `setItem`**，回 `"confirm"`；不成立 → 執行既有 `applyGoal()`，回 `"applied"`（不清除任何資料） | AC-01-02、AC-01-07、AC-32-01、AC-32-05、AC-32-06、AC-32-07 |
| `actions.confirmApplyGoal() → { ok: true, write: "ok"｜"disabled" } ｜ { ok: false, reason: "quota"｜"error"｜"firstRun" }` | 視窗「確定」。以 `appliedGoalState()` 的新 `goal` 與 `reinit.buildReinitData(data, goal, persist.defaultData())` 建立**新物件**（不就地修改）。`storageStatus === "ok"` → `writeData(newData)` **一次**；失敗（quota／error）→ **不替換記憶體**，只把記憶體 `goal.draftScore` 改回 `appliedScore`（同 `cancelApplyGoal`，不寫入），`writeStatus` 不變、不發 `storage`／`learningQuota` tag、不改 `learningQuotaNoticeShown`，回 `{ ok: false, reason }`（CI-7）。成功或 `unavailable`（CI-6，不寫入）→ 以新資料取代記憶體，執行期依 CI-8：重建 `studySet`、`flashcard = { index: 0, isFlipped: false, mode 保持, quiz 依模式重出 }`、`speech.lastResult = null`；tags = `goal`、`studySet`、`flashcard`、`quiz`、`speech`、`stats`、`streak`、`part5`、`learning`（成功時 `noteWrite` 照常） | AC-32-02、AC-32-03、AC-32-09、AC-32-10、AC-32-11 |
| `actions.cancelApplyGoal()` | 視窗「取消」／Esc／點視窗外。`draftScore !== appliedScore` 時只在記憶體把 `draftScore` 改回 `appliedScore`，以 `commit(…, dataChanged = false)` 通知 `"goal"`，**`setItem` 呼叫 0 次**（CI-9，契約 FB-35 的已知行為）；單字卡位置、其他欄位不變 | AC-32-04 |
| `actions.applyGoal()` | 保留原行為（直接套用、不判斷、不清除），供 `requestApplyGoal` 內部與既有測試使用；**view 不得直接呼叫**（customizer 改呼叫 `requestApplyGoal`，以 `customizer.test.js` 原始碼掃描確認） | — |
| `actions.setTab(tabId)` | `tabId` 屬 `HIDDEN_TAB_IDS` → 忽略（不改 `currentTab`、不通知），使 `currentTab` 永不為隱藏頁（HT-1）；導向主控台由 router 負責 | AC-20-04 |
| `importBackup`、`startLearning` | **不**經過初始化判斷（CI-1、AC-32-08）；程式不變 | AC-32-08 |

**v0.6 修改（FE-42；契約 §5.9 GS-1～GS-8、V-ST-16）**

| API | 行為重點 | AC |
| :--- | :--- | :--- |
| `actions.clickColor(colorId)` | 見上表 v0.6 列：`draftScore` = `scoreForCard(colorId)`；回傳沿用現行 `{ score }` 形狀（`score` 為設定後的 `draftScore`） | AC-01-05、AC-02-04、V-ST-16 |
| `store.init()` | 預設值來自 `persist.defaultData()`（已引用 `SCORE_DEFAULT`，現為 725）；localStorage 停用、首次、讀取失敗重設三種情況皆為 725（GS-7）。合法的既有分數（如 600、735）**原值保留**，只依 V-ST-02 重算色級（GS-4） | AC-18-02、AC-18-03、AC-18-05、AC-25-04、AC-26-06 |
| `requestApplyGoal()`、`applyGoal()`、`startLearning()` | 不變：`appliedScore = draftScore`。未點任何卡片直接套用時寫入原值，不改寫為上限或下限（GS-3） | AC-26-06、AC-25-02、AC-25-03 |
| `cancelApplyGoal()` | 不變：`draftScore` 還原為 `appliedScore`（GS-8），view 依 `"goal"` tag 把選中卡片切回 Color(`appliedScore`) | AC-32-04 |

**v0.7 新增（FE-49；契約 `RuntimeState.pwa`、PV-1、PV-7）**

| API | 行為重點 | AC |
| :--- | :--- | :--- |
| `store.init()` | `initialRuntime` 加 `pwa: core.pwa.initialPwaState()`（7 欄：`eligible`、`standalone`、`installPromptAvailable`、`installSuppressed`、`updateAvailable`、`reloadRequested` 皆 `false`，`lastUpdateCheckAt` `null`）；`init` 本身**不**判定 PE-1（L2 不碰瀏覽器 API），由 `main.js` 經 `setPwa` 寫入 | AC-37-01、AC-37-04 |
| `actions.setPwa(patch) → { changed: boolean }` | 只接受 `core.pwa.PWA_STATE_KEYS` 中的鍵；布林欄位只收 `true`／`false`，`lastUpdateCheckAt` 只收有限數或 `null`；其他鍵或型別錯誤一律忽略。有任何欄位改變 → 以新物件取代 `runtime.pwa`、`commit(data, runtime, ["pwa"], false)`（**`setItem` 0 次**，首次模式與一般模式相同）；沒有改變 → 不通知、回 `{ changed: false }`。不得接受物件型別的值（`BeforeInstallPromptEvent`、`ServiceWorkerRegistration` 不得進入 `AppState`，PV-7） | AC-34-07～AC-34-10、AC-36-03、AC-36-04、AC-37-06 |
| 其他 action | 任何 action 重建 `runtime` 時必須保留 `runtime.pwa`（現行只有 `init` 呼叫 `initialRuntime`，其餘以 `assign` 局部更新，FE-49 以測試鎖定：`importBackup`、`confirmApplyGoal`、`startLearning` 前後 `pwa` 不變） | AC-36-04 |
| 通知 tags（新增） | `"pwa"`：`runtime.pwa` 任一欄位改變 | — |

### 4.4 抽認卡子元件（FE-11 與 FE-12、FE-13 的介面）

| 介面 | 提供者 | 呼叫者 | 約定 |
| :--- | :--- | :--- | :--- |
| `EMT.components.speechPanel.render(containerEl, card, state)` | FE-12 | FE-11（卡片正面 `.fc-speech` 容器，每次換卡或重繪時呼叫；不存在則略過） | 產生 TTS 1.0x、0.75x、麥克風按鈕、「需要連網」標示、分數區 |
| `EMT.components.speechPanel.reset()` | FE-12 | FE-11（換卡、切換模式、離開頁面時） | 停止朗讀與聆聽（AC-07-03、AC-08-10）。（v0.5）同時停止音量分析、收音條歸暗，但**不釋放**麥克風音軌（同頁重用，Q-36） |
| （v0.5）`EMT.components.speechPanel.release()` | FE-39 | flashcards 的 `hide()`（取代原本呼叫的 `reset()`） | `reset()` ＋ `EMT.services.mic.release()`：停止所有音軌、關閉 `AudioContext`（AC-33-02） |
| `EMT.components.flashcardQuiz.render(containerEl, state)` | FE-13 | FE-11（`mode === "quiz"` 時取代卡片區） | 顯示題目單字與 4 選項，作答呼叫 `actions.answerVocabQuiz` |
| 「測驗模式」切換鈕 | FE-11 | — | 呼叫 `actions.setFlashcardMode`；回 `insufficient` 時顯示「單字數不足 4 個，無法產生選項」 |

（v0.3 補註）上表 `render(containerEl, card, state)`、`render(containerEl, state)` 的 `state` 即 `store.getState()` 回傳的 `AppState = { data, runtime }`（§4.3）。子元件讀取抽認卡狀態一律用 `state.runtime.flashcard`（題目在 `state.runtime.flashcard.quiz`）、語音狀態用 `state.runtime.speech`、統計用 `state.data.vocabQuiz`；不得假設 `state.flashcard` 之類的扁平結構。`card` 為 `StudyCard`（`state.runtime.studySet[state.runtime.flashcard.index]`），由 FE-11 傳入以免子元件重算。

### 4.5 v0.4 新增的共用模組介面

| 介面 | 提供者 | 呼叫者 | 約定 |
| :--- | :--- | :--- | :--- |
| `EMT.core.learning.*`（§7.7 函式表） | FE-20 | persist、backup、store、dashboard | 純函式、不修改傳入物件 |
| `EMT.core.interaction.UI`、`classifySwipe`、`isTap`、`swipeTarget`、`vibratePattern`、`patternTotal` | FE-21 | router（經 motion）、flashcards、flashcard-quiz、part5、haptics、測試 | §7.10、§7.12；`UI` 物件凍結 |
| `EMT.ui.motion.reduced() → boolean` | FE-24 | 所有播放動畫的 view | `matchMedia("(prefers-reduced-motion: reduce)").matches`；`matchMedia` 不存在 → `false`。每次呼叫即時查詢（使用者中途切換系統設定也生效） |
| `EMT.ui.motion.enter(el, className, ms)` | FE-24 | router、flashcards、flashcard-quiz、part5、dashboard | `reduced()` 為真 → 不加 class、直接回傳；否則先取消該元素同名 class 的舊計時器並移除 class，再加上 class，`setTimeout(ms + 50)` 後移除。**不依賴 `animationend`**（減少動態時 CSS 已關閉動畫，事件不會觸發） |
| `EMT.ui.motion.cancel(el, className)` | FE-24 | router（隱藏舊頁時） | 立刻移除 class 並清計時器 |
| `EMT.services.haptics.vibrate(kind) → boolean` | FE-29 | flashcard-quiz、part5 | `kind` 為 `"correct"`／`"wrong"`；`navigator.vibrate` 為函式時以 `interaction.vibratePattern(kind)` 呼叫**一次**並回傳 `true`；不存在、拋例外、或回傳 `false` → 靜默回 `false`（不 toast、不 `console.error`，AC-29-03）。減少動態**不影響**震動（AC-31-03） |
| `EMT.ui.bottomNav.init()` | FE-26 | main.js | 綁定 `focusin`／`focusout`：焦點在 `input`（`type` 為 text、search、number、email、url、tel、password 或無）、`textarea`、`select` 時，`document.documentElement.classList.add("is-typing")`，離開時移除；重複呼叫只綁一次 |
| `EMT.ui.importFlow.start() → Promise<ImportResult｜null>` | FE-32 | customizer（首次畫面「從備份還原」） | 建立隱藏 `<input type=file accept=".json,application/json">` → `FileReader.readAsText` → `store.actions.importBackup(text, confirmFn)`，`confirmFn` 以 `ui.dialog.confirm` 顯示「匯入將覆蓋目前所有進度」→ 依結果 toast（文字與主控台完全相同：成功「已匯入，略過 N 筆」、`format`、`version`（列檔案版本與「1、2」）、`quota`、`write_failed`；`cancelled` 與未選檔不提示）。選檔取消回 `null`。訊息文字以匯出的純函式 `messageOf(result)` 產生，測試逐一比對 `dashboard.importMessage` 的輸出（兩處文字不得分歧）。主控台本版**不**改用此模組（降低回歸風險，見 SD-FB-14） |

### 4.6 v0.5 新增的共用模組介面

| 介面 | 提供者 | 呼叫者 | 約定 |
| :--- | :--- | :--- | :--- |
| `EMT.core.reinit.*`（§7.15 函式表） | FE-34 | store | 純函式、不修改傳入物件；`goal`、`learning`、`persist` 於函式內取用（LD-1） |
| `EMT.core.meter.*`（§7.14 常數與函式表） | FE-35 | services/mic、speech-panel、測試 | 純函式；`THRESHOLDS_DBFS` 凍結 |
| `EMT.services.mic`（§7.14 API 表） | FE-36 | speech-panel（唯一呼叫者） | Promise 不 reject；所有例外收斂為回傳值；回呼例外被攔下；`create(globalObject)` 供 Node 測試注入替身 |

### 4.7 v0.7 新增的 PWA 模組介面

**`EMT.core.pwa`（FE-45，L1，UMD；Node 下 `module.exports` 同一物件，供 `tools/build.mjs` 以 `createRequire` 讀取）**

| 成員 | 約定 | 契約 |
| :--- | :--- | :--- |
| `PWA_APP_NAME`、`PWA_THEME_COLOR`、`PWA_BACKGROUND_COLOR`、`PWA_MANIFEST`、`PWA_DEPLOY_FILES`、`PWA_PRECACHE_URLS`、`PWA_CACHE_PREFIX`、`PWA_BUILD_ID_PATTERN`、`PWA_BUILD_ID_META_NAME`、`PWA_UPDATE_RECHECK_MS`、`PWA_TEXTS` | 與 `data-schema.ts` §12 **逐值相同**、鍵順序相同（`PWA_MANIFEST` 鍵順序決定 manifest 輸出位元組，MF-3）；全部深度凍結。`constants.js` **不重複**定義（單一來源） | §12 全部常數 |
| `PWA_STATE_KEYS` | `PwaRuntimeState` 7 個鍵名（凍結陣列） | `PwaRuntimeState` |
| `initialPwaState() → PwaRuntimeState` | 每次回傳新物件，值見 §4.3 v0.7 | `PwaRuntimeState` 註解 |
| `isEligible(env) → boolean` | `env = { location, isSecureContext, navigator }`；依 PE-1 順序：(1) `protocol === "https:"`，或 `protocol === "http:"` 且 `hostname` ∈ {`localhost`, `127.0.0.1`}；(2) `isSecureContext === true`；(3) `"serviceWorker" in navigator` 且值非 `null`／`undefined`。前一步不成立即回 `false`、**不觸及**後面的屬性（第 (1) 步不成立時連 `navigator` 都不讀）；整段 `try`，例外 → `false` | PE-1、V-PWA-08 |
| `isStandalone(env) → boolean` | `env = { matchMedia, navigator }`；`matchMedia("(display-mode: standalone)").matches === true` 或 `navigator.standalone === true`；`matchMedia` 不是函式或例外 → 只看 `navigator.standalone`；全部例外 → `false` | IN-2 |
| `installVisible(state) → boolean` | `p = state.runtime.pwa`：`p.eligible && !p.standalone && p.installPromptAvailable && !p.installSuppressed && state.runtime.entryMode === "main" && state.runtime.currentTab === "dashboard"` | IN-1 |
| `updateVisible(state) → boolean` | `p.eligible && p.updateAvailable` | UP-6 |
| `needsRecheck(nowMs, lastMs) → boolean` | `lastMs` 為有限數且 `nowMs − lastMs ≥ PWA_UPDATE_RECHECK_MS` | UP-3 |

**`EMT.services.pwa`（FE-48，L3）**——預設實例綁定 `self`；`create(globalObject)` 回傳獨立實例供 Node 測試注入替身（比照 `services/mic.js`）。物件（安裝事件、registration、worker）只存在實例的閉包變數（PV-7）。

| API | 約定 | 契約 |
| :--- | :--- | :--- |
| `start({ onChange }) → { eligible, standalone }` | 只執行一次（再次呼叫回傳第一次的結果、不重複綁定）。以 `core.pwa.isEligible` 判定；`false` → 立即回傳 `{ false, false }`，**不做任何其他事**（PE-2）。`true` → (1) `standalone = isStandalone(…)`；(2) 同步呼叫 `onChange({ eligible: true, standalone })`；(3) 依 HD-2 以 `document.createElement("link")` + `setAttribute` 在 `<head>` 末端加入 manifest、apple-touch-icon 兩個連結（已存在同 `rel` 則不重複加）；(4) 在 `window` 綁定 `beforeinstallprompt`、`appinstalled`（§7.18.6）；(5) `document.readyState === "complete"` → `setTimeout(register, 0)`，否則 `window` 的 `load` 事件（`once`）後註冊（PE-4）。`onChange` 例外一律攔下 | PE-1～PE-4、HD-2、IN-2、IN-3、IN-6 |
| `requestInstall() → Promise<void>` | IN-5；永不 reject | IN-5、AC-34-09 |
| `requestReload() → void` | UP-4；`reloadRequested` 已為 `true` 時不做事 | UP-4 |
| 內部 `register()` | `navigator.serviceWorker.register("./sw.js", { scope: "./", updateViaCache: "none" })`；成功 → §7.18.5；失敗 → 靜默（PE-3），不呼叫 `onChange` | SW-1、PE-3 |
| 錯誤處理 | 全部 Promise 以 `.catch(function () {})` 收斂；**不得** `console.error`／`console.warn`；不得 `throw` 到呼叫端 | PE-3、AC-37-03 |
| 禁止 | 不讀寫 `localStorage`／`sessionStorage`、不使用 `caches`、`indexedDB`、`fetch`、`XMLHttpRequest`；`postMessage` 只用於 `{ type: "SKIP_WAITING" }`；原始碼不出現 `<link`、`<script` 字樣（含註解，避免觸發 B-7） | PV-1、PV-2、HD-3 |

**`EMT.ui.pwaNotice`（FE-50，L4）**

| API | 約定 | 契約 |
| :--- | :--- | :--- |
| `init({ onReload })` | 只執行一次；取得 `#pwa-update`（不存在則不做事）；以 `core/dom.js` 建立 `<span class="pwa-update__text">`（`PWA_TEXTS.updateNotice`）與 `<button type="button" class="btn btn--primary pwa-update__btn">`（`PWA_TEXTS.updateButton`）；訂閱 store，依 `core.pwa.updateVisible(state)` 切換容器 `hidden`；初次 `init` 時也依目前狀態繪製一次 | UP-6、AC-36-03 |
| 按鈕 | 點擊 → 設 `disabled`、呼叫 `onReload()`（例外攔下）；之後不再呼叫（防連點） | UP-4 |
| 樣式 | `80-pwa.css`；無 `transition`、無 `animation`（§9 v0.7） | AC-31-03、AC-27-03 |

**`views/dashboard.js`（FE-51）**——備份區塊結構（由上而下）：`h3`（`TEXT.backupTitle`，不變）→ 既有 `p.dash-backup__hint` → `div.btn-row`（「匯出備份」「匯入備份」）→ **`p.dash-backup__origin`**（`PWA_TEXTS.backupOriginNotice`，常駐、不受 `eligible`／`storageStatus` 影響）→ **`div.dash-backup__install`**（IN-1 成立時才含 `<button type="button" class="btn btn--secondary dash-install" data-action="install-app">安裝 App</button>`；不成立時容器 `hidden` 且無子節點，不佔版面）→ 隱藏的檔案輸入。點擊 → `EMT.services.pwa.requestInstall()`；store 回呼會在 `prompt()` 前同步把 `installPromptAvailable` 設 `false`、`installSuppressed` 設 `true`，訂閱回呼收到 `"pwa"` tag 即移除按鈕。`show()` 時也重繪安裝區。

**`views/sources-page.js`（FE-52）**——既有聲明清單（`src-statements`）在 3 條授權聲明之後新增 1 條：「PWA 圖示與名稱「`PWA_APP_NAME`」為品牌標識，著作權人 `PROJECT_LICENSE.copyrightHolder`（缺漏時用既有保底值 JimmyLin），保留所有權利，不適用 MIT 與 CC BY-SA 4.0」，組字後必須與 PRD AC-23-02 原文逐字相同。`PWA_APP_NAME` 於 render 時取 `EMT.core.pwa`（LD-2；不存在依 LD-3 丟出錯誤）。

### 4.8 v0.8 新增與修改的模組介面（版面與視覺）

**`EMT.core.layout`（`core/layout.js`，FE-54；L1、IIFE、Node `module.exports`；載入時不取用其他模組）**

| 成員 | 型別／簽章 | 說明 |
| :--- | :--- | :--- |
| `APP_DISPLAY_NAME`、`FROZEN_IDENTIFIERS`、`COLOR_TOKENS`、`SEMANTIC_COLORS`、`LAYOUT_TEXTS` | 深度凍結物件／字串 | 與 `data-schema.ts` §13 **逐字**相同（鍵順序亦同）；`layout.test.js` 以測試內複製的契約原文 `deepStrictEqual` |
| `UI_LAYOUT` | 凍結物件 | 版面常數（§7.19 各節引用）：`CONTENT_NARROW_PX: 720`、`CARD_RADIUS_PX: 16`、`NARROW_MAX_PX: 640`（= `interaction.UI.NAV_BOTTOM_MAX_PX`）、`FIRSTBAR_RESERVE_PX: 184`、`CHART_TRACK_PX: 64`、`CHART_AREA_MAX_PX: 120`、`CHART_EMPTY_MAX_PX: 48`、`PROGRESS_BAR_PX: 6`、`LOGO_PX: 32`、`SECTION_TITLE_PX: 18`、`STAT_VALUE_PX: 28`、`FOCUS_OUTLINE_PX: 3`。CSS 以同值寫死，`tokens.test.js` 比對 |
| `fill(template, values)` | `(string, object) → string` | 把 `{key}` 換成 `String(values[key])`；模板中出現但 `values` 沒有的鍵 → 拋 `TypeError`（程式錯誤，測試可抓）；不做 HTML 跳脫（一律 `textContent` 寫入） |
| `formatInt(n)` | `(number) → string` | 整數四捨五入後加千分位（`2809` → `"2,809"`）；非有限數 → `LAYOUT_TEXTS.statNoData`「—」。**全畫面整數一律用此格式**（契約 `LAYOUT_TEXTS` 註解「千分位與否由 SD 定，全畫面一致」；與 `customizer.formatInt` 輸出相同） |
| `goalLine(applied, effective)` | `(ColorLevelDefinition, ColorLevelDefinition) → { text, capped }` | DB-4：`applied.id === effective.id` → `goalLineSame`；否則 `goalLineCapped`；`{daily}` = `effective.dailyNewWords`。任一參數缺 → `{ text: "—", capped: false }`。回傳**不含** `・變更`（view 另建可點擊節點） |
| `summaryLine(level, daily, weeks, capped)` | `(ColorLevelDefinition, number, number\|null, boolean) → string` | FT-4：`fill(summaryLine, { color: level.nameZh, daily: formatInt(daily), weeks: formatInt(weeks) })`，`capped` 時接 `summaryLockedSuffix`；`weeks` 為 `null` → 「—」 |
| `chartIsEmpty(counts)` | `(number[]) → boolean` | 陣列為空或每個值皆為 0（含非有限數視為 0）→ `true`（§5.4 v0.12 段） |
| `part5Progress(kind, number, total)` | `("question"\|"summary"\|"empty", number, number) → { visible, now, max, percent }` | MT-1：`total ≤ 0` 或 `kind === "empty"` → `visible: false`；`"summary"` → `now = total`、`percent = 100`；`"question"` → `now = number`（= 畫面「第 i / N 題」的 i）、`percent = Math.round(now / total × 1000) / 10`；`max = total` |

**`EMT.store`（FE-55）**

| 變更 | 說明 |
| :--- | :--- |
| `initialRuntime` | 新增 `dashboard: { backupExpanded: false }`（每次 `init` 皆為 false；匯入、`startLearning`、`confirmApplyGoal` 以 `assign` 局部更新，不重建 `runtime`，因此保留現值，E-91） |
| `actions.setBackupExpanded(value)` | 只接受 `true`／`false`（其他 → `{ changed: false }`）；值相同 → 不通知；不同 → 以新物件取代 `runtime.dashboard`、通知 `["dashboard"]`、**不呼叫 `writeData`**（`setItem` 0 次；一般與首次模式相同）；回傳 `{ changed }` |
| 其他 | `exportBackup` 不含 `runtime`（既有）；`getState().runtime.dashboard` 為唯讀快照 |

**`EMT.core.pwa`（FE-56 → FE-58）**：`PWA_THEME_COLOR` `#1e9bf0`、`PWA_BACKGROUND_COLOR` `#eef4fa`、`PWA_MANIFEST.theme_color`／`background_color` 同值（FE-56）；`installVisible(state)` 多一個條件 `state.runtime.dashboard && state.runtime.dashboard.backupExpanded === true`（FE-58，IN-1 v0.12）。`PWA_APP_NAME` 不變（= `APP_DISPLAY_NAME`）。

**`views/dashboard.js`（FE-58）**：移除 `ENTRIES`、`summaryOf`、2 個小環形圖；新增純函式 `dashboardModel(state, today)` → `{ today: { x, d, done, ratio, text, centerText, doneText }, goal: { text, colorId, capped }, stats: { streakValue, streakUnit, masteryText, masteredText, accuracyText }, chart: { empty, bars[] }, backupExpanded }`（文字全部經 `layout`）；保留 `goalInfoOf`、`importMessage`、`ringGeometry`；`INSTALL_TAGS` 加 `"dashboard"`；`PROGRESS_TAGS` 加 `"dashboard"`。

**`views/customizer.js`（FE-57）**：`cardModels` 改為 `levelRows(nO, nB, nG, draftScore)` → `[{ id, name, desc, locked, vocabText, dailyText, selected }]`（鎖定列 `vocabText`／`dailyText` 為 `null`）；新增 `firstRunSummary(G, score, nB, nG)` → `{ text, locked }`（與 `estimateTexts` 使用同一個 `G.estimate(score, 0, nB, nG)`，FT-4）；`actionsModel` 依 §7.19.5 調整。元素 id `#cz-start`、`#cz-restore`、`#cz-apply` 保留（QA 定位用）。

**`views/part5.js`（FE-61）**：`render()` 在 `h2.p5-heading` 之後插入進度條（`layout.part5Progress(vm.kind, vm.number, vm.total)`）；`buildViewModel` 不變。

**`views/sources-page.js`（FE-60）**：新增純函式 `originalSourceName(registry)` → ORIGINAL 項目的 `fullName`（非空字串）或 `null`；授權區塊在聲明清單之前顯示一行「原創內容來源：{fullName}」（`null` 時不建節點，不寫死名稱，NM-3）。

### 4.9 v0.9 新增與修改的模組介面（版本號與介面精簡）

**`EMT.core.version`（`core/version.js`，FE-63；L1、IIFE、Node `module.exports`；載入時不取用其他模組）**

| 成員 | 型別／簽章 | 說明 |
| :--- | :--- | :--- |
| `APP_VERSION_META_NAME`、`APP_VERSION_PATTERN`、`BUILD_CODE_LENGTH`、`VERSION_LINE_TEXT` | 字串／數字 | 與 `data-schema.ts` §14 **逐字**相同（`"emt-app-version"`、`"^(0\|[1-9][0-9]*)\\.(0\|[1-9][0-9]*)\\.(0\|[1-9][0-9]*)$"`、`7`、`"版本 {version}（建置 {build}）"`）；`version.test.js` 以測試內複製的契約原文比對 |
| `isValidVersion(v)` | `(any) → boolean` | `typeof v === "string"` 且符合 `APP_VERSION_PATTERN`；建置與頁面共用 |
| `buildCode(buildId)` | `(any) → string \| null` | `buildId` 為字串且符合 `PWA_BUILD_ID_PATTERN`（呼叫時向 `core/pwa.js` 取用：Node 以 `require("./pwa.js")`，瀏覽器以 `EMT.core.pwa`；取不到 → `null`）→ `buildId.slice(0, BUILD_CODE_LENGTH)`；否則 `null` |
| `versionLineText(version, buildId)` | `(any, any) → string \| null` | 兩者皆合法 → `VERSION_LINE_TEXT` 的 `{version}`、`{build}` 各替換 1 次（以 `split/join`，不用 `replace` 的 `$` 樣式）；任一不合法 → `null`（VR-8：不產生部分文字）。**不得**含任何寫死的版本號（VR-5） |

**`EMT.ui.versionLine`（`ui/version-line.js`，FE-64；L4）**

| 成員 | 型別／簽章 | 說明 |
| :--- | :--- | :--- |
| `readMeta(doc, name)` | `(Document, string) → string \| null` | `doc.querySelectorAll('meta[name="' + name + '"]')`；**恰 1 個**才回傳其 `getAttribute("content")`，否則 `null` |
| `init(doc?)` | `(Document?) → { rendered: boolean, text: string \| null }` | 預設 `root.document`；讀 `APP_VERSION_META_NAME`、`PWA_BUILD_ID_META_NAME` 兩個 meta（只讀一次，結果存模組變數）→ `version.versionLineText` → 非 `null` 且 `#footer-sources` 存在 → 以 `core/dom.js` 建立 `p#app-version.app-footer__version`（`textContent`；不設 `tabindex`、`role`、事件）插在 `#footer-sources` 之後；已存在 `#app-version` 時只更新文字（重入安全）。`null` 或找不到 `#footer-sources` → 不建節點，若已存在則移除。整個函式包在 `try` 內，任何例外 → `{ rendered: false, text: null }`，**不**輸出 `console.error`（VR-8） |

**`EMT.core.layout`（FE-65）**：`LAYOUT_TEXTS` 加 `levelStatus`（鍵順序同契約：最後一鍵）；`goalLineCapped`、`goalLineSeparator` 兩鍵**保留**（契約 §13 仍含，`deepStrictEqual` 需要），但不得再被 view 使用。新增純函式：

| 成員 | 型別／簽章 | 說明 |
| :--- | :--- | :--- |
| `goalLineText(effective)` | `(ColorLevelDefinition) → string` | DB-4 v0.14：`fill(goalLineSame, { color: effective.nameZh, daily: formatInt(effective.dailyNewWords) })`；缺參數 → `statNoData`「—」。結果：橘「橘級・每日 10 字」、棕「棕級・每日 10 字」、綠「綠級・每日 15 字」；呼叫端以生效色級呼叫，藍、金自然為綠 |
| `levelStatusText(effective)` | `(ColorLevelDefinition) → string` | LS-1：`fill(levelStatus, { color: effective.nameZh })`；缺參數 → 「目前色級：—」 |
| `goalLine(applied, effective)` | 既有 | **標記 `@deprecated`**，保留函式與既有測試（避免第 1 批改動使第 2 批前的 `dashboard.test.js` 失敗，T-70）；v0.9 起 view 不得呼叫 |

**`views/dashboard.js`（FE-66）**：`dashboardModel().goal` 改為 `{ text: LAY.goalLineText(levelOf(info.effectiveColorId)), colorId: info.effectiveColorId }`（不再有 `capped`）；`goalInfoOf` 的 `effectiveColor` 不再附加「（內建上限）」，移除 `TEXT.builtinCap`；DOM 移除 `.db-goal__sep`；`changeBtn` class 改為 `btn db-change`（不含 `btn--link`）。

**`views/customizer.js`（FE-67）**：`statusTexts(G, goal)` 改名為 `statusLine(G, L, goal)` → `{ text }`（`text` = `L.levelStatusText(G.levelOf(goal.effectiveColor))`）；移除 `T.statusTarget`、`T.statusEffective`、`T.builtinCap`、狀態列的 `statusCap` 節點；`refs.stLine` 取代 `refs.stTarget`／`refs.stEffective`。

**`views/custom-vocab.js`（FE-68）**：範本 `section` 建立時帶 `hidden` 與 `inert`（契約 HT-6）；`buildItem` 不再建立 `.cv-item__source`；`templateButtons`、`templateLabel`、`injectMessage`、`onTemplate` 保留（HT-8）。匯出 `EMPTY_TEXT`（自訂清單空狀態文字，供測試）。**`views/flashcards.js`（FE-68）**：只改 `.fc-empty__hint` 文字。

### 4.10 v0.10 新增與修改的模組介面（學習位置與作答紀錄）

共通：以下純函式**不修改傳入值**、對任何輸入不拋例外（輸入型別不符時回傳「不變」或預設值），以 `node --test` 直接 `require`。

**`EMT.core.position`（`core/position.js`，FE-71；L1；載入時只取 `wordkey`）**

| 成員 | 型別／簽章 | 說明 |
| :--- | :--- | :--- |
| `isShape(v)` | `(any) → boolean` | `$defs/FlashcardPosition`：`null`，或**恰** 2 鍵 `wordKey`（`typeof === "string"`）、`ordinal`（`Number.isInteger` 且 ≥ 1）的純物件（陣列、多餘鍵、`"10"`、`1.5`、`0` 皆為 false） |
| `normalize(v)` | `(any) → FlashcardPosition \| null` | RD-3 (d)、IM-10 (3)：`isShape` 為 false 或 `v === null` → `null`；`wordKey` 改為 `wordkey.wordKey(v.wordKey)`，結果為 `""` → `null`；回傳新物件 `{ wordKey, ordinal }` |
| `fromIndex(studySet, index)` | `(StudyCard[], number) → FlashcardPosition \| null` | `0 ≤ index < N` 且該卡 `wordKey` 為非空字串 → `{ wordKey: studySet[index].wordKey, ordinal: index + 1 }`；否則 `null` |
| `resolve(position, studySet)` | `(any, StudyCard[]) → { index, position, kind }` | **FP-2**：(1) N = 0 → `{ index: 0, position: <傳入值原樣>, kind: "empty" }`（紀錄不動）；(2) `normalize(position)` 為 `null` → `{ 0, fromIndex(set, 0), "none" }`；(3) 線性搜尋 `set[i].wordKey === p.wordKey` → `{ i, fromIndex(set, i), "found" }`；(4) 找不到 → `i = min(p.ordinal, N) − 1` → `{ i, fromIndex(set, i), "fallback" }`。O(N)，N ≤ 約 4,000 |
| `sameCard(a, b)` | `(any, any) → boolean` | 兩者皆非 `null` 且 `wordKey`、`ordinal` 皆相同 |

**`EMT.core.part5flow`（`core/part5flow.js`，FE-72；L1；載入時不取用任何模組）**

名詞：`bankIds` = 題庫 id 陣列（`bankIdsOf(PART5_QUESTION_BANK)`，Q = 長度）；`set` = `correctSet(part5CorrectIds)`；`only` = `part5UnansweredOnly`；`p5` = `Part5Progress`。

| 成員 | 型別／簽章 | 說明 |
| :--- | :--- | :--- |
| `bankIdsOf(bank)` | `(any) → (string \| null)[]` | 非陣列 → `[]`；每題 `q && typeof q.id === "string" && q.id.trim() !== "" ? q.id : null`（`null` 的題目永遠「未答對」、不可被記錄） |
| `normalizeIds(raw)` | `(any) → string[]` | RD-3 (c)、IM-10 (2)：非陣列 → `[]`；捨棄非字串與 `trim()` 為空者；完全相同的字串只留第一次；其餘**原值、原順序**保留（含題庫不存在的 id，Q-71 A） |
| `correctSet(ids)` | `(any) → Set<string>` | `new Set(normalizeIds(ids))` |
| `countCorrect(bankIds, set)` | `→ number` | K：走訪 `bankIds`，非 `null` 且 `set.has(id)` 且未計過的 id 數（0 ≤ K ≤ Q） |
| `isCorrectAt(bankIds, set, j)` | `→ boolean` | `bankIds[j] !== null && set.has(bankIds[j])` |
| `nextUnanswered(bankIds, set, from)` | `→ number` | `next(f)`：`j` 從 `max(from, 0)` 到 Q − 1 的第一個 `!isCorrectAt`；無 → `-1`（單一迴圈，UO-9） |
| `viewKind(p5, bankIds, set, only)` | `→ "empty" \| "question" \| "summary" \| "allCorrect"` | Q = 0 → `"empty"`；其餘依 **UO-3**：`allDone = only === true && countCorrect === Q`；`allDone && !(p5.phase === "question" && p5.lockedSelection !== null)` → `"allCorrect"`；否則 `p5.phase === "summary"` → `"summary"`；否則 `"question"` |
| `normalizeOnly(p5, bankIds, set, only)` | `→ { part5, changed }` | **UO-4**：`only` 且 `phase = "question"` 且 `lockedSelection = null` 且 `isCorrectAt(currentIndex)` 且 K < Q → `j = nextUnanswered(currentIndex)`：`j ≥ 0` → `currentIndex = j`；`-1` → `phase = "summary"`（本輪計數不變）。其他情況 `changed: false` |
| `recordAnswer(ids, id, correct)` | `→ { ids, changed }` | **CR-2**：`correct === true`、`id` 為非空字串且不在 `ids` → `ids.concat([id])`；否則原陣列、`changed: false` |
| `next(p5, bankIds, set, only)` | `→ { part5, changed }` | 前提 `phase = "question"` 且 `lockedSelection !== null`，否則不變。`only` 為 false → v0.14 規則（`currentIndex ≥ Q − 1` → `{ lockedSelection: null, phase: "summary" }`，否則 `currentIndex + 1`）；`only` 為 true → **UO-5**：`j = nextUnanswered(currentIndex + 1)`，`j ≥ 0` → `{ currentIndex: j, lockedSelection: null }`，否則 `{ lockedSelection: null, phase: "summary" }` |
| `restart(p5, bankIds, set, only)` | `→ { part5, changed }` | **UO-6**：`roundAnswered = roundCorrect = 0`、`lockedSelection = null`、`phase = "question"`、`currentIndex = only ? max(nextUnanswered(0), 0) : 0`；累計不變；與原值逐欄相同時 `changed: false`（沿用 v0.14 不寫入的行為） |
| `setOnly(state, bankIds, on)` | `({ part5, ids, only }, …, boolean) → { part5, only, changed }` | **UO-1／UO-8**：`on` 非布林或與原值相同 → `changed: false`；false → true 時再套 `normalizeOnly`；true → false 時 `part5` 不變 |
| `replayKeepRecords(p5)` | `→ Part5Progress` | **UO-7 (a)**：`{ currentIndex: 0, lockedSelection: null, phase: "question", roundAnswered: 0, roundCorrect: 0, totalAnswered: 原值, totalCorrect: 原值 }`（呼叫端另設 `only = false`、`ids` 不變） |
| `clearAndRestart(p5)` | `→ { part5, ids: [] }` | **CR-6**：`part5` 同上；`ids = []`（呼叫端保留 `only`） |

**`EMT.core.layout`（FE-72）**：`part5Progress(kind, number, total)` 增加 `kind === "allCorrect"` → `{ visible: true, now: max, max, percent: 100 }`（同 `"summary"`，MT-1 v0.15）；其他行為與 `LAYOUT_TEXTS` 不變。

**`EMT.core.constants`（FE-73）**：`CURRENT_SCHEMA_VERSION = 3`、`SUPPORTED_SCHEMA_VERSIONS = [1, 2, 3]`、`LEARNING_PROGRESS_FIELDS` 末尾加 `"part5CorrectIds"`（7 項，順序同契約）；新增 `PART5_RECORD_TEXTS`（深凍結，鍵與值與 data-schema §15 **逐字、逐鍵順序**相同，`clearConfirmMustInclude` 為 2 元素陣列）。`STORAGE_KEYS`、`BACKUP_FORMAT_ID` 不變（`FROZEN_IDENTIFIERS`）。

**`EMT.core.persist`（FE-73）**

| 成員 | 變更 | 說明 |
| :--- | :--- | :--- |
| `DATA_KEYS` | 改 | 12 欄（原 9 欄 + `flashcardPosition`、`part5CorrectIds`、`part5UnansweredOnly`，順序同契約）。新增 `REQUIRED_DATA_KEYS`（9 欄）、`V2_DATA_KEYS`（9 欄，遷移測試用）、`TRACK_KEYS`（3 欄）；`V1_DATA_KEYS` 不變 |
| `trackDefaults()` | 新 | 每次回傳新物件 `{ flashcardPosition: null, part5CorrectIds: [], part5UnansweredOnly: false }`（§5.2） |
| `MIGRATIONS[2]` | 新 | **MG-5、MG-6**：`data` 非純物件 → 丟出（呼叫端判 unreadable／format）；`clone(data)` 後 3 欄**一律覆寫**為 `trackDefaults()` |
| `isTrackShape(name, v)` | 新 | 3 欄的 shape：`flashcardPosition` → `position.isShape`；`part5CorrectIds` → `Array.isArray`；`part5UnansweredOnly` → `typeof === "boolean"` |
| `resetTrackFields(data)` | 新 | **RD-3**：回傳 `{ data, fieldsReset }`；(a) 缺鍵 → 預設值（**不**列入 `fieldsReset`）；(b) shape 不符 → 預設值並列入 `fieldsReset`；(c)(d) 再呼叫 `normalizeTrackItems` |
| `normalizeTrackItems(data)` | 新 | 缺鍵補預設；`part5CorrectIds = part5flow.normalizeIds(...)`；`flashcardPosition = position.normalize(...)`；開關原值。RD-3 與 IM-10 (1)～(3) 共用 |
| `validatePersistedData(data, opts)` | 改 | `checkShape` 改為「必填 9 欄、允許 12 欄」；3 欄**存在時**檢查 shape（不符 → 錯誤，匯入即 IM-9 `format`）；`opts.written` 為 true 時另要求 3 欄存在、`flashcardPosition` 符合 `FlashcardPositionNormalized`（`wordKey` 非空且 = C-2 結果）、`part5CorrectIds` 為不重複非空白字串（`Part5CorrectIdsNormalized`） |
| `validateStorageRecord` | 改 | `schemaVersion` 須為 3 |
| `defaultData()` | 改 | 12 欄 |
| `parseStored(raw)` | 改 | `migrate` 之後**不論是否遷移**一律 `resetLearningFields`（RD-1）→ `resetTrackFields`（RD-3）→ `validateStorageRecord`；`migrated` = 原版本 < 3；`fieldsReset` 合併兩者 |
| `normalizeAfterLoad(data, part5Length, today, part5Ids?)` | 改 | 第 4 參數**選填**：先 `normalizeTrackItems`，V-ST-02、V-ST-05、V-ST-09～11 不變，最後 `Array.isArray(part5Ids)` 時執行 `part5flow.normalizeOnly`（UO-4，只改回傳的新物件）；未傳時不做 UO-4（舊呼叫端相容） |
| `ensureWritable(data)` | 新 | 回傳補齊 3 欄並 `normalizeTrackItems` 後的新物件；store `writeData` 與 `backup.buildBackup` 寫出前呼叫，保證 `PersistedDataWritten` |

**`EMT.core.backup`（FE-73）**：`importSteps(text, ctx)` 的 `ctx` 新增選填 `part5Ids`（`part5flow.bankIdsOf` 結果）。步驟 4：`v < 3` 時以 `persist.migrate` 串接（1 → 2 → 3、2 → 3，MG-8）；步驟 5：IM-8 兩欄檢查不變，新 3 欄由 `validatePersistedData` 的「存在時 shape」判定（IM-9）；步驟 7：既有清理之後依序 `normalizeTrackItems`（IM-10 (1)～(3)）→ `normalizeAfterLoad(data, ctx.part5Length, ctx.today, ctx.part5Ids)`（含 V-ST-05 之後的 UO-4，IM-10 (4)）→ 防禦驗證；`skipped` 計算不變（IM-10 (5)）。`buildBackup` 以 `persist.ensureWritable` 後的 12 欄匯出、`schemaVersion` 3。

**`EMT.core.reinit`（FE-73）**：`buildReinitData` 在覆寫 `LEARNING_PROGRESS_FIELDS`（7 欄）之後另設 `out.flashcardPosition = null`（CI-4 例外、FP-4）；`part5UnansweredOnly` 隨「淺複製全部鍵」保留。`needsConfirm`／`recordFlags` 不變（3 個新欄不列入 CI-2）。

**Store API（`state/store.js`，FE-74）——新增 action**

| action | 簽章 | 說明 |
| :--- | :--- | :--- |
| `setPart5UnansweredOnly(on)` | `(boolean) → { changed }` | UO-1：非布林、題庫為空、與原值相同 → `{ changed: false }`、不寫入；否則 `part5flow.setOnly` → `commitWrite`（開關與 UO-4 結果同一次 `setItem`），tags `["part5"]` |
| `replayPart5KeepRecords()` | `() → { ok }` | 只在 `viewKind === "allCorrect"` 時有效（否則 `{ ok: false }`、不寫入）：`part5 = replayKeepRecords(p5)`、`part5UnansweredOnly = false`、答對紀錄不變 → `commitWrite`，tags `["part5"]` |
| `clearPart5CorrectIds()` | `() → { ok }` | 只在 `viewKind === "allCorrect"` 時有效：`clearAndRestart` → `part5CorrectIds = []`、開關不變 → `commitWrite`，tags `["part5", "stats"]`。**確認對話框由 view 顯示**；按「取消」時 view 不呼叫本 action（`setItem` 0 次，CR-6） |

**Store API——修改的 action 與內部函式**

| 項目 | 變更 |
| :--- | :--- |
| `commitWrite(data, runtime, tags, opts?)`（內部，新） | 取代既有 `commit(…, true)` 與 `commitLearning`（§7.21.5）；`opts.bypassFirstRun` 供 `startLearning` 使用 |
| `placeCard(runtime, data, newSet)`（內部，新） | `r = position.resolve(data.flashcardPosition, newSet)`；新 `flashcard.index = r.index`；若新目前卡片的 `wordKey` 與舊目前卡片相同 → 保留 `isFlipped`、`mode`、`quiz`（同 v0.14 `keepCurrentCard`），否則依 `cardChanged`；回傳 `{ runtime, flashcardPosition: r.position }`，呼叫端把 `r.position` 放進 **同一次寫入**的 `data`（RD-4：啟動時不寫） |
| `init()` | `normalizeAfterLoad(data, Q, today, bankIds)`（UO-4）→ `initialRuntime` 內以 `placeCard` 取代 `index: 0`，`data.flashcardPosition` 更新為解析結果（只改記憶體）；遷移寫回（MG-7）沿用既有 `parsed.migrated` 分支 |
| `gotoCard(i)` | **FP-3**：`index` 實際改變時 `data.flashcardPosition = position.fromIndex(set, i)` → `commitWrite`（同一事件、一次 `setItem`）；`index` 不變、超出範圍 → 不寫入 |
| `applyGoal()`／`appliedGoalState()` | **FP-4**：`effectiveColor` 改變 → 重建單字集、`index = 0`、`flashcardPosition = null`；**未改變** → `studySet`、`flashcard`、`speech`、`flashcardPosition` 全部不變（FB-54）。`goal` 本身未改變時仍不寫入（v0.14 行為） |
| `startLearning()` | 寫入的 `data.flashcardPosition = null`（FP-4 末句）；`commitWrite(…, { bypassFirstRun: true })` |
| `confirmApplyGoal()` | `buildReinitData` 已設 `null`（FE-73）；寫入失敗行為不變（CI-7） |
| `addCustomWord`、`injectTemplate`、`deleteCustomWord` | 單字集重建一律 `placeCard`（**FP-5**），解析後的位置與 `customVocab` 同一次寫入；`deleteCustomWord` 不再呼叫 `custom.indexAfterDelete`；新增與注入的容量不足回滾（AC-18-04）一併丟棄位置（因為整個新 `data` 被丟棄） |
| `answerPart5(i)` | 新增前提：`viewKind !== "allCorrect"`；**CR-2**：`part5CorrectIds = recordAnswer(ids, bankIds[idx], correct).ids`，與計數、打卡同一次 `commitWrite` |
| `nextPart5()`、`restartPart5()` | 改用 `part5flow.next`／`restart`（UO-5、UO-6）；`changed` 為 false 時不寫入 |
| `importBackup(text, confirmFn)` | `ctx.part5Ids = bankIds`；步驟 9 以 `placeCard`（mode 一律 `"card"`、正面）取代 `index: 0`（**FP-6**）；解析結果只改記憶體（步驟 8 已寫入備份值，下次寫入再寫出解析結果，RD-4） |
| `writeData(data, bypass)` | 寫出前 `persist.ensureWritable` + 既有學習紀錄正規化 |

**`views/part5.js`（FE-75）**：`buildViewModel(progress, bank, consts, record?)` 新增第 4 參數 `record = { ids, only }`（缺省視為 `{ ids: [], only: false }`，既有呼叫與測試相容）；回傳增加 `kind: "allCorrect"`，以及每種 kind 共通的 `k`、`q`、`only`；`"question"` 另有 `correctBadge: boolean`；`"allCorrect"` 另有 `inSummary`、`roundCorrect`、`roundAnswered`。畫面結構、文字、事件見 §7.21.4。新增匯出 `RECORD_TEXT`（SD 定稿文字，供測試）。

---

## 5. 建置與打包流程

指令（`package.json` scripts）：

| 指令 | 內容 |
| :--- | :--- |
| `npm run build` | `node tools/build.mjs`（預設輸出 `dist/english-master-track.html`） |
| `node tools/build.mjs --out <path> [--data <dir>]` | 任務驗證用：輸出到 scratchpad；`--data` 指向 fixture 資料目錄（內容尚未完成時） |
| `npm test` | `node --test src/app/__tests__/*.test.js`（v0.2：Node 21 起 `node --test` 的參數視為檔案或 glob，傳目錄會失敗；glob 由 Node 自行展開，Windows `cmd.exe` 不展開萬用字元也能執行） |
| `npm run validate:data` | `node src/data/_tools/validate.mjs --all --stage final` |
| （v0.7）`npm run build` | 產出 `dist/english-master-track.html` **與**部署目錄 `dist/site/`（§5.1） |
| （v0.7）`node tools/build.mjs --out <path> [--site <dir> ｜ --no-site] [--ads <file>]` | `--site` 預設為 `<--out 所在目錄>/site`（預設 `--out` 時即 `dist/site`，任務以 `--out` 指到 scratchpad 時部署目錄也自動落在 scratchpad）；`--no-site` 只輸出 HTML（HTML 位元組與完整建置相同）；`--ads` 預設 `sources/deploy/ads.txt` |
| （v0.7）`npm run serve` | `node tools/serve.mjs`：V-PWA (b) 本機伺服器，預設 `http://localhost:8080/english-master-track/` 提供 `dist/site/`（§10.4） |

Node 版本：`package.json` 的 `engines.node` 訂為 **`>=22`**（v0.2，原 `>=18`）。理由：`node --test` 自行展開 glob 需 Node 21 以上；Node 18、20 在 Windows 會把 `*.test.js` 當字面檔名而失敗；21 為非 LTS 且已停止維護，故以 LTS 22 為下限。本機 v24.15.0 符合。`package.json` 屬 FE-01 的 paths，調整由 §12.1 的 FE-01 補修處理。

**HTML 開頭順序（v0.2，B-1、B-7 據此檢查）**：HTML 規範要求字元編碼宣告完整出現在檔案前 1,024 bytes；授權標頭約 1.5 KB，若放在 `<meta charset>` 之前，Firefox 以 `file://` 開啟時可能亂碼或重新解析。模板開頭固定為：

```
<!DOCTYPE html>
<html lang="zh-Hant-TW">
<head>
<meta charset="utf-8">
<!-- @@LICENSE@@ -->
<meta name="viewport" …>
…
```

授權註解仍位於原始碼第 5 行起的開頭註解區，符合 AC-23-06。`<meta charset>` 之前只允許上述 3 個 ASCII 標籤與空白；不採「`<meta>` 放在 `<html>` 之前」的寫法（會使後面的 `<html>` 成為解析錯誤）。

`tools/build.mjs` 步驟：

| 步驟 | 動作 | 失敗條件 |
| :--- | :--- | :--- |
| B-1 | 讀 `src/app/index.html`，必須含 4 個標記各恰好 1 次：`<!-- @@LICENSE@@ -->`（v0.2：模板開頭須符合 `/^\s*<!DOCTYPE html>\s*<html\b[^>]*>\s*<head>\s*<meta charset="utf-8">\s*/i`，且 LICENSE 標記緊接在此比對結果之後，中間只能有空白）、`/* @@STYLES@@ */`（在 `<style>` 內）、`<!-- @@DATA@@ -->`、`<!-- @@APP@@ -->`（`</body>` 前，DATA 在 APP 之前） | 缺標記或位置不符 → 中止（`MARKER_POSITION`） |
| B-2 | 資料：列出 `--data` 目錄（預設 `src/data/`）下不以 `_` 開頭的 `*.js`；順序 `sources.js` → `vocab-*.js`（檔名序）→ `templates.js` → `part5.js` → `decoder.js` → `phrasebank.js` → 其他（警告）。每檔以 `node:vm` 在 `{ window: {} }` 沙箱執行（驗證 C-4 可執行）；**以 `JSON.stringify` 重新輸出為壓縮字面值**：`window.X=<json>;`。所有 vocab 檔的結果合併、依 `rank` 排序後輸出為**單一** `window.MASTER_VOCAB_DATABASE=[…];`（與 concat 結果等價，契約 §3.1） | 檔案執行失敗 → 中止；資料檔不存在 → 只警告（前端依 C-6 容錯） |
| B-3 | 內嵌安全：資料 JSON 中的 `</` 換成 `<\/`、`<!--` 換成 `<\!--`；程式碼若含 `</script` 字樣 → 中止 | `</script` 出現在程式碼 |
| B-4 | 程式：依 §4.1 串接順序收集 `src/app/{core,state,services,ui,views}/**/*.js` 與 `main.js`（排除 `__tests__`），以一個 `<script>` 內嵌 | — |
| B-5 | 樣式：`src/app/styles/*.css` 依檔名序串接，替換 `/* @@STYLES@@ */` | 含 `@import` 或 `url(http` → 中止 |
| B-6 | 授權標頭：讀 `src/app/license-header.txt`，`{{YEAR}}` 換成 `PROJECT_LICENSE.copyrightYear`（缺資料時用當年並警告），包成 `<!-- … -->` 替換 `<!-- @@LICENSE@@ -->`；內容中的 `--` 須避免（模板撰寫時不用連續兩個減號） | — |
| B-7 | 檢查產物：（v0.2）`<meta charset="utf-8">` 的結束位置以 UTF-8 bytes 計 ≤ 1,024，且其前無非 ASCII 字元（超過中止）；大小 ≤ 5,242,880 bytes（AC-19-04，超過中止）；> 4,718,592 bytes（4.5 MiB）警告；不得出現 `<script[^>]*\ssrc=`、`<link[^>]*\shref=`、`@import`、`url\(\s*['"]?https?:`、`<img`、`<iframe`、`cdn.`、`fonts.googleapis`、`cdn.tailwindcss.com`（AC-19-01）。（v0.5，FE-41）`FORBIDDEN_PATTERNS` 新增 `{ name: "MediaRecorder", re: /MediaRecorder/ }`（AC-21-03、NFR-3：產物中錄音 API 出現數 = 0，含註解） | 任一命中 → 中止 |
| B-8 | 輸出報告：總 bytes、各區段 bytes（標頭／CSS／各資料全域變數／程式）、字庫平均每筆 bytes | — |
| B-9（備用） | 第 2 層壓縮：只在 B-7 警告時由 FE-18 啟用。把 `MASTER_VOCAB_DATABASE` 改輸出為「欄位名陣列 + 值陣列」並附 10 行以內的還原函式，於其他資料與程式之前還原為契約形狀的 `BuiltinVocabItem[]`（執行期介面不變，契約不需修改） | — |

`index.html` 在開發時不可直接開啟（無資料、無程式）；一律以 `--out` 建到 scratchpad 後開啟。

### 5.1 v0.7 PWA 建置（FE-47；契約 DP、MF、HD、SW-2、SW-3、V-PWA-01～06、DS-11～DS-14）

**執行順序**：B-1 → B-2 → B-3 → B-4 → B-5 → B-6 → **B-10 → B-11 → B-12 → B-13 → B-14 → B-15** → B-7（對**最終** HTML）→ **B-16** → B-8。所有檢查在記憶體完成後才寫任何檔案（中止時 `out` 與部署目錄都不寫、不刪）。

| 步驟 | 動作 | 失敗條件（`BuildError.code`） |
| :--- | :--- | :--- |
| B-10 PWA 模式 | 模板中 `@@BUILD_ID@@` 出現次數：恰 1 次且位於 `<meta name="emt-build-id" content="@@BUILD_ID@@">` → **PWA 模式**；0 次 → 非 PWA 模式（只供舊 fixture 測試），此時必須 `site === false`；其他情況中止 | 次數 > 1、位置不符、或 0 次但要求部署目錄 → `PWA_TEMPLATE` |
| B-11 PWA 輸入 | (1) 常數：以 `createRequire(import.meta.url)` 讀 `PROJECT_ROOT/src/app/core/pwa.js`（**固定**取專案檔，不隨 `--app` 改變）；(2) `sw` 範本 `<app>/pwa/sw.template.js`（去 BOM）；(3) 4 張圖示 `<app>/assets/icons/<檔名>`（檔名 = `PWA_DEPLOY_FILES` 中 PNG 的 `path` 去掉 `icons/`），以 `Buffer` 讀取；V-PWA-03：前 8 bytes 為 PNG 簽章、第一個區塊為 `IHDR`、寬 = 高 = `sizePx`、位元深度 8、色彩類型 2、全部區塊中無 `tRNS`；(4) DS-13：`<app>/styles/00-base.css` 第一個 `--bg:` 宣告值（`#RRGGBB`，不分大小寫）= `PWA_BACKGROUND_COLOR`；(5) `site !== false` 時 `--ads` 檔案必須存在（只檢查存在與可讀，內容原樣） | `PWA_SW_TEMPLATE`、`PWA_ICON`（訊息含檔名與不符項目）、`PWA_BG_COLOR`、`ADS_MISSING` |
| B-12 HTML head | 對 B-1～B-6 組好的 HTML（仍含佔位，稱 HTML₀）檢查 HD-1 靜態元素各**逐字**恰 1 次：`<meta name="theme-color" content="#2f6fd6">`（值取 `PWA_THEME_COLOR`）、`<meta name="apple-mobile-web-app-title" content="EnglishContext">`（取 `PWA_APP_NAME`）、`<meta name="apple-mobile-web-app-capable" content="yes">`、`<meta name="mobile-web-app-capable" content="yes">`、`<meta name="apple-mobile-web-app-status-bar-style" content="default">`、`<meta name="emt-build-id" content="@@BUILD_ID@@">`、`<link rel="icon" href="data:,">`；且皆位於 `</head>` 之前；`<title>English Master Track</title>` 恰 1 次 | `PWA_HEAD` |
| B-13 manifest | 位元組 = UTF-8（無 BOM）的 `JSON.stringify(PWA_MANIFEST, null, 2) + "\n"`；自我驗證 V-PWA-02（`JSON.parse` 後與常數深度相等、鍵恰 10 個、`icons[].src` 皆在 `PWA_DEPLOY_FILES`） | `PWA_MANIFEST` |
| B-14 BUILD_ID | `crypto.createHash("sha256")` 依序 `update` 7 筆紀錄，每筆 = UTF-8 `"<路徑>\n<位元組長度>\n"` + 內容位元組 + `"\n"`；順序與路徑：`index.html`（HTML₀ 的 UTF-8 位元組）→ `manifest.webmanifest` → `icons/icon-192.png` → `icons/icon-512.png` → `icons/icon-maskable-512.png` → `icons/apple-touch-icon-180.png` → `sw.js`（**注入前**範本位元組）。BUILD_ID = `digest("hex").slice(0, 16)`，須符合 `PWA_BUILD_ID_PATTERN`。`ads.txt` 不納入（SW-2） | — |
| B-15 注入 | (1) 最終 HTML = HTML₀ 中唯一的 `@@BUILD_ID@@` 換成 BUILD_ID；(2) `sw.js` = 範本中唯一的 `@@BUILD_ID@@` 換成 BUILD_ID、唯一的 `/* @@PRECACHE_URLS@@ */` 換成 `PWA_PRECACHE_URLS.map(JSON.stringify).join(", ")`；範本須逐字含 `var CACHE_PREFIX = "english-master-track-pwa-";` 恰 1 次（值 = `PWA_CACHE_PREFIX`）；(3) V-PWA-05 對注入後 `sw.js` 檢查：含 `var BUILD_ID = "<BUILD_ID>";`；不含 `importScripts`、`indexedDB`、`localStorage`、`sessionStorage`、`"push"`、`"sync"`、`periodicsync`、`notificationclick`、`backgroundfetch`、`BroadcastChannel`、`navigationPreload`、`caches.match(`、`http://`、`https://`、`@@`；所有 `addEventListener("<型別>"` 的型別 ⊆ {`install`, `activate`, `fetch`, `message`} 且 4 種各恰 1 次；不含 `self.on` 開頭的事件屬性指派 | `PWA_SW` |
| B-7（v0.7 修訂） | 對**最終** HTML 執行既有全部檢查，另加：(1) **逐字白名單** `ALLOWED_STATIC_TAGS = ['<link rel="icon" href="data:,">']`：PWA 模式下該字串必須恰 1 次，檢查 `FORBIDDEN_PATTERNS` 前**先把這一個字串從檢查用副本中移除**，`FORBIDDEN_PATTERNS` 本身（含 `<link href>`、`<script src>`）**一條都不放寬**；(2) `FORBIDDEN_PATTERNS` 新增 `{ name: "<link rel=PWA 附屬檔>", re: /<link\b[^>]*\brel=["']?(?:manifest\|apple-touch-icon\|apple-touch-startup-image\|preload\|prefetch\|modulepreload)\b/i }`（HD-3）；(3) 最終 HTML 不得再含 `@@BUILD_ID@@`；`emt-build-id` 的值符合 `PWA_BUILD_ID_PATTERN`。動態加入的連結與 SW 註冊都是 JS 字串（`createElement("link")`、`register("./sw.js", …)`），不含 `<link`／`<script src` 字面，不需任何放寬 | `EXTERNAL_RESOURCE`、`PWA_HEAD` |
| B-16 輸出 | (1) 寫 `out`（同既有）；(2) `site !== false` 時處理部署目錄：若已存在，遞迴列出內容——只允許 `PWA_DEPLOY_FILES` 的路徑與 `icons/` 目錄，有其他任何檔案或目錄 → **中止且不刪除**（防止 `--site` 誤指到專案目錄）；否則刪除整個目錄後重建，寫入 8 檔：`index.html`（= 最終 HTML，與 `out` 同一字串）、`manifest.webmanifest`、`sw.js`（UTF-8 無 BOM）、4 張 PNG 與 `ads.txt`（`Buffer` 原樣複製）；(3) 寫完回讀驗證 V-PWA-01（檔案集合恰 8 個、大小寫相同；`index.html` 與 `out` 位元組相同；`ads.txt`、PNG 與來源位元組相同） | `SITE_DIR_UNEXPECTED`、`PWA_SITE_VERIFY` |
| B-8（v0.7 增補） | 報告加：PWA 模式、BUILD_ID、部署目錄路徑與 8 檔各自 bytes | — |

**`build()` 回傳（v0.7）**：既有欄位外加 `buildId`（非 PWA 模式為 `null`）、`site`（`{ dir, files: [{ path, bytes: Buffer }] }`；`site === false` 時為 `null`）。`write: false` 時同樣完整計算並回傳、不寫檔（供 `build.test.js` 比對可重現）。

**命令列（`parseArgs`）**：既有 `--out`、`--data`、`--app` 不變；新增 `--site <dir>`、`--ads <file>`（帶值）、`--no-site`（不帶值）；`--site` 與 `--no-site` 同時出現 → `BAD_ARGS`。

**可重現性檢查（DS-11「現有建置有沒有寫入時間戳或亂數」）**

| 位置 | 檢查結果 | 處理 |
| :--- | :--- | :--- |
| `buildLicenseHeader(…, now = new Date())` | 只在 `PROJECT_LICENSE.copyrightYear` 缺漏時以當年代替（並警告）；正式資料 `sources.js` 有此欄 → 不受時間影響 | 維持；PWA 模式下若走到此分支，**升級為中止** `LICENSE_YEAR`（避免跨年 BUILD_ID 改變而不自知）；非 PWA fixture 維持警告 |
| 程式區段註解 `/* core/x.js */` | 相對 `--app` 的 `/` 分隔路徑，不含絕對路徑 | 不變 |
| 檔案列舉 | `readdirSync` 後以 `byName` 排序（不受語系、檔案系統順序影響） | 不變 |
| 資料輸出 | `JSON.stringify`（鍵順序依資料檔原始順序）；字庫依 `rank` 穩定排序 | 不變 |
| 報告 `log`（含絕對路徑、`toLocaleString`） | 只輸出到主控台，不寫入產物 | 不變 |
| `Math.random`、`Date.now`、`process.env`、`os.*` | `tools/build.mjs` 目前**未使用** | FE-47 以原始碼掃描測試鎖定：`build.mjs` 不得出現 `Math.random`、`Date.now`、`new Date(`（`buildLicenseHeader` 預設參數除外）、`process.env`、`performance.now` |
| 換行字元 | 建置原樣讀取原始檔；同一份 checkout 兩次建置相同（AC-36-01 (a) 成立）；但 Windows（`core.autocrlf`）與 CI（LF）的 checkout 位元組可能不同 → 兩地 BUILD_ID 不同 | 不影響 AC；見 T-46、SD-FB-37 |

**`tools/serve.mjs`（FE-47，V-PWA (b)）**

| 項目 | 約定 |
| :--- | :--- |
| 參數 | `--dir <dir>`（預設 `dist/site`）、`--port <n>`（預設 8080）、`--base <path>`（預設 `/english-master-track/`，模擬 GitHub Pages 專案子路徑；必須以 `/` 開頭結尾） |
| 監聽 | 只綁 `127.0.0.1`；只接受 `GET`、`HEAD`（其他 405） |
| 路由 | `<base>` → `index.html`；`<base>` 去尾斜線 → 301 到 `<base>`；`<base><path>` → `--dir` 下對應檔案（解析後必須仍在 `--dir` 內，否則 404）；`<base>` 以外（如 `/favicon.ico`）→ 404（讓 AC-37-05 的部署目錄外請求在 QA 記錄中可見） |
| 標頭 | `Content-Type`：`.html` `text/html; charset=utf-8`、`.webmanifest` `application/manifest+json`、`.js` `text/javascript; charset=utf-8`、`.png` `image/png`、`.txt` `text/plain; charset=utf-8`；`Cache-Control: max-age=600`（模擬 GitHub Pages，用來驗證 SW-4 `cache: "reload"` 與 SW-1 `updateViaCache: "none"`） |
| 檔案不存在 | 404（QA 刪除副本中的 manifest、`sw.js`、圖示驗 AC-37-03） |
| 每次請求 | 讀檔（不快取在記憶體），QA 換掉 `--dir` 內容即模擬重新部署 |

### 5.2 v0.7 部署 workflow（主控 MC-03；Q-46 授權修改一次；契約 DS-15、AC-36-07）

**相依套件確認**：`package.json` 沒有 `dependencies`／`devDependencies`，專案沒有 `package-lock.json`；`tools/build.mjs` 只用 Node 內建模組（`fs`、`path`、`vm`、`url`、`crypto`、`module`）。因此**不需要也不可執行 `npm ci`**（無 lockfile 時 `npm ci` 直接失敗）。日後 QA 若加入 Playwright 等 devDependencies，部署 workflow 仍不安裝（建置不需要）。

主控將 `.github/workflows/static.yml` **整檔取代**為：

```yaml
# 建置並部署 PWA 部署目錄 dist/site/ 到 GitHub Pages（architecture.md §5.2；Q-46 授權主控修改一次）
name: Deploy static content to Pages

on:
  # push 到 main 時自動部署
  push:
    branches: ["main"]

  # 可從 Actions 分頁手動執行
  workflow_dispatch:

# GITHUB_TOKEN 部署 GitHub Pages 所需權限
permissions:
  contents: read
  pages: write
  id-token: write

# 同時只跑一個部署；進行中的部署不取消
concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "22"
      # 零相依、無 package-lock.json：不執行 npm ci
      - name: Build
        run: npm run build
      - name: Verify deploy directory
        run: |
          set -eu
          test "$(find dist/site -type f | wc -l)" -eq 8
          cmp dist/site/index.html dist/english-master-track.html
          cmp dist/site/ads.txt sources/deploy/ads.txt
          for f in index.html manifest.webmanifest sw.js ads.txt icons/icon-192.png icons/icon-512.png icons/icon-maskable-512.png icons/apple-touch-icon-180.png; do
            test -f "dist/site/$f"
          done
      - name: Setup Pages
        uses: actions/configure-pages@v5
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          # 只上傳部署目錄（恰 8 檔），不含 docs/、src/、sources/
          path: dist/site
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v5
```

| 要點 | 說明 |
| :--- | :--- |
| 與舊版差異 | 新增 Setup Node.js、Build、Verify；刪除 Prepare site（`mkdir _site`、逐檔 `cp`）；上傳路徑 `_site` → `dist/site`。其餘（觸發、權限、concurrency、actions 版本）不變 |
| CI 建置的前提 | 下列檔案必須已提交到 git：`src/`（含 `src/data/` 全部資料檔與 `src/app/assets/icons/` 4 張 PNG）、`tools/build.mjs`、`package.json`、`sources/deploy/ads.txt`。`dist/` 是否提交不影響部署（CI 重新建置）；建議人類決定是否把 `dist/site/` 加入 `.gitignore`（SD-FB-36） |
| Node 版本 | `22`（= `engines.node` 下限，`node --test` glob 需要；建置本身 Node 18 起即可） |
| 失敗行為 | B-7、B-10～B-16 任一檢查失敗 → `npm run build` 結束碼 1 → 不上傳、不部署（舊版網站維持） |
| 驗證 | push 到 `main` 後由 QA／人類依 AC-36-07 檢查部署網址下 8 個檔案皆 200 且與 CI 產物相同（下載 Actions artifact 比對，或以 `curl` 取回後與本機 `--app` 相同來源的建置比對 BUILD_ID） |

### 5.3 v0.8 建置修改（FE-56；契約 NM-1、MF-4、V-PWA-04、VC-5、DS-20）

| 步驟 | 修改 | 不改 |
| :--- | :--- | :--- |
| B-12 | `<title>English Master Track</title>` 恰 1 次 → **`<title>${PWA_APP_NAME}</title>`（「EnglishContext」）恰 1 次**；`theme-color` 仍取 `PWA_THEME_COLOR`（值隨 FE-56 改為 `#1e9bf0`，程式不必改） | HD-1 其餘 6 個元素逐字不變 |
| B-11 (4) | 不改程式：仍比對 `00-base.css` 第一個 `--bg` = `PWA_BACKGROUND_COLOR`；兩者在 FE-56 同一任務內改為 `#eef4fa`（VC-5） | — |
| B-13 | 不改程式：manifest 由 `PWA_MANIFEST` 產生，`theme_color`、`background_color` 隨常數改變；鍵仍恰 10 個 | `name`／`short_name` 原本即為「EnglishContext」 |
| B-6 | 不改程式：授權標頭第一行由 `license-header.txt` 提供，改為「EnglishContext」（NM-4）；其餘聲明逐字不變 | — |
| B-7 | 不改：標題列圖示為**內嵌 `<svg>`**，不含 `<img`、`url(`、`http`（不寫 `xmlns`），不觸發 `FORBIDDEN_PATTERNS`；不放寬任何規則 | 白名單仍只有 `<link rel="icon" href="data:,">` |
| B-14 | 不改：`index.html`、CSS、程式、manifest 改變 → BUILD_ID 改變，已安裝的 v0.11 使用者會看到「有新版本」提示，屬預期（AC-36-03）；快取前綴 `english-master-track-pwa-` 不變，SW-9 照常刪除舊快取（NM-5、AC-36-05） | — |

`build.test.js` 同步：fixture 的 `<title>`、`theme-color`、`--bg` 字面值改為新值；新增「舊標題 `<title>English Master Track</title>` → `PWA_HEAD` 中止」案例；既有「把標題換成 EnglishContext 會中止」案例（第 764 行）改為「換成其他字串會中止」。

### 5.4 v0.9 網站版本號注入（FE-63；契約 §12.1 VR-1～VR-9、HD-1、HD-5、SW-2（v0.14）、V-VER-01、V-VER-02、DS-26）

**佔位字串（SD 定案，VR-2）**：`@@APP_VERSION@@`（`build.mjs` 常數 `APP_VERSION_PLACEHOLDER`）。模板寫法（`index.html`，緊接在 `emt-build-id` 之後）：

```html
<meta name="emt-build-id" content="@@BUILD_ID@@">
<meta name="emt-app-version" content="@@APP_VERSION@@">
<link rel="icon" href="data:,">
```

此佔位字串**只能**出現在 `index.html` 的這一個 meta 與 `tools/build.mjs`、`__tests__/`；`src/app` 其他檔案（含註解）與 `src/data/` 不得出現（B-17 (3) 會中止）。

**執行順序（v0.9）**：B-1 → B-2 → B-3 → B-4 → B-5 → B-6 →（組成 HTML₀）→ B-10 → **B-17 → B-18** → B-11 → B-12（對 HTML₀′）→ B-13 → B-14（對 HTML₀′）→ B-15 → B-7（對最終 HTML，含 **B-19**）→ B-16 → B-8。所有檢查在記憶體完成後才寫檔（中止時不寫、不刪任何檔案，沿用 §5.1）。

| 步驟 | 動作 | 失敗條件（`BuildError.code`） |
| :--- | :--- | :--- |
| B-17 版本佔位 | (1) 數 `index.html` 模板中 `@@APP_VERSION@@`：PWA 模式（B-10 成立）→ 必須恰 1 次且位於逐字 `<meta name="emt-app-version" content="@@APP_VERSION@@">`；非 PWA 模式（舊 fixture）→ 0 次則**整個版本步驟略過**（產物無版本 meta，頁面依 VR-8 不顯示版本行），1 次則同 PWA 模式處理。(2) 位置：該 meta 位於 `</head>` 之前。(3) 組合後的 HTML₀ 中恰 1 次（程式或資料含此字串 → 中止） | `APP_VERSION_TEMPLATE` |
| B-18 讀版本並寫入 | (1) 讀 `--package` 檔（預設 `PROJECT_ROOT/package.json`；`build({ packageFile })` 同義），`fs.readFileSync` + 去 BOM + `JSON.parse`；(2) 取 `version`：須為字串且 `version.isValidVersion(v)`（`APP_VERSION_PATTERN`，由 `createRequire` 讀**專案**的 `src/app/core/version.js`，常數 `APP_VERSION_CORE_FILE`，不隨 `--app` 改變）；(3) HTML₀′ = HTML₀ 中唯一的 `@@APP_VERSION@@` 換成 `v`（逐字，不 trim、不加 `v`）。**只讀** `version` 一欄，其他欄位（`scripts`、`devDependencies` 等）不影響產物（契約 FB-53）。**不得**使用 `process.env.npm_package_version`（`npm run` 以外的呼叫方式拿不到，且既有原始碼掃描禁止 `process.env`） | 檔案不存在、無法解析、`version` 缺漏或不符 → `APP_VERSION`（訊息含實際值與期望格式；VR-3） |
| B-12（v0.9 修訂） | HD-1 逐字清單加第 8 項 `<meta name="emt-app-version" content="${v}">`（PWA 模式且 B-17 未略過時），對 HTML₀′ 檢查恰 1 次、位於 `</head>` 前；其餘 7 項不變（`emt-build-id` 仍為佔位） | `PWA_HEAD` |
| B-14（v0.9 修訂） | `index.html` 紀錄的內容改為 **HTML₀′**（已含版本號、`emt-build-id` 仍為 `@@BUILD_ID@@`）的 UTF-8 位元組；其餘 6 筆與格式不變（SW-2 v0.14、VR-4） | — |
| B-15（v0.9 修訂） | 最終 HTML = HTML₀′ 中唯一的 `@@BUILD_ID@@` 換成 BUILD_ID；`sw.js` 不變 | — |
| B-19（併入 B-7） | 對最終 HTML：(1) `<meta name="emt-app-version" content="…">` 恰 1 個（B-17 略過時 0 個）且 `content === v`、符合 `APP_VERSION_PATTERN`；(2) 不含任何 `/@@[A-Za-z0-9_]+@@/`（涵蓋 `@@APP_VERSION@@`、`@@BUILD_ID@@` 與日後新佔位，V-VER-01）；(3) 既有 B-7 全部規則照舊 | `APP_VERSION`、`PWA_HEAD` |
| B-8（v0.9 增補） | 報告加一行「版本號：1.0.0」；`build()` 回傳加 `appVersion`（略過時 `null`） | — |

**命令列**：新增 `--package <file>`（帶值）；其他參數不變。

**為什麼兩次建置逐位元組相同（VR-4 (a)、V-VER-02 (a)）**：B-18 只讀檔案內容（無時間、亂數、環境變數、絕對路徑）；`version` 原樣寫入；HTML₀′ 由相同輸入決定 → BUILD_ID 相同 → 最終 HTML、`sw.js`、manifest 相同。§5.1「可重現性檢查」表全部照舊，FE-63 在 `build.test.js` 既有原始碼掃描加上 `npm_package_version` 禁止字。

**三種情境的預期（AC-42-04、V-VER-02）**

| 情境 | 只改了什麼 | `emt-app-version` | BUILD_ID／`sw.js` | 頁面版本行 |
| :--- | :--- | :--- | :--- | :--- |
| (a) | 不改任何檔案再建一次 | 相同 | 相同（逐位元組） | 相同 |
| (b) | `package.json` `version` `1.0.0` → `1.0.1` | `1.0.1` | 不同（HTML₀′ 不同）→ 已造訪的 https 版出現「有新版本，重新整理」（UP-1、UP-6） | 「版本 1.0.1（建置 <新 7 碼>）」 |
| (c) | `src/app` 或 `src/data` 中 1 個進入交付 HTML 的字元 | 不變 | 不同 | 版本號不變、建置碼改變 |

`build.test.js` 以 `build({ write: false, packageFile: <暫存 package.json> })` 在暫存目錄重現三種情境（不修改專案的 `package.json`）。

**CI**：`.github/workflows/static.yml` 不需修改——`npm run build` 預設讀專案根目錄 `package.json`（已提交 git）。版本號不符格式時建置失敗、不部署（舊版網站維持）。

### 5.5 v0.10 建置（不改建置程式；契約 DS-38、DS-39）

| 項目 | 決定 |
| :--- | :--- |
| 新模組打包 | `core/position.js`、`core/part5flow.js` 由既有「core 依檔名排序、`constants.js`／`wordkey.js` 最先」規則自動納入；兩者遵守 LD-1，`tools/build.mjs` 不需修改。`__tests__/_samples/` 屬 `__tests__/`，依 D-1 不打包 |
| 版本號 | 主控 MC-04 把 `package.json` `version` 改為 `1.1.0` 後，FE-76 執行 `npm run build`：產物 `<meta name="emt-app-version" content="1.1.0">`、版本行「版本 1.1.0（建置 xxxxxxx）」；因 HTML 與版本號皆改變，BUILD_ID 必然不同，已安裝 PWA 的使用者會看到「有新版本，重新整理」（AC-36-03，預期行為） |
| 順序限制 | MC-04 必須在 FE-76 之前完成；FE-70 必須在任何修改 `core/persist.js`、`core/backup.js`、`state/store.js` 的任務之前完成，且 FE-76 覆寫 `dist/` 之前（FE-70 以 v0.14 的 `dist/english-master-track.html` 產生樣本，§7.21.1） |
| 資料驗證 | FE-76 的 `npm run validate:data` 會執行 CT-25 新增的 V-P5-08 快照比對；本版 `part5.js` 未改，預期 0 錯誤、0 警告 |

### 5.6 v0.11 建置（不改建置程式；契約 DS-40、FB-61、FB-62）

| 項目 | 決定 |
| :--- | :--- |
| 建置程式 | `tools/build.mjs` **不改**。防爬蟲與舊文字的靜態檢查放在單元測試 `__tests__/contact-static.test.js`（以 `build({ write: false })` 對專案實際原始碼建置後掃描產物字串，§10.8），不加入 build 中止規則——避免把個人資料規則寫死在通用建置腳本，也不需改 `build.test.js` |
| 版本號 | `package.json` 維持 `1.1.0`（PRD R-24，不升版）；任何任務不得修改 |
| BUILD_ID | HTML 內容改變（提示文字、聯絡行、CSS）→ BUILD_ID、`sw.js` 快取名稱、建置碼必然改變；已造訪 1.1.0（舊 BUILD_ID）https 版的使用者會看到舊版程式內的「有新版本，重新整理」提示（E-120，預期），更新後新頁面使用新文字 |
| 取代手改產物 | FE-77 最後執行 `npm run build`，覆寫 `dist/english-master-track.html` 與 `dist/site/` 8 檔；交付以建置產物為準（FB-61）。完成後 `dist/english-master-track.html` 與 `dist/site/index.html` 逐位元組相同（修正 QA BUG-004 指出的「交付檔被手改、與部署版不同、換行改為 LF」） |
| 可重現 | 連續兩次 `npm run build`，`dist/english-master-track.html`、`dist/site/index.html`、`manifest.webmanifest`、`sw.js` 的 SHA-256 皆相同（AC-36-01 (a)、AC-42-04 (a)） |

---

## 6. 檔案大小估算（回應 FB-17、R-02、AC-19-04）

以 `N_G` = 5,620、建置後**壓縮 JSON**（B-2）計算；中文 UTF-8 每字 3 bytes，IPA 符號多為 2 bytes。

| 項目 | 每筆估算（bytes） | 筆數 | 小計 |
| :--- | :--- | :--- | :--- |
| 字庫固定開銷（12 個鍵名、引號、逗號、括號、3 個來源標記值、`sources`） | 約 196 | 5,620 | 1.10 MB |
| 字庫可變內容：word 9、phonetic 16、pos 11、meaning 42、collocation 47、example 77 | 約 202 | 5,620 | 1.14 MB |
| academicContext：排名 ≤ 2,809（選填，估平均 50）／> 2,809（必填，估 112） | 50／112 | 2,809／2,811 | 0.45 MB |
| **字庫合計（預期）** | 平均約 483 | 5,620 | **約 2.7 MB** |
| Part 5（句子、選項、繁中解析） | 約 650 | 200 | 0.13 MB |
| 長難句（segments、翻譯）＋ 閱讀策略 | 約 1,500 | 50 | 0.08 MB |
| 句型庫 | 約 300 | 100 | 0.03 MB |
| 範本、sources.js（含 MIT 全文） | — | — | 0.02 MB |
| 程式（未壓縮）＋ CSS ＋ 授權標頭 | — | — | 約 0.18 MB |
| **總計（預期）** | | | **約 3.1 MB** |
| **總計（悲觀：字庫內容長 25%）** | | | **約 3.8 MB** |

結論：

| 項目 | 決定 |
| :--- | :--- |
| 是否需改契約精簡欄位名 | **不需要**。預期 3.1 MB、悲觀 3.8 MB，皆低於 5 MB；FB-17 結案，不提契約修訂 |
| 保險機制 | B-7 於 4.5 MiB 警告；觸發時 FE-18 啟用 B-9（欄位名只出現一次，可省約 0.9 MB），執行期介面不變 |
| 內容長度預算（給 CT） | 驗證器 H-7：分檔「壓縮後平均每筆 bytes」> 600 時警告、> 700 時錯誤；`meaning` 建議 ≤ 30 字（契約）、`collocation` ≤ 80 字元、`example` ≤ 160 字元、`academicContext` ≤ 200 字元 |
| 首次載入（AC-22-05） | 約 3 MB 的字面值解析在中階筆電約 0.1～0.3 秒；啟動只算一次排序與 `Map`，不渲染清單；預估遠低於 3 秒／6 秒 |

### 6.1 v0.4 增量估算（交付檔大小、localStorage 容量，回應契約 FB-32）

**交付檔**：v0.3 實測產物 3,047,158 bytes（QA TC-S09）。

| 新增項目 | 估算 |
| :--- | :--- |
| `core/learning.js`、`core/interaction.js`、`ui/motion.js`、`ui/bottom-nav.js`、`ui/import-flow.js`、`services/haptics.js` | 約 25 KB（含繁中註解，未壓縮） |
| 既有 store、persist、backup、router、views 的修改 | 約 25 KB |
| CSS（底部導覽、05-motion、卡片、環形圖、長條圖、答題動畫） | 約 10 KB |
| 6 個內嵌 SVG 導覽圖示（單一 `path`，各約 300 bytes） | 約 2 KB |
| **合計** | **約 62 KB → 產物約 3.11 MB**，低於 4.5 MiB 警告門檻，不需啟用 B-9 |

**localStorage**（Chrome 以 UTF-16 計，每字元 2 bytes；常見上限每來源 5 MB 字元或 10 MB bytes，以較嚴的 5 MB bytes 估）：

| 欄位 | 一般使用 | 極端情況 | 說明 |
| :--- | :--- | :--- | :--- |
| `todayLearned.wordKeys` | 15～50 字 × 約 12 字元 ≈ 0.6 KB | 單日學完 5,650 字：平均 wordKey 9 字元 + 引號與逗號 3 ≈ 68 K 字元 | 契約 FB-32 估 70 KB，與本表一致 |
| `learnedHistory` | 30 筆 × `"2026-10-30":15,` 約 17 字元 ≈ 0.5 K 字元 | 同左（最多 30 筆，V-ST-10） | 固定上限 |
| 既有欄位（自訂字 30～200 筆、已掌握字、統計） | 約 10～40 K 字元 | 已掌握 5,650 字 ≈ 68 K 字元 + 自訂 1,000 筆 × 250 ≈ 250 K 字元 | — |
| **整筆 `StorageRecord`** | **約 50 K 字元（≈ 100 KB）** | **約 400 K 字元（≈ 0.8 MB）** | 遠低於 5 MB；`unreadable` 鍵最壞再複製一份仍低於 2 MB |

**寫入頻率與效能**：每次學習事件（翻到背面、四選一作答、STT 計分）各一次 `setItem`。極端情況序列化 400 K 字元的 `JSON.stringify` + `setItem` 在中階筆電約 2～5 ms、4 倍降速約 10～20 ms，仍在 AC-22-* 的 100 ms 內；一般情況 < 1 ms。**決定**：不做節流或延遲寫入（延遲寫入會讓「關閉分頁前最後一次學習」遺失，違反 AC-18-01、AC-30-11）。

### 6.2 v0.5 增量估算

| 項目 | 估算 |
| :--- | :--- |
| 新模組 `core/meter.js`、`core/reinit.js`、`services/mic.js` | 約 15 KB（含繁中註解） |
| store、speech-panel、customizer、router、dashboard 修改；收音條 CSS | 約 10 KB |
| 刪除 2 個導覽按鈕與 SVG | 約 −1 KB |
| **合計** | **約 +24 KB**；以 FE-33 產物為基準仍遠低於 4.5 MiB 警告門檻。`decoder.js`、`phrasebank.js` 資料與 view 照常打包，大小不變（PRD R-18 三 (b)） |

localStorage：v0.5 不新增欄位、不改結構（`schemaVersion` 2）；初始化只會讓資料變小。

### 6.3 v0.7 增量估算

| 項目 | 估算 |
| :--- | :--- |
| HTML 內新增：`core/pwa.js`（常數＋純函式）、`services/pwa.js`、`ui/pwa-notice.js`、dashboard／store／main／sources-page 修改、`80-pwa.css`、HD-1 靜態元素 7 個、授權標頭 1 行 | 約 +18 KB；以 FE-44 產物為基準仍遠低於 4.5 MiB 警告門檻（AC-19-04 不受影響） |
| `dist/site/` 其他檔案（不計入 AC-19-04） | `sw.js` 約 4 KB、`manifest.webmanifest` 約 0.5 KB、4 張 PNG 依主控產出（預估合計 0.1～0.5 MB）、`ads.txt` 58 bytes |
| Cache Storage（https 版，每個本專案快取） | HTML 以 `./`、`./index.html` 兩鍵各存一份（約 2 × 3.1 MB）＋ manifest ＋ 4 張 PNG ≈ 6.5～7 MB；更新等待期間最多 2 個快取（FB-39）≈ 14 MB。遠低於 Chrome 每來源配額（磁碟可用空間的比例，通常數 GB）；配額不足依 E-76、PE-3 靜默 |
| localStorage | 不變（PV-1） |

### 6.4 v0.8 增量估算

| 項目 | 估算 |
| :--- | :--- |
| 新增 `core/layout.js`（常數＋純函式＋註解） | 約 +6 KB |
| `00-base.css` token 與共用樣式、`10-dashboard.css`、`20-customizer.css`、`40-part5.css` 改寫 | 約 +4 KB |
| 標題列內嵌 SVG（1 個 `rect`、2～3 個 `path`，不用 data URI、不用 PNG） | < 1 KB（以 PNG data URI 內嵌 192px 圖示約需 20～40 KB，故不採用） |
| 主控台移除功能入口、學習統計、目前目標、2 個小環形圖的程式 | 約 −3 KB |
| **合計** | **約 +8 KB**；交付檔遠低於 4.5 MiB 警告門檻（AC-19-04 不受影響）。localStorage 不變（`backupExpanded` 不持久化） |

### 6.5 v0.9 增量估算

| 項目 | 估算 |
| :--- | :--- |
| `core/version.js`、`ui/version-line.js`（含註解） | 約 +3 KB |
| `emt-app-version` meta、版本行 CSS | < 0.2 KB |
| 狀態列、目標行、範本區、空狀態文字改寫 | 約 ±0 KB |
| **合計** | **約 +3 KB**；AC-19-04 不受影響。localStorage、備份檔、Cache Storage 中的使用者資料皆不變（版本號只存在 HTML，VR-6） |

### 6.6 v0.10 增量估算

| 項目 | 估算 |
| :--- | :--- |
| `core/position.js`、`core/part5flow.js`（含註解） | 約 +9 KB |
| `persist.js`、`backup.js`、`reinit.js`、`constants.js` 增修 | 約 +6 KB |
| `state/store.js` 增修 | 約 +6 KB |
| `views/part5.js`、`40-part5.css` 增修 | 約 +7 KB |
| **交付檔合計** | **約 +28 KB**；AC-19-04（≤ 5 MB）不受影響 |
| localStorage 主鍵 | `flashcardPosition` ≤ 約 80 bytes；`part5CorrectIds` 最多約 200 × 12 bytes ≈ 2.4 KB；開關 ≤ 30 bytes。主鍵總增量 < 3 KB（v0.4 §6.1 估算的主鍵上限仍成立） |
| 每次換卡寫入成本 | 一次 `JSON.stringify` 整筆 `StorageRecord`＋學習紀錄正規化；以 1,000 個自訂單字的狀態估算 < 5 ms（Node 量測列入 FE-74 doneWhen），遠低於 AC-44-02 的 100 ms |

---

## 7. 關鍵演算法

### 7.1 分數與試算（`core/goal.js`，FE-03 → FE-42；PRD 色級定義表、Q-12、Q-15、Q-25、Q-28、~~Q-32~~ R-19、Q-39）

| 函式 | 定義 | AC |
| :--- | :--- | :--- |
| `parseScoreInput(raw)` | 回傳 `{ ok: true, score }` 或 `{ ok: false, message }`（`message` 恆為 `SCORE_INVALID_MESSAGE`）。`raw` 為 `number` 時：有限數才接受；其餘轉字串後 trim。**（v0.2）字串只接受十進位寫法 `/^[0-9]+(\.[0-9]+)?$/`**：空白、正負號、指數（`1e2`）、十六／八／二進位（`0x64`、`0o144`、`0b1`）、`Infinity`、全形數字、千分位逗號一律無效；通過後 `Number(text)`，原值 < 10 或 > 990 → 無效；否則 `normalizeScore`（小數可接受，例：`722.5` → 725） | AC-02-02、AC-02-09 |
| `SCORE_INVALID_MESSAGE` | 常數「請輸入 10～990 的分數」（AC-02-02 原文）；store 的 `setDraftScore` 以此填 `error` | AC-02-02 |
| `normalizeScore(x)` | `Math.round(x / 5) * 5`（723 → 725、722 → 720），結果夾在 10～990 | AC-02-09 |
| `colorOf(S)` | `COLOR_LEVELS` 中 `scoreMin ≤ S ≤ scoreMax` 的 `id` | AC-02-04 |
| `effectiveColorOf(c)` | `blue`／`gold` → `green`，其他同 `c` | AC-01-07、V-ST-02 |
| `dailyNewWords(S)` | `COLOR_LEVELS[colorOf(S)].dailyNewWords`（10、10、15、20、20） | AC-02-03 |
| `targetVocab(S, nB, nG)` | 橘 `N_O`、棕 `nB`、綠 `nG`；藍金 `null`（畫面「待定」）。（v0.3）`nB`、`nG` 不是**大於 0 的有限數**（含 `0`、負數、`NaN`、`null`）時視為資料缺漏 → 回 `null` | AC-02-05、AC-02-10 |
| `estimate(S, c, nB, nG)` | `T = targetVocab ?? nG`、`W = dailyNewWords(S)`；`weeks = max(0, ⌈(T − c) ÷ (W × 7)⌉)`；`achieved = (開放色級 且 c ≥ T)`；`basedOnGreen = 藍金`。回傳 `{ color, targetVocab, dailyNewWords, weeks, achieved, basedOnGreen }` | AC-02-05、AC-02-06、AC-02-10 |
| ~~`scoreAfterColorClick(S, colorId)`~~ | ~~`S` 在該色範圍內 → `S`；否則該色 `scoreMin`~~（Q-32，v0.6 廢止） | — |
| （v0.6）`scoreForCard(colorId)` | `levelOf(colorId)?.scoreMax`；未知色級 → `null`。即 橘 215、棕 465、綠 725、藍 855、金 990（契約 `COLOR_LEVELS[].scoreMax`，不另設常數，GS-2、DS-07） | AC-01-05、AC-01-07、AC-02-04、AC-26-02、AC-26-04 |
| （v0.6）`scoreAfterColorClick(S, colorId)` | **保留匯出名稱以相容既有呼叫端與測試替身**，語意改為 `scoreForCard(colorId) ?? S`（不再看 `S` 是否在範圍內；未知色級回原分數）。store 改呼叫 `scoreForCard` | 同上 |
| `levelOf(colorId)` | 回傳 `COLOR_LEVELS` 中 `id` 相符的 `ColorLevelDefinition`；找不到 → `null`（v0.2 補登，FE-03 已實作） | AC-02-03、AC-02-04 |
| `isOpenColor(colorId)` | `levelOf(colorId)?.status === "open"`；未知色級 → `false`（v0.2 補登） | AC-01-01、AC-02-10 |

v0.6 決議（R-19、Q-39、DS-07、DS-08）：(1) Q-32 的「範圍內不變／設為下限」邏輯全部移除，點卡片一律 `scoreMax`；(2) 預設分數只有一個來源 `constants.SCORE_DEFAULT`（725），`persist.defaultData()` 已引用它；程式中**不得**再出現寫死的 600（FE-42 以原始碼掃描 `src/app/{core,state,views,ui,services}` 確認：數字 600 只允許出現在與分數無關處，如 `interaction.js` 的 `ANSWER: 600` 上限常數）；(3) `parseScoreInput`、`normalizeScore`、`SCORE_INVALID_MESSAGE` 保留（暫停 AC 的程式），但畫面無呼叫路徑；資料層驗證仍由 `persist` 的 `isScore` 負責，不四捨五入（GS-5）；(4) `colorOf`、`estimate` 不變，任意合法既有分數（600、735）照常判定色級與試算（GS-1、AC-26-06）。

v0.3 決議（FE-09 #8，字量為 0）：在 `goal.js` **統一處理**，不由各 view 各自轉換。理由：(1) 字庫缺漏時（C-6）`prepareBuiltin` 回 `nB = nG = 0`，若 `estimate` 把 0 當有效字量，會得到「`c ≥ T` → 已達成」的錯誤結論，任何呼叫端（自訂器、主控台、日後新頁面）都會踩到；(2) 純函式內處理才能以單元測試鎖定。規則：`T` 取得方式不變，但 `nB`、`nG` ≤ 0 時視同 `null`（藍金的 `T = nG` 也套用）；`T` 為 `null` → `weeks = null`、`achieved = false`。橘色 `N_O` 為契約常數，不受影響。FE-09 view 現有的「0 轉 null」可保留（結果相同），不需修改。程式補修見 §12.2 R3-1。

v0.2 決議說明：`Number()` 會把 `1e2`、`0x64` 視為 100，使用者看到的輸入值與修正結果不一致，與 AC-02-02「非數字不接受」的意圖不符，故改為只接受十進位寫法。滑桿傳入的是 `number`，不受字串規則影響。FE-03 現行實作（`Number(text)` 直接判斷）需補修，見 §12.1。

### 7.2 單字集（`core/vocab.js`、`core/custom.js`，FE-04；V-ST-04、V-VOC-12）

| 函式 | 定義 | AC |
| :--- | :--- | :--- |
| `prepareBuiltin(raw)` | 非陣列 → `[]`；複製後依 `rank` 遞增排序；建 `Map<wordKey, item>`；`nB` = `sources` 含 NGSL 的筆數、`nG` = 筆數；與 `VOCAB_MANIFEST` 不符只 `console.warn` | AC-03-06、V-VOC-12 |
| `limitOf(effectiveColor, nB, nG)` | orange → 1,000（`N_O`）、brown → `nB`、green → `nG` | AC-03-01～AC-03-03 |
| `buildStudySet(builtinSorted, limit, customVocab)` | `builtinSorted.slice(0, limit)` 轉 `StudyCard` + `customVocab` 依 `createdAt` 遞增；自訂字的 wordKey 若已在**本次截取的**內建卡中則不重複放入（SD 對 V-ST-04 的解讀，見 §15 SD-FB-03）。O(N)，5,650 筆在 4 倍降速下約數毫秒 | AC-03-01～AC-03-04、AC-22-02 |
| `validateCustomFields(fields)` | 英文單字、中文釋義 trim 後非空；其餘選填存 `""` | AC-04-01、AC-04-03 |
| `isDuplicate(word, builtinMap, customVocab)` | wordKey 存在於**全部**內建字庫或自訂清單 → 重複 | AC-04-06 |
| `planTemplateInjection(template, builtinMap, customVocab)` | 依序挑出 wordKey 尚不存在者，回 `{ toAdd, skippedCount }` | AC-05-02、AC-05-04 |
| `indexAfterDelete(studySet, currentIndex, deletedWordKey)` | 刪除位置 `d`：`d < i` → `i − 1`；`d === i` → 若 `i` 是最後一張則 `i − 1` 否則 `i`；新集合為空 → 0（顯示空狀態） | AC-04-08 |

### 7.3 辨識吻合度（`core/similarity.js`，FE-05；規格書 2.3、2.4、Q-23）

| 函式 | 定義 | AC |
| :--- | :--- | :--- |
| `clean(s)` | `s.normalize("NFC").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "")`（去除標點與所有空白，保留含重音字母） | AC-08-03、AC-08-12 |
| `levenshtein(a, b)` | 兩列滾動陣列 DP，O(m·n) 時間、O(min(m,n)) 空間 | AC-08-04、AC-08-05 |
| `score(recognized, target)` | `a = clean(recognized)`、`b = clean(target)`；`a` 為空 → 回 `null`（呼叫端提示「未偵測到語音，請再試一次」）；否則 `round((1 − d ÷ max(|a|, |b|)) × 100)` | AC-08-03～AC-08-05、AC-08-10、AC-08-12 |
| `lightOf(score)` | ≥ 90 green；65～89 yellow；< 65 red | AC-08-06 |

驗算（一律寫成 `score(辨識結果, 目標)`）：`score("adress", "address")` → 86；`score("kitten", "sitting")` → 57；`score("complied with", "comply with")` → 75；`score("Comply with.", "comply with")` → 100；`score("Latency.", "latency")` → 100。

參數順序（v0.2 統一）：正式簽章為 `score(recognized, target)`（第 1 個是辨識結果、第 2 個是目標字，FE-05 實作即如此）。兩者清洗後皆非空時結果與順序無關（編輯距離與 `max` 皆對稱），故 tasks.json FE-05 doneWhen 的 `score('comply with', 'complied with')` 與上列寫法結果相同，視為等價、不另修改；唯一不對稱處是**辨識結果**清洗後為空 → `null`，目標為空而辨識非空 → 0。日後文件、測試與呼叫端一律採本節寫法。

### 7.4 打卡、正確率、四選一（FE-05）

| 函式 | 定義 | AC |
| :--- | :--- | :--- |
| `localDate(now)` | 裝置本地時區 `YYYY-MM-DD`（用 `getFullYear/getMonth/getDate`，不用 `toISOString`） | AC-17-02 |
| `touch(streak, today)` | 依 `StreakState` 註解：null → 1；同日不變；隔 1 天 +1；隔 ≥ 2 天 → 1；`today < last` 不變；`lastActiveDate = max(last, today)`。日差以 `Date.UTC(y, m−1, d)` 相減 ÷ 86,400,000 計算，避開日光節約時間 | AC-17-02、AC-17-05 |
| `displayDays(streak, today)` | `today ≥ last + 2` → 0；否則 `days`（FB-09） | AC-17-02 |
| `accuracyText(answered, correct)` | `answered === 0` → 「—」；否則 `Math.round(correct ÷ answered × 100) + "%"` | AC-17-04 |
| `buildQuiz(studySet, index, rand = Math.random)` | 正解 = 該卡 `meaning`（trim）；其他卡 `meaning` trim 後去重並排除正解，隨機取 3 個；不足 → `null`（insufficient）；Fisher–Yates 洗牌 4 個選項 | AC-09-02、AC-09-05～AC-09-07 |

異常輸入處理（v0.2 補充，FE-05 已依此實作）：

| 函式 | 情況 | 結果 |
| :--- | :--- | :--- |
| `touch`、`displayDays` | `lastActiveDate` 為 `null`、格式不符 `YYYY-MM-DD` 或日期不存在（如 `2026-02-30`） | 視同**未打卡**：`touch` → `{ days: 1, lastActiveDate: today }`；`displayDays` → 回傳 `days`（不合法時為 0） |
| `touch` | `today` 不合法 | 無法判斷，狀態不變（不合法的 `lastActiveDate` 回 `null`） |
| `touch`、`displayDays` | `days` 非有限數、負數或小數 | 先取 `max(0, floor(days))`（V-ST-07：永不為負） |
| `touch` | 同一天且 `days` 為 0（異常狀態） | 補成 1（今天確實有學習行為） |
| `buildQuiz` | `studySet` 非陣列或少於 4 張；`index` 非整數或超出範圍；該卡 `meaning` trim 後為空；相異誘答不足 3 個 | 回 `null`（呼叫端顯示「單字數不足 4 個，無法產生選項」） |

四選一在 5,620 字中抽誘答：不建全部相異釋義集合；以隨機索引抽樣、最多嘗試 50 次湊滿 3 個相異值，失敗時才線性掃描（單字集很小時）。效能判定（v0.2）：單次計時受 GC 與計時器解析度影響不穩定，改為**預熱 100 次後連續執行 1,000 次，以平均值 < 1 ms 判定**；p99 只記錄於測試輸出供參考，不作為通過條件。

### 7.5 持久化與匯入（FE-06、FE-07；契約 §5、§6）

| 項目 | 設計 |
| :--- | :--- |
| Schema 驗證 | 不引入 JSON Schema 套件；`core/persist.js` 手寫 `validateStorageRecord`、`validatePersistedData`，逐欄對照 `storage-schema.json`（型別、必填、`additionalProperties`、`enum`、`pattern`、整數範圍）並檢查 V-ST-03 |
| 遷移 | `MIGRATIONS = { /* v: fn(data) → data(v+1) */ }`；本版空表；`migrate(record)` 依序套用 |
| localStorage 轉接 | `probe()`：`try { localStorage.getItem(KEY) }` 拋例外 → `unavailable`；`write(record)`：`setItem` 一次；例外名稱 `QuotaExceededError`、`NS_ERROR_DOM_QUOTA_REACHED` 或 `code` 22／1014 → `quota` |
| 新增自訂字容量不足 | 先算新狀態 → 寫入失敗 → 丟棄新狀態（記憶體回滾）→「儲存空間不足」 |
| 範本注入容量不足（v0.3） | **不沿用**「一般寫入」做法，改為與新增自訂字相同：寫入失敗 → 丟棄新狀態（記憶體回滾）→ view 顯示「儲存空間不足」，回傳 `reason: "quota"`（§4.3）。理由：(1) 範本注入的本質是批次新增自訂單字，與 AC-18-04 的「新增自訂單字」同屬一類使用者動作，契約 README §5.3 的「新增自訂單字」SD 解讀為包含範本注入；(2) 若保留記憶體，畫面會同時出現「已注入 N 個單字」與「儲存空間不足」兩個互相矛盾的提示，且重新開啟後這些字消失，使用者無從得知哪些字沒存到；(3) 回滾後狀態與 localStorage 一致，使用者清出空間後再按一次即可完整注入（AC-05-04 保證不重複）。「一般寫入」（打卡、作答統計、翻卡等）維持保留記憶體 + banner 提示，因為回滾會使使用者剛完成的操作消失。程式補修見 §12.2 R3-2、R3-3 |
| 容量不足的分類總表（v0.3） | 回滾 + 「儲存空間不足」：`addCustomWord`、`injectTemplate`；不套用 + 「儲存空間不足，未匯入」：`importBackup`（AC-24-09）；其餘 action：保留記憶體、`writeStatus = "quota"`、banner 以 toast 提示「儲存空間不足」，下次寫入再試 |
| 匯入 | `core/backup.js` 實作步驟 1～5、7 的純函式；store 負責步驟 6（confirm）、8（一次 `setItem`，失敗不套用）、9（套用、重建單字集、提示「已匯入，略過 N 筆」） |
| 匯出 | `services/download.js`：`Blob` + `URL.createObjectURL` + `<a download>`；不產生網路請求（`blob:` 為本機 URL） |

### 7.6 其他

| 功能 | 設計 | AC |
| :--- | :--- | :--- |
| 句型搜尋 | 啟動時對每則預先算 `haystack = (template + "\n" + descriptionZh).toLowerCase()`；每次 `input` 事件同步過濾（**不做 debounce**），100 則線性比對 < 1 ms | AC-16-01 |
| 淡化修飾語 | 容器加 class `is-dimmed`；`.is-dimmed .seg--modifier { opacity: 0.3; filter: grayscale(1); }`；**不設 transition**（讓計算後樣式立即為 0.3，利於自動驗證） | AC-13-01～AC-13-03 |
| TTS | `speechSynthesis.cancel()` 後再 `speak()`；語音挑選：`lang` 為 `en-US`（不分大小寫、`_` 視同 `-`），優先 `localService === true`（R-10）；`getVoices()` 為空時等 `voiceschanged` 最多 1 秒；仍無 en-US → 「此裝置未安裝美式英語語音」 | AC-07-01～AC-07-05 |
| STT | `window.SpeechRecognition ‖ window.webkitSpeechRecognition`；`lang = "en-US"`、`interimResults = false`、`maxAlternatives = 1`；開始前 `navigator.onLine === false` → 「語音辨識需要網路連線」；`onerror` 依下方「STT 錯誤對照表」；使用者再按一次 → `stop()` 並標記手動停止（不提示）；`onend` 無結果且非手動 → 未偵測提示。~~不使用 `getUserMedia`／`MediaRecorder`~~ **（v0.5 修訂，PRD R-18 二）**：按麥克風時先經 `services/mic.js` 取得或重用麥克風音軌（`getUserMedia`，只接 `AnalyserNode` 讀音量），再啟動 `SpeechRecognition`；取得流程、錯誤處理與釋放時機見 §7.14。**仍禁止** `MediaRecorder` 與任何錄製、編碼、`Blob`／`URL.createObjectURL` 音訊輸出、網路傳送；`services/stt.js` 本身不改 | AC-08-01～AC-08-14、AC-21-03、AC-33-01～AC-33-08 |
| 資料來源頁列出辭典（v0.3） | 字表：依字庫實際出現的 `sources` 代碼列出（AC-23-02 末段「列出的字表數量與資料中出現的字表種類數一致」）。辭典（`DATA_SOURCE_REGISTRY` 中 `kind = "dictionary"`）：**只有當至少一筆內建單字的 `meaningSource` 等於該辭典代碼時才列出**；registry 有但無任何單字使用 → 不列出、`console.warn`。理由：AC-23-02 要求列出「本檔案實際使用的」外部資料，與字表的判定方式一致。字庫缺漏（C-6）時辭典與字表都不列出，頁面其餘聲明照常顯示。QA 判定：以正式資料建置後 ECDICT 必須列出（V-VOC-09 保證有 `meaningSource = "ECDICT"` 的單字） | AC-23-02 |
| 剪貼簿 | 只用 `navigator.clipboard.writeText`；不存在或 Promise 失敗 → 「複製失敗，請手動選取」並以 `Selection`／`Range` 反白該句（**不**退回 `execCommand`，以符合 AC-16-04 的判定） | AC-16-03、AC-16-04 |
| 效能 | 只渲染當前卡片／題目／句子；換頁只切換 `hidden` 並呼叫 `show()`；`subscribe` 依 tags 局部重繪；不渲染整份字庫清單 | AC-22-01～AC-22-04、R-03 |

**STT 錯誤對照表（v0.3 獨立成表，新增 `audio-capture`）**

| `SpeechRecognitionErrorEvent.error` | 主訊息 | 補充說明 | 類型 | AC |
| :--- | :--- | :--- | :--- | :--- |
| `not-allowed`、`service-not-allowed` | 「需要麥克風權限」 | 開啟方式（網址列左側圖示 → 將「麥克風」設為允許 → 再按一次麥克風按鈕） | error | AC-08-09 |
| ~~`audio-capture`（v0.3）~~ | ~~「需要麥克風權限」~~ | ~~「請確認裝置已連接麥克風」~~ | — | v0.5 廢止，見下列 |
| `audio-capture`（**v0.5 修訂**，契約 DS-03、PRD R-18 二 (d)：裝置沒有麥克風或無法擷取音訊） | 「找不到麥克風裝置」 | 「請確認裝置已連接麥克風後再按一次」 | error | AC-33-05、AC-33-06 |
| `network` | 「語音辨識需要網路連線」 | — | error | AC-08-14 |
| `no-speech` | 「未偵測到語音，請再試一次」 | — | info | AC-08-10 |
| `aborted` 且為手動停止 | 不提示 | — | — | AC-08-10 |
| 其他代碼（`aborted` 非手動、`language-not-supported`、`bad-grammar` 等） | 「語音辨識發生錯誤，請稍後再試一次」 | — | error | — |

說明（v0.5 修訂）：PRD R-18 二 (d) 把「無麥克風裝置」改為獨立訊息，`audio-capture` 因此改用與 `getUserMedia` 的 `NotFoundError` 相同的「找不到麥克風裝置」（取代 v0.3 與 SD-FB-09 的共用主訊息做法）；`getUserMedia` 錯誤對照見 §7.14「錯誤對照（DS-03）」。QA 判定：以假 `SpeechRecognition` 觸發各代碼，主訊息逐字相符，補充說明包含上表字串；任何代碼都不得拋出未處理例外，麥克風按鈕回到待機。

### 7.7 今日學習紀錄（`core/learning.js` FE-20、store FE-25；契約 §5.4 LR-1～LR-8、V-ST-09～V-ST-12、PRD US-30）

**函式表（全部純函式、不修改傳入值；日期一律 `YYYY-MM-DD` 本地日期字串）**

| 函式 | 定義 | AC／契約 |
| :--- | :--- | :--- |
| `isValidLocalDate(s)` | 字串符合 `^\d{4}-\d{2}-\d{2}$` 且 `new Date(y, m − 1, d)` 回推的年月日相同（`2026-02-30` → `false`） | V-ST-09、V-ST-10 |
| `addDays(ymd, n)` | 以 `Date.UTC(y, m − 1, d + n)` 計算後用 `getUTC*` 組回字串（**不以毫秒加減本地時間**，避開日光節約時間） | V-ST-10 |
| `compareDate(a, b)` | 字串比較（格式固定，字典序 = 日期序） | — |
| `emptyToday()` | `{ date: null, wordKeys: [] }` | 契約 §5.2 |
| `normalizeToday(t, today)` | V-ST-09：`t` 非物件 → `emptyToday()`；`date` 不合法或 ≠ `today` → `emptyToday()`；`date === today` → `wordKeys` 只留字串，各以 `wordKey()`（C-2）正規化，捨棄空字串，重複只留第一次 | AC-30-13、AC-24-11 |
| `normalizeHistory(h, today)` | V-ST-10：`h` 非純物件 → `{}`；只留鍵合法、`addDays(today, −29) ≤ 鍵 ≤ today`、值 `Number.isInteger(v) && v >= 0` 的項目 | AC-30-09、AC-30-13 |
| `syncHistory(t, h, today)` | V-ST-11：`t.date === today` → `h[today] = t.wordKeys.length`；`t.date === null` → 刪 `h[today]` | AC-30-09、AC-30-11 |
| `normalizeLearning(data, today) → { todayLearned, learnedHistory }` | 依序 `normalizeToday` → `normalizeHistory` → `syncHistory`；結果符合 `$defs/PersistedDataWritten` 的兩欄 | V-ST-09～V-ST-11 |
| `record(t, h, wordKey, today) → { changed, todayLearned, learnedHistory }` | LR-3 (1)～(5)：`t.date ≠ today` → 換日 `{ date: today, wordKeys: [] }`；`wordKey` 已在清單 → `changed: false`（回傳**換日後**的物件，換日本身不算 `changed`）；否則附加、`h[today] = 長度`、`normalizeHistory` 修剪；`wordKey` 先以 C-2 正規化，空字串 → `changed: false` | AC-30-03、AC-30-07、AC-30-09 |
| `todayCount(t, today)` | LR-6：`t && t.date === today ? t.wordKeys.length : 0` | AC-30-07、AC-30-11 |
| `dailyGoal(effectiveColor)` | `COLOR_LEVELS` 中該色的 `dailyNewWords`（橘 10、棕 10、綠 15）；未知色級 → 15（生效色級只會是橘棕綠，防禦用） | AC-30-02、R-14 |
| `chartSeries(h, x, today, days = DASHBOARD_CHART_DAYS)` | 由舊到新 `days` 筆 `{ date, label, count }`：`date = addDays(today, −(days − 1 − i))`、`label = "M/D"`（不補零，如 `10/30`）、`count = h[date] ?? 0`，**最後一筆（today）一律用 `x`** | AC-30-08、LR-6 |
| `masteryRate(studySet, masteredKeys)` | `denom = studySet.length`；`numer = studySet` 中 wordKey 屬於 `masteredKeys` 的張數；`percent = denom === 0 ? null : Math.round(numer ÷ denom × 100)` | AC-30-10、R-09 |
| `percentOf(correct, answered)` | `answered` 不是正整數 → `null`；否則 `Math.round(correct ÷ answered × 100)`，夾在 0～100 | AC-30-10、AC-17-04 |

**學習事件記錄點（store，FE-25）**

| `LearningEventKind` | 觸發的 action | 條件 | wordKey 來源 | 不記錄的情況 |
| :--- | :--- | :--- | :--- | :--- |
| `"flip"` | `flipCard()` | `mode === "card"` 且 `isFlipped` 由 `false` 變 `true` | `studySet[index].wordKey` | 翻回正面、`gotoCard`、滑動換卡（AC-30-04） |
| `"vocabQuiz"` | `answerVocabQuiz(i)` | `quiz.selectedIndex` 由 `null` 變非 `null` | `quiz.wordKey` | 已鎖定後再點（AC-29-02 同時不震動） |
| `"stt"` | `recordSttScored()` | speech-panel 顯示分數後呼叫 | `wordKey(lastResult.targetText)`，無則目前卡 | 逾時、空結果、權限、離線、錯誤（speech-panel 不呼叫） |
| —（不算） | `answerPart5`、`nextPart5`、`restartPart5` | — | — | 模擬測驗作答只打卡（AC-30-04、LR-1） |

store 內部流程（一個 action 一次寫入）：

```
action 開始
  ├─ 原有變更（isFlipped / quiz.selectedIndex / vocabQuiz / masteredWordKeys / streak）
  ├─ 若為學習事件：r = learning.record(data.todayLearned, data.learnedHistory, wordKey, store.today())
  │      r.changed 或 todayLearned 有換日 → 新 data 帶入 r.todayLearned、r.learnedHistory；tags += "learning"
  ├─ 首次模式（entryMode = firstRun）→ 只改記憶體（實際上首次畫面沒有學習頁面，LR-8 防禦）
  ├─ writeData(data) 一次 setItem
  └─ commit + notify(tags)
```

**LR-7 實作（學習紀錄寫入容量不足）**：凡 action 中「學習紀錄實際改變」者，寫入結果 `quota` 時：(1) 記憶體保留（X 照常增加）；(2) 本次寫入**不**經 `noteWrite` 發 `storage` tag（避免與下一點重複提示），`writeStatus` 仍更新為 `quota`；(3) `runtime.learningQuotaNoticeShown` 為 `false` 時設為 `true` 並發 `"learningQuota"` tag，banner 收到後 toast「儲存空間不足」一次。其他例外（`error`）同樣不回滾、不提示；`unavailable` 時只改記憶體（既有 `disabled` 路徑）。學習紀錄未改變的 action（例如同一字再翻一次）維持既有 `noteWrite` 行為。

**顯示的日期來源**：主控台每次繪製呼叫 `store.today()`，不需寫入即可反映跨午夜（AC-30-07 (b)、LR-6）；記憶體中舊日期的 `todayLearned` 等到下一次學習事件才換日寫入。

### 7.8 持久化 v1 → v2 遷移（`core/persist.js`、`core/backup.js`，FE-22；契約 §5.3 MG-1～MG-4、RD-1、RD-2、§6.2、§6.3、IM-8）

**localStorage 讀取（`persist.parseStored(raw)`；簽章不變，日期相關的正規化在 `normalizeAfterLoad`）**

```
raw === null ─────────────────────────────► { kind: "missing" }          （store 判 firstRun，§7.9）
JSON.parse 失敗 / 頂層非物件 ─────────────► { kind: "unreadable" }
schemaVersion 非整數或 ∉ [1, 2] ──────────► { kind: "unreadable" }
schemaVersion = 1：
   data 非純物件 ─────────────────────────► { kind: "unreadable" }        （MG-1）
   data.todayLearned = emptyToday()、data.learnedHistory = {}（一律覆寫，MG-2）、schemaVersion = 2
   → 完整 v2 驗證（根結構 + V-ST-03）
        通過 → { kind: "ok", data, migrated: true }                       （store 依 MG-3 寫回一次，失敗不提示）
        不通過 → { kind: "unreadable" }                                    （RS-1～RS-4）
schemaVersion = 2：
   data 非純物件 → { kind: "unreadable" }
   RD-1：todayLearned 缺少或 shape 不符 $defs/TodayLearnedState → 只把該欄設 emptyToday()
         learnedHistory 缺少或不是純物件                       → 只把該欄設 {}
         （記錄 fieldsReset: ["todayLearned"|"learnedHistory"]，不提示、不保存 unreadable）
   → 完整 v2 驗證 → 通過 { kind: "ok", data, migrated: false, fieldsReset } / 不通過 { kind: "unreadable" }
```

之後 store 呼叫 `normalizeAfterLoad(data, part5Length, today)`：既有的色級重算、V-ST-05 之外，再以 `learning.normalizeLearning(data, today)` 套 V-ST-09～V-ST-11。RD-1 重設或正規化的結果只在記憶體，等下一次寫入一併寫回（RD-2；實作**不**在啟動時額外寫回，以免首次判定外的啟動多一次寫入）。

**驗證規則（`validatePersistedData` v2）**：必填鍵由 7 個增為 9 個；`todayLearned` shape：純物件、恰有 `date`（字串或 `null`）、`wordKeys`（陣列）兩鍵；`learnedHistory` shape：純物件。shape 驗證（讀取、匯入步驟 5）與「寫出前」驗證（`$defs/PersistedDataWritten`：`date` 合法或 `null`、`wordKeys` 為已正規化不重複字串、歷史鍵值合法）分兩個函式：`validatePersistedData(data, { written: false })` 與 `{ written: true }`；`buildRecord` 前不需每次驗證寫出格式，但單元測試須斷言 store 寫出的每一筆都通過 `{ written: true }`。

**備份**

| 步驟 | v0.4 處理 | AC |
| :--- | :--- | :--- |
| 匯出 `buildBackup(data, contentDataVersion, now)` | `schemaVersion = 2`；`data` 先以 `localDate(now)` 套 `normalizeLearning` | AC-24-02 |
| 步驟 3 | `schemaVersion` ∉ `[1, 2]` → `version`，`supported` 顯示「1、2」（取自 `SUPPORTED_SCHEMA_VERSIONS.join("、")`） | AC-24-06 |
| 步驟 4 | `schemaVersion = 1`：`data` 非物件 → `format`；否則 MG-2 補兩欄（頂層 `schemaVersion` 原值保留給步驟 5，MG-4） | AC-24-10 |
| 步驟 5 | `schemaVersion = 2` 時兩欄缺少或 shape 不符 → `format`（IM-8 (1)，**整份不匯入**，與讀取 RD-1 不同） | AC-24-05、AC-24-11 |
| 步驟 7 | ctx 新增 `today`（匯入當天）；以 `normalizeLearning(data, today)` 處理項目層級無效值（IM-8 (2)），**不計入**「略過 N 筆」 | AC-24-11 |
| 寫入 localStorage | `StorageRecord.schemaVersion` 一律 2 | MG-4 |

### 7.9 首次進入流程與狀態機（store FE-30、router／main／customizer FE-32；契約 §5.5 FS-1～FS-7、PRD US-25、Q-34、Q-35）

**狀態機**（`entryMode` 只會 `firstRun → main`，不會反向；`main` 的判定只在啟動時做一次）

```
                      ┌──────────────── 啟動（store.init）────────────────┐
                      │ getItem 拋例外 → firstRun + storageStatus=unavailable │
                      │ getItem === null → firstRun                          │
                      │ 其他任何字串（含 "", 損壞, 版本不符）→ main          │
                      └───────────────┬───────────────────────┬──────────┘
                                      ▼                       ▼
┌──────────────────────── firstRun ────────────────────────┐   main（一般模式；損壞者依 AC-18-05
│ body[data-entry=firstRun]；currentTab ∈ {customizer, sources} │        重設並提示，AC-25-09）
│ 畫面：色級大卡片、試算、「開始學習」、「從備份還原」        │
│ 不顯示：導覽列、選單鈕、自訂單字、範本、狀態列、分數區（v0.6）│
│ 寫入：0 次（FS-2）                                          │
│                                                              │
│  [點卡片]──► 只改記憶體 draftScore = 該色 scoreMax（自環）   │
│  [頁尾「資料來源與授權」]──► currentTab=sources              │
│       └─[「返回難易度設定」]──► currentTab=customizer        │
│  [重新整理／關閉]──► 下次仍 firstRun，回預設 SCORE_DEFAULT   │
│                      （725）、綠（AC-25-04，v0.6）           │
│  [從備份還原] 取消／format／version／quota／write_failed      │
│       ──► 留在 firstRun，顯示對應訊息（取消不提示，AC-25-11） │
│  [開始學習] ──────────────┐   [從備份還原] 成功 ─────┐        │
└───────────────────────────┼──────────────────────────┼────────┘
                            ▼                          ▼
         startLearning：appliedScore=draftScore、    importBackup 步驟 8 寫入、
         一次 setItem（失敗仍進入，FS-4）             步驟 9 套用（FS-5）
                            └────────────┬─────────────┘
                                         ▼
                    entryMode=main、currentTab=dashboard、tag "entry"
                    router：body[data-entry=main]、go("dashboard")（換頁動畫照常）
```

| 情境 | 結果 | AC |
| :--- | :--- | :--- |
| localStorage 停用 | 每次啟動都是 `firstRun` 並顯示「進度將無法保存」；「開始學習」不寫入、直接進入；還原成功只套用記憶體並進入（契約 FB-31 (b)） | AC-25-08、AC-18-03 |
| 「開始學習」寫入容量不足 | 仍進入主控台並提示「儲存空間不足」；主鍵仍不存在，下次開啟仍是首次畫面（契約 FB-31 (a)） | FS-4 |
| 首次畫面上已點其他卡片再還原成功 | 以備份為準，`draftScore` 等全部取自備份（E-58）；選中卡片 = Color(備份 `draftScore`)，分數不轉換（GS-4，v0.6） | AC-25-10 |

**畫面實作（FE-32）**

| 部位 | 做法 |
| :--- | :--- |
| 導覽列、選單鈕 | `00-base.css`：`body[data-entry="boot"]` 與 `body[data-entry="firstRun"]` 下 `#app-nav`、`#nav-toggle` 為 `display: none`；`boot` 另隱藏 `#app-main`（JS 失敗時沒有可用功能，與現況相同） |
| 自訂單字與範本 | `body[data-entry="firstRun"] #customizer-custom { display: none; }`（custom-vocab 模組照常 mount，不需修改） |
| 難易度設定頁 | `customizer.js` 讀 `runtime.entryMode`：`firstRun` 時標題下加一段引導文字、生效按鈕區顯示「開始學習」（呼叫 `startLearning`）與「從備份還原」（呼叫 `EMT.ui.importFlow.start()`），隱藏「目前目標色級／目前生效色級」狀態列；收到 `"entry"` tag 時切回一般模式（「套用」、狀態列），**只重建按鈕區與狀態列**，不重建卡片與分數區。（v0.6）分數區在兩種模式都隱藏，見 §7.17 |
| 資料來源頁返回 | 頁尾 `#footer-first-run-back`：CSS `body[data-entry="firstRun"][data-tab="sources"] #footer-first-run-back { display: inline-flex }`，其他情況隱藏；點擊經既有 `[data-go]` 委派導向 `customizer` |
| 「全螢幕」 | 首次模式隱藏導覽列後，頁首（產品名稱）、警示列、難易度設定頁、頁尾即構成全畫面；不另做覆蓋層 |

### 7.10 手勢判斷（`core/interaction.js` FE-21、`views/flashcards.js` FE-28、測驗防誤觸 FE-29；PRD US-28、Q-33）

| 函式 | 定義 |
| :--- | :--- |
| `classifySwipe(dx, dy)` | `dx = 結束 x − 開始 x`、`dy` 同理。`Math.abs(dx) >= UI.SWIPE_MIN_PX`（50）**且** `Math.abs(dx) > Math.abs(dy)` → `dx < 0 ? "left" : "right"`；否則 `"none"`（含垂直為主、位移不足、`|dx| = |dy|`） |
| `isTap(dx, dy)` | `Math.hypot(dx, dy) < UI.TAP_SLOP_PX`（10） |
| `swipeTarget(index, n, dir)` | `"left"` → `index + 1`、`"right"` → `index − 1`；超出 `0～n − 1` 或 `dir = "none"` → `null`（AC-28-04、E-26） |

**單字卡（FE-28）事件流程**

```
touchstart（passive）：只記 1 指；記錄 startX/startY、moved=false
touchmove（passive）：任一軸位移 ≥ TAP_SLOP_PX → moved=true（不呼叫 preventDefault；垂直捲動交給瀏覽器）
touchend：
   mode !== "card" → 忽略（測驗模式不換題，AC-28-06）
   dir = classifySwipe(dx, dy)；target = swipeTarget(index, n, dir)
   target !== null → actions.gotoCard(target)（同步，AC-28-03 ≤ 100 ms）；新卡播放滑入動畫（§7.11）
   moved → suppressClickUntil = now + 350 ms（擋掉位移後瀏覽器補發的 click，避免誤翻面，AC-28-05）
click（卡片）：now < suppressClickUntil → 忽略；點在按鈕、語音面板內 → 不翻面（沿用 FE-11 onCardClick，AC-28-02）；否則 flipCard
```

| 項目 | 決定 | AC |
| :--- | :--- | :--- |
| 垂直捲動 | 卡片 CSS `touch-action: pan-y`：瀏覽器處理垂直捲動，水平位移交給 JS；不攔截 `touchmove` | AC-28-05 |
| 滑鼠拖曳 | 不支援（PRD 範圍外）；只綁 Touch Events，不綁 Pointer／Mouse 拖曳 | §2.2 範圍外 |
| 鍵盤與按鈕 | 「翻面」「上一張」「下一張」按鈕與 Tab／Enter／空白鍵行為不變 | AC-28-07 |
| 測驗模式防誤觸（FE-29） | 四選一與模擬測驗選項容器記錄觸控位移：`touchstart` 記起點，`touchmove` 位移 ≥ `TAP_SLOP_PX` → 標記本次觸控為滑動；隨後的 `click` 若屬於該次觸控（`now < suppressClickUntil`，350 ms）→ 忽略，不呼叫作答 action。滑鼠與鍵盤點擊不受影響。測驗模式下 flashcards 的 `touchend` 也不換題（上方流程第一行） | AC-28-06、E-42 |
| 純函式匯出 | flashcards 匯出 `swipeDecision(mode, index, n, dx, dy) → { action: "goto", index } ｜ { action: "none" }`；quiz／part5 匯出 `shouldIgnoreClick(touch, now)`，供 Node 測試 | — |

### 7.11 動畫與減少動態策略（FE-24 基礎；FE-28、FE-29、FE-31 各頁；PRD US-31、AC-28-01、AC-29-01、AC-31-01～AC-31-04）

| 原則 | 做法 |
| :--- | :--- |
| A-1 只用 CSS 動畫 | 所有動畫為 `@keyframes` 或 `transition`，以 class 觸發；JS 只負責加上／移除 class（`ui/motion.enter`）。不使用 Web Animations API、`requestAnimationFrame` 逐格動畫或任何函式庫（AC-31-04） |
| A-2 邏輯狀態先行 | 狀態（`isFlipped`、`index`、`selectedIndex`、`currentTab`）在點擊當下同步更新並重繪最終內容；動畫只是表現層，**任何邏輯都不等待動畫結束、不讀 `animationend`**。因此動畫中再操作，最終畫面一定等於最後的狀態（AC-28-08、AC-31-02、E-44） |
| A-3 減少動態雙保險 | (1) `05-motion.css` 全域：`@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; } }`；(2) `motion.enter` 在 `reduced()` 時不加 class。震動不屬於動畫，不受影響（AC-31-03） |
| A-4 時間單一來源 | CSS 變數在 `05-motion.css` 的 `:root`（`--emt-dur-page`、`--emt-dur-flip`、`--emt-dur-slide`、`--emt-dur-answer`、`--emt-dur-ring`）；JS 用 `interaction.UI.*_MS`。`router-motion.test.js` 讀 CSS 檔比對兩者相等且 ≤ PRD 上限 |
| A-5 不影響既有無動畫規則 | 解碼器淡化修飾語維持**不設 transition**（§7.6、AC-13-01）；語音面板「聆聽中」閃爍沿用既有 `31-speech.css` 的 reduce 規則。（v0.5）減少動態時「聆聽中」為固定紅底白字 + 文字「聆聽中」（`animation: none`，既有規則已符合，FE-39 以測試鎖定），AC-33-08、AC-31-03 |
| A-6 收音條屬狀態顯示（v0.5） | 5 格收音條是即時狀態資訊，**不是動畫**：兩種模式下都即時更新（≤ 100 ms），JS 只切換每格 `is-on` class。`31-speech.css` 的 `.sp-meter__bar` **一律** `transition: none; animation: none`（不只在減少動態時），格數變化直接切換、無漸變，因此 A-3 的全域規則不影響其功能（AC-33-03、AC-33-08、NFR-2 減少動態「收音條不計入動畫數但不得有漸變」） |
| A-7 初始化確認視窗（v0.5） | 沿用 `ui/dialog.js`：目前**沒有**淡入或任何動畫，本版也不加，因此減少動態下自然「直接出現、無淡入」（AC-31-03、AC-32-01）。日後若要加淡入，必須以 class 觸發並受 A-3 規則約束 |

| 動畫 | 觸發 | 實作 | 長度 | AC |
| :--- | :--- | :--- | :--- | :--- |
| 換頁 | `router.go` 切到不同頁 | 舊頁**立即** `hidden = true` 並 `motion.cancel(prev, "view--entering")`（不做離場動畫）；新頁 `hidden = false` 後同步 `motion.enter(next, "view--entering", PAGE_ANIM_MS)`。`@keyframes emt-view-in { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }`，`animation: emt-view-in var(--emt-dur-page) ease-out both`。新頁從 `display: none` 變為顯示的同一個工作中加上 class，動畫自第一個影格開始，不需強制重排（避免增加 AC-22-01 的時間）。因為沒有離場動畫，連點時畫面上永遠只有一個 view（AC-31-02） | 240 ms | AC-31-01、AC-31-02、AC-22-01 |
| 翻卡 | `isFlipped` 改變 | 沿用 FE-11「兩面 `hidden` 切換、不重建 DOM」；新顯示的那一面加 `fc-face--flip-in`：`@keyframes fc-flip-in { from { transform: perspective(800px) rotateY(-90deg) } to { transform: perspective(800px) rotateY(0) } }`。只有一面可見，不會出現正反面重疊；連點兩次時第二次立刻切回正面並重新播放（AC-28-08） | 360 ms | AC-28-01、AC-28-08 |
| 換卡滑入 | 滑動或按鈕換卡（卡片重建） | 新卡根元素加 `fc-card--in-next`（由右滑入）或 `fc-card--in-prev`（由左滑入）：`translateX(±24px)`＋`opacity` → 0 | 200 ms | AC-28-03 |
| 答對 | 本次點擊造成作答且答對 | 正確選項 `qz-opt--pop`／`p5-opt--pop`：`scale(1) → 1.06 → 1` | 480 ms | AC-29-01 |
| 答錯 | 本次點擊造成作答且答錯 | 所選選項 `qz-opt--shake`／`p5-opt--shake`：`translateX` 0 → −6 → 6 → −4 → 4 → 0；正確選項同時標綠（不另加動畫） | 480 ms | AC-29-01 |
| 環形圖 | 主控台重繪且數值改變 | 進度圈 `stroke-dashoffset` 的 `transition: stroke-dashoffset var(--emt-dur-ring) ease-out`；顏色變金用 class 切換（不做顏色 transition） | 500 ms | AC-30-05、AC-31-03 |

顏色與鎖定：答題動畫只改 `transform`，顏色 class（綠／紅）與 `disabled` 在點擊當下就設定，動畫結束後仍保留（AC-29-01）。重新載入或從狀態重繪時只套顏色、不播放動畫（「本次點擊造成作答」以 view 在呼叫 action 前後比較 `selectedIndex`／`lockedSelection` 判定：前為 `null`、後為非 `null`）。

### 7.12 介面互動設計常數（Q-33 定案值；契約 §5.6 指定屬設計層）

`core/interaction.js` 匯出凍結物件 `UI`；CSS 變數與斷點值須與下表一致（A-4）。

| 常數 | 值 | PRD 上限／依據 | 說明 |
| :--- | :--- | :--- | :--- |
| `NAV_BOTTOM_MAX_PX` | 640 | ≤ 640px（Q-33、AC-27-01） | CSS 以 `@media (max-width: 640px)` 寫死同值；`shell.test.js` 檢查 |
| `PAGE_ANIM_MS` ／ `--emt-dur-page` | 240 | ≤ 300 ms（AC-31-01） | 留 60 ms 餘裕給低階裝置的掉格 |
| `FLIP_ANIM_MS` ／ `--emt-dur-flip` | 360 | ≤ 400 ms（AC-28-01） | — |
| `SLIDE_ANIM_MS` ／ `--emt-dur-slide` | 200 | PRD 未訂；SD 訂 ≤ 換頁上限 | 換卡滑入 |
| `ANSWER_ANIM_MS` ／ `--emt-dur-answer` | 480 | ≤ 600 ms（AC-29-01） | — |
| `RING_ANIM_MS` ／ `--emt-dur-ring` | 500 | PRD 未訂 | 只在數值改變時播放 |
| `SWIPE_MIN_PX` | 50 | ≥ 50px 且水平 > 垂直（AC-28-03） | 恰 50 算滑動 |
| `TAP_SLOP_PX` | 10 | — | 觸控位移小於此值視為點擊 |
| `CLICK_SUPPRESS_MS` | 350 | — | 滑動後忽略補發 click 的時間 |
| `VIBRATE_CORRECT` | `40`（總長 40 ms） | ≤ 200 ms（AC-29-02） | 單次短震 |
| `VIBRATE_WRONG` | `[60, 40, 60]`（總長 160 ms，含中間停頓） | ≤ 200 ms | 兩下，與答對區分 |
| `TOUCH_MIN_PX` | 44 | ≥ 44×44（AC-26-01、AC-27-02） | 卡片、導覽項目、選項最小尺寸 |
| `ANIM_CLEANUP_MARGIN_MS` | 50 | — | `motion.enter` 移除 class 的延遲 = 動畫長度 + 此值 |

「震動總長」以 `patternTotal(p)`（陣列各元素相加，含停頓）計算，比 PRD 字面更嚴格。

### 7.13 功能更名（R-15，FE-23；契約 `TAB_LABELS`、`NAV_TAB_ORDER`）

| 位置 | 改前 | 改後 | 來源 |
| :--- | :--- | :--- | :--- |
| `index.html` 導覽按鈕文字 | 自訂器、抽認卡、Part 5 | 難易度設定、單字卡、模擬測驗 | `TAB_LABELS`（靜態 HTML 逐字相同，`naming.test.js` 比對） |
| `index.html` 各 `section` 的 `aria-label` | 同上 | 同上 | `TAB_LABELS` |
| 主控台模組入口 | 自訂器、抽認卡、Part 5 | 難易度設定、單字卡、模擬測驗 | `dashboard.js` 改用 `C.TAB_LABELS[tab]` 組字 |
| 主控台統計標籤 | Part 5 正確率 | 模擬測驗正確率 | AC-17-01、AC-17-04 |
| 難易度設定頁標題、說明 | 目標與字庫自訂器；「…才會更新抽認卡的單字集。」 | 難易度設定；「選擇色級或輸入目標分數即時試算，按「套用」後才會更新單字卡的單字集。」 | AC-01-01 |
| 單字卡頁標題、空狀態 | 抽認卡；「請到自訂器…」「前往自訂器」 | 單字卡；「請到難易度設定套用目標分數，或新增自訂單字、注入領域範本。」「前往難易度設定」 | AC-06-06 |
| 模擬測驗頁標題 | Part 5 模擬測驗 | 標題「模擬測驗」，標題下說明「題型對應多益 Part 5」 | AC-10-02 |
| **不改** | 識別字（`TabId`、`data-tab`、`#view-*`、CSS 類名前綴、檔名、函式與變數名）、localStorage 鍵與結構、授權與資料來源文字中的「Part 5」（`license-header.txt`、`sources-page.js`、`build.test.js`、`sources-page.test.js` 的斷言）、`PART5_TYPE_LABELS`、「測驗模式」「自訂單字」「自訂擴充」「自訂清單」 | — | R-15 |
| 程式註解 | 可順手更新，不強制 | — | — |

QA 的 E2E 腳本（`tests/`，QA 負責）中以舊文字定位元素者，由 QA 在 `/qa-verify` 時更新（SD-FB-13）。

**v0.5 修訂（PRD R-18 三、契約 `NAV_TAB_ORDER` 4 項、`HIDDEN_TAB_IDS`；FE-34、FE-38）**

| 位置 | v0.4 | v0.5 | 來源 |
| :--- | :--- | :--- | :--- |
| `core/constants.js` `NAV_TAB_ORDER` | 6 項（含 decoder、phrasebank） | 4 項：`["dashboard", "customizer", "flashcards", "part5"]`；新增 `HIDDEN_TAB_IDS = ["decoder", "phrasebank"]`（皆凍結） | 契約 v0.9 |
| `core/constants.js` `TAB_LABELS` | 7 項 | **不變**（保留解碼器、句型庫兩項供未來開放，HT-4；本版不得渲染） | HT-4 |
| `index.html` 導覽按鈕 | 6 鈕 | 4 鈕，文字 = `TAB_LABELS[NAV_TAB_ORDER[i]]`；兩個隱藏頁的 `<section>` 保留、去掉 `aria-label`（§4.2） | AC-20-03、AC-27-01 |
| `views/dashboard.js` `ENTRIES` | customizer、flashcards、part5、decoder、phrasebank、sources | 由 `NAV_TAB_ORDER` 去掉 `dashboard` 後再加 `sources` 推導（customizer、flashcards、part5、sources），於讀取時計算（LD-2） | AC-17-06 |
| 頁尾 | 「資料來源與授權」 | 不變 | HT-2 |
| `naming.test.js`、`shell.test.js` 的「6 個按鈕」斷言 | 6 | 4，另斷言靜態 HTML、`views/*.js` 產生的入口皆不含 `data-tab`／`data-go` = `decoder`／`phrasebank` | AC-20-04 |

### 7.14 麥克風與收音條（v0.5；`core/meter.js` FE-35、`services/mic.js` FE-36、`views/speech-panel.js` FE-39；PRD US-33、R-18 二、Q-36、Q-37；契約 DS-01～DS-03）

**隱私與 API 限制（推翻 v0.4 §7.6「不使用 `getUserMedia`」；AC-21-03、NFR-3）**

| 允許 | 禁止 |
| :--- | :--- |
| `navigator.mediaDevices.getUserMedia({ audio: true })`，**只能**出現在 `services/mic.js` | 錄音 API（`MediaRecorder`）：產物與 `src/app`（`__tests__` 除外）出現數 0，含註解；B-7 擋 |
| `AudioContext`（或 `webkitAudioContext`）、`createMediaStreamSource`、`createAnalyser`、`getFloatTimeDomainData`（不支援時 `getByteTimeDomainData`） | 把 source 或 analyser `connect` 到 `destination`（避免回授與播放）；`ScriptProcessorNode`、`AudioWorklet`、`createMediaStreamDestination` |
| 音量值只存在 `mic` 實例與 speech-panel 的區域變數，用完即丟 | 寫入 store／`AppState`、localStorage、IndexedDB、Cache Storage；以 `Blob`、`URL.createObjectURL`、`FileReader` 處理音訊；`fetch`、`XMLHttpRequest`、`WebSocket`、`navigator.sendBeacon` |

**收音條常數（DS-01；唯一來源 `core/meter.js`，凍結物件）**

| 常數 | 值 | 說明／可調範圍 |
| :--- | :--- | :--- |
| `THRESHOLDS_DBFS`（T1～T5） | `[-50, -40, -30, -20, -10]` | Q-37 決議 A 預設值。**可調範圍**（範圍內由主控代核、不改 PRD）：每格在預設值 ±10 dB 以內；T1 < T2 < T3 < T4 < T5 且相鄰差 ≥ 6 dB；T5 ≤ −9 dBFS。`meter.test.js` 以 `validateThresholds(THRESHOLDS_DBFS).ok === true` 鎖定；超出範圍須回 PM 修訂 PRD |
| `BAR_COUNT` | 5 | AC-33-03 |
| `MAX_WINDOW_MS` | 100 | 分析視窗上限（AC-33-04「最近一個 ≤ 100 ms 分析視窗」） |
| `FFT_SIZE_MAX` | 2048 | 48 kHz 時視窗 42.7 ms、44.1 kHz 時 46.4 ms |
| `UPDATE_INTERVAL_MS` | 50 | 顯示更新間隔 ≤ 100 ms（AC-33-03）；以 `setInterval` 讀取（不用 `requestAnimationFrame`：收音條不是動畫，A-6） |

QA 測試音源（AC-33-04）依目前門檻推算：RMS −55、−45、−35、−25、−15、−5 dBFS → 亮 0、1、2、3、4、5 格，完全靜音 → 0。日後若在可調範圍內微調門檻，以本表與 `meter.js` 為準重算，並在變更紀錄註明。

**`core/meter.js` 函式（純函式）**

| 函式 | 定義 |
| :--- | :--- |
| `rmsOf(samples)` | `√(Σx² ÷ n)`；接受陣列或 TypedArray；空、非陣列、含非有限值時忽略該值，全無有效值 → 0 |
| `dbfsOf(rms)` | `rms > 0` 且有限 → `20 × log10(rms)`；否則 `-Infinity`（RMS = 0 視為全暗） |
| `levelOf(db, th = THRESHOLDS_DBFS)` | 由第 1 格起逐格檢查 `db >= th[i]`，遇到第一個不成立即停，回傳成立格數 0～5（亮格一定從左側連續）；`NaN`、`-Infinity` → 0；`db` 恰等於門檻算點亮 |
| `levelOfSamples(samples)` | `levelOf(dbfsOf(rmsOf(samples)))` |
| `bytesToFloat(bytes)` | `(v − 128) ÷ 128`，供只有 `getByteTimeDomainData` 的實作 |
| `fftSizeFor(sampleRate)` | 不超過 `FFT_SIZE_MAX` 且 `fftSize ÷ sampleRate ≤ 0.1` 的最大 2 的冪，最小 32；`sampleRate` 非正有限數 → 2048 |
| `validateThresholds(th)` | 回 `{ ok, errors }`：長度 5、皆為有限數、各在預設 ±10、嚴格遞增且相鄰差 ≥ 6、T5 ≤ −9 |
| `barsModel(level)` | 長度 5 的布林陣列，前 `level` 個為 `true`；非 0～5 整數 → 全 `false` |

**麥克風生命週期（Q-36 決議 A；DS-02）**

```
（以下皆在單字卡頁；收音條只在單字卡模式的語音面板顯示，AC-33-03）
 無音軌 ──按麥克風（支援 SR、在線、說明已讀或剛按「我知道了」）──► 取得中（acquiring，按鈕再按忽略）
   ▲                                           ├ permission → 「需要麥克風權限」，不辨識 ─────────► 無音軌
   │                                           ├ notfound   → 「找不到麥克風裝置」，不辨識 ───────► 無音軌
   │                                           ├ unavailable→ 不提示，照常辨識、收音條全暗（AC-33-07）
   │                                           └ 成功       ──────────────────────────────────────► 持有音軌
   │  持有音軌 ──按麥克風──► 重用（不呼叫 getUserMedia，AC-33-01）──► 聆聽中（SR + 每 50 ms 讀音量）
   │  聆聽中 ──結果／逾時／無結果／錯誤／再按停止／換卡／切測驗模式──► 持有音軌（音量分析停止，收音條同步全暗）
   │  持有音軌 ──音軌 ended（拔除、被停用）──► 無音軌；若正在聆聽 → 中止辨識並顯示「找不到麥克風裝置」（AC-33-06）
   └── 離開單字卡頁（router → flashcards.hide → speechPanel.release）、pagehide（重新整理、關閉分頁）：任何狀態 → 釋放
```

| 項目 | 決定 | AC |
| :--- | :--- | :--- |
| 首次取得時機 | 只在按麥克風且下列皆成立時：瀏覽器支援 SpeechRecognition（否則只 toast，AC-08-02）、`navigator.onLine !== false`（否則只顯示離線訊息，AC-08-14）、STT 說明已讀或剛按「我知道了」（按「取消」不呼叫，AC-08-13）。順序：`mic.acquire()` 結束（成功或 `unavailable`）後才 `stt.start()` | AC-08-02、AC-08-13、AC-08-14、AC-33-07 |
| 同頁重用 | `mic.isActive()`（至少一條音軌 `readyState === "live"`）為真 → 直接重用，不呼叫 `getUserMedia`；換卡、翻面、切到測驗模式再切回都不釋放（`speechPanel.reset()` 只停辨識與音量分析） | AC-33-01 |
| 釋放 | `flashcards.hide()` 改呼叫 `speechPanel.release()`（= `reset()` + `mic.release()`）；`mic` 第一次取得成功時登錄一次 `window` 的 `pagehide` → `release()`。`release()` 同步執行：停止計時器、每條 track `stop()`、source／analyser `disconnect()`、`AudioContext.close()`（Promise 例外吞掉）、清除參照。因此離開後同一個工作中音軌即為 `ended`，遠小於 1 秒 | AC-33-02、NFR-3 |
| 取得中離開頁面 | `mic` 以遞增的 `epoch` 記錄每次 `release()`；`getUserMedia` 晚於 `release()` 才成功時，立刻停止新音軌並回 `{ ok: false, reason: "released" }`（speech-panel 不顯示任何訊息） | AC-33-02 |
| 取得中換卡 | speech-panel 以既有 `gen` 判斷：取得完成時若 `gen` 已變，保留音軌（同頁仍可重用）但不開始辨識 | AC-33-01 |
| AudioContext 與自動播放政策 | `acquire()` 的同步階段（仍在使用者點擊的處理中）建立 `AudioContext`，之後才 `await getUserMedia`；重用時呼叫 `ctx.resume()`（例外吞掉）。建構失敗或 `createAnalyser` 失敗 → 音軌照常保留（仍可達成只詢問一次），`metering = false`，收音條全暗、不提示 | AC-33-03、AC-33-07 |
| 音量讀取 | `analyser.fftSize = meter.fftSizeFor(ctx.sampleRate)`；每 `UPDATE_INTERVAL_MS` 讀時域樣本 → `meter.levelOfSamples` → 只在格數改變時回呼 `onLevel(k)`；speech-panel 只切換 5 格的 `is-on` class | AC-33-03、AC-33-04 |
| 歸暗 | 聆聽以任何方式結束時，speech-panel 在同一個工作中呼叫 `mic.stopMeter()` 並把 5 格設為暗（不等計時器），滿足 ≤ 100 ms | AC-33-03、AC-33-06 |

**`services/mic.js` API（FE-36）**

| API | 約定 |
| :--- | :--- |
| `isSupported() → boolean` | `navigator.mediaDevices` 存在且 `getUserMedia` 為函式 |
| `isActive() → boolean` | 持有 stream 且至少一條 audio track `readyState === "live"` |
| `acquire() → Promise<{ ok: true, reused: boolean, metering: boolean } ｜ { ok: false, reason: "permission"｜"notfound"｜"unavailable"｜"released" }>` | 依上表；**永不 reject**；`getUserMedia` 參數固定 `{ audio: true }`（不要求視訊）；各 track 綁 `ended` → 清除持有狀態並呼叫 `onTrackEnded` 回呼 |
| `startMeter(onLevel) → boolean` | 有 analyser → 開始每 50 ms 讀取並回 `true`；否則立即 `onLevel(0)` 並回 `false`；重複呼叫先停舊計時器 |
| `stopMeter()` | 同步清除計時器；冪等 |
| `onTrackEnded(fn)` | 設定唯一回呼（再設定則覆蓋） |
| `release()` | 見上表；冪等；`epoch++` |
| `tracks() → MediaStreamTrack[]` | 目前持有音軌陣列的**複本**（無則 `[]`）；只供 V-MIC 在 DevTools 檢查 `readyState`（§10.2），程式其他地方不得呼叫，也不得存入 store |
| `create(globalObject)` | 以替身 `navigator`、`AudioContext`、`setInterval` 建立獨立實例（Node 測試） |

**錯誤對照（DS-03；取代 v0.4 以前 `getUserMedia` 不存在時的假設，亦修訂 §7.6 `audio-capture` 列）**

| 來源 | 條件 | `reason` | 畫面訊息（主訊息／補充說明） | 是否開始辨識 | AC |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `getUserMedia` | `navigator.mediaDevices` 或 `getUserMedia` 不存在 | `unavailable` | 不提示 | 是（v0.8 行為） | AC-33-07、E-64 |
| `getUserMedia` reject | `err.name` 為 `NotAllowedError`、`PermissionDeniedError`、`SecurityError` | `permission` | 「需要麥克風權限」／既有開啟方式說明（`TEXT.permissionHelp`） | 否；下次按下重新嘗試取得 | AC-08-09、E-04 |
| `getUserMedia` reject | `NotFoundError`、`DevicesNotFoundError`、`OverconstrainedError` | `notfound` | 「找不到麥克風裝置」／「請確認裝置已連接麥克風後再按一次」 | 否 | AC-33-05、E-04 |
| `getUserMedia` reject | `NotReadableError`、`TrackStartError`、`AbortError`、`TypeError`、其他或無 `name` | `unavailable` | 不提示 | 是 | AC-33-07、E-64 |
| `AudioContext` | 不存在、建構拋例外、`createMediaStreamSource`／`createAnalyser` 失敗 | 成功（`metering: false`） | 不提示，收音條全暗 | 是 | AC-33-07 |
| 音軌 `ended` | 聆聽中 | — | 中止辨識（`stt.abort()`）、「找不到麥克風裝置」／同上補充說明 | — | AC-33-06 (b)、E-65 |
| 音軌 `ended` | 未聆聽 | — | 不提示；下次按下重新 `acquire()`（有其他麥克風即正常聆聽，否則依 AC-33-05） | — | AC-33-06 (a) |
| SpeechRecognition `onerror` | `not-allowed`、`service-not-allowed` | — | 「需要麥克風權限」／開啟方式（不變） | — | AC-08-09 |
| SpeechRecognition `onerror` | `audio-capture` | — | 「找不到麥克風裝置」／「請確認裝置已連接麥克風後再按一次」（v0.5 改） | — | AC-33-05、AC-33-06 |

所有分支：按鈕回待機、收音條全暗、不顯示分數、不拋未處理例外；預期內的錯誤不 `console.error`。

**speech-panel 修改重點（FE-39）**

| 項目 | 決定 |
| :--- | :--- |
| DOM | `.sp-stt` 列依序：麥克風按鈕、`<span class="sp-meter" role="img" aria-label="收音音量">` 內含 5 個 `<span class="sp-meter__bar">`、「需要連網」標示。收音條固定寬高、常駐（不隱藏、不因狀態增減元素），切換狀態時版面不位移（AC-33-03） |
| 文字（逐字） | `TEXT.notice` 改為 AC-08-13（v0.9）原文：「語音辨識由瀏覽器提供，您的語音會傳送到瀏覽器廠商（如 Google、Microsoft）的伺服器處理；本系統只即時讀取音量以顯示收音條，不錄音、不保存、不上傳錄音。停留在單字卡頁期間，瀏覽器可能持續顯示麥克風使用中圖示，離開單字卡頁即停止使用麥克風」；新增 `TEXT.noDevice`「找不到麥克風裝置」、`TEXT.noDeviceHelp`「請確認裝置已連接麥克風後再按一次」、`TEXT.meterLabel`「收音音量」 |
| 純函式（Node 可測） | `messageForError(code)`（`audio-capture` 改回 `noDevice`）、新增 `messageForAcquire(reason)`（`permission` → 權限訊息、`notfound` → 無裝置訊息、`unavailable`／`released` → `null`）、`meterBarsOf(level)`（委派 `meter.barsModel`，`meter` 不存在時回全暗） |
| 狀態 | `SttStatus` 不變（`idle`／`notice`／`listening`）；取得中以元件區域旗標 `acquiring` 表示（不進 store）；**任何音量值都不得傳給 store action** |
| 學習事件 | 不變：只在顯示分數後呼叫 `recordSttScored`（AC-30-04）；取得失敗、`unavailable` 退回路徑的失敗皆不記錄 |

### 7.15 切換難易度初始化學習紀錄（v0.5；`core/reinit.js` FE-34、store FE-37、customizer FE-40；PRD US-32、R-18 一、Q-38；契約 §5.7 CI-1～CI-10、DS-04、V-ST-14）

**流程**

```
customizer 一般模式「套用」click（視窗開啟中再按忽略：區域旗標 pending）
  r = actions.requestApplyGoal()
  ├ "applied" / "ignored" ─► 結束（同 v0.4，AC-01-02、AC-32-05、AC-32-06）
  └ "confirm" ─► ok = await EMT.ui.dialog.confirm({ title, message, okText: "確定", cancelText: "取消" })
                 ├ ok === true  ─► w = actions.confirmApplyGoal()
                 │                   ├ w.ok        ─► 完成（各 view 依 store tags 重繪）
                 │                   └ !w.ok        ─► toast「儲存空間不足，未套用」（kind error）；store 已還原 draftScore
                 └ ok === false ─► actions.cancelApplyGoal()（取消、Esc、點視窗外三者相同）
```

**確認視窗（沿用 `ui/dialog.js`，不改該檔）**

| 項目 | 內容 | AC |
| :--- | :--- | :--- |
| 標題 | 「切換難易度」 | — |
| 內文（`message`，`\n` 換行，dialog 已用 `pre-line`） | 第 1 行「目前已有學習統計資料，切換難易度將初始化學習紀錄。」；第 2 行「建議先按「取消」，到主控台按「匯出備份」保存目前紀錄。」（兩段皆逐字包含 AC-32-01 引號內文字；「匯出備份」= dashboard `TEXT.exportBtn`） | AC-32-01、Q-38 |
| 按鈕 | 只有「取消」「確定」2 個；開啟時焦點在「取消」（既有行為，降低誤觸） | AC-32-01 |
| 背景不可操作 | 既有 `.dialog-backdrop`（`position: fixed`、全螢幕、`z-index: 1100` 高於底部導覽 900）攔截點擊、Tab 焦點限制在視窗內、Esc 以捕獲階段攔截 | AC-32-01、CI-10 |
| 減少動態 | 對話框本來就無動畫（§7.11 A-7） | AC-31-03 |

**`core/reinit.js` 函式（純函式，不修改輸入）**

| 函式 | 定義 | 契約 |
| :--- | :--- | :--- |
| `effectiveOf(score)` | `goal.effectiveColorOf(goal.colorOf(score))` | V-ST-02 |
| `effectiveChanged(goalState, newScore)` | `effectiveOf(newScore) !== goalState.effectiveColor`（綠 ↔ 藍 ↔ 金、同色級調分數皆為 `false`） | CI-3 |
| `recordFlags(data, today) → { a, b, c, d, e, f }` | 逐字依契約 §5.7「有學習紀錄」對照表：(a) `masteredWordKeys.length > 0`；(b) `vocabQuiz.answered > 0`；(c) `part5.totalAnswered > 0`；(d) `todayLearned.date === today && wordKeys.length > 0`；(e) `learnedHistory` 中存在合法日期鍵 k，`addDays(today, −29) ≤ k ≤ addDays(today, −1)` 且值 > 0（**不看 today**，FB-33；日期函式取自 `core/learning.js`）；(f) `streak.lastActiveDate !== null ‖ streak.days > 0`。欄位缺漏或型別不符視為該項不成立 | CI-2 |
| `hasLearningRecord(data, today)` | `recordFlags` 任一為 `true` | CI-2 |
| `needsConfirm(data, today)` | `effectiveChanged(data.goal, data.goal.draftScore) && hasLearningRecord(data, today)` | CI-1 |
| `buildReinitData(data, newGoal, defaults)` | 回傳**新物件**：先淺複製 `data` 的全部鍵；`goal` = `newGoal` 的複本；`LEARNING_PROGRESS_FIELDS` 每一欄 = `defaults[欄]` 的深複本（`defaults` 由 store 傳入 `persist.defaultData()`，確保與「首次畫面按開始學習」所得值相同，AC-32-02）；其餘欄位（`customVocab`、`sttNoticeAcknowledged` 與日後新增欄位）原值保留（白名單，CI-4）。`defaults` 缺少任一欄 → 拋含欄位名的 `Error`（LD-3：程式組裝錯誤，不得被當成使用者錯誤） | CI-4、AC-32-02、AC-32-03、AC-32-10 |

**原子性（DS-04「先建新物件、成功才替換記憶體」的實作位置）**

| 步驟 | 位置 | 說明 |
| :--- | :--- | :--- |
| 1 建新物件 | `store.confirmApplyGoal` 呼叫 `reinit.buildReinitData` | 現行 `state.data` 不被觸碰 |
| 2 一次寫入 | 同上，經既有 `writeData(newData)`（store 唯一的 `setItem` 出口；寫出前照常 `normalizeLearning`） | 不 `removeItem`、不碰 `unreadable` 鍵、不新增鍵（CI-5） |
| 3 失敗 | `writeData` 回 `quota`／`error` → `state.data` 原物件不變；只把記憶體 `draftScore` 改回 `appliedScore`（CI-7 指定畫面回到 CI-9 狀態）；回 `{ ok: false }` | localStorage 因 `setItem` 失敗保持原值；不會出現部分清除（AC-32-11 (b)） |
| 4 成功／停用 | 以新物件取代 `state.data`，依 CI-8 重建執行期；`unavailable` 時不寫入直接取代（CI-6），banner 的「進度將無法保存」既有顯示不變 | AC-32-02、AC-32-11 (a) |

AC-32-02 的畫面結果皆由新資料推導，不另存狀態：主控台 X = 0、D 依新色級（棕 10）、長條圖 7 根 0、打卡 0、掌握 0、掌握率 0%（單字集非空）、模擬測驗正確率「—」；難易度試算 CurrentVocab = 0；模擬測驗第 1 題未作答（`part5` tag）。

### 7.16 隱藏解碼器與句型庫（v0.5；constants FE-34、殼層／router／主控台 FE-38、store FE-37；PRD R-18 三、AC-20-04、E-68；契約 §5.8 HT-1～HT-5、DS-05）

| 層面 | 處理 | HT／AC |
| :--- | :--- | :--- |
| 常數 | `NAV_TAB_ORDER` 4 項、`HIDDEN_TAB_IDS = ["decoder", "phrasebank"]`；`TabId`、`TAB_LABELS` 保留 | HT-2、HT-4 |
| 導覽列（寬螢幕、641～767px 選單、≤ 640px 底部導覽） | `index.html` 只留 4 鈕；底部導覽 `grid-template-columns: repeat(4, minmax(0, 1fr))`（375px 時每項約 94 × 56 px）；641～767px 選單維持 2 欄（4 鈕 = 2 × 2） | AC-20-03、AC-27-01、AC-27-02、AC-27-04 |
| 主控台入口 | `ENTRIES` 由 `NAV_TAB_ORDER` 推導（customizer、flashcards、part5）+ `sources` | AC-17-06 |
| 頁尾 | 「資料來源與授權」不變；首次模式返回鈕不變 | HT-2 |
| router `go()` | 隱藏頁 → 一般模式導向主控台、首次模式維持（回 `false`）；`data-go`、程式內部呼叫皆經此守門 | HT-3、E-68 |
| 網址片段 | 本系統不使用 hash 路由；為符合 AC-20-04「手動輸入其網址片段時改顯示主控台」，router 另以 `hashchange` 與啟動檢查攔截 `#decoder`、`#phrasebank`、`#view-decoder`、`#view-phrasebank`、`#/decoder` 等寫法（§4.2）→ 一般模式顯示主控台；其他片段忽略 | HT-3、AC-20-04 |
| store `setTab()` | 隱藏頁一律忽略，`currentTab` 永不為隱藏頁 | HT-1 |
| 重新載入、匯入備份 | 啟動一律主控台（或首次畫面）；備份不含頁面狀態 | HT-3 |
| 保留程式與資料 | `views/decoder.js`、`views/phrasebank.js`、`50-decoder.css`、`60-phrasebank.css` 不改、不刪，照常打包並登錄（`EMT.views.register` 仍接受兩個 TabId），但因 router 拒絕進入，永遠不會 `mount`（不建 DOM、不訂閱 store、不排閒置工作）；`RuntimeState.decoder`／`phrasebank` 照常初始化；`src/data/decoder.js`、`phrasebank.js` 照常打包；`index.html` 保留兩個空 `<section hidden>`（去掉 `aria-label`） | HT-4、HT-5、AC-23-04 |
| 未來開放 | 須先修訂 PRD；再把 id 移回 `NAV_TAB_ORDER`、自 `HIDDEN_TAB_IDS` 移除、恢復 2 個導覽按鈕與 section `aria-label`、底部導覽欄數改回；主控台入口自動推導 | — |

### 7.17 只選色級、不顯示分數（v0.6；constants／goal／store FE-42、customizer／dashboard FE-43；PRD R-19、Q-39、Q-40；契約 §5.9 GS-1～GS-8、V-ST-16、DS-07～DS-10）

**資料流（不改持久化結構，`schemaVersion` 2）**

```
點卡片 X ──► actions.clickColor(X) ──► draftScore = goal.scoreForCard(X)（X 的 scoreMax）
                                        ├ main：照常寫入（未套用也保存，AC-02-08）
                                        └ firstRun：只改記憶體（FS-2）
          ──► customizer.syncDraft() ──► renderEstimate(draftScore)：試算 3 項 + renderSelected(colorOf(draftScore))
「套用」──► requestApplyGoal()（不再先讀輸入框）──► appliedScore = draftScore（原值，GS-3）
「開始學習」──► startLearning()（不再先讀輸入框）
取消初始化 ──► cancelApplyGoal() ──► draftScore = appliedScore ──► "goal" tag ──► 選中卡片回到 Color(appliedScore)（GS-8）
啟動／匯入 ──► 既有分數原值保留（600 → 選中綠、735 → 選中藍），只重算色級（GS-4）
```

**各項修訂（DS-07～DS-09 對照）**

| 項目 | 設計 | 任務 | 契約／AC |
| :--- | :--- | :--- | :--- |
| 點卡片設分數 | `goal.scoreForCard(colorId)` = `scoreMax`；store `clickColor` 改呼叫它；`scoreAfterColorClick` 保留名稱、語意改為 `scoreForCard(id) ?? S`。Q-32 邏輯（範圍內不變、設為下限）全部移除 | FE-42 | DS-07、GS-2、AC-01-05、AC-02-04、AC-26-02、AC-26-04、V-ST-16 |
| 預設分數 | `constants.SCORE_DEFAULT` 600 → 725；`persist.defaultData()`（已引用常數）自動成為 725，涵蓋首次、首次畫面重新整理、讀取失敗重設、localStorage 停用四種情況；測試中「預設值」的斷言一律改為引用 `C.SCORE_DEFAULT` 或寫 725，**不得**留下以 600 代表預設值的斷言（以 600 代表「v0.9 以前的既有分數」的 fixture 可保留，且應保留以驗證 GS-4） | FE-42 | DS-08、GS-7、AC-18-02、AC-25-01、AC-25-04 |
| 分數區隱藏 | **保留程式**（PRD R-19 允許）：`section.cz-score` 建立時即設 `hidden = true` 並 `setAttribute("inert", "")`，之後任何程式路徑都不得把 `hidden` 改回 `false`；滑桿與數字輸入框另設 `disabled` 與 `tabindex="-1"`。三重保證不可見、不可聚焦：(1) 全域 `[hidden] { display: none !important; }`（`00-base.css` 既有）→ 不渲染、不在 Tab 順序、不在無障礙樹；(2) `inert`；(3) `disabled`（即使未來 CSS 誤改 `display`，也無法聚焦或輸入）。錯誤提示 `#cz-score-error` 位於隱藏區內，且輸入元件停用後不會再觸發 → 「請輸入 10～990 的分數」不會出現 | FE-43 | DS-09、GS-6、AC-25-01、AC-26-05 |
| 不從輸入框回寫 | `onApply`、`onStartLearning` **刪除**「先以 `parseScoreInput(refs.input.value)` 寫入 `setDraftScore`」的步驟，直接呼叫 `requestApplyGoal`／`startLearning`。理由：隱藏的輸入框不得成為分數來源；未點卡片直接套用必須寫入原值（GS-3，AC-26-06 的 735 不得被任何轉換影響）。`syncDraft` 仍可同步隱藏元件的 `value`（無害） | FE-43 | GS-3、AC-26-06 |
| 卡片分數範圍 | `buildColorCard` 不再建立 `.cz-color__range` 節點；`cardModels` 移除 `range` 欄位（避免日後誤用）；`20-customizer.css` 刪除 `.cz-color__range` 規則並確認卡片版面（行距、最小高度 ≥ 44px）正常 | FE-43 | AC-01-01、AC-26-01、AC-26-05 |
| 狀態列目標分數 | 一般頁狀態列不建立「目前目標分數」列（`stScore`）；`statusTexts` 移除 `score` 欄位；狀態列只剩「目前目標色級」「目前生效色級」與綠色上限提示 | FE-43 | GS-6、AC-26-05 (b) |
| 主控台目標分數 | `dashboard.js` 目標區不建立「目前目標分數」項目（`refs.score`）；`goalInfoOf` 移除 `appliedScore` 欄位（色級仍以 `appliedScore` 推導，邏輯不變）；`TEXT.appliedScore` 刪除。`10-dashboard.css` 只在目標區格線因少一項而跑版時調整 | FE-43 | AC-17-06、AC-25-02、AC-26-05 (c) |
| 說明文字 | 一般頁 `T.intro` 由「選擇色級或輸入目標分數即時試算，按「套用」後才會更新單字卡的單字集。」改為「**選擇色級即時試算，按「套用」後才會更新單字卡的單字集。**」（不再提及輸入分數；PRD 未定義此句，屬設計層文字）；首次引導文字不變 | FE-43 | GS-6 |
| 試算區標籤 | 「分數對應色級」標籤**保留**（PRD AC-01-07、AC-02-04、AC-02-10 仍以此稱呼；只顯示色級名稱，不含分數數值） | — | AC-02-04 |
| 取消確認後卡片回原色級 | 沿用 FE-40 流程：`cancelApplyGoal()` → `syncAll()` → `renderEstimate(draftScore)` → `renderSelected(colorOf(appliedScore))`。FE-43 以測試鎖定：既有 600（綠）、點棕卡片（465）→「套用」→ 取消 → 綠卡 `aria-pressed="true"`、其餘 `false`、試算每日新字量回到 15、store `draftScore` = 600（不轉 725）；寫入失敗（CI-7）路徑同樣回到綠卡 | FE-43 | GS-8、CI-9、AC-32-04 |
| AC-22-04 量測點 | 由「拖曳滑桿」改為「點色級卡片（未套用）」：點擊 handler 內同步完成 `clickColor` → `renderEstimate`（只改既有節點文字與 `aria-pressed`，不重建 DOM）。量測：`click` 事件起點 → 下一個 `requestAnimationFrame` 時卡片選中與試算 3 項皆已更新，10 次各 ≤ 100ms。FE-44 若有無頭瀏覽器則以 `performance.now()` 量測一輪並回報；正式驗收由 QA | FE-43、FE-44 | AC-22-04、NFR-4 |
| 鍵盤操作 | Q-40 決議不新增 AC；卡片原本就是 `<button>`（可 Tab、Enter／空白鍵觸發，FE-27），本版不改 | — | Q-40 |
| 不變的部分 | `persist.js`（已引用常數、資料層驗證不四捨五入）、`backup.js`、`reinit.js`、CI-1～CI-10 流程、`schemaVersion`、`src/data/` | — | DS-10、GS-4、GS-5 |

**原始碼中仍會出現的分數字樣（判定說明，見 SD-FB-29）**：`goal.js` 的 `SCORE_INVALID_MESSAGE`、`customizer.js` 的 `T.invalid`、`T.scoreHeading` 等屬保留程式，仍會在交付檔原始碼中出現；AC-26-05 判定的是**可見畫面、可聚焦元素與可存取名稱**，不以原始碼字串搜尋判定（同 SD-FB-21 的處理）。

### 7.18 PWA（v0.7；core FE-45、sw 範本 FE-46、建置 FE-47、service FE-48、store FE-49、UI FE-50～FE-52；PRD R-20、US-34～US-37、AC-24-12、Q-41～Q-48；契約 §10）

#### 7.18.1 兩種形態的行為對照

| 項目 | `file://`（含只複製 HTML，AC-37-02） | https／`localhost` | 保證機制 |
| :--- | :--- | :--- | :--- |
| PE-1 | `false`（第 (1) 步即判定，不讀 `navigator.serviceWorker`） | `true`（支援 SW 時） | `core.pwa.isEligible`；V-PWA-08 判定表 |
| `<head>` 連結 | 只有靜態 `<link rel="icon" href="data:,">`（不產生請求） | 另由程式加入 manifest、apple-touch-icon | HD-1～HD-3、B-12、B-7 |
| 網路請求 | 0 | 7 個預先快取網址與 `sw.js` 的同源 GET | PV-3；`services/pwa.js` 禁 `fetch`；`sw.js` 只 `fetch` 預先快取清單 |
| 安裝按鈕、新版提示 | 永不出現（`eligible` 恆 `false`） | 依 IN-1、UP-6 | `installVisible`、`updateVisible` 第一項即 `eligible` |
| NT-1 說明 | 顯示 | 顯示 | dashboard 常駐、不看 `eligible` |

#### 7.18.2 BUILD_ID（SW-2；B-14）

```
HTML₀ = fillTemplate(...)                    ← 含 content="@@BUILD_ID@@"
records = [ ["index.html", HTML₀], ["manifest.webmanifest", M],
            ["icons/icon-192.png", P1], ["icons/icon-512.png", P2],
            ["icons/icon-maskable-512.png", P3], ["icons/apple-touch-icon-180.png", P4],
            ["sw.js", SW_TEMPLATE] ]
h = sha256()
for [path, bytes] of records:  h.update(utf8(path + "\n" + bytes.length + "\n")); h.update(bytes); h.update(utf8("\n"))
BUILD_ID = h.digest("hex").slice(0, 16)
```

| 情境（AC-36-01） | 結果 | 理由 |
| :--- | :--- | :--- |
| (a) 不改任何檔連續建置 2 次 | HTML、manifest、`sw.js` 逐位元組相同 | 輸入不含時間、亂數、絕對路徑（§5.1 可重現性檢查） |
| (b) 改 `src/app/` 或 `src/data/` 1 個字元 | HTML₀ 不同 → BUILD_ID 不同 → `sw.js` 不同 | `src/app/` 的 `.js`／`.css`／`index.html`／`license-header.txt` 與 `src/data/` 皆進入 HTML₀；`sw.template.js` 直接入雜湊；`src/app/assets/icons/` 以 P1～P4 入雜湊 |
| (c) 只換一張 PNG | P1～P4 之一不同 → BUILD_ID 不同 | 同上 |
| 只改 `tools/build.mjs` | 若改變輸出，則 HTML₀ 或注入結果改變；若只改注入格式而 HTML₀ 不變 → BUILD_ID 不變但 `sw.js` 位元組可能不同 | **規避**：注入只替換**值**（BUILD_ID、預先快取網址），`sw.js` 的程式結構全部在範本內（入雜湊）；T-51 |

#### 7.18.3 `sw.template.js` 結構（FE-46）

| 區段 | 內容 |
| :--- | :--- |
| 開頭 | 檔頭註解（繁中；**不得**含任何網址、`@@` 以外的佔位、B-15 禁用字串）；`"use strict";` |
| 設定（唯一由建置改值的地方） | `var BUILD_ID = "@@BUILD_ID@@";`、`var CACHE_PREFIX = "english-master-track-pwa-";`、`var CACHE_NAME = CACHE_PREFIX + BUILD_ID;`、`var PRECACHE_URLS = [/* @@PRECACHE_URLS@@ */];` |
| 網址表 | `var PRECACHE_ABS = PRECACHE_URLS.map(function (u) { return new URL(u, self.location.href).href; });`（以 `sw.js` 網址解析，SW-6） |
| `install` | `event.waitUntil(precache())`；**不呼叫** `skipWaiting`（SW-4） |
| `precache()` | `caches.open(CACHE_NAME)` → 對 `PRECACHE_URLS` 中 `./` 以外的 6 項各 `fetch(new Request(u, { cache: "reload" }))`；每個回應須 `ok`、`status === 200`、`!redirected`（否則視為失敗）；全部成功後依序 `cache.put`：`./index.html` 的回應另以 `clone()` 同時寫入 `./` 鍵（兩鍵位元組相同，SW-4 的「取一次後 clone」方案；`./` 不另發請求）。任何失敗 → `caches.delete(CACHE_NAME)` 後讓 Promise reject（install 失敗、不留部分快取，AC-35-05） |
| `activate` | `event.waitUntil(caches.keys().then(刪除「以 CACHE_PREFIX 開頭且 ≠ CACHE_NAME」者).then(() => self.clients.claim()))`（SW-5、SW-9） |
| `fetch` | 條件全成立才 `respondWith`：`request.method === "GET"`；`new URL(request.url)` 去 `hash` 後的 `href` ∈ `PRECACHE_ABS`（同源由絕對網址比對自然保證，**含查詢字串**）。回應：`caches.open(CACHE_NAME).then(c => c.match(request.url 去 hash, { ignoreVary: true }))`（以網址比對，不受導覽請求與 install 請求的 `Vary` 標頭差異影響；不使用 `ignoreSearch`，查詢字串必須相同）→ 命中回傳；未命中 → `fetch(request)`（不寫入快取，SW-6、SW-7）。導覽請求的 `./` 與 `./index.html` 皆命中各自的鍵 |
| `message` | `event.data` 為非 `null` 物件、`Object.keys(data)` 恰為 `["type"]`、`data.type === "SKIP_WAITING"` → `self.skipWaiting()`；其他忽略（SW-8） |
| 禁止 | SW-10 全部；不得 `postMessage`、`clients.matchAll`、`console.*` |

#### 7.18.4 頁面端：啟動與註冊（`services/pwa.js`，FE-48）

```
start({onChange})
 ├ eligible = core.pwa.isEligible({location, isSecureContext, navigator}) ── false → return {false,false}（PE-2，什麼都不做）
 ├ standalone = core.pwa.isStandalone({matchMedia, navigator})
 ├ onChange({eligible: true, standalone})
 ├ addLink("manifest", "manifest.webmanifest"); addLink("apple-touch-icon", "icons/apple-touch-icon-180.png", sizes="180x180")
 ├ window.addEventListener("beforeinstallprompt", onBip); window.addEventListener("appinstalled", onInstalled)
 └ readyState === "complete" ? setTimeout(register, 0) : addEventListener("load", register, {once: true})
register()
 └ navigator.serviceWorker.register("./sw.js", {scope: "./", updateViaCache: "none"})
     .then(onRegistered).catch(silent)
```

#### 7.18.5 更新流程（UP-1～UP-9，Q-43 A）

| 時機 | 動作 | `RuntimeState.pwa` 變化 |
| :--- | :--- | :--- |
| `onRegistered(reg)` | 存 `reg` 於閉包；`last = performance.now()`；`reg.waiting && navigator.serviceWorker.controller` → 有新版；`reg.addEventListener("updatefound", …)`；`navigator.serviceWorker.addEventListener("controllerchange", onControllerChange)`；`document.addEventListener("visibilitychange", onVisible)` | `lastUpdateCheckAt = last`；有新版時 `updateAvailable = true` |
| `updatefound` | `w = reg.installing`；`w.addEventListener("statechange", …)`：`w.state === "installed" && controller` → 有新版。`controller` 為 `null`（首次安裝）→ 不設定 | `updateAvailable = true` |
| `visibilitychange` 為 `visible` 且 `core.pwa.needsRecheck(performance.now(), last)` | `last = now`；`reg.update().catch(silent)` | `lastUpdateCheckAt = now` |
| `requestReload()` | 已 `reloadRequested` → 不做事；否則 `reloadRequested = true`；`reg && reg.waiting` → `reg.waiting.postMessage({ type: "SKIP_WAITING" })`；否則 `location.reload()` | `reloadRequested = true` |
| `controllerchange` | 只有 `reloadRequested && !reloaded` 時 `reloaded = true`、`location.reload()`；其他（首次 `clients.claim()`、別的分頁換版）不重新載入 | — |
| 離線、`update()` 失敗、`register()` 失敗 | 靜默；不設 `updateAvailable` | 不變（UP-9、PE-3） |

AC-36-03「60 秒內顯示」：瀏覽器在導覽時檢查 `sw.js`（`updateViaCache: "none"` 不取 HTTP 快取），V2 安裝時預先快取 7 項（約 3.5 MB）完成後觸發 `statechange: installed` → `updateAvailable`；一般網路下遠低於 60 秒。

#### 7.18.6 安裝按鈕狀態機（IN-1～IN-8）

```
                 beforeinstallprompt（有 prompt 函式、未 suppressed、非 standalone）
  [hidden] ─────────────────────────────────────────────────────► [available]
     ▲   preventDefault()、事件存閉包、installPromptAvailable = true │
     │                                                             │ 點「安裝 App」：取出並清空閉包事件、
     │                                                             │ installPromptAvailable = false、installSuppressed = true
     │                                                             │ （先 onChange → 按鈕消失）→ e.prompt() → await e.userChoice
     │                                                             ▼
     └──────────── appinstalled（任何狀態）：清空閉包、available = false、suppressed = true ─── [suppressed：本頁不再顯示]
```

| 規則 | 實作 |
| :--- | :--- |
| 防連點（AC-34-09 (c)） | 閉包事件在 `prompt()` **之前**取出並清空；第二次點擊時閉包為 `null` → 直接 `return Promise.resolve()`；且按鈕已因 `"pwa"` tag 被移除 |
| 錯誤 | `prompt()` 同步例外或回傳 Promise reject、`userChoice` reject → 靜默；狀態維持 suppressed |
| 替身事件（FB-42） | `typeof e.prompt !== "function"` → 忽略（不 `preventDefault`、不顯示） |
| 不存 | 事件物件只在閉包（PV-7）；不寫 localStorage（IN-8） |

#### 7.18.7 畫面配置

| 元素 | 位置與樣式 | AC |
| :--- | :--- | :--- |
| NT-1 說明 `p.dash-backup__origin` | 主控台備份區塊按鈕列之後的**下一個兄弟節點**（「匯出備份」與「匯入備份」同一列，SD-FB-34）；一般段落文字（`font-size` 同 `.dash-backup__hint`、`overflow-wrap: anywhere`），不截斷、不設 `white-space: nowrap`；位於頁面流內，底部導覽以既有 `body` 底部留白避讓 | AC-24-12、AC-27-03 |
| 「安裝 App」 | NT-1 之後的 `div.dash-backup__install` 內；`min-height`／`min-width` ≥ `var(--touch)`（44px）；`hidden` 時 `display: none`（全域 `[hidden]` 規則） | AC-34-07、AC-34-08 |
| 新版提示 `#pwa-update` | 頁首之後、`#app-banner` 之後的頁面流元素，`position: sticky; top: 0; z-index` 低於對話框與 toast、高於一般內容；`display: flex; flex-wrap: wrap; gap`，文字與按鈕在 375px 不截斷；背景 `--surface`、上下邊框 `--border`；**無** `transition`／`animation`（減少動態下自然無動畫）；在頁面頂端，不可能被底部導覽遮住 | AC-36-03、AC-27-03、AC-31-03 |

#### 7.18.8 隱私與禁止事項對照（PV、AC-37-05、AC-21-03）

| 檢查 | 位置 | 方法 |
| :--- | :--- | :--- |
| `navigator.serviceWorker`、`beforeinstallprompt`、`appinstalled` 只出現在 `services/pwa.js` | `src/app`（`__tests__`、`pwa/` 除外） | `pwa-service.test.js` 原始碼掃描（比照 haptics） |
| `caches` 只出現在 `pwa/sw.template.js` | `src/app` | 同上 |
| `services/pwa.js` 不含 `localStorage`、`sessionStorage`、`indexedDB`、`fetch(`、`XMLHttpRequest`、`sendBeacon`、`<link`、`<script` | 原始碼 | 同上 |
| `sw.js` 禁用字串與監聽種類 | 建置產物 | B-15（建置中止）＋ `sw.test.js` |
| manifest 鍵集合封閉 | 建置產物 | B-13 |

### 7.19 版面與視覺（v0.8；PRD R-21、US-38～US-41、Q-49～Q-57；契約 §11、§5.6 v0.12 段、DS-19～DS-25）

原則：**只改表現層**。資料流、store action 的語意、router、localStorage 寫入時機一律不變；唯一新狀態是記憶體中的 `runtime.dashboard.backupExpanded`。樣稿 `docs/mockups/v0.12-layout-demo.html` 只供參考，與 AC 不一致處以 AC 為準（FB-44：不加「→」箭頭、標題用「資料備份」、副標用「」）。

#### 7.19.1 CSS token 重整（`00-base.css` `:root`，FE-56）

採「**沿用變數名、改值**」＋「**新增語意變數**」：既有樣式檔中的 `var(--primary)` 多為白字按鈕底、選中狀態與品牌文字，改值即自動符合 AC-38-04，不需逐檔改寫；需要新語意的地方才改用新變數。

| 變數 | v0.11 | v0.12 | 用途限制 | 依據 |
| :--- | :--- | :--- | :--- | :--- |
| `--color-orange`／`brown`／`green`／`blue`／`gold` | `#e8833a`／`#8b5a2b`／`#2e9e5b`／`#2f6fd6`／`#c9a227` | **不變** | 色級色條、選中列框線與淡底、目標行色點、達成金色 | AC-38-03、VC-6 |
| `--correct`／`--wrong`、`--light-green`／`yellow`／`red`、`*-bg` | 現值 | **不變** | 對錯、燈號 | AC-38-03 |
| `--brand`（新） | — | `#1e9bf0` | **只**用於：主環形圖未達成進度 `stroke`、模擬測驗進度條填色、選中導覽項指示（底線或 inset 陰影）、標題列圖示底色。**不得**出現在任何 `color:` 宣告，**不得**作為白字元素背景 | VC-1、AC-38-01 |
| `--brand-deep`（新） | — | `#0866ad`（白字 6.0:1；色相 205.8°，與 `--brand` 差 1.5°） | 白字按鈕底、品牌色文字、連結、選中導覽文字 | VC-2 |
| `--primary` | `#2f6fd6` | **`#0866ad`**（= `--brand-deep`，以字面值寫） | 沿用名稱；既有 `var(--primary)` 自動改為深品牌色。**`--primary` 與 `--color-blue` 從此不同值**（DS-21 (1)）；FE-56 須逐一檢查 `var(--primary)` 用處，若有代表「藍色級」者改用 `--color-blue`（實查 v0.11 無此用法，`.cz-color--blue` 已用 `--color-blue`） | DS-21、AC-38-03 |
| `--primary-hover` | `#2459ad` | `#06558e` | 白字按鈕 hover | AC-38-04 |
| `--accent`（新）／`--accent-text`（新） | — | `#f7893b`／`#1f2937`（6.0:1） | `--accent` **只**出現在 `.btn--accent` 的 `background`、`.db-stat__icon` 的 `fill`；按鈕自身 `border-color` 為 `transparent`。`--accent-text` 只用於 `.btn--accent` 文字 | VC-3、Q-53 |
| `--bg` | `#f6f7f9` | `#eef4fa`（HSL 約 210°、55%、96%） | `body` 背景；= `PWA_BACKGROUND_COLOR`（B-11 比對） | VC-4、VC-5 |
| `--surface`、`--text`、`--text-muted` | `#ffffff`、`#1f2937`、`#5b6472` | 不變 | — | VC-7 |
| `--tint`（新） | — | `#e6f0fa` | 次要按鈕底（字 `--brand-deep`，約 5.2:1） | AC-38-04、AC-38-06 |
| `--track`（新） | — | `#dbe7f3` | 環形圖底圈、進度條軌道、長條圖軌道（非文字） | — |
| `--chart-bar`（新） | — | `#9cc3e6` | 近 7 天非今天的長條；今天用 `--brand-deep`（`--brand` 不在 VC-1 用途表，不得用於長條） | VC-1 |
| `--line`（新） | — | `#e3e8ef` | 頁首／頁尾／導覽容器分隔線、區段分隔虛線、單字卡頁卡片框 | AC-38-06 |
| `--border` | `#d5d9e0` | 值不變，**用途限縮** | 只留：表單輸入框（`input`、`select`、`textarea`）、四選一與模擬測驗作答選項、收音條暗格（皆在 AC-38-06 範圍外）。任何按鈕、區塊卡片**不得**再用 | AC-38-06 |
| `--focus` | `#f59e0b` | `#0866ad` | `:focus-visible` 外框 3px、offset 2px（在白底與 `--bg` 上皆清楚；非文字，不在 AC-38-04 量測） | AC-38-09 |
| `--radius`／`--radius-cta`（新）／`--radius-card`（新） | 8px／—／— | 8px／12px／16px | 8px：一般按鈕、輸入框、單字卡頁；12px：`.btn--accent`；16px：區塊卡片、首次畫面底部列上緣 | AC-38-06 |
| `--shadow-card`（新） | — | `0 1px 3px rgba(16, 40, 80, 0.08), 0 4px 14px rgba(16, 40, 80, 0.06)` | 區塊卡片、色級列 | AC-38-06 |
| `--content-narrow`（新） | — | 720px | 主控台、模擬測驗、難易度設定內容寬 | AC-39-10、AC-40-02 |
| `--emt-firstbar-h`（新） | — | 184px | 首次畫面固定底部列預留高度（§7.19.5） | AC-41-04 |

**禁止寫法（`tokens.test.js` 掃描 `styles/*.css` 全部檔案，FE-56 建立，之後每個任務的 `npm test` 都會執行）**：(1) `(?<![-\w])color\s*:\s*var\(--(brand|accent)\)`；(2) `var(--accent)` 只能出現在選擇器含 `.btn--accent` 或 `.db-stat__icon` 的規則；(3) `#f7893b`、`#1e9bf0` 字面值只能出現在 `:root`；(4) 規則選擇器含 `.btn` 或 `.card` 者不得有 `var(--border)` 或 `#d5d9e0`；(5) 無 `@font-face`、無 `url(`（`data:` 亦禁止）。

#### 7.19.2 共用元件樣式（`00-base.css`，FE-56）

| 元件 | 樣式 | AC |
| :--- | :--- | :--- |
| `body` | `background: var(--bg)`；**`font-variant-numeric: tabular-nums`**（全域繼承，所有數字等寬，AC-38-07 列舉的數字一次滿足）；字型堆疊不變（系統字型） | AC-38-02、AC-38-07 |
| `.card` | `background: var(--surface); border: 0; border-radius: var(--radius-card); box-shadow: var(--shadow-card); padding: 16px; margin-bottom: 12px` | AC-38-06 |
| `.btn`（次要，預設） | `border: 1px solid transparent`（保留 1px 幾何，單字卡頁按鈕尺寸不變）；`background: var(--tint)`；`color: var(--brand-deep)`；`border-radius: var(--radius)` | AC-38-06、AC-38-08 |
| `.btn--primary` | `background: var(--primary); color: #fff; border-color: transparent` | AC-38-04 |
| `.btn--accent`（新） | `background: var(--accent); color: var(--accent-text); border-color: transparent; border-radius: var(--radius-cta); font-weight: 700; min-height: 48px; padding: 12px 20px; white-space: nowrap`；hover 不換底色（只加 `box-shadow`），避免 hover 時出現第三種橘 | AC-38-01、AC-38-04、AC-39-02、AC-41-02 |
| `.btn--link` | `color: var(--brand-deep)`；底線；`min-height`／`min-width` 44px | AC-38-04、AC-39-04 |
| `.page-title`（新） | `font-size: 1.375rem; font-weight: 700; margin: 0 0 12px` | — |
| `.section-title`（新） | `font-size: 1.125rem`（18px）`; font-weight: 700; line-height: 1.4; margin: 0 0 8px` | AC-38-07 |
| `:focus-visible` | `outline: 3px solid var(--focus); outline-offset: 2px` | AC-38-09 |
| 頁首／頁尾／導覽 | 頁首白底、下緣 `box-shadow: 0 1px 0 var(--line)`；頁尾上緣 `--line`；≤ 640px 底部導覽白底、上緣 `--line`，選中項 `color: var(--brand-deep); font-weight: 700; box-shadow: inset 0 3px 0 var(--brand)`；641～767px 選單按鈕 `--tint` 底無邊框、選中 `--primary` 底白字；≥ 768px 頁籤選中 `color: var(--brand-deep); border-bottom-color: var(--brand)` | AC-38-01、AC-38-04、AC-38-06 |
| 輸入框 | 維持 `1px solid var(--border)`、圓角 8px（AC-38-06 範圍外） | — |

#### 7.19.3 標題列內嵌圖示與名稱（`index.html`、`00-base.css`，FE-56；NM-1、NM-2、AC-38-05）

```html
<h1 class="app-title"><svg class="app-logo" viewBox="0 0 32 32" width="32" height="32" aria-hidden="true" focusable="false"><rect width="32" height="32" rx="7" fill="#1e9bf0"/><path fill="#f7893b" d="（圓角對話框＋左下尾巴）"/><path fill="#ffffff" d="（E、C 兩字的筆畫，以矩形與弧線 path 繪製）"/></svg><span class="app-title__text">EnglishContext</span></h1>
```

| 項目 | 決定 | 理由 |
| :--- | :--- | :--- |
| 形式 | **內嵌 `<svg>`**，1 個 `rect` + 2 個 `path`；總長 ≤ 1,500 bytes | 不產生請求、斷網可顯示；PNG data URI 約 20～40 KB 且 B-7 禁止 `<img` |
| 不寫 | `xmlns`（避免 `http://` 字串）、`<text>`（避免字型差異）、`<image>`、`url(`、漸層、濾鏡 | B-7、§9.1 圖示慣例 |
| 顏色 | 底 `#1e9bf0`（`--brand`，VC-1 允許「標題列圖示」）、對話框 `#f7893b`、字白色 | AC-38-05「藍底、橘色 EC 對話框」；**對話框的橘與 AC-38-01 衝突，見 T-55、SD-FB-39** |
| 尺寸 | CSS `.app-logo { width: 32px; height: 32px; flex: none; }`（24～40 範圍內）；`h1` 為 `display: flex; align-items: center; gap: 8px; min-width: 0`；名稱 `white-space: nowrap`（375px 下「EnglishContext」約 130px，不裁切） | AC-38-05 |
| 無障礙 | `aria-hidden="true"`、`focusable="false"`；`h1` 的 `textContent` = 「EnglishContext」 | AC-38-05、AC-38-10 |
| `<title>` | `<title>EnglishContext</title>`（B-12 改檢查此值，§5.3） | NM-1 |
| 授權註解 | `license-header.txt` 第一行「EnglishContext」，其餘逐字不變 | NM-4、AC-23-06 |
| 不改 | `FROZEN_IDENTIFIERS` 全部（`STORAGE_KEYS`、`BACKUP_FORMAT_ID`、匯出檔名前綴、`dist/english-master-track.html`、`PWA_CACHE_PREFIX`、`emt-build-id`）；`sw.template.js` 註解不改（不屬畫面文字，改了只會多觸發一次 BUILD_ID 變更） | NM-5、NM-6 |

#### 7.19.4 主控台（`views/dashboard.js`、`10-dashboard.css`，FE-58；DB-1～DB-6）

**DOM（順序 = 畫面順序 = Tab 順序）**

```
div.dashboard                                   max-width: var(--content-narrow); margin-inline: auto
├─ h2.page-title.dash-title 「學習主控台」
├─ section.card.db-today [aria-labelledby=db-today-h]
│  ├─ h3.section-title#db-today-h 「今日任務」                    （FB-46 (c) SD 定案）
│  ├─ div.db-today__row                           display:flex; align-items:center; gap:16px
│  │  ├─ div.db-ring-wrap  (svg.db-ring 88px：track --track、bar --brand／達成 .db-ring--done --color-gold；
│  │  │                     中央 span.db-ring__value aria-hidden 只顯示 X)
│  │  └─ div.db-today__side                        flex:1; display:grid; gap:8px; justify-items:start
│  │     ├─ p.db-today__text 「今日已學 X / D 字」（LAYOUT_TEXTS.todayRing）
│  │     ├─ p.db-today__done 「今日目標達成」（X ≥ D 才顯示，aria-live=polite，文字色 --text）
│  │     └─ button.btn.btn--accent.db-start [type=button][data-go=flashcards] 「開始今日學習」
│  └─ p.db-goal [data-color=<appliedColor>]       min-height:44px; display:flex; flex-wrap:wrap; align-items:center
│     ├─ span.db-goal__dot (aria-hidden；background = 色級色，AC-38-03)
│     ├─ span.db-goal__text 「綠級・每日 15 字」（layout.goalLine）
│     ├─ span (aria-hidden)「・」（LAYOUT_TEXTS.goalLineSeparator）
│     └─ button.btn.btn--link.db-change [type=button][data-go=customizer] 「變更」
├─ section.card.db-stats [aria-label=學習數據]   display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px
│  ├─ div.db-stat.db-stat--streak   p.db-stat__label「連續打卡天數」／ p.db-stat__value [svg.db-stat__icon(fill --accent) + span「3」+ span.db-stat__unit「天」]
│  ├─ div.db-stat.db-stat--mastery  p.db-stat__label「單字掌握率」／ p.db-stat__value「25%」／ p.db-stat__sub「已掌握 60 字」
│  └─ div.db-stat.db-stat--accuracy p.db-stat__label「模擬測驗正確率」／ p.db-stat__value「70%」或「—」
├─ section.card.db-chart [aria-labelledby=db-chart-h]
│  ├─ h3.section-title#db-chart-h 「近 7 天已學字數」               （FB-46 (c)）
│  ├─ ol.db-bars [aria-labelledby=db-chart-h]  （7 個 li；空狀態時 hidden）
│  └─ p.db-chart__empty 「開始學習後會顯示紀錄」 （非空狀態時 hidden）
└─ section.card.db-backup [aria-labelledby=db-backup-h]
   ├─ h3.section-title#db-backup-h > button.db-backup__toggle [type=button][aria-expanded][aria-controls=db-backup-body]
   │     span「資料備份」 + svg.db-backup__chev（aria-hidden；展開時 rotate(180deg)，無 transition）
   └─ div#db-backup-body.db-backup__body [hidden 當 backupExpanded = false]
      ├─ p.dash-backup__hint（既有備份說明文字，FB-46 (a) 沿用）
      ├─ div.btn-row  [button.btn.btn--primary「匯出備份」, button.btn「匯入備份」]
      ├─ p.dash-backup__origin（PWA_TEXTS.backupOriginNotice，NT-1）
      ├─ div.dash-backup__install（IN-1 成立時 1 個「安裝 App」，否則 hidden 且無子節點）
      └─ input[type=file].visually-hidden
```

| 項目 | 決定 | AC |
| :--- | :--- | :--- |
| 移除 | `功能入口`（`ENTRIES`、`.dash-entries`）、`學習統計`、`目前目標` 區塊、2 個小環形圖（`.db-mini`）、「今日學習進度」標題；主控台本體不再有 `data-go="sources"` | AC-39-01、AC-39-06、DB-1 |
| 「X / D」只出現 1 次 | 環形圖中央只顯示 X（`aria-hidden`），完整「今日已學 X / D 字」只在 `p.db-today__text`；AC-30-05 的「18 / 15」由此行呈現（SD-FB-40） | AC-39-06、AC-30-05 |
| 「開始今日學習」 | 沿用 router 既有 `[data-go]` 委派：與點導覽「單字卡」走同一個 `router.go("flashcards")`（含換頁動畫、`aria-current` 同步、首次模式守門）；view 不呼叫任何寫入 action；不改 `PersistedData` | AC-39-03、DB-3、E-89 |
| 目標行 | `goalInfoOf` 推導已套用色級（既有邏輯，依 `appliedScore`，DB-4、FB-45）→ `layout.goalLine(levelOf(applied), levelOf(effective))`；色點顏色依已套用色級；「變更」`[data-go=customizer]`，44×44 | AC-39-04、AC-17-06、E-92 |
| 3 格數據 | 值的計算沿用 `learning.masteryRate`、`learning.percentOf`、`streak.displayDays`（既有）；數值 `font-size: 1.75rem`（28px）`; font-weight: 700`；標籤 13px、`overflow-wrap: anywhere`（375px 允許換行）；小字 12px `--text-muted`；格本身無邊框、無背景（在同一張卡片內） | AC-39-05、AC-38-06、AC-38-07、AC-30-10 |
| 長條圖 (a) | `ol.db-bars` 7 欄 grid、固定高 104px：字數行 16px＋4px＋軌道 **64px**＋4px＋日期行 16px（≤ 120）；填色高度 = `heightPct%` × 64px（最高 64 ≤ 80）；今天 `--brand-deep`、其他 `--chart-bar`、軌道 `--track` | AC-39-07 (a)、AC-30-08 |
| 長條圖 (b) | `layout.chartIsEmpty(7 根顯示值)` → `ol` hidden、`p.db-chart__empty` 顯示（14px、`line-height: 24px`、無上下 padding，≤ 48px）；今天學第 1 字後回主控台，`show()` 重算即切回 (a) | AC-39-07 (b)、AC-24-10、AC-30-12、AC-32-02、E-88 |
| 收合 | 點 toggle → `store.actions.setBackupExpanded(!current)`；訂閱 `"dashboard"` tag → 只改 `aria-expanded`、`body.hidden`、`renderInstall()`；焦點留在 toggle（節點不重建）。切頁不重設（runtime 保留）；匯入流程不呼叫 `setBackupExpanded`；重新載入回 false | AC-39-08、DB-6、E-90、E-91 |
| 不互通說明與安裝 | NT-1 位置不變（按鈕列下一個兄弟）；`installVisible` 加 `backupExpanded`（FE-58 改 `core/pwa.js`）；收合時兩者皆不顯示，展開即依 IN-1 顯示 | AC-24-12、AC-34-07、AC-34-08 |
| 寬度 | `.dashboard { max-width: 720px; margin-inline: auto }`：1366／1920 置中 720；768 時 `.app-main` 內容寬 736 → 720；375 填滿 | AC-39-10 |
| 首屏預算（375×667） | 頁首 48 → `main` 上 padding 16 → 標題 41 → 今日卡上 padding 16＋卡片標題 33 → 列（88）：「開始今日學習」下緣約 y = 240，遠小於底部導覽上緣 667 − 56 = 611；1366×768（頁籤導覽約 49）下緣約 y = 290 | AC-39-09 |
| 不寫 localStorage | 展開收合、「開始今日學習」皆 `setItem` 0 次（`store.test.js`、`dashboard.test.js` 以計數替身斷言） | AC-39-03、AC-39-08 |

#### 7.19.5 首次畫面與難易度設定頁（`views/customizer.js`、`20-customizer.css`、`21-custom-vocab.css`，FE-57；FT-1～FT-6、AC-26-01）

**色級列（兩種模式共用；FT-3）**

```
p.cz-vocab-note 「本系統建議字量：右側為內建字數與每日新字量」   （以 LAYOUT_TEXTS.vocabNoteLead 開頭；FB-46 (b) SD 定案；整個列表上方 1 次）
div.cz-levels [role=group][aria-label=色級]          display:grid; gap:8px
└─ button.cz-level.cz-level--<id>[aria-pressed][data-color=<id>]（5 個，COLOR_LEVELS 順序）
   display:flex; align-items:center; gap:12px; min-height:56px; padding:10px 12px; border:2px solid transparent;
   border-radius:14px; background:var(--surface); box-shadow:var(--shadow-card); text-align:left; width:100%
   ├─ span.cz-level__bar      aria-hidden；12×36px；background: var(--color-<id>)
   ├─ span.cz-level__main     flex:1; min-width:0
   │  ├─ span.cz-level__name  「綠」+ span.cz-level__check「✓」（只在 aria-pressed=true 顯示）／鎖定列另加 svg.cz-lock（aria-hidden）
   │  └─ span.cz-level__desc  scenarioZh 或「即將開放」；13px；white-space:nowrap; overflow:hidden; text-overflow:ellipsis
   └─ span.cz-level__side     margin-left:auto; text-align:right; 12px；開放列兩行「5,620 字」「15 字/天」；鎖定列「—」
```

| 項目 | 決定 | AC |
| :--- | :--- | :--- |
| 選中 | `aria-pressed="true"` + `.is-selected`：`border-color: var(--cz-accent)`（色級色）、`background: var(--cz-tint)`（各色淡底，沿用 v0.11 值）、顯示 ✓；同時只 1 列 | AC-26-01、AC-26-02 |
| 鎖定列（藍、金） | `opacity: 0.85`；列內所有文字改 `color: var(--text)`（`#1f2937` 在 0.85 透明度下對白約 9:1，仍 ≥ 4.5:1）；右側只顯示「—」，不得出現「待定」、數字或「20 字/天」 | AC-26-01、AC-38-04、Q-57 |
| 移除 | 卡片內的「（本系統建議字量）」逐列重複、「僅供試算」、「待定」、「已選擇」文字（`T.pending` 只留給一般頁試算區） | AC-01-01 |
| 點選效能 | 只切換 `aria-pressed`／class 與更新摘要行或試算區文字，不重建節點 | AC-22-04、FT-5 |
| 一般頁版面 | `h2.page-title「難易度設定」` → 說明 → 狀態列卡片（既有）→ `section.card` [`h3.section-title「色級」`、說明行、色級列] → 試算結果卡片（既有，`h3.section-title`）→「套用」→ `#customizer-custom`（自訂單字、範本；`21-custom-vocab.css` 標題改 `.section-title` 規格 18px/700、去灰框）；`#view-customizer { max-width: 720px; margin-inline: auto }` | FT-6、AC-25-06、AC-38-06、AC-38-07 |
| 首次畫面版面 | `h2.page-title` 文字改 `firstRunTitle`「選擇你的目標」→ `p.cz-subtitle`（`firstRunSubtitle`，`--text-muted`）→ 色級區（`h3「色級」` 以 `hidden` 隱藏，卡片外觀保留）→ 固定底部列；狀態列、試算結果卡、「套用」、一般說明、舊引導文字 `firstRunGuide` 皆 `hidden` | FT-1、AC-41-01、AC-25-01 |
| 模式切換 | `renderMode` 只切換上述節點的 `hidden` 與 `h2` 文字；首次 → 一般（`"entry"` tag）時不重建色級列 | 既有 FE-32 規則 |
| 確認視窗與初始化 | `onApply`／`openReinitDialog`／`confirmApplyGoal`／`cancelApplyGoal` 流程與文字**不改**；首次畫面「開始學習」「從備份還原」照舊不跳視窗 | US-32、AC-32-08 |

**固定底部列（只在首次畫面；FT-2）**

```
div.cz-firstbar                                  （建在 #customizer-goal 內、色級區之後；DOM 位於頁尾之前 → Tab：色級列 → 開始學習 → 從備份還原 → 頁尾）
├─ p.cz-firstbar__locked 「目前內建字庫到綠色為止」（選中藍、金才顯示；role=status）
├─ p.cz-firstbar__summary 「綠級・每日 15 字　預計 54 週」（aria-live=polite；layout.summaryLine）
├─ button.btn.btn--accent#cz-start 「開始學習」         width:100%
└─ button.btn.btn--link#cz-restore 「從備份還原」       width:100%; min-height:44px
```

```css
/* 20-customizer.css（示意；數值不得改大，--emt-firstbar-h 定義在 00-base.css） */
.cz-firstbar { display: grid; gap: 8px; margin-top: 16px; }
.cz-firstbar__locked, .cz-firstbar__summary { margin: 0; font-size: 14px; line-height: 20px; }
@media (max-width: 640px) {
  .cz-firstbar { position: fixed; left: 0; right: 0; bottom: 0; z-index: 800; margin: 0;
    padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0px));
    background: var(--surface); border-radius: var(--radius-card) var(--radius-card) 0 0;
    box-shadow: 0 -4px 16px rgba(16, 40, 80, 0.12); }
  body[data-entry="firstRun"][data-tab="customizer"] {
    padding-bottom: calc(var(--emt-firstbar-h) + env(safe-area-inset-bottom, 0px) + 8px); }
  body[data-entry="firstRun"][data-tab="customizer"] .toast-root {
    bottom: calc(var(--emt-firstbar-h) + env(safe-area-inset-bottom, 0px) + 12px); }
}
```

| 項目 | 決定 | AC |
| :--- | :--- | :--- |
| 列高預算 | 鎖定行 20 + 摘要 20 + 按鈕 48 + 還原 44 + 3 × 8 間距 + 上下 padding 24 = **180 ≤ 184**（未選藍金時 152）；FE-62 在 375×667 對 5 種選擇量 `offsetHeight ≤ 184` | AC-41-04 |
| 不遮內容 | `body` 底部留白 = 184 + 安全區 + 8；頁尾「資料來源與授權」與每個色級列都能捲到列上方；Toast 上移到列上方；對話框（z-index 1100）在列之上；首次畫面無輸入欄，不需處理虛擬鍵盤 | AC-41-04、E-93 |
| 與底部導覽 | 首次模式已以 `body[data-entry="firstRun"] #app-nav { display: none }` 隱藏導覽（FE-32 規則不變），兩者不會同時出現；列的 z-index 800 < 導覽 900，萬一同時出現也不蓋導覽。規則以 `[data-tab="customizer"]` 限定，首次模式切到「資料來源與授權」頁時不保留空白 | AC-25-01、AC-25-07 |
| > 640px | `position: static`，在色級區下方隨內容排列（AC-41-03 允許）；1366×768 高度預算：頁首 57 + padding 24 + 標題 30 + 副標 33 + 說明 29 + 色級區 352 + 列 158～182 ≈ 733～757 < 768 | AC-41-03 |
| 摘要行 | `firstRunSummary`：L = `colorOf(draftScore)`；`G.estimate(score, 0, nB, nG)` 的 `dailyNewWords`、`weeks`、`basedOnGreen` 與一般頁試算區**同一個函式**（FT-4）；`capped`（藍、金）→ 後綴與鎖定行 | AC-41-02、AC-02-03、AC-02-05、AC-02-10 |
| 首屏預算（375×667） | 頁首 48 + padding 16 + 標題 30 + 副標 33 + 說明 29 + 5 列 × 64 = 476；列固定在底（667 − 152 = 515 起），**不捲動可見摘要行、「開始學習」「從備份還原」**；390×844、412×915、375×812 更寬裕 | AC-41-03 |

#### 7.19.6 模擬測驗進度條與寬度（`views/part5.js`、`40-part5.css`，FE-61；MT-1、MT-2）

```
div.p5                                           max-width: var(--content-narrow); margin-inline: auto
├─ h2.page-title.p5-heading 「模擬測驗」
├─ div.p5-progress [role=progressbar][aria-label=作答進度][aria-valuemin=0][aria-valuemax=N][aria-valuenow=i]
│  └─ span.p5-progress__fill  style.width = percent + "%"
├─ p.p5-heading-note 「題型對應多益 Part 5」
└─ （題目卡／結算卡／空狀態，既有）
```

| 項目 | 決定 | AC |
| :--- | :--- | :--- |
| 推導 | `layout.part5Progress(vm.kind, vm.number, vm.total)`；`visible: false`（題庫空）不建節點 | MT-1、AC-40-01 |
| 樣式 | 軌道 `height: 6px; border-radius: 3px; background: var(--track)`；填色 `background: var(--brand)`；**一律 `transition: none`**（既有 `render()` 每次重建整頁，本就沒有轉場；明寫以防日後誤加） | AC-40-01、AC-38-09 (b) |
| 更新時機 | 既有 `part5` tag 訂閱 → `render()`；「下一題」、結算（100%）、「重新開始」（1 ÷ N）、重新載入（由持久化 `part5` 推導）皆自動正確；≤ 100ms | AC-40-01、AC-11-05 |
| 區塊標題 | `.p5-number`（第 i / N 題）、`.p5-explain__title`、`.p5-summary__title` 改 18px／700 | AC-38-07 |
| 卡片 | 題目區 `.card.p5-question` 套 §7.19.2；作答選項 `.p5-option` 維持 `--border` 外框與對錯色（AC-38-06 範圍外、AC-38-03） | AC-38-06、AC-40-03 |
| 寬度 | `.p5 { max-width: 720px; margin-inline: auto }` | AC-40-02 |

#### 7.19.7 單字卡頁只換配色（FE-59；AC-38-08）

| 項目 | 決定 |
| :--- | :--- |
| 不改 | `views/flashcards.js`、`views/speech-panel.js`、`views/flashcard-quiz.js` 一行不改（元素順序、按鈕數量與文字、卡片內容、收音條位置自然相同） |
| 幾何固定 | `.card` 全域改圓角 16px 與陰影後，於 `30-flashcards.css` 以 `#view-flashcards .card { border: 1px solid var(--line); border-radius: var(--radius); box-shadow: none; }` 固定為 v0.11 幾何（只有框線顏色改變）；`.btn` 全域只換顏色（1px 透明邊框與 8px 圓角維持） |
| 顏色 | `var(--primary)` 自動成為深品牌色；`31-speech.css` 收音條暗格維持 `--border`、亮格 `--correct`；分隔線 `--border` → `--line`；四選一選項（`32-quiz.css`）維持 `--border` 外框與對錯色 |
| 數字 | 「第 i / N 張」由全域 `tabular-nums` 滿足 AC-38-07，不改字級 |
| 新版提示列 | `80-pwa.css` 上下框線 `--border` → `--line`，其餘不變 |

#### 7.19.8 名稱、來源名稱與不改清單（CT-24、FE-56、FE-60；NM-1～NM-6、DS-19、DS-20）

| 位置 | 改為 | 任務 |
| :--- | :--- | :--- |
| `<title>`、標題列 `h1` | EnglishContext | FE-56 |
| 授權註解第一行 | EnglishContext | FE-56 |
| `src/data/sources.js` ORIGINAL `fullName`、`_tools/lib.mjs` 同字串 | EnglishContext 原創內容 | CT-24 |
| 「資料來源與授權」頁 | v0.11 的頁面**沒有**列出 ORIGINAL 項目；新增一行「原創內容來源：EnglishContext 原創內容」（名稱取資料，不寫死，SD-FB-49） | FE-60 |
| `_fixtures.js` ORIGINAL `fullName` | EnglishContext 原創內容 | FE-60 |
| 不改 | 鍵名、備份 `format`、匯出檔名前綴、交付檔名、快取前綴、`emt-build-id`、`PWA_APP_NAME`（已是 EnglishContext）、`sw.template.js` 註解 | — |

#### 7.19.9 PWA 同步（FE-56；VC-5、AC-34-04、AC-38-02、Q-54）

| 項目 | v0.11 | v0.12 | 同步點 |
| :--- | :--- | :--- | :--- |
| `PWA_THEME_COLOR`、`PWA_MANIFEST.theme_color`、`<meta name="theme-color">` | `#2f6fd6` | `#1e9bf0` | `core/pwa.js`、`index.html`；B-12 逐字比對 meta 與常數 |
| `PWA_BACKGROUND_COLOR`、`PWA_MANIFEST.background_color`、`--bg` | `#f6f7f9` | `#eef4fa` | `core/pwa.js`、`00-base.css`；B-11 比對 |
| `<title>` | English Master Track | EnglishContext | `index.html`；B-12 |
| BUILD_ID | — | 隨內容改變（正常） | 已安裝者看到更新提示；舊快取由 SW-9 清除（前綴不變） |

三處（`core/pwa.js`、`00-base.css`、`index.html`）在 **FE-56 同一任務**內修改，避免中間狀態建置中止（T-60）。

#### 7.19.10 效能、減少動態、鍵盤與無障礙評估

| 面向 | 既有 AC | 改版影響 | 結論／對策 |
| :--- | :--- | :--- | :--- |
| 首次載入 | AC-22-05、AC-35-04（≤ 3 秒／≤ 6 秒） | 量測點改為「開始今日學習」可點擊；主控台節點比 v0.11 少（移除 3 區塊與 2 個 SVG 環）；CSS 多約 4 KB；SVG 圖示 < 1 KB | 不增加風險；FE-62 以無頭瀏覽器量 1 次作參考 |
| 換頁 | AC-22-01、AC-39-03（≤ 100ms） | 「開始今日學習」走既有 `router.go`，單字卡頁閒置預建不變 | 不變 |
| 點色級 | AC-22-04、FT-5 | 色級列改精簡、不重建；首次畫面多更新 2 個文字節點 | 不變 |
| 進度條 | AC-40-01（≤ 100ms） | 每次 `render()` 已重建題目卡，多 2 個節點 | 可忽略 |
| 繪製成本 | — | 卡片 `box-shadow` 約 10 張、鎖定列 `opacity`、固定底部列 | 皆為靜態合成，無動畫；不使用 `backdrop-filter`、`filter` |
| 減少動態 | AC-31-03、AC-38-09 (b) | 新增的展開收合、箭頭旋轉、進度條、按鈕狀態**都不設 transition／animation**；全域 `05-motion.css` 的 reduce 規則仍在 | 兩種模式行為相同，不需額外分支；主環形圖既有 `--emt-dur-ring` 轉場照舊受 reduce 規則關閉 |
| 鍵盤 | AC-28-07、AC-38-09 (a) | 新控制項全為原生 `<button>`（Enter／空白鍵與點擊相同）；DOM 順序 = 畫面由上到下；首次畫面固定列在 DOM 中位於色級列之後、頁尾之前 | `:focus-visible` 3px；觸控目標 ≥ 44×44（`.btn` min 44、`.btn--accent` 48、色級列 56、「變更」「從備份還原」44） |
| 螢幕閱讀器 | — | toggle `aria-expanded`／`aria-controls`；進度條 `role=progressbar`；色級列 `aria-pressed`；裝飾圖示 `aria-hidden` | 無新 ARIA 風險 |
| 對比 | AC-38-04 | 見 §7.19.1 數值；鎖定列以深色字抵消 0.85 透明度 | QA 以工具量測（§10.5） |
| 版面溢位 | AC-20-01 | 新容器皆 `min-width: 0`、`overflow-wrap: anywhere`；3 格數據在 375px 每格約 93px，標籤允許換行 | FE-62 以 `scrollWidth ≤ clientWidth` 在 6 種尺寸檢查 |

### 7.20 版本號與介面精簡（v0.9；PRD R-22、US-42、US-43、AC-01-08、AC-39-04；契約 §12、§5.8 HT-6～HT-9、DS-26～DS-31）

原則：**不改資料流與持久化**。版本行是靜態文字（只讀 DOM meta），其餘三項只改 view 的文字與樣式；store、router、localStorage 寫入時機一律不變。

#### 7.20.1 頁尾版本行（`ui/version-line.js`、`main.js`、`00-base.css`，FE-64；VR-5～VR-8、DS-30）

**由誰讀、何時讀**：`ui/version-line.js` 的 `init()` 讀 `<meta name="emt-app-version">` 與 `<meta name="emt-build-id">` 的 `content`，**整個頁面期間只讀一次**；`main.js` 在 `banner.render` 之後、`pwa.start` 之前以 `step("versionLine.init", …)` 呼叫（與 store、entryMode 無關，放在 `router.start` 前使首次繪製即含版本行）。不訂閱 store、不因切頁重繪——頁尾 `#app-footer` 位於 `#app-main` 之外，所有畫面（首次畫面、4 個功能區、「資料來源與授權」頁）共用同一個節點，因此**每個畫面恰 1 行**由 DOM 結構保證。

**DOM（頁尾）**

```
footer#app-footer.app-footer                     （既有；text-align:center；color:var(--text-muted)）
├─ button#footer-sources.btn.btn--link[data-go=sources] 「資料來源與授權」   （既有，位置與行為不變，AC-23-02）
├─ p#app-version.app-footer__version 「版本 1.0.0（建置 3f9a2c1）」         （v0.9 新增，由 JS 建立；不合法時不存在）
└─ button#footer-first-run-back.btn.btn--link[data-go=customizer] 「返回難易度設定」（既有，只在首次模式＋資料來源頁顯示）
```

| 項目 | 決定 | 依據 |
| :--- | :--- | :--- |
| 元素 | `<p>`（區塊元素，自然換到連結的下一行 =「正下方」）；無 `tabindex`、無 `role`、無事件、不是 `<a>`／`<button>` → Tab 順序不含此行、不可點擊 | VR-7、V-VER-03、AC-42-01 |
| 寫入方式 | `core/dom.js` 的 `el("p", { attrs: { id: "app-version" }, className: "app-footer__version", text })`（`textContent`，C-7） | VR-7 |
| 為什麼不寫在 `index.html` | 不合法時「整行不渲染」最簡單的保證是**節點不存在**；`index.html` 只多一個 meta（B-17），頁尾 HTML 不變，`first-run.test.js` 對頁尾的既有斷言不受影響 | VR-8、T-67 |
| 樣式（`00-base.css`） | `.app-footer__version { margin: 4px 0 0; font-size: 0.75rem; line-height: 1.5; color: var(--text-muted); white-space: nowrap; }`；不設 `background`、不用 `--accent`、`--brand` | VR-7、VC-3、VC-7 |
| 對比 | `--text-muted` `#5b6472` 對頁尾背景（`body` 的 `--bg` `#eef4fa`）約 5.4:1、對白約 6.0:1，≥ 4.5:1 | AC-38-04、AC-42-01 |
| 375px 不裁切、不換行 | 文字約 23 字元（6 個全形 + 17 個半形）× 12px ≈ 185px，遠小於 375 − 32 = 343px；`white-space: nowrap` 防止換成兩行 | AC-42-01 |
| `file://` 與 https 相同 | 兩者是同一份 HTML（DP-2），meta 值相同 → 文字相同；不讀 `location`、不讀 service worker | AC-42-01、VR-9 |
| 不請求、不儲存 | 只呼叫 `querySelectorAll`；不 `fetch`、不 `import`、不讀 `package.json`；不呼叫 store、不碰 localStorage | AC-42-03、VR-5、VR-6 |
| 異常值 | 任一 meta 缺少／重複、版本不符 `APP_VERSION_PATTERN`（含 `@@APP_VERSION@@`、`v1.0.0`）、BUILD_ID 不符 `PWA_BUILD_ID_PATTERN`（含 `@@BUILD_ID@@`、長度錯誤、大寫）→ `versionLineText` 回 `null` → 不建節點；`init` 吞掉所有例外且不 `console.error` | VR-8、V-VER-04 |

**底部遮擋與 AC-41-04（確認，不需新留白）**

| 情境 | 既有留白 | 版本行加入後 | 結論 |
| :--- | :--- | :--- | :--- |
| ≤ 640px 一般模式（底部導覽列） | `body { padding-bottom: calc(var(--emt-bottomnav-h) + safe-area + 8px) }`（AC-27-03） | 頁尾多約 22px（4 + 18）；留白以導覽列高度計，與頁尾高度無關 | 捲到底時 `#app-version` 下緣 ≤ 導覽列上緣 − 8px |
| ≤ 640px 首次畫面（固定底部列） | `body[data-entry="firstRun"][data-tab="customizer"] { padding-bottom: calc(184px + safe-area + 8px) }`；列實高 ≤ 180（§7.19.5） | 同上；頁面最後元素由「資料來源與授權」連結改為版本行 | 捲到底時 `#app-version.bottom ≤ .cz-firstbar.top`（餘裕 ≥ 12px）。Tab 順序不變：色級列 →「開始學習」→「從備份還原」→ 頁尾連結（版本行不可聚焦） |
| ≤ 640px 首次模式的「資料來源與授權」頁 | `body[data-entry="firstRun"] { padding-bottom: 0 }`，無固定列、無導覽 | 版本行之後是「返回難易度設定」 | 無遮擋 |
| > 640px | 無固定元素 | — | 無遮擋 |
| Toast | 既有規則已上移到導覽列／固定列上方 | 不變 | Toast 為暫時元素，不影響捲到底的量測 |

結論：**不改** `--emt-firstbar-h`、`--emt-bottomnav-h` 與任何留白規則；FE-69 以無頭瀏覽器在 375×667 量測上表兩種情境（AC-41-04、AC-42-01、E-95）。若量測不符，只在 `90-overrides.css` 修正（FE-69 paths）。

#### 7.20.2 隱藏領域範本與「範本」字樣（`views/custom-vocab.js`、`views/flashcards.js`，FE-68；HT-6～HT-9、DS-27、DS-28、FB-51）

**範本區塊**：`buildTemplates()` 回傳的 `section.card.cv-section` 就是 HT-6 的「同一個外層容器」（內含標題「領域範本」、說明、3 個按鈕、`MSG_TEMPLATE_MISSING`、注入結果 `tplStatus`）。建立時即設 `attrs: { "aria-labelledby": "cv-tpl-title", hidden: true, inert: "" }`，之後任何程式路徑都不改回可見（比照 §7.17 分數區）。

| 項目 | 決定 | 依據 |
| :--- | :--- | :--- |
| 計算後 `display: none` | 全域 `00-base.css` `[hidden] { display: none !important; }` 已存在；`21-custom-vocab.css` 對 `.cv-section`／`.card` 無 `display` 規則 → 不需改 CSS。`display: none` 的元素沒有外距 → 「新增自訂單字」卡與「自訂單字清單」卡之間只剩既有的 `.card` `margin-bottom: 12px`，不留空白 | HT-6、AC-43-01 |
| 不可聚焦、不可觸發 | `hidden`（不渲染、不在 Tab 順序）+ `inert`（即使日後 CSS 誤覆寫也不可互動）；按鈕的 `click` 監聽保留但無法觸發 | HT-6 |
| DOM 順序 | `#customizer-custom` 子節點仍為 3 個（表單、範本、清單），保留 BUG-002 預建邏輯與 `custom-vocab.test.js` 既有「3 區」斷言 | 不回歸 |
| 保留 | `TEMPLATE_ORDER`、`templateButtons`、`templateLabel`、`injectMessage`、`onTemplate`、`store.actions.injectTemplate`、`core/custom.js` 注入規劃、`templates.js` 打包 | HT-8 |
| 首次畫面 | `#customizer-custom` 在首次模式本來就 `display: none`（FE-32 規則），不變 | HT-6、FS-3 |

**畫面文字定案（DS-27；HT-7 (a)(b)）**

| 位置 | v0.13 文字 | v0.14 文字（逐字） | 檢查 |
| :--- | :--- | :--- | :--- |
| `custom-vocab.js` 自訂清單空狀態 `.cv-list__empty` | 尚未新增自訂單字。可用上方表單新增，或注入領域範本。 | **尚未新增自訂單字。可用上方表單新增。** | 仍引導使用表單；以「。」結尾；無「或」「、」「，」結尾、無空括號、無「English Master Track」 |
| `flashcards.js` 單字卡空狀態 `.fc-empty__hint` | 請到難易度設定選擇色級並按「套用」，或新增自訂單字、注入領域範本。 | **請到難易度設定選擇色級並按「套用」，或新增自訂單字。** | 仍引導至難易度設定（AC-06-06，下方「前往難易度設定」按鈕不變）；「或」後接完整動詞片語；以「。」結尾 |
| `custom-vocab.js` 清單項目來源標示（`origin = "template"`） | 「自訂擴充」+「範本：資工」 | **只顯示「自訂擴充」**（`.cv-badge`，與表單新增的字相同），不建立 `.cv-item__source` | FB-51 由 SD 定：**不另顯示領域名稱**。理由：(1) 領域名稱單獨出現（如「資工」）會讓使用者尋找已隱藏的功能；(2) AC-43-03 只要求「自訂擴充」；(3) 兩種來源外觀一致，日後開放範本時再由 PRD 決定是否恢復 |
| 範本區內文字（「領域範本」、說明、`MSG_TEMPLATE_MISSING`、注入結果） | 原文 | **不改**（位於 HT-6 隱藏容器內，HT-7 豁免）；注入結果 Toast 只在 `onTemplate` 內，無法觸發 | HT-7 |
| 其他畫面字串 | — | 已以原始碼搜尋確認：`src/app` 非測試檔中可見字串含「範本」者只有上列 4 類；其餘命中皆為註解 | V-ST-17 |

`custom-vocab.js` 以模組常數 `EMPTY_TEXT` 保存空狀態文字並匯出（測試比對用，比照 `CUSTOM_BADGE`）。

**已注入單字（HT-9、AC-43-03）**：不需改程式——`persist`／`backup`／`reinit`／`store` 對 `origin = "template"` 的處理不變；FE-68 以單元測試鎖定（載入含 10 個範本字 + 1 個表單字的 v2 狀態 → 清單 11 項、皆只有「自訂擴充」、無「範本」；`addCustomWord("latency")` → `duplicate`；刪除 1 個範本字 → 其餘不變；`exportBackup` 的 `customVocab` 各欄位與原值相同）。

#### 7.20.3 難易度設定頁狀態列（`views/customizer.js`、`20-customizer.css`，FE-67；LS-1～LS-5、AC-01-08）

```
div.cz-status-slot                                  （既有容器，首次模式 hidden，FE-32 規則不變）
└─ section.card.cz-status [aria-label=目前色級]
   └─ p.cz-status__line#cz-st-line 「目前色級：綠」   （layout.levelStatusText(levelOf(goal.effectiveColor))）
```

| 項目 | 決定 | AC |
| :--- | :--- | :--- |
| 文字來源 | `goal.effectiveColor`（已套用值；讀取時由 V-ST-02 重算）。**不看** `draftScore`、`appliedColor` | LS-1、LS-2、AC-01-08 (1)(3) |
| 更新時機 | 沿用既有 `renderStatus()` 的呼叫點（`goal` tag：套用、確認初始化、匯入、`init`）；點色級卡片只更新 `draftScore` 不呼叫 `renderStatus` → 狀態列不變；取消初始化確認不改 `goal` → 不變 | LS-2、AC-01-08 (2)、AC-01-03 |
| 移除 | `dl.cz-rows--status` 兩列（「目前目標色級」「目前生效色級」）、`statusCap`（「目前內建字庫到綠色為止」）、`T.statusTarget`、`T.statusEffective`、`T.builtinCap`；`aria-label`「目前目標狀態」改為「目前色級」；`20-customizer.css` 的 `.cz-rows--status` 規則刪除 | LS-3 |
| 不改 | 試算區（`#cz-est-color` 的「藍（即將開放）」、`refs.cap` 的 `lockedNotice`、「以目前內建字庫上限（綠）試算」）——屬試算區，照 AC-01-07、AC-02-10 顯示（字串不含「內建上限」連續 4 字） | LS-3、AC-02-10 |
| 樣式 | `.cz-status__line { margin: 0; font-size: 1rem; font-weight: 600; white-space: nowrap; }`（文字最長 6 字，375px 不裁切）；卡片 padding 沿用 `.card` | AC-01-08 |
| 首次畫面 | 狀態列容器仍 hidden（FS-3、LS-4） | LS-4 |

#### 7.20.4 主控台目標行與「變更」按鈕（`views/dashboard.js`、`10-dashboard.css`，FE-66；DB-4（v0.14）、AC-39-04、Q-61）

```
p.db-goal [data-color=<effectiveColor>]            display:flex; flex-wrap:wrap; align-items:center; gap:8px; min-height:44px
├─ span.db-goal__dot (aria-hidden；色級色 = 生效色級)
├─ span.db-goal__text 「綠級・每日 15 字」          （layout.goalLineText(levelOf(effectiveColorId))；結尾無「・」）
└─ button.btn.db-change [type=button][data-go=customizer] 「變更」   margin-left:auto（行末）
```

| 項目 | 決定 | AC |
| :--- | :--- | :--- |
| 文字 | 一律 `goalLineSame` 以**生效**色級組字：橘「橘級・每日 10 字」、棕「棕級・每日 10 字」、綠／藍／金「綠級・每日 15 字」；`.db-goal__sep`（「・」）節點刪除；`goalInfoOf` 不再附加「（內建上限）」 | AC-39-04、DB-4、E-92 |
| 色點 | `data-color` 改為**生效**色級（藍、金套用時為綠點），與文字一致；色值仍為既有 `--color-*` 變數 | DB-4「不看 appliedColor」、AC-38-03（SD-FB-53） |
| 「變更」樣式（外框按鈕） | 移除 `btn--link`；`.db-change { min-height: 44px; min-width: 44px; margin-left: auto; padding: 0 14px; background: var(--surface); border: 1px solid var(--brand-deep); color: var(--brand-deep); font-weight: 600; text-decoration: none; }`；`@media (hover: hover) { .db-change:hover { background: var(--tint); } }`；焦點框沿用全域 `:focus-visible`（3px `--focus`） | AC-39-04、V-LAY-10 |
| 計算後樣式自檢 | 背景 `#ffffff` 不透明且四邊 1px solid；無底線；字／底／框皆非 `#f7893b`、`#d5d9e0`；`#0866ad` 對白 6.0:1、對 `--tint` 約 5.2:1；≥ 44×44 | AC-38-01、AC-38-04、AC-38-06、AC-38-09 |
| 行為 | 不變：沿用 `[data-go=customizer]` 委派 → `router.go("customizer")`（一般難易度設定頁）；`<button>` 原生支援 Enter／空白鍵；不寫 localStorage；減少動態下無轉場（router 既有規則） | AC-39-04、AC-25-06、AC-31-03 |
| 375px | 文字約 120px + 按鈕約 60px + 色點與間距 < 343px，同一行；極端字級下 `flex-wrap` 讓按鈕換行而不重疊、不裁切 | AC-39-04 |
| tokens 規則 | 規則選擇器 `.db-change` 不含 `.btn` 字樣，但仍遵守 §7.19.1 禁止寫法：不用 `var(--border)`、`#d5d9e0`、`var(--accent)`、`color: var(--brand)` | T-62 |

#### 7.20.5 效能、無障礙與不改清單

| 面向 | 影響 | 結論 |
| :--- | :--- | :--- |
| 首次載入（AC-22-05、AC-35-04） | 啟動多 1 次 `querySelectorAll` 與 1 個節點 | 可忽略 |
| 點色級（AC-22-04） | 狀態列不再隨點色級更新（本來就不更新） | 不變 |
| 最大單字集（AC-22-02 v0.14） | 範本入口隱藏；QA 改以表單、匯入備份或 DevTools 建立 30 個自訂單字（PRD 已改寫），程式不變 | FE-69 回歸 |
| 鍵盤 | 版本行不可聚焦；範本按鈕 `inert`；「變更」仍為原生 `<button>` | AC-38-09、AC-43-01 |
| 螢幕閱讀器 | 版本行為一般段落；狀態列 `aria-label`「目前色級」與可見文字一致 | — |
| 不改 | localStorage 鍵名與欄位、`schemaVersion` 2、備份格式、`FROZEN_IDENTIFIERS`、`PWA_*` 常數、service worker 範本、`src/data/` | DS-31、VR-6 |

### 7.21 學習位置與作答紀錄（v0.10；PRD R-23、US-44～US-47、Q-63～Q-71；契約 v0.15 §5.3、§5.10～§5.12、§6、DS-32～DS-39）

#### 7.21.1 v2 → v3 遷移、讀取順序與測試樣本（DS-32；MG-5～MG-8、RD-3、RD-4、IM-9、IM-10、V-ST-21）

**讀取 localStorage**（`persist.parseStored` → `store.init`）：

```
parseStored(raw)
 ├ null／undefined → missing（FS-1：首次畫面，不寫入）
 ├ 非字串、JSON 失敗、頂層非物件、schemaVersion 缺失／非整數／不在 [1, 2, 3]、data 非純物件 → unreadable（RS-1～RS-4）
 ├ migrate：1 ─MIGRATIONS[1]（MG-2）→ 2 ─MIGRATIONS[2]（MG-6：3 欄一律覆寫為預設）→ 3；原為 3 不遷移
 ├ resetLearningFields（RD-1）            ← v0.10 起「不論是否遷移」都執行（T-76）
 ├ resetTrackFields（RD-3 (a)～(d)）      ← 任何版本都執行（遷移後 3 欄已是預設，結果不變）
 └ validateStorageRecord（schemaVersion 3、必填 9 欄／允許 12 欄、3 欄 shape、V-ST-03）→ ok｜unreadable
store.init（kind = ok）
 ├ normalizeAfterLoad(data, Q, today, bankIds)：V-ST-02 → V-ST-05 → V-ST-09～11 → UO-4（只改記憶體，RD-4）
 ├ migrated（原版本 1 或 2）→ buildRecord（schemaVersion 3）→ validateStorageRecord → tryWrite 一次（MG-7；失敗不提示，下次啟動再遷移，結果相同）
 └ initialRuntime：buildStudySet → placeCard（FP-2，記憶體中的位置更新為目前卡片，不寫入）
```

冪等（AC-47-04「不再重複升級」）：寫回後的主鍵為 3，下一次啟動不遷移、RD-3 對已正規化的值為恆等、讀取路徑不呼叫 `setItem`（RD-4），因此 localStorage 位元組不變。

**匯入備份**（`backup.importSteps` → `store.importBackup`）：步驟 3 支援 `[1, 2, 3]`（錯誤訊息「1、2、3」由 `SUPPORTED_SCHEMA_VERSIONS.join("、")` 產生）；步驟 4 `v < 3` → `persist.migrate` 串接（MG-8，頂層 `schemaVersion` 原值保留給步驟 5）；步驟 5 既有 IM-8 + 新 3 欄「存在時 shape」（IM-9 → `format`）；步驟 7 既有清理 → `normalizeTrackItems`（IM-10 (1)～(3)）→ `normalizeAfterLoad(…, part5Ids)`（含 UO-4，IM-10 (4)）→ 防禦驗證；步驟 8 寫入 `schemaVersion` 3；步驟 9 `placeCard`（FP-6）。

**測試樣本來源（FE-70；「v0.14 實際寫出的資料形狀」）**：

| 檔案（`src/app/__tests__/_samples/`） | 內容 | 取得方式 |
| :--- | :--- | :--- |
| `v014-state.json` | v0.14 程式寫入 localStorage 主鍵 `englishMasterTrack:state` 的**原字串**（單行 JSON，`schemaVersion` 2、`data` 9 欄） | **首選**：以目前的 `dist/english-master-track.html`（v0.14 交付檔，`emt-app-version` = 1.0.0；FE-70 先記錄其 SHA-256）在無頭 Chromium 以 `file://` 執行下方操作序列後 `localStorage.getItem` 取得。**退回**（無瀏覽器）：先 `node tools/build.mjs --out <scratchpad>/v014.html` 並與 `dist/english-master-track.html` 比對位元組相同（證明 `src/` 仍為 v0.14），再以未修改的 `state/store.js` + 假 storage + `_fixtures.loadContent()` 執行同一序列，取主鍵最後一次 `setItem` 的字串 |
| `v014-backup.json` | v0.14 主控台「匯出備份」下載檔的**原始位元組**（`JSON.stringify(file, null, 2)`，頂層 5 欄） | 同上（瀏覽器取下載檔；退回時取 `exportBackup().json`） |
| `v07-state.json` | v0.7（`schemaVersion` 1、`data` 7 欄）的 localStorage 原字串 | 逐字複製 `persist.test.js` 的 `V07_RAW`（FE-22 依 v0.7 實際格式建立，內含冗餘色級不一致與 `currentIndex` 超出題庫等需一般讀取流程處理的值） |
| `v07-backup.json` | v0.7 格式的備份檔 | 由 `v014-backup.json` 刪除 `todayLearned`、`learnedHistory` 並把 `schemaVersion` 改為 1（與 QA `e2e-firstrun.mjs` 既有作法相同；v0.7 匯出程式已不存在） |
| `README.md` | 產生方式（首選或退回）、操作序列、產生時的**本地日期 D 與時區**、`dist` 檔 SHA-256、4 個樣本的 SHA-256 | — |

操作序列（使樣本涵蓋 AC-47-04 列舉的全部既有資料）：(1) 清除網站資料 → 首次畫面點「棕」→「開始學習」；(2) 表單新增自訂單字 `Monetization`、`Latency`；以 Console 呼叫 `EMT.store.actions.injectTemplate("cs")` 加入 `origin = "template"` 的單字（模擬 v0.13 以前的使用者，HT-9）；(3) 單字卡翻面 3 張、切到測驗模式作答 4 題（含答對與答錯）；(4) `EMT.store.actions.acknowledgeSttNotice()`；(5) 模擬測驗作答 5 題（對錯混合），第 6 題作答後**不按**「下一題」（`lockedSelection` 非 null）；(6) 難易度設定點「綠」卡片但**不套用**（`draftScore` ≠ `appliedScore`）；(7) 讀主鍵、匯出備份。若 Playwright 的 `page.clock` 可用，(1)～(3) 在 D − 1、(4)～(7) 在 D 執行，使 `learnedHistory` 有 2 天、`streak.days` = 2；不可用時單日即可，README 註明。

**使用方式**：樣本**唯讀**（D-15）。`migrate-v3.test.js`（FE-73）與 `store-track.test.js`（FE-74）以 `now` = D 當天 12:00（本地）讀取樣本，斷言 V-ST-21 (a)～(d)；另以 D + 1 的 `now` 再跑一次，只允許 V-ST-09～V-ST-11 換日正規化造成的差異（`todayLearned` 變預設、`learnedHistory` 去掉超窗鍵），其餘欄位仍深度相等。

**既有測試中寫死 `schemaVersion` 2 的位置（DS-32、C-8；全部由 FE-73 改寫）**：

| 檔案 | 位置（v0.14 行號） | 改寫方式 |
| :--- | :--- | :--- |
| `__tests__/goal.test.js` | 84、85、115 | `CURRENT_SCHEMA_VERSION` 3、`SUPPORTED_SCHEMA_VERSIONS` `[1, 2, 3]`；`LEARNING_PROGRESS_FIELDS` 7 項 |
| `__tests__/persist.test.js` | 63（`record()` 產生 2）、286（9 欄必填）、357、418、431、448、451、470、483、485 | `record()` 改為產生 3 並補 3 欄；保留一個明確的 `v2Record()` 走遷移路徑；v1 遷移結果改為 3 |
| `__tests__/backup.test.js` | 51、83、132、408、427、429、438、458（9 欄）、490、605（「1、2」） | 匯出 3、12 欄、支援版本「1、2、3」；`backupObj` 預設 3，另保留 2、1 的匯入案例 |
| `__tests__/store.test.js` | 105～108（`assertWritten`）、126、472、485、1187、1204、1234、1358、1376、1440、1444、1550、1559、1665、1683、1876、2029、2182、2193 | 斷言改為 `C.CURRENT_SCHEMA_VERSION`（不再寫死數字）；以 v2 字串預寫主鍵的案例會在 init 多 1 次遷移寫回（MG-7），計數 `setCalls` 的斷言需改為「預寫 v3」或明確扣除 |
| `__tests__/first-run.test.js` | 351 | 同上，改用常數 |
| `__tests__/_fixtures.js` | 423（註解） | 註解改為「目前版本」；`makeStore` 已以 `buildRecord(defaultData())` 預寫，自動成為 3 |
| `__tests__/dashboard.test.js` | 558（以 v2 預寫主鍵） | 改為以 `buildRecord` 預寫 v3；若保留 v2 則需容許遷移寫回 |
| `__tests__/custom-vocab.test.js` | 601（以 v2 預寫 v0.13 範本資料） | 保留 v2（正好驗 HT-9 經遷移不變），斷言改為「遷移後 3 欄為預設、`customVocab` 逐欄相同」 |
| `__tests__/reinit.test.js` | `LEARNING_PROGRESS_FIELDS` 相關 4 處 | 7 欄；`buildReinitData` 結果另含 `flashcardPosition: null`、`part5UnansweredOnly` 原值 |

QA 的 `tests/e2e/` 也有 13 處（`e2e-cards.mjs`、`e2e-goal.mjs`、`e2e-firstrun.mjs`、`e2e-layout.mjs`、`e2e-progress.mjs`、`e2e-pwa.mjs`、`e2e-pwa-update.mjs`、`e2e-reinit.mjs`、`e2e-version.mjs`、`lib/state.mjs`），不屬 PG 任務，列入 SD-FB-57 交 QA 更新。

#### 7.21.2 單字卡上次位置（DS-33；FP-1～FP-9、V-ST-18）

**歸屬**：解析規則（FP-2）放在 L1 `core/position.js`（純函式、可單元測試）；何時解析、何時寫入由 store 決定。view **不**讀寫位置。

| 時機 | 掛點（唯一） | 位置結果 | 寫入 |
| :--- | :--- | :--- | :--- |
| 啟動讀取 | `store.init` → `placeCard` | `resolve` 結果 | 不寫（RD-4） |
| 上一張、下一張、左右滑動、測驗模式換題 | `views/flashcards.js` 既有的 `step()`、`onTouchEnd()` → **`store.gotoCard`**（全專案唯一改變 `index` 的使用者入口） | `fromIndex(set, i)` | 同一事件一次 `setItem`（FP-3） |
| 翻面、切換單字卡／測驗模式、重複點擊、進入單字卡頁、由主控台「開始今日學習」進入 | — | 不變 | 不因位置寫入（翻面依 LR-3 寫學習紀錄時，整筆寫出會帶上目前位置） |
| 新增自訂單字、範本注入、刪除自訂單字 | `placeCard`（FP-5） | `resolve` 結果 | 與 `customVocab` 同一次 |
| 套用且生效色級改變（直接套用、初始化「確定」） | `appliedGoalState`／`reinit.buildReinitData` | `null`、`index = 0` | 與 `goal` 同一次（FP-4、CI-5） |
| 套用但生效色級未改變（綠 ↔ 藍 ↔ 金、同色重套用） | `appliedGoalState` | 不變；`flashcard` 整個不變 | `goal` 有變才寫（FB-54） |
| 初始化「取消」 | — | 不變 | 0 次（CI-9） |
| 首次「開始學習」 | `startLearning` | `null` | 第一筆寫入 |
| 匯入 | 步驟 7 `position.normalize`；步驟 9 `placeCard` | 步驟 8 寫備份值；解析結果在下次寫入寫出 | 步驟 8 |
| localStorage 停用 | 同上 | 只更新記憶體；同一工作階段回到單字卡頁仍是該張 | 不寫（FP-9、WR-3） |

**不變式 INV-FP**（`store-track.test.js` 在每個 action 之後斷言）：單字集 N > 0 時，記憶體 `data.flashcardPosition` 為 `null`（此時 `runtime.flashcard.index` 必為 0）或等於 `position.fromIndex(studySet, index)`；N = 0 時保留原紀錄。`null` 與「第 1 張」等價，因此 FP-4 的 `null` 與 FP-2 (2) 的「解析後更新為第 1 張」不衝突。

**取代舊邏輯**：`deleteCustomWord` 不再呼叫 `custom.indexAfterDelete`，`addCustomWord`／`injectTemplate` 不再呼叫 `keepCurrentCard`（store 內刪除此函式），三者都改用 `placeCard`。等價性：刪除第 i 張（0 起算，ordinal = i + 1）後 N′ = N − 1，`min(i + 1, N′) − 1` = i（非最後一張，即原本的下一張）或 N − 2（原為最後一張，即前一張），與 AC-04-08 相同。`core/custom.js` 的 `indexAfterDelete` 與其測試保留（不在本版任務 paths），標為「store 不再使用」。

**寫入相對於畫面更新**：`gotoCard` 先 `writeData`（同步 `setItem`，約數毫秒）再 `notify` 重繪，維持「一個事件一次通知」；FE-74 以 1,000 個自訂單字的狀態量測 200 次 `gotoCard` 平均耗時（Node）須 < 5 ms，QA 再以瀏覽器量 AC-44-02（≤ 100 ms）。若實測超標，改為「先 notify 後寫入、quota 時再補一次 `learningQuota` 通知」（T-78 對策），不需改契約。

#### 7.21.3 模擬測驗狀態機（DS-34；CR-1～CR-9、UO-1～UO-9、MT-1、V-ST-19、V-ST-20）

全部轉移集中在 `core/part5flow.js`；store 只負責取 `bankIds`、組 `data`、`commitWrite`。

| 事件（store action） | 開關關閉 | 開關開啟 | 不變的部分 | 寫入 |
| :--- | :--- | :--- | :--- | :--- |
| 作答 `answerPart5(i)` | v0.14 計數（本輪、累計）＋打卡；答對且未曾答對 → 附加 id（CR-2） | 同左 | 今日已學不計（LR-1）；`viewKind = "allCorrect"` 時拒絕 | 1 次 |
| 下一題 `nextPart5()` | 最後一題 → `summary`，否則 +1 | UO-5：`next(currentIndex + 1)`，無 → `summary` | 跳過的題目不計入本輪與累計 | `changed` 時 1 次 |
| 重新開始 `restartPart5()`（summary 畫面） | `currentIndex = 0` | UO-6：`max(next(0), 0)` | 累計不變、答對紀錄不變（CR-7） | `changed` 時 1 次 |
| 開關 開 `setPart5UnansweredOnly(true)` | — | UO-4（目前題目曾答對且未作答 → 跳到其後第一題未答對；其後沒有 → `summary`） | 計數不變 | 1 次（與正規化同一次） |
| 開關 關 `setPart5UnansweredOnly(false)` | — | `part5` 不變（UO-8） | 計數不變 | 1 次 |
| 全部再練 `replayPart5KeepRecords()` | — | 只在 `allCorrect`：開關 → false、第 1 題、本輪歸 0 | 答對紀錄、累計不變 | 1 次 |
| 清除紀錄 `clearPart5CorrectIds()`（確認「確定」後） | — | 只在 `allCorrect`：`ids = []`、第 1 題、本輪歸 0 | 開關（仍開啟）、累計不變 | 1 次（FB-60：失敗依 WR-2） |
| 啟動 | — | UO-4（V-ST-05 之後） | — | 不寫（RD-4） |
| 匯入 | — | 步驟 7 UO-4 | — | 步驟 8 |
| 初始化「確定」 | `ids = []`（LEARNING_PROGRESS_FIELDS） | 同左；開關保留；第 1 題必為未答對，UO-4 不移動（CI-8） | — | CI-5 |

**畫面種類**：`views/part5.js` 每次 `render` 以 `part5flow.viewKind` 推導（UO-3），**不**存在 store。`"allCorrect"` 時進度條 100%、`aria-valuenow` = N（`layout.part5Progress("allCorrect", …)`），不顯示「第 i / N 題」。

**邊界保證（UO-9）**：`nextUnanswered` 為單一有界迴圈；`next`、`restart`、`normalizeOnly` 皆不遞迴；`currentIndex` 永遠 < Q（V-ST-05 照舊）；Q = 0 時 store 的 part5 action 一律不動作、view 走既有空題庫畫面、不顯示 K 與開關（§5.11 名詞段）；`bankIds` 含 `null`（資料缺 id）時該題永遠未答對、不可被記錄，不會造成「全部答對」誤判以外的錯誤（K 最大為非 null 題數，此時 `allCorrect` 不會出現，屬資料錯誤，V-P5-02 已防）。

#### 7.21.4 畫面文字與版面（DS-35；AC-45-04、AC-45-05、AC-46-01、AC-46-06～AC-46-08）

**文字定稿**（契約常數以 `C.PART5_RECORD_TEXTS` 引用；SD 文字放 `views/part5.js` 的 `RECORD_TEXT` 並匯出供測試）：

| 用途 | 文字（逐字） | 來源 |
| :--- | :--- | :--- |
| 計數行 | `已答對 {k} / {q} 題`（例「已答對 0 / 200 題」） | 契約 `correctCount` |
| 曾答對標示 | `✓ 曾答對` | 契約 `correctBadge` |
| 開關標籤 | `只練沒答對的題目` | 契約 `unansweredOnlyLabel` |
| 全部答對標題 | `{q} 題全部答對！`（例「200 題全部答對！」，全形驚嘆號） | 契約 `allCorrectTitle` |
| **全部答對說明句** | `每一題都至少答對過一次了。可以保留紀錄、全部題目再練一次，或清除答對紀錄後重新來過。` | **SD 定稿** |
| 作答結束進入時的本輪結算 | 小標「本輪結算」＋「答對 {x} / {y}」 | 沿用 v0.14 `TEXT.summaryTitle` 與結算格式（AC-46-06） |
| 按鈕一 | `全部題目再練一次（保留紀錄）` | 契約 `replayKeepRecords` |
| 按鈕二 | `清除答對紀錄，重新來過` | 契約 `clearAndRestart` |
| **確認對話框標題** | `清除答對紀錄` | **SD 定稿** |
| **確認對話框內文** | `將清除全部題目的答對紀錄，「已答對」會回到 0 題，並從第 1 題重新開始。累計答題數與正確率不受影響。` | **SD 定稿**（逐字包含契約 `clearConfirmMustInclude` 兩段） |
| 對話框按鈕 | `確定`、`取消`（只有這 2 個） | 契約 `confirmOk`、`confirmCancel` |

以上文字皆不含「範本」「English Master Track」，不顯示題目 id（CR-9），全部經 `core/dom.js` 以 `textContent` 寫入。

**DOM 結構**（`#view-part5`；題庫為空時沿用 v0.14 空畫面，不建 `.p5-record`）：

```
div.p5
 ├ h2.page-title.p5-heading「模擬測驗」
 ├ div.p5-progress[role=progressbar]               （MT-1；allCorrect = 100%）
 ├ div.p5-record                                    ← 新；question／summary／allCorrect 三種畫面都有、各 1 個
 │   ├ p.p5-record__count[data-p5=correct-count]    「已答對 K / Q 題」
 │   └ label.p5-only[data-p5=only-label]
 │       ├ input[type=checkbox][data-p5=only]        checked = part5UnansweredOnly
 │       └ span.p5-only__text「只練沒答對的題目」
 ├ p.p5-heading-note「題型對應多益 Part 5」
 └ 主體：
     question   → div.card.p5-question
                    div.p5-meta：h3.p5-number「第 i / N 題」、span.p5-type、span.p5-badge[data-p5=correct-badge]「✓ 曾答對」（曾答對才建）
                    句子、選項、結果（v0.14 不變）
     summary    → div.card.p5-summary（v0.14 不變）
     allCorrect → div.card.p5-allcorrect
                    h3.p5-allcorrect__title[tabindex=-1][data-p5=allcorrect-title]「{q} 題全部答對！」
                    p.p5-allcorrect__note（說明句）
                    （inSummary 時）p.p5-allcorrect__caption「本輪結算」＋ p.p5-summary__score[data-p5=summary-score]「答對 x / y」
                    div.btn-row.p5-allcorrect__actions
                       button.btn.btn--primary[data-p5=replay]「全部題目再練一次（保留紀錄）」
                       button.btn[data-p5=clear]「清除答對紀錄，重新來過」
```

**樣式（`styles/40-part5.css`；只用既有 token，不新增色彩，不使用 `--accent`，遵守 §7.19.1 禁止寫法）**：

| 選擇器 | 規則 | 依據 |
| :--- | :--- | :--- |
| `.p5-record` | `display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:4px 12px; margin:0 0 8px` | 進度條下方、題目之上；窄寬自動換行不重疊（AC-45-05） |
| `.p5-record__count` | `margin:0; font-size:0.9375rem; color:var(--text-muted); font-variant-numeric:tabular-nums; white-space:nowrap` | `#5b6472` 對 `--bg` `#eef4fa` ≈ 5.4:1 |
| `.p5-only` | `display:inline-flex; align-items:center; gap:8px; min-height:var(--touch); min-width:var(--touch); padding:0 4px; color:var(--text); font-size:0.9375rem; cursor:pointer; white-space:nowrap` | 整個 label 為觸控目標 ≥ 44×44（AC-46-01） |
| `.p5-only input` | `width:20px; height:20px; margin:0; flex:none; accent-color:var(--brand-deep)` | 原生核取方塊：勾選有 ✓ 形狀，不只靠顏色 |
| `.p5-only input:focus-visible` | `outline:3px solid var(--focus); outline-offset:2px` | AC-38-09 |
| `.p5-badge` | `display:inline-block; padding:2px 10px; border-radius:999px; border:1px solid var(--correct); background:var(--surface); color:var(--correct); font-size:0.875rem; font-weight:600; white-space:nowrap` | 外框膠囊（同 `.p5-type` 尺寸）；`#15803d` 對白 ≈ 5.0:1；位於 `.p5-meta`（flex-wrap）題型標籤之後 |
| `.p5-allcorrect` | `text-align:center` | 同 `.p5-summary` |
| `.p5-allcorrect__title` | `font-size:1.25rem; font-weight:700; color:var(--text)`；`:focus{outline:none}`、`:focus-visible` 同 `.p5-number` | — |
| `.p5-allcorrect__note`、`__caption` | `color:var(--text-muted)` | 對白 ≈ 5.9:1 |
| `.p5-allcorrect__actions` | `justify-content:center; flex-wrap:wrap`；按鈕 `min-height:var(--touch)`；`@media (max-width: 640px)` 按鈕 `flex:1 1 100%` | AC-46-06 44×44、375px 不裁切 |

新元素**不設** `transition`／`animation`，減少動態時自然無動畫（AC-31-03）。375px 估算：計數行最長約 150px、開關約 160px，加間距 ≈ 320px ≤ 可用寬 343px；超出時 `flex-wrap` 換行。

**互動與焦點**：

| 操作 | 行為 | 重繪後焦點 |
| :--- | :--- | :--- |
| 點擊或觸控開關（含點 label 文字） | `change` → `store.actions.setPart5UnansweredOnly(input.checked)` | `[data-p5=only]` |
| 開關聚焦時按空白鍵 | 原生切換 → `change` | 同上 |
| 開關聚焦時按 **Enter** | `keydown` Enter → `preventDefault()` → `input.click()`（原生核取方塊不回應 Enter，AC-46-01 要求） | 同上 |
| 「下一題」進入 allCorrect | — | `[data-p5=allcorrect-title]` |
| 「全部題目再練一次（保留紀錄）」 | `replayPart5KeepRecords()` | `[data-p5=number]` |
| 「清除答對紀錄，重新來過」 | `EMT.ui.dialog.confirm({ title, message, okText: "確定", cancelText: "取消" })`；`true` → `clearPart5CorrectIds()`；`false`（取消、Esc、點遮罩）→ 不呼叫任何 action | 確定：`[data-p5=number]`；取消：維持 allCorrect 畫面，焦點回到 `[data-p5=clear]` |

`role="switch"` 不使用（原生核取方塊已符合 AC-46-01，且 `checked` 狀態可被輔助技術讀取）；計數行不設 `aria-live`（作答結果已有既有 live region，避免重複播報）。

#### 7.21.5 寫入與容量不足提示（DS-36；WR-1～WR-5、V-ST-22）

store 一般寫入收斂為單一內部函式 `commitWrite(data, runtime, tags, opts)`：

```
w = writeData(persist.ensureWritable(data), opts.bypassFirstRun)
w.ok                     → writeStatus 由非 ok 回到 ok 時加 tag "storage"（沿用）
w.reason = "quota"       → writeStatus = "quota"；若 !runtime.learningQuotaNoticeShown
                           → runtime.learningQuotaNoticeShown = true、加 tag "learningQuota"（banner 提示「儲存空間不足」1 次）
w.reason = "error"       → writeStatus = "error"；不提示
w.reason = "disabled"／"firstRun" → 沿用 noteWrite（不提示；unavailable 時 banner 常駐「進度將無法保存」）
記憶體一律採用新 data（不回滾）→ notify(tags) 一次
```

| 寫入 | 處理 |
| :--- | :--- |
| `flipCard`、`answerVocabQuiz`、`recordSttScored`（原 `commitLearning`）；`gotoCard`、`answerPart5`、`nextPart5`、`restartPart5`、`setPart5UnansweredOnly`、`replayPart5KeepRecords`、`clearPart5CorrectIds`（v0.15 新資料）；`setDraft`（`clickColor`）、`applyGoal`、`deleteCustomWord`、`acknowledgeSttNotice`、`startLearning`（原 `commit(…, true)`） | **`commitWrite`**：整個工作階段「儲存空間不足」最多 1 次（與 AC-30-14 共用旗標） |
| `addCustomWord`、`injectTemplate` | 維持：容量不足 → 回滾、回傳 `reason: "quota"`，由 view 提示（AC-18-04） |
| `confirmApplyGoal` | 維持 CI-7：不套用、提示「儲存空間不足，未套用」、不改旗標 |
| `importBackup` | 維持步驟 8：`quota`／`write_failed`，記憶體不變 |
| `init` 的遷移寫回、unreadable 保存 | 維持 `tryWrite`（失敗不提示） |

**決定理由**：V-ST-22 要求「儲存空間不足」整個工作階段只出現 1 次；若只把新資料併入旗標，`setDraft` 等一般寫入仍會在每次「ok → quota」轉換時另外跳出提示，總數可能 > 1。因此全部一般寫入一併收斂。對 v0.14 行為的影響只有「一般寫入的容量不足提示由每次狀態轉換一次改為整個工作階段一次」，不涉及 PRD 文字（§5.3 只要求「提示」），列 SD-FB-59 知會。`ui/banner.js` 不需修改：`"storage"` + quota 的分支在 v0.10 後不再被觸發但保留無害。

**多分頁（WR-5）**：不監聽 `storage` 事件、不加鎖；最後寫入者為準，不視為缺陷。

#### 7.21.6 題目 id 穩定（DS-37；V-P5-08、Q-71）——CT-25

SD 決定**建立**檢查（契約為選擇性），理由：答對紀錄以 id 為鍵，日後若有人重排或改號，使用者的「✓ 曾答對」會靜默錯置到另一題，且無法回復。

| 項目 | 設計 |
| :--- | :--- |
| 快照 | `src/data/_records/part5-ids.json`：`{ "meta": { "createdBy": "CT-25", "source": "src/data/part5.js", "createdAt", "count" }, "ids": { "p5-001": { "s": <sentence 指紋>, "a": <正解指紋> }, … } }`；指紋 = SHA-256（Node 內建 `crypto`）對「NFC → trim → 連續空白壓成 1 個 → 小寫」後的字串取前 16 個 hex；`s` 用 `sentence`，`a` 用 `options[correctIndex]` |
| 檢查（`validate.mjs`，`--stage final` 且快照存在時執行） | 快照中的 id 仍在題庫：`s`、`a` **皆**不同 → 錯誤 V-P5-08（改指另一題）；只有一者不同 → 警告 V-P5-08W（請確認為錯字修正）；快照中的 id 不在題庫 → 資訊（刪題，id 不得重用）；題庫中的 id 不在快照 → 警告 V-P5-08N（新題，交付後請更新快照）。快照不存在 → 略過並提示 |
| 更新 | `--update-snapshot`：只**新增**快照中沒有的 id，不刪除、不覆寫既有項目；`--accept <id>`：人工確認為錯字修正後，覆寫該 id 的指紋。兩者皆只寫 `_records/part5-ids.json` |
| 本版結果 | `part5.js` 未改，CT-25 以目前題庫建立快照（200 筆），之後 `npm run validate:data` 錯誤 0、警告 0 |

#### 7.21.7 網站版本 1.1.0（DS-38；Q-70 A、AC-42-02）

主控於 FE-76 之前執行 MC-04：只把 `package.json` 的 `"version": "1.0.0"` 改為 `"1.1.0"`，其他欄位不動。建置、`core/version.js`、`build.test.js`（以暫存 `package.json` 測試）皆不需修改。之後版本號仍由人類維護（Q-58、D-14）。

#### 7.21.8 效能、無障礙與不改的部分

| 面向 | 影響 | 結論 |
| :--- | :--- | :--- |
| 首次載入（AC-22-05） | 啟動多 1 次 `resolve`（O(N)）、1 次 `normalizeOnly`（O(Q)）、v2 使用者首次開啟多 1 次 `setItem` | < 5 ms，可忽略 |
| 換卡（AC-28-03、AC-44-02） | 每次換卡多 1 次 `setItem` | §6.6、§7.21.2 量測 |
| 作答與下一題（AC-29-01、AC-45-01、AC-46-03） | `recordAnswer` O(K)、`nextUnanswered` O(Q) | < 1 ms |
| 鍵盤 | 開關為原生核取方塊（Tab 可達、Space 原生、Enter 由程式補）；兩個按鈕為原生 `<button>`；對話框沿用 US-32 元件 | AC-46-01、AC-46-06、AC-38-09 |
| 螢幕閱讀器 | 開關以 `<label>` 關聯文字；標示為一般文字「✓ 曾答對」 | AC-45-04 |
| 減少動態 | 新元素無動畫；既有答題動畫規則不變 | AC-31-03 |
| 網路與安全 | 全部本機運算；id、wordKey 只做字串比對、以 `textContent` 呈現 | AC-47-08、WR-4、CR-9 |
| 不改 | localStorage 鍵名與鍵數（2）、`unreadable` 規則、備份頂層 5 欄與 `format`、檔名前綴、`FROZEN_IDENTIFIERS`、主控台內容（不顯示 K）、「有學習紀錄」判定、`PWA_*`、service worker、`src/data/` 資料檔 | 契約 §5.1、CR-4 (c)、CI-2 |

### 7.22 文字修訂：更新提示與聯絡資訊（v0.11；PRD R-24、AC-23-07、AC-36-03、AC-42-04、E-118～E-120；契約 v0.16 L-7、UP-6、DS-40、FB-61、FB-62）

#### 7.22.1 更新提示文字（R-24 一）

| 項目 | 決定 | 依據 |
| :--- | :--- | :--- |
| 修改點 | 只改 `core/pwa.js` `PWA_TEXTS` 兩個值：`updateNotice` = `有新版本，請更新版本`（逗號為全形 U+FF0C）、`updateButton` = `更新版本`；`installButton`、`backupOriginNotice` 不變；`PWA_TEXTS` 仍深度凍結 | 契約 `PWA_TEXTS`、UP-6 |
| 不改 | `ui/pwa-notice.js`（已以 `PWA_TEXTS` 建立 `span`／`button`，§4.7）、`services/pwa.js`（UP-2～UP-5 行為）、`80-pwa.css`、`sw.template.js`；顯示條件 `eligible && updateAvailable`、按下送 `SKIP_WAITING`、`controllerchange` 至多重新載入 1 次、不按則關閉全部分頁重開生效（Q-43 A） | UP-4～UP-7、AC-36-03 |
| 版面 | 新文字比舊文字多 2 字、按鈕少 0 字；`#pwa-update` 已 `flex-wrap: wrap`（§7.18.7），375px 不截斷、不需改 CSS | AC-36-03、AC-20-01 |
| 舊版頁面 | 已安裝的舊版頁面顯示舊程式內的「有新版本，重新整理」，屬預期；更新後一律新文字 | E-120 |

#### 7.22.2 「資料來源與授權」頁聯絡行（R-24 二）

**常數位置**：`views/sources-page.js` 模組層級 `var SOURCES_CONTACT_TEXT = "email: j i m m y l i n . 5 8 3 9 0 7 2 2 @ g m a i l . c o m";`，並在回傳的 api 匯出 `SOURCES_CONTACT_TEXT`（測試取用）。理由：只有此頁使用，放 `core/constants.js` 會擴大影響面；全專案 `src/app/` 只此一處字面值（含註解，註解不得重複寫出位址，也不得寫出去空格形式）。

**DOM**（`render` 內，`.src-page` 的最後一個子元素，位於 `licenseSection` 之後）：

```
div.src-page
├─ h2.src-page__title / p.src-muted（intro）/ h3 / div.src-list
├─ section.card.src-project（授權聲明，AC-23-02 不變）
└─ p.src-muted.src-contact      ← v0.11 新增；textContent = SOURCES_CONTACT_TEXT
```

| 規則 | 做法 | 依據 |
| :--- | :--- | :--- |
| 位置 | `.src-page` 在 `#view-sources` 內；頁尾連結與版本行在 `#app-footer`（view 之外），因此聯絡行必在其上方；只在 sources view 渲染，其他畫面不會出現 | AC-23-07 (1)(7)、L-7 (5) |
| 寫入方式 | `dom.el("p", { className: "src-muted src-contact", text: SOURCES_CONTACT_TEXT })`（`textContent`，C-7）；**不得**對常數做任何字串處理（去空格、`replace`、`split`／`join`、拼接） | L-7 (2)(3) |
| 非連結、不可聚焦 | 元素為 `<p>`；不設 `href`、`tabindex`、`role`、`title`、`data-go`，不呼叫 `addEventListener`；祖先 `.src-page`、`#view-sources` 皆非 `<a>`；`router` 的 `[data-go]` 委派不會命中（無該屬性） | AC-23-07 (2)、E-118 |
| 可選取 | 不設 `user-select: none`，依瀏覽器預設可選取文字 | E-118 |
| 樣式 | `.src-muted`（`color: var(--text-muted)`，對 `--bg` 約 5.4:1，同 intro 說明文字顏色）＋新規則 `.src-contact { margin: 24px 0 0; font-size: 0.8125rem; overflow-wrap: anywhere; }`；不使用 `--accent`／`#f7893b`、不加 `white-space: nowrap`（放大字級時要能換行，E-119） | AC-23-07 (3)(6)、VC-3、VC-7 |
| 字級理由 | 字串 60 字元（33 個字形＋27 個半形空格）。以 16px 系統字型估算約 370 px，超過 375px 視窗扣左右各 16px 留白後的 343 px，會折成 2 行；13px（0.8125rem）約 300 px，可維持 1 行且保留餘裕。13px 介於版本行 12px（§7.20.1）與內文之間，屬「說明性次要文字」 | AC-23-07 (1)(6)、E-119 |
| 備援 | 若 FE-77 實測（無頭瀏覽器或主控以 DevTools 375px）在 Windows Chrome 預設字型下仍折行，PG 可把 `font-size` 降為 `0.75rem`（12px，與版本行相同），不需再回設計；不得使用 `nowrap` 或縮減空格 | AC-23-07 (1) |
| 不持久化、不發請求 | 常數只在記憶體與 DOM；不寫 localStorage、不入備份；無圖片、無連結，不產生請求 | L-7 (4)、AC-21-01、AC-37-05 |
| 兩種形態 | `file://` 與 https 版為同一份 HTML，自然相同；斷網不影響 | AC-23-07 (4) |

**防爬蟲靜態規則**（FB-62，由 `contact-static.test.js` 與 FE-77 的 `dist/` 檢查共同保證）：

| 對象 | 必須 |
| :--- | :--- |
| 交付 HTML（`build({ write: false }).html`，以及建置後的 `dist/english-master-track.html`、`dist/site/index.html`） | 不含 `mailto:`（不分大小寫）；不含「去掉空格後的完整位址」（不分大小寫）；`SOURCES_CONTACT_TEXT` 原值恰出現 1 次；不含 `有新版本，重新整理`；含 `有新版本，請更新版本` 與 `更新版本` |
| `dist/site/sw.js` | 不含 `mailto:`、不含去空格位址 |
| `src/app/` 非測試原始碼（`__tests__/` 以外的 `.js`、`.css`、`.html`、`.txt`） | 不含 `mailto:`、不含去空格位址；`SOURCES_CONTACT_TEXT` 原值只出現在 `views/sources-page.js` 且 1 次 |
| 測試檔 | 去空格位址只能在測試執行期由常數推導（例：`SOURCES_CONTACT_TEXT.slice("email: ".length).split(" ").join("")`），測試原始碼不得寫出去空格位址的字面值；`__tests__/` 依 D-1 不打包 |

---

## 8. 內容製作設計（pg-content）

### 8.1 字庫分檔與批次（回應 FB-14、R-01、主控補充 3）

依契約 §4.2 紀錄值切分；邊界對齊 `N_B` = 2,809，使每批任務的 `academicContext` 規則一致（排名 ≤ 2,809 選填、> 2,809 必填，AC-06-08）。

| 任務 | 分檔 | 排名區間 | 筆數 | 來源區段（預期） | academicContext | 自查抽樣（10%） | QA 抽查（V-VOC-18） |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| CT-03 | `vocab-0001.js` | 1～400 | 400 | NGSL（含功能詞） | 選填 | 40 | 20 |
| CT-04 | `vocab-0401.js` | 401～800 | 400 | NGSL | 選填 | 40 | 20 |
| CT-05 | `vocab-0801.js` | 801～1,200 | 400 | NGSL（跨 `N_O` = 1,000） | 選填 | 40 | 20 |
| CT-06 | `vocab-1201.js` | 1,201～1,600 | 400 | NGSL | 選填 | 40 | 20 |
| CT-07 | `vocab-1601.js` | 1,601～2,000 | 400 | NGSL | 選填 | 40 | 20 |
| CT-08 | `vocab-2001.js` | 2,001～2,400 | 400 | NGSL | 選填 | 40 | 20 |
| CT-09 | `vocab-2401.js` | 2,401～2,809 | 409 | NGSL | 選填 | 41 | 21 |
| CT-10 | `vocab-2810.js` | 2,810～3,159 | 350 | TSL | **必填** | 35 | 20 |
| CT-11 | `vocab-3160.js` | 3,160～3,509 | 350 | TSL | 必填 | 35 | 20 |
| CT-12 | `vocab-3510.js` | 3,510～3,859 | 350 | TSL | 必填 | 35 | 20 |
| CT-13 | `vocab-3860.js` | 3,860～4,209 | 350 | TSL → BSL（4,060 起） | 必填 | 35 | 20 |
| CT-14 | `vocab-4210.js` | 4,210～4,559 | 350 | BSL | 必填 | 35 | 20 |
| CT-15 | `vocab-4560.js` | 4,560～4,909 | 350 | BSL | 必填 | 35 | 20 |
| CT-16 | `vocab-4910.js` | 4,910～5,259 | 350 | BSL → NAWL（5,229 起） | 必填 | 35 | 20 |
| CT-17 | `vocab-5260.js` | 5,260～5,620 | 361 | NAWL | 必填 | 36 | 20 |
| 合計 | 15 檔 | 1～5,620 | 5,620 | | | 567 | 301 |

- 若 CT-02 依 N-1 重算的 `N_B`、`N_G` 與紀錄值不同：CT-02 標 `blocked` 並回報；由 SA 修訂契約、SD 重切本表，不得自行調整。
- 15 個批次任務彼此無共用檔案，可全部平行（主控可依資源分次派出）。

### 8.2 骨架與工作流程

| 步驟 | 執行者 | 動作 |
| :--- | :--- | :--- |
| W-1 | CT-01 | 寫 `_tools/`：`lib.mjs` 內建上表 `VOCAB_FILES`（檔名 ↔ 排名區間）常數 |
| W-2 | CT-02 | `build-skeleton.mjs` 依 R-1～R-8 算排名，寫 15 個骨架分檔：`rank`、`word`、`sources`、`phoneticSource: "ORIGINAL"`、`contentSource: "ORIGINAL"`、`meaningSource`（在 `ecdict_subset.csv` → `"ECDICT"`，列於 missing → `"ORIGINAL"`）已定；`phonetic`、`meaning`、`collocation`、`academicContext`、`example` 為 `""`、`pos` 為 `[]` |
| W-3 | 批次任務 | `node src/data/_tools/material.mjs --file src/data/vocab-XXXX.js --out <scratchpad>/material.jsonl`：每筆輸出 rank、word、wordKey、sources、`_zhtw` translation、簡體 translation、是否在 missing、M-3 上下文用詞命中清單、詞形變化（lemmatized 檔，僅供例句選詞形） |
| W-4 | 批次任務 | 每次撰寫 ≤ 50 筆，存成 scratchpad 的 `part-NN.jsonl`（每行 `{ rank, phonetic, pos, meaning, collocation, academicContext, example, meaningSource? }`）；`meaningSource` 只在依 M-6 改為 `"ORIGINAL"` 時填 |
| W-5 | 批次任務 | `node src/data/_tools/fill.mjs --file src/data/vocab-XXXX.js --input <scratchpad>/parts/`：依 rank 合併，**不得改動**骨架欄位（工具拒絕不同的 `rank`／`word`／`sources`） |
| W-6 | 批次任務 | `node src/data/_tools/validate.mjs --file src/data/vocab-XXXX.js --stage final` 全數通過 |
| W-7 | 批次任務 | `node src/data/_tools/sample.mjs --file src/data/vocab-XXXX.js --ratio 0.1 --min 35 --seed <起始排名>` 人工自查，結果寫入 `_records/vocab-XXXX.md` |

分檔格式（`fill.mjs`、`build-skeleton.mjs` 統一輸出）：

```
// 內建字庫 排名 401～800（契約 §3.1；由 _tools 產生，請勿手動調整骨架欄位）
window.MASTER_VOCAB_DATABASE = (window.MASTER_VOCAB_DATABASE || []).concat([
{"rank":401,"word":"…", …},
…
]);
```

每筆一行（`JSON.stringify(item)`，鍵順序依 `data-schema.ts` 宣告順序），方便檢查與比對。

### 8.3 撰寫慣例（所有批次一致，平行任務靠此保持風格統一）

**音標 P-1～P-9（美式 IPA；M-5、V-VOC-16）**

| 代號 | 規則 |
| :--- | :--- |
| P-1 | 以 `/…/` 包住；多音節字以 `ˈ`（U+02C8）標主重音、`ˌ`（U+02CC）標次重音，放在該音節**之前**；單音節字不標重音；不用音節點 |
| P-2 | 母音只用：`i ɪ eɪ ɛ æ ɑ ɔ oʊ ʊ u ʌ ə aɪ aʊ ɔɪ`；不用長音符 `ː`，`i`、`u` 不加長音 |
| P-3 | 捲舌母音：重讀 `ɝ`（bird /bɝd/）、非重讀 `ɚ`（teacher /ˈtitʃɚ/）；母音 + r：`ɪr ɛr ɑr ɔr ʊr aɪr aʊr`（car /kɑr/、care /kɛr/、near /nɪr/、more /mɔr/） |
| P-4 | 禁用英式符號：`əʊ`、`ɒ`、`ɜ`（未捲舌）、`ɪə`、`eə`、`ʊə`、`ː`（驗證器 H-2 自動攔） |
| P-5 | 子音：`p b t d k g f v θ ð s z ʃ ʒ h tʃ dʒ m n ŋ l r w j`；`g` 用 ASCII（不用 U+0261）；彈舌不標（water /ˈwɔtɚ/）；成音節 n、l 寫 `ən`、`əl`（button /ˈbʌtən/） |
| P-6 | 只寫一種發音：最常見的美式發音；名動詞重音不同時取 `pos` 第一個詞性的讀音 |
| P-7 | 功能詞取一般語流中最常聽到的形式（the /ðə/、a /ə/、of /əv/、to /tə/、and /ənd/、can /kən/ 等）；與契約範例 `/ðə/` 一致 |
| P-8 | 片語：各字音標以單一空白分隔、整串一組斜線（comply with → /kəmˈplaɪ wɪð/） |
| P-9 | 允許字元集（H-2）：上述母音／子音符號、`ˈ`、`ˌ`、空白、`/`；其他字元一律報錯 |

**釋義、詞性（M-2～M-4、M-6）**

| 代號 | 規則 |
| :--- | :--- |
| T-1 | 素材只取 `ecdict_subset_zhtw.csv` 的 `translation`；保留多益與學術最常用的 1～3 個義項，以全形「；」分隔，≤ 30 字；不新增 ECDICT 沒有的義項（否則依 M-6 標原創並記錄） |
| T-2 | M-3 用詞（質量、程式／程序、檔案／文件、水平、註冊、地鐵）一律回查簡體原檔判斷；清單外的大陸用語同樣改為台灣用法並記入紀錄 |
| T-3 | `[計]`、`[醫]` 等領域標記改寫為「（電腦）」「（醫學）」括註或刪除 |
| T-4 | `pos` 依 M-4 對應，只保留 `meaning` 實際涵蓋的詞性，依常用度排序 |
| T-5 | 同一分檔內 `meaning` 盡量不重複（V-VOC-14）；遇同義字以補充字區分（如「建立；設立」vs「建立；創辦」） |

**原創欄位（AC-06-01、AC-06-02、AC-06-08、AC-23-04）**

| 代號 | 規則 |
| :--- | :--- |
| O-1 | `collocation`：1～3 個多益常見搭配，英文，以「；」分隔，須含該字或其詞形；可加句型提示（如 `the + 名詞：the company policy`）；≤ 80 字元 |
| O-2 | `example`：一句完整英文，8～20 字，職場／多益情境，含該字或其詞形，大寫開頭，以 `.`、`?`、`!` 結尾；≤ 160 字元 |
| O-3 | `academicContext`：一句英文論文風格句子（8～25 字），含該字或其詞形，呈現該字在摘要、方法、結果、文獻回顧中的用法；≤ 200 字元。排名 ≤ 2,809：功能詞與無學術用途的生活字留 `""`，其餘建議填寫（非強制） |
| O-4 | 全部原創：不得抄錄 ETS 題本、Manchester Academic Phrasebank、市售書、辭典例句（含 ECDICT `definition` 欄的英文例句）；不得含 `<`、`>`、`undefined`、`null` 字樣 |
| O-5 | 同一分檔內 `example` 不重複；避免連續多筆使用同一句型骨架 |

### 8.4 自查（每批必做）與 QA 抽查門檻（回應 V-VOC-18）

| 代號 | 檢查 | 方式 | 範圍 | 不合格處理 |
| :--- | :--- | :--- | :--- | :--- |
| S-1 | 契約 V-VOC-01、02（區間內）、03（區間內）、05、06、07、08、09、10、13、15、16 | `validate.mjs --file … --stage final`（自動） | 100% | 任何錯誤即不得交付 |
| S-2 | 骨架欄位未被改動（`rank`、`word`、`sources`、`phoneticSource`、`contentSource`；`meaningSource` 只允許 ECDICT → ORIGINAL 且需有紀錄） | `validate.mjs` 以 `lib.mjs` 重算比對（自動） | 100% | 同上 |
| H-1 | `meaning` 不含簡體專用字：字集 = 「簡體原檔 `translation` 出現、但 `_zhtw` `translation` 從未出現」的字元（由資料導出），**扣除**下方「H-1 繁簡同形白名單」 | `validate.mjs`（自動） | 100% | 錯誤；白名單字元改為警告 H-1W（見下） |
| H-2 | 音標符合 P-9 允許字元集，且不含 P-4 英式符號 | `validate.mjs`（自動） | 100% | 錯誤 |
| H-3 | `meaning` ≤ 30 字；`collocation`、`example`、`academicContext` 長度上限（§8.3） | `validate.mjs`（自動） | 100% | 警告（超過 30 字須在紀錄說明） |
| H-4 | `example`、非空的 `academicContext` 大寫開頭、`.?!` 結尾；`collocation`／`example` 含該字或其詞形（以 lemmatized 檔的詞形比對） | `validate.mjs`（自動） | 100% | 警告；未含詞形者逐筆在紀錄說明 |
| H-5 | 分檔內 `example` 不重複、`meaning` 重複數（V-VOC-14 報告） | `validate.mjs`（自動） | 100% | `example` 重複為錯誤；`meaning` 重複為警告 |
| H-6 | V-VOC-17 上下文用詞清單：工具自動列出，撰寫者補上最終 `meaning` 與判斷（v0.3，見下方「V-VOC-17 警告的處理」） | `material.mjs`、`validate.mjs` + 紀錄 | 100% | QA 全數檢查 |
| H-7 | 分檔壓縮後平均每筆 bytes（§6） | `validate.mjs`（自動） | 100% | > 600 警告、> 700 錯誤 |
| S-3 | 人工自查：釋義是否為精簡而非新增（對照 `_zhtw`）、無大陸用語、`pos` 與釋義一致、音標為美式且正確、例句自然且原創 | `sample.mjs --ratio 0.1 --min 35 --seed <起始排名>` | 10%（每批 35～41 筆，全庫 567 筆） | 抽樣不合格 > 5% → 全檔重新檢查後再抽一次（換種子 = 起始排名 + 1），結果都寫入紀錄 |
| QA（v0.3） | 紀錄完整性：`validate.mjs --file` 輸出的每一筆 V-VOC-17 警告與 H-1W 警告，在對應 `_records/*.md` 都有一列判斷 | 比對 validate 輸出與紀錄 | 100% | 缺列 → 對該 CT 開 minor BUG（只補紀錄）；判斷錯誤（實為過度轉換或簡體誤用）→ 依下一列 V-VOC-18 門檻計入不合格筆數 |
| QA | V-VOC-18：`meaningSource = "ECDICT"` 者 (1) 無簡體、無大陸用語 (2) 義項可在 `_zhtw` 找到 (3) `pos` 一致；另抽 `phonetic` 為美式 IPA | `sample.mjs --ratio 0.05 --min 20 --seed <起始排名 + 1000> --ecdict-only` | **每分檔 5%、至少 20 筆**（全庫約 301 筆） | **單一分檔不合格率 > 5%（20 筆中 ≥ 2 筆）→ 該分檔整批開 BUG 退回對應 CT 任務**；1 筆 → 開 minor BUG 只修該筆 |

**驗證時機：`--file` 與 `--all`（v0.3，回應 CT-02）**

`--all` 會檢查全部交付資料檔，平行執行時其他任務尚未產出的檔案會被列為缺檔錯誤，與本任務品質無關。規則：

| 時機 | 指令 | 判定 |
| :--- | :--- | :--- |
| 個別 CT 任務的 doneWhen | `validate.mjs --file <本任務 paths 內的每個資料檔> --stage <該任務階段>` | 錯誤 0 |
| CT-02（骨架） | 對 `sources.js` 與 15 個骨架分檔逐一 `--file … --stage skeleton` | 錯誤 0。tasks.json 中 CT-02 doneWhen 的「`--all --stage skeleton` 錯誤 0」以此等價判定：`--all` 輸出中只屬於「其他任務尚未產出的檔案缺檔」的錯誤不計 |
| 全部 CT 完成後 | `validate.mjs --all --stage final`（= `npm run validate:data`） | 由 CT-23（其 dependsOn 已涵蓋全部 CT）或主控執行，錯誤 0；FE-18 再跑一次作為交付前關卡 |

**V-VOC-17 警告的處理（v0.3，回應 CT-03、CT-05）**

V-VOC-17 的警告（簡體原檔為「程序」而 `meaning` 用「程式」、原檔為「文件」而用「檔案」）是**提醒人工判斷**，不代表錯誤；program → 程式、file → 檔案 正是台灣正確用法。決議：**不在驗證器加白名單**，以紀錄逐筆寫明判斷即視為已處理。理由：(1) 是否過度轉換取決於該字的英文詞義（procedure → 程序、program → 程式），以 wordKey 白名單會在日後內容修改時遮蔽真正的錯誤；(2) 警告不阻擋交付，不影響 doneWhen；(3) 紀錄本來就要列 V-VOC-17 清單（§8.5），只需多一欄判斷。

| 項目 | 規定 |
| :--- | :--- |
| 紀錄位置 | `_records/vocab-XXXX.md` 的「上下文用詞清單」（§8.5），每筆警告一列 |
| 欄位 | wordKey、英文詞義、簡體原詞、最終 `meaning`、**判斷**（「保留：台灣用法，英文詞義為 …」或「已修改：原為 … 改為 …」） |
| 完成條件 | 紀錄中判斷列數 ≥ `validate.mjs --file` 輸出的 V-VOC-17 警告數，且每個警告的 wordKey 都有對應列 |
| QA 判定 | 見上表「QA（v0.3）紀錄完整性」列：缺列 → minor BUG；判斷錯誤 → 計入 V-VOC-18 不合格 |

**H-1 繁簡同形白名單（v0.3，回應 CT-01）**

H-1 字集由資料導出，會納入「s2twp 一律轉成別的字、但本身也是合法繁體」的字元，例如「后」（s2twp 把多數「后」轉為「後」，但「皇后」「王后」的「后」是正確繁體）。若維持錯誤等級，正確的釋義（queen → 皇后）會無法交付。決議：**加白名單，降為警告**。

| 項目 | 規定 |
| :--- | :--- |
| 白名單字元 | `后 干 里 范 谷 斗 丑 征 准 松 系 制 只 台 面 云 余 卷 几 志 周 致 症`（繁體中文本身也使用的字；只有同時出現在導出字集中的字元才有作用） |
| 行為 | 導出字集扣除白名單後的字元 → H-1 **錯誤**（不變）；`meaning` 含白名單字元且該字元在導出字集中 → **H-1W 警告**：「含繁簡同形字「X」，請確認為正確繁體用法」 |
| 撰寫者處理 | 每筆 H-1W 在 `_records/vocab-XXXX.md` 的「清單外大陸用語修正」段落寫一列判斷（「保留：皇后」或「已修改：后 → 後」） |
| 工具輸出 | `validate.mjs` 在報告開頭列出導出字集大小與實際被降為警告的白名單字元；CT-01 補修後把該清單寫入 `_records/CT-01.md` |
| QA 判定 | 與 V-VOC-17 相同：缺列 → minor BUG；判斷錯誤（例如 after 釋義用「后」）→ 計入 V-VOC-18 不合格 |

程式補修見 §12.2 R3-4（CT-01）。

### 8.5 交付紀錄格式（`src/data/_records/*.md`）

| 段落 | 內容 | 依據 |
| :--- | :--- | :--- |
| 摘要 | 任務 ID、分檔、排名區間、筆數、日期 | — |
| 驗證結果 | `validate.mjs` 輸出摘要（錯誤 0、警告清單） | S-1、H-1～H-7 |
| `meaningSource = "ORIGINAL"` 清單 | wordKey + 原因（missing 4 筆或 M-6 整段改寫） | M-6、M-7、V-VOC-09 |
| 上下文用詞清單 | wordKey、英文詞義、簡體原詞、最終 `meaning`、判斷（v0.3：每筆 V-VOC-17 警告必有一列，§8.4） | V-VOC-17、M-7 |
| 清單外大陸用語修正 | wordKey、原詞、改後；（v0.3）H-1W 警告的判斷也列在此 | M-3、T-2、H-1W |
| 自查抽樣 | 種子、抽到的 wordKey、每筆結論、不合格率 | S-3 |
| 其他 | 長度超限說明、例句未含詞形說明、回饋上游 | H-3、H-4 |

---

## 9. 樣式方案（RWD）

| 項目 | 決定 | AC |
| :--- | :--- | :--- |
| 斷點 | 行動優先；`min-width: 768px`（平板）、`min-width: 1200px`（桌機）；內容區 `max-width: 960px` 置中 | AC-20-01 |
| 防水平捲軸 | 全域 `box-sizing: border-box`；長字串 `overflow-wrap: anywhere`；表格與 MIT 全文用 `overflow-x: auto` 的**元素內**容器（頁面本身不得出現水平捲軸）；圖片無 | AC-20-01 |
| 導覽 | < 768px：頁首「選單」按鈕展開 2 欄 × 3 列按鈕格（6 個功能區）；≥ 768px：單列頁籤；「資料來源與授權」入口在主控台與頁尾 | AC-20-03、AC-23-02 |
| 觸控 | 按鈕、選項、滑桿把手最小 44 × 44 px；滑桿 `input[type=range]` 原生元件；不依賴 hover。（v0.6）滑桿已隱藏，不在 AC-20-02 檢查範圍 | AC-20-02 |
| 色彩 | `00-base.css` 定義變數：色級 5 色（橘 `#e8833a`、棕 `#8b5a2b`、綠 `#2e9e5b`、藍 `#2f6fd6`、金 `#c9a227`）；語法 4 色系（主詞藍 `#1d4ed8`／`#dbeafe`、動詞紅 `#b91c1c`／`#fee2e2`、受詞綠 `#15803d`／`#dcfce7`、修飾紫 `#7e22ce`／`#f3e8ff`）；燈號綠黃紅；對錯綠紅 | AC-12-01、AC-08-06 |
| 字型 | 系統字型堆疊（`system-ui, "Noto Sans TC", "Microsoft JhengHei", sans-serif`；IPA 用 `"Segoe UI", "Lucida Sans Unicode", "Arial Unicode MS"`）；**不載入外部字型** | AC-19-01 |
| 類名 | 每頁固定前綴：`db-`、`cz-`、`cv-`、`fc-`、`sp-`、`qz-`、`p5-`、`dc-`、`pb-`、`src-`；共用 `btn`、`card`、`field`、`toast`、`dialog` | — |
| 狀態 | 停用按鈕用 `disabled` 屬性 + `aria-disabled`；鎖定色級的鎖定圖示以 CSS 繪製或內嵌 SVG（不用 emoji，避免字型差異），並附文字「即將開放」 | AC-01-01、AC-06-04 |
| 狀態：例外（v0.3） | **AC 要求「點擊停用的按鈕要有提示」時，不得用 `disabled` 屬性**（`disabled` 按鈕不會觸發 `click`，toast 無法出現），改用：`aria-disabled="true"` + `title`（說明原因）＋ 外觀與 `disabled` 相同（CSS 以 `[aria-disabled="true"]` 選取：降低不透明度、`cursor: not-allowed`）；按鈕保持可聚焦；`click` 處理器第一步檢查 `aria-disabled`，為 `"true"` 時只顯示 toast、不執行原本動作。適用範圍：語音面板的 TTS 按鈕（不支援 `speechSynthesis`，AC-07-04「點擊或滑過時提示不支援」）、麥克風按鈕（不支援 `SpeechRecognition`，AC-08-02 toast「建議使用 Google Chrome / Edge」）。其他停用按鈕仍用 `disabled` | AC-07-04、AC-08-02 |
| QA 判定（v0.3） | 上列例外按鈕：有 `aria-disabled="true"` 與非空 `title`、**沒有** `disabled` 屬性；點擊後出現 toast（AC-08-02 文字逐字相符），不開始朗讀或聆聽，不拋未處理例外。其他停用按鈕：有 `disabled` 屬性。兩種寫法都不得出現 `aria-disabled="true"` 但點擊仍執行動作的情況 | AC-07-04、AC-08-02 |
| （v0.4）導覽 | **取代上方「導覽」列的 < 768px 部分**：≤ 640px 為固定底部導覽列（§9.1）；641～767px 維持既有「選單」按鈕展開 2 欄 × 3 列；≥ 768px 維持單列頁籤。首次模式三種寬度都不顯示導覽。**（v0.5）導覽只剩 4 項**：底部導覽 4 欄、641～767px 選單 2 欄 × 2 列、≥ 768px 單列 4 個頁籤（§7.16） | AC-20-03、AC-27-01、AC-27-04、AC-25-01、AC-20-04 |
| （v0.5）收音條 | `31-speech.css`：`.sp-meter` 為 `inline-flex`、固定總寬（約 5 × 6px + 4 × 3px）與高度（約 18px），垂直置中於麥克風按鈕旁；`.sp-meter__bar` 暗色用 `--border`、亮色用 `--correct`，5 格等寬、高度由左到右遞增（純裝飾，不影響判定）；**一律** `transition: none; animation: none`（§7.11 A-6）。不只靠顏色：亮格另加 `is-on` class 供測試，`aria-label`「收音音量」 | AC-33-03、AC-33-08 |
| （v0.4）色級大卡片 | `20-customizer.css`：卡片為 `<button>`（整張可點、`aria-pressed` 表示選中）；版面 ≤ 640px 單欄、641～1199px 2 欄（第 5 張橫跨或靠左）、≥ 1200px 5 欄；每張 `min-height` ≥ 44px（實際約 120px）；選中樣式 = 色級色 3px 外框 + 淺底，不只靠顏色（另有「已選擇」文字給螢幕閱讀器，`aria-pressed`）。（v0.6）卡片內容移除分數範圍列（`.cz-color__range`），其餘不變 | AC-26-01、AC-26-02、AC-26-05 |
| （v0.4）動畫類名 | `view--entering`（換頁）、`fc-face--flip-in`、`fc-card--in-next`、`fc-card--in-prev`、`qz-opt--pop`、`qz-opt--shake`、`p5-opt--pop`、`p5-opt--shake`；主控台環形圖 `db-ring`、`db-ring--done`（金色）、長條圖 `db-bars` | §7.11 |
| （v0.7）PWA 元素 | `80-pwa.css`：`.pwa-update`（sticky 頂端文字列，§7.18.7，無 transition／animation）；`10-dashboard.css`：`.dash-backup__origin`（同 `.dash-backup__hint` 字級、`overflow-wrap: anywhere`）、`.dash-backup__install`、`.dash-install`（≥ 44 × 44 px）。色彩只用既有變數；`--bg` 仍為 `#f6f7f9`（= `PWA_BACKGROUND_COLOR`，建置 B-11 比對，DS-13）、`--primary` 仍為 `#2f6fd6`（= `PWA_THEME_COLOR`）。日後改這兩個變數須同步提契約小修 | AC-24-12、AC-34-04、AC-34-07、AC-36-03 |
| （v0.4）色彩 | 主環形圖達成時沿用既有 `--color-gold`（`#c9a227`）；未達成用 `--primary`；小環形圖用 `--correct`；空環用 `--border`。底部導覽目前項目沿用既有 `aria-current="page"` 樣式 | AC-30-05 |
| （v0.8）取代上方 | 上方「色彩」「（v0.4）色彩」「（v0.7）PWA 元素」中 `--bg` `#f6f7f9`、`--primary` `#2f6fd6`、未達成環用 `--primary`、空環用 `--border` 的敘述由 §7.19.1 取代：`--bg` `#eef4fa`、`--primary` `#0866ad`、未達成環 `--brand`、底圈 `--track`；小環形圖已移除。「（v0.4）色級大卡片」由 §7.19.5 精簡色級列取代。「導覽」「入口在主控台與頁尾」改為只在頁尾（主控台本體不再有入口，DB-1）。內容區 960px 仍適用於頁首、頁尾與「資料來源與授權」頁；主控台、模擬測驗、難易度設定內容寬 720px | AC-38-02、AC-39-01、AC-39-10、AC-40-02 |
| （v0.8）類名 | 新增 `app-logo`、`app-title__text`、`page-title`、`section-title`、`btn--accent`；主控台 `db-today*`、`db-ring*`、`db-goal*`、`db-change`、`db-start`、`db-stat*`、`db-chart*`、`db-bars*`、`db-backup*`；難易度設定 `cz-vocab-note`、`cz-levels`、`cz-level*`、`cz-subtitle`、`cz-firstbar*`；模擬測驗 `p5-progress*` | §7.19 |

### 9.1 底部導覽列（FE-26；PRD US-27、Q-33）

```css
/* 00-base.css（示意；實作以此為準，數值不得改小） */
:root { --emt-bottomnav-h: 56px; }
@media (max-width: 640px) {
  .btn.app-nav-toggle { display: none; }                     /* 不用「選單」鈕 */
  .app-nav, .app-nav.is-open {
    position: fixed; left: 0; right: 0; bottom: 0; z-index: 900;
    display: grid; grid-template-columns: repeat(4, 1fr);      /* v0.5：6 → 4（隱藏解碼器、句型庫） */
    height: calc(var(--emt-bottomnav-h) + env(safe-area-inset-bottom, 0px));
    padding-bottom: env(safe-area-inset-bottom, 0px);
    background: var(--surface); border-top: 1px solid var(--border);
  }
  .app-nav__btn { min-width: var(--touch); min-height: var(--touch); display: flex; flex-direction: column;
                  align-items: center; justify-content: center; gap: 2px; padding: 4px 0; }
  .app-nav__icon { width: 22px; height: 22px; }
  .app-nav__label { font-size: 11px; line-height: 1.2; white-space: nowrap; }
  body { padding-bottom: calc(var(--emt-bottomnav-h) + env(safe-area-inset-bottom, 0px) + 8px); }
  .toast-root { bottom: calc(var(--emt-bottomnav-h) + env(safe-area-inset-bottom, 0px) + 12px); }
  html.is-typing .app-nav { display: none; }                 /* 虛擬鍵盤開啟時不遮輸入欄（AC-27-03） */
  html.is-typing body { padding-bottom: 8px; }
}
@media (min-width: 641px) { .app-nav__icon { display: none; } }  /* 寬螢幕維持純文字頁籤 */
```

| 項目 | 決定 | AC |
| :--- | :--- | :--- |
| 斷點 | `max-width: 640px`（含 640）；641px 起不使用底部導覽 | AC-27-01、AC-27-04 |
| 項目尺寸 | 375px 時每項約 62 × 56 px；640px 時約 106 × 56 px；皆 ≥ 44 × 44。（v0.5）4 項：375px 約 94 × 56 px、640px 約 160 × 56 px | AC-27-02 |
| 文字不裁切 | 「難易度設定」5 字 × 11px ≈ 55px < 62px；`white-space: nowrap`。FE-33 在 375px 以 `scrollWidth ≤ clientWidth` 逐項檢查，若裁切再於 `90-overrides.css` 調整字距 | AC-27-01 |
| 不遮內容 | `body` 底部留白 = 導覽高度 + 安全區 + 8px；toast 移到導覽上方；對話框置中（不受影響）；輸入時隱藏導覽（`ui/bottom-nav.js`） | AC-27-03 |
| 安全區 | `viewport` meta 加 `viewport-fit=cover`，以 `env(safe-area-inset-bottom)` 避開 iPhone 手勢列 | AC-27-03 |
| 圖示 | （v0.5 起 4 個）6 個內嵌 `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">`，單一 `<path fill="currentColor">`；**不寫 `xmlns` 屬性**（HTML 內嵌 SVG 不需要，且避免產物出現 `http://` 字串干擾外部資源檢查）；不用 emoji、圖示字型、`<img>` | AC-27-05、AC-19-01 |
| 首次模式 | `body[data-entry="firstRun"]` 隱藏導覽與底部留白（規則由 FE-32 加在 `00-base.css`） | AC-25-01 |

---

## 10. 測試策略

| 類別 | 負責 | 工具／位置 | 涵蓋 |
| :--- | :--- | :--- | :--- |
| 資料自驗 | pg-content（每個 CT） | `src/data/_tools/validate.mjs`、`sample.mjs` | 契約 V-IN、V-SRC、V-VOC、V-TPL、V-P5、V-DEC、V-RS、V-PH；SD 規則 H-1～H-7；AC-03-06～AC-03-09、AC-06-08、AC-10-01、AC-12-02、AC-12-03、AC-14-01、AC-15-02、AC-23-03、AC-23-05 |
| 單元 | pg-frontend（FE-01、FE-03～FE-07；v0.3 起 FE-19 移入 FE-08～FE-17 的頁面純邏輯測試與載入順序測試） | `npm test` = `node --test src/app/__tests__/*.test.js`（Node ≥ 22；Node 內建 `node:test`、`node:assert`；無套件）。（v0.3）規則：測試檔一律放 `src/app/__tests__/`、副檔名 `.test.js`（CommonJS，不用 `.cjs`／`.mjs` 結尾）、以 `__dirname` 組相對路徑（不得寫死 `D:/…` 等絕對路徑）、**不讀 `src/data/` 正式資料**（用 `_fixtures.js` 的小型 fixture；資料正確性屬 `validate.mjs`）、不需瀏覽器 | 分數修正與範圍、色級判定、每日新字量、試算與週數（AC-02-02～AC-02-06、AC-02-09、AC-02-10 的全部數值例）、色級按鈕分數、單字集截取與去重、刪除後索引、範本注入、編輯距離與吻合度（AC-08-03～AC-08-06、AC-08-12）、打卡（含時鐘調回、跨月、DST）、正確率、四選一（相異、不足、位置隨機 20 次）、StorageRecord 驗證與 V-ST、匯入步驟 1～7 各失敗分支、store 的回滾與一次寫入（以假 `localStorage` 物件）、建置腳本（標記缺失與位置、charset 位於前 1,024 bytes、外部資源偵測、大小上限）；（v0.3，FE-19）各頁面匯出的純邏輯（主控台統計文字與備份檔名、自訂器試算顯示、自訂字表單訊息與範本注入提示含 quota、抽認卡顯示欄位與空狀態、語音錯誤對照與停用按鈕、四選一畫面模型、Part 5 進度與解析、解碼器分段與淡化、句型篩選與複製降級、資料來源頁列出規則）、src/app 全部檔案依建置順序載入（LD-1～LD-3） |
| E2E | QA | Playwright 以 `file://` 開 `dist/english-master-track.html`；`tests/e2e/`；語音以 `page.addInitScript` 注入假的 `speechSynthesis`、`SpeechRecognition`（可控制 `onresult`／`onerror`）；剪貼簿以覆寫 `navigator.clipboard` 模擬成功與失敗；離線以 `context.setOffline(true)`；localStorage 停用／容量滿以 `addInitScript` 覆寫 `Storage.prototype` | US-01～US-18、US-20、US-24 的畫面行為與文案；AC-04-04／AC-24-07（XSS 字串不產生 `img` 元素）；AC-18-06、AC-21-01（攔截所有 request，數量應為 0）；AC-20-01（4 種視窗 `scrollWidth ≤ clientWidth`）；AC-22-01～AC-22-04（`performance.now()` 量測 10 次，含 `page.emulateCPUThrottling` 不可用時以 CDP `Emulation.setCPUThrottlingRate` 4 倍） |
| 靜態檢查 | QA（FE-18、FE-33、FE-41 先自檢） | grep／腳本 | AC-04-09（禁止 API 不出現）、AC-19-01（外部資源）、AC-19-04（大小）、AC-21-02（金鑰、SDK）、~~AC-21-03（`MediaRecorder`、`getUserMedia` 不出現）~~ **（v0.5 修訂）AC-21-03：(1) `MediaRecorder` 在產物與 `src/app`（`__tests__` 除外）出現 0 次（含註解；B-7 擋）；(2) `getUserMedia` 只出現在 `services/mic.js`；(3) `mic.js` 不出現 `destination`、`Blob`、`createObjectURL`、`FileReader`、`fetch`、`XMLHttpRequest`、`WebSocket`、`sendBeacon`、`localStorage`、`indexedDB`、`caches`；(4) speech-panel 不把音量值傳給任何 store action**；AC-23-06（標頭）；（v0.5）AC-20-04：產物導覽與 `index.html` 不含 `data-tab="decoder"`／`"phrasebank"`、`views/*.js` 無 `data-go` 指向隱藏頁；`src/data/decoder.js`、`phrasebank.js` 內容仍在產物中（以全域變數名稱與筆數確認） |
| 人工驗收 | 人類／QA 列清單 | 實機 Chrome／Edge、Android Chrome | （v0.5）**V-MIC**：見 §10.2；真實麥克風辨識與權限流程（AC-08-01、AC-08-09、AC-08-13、AC-08-14）、真實 TTS 語音與無 en-US 語音裝置（AC-07-01～AC-07-05）、`file://` 雙擊與實際斷網（AC-19-02、AC-19-03）、觸控操作（AC-20-02）、首次載入 5 次量測（AC-22-05）、原創性 20 筆精確片語搜尋（AC-23-04）、V-VOC-18 抽查（§8.4）、V-VOC-17 清單全檢、Part 5 正解唯一性抽查（建議每題型 10 題） |

### 10.1 v0.4 測試命令與新增測試範圍

**命令**（`package.json` 不改；仍為 Node ≥ 22）

| 用途 | 命令 | 時機 |
| :--- | :--- | :--- |
| 全部單元測試 | `npm test`（= `node --test src/app/__tests__/*.test.js`） | 每個任務收尾；FE-33 交付關卡 |
| 只跑本任務的測試 | `node --test src/app/__tests__/<檔名>.test.js …` | 同批有其他任務平行時，doneWhen 以本任務 paths 內的測試檔為準（他任務 paths 內的測試失敗不擋，但須在回報列出） |
| 建置驗證 | `node tools/build.mjs --out <scratchpad>/t.html` | 每個改到 `src/app` 的任務 |
| 交付建置 | `npm run build` | 只有 FE-33 |
| 資料驗證 | `npm run validate:data` | FE-33（本版資料不變，確認無回歸） |

**中間狀態的已知失敗（依相依順序自然修復，不得為此跳過或刪除測試）**

| 改動任務 | 暫時失敗的測試 | 修復任務 |
| :--- | :--- | :--- |
| FE-22（`CURRENT_SCHEMA_VERSION` 改 2） | `store.test.js` 中「`schemaVersion` 2 視為無法讀取」「匯入版本 2 回 `version`」等以 2 當作不支援版本的案例 | FE-25（改用 3，並新增 v1 遷移、v2 讀取案例） |

**新增與修改的單元測試**

| 檔案 | 任務 | 必含案例 |
| :--- | :--- | :--- |
| `learning.test.js`（新） | FE-20 | §7.7 每個函式；AC-30-03 序列 X = 1、1、1、2、3、4（以 `record` 模擬：A flip、A 再 flip、A quiz、B flip、C stt、E quiz）；AC-30-08（3、0、0、10、0、0、4）；AC-30-09 修剪與 30 筆上限；AC-30-10（200 張、50 掌握、10 個集外掌握 → 25；10 題對 7 → 70；空集合與 0 題 → `null`）；AC-30-13 各無效型態（`2026-13-40`、`yesterday`、`2026-02-30`、負數、`1.5`、`"3"`、未來日期、重複與未正規化 wordKey、整欄型別錯）；跨月、跨年、3 月與 11 月的日光節約日（`addDays` 以 UTC 計算，結果與時區無關；可另以子行程設 `TZ=America/New_York` 加測，平台不支援時略過並在回報註明）；不修改輸入（深度凍結輸入後呼叫） |
| `goal.test.js`（改） | FE-20、FE-22 | `TAB_LABELS` 7 項、`NAV_TAB_ORDER` 6 項逐字；`LEARNED_HISTORY_DAYS` 30、`DASHBOARD_CHART_DAYS` 7；（FE-22）`CURRENT_SCHEMA_VERSION` 2、`SUPPORTED_SCHEMA_VERSIONS` `[1, 2]`；全部凍結 |
| `interaction.test.js`（新） | FE-21 | `classifySwipe` 邊界（dx = ±49、±50；`|dx| = |dy|`；垂直為主）；`swipeTarget` 首尾不動；`isTap`；`UI` 每個值 ≤ §7.12 的 PRD 上限；`patternTotal(vibratePattern("correct"｜"wrong")) ≤ 200`；`UI` 凍結 |
| `persist.test.js`、`backup.test.js`（改） | FE-22 | §7.8 每條路徑：v1 遷移（7 欄原值不動、兩欄為預設、即使 v1 內含這兩鍵也覆寫）、v1 `data` 非物件 → unreadable／`format`、v2 RD-1 只重設壞欄、`schemaVersion` 3／0／`"2"` → unreadable／`version`；匯出為 2 且兩欄已正規化；匯入 v1（AC-24-10）、v2 shape 錯 → `format`、v2 項目層級無效 → 捨棄且不計入略過數（AC-24-11）；支援版本字串「1、2」 |
| `dashboard.test.js`（改） | FE-22、FE-31 | （FE-22）版本不相容訊息改為「支援版本：1、2」；（FE-31）`progressModel`：AC-30-02（橘 10、綠 15、730 → 15）、AC-30-05（14/15 未達、15/15 達成金色、18/15）、AC-30-07（跨午夜：同一 data、`today` 前進一天 → X = 0、長條最右為新日期、前一日保留）、AC-30-08、AC-30-10（`—`）；統計標籤「模擬測驗正確率」 |
| `naming.test.js`（新） | FE-23 | 讀 `index.html` 與 `views/*.js` 的字串常值：不得含「抽認卡」「自訂器」；「Part 5」只允許出現在授權／來源文字與模擬測驗頁說明「題型對應多益 Part 5」；導覽 6 個按鈕文字依序 = `TAB_LABELS[NAV_TAB_ORDER[i]]`；各 `section` 的 `aria-label` = `TAB_LABELS` |
| `router-motion.test.js`（新） | FE-24、FE-32 | 極簡假 DOM（`getElementById`、`classList`、`hidden`、`setAttribute`、`dataset`）＋ `vm` 載入 `ui/motion.js`、`ui/router.js`：連續 `go` 3 頁 → 只有最後一頁 `hidden = false` 且其餘無 `view--entering`；`reduced()` 為真時不加 class；`05-motion.css` 的 5 個 CSS 變數 = `interaction.UI` 對應值且 ≤ 上限；含 `prefers-reduced-motion: reduce` 全域規則（`animation: none`、`transition: none`）；（FE-32）首次模式 `go("dashboard")` 回 `false`、`go("sources")` 可、收到 `"entry"` tag 後切到主控台並設 `data-entry="main"` |
| `store.test.js`（改） | FE-25、FE-30 | （FE-25）§7.7 記錄點表每列、LR-7（quota：X 增加、`learningQuota` tag 只一次、storage 原值不變、無 `storage` tag 重複提示）、AC-30-06、AC-30-11（重建 store 讀回）、AC-30-12（v1 → 寫回 v2、無 unreadable 鍵）、AC-30-13；寫出的每筆 `data` 通過 `validatePersistedData(…, { written: true })`。（FE-30）FS-1～FS-7、V-ST-13：首次模式下 `setDraftScore`、`clickColor`、`setTab("sources")` 後 `setItem` 呼叫數 0；`startLearning` 一次寫入且 `schemaVersion` 2；`startLearning` 遇 quota 仍進入 main、主鍵不存在；`unavailable` 每次 init 都 firstRun；主鍵為 `""` → main + unreadable 流程；首次還原成功 → main 且資料 = 備份（300、棕）；四種失敗 → firstRun、主鍵不存在 |
| `shell.test.js`（新） | FE-26 | `index.html` 導覽 6 鈕順序 = `NAV_TAB_ORDER`、`data-tab` 不變、每鈕含 `<svg` 且無 `xmlns`、無 `http`、無 `<img`；`00-base.css` 含 `@media (max-width: 640px)` 區塊內 `position: fixed`、`bottom: 0`、`min-height` ≥ 44px（或 `var(--touch)`）；`ui/bottom-nav.js` 在假 DOM 下 focusin 輸入框加 `is-typing`、focusout 移除、按鈕聚焦不加 |
| `customizer.test.js`（改） | FE-27、FE-32 | （FE-27）`cardModels`：5 張順序、內建字數（`N_O`、`N_B`、`N_G`／「待定」）、每日新字量（10、10、15、20 僅供試算）、鎖定與「即將開放」、選中 = `colorOf(draftScore)`、無「官方門檻」「Tier」。（FE-32）首次模式按鈕區模型：「開始學習」「從備份還原」、無「套用」、無狀態列；一般模式反之 |
| `flashcards.test.js`（改） | FE-28 | `swipeDecision`：中間卡左右、首尾不動、位移 49、垂直為主、quiz 模式一律 `none`；`suppressClick` 時間窗；翻卡只切 `hidden` 與動畫 class、不重建卡片 |
| `flashcard-quiz.test.js`、`part5.test.js`（改） | FE-29 | `feedbackOf(before, after, correctIndex)`：首次作答對／錯 → 對應動畫與震動種類；已鎖定再點 → `null`；`shouldIgnoreClick`：觸控位移 ≥ 10 後 350 ms 內 click 忽略、滑鼠 click 不忽略 |
| `haptics.test.js`（新） | FE-29 | `navigator.vibrate` 為替身函式 → 呼叫 1 次、參數 = `vibratePattern(kind)`；不存在、拋例外 → 回 `false` 不拋出；`console.error` 未被呼叫 |
| `first-run.test.js`（新） | FE-32 | `importFlow.messageOf` 對 `ok`（略過 0、3）、`format`、`version`（`fileVersion` 2.5、`null`）、`quota`、`write_failed` 的輸出與 `dashboard.importMessage` 完全相同；`cancelled` → `null`；`index.html` 的 `body` 有 `data-entry="boot"`、頁尾有 `#footer-first-run-back`；`00-base.css` 含首次模式隱藏 `#app-nav`、`#nav-toggle`、`#customizer-custom` 的規則 |
| `load-order.test.js`（改，如需要） | FE-33 | 新 core（`learning`、`interaction`）與 ui（`motion`、`bottom-nav`、`import-flow`）、service（`haptics`）載入不拋例外且存在 |

**E2E 與人工（QA，`/qa-verify` 時新增；SD 建議範圍）**

| 範圍 | 建議方法 | AC |
| :--- | :--- | :--- |
| 首次流程 | 清空 localStorage 開啟 → 首次畫面元素與隱藏項目、重新整理仍首次且無主鍵、開始學習、藍卡、從備份還原成功與 4 種失敗、資料來源往返、localStorage 停用 | AC-25-01～AC-25-11 |
| 底部導覽 | 375、640、641、768、1366 寬；`position: fixed` 捲動不動；每項 `getBoundingClientRect` ≥ 44；最後元素與 toast 不被遮；`page.emulateMedia` 不需要 | AC-27-01～AC-27-05 |
| 手勢 | CDP `Input.dispatchTouchEvent` 模擬左右滑、49／50px、垂直滑、測驗模式滑動 | AC-28-03～AC-28-06 |
| 動畫 | `getComputedStyle(el).animationDuration`／`transitionDuration` ≤ 上限；`page.emulateMedia({ reducedMotion: "reduce" })` 後為 `0s` 或 `none` | AC-28-01、AC-29-01、AC-31-01、AC-31-03 |
| 震動 | `addInitScript` 以替身記錄 `navigator.vibrate` 呼叫；刪除 `navigator.vibrate` 測 AC-29-03 | AC-29-02、AC-29-03 |
| 今日進度 | 以 `addInitScript` 固定 `Date` 測跨午夜；預寫 v1 狀態與壞欄位測遷移；容量滿測 AC-30-14 | AC-30-01～AC-30-14 |
| 效能 | AC-22-01 量「click → `emt-page-shown` mark」與下一個 `requestAnimationFrame`；AC-22-05 量到 `emt-ready` | AC-22-01、AC-22-05、AC-28-03 |
| 人工 | Android Chrome 實機：滑動手感、震動、虛擬鍵盤不遮輸入（AC-27-03）、iOS Safari 不震動不報錯 | AC-27-03、AC-29-02、AC-29-03 |

### 10.2 v0.5 測試範圍（PRD v0.9）

命令與規則同 §10.1（`npm test`、只跑本任務測試、建置到 scratchpad；只有 FE-41 執行 `npm run build`）。

**中間狀態的已知失敗（依相依順序自然修復，不得為此跳過或刪除測試）**

| 改動任務 | 暫時失敗的測試 | 修復任務 |
| :--- | :--- | :--- |
| FE-34（`NAV_TAB_ORDER` 改 4 項） | `naming.test.js`「導覽 6 個按鈕」、`shell.test.js`「6 個按鈕依序 = NAV_TAB_ORDER」「文字 = TAB_LABELS[NAV_TAB_ORDER[i]]」（`index.html` 仍有 6 鈕） | FE-38 |
| 其他 | 預期無：store 保留 `applyGoal()` 原行為（只新增 API），既有 store、customizer、flashcards、part5 等測試不受影響。若實際出現本表以外的失敗且檔案不在該任務 paths → 該任務標 `blocked` 回報主控 | — |

**新增與修改的單元測試**

| 檔案 | 任務 | 必含案例 |
| :--- | :--- | :--- |
| `goal.test.js`（改） | FE-34 | `NAV_TAB_ORDER` 恰為 `["dashboard","customizer","flashcards","part5"]`；`HIDDEN_TAB_IDS` 恰為 `["decoder","phrasebank"]`；`LEARNING_PROGRESS_FIELDS` 與契約 `data-schema.ts` 逐項同序（6 項）；三者凍結；`NAV_TAB_ORDER` ∩ `HIDDEN_TAB_IDS` = ∅；`NAV_TAB_ORDER` ∪ `HIDDEN_TAB_IDS` ∪ {`sources`} = `TAB_LABELS` 的鍵；`TAB_LABELS` 仍 7 項不變 |
| `reinit.test.js`（新） | FE-34 | `effectiveChanged`：600→650、600→730、600→860、730→600 皆 `false`；600→300、300→600、橘→棕皆 `true`（AC-32-05、CI-3）。`recordFlags`：AC-32-07 六種狀態各只有 1 項為 `true`；(e) 只有 today 一筆（= X）→ `false`（FB-33），today − 1 與 today − 29 → `true`、today − 30 與未來日、非法鍵、值 0 → `false`；(d) `date` ≠ today → `false`；全空 → `hasLearningRecord` 為 `false`（AC-32-06）。`needsConfirm` 四種組合。`buildReinitData`：6 欄 `deepEqual` `persist.defaultData()` 對應欄；`goal` = 新值；`customVocab` 深度相等且順序、11 欄不變；`sttNoticeAcknowledged` 保留；鍵集合與輸入相同（AC-32-10）；輸入深度凍結後呼叫不拋例外且不變；結果經 `normalizeLearning` 後通過 `persist.validatePersistedData(…, { written: true })`；`defaults` 缺欄 → 拋含欄位名的 `Error` |
| `meter.test.js`（新） | FE-35 | AC-33-04：−55、−45、−35、−25、−15、−5 dBFS → 0～5，`-Infinity`（靜音）→ 0；恰等於門檻 → 點亮；`levelOf` 亮格連續；以 48 kHz、2048 樣本、振幅 `√2 × 10^(dB/20)` 的 1 kHz 正弦產生 6 段樣本，`levelOfSamples` 結果同上；`bytesToFloat`；`fftSizeFor(48000)` = 2048、`44100` = 2048、`16000` = 1024、`8000` = 512、`0` = 2048，且 `fftSize ÷ rate ≤ 0.1`；`validateThresholds(THRESHOLDS_DBFS).ok`；超出 ±10、非遞增、相鄰差 5、T5 = −8 皆不通過；`UPDATE_INTERVAL_MS ≤ 100`；常數凍結 |
| `mic.test.js`（新） | FE-36 | 以 `create()` 注入替身：首次 `acquire` 呼叫 `getUserMedia` 1 次且參數為 `{ audio: true }`；再次 `acquire` → `reused: true` 且不再呼叫；§7.14 錯誤對照表每個 `name` 對應的 `reason`；無 `mediaDevices` → `unavailable`；`release()` 後所有替身 track 的 `stop` 被呼叫、`readyState === "ended"`、`AudioContext.close` 被呼叫、計時器清除、`isActive() === false`，重複呼叫不拋例外；取得中 `release()` → 晚到的 track 被停止且回 `released`；track 觸發 `ended` → `isActive()` 為 `false`、`onTrackEnded` 回呼被呼叫、下次 `acquire` 再呼叫 `getUserMedia`；`AudioContext` 建構拋例外 → `{ ok: true, metering: false }`；任何節點都未 `connect` 到 `destination`；`startMeter` 以替身 analyser 回傳正弦樣本 → `onLevel` 收到預期格數且只在改變時呼叫；`stopMeter` 後不再回呼；`pagehide` 只登錄一次且觸發 `release`；所有路徑 Promise 不 reject；原始碼掃描 `mic.js` 不含 `MediaRecorder`、`Blob`、`createObjectURL`、`FileReader`、`fetch`、`XMLHttpRequest`、`WebSocket`、`sendBeacon`、`localStorage`、`indexedDB`（以字串拼接方式寫斷言，避免測試檔本身成為誤判來源不影響產物） |
| `store.test.js`（改） | FE-37 | AC-32-05 四步皆 `"applied"` 且學習欄位不變；AC-32-06 → `"applied"`；AC-32-01 → `"confirm"`，`state.data` 同一物件、`setItem` 0 次、`effectiveColor` 仍綠；`confirmApplyGoal` 成功：`setItem` 恰 1 次、寫出 `schemaVersion` 2、6 欄 = 預設、`goal` 300／棕、`customVocab` 與 `sttNoticeAcknowledged` 不變、鍵集合不變、`flashcard.index` 0 且正面、`studySet` 長度 = 新色級內建數 + 自訂數（AC-32-03）、`part5.currentIndex` 0；以同一假 storage 重建 store 讀回結果相同（AC-32-02「重新載入」）；AC-32-09：確定後翻同一字 → X = 1、`streak.days` = 1；quota 與一般例外：`state.data` 學習欄位與 `goal.appliedScore` 不變、storage 原值不變、`draftScore` = `appliedScore`、未發 `storage`／`learningQuota` tag、`learningQuotaNoticeShown` 不變、回 `{ ok: false, reason }`；`unavailable`：`setItem` 0 次、記憶體已初始化；`cancelApplyGoal`：`setItem` 0 次、`draftScore` 還原、tag `goal`；首次模式 `requestApplyGoal` → `"ignored"`；AC-32-08 (b) 匯入不同色級備份不清除；`setTab("decoder")`、`setTab("phrasebank")` 在一般模式不改 `currentTab` |
| `customizer.test.js`（改） | FE-40 | 匯出純函式 `reinitDialogOptions()` 的標題、內文（逐字含 AC-32-01 兩段文字）、按鈕文字；以假 store 與假 `ui.dialog` 驅動「套用」：`"confirm"` → 開視窗；確定 → 呼叫 `confirmApplyGoal`，失敗 → toast「儲存空間不足，未套用」；取消 → `cancelApplyGoal`；視窗開啟中再按「套用」不重複開窗；`"applied"` → 不開窗；首次模式仍為「開始學習」；原始碼掃描 `customizer.js` 不含 `.applyGoal(` 呼叫 |
| `naming.test.js`、`shell.test.js`（改） | FE-38 | 導覽 4 鈕依 `NAV_TAB_ORDER` 與 `TAB_LABELS`；每鈕仍含 SVG、無 `xmlns`；`index.html`（去除註解後）不含 `data-tab="decoder"`、`data-tab="phrasebank"`，可見文字與 `aria-label` 不含「解碼器」「句型庫」；兩個隱藏 section 仍存在且有 `hidden`、無 `aria-label`；底部導覽 CSS 為 4 欄 |
| `router-motion.test.js`（改） | FE-38 | 既有以 `go("decoder")`／`go("phrasebank")` 驗證換頁的案例改用其他頁（如 `part5`、`sources`）；新增：一般模式 `go("decoder")` → 回 `false`、目前頁為 `dashboard`、隱藏頁 section 仍 `hidden`、`mount` 未被呼叫；首次模式 `go("decoder")` → `false` 且仍在 `customizer`；`hashchange` 到 `#decoder`、`#view-phrasebank`、`#/decoder` → 主控台；`#flashcards` 等其他片段 → 不切頁；啟動時 `location.hash = "#phrasebank"` → 主控台；全程無 `console.error` |
| `dashboard.test.js`（改） | FE-38 | `ENTRIES.map(tab)` = `["customizer","flashcards","part5","sources"]`；`label` = `TAB_LABELS`；不含隱藏頁 |
| `speech.test.js`（改） | FE-39 | `messageForError("audio-capture")` →「找不到麥克風裝置」＋補充說明；`not-allowed` 等不變；`messageForAcquire` 四種 `reason`；`TEXT.notice` 逐字 = AC-08-13（v0.9）；`meterBarsOf(0～5)`。以極簡假 DOM 與替身 `mic`、`stt`、`store`、`ui.dialog` 驅動麥克風按鈕：不支援 → 只 toast、`acquire` 0 次；離線 → `acquire` 0 次；說明「取消」→ `acquire` 0 次；「我知道了」→ `acquire` 後 `stt.start`；`permission`／`notfound` → 對應訊息、`stt.start` 0 次、收音條全暗；`unavailable` → `stt.start` 1 次、收音條全暗、無訊息；聆聽中 `onLevel(3)` → 恰前 3 格 `is-on`；結果、錯誤、逾時、再按停止、`reset()` 後同步 5 格全暗且 `stopMeter` 被呼叫；聆聽中觸發 track ended → `stt.abort`、「找不到麥克風裝置」；`reset()` 不呼叫 `mic.release`、`release()` 會呼叫；所有 store action 的參數中沒有音量數字（spy） |
| `flashcards.test.js`（改） | FE-39 | 原始碼掃描或 vm：`hide()` 呼叫 `speechPanel.release`（不存在時退回 `reset`） |
| `build.test.js`（改） | FE-41 | 程式含 `MediaRecorder` 字樣 → `BuildError`（禁止樣式）；既有案例不變 |
| `load-order.test.js`（改） | FE-41 | `EMT.core.meter`、`EMT.core.reinit`、`EMT.services.mic` 依建置順序載入不拋例外且存在；`register` 的頁面仍含 7 個 TabId（隱藏頁仍登錄，HT-5） |

**E2E 與人工（QA，`/qa-verify` 時新增；SD 建議範圍）**

| 範圍 | 建議方法 | AC |
| :--- | :--- | :--- |
| 初始化確認 | 以 `addInitScript` 預寫 `schemaVersion` 2 的狀態（6 種單項成立、全不成立、自訂 3 字含 `monetization`）；按「套用」後檢查視窗文字、按鈕數、背景點擊無效；確定／取消／Esc／點背景；`Storage.prototype.setItem` 替身拋 `QuotaExceededError` 測 AC-32-11 (b)；停用 localStorage 測 (a)；重新載入；匯出備份比對 | AC-32-01～AC-32-11 |
| 收音條（替身音源） | `addInitScript` 覆寫 `navigator.mediaDevices.getUserMedia`，回傳測試頁自建 `OscillatorNode` → `createMediaStreamDestination().stream`（**屬 QA 測試腳本，不在產品程式中**），依 §7.14 門檻產生 6 段 RMS；或 Chrome `--use-fake-device-for-media-stream --use-file-for-fake-audio-capture`。量 `.sp-meter__bar.is-on` 數量與更新間隔；替身拋 `NotFoundError`、`NotAllowedError`、`NotReadableError`、刪除 `mediaDevices`；以替身 track 觸發 `ended` | AC-33-03～AC-33-08、AC-08-02、AC-08-09 |
| 隱藏頁 | 375、1366 寬檢視導覽、底部導覽、主控台、頁尾；網址列輸入 `#decoder`、`#phrasebank`、`#view-decoder`；重新載入；匯入備份；確認 `window.DECODER_SENTENCES.length ≥ 50`、`ACADEMIC_PHRASEBANK.length ≥ 100` 仍在產物中 | AC-20-03、AC-20-04、AC-27-01、AC-17-06 |
| 靜態 | 依 §10「靜態檢查」v0.5 列 | AC-21-03、AC-20-04 |

**V-MIC 實機驗證（PRD US-33；Windows 11 上的 Google Chrome 與 Microsoft Edge，皆以 `file://` 開啟）**

| 項目 | 內容 |
| :--- | :--- |
| 環境 | Windows 11；Google Chrome 與 Microsoft Edge 各自的最新穩定版（記錄版本號）；以檔案總管**雙擊** `dist/english-master-track.html`，網址列為 `file:///…/english-master-track.html`；該瀏覽器對此檔案的麥克風權限為預設「詢問」（每次測試前關閉所有該瀏覽器視窗再開）；1 支可用麥克風；已連網；localStorage 已有「STT 說明已讀」（先在單字卡頁按麥克風 →「我知道了」→ 拒絕或允許皆可，然後關閉瀏覽器重開） |
| 偵錯輔助 | `EMT.services.mic.tracks()` 回傳目前持有音軌陣列的**複本**（只供 DevTools 檢查，不進 store）。AC-33-02：在單字卡頁取得麥克風後於 Console 執行 `t = EMT.services.mic.tracks()`，離開後執行 `t.map(x => x.readyState)` 應全為 `"ended"` |
| V-MIC-1（AC-33-01） | 進單字卡頁 → 按麥克風、在權限詢問選「允許」、完成 1 次辨識；不離開本頁（期間換卡、翻面、切測驗模式再切回）再按 4 次；記錄權限詢問出現次數（應為 1），Chrome、Edge 各 1 輪 |
| V-MIC-2（AC-33-02） | 由導覽與主控台入口各離開 1 次；另測 F5 重新整理與關閉分頁：1 秒內分頁與網址列的麥克風使用中圖示消失；Console 檢查 `readyState`。回單字卡頁再按麥克風，若再次詢問屬可接受 |
| V-MIC-3（AC-33-03、AC-33-08） | 說話時 5 格依音量點亮、靜默時歸暗；Windows「設定 → 協助工具 → 視覺效果 → 動畫效果」關閉後重測：收音條仍即時變化、無漸變，「聆聽中」不閃爍 |
| V-MIC-4（AC-08-09） | 權限詢問選「封鎖」→「需要麥克風權限」與開啟方式、收音條全暗、不辨識；再按一次會重新嘗試 |
| V-MIC-5（AC-33-05、AC-33-06） | 拔除 USB 麥克風（或於 Windows 裝置管理員停用）後按麥克風 →「找不到麥克風裝置」；聆聽中拔除 → 聆聽結束、收音條全暗、顯示錯誤提示 |
| 結果判定 | AC-33-01 若實測出現第 2 次詢問：QA 開 BUG 並附瀏覽器版本，由人類判斷是否接受為瀏覽器限制（PRD R-18 二） |

### 10.3 v0.6 測試範圍（PRD v0.10）

命令與規則同 §10.1（只有 FE-44 執行 `npm run build`）。三個任務依序執行（不平行），每個任務收尾時 `npm test` 只允許出現下表「暫時失敗」所列、且屬後續任務 paths 的失敗。

**中間狀態的已知失敗（依相依順序自然修復，不得為此跳過或刪除測試）**

| 改動任務 | 暫時失敗的測試（不在該任務 paths） | 修復任務 |
| :--- | :--- | :--- |
| FE-42（`SCORE_DEFAULT` 725、`scoreAfterColorClick` 語意改變） | `customizer.test.js`：以 `_fixtures.makeStore()` 預設資料（現為 725）斷言輸入框／滑桿為 "600" 的 FE-40 案例；測試替身 store 以 `scoreAfterColorClick` 斷言「300 點綠 → 470」的案例 | FE-43 |
| 其他 | 預期無：`dashboard.test.js`、`load-order.test.js`、`backup.test.js`、`reinit.test.js` 的 600 皆為明示的 fixture 分數，不依賴預設值。若實際出現本表以外的失敗且檔案不在該任務 paths → 該任務標 `blocked` 回報主控 | — |

**新增與修改的單元測試**

| 檔案 | 任務 | 必含案例 |
| :--- | :--- | :--- |
| `goal.test.js`（改） | FE-42 | `C.SCORE_DEFAULT === 725` 且 = 綠色 `scoreMax`（兩處：第 56 行附近與 vm 載入段）；`scoreForCard`：5 色 → 215、465、725、855、990，未知 → `null`；`scoreAfterColorClick(S, id)` 對任意合法 `S`（10、300、600、725、735、990）皆回該色 `scoreMax`，未知色級回 `S`；刪除 Q-32 案例（300 點綠 → 470、500 點綠 → 500、600 點藍 → 730／金 → 860），改為 AC-01-05 (a)(b)（300 → 725、600 → 725）、AC-01-07（藍 855、金 990，`effectiveColorOf` 為綠）；AC-02-04 依序點 5 色 → `colorOf(scoreForCard(id)) === id`；AC-26-06 的 12 個分數 `colorOf`／`dailyNewWords` 依序為 PRD 所列 |
| `persist.test.js`（改） | FE-42 | `defaultData()` 的 `goal` = `{ 725, 725, "green", "green" }`（以 `C.SCORE_DEFAULT` 表示）；與 `storage-schema.json` 範例一致（契約 v0.10 範例已為 725，修改前此案例即失敗）；GS-4：`draftScore`／`appliedScore` 為 600、735 的 v2 紀錄與 v1 紀錄（MG-2）讀取後分數原值保留、色級依 V-ST-02 重算；GS-5：`723`、`"600"`、`600.5` 仍為 unreadable（不四捨五入） |
| `store.test.js`（改） | FE-42 | 預設值相關案例（首次啟動、localStorage 停用、讀取失敗重設、AC-25-04 首次重新整理、`startLearning` 未點卡片）的 600 改為 725；「clickColor 依 Q-32」改寫為 GS-2：既有 600 點綠 → 725（AC-01-05 (b)）、300 點綠 → 725、點藍 855、點金 990、再點目前選中色級仍為上限；一般模式點卡片使分數改變時照常寫入（`setItem` ≥ 1 次，沿用現行 `setDraft` 行為）、首次模式 0 次；V-ST-16：每次點卡片後 `draftScore ∈ {215, 465, 725, 855, 990}`；GS-3／AC-26-06：12 個分數各以 `draftScore = appliedScore = 值` 預寫（FB-36）→ init 後 `colorOf(draftScore)` 為 PRD 所列、不點卡片 `requestApplyGoal()` 後 `appliedScore` 與 localStorage 皆為原值、`schemaVersion` 2、重建 store 讀回仍為原值；AC-32-01／02／04～07 中「將分數改為 300」「600 → 650／730／860」的步驟改為點卡片（棕 465、綠 725、藍 855、金 990），預期值依 PRD v0.10（如 AC-32-02 確定後 `appliedScore` 465；AC-32-04 取消後 `draftScore` 600）；以 600 代表「v0.9 既有分數」的 fixture 保留 |
| `_fixtures.js`（改，如需要） | FE-42 | 若需新增「既有分數」fixture（如 `makeStore({ goalScore: 735 })`），以選項加入，不改變預設行為 |
| `customizer.test.js`（改） | FE-43 | `cardModels` 不含 `range` 欄位；卡片 DOM 文字不含 `/\d+～\d+/` 與「分」字尾的範圍文字；`statusTexts` 不含 `score`；狀態列 DOM 無「目前目標分數」；分數區 `section.cz-score` 存在但 `hidden === true` 且有 `inert`，滑桿與輸入框 `disabled` 且 `tabindex="-1"`（AC-26-05 (a)(b) 的單元層代理）；首次與一般模式皆同；依序點 5 張卡片後 `#cz-score-error` 仍 `hidden`、無「請輸入 10～990 的分數」可見節點；原有以輸入框／滑桿建立狀態的案例改為點卡片（如「300 → 點綠」改為「預寫 300（棕）→ 點綠 → 725、只有綠卡選中」）；AC-26-06：預寫 735 → 選中藍、試算每日新字量 20，不點卡片按「套用」→ `requestApplyGoal` 前 `setDraftScore` 呼叫 0 次；「開始學習」改為「不讀輸入框、直接 `startLearning`」；FE-40 的 AC-32-04 案例改以選中卡片判定：既有 600（綠）、點棕 →「套用」→ 取消 → 綠卡 `aria-pressed="true"`、試算每日新字量 15、store `draftScore` 600；確定但寫入失敗同樣回到綠卡；原以預設 600 斷言輸入框值的案例改為斷言選中卡片與 `draftScore === C.SCORE_DEFAULT`；暫停 AC（AC-02-01、02、09、AC-26-03）專用的滑桿／輸入框同步案例可保留並在名稱加註「v0.10 暫停，程式保留」，或刪除（二擇一，回報註明） |
| `dashboard.test.js`（改） | FE-43 | `goalInfoOf` 回傳物件不含 `appliedScore` 鍵（`"appliedScore" in g === false`）；目標色級、生效色級、每日新字量案例不變（藍 855／金 990 → 生效「綠（內建上限）」、15 字/天）；原始碼掃描 `dashboard.js` 不含「目前目標分數」 |
| `naming.test.js`（改） | FE-43 | 難易度設定說明文字改為「選擇色級即時試算，按「套用」後才會更新單字卡的單字集。」；其餘不變（單字卡空狀態提示不在本版範圍，見 SD-FB-28） |
| `first-run.test.js`（改，如需要） | FE-43 | 確認首次相關案例不依賴 600；如以 `setDraftScore` 構造「首次畫面上未生效的選擇」，改為 `clickColor`（如點金 → 990），預期值隨之調整 |
| `load-order.test.js`（改） | FE-44 | 依建置順序載入後 `EMT.core.constants.SCORE_DEFAULT === 725`、`EMT.core.goal.scoreForCard("green") === 725` |

**E2E 與人工（QA，`/qa-verify` 時新增；SD 建議範圍）**

| 範圍 | 建議方法 | AC |
| :--- | :--- | :--- |
| 不顯示分數 | 375、1366 寬；首次畫面、一般頁、主控台：`page.getByRole("slider")`、`input[type=range]`、`#cz-score-input` 皆不可見；`page.keyboard.press("Tab")` 逐一走完，`document.activeElement` 從未是滑桿或輸入框；可見文字不含 `/\d+～\d+ 分/`、「目前目標分數」、「請輸入 10～990 的分數」；監聽 `pageerror` 與 `console` error 為 0 | AC-26-05、AC-25-01、AC-01-01、AC-26-01、AC-17-06 |
| 點卡片與預設 | 清空 localStorage → 首次畫面選中綠、localStorage 無主鍵；按「開始學習」後主鍵 `goal` 為 725；點 5 色後套用，依序檢查 localStorage 215、465、725、855、990 | AC-18-02、AC-25-04、AC-02-04、AC-01-05 |
| 既有分數 | 依 FB-36 預寫 `draftScore = appliedScore` = 12 個值；檢查選中卡片、試算每日新字量、不點卡片按「套用」後主控台色級與 localStorage 原值 | AC-26-06 |
| 取消回原色級 | 預寫 600（綠）+ 學習紀錄 → 點棕 →「套用」→ 取消／Esc／點背景 → 綠卡選中、每日新字量 15、localStorage `draftScore` 600 | AC-32-04 |
| 效能 | 點卡片 10 次量 click → 下一個 `requestAnimationFrame`，含 4 倍降速 | AC-22-04 |

### 10.4 v0.7 測試範圍（PRD v0.11；契約 V-PWA-01～12、DS-17）

命令同 §10.1；新增 `npm run serve`。FE-45～FE-52 收尾時只跑 `npm test` 與 `node tools/build.mjs --out <scratchpad>/t.html`（FE-47 完成後此命令也會在 `<scratchpad>/site/` 產生部署目錄；圖示與 `ads.txt` 由第 0 批 MC-01、MC-02 先放好）；只有 FE-53 執行 `npm run build`。

**中間狀態的已知失敗**：預期無。理由：(1) FE-47 把 `build.test.js` 既有 fixture 一律加 `site: false`，舊模板（無 `@@BUILD_ID@@`）走非 PWA 模式，行為不變；(2) FE-50 在 `index.html` 加入佔位後、FE-47 完成前，舊建置會把 `@@BUILD_ID@@` 原樣留在 HTML（不觸發任何檢查），只影響 scratchpad 產物；(3) `store.test.js`、`dashboard.test.js` 若有「`runtime` 鍵集合完全相等」類斷言，由同檔所屬的 FE-49、FE-51 更新。若實際出現不在該任務 paths 的失敗 → 該任務標 `blocked` 回報主控。

**單元測試（`npm test`，Node，無瀏覽器）**

| 檔案 | 任務 | 必含案例 | AC／契約 |
| :--- | :--- | :--- | :--- |
| `pwa-core.test.js`（新） | FE-45 | 11 個常數與 `docs/02-contract/data-schema.ts` §12 逐值相同（期望值在測試內由契約原文逐字複製，以 `deepStrictEqual` 比對；測試不讀 `docs/`）；`PWA_MANIFEST` 鍵順序為契約順序、鍵恰 10 個；深度凍結；V-PWA-08 七列判定表全部（含 getter 拋例外、`file:` 時 `navigator` getter **未被讀取**）；`isStandalone` 4 種（matchMedia 真、`navigator.standalone` 真、皆假、例外）；`installVisible` 逐一把 6 個條件設為不成立皆 `false`；`updateVisible`；`needsRecheck`（`null`、差 3,599,999、3,600,000）；`initialPwaState` 每次新物件且鍵 = `PWA_STATE_KEYS` | V-PWA-08、IN-1、UP-6、UP-3、AC-37-04、AC-34-08 |
| `sw.test.js`（新） | FE-46 | 讀範本、以測試內小函式做與 B-15 相同的兩個替換，在 `vm` 沙箱執行（替身 `self`、`caches`、`fetch`、`Request`、`URL`、`clients`；`self.location.href = "https://u.github.io/p/sw.js"`）：install 時 `fetch` 6 次且每次 `cache: "reload"`、`./` 與 `./index.html` 兩鍵內容相同、快取名 = `english-master-track-pwa-<id>`；任一回應 404 → `caches.delete(CACHE_NAME)` 且 `waitUntil` 的 Promise reject；install 不呼叫 `skipWaiting`；activate 刪 `english-master-track-pwa-old`、保留 `other-project-cache` 與目前快取，之後 `clients.claim()`；fetch：7 個網址 GET → `respondWith`、POST、跨來源、`?x=1`、`/p/sw.js`、`/p/ads.txt`、`/favicon.ico` → 不呼叫；命中回快取、未命中 `fetch` 且不 `put`；message：`{type:"SKIP_WAITING"}` → `skipWaiting` 1 次，`{type:"SKIP_WAITING", x:1}`、字串、`null` → 0 次；原始碼掃描 B-15 禁用字串（V-PWA-05） | SW-1～SW-11、AC-35-01、AC-35-05、AC-36-05、AC-37-05 |
| `build.test.js`（改） | FE-47 | 既有案例加 `site: false` 後全部通過；新增 PWA fixture（模板含 HD-1、佔位；`pwa/sw.template.js`；4 張以測試內函式產生的最小 RGB PNG；`00-base.css`；`ads.txt`）：(1) 部署目錄恰 8 檔、`index.html` = `out`、`ads.txt`／PNG 位元組相同（V-PWA-01）；(2) manifest 深度相等（V-PWA-02）；(3) PNG 色彩類型 6、含 `tRNS`、尺寸不符、缺檔 → `PWA_ICON`（V-PWA-03）；(4) HD-1 缺任一、靜態 `<link rel="manifest" href=…>`、`<link rel="apple-touch-icon" …>`、第二個 `data:,` 連結 → 中止（V-PWA-04、HD-3）；(5) `sw.js` 的 BUILD_ID = HTML meta、`CACHE_NAME` 前綴、預先快取 7 項；範本含 `importScripts` 或 `addEventListener("push"` → `PWA_SW`（V-PWA-05）；(6) **V-PWA-06**：同 fixture `write: false` 建 2 次三檔位元組相同；改資料 1 字、改 app 1 字、換 1 張 PNG、改 `sw` 範本 1 字 → BUILD_ID 各不同；只改 `ads.txt` → BUILD_ID 不變；(7) `--bg` 不符 → `PWA_BG_COLOR`；(8) 部署目錄內有多餘檔案 → `SITE_DIR_UNEXPECTED` 且原檔仍在；(9) 中止時 `out` 與部署目錄都未寫；(10) `parseArgs` 的 `--site`、`--no-site`、`--ads` 與衝突；(11) 原始碼掃描 `build.mjs` 無 `Math.random`、`Date.now`、`process.env`；(12) `serve.mjs` 以真實 `http` 在隨機埠啟動：MIME、`Cache-Control`、base 外 404、路徑穿越 404、POST 405 | AC-36-01、AC-36-02、AC-36-07、AC-34-01、AC-34-04、AC-37-01、AC-19-01、AC-23-06 |
| `pwa-service.test.js`（新） | FE-48 | `create(fakeGlobal)`：(a) `file:`／`http://192.168.0.2` → `start` 回 `{false,false}`、`onChange` 0 次、`register` 0 次、`addEventListener("beforeinstallprompt")` 0 次、`<head>` 無新節點（PE-2，V-PWA-07 單元代理）；(b) https → `onChange({eligible:true, standalone:false})`、head 加 2 個連結（`rel`、`href`、`sizes` 正確，相對路徑）、`load` 前不註冊、`load` 後 `register("./sw.js", {scope:"./", updateViaCache:"none"})` 1 次；`readyState === "complete"` 時下一輪註冊；(c) `register` reject → 無 `onChange`、無未處理 rejection、`console.error` 0 次（PE-3）；(d) V-PWA-10：首次（`controller` null）安裝不設 `updateAvailable`；有 `waiting`＋`controller` → 設定；`updatefound`→`installed` 且有 controller → 設定；`requestReload` 連按 2 次 → `postMessage` 恰 1 次且內容恰 `{type:"SKIP_WAITING"}`；`controllerchange` 2 次 → `reload` 1 次；未按時 `controllerchange` → 0 次；無 `waiting` 時 `requestReload` → 直接 `reload`；(e) UP-3：`visibilitychange` 未滿 1 小時不 `update`、滿 1 小時 `update` 1 次且更新 `lastUpdateCheckAt`；`update` reject 靜默；(f) V-PWA-09：無 `prompt` 的事件忽略；有效事件 → `preventDefault` 1 次、`installPromptAvailable:true`；`requestInstall` 連呼 2 次 → `prompt` 1 次，且 `onChange({installPromptAvailable:false, installSuppressed:true})` 早於 `prompt`；之後再來事件 → 忽略；`appinstalled` → suppressed；`standalone` 時事件忽略；`prompt` 拋例外靜默；(g) 原始碼掃描（§7.18.8 前三列） | AC-34-06～AC-34-10、AC-35-01、AC-36-03、AC-36-06、AC-37-01～AC-37-04 |
| `store.test.js`（改） | FE-49 | 初始 `runtime.pwa` 等於 `initialPwaState()`；`setPwa` 合法 patch → 通知 `["pwa"]`、`setItem` 0 次（一般與首次模式各一次）；相同值 → 不通知；未知鍵、字串 `"true"`、物件值 → 忽略；`importBackup`、`confirmApplyGoal`、`startLearning` 後 `pwa` 保持；`exportBackup` 的 JSON 不含 `pwa`；localStorage 鍵集合與 `StorageRecord` 欄位在 `setPwa` 前後相同（V-PWA-11 單元代理） | AC-36-04、AC-37-06 |
| `shell.test.js`（改） | FE-50 | `index.html`：HD-1 7 個元素逐字各 1 次、在 `</head>` 前；無 HD-3 禁止元素、無 `<link` 其他寫法；`#pwa-update` 在 `#app-banner` 之後、`#app-main` 之外、預設 `hidden`、`role="status"`；`<title>` 不變 | AC-34-04、AC-34-05、AC-36-02、AC-37-01 |
| `pwa-notice.test.js`（新） | FE-50 | 替身 store：`updateVisible` 假 → `hidden`；真 → 顯示，文字逐字「有新版本，重新整理」「重新整理」；首次模式也顯示；點擊 2 次 → `onReload` 1 次且按鈕 `disabled`；`80-pwa.css` 中 `.pwa-update` 規則無 `transition`／`animation`；`main.js` 原始碼依序含 `pwa.start` 於 `router.start` 前、`pwaNotice.init` 於其後 | AC-36-03、AC-31-03 |
| `dashboard.test.js`（改） | FE-51 | NT-1 文字逐字、為按鈕列的下一個兄弟、`eligible` 真假皆存在；安裝區：`installVisible` 假 → 無按鈕且容器 `hidden`；真 → 1 個按鈕文字「安裝 App」、`data-action="install-app"`；點擊呼叫替身 `services.pwa.requestInstall` 1 次；收到 `"pwa"` tag 後依新狀態增刪；`show()` 時重繪 | AC-24-12、AC-34-07～AC-34-10 |
| `sources-page.test.js`（改） | FE-52 | 聲明清單多 1 條，逐字等於 AC-23-02 品牌標識聲明；`copyrightHolder` 缺漏時仍為 JimmyLin | AC-23-02 |
| `load-order.test.js`（改） | FE-53 | `EMT.core.pwa`、`EMT.services.pwa`、`EMT.ui.pwaNotice` 依建置順序載入不拋例外且存在；`EMT.core.pwa.PWA_TEXTS.installButton === "安裝 App"` | LD-1、LD-2 |

**E2E（QA；本機 V-PWA (b)，Playwright Chromium）**——http `localhost` 為安全環境，**不需要 https 憑證**。

| 步驟 | 指令／做法 |
| :--- | :--- |
| 準備 V1 | `npm run build` → `npm run serve`（`http://localhost:8080/english-master-track/`）。Playwright `browser.newContext({ serviceWorkers: "allow" })` |
| 準備 V2（AC-36-01 (b)、AC-36-03） | 不得改 `src/`：把 `src/app` 複製到 scratchpad、改 1 個字 → `node tools/build.mjs --app <scratch>/app --out <scratch>/v2/t.html`（部署目錄在 `<scratch>/v2/site`）→ 停止伺服器、以 `--dir <scratch>/v2/site` 同埠重啟（同來源，模擬重新部署） |
| 離線 | `context.setOffline(true)` 後 `page.reload()`；或停止伺服器（更接近真實斷網） |
| 404 情境（AC-37-03） | 把 `dist/site` 複製到 scratchpad、刪除 manifest／`sw.js`／圖示後以 `--dir` 提供 |
| 安裝事件（AC-34-07～10） | Chromium 自動化環境不一定觸發 `beforeinstallprompt`；以 `page.evaluate` 派送附 `prompt()`、`userChoice` 的替身事件（FB-42） |
| 請求記錄（AC-37-05、AC-21-01） | `context.on("request")`（含 SW 發出的請求，需 `serviceWorkers: "allow"`）；斷言全部為 `http://localhost:8080/english-master-track/` 下 7 個預先快取網址或 `sw.js`、方法 GET、無跨來源 |

| 範圍 | 建議方法 | AC |
| :--- | :--- | :--- |
| `file://` 不受影響 | 以 `file://` 開 `dist/english-master-track.html` 與「只複製 HTML 到空資料夾」：`navigator.serviceWorker.getRegistrations()` 為空、DOM 無 manifest／apple-touch-icon 連結、請求 0、`console` error／warning 0、無 `#pwa-update` 顯示、無安裝按鈕、NT-1 顯示；既有 AC-19-*、AC-22-05 照常 | AC-37-01、AC-37-02、AC-24-12 |
| manifest 與圖示 | DOM 有 2 個動態連結；直接 GET manifest：JSON 合法、與契約常數相等；GET 4 張圖示 200、`image/png`、實際尺寸（讀 PNG IHDR 寬高） | AC-34-01、AC-34-04、AC-34-05（連結部分） |
| 註冊與快取 | 等待 `navigator.serviceWorker.ready`（≤ 10 秒）：`registration.scope` = 部署目錄網址；`caches.keys()` 只有 1 個本專案快取、`keys()` 恰 7 項 | AC-35-01、AC-37-05 |
| 離線開啟 | 離線後重新載入 `./` 與 `./index.html`：主控台可用、請求由 SW 回應；量 5 次載入時間 | AC-35-02、AC-35-04 |
| 快取寫入失敗 | 以 404 的圖示讓 install 失敗：線上功能正常、無 pageerror、無提示 | AC-35-05、AC-37-03 |
| 更新 | V1 → V2：60 秒內出現提示；按「重新整理」→ 重新載入 1 次、`meta[name=emt-build-id]` = V2；不按時關閉全部分頁重開為 V2；V2 啟用後 `caches.keys()` 只剩 V2、手動建立的 `other-cache` 仍在；離線時不提示 | AC-36-03、AC-36-05、AC-36-06 |
| 資料不變 | 更新前後與 PWA 啟用前後 localStorage 鍵與內容相同；首次畫面者仍無主鍵 | AC-36-04、AC-37-06 |
| 安裝按鈕 | 替身事件：只在主控台出現、位置在 NT-1 之後、44px、375／1366 不截斷；點擊後消失、`prompt` 1 次 | AC-34-07～AC-34-10 |

**人工驗收（人類，V-PWA (a) 正式網址；比照 V-MIC）**

| 編號 | 環境 | 項目 | AC |
| :--- | :--- | :--- | :--- |
| V-PWA-H1 | Windows 11 Chrome、Edge | 網址列原生安裝、安裝名稱與開始功能表名稱「EnglishContext」、獨立視窗、DevTools Manifest 面板無錯誤與「無法安裝」警告、maskable 安全區預覽 | AC-34-01～AC-34-03 |
| V-PWA-H2 | Android Chrome | 「安裝應用程式」、主畫面圖示圓形遮罩不切字、啟動畫面背景色、飛航模式從主畫面啟動 | AC-34-02、AC-34-03、AC-35-03 |
| V-PWA-H3 | iOS Safari | 分享 → 加入主畫面：預設名稱、圖示無灰邊、從主畫面啟動無網址列（動態 `apple-touch-icon` 是否被採用見 FB-43、T-47） | AC-34-05 |
| V-PWA-H4 | GitHub Pages | push 後 Actions 成功；8 個網址 200 且內容同 CI 產物；網站不含 `docs/`、`src/`、`sources/` | AC-36-07 |
| V-PWA-H5 | 已安裝 App | 重新部署後重開 App 60 秒內提示、按下更新；背景 ≥ 1 小時切回前景觸發檢查 | AC-36-03 |

### 10.5 v0.8 測試範圍（PRD v0.12；契約 V-LAY-01～08、DS-22～DS-25）

命令同 §10.1。CT-24 跑 `node src/data/_tools/validate.mjs --file sources.js`（或 `--all --stage final`）；FE-54～FE-61 收尾跑 `npm test` 與 `node tools/build.mjs --out <scratchpad>/t.html`；只有 FE-62 執行 `npm run build`。

**中間狀態的已知失敗**：預期無。理由：(1) 會連動失敗的檔案組（`core/pwa.js` 色值 ↔ `index.html` meta ↔ `00-base.css` `--bg` ↔ `build.test.js`／`shell.test.js`／`pwa-core.test.js` 字面值）全部在 FE-56；(2) `installVisible` 加條件 ↔ `dashboard.test.js`、`pwa-core.test.js` 在 FE-58；(3) `naming.test.js` 對主控台入口的斷言在 FE-58；(4) `tokens.test.js` 的全檔掃描在 FE-56 建立時以 v0.11 其他樣式檔為準（現況無違規：無 `color: var(--brand)`、無 `--accent`），後續任務各自維持。若實際出現不在該任務 paths 的失敗 → 標 `blocked` 回報主控。

**單元測試（`npm test`，Node，無瀏覽器）**——可用純函式或 CSS 原始碼靜態分析判定的部分

| 檔案 | 任務 | 必含案例 | AC／契約 |
| :--- | :--- | :--- | :--- |
| `layout.test.js`（新） | FE-54 | 5 個契約常數與 `data-schema.ts` §13 逐值、逐鍵順序相同（測試內複製原文，不讀 `docs/`）且深度凍結；`UI_LAYOUT` 值；`fill` 替換與缺鍵拋錯；`formatInt`（0、999、1000 → "1,000"、2809、NaN → "—"）；`goalLine` 5 色（DB-4 五種字串逐字）；`summaryLine` 5 色（`N_B` 2,809、`N_G` 5,620 → 15／41／54／41／41 週，藍金含後綴）；`chartIsEmpty`（全 0、空陣列、含 NaN、任一 > 0）；`part5Progress`（question 1／N、5／N、N／N、summary 100、empty、total 0） | V-LAY-08、AC-39-04、AC-41-02、AC-39-07、AC-40-01 |
| `store.test.js`（改） | FE-55 | 初始 `runtime.dashboard` = `{ backupExpanded: false }`；`setBackupExpanded(true)` 通知 `["dashboard"]`、`setItem` 0 次；同值不通知；非布林忽略；`setTab` 切換後仍為 true；`importBackup`（成功與失敗）、`startLearning`、`confirmApplyGoal` 後保持；localStorage 前後逐字相同；首次模式呼叫亦不寫入 | V-LAY-07、AC-39-08、E-91 |
| `tokens.test.js`（新） | FE-56 | 解析 `00-base.css` `:root`：`--brand`…`--text-muted` = `COLOR_TOKENS`（測試內字面值）；色級／對錯／燈號變數 = v0.11 值（AC-38-03）；`--bg` = `PWA_BACKGROUND_COLOR`；以 WCAG 公式計算對比：`--text`／`--text-muted` 對 `--bg`、`--surface` ≥ 4.5、白對 `--primary` ≥ 4.5、`--accent-text` 對 `--accent` ≥ 4.5、`--brand-deep` 對 `--tint`、`--surface`、`--bg` ≥ 4.5、白對 `--brand` < 4.5（反向確認不可用）；`--brand-deep` 與 `--brand` 色相差 ≤ 10°；`--bg` HSL 條件；`.card` 規則（`border-radius: var(--radius-card)` = 16px、`border: 0`、`box-shadow` 非 none）；`body` 含 `tabular-nums`；§7.19.1 五條禁止寫法掃描**全部** `styles/*.css`；無 `@font-face`、`url(` | AC-38-01～AC-38-04、AC-38-06、AC-38-07、VC-1～VC-8 |
| `shell.test.js`（改） | FE-56 | `<title>EnglishContext</title>` 恰 1 次、無「English Master Track」（不分大小寫，註解除外）；`theme-color` = `#1e9bf0`；`h1.app-title` 文字 = EnglishContext；`svg.app-logo` 有 `aria-hidden="true"`、`focusable="false"`、無 `xmlns`、無 `<text`／`<image`、長度 ≤ 1,500 bytes；`.app-logo` 寬高在 24～40；`license-header.txt` 第一行 = EnglishContext、第 2 行起與 v0.11 逐字相同；既有底部導覽斷言照常 | AC-38-05、AC-38-10、NM-1～NM-4 |
| `build.test.js`、`pwa-core.test.js`（改） | FE-56 | §5.3；常數新值；manifest 深度相等 | AC-34-04、AC-38-02、V-PWA-04 |
| `customizer.test.js`、`first-run.test.js`（改） | FE-57 | `levelRows`：5 列順序、開放列字數與 `字/天`、鎖定列 `vocabText`／`dailyText` 為 null、說明「即將開放」、不含「待定」「20 字/天」「分」；`firstRunSummary` 5 色字串（同 FT-4 例）且與 `estimateTexts` 的每日字量、週數一致；假 DOM：首次模式 `h2` = 「選擇你的目標」、副標、說明行恰 1 個且在列之前、狀態列／試算卡／套用 hidden、`.cz-firstbar` 存在且順序為鎖定行→摘要→`#cz-start`→`#cz-restore`；點藍 → 鎖定行顯示；一般模式無 `.cz-firstbar` 顯示、有試算卡與套用；點色級不重建節點；`20-customizer.css` 含 ≤ 640px 的 `position: fixed` 與 `body[data-entry="firstRun"][data-tab="customizer"]` 留白規則（引用 `--emt-firstbar-h`）；既有 US-32 確認視窗案例照常 | AC-26-01、AC-41-01、AC-41-02、AC-41-04（Tab 順序以 DOM 順序代理）、AC-01-01 |
| `dashboard.test.js`、`pwa-core.test.js`、`naming.test.js`（改） | FE-58 | `dashboardModel`：AC-39-05 資料 → 「3」「天」「25%」「已掌握 60 字」「70%」；空資料「—」；AC-30-05 X = 18、D = 15 → `text` 「今日已學 18 / 15 字」、`centerText` 「18」；5 色目標行；`chart.empty`；假 DOM：區塊恰 4 個且順序 today → stats → chart → backup、標題只有「學習主控台」在前；AC-39-06 列舉文字各 1 次、無「單字掌握數」「目前目標色級」「功能入口」「學習統計」、無 `data-go="sources"`；「開始今日學習」為 `data-go="flashcards"`、「變更」為 `data-go="customizer"`；點擊 toggle 呼叫 `setBackupExpanded`、`aria-expanded` 與 body `hidden` 同步、`setItem` 0 次；收合時 NT-1 與安裝鈕不顯示、展開時 NT-1 為按鈕列下一個兄弟；`installVisible` 新條件（`backupExpanded` false → false）；naming 移除 `ENTRIES` 斷言、改為「主控台本體無模組入口」 | AC-39-01～AC-39-08、AC-24-12、AC-34-07、AC-34-08、V-LAY-07、V-LAY-08 |
| `sources-page.test.js`（改） | FE-60 | `originalSourceName`：fixture → 「EnglishContext 原創內容」、無 ORIGINAL → null；render 後該行文字逐字、無 ORIGINAL 時不建節點；畫面文字無「English Master Track」；既有聲明照常 | AC-38-10 (1)、NM-3 |
| `part5.test.js`（改） | FE-61 | 進度條屬性（`role`、`aria-valuenow`、`aria-valuemax`）與 `style.width` 在第 1、5、N 題、結算、空題庫；`40-part5.css` 的 `.p5-progress__fill` 有 `transition: none`、`.p5` 有 `max-width: var(--content-narrow)` | AC-40-01、AC-40-02 |
| `load-order.test.js`（改） | FE-62 | `EMT.core.layout` 依建置順序載入且存在；`layout.APP_DISPLAY_NAME === pwa.PWA_APP_NAME`、`layout.COLOR_TOKENS.background === pwa.PWA_BACKGROUND_COLOR`、`layout.COLOR_TOKENS.themeColor === pwa.PWA_THEME_COLOR`（VC-5 跨模組一致） | LD-1、VC-5 |

**E2E 截圖與量測（QA，Playwright Chromium，`file://` 開 `dist/english-master-track.html`；V-LAYOUT：縮放 100%、無警示與 Toast）**——需要瀏覽器排版結果的部分

| AC | 量測方法（建議） | 判定 |
| :--- | :--- | :--- |
| AC-38-01 | `page.evaluate` 走訪主控台、難易度設定、單字卡、模擬測驗、資料來源頁所有元素（含 SVG 子元素），讀 `getComputedStyle` 的 `color`、`background-color`、`border-*-color`、`fill`、`stroke`，正規化為 `#rrggbb` 比對 `#f7893b`、`#1e9bf0` | 橘只在 `.db-start`、`.db-stat__icon`（及子元素）、首次 `#cz-start`；**`.app-logo` 內的橘色 path 為已知衝突（SD-FB-39），依人類決議判定**；文字 `color` 為兩色者 0 |
| AC-38-02 | `body` 與 `.card` 計算後背景；讀 manifest 與 meta | 同 V-LAY-02 |
| AC-38-03 | 分別以 v0.11、v0.12 產物開同一資料，讀色級色條、目標行色點、對錯選項、燈號、達成環的計算後顏色比對 | 完全相同 |
| AC-38-04 | axe-core `color-contrast` 規則（QA 可加 devDependency）＋ 對鎖定列（`opacity`）以截圖取樣實際像素計算；列舉項目逐一記錄比值 | 一般 ≥ 4.5、大字 ≥ 3 |
| AC-38-05 | `.app-logo` `getBoundingClientRect` 24～40 正方形；`file://` 連網與斷網 `context.on("request")` 計數 0；375px `scrollWidth ≤ clientWidth` | — |
| AC-38-06、AC-38-07 | 計算後樣式逐項讀取（`border-radius` 四角、`box-shadow`、`border-*-width`、`font-size`、`font-weight`、`font-variant-numeric`） | — |
| AC-38-08 | v0.11 與 v0.12 單字卡頁（兩種模式、兩種寬度）：擷取 `#view-flashcards` 的元素樹（標籤、按鈕文字、順序）比對；並截圖人工目視 | 結構相同 |
| AC-38-09 | 鍵盤 `Tab` 序列記錄 `document.activeElement`；`outline-width` ≥ 2；`page.emulateMedia({ reducedMotion: "reduce" })` 後操作，`document.getAnimations().length === 0` 且相關元素 `transition-duration` 為 0s | — |
| AC-39-01、AC-39-02 | 各區塊 `getBoundingClientRect().top` 排序；按鈕位於環形圖右側（`left` 比較）、目標行 `top` 大於兩者 | — |
| AC-39-07 | `.db-bars` 高度 ≤ 120、最高填色 ≤ 80；空狀態 `p.db-chart__empty` 高 ≤ 48 | — |
| AC-39-09 | 6 種尺寸開啟後 `scrollY === 0`、`.db-start` 外框在視窗內；≤ 640px 時 `.db-start.bottom ≤ #app-nav.top` | 截圖存證 |
| AC-39-10、AC-40-02 | `.dashboard`、`.p5` 的 `width` 與左右留白差 | ≤ 720、差 ≤ 2px |
| AC-40-01 | `.p5-progress__fill` 寬 ÷ 軌道寬 vs i ÷ N；屬性值；點「下一題」量 `performance.now()` | 誤差 ≤ 1 個百分點、≤ 100ms |
| AC-41-03 | 首次畫面 6 種尺寸＋375×812，不捲動讀 `.cz-firstbar__summary`、`#cz-start`、`#cz-restore` 外框在視窗內；≤ 640px 捲到中段、底部各量一次 | 截圖存證 |
| AC-41-04 | 捲到底：`#footer-sources.bottom ≤ .cz-firstbar.top`；以格式錯誤檔觸發 Toast，Toast 外框與底部列不重疊；5 列各 `scrollIntoView` 後不與底部列重疊；Tab 序列 | — |
| AC-22-05、AC-35-04 | 量測點改為 `.db-start` 可點擊（首次為 `#cz-start`） | 同既有門檻 |

**既有 E2E 腳本受影響（QA 負責更新，PG 不得改 `tests/`）**：主控台 `.dash-entry`、`.db-mini`、「學習統計」「目前目標」區塊、`#cz-guide` 已移除；備份按鈕需先展開「資料備份」；首次畫面試算結果卡改為摘要行（SD-FB-45）。

**人工驗收**：實機（Android Chrome、iPhone Safari）檢視固定底部列與安全區、標題列圖示清晰度；V-PWA-H1／H2 確認新 `theme_color` 狀態列顏色。

（v0.9 註）PRD v0.13 已在 AC-38-01 加入「標題列品牌圖示（AC-38-05）除外」，上表 AC-38-01 的 `.app-logo` 橘色 path **不再是已知衝突**，QA 依新 AC 判定為允許（SD-FB-39 結案）。

### 10.6 v0.9 測試範圍（PRD v0.14；契約 V-VER-01～06、V-ST-17、V-LAY-09、V-LAY-10、DS-26～DS-31）

命令同 §10.1。FE-63～FE-68 收尾跑 `npm test` 與 `node tools/build.mjs --out <scratchpad>/t.html`；只有 FE-69 執行 `npm run build`（寫 `dist/`）。

**中間狀態的已知失敗**：預期無。理由：(1) `index.html` 的新 meta、`build.mjs` 的 B-12 清單、`build.test.js`／`shell.test.js` 的 HD-1 斷言全部在 FE-63；(2) `layout.js` 只**新增** `goalLineText`、`levelStatusText` 與 `levelStatus` 鍵，`goalLine` 保留 → 第 1 批後 `dashboard.test.js`、`customizer.test.js` 照常通過（T-70）；(3) `custom-vocab.test.js`、`flashcards.test.js`、`naming.test.js` 對空狀態文字的斷言與兩個 view 同在 FE-68；(4) 新模組 `core/version.js`（FE-63）、`ui/version-line.js`（FE-64）會被既有 `load-order.test.js` 自動依建置順序載入，各任務須自行遵守 LD-1、LD-2 使其通過（`load-order.test.js` 屬 FE-69，不得修改）。若出現不在該任務 paths 的失敗 → 標 `blocked` 回報主控。

**單元測試（`npm test`，Node，無瀏覽器）**——純函式、建置產物字串、假 DOM 與原始碼掃描可判定的部分

| 檔案 | 任務 | 必含案例 | AC／契約 |
| :--- | :--- | :--- | :--- |
| `version.test.js`（新） | FE-63 | 4 個常數與 §14 逐字相同；`isValidVersion`：`"1.0.0"`、`"1.0.1"`、`"0.10.3"` 真，`"v1.0.0"`、`"1.0"`、`"1.0.0-beta"`、`"1.0.0+1"`、`"01.0.0"`、`""`、`null`、`1` 假；`buildCode`：16 位小寫 hex → 前 7 碼，`"@@BUILD_ID@@"`、15／17 位、大寫 → `null`；`versionLineText("1.0.0", "3f9a2c1d77e2b6a4")` = 「版本 1.0.0（建置 3f9a2c1）」（全形括號、半形空白逐字），任一不合法 → `null`；原始碼掃描 `core/version.js` 不含 `@@`、不含形如 `\d+\.\d+\.\d+` 的版本字面值 | V-VER-04、AC-42-01、VR-5 |
| `build.test.js`（改） | FE-63 | fixture 模板加 `emt-app-version` meta、暫存 `package.json`；**V-VER-01**：產物 meta 恰 1 個且 = fixture `version`、無 `/@@[A-Za-z0-9_]+@@/`；`APP_VERSION_TEMPLATE`：PWA 模式缺佔位、佔位 2 次、佔位在 meta 外、程式碼含佔位；`APP_VERSION`：`package.json` 不存在、非 JSON、缺 `version`、`"v1.0.0"`、`"1.0"`、`"1.0.0-beta"`；中止時 `out` 與部署目錄皆未寫入；**V-VER-02**：(a) 同輸入兩次 `write:false` → `html`、`sw.js`、manifest 逐位元組相同，(b) 只改 fixture `version` 1.0.0 → 1.0.1 → meta 為 1.0.1、`buildId` 不同、`sw.js` 不同，(c) 只改 1 個進入 HTML 的字元 → meta 不變、`buildId` 不同；**VR-4**：以 `computeBuildId` 對「HTML₀′」重算與回傳 `buildId` 相同（證明雜湊含版本號）；**V-VER-06**：`buildId.slice(0,7)` = `sw.js` `BUILD_ID` 前 7 碼；`parseArgs` 接受 `--package`；非 PWA 舊 fixture 無佔位 → 照常建置、`appVersion` 為 `null`；原始碼掃描 `build.mjs` 不含 `npm_package_version`、`process.env` | AC-42-02、AC-42-04、AC-36-01、VR-1～VR-4、VR-9 |
| `shell.test.js`（改） | FE-63 | HD-1 改為 8 個靜態元素逐字各 1 次、依序（`emt-app-version` 緊接 `emt-build-id`）、在 `</head>` 前；`@@APP_VERSION@@` 在 `index.html` 恰 1 次；頁尾 HTML 不含版本行（由 JS 建立） | HD-1、VR-2 |
| `version-line.test.js`（新） | FE-64 | 假 `document`（`querySelectorAll`、`getElementById`、`#footer-sources` 與其 parent）：合法 → 建立 1 個 `p#app-version`、`textContent` 逐字、位於 `#footer-sources` 的下一個兄弟、無 `tabindex`／`role`、非 `a`／`button`；重複 `init` 仍只 1 個；V-VER-04 異常值（缺 meta、2 個 meta、`@@APP_VERSION@@`、`v1.0.0`、`@@BUILD_ID@@`、長度錯誤、`querySelectorAll` 拋錯）→ 不建節點、`rendered:false`、`console.error` 呼叫 0 次、不拋出；無 `#footer-sources` → 不建；原始碼掃描 `ui/version-line.js`、`core/version.js`：無 `fetch`、`XMLHttpRequest`、`import(`、`package.json`、`localStorage`；`src/app` 非測試 `.js`（不含 `pwa/`）全部不含字串 `package.json`；`main.js` 含 `versionLine.init` 且位於 `router.start` 之前；`00-base.css` `.app-footer__version` 有 `white-space: nowrap`、`color: var(--text-muted)`，無 `--accent`／`--brand` | V-VER-03、V-VER-04、V-VER-05、AC-42-01、AC-42-03 |
| `layout.test.js`（改） | FE-65 | `LAYOUT_TEXTS` 與 §13 v0.14 逐字、逐鍵順序相同（含 `levelStatus`、保留兩個停用鍵）；`goalLineText` 5 色（藍、金傳入綠 → 「綠級・每日 15 字」）、結尾不是「・」、不含「目標」「生效」「內建上限」「藍」「金」；缺參數 → 「—」；`levelStatusText` 5 色 → 「目前色級：橘／棕／綠」、缺參數 → 「目前色級：—」；既有 `goalLine` 案例保留 | AC-39-04、AC-01-08、V-LAY-08、V-LAY-09 |
| `dashboard.test.js`（改） | FE-66 | `dashboardModel` 5 色套用（725／465／215… 依既有 fixture；855、990）→ `goal.text` 依序「橘級・每日 10 字」「棕級・每日 10 字」「綠級・每日 15 字」×3、`colorId` 為生效色級；`goalInfoOf` 855 → `effectiveColor` 「綠」（無「內建上限」）；假 DOM：`.db-goal` 子節點恰為 dot、text、`.db-change`，無 `.db-goal__sep`、無「・」結尾；`.db-change` 為 `<button type=button>`、class 不含 `btn--link`、`data-go="customizer"`、文字「變更」；點擊後 `setItem` 0 次；原始碼不含 `goalLineCapped`、`goalLineSeparator`、`builtinCap`、`LAY.goalLine(`；`10-dashboard.css` `.db-change`：`border` 1px solid `var(--brand-deep)`、`background: var(--surface)`、`text-decoration: none`、`min-height`／`min-width` 44px，無 `--accent`、`--border`、`#d5d9e0`、`#f7893b` | AC-39-04、AC-17-06、AC-25-02、AC-25-03、AC-26-06、V-LAY-08、V-LAY-10 |
| `customizer.test.js`（改） | FE-67 | `statusLine`：套用橘、棕、綠、藍（855）、金（990）→ 「目前色級：橘」「目前色級：棕」「目前色級：綠」「目前色級：綠」「目前色級：綠」；假 DOM：`.cz-status` 內恰 1 個文字節點行 `#cz-st-line`、無 `dl`、無 `.cz-status__cap`；套用綠後點棕卡片（未套用）→ 仍「目前色級：綠」；初始化確認取消 → 不變；以 `appliedColor: "blue"` 狀態重新 `init` → 「目前色級：綠」且藍列 `aria-pressed=true`；整頁可見文字無「目前目標色級」「目前生效色級」「內建上限」；試算區的「藍（即將開放）」與 `lockedNotice` 仍顯示（AC-01-07）；`store` 中 `goal` 4 欄與 `schemaVersion` 不因渲染改變 | AC-01-08、AC-01-02、AC-01-07、AC-25-03、AC-25-06、AC-26-06、AC-32-05、V-LAY-09 |
| `custom-vocab.test.js`（改） | FE-68 | 範本 `section` 有 `hidden` 屬性且 `inert` 屬性存在、為 `#customizer-custom` 的第 2 個子節點、內含 3 個 `data-template` 按鈕（程式保留）；**可見文字掃描**：走訪 host 樹，略過有 `hidden` 祖先的節點，收集 `textContent`、`aria-label`、`title` → 不含「範本」；`EMPTY_TEXT` = 「尚未新增自訂單字。可用上方表單新增。」、不以「或」「、」「，」結尾；**HT-9／AC-43-03**：以含 10 個 `origin:"template"`（含 Latency、Scalability）+ 1 個表單字的 v2 狀態啟動 → 清單 11 項、每項只有「自訂擴充」、無 `.cv-item__source`；新增 `latency` → 欄位錯誤「單字已存在」；刪除 1 個範本字 → 10 項、其餘物件逐欄相同；`exportBackup().data.customVocab` 與原值（去掉刪除者）`deepStrictEqual`、`origin`／`templateId` 保留；既有注入、BUG-002 補掛案例照常 | AC-43-01～AC-43-03、AC-04-01～AC-04-09、AC-23-01、V-ST-17、E-19、E-100 |
| `flashcards.test.js`、`naming.test.js`（改） | FE-68 | `.fc-empty__hint` = 「請到難易度設定選擇色級並按「套用」，或新增自訂單字。」；`flashcards.js` 字串常值不含「範本」；仍有「前往難易度設定」按鈕 | AC-43-02、AC-06-06、E-100 |
| `load-order.test.js`（改） | FE-69 | 依建置順序載入後 `EMT.core.version`、`EMT.ui.versionLine` 存在；`version.APP_VERSION_META_NAME` 與 `pwa.PWA_BUILD_ID_META_NAME` 不同；`layout.goalLineText`、`layout.levelStatusText` 存在；載入過程不讀 `document`（LD-2） | LD-1、LD-2 |

**E2E 與量測（QA，Playwright Chromium；FE-69 有無頭瀏覽器時先跑可自動化項目）**——需要瀏覽器排版、計算後樣式、網路監看或真實建置產物的部分

| AC | 量測方法（建議） | 判定 |
| :--- | :--- | :--- |
| AC-42-01 | (a) `file://` 開 `dist/english-master-track.html`、(b) `npm run serve` 開 `http://localhost:8080/english-master-track/`；375×667、1366×768；首次畫面、主控台、難易度設定、單字卡、模擬測驗、資料來源頁各切一次：`document.querySelectorAll("#app-version").length === 1`、`previousElementSibling.id === "footer-sources"`、文字符合 `/^版本 \d+\.\d+\.\d+（建置 [0-9a-f]{7}）$/`、`getClientRects().length === 1`（單行）、`scrollWidth ≤ clientWidth`、計算後 `color` 對背景對比 ≥ 4.5、非 `#f7893b`；Tab 走一輪 `activeElement` 從未是 `#app-version`；`document.body.innerText` 不含 `@@`、`undefined`、`null`、「（建置 ）」；(a)(b) 文字相同；捲到底 `#app-version.bottom ≤ #app-nav.top`（一般）或 `≤ .cz-firstbar.top`（首次） | V-VER-03 |
| AC-42-02 | 讀產物 `emt-app-version`、`emt-build-id`、`sw.js` 的 `BUILD_ID`、`package.json` `version`，與畫面文字比對；`cmp dist/english-master-track.html dist/site/index.html` | V-VER-06 |
| AC-42-03 | `context.on("request")`：(a) 連網／斷網皆 0；(b) 只見 PV-3 允許的同源 GET，無 `package.json`；操作前後 `localStorage` 快照相同；匯出備份頂層 5 欄、全文不含版本字串 | V-VER-05 |
| AC-42-04 | 在專案副本執行：連續 `npm run build` 2 次比 SHA-256；改 `version` 為 1.0.1 再建置，以 `serve.mjs` 模擬重新部署，已造訪的分頁出現「有新版本，重新整理」；改 1 個字元再建置比對 | V-VER-02、AC-36-03 |
| AC-43-01 | 一般難易度設定頁 `#customizer-custom > section[hidden][inert]` 存在、`getComputedStyle().display === "none"`、`getBoundingClientRect().height === 0`；Tab 走一輪無 `[data-template]`；表單卡與清單卡間距 = 12px；`page.content()` 仍含 3 個範本按鈕的 `data-template` 值；Console 無錯誤；AC-04 系列回歸 | V-ST-17 |
| AC-43-02 | (a) 清空自訂單字、(b) 以 fixture 使單字集為空：走訪所有可見元素的 `innerText`、`aria-label`、`title`，以「範本」搜尋 = 0；兩段空狀態文字逐字 = §7.20.2 | V-ST-17 |
| AC-43-03 | 以 v0.13 產物注入「資工」後的 localStorage（或其匯出備份）開啟 v0.14 產物，依 AC 步驟 (1)～(5)；比對前後 localStorage JSON | V-ST-17、HT-9 |
| AC-01-08 | 375／1366：依序點 5 色並套用、讀 `#cz-st-line` 的 `innerText` 與 `getClientRects().length === 1`；套用綠後點棕不套用；套用藍後 `reload`；整頁 `innerText` 搜尋「目前目標色級」「目前生效色級」「內建上限」= 0 | V-LAY-09 |
| AC-39-04 | 5 色套用後讀 `.db-goal__text`；`.db-change` 計算後 `background-color`（不透明）、`border-*-width`／`style`、`text-decoration-line`、`color`、`getBoundingClientRect` ≥ 44×44；滑鼠、`page.tap`、Tab + Enter／Space 各一次到達 `#view-customizer` 且 `localStorage` 不變；`reducedMotion: "reduce"` 下 `getAnimations().length === 0` | V-LAY-10 |
| AC-41-04 | 首次畫面 375×667 捲到底：`#app-version.bottom ≤ .cz-firstbar.top`；Toast、5 列與 Tab 順序同 §10.5 | 同 §10.5 |

**不適用（v0.14 暫停）**：AC-05-01～AC-05-05，QA 測試計畫列「不適用（v0.14 暫停）」，以 AC-43-01、AC-43-03 取代。

**人工驗收**：實機（Android Chrome、iPhone Safari）以已安裝的 PWA 檢視頁尾版本行與底部導覽列不重疊；人類發布時確認 `package.json` 的 `version` 與預期一致（建置只驗格式，不驗是否遞增）。

### 10.7 v0.10 測試範圍（PRD v0.15；契約 V-ST-18～V-ST-22、V-IMP-01、V-P5-08、DS-32～DS-39）

命令同 §10.1。FE-70～FE-75 收尾跑 `npm test` 與 `node tools/build.mjs --out <scratchpad>/t.html`；CT-25 跑 `npm run validate:data`；只有 FE-76 執行 `npm run build`（寫 `dist/`）。

**中間狀態的已知失敗**：預期無。(1) FE-70、FE-71、FE-72 只新增檔案（FE-72 對 `layout.part5Progress` 只**新增** `"allCorrect"` 分支）；新 core 模組會被既有 `load-order.test.js` 自動載入，須遵守 LD-1。(2) FE-73 一次完成「常數升為 3」與所有因此失敗的既有測試（§7.21.1 表）；store 在 FE-73 之後已能正確讀寫 v3（記憶體 12 欄來自 `defaultData`、`parseStored`、`importSteps`），只是尚未使用新欄位。(3) FE-74 改變 `applyGoal`（FB-54）與一般寫入提示（§7.21.5）的行為，對應的既有 `store.test.js` 斷言在同一任務改寫；`flashcards.test.js`、`customizer.test.js`、`dashboard.test.js` 若因此失敗 → 標 `blocked` 回報主控（SD 預期不會：這三檔不斷言同色套用後的卡片索引與 quota 提示次數）。

**單元測試（`npm test`）**

| 檔案 | 任務 | 必含案例 | AC／契約 |
| :--- | :--- | :--- | :--- |
| `samples.test.js`（新） | FE-70 | 4 個樣本皆可 `JSON.parse`；`v014-state` 頂層恰 `schemaVersion`、`savedAt`、`data`，`schemaVersion === 2`，`data` 恰 9 鍵；`v014-backup` 頂層恰 5 鍵、`schemaVersion === 2`、`data` 9 鍵；`v07-*` 為 1 與 7 鍵；`README.md` 記錄的 SHA-256 與檔案相符（本測試與程式版本無關，v3 後仍成立） | DS-32 |
| `position.test.js`（新） | FE-71 | `isShape`：`null` 真；`{wordKey:"a",ordinal:1}` 真；陣列、`{}`、缺鍵、多餘鍵、`ordinal` 0／-1／1.5／`"10"`、`wordKey` 數字 → 假；`normalize`：`"  Pay   Off "` → `"pay off"`、空白 → `null`；`resolve` 四種情況（含 N = 0 回傳原物件且 `===`）、AC-44-04（以字找回）、AC-44-05 (a)(b)(c) 的 `min(i, N)`、刪除最後一張 → 前一張；`fromIndex` 越界 → `null`；4,000 張 `resolve` < 5 ms | FP-2、AC-44-04～AC-44-07、E-104～E-107 |
| `part5flow.test.js`（新） | FE-72 | `normalizeIds`（非陣列、非字串、空白、重複、題庫外 id 保留且順序不變）；`countCorrect`（重複 id、不存在 id、`null` 題目）；`viewKind` 全部分支（Q = 0、關閉、K < Q、K = Q 且鎖定題、K = Q 且 summary）；`normalizeOnly`（AC-46-04 (a)(b)、其後無 → summary、K = Q 不動）；`next` 關／開（AC-46-02、AC-46-03 跳到 p5-004、AC-46-05、AC-46-09）；`restart` 開關兩種；`setOnly` 不改計數；`recordAnswer`（AC-45-01～03）；`replayKeepRecords`、`clearAndRestart` 累計不變、本輪歸 0（FB-56）；隨機 1,000 組狀態斷言 `currentIndex < Q`、`next` 不遞迴、開關開啟時 `viewKind = "question"` 且未鎖定的題目一律未答對（UO-4 不變式） | V-ST-19、V-ST-20、UO-1～UO-9、CR-1～CR-8 |
| `layout.test.js`（改） | FE-72 | `part5Progress("allCorrect", 0, 200)` → `{visible:true, now:200, max:200, percent:100}`；既有案例不變 | MT-1、AC-46-06 |
| `migrate-v3.test.js`（新） | FE-73 | **V-ST-21**：`v014-state` → `parseStored` ok、`migrated`、前 9 欄與原 `data` 深度相等、3 欄 `null`／`[]`／`false`；以 `makeStore` + 假 storage 預寫樣本 → init 恰 1 次 `setItem`、主鍵 `schemaVersion` 3、`unreadable` 鍵不存在、`entryMode = "main"`；再 init → `setItem` 0 次、主鍵位元組不變；`v07-state` 同樣直接到 3；`v014-backup`、`v07-backup` 匯入成功、`skipped` 0、既有欄位逐一相等、3 欄預設；**RD-3** 矩陣（每欄各 4 種錯誤 shape，只重設該欄、其他欄深度相等、`fieldsReset` 列出、無 unreadable）；**RD-1 回歸**：v2 主鍵 `todayLearned` 為陣列 → 仍只重設該欄（T-76）；**IM-9** 矩陣 → `format`（`flashcardPosition` 為陣列、字串、`{wordKey:1,ordinal:1}`、`{wordKey:"a",ordinal:0}`、缺鍵、多餘鍵；`part5CorrectIds` 為物件、`null`；開關為 `"true"`、0、1、`null`），`flashcardPosition: null` 合法（FB-59）；**IM-10**：非字串、重複、題庫外 id → 匯入成功、`skipped` 不變、題庫外 id 保留；開關開啟且 `currentIndex` 指向曾答對題 → 匯入後已跳題；`schemaVersion` 4、0、`"3"` → `version` 且支援版本文字「1、2、3」 | AC-47-03～AC-47-06、E-113、E-114、E-116、V-IMP-01 |
| `persist.test.js`、`backup.test.js`、`reinit.test.js`、`goal.test.js`、`first-run.test.js`、`dashboard.test.js`、`custom-vocab.test.js`、`store.test.js`、`_fixtures.js`（改） | FE-73 | §7.21.1 表的字面值改寫；`defaultData` 12 欄；`written` 驗證要求 3 欄；`buildReinitData` → 7 欄預設、`flashcardPosition: null`、開關保留（V-ST-14）；匯出 12 欄、`schemaVersion` 3 | C-8、AC-18-01、AC-24-02、AC-32-02、AC-32-10、AC-45-08、AC-44-08 |
| `store-track.test.js`（新） | FE-74 | **V-ST-18**：`gotoCard` 每次 `setItem` 1 次且主鍵 `flashcardPosition` = `fromIndex`；同一張、越界 → 0 次；翻面、切模式 → 不因位置寫入；重新 init → 同一張、`mode "card"`、正面（AC-44-01、AC-44-09）；AC-44-02 序列；AC-44-03 換卡不改學習紀錄與打卡；AC-44-04、AC-44-05 (a) 經 `deleteCustomWord`／`addCustomWord`；AC-44-07 空單字集紀錄不動；AC-44-08 (a) 直接套用與確認「確定」→ `null` 且 reload 第 1 張，(b) 取消 → 不變；FB-54 綠 → 藍套用 → 位置與 `flashcard` 不變；**INV-FP** 於每個 action 後；**V-ST-19／20**：作答答對 → 陣列 +1（AC-45-01）、答錯／再答對／鎖定後重點 → 不變（AC-45-02、AC-45-03）、計數與主控台正確率序列與「v0.14 同一操作序列」相同（以 `part5flow` 關閉狀態重放比對，AC-45-06）、開關開啟跳題（AC-46-03）、開啟當下正規化（AC-46-04）、`replay`／`clear` 僅在 allCorrect 有效且結果符合 UO-7、CR-6；`clear` 未呼叫時 `setItem` 0 次；初始化「確定」→ `ids = []`、開關保留（AC-45-08）；匯出 → 清空 storage → 首次畫面匯入 → 3 項還原（AC-47-02、AC-46-10）；**V-ST-22**：quota 假 storage 下 `gotoCard`、`answerPart5`、`setPart5UnansweredOnly`、`setDraft`、`flipCard` 混合 20 次 → `learningQuota` tag 恰 1 次、記憶體照常、主鍵原值不變；`unavailable` → 記憶體照常、無 `setItem`、重新 init 回預設（AC-44-10、AC-47-07）；**效能**：1,000 個自訂單字狀態下 200 次 `gotoCard` 平均 < 5 ms（Node） | AC-44-01～AC-44-10、AC-45-01～AC-45-08、AC-46-02～AC-46-10、AC-47-01、AC-47-02、AC-47-07 |
| `store.test.js`（改） | FE-74 | 一般寫入 quota 斷言改為「`learningQuota` 至多 1 次、不發 `storage`」；`applyGoal` 同色（綠 ↔ 藍 ↔ 金）不回第 1 張；`deleteCustomWord` 定位結果與 AC-04-08 相同（改經 `placeCard`）；其餘 v0.14 案例保留 | WR-2、FB-54、AC-04-08 |
| `part5.test.js`（改） | FE-75 | `buildViewModel` 4 種 kind 與 `k`、`q`、`correctBadge`、`inSummary`；假 DOM：三種畫面各恰 1 個 `[data-p5=correct-count]` 與 1 個 `[data-p5=only]`；計數文字逐字（K = 0 顯示 0）；曾答對題（未作答、已作答）有 `[data-p5=correct-badge]` 且文字「✓ 曾答對」、選項未停用；未曾答對題無任何標示且頁面無「未答對」「答錯過」；allCorrect：標題「200 題全部答對！」、說明句逐字、無 `[data-p5=number]`、無未作答選項、兩個按鈕文字逐字、進度條 `aria-valuenow` = 200；作答結束進入時另有「答對 x / y」；開關 `change` 與 Enter 皆呼叫 `setPart5UnansweredOnly`；清除按鈕 → `dialog.confirm` 參數的 `message` 包含契約兩段、`okText`「確定」、`cancelText`「取消」，回 `false` 時 action 呼叫 0 次、回 `true` 時 1 次；焦點規則；可見文字不含「範本」；原始碼掃描：`40-part5.css` 新選擇器不含 `--accent`、`#f7893b`、`transition`、`animation`，`.p5-only` 有 `min-height: var(--touch)`、`.p5-record__count` 有 `tabular-nums` | AC-45-04、AC-45-05、AC-46-01、AC-46-06～AC-46-08、AC-47-08 |
| `load-order.test.js`（改） | FE-76 | 依建置順序載入後 `EMT.core.position`、`EMT.core.part5flow` 存在且載入時不讀 `document`、不取用 `persist`；`constants.CURRENT_SCHEMA_VERSION === 3`；`constants.PART5_RECORD_TEXTS` 凍結 | LD-1、LD-2 |

**資料驗證**：`npm run validate:data`（CT-25 後含 V-P5-08 快照比對）錯誤 0、警告 0。

**E2E 與量測（QA，Playwright Chromium；FE-76 有無頭瀏覽器時先跑可自動化項目）**

| AC | 量測方法（建議） | 判定 |
| :--- | :--- | :--- |
| AC-44-01、AC-44-02、AC-44-09 | `file://` 與 `npm run serve`；375／1366；導覽與「開始今日學習」兩種進入；`reload` 後讀 `.fc-counter` 與卡面單字；`performance.now()` 量點擊到卡片顯示；測驗模式 reload 後為單字卡模式正面 | V-ST-18 |
| AC-44-03 | reload 前後比對主控台今日已學、打卡、掌握數與 localStorage 對應欄位 | FP-7 |
| AC-44-04～AC-44-07 | 依 AC 步驟操作自訂單字；以 DevTools 改 `flashcardPosition`（不存在的字、ordinal > N、錯誤 shape）後 reload；Console 無錯誤、無 `unreadable` 鍵 | FP-2、RD-3 |
| AC-44-08 | 有／無學習紀錄的套用、確定、取消後 reload | FP-4、CI-9 |
| AC-44-10、AC-47-07 | (a) `context` 封鎖 storage（同 AC-18-03 既有作法）；(b) 以 `Storage.prototype.setItem` 包裝成 quota 例外；計數 Toast「儲存空間不足」出現次數 = 1 | WR-2、WR-3、V-ST-22 |
| AC-45-01～AC-45-05 | 作答前後量 ≤ 100 ms；標示位置在 `.p5-meta` 內、計算後顏色對比 ≥ 4.5、非 `#f7893b`；375px `scrollWidth ≤ clientWidth`；計數行與 `.p5-number` 的 `getBoundingClientRect` 不相交 | CR-4 |
| AC-45-06 | 依 AC 序列比對累計、本輪、主控台正確率、打卡與今日已學 | CR-5 |
| AC-45-07 | DevTools 寫入含 `p5-999` 與重複 id 的 `part5CorrectIds` 後 reload：計數 = 3、localStorage 仍含 `p5-999` | CR-3 |
| AC-45-08、AC-32-02 | 有紀錄時切換色級「確定」／「取消」；reload | CI-4、CI-8 |
| AC-46-01 | Tab 到開關、Space 與 Enter 各切換一次；`page.tap`；`getBoundingClientRect` ≥ 44×44；`reducedMotion: "reduce"` 下 `getAnimations().length === 0` | UO-1 |
| AC-46-02～AC-46-05、AC-46-09 | 以 DevTools 構造答對紀錄，依 AC 步驟按「下一題」「重新開始」，讀 `[data-p5=number]` 與進度條 `aria-valuenow`；量「下一題」≤ 100 ms | UO-2～UO-6、UO-8 |
| AC-46-06～AC-46-08 | 構造 K = Q − 1 後答對最後一題；K = Q 時開啟開關、reload；兩個按鈕與確認對話框（文字、按鈕數 = 2、Esc、點遮罩） | UO-7、CR-6 |
| AC-46-10、AC-47-01、AC-47-02 | reload、關閉重開、匯出 → 清除網站資料 → 首次畫面還原與主控台匯入；比對 3 項資料 | V-IMP-01 |
| AC-47-03、AC-47-04 | **以 v0.14 交付檔實測**：先用 v0.14 `dist/english-master-track.html`（1.0.0，SD-FB-58）產生狀態與備份，再以 v0.15 產物開啟／匯入；另測 v0.7 樣本；reload 後主鍵位元組不變 | V-ST-21 |
| AC-47-05、AC-47-06 | DevTools 改壞 3 欄各一；匯入 IM-9、IM-10 樣本 | RD-3、IM-9、IM-10 |
| AC-47-08 | Network 監看全部新操作；交付檔大小；原始碼搜尋 `innerHTML` 新增 0 處 | WR-4 |
| C-8 改讀的 8 條（AC-01-08、AC-26-06、AC-32-10、AC-36-04、AC-37-06、AC-38-10、AC-42-03、AC-43-03） | 既有 E2E 的 `schemaVersion === 2` 改為 3、`data` 鍵數 9 改為 12（SD-FB-57） | C-8 |
| AC-42-02 | 產物 meta 與版本行為 1.1.0 | V-VER-06 |

**人工驗收**：實機（Android Chrome、iPhone Safari）以已安裝的 v1.0.0 PWA 更新到 1.1.0 後，確認既有進度未遺失、單字卡從第 1 張開始、模擬測驗「已答對 0 / 200 題」；開關在實機觸控與螢幕閱讀器（TalkBack／VoiceOver）可操作並讀出狀態。

### 10.8 v0.11 測試範圍（PRD v0.16；契約 L-7、UP-6、V-PWA-10、DS-40、FB-61、FB-62）

**驗收方式（使用者決定）**：本次只改文字，**不另跑 QA 輪次**；驗收 = FE-77 的 PG 自測（`npm test`、`npm run build`、附指令與輸出的靜態檢查，有無頭瀏覽器時加量測）＋主控檢查（下方「主控檢查」表）。QA 的 `tests/e2e/` 與 `docs/04-qa/` 不在本次範圍（SD-FB-65）。

**中間狀態的已知失敗**：預期無。FE-77 在同一任務內同時改常數與逐字比對舊文字的 2 個測試檔。

**單元測試（`npm test`）**

| 檔案 | 任務 | 必含案例 | AC／契約 |
| :--- | :--- | :--- | :--- |
| `pwa-core.test.js`（改） | FE-77 | 期望物件的 `PWA_TEXTS.updateNotice` 改為 `有新版本，請更新版本`、`updateButton` 改為 `更新版本`（逐字、全形逗號）；其餘鍵與凍結斷言不變 | UP-6、AC-36-03 |
| `pwa-notice.test.js`（改） | FE-77 | `span.textContent` 逐字 `有新版本，請更新版本`、按鈕 `更新版本`；首次模式 `host.textContent` 逐字 `有新版本，請更新版本更新版本`；新增：`host.textContent` 不含 `重新整理`；其餘行為案例（hidden 切換、點擊 2 次 → `onReload` 1 次）不變 | UP-6、V-PWA-10、AC-36-03 |
| `sources-page.test.js`（改） | FE-77 | 以既有 `renderInSandbox` 新增：(1) `P.SOURCES_CONTACT_TEXT` 逐字等於 `email: j i m m y l i n . 5 8 3 9 0 7 2 2 @ g m a i l . c o m`，且結構檢查：以 `"email: "` 開頭、其後以單一半形空格分隔的 27 個單字元 token、無全形字元、無連續空格；(2) `.src-contact` 節點恰 1 個，`tagName === "P"`，`className === "src-muted src-contact"`，`textContent.trim()` 逐字等於常數；(3) 為 `.src-page` 的**最後一個**子元素，位於 `.src-project` 之後；(4) 非連結、不可聚焦：自身與所有祖先 `tagName !== "A"`，`attrs` 無 `href`、`tabindex`、`role`、`data-go`，節點的 `addEventListener` 呼叫 0 次（測試以包裝假 DOM 記錄）；(5) 整個 `rootEl.textContent` 不含 `mailto:`，也不含由常數推導的去空格位址（不分大小寫）；(6) 既有 AC-23-02 聲明 4 條與「原創內容來源」案例仍通過 | AC-23-07 (1)(2)(7)、L-7、E-118 |
| `contact-static.test.js`（新） | FE-77 | 以 `build({ write: false, log() {}, warn() {} })` 對專案預設 `src/app`、`src/data`、`package.json` 建置（不寫 `dist/`）：`html` 不含 `mailto:`（不分大小寫）、不含去空格位址（不分大小寫）、`SOURCES_CONTACT_TEXT` 恰 1 次、不含 `有新版本，重新整理`、含 `有新版本，請更新版本` 與 `更新版本`、`emt-app-version` 為 `package.json` `version`（1.1.0）；回傳的 `sw.js` 內容（`r.site.files.find((f) => f.path === "sw.js").bytes`，同 `build.test.js` 寫法）不含 `mailto:` 與去空格位址；另掃描 `src/app/` 非 `__tests__` 檔案（`.js`、`.css`、`.html`、`.txt`）：無 `mailto:`、無去空格位址、常數原值只在 `views/sources-page.js` 出現 1 次；`70-sources.css` 的 `.src-contact` 規則不含 `nowrap`、`user-select`、`--accent`、`#f7893b` | AC-23-07 (2)(3)、L-7 (3)、FB-62、DS-40 (3)、AC-36-03、AC-42-04 |

**建置與交付檢查（FE-77，附指令與輸出）**

| 檢查 | 判定 | AC／契約 |
| :--- | :--- | :--- |
| `npm test` | 全數通過 | — |
| `npm run build` 兩次 | 4 檔 SHA-256 兩次相同；`dist/english-master-track.html` = `dist/site/index.html`（SHA-256 相同）；`emt-app-version` = 1.1.0；BUILD_ID 與 v0.10 產物不同（回報新舊值） | AC-36-01 (a)、AC-36-07、AC-42-04 (a)、FB-61、BUG-004 |
| `dist/` 字串檢查 | `dist/english-master-track.html`、`dist/site/index.html`、`dist/site/sw.js`：`mailto:` 0 次、去空格位址 0 次、`有新版本，重新整理` 0 次；兩份 HTML 的 `SOURCES_CONTACT_TEXT` 各 1 次、`有新版本，請更新版本` ≥ 1 次 | AC-23-07 (2)、AC-36-03 |
| 換行 | 交付 HTML 換行格式與建置輸出一致（由建置產生、未經手改；BUG-004 指出手改後變 LF） | AC-36-07 |

**有無頭瀏覽器時（FE-77 可選；無則列入主控檢查）**：`file://` 開啟交付檔、視窗 375 × 812 與 1366 × 768 → 頁尾「資料來源與授權」→ 捲到底：`.src-contact` 的 `getClientRects().length === 1`（375 預設字級 1 行）、`document.documentElement.scrollWidth ≤ clientWidth`、元素底緣不被底部導覽遮住（與 `#app-nav` 的 `getBoundingClientRect` 不相交）、`getComputedStyle(el).color` 對背景對比 ≥ 4.5；點擊該行後 URL 與 `currentTab` 不變、Console 無錯誤；Tab 逐一移動焦點 `document.activeElement` 從不等於該元素；Network 0 請求（AC-21-01 (a)）。

**主控檢查（取代 QA 輪次）**

| # | 項目 | 方法 |
| :--- | :--- | :--- |
| H-1 | FE-77 回報的 `npm test`、兩次建置 SHA-256、`dist/` 字串檢查輸出齊全且符合上表 | 讀回報，必要時重跑 `Get-FileHash` 或 `sha256sum` |
| H-2 | 聯絡行逐字、1 行、無水平捲軸、非連結、不可聚焦（若 FE-77 未以無頭瀏覽器量測） | Windows Chrome 以 `file://` 開啟 `dist/english-master-track.html`，DevTools 裝置模式 375 寬，執行上段同樣的 4 個運算式；點擊與 Tab 各試一次 |
| H-3 | 其他畫面不顯示聯絡行 | DevTools Console：切到主控台、難易度設定、單字卡、模擬測驗後 `document.querySelectorAll(".src-contact").length` 在可見畫面中為 0 或所在 `#view-sources` 為 `hidden` |
| H-4 | 更新提示新文字（https） | 可留待部署後實機自然觸發時目視；或比照 §10.4 以 `npm run serve` 模擬 V1 → V2。不阻擋發布（文字已由單元測試與產物字串檢查保證） |

---

## 11. 技術風險與對策

| # | 風險 | 影響 | 對策 |
| :--- | :--- | :--- | :--- |
| T-01 | 15 個平行批次風格不一（音標慣例、釋義長度、例句句型） | 品質、QA 退件 | §8.3 統一慣例 P／T／O；驗證器 H-1～H-7 自動攔；每批 10% 自查；QA 5% 抽查與退件門檻 |
| T-02 | 單一代理一次產出 350～409 筆內容超出單次輸出能力 | 任務中斷 | W-4：每次 ≤ 50 筆寫入 scratchpad 分段檔，`fill.mjs` 合併；任務可重入（已寫的分段保留） |
| T-03 | `s2twp` 過度轉換（程序→程式、文件→檔案）未被發現（FB-22） | 用語錯誤 | `material.mjs` 依**簡體原檔**列出 M-3 命中字；紀錄附 V-VOC-17 清單；QA 全檢 |
| T-04 | 簡體字殘留 | AC-23-02、C-1 | H-1 以資料導出的簡體專用字集自動攔截 |
| T-05 | 英式音標殘留或手誤 | NFR-3、R-13 | H-2 允許字元集 + 英式符號黑名單；人工抽查 |
| T-06 | `N_B`／`N_G` 重算與紀錄值不符（N-1） | 分檔邊界錯位 | CT-02 先驗證；不符即 `blocked`，回 SA／SD，批次任務不會開始 |
| T-07 | 檔案超過 5 MB | AC-19-04 | §6 估算 3.1 MB；H-7 長度預算；B-7 警告門檻 4.5 MiB；B-9 備援壓縮 |
| T-08 | `file://` 下 `navigator.clipboard` 不可用或需權限 | AC-16-03 失敗 | 依 AC-16-04 降級為提示 + 反白；人工驗收以實機確認；Chrome 視 `file:` 為安全環境，預期可用 |
| T-09 | Chrome 的 TTS 線上語音（Google US English）離線無聲 | AC-19-02 | 優先 `localService` 語音（R-10）；`onerror` 時提示 |
| T-10 | `SpeechRecognition` 在 `file://` 每次要求權限（E-07）、斷網時錯誤碼不一 | AC-08-09、AC-08-14 | 開始前檢查 `navigator.onLine`；`network` 錯誤同訊息；權限流程視為正常 |
| T-11 | 資料內含 `</script>` 或 `<!--` 破壞內嵌 | 白屏 | B-3 跳脫；V-VOC-10 禁 `<`、`>` |
| T-12 | 資料檔缺漏或格式錯（內容未完成時前端開發） | 白屏 | C-6 容錯；`core/content.js` 一律回空陣列；FE 任務以 scratchpad fixture 測試；`--data` 參數 |
| T-13 | 計算後樣式受 transition 影響，自動化驗證 AC-13-01 不穩 | 測試誤判 | 淡化不加 transition（§7.6） |
| T-14 | 時區與日光節約導致打卡天數計算錯誤 | AC-17-02 | 本地日期字串 + `Date.UTC` 差日；單元測試含跨月、跨年、DST |
| T-15 | 主控同時派出大量平行任務，`sources/` 只讀但工具同時執行 | 無寫入衝突 | 工具只寫自己 `paths` 內的分檔與 scratchpad；`sources/` 永不寫入 |
| T-16 | 非內容檔（`_tools/`、`_records/`）放在 `src/data/` | 與 CLAUDE.md「內容資料」描述不完全一致 | D-1 不打包；列入 §15 SD-FB-01 請人類確認 |
| T-17 | （v0.2）授權標頭放在 `<meta charset>` 前，使編碼宣告超出前 1,024 bytes | Firefox `file://` 中文亂碼或重新解析（AC-19-03） | §5 固定開頭順序；B-1 檢查模板、B-7 檢查產物 bytes 位置；FE-18 自檢 |
| T-18 | （v0.2）`node --test <目錄>` 在 Node 21 以上失敗；Node 18／20 在 Windows 不展開 glob | `npm test` 無法執行 | `npm test` 改用 glob、`engines` 改 `>=22`（§5） |
| T-19 | （v0.3）core 模組在載入時讀取其他 core 模組，瀏覽器依檔名序載入時取到 `undefined`（R6-1）；Node 單元測試以 `require` 載入，測不出來 | 建置產物白屏或功能失效 | §4.1 LD-1～LD-3；`backup.test.js` R6-1 案例與 FE-19 `load-order.test.js` 以 `vm` 沙箱依建置順序載入 |
| T-20 | （v0.3）頁面任務的 paths 不含 `__tests__/`，測試留在 scratchpad（不跨工作階段保留、QA 拿不到、不在 `npm test`） | 回歸無保護、QA 無法重跑 | FE-19 移入並改為相對路徑與 fixture；日後新增頁面任務時 SD 須把對應 `__tests__/<view>.test.js` 列入 paths |
| T-21 | （v0.3）單元測試讀取 `src/data/` 正式資料，內容任務仍在進行時結果隨資料變動 | `npm test` 不穩定、與 CT 進度耦合 | §10 規則：單元測試只用 fixture；資料正確性由 `validate.mjs` 負責 |
| T-22 | （v0.4）v1 → v2 遷移有缺陷，已上線使用者開啟新版後資料被重設 | 進度遺失（AC-30-12） | 遷移只「補兩欄」不動其他 7 欄（MG-2）；`persist.test.js` 以 v0.7 實際寫出格式的 fixture 測；store 先存 `unreadable` 再覆蓋（RS-1）；FE-33 以 v0.3 產物產生的真實 localStorage 字串回歸 |
| T-23 | （v0.4）首次模式下誤寫入 localStorage（例如既有 action 的寫入路徑未經守門） | 重新整理後不再是首次（AC-25-04） | 守門放在 store 唯一的寫入函式 `writeData`（不在各 action 判斷）；`store.test.js` 以計數 `setItem` 斷言 0 次 |
| T-24 | （v0.4）動畫期間的連點造成狀態與畫面不一致 | AC-28-08、AC-31-02 | §7.11 A-2：狀態同步先行、不依賴 `animationend`；換頁無離場動畫；翻卡只顯示一面 |
| T-25 | （v0.4）滑動後瀏覽器補發 click 造成誤翻面或誤作答 | AC-28-05、AC-28-06 | `CLICK_SUPPRESS_MS` 時間窗；quiz／part5 只認點擊；E2E 以 CDP 觸控事件驗證 |
| T-26 | （v0.4）底部導覽遮住內容或輸入欄（虛擬鍵盤） | AC-27-03 | `body` 底部留白、toast 上移、輸入時隱藏導覽；實機人工驗收 |
| T-27 | （v0.4）每個學習事件都寫整筆 localStorage，極端資料量下拖慢互動 | AC-22-* | §6.1 估算最壞 400 K 字元仍 ≤ 20 ms（4 倍降速）；不做延遲寫入；FE-33 以大型 fixture 量測一次 |
| T-28 | （v0.4）同一檔案被多個新任務修改，平行時互相覆蓋 | 程式遺失 | D-6、§12.3：同檔任務以 `dependsOn` 串接，不同批 |
| T-29 | （v0.4）CSS 動畫時間與 JS 常數不同步 | QA 量到的時間與設計不符 | A-4：`router-motion.test.js` 讀 CSS 比對 |
| T-30 | （v0.4）QA 既有 E2E 以舊文字（抽認卡、自訂器、Part 5）定位元素或依「無首次畫面」的流程撰寫 | 回歸測試大量誤判 | SD-FB-13 知會 QA 更新；PG 不得修改 `tests/` |
| T-31 | （v0.4）跨午夜時頁面停在主控台、沒有任何操作 | 畫面仍顯示昨天的 X | PRD AC-30-07 只要求「學習行為或回到主控台」時反映，現行設計符合；不加計時器輪詢（避免背景耗電），列為已知行為 |
| T-32 | （v0.5）**`file://` 下持有 `getUserMedia` 音軌，Chrome／Edge 的 SpeechRecognition 仍可能每次再詢問權限**（兩者是否共用同一次授權取決於瀏覽器實作；PRD R-18 二已列為風險） | AC-33-01 不成立 | 設計已盡量讓授權發生在同一工作階段且音軌不中斷；V-MIC-1 以兩個瀏覽器實測；不成立時依 PRD 由 QA 開 BUG、人類判斷是否接受。**SD 無法在設計階段排除**，列為需要人類注意的首要風險 |
| T-33 | （v0.5）第一次按麥克風時可能出現**兩次**詢問（`getUserMedia` 一次、SpeechRecognition 一次） | AC-33-01「只在第 1 次出現 1 次」 | 先 `getUserMedia` 取得授權後才 `stt.start()`，正常情況下第二個請求沿用已授予的權限；V-MIC-1 記錄第 1 次按下時的詢問次數，若為 2 次同 T-32 處理 |
| T-34 | （v0.5）`AudioContext` 在 `await getUserMedia` 之後才建立會被自動播放政策置於 `suspended`，`AnalyserNode` 只讀到 0 | 收音條永遠全暗（AC-33-03） | 在點擊的同步階段建立 `AudioContext`，重用時 `resume()`；`mic.test.js` 斷言建構早於 `getUserMedia` 呼叫；V-MIC-3 實機確認 |
| T-35 | （v0.5）同時持有音軌與 SpeechRecognition，部分驅動或藍牙耳機切換為通話模式、或辨識品質改變 | 實機體驗 | 不連 `destination`（無回授）；`getUserMedia` 只要求 `{ audio: true }`，不另設 `echoCancellation` 等約束（沿用瀏覽器預設）；V-MIC 實測，問題由人類判斷 |
| T-36 | （v0.5）瀏覽器自動增益（AGC）使實際格數與替身音源不同 | 實機格數與 AC-33-04 數值不一致 | AC-33-04 以替身音源驗收（PRD 已註明）；實機只看「說話會亮、靜默會暗」；門檻可在 §7.14 範圍內微調、主控代核 |
| T-37 | （v0.5）離開頁面未經 router（例如瀏覽器返回、分頁切換） | 麥克風使用中圖示持續 | 本系統無 history 路由，離開單字卡頁只能經 router（會呼叫 `hide`）；重新整理與關閉以 `pagehide` 釋放；切到其他瀏覽器分頁不釋放（Q-36 只要求離開單字卡頁），列為已知行為 |
| T-38 | （v0.5）初始化寫入成功但畫面只更新一部分（某 view 漏聽 tag） | AC-32-02 主控台或模擬測驗頁仍顯示舊值 | `confirmApplyGoal` 發出 `goal`、`studySet`、`flashcard`、`quiz`、`speech`、`stats`、`streak`、`part5`、`learning` 等 tags；各頁 `show()` 時一律依最新狀態重繪；E2E 依 AC-32-02 逐項檢查 |
| T-39 | （v0.5）QA 或使用者以原始碼搜尋「解碼器」「句型庫」判定 AC-20-04 失敗 | 誤判 | 程式碼依 HT-4、HT-5 必須保留（`TAB_LABELS`、views），原始碼不可能為 0；AC-20-04 判定的是「畫面導覽與入口」。見 SD-FB-21 |
| T-40 | （v0.6）隱藏的分數區因 CSS 覆寫 `display` 而重新出現，或仍可被 Tab 聚焦 | AC-26-05 不成立 | 三重保證（`hidden` + 全域 `[hidden] !important`、`inert`、`disabled` + `tabindex="-1"`，§7.17）；FE-43 單元測試鎖定屬性、FE-44 以無頭瀏覽器 Tab 走一輪；QA E2E 再驗 |
| T-41 | （v0.6）隱藏的輸入框仍被當成分數來源（「套用」「開始學習」前讀 `input.value`），使既有分數被改寫或 735 被四捨五入以外的路徑影響 | AC-26-06、GS-3 | §7.17 刪除回寫步驟；`customizer.test.js` 斷言按「套用」「開始學習」時 `setDraftScore` 呼叫 0 次 |
| T-42 | （v0.6）測試把「預設值」與「v0.9 既有分數」都寫成 600，改常數後一併被改成 725，失去 GS-4（既有分數不轉換）的回歸保護 | 回歸漏測 | §10.3 規定：預設值斷言改引用 `C.SCORE_DEFAULT`；明示為既有分數的 600 fixture 保留，並新增 600／735 原值保留案例 |
| T-43 | （v0.6）已上線使用者的 `draftScore` 與 `appliedScore` 不同（v0.9 時調了分數未套用），重新載入後選中卡片 ≠ 生效色級 | 使用者困惑 | 契約 GS-1 定義選中卡片 = Color(`draftScore`)，屬既有「未套用」語意（AC-01-03、FB-35），不另處理；QA 構造 AC-26-06 時依 FB-36 兩欄同值 |
| T-44 | （v0.6）QA 既有 E2E（`tests/e2e/`）以 `#cz-score-input`／滑桿設定分數、或以畫面讀取「目前目標分數」 | 回歸測試大量失敗 | 屬 QA 負責、PG 不得修改；SD-FB-30 知會 QA 改為點卡片並以 localStorage 驗證分數 |
| T-45 | （v0.7）`file://` 下仍產生 manifest／SW 相關請求或 Console 警告（例如誤寫靜態 `<link rel="manifest">`、或 PE-1 先讀 `navigator.serviceWorker`） | AC-37-01 不成立 | HD-3 由 B-7 新規則中止建置；PE-1 第 (1) 步在前且 `pwa-core.test.js` 斷言 `file:` 時不讀 `navigator`；QA 以 `file://` 實測 Console |
| T-46 | （v0.7）Windows checkout（`core.autocrlf`）與 CI（LF）原始檔換行不同 → 本機與 CI 的 BUILD_ID、HTML 位元組不同 | 本機 `dist/` 與部署內容不一致（不影響 AC：AC-36-01 是同環境兩次建置） | 部署一律以 CI 建置為準；建議人類加 `.gitattributes`（`* text=auto eol=lf`、`*.png binary`），見 SD-FB-37 |
| T-47 | （v0.7）iOS Safari 不採用載入後才加入的 `apple-touch-icon`（契約 FB-43） | AC-34-05 圖示不正確 | V-PWA-H3 實機驗證；不成立時依 FB-43 改為靜態連結（契約小修、主控代核；`file://` 下 Chrome／Edge 不讀此標籤）並同步 B-7 白名單 |
| T-48 | （v0.7）`beforeinstallprompt` 在已安裝後以分頁開啟時仍觸發（契約 FB-40） | AC-34-08 (e) 按鈕出現 | 依賴 Chromium 行為；無可靠偵測（禁止 `related_applications`）；屬瀏覽器行為，QA 依 FB-40 判定 |
| T-49 | （v0.7）GitHub Pages `Cache-Control: max-age=600` 使 SW 安裝時取到舊 HTML，新快取存入舊版 | 更新後仍顯示舊版（AC-36-03） | SW-4 `cache: "reload"`；SW-1 `updateViaCache: "none"`；`serve.mjs` 以相同標頭模擬，E2E 驗證 V2 快取中的 meta 為 V2 |
| T-50 | （v0.7）`--site` 誤指向專案目錄，建置清空部署目錄時刪除原始碼 | 原始碼遺失 | B-16：目錄內有 `PWA_DEPLOY_FILES` 以外的任何檔案即中止、**不刪除**；`build.test.js` 鎖定 |
| T-51 | （v0.7）只修改 `tools/build.mjs` 的注入格式，HTML₀ 不變 → BUILD_ID 不變但 `sw.js` 位元組改變；新舊 SW 使用同名快取，install 覆寫使用中的快取 | 新舊版混用 | 注入只替換值、程式結構全在範本（§7.18.2）；FE-47 以測試鎖定注入只動兩個佔位；日後修改注入邏輯的任務須同時改範本（使其入雜湊） |
| T-52 | （v0.7）SW 快取 HTML 兩鍵約 6 MB，低容量裝置或嚴格配額下 install 失敗 | 無法離線（E-76） | 失敗時刪除該快取、線上照常（SW-4、PE-3）；AC-35-05 已接受；不做部分快取 |
| T-53 | （v0.7）`beforeinstallprompt` 被 `preventDefault` 後，Android Chrome 不再自動顯示迷你橫幅（R-20 風險 (4)） | 使用者找不到安裝入口 | 主控台「安裝 App」按鈕與瀏覽器選單並存（AC-34-02、AC-34-07）；屬已接受取捨 |
| T-54 | （v0.7）主控產出的 PNG 為 RGBA（含 alpha）或尺寸不符 | 建置中止，FE-53 無法完成 | MC-02 doneWhen 以 V-PWA-03 同一規則自檢；B-11 錯誤訊息列出檔名與不符項目，FE-53 遇到時標 `blocked` 回報主控重產 |
| T-55 | （v0.8）AC-38-05 要求標題列圖示為「藍底、橘色 EC 對話框」，AC-38-01／VC-3 卻規定 `#f7893b` 只能出現在兩個按鈕與打卡圖示 | QA 掃描必定多出 `.app-logo` 的橘色 path，判 AC-38-01 失敗 | 設計採 AC-38-05 的字面（圖示使用原色）；以 SD-FB-39 交人類／PM 決議是否在 AC-38-01 加入「標題列圖示」；決議前 QA 依 §10.5 標記為已知衝突。若人類決議維持 AC-38-01，則依其指示調整圖示配色（只動 `index.html` 的 SVG，屬設計小修，另開小任務） |
| T-56 | （v0.8）`--primary` 改值後，若有某處以 `--primary` 表示「藍色級」，該處顏色會改變 | AC-38-03 失敗 | §7.19.1 已查 v0.11 無此用法；FE-56 再逐一確認並在回報列出所有 `var(--primary)` 用處；QA 以 v0.11／v0.12 對照（§10.5） |
| T-57 | （v0.8）全域 `.card`、`.btn` 改版波及單字卡頁幾何 | AC-38-08「只換配色」不成立 | `#view-flashcards .card` 固定 v0.11 幾何；`.btn` 保留 1px 透明邊框與 8px 圓角；FE-62 截圖比對兩版單字卡頁 |
| T-58 | （v0.8）鎖定列 `opacity` 使文字對比下降 | AC-38-04、AC-26-01 | 透明度 0.85 且列內文字改 `--text`；QA 以截圖取樣量測 |
| T-59 | （v0.8）首次畫面固定底部列高度超過預留（文字換行、系統字級放大） | 遮住頁尾連結或 Toast（AC-41-04） | 摘要行與鎖定行 14px／20px、預留 184px（計算值 180）；FE-62 在 375×667 量 5 種選擇；系統字級放大屬 E-87 可接受範圍 |
| T-60 | （v0.8）PWA 色值、`<title>`、`--bg` 分散在 3 個檔案，任一先改都會讓建置或測試中止 | 中間狀態失敗 | 三者與相關測試全部放在 FE-56 同一任務（D-13） |
| T-61 | （v0.8）`installVisible` 加 `backupExpanded` 條件後，既有 `dashboard.test.js` 安裝案例失敗 | 中間狀態失敗 | 條件修改與 `dashboard.test.js` 同在 FE-58；FE-56 不動 `installVisible` |
| T-62 | （v0.8）`tokens.test.js` 的全檔掃描與其他任務的樣式改動互相影響 | 第 2 批任務的 `npm test` 失敗 | 禁止規則在 §7.19.1 事先公開，各任務 description 引用；違規時由該任務自行修正自己的 CSS，不得修改 `tokens.test.js`（非其 paths） |
| T-63 | （v0.8）QA 既有 E2E 以已移除的主控台入口、`#cz-guide`、試算結果卡定位 | 回歸測試大量失敗 | 保留 `#cz-start`、`#cz-restore`、`#cz-apply`、`#view-*`、`data-tab`；SD-FB-45 知會 QA |
| T-64 | （v0.8）已安裝 v0.11 的使用者因 BUILD_ID 改變而看到更新提示 | 使用者困惑（屬正常更新） | 快取前綴不變，SW-9 照常清除舊快取（NM-5）；不需任何處理 |
| T-65 | （v0.8）「開始今日學習」若改寫成 view 直接呼叫 `store.setTab`，會繞過 router 的換頁動畫與 `aria-current` 同步 | AC-39-03「結果與點導覽相同」不成立 | 規定只用 `[data-go="flashcards"]`；`dashboard.test.js` 斷言屬性而非呼叫 |
| T-66 | （v0.8）`body` 全域 `tabular-nums` 影響 IPA 或英文內容的字距 | 單字卡外觀微幅改變 | 只影響數字字形，不影響字母與 IPA 符號；AC-38-07 明確要求數字等寬 |
| T-67 | （v0.9）版本行若寫成靜態 HTML 再由 JS 填字，JS 失敗或 meta 不合法時會留下空行或「版本 （建置 ）」 | AC-42-01、VR-8 | 節點只由 `ui/version-line.js` 在兩值皆合法時建立；`version-line.test.js` 鎖定異常值不建節點 |
| T-68 | （v0.9）版本號在 BUILD_ID 之後才寫入，或只在執行期讀取 → 只改 `version` 時 PWA 不更新（契約 FB-53） | AC-42-04 (b) 不成立 | §5.4 固定順序 B-17 → B-18 → B-14；`build.test.js` 以 `computeBuildId(HTML₀′)` 重算比對，並測 1.0.0 → 1.0.1 的 `buildId` 必不同 |
| T-69 | （v0.9）有人以 `process.env.npm_package_version` 取版本 → `node tools/build.mjs` 直接執行時為 `undefined` | 建置結果依呼叫方式不同 | B-18 規定讀檔；原始碼掃描禁止 `npm_package_version`、`process.env` |
| T-70 | （v0.9）第 1 批若直接改 `layout.goalLine` 的語意，第 2 批之前 `dashboard.test.js` 的 capped 斷言失敗（不在 FE-65 paths） | 中間狀態 `npm test` 失敗 | 新增 `goalLineText`、`levelStatusText`，`goalLine` 只標 `@deprecated` 不改行為；dashboard 在 FE-66 改用新函式 |
| T-71 | （v0.9）CSS 以 `display` 覆寫 `[hidden]`，範本區重新出現；或只加 `hidden` 未加 `inert` | AC-43-01 | 全域 `[hidden] !important` 已存在；`custom-vocab.test.js` 斷言兩個屬性；QA 以計算後 `display` 與 Tab 驗證 |
| T-72 | （v0.9）QA 既有 E2E 以 `.db-change.btn--link`、`.db-goal__sep`、`#cz-st-target`／`#cz-st-effective`、`.cv-item__source`、範本按鈕點擊定位或操作 | 回歸測試誤判 | 新定位點：`.db-change`（class 不含 `btn--link`）、`#cz-st-line`、`#app-version`；範本按鈕仍在 DOM 但不可操作；SD-FB-54 知會 QA |
| T-73 | （v0.9）使用者發布新版時忘了改 `package.json` 的 `version` | 版本行仍顯示舊版號（建置碼仍會變） | 屬發布流程，建置只驗格式（VR-3）；建置碼仍可區分建置；§10.6 人工驗收提醒 |
| T-74 | （v0.9）Windows（CRLF）與 CI（LF）建置的 BUILD_ID 不同 → 本機與網站的建置碼不同 | 回報問題時兩邊建置碼對不上 | 同 T-46；版本號 X.Y.Z 兩邊相同；建議 `.gitattributes`（SD-FB-37，仍待人類） |
| T-75 | （v0.10）常數升為 3 的瞬間，大量既有測試以 `schemaVersion` 2 斷言或預寫 v2 主鍵而失敗 | 中間狀態 `npm test` 失敗、任務互相阻塞 | FE-73 一次負責常數、persist、backup、reinit 與 §7.21.1 表列的全部測試檔；斷言改用常數而非數字 |
| T-76 | （v0.10）現行 `parseStored` 只在「未遷移」時做 RD-1；v3 起 v2 資料一律走遷移，若沿用即把 `todayLearned` 型別錯誤的 v2 資料判為無法讀取並整體重設 | 既有學習紀錄遺失（違反 AC-47-04） | §4.10：遷移後**一律**先 RD-1 再 RD-3；`migrate-v3.test.js` 有回歸案例 |
| T-77 | （v0.10）記憶體中的位置與目前卡片不同步（某個 action 改了 `index` 卻沒更新位置） | 重新開啟停在錯的卡 | `gotoCard` 為唯一使用者入口、單字集重建一律 `placeCard`；INV-FP 在 `store-track.test.js` 每個 action 後斷言 |
| T-78 | （v0.10）每次換卡多 1 次整筆 `setItem`，低階手機或大量自訂單字時拖慢滑動 | AC-44-02、AC-28-03 > 100 ms | §6.6 估算 < 5 ms；FE-74 Node 量測；超標時改「先重繪後寫入」（§7.21.2），不需改契約 |
| T-79 | （v0.10）「只練沒答對」跳題邏輯出現無限迴圈、空白題目或 `currentIndex ≥ Q` | 白屏或卡死（E-111） | 轉移集中於 `part5flow`、單一有界迴圈；1,000 組隨機狀態的不變式測試（§10.7） |
| T-80 | （v0.10）使用者同時開著 v0.14 分頁或以舊 `file://` 檔開啟，舊程式把 3 視為無法讀取並重設，或以 v2 覆寫（契約 FB-57） | 新資料或進度遺失（原字串保留在 `unreadable`） | 屬範圍外（E-115、E-117）；SD-FB-63 建議發布說明；PWA 依既有更新提示換版 |
| T-81 | （v0.10）QA 既有 E2E 寫死 `schemaVersion === 2`、`data` 9 鍵，或以 v2 `lib/state.mjs` 預寫狀態後比對位元組 | 回歸測試誤判 | SD-FB-57 列出檔案與行號；新定位點 `[data-p5=…]` 見 §7.21.4 |
| T-82 | （v0.10）FB-54 使同色套用（綠 → 藍、金）不再回到第 1 張，既有測試或 QA 期望第 1 張 | 誤判缺陷 | FE-74 改寫 `store.test.js`；SD-FB-57 知會 QA；AC-03-05 只規定「套用不同色級」 |
| T-83 | （v0.10）一般寫入的容量不足提示改為整個工作階段 1 次，既有 `store.test.js` 斷言 `"storage"` tag | 測試失敗 | FE-74 同任務改寫；`ui/banner.js` 不改 |
| T-84 | （v0.10）匯入或啟動時取不到題庫（`EMT.content.part5` 缺漏，C-6） | UO-4 無法判斷 | `bankIds` 為 `[]` → Q = 0 → `normalizeOnly` 不動作、view 顯示空題庫；答對紀錄原值保留（Q-71 A） |
| T-85 | （v0.10）MC-04 未在 FE-76 前完成，產物仍為 1.0.0 | AC-42-02 不通過 | tasks.json：FE-76 `manualPrereqs` 含 MC-04；FE-76 doneWhen 檢查產物 meta = 1.1.0 |
| T-86 | （v0.10）樣本不是 v0.14 實際輸出（例如 FE-70 晚於 FE-73 執行，或以已修改的程式產生） | 遷移測試失去意義 | FE-70 在第 1 批、所有修改 persist／backup／store 的任務 `dependsOn` FE-70；樣本附 `dist` SHA-256 與產生方式；D-15 規定唯讀 |
| T-87 | （v0.11）375px 下聯絡行折成 2 行（字型寬度因系統而異） | AC-23-07 (1)(6) 不通過 | §7.22.2 字級 0.8125rem 並預留備援 0.75rem；FE-77 或主控 H-2 實測；放大字級時折行屬可接受（E-119） |
| T-88 | （v0.11）程式或註解在其他位置寫出位址（例如註解中示範去空格形式、以 `replace` 產生複製用字串） | 防爬蟲失效（FB-62） | `contact-static.test.js` 掃描交付 HTML 與 `src/app/` 非測試原始碼；常數只允許 1 處；L-7 (3) 禁止字串處理 |
| T-89 | （v0.11）`dist/` 再次被手動修改，或只建置 `--no-site`，使兩份 HTML 不同 | AC-36-07 不通過（QA BUG-004 重演） | FE-77 只以 `npm run build`（同時產生兩者）；doneWhen 比對 SHA-256；交付以建置產物為準（FB-61、SD-FB-67） |
| T-90 | （v0.11）QA 既有 E2E（`e2e-pwa-update.mjs`、`e2e-version.mjs`）等待舊文字「有新版本，重新整理」／按鈕「重新整理」 | 下次 QA 輪次 E2E 誤判失敗 | 本次不跑 QA（使用者決定）；SD-FB-65 知會 QA 下次輪次先更新定位文字 |

---

## 12. 任務總覽與執行批次

| 批次 | pg-content | pg-frontend | 前置 |
| :--- | :--- | :--- | :--- |
| 第 1 批 | CT-01 資料工具 | FE-01 建置腳本、FE-03 分數核心、FE-05 演算法核心 | 無 |
| 第 2 批 | CT-02 排名骨架與 sources.js、CT-18 範本、CT-19 Part 5（前 100）、CT-21 長難句與閱讀策略、CT-22 句型庫 | FE-02 殼與共用 UI、FE-04 單字集核心、FE-06 持久化與備份核心 | 第 1 批 |
| 第 3 批 | CT-03～CT-17 字庫 15 批、CT-20 Part 5（後 100、排序） | FE-07 store | 第 2 批 |
| 第 4 批 | CT-23 字庫整合與 sources.js 回填 | FE-08 主控台與備份、FE-09 自訂器、FE-10 自訂單字與範本、FE-11 抽認卡、FE-14 Part 5、FE-15 解碼器、FE-16 句型庫、FE-17 來源與授權頁 | 第 3 批 |
| 第 5 批 | — | FE-12 語音、FE-13 四選一 | FE-11 |
| 第 6 批（v0.3） | — | FE-19 頁面單元測試移入 `__tests__/` | FE-08～FE-17 與 §12.2 的 R3-1～R3-3 |
| 第 7 批 | — | FE-18 整合建置與自檢（產出 `dist/`） | 全部 FE（含 FE-19）、CT-23 |

任務數：pg-content 23 個（CT-01～CT-23）、pg-frontend 19 個（FE-01～FE-19；FE-19 為 v0.3 新增，由主控加入 tasks.json），共 42 個。

FE-19 與 FE-18 的先後（v0.3）：**FE-19 在前**。理由：FE-18 的 doneWhen 是「`npm test` 成功」，作為交付前最後關卡，應涵蓋全部頁面測試；FE-19 只寫 `src/app/__tests__/` 下的新檔，與 FE-18 的 paths（`tools/build.mjs`、`90-overrides.css`、`dist/`）無重疊，但若平行執行，FE-18 跑的 `npm test` 不含頁面測試，關卡失去意義。請主控在 FE-18 的 `dependsOn` 加入 `FE-19`。FE-19 不依賴 CT 任務（不讀正式資料），可與 CT 第 3、4 批平行。CT 與 FE 兩條線互不依賴，直到 FE-18 才匯合；FE 任務在內容未完成前以 fixture 開發。

### 12.1 v0.2 待派補修（已完成任務的程式需配合，由主控另派；SD 不改任務 paths）

| 編號 | 對象任務（檔案皆在其 paths 內） | 內容 | 時機 |
| :--- | :--- | :--- | :--- |
| R2-1 | FE-01（`tools/build.mjs`、`src/app/__tests__/build.test.js`、`src/app/index.html`、`package.json`） | (1) `checkTemplate` 改依 §5 B-1 新規則（LICENSE 緊接 `<meta charset="utf-8">`）；(2) B-7 新增 charset 位置 ≤ 1,024 bytes 檢查；(3) `build.test.js` 的模板常數、「LICENSE 未緊接 DOCTYPE」案例、對實際 `index.html` 的開頭斷言、`startsWith("<!DOCTYPE html>\n<!--\n")` 斷言改為新順序，並新增「charset 超出 1,024 bytes 中止」案例；(4) `index.html` 開頭改為 §5 的順序（其餘不變）；(5) `package.json` 的 `engines.node` 改 `>=22` | **必須在 FE-02 開始前完成**：B-1 檢查、測試與模板三者必須同時變更，否則 `npm test` 或建置會失敗；FE-02 已依賴 FE-01 |
| R2-2 | FE-03（`src/app/core/goal.js`、`src/app/__tests__/goal.test.js`） | `parseScoreInput` 字串改用 §7.1 的十進位規則；測試新增 `1e2`、`0x64`、`+700`、`-5`、`７００`（全形）、`1,000` 無效，` 723 ` → 725、`722.5` → 725、數字 `700` 有效 | FE-07 開始前完成為宜（FE-07 呼叫 `parseScoreInput`；介面不變，不阻擋平行） |

原 FE-01 任務描述中「`<!DOCTYPE html>`、緊接其後的 `<!-- @@LICENSE@@ -->`」的模板順序以本文件 §5（v0.2）為準。

### 12.2 v0.3 待派補修（由主控另派；檔案皆在原任務 paths 內）

| 編號 | 對象任務（檔案） | 內容 | 時機 |
| :--- | :--- | :--- | :--- |
| R3-1 | FE-03（`src/app/core/goal.js`、`src/app/__tests__/goal.test.js`） | §7.1 v0.3：`targetVocab` 在 `nB`／`nG` 不是大於 0 的有限數時回 `null`；`estimate` 藍金的 `T = nG` 同樣要求 > 0。測試新增：棕色 `estimate(S, 0, 0, 0)`、綠色 `estimate(S, 0, 2809, 0)`、藍色 `estimate(S, 0, 0, 0)` → `targetVocab` 為 `null`（藍金原本即 `null`）、`weeks === null`、`achieved === false`；`nB = -1`、`NaN` 同上；橘色 `estimate(S, 0, 0, 0)` 仍以 `N_O` 計算（不受影響）；既有測試若以 0 字量斷言「已達成」，改為新規則 | FE-19 開始前（FE-19 的 customizer 測試以新規則撰寫） |
| R3-2 | FE-07（`src/app/state/store.js`、`src/app/__tests__/store.test.js`） | §4.3、§7.5 v0.3：`injectTemplate` 寫入遇 quota → 丟棄新狀態、回 `{ injected: 0, skipped, reason: "quota" }`，不設 `writeStatus`、不發 `storage` tag；`disabled` 維持現行（保留記憶體）。測試新增：quota 時 `getState().data.customVocab` 與 storage 原值皆不變、回傳含 `reason: "quota"`、subscribe 未收到 `storage` tag；之後解除 quota 再注入可完整注入 | R3-3 之前 |
| R3-3 | FE-10（`src/app/views/custom-vocab.js`） | 範本注入結果 `reason === "quota"` → 只顯示 toast「儲存空間不足」（沿用既有 `MSG_QUOTA`），不顯示「已注入 N 個單字」；若注入提示文字由匯出的純函式產生，同步支援 quota 分支（供 FE-19 測試） | R3-2 之後、FE-19 之前 |
| R3-4 | CT-01（`src/data/_tools/validate.mjs`、`src/data/_tools/lib.mjs`、`src/data/_records/CT-01.md`） | §8.4 v0.3「H-1 繁簡同形白名單」：新增白名單常數；導出字集扣除白名單 → H-1 錯誤；白名單字元命中 → H-1W 警告；報告開頭列出導出字集大小與被降為警告的字元；`CT-01.md` 補記白名單與以 fixture 驗證「后」→ H-1W、非白名單簡體字 → H-1 錯誤。V-VOC-17 不改程式 | 越早越好；最遲在 CT-23 執行 `--all` 之前。已完成的字庫批次不需重跑（白名單只會減少錯誤），但若其紀錄缺 V-VOC-17 判斷欄，由主控通知補紀錄（只改 `_records/vocab-XXXX.md`） |

不需補修（v0.3 確認現行做法）：FE-07 測驗模式退回（§4.3）、FE-11 的 `state.runtime.flashcard` 用法（§4.4）、FE-12 的 `aria-disabled` 寫法（§9）與 `audio-capture` 訊息（§7.6）、FE-17 辭典列出規則（§7.6）、FE-09 view 的 0 轉 null（可保留）、FE-06 `backup.js` 的取用時機（已符合 LD-1、LD-3）。

### 12.3 v0.4 增量任務與執行批次（PRD v0.8、契約 v0.8）

既有 42 個任務（CT-01～CT-23、FE-01～FE-19）全部 `done`，內容不變。v0.4 新增 14 個 pg-frontend 任務，**不新增 pg-content 任務**（D-7）。

| ID | 標題 | dependsOn | 主要 paths |
| :--- | :--- | :--- | :--- |
| FE-20 | 契約常數 v0.8 與學習紀錄核心 | — | `core/constants.js`、`core/learning.js` |
| FE-21 | 介面互動核心（Q-33 常數、滑動判斷、震動樣式） | — | `core/interaction.js` |
| FE-22 | 持久化 v2：遷移、讀取規則、備份 v1／v2 | FE-20 | `core/persist.js`、`core/backup.js`、`core/constants.js` |
| FE-23 | R-15 功能更名（畫面文字） | FE-20 | `index.html`、`views/{dashboard,customizer,flashcards,part5}.js` |
| FE-24 | 換頁動畫與減少動態基礎 | FE-21 | `ui/router.js`、`ui/motion.js`、`styles/05-motion.css` |
| FE-25 | store：v2 狀態與學習事件記錄 | FE-20、FE-22 | `state/store.js`、`ui/banner.js` |
| FE-26 | 手機底部導覽列 | FE-20、FE-23 | `index.html`、`styles/00-base.css`、`ui/bottom-nav.js`、`main.js` |
| FE-27 | 難易度大卡片 | FE-23 | `views/customizer.js`、`styles/20-customizer.css` |
| FE-28 | 單字卡手勢與翻轉動畫 | FE-21、FE-23、FE-24 | `views/flashcards.js`、`styles/30-flashcards.css` |
| FE-29 | 答題回饋：顏色、動畫、震動、只認點擊 | FE-21、FE-23、FE-24 | `views/flashcard-quiz.js`、`views/part5.js`、兩個 CSS、`services/haptics.js` |
| FE-30 | store：首次進入流程 | FE-25 | `state/store.js` |
| FE-31 | 主控台今日學習進度 | FE-20、FE-22、FE-23、FE-24、FE-25 | `views/dashboard.js`、`styles/10-dashboard.css` |
| FE-32 | 首次進入畫面與流程整合 | FE-24、FE-26、FE-27、FE-30 | `main.js`、`ui/router.js`、`ui/import-flow.js`、`views/customizer.js`、`styles/{00-base,20-customizer}.css`、`index.html` |
| FE-33 | v0.8 整合建置與交付前自檢 | FE-20～FE-32 全部 | `dist/`、`styles/90-overrides.css`、`tools/build.mjs`、`load-order.test.js` |

| 批次 | 任務（可平行） | 前置 |
| :--- | :--- | :--- |
| v0.4 第 1 批 | FE-20、FE-21 | 無（既有任務皆已 done） |
| v0.4 第 2 批 | FE-22、FE-23、FE-24 | 第 1 批 |
| v0.4 第 3 批 | FE-25、FE-26、FE-27、FE-28、FE-29 | 第 2 批 |
| v0.4 第 4 批 | FE-30、FE-31 | FE-25（及第 2 批） |
| v0.4 第 5 批 | FE-32 | FE-30、FE-26、FE-27、FE-24 |
| v0.4 第 6 批 | FE-33 | 全部 |

同批任務的 `paths` 互不重疊（主控可以 tasks.json 驗證）。共用檔案的串接：`constants.js`、`goal.test.js`：FE-20 → FE-22；`index.html`：FE-23 → FE-26 → FE-32；`main.js`：FE-26 → FE-32；`00-base.css`：FE-26 → FE-32；`router.js`、`router-motion.test.js`：FE-24 → FE-32；`customizer.js`、`20-customizer.css`、`customizer.test.js`：FE-23（僅 `customizer.js`）→ FE-27 → FE-32；`store.js`、`store.test.js`：FE-25 → FE-30；`dashboard.js`：FE-23 → FE-31；`dashboard.test.js`：FE-22 → FE-31；`flashcards.js`：FE-23 → FE-28；`part5.js`：FE-23 → FE-29。

任務數（全專案）：pg-content 23、pg-frontend 33（FE-01～FE-33），共 56 個。

### 12.4 v0.5 增量任務與執行批次（PRD v0.9、契約 v0.9）

既有 56 個任務全部 `done`，內容不變。v0.5 新增 8 個 pg-frontend 任務；**不新增 pg-content 任務**（D-9、契約 DS-06）。**FE-34～FE-41 彼此沒有任何共用 path**（D-8）。

| ID | 標題 | dependsOn | paths |
| :--- | :--- | :--- | :--- |
| FE-34 | 契約常數 v0.9 與切換難易度初始化核心 | — | `core/constants.js`、`core/reinit.js`、`__tests__/goal.test.js`、`__tests__/reinit.test.js` |
| FE-35 | 收音條音量核心（門檻常數、RMS、dBFS、亮格數） | — | `core/meter.js`、`__tests__/meter.test.js` |
| FE-36 | 麥克風服務：取得、重用、釋放、音量讀取 | FE-35 | `services/mic.js`、`__tests__/mic.test.js` |
| FE-37 | store：切換難易度初始化（原子寫入）與隱藏頁守門 | FE-34 | `state/store.js`、`__tests__/store.test.js`、`__tests__/_fixtures.js` |
| FE-38 | 隱藏解碼器與句型庫：導覽、底部導覽、主控台入口、路由 | FE-34 | `index.html`、`styles/00-base.css`、`ui/router.js`、`views/dashboard.js`、`__tests__/naming.test.js`、`__tests__/shell.test.js`、`__tests__/router-motion.test.js`、`__tests__/dashboard.test.js` |
| FE-39 | 語音面板 v0.9：麥克風只詢問一次、5 格收音條、錯誤對照、離開釋放 | FE-35、FE-36 | `views/speech-panel.js`、`styles/31-speech.css`、`views/flashcards.js`、`__tests__/speech.test.js`、`__tests__/flashcards.test.js` |
| FE-40 | 難易度設定：初始化確認視窗 | FE-37 | `views/customizer.js`、`__tests__/customizer.test.js` |
| FE-41 | v0.9 整合建置、交付產物與自檢（含 dist 重建） | FE-34～FE-40 | `dist/english-master-track.html`、`tools/build.mjs`、`__tests__/build.test.js`、`__tests__/load-order.test.js`、`styles/90-overrides.css` |

（paths 皆省略前綴 `src/app/`，`dist/`、`tools/` 除外。）

| 批次 | 任務（可平行） | 前置 |
| :--- | :--- | :--- |
| v0.5 第 1 批 | FE-34、FE-35 | 無（既有任務皆已 done） |
| v0.5 第 2 批 | FE-36、FE-37、FE-38 | FE-36 ← FE-35；FE-37、FE-38 ← FE-34 |
| v0.5 第 3 批 | FE-39、FE-40 | FE-39 ← FE-35、FE-36；FE-40 ← FE-37 |
| v0.5 第 4 批 | FE-41 | 全部 |

說明：(1) 第 1 批結束後 `naming.test.js`、`shell.test.js` 會暫時失敗，第 2 批 FE-38 修復（§10.2）；(2) 若主控希望縮短路徑，FE-38 與 FE-36、FE-37 無相依，也可提前與第 1 批之後的任何批次並行；(3) FE-39 只依賴 FE-35、FE-36，可與 FE-37、FE-38 同時開始（若主控採「依 dependsOn 即時派發」而非固定批次）。

任務數（全專案）：pg-content 23、pg-frontend 41（FE-01～FE-41），共 64 個。

### 12.5 v0.6 增量任務與執行批次（PRD v0.10、契約 v0.10）

既有 64 個任務全部 `done`，內容不變。v0.6 新增 3 個 pg-frontend 任務；**不新增 pg-content 任務**（DS-10）。**FE-42～FE-44 彼此沒有任何共用 path**（D-10）。

| ID | 標題 | dependsOn | paths |
| :--- | :--- | :--- | :--- |
| FE-42 | 核心與 store：點卡片 = 該色上限、預設 725、既有分數不轉換 | — | `core/constants.js`、`core/goal.js`、`state/store.js`、`__tests__/goal.test.js`、`__tests__/persist.test.js`、`__tests__/store.test.js`、`__tests__/_fixtures.js` |
| FE-43 | 畫面：隱藏分數輸入、卡片與主控台不顯示分數、取消回原色級 | FE-42 | `views/customizer.js`、`views/dashboard.js`、`styles/20-customizer.css`、`styles/10-dashboard.css`、`__tests__/customizer.test.js`、`__tests__/dashboard.test.js`、`__tests__/naming.test.js`、`__tests__/first-run.test.js` |
| FE-44 | v0.10 整合建置、重新產出 dist/ 與自檢 | FE-42、FE-43 | `dist/english-master-track.html`、`__tests__/load-order.test.js`、`styles/90-overrides.css` |

（paths 皆省略前綴 `src/app/`，`dist/` 除外。）

| 批次 | 任務 | 前置 |
| :--- | :--- | :--- |
| v0.6 第 1 批 | FE-42 | 無（既有任務皆已 done） |
| v0.6 第 2 批 | FE-43 | FE-42 |
| v0.6 第 3 批 | FE-44 | FE-42、FE-43 |

說明：(1) 範圍小，刻意不平行：FE-43 的測試替身直接使用 `goal.scoreAfterColorClick`，且 FE-40 案例依賴 `_fixtures` 預設值，FE-42 完成後才有穩定基準；(2) FE-42 收尾時 `customizer.test.js` 會有 §10.3 所列的暫時失敗，由 FE-43 修復；(3) FE-44 為交付關卡，`npm test` 必須全數通過。

任務數（全專案）：pg-content 23、pg-frontend 44（FE-01～FE-44），共 67 個。

### 12.6 v0.7 增量任務與執行批次（PRD v0.11、契約 v0.11）

既有 67 個任務全部 `done`，內容不變。v0.7 新增 9 個 pg-frontend 任務；**不新增 pg-content 任務**（DS-18）。**FE-45～FE-53 彼此沒有任何共用 path**（D-11）。

| ID | 標題 | dependsOn | paths |
| :--- | :--- | :--- | :--- |
| FE-45 | PWA 核心：契約常數與純函式 | — | `core/pwa.js`、`__tests__/pwa-core.test.js` |
| FE-46 | service worker 範本 | FE-45 | `pwa/sw.template.js`、`__tests__/sw.test.js` |
| FE-47 | 建置 PWA 階段、部署目錄、本機伺服器、授權標頭品牌聲明 | FE-45、FE-46 | `tools/build.mjs`、`tools/serve.mjs`、`package.json`、`license-header.txt`、`__tests__/build.test.js` |
| FE-48 | PWA 服務：啟用判定、連結、註冊、更新、安裝事件 | FE-45 | `services/pwa.js`、`__tests__/pwa-service.test.js` |
| FE-49 | store：`RuntimeState.pwa` 與 `setPwa` | FE-45 | `state/store.js`、`__tests__/store.test.js` |
| FE-50 | 殼層：HD-1、建置識別碼佔位、新版提示列、啟動接線 | FE-45、FE-48、FE-49 | `index.html`、`main.js`、`ui/pwa-notice.js`、`styles/80-pwa.css`、`__tests__/shell.test.js`、`__tests__/pwa-notice.test.js` |
| FE-51 | 主控台：不互通說明與「安裝 App」按鈕 | FE-45、FE-48、FE-49 | `views/dashboard.js`、`styles/10-dashboard.css`、`__tests__/dashboard.test.js` |
| FE-52 | 資料來源與授權頁：品牌標識聲明 | FE-45 | `views/sources-page.js`、`__tests__/sources-page.test.js` |
| FE-53 | v0.11 整合建置、產出 `dist/` 與部署目錄、交付前自檢 | FE-45～FE-52；**MC-01、MC-02** | `dist/english-master-track.html`、`dist/site/` 下 8 檔、`__tests__/load-order.test.js`、`styles/90-overrides.css` |

（paths 皆省略前綴 `src/app/`，`dist/`、`tools/`、`package.json` 除外。）

**主控執行項目（不派給 PG；tasks.json `manualSteps`）**

| ID | 內容 | 時機 | 完成條件 |
| :--- | :--- | :--- | :--- |
| MC-01 | 把 `dist/ads.txt` **複製**為 `sources/deploy/ads.txt`（逐位元組相同，檔名小寫）；`dist/ads.txt` 暫時保留（舊 workflow 仍引用，避免 MC-03 之前的 push 部署失敗） | v0.7 第 1 批之前 | 兩檔 SHA-256 相同；內容為 1 行 `google.com, pub-4051803210893105, DIRECT, f08c47fec0942fa0`（DP-6） |
| MC-02 | 把已產好的 4 張 PNG 放到 `src/app/assets/icons/`（檔名 `icon-192.png`、`icon-512.png`、`icon-maskable-512.png`、`apple-touch-icon-180.png`）；在 `sources/pwa/README.md` 記錄產生方式（來源檔、裁切範圍、補色值、maskable 縮放 78%、工具與參數）（Q-45、DP-5） | v0.7 第 1 批之前 | 以 V-PWA-03 同規則自檢 4 檔：PNG 簽章、寬 = 高 = 192／512／512／180、位元深度 8、色彩類型 2（RGB）、無 `tRNS`；maskable 以 DevTools 遮罩預覽或目視確認文字在 80% 圓內 |
| MC-03 | 依 §5.2 整檔取代 `.github/workflows/static.yml`；同次提交刪除 `dist/ads.txt`；確認 §5.2「CI 建置的前提」檔案皆已提交；push 到 `main` | FE-53 `done` 之後 | GitHub Actions 成功；交人類／QA 執行 V-PWA-H4（AC-36-07） |

| 批次 | 任務（可平行） | 前置 |
| :--- | :--- | :--- |
| v0.7 第 0 批（主控） | MC-01、MC-02 | 無 |
| v0.7 第 1 批 | FE-45 | MC-01、MC-02（第 3 批起 FE-47 與 FE-50 的成果合在一起後，任何以專案 `src/app` 建置的驗證都需要圖示與 `ads.txt`；為了讓每個任務都能用同一條建置指令自驗，主控先完成第 0 批） |
| v0.7 第 2 批 | FE-46、FE-48、FE-49、FE-52 | 皆 ← FE-45 |
| v0.7 第 3 批 | FE-47、FE-50、FE-51 | FE-47 ← FE-45、FE-46；FE-50、FE-51 ← FE-45、FE-48、FE-49 |
| v0.7 第 4 批 | FE-53 | FE-45～FE-52、MC-01、MC-02 |
| v0.7 收尾（主控） | MC-03 | FE-53 |

說明：(1) 同批任務 paths 互不重疊；(2) FE-47 的 `build.test.js` 只用 fixture，不斷言專案 `index.html` 的 PWA 元素（那是 FE-50 的 `shell.test.js`），因此與 FE-50 平行無衝突；(3) 若主控採「依 dependsOn 即時派發」，FE-52 可與第 2 批任何任務同時、FE-47 只需等 FE-46；(4) FE-53 為交付關卡，`npm test` 必須全數通過、`npm run build` 產出 `dist/site/` 8 檔。

任務數（全專案）：pg-content 23、pg-frontend 53（FE-01～FE-53），共 76 個；另有主控項目 MC-01～MC-03（不計入任務數）。

### 12.7 v0.8 增量任務與執行批次（PRD v0.12、契約 v0.12）

既有 76 個任務全部 `done`，內容不變。v0.8 新增 1 個 pg-content（CT-24）與 9 個 pg-frontend（FE-54～FE-62）任務；不需主控手動項目（圖示 PNG、`ads.txt`、workflow 皆不變）。

| ID | 標題 | dependsOn | paths |
| :--- | :--- | :--- | :--- |
| CT-24 | ORIGINAL 來源名稱改為「EnglishContext 原創內容」 | — | `src/data/sources.js`、`src/data/_tools/lib.mjs`、`src/data/_records/CT-24.md` |
| FE-54 | 版面核心：契約 §13 常數與版面純函式 | — | `core/layout.js`、`__tests__/layout.test.js` |
| FE-55 | store：`runtime.dashboard` 與 `setBackupExpanded` | — | `state/store.js`、`__tests__/store.test.js` |
| FE-56 | 殼層與 token：色彩變數、共用樣式、標題列圖示與名稱、PWA 色值、建置標題檢查 | — | `index.html`、`license-header.txt`、`styles/00-base.css`、`core/pwa.js`、`tools/build.mjs`、`__tests__/build.test.js`、`__tests__/shell.test.js`、`__tests__/pwa-core.test.js`、`__tests__/tokens.test.js` |
| FE-57 | 難易度設定：精簡色級列、首次畫面固定底部列 | FE-54、FE-56 | `views/customizer.js`、`styles/20-customizer.css`、`styles/21-custom-vocab.css`、`__tests__/customizer.test.js`、`__tests__/first-run.test.js` |
| FE-58 | 主控台改版：今日任務卡、3 格數據、近 7 天、收合資料備份、IN-1 | FE-54、FE-55、FE-56 | `views/dashboard.js`、`styles/10-dashboard.css`、`core/pwa.js`、`__tests__/dashboard.test.js`、`__tests__/pwa-core.test.js`、`__tests__/naming.test.js` |
| FE-59 | 單字卡頁與其他樣式只換配色 | FE-56 | `styles/30-flashcards.css`、`styles/31-speech.css`、`styles/32-quiz.css`、`styles/80-pwa.css` |
| FE-60 | 資料來源與授權頁：原創內容來源名稱、樣式 | FE-56 | `views/sources-page.js`、`styles/70-sources.css`、`__tests__/sources-page.test.js`、`__tests__/_fixtures.js` |
| FE-61 | 模擬測驗：進度條與 720px | FE-54、FE-56 | `views/part5.js`、`styles/40-part5.css`、`__tests__/part5.test.js` |
| FE-62 | v0.12 整合建置、產出 `dist/` 與部署目錄、版面自檢 | CT-24、FE-54～FE-61 | `dist/english-master-track.html`、`dist/site/` 下 8 檔、`__tests__/load-order.test.js`、`styles/90-overrides.css` |

（paths 皆省略前綴 `src/app/`，`src/data/`、`dist/`、`tools/` 除外。）

| 批次 | 任務（可平行） | 前置 | 共用檔案檢查 |
| :--- | :--- | :--- | :--- |
| v0.8 第 1 批 | CT-24、FE-54、FE-55、FE-56 | 無 | 4 個任務 paths 互不重疊 |
| v0.8 第 2 批 | FE-57、FE-58、FE-59、FE-60、FE-61 | 依上表 | 互不重疊；`core/pwa.js`、`pwa-core.test.js` 只在本批的 FE-58（第 1 批 FE-56 已完成） |
| v0.8 第 3 批 | FE-62 | 第 1、2 批全部 | — |

說明：(1) 若主控採「依 dependsOn 即時派發」，FE-59、FE-60 只需等 FE-56；FE-55 完成後 FE-58 仍需 FE-54、FE-56。(2) FE-62 為交付關卡：`npm run validate:data`、`npm test`、`npm run build` 全數成功，並在有無頭瀏覽器時執行 §10.5 可自動化的量測（無則列為待 QA 項目）。(3) 第 3 批完成後，主控依既有流程 push 到 `main`，由 MC-03 建立的 workflow 自動部署（不需再改 workflow）。

任務數（全專案）：pg-content 24（CT-01～CT-24）、pg-frontend 62（FE-01～FE-62），共 86 個。

### 12.8 v0.9 增量任務與執行批次（PRD v0.14、契約 v0.14）

既有 86 個任務全部 `done`，內容不變。v0.9 新增 7 個 pg-frontend 任務（FE-63～FE-69）；**不需 CT 任務**（`src/data/` 不改，DS-31）、**不需主控手動項目**（`package.json` 已由主控改為 1.0.0；workflow、圖示、`ads.txt` 不變）。tasks.json 的新任務另加 `batch` 欄位（`"v0.9-1"`～`"v0.9-3"`）。

| ID | 標題 | 批次 | dependsOn | paths |
| :--- | :--- | :--- | :--- | :--- |
| FE-63 | 建置：版本號注入（`package.json` → `emt-app-version`）先於 BUILD_ID、`core/version.js` | v0.9-1 | — | `core/version.js`（新）、`__tests__/version.test.js`（新）、`index.html`、`tools/build.mjs`、`__tests__/build.test.js`、`__tests__/shell.test.js` |
| FE-65 | 版面核心：`levelStatus` 常數、`goalLineText`、`levelStatusText` | v0.9-1 | — | `core/layout.js`、`__tests__/layout.test.js` |
| FE-68 | 隱藏領域範本區塊、移除畫面「範本」字樣、來源標示只留「自訂擴充」 | v0.9-1 | — | `views/custom-vocab.js`、`views/flashcards.js`、`__tests__/custom-vocab.test.js`、`__tests__/flashcards.test.js`、`__tests__/naming.test.js` |
| FE-64 | 頁尾版本行（讀兩個 meta、不合法不顯示） | v0.9-2 | FE-63 | `ui/version-line.js`（新）、`main.js`、`styles/00-base.css`、`__tests__/version-line.test.js`（新） |
| FE-66 | 主控台目標行只顯示生效色級、「變更」改外框按鈕 | v0.9-2 | FE-65 | `views/dashboard.js`、`styles/10-dashboard.css`、`__tests__/dashboard.test.js` |
| FE-67 | 難易度設定頁狀態列改為一行「目前色級：{生效色級}」 | v0.9-2 | FE-65 | `views/customizer.js`、`styles/20-customizer.css`、`__tests__/customizer.test.js` |
| FE-69 | v0.14 整合建置、產出 `dist/` 與部署目錄、版本行與版面自檢 | v0.9-3 | FE-63～FE-68 | `dist/english-master-track.html`、`dist/site/` 下 8 檔、`__tests__/load-order.test.js`、`styles/90-overrides.css` |

（paths 皆省略前綴 `src/app/`，`tools/`、`dist/` 除外。）

| 批次 | 任務（可平行） | 前置 | 共用檔案檢查 |
| :--- | :--- | :--- | :--- |
| v0.9 第 1 批 | FE-63、FE-65、FE-68 | 無 | 3 個任務 paths 互不重疊 |
| v0.9 第 2 批 | FE-64、FE-66、FE-67 | FE-64 ← FE-63；FE-66、FE-67 ← FE-65 | 3 個任務 paths 互不重疊，也不與第 1 批重疊（本版每個檔案只屬於 1 個 v0.9 任務，D-14） |
| v0.9 第 3 批 | FE-69 | 第 1、2 批全部 | — |

說明：(1) 若主控採「依 dependsOn 即時派發」，FE-64 只需等 FE-63，FE-66、FE-67 只需等 FE-65；FE-68 不被任何第 2 批任務依賴，但 FE-69 需要它。(2) FE-69 為交付關卡：`npm run validate:data`、`npm test`、`npm run build` 全數成功，並在有無頭瀏覽器時執行 §10.6 可自動化的量測。(3) 第 3 批完成後，主控依既有流程 push 到 `main`，workflow 自動部署（不需改 workflow）；已安裝 v0.12 版的使用者會依 AC-36-03 看到「有新版本，重新整理」（BUILD_ID 改變，屬預期）。

任務數（全專案）：pg-content 24（CT-01～CT-24）、pg-frontend 69（FE-01～FE-69），共 93 個。

### 12.9 v0.10 增量任務與執行批次（PRD v0.15、契約 v0.15）

既有 93 個任務全部 `done`，內容不變。v0.10 新增 7 個 pg-frontend 任務（FE-70～FE-76）、1 個 pg-content 任務（CT-25，DS-37 選擇性檢查，SD 決定建立）與 1 個主控手動項目（MC-04，`package.json` 1.1.0）。tasks.json 的新任務沿用 `batch` 欄位（`"v0.10-1"`～`"v0.10-5"`）。**本版含持久化結構變更的實作**（契約 v0.15 已由人類核准 Q-63），tasks.json 仍須人類核准一次才能開工（CLAUDE.md 第 4 階段授權）。

| ID | 標題 | 批次 | dependsOn | paths |
| :--- | :--- | :--- | :--- | :--- |
| FE-70 | 凍結 v0.14／v0.7 實際寫出的 localStorage 與備份樣本 | v0.10-1 | — | `__tests__/_samples/` 下 5 檔（新）、`__tests__/samples.test.js`（新） |
| FE-71 | `core/position.js`：單字卡位置解析與正規化 | v0.10-1 | — | `core/position.js`（新）、`__tests__/position.test.js`（新） |
| FE-72 | `core/part5flow.js`：模擬測驗狀態轉移；`layout.part5Progress` 支援 allCorrect | v0.10-1 | — | `core/part5flow.js`（新）、`__tests__/part5flow.test.js`（新）、`core/layout.js`、`__tests__/layout.test.js` |
| CT-25 | V-P5-08 題目 id 穩定性快照與檢查 | v0.10-1 | — | `src/data/_tools/validate.mjs`、`src/data/_records/part5-ids.json`（新）、`src/data/_records/CT-25.md`（新） |
| MC-04（主控） | `package.json` `version` → `1.1.0` | v0.10-1 | — | `package.json` |
| FE-73 | 持久化 v3：常數、遷移、RD-3、匯入 IM-9／IM-10、初始化 CI-4；既有測試改寫 | v0.10-2 | FE-70、FE-71、FE-72 | §3 v0.10 表（14 檔） |
| FE-74 | store：位置掛點、答對紀錄、只練沒答對、3 個新 action、`commitWrite` | v0.10-3 | FE-73 | `state/store.js`、`__tests__/store.test.js`、`__tests__/store-track.test.js`（新） |
| FE-75 | 模擬測驗畫面：計數行、標示、開關、全部答對畫面、確認對話框 | v0.10-4 | FE-72、FE-74 | `views/part5.js`、`styles/40-part5.css`、`__tests__/part5.test.js` |
| FE-76 | v0.15 整合建置：產出 `dist/` 與部署目錄、載入順序、跨模組自檢 | v0.10-5 | FE-70～FE-75、CT-25；manualPrereqs MC-04 | `dist/english-master-track.html`、`dist/site/` 下 8 檔、`__tests__/load-order.test.js`、`styles/90-overrides.css` |

（paths 皆省略前綴 `src/app/`，`src/data/`、`tools/`、`dist/`、`package.json` 除外。）

| 批次 | 任務（可平行） | 前置 | 共用檔案檢查 |
| :--- | :--- | :--- | :--- |
| v0.10 第 1 批 | FE-70、FE-71、FE-72、CT-25、MC-04（主控） | 無 | 5 項 paths 互不重疊 |
| v0.10 第 2 批 | FE-73 | FE-70、FE-71、FE-72 | — |
| v0.10 第 3 批 | FE-74 | FE-73 | `__tests__/store.test.js` 與 FE-73 重疊，以 `dependsOn` 分屬第 2、3 批（D-15） |
| v0.10 第 4 批 | FE-75 | FE-72、FE-74 | — |
| v0.10 第 5 批 | FE-76 | 前 4 批全部、MC-04 | — |

說明：(1) FE-70 必須在 FE-73 之前、且在 FE-76 覆寫 `dist/` 之前（它讀 v0.14 交付檔，T-86）。(2) FE-75 的測試會用真 store（`_fixtures.makeStore`）呼叫新 action，因此排在 FE-74 之後，不與其平行。(3) FE-76 為交付關卡：`npm run validate:data`、`npm test`、`npm run build` 全數成功；產物版本為 1.1.0。(4) 第 5 批完成後，主控依既有流程 push 到 `main`，workflow 自動部署；已安裝 v1.0.0 PWA 的使用者會看到「有新版本，重新整理」，按下後首次啟動自動遷移到 3（AC-47-04）。

任務數（全專案）：pg-content 25（CT-01～CT-25）、pg-frontend 76（FE-01～FE-76），共 101 個；主控手動項目 MC-01～MC-04。

### 12.10 v0.11 增量任務與執行批次（PRD v0.16、契約 v0.16）

既有 101 個任務全部 `done`，內容與 status 不變。依 DS-40 只新增 1 個 pg-frontend 任務 FE-77（`batch` `"v0.11-1"`）；不需 CT 任務（`src/data/` 不變）、不需主控手動項目（`package.json` 維持 1.1.0）。本版不改 PRD、不改持久化結構，但 tasks.json 仍依 CLAUDE.md 須人類核准一次才能開工。

| ID | 標題 | 批次 | dependsOn | paths |
| :--- | :--- | :--- | :--- | :--- |
| FE-77 | v0.16 文字修訂：更新提示新文字、資料來源頁聯絡行、防爬蟲靜態檢查、重新建置 `dist/` | v0.11-1 | FE-76（已 done） | `core/pwa.js`、`views/sources-page.js`、`styles/70-sources.css`、`__tests__/pwa-core.test.js`、`__tests__/pwa-notice.test.js`、`__tests__/sources-page.test.js`、`__tests__/contact-static.test.js`（新）、`dist/english-master-track.html`、`dist/site/` 下 8 檔 |

（paths 省略前綴 `src/app/`，`dist/` 除外。）

| 批次 | 任務 | 前置 | 共用檔案檢查 |
| :--- | :--- | :--- | :--- |
| v0.11 第 1 批 | FE-77 | 無待執行前置 | 單一任務，無平行衝突（D-16） |

說明：(1) FE-77 是交付關卡：`npm test`、`npm run build`（兩次）全數成功並附檢查輸出。(2) 驗收由 PG 自測＋主控檢查（§10.8 H-1～H-4），不另跑 QA 輪次。(3) 完成後主控依既有流程 commit、push 到 `main`，workflow 自動部署；已安裝 1.1.0 舊 BUILD_ID 的使用者會看到舊程式內的「有新版本，重新整理」，更新後即為新文字（E-120）。(4) QA BUG-004 的狀態更新由主控處理（FE-77 回報可作為修正證據），SD 不改 `docs/04-qa/`。

任務數（全專案）：pg-content 25（CT-01～CT-25）、pg-frontend 77（FE-01～FE-77），共 102 個；主控手動項目 MC-01～MC-04。

---

## 13. AC → 任務對照表

（v0.3）共 141 個 AC，全部涵蓋（未涵蓋：無）。v0.4 追加見 §13.1。「CT-03～CT-17」表示 15 個字庫批次任務全部；「CT-10～CT-17」表示排名 > 2,809 的 8 個批次。

| AC | 任務 |
| :--- | :--- |
| AC-01-01 | FE-03、FE-09 |
| AC-01-02 | FE-04、FE-07、FE-09 |
| AC-01-03 | FE-07、FE-09 |
| AC-01-04 | FE-06、FE-07 |
| AC-01-05 | FE-03、FE-09 |
| AC-01-06 | FE-03、FE-09 |
| AC-01-07 | FE-03、FE-07、FE-09 |
| AC-02-01 | FE-09 |
| AC-02-02 | FE-03、FE-09 |
| AC-02-03 | FE-03 |
| AC-02-04 | FE-03 |
| AC-02-05 | FE-03、FE-09 |
| AC-02-06 | FE-03、FE-09 |
| AC-02-07 | FE-09 |
| AC-02-08 | FE-07、FE-09 |
| AC-02-09 | FE-03、FE-09 |
| AC-02-10 | FE-03、FE-09 |
| AC-03-01 | FE-04 |
| AC-03-02 | FE-04 |
| AC-03-03 | FE-04、FE-09 |
| AC-03-04 | FE-04、FE-11 |
| AC-03-05 | FE-07、FE-11 |
| AC-03-06 | CT-02、CT-23、FE-04 |
| AC-03-07 | CT-01、CT-02、CT-23 |
| AC-03-08 | CT-01、CT-02、CT-23 |
| AC-03-09 | CT-02、CT-03、CT-23 |
| AC-04-01 | FE-10 |
| AC-04-02 | FE-10 |
| AC-04-03 | FE-10 |
| AC-04-04 | FE-02、FE-10 |
| AC-04-05 | FE-07 |
| AC-04-06 | FE-04、FE-10 |
| AC-04-07 | FE-04、FE-07、FE-10 |
| AC-04-08 | FE-04、FE-11 |
| AC-04-09 | FE-02、FE-18 |
| AC-05-01 | CT-18、FE-10 |
| AC-05-02 | CT-18、FE-04、FE-10 |
| AC-05-03 | CT-18、FE-10 |
| AC-05-04 | FE-04、FE-10 |
| AC-05-05 | CT-18、FE-10 |
| AC-06-01 | CT-03～CT-17、FE-11 |
| AC-06-02 | CT-03～CT-17、FE-11 |
| AC-06-03 | FE-11 |
| AC-06-04 | FE-11 |
| AC-06-05 | FE-07、FE-11 |
| AC-06-06 | FE-11 |
| AC-06-07 | CT-01、FE-11 |
| AC-06-08 | CT-10～CT-17、CT-23 |
| AC-07-01 | FE-12 |
| AC-07-02 | FE-12 |
| AC-07-03 | FE-12 |
| AC-07-04 | FE-12 |
| AC-07-05 | FE-12 |
| AC-08-01 | FE-12 |
| AC-08-02 | FE-12 |
| AC-08-03 | FE-05、FE-12 |
| AC-08-04 | FE-05 |
| AC-08-05 | FE-05 |
| AC-08-06 | FE-05、FE-12 |
| AC-08-07 | FE-12 |
| AC-08-08 | FE-12 |
| AC-08-09 | FE-12 |
| AC-08-10 | FE-12 |
| AC-08-11 | FE-12 |
| AC-08-12 | FE-05 |
| AC-08-13 | FE-07、FE-12 |
| AC-08-14 | FE-12 |
| AC-09-01 | FE-13 |
| AC-09-02 | CT-23、FE-05、FE-13 |
| AC-09-03 | FE-13 |
| AC-09-04 | FE-07、FE-13 |
| AC-09-05 | FE-13 |
| AC-09-06 | FE-05、FE-13 |
| AC-09-07 | FE-05、FE-13 |
| AC-10-01 | CT-19、CT-20 |
| AC-10-02 | CT-19、FE-14 |
| AC-11-01 | FE-14 |
| AC-11-02 | CT-19、CT-20、FE-14 |
| AC-11-03 | FE-07、FE-14 |
| AC-11-04 | FE-07、FE-14 |
| AC-11-05 | FE-06、FE-07、FE-14 |
| AC-11-06 | FE-07、FE-14 |
| AC-11-07 | FE-07、FE-14 |
| AC-12-01 | CT-21、FE-15 |
| AC-12-02 | CT-21、FE-15 |
| AC-12-03 | CT-21、FE-15 |
| AC-13-01 | CT-21、FE-15 |
| AC-13-02 | FE-15 |
| AC-13-03 | FE-15 |
| AC-13-04 | FE-15 |
| AC-14-01 | CT-21、FE-15 |
| AC-14-02 | FE-15 |
| AC-15-01 | FE-16 |
| AC-15-02 | CT-22、FE-16 |
| AC-15-03 | FE-16 |
| AC-16-01 | FE-16 |
| AC-16-02 | FE-16 |
| AC-16-03 | CT-22、FE-16 |
| AC-16-04 | FE-16 |
| AC-17-01 | FE-08 |
| AC-17-02 | FE-05、FE-07 |
| AC-17-03 | FE-07 |
| AC-17-04 | FE-05、FE-08 |
| AC-17-05 | FE-05 |
| AC-17-06 | FE-08 |
| AC-18-01 | FE-07 |
| AC-18-02 | FE-06、FE-07 |
| AC-18-03 | FE-07 |
| AC-18-04 | FE-07、FE-10（v0.3：範本注入的 quota 提示，R3-3） |
| AC-18-05 | FE-06、FE-07 |
| AC-18-06 | FE-07、FE-18 |
| AC-24-01 | FE-06、FE-08 |
| AC-24-02 | FE-06 |
| AC-24-03 | FE-07、FE-08 |
| AC-24-04 | FE-07、FE-08 |
| AC-24-05 | FE-06、FE-08 |
| AC-24-06 | FE-06、FE-08 |
| AC-24-07 | FE-08、FE-10、FE-11 |
| AC-24-08 | FE-06、FE-08 |
| AC-24-09 | FE-07 |
| AC-23-01 | CT-02、CT-03～CT-17、FE-11 |
| AC-23-02 | CT-02、CT-23、FE-17 |
| AC-23-03 | CT-01、CT-02、CT-03～CT-17、CT-23 |
| AC-23-04 | CT-03～CT-17、CT-18、CT-19、CT-20、CT-21、CT-22 |
| AC-23-05 | CT-02、CT-23 |
| AC-23-06 | FE-01、FE-18 |
| AC-19-01 | FE-01、FE-18 |
| AC-19-02 | FE-18 |
| AC-19-03 | FE-01、FE-18 |
| AC-19-04 | FE-01、FE-18 |
| AC-20-01 | FE-02、FE-18 |
| AC-20-02 | FE-02、FE-18 |
| AC-20-03 | FE-02 |
| AC-21-01 | FE-18 |
| AC-21-02 | FE-12、FE-18 |
| AC-21-03 | FE-12 |
| AC-22-01 | FE-02、FE-18 |
| AC-22-02 | FE-04、FE-11、FE-18 |
| AC-22-03 | FE-12 |
| AC-22-04 | FE-09 |
| AC-22-05 | FE-01、FE-18 |

### 13.1 v0.4 追加對照（PRD v0.8：192 個 AC）

上表（v0.3，141 個 AC）仍有效；下表列出 v0.8 新增的 51 個 AC，以及 v0.8 修改內容或因 R-15 更名受影響的 AC 所**追加**的 v0.4 任務（既有對應任務不重列）。合計 192 個 AC 全部涵蓋，未涵蓋：無。

**新增 AC（51）**

| AC | 任務 |
| :--- | :--- |
| AC-24-10 | FE-22、FE-30（首次還原同規則） |
| AC-24-11 | FE-20、FE-22 |
| AC-25-01 | FE-30、FE-32 |
| AC-25-02 | FE-30、FE-32 |
| AC-25-03 | FE-30、FE-32 |
| AC-25-04 | FE-30、FE-32 |
| AC-25-05 | FE-30、FE-32 |
| AC-25-06 | FE-27、FE-32 |
| AC-25-07 | FE-30、FE-32 |
| AC-25-08 | FE-30、FE-32 |
| AC-25-09 | FE-30、FE-32 |
| AC-25-10 | FE-30、FE-32 |
| AC-25-11 | FE-30、FE-32 |
| AC-26-01 | FE-27 |
| AC-26-02 | FE-27 |
| AC-26-03 | FE-27 |
| AC-26-04 | FE-27 |
| AC-27-01 | FE-20、FE-26 |
| AC-27-02 | FE-26 |
| AC-27-03 | FE-26、FE-33 |
| AC-27-04 | FE-26 |
| AC-27-05 | FE-26 |
| AC-28-01 | FE-21、FE-28 |
| AC-28-02 | FE-28 |
| AC-28-03 | FE-21、FE-28 |
| AC-28-04 | FE-21、FE-28 |
| AC-28-05 | FE-21、FE-28 |
| AC-28-06 | FE-21、FE-28、FE-29 |
| AC-28-07 | FE-28 |
| AC-28-08 | FE-28 |
| AC-29-01 | FE-21、FE-29 |
| AC-29-02 | FE-21、FE-29 |
| AC-29-03 | FE-29 |
| AC-30-01 | FE-31 |
| AC-30-02 | FE-20、FE-31 |
| AC-30-03 | FE-20、FE-25 |
| AC-30-04 | FE-25 |
| AC-30-05 | FE-20、FE-31 |
| AC-30-06 | FE-20、FE-25 |
| AC-30-07 | FE-20、FE-25、FE-31 |
| AC-30-08 | FE-20、FE-31 |
| AC-30-09 | FE-20、FE-22、FE-25 |
| AC-30-10 | FE-20、FE-31 |
| AC-30-11 | FE-20、FE-25 |
| AC-30-12 | FE-22、FE-25 |
| AC-30-13 | FE-20、FE-22、FE-25 |
| AC-30-14 | FE-25 |
| AC-31-01 | FE-21、FE-24 |
| AC-31-02 | FE-24 |
| AC-31-03 | FE-24、FE-28、FE-29、FE-31 |
| AC-31-04 | FE-24、FE-33 |

**v0.8 修改內容的 AC（追加任務）**

| AC | 修改重點 | 追加任務 |
| :--- | :--- | :--- |
| AC-01-01 | 色級按鈕改為卡片；頁名「難易度設定」 | FE-23、FE-27 |
| AC-18-01 | 加入今日已學紀錄與近 30 天歷史 | FE-22、FE-25 |
| AC-18-02 | 首次使用先顯示首次畫面，按「開始學習」後以預設值啟動 | FE-30、FE-32 |
| AC-20-03 | 導覽文字更名；≤ 640px 底部導覽；首次畫面不顯示導覽 | FE-20、FE-23、FE-26、FE-32 |
| AC-22-01 | 量到換頁動畫第一個影格 | FE-24、FE-33 |
| AC-22-05 | 首次使用量到「開始學習」可點擊 | FE-32、FE-33 |
| AC-24-02 | 備份含今日紀錄與歷史 | FE-22 |
| AC-24-06 | 支援版本 1、2 | FE-22 |

**R-15 更名涉及的 AC（行為不變，畫面文字或用語更新；追加 FE-23，以 `naming.test.js` 回歸）**

AC-01-02、AC-01-03、AC-01-06、AC-02-01、AC-02-02、AC-02-03、AC-02-04、AC-02-07、AC-02-09、AC-02-10、AC-03-01、AC-03-04、AC-03-05、AC-04-02、AC-04-04、AC-04-07、AC-04-08、AC-05-01、AC-05-05、AC-06-01、AC-06-06、AC-07-04、AC-08-13、AC-09-01、AC-09-06、AC-10-02、AC-17-01、AC-17-02、AC-17-04、AC-17-06、AC-22-02、AC-22-04、AC-23-01、AC-24-07（另 AC-01-01、AC-18-01、AC-20-03、AC-24-02 見上表）。其中畫面文字實際改變的是 AC-01-01、AC-06-06、AC-10-02、AC-17-01、AC-17-04、AC-17-06、AC-20-03（§7.13）；其餘只是 PRD 的 Given／When 用語改變，程式行為與文字不需修改。

### 13.2 v0.5 追加對照（PRD v0.9：212 個 AC，本版應驗收 196 個）

§13、§13.1 仍有效；下表列出 v0.9 新增的 20 個 AC，以及 v0.9 修改內容的 AC 所**追加**的 v0.5 任務。**本版應驗收的 196 個 AC 全部涵蓋，未涵蓋：無。**

**新增 AC（20）**

| AC | 任務 | 設計位置 |
| :--- | :--- | :--- |
| AC-20-04 | FE-34、FE-37、FE-38、FE-41 | §7.16 |
| AC-32-01 | FE-34、FE-37、FE-40 | §7.15 |
| AC-32-02 | FE-34、FE-37、FE-40 | §7.15 |
| AC-32-03 | FE-34、FE-37 | §7.15 |
| AC-32-04 | FE-37、FE-40 | §7.15、§4.3 |
| AC-32-05 | FE-34、FE-37 | §7.15 |
| AC-32-06 | FE-34、FE-37 | §7.15 |
| AC-32-07 | FE-34、FE-37 | §7.15 |
| AC-32-08 | FE-37、FE-40 | §4.3 |
| AC-32-09 | FE-37 | §7.15 |
| AC-32-10 | FE-34、FE-37 | §7.15 |
| AC-32-11 | FE-37、FE-40 | §7.15「原子性」 |
| AC-33-01 | FE-36、FE-39、FE-41（V-MIC-1 人工） | §7.14、§10.2 |
| AC-33-02 | FE-36、FE-39、FE-41（V-MIC-2 人工） | §7.14、§10.2 |
| AC-33-03 | FE-35、FE-36、FE-39 | §7.14 |
| AC-33-04 | FE-35、FE-36 | §7.14 常數表 |
| AC-33-05 | FE-36、FE-39 | §7.14 錯誤對照 |
| AC-33-06 | FE-36、FE-39 | §7.14 錯誤對照 |
| AC-33-07 | FE-36、FE-39 | §7.14 錯誤對照 |
| AC-33-08 | FE-39 | §7.11 A-5、A-6 |

**v0.9 修改內容的 AC（追加任務）**

| AC | 修改重點 | 追加任務 |
| :--- | :--- | :--- |
| AC-01-02 | 無學習紀錄才直接套用 | FE-37、FE-40 |
| AC-01-07 | 綠 → 藍、金不跳視窗 | FE-34、FE-37 |
| AC-03-05 | 確定後回第 1 張；取消維持第 k 張 | FE-37、FE-40 |
| AC-08-01 | 聆聽中收音條點亮 | FE-39 |
| AC-08-02 | 不支援時不呼叫 `getUserMedia`、收音條全暗 | FE-39 |
| AC-08-09 | `getUserMedia` 權限路徑 | FE-36、FE-39 |
| AC-08-13 | 說明文字加收音條與使用中圖示 | FE-39 |
| AC-08-14 | 斷網時收音條全暗、不取麥克風 | FE-39 |
| AC-11-07 | 累計只在初始化時歸 0 | FE-37 |
| AC-17-02 | 初始化後打卡從 0、下次學習為 1 | FE-37 |
| AC-17-06 | 主控台 3 個模組入口 + 資料來源 | FE-38 |
| AC-19-02 | 模組四、五不驗收；收音條斷網不影響 | FE-39、FE-41 |
| AC-20-03 | 導覽恰 4 項 | FE-34、FE-38 |
| AC-21-03 | 允許 `getUserMedia` 只讀音量；禁止 `MediaRecorder` | FE-36、FE-39、FE-41 |
| AC-25-02 | 首次「開始學習」不跳視窗 | FE-37、FE-40 |
| AC-25-06 | 一般頁「套用」依 US-32 判斷 | FE-40 |
| AC-26-02 | 點卡片不跳視窗 | FE-40 |
| AC-27-01 | 底部導覽 4 項 | FE-34、FE-38 |
| AC-27-02 | 4 項時觸控尺寸（間接影響） | FE-38 |
| AC-27-04 | 寬螢幕導覽 4 項 | FE-38 |
| AC-30-06 | 刪除自訂字不回扣；初始化清空 | FE-37 |
| AC-31-03 | 聆聽中不閃爍、收音條無漸變、確認視窗無淡入 | FE-39、FE-40 |
| AC-20-01 | 4 種寬度無水平捲軸（導覽變動後回歸） | FE-41 |

**v0.9 暫停（隱藏）的 16 個 AC**：AC-12-01～03、AC-13-01～04、AC-14-01～02、AC-15-01～03、AC-16-01～04——**本版不驗收**；程式由既有 FE-15、FE-16 保留、資料由既有 CT-21、CT-22 保留，v0.5 不改、不刪（HT-5）。AC-23-04（原創標示，含長難句與句型）**仍驗收**，由既有對照任務涵蓋，FE-41 另確認兩份資料仍在產物中。QA 測試計畫應列為「不適用（v0.9 暫停）」。

### 13.3 v0.6 追加對照（PRD v0.10：214 個 AC，本版應驗收 192 個）

§13、§13.1、§13.2 仍有效；下表列出 v0.10 新增的 2 個 AC，以及 v0.10 改寫的 AC 所**追加**的 v0.6 任務。**本版應驗收的 192 個 AC 全部涵蓋，未涵蓋：無。**

**新增 AC（2）**

| AC | 任務 | 設計位置 |
| :--- | :--- | :--- |
| AC-26-05 | FE-43、FE-44 | §7.17「分數區隱藏」「卡片分數範圍」「狀態列目標分數」「主控台目標分數」 |
| AC-26-06 | FE-42、FE-43 | §7.17 資料流、§4.3 v0.6、GS-3～GS-5 |

**v0.10 改寫的 AC（追加任務）**

| AC | 改寫重點 | 追加任務 |
| :--- | :--- | :--- |
| AC-01-01 | 卡片不顯示分數範圍 | FE-43 |
| AC-01-03 | 只點卡片未套用 | FE-42、FE-43 |
| AC-01-04 | 棕套用後 localStorage 465 | FE-42 |
| AC-01-05 | 點卡片一律該色上限（300、600 → 725） | FE-42、FE-43 |
| AC-01-07 | 藍 855、金 990 | FE-42、FE-43 |
| AC-02-03 | 依點選卡片取每日新字量 | FE-43 |
| AC-02-04 | 點 5 色後套用 215～990 | FE-42、FE-43 |
| AC-02-05、AC-02-06 | 由點卡片觸發試算（算式不變） | FE-43 |
| AC-02-08 | 藍套用後重新載入 855 | FE-42 |
| AC-02-10 | 點藍金試算 | FE-42、FE-43 |
| AC-17-06 | 主控台不顯示目標分數 | FE-43 |
| AC-18-02 | 預設 725、不顯示 | FE-42、FE-43 |
| AC-20-02 | 滑桿不在檢查範圍 | FE-43、FE-44 |
| AC-22-04 | 量測點改為點卡片 | FE-43、FE-44 |
| AC-25-01 | 首次畫面不顯示分數輸入、預設 725 | FE-42、FE-43、FE-44 |
| AC-25-02 | 點棕後開始學習 465；主控台無目標分數 | FE-42、FE-43 |
| AC-25-03 | 點藍後開始學習 855 | FE-42、FE-43 |
| AC-25-04 | 首次重新整理回 725 | FE-42 |
| AC-25-10 | 還原後分數 300 不轉換、選中棕 | FE-42、FE-43 |
| AC-26-01 | 卡片不顯示分數範圍 | FE-43 |
| AC-26-02 | 300 點綠 → 725 | FE-42、FE-43 |
| AC-26-04 | 點藍金 855／990 | FE-42、FE-43 |
| AC-30-02 | 套用藍色卡片時 D = 15（用語改寫，行為不變） | FE-42（回歸） |
| AC-32-01 | 點棕後套用跳視窗 | FE-42、FE-43 |
| AC-32-02 | 確定後 465 | FE-42、FE-43 |
| AC-32-04 | 取消後卡片回綠、分數仍 600 | FE-42、FE-43 |
| AC-32-05 | 600 → 點綠 725 → 藍 855 → 金 990 → 綠 725 皆不跳視窗 | FE-42 |
| AC-32-06 | 預設 725 後點棕不跳視窗 | FE-42 |
| AC-32-07 | 6 種狀態點棕皆跳視窗 | FE-42 |

**v0.10 暫停（分數輸入隱藏）的 6 個 AC**：AC-01-06、AC-02-01、AC-02-02、AC-02-07、AC-02-09、AC-26-03——**本版不驗收**；相關程式（`parseScoreInput`、`normalizeScore`、`setDraftScore`、customizer 的滑桿／輸入框 handler）保留但無畫面路徑（§7.17）。AC-02-07 的 100ms 要求由 AC-22-04 承接。連同 v0.9 暫停的 16 個，共 22 個；QA 測試計畫應列為「不適用（v0.10 暫停）」。

### 13.4 v0.7 追加對照（PRD v0.11：243 個 AC，本版應驗收 221 個）

§13～§13.3 仍有效；下表列出 v0.11 新增的 29 個 AC，以及 v0.11 修改的 5 個 AC 所**追加**的 v0.7 任務。**本版應驗收的 221 個 AC 全部涵蓋，未涵蓋：無。**「人工」= 需人類實機或正式網址（§10.4 V-PWA-H1～H5），任務只負責實作與可自動化的部分。

**新增 AC（29）**

| AC | 任務 | 設計位置 | 驗收方式 |
| :--- | :--- | :--- | :--- |
| AC-24-12 | FE-45、FE-51、FE-53 | §4.7 dashboard、§7.18.7 | 單元＋E2E（`file://` 與 (b)） |
| AC-34-01 | FE-45、FE-47、FE-48、FE-53 | §5.1 B-13、§7.18.4 | 單元＋E2E (b)＋人工 H1 |
| AC-34-02 | FE-45、FE-47、FE-48、FE-53 | MF、§7.18.4 | 人工 H1、H2 |
| AC-34-03 | FE-47、FE-53（MC-02 產圖） | §5.1 B-11 (3) | 建置檢查 (a)(b)＋人工 H1、H2 |
| AC-34-04 | FE-47、FE-50、FE-53 | §5.1 B-11 (4)、B-12、§9 v0.7 | 單元＋E2E |
| AC-34-05 | FE-47、FE-48、FE-50、FE-53 | HD-1、HD-2、T-47 | 人工 H3（iOS） |
| AC-34-06 | FE-48、FE-51、FE-53 | PE-3、§7.18.6 | 單元＋E2E |
| AC-34-07 | FE-45、FE-48、FE-49、FE-51、FE-53 | IN-1、§7.18.6、§7.18.7 | 單元＋E2E（替身事件） |
| AC-34-08 | FE-45、FE-48、FE-51、FE-53 | IN-1、IN-2、PE-2 | 單元＋E2E |
| AC-34-09 | FE-48、FE-49、FE-51 | IN-5、§7.18.6 | 單元＋E2E |
| AC-34-10 | FE-48、FE-51 | IN-7 | 單元（再次觸發事件）＋人工 |
| AC-35-01 | FE-46、FE-47、FE-48、FE-53 | SW-1、SW-4、§7.18.3 | 單元＋E2E (b) |
| AC-35-02 | FE-46、FE-53 | SW-6、§7.18.3 | E2E (b) |
| AC-35-03 | FE-46、FE-53 | 同上 | 人工 H2 |
| AC-35-04 | FE-48、FE-53 | PE-4（`load` 後註冊） | E2E (b) 量測 |
| AC-35-05 | FE-46、FE-48、FE-53 | SW-4、PE-3、T-52 | 單元＋E2E (b) |
| AC-36-01 | FE-47、FE-53 | §5.1 B-14、§7.18.2 | 單元（V-PWA-06） |
| AC-36-02 | FE-47、FE-50、FE-53 | B-14、B-15、HD-1 | 單元＋E2E |
| AC-36-03 | FE-45、FE-46、FE-48、FE-49、FE-50、FE-53 | §7.18.5、§7.18.7 | 單元＋E2E (b)＋人工 H5 |
| AC-36-04 | FE-48、FE-49、FE-53 | UP-8、PV-1 | 單元＋E2E |
| AC-36-05 | FE-46、FE-53 | SW-5、SW-9 | 單元＋E2E (b) |
| AC-36-06 | FE-46、FE-48、FE-53 | UP-9 | 單元＋E2E (b) |
| AC-36-07 | FE-47、FE-53（MC-01、MC-03） | §5.1 B-16、§5.2 | 單元＋人工 H4 |
| AC-37-01 | FE-45、FE-47、FE-48、FE-50、FE-53 | PE-1、PE-2、HD-3、B-7 | 單元＋E2E `file://` |
| AC-37-02 | FE-45、FE-48、FE-53 | 同上 | E2E `file://` |
| AC-37-03 | FE-48、FE-53 | PE-3 | 單元＋E2E (b) 404 |
| AC-37-04 | FE-45、FE-48 | PE-1 | 單元（V-PWA-08）＋E2E |
| AC-37-05 | FE-46、FE-47、FE-48、FE-50、FE-53 | SW-6、SW-10、HD-4、§7.18.8 | 單元＋E2E (b) |
| AC-37-06 | FE-48、FE-49、FE-53 | PV-1、§4.3 v0.7 | 單元＋E2E |

**v0.11 修改的 AC（追加任務）**

| AC | 修改重點 | 追加任務 |
| :--- | :--- | :--- |
| AC-19-01 | 允許同目錄相對路徑的 PWA 附屬檔；`file://` 不得產生請求 | FE-47（B-7 白名單、HD-3）、FE-53 |
| AC-21-01 | https 版只允許同源 GET | FE-48、FE-50（HD-4 `data:,` favicon）、FE-53 |
| AC-21-03 | Cache Storage 只含 PWA 靜態檔 | FE-46、FE-48、FE-53 |
| AC-23-02 | 資料來源頁加品牌標識聲明 | FE-52 |
| AC-23-06 | HTML 開頭註解加品牌標識聲明 | FE-47（`license-header.txt`）、FE-53 |

### 13.5 v0.8 追加對照（PRD v0.12：270 個 AC，本版應驗收 248 個）

§13～§13.4 仍有效；下表列出 v0.12 新增的 27 個 AC，以及 v0.12 修改的 30 個 AC 所**追加**的 v0.8 任務。**本版應驗收的 248 個 AC 全部涵蓋，未涵蓋：無。**暫停的 22 個 AC 不變。「單元」「E2E」見 §10.5。

**新增 AC（27）**

| AC | 任務 | 設計位置 | 驗收方式 |
| :--- | :--- | :--- | :--- |
| AC-38-01 | FE-56、FE-57、FE-58、FE-59、FE-61、FE-62 | §7.19.1、§7.19.3（T-55） | 單元（`tokens.test.js` 掃描）＋E2E 計算後樣式 |
| AC-38-02 | FE-56、FE-62 | §7.19.1、§7.19.9 | 單元＋E2E |
| AC-38-03 | FE-56、FE-57、FE-58、FE-59、FE-61、FE-62 | §7.19.1 | 單元（變數值）＋E2E 兩版對照 |
| AC-38-04 | FE-56、FE-57、FE-58、FE-59、FE-60、FE-61、FE-62 | §7.19.1、§7.19.5 鎖定列 | 單元（token 對比）＋E2E 工具量測 |
| AC-38-05 | FE-56、FE-62 | §7.19.3 | 單元（原始碼）＋E2E（尺寸、請求 0） |
| AC-38-06 | FE-56、FE-57、FE-58、FE-60、FE-61、FE-62 | §7.19.2 | 單元（CSS 規則）＋E2E |
| AC-38-07 | FE-56、FE-57、FE-58、FE-59、FE-61、FE-62 | §7.19.2、各頁 | 單元＋E2E |
| AC-38-08 | FE-59、FE-62 | §7.19.7 | E2E 兩版結構對照＋截圖 |
| AC-38-09 | FE-56、FE-57、FE-58、FE-61、FE-62 | §7.19.10 | E2E 鍵盤與減少動態 |
| AC-38-10 | CT-24、FE-56、FE-60、FE-62 | §7.19.8 | 單元＋資料驗證＋E2E（v0.11 資料與備份） |
| AC-39-01 | FE-58、FE-62 | §7.19.4 | 單元（假 DOM 順序）＋E2E 座標 |
| AC-39-02 | FE-58、FE-62 | §7.19.4 | 單元＋E2E |
| AC-39-03 | FE-58、FE-62 | §7.19.4、T-65 | 單元（`data-go`）＋E2E 時間 |
| AC-39-04 | FE-54、FE-58 | §4.8 `goalLine`、DB-4 | 單元 5 色 |
| AC-39-05 | FE-58 | §7.19.4 | 單元＋E2E |
| AC-39-06 | FE-58 | §7.19.4 | 單元（文字計數） |
| AC-39-07 | FE-54、FE-58、FE-62 | §7.19.4 | 單元＋E2E 高度 |
| AC-39-08 | FE-55、FE-58、FE-62 | §4.8 store、§7.19.4 | 單元（V-LAY-07）＋E2E |
| AC-39-09 | FE-58、FE-62 | §7.19.4 首屏預算 | E2E 6 種尺寸 |
| AC-39-10 | FE-58、FE-62 | §7.19.4 | E2E 寬度 |
| AC-40-01 | FE-54、FE-61、FE-62 | §7.19.6 | 單元＋E2E |
| AC-40-02 | FE-61、FE-62 | §7.19.6 | E2E 寬度 |
| AC-40-03 | FE-61、FE-62 | §7.19.6 | 既有 part5 單元＋E2E 回歸 |
| AC-41-01 | FE-57、FE-62 | §7.19.5 | 單元（假 DOM）＋E2E |
| AC-41-02 | FE-54、FE-57、FE-62 | §7.19.5、FT-4 | 單元 5 色＋E2E |
| AC-41-03 | FE-57、FE-62 | §7.19.5 | E2E 7 種尺寸截圖 |
| AC-41-04 | FE-57、FE-62 | §7.19.5 | E2E 捲動、Toast、Tab |

**v0.12 修改的 AC（30，追加任務）**

| AC | 修改重點 | 追加任務 |
| :--- | :--- | :--- |
| AC-01-01 | 精簡列表、說明行只 1 次、藍金無字數 | FE-57 |
| AC-01-02 | 主控台以目標行顯示 | FE-57、FE-58 |
| AC-01-07 | 目標行「目標藍級・生效綠級（內建上限）」 | FE-54、FE-58 |
| AC-17-01 | 3 格數據、「已掌握 N 字」 | FE-58 |
| AC-17-06 | 目標行取代兩欄、移除功能入口 | FE-58 |
| AC-22-05 | 量測點改為「開始今日學習」 | FE-58、FE-62 |
| AC-23-02 | 主控台本體無入口（只在頁尾） | FE-58、FE-62 |
| AC-24-01 | 先展開「資料備份」 | FE-55、FE-58 |
| AC-24-10 | 近 7 天空狀態 | FE-58 |
| AC-24-12 | 收合規則 | FE-58 |
| AC-25-01 | 首次畫面標題、摘要行 | FE-57 |
| AC-25-02、AC-25-03 | 主控台目標行文字 | FE-54、FE-57、FE-58 |
| AC-25-06 | 由目標行「變更」進入 | FE-58 |
| AC-25-10 | 目標行顯示「棕級」 | FE-58 |
| AC-26-01 | 精簡色級列 | FE-57 |
| AC-26-06 | 主控台目標行對應 | FE-57、FE-58 |
| AC-30-01 | 3 格數據取代小環形圖 | FE-58 |
| AC-30-10 | 數字顯示、「已掌握 N 字」 | FE-58 |
| AC-30-12 | 近 7 天空狀態 | FE-58 |
| AC-32-02 | 初始化後的主控台顯示 | FE-58 |
| AC-33-02 | 刪除「主控台入口」字樣（行為不變） | FE-58（入口已移除）、FE-62 |
| AC-34-01、AC-34-02 | `<title>` 統一為 EnglishContext | FE-56、FE-62 |
| AC-34-03、AC-34-05 | 只改判定文字（安全圓、載入後元素），實作不變 | FE-62（回歸） |
| AC-34-07、AC-34-08 | 安裝按鈕隨收合區塊 | FE-58 |
| AC-35-04 | 量測點改為「開始今日學習」 | FE-58、FE-62 |
| AC-36-01 | 補註只改註解不觸發更新（實作不變） | FE-62（回歸） |

另：AC-34-04（未改寫，值隨 AC-38-02 改變）追加 FE-56、FE-62。

### 13.6 v0.9 追加對照（PRD v0.14：278 個 AC，本版應驗收 251 個）

§13～§13.5 仍有效；PRD v0.13 只改寫 AC-38-01（標題列圖示例外，程式不變，FE-56 已符合，SD-FB-39 結案）。下表列出 v0.14 新增的 8 個 AC、修改的 13 個 AC 所**追加**的 v0.9 任務。**本版應驗收的 251 個 AC 全部涵蓋，未涵蓋：無。**暫停 27 條（v0.13 的 22 條 + AC-05-01～AC-05-05）。「單元」「E2E」見 §10.6。

**新增 AC（8）**

| AC | 任務 | 設計位置 | 驗收方式 |
| :--- | :--- | :--- | :--- |
| AC-01-08 | FE-65、FE-67、FE-69 | §4.9、§7.20.3 | 單元（`layout.test.js`、`customizer.test.js`）＋E2E 兩種寬度 |
| AC-42-01 | FE-63、FE-64、FE-69 | §5.4、§7.20.1 | 單元（`version.test.js`、`version-line.test.js`）＋E2E 6 個畫面、兩種形態、兩種寬度 |
| AC-42-02 | FE-63、FE-64、FE-69 | §5.4、§7.20.1 | 單元（`build.test.js` V-VER-01、V-VER-06）＋產物比對 |
| AC-42-03 | FE-64、FE-69 | §7.20.1 | 單元（原始碼掃描）＋E2E Network、localStorage、備份 |
| AC-42-04 | FE-63、FE-69 | §5.4 | 單元（`build.test.js` 三情境）＋實際建置 2 次與 1.0.1 情境 |
| AC-43-01 | FE-68、FE-69 | §7.20.2 | 單元（屬性）＋E2E 計算後樣式、Tab |
| AC-43-02 | FE-68、FE-69 | §7.20.2（DS-27 文字） | 單元（可見文字掃描、空狀態逐字）＋E2E 全畫面搜尋 |
| AC-43-03 | FE-68、FE-69 | §7.20.2 | 單元（HT-9 狀態與匯出）＋E2E 以 v0.13 資料開啟 |

**v0.14 修改的 AC（13，追加任務）**

| AC | 修改重點 | 追加任務 |
| :--- | :--- | :--- |
| AC-01-02 | 狀態列「目前色級：綠」；目標行改按鈕 | FE-65、FE-66、FE-67 |
| AC-01-06（暫停中） | 只改字，不驗收 | —（暫停） |
| AC-01-07 | 狀態列與目標行只顯示綠、不加註記 | FE-65、FE-66、FE-67 |
| AC-17-06 | 目標行只顯示生效色級 | FE-65、FE-66 |
| AC-22-02 | 最大單字集改以 30 個自訂單字建立 | FE-68（表單照常）、FE-69（回歸量測） |
| AC-25-02、AC-25-03 | 目標行文字與「變更」按鈕；AC-25-03 狀態列 | FE-65、FE-66、FE-67 |
| AC-25-06 | 不顯示範本區、狀態列一行 | FE-67、FE-68 |
| AC-26-06 | 狀態列序列、目標行 | FE-65、FE-66、FE-67 |
| AC-32-05 | 狀態列皆為「目前色級：綠」 | FE-67 |
| AC-36-02 | 畫面只顯示 BUILD_ID 前 7 碼 | FE-63、FE-64、FE-69 |
| AC-39-04 | 只顯示生效色級、無「・」、「變更」外框按鈕 | FE-65、FE-66、FE-69 |
| AC-41-04 | 頁面最後元素含版本行 | FE-64、FE-69 |

**暫停（5，新增）**：AC-05-01～AC-05-05 → 不驗收；程式與資料保留（HT-8），由 AC-43-01、AC-43-03 取代驗證。

**回歸**：AC-04-01～AC-04-09（自訂單字表單與清單）、AC-06-06（單字卡空狀態仍引導）、AC-23-01（自訂單字標示「自訂擴充」）、AC-23-02（頁尾連結位置與行為不變）、AC-27-03（底部導覽不遮版本行）、AC-36-01、AC-36-03（只改版本號即觸發更新）由 FE-68、FE-64、FE-63、FE-69 的既有與新增測試涵蓋。

### 13.7 v0.10 追加對照（PRD v0.15：314 個 AC，本版應驗收 287 個）

§13～§13.6 仍有效。下表列出 v0.15 新增的 36 個 AC、修改的 4 個 AC、依 C-8 改讀的 8 個 AC 所**追加**的 v0.10 任務。**本版應驗收的 287 個 AC 全部涵蓋，未涵蓋：無。**暫停仍為 27 條（不變）。「單元」「E2E」見 §10.7。

**新增 AC（36）**

| AC | 任務 | 設計位置 | 驗收方式 |
| :--- | :--- | :--- | :--- |
| AC-44-01 | FE-71、FE-74、FE-76 | §7.21.2 | 單元（`position.test.js`、`store-track.test.js`）＋E2E 兩種進入方式、≤ 100 ms |
| AC-44-02 | FE-74、FE-76 | §7.21.2 | 單元（每次換卡 1 次 `setItem`、效能）＋E2E |
| AC-44-03 | FE-74 | §7.21.2（FP-7） | 單元＋E2E |
| AC-44-04 | FE-71、FE-74 | §7.21.2 | 單元（以字找回）＋E2E |
| AC-44-05 | FE-71、FE-74 | §7.21.2 | 單元（min(i, N)、刪最後一張）＋E2E DevTools |
| AC-44-06 | FE-71、FE-73、FE-74 | §7.21.1（RD-3）、§7.21.2 | 單元（`migrate-v3.test.js` 矩陣）＋E2E |
| AC-44-07 | FE-71、FE-74 | §7.21.2 | 單元（N = 0 紀錄不動） |
| AC-44-08 | FE-73、FE-74 | §7.21.2（FP-4） | 單元（`reinit.test.js`、`store-track.test.js`）＋E2E |
| AC-44-09 | FE-74 | §7.21.2（FP-1） | 單元（reload 為 card 模式正面）＋E2E |
| AC-44-10 | FE-74 | §7.21.5 | 單元（quota、unavailable）＋E2E |
| AC-45-01 | FE-72、FE-74、FE-75 | §7.21.3、§7.21.4 | 單元＋E2E ≤ 100 ms |
| AC-45-02 | FE-72、FE-74、FE-75 | §7.21.3 | 單元 |
| AC-45-03 | FE-72、FE-74 | §7.21.3 | 單元（`part5flow.test.js`、`store-track.test.js`） |
| AC-45-04 | FE-75 | §7.21.4 | 單元（假 DOM、CSS 掃描）＋E2E 對比、375px |
| AC-45-05 | FE-72、FE-75 | §7.21.4 | 單元（K = 0／37／Q 文字、三種畫面各 1 次）＋E2E 重疊檢查 |
| AC-45-06 | FE-74、FE-75 | §7.21.3（CR-5） | 單元（與 v0.14 序列比對）＋E2E |
| AC-45-07 | FE-72、FE-73、FE-75、CT-25 | §7.21.1、§7.21.3、§7.21.6 | 單元（`countCorrect`、IM-10 保留）＋E2E DevTools；CT-25 防止 id 改號 |
| AC-45-08 | FE-73、FE-74、FE-75 | §7.21.3（CI-4、CI-8） | 單元＋E2E |
| AC-46-01 | FE-75 | §7.21.4 | 單元（`change`、Enter、CSS 44px）＋E2E 鍵盤、觸控、減少動態 |
| AC-46-02 | FE-72、FE-74、FE-75 | §7.21.3（UO-2） | 單元＋E2E |
| AC-46-03 | FE-72、FE-74、FE-75 | §7.21.3（UO-5） | 單元＋E2E ≤ 100 ms |
| AC-46-04 | FE-72、FE-73、FE-74、FE-75 | §7.21.3（UO-4 三個呼叫點） | 單元（含隨機不變式）＋E2E reload、匯入 |
| AC-46-05 | FE-72、FE-74 | §7.21.3（UO-5、UO-6） | 單元＋E2E |
| AC-46-06 | FE-72、FE-75 | §7.21.3（UO-3）、§7.21.4 | 單元（三種進入路徑）＋E2E |
| AC-46-07 | FE-72、FE-74、FE-75 | §7.21.3（UO-7） | 單元＋E2E |
| AC-46-08 | FE-72、FE-74、FE-75 | §7.21.3（CR-6）、§7.21.4 對話框文字 | 單元（對話框參數、取消 0 次）＋E2E |
| AC-46-09 | FE-72、FE-74 | §7.21.3（UO-8） | 單元＋E2E |
| AC-46-10 | FE-73、FE-74、FE-75 | §7.21.1、§7.21.3 | 單元（匯出 → 匯入）＋E2E 三情境 |
| AC-47-01 | FE-73、FE-74 | §7.21.1 | 單元＋E2E DevTools |
| AC-47-02 | FE-73、FE-74 | §7.21.1 | 單元（首次還原、主控台匯入）＋E2E |
| AC-47-03 | FE-70、FE-73 | §7.21.1 | 單元（v0.14、v0.7 樣本）＋E2E 以 v0.14 交付檔匯出 |
| AC-47-04 | FE-70、FE-73、FE-74 | §7.21.1 | 單元（樣本、冪等）＋E2E 以 v0.14 交付檔寫入 |
| AC-47-05 | FE-71、FE-72、FE-73 | §7.21.1（RD-3） | 單元矩陣＋E2E |
| AC-47-06 | FE-73、FE-74 | §7.21.1（IM-9、IM-10） | 單元矩陣＋E2E |
| AC-47-07 | FE-74 | §7.21.5 | 單元＋E2E |
| AC-47-08 | FE-75、FE-76 | §7.21.8 | 單元（原始碼掃描）＋E2E Network、大小 |

**v0.15 修改的 AC（4，追加任務）**

| AC | 修改重點 | 追加任務 |
| :--- | :--- | :--- |
| AC-18-01 | 另含位置、答對紀錄、開關的保存 | FE-73、FE-74、FE-76 |
| AC-24-02 | 備份含 3 項新資料 | FE-73 |
| AC-32-02 | 初始化另清除答對紀錄、「已答對 0 / Q 題」 | FE-73、FE-74、FE-75 |
| AC-42-02 | 本次發布版本 1.1.0 | MC-04、FE-76 |

**依 C-8 改讀的 AC（8，追加任務）**：AC-01-08、AC-26-06、AC-32-10、AC-36-04、AC-37-06、AC-38-10、AC-42-03、AC-43-03 → FE-73（單元測試的 `schemaVersion`、欄位數斷言改為目前版本）、FE-76（整合回歸）；QA E2E 依 SD-FB-57 更新。

**回歸**：AC-03-05（套用不同色級回到第 1 張，FB-54 只影響同生效色級）、AC-04-08（刪除後定位改經 FP-2，等價性見 §7.21.2）、AC-11-01～AC-11-07、AC-40-01（開關關閉時與 v0.14 相同）、AC-17-02、AC-17-04、AC-30-04、AC-30-14（共用提示旗標）、AC-18-03～AC-18-05、AC-24-03～AC-24-11、AC-25-05、AC-25-10、AC-30-12、AC-30-13、AC-32-01～AC-32-11 由 FE-73、FE-74、FE-75 的既有與新增測試涵蓋。

### 13.8 v0.11 追加對照（PRD v0.16：315 個 AC，本版應驗收 288 個）

**新增 AC（1）**

| AC | 任務 | 設計 | 驗證 |
| :--- | :--- | :--- | :--- |
| AC-23-07 | FE-77 | §7.22.2 | 單元（`sources-page.test.js`、`contact-static.test.js`）＋ `dist/` 字串檢查＋375px 量測（FE-77 無頭瀏覽器或主控 H-2、H-3） |

**v0.16 修改的 AC（2，追加任務）**

| AC | 修改重點 | 追加任務 | 驗證 |
| :--- | :--- | :--- | :--- |
| AC-36-03 | 提示「有新版本，請更新版本」、按鈕「更新版本」，行為不變 | FE-77 | 單元（`pwa-core.test.js`、`pwa-notice.test.js`、`contact-static.test.js`）；行為沿用 FE-48、FE-50 既有測試；https 目視為主控 H-4 |
| AC-42-04 | (b) 情境出現的提示文字同上；建置規則不變 | FE-77 | 兩次 `npm run build` SHA-256 相同、產物含新文字；(b)(c) 情境沿用 `build.test.js` V-VER-02 既有案例 |

**邊界情況**：E-118（點擊、Tab 無動作）、E-119（375px 1 行、放大可換行）→ FE-77 單元與量測；E-120（舊版頁面顯示舊文字）屬預期，不需任務。

**回歸**：AC-23-02（聲明 4 條與原創內容來源不變）、AC-36-01、AC-36-02、AC-36-07（兩份 HTML 相同，BUG-004）、AC-19-01、AC-21-01 (a)（無新增請求）、AC-27-03（不被底部導覽遮住）、AC-38-01、AC-38-04 由 FE-77 的既有與新增測試、建置檢查涵蓋。其餘 287 個應驗收 AC 的對照與 §13～§13.7 相同；**288 個應驗收 AC 全部至少有 1 個任務涵蓋**。

---

## 14. 回應契約 §9 指名 SD 的回饋

| FB | 回應 | 落實位置 |
| :--- | :--- | :--- |
| FB-04（已解除） | 確認 `sources/ecdict/` 6 個檔案到位；不列前置任務，CT-01、CT-02、CT-03～CT-17 直接列為輸入 | tasks.json 各 CT 的 description |
| FB-05（剩餘待辦） | CT-01 的 `lib.mjs` 依 C-2、V-IN-01～07 實作排名；CT-02 重算並在紀錄回報 `N_B`、`N_G`、各區段，不一致即 `blocked` | §8.1、T-06、CT-02 |
| FB-10（已解除，SD 待辦） | 釋義精簡、M-3 人工修正、音標原創納入每個批次任務；V-VOC-18 抽樣比例與門檻已訂 | §8.3、§8.4 |
| FB-14 | 依排名區間拆 15 個批次（350～409 筆），邊界對齊 `N_B`；每批 10% 自查、QA 每分檔 5%（至少 20 筆）抽查、> 5% 整批退回 | §8.1、§8.4 |
| FB-17 | 估算預期 3.1 MB、悲觀 3.8 MB，低於 5 MB；**不需修訂契約**。建置時壓縮 JSON；4.5 MiB 警告門檻與 B-9 備援壓縮（執行期介面不變） | §5、§6 |
| FB-20 | 「資料來源與授權」頁**不顯示官網字數**；只顯示「本系統收錄 `includedItemCount` 字」（字表）與 ECDICT「提供釋義 `includedItemCount` 筆」，避免與官網字數對照造成困惑。`originalItemCount` 僅保留在資料中供 QA | FE-17 |
| FB-21 | 「資料來源與授權」頁 ECDICT 區塊以 `<details>` 可摺疊顯示 `copyrightNotice` 與 `licenseText` 全文（純文字、保留換行、`white-space: pre-wrap`）；並以固定文字顯示「音標改寫為美式 IPA，標為原創，不屬 ECDICT」（L-4） | FE-17 |
| FB-22 | 上下文用詞以簡體原檔判斷，工具自動列出清單；工作量已納入批次任務 | §8.2 W-3、§8.4 H-6、T-03 |
| FB-16（R-11，知會） | 依現行 AC-06-07：內建單字學術情境空白時隱藏整欄；自訂單字未填的選填欄位顯示「—」（與 Q-20 決議一致）。不自行統一 | FE-11 |
| FB-06（知會） | 表單「論文例句」存入 `example`，卡背「完整例句」顯示；自訂單字 `academicContext` 恆空 → 依上列顯示「—」 | FE-10、FE-11 |
| FB-32（v0.4） | `todayLearned.wordKeys` 不設上限：極端情況整筆狀態約 400 K 字元（≈ 0.8 MB，UTF-16），遠低於 5 MB；每次學習事件寫入最壞約 20 ms（4 倍降速），不做延遲寫入。**結案，不需修訂契約** | §6.1、T-27 |
| DS-01（v0.5） | 門檻 T1～T5 = −50、−40、−30、−20、−10 dBFS 記為架構常數 `core/meter.js` `THRESHOLDS_DBFS`（唯一來源）；音量 = 最近一個 ≤ 100 ms 分析視窗（`fftSizeFor`，48 kHz 時 42.7 ms）的 RMS，dBFS = 20 × log10(RMS)，RMS = 0 全暗；≥ Tn 點亮第 n 格、亮格自左連續；可調範圍寫入 §7.14 並以 `validateThresholds` 單元測試鎖定 | §7.14、FE-35 |
| DS-02（v0.5） | 首次取得：支援 SR、在線、說明已讀之後按麥克風；同頁重用；離開單字卡頁（`flashcards.hide` → `speechPanel.release`）、`pagehide` 同步釋放全部音軌與 `AudioContext`；§7.6 限制改為只禁止 `MediaRecorder`，§10 靜態檢查同步修訂 | §7.6、§7.14、§10、FE-36、FE-39 |
| DS-03（v0.5） | `getUserMedia` 錯誤名稱 → 訊息對照（權限、無裝置、其他靜默退回）；SpeechRecognition `audio-capture` 改用「找不到麥克風裝置」；音軌 `ended` 依 AC-33-06 | §7.14「錯誤對照」、§7.6 |
| DS-04（v0.5） | 確認視窗沿用 `ui/dialog.js`（Esc、點背景 = 取消；背景不可操作；無淡入）；「先建新物件、成功才替換記憶體」位於 `store.confirmApplyGoal`，純規則在 `core/reinit.js`；V-ST-14 列入 FE-34、FE-37、FE-40 | §7.15、§4.3 |
| DS-05（v0.5） | 導覽常數改用 `NAV_TAB_ORDER`／`HIDDEN_TAB_IDS`；主控台入口由 `NAV_TAB_ORDER` 推導；本系統無 hash 路由，另加 `hashchange` 守門使隱藏頁片段導向主控台；解碼器、句型庫的程式與資料保留並打包 | §7.13、§7.16、FE-38 |
| DS-06（v0.5） | 同意：不新增 CT 任務、不新增遷移任務 | D-9、§12.4 |
| DS-07（v0.6） | 新增 `goal.scoreForCard(id)` = `COLOR_LEVELS[].scoreMax`（不新增常數）；store `clickColor` 改用它；Q-32 邏輯移除，`scoreAfterColorClick` 只保留名稱 | §7.1、§7.17、FE-42 |
| DS-08（v0.6） | 程式中唯一寫死 600 的預設值是 `constants.SCORE_DEFAULT`，改為 725；`persist.defaultData()` 已引用常數，首次、重設、停用三種預設自動跟進；FE-42 以原始碼掃描確認無其他寫死預設；既有資料不遷移、不轉換 | §7.1、§7.17、D-10 |
| DS-09（v0.6） | 分數區保留程式、整區 `hidden` + `inert`、輸入元件 `disabled` + `tabindex="-1"`；卡片不建分數範圍節點；狀態列與主控台不建目標分數節點；「套用」「開始學習」不再讀輸入框；AC-22-04 量測點改為點卡片 | §7.17、FE-43 |
| DS-10（v0.6） | 同意：不需 CT、不需遷移任務；FE-42 的 `covers`／`contractRefs` 列 V-ST-16、AC-26-06，FE-43、FE-44 列 AC-26-05 | §12.5、D-10 |
| FB-36（v0.6，知會） | 單元測試構造 AC-26-06 狀態時同樣把 `draftScore` 與 `appliedScore` 設為同值（§10.3） | §10.3、FE-42 |
| FB-33～FB-35（v0.5，知會） | 依契約定案實作：(e) 不看 today（FB-33）；初始化寫入的任何例外皆顯示「儲存空間不足，未套用」（FB-34）；取消時不寫入、`draftScore` 只還原記憶體（FB-35） | §7.15、§4.3 |
| DS-11（v0.7） | 部署目錄 = `dist/site/`（`--site` 預設為 `--out` 同目錄下的 `site/`）；`dist/english-master-track.html` **保留**（`file://` 用，與 `dist/site/index.html` 位元組相同）。`build.mjs` 新增 B-10～B-16（manifest、BUILD_ID、HTML meta 與 `sw.js` 注入、複製圖示與 `ads.txt`、V-PWA-01～06 建置期檢查）。現有建置**沒有**寫入時間戳、亂數或絕對路徑；唯一的時間來源（授權年份保底）在 PWA 模式下升級為中止 | §5.1、§7.18.2、FE-47 |
| DS-12（v0.7） | `ads.txt` 唯一來源 = `sources/deploy/ads.txt`（非 PG 目錄，主控 MC-01 由 `dist/ads.txt` 複製；`dist/ads.txt` 於 MC-03 刪除）；建置 `--ads` 預設此路徑，缺檔中止 | §3、§5.1 B-11、B-16、§12.6 |
| DS-13（v0.7） | 建置 B-11 讀 `00-base.css` 第一個 `--bg` 與 `PWA_BACKGROUND_COLOR` 比對，不同即中止 `PWA_BG_COLOR` | §5.1、§9 v0.7 |
| DS-14（v0.7） | 圖示目錄 = `src/app/assets/icons/`（主控 MC-02 放入，PG 不修改）；建置只複製並依 V-PWA-03 檢查 | §3、D-11、§5.1 B-11 |
| DS-15（v0.7） | 新 workflow 全文見 §5.2：Node 22、`npm run build`（不執行 `npm ci`：零相依、無 lockfile）、驗證 8 檔、整個上傳 `dist/site` | §5.2、MC-03 |
| DS-16（v0.7） | 模組 `services/pwa.js`（L3）於 `main.js` 在 `store.init` 後、`router.start` 前 `start()`；SW 在 `window` `load` 後註冊（PE-4）；新版提示為頁首下的 sticky 文字列 `#pwa-update`（`ui/pwa-notice.js`）；NT-1 與安裝按鈕在主控台備份區按鈕列之後 | §4.2 v0.7、§4.7、§7.18.4～§7.18.7 |
| DS-17（v0.7） | 單元：PE-1 判定表、IN 狀態機（替身事件）、UP 流程（替身 registration）、`sw.js`（vm）、建置 AC-36-01 三情境；V-PWA (b) 以 `tools/serve.mjs`（`npm run serve`，http `localhost` 即安全環境，不需憑證） | §10.4 |
| DS-18（v0.7） | 同意：不需 CT、不需遷移任務；FE 任務 covers 列 AC-34～AC-37、AC-24-12、AC-23-02、AC-23-06 | §12.6、§13.4、D-11 |
| FB-37～FB-43（v0.7，知會） | 依契約定案實作：HTML 靜態 `data:,` favicon，B-7 以逐字白名單允許（FB-37）；manifest／apple-touch-icon 只以程式加入，原始檔不含（FB-38）；等待期間 2 個快取屬正常（FB-39）；不偵測「已安裝但在分頁」（FB-40，T-48）；`theme_color` `#2f6fd6`（FB-41）；只接受具 `prompt` 的安裝事件（FB-42）；iOS 動態連結風險列 T-47，不成立時改靜態連結並同步 B-7 白名單（FB-43） | §5.1、§7.18、§11 |
| FB-27～FB-31（v0.4，知會） | 依契約定案實作：匯入捨棄的歷史項目不計入略過數（FB-27）、`date` 字串格式錯視為「不是今天」（FB-28）、不提供降版（FB-29）、今天歷史與 X 一致（FB-30）、首次「開始學習」寫入失敗與停用時還原的行為（FB-31，另見 SD-FB-19） | §7.7、§7.8、§7.9 |
| DS-19（v0.8） | 建 CT-24（pg-content）：`sources.js` 與 `_tools/lib.mjs` 的 ORIGINAL `fullName` 改為「EnglishContext 原創內容」，重跑驗證；`_fixtures.js` 同名字串歸 FE-60。另發現 v0.11「資料來源與授權」頁未列出 ORIGINAL 項目，FE-60 新增「原創內容來源」一行（SD-FB-49） | §7.19.8、CT-24、FE-60 |
| DS-20（v0.8） | FE-56：`<title>`、標題列 `h1`、`license-header.txt` 第一行；B-12 改檢查 `<title>EnglishContext</title>`；`build.test.js`、`shell.test.js` 舊斷言同步改寫；`FROZEN_IDENTIFIERS` 全部不動（`tokens.test.js`／`layout.test.js` 以字面值鎖定） | §5.3、§7.19.3、§7.19.8 |
| DS-21（v0.8） | (1) `--primary` 改值為 `#0866ad`（白字按鈕）、藍色級維持 `--color-blue` `#2f6fd6`，兩者已拆開；(2) `--bg` `#eef4fa`，B-11 比對改為新值（程式不變）；(3) `.btn--accent` 邊框 `transparent`、`--brand` 禁止用於 `color`；(4) `.btn` 邊框 `transparent`，`--border` 用途限縮 | §7.19.1、§7.19.2 |
| DS-22（v0.8） | 主控台 4 區塊元件、720px、3 格並排、空狀態 ≤ 48px、收合 `aria-expanded`、移除功能入口與小環形圖、安裝與 NT-1 移入展開區；V-LAY-07 列入 FE-55、FE-58 單元測試 | §4.8、§7.19.4 |
| DS-23（v0.8） | 精簡色級列兩種模式共用；固定底部列 ≤ 640px `position: fixed`、預留 184px、Toast 上移；摘要行與試算區共用 `G.estimate` | §7.19.5 |
| DS-24（v0.8） | 進度條 `role=progressbar`、由 `layout.part5Progress` 推導、`transition: none`、720px | §7.19.6 |
| DS-25（v0.8） | 同意：CT 任務 1 個（CT-24），其餘 FE；不需遷移任務 | §12.7 |
| DS-26（v0.9） | 佔位定為 `@@APP_VERSION@@`；`build.mjs` 新增 B-17（佔位位置與次數）、B-18（讀 `--package`／預設 `package.json`、`APP_VERSION_PATTERN` 驗證、寫入 HTML₀′）、B-19（產物 meta 與無 `@@` 殘留）；B-12 HD-1 加第 8 項；B-14 改以 HTML₀′ 計算 BUILD_ID；`build.test.js` 三情境；`tools/` 修改沿用 pg-frontend 負責的既有做法（D-2、FE-63） | §5.4、FE-63 |
| DS-27（v0.9） | 自訂清單空狀態「尚未新增自訂單字。可用上方表單新增。」；單字卡空狀態「請到難易度設定選擇色級並按「套用」，或新增自訂單字。」；範本單字只標「自訂擴充」、不顯示領域名稱；相關測試斷言在 FE-68 同步改寫 | §7.20.2、FE-68 |
| DS-28（v0.9） | 範本 `section` 建立時 `hidden` + `inert`；已確認無 CSS 以 `display` 覆寫 `[hidden]`（全域 `!important` 規則），`21-custom-vocab.css` 不需修改；注入程式與 `templates.js` 保留打包 | §7.20.2、FE-68 |
| DS-29（v0.9） | 狀態列一行 `levelStatus`；目標行改用新函式 `layout.goalLineText`（`goalLineSame`，依生效色級），不再使用 `goalLineCapped`、`goalLineSeparator`；「變更」為外框按鈕（白底、1px `--brand-deep` 框、無底線、44×44）；V-LAY-08、V-LAY-09、V-LAY-10 列入 FE-65、FE-66、FE-67 測試 | §4.9、§7.20.3、§7.20.4 |
| DS-30（v0.9） | 頁尾元件：`ui/version-line.js` 於啟動時讀兩個 meta 一次，合法才在 `#footer-sources` 後建立 `p#app-version`；12px、`--text-muted`（約 5.4:1）、`nowrap`；底部留白經確認不需調整（§7.20.1 表）；V-VER-03、V-VER-04 列入 FE-64 | §7.20.1、FE-64 |
| DS-31（v0.9） | 同意：不需 CT、不需遷移、不需主控手動項目；QA 範圍見 §10.6 | §12.8 |
| DS-32（v0.10） | **遷移**：`persist.MIGRATIONS[2]` 實作 MG-6；`migrate` 逐版串接 1 → 2 → 3，localStorage 與匯入共用；遷移後一律 RD-1 → RD-3 → 驗證（修正 T-76）；`store.init` 沿用既有 `migrated` 分支以一次 `setItem` 寫回（MG-7），匯入步驟 4 串接（MG-8）。**夾具**：FE-70 以 v0.14 交付檔實際寫出的主鍵原字串與備份原始位元組凍結於 `__tests__/_samples/`，v0.7 樣本取自既有 `V07_RAW` 與其衍生備份（§7.21.1）。**既有測試**：寫死 `schemaVersion` 2 的 9 個測試檔全部列入 FE-73 paths，斷言改用常數；QA 的 `tests/e2e/` 13 處列 SD-FB-57。V-ST-21 由 `migrate-v3.test.js` 涵蓋 | §7.21.1、FE-70、FE-73 |
| DS-33（v0.10） | **解析**放在 L1 `core/position.js`（`resolve`）；**掛點**：換卡唯一入口 `store.gotoCard`（按鈕、滑動、測驗模式換題皆經此）、單字集重建唯一入口 `store.placeCard`（啟動、新增／刪除自訂單字、範本注入、匯入）；**寫入時機**：同一事件內先 `setItem` 再重繪，預算 < 5 ms，超標時改為先重繪（不改契約）；**取代舊邏輯**：store 不再呼叫 `custom.indexAfterDelete`、刪除 `keepCurrentCard`，等價性證明見 §7.21.2；V-ST-18 由 `store-track.test.js` 涵蓋（含不變式 INV-FP） | §4.10、§7.21.2、FE-71、FE-74 |
| DS-34（v0.10） | **單一狀態轉移模組** `core/part5flow.js`（純函式：`recordAnswer`、`next`、`restart`、`setOnly`、`replayKeepRecords`、`clearAndRestart`、`normalizeOnly`、`viewKind`）；**UO-4 呼叫點**：`persist.normalizeAfterLoad`（啟動，經第 4 參數 `part5Ids`）、`backup.importSteps` 步驟 7（同一函式）、`store.setPart5UnansweredOnly`（開啟時）；**MT-1 擴充**：`layout.part5Progress("allCorrect")` = 100%；V-ST-19、V-ST-20 由 `part5flow.test.js`、`store-track.test.js` 涵蓋 | §4.10、§7.21.3、FE-72、FE-74 |
| DS-35（v0.10） | **文字定稿**：全部答對說明句「每一題都至少答對過一次了。可以保留紀錄、全部題目再練一次，或清除答對紀錄後重新來過。」；確認對話框標題「清除答對紀錄」、內文「將清除全部題目的答對紀錄，「已答對」會回到 0 題，並從第 1 題重新開始。累計答題數與正確率不受影響。」、按鈕只有「確定」「取消」。**版面**：計數行與開關同列於進度條下方（`.p5-record`）、標示為題型標籤後的外框膠囊（`--correct` 字與框、白底，≈ 5.0:1）、開關為原生核取方塊＋label（44×44、Enter 由程式補）、全部答對畫面兩個按鈕（主要／次要，不用強調橘）；新元素無動畫；對話框沿用 `ui/dialog.confirm`（Esc、點遮罩 = 取消） | §7.21.4、FE-75 |
| DS-36（v0.10） | store 一般寫入**全部**收斂為 `commitWrite`（含學習紀錄、作答、位置、開關，以及 `setDraft`、`applyGoal`、`deleteCustomWord`、`acknowledgeSttNotice`、`startLearning`），容量不足提示整個工作階段最多 1 次（共用 `learningQuotaNoticeShown`）；新增自訂單字、範本注入、初始化、匯入維持各自處理；`ui/banner.js` 不改。擴大到一般寫入的理由與影響見 §7.21.5、SD-FB-59 | §7.21.5、FE-74 |
| DS-37（v0.10） | **建立**檢查（CT-25）：`_records/part5-ids.json` 指紋快照 + `validate.mjs` V-P5-08（兩個指紋皆變 → 錯誤；只變一個 → 警告；新 id → 提醒更新快照）；`src/data/` 資料檔不改 | §7.21.6、CT-25 |
| DS-38（v0.10） | 主控手動項目 MC-04（FE-76 之前）；建置與測試不改 | §5.5、§7.21.7 |
| DS-39（v0.10） | 同意範圍；另加選擇性的 CT-25。持久化結構變更已由人類於契約 v0.15 核准，tasks.json v0.9 仍需人類核准後才開工（CLAUDE.md） | §12.9 |
| DS-40（v0.16） | 同意範圍，建立 1 個任務 FE-77：(1) `PWA_TEXTS` 改值（§7.22.1）；(2) 聯絡行為 `.src-page` 最後一個子元素、`textContent` 寫入、`src-muted src-contact`（§7.22.2）；(3) 靜態檢查放在新測試檔 `contact-static.test.js`（交付 HTML 不含 `mailto:`、去空格位址、舊文字，含常數原值），**不改** `tools/build.mjs`（§5.6）；(4) FE-77 以 `npm run build` 取代手改 `dist/`；版本 1.1.0 不變 | §5.6、§7.22、§10.8、FE-77 |
| FB-61、FB-62（v0.16，知會） | FB-61：交付以建置產物為準，FE-77 重新建置並比對兩份 HTML 相同（T-89、SD-FB-67）；FB-62：檢查範圍擴及 `src/app/` 非測試原始碼與 `sw.js`，測試以執行期推導去空格位址，原始碼不寫字面值（§7.22.2 防爬蟲表、T-88） | §7.22.2、§10.8 |
| FB-54～FB-60（v0.15，知會） | 依契約定案實作：FB-54 同生效色級套用位置不變（`appliedGoalState`）；FB-55 其後無未答對 → 進結算（`normalizeOnly`）；FB-56 兩個選擇本輪歸 0（`replayKeepRecords`、`clearAndRestart`）；FB-57 列 T-80、SD-FB-63；FB-58 不列入 CI-2（`reinit` 不改）；FB-59 `flashcardPosition: null` 合法（`migrate-v3.test.js` 有案例）；FB-60 清除寫入失敗依 WR-2（`commitWrite`） | §7.21 |
| FB-50～FB-53（v0.14，知會） | FB-50 已由主控修正 PRD；FB-51 依 HT-7 (b) 定案（不顯示領域名稱，SD-FB-51）；FB-52 文字見 DS-27；FB-53 依 VR-4 實作（只讀 `version` 一欄，不把 `package.json` 整檔納入雜湊） | §5.4、§7.20.2 |
| FB-44～FB-49（v0.8，知會） | 依契約定案實作：文字以 PRD 為準（FB-44：副標用「」、標題「資料備份」、按鈕不加箭頭）；目標行依已套用值（FB-45）；FB-46 的 3 項文字由 SD 定（今日卡標題「今日任務」、圖表標題「近 7 天已學字數」、3 格區塊不設可見標題而用 `aria-label`「學習數據」、說明行「本系統建議字量：右側為內建字數與每日新字量」、備份說明沿用 v0.11 文字，SD-FB-41）；結算畫面 `aria-valuenow` = N（FB-47）；背景與建議值採契約預設，**不改** `COLOR_TOKENS`，不需契約小修（FB-48）；下載檔名不屬畫面文字（FB-49） | §7.19 |

---

## 15. 回饋上游

| 編號 | 事項 | 對象 | 類型 | 建議 |
| :--- | :--- | :--- | :--- | :--- |
| SD-FB-01 | `src/data/_tools/`（驗證與產生工具）與 `src/data/_records/`（交付紀錄）不是「內容資料」，但 pg-content 只能寫 `src/data/`，且 scratchpad 不跨工作階段保留，QA 需要這些紀錄驗 V-VOC-17、M-7 | 人類 | 待辦（確認） | 核准本設計即視為同意；這兩個目錄以 `_` 開頭，建置不打包（D-1）。若不同意，需另指定 pg-content 可寫的非打包目錄 |
| SD-FB-02 | 建置相關檔案放在 `src/` 以外：`package.json`、`tools/build.mjs`、`dist/`（皆指派 pg-frontend）；QA 的測試放 `tests/`，並可能在 `package.json` 加 Playwright 為 devDependencies（`qa.md` 允許） | 人類、QA | 待辦（知會） | 核准即同意；QA 只可改 `package.json` 的 `devDependencies` 與 `scripts` 中以 `test:e2e` 開頭的項目 |
| SD-FB-03 | 契約 V-ST-04「內建資料更新後與既有自訂單字 wordKey 相同，單字集只放內建那張」未說明該內建字不在目前截取範圍（如生效色級為橘，而該字排名 3,000）時的行為。SD 採：只與**本次截取**的內建卡去重，不在範圍內則保留自訂卡，使該字仍出現一次 | SA | 待辦（確認） | 若 SA 意圖不同（例如一律只看全部內建字庫），請修訂 V-ST-04；FE-04 屆時調整 |
| SD-FB-04 | `docs/02-contract/data-schema.ts` 開頭註解區的 `status` 仍為 `in-review`、`approved_by` 空白，而 README 已 approved 且聲明三檔為一組審核 | SA、人類 | 待辦（知會） | 下次修訂契約時同步三檔 frontmatter；本設計以 README 的核准為準 |
| SD-FB-05 | V-VOC-18 抽查比例與門檻由 SD 訂定（§8.4：每分檔 5%、至少 20 筆，不合格率 > 5% 整批退回） | QA、人類 | 待辦（知會） | QA 依 §8.4 執行；人類若要更嚴格可要求 SD 修訂 |
| SD-FB-06 | Part 5 題庫陣列順序即出題順序（V-P5-07），契約未規定題型排列；SD 決定 CT-20 以題型交錯排列（每連續 4 題涵蓋 4 種題型），避免使用者連續 50 題同題型 | 人類 | 待辦（知會） | 核准即同意 |
| SD-FB-08 | （v0.3）契約 README §5.3「寫入：容量不足」只寫「新增自訂單字」回滾、「其他寫入」保留記憶體，未說明範本注入屬哪一類。SD 解讀範本注入屬「新增自訂單字」（§7.5），不需改契約即可實作 | SA | 待辦（知會） | 下次修訂契約時可把該列改為「新增自訂單字（含範本注入）」；若 SA 意圖不同，請告知，FE-07／FE-10 屆時調整 |
| SD-FB-09 | （v0.3）AC-08-09 只描述權限被拒；`audio-capture`（無麥克風）沿用同一主訊息並加補充說明（§7.6）。PRD 未規定其他 STT 錯誤碼的文案，SD 訂為通用訊息 | PM、QA | 待辦（知會） | 不需改 PRD；QA 依 §7.6 對照表判定 |
| SD-FB-07 | 排名 ≤ 2,809 的 `academicContext` 契約允許空白；SD 訂為功能詞與無學術用途的生活字留空、其餘建議填寫（非強制），以兼顧內容量與檔案大小 | 人類 | 待辦（知會） | 若希望 ≤ 2,809 全部空白（減少約 0.3 MB 與工作量）或全部填寫，請告知 |
| SD-FB-10 | （v0.4）PRD 只規定 ≤ 640px 用底部導覽（AC-27-01）與 768px、1366px 用寬螢幕導覽（AC-27-04），**641～767px 未規定**。SD 決定該區間維持既有「選單」按鈕展開 2 × 3 按鈕格（v0.3 行為，§9），不新增第三種版面 | PM、QA | 待辦（知會） | 不需改 PRD；QA 對 641～767px 依 AC-20-01、AC-20-03 驗證即可。若希望 641～767px 也用底部導覽或單列頁籤，請 PM 補 AC |
| SD-FB-11 | （v0.4）AC-25-01「全螢幕顯示難易度設定的首次畫面」：SD 解讀為隱藏導覽列與選單鈕後，由頁首（產品名稱）、儲存警示列（AC-25-08 需要）、首次畫面內容、頁尾（AC-25-01 要求保留「資料來源與授權」）構成整個畫面，不另做蓋住頁首頁尾的覆蓋層 | PM、QA | 待辦（知會） | 若「全螢幕」意指連頁首也隱藏，請 PM 註明；頁尾連結依 AC-25-01 必須保留 |
| SD-FB-12 | （v0.4）AC-25-07「開啟資料來源頁再返回」：首次模式沒有導覽列，PRD 未指定返回方式。SD 在頁尾加「返回難易度設定」按鈕（只在首次模式且位於資料來源頁時顯示，§7.9）；瀏覽器「上一頁」不支援（本系統不使用 history 路由，v0.3 起即如此） | PM、QA | 待辦（知會） | QA 以該按鈕驗證 AC-25-07 |
| SD-FB-13 | （v0.4）QA 既有 E2E（`tests/e2e/*.mjs`）以清空的 localStorage 開啟時，v0.8 會先顯示首次畫面而非主控台，且導覽文字已更名；這些腳本屬 QA 負責、PG 不得修改 | QA | 待辦（知會） | QA 在 `/qa-verify` 時：清空狀態的案例先按「開始學習」或預寫 `schemaVersion` 2 的狀態；以 `data-tab`／`#view-*` 等識別字定位元素（R-15 不改識別字），避免依賴畫面文字 |
| SD-FB-14 | （v0.4）首次畫面的「從備份還原」與主控台匯入各有一份結果訊息對照（`ui/import-flow.js` 與 `views/dashboard.js`），以 `first-run.test.js` 比對兩者輸出完全相同來防止分歧；本版不重構主控台改用共用模組，以降低已驗收功能的回歸風險 | 人類 | 待辦（知會） | 日後若再改匯入訊息，請一併指派兩個檔案；或另開任務把主控台改用 `ui/import-flow.js` |
| SD-FB-15 | （v0.4）AC-29-02「震動總長 ≤ 200ms」對 `navigator.vibrate([震, 停, 震])` 是否計入停頓未說明。SD 採較嚴格解讀：**含停頓**的總和 ≤ 200ms（答錯 `[60, 40, 60]` = 160ms） | QA | 待辦（知會） | QA 以替身函式記錄參數並以相同算法判定 |
| SD-FB-16 | （v0.4）AC-29-01「答錯時所選選項有晃動動畫」：SD 只讓所選（錯誤）選項晃動，正確選項同時標綠但不另加強調動畫，避免兩個動畫同時出現；答對時正確選項有強調動畫 | PM、QA | 待辦（知會） | 若希望答錯時正確選項也有強調動畫，請 PM 註明 |
| SD-FB-17 | （v0.4）契約 RD-2 允許啟動時把 RD-1／V-ST-09～11 的修正立即寫回。SD 決定**不**在啟動時額外寫回（只有 MG-3 的 v1 遷移會寫回一次），修正結果在下一次 `PersistedData` 寫入時一併寫回 | SA、QA | 待辦（知會） | 不影響 AC-30-13（畫面與記憶體立即正確）；QA 檢查 localStorage 原值時請在一次學習行為之後再比對 |
| SD-FB-18 | （v0.4）AC-30-07 (b) 只要求「切換到其他功能區再回到主控台」時反映新日期；若使用者停在主控台跨過午夜且不做任何操作，畫面仍顯示前一天的 X，直到下一次學習行為或重新進入主控台（T-31）。SD 不加計時器輪詢 | PM | 待辦（知會） | 若希望停留畫面也自動換日，請 PM 補 AC，SD 再加每分鐘檢查 |
| SD-FB-19 | （v0.4）契約 FB-31 (a)：「開始學習」寫入失敗（容量不足）仍進入主控台，但主鍵不存在，**下次開啟會再出現首次畫面**。SD 依契約實作；PRD AC-25-08 只涵蓋 localStorage 停用的情況 | PM | 待辦（知會，與契約 FB-31 相同） | 請 PM 確認或補進 AC-25-08 |
| SD-FB-20 | （v0.5）本系統**不使用** hash 路由（AC-20-04 的條件句不成立），但為了讓「手動輸入解碼器、句型庫網址片段時改顯示主控台」在任何寫法下都成立，router 仍以 `hashchange` 攔截隱藏頁片段（`#decoder`、`#phrasebank`、`#view-…`、`#/…`）；其他片段（如 `#flashcards`）忽略、不切頁 | QA | 待辦（知會） | QA 以上述寫法驗證 AC-20-04；其他片段不屬本 AC |
| SD-FB-21 | （v0.5）HT-4、HT-5 要求保留程式碼，因此交付檔**原始碼**必然含「解碼器」「句型庫」字樣（`TAB_LABELS`、views 程式）；`index.html` 也保留兩個空的 `<section hidden>`（已去掉 `aria-label`）。AC-20-04 判定範圍為「畫面導覽與入口」 | QA | 待辦（知會） | QA 以可見畫面、可存取名稱與可點擊元素判定，不以原始碼字串搜尋判定 |
| SD-FB-22 | （v0.5）`audio-capture` 與「聆聽中麥克風被拔除」皆歸為「找不到麥克風裝置」（AC-33-06 (b) 允許依 AC-08-09 或 AC-33-05）；取代 v0.3 SD-FB-09 的共用主訊息做法。`getUserMedia` 的 `SecurityError` 歸為權限問題 | QA、PM | 待辦（知會） | 不需改 PRD；QA 依 §7.14 錯誤對照判定 |
| SD-FB-23 | （v0.5）AC-33-01「只詢問一次」能否成立取決於 Chrome／Edge 在 `file://` 下的權限實作（T-32、T-33），設計階段無法保證；第一次按下也可能出現 2 次詢問 | 人類 | 待辦（需人類注意） | 依 PRD R-18 二：V-MIC 實測不成立時 QA 開 BUG，人類判斷是否接受為瀏覽器限制 |
| SD-FB-24 | （v0.5）V-MIC 檢查 AC-33-02 的 `MediaStreamTrack.readyState` 需要取得音軌參照；SD 在 `services/mic.js` 提供唯讀偵錯函式 `tracks()`（回傳複本，不進 store），供 DevTools 使用 | QA | 待辦（知會） | QA 依 §10.2「偵錯輔助」操作 |
| SD-FB-25 | （v0.5）收音條只在**單字卡模式**的語音面板顯示（AC-33-03 的 Given 即為單字卡模式；測驗模式沒有語音面板）。切到測驗模式時停止聆聽與音量分析，但**不釋放**音軌（AC-33-01 允許期間切測驗模式再切回仍不詢問） | QA | 待辦（知會） | — |
| SD-FB-26 | （v0.5）store 保留 `applyGoal()` 原行為（直接套用、不判斷初始化），另新增 `requestApplyGoal`／`confirmApplyGoal`／`cancelApplyGoal`；初始化判斷由「view 只能呼叫 `requestApplyGoal`」保證（以 `customizer.test.js` 原始碼掃描鎖定），目的是不讓既有已驗收測試大量改寫 | QA、人類 | 待辦（知會） | QA 以畫面操作驗收 US-32；若希望 store 層強制，可另開任務改 `applyGoal` 並一併改寫既有測試 |
| SD-FB-27 | （v0.5）初始化寫入失敗時，store **不**更新 `writeStatus`（避免 banner 另跳一次「儲存空間不足」與 view 的「儲存空間不足，未套用」重複）；初始化失敗不影響之後一般寫入的提示 | QA | 待辦（知會） | AC-32-11 (b) 畫面只出現一則「儲存空間不足，未套用」 |
| SD-FB-28 | （v0.6）單字卡頁空狀態提示「請到難易度設定套用目標分數，或新增自訂單字、注入領域範本。」（`flashcards.js`，AC 未定義此文字）仍提到「目標分數」，但 v0.10 畫面已無法設定分數。AC-26-05 只涵蓋首次畫面、難易度設定頁、主控台，本版**不改**此文字 | PM | 待辦（知會） | 若希望改為「請到難易度設定選擇色級並套用，…」，請 PM 補充文字後另開小任務（`flashcards.js`、`naming.test.js`） |
| SD-FB-29 | （v0.6）R-19 允許保留分數輸入程式，因此交付檔**原始碼**仍含「請輸入 10～990 的分數」「目標分數滑桿」等字樣（`goal.js`、`customizer.js`）；分數區 DOM 也仍存在（隱藏、停用）。AC-26-05 判定範圍為可見畫面、Tab 焦點與可存取名稱 | QA | 待辦（知會） | QA 以可見性、焦點與無障礙樹判定，不以原始碼字串或「DOM 中存在元素」判定（同 SD-FB-21） |
| SD-FB-30 | （v0.6）QA 既有 E2E 若以 `#cz-score-input`／滑桿設定分數、以畫面讀「目前目標分數」、或假設首次預設 600，會失敗；這些腳本屬 QA 負責 | QA | 待辦（知會） | 改為點色級卡片，分數以 localStorage 或匯出備份驗證（PRD v0.10 色級定義「驗證方式」列）；AC-26-06 構造狀態依 FB-36 |
| SD-FB-31 | （v0.7）maskable 圖示縮放比例：PRD AC-34-03、Q-41 決議與契約 DP-4(d) 寫「圖案約縮至 85%」，主控實際產出為 **78%**（文字在 80% 安全圓內）。可判定的條件是「對話框與字樣完整位於直徑 80% 的圓內」，78% 符合且更保守 | PM、SA、QA | 待辦（知會） | 不需改設計；建議下次修訂時把 AC-34-03 與 DP-4(d) 的括號說明改為「約 78%」或「以安全區為準」，QA 以安全區判定，不以縮放比例判定 |
| SD-FB-32 | （v0.7）tasks.json 的 `owner` 值域只有 `pg-content`、`pg-frontend`；主控要求把搬 `ads.txt`、放 PNG、改 workflow 標示為主控執行。SD 將其放在 tasks.json 頂層 `manualSteps`（MC-01～MC-03，`owner: "主控"`），不放入 `tasks`，FE 任務以 `manualPrereqs` 引用 | 主控、人類 | 待辦（知會） | 核准即同意；`/pg-run` 不派發 `manualSteps`；主控的 tasks 驗證工具若檢查 `dependsOn`，MC 項目不在其中 |
| SD-FB-33 | （v0.7）`src/app/assets/icons/*.png` 位於 pg-frontend 目錄，但依 Q-45 由主控放置；`sources/deploy/ads.txt` 為新增的非 PG 目錄 | QA | 待辦（知會） | QA 越界檢查視為授權例外（D-11）；PG 任務不得修改這些檔案 |
| SD-FB-34 | （v0.7）AC-24-12／NT-1「緊接『匯出備份』按鈕」：現行「匯出備份」與「匯入備份」同一按鈕列，SD 把說明放在**按鈕列的下一個元素**（不插在兩個按鈕之間，避免拆散同組操作） | PM、QA | 待辦（知會） | QA 以「同一區塊、按鈕列之後、中間無其他元素」判定；若 PM 要求緊貼「匯出備份」單一按鈕，請補註 |
| SD-FB-35 | （v0.7）SW-4 允許兩種寫法，SD 採「只請求 `./index.html` 一次、`clone()` 寫入 `./` 與 `./index.html` 兩鍵」；因此 install 階段的網路請求為 6 個（`./` 不另請求），Cache Storage 項目仍為 7 個 | QA | 待辦（知會） | QA 驗 AC-35-01、AC-37-05 時以快取項目 7 個、請求網址皆屬預先快取清單判定，不要求 install 請求 7 次 |
| SD-FB-36 | （v0.7）`dist/site/` 由 CI 重新建置部署；本機 `dist/` 是否提交 git 不影響部署 | 人類 | 待辦（確認） | 建議把 `dist/site/` 加入 `.gitignore`（避免本機與 CI 產物不同造成困惑，見 T-46）；`dist/english-master-track.html` 是否繼續提交由人類決定 |
| SD-FB-37 | （v0.7）Windows checkout 換行可能為 CRLF，CI 為 LF，兩地 BUILD_ID 不同（不違反 AC-36-01） | 人類 | 待辦（確認） | 建議在專案根目錄加 `.gitattributes`：`* text=auto eol=lf`、`*.png binary`（非 PG 目錄，需人類或主控執行）；不加也不影響功能 |
| SD-FB-38 | （v0.7）部署 workflow 不執行 `npm ci`／`npm install`（無 lockfile、零相依）。若 QA 日後在 `package.json` 加 devDependencies，部署仍不安裝；但若有人加入**建置期**相依，需同步修改 workflow（屬再次修改 `static.yml`，超出 Q-46 一次授權，須問人類） | QA、人類 | 待辦（知會） | 建置維持零相依（§1） |
| SD-FB-39 | （v0.8）**PRD 內部衝突**：AC-38-05 要求標題列圖示為「PWA `any` 圖示的縮小版（藍底、橘色『EC』對話框）」，但 AC-38-01（與契約 VC-3、V-LAY-01）規定計算後顏色等於 `#f7893b` 的元素只能是「開始今日學習」「開始學習」按鈕底色與連續打卡圖示；強調橘本身「取自圖示」，因此圖示的橘色對話框必定被掃描到。VC-1 的 `brand` 用途表已列「標題列圖示」，`accent` 用途表卻沒有 | PM、SA、人類 | **影響 PRD（需人類決議）** | 建議 PM 在 AC-38-01 的允許清單補「標題列圖示（AC-38-05）」，SA 同步 VC-3、V-LAY-01。設計目前依 AC-38-05 使用原色（T-55）；決議前 QA 視為已知衝突、不開 BUG |
| SD-FB-40 | （v0.8）AC-39-06 要求「今日已學 X / D」在主控台本體只出現 1 次，而 v0.11 環形圖中央另顯示「X / D」。SD 改為中央只顯示 X，完整「今日已學 X / D 字」只在環形圖旁一行；AC-30-05 的「顯示 18 / 15」由該行滿足 | QA、PM | 待辦（知會） | QA 驗 AC-30-05 時以「今日已學 18 / 15 字」那一行判定 |
| SD-FB-41 | （v0.8）契約 FB-46 交由 SD 定案的畫面文字：今日任務卡標題「今日任務」；近 7 天圖表標題「近 7 天已學字數」（沿用 v0.11）；3 格數據區不設可見標題（`aria-label`「學習數據」，避免與 AC-39-06 列舉文字重複）；色級說明行「本系統建議字量：右側為內建字數與每日新字量」；「資料備份」展開後的說明沿用 v0.11「備份檔只含你的學習資料，不含內建字庫與題庫；可在其他裝置的同一個檔案匯入還原。」；展開指示為箭頭圖示（`aria-hidden`） | PM、QA | 待辦（知會） | 若 PM 要固定文字，補進 AC 後由 SA 加常數 |
| SD-FB-42 | （v0.8）AC-38-08「只換配色」：全域卡片改為 16px 圓角與陰影後，單字卡頁以 `#view-flashcards .card` 固定 v0.11 幾何（8px、1px 框線、無陰影），只有框線與按鈕顏色改變；單字卡頁因此看起來與其他頁的卡片風格不同 | PM、QA | 待辦（知會） | 若 PM 希望單字卡頁的外框也換成新風格，需修改 AC-38-08 的「只有顏色依 token 改變」 |
| SD-FB-43 | （v0.8）`--focus` 由琥珀色 `#f59e0b` 改為深品牌色 `#0866ad`（3px、offset 2px），使焦點框在淡藍灰背景上更清楚；PRD 只要求 ≥ 2px 可見 | QA | 待辦（知會） | — |
| SD-FB-44 | （v0.8）契約 `LAYOUT_TEXTS` 說「千分位與否由 SD 定，全畫面一致」：SD 定為**整數 ≥ 1,000 一律加千分位**（沿用難易度設定頁既有 `2,809` 寫法），主控台的「今日已學」、3 格數據、長條圖字數、「已掌握 N 字」亦同（如「已掌握 1,234 字」） | QA、PM | 待辦（知會） | QA 構造大數值測試時依此判定 |
| SD-FB-45 | （v0.8）QA 既有 E2E 受影響：主控台 `.dash-entry`、`.db-mini`、「學習統計」「目前目標」區塊、首次畫面 `#cz-guide` 與試算結果卡已移除；「匯出備份」「匯入備份」需先展開「資料備份」。保留的定位點：`#cz-start`、`#cz-restore`、`#cz-apply`、`#view-*`、`data-tab`、`data-action="export-backup"`／`"import-backup"`／`"install-app"` | QA | 待辦（知會） | QA 在 `/qa-verify` 前更新 `tests/` |
| SD-FB-46 | （v0.8）AC-41-03 對 > 640px 允許「可固定或隨內容排列」：SD 採隨內容排列（`position: static`）；1366×768 以計算估約 733～757px 高，仍在首屏內，但餘裕只有約 10～35px | QA、PM | 待辦（知會） | 若 1366×768 量測超出，FE-62 在 `90-overrides.css` 對 > 640px 改為 `position: sticky; bottom: 0` |
| SD-FB-47 | （v0.8）AC-26-01「說明為適用情境（一行，過長截斷）」與「375px 下 5 列文字不裁切」並存：SD 解讀為說明欄以省略號截斷屬 AC 允許，名稱與右側數字不得截斷；完整說明仍在按鈕可存取名稱中 | QA | 待辦（知會） | QA 以名稱與數字是否完整判定「不裁切」 |
| SD-FB-48 | （v0.8）AC-38-06 的範圍「4 個功能區」包含單字卡頁的按鈕：`.btn` 全域改為透明邊框、淡藍底，單字卡頁按鈕因此只有顏色改變（尺寸不變），與 AC-38-08 不衝突 | QA | 待辦（知會） | — |
| SD-FB-49 | （v0.8）AC-38-10 (1) 要求「資料來源與授權」頁顯示原創內容來源名稱「EnglishContext 原創內容」，但 v0.11 該頁只列字表與辭典、**不列 ORIGINAL 項目**（FE-17 依 AC-23-02 設計）。SD 在授權區塊新增一行「原創內容來源：{fullName}」（名稱取資料，NM-3）；「原創內容來源：」為 SD 定的標籤文字 | PM、QA | 待辦（知會） | 若 PM 希望以其他形式呈現（例如列為一張來源卡片），請補 AC |
| SD-FB-50 | （v0.9）SD-FB-39 已由 PRD v0.13 解決（AC-38-01 加入標題列品牌圖示例外）；契約 v0.14 VC-3、V-LAY-01 亦已同步。程式不需修改 | QA | 已結案（知會） | QA 依 PRD v0.13 判定 `.app-logo` 橘色為允許 |
| SD-FB-51 | （v0.9）契約 FB-51 交 SD 決定「範本單字是否另顯示領域名稱」：SD 定為**不顯示**，只標「自訂擴充」（理由見 §7.20.2） | PM、QA | 待辦（知會） | PM 下次修訂可在 AC-43-03 (2) 補「不顯示含『範本』的來源標示，也不另顯示領域名稱」；若希望保留「資工」等名稱，請補 AC，FE 另開小任務 |
| SD-FB-52 | （v0.9）契約 `LAYOUT_TEXTS.goalLineCapped`、`goalLineSeparator` 標為停用但仍在 §13；為維持 `layout.test.js` 與契約逐字相等，`core/layout.js` 保留兩鍵與 `goalLine` 函式（標 `@deprecated`），view 不再引用 | SA | 待辦（知會） | SA 下次修訂契約刪除兩鍵時，SD 安排小任務同步刪除 `layout.js` 的兩鍵、`goalLine` 與其測試（不涉持久化，可主控代核） |
| SD-FB-53 | （v0.9）主控台目標行色點改依**生效**色級（套用藍、金時顯示綠點），與文字「綠級」一致；DB-4 只規定文字依生效色級，未規定色點 | QA、PM | 待辦（知會） | QA 驗 AC-38-03 時，以「色點顏色 = 目標行所顯示色級的色值」判定（色值本身不變）；若 PM 希望色點仍表示目標色級，請補 AC |
| SD-FB-54 | （v0.9）QA 既有 E2E 受影響：`.db-change` 不再有 `btn--link`；`.db-goal__sep` 移除；難易度設定狀態列 `#cz-st-target`、`#cz-st-effective`、`.cz-status__cap` 改為單一 `#cz-st-line`；`.cv-item__source` 移除；範本按鈕 `[data-template]` 仍在 DOM 但位於 `hidden` + `inert` 容器（無法點擊）；新定位點 `#app-version` | QA | 待辦（知會） | QA 在 `/qa-verify` 前更新 `tests/`；AC-22-02 的 30 個自訂單字改以匯入備份建立最快 |
| SD-FB-55 | （v0.9）首次模式且位於「資料來源與授權」頁時，頁尾順序為「資料來源與授權」→ 版本行 →「返回難易度設定」（版本行須在連結正下方，AC-42-01）；「返回」按鈕因此移到版本行之下，Tab 順序仍為「資料來源與授權」→「返回難易度設定」 | QA、PM | 待辦（知會） | QA 驗 AC-25-07 時以按鈕存在與行為判定，不以位置判定 |
| SD-FB-56 | （v0.9）版本行由 JS 在啟動時建立：JS 執行失敗、或未經建置的開發模板（meta 為佔位）時不顯示，屬 VR-8 允許行為；交付產物由建置 B-18、B-19 保證兩值合法 | QA | 待辦（知會） | QA 只以建置產物驗收 AC-42-01 |
| SD-FB-57 | （v0.10）QA 既有 E2E 受影響：(1) 寫死 `schemaVersion === 2` 或 `data` 9 鍵——`e2e-cards.mjs:387`、`e2e-goal.mjs:252`、`e2e-firstrun.mjs:131`（支援版本「1、2」→「1、2、3」）、`:167`、`:269`、`:294`、`e2e-layout.mjs:292`、`e2e-progress.mjs:203`、`e2e-pwa.mjs:523`、`e2e-pwa-update.mjs:150`、`e2e-reinit.mjs:121`、`:219`、`e2e-version.mjs:145`、`:404`、`:436`；(2) `lib/state.mjs` 產生 v2 主鍵，v0.15 開啟時會遷移並寫回一次（比對位元組的案例需改產生 v3 或容許寫回）；(3) 同生效色級套用（綠 → 藍、金）不再回到第 1 張（FB-54）；(4) 新定位點 `[data-p5=correct-count]`、`[data-p5=only]`、`[data-p5=correct-badge]`、`[data-p5=allcorrect-title]`、`[data-p5=replay]`、`[data-p5=clear]` | QA | 待辦（知會） | QA 在 `/qa-verify` 前更新 `tests/`；斷言改用「目前版本 3、12 鍵」（C-8） |
| SD-FB-58 | （v0.10）AC-47-03、AC-47-04 最可信的驗法是以 v0.14 交付檔實際產生的資料開啟 v0.15。FE-76 會覆寫 `dist/english-master-track.html`；FE-70 已凍結單元測試用的樣本並記錄其 SHA-256 | QA、主控 | 待辦（知會） | QA 若要做 E2E 實測，請在 FE-76 執行前自行複製目前的 `dist/english-master-track.html`（1.0.0）到 `tests/` 下，或由版本庫取回 1.0.0 的產物 |
| SD-FB-59 | （v0.10，DS-36）為符合 V-ST-22「整個工作階段只出現 1 次」，SD 把**所有**一般寫入（含 `setDraft`、`applyGoal`、`deleteCustomWord`、`acknowledgeSttNotice`）的容量不足提示一併收斂為每個工作階段 1 次；v0.14 為「每次由正常轉為容量不足時提示」。新增自訂單字（AC-18-04）、初始化（CI-7）、匯入（AC-24-09）的立即提示不變 | PM、QA | 待辦（知會） | 不需改 PRD（§5.3 只要求「提示」）；若 PM 希望一般寫入維持每次提示，請補 AC，FE 另開小任務 |
| SD-FB-60 | （v0.10）FP-2 (2) 規定「紀錄為 `null` 時解析後把記憶體紀錄更新為第 1 張」，FP-4 規定「生效色級改變、開始學習時寫入 `null`」。SD 以不變式 INV-FP 統一：`null` 與「第 1 張」等價，兩種寫法皆合法（`FlashcardPositionNormalized` 允許 `null`）；因此 V-ST-18 (a) 只在使用者換卡後檢查非 `null` 值 | SA、QA | 待辦（知會） | 不需改契約；QA 驗 AC-44-08 以「重新載入後為第 1 張」判定，不要求 localStorage 必為 `null` 以外的值 |
| SD-FB-61 | （v0.10，CT-25）V-P5-08 快照建立後，日後修改 `part5.js` 的題目文字或正解時，`validate:data` 會出現警告或錯誤；確認是錯字修正後須以 `--accept <id>` 更新快照，新增題目後以 `--update-snapshot` 加入 | pg-content、人類 | 待辦（知會） | 屬內容維護流程；`_records/CT-25.md` 記錄指令 |
| SD-FB-62 | （v0.10）V-ST-21 (a)「遷移後前 9 欄與遷移前深度相等」只在樣本對開啟當天已是正規化狀態時成立：MG-7 寫回的是一般讀取流程（V-ST-02 色級重算、V-ST-05、V-ST-09～V-ST-11 換日）處理後的資料，例如 v0.7 樣本的 `currentIndex: 999` 會被重設為 0 | SA、QA | 待辦（知會） | QA 以「產生樣本當天」的日期執行比對，或只比對不受一般讀取流程影響的欄位；`migrate-v3.test.js` 依此撰寫（§7.21.1） |
| SD-FB-63 | （v0.10，契約 FB-57）`schemaVersion` 升為 3 後，舊版 `file://` 檔或未更新的舊分頁會把資料視為無法讀取並重設（原字串保留在 `englishMasterTrack:unreadable`）或以 v2 覆寫 | 人類、主控 | 待辦（知會） | 發布 1.1.0 時在說明中提醒「更新後請關閉其他舊分頁；請改用新的 `.html` 檔」；PWA 使用者依「有新版本，重新整理」更新即可 |
| SD-FB-64 | （v0.10）題庫為空（Q = 0，資料缺漏）時模擬測驗頁沿用 v0.14 空畫面，不顯示「已答對 K / Q 題」與開關；store 的模擬測驗 action 不動作 | QA | 待辦（知會） | 屬 C-6 防禦行為，契約 §5.11 名詞段已允許 |
| SD-FB-65 | （v0.11）QA 既有資產仍寫舊文字：`tests/e2e/e2e-pwa-update.mjs`、`tests/e2e/e2e-version.mjs`（以及 `e2e-firstrun.mjs`、`e2e-reinit.mjs`、`e2e-mic.mjs` 中的「重新整理」字樣需逐一確認是否為按鈕定位）、`tests/tools/tc-desc.json`、`docs/04-qa/test-plan.md` TC-36-03c、TC-42-04d、TC-VER-H3、TC-TRK-H1 的期望文字 | QA、主控 | 待辦（知會） | 本次使用者決定不跑 QA；下次 QA 輪次先把定位與期望文字改為「有新版本，請更新版本」「更新版本」，並新增 AC-23-07 的 TC |
| SD-FB-66 | （v0.11）`services/pwa.js`、`pwa/sw.template.js` 的註解仍寫「按『重新整理』」（UP-4 舊稱）。不影響行為與 AC（交付 HTML 的靜態檢查只禁止完整舊提示句「有新版本，重新整理」），且改 `sw.template.js` 只會讓 `sw.js` 多一個無意義差異，因此不納入 FE-77 | 主控 | 待辦（知會） | 下次有任務修改這兩個檔案時順帶更新註解 |
| SD-FB-67 | （v0.11，契約 FB-61、QA BUG-004）R-24 起因是人類直接改 `dist/`；`dist/` 是建置產物，下次建置會被覆寫，且手改會造成交付檔與部署版不一致 | 人類、主控 | 待辦（知會） | 日後文字調整請改需求（PRD）或請主控派任務改 `src/app/` 後重建；主控以 FE-77 回報確認 BUG-004 可結案 |

---

## 16. 變更紀錄

| 版本 | 日期 | 作者 | 說明 |
| :--- | :--- | :--- | :--- |
| 0.1 | 2026-10-30 | sd-agent | 初版：依 PRD v0.6、契約 v0.4 設計分層架構、目錄與負責代理、模組介面、建置流程（B-1～B-9）、檔案大小估算（FB-17 結案，預期 3.1 MB）、關鍵演算法、字庫 15 批分檔與撰寫慣例（P／T／O）、自查與 QA 抽查門檻、RWD、測試策略、16 項風險；拆 41 個任務（CT 23、FE 18），141 個 AC 全部涵蓋；回應 FB-04、05、06、10、14、16、17、20、21、22；回饋上游 SD-FB-01～07 |
| 0.2 | 2026-10-30 | sd-agent | 依 /pg-run 階段 PG 回報修訂（v0.1 已由 JimmyLin 核准，改回 draft）：(1) FE-01 回報 `<meta charset>` 落在第 1,541 byte，超出 HTML 規範的前 1,024 bytes → §5 改模板開頭順序為 DOCTYPE → html → head → meta charset → 授權註解，B-1 檢查規則與 B-7 新增 charset 位置檢查，§2 架構圖、T-17 同步；授權註解仍在原始碼開頭，不影響 AC-23-06。(2) `npm test` 改為 `node --test src/app/__tests__/*.test.js`，`engines` 改 `>=22`（§3、§5、§10、T-18）。(3) §7.1 補登 `parseScoreInput` 回傳格式 `{ ok, score }`／`{ ok, message }`、`SCORE_INVALID_MESSAGE`、`levelOf`、`isOpenColor`；決議字串只接受十進位寫法（拒絕 `1e2`、`0x64` 等）；§4.3 註明 `setDraftScore` 的 `error` 來源。(4) §7.3 統一 `score(recognized, target)` 寫法與驗算例；§7.4 補異常輸入處理表，四選一效能改以 1,000 次平均 < 1 ms 判定。(5) 新增 §12.1 待派補修 R2-1（FE-01）、R2-2（FE-03）。tasks.json 同步修改 FE-02、FE-18 的 description／doneWhen，與 FE-01 description 中的 `npm test` 指令與 engines 文字。PRD、契約、localStorage 結構皆未變更。**主控代核**（2026-10-30，依 CLAUDE.md「第 4 階段自動化授權」：未改 PRD、未改持久化結構） |
| 0.3 | 2026-10-30 | sd-agent | 依 /pg-run 後段 PG 回報的設計問題修訂（v0.2 已由主控代核，改回 draft）：(1) R6-1：§4.1 新增模組取用時機 LD-1～LD-3（core 只能在載入時取用 constants、wordkey，其餘 core 依賴在函式呼叫時才取用；不改建置順序），註明回歸測試位置 `backup.test.js` R6-1 案例與 FE-19 `load-order.test.js`；§2 L1 依賴規則同步；T-19。(2) FE-07 #2：範本注入容量不足**不沿用**一般寫入做法，改為與新增自訂字相同的回滾 + 「儲存空間不足」（§4.3、§7.5，含容量不足分類總表）；SD-FB-08。(3) FE-07 #4：確認測驗模式在單字集不足時退回 card（目前題目保留、出新題失敗才退回、不另顯示 toast），寫入 §4.3。(4) FE-11：§4.3、§4.4 補註 `AppState = { data, runtime }`、`state.runtime.flashcard`。(5) FE-12 #1：§9 新增停用按鈕例外（`aria-disabled="true"` + `title`）與 QA 判定。(6) FE-12 #2：§7.6 新增 STT 錯誤對照表，含 `audio-capture`；SD-FB-09。(7) FE-17：§7.6 寫明辭典只在有單字 `meaningSource` 使用時列出。(8) FE-09：字量 0 改由 `goal.js` 統一視為資料缺漏（§7.1），補修 R3-1。(9) CT-02：§8.4 註明個別任務用 `--file`、`--all` 由 CT-23／主控於全部完成後執行。(10) CT-03、CT-05：V-VOC-17 不加白名單，以紀錄逐筆寫判斷視為已處理，並訂 QA 判定（§8.4、§8.5）。(11) CT-01：H-1 加繁簡同形白名單（含「后」），命中改為 H-1W 警告，補修 R3-4。(12) 新增任務 FE-19（頁面單元測試移入 `src/app/__tests__/`，FE-18 之前）：§3 目錄、§10 測試規則（相對路徑、`.test.js`、不讀正式資料）、§12 批次、T-20、T-21。新增 §12.2 待派補修 R3-1～R3-4；§13 AC-18-04 加 FE-10。**tasks.json 本次未修改**（主控同步中）：FE-19 任務 JSON 與 FE-18 `dependsOn` 加 `FE-19` 由主控加入。PRD、契約、localStorage 結構皆未變更。**主控代核**（2026-10-30，依 CLAUDE.md「第 4 階段自動化授權」：未改 PRD、契約、持久化結構） |
| 0.4 | 2026-10-30 | sd-agent | 修訂已核准的 v0.3（主控代核），原因：PRD v0.8（R-15 功能更名、R-16 介面互動、R-17 今日已學與持久化 `schemaVersion` 1 → 2）與契約 v0.8（§5.4 LR-1～LR-8、§5.5 FS-1～FS-7、§5.6、§6.3、MG-1～MG-4、RD-1／RD-2、IM-8、V-ST-09～V-ST-13、`TAB_LABELS`、`NAV_TAB_ORDER`、FB-27～FB-32）皆已由 JimmyLin 核准。status 改回 draft、核准欄位清空；**本版設計涉及持久化結構變更的實作，依 CLAUDE.md 須由人類核准**。增量內容：(1) §1、§2、§3 新增模組 `core/learning.js`、`core/interaction.js`、`ui/motion.js`、`ui/bottom-nav.js`、`ui/import-flow.js`、`services/haptics.js`、`styles/05-motion.css` 與 7 個新測試檔，既有檔案標示 v0.4 修改任務串接順序（D-6、D-7：不改 `src/data/`、不建 CT 任務）；(2) §4.2 啟動順序、`body[data-entry]`／`data-tab`、router 新行為；§4.3 store 新 API（`today`、`startLearning`、寫入守門、學習事件、tags）；§4.5 共用模組介面；(3) §6.1 交付檔（約 +62 KB）與 localStorage 容量估算（回應契約 FB-32：最壞約 0.8 MB，不做延遲寫入）；(4) §7.7 學習紀錄函式與記錄點、LR-7 實作；§7.8 v1 → v2 遷移與備份流程；§7.9 首次進入狀態機與畫面做法；§7.10 手勢判斷與測驗防誤觸；§7.11 動畫與減少動態策略（A-1～A-5）；§7.12 Q-33 設計常數（640px、240／360／200／480／500 ms、50px、震動 40 與 [60, 40, 60]）；§7.13 R-15 更名清單；(5) §9 導覽、卡片、動畫類名、色彩，§9.1 底部導覽 CSS；(6) §10.1 測試命令、中間狀態已知失敗、新增測試案例、E2E 與人工建議；(7) §11 新增 T-22～T-31；(8) §12.3 新任務 FE-20～FE-33 與 6 個批次；(9) §13.1 新增 51 個 AC 與修改／更名 AC 的追加對照（192 個 AC 全部涵蓋）；(10) §15 新增 SD-FB-10～SD-FB-19。tasks.json 同步升為 v0.3（只新增任務，既有任務不變） |
| 0.4（核准） | 2026-10-30 | 主控 | 主控代核：持久化結構變更已由人類於契約 v0.8 核准，本版只實作該契約，不改 PRD、不另改持久化結構；tasks.json v0.3 經 check_tasks 驗證，AC 192/192 涵蓋，新任務彼此無共用 paths。 |
| 0.4（主控代核補記） | 2026-10-30 | 主控 | /pg-run 中授權一次性擴充 paths（不改 PRD、不改持久化結構）：FE-26 修改 `src/app/__tests__/naming.test.js` 導覽按鈕比對（按鈕內含 svg）；FE-30 修改 `src/app/__tests__/_fixtures.js`：`makeStore()` 預設預寫 v2 主鍵，`opts.firstRun: true` 才模擬首次（首次模式 FS-2 不寫入導致既有測試失敗）。 |
| 0.5 | 2026-11-02 | sd-agent | 修訂已核准的 v0.4（主控代核），原因：PRD v0.9（approved，JimmyLin，2026-11-02；R-18、US-32、US-33、AC-20-04、Q-36～Q-38）與契約 v0.9（README、data-schema.ts approved，主控代核；storage-schema.json 維持 v0.8）。status 改為 `in-review`、核准欄位清空。增量內容：(1) **推翻**「不直接存取麥克風音訊」限制：允許 `getUserMedia` + `AnalyserNode` 只讀即時音量，仍禁止 `MediaRecorder`、音訊輸出、網路傳送與保存；新增 §7.14（隱私限制、收音條常數與可調範圍 DS-01、麥克風生命週期與只在單字卡頁保留 Q-36／DS-02、`services/mic.js` API、錯誤對照 DS-03、speech-panel 修改）；修訂 §7.6 STT 列與 `audio-capture` 對照、§7.11 新增 A-6（收音條非動畫、無 transition）、A-7（確認視窗無淡入）、§10 靜態檢查（AC-21-03 改為只禁 `MediaRecorder` 並限制 `getUserMedia` 位置）、§5 B-7 擋 `MediaRecorder`；(2) 新增 §7.15 切換難易度初始化（流程、視窗文字、`core/reinit.js`、原子寫入位置 DS-04）與 §4.3 store 新 API；(3) 新增 §7.16 隱藏頁（導覽 4 項、主控台入口、router 與 hashchange 守門、store `setTab` 守門、保留程式與資料 DS-05），§7.13、§9、§9.1、§4.2 同步；(4) §1、§2、§3（新檔 `core/meter.js`、`core/reinit.js`、`services/mic.js` 與 3 個新測試檔；D-8 新任務間無共用 path、D-9 不改 `src/data/`）、§4.4、§4.6、§6.2；(5) §10.2 測試範圍、中間狀態已知失敗、E2E 建議與 **V-MIC** 實機驗證（Windows 11、Chrome 與 Edge 以 `file://` 開啟）；(6) §11 新增 T-32～T-39；(7) §12.4 新任務 FE-34～FE-41 與 4 個批次；(8) §13.2 新增 20 個 AC 與修改 AC 對照（應驗收 196 個全部涵蓋）、16 個暫停 AC 的處理；(9) §14 回應 DS-01～DS-06、FB-33～FB-35；§15 新增 SD-FB-20～SD-FB-27。tasks.json 同步升為 v0.4（只新增 FE-34～FE-41，既有任務不變）。不改 PRD、不改持久化結構（`schemaVersion` 維持 2） |
| 0.6 | 2026-11-02 | sd-agent | 修訂已核准的 v0.5（JimmyLin 核准），原因：PRD v0.10（approved，JimmyLin，2026-11-02；R-19「只選色級、不顯示分數」、Q-39 預設 725、Q-40 不新增鍵盤 AC、新增 AC-26-05／AC-26-06、改寫 AC-22-04 等、暫停 6 條分數輸入 AC）與契約 v0.10（三檔 approved，主控代核；§5.9 GS-1～GS-8、V-ST-16、§9.4 DS-07～DS-10、FB-36）。status 改為 `in-review`、核准欄位清空。增量內容：(1) §7.1 新增 `scoreForCard`、移除 Q-32 邏輯、`scoreAfterColorClick` 改語意；預設分數只引用 `SCORE_DEFAULT`（725）；(2) 新增 §7.17（資料流、分數區以 `hidden`＋`inert`＋`disabled`／`tabindex=-1` 隱藏且保留程式、「套用」「開始學習」不再讀輸入框、卡片無分數範圍、狀態列與主控台無目標分數、取消初始化確認後卡片回原色級、AC-22-04 量測點改為點卡片）；(3) §1、§3（D-10）、§4.3 v0.6、§7.9 狀態機、§9 同步；(4) §10.3 測試範圍、中間狀態已知失敗、E2E 建議；(5) §11 新增 T-40～T-44；(6) §12.5 新任務 FE-42～FE-44 與 3 個批次（依序執行）；(7) §13.3 新增 2 個 AC 與改寫 AC 對照（應驗收 192 個全部涵蓋）、6 個暫停 AC 的處理；(8) §14 回應 DS-07～DS-10、FB-36；§15 新增 SD-FB-28～SD-FB-30。tasks.json 同步升為 v0.5（只新增 FE-42～FE-44，既有任務不變）。不改 PRD、不改持久化結構（`schemaVersion` 維持 2）、不改 `src/data/` |
| 0.7 | 2026-11-02 | sd-agent | 修訂已核准的 v0.6（JimmyLin 核准），原因：PRD v0.11（approved，JimmyLin，2026-11-02；R-20 PWA、US-34～US-37、AC-24-12、Q-41～Q-48，修改 AC-19-01、AC-21-01、AC-21-03、AC-23-02、AC-23-06）與契約 v0.11（三檔 approved，主控代核；§10 DP／MF／HD／PE／SW／UP／IN／NT／PV、V-PWA-01～12、§9.5 DS-11～DS-18、FB-37～FB-43）。status 改為 `in-review`、核准欄位清空。增量內容：(1) §1 新增 6 列（交付形態、PWA 啟用、service worker、建置識別碼、部署、PWA 畫面）；§2 新模組層別與 PWA 流程圖；(2) §3 目錄：部署目錄 `dist/site/`（8 檔）、`dist/english-master-track.html` 保留、`sources/deploy/ads.txt`（DS-12）、`src/app/assets/icons/`（DS-14）、`src/app/pwa/sw.template.js`、`core/pwa.js`、`services/pwa.js`、`ui/pwa-notice.js`、`styles/80-pwa.css`、`tools/serve.mjs`、4 個新測試檔；D-11、D-12；(3) §4.2 v0.7 啟動順序與 `index.html`、§4.3 `setPwa`、§4.7 PWA 模組介面；(4) §5 新命令、§5.1 建置 B-10～B-16 與 B-7 逐字白名單（不放寬既有禁止規則）、`build()` 回傳與參數、可重現性檢查（現有建置無時間戳與亂數）、`serve.mjs`；§5.2 新 workflow 全文（Node 22、不執行 `npm ci`、上傳 `dist/site`）；(5) §6.3 大小與 Cache Storage 估算；(6) §7.18 PWA 設計（兩種形態、BUILD_ID、`sw` 範本、啟動與註冊、更新流程、安裝狀態機、畫面配置、隱私對照）；(7) §9 v0.7 樣式；(8) §10.4 單元測試、E2E（localhost）與人工 V-PWA-H1～H5；(9) §11 新增 T-45～T-54；(10) §12.6 新任務 FE-45～FE-53、主控項目 MC-01～MC-03 與 5 個批次；(11) §13.4 新增 29 個 AC 與修改 5 個 AC 的對照（應驗收 221 個全部涵蓋）；(12) §14 回應 DS-11～DS-18、FB-37～FB-43；§15 新增 SD-FB-31～SD-FB-38。tasks.json 同步升為 v0.6（只新增 FE-45～FE-53 與 `manualSteps`，既有任務不變）。不改 PRD、不改持久化結構（`schemaVersion` 維持 2）、不改 `src/data/` |
| 0.8 | 2026-11-03 | sd-agent | 修訂已核准的 v0.7（JimmyLin 核准），原因：PRD v0.12（approved，JimmyLin，2026-11-03；R-21 版面與視覺、US-38～US-41、Q-49～Q-57，新增 27 條、修改 30 條 AC）與契約 v0.12（三檔 approved，主控代核；§11 NM／VC／DB／FT／MT／V-LAY、data-schema §13、§9.6 DS-19～DS-25、FB-44～FB-49）。status 改為 `in-review`、核准欄位清空。增量內容：(1) §1 新增 5 列；§2 `core/layout.js` 層別；§3 檔案異動表與 D-13；(2) §4.8 `core/layout.js` API、store `runtime.dashboard`／`setBackupExpanded`、`installVisible` 新條件、各 view 匯出變更；(3) §5.3 建置 B-12 改檢查 `<title>EnglishContext</title>`；§6.4 大小（約 +8 KB）；(4) 新增 §7.19：CSS token 重整（`--primary` 改深品牌色、新增 `--brand`／`--brand-deep`／`--accent`／`--tint`／`--track`／`--chart-bar`／`--line`、`--border` 用途限縮、禁止寫法掃描）、共用元件（卡片 16px 陰影無框、`.btn--accent`、全域 `tabular-nums`、焦點框）、標題列內嵌 SVG 圖示、主控台 DOM 與尺寸、首次畫面與精簡色級列與固定底部列、模擬測驗進度條、單字卡頁只換配色、名稱與來源名稱、PWA 同步、效能與無障礙評估；(5) §9 取代說明與新類名；(6) §10.5 單元與 E2E 量測分工、中間狀態已知失敗（預期無）；(7) §11 新增 T-55～T-66；(8) §12.7 新任務 CT-24、FE-54～FE-62 與 3 個批次；(9) §13.5 新增 27 個 AC 與修改 30 個 AC 對照（應驗收 248 個全部涵蓋）；(10) §14 回應 DS-19～DS-25、FB-44～FB-49；§15 新增 SD-FB-39～SD-FB-49（SD-FB-39 為 PRD 內部衝突，需人類決議）。tasks.json 同步升為 v0.7（只新增 CT-24、FE-54～FE-62，既有任務不變）。不改 PRD、不改持久化結構（`schemaVersion` 維持 2）；`src/data/` 只改 ORIGINAL `fullName` |
| 0.9 | 2026-11-03 | sd-agent | 修訂已核准的 v0.8（JimmyLin 核准），原因：PRD v0.13（AC-38-01 標題列圖示例外）與 v0.14（approved，JimmyLin，2026-11-03；R-22：US-42 網站版本號、US-43 隱藏領域範本、AC-01-08 狀態列只顯示生效色級、AC-39-04 目標行與「變更」按鈕、修改 13 條、暫停 AC-05-01～05、Q-58～Q-62）、契約 v0.14（三檔 approved，主控代核；§12 VR-1～VR-9、LS-1～LS-5、V-VER-01～06、V-LAY-09～10、§5.8 HT-6～HT-9、data-schema §14、§9.7 DS-26～DS-31、FB-50～FB-53）、`package.json` `version` 1.0.0（Q-62）。status 改為 `in-review`、核准欄位清空。增量內容：(1) §1 新增 4 列；§2 新模組層別 `core/version.js`（L1，建置共用）、`ui/version-line.js`（L4）；§3 檔案異動表與 D-14；(2) §4.9 模組介面（`core.version`、`ui.versionLine`、`layout.goalLineText`／`levelStatusText`、dashboard／customizer／custom-vocab 變更）；(3) §5.4 建置 B-17～B-19：佔位 `@@APP_VERSION@@`、讀 `package.json` `version` 並以 `APP_VERSION_PATTERN` 驗證、寫入後才算 BUILD_ID、產物無 `@@` 殘留、`--package` 參數、三情境；§6.5 大小（約 +3 KB）；(4) 新增 §7.20：頁尾版本行（DOM、讀取時機、異常值、對比、底部遮擋與 AC-41-04 確認不需新留白）、隱藏範本區與 DS-27 文字定案（範本單字只標「自訂擴充」）、狀態列一行、目標行與「變更」外框按鈕、效能與無障礙；(5) §10.5 註記 SD-FB-39 結案；新增 §10.6 單元／E2E 分工；(6) §11 新增 T-67～T-74；(7) §12.8 新任務 FE-63～FE-69 與 3 個批次；(8) §13.6 新增 8 個 AC、修改 13 個 AC 對照（應驗收 251 個全部涵蓋）；(9) §14 回應 DS-26～DS-31、FB-50～FB-53；§15 新增 SD-FB-50～SD-FB-56。tasks.json 同步升為 v0.8（只新增 FE-63～FE-69，既有任務不變）。不改 PRD、不改持久化結構（`schemaVersion` 維持 2）、不改 `src/data/` |
| 0.10 | 2026-11-04 | sd-agent | 修訂已核准的 v0.9（JimmyLin 核准），原因：PRD v0.15（approved，JimmyLin，2026-11-04；R-23：US-44 單字卡記住位置、US-45 模擬測驗答對紀錄、US-46 只練沒答對的題目、US-47 保存與相容，AC-44-01～AC-47-08 共 36 條，修改 AC-18-01、AC-24-02、AC-32-02、AC-42-02，E-102～E-117，Q-63～Q-71）與契約 v0.15（三檔 approved，Q-63 持久化結構變更由人類核准；`schemaVersion` 2 → 3、C-8、MG-5～MG-8、RD-3、RD-4、FP-1～FP-9、CR-1～CR-9、UO-1～UO-9、WR-1～WR-5、IM-9、IM-10、V-P5-08、V-ST-18～V-ST-22、CI-4／CI-5／CI-8 修改、data-schema §15、§9.8 DS-32～DS-39、FB-54～FB-60）。status 改為 `in-review`、核准欄位清空。增量內容：(1) 文首加註 C-8 改讀規則與 v0.10 導讀；§1 新增 5 列；§2 新模組層別 `core/position.js`、`core/part5flow.js`（皆 L1）與資料流；§3 檔案異動表、不改清單與 D-15；(2) 新增 §4.10 模組介面（position、part5flow、layout、constants、persist、backup、reinit、store 新增與修改 action、`commitWrite`、`placeCard`、part5 view）；(3) 新增 §5.5（建置不改、順序限制）、§6.6（約 +28 KB、localStorage < 3 KB）；(4) 新增 §7.21：v2 → v3 讀取與匯入流程、測試樣本來源與產生方式、既有測試 `schemaVersion` 2 位置表（DS-32）；單字卡位置掛點表、不變式 INV-FP、取代舊定位邏輯的等價性（DS-33）；模擬測驗狀態轉移表與邊界保證（DS-34）；畫面文字定稿（全部答對說明句、確認對話框標題與內文）、DOM 結構、樣式、互動與焦點（DS-35）；`commitWrite` 與容量不足提示收斂（DS-36）；V-P5-08 快照檢查（DS-37）；版本 1.1.0（DS-38）；效能與無障礙；(5) 新增 §10.7 單元／E2E／人工驗收分工；(6) §11 新增 T-75～T-86；(7) 新增 §12.9 任務 FE-70～FE-76、CT-25、MC-04 與 5 個批次；(8) 新增 §13.7 對照（應驗收 287 個 AC 全部涵蓋）；(9) §14 回應 DS-32～DS-39、FB-54～FB-60；§15 新增 SD-FB-57～SD-FB-64。tasks.json 同步升為 v0.9（只新增任務，既有任務不變）。不改 PRD、不改契約；`src/data/` 資料檔不改（CT-25 只改 `_tools/`、`_records/`） |
| 0.11 | 2026-11-04 | sd-agent | 修訂已核准的 v0.10（JimmyLin 授權、主控代填），原因：PRD v0.16（approved，JimmyLin，2026-11-04；R-24：人類手改產物後決定併入 1.1.0——更新提示文字改為「有新版本，請更新版本」／「更新版本」、「資料來源與授權」頁新增 1 行聯絡 email；新增 AC-23-07，修改 AC-36-03、AC-42-04 文字，E-118～E-120）與契約 v0.16（三檔 approved，主控代核：`PWA_TEXTS` 新文字、`SOURCES_CONTACT_TEXT`、L-7、DS-40、FB-61、FB-62）。status 改為 `in-review`、核准欄位清空。增量內容：(1) 文首上游、搭配文件與 v0.11 導讀（含舊提示文字的改讀規則）；§1 新增 3 列；§3 新增 D-16；(2) 新增 §5.6（不改建置程式、靜態檢查放測試、重新建置取代手改 `dist/`、版本 1.1.0）；(3) 新增 §7.22：提示文字修改點與不改清單、聯絡行常數位置、DOM 位置、非連結與不可聚焦、樣式與字級理由（0.8125rem，備援 0.75rem）、防爬蟲靜態規則；(4) 新增 §10.8：單元測試、建置與交付檢查、可選量測、主控檢查 H-1～H-4（使用者決定本次不跑 QA）；(5) §11 新增 T-87～T-90；(6) 新增 §12.10 任務 FE-77 與 1 個批次；(7) 新增 §13.8 對照（應驗收 288 個 AC 全部涵蓋）；(8) §14 回應 DS-40、FB-61、FB-62；§15 新增 SD-FB-65～SD-FB-67。tasks.json 同步升為 v0.10（只新增 FE-77，既有任務內容與 status 不變）。不改 PRD、不改契約、不改持久化結構（`schemaVersion` 3）、不改 `src/data/`、不改 `package.json` |
