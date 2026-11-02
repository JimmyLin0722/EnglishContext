---
doc: TEST-PLAN
version: 0.3
status: in-review
author: qa-agent
approved_by:
approved_at:
---

# English Master Track — 測試計畫（第 5 階段驗收）

## 1. 範圍與依據

| 項目 | 內容 |
| :--- | :--- |
| 驗收範圍 | all：PRD v0.7 全部 141 個 AC（US-01～US-24） |
| 驗收標準 | `docs/01-PRD.md` v0.7 的 AC（唯一標準） |
| 參考文件 | `docs/02-contract/` v0.7（驗證規則 V-*、IM-*、RS-*）、`docs/03-design/architecture.md` v0.3（§7.6 STT 錯誤對照表、§8.4 抽查門檻、§9 停用按鈕例外、§10 測試策略）、`docs/03-design/tasks.json` v0.2（42 個任務，全部 done） |
| 受測物 | `dist/english-master-track.html`（初版 3,022,217 bytes；v0.3 退回修正第 2 輪 3,047,158 bytes）；資料檔 `src/data/`；程式 `src/app/` |
| 不在本計畫 | PG 的單元測試（`npm test` 342 項）與資料自驗（`npm run validate:data`）由 PG 負責；QA 只在報告中記錄其執行結果，驗收結論以本計畫的 TC 為準 |

## 2. 測試方式

| 方式 | 工具／位置 | 說明 |
| :--- | :--- | :--- |
| 自動化（資料檢查） | `tests/data/data-check.mjs` | 獨立實作，不引用 `src/data/_tools/`：以 `node:vm` 載入資料檔，依契約 §4.1 R-1～R-4 自 `sources/wordlists/` 重算排名，對照 AC-03-06～09、AC-06-08、AC-23-02～05 等 |
| 自動化（紀錄完整性） | `tests/data/records-check.mjs` | architecture §8.4「QA（v0.3）」：`validate.mjs --all --max 100000` 的每筆 V-VOC-17、H-1W、V-VOC-09 原創原因在 `_records/` 皆有對應列 |
| 自動化（靜態檢查） | `tests/static/static-check.mjs` | 產物外部資源、大小、禁用 DOM API、金鑰與語音 SDK、錄音 API、授權標頭、不打包內部檔；並以 `tools/build.mjs --out` 重建比對 `dist/` 是否位元組相同 |
| 自動化 E2E | `tests/e2e/*.mjs`、`tests/e2e/lib/cdp.mjs` | 以 Chrome DevTools Protocol 驅動本機無頭 Chrome（`--headless=new`），`file://` 開啟 `dist/`。以真實滑鼠／觸控／鍵盤事件（`Input.dispatch*`）操作；未安裝任何套件 |
| QA 檢視 | `src/data/_tools/sample.mjs` + 人工判讀 | V-VOC-18 抽查（每分檔 5%、至少 20 筆）、Part 5 正解唯一性（每題型 10 題）、V-VOC-17 判斷正確性 |
| 越界檢查 | `tests/static/boundary-check.mjs` | 每個檔案是否屬於某任務 `paths`；`sources/`、`english_master_track.md`、`docs/` 是否遭 PG 修改 |
| 人工 | 本計畫 §6 | 真機才能驗證的項目 |
| 一鍵執行 | `npm run test:e2e`（= `node tests/run-all.mjs`） | 依序執行上述自動化並彙整到 `tests/results/summary.json` |

### 2.1 模擬環境（architecture §10）

| 對象 | 模擬方式（`tests/e2e/lib/inits.mjs`，以 `Page.addScriptToEvaluateOnNewDocument` 注入） |
| :--- | :--- |
| TTS | 假 `speechSynthesis`／`SpeechSynthesisUtterance`：記錄 `speak` 的文字、`lang`、`rate`、語音與 `cancel` 次數；三種模式：有 en-US 本機語音、只有非 en-US 語音、API 不存在 |
| STT | 假 `webkitSpeechRecognition`：測試端呼叫 `emitResult(text)`、`emitError(code)`、`emitEnd()`；或 API 不存在 |
| 剪貼簿 | 覆寫 `navigator.clipboard`：成功（記錄寫入內容）、Promise 拒絕、不存在 |
| localStorage | 停用（存取即拋 `SecurityError`）、容量不足（`setItem` 拋 `QuotaExceededError`，可於執行中開關）；資料損壞以直接寫入不合法字串 |
| 離線 | CDP `Network.emulateNetworkConditions { offline: true }`（`navigator.onLine === false`） |
| 日期 | 覆寫 `Date` 為指定本地日期（打卡跨日、時鐘調回） |
| CPU 降速 | CDP `Emulation.setCPUThrottlingRate { rate: 4 }` |
| 無內建資料 | 以 `tools/build.mjs --out <暫存> --data <空目錄>` 建置 fixture，用於單字集為空、少於 4 字的情境（AC-06-06、AC-09-06）；正式資料下單字集最少 1,000 張，無法由 UI 造成 |

### 2.2 判定規則與已知決議

| 項目 | 判定 |
| :--- | :--- |
| 畫面文字 | PRD 以「」標出者逐字比對（architecture §4.1） |
| AC-17-06 | 主控台每日新字量依「生效色級」（PRD v0.7 R-14）：套用 730、860 時顯示 15 字/天 |
| 停用的 TTS／麥克風按鈕 | 須有 `aria-disabled="true"` 與非空 `title`、**沒有** `disabled` 屬性，點擊出現 toast 且不執行動作（architecture §9 例外） |
| 字首字 | 詞性為 `pref.`（契約 v0.7 M-8） |
| 匯入 `write_failed` | 畫面文字「儲存失敗，未匯入」（契約 v0.7）；本版僅能以單元測試覆蓋，E2E 以 `quota` 驗 AC-24-09 |
| STT 錯誤碼 | 依 architecture §7.6 對照表，主訊息逐字相符、補充說明包含表列字串 |
| 解碼器註解片段 | AC-20-02 判定標準為「可用觸控完成操作」；§9 的 44px 下限列舉的是按鈕、選項、滑桿把手。片段為行內文字，觸控可操作即判定通過，尺寸列為觀察事項 |
| 效能（AC-22-xx、AC-02-07、AC-16-01） | 自動化在本機無頭 Chrome（非 PRD 基準環境）量測一般與 4 倍降速各 10 次，作為參考判定；超過 100ms 即開缺陷，最終以人工 TC-M07 在基準環境複測 |
| 效能：冷啟動（v0.2） | **自動化判定不列入**「瀏覽器程序啟動後，各頁在該程序中第一次繪製的那次切換」（冷啟動）；改由人工 TC-M07 第 (7) 項在基準環境量測。自動化 TC-22-01 的 4 倍降速量測本就在同一瀏覽器以一般條件走過全部頁面後重新載入進行，之後的每一次量測（含重新載入後第一次切到各頁）**全部列入**。理由見 test-report §11.2 |
| 效能：多次執行（v0.2） | ~~同一輪驗證中，效能 TC 的任何一次正式執行有任一量測 > 100ms 即判失敗~~（v0.3 起由下列「多輪判定」取代，只適用 TC-22-01、TC-16-01b、TC-16-01c；其餘效能 TC 仍為每筆 ≤ 100ms） |
| 效能：多輪判定（v0.3，人類決議 JimmyLin 2026-10-30「偶爾失敗沒關係」） | 適用 **TC-22-01、TC-16-01b、TC-16-01c**，見 §2.3 |
| 效能：嚴格量法（v0.3，TC-22-01） | AC-22-01 的終點是「新頁面完成繪製」。頁面若把任何區塊先設 `hidden`、之後才顯示（例如 FE-10 的 `#customizer-custom` 延後一個畫格），計時到**該區塊轉為顯示的那個畫格繪製完成**為止（在 rAF 回呼內偵測到 `hidden === false`，再等 `setTimeout 0`）；只量到第一個畫格的寬鬆量法僅列為參考（TC-22-01r） |
| 內容抽查門檻 | V-VOC-18：單一分檔不合格率 > 5%（20 筆中 ≥ 2 筆）整批退回；1 筆開 minor（architecture §8.4） |

