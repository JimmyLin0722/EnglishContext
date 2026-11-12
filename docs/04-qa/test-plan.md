---
doc: TEST-PLAN
version: 0.14
status: in-review
author: qa-agent
approved_by:
approved_at:
---

# English Master Track — 測試計畫（第 5 階段驗收）

> **v0.14（第 13 輪，2026-11-12）**：1.4.0，一般驗收（不跑全套回歸），範圍依 architecture v0.22 §10.15（Q21～Q28）、§13.15：PRD v0.24 R-32 島嶼風格第一階段（新增 US-63～US-72 共 50 個 AC，修改 12 個 AC，移除 AC-38-06）與 tasks.json v0.20 FE-102～FE-117 covers 中的既有 AC，共 74 個 AC。新增 §1.10、§2.13、§4.10、§5.1、§6.10、§7.1；§5、§7 全表維持第 12 輪內容，全套重新產生留待發版驗收。第 12 輪以前的內容保留。
>
> **v0.13（第 12 輪，2026-11-09）**：1.3.2，範圍依 architecture v0.17 §10.14（Q13～Q20）：PRD v0.21（R-30：新增 US-62 共 12 個 AC，修改 AC-08-10、AC-30-04、AC-42-02、AC-58-07、AC-59-01、AC-59-05；R-31：修改 AC-10-02、AC-54-01，連帶重跑 AC-56-03、AC-56-05～AC-56-07、AC-57-03、AC-23-08），應驗收 400 個 AC；回歸 AC-58、AC-59、AC-60、AC-33 與全套。新增 §1.9、§2.12、§4.9、§6.9，§5、§7 依第 12 輪結果重新產生。第 11 輪以前的內容保留。
>
> **v0.12（第 11 輪，2026-11-06）**：1.3.1 修正輪，範圍依 architecture v0.16 §10.13（Q8～Q12）：複驗 BUG-006、BUG-007、BUG-008，回歸第 10 輪涉及項目；PRD v0.20、契約 v0.20 不變（應驗收 388 個 AC）。新增 §1.8、§2.11、§4.8、§6.8，§5、§7 依第 11 輪結果重新產生。第 10 輪以前的內容保留。
>
> **v0.11（第 10 輪，2026-11-05）**：範圍依 architecture v0.15 §10.12、§13.12：PRD v0.20（R-29：新增 US-58～US-61 共 31 個 AC，修改 15 個 AC，E-156～E-166），應驗收 388 個 AC；驗證 BUG-005 修正。新增 §1.7、§2.10、§4.7、§6.7，§5、§7 依第 10 輪結果重新產生。第 9 輪以前的內容保留。
>
> **v0.10（第 9 輪，2026-11-05）**：範圍依 architecture v0.14 §10.11、§13.11：PRD v0.19（R-27、R-28：新增 US-49～US-57 共 57 個 AC，修改 36 個 AC，E-135～E-155），應驗收 357 個 AC。新增 §1.6、§2.9、§4.6、§6.6，§5、§7 依第 9 輪結果重新產生。第 8 輪以前的內容保留。
>
> **v0.9（第 8 輪，2026-11-04）**：針對性驗收，範圍依 architecture v0.13 §10.10（Q1～Q5）：PRD v0.18（R-26：新增 US-48 共 12 個 AC，修改 13 個 AC，移除 AC-46-07）、補 v0.16、v0.17 留下的 TC（AC-23-07 行數、AC-23-08、AC-10-02、LT-5、AC-38-08）。新增 §1.5、§2.8、§4.5、§6.5，§5、§7 依第 8 輪結果重新產生。第 7 輪以前的內容保留。
>
> **v0.8（第 7 輪，2026-11-04）**：範圍擴大為 PRD v0.15（R-23：新增 US-44～US-47 共 36 個 AC，修改 AC-18-01、AC-24-02、AC-32-02、AC-42-02，例外 E-102～E-117，C-8 改讀 8 條 AC），並全套回歸。新增 §1.4、§2.7、§4.4、§6.4，§5、§7 依第 7 輪結果重新產生。第 6 輪以前的內容保留。
>
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

### 1.4 第 7 輪範圍（PRD v0.15，學習位置與作答紀錄）

| 項目 | 內容 |
| :--- | :--- |
| 驗收範圍 | PRD v0.15 共 47 個 US、314 個 AC；應驗收 **41 個 US、287 個 AC**；暫停 6 個 US、27 個 AC 標「不適用（暫停）」（與第 6 輪相同） |
| 新增 AC（36） | AC-44-01～AC-44-10（US-44 單字卡上次位置）、AC-45-01～AC-45-08（US-45 答對紀錄）、AC-46-01～AC-46-10（US-46 只練沒答對）、AC-47-01～AC-47-08（US-47 保存、備份、舊資料相容） |
| 修改 AC（4） | AC-18-01、AC-24-02（列入 3 項新資料）、AC-32-02（初始化含答對紀錄、「已答對 0 / Q 題」）、AC-42-02（版本 1.1.0，Q-70 A） |
| C-8 改讀（8） | AC-01-08、AC-26-06、AC-32-10、AC-36-04、AC-37-06、AC-38-10、AC-42-03、AC-43-03：「`schemaVersion` 2」改讀為本版目前版本 3、`data` 由 9 欄改讀為 12 欄；AC-37-06、AC-38-10 比對對象為「同一版程式在操作前的狀態」（共通規則 2） |
| 例外 | E-102～E-114、E-116 由新 TC 涵蓋；E-115（多分頁）、E-117（降版匯入）為 PRD 範圍外，不設 TC |
| 參考文件 | 契約 v0.15（README §5.3 MG-5～MG-8、RD-3、RD-4；§5.10 FP-1～FP-9；§5.11 CR-1～CR-9、UO-1～UO-9；§5.12 WR-1～WR-5；§6.2 IM-9、IM-10；§7.4 V-P5-08；§7.7 V-ST-18～V-ST-22；data-schema.ts §15 `PART5_RECORD_TEXTS`；FB-54～FB-60）；architecture v0.10（§7.21、§10.7 E2E 表、SD-FB-57～SD-FB-64）；tasks.json v0.9（FE-70～FE-76、CT-25 done；主控 MC-04） |
| 受測物 | `dist/english-master-track.html` 3,375,522 bytes＋`dist/site/` 8 檔（BUILD_ID `33dcbafd5b611fc6`，版本行「版本 1.1.0（建置 33dcbaf）」）；QA 以 `tools/build.mjs --out` 重建與 `dist/` 逐位元組相同（TC-S09） |
| 舊版對照 | v1.0.0 舊交付檔（主控提供，scratchpad `v1.0.0-english-master-track.html`，`emt-app-version` 1.0.0）：TC-47-04b 實際學習後以 1.1.0 開啟；diag-r7-perf 效能 A/B。FE-70 凍結樣本 `src/app/__tests__/_samples/`（唯讀，QA 只讀取）：TC-47-03、TC-47-04 |
| 回歸 | `npm test`、`npm run validate:data`（含 V-P5-08）、靜態檢查、越界檢查、既有 E2E 全套（依主控指示逐一執行各套件，避免記憶體不足）＋ Edge 冒煙 |
| 越界基準 | git HEAD `a5eee06`；本輪變更須在 FE-70～FE-76、CT-25 paths 內 |
| 授權例外（不算越界） | `package.json`（MC-04，只改 version 1.0.0 → 1.1.0）；`docs/01-PRD.md`、`docs/02-contract/`、`docs/03-design/`。主控接受的 PG 偏離（驗其行為符合 AC，不算越界）：FE-74 無位置紀錄且解析為第 1 張時記憶體保留 `null`（SD-FB-60）；FE-74 `writeData` 只把 3 個新欄位交給 `ensureWritable` |

### 1.5 第 8 輪範圍（PRD v0.18，已答對鎖定檢視）

| 項目 | 內容 |
| :--- | :--- |
| 驗收範圍 | architecture v0.13 §10.10 Q1～Q5；PRD v0.18、契約 v0.18、tasks.json v0.12（FE-78～FE-82、CT-26 done；主控 MC-05、MC-06） |
| Q1 新增 AC（12） | AC-48-01～AC-48-12（US-48），E-124～E-134 併入 |
| Q2 修改 AC（13） | AC-11-04、AC-11-05、AC-11-07、AC-42-02、AC-45-03、AC-45-04、AC-45-06、AC-46-01、AC-46-02、AC-46-04、AC-46-05、AC-46-06、AC-46-09；AC-46-07 記「不適用（v0.18 移除）」 |
| Q3 更新案例 | §10.9、§10.10 列出的舊文字、舊版本、舊行為（e2e-version、e2e-pwa-update、e2e-pwa、e2e-cards、e2e-content、e2e-layout、e2e-track、e2e-track-p5、static-check、tc-desc.json、本檔）；新增 `boundary-r8.mjs` |
| Q4 補 TC | AC-23-08（TC-23-08a、b、s）、AC-10-02（TC-10-02-*）、AC-23-02 LT-5（TC-23-02c、TC-23-02d-*）、AC-23-07 行數（TC-23-07-*，Range 量測，SD-FB-69）、AC-38-08（TC-38-08 標籤以外結構不變） |
| Q5 回歸 | `npm test`、`npm run validate:data`、靜態與越界檢查；§10.10 列的 E2E 套件逐一執行。QA 判斷加跑 §10.10 列為「本次可不跑」的 e2e-goal、e2e-firstrun、e2e-speech、e2e-mic、e2e-hidden、e2e-reinit 與 Edge 冒煙，避免彙整中出現舊版受測物的結果 |
| 受測物 | `dist/english-master-track.html`＋`dist/site/` 8 檔（版本 1.2.0、BUILD_ID `be5c8e6ad7ed6061`） |
| 舊版對照 | git `f57145a` 的 v1.1.0 交付檔（TC-48-08-*，實際作答產生資料與備份）；git `a5eee06` 的 v1.0.0 交付檔（TC-47-04b）；git `f547158` 的 `src/data/part5.js`（TC-23-08b） |
| 越界基準 | git HEAD `f57145a`；本輪變更須在 FE-80～FE-82 paths 內；`tools/`、`src/data/`、`package-lock.json`、`storage-schema.json` diff 須為 0 |
| 授權例外（不算越界） | `package.json`（MC-06，只改 version 1.1.0 → 1.2.0）；`docs/01-PRD.md`、`docs/02-contract/README.md`、`docs/02-contract/data-schema.ts`、`docs/03-design/` |

### 1.6 第 9 輪範圍（PRD v0.19，已答對題數、廣告框架、對外頁面與 SEO）

| 項目 | 內容 |
| :--- | :--- |
| 驗收範圍 | architecture v0.14 §10.11 Q1～Q6、§13.11；PRD v0.19、契約 v0.19、tasks.json v0.13（FE-83～FE-89 done；主控 MC-07、MC-08） |
| Q1 新增 AC（57） | AC-49-01～AC-57-06，E-135～E-155 併入 |
| Q2 修改 AC（36） | §13.11 列出的 36 個 |
| Q3 舊文字、舊結構 | static-check、pwa-static、e2e-layout、e2e-firstrun、e2e-progress、e2e-content、e2e-track、e2e-reinit、e2e-track-p5、e2e-lock、e2e-goal、e2e-version、e2e-pwa、`tc-desc.json`、本檔 |
| Q4 V-AD 基礎設施 | `tests/e2e/fixtures/ad-stub.js`、`tests/tools/build-ad-test.mjs`、`tests/e2e/lib/ad-env.mjs`；測試建置輸出落在 `QA_TMP`，不在 `dist/` |
| Q5 信箱 | `tests/static/legal-check.mjs` 移除連續地址；`tests/e2e/e2e-legal.mjs` 改現行值；新增 `tests/static/mail-scan.mjs`；舊紀錄遮蔽 |
| Q6 回歸 | `npm test`、`validate:data`、靜態與越界；全部 `e2e-*` 逐套件執行（`tests/tools/run-r9.mjs`）；Edge 冒煙；效能 A/B |
| 受測物 | `dist/english-master-track.html`＋`dist/site/` 13 檔（版本 1.3.0、BUILD_ID `2769ee9fc5c56941`） |
| 舊版對照 | git `25e3c3f` 的 v1.2.0 交付檔（TC-49-06*：實際作答與匯出；TC-38-09f；效能 A/B；TC-52-05b） |
| 越界基準 | git HEAD `25e3c3f`；變更須在 FE-83～FE-89 paths 內（含主控代核的 FE-86 `naming.test.js`、FE-87 `load-order.test.js`）；`src/data/`、`package-lock.json`、`storage-schema.json`、`sources/` diff 須為 0 |
| 授權例外（不算越界） | `package.json`（MC-07，只改 version）；`.github/workflows/static.yml`（MC-08）；`docs/01-PRD.md`、`docs/02-contract/`、`docs/03-design/` |

### 1.7 第 10 輪範圍（PRD v0.20，語音準備中、訊息分流、辨識文字、窄視窗鍵盤焦點）

| 項目 | 內容 |
| :--- | :--- |
| 驗收範圍 | architecture v0.15 §10.12 Q1～Q7、§13.12；PRD v0.20（61 個 US、415 個 AC；**應驗收 55 個 US、388 個 AC**，暫停 27）、契約 v0.20（§14 PR／MS／RT／KF／V-STT、data-schema §18）、tasks.json v0.14（FE-90～FE-94 done；主控 MC-09 done） |
| 新增 AC（31） | AC-58-01～AC-58-14、AC-59-01～AC-59-08、AC-60-01～AC-60-07、AC-61-01、AC-61-02；E-156～E-166 併入 |
| 修改 AC（15） | AC-08-01、AC-08-06、AC-08-07、AC-08-08、AC-08-10、AC-08-13、AC-22-03、AC-30-04、AC-31-03、AC-33-01、AC-33-03、AC-33-06、AC-33-07、AC-33-08、AC-42-02 |
| 本版必須通過 | AC-38-09（BUG-005 複驗）；回歸 AC-27-03、AC-39 首屏、AC-41-04、AC-44-01、AC-57-01、AC-20-01、AC-19-01、AC-21-03、AC-36-07 |
| 人工（真人語音） | AC-58-14、AC-59-08（TC-58-14h、TC-59-08h），自動化不可判定 |
| 受測物 | `dist/english-master-track.html` 3,471,008 bytes＋`dist/site/` 13 檔（版本 1.3.1、BUILD_ID `3d149370fe32c550`） |
| 舊版對照 | git `a358556` 的 1.3.0 交付檔（BUG-005 對照、1366 回歸、首次畫面觀察、舊資料相容、效能 A/B） |
| 越界基準 | git HEAD `a358556`；變更須在 FE-90～FE-94 paths 內；`src/data/`、`package-lock.json`、`storage-schema.json`、`tools/`、`.github/` diff 須為 0（M-2：`static.yml` 不變） |
| 授權例外（不算越界） | `package.json`（MC-09，只改 version 1.3.0 → 1.3.1）；`docs/01-PRD.md`、`docs/02-contract/`、`docs/03-design/` |
| BUG | BUG-005 複驗；BUG-006 維持 `open`（第二階段，不重測） |

### 1.8 第 11 輪範圍（1.3.1 修正輪：BUG-006、BUG-007、BUG-008）

| 項目 | 內容 |
| :--- | :--- |
| 驗收範圍 | architecture v0.16 §7.28、§7.29、§10.13（Q8～Q12、M-1～M-5）、§12.15；tasks.json v0.15（FE-95、FE-96、FE-97 done）；PRD v0.20、契約 v0.20 **不變**（應驗收 388 個 AC） |
| 複驗 BUG | BUG-007（AC-58-01，FE-95）、BUG-008（AC-60-06，FE-96）、BUG-006（AC-52-05，FE-96；含 `tests/tools/build-ad-test.mjs` 廣告測試建置與一般捲軸） |
| 回歸重點 | 第 10 輪 §21 涉及的 US-58～US-61 自動化項目；AC-33-01、AC-33-03、AC-33-07、AC-21-03、AC-20-01、AC-40-02、AC-61-01、AC-61-02、AC-42-02、AC-36-07、AC-19-01；舊資料相容；正式建置跨來源請求 0；`dist/site` 13 檔、預先快取 7 項；信箱掃描 |
| 受測物 | `dist/english-master-track.html`＝`dist/site/index.html` 3,476,024 bytes（SHA-256 `1be0719b…`）＋`dist/site/` 13 檔；版本 1.3.1、BUILD_ID `5f0dc11a7433624d`（第 10 輪 `3d149370fe32c550`） |
| 對照組 | 1.3.0（git `a358556`）；**第 10 輪樣式對照組**：目前原始碼、只把 `00-base.css`、`85-ad.css` 還原為 FE-96 之前，由 QA 建置到 scratchpad（第 10 輪產物未保留；版面只受樣式影響） |
| 越界基準 | 第 10 輪變更未提交（HEAD 仍 `a358556`），改以「第 10 輪驗收結束 2026-11-05 19:15 之後修改的檔案」判定：須在 FE-95～FE-97 paths 內；PG 只可另改 `tasks.json` 的 status 欄；`package.json`、`src/data/`、`tools/`、`.github/`、`docs/01-PRD.md`、`docs/02-contract/`、`services/ad.js`、`views/flashcards.js`（M-1、M-5）須無變動 |
| 瀏覽器 | 本機 CDP 啟動的無頭 Chrome 與 Edge（`lib/cdp.mjs`），**不加** `--hide-scrollbars`；廣告套件沿用 Playwright（本機 Chrome／Edge），一般捲軸以 `ignoreDefaultArgs: ["--hide-scrollbars"]` |

### 1.9 第 12 輪範圍（PRD v0.21：聆聽中即時文字、商標說明拿掉「Part 5」，版本 1.3.2）

| 項目 | 內容 |
| :--- | :--- |
| 驗收範圍 | architecture v0.17 §7.30、§7.31、§10.14（Q13～Q20、M-1～M-6）、§12.16；PRD v0.21（應驗收 400 個 AC，暫停 27、AC-46-07 移除）、契約 v0.21（§14.6 IT-1～IT-10、MS-1 (2b)／(4)、V-STT-06、V-STT-09～V-STT-17、L-8 LT-2、V-LGL-02、DS-64～DS-71）、tasks.json v0.16（FE-98～FE-101 done；主控 MC-10） |
| 新增 AC（12） | AC-62-01～AC-62-12（US-62）；E-167～E-174 併入 |
| 修改 AC | R-30：AC-08-10、AC-30-04、AC-42-02、AC-58-07、AC-59-01、AC-59-05；R-31：AC-10-02、AC-54-01（US-56 `meta description`） |
| 連帶重跑 | AC-56-03、AC-56-05～AC-56-07、AC-57-03、AC-23-08（V-LGL-02 v0.21：交付物「TOEIC®（多益）Part 5」0 次） |
| 回歸 | §10.14 T9：AC-58-03、AC-58-13、AC-60-06；AC-58 全部、AC-59、AC-60、AC-33；FE-101 未跑完的 TC-58-01f、TC-58-01g、TC-58-04c、TC-33-03r（e2e-stt-flow 第 8 段）；其餘全套照常 |
| 人工 | AC-62-12（TC-62-12h，真人語音 Chrome／Edge／正式網站）、AC-62-07 後半（TC-62-07h，NVDA）、AC-58-14、AC-59-08（與 TC-62-12h 同一輪）、部署後版本行（TC-VER-H2）；列待人工，不算失敗 |
| 受測物 | `dist/english-master-track.html`＝`dist/site/index.html` 3,486,160 bytes（SHA-256 `9b081604199d…`）＋`dist/site/` 13 檔；版本 1.3.2、BUILD_ID `981b0d2ab45de9d6`；QA 以目前原始碼重建 2 次與 `dist/` 14 檔逐檔相同（M-6：是 FE-101 產物，不是試作分支的 `dist/`） |
| 越界基準 | 第 11 輪變更已提交（HEAD `2cb2ca2`），本輪以 `git diff HEAD`＋未追蹤檔＋`dist/site/`（.gitignore 排除，以修改時間晚於 HEAD 判定）：須在 FE-98～FE-101 paths 內；`package.json` 只可改 version 1 行（MC-10）；`src/data/`、`tools/`、`.github/`、`package-lock.json`、`views/flashcards.js`、`state/store.js`、`services/mic.js` 須無變動（M-5）；`storage-schema.json` 只可改 meta |
| 瀏覽器 | 本機 CDP 無頭 Chrome、Edge（`lib/cdp.mjs`，不加 `--hide-scrollbars`）；Service Worker 段（TC-62-10b、e2e-pwa）用 Playwright（本機 8080），因 CDP 開的無頭 Chrome 裝不起 Service Worker（FE-97、FE-101 回報，環境問題） |

### 1.10 第 13 輪範圍（PRD v0.24 R-32：島嶼風格第一階段，版本 1.4.0）

| 項目 | 內容 |
| :--- | :--- |
| 驗收範圍 | 一般驗收（非發版全套回歸）：PRD v0.24 R-32 的 US-63～US-72 共 50 個 AC，加上 tasks.json v0.20 FE-102～FE-117 `covers` 中的既有 AC；architecture v0.22 §7.32、§10.15（Q21～Q28、M-1～M-5、已知設計行為 (14)～(20)）、§13.15；契約 v0.24 §15 V-ISL-01～V-ISL-09、V-LAY-02、V-LAY-07、V-LAY-08、V-LAY-10、L-8 LT-7、V-LGL-03、V-LGL-04 |
| 新增 AC（50） | AC-63-01～AC-63-05、AC-64-01～AC-64-10、AC-65-01～AC-65-04、AC-66-01～AC-66-04、AC-67-01、AC-67-02、AC-68-01～AC-68-06、AC-69-01～AC-69-06、AC-70-01～AC-70-03、AC-71-01～AC-71-05、AC-72-01～AC-72-05 |
| 修改 AC（R-32） | AC-20-03、AC-27-01、AC-30-01、AC-30-05、AC-31-03、AC-32-01、AC-38-08、AC-39-01、AC-39-02、AC-39-05、AC-39-06、AC-42-02 |
| 移除 AC | AC-38-06（由 AC-68-02 取代），記「不適用（v0.22 移除）」 |
| covers 中其他既有 AC | AC-19-01、AC-19-04、AC-20-01、AC-22-01、AC-23-02、AC-23-06、AC-23-08、AC-27-05、AC-34-04、AC-36-07、AC-38-02、AC-39-10；AC-68-04、AC-69-01 指定照常通過的 AC-26-01、AC-40-01～AC-40-03、AC-41-01～AC-41-04、AC-45-04、AC-46-01、AC-48-01、AC-48-12、AC-57-01、AC-06～AC-09、AC-28、AC-33、AC-58～AC-62（由既有套件重跑） |
| 受測物 | `dist/english-master-track.html`＝`dist/site/index.html` 3,588,990 bytes（SHA-256 `b3babdc80c4f…`）＋`dist/site/` 13 檔；版本 1.4.0、BUILD_ID `7ce555b38d85b6c4`；QA 以目前原始碼重建與 `dist/` 位元組相同（TC-S09） |
| 對照組 | v1.3.2：`git show c16d368:dist/english-master-track.html`（AC-68-04、AC-69-01、AC-72-02、效能交錯）；v1.3.2 部署目錄以 `git archive c16d368` 的 src／tools 建置（AC-72-04 本機更新） |
| 越界基準 | 第 12 輪已提交（HEAD `c16d368`），以 `git diff HEAD`＋未追蹤檔＋`dist/site/`（修改時間晚於 HEAD）判定，須在 FE-102～FE-117 paths 內；`package.json` 只改 version 1 行（M-1）；`src/data/`、`tools/`、`src/app/services/`、`src/app/site/static-page.css`、`.github/`、`package-lock.json` 無變動（M-5） |
| 人工 | AC-69-06 後半與 AC-71-01 的 NVDA 播報（TC-69-06h、TC-71-01h）；AC-72-03 (b) 原創性（TC-72-03h，人類 JimmyLin 2026-11-12 已確認通過）；AC-72-04 正式網址部署後更新（TC-72-04h）；AC-70-03 基準環境（TC-M07） |
| 不判定 | 學完後 < 0.5 秒就點「群島」的切頁時間（architecture §10.15 (19)，TC-70-03e 只記參考值） |

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

### 2.7 第 7 輪量測方式與判定規則

| 項目 | 方式／判定 |
| :--- | :--- |
| 工具 | 新套件 `e2e-track.mjs`、`e2e-track-p5.mjs` 以既有 CDP 驅動（`lib/cdp.mjs`，`file://`）；AC-47-08 (b) 以 `lib/pwa-env.mjs`（playwright-core，`tools/serve.mjs` 埠 8080，只關閉自己啟動的伺服器）。全部量測前設 `prefers-reduced-motion: reduce`（頁面有淡入動畫，主控指示） |
| 「兩種寬度」 | 375×667（觸控）、1366×900 |
| 構造狀態 | 依 architecture §10.7「以 DevTools 構造」：直接寫入 localStorage 主鍵後重新載入（`lib/state.mjs` 的 `stateRecord()` 第 7 輪起產生 `schemaVersion` 3、`data` 12 欄；`stateRecordV2()` 產生 v0.14 格式）。需要舊版程式實際寫出的資料時用 FE-70 樣本與 v1.0.0 舊交付檔 |
| 「關閉分頁後重新開啟」 | 導到 `about:blank` 再開啟同一檔（同 e2e-persist） |
| 時間（≤ 100ms） | 在頁面內 `el.click()`，逐影格（`requestAnimationFrame`）檢查條件，量到條件成立的那一影格；滑動以 `touchend` 為起點、`MutationObserver` 偵測文字改變後下一影格為終點。AC-45-01、AC-46-03 另各連續量 10 次（NFR-4），每筆 ≤ 100ms |
| 寫入次數 | 初始化腳本包裝 `Storage.prototype.setItem`，只計主鍵 `englishMasterTrack:state`（遷移寫回 1 次、再載入 0 次、換卡 1 次） |
| 容量不足（AC-44-10 (b)、AC-47-07 (b)） | `storageMode("quota")`＋每次載入先 `__qaQuota = false`，量測時才設為 true（首次畫面「開始學習」的寫入若已失敗，會用掉本工作階段唯一一次提示，WR-2、SD-FB-59）；換卡、翻面、作答、開關、點色級混合 19 次寫入，「儲存空間不足」Toast 恰 1 次、localStorage 原值不變 |
| 對話框按鈕 | AC 只規定「確定」「取消」2 個按鈕，不規定順序；比對時不計順序（現行元件為「取消、確定」） |
| C-8 改讀（SD-FB-57） | 既有 E2E 寫死 `schemaVersion === 2` 的 13 處改為 3；`data` 9 欄改為 12 欄；AC-37-06（加入 PWA 前版本）改判「原 9 欄逐欄相同＋新 3 欄為預設」；AC-42-02 期望 `package.json` 為 1.1.0；AC-42-04 (b) 改以「目前版本修訂號 +1」（1.1.0 → 1.1.1）執行 |
| 效能參考（TC-22-01m 等） | 沿用 §2.3；本輪本機記憶體偏低（可用約 4 GB／32 GB）時 4 倍降速量測波動大，另以 `diag-r7-perf.mjs` 對 1.1.0 與 v1.0.0 做 A/B 交錯量測判讀是否為產品退化 |
| BUG-004 的 AC 歸屬 | 交付檔建置後被直接修改（test-report §18.2.2）：TC-S09、TC-PS-01、TC-42-02、TC-42-04a、TC-X-edge 只因交付檔與重建產物／`index.html` 位元組不同而失敗，失敗只歸屬 AC-36-07；這些 TC 的其他 AC 依其餘檢查結果判定（`ac-matrix.mjs` 的 `BUG_ATTRIB`，BUG-004 verified 後移除） |
| 只能人工 | §6.4 TC-TRK-H1、TC-TRK-H2 |

### 2.8 第 8 輪量測方式與判定規則

| 項目 | 方式／判定 |
| :--- | :--- |
| 鎖定檢視判定 | `lockedSelection` 不存於畫面：`locked` 無法區分 `answered` 與 `lockedReview`，以回饋文字區分。`isLR` = 4 個 `disabled`、`aria-pressed=true` 0 個、回饋「你之前答對過這一題」、有「✓ 曾答對」與可用的「下一題」 |
| AC-48-02 真實輸入 | 滑鼠 `Input.dispatchMouseEvent`（座標點擊）、觸控 `Input.dispatchTouchEvent`（375px）、鍵盤 `Input.dispatchKeyEvent`（Enter 帶 `text: "\r"`，否則不會觸發按鈕預設動作）。觸控與鍵盤另設**對照組**：同一路徑對未作答題作答須生效，證明事件確實送達，避免「沒送到也算通過」 |
| 鍵盤「嘗試點擊」的解讀 | `disabled` 按鈕不可聚焦：Tab 走完全頁須 0 次落在選項；另以 `focus()` 嘗試、按 Enter、空白鍵、A～D、1～4，皆無反應 |
| 計數 | 初始化腳本包裝 `Storage.prototype.setItem`（只計主鍵）；`fakeVibrate` 記錄 `navigator.vibrate`；動畫以 class 與 `getAnimations()` 判定 |
| AC-48-08 舊資料 | 以 git `f57145a` 的 v1.1.0 交付檔開啟，以該版程式實際點擊作答（p5-001、p5-005 答對、其餘答錯，走完 200 題、重新開始、重答），在 3 個時間點取 localStorage，再以 1.2.0 開啟；備份為 v1.1.0 實際匯出。不以手寫資料代替 |
| AC-48-09 (c)(d) 測試資料 | 複製 `src/data` 頂層檔到暫存目錄，在 `part5.js` 末端修改 3 題，以 `tools/build.mjs --data --no-site` 建置後以 `file://` 開啟；不修改專案檔 |
| 行數 | 一律以 Range 量測（SD-FB-69）；AC-10-02、AC-48-12 只回報行數，不以行數判定失敗；AC-23-07 條文要求 1 行，以 1 行判定 |
| 已知設計行為（不開 BUG） | §10.10：容量已滿時清除後重新載入紀錄回來（FB-68）；AC-48-09 (c) 不套用 AC-48-01 解析條件（FB-66）；全部答對畫面本輪結算以 phase = summary 且 y ≥ 1 判定（FB-65）；K ≥ 1 時題目區下移不是缺陷 |
| 效能波動 | 沿用 §2.3、§2.7；本機高負載造成的單次不符重測並註明，最終依人工 TC-M07 |
| 逐一執行 | `tests/tools/run-r8.mjs`：每個套件結束才開始下一個，同時只開 1 個瀏覽器 |
| AC-48-02 範圍外 | 實機觸控與螢幕閱讀器列 TC-TRK-H2（人工） |

### 2.9 第 9 輪量測方式與判定規則

| 項目 | 方式／判定 |
| :--- | :--- |
| 替身驗證與真實 AdSense | 全部標【替身驗證】的 TC 只代表本系統對替身的反應符合 AC。真實 AdSense 行為（FB-73、T-106、T-107）、AC-50-10、實際廣告內容列 TC-AD-H1～H5、TC-50-10h，第二階段才可驗，一律記「待人工」，不記通過 |
| 模擬正式網址 | 需要 service worker 的案例不可只靠 `context.route`：第 9 輪初次執行時瀏覽器對 `sw.js` 的更新檢查繞過路由，連到線上 v1.2.0。改用本機 HTTPS（`lib/ad-env.mjs startProdServer`），`--host-resolver-rules` 把正式主機對應到本機、其他主機一律解析失敗，不連外 |
| 離線 | `context.setOffline` 後重新載入，`navigator.onLine` 仍可能回 true（Playwright 模擬限制，`diag-r9-offline.mjs`）；AC-51-01 (a)、AC-51-04 另以 getter 模擬瀏覽器回報離線 |
| 捲軸 | Playwright 無頭預設隱藏捲軸；T-108、TC-52-05b 另以關閉 `--hide-scrollbars` 的瀏覽器量測 |
| AC-52-05 | 學習區塊以 `getBoundingClientRect` 比對；受影響元素以 Layout Instability API 的 `sources` 判定；與第一階段及 v1.2.0 同條件比對是否為舊有 |
| AC-52-06 靜置 | 實等 5 分鐘（`QA_AD_WAIT5MIN=1`） |
| AC-38-09 焦點遮擋 | `diag-r9-focus.mjs`：真實 Tab，量焦點元素未被固定底部導覽遮住的高度比例；v1.3.0 與 v1.2.0 同腳本 |
| 信箱 | `mail-scan.mjs`：掃 `git ls-files`＋未追蹤＋`dist/site`（含 `tests/results/`）；ML-3 連續地址 0；ML-4 空白形式都須等於現行值；不輸出命中字串；Git 歷史只回報。測試不得含連續地址，規則以字串拼接 |
| 效能 | §2.3 不變，最終依 TC-M07。4 倍降速不符時以 `diag-r9-perf.mjs` A/B 比對 v1.2.0，**回報全部頁面的中位數、p90、最大值與樣本數**，至少 16 輪 |
| 舊資料 | AC-49-06 以 v1.2.0 實際作答、翻卡、匯出，不以手寫資料代替 |

### 2.10 第 10 輪量測方式與判定規則

| 項目 | 方式／判定 |
| :--- | :--- |
| V-STT-STUB | `tests/e2e/lib/inits.mjs` `fakeStt(mode, { audioStart, autoAudioStartMs })`：**支援** = 建構子設 `onaudiostart`、`onsoundstart`、`onspeechstart`、`onnomatch` 為 `null`（產品以 `"onaudiostart" in rec` 判定）；**不支援** = 完全不定義。新增 `emitAudioStart`、`emitSoundStart`、`emitSpeechStart`、`emitNomatch`、`throwOnStart`；`__qaStt.log` 記錄 `start-return` 與每個事件的 `performance.now()`；`__qaMicSeq` 以 MutationObserver 記錄 `.sp-mic` `data-status` 變化時間 |
| 兩種替身 | 舊套件預設「支援、start 後 200 ms 自動 audiostart」；`QA_STT_AUDIOSTART=0` 改為「不支援」（產品走 `T_FALLBACK` 1500 ms），結果檔加 `-noas`，與 Edge 一樣另列不併入 TC 總數；判讀為 TC-X-noas。`e2e-speech`、`e2e-mic`、`e2e-env`、`e2e-progress`、`e2e-reinit`、`e2e-motion` 兩種都跑 |
| 「按下即聆聽中」假設 | 舊的 `micOn` 改為共用 `micOnStrict`：最多等 3.5 秒進入聆聽中，且狀態序列必須先 `preparing` 再 `listening`，否則拋出（該 TC 記失敗）。 §10.12 Q2 列的行號全部改用此函式 |
| 新 TC 的替身 | `e2e-stt-flow.mjs` 每個 TC 明確指定支援或不支援，並關閉自動 audiostart，由測試逐一觸發事件；不受 `QA_STT_AUDIOSTART` 影響 |
| 權限詢問擱置 | `GUM_HOLD` 包住 fakeMic 的 `getUserMedia`：`__qaHold.on` 時呼叫擱置，`release()` 才交付；`__qaHold.calls` 為產品呼叫次數（AC-58-04 (a)、AC-58-05、AC-58-06、E-157） |
| ≤ 100 ms | 頁面內 `btn.click()` 到「條件成立後的下一個畫格」，含點按處理器的同步耗時（使用者看到變化的時間），不含 CDP 往返。本次載入第 1 次按下另以 TC-58-01f 在 Chrome、Edge 各 3 次新載入量測（擱置 `getUserMedia`，排除替身建立音訊的時間） |
| 時間常數 | 不寫死於判定以外：`T_READY` 5000 ± 200、`T_FALLBACK` 1500（−20～+120）、`T_BUFFER` 0（聆聽中 − audiostart ∈ [0, 100]），值取自 architecture §7.26.1 |
| 版面座標 | `getBoundingClientRect` 取到小數 2 位，以文件座標（加 `scrollY`）比對；一般設定下換卡有滑入動畫，量「分數出現前」前先等座標連續 2 次相同 |
| 鍵盤 | Tab／Shift+Tab 以 CDP `rawKeyDown`＋修飾鍵；Enter 送出 `text` 為 CR 的 `keyDown`（無 `text` 時按鈕不觸發 click） |
| AC-61-01 | `diag-r10-focus.mjs`：375×667、390×844（`mobile: true`），主控台（收合、展開）、難易度設定、單字卡、模擬測驗；從頁首 Tab 到繞回、從頁尾 Shift+Tab 到繞回；每個停點元素完整位於「`#app-nav` 上緣」以上與視窗內（高於可用高度時上緣與 ≥ 44 px 可見）；導覽列自身除外；必測 7 項兩個方向都要停到且 100% |
| AC-61-02 | 1366×768 與 1.3.0 逐停點比對名稱、`scrollY`、元素上緣；點擊與觸控以「與 1.3.0 逐筆相同」判定（模擬測驗第 1 次點選項是作答，作答後捲到回饋屬既有行為）；首次畫面頁尾連結、色級列；輸入時 `is-typing` |
| AC-60-07「依既有規則」 | 以 1.3.0 實測為準：切換模式往返、離開頁面再回來仍在同一張卡時分數保留（1.3.0 相同），換到另一張卡才清除 |
| 舊資料相容 | 以 1.3.0 交付檔實際學習（首次流程、自訂單字、翻卡、STT 評分、模擬測驗）後：直接以 1.3.1 開啟；1.3.0 匯出的備份以 1.3.1 UI 匯入；比對 localStorage 位元組與 setItem 次數 |
| SD-FB-85 | 聆聽中再按停止後，替身送來的 `result` 不評分、不提示。這是刻意的行為變更（v1.3.0 停止後仍可能評分），以 TC-FB85 驗證新行為，不視為回歸 |
| 效能 A/B | `diag-r10-perf.mjs`：1.3.0 與 1.3.1 交錯 16 輪，每輪各 1 個瀏覽器，一般與 4 倍降速；項目為切頁 4 頁、下一張、按麥克風、本次載入第 1 次按麥克風、onresult → 徽章；**全部原始數字寫入 `tests/results/diag/r10-perf-raw.txt` 並於報告列出所有項目的統計**，不只挑有利項目 |
| 真人語音 | AC-58-14、AC-59-08 只列人工；替身結果不得當作真人行為依據（PRD 第 3 章 v0.20 註 2） |

