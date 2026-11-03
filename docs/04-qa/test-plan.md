---
doc: TEST-PLAN
version: 0.7
status: in-review
author: qa-agent
approved_by:
approved_at:
---

# English Master Track — 測試計畫（第 5 階段驗收）

> **v0.7（第 6 輪，2026-11-03）**：範圍擴大為 PRD v0.14（R-22：新增 US-42 網站版本號、US-43 隱藏領域範本、AC-01-08 共 8 個 AC，修改 13 個 AC，暫停 AC-05-01～AC-05-05）。新增 §1.3、§2.6、§4.3、§6.3，§5、§7 依第 6 輪結果重新產生。第 5 輪以前的內容保留。
>
> **v0.6（第 5 輪，2026-11-03）**：範圍擴大為 PRD v0.13（版面風格調整：新增 US-38～US-41 共 27 個 AC，修改 30 個 AC；AC-38-01 依 v0.13 以標題列品牌圖示為例外）。新增 §1.2、§2.5、§4.2、§6.2，§5、§7 依第 5 輪結果重新產生。第 4 輪以前的內容保留。
>
> **v0.5（第 4 輪，2026-11-03）**：範圍擴大為 PRD v0.11（新增 PWA：US-34～US-37、AC-24-12，修訂 AC-19-01、AC-21-01、AC-21-03、AC-23-02、AC-23-06）。新增 §1.1、§2.4、§4.1、§6.1，§5、§7 依第 4 輪結果重新產生。第 3 輪以前的內容保留。
>
> v0.4（第 3 輪，2026-11-02）：範圍由 PRD v0.7 擴大為 PRD v0.10（含 v0.8、v0.9、v0.10 增量）。v0.3 以前的 TC、判定規則與歷史紀錄保留在本檔，已不適用的部分以「（第 3 輪：…）」註明。

## 1. 範圍與依據

| 項目 | 內容 |
| :--- | :--- |
| 驗收範圍 | all：PRD v0.10 共 33 個 US、214 個 AC。應驗收 **192 個**；暫停 22 個標「不適用（暫停）」（v0.9 隱藏解碼器 9 個 AC-12-01～AC-14-02、句型庫 7 個 AC-15-01～AC-16-04；v0.10 分數輸入隱藏 6 個 AC-01-06、AC-02-01、AC-02-02、AC-02-07、AC-02-09、AC-26-03） |
| 驗收標準 | `docs/01-PRD.md` v0.10 的 AC（唯一標準） |
| 參考文件 | `docs/02-contract/` v0.10（§5.7 CI-1～CI-10、§5.8 HT-1～HT-5、§5.9 GS-1～GS-8、FB-35、FB-36）、`docs/03-design/architecture.md` v0.6（§7.14 麥克風與收音條、§7.15 初始化、§7.16 隱藏頁、§7.17 只選色級、§10 測試策略、§10.2 V-MIC）、`docs/03-design/tasks.json` v0.5（67 個任務，全部 done） |
| 受測物 | `dist/english-master-track.html` 3,241,023 bytes（QA 以 `tools/build.mjs --out` 重建後位元組相同，TC-S09）；資料檔 `src/data/`；程式 `src/app/` |
| 不在本計畫 | PG 的單元測試（`npm test` 836 項）與資料自驗（`npm run validate:data`）由 PG 負責；QA 只在報告記錄其執行結果，驗收結論以本計畫的 TC 為準 |

### 1.1 第 4 輪範圍（PRD v0.11）

| 項目 | 內容 |
| :--- | :--- |
| 驗收範圍 | PRD v0.11 共 37 個 US、243 個 AC；應驗收 **221 個**（v0.11 新增 29 個：AC-34-01～10、AC-35-01～05、AC-36-01～07、AC-37-01～06、AC-24-12；修訂 5 個：AC-19-01、AC-21-01、AC-21-03、AC-23-02、AC-23-06）；暫停 22 個維持「不適用（暫停）」 |
| 參考文件 | 契約 v0.11（README §10 PWA 契約，V-PWA-01～12）、architecture v0.7（§5.1 建置、§5.2 部署 workflow、§7.18 PWA、§10.4 測試範圍）、tasks.json（FE-45～FE-53 done；主控 MC-01、MC-02 done；MC-03 未執行） |
| 受測物 | `dist/english-master-track.html` 3,278,334 bytes＋部署目錄 `dist/site/`（8 檔；初測 BUILD_ID `d7085fd3fb24c46f`，BUG-003 修正後 `5b5ae7a6d4bd0164`）；QA 重建 2 次與 `dist/` 逐位元組相同 |
| 回歸 | `npm test`、`npm run validate:data`、靜態檢查、越界檢查、既有 E2E 全套 |
| 已知事項（不列缺陷） | maskable 圖案縮放 78%（SD-FB-31，判定標準：文字在 80% 安全圓內）；按「重新整理」前本專案快取暫有 2 份（FB-39）；本機與 CI 的 BUILD_ID 可能因 CRLF 不同（SD-FB-37） |
| 授權例外（不算越界） | `src/app/assets/icons/`、`sources/`（主控，SD-FB-33）；`.gitignore`、`.gitattributes`（主控依人類決定）；`docs/01-PRD.md`、`docs/02-contract/`、`docs/03-design/` 的核准欄位與變更紀錄 |

### 1.2 第 5 輪範圍（PRD v0.13，版面與視覺）

| 項目 | 內容 |
| :--- | :--- |
| 驗收範圍 | PRD v0.13 共 41 個 US、270 個 AC；應驗收 **36 個 US、248 個 AC**；暫停 22 個維持「不適用（暫停）」 |
| 新增 AC（27） | AC-38-01～10、AC-39-01～10、AC-40-01～03、AC-41-01～04 |
| 修改 AC（30） | AC-01-01、AC-01-02、AC-01-07、AC-17-01、AC-17-06、AC-22-05、AC-35-04、AC-23-02、AC-24-01、AC-24-12、AC-34-07、AC-24-10、AC-30-12、AC-32-02、AC-25-01、AC-25-02、AC-25-03、AC-25-06、AC-25-10、AC-26-06、AC-26-01、AC-30-01、AC-30-10、AC-33-02、AC-34-01、AC-34-02（R-21）；AC-36-01、AC-34-03、AC-34-05、AC-34-08（上一版回饋）；AC-38-01 再於 v0.13 修改（SD-FB-39） |
| 參考文件 | 契約 v0.13（README §11 NM／VC／DB／FT／MT、V-LAY-01～08；data-schema.ts §13）；architecture v0.8（§7.19 設計細節、§10.5 QA 分工、§15 SD-FB-39～49）；tasks.json v0.7（CT-24、FE-54～FE-62 done）。樣稿 `docs/mockups/v0.12-layout-demo.html` 只供參考，與 AC 不一致時以 AC 為準 |
| 受測物 | `dist/english-master-track.html` 3,308,145 bytes＋`dist/site/` 8 檔（BUILD_ID `962e0f286c63e9e6`）；QA 以 `tools/build.mjs --out` 重建與 `dist/` 逐位元組相同（TC-S09） |
| v0.11 對照版 | git 提交 `4fcbb9f`（v0.11 交付）的 `dist/english-master-track.html`，以 `git show` 取出到暫存目錄（AC-38-03、AC-38-08、AC-38-10 (2)）；AC-37-06 的「加入 PWA 前版本」改取提交 `e9372f2` |
| 回歸 | `npm test`、`npm run validate:data`、靜態檢查、越界檢查、`npm run test:e2e` 全套（含 PWA，`tools/serve.mjs` 埠 8080） |
| 授權例外（不算越界） | `docs/mockups/`（主控放置）；`docs/01-PRD.md`、`docs/02-contract/`、`docs/03-design/` 的核准欄位與變更紀錄（主控填寫） |

### 1.3 第 6 輪範圍（PRD v0.14，版本號與介面精簡）

| 項目 | 內容 |
| :--- | :--- |
| 驗收範圍 | PRD v0.14 共 43 個 US、278 個 AC；應驗收 **37 個 US、251 個 AC**；暫停 27 個標「不適用（暫停）」（v0.9 16 個、v0.10 6 個、v0.14 新增 AC-05-01～AC-05-05） |
| 新增 AC（8） | AC-42-01～AC-42-04（US-42 網站版本號）、AC-43-01～AC-43-03（US-43 隱藏領域範本）、AC-01-08（狀態列只顯示生效色級） |
| 修改 AC（13） | AC-01-02、AC-01-06（暫停中）、AC-01-07、AC-17-06、AC-22-02、AC-25-02、AC-25-03、AC-25-06、AC-26-06、AC-32-05、AC-36-02、AC-39-04、AC-41-04 |
| 參考文件 | 契約 v0.14（README §12：VR-1～VR-9、LS-1～LS-5、V-VER-01～06、V-LAY-09／10；§5.8 HT-6～HT-9；FB-51「範本單字只標自訂擴充」）；architecture v0.9（§7.20 設計細節、§10.6 QA 分工；SD-FB-54 定位點）；tasks.json v0.8（FE-63～FE-69 done） |
| 受測物 | `dist/english-master-track.html`＋`dist/site/` 8 檔（BUILD_ID `436e27b40282d4af`，版本行「版本 1.0.0（建置 436e27b）」）；QA 以 `tools/build.mjs --out` 重建與 `dist/` 逐位元組相同（TC-S09、TC-42-04a） |
| v0.13 對照版 | git 提交 `8a266c3` 的 `dist/english-master-track.html`（`git show` 取到暫存目錄），在其畫面實際按「資工」範本與表單新增 1 字，產生 AC-43-03 的 localStorage 與備份檔 |
| 回歸 | `npm test`、`npm run validate:data`、靜態檢查、越界檢查、`npm run test:e2e` 全套（含 PWA、Edge 冒煙；`tools/serve.mjs` 埠 8080） |
| 越界基準 | git HEAD `8a266c3`；本輪變更須在 FE-63～FE-69 paths 內 |
| 授權例外（不算越界） | `package.json`（Q-62，主控把 version 改為 1.0.0）；`docs/01-PRD.md`、`docs/02-contract/`、`docs/03-design/` |

## 2. 測試方式

| 方式 | 工具／位置 | 說明 |
| :--- | :--- | :--- |
| 自動化（資料檢查） | `tests/data/data-check.mjs` | 獨立實作，以 `node:vm` 載入資料檔，依契約 §4.1 自 `sources/wordlists/` 重算排名（第 3 輪資料未變更，照常全跑） |
| 自動化（紀錄完整性） | `tests/data/records-check.mjs` | architecture §8.4：`validate.mjs --all --max 100000` 的 V-VOC-17、H-1W、V-VOC-09 在 `_records/` 皆有對應列 |
| 自動化（靜態檢查） | `tests/static/static-check.mjs` | TC-S01～TC-S10。**第 3 輪**：TC-S05 改依 architecture §10 v0.5（只禁 `MediaRecorder`；`getUserMedia` 只能在 `services/mic.js`；`mic.js` 不得含輸出、傳送、儲存字串；speech-panel 不把音量傳給 store）；TC-S01 排除人類自放的 `dist/ads.txt`；新增 TC-S10（AC-31-04） |
| 自動化 E2E | `tests/e2e/*.mjs`、`tests/e2e/lib/cdp.mjs`、`inits.mjs`、`state.mjs` | 以 CDP 驅動本機無頭 Chrome（`--headless=new`），`file://` 開啟 `dist/`；真實滑鼠／觸控／鍵盤事件（`Input.dispatch*`）。未安裝任何套件 |
| QA 檢視 | `tests/results/qa-review.json` | 內容抽查（V-VOC-18、V-VOC-17、Part 5 正解唯一性）、越界判讀、跨瀏覽器冒煙 |
| 越界檢查 | `tests/static/boundary-check.mjs`、`boundary-delta.mjs`（第 3 輪新增） | 前者：每個檔案是否屬於某任務 `paths`；後者：PRD v0.8 驗收暫停後（2026-10-30 18:20）修改的 `src/`、`tools/`、`dist/`、`sources/` 檔案是否都在 FE-34～FE-44 的 `paths` 內 |
| AC 對照產生 | `tests/tools/ac-matrix.mjs`（第 3 輪新增） | 讀 PRD 的 AC 清單與 `tests/results/summary.json`，產生 §7 對照與報告的 AC 判定 |
| 人工 | §6 | 真機才能驗證的項目（含 V-MIC-1～V-MIC-5） |
| 自動化（PWA 靜態與建置，第 4 輪） | `tests/static/pwa-static.mjs` | TC-PS-01～TC-PS-06（V-PWA-01～05、AC-19-01）、TC-36-01a～c、TC-36-02（V-PWA-06，建置輸出到暫存目錄）、TC-36-07a（依 architecture §5.2 新 workflow 本機模擬 MC-03） |
| 自動化 E2E（PWA，第 4 輪） | `tests/e2e/e2e-pwa.mjs`、`e2e-pwa-update.mjs`、`lib/pwa-env.mjs` | Playwright（devDependency `playwright-core` 1.64.1）驅動本機 Chrome（`channel: "chrome"`）與 Edge（`msedge`）。`browser.newContext({ serviceWorkers: "allow" })`，以 **context 層**的 `request`／`response` 事件記錄請求（含 service worker 發出的請求）；伺服器為 `tools/serve.mjs`（= `npm run serve`，埠 8080，`/english-master-track/`） |
| 一鍵執行 | `npm run test:e2e`（= `node tests/run-all.mjs`） | 依序執行上述自動化並彙整到 `tests/results/summary.json`（結果分「通過／失敗／待人工／不適用（暫停）」） |

### 2.1 模擬環境（architecture §10）

| 對象 | 模擬方式（`tests/e2e/lib/inits.mjs`，以 `Page.addScriptToEvaluateOnNewDocument` 注入） |
| :--- | :--- |
| TTS | 假 `speechSynthesis`：記錄文字、`lang`、`rate`、語音與 `cancel` 次數；有 en-US、只有非 en-US、API 不存在三種 |
| STT | 假 `webkitSpeechRecognition`：測試端呼叫 `emitResult`、`emitError`、`emitEnd`；或 API 不存在 |
| 麥克風（第 3 輪新增，`fakeMic`） | 覆寫 `navigator.mediaDevices.getUserMedia`：回傳測試頁自建 Web Audio 1 kHz 正弦波串流（`OscillatorNode` → `GainNode` → `MediaStreamDestination`，音量以 dBFS 設定、可設靜音），記錄呼叫次數與交付的音軌；`unplug()` 停止音軌並觸發 `ended`；模式 `denied`（`NotAllowedError`）、`notfound`（`NotFoundError`）、`notreadable`（`NotReadableError`）、`missing`（無 `mediaDevices`）、`nogum`（無 `getUserMedia`）。屬 QA 測試腳本，不在產品程式中（architecture §10.2）。瀏覽器另加 `--autoplay-policy=no-user-gesture-required` |
| 震動 | `fakeVibrate`：替身記錄參數、不存在、呼叫即拋例外 |
| 剪貼簿 | 覆寫 `navigator.clipboard`（第 3 輪句型庫暫停，未使用） |
| localStorage | 停用（`SecurityError`）、容量不足（`QuotaExceededError`，可於執行中開關）、資料損壞 |
| 既有狀態（第 3 輪，`lib/state.mjs`） | 直接寫入 `schemaVersion` 2 的 `englishMasterTrack:state` 後重新載入。構造既有分數時 `draftScore` 與 `appliedScore` 設為同一值（契約 FB-36） |
| 離線 | CDP `Network.emulateNetworkConditions { offline: true }` |
| 日期 | 固定日期 `fakeDate`、可調時鐘 `controllableClock`（跨午夜） |
| CPU 降速 | CDP `Emulation.setCPUThrottlingRate { rate: 4 }` |
| 減少動態 | CDP `Emulation.setEmulatedMedia`（`prefers-reduced-motion: reduce`） |
| 窄螢幕與觸控 | CDP `Emulation.setDeviceMetricsOverride`（375、640、641、768、1366、1920 寬）＋ `setTouchEmulationEnabled`；滑動以 `Input.dispatchTouchEvent` 分段移動 |
| 無障礙樹 | CDP `Accessibility.getFullAXTree`（AC-20-04、AC-26-05） |
| 無內建資料 | `tools/build.mjs --out <暫存> --data <只含 sources.js 的目錄> --no-site` 建置 fixture（AC-06-06、AC-09-06、AC-30-10）。第 4 輪：PWA 模式下資料目錄完全空白會因缺 `PROJECT_LICENSE.copyrightYear` 而 `LICENSE_YEAR` 中止（architecture §5.1 設計），改為保留 `sources.js`（無字庫與題庫，單字集仍為空） |

### 2.2 判定規則與已知決議

| 項目 | 判定 |
| :--- | :--- |
| 畫面文字 | PRD 以「」標出者逐字比對 |
| 暫停的 AC（第 3 輪） | PRD 標「v0.9 暫停（隱藏）」或「v0.10 暫停（分數輸入隱藏）」的 22 個 AC 不執行，結果記「不適用（暫停）」，不是「未測」 |
| 目標分數（v0.10，R-19） | 畫面不顯示分數；PRD 中的分數值一律以 localStorage（`goal.appliedScore`／`draftScore`）或匯出備份驗證 |
| 構造既有分數（FB-36） | AC-26-06 與其他「既有分數」情境：`draftScore` = `appliedScore`；`appliedColor`／`effectiveColor` 依 Color(S) 填寫 |
| AC-20-04、AC-26-05（第 3 輪） | 以**畫面可見性、Tab 焦點、無障礙樹**判定，不以原始碼搜尋（解碼器、句型庫與隱藏分數區的程式依決議保留，SD-FB-21、SD-FB-29）。AC-20-04「交付檔仍含內容資料」以執行期全域變數筆數確認 |
| V-MIC（AC-33-01、AC-33-02 的實機部分、AC-08-09 實機） | 須在 Windows 11 以 Chrome 與 Edge 由 `file://` 開啟實測，PG 與 QA 都無法代測：自動化只做替身代理驗證（`getUserMedia` 呼叫次數、音軌 `readyState`），AC 判定列「待人工（V-MIC）」，不判失敗 |
| AC-33-01 實測不成立 | 若人類實測出現第 2 次權限詢問，依 PRD 開 BUG 並附瀏覽器版本，由人類判斷是否接受為瀏覽器限制 |
| 效能 AC-22-01、AC-22-04、AC-22-05 | 依 §2.3 多輪判定（各位置中位數 + p90）；AC-22-02、AC-22-03、AC-28-03、AC-29-01、AC-33-03 仍為每筆 ≤ 100ms。自動化在本機無頭 Chrome（非 PRD 基準環境），最終以人工 TC-M07 為準 |
| 震動總長 | 含停頓時間（如 `[60, 40, 60]` = 160ms）≤ 200ms |
| FE-28 滑動防誤觸 | CDP 快速滑動後約 1.5 秒內的 click 會被吞，測試在滑動後等待 1.6 秒再點擊 |
| 停用的 TTS／麥克風按鈕 | 須有 `aria-disabled="true"` 與非空 `title`、沒有 `disabled` 屬性，點擊出現 toast 且不執行動作 |
| 字首字 | 詞性為 `pref.`（契約 M-8） |
| 人類自放檔案 | `dist/ads.txt`（AdSense，2026-11-02 由 `Ads.txt` 更名）、`LICENSE`、`.github/workflows/static.yml` 非建置產物、非 PG 產出，不列缺陷（主控指示） |
| 授權過的越界 | FE-26 `naming.test.js`、FE-30 `_fixtures.js`、FE-41 追加 `backup.test.js`、FE-43 追加 `views/flashcards.js`、`flashcards.test.js` 不算越界（皆已在 tasks.json paths 內） |
| （歷史，v0.1～v0.3） | 解碼器註解片段尺寸、冷啟動不列入自動化判定、嚴格量法等規則沿用 v0.3；句型庫相關規則第 3 輪不適用 |

### 2.3 效能多輪判定規則（v0.3，第 3 輪沿用）

| 步驟 | 規則 |
| :--- | :--- |
| 1 執行 | `tests/e2e/e2e-env.mjs` 的效能區塊執行 N 輪（`QA_PERF_RUNS`，預設 7，最少 3），每輪重新啟動瀏覽器；每輪量一般與 4 倍降速兩種條件 |
| 2 排除偏高輪 | 對每種條件以 10 個切頁位置計算全部輪次同位置的中位數；某輪過半數位置（≥ 6/10）> 該中位數 2 倍，該輪在該條件下的樣本排除 |
| 3 判定 | 有效輪數 ≥ 3，且（a）每個量測位置跨輪中位數 ≤ 100ms、（b）合併全部有效樣本 p90 ≤ 100ms，兩種條件都符合才通過 |
| 4 適用 | TC-22-01、TC-22-04b、TC-22-05a、TC-22-05b（第 3 輪：TC-16-01b、TC-16-01c 隨句型庫暫停不適用；10 個切頁位置改為 4 個功能區與資料來源頁） |
| 5 最終依據 | 自動化結果僅供參考；最終以人工 TC-M07 在基準環境的結果為準 |

### 2.4 第 4 輪 PWA 模擬方式與判定規則