### 2.3 效能多輪判定規則（v0.3）

| 步驟 | 規則 |
| :--- | :--- |
| 1 執行 | `tests/e2e/e2e-env.mjs` 的效能區塊執行 N 輪（`QA_PERF_RUNS`，預設 7，最少 3），每輪重新啟動瀏覽器；每輪量一般與 4 倍降速兩種條件。冷啟動規則（§2.2）不變 |
| 2 排除偏高輪 | 對每種條件，以 TC-22-01 的 10 個切頁位置計算「全部輪次同位置的中位數」；某一輪若**過半數位置（≥ 6/10）** 都 > 該中位數的 2 倍，視為「同一輪多數頁面同時偏高」，該輪在該條件下的 TC-22-01、TC-16-01b、TC-16-01c 樣本全部排除 |
| 3 判定 | 剩餘有效輪數 ≥ 3，且（a）每個量測位置（同一頁面／同一按鍵序號）跨輪的**中位數 ≤ 100ms**、（b）合併全部有效樣本的 **p90 ≤ 100ms**，兩種條件都符合才通過 |
| 4 不改變 | 偶發單筆 > 100ms 不判失敗，但會在報告列出筆數；系統性超標（某一頁每輪都超標）會讓 (a) 不成立而判失敗 |
| 5 最終依據 | 自動化結果僅供參考；最終以人工 TC-M07 在基準環境的結果為準 |

## 3. 環境

| 項目 | 版本 |
| :--- | :--- |
| 作業系統 | Windows 11 Pro 10.0.26200 |
| Node.js | v24.15.0（Volta） |
| 瀏覽器 | Google Chrome（主要，無頭）、Microsoft Edge（跨瀏覽器冒煙：重跑套件 e2e-goal） |
| 新增相依 | 無（未安裝 Playwright；`package.json` 僅新增 script `test:e2e`，依 architecture SD-FB-02 允許的範圍） |

## 4. 測試套件

| 套件 | 檔案 | 涵蓋 |
| :--- | :--- | :--- |
| 資料 | `tests/data/data-check.mjs` | TC-D01～TC-D17 |
| 靜態 | `tests/static/static-check.mjs` | TC-S01～TC-S09 |
| E2E 1 目標與字庫 | `tests/e2e/e2e-goal.mjs` | US-01、US-02、US-03、AC-17-06、AC-18-02、AC-22-02 |
| E2E 2 卡片與備份 | `tests/e2e/e2e-cards.mjs` | US-04、US-05、US-06、US-09、AC-17-02～05、AC-23-01、US-24 |
| E2E 3 語音 | `tests/e2e/e2e-speech.mjs` | US-07、US-08、AC-21-03、AC-22-03 |
| E2E 4 內容頁 | `tests/e2e/e2e-content.mjs` | US-10～US-16、AC-17-01、AC-17-04、AC-23-02 |
| E2E 5 環境 | `tests/e2e/e2e-env.mjs` | AC-18-03～06、AC-24-09、AC-19-02、AC-19-03、US-20、US-21、US-22、AC-14-02 |
| E2E 6 持久化 | `tests/e2e/e2e-persist.mjs` | AC-18-01 |
| QA 檢視 | `tests/results/qa-review.json` | TC-D18～TC-D20、TC-B01、TC-B02、TC-X-edge |
| 人工 | §6 | TC-M01～TC-M08 |

## 5. TC 清單

共 160 個 TC：自動化 146、QA 檢視 6、人工 8（v0.2 新增 TC-16-01c；v0.3 新增 TC-22-01r）。「TC-X-*」為各套件結束時的「無未處理例外」檢查。