### 2.11 第 11 輪量測方式與判定規則

| 項目 | 方式／判定 |
| :--- | :--- |
| 畫出時間（AC-58-01） | **量測用 `requestAnimationFrame` 在 `click()` 之前登錄**，回呼內 `setTimeout(0)` 取 `t2`（畫出之後）。若在 click 之後才登錄，產品在 click 內登錄的 rAF 會先排入它的 `setTimeout(0)`，延後的 `acquire()`（含 `new AudioContext()` 約 110 ms）先執行而被誤算（PG 回饋 (a)）。適用 `e2e-stt-flow` TC-58-01f／01g、`diag-r10-perf` 的 `mic`、`mic-first` |
| TC-58-01f 判定 | Chrome、Edge 各 3 次新載入 × 第 1 次、第 2 次、離開再回來：`t2 − t0` ≤ 100 ms、處理器 `t1 − t0` ≤ 16 ms、`t1` 時 `data-status = preparing`、`getUserMedia` 呼叫數在 `t1`、`t2` 為 0，`t2` 後 250 ms 為 1（第 2 次共用擱置中的取得，為 0） |
| 降速 | 4 倍 CPU（`Emulation.setCPUThrottlingRate`）「離開再回來後第 1 次」Chrome、Edge 各 16 次，16／16 ≤ 100 ms（§7.28.6） |
| Event Timing | 無頭模式不可靠，**不用來判定**（PG 回饋 (b)） |
| `getUserMedia` 次數 | 第 1 次按下時晚 1 個畫格（或 50 ms 後備）才呼叫（SD-FB-97、§10.13 Q9）：讀次數前先等 1 個畫格＋60 ms，或等到次數 ≥ 1；不得在按下後立即讀 |
| AudioContext 狀態 | `--use-fake-device-for-media-stream --use-fake-ui-for-media-stream`、**不加** `--autoplay-policy=no-user-gesture-required`、不用 fakeMic；init script 包裝 `AudioContext` 建構子記錄實例；CDP 滑鼠事件點按。聆聽中 `state === "running"`、收音條 2 秒內至少 1 格亮 |
| 捲軸寬度 | **不用** `innerWidth − clientWidth` 判斷（`stable` 時恆為 15；根元素 `clientWidth` 在不可捲動時也可能含保留區，PG 回饋 (c)）；改看元素座標與 `getComputedStyle(html).scrollbarGutter` |
| 廣告環境判斷 | 以 `html[data-ad-env]` 屬性判斷；`scrollbarGutter` 在第一階段也是 `stable`，不再用來分辨（SD-FB-97） |
| 位移比對 | 一律在**同一建置內**前後或逐畫格比較；傳統捲軸下不可捲動頁面比 1.3.0／1.2.0 左移 7.5 px 屬預期，不跨版本比絕對座標（SD-FB-94、§10.13 Q11） |
| 載入期 header（AC-52-05） | Layout Instability API ＋ 逐畫格紀錄（`data-ad-env`、`scrollbarGutter`、`.app-header__inner` 左緣）：(1) `file://` 一般、(2) `DOMContentLoaded` 設 `data-ad-env` 模擬、(3) `build-ad-test.mjs` 測試建置經本機 HTTPS（CDP）、(4) `e2e-ad` 替身 filled（Playwright 一般與隱藏捲軸）。header 位移 0、首畫格起 `stable` |
| 對照組 | 第 10 輪樣式對照組（§1.8）用於：375／390 版面座標相同（AC-20-01、AC-40-02）；重現 BUG-006、BUG-008 以確認量測敏感度 |

### 2.12 第 12 輪量測方式與判定規則

| 項目 | 方式／判定 |
| :--- | :--- |
| V-STT-STUB 暫時結果 | `inits.mjs` `fakeStt` 加 `emitInterim(...texts)`：每段 1 個 result、`isFinal = false`、`resultIndex 0`；`emitResult` 維持 `isFinal = true`；`emitRaw(ev)` 送自訂事件。`__qaStt.config` 記錄每次 `start()` 當下的 `lang`、`interimResults`、`maxAlternatives`、`continuous`；建構子 `interimResults` 初值改為 `null`（第 11 輪以前為 `true`，無法分辨產品是否明確設定）（§10.14 Q13） |
| `interimResults` 斷言 | TC-08-01：`start()` 當下 `interimResults === true`、`maxAlternatives 1`、`continuous false`（§10.14 Q14；第 11 輪以前只記在說明、未判定） |
| ≤ 100 ms | 同 §2.10：頁面內觸發事件到「條件成立後的下一個畫格」；另記錄事件處理器結束當下（同步）的狀態，用來判定「同一次畫面更新」 |
| 不同時可見 | AC-62-03 (a)、AC-62-05：rAF 逐畫格取樣即時文字列與分數區、訊息區是否同時可見，同時可見畫格數須為 0；並要求事件處理器結束當下即時列已隱藏、分數區已出現 |
| AC-62-05 對照組 | 同一份初始狀態開 2 個獨立頁面：A 以 `adr`、`adress`、`end` 評分，B 直接 `result(adress)`；比較分數區 `outerHTML`、`runtime.speech.lastResult`、評分後 localStorage `data` 12 欄、主控台文字。自訂單字 `id`（含時間與亂數）與 `createdAt` 由兩頁注入範本時各自產生，比較時去除這 2 欄 |
| 遲到事件 | 每種結束後對**舊**替身實例再送 `interim`、`result`、`end`：即時文字列不重新出現、不評分、今日已學不變 |
| 收音條 | 自進入聆聽中到第 1 格亮約 60～75 ms，本頁第 1 次取得麥克風時約 450～850 ms（`diag-r12-meter.mjs`：audiostart、soundstart 與即時文字路徑相同，屬既有行為）；AC-62-01、AC-62-02 的「收音條照常點亮」改為等待 ≤ 1000 ms 後判定，不套用 ≤ 100 ms |
| AC-62-09 版面 | 375×667（`mobile: true`）、768×1024、1366×768 × 一般與減少動態；`comply with`、20 個單字長句、60 字元無空白；`.sp-tts__btn`、`.sp-mic`、`.sp-meter` 文件座標在待機、聆聽中、出現、更新、隱藏 5 個時點相同；`.sp-live` `scrollWidth ≤ clientWidth`、在面板內、無水平捲軸；值 `italic`；標籤與值 `rgb(91, 100, 114)`，與 `.sp-compare__value` 不同；對比 ≥ 4.5；`animation-name: none`、`transition-duration: 0s`；翻面、上一張、下一張可捲到完整可見且不被底部導覽列遮住 |
| AC-62-10 | `file://`：3 種結束後搜尋 localStorage、sessionStorage、`AppState.data`、`indexedDB.databases()`、Cache Storage 內容、`exportBackup()`；CDP Network 非本機請求；重新載入。部署目錄：Playwright 本機 8080，等 Service Worker 啟用並控制頁面後同樣搜尋 Cache Storage 7 筆內容與請求 |
| AC-62-07 | 自動化只判 DOM（`.sp-live` `aria-live="off"`、祖先到 `html` 無即時區域）；NVDA 實際不播報列人工 TC-62-07h |
| V-LGL-02 v0.21 | `legal-check.mjs` TC-LGL-S03：`dist/` 下 5 個 HTML 與 `sw.js` 全文（含內嵌程式註解）「TOEIC®（多益）Part 5」0 次；TC-LGL-S01 舊文字清單加入此字串；LT-3「Part 5 題目」不屬本條 |
| 真人語音 | AC-62-12、AC-58-14、AC-59-08 只列人工（TC-62-12h、TC-58-14h、TC-59-08h，同一輪記錄）；替身結果不得當作真人行為依據（PRD v0.21 共通規則 2） |

### 2.13 第 13 輪量測方式與判定規則

| 項目 | 方式／判定 |
| :--- | :--- |
| 測試資料 | 以 localStorage 構造（AC-64-02「以 DevTools 或匯入備份建立」）：已掌握字依內建字庫排名取 wordKey；S 以 `streak { days, lastActiveDate = 今天 }`、中斷以最後打卡日 3 天前；K 以 `part5CorrectIds` 前 K 題；X 以 `todayLearned.wordKeys` X 筆；D 以套用色級（橘 215 → 10、綠 725 → 15） |
| 地圖判定 | 依 architecture §7.32.4 的 class 與 `data-*` 計數（§10.15 Q23）：`g.isl-island[data-stage]` 內 `.isl-sprout`、`.isl-palm`、`.isl-flower`、`.isl-hut`、`.isl-flag` 個數對照「島嶼階段」表；燈塔 `g.isl-lighthouse[data-state]` 與 `.isl-lh-rocks`／`.isl-lh-tower`／`.isl-lh-beam`、待建牌；天氣 `svg[data-weather]`、`g.isl-sun` 的 `opacity`、`g.isl-rainbow` 有無 |
| 小船 | `g.isl-boat` 的 `transform` 錨點投影到 `line.isl-route`（x1,y1 → x2,y2），與 r 的距離 ÷ 航線長 ≤ 2% |
| 三處一致 | 同一資料下比對清單文字、地圖 `data-stage`／計數、`div[role=img]` 的 `aria-label`（文字替代逐字比對 IA-4 範例），另以 CDP `Accessibility.getFullAXTree` 確認 image 節點 1 個、名稱相同、未忽略子節點 0 |
| n = 0、Q = 0 | 以 `run-r13.mjs` 建置的無內建資料檔（`QA_FIXTURE_NODATA`：只含 `sources.js`）驗證「掌握 —」、省略 `aria-valuenow`、文字替代「{島名}掌握 —，沙灘」、第 3 格「—」與「燈塔待建」（TC-65-02n） |
| 動畫 | 由難易度設定頁以真實點擊進入群島頁；0.5 秒、5.1 秒以 `document.getAnimations()` 取地圖內 `playState = running` 的動畫；種類以動畫目標 class（`isl-anim-wave`、`isl-anim-cloud`、`isl-anim-boat`、`isl-anim-sway`）計（海浪與小船共用 keyframes `isl-bob`）；位移以 keyframes 值 × SVG 顯示寬 / 354 換算 CSS px；版面位移以 `layout-shift` PerformanceObserver（來源節點為今日任務卡、清單、3 格者）與 0.5～6 秒矩形比對 |
| 對比 | 版面文字用 `lib/layout-probe.mjs`（WCAG 公式、沿祖先合成背景與 opacity）；量測前等換頁淡入（240 ms）與換卡滑入結束（≥ 600 ms），避免取到過渡畫格。地圖文字（AC-71-04）以 375 px 截圖，在每段文字矩形內取最暗像素對最常見像素，並等動畫結束（5.3 秒）後截圖 |
| 卡片與按鈕 | AC-68-02 列舉的區塊與按鈕取計算後四邊 `border-style`／`width`／`color`、四角 `border-radius`、`background`、`box-shadow`；`.btn--link`（頁尾連結、返回連結）不屬列舉按鈕（SD-FB-105）；地圖框底色為海面色、霧中島列 `#f3f6fa` 為例外 |
| 與 v1.3.2 比對 | AC-68-04、AC-69-01：同一資料、同一寬度下取可見元素標籤樹（含 role）與按鈕文字；排除 `.fc-deco`、`.fc-feedback-live`、SVG 子孫與 LT-7 段落；四選一選項內容為隨機抽題，只比字母與數量 |
| 學完回饋 | 以真實點擊翻面、四選一、STT 替身評分觸發；回饋列為常駐 `div.fc-feedback-live[role=status]` 內的 `p.fc-feedback`（Q24），空容器以計算後高度 0、無子元素判定；座標比較在換卡動畫結束後的同一面（正面）量測 |
| 不寫入 | 包裝 `Storage.prototype.setItem` 計數；只瀏覽群島頁、等動畫結束、回饋顯示後等待皆 0 次；換卡只寫 `flashcardPosition`（AC-44），比對時排除該欄 |
| 效能（參考值） | `diag-r13-perf.mjs`：真實滑鼠事件；document 捕獲階段 click 監聽器（先於產品處理器）登錄 rAF → `setTimeout(0)`，取 `event.timeStamp` 到下一影格繪製後；另以 Event Timing（`durationThreshold` 16，未回報記 < 16 ms）取同一互動最大 duration；兩法每次 ≤ 100 ms；1 倍、4 倍 CPU 降速；與 v1.3.2 交錯。首次載入沿用 e2e-env TC-22-05a。本機無頭 Chrome 不是 Q-13 基準環境，基準環境仍為 TC-M07 |
| TC-22-01m | 沿用 §2.3：本機 4 倍降速＋減少動態嚴格量法參考值不符時記待人工（TC-M07），並以 `diag-r13-perf` TC-22-01f 與 v1.3.2 同機交錯對照判斷是否為本版退化 |

## 3. 環境

| 項目 | 版本 |
| :--- | :--- |
| 作業系統 | Windows 11 Pro 10.0.26200 |
| Node.js | v24.15.0 |
| 瀏覽器 | Google Chrome（主要，無頭）、Microsoft Edge（跨瀏覽器冒煙：重跑 e2e-goal、e2e-hidden、e2e-pwa；第 6 輪加 e2e-version 畫面類）。第 12 輪：Chrome 157.0.8103.38、Edge 157.0.4341.42（Chrome 157 預設把 http 導覽升級為 https，e2e-ad 以 `--disable-features=HttpsUpgrades,HttpsFirstModeV2,…` 關閉，test-report §23.4）。第 13 輪：Chrome 157.0.8103.50（一般驗收，未跑 Edge 冒煙與 `:noas` 替身） |
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

### 4.4 第 7 輪新增與更新的套件

| 套件 | 檔案 | 涵蓋 |
| :--- | :--- | :--- |
| E2E 17 單字卡位置與新資料保存（新） | `tests/e2e/e2e-track.mjs` | US-44、US-47、AC-18-01（v0.15）、AC-24-02（v0.15）：TC-44-01～TC-44-10、TC-47-01～TC-47-06、TC-47-04b |
| E2E 18 答對紀錄與只練沒答對（新） | `tests/e2e/e2e-track-p5.mjs` | US-45、US-46、AC-32-02（v0.15）、AC-47-07 (a)、AC-47-08 (b)：TC-45-01～TC-45-08、TC-46-01～TC-46-10、TC-47-08b（Edge 冒煙跑 `file://` 部分） |
| 靜態（新增 1 項） | `static-check.mjs` | TC-T-S01（AC-47-08 程式面、畫面文字逐字、新 CSS 規則） |
| 越界增量（新） | `tests/static/boundary-r7.mjs` | TC-B03（與 git HEAD `a5eee06` 比對，FE-70～FE-76、CT-25；`package.json` 須只改 version） |
| QA 檢視 | `tests/tools/qa-review-r7.mjs` | TC-D18～D20、TC-B01～B03、TC-X-edge、人工 TC（新增 TC-TRK-H1～H2） |
| 更新（SD-FB-57） | `lib/state.mjs`、`lib/cdp.mjs`（`QA_DIST`）、e2e-cards、e2e-firstrun、e2e-goal、e2e-layout、e2e-progress、e2e-pwa、e2e-pwa-update、e2e-reinit、e2e-version、`run-all.mjs`、`tc-list.mjs`、`tc-desc.json` | 明細見 test-report §18.4 |
| 診斷（不列入 run-all） | `diag-r7-perf.mjs` | TC-22-01m 的 1.1.0 與 v1.0.0 A/B 交錯量測（`tests/results/diag/r7-perf-ab.json`） |

### 4.5 第 8 輪新增與更新的套件

| 套件 | 檔案 | 涵蓋 |
| :--- | :--- | :--- |
| E2E 19 已答對鎖定檢視（新） | `tests/e2e/e2e-lock.mjs` | US-48：TC-48-01～TC-48-12、E-124～E-134 |
| E2E 20 法律文字與聯絡行（新） | `tests/e2e/e2e-legal.mjs` | AC-23-08 (b)、AC-10-02、AC-23-02（LT-3～LT-5）、AC-23-07 |
| 靜態（新） | `tests/static/legal-check.mjs` | TC-23-08a、TC-23-08b、TC-LGL-S01、TC-LGL-S02 |
| 越界增量（新） | `tests/static/boundary-r8.mjs` | TC-B03（與 git HEAD `f57145a` 比對，FE-80～FE-82；MC-06 例外） |
| QA 檢視 | `tests/tools/qa-review-r8.mjs` | TC-D18～D20、TC-B01～B03、TC-X-edge、人工 TC（文字更新，無新增編號） |
| 逐一執行（新） | `tests/tools/run-r8.mjs` | 每個套件各自啟動與關閉瀏覽器 |
| 更新 | e2e-track-p5、e2e-version、e2e-pwa-update、e2e-pwa、e2e-cards、e2e-content、e2e-layout、e2e-track、static-check、`run-all.mjs`、`ac-matrix.mjs`、`rebuild-summary.mjs`、`tc-list.mjs`、`tc-desc.json` | 明細見 test-report §19.4 |

### 4.6 第 9 輪新增與更新的套件

| 套件 | 檔案 | 涵蓋 |
| :--- | :--- | :--- |
| E2E 21 已答對行（新） | `tests/e2e/e2e-answered.mjs` | US-49、E-135～E-137；v1.2.0 實際資料 |
| E2E 22 頁尾與對外頁面（新） | `tests/e2e/e2e-site.mjs` | US-53～US-57、AC-50-02、AC-23-07、E-148～E-153 |
| E2E 23 廣告反應（新，替身） | `tests/e2e/e2e-ad.mjs`、`e2e-ad-extra.mjs`、`fixtures/ad-stub.js`、`lib/ad-env.mjs` | US-50～US-52、E-138～E-147 |
| E2E 24 廣告效能（新，替身） | `tests/e2e/e2e-ad-perf.mjs` | AC-51-03 |
| 靜態（新） | `tests/static/site-check.mjs`、`tests/static/mail-scan.mjs` | V-AD-03、V-SITE、V-SEO、V-MAIL |
| 建置工具（新） | `tests/tools/build-ad-test.mjs` | V-AD (b) 測試建置，寫入 `dist/` 會中止 |
| 越界增量（新） | `tests/static/boundary-r9.mjs` | TC-B03（與 git HEAD `25e3c3f` 比對，FE-83～FE-89） |
| 診斷 | `tests/e2e/diag-r9-focus.mjs`、`diag-r9-perf.mjs`、`diag-r9-offline.mjs` | TC-38-09f；效能 A/B；離線與捲軸時序 |
| QA 檢視、逐一執行 | `tests/tools/qa-review-r9.mjs`、`run-r9.mjs` | TC-D18～D20、TC-B01～B03、TC-X-edge、人工 TC |
| 更新 | §1.6 Q3、Q5 列出的檔案、`run-all.mjs`、`ac-matrix.mjs`、`tc-list.mjs` | 明細見 test-report §20.3 |

### 4.7 第 10 輪新增與更新的套件

| 套件 | 檔案 | 涵蓋 |
| :--- | :--- | :--- |
| V-STT-STUB（更新） | `tests/e2e/lib/inits.mjs`（`fakeStt` 選項、4 個 emit、事件時間軸、`micOnStrict`）、`lib/cdp.mjs`（`-noas` 結果檔） | §10.12 Q1、Q2 |
| E2E 25 語音流程（新） | `tests/e2e/e2e-stt-flow.mjs` | US-58（AC-58-01～13）、US-59（AC-59-01～07）、US-60（AC-60-01～07）、AC-30-04、AC-31-03、AC-33-03、AC-33-06、AC-33-08（v0.20 部分）、SD-FB-85、E-05、E-66、E-156～E-165 |
| 窄視窗鍵盤焦點（新） | `tests/e2e/diag-r10-focus.mjs`（結果 `e2e-focus.json`） | US-61、AC-38-09（BUG-005 複驗）、E-166；1366 與首次畫面回歸 |
| 舊資料相容（新） | `tests/e2e/e2e-compat-r10.mjs` | 共通規則 1、M-4：1.3.0 localStorage 與備份 |
| 效能 A/B（新） | `tests/e2e/diag-r10-perf.mjs` | AC-22-01、AC-22-03、AC-58-01（1.3.0 對照） |
| 越界增量（新） | `tests/static/boundary-r10.mjs` | TC-B03（與 git HEAD `a358556` 比對，FE-90～FE-94） |
| QA 檢視、逐一執行（新） | `tests/tools/qa-review-r10.mjs`、`run-r10.mjs` | TC-B01～B03、TC-X-edge、TC-X-noas、人工 TC（含 TC-58-14h、TC-59-08h） |
| 更新（§10.12 Q2、Q6、Q7） | `e2e-speech.mjs`、`e2e-mic.mjs`、`e2e-env.mjs`、`e2e-progress.mjs`、`e2e-reinit.mjs`、`e2e-motion.mjs`、`e2e-version.mjs`（1.3.1）、`tc-desc.json`、`ac-matrix.mjs`、`tc-list.mjs`、`rebuild-summary.mjs` | 明細見 test-report §21.3 |

### 4.8 第 11 輪新增與更新的套件

| 套件 | 檔案 | 涵蓋 |
| :--- | :--- | :--- |
| 啟動參數（更新） | `tests/e2e/lib/cdp.mjs`：`launch({ args, autoplayFlag })` | 假媒體裝置、`--host-resolver-rules`；`autoplayFlag: false` 驗真實自動播放政策；仍不加 `--hide-scrollbars` |
| 語音流程（更新） | `tests/e2e/e2e-stt-flow.mjs` | 第 8 段改寫：TC-58-01f（量法見 §2.11）、新增 TC-58-01g（4 倍降速）、TC-58-04c（延後期間取消）、TC-33-03r（AudioContext 狀態、假音源收音條）；TC-58-04a、TC-58-05b 讀 `getUserMedia` 次數前等 1 個畫格；TC-60-06-* 加 `scrollbarGutter === "stable"` |
| 捲軸與載入期（新） | `tests/e2e/diag-r11-gutter.mjs`（結果 `diag-r11-gutter.json`） | TC-52-05f、TC-52-05g（BUG-006）、TC-R11-375（AC-20-01、AC-40-02）、TC-R11-1366b |
| 廣告（更新） | `tests/e2e/e2e-ad.mjs` TC-52-05b | 逐畫格 gutter、`data-ad-env`、header 左緣；判定改為目前建置 header 位移 0（不再以 gutter 判斷環境） |
| 診斷（更新） | `diag-r10-perf.mjs`（`mic` 量法、輸出前綴參數）、`diag-r10-scrollbar.mjs`（記 `clientWidth` 與 `scrollbarGutter`、`QA_R10CSS` 對照組）、`diag-r9-offline.mjs`（不記 `innerWidth − clientWidth`） | BUG-007、BUG-008 原因與修正前後 |
| 越界增量（新） | `tests/static/boundary-r11.mjs` | TC-B02、TC-B03（§1.8 越界基準） |
| QA 檢視、逐一執行（新） | `tests/tools/qa-review-r11.mjs`、`run-r11.mjs` | TC-B01～B03、TC-X-edge（TC-52-05b 不再例外）、TC-X-noas、人工 TC（新增 TC-33-03h） |
| 說明 | `tc-desc.json`、`tc-list.mjs` | 新 TC 說明；越界與 noas 腳本名稱 |

### 4.9 第 12 輪新增與更新的套件

| 套件 | 檔案 | 涵蓋 |
| :--- | :--- | :--- |
| V-STT-STUB（更新） | `tests/e2e/lib/inits.mjs` | `emitInterim`、`emitRaw`、`__qaStt.config`；`interimResults` 初值 `null`（§10.14 Q13） |
| 即時文字（新） | `tests/e2e/e2e-interim.mjs`（結果 `e2e-interim.json`；`QA_BROWSER=edge` 另存 `-edge`） | US-62（AC-62-01～AC-62-11）、AC-58-07、AC-59-01、AC-59-05、AC-08-10、AC-30-04（v0.21）、V-STT-11～V-STT-17；TC-62-10b 用 Playwright 部署目錄＋Service Worker |
| 收音條診斷（新） | `tests/e2e/diag-r12-meter.mjs` | 進入聆聽中到收音條第 1 格亮的時間（audiostart／soundstart／即時文字／後備），供 §2.12 判讀 |
| 商標文字（更新） | `tests/static/legal-check.mjs`（LT-2 新文字、TC-LGL-S03）、`site-check.mjs`（:27、:129、:144）、`e2e-legal.mjs`:13、`e2e-lock.mjs`:29 | §10.14 Q15；AC-10-02、AC-54-01、AC-56-03、AC-56-05～AC-56-07、AC-57-03、AC-23-08 |
| 語音（更新） | `tests/e2e/e2e-speech.mjs` TC-08-01 | `interimResults === true` 斷言（§10.14 Q14） |
| 版本（更新） | `tests/e2e/e2e-version.mjs`:186 | 1.3.1 → 1.3.2（§10.14 Q19） |
| 越界（新） | `tests/static/boundary-r12.mjs`（結果 `boundary-r12.json`） | TC-B02、TC-B03（§1.9 越界基準） |
| QA 檢視、逐一執行（新） | `tests/tools/qa-review-r12.mjs`、`run-r12.mjs` | TC-B01～B03、TC-X-edge、TC-X-noas、人工 TC（新增 TC-62-12h、TC-62-07h） |
| 說明與對照 | `tc-desc.json`、`tc-list.mjs`、`ac-matrix.mjs`（AC-62-12 列必要人工） | 新 TC 說明；越界與 noas 腳本名稱 |
| 375 版面對照（新） | `tests/e2e/diag-r12-375.mjs`（結果 `diag-r12-375.json`） | TC-R12-375：375／390 與 1.3.1（HEAD `2cb2ca2`）比較，取代第 11 輪專用的 TC-R11-375（`diag-r11-gutter.mjs` 未設 `QA_R10CSS` 時不再記待人工） |
| HTTPS-First 診斷（新） | `tests/e2e/diag-r12-httpupgrade.mjs` | TC-50-01 第一次失敗的原因（Chrome／Edge 157 把 http 導覽升級為 https） |
| 執行中修正 | `e2e-ad.mjs`（主瀏覽器加 `--disable-features=HttpsUpgrades,HttpsFirstModeV2,…`）、`diag-r10-focus.mjs` TC-61-02b（375px 模擬測驗改比捲動量）、`e2e-compat-r10.mjs` TC-R10-C1（版本讀 `package.json`） | test-report §23.4 |

### 4.10 第 13 輪新增與更新的套件

| 套件 | 檔案 | 涵蓋 |
| :--- | :--- | :--- |
| 群島（新） | `tests/e2e/e2e-island.mjs`（結果 `e2e-island.json`；`QA_ONLY` 只供除錯） | US-63～US-72（除 AC-70-03 效能與 AC-72-04 更新）、V-ISL-01～V-ISL-09、V-LAY-02、V-LAY-10、V-LGL-03、V-LGL-04；n = 0／Q = 0 需 `QA_FIXTURE_NODATA` |
| 效能（新） | `tests/e2e/diag-r13-perf.mjs`（結果 `diag-r13-perf.json`：摘要與原始值；第 1 次量測保存於 `tests/results/tmp/diag-r13-perf-run1.json`、`r13-diag-r13-perf-run1.txt`） | AC-70-03、AC-22-01（切換到群島頁）、AC-64-09、AC-69-05、AC-22-03、AC-29-01；參考：§10.15 (19)、TC-22-01m 位置 1 對照 |
| PWA 更新（新） | `tests/e2e/e2e-pwa-r13.mjs`（Playwright 本機 8080） | AC-72-04、AC-36-03、AC-36-04、E-185：v1.3.2 建置 → 1.4.0 |
| 越界（新） | `tests/static/boundary-r13.mjs`（結果 `boundary-r13.json`） | TC-B03（§1.10 越界基準） |
| 逐一執行（新） | `tests/tools/run-r13.mjs` | 由 run-r12 複製；紀錄檔 `tests/results/tmp/r13-*.txt`；加 e2e-island、diag-r13-perf、e2e-pwa-r13、boundary-r13 |
| 名稱與外觀（更新，§10.15 Q21） | `e2e-progress.mjs`（主環形圖 → `.db-today__bar`／`.db-today__fill(--done)`；填滿比例容許 0.5%）、`e2e-motion.mjs`（TC-31-03 改查今日進度條與清單進度條轉場、地圖內動畫數）、`e2e-layout.mjs`（TC-38-01 進度條填色、TC-38-02 背景 `#eaf7fb` 與地圖框例外、TC-38-03 達成金色、TC-38-06 記不適用、TC-38-08 排除 `.fc-deco`／`.fc-feedback-live`、TC-38-09 與 TC-39-06 Tab／DOM 順序「變更」→「開始今日學習」、TC-39-01／02 新區塊順序與今日任務卡內部、TC-41-01 背景）、`e2e-env.mjs` TC-20-03、`e2e-firstrun.mjs` TC-27-01、`e2e-hidden.mjs`、`e2e-site.mjs`（導覽「群島」、返回鈕「返回群島」）、`e2e-goal.mjs` TC-17-06（DOM 順序）、`e2e-reinit.mjs` TC-32-01（「到「群島」頁按」）、`e2e-pwa.mjs`、`pwa-static.mjs`（manifest `background_color` `#eaf7fb`）、`e2e-version.mjs`（1.4.0） | AC-20-03、AC-27-01、AC-30-01、AC-30-05、AC-31-03、AC-32-01、AC-38-01～AC-38-03、AC-38-08、AC-38-09、AC-39-01、AC-39-02、AC-39-06、AC-41-01、AC-17-06、AC-34-04、AC-42-02、AC-57-01 |

## 5. TC 清單

由 `node tests/tools/tc-list.mjs` 依第 12 輪執行結果產生。第 12 輪新增：`e2e-interim.mjs` 28 個（TC-62-01、TC-62-01b、TC-62-01f、TC-62-02a、TC-62-02b、TC-58-07i、TC-62-03a、TC-62-03b、TC-62-04、TC-62-05、TC-62-05b、TC-62-06、TC-62-07a、TC-62-08、TC-62-09-375／768／1366、TC-62-09m-375／768／1366、TC-62-10、TC-62-10b、TC-62-11、TC-59-01i、TC-59-05i、TC-08-10i、TC-30-04i、TC-X-interim）；TC-LGL-S03（`legal-check.mjs`）；TC-R12-375（`diag-r12-375.mjs`，取代第 11 輪專用的 TC-R11-375）；人工 TC-62-12h、TC-62-07h（§6.9）。修改：TC-08-01（`interimResults === true`）、TC-42-02（1.3.2）、TC-LGL-S01、TC-54-01、TC-56-07、TC-10-02-*（LT-2 新文字）、TC-61-02b（375px 模擬測驗改比捲動量）、TC-R10-C1（版本讀 `package.json`）、TC-50-01（關閉瀏覽器 HTTPS-First，見 test-report §23.4）。

共 686 個 TC：自動化 635、QA 檢視 8、人工 43（其中記「不適用（暫停）」23 個）。「TC-X-*」為各套件的「無未處理例外」檢查。