| 項目 | 方式／判定 |
| :--- | :--- |
| V-PWA (b) | `node tools/serve.mjs --dir <目錄> --port 8080`（與 `npm run serve` 同一支程式；QA 直接以 node 啟動，才能只關閉自己的程序）；網址 `http://localhost:8080/english-master-track/`；`Cache-Control: max-age=600` |
| 請求記錄 | Playwright `BrowserContext` 的 `request` 事件（`serviceWorkers: "allow"` 時包含 service worker 發出的請求，`request.serviceWorker()` 可辨識）；另以 CDP `Log`、`Audits` 收集 Console 訊息。`blob:`／`data:` 與瀏覽器自身介面（如 Edge 下載中樞 `edge://downloads-hub`）不算頁面網路請求，另列 |
| 安裝事件 | 以 `page.evaluate` 派送替身 `beforeinstallprompt`（`cancelable`，附 `prompt()` 計數與 `userChoice`，FB-42）；`appinstalled` 以一般 `Event` 派送；另記錄瀏覽器真實（`isTrusted`）事件次數 |
| standalone | 以初始化腳本覆寫 `matchMedia("(display-mode: standalone)")` 或 `navigator.standalone` |
| 離線 | 停止伺服器（更接近真實斷網）＋ `context.setOffline(true)` |
| 新版本 V2 | 不改 `src/`：複製 `src/app` 到暫存、`main.js` 註解改 1 字，`node tools/build.mjs --app <複本> --out <暫存>/v2/t.html`，以 `--dir <暫存>/v2/site` 同埠重啟模擬重新部署 |
| 附屬檔 404 | 複製 `dist/site` 到暫存並刪除指定檔案後以 `--dir` 提供 |
| 非安全環境 | Chrome `--host-resolver-rules=MAP emt.test 127.0.0.1`，以 `http://emt.test:8080/…`（非 localhost 的 http）開啟 |
| 停用 service worker | Playwright `serviceWorkers: "block"` |
| 可安裝性 | DevTools 協定 `Page.getAppManifest`、`Page.getInstallabilityErrors`；Playwright 一般 context 等同無痕，會回報 `in-incognito`（環境因素），因此另以 `launchPersistentContext`（一般設定檔）取得 |
| 圖示像素 | QA 自寫 PNG 解碼（色彩類型 2）：外圈 2px、四角是否為藍色、有無灰色；maskable 安全圓（直徑 80%）外有無白色文字與橘色對話框像素。最終外觀以人工 TC-PWA-H1／H2 為準 |
| 必須實機的 AC | AC-34-02、AC-34-03、AC-35-03（實機安裝）、AC-34-05（iOS）、AC-36-07（MC-03 後正式部署）：自動化只做代理驗證，AC 判定「待人工」 |
| 正式網址才完整的 AC | AC-34-01、AC-34-07、AC-34-09、AC-36-03、AC-36-05：PRD 允許先以 V-PWA (b) 驗證；本機通過者判「通過（另待人工確認）」 |

### 2.5 第 5 輪量測方式與判定規則

| 項目 | 方式／判定 |
| :--- | :--- |
| V-LAYOUT | CDP `Emulation.setDeviceMetricsOverride`（deviceScaleFactor 1、縮放 100%），寬 ≤ 767 以行動模式＋觸控；「兩種寬度」= 375×667、1366×768；「全部尺寸」= 375×667、390×844、412×915、768×1024、1366×768、1920×1080（AC-41-03 另加 375×812）。量測時無警示列與 Toast |
| 色彩掃描（AC-38-01） | 走訪全部可見元素（含 SVG 子元素），讀計算後 `color`、`background-color`、4 邊 `border-*-color`、`fill`、`stroke`，正規化為 `#rrggbb`。允許位置：`.db-start` 底色、`#cz-start` 底色、`.db-stat__icon`（含子元素）；**標題列圖示 `.app-logo` 依 PRD v0.13 例外不列入計算**。另檢查文字色不為 `#1e9bf0`／`#f7893b`、白字元素的有效背景不為兩色 |
| 對比（AC-38-04） | WCAG 2.x 相對亮度公式（QA 自寫，`tests/e2e/lib/layout-probe.mjs`）；量測首次畫面、4 個功能區、資料來源頁所有可見且有直接文字節點的元素；有效背景沿祖先鏈合成；`opacity` < 1 的祖先（鎖定列 0.85）以其外層背景混色。大字：≥ 24px，或 ≥ 18.66px 且粗細 ≥ 700。不量：停用按鈕、計算後文字色屬 Q-55 語意色（色級 5 色、對錯、燈號）、`visually-hidden`、標題列圖示 |
| 卡片範圍（AC-38-06） | 主控台、難易度設定、模擬測驗、資料來源頁中可見的 `.card`（不含單字卡頁）；按鈕：`button.btn`、`.db-start`、導覽項，只在邊框寬度 > 0 且樣式非 none 時比對 `#d5d9e0` |
| v0.11 對照（AC-38-03、AC-38-08） | 同一瀏覽器分別開 v0.11 與 v0.12 檔案。AC-38-08 擷取 `#view-flashcards` 可見元素樹（深度、標籤、class、直接文字、順序）比對；測驗模式前以初始化腳本**固定 `Math.random`**（LCG，種子 20261103）使選項順序可重現；幾何以頁面原點相對座標比較（標題列加圖示使整頁下移，屬全域變化），收音條相對位置列入判定 |
| 鍵盤（AC-38-09、AC-41-04） | CDP `Input.dispatchKeyEvent`；Enter／空白鍵以帶 `text` 的 keyDown 送出（才會觸發按鈕預設動作）；Tab 順序前先重新載入，使循序焦點起點回到頁首 |
| 減少動態 | `Emulation.setEmulatedMedia` `prefers-reduced-motion: reduce`；判定 `document.getAnimations().length === 0` 且相關元素 `transition-duration` 為 0 |
| 首屏（AC-39-09、AC-41-03） | 開啟後不捲動（`scrollY` 0），以 `getBoundingClientRect` 判斷外框完整在視窗內，並以 `elementFromPoint` 確認可點；≤ 640px 另比對底部導覽上緣或固定底部列 |
| 舊規則調整 | 「產物不含 `cz-color__range`」改為只檢查程式與 CSS 規則（去除註解，TC-S11）：原始字串會命中 `20-customizer.css` 檔頭記載 v0.10 刪除該 class 的歷史註解 1 次，註解不影響畫面，不開 BUG |
| 只能人工 | 實機固定底部列與安全區、圖示清晰度、實機狀態列顏色：§6.2 TC-LAY-H1～H3；對應 AC 自動化已通過者判「通過（另待人工確認）」 |
| 既有腳本的定位點 | 依 SD-FB-45 更新：色級列 `.cz-level[data-color]`；主控台目標行 `.db-goal`、3 格數據 `.db-stat--streak／--mastery／--accuracy`；「開始今日學習」`.db-start`（`btn--accent`）、「變更」`.db-change`；匯出、匯入、安裝前先展開 `.db-backup__toggle`；功能入口 `.dash-entry`、`#cz-guide`、小環形圖 `.db-mini` 已移除 |

### 2.6 第 6 輪量測方式與判定規則

| 項目 | 方式／判定 |
| :--- | :--- |
| 工具 | 新套件 `e2e-version.mjs` 以 Playwright（`playwright-core`，本機 Chrome／Edge）執行；`file://` 與 `npm run serve`（`tools/serve.mjs --dir dist/site --port 8080`，與 `npm run serve` 同一支程式，直接以 node 啟動以便只關閉自己的程序）兩種形態 |
| 「兩種寬度」 | 375×667、1366×768 |
| 版本行（AC-42-01） | 6 個畫面（首次畫面、主控台、難易度設定、單字卡、模擬測驗、資料來源頁）各讀 `#app-version`：數量 1、文字逐字＝「版本 {package.json version}（建置 {emt-build-id 前 7 碼}）」、前一兄弟為 `#footer-sources`、`<p>`、無 `tabindex`／`role`、不在連結或按鈕內、文字範圍的行數 1、`scrollWidth ≤ clientWidth`、WCAG 對比 ≥ 4.5（有效背景沿祖先鏈取第一個不透明底色）、非 `#f7893b`；捲到底後版本行下緣 ≤ 底部導覽列（或首次畫面固定底部列）上緣；`body.innerText` 不含 `@@`、`undefined`、`null`、空括號；Tab 走一輪焦點不落在版本行；點擊版本行不導覽 |
| 不請求、不儲存（AC-42-03） | Playwright context 的 `request` 事件：`file://` 除主文件外 0 筆（連網、`setOffline(true)` 斷網各一次）；http 只允許預先快取 7 項＋`sw.js` 的 GET、無 `package.json`；切換 5 個畫面前後 localStorage 逐字相同、只有 1 個鍵、`schemaVersion` 2、不含版本號與建置碼；`exportBackup()` 頂層 5 欄、不含版本號與建置碼 |
| 建置（AC-42-04） | 一律 `tools/build.mjs --out <暫存>/…`，不寫 `dist/`、不改 `package.json`：(a) 連續 2 次比 SHA-256；(b) 以 `--package <暫存複本>` 只把 version 改為 1.0.1；(c) 以 `--app <src/app 複本>` 改 1 個字。(b) 另在本機 serve 模擬「已造訪 1.0.0 → 部署 1.0.1」，判定 60 秒內出現「有新版本，重新整理」且按下後版本行為 1.0.1 |
| 範本區（AC-43-01） | `#customizer-custom` 第 2 個子節點帶 `hidden` 與 `inert`、`display: none`、高 0；Tab 走一輪不落在 `[data-template]`；程式 `focus()` 後 `activeElement` 不變、Enter／空白鍵與 Playwright 點擊（逾時即判不可點）後自訂字數不變；表單卡與清單卡間距 12px（等於 `.card` 下外距，無殘留空白）；`page.content()` 仍含 3 個 `data-template`、交付檔含 `DOMAIN_TEMPLATES` 與注入程式 |
| 「範本」字樣（AC-43-02） | 走訪所有可見文字節點（祖先無 `hidden`／`inert`、非 `display:none`／`visibility:hidden`、有尺寸），加上可見元素的 `aria-label`、`title`、`placeholder`、`alt` 與 `document.title`；Toast 以 `TOAST_RECORDER` 全部記錄；對話框涵蓋刪除確認、STT 說明、初始化確認。(b) 單字集為空以「只含 `sources.js` 的資料目錄＋`--no-site`」fixture 建置（與第 4 輪起相同）。內部驗證原因字串（`core/persist.js`「origin 為 template 時須為範本代碼」）只進 errors 陣列，畫面只顯示「備份檔格式錯誤，未匯入」（`tests/results/diag/r6-importerr.json`），不列入 |
| 已注入單字（AC-43-03） | 前置資料由 v0.13 交付檔實際產生（見 §1.3），分「直接以該 localStorage 開啟」與「匯入 v0.13 匯出的備份並確認」兩條路徑；逐欄比對 `customVocab` JSON |
| 狀態列（AC-01-08） | 讀 `#cz-st-line` 文字與文字範圍行數；`.cz-status` 卡片全文須等於該行（不得有第二行）；舊節點 `.cz-st-target`、`.cz-st-effective`、`.cz-rows--status`、`.cz-status__cap` 數量 0；整個 `#view-customizer` 以「目前目標色級」「目前生效色級」「內建上限」搜尋 = 0 |
| 「變更」按鈕（AC-39-04） | 計算後樣式：`background-color` alpha = 1 或四邊 `border-*-width` ≥ 1 且 `border-*-style` ≠ none；`text-decoration-line` 無 underline；`color`、`background-color`、4 邊框色皆 ≠ `rgb(247,137,59)`、`rgb(213,217,224)`；對比 ≥ 4.5；≥ 44×44；與文字不重疊、不超出目標行、不裁切；Tab 取得焦點後 `:focus-visible` 且 outline ≥ 1px。操作：Playwright 滑鼠點擊、`hasTouch` context 的 `tap`、`focus` 後 Enter、空白鍵；`reducedMotion: "reduce"` 下點擊後 300 ms 內 `getAnimations().length` 皆 0 |
| 既有腳本的定位點（SD-FB-54） | 狀態列改讀 `#cz-st-line`（`lib/state.mjs` 的 `est()` 新增 `stLine`，`stEffective` 改由該行去掉「目前色級：」取得）；`cz-st-target`、`cz-st-effective`、`.db-goal__sep` 已移除；目標行比對改為「`.db-goal__text`｜`.db-change`」（`dashGoal`、`GOAL_LINE`；藍、金期望值改為綠）；「變更」不再有 `btn--link`。範本按鈕不可操作，需要範本單字作前置資料的既有 TC 改呼叫 `EMT.store.actions.injectTemplate`（`injectTpl`，等同 PRD AC-22-02 允許的 DevTools 建立方式），TC-05-* 記「不適用（暫停）」 |
| 只能人工 | 實機版本行與底部列、部署後線上一致性、下次只改版本號的實際更新：§6.3 TC-VER-H1～H3 |

## 3. 環境

| 項目 | 版本 |
| :--- | :--- |
| 作業系統 | Windows 11 Pro 10.0.26200 |
| Node.js | v24.15.0 |
| 瀏覽器 | Google Chrome（主要，無頭）、Microsoft Edge（跨瀏覽器冒煙：重跑 e2e-goal、e2e-hidden、e2e-pwa；第 6 輪加 e2e-version 畫面類） |
| 新增相依 | （第 3 輪）無。**第 4 輪**：`devDependencies.playwright-core` 1.64.1（`npm install --save-dev --save-exact`，新增 `package-lock.json`、`node_modules/`；只供 E2E，不下載瀏覽器、使用本機 Chrome／Edge；建置與部署 workflow 不需要） |

## 4. 測試套件

| 套件 | 檔案 | 涵蓋 |
| :--- | :--- | :--- |
| 資料 | `tests/data/data-check.mjs` | TC-D01～TC-D17 |
| 靜態 | `tests/static/static-check.mjs` | TC-S01～TC-S10 |
| 越界 | `boundary-check.mjs`、`boundary-delta.mjs` | TC-B01～TC-B03（判讀記於 qa-review.json） |
| E2E 1 目標與字庫 | `e2e-goal.mjs`（第 3 輪改寫） | US-01、US-02、US-03、AC-17-06、AC-18-02、AC-22-02、AC-22-04、AC-26-06 |
| E2E 2 卡片與備份 | `e2e-cards.mjs` | US-04、US-05、US-06、US-09、AC-17-02～05、AC-23-01、US-24 |
| E2E 3 語音 | `e2e-speech.mjs` | US-07、US-08、AC-21-03、AC-22-03 |
| E2E 4 內容頁 | `e2e-content.mjs` | US-10、US-11、AC-17-01、AC-17-04、AC-23-02；US-12～US-16 記不適用 |
| E2E 5 環境 | `e2e-env.mjs` | AC-18-03～06、AC-24-09、AC-19-02、AC-19-03、US-20、US-21、US-22 |
| E2E 6 持久化 | `e2e-persist.mjs` | AC-18-01 |
| E2E 7 首次與卡片、底部導覽 | `e2e-firstrun.mjs` | US-25、US-26、US-27、AC-24-10、AC-24-11 |
| E2E 8 今日進度 | `e2e-progress.mjs` | US-30 |
| E2E 9 麥克風與收音條（新） | `e2e-mic.mjs` | US-33、AC-08-09（getUserMedia 路徑）、AC-21-03（收音條） |
| E2E 10 隱藏頁（新） | `e2e-hidden.mjs` | AC-20-03、AC-20-04 |
| E2E 11 切換難易度初始化（新） | `e2e-reinit.mjs` | US-32、AC-31-03（確認視窗） |
| E2E 12 手勢、回饋、換頁（新） | `e2e-motion.mjs` | US-28、US-29、US-31 |
| QA 檢視 | `tests/results/qa-review.json` | TC-D18～TC-D20、TC-B01～TC-B03、TC-X-edge、人工 TC |
| 診斷（不列入 run-all） | `diag-customizer-reveal.mjs`、`diag-start-button.mjs`（第 3 輪新增） | 觀察事項量測。`perf-phrasebank.mjs` 第 3 輪移除（量測的句型庫頁已隱藏，AC-16-01 暫停） |
| 人工 | §6 | TC-M01～TC-M10、TC-MIC-1～TC-MIC-5（V-MIC-1～V-MIC-5）、TC-PWA-H1～TC-PWA-H5（第 4 輪，§6.1） |
| PWA 靜態與建置（第 4 輪） | `tests/static/pwa-static.mjs` | TC-PS-01～06、TC-36-01a～c、TC-36-01obs、TC-36-02、TC-36-07a、TC-PWA-H4 |
| E2E 13 PWA（第 4 輪） | `e2e-pwa.mjs` | US-34、US-35、US-37、AC-24-12、AC-23-02、AC-21-01、AC-21-03（Edge 跑冒煙子集 8 項） |
| E2E 14 PWA 更新（第 4 輪） | `e2e-pwa-update.mjs` | US-36（AC-36-03～06）、AC-37-05（經過更新）、TC-PWA-H5 |
| 診斷（不列入 run-all，第 4 輪） | `diag-install-button.mjs` | 「安裝 App」按鈕四角 `elementFromPoint` 命中元素（圓角外側命中自身容器，不算遮住） |

### 4.2 第 5 輪新增與更新的套件

| 套件 | 檔案 | 涵蓋 |
| :--- | :--- | :--- |
| E2E 15 版面與視覺（新） | `tests/e2e/e2e-layout.mjs`、`lib/layout-probe.mjs` | US-38～US-41（TC-38-01～TC-41-04、TC-39-03b） |
| 靜態（新增 5 項） | `static-check.mjs` | TC-S11、TC-L-S01～TC-L-S04 |
| 越界增量（新） | `tests/static/boundary-r5.mjs` | TC-B03（與 git HEAD `4fcbb9f` 比對，CT-24、FE-54～FE-62） |
| QA 檢視 | `tests/tools/qa-review-r5.mjs` | TC-B01～B03、TC-R5-J1～J4（PG 超出設計字面之處的判定）、人工 TC |
| 更新定位點 | `lib/state.mjs`、e2e-goal、e2e-cards、e2e-content、e2e-env、e2e-firstrun、e2e-progress、e2e-reinit、e2e-hidden、e2e-persist、e2e-pwa、e2e-pwa-update、`pwa-static.mjs` | 色級列、目標行、3 格數據、資料備份展開、新色值與 `<title>`（明細見 test-report §16.2） |
| 診斷（不列入 run-all） | `diag-r5-dom.mjs`、`diag-r5-footer.mjs`、`diag-r5-p5clip.mjs`、`diag-r5-tab.mjs`、`diag-r5-textlen.mjs` | 選擇器盤點、頁尾點擊時機、文字裁切來源、Tab 序列、重設後主控台文字長度 |

### 4.3 第 6 輪新增與更新的套件

| 套件 | 檔案 | 涵蓋 |
| :--- | :--- | :--- |
| E2E 16 版本號與介面精簡（新） | `tests/e2e/e2e-version.mjs` | TC-42-01a／b、TC-42-02、TC-42-03a、TC-42-04a～d、TC-43-01、TC-43-02、TC-43-03a／b、TC-01-08、TC-39-04v（Edge 只跑畫面類，建置與 http 類記不適用） |
| 靜態（新增 3 項） | `static-check.mjs` | TC-V-S01～TC-V-S03 |
| 越界增量（新） | `tests/static/boundary-r6.mjs` | TC-B03（與 git HEAD `8a266c3` 比對，FE-63～FE-69） |
| QA 檢視 | `tests/tools/qa-review-r6.mjs` | TC-D18～D20、TC-B01～B03、TC-X-edge、人工 TC（新增 TC-VER-H1～H3） |
| 更新定位點與前置資料 | `lib/state.mjs`、e2e-goal、e2e-cards、e2e-env、e2e-firstrun、e2e-reinit、e2e-speech | 明細見 test-report §17.2 |
| 診斷（不列入 run-all） | `diag-r6-importerr.mjs` | 匯入驗證錯誤原因是否出現在畫面（HT-7） |

## 5. TC 清單

由 `node tests/tools/tc-list.mjs` 依第 6 輪執行結果產生。第 6 輪新增：TC-42-01a／b、TC-42-02、TC-42-03a、TC-42-04a～d、TC-43-01、TC-43-02、TC-43-03a／b、TC-01-08、TC-39-04v（`e2e-version.mjs`）、TC-V-S01～S03（`static-check.mjs`）、人工 TC-VER-H1～H3；TC-05-* 改記「不適用（暫停）」（v0.14）。

共 367 個 TC：自動化 334、QA 檢視 7、人工 26（其中記「不適用（暫停）」23 個）。「TC-X-*」為各套件的「無未處理例外」檢查。