| TC | 對應 AC | 方式 | 腳本 | 驗證重點 |
| :--- | :--- | :--- | :--- | :--- |
| TC-01-01 | AC-01-01 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | 依序顯示橘、棕、綠、藍、金 5 個按鈕；橘、棕、綠顯示分數範圍、建議字量（N_O、N_B、N_G 的實際數字）、適用情境；藍、金顯示分數範圍、適用情境、鎖定圖示與「即將開放」，建議… |
| TC-01-02 | AC-01-02 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | 「目前生效色級」顯示綠，抽認卡單字集依 US-03 規則更新為排名 1～N_G + 自訂單字 |
| TC-01-03 | AC-01-03 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | 生效色級仍為綠，抽認卡單字集不變 |
| TC-01-04 | AC-01-04 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | 生效色級仍為棕，分數仍為 300 |
| TC-01-05 | AC-01-05 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | 分數變為 470，試算結果同步更新；若目前分數為 500（已在綠範圍內）再點「綠」，分數維持 500（Q-32、Q-15：已在該色範圍內則不變，否則設為該色下限） |
| TC-01-06 | AC-01-06 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | 畫面標示分數對應色級為「棕」，但「目前生效色級」仍顯示綠，抽認卡單字集不變 |
| TC-01-07 | AC-01-07、AC-03-03 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | 點擊後分數變為 730、分數對應色級標示「藍（即將開放）」並顯示提示「目前內建字庫到綠色為止」，不阻擋設定；套用後「目前目標色級」顯示藍、「目前生效色級」顯示「綠（內建上限）」，單… |
| TC-02-01 | AC-02-01 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | 數字輸入框同步顯示 720；反之在輸入框輸入 720，滑桿位置同步到 720 |
| TC-02-02 | AC-02-02 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | 不接受該值，顯示提示「請輸入 10～990 的分數」，試算結果維持上一個有效值 |
| TC-02-03 | AC-02-03 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | 自訂器試算區的每日新字量依序為 10、10、10、10、15、15、20、20、20、20（字/天），依分數對應色級取值（藍、金的 20 僅供試算，Q-28）；學習主控台顯示的每日… |
| TC-02-04 | AC-02-04 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | 對應色級依序為橘、橘、棕、棕、綠、綠、藍、藍、金、金 |
| TC-02-05a | AC-02-05 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | 建議總字量 TargetVocab(S) = Color(S) 的建議字量；預計週數 = ⌈(TargetVocab(S) − c) ÷ (W_d × 7)⌉。例（c = 0）：S… |
| TC-02-05b | AC-02-05 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | 建議總字量 TargetVocab(S) = Color(S) 的建議字量；預計週數 = ⌈(TargetVocab(S) − c) ÷ (W_d × 7)⌉。例（c = 0）：S… |
| TC-02-06 | AC-02-06 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | 預計週數顯示 0，並顯示「已達成目標字量」，不得出現負數 |
| TC-02-07 | AC-02-07、AC-22-04 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | 建議總字量、每日新字量、預計週數三項在 100ms 內更新 |
| TC-02-08 | AC-02-08 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | 滑桿與輸入框顯示 735，試算結果與重新載入前相同 |
| TC-02-09 | AC-02-09 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | 分別修正為 725、720 並據以試算；滑桿以 5 分為步進 |
| TC-02-10a | AC-02-10 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | 對應色級標示「藍（即將開放）」；建議總字量顯示「待定」；每日新字量 20；預計週數 = ⌈(N_G − c) ÷ 140⌉，旁註「以目前內建字庫上限（綠）試算」（例：N_G = 6… |
| TC-02-10b | AC-02-10 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | 對應色級標示「藍（即將開放）」；建議總字量顯示「待定」；每日新字量 20；預計週數 = ⌈(N_G − c) ÷ 140⌉，旁註「以目前內建字庫上限（綠）試算」（例：N_G = 6… |
| TC-03-05 | AC-03-05 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | 抽認卡回到新單字集第 1 張，且顯示正面 |
| TC-03-06 | AC-03-06、AC-03-01、AC-03-02、AC-03-04 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | 「共 N 張」依序為 N_O（1,000，Q-29）、N_B、N_G，與契約文件記錄的字表實際字數一致（功能詞不扣除，Q-30） |
| TC-04-01 | AC-04-01 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 包含：英文單字（必填）、中文釋義（必填）、音標、詞性、搭配詞、論文例句（後四者選填） |
| TC-04-02 | AC-04-02 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 新單字出現在自訂單字清單，標記為「自訂擴充」，並可在抽認卡中翻閱、播放 TTS、進行 STT 評分 |
| TC-04-03 | AC-04-03 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 不儲存，該欄位顯示錯誤提示 |
| TC-04-04 | AC-04-04 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 內容以原文字元顯示，不出現圖片元素、不執行任何腳本 |
| TC-04-05 | AC-04-05 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 自訂單字仍存在且內容一致 |
| TC-04-06 | AC-04-06 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 不新增重複項，提示「單字已存在」 |
| TC-04-07 | AC-04-07 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 該字從自訂清單與抽認卡單字集移除，「共 N 張」減 1；重新載入後仍不存在 |
| TC-04-08 | AC-04-08 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 顯示原本的下一張（若 X 是最後一張則顯示前一張），不出現空白卡；若刪除後單字集為空，依 AC-06-06 顯示空狀態 |
| TC-04-08b | AC-04-08、AC-06-06 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 顯示原本的下一張（若 X 是最後一張則顯示前一張），不出現空白卡；若刪除後單字集為空，依 AC-06-06 顯示空狀態 |
| TC-05-01 | AC-05-01 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 有「資工」「商管」「生醫統計」3 個範本按鈕 |
| TC-05-02 | AC-05-02、AC-05-04 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 自訂清單至少包含 Latency、Scalability；「資工」範本共 10 字，提示「已注入 N 個單字」，N = 範本中尚未存在於自訂清單與內建字庫的字數 |
| TC-05-03 | AC-05-03 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 自訂清單分別包含 Monetization、Heterogeneous；兩個範本各為 10 字（v0.5 依 FB-12 決議 A，商管範本以 Monetization 取代規格書… |
| TC-05-05 | AC-05-05 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 範本單字出現在單字集中，可播放 TTS 與進行 STT 評分 |
| TC-06-01 | AC-06-01 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 顯示單字、音標、多益常考搭配詞、TTS 1.0x 按鈕、TTS 0.75x 按鈕、麥克風按鈕 |
| TC-06-02 | AC-06-02、AC-06-03 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 顯示背面：詞性、中文釋義、學術文獻應用情境（有值時）、完整例句 |
| TC-06-04 | AC-06-04、AC-06-05 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 顯示「第 i / N 張」；在第 1 張時「上一張」呈停用狀態，在第 N 張時「下一張」呈停用狀態，點擊不產生任何變化 |
| TC-06-06 | AC-06-06 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 顯示空狀態訊息並引導至自訂器，不顯示空白卡片 |
| TC-06-07 | AC-06-07 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 內建單字：背面不顯示學術情境欄（標題與內容一併隱藏）；自訂單字：空白欄位顯示「—」或隱藏；畫面不得出現 undefined、null 字樣或只有標題沒有內容的欄位 |
| TC-07-01 | AC-07-01、AC-07-02 | 自動化 E2E | `tests/e2e/e2e-speech.mjs` | 以 lang = en-US、rate = 1.0 朗讀目前卡片單字 |
| TC-07-03 | AC-07-03 | 自動化 E2E | `tests/e2e/e2e-speech.mjs` | 先停止目前朗讀再播放新的，不累積排隊播放 |
| TC-07-04 | AC-07-04 | 自動化 E2E | `tests/e2e/e2e-speech.mjs` | TTS 按鈕呈停用狀態，點擊或滑過時提示不支援；其他功能正常 |
| TC-07-05 | AC-07-05 | 自動化 E2E | `tests/e2e/e2e-speech.mjs` | 顯示提示「此裝置未安裝美式英語語音」，不拋出未處理錯誤 |
| TC-08-01 | AC-08-01 | 自動化 E2E | `tests/e2e/e2e-speech.mjs` | 辨識語言設為 en-US；按鈕切換為「聆聽中」狀態（紅色閃爍或文字提示） |
| TC-08-02 | AC-08-02 | 自動化 E2E | `tests/e2e/e2e-speech.mjs` | 顯示 Toast「建議使用 Google Chrome / Edge」，不拋出未處理錯誤 |
| TC-08-03 | AC-08-03 | 自動化 E2E | `tests/e2e/e2e-speech.mjs` | 比對前兩字串皆轉小寫、去除標點與空白，分數為 100 |
| TC-08-04 | AC-08-04 | 自動化 E2E | `tests/e2e/e2e-speech.mjs` | 編輯距離 1、長度最大值 7，分數 = round((1 − 1/7) × 100) = 86 |
| TC-08-05 | AC-08-05 | 自動化 E2E | `tests/e2e/e2e-speech.mjs` | 編輯距離 3，分數 = round((1 − 3/7) × 100) = 57 |
| TC-08-06 | AC-08-06、AC-08-07、AC-08-08 | 自動化 E2E | `tests/e2e/e2e-speech.mjs` | 依序為綠、綠、黃、黃、紅、紅燈 |
| TC-08-09 | AC-08-09（含 §7.6 錯誤對照表） | 自動化 E2E | `tests/e2e/e2e-speech.mjs` | 顯示「需要麥克風權限」及開啟方式說明，按鈕回到待機狀態 |
| TC-08-10 | AC-08-10 | 自動化 E2E | `tests/e2e/e2e-speech.mjs` | 停止聆聽，按鈕回到待機狀態；逾時或空結果時提示「未偵測到語音，請再試一次」，不顯示分數 |
| TC-08-11 | AC-08-11 | 自動化 E2E | `tests/e2e/e2e-speech.mjs` | 分數標題為「辨識吻合度」，畫面不出現「發音評分」字樣；分數區附一行說明「此分數比對的是語音辨識出的文字，不代表音素層級的發音準確度」 |
| TC-08-12 | AC-08-12 | 自動化 E2E | `tests/e2e/e2e-speech.mjs` | 清洗後為 complywith 對 complywith、compliedwith，分數分別為 100 與 round((1 − 3/12) × 100) = 75（黃燈） |
| TC-08-13 | AC-08-13 | 自動化 E2E | `tests/e2e/e2e-speech.mjs` | 麥克風按鈕旁常駐標示「需要連網」；首次按下時先顯示說明：「語音辨識由瀏覽器提供，您的語音會傳送到瀏覽器廠商（如 Google、Microsoft）的伺服器處理；本系統不保存、不上傳… |
| TC-08-14 | AC-08-14 | 自動化 E2E | `tests/e2e/e2e-speech.mjs` | 顯示「語音辨識需要網路連線」，按鈕回到待機狀態，不顯示分數，不拋出未處理錯誤 |
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
| TC-12-01 | AC-12-01、AC-12-02、AC-12-03 | 自動化 E2E | `tests/e2e/e2e-content.mjs` | 主詞為藍色系、核心動詞為紅色系、受詞/補語為綠色系、修飾語/子句/插入語為紫色系標籤，並有顏色圖例 |
| TC-13-01 | AC-13-01、AC-13-02、AC-13-03、AC-13-04 | 自動化 E2E | `tests/e2e/e2e-content.mjs` | 所有修飾語元素計算後樣式 opacity 為 0.3 且套用灰階；主詞、動詞、受詞元素 opacity 維持 1 |
| TC-14-01 | AC-14-01 | 自動化 E2E | `tests/e2e/e2e-content.mjs` | 有「Abstract 摘要」「方法論」「文獻回顧（Research Gap）」3 個主題，各有非空的提示內容 |
| TC-14-02 | AC-14-02、AC-23-02（375px） | 自動化 E2E | `tests/e2e/e2e-env.mjs` | 3 個主題皆可閱讀完整內容（可展開或捲動） |
| TC-15-01 | AC-15-01 | 自動化 E2E | `tests/e2e/e2e-content.mjs` | 有「全部」「研究空白 Gap」「研究目的 Aim」「研究結果 Findings」「研究限制 Limitations」篩選項 |
| TC-15-02 | AC-15-02、AC-15-03 | 自動化 E2E | `tests/e2e/e2e-content.mjs` | 只顯示 Gap 類句型；4 類各至少 25 則，共至少 100 則 |
| TC-16-01 | AC-16-01 | 自動化 E2E | `tests/e2e/e2e-content.mjs` | 每次按鍵後 100ms 內，清單只顯示含該關鍵字的句型（不分大小寫，比對英文模板與中文說明），且與目前分類條件同時成立 |
| TC-16-01b | AC-16-01 | 自動化 E2E | `tests/e2e/e2e-env.mjs` | 每次按鍵後 100ms 內，清單只顯示含該關鍵字的句型（不分大小寫，比對英文模板與中文說明），且與目前分類條件同時成立 |
| TC-16-01c | AC-16-01 | 自動化 E2E | `tests/e2e/e2e-env.mjs` | （v0.2 新增，BUG-002 第 1 輪驗證）重新載入後切到句型庫，在分批補齊完成前立即輸入「g」：篩選結果在同一 `input` 事件內同步完成且與資料相符；按鍵到繪製一般與 4 倍降速各 5 次，v0.3 起依 §2.3 多輪判定 |
| TC-16-02 | AC-16-02 | 自動化 E2E | `tests/e2e/e2e-content.mjs` | 顯示「找不到符合的句型」 |
| TC-16-03 | AC-16-03 | 自動化 E2E | `tests/e2e/e2e-content.mjs` | 剪貼簿內容與該句型模板文字完全相同，並顯示「已複製」提示 |
| TC-16-04a | AC-16-04 | 自動化 E2E | `tests/e2e/e2e-content.mjs` | 顯示「複製失敗，請手動選取」並將該句文字反白選取，不拋出未處理錯誤 |
| TC-16-04b | AC-16-04 | 自動化 E2E | `tests/e2e/e2e-content.mjs` | 顯示「複製失敗，請手動選取」並將該句文字反白選取，不拋出未處理錯誤 |
| TC-17-01 | AC-17-01 | 自動化 E2E | `tests/e2e/e2e-content.mjs` | 顯示連續打卡天數、單字掌握數、Part 5 正確率 |
| TC-17-02 | AC-17-02 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 連續打卡天數為 2；同一天多次學習不重複累加；中斷一天後再學習，天數重設為 1。日期以裝置本地時區計 |
| TC-17-04a | AC-17-04 | 自動化 E2E | `tests/e2e/e2e-content.mjs` | 顯示 70%（四捨五入至整數）；答題數為 0 時顯示「—」，不得顯示 NaN 或 Infinity |
| TC-17-04b | AC-17-04 | 自動化 E2E | `tests/e2e/e2e-content.mjs` | 顯示 70%（四捨五入至整數）；答題數為 0 時顯示「—」，不得顯示 NaN 或 Infinity |
| TC-17-05 | AC-17-05 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 打卡天數不變、不為負，也不累加 |
| TC-17-06 | AC-17-06 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | 除 AC-17-01 三項統計外，另顯示目前目標分數 600、目前目標色級與生效色級「綠」、每日新字量 15，以及自訂器、抽認卡、Part 5、解碼器、句型庫 5 個模組入口與「資… |
| TC-18-01 | AC-18-01 | 自動化 E2E | `tests/e2e/e2e-persist.mjs` | 上述資料全部還原，數值與關閉前一致 |
| TC-18-02 | AC-18-02 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | 以預設值啟動：目標分數 600、目標色級與生效色級為綠、單字集 = 排名 1～N_G；無錯誤訊息 |
| TC-18-03 | AC-18-03、AC-24-01 | 自動化 E2E | `tests/e2e/e2e-env.mjs` | 所有功能可在本次工作階段使用；頁面顯示「進度將無法保存」警示 |
| TC-18-04 | AC-18-04 | 自動化 E2E | `tests/e2e/e2e-env.mjs` | 顯示「儲存空間不足」，既有已儲存資料不被破壞 |
| TC-18-05 | AC-18-05 | 自動化 E2E | `tests/e2e/e2e-env.mjs` | 不白屏；改以預設值啟動並提示「資料讀取失敗，已重設」 |
| TC-19-02a | AC-19-02 | 自動化 E2E | `tests/e2e/e2e-env.mjs` | 除標示「需要連網」的 STT（斷網行為依 AC-08-14）外，模組一～六與「資料來源與授權」頁皆可使用；裝置有本機 en-US 語音時 TTS 可播放；Console 無資源載入… |
| TC-20-01 | AC-20-01 | 自動化 E2E | `tests/e2e/e2e-env.mjs` | 無水平捲軸、文字與按鈕不被裁切或重疊 |
| TC-20-02 | AC-20-02 | 自動化 E2E | `tests/e2e/e2e-env.mjs` | 皆可用觸控完成操作 |
| TC-20-03 | AC-20-03 | 自動化 E2E | `tests/e2e/e2e-env.mjs` | 6 個功能區（主控台、自訂器、抽認卡、Part 5、解碼器、句型庫）皆可由導覽到達 |
| TC-21-01 | AC-21-01、AC-18-06、AC-19-03 | 自動化 E2E | `tests/e2e/e2e-env.mjs` | 頁面本身未發出任何網路請求；STT 使用時瀏覽器原生辨識服務對廠商的傳輸不屬於頁面請求，已依 AC-08-13 事先告知使用者 |
| TC-21-03 | AC-21-03（執行期） | 自動化 E2E | `tests/e2e/e2e-speech.mjs` | 不保存任何音訊資料；不使用 MediaRecorder 錄製或儲存音檔 |
| TC-22-01 | AC-22-01 | 自動化 E2E | `tests/e2e/e2e-env.mjs` | 從點擊事件到新頁面完成繪製 ≤ 100ms；v0.3 起採嚴格量法（§2.2）與多輪判定（§2.3） |
| TC-22-01r | AC-22-01 | 自動化 E2E | `tests/e2e/e2e-env.mjs` | （v0.3 新增，BUG-002 第 2 輪）嚴格量法終點有效性：終點時 `#customizer-custom` 已顯示、高度 > 0 且有內容；同時記錄寬鬆量法與「嚴格 + 再一個畫格」兩種參考值（不另行判定效能） |
| TC-22-02 | AC-22-02 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | 從點擊到抽認卡單字集更新繪製完成，每次 ≤ 100ms |
| TC-22-02b | AC-22-02 | 自動化 E2E | `tests/e2e/e2e-env.mjs` | 從點擊到抽認卡單字集更新繪製完成，每次 ≤ 100ms |
| TC-22-03 | AC-22-03 | 自動化 E2E | `tests/e2e/e2e-speech.mjs` | 從 onresult 事件觸發到分數徽章與顏色繪製完成，每次 ≤ 100ms（不含使用者說話與辨識等待時間） |
| TC-22-03b | AC-22-03 | 自動化 E2E | `tests/e2e/e2e-env.mjs` | 從 onresult 事件觸發到分數徽章與顏色繪製完成，每次 ≤ 100ms（不含使用者說話與辨識等待時間） |
| TC-22-04 | AC-22-04 | 自動化 E2E | `tests/e2e/e2e-env.mjs` | 從輸入事件到試算結果繪製完成，每次 ≤ 100ms |
| TC-22-05a | AC-22-05 | 自動化 E2E | `tests/e2e/e2e-env.mjs` | 從開始載入（performance.timeOrigin）到主控台的模組入口可點擊，一般條件每次 ≤ 3 秒、4 倍 CPU 降速每次 ≤ 6 秒（Q-27） |
| TC-23-01 | AC-23-01 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 卡片顯示出處：該字出現的全部來源字表名稱、版本與授權（例：「單字來源：NGSL 1.2（CC BY-SA 4.0）」），以及音標、釋義各自依該欄位的實際來源標示：來源標記為 ECD… |
| TC-23-02 | AC-23-02 | 自動化 E2E | `tests/e2e/e2e-content.mjs` | 列出本檔案實際使用的每一份外部資料（各字表與 ECDICT）：名稱、版本、原作者、授權名稱、授權條款網址、官網網址（純文字顯示即可）；註明本系統對外部資料做的修改：字表（合併、去重… |
| TC-24-01 | AC-24-01、AC-24-02 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 下載 1 個 .json 檔，檔名含匯出日期（本地時區 YYYYMMDD）；過程不產生任何網路請求；localStorage 被停用時仍可匯出本次工作階段的資料 |
| TC-24-03 | AC-24-03 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 上述資料全部還原，數值與匯出時一致；重新載入頁面後仍為匯入的資料 |
| TC-24-04 | AC-24-04 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 不匯入，目前資料完全不變 |
| TC-24-05 | AC-24-05 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 顯示「備份檔格式錯誤，未匯入」；目前資料完全不變；不白屏、不拋出未處理錯誤 |
| TC-24-06 | AC-24-06 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 顯示「備份檔版本不相容」並列出檔案版本與支援版本；不匯入，目前資料完全不變 |
| TC-24-07 | AC-24-07 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 內容以原文字元顯示，不出現圖片元素、不執行任何腳本（同 AC-04-04、AC-04-09） |
| TC-24-08 | AC-24-08 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 重複的自訂單字與不存在的已掌握單字被略過，不計入單字掌握數；完成後提示「已匯入，略過 N 筆」（N 為略過筆數） |
| TC-24-09 | AC-24-09 | 自動化 E2E | `tests/e2e/e2e-env.mjs` | 顯示「儲存空間不足，未匯入」；匯入前已儲存的資料不被破壞（不出現只寫入一部分的狀態） |
| TC-B01 | （越界檢查） | QA 檢視（腳本＋人工判讀） | `tests/static/boundary-check.mjs` | tests/static/boundary-check.mjs：專案 168 個檔案中，屬於某任務 paths 120 個、人類／上游文件 34 個、QA tests/ 14 個，… |
| TC-B02 | （越界檢查：sources/、english_master_track.md、docs/） | QA 檢視（腳本＋人工判讀） | `src/data/_tools/sample.mjs＋人工判讀` | english_master_track.md 最後修改 2026-10-29 14:02；sources/ 全部檔案最後修改 ≤ 2026-10-30 10:06，早於任何 sr… |
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
| TC-D18 | AC-23-02、AC-23-03（architecture §8.4 紀錄完整性、契約 V-VOC-09／V-VOC-17） | QA 檢視（腳本＋人工判讀） | `tests/data/records-check.mjs` | tests/data/records-check.mjs 比對 validate.mjs --all --max 100000 全量輸出：V-VOC-17 警告 8 筆、V-VOC… |
| TC-D19 | AC-23-03（契約 V-VOC-18、architecture §8.4 QA 抽查） | QA 檢視（腳本＋人工判讀） | `src/data/_tools/sample.mjs＋人工判讀` | sample.mjs --ratio 0.05 --min 20 --seed <起始排名+1000> --ecdict-only，15 個分檔共抽 301 筆（vocab-240… |
| TC-D20 | AC-11-01（契約 V-P5-05 正解唯一性，architecture §10 建議每題型 10 題） | QA 檢視（腳本＋人工判讀） | `src/data/_tools/sample.mjs＋人工判讀` | 固定種子 20261030 每題型抽 10 題共 40 題（p5-021、029、045、117、129、137、157、161、165、181、014、038、046、078、0… |
| TC-M01 | AC-08-01、AC-08-09、AC-08-13、AC-08-14、AC-21-01 | 人工 | `docs/04-qa/test-report.md §6` | 真實麥克風辨識與權限流程 |
| TC-M02 | AC-07-01～AC-07-05 | 人工 | `docs/04-qa/test-report.md §6` | 真實 TTS 語音 |
| TC-M03 | AC-19-02 | 人工 | `docs/04-qa/test-report.md §6` | 實際斷網以 file:// 開啟 |
| TC-M04 | AC-19-03、AC-18-01 | 人工 | `docs/04-qa/test-report.md §6` | 雙擊開啟、關閉分頁後重開 |
| TC-M05 | AC-20-01～AC-20-03 | 人工 | `docs/04-qa/test-report.md §6` | Android Chrome 實機觸控 |
| TC-M06 | AC-24-01、AC-24-03 | 人工 | `docs/04-qa/test-report.md §6` | 跨裝置匯出匯入 |
| TC-M07 | AC-22-01～AC-22-05、AC-02-07、AC-16-01 | 人工 | `docs/04-qa/test-report.md §6` | 基準環境效能量測 |
| TC-M08 | AC-23-04 | 人工 | `docs/04-qa/test-report.md §6` | 原創性 20 筆精確片語搜尋 |
| TC-S01 | AC-19-01 | 自動化（靜態檢查） | `tests/static/static-check.mjs` | 只有 1 個 .html 檔；所有 CSS 以 <style> 內嵌；檔案中無指向外部的 <script src>、<link href>、@import、外部字型或圖片網址，不含… |
| TC-S02 | AC-19-04 | 自動化（靜態檢查） | `tests/static/static-check.mjs` | ≤ 5 MB（5,242,880 bytes） |
| TC-S03 | AC-04-09 | 自動化（靜態檢查） | `tests/static/static-check.mjs` | 皆以 textContent 或等效的純文字方式寫入 DOM；不使用 innerHTML、outerHTML、insertAdjacentHTML、document.write 插… |
| TC-S04 | AC-21-02 | 自動化（靜態檢查） | `tests/static/static-check.mjs` | 無任何付費服務金鑰或第三方語音 SDK |
| TC-S05 | AC-21-03（程式面） | 自動化（靜態檢查） | `tests/static/static-check.mjs` | 不保存任何音訊資料；不使用 MediaRecorder 錄製或儲存音檔 |
| TC-S06 | AC-23-06 | 自動化（靜態檢查） | `tests/static/static-check.mjs` | 含程式碼 MIT 授權聲明（Copyright (c) <年份> JimmyLin 與 MIT 條款全文，Q-31），以及「單字資料與原創內容（例句、解析、Part 5 題目、長難… |
| TC-S07 | AC-04-04、AC-24-07（產物） | 自動化（靜態檢查） | `tests/static/static-check.mjs` | 內容以原文字元顯示，不出現圖片元素、不執行任何腳本 |
| TC-S08 | AC-19-01（D-1 不打包） | 自動化（靜態檢查） | `tests/static/static-check.mjs` | 只有 1 個 .html 檔；所有 CSS 以 <style> 內嵌；檔案中無指向外部的 <script src>、<link href>、@import、外部字型或圖片網址，不含… |
| TC-S09 | AC-19-01（交付物可追溯） | 自動化（靜態檢查） | `tests/static/static-check.mjs` | 只有 1 個 .html 檔；所有 CSS 以 <style> 內嵌；檔案中無指向外部的 <script src>、<link href>、@import、外部字型或圖片網址，不含… |
| TC-X-cards | （全套件）無未處理例外 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 例外：[] |
| TC-X-content | （全套件）無未處理例外 | 自動化 E2E | `tests/e2e/e2e-content.mjs` | [] |
| TC-X-edge | AC-19-02（Chrome／Edge）跨瀏覽器冒煙 | QA 檢視（腳本＋人工判讀） | `tests/e2e/e2e-goal.mjs（QA_BROWSER=edge）` | 以 Microsoft Edge（headless）重跑套件 e2e-goal 全部 25 個 TC：25 通過，結果見 tests/results/e2e-goal-edge.j… |
| TC-X-fixture | （fixture）無未處理例外 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | [] |
| TC-X-goal | （全套件）無未處理例外 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | 例外：[]；console.error：[] |
| TC-X-speech | （全套件）無未處理例外 | 自動化 E2E | `tests/e2e/e2e-speech.mjs` | [] |