| TC | 對應 AC | 方式 | 腳本 | 驗證重點 |
| :--- | :--- | :--- | :--- | :--- |
| TC-01-01 | AC-01-01 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | （v0.12 改寫）精簡色級列 5 列依序；橘棕綠顯示建議字量與每日新字量、適用情境；藍金只顯示鎖定圖示與「即將開放」，無字數、每日字量、「待定」；列表上方「本系統建議字量」只 1 次；無分數範圍、官方門檻、Tier |
| TC-01-02 | AC-01-02 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | 無學習紀錄時橘 → 綠套用不跳視窗，生效綠、單字集 5,620 |
| TC-01-03 | AC-01-03 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | 點棕未套用即離開：生效仍綠、單字集與 localStorage 不變 |
| TC-01-04 | AC-01-04 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | 生效色級仍為棕，分數仍為 300 |
| TC-01-05 | AC-01-05 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | (a) 既有 300（棕）、(b) 既有 600（綠）點綠 → 只有綠選中、試算綠、套用後 localStorage 725 |
| TC-01-06 | AC-01-06 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | 不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證： |
| TC-01-07 | AC-01-07、AC-03-03 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | 有學習紀錄時點藍、金並套用：不跳視窗、目標藍／金、生效「綠（內建上限）」、localStorage 855／990、紀錄保留 |
| TC-01-08 | AC-01-08、AC-01-07、AC-25-06、E-92 | 自動化 E2E | `tests/e2e/e2e-version.mjs` | 375／1366：依序套用橘棕綠藍金，狀態列恰 1 行「目前色級：橘／棕／綠／綠／綠」；套用綠後點棕未套用仍為綠；套用藍後重新載入仍為綠且藍列選中；無「目前目標色級」「目前生效色級」「內建上限」；localStorage goal 4 欄、schemaVersion 2 |
| TC-02-01 | AC-02-01 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | 不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證： |
| TC-02-02 | AC-02-02 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | 不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證： |
| TC-02-03 | AC-02-03 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | 依序點 5 張卡片，試算每日新字量 10、10、15、20、20 |
| TC-02-04 | AC-02-04 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | 依序點 5 張卡片並套用：只有被點卡片選中、對應色級標示正確、localStorage 依序 215、465、725、855、990；無紀錄不跳視窗 |
| TC-02-05a | AC-02-05 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | c = 0 時點橘、棕、綠的建議總字量與預計週數（15、41、54 週） |
| TC-02-05b | AC-02-05 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | c = 409 時點棕 → 35 週 |
| TC-02-06 | AC-02-06 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | c ≥ 目標字量時預計週數 0 並顯示「已達成目標字量」 |
| TC-02-07 | AC-02-07 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | 不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證： |
| TC-02-08 | AC-02-08 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | 套用藍（855）後重新載入：選中藍、試算相同、localStorage 855 |
| TC-02-09 | AC-02-09 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | 不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證： |
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
| TC-05-01 | AC-05-01 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證： |
| TC-05-02 | AC-05-02、AC-05-04 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證： |
| TC-05-03 | AC-05-03 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證： |
| TC-05-05 | AC-05-05 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證： |
| TC-06-01 | AC-06-01 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 顯示單字、音標、搭配詞（欄位標籤逐字為 LT-1「常用搭配詞」，v0.17）、TTS 1.0x 按鈕、TTS 0.75x 按鈕、麥克風按鈕 |
| TC-06-02 | AC-06-02、AC-06-03 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 顯示背面：詞性、中文釋義、學術文獻應用情境（有值時）、完整例句 |
| TC-06-04 | AC-06-04、AC-06-05 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 顯示「第 i / N 張」；在第 1 張時「上一張」呈停用狀態，在第 N 張時「下一張」呈停用狀態，點擊不產生任何變化 |
| TC-06-06 | AC-06-06 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 單字集為空（無內建資料 fixture：只含 sources.js 的資料目錄＋--no-site）進入單字卡頁顯示空狀態並引導至難易度設定 |
| TC-06-07 | AC-06-07 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 內建單字：背面不顯示學術情境欄（標題與內容一併隱藏）；自訂單字：空白欄位顯示「—」或隱藏；畫面不得出現 undefined、null 字樣或只有標題沒有內容的欄位 |
| TC-07-01 | AC-07-01、AC-07-02 | 自動化 E2E | `tests/e2e/e2e-speech.mjs` | 以 lang = en-US、rate = 1.0 朗讀目前卡片單字 |
| TC-07-03 | AC-07-03 | 自動化 E2E | `tests/e2e/e2e-speech.mjs` | 先停止目前朗讀再播放新的，不累積排隊播放 |
| TC-07-04 | AC-07-04 | 自動化 E2E | `tests/e2e/e2e-speech.mjs` | TTS 按鈕呈停用狀態，點擊或滑過時提示不支援；其他功能正常 |
| TC-07-05 | AC-07-05 | 自動化 E2E | `tests/e2e/e2e-speech.mjs` | 顯示提示「此裝置未安裝美式英語語音」，不拋出未處理錯誤 |
| TC-08-01 | AC-08-01 | 自動化 E2E | `tests/e2e/e2e-speech.mjs` | （v0.20 改寫）lang en-US；按下先「準備中」、收音條全暗，替身 audiostart（或 T_FALLBACK）後才「聆聽中」、收音條依音量點亮（micOnStrict 斷言先準備中）；（v0.21）start() 當下 interimResults=true、maxAlternatives 1、continuous false（替身初值 null） |
| TC-08-02 | AC-08-02 | 自動化 E2E | `tests/e2e/e2e-speech.mjs` | 不支援 STT：toast「建議使用 Google Chrome / Edge」、不呼叫 getUserMedia、收音條全暗 |
| TC-08-03 | AC-08-03 | 自動化 E2E | `tests/e2e/e2e-speech.mjs` | 比對前兩字串皆轉小寫、去除標點與空白，分數為 100 |
| TC-08-04 | AC-08-04 | 自動化 E2E | `tests/e2e/e2e-speech.mjs` | 編輯距離 1、長度最大值 7，分數 = round((1 − 1/7) × 100) = 86 |
| TC-08-05 | AC-08-05 | 自動化 E2E | `tests/e2e/e2e-speech.mjs` | 編輯距離 3，分數 = round((1 − 3/7) × 100) = 57 |
| TC-08-06 | AC-08-06、AC-08-07、AC-08-08 | 自動化 E2E | `tests/e2e/e2e-speech.mjs` | （v0.20 改寫）100、90、89、65、64、0 → 綠綠黃黃紅紅；黃燈提示；三種燈號都有「辨識文字」；綠、黃不顯示「目標文字」，紅燈並列 |
| TC-08-09 | AC-08-09（含 §7.6 錯誤對照表） | 自動化 E2E | `tests/e2e/e2e-speech.mjs` | STT 錯誤碼對照（含 v0.9 audio-capture →「找不到麥克風裝置」），結束後收音條全暗 |
| TC-08-09b | AC-08-09（getUserMedia 權限被拒） | 自動化 E2E | `tests/e2e/e2e-mic.mjs` | getUserMedia 權限被拒：「需要麥克風權限」與開啟方式、不開始辨識、收音條全暗；再按重新嘗試 |
| TC-08-10 | AC-08-10 | 自動化 E2E | `tests/e2e/e2e-speech.mjs` | （v0.20 改寫）聆聽中空結果 →「有收到聲音，但沒聽出英文單字，請再說一次」；無結果 end →「未偵測到語音，請再試一次」；再按停止不提示 |
| TC-08-10i | AC-08-10（v0.21：沒有辨識結果 = 最終與即時文字都沒有；再按不評分）、AC-62-05、AC-62-06 (a) | 自動化 E2E | `tests/e2e/e2e-interim.mjs` | （第 12 輪，AC-08-10 v0.21）無結果 end →「未偵測到語音…」；只有即時文字 end → 評分 86；即時文字後再按 → 待機、不評分、不提示 |
| TC-08-11 | AC-08-11 | 自動化 E2E | `tests/e2e/e2e-speech.mjs` | 分數標題為「辨識吻合度」，畫面不出現「發音評分」字樣；分數區附一行說明「此分數比對的是語音辨識出的文字，不代表音素層級的發音準確度」 |
| TC-08-12 | AC-08-12 | 自動化 E2E | `tests/e2e/e2e-speech.mjs` | 清洗後為 complywith 對 complywith、compliedwith，分數分別為 100 與 round((1 − 3/12) × 100) = 75（黃燈） |
| TC-08-13 | AC-08-13 | 自動化 E2E | `tests/e2e/e2e-speech.mjs` | （v0.20 改寫）首次說明逐字；取消不呼叫 getUserMedia；說明顯示期間按鈕外觀為待機；「我知道了」後先準備中再聆聽中；已讀後不再顯示 |
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
| TC-10-02-1366 | AC-10-02、AC-20-01、AC-40-02、E-123、V-LGL-02 | 自動化 E2E | `tests/e2e/e2e-legal.mjs` | 同 TC-10-02-375（1366×768） |
| TC-10-02-375 | AC-10-02、AC-20-01、AC-40-02、E-123、V-LGL-02 | 自動化 E2E | `tests/e2e/e2e-legal.mjs` | LT-2（v0.21 新文字「題型參考 TOEIC®（多益），非 ETS 官方或認可內容」）逐字；375×667 依 §7.23.4 量測（Range 行數、不裁切、無水平捲軸、不與 .p5-record 重疊）× 題目、K ≥ 1、鎖定檢視、作答後；無舊文字；含空格句子、4 選項、題型標籤 |
| TC-10-02-768 | AC-10-02、AC-20-01、AC-40-02、E-123、V-LGL-02 | 自動化 E2E | `tests/e2e/e2e-legal.mjs` | 同 TC-10-02-375（768×1024） |
| TC-10-02z | AC-10-02、E-123（375px，html font-size 150%） | 自動化 E2E | `tests/e2e/e2e-legal.mjs` | 375px 字級 150%（E-123）：說明不裁切；文件溢出依 §7.23.4 只回報 |
| TC-11-01 | AC-11-01、AC-11-02、AC-11-03、AC-11-06 | 自動化 E2E | `tests/e2e/e2e-content.mjs` | 所有選項立即鎖定；所選錯誤標紅、正確選項標綠；選對時只標綠 |
| TC-11-04 | AC-11-04、AC-11-07 | 自動化 E2E | `tests/e2e/e2e-content.mjs` | （v0.18）顯示下一題：未曾答對為未作答；最後一題作答後「下一題」顯示「答對 x / y」與「重新開始」；重新開始後累計不變（曾答對路徑見 TC-48-03、TC-48-04） |
| TC-11-05 | AC-11-05 | 自動化 E2E | `tests/e2e/e2e-content.mjs` | 回到第 5 題 |
| TC-12-01 | AC-12-01、AC-12-02、AC-12-03 | 自動化 E2E | `tests/e2e/e2e-content.mjs` | 不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證： |
| TC-13-01 | AC-13-01、AC-13-02、AC-13-03、AC-13-04 | 自動化 E2E | `tests/e2e/e2e-content.mjs` | 不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證： |
| TC-14-01 | AC-14-01 | 自動化 E2E | `tests/e2e/e2e-content.mjs` | 不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證： |
| TC-14-02 | AC-14-02 | 自動化 E2E | `tests/e2e/e2e-env.mjs` | 不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證： |
| TC-15-01 | AC-15-01 | 自動化 E2E | `tests/e2e/e2e-content.mjs` | 不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證： |
| TC-15-02 | AC-15-02、AC-15-03 | 自動化 E2E | `tests/e2e/e2e-content.mjs` | 不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證： |
| TC-16-01 | AC-16-01 | 自動化 E2E | `tests/e2e/e2e-content.mjs` | 不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證： |
| TC-16-01b | AC-16-01 | 自動化 E2E | `tests/e2e/e2e-env.mjs` | 不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證： |
| TC-16-01c | AC-16-01 | 自動化 E2E | `tests/e2e/e2e-env.mjs` | 不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證： |
| TC-16-02 | AC-16-02 | 自動化 E2E | `tests/e2e/e2e-content.mjs` | 不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證： |
| TC-16-03 | AC-16-03 | 自動化 E2E | `tests/e2e/e2e-content.mjs` | 不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證： |
| TC-16-04a | AC-16-04 | 自動化 E2E | `tests/e2e/e2e-content.mjs` | 不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證： |
| TC-16-04b | AC-16-04 | 自動化 E2E | `tests/e2e/e2e-content.mjs` | 不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證： |
| TC-17-01 | AC-17-01 | 自動化 E2E | `tests/e2e/e2e-content.mjs` | （v0.19 改寫）3 格數據依序為連續打卡天數、單字掌握率（小字「已掌握 N 字」）、模擬測驗（已答對行），各只出現 1 次；無「正確率」 |
| TC-17-02 | AC-17-02 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 連續打卡天數為 2；同一天多次學習不重複累加；中斷一天後再學習，天數重設為 1。日期以裝置本地時區計 |
| TC-17-04a | AC-17-04 | 自動化 E2E | `tests/e2e/e2e-content.mjs` | （v0.19）K = 0、答題數 0 顯示「已答對 0 / 200 題（0%）」，不顯示「—」（AC-49-02） |
| TC-17-04b | AC-17-04 | 自動化 E2E | `tests/e2e/e2e-content.mjs` | （v0.19）10 題對 7 → 第 3 格「已答對 7 / 200 題（4%）」，不顯示 70% |
| TC-17-04c | AC-17-04 | 自動化 E2E | `tests/e2e/e2e-answered.mjs` | （v0.19）K = 7、a = 10、c = 7 →「已答對 7 / 200 題（4%）」 |
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
| TC-22-03 | AC-22-03 | 自動化 E2E | `tests/e2e/e2e-speech.mjs` | （v0.20 改寫）onresult → 分數徽章、顏色與「辨識文字」繪製完成，10 次每次 ≤ 100 ms |
| TC-22-03b | AC-22-03 | 自動化 E2E | `tests/e2e/e2e-env.mjs` | 多輪：STT 評分繪製每筆 ≤ 100ms |
| TC-22-04 | AC-22-04 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | （e2e-goal）點卡片到選中狀態與試算繪製，一般與 4 倍降速各 10 次，中位數與 p90 ≤ 100ms |
| TC-22-04b | AC-22-04 | 自動化 E2E | `tests/e2e/e2e-env.mjs` | （e2e-env）同上，多輪判定（§2.3） |
| TC-22-05a | AC-22-05 | 自動化 E2E | `tests/e2e/e2e-env.mjs` | 一般模式 timeOrigin → emt-ready（主控台入口可點擊） |
| TC-22-05b | AC-22-05、AC-25-01 | 自動化 E2E | `tests/e2e/e2e-env.mjs` | 首次模式 timeOrigin → emt-ready（「開始學習」可點擊） |
| TC-23-01 | AC-23-01 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 卡片顯示出處：該字出現的全部來源字表名稱、版本與授權（例：「單字來源：NGSL 1.2（CC BY-SA 4.0）」），以及音標、釋義各自依該欄位的實際來源標示：來源標記為 ECD… |
| TC-23-02 | AC-23-02 | 自動化 E2E | `tests/e2e/e2e-content.mjs` | （v0.12 改寫）主控台本體無資料來源入口，主控台與其他頁的頁尾連結可開啟；列出外部資料欄位、修改說明與授權聲明；字表種類數一致 |
| TC-23-02b | AC-23-02（375px） | 自動化 E2E | `tests/e2e/e2e-env.mjs` | 375px 寬資料來源頁（含展開）無水平捲軸、超出與裁切 |
| TC-23-02c | AC-23-02（v0.17 品牌標識聲明 LT-4、商標聲明 LT-5） | 自動化 E2E | `tests/e2e/e2e-pwa.mjs` | （v0.17）資料來源與授權頁含品牌標識聲明 LT-4 逐字、商標聲明 LT-5 恰 1 次、不含舊文字、375／1366 寬可完整閱讀、既有 MIT／CC BY-SA 聲明仍在 |
| TC-23-02d-1366 | AC-23-02（v0.17 LT-3、LT-4、LT-5）、V-LGL-03 | 自動化 E2E | `tests/e2e/e2e-legal.mjs` | 同 TC-23-02d-375（1366px） |
| TC-23-02d-375 | AC-23-02（v0.17 LT-3、LT-4、LT-5）、V-LGL-03 | 自動化 E2E | `tests/e2e/e2e-legal.mjs` | LT-3、LT-4、LT-5 各恰 1 次；不含「著作權人 JimmyLin」「保留所有權利」；MIT、CC 聲明與聯絡行在；375px 無水平捲軸 |
| TC-23-07-1366 | AC-23-07 (1)(2)(3)(5)(6)、AC-27-03、AC-38-01、AC-38-04、SD-FB-69 | 自動化 E2E | `tests/e2e/e2e-legal.mjs` | 同 TC-23-07-375（1366px） |
| TC-23-07-375 | AC-23-07 (1)(2)(3)(5)(6)、AC-27-03、AC-38-01、AC-38-04、SD-FB-69 | 自動化 E2E | `tests/e2e/e2e-legal.mjs` | 聯絡行逐字、以 Range 量 1 行（SD-FB-69）、非連結、不可聚焦、點擊無動作、次要文字樣式、對比 ≥ 4.5、無水平捲軸、不被遮住；不寫 localStorage、無請求 |
| TC-23-07c | AC-23-07 (3)、AC-53-02 (6)、AC-55-02、AC-38-01、AC-38-04（FE-89 回饋 3：連結與聯絡行顏色） | 自動化 E2E | `tests/e2e/e2e-site.mjs` | FE-89 回饋 3：連結與聯絡行計算後顏色、對比 |
| TC-23-07f | AC-23-07 (7)（首次畫面不顯示） | 自動化 E2E | `tests/e2e/e2e-legal.mjs` | 首次畫面不顯示聯絡行 |
| TC-23-07h | AC-23-07 (4)(5)（V-PWA (b)）、AC-37-05 | 自動化 E2E | `tests/e2e/e2e-legal.mjs` | V-PWA (b)：聯絡行逐字；開啟資料來源頁新增請求 0；全程只有同源 GET |
| TC-23-07s | AC-23-07 (2)(8)、AC-55-02、AC-55-04（V-MAIL-02、ML-4） | 自動化（靜態檢查） | `tests/static/site-check.mjs` | 交付檔與靜態頁：ML-3、ML-4、mailto 0；meta、JSON-LD 不含地址 |
| TC-23-07t | AC-23-07 (1)(2)(4)(6)(7)、AC-55-02、AC-53-02 (6)（全部頁面與兩種寬度） | 自動化 E2E | `tests/e2e/e2e-site.mjs` | 信箱行只出現在 3 頁、1 行、非連結、不裁切 |
| TC-23-07x-1366 | AC-23-07 (4)（file:// 斷網）、(7)（其他畫面不顯示） | 自動化 E2E | `tests/e2e/e2e-legal.mjs` | 同 TC-23-07x-375（1366px） |
| TC-23-07x-375 | AC-23-07 (4)（file:// 斷網）、(7)（其他畫面不顯示） | 自動化 E2E | `tests/e2e/e2e-legal.mjs` | 其他 4 個功能區不顯示聯絡行；file:// 斷網仍顯示 |
| TC-23-08a | AC-23-08 (1)(3)、E-122（V-LGL-05 (a)） | 自動化（靜態檢查） | `tests/static/legal-check.mjs` | V-LGL-05 (a)：進入交付 HTML 的資料檔逐一字串：「多益常考」「多益最常見」0、A＋B 同句 0、單獨「常考」「必考」判讀 |
| TC-23-08b | AC-23-08 (2)、Q-71、Q-75（V-LGL-06） | 自動化（靜態檢查） | `tests/static/legal-check.mjs` | V-LGL-06：p5-009 coreStrategy = LT-6；與 f547158 相比其他欄位不變；p5-103 與其他題目整筆不變 |
| TC-23-08s | AC-23-08 (1)(3)、E-122（V-LGL-05 (b) 畫面文字）、AC-38-10 (1) | 自動化 E2E | `tests/e2e/e2e-legal.mjs` | V-LGL-05 (b)：首次畫面、4 個功能區、鎖定檢視、結算、全部答對、資料來源頁、對話框、Toast 的畫面文字逐一搜尋 |
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
| TC-25-07 | AC-25-07、AC-23-02（任一頁面） | 自動化 E2E | `tests/e2e/e2e-firstrun.mjs` | （v0.19）首次模式點頁尾資料來源開啟，返回鈕 .site-return「返回難易度設定」回首次畫面；#footer-first-run-back 已移除；無狀態鍵 |
| TC-25-08 | AC-25-08、AC-18-03 | 自動化 E2E | `tests/e2e/e2e-firstrun.mjs` | 開啟 firstRun、警示「進度將無法保存」；開始學習 → main、可翻卡=true、注入範本 10 字；重新開啟 → firstRun、警示「進度將無法保 |
| TC-25-09 | AC-25-09、AC-18-05 | 自動化 E2E | `tests/e2e/e2e-firstrun.mjs` | 非 JSON：main/dashboard、提示 ["資料讀取失敗，已重設"]；空字串：main/dashboard、提示 ["資料讀取失敗，已重設"]；版本 |
| TC-25-10 | AC-25-10、AC-24-03 | 自動化 E2E | `tests/e2e/e2e-firstrun.mjs` | 首次畫面點金後從備份還原 300 棕：依備份內容、不跳初始化視窗、localStorage 300 不轉換、重新載入後選中棕 |
| TC-25-11 | AC-25-11 | 自動化 E2E | `tests/e2e/e2e-firstrun.mjs` | (a) 檔案選擇器開啟=true 後未選檔：firstRun、狀態鍵 無；(a) 確認框「匯入備份  匯入將覆蓋目前所有進度  取消 匯入」按取消：firstR |
| TC-25-11d | AC-25-11（d）、AC-24-09 | 自動化 E2E | `tests/e2e/e2e-firstrun.mjs` | 容量不足還原：提示 ["儲存空間不足，未匯入"]、firstRun、狀態鍵 無；解除後按「開始學習」→ main、狀態鍵 有 |
| TC-26-01 | AC-26-01、AC-01-01 | 自動化 E2E | `tests/e2e/e2e-firstrun.mjs` | （v0.12 改寫）一般頁 375／768／1366 與首次畫面 375／1366 使用相同精簡列表：色條為色級色、名稱與數字不裁切、說明一行、藍金 opacity < 1、選中列框線為色級色並顯示 ✓、只 1 列選中、≥ 44×44、無水平捲軸；整列可點 |
| TC-26-02 | AC-26-02 | 自動化 E2E | `tests/e2e/e2e-firstrun.mjs` | 既有 300 且有紀錄：點綠只有綠選中、draftScore 725、試算綠；生效與單字集不變；點卡片不跳視窗 |
| TC-26-03 | AC-26-03 | 自動化 E2E | `tests/e2e/e2e-firstrun.mjs` | 不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證：不適用（暫停）。原驗證： |
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
| TC-30-04i | AC-30-04（v0.21：顯示過即時文字但以手動停止、換卡、錯誤、nomatch 結束）、AC-62-06、MS-6 | 自動化 E2E | `tests/e2e/e2e-interim.mjs` | （第 12 輪，AC-30-04 v0.21）今日 X = 0：顯示即時文字後以手動停止、換卡、TTS、network、no-speech、nomatch 結束 → X 仍 0、localStorage（除 flashcardPosition）不變；以即時文字評分後 X = 1（不屬本條） |
| TC-30-05 | AC-30-05 | 自動化 E2E | `tests/e2e/e2e-progress.mjs` | X=14：「今日已學 14 / 15 字」比例 93.3%、色 rgb(47, 111, 214)；X=15：「今日已學 15 / 15 字」滿圈 100%、金 |
| TC-30-06 | AC-30-06 | 自動化 E2E | `tests/e2e/e2e-progress.mjs` | 學過 2 個內建 + 自訂 Y → X=3；刪除 Y（已刪除=true）→ X=3；重新載入 → X=3 |
| TC-30-07 | AC-30-07、E-49 | 自動化 E2E | `tests/e2e/e2e-progress.mjs` | 第 T 天「今日已學 5 / 15 字」；(a) 過午夜學 1 字 →「今日已學 1 / 15 字」、長條末兩根 10/30:5 10/31:1、寫出 toda |
| TC-30-07c | AC-30-07、AC-30-13（FE-25／FE-30 跨午夜非學習寫入的正規化） | 自動化 E2E | `tests/e2e/e2e-progress.mjs` | 跨午夜前記憶體日期 2026-10-31；點藍卡並套用（生效色級不變，無確認視窗） → 有寫入、localStorage todayLearned {"date |
| TC-30-08 | AC-30-08 | 自動化 E2E | `tests/e2e/e2e-progress.mjs` | 長條 10/27:3(30%) 10/28:0(0%) 10/29:0(0%) 10/30:10(100%) 10/31:0(0%) 11/1:0(0%) 11 |
| TC-30-09 | AC-30-09 | 自動化 E2E | `tests/e2e/e2e-progress.mjs` | 預寫 31 筆（含今天往前第 30、45 天）→ 學 1 字後匯出歷史 30 筆（2026-10-04～2026-11-02）、第 29 天=7、今天=1、X= |
| TC-30-10 | AC-30-10 | 自動化 E2E | `tests/e2e/e2e-progress.mjs` | （v0.19 改寫）單字集 1,000、集內已掌握 250、集外 10、模擬測驗 10 對 7 → 單字掌握率 25%、小字「已掌握 260 字」、已答對 7 / 200 題（4%） |
| TC-30-10b | AC-30-10、E-48 | 自動化 E2E | `tests/e2e/e2e-progress.mjs` | 無內建資料（Q = 0）：單字掌握率「—」、第 3 格「—」，無 NaN／Infinity／undefined |
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
| TC-33-01a | AC-33-01（自動化代理：getUserMedia 呼叫次數） | 自動化 E2E | `tests/e2e/e2e-mic.mjs` | （v0.20 改寫）同頁 5 次按下：getUserMedia 只 1 次；每次先準備中再聆聽中；無說明視窗 |
| TC-33-02a | AC-33-02（自動化代理：音軌停止） | 自動化 E2E | `tests/e2e/e2e-mic.mjs` | 自動化代理：由導覽、頁尾離開 1 秒內音軌全部 ended、不再持有；回來再按會重新取得；重新整理時 pagehide 已釋放（使用中圖示見 TC-MIC-2） |
| TC-33-03 | AC-33-03 | 自動化 E2E | `tests/e2e/e2e-mic.mjs` | 5 格常駐、待機全暗不位移；聆聽中亮格從左連續；音量讀取間隔 ≤ 100ms；5 種結束方式 ≤ 100ms 回到全暗 |
| TC-33-03h | AC-33-03、AC-58-01（architecture v0.16 §10.13 Q12、SD-FB-93） | 人工 | `§6` | （人工）實機收音條：Chrome、Edge 實體麥克風，重新整理後第 1 次與離開再回來後第 1 次按下，聆聽中說話收音條會亮；iOS Safari 選測（Q12、SD-FB-93） |
| TC-33-03r | AC-33-03、AC-58-01（§7.28.4：AudioContext 不在點按處理器內建立後仍為 running；收音條會亮） | 自動化 E2E | `tests/e2e/e2e-stt-flow.mjs` | 瀏覽器假音源（--use-fake-device-for-media-stream），不加自動播放放寬參數：第 1 次與離開再回來後第 1 次按下，AudioContext 為 running、收音條會亮（v0.16 §7.28.4；第 11 輪） |
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
| TC-36-03c | AC-36-03（按「更新版本」）、AC-36-04、AC-36-05 | 自動化 E2E | `tests/e2e/e2e-pwa-update.mjs` | （v0.16）按「更新版本」：重新載入 1 次並為 V2；舊本專案快取刪除、其他快取保留；localStorage 不變（AC-36-04、AC-36-05） |
| TC-36-03d | AC-36-03（不按時維持 V1、關閉後重開為 V2）、AC-36-04 | 自動化 E2E | `tests/e2e/e2e-pwa-update.mjs` | （v0.11）不按：維持 V1、不自動重新載入；關閉全部分頁重開為 V2、資料不變 |
| TC-36-04b | AC-36-04（首次畫面）、AC-36-03（不按更新版本） | 自動化 E2E | `tests/e2e/e2e-pwa-update.mjs` | （v0.11）首次畫面使用者：提示照常顯示；不按、關閉後重開為 V2，仍為首次畫面且無狀態鍵 |
| TC-36-06 | AC-36-06 | 自動化 E2E | `tests/e2e/e2e-pwa-update.mjs` | （v0.11）V2 已部署但離線：以 V1 開啟、無提示無錯誤；恢復連網後重開即提示更新 |
| TC-36-07a | AC-36-07（本機模擬 MC-03 新 workflow） | 自動化（靜態與建置檢查） | `tests/static/pwa-static.mjs` | （v0.19）讀實際 .github/workflows/static.yml（MC-08）以 LF 複本模擬 CI：Build、Verify -eq 13、13 檔 |
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
| TC-38-09f-375 | AC-38-09 (a)（BUG-005 複驗，375×667） | 自動化 E2E | `tests/e2e/diag-r10-focus.mjs` | （BUG-005 複驗）375×667：「資料備份」以 Tab／Shift+Tab 取得焦點時完整可見；AC-38-09 列舉控制項焦點框 ≥ 2 px |
| TC-38-09f-390 | AC-38-09 (a)（BUG-005 複驗，390×844） | 自動化 E2E | `tests/e2e/diag-r10-focus.mjs` | 同 TC-38-09f-375（390×844） |
| TC-38-10 | AC-38-10、AC-24-03 | 自動化 E2E | `tests/e2e/e2e-layout.mjs` | （v0.19）<title> 為「EnglishContext｜英文單字卡與模擬測驗」；畫面不含舊名；鍵名、備份格式、快取前綴不變 |
| TC-39-01 | AC-39-01 | 自動化 E2E | `tests/e2e/e2e-layout.mjs` | （v0.12 新增）主控台區塊 DOM 與畫面順序：標題 → 今日任務 → 3 格數據 → 近 7 天 → 資料備份 → 頁尾；無功能入口、學習統計、目前目標、圖示磚（375／1366／1920） |
| TC-39-02 | AC-39-02 | 自動化 E2E | `tests/e2e/e2e-layout.mjs` | （v0.12 新增）今日任務卡：主環形圖與「開始今日學習」並排、目標行在下；按鈕強調橘底深色字、≥ 44×44、不換行 |
| TC-39-03 | AC-39-03、AC-22-01（量測方式） | 自動化 E2E | `tests/e2e/e2e-layout.mjs` | （v0.12 新增）「開始今日學習」→ 單字卡頁、導覽選中同步、localStorage 不變、≤ 100ms |
| TC-39-03b | AC-39-03、AC-06-06 | 自動化 E2E | `tests/e2e/e2e-layout.mjs` | （v0.12 新增）單字集為空時「開始今日學習」→ 單字卡空狀態，localStorage 不變（無內建資料 fixture） |
| TC-39-04 | AC-39-04、AC-17-06、E-92 | 自動化 E2E | `tests/e2e/e2e-layout.mjs` | （v0.12 新增）5 色目標行逐字；「變更」為按鈕 ≥ 44×44，點擊到一般難易度設定頁 |
| TC-39-04v | AC-39-04、AC-17-06、AC-38-01、AC-38-04、AC-38-06、AC-38-09、E-92 | 自動化 E2E | `tests/e2e/e2e-version.mjs` | 375／1366 套用 5 色：目標行文字只顯示生效色級、無「・」結尾、色點為生效色級；「變更」為 <button type=button>、無 btn--link、白底不透明＋四邊 1px 外框、無底線、非 #f7893b／#d5d9e0、對比 ≥ 4.5、≥ 44×44、不重疊不裁切、:focus-visible 有 3px 焦點框；滑鼠、觸控、Enter、空白鍵皆到一般難易度設定頁且 localStorage 不變；減少動態無動畫 |
| TC-39-05 | AC-39-05、AC-17-01、AC-30-10 | 自動化 E2E | `tests/e2e/e2e-layout.mjs` | （v0.19）K = 48：第 3 格「已答對 48 / 200 題（24%）」，3 格同列、不裁切 |
| TC-39-06 | AC-39-06、AC-23-02 | 自動化 E2E | `tests/e2e/e2e-layout.mjs` | （v0.19）主控台本體「已答對 」「單字掌握率」「連續打卡天數」、今日已學「X / D」、色級名稱各 1 次；無「正確率」 |
| TC-39-07 | AC-39-07、AC-30-08、E-88 | 自動化 E2E | `tests/e2e/e2e-layout.mjs` | （v0.12 新增）(a) 長條最高 ≤ 80px、圖表區 ≤ 120px；(b) 全 0 只顯示「開始學習後會顯示紀錄」、圖表區 ≤ 48px；學 1 字後回長條圖 |
| TC-39-08 | AC-39-08、AC-24-12、E-90、E-91 | 自動化 E2E | `tests/e2e/e2e-layout.mjs` | （v0.12 新增）資料備份預設收合、點擊／Enter 展開收合、切頁維持、匯入流程不收合、重新載入回收合、localStorage 不變；375 展開不被底部導覽遮住 |
| TC-39-09 | AC-39-09、AC-22-05（量測點） | 自動化 E2E | `tests/e2e/e2e-layout.mjs` | （v0.12 新增）V-LAYOUT 6 種尺寸：開啟與切回主控台不捲動，「開始今日學習」完整在視窗內、可點、在底部導覽之上 |
| TC-39-09r | AC-39-09、T-111（第 3 格 2～3 行後的首屏） | 自動化 E2E | `tests/e2e/e2e-answered.mjs` | 全部尺寸：第 3 格 2～3 行後「開始今日學習」仍在首屏（T-111） |
| TC-39-10 | AC-39-10、AC-40-02、AC-20-01 | 自動化 E2E | `tests/e2e/e2e-layout.mjs` | （v0.12 新增）主控台與模擬測驗內容寬：1366／1920 ≤ 720 置中（左右差 ≤ 2）、768 = min(可用, 720)、375 填滿；6 種尺寸無水平捲軸 |
| TC-40-01 | AC-40-01、AC-11-05 | 自動化 E2E | `tests/e2e/e2e-layout.mjs` | （v0.12 新增）進度條：標題下題目上、高 ≥ 4px、#1e9bf0、role/aria、i÷N（誤差 ≤ 1 點）、下一題 ≤ 100ms、結算 100%、重新開始 1÷N、重新載入一致、減少動態無轉場 |
| TC-40-03 | AC-40-03 | 自動化 E2E | `tests/e2e/e2e-layout.mjs` | （v0.12 新增）模擬測驗既有 AC 由既有 TC 覆核（TC-10-*、TC-11-*、TC-29-*、TC-28-06、TC-38-03） |
| TC-41-01 | AC-41-01、AC-25-01 | 自動化 E2E | `tests/e2e/e2e-layout.mjs` | （v0.12 新增）首次畫面順序：標題列 → 選擇你的目標 → 副標 → 本系統建議字量 → 5 列；無試算結果卡、導覽、自訂表單、範本；背景同其他畫面 |
| TC-41-02 | AC-41-02、AC-02-03、AC-02-05、AC-02-10、AC-22-04 | 自動化 E2E | `tests/e2e/e2e-layout.mjs` | （v0.12 新增）固定底部列：鎖定行（藍金）→ 摘要行 → 開始學習 → 從備份還原；5 色摘要逐字、≤ 100ms、與一般頁試算相同；首次畫面不寫 localStorage |
| TC-41-03 | AC-41-03 | 自動化 E2E | `tests/e2e/e2e-layout.mjs` | （v0.12 新增）V-LAYOUT 6 種尺寸＋375×812：不捲動摘要行與兩按鈕在視窗內可點；≤ 640 固定，捲到中段與底部仍可見可點 |
| TC-41-04 | AC-41-04、AC-25-07、AC-25-11 (b)、E-93 | 自動化 E2E | `tests/e2e/e2e-layout.mjs` | （v0.19）底部列 ≤ 184px；頁尾 4 連結與版本行可捲到底部列上方；Tab 順序色級列 → 開始學習 → 從備份還原 → 關於我 → 聯絡我們 → 隱私權政策 → 資料來源與授權 |
| TC-41-04r | AC-41-04、AC-25-01（首次畫面 Tab 順序：色級 → 開始學習 → 從備份還原 → 頁尾） | 自動化 E2E | `tests/e2e/e2e-site.mjs` | 首次畫面 Tab 順序（AC-41-04） |
| TC-42-01a | AC-42-01 (a)、AC-41-04、AC-27-03、AC-23-02、E-95、E-96 | 自動化 E2E | `tests/e2e/e2e-version.mjs` | file:// 375×667、1366×768：首次畫面、主控台、難易度設定、單字卡、模擬測驗、資料來源頁各恰 1 行版本行，位於 #footer-sources 正下方、<p>、非連結、無 tabindex、Tab 不可達、單行、對比 ≥ 4.5、非強調橘、捲到底不被底部列遮住；畫面無 @@／undefined／null／空括號 |
| TC-42-01b | AC-42-01 (b)、AC-42-03 (b)、AC-37-05、AC-41-04、AC-27-03 | 自動化 E2E | `tests/e2e/e2e-version.mjs` | npm run serve（tools/serve.mjs、dist/site）同 TC-42-01a 各畫面檢查；請求只有預先快取清單與 sw.js 的同源 GET、無 package.json；文字與 file:// 相同 |
| TC-42-02 | AC-42-02、AC-36-02、AC-36-07、E-96 | 自動化 E2E | `tests/e2e/e2e-version.mjs` | package.json version＝emt-app-version＝畫面 X.Y.Z（1.0.0）；建置碼＝emt-build-id 前 7 碼＝sw.js BUILD_ID 前 7 碼；dist 與 site/index.html 逐位元組相同；無 @@ 殘留 |
| TC-42-03a | AC-42-03 (a)、AC-21-01 (a)、E-98 | 自動化 E2E | `tests/e2e/e2e-version.mjs` | file:// 連網與斷網各 6 畫面：請求 0、版本行照常；切換畫面前後 localStorage 相同、只有 1 個鍵、schemaVersion 2、不含版本號與建置碼；匯出備份頂層 5 欄、不含版本號 |
| TC-42-04a | AC-42-04 (a)、AC-36-01 (a) | 自動化 E2E | `tests/e2e/e2e-version.mjs` | 不改檔連續建置 2 次（--out 暫存）：HTML、sw.js、manifest、site/index.html 逐位元組相同，且與 dist 相同 |
| TC-42-04b | AC-42-04 (b)、E-97（建置面） | 自動化 E2E | `tests/e2e/e2e-version.mjs` | 只改 package.json 複本 version 為 1.0.1（--package）：emt-app-version 1.0.1、BUILD_ID 與 sw.js 改變 |
| TC-42-04c | AC-42-04 (c)、AC-36-01 (b) | 自動化 E2E | `tests/e2e/e2e-version.mjs` | src/app 複本改 1 個字：emt-app-version 不變、BUILD_ID 改變 |
| TC-42-04d | AC-42-04 (b)（更新流程）、AC-36-03、E-97 | 自動化 E2E | `tests/e2e/e2e-version.mjs` | 本機 serve 已造訪目前版本（1.2.0），改部署修訂號 +1（1.2.1）後重新載入出現「有新版本，請更新版本」與「更新版本」按鈕，按下後版本行為 1.2.1 |
| TC-43-01 | AC-43-01、AC-25-06、E-101 | 自動化 E2E | `tests/e2e/e2e-version.mjs` | 375／1366：範本區為 #customizer-custom 第 2 個子節點，帶 hidden＋inert、display none、高 0；Tab 與 focus()／點擊／Enter／空白鍵皆無法觸發；表單卡與清單卡間距 12px；DOM 與交付檔仍含 3 個範本與注入程式；首次畫面無範本；表單新增刪除照常；Console 無錯誤 |
| TC-43-02 | AC-43-02、AC-06-06、E-100、AC-43-01 | 自動化 E2E | `tests/e2e/e2e-version.mjs` | 375／1366：首次畫面、4 功能區、資料備份展開、刪除確認視窗、STT 說明視窗、初始化確認視窗、資料來源頁、所有 Toast 的可見文字＋aria-label／title 無「範本」；無資料 fixture 單字卡空狀態與自訂清單空狀態逐字符合 DS-27、文句完整、仍有「前往難易度設定」 |
| TC-43-03a | AC-43-03（localStorage）、AC-04-06、AC-04-07、AC-23-01、E-99、E-19 | 自動化 E2E | `tests/e2e/e2e-version.mjs` | 以 v0.13 交付檔（git 8a266c3）實際注入「資工」＋表單 1 字的 localStorage 開啟 v0.14：直接進主控台、11 字逐欄不變、只標「自訂擴充」、單字卡含 11 字且範本字可 TTS／STT；表單加 latency 提示「單字已存在」；刪除 1 字其餘不變；匯出備份 10 字、origin／templateId 保留 |
| TC-43-03b | AC-43-03（匯入 v0.13 備份）、AC-24-08、E-99 | 自動化 E2E | `tests/e2e/e2e-version.mjs` | 同 TC-43-03a，改為匯入 v0.13 匯出的備份檔並確認 |
| TC-44-01-1366 | AC-44-01、AC-39-03、AC-22-01、FP-3、FP-8 | 自動化 E2E | `tests/e2e/e2e-track.mjs` | （v0.15）1366px：同 TC-44-01-375 |
| TC-44-01-375 | AC-44-01、AC-39-03、AC-22-01、FP-3、FP-8 | 自動化 E2E | `tests/e2e/e2e-track.mjs` | （v0.15）375px：下一張 9 次到第 10 張、關閉重開；導覽與「開始今日學習」兩種進入皆顯示同一字正面「第 10 / N 張」、無提示、≤ 100ms |
| TC-44-02 | AC-44-02、AC-28-03、FP-3 | 自動化 E2E | `tests/e2e/e2e-track.mjs` | （v0.15）上一張、向右滑動、下一張各換卡 1 次後立即重新載入，皆回到最後顯示的那張；每次換卡 setItem 1 次、≤ 100ms |
| TC-44-03-1366 | AC-44-03、FP-7、AC-30-04、AC-17-02 | 自動化 E2E | `tests/e2e/e2e-track.mjs` | （v0.15）同 TC-44-03-375（1366px） |
| TC-44-03-375 | AC-44-03、FP-7、AC-30-04、AC-17-02 | 自動化 E2E | `tests/e2e/e2e-track.mjs` | （v0.15）還原位置不改今日已學、打卡、掌握數；卡片為正面 |
| TC-44-04 | AC-44-04、FP-2 (3)、FP-5、E-105 | 自動化 E2E | `tests/e2e/e2e-track.mjs` | （v0.15）刪除前面的自訂單字、再新增自訂單字後以單字找回同一張，序號與總數更新 |
| TC-44-05a | AC-44-05 (a)、AC-04-08、FP-2 (4)、E-104 | 自動化 E2E | `tests/e2e/e2e-track.mjs` | （v0.15）上次位置的自訂單字被刪除：中間 → 原本的下一張、最後一張 → 前一張 |
| TC-44-05bc | AC-44-05 (b)(c)、FP-2 (4)、E-104 | 自動化 E2E | `tests/e2e/e2e-track.mjs` | （v0.15）記錄的單字不在單字集：i ≤ N 顯示第 i 張、i > N 顯示第 N 張；無空白卡、無錯誤 |
| TC-44-06 | AC-44-06 (b)(c)、AC-47-05（flashcardPosition）、RD-3 (d)、E-107 | 自動化 E2E | `tests/e2e/e2e-track.mjs` | （v0.15）位置欄位 10 種無效 shape 與 v0.14 狀態：第 1 張、只重設該欄、無「資料讀取失敗」、無 unreadable 鍵 |
| TC-44-07 | AC-44-07、AC-06-06、FP-2 (1)、E-106 | 自動化 E2E | `tests/e2e/e2e-track.mjs` | （v0.15）單字集為空時顯示空狀態且紀錄不動；新增自訂單字後依紀錄（在則該字、否則 min(i, N)） |
| TC-44-08 | AC-44-08、AC-03-05、AC-32-04、FP-4、CI-9、E-108 | 自動化 E2E | `tests/e2e/e2e-track.mjs` | （v0.15）直接套用、確認「確定」回第 1 張且重新載入仍第 1 張；「取消」維持第 10 張、localStorage 與按套用前相同 |
| TC-44-08b | AC-44-08（FB-54：同生效色級套用）、AC-32-05 | 自動化 E2E | `tests/e2e/e2e-track.mjs` | （v0.15，FB-54）綠 → 藍 → 金 → 綠（生效色級不變）套用不回第 1 張、不跳確認視窗 |
| TC-44-09 | AC-44-09、FP-1、Q-68 | 自動化 E2E | `tests/e2e/e2e-track.mjs` | （v0.15）測驗模式在第 i 張時重新載入 → 單字卡模式、正面、同一張 |
| TC-44-10a | AC-44-10 (a)、AC-47-07 (a)、AC-18-03、FP-9、WR-3、E-102 | 自動化 E2E | `tests/e2e/e2e-track.mjs` | （v0.15）localStorage 停用：同一工作階段內位置、標示、K、開關照常；重新載入回預設並持續顯示「進度將無法保存」 |
| TC-44-10b | AC-44-10 (b)、AC-47-07 (b)、AC-30-14、WR-2、V-ST-22、E-103 | 自動化 E2E | `tests/e2e/e2e-track.mjs` | （v0.15，V-ST-22）容量已滿：換卡、翻面、作答、開關、點色級混合 19 次寫入只提示「儲存空間不足」1 次；畫面照常；localStorage 原值不變 |
| TC-45-01 | AC-45-01、CR-2、AC-11-03 | 自動化 E2E | `tests/e2e/e2e-track-p5.mjs` | （v0.15）未曾答對的題目答對 → ≤ 100ms 出現「✓ 曾答對」、K + 1、累計 + 1；重新載入仍為曾答對 |
| TC-45-01p | AC-45-01、AC-45-05（≤ 100ms，10 次）、NFR-4 | 自動化 E2E | `tests/e2e/e2e-track-p5.mjs` | （v0.15）連續 10 題答對，標示與計數更新每次 ≤ 100ms |
| TC-45-02 | AC-45-02、CR-2 | 自動化 E2E | `tests/e2e/e2e-track-p5.mjs` | （v0.15）答錯不出現標示、K 不變、答題數 + 1 |
| TC-45-03 | AC-45-03、AC-11-06、AC-48-01、AC-48-08、CR-2 | 自動化 E2E | `tests/e2e/e2e-track-p5.mjs` | （v0.18）(a) 開關關閉再遇到曾答對題為鎖定、點擊無效；(b) 開關開啟跳過；(c) 答對當下重複點擊只計 1 次；(d) v1.1.0 答錯殘留顯示該次結果；K、紀錄不重複，(a)(b)(d) 累計不變 |
| TC-45-04-1366 | AC-45-04、AC-38-01、AC-38-04、AC-11-01、CR-4 (a) | 自動化 E2E | `tests/e2e/e2e-track-p5.mjs` | （v0.15）同 TC-45-04-375（1366px） |
| TC-45-04-375 | AC-45-04、AC-38-01、AC-38-04、AC-11-01、CR-4 (a) | 自動化 E2E | `tests/e2e/e2e-track-p5.mjs` | （v0.18）375px：曾答對題在 .p5-meta 題型標籤後顯示「✓ 曾答對」，對比 ≥ 4.5、非強調橘、不裁切；選項依 AC-48-01 鎖定；未曾答對題無標示、可作答、對錯顏色照常 |
| TC-45-05-1366 | AC-45-05、AC-40-01、AC-38-07、CR-4 (b)、MT-1 | 自動化 E2E | `tests/e2e/e2e-track-p5.mjs` | （v0.15）同 TC-45-05-375（1366px） |
| TC-45-05-375 | AC-45-05、AC-40-01、AC-38-07、CR-4 (b)、MT-1 | 自動化 E2E | `tests/e2e/e2e-track-p5.mjs` | （v0.15）375px：K = 0、37、200 × 題目與結算畫面各恰 1 行「已答對 K / 200 題」、tabular-nums、進度條後題目前、不與題號或開關重疊、不裁切 |
| TC-45-06 | AC-45-06、CR-5、CR-7、AC-17-04、AC-11-07、AC-17-02、AC-30-04、AC-48-02 | 自動化 E2E | `tests/e2e/e2e-track-p5.mjs` | （v0.19）累計、本輪、打卡、今日已學不變；經過鎖定檢視不計入；重新開始不清除答對紀錄；主控台第 3 格改已答對行且與 K 相同 |
| TC-45-07 | AC-45-07、CR-3、Q-71、E-109 | 自動化 E2E | `tests/e2e/e2e-track-p5.mjs` | （v0.18）答對紀錄含題庫外與重複 id：K = 3、不顯示、不報錯、資料保留；曾答對題為鎖定檢視，直接「下一題」前進 |
| TC-45-08 | AC-45-08、AC-32-02（v0.15：學習進度紀錄 (7)、「已答對 0 / Q 題」）、AC-32-04、CI-4、CI-8、E-108 | 自動化 E2E | `tests/e2e/e2e-track-p5.mjs` | （v0.15）切換生效色級：確定 → 答對紀錄清空、K = 0、開關保留、第 1 題；取消 → 全部不變 |
| TC-46-01-1366 | AC-46-01、AC-38-09、AC-31-03、UO-1、AC-48-10 | 自動化 E2E | `tests/e2e/e2e-track-p5.mjs` | （v0.18）同 TC-46-01-375（1366px，滑鼠點擊） |
| TC-46-01-375 | AC-46-01、AC-38-09、AC-31-03、UO-1、AC-48-10 | 自動化 E2E | `tests/e2e/e2e-track-p5.mjs` | （v0.18）375px：開關為原生核取方塊、預設關閉、題目與結算與全部答對畫面皆有、156×44、Tab＋焦點框、空白鍵／Enter／觸控切換、減少動態無動畫；全部答對畫面關閉依 AC-48-10 |
| TC-46-02 | AC-46-02、UO-2、AC-11-01～AC-11-07、AC-48-01 | 自動化 E2E | `tests/e2e/e2e-track-p5.mjs` | （v0.18）開關關閉時不跳過曾答對題，為已答對鎖定檢視（AC-48-01）；下一題未曾答對為未作答 |
| TC-46-03 | AC-46-03、UO-5、Q-66、MT-1 | 自動化 E2E | `tests/e2e/e2e-track-p5.mjs` | （v0.15）開關開啟「下一題」跳到下一個未答對題（第 4 / 200 題、進度 4/200）、跳過不計入本輪 |
| TC-46-03p | AC-46-03（≤ 100ms，10 次）、NFR-4 | 自動化 E2E | `tests/e2e/e2e-track-p5.mjs` | （v0.15）開關開啟連續 10 次「下一題」跳題，每次 ≤ 100ms |
| TC-46-04 | AC-46-04、UO-4、E-110、AC-48-06 | 自動化 E2E | `tests/e2e/e2e-track-p5.mjs` | （v0.18）不變式：開啟時鎖定檢視 → 跳題；其後無未答對 K < Q → 結算（y = 0 依 AC-48-06）、K = Q → 全部答對；本次作答結果 → 等「下一題」；重新載入同；開關不改計數 |
| TC-46-05 | AC-46-05、UO-5、UO-6、AC-11-04、AC-40-01、E-112、AC-48-06 | 自動化 E2E | `tests/e2e/e2e-track-p5.mjs` | （v0.18）其後已無未答對 → 本輪結算（y = 0 依 AC-48-06）、進度 100%；重新開始 → 第一題未答對 |
| TC-46-06 | AC-46-06、UO-3、UO-7、MT-1、AC-38-09、E-111、E-125、AC-48-12 | 自動化 E2E | `tests/e2e/e2e-track-p5.mjs` | （v0.18）答對最後一題後「下一題」→「200 題全部答對！」、本輪結算、提示 filterHintAllCorrect、只有 1 個「清除答對紀錄，重新來過」≥ 44×44 且鍵盤可操作；不出現舊按鈕文字；K = Q 開啟或重新載入 y = 0 不顯示結算數字 |
| TC-46-07 | AC-46-07 | 自動化 E2E | `tests/e2e/e2e-track-p5.mjs` | 不適用（v0.18 移除）。PRD v0.18 Q-77 決議 A 移除「全部題目再練一次（保留紀錄）」按鈕，本版不驗收；檢視全部題目改為關閉開關，原驗證移到 TC-48-10（e2e-l |
| TC-46-08 | AC-46-08、CR-6、UO-7 (b)、AC-17-04 | 自動化 E2E | `tests/e2e/e2e-track-p5.mjs` | （v0.19）「清除答對紀錄」確認對話框含「將清除全部題目的答對紀錄」「「已答對」會回到 0 題」，不含舊句；取消／Esc／點遮罩不變；確定 → K = 0、開關仍開、累計保留、主控台 0% |
| TC-46-09 | AC-46-09、UO-8、AC-48-01 | 自動化 E2E | `tests/e2e/e2e-track-p5.mjs` | （v0.18）(a) 開啟中關閉開關維持作答結果，「下一題」到曾答對題為鎖定檢視；(b) 停留未作答；(c) 維持結算；統計不變 |
| TC-46-10 | AC-46-10、Q-69、AC-46-04（不變式）、US-32「有學習紀錄」不含開關 | 自動化 E2E | `tests/e2e/e2e-track-p5.mjs` | （v0.18）開關跨重新載入、關閉重開、匯出匯入保存；匯入後不變式成立（跳到第 3 題未作答）；開關不屬「有學習紀錄」 |
| TC-47-01 | AC-47-01、AC-18-01（v0.15）、FP-1、CR-1、UO-1 | 自動化 E2E | `tests/e2e/e2e-track.mjs` | （v0.15）位置、答對紀錄、開關與其他 AC-18-01 資料關閉重開後完全相同；localStorage 1 個鍵、schemaVersion 3、12 欄 |
| TC-47-02 | AC-47-02、AC-24-02（v0.15）、AC-46-10（備份）、AC-25-10、AC-24-03、AC-32-08、FP-6 | 自動化 E2E | `tests/e2e/e2e-track.mjs` | （v0.15）匯出備份含 3 項新資料（頂層 5 欄、data 12 欄）；首次畫面還原與主控台匯入皆還原，且不跳初始化視窗 |
| TC-47-03 | AC-47-03、AC-24-10、IM-9、MG-8、FP-6、E-113 | 自動化 E2E | `tests/e2e/e2e-track.mjs` | （v0.15）匯入 FE-70 的 v0.14 與 v0.7 備份樣本：成功、既有欄位相同、第 1 張、K = 0、開關關閉 |
| TC-47-04 | AC-47-04、AC-30-12、MG-5～MG-7、RD-4、E-114、V-ST-21 | 自動化 E2E | `tests/e2e/e2e-track.mjs` | （v0.15；v0.19 第 3 格改已答對行）以 FE-70 的 v0.14、v0.7 localStorage 樣本開啟：直接主控台、遷移寫回 1 次、再載入 0 次、既有欄位不變、第 3 格「已答對 0 / 200 題（0%）」 |
| TC-47-04b | AC-47-04（以 v1.0.0 交付檔實測，SD-FB-58）、AC-36-04 | 自動化 E2E | `tests/e2e/e2e-track.mjs` | （v0.15）以 v1.0.0 交付檔實際學習後換成 1.1.0 開啟：遷移 1 次、9 欄逐欄相同、原題號、K = 0 |
| TC-47-05 | AC-47-05、RD-3 (a)～(c)、E-116 | 自動化 E2E | `tests/e2e/e2e-track.mjs` | （v0.15）localStorage 中答對紀錄、開關、位置各種無效值：只重設該項（非字串 id 忽略、有效 id 保留），其他資料不變 |
| TC-47-06 | AC-47-06、IM-9、IM-10、AC-45-07、AC-44-05、AC-24-05、E-116 | 自動化 E2E | `tests/e2e/e2e-track.mjs` | （v0.15）匯入 IM-10（題庫外、重複 id；位置的字不在單字集）成功；IM-9 整欄型別錯誤 8 種顯示「備份檔格式錯誤，未匯入」且資料不變 |
| TC-47-08b | AC-47-08 (b)、AC-37-05、WR-4 | 自動化 E2E | `tests/e2e/e2e-track-p5.mjs` | （v0.15）npm run serve：換卡、作答、開關、清除答對紀錄、匯出、匯入期間只有允許清單內的同源 GET |
| TC-48-01-1366 | AC-48-01、AC-45-04、AC-38-03、AC-38-04、AC-40-02、LV-2 | 自動化 E2E | `tests/e2e/e2e-lock.mjs` | 同 TC-48-01-375（1366px） |
| TC-48-01-375 | AC-48-01、AC-45-04、AC-38-03、AC-38-04、AC-40-02、LV-2 | 自動化 E2E | `tests/e2e/e2e-lock.mjs` | 375px：由 p5-004「下一題」到達 p5-005 ≤ 100ms；正解同本次答對綠色＋「正確答案」、其他 3 個鎖定不標色；4 個 disabled、無 aria-pressed=true；回饋逐字、解析兩段非空、無禁止文字、無單題重做；不裁切、無水平捲軸；Tab＋Enter 操作「下一題」 |
| TC-48-01m | AC-48-01（減少動態關閉時結果相同）、AC-31-03 | 自動化 E2E | `tests/e2e/e2e-lock.mjs` | 減少動態開與關時鎖定檢視結果相同 |
| TC-48-02-force | AC-48-02、V-ST-23（移除 disabled 後強制點擊、直接呼叫 store，防禦層） | 自動化 E2E | `tests/e2e/e2e-lock.mjs` | 防禦層：移除 disabled 後 click、直接呼叫 answerPart5 回 { ok: false }，資料、setItem、vibrate、動畫不變 |
| TC-48-02-kbd | AC-48-02、E-124、AC-38-09 | 自動化 E2E | `tests/e2e/e2e-lock.mjs` | 真實按鍵：Tab 走完全頁選項取得焦點 0 次、focus() 無法聚焦 disabled 選項；Enter、空白鍵、A～D、1～4 無反應；重新載入 setItem 0 次；Enter 下一題統計不變；對照組鍵盤可對未作答題作答 |
| TC-48-02-mouse | AC-48-02、E-124、LV-4 | 自動化 E2E | `tests/e2e/e2e-lock.mjs` | 真實滑鼠點 4 個選項與連點：a、c、x、y、K、打卡、今日已學不變；vibrate 0 次、setItem 0 次、無動畫；重新載入 setItem 0 次；下一題後統計不變；主控台正確率不變 |
| TC-48-02-swipe | AC-48-02、AC-28-06（鎖定檢視在選項上滑動） | 自動化 E2E | `tests/e2e/e2e-lock.mjs` | 375px 在鎖定選項上滑動：資料、setItem、vibrate、動畫皆不變 |
| TC-48-02-touch | AC-48-02、E-124、AC-28-06 | 自動化 E2E | `tests/e2e/e2e-lock.mjs` | 真實觸控（Input.dispatchTouchEvent，375px）點 4 個選項同上；並以同路徑對未作答題作答作為對照組，證明觸控事件確實送達 |
| TC-48-03 | AC-48-03、AC-45-04、AC-40-01、UO-10 | 自動化 E2E | `tests/e2e/e2e-lock.mjs` | p5-001、002 曾答對為鎖定檢視、不跳過；p5-003 從未作答、p5-004 答錯過皆未作答可作答、無標示；每次下一題 ≤ 100ms；題號與進度條 |
| TC-48-04 | AC-48-04、AC-11-07、UO-6 | 自動化 E2E | `tests/e2e/e2e-lock.mjs` | 結算按「重新開始」：(a) p5-001 曾答對為鎖定檢視；(b) 未曾答對為未作答；本輪歸 0、a、c、K 不變；重新載入不變 |
| TC-48-05 | AC-48-05、AC-11-05、LV-4 | 自動化 E2E | `tests/e2e/e2e-lock.mjs` | (a) 鎖定檢視、(b) 本次作答結果 × 重新載入、切換功能區、關閉重開皆不變；(b) 離開再回來改為鎖定文字；a、c、x、y 不變 |
| TC-48-06-1366 | AC-48-06、AC-11-04、SM-1、SM-2、E-125、E-27 | 自動化 E2E | `tests/e2e/e2e-lock.mjs` | （v0.19）y = 0「本輪沒有新作答的題目」，其下已答對行（a = 0 也顯示）；「%」只在已答對行 |
| TC-48-06-375 | AC-48-06、AC-40-02、E-125 | 自動化 E2E | `tests/e2e/e2e-lock.mjs` | （v0.19）375px：同上；無水平捲軸、不裁切 |
| TC-48-07 | AC-48-07、E-126、UO-8、UO-10 | 自動化 E2E | `tests/e2e/e2e-lock.mjs` | K = Q、開關關閉在第 195 題：進入、重新載入、切換功能區皆鎖定檢視；恰 Q − i + 1 = 6 次進結算；重新開始第 1 題；開啟全部答對；關閉第 1 題；全程清除鈕 1 個、K = Q |
| TC-48-07b | AC-48-07（i = 1 走完整輪）、AC-48-10（恰按 Q 次） | 自動化 E2E | `tests/e2e/e2e-lock.mjs` | K = Q、i = 1：恰 200 次「下一題」進入結算（有界） |
| TC-48-08-setup | AC-48-08（樣本）、E-127 | 自動化 E2E | `tests/e2e/e2e-lock.mjs` | 以 git f57145a 的 v1.1.0 交付檔實際作答產生 (a)(b)(c) 三份 localStorage 與備份檔 |
| TC-48-08a | AC-48-08 (a)、E-127、LV-7、AC-48-01 | 自動化 E2E | `tests/e2e/e2e-lock.mjs` | (a) v1.1.0 資料以 1.2.0 開啟：p5-005 直接為鎖定檢視、K = 2、data 逐欄相同、不觸發 AC-18-05 |
| TC-48-08b | AC-48-08 (b)、E-127 | 自動化 E2E | `tests/e2e/e2e-lock.mjs` | (b) p5-006 未作答、資料相同 |
| TC-48-08c | AC-48-08 (c)、AC-45-03 (d)、E-128、LV-7 | 自動化 E2E | `tests/e2e/e2e-lock.mjs` | (c) 維持該次答錯結果（所選標紅、正解標綠）、重新載入相同；下一題離開不重新計分；回到 p5-005 為鎖定檢視 |
| TC-48-08d | AC-48-08（匯入 v1.1.0 備份、匯出比對）、DS-46、V-ST-27 | 自動化 E2E | `tests/e2e/e2e-lock.mjs` | 匯入 v1.1.0 實際匯出的備份：鎖定檢視、K = 2；1.2.0 匯出與 v1.1.0 匯出頂層與 data 欄位集合、schemaVersion、內容相同 |
| TC-48-09a | AC-48-09 (a)、AC-47-07、E-129、WR | 自動化 E2E | `tests/e2e/e2e-lock.mjs` | (a) 真實停用 localStorage：工作階段內答對 p5-001 走到結算重新開始為鎖定檢視＋「進度將無法保存」；重新載入 K = 0、未作答；不白屏 |
| TC-48-09b | AC-48-09 (b)、AC-30-14、E-129 | 自動化 E2E | `tests/e2e/e2e-lock.mjs` | (b) 容量已滿：工作階段內鎖定檢視、「儲存空間不足」恰 1 次、localStorage 原值不變 |
| TC-48-09cde | AC-48-09 (c)(d)(e)、E-130、AC-45-07、LV-6、V-ST-25 | 自動化 E2E | `tests/e2e/e2e-lock.mjs` | (c) correctIndex 不合法：「這一題的資料不完整。」恰 1 次、不標綠、選項鎖定、下一題可用，解析為空不建段落；(d) 無合法 id：未作答、無標示、K 不增加；(e) 只含不存在 id：未作答、無按鈕；以實際建置的測試題庫驗證 |
| TC-48-10 | AC-48-10、AC-46-09 (a)、AC-46-07 原驗證、E-111、UO-8、UO-7 | 自動化 E2E | `tests/e2e/e2e-lock.mjs` | 全部答對畫面 (a)(b)(c) 3 種進入方式關閉開關 ≤ 100ms → 第 1 題鎖定檢視、本輪歸 0、K、a、c 不變；重新載入不變；恰 Q 次進結算；例外：答對當下關閉維持結果 |
| TC-48-11a-1366 | AC-48-11 (a)（每個畫面恰 1 個、位置、樣式、44×44、鍵盤）、AC-38-01、CR-10 | 自動化 E2E | `tests/e2e/e2e-lock.mjs` | 同 TC-48-11a-375（1366px） |
| TC-48-11a-375 | AC-48-11 (a)（每個畫面恰 1 個、位置、樣式、44×44、鍵盤）、AC-38-01、CR-10 | 自動化 E2E | `tests/e2e/e2e-lock.mjs` | 375px：K ≥ 1 的 9 種畫面（開關 × 未作答、本次作答、鎖定檢視、結算、全部答對）各恰 1 個按鈕；位置、次要樣式、≥ 44×44、非強調橘、不裁切；Tab＋Enter、空白鍵開對話框、Esc 焦點回按鈕 |
| TC-48-11b-1366 | AC-48-11 (b)、E-132、AC-45-07 | 自動化 E2E | `tests/e2e/e2e-lock.mjs` | 同 TC-48-11b-375（1366px） |
| TC-48-11b-375 | AC-48-11 (b)、E-132、AC-45-07 | 自動化 E2E | `tests/e2e/e2e-lock.mjs` | 375px：K = 0（空紀錄、只含不存在 id）題目與結算畫面 0 個按鈕、紀錄保留（E-132） |
| TC-48-11c-1366 | AC-48-11（取消、Esc、遮罩、確定）、AC-46-08、E-133、CR-6、UO-7、AC-17-04 | 自動化 E2E | `tests/e2e/e2e-lock.mjs` | （v0.19）1366px：同 TC-48-11c-375 |
| TC-48-11c-375 | AC-48-11（取消、Esc、遮罩、確定）、AC-46-08、E-133、CR-6、UO-7、AC-17-04 | 自動化 E2E | `tests/e2e/e2e-lock.mjs` | （v0.19）375px：5 種畫面 × 取消、Esc、遮罩資料不變、setItem 0；確定 → K = 0、第 1 題未作答、按鈕消失、開關維持、本輪歸 0、累計保留、主控台已答對 0 / 200 題（0%） |
| TC-48-12-1366 | AC-48-12、HN-1、AC-38-01、AC-38-04、AC-40-02、E-134、AC-10-02（不重疊） | 自動化 E2E | `tests/e2e/e2e-lock.mjs` | 同 TC-48-12-375（1366px） |
| TC-48-12-375 | AC-48-12、HN-1、AC-38-01、AC-38-04、AC-40-02、E-134、AC-10-02（不重疊） | 自動化 E2E | `tests/e2e/e2e-lock.mjs` | 375px：12 種畫面說明文字逐字恰 1 次、不同時顯示另一句、對比 ≥ 4.5、非強調橘、不裁切、不重疊、無水平捲軸、開關 ≥ 44、位於開關下方；回報 Range 行數 |
| TC-48-12e | AC-48-12（題庫為空）、AC-11 C-6 | 自動化 E2E | `tests/e2e/e2e-lock.mjs` | 題庫為空（實際建置）：無開關、無說明、無清除鈕 |
| TC-48-12z | AC-48-12、E-134（375px 放大字級 150%）、AC-48-11（375px 不裁切） | 自動化 E2E | `tests/e2e/e2e-lock.mjs` | 375px 字級 150%（E-134）：說明與清除鈕不裁切、不重疊、無水平捲軸 |
| TC-49-01 | AC-49-01、AC-17-01、AC-17-04、AC-30-01、AC-30-10、AC-39-05、AC-39-06、AC-38-07 | 自動化 E2E | `tests/e2e/e2e-answered.mjs` | K = 48、a = 300、c = 210：標籤「模擬測驗」、逐字「已答對 48 / 200 題（24%）」1 次、tabular-nums、無 70%、無「正確率」；兩種寬度 |
| TC-49-02 | AC-49-02 | 自動化 E2E | `tests/e2e/e2e-answered.mjs` | K = 0、1、199、200：主控台與結算逐字；無 NaN／Infinity／undefined／0 / 0 |
| TC-49-02q | AC-49-02、E-18、E-27（Q = 0） | 自動化 E2E | `tests/e2e/e2e-answered.mjs` | Q = 0（無資料 fixture）：主控台「—」、不顯示已答對行 |
| TC-49-03 | AC-49-03、AC-48-06、AC-45-05、AC-45-06 | 自動化 E2E | `tests/e2e/e2e-answered.mjs` | 開關開與關 × y ≥ 1、y = 0、a = 0；全部答對畫面不另加 |
| TC-49-03b | AC-49-02（K = Q、開關關閉的結算）、AC-48-07 | 自動化 E2E | `tests/e2e/e2e-answered.mjs` | K = Q、開關關閉 y = 0 的結算顯示已答對行 100% |
| TC-49-04 | AC-49-04、AC-45-06、AC-48-02 | 自動化 E2E | `tests/e2e/e2e-answered.mjs` | 答對、答錯、鎖定檢視、不存在與重複 id：主控台、結算、模擬測驗頁 K、Q、P 相同 |
| TC-49-05 | AC-49-05、AC-11-07、AC-32-02、AC-46-08、AC-48-11、E-136 | 自動化 E2E | `tests/e2e/e2e-answered.mjs` | 重新開始、清除、初始化、匯入＋重新載入；a、c 依 AC 變化 |
| TC-49-06a | AC-49-06（v1.2.0 實際作答與匯出） | 自動化 E2E | `tests/e2e/e2e-answered.mjs` | git 25e3c3f 的 v1.2.0 交付檔實際作答 4 題、翻卡、匯出備份 |
| TC-49-06b | AC-49-06、AC-47-04、AC-36-03（目前版本開啟 v1.2.0 實際 localStorage，不改寫） | 自動化 E2E | `tests/e2e/e2e-answered.mjs` | 1.3.0 開啟 v1.2.0 實際 localStorage：位元組不變、setItem 0、無錯誤 |
| TC-49-06c | AC-49-06、AC-11-03（作答仍更新累計）、AC-48-01 | 自動化 E2E | `tests/e2e/e2e-answered.mjs` | 1.3.0 作答後 totalAnswered、totalCorrect 依 AC-11-03 更新 |
| TC-49-06d | AC-49-06、AC-24-02（匯出格式與 v1.2.0 相同） | 自動化 E2E | `tests/e2e/e2e-answered.mjs` | 1.3.0 匯出備份：頂層 5 欄、data 12 欄與 v1.2.0 備份相同 |
| TC-49-06e | AC-49-06、AC-24-03、AC-49-05 (d)（1.3.0 匯入 v1.2.0 實際備份） | 自動化 E2E | `tests/e2e/e2e-answered.mjs` | 1.3.0 匯入 v1.2.0 實際備份 |
| TC-49-06f | AC-49-06、AC-32-01（有學習紀錄仍以累計答題數判定）、E-135 | 自動化 E2E | `tests/e2e/e2e-answered.mjs` | K = 0、a = 12：主控台 0%、切換色級仍跳確認（US-32） |
| TC-49-07 | AC-49-07、AC-46-08、AC-45-05（V-ANS-03） | 自動化 E2E | `tests/e2e/e2e-answered.mjs` | 全部頁面、對話框、Toast、首次畫面：「正確率」「累計答對」0 次 |
| TC-49-07b | AC-49-07（單字測驗統計與 AC-46-08 不受影響） | 自動化 E2E | `tests/e2e/e2e-answered.mjs` | 本輪「答對 x / y」保留 |
| TC-49-08 | AC-49-08、AC-20-01、AC-38-04、AC-38-07、AC-39-09 | 自動化 E2E | `tests/e2e/e2e-answered.mjs` | 全部尺寸 K = 200：3 格同列、≥ 14px、對比 ≥ 4.5、不裁切、無水平捲軸 |
| TC-50-01 | AC-50-01、E-138 | 自動化 E2E | `tests/e2e/e2e-ad.mjs` | 【替身】已設定單元 ID：file、localhost、http 正式、www、github.io 廣告請求 0、無框 |
| TC-50-01s | AC-50-01、E-147、Q-89（獨立視窗不載入） | 自動化 E2E | `tests/e2e/e2e-ad-extra.mjs` | 【替身】display-mode: standalone 不載入（E-147） |
| TC-50-02 | AC-50-02、AC-21-01 (b)、AC-37-05、AC-18-06、AC-21-03、AC-24-01、AC-42-03、AC-47-08、E-139（第一階段完整操作） | 自動化 E2E | `tests/e2e/e2e-site.mjs` | 第一階段完整操作（本機 HTTPS 模擬正式網址）：跨來源 0、無框、同源只有允許 GET |
| TC-50-03 | AC-50-03、AC-19-01、AC-36-07（V-AD-03、FB-74） | 自動化（靜態檢查） | `tests/static/site-check.mjs` | 同次建置兩份 HTML 相同；無靜態廣告標籤；var AD_SLOT_ID = null; |
| TC-50-04 | AC-50-04、AC-52-01、AC-52-02 (c)、AC-39-01、E-141、E-142（V-AD-05） | 自動化 E2E | `tests/e2e/e2e-ad.mjs` | 【替身】切頁 3 次：腳本 1 次、push 1 次、ins 同一節點、只有主控台可見 |
| TC-50-05 | AC-50-05、AC-50-03（V-AD-03、§7.25.4 五層保護） | 自動化（靜態檢查） | `tests/static/site-check.mjs` | 只差 adSlotId 的兩次建置：差異只有 BUILD_ID、index、sw；保護層 |
| TC-50-06 | AC-50-06、AC-37-05、AC-35-01（Cache Storage 無廣告） | 自動化 E2E | `tests/e2e/e2e-ad.mjs` | 【替身】Cache Storage 無廣告資源 |
| TC-50-06s | AC-50-06、AC-57-05、AC-35-01（V-AD-06 靜態、DP-9） | 自動化（靜態檢查） | `tests/static/site-check.mjs` | sw.js 無廣告字樣；預先快取清單 7 項 |
| TC-50-06u | AC-50-06、AC-36-03、AC-50-05（廣告已啟用環境經過 1 次更新） | 自動化 E2E | `tests/e2e/e2e-ad.mjs` | 【替身】廣告環境經過 1 次更新（本機 HTTPS） |
| TC-50-07 | AC-50-07、AC-50-08、AC-37-05、AC-18-06、AC-21-03、AC-24-01、AC-42-03、AC-47-08、E-144（V-AD-06） | 自動化 E2E | `tests/e2e/e2e-ad.mjs` | 【替身】全部請求匯出（含發起者）；哨兵字串與答對紀錄命中 0；push 參數 {} |
| TC-50-08b | AC-50-08、E-144（第三方寫入同網域儲存） | 自動化 E2E | `tests/e2e/e2e-ad-extra.mjs` | 【替身】第三方寫入同網域儲存不進本系統狀態與備份（E-144） |
| TC-50-09 | AC-50-09（V-AD-03、AD-15） | 自動化（靜態檢查） | `tests/static/site-check.mjs` | AD-15 meta 與 ads.txt 逐字、pub ID 相同 |
| TC-50-10h | AC-50-10、E-146 | 人工 | `tests/static/site-check.mjs` | 第二階段：Google CMP（人類實機） |
| TC-50-10s | AC-50-10（靜態部分：不自建同意、不保存）、AC-50-08（程式） | 自動化（靜態檢查） | `tests/static/site-check.mjs` | 廣告模組無儲存 API、無同意邏輯、不讀學習欄位 |
| TC-51-01 | AC-51-01、E-140、E-146（部分）（V-AD-04） | 自動化 E2E | `tests/e2e/e2e-ad.mjs` | 【替身】離線、阻擋、500、unfilled、永不回應 10 秒、逾時後才到、push 例外 |
| TC-51-02 | AC-51-02（本機參考值，非基準環境；最終 TC-M07） | 自動化 E2E | `tests/e2e/e2e-ad.mjs` | 【替身】按鈕可點時間與不早於按鈕請求廣告（本機參考） |
| TC-51-03a | AC-51-03（一般速度，本機替身，非基準環境） | 自動化 E2E | `tests/e2e/e2e-ad-perf.mjs` | 【替身】一般速度反應時間各 ≥ 10 次 |
| TC-51-03b | AC-51-03（4 倍降速，本機替身，非基準環境） | 自動化 E2E | `tests/e2e/e2e-ad-perf.mjs` | 【替身】4 倍降速反應時間，與無廣告對照 |
| TC-51-04 | AC-51-04、AC-35-02、E-140（V-PWA、離線重新載入） | 自動化 E2E | `tests/e2e/e2e-ad.mjs` | 【替身】SW 啟用、瀏覽器回報離線重新載入：無請求、無空白框 |
| TC-52-01 | AC-52-01、AC-53-05（其他畫面版位 0、離開主控台不可見） | 自動化 E2E | `tests/e2e/e2e-ad.mjs` | 【替身】7 個其他畫面版位不可見；主控台寬度 |
| TC-52-02 | AC-52-02、E-141、E-136 | 自動化 E2E | `tests/e2e/e2e-ad.mjs` | 【替身】(a)(b) 無請求；(c) 載入；(d) ≤ 100ms 隱藏；(e) 維持 |
| TC-52-03 | AC-52-03、AC-52-05、AC-39-09、E-143、T-108 | 自動化 E2E | `tests/e2e/e2e-ad.mjs` | 【替身】全部尺寸距離 ≥ 48、不固定、學習區塊座標差 0 |
| TC-52-04 | AC-52-04、AC-52-07 (c)、AC-38-01、AC-38-04 | 自動化 E2E | `tests/e2e/e2e-ad.mjs` | 【替身】「廣告」標籤對比、緊鄰、無引導 |
| TC-52-05b | AC-52-05（受影響元素只可為頁尾與版面底部；BUG-006：app-header__inner） | 自動化 E2E | `tests/e2e/e2e-ad.mjs` | 【替身】layout shift 受影響元素（BUG-006）：一般與隱藏捲軸 × 1366、1920 × 廣告環境、第一階段（v1.2.0 參考）；目前建置 header 位移 0、每個畫格 scrollbar-gutter 為 stable、data-ad-env 只在廣告環境 |
| TC-52-05c | AC-52-05、T-108、SD-FB-80（一般捲軸：無捲軸到有捲軸） | 自動化 E2E | `tests/e2e/e2e-ad.mjs` | 【替身】一般捲軸：無捲軸到有捲軸，學習區塊與 header 不動（T-108） |
| TC-52-05f | AC-52-05（BUG-006：file:// 載入期 header；一般與模擬廣告環境） | 自動化 E2E | `tests/e2e/diag-r11-gutter.mjs` | file:// 交付檔 1920×1080、1366×768（一般捲軸）：一般與 DOMContentLoaded 設 data-ad-env 模擬廣告環境，逐畫格 header 左緣不變、首畫格起 gutter 為 stable、header layout shift 0（第 11 輪 BUG-006） |
| TC-52-05g | AC-52-05（BUG-006：廣告環境成立的測試建置，本機 HTTPS，一般捲軸） | 自動化 E2E | `tests/e2e/diag-r11-gutter.mjs` | 【替身】已設定單元 ID 的測試建置以本機 HTTPS 當正式網址（CDP、一般捲軸，Chrome、Edge）：同 TC-52-05f 判定（第 11 輪 BUG-006） |
| TC-52-06 | AC-52-06、E-142（切頁 5 次、資料備份、作答；靜置） | 自動化 E2E | `tests/e2e/e2e-ad.mjs` | 【替身】切頁 5 次、展開收合、作答、靜置 5 分鐘：不重新請求、iframe 未重載 |
| TC-52-07 | AC-52-07、AC-39-01、AC-38-09 | 自動化 E2E | `tests/e2e/e2e-ad.mjs` | 【替身】Tab 順序與無廣告相同；焦點不自動移入 |
| TC-53-02 | AC-53-02、AC-53-03（外部連結）、AC-53-06 | 自動化（靜態檢查） | `tests/static/site-check.mjs` | 隱私權政策依序 (1)～(6)、無禁用宣稱、外部連結 rel noopener |
| TC-53-02h | AC-53-02 (4)（FB-71：公開文案與退出連結由人類讀過；連結由主控於實作前依 Google 現行頁面核對） | 人工 | `tests/static/site-check.mjs` | 文案可接受；連結有效 |
| TC-53-04a | AC-53-04、AC-57-04、V-SITE-04（無本系統狀態與有本系統狀態；重新載入；停用 JS 可讀；全部尺寸） | 自動化 E2E | `tests/e2e/e2e-site.mjs` | 靜態頁無狀態直接開啟與重新載入、停用 JS 可讀、全部尺寸 |
| TC-53-06 | AC-53-06、AC-24-12、AC-08-13、AC-23-02（畫面文字無矛盾） | 自動化 E2E | `tests/e2e/e2e-site.mjs` | 全部頁面無「零請求」等矛盾文字；AC-24-12、AC-08-13 與隱私權政策一致 |
| TC-54-01 | AC-54-01 | 自動化（靜態檢查） | `tests/static/site-check.mjs` | 關於我依序 (1)～(5)；（v0.21）模擬測驗項為「題型參考 TOEIC®（多益），非 ETS 官方或認可內容」，不含「Part 5」 |
| TC-54-02 | AC-54-02、V-SEO-06 | 自動化（靜態檢查） | `tests/static/site-check.mjs` | 禁用字詞 0 次 |
| TC-55-01a | AC-55-01、AC-55-02、AC-55-03、AC-53-05（聯絡我們內容區） | 自動化 E2E | `tests/e2e/e2e-site.mjs` | 聯絡我們內容區恰標題與 1 行信箱、無表單（應用內） |
| TC-55-01s | AC-55-01、AC-55-02、AC-55-03（靜態頁 main） | 自動化（靜態檢查） | `tests/static/site-check.mjs` | 同上（靜態頁 main） |
| TC-55-04a | AC-55-04（V-MAIL-01、ML-3） | 自動化（靜態檢查） | `tests/static/mail-scan.mjs` | git ls-files＋未追蹤＋dist/site：ML-3 連續地址 0 |
| TC-55-04b | AC-23-07 (8)、AC-55-04（ML-4） | 自動化（靜態檢查） | `tests/static/mail-scan.mjs` | ML-4 空白形式都等於現行值（上游 tasks.json FE-77 另列） |
| TC-55-04c | AC-55-04（現行地址本地部分連續形式） | 自動化（靜態檢查） | `tests/static/mail-scan.mjs` | 現行地址本地部分連續形式 0 |
| TC-55-04h | AC-55-04（不含 Git 歷史，只回報） | 自動化（靜態檢查） | `tests/static/mail-scan.mjs` | Git 歷史只回報，不改寫 |
| TC-56-01 | AC-56-01、AC-34-01、AC-38-10（V-SEO-01） | 自動化（靜態檢查） | `tests/static/site-check.mjs` | 首頁 title、description 逐字；無 keywords |
| TC-56-02 | AC-56-02（V-SEO-02 首頁） | 自動化（靜態檢查） | `tests/static/site-check.mjs` | lang、canonical、無 noindex |
| TC-56-03 | AC-56-03（V-SEO-03 首頁；og:image 回應 200 待 D-4） | 自動化（靜態檢查） | `tests/static/site-check.mjs` | Open Graph 7 項（og:image 正式網址 200 待 D-4） |
| TC-56-04a | AC-56-04（應用內 h1～h3） | 自動化 E2E | `tests/e2e/e2e-site.mjs` | 應用內每畫面 1 個 h1、不跳級 |
| TC-56-04b | AC-56-04（首次畫面 h1～h3） | 自動化 E2E | `tests/e2e/e2e-site.mjs` | 首次畫面 1 個 h1、不跳級 |
| TC-56-05 | AC-56-05（V-SEO-04） | 自動化（靜態檢查） | `tests/static/site-check.mjs` | JSON-LD 恰 1 段且鍵正確 |
| TC-56-06 | AC-56-06、E-150、E-151（V-SEO-05，靜態；不閃現見 e2e-site TC-56-06b） | 自動化（靜態檢查） | `tests/static/site-check.mjs` | noscript 含名稱、說明、功能、3 個連結 |
| TC-56-06b | AC-56-06、AC-25-01、AC-41-01（啟用 JS 時 noscript 不渲染、不閃現） | 自動化 E2E | `tests/e2e/e2e-site.mjs` | 啟用 JS：noscript 不渲染、不閃現 |
| TC-56-06c | AC-56-06、E-150、AC-37-02（停用 JS） | 自動化 E2E | `tests/e2e/e2e-site.mjs` | 停用 JS：可讀、無學習入口 |
| TC-56-07 | AC-56-07、AC-23-08（V-SEO-06） | 自動化（靜態檢查） | `tests/static/site-check.mjs` | 用詞：AC-23-08、官方與認可只在否定句 |
| TC-56-08 | AC-56-08、E-155（V-SEO-07；本機解析，正式網址 200 由主控 D-3） | 自動化（靜態檢查） | `tests/static/site-check.mjs` | robots 解析（本機）；回應 200 待 D-3 |
| TC-56-09 | AC-56-09（V-SEO-07；本機解析，正式網址 200 由主控 D-3） | 自動化（靜態檢查） | `tests/static/site-check.mjs` | sitemap 解析（本機）；回應 200 待 D-3 |
| TC-56-10a | AC-56-10、AC-21-01 (a)、AC-37-01、AC-37-02、AC-19-04、AC-50-09、AC-53-03、AC-57-02（V-SEO-08） | 自動化 E2E | `tests/e2e/e2e-site.mjs` | file:// 連網、空資料夾：請求 0 |
| TC-56-10b | AC-56-10、AC-21-01 (a)、AC-37-01、AC-37-02、AC-19-04、AC-50-09、AC-53-03、AC-57-02（V-SEO-08） | 自動化 E2E | `tests/e2e/e2e-site.mjs` | file:// 斷網、空資料夾：請求 0 |
| TC-56-sp-about | AC-56-01、AC-56-02、AC-56-03、AC-56-04（V-SEO-01～03、靜態頁） | 自動化（靜態檢查） | `tests/static/site-check.mjs` | about.html：title「關於我｜EnglishContext」、description「EnglishContext 的網站用途、主要功能、使用方式與 |
| TC-56-sp-contact | AC-56-01、AC-56-02、AC-56-03、AC-56-04（V-SEO-01～03、靜態頁） | 自動化（靜態檢查） | `tests/static/site-check.mjs` | contact.html：title「聯絡我們｜EnglishContext」、description「EnglishContext 的聯絡方式。」、canon |
| TC-56-sp-privacy | AC-56-01、AC-56-02、AC-56-03、AC-56-04（V-SEO-01～03、靜態頁） | 自動化（靜態檢查） | `tests/static/site-check.mjs` | privacy.html：title「隱私權政策｜EnglishContext」、description「EnglishContext 如何處理學習資料、廣告服 |
| TC-57-01a | AC-57-01、AC-42-01、AC-20-03、AC-27-03（V-SITE-01；全部尺寸 × 8 畫面） | 自動化 E2E | `tests/e2e/e2e-site.mjs` | 全部尺寸 × 8 畫面：頁尾順序、≥ 44×44、版本行在下、不被遮 |
| TC-57-01b | AC-57-01、AC-53-01、AC-38-09（點擊與 Tab＋Enter 開啟返回；返回原畫面） | 自動化 E2E | `tests/e2e/e2e-site.mjs` | 4 來源 × 4 頁面開啟與返回；Tab＋Enter |
| TC-57-01c | AC-57-01、AC-25-01、AC-25-07、AC-41-04、E-148（首次模式；4 頁返回、無狀態鍵） | 自動化 E2E | `tests/e2e/e2e-site.mjs` | 首次模式：4 頁返回、無狀態鍵、setItem 0 |
| TC-57-02a | AC-57-02、AC-53-03、AC-21-01、AC-37-01（file:// 閱讀 3 頁：請求 0、不寫入） | 自動化 E2E | `tests/e2e/e2e-site.mjs` | file:// 閱讀 3 頁：請求 0、不寫入 |
| TC-57-03 | AC-57-03、AC-53-02、AC-54-01、AC-55-01（應用內與靜態 main 正規化文字完全相同，SC-4） | 自動化 E2E | `tests/e2e/e2e-site.mjs` | 應用內與靜態 main 正規化文字相同 |
| TC-57-03s | AC-57-03（V-SITE-03 單一來源） | 自動化（靜態檢查） | `tests/static/site-check.mjs` | 文案單一來源 |
| TC-57-04-about | AC-57-04、AC-57-03（V-SITE-04）、AC-53-04（靜態部分） | 自動化（靜態檢查） | `tests/static/site-check.mjs` | about.html：<script> 0；外部資源 0；缺少的連結 無；CSS 內嵌且無 localStorage／serviceWorker=true |
| TC-57-04-contact | AC-57-04、AC-57-03（V-SITE-04）、AC-53-04（靜態部分） | 自動化（靜態檢查） | `tests/static/site-check.mjs` | contact.html：<script> 0；外部資源 0；缺少的連結 無；CSS 內嵌且無 localStorage／serviceWorker=true |
| TC-57-04-privacy | AC-57-04、AC-57-03（V-SITE-04）、AC-53-04（靜態部分） | 自動化（靜態檢查） | `tests/static/site-check.mjs` | privacy.html：<script> 0；外部資源 0；缺少的連結 無；CSS 內嵌且無 localStorage／serviceWorker=true |
| TC-57-04b | AC-57-04（連結可鍵盤操作；回首頁）、AC-56-06（一般連結可導向） | 自動化 E2E | `tests/e2e/e2e-site.mjs` | 靜態頁鍵盤操作、回首頁、資料來源入口 |
| TC-57-05a | AC-57-05、AC-53-04、E-152（靜態頁連網直接開啟；不被 SW 攔截；Cache 不變） | 自動化 E2E | `tests/e2e/e2e-site.mjs` | 靜態頁連網直接開：不被 SW 攔截、Cache 不變（本機 HTTPS） |
| TC-57-05b | AC-57-05（離線直接開靜態頁屬預期）、AC-57-02（V-PWA 離線應用內可讀）、AC-35-02、E-152 | 自動化 E2E | `tests/e2e/e2e-site.mjs` | 離線直接開靜態頁屬預期；應用內 3 頁可讀 |
| TC-57-06a | AC-57-06、AC-36-01、AC-36-07（V-SITE-06） | 自動化（靜態檢查） | `tests/static/site-check.mjs` | 連續建置決定性；與 dist/site 相同；13 檔 |
| TC-57-06b | AC-57-06、AC-36-03、AC-57-03（改文案同步） | 自動化（靜態檢查） | `tests/static/site-check.mjs` | 改 1 句文案：HTML、privacy、sw 同步，BUILD_ID 改變 |
| TC-57-06h | AC-57-06（部署網址新增檔案皆 200） | 人工 | `tests/static/site-check.mjs` | 皆 200 |
| TC-57-07 | AC-53-05（版面）、AC-38-01、AC-38-04、AC-20-01（3 頁全部尺寸） | 自動化 E2E | `tests/e2e/e2e-site.mjs` | 3 頁 × 全部尺寸版面與對比 |
| TC-57-sources | AC-57-04（#sources 入口）、AC-20-04、V-SITE-07 | 自動化 E2E | `tests/e2e/e2e-site.mjs` | #sources 入口、片段移除；隱藏片段行為不變 |
| TC-58-01 | AC-58-01、AC-08-01（v0.20） | 自動化 E2E | `tests/e2e/e2e-stt-flow.mjs` | 前次分數與訊息存在時按下：≤ 100 ms 內「準備中」、aria-label「準備中，再按一次取消」、aria-pressed true；分數與訊息清除；收音條全暗；不出現「聆聽中」 |
| TC-58-01f | AC-58-01（本次載入第 1 次按下 ≤ 100 ms；BUG-007） | 自動化 E2E | `tests/e2e/e2e-stt-flow.mjs` | 本次載入第 1 次按下（Chrome、Edge 各 3 次新載入；getUserMedia 擱置只量產品）：量測 rAF 在 click 前登錄、rAF → setTimeout(0) 取畫出時間 ≤ 100 ms；處理器 ≤ 16 ms、處理器結束時已 preparing；getUserMedia 在畫出後才呼叫；另記第 2 次、離開再回來（第 11 輪 BUG-007 複驗） |
| TC-58-01g | AC-58-01（4 倍 CPU 降速；BUG-007 §21.5 的 2/16 超過） | 自動化 E2E | `tests/e2e/e2e-stt-flow.mjs` | 4 倍 CPU 降速：離開單字卡頁再回來後第 1 次按麥克風，Chrome、Edge 各 16 次，畫出 ≤ 100 ms；另記本次載入第 1 次 3 次（第 11 輪） |
| TC-58-01h | AC-58-01（BUG-007 實機影響） | 人工 | `§6` | 第 11 輪自動化已通過；實機感受仍請記錄 |
| TC-58-02 | AC-58-02、AC-33-03（v0.20 準備中全暗） | 自動化 E2E | `tests/e2e/e2e-stt-flow.mjs` | start() 回傳後、未 audiostart：音源 −5 dBFS 持續 4.4 秒取樣，按鈕仍「準備中」、5 格全暗 |
| TC-58-03 | AC-58-03、AC-08-01、AC-33-03 | 自動化 E2E | `tests/e2e/e2e-stt-flow.mjs` | 5 次：事件順序 start 回傳 → audiostart →「聆聽中」；聆聽中 − audiostart ∈ [T_BUFFER, T_BUFFER + 100]；收音條 ≤ 300 ms 點亮 |
| TC-58-04a | AC-58-04 (a)、AC-58-01（含取得麥克風期間）、E-157 | 自動化 E2E | `tests/e2e/e2e-stt-flow.mjs` | getUserMedia 擱置（取得中）再按：≤ 100 ms 回待機、不提示；之後取得完成不開始辨識、音軌保留；再按不再呼叫 getUserMedia |
| TC-58-04b | AC-58-04 (b) | 自動化 E2E | `tests/e2e/e2e-stt-flow.mjs` | 已 start、未 audiostart 再按：≤ 100 ms 回待機、abort 1 次、不提示；舊實例遲到 7 種事件不改畫面 |
| TC-58-04c | AC-58-04 (a)、AC-58-05（延後期間取消：不呼叫 getUserMedia；§7.28.3） | 自動化 E2E | `tests/e2e/e2e-stt-flow.mjs` | 延後期間取消（同一任務內按下再按）：getUserMedia 0 次、未建立 AudioContext、回待機無訊息；之後再按只取得 1 次（v0.16 §7.28.3；第 11 輪） |
| TC-58-05 | AC-58-05（已開始辨識後取消再按） | 自動化 E2E | `tests/e2e/e2e-stt-flow.mjs` | 已 start 時取消後 ≤ 100 ms 再按：新準備中；舊實例遲到 audiostart、result、end 不改畫面；同時只有 1 個辨識工作；無未處理例外 |
| TC-58-05b | AC-58-05（取得中取消後立即再按：共用取得、不出現第 2 個權限詢問）、PR-8 | 自動化 E2E | `tests/e2e/e2e-stt-flow.mjs` | 取得中取消後立即再按：getUserMedia 只呼叫 1 次（共用擱置中的取得）；放行後只有新嘗試開始辨識 |
| TC-58-06 | AC-58-06、E-156 | 自動化 E2E | `tests/e2e/e2e-stt-flow.mjs` | 替身不觸發事件：start 回傳到回待機 5000 ± 200 ms、中止辨識、「語音辨識沒有回應，請再試一次」；遲到事件不改畫面；再按可重新開始 |
| TC-58-06b | AC-58-06（權限詢問不計入 T_READY）、E-157 | 自動化 E2E | `tests/e2e/e2e-stt-flow.mjs` | getUserMedia 擱置 6.2 秒（> T_READY）仍準備中；再按回待機；之後才允許不開始辨識 |
| TC-58-07 | AC-58-07 | 自動化 E2E | `tests/e2e/e2e-stt-flow.mjs` | 準備中直接 soundstart、speechstart → 同一處理器內聆聽中、之後不套用 T_READY；result → 評分；nomatch →「有收到聲音」 |
| TC-58-07i | AC-58-07（v0.21：準備中暫時結果視同已開始收音，不評分） | 自動化 E2E | `tests/e2e/e2e-interim.mjs` | （第 12 輪，AC-58-07 v0.21）準備中收到暫時結果 adres → 聆聽中、不評分；之後最終結果 address → 100 綠燈（以最終結果為準） |
| TC-58-08 | AC-58-08、E-161 | 自動化 E2E | `tests/e2e/e2e-stt-flow.mjs` | 準備中 error（not-allowed、service-not-allowed、audio-capture、network、其他、no-speech）、無錯誤 end、start() 例外 → 對應訊息、待機、全暗、無分數 |
| TC-58-09 | AC-58-09、E-158 | 自動化 E2E | `tests/e2e/e2e-stt-flow.mjs` | 替身無 onaudiostart：準備中，start 回傳後 1500 ms（−20～+120）聆聽中並點亮；不套用 T_READY；期間再按取消；提前 speechstart、result、error、end 依 AC-58-07、08 |
| TC-58-10a | AC-58-10 (a) 取得麥克風期間、E-159 | 自動化 E2E | `tests/e2e/e2e-stt-flow.mjs` | 取得麥克風期間換卡、切換模式、按 TTS（照常朗讀）→ 待機不提示，取得完成不開始；翻面繼續；離開單字卡頁 1 秒內釋放音軌 |
| TC-58-10b | AC-58-10 (b) 已開始辨識期間、E-159 | 自動化 E2E | `tests/e2e/e2e-stt-flow.mjs` | 已開始辨識期間換卡、切換模式、按 TTS → 中止辨識、待機、不提示；遲到事件不改畫面；翻面與聆聽中相同；離開頁面 1 秒內釋放 |
| TC-58-11 | AC-58-11、AC-33-06 (b)（v0.20 準備中）、E-160 | 自動化 E2E | `tests/e2e/e2e-stt-flow.mjs` | 準備中持有音軌時拔除：≤ 100 ms 回待機全暗、「找不到麥克風裝置」與說明、無分數、中止辨識 |
| TC-58-12 | AC-58-12、AC-30-04（v0.20 準備中取消與逾時）、AC-17-02 | 自動化 E2E | `tests/e2e/e2e-stt-flow.mjs` | 取消、逾時、兩種分流訊息後：localStorage 位元組、鍵、schemaVersion 3、匯出備份不變；無準備中字樣；準備中重新載入為待機 |
| TC-58-13-1366 | AC-58-13 (a)（1366px） | 自動化 E2E | `tests/e2e/e2e-stt-flow.mjs` | （1366px 一般設定）375／1366（一般、減少動態）：準備中與聆聽中按鈕、收音條座標差 0；底色或文字色不同、不用 --light-red；無動畫與轉場；不裁切、無水平捲軸；對比 ≥ 4.5；Enter、空白鍵、觸控結果相同 |
| TC-58-13-375 | AC-58-13 (a)（375px） | 自動化 E2E | `tests/e2e/e2e-stt-flow.mjs` | （375px 一般設定）375／1366（一般、減少動態）：準備中與聆聽中按鈕、收音條座標差 0；底色或文字色不同、不用 --light-red；無動畫與轉場；不裁切、無水平捲軸；對比 ≥ 4.5；Enter、空白鍵、觸控結果相同 |
| TC-58-13m-1366 | AC-58-13 (b)、AC-31-03、AC-33-08（v0.20）、E-66（1366px） | 自動化 E2E | `tests/e2e/e2e-stt-flow.mjs` | （1366px 減少動態）375／1366（一般、減少動態）：準備中與聆聽中按鈕、收音條座標差 0；底色或文字色不同、不用 --light-red；無動畫與轉場；不裁切、無水平捲軸；對比 ≥ 4.5；Enter、空白鍵、觸控結果相同 |
| TC-58-13m-375 | AC-58-13 (b)、AC-31-03、AC-33-08（v0.20）、E-66（375px） | 自動化 E2E | `tests/e2e/e2e-stt-flow.mjs` | （375px 減少動態）375／1366（一般、減少動態）：準備中與聆聽中按鈕、收音條座標差 0；底色或文字色不同、不用 --light-red；無動畫與轉場；不裁切、無水平捲軸；對比 ≥ 4.5；Enter、空白鍵、觸控結果相同 |
| TC-58-14h | AC-58-14、AC-33-01、E-163 | 人工 | `§6` | （人工）V-MIC 真人語音：Chrome、Edge 最新穩定版各 1 輪＋正式網站 Chrome 1 輪；(a) 等「聆聽中」再念 10 次 ≥ 9 次出分數；(b) 一按就念 10 次；逐次記錄狀態與結果、瀏覽器版本 |
| TC-59-01 | AC-59-01、AC-08-10（v0.20）、E-05 | 自動化 E2E | `tests/e2e/e2e-stt-flow.mjs` | 聆聽中 speechstart → end：「有收到聲音，但沒聽出英文單字，請再說一次」、全暗、無分數、只 1 則 |
| TC-59-01i | AC-59-01（v0.21：最終與暫時結果都沒有）、AC-62-05 | 自動化 E2E | `tests/e2e/e2e-interim.mjs` | （第 12 輪，AC-59-01 v0.21）speechstart → end：無最終也無暫時結果 →「有收到聲音…」；有暫時結果 adress → 依 AC-62-05 評分 86 |
| TC-59-02 | AC-59-02 | 自動化 E2E | `tests/e2e/e2e-stt-flow.mjs` | nomatch（有無 speechstart）→ end：同上，end 不改寫訊息 |
| TC-59-03 | AC-59-03、AC-60-04 | 自動化 E2E | `tests/e2e/e2e-stt-flow.mjs` | result 為 ""、"   "、"..."（有無 speechstart）→「有收到聲音」、無分數區、無「辨識文字」標籤 |
| TC-59-04 | AC-59-04 | 自動化 E2E | `tests/e2e/e2e-stt-flow.mjs` | speechstart → error no-speech → end：「有收到聲音」（語音紀錄優先） |
| TC-59-05 | AC-59-05、E-162 | 自動化 E2E | `tests/e2e/e2e-stt-flow.mjs` | (a) no-speech → end、(b) 無錯誤 end、(c) soundstart → end：「未偵測到語音，請再試一次」 |
| TC-59-05i | AC-59-05（v0.21：含即時文字）、AC-62-06 (d)、Q-107 A | 自動化 E2E | `tests/e2e/e2e-interim.mjs` | （第 12 輪，AC-59-05 v0.21）(a) no-speech、(b) 無錯誤 end、(c) soundstart → end：無即時文字 →「未偵測到語音…」；有即時 adr → (a)「有收到聲音…」（Q-107 A）、(b)(c) 以即時文字評分 |
| TC-59-06 | AC-59-06、MS-6 | 自動化 E2E | `tests/e2e/e2e-stt-flow.mjs` | 已 speechstart：非空文字評分無分流訊息；再按停止、換卡不提示；not-allowed、network、audio-capture 顯示既有錯誤；下一次按下重新判定 |
| TC-59-07 | AC-59-07、AC-30-04（v0.20 分流提示） | 自動化 E2E | `tests/e2e/e2e-stt-flow.mjs` | 分流訊息不改 localStorage 與匯出備份、不計今日已學、打卡、掌握；再按或換卡清除訊息 |
| TC-59-08h | AC-59-08、E-162、E-163 | 人工 | `§6` | （人工）V-MIC 真人語音：Chrome、Edge；(a) 聆聽中不說話等結束，預期「未偵測到語音」；(b) 念不清楚或非英文，記錄實際訊息 |
| TC-60-01 | AC-60-01、AC-60-02、AC-08-06～AC-08-08（v0.20） | 自動化 E2E | `tests/e2e/e2e-stt-flow.mjs` | latency／address／sitting ← Latency.／adress／kitten：綠／黃／紅；「辨識文字」值逐字為原文、lang=en、無子元素；紅燈另有「目標文字」；標題與說明不變 |
| TC-60-01o | AC-60-01（順序：分數與燈號 → 提示 → 文字列 → 說明） | 自動化 E2E | `tests/e2e/e2e-stt-flow.mjs` | 分數區順序：標題 → 分數與燈號 → 提示（黃燈）→ 文字列 → 說明（DOM 與畫面 y 座標） |
| TC-60-03 | AC-60-03、E-165、RT-4 | 自動化 E2E | `tests/e2e/e2e-stt-flow.mjs` | 英文、中文、數字、單字的辨識文字：分數區除引擎文字外不含「偵測到」「語言」「英文」「中文」「你說的是」；說明逐字不變 |
| TC-60-04 | AC-60-04 | 自動化 E2E | `tests/e2e/e2e-stt-flow.mjs` | US-59 五種無文字情況：分數區隱藏、無「辨識文字」標籤、只有分流訊息 |
| TC-60-05 | AC-60-05、E-164、RT-3 | 自動化 E2E | `tests/e2e/e2e-stt-flow.mjs` | 自訂單字使三種燈號出現，辨識文字含 <img onerror>、&lt;b&gt;：字面顯示、列內無子元素、無 alert、無對外請求；speech-panel.js 無 HTML 寫入 API |
| TC-60-06-1366 | AC-60-06、E-164（1366px） | 自動化 E2E | `tests/e2e/e2e-stt-flow.mjs` | （1366px 一般設定）375／768／1366（一般與減少動態 375）× comply with、20 字長句、60 字元無空白 × 三種燈號：無水平捲軸、不溢出；TTS、麥克風、收音條座標不變；scrollbar-gutter 為 stable；翻面、上一張、下一張可捲到不被導覽遮住；對比 ≥ 4.5；減少動態無動畫 |
| TC-60-06-375 | AC-60-06、E-164（375px） | 自動化 E2E | `tests/e2e/e2e-stt-flow.mjs` | （375px 一般設定）375／768／1366（一般與減少動態 375）× comply with、20 字長句、60 字元無空白 × 三種燈號：無水平捲軸、不溢出；TTS、麥克風、收音條座標不變；翻面、上一張、下一張可捲到不被導覽遮住；對比 ≥ 4.5；減少動態無動畫 |
| TC-60-06-768 | AC-60-06、E-164（768px） | 自動化 E2E | `tests/e2e/e2e-stt-flow.mjs` | （768px 一般設定）375／768／1366（一般與減少動態 375）× comply with、20 字長句、60 字元無空白 × 三種燈號：無水平捲軸、不溢出；TTS、麥克風、收音條座標不變；翻面、上一張、下一張可捲到不被導覽遮住；對比 ≥ 4.5；減少動態無動畫 |
| TC-60-06m-375 | AC-60-06 (b)、E-164（375px） | 自動化 E2E | `tests/e2e/e2e-stt-flow.mjs` | （375px 減少動態）375／768／1366（一般與減少動態 375）× comply with、20 字長句、60 字元無空白 × 三種燈號：無水平捲軸、不溢出；TTS、麥克風、收音條座標不變；翻面、上一張、下一張可捲到不被導覽遮住；對比 ≥ 4.5；減少動態無動畫 |
| TC-60-07 | AC-60-07、AC-21-03、AC-24-02 | 自動化 E2E | `tests/e2e/e2e-stt-flow.mjs` | 評分後換卡、回上一張不殘留；切換模式、離開頁面再回來時同一張卡保留（同 1.3.0）、換卡清除；再按麥克風清除；辨識文字不入 localStorage 與備份；計分仍計入今日已學 |
| TC-61-01-375 | AC-61-01（375×667，Tab 與 Shift+Tab，4 個功能區）、E-166 | 自動化 E2E | `tests/e2e/diag-r10-focus.mjs` | 375×667（mobile）4 個功能區（主控台收合／展開）Tab 與 Shift+Tab 繞回：每個停點完整位於導覽列上方與視窗內（高於可用高度時上緣與 ≥ 44 px 可見） |
| TC-61-01-390 | AC-61-01（390×844，Tab 與 Shift+Tab，4 個功能區）、E-166 | 自動化 E2E | `tests/e2e/diag-r10-focus.mjs` | 390×844（mobile）同 TC-61-01-375 |
| TC-61-01m-375 | AC-61-01 必測 7 項（375×667） | 自動化 E2E | `tests/e2e/diag-r10-focus.mjs` | AC-61-01 必測 7 項（資料備份、金色級列、新增單字、翻面、下一張、選項 C、D）Tab 與 Shift+Tab 皆 100% 未被遮住（375×667） |
| TC-61-01m-390 | AC-61-01 必測 7 項（390×844） | 自動化 E2E | `tests/e2e/diag-r10-focus.mjs` | 同 TC-61-01m-375（390×844） |
| TC-61-02a | AC-61-02（> 640px 版面與捲動不變：1366×768 與 1.3.0 逐停點比對） | 自動化 E2E | `tests/e2e/diag-r10-focus.mjs` | 1366×768 4 個功能區 Tab＋Shift+Tab 每個停點名稱、scrollY、元素上緣與 1.3.0 完全相同；scroll-padding-bottom 為 auto |
| TC-61-02b | AC-61-02（點擊與觸控不額外捲動、減少動態捲動無動畫） | 自動化 E2E | `tests/e2e/diag-r10-focus.mjs` | 375（一般、減少動態）與 1366：觸控與滑鼠點擊部分被導覽遮住的控制項，scrollY 不變；scroll-behavior auto；（第 12 輪）375px 模擬測驗改比捲動量（R-31 標題說明變 1 行使起始 scrollY 不同） |
| TC-61-02c | AC-61-02（AC-41-04、AC-57-01 照常）、AC-38-09（首次「開始學習」焦點框） | 自動化 E2E | `tests/e2e/diag-r10-focus.mjs` | 首次畫面 375×667 Tab／Shift+Tab：頁尾 4 連結完整位於首次底部列上方；「開始學習」焦點框 ≥ 2 px；5 個色級列可捲到不被底部列遮住 |
| TC-61-02d | AC-61-02（AC-27-03 正在輸入的欄位不被遮，自動化部分） | 自動化 E2E | `tests/e2e/diag-r10-focus.mjs` | 375、390 輸入自訂單字：scroll-padding-bottom 64px，輸入時 is-typing 為 0，輸入欄不被導覽遮住 |
| TC-62-01 | AC-62-01、AC-33-03、V-STT-11、V-STT-15、IT-3、IT-6 | 自動化 E2E | `tests/e2e/e2e-interim.mjs` | （第 12 輪）聆聽中依序 emitInterim la、late、latency、(" comply ","with")、Hello, World?：每次 ≤ 100 ms、同步顯示；.sp-live 恰 1 列、標籤「聽到：」、值逐字（多段以 1 個空白串接、不清洗標點與大小寫）、lang=en；按鈕「聆聽中」、收音條亮；無分數區與訊息；start() 當下 interimResults=true |
| TC-62-01b | AC-62-01（空白暫時結果不顯示；保留上一段，FB-80、IT-3）、E-169 | 自動化 E2E | `tests/e2e/e2e-interim.mjs` | （第 12 輪）聆聽中只收到空字串／空白 → 不顯示即時列；顯示 adr 後再收到空白 → 保留 adr（IT-3、FB-80） |
| TC-62-01f | AC-62-01、IT-6、IT-7（翻面重建面板：聆聽中還原即時文字，architecture §7.30.4 build()） | 自動化 E2E | `tests/e2e/e2e-interim.mjs` | （第 12 輪）聆聽中顯示 adr 時按「翻面」再翻回：仍聆聽中則即時列還原為 adr、恰 1 列；已結束則隱藏 |
| TC-62-02a | AC-62-02 (a)、AC-58-07（v0.21 暫時結果）、AC-33-03、IT-5、PR-5 (b) | 自動化 E2E | `tests/e2e/e2e-interim.mjs` | （第 12 輪）支援 audiostart：準備中（awaitingAudioStart）收到 ad → ≤ 100 ms 聆聽中並顯示 ad；超過 T_READY 無「沒有回應」、不評分；收音條亮；之後 audiostart 畫面不變（AC-58-07 v0.21） |
| TC-62-02b | AC-62-02 (b)、AC-58-07（v0.21 暫時結果）、AC-33-03、IT-5、PR-5 (b)、AC-58-09 | 自動化 E2E | `tests/e2e/e2e-interim.mjs` | （第 12 輪）不支援 audiostart：準備中（fallbackWait）收到 ad → ≤ 100 ms 聆聽中並顯示 ad；超過 T_FALLBACK、T_READY 仍聆聽中、無訊息、不評分 |
| TC-62-03a | AC-62-03 (a)、AC-60-01、V-STT-12 | 自動化 E2E | `tests/e2e/e2e-interim.mjs` | （第 12 輪）即時 adress 顯示中收到最終 address → ≤ 100 ms 100 綠燈、辨識文字 address；同一同步工作內即時列隱藏、分數區出現；rAF 逐畫格取樣同時可見 0 |
| TC-62-03b | AC-62-03 (b)、AC-08-04、V-STT-17 | 自動化 E2E | `tests/e2e/e2e-interim.mjs` | （第 12 輪）無暫時結果直接最終 adress → 86 黃燈；MutationObserver 全程即時列可見 0 次 |
| TC-62-04 | AC-62-04、AC-59-03、V-STT-06（hadResult 但 hadText 假） | 自動化 E2E | `tests/e2e/e2e-interim.mjs` | （第 12 輪）即時 ad 顯示中收到最終 ""、"..." → ≤ 100 ms 隱藏、「有收到聲音…」、無分數區、今日已學不變 |
| TC-62-05 | AC-62-05、AC-08-04、AC-30-01、AC-17-02、MS-1 (2b)、IT-9、V-STT-14、LR-1 | 自動化 E2E | `tests/e2e/e2e-interim.mjs` | （第 12 輪）adr、adress 後 end → ≤ 100 ms 86 黃燈、辨識文字 adress；與另一頁直接最終 adress 對照：分數區 outerHTML、lastResult、localStorage data 12 欄（去自訂單字隨機 id）、主控台文字逐一相同；今日已學 +1；rAF 取樣同時可見 0 |
| TC-62-05b | AC-62-05（最後一段即時文字清洗後為空 → AC-59-03）、V-STT-06 | 自動化 E2E | `tests/e2e/e2e-interim.mjs` | （第 12 輪）最後一段即時文字為 "..." 時 end → 「有收到聲音…」、不評分、今日已學不變 |
| TC-62-06 | AC-62-06 (a)～(f)、AC-08-10（v0.21 再按）、AC-58-10、AC-60-07、AC-08-09、AC-08-14、AC-33-05、AC-33-06 (b)、AC-59-02、IT-7、E-171 | 自動化 E2E | `tests/e2e/e2e-interim.mjs` | （第 12 輪）即時 adr 顯示中：(a) 再按、(b) 換卡／切換測驗模式／TTS／離開單字卡頁、(c) network／not-allowed／audio-capture／其他代碼、(d) no-speech、(e) nomatch、(f) 拔除 → 每項 ≤ 100 ms 隱藏（同步）、訊息依 MS-1（(d)(e) 為「有收到聲音…」）；舊實例遲到的 interim／result／end 不重新顯示、不評分；今日已學不變 |
| TC-62-07a | AC-62-07（DOM 屬性部分）、V-STT-16 | 自動化 E2E | `tests/e2e/e2e-interim.mjs` | （第 12 輪）.sp-live aria-live=off、無 role；自 .sp-live 到 html 的 11 層祖先無 aria-live polite／assertive、無 role status／alert／log；訊息區與分數區不是祖先 |
| TC-62-07h | AC-62-07（螢幕報讀器部分；§10.14 Q18） | 人工 | `§6` | （人工）NVDA＋Chrome：即時文字更新不播報；評分後由分數區、訊息由訊息區播報 |
| TC-62-08 | AC-62-08、AC-60-05、C-7、RT-3、規格書 2.6、Q-22 | 自動化 E2E | `tests/e2e/e2e-interim.mjs` | （第 12 輪）emitInterim <img src=x onerror=alert(1)>、&lt;b&gt;、<script>…<b>：textContent 逐字、.sp-live 子元素 2、值子元素 0、無 img／script／b；對話框 0、非本機請求 0；speech-panel.js 無 HTML 寫入 API |
| TC-62-09-1366 | AC-62-09 (a)、AC-20-01、AC-38-04、AC-27-03（1366px） | 自動化 E2E | `tests/e2e/e2e-interim.mjs` | （第 12 輪）1366px 一般設定：comply with、20 字長句、60 字元無空白；TTS／麥克風／收音條座標在待機、聆聽、出現、更新、隱藏 5 個時點相同；全文、無水平捲軸、不裁切；值 italic、標籤與值 rgb(91, 100, 114) 與辨識文字值不同、對比 ≥ 4.5；無 animation／transition；翻面、上一張、下一張可見 |
| TC-62-09-375 | AC-62-09 (a)、AC-20-01、AC-38-04、AC-27-03（375px） | 自動化 E2E | `tests/e2e/e2e-interim.mjs` | （第 12 輪）375px 一般設定：comply with、20 字長句、60 字元無空白；TTS／麥克風／收音條座標在待機、聆聽、出現、更新、隱藏 5 個時點相同；全文、無水平捲軸、不裁切；值 italic、標籤與值 rgb(91, 100, 114) 與辨識文字值不同、對比 ≥ 4.5；無 animation／transition；翻面、上一張、下一張可見 |
| TC-62-09-768 | AC-62-09 (a)、AC-20-01、AC-38-04、AC-27-03（768px） | 自動化 E2E | `tests/e2e/e2e-interim.mjs` | （第 12 輪）768px 一般設定：comply with、20 字長句、60 字元無空白；TTS／麥克風／收音條座標在待機、聆聽、出現、更新、隱藏 5 個時點相同；全文、無水平捲軸、不裁切；值 italic、標籤與值 rgb(91, 100, 114) 與辨識文字值不同、對比 ≥ 4.5；無 animation／transition；翻面、上一張、下一張可見 |
| TC-62-09m-1366 | AC-62-09 (b)、AC-20-01、AC-38-04、AC-27-03（1366px） | 自動化 E2E | `tests/e2e/e2e-interim.mjs` | （第 12 輪）1366px 減少動態：同 TC-62-09-1366 |
| TC-62-09m-375 | AC-62-09 (b)、AC-20-01、AC-38-04、AC-27-03（375px） | 自動化 E2E | `tests/e2e/e2e-interim.mjs` | （第 12 輪）375px 減少動態：同 TC-62-09-375 |
| TC-62-09m-768 | AC-62-09 (b)、AC-20-01、AC-38-04、AC-27-03（768px） | 自動化 E2E | `tests/e2e/e2e-interim.mjs` | （第 12 輪）768px 減少動態：同 TC-62-09-768 |
| TC-62-10 | AC-62-10、AC-21-03、AC-53-06、AC-08-13、V-STT-17、IT-8、Q-106 A | 自動化 E2E | `tests/e2e/e2e-interim.mjs` | （第 12 輪，file://）以 AC-62-03 (a)、AC-62-05、AC-62-06 (a) 結束後：即時文字命中 localStorage、sessionStorage、AppState.data、IndexedDB、Cache Storage、匯出備份皆 0；鍵、schemaVersion 3、data 12 欄、備份頂層 5 欄不變；非本機請求 0；重新載入待機、即時列隱藏；交付檔 MediaRecorder 0；AC-08-13 說明與隱私權政策 (5) 與 HEAD 交付檔逐字相同 |
| TC-62-10b | AC-62-10（部署目錄、Service Worker 與 Cache Storage）、AC-37-05 | 自動化 E2E | `tests/e2e/e2e-interim.mjs` | （第 12 輪，Playwright 本機 8080 部署目錄）Service Worker 啟用並控制頁面、預先快取 7 筆；3 種結束後 Cache Storage、localStorage、IndexedDB 即時文字命中 0；期間請求 0、跨來源 0；重新載入待機、即時列隱藏 |
| TC-62-11 | AC-62-11、AC-60-03、V-STT-15、RT-4 | 自動化 E2E | `tests/e2e/e2e-interim.mjs` | （第 12 輪）英文、中文、數字、混合即時文字：列全文 =「聽到：」+ 引擎文字；固定文字無「偵測到」「語言」「英文」「中文」「你說的是」「發音」「分數」 |
| TC-62-12h | AC-62-12、AC-58-14、AC-59-08（architecture v0.17 §10.14 Q17、Q20） | 人工 | `§6` | （人工）AC-62-12 真人語音：Chrome、Edge 各 1 輪＋正式網站 Chrome 1 輪；(a) 念單字 10 次 ≥ 9 次分數；(b) 念句子 3 次即時文字至少更新 1 次；逐次紀錄交人類判定 |
| TC-AD-H1 | AC-50-04、AC-52-01、AC-52-05（T-106） | 人工 | `§6` | loading 與非主控台不露出；只有 1 個版位 |
| TC-AD-H2 | AC-51-01、AC-52-05（T-107、FB-73） | 人工 | `§6` | 與 AD-7、AD-8 相符 |
| TC-AD-H3 | AC-52-03、AC-52-04、AC-52-06 | 人工 | `§6` | 依 AC |
| TC-AD-H4 | AC-50-07、AC-50-08 | 人工 | `§6` | 依 AC；只能證明測試當下未觀察到（Q-88） |
| TC-AD-H5 | AC-50-01、AC-50-05、AC-50-06、AC-51-02、AC-51-03、AC-51-04、AC-52-02、AC-52-07 | 人工 | `§6` | 依 AC |
| TC-B01 | （越界檢查：檔案歸屬） | QA 檢視 | `tests/static/boundary-check.mjs` | 每個檔案是否屬於某任務 paths；人類自放檔（dist/ads.txt、LICENSE、.github/）另列 |
| TC-B02 | （越界檢查：原始需求、sources/、docs/、tests/） | QA 檢視 | `人工判讀（檔案時間、docs 變更紀錄）` | sources/、english_master_track.md 未被修改；docs/ 的修改皆為上游角色或 QA |
| TC-B03 | （越界檢查：第 12 輪增量 FE-98～FE-101、MC-10） | QA 檢視 | `tests/static/boundary-r12.mjs` | （第 5 輪）與 git HEAD 比對的變動檔案皆在 CT-24、FE-54～FE-62 paths 或授權例外內 |
| TC-D01 | AC-03-06 | 自動化（資料檢查） | `tests/data/data-check.mjs` | 「共 N 張」依序為 N_O（1,000，Q-29）、N_B、N_G，與契約文件記錄的字表實際字數一致（功能詞不扣除，Q-30） |
| TC-D02 | AC-03-07 | 自動化（資料檢查） | `tests/data/data-check.mjs` | 不存在兩筆單字字串相同（不分大小寫）的項目 |
| TC-D03 | AC-03-08 | 自動化（資料檢查） | `tests/data/data-check.mjs` | 每筆皆有排名，且排名為 1～N_G 連續不重複的整數；排名 1～N_B 的順序與 NGSL 原表頻率順序一致；排名 N_B+1～N_G 的單字皆來自 TSL、BSL 或 NAWL |
| TC-D04 | AC-03-09 | 自動化（資料檢查） | `tests/data/data-check.mjs` | 兩者完全相同，未排除任何字；功能詞（至少 the、of、a、and、to、in、he、it、can、will）皆存在且各為一張可翻閱的卡片（Q-30） |
| TC-D05 | AC-06-08 | 自動化（資料檢查） | `tests/data/data-check.mjs` | 排名 N_B+1～N_G 的單字學術情境欄全部非空；排名 1～N_B 可為空 |
| TC-D06 | AC-06-01、AC-06-02、AC-06-07 | 自動化（資料檢查） | `tests/data/data-check.mjs` | 資料面：單字、音標、搭配詞等卡片正面欄位齊全（畫面標籤 LT-1「常用搭配詞」由 TC-06-01 驗） |
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
| TC-FB85 | AC-08-10（SD-FB-85：聆聽中停止後遲到的 result 不評分） | 自動化 E2E | `tests/e2e/e2e-stt-flow.mjs` | SD-FB-85：聆聽中按停止後，替身遲到的 result 不評分、不提示（刻意的行為變更） |
| TC-FR-OBS | （觀察，不屬 AC 字面）首次畫面色級列鍵盤焦點 | 自動化 E2E | `tests/e2e/diag-r10-focus.mjs` | （觀察，不屬 AC 字面）首次畫面以 Tab 聚焦色級列時被首次底部列遮住的比例，1.3.0 與 1.3.1 對照 |
| TC-L-S01 | AC-38-07、AC-19-01（VC-8） | 自動化（靜態檢查） | `tests/static/static-check.mjs` | （第 5 輪新增）CSS 無 @font-face、無 url(；系統字型 |
| TC-L-S02 | AC-38-10 (1)、AC-34-01、AC-34-02（V-LAY-05、NM-1、NM-4） | 自動化（靜態檢查） | `tests/static/static-check.mjs` | （第 5 輪新增）<title>EnglishContext</title> 恰 1 次、授權註解第一行 EnglishContext、HTML 文字與程式字串常值與 src/data 無 English Master Track |
| TC-L-S03 | AC-38-10 (2)（NM-5 FROZEN_IDENTIFIERS） | 自動化（靜態檢查） | `tests/static/static-check.mjs` | （第 5 輪新增）不改清單：englishMasterTrack:state／unreadable、english-master-track-backup、匯出檔名前綴、emt-build-id、sw.js 快取前綴、交付檔名 |
| TC-L-S04 | AC-38-05（NM-2） | 自動化（靜態檢查） | `tests/static/static-check.mjs` | （第 5 輪新增）標題列圖示為內嵌 SVG ≤ 1,500 bytes、aria-hidden、無 xmlns／image／text／href、產物無 <img> |
| TC-LAY-H1 | AC-41-03、AC-41-04、E-93 | 人工 | `§6` | （第 5 輪人工）實機首次畫面固定底部列與安全區 |
| TC-LAY-H2 | AC-38-05 | 人工 | `§6` | （第 5 輪人工）標題列圖示清晰度 |
| TC-LAY-H3 | AC-38-02、AC-34-04 | 人工 | `§6` | （第 5 輪人工）實機狀態列顏色 #1e9bf0 |
| TC-LGL-S01 | AC-06-01、AC-10-02、AC-23-02、AC-23-06、AC-23-07、AC-23-08（V-LGL-01～04、交付檔字串） | 自動化（靜態檢查） | `tests/static/legal-check.mjs` | 交付 HTML：舊文字 0 次；LT-1、LT-2、LT-3、LT-5、LT-6 至少 1 次；聯絡行 1 次；mailto 0、無空格位址 0 |
| TC-LGL-S02 | AC-10-02、AC-48-12（V-LGL-02、E-123、HN-1、E-134） | 自動化（靜態檢查） | `tests/static/legal-check.mjs` | .p5-heading-note、.p5-record__hint 無 nowrap、text-overflow、overflow: hidden 等禁用規則 |
| TC-LGL-S03 | AC-10-02、AC-54-01、AC-56-03、AC-56-05、AC-56-06、AC-56-07、AC-57-03、AC-23-08（V-LGL-02 v0.21：交付物「TOEIC®（多益）Part 5」0 次） | 自動化（靜態檢查） | `tests/static/legal-check.mjs` | （第 12 輪，V-LGL-02 v0.21）dist/ 下 5 個 HTML 與 sw.js 全文「TOEIC®（多益）Part 5」0 次；主 HTML、index、about LT-2 新文字 ≥ 1、LT-3 ≥ 1 |
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
| TC-PS-01 | AC-36-07、AC-19-01（V-PWA-01） | 自動化（靜態與建置檢查） | `tests/static/pwa-static.mjs` | （v0.19）dist/site 恰 13 檔；index.html 與交付檔相同；ads.txt 與來源相同 |
| TC-PS-02 | AC-34-01（V-PWA-02） | 自動化（靜態與建置檢查） | `tests/static/pwa-static.mjs` | （v0.11）manifest：UTF-8 無 BOM、合法 JSON、10 鍵且順序同契約、相對路徑、name／short_name EnglishContext、不含 BUILD_ID（V-PWA-02） |
| TC-PS-03 | AC-34-01、AC-34-03、AC-34-05（V-PWA-03） | 自動化（靜態與建置檢查） | `tests/static/pwa-static.mjs` | （v0.11）4 張 PNG：尺寸、色彩類型 2、位元深度 8、無 tRNS（V-PWA-03） |
| TC-PS-04 | AC-34-04、AC-34-05、AC-36-02、AC-37-01、AC-19-01（V-PWA-04） | 自動化（靜態與建置檢查） | `tests/static/pwa-static.mjs` | （v0.19）HD-1 元素、<link> 恰 2 個（icon、canonical）、title 新值 |
| TC-PS-05 | AC-36-02、AC-37-05、AC-35-01（V-PWA-05） | 自動化（靜態與建置檢查） | `tests/static/pwa-static.mjs` | （v0.11）sw.js：BUILD_ID 同 HTML、CACHE_NAME 前綴、預先快取 7 項、禁用字串 0、只有 install／activate／fetch／message 4 種監聽（V-PWA-05） |
| TC-PS-06 | AC-19-01（附屬檔參照） | 自動化（靜態與建置檢查） | `tests/static/pwa-static.mjs` | （v0.19）HTML 對附屬檔只有同目錄相對路徑；排除逐字 canonical 與 <noscript> 一般連結後，src/href 絕對網址 0 |
| TC-PWA-H1 | AC-34-01、AC-34-02、AC-34-03、AC-34-06、AC-34-07、AC-34-09、AC-34-10 | 人工 | `§6` | （v0.11 人工）Windows Chrome／Edge 正式網址：原生與畫面內安裝、名稱、獨立視窗、Manifest 面板、maskable 預覽、解除安裝、Firefox |
| TC-PWA-H2 | AC-34-02、AC-34-03、AC-35-03、AC-38-02 | 人工 | `§6` | （v0.11 人工）Android Chrome：安裝、圓形遮罩、啟動畫面、飛航模式啟動 |
| TC-PWA-H3 | AC-34-05、AC-34-08 | 人工 | `§6` | （v0.11 人工）iOS Safari：加入主畫面名稱、圖示、獨立啟動、無安裝按鈕 |
| TC-PWA-H4 | AC-36-07（GitHub Pages 部署結果） | 人工 | `§6` | （v0.11 人工）MC-03 修改 static.yml 後 push：Actions 成功、正式網址 8 檔 200 且內容相同、不含 docs／src／sources |
| TC-PWA-H5 | AC-36-03（正式網址、已安裝 App、背景 ≥ 1 小時）、AC-36-05（正式網址同網域快取） | 人工 | `§6` | （v0.11 人工）正式網址已安裝 App 重新部署後 60 秒內提示並更新；背景 ≥ 1 小時切回前景觸發檢查 |
| TC-R10-C1 | 共通規則 1（1.3.0 的 localStorage 以 1.3.1 開啟）、AC-58-12、AC-47-04 | 自動化 E2E | `tests/e2e/e2e-compat-r10.mjs` | 1.3.0（a358556）學習後的 localStorage 以 1.3.1 開啟、切頁、重新載入：setItem 0 次、逐位元組不變 |
| TC-R10-C2 | 共通規則 1（1.3.0 匯出備份以 1.3.1 匯入）、AC-24-02、AC-24-03 | 自動化 E2E | `tests/e2e/e2e-compat-r10.mjs` | 1.3.0 匯出的備份以 1.3.1「從備份還原」匯入：data 逐欄相同；重新載入 localStorage 不變 |
| TC-R10-C3 | §10.12 M-4（備份格式不變：頂層 5 欄、data 欄位）、AC-60-07 | 自動化 E2E | `tests/e2e/e2e-compat-r10.mjs` | 1.3.1 匯出備份頂層 5 欄、format、schemaVersion、data 欄位與 1.3.0 相同；無執行期欄位 |
| TC-R11-1366b | AC-52-05、AC-39（v0.16 §7.29.5 回歸：頁面變可捲動時內容不左右移動） | 自動化 E2E | `tests/e2e/diag-r11-gutter.mjs` | 1366×768、1366×900、1920×1080 主控台展開「資料備份」前後 header、各區塊、頁尾 dx = 0（頁面由不可捲動變可捲動時不左右移動） |
| TC-R12-375 | AC-20-01、AC-40-02、AC-10-02（375／390 版面與 1.3.1 相比：只因 R-31 標題說明行數改變） | 自動化 E2E | `tests/e2e/diag-r12-375.mjs` | （第 12 輪）375×667、390×844（Chrome、Edge）與 1.3.1（HEAD 2cb2ca2）比較：主控台、單字卡座標逐一相同；模擬測驗只因 R-31 標題說明 2 行 → 1 行，說明以下元素一律上移同一量，水平與寬高不變；無水平捲軸 |
| TC-S01 | AC-19-01 | 自動化（靜態檢查） | `tests/static/static-check.mjs` | （v0.19）無外部資源；白名單 icon data:、逐字 canonical 各 1 次 |
| TC-S02 | AC-19-04 | 自動化（靜態檢查） | `tests/static/static-check.mjs` | ≤ 5 MB（5,242,880 bytes） |
| TC-S03 | AC-04-09 | 自動化（靜態檢查） | `tests/static/static-check.mjs` | 皆以 textContent 或等效的純文字方式寫入 DOM；不使用 innerHTML、outerHTML、insertAdjacentHTML、document.write 插… |
| TC-S04 | AC-21-02 | 自動化（靜態檢查） | `tests/static/static-check.mjs` | 無任何付費服務金鑰或第三方語音 SDK |
| TC-S05 | AC-21-03（程式面） | 自動化（靜態檢查） | `tests/static/static-check.mjs` | （第 3 輪改）MediaRecorder 0；getUserMedia 只在 mic.js；mic.js 無輸出、傳送、儲存字串；speech-panel 不把音量傳給 store |
| TC-S06 | AC-23-06、AC-38-10（V-LGL-04） | 自動化（靜態檢查） | `tests/static/static-check.mjs` | （v0.17，V-LGL-04）開頭註解第一行 EnglishContext；含 MIT 全文、「單字資料以 CC BY-SA 4.0 授權」、LT-3、LT-4、條款網址；不含「原創內容著作權人 JimmyLin」「保留所有權利」與 LT-5 |
| TC-S07 | AC-04-04、AC-24-07（產物） | 自動化（靜態檢查） | `tests/static/static-check.mjs` | 內容以原文字元顯示，不出現圖片元素、不執行任何腳本 |
| TC-S08 | AC-19-01（D-1 不打包） | 自動化（靜態檢查） | `tests/static/static-check.mjs` | 只有 1 個 .html 檔；所有 CSS 以 <style> 內嵌；檔案中無指向外部的 <script src>、<link href>、@import、外部字型或圖片網址，不含… |
| TC-S09 | AC-19-01（交付物可追溯） | 自動化（靜態檢查） | `tests/static/static-check.mjs` | 只有 1 個 .html 檔；所有 CSS 以 <style> 內嵌；檔案中無指向外部的 <script src>、<link href>、@import、外部字型或圖片網址，不含… |
| TC-S10 | AC-31-04 | 自動化（靜態檢查） | `tests/static/static-check.mjs` | （第 3 輪新增）無外部動畫／圖表／手勢函式庫，@keyframes 與 SVG 皆內嵌、原生 API 建立 |
| TC-S11 | AC-26-05、AC-01-01（程式面） | 自動化（靜態檢查） | `tests/static/static-check.mjs` | （第 5 輪新增）產物程式與 CSS 規則（去除註解）不含 cz-color__range（取代以原始字串搜尋的舊規則） |
| TC-SITE-H1 | AC-53-02、AC-54-01、AC-56-03、AC-56-08、AC-56-09、AC-57-05、AC-57-06 | 人工 | `§6` | 皆依 AC |
| TC-T-S01 | AC-47-08、AC-45-04、AC-45-05、AC-46-01、AC-46-06、AC-48-12（WR-4、CR-9、C-7、V-ST-27） | 自動化（靜態檢查） | `tests/static/static-check.mjs` | （v0.18）新模組無網路／DOM／儲存 API、無 HTML 插入；畫面文字逐字存在（含 4 段新文字）；V-ST-27 舊字串交付檔與 src/app 皆 0；新 CSS 無強調橘、色碼、動畫；≤ 5 MB |
| TC-TRK-H1 | AC-47-04、AC-36-03、AC-44-01、AC-45-05、E-114 | 人工 | `§6` | 實機：已安裝舊版 PWA 更新到 1.2.0（提示「有新版本，請更新版本」，按「更新版本」）後既有進度與已答對紀錄未遺失；曾答對題改為鎖定檢視 |
| TC-TRK-H2 | AC-46-01、AC-45-04、AC-38-09、AC-48-01、AC-48-11 | 人工 | `§6` | 實機：TalkBack／VoiceOver 下開關可聚焦、讀出狀態與切換；已答對鎖定檢視（回饋、選項不可用）與清除按鈕可被朗讀 |
| TC-V-S01 | AC-42-03、AC-42-02（VR-5、V-VER-05） | 自動化（靜態檢查） | `tests/static/static-check.mjs` | src/app 非測試 .js 不含 package.json、版本模組無 fetch／XMLHttpRequest／import(／儲存 API、不寫死版本字串 |
| TC-V-S02 | AC-42-02（V-VER-01、VR-2、HD-1） | 自動化（靜態檢查） | `tests/static/static-check.mjs` | 產物 emt-app-version 恰 1 個＝package.json、位於 emt-build-id 之後；無 @@ 佔位殘留；模板 @@APP_VERSION@@ 恰 1 次 |
| TC-V-S03 | AC-43-02、AC-39-04、AC-42-01（HT-7、V-LAY-10、VR-7） | 自動化（靜態檢查） | `tests/static/static-check.mjs` | 原始碼含「範本」的字串常值只在 hidden＋inert 容器（與不顯示的內部驗證原因）；.db-change、.app-footer__version 不用強調橘或灰框線、無底線、nowrap |
| TC-VER-H1 | AC-42-01、AC-27-03、AC-41-04、E-95 | 人工 | `§6` | 實機（Android、iPhone、已安裝 App）版本行不被底部導覽列／固定底部列遮住 |
| TC-VER-H2 | AC-42-02、AC-36-07 | 人工 | `§6` | 部署後正式網址的 meta、頁尾建置碼與 sw.js 一致 |
| TC-VER-H3 | AC-42-04 (b)、AC-36-03、E-97、E-131 | 人工 | `§6` | 下次發布只改 version 時已安裝 App 出現「有新版本，請更新版本」並顯示新版本號；舊版未更新前仍可重答（E-131，屬預期） |
| TC-X-ad-a | Console 無本系統錯誤（filled 案例） | 自動化 E2E | `tests/e2e/e2e-ad.mjs` | 【替身驗證】錯誤 [] |
| TC-X-answered-a | Console 無未處理錯誤、無網路請求 | 自動化 E2E | `tests/e2e/e2e-answered.mjs` | 錯誤 []；非 file 請求 0 |
| TC-X-answered-b | Console 無未處理錯誤、無網路請求（v1.2.0 → 1.3.0） | 自動化 E2E | `tests/e2e/e2e-answered.mjs` | 錯誤 []；非 file 請求 0 |
| TC-X-cards | （全套件）無未處理例外 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | 例外：[] |
| TC-X-clock | （時鐘套件）無未處理例外 | 自動化 E2E | `tests/e2e/e2e-progress.mjs` | [] |
| TC-X-content | （全套件）無未處理例外 | 自動化 E2E | `tests/e2e/e2e-content.mjs` | [] |
| TC-X-edge | AC-19-02（Chrome／Edge）跨瀏覽器冒煙、AC-34-01、AC-35-01、AC-35-02、AC-37-01、AC-42-01、AC-43-01、AC-44-01、AC-45-01、AC-46-01、AC-48-01、AC-49-01、AC-50-02、AC-53-01、AC-57-01 | QA 檢視 | `e2e-goal、e2e-hidden、e2e-pwa、e2e-version、e2e-track-p5、e2e-lock、e2e-answered、e2e-site、e2e-ad、e2e-ad-extra、e2e-speech、e2e-mic、e2e-stt-flow、e2e-interim（QA_BROWSER=edge）；e2e-stt-flow 第 8 段、diag-r11-gutter 本身含 Edge` | 以 Microsoft Edge 重跑 e2e-goal 與 e2e-hidden |
| TC-X-firstrun | （全套件）無未處理例外 | 自動化 E2E | `tests/e2e/e2e-firstrun.mjs` | 例外 []；console.error [] |
| TC-X-fixture | （fixture）無未處理例外 | 自動化 E2E | `tests/e2e/e2e-cards.mjs` | [] |
| TC-X-goal | （全套件）無未處理例外 | 自動化 E2E | `tests/e2e/e2e-goal.mjs` | 例外：[]；console.error：[] |
| TC-X-hidden | （全套件）無未處理例外 | 自動化 E2E | `tests/e2e/e2e-hidden.mjs` | [] |
| TC-X-interim | （全套件）無未處理例外 | 自動化 E2E | `tests/e2e/e2e-interim.mjs` | e2e-interim 全套件無未處理例外、無 console.error |
| TC-X-layout | （全套件）無未處理例外 | 自動化 E2E | `tests/e2e/e2e-layout.mjs` | 例外 []；console.error [] |
| TC-X-legal-1366 | Console 無未處理錯誤、無網路請求 | 自動化 E2E | `tests/e2e/e2e-legal.mjs` | 錯誤 []；非 file 請求 0 |
| TC-X-legal-375 | Console 無未處理錯誤、無網路請求 | 自動化 E2E | `tests/e2e/e2e-legal.mjs` | 錯誤 []；非 file 請求 0 |
| TC-X-legal-screen | Console 無未處理錯誤、無網路請求 | 自動化 E2E | `tests/e2e/e2e-legal.mjs` | 錯誤 []；非 file 請求 0 |
| TC-X-lock-1366 | Console 無未處理錯誤、無網路請求 | 自動化 E2E | `tests/e2e/e2e-lock.mjs` | 錯誤 []；非 file 請求 0 |
| TC-X-lock-1366b | Console 無未處理錯誤、無網路請求 | 自動化 E2E | `tests/e2e/e2e-lock.mjs` | 錯誤 []；非 file 請求 0 |
| TC-X-lock-375 | Console 無未處理錯誤、無網路請求 | 自動化 E2E | `tests/e2e/e2e-lock.mjs` | 錯誤 []；非 file 請求 0 |
| TC-X-lock-375b | Console 無未處理錯誤、無網路請求 | 自動化 E2E | `tests/e2e/e2e-lock.mjs` | 錯誤 []；非 file 請求 0 |
| TC-X-lock-flow | Console 無未處理錯誤、無網路請求 | 自動化 E2E | `tests/e2e/e2e-lock.mjs` | 錯誤 []；非 file 請求 0 |
| TC-X-lock-v110 | Console 無未處理錯誤、無網路請求（v1.1.0 → 1.2.0） | 自動化 E2E | `tests/e2e/e2e-lock.mjs` | 錯誤 []；非 file 請求 0 |
| TC-X-mic | （全套件）無未處理例外 | 自動化 E2E | `tests/e2e/e2e-mic.mjs` | 例外：[] |
| TC-X-motion | （全套件）無未處理例外 | 自動化 E2E | `tests/e2e/e2e-motion.mjs` | 例外 [] |
| TC-X-noas | AC-58-09、AC-08-01、AC-33-01、AC-33-03、AC-33-07、AC-33-08（不支援 audiostart 替身下的回歸） | QA 檢視 | `tests/tools/run-r12.mjs（:noas 變體）` | 不支援 audiostart 替身（QA_STT_AUDIOSTART=0）重跑 e2e-speech、e2e-mic、e2e-env、e2e-progress、e2e-reinit、e2e-motion，失敗 0（效能 TC 依 §2.3） |
| TC-X-p5-1366 | Console 無未處理錯誤、無網路請求 | 自動化 E2E | `tests/e2e/e2e-track-p5.mjs` | 錯誤 []；非 file 請求 0 |
| TC-X-p5-375 | Console 無未處理錯誤、無網路請求 | 自動化 E2E | `tests/e2e/e2e-track-p5.mjs` | 錯誤 []；非 file 請求 0 |
| TC-X-p5-us45 | Console 無未處理錯誤、無網路請求（AC-47-08 (a)） | 自動化 E2E | `tests/e2e/e2e-track-p5.mjs` | 錯誤 []；非 file 請求 0 |
| TC-X-p5-us46 | Console 無未處理錯誤、無網路請求（AC-47-08 (a)：作答、開關、清除答對紀錄、匯出、匯入） | 自動化 E2E | `tests/e2e/e2e-track-p5.mjs` | 錯誤 []；非 file 請求 0 |
| TC-X-progress | （全套件）無未處理例外 | 自動化 E2E | `tests/e2e/e2e-progress.mjs` | [] |
| TC-X-reinit | （全套件）無未處理例外 | 自動化 E2E | `tests/e2e/e2e-reinit.mjs` | 例外 []；console.error [] |
| TC-X-site-a | Console 無未處理錯誤、無網路請求（file://） | 自動化 E2E | `tests/e2e/e2e-site.mjs` | 錯誤 []；非 file 請求 0 |
| TC-X-site-b | Console 無未處理錯誤、無網路請求（首次） | 自動化 E2E | `tests/e2e/e2e-site.mjs` | 錯誤 []；非 file 請求 0 |
| TC-X-speech | （全套件）無未處理例外 | 自動化 E2E | `tests/e2e/e2e-speech.mjs` | [] |
| TC-X-sttflow | （全套件）無未處理例外 | 自動化 E2E | `tests/e2e/e2e-stt-flow.mjs` | （全套件）e2e-stt-flow 無未處理例外 |
| TC-X-track-1366 | Console 無未處理錯誤、無網路請求（AC-47-08 (a)） | 自動化 E2E | `tests/e2e/e2e-track.mjs` | 例外／錯誤 []；非 file 請求 0 |
| TC-X-track-375 | Console 無未處理錯誤、無網路請求（AC-47-08 (a)） | 自動化 E2E | `tests/e2e/e2e-track.mjs` | 例外／錯誤 []；非 file 請求 0 |
| TC-X-track-backup | Console 無未處理錯誤、無網路請求（AC-47-08 (a)：匯出、匯入） | 自動化 E2E | `tests/e2e/e2e-track.mjs` | 未處理例外 0；非 file 請求 0 |

### 5.1 第 13 輪新增 TC（PRD v0.24 R-32）

第 13 輪為一般驗收，以下為本輪新增的 58 個 TC（自動化 E2E 52（其中參考值不判定 2）、QA 檢視 1、人工 4、例外檢查 1）；修改的既有 TC 見 §4.10，結果見 test-report §24。本節之外的 §5 全表為第 12 輪產生，全套重新產生留待發版驗收（`/qa-verify release`）。

| TC | 對應 AC | 方式 | 腳本 | 驗證重點 |
| :--- | :--- | :--- | :--- | :--- |
| TC-63-01 | AC-63-01、AC-20-03、AC-27-05、AC-56-04 | 自動化 E2E | `e2e-island.mjs` | 375／700（先按「選單」）／1366：導覽 4 項「群島、難易度設定、單字卡、模擬測驗」；第 1 項為內嵌 SVG、無外部參照；點擊命中 → `aria-current="page"`；`h2`「我的群島」、裝飾 `aria-hidden`；`h1`「EnglishContext」；目標標籤同列（≤ 640 可換行）不重疊 |
| TC-63-02 | AC-63-02、AC-32-01、V-ISL-08 | 自動化 E2E | `e2e-island.mjs` | 首次畫面、8 個應用內畫面、資料備份展開、初始化確認視窗、Toast：可見文字、DOM 文字節點、`aria-label`、`title`、`document.title`「主控台」0；確認視窗含「到「群島」頁按「匯出備份」」 |
| TC-63-03 | AC-63-03、AC-39-10、AC-20-01、AC-27-03 | 自動化 E2E | `e2e-island.mjs` | 375×667、390×844、412×915：7 區塊單欄、上緣順序同 DOM；區塊與地圖同寬；SVG 寬高比 354：430 誤差 ≤ 1%；無水平捲軸；捲到底頁尾不被底部導覽遮住 |
| TC-63-04 | AC-63-04、AC-39-10、AC-49-08 | 自動化 E2E | `e2e-island.mjs` | 768、1366、1920：容器 ≤ 720 置中；地圖寬 = min(容器, 480)、置中、比例；其他區塊填滿；3 格同列；清單每列 1 島 |
| TC-63-05 | AC-63-05、AC-39-09、AC-22-05 | 自動化 E2E | `e2e-island.mjs` | V-LAYOUT 6 尺寸重新開啟不捲動：「開始今日學習」完整在視窗內、在底部導覽上緣之上、中心點命中 |
| TC-64-01 | AC-64-01、AC-65-01 | 自動化 E2E | `e2e-island.mjs` | 兩種寬度：海面、海浪、3 座開放島、2 座霧中島（虛線、無植物、較淡）、燈塔、太陽、雲、彩虹（S = 7）、碼頭、航線、小船；6 段可見文字；文字層在最上層；地圖框圓角 ≥ 16 |
| TC-64-02 | AC-64-02、AC-65-01、AC-65-03、V-ISL-01 | 自動化 E2E | `e2e-island.mjs` | 橘島 m = 0、1、240、250、490、500、740、750、990、999、1,000 → P 與階段、地圖 5 種元素數、清單「掌握 P%」與階段文字、progressbar 值、文字替代片段；棕、綠島 P = 0／25／100 抽測 |
| TC-64-03 | AC-64-03、AC-30-10、AC-17-03、V-ISL-02 | 自動化 E2E | `e2e-island.mjs` | 排名 1～1,000 中 250 字、1,001～2,809 中 10 字、5 個自訂字 → 橘 25%（椰子樹）、棕 1%（新芽）、綠 0%；「已掌握 265 字」；無 NaN／Infinity |
| TC-64-04 | AC-64-04、V-ISL-02 | 自動化 E2E | `e2e-island.mjs` | 套用橘、棕、綠、藍、金，排名 1,500 已掌握：棕島皆 1%／新芽；「（目前目標未包含）」橘 → 棕、綠；棕 → 綠；其餘無；文字替代不含 |
| TC-64-05 | AC-64-05、AC-67-01、AC-49-04、V-ISL-03 | 自動化 E2E | `e2e-island.mjs` | K = 0、1、49、50、200：待建（石塊＋待建牌、無塔）／蓋好／點亮（塔＋光束）；第 3 格狀態行與「已答對 K / 200 題」；文字替代 |
| TC-64-06 | AC-64-06、AC-67-01、AC-17-02、V-ISL-03 | 自動化 E2E | `e2e-island.mjs` | S = 0、1、6、7：陰天（太陽 opacity ≤ 0.4）／晴天／出現彩虹；中斷（3 天前、連續 10 天）→ 0、陰天、三島與未中斷相同 |
| TC-64-07 | AC-64-07、V-ISL-03 | 自動化 E2E | `e2e-island.mjs` | D = 10、X = 0、5、9、10、15：錨點比例 0／0.5／0.9／1／1，誤差 ≤ 2% 航線長；X = 10 與 15 同位；`data-boat` 與文字替代 |
| TC-64-08 | AC-64-08、V-ISL-06 | 自動化 E2E | `e2e-island.mjs` | 四選一答錯、打卡中斷、當天未學、刪除自訂單字（含與內建同 wordKey）、模擬測驗答錯、重新開始：三島 P、階段、燈塔不下降，只有中斷變陰天；「清除答對紀錄」（例外）只影響燈塔 |
| TC-64-10 | AC-64-10、AC-71-02 | 自動化 E2E | `e2e-island.mjs` | 地圖與清單 10 處滑鼠與觸控點擊：不換頁、不開視窗、localStorage 不變；可聚焦元素 0、`cursor: pointer` 0；Tab 40 次不停在地圖與清單 |
| TC-65-01 | AC-65-01、AC-65-02、AC-38-03 | 自動化 E2E | `e2e-island.mjs` | 兩種寬度：`h3`「島嶼」、5 列順序、色點 `aria-hidden` 與色級色、副標、開放島 progressbar 屬性與填色、`tabular-nums`；霧中島「尚未開放」、非 progressbar、底色 `#f3f6fa` |
| TC-65-02n | AC-65-02、AC-67-01、AC-71-01、E-178 | 自動化 E2E | `e2e-island.mjs`（`QA_FIXTURE_NODATA`） | 無內建資料：三島「掌握 —」、省略 `aria-valuenow`、填滿 0；文字替代「{島名}掌握 —，沙灘」；Q = 0 第 3 格「—」與「燈塔待建」；無 NaN |
| TC-65-04 | AC-65-04、AC-68-03 | 自動化 E2E | `e2e-island.mjs` | 375×667：5 列高 ≥ 44、文字不裁切不重疊、對比 ≥ 4.5、無水平捲軸 |
| TC-66-01 | AC-66-01、AC-39-02、AC-71-02 | 自動化 E2E | `e2e-island.mjs` | 兩種寬度：龜龜 SVG `aria-hidden` 在左上、「島主 龜龜」、對話框；龜龜列在進度列之上；375 不重疊不裁切 |
| TC-66-02 | AC-66-02、V-ISL-04 | 自動化 E2E | `e2e-island.mjs` | D = 10、X = 0、4、9、10、12：對話框 5 句逐字；對話框與祖先非即時區域 |
| TC-66-03 | AC-66-03、AC-30-05、AC-38-07、AC-68-02 | 自動化 E2E | `e2e-island.mjs` | X = 0、4、10、12：文字、`tabular-nums`、填滿比例、品牌主色／金色、「今日目標達成」、progressbar 屬性（max = D、now = min(X, D)、valuetext）、高 ≥ 8、2 px 外框色 |
| TC-66-04 | AC-66-04、AC-39-04、V-LAY-10、AC-68-02 | 自動化 E2E | `e2e-island.mjs` | 5 色級 × 2 寬度：標籤文字、「變更」緊接、外框 ≥ 2 外框色、圓角 ≥ 12、非 `#f7893b`／`#d5d9e0`、無底線、≥ 44×44、對比 ≥ 4.5、與標題不重疊；滑鼠、Enter、空白鍵到難易度設定且 localStorage 不變 |
| TC-67-01 | AC-67-01、AC-39-05、AC-49-01、AC-49-08、AC-68-03 | 自動化 E2E | `e2e-island.mjs` | S／K = 0／0、3／48、7／50 × 2 寬度：第 1、3 格最下方狀態行、第 2 格不加行、3 格同列、對比 ≥ 4.5、不裁切 |
| TC-68-01 | AC-68-01、AC-34-04、AC-38-02、V-LAY-02 | 自動化 E2E | `e2e-island.mjs` | 兩種寬度：首次畫面、8 個畫面、對話框 `body` 背景 `rgb(234, 247, 251)`；manifest `background_color` `#eaf7fb`、`theme_color` 與 `<meta theme-color>` `#1e9bf0` |
| TC-68-02 | AC-68-02、V-LAY-02、VC-4 | 自動化 E2E | `e2e-island.mjs` | 群島頁各區塊、難易度設定、模擬測驗、單字卡、資料來源與授權、應用內三頁、首次畫面：卡片四邊 solid ≥ 2 px 外框色、圓角 ≥ 16、白底（例外）、今日任務卡與地圖框陰影；按鈕外框 ≥ 2、圓角 ≥ 12、非 `#d5d9e0`、「開始今日學習」「開始學習」陰影 |
| TC-68-03 | AC-68-03、AC-38-04 | 自動化 E2E | `e2e-island.mjs` | 兩種寬度 8 個畫面可見文字 WCAG 對比；卡片、按鈕、清單列、3 格外框對相鄰背景 ≥ 3 |
| TC-68-04 | AC-68-04、AC-26-01、AC-40-01～AC-40-03 | 自動化 E2E | `e2e-island.mjs` | 與 v1.3.2 比對首次畫面、難易度設定、模擬測驗（題目、作答後）、資料來源與授權（排除 LT-7）、應用內三頁的元素順序與按鈕文字 |
| TC-68-05 | AC-68-05、AC-38-01 | 自動化 E2E | `e2e-island.mjs` | 群島頁、單字卡頁可見 SVG 的 `fill`／`stroke` 無 `#f7893b`（標題列品牌圖示與 `.db-stat__icon` 為 AC-38-01 位置） |
| TC-68-06 | AC-68-06、AC-38-07 | 自動化 E2E | `e2e-island.mjs` | 原始碼無 `@font-face`、Google Fonts、字型檔網址；字型請求 0；計算後 `font-family` 只含系統字型與通用字族 |
| TC-69-01 | AC-69-01、AC-38-08、AC-06-01、AC-06-02 | 自動化 E2E | `e2e-island.mjs` | 單字卡正面、背面、測驗模式 × 2 寬度與 v1.3.2 比對（排除角落裝飾與回饋列） |
| TC-69-02 | AC-69-02、V-ISL-05、LF-6 | 自動化 E2E | `e2e-island.mjs` | 橘 239 字答對 W1（排名 300）「橘島又多掌握 1 個字（掌握 24%）」；調為 244 字答對 W2（排名 301）「橘島長出第一棵椰子樹！」；棕 m = 0 答對「棕島冒出新芽了！」 |
| TC-69-03 | AC-69-03、LF-6 | 自動化 E2E | `e2e-island.mjs` | D = 10、X = 8：翻面「小船又前進了，再 1 個字靠岸」；STT 評分「今天的小船靠岸了！」；再翻新字、自訂單字答對首次掌握 → 維持；X = 12 |
| TC-69-04 | AC-69-04、V-ISL-05 | 自動化 E2E | `e2e-island.mjs` | (a) 升階＋靠岸 → 升階文字；(b) 靠岸未升階；(c) 同字再翻面、滑動、上一張／下一張、答對已掌握且今天已學過的字、STT 錯誤、STT 訊息（nomatch）、準備中取消 → 回饋列不變 |
| TC-69-05 | AC-69-05、AC-71-02、AC-68-03 | 自動化 E2E | `e2e-island.mjs` | 兩種寬度：空容器 `role=status`、`aria-live=polite`、高 0；回饋位置（卡片區之下、「上一張／翻面／下一張」之上）；新芽 `aria-hidden`；出現時上方元素座標差 0；換卡、切換模式保留；離開再回來、重新載入不顯示；對比 ≥ 4.5；角落裝飾不重疊；(b) 減少動態無動畫 |
| TC-69-06 | AC-69-06、V-ISL-07、AC-62-07 | 自動化 E2E | `e2e-island.mjs` | 回饋顯示後 setItem 不增加、學習資料（X、S、掌握、K）不變；localStorage 全部鍵無島嶼／回饋字樣；回饋容器 polite、分數區不在其內 |
| TC-70-01 | AC-70-01、AC-31-03 | 自動化 E2E | `e2e-island.mjs` | 0.5 秒 4 種動畫、只改 transform、位移 ≤ 4／12 CSS px、旋轉 ≤ 3°；5.1 秒 0 個；離開再進入重播；三區塊 layout-shift 0 |
| TC-70-02 | AC-70-02、AC-31-03、E-181 | 自動化 E2E | `e2e-island.mjs` | 減少動態：進入群島頁 3 秒內與資料變化後回來動畫 0、無 `isl-map--play`；小船在 r 位置；進度條無轉場 |
| TC-70-03a | AC-70-03、AC-22-01 | 自動化 E2E（本機參考值） | `diag-r13-perf.mjs` | 單字卡頁 → 群島（資料未變）各 30 次 × 1／4 倍降速，click → 下一影格與 Event Timing 皆 ≤ 100 ms；v1.3.2 交錯對照 |
| TC-64-09p | AC-64-09、AC-70-03 | 自動化 E2E（本機參考值） | `diag-r13-perf.mjs` | 四選一答對、1.2 秒後點「群島」各 10 次 × 1／4 倍：≤ 100 ms、回到即新值 |
| TC-69-05p | AC-69-05、AC-69-06、AC-22-03、AC-29-01、AC-70-03 | 自動化 E2E（本機參考值） | `diag-r13-perf.mjs` | 翻面、四選一作答到回饋列已出現的下一影格各 12 次、重新載入後第一次翻面 5 輪 × 1／4 倍：≤ 100 ms |
| TC-70-03e | AC-64-09（參考） | 自動化 E2E（不判定） | `diag-r13-perf.mjs` | 答對後 0.25 秒內點「群島」（§10.15 (19)） |
| TC-22-01f | AC-22-01（參考） | 自動化 E2E（不判定） | `diag-r13-perf.mjs` | 減少動態＋4 倍降速，群島頁 → 難易度設定，1.4.0 與 v1.3.2 交錯（TC-22-01m 位置 1 對照） |
| TC-71-01 | AC-71-01、AC-65-03、AC-67-02、V-ISL-04 | 自動化 E2E | `e2e-island.mjs` | AC-64-03 資料、S = 3、K = 48、X = 4、D = 15：`aria-label` 逐字；`role=img`、SVG `aria-hidden`；無障礙樹 image 1 個、子節點 0；清單、地圖、3 格一致 |
| TC-71-01b | AC-71-01、AC-64-09、AC-67-02 | 自動化 E2E | `e2e-island.mjs` | 橘 P = 24、X = 3 → 單字卡四選一答對 → 點導覽回群島頁：地圖、清單、今日進度、對話框、文字替代即為 P = 25、X = 4（不重新載入） |
| TC-71-02 | AC-71-02、AC-52-07 | 自動化 E2E | `e2e-island.mjs` | 龜龜、標題裝飾、清單色點、目標色點 `aria-hidden`；SVG 內無可聚焦；「島主 龜龜」可見；Tab 區段序列 標題列與導覽 →「變更」→「開始今日學習」→ 資料備份 → 頁尾 |
| TC-71-03 | AC-71-03 | 自動化 E2E | `e2e-island.mjs` | `grayscale(1)` 下各狀態皆有可見文字：清單階段、「尚未開放」、3 格狀態、「今日目標達成」、小船狀態 |
| TC-71-04 | AC-71-04 | 自動化 E2E | `e2e-island.mjs` | 375 px，S／K = 0／0、7／50、0／50、7／0：地圖每段文字實際字級 ≥ 12 CSS px、截圖像素對比 ≥ 4.5 |
| TC-71-05 | AC-71-05、AC-38-09、AC-61-01 | 自動化 E2E | `e2e-island.mjs` | 375 px 群島頁（資料備份展開）與單字卡頁：可操作控制項 ≥ 44×44；Tab 停駐焦點框 ≥ 2 px、對比 ≥ 3、不被底部導覽遮住 |
| TC-72-01 | AC-72-01、AC-19-01、AC-19-04、AC-27-05、AC-37-01、AC-37-02 | 自動化 E2E | `e2e-island.mjs` | 原始碼無外部 `<image>`、`<use href>`、`url(http`、`@import`、外部 script／link（canonical 白名單除外）；≤ 5,242,880 bytes；連網、斷網、空資料夾副本斷網：插圖顯示、非 file: 請求 0、Console 錯誤 0 |
| TC-72-02 | AC-72-02、AC-36-04、V-ISL-07 | 自動化 E2E | `e2e-island.mjs` | v1.3.2 實際學習後以 1.4.0 開啟：直接群島頁、資料不變；瀏覽 setItem 0；回饋後欄位集合不變；匯出備份頂層 5 欄、無島嶼欄位；匯入 v1.3.2 資料備份不變；首次畫面者仍首次畫面 |
| TC-72-03 | AC-72-03 (a) | 自動化 E2E | `e2e-island.mjs` | 9 個字詞在交付 HTML、`dist/site`、`src/app` 非測試檔、8 個畫面文字與屬性 0 次 |
| TC-72-04a | AC-72-04、AC-36-03、AC-36-04、E-185 | 自動化 E2E | `e2e-pwa-r13.mjs` | 本機 8080：v1.3.2 安裝 service worker → 部署 1.4.0 → 60 秒內更新提示；更新前仍舊版；按「更新版本」→ 群島頁、localStorage 不變、只留新快取 |
| TC-72-05 | AC-72-05、AC-23-02、AC-23-06、AC-23-08、V-LGL-03、V-LGL-04 | 自動化 E2E | `e2e-island.mjs` | LT-7 在「資料來源與授權」頁 1 次且在 LT-4 之後、在 HTML 開頭註解 1 次且在 LT-4 那一行之後；第一行 EnglishContext；無「保留所有權利」 |
| TC-B03（第 13 輪） | （越界） | QA 檢視 | `boundary-r13.mjs` | §1.10 越界基準 |
| TC-69-06h | AC-69-06、AC-62-07 | 人工 | — | 見 §6.10 |
| TC-71-01h | AC-71-01 | 人工 | — | 見 §6.10 |
| TC-72-03h | AC-72-03 (b) | 人工（人類） | — | 見 §6.10 |
| TC-72-04h | AC-72-04 | 人工 | — | 見 §6.10 |
| TC-X-island | （全套件） | 自動化 E2E | `e2e-island.mjs` | 無未處理例外 |

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
| TC-PWA-H5 | AC-36-03、AC-36-05 | Windows Chrome 已安裝 App（TC-PWA-H1 後） | (0) 部署 V2 前，在 App 的 DevTools Console 執行 `caches.open("other-cache").then(c => c.put("/x", new Response("keep")))`（模擬同網域其他專案的快取）；(1) 記下 App 中 DevTools Console 執行 `document.querySelector('meta[name="emt-build-id"]').content` 的值 V1；(2) 主控改任一文字、建置、push 部署；(3) Actions 完成後重開 App：60 秒內頂端出現「有新版本，請更新版本」與「更新版本」按鈕；按下後頁面重新載入 1 次，識別碼變為 V2；(4) 再部署一次 V3，讓 App 開著切到背景 ≥ 1 小時後切回前景：60 秒內出現提示 | 如左；學習資料不變；V2 啟用後 Application → Cache storage 只剩 1 個 `english-master-track-pwa-<V2>`，`other-cache` 仍在且內容為 keep |

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
| TC-VER-H3 | AC-42-04 (b)、AC-36-03、E-97、E-131 | 已安裝 App 的 Windows Chrome（或 Android） | (1) 下次發布時，人類只把 `package.json` 的 `version` 改為新版本（例 1.0.1），建置並 push；(2) Actions 完成後連網開啟已安裝的 App，等待 60 秒；(3) 按「更新版本」 | (2) 出現「有新版本，請更新版本」與「更新版本」按鈕（E-120：提示由舊版程式顯示）；(3) 頁尾版本行變為新版本號、建置碼改變，學習資料不變；人類確認版本號與預期相符（建置只驗格式，不驗是否遞增）；更新前舊版仍可重答曾答對題目屬預期（E-131） |

### 6.4 第 7 輪人工驗收（學習位置與作答紀錄；人類執行）

既有人工 TC 的調整（第 8 輪再改版本，見 §6.5）：TC-VER-H1、TC-VER-H2 的版本改為「1.2.0」；TC-VER-H3 的例子改為「1.2.1」；TC-M04（雙擊開啟、關閉後重開）另確認單字卡停在關閉前那張、模擬測驗「已答對 K / 200 題」與開關不變（AC-18-01 v0.15）。

| TC | 對應 AC | 環境 | 步驟 | 通過條件 |
| :--- | :--- | :--- | :--- | :--- |
| TC-TRK-H1 | AC-47-04、AC-36-03、AC-44-01、AC-45-05、E-114 | Android Chrome、iPhone Safari，已安裝舊版 PWA 且有學習紀錄（自訂單字、今日已學、打卡、模擬測驗作答） | (1) 更新前記下主控台今日已學、連續打卡、掌握率、模擬測驗正確率與自訂單字數；(2) push 1.2.0 後連網開啟 App，等「有新版本，請更新版本」並按「更新版本」；(3) 檢視主控台、單字卡、模擬測驗；(4) 換卡到第 10 張，關閉 App 再開 | (2) 出現提示且更新後頁尾為「版本 1.2.0（建置 xxxxxxx）」；(3) 主控台各數字與 (1) 相同、無錯誤訊息；由 v1.1.0 更新者單字卡位置與「已答對 K / 200 題」不變、曾答對題為已答對鎖定檢視；由 v1.0.0 更新者單字卡從第 1 張開始、顯示「已答對 0 / 200 題」、開關關閉；(4) 重開後仍在第 10 張 |
| TC-TRK-H2 | AC-46-01、AC-45-04、AC-38-09、AC-48-01、AC-48-11 | Android TalkBack、iPhone VoiceOver | (1) 進入模擬測驗，以螢幕閱讀器移到「只練沒答對的題目」；(2) 點兩下切換；(3) 答對一題後讀題目區；(4)（v0.18）開關關閉，到曾答對的題目讀題目區；(5) 移到「清除答對紀錄，重新來過」並操作後取消 | (1) 讀出名稱與「未勾選」（核取方塊）；(2) 讀出狀態改為已勾選、畫面跳到未答對題目；(3) 「✓ 曾答對」與「已答對 K / 200 題」可被讀出；觸控點文字即可切換；(4) 讀出「你之前答對過這一題」、選項為不可用、解析可讀；實機點鎖定選項無反應、無震動；(5) 可聚焦、可操作，取消後資料不變 |

### 6.5 第 8 輪人工驗收（已答對鎖定檢視；人類執行）

無新增編號（architecture §10.10）。調整：TC-TRK-H2 加鎖定檢視與清除按鈕朗讀；TC-VER-H1、TC-VER-H2 比對版本 1.2.0；TC-VER-H3 已安裝 App 出現更新提示並顯示新版本號、E-131。其餘沿用 §6～§6.4。實機項目（iOS、實體麥克風、PWA 實機安裝）不算失敗，不阻擋自動化判定。

### 6.6 第 9 輪人工驗收（人類或主控）

| TC | 對應 AC | 環境 | 步驟 | 預期 |
| :--- | :--- | :--- | :--- | :--- |
| TC-53-02h | AC-53-02 (4)、FB-71 | 人類 | 讀過隱私權政策與關於我公開文案；開啟退出連結 | 文案可接受；連結有效 |
| TC-SITE-H1 | AC-53-02、AC-54-01、AC-56-03、AC-56-08、AC-56-09、AC-57-05、AC-57-06 | 主控 D-2～D-5、D-8；人類 D-11 | 部署後取得 13 檔、`robots.txt`、`sitemap.xml`、`og:image`；靜態頁連網與離線 | 皆依 AC |
| TC-57-06h | AC-57-06 | 主控 D-2 | 部署網址新增檔案 | 皆 200 |
| TC-50-10h | AC-50-10、E-146 | 第二階段，人類實機（EEA、英國、瑞士網路） | Google 同意訊息選接受與拒絕 | 學習不受阻擋；不寫入本系統狀態 |
| TC-AD-H1 | AC-50-04、AC-52-01、AC-52-05（T-106） | 第二階段，正式網址 | 檢查真實 AdSense 的 inline height；自動廣告關閉 | loading 與非主控台不露出；只有 1 個版位 |
| TC-AD-H2 | AC-51-01、AC-52-05（T-107、FB-73） | 第二階段 | 填入 ID 前核對後台片段與 `data-ad-status`；切頁時寬度 | 與 AD-7、AD-8 相符 |
| TC-AD-H3 | AC-52-03、AC-52-04、AC-52-06 | 第二階段 | 真實廣告距離、標籤、不重新整理 | 依 AC |
| TC-AD-H4 | AC-50-07、AC-50-08 | 第二階段 | 匯出真實請求 | 依 AC；只能證明測試當下未觀察到（Q-88） |
| TC-AD-H5 | AC-50-01、AC-50-05、AC-50-06、AC-51-02、AC-51-03、AC-51-04、AC-52-02、AC-52-07 | 第二階段 | 取得單元 ID 後於正式網址重跑替身 TC | 依 AC |

其餘實機項目沿用 §6～§6.5；TC-VER-H1～H3、TC-TRK-H1 比對版本 1.3.0 與已答對行。

### 6.7 第 10 輪人工驗收（真人語音；人類執行，QA 整理紀錄）

| TC | 對應 AC | 環境 | 步驟 | 預期與紀錄 |
| :--- | :--- | :--- | :--- | :--- |
| TC-58-14h | AC-58-14、AC-33-01、E-163 | 電腦版 Chrome、Edge 最新穩定版各 1 輪（`file://` 或本機 `npm run serve`）；Chrome 另於正式網站 1 輪（部署後） | (a) 等畫面顯示「聆聽中」才清楚念出當前單字，10 次；(b) 按下後立刻念，10 次 | (a) ≥ 9 次出現分數；(b) 不要求每次成功；每次都先「準備中」才「聆聽中」，結果只能是分數或 PRD 定義的訊息。逐次記錄：瀏覽器與版本、按鈕狀態序列、結果、從按下到「聆聽中」的大約秒數。未達門檻時交人類判斷；結果交主控決定是否在範圍內調整 `TIMING`（architecture §7.26.1） |
| TC-59-08h | AC-59-08、E-162、E-163 | 電腦版 Chrome、Edge | (a) 進入聆聽中後不說話，等到結束；(b) 念不清楚的聲音或非英文 | (a) 預期「未偵測到語音，請再試一次」；(b) 可能得到分數或任一分流訊息。逐次記錄實際訊息與瀏覽器版本；與預期不同時交人類判斷，不直接判為缺陷 |
| TC-58-01h（建議） | AC-58-01、BUG-007 | 同 TC-58-14h | 每次重新整理後的第 1 次按麥克風，目視「準備中」是否立即出現 | 記錄是否感覺延遲；供 BUG-007 判斷實機影響 |

V-MIC-1（TC-MIC-1）在 v0.20 另確認第 2～5 次按下先「準備中」再「聆聽中」；TC-VER-H1～H3、TC-TRK-H1 版本改為 1.3.1。

### 6.8 第 11 輪人工驗收（人類執行）

| TC | 對應 AC | 環境 | 步驟 | 預期與紀錄 |
| :--- | :--- | :--- | :--- | :--- |
| TC-33-03h | AC-33-03、AC-58-01（architecture v0.16 §10.13 Q12、SD-FB-93） | 電腦版 Chrome、Edge 最新穩定版（實體麥克風）；iOS Safari 選測 | (1) 重新整理後第 1 次按麥克風；(2) 離開單字卡頁再回來後第 1 次按；兩者進入「聆聽中」後說話 | 收音條隨音量亮起。iOS Safari：記錄收音條是否會動（`AudioContext` 改在「準備中」畫出後才建立，可能 `suspended` → `resume` 補救；仍不動時只有收音條全暗、辨識照常，交人類判斷） |
| TC-58-01h | AC-58-01（BUG-007 實機） | 同 TC-58-14h | 每次重新整理後第 1 次按麥克風，目視「準備中」是否立即出現 | 第 11 輪自動化已通過；實機感受仍請記錄 |
| （傳統捲軸外觀） | AC-52-05、AC-60-06（§7.29.4 已知取捨） | Windows 桌面 Chrome、Edge（一般捲軸設定） | 開不可捲動的頁面（例如 1920×1080 主控台）、開啟任一確認視窗 | 右側恆留約 15 px 底色空白；對話框背景右側 15 px 不變暗屬設計取捨（architecture §10.13 已知設計行為 (7)），請人類確認可接受 |

### 6.9 第 12 輪人工驗收（人類執行，QA 整理紀錄）

| TC | 對應 AC | 環境 | 步驟 | 預期與紀錄 |
| :--- | :--- | :--- | :--- | :--- |
| TC-62-12h | AC-62-12、AC-58-14、AC-59-08（§10.14 Q17、Q20） | 電腦版 Chrome、Edge 最新穩定版各 1 輪（`file://` 或本機 `npm run serve`）；Chrome 另於正式網站 1 輪（部署後） | (a) 等畫面顯示「聆聽中」才清楚念出當前單字，10 次；(b) 念 1 句約 10 個單字的英文句子，3 次 | (a) ≥ 9 次出現分數（未達交人類判斷）；(b) 說話期間即時文字至少更新 1 次（未更新交人類判斷，不直接判缺陷）；每次結束後即時文字列都已隱藏，結果只能是分數或 PRD 定義的訊息。逐次記錄：是否出現即時文字列、最後一段即時文字、結果（分數與辨識文字或訊息）、瀏覽器版本；紀錄交人類判定是否解決「偵測不到」。TC-58-14h、TC-59-08h 同一輪記錄 |
| TC-62-07h | AC-62-07（§10.14 Q18） | Windows NVDA 最新穩定版＋Chrome | 聆聽中說話使即時文字更新，之後得到分數；另做一次得到訊息 | 即時文字更新時不播報；評分後由分數區播報結果、訊息由訊息區播報（同 v0.20），不另外播報即時文字 |
| TC-VER-H2（部署後） | AC-42-02、AC-36-07 | 正式網址 | 檢視頁尾與原始碼 | 「版本 1.3.2（建置 xxxxxxx）」；`emt-build-id` 前 7 碼＝頁尾建置碼＝`sw.js` BUILD_ID 前 7 碼（CI 為 LF 建置，與本機 `981b0d2` 不同屬正常）；`about.html` 與首頁原始碼 description 不含「Part 5」 |

TC-VER-H1、TC-VER-H3、TC-TRK-H1 版本改為 1.3.2；TC-58-14h、TC-59-08h 註明與 TC-62-12h 同一輪。

### 6.10 第 13 輪人工驗收

| TC | 對應 AC | 環境 | 步驟 | 預期與紀錄 |
| :--- | :--- | :--- | :--- | :--- |
| TC-69-06h | AC-69-06、AC-62-07（§10.15 Q25） | Windows NVDA 最新穩定版＋Chrome | 單字卡頁對今天未學過的字按麥克風、念出單字得到分數（使 X 增加） | 先由分數區播報評分結果，學完回饋（如「小船又前進了，再 N 個字靠岸」）以 polite 方式在其後播報；即時文字不播報；分數區與訊息區播報與 v1.3.2 相同。記錄 NVDA、Chrome 版本與實際播報順序 |
| TC-71-01h | AC-71-01（Q25） | 同上 | 群島頁以瀏覽模式（方向鍵）與 Tab 走過；資料變化後回到群島頁再聽一次 | 地圖只播報 1 次「群島地圖：橘島掌握 …；今日小船 X / D 字，…」；內部島名、「測驗燈塔」等文字不另播報；Tab 不停在地圖與清單 |
| TC-72-03h | AC-72-03 (b)（Q26） | 人類 | 檢視龜龜、各島、燈塔、小船與導覽圖示 | 不模仿任何既有遊戲的角色、美術或名稱。**JimmyLin 於 2026-11-12 在對話中確認通過**（主控轉達），記「人工：人類確認通過」 |
| TC-72-04h | AC-72-04、AC-36-03、AC-36-04、E-185（Q28） | 正式網址；已安裝或已造訪 v1.3.2 的 PWA | 部署 1.4.0 後開啟已安裝的 App | 依 AC-36-03 出現「有新版本，請更新版本」；更新前舊頁面仍為舊外觀（E-185）；按「更新版本」後顯示群島頁、版本行「版本 1.4.0（建置 xxxxxxx）」、學習資料不變。本機模擬見 TC-72-04a |

TC-M07（AC-22-01～AC-22-05 基準環境）範圍加入：切換到群島頁、單字卡翻面與四選一到回饋列出現、首次載入到「開始今日學習」可點擊（AC-70-03）。TC-VER-H1～H3 版本改為 1.4.0。

## 7. AC 對照（AC → TC）

由 `node tests/tools/ac-matrix.mjs` 產生。PRD v0.21 的 AC 全部列出（428 個）：應驗收的 400 個 AC 皆至少對應 1 個 TC（未涵蓋 0）；暫停 27 個記「不適用（暫停）」；AC-46-07 記「不適用（v0.18 移除）」。判定欄為第 12 輪結果。

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
| AC-03-05 | 通過 | TC-03-05、TC-44-08 |
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
| AC-04-08 | 通過 | TC-04-08、TC-04-08b、TC-44-05a |
| AC-04-09 | 通過 | TC-S03 |
| AC-05-01 | 不適用（暫停） | TC-D11、TC-05-01 |
| AC-05-02 | 不適用（暫停） | TC-D11、TC-05-02 |
| AC-05-03 | 不適用（暫停） | TC-D11、TC-05-03 |
| AC-05-04 | 不適用（暫停） | TC-05-02 |
| AC-05-05 | 不適用（暫停） | TC-05-05 |
| AC-06-01 | 通過 | TC-D06、TC-06-01、TC-LGL-S01 |
| AC-06-02 | 通過 | TC-D06、TC-D07、TC-06-02 |
| AC-06-03 | 通過 | TC-06-02 |
| AC-06-04 | 通過 | TC-06-04 |
| AC-06-05 | 通過 | TC-06-04 |
| AC-06-06 | 通過 | TC-06-06、TC-04-08b、TC-39-03b、TC-44-07、TC-43-02 |
| AC-06-07 | 通過 | TC-D06、TC-06-07 |
| AC-06-08 | 通過 | TC-D05 |
| AC-07-01 | 通過（另待人工確認） | TC-07-01、TC-M02 |
| AC-07-02 | 通過（另待人工確認） | TC-07-01、TC-M02 |
| AC-07-03 | 通過（另待人工確認） | TC-07-03、TC-M02 |
| AC-07-04 | 通過（另待人工確認） | TC-07-04、TC-M02 |
| AC-07-05 | 通過（另待人工確認） | TC-07-05、TC-M02 |
| AC-08-01 | 通過（另待人工確認） | TC-08-01、TC-58-01、TC-58-03、TC-X-noas、TC-M01 |
| AC-08-02 | 通過 | TC-08-02 |
| AC-08-03 | 通過 | TC-08-03 |
| AC-08-04 | 通過 | TC-62-03b、TC-62-05、TC-08-04 |
| AC-08-05 | 通過 | TC-08-05 |
| AC-08-06 | 通過 | TC-08-06、TC-60-01 |
| AC-08-07 | 通過 | TC-08-06、TC-60-01 |
| AC-08-08 | 通過 | TC-08-06、TC-60-01 |
| AC-08-09 | 通過（另待人工確認） | TC-62-06、TC-08-09b、TC-08-09、TC-M01、TC-MIC-4 |
| AC-08-10 | 通過 | TC-62-06、TC-08-10i、TC-08-10、TC-FB85、TC-59-01 |
| AC-08-11 | 通過 | TC-08-11 |
| AC-08-12 | 通過 | TC-08-12 |
| AC-08-13 | 通過（另待人工確認） | TC-62-10、TC-53-06、TC-08-13、TC-M01 |
| AC-08-14 | 通過（另待人工確認） | TC-62-06、TC-08-14、TC-08-14b、TC-M01 |
| AC-09-01 | 通過 | TC-09-01 |
| AC-09-02 | 通過 | TC-D17、TC-09-02 |
| AC-09-03 | 通過 | TC-09-03 |
| AC-09-04 | 通過 | TC-09-04 |
| AC-09-05 | 通過 | TC-09-05 |
| AC-09-06 | 通過 | TC-09-06 |
| AC-09-07 | 通過 | TC-09-07 |
| AC-10-01 | 通過 | TC-D12 |
| AC-10-02 | 通過 | TC-D12、TC-R12-375、TC-10-02、TC-10-02-375、TC-10-02z、TC-10-02-768、TC-10-02-1366、TC-48-12-375、TC-48-12-1366、TC-LGL-S01、TC-LGL-S03、TC-LGL-S02 |
| AC-11-01 | 通過 | TC-11-01、TC-45-04-375、TC-45-04-1366、TC-46-02、TC-D20 |
| AC-11-02 | 通過 | TC-D12、TC-11-01、TC-46-02 |
| AC-11-03 | 通過 | TC-49-06c、TC-11-01、TC-45-01、TC-46-02 |
| AC-11-04 | 通過 | TC-11-04、TC-48-06-1366、TC-46-02、TC-46-05 |
| AC-11-05 | 通過 | TC-11-05、TC-40-01、TC-48-05、TC-46-02 |
| AC-11-06 | 通過 | TC-11-01、TC-45-03、TC-46-02 |
| AC-11-07 | 通過 | TC-49-05、TC-11-04、TC-48-04、TC-45-06、TC-46-02 |
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
| AC-17-01 | 通過 | TC-49-01、TC-17-01、TC-39-05 |
| AC-17-02 | 通過 | TC-17-02、TC-62-05、TC-30-03、TC-58-12、TC-45-06、TC-44-03-375、TC-44-03-1366 |
| AC-17-03 | 通過 | TC-09-03 |
| AC-17-04 | 通過 | TC-49-01、TC-17-04c、TC-17-04a、TC-17-04b、TC-48-11c-375、TC-48-11c-1366、TC-45-06、TC-46-08 |
| AC-17-05 | 通過 | TC-17-05 |
| AC-17-06 | 通過 | TC-17-06、TC-39-04、TC-39-04v |
| AC-18-01 | 通過（另待人工確認） | TC-18-01、TC-47-01、TC-M04 |
| AC-18-02 | 通過 | TC-18-02 |
| AC-18-03 | 通過 | TC-18-03、TC-25-08、TC-44-10a |
| AC-18-04 | 通過 | TC-18-04 |
| AC-18-05 | 通過 | TC-18-05、TC-25-09 |
| AC-18-06 | 通過 | TC-50-07、TC-21-01、TC-50-02 |
| AC-24-01 | 通過（另待人工確認） | TC-50-07、TC-24-01、TC-18-03、TC-50-02、TC-M06 |
| AC-24-02 | 通過 | TC-49-06d、TC-24-01、TC-R10-C2、TC-24-02b、TC-60-07、TC-47-02 |
| AC-24-03 | 通過（另待人工確認） | TC-49-06e、TC-24-03、TC-R10-C2、TC-25-10、TC-38-10、TC-47-02、TC-M06 |
| AC-24-04 | 通過 | TC-24-04 |
| AC-24-05 | 通過 | TC-24-05、TC-24-11、TC-47-06 |
| AC-24-06 | 通過 | TC-24-06 |
| AC-24-07 | 通過 | TC-24-07、TC-S07 |
| AC-24-08 | 通過 | TC-24-08、TC-43-03b |
| AC-24-09 | 通過 | TC-24-09、TC-25-11d |
| AC-24-10 | 通過 | TC-24-10、TC-47-03 |
| AC-24-11 | 通過 | TC-24-11 |
| AC-24-12 | 通過 | TC-39-08、TC-37-01a、TC-37-02、TC-24-12a、TC-24-12b、TC-53-06 |
| AC-23-01 | 通過 | TC-23-01、TC-43-03a |
| AC-23-02 | 通過 | TC-D10、TC-23-02、TC-23-02b、TC-25-07、TC-39-06、TC-23-02d-375、TC-23-02d-1366、TC-23-02c、TC-53-06、TC-42-01a、TC-LGL-S01、TC-D18 |
| AC-23-03 | 通過 | TC-D08、TC-D18、TC-D19 |
| AC-23-04 | 待人工（TC-M08） | TC-D16、TC-M08 |
| AC-23-05 | 通過 | TC-D09 |
| AC-23-06 | 通過 | TC-LGL-S01、TC-S06 |
| AC-23-07 | 通過 | TC-23-07-375、TC-23-07x-375、TC-23-07-1366、TC-23-07x-1366、TC-23-07f、TC-23-07h、TC-23-07t、TC-23-07c、TC-LGL-S01、TC-55-04b、TC-23-07s |
| AC-23-08 | 通過 | TC-23-08s、TC-23-08a、TC-23-08b、TC-LGL-S01、TC-LGL-S03、TC-56-07 |
| AC-19-01 | 通過 | TC-27-05、TC-PS-01、TC-PS-04、TC-PS-06、TC-50-03、TC-S01、TC-S08、TC-L-S01、TC-S09 |
| AC-19-02 | 通過（另待人工確認） | TC-19-02a、TC-35-02、TC-X-edge、TC-M03 |
| AC-19-03 | 通過（另待人工確認） | TC-21-01、TC-M04 |
| AC-19-04 | 通過 | TC-56-10a、TC-56-10b、TC-S02 |
| AC-20-01 | 通過（另待人工確認） | TC-R12-375、TC-49-08、TC-20-01、TC-27-01、TC-62-09-375、TC-62-09-768、TC-62-09-1366、TC-62-09m-375、TC-62-09m-768、TC-62-09m-1366、TC-39-10、TC-10-02-375、TC-10-02-768、TC-10-02-1366、TC-57-07、TC-M05 |
| AC-20-02 | 通過（另待人工確認） | TC-20-02、TC-M05 |
| AC-20-03 | 通過（另待人工確認） | TC-20-03、TC-25-01、TC-27-04、TC-20-04a、TC-57-01a、TC-M05 |
| AC-20-04 | 通過 | TC-20-04a、TC-20-04b、TC-20-04c、TC-20-04d、TC-57-sources |
| AC-21-01 | 通過（另待人工確認） | TC-21-01、TC-38-05、TC-37-05b、TC-37-01a、TC-37-01b、TC-37-05a、TC-57-02a、TC-56-10a、TC-56-10b、TC-50-02、TC-42-03a、TC-M01 |
| AC-21-02 | 通過 | TC-S04 |
| AC-21-03 | 通過（另待人工確認） | TC-50-07、TC-62-10、TC-21-03b、TC-37-01a、TC-35-01、TC-37-05a、TC-50-02、TC-21-03、TC-60-07、TC-M01、TC-S05 |
| AC-22-01 | 通過（另待人工確認） | TC-22-01、TC-22-01m、TC-22-01r、TC-39-03、TC-44-01-375、TC-44-01-1366、TC-M07 |
| AC-22-02 | 通過（另待人工確認） | TC-22-02b、TC-22-02、TC-M07 |
| AC-22-03 | 通過（另待人工確認） | TC-22-03b、TC-22-03、TC-M07 |
| AC-22-04 | 通過（另待人工確認） | TC-22-04b、TC-22-04、TC-41-02、TC-M07 |
| AC-22-05 | 通過（另待人工確認） | TC-22-05a、TC-22-05b、TC-39-09、TC-M07 |
| AC-25-01 | 通過 | TC-22-05b、TC-25-01、TC-41-01、TC-57-01c、TC-41-04r、TC-56-06b |
| AC-25-02 | 通過 | TC-25-02 |
| AC-25-03 | 通過 | TC-25-03 |
| AC-25-04 | 通過 | TC-25-04 |
| AC-25-05 | 通過 | TC-25-05 |
| AC-25-06 | 通過 | TC-25-06、TC-43-01、TC-01-08 |
| AC-25-07 | 通過 | TC-25-07、TC-41-04、TC-57-01c |
| AC-25-08 | 通過 | TC-25-08 |
| AC-25-09 | 通過 | TC-25-09 |
| AC-25-10 | 通過 | TC-25-10、TC-47-02 |
| AC-25-11 | 通過 | TC-25-11、TC-25-11d、TC-41-04 |
| AC-26-01 | 通過（另待人工確認） | TC-26-01、TC-M05 |
| AC-26-02 | 通過 | TC-26-02 |
| AC-26-03 | 不適用（暫停） | TC-26-03 |
| AC-26-04 | 通過 | TC-25-03、TC-26-04 |
| AC-26-05 | 通過 | TC-26-05、TC-S11 |
| AC-26-06 | 通過 | TC-26-06 |
| AC-27-01 | 通過（另待人工確認） | TC-27-01、TC-M05 |
| AC-27-02 | 通過（另待人工確認） | TC-27-02、TC-M05 |
| AC-27-03 | 待人工（TC-M09（虛擬鍵盤）） | TC-27-03、TC-61-02d、TC-62-09-375、TC-62-09-768、TC-62-09-1366、TC-62-09m-375、TC-62-09m-768、TC-62-09m-1366、TC-23-07-375、TC-23-07-1366、TC-36-03b、TC-57-01a、TC-42-01a、TC-42-01b、TC-M09、TC-VER-H1 |
| AC-27-04 | 通過 | TC-27-04 |
| AC-27-05 | 通過 | TC-27-05 |
| AC-28-01 | 通過 | TC-28-01 |
| AC-28-02 | 通過 | TC-28-02 |
| AC-28-03 | 通過（另待人工確認） | TC-28-03、TC-44-02、TC-M05 |
| AC-28-04 | 通過（另待人工確認） | TC-28-04、TC-M05 |
| AC-28-05 | 通過（另待人工確認） | TC-28-05、TC-M05 |
| AC-28-06 | 通過（另待人工確認） | TC-48-02-touch、TC-48-02-swipe、TC-28-06、TC-M05 |
| AC-28-07 | 通過 | TC-28-07 |
| AC-28-08 | 通過 | TC-28-08 |
| AC-29-01 | 通過 | TC-29-01 |
| AC-29-02 | 通過（另待人工確認） | TC-29-02、TC-M10 |
| AC-29-03 | 通過（另待人工確認） | TC-29-03、TC-M10 |
| AC-30-01 | 通過 | TC-49-01、TC-62-05、TC-30-01 |
| AC-30-02 | 通過 | TC-30-02 |
| AC-30-03 | 通過 | TC-30-03 |
| AC-30-04 | 通過 | TC-30-04i、TC-30-04、TC-58-12、TC-59-07、TC-45-06、TC-44-03-375、TC-44-03-1366 |
| AC-30-05 | 通過 | TC-30-05 |
| AC-30-06 | 通過 | TC-30-06 |
| AC-30-07 | 通過 | TC-30-07、TC-30-07c |
| AC-30-08 | 通過 | TC-39-07、TC-30-08 |
| AC-30-09 | 通過 | TC-30-09 |
| AC-30-10 | 通過 | TC-49-01、TC-39-05、TC-30-10、TC-30-10b |
| AC-30-11 | 通過 | TC-30-11 |
| AC-30-12 | 通過 | TC-30-12、TC-47-04 |
| AC-30-13 | 通過 | TC-30-13、TC-30-07c |
| AC-30-14 | 通過 | TC-48-09b、TC-30-14、TC-44-10b |
| AC-31-01 | 通過 | TC-31-01 |
| AC-31-02 | 通過 | TC-31-02 |
| AC-31-03 | 通過（另待人工確認） | TC-22-01m、TC-38-09、TC-48-01m、TC-33-08、TC-31-03、TC-36-03b、TC-31-03d、TC-58-13m-375、TC-58-13m-1366、TC-46-01-375、TC-46-01-1366 |
| AC-31-04 | 通過 | TC-S10 |
| AC-32-01 | 通過 | TC-49-06f、TC-32-01 |
| AC-32-02 | 通過 | TC-49-05、TC-32-02、TC-45-08 |
| AC-32-03 | 通過 | TC-32-03 |
| AC-32-04 | 通過 | TC-03-05、TC-32-04、TC-32-04obs、TC-45-08、TC-44-08 |
| AC-32-05 | 通過 | TC-32-05、TC-44-08b |
| AC-32-06 | 通過 | TC-32-06 |
| AC-32-07 | 通過 | TC-32-07 |
| AC-32-08 | 通過 | TC-32-08、TC-47-02 |
| AC-32-09 | 通過 | TC-32-09 |
| AC-32-10 | 通過 | TC-32-10 |
| AC-32-11 | 通過 | TC-32-11a、TC-32-11b |
| AC-33-01 | 待人工（V-MIC-1） | TC-33-01a、TC-X-noas、TC-MIC-1、TC-58-14h |
| AC-33-02 | 待人工（V-MIC-2） | TC-33-02a、TC-MIC-2 |
| AC-33-03 | 通過（另待人工確認） | TC-62-01、TC-62-02a、TC-62-02b、TC-33-03、TC-58-02、TC-58-03、TC-33-03r、TC-X-noas、TC-MIC-3、TC-33-03h |
| AC-33-04 | 通過 | TC-33-04 |
| AC-33-05 | 通過（另待人工確認） | TC-62-06、TC-33-05、TC-MIC-5 |
| AC-33-06 | 通過（另待人工確認） | TC-62-06、TC-33-06、TC-58-11、TC-MIC-5 |
| AC-33-07 | 通過 | TC-33-07、TC-X-noas |
| AC-33-08 | 通過（另待人工確認） | TC-33-08、TC-58-13m-375、TC-58-13m-1366、TC-X-noas、TC-MIC-3 |
| AC-34-01 | 通過（另待人工確認） | TC-34-01、TC-PS-02、TC-PS-03、TC-X-edge、TC-PWA-H1、TC-56-01、TC-L-S02 |
| AC-34-02 | 待人工（TC-PWA-H1／H2） | TC-PWA-H1、TC-PWA-H2、TC-L-S02 |
| AC-34-03 | 待人工（TC-PWA-H1／H2） | TC-34-03a、TC-PS-03、TC-PWA-H1、TC-PWA-H2 |
| AC-34-04 | 通過（另待人工確認） | TC-38-02、TC-34-04、TC-PS-04、TC-LAY-H3 |
| AC-34-05 | 待人工（TC-PWA-H3（iOS）） | TC-34-05a、TC-PS-03、TC-PS-04、TC-PWA-H3 |
| AC-34-06 | 通過（另待人工確認） | TC-34-08、TC-37-03、TC-PWA-H1 |
| AC-34-07 | 通過（另待人工確認） | TC-34-07、TC-PWA-H1 |
| AC-34-08 | 通過（另待人工確認） | TC-37-01a、TC-37-01b、TC-34-07、TC-34-08、TC-PWA-H3 |
| AC-34-09 | 通過（另待人工確認） | TC-34-09a、TC-34-09b、TC-34-09c、TC-PWA-H1 |
| AC-34-10 | 通過（另待人工確認） | TC-34-09b、TC-PWA-H1 |
| AC-35-01 | 通過 | TC-50-06、TC-36-03a、TC-35-01、TC-PS-05、TC-X-edge、TC-50-06s |
| AC-35-02 | 通過 | TC-51-04、TC-35-02、TC-57-05b、TC-X-edge |
| AC-35-03 | 待人工（TC-PWA-H2） | TC-PWA-H2 |
| AC-35-04 | 通過（另待人工確認） | TC-35-04、TC-M07 |
| AC-35-05 | 通過 | TC-35-05 |
| AC-36-01 | 通過 | TC-42-04a、TC-42-04c、TC-36-01a、TC-36-01b、TC-36-01c、TC-36-01obs、TC-57-06a |
| AC-36-02 | 通過 | TC-42-02、TC-PS-04、TC-PS-05、TC-36-01b、TC-36-02 |
| AC-36-03 | 通過（另待人工確認） | TC-50-06u、TC-49-06b、TC-36-03a、TC-36-03b、TC-36-03c、TC-36-04b、TC-36-03d、TC-PWA-H5、TC-42-04d、TC-VER-H3、TC-TRK-H1、TC-57-06b |
| AC-36-04 | 通過 | TC-36-03c、TC-36-04b、TC-36-03d、TC-47-04b |
| AC-36-05 | 通過（另待人工確認） | TC-36-03c、TC-PWA-H5 |
| AC-36-06 | 通過 | TC-36-06 |
| AC-36-07 | 待人工（TC-PWA-H4（MC-03 後）） | TC-42-02、TC-PS-01、TC-36-07a、TC-PWA-H4、TC-VER-H2、TC-50-03、TC-57-06a |
| AC-37-01 | 通過（另待人工確認） | TC-37-01a、TC-37-01b、TC-57-02a、TC-56-10a、TC-56-10b、TC-PS-04、TC-X-edge、TC-M03 |
| AC-37-02 | 通過 | TC-37-02、TC-56-10a、TC-56-10b、TC-56-06c |
| AC-37-03 | 通過 | TC-37-03 |
| AC-37-04 | 通過 | TC-37-04 |
| AC-37-05 | 通過 | TC-50-07、TC-50-06、TC-62-10b、TC-23-07h、TC-37-05b、TC-37-05a、TC-50-02、TC-47-08b、TC-42-01b、TC-PS-05 |
| AC-37-06 | 通過 | TC-37-06 |
| AC-38-01 | 通過 | TC-52-04、TC-38-01、TC-23-07-375、TC-23-07-1366、TC-48-11a-375、TC-48-12-375、TC-48-11a-1366、TC-48-12-1366、TC-57-07、TC-23-07c、TC-45-04-375、TC-45-04-1366、TC-39-04v |
| AC-38-02 | 通過（另待人工確認） | TC-38-02、TC-PWA-H2、TC-LAY-H3 |
| AC-38-03 | 通過 | TC-38-03、TC-48-01-375、TC-48-01-1366 |
| AC-38-04 | 通過 | TC-52-04、TC-49-08、TC-62-09-375、TC-62-09-768、TC-62-09-1366、TC-62-09m-375、TC-62-09m-768、TC-62-09m-1366、TC-38-04、TC-23-07-375、TC-23-07-1366、TC-48-01-375、TC-48-01-1366、TC-48-12-375、TC-48-12-1366、TC-57-07、TC-23-07c、TC-45-04-375、TC-45-04-1366、TC-39-04v |
| AC-38-05 | 通過（另待人工確認） | TC-38-05、TC-M03、TC-LAY-H2、TC-L-S04 |
| AC-38-06 | 通過 | TC-38-06、TC-39-04v |
| AC-38-07 | 通過 | TC-49-01、TC-49-08、TC-38-07、TC-45-05-375、TC-45-05-1366、TC-L-S01 |
| AC-38-08 | 通過 | TC-38-08 |
| AC-38-09 | 通過（另待人工確認） | TC-52-07、TC-38-09f-375、TC-38-09f-390、TC-61-02c、TC-38-09、TC-48-02-kbd、TC-57-01b、TC-46-01-375、TC-46-01-1366、TC-46-06、TC-39-04v、TC-TRK-H2 |
| AC-38-10 | 通過 | TC-38-10、TC-23-08s、TC-56-01、TC-S06、TC-L-S02、TC-L-S03 |
| AC-39-01 | 通過 | TC-50-04、TC-52-07、TC-39-01 |
| AC-39-02 | 通過 | TC-39-02 |
| AC-39-03 | 通過 | TC-39-03、TC-39-03b、TC-44-01-375、TC-44-01-1366 |
| AC-39-04 | 通過 | TC-39-04、TC-39-04v、TC-V-S03 |
| AC-39-05 | 通過 | TC-49-01、TC-39-05 |
| AC-39-06 | 通過 | TC-49-01、TC-39-06 |
| AC-39-07 | 通過 | TC-39-07 |
| AC-39-08 | 通過 | TC-39-08 |
| AC-39-09 | 通過 | TC-52-03、TC-49-08、TC-39-09r、TC-39-09 |
| AC-39-10 | 通過 | TC-39-10 |
| AC-40-01 | 通過 | TC-40-01、TC-48-03、TC-45-05-375、TC-45-05-1366、TC-46-05 |
| AC-40-02 | 通過 | TC-R12-375、TC-39-10、TC-10-02-375、TC-10-02-768、TC-10-02-1366、TC-48-01-375、TC-48-01-1366、TC-48-06-375、TC-48-12-375、TC-48-12-1366 |
| AC-40-03 | 通過 | TC-38-03、TC-40-03 |
| AC-41-01 | 通過 | TC-41-01、TC-56-06b |
| AC-41-02 | 通過 | TC-41-02 |
| AC-41-03 | 通過（另待人工確認） | TC-41-03、TC-LAY-H1 |
| AC-41-04 | 通過（另待人工確認） | TC-61-02c、TC-41-04、TC-57-01c、TC-41-04r、TC-42-01a、TC-42-01b、TC-LAY-H1、TC-VER-H1 |
| AC-42-01 | 通過（另待人工確認） | TC-57-01a、TC-42-01a、TC-42-01b、TC-X-edge、TC-VER-H1、TC-V-S03 |
| AC-42-02 | 通過（另待人工確認） | TC-42-02、TC-VER-H2、TC-V-S01、TC-V-S02 |
| AC-42-03 | 通過 | TC-50-07、TC-50-02、TC-42-03a、TC-42-01b、TC-V-S01 |
| AC-42-04 | 通過（另待人工確認） | TC-42-04a、TC-42-04b、TC-42-04c、TC-42-04d、TC-VER-H3 |
| AC-43-01 | 通過 | TC-43-01、TC-43-02、TC-X-edge |
| AC-43-02 | 通過 | TC-43-02、TC-V-S03 |
| AC-43-03 | 通過 | TC-43-03a、TC-43-03b |
| AC-44-01 | 通過（另待人工確認） | TC-44-01-375、TC-44-01-1366、TC-X-edge、TC-TRK-H1 |
| AC-44-02 | 通過 | TC-44-02 |
| AC-44-03 | 通過 | TC-44-03-375、TC-44-03-1366 |
| AC-44-04 | 通過 | TC-44-04 |
| AC-44-05 | 通過 | TC-44-05a、TC-44-05bc、TC-47-06 |
| AC-44-06 | 通過 | TC-44-06 |
| AC-44-07 | 通過 | TC-44-07 |
| AC-44-08 | 通過 | TC-44-08、TC-44-08b |
| AC-44-09 | 通過 | TC-44-09 |
| AC-44-10 | 通過 | TC-44-10a、TC-44-10b |
| AC-45-01 | 通過 | TC-45-01、TC-45-01p、TC-X-edge |
| AC-45-02 | 通過 | TC-45-02 |
| AC-45-03 | 通過 | TC-48-08c、TC-45-03 |
| AC-45-04 | 通過（另待人工確認） | TC-48-01-375、TC-48-01-1366、TC-48-03、TC-45-04-375、TC-45-04-1366、TC-TRK-H2、TC-T-S01 |
| AC-45-05 | 通過（另待人工確認） | TC-49-03、TC-49-07、TC-45-01p、TC-45-05-375、TC-45-05-1366、TC-TRK-H1、TC-T-S01 |
| AC-45-06 | 通過 | TC-49-03、TC-49-04、TC-45-06 |
| AC-45-07 | 通過 | TC-48-11b-375、TC-48-11b-1366、TC-48-09cde、TC-45-07、TC-47-06 |
| AC-45-08 | 通過 | TC-45-08 |
| AC-46-01 | 通過（另待人工確認） | TC-46-01-375、TC-46-01-1366、TC-X-edge、TC-TRK-H2、TC-T-S01 |
| AC-46-02 | 通過 | TC-46-02 |
| AC-46-03 | 通過 | TC-46-03、TC-46-03p |
| AC-46-04 | 通過 | TC-46-04、TC-46-10 |
| AC-46-05 | 通過 | TC-46-05 |
| AC-46-06 | 通過 | TC-46-06、TC-T-S01 |
| AC-46-07 | 不適用（v0.18 移除） | TC-48-10、TC-46-07 |
| AC-46-08 | 通過 | TC-49-05、TC-49-07、TC-49-07b、TC-48-11c-375、TC-48-11c-1366、TC-46-08 |
| AC-46-09 | 通過 | TC-48-10、TC-46-09 |
| AC-46-10 | 通過 | TC-46-10、TC-47-02 |
| AC-47-01 | 通過 | TC-47-01 |
| AC-47-02 | 通過 | TC-47-02 |
| AC-47-03 | 通過 | TC-47-03 |
| AC-47-04 | 通過（另待人工確認） | TC-49-06b、TC-R10-C1、TC-47-04、TC-47-04b、TC-TRK-H1 |
| AC-47-05 | 通過 | TC-44-06、TC-47-05 |
| AC-47-06 | 通過 | TC-47-06 |
| AC-47-07 | 通過 | TC-48-09a、TC-44-10a、TC-44-10b |
| AC-47-08 | 通過 | TC-50-07、TC-50-02、TC-X-p5-us45、TC-X-p5-us46、TC-47-08b、TC-X-track-375、TC-X-track-1366、TC-X-track-backup、TC-T-S01 |
| AC-48-01 | 通過（另待人工確認） | TC-49-06c、TC-48-01-375、TC-48-01-1366、TC-48-01m、TC-48-08a、TC-45-03、TC-46-02、TC-46-09、TC-X-edge、TC-TRK-H2 |
| AC-48-02 | 通過 | TC-49-04、TC-48-02-mouse、TC-48-02-touch、TC-48-02-swipe、TC-48-02-kbd、TC-48-02-force、TC-45-06 |
| AC-48-03 | 通過 | TC-48-03 |
| AC-48-04 | 通過 | TC-48-04 |
| AC-48-05 | 通過 | TC-48-05 |
| AC-48-06 | 通過 | TC-49-03、TC-48-06-1366、TC-48-06-375、TC-46-04、TC-46-05 |
| AC-48-07 | 通過 | TC-49-03b、TC-48-07、TC-48-07b |
| AC-48-08 | 通過 | TC-48-08-setup、TC-48-08a、TC-48-08b、TC-48-08c、TC-48-08d、TC-45-03 |
| AC-48-09 | 通過 | TC-48-09a、TC-48-09b、TC-48-09cde |
| AC-48-10 | 通過 | TC-48-07b、TC-48-10、TC-46-01-375、TC-46-01-1366 |
| AC-48-11 | 通過（另待人工確認） | TC-49-05、TC-48-11a-375、TC-48-11b-375、TC-48-11c-375、TC-48-12z、TC-48-11a-1366、TC-48-11b-1366、TC-48-11c-1366、TC-TRK-H2 |
| AC-48-12 | 通過 | TC-48-12-375、TC-48-12z、TC-48-12-1366、TC-48-12e、TC-46-06、TC-LGL-S02、TC-T-S01 |
| AC-49-01 | 通過 | TC-49-01、TC-X-edge |
| AC-49-02 | 通過 | TC-49-02、TC-49-03b、TC-49-02q |
| AC-49-03 | 通過 | TC-49-03 |
| AC-49-04 | 通過 | TC-49-04 |
| AC-49-05 | 通過 | TC-49-05、TC-49-06e |
| AC-49-06 | 通過 | TC-49-06a、TC-49-06b、TC-49-06c、TC-49-06d、TC-49-06e、TC-49-06f |
| AC-49-07 | 通過 | TC-49-07、TC-49-07b |
| AC-49-08 | 通過 | TC-49-08 |
| AC-50-01 | 通過（另待人工確認） | TC-50-01s、TC-50-01、TC-AD-H5 |
| AC-50-02 | 通過 | TC-50-02、TC-X-edge |
| AC-50-03 | 通過 | TC-50-03、TC-50-05 |
| AC-50-04 | 通過（另待人工確認） | TC-50-04、TC-AD-H1 |
| AC-50-05 | 通過（另待人工確認） | TC-50-06u、TC-AD-H5、TC-50-05 |
| AC-50-06 | 通過（另待人工確認） | TC-50-06、TC-50-06u、TC-AD-H5、TC-50-06s |
| AC-50-07 | 通過（另待人工確認） | TC-50-07、TC-AD-H4 |
| AC-50-08 | 通過（另待人工確認） | TC-50-08b、TC-50-07、TC-AD-H4、TC-50-10s |
| AC-50-09 | 通過 | TC-56-10a、TC-56-10b、TC-50-09 |
| AC-50-10 | 待人工（TC-50-10h（第二階段，人類實機）） | TC-50-10s、TC-50-10h |
| AC-51-01 | 通過（另待人工確認） | TC-51-01、TC-AD-H2 |
| AC-51-02 | 通過（另待人工確認） | TC-51-02、TC-AD-H5 |
| AC-51-03 | 待人工（TC-M07（4 倍降速本次載入首次作答 > 100 ms，同條件無廣告也一樣，§20.5）） | TC-51-03a、TC-51-03b、TC-AD-H5 |
| AC-51-04 | 通過（另待人工確認） | TC-51-04、TC-AD-H5 |
| AC-52-01 | 通過（另待人工確認） | TC-50-04、TC-52-01、TC-AD-H1 |
| AC-52-02 | 通過（另待人工確認） | TC-50-04、TC-52-02、TC-AD-H5 |
| AC-52-03 | 通過（另待人工確認） | TC-52-03、TC-AD-H3 |
| AC-52-04 | 通過（另待人工確認） | TC-52-04、TC-AD-H3 |
| AC-52-05 | 通過（另待人工確認） | TC-52-05f、TC-52-05g、TC-R11-1366b、TC-52-03、TC-52-05b、TC-52-05c、TC-AD-H1、TC-AD-H2 |
| AC-52-06 | 通過（另待人工確認） | TC-52-06、TC-AD-H3 |
| AC-52-07 | 通過（另待人工確認） | TC-52-04、TC-52-07、TC-AD-H5 |
| AC-53-01 | 通過 | TC-57-01b、TC-X-edge |
| AC-53-02 | 通過（另待人工確認） | TC-23-07t、TC-23-07c、TC-57-03、TC-SITE-H1、TC-53-02、TC-53-02h |
| AC-53-03 | 通過 | TC-57-02a、TC-56-10a、TC-56-10b、TC-53-02 |
| AC-53-04 | 通過 | TC-57-05a、TC-53-04a、TC-57-04-about、TC-57-04-contact、TC-57-04-privacy |
| AC-53-05 | 通過 | TC-52-01、TC-55-01a、TC-57-07 |
| AC-53-06 | 通過 | TC-62-10、TC-53-06、TC-53-02 |
| AC-54-01 | 通過（另待人工確認） | TC-57-03、TC-LGL-S03、TC-SITE-H1、TC-54-01 |
| AC-54-02 | 通過 | TC-54-02 |
| AC-55-01 | 通過 | TC-55-01a、TC-57-03、TC-55-01s |
| AC-55-02 | 通過 | TC-55-01a、TC-23-07t、TC-23-07c、TC-55-01s、TC-23-07s |
| AC-55-03 | 通過 | TC-55-01a、TC-55-01s |
| AC-55-04 | 通過 | TC-55-04a、TC-55-04b、TC-55-04c、TC-55-04h、TC-23-07s |
| AC-56-01 | 通過 | TC-56-01、TC-56-sp-about、TC-56-sp-contact、TC-56-sp-privacy |
| AC-56-02 | 通過 | TC-56-02、TC-56-sp-about、TC-56-sp-contact、TC-56-sp-privacy |
| AC-56-03 | 通過（另待人工確認） | TC-LGL-S03、TC-SITE-H1、TC-56-03、TC-56-sp-about、TC-56-sp-contact、TC-56-sp-privacy |
| AC-56-04 | 通過 | TC-56-04a、TC-56-04b、TC-56-sp-about、TC-56-sp-contact、TC-56-sp-privacy |
| AC-56-05 | 通過 | TC-LGL-S03、TC-56-05 |
| AC-56-06 | 通過 | TC-57-04b、TC-56-06b、TC-56-06c、TC-LGL-S03、TC-56-06 |
| AC-56-07 | 通過 | TC-LGL-S03、TC-56-07 |
| AC-56-08 | 待人工（部署後 D-3（正式網址回應）） | TC-SITE-H1、TC-56-08 |
| AC-56-09 | 待人工（部署後 D-3（正式網址回應）） | TC-SITE-H1、TC-56-09 |
| AC-56-10 | 通過 | TC-56-10a、TC-56-10b |
| AC-57-01 | 通過 | TC-61-02c、TC-57-01a、TC-57-01b、TC-57-01c、TC-X-edge |
| AC-57-02 | 通過 | TC-57-02a、TC-56-10a、TC-56-10b、TC-57-05b |
| AC-57-03 | 通過 | TC-57-03、TC-LGL-S03、TC-57-04-about、TC-57-04-contact、TC-57-04-privacy、TC-57-03s、TC-57-06b |
| AC-57-04 | 通過 | TC-57-sources、TC-53-04a、TC-57-04b、TC-57-04-about、TC-57-04-contact、TC-57-04-privacy |
| AC-57-05 | 通過（另待人工確認） | TC-57-05a、TC-57-05b、TC-SITE-H1、TC-50-06s |
| AC-57-06 | 通過（另待人工確認） | TC-SITE-H1、TC-57-06a、TC-57-06b、TC-57-06h |
| AC-58-01 | 通過（另待人工確認） | TC-58-01、TC-58-04a、TC-58-01f、TC-58-01g、TC-33-03r、TC-58-01h、TC-33-03h |
| AC-58-02 | 通過 | TC-58-02 |
| AC-58-03 | 通過 | TC-58-03 |
| AC-58-04 | 通過 | TC-58-04b、TC-58-04a、TC-58-04c |
| AC-58-05 | 通過 | TC-58-05、TC-58-05b、TC-58-04c |
| AC-58-06 | 通過 | TC-58-06、TC-58-06b |
| AC-58-07 | 通過 | TC-62-02a、TC-58-07i、TC-62-02b、TC-58-07 |
| AC-58-08 | 通過 | TC-58-08 |
| AC-58-09 | 通過 | TC-62-02b、TC-58-09、TC-X-noas |
| AC-58-10 | 通過 | TC-62-06、TC-58-10a、TC-58-10b |
| AC-58-11 | 通過 | TC-58-11 |
| AC-58-12 | 通過 | TC-R10-C1、TC-58-12 |
| AC-58-13 | 通過 | TC-58-13-375、TC-58-13-1366、TC-58-13m-375、TC-58-13m-1366 |
| AC-58-14 | 待人工（TC-58-14h（真人語音，Chrome、Edge、正式網站）） | TC-58-14h、TC-62-12h |
| AC-59-01 | 通過 | TC-59-01i、TC-59-01 |
| AC-59-02 | 通過 | TC-62-06、TC-59-02 |
| AC-59-03 | 通過 | TC-62-04、TC-62-05b、TC-59-03 |
| AC-59-04 | 通過 | TC-59-04 |
| AC-59-05 | 通過 | TC-59-05i、TC-59-05 |
| AC-59-06 | 通過 | TC-59-06 |
| AC-59-07 | 通過 | TC-59-07 |
| AC-59-08 | 待人工（TC-59-08h（真人語音，Chrome、Edge）） | TC-62-12h、TC-59-08h |
| AC-60-01 | 通過 | TC-62-03a、TC-60-01、TC-60-01o |
| AC-60-02 | 通過 | TC-60-01 |
| AC-60-03 | 通過 | TC-62-11、TC-60-03 |
| AC-60-04 | 通過 | TC-59-03、TC-60-04 |
| AC-60-05 | 通過 | TC-62-08、TC-60-05 |
| AC-60-06 | 通過 | TC-60-06-375、TC-60-06-768、TC-60-06-1366、TC-60-06m-375 |
| AC-60-07 | 通過 | TC-R10-C3、TC-62-06、TC-60-07 |
| AC-61-01 | 通過 | TC-61-01-375、TC-61-01m-375、TC-61-01-390、TC-61-01m-390 |
| AC-61-02 | 通過 | TC-61-02a、TC-61-02b、TC-61-02c、TC-61-02d |
| AC-62-01 | 通過 | TC-62-01、TC-62-01b、TC-62-01f |
| AC-62-02 | 通過 | TC-62-02a、TC-62-02b |
| AC-62-03 | 通過 | TC-62-03a、TC-62-03b |
| AC-62-04 | 通過 | TC-62-04 |
| AC-62-05 | 通過 | TC-62-05b、TC-62-05、TC-59-01i、TC-08-10i |
| AC-62-06 | 通過 | TC-62-06、TC-59-05i、TC-08-10i、TC-30-04i |
| AC-62-07 | 通過（另待人工確認） | TC-62-07a、TC-62-07h |
| AC-62-08 | 通過 | TC-62-08 |
| AC-62-09 | 通過 | TC-62-09-375、TC-62-09-768、TC-62-09-1366、TC-62-09m-375、TC-62-09m-768、TC-62-09m-1366 |
| AC-62-10 | 通過 | TC-62-10、TC-62-10b |
| AC-62-11 | 通過 | TC-62-11 |
| AC-62-12 | 待人工（TC-62-12h（真人語音，Chrome、Edge、正式網站）） | TC-62-12h |

### 7.1 第 13 輪 AC 對照（本輪範圍）

第 13 輪範圍 74 個 AC（新增 50、修改 12、FE-102～FE-117 covers 中其他既有 12）皆至少對應 1 個 TC（未涵蓋 0）；AC-38-06 記「不適用（v0.22 移除）」。判定欄為第 13 輪結果：通過 64、通過（另待人工確認）9、通過（(b) 人工：人類確認通過）1、失敗 0。本節之外的 §7 全表為第 12 輪產生（PRD v0.21），全套重新產生留待發版驗收。

| AC | 判定 | 對應 TC |
| :--- | :--- | :--- |
| AC-63-01 | 通過 | TC-63-01、TC-20-03、TC-27-01 |
| AC-63-02 | 通過 | TC-63-02、TC-32-01 |
| AC-63-03 | 通過 | TC-63-03 |
| AC-63-04 | 通過 | TC-63-04 |
| AC-63-05 | 通過 | TC-63-05、TC-39-09 |
| AC-64-01 | 通過 | TC-64-01 |
| AC-64-02 | 通過 | TC-64-02 |
| AC-64-03 | 通過 | TC-64-03、TC-71-01 |
| AC-64-04 | 通過 | TC-64-04 |
| AC-64-05 | 通過 | TC-64-05 |
| AC-64-06 | 通過 | TC-64-06 |
| AC-64-07 | 通過 | TC-64-07 |
| AC-64-08 | 通過 | TC-64-08 |
| AC-64-09 | 通過（另待人工確認） | TC-71-01b、TC-64-09p、TC-70-03e（參考）、TC-M07 |
| AC-64-10 | 通過 | TC-64-10 |
| AC-65-01 | 通過 | TC-65-01、TC-64-01、TC-64-02 |
| AC-65-02 | 通過 | TC-65-01、TC-65-02n |
| AC-65-03 | 通過 | TC-64-02、TC-71-01 |
| AC-65-04 | 通過 | TC-65-04 |
| AC-66-01 | 通過 | TC-66-01 |
| AC-66-02 | 通過 | TC-66-02 |
| AC-66-03 | 通過 | TC-66-03、TC-30-05 |
| AC-66-04 | 通過 | TC-66-04、TC-39-04 |
| AC-67-01 | 通過 | TC-67-01、TC-64-05、TC-64-06、TC-65-02n |
| AC-67-02 | 通過 | TC-71-01、TC-71-01b |
| AC-68-01 | 通過 | TC-68-01、TC-38-02、TC-34-04、TC-PS-02 |
| AC-68-02 | 通過 | TC-68-02 |
| AC-68-03 | 通過 | TC-68-03、TC-65-04、TC-67-01、TC-69-05、TC-71-04 |
| AC-68-04 | 通過 | TC-68-04、TC-26-01、TC-40-01、TC-40-03、TC-41-01～TC-41-04、TC-45-04-*、TC-46-01-*、TC-48-01-*、TC-48-12-*、TC-57-01a～c |
| AC-68-05 | 通過 | TC-68-05、TC-38-01 |
| AC-68-06 | 通過 | TC-68-06 |
| AC-69-01 | 通過 | TC-69-01、TC-69-05、TC-38-08 |
| AC-69-02 | 通過 | TC-69-02 |
| AC-69-03 | 通過 | TC-69-03 |
| AC-69-04 | 通過 | TC-69-04 |
| AC-69-05 | 通過（另待人工確認） | TC-69-05、TC-69-05p、TC-M07 |
| AC-69-06 | 通過（另待人工確認） | TC-69-06、TC-69-05p、TC-69-06h |
| AC-70-01 | 通過 | TC-70-01 |
| AC-70-02 | 通過 | TC-70-02、TC-69-05、TC-31-03 |
| AC-70-03 | 通過（另待人工確認） | TC-70-03a、TC-64-09p、TC-69-05p、TC-22-05a、TC-22-01、TC-M07 |
| AC-71-01 | 通過（另待人工確認） | TC-71-01、TC-71-01b、TC-65-02n、TC-71-01h |
| AC-71-02 | 通過 | TC-71-02、TC-64-10、TC-66-01、TC-69-05 |
| AC-71-03 | 通過 | TC-71-03 |
| AC-71-04 | 通過 | TC-71-04 |
| AC-71-05 | 通過 | TC-71-05 |
| AC-72-01 | 通過 | TC-72-01、TC-S01、TC-S02、TC-27-05 |
| AC-72-02 | 通過 | TC-72-02、TC-69-06 |
| AC-72-03 | 通過（(b) 人工：人類確認通過） | TC-72-03、TC-72-03h |
| AC-72-04 | 通過（另待人工確認） | TC-72-04a、TC-72-04h |
| AC-72-05 | 通過 | TC-72-05、TC-23-02、TC-S06、TC-23-08a／b／s |
| AC-20-03（修改） | 通過 | TC-20-03、TC-63-01 |
| AC-27-01（修改） | 通過 | TC-27-01 |
| AC-30-01（修改） | 通過 | TC-30-01 |
| AC-30-05（修改） | 通過 | TC-30-05、TC-66-03 |
| AC-31-03（修改） | 通過 | TC-31-03、TC-70-02、TC-69-05 |
| AC-32-01（修改） | 通過 | TC-32-01、TC-63-02 |
| AC-38-06（移除） | 不適用（v0.22 移除） | TC-38-06 |
| AC-38-08（修改） | 通過 | TC-38-08、TC-69-01 |
| AC-39-01（修改） | 通過 | TC-39-01、TC-63-03、TC-63-04 |
| AC-39-02（修改） | 通過 | TC-39-02、TC-66-01 |
| AC-39-05（修改） | 通過 | TC-39-05、TC-67-01 |
| AC-39-06（修改） | 通過 | TC-39-06 |
| AC-42-02（修改） | 通過（另待人工確認） | TC-42-02、TC-VER-H2 |
| AC-19-01 | 通過 | TC-S01、TC-S09、TC-72-01 |
| AC-19-04 | 通過 | TC-S02、TC-72-01 |
| AC-20-01 | 通過 | TC-20-01、TC-63-03、TC-63-04 |
| AC-22-01 | 通過（另待人工確認） | TC-22-01、TC-22-01m（待人工）、TC-70-03a、TC-22-01f（參考）、TC-M07 |
| AC-23-02 | 通過 | TC-23-02、TC-23-02b～d、TC-72-05 |
| AC-23-06 | 通過 | TC-S06、TC-72-05 |
| AC-23-08 | 通過 | TC-23-08a、TC-23-08b、TC-23-08s |
| AC-27-05 | 通過 | TC-27-05、TC-72-01 |
| AC-34-04 | 通過 | TC-34-04、TC-68-01 |
| AC-36-07 | 通過（另待人工確認） | TC-36-07a、TC-PWA-H4 |
| AC-38-02 | 通過 | TC-38-02、TC-68-01 |
| AC-39-10 | 通過 | TC-39-10、TC-63-03、TC-63-04 |

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
| 0.8 | 2026-11-04 | qa-agent | 第 7 輪（PRD v0.15，R-23 學習位置與作答紀錄）：範圍 47 個 US、314 個 AC（應驗收 41 個 US、287 個 AC，暫停 27）。新增 §1.4、§2.7（構造狀態、≤ 100ms 量法、寫入次數、容量不足模擬、C-8 改讀）、§4.4（e2e-track、e2e-track-p5、TC-T-S01、boundary-r7、qa-review-r7、diag-r7-perf、diag-r7-e117）、§6.4（TC-TRK-H1～H2）；§5、§7 依第 7 輪結果重新產生（423 個 TC） |
| 0.9 | 2026-11-04 | qa-agent | 第 8 輪（PRD v0.18，R-26；architecture §10.10 Q1～Q5）：新增 §1.5、§2.8（鎖定檢視判定、真實輸入與對照組、v1.1.0 實際資料、測試資料題庫）、§4.5（e2e-lock、e2e-legal、legal-check、boundary-r8、qa-review-r8、run-r8）、§6.5；TC-06-01、TC-23-02c、TC-D06、TC-S06、TC-36-03c、TC-42-04d、TC-VER-H3、TC-TRK-H1、TC-11-04、TC-45-03、TC-45-04-*、TC-45-06、TC-46-02、TC-46-04、TC-46-05、TC-46-06、TC-46-07、TC-46-09、TC-46-10、TC-T-S01、TC-TRK-H2 改為現行 AC；§5、§7 依第 8 輪結果重新產生 |
| 0.10 | 2026-11-05 | qa-agent | 第 9 輪（PRD v0.19，R-27、R-28；architecture §10.11 Q1～Q6）：新增 §1.6、§2.9、§4.6、§6.6；§1.6 Q3 列出的 TC 期望改為現行 AC；§5、§7 依第 9 輪結果重新產生 |
| 0.11 | 2026-11-05 | qa-agent | 第 10 輪（PRD v0.20，R-29；architecture §10.12 Q1～Q7）：新增 §1.7、§2.10（V-STT-STUB 兩種替身、`micOnStrict`、≤ 100 ms 量法、時間常數、鍵盤、AC-61 量法、AC-60-07 既有規則、舊資料相容、效能 A/B）、§4.7、§6.7（TC-58-14h、TC-59-08h、TC-58-01h）；§10.12 Q2、Q7 列出的 TC 期望改為 v0.20；§5、§7 依第 10 輪結果重新產生 |
| 0.12 | 2026-11-06 | qa-agent | 第 11 輪（1.3.1 修正輪；architecture v0.16 §10.13 Q8～Q12）：新增 §1.8（範圍、對照組、以修改時間判定的越界基準）、§2.11（click 前登錄 rAF 的畫出量法、不用 Event Timing、`getUserMedia` 次數晚 1 個畫格、AudioContext 狀態、不用 `innerWidth − clientWidth`、以 `data-ad-env` 判斷環境、同一建置內比較）、§4.8、§6.8（TC-33-03h、TC-58-01h、傳統捲軸外觀）；§5、§7 依第 11 輪結果重新產生（655 個 TC） |
| 0.13 | 2026-11-09 | qa-agent | 第 12 輪（PRD v0.21，R-30、R-31；architecture v0.17 §10.14 Q13～Q20）：新增 §1.9（範圍、受測物 BUILD_ID `981b0d2ab45de9d6`、git 越界基準）、§2.12（V-STT-STUB 暫時結果、`interimResults` 斷言、同一次畫面更新與逐畫格取樣、AC-62-05 雙頁對照、遲到事件、收音條等待、AC-62-09 版面、AC-62-10 file:// 與 Service Worker、V-LGL-02 v0.21）、§4.9（e2e-interim、diag-r12-meter、diag-r12-375、boundary-r12、qa-review-r12、run-r12）、§6.9（TC-62-12h、TC-62-07h、部署後 TC-VER-H2）；§3 記錄瀏覽器版本；§5、§7 依第 12 輪結果重新產生（686 個 TC；400 個應驗收 AC 未涵蓋 0） |
| 0.14 | 2026-11-12 | qa-agent | 第 13 輪一般驗收（PRD v0.24 R-32；architecture v0.22 §10.15 Q21～Q28）：新增 §1.10（範圍 74 個 AC、受測物 BUILD_ID `7ce555b38d85b6c4`、v1.3.2 對照組、git 越界基準）、§2.13（測試資料構造、地圖與小船判定、三處一致、n = 0／Q = 0 無資料建置、動畫與版面位移、對比與過渡畫格、卡片與按鈕、與 v1.3.2 比對、回饋列、不寫入、效能兩法與操作節奏、TC-22-01m）、§4.10（e2e-island、diag-r13-perf、e2e-pwa-r13、boundary-r13、run-r13；12 個既有套件改為 v0.22 期望值）、§5.1（新增 58 個 TC）、§6.10（TC-69-06h、TC-71-01h、TC-72-03h、TC-72-04h）、§7.1（74 個 AC 對照與判定）；§3 記錄 Chrome 157.0.8103.50 |