| TC | 對應 AC | 方式 | 腳本 | 驗證重點 |
| :--- | :--- | :--- | :--- | :--- |
| TC-01-01 | AC-01-01 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | （v0.12 改寫）精簡色級列 5 列依序；橘棕綠顯示建議字量與每日新字量、適用情境；藍金只顯示鎖定圖示與「即將開放」，無字數、每日字量、「待定」；列表上方「本系統建議字量」只 1 次；無分數範圍、官方門檻、Tier |
| TC-01-02 | AC-01-02 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | 無學習紀錄時橘 → 綠套用不跳視窗，生效綠、單字集 5,620 |
| TC-01-03 | AC-01-03 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | 點棕未套用即離開：生效仍綠、單字集與 localStorage 不變 |
| TC-01-04 | AC-01-04 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | 生效色級仍為棕，分數仍為 300 |
| TC-01-05 | AC-01-05 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | (a) 既有 300（棕）、(b) 既有 600（綠）點綠 → 只有綠選中、試算綠、套用後 localStorage 725 |
| TC-01-06 | AC-01-06 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | 不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：畫面標示分數對應色級為「 |
| TC-01-07 | AC-01-07、AC-03-03 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | 有學習紀錄時點藍、金並套用：不跳視窗、目標藍／金、生效「綠（內建上限）」、localStorage 855／990、紀錄保留 |
| TC-01-08 | AC-01-08、AC-01-07、AC-25-06、E-92 | 自動化 E2E | `tests/e2e/e2e-version.mjs` | 375／1366：依序套用橘棕綠藍金，狀態列恰 1 行「目前色級：橘／棕／綠／綠／綠」；套用綠後點棕未套用仍為綠；套用藍後重新載入仍為綠且藍列選中；無「目前目標色級」「目前生效色級」「內建上限」；localStorage goal 4 欄、schemaVersion 2 |
| TC-02-01 | AC-02-01 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | 不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：數字輸入框同步顯示 72 |
| TC-02-02 | AC-02-02 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | 不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不接受該值，顯示提示「請 |
| TC-02-03 | AC-02-03 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | 依序點 5 張卡片，試算每日新字量 10、10、15、20、20 |
| TC-02-04 | AC-02-04 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | 依序點 5 張卡片並套用：只有被點卡片選中、對應色級標示正確、localStorage 依序 215、465、725、855、990；無紀錄不跳視窗 |
| TC-02-05a | AC-02-05 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | c = 0 時點橘、棕、綠的建議總字量與預計週數（15、41、54 週） |
| TC-02-05b | AC-02-05 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | c = 409 時點棕 → 35 週 |
| TC-02-06 | AC-02-06 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | c ≥ 目標字量時預計週數 0 並顯示「已達成目標字量」 |
| TC-02-07 | AC-02-07 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | 不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：建議總字量、每日新字量、 |
| TC-02-08 | AC-02-08 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | 套用藍（855）後重新載入：選中藍、試算相同、localStorage 855 |
| TC-02-09 | AC-02-09 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | 不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：分別修正為 725、72 |
| TC-02-10a | AC-02-10 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | 點藍、金：「即將開放」「待定」20 字/天、⌈N_G/140⌉ 週、旁註與「目前內建字庫到綠色為止」 |
| TC-02-10b | AC-02-10 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | c ≥ N_G 時點藍、綠皆 0 週、不出現負數 |
| TC-03-05 | AC-03-05、AC-32-04（單字卡位置） | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | 有學習紀錄時換色級：取消維持第 5 張；確定後回第 1 張正面 |
| TC-03-06 | AC-03-06、AC-03-01、AC-03-02、AC-03-04 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | 套用橘、棕、綠時「共 N 張」= 1,000、2,809、5,620 |
| TC-04-01 | AC-04-01 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 包含：英文單字（必填）、中文釋義（必填）、音標、詞性、搭配詞、論文例句（後四者選填） |
| TC-04-02 | AC-04-02 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 新單字出現在自訂單字清單，標記為「自訂擴充」，並可在抽認卡中翻閱、播放 TTS、進行 STT 評分 |
| TC-04-03 | AC-04-03 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 不儲存，該欄位顯示錯誤提示 |
| TC-04-04 | AC-04-04 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 內容以原文字元顯示，不出現圖片元素、不執行任何腳本 |
| TC-04-05 | AC-04-05 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 自訂單字仍存在且內容一致 |
| TC-04-06 | AC-04-06 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 不新增重複項，提示「單字已存在」 |
| TC-04-07 | AC-04-07 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 該字從自訂清單與抽認卡單字集移除，「共 N 張」減 1；重新載入後仍不存在 |
| TC-04-08 | AC-04-08 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 顯示原本的下一張（若 X 是最後一張則顯示前一張），不出現空白卡；若刪除後單字集為空，依 AC-06-06 顯示空狀態 |
| TC-04-08b | AC-04-08、AC-06-06 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 顯示原本的下一張（若 X 是最後一張則顯示前一張），不出現空白卡；若刪除後單字集為空，依 AC-06-06 顯示空狀態 |
| TC-05-01 | AC-05-01 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 不適用（暫停）。原驗證：有「資工」「商管」「生醫統計」3 個範本按鈕 |
| TC-05-02 | AC-05-02、AC-05-04 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 不適用（暫停）。原驗證：自訂清單至少包含 Latency、Scalability；「資工」範本共 10 字，提示「已注入 N 個單字」，N =  |
| TC-05-03 | AC-05-03 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 不適用（暫停）。原驗證：自訂清單分別包含 Monetization、Heterogeneous；兩個範本各為 10 字（v0.5 依 FB-12 |
| TC-05-05 | AC-05-05 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 不適用（暫停）。原驗證：範本單字出現在單字集中，可播放 TTS 與進行 STT 評分 |
| TC-06-01 | AC-06-01 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 顯示單字、音標、多益常考搭配詞、TTS 1.0x 按鈕、TTS 0.75x 按鈕、麥克風按鈕 |
| TC-06-02 | AC-06-02、AC-06-03 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 顯示背面：詞性、中文釋義、學術文獻應用情境（有值時）、完整例句 |
| TC-06-04 | AC-06-04、AC-06-05 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 顯示「第 i / N 張」；在第 1 張時「上一張」呈停用狀態，在第 N 張時「下一張」呈停用狀態，點擊不產生任何變化 |
| TC-06-06 | AC-06-06 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 單字集為空（無內建資料 fixture：只含 sources.js 的資料目錄＋--no-site）進入單字卡頁顯示空狀態並引導至難易度設定 |
| TC-06-07 | AC-06-07 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 內建單字：背面不顯示學術情境欄（標題與內容一併隱藏）；自訂單字：空白欄位顯示「—」或隱藏；畫面不得出現 undefined、null 字樣或只有標題沒有內容的欄位 |
| TC-07-01 | AC-07-01、AC-07-02 | 自動化 E2E | `tests/e2e/e2e-speech.mjs` | 以 lang = en-US、rate = 1.0 朗讀目前卡片單字 |
| TC-07-03 | AC-07-03 | 自動化 E2E | `tests/e2e/e2e-speech.mjs` | 先停止目前朗讀再播放新的，不累積排隊播放 |
| TC-07-04 | AC-07-04 | 自動化 E2E | `tests/e2e/e2e-speech.mjs` | TTS 按鈕呈停用狀態，點擊或滑過時提示不支援；其他功能正常 |
| TC-07-05 | AC-07-05 | 自動化 E2E | `tests/e2e/e2e-speech.mjs` | 顯示提示「此裝置未安裝美式英語語音」，不拋出未處理錯誤 |
| TC-08-01 | AC-08-01 | 自動化 E2E | `tests/e2e/e2e-speech.mjs` | lang en-US、聆聽中狀態；收音條待機全暗、聆聽中依替身音量點亮 |
| TC-08-02 | AC-08-02 | 自動化 E2E | `tests/e2e/e2e-speech.mjs` | 不支援 STT：toast「建議使用 Google Chrome / Edge」、不呼叫 getUserMedia、收音條全暗 |
| TC-08-03 | AC-08-03 | 自動化 E2E | `tests/e2e/e2e-speech.mjs` | 比對前兩字串皆轉小寫、去除標點與空白，分數為 100 |
| TC-08-04 | AC-08-04 | 自動化 E2E | `tests/e2e/e2e-speech.mjs` | 編輯距離 1、長度最大值 7，分數 = round((1 − 1/7) × 100) = 86 |
| TC-08-05 | AC-08-05 | 自動化 E2E | `tests/e2e/e2e-speech.mjs` | 編輯距離 3，分數 = round((1 − 3/7) × 100) = 57 |
| TC-08-06 | AC-08-06、AC-08-07、AC-08-08 | 自動化 E2E | `tests/e2e/e2e-speech.mjs` | 依序為綠、綠、黃、黃、紅、紅燈 |
| TC-08-09 | AC-08-09（含 §7.6 錯誤對照表） | 自動化 E2E | `tests/e2e/e2e-speech.mjs` | STT 錯誤碼對照（含 v0.9 audio-capture →「找不到麥克風裝置」），結束後收音條全暗 |
| TC-08-09b | AC-08-09（getUserMedia 權限被拒） | 自動化 E2E | `tests/e2e/e2e-mic.mjs` | getUserMedia 權限被拒：「需要麥克風權限」與開啟方式、不開始辨識、收音條全暗；再按重新嘗試 |
| TC-08-10 | AC-08-10 | 自動化 E2E | `tests/e2e/e2e-speech.mjs` | 停止聆聽，按鈕回到待機狀態；逾時或空結果時提示「未偵測到語音，請再試一次」，不顯示分數 |
| TC-08-11 | AC-08-11 | 自動化 E2E | `tests/e2e/e2e-speech.mjs` | 分數標題為「辨識吻合度」，畫面不出現「發音評分」字樣；分數區附一行說明「此分數比對的是語音辨識出的文字，不代表音素層級的發音準確度」 |
| TC-08-12 | AC-08-12 | 自動化 E2E | `tests/e2e/e2e-speech.mjs` | 清洗後為 complywith 對 complywith、compliedwith，分數分別為 100 與 round((1 − 3/12) × 100) = 75（黃燈） |
| TC-08-13 | AC-08-13 | 自動化 E2E | `tests/e2e/e2e-speech.mjs` | 說明文字逐字（v0.9 全文）；「取消」不呼叫 getUserMedia；「我知道了」後取得麥克風並聆聽；已讀後不再顯示 |
| TC-08-14 | AC-08-14 | 自動化 E2E | `tests/e2e/e2e-speech.mjs` | 離線時與辨識中 network 錯誤：「語音辨識需要網路連線」、收音條全暗、不顯示分數 |
| TC-08-14b | AC-08-14 | 自動化 E2E | `tests/e2e/e2e-speech.mjs` | 顯示「語音辨識需要網路連線」，按鈕回到待機狀態，不顯示分數，不拋出未處理錯誤 |
| TC-09-01 | AC-09-01 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 卡片區改為題目：顯示單字與 4 個選項；再點一次回到抽認卡模式 |
| TC-09-02 | AC-09-02 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 恰有 4 個文字互不相同的中文釋義選項；正解為該字的中文釋義，另 3 個取自目前單字集其他字的中文釋義 |
| TC-09-03 | AC-09-03、AC-17-03 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 立即標示：正確為綠色；錯誤時所選為紅色並同時標示正確選項為綠色；該題選項鎖定不可再點 |
| TC-09-04 | AC-09-04 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 單字測驗的答題數、答對數、已掌握單字集合仍保存於 localStorage（「記錄於後台」= localStorage） |
| TC-09-05 | AC-09-05 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 仍可產生 4 個選項並作答 |
| TC-09-06 | AC-09-06 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 提示「單字數不足 4 個，無法產生選項」，維持抽認卡模式 |
| TC-09-07 | AC-09-07 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 正解出現的位置（A～D）不是 20 次都相同（選項每次隨機排序） |
| TC-10-02 | AC-10-02 | 自動化 E2E | `tests/e2e/e2e-content.mjs` | 顯示含空格的句子、A～D 共 4 個選項、題型標籤 |
| TC-11-01 | AC-11-01、AC-11-02、AC-11-03、AC-11-06 | 自動化 E2E | `tests/e2e/e2e-content.mjs` | 所有選項立即鎖定；所選錯誤標紅、正確選項標綠；選對時只標綠 |
| TC-11-04 | AC-11-04、AC-11-07 | 自動化 E2E | `tests/e2e/e2e-content.mjs` | 顯示下一題且為未作答狀態；最後一題作答後點「下一題」，顯示本輪「答對 x / y」結算與「重新開始」按鈕 |
| TC-11-05 | AC-11-05 | 自動化 E2E | `tests/e2e/e2e-content.mjs` | 回到第 5 題 |
| TC-12-01 | AC-12-01、AC-12-02、AC-12-03 | 自動化 E2E | `tests/e2e/e2e-content.mjs` | 不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：主詞為藍色系、核心動詞為 |
| TC-13-01 | AC-13-01、AC-13-02、AC-13-03、AC-13-04 | 自動化 E2E | `tests/e2e/e2e-content.mjs` | 不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：所有修飾語元素計算後樣式 |
| TC-14-01 | AC-14-01 | 自動化 E2E | `tests/e2e/e2e-content.mjs` | 不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：有「Abstract 摘 |
| TC-14-02 | AC-14-02 | 自動化 E2E | `tests/e2e/e2e-env.mjs` | 不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：3 個主題皆可閱讀完整內 |
| TC-15-01 | AC-15-01 | 自動化 E2E | `tests/e2e/e2e-content.mjs` | 不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：有「全部」「研究空白 G |
| TC-15-02 | AC-15-02、AC-15-03 | 自動化 E2E | `tests/e2e/e2e-content.mjs` | 不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：只顯示 Gap 類句型； |
| TC-16-01 | AC-16-01 | 自動化 E2E | `tests/e2e/e2e-content.mjs` | 不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：每次按鍵後 100ms  |
| TC-16-01b | AC-16-01 | 自動化 E2E | `tests/e2e/e2e-env.mjs` | 不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：每次按鍵後 100ms  |
| TC-16-01c | AC-16-01 | 自動化 E2E | `tests/e2e/e2e-env.mjs` | 不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：（v0.2 新增，BUG |
| TC-16-02 | AC-16-02 | 自動化 E2E | `tests/e2e/e2e-content.mjs` | 不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：顯示「找不到符合的句型」 |
| TC-16-03 | AC-16-03 | 自動化 E2E | `tests/e2e/e2e-content.mjs` | 不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：剪貼簿內容與該句型模板文 |
| TC-16-04a | AC-16-04 | 自動化 E2E | `tests/e2e/e2e-content.mjs` | 不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：顯示「複製失敗，請手動選 |
| TC-16-04b | AC-16-04 | 自動化 E2E | `tests/e2e/e2e-content.mjs` | 不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：顯示「複製失敗，請手動選 |
| TC-17-01 | AC-17-01 | 自動化 E2E | `tests/e2e/e2e-content.mjs` | （v0.12 改寫）3 格數據依序為連續打卡天數、單字掌握率（小字「已掌握 N 字」）、模擬測驗正確率，各只出現 1 次；無「單字掌握數」標籤 |
| TC-17-02 | AC-17-02 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 連續打卡天數為 2；同一天多次學習不重複累加；中斷一天後再學習，天數重設為 1。日期以裝置本地時區計 |
| TC-17-04a | AC-17-04 | 自動化 E2E | `tests/e2e/e2e-content.mjs` | 顯示 70%（四捨五入至整數）；答題數為 0 時顯示「—」，不得顯示 NaN 或 Infinity |
| TC-17-04b | AC-17-04 | 自動化 E2E | `tests/e2e/e2e-content.mjs` | 顯示 70%（四捨五入至整數）；答題數為 0 時顯示「—」，不得顯示 NaN 或 Infinity |
| TC-17-05 | AC-17-05 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 打卡天數不變、不為負，也不累加 |
| TC-17-06 | AC-17-06 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | （v0.12 改寫）5 色目標行逐字（每日新字量依生效色級、無分數）；主控台本體只有「開始今日學習」「變更」兩個 data-go；無功能入口與主控台內資料來源入口；開始今日學習、變更、導覽、頁尾各可到達 |
| TC-18-01 | AC-18-01 | 自動化 E2E | `tests/e2e/e2e-persist.mjs` | 點棕套用、自訂字、模擬測驗、翻卡後關閉重開：資料（含今日已學與歷史）完全相同 |
| TC-18-02 | AC-18-02 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | 空 storage → 首次畫面選中綠、無主鍵；按「開始學習」後 localStorage 目標分數 725、目標與生效色級綠、單字集 5,620（v0.10 Q-39） |
| TC-18-03 | AC-18-03、AC-24-01 | 自動化 E2E | `tests/e2e/e2e-env.mjs` | localStorage 停用：警示、點棕套用與其他功能可用、可匯出（465） |
| TC-18-04 | AC-18-04 | 自動化 E2E | `tests/e2e/e2e-env.mjs` | 顯示「儲存空間不足」，既有已儲存資料不被破壞 |
| TC-18-05 | AC-18-05 | 自動化 E2E | `tests/e2e/e2e-env.mjs` | 4 種損壞資料：提示「資料讀取失敗，已重設」、以預設 725 綠啟動、原字串保存 |
| TC-19-02a | AC-19-02 | 自動化 E2E | `tests/e2e/e2e-env.mjs` | 離線模擬下 4 個功能區與資料來源頁可用、TTS 可播放 |
| TC-20-01 | AC-20-01 | 自動化 E2E | `tests/e2e/e2e-env.mjs` | 4 種視窗 × 10 個畫面狀態無水平捲軸、超出、裁切、按鈕重疊 |
| TC-20-02 | AC-20-02 | 自動化 E2E | `tests/e2e/e2e-env.mjs` | 375px 觸控操作 5 張卡片、套用與確認視窗、表單、範本、單字卡、測驗、導覽與入口 |
| TC-20-03 | AC-20-03 | 自動化 E2E | `tests/e2e/e2e-env.mjs` | 375px 底部導覽 4 項文字與順序、皆可到達 |
| TC-20-04a | AC-20-04（畫面入口、Tab、無障礙樹）、AC-20-03 | 自動化 E2E | `tests/e2e/e2e-hidden.mjs` | 375、1366 寬 5 個可到達頁面：畫面、入口、Tab 焦點、無障礙樹都沒有解碼器與句型庫；導覽恰 4 項 |
| TC-20-04b | AC-20-04（手動輸入網址片段、重新載入） | 自動化 E2E | `tests/e2e/e2e-hidden.mjs` | 手動輸入 7 種網址片段、以片段開啟與重新載入：一律顯示主控台、無未處理錯誤 |
| TC-20-04c | AC-20-04（匯入備份） | 自動化 E2E | `tests/e2e/e2e-hidden.mjs` | 匯入備份後仍不顯示隱藏頁 |
| TC-20-04d | AC-20-04（內容資料保留） | 自動化 E2E | `tests/e2e/e2e-hidden.mjs` | 交付檔仍含長難句 50、閱讀策略 3、句型 100 |
| TC-21-01 | AC-21-01、AC-18-06、AC-19-03 | 自動化 E2E | `tests/e2e/e2e-env.mjs` | 完整操作（含收音條、初始化確認）網路請求 0、Console 無資源錯誤 |
| TC-21-03 | AC-21-03（執行期） | 自動化 E2E | `tests/e2e/e2e-speech.mjs` | STT 後 localStorage 只有狀態鍵、無音訊樣式字串 |
| TC-21-03b | AC-21-03（執行期，v0.9 收音條） | 自動化 E2E | `tests/e2e/e2e-mic.mjs` | 使用收音條與 STT 後：localStorage 只有狀態鍵且無音量資料、IndexedDB 與 Cache Storage 空、無下載、網路請求 0 |
| TC-22-01 | AC-22-01 | 自動化 E2E | `tests/e2e/e2e-env.mjs` | 切頁 10 位置 × 7 輪（換頁動畫第一個影格），多輪判定 |
| TC-22-01m | AC-22-01、AC-31-03 | 自動化 E2E | `tests/e2e/e2e-env.mjs` | 減少動態 + 4 倍降速切頁 10 位置 × 7 輪（新頁面完成繪製，嚴格量法），多輪判定 |
| TC-22-01r | AC-22-01 | 自動化 E2E | `tests/e2e/e2e-env.mjs` | 參考：嚴格量法終點有效性與寬鬆量法 |
| TC-22-02 | AC-22-02 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | 最大單字集（5,650）套用 10 次，每次 ≤ 100ms，無確認視窗 |
| TC-22-02b | AC-22-02 | 自動化 E2E | `tests/e2e/e2e-env.mjs` | 多輪：最大單字集套用每筆 ≤ 100ms |
| TC-22-03 | AC-22-03 | 自動化 E2E | `tests/e2e/e2e-speech.mjs` | onresult 到徽章繪製 10 次，每次 ≤ 100ms |
| TC-22-03b | AC-22-03 | 自動化 E2E | `tests/e2e/e2e-env.mjs` | 多輪：STT 評分繪製每筆 ≤ 100ms |
| TC-22-04 | AC-22-04 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | （e2e-goal）點卡片到選中狀態與試算繪製，一般與 4 倍降速各 10 次，中位數與 p90 ≤ 100ms |
| TC-22-04b | AC-22-04 | 自動化 E2E | `tests/e2e/e2e-env.mjs` | （e2e-env）同上，多輪判定（§2.3） |
| TC-22-05a | AC-22-05 | 自動化 E2E | `tests/e2e/e2e-env.mjs` | 一般模式 timeOrigin → emt-ready（主控台入口可點擊） |
| TC-22-05b | AC-22-05、AC-25-01 | 自動化 E2E | `tests/e2e/e2e-env.mjs` | 首次模式 timeOrigin → emt-ready（「開始學習」可點擊） |
| TC-23-01 | AC-23-01 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 卡片顯示出處：該字出現的全部來源字表名稱、版本與授權（例：「單字來源：NGSL 1.2（CC BY-SA 4.0）」），以及音標、釋義各自依該欄位的實際來源標示：來源標記為 ECD… |
| TC-23-02 | AC-23-02 | 自動化 E2E | `tests/e2e/e2e-content.mjs` | （v0.12 改寫）主控台本體無資料來源入口，主控台與其他頁的頁尾連結可開啟；列出外部資料欄位、修改說明與授權聲明；字表種類數一致 |
| TC-23-02b | AC-23-02（375px） | 自動化 E2E | `tests/e2e/e2e-env.mjs` | 375px 寬資料來源頁（含展開）無水平捲軸、超出與裁切 |
| TC-23-02c | AC-23-02（v0.11 品牌標識聲明） | 自動化 E2E | `tests/e2e/e2e-pwa.mjs` | （v0.11）資料來源與授權頁含品牌標識聲明逐字、375／1366 寬可完整閱讀、既有 MIT／CC BY-SA 聲明仍在 |
| TC-24-01 | AC-24-01、AC-24-02 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 匯出檔名、格式、欄位（含今日已學與歷史）；既有 300 棕開始 |
| TC-24-02b | AC-24-02 | 自動化 E2E | `tests/e2e/e2e-firstrun.mjs` | v0.8 匯出：schemaVersion 2、todayLearned {"date":"2026-11-02","wordKeys":["the","be" |
| TC-24-03 | AC-24-03 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 上述資料全部還原，數值與匯出時一致；重新載入頁面後仍為匯入的資料 |
| TC-24-04 | AC-24-04 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 點藍套用並確定初始化後，匯入時按取消資料不變 |
| TC-24-05 | AC-24-05 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 顯示「備份檔格式錯誤，未匯入」；目前資料完全不變；不白屏、不拋出未處理錯誤 |
| TC-24-06 | AC-24-06 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 顯示「備份檔版本不相容」並列出檔案版本與支援版本；不匯入，目前資料完全不變 |
| TC-24-07 | AC-24-07 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 內容以原文字元顯示，不出現圖片元素、不執行任何腳本（同 AC-04-04、AC-04-09） |
| TC-24-08 | AC-24-08 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 重複的自訂單字與不存在的已掌握單字被略過，不計入單字掌握數；完成後提示「已匯入，略過 N 筆」（N 為略過筆數） |
| TC-24-09 | AC-24-09 | 自動化 E2E | `tests/e2e/e2e-env.mjs` | 顯示「儲存空間不足，未匯入」；匯入前已儲存的資料不被破壞（不出現只寫入一部分的狀態） |
| TC-24-10 | AC-24-10 | 自動化 E2E | `tests/e2e/e2e-firstrun.mjs` | （v0.12 改寫）v1 備份匯入成功、7 欄還原、今日已學 0、近 7 天顯示空狀態「開始學習後會顯示紀錄」 |
| TC-24-11 | AC-24-11、AC-24-05 | 自動化 E2E | `tests/e2e/e2e-firstrun.mjs` | 無效項目：提示 ["已匯入，略過 0 筆"]、匯入後歷史 {"2026-10-04":7,"2026-10-28":5}、todayLearned {"date |
| TC-24-12a | AC-24-12 | 自動化 E2E | `tests/e2e/e2e-pwa.mjs` | （v0.11）file://：375／1366 寬 NT-1 說明逐字、緊接匯出按鈕、同區塊、非彈窗、不被裁切或遮住 |
| TC-24-12b | AC-24-12 | 自動化 E2E | `tests/e2e/e2e-pwa.mjs` | （v0.11）localhost（V-PWA (b)）：同 TC-24-12a，文字相同 |
| TC-25-01 | AC-25-01、AC-20-03（首次畫面不顯示導覽） | 自動化 E2E | `tests/e2e/e2e-firstrun.mjs` | （v0.12 改寫）首次畫面：無試算結果卡，摘要行「綠級・每日 15 字　預計 54 週」、開始學習、從備份還原；5 列、預設綠；無導覽、自訂表單、範本；頁尾連結 |
| TC-25-02 | AC-25-02 | 自動化 E2E | `tests/e2e/e2e-firstrun.mjs` | 首次點棕「開始學習」：localStorage 465、主控台棕／10 字/天、導覽 4 鈕、不跳初始化視窗 |
| TC-25-03 | AC-25-03、AC-26-04（首次畫面） | 自動化 E2E | `tests/e2e/e2e-firstrun.mjs` | 首次點藍「開始學習」：目標藍、生效綠（內建上限）、15 字/天、localStorage 855 |
| TC-25-04 | AC-25-04 | 自動化 E2E | `tests/e2e/e2e-firstrun.mjs` | 首次畫面點過卡片後重新整理／重開：仍首次、選中綠、預設 725、無主鍵 |
| TC-25-05 | AC-25-05 | 自動化 E2E | `tests/e2e/e2e-firstrun.mjs` | 重新載入 → main/dashboard、導覽=true；關閉重開 → main/dashboard（v0.7 狀態見 TC-30-12） |
| TC-25-06 | AC-25-06 | 自動化 E2E | `tests/e2e/e2e-firstrun.mjs` | {"entry":"main","tab":"customizer","cards":"orange,brown,green,blue,gold","press |
| TC-25-07 | AC-25-07、AC-23-02（任一頁面） | 自動化 E2E | `tests/e2e/e2e-firstrun.mjs` | 資料來源頁 {"tab":"sources","sources":true,"entry":"firstRun"}、導覽可見=false、返回連結「返回難易度設 |
| TC-25-08 | AC-25-08、AC-18-03 | 自動化 E2E | `tests/e2e/e2e-firstrun.mjs` | 開啟 firstRun、警示「進度將無法保存」；開始學習 → main、可翻卡=true、注入範本 10 字；重新開啟 → firstRun、警示「進度將無法保 |
| TC-25-09 | AC-25-09、AC-18-05 | 自動化 E2E | `tests/e2e/e2e-firstrun.mjs` | 非 JSON：main/dashboard、提示 ["資料讀取失敗，已重設"]；空字串：main/dashboard、提示 ["資料讀取失敗，已重設"]；版本 |
| TC-25-10 | AC-25-10、AC-24-03 | 自動化 E2E | `tests/e2e/e2e-firstrun.mjs` | 首次畫面點金後從備份還原 300 棕：依備份內容、不跳初始化視窗、localStorage 300 不轉換、重新載入後選中棕 |
| TC-25-11 | AC-25-11 | 自動化 E2E | `tests/e2e/e2e-firstrun.mjs` | (a) 檔案選擇器開啟=true 後未選檔：firstRun、狀態鍵 無；(a) 確認框「匯入備份  匯入將覆蓋目前所有進度  取消 匯入」按取消：firstR |
| TC-25-11d | AC-25-11（d）、AC-24-09 | 自動化 E2E | `tests/e2e/e2e-firstrun.mjs` | 容量不足還原：提示 ["儲存空間不足，未匯入"]、firstRun、狀態鍵 無；解除後按「開始學習」→ main、狀態鍵 有 |
| TC-26-01 | AC-26-01、AC-01-01 | 自動化 E2E | `tests/e2e/e2e-firstrun.mjs` | （v0.12 改寫）一般頁 375／768／1366 與首次畫面 375／1366 使用相同精簡列表：色條為色級色、名稱與數字不裁切、說明一行、藍金 opacity < 1、選中列框線為色級色並顯示 ✓、只 1 列選中、≥ 44×44、無水平捲軸；整列可點 |
| TC-26-02 | AC-26-02 | 自動化 E2E | `tests/e2e/e2e-firstrun.mjs` | 既有 300 且有紀錄：點綠只有綠選中、draftScore 725、試算綠；生效與單字集不變；點卡片不跳視窗 |
| TC-26-03 | AC-26-03 | 自動化 E2E | `tests/e2e/e2e-firstrun.mjs` | 不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。PRD v0.10 標「v0.1 |
| TC-26-04 | AC-26-04、AC-01-07 | 自動化 E2E | `tests/e2e/e2e-firstrun.mjs` | 既有 600 點藍、金：draftScore 855／990、即將開放、提示、不阻擋 |
| TC-26-05 | AC-26-05 | 自動化 E2E | `tests/e2e/e2e-firstrun.mjs` | 首次畫面、一般頁、主控台 × 375／1366：無可見滑桿、輸入框、範圍文字、目標分數、錯誤提示；無障礙樹無分數元件；Tab 不會聚焦分數元件；Console 無錯誤 |
| TC-26-06 | AC-26-06 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | 12 個既有分數（draftScore = appliedScore）：選中卡片、試算每日新字量、不點卡片直接套用後主控台色級與 localStorage 原值、重新載入不變、schemaVersion 2 |
| TC-27-01 | AC-27-01、AC-20-01（底部導覽文字） | 自動化 E2E | `tests/e2e/e2e-firstrun.mjs` | 375、640px 底部導覽固定、4 項含圖示文字不裁切、皆可到達 |
| TC-27-02 | AC-27-02 | 自動化 E2E | `tests/e2e/e2e-firstrun.mjs` | 375px：93.8×55、93.8×55、93.8×55、93.8×55｜640px：160×55、160×55、160×55、160×55 |
| TC-27-03 | AC-27-03（自動化部分） | 自動化 E2E | `tests/e2e/e2e-firstrun.mjs` | 375px dashboard：最後元素底 587 ≤ 導覽頂 611=true；375px toast：1 則、底 599 ≤ 導覽頂 611=true；37 |
| TC-27-04 | AC-27-04、AC-20-03 | 自動化 E2E | `tests/e2e/e2e-firstrun.mjs` | 641、768、1366px 不使用底部導覽、4 項可到達 |
| TC-27-05 | AC-27-05、AC-19-01 | 自動化 E2E | `tests/e2e/e2e-firstrun.mjs` | 離線 375px 4 個內嵌 SVG 圖示顯示、無外部圖示資源 |
| TC-28-01 | AC-28-01 | 自動化 E2E | `tests/e2e/e2e-motion.mjs` | 點卡片非按鈕區：翻轉動畫 ≤ 400ms 後顯示背面，再點回正面 |
| TC-28-02 | AC-28-02 | 自動化 E2E | `tests/e2e/e2e-motion.mjs` | 點 TTS 1.0x、0.75x、麥克風只執行按鈕功能、不翻面 |
| TC-28-03 | AC-28-03 | 自動化 E2E | `tests/e2e/e2e-motion.mjs` | 375px 觸控：第 5 張向左滑 → 第 6 張正面，向右滑 → 第 5 張；手指離開到新卡 ≤ 100ms |
| TC-28-04 | AC-28-04 | 自動化 E2E | `tests/e2e/e2e-motion.mjs` | 第 1 張向右滑、第 N 張向左滑不變 |
| TC-28-05 | AC-28-05 | 自動化 E2E | `tests/e2e/e2e-motion.mjs` | 水平 ±49px、垂直為主的滑動不換卡不翻面；touch-action 允許垂直捲動 |
| TC-28-06 | AC-28-06 | 自動化 E2E | `tests/e2e/e2e-motion.mjs` | 測驗模式在題目與選項上滑動不作答不換題；之後點擊才作答 |
| TC-28-07 | AC-28-07 | 自動化 E2E | `tests/e2e/e2e-motion.mjs` | 以鍵盤（Enter、空白鍵）操作翻面、上一張、下一張 |
| TC-28-08 | AC-28-08 | 自動化 E2E | `tests/e2e/e2e-motion.mjs` | 翻轉動畫中再點一次：停在正面，逐畫格檢查無正反面重疊或皆不可見 |
| TC-29-01 | AC-29-01 | 自動化 E2E | `tests/e2e/e2e-motion.mjs` | 四選一與模擬測驗答對、答錯：點擊到顏色 ≤ 100ms、強調／晃動動畫 ≤ 600ms、結束後顏色與鎖定保留 |
| TC-29-02 | AC-29-02 | 自動化 E2E | `tests/e2e/e2e-motion.mjs` | 替身 vibrate：每次作答 1 次、總長含停頓 ≤ 200ms；鎖定後再點不震動、不播動畫 |
| TC-29-03 | AC-29-03 | 自動化 E2E | `tests/e2e/e2e-motion.mjs` | vibrate 不存在或拋例外：無提示、無錯誤、其餘回饋正常 |
| TC-30-01 | AC-30-01 | 自動化 E2E | `tests/e2e/e2e-progress.mjs` | （v0.12 改寫）主環形圖 1 個「今日已學 0 / 15 字」；3 格數據以數字顯示（0%、已掌握 0 字、—）、無小環形圖；近 7 天無資料顯示空狀態 |
| TC-30-02 | AC-30-02 | 自動化 E2E | `tests/e2e/e2e-progress.mjs` | 套用橘、綠、藍：D 為 10、15、15 |
| TC-30-03 | AC-30-03、AC-17-02（學習行為） | 自動化 E2E | `tests/e2e/e2e-progress.mjs` | X 依序 1、1、1、2、3、4（A=he、B=for、C=they、E=not；測驗題目 he/not）；localStorage todayLearned |
| TC-30-04 | AC-30-04 | 自動化 E2E | `tests/e2e/e2e-progress.mjs` | 瀏覽 5 次換卡未翻面、STT 逾時 no-speech:無分數、空結果:無分數、權限 not-allowed:無分數、結束無結果:無分數、離線:undefin |
| TC-30-05 | AC-30-05 | 自動化 E2E | `tests/e2e/e2e-progress.mjs` | X=14：「今日已學 14 / 15 字」比例 93.3%、色 rgb(47, 111, 214)；X=15：「今日已學 15 / 15 字」滿圈 100%、金 |
| TC-30-06 | AC-30-06 | 自動化 E2E | `tests/e2e/e2e-progress.mjs` | 學過 2 個內建 + 自訂 Y → X=3；刪除 Y（已刪除=true）→ X=3；重新載入 → X=3 |
| TC-30-07 | AC-30-07、E-49 | 自動化 E2E | `tests/e2e/e2e-progress.mjs` | 第 T 天「今日已學 5 / 15 字」；(a) 過午夜學 1 字 →「今日已學 1 / 15 字」、長條末兩根 10/30:5 10/31:1、寫出 toda |
| TC-30-07c | AC-30-07、AC-30-13（FE-25／FE-30 跨午夜非學習寫入的正規化） | 自動化 E2E | `tests/e2e/e2e-progress.mjs` | 跨午夜前記憶體日期 2026-10-31；點藍卡並套用（生效色級不變，無確認視窗） → 有寫入、localStorage todayLearned {"date |
| TC-30-08 | AC-30-08 | 自動化 E2E | `tests/e2e/e2e-progress.mjs` | 長條 10/27:3(30%) 10/28:0(0%) 10/29:0(0%) 10/30:10(100%) 10/31:0(0%) 11/1:0(0%) 11 |
| TC-30-09 | AC-30-09 | 自動化 E2E | `tests/e2e/e2e-progress.mjs` | 預寫 31 筆（含今天往前第 30、45 天）→ 學 1 字後匯出歷史 30 筆（2026-10-04～2026-11-02）、第 29 天=7、今天=1、X= |
| TC-30-10 | AC-30-10 | 自動化 E2E | `tests/e2e/e2e-progress.mjs` | （v0.12 改寫）單字集 1,000、集內已掌握 250、集外 10、模擬測驗 10 對 7 → 單字掌握率 25%、小字「已掌握 260 字」、正確率 70%；只有主環形圖 |
| TC-30-10b | AC-30-10、E-48 | 自動化 E2E | `tests/e2e/e2e-progress.mjs` | 單字集 0、答題 0：目前單字集掌握率=—（空環=true、比例 0%）；模擬測驗正確率=—（空環=true、比例 0%）；主環「今日已學 0 / 15 字」 |
| TC-30-11 | AC-30-11 | 自動化 E2E | `tests/e2e/e2e-progress.mjs` | 重新載入前「今日已學 6 / 15 字」長條 0,0,0,0,0,0,6；重新載入後「今日已學 6 / 15 字」長條相同=true；再翻已學過的字 →「今日已 |
| TC-30-12 | AC-30-12、MG-3 | 自動化 E2E | `tests/e2e/e2e-progress.mjs` | （v0.12 改寫）v1 狀態開啟直接進主控台、7 欄不變、X = 0、近 7 天空狀態、寫回 schemaVersion 2 |
| TC-30-13 | AC-30-13、RD-1、V-ST-09～V-ST-11 | 自動化 E2E | `tests/e2e/e2e-progress.mjs` | (1) 無效歷史 + 昨天的今日紀錄：今日已學 0 / 10 字、長條 0,0,0,5,0,0,0、提示 []、目標 465；學 1 字後寫出歷史 {"2026 |
| TC-30-14 | AC-30-14、LR-7 | 自動化 E2E | `tests/e2e/e2e-progress.mjs` | 容量不足時學新字：X 2 → 3；提示 ["儲存空間不足"]（「儲存空間不足」第 1 次後 1 則、第 2 次後 1 則）；localStorage 不變=tr |
| TC-31-01 | AC-31-01 | 自動化 E2E | `tests/e2e/e2e-motion.mjs` | 換頁淡入／滑入 ≤ 300ms、點擊到第一個影格 ≤ 100ms、結束後移除動畫 class |
| TC-31-02 | AC-31-02 | 自動化 E2E | `tests/e2e/e2e-motion.mjs` | 40ms 間隔連點 3 個功能區：只顯示最後一個、無殘留半透明或位移 |
| TC-31-03 | AC-31-03 | 自動化 E2E | `tests/e2e/e2e-motion.mjs` | 減少動態：換頁、翻卡、滑動、作答、環形圖都不播動畫且結果相同；震動仍呼叫 |
| TC-31-03d | AC-31-03（初始化確認視窗） | 自動化 E2E | `tests/e2e/e2e-reinit.mjs` | 減少動態下確認視窗直接出現（animation、transition 為 0） |
| TC-32-01 | AC-32-01 | 自動化 E2E | `tests/e2e/e2e-reinit.mjs` | 有學習紀錄時點棕套用：視窗兩行文字、只有確定與取消、aria-modal、背景點擊無效、開啟中狀態與 localStorage 不變 |
| TC-32-02 | AC-32-02 | 自動化 E2E | `tests/e2e/e2e-reinit.mjs` | （v0.12 改寫）確定後 6 項回到初始值：今日已學 0 / 10、近 7 天空狀態、0 天｜0%｜已掌握 0 字｜—；目標行棕級；單字卡第 1 張、模擬測驗第 1 題；匯出值同清除後首次開始學習 |
| TC-32-03 | AC-32-03 | 自動化 E2E | `tests/e2e/e2e-reinit.mjs` | 自訂 3 字原樣保留、單字集 = 2,809 + 3、monetization 不再計入掌握、STT 已讀保留 |
| TC-32-04 | AC-32-04 | 自動化 E2E | `tests/e2e/e2e-reinit.mjs` | 取消、Esc、點視窗外：選中回綠、試算 15 字/天、目標分數 600、生效綠、單字卡位置與學習紀錄不變、localStorage 與按套用前相同 |
| TC-32-04obs | AC-32-04（觀察：FB-35） | 自動化 E2E | `tests/e2e/e2e-reinit.mjs` | 觀察（FB-35）：取消後任何寫入前重新整理的選中卡片 |
| TC-32-05 | AC-32-05 | 自動化 E2E | `tests/e2e/e2e-reinit.mjs` | 有學習紀錄、既有 600：綠 725、藍 855、金 990、綠 725 皆不跳視窗、紀錄不變、每日新字量 15 |
| TC-32-06 | AC-32-06 | 自動化 E2E | `tests/e2e/e2e-reinit.mjs` | 首次預設 725 只瀏覽卡片 → 點棕套用不跳視窗 |
| TC-32-07 | AC-32-07 | 自動化 E2E | `tests/e2e/e2e-reinit.mjs` | (a)～(f) 各只成立 1 項的 6 種狀態皆跳出視窗 |
| TC-32-08 | AC-32-08 | 自動化 E2E | `tests/e2e/e2e-reinit.mjs` | 首次畫面點藍「開始學習」不跳視窗；有紀錄時匯入棕色備份只出現匯入確認、不另初始化 |
| TC-32-09 | AC-32-09 | 自動化 E2E | `tests/e2e/e2e-reinit.mjs` | 初始化後同一天再翻 A：X = 1、長條今天 1、連續打卡 1 |
| TC-32-10 | AC-32-10 | 自動化 E2E | `tests/e2e/e2e-reinit.mjs` | 確定前後 schemaVersion 2、localStorage 鍵、data 與 goal 欄位集合相同、自訂單字相同、網路請求 0 |
| TC-32-11a | AC-32-11（a） | 自動化 E2E | `tests/e2e/e2e-reinit.mjs` | localStorage 停用時按確定：本次工作階段依 AC-32-02 生效、持續顯示「進度將無法保存」 |
| TC-32-11b | AC-32-11（b） | 自動化 E2E | `tests/e2e/e2e-reinit.mjs` | 寫入拋 QuotaExceededError：「儲存空間不足，未套用」、畫面與 localStorage 維持套用前 |
| TC-33-01a | AC-33-01（自動化代理：getUserMedia 呼叫次數） | 自動化 E2E | `tests/e2e/e2e-mic.mjs` | 自動化代理：停留單字卡頁 5 次按麥克風（期間換卡、翻面、切測驗模式），getUserMedia 只呼叫 1 次、不再出現說明（真實權限詢問見 TC-MIC-1） |
| TC-33-02a | AC-33-02（自動化代理：音軌停止） | 自動化 E2E | `tests/e2e/e2e-mic.mjs` | 自動化代理：由導覽、頁尾離開 1 秒內音軌全部 ended、不再持有；回來再按會重新取得；重新整理時 pagehide 已釋放（使用中圖示見 TC-MIC-2） |
| TC-33-03 | AC-33-03 | 自動化 E2E | `tests/e2e/e2e-mic.mjs` | 5 格常駐、待機全暗不位移；聆聽中亮格從左連續；音量讀取間隔 ≤ 100ms；5 種結束方式 ≤ 100ms 回到全暗 |
| TC-33-04 | AC-33-04 | 自動化 E2E | `tests/e2e/e2e-mic.mjs` | 依架構門檻產生 6 段測試音源與靜音，亮格依序 0～5、靜音 0 |
| TC-33-05 | AC-33-05 | 自動化 E2E | `tests/e2e/e2e-mic.mjs` | getUserMedia NotFoundError：「找不到麥克風裝置」與說明、不辨識、收音條全暗 |
| TC-33-06 | AC-33-06 | 自動化 E2E | `tests/e2e/e2e-mic.mjs` | (a) 未聆聽時拔除再按：有麥克風則重新取得、無則依 AC-33-05；(b) 聆聽中拔除 ≤ 100ms 回待機、全暗、顯示錯誤 |
| TC-33-07 | AC-33-07 | 自動化 E2E | `tests/e2e/e2e-mic.mjs` | mediaDevices 不存在、getUserMedia 不存在、NotReadableError：照常辨識、收音條全暗、不另顯示錯誤 |
| TC-33-08 | AC-33-08、AC-31-03（聆聽中） | 自動化 E2E | `tests/e2e/e2e-mic.mjs` | 減少動態：聆聽中不閃爍、收音條無 transition 但仍即時反映音量 |
| TC-34-01 | AC-34-01 | 自動化 E2E | `tests/e2e/e2e-pwa.mjs` | （v0.11）localhost：動態 manifest 與 apple-touch-icon 連結；manifest 與契約深度相等、id／start_url／scope 解析為部署目錄；3 個圖示 200、image/png、尺寸相符；DevTools Manifest 錯誤 0、一般設定檔可安裝性錯誤 0 |
| TC-34-03a | AC-34-03（自動化代理；實機與 DevTools 遮罩預覽見 TC-PWA-H1／H2） | 自動化 E2E | `tests/e2e/e2e-pwa.mjs` | （v0.11 自動化代理）圖示像素：外圈與四角為藍色、無灰色；maskable 安全圓（直徑 80%）外無白色文字與橘色對話框像素 |
| TC-34-04 | AC-34-04 | 自動化 E2E | `tests/e2e/e2e-pwa.mjs` | （v0.11）meta theme-color = manifest theme_color；首次畫面 body 背景 = background_color |
| TC-34-05a | AC-34-05（連結與圖示部分；iOS 實機見 TC-PWA-H3） | 自動化 E2E | `tests/e2e/e2e-pwa.mjs` | （v0.11）apple-touch-icon 動態連結 180×180、200、RGB 無 alpha；apple-mobile-web-app-title = EnglishContext；<title> 不變 |
| TC-34-07 | AC-34-07、AC-34-08 (f) | 自動化 E2E | `tests/e2e/e2e-pwa.mjs` | （v0.11）替身 beforeinstallprompt（附 prompt、userChoice）：事件前不顯示；事件後只在主控台、NT-1 之後、≥ 44×44、375／1366 不裁切不遮住；其他畫面與首次畫面不顯示；不自動 prompt |
| TC-34-08 | AC-34-08 (b)(d)、AC-34-06 (b) | 自動化 E2E | `tests/e2e/e2e-pwa.mjs` | （v0.11）display-mode standalone、iOS navigator.standalone：替身事件不顯示按鈕、無錯誤 |
| TC-34-09a | AC-34-09 (a) | 自動化 E2E | `tests/e2e/e2e-pwa.mjs` | （v0.11）接受：按下立即隱藏、prompt 1 次；appinstalled 與再次事件後仍不顯示；資料與畫面不變 |
| TC-34-09b | AC-34-09 (b)、AC-34-10 | 自動化 E2E | `tests/e2e/e2e-pwa.mjs` | （v0.11）拒絕：本頁不再顯示、無訊息；重新載入事件前不顯示、再次觸發才顯示（AC-34-10） |
| TC-34-09c | AC-34-09 (c) | 自動化 E2E | `tests/e2e/e2e-pwa.mjs` | （v0.11）快速連點：prompt 只 1 次、無錯誤 |
| TC-35-01 | AC-35-01、AC-21-03 | 自動化 E2E | `tests/e2e/e2e-pwa.mjs` | （v0.11）首次造訪 ≤ 10 秒啟用 1 個 SW、scope 為部署目錄、同源；本專案快取 1 個、項目恰為預先快取 7 項；IndexedDB 空 |
| TC-35-02 | AC-35-02、AC-19-02（離線範圍） | 自動化 E2E | `tests/e2e/e2e-pwa.mjs` | （v0.11）伺服器停止＋離線：./ 與 ./index.html 由 SW 回應、各模組可用、學習資料保留、無資源錯誤 |
| TC-35-04 | AC-35-04 | 自動化 E2E | `tests/e2e/e2e-pwa.mjs` | （v0.11）離線重新載入 5 次到模組入口可點擊：一般 ≤ 3 秒、4 倍降速 ≤ 6 秒（本機參考值） |
| TC-35-05 | AC-35-05 | 自動化 E2E | `tests/e2e/e2e-pwa.mjs` | （v0.11）圖示 404 使預先快取失敗：不留部分快取、線上功能與 localStorage 照常、無錯誤與提示 |
| TC-36-01a | AC-36-01 (a)（V-PWA-06） | 自動化（靜態與建置檢查） | `tests/static/pwa-static.mjs` | （v0.11）不改檔連續建置 2 次：HTML、manifest、sw.js 與整個部署目錄逐位元組相同，且與 dist 現有產物相同（V-PWA-06） |
| TC-36-01b | AC-36-01 (b)、AC-36-02 | 自動化（靜態與建置檢查） | `tests/static/pwa-static.mjs` | （v0.11）src/app 改 1 字、src/data 內容改 1 字後建置：BUILD_ID 與 sw.js 改變，未手動改任何版本號 |
| TC-36-01c | AC-36-01 (c) | 自動化（靜態與建置檢查） | `tests/static/pwa-static.mjs` | （v0.11）換 1 張圖示 PNG 後建置：BUILD_ID 與 sw.js 改變 |
| TC-36-01obs | AC-36-01（觀察） | 自動化（靜態與建置檢查） | `tests/static/pwa-static.mjs` | （v0.11 觀察）src/data 只改註解：交付 HTML 不變、BUILD_ID 不變（資料以 JSON 重新序列化） |
| TC-36-02 | AC-36-02 | 自動化（靜態與建置檢查） | `tests/static/pwa-static.mjs` | （v0.11）HTML emt-build-id = sw.js BUILD_ID；V1 ≠ V2；只改 ads.txt 識別碼不變 |
| TC-36-03a | AC-36-03（首次安裝不提示、不重新載入）、AC-35-01 | 自動化 E2E | `tests/e2e/e2e-pwa-update.mjs` | （v0.11）首次安裝（無 controller）不顯示提示、clients.claim 後不自動重新載入 |
| TC-36-03b | AC-36-03、AC-31-03、AC-27-03 | 自動化 E2E | `tests/e2e/e2e-pwa-update.mjs` | （v0.11）V2 部署後重新載入：60 秒內顯示提示與按鈕、純文字、減少動態無動畫、不被遮住；V2 快取的 HTML 為 V2（非 HTTP 快取） |
| TC-36-03c | AC-36-03（按「重新整理」）、AC-36-04、AC-36-05 | 自動化 E2E | `tests/e2e/e2e-pwa-update.mjs` | （v0.11）按「重新整理」：重新載入 1 次並為 V2；舊本專案快取刪除、其他快取保留；localStorage 不變（AC-36-04、AC-36-05） |
| TC-36-03d | AC-36-03（不按時維持 V1、關閉後重開為 V2）、AC-36-04 | 自動化 E2E | `tests/e2e/e2e-pwa-update.mjs` | （v0.11）不按：維持 V1、不自動重新載入；關閉全部分頁重開為 V2、資料不變 |
| TC-36-04b | AC-36-04（首次畫面）、AC-36-03（不按重新整理） | 自動化 E2E | `tests/e2e/e2e-pwa-update.mjs` | （v0.11）首次畫面使用者：提示照常顯示；不按、關閉後重開為 V2，仍為首次畫面且無狀態鍵 |
| TC-36-06 | AC-36-06 | 自動化 E2E | `tests/e2e/e2e-pwa-update.mjs` | （v0.11）V2 已部署但離線：以 V1 開啟、無提示無錯誤；恢復連網後重開即提示更新 |
| TC-36-07a | AC-36-07（本機模擬 MC-03 新 workflow） | 自動化（靜態與建置檢查） | `tests/static/pwa-static.mjs` | （v0.11）依 architecture §5.2 新 workflow 本機模擬：LF 複本 npm run build、逐字執行 Verify 步驟、dist/site 恰 8 檔；列出 CI 所需但未被 git 追蹤的檔案 |
| TC-37-01a | AC-37-01、AC-21-01、AC-34-08、AC-24-12、AC-21-03 | 自動化 E2E | `tests/e2e/e2e-pwa.mjs` | （v0.11）file:// 連網完整操作（含 STT 替身、匯出入）：無 SW 註冊、DOM 無 manifest／apple-touch-icon、請求 0、Console 錯誤與警告 0、替身安裝事件不被監聽、無按鈕與新版提示、NT-1 顯示、Cache Storage 與 IndexedDB 空 |
| TC-37-01b | AC-37-01、AC-21-01、AC-34-08 | 自動化 E2E | `tests/e2e/e2e-pwa.mjs` | （v0.11）同 TC-37-01a，context 離線 |
| TC-37-02 | AC-37-02、AC-24-12 | 自動化 E2E | `tests/e2e/e2e-pwa.mjs` | （v0.11）只把 HTML 複製到空資料夾以 file:// 開啟，結果同 TC-37-01a |
| TC-37-03 | AC-37-03、AC-34-06 | 自動化 E2E | `tests/e2e/e2e-pwa.mjs` | （v0.11）manifest、sw.js、圖示全部 404：功能照常、無未處理錯誤（瀏覽器 404 訊息除外）、無按鈕與提示 |
| TC-37-04 | AC-37-04 | 自動化 E2E | `tests/e2e/e2e-pwa.mjs` | （v0.11）127.0.0.1 註冊；非 localhost 的 http（非安全環境）不註冊不報錯；停用 SW 環境線上照常 |
| TC-37-05a | AC-37-05、AC-21-01、AC-21-03 | 自動化 E2E | `tests/e2e/e2e-pwa.mjs` | （v0.11）環境層（含 SW）請求全部為同源、部署目錄內、GET、屬預先快取或 sw.js、無查詢字串；載入後操作（含 STT、匯出入）請求 0；Cache Storage、IndexedDB、localStorage 依契約 |
| TC-37-05b | AC-37-05、AC-21-01（經過 1 次更新） | 自動化 E2E | `tests/e2e/e2e-pwa-update.mjs` | （v0.11）經過 1 次更新後的環境層請求同 TC-37-05a |
| TC-37-06 | AC-37-06 | 自動化 E2E | `tests/e2e/e2e-pwa.mjs` | （v0.11；第 5 輪改以加入 PWA 前的提交 e9372f2 的 dist 模擬）加入 PWA 前已在網址版學習，換成 PWA 版後資料完全相同 |
| TC-38-01 | AC-38-01 | 自動化 E2E | `tests/e2e/e2e-layout.mjs` | （v0.12 新增）色彩掃描（首次畫面、4 功能區、資料來源頁 × 375／1366）：#f7893b 只在「開始今日學習」「開始學習」底色與打卡圖示（標題列圖示依 v0.13 例外不計）；文字色不為 #1e9bf0／#f7893b；白字不在兩色上；主環未達成與進度條為 #1e9bf0 |
| TC-38-02 | AC-38-02、AC-34-04 | 自動化 E2E | `tests/e2e/e2e-layout.mjs` | （v0.12 新增）body 背景 #eef4fa（HSL 210°、55%、96.7%）、區塊卡片白底；manifest background_color 同首次畫面背景；theme_color 與 meta theme-color 皆 #1e9bf0 |
| TC-38-03 | AC-38-03、AC-40-03（對錯色） | 自動化 E2E | `tests/e2e/e2e-layout.mjs` | （v0.12 新增）v0.11（4fcbb9f）與 v0.12 語意色變數相同；色級列色條、選中框、目標行色點、達成金環、模擬測驗對錯色與 v0.11 相同；藍色級不被品牌色取代 |
| TC-38-04 | AC-38-04 | 自動化 E2E | `tests/e2e/e2e-layout.mjs` | （v0.12 新增）WCAG 對比：可見文字（不含停用按鈕與語意色）一般 ≥ 4.5、大字 ≥ 3；鎖定列 opacity 合成；強調橘按鈕為深色字 |
| TC-38-05 | AC-38-05、AC-21-01 (a) | 自動化 E2E | `tests/e2e/e2e-layout.mjs` | （v0.12 新增）標題列：內嵌 SVG 圖示（藍底、橘對話框）＋文字 EnglishContext、24～40px 正方形、aria-hidden、375 不裁切；file:// 連網與斷網皆無額外請求；≤ 5 MB |
| TC-38-06 | AC-38-06 | 自動化 E2E | `tests/e2e/e2e-layout.mjs` | （v0.12 新增）區塊卡片白底、四角 16px、有陰影、無邊框；統計格無邊框；按鈕不以 #d5d9e0 為邊框 |
| TC-38-07 | AC-38-07 | 自動化 E2E | `tests/e2e/e2e-layout.mjs` | （v0.12 新增）主控台、難易度設定、模擬測驗區塊標題 ≥ 18px 且 ≥ 600；列舉數字 tabular-nums；3 格數值 ≥ 24px |
| TC-38-08 | AC-38-08 | 自動化 E2E | `tests/e2e/e2e-layout.mjs` | （v0.12 新增）單字卡頁（單字卡模式、測驗模式；375／1366；固定 Math.random）元素樹與 v0.11 相同；收音條相對位置相同 |
| TC-38-09 | AC-38-09、AC-31-03 | 自動化 E2E | `tests/e2e/e2e-layout.mjs` | （v0.12 新增）一般與減少動態：Tab 順序、焦點框 ≥ 2px、Enter／空白鍵與點擊相同、觸控 ≥ 44×44；減少動態下展開收合與進度條無轉場 |
| TC-38-10 | AC-38-10、AC-24-03 | 自動化 E2E | `tests/e2e/e2e-layout.mjs` | （v0.12 新增）<title>、各畫面與對話框／Toast 無 English Master Track、資料來源頁「原創內容來源：EnglishContext 原創內容」、註解第一行；不改清單（鍵名、schemaVersion、備份 format、匯出檔名、快取前綴）；v0.11 localStorage 直接進主控台、v0.11 備份可匯入 |
| TC-39-01 | AC-39-01 | 自動化 E2E | `tests/e2e/e2e-layout.mjs` | （v0.12 新增）主控台區塊 DOM 與畫面順序：標題 → 今日任務 → 3 格數據 → 近 7 天 → 資料備份 → 頁尾；無功能入口、學習統計、目前目標、圖示磚（375／1366／1920） |
| TC-39-02 | AC-39-02 | 自動化 E2E | `tests/e2e/e2e-layout.mjs` | （v0.12 新增）今日任務卡：主環形圖與「開始今日學習」並排、目標行在下；按鈕強調橘底深色字、≥ 44×44、不換行 |
| TC-39-03 | AC-39-03、AC-22-01（量測方式） | 自動化 E2E | `tests/e2e/e2e-layout.mjs` | （v0.12 新增）「開始今日學習」→ 單字卡頁、導覽選中同步、localStorage 不變、≤ 100ms |
| TC-39-03b | AC-39-03、AC-06-06 | 自動化 E2E | `tests/e2e/e2e-layout.mjs` | （v0.12 新增）單字集為空時「開始今日學習」→ 單字卡空狀態，localStorage 不變（無內建資料 fixture） |
| TC-39-04 | AC-39-04、AC-17-06、E-92 | 自動化 E2E | `tests/e2e/e2e-layout.mjs` | （v0.12 新增）5 色目標行逐字；「變更」為按鈕 ≥ 44×44，點擊到一般難易度設定頁 |
| TC-39-04v | AC-39-04、AC-17-06、AC-38-01、AC-38-04、AC-38-06、AC-38-09、E-92 | 自動化 E2E | `tests/e2e/e2e-version.mjs` | 375／1366 套用 5 色：目標行文字只顯示生效色級、無「・」結尾、色點為生效色級；「變更」為 <button type=button>、無 btn--link、白底不透明＋四邊 1px 外框、無底線、非 #f7893b／#d5d9e0、對比 ≥ 4.5、≥ 44×44、不重疊不裁切、:focus-visible 有 3px 焦點框；滑鼠、觸控、Enter、空白鍵皆到一般難易度設定頁且 localStorage 不變；減少動態無動畫 |
| TC-39-05 | AC-39-05、AC-17-01、AC-30-10 | 自動化 E2E | `tests/e2e/e2e-layout.mjs` | （v0.12 新增）3 格同一列依序；3 天（橘色圖示、數字非橘）、25%＋已掌握 260 字、70%；無環形圖；不裁切（375／1366） |
| TC-39-06 | AC-39-06、AC-23-02 | 自動化 E2E | `tests/e2e/e2e-layout.mjs` | （v0.12 新增）主控台本體列舉文字各 1 次；無目前目標色級、生效色級、單字掌握數、資料來源入口、小環形圖、模組入口；頁尾連結可見可開啟 |
| TC-39-07 | AC-39-07、AC-30-08、E-88 | 自動化 E2E | `tests/e2e/e2e-layout.mjs` | （v0.12 新增）(a) 長條最高 ≤ 80px、圖表區 ≤ 120px；(b) 全 0 只顯示「開始學習後會顯示紀錄」、圖表區 ≤ 48px；學 1 字後回長條圖 |
| TC-39-08 | AC-39-08、AC-24-12、E-90、E-91 | 自動化 E2E | `tests/e2e/e2e-layout.mjs` | （v0.12 新增）資料備份預設收合、點擊／Enter 展開收合、切頁維持、匯入流程不收合、重新載入回收合、localStorage 不變；375 展開不被底部導覽遮住 |
| TC-39-09 | AC-39-09、AC-22-05（量測點） | 自動化 E2E | `tests/e2e/e2e-layout.mjs` | （v0.12 新增）V-LAYOUT 6 種尺寸：開啟與切回主控台不捲動，「開始今日學習」完整在視窗內、可點、在底部導覽之上 |
| TC-39-10 | AC-39-10、AC-40-02、AC-20-01 | 自動化 E2E | `tests/e2e/e2e-layout.mjs` | （v0.12 新增）主控台與模擬測驗內容寬：1366／1920 ≤ 720 置中（左右差 ≤ 2）、768 = min(可用, 720)、375 填滿；6 種尺寸無水平捲軸 |
| TC-40-01 | AC-40-01、AC-11-05 | 自動化 E2E | `tests/e2e/e2e-layout.mjs` | （v0.12 新增）進度條：標題下題目上、高 ≥ 4px、#1e9bf0、role/aria、i÷N（誤差 ≤ 1 點）、下一題 ≤ 100ms、結算 100%、重新開始 1÷N、重新載入一致、減少動態無轉場 |
| TC-40-03 | AC-40-03 | 自動化 E2E | `tests/e2e/e2e-layout.mjs` | （v0.12 新增）模擬測驗既有 AC 由既有 TC 覆核（TC-10-*、TC-11-*、TC-29-*、TC-28-06、TC-38-03） |
| TC-41-01 | AC-41-01、AC-25-01 | 自動化 E2E | `tests/e2e/e2e-layout.mjs` | （v0.12 新增）首次畫面順序：標題列 → 選擇你的目標 → 副標 → 本系統建議字量 → 5 列；無試算結果卡、導覽、自訂表單、範本；背景同其他畫面 |
| TC-41-02 | AC-41-02、AC-02-03、AC-02-05、AC-02-10、AC-22-04 | 自動化 E2E | `tests/e2e/e2e-layout.mjs` | （v0.12 新增）固定底部列：鎖定行（藍金）→ 摘要行 → 開始學習 → 從備份還原；5 色摘要逐字、≤ 100ms、與一般頁試算相同；首次畫面不寫 localStorage |
| TC-41-03 | AC-41-03 | 自動化 E2E | `tests/e2e/e2e-layout.mjs` | （v0.12 新增）V-LAYOUT 6 種尺寸＋375×812：不捲動摘要行與兩按鈕在視窗內可點；≤ 640 固定，捲到中段與底部仍可見可點 |
| TC-41-04 | AC-41-04、AC-25-07、AC-25-11 (b)、E-93 | 自動化 E2E | `tests/e2e/e2e-layout.mjs` | （v0.12 新增）375×667：列高 ≤ 184、捲到底頁尾連結在底部列上方可點、各列可捲到列上方、格式錯誤提示不被遮住、Tab 順序 列 → 開始學習 → 從備份還原 → 頁尾 |
| TC-42-01a | AC-42-01 (a)、AC-41-04、AC-27-03、AC-23-02、E-95、E-96 | 自動化 E2E | `tests/e2e/e2e-version.mjs` | file:// 375×667、1366×768：首次畫面、主控台、難易度設定、單字卡、模擬測驗、資料來源頁各恰 1 行版本行，位於 #footer-sources 正下方、<p>、非連結、無 tabindex、Tab 不可達、單行、對比 ≥ 4.5、非強調橘、捲到底不被底部列遮住；畫面無 @@／undefined／null／空括號 |
| TC-42-01b | AC-42-01 (b)、AC-42-03 (b)、AC-37-05、AC-41-04、AC-27-03 | 自動化 E2E | `tests/e2e/e2e-version.mjs` | npm run serve（tools/serve.mjs、dist/site）同 TC-42-01a 各畫面檢查；請求只有預先快取清單與 sw.js 的同源 GET、無 package.json；文字與 file:// 相同 |
| TC-42-02 | AC-42-02、AC-36-02、AC-36-07、E-96 | 自動化 E2E | `tests/e2e/e2e-version.mjs` | package.json version＝emt-app-version＝畫面 X.Y.Z（1.0.0）；建置碼＝emt-build-id 前 7 碼＝sw.js BUILD_ID 前 7 碼；dist 與 site/index.html 逐位元組相同；無 @@ 殘留 |
| TC-42-03a | AC-42-03 (a)、AC-21-01 (a)、E-98 | 自動化 E2E | `tests/e2e/e2e-version.mjs` | file:// 連網與斷網各 6 畫面：請求 0、版本行照常；切換畫面前後 localStorage 相同、只有 1 個鍵、schemaVersion 2、不含版本號與建置碼；匯出備份頂層 5 欄、不含版本號 |
| TC-42-04a | AC-42-04 (a)、AC-36-01 (a) | 自動化 E2E | `tests/e2e/e2e-version.mjs` | 不改檔連續建置 2 次（--out 暫存）：HTML、sw.js、manifest、site/index.html 逐位元組相同，且與 dist 相同 |
| TC-42-04b | AC-42-04 (b)、E-97（建置面） | 自動化 E2E | `tests/e2e/e2e-version.mjs` | 只改 package.json 複本 version 為 1.0.1（--package）：emt-app-version 1.0.1、BUILD_ID 與 sw.js 改變 |
| TC-42-04c | AC-42-04 (c)、AC-36-01 (b) | 自動化 E2E | `tests/e2e/e2e-version.mjs` | src/app 複本改 1 個字：emt-app-version 不變、BUILD_ID 改變 |
| TC-42-04d | AC-42-04 (b)（更新流程）、AC-36-03、E-97 | 自動化 E2E | `tests/e2e/e2e-version.mjs` | 本機 serve 已造訪 1.0.0 版，改部署 1.0.1 版後重新載入出現「有新版本，重新整理」，按下後版本行為 1.0.1 |
| TC-43-01 | AC-43-01、AC-25-06、E-101 | 自動化 E2E | `tests/e2e/e2e-version.mjs` | 375／1366：範本區為 #customizer-custom 第 2 個子節點，帶 hidden＋inert、display none、高 0；Tab 與 focus()／點擊／Enter／空白鍵皆無法觸發；表單卡與清單卡間距 12px；DOM 與交付檔仍含 3 個範本與注入程式；首次畫面無範本；表單新增刪除照常；Console 無錯誤 |
| TC-43-02 | AC-43-02、AC-06-06、E-100、AC-43-01 | 自動化 E2E | `tests/e2e/e2e-version.mjs` | 375／1366：首次畫面、4 功能區、資料備份展開、刪除確認視窗、STT 說明視窗、初始化確認視窗、資料來源頁、所有 Toast 的可見文字＋aria-label／title 無「範本」；無資料 fixture 單字卡空狀態與自訂清單空狀態逐字符合 DS-27、文句完整、仍有「前往難易度設定」 |
| TC-43-03a | AC-43-03（localStorage）、AC-04-06、AC-04-07、AC-23-01、E-99、E-19 | 自動化 E2E | `tests/e2e/e2e-version.mjs` | 以 v0.13 交付檔（git 8a266c3）實際注入「資工」＋表單 1 字的 localStorage 開啟 v0.14：直接進主控台、11 字逐欄不變、只標「自訂擴充」、單字卡含 11 字且範本字可 TTS／STT；表單加 latency 提示「單字已存在」；刪除 1 字其餘不變；匯出備份 10 字、origin／templateId 保留 |
| TC-43-03b | AC-43-03（匯入 v0.13 備份）、AC-24-08、E-99 | 自動化 E2E | `tests/e2e/e2e-version.mjs` | 同 TC-43-03a，改為匯入 v0.13 匯出的備份檔並確認 |
| TC-B01 | （越界檢查：檔案歸屬） | QA 檢視 | `tests/static/boundary-check.mjs` | 每個檔案是否屬於某任務 paths；人類自放檔（dist/ads.txt、LICENSE、.github/）另列 |
| TC-B02 | （越界檢查：原始需求、sources/、docs/、tests/） | QA 檢視 | `人工判讀（檔案時間、docs 變更紀錄）` | sources/、english_master_track.md 未被修改；docs/ 的修改皆為上游角色或 QA |
| TC-B03 | （越界檢查：第 6 輪增量 FE-63～FE-69） | QA 檢視 | `tests/static/boundary-r6.mjs` | （第 5 輪）與 git HEAD 比對的變動檔案皆在 CT-24、FE-54～FE-62 paths 或授權例外內 |
| TC-D01 | AC-03-06 | 自動化（資料檢查） | `tests/data/data-check.mjs` | 「共 N 張」依序為 N_O（1,000，Q-29）、N_B、N_G，與契約文件記錄的字表實際字數一致（功能詞不扣除，Q-30） |
| TC-D02 | AC-03-07 | 自動化（資料檢查） | `tests/data/data-check.mjs` | 不存在兩筆單字字串相同（不分大小寫）的項目 |
| TC-D03 | AC-03-08 | 自動化（資料檢查） | `tests/data/data-check.mjs` | 每筆皆有排名，且排名為 1～N_G 連續不重複的整數；排名 1～N_B 的順序與 NGSL 原表頻率順序一致；排名 N_B+1～N_G 的單字皆來自 TSL、BSL 或 NAWL |
| TC-D04 | AC-03-09 | 自動化（資料檢查） | `tests/data/data-check.mjs` | 兩者完全相同，未排除任何字；功能詞（至少 the、of、a、and、to、in、he、it、can、will）皆存在且各為一張可翻閱的卡片（Q-30） |
| TC-D05 | AC-06-08 | 自動化（資料檢查） | `tests/data/data-check.mjs` | 排名 N_B+1～N_G 的單字學術情境欄全部非空；排名 1～N_B 可為空 |
| TC-D06 | AC-06-01、AC-06-02、AC-06-07 | 自動化（資料檢查） | `tests/data/data-check.mjs` | 顯示單字、音標、多益常考搭配詞、TTS 1.0x 按鈕、TTS 0.75x 按鈕、麥克風按鈕 |
| TC-D07 | AC-06-02（契約 V-VOC-07 M-8） | 自動化（資料檢查） | `tests/data/data-check.mjs` | 顯示背面：詞性、中文釋義、學術文獻應用情境（有值時）、完整例句 |
| TC-D08 | AC-23-03 | 自動化（資料檢查） | `tests/data/data-check.mjs` | 每筆皆有至少 1 個字表來源標記，值皆屬於 AC-23-02 頁面列出的字表；每筆的釋義來源標記為 ECDICT 或原創其中之一：釋義取自 ECDICT 的單字皆有 ECDICT … |
| TC-D09 | AC-23-05 | 自動化（資料檢查） | `tests/data/data-check.mjs` | 每份來源在契約文件都有授權確認紀錄（授權名稱、原始官網或原始 GitHub 網址、確認日期）；無確認紀錄的字表（如 TSL、BSL 未確認時），內建字庫中以該字表為唯一來源的單字數… |
| TC-D10 | AC-23-02 | 自動化（資料檢查） | `tests/data/data-check.mjs` | 列出本檔案實際使用的每一份外部資料（各字表與 ECDICT）：名稱、版本、原作者、授權名稱、授權條款網址、官網網址（純文字顯示即可）；註明本系統對外部資料做的修改：字表（合併、去重… |
| TC-D11 | AC-05-01、AC-05-02、AC-05-03 | 自動化（資料檢查） | `tests/data/data-check.mjs` | 有「資工」「商管」「生醫統計」3 個範本按鈕 |
| TC-D12 | AC-10-01、AC-10-02、AC-11-02 | 自動化（資料檢查） | `tests/data/data-check.mjs` | 「固定介系詞搭配」「詞性辨析」「上下文單字」「讓步/因果連接詞」4 類各至少 50 題，共至少 200 題 |
| TC-D13 | AC-12-02、AC-12-03 | 自動化（資料檢查） | `tests/data/data-check.mjs` | 每句至少有 1 個主詞與 1 個核心動詞標籤 |
| TC-D14 | AC-14-01 | 自動化（資料檢查） | `tests/data/data-check.mjs` | 有「Abstract 摘要」「方法論」「文獻回顧（Research Gap）」3 個主題，各有非空的提示內容 |
| TC-D15 | AC-15-02 | 自動化（資料檢查） | `tests/data/data-check.mjs` | 只顯示 Gap 類句型；4 類各至少 25 則，共至少 100 則 |
| TC-D16 | AC-23-04（標記） | 自動化（資料檢查） | `tests/data/data-check.mjs` | 來源標記皆為「原創」；抽樣 20 筆皆無逐字相同的整句 |
| TC-D17 | AC-09-02 | 自動化（資料檢查） | `tests/data/data-check.mjs` | 恰有 4 個文字互不相同的中文釋義選項；正解為該字的中文釋義，另 3 個取自目前單字集其他字的中文釋義 |
| TC-D18 | AC-23-02、AC-23-03（architecture §8.4 紀錄完整性） | QA 檢視 | `tests/data/records-check.mjs＋人工判讀` | V-VOC-17、H-1W、V-VOC-09 在 _records 皆有對應列（沿用第 1 輪判讀，資料未變更） |
| TC-D19 | AC-23-03（V-VOC-18 抽查） | QA 檢視 | `src/data/_tools/sample.mjs＋人工判讀` | V-VOC-18 抽查 301 筆（沿用第 1 輪，資料未變更） |
| TC-D20 | AC-11-01（V-P5-05 正解唯一性） | QA 檢視 | `src/data/_tools/sample.mjs＋人工判讀` | Part 5 正解唯一性 40 題（沿用第 1 輪，資料未變更） |
| TC-L-S01 | AC-38-07、AC-19-01（VC-8） | 自動化（靜態檢查） | `tests/static/static-check.mjs` | （第 5 輪新增）CSS 無 @font-face、無 url(；系統字型 |
| TC-L-S02 | AC-38-10 (1)、AC-34-01、AC-34-02（V-LAY-05、NM-1、NM-4） | 自動化（靜態檢查） | `tests/static/static-check.mjs` | （第 5 輪新增）<title>EnglishContext</title> 恰 1 次、授權註解第一行 EnglishContext、HTML 文字與程式字串常值與 src/data 無 English Master Track |
| TC-L-S03 | AC-38-10 (2)（NM-5 FROZEN_IDENTIFIERS） | 自動化（靜態檢查） | `tests/static/static-check.mjs` | （第 5 輪新增）不改清單：englishMasterTrack:state／unreadable、english-master-track-backup、匯出檔名前綴、emt-build-id、sw.js 快取前綴、交付檔名 |
| TC-L-S04 | AC-38-05（NM-2） | 自動化（靜態檢查） | `tests/static/static-check.mjs` | （第 5 輪新增）標題列圖示為內嵌 SVG ≤ 1,500 bytes、aria-hidden、無 xmlns／image／text／href、產物無 <img> |
| TC-LAY-H1 | AC-41-03、AC-41-04、E-93 | 人工 | `§6` | （第 5 輪人工）實機首次畫面固定底部列與安全區 |
| TC-LAY-H2 | AC-38-05 | 人工 | `§6` | （第 5 輪人工）標題列圖示清晰度 |
| TC-LAY-H3 | AC-38-02、AC-34-04 | 人工 | `§6` | （第 5 輪人工）實機狀態列顏色 #1e9bf0 |
| TC-M01 | AC-08-01、AC-08-09、AC-08-13、AC-08-14、AC-21-01、AC-21-03 | 人工 | `§6` | 畫面文字與 AC 一致；Network 除 `file://` 主檔外無頁面請求；localStorage 只有 `englishMasterTrack:state`、無音訊或音量資料；IndexedDB、Cache Storage 無本系統資料；無下載 |
| TC-M02 | AC-07-01～AC-07-05 | 人工 | `§6` | 語音為美式、速度正確、無排隊；提示逐字相符 |
| TC-M03 | AC-19-02、AC-37-01、AC-38-05 | 人工 | `§6` | 除 STT（依 AC-08-14）外皆可用；收音條斷網時不影響其他功能；Console 無資源載入失敗 |
| TC-M04 | AC-19-03、AC-18-01 | 人工 | `§6` | 頁面完整顯示；目標色級、自訂字、模擬測驗題號與統計、打卡、今日已學與近 7 天長條皆一致 |
| TC-M05 | AC-20-01～AC-20-03、AC-26-01、AC-27-01、AC-27-02、AC-28-03～AC-28-06 | 人工 | `§6` | 全部可用手指完成；無水平捲軸與裁切重疊；滑動換卡手感正常、垂直捲動不換卡 |
| TC-M06 | AC-24-01、AC-24-03 | 人工 | `§6` | B 的資料與 A 匯出時一致；重新載入後仍在 |
| TC-M07 | AC-22-01～AC-22-05、AC-35-04 | 人工 | `§6` | (1)～(4)、(6) ≤ 100ms（AC-22-01、AC-22-04 以多輪中位數／p90 判定）；(5) 一般 ≤ 3 秒、4 倍降速 ≤ 6 秒 |
| TC-M08 | AC-23-04 | 人工 | `§6` | 20 筆皆無逐字相同的整句 |
| TC-M09 | AC-27-03 | 人工 | `§6` | 實機虛擬鍵盤不遮輸入欄 |
| TC-M10 | AC-29-02、AC-29-03 | 人工 | `§6` | Android 實機震動、iOS Safari 不震動不報錯 |
| TC-MIC-1 | AC-33-01 | 人工 | `§6` | V-MIC-1：Chrome、Edge 停留單字卡頁只詢問一次權限 |
| TC-MIC-2 | AC-33-02 | 人工 | `§6` | V-MIC-2：離開單字卡頁 1 秒內釋放麥克風、使用中圖示消失 |
| TC-MIC-3 | AC-33-03、AC-33-08 | 人工 | `§6` | V-MIC-3：真實說話時收音條、減少動態 |
| TC-MIC-4 | AC-08-09 | 人工 | `§6` | V-MIC-4：權限封鎖 |
| TC-MIC-5 | AC-33-05、AC-33-06 | 人工 | `§6` | V-MIC-5：拔除麥克風 |
| TC-PS-01 | AC-36-07、AC-19-01（V-PWA-01） | 自動化（靜態與建置檢查） | `tests/static/pwa-static.mjs` | （v0.11）部署目錄 dist/site 恰為契約 8 檔、全小寫；index.html 與 dist HTML 位元組相同；ads.txt、4 張 PNG 與來源位元組相同；不含 docs／src／sources（V-PWA-01） |
| TC-PS-02 | AC-34-01（V-PWA-02） | 自動化（靜態與建置檢查） | `tests/static/pwa-static.mjs` | （v0.11）manifest：UTF-8 無 BOM、合法 JSON、10 鍵且順序同契約、相對路徑、name／short_name EnglishContext、不含 BUILD_ID（V-PWA-02） |
| TC-PS-03 | AC-34-01、AC-34-03、AC-34-05（V-PWA-03） | 自動化（靜態與建置檢查） | `tests/static/pwa-static.mjs` | （v0.11）4 張 PNG：尺寸、色彩類型 2、位元深度 8、無 tRNS（V-PWA-03） |
| TC-PS-04 | AC-34-04、AC-34-05、AC-36-02、AC-37-01、AC-19-01（V-PWA-04） | 自動化（靜態與建置檢查） | `tests/static/pwa-static.mjs` | （v0.11）HTML head：HD-1 7 個靜態元素各 1 次且在 </head> 前；emt-build-id 16 碼；無 HD-3 禁止元素；唯一 <link> 為 data: 圖示；<title> 不變（V-PWA-04） |
| TC-PS-05 | AC-36-02、AC-37-05、AC-35-01（V-PWA-05） | 自動化（靜態與建置檢查） | `tests/static/pwa-static.mjs` | （v0.11）sw.js：BUILD_ID 同 HTML、CACHE_NAME 前綴、預先快取 7 項、禁用字串 0、只有 install／activate／fetch／message 4 種監聽（V-PWA-05） |
| TC-PS-06 | AC-19-01（附屬檔參照） | 自動化（靜態與建置檢查） | `tests/static/pwa-static.mjs` | （v0.11）HTML 對檔案的參照只有同目錄相對路徑的 PWA 附屬檔；無絕對網址 src／href |
| TC-PWA-H1 | AC-34-01、AC-34-02、AC-34-03、AC-34-06、AC-34-07、AC-34-09、AC-34-10 | 人工 | `§6` | （v0.11 人工）Windows Chrome／Edge 正式網址：原生與畫面內安裝、名稱、獨立視窗、Manifest 面板、maskable 預覽、解除安裝、Firefox |
| TC-PWA-H2 | AC-34-02、AC-34-03、AC-35-03、AC-38-02 | 人工 | `§6` | （v0.11 人工）Android Chrome：安裝、圓形遮罩、啟動畫面、飛航模式啟動 |
| TC-PWA-H3 | AC-34-05、AC-34-08 | 人工 | `§6` | （v0.11 人工）iOS Safari：加入主畫面名稱、圖示、獨立啟動、無安裝按鈕 |
| TC-PWA-H4 | AC-36-07（GitHub Pages 部署結果） | 人工 | `§6` | （v0.11 人工）MC-03 修改 static.yml 後 push：Actions 成功、正式網址 8 檔 200 且內容相同、不含 docs／src／sources |
| TC-PWA-H5 | AC-36-03（正式網址、已安裝 App、背景 ≥ 1 小時）、AC-36-05（正式網址同網域快取） | 人工 | `§6` | （v0.11 人工）正式網址已安裝 App 重新部署後 60 秒內提示並更新；背景 ≥ 1 小時切回前景觸發檢查 |
| TC-S01 | AC-19-01 | 自動化（靜態檢查） | `tests/static/static-check.mjs` | 只有 1 個 .html 檔；所有 CSS 以 <style> 內嵌；檔案中無指向外部的 <script src>、<link href>、@import、外部字型或圖片網址，不含… |
| TC-S02 | AC-19-04 | 自動化（靜態檢查） | `tests/static/static-check.mjs` | ≤ 5 MB（5,242,880 bytes） |
| TC-S03 | AC-04-09 | 自動化（靜態檢查） | `tests/static/static-check.mjs` | 皆以 textContent 或等效的純文字方式寫入 DOM；不使用 innerHTML、outerHTML、insertAdjacentHTML、document.write 插… |
| TC-S04 | AC-21-02 | 自動化（靜態檢查） | `tests/static/static-check.mjs` | 無任何付費服務金鑰或第三方語音 SDK |
| TC-S05 | AC-21-03（程式面） | 自動化（靜態檢查） | `tests/static/static-check.mjs` | （第 3 輪改）MediaRecorder 0；getUserMedia 只在 mic.js；mic.js 無輸出、傳送、儲存字串；speech-panel 不把音量傳給 store |
| TC-S06 | AC-23-06 | 自動化（靜態檢查） | `tests/static/static-check.mjs` | 含程式碼 MIT 授權聲明（Copyright (c) <年份> JimmyLin 與 MIT 條款全文，Q-31），以及「單字資料與原創內容（例句、解析、Part 5 題目、長難… |
| TC-S07 | AC-04-04、AC-24-07（產物） | 自動化（靜態檢查） | `tests/static/static-check.mjs` | 內容以原文字元顯示，不出現圖片元素、不執行任何腳本 |
| TC-S08 | AC-19-01（D-1 不打包） | 自動化（靜態檢查） | `tests/static/static-check.mjs` | 只有 1 個 .html 檔；所有 CSS 以 <style> 內嵌；檔案中無指向外部的 <script src>、<link href>、@import、外部字型或圖片網址，不含… |
| TC-S09 | AC-19-01（交付物可追溯） | 自動化（靜態檢查） | `tests/static/static-check.mjs` | 只有 1 個 .html 檔；所有 CSS 以 <style> 內嵌；檔案中無指向外部的 <script src>、<link href>、@import、外部字型或圖片網址，不含… |
| TC-S10 | AC-31-04 | 自動化（靜態檢查） | `tests/static/static-check.mjs` | （第 3 輪新增）無外部動畫／圖表／手勢函式庫，@keyframes 與 SVG 皆內嵌、原生 API 建立 |
| TC-S11 | AC-26-05、AC-01-01（程式面） | 自動化（靜態檢查） | `tests/static/static-check.mjs` | （第 5 輪新增）產物程式與 CSS 規則（去除註解）不含 cz-color__range（取代以原始字串搜尋的舊規則） |
| TC-V-S01 | AC-42-03、AC-42-02（VR-5、V-VER-05） | 自動化（靜態檢查） | `tests/static/static-check.mjs` | src/app 非測試 .js 不含 package.json、版本模組無 fetch／XMLHttpRequest／import(／儲存 API、不寫死版本字串 |
| TC-V-S02 | AC-42-02（V-VER-01、VR-2、HD-1） | 自動化（靜態檢查） | `tests/static/static-check.mjs` | 產物 emt-app-version 恰 1 個＝package.json、位於 emt-build-id 之後；無 @@ 佔位殘留；模板 @@APP_VERSION@@ 恰 1 次 |
| TC-V-S03 | AC-43-02、AC-39-04、AC-42-01（HT-7、V-LAY-10、VR-7） | 自動化（靜態檢查） | `tests/static/static-check.mjs` | 原始碼含「範本」的字串常值只在 hidden＋inert 容器（與不顯示的內部驗證原因）；.db-change、.app-footer__version 不用強調橘或灰框線、無底線、nowrap |
| TC-VER-H1 | AC-42-01、AC-27-03、AC-41-04、E-95 | 人工 | `§6` | 實機（Android、iPhone、已安裝 App）版本行不被底部導覽列／固定底部列遮住 |
| TC-VER-H2 | AC-42-02、AC-36-07 | 人工 | `§6` | 部署後正式網址的 meta、頁尾建置碼與 sw.js 一致 |
| TC-VER-H3 | AC-42-04 (b)、AC-36-03、E-97 | 人工 | `§6` | 下次發布只改 version 時已安裝 App 出現更新提示並顯示新版本號 |
| TC-X-cards | （全套件）無未處理例外 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 例外：[] |
| TC-X-clock | （時鐘套件）無未處理例外 | 自動化 E2E | `tests/e2e/e2e-progress.mjs` | [] |
| TC-X-content | （全套件）無未處理例外 | 自動化 E2E | `tests/e2e/e2e-content.mjs` | [] |
| TC-X-edge | AC-19-02（Chrome／Edge）跨瀏覽器冒煙、AC-34-01、AC-35-01、AC-35-02、AC-37-01、AC-42-01、AC-43-01 | QA 檢視 | `e2e-goal、e2e-hidden、e2e-pwa、e2e-version（QA_BROWSER=edge）` | 以 Microsoft Edge 重跑 e2e-goal 與 e2e-hidden |
| TC-X-firstrun | （全套件）無未處理例外 | 自動化 E2E | `tests/e2e/e2e-firstrun.mjs` | 例外 []；console.error [] |
| TC-X-fixture | （fixture）無未處理例外 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | [] |
| TC-X-goal | （全套件）無未處理例外 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | 例外：[]；console.error：[] |
| TC-X-hidden | （全套件）無未處理例外 | 自動化 E2E | `tests/e2e/e2e-hidden.mjs` | [] |
| TC-X-layout | （全套件）無未處理例外 | 自動化 E2E | `tests/e2e/e2e-layout.mjs` | 例外 []；console.error [] |
| TC-X-mic | （全套件）無未處理例外 | 自動化 E2E | `tests/e2e/e2e-mic.mjs` | 例外：[] |
| TC-X-motion | （全套件）無未處理例外 | 自動化 E2E | `tests/e2e/e2e-motion.mjs` | 例外 [] |
| TC-X-progress | （全套件）無未處理例外 | 自動化 E2E | `tests/e2e/e2e-progress.mjs` | [] |
| TC-X-reinit | （全套件）無未處理例外 | 自動化 E2E | `tests/e2e/e2e-reinit.mjs` | 例外 []；console.error [] |
| TC-X-speech | （全套件）無未處理例外 | 自動化 E2E | `tests/e2e/e2e-speech.mjs` | [] |

## 6. 人工驗收 TC

第 3 輪更新：TC-M01～TC-M08 依 PRD v0.10 改寫步驟（點卡片取代輸入分數、移除解碼器與句型庫）；新增 TC-M09、TC-M10 與 V-MIC 的 TC-MIC-1～TC-MIC-5。

| TC | 對應 AC | 環境 | 步驟 | 通過條件 |
| :--- | :--- | :--- | :--- | :--- |
| TC-M01 | AC-08-01、AC-08-09、AC-08-13、AC-08-14、AC-21-01、AC-21-03 | 桌機 Chrome、Edge 最新版；Android Chrome；有麥克風 | (1) 清除網站資料後以 `file://` 開啟，按「開始學習」；(2) 單字卡頁按麥克風，確認說明為 AC-08-13 v0.9 全文（含收音條與使用中圖示），按「取消」不出現權限詢問；(3) 再按，「我知道了」後允許權限，說話時收音條點亮、結束後出現「辨識吻合度」；(4) 網址列把麥克風改為「封鎖」後再按，確認「需要麥克風權限」與開啟方式、收音條全暗；(5) 斷網後按麥克風，確認「語音辨識需要網路連線」；(6) 全程開 DevTools Network 與 Application（localStorage、IndexedDB、Cache Storage） | 畫面文字與 AC 一致；Network 除 `file://` 主檔外無頁面請求；localStorage 只有 `englishMasterTrack:state`、無音訊或音量資料；IndexedDB、Cache Storage 無本系統資料；無下載 |
| TC-M02 | AC-07-01～AC-07-05 | 桌機 Chrome、Edge；Android Chrome；一台未安裝 en-US 語音的裝置 | (1) 按 1.0x、0.75x，確認美式口音且 0.75x 較慢；(2) 朗讀中再按或換卡，確認先停止再播放；(3) 無 en-US 語音裝置按 1.0x，確認「此裝置未安裝美式英語語音」 | 語音為美式、速度正確、無排隊；提示逐字相符 |
| TC-M03 | AC-19-02 | 桌機 Chrome、Edge，**實際斷網** | (1) 斷網；(2) 檔案總管雙擊開啟；(3) 操作主控台、難易度設定（點卡片、套用、新增自訂字、範本）、單字卡（翻卡、滑動、TTS、四選一、按麥克風）、模擬測驗、資料來源與授權頁；(4) 開 Console | 除 STT（依 AC-08-14）外皆可用；收音條斷網時不影響其他功能；Console 無資源載入失敗 |
| TC-M04 | AC-19-03、AC-18-01 | 桌機 Chrome、Edge，未啟動伺服器 | (1) 雙擊開啟；(2) 點棕色卡片套用、新增自訂字、作答 2 題模擬測驗、翻一張卡；(3) 關閉分頁或瀏覽器後再雙擊開啟 | 頁面完整顯示；目標色級、自訂字、模擬測驗題號與統計、打卡、今日已學與近 7 天長條皆一致 |
| TC-M05 | AC-20-01～AC-20-03、AC-26-01、AC-27-01、AC-27-02、AC-28-03～AC-28-06 | Android Chrome 實機（寬約 360～412px） | 以手指操作：底部導覽 4 項、5 張色級卡片、套用與確認視窗、表單、範本、刪除、翻卡、左右滑動換卡、垂直捲動、TTS、麥克風、四選一、模擬測驗；每頁上下捲動 | 全部可用手指完成；無水平捲軸與裁切重疊；滑動換卡手感正常、垂直捲動不換卡 |
| TC-M06 | AC-24-01、AC-24-03 | 兩台裝置或兩個瀏覽器 | (1) 裝置 A 匯出備份，確認檔名含本地日期；(2) 裝置 B 以同一 `.html` 匯入；(3) 重新載入 | B 的資料與 A 匯出時一致；重新載入後仍在 |
| TC-M07 | AC-22-01～AC-22-05 | 中階筆電 + 最新版 Chrome；DevTools 4 倍降速 | 以 DevTools Performance 錄製：(1) 導覽切換 10 次（含首次切到難易度設定）；(2) 套用綠 + 3 範本後按「套用」10 次；(3) **點選不同色級卡片 10 次**（AC-22-04，v0.10）；(4) STT 評分 10 次；(5) 清除快取後開啟 5 次，量 `timeOrigin` → `emt-ready`（首次使用量到「開始學習」可點擊）；(6) 冷啟動：重新啟動 Chrome 後依序切頁 10 次 × 3 | (1)～(4)、(6) ≤ 100ms（AC-22-01、AC-22-04 以多輪中位數／p90 判定）；(5) 一般 ≤ 3 秒、4 倍降速 ≤ 6 秒 |
| TC-M08 | AC-23-04 | 可連網的電腦 | 對 test-report §6.2 的 20 筆以搜尋引擎精確片語搜尋，比對 ETS 官方題本與 Manchester Academic Phrasebank | 20 筆皆無逐字相同的整句 |
| TC-M09（新） | AC-27-03 | Android Chrome 實機 | 375～412px 寬，在難易度設定頁的自訂單字表單點英文單字欄、中文釋義欄，開啟虛擬鍵盤 | 正在輸入的欄位不被底部導覽列或鍵盤遮住（自動化已驗 `is-typing` 時導覽隱藏） |
| TC-M10（新） | AC-29-02、AC-29-03 | Android Chrome 實機；iPhone Safari | 四選一與模擬測驗各答對、答錯一次；已作答後再點 | Android 每次作答短震一次、再點不震；iOS 不震動、無提示、無錯誤 |
| TC-MIC-1（V-MIC-1） | AC-33-01 | Windows 11；Chrome、Edge 最新穩定版（記錄版本）；`file://` 雙擊開啟；麥克風權限為預設「詢問」；已連網；localStorage 已有「STT 說明已讀」 | 進單字卡頁 → 按麥克風、允許、完成 1 次辨識；不離開本頁（換卡、翻面、切測驗模式再切回）再按 4 次 | 兩個瀏覽器各 1 輪，權限詢問只出現 1 次。若出現第 2 次：QA 開 BUG 附瀏覽器版本，由人類判斷是否接受為瀏覽器限制 |
| TC-MIC-2（V-MIC-2） | AC-33-02 | 同上 | 取得麥克風後於 Console 執行 `t = EMT.services.mic.tracks()`；由導覽與主控台入口各離開 1 次；另測 F5 與關閉分頁 | 1 秒內分頁與網址列麥克風使用中圖示消失；`t.map(x => x.readyState)` 全為 `"ended"`。回單字卡頁再按若再次詢問屬可接受 |
| TC-MIC-3（V-MIC-3） | AC-33-03、AC-33-08 | 同上 | 說話時觀察 5 格收音條；Windows「動畫效果」關閉後重測 | 依音量點亮、靜默歸暗；減少動態下仍即時變化、無漸變、「聆聽中」不閃爍 |
| TC-MIC-4（V-MIC-4） | AC-08-09 | 同上 | 權限詢問選「封鎖」；再按一次 | 「需要麥克風權限」與開啟方式、收音條全暗、不辨識；再按會重新嘗試 |
| TC-MIC-5（V-MIC-5） | AC-33-05、AC-33-06 | 同上，USB 麥克風 | 拔除麥克風後按麥克風；聆聽中拔除 | 「找不到麥克風裝置」與說明；聆聽中拔除 → 聆聽結束、收音條全暗、顯示錯誤提示 |

### 6.1 第 4 輪 PWA 人工驗收（V-PWA (a) 正式網址；人類執行，比照 V-MIC）

前提：BUG-003 修正後（或人類決定接受）、主控完成 MC-03（`.github/workflows/static.yml` 依 architecture §5.2 整檔取代）、CI 建置所需檔案已提交（見 test-report §15.8），push 到 `main` 且 Actions 部署成功。以下 `<網址>` = `https://<帳號>.github.io/<專案>/`。

| TC | 對應 AC | 環境 | 步驟 | 通過條件 |
| :--- | :--- | :--- | :--- | :--- |
| TC-PWA-H4 | AC-36-07 | 任一電腦（可用 Git Bash） | (1) GitHub → Actions，確認最新一次「Deploy static content to Pages」成功，Verify deploy directory 步驟綠勾；(2) 下載該次 artifact（github-pages）解壓；(3) 對 8 個檔案逐一執行 `curl -s -o <檔名> -w "%{http_code}
" <網址><路徑>`（`index.html`、`manifest.webmanifest`、`sw.js`、`ads.txt`、`icons/icon-192.png`、`icons/icon-512.png`、`icons/icon-maskable-512.png`、`icons/apple-touch-icon-180.png`），並與 artifact 以 `cmp` 比對；(4) 開 `<網址>docs/01-PRD.md`、`<網址>src/app/main.js`、`<網址>sources/pwa/README.md` | (3) 8 個皆 200 且 `cmp` 無差異；(4) 皆 404 |
| TC-PWA-H1 | AC-34-01～AC-34-03、AC-34-06、AC-34-07、AC-34-09、AC-34-10 | Windows 11；Chrome、Edge 最新穩定版（記錄版本）；Firefox | (1) 以一般視窗開 `<網址>`，按「開始學習」；DevTools → Application → Manifest：確認名稱 EnglishContext、無錯誤、無「無法安裝」類警告；勾選「只顯示 maskable 圖示的最小安全區域」看圖示；(2) 主控台「匯出備份」區塊出現「安裝 App」按鈕（瀏覽器觸發事件後）；按下 → 原生安裝視窗名稱 EnglishContext → 先按「取消」：按鈕消失、無訊息；重新載入，若按鈕再出現則按下並「安裝」；(3) 從開始功能表／桌面啟動：獨立視窗、無網址列與分頁列、開始功能表名稱 EnglishContext；(4) 以瀏覽器分頁再開 `<網址>`：主控台無按鈕；(5) 從 `chrome://apps` 或 App 視窗選單解除安裝，再以分頁開：學習資料仍在，瀏覽器重新觸發事件時按鈕再出現；(6) Firefox 開啟：無按鈕、無錯誤；(7) Edge 重複 (1)～(5) | 各步驟如左；圖示無灰邊、四角無灰色（BUG-003 修正後重點確認底邊）、maskable 預覽文字不被裁切；視窗標題列顯示 English Master Track 不算缺陷（AC-34-02） |
| TC-PWA-H2 | AC-34-02、AC-34-03、AC-35-03 | Android 最新版 Chrome | (1) 開 `<網址>`，按「開始學習」；(2) 選單「安裝應用程式」（或主控台「安裝 App」）；(3) 主畫面圖示：圓形遮罩下「EC」對話框與 EnglishContext 字樣完整；名稱 EnglishContext；(4) 從主畫面啟動：啟動畫面背景為淺灰（#f6f7f9）並顯示圖示，進入主控台；(5) 開飛航模式，從主畫面啟動並操作主控台、難易度設定、單字卡、模擬測驗、資料來源頁 | (3)(4) 如左；(5) 不出現瀏覽器離線錯誤頁，除 STT 外可用 |
| TC-PWA-H3 | AC-34-05、AC-34-08 (b) | iPhone 最新版 iOS Safari | (1) 開 `<網址>`；(2) 分享 → 加入主畫面：預設名稱為 EnglishContext、預覽圖示無灰邊與黑角；(3) 從主畫面啟動：無 Safari 網址列與工具列，可操作；(4) 主控台無「安裝 App」按鈕 | 如左；STT 是否可用不列判定（E-83） |
| TC-PWA-H5 | AC-36-03、AC-36-05 | Windows Chrome 已安裝 App（TC-PWA-H1 後） | (0) 部署 V2 前，在 App 的 DevTools Console 執行 `caches.open("other-cache").then(c => c.put("/x", new Response("keep")))`（模擬同網域其他專案的快取）；(1) 記下 App 中 DevTools Console 執行 `document.querySelector('meta[name="emt-build-id"]').content` 的值 V1；(2) 主控改任一文字、建置、push 部署；(3) Actions 完成後重開 App：60 秒內頂端出現「有新版本，重新整理」與「重新整理」按鈕；按下後頁面重新載入 1 次，識別碼變為 V2；(4) 再部署一次 V3，讓 App 開著切到背景 ≥ 1 小時後切回前景：60 秒內出現提示 | 如左；學習資料不變；V2 啟用後 Application → Cache storage 只剩 1 個 `english-master-track-pwa-<V2>`，`other-cache` 仍在且內容為 keep |

### 6.2 第 5 輪人工驗收（版面與視覺；人類執行）

既有人工 TC 的步驟調整：TC-MIC-2 刪除「主控台入口」離開方式（AC-33-02 v0.12）；TC-PWA-H1 步驟 (2) 的「安裝 App」按鈕須先在主控台展開「資料備份」才出現（AC-34-07 v0.12）；TC-PWA-H2 步驟 (4) 啟動畫面背景改為淡藍灰 `#eef4fa`；TC-M07 (5) 的量測點改為主控台「開始今日學習」可點擊（AC-22-05 v0.12）。

| TC | 對應 AC | 環境 | 步驟 | 通過條件 |
| :--- | :--- | :--- | :--- | :--- |
| TC-LAY-H1 | AC-41-03、AC-41-04、E-93 | Android Chrome 最新版；iPhone Safari 最新版（含瀏海與 Home Indicator 機型）；正式網址與 `file://`（Android 可用檔案管理員開啟） | (1) 清除網站資料後開啟，不捲動；(2) 依序點 5 個色級列；(3) 捲到頁面中段、最底部；(4) 每個色級列都捲到底部列上方並點選；(5) 點頁尾「資料來源與授權」再按「返回難易度設定」；(6) 橫向旋轉後重複 (1)(3) | (1) 摘要行、「開始學習」「從備份還原」完整可見；(2) 摘要行即時更新，選藍、金多一行「目前內建字庫到綠色為止」；(3) 底部列固定在底部、可點；(4)(5) 色級列與頁尾連結都能露出在底部列上方；底部列下緣不被 Home Indicator 或瀏覽器工具列擋住（安全區留白） |
| TC-LAY-H2 | AC-38-05 | Windows 11（縮放 100%、150%）Chrome；Android Chrome；iPhone Safari | 檢視首次畫面、主控台、資料來源頁的標題列；以 OS 放大鏡放大圖示 | 圖示為藍底、橘色對話框、白色 EC，邊緣清楚無模糊或鋸齒，與主畫面 App 圖示一致；名稱 EnglishContext 不被裁切 |
| TC-LAY-H3 | AC-38-02、AC-34-04 | Android Chrome；已安裝 v0.11 的 App（若有） | (1) 以正式網址開啟，觀察網址列／狀態列顏色；(2) 從主畫面啟動已安裝 App，觀察狀態列；(3) 已安裝 v0.11 者：重新部署後依提示重新整理，再關閉重開 App | 狀態列為亮藍 `#1e9bf0`（不再是 v0.11 的 `#2f6fd6`）；啟動畫面背景為淡藍灰；更新後重開顏色改變（作業系統快取 manifest 可能需要數小時至數日，屬瀏覽器行為，記錄即可） |

### 6.3 第 6 輪人工驗收（版本號；人類執行）

既有人工 TC 的步驟調整（領域範本已隱藏，AC-43-01）：TC-M03 步驟 (3)、TC-M05 的「範本」改為「以表單新增自訂單字」；TC-M07 步驟 (2) 改為「套用綠＋30 個自訂單字（以表單、匯入備份或 DevTools 建立）後按『套用』10 次」（AC-22-02 v0.14）；TC-PWA-H1 另檢視頁尾版本行與 `file://` 版文字相同。

| TC | 對應 AC | 環境 | 步驟 | 通過條件 |
| :--- | :--- | :--- | :--- | :--- |
| TC-VER-H1 | AC-42-01、AC-27-03、AC-41-04、E-95 | Android Chrome 最新版、iPhone Safari 最新版（含瀏海／Home Indicator 機型）；正式網址與已安裝 App | (1) 清除網站資料後開啟正式網址，在首次畫面捲到最底部；(2) 按「開始學習」，依序到主控台、難易度設定、單字卡、模擬測驗、資料來源頁，各捲到最底部；(3) 從主畫面啟動已安裝 App 重複 (2)；(4) 橫向旋轉後重看主控台 | 每個畫面「資料來源與授權」下方恰 1 行「版本 1.0.0（建置 xxxxxxx）」，單行、不裁切，完整顯示在底部導覽列或固定底部列上方；點它沒有任何反應 |
| TC-VER-H2 | AC-42-02、AC-36-07 | 任一電腦（push 後 Actions 成功） | (1) 開 `https://jimmyfantasyworld.com/`，捲到頁尾記下版本行；(2) 檢視原始碼，記下 `emt-app-version`、`emt-build-id`；(3) 開 `https://jimmyfantasyworld.com/sw.js`，記下 `BUILD_ID` | 版本＝1.0.0＝`emt-app-version`；頁尾建置碼＝`emt-build-id` 前 7 碼＝`BUILD_ID` 前 7 碼（CI 以 LF 建置，建置碼與本機 `436e27b` 不同屬正常） |
| TC-VER-H3 | AC-42-04 (b)、AC-36-03、E-97 | 已安裝 App 的 Windows Chrome（或 Android） | (1) 下次發布時，人類只把 `package.json` 的 `version` 改為新版本（例 1.0.1），建置並 push；(2) Actions 完成後連網開啟已安裝的 App，等待 60 秒；(3) 按「重新整理」 | (2) 出現「有新版本，重新整理」；(3) 頁尾版本行變為新版本號、建置碼改變，學習資料不變；人類確認版本號與預期相符（建置只驗格式，不驗是否遞增） |

## 7. AC 對照（AC → TC）

由 `node tests/tools/ac-matrix.mjs` 產生。PRD v0.14 的 278 個 AC 全部列出：應驗收的 251 個 AC 皆至少對應 1 個 TC（未涵蓋 0）；暫停的 27 個記「不適用（暫停）」。「判定」欄為第 6 輪結果，詳見 test-report §17。

| AC | 判定 | 對應 TC |
| :--- | :--- | :--- |
| AC-01-01 | 通過 | TC-26-01、TC-01-01、TC-S11 |
| AC-01-02 | 通過 | TC-01-02 |
| AC-01-03 | 通過 | TC-01-03 |
| AC-01-04 | 通過 | TC-01-04 |
| AC-01-05 | 通過 | TC-01-05 |
| AC-01-06 | 不適用（暫停） | TC-01-06 |
| AC-01-07 | 通過 | TC-26-04、TC-01-07、TC-01-08 |
| AC-01-08 | 通過 | TC-01-08 |
| AC-02-01 | 不適用（暫停） | TC-02-01 |
| AC-02-02 | 不適用（暫停） | TC-02-02 |
| AC-02-03 | 通過 | TC-02-03、TC-41-02 |
| AC-02-04 | 通過 | TC-02-04 |
| AC-02-05 | 通過 | TC-02-05a、TC-02-05b、TC-41-02 |
| AC-02-06 | 通過 | TC-02-06 |
| AC-02-07 | 不適用（暫停） | TC-02-07 |
| AC-02-08 | 通過 | TC-02-08 |
| AC-02-09 | 不適用（暫停） | TC-02-09 |
| AC-02-10 | 通過 | TC-02-10a、TC-02-10b、TC-41-02 |
| AC-03-01 | 通過 | TC-03-06 |
| AC-03-02 | 通過 | TC-03-06 |
| AC-03-03 | 通過 | TC-01-07 |
| AC-03-04 | 通過 | TC-03-06 |
| AC-03-05 | 通過 | TC-03-05 |
| AC-03-06 | 通過 | TC-D01、TC-03-06 |
| AC-03-07 | 通過 | TC-D02 |
| AC-03-08 | 通過 | TC-D03 |
| AC-03-09 | 通過 | TC-D04 |
| AC-04-01 | 通過 | TC-04-01 |
| AC-04-02 | 通過 | TC-04-02 |
| AC-04-03 | 通過 | TC-04-03 |
| AC-04-04 | 通過 | TC-04-04、TC-S07 |
| AC-04-05 | 通過 | TC-04-05 |
| AC-04-06 | 通過 | TC-04-06、TC-43-03a |
| AC-04-07 | 通過 | TC-04-07、TC-43-03a |
| AC-04-08 | 通過 | TC-04-08、TC-04-08b |
| AC-04-09 | 通過 | TC-S03 |
| AC-05-01 | 不適用（暫停） | TC-D11、TC-05-01 |
| AC-05-02 | 不適用（暫停） | TC-D11、TC-05-02 |
| AC-05-03 | 不適用（暫停） | TC-D11、TC-05-03 |
| AC-05-04 | 不適用（暫停） | TC-05-02 |
| AC-05-05 | 不適用（暫停） | TC-05-05 |
| AC-06-01 | 通過 | TC-D06、TC-06-01 |
| AC-06-02 | 通過 | TC-D06、TC-D07、TC-06-02 |
| AC-06-03 | 通過 | TC-06-02 |
| AC-06-04 | 通過 | TC-06-04 |
| AC-06-05 | 通過 | TC-06-04 |
| AC-06-06 | 通過 | TC-06-06、TC-04-08b、TC-39-03b、TC-43-02 |
| AC-06-07 | 通過 | TC-D06、TC-06-07 |
| AC-06-08 | 通過 | TC-D05 |
| AC-07-01 | 通過（另待人工確認） | TC-07-01、TC-M02 |
| AC-07-02 | 通過（另待人工確認） | TC-07-01、TC-M02 |
| AC-07-03 | 通過（另待人工確認） | TC-07-03、TC-M02 |
| AC-07-04 | 通過（另待人工確認） | TC-07-04、TC-M02 |
| AC-07-05 | 通過（另待人工確認） | TC-07-05、TC-M02 |
| AC-08-01 | 通過（另待人工確認） | TC-08-01、TC-M01 |
| AC-08-02 | 通過 | TC-08-02 |
| AC-08-03 | 通過 | TC-08-03 |
| AC-08-04 | 通過 | TC-08-04 |
| AC-08-05 | 通過 | TC-08-05 |
| AC-08-06 | 通過 | TC-08-06 |
| AC-08-07 | 通過 | TC-08-06 |
| AC-08-08 | 通過 | TC-08-06 |
| AC-08-09 | 通過（另待人工確認） | TC-08-09b、TC-08-09、TC-M01、TC-MIC-4 |
| AC-08-10 | 通過 | TC-08-10 |
| AC-08-11 | 通過 | TC-08-11 |
| AC-08-12 | 通過 | TC-08-12 |
| AC-08-13 | 通過（另待人工確認） | TC-08-13、TC-M01 |
| AC-08-14 | 通過（另待人工確認） | TC-08-14、TC-08-14b、TC-M01 |
| AC-09-01 | 通過 | TC-09-01 |
| AC-09-02 | 通過 | TC-D17、TC-09-02 |
| AC-09-03 | 通過 | TC-09-03 |
| AC-09-04 | 通過 | TC-09-04 |
| AC-09-05 | 通過 | TC-09-05 |
| AC-09-06 | 通過 | TC-09-06 |
| AC-09-07 | 通過 | TC-09-07 |
| AC-10-01 | 通過 | TC-D12 |
| AC-10-02 | 通過 | TC-D12、TC-10-02 |
| AC-11-01 | 通過 | TC-11-01、TC-D20 |
| AC-11-02 | 通過 | TC-D12、TC-11-01 |
| AC-11-03 | 通過 | TC-11-01 |
| AC-11-04 | 通過 | TC-11-04 |
| AC-11-05 | 通過 | TC-11-05、TC-40-01 |
| AC-11-06 | 通過 | TC-11-01 |
| AC-11-07 | 通過 | TC-11-04 |
| AC-12-01 | 不適用（暫停） | TC-12-01 |
| AC-12-02 | 不適用（暫停） | TC-D13、TC-12-01 |
| AC-12-03 | 不適用（暫停） | TC-D13、TC-12-01 |
| AC-13-01 | 不適用（暫停） | TC-13-01 |
| AC-13-02 | 不適用（暫停） | TC-13-01 |
| AC-13-03 | 不適用（暫停） | TC-13-01 |
| AC-13-04 | 不適用（暫停） | TC-13-01 |
| AC-14-01 | 不適用（暫停） | TC-D14、TC-14-01 |
| AC-14-02 | 不適用（暫停） | TC-14-02 |
| AC-15-01 | 不適用（暫停） | TC-15-01 |
| AC-15-02 | 不適用（暫停） | TC-D15、TC-15-02 |
| AC-15-03 | 不適用（暫停） | TC-15-02 |
| AC-16-01 | 不適用（暫停） | TC-16-01、TC-16-01b、TC-16-01c |
| AC-16-02 | 不適用（暫停） | TC-16-02 |
| AC-16-03 | 不適用（暫停） | TC-16-03 |
| AC-16-04 | 不適用（暫停） | TC-16-04a、TC-16-04b |
| AC-17-01 | 通過 | TC-17-01、TC-39-05 |
| AC-17-02 | 通過 | TC-17-02、TC-30-03 |
| AC-17-03 | 通過 | TC-09-03 |
| AC-17-04 | 通過 | TC-17-04a、TC-17-04b |
| AC-17-05 | 通過 | TC-17-05 |
| AC-17-06 | 通過 | TC-17-06、TC-39-04、TC-39-04v |
| AC-18-01 | 通過（另待人工確認） | TC-18-01、TC-M04 |
| AC-18-02 | 通過 | TC-18-02 |
| AC-18-03 | 通過 | TC-18-03、TC-25-08 |
| AC-18-04 | 通過 | TC-18-04 |
| AC-18-05 | 通過 | TC-18-05、TC-25-09 |
| AC-18-06 | 通過 | TC-21-01 |
| AC-24-01 | 通過（另待人工確認） | TC-24-01、TC-18-03、TC-M06 |
| AC-24-02 | 通過 | TC-24-01、TC-24-02b |
| AC-24-03 | 通過（另待人工確認） | TC-24-03、TC-25-10、TC-38-10、TC-M06 |
| AC-24-04 | 通過 | TC-24-04 |
| AC-24-05 | 通過 | TC-24-05、TC-24-11 |
| AC-24-06 | 通過 | TC-24-06 |
| AC-24-07 | 通過 | TC-24-07、TC-S07 |
| AC-24-08 | 通過 | TC-24-08、TC-43-03b |
| AC-24-09 | 通過 | TC-24-09、TC-25-11d |
| AC-24-10 | 通過 | TC-24-10 |
| AC-24-11 | 通過 | TC-24-11 |
| AC-24-12 | 通過 | TC-39-08、TC-37-01a、TC-37-02、TC-24-12a、TC-24-12b |
| AC-23-01 | 通過 | TC-23-01、TC-43-03a |
| AC-23-02 | 通過 | TC-D10、TC-23-02、TC-23-02b、TC-25-07、TC-39-06、TC-23-02c、TC-42-01a、TC-D18 |
| AC-23-03 | 通過 | TC-D08、TC-D18、TC-D19 |
| AC-23-04 | 待人工（TC-M08） | TC-D16、TC-M08 |
| AC-23-05 | 通過 | TC-D09 |
| AC-23-06 | 通過 | TC-S06 |
| AC-19-01 | 通過 | TC-27-05、TC-PS-01、TC-PS-04、TC-PS-06、TC-S01、TC-S08、TC-L-S01、TC-S09 |
| AC-19-02 | 通過（另待人工確認） | TC-19-02a、TC-35-02、TC-X-edge、TC-M03 |
| AC-19-03 | 通過（另待人工確認） | TC-21-01、TC-M04 |
| AC-19-04 | 通過 | TC-S02 |
| AC-20-01 | 通過（另待人工確認） | TC-20-01、TC-27-01、TC-39-10、TC-M05 |
| AC-20-02 | 通過（另待人工確認） | TC-20-02、TC-M05 |
| AC-20-03 | 通過（另待人工確認） | TC-20-03、TC-25-01、TC-27-04、TC-20-04a、TC-M05 |
| AC-20-04 | 通過 | TC-20-04a、TC-20-04b、TC-20-04c、TC-20-04d |
| AC-21-01 | 通過（另待人工確認） | TC-21-01、TC-38-05、TC-37-05b、TC-37-01a、TC-37-01b、TC-37-05a、TC-42-03a、TC-M01 |
| AC-21-02 | 通過 | TC-S04 |
| AC-21-03 | 通過（另待人工確認） | TC-21-03b、TC-37-01a、TC-35-01、TC-37-05a、TC-21-03、TC-M01、TC-S05 |
| AC-22-01 | 通過（另待人工確認） | TC-22-01、TC-22-01m、TC-22-01r、TC-39-03、TC-M07 |
| AC-22-02 | 通過（另待人工確認） | TC-22-02b、TC-22-02、TC-M07 |
| AC-22-03 | 通過（另待人工確認） | TC-22-03b、TC-22-03、TC-M07 |
| AC-22-04 | 通過（另待人工確認） | TC-22-04b、TC-22-04、TC-41-02、TC-M07 |
| AC-22-05 | 通過（另待人工確認） | TC-22-05a、TC-22-05b、TC-39-09、TC-M07 |
| AC-25-01 | 通過 | TC-22-05b、TC-25-01、TC-41-01 |
| AC-25-02 | 通過 | TC-25-02 |
| AC-25-03 | 通過 | TC-25-03 |
| AC-25-04 | 通過 | TC-25-04 |
| AC-25-05 | 通過 | TC-25-05 |
| AC-25-06 | 通過 | TC-25-06、TC-43-01、TC-01-08 |
| AC-25-07 | 通過 | TC-25-07、TC-41-04 |
| AC-25-08 | 通過 | TC-25-08 |
| AC-25-09 | 通過 | TC-25-09 |
| AC-25-10 | 通過 | TC-25-10 |
| AC-25-11 | 通過 | TC-25-11、TC-25-11d、TC-41-04 |
| AC-26-01 | 通過（另待人工確認） | TC-26-01、TC-M05 |
| AC-26-02 | 通過 | TC-26-02 |
| AC-26-03 | 不適用（暫停） | TC-26-03 |
| AC-26-04 | 通過 | TC-25-03、TC-26-04 |
| AC-26-05 | 通過 | TC-26-05、TC-S11 |
| AC-26-06 | 通過 | TC-26-06 |
| AC-27-01 | 通過（另待人工確認） | TC-27-01、TC-M05 |
| AC-27-02 | 通過（另待人工確認） | TC-27-02、TC-M05 |
| AC-27-03 | 待人工（TC-M09（虛擬鍵盤）） | TC-27-03、TC-36-03b、TC-42-01a、TC-42-01b、TC-M09、TC-VER-H1 |
| AC-27-04 | 通過 | TC-27-04 |
| AC-27-05 | 通過 | TC-27-05 |
| AC-28-01 | 通過 | TC-28-01 |
| AC-28-02 | 通過 | TC-28-02 |
| AC-28-03 | 通過（另待人工確認） | TC-28-03、TC-M05 |
| AC-28-04 | 通過（另待人工確認） | TC-28-04、TC-M05 |
| AC-28-05 | 通過（另待人工確認） | TC-28-05、TC-M05 |
| AC-28-06 | 通過（另待人工確認） | TC-28-06、TC-M05 |
| AC-28-07 | 通過 | TC-28-07 |
| AC-28-08 | 通過 | TC-28-08 |
| AC-29-01 | 通過 | TC-29-01 |
| AC-29-02 | 通過（另待人工確認） | TC-29-02、TC-M10 |
| AC-29-03 | 通過（另待人工確認） | TC-29-03、TC-M10 |
| AC-30-01 | 通過 | TC-30-01 |
| AC-30-02 | 通過 | TC-30-02 |
| AC-30-03 | 通過 | TC-30-03 |
| AC-30-04 | 通過 | TC-30-04 |
| AC-30-05 | 通過 | TC-30-05 |
| AC-30-06 | 通過 | TC-30-06 |
| AC-30-07 | 通過 | TC-30-07、TC-30-07c |
| AC-30-08 | 通過 | TC-39-07、TC-30-08 |
| AC-30-09 | 通過 | TC-30-09 |
| AC-30-10 | 通過 | TC-39-05、TC-30-10、TC-30-10b |
| AC-30-11 | 通過 | TC-30-11 |
| AC-30-12 | 通過 | TC-30-12 |
| AC-30-13 | 通過 | TC-30-13、TC-30-07c |
| AC-30-14 | 通過 | TC-30-14 |
| AC-31-01 | 通過 | TC-31-01 |
| AC-31-02 | 通過 | TC-31-02 |
| AC-31-03 | 通過 | TC-22-01m、TC-38-09、TC-33-08、TC-31-03、TC-36-03b、TC-31-03d |
| AC-31-04 | 通過 | TC-S10 |
| AC-32-01 | 通過 | TC-32-01 |
| AC-32-02 | 通過 | TC-32-02 |
| AC-32-03 | 通過 | TC-32-03 |
| AC-32-04 | 通過 | TC-03-05、TC-32-04、TC-32-04obs |
| AC-32-05 | 通過 | TC-32-05 |
| AC-32-06 | 通過 | TC-32-06 |
| AC-32-07 | 通過 | TC-32-07 |
| AC-32-08 | 通過 | TC-32-08 |
| AC-32-09 | 通過 | TC-32-09 |
| AC-32-10 | 通過 | TC-32-10 |
| AC-32-11 | 通過 | TC-32-11a、TC-32-11b |
| AC-33-01 | 待人工（V-MIC-1） | TC-33-01a、TC-MIC-1 |
| AC-33-02 | 待人工（V-MIC-2） | TC-33-02a、TC-MIC-2 |
| AC-33-03 | 通過（另待人工確認） | TC-33-03、TC-MIC-3 |
| AC-33-04 | 通過 | TC-33-04 |
| AC-33-05 | 通過（另待人工確認） | TC-33-05、TC-MIC-5 |
| AC-33-06 | 通過（另待人工確認） | TC-33-06、TC-MIC-5 |
| AC-33-07 | 通過 | TC-33-07 |
| AC-33-08 | 通過（另待人工確認） | TC-33-08、TC-MIC-3 |
| AC-34-01 | 通過（另待人工確認） | TC-34-01、TC-PS-02、TC-PS-03、TC-X-edge、TC-PWA-H1、TC-L-S02 |
| AC-34-02 | 待人工（TC-PWA-H1／H2） | TC-PWA-H1、TC-PWA-H2、TC-L-S02 |
| AC-34-03 | 待人工（TC-PWA-H1／H2） | TC-34-03a、TC-PS-03、TC-PWA-H1、TC-PWA-H2 |
| AC-34-04 | 通過（另待人工確認） | TC-38-02、TC-34-04、TC-PS-04、TC-LAY-H3 |
| AC-34-05 | 待人工（TC-PWA-H3（iOS）） | TC-34-05a、TC-PS-03、TC-PS-04、TC-PWA-H3 |
| AC-34-06 | 通過（另待人工確認） | TC-34-08、TC-37-03、TC-PWA-H1 |
| AC-34-07 | 通過（另待人工確認） | TC-34-07、TC-PWA-H1 |
| AC-34-08 | 通過（另待人工確認） | TC-37-01a、TC-37-01b、TC-34-07、TC-34-08、TC-PWA-H3 |
| AC-34-09 | 通過（另待人工確認） | TC-34-09a、TC-34-09b、TC-34-09c、TC-PWA-H1 |
| AC-34-10 | 通過（另待人工確認） | TC-34-09b、TC-PWA-H1 |
| AC-35-01 | 通過 | TC-36-03a、TC-35-01、TC-PS-05、TC-X-edge |
| AC-35-02 | 通過 | TC-35-02、TC-X-edge |
| AC-35-03 | 待人工（TC-PWA-H2） | TC-PWA-H2 |
| AC-35-04 | 通過（另待人工確認） | TC-35-04、TC-M07 |
| AC-35-05 | 通過 | TC-35-05 |
| AC-36-01 | 通過 | TC-42-04a、TC-42-04c、TC-36-01a、TC-36-01b、TC-36-01c、TC-36-01obs |
| AC-36-02 | 通過 | TC-42-02、TC-PS-04、TC-PS-05、TC-36-01b、TC-36-02 |
| AC-36-03 | 通過（另待人工確認） | TC-36-03a、TC-36-03b、TC-36-03c、TC-36-04b、TC-36-03d、TC-PWA-H5、TC-42-04d、TC-VER-H3 |
| AC-36-04 | 通過 | TC-36-03c、TC-36-04b、TC-36-03d |
| AC-36-05 | 通過（另待人工確認） | TC-36-03c、TC-PWA-H5 |
| AC-36-06 | 通過 | TC-36-06 |
| AC-36-07 | 待人工（TC-PWA-H4（MC-03 後）） | TC-42-02、TC-PS-01、TC-36-07a、TC-PWA-H4、TC-VER-H2 |
| AC-37-01 | 通過（另待人工確認） | TC-37-01a、TC-37-01b、TC-PS-04、TC-X-edge、TC-M03 |
| AC-37-02 | 通過 | TC-37-02 |
| AC-37-03 | 通過 | TC-37-03 |
| AC-37-04 | 通過 | TC-37-04 |
| AC-37-05 | 通過 | TC-37-05b、TC-37-05a、TC-42-01b、TC-PS-05 |
| AC-37-06 | 通過 | TC-37-06 |
| AC-38-01 | 通過 | TC-38-01、TC-39-04v |
| AC-38-02 | 通過（另待人工確認） | TC-38-02、TC-PWA-H2、TC-LAY-H3 |
| AC-38-03 | 通過 | TC-38-03 |
| AC-38-04 | 通過 | TC-38-04、TC-39-04v |
| AC-38-05 | 通過（另待人工確認） | TC-38-05、TC-M03、TC-LAY-H2、TC-L-S04 |
| AC-38-06 | 通過 | TC-38-06、TC-39-04v |
| AC-38-07 | 通過 | TC-38-07、TC-L-S01 |
| AC-38-08 | 通過 | TC-38-08 |
| AC-38-09 | 通過 | TC-38-09、TC-39-04v |
| AC-38-10 | 通過 | TC-38-10、TC-L-S02、TC-L-S03 |
| AC-39-01 | 通過 | TC-39-01 |
| AC-39-02 | 通過 | TC-39-02 |
| AC-39-03 | 通過 | TC-39-03、TC-39-03b |
| AC-39-04 | 通過 | TC-39-04、TC-39-04v、TC-V-S03 |
| AC-39-05 | 通過 | TC-39-05 |
| AC-39-06 | 通過 | TC-39-06 |
| AC-39-07 | 通過 | TC-39-07 |
| AC-39-08 | 通過 | TC-39-08 |
| AC-39-09 | 通過 | TC-39-09 |
| AC-39-10 | 通過 | TC-39-10 |
| AC-40-01 | 通過 | TC-40-01 |
| AC-40-02 | 通過 | TC-39-10 |
| AC-40-03 | 通過 | TC-38-03、TC-40-03 |
| AC-41-01 | 通過 | TC-41-01 |
| AC-41-02 | 通過 | TC-41-02 |
| AC-41-03 | 通過（另待人工確認） | TC-41-03、TC-LAY-H1 |
| AC-41-04 | 通過（另待人工確認） | TC-41-04、TC-42-01a、TC-42-01b、TC-LAY-H1、TC-VER-H1 |
| AC-42-01 | 通過（另待人工確認） | TC-42-01a、TC-42-01b、TC-X-edge、TC-VER-H1、TC-V-S03 |
| AC-42-02 | 通過（另待人工確認） | TC-42-02、TC-VER-H2、TC-V-S01、TC-V-S02 |
| AC-42-03 | 通過 | TC-42-03a、TC-42-01b、TC-V-S01 |
| AC-42-04 | 通過（另待人工確認） | TC-42-04a、TC-42-04b、TC-42-04c、TC-42-04d、TC-VER-H3 |
| AC-43-01 | 通過 | TC-43-01、TC-43-02、TC-X-edge |
| AC-43-02 | 通過 | TC-43-02、TC-V-S03 |
| AC-43-03 | 通過 | TC-43-03a、TC-43-03b |

## 8. 變更紀錄

| 版本 | 日期 | 作者 | 說明 |
| :--- | :--- | :--- | :--- |
| 0.1 | 2026-10-30 | qa-agent | 初版：範圍 all，158 個 TC（自動化 144、QA 檢視 6、人工 8），141 個 AC 全部對應 |
| 0.2 | 2026-10-30 | qa-agent | BUG-001／BUG-002 退回修正第 1 輪驗證：新增 TC-16-01c；冷啟動與多次執行的效能判定規則；TC-M07 新增 (7)(8)；TC-08-14b 加驗。合計 159 個 TC |
| 0.3 | 2026-10-30 | qa-agent | BUG-002 退回修正第 2 輪驗證：依人類決議（JimmyLin「偶爾失敗沒關係」）新增 §2.3 效能多輪判定；TC-22-01 改嚴格量法；新增 TC-22-01r；TC-M07 新增 (9)(10)。合計 160 個 TC |
| 0.4 | 2026-11-02 | qa-agent | 第 3 輪（/qa-verify all）：範圍改為 PRD v0.10（33 個 US、214 個 AC，應驗收 192、暫停 22 標不適用）。新增 E2E 套件 e2e-firstrun、e2e-progress（v0.8，2026-10-30 暫停前已建立）、e2e-mic、e2e-hidden、e2e-reinit、e2e-motion 與共用 `lib/state.mjs`、`fakeMic`；改寫 e2e-goal（只點卡片、預設 725、localStorage 驗分數、TC-26-06）；e2e-cards、e2e-speech、e2e-env、e2e-persist、e2e-progress、e2e-firstrun 改為導覽 4 項、點卡片、麥克風替身；解碼器與句型庫的 TC（TC-12-01～TC-16-04b、TC-14-02、TC-16-01b、TC-16-01c）與分數輸入的 TC（TC-01-06、TC-02-01、TC-02-02、TC-02-07、TC-02-09、TC-26-03）記「不適用（暫停）」；移除 `perf-phrasebank.mjs`。靜態檢查 TC-S05 改依 architecture §10 v0.5、新增 TC-S10；越界新增 boundary-delta（TC-B03）。人工 TC 改寫並新增 TC-M09、TC-M10、TC-MIC-1～TC-MIC-5（V-MIC）。新增 §2.2 第 3 輪判定規則（暫停 AC、FB-36、AC-20-04／AC-26-05 判定方式、V-MIC、效能）。§5、§7 改由 `tests/tools/tc-list.mjs`、`ac-matrix.mjs` 依執行結果產生 |
| 0.5 | 2026-11-03 | qa-agent | 第 4 輪（/qa-verify，PRD v0.11 PWA）：範圍改為 PRD v0.11（37 個 US、243 個 AC，應驗收 221、暫停 22）。新增 §1.1、§2.4（PWA 模擬方式與判定規則）、§6.1（TC-PWA-H1～H5 人工步驟）；§2、§3、§4 加入 Playwright（devDependency `playwright-core` 1.64.1）、`tests/static/pwa-static.mjs`、`tests/e2e/e2e-pwa.mjs`、`e2e-pwa-update.mjs`、`lib/pwa-env.mjs`、`diag-install-button.mjs`；無內建資料 fixture 改為只含 `sources.js` 的資料目錄＋`--no-site`；靜態檢查 TC-S01（PWA 部署目錄、`data:` 圖示白名單）、TC-S06（品牌標識聲明）更新；越界檢查加入授權例外；§5、§7 依第 4 輪結果重新產生。合計 311 個 TC。同日 BUG-003 複驗（主控重新產生圖示，BUILD_ID 5b5ae7a6d4bd0164）後重新產生 §5、§7 |
| 0.6 | 2026-11-03 | qa-agent | 第 5 輪（/qa-verify，PRD v0.13 版面風格）：範圍改為 PRD v0.13（41 個 US、270 個 AC；應驗收 36 個 US、248 個 AC，暫停 22）。新增 §1.2、§2.5（量測方式與判定規則：色彩掃描與標題列圖示例外、WCAG 對比合成、v0.11 對照與固定 Math.random、鍵盤、首屏、cz-color__range 規則調整）、§4.2、§6.2（TC-LAY-H1～H3 與既有人工 TC 的步驟調整）；新增 `e2e-layout.mjs`、`lib/layout-probe.mjs`、`boundary-r5.mjs`、`qa-review-r5.mjs`；static-check 新增 TC-S11、TC-L-S01～S04；既有 E2E 依 SD-FB-45 更新定位點；§5、§7 依第 5 輪結果重新產生。合計 351 個 TC |
| 0.7 | 2026-11-03 | qa-agent | 第 6 輪（PRD v0.14）：範圍 43 個 US、278 個 AC（應驗收 251、暫停 27）。新增 §1.3、§2.6（版本行、範本區、「範本」字樣、狀態列、「變更」按鈕的量測與判定；SD-FB-54 定位點）、§4.3、§6.3（TC-VER-H1～H3；TC-M03／M05／M07 範本步驟改寫）；§5、§7 依第 6 輪結果重新產生（367 個 TC；251 個應驗收 AC 全部涵蓋） |