## 6. 人工驗收 TC

| TC | 對應 AC | 環境 | 步驟 | 通過條件 |
| :--- | :--- | :--- | :--- | :--- |
| TC-M01 | AC-08-01、AC-08-09、AC-08-13、AC-08-14、AC-21-01 | 桌機 Chrome、Edge 最新版；Android Chrome；有麥克風 | (1) 清除網站資料後以 `file://` 開啟；(2) 抽認卡頁按麥克風，確認先出現語音辨識說明對話框，按「取消」不聆聽；(3) 再按，按「我知道了」後瀏覽器跳出麥克風權限，選「允許」並唸出卡片單字，確認按鈕顯示「聆聽中」、結束後出現「辨識吻合度」分數與燈號；(4) 網址列將麥克風改為「封鎖」後再按，確認顯示「需要麥克風權限」與開啟方式；(5) 拔除網路線或關閉 Wi-Fi 後按麥克風，確認顯示「語音辨識需要網路連線」且不顯示分數；(6) 全程開 DevTools Network，確認頁面本身沒有請求 | 每步畫面文字與 AC 一致；無未處理錯誤；Network 面板除 `file://` 主檔外無請求 |
| TC-M02 | AC-07-01～AC-07-05 | 桌機 Chrome、Edge；Android Chrome；一台未安裝 en-US 語音的裝置（例：Windows 移除英文語音套件） | (1) 抽認卡頁按 1.0x、0.75x，確認為美式口音且 0.75x 明顯較慢；(2) 朗讀中再按任一速度、或按「下一張」，確認先停止再播放、不排隊；(3) 在無 en-US 語音的裝置按 1.0x，確認顯示「此裝置未安裝美式英語語音」；(4) 以不支援 SpeechSynthesis 的瀏覽器（若有）確認按鈕為停用外觀、點擊有提示 | 語音為美式、速度正確、無排隊；提示文字逐字相符 |
| TC-M03 | AC-19-02 | 桌機 Chrome、Edge，**實際斷網**（拔線或關閉 Wi-Fi） | (1) 斷網；(2) 檔案總管雙擊 `english-master-track.html`；(3) 依序操作主控台、自訂器（套用、新增自訂字、注入範本）、抽認卡（翻卡、TTS、四選一）、Part 5、解碼器、句型庫（搜尋、複製）、資料來源與授權頁；(4) 開 DevTools Console | 除 STT（依 AC-08-14 提示）外全部可用；有本機 en-US 語音時 TTS 可播放；Console 無資源載入失敗錯誤 |
| TC-M04 | AC-19-03、AC-18-01 | 桌機 Chrome、Edge，未啟動任何本機伺服器 | (1) 檔案總管雙擊開啟；(2) 套用分數 455、新增自訂字、作答 2 題 Part 5、翻一張卡；(3) 關閉分頁（或整個瀏覽器）後再雙擊開啟同一檔 | 頁面完整顯示並可操作；目標分數、生效色級、自訂字、Part 5 題號與統計、打卡天數皆與關閉前一致 |
| TC-M05 | AC-20-01～AC-20-03 | Android Chrome 實機（寬約 360～412px） | (1) 以手指操作：選單展開與 6 個功能區切換、色級按鈕、拖曳分數滑桿、表單輸入與送出、範本、刪除、翻卡、上下張、TTS、麥克風、四選一、Part 5 選項與下一題、解碼器（下一句、淡化、點註解片段）、閱讀策略展開、句型篩選與複製、頁尾連結；(2) 每頁上下捲動檢查 | 全部可用手指完成；無水平捲軸；文字與按鈕不被裁切或重疊；解碼器註解片段可準確點中（觀察是否需要加大） |
| TC-M06 | AC-24-01、AC-24-03 | 兩台裝置（或同一台兩個瀏覽器）| (1) 裝置 A 匯出備份，確認下載 1 個 `english-master-track-backup-YYYYMMDD.json`（本地日期）；(2) 複製到裝置 B，以同一 `.html` 匯入並確認；(3) 重新載入 | 裝置 B 的資料與 A 匯出時一致，重新載入後仍在 |
| TC-M07 | AC-22-01～AC-22-05、AC-02-07、AC-16-01 | 中階筆電 + 最新版 Chrome；另以 DevTools Performance「CPU: 4x slowdown」 | 以 DevTools Performance 錄製：(1) 導覽切換頁面 10 次（含首次與再次進入句型庫）；(2) 套用綠 + 3 個範本全部注入後按「套用」10 次；(3) 拖曳分數滑桿 10 次；(4) 句型庫搜尋框逐字輸入與刪除 10 次；(5) STT 評分 10 次（從 `onresult` 到徽章繪製）；(6) 清除快取後以 `file://` 開啟 5 次，量 `performance.timeOrigin` 到 `performance.getEntriesByName("emt-ready")`；(7)（v0.2，冷啟動）關閉所有 Chrome 視窗並確認背景程序結束，重新啟動 Chrome 後以 `file://` 開啟，依序點「自訂器、抽認卡、Part 5、解碼器、句型庫、主控台、資料來源、自訂器、抽認卡、主控台」並錄製，重複 3 次（4 倍降速須在開檔前先於 DevTools 設好）；(8)（v0.2）重新載入後切到句型庫，1 秒內在搜尋框輸入第一個字，重複 5 次；(9)（v0.3，觀察項）在句型庫「全部」狀態下以滑鼠滾輪、拖曳捲軸、鍵盤 End／Home 由頂端捲到底再捲回，觀察捲軸滑塊長度與位置是否因視窗外卡片的估計高度（`contain-intrinsic-size`）而微幅變動、內容是否突然位移，並判斷是否可接受；(10)（v0.3，觀察項）切到自訂器時，下方「自訂單字」區於約 1 個畫格後才出現，立即捲到該區確認無閃爍或版面跳動 | (1)～(5)、(7)、(8) 每次 ≤ 100ms（基準環境以此為準；自動化參考值的多輪判定見 §2.3）；(9)、(10) 記錄觀察結果，由人類判斷是否可接受；(6) 一般 ≤ 3 秒、4 倍降速 ≤ 6 秒；兩種條件都要量。(7) 超標時依頁面另開缺陷（不併入 BUG-002） |
| TC-M08 | AC-23-04 | 可連網的電腦 | 對 `test-report.md` §6.2 列出的 20 筆內容，以搜尋引擎「精確片語」（加雙引號）搜尋整句，並比對 ETS 官方出版題本與 Manchester Academic Phrasebank（https://www.phrasebank.manchester.ac.uk/） | 20 筆皆無逐字相同的整句 |

## 7. AC 對照（AC → TC）

全部 141 個 AC 皆至少對應 1 個 TC。

| AC | 對應 TC |
| :--- | :--- |
| AC-01-01 | TC-01-01 |
| AC-01-02 | TC-01-02 |
| AC-01-03 | TC-01-03 |
| AC-01-04 | TC-01-04 |
| AC-01-05 | TC-01-05 |
| AC-01-06 | TC-01-06 |
| AC-01-07 | TC-01-07 |
| AC-02-01 | TC-02-01 |
| AC-02-02 | TC-02-02 |
| AC-02-03 | TC-02-03 |
| AC-02-04 | TC-02-04 |
| AC-02-05 | TC-02-05a、TC-02-05b |
| AC-02-06 | TC-02-06 |
| AC-02-07 | TC-02-07、TC-M07 |
| AC-02-08 | TC-02-08 |
| AC-02-09 | TC-02-09 |
| AC-02-10 | TC-02-10a、TC-02-10b |
| AC-03-01 | TC-03-06 |
| AC-03-02 | TC-03-06 |
| AC-03-03 | TC-01-07 |
| AC-03-04 | TC-03-06 |
| AC-03-05 | TC-03-05 |
| AC-03-06 | TC-D01、TC-03-06 |
| AC-03-07 | TC-D02 |
| AC-03-08 | TC-D03 |
| AC-03-09 | TC-D04 |
| AC-04-01 | TC-04-01 |
| AC-04-02 | TC-04-02 |
| AC-04-03 | TC-04-03 |
| AC-04-04 | TC-04-04、TC-S07 |
| AC-04-05 | TC-04-05 |
| AC-04-06 | TC-04-06 |
| AC-04-07 | TC-04-07 |
| AC-04-08 | TC-04-08、TC-04-08b |
| AC-04-09 | TC-S03 |
| AC-05-01 | TC-D11、TC-05-01 |
| AC-05-02 | TC-D11、TC-05-02 |
| AC-05-03 | TC-D11、TC-05-03 |
| AC-05-04 | TC-05-02 |
| AC-05-05 | TC-05-05 |
| AC-06-01 | TC-D06、TC-06-01 |
| AC-06-02 | TC-D06、TC-D07、TC-06-02 |
| AC-06-03 | TC-06-02 |
| AC-06-04 | TC-06-04 |
| AC-06-05 | TC-06-04 |
| AC-06-06 | TC-06-06、TC-04-08b |
| AC-06-07 | TC-D06、TC-06-07 |
| AC-06-08 | TC-D05 |
| AC-07-01 | TC-07-01、TC-M02 |
| AC-07-02 | TC-07-01、TC-M02 |
| AC-07-03 | TC-07-03、TC-M02 |
| AC-07-04 | TC-07-04、TC-M02 |
| AC-07-05 | TC-07-05、TC-M02 |
| AC-08-01 | TC-08-01、TC-M01 |
| AC-08-02 | TC-08-02 |
| AC-08-03 | TC-08-03 |
| AC-08-04 | TC-08-04 |
| AC-08-05 | TC-08-05 |
| AC-08-06 | TC-08-06 |
| AC-08-07 | TC-08-06 |
| AC-08-08 | TC-08-06 |
| AC-08-09 | TC-08-09、TC-M01 |
| AC-08-10 | TC-08-10 |
| AC-08-11 | TC-08-11 |
| AC-08-12 | TC-08-12 |
| AC-08-13 | TC-08-13、TC-M01 |
| AC-08-14 | TC-08-14、TC-08-14b、TC-M01 |
| AC-09-01 | TC-09-01 |
| AC-09-02 | TC-D17、TC-09-02 |
| AC-09-03 | TC-09-03 |
| AC-09-04 | TC-09-04 |
| AC-09-05 | TC-09-05 |
| AC-09-06 | TC-09-06 |
| AC-09-07 | TC-09-07 |
| AC-10-01 | TC-D12 |
| AC-10-02 | TC-D12、TC-10-02 |
| AC-11-01 | TC-11-01、TC-D20 |
| AC-11-02 | TC-D12、TC-11-01 |
| AC-11-03 | TC-11-01 |
| AC-11-04 | TC-11-04 |
| AC-11-05 | TC-11-05 |
| AC-11-06 | TC-11-01 |
| AC-11-07 | TC-11-04 |
| AC-12-01 | TC-12-01 |
| AC-12-02 | TC-D13、TC-12-01 |
| AC-12-03 | TC-D13、TC-12-01 |
| AC-13-01 | TC-13-01 |
| AC-13-02 | TC-13-01 |
| AC-13-03 | TC-13-01 |
| AC-13-04 | TC-13-01 |
| AC-14-01 | TC-D14、TC-14-01 |
| AC-14-02 | TC-14-02 |
| AC-15-01 | TC-15-01 |
| AC-15-02 | TC-D15、TC-15-02 |
| AC-15-03 | TC-15-02 |
| AC-16-01 | TC-16-01、TC-16-01b、TC-16-01c、TC-M07 |
| AC-16-02 | TC-16-02 |
| AC-16-03 | TC-16-03 |
| AC-16-04 | TC-16-04a、TC-16-04b |
| AC-17-01 | TC-17-01 |
| AC-17-02 | TC-17-02 |
| AC-17-03 | TC-09-03 |
| AC-17-04 | TC-17-04a、TC-17-04b |
| AC-17-05 | TC-17-05 |
| AC-17-06 | TC-17-06 |
| AC-18-01 | TC-18-01、TC-M04 |
| AC-18-02 | TC-18-02 |
| AC-18-03 | TC-18-03 |
| AC-18-04 | TC-18-04 |
| AC-18-05 | TC-18-05 |
| AC-18-06 | TC-21-01 |
| AC-24-01 | TC-24-01、TC-18-03、TC-M06 |
| AC-24-02 | TC-24-01 |
| AC-24-03 | TC-24-03、TC-M06 |
| AC-24-04 | TC-24-04 |
| AC-24-05 | TC-24-05 |
| AC-24-06 | TC-24-06 |
| AC-24-07 | TC-24-07、TC-S07 |
| AC-24-08 | TC-24-08 |
| AC-24-09 | TC-24-09 |
| AC-23-01 | TC-23-01 |
| AC-23-02 | TC-D10、TC-23-02、TC-14-02、TC-D18 |
| AC-23-03 | TC-D08、TC-D18、TC-D19 |
| AC-23-04 | TC-D16、TC-M08 |
| AC-23-05 | TC-D09 |
| AC-23-06 | TC-S06 |
| AC-19-01 | TC-S01、TC-S08、TC-S09 |
| AC-19-02 | TC-19-02a、TC-X-edge、TC-M03 |
| AC-19-03 | TC-21-01、TC-M04 |
| AC-19-04 | TC-S02 |
| AC-20-01 | TC-20-01、TC-M05 |
| AC-20-02 | TC-20-02、TC-M05 |
| AC-20-03 | TC-20-03、TC-M05 |
| AC-21-01 | TC-21-01、TC-M01 |
| AC-21-02 | TC-S04 |
| AC-21-03 | TC-21-03、TC-S05 |
| AC-22-01 | TC-22-01、TC-22-01r、TC-M07 |
| AC-22-02 | TC-22-02b、TC-22-02、TC-M07 |
| AC-22-03 | TC-22-03b、TC-22-03、TC-M07 |
| AC-22-04 | TC-22-04、TC-02-07、TC-M07 |
| AC-22-05 | TC-22-05a、TC-M07 |

## 8. 變更紀錄

| 版本 | 日期 | 作者 | 說明 |
| :--- | :--- | :--- | :--- |
| 0.1 | 2026-10-30 | qa-agent | 初版：範圍 all，158 個 TC（自動化 144、QA 檢視 6、人工 8），141 個 AC 全部對應 |
| 0.2 | 2026-10-30 | qa-agent | BUG-001／BUG-002 退回修正第 1 輪驗證：新增 TC-16-01c（句型庫分批補齊前的首次按鍵，AC-16-01）；§2 新增冷啟動與多次執行的效能判定規則；TC-M07 新增 (7) 冷啟動、(8) 首次按鍵；TC-08-14b 加驗 `lastResult` 為 null 與恢復連線後可再評分。合計 159 個 TC（自動化 145、QA 檢視 6、人工 8） |
| 0.3 | 2026-10-30 | qa-agent | BUG-002 退回修正第 2 輪驗證：依人類決議（JimmyLin，2026-10-30「偶爾失敗沒關係」）新增 §2.3 效能多輪判定規則（中位數 + p90，排除同一輪多數頁面同時偏高的輪次），套用 TC-22-01、TC-16-01b、TC-16-01c，取代 v0.2「任一次超標即失敗」；TC-22-01 改採嚴格量法（計時到延後顯示的區塊也繪製完成）；新增 TC-22-01r（嚴格量法終點有效性與寬鬆量法參考值）；TC-M07 新增 (9) 句型庫捲軸長度觀察、(10) 自訂器延後顯示觀察。合計 160 個 TC（自動化 146、QA 檢視 6、人工 8） |
