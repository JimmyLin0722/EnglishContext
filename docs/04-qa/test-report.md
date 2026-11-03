---
doc: TEST-REPORT
version: 0.6
status: in-review
author: qa-agent
approved_by:
approved_at:
---

# English Master Track — 測試報告（第 5 階段驗收）

> **第 5 輪（v0.6）依據**：`docs/04-qa/test-plan.md` v0.6；PRD v0.13、契約 v0.13、architecture v0.8、tasks.json v0.7（CT-24、FE-54～FE-62 done）；受測物 `dist/english-master-track.html` 3,308,145 bytes＋`dist/site/` 8 檔（BUILD_ID `962e0f286c63e9e6`）；結論見 §0、詳情見 §16。
>
> **第 4 輪（v0.5）依據**：`docs/04-qa/test-plan.md` v0.5；PRD v0.11、契約 v0.11、architecture v0.7、tasks.json（FE-45～FE-53 done）；受測物 `dist/english-master-track.html` 3,278,334 bytes＋`dist/site/` 8 檔（BUG-003 修正後 BUILD_ID `5b5ae7a6d4bd0164`；初測 `d7085fd3fb24c46f`）；結論見 §0、詳情見 §15（BUG-003 複驗見 §15.11）。
>
> **第 3 輪（v0.4）依據**：`docs/04-qa/test-plan.md` v0.4；PRD v0.10、契約 v0.10、architecture v0.6、tasks.json v0.5；受測物 3,241,023 bytes；結論見 §0、詳情見 §14。
>
> （第 1～2 輪）依據：`docs/04-qa/test-plan.md` v0.3；PRD v0.7、契約 v0.7、architecture v0.3、tasks.json v0.2。受測物（v0.2，退回修正第 1 輪）`dist/english-master-track.html` 3,030,574 bytes（QA 以 `tools/build.mjs --out` 重建後與 `dist/` 位元組相同）；初版受測物 3,022,217 bytes。（v0.3，退回修正第 2 輪）受測物 3,047,158 bytes，只驗證 BUG-002 並回歸 AC-01-*、AC-02-*、AC-04-*、AC-05-*、AC-16-*、AC-20-02、AC-22-*，詳見 §12。執行日期 2026-10-30。v0.2 範圍只驗證 BUG-001、BUG-002，並回歸 AC-08-*、AC-15-*、AC-16-*、AC-20-02、AC-22-*、靜態與越界檢查，詳見 §11；其餘 TC 沿用 v0.1 結果（本輪 `npm run test:e2e` 全套重跑，其餘 TC 結果不變）。

## 0. 目前有效結論（第 5 輪，PRD v0.13 版面風格，2026-11-03）

> 本節與 §16 為第 5 輪（PRD v0.13：US-38～US-41 版面與視覺，修改 30 個 AC）的結論，取代第 4 輪結論（保留於 §0.1、§15）。

| 項目 | 結果 |
| :--- | :--- |
| 受測物 | `dist/english-master-track.html` 3,308,145 bytes、`dist/site/` 8 檔（BUILD_ID `962e0f286c63e9e6`）；QA 重建與 `dist/` 逐位元組相同（TC-S09）；`dist/site/index.html` 與交付檔相同（TC-PS-01） |
| TC 總數 | 351 |
| TC 結果 | 通過 309、失敗 0、待人工 23、不適用（暫停）19；Edge 冒煙 40 項：通過 35、失敗 0、其餘不適用（暫停） |
| AC 覆蓋率 | 應驗收 248 個 AC，未涵蓋 0（覆蓋 100%）；暫停 22 個標「不適用（暫停）」 |
| AC 判定 | 通過 239（其中 52 個另待人工確認）、待人工 9、失敗 0、不適用（暫停）22 |
| 新增 27 個 AC | 通過 27 / 27（明細 §16.3） |
| 修改 30 個 AC | 通過 26 / 30；待人工 AC-33-02、AC-34-02、AC-34-03、AC-34-05（實機必要項，沿用第 3、4 輪判定） |
| 待人工的 AC | AC-23-04、AC-27-03、AC-33-01、AC-33-02、AC-34-02、AC-34-03、AC-34-05、AC-35-03、AC-36-07（皆為實機必要項，自動化代理驗證已通過或無法自動化） |
| 缺陷 | 本輪新開 0 張；BUG-001～BUG-003 維持 verified |
| 越界檢查 | 通過：與 git HEAD `4fcbb9f` 相比變動的 PG 檔案皆在 CT-24、FE-54～FE-62 paths 內（超出 0）；授權例外為 `docs/mockups/` 與上游文件；`tests/` 在本輪 QA 開始前未被 PG 修改 |
| 安全檢查 | 通過：`file://` 連網與斷網皆無額外請求（TC-38-05、TC-21-01）；標題列圖示為內嵌 SVG、無 `<img>`、無 `xmlns`；CSS 無 `@font-face`、`url(`；新增文字皆以 `textContent` 寫入（TC-S03 禁用 DOM API 0）；XSS 回歸（TC-04-09、TC-24-07）通過 |
| 需要人類 | 見 §16.8 |

### 0.1 第 4 輪結論（歷史，PRD v0.11，2026-11-03）

> 本節與 §15 為第 4 輪（PRD v0.11，新增 PWA）的結論，已由第 5 輪（§0）取代。

| 項目 | 結果 |
| :--- | :--- |
| 受測物 | `dist/english-master-track.html` 3,278,334 bytes、`dist/site/` 8 檔（BUILD_ID `5b5ae7a6d4bd0164`，BUG-003 修正後重建）；QA 連續建置 2 次與 `dist/` 逐位元組相同；雙擊開啟的 HTML 與 `dist/site/index.html` 逐位元組相同（TC-36-01a、TC-PS-01、TC-S09） |
| TC 總數 | 311（自動化 284、QA 檢視 7、人工 20） |
| TC 結果 | 通過 272、失敗 0、待人工 20、不適用（暫停）19（BUG-003 複驗後；初測 TC-34-03a 失敗）；Edge 冒煙 40 項：通過 35、不適用 5、失敗 0 |
| AC 覆蓋率 | 應驗收 221 個 AC 全部有對應 TC（221 / 221 = 100%）；暫停 22 個標「不適用（暫停）」 |
| AC 判定 | 通過 212（其中 47 個另待人工確認）、待人工 9、失敗 0、不適用（暫停）22 |
| 待人工的 9 個 AC | AC-34-02、AC-34-03、AC-34-05、AC-35-03、AC-36-07（第 4 輪：實機安裝與圖示外觀、iOS、正式部署；AC-34-03 自動化已通過）；AC-33-01、AC-33-02、AC-23-04、AC-27-03（沿用第 3 輪） |
| 缺陷 | BUG-003（minor，owner 主控 MC-01，`icon-512.png` 底邊灰線）：主控修正 1 次後複驗通過，**verified**（retries 0）；BUG-001、BUG-002 維持 verified；目前無 open 缺陷 |
| 越界檢查 | 通過：第 4 輪修改的 `src/`、`tools/`、`dist/` 檔案皆在 FE-45～FE-53 paths 內（超出 0）；授權例外 9 個、主控修改 `static.yml` 1 個；不屬於任何任務 0 |
| 安全檢查 | 通過：`file://` 請求 0、無 service worker、Console 無錯誤；https 版環境層請求（含 service worker）全部為同源、部署目錄內 GET；跨來源 0；快取只有預先快取 7 項；IndexedDB 0；PWA 文字以 `textContent` 呈現 |
| MC-03 模擬 | 依 architecture §5.2 新 workflow，在 LF 複本建置並執行 Verify 步驟：`dist/site/` 恰 8 檔，通過（TC-36-07a）；但 CI 所需 12 個檔案尚未被 git 追蹤（§15.8 H-4-2） |
| 需要人類 | 見 §15.8、彙整清單見 §15.12 |

### 0.2 第 3 輪結論（歷史，PRD v0.10，2026-11-02）

> 本節與 §14 為第 3 輪（範圍 v0.8 + v0.9 + v0.10，依據 test-plan v0.4）的結論，取代 §1～§12 的第 1～2 輪結果（PRD v0.7）。§1～§12 保留為歷史紀錄。

| 項目 | 結果 |
| :--- | :--- |
| 受測物 | `dist/english-master-track.html` 3,241,023 bytes；QA 重建後位元組相同（TC-S09） |
| TC 總數 | 264（自動化 242、QA 檢視 7、人工 15） |
| TC 結果 | 通過 230、失敗 0、待人工 15、不適用（暫停）19 |
| AC 覆蓋率 | 應驗收 192 個 AC 全部有對應 TC（192 / 192 = 100%）；暫停 22 個標「不適用（暫停）」 |
| AC 判定 | 通過 188（其中 37 個自動化通過、另待人工確認）、待人工 4、失敗 0、不適用（暫停）22 |
| 待人工的 4 個 AC | AC-33-01（V-MIC-1）、AC-33-02（V-MIC-2）、AC-23-04（TC-M08 原創性搜尋）、AC-27-03（TC-M09 實機虛擬鍵盤） |
| 缺陷 | 本輪新開 0 張；BUG-001、BUG-002 維持 verified |
| 越界檢查 | 通過：不屬於任何任務的檔案 0；第 3 輪增量修改的 36 個檔案皆在 FE-34～FE-44 paths 內；`src/data/`、`sources/`、`english_master_track.md` 未被修改 |
| 安全檢查 | 通過：XSS 以純文字呈現、禁用 DOM API 0、外部資源 0、完整操作網路請求 0；麥克風音訊只接到 `AnalyserNode`，無 `MediaRecorder`；使用收音條後 localStorage、IndexedDB、Cache Storage 無音訊或音量資料 |
| 需要人類 | 見 §14.8 |

## 1. 摘要（第 1～2 輪，PRD v0.7，歷史）

| 項目 | 結果 |
| :--- | :--- |
| TC 總數 | 160（自動化 146、QA 檢視 6、人工 8；v0.2 新增 TC-16-01c；v0.3 新增 TC-22-01r） |
| 通過 | 152 |
| 失敗 | 0（v0.3：TC-22-01、TC-16-01b、TC-16-01c 依 test-plan §2.3 多輪判定轉為通過） |
| 待人工 | 8（TC-M01～TC-M08） |
| AC 覆蓋率 | 141 / 141 = 100%（每個 AC 至少 1 個 TC） |
| AC 判定 | 通過 116；自動化通過、另待人工確認 25；失敗 0。（v0.3）AC-16-01 回到通過（另待人工 TC-M07 複測）；AC-22-01 轉為「自動化通過；待人工 TC-M07」 |
| 缺陷 | 2 張：BUG-001（minor）**verified**；BUG-002（major）**verified**（第 2 輪，嚴格量法，retries 1） |
| 越界檢查 | 通過：無任何檔案不屬於任務 paths；`sources/`、`english_master_track.md`、`docs/` 未發現 PG 修改。（v0.3）本輪 PG 修改的 7 個原始檔皆在 FE-09／FE-10／FE-16／FE-19 paths 內（§12.5） |
| 安全檢查 | 通過：XSS 字串在自訂單字表單、清單、抽認卡、匯入備份皆以純文字呈現，無 `img`／腳本執行；產品程式無 `innerHTML`／`outerHTML`／`insertAdjacentHTML`／`document.write`；產物無任何外部資源引用；完整操作期間頁面網路請求 0 |
| 內容抽查 | V-VOC-18 抽 301 筆、不合格 0；V-VOC-17 187 筆判斷全數正確且紀錄無缺列；Part 5 正解唯一性 40 題全數正確 |

### 1.1 缺陷清單

| BUG | 嚴重度 | owner | task | AC | 一句話 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| BUG-001 | minor | pg-frontend | FE-12 | AC-08-14 | （verified）同一張卡已有評分時，離線再按麥克風會顯示「語音辨識需要網路連線」，但前一次的分數仍留在畫面上 |
| BUG-002 | major | pg-frontend | FE-16 | AC-22-01、AC-16-01 | （verified，第 2 輪）4 倍降速切到句型庫、自訂器（嚴格量法，計時到延後顯示的區塊也繪製完成）與分批補齊前的第一鍵，依多輪判定皆符合；最終以 TC-M07 為準 |

## 2. 執行紀錄

| 項目 | 指令 | 結果（QA 自行執行） |
| :--- | :--- | :--- |
| PG 單元測試 | `npm test` | 342 項全部通過（參考，非驗收依據）；v0.2：354 項全部通過、todo 0 |
| 資料自驗 | `npm run validate:data` | 錯誤 0、警告 61（V-VOC-09 原創原因 40、V-VOC-14 釋義重複 13、V-VOC-17 8；均為契約允許的警告，QA 已逐項核對紀錄，見 TC-D18） |
| QA 驗收全套 | `npm run test:e2e`（`node tests/run-all.mjs`） | 結果彙整於 `tests/results/summary.json`；各套件結果 `tests/results/*.json` |
| 單獨重跑 | `node tests/e2e/e2e-env.mjs`、`node tests/e2e/e2e-persist.mjs` | 最後一次結果已寫入 `tests/results/` |
| （v0.3）第 2 輪 | `npm test`、`npm run test:e2e`、`node tests/e2e/e2e-env.mjs` × 2 | 見 §12.1 |
| 跨瀏覽器 | `QA_BROWSER=edge node tests/e2e/e2e-goal.mjs` | Edge 25/25 通過（`tests/results/e2e-goal-edge.json`） |

環境：Windows 11 Pro、Node v24.15.0、Google Chrome（無頭，`--headless=new`）與 Microsoft Edge。未安裝任何套件；`package.json` 只新增 `scripts.test:e2e`（architecture SD-FB-02 允許 QA 修改的範圍）。測試檔全部位於 `tests/`。

## 3. AC 判定

「自動化通過；待人工」表示以模擬環境驗證通過，但 AC 本身需要真機（麥克風、語音、斷網、實機觸控、基準環境）才能完整判定，見 §6。

| AC | 對應 TC | 判定 |
| :--- | :--- | :--- |
| AC-01-01 | TC-01-01 | 通過 |
| AC-01-02 | TC-01-02 | 通過 |
| AC-01-03 | TC-01-03 | 通過 |
| AC-01-04 | TC-01-04 | 通過 |
| AC-01-05 | TC-01-05 | 通過 |
| AC-01-06 | TC-01-06 | 通過 |
| AC-01-07 | TC-01-07 | 通過 |
| AC-02-01 | TC-02-01 | 通過 |
| AC-02-02 | TC-02-02 | 通過 |
| AC-02-03 | TC-02-03 | 通過 |
| AC-02-04 | TC-02-04 | 通過 |
| AC-02-05 | TC-02-05a、TC-02-05b | 通過 |
| AC-02-06 | TC-02-06 | 通過 |
| AC-02-07 | TC-02-07、TC-M07 | 自動化通過；待人工 TC-M07 |
| AC-02-08 | TC-02-08 | 通過 |
| AC-02-09 | TC-02-09 | 通過 |
| AC-02-10 | TC-02-10a、TC-02-10b | 通過 |
| AC-03-01 | TC-03-06 | 通過 |
| AC-03-02 | TC-03-06 | 通過 |
| AC-03-03 | TC-01-07 | 通過 |
| AC-03-04 | TC-03-06 | 通過 |
| AC-03-05 | TC-03-05 | 通過 |
| AC-03-06 | TC-D01、TC-03-06 | 通過 |
| AC-03-07 | TC-D02 | 通過 |
| AC-03-08 | TC-D03 | 通過 |
| AC-03-09 | TC-D04 | 通過 |
| AC-04-01 | TC-04-01 | 通過 |
| AC-04-02 | TC-04-02 | 通過 |
| AC-04-03 | TC-04-03 | 通過 |
| AC-04-04 | TC-04-04、TC-S07 | 通過 |
| AC-04-05 | TC-04-05 | 通過 |
| AC-04-06 | TC-04-06 | 通過 |
| AC-04-07 | TC-04-07 | 通過 |
| AC-04-08 | TC-04-08、TC-04-08b | 通過 |
| AC-04-09 | TC-S03 | 通過 |
| AC-05-01 | TC-D11、TC-05-01 | 通過 |
| AC-05-02 | TC-D11、TC-05-02 | 通過 |
| AC-05-03 | TC-D11、TC-05-03 | 通過 |
| AC-05-04 | TC-05-02 | 通過 |
| AC-05-05 | TC-05-05 | 通過 |
| AC-06-01 | TC-D06、TC-06-01 | 通過 |
| AC-06-02 | TC-D06、TC-D07、TC-06-02 | 通過 |
| AC-06-03 | TC-06-02 | 通過 |
| AC-06-04 | TC-06-04 | 通過 |
| AC-06-05 | TC-06-04 | 通過 |
| AC-06-06 | TC-06-06、TC-04-08b | 通過 |
| AC-06-07 | TC-D06、TC-06-07 | 通過 |
| AC-06-08 | TC-D05 | 通過 |
| AC-07-01 | TC-07-01、TC-M02 | 自動化通過；待人工 TC-M02 |
| AC-07-02 | TC-07-01、TC-M02 | 自動化通過；待人工 TC-M02 |
| AC-07-03 | TC-07-03、TC-M02 | 自動化通過；待人工 TC-M02 |
| AC-07-04 | TC-07-04、TC-M02 | 自動化通過；待人工 TC-M02 |
| AC-07-05 | TC-07-05、TC-M02 | 自動化通過；待人工 TC-M02 |
| AC-08-01 | TC-08-01、TC-M01 | 自動化通過；待人工 TC-M01 |
| AC-08-02 | TC-08-02 | 通過 |
| AC-08-03 | TC-08-03 | 通過 |
| AC-08-04 | TC-08-04 | 通過 |
| AC-08-05 | TC-08-05 | 通過 |
| AC-08-06 | TC-08-06 | 通過 |
| AC-08-07 | TC-08-06 | 通過 |
| AC-08-08 | TC-08-06 | 通過 |
| AC-08-09 | TC-08-09、TC-M01 | 自動化通過；待人工 TC-M01 |
| AC-08-10 | TC-08-10 | 通過 |
| AC-08-11 | TC-08-11 | 通過 |
| AC-08-12 | TC-08-12 | 通過 |
| AC-08-13 | TC-08-13、TC-M01 | 自動化通過；待人工 TC-M01 |
| AC-08-14 | TC-08-14、TC-08-14b、TC-M01 | 自動化通過（v0.2，BUG-001 verified）；待人工 TC-M01 |
| AC-09-01 | TC-09-01 | 通過 |
| AC-09-02 | TC-D17、TC-09-02 | 通過 |
| AC-09-03 | TC-09-03 | 通過 |
| AC-09-04 | TC-09-04 | 通過 |
| AC-09-05 | TC-09-05 | 通過 |
| AC-09-06 | TC-09-06 | 通過 |
| AC-09-07 | TC-09-07 | 通過 |
| AC-10-01 | TC-D12 | 通過 |
| AC-10-02 | TC-D12、TC-10-02 | 通過 |
| AC-11-01 | TC-11-01、TC-D20 | 通過 |
| AC-11-02 | TC-D12、TC-11-01 | 通過 |
| AC-11-03 | TC-11-01 | 通過 |
| AC-11-04 | TC-11-04 | 通過 |
| AC-11-05 | TC-11-05 | 通過 |
| AC-11-06 | TC-11-01 | 通過 |
| AC-11-07 | TC-11-04 | 通過 |
| AC-12-01 | TC-12-01 | 通過 |
| AC-12-02 | TC-D13、TC-12-01 | 通過 |
| AC-12-03 | TC-D13、TC-12-01 | 通過 |
| AC-13-01 | TC-13-01 | 通過 |
| AC-13-02 | TC-13-01 | 通過 |
| AC-13-03 | TC-13-01 | 通過 |
| AC-13-04 | TC-13-01 | 通過 |
| AC-14-01 | TC-D14、TC-14-01 | 通過 |
| AC-14-02 | TC-14-02 | 通過 |
| AC-15-01 | TC-15-01 | 通過 |
| AC-15-02 | TC-D15、TC-15-02 | 通過 |
| AC-15-03 | TC-15-02 | 通過 |
| AC-16-01 | TC-16-01、TC-16-01b、TC-16-01c、TC-M07 | 通過（v0.3，BUG-002 verified；TC-16-01b、TC-16-01c 依多輪判定）；另待人工 TC-M07 |
| AC-16-02 | TC-16-02 | 通過 |
| AC-16-03 | TC-16-03 | 通過 |
| AC-16-04 | TC-16-04a、TC-16-04b | 通過 |
| AC-17-01 | TC-17-01 | 通過 |
| AC-17-02 | TC-17-02 | 通過 |
| AC-17-03 | TC-09-03 | 通過 |
| AC-17-04 | TC-17-04a、TC-17-04b | 通過 |
| AC-17-05 | TC-17-05 | 通過 |
| AC-17-06 | TC-17-06 | 通過 |
| AC-18-01 | TC-18-01、TC-M04 | 自動化通過；待人工 TC-M04 |
| AC-18-02 | TC-18-02 | 通過 |
| AC-18-03 | TC-18-03 | 通過 |
| AC-18-04 | TC-18-04 | 通過 |
| AC-18-05 | TC-18-05 | 通過 |
| AC-18-06 | TC-21-01 | 通過 |
| AC-24-01 | TC-24-01、TC-18-03、TC-M06 | 自動化通過；待人工 TC-M06 |
| AC-24-02 | TC-24-01 | 通過 |
| AC-24-03 | TC-24-03、TC-M06 | 自動化通過；待人工 TC-M06 |
| AC-24-04 | TC-24-04 | 通過 |
| AC-24-05 | TC-24-05 | 通過 |
| AC-24-06 | TC-24-06 | 通過 |
| AC-24-07 | TC-24-07、TC-S07 | 通過 |
| AC-24-08 | TC-24-08 | 通過 |
| AC-24-09 | TC-24-09 | 通過 |
| AC-23-01 | TC-23-01 | 通過 |
| AC-23-02 | TC-D10、TC-23-02、TC-14-02、TC-D18 | 通過 |
| AC-23-03 | TC-D08、TC-D18、TC-D19 | 通過 |
| AC-23-04 | TC-D16、TC-M08 | 自動化通過；待人工 TC-M08 |
| AC-23-05 | TC-D09 | 通過 |
| AC-23-06 | TC-S06 | 通過 |
| AC-19-01 | TC-S01、TC-S08、TC-S09 | 通過 |
| AC-19-02 | TC-19-02a、TC-X-edge、TC-M03 | 自動化通過；待人工 TC-M03 |
| AC-19-03 | TC-21-01、TC-M04 | 自動化通過；待人工 TC-M04 |
| AC-19-04 | TC-S02 | 通過 |
| AC-20-01 | TC-20-01、TC-M05 | 自動化通過；待人工 TC-M05 |
| AC-20-02 | TC-20-02、TC-M05 | 自動化通過；待人工 TC-M05 |
| AC-20-03 | TC-20-03、TC-M05 | 自動化通過；待人工 TC-M05 |
| AC-21-01 | TC-21-01、TC-M01 | 自動化通過；待人工 TC-M01 |
| AC-21-02 | TC-S04 | 通過 |
| AC-21-03 | TC-21-03、TC-S05 | 通過 |
| AC-22-01 | TC-22-01、TC-22-01r、TC-M07 | 自動化通過（v0.3，嚴格量法 + 多輪判定，BUG-002 verified）；待人工 TC-M07 |
| AC-22-02 | TC-22-02b、TC-22-02、TC-M07 | 自動化通過；待人工 TC-M07 |
| AC-22-03 | TC-22-03b、TC-22-03、TC-M07 | 自動化通過；待人工 TC-M07 |
| AC-22-04 | TC-22-04、TC-02-07、TC-M07 | 自動化通過；待人工 TC-M07 |
| AC-22-05 | TC-22-05a、TC-M07 | 自動化通過；待人工 TC-M07 |

## 4. TC 結果

| TC | 對應 AC | 結果 | 實測摘要 |
| :--- | :--- | :--- | :--- |
| TC-01-01 | AC-01-01 | 通過 | 橘 10～215 分 1,000 字；棕 220～465 分 2,809 字；綠 470～725 分 5,620 字；藍 730～855 分 待定 鎖定 即將開放；金 860～990 分 待定 鎖定 即將開放；官方門檻/Tier 字樣=false |
| TC-01-02 | AC-01-02 | 通過 | 套用橘後生效 橘；點綠套用後生效 綠、抽認卡 共 5620 張 |
| TC-01-03 | AC-01-03 | 通過 | 點棕未套用後離開：生效 綠、共 5620 張；主控台 目前目標分數=470｜目前目標色級=綠｜目前生效色級=綠｜每日新字量=15 字/天 |
| TC-01-04 | AC-01-04 | 通過 | 重載後 生效 棕、目標分數 300、輸入框 300 |
| TC-01-05 | AC-01-05 | 通過 | 300 點綠 → 470（綠、15 字/天、54 週）；500 點綠 → 500 |
| TC-01-06 | AC-01-06 | 通過 | 分數對應色級 棕；目前生效 綠；共 5620 張 |
| TC-01-07 | AC-01-07、AC-03-03 | 通過 | 點藍 → 730、「藍（即將開放）」、提示=true；套用後目標 藍、生效「綠（內建上限）」、共 5620 張；點金 → 860；套用後目標 金、生效「綠（內建上限）」、共 5620 張 |
| TC-02-01 | AC-02-01 | 通過 | 滑桿 720 → 輸入框 720；輸入 650 → 滑桿 650；鍵盤右鍵 → 655/655 |
| TC-02-02 | AC-02-02 | 通過 | 「5」→ 提示「請輸入 10～990 的分數」試算 綠/54 週；「995」→ 提示「請輸入 10～990 的分數」試算 綠/54 週；「」→ 提示「請輸入 10～990 的分數」試算 綠/54 週；「abc」→ 提示「請輸入 10～990 的分數」試算 綠/54 週；「1e2」→ 提示「請輸入 10～990 的分數」試算 綠/54 週；「７００」→ 提示「請輸入 10～990 的分數」試算 綠/54 週 |
| TC-02-03 | AC-02-03 | 通過 | 每日新字量：10 字/天、10 字/天、10 字/天、10 字/天、15 字/天、15 字/天、20 字/天、20 字/天、20 字/天、20 字/天 |
| TC-02-04 | AC-02-04 | 通過 | 對應色級：橘、橘、棕、棕、綠、綠、藍（即將開放）、藍（即將開放）、金（即將開放）、金（即將開放） |
| TC-02-05a | AC-02-05 | 通過 | S=100 → 1,000 字、15 週；S=300 → 2,809 字、41 週；S=600 → 5,620 字、54 週（c=0；N_G=5,620 → ⌈5620/105⌉=54） |
| TC-02-05b | AC-02-05 | 通過 | c=409 字、S=300 → 35 週（預期 35 週） |
| TC-02-06 | AC-02-06 | 通過 | c=1,000 字、S=100 → 0 週、顯示「已達成目標字量」=true |
| TC-02-07 | AC-02-07、AC-22-04 | 通過 | 10 次（輸入事件到繪製後）ms：2.3、8.6、19.2、14.8、18.9、14.7、17.2、16、16、17.9；最大 19.2（無頭 Chrome、未降速；基準環境量測列人工 TC-M07） |
| TC-02-08 | AC-02-08 | 通過 | 重載前 735/藍（即將開放）/41 週；重載後 輸入框 735、滑桿 735、藍（即將開放）/41 週 |
| TC-02-09 | AC-02-09 | 通過 | 723 → 725、722 → 720；滑桿 step=5 |
| TC-02-10a | AC-02-10 | 通過 | 色級「藍（即將開放）」、字量「待定」、20 字/天、41 週、旁註=true、提示=true（⌈5620/140⌉=41） |
| TC-02-10b | AC-02-10 | 通過 | c=5,620 字、S=800 → 0 週 |
| TC-03-05 | AC-03-05 | 通過 | 套用前 第 5 / 5620 張/true；套用橘後 第 1 / 1000 張/false/the |
| TC-03-06 | AC-03-06、AC-03-01、AC-03-02、AC-03-04 | 通過 | orange → 共 1000 張；brown → 共 2809 張；green → 共 5620 張 |
| TC-04-01 | AC-04-01 | 通過 | 英文單字（必填）、中文釋義（必填）、音標（選填）、詞性（選填）、搭配詞（選填）、論文例句（選填） |
| TC-04-02 | AC-04-02 | 通過 | toast ["已新增「kubernetes」"]；清單「kubernetes /ˌkubɚˈnɛtiz/ n. 容器編排平台 自訂擴充 刪除」；單字集 5620 → 5621；卡片 kubernetes、第 5621 / 5621 張、TTS 1.0x/0.75x、麥克風=true；朗讀 [{"text":"kubernetes","lang":"en-US","rate":1,"voice":"QA en-US local","queueBefore":false}] |
| TC-04-03 | AC-04-03 | 通過 | 英文空白 → 「此欄位為必填，請輸入內容」；釋義空白 → 「此欄位為必填，請輸入內容」；自訂字數 0 → 0 |
| TC-04-04 | AC-04-04 | 通過 | 第二筆（英文單字欄為 XSS 字串）結果 {"word":"","meaning":"","phonetic":"","pos":"","collocation":"","example":"","message":""}；清單含原文字元 2 筆、img/script 元素 0；卡片顯示原文=true；整頁 img/額外 script 0；腳本未執行=true；alert 對話框 0（studySet 索引 5621/5621） |
| TC-04-05 | AC-04-05 | 通過 | 重載前後自訂單字 13 / 13 筆，內容完全相同=true |
| TC-04-06 | AC-04-06 | 通過 | 內建 Office → 「單字已存在」；自訂已有 Latency 再加 LATENCY → 「單字已存在」 |
| TC-04-07 | AC-04-07 | 通過 | 刪除前 5640 張、刪除後 共 5639 張；確認對話框：無；重載後清單含 Monetization=false |
| TC-04-08 | AC-04-08 | 通過 | 刪除目前卡 Rebranding（第 5635 張）後顯示 Upselling（預期下一張 Upselling、第 5635 / 5638 張）；刪除最後一張 Divestiture 後顯示 Churn（預期前一張 Churn、第 5637 / 5637 張） |
| TC-04-08b | AC-04-08、AC-06-06 | 通過 | 刪光後空狀態顯示=true、空白卡=false |
| TC-05-01 | AC-05-01 | 通過 | 資工、商管、生醫統計 |
| TC-05-02 | AC-05-02、AC-05-04 | 通過 | 第一次：10 字、提示「已注入 10 個單字」；第二次：10 字、提示「已注入 0 個單字（皆已存在）」 |
| TC-05-03 | AC-05-03 | 通過 | 商管 10 字（Monetization,Disintermediation,Commoditization,Onboarding,Crowdfunding,Rebranding,Upselling,Franchisee,Churn,Divestiture）；生醫統計 10 字（Heterogeneous,Covariate,Confounder,Stratification,Randomization,Multicollinearity,Heteroscedasticity,Biomarker,Imputatio… |
| TC-05-05 | AC-05-05 | 通過 | 卡片 Heterogeneous（第 5621 / 5630 張）出處「自訂擴充」；0.75x 朗讀 [{"text":"Heterogeneous","lang":"en-US","rate":0.75,"voice":"QA en-US local","queueBefore":false}]；STT 結果「辨識吻合度  100 綠燈  此分數比對的是語音辨識出的文字，不代表音素層級的發音準確度」 |
| TC-06-01 | AC-06-01 | 通過 | 正面：the /ðə/、欄位 多益常考搭配詞、TTS 1.0x/0.75x、麥克風=true、標示「需要連網」 |
| TC-06-02 | AC-06-02、AC-06-03 | 通過 | 點卡片 → 背面（stadium）：詞性=n. 名詞；中文釋義=露天大型運動場；學術文獻應用情境=Stadium construction；完整例句=The concert will tak；再點 → 正面=true；「翻面」鈕 → true |
| TC-06-04 | AC-06-04、AC-06-05 | 通過 | 第 1 張：上一張停用=true、點擊後 第 1 / 5620 張；背面按下一張 → 第 2 / 5620 張、正面=true；最後一張：下一張停用=true、點擊後 第 5620 / 5620 張 |
| TC-06-06 | AC-06-06 | 通過 | 空狀態「目前單字集是空的，沒有可以顯示的單字卡。  請到自訂器套用目標分數，或新增自訂單字、注入領域範本。  前往自訂器」；顯示卡片=false；按鈕導向 customizer（以無內建資料的 fixture 建置驗證） |
| TC-06-07 | AC-06-07 | 通過 | the 背面欄位 詞性/中文釋義/完整例句｜抽查 500 張問題 0｜自訂卡正面 多益常考搭配詞=—；背面 詞性=—；中文釋義=只填必填；學術文獻應用情境=—；完整例句=—；音標 — |
| TC-07-01 | AC-07-01、AC-07-02 | 通過 | [{"text":"Latency","lang":"en-US","rate":1,"voice":"QA en-US local","queueBefore":false},{"text":"Latency","lang":"en-US","rate":0.75,"voice":"QA en-US local","queueBefore":false}] |
| TC-07-03 | AC-07-03 | 通過 | cancel 次數：播放前 5 → 第一次播放 6 → 播放中再按 7 → 切換卡片 8；每次 speak 前皆已無朗讀中=true |
| TC-07-04 | AC-07-04 | 通過 | 按鈕 [{"aria":"true","title":"此瀏覽器不支援語音朗讀","disabled":false,"opacity":"0.5","cursor":"not-allowed"},{"aria":"true","title":"此瀏覽器不支援語音朗讀","disabled":false,"opacity":"0.5","cursor":"not-allowed"}]；點擊 toast ["此瀏覽器不支援語音朗讀"]；其他功能（翻面）正常=true |
| TC-07-05 | AC-07-05 | 通過 | toast ["此裝置未安裝美式英語語音"]；實際朗讀 0 次；未處理例外 0 |
| TC-08-01 | AC-08-01 | 通過 | lang=en-US、interimResults=false；按鈕狀態 listening、文字「聆聽中」 |
| TC-08-02 | AC-08-02 | 通過 | 麥克風 aria-disabled=true、title「建議使用 Google Chrome / Edge」、disabled 屬性=false；toast ["建議使用 Google Chrome / Edge"]；狀態 idle |
| TC-08-03 | AC-08-03 | 通過 | Latency. → 100、綠燈 |
| TC-08-04 | AC-08-04 | 通過 | address ← adress → 86、黃燈 |
| TC-08-05 | AC-08-05 | 通過 | sitting ← kitten → 57、紅燈 |
| TC-08-06 | AC-08-06、AC-08-07、AC-08-08 | 通過 | 100→100/綠燈；90→90/綠燈；89→89/黃燈/提示；65→65/黃燈/提示；64→64/紅燈/並列；0→0/紅燈/並列；徽章底色 {"綠燈":"rgb(22, 163, 74)","黃燈":"rgb(202, 138, 4)","紅燈":"rgb(220, 38, 38)"} |
| TC-08-09 | AC-08-09（含 §7.6 錯誤對照表） | 通過 | not-allowed：「需要麥克風權限  開啟方式：點網址列左側的圖示（鎖頭或資訊圖示），將「麥克風」設為允許，再按一次麥克風按鈕。」、idle；service-not-allowed：「需要麥克風權限  開啟方式：點網址列左側的圖示（鎖頭或資訊圖示），將「麥克風」設為允許，再按一次麥克風按鈕。」、idle；audio-capture：「需要麥克風權限  請確認裝置已連接麥克風；並點網址列左側的圖示（鎖頭或資訊圖示），將「麥克風」設為允許。」、idle；network：「語音辨識需要網路連線」、idle；no-s… |
| TC-08-10 | AC-08-10 | 通過 | 空結果：「未偵測到語音，請再試一次」、idle；逾時：「未偵測到語音，請再試一次」、idle；再按停止：listening → idle、訊息「」 |
| TC-08-11 | AC-08-11 | 通過 | 標題「辨識吻合度」；說明「此分數比對的是語音辨識出的文字，不代表音素層級的發音準確度」；畫面含「發音評分」=false |
| TC-08-12 | AC-08-12 | 通過 | Comply with. → 100；complied with → 75、黃燈 |
| TC-08-13 | AC-08-13 | 通過 | 常駐標示「需要連網」；首次按下說明「語音辨識由瀏覽器提供，您的語音會傳送到瀏覽器廠商（如 Google、Microsoft）的伺服器處理；本系統不保存、不上傳錄音」[我知道了/取消]；取消後 starts 0→0、狀態 idle、已讀 false；再按仍顯示說明=true；我知道了 → starts 1、狀態 listening、localStorage 已讀 true；之後再按顯示說明=false |
| TC-08-14 | AC-08-14 | 通過 | 離線 navigator.onLine=false：「語音辨識需要網路連線」、idle、未開始辨識=true、顯示分數=false；辨識中 network 錯誤：「語音辨識需要網路連線」、idle、顯示分數=false |
| TC-08-14b | AC-08-14 | 通過（v0.2） | 先評分 100/綠燈，離線再按麥克風：訊息「語音辨識需要網路連線」、idle、分數區文字「」、lastResult=null；恢復連線再評分 100/綠燈（v0.1 失敗：分數區仍顯示前次分數） |
| TC-09-01 | AC-09-01 | 通過 | 測驗模式：he、4 選項；再點 → 抽認卡=true |
| TC-09-02 | AC-09-02 | 通過 | the：（定冠詞）那 ／ 少數；少數民族；未成年 ／ 麥克風；擴音器 ／ 收音機；無線電；無線電廣播；a：移民；移入的 ／ 控告；起訴；提出訴訟 ／ 國家；鄉村；地區；鄉下的 ／ （不定冠詞）一個；claim：慷慨的；自由主義的；自由主義者 ／ 簽名；簽字；識別標誌 ／ 要求；主張；斷言；認領 ／ 消防隊員；stadium：帳篷；帷幕；宿營 ／ 最少的；最小的；最少 ／ 露天大型運動場 ／ 信託的；受信託的；受託人；undergraduate：歌手 ／ 大學部學生；大學生的 ／ 完全地；十分地；圓滿地 ／ 經紀人；… |
| TC-09-03 | AC-09-03、AC-17-03 | 通過 | 答對：狀態 neutral,neutral,correct,neutral、鎖定=true、再點不變=true；答錯：correct(rgb(220, 252, 231)),wrong(rgb(254, 226, 226)),neutral(rgb(255, 255, 255)),neutral(rgb(255, 255, 255))；同字答對兩次後掌握數 1（主控台「1 字」）、答題 2/2 |
| TC-09-04 | AC-09-04 | 通過 | localStorage：答題 3、答對 2、已掌握 ["do"] |
| TC-09-05 | AC-09-05 | 通過 | qaquizword：領帶；關係；平局；打結 ／ 性別 ／ 忙碌的；熱鬧的；沒空的 ／ 四選一自訂測試 |
| TC-09-06 | AC-09-06 | 通過 | 3 字時按測驗模式：提示 ["單字數不足 4 個，無法產生選項"]；模式 card |
| TC-09-07 | AC-09-07 | 通過 | 20 次正解位置：DBDADABCCCDABADACCCC |
| TC-10-02 | AC-10-02 | 通過 | 第 1 題：固定介系詞搭配、空格=true、選項 A.for B.with C.to D.at；前 8 題涵蓋題型 4 種 |
| TC-11-01 | AC-11-01、AC-11-02、AC-11-03、AC-11-06 | 通過 | 答錯：correct(rgb(220, 252, 231)),wrong(rgb(254, 226, 226)),locked(rgb(255, 255, 255)),locked(rgb(255, 255, 255))；答對：locked,locked,correct,locked；解析兩段非空=true；計數 0/0 → 答錯 1/0 → 重複點擊 1/0 → 答對 2/1 |
| TC-11-04 | AC-11-04、AC-11-07 | 通過 | 下一題未作答=true；結算「Part 5 模擬測驗 本輪結算 答對 197 / 200 累計答對 197 / 200 重新開始」、按鈕 重新開始；累計 200/197；重新開始後 第 1 / 200 題、未作答=true、累計 200/197 |
| TC-11-05 | AC-11-05 | 通過 | 重載前 第 5 / 200 題（未作答=true）；重載後 第 5 / 200 題、未作答=true |
| TC-12-01 | AC-12-01、AC-12-02、AC-12-03 | 通過 | 例句 50 句逐一切換檢查；缺主詞/動詞 0；色系（文字/底色）主詞 藍/藍、動詞 紅/紅、受詞 綠/綠、修飾 紫/紫；圖例 主主詞、動核心動詞、受受詞／補語、修修飾語／子句／插入語；任意句輸入框不存在=true |
| TC-13-01 | AC-13-01、AC-13-02、AC-13-03、AC-13-04 | 通過 | 淡化：修飾語 2 段 opacity 0.3、filter grayscale(1)、主幹 opacity 1；切換到 第 48 / 50 句 仍淡化=true；還原：opacity 1、filter none；按鈕「淡化修飾語」(false) → 「還原修飾語」(true) |
| TC-14-01 | AC-14-01 | 通過 | Abstract 摘要（5 則）、方法論（5 則）、文獻回顧（Research Gap）（5 則） |
| TC-14-02 | AC-14-02、AC-23-02（375px） | 通過 | decoder/strategies：水平捲軸=false、超出 0；sources：水平捲軸=false、超出 0；sources/details：水平捲軸=false、超出 0 |
| TC-15-01 | AC-15-01 | 通過 | 全部、研究空白 Gap、研究目的 Aim、研究結果 Findings、研究限制 Limitations |
| TC-15-02 | AC-15-02、AC-15-03 | 通過 | gap 25 則（類別 gap）；aim 25 則（類別 aim）；findings 25 則（類別 findings）；limitations 25 則（類別 limitations）；回到全部 100 則 |
| TC-16-01 | AC-16-01 | 通過 | 逐字：「g」65 則、「ga」13 則、「gap」9 則；大寫 GAP 相同=true；中文「缺口」4 則、相符=true；gap + Aim 分類 1 則、相符=true；10 次按鍵更新 ms：4.8、16.4、16.6、16.2、16.6、16、18.3、15.6、16.1、17.6 |
| TC-16-01b | AC-16-01 | 通過（v0.3） | 多輪判定（test-plan §2.3），3 次執行 × 7 輪，每次執行皆通過、無排除輪。4 倍降速 210 筆：中位數 14.1、p90 24.6、最大 62.1 ms，> 100ms 0 筆；一般最大 19 ms。v0.2：失敗（第一鍵 189.8） |
| TC-16-01c | AC-16-01 | 通過（v0.3） | 重新載入→切到句型庫→立即輸入「g」（按鍵前已建 12 則），3 次執行 × 7 輪 × 5 筆。4 倍降速 105 筆：中位數 27.7、p90 49.2、最大 91.8 ms，> 100ms 0 筆；一般最大 16.1 ms；篩選在同一 input 事件內同步完成且相符 210/210。v0.2：失敗（119.8～197） |
| TC-16-02 | AC-16-02 | 通過 | 0 則、提示「找不到符合的句型」 |
| TC-16-03 | AC-16-03 | 通過 | 剪貼簿「Evidence on [topic] comes almost entirely from [region], so it is unclear whether the findings hold elsewhere.」與模板相同=true；提示 ["已複製"] |
| TC-16-04a | AC-16-04 | 通過 | 剪貼簿拒絕：提示 ["複製失敗，請手動選取"]；反白文字與模板相同=true；未處理例外 0 |
| TC-16-04b | AC-16-04 | 通過 | 剪貼簿不存在：提示 ["複製失敗，請手動選取"]；反白文字與模板相同=true；未處理例外 0 |
| TC-17-01 | AC-17-01 | 通過 | 連續打卡天數==1 天；單字掌握數==0 字；Part 5 正確率==70% |
| TC-17-02 | AC-17-02 | 通過 | 初始 0 天；D 翻卡 1 天；D 再做 Part 5 1 天；D+1 開啟 1 天；D+1 翻卡 2 天；中斷一天（D+3）開啟 0 天；D+3 四選一作答 1 天；lastActiveDate=2026-04-02 |
| TC-17-04a | AC-17-04 | 通過 | 答題數 0 時顯示「—」 |
| TC-17-04b | AC-17-04 | 通過 | 答題 10、答對 7 → 正確率「70%」 |
| TC-17-05 | AC-17-05 | 通過 | 4/3 學習後 2 天；時鐘調回 3/20 開啟 2 天、學習後 2 天（days 2 → 2、lastActiveDate 2026-04-03） |
| TC-17-06 | AC-17-06 | 通過 | 600：目前目標分數=600｜目前目標色級=綠｜目前生效色級=綠｜每日新字量=15 字/天 ／ 730：目前目標分數=730｜目前目標色級=藍｜目前生效色級=綠（內建上限）｜每日新字量=15 字/天 ／ 860：目前目標分數=860｜目前目標色級=金｜目前生效色級=綠（內建上限）｜每日新字量=15 字/天 ／ 300：目前目標分數=300｜目前目標色級=棕｜目前生效色級=棕｜每日新字量=10 字/天 ／ 100：目前目標分數=100｜目前目標色級=橘｜目前生效色級=橘｜每日新字量=10 字/天；入口 customi… |
| TC-18-01 | AC-18-01 | 通過 | 重新開啟後資料完全相同=true；主控台畫面相同=true；目標 455/brown、自訂 1、Part 5 2/2（第 2 / 200 題、已作答鎖定=true）、打卡 1 天、STT 已讀 true |
| TC-18-02 | AC-18-02 | 通過 | localStorage 初始=無；目前目標分數=600｜目前目標色級=綠｜目前生效色級=綠｜每日新字量=15 字/天；共 5620 張；toast=[]；例外 0 |
| TC-18-03 | AC-18-03、AC-24-01 | 通過 | 警示「進度將無法保存」；套用 300 + 自訂 1 + 範本 10 → 共 2820 張；Part 5 作答 1；匯出 english-master-track-backup-20261030.json（分數 300、自訂 11）；主控台 連續打卡天數==1 天；單字掌握數==0 字；Part 5 正確率==100%；目前目標分數==300；目前目標色級==棕；目前生效色級==棕；每日新字量==10 字/天；例外 0 |
| TC-18-04 | AC-18-04 | 通過 | 新增時訊息 ["儲存空間不足"]；範本注入 toast ["儲存空間不足"]、狀態「」；localStorage 不變=true；記憶體自訂字 qaquotaok |
| TC-18-05 | AC-18-05 | 通過 | 非 JSON：toast ["資料讀取失敗，已重設"]、主控台 600/綠/綠/15 字/天、原字串保存=true；Schema 不符：toast ["資料讀取失敗，已重設"]、主控台 600/綠/綠/15 字/天、原字串保存=true；版本 99：toast ["資料讀取失敗，已重設"]、主控台 600/綠/綠/15 字/天、原字串保存=true；V-ST-03 違反：toast ["資料讀取失敗，已重設"]、主控台 600/綠/綠/15 字/天、原字串保存=true |
| TC-19-02a | AC-19-02 | 通過 | 離線模擬下各頁 dashboard:true customizer:true flashcards:true part5:true decoder:true phrasebank:true sources:true；TTS（本機語音）朗讀 1 次；Console 錯誤 0；實機斷網列人工 TC-M03 |
| TC-20-01 | AC-20-01 | 通過 | 56 個畫面狀態（4 尺寸 × 14 狀態）；問題 0 |
| TC-20-02 | AC-20-02 | 通過 | 375px 觸控操作 57 項：選單:OK、導覽 dashboard:OK、選單:OK、導覽 customizer:OK、選單:OK、導覽 flashcards:OK、選單:OK、導覽 part5:OK、選單:OK、導覽 decoder:OK、選單:OK、導覽 phrasebank:OK、選單:OK、導覽 customizer:OK、色級 橘:OK、滑桿拖曳:OK(615/615)、套用:OK、輸入框:OK、英文單字欄:OK、中文釋義欄:OK、新增單字:OK、範本 資工:OK、刪除自訂字:OK、選單:OK、導覽 f… |
| TC-20-03 | AC-20-03 | 通過 | 375px 以「選單」導覽到達：dashboard:true customizer:true flashcards:true part5:true decoder:true phrasebank:true |
| TC-21-01 | AC-21-01、AC-18-06、AC-19-03 | 通過 | 整個工作階段請求 1 筆（["file:///D:/Demo/Clude/%E6%88%91%E7%9A%84%E5%A4%9A%E7%9B%8A%E6%94%BB%E7%95%A5/dis"]）；載入後操作期間請求 0 筆（[]）；非本機請求 0；Console 資源錯誤 0；以 file:// 直接開啟（無伺服器）正常運作 |
| TC-21-03 | AC-21-03（執行期） | 通過 | localStorage 鍵與長度 {"englishMasterTrack:state":6527}；含音訊樣式字串=false |
| TC-22-01 | AC-22-01 | 通過（v0.3） | 嚴格量法（切到自訂器計時到 `#customizer-custom` 顯示並繪製完成）+ 多輪判定，3 次執行 × 7 輪皆通過、無排除輪。4 倍降速 210 筆：中位數 29.9、p90 49.9、最大 124.9 ms，> 100ms 2 筆（皆為重新載入後第 1 次切到自訂器：117.1、124.9）；該位置中位數 52.2、p90 86.1；切到句型庫最大 70.4。一般 210 筆最大 49.6。冷啟動不列入（§11.2）。v0.2：失敗 |
| TC-22-01r | AC-22-01 | 通過（v0.3 新增） | 嚴格量法終點有效：點擊後 `#customizer-custom` 先為 hidden 28/28 次（單次執行），等 1 個畫格後顯示，終點時都已顯示、有內容（高 816／2894／3946px）。參考值（4 倍降速第 1 次切到自訂器，21 輪）：寬鬆量法中位數 24.4、p90 46、最大 54；嚴格 + 再一個畫格中位數 66.9、p90 96.6、最大 132.3 |
| TC-22-02 | AC-22-02 | 通過 | 單字集 共 5650 張；10 次套用（含 toast 與繪製）ms：3.4、8.3、17.4、15.6、15.9、16.4、16.7、15.7、15.8、18.5；最大 18.5（無頭 Chrome、未降速） |
| TC-22-02b | AC-22-02 | 通過 | 本機無頭 Chrome 參考值（非基準環境）：一般 10 次最大 16.8 ms（4.7、3.4、13.9、16.3、16.8、15.6、16.3、16.1、16.2、16.1）；4 倍降速最大 23.4 ms（23.4、19.3、22.9、16.7、22.1、18.7、19.8、16.8、15.3、17.6） |
| TC-22-03 | AC-22-03 | 通過 | onresult → 徽章繪製 ms：11.2、7.2、4、16.4、15.1、12.9、10.9、6.5、5.5、5.1（無頭 Chrome、未降速） |
| TC-22-03b | AC-22-03 | 通過 | 本機無頭 Chrome 參考值（非基準環境）：一般 10 次最大 16.8 ms（11、12.8、2.8、8.3、15、4.6、10.8、16.8、8.6、14.6）；4 倍降速最大 23.6 ms（23.6、11.3、23、13.1、20.9、11.2、19.4、9.9、17.5、9.3） |
| TC-22-04 | AC-22-04 | 通過 | 本機無頭 Chrome 參考值（非基準環境）：一般 10 次最大 20.9 ms（15.1、16.2、16.8、17.7、16.1、16.2、16.1、16.5、20.9、12.2）；4 倍降速最大 24 ms（24、13.6、19.5、14.1、19.6、14.4、21.6、11.7、22.5、10.5） |
| TC-22-05a | AC-22-05 | 通過 | 本機無頭 Chrome 參考值：timeOrigin → emt-ready（入口可點擊）一般 78、77、76、75、78 ms；4 倍降速 366、404、434、443、403 ms；基準環境實測列人工 TC-M07 |
| TC-23-01 | AC-23-01 | 通過 | 檢查 257 張內建卡；不一致 0；範例 the「單字來源：NGSL 1.2（CC BY-SA 4.0） ／ 音標：原創；釋義：ECDICT（MIT，已修改）」；café「單字來源：TSL 1.2（CC BY-SA 4.0） ／ 音標：原創；釋義：原創」；gay「單字來源：NGSL 1.2（CC BY-SA 4.0） ／ 音標：原創；釋義：原創」；client「單字來源：TSL 1.2（CC BY-SA 4.0）、BSL 1.2（CC BY-SA 4.0）、NAWL 1.2（CC BY-SA 4.0） ／ 音標：原… |
| TC-23-02 | AC-23-02 | 通過 | 主控台入口=true、頁尾連結=true；缺欄位 無；缺聲明 無；列出字表 4 種／資料中 4 種；ECDICT MIT 全文可展開=true |
| TC-24-01 | AC-24-01、AC-24-02 | 通過 | 檔名 english-master-track-backup-20261030.json（本地日期 20261030）；網路請求 0；6795 bytes；format=english-master-track-backup、schemaVersion=1；欄位齊全=true；不含內建內容=true；goal={"draftScore":300,"appliedScore":300,"appliedColor":"brown","effectiveColor":"brown"}；自訂 10、已掌握 1、測驗 {"a… |
| TC-24-03 | AC-24-03 | 通過 | 對話框「匯入備份  匯入將覆蓋目前所有進度  取消 匯入」；提示 ["已匯入，略過 0 筆"]；匯入後與匯出內容相同=true；重載後相同=true |
| TC-24-04 | AC-24-04 | 通過 | 取消後 localStorage 不變=true、記憶體不變=true；提示 [] |
| TC-24-05 | AC-24-05 | 通過 | 非 JSON：備份檔格式錯誤，未匯入；空檔：備份檔格式錯誤，未匯入；缺少 data：備份檔格式錯誤，未匯入；缺少 goal：備份檔格式錯誤，未匯入；型別錯誤：備份檔格式錯誤，未匯入；頂層為陣列：備份檔格式錯誤，未匯入；format 錯：備份檔格式錯誤，未匯入；未處理例外 0 |
| TC-24-06 | AC-24-06 | 通過 | 版本缺失：「備份檔版本不相容（檔案版本：無；支援版本：1）」；版本 99：「備份檔版本不相容（檔案版本：99；支援版本：1）」；版本字串：「備份檔版本不相容（檔案版本：無；支援版本：1）」 |
| TC-24-07 | AC-24-07 | 通過 | 提示 ["已匯入，略過 0 筆"]；清單原文=true；卡片原文=true；img 元素 0；alert 0 |
| TC-24-08 | AC-24-08 | 通過 | 提示 ["已匯入，略過 3 筆"]（預期略過 3 筆：內建重複 1、檔內重複 1、不存在的已掌握 1）；匯入後自訂 10 筆、掌握數「1 字」 |
| TC-24-09 | AC-24-09 | 通過 | 提示 ["儲存空間不足，未匯入"]；localStorage 不變=true；記憶體不變=true |
| TC-B01 | （越界檢查） | 通過 | tests/static/boundary-check.mjs：專案 168 個檔案中，屬於某任務 paths 120 個、人類／上游文件 34 個、QA tests/ 14 個，不屬於任何任務 0 個；src/app/styles/90-overrides.css 列於 FE-18 paths 但未建立（依 §3「只在發現問題才寫」，非缺陷） |
| TC-B02 | （越界檢查：sources/、english_master_track.md、docs/） | 通過 | english_master_track.md 最後修改 2026-10-29 14:02；sources/ 全部檔案最後修改 ≤ 2026-10-30 10:06，早於任何 src/ 檔案（最早 10:41）；ecdict_subset.csv 各 5,616 列、missing 4 行，與 SOURCE.txt 及契約 §3.2 紀錄一致；QA 依字表獨立重算 N_B=2,809、N_G=5,620 與契約一致。docs/ 於實作期間的修改皆為 PRD v0.7（pm-agent）、契約 v0.7（sa-agent）、architecture v0.3（sd-agent）、tasks.json（主控）之版本紀錄，未發現 PG 修改 |
| TC-D01 | AC-03-06 | 通過 | N_O=1000、N_B=2809、N_G=5620；VOCAB_MANIFEST nB=2809 nG=5620；依字表重算=5620 |
| TC-D02 | AC-03-07 | 通過 | 重複 0 筆 |
| TC-D03 | AC-03-08 | 通過 | 排名連續=true；1～N_B 與 NGSL SFI Rank 順序一致=true；> N_B 皆來自 TSL/BSL/NAWL=true；全序列符合 R-1～R-4=true |
| TC-D04 | AC-03-09 | 通過 | 集合相同=true（2809 vs 2809）；缺少功能詞=無；功能詞具完整卡片欄位 10/10 |
| TC-D05 | AC-06-08 | 通過 | > N_B 空白 0 筆；≤ N_B 型別錯誤 0 筆；≤ N_B 空白 1259 筆（允許） |
| TC-D06 | AC-06-01、AC-06-02、AC-06-07 | 通過 | 欄位問題 0 筆；pos 值：art. v. conj. prep. adv. aux. pron. adj. n. num. int. pref. |
| TC-D07 | AC-06-02（契約 V-VOC-07 M-8） | 通過 | 字首字 6 筆（non、pre、ex、multi、semi、neo）；不符 0 |
| TC-D08 | AC-23-03 | 通過 | 問題 0；missing 4 筆（résumé、café、entrée、unauthorize）皆原創=true；ECDICT 釋義 5576 筆、原創 44 筆；音標標 ECDICT 0 筆=true；ECDICT 子集鍵 5616 |
| TC-D09 | AC-23-05 | 通過 | 登錄 NGSL、TSL、BSL、NAWL、ECDICT、ORIGINAL；缺漏 無；以未確認字表為唯一來源 0 筆 |
| TC-D10 | AC-23-02 | 通過 | 資料中字表種類 4（NGSL、NAWL、TSL、BSL）、登錄字表 4；includedItemCount 相符=true；ECDICT 筆數登錄 5576 / 實際 5576；MIT 全文與 sources/ecdict/LICENSE 一致=true |
| TC-D11 | AC-05-01、AC-05-02、AC-05-03 | 通過 | 範本 資工、商管、生醫統計；每範本字數 10/10/10；與內建重複 0；30 字互不重複=true |
| TC-D12 | AC-10-01、AC-10-02、AC-11-02 | 通過 | 共 200 題；preposition_collocation 50、part_of_speech 50、context_vocabulary 50、connector 50；結構問題 0；正解位置 A～D 50/50/50/50 |
| TC-D13 | AC-12-02、AC-12-03 | 通過 | 共 50 句；缺主詞或動詞或非原創 0 句 |
| TC-D14 | AC-14-01 | 通過 | 主題：Abstract 摘要(5)、方法論(5)、文獻回顧（Research Gap）(5) |
| TC-D15 | AC-15-02 | 通過 | 共 100 則；gap 25、aim 25、findings 25、limitations 25 |
| TC-D16 | AC-23-04（標記） | 通過 | 來源標記非原創 0 筆（共 5970）；精確片語搜尋比對列入人工驗收 TC-M09 |
| TC-D17 | AC-09-02 | 通過 | 釋義非空 5620/5620；相異釋義 5606；同一釋義最多重複 3 次 |
| TC-D18 | AC-23-02、AC-23-03（architecture §8.4 紀錄完整性、契約 V-VOC-09／V-VOC-17） | 通過 | tests/data/records-check.mjs 比對 validate.mjs --all --max 100000 全量輸出：V-VOC-17 警告 8 筆、V-VOC-17 清單 179 筆、H-1W 0 筆、V-VOC-09 原創原因 40 筆，_records 缺列 0。QA 逐筆檢視 187 筆上下文用詞的最終 meaning：program/application/driver/script → 程式、file/archive → 檔案、procedure → 程序、quality → 品質、mass → 質量（物理）、level → 水準、menu →（電腦）選單、subway → 地鐵；捷運，皆符合 M-3 台灣用法，判斷錯誤 0 |
| TC-D19 | AC-23-03（契約 V-VOC-18、architecture §8.4 QA 抽查） | 通過 | sample.mjs --ratio 0.05 --min 20 --seed <起始排名+1000> --ecdict-only，15 個分檔共抽 301 筆（vocab-2401 21 筆，其餘各 20 筆），QA 逐筆對照 ecdict_subset_zhtw.csv：簡體或大陸用語 0、新增義項 0、pos 與釋義不一致 0、英式音標 0；各分檔不合格率 0%（門檻 > 5% 退回）。觀察：brake 由 _zhtw「剎車」改為台灣慣用「煞車」、mower 由「刈草機」改為「割草機」，屬 M-3 用詞還原，視為有對應 |
| TC-D20 | AC-11-01（契約 V-P5-05 正解唯一性，architecture §10 建議每題型 10 題） | 通過 | 固定種子 20261030 每題型抽 10 題共 40 題（p5-021、029、045、117、129、137、157、161、165、181、014、038、046、078、098、122、162、170、178、194、011、015、027、039、055、135、139、147、163、187、052、068、080、096、112、136、160、168、184、200），QA 逐題判斷：正解唯一且與 correctIndex 一致 40/40 |
| TC-M01 | AC-08-01、AC-08-09、AC-08-13、AC-08-14、AC-21-01 | 待人工 | 真實麥克風辨識與權限流程 |
| TC-M02 | AC-07-01～AC-07-05 | 待人工 | 真實 TTS 語音 |
| TC-M03 | AC-19-02 | 待人工 | 實際斷網以 file:// 開啟 |
| TC-M04 | AC-19-03、AC-18-01 | 待人工 | 雙擊開啟、關閉分頁後重開 |
| TC-M05 | AC-20-01～AC-20-03 | 待人工 | Android Chrome 實機觸控 |
| TC-M06 | AC-24-01、AC-24-03 | 待人工 | 跨裝置匯出匯入 |
| TC-M07 | AC-22-01～AC-22-05、AC-02-07、AC-16-01 | 待人工 | 基準環境效能量測 |
| TC-M08 | AC-23-04 | 待人工 | 原創性 20 筆精確片語搜尋 |
| TC-S01 | AC-19-01 | 通過 | dist 檔案：english-master-track.html；<style> 區塊 1；外部資源樣式命中：無；程式網路 API：無 |
| TC-S02 | AC-19-04 | 通過 | 3,030,574 bytes（上限 5,242,880；v0.1 為 3,022,217） |
| TC-S03 | AC-04-09 | 通過 | src/app 命中 0；產物程式命中 無 |
| TC-S04 | AC-21-02 | 通過 | 命中：無 |
| TC-S05 | AC-21-03（程式面） | 通過 | 命中：無 |
| TC-S06 | AC-23-06 | 通過 | 開頭註解含 MIT 全文與 Copyright=true；CC BY-SA 聲明與網址=true；<meta charset> 結束於第 70 byte |
| TC-S07 | AC-04-04、AC-24-07（產物） | 通過 | <script> 開 2／關 2；javascript: 連結=false |
| TC-S08 | AC-19-01（D-1 不打包） | 通過 | 命中：無 |
| TC-S09 | AC-19-01（交付物可追溯） | 通過 | 重建產物 3,030,574 bytes；與 dist 位元組相同=true（v0.2） |
| TC-X-cards | （全套件）無未處理例外 | 通過 | 例外：[] |
| TC-X-content | （全套件）無未處理例外 | 通過 | [] |
| TC-X-edge | AC-19-02（Chrome／Edge）跨瀏覽器冒煙 | 通過 | 以 Microsoft Edge（headless）重跑套件 e2e-goal 全部 25 個 TC：25 通過，結果見 tests/results/e2e-goal-edge.json |
| TC-X-fixture | （fixture）無未處理例外 | 通過 | [] |
| TC-X-goal | （全套件）無未處理例外 | 通過 | 例外：[]；console.error：[] |
| TC-X-speech | （全套件）無未處理例外 | 通過 | [] |

## 5. 缺陷

詳細內容見 `docs/04-qa/bug-reports/`。

| BUG | 狀態 | 嚴重度 | owner | task | AC | 摘要 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| BUG-001 | verified | minor | pg-frontend | FE-12 | AC-08-14 | `speech-panel.js` 的 `onMicClick` 在離線判斷分支未清除 `lastResult`；第 1 輪修正（`clearResult()`）驗證通過，TC-08-14、TC-08-14b 通過 |
| BUG-002 | verified（retries 1） | major | pg-frontend | FE-16 | AC-22-01、AC-16-01 | 第 1 輪：(a) 重新載入後第 1 次切到自訂器偶發超標、(b) 分批補齊前第一鍵回歸。第 2 輪：FE-16 只同步建立符合條件的卡片並對首屏外卡片用 content-visibility；FE-09／FE-10 閒置預建、延後顯示首屏外的自訂單字區。以嚴格量法 + 多輪判定通過（§12） |

## 6. 人工驗收清單

詳細步驟與通過條件見 `docs/04-qa/test-plan.md` §6。

| TC | 對應 AC | 環境 | 重點 |
| :--- | :--- | :--- | :--- |
| TC-M01 | AC-08-01、AC-08-09、AC-08-13、AC-08-14、AC-21-01 | 桌機 Chrome、Edge；Android Chrome；真實麥克風 | 首次說明與「取消／我知道了」、權限允許與封鎖、實際辨識分數、實際斷網提示、Network 面板無頁面請求 |
| TC-M02 | AC-07-01～AC-07-05 | 桌機 Chrome、Edge；Android Chrome；一台無 en-US 語音的裝置 | 美式口音、0.75x 較慢、朗讀中切換不排隊、無 en-US 語音提示 |
| TC-M03 | AC-19-02 | 實際斷網的 Chrome、Edge | 雙擊開啟後模組一～六與資料來源頁皆可用、TTS（本機語音）可播放、Console 無資源錯誤 |
| TC-M04 | AC-19-03、AC-18-01 | 未啟動伺服器的桌機 | 檔案總管雙擊開啟；關閉分頁（或瀏覽器）後重開資料全部還原 |
| TC-M05 | AC-20-01～AC-20-03 | Android Chrome 實機 | 全部控制項以手指操作、無水平捲軸與裁切重疊；觀察解碼器註解片段（28px 高）是否容易點中 |
| TC-M06 | AC-24-01、AC-24-03 | 兩台裝置或兩個瀏覽器 | 實際下載備份檔名含本地日期、另一端匯入後資料一致 |
| TC-M07 | AC-22-01～AC-22-05、AC-02-07、AC-16-01 | 中階筆電 + 最新 Chrome，一般與 DevTools 4 倍降速 | 切頁（含句型庫、自訂器，BUG-002）、套用最大單字集、滑桿試算、搜尋按鍵、STT 評分各 10 次 ≤ 100ms；首次載入 5 次 ≤ 3 秒／≤ 6 秒；（v0.2）**(7) 冷啟動**：重新啟動 Chrome 後第一次開檔，依序切 10 頁 3 次，每次 ≤ 100ms，超標依頁面另開缺陷；**(8)** 重新載入後 1 秒內在句型庫輸入第一個字 5 次 ≤ 100ms；（v0.3）**(9) 觀察**：句型庫「全部」狀態下以滾輪、拖曳捲軸、End／Home 捲到底再捲回，捲軸滑塊長度與位置會因視窗外卡片的估計高度（`contain-intrinsic-size`）微幅變動，請確認是否可接受、內容有無突然位移；**(10) 觀察**：切到自訂器時下方「自訂單字」區約晚 1 個畫格出現，立即捲到該區確認無閃爍或版面跳動；並請特別量 (1) 中第 1 次切到自訂器（自動化 4 倍降速 p90 86.1，餘裕較小） |
| TC-M08 | AC-23-04 | 可連網的電腦 | 下表 20 筆以精確片語搜尋，比對 ETS 官方題本與 Manchester Academic Phrasebank，皆無逐字相同整句 |

### 6.1 自動化參考值（本機無頭 Chrome，非基準環境）

| 量測 | 一般（最大） | 4 倍降速（最大） | AC 上限 |
| :--- | :--- | :--- | :--- |
| 切換頁面 10 次（AC-22-01） | 68.9～73 ms；v0.2 35.2～46.5 ms；v0.3 嚴格 49.6 ms | 102.6～275.4 ms（句型庫）；v0.2 65～153.6 ms（超標皆為重新載入後第 1 次切到自訂器；句型庫 ≤ 77.6）；v0.3 嚴格量法 21 輪中位數 29.9、p90 49.9、最大 124.9（> 100ms 2/210，皆第 1 次切到自訂器） | 100 ms |
| 套用最大單字集 5,650 張 10 次（AC-22-02） | 17.6 ms | 23.4～53.8 ms | 100 ms |
| STT `onresult` → 徽章繪製 10 次（AC-22-03） | 17.5 ms | 23.6～25 ms | 100 ms |
| 滑桿試算 10 次（AC-22-04、AC-02-07） | 20.9 ms | 22.4～24 ms | 100 ms |
| 句型搜尋按鍵 10 次（AC-16-01） | 17 ms；v0.2 ≤ 11.7 ms；v0.3 19 ms | 51.5 ms（另行探測偶見 103～137 ms）；v0.2 21～26.8 ms，但分批補齊完成前的第一鍵 119.8～197 ms（TC-16-01b、TC-16-01c）；v0.3 搜尋 p90 24.6、最大 62.1，第一鍵 p90 49.2、最大 91.8 | 100 ms |
| 首次載入 5 次 timeOrigin → `emt-ready`（AC-22-05） | 74～81 ms | 357～443 ms | 3,000／6,000 ms |
| （v0.2）冷啟動切頁（瀏覽器啟動後第一次載入，不列入自動化判定，§11.2） | 1x 冷啟動 3 次最大 36.6～39.3 ms | 自訂器 208.2～237、抽認卡 100.5～108.7、解碼器 181.1～187.7、句型庫 164.5～185.3、資料來源 179～184.4 ms | 100 ms（改列 TC-M07 (7)） |

### 6.2 TC-M08 原創性抽樣（固定種子 4242）

| # | 類型 | 識別 | 內容 |
| :--- | :--- | :--- | :--- |
| 1 | 例句 | centralize | We plan to centralize all purchasing at the head office next year. |
| 2 | 例句 | shallow | The report was criticized for its shallow analysis of the market. |
| 3 | 例句 | belong | Does this laptop belong to anyone in the marketing team? |
| 4 | 例句 | nutrition | The cafeteria posts nutrition information for every meal it serves. |
| 5 | 例句 | electronically | Please submit your expense reports electronically by Friday. |
| 6 | 學術情境 | although | Although the sample was small, the results were significant. |
| 7 | 學術情境 | subsequent | Subsequent analyses confirmed that the effect was not driven by outliers. |
| 8 | 學術情境 | sexual | The survey asked about experiences of sexual harassment in the workplace. |
| 9 | Part 5 | p5-141 | The success of the project relies heavily _____ effective communication among team members. |
| 10 | Part 5 | p5-200 | Customer complaints have decreased significantly _____ the introduction of a 24-hour help line. |
| 11 | Part 5 | p5-120 | _____ heavy traffic on the highway, the bus arrived 30 minutes late. |
| 12 | Part 5 | p5-170 | Ms. Wong gave a _____ explanation of the new billing system. |
| 13 | 長難句 | ds-023 | Following the procedure outlined by previous researchers, we removed responses that were completed in less than one third of the median completion time. |
| 14 | 長難句 | ds-047 | This gap is particularly significant, given that informal caregivers provide the majority of long-term care for older adults in many Asian societies. |
| 15 | 長難句 | ds-034 | Model performance was evaluated with five-fold cross-validation, in which the data were divided into five equal parts and each part served once as the test set. |
| 16 | 長難句 | ds-028 | Ethical approval was obtained from the university's research ethics committee before any participant was contacted, in accordance with national guidelines for research involving human subjects. |
| 17 | 句型 | ph-001 | Existing work on [topic] has concentrated largely on [population A], leaving [population B] underexamined. |
| 18 | 句型 | ph-097 | This study examined only [number] of the many possible [factors], leaving others for future work. |
| 19 | 句型 | ph-054 | Of the [number] respondents, [percentage] reported [behavior or view]. |
| 20 | 句型 | ph-070 | The qualitative data help explain why [quantitative result] occurred. |

## 7. 越界檢查

| 項目 | 結果 |
| :--- | :--- |
| 檔案歸屬（`tests/static/boundary-check.mjs`） | 專案 168 個檔案：屬於任務 paths 120、人類／上游文件 34（`docs/`、`sources/`、`.claude/`、`CLAUDE.md`、`english_master_track.md`）、QA `tests/` 14、**不屬於任何任務 0**。主控授權補修（R2-1、R2-2、R3-1～R3-4、R5-1～R5-3、R6-1、R6-2、R6-4、R6-6、R7-1～R7-4）寫入的檔案皆在某任務 paths 內。（加入 QA 產出後重跑：184 個檔案，新增的只有 `docs/04-qa/` 4 個與 `tests/` 檔案，不屬於任何任務仍為 0） |
| 任務 paths 中不存在的檔案 | `src/app/styles/90-overrides.css`（FE-18 只在發現跨頁問題時才寫，未建立屬正常） |
| `english_master_track.md` | 最後修改 2026-10-29 14:02，早於所有階段 4 產出 |
| `sources/` | 全部檔案最後修改 ≤ 2026-10-30 10:06，早於任何 `src/` 檔案（最早 10:41）；ECDICT 子集 5,616 列 + missing 4 行與 `SOURCE.txt`、契約 §3.2 一致；QA 自字表獨立重算 `N_B` 2,809、`N_G` 5,620 與契約 §4.2 一致 |
| `docs/` | 實作期間的修改均為上游角色的版本修訂（PRD v0.7 pm-agent、契約 v0.7 sa-agent、architecture v0.3 sd-agent、tasks.json 主控），各有變更紀錄；未發現 PG 修改 |
| 建置產物 | `dist/` 只有 1 個檔；QA 以 `tools/build.mjs --out` 重建，與 `dist/english-master-track.html` 位元組相同（TC-S09） |

說明：檔案歸屬只能判斷「檔案屬於哪個任務」，無法判斷「由哪個代理寫入」；後者依主控提供的補修授權清單與各檔修改時間判讀。

## 8. 安全檢查

| 項目 | 方法 | 結果 |
| :--- | :--- | :--- |
| XSS（表單） | 自訂單字 6 欄皆輸入 `<img src=x onerror=alert(1)>` 與含 `<script>` 的字串，含英文單字欄 | 清單與抽認卡正反面皆顯示原文字元；頁面無 `img` 元素、無額外 `script`、`alert` 對話框 0、注入旗標未被設定（TC-04-04） |
| XSS（匯入） | 備份檔的自訂單字欄位放入相同字串後匯入 | 同上（TC-24-07） |
| 禁用 API | 掃描 `src/app/`（不含 `__tests__`）與產物程式 | `innerHTML`、`outerHTML`、`insertAdjacentHTML`、`document.write`、`eval`、`new Function`、`on*` 屬性字串皆 0（TC-S03） |
| 外部資源 | 掃描產物 | `<script src>`、`<link href>`、`@import`、外部 `url()`、`<img>`、`<iframe>`、`@font-face`、CDN 網址皆 0；程式中無 `fetch`、`XMLHttpRequest`、`WebSocket`、`sendBeacon`（TC-S01） |
| 網路請求 | 完整操作所有模組並監看 CDP `Network.requestWillBeSent` | 整個工作階段只有 `file://` 主檔 1 筆，操作期間 0 筆（TC-21-01） |
| 內嵌資料 | 產物中 `<script>` 開關數一致、無 `javascript:` 連結 | 通過（TC-S07） |
| 金鑰與 SDK、錄音 | 產物掃描與執行期檢查 | 無付費 API 金鑰、無第三方語音 SDK；無 `MediaRecorder`、`getUserMedia`、`AudioContext`；STT 後 localStorage 只有 `englishMasterTrack:state` 且無音訊資料（TC-S04、TC-S05、TC-21-03） |

## 9. 觀察事項（不構成缺陷）

| # | 事項 | 判定與建議 |
| :--- | :--- | :--- |
| O-1 | 解碼器帶註解片段（`.seg--has-note`，`role="button"`）在 375px 寬時每行高 28px，低於 architecture §9 對「按鈕、選項、滑桿把手」的 44px | AC-20-02 要求「可用觸控完成操作」：觸控點擊可正確顯示註解（TC-20-02），片段寬度多在 100px 以上、行距 38.6px，判定**不構成缺陷**。建議 TC-M05 實機觀察誤觸情況；若要符合 §9 精神，可加大上下 padding |
| O-2 | 375px 寬時 toast 固定在畫面底部約 3 秒，期間會蓋住底部的「翻面」「下一張」與頁尾連結，點擊會落在 toast 上 | 屬暫時性通知，不違反 AC-20-01；自動化觸控測試改為等 toast 消失後再點。建議 toast 設 `pointer-events: none` 或避開操作列 |
| O-3 | 載入後第一次切到自訂器、解碼器在 4 倍降速下偶有 300ms 以上（6 輪中 1 輪，暖機） | 已併入 BUG-002 的備註，請 TC-M07 一併觀察。（v0.2）該輪即瀏覽器啟動後的第一次載入（冷啟動）。本輪統一判定冷啟動不列入自動化判定，改列 TC-M07 (7)，見 §11.2 |
| O-4 | 正式資料下單字集最少 1,000 張，AC-06-06（空集合）、AC-09-06（少於 4 字）與 AC-04-08 的「刪到為空」無法由 UI 造成 | 以無內建資料的 fixture 建置驗證畫面行為（TC-06-06、TC-09-06、TC-04-08b），通過 |
| O-5 | 匯入 `write_failed`（「儲存失敗，未匯入」）在瀏覽器中難以觸發 | 由 PG 單元測試涵蓋；E2E 只驗 `quota` 分支（TC-24-09） |
| O-6 | 自訂單字表單的英文單字欄接受 `<img …>` 等非字母字串並存成單字 | PRD 未限制字元；顯示安全無虞（TC-04-04），不列缺陷 |

## 10. 回饋上游

| 編號 | 事項 | 對象 | 建議 |
| :--- | :--- | :--- | :--- |
| QA-FB-01 | architecture §10 指定 E2E 用 Playwright；本次改以 CDP 直接驅動本機 Chrome／Edge，未新增任何相依，涵蓋項目相同 | SD | 下次修訂 §10 時可註明兩者皆可 |
| QA-FB-02 | AC-06-06、AC-09-06 在正式資料下不會發生（O-4），只能以 fixture 建置驗證 | PM | 若希望保留為驗收條件，可註明「以無內建資料的建置驗證」 |

## 11. 退回修正第 1 輪驗證（v0.2）

### 11.1 執行紀錄

| 項目 | 指令 | 結果（QA 自行執行） |
| :--- | :--- | :--- |
| 單元測試 | `npm test` | 354 項全部通過、fail 0、todo 0（含 `speech.test.js` 新增 3 項、`phrasebank.test.js` 新增 7 項） |
| 驗收全套 | `npm run test:e2e` | 158 項：通過 149、失敗 1（TC-22-01：重新載入後第 1 次切到自訂器 116.9ms）、待人工 8；紀錄 `tests/results/diag/bug-round1/run-all.log` |
| 環境套件重跑 | `node tests/e2e/e2e-env.mjs` × 6（後 4 次含新增的 TC-16-01c） | TC-22-01 失敗 2/6；TC-16-01b 失敗 1/6；TC-16-01c 失敗 3/4；TC-20-02、TC-22-02b～TC-22-05a 全部通過。紀錄 `tests/results/diag/bug-round1/e2e-env-run1～4.log`；`tests/results/e2e-env.json` 為最後一次 |
| 語音套件重跑 | `node tests/e2e/e2e-speech.mjs` | 20/20 通過（TC-08-14b 本輪加驗 `lastResult` 與恢復連線後再評分） |
| 冷啟動診斷 | `node tests/e2e/perf-phrasebank.mjs 5`（QA 新增，不列入 run-all） | 4 倍降速 5 次啟動 × (冷啟動 1 + 重新載入 3)、1x 冷啟動 3 次、分批補齊前首次操作 10 次；`tests/results/diag/perf-phrasebank.json` |
| 彙整 | `tests/results/summary.json` | 依各套件最後一次結果重算：159 項，通過 149、失敗 2、待人工 8。**本報告以本輪全部執行判定**：TC-16-01b 在第 1 次重跑失敗，因此判為失敗，與 summary.json 最後一次的結果不同 |

PG 先前執行 `tests/e2e/e2e-env.mjs` 時覆寫了 `tests/results/e2e-env.json`。該檔已由 QA 本輪重跑的結果取代，本報告不採用 PG 的數值。

### 11.2 冷啟動判定（AC-22-01）

**判定：「瀏覽器冷啟動後第一次載入」不列入自動化判定，改列人工 TC-M07 第 (7) 項，在基準環境複測。** 規則已寫入 test-plan v0.2 §2，並一致適用於所有頁面與所有 BUG。

| 規則 | 內容 |
| :--- | :--- |
| 不列入 | 瀏覽器程序啟動後，各頁在該程序中第一次繪製的那次切換 |
| 列入 | 其餘每一次量測，包括同一瀏覽器重新載入後第一次切到各頁。TC-22-01 的 4 倍降速量測就屬這種情形（先以一般條件走過全部頁面，再重新載入） |

理由：

| # | 理由 | 依據（4 倍降速，本機無頭 Chrome） |
| :--- | :--- | :--- |
| 1 | 冷啟動多出的時間是瀏覽器引擎層的一次性成本，所有頁面都有，不能歸因到個別頁面的實作。連幾乎沒有邏輯的資料來源頁也超標；句型庫在冷啟動中不是最慢的 | 冷啟動 5 次：自訂器 208.2～237、解碼器 181.1～187.7、資料來源 179～184.4、句型庫 164.5～185.3、抽認卡 100.5～108.7 ms。同一瀏覽器重新載入 15 次後，所有頁面 ≤ 88.6 ms（句型庫 23.1～65.1）。1x 冷啟動全部 ≤ 39.3 ms。PG 回報的 158～168／218／180／179 ms 與 QA 實測相符 |
| 2 | 與前一輪判定一致。BUG-002 原單已把自訂器、解碼器的第 1 輪（即冷啟動）排除為暖機；若改為列入，自訂器、解碼器、資料來源、抽認卡都要判失敗，等於推翻前一輪判定 | BUG-002 原單「首次 自訂器 320、解碼器 399（第 1 輪）」與本輪冷啟動數值同一量級 |
| 3 | AC-22-01 的判定環境是「基準環境（中階筆電 + 最新 Chrome）」，自動化只是參考（test-plan §2）。冷啟動成本高度依賴環境，例如 JIT 延遲編譯、字型與 fallback 首次載入；CDP 降速也會一併拖慢編譯。無頭桌機 + CDP 的結果不足以代表基準環境 | — |

**風險提醒（給人類）**：使用者每次從檔案總管開啟 `.html` 時，都可能處於冷啟動狀態，所以這不是只在測試中才會出現的情境。TC-M07 (7) 若在基準環境的 4 倍降速下仍超過 100ms，應依頁面另開缺陷，不併入 BUG-002；是否接受這種首次切換延遲，由人類判斷。

### 11.3 PG 改寫單元測試斷言的判定

`phrasebank.test.js` 的「不得出現 `setTimeout`」改為「計時器只能出現在 `scheduleIdle`／`cancelIdle`，搜尋與篩選路徑仍不得有計時器或防抖」。判定**符合** AC-16-01 與 architecture §7.6「每次 `input` 事件同步過濾，不做 debounce」的原意：

| 檢查 | 結果 |
| :--- | :--- |
| 程式路徑 | `input` → `setKeyword` → `apply(false)` 在事件處理內同步更新 `hidden`、筆數與「找不到」；`apply` 結尾的 `scheduleRest()` 只排入閒置工作（content-visibility 標記、預設條件下補卡片），不延後篩選結果 |
| 行為 | TC-16-01c 在 `dispatchEvent` 返回後、尚未讓出主執行緒前就讀取 DOM，可見則數等於預期，40/40 次相符 |
| 斷言強度 | 移除兩個函式本體後，仍禁止 `setTimeout`、`clearTimeout`、`debounce`、`requestAnimationFrame` |

注意：TC-16-01b、TC-16-01c 的失敗是「同步但太慢」（第一鍵觸發 `flushAll()` 同步建立 88 則並排版），屬 100ms 效能問題，與防抖無關，已記入 BUG-002。

### 11.4 回歸結果

| 範圍 | TC | 結果 |
| :--- | :--- | :--- |
| AC-08-*（語音） | AC-08 的 13 個自動化 TC（TC-08-01～06、TC-08-09～14、TC-08-14b），連同同套件的 TC-07-*、TC-21-03、TC-22-03、TC-X-speech，共 20 項（`e2e-speech.mjs`） | 全部通過 |
| AC-15-*、AC-16-02～04 | TC-15-01、TC-15-02、TC-16-02、TC-16-03、TC-16-04a、TC-16-04b | 全部通過（分批建立後分類筆數 25×4、回到全部 100 則，複製第 4 則正確） |
| AC-16-01 | TC-16-01 通過；TC-16-01b、TC-16-01c 失敗 | 失敗（BUG-002） |
| AC-20-02 | TC-20-02（375px 觸控 57 項） | 7 次執行全部通過 |
| AC-22-01 | TC-22-01 | 失敗（BUG-002） |
| AC-22-02～05 | TC-22-02、TC-22-02b、TC-22-03、TC-22-03b、TC-22-04、TC-02-07、TC-22-05a | 全部通過（4 倍降速最大：套用 26.4、STT 26.8、滑桿 21.2 ms；首次載入 4 倍降速 360～483 ms） |
| 靜態與安全 | TC-S01～TC-S09 | 全部通過；產物 3,030,574 bytes，無外部資源；新增程式無 `innerHTML` 等禁用 API |
| 其他全套 | `npm run test:e2e` 其餘 TC | 與 v0.1 相同，全部通過 |

### 11.5 越界與安全（本輪）

| 項目 | 結果 |
| :--- | :--- |
| PG 本輪修改的檔案 | `src/app/views/speech-panel.js`（FE-12）、`src/app/views/phrasebank.js`、`src/app/styles/60-phrasebank.css`（FE-16）、`src/app/__tests__/speech.test.js`、`src/app/__tests__/phrasebank.test.js`（FE-19）、`dist/english-master-track.html`（主控建置）：皆在任務 paths 內 |
| boundary-check | 不屬於任何任務的檔案 0（任務 120、人類／上游 38、QA 26） |
| 觀察 | PG 執行 QA 腳本時寫入了 `tests/results/e2e-env.json`。這是 QA 目錄、不在 PG paths 內，屬執行測試的副作用，未修改測試程式；已由 QA 重跑覆蓋，不開缺陷。建議主控之後請 PG 改以 `QA_TMP` 或暫存目錄執行，或只讀不寫 |
| `docs/` | 本輪除 QA 文件外，只有 `docs/03-design/tasks.json` 有更新（主控同步狀態）；`docs/04-qa/bug-reports/` 未被 PG 修改 |
| 安全 | `clearResult()`、分批建立都以 `dom.el`／`textContent` 建立節點，沒有新增 HTML 字串插入；行內樣式只寫入數值高度 |

## 12. 退回修正第 2 輪驗證（v0.3）

範圍：只驗證 BUG-002，並回歸 AC-01-*、AC-02-*、AC-04-*、AC-05-*、AC-16-*、AC-20-02、AC-22-*。受測物 `dist/english-master-track.html` 3,047,158 bytes（TC-S09：QA 重建後位元組相同）。

### 12.1 執行紀錄

| 項目 | 指令 | 結果（QA 自行執行） |
| :--- | :--- | :--- |
| 單元測試 | `npm test` | 374 項全部通過、fail 0、todo 0 |
| 驗收全套 | `npm run test:e2e` | 160 項：通過 152、失敗 0、待人工 8；Edge 冒煙 25/25；`tests/results/summary.json` |
| 環境套件單獨重跑 | `node tests/e2e/e2e-env.mjs` × 2（全套前 1 次、全套後 1 次） | 兩次 18/18 通過；連同全套共 3 次執行 × 7 輪 = 21 輪效能樣本。`tests/results/e2e-env.json`、`tests/results/diag/perf-runs.json` 為最後一次 |
| 延後顯示診斷 | `node tests/e2e/diag-customizer-reveal.mjs`（QA 新增，不列入 run-all） | `#customizer-custom` 頂端 1017px、視窗高 900（首屏外）；`tests/results/diag/customizer-reveal.json` |

測試程式異動（QA）：`tests/e2e/e2e-env.mjs` 效能區塊改為多輪（`QA_PERF_RUNS`，預設 7）、TC-22-01 改嚴格量法、新增 TC-22-01r；AC-22-02～04（TC-22-02b、TC-22-04、TC-22-03b）仍為「全部樣本每筆 ≤ 100ms」，未放寬。

### 12.2 判定規則（人類決議）

依 JimmyLin 2026-10-30 決議「偶爾失敗沒關係」，TC-22-01、TC-16-01b、TC-16-01c 改用 test-plan v0.3 §2.3：每次執行 7 輪；排除「≥ 6/10 個切頁位置都 > 同位置跨輪中位數 2 倍」的輪次；有效輪 ≥ 3，且每個位置跨輪中位數 ≤ 100ms、合併 p90 ≤ 100ms。3 次執行都沒有輪次被排除。

### 12.3 嚴格量法 vs 寬鬆量法（AC-22-01）

FE-10 切到自訂器時先把首屏外的 `#customizer-custom` 設為 hidden，下一個畫格才顯示。AC-22-01 要求「新頁面完成繪製」，所以本輪以**嚴格量法**判定：在 rAF 回呼內偵測到該區已顯示，再等 `setTimeout 0`（該畫格繪製完成）。

4 倍降速，21 輪（ms）：

| 量法 | 第 1 次切到自訂器 中位數／p90／最大 | 全部 210 筆 中位數／p90／最大 | > 100ms | 依 §2.3 |
| :--- | :--- | :--- | :--- | :--- |
| 寬鬆（只到第一個畫格） | 24.4／46／54 | 26／37.1／89.2 | 0 | 符合 |
| **嚴格（判定）** | **52.2／86.1／124.9** | **29.9／49.9／124.9** | **2（117.1、124.9）** | **符合** |
| 嚴格 + 再一個畫格（參考） | 66.9／96.6／132.3 | 29.9／57.7／132.3 | 3 | 符合 |

一般條件嚴格量法 210 筆最大 49.6。**結論：以嚴格量法仍符合規則 → BUG-002 verified。** 延後顯示確實把約 28ms（中位數）移到第二個畫格，但連同這部分仍在 100ms 內。保守量法的 p90 已接近 100ms，基準環境若較慢可能超標，請 TC-M07 特別量測自訂器。

另外，自訂單字清單第一次只掛 20 筆、其餘閒置補上。這些節點都在首屏外的區塊中，4 倍降速時全部 30 筆在點擊後 75.4ms 補齊，不影響判定。

### 12.4 回歸結果

| 範圍 | TC | 結果 |
| :--- | :--- | :--- |
| AC-01-*、AC-02-* | `e2e-goal.mjs` 25 項（含 TC-02-07、TC-22-02、TC-22-03） | 全部通過；Edge 25/25 |
| AC-04-*、AC-05-* | `e2e-cards.mjs` 的 TC-04-01～08、TC-04-08b、TC-05-01～03、TC-05-05；TC-06-06 以 `QA_FIXTURE_NODATA` 執行 | 全部通過（套件 37/37） |
| AC-16-* | TC-16-01、TC-16-01b、TC-16-01c、TC-16-02、TC-16-03、TC-16-04a、TC-16-04b | 全部通過 |
| AC-20-02 | TC-20-02（375px 觸控） | 3 次執行皆通過 |
| AC-22-* | TC-22-01、TC-22-01r、TC-22-02、TC-22-02b、TC-22-03、TC-22-03b、TC-22-04、TC-22-05a | 全部通過。4 倍降速 21 輪最大：套用、滑桿、STT 皆 ≤ 46 ms；首次載入 4 倍降速 364～431 ms |
| 靜態與安全 | TC-S01～TC-S09 | 全部通過 |
| 其他全套 | `npm run test:e2e` 其餘 TC | 全部通過 |

### 12.5 越界與安全（本輪）

| 項目 | 結果 |
| :--- | :--- |
| PG 本輪修改的檔案 | `src/app/views/customizer.js`（FE-09）、`src/app/views/custom-vocab.js`（FE-10）、`src/app/views/phrasebank.js`、`src/app/styles/60-phrasebank.css`（FE-16）、`src/app/__tests__/customizer.test.js`、`custom-vocab.test.js`、`phrasebank.test.js`（FE-19）：皆在任務 paths 內 |
| boundary-check | 不屬於任何任務的檔案 0 |
| `docs/` | 除 QA 文件外只有 `docs/03-design/tasks.json`（主控同步狀態） |
| 安全 | 3 個 view 檔仍無 `innerHTML`／`outerHTML`／`insertAdjacentHTML`／`document.write`，也沒有外部網址；新增程式只切換 `hidden`、class 與數值樣式。產物無外部資源（TC-S01）、操作期間網路請求 0（TC-21-01） |

## 14. 第 3 輪驗收（PRD v0.10：v0.8 + v0.9 + v0.10）

範圍：all。PRD v0.10（33 個 US、214 個 AC；應驗收 192、暫停 22）、契約 v0.10、architecture v0.6、tasks.json v0.5（67 個任務全部 done）。本輪原為 v0.8 驗收（2026-10-30 暫停），2026-11-02 接續並擴大範圍。執行日期 2026-11-02。

### 14.1 執行紀錄

| 項目 | 指令 | 結果（QA 自行執行） |
| :--- | :--- | :--- |
| PG 單元測試 | `npm test` | 836 / 836 通過、fail 0、todo 0（參考，非驗收依據） |
| 資料自驗 | `npm run validate:data` | 錯誤 0、警告 61（與第 1 輪相同；`src/data/` 本輪未修改） |
| 靜態與越界 | `tests/static/static-check.mjs`、`boundary-check.mjs`、`boundary-delta.mjs`（皆含於 run-all） | TC-S01～TC-S10 10 / 10 通過；不屬於任何任務 0；增量超出 paths 0 |
| 驗收全套 | `npm run test:e2e`（2026-11-02 15:20 完成） | 250 項：通過 228、**失敗 1（TC-22-01m）**、待人工 8（舊 qa-review）、不適用 13；Edge 27 / 27；19 個子程序結束碼皆 0 |
| 效能套件單獨重跑 | `node tests/e2e/e2e-env.mjs` × 2（其他程式未執行時） | 兩次皆 18 / 18 通過、不適用 3；TC-22-01m 判定通過（見 §14.3） |
| 補記不適用 | `node tests/e2e/e2e-goal.mjs`（Chrome、Edge）、`e2e-firstrun.mjs` | 把 v0.10 暫停的 6 個 TC 記為「不適用（暫停）」後重跑；goal 22 通過 + 5 不適用、Edge 同、firstrun 25 通過 + 1 不適用 |
| QA 檢視 | `node tests/tools/qa-review-r3.mjs` | 寫入 `tests/results/qa-review.json`（TC-D18～D20、TC-B01～B03、TC-X-edge、人工 TC 15 個） |
| 彙整 | `node tests/tools/rebuild-summary.mjs`、`ac-matrix.mjs` | 最終 264 項：通過 230、失敗 0、待人工 15、不適用 19（`tests/results/summary.json`、`ac-matrix.json`） |

各套件最終結果：

| 套件 | 通過 | 失敗 | 待人工 | 不適用 |
| :--- | :--- | :--- | :--- | :--- |
| 資料 data-check | 17 | 0 | 0 | 0 |
| 靜態 static-check | 10 | 0 | 0 | 0 |
| e2e-goal（改寫） | 22 | 0 | 0 | 5 |
| e2e-cards | 37 | 0 | 0 | 0 |
| e2e-speech | 20 | 0 | 0 | 0 |
| e2e-content | 9 | 0 | 0 | 10 |
| e2e-env | 18 | 0 | 0 | 3 |
| e2e-persist | 1 | 0 | 0 | 0 |
| e2e-firstrun | 25 | 0 | 0 | 1 |
| e2e-progress | 18 | 0 | 0 | 0 |
| e2e-mic（新） | 11 | 0 | 0 | 0 |
| e2e-hidden（新） | 5 | 0 | 0 | 0 |
| e2e-reinit（新） | 15 | 0 | 0 | 0 |
| e2e-motion（新） | 15 | 0 | 0 | 0 |
| qa-review | 7 | 0 | 15 | 0 |
| **合計** | **230** | **0** | **15** | **19** |

### 14.2 測試程式更新（QA）

| 檔案 | 異動 |
| :--- | :--- |
| `tests/static/static-check.mjs` | TC-S05 改依 architecture §10 v0.5：`MediaRecorder` 在產物與 `src/app`（`__tests__` 除外）0 次；`getUserMedia` 只在 `services/mic.js`（產物 8 次 = mic.js 8 次）；`mic.js` 不含 `destination`、`Blob`、`createObjectURL`、`FileReader`、`fetch`、`XMLHttpRequest`、`WebSocket`、`sendBeacon`、`localStorage`、`indexedDB`、`caches`；speech-panel 的 store action 不帶音量參數。TC-S01 排除人類自放的 `dist/ads.txt`（不分大小寫）。新增 TC-S10（AC-31-04） |
| `tests/static/boundary-check.mjs`、`boundary-delta.mjs`（新） | 人類自放檔另列；新增增量越界檢查 |
| `tests/e2e/lib/cdp.mjs` | 加 `--autoplay-policy=no-user-gesture-required`；`close()` 可重複呼叫；結果新增「不適用（暫停）」 |
| `tests/e2e/lib/inits.mjs` | 新增 `fakeMic`（麥克風替身） |
| `tests/e2e/lib/state.mjs`（新） | 構造 `schemaVersion` 2 狀態（FB-36）、點卡片、套用與確認視窗、試算與主控台讀取、分數元件可見性 |
| `e2e-goal.mjs` | 改寫：只點卡片、預設 725、分數以 localStorage 驗證；新增 TC-26-06、TC-22-04（點卡片）；有學習紀錄時的確認視窗（TC-03-05）；5 個分數輸入 TC 記不適用 |
| `e2e-speech.mjs` | 加麥克風替身；按麥克風後等待進入聆聽中；AC-08-13 說明改 v0.9 全文；audio-capture 改「找不到麥克風裝置」；收音條檢查 |
| `e2e-cards.mjs`、`e2e-persist.mjs`、`e2e-progress.mjs`、`e2e-env.mjs` | 點卡片取代輸入分數；導覽 4 項；麥克風替身；解碼器、句型庫步驟移除；效能 10 個切頁位置改為 4 個功能區與資料來源頁；AC-22-04 改量點卡片；第二次量測前只重設學習紀錄 6 欄（避免初始化確認視窗干擾套用量測，保留 30 個自訂單字使條件與第 2 輪相同） |
| `e2e-content.mjs` | 解碼器、句型庫 TC 記不適用 |
| `e2e-firstrun.mjs` | 首次預設 725、只點卡片、導覽 4 項；新增 TC-26-05（可見性、Tab 焦點、無障礙樹）；TC-26-03 記不適用 |
| `e2e-mic.mjs`、`e2e-hidden.mjs`、`e2e-reinit.mjs`、`e2e-motion.mjs`（新） | US-33、AC-20-04、US-32、US-28／US-29／US-31 |
| `tests/run-all.mjs` | 加入新套件、Edge 冒煙改跑 e2e-goal 與 e2e-hidden、彙整「不適用（暫停）」、保留 qa-review.json |
| `tests/tools/`（新） | `ac-matrix.mjs`、`tc-list.mjs`、`tc-desc.json`、`qa-review-r3.mjs`、`rebuild-summary.mjs` |
| `tests/e2e/perf-phrasebank.mjs` | **移除**：量測對象句型庫頁已隱藏（AC-16-01 暫停），不再有意義 |
| `tests/e2e/diag-start-button.mjs`（新） | 診斷：首次畫面「開始學習」在各寬度是否需捲動（觀察事項 O-7） |
| 專案根目錄 `(a[r.result]` | 0 bytes，2026-10-30 14:51 由 QA 第 2 輪執行指令時誤建的空檔，已刪除 |

### 14.3 失敗與重跑說明（TC-22-01m，AC-22-01 減少動態模式）

AC-22-01（v0.8）規定減少動態模式下量到「新頁面完成繪製」。TC-22-01m 以 `prefers-reduced-motion: reduce` + 4 倍降速、嚴格量法、7 輪，依 test-plan §2.3 多輪判定。10 個位置中只有第 1 個（重新載入後第一次切到難易度設定，自訂單字 30 筆）接近上限：

| 執行 | 第 1 位置 7 輪原始值（ms） | 第 1 位置中位數 | 全部 70 筆 p90 | > 100ms | 判定 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 全套（15:02～15:13） | 126.5、154.6、61.6、66.5、62.4、116、193.1 | **116** | 102 | 9 | 不符 |
| 單獨重跑 1 | 154.3、76、87.8、68.7、97.3、149.3、119.1 | 97.3 | 87.8 | 5 | 符合 |
| 單獨重跑 2（最終） | 60.1、64.9、96.4、86.5、60.9、63.9、94.9 | 64.9 | 65.9 | 1 | 符合 |

判定：**通過（自動化參考，邊緣）**，不開缺陷。理由：(1) 3 次執行中 2 次符合規則；(2) 全套執行時 QA 於 15:11 同時執行診斷腳本（另一個 Chrome），第 6、7 輪的一般與降速量測同步偏高，該次結果受干擾；(3) 依人類決議（JimmyLin 2026-10-30「偶爾失敗沒關係」）採多輪判定。但此位置的中位數在 65～116ms 之間擺動、餘裕很小，與 BUG-002 是同一位置（第一次切到難易度設定），請 TC-M07 在基準環境以減少動態 + 4 倍降速特別量測；若基準環境超標，再開缺陷給 pg-frontend（FE-09／FE-10／FE-43）。

非減少動態（換頁動畫第一個影格，TC-22-01）三次皆符合：4 倍降速各位置中位數最大 64.8、p90 57.1。

### 14.4 AC 判定

判定欄：「通過」= 自動化通過；「通過（另待人工確認）」= 模擬環境通過，但 AC 含真機才能完整確認的部分（§14.6）；「待人工」= 核心部分只能由人類實機或人工判讀；「不適用（暫停）」= PRD 標暫停、本版不驗收。

| 判定 | AC 數 |
| :--- | :--- |
| 通過 | 151 |
| 通過（另待人工確認） | 37 |
| 待人工 | 4 |
| 失敗 | 0 |
| 不適用（暫停） | 22 |
| 合計 | 214 |

| AC | 判定 | 對應 TC |
| :--- | :--- | :--- |
| AC-01-01 | 通過 | TC-26-01、TC-01-01 |
| AC-01-02 | 通過 | TC-01-02 |
| AC-01-03 | 通過 | TC-01-03 |
| AC-01-04 | 通過 | TC-01-04 |
| AC-01-05 | 通過 | TC-01-05 |
| AC-01-06 | 不適用（暫停） | TC-01-06 |
| AC-01-07 | 通過 | TC-26-04、TC-01-07 |
| AC-02-01 | 不適用（暫停） | TC-02-01 |
| AC-02-02 | 不適用（暫停） | TC-02-02 |
| AC-02-03 | 通過 | TC-02-03 |
| AC-02-04 | 通過 | TC-02-04 |
| AC-02-05 | 通過 | TC-02-05a、TC-02-05b |
| AC-02-06 | 通過 | TC-02-06 |
| AC-02-07 | 不適用（暫停） | TC-02-07 |
| AC-02-08 | 通過 | TC-02-08 |
| AC-02-09 | 不適用（暫停） | TC-02-09 |
| AC-02-10 | 通過 | TC-02-10a、TC-02-10b |
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
| AC-04-06 | 通過 | TC-04-06 |
| AC-04-07 | 通過 | TC-04-07 |
| AC-04-08 | 通過 | TC-04-08、TC-04-08b |
| AC-04-09 | 通過 | TC-S03 |
| AC-05-01 | 通過 | TC-D11、TC-05-01 |
| AC-05-02 | 通過 | TC-D11、TC-05-02 |
| AC-05-03 | 通過 | TC-D11、TC-05-03 |
| AC-05-04 | 通過 | TC-05-02 |
| AC-05-05 | 通過 | TC-05-05 |
| AC-06-01 | 通過 | TC-D06、TC-06-01 |
| AC-06-02 | 通過 | TC-D06、TC-D07、TC-06-02 |
| AC-06-03 | 通過 | TC-06-02 |
| AC-06-04 | 通過 | TC-06-04 |
| AC-06-05 | 通過 | TC-06-04 |
| AC-06-06 | 通過 | TC-06-06、TC-04-08b |
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
| AC-11-05 | 通過 | TC-11-05 |
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
| AC-17-01 | 通過 | TC-17-01 |
| AC-17-02 | 通過 | TC-17-02、TC-30-03 |
| AC-17-03 | 通過 | TC-09-03 |
| AC-17-04 | 通過 | TC-17-04a、TC-17-04b |
| AC-17-05 | 通過 | TC-17-05 |
| AC-17-06 | 通過 | TC-17-06 |
| AC-18-01 | 通過（另待人工確認） | TC-18-01、TC-M04 |
| AC-18-02 | 通過 | TC-18-02 |
| AC-18-03 | 通過 | TC-18-03、TC-25-08 |
| AC-18-04 | 通過 | TC-18-04 |
| AC-18-05 | 通過 | TC-18-05、TC-25-09 |
| AC-18-06 | 通過 | TC-21-01 |
| AC-24-01 | 通過（另待人工確認） | TC-24-01、TC-18-03、TC-M06 |
| AC-24-02 | 通過 | TC-24-01、TC-24-02b |
| AC-24-03 | 通過（另待人工確認） | TC-24-03、TC-25-10、TC-M06 |
| AC-24-04 | 通過 | TC-24-04 |
| AC-24-05 | 通過 | TC-24-05、TC-24-11 |
| AC-24-06 | 通過 | TC-24-06 |
| AC-24-07 | 通過 | TC-24-07、TC-S07 |
| AC-24-08 | 通過 | TC-24-08 |
| AC-24-09 | 通過 | TC-24-09、TC-25-11d |
| AC-24-10 | 通過 | TC-24-10 |
| AC-24-11 | 通過 | TC-24-11 |
| AC-23-01 | 通過 | TC-23-01 |
| AC-23-02 | 通過 | TC-D10、TC-23-02、TC-23-02b、TC-25-07、TC-D18 |
| AC-23-03 | 通過 | TC-D08、TC-D18、TC-D19 |
| AC-23-04 | 待人工（TC-M08） | TC-D16、TC-M08 |
| AC-23-05 | 通過 | TC-D09 |
| AC-23-06 | 通過 | TC-S06 |
| AC-19-01 | 通過 | TC-27-05、TC-S01、TC-S08、TC-S09 |
| AC-19-02 | 通過（另待人工確認） | TC-19-02a、TC-X-edge、TC-M03 |
| AC-19-03 | 通過（另待人工確認） | TC-21-01、TC-M04 |
| AC-19-04 | 通過 | TC-S02 |
| AC-20-01 | 通過（另待人工確認） | TC-20-01、TC-27-01、TC-M05 |
| AC-20-02 | 通過（另待人工確認） | TC-20-02、TC-M05 |
| AC-20-03 | 通過（另待人工確認） | TC-20-03、TC-25-01、TC-27-04、TC-20-04a、TC-M05 |
| AC-20-04 | 通過 | TC-20-04a、TC-20-04b、TC-20-04c、TC-20-04d |
| AC-21-01 | 通過（另待人工確認） | TC-21-01、TC-M01 |
| AC-21-02 | 通過 | TC-S04 |
| AC-21-03 | 通過（另待人工確認） | TC-21-03b、TC-21-03、TC-M01、TC-S05 |
| AC-22-01 | 通過（另待人工確認） | TC-22-01、TC-22-01m、TC-22-01r、TC-M07 |
| AC-22-02 | 通過（另待人工確認） | TC-22-02b、TC-22-02、TC-M07 |
| AC-22-03 | 通過（另待人工確認） | TC-22-03b、TC-22-03、TC-M07 |
| AC-22-04 | 通過（另待人工確認） | TC-22-04b、TC-22-04、TC-M07 |
| AC-22-05 | 通過（另待人工確認） | TC-22-05a、TC-22-05b、TC-M07 |
| AC-25-01 | 通過 | TC-22-05b、TC-25-01 |
| AC-25-02 | 通過 | TC-25-02 |
| AC-25-03 | 通過 | TC-25-03 |
| AC-25-04 | 通過 | TC-25-04 |
| AC-25-05 | 通過 | TC-25-05 |
| AC-25-06 | 通過 | TC-25-06 |
| AC-25-07 | 通過 | TC-25-07 |
| AC-25-08 | 通過 | TC-25-08 |
| AC-25-09 | 通過 | TC-25-09 |
| AC-25-10 | 通過 | TC-25-10 |
| AC-25-11 | 通過 | TC-25-11、TC-25-11d |
| AC-26-01 | 通過（另待人工確認） | TC-26-01、TC-M05 |
| AC-26-02 | 通過 | TC-26-02 |
| AC-26-03 | 不適用（暫停） | TC-26-03 |
| AC-26-04 | 通過 | TC-25-03、TC-26-04 |
| AC-26-05 | 通過 | TC-26-05 |
| AC-26-06 | 通過 | TC-26-06 |
| AC-27-01 | 通過（另待人工確認） | TC-27-01、TC-M05 |
| AC-27-02 | 通過（另待人工確認） | TC-27-02、TC-M05 |
| AC-27-03 | 待人工（TC-M09（虛擬鍵盤）） | TC-27-03、TC-M09 |
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
| AC-30-08 | 通過 | TC-30-08 |
| AC-30-09 | 通過 | TC-30-09 |
| AC-30-10 | 通過 | TC-30-10、TC-30-10b |
| AC-30-11 | 通過 | TC-30-11 |
| AC-30-12 | 通過 | TC-30-12 |
| AC-30-13 | 通過 | TC-30-13、TC-30-07c |
| AC-30-14 | 通過 | TC-30-14 |
| AC-31-01 | 通過 | TC-31-01 |
| AC-31-02 | 通過 | TC-31-02 |
| AC-31-03 | 通過 | TC-22-01m、TC-33-08、TC-31-03、TC-31-03d |
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

### 14.5 新增與修改 AC 的重點結果

| 範圍 | 結果 |
| :--- | :--- |
| 只選色級（R-19） | 卡片與主控台不顯示分數範圍與目標分數；點 5 張卡片後 localStorage 依序 215、465、725、855、990；首次預設 725；既有 600、735 等 12 個分數不轉換、選中卡片與試算正確（TC-26-06）；首次畫面、一般頁、主控台在 375／1366 寬皆無可見或可 Tab 聚焦的分數元件、無障礙樹無滑桿或數字輸入（TC-26-05） |
| 切換難易度初始化（US-32） | 視窗兩行文字逐字相符、只有 2 個按鈕、背景不可操作；確定後 6 欄回到與「清除網站資料後按開始學習」相同的值，自訂單字與 STT 已讀保留；取消／Esc／點視窗外三者相同；(a)～(f) 各 1 項成立皆跳視窗；綠 ↔ 藍 ↔ 金不跳；寫入失敗時畫面與 localStorage 都不變（TC-32-01～TC-32-11b） |
| 麥克風與收音條（US-33） | 替身音源 −55～−5 dBFS 亮格 0～5、靜音 0；同頁 5 次按下 getUserMedia 只呼叫 1 次；離開單字卡頁 121～139ms 內音軌全部 ended；拔除、找不到、權限被拒、API 不存在各分支正確；減少動態下收音條無過渡、「聆聽中」不閃爍（TC-33-01a～TC-33-08、TC-08-09b） |
| 隱藏頁（AC-20-04） | 375／1366 寬 5 個可到達頁面的畫面、入口、Tab 焦點、無障礙樹皆無解碼器與句型庫；7 種網址片段、以片段開啟、重新載入、匯入備份後都只顯示主控台；交付檔仍含長難句 50、閱讀策略 3、句型 100（TC-20-04a～d） |
| 手勢、回饋、換頁（v0.8 US-28、US-29、US-31） | 翻卡 360ms、作答動畫 480ms、換頁 240ms 皆在上限內；滑動門檻 50px、垂直為主不換卡；測驗模式滑動不作答；震動 40ms／160ms（含停頓）；減少動態下全部直接顯示最終狀態且震動仍呼叫（TC-28-01～TC-31-03） |

### 14.6 人工驗收清單（待人類）

詳細步驟與通過條件見 test-plan v0.4 §6。第 1～2 輪的 TC-M01～TC-M08 尚未有人工結果，本輪依 PRD v0.10 改寫後仍列待人工。

| TC | 對應 AC | 重點 |
| :--- | :--- | :--- |
| **TC-MIC-1（V-MIC-1）** | **AC-33-01** | Windows 11 的 Chrome 與 Edge 以 `file://` 雙擊開啟，停留單字卡頁按 5 次麥克風，權限詢問只出現 1 次。若出現第 2 次，QA 依 PRD 開 BUG 附瀏覽器版本，由人類判斷是否接受為瀏覽器限制 |
| **TC-MIC-2（V-MIC-2）** | **AC-33-02** | 由導覽、主控台入口離開，及 F5、關閉分頁：1 秒內使用中圖示消失、`EMT.services.mic.tracks()` 全為 `ended` |
| TC-MIC-3（V-MIC-3） | AC-33-03、AC-33-08 | 真實說話時 5 格點亮；Windows 動畫效果關閉後無漸變、不閃爍 |
| TC-MIC-4（V-MIC-4） | AC-08-09 | 權限「封鎖」的訊息與再試 |
| TC-MIC-5（V-MIC-5） | AC-33-05、AC-33-06 | 拔除 USB 麥克風 |
| TC-M01 | AC-08-01、AC-08-09、AC-08-13、AC-08-14、AC-21-01、AC-21-03 | 真實麥克風流程與 DevTools 檢查不留存音訊 |
| TC-M02 | AC-07-01～AC-07-05 | 真實 TTS |
| TC-M03 | AC-19-02 | 實際斷網 |
| TC-M04 | AC-19-03、AC-18-01 | 雙擊開啟、關閉重開 |
| TC-M05 | AC-20-01～AC-20-03、AC-26-01、AC-27-01、AC-27-02、AC-28-03～AC-28-06 | Android 實機觸控與滑動 |
| TC-M06 | AC-24-01、AC-24-03 | 跨裝置匯出匯入 |
| TC-M07 | AC-22-01～AC-22-05 | 基準環境效能；**請特別量減少動態 + 4 倍降速下第一次切到難易度設定（§14.3）** |
| TC-M08 | AC-23-04 | §6.2 的 20 筆精確片語搜尋 |
| TC-M09 | AC-27-03 | Android 虛擬鍵盤不遮輸入欄 |
| TC-M10 | AC-29-02、AC-29-03 | Android 實機震動、iOS Safari 不震動不報錯 |

自動化參考值（本機無頭 Chrome，最終執行；非基準環境）：

| 量測 | 一般 | 4 倍降速 | 上限 |
| :--- | :--- | :--- | :--- |
| 切頁到動畫第一個影格（AC-22-01，7 輪 × 10） | 各位置中位數最大 47.8、最大 50.6 | 中位數最大 64.8、p90 57.1、最大 103.2（1/70 筆 > 100） | 100 ms（中位數、p90） |
| 減少動態切頁到完成繪製（AC-22-01） | — | 中位數最大 64.9、p90 65.9（另兩次執行見 §14.3） | 同上 |
| 套用最大單字集 5,650 張（AC-22-02） | 最大 17.8 | 最大 73.2 | 每筆 100 ms |
| STT `onresult` → 徽章（AC-22-03） | 最大 22.5 | 最大 44 | 每筆 100 ms |
| 點卡片到試算繪製（AC-22-04） | 中位數最大 18.1、最大 21.5 | 中位數最大 30、p90 40.3、最大 51.9 | 100 ms（中位數、p90） |
| 開啟到可點擊（AC-22-05，7 輪 × 5） | 主控台 p90 113、最大 117；首次畫面 p90 111、最大 114 | 主控台 p90 621、最大 640；首次畫面 p90 635、最大 700 | 3,000／6,000 ms |
| 滑動換卡：手指離開到新卡（AC-28-03） | 1.2～1.4 | — | 100 ms |
| 作答到顯示顏色（AC-29-01） | 5.2～12.7 | — | 100 ms |
| 收音條讀取間隔（AC-33-03） | 中位數 46.8、最大 61.9；結束後歸暗 0.3～67.4 | — | 100 ms |

### 14.7 觀察事項（不構成缺陷）

| # | 事項 | 判定與建議 |
| :--- | :--- | :--- |
| O-7 | 375 寬首次畫面的「開始學習」要往下捲才看得到：375×667 需捲 695px、375×812 需捲 550px、390×844 需 518px、412×915 需 447px；768、1366 寬不需捲動。按鈕區為一般排版（`position: static`），位於 5 張卡片與試算區之後（`tests/results/diag/start-button.json`） | PRD 沒有規定「開始學習」須免捲動可見，AC-25-01 只要求顯示，**不違反 AC**。是否改為固定在畫面底部，請人類決定；若要改，需回 PM 補 AC 再由 SD／PG 實作 |
| O-8 | 一般難易度設定頁「點棕 →『套用』→ 取消」後，**在任何寫入前重新整理**，選中卡片為棕（試算 10 字/天），但生效色級仍為綠、單字集不變；localStorage 為 `draftScore` 465／`appliedScore` 600（TC-32-04obs） | 依契約 CI-9（取消不寫入，維持 AC-32-04「localStorage 與按套用前完全相同」）、FB-35、SD T-43 的設計結果。AC-32-04 只規範取消當下（選中回綠、目標分數 600），重新整理後的狀態屬 AC-01-03「點卡片未套用」語意，**不違反 AC**。使用者可能困惑「選中棕卻沒生效」，列人類判斷是否接受 |
| O-9 | 減少動態 + 4 倍降速下，重新載入後第一次切到難易度設定的時間餘裕小（中位數 65～116ms，§14.3） | 自動化 2/3 次符合多輪判定；請 TC-M07 在基準環境確認 |
| O-10 | 專案中有 3 個非 PG、非建置產物的檔案：`dist/ads.txt`（AdSense，58 bytes；本輪 QA 期間由 `Ads.txt` 更名為小寫，dist 目錄修改時間 14:38）、`LICENSE`（11:02）、`.github/workflows/static.yml`（11:28，把 `dist/english-master-track.html` 部署為 GitHub Pages 的 `index.html`） | 依主控指示不列缺陷、未修改。提醒：若之後頁面要實際載入 AdSense 廣告，會產生網路請求，與 AC-21-01（頁面請求 0）、NFR-3 衝突，須先修訂 PRD |
| O-11 | 一般難易度設定頁點卡片會立即把 `draftScore` 寫入 localStorage（未按套用）；重新載入後選中卡片保留 | 符合契約 GS 與 AC-02-08 既有語意（O-8 的成因），只記錄 |
| O-12 | AC-30-10 的 PRD 例子為單字集 200 字／已掌握 50 字；正式資料最小單字集 1,000，改以 1,000／250 同比例驗證（25%） | 與第 3 輪暫停前的判斷相同，通過 |
| O-13 | TC-22-01 嚴格量法在第 2 輪的觀察（O-1～O-6）中，O-1（解碼器註解片段）隨解碼器暫停不再適用；O-2（toast 蓋住底部操作）本輪未再出現於自動化觸控測試（TC-20-02 等待 toast 消失後操作），仍建議實機觀察 | — |

### 14.8 需要人類決定的事項

| # | 事項 | 選項 |
| :--- | :--- | :--- |
| H-1 | V-MIC-1～V-MIC-5 實機測試（AC-33-01、AC-33-02 的判定依此） | 請在 Windows 11 以 Chrome、Edge 由 `file://` 執行 test-plan §6 TC-MIC-1～5，並記錄瀏覽器版本；AC-33-01 若出現第 2 次詢問，QA 開 BUG 後由人類判斷是否接受為瀏覽器限制 |
| H-2 | 第 1～3 輪累積的人工 TC（TC-M01～TC-M10） | 安排實機與基準環境驗收；TC-M07 請加量減少動態模式（O-9） |
| H-3 | 375 寬「開始學習」需捲動（O-7） | (A) 維持現狀；(B) 改為固定在畫面底部（需 PM 補 AC） |
| H-4 | 取消確認視窗後重新整理，選中卡片與生效色級不一致（O-8） | (A) 接受（契約 FB-35 現行設計）；(B) 取消時也把 `draftScore` 還原寫入（需 PM 修 AC-32-04「localStorage 與按套用前完全相同」的文字，SA 改 CI-9） |
| H-5 | `dist/ads.txt`、`LICENSE`、`.github/workflows/static.yml`（O-10） | 確認為人類自行加入；若要投放廣告，需先修訂 PRD（AC-21-01、NFR-3） |

### 14.9 越界與安全（本輪）

| 項目 | 結果 |
| :--- | :--- |
| 檔案歸屬（TC-B01） | 232 個檔案：屬於任務 140、人類／上游文件 38、QA `tests/` 51、人類自放 3（`dist/ads.txt`、`LICENSE`、`.github/workflows/static.yml`）、**不屬於任何任務 0**；`src/app/styles/90-overrides.css` 仍未建立（非缺陷） |
| 增量（TC-B03） | 2026-10-30 18:20 之後修改的 `src/`、`tools/`、`dist/`、`sources/` 檔案 36 個，**全部在 FE-34～FE-44 的 paths 內**。主控授權的 FE-41 `backup.test.js`、FE-43 `views/flashcards.js`、`flashcards.test.js` 已列在 tasks.json paths；FE-26 `naming.test.js`、FE-30 `_fixtures.js` 屬第 3 輪暫停前的授權，同樣在 paths 內。`src/data/` 未修改 |
| 上游與原始需求（TC-B02） | `english_master_track.md` 最後修改 2026-10-29；`sources/` 無變更；`docs/` 的修改只有 PRD v0.10、契約 v0.10、architecture v0.6、tasks.json v0.5（上游角色與主控，皆 approved）與 `docs/04-qa/`（QA）；bug-reports 未被 PG 修改 |
| 建置產物（TC-S09） | QA 以 `tools/build.mjs --out` 重建，與 `dist/english-master-track.html` 位元組相同 |
| XSS | 自訂單字表單與匯入備份的 `<img src=x onerror=…>`、`<script>` 皆以純文字呈現（TC-04-04、TC-24-07、TC-S07） |
| 禁用 API（TC-S03） | `src/app`（不含 `__tests__`）與產物：`innerHTML`、`outerHTML`、`insertAdjacentHTML`、`document.write`、`eval`、`new Function`、`on*` 屬性字串皆 0 |
| 外部資源（TC-S01、TC-S10、TC-27-05） | 產物無 `<script src>`、`<link href>`、`@import`、外部 `url()`、`<img>`、`<iframe>`、`@font-face`、CDN；無外部動畫／圖表／手勢函式庫；導覽圖示為內嵌 SVG |
| 網路請求（TC-21-01、TC-32-10、TC-21-03b） | 完整操作（含收音條、初始化確認、匯出）整個工作階段只有 `file://` 主檔 1 筆 |
| 錄音與音訊（TC-S05、TC-21-03b） | `MediaRecorder` 0；`getUserMedia` 只在 `mic.js`，只連到 `AnalyserNode`、不接 `destination`；使用後 localStorage 只有 `englishMasterTrack:state`（9 欄，無音量值）、IndexedDB 與 Cache Storage 空、無下載 |
| 金鑰與 SDK（TC-S04） | 無付費金鑰、無第三方語音 SDK |

### 14.10 回饋上游

| 編號 | 事項 | 對象 | 建議 |
| :--- | :--- | :--- | :--- |
| QA-FB-03 | AC-32-04「目標分數仍為 600（以 localStorage 驗證）」與同條「localStorage 與按『套用』前完全相同」並存時，localStorage 的 `draftScore` 會是點卡片時寫入的 465，只有 `appliedScore` 是 600。QA 以 `appliedScore` 判定 | PM、SA | 下次修訂 PRD 時把「目標分數」寫明為「目前目標分數（最近一次套用）」，或採 H-4 (B) |
| QA-FB-04 | V-MIC 項目（AC-33-01、AC-33-02）依決議無法自動化，QA 以替身做代理驗證（getUserMedia 呼叫次數、音軌 `readyState`）；最終判定仰賴人類實機 | SD | 架構 §10.2 可註明自動化代理項目與 TC 編號（TC-33-01a、TC-33-02a），方便人類對照 |

## 15. 第 4 輪驗收（PRD v0.11：PWA）

範圍：PRD v0.11（37 個 US、243 個 AC；應驗收 221、暫停 22），重點為 v0.11 新增的 29 個 AC（US-34～US-37、AC-24-12）與修訂的 5 個 AC（AC-19-01、AC-21-01、AC-21-03、AC-23-02、AC-23-06），並全套回歸。契約 v0.11、architecture v0.7、tasks.json（FE-45～FE-53 done；MC-01、MC-02 done；MC-03 未執行）。執行日期 2026-11-03。

### 15.1 執行紀錄

| 項目 | 指令 | 結果（QA 自行執行） |
| :--- | :--- | :--- |
| PG 單元測試 | `npm test` | 963 / 963 通過、fail 0（參考，非驗收依據） |
| 資料自驗 | `npm run validate:data` | 錯誤 0、警告 61（與前幾輪相同；`src/data/` 自 2026-10-30 12:15 未修改） |
| 建置可重現 | `node tools/build.mjs --out <暫存>` × 2 | HTML、manifest、sw.js 與部署目錄 8 檔逐位元組相同，且與 `dist/` 相同；BUILD_ID `d7085fd3fb24c46f` |
| 靜態 | `tests/static/static-check.mjs` | TC-S01～TC-S10 10 / 10 通過（TC-S01、TC-S06 依 v0.11 更新） |
| PWA 靜態與建置 | `tests/static/pwa-static.mjs` | 12 通過、待人工 1（TC-PWA-H4） |
| 越界 | `boundary-check.mjs`、`boundary-delta.mjs` | 不屬於任何任務 0；第 4 輪增量 44 檔、超出 FE-45～FE-53 paths 0 |
| 驗收全套（第 2 次，最終） | `npm run test:e2e`（2026-11-03 09:41 完成） | 23 個子程序結束碼皆 0；彙整後 311 項：通過 271、失敗 1（TC-34-03a）、待人工 20、不適用 19；Edge 40 項全部通過或不適用 |
| 驗收全套（第 1 次） | 同上（第 4 輪測試程式調整前） | TC-06-06、TC-30-10b：無內建資料 fixture 建置失敗（測試程式問題，見 §15.2）；TC-22-01m：效能邊緣（QA 同時執行建置檢查造成 CPU 競爭；第 2 次通過，判定規則同 §14.3） |
| QA 檢視 | `node tests/tools/qa-review-r4.mjs` | 寫入 `tests/results/qa-review.json`（TC-D18～D20、TC-B01～B03、TC-X-edge、人工 TC 18 個） |
| 彙整 | `rebuild-summary.mjs`、`ac-matrix.mjs`、`tc-list.mjs` | `tests/results/summary.json`、`ac-matrix.json`；test-plan §5、§7 |

各套件結果（第 2 次全套＋QA 檢視）：

| 套件 | 通過 | 失敗 | 待人工 | 不適用 |
| :--- | :--- | :--- | :--- | :--- |
| 資料 data-check | 17 | 0 | 0 | 0 |
| 靜態 static-check | 10 | 0 | 0 | 0 |
| PWA 靜態與建置 pwa-static（新） | 12 | 0 | 1 | 0 |
| e2e-goal | 22 | 0 | 0 | 5 |
| e2e-cards | 37 | 0 | 0 | 0 |
| e2e-speech | 20 | 0 | 0 | 0 |
| e2e-content | 9 | 0 | 0 | 10 |
| e2e-env | 18 | 0 | 0 | 3 |
| e2e-persist | 1 | 0 | 0 | 0 |
| e2e-firstrun | 25 | 0 | 0 | 1 |
| e2e-progress | 18 | 0 | 0 | 0 |
| e2e-mic | 11 | 0 | 0 | 0 |
| e2e-hidden | 5 | 0 | 0 | 0 |
| e2e-reinit | 15 | 0 | 0 | 0 |
| e2e-motion | 15 | 0 | 0 | 0 |
| e2e-pwa（新） | 22 | 1 | 0 | 0 |
| e2e-pwa-update（新） | 7 | 0 | 1 | 0 |
| qa-review | 7 | 0 | 18 | 0 |
| **合計** | **271** | **1** | **20** | **19** |
| BUG-003 複驗後合計（§15.11） | **272** | **0** | **20** | **19** |

Edge 冒煙：e2e-goal 22 通過＋5 不適用、e2e-hidden 5 通過、e2e-pwa 冒煙子集 8 通過（file:// 3 項、AC-24-12、manifest、註冊與快取、離線、安裝按鈕）。

### 15.2 測試程式更新（QA）

| 檔案 | 異動 |
| :--- | :--- |
| `package.json`、`package-lock.json`（新）、`node_modules/` | 新增 devDependency `playwright-core` 1.64.1（`--save-exact`）。不下載瀏覽器，使用本機 Chrome、Edge（`channel`）。建置與部署 workflow 不需要 |
| `tests/e2e/lib/pwa-env.mjs`（新） | Playwright 啟動、`tools/serve.mjs` 啟停（埠 8080，只關閉自己啟動的程序）、context 層請求記錄（含 service worker）、CDP `Log`／`Audits`、替身安裝事件（FB-42）、版面遮擋檢查、PNG 解碼與產生 |
| `tests/e2e/e2e-pwa.mjs`（新） | file:// 相容、manifest 與圖示、安裝按鈕、註冊與快取、離線、404、啟用條件、隱私、加入 PWA 前使用者、AC-24-12、AC-23-02 品牌聲明；`QA_BROWSER=edge` 跑冒煙子集 |
| `tests/e2e/e2e-pwa-update.mjs`（新） | V1 → V2 更新（V2 以 `src/app` 複本改 1 字建置，不改 `src/`）、離線時已部署 V2、首次畫面使用者、不按重新整理 |
| `tests/static/pwa-static.mjs`（新） | V-PWA-01～06、MC-03 新 workflow 本機模擬 |
| `tests/static/static-check.mjs` | TC-S01：`dist/site/` 為 PWA 部署目錄、`<link rel="icon" href="data:,">` 逐字白名單（恰 1 次，其餘樣式不放寬）；TC-S06：加驗 Q-48 品牌標識聲明 |
| `tests/static/boundary-check.mjs`、`boundary-delta.mjs` | 授權例外（`src/app/assets/icons/`、`sources/`、`.gitignore`、`.gitattributes`）與主控修改的 `static.yml` 另列；delta 預設改為第 3 輪結束後、FE-45 起；略過 `node_modules` |
| `tests/run-all.mjs` | 加入 pwa-static、e2e-pwa（Chrome、Edge）、e2e-pwa-update；無內建資料 fixture 改為「只含 `sources.js` 的資料目錄＋`--no-site`」（PWA 模式下資料目錄全空會 `LICENSE_YEAR` 中止，屬 architecture §5.1 的設計，非缺陷） |
| `tests/tools/qa-review-r4.mjs`（新）、`ac-matrix.mjs`、`tc-list.mjs`、`tc-desc.json` | 第 4 輪 QA 檢視、人工必要 AC（AC-34-02、AC-34-03、AC-34-05、AC-35-03、AC-36-07）、新 TC 說明 |
| `tests/e2e/diag-install-button.mjs`（新，不列入 run-all） | 「安裝 App」按鈕四角命中元素：圓角外側命中自身容器 `.dash-backup__install`，不算遮住 |
| 既有 E2E | 不需修改：既有腳本以 `dist/english-master-track.html`（file://）為受測物，路徑不變；檔案大小只有 AC-19-04 上限 5 MiB（3,278,334 bytes 仍符合） |

### 15.3 新增與修訂 AC 的判定（BUG-003 複驗後）

| AC | 判定 | 對應 TC |
| :--- | :--- | :--- |
| AC-24-12 | 通過 | TC-37-01a、TC-37-02、TC-24-12a、TC-24-12b |
| AC-23-02 | 通過 | TC-D10、TC-23-02、TC-23-02b、TC-25-07、TC-23-02c、TC-D18 |
| AC-23-06 | 通過 | TC-S06 |
| AC-19-01 | 通過 | TC-27-05、TC-PS-01、TC-PS-04、TC-PS-06、TC-S01、TC-S08、TC-S09 |
| AC-21-01 | 通過（另待人工確認） | TC-21-01、TC-37-05b、TC-37-01a、TC-37-01b、TC-37-05a、TC-M01 |
| AC-21-03 | 通過（另待人工確認） | TC-21-03b、TC-37-01a、TC-35-01、TC-37-05a、TC-21-03、TC-M01、TC-S05 |
| AC-34-01 | 通過（另待人工確認） | TC-34-01、TC-PS-02、TC-PS-03、TC-X-edge、TC-PWA-H1 |
| AC-34-02 | 待人工（TC-PWA-H1／H2） | TC-PWA-H1、TC-PWA-H2 |
| AC-34-03 | 待人工（TC-PWA-H1／H2） | TC-34-03a、TC-PS-03、TC-PWA-H1、TC-PWA-H2 |
| AC-34-04 | 通過 | TC-34-04、TC-PS-04 |
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
| AC-36-01 | 通過 | TC-36-01a、TC-36-01b、TC-36-01c、TC-36-01obs |
| AC-36-02 | 通過 | TC-PS-04、TC-PS-05、TC-36-01b、TC-36-02 |
| AC-36-03 | 通過（另待人工確認） | TC-36-03a、TC-36-03b、TC-36-03c、TC-36-04b、TC-36-03d、TC-PWA-H5 |
| AC-36-04 | 通過 | TC-36-03c、TC-36-04b、TC-36-03d |
| AC-36-05 | 通過（另待人工確認） | TC-36-03c、TC-PWA-H5 |
| AC-36-06 | 通過 | TC-36-06 |
| AC-36-07 | 待人工（TC-PWA-H4（MC-03 後）） | TC-PS-01、TC-36-07a、TC-PWA-H4 |
| AC-37-01 | 通過（另待人工確認） | TC-37-01a、TC-37-01b、TC-PS-04、TC-X-edge、TC-M03 |
| AC-37-02 | 通過 | TC-37-02 |
| AC-37-03 | 通過 | TC-37-03 |
| AC-37-04 | 通過 | TC-37-04 |
| AC-37-05 | 通過 | TC-37-05b、TC-37-05a、TC-PS-05 |
| AC-37-06 | 通過 | TC-37-06 |

重點結果：

| 情境 | 結果 |
| :--- | :--- |
| 安裝（manifest、圖示、按鈕） | manifest 與契約常數深度相等、10 鍵、相對路徑解析為部署目錄；3 個圖示 200、`image/png`、尺寸相符；一般設定檔 DevTools 可安裝性錯誤 0、Manifest 錯誤 0（Playwright 無痕 context 回報 `in-incognito`，屬環境因素）。替身事件（附 `prompt()`、`userChoice`）：事件前不顯示；事件後只在主控台、NT-1 之後、101×44、375／1366 不裁切不遮住；首次畫面與其他頁不顯示；接受、拒絕、連點皆 `prompt` 1 次；standalone 與 iOS `navigator.standalone` 不顯示 |
| 離線開啟 | 伺服器停止＋離線：`./`、`./index.html` 皆由 service worker 回應，主控台與各模組可用，資源錯誤 0；離線重新載入到模組入口可點擊：一般 106～120 ms、4 倍降速 509～722 ms（本機參考值，門檻 3 秒／6 秒） |
| 更新提示（兩個版本） | V1 `d7085fd3fb24c46f` → V2 `75b90e5430e53f1a`：重新載入後約 2 秒顯示「有新版本，重新整理」；V2 快取的 HTML 識別碼為 V2（伺服器 `max-age=600` 下仍取自伺服器）；按下後重新載入 1 次並為 V2；舊本專案快取刪除、`other-project-cache` 保留；localStorage 逐字不變；不按時維持 V1、關閉全部分頁重開為 V2；首次畫面使用者仍無狀態鍵；離線時以 V1 開啟、不提示 |
| file:// 相容 | Chrome、Edge，連網與斷網、只有 HTML 的空資料夾：`getRegistrations()` 以 `SecurityError` 拒絕（無註冊）、DOM 無 manifest／apple-touch-icon、頁面網路請求 0、Console 錯誤與警告 0、替身安裝事件未被監聽、無按鈕與提示、NT-1 顯示、Cache Storage 與 IndexedDB 空；完整操作含 STT 替身、匯出入備份 |
| 隱私 | https 版環境層請求（含 service worker 發出 7 筆）只有 `./`、`sw.js` 與預先快取 6 個網址，全部 GET、同源、無查詢字串；載入後學習操作請求 0；經過 1 次更新仍符合；無 `/favicon.ico`；快取只含預先快取 7 項（不含 `sw.js`、`ads.txt`） |
| 建置可重現 | 兩次建置逐位元組相同；改 `src/app` 1 字、改 `src/data` 內容 1 字、換 1 張圖示 → BUILD_ID 與 sw.js 皆改變；只改 `ads.txt` → 不變 |
| 加入 PWA 前的使用者（AC-37-06） | 以 git HEAD 的 `dist`（目前 GitHub Pages 部署版）學習後換成 PWA 版：鍵、欄位、內容完全相同，`schemaVersion` 2 |

### 15.4 失敗項目

| TC | AC | 結果 | 缺陷 |
| :--- | :--- | :--- | :--- |
| TC-34-03a | AC-34-03 | `icon-512.png` 最下方 1 列平均色 (172,186,204)（上一列 (33,100,173)），左下、右下角 (182,193,208)：來源圖灰色外框殘留。`icon-192`、`apple-touch-icon-180` 底邊偏淡但仍為藍色調；maskable 正常（白、橘像素最遠 203.8px，小於安全圓 204.8px） | BUG-003（minor，owner 主控 MC-01） |

### 15.5 人工驗收清單（待人類）

步驟見 test-plan §6.1。

| TC | 內容 | 對應 AC |
| :--- | :--- | :--- |
| TC-PWA-H4 | MC-03 後 push：Actions 成功、正式網址 8 檔 200 且與 artifact 相同、不含 docs／src／sources | AC-36-07 |
| TC-PWA-H1 | Windows Chrome、Edge 原生與畫面內安裝、名稱、獨立視窗、Manifest 面板、maskable 預覽、解除安裝；Firefox 無按鈕 | AC-34-01～03、AC-34-06、AC-34-07、AC-34-09、AC-34-10 |
| TC-PWA-H2 | Android Chrome 安裝、圓形遮罩、啟動畫面、飛航模式啟動 | AC-34-02、AC-34-03、AC-35-03 |
| TC-PWA-H3 | iOS Safari 加入主畫面 | AC-34-05、AC-34-08 (b) |
| TC-PWA-H5 | 正式網址已安裝 App 重新部署後更新、背景 ≥ 1 小時、同網域其他快取保留 | AC-36-03、AC-36-05 |
| TC-M03、TC-M06、TC-M07 | v0.11 加項：file:// 版 Application 面板無 service worker；file:// 版 → 網址版以備份轉移；V-PWA 離線重新載入 5 次 | AC-37-01、E-81、AC-35-04 |
| 沿用第 3 輪 | TC-M01～TC-M10、TC-MIC-1～5（尚未回報） | 見 §14.6 |

### 15.6 觀察事項（不構成缺陷）

| 編號 | 內容 |
| :--- | :--- |
| O-4-1 | AC-36-01 (b)：只改 `src/data` 的**註解**時，資料以 JSON 重新序列化、註解不進入交付 HTML，BUILD_ID 不變（TC-36-01obs）。交付物未變、不需要更新，QA 判定不違反 AC 目的；PRD「任一處」的字面可再釐清（§15.10） |
| O-4-2 | 首次畫面時若瀏覽器已觸發 `beforeinstallprompt`，事件會被保留；按「開始學習」進入主控台即顯示「安裝 App」。符合 IN-1、IN-3 |
| O-4-3 | 附屬檔 404 時 Chrome 自動記錄「A bad HTTP response code (404) was received when fetching the script.」，屬 AC-37-03 允許的瀏覽器 404 訊息；無未處理例外 |
| O-4-4 | 圖示四角補色以「同列往內第一個藍色」逐列填入，放大可見細微水平條紋（皆為藍色調，非灰色），不違反 AC-34-03；可與 BUG-003 一併由主控評估 |
| O-4-5 | file:// 下 `navigator.serviceWorker.getRegistrations()` 由瀏覽器以 `SecurityError` 拒絕（不是空陣列）；AC-37-01 的目的（沒有任何註冊）成立。產品程式依 PE-2 在 file:// 不呼叫此 API |
| O-4-6 | Edge 下載備份時，瀏覽器自身的下載中樞（`edge://downloads-hub`）在 context 層產生約 48 筆內部請求；不是頁面請求，已排除並另列 |
| O-4-7 | 本機 CRLF 工作目錄與 LF 複本（模擬 CI）的 BUILD_ID 不同（`d7085fd3fb24c46f` 與 `08b6190f9940c8f4`），屬已知事項 SD-FB-37 |
| O-4-8 | 第 1 次全套的 TC-22-01m（減少動態＋4 倍降速）不符多輪規則（QA 同時執行建置檢查造成 CPU 競爭）；第 2 次全套通過（最大中位數 71.1、p90 79.3）。與 §14.3 同一位置，仍請 TC-M07 於基準環境量測 |

### 15.7 越界與安全（本輪）

| 項目 | 結果 |
| :--- | :--- |
| 第 4 輪增量（TC-B03） | 2026-11-02 15:40（第 3 輪驗收結束）之後修改的 `src/`、`tools/`、`dist/`、`sources/`、`package.json`、`.git*`、`.github/` 共 44 檔：34 檔在 FE-45～FE-53 paths 內；授權例外 9 檔（`src/app/assets/icons/` 4、`sources/` 3、`.gitignore`、`.gitattributes`）；主控修改 `.github/workflows/static.yml` 1 檔（PRD R-20 風險 (3) 記載的 `Ads.txt` → `ads.txt`；MC-03 整檔取代尚未執行）；**超出 0**。檢查在 QA 安裝 devDependency 前執行；之後 `package.json` 的修改時間屬 QA |
| 檔案歸屬（TC-B01） | 不屬於任何任務 0；`src/app/styles/90-overrides.css` 仍不存在（只在發現問題時才寫，非缺陷） |
| 上游與資料（TC-B02） | `src/data/`、`english_master_track.md` 未修改；`docs/` 只有上游文件與 QA 文件；`tests/` 在第 3 輪結束到本輪開始之間未被他人修改；PG 未寫 `tests/`、`docs/04-qa/` |
| XSS | NT-1、「安裝 App」、新版提示皆為常數，以 `textContent` 寫入；禁用 DOM API 0（TC-S03） |
| 外部資源 | HTML 唯一 `<link>` 為 `data:` 圖示；無 `<script src>`、外部網址；動態連結只有同目錄 `manifest.webmanifest`、`icons/apple-touch-icon-180.png`；`sw.js` 無 `http(s)://`、`importScripts`（TC-S01、TC-PS-04～06） |
| 學習資料 | `sw.js` 無 `localStorage`、`indexedDB`、`postMessage`；頁面只送 `{ type: "SKIP_WAITING" }`；manifest 無 `share_target` 等外部資料欄位；PWA 模組無 `console.*` 輸出 |

### 15.8 需要人類決定或執行的事項

| 編號 | 事項 |
| :--- | :--- |
| H-4-1 | ~~BUG-003~~：主控已重新產生圖示，複驗通過（verified）；剩實機目視（TC-PWA-H1／H2） |
| H-4-2 | **MC-03 與提交**：依 §5.2 取代 `static.yml` 後，CI 只能取得已提交的檔案。目前以下 12 個 CI 建置必要檔尚未被 git 追蹤，須一併提交，否則 Actions 建置失敗：`src/app/assets/icons/` 4 張 PNG、`sources/deploy/ads.txt`、`src/app/core/pwa.js`、`src/app/pwa/sw.template.js`、`src/app/services/pwa.js`、`src/app/ui/pwa-notice.js`、`src/app/styles/80-pwa.css`、`tools/serve.mjs`、`.gitattributes`。另外，工作目錄中第 2 輪誤建、第 3 輪已刪除的空檔 `(a[r.result]` 在 git 中仍存在，提交時會一併刪除 |
| H-4-3 | **QA 新增的開發相依**：`package.json` 加入 `devDependencies.playwright-core`，並新增 `package-lock.json` 與 `node_modules/`。`.gitignore` 目前只有 `dist/site/`，請決定是否加入 `node_modules/`（建議加入）；是否提交 `package-lock.json` 由人類決定（workflow 不執行 `npm ci`，不受影響） |
| H-4-4 | 實機人工驗收：TC-PWA-H1～H5（§15.5、test-plan §6.1）；以及第 3 輪尚未回報的 V-MIC、TC-M01～M10 |
| H-4-5 | O-4-1：AC-36-01 (b) 只改資料檔註解不觸發更新，是否接受（QA 建議接受） |

### 15.9 缺陷

| BUG | 嚴重度 | owner | 任務 | AC | 狀態 | 一句話 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| BUG-003 | minor | 主控（MC-01） | MC-01 | AC-34-03 | verified（第 1 次來回修正後複驗通過） | `icon-512.png` 最下方 1 列與左下、右下角殘留來源圖灰色外框 |

### 15.10 回饋上游

| 對象 | 內容 |
| :--- | :--- |
| PM（PRD AC-36-01 (b)） | 「只改 1 個字（`src/app/` 或 `src/data/` 中任一處）」可改為「任一會進入交付 HTML 的字元」，避免資料檔註解被誤判（O-4-1） |
| SD（architecture §10.4） | (1) 無內建資料 fixture 在 PWA 模式需保留 `sources.js`（`LICENSE_YEAR`），建議在 §10 註明；(2) Playwright 一般 context 為無痕，`Page.getInstallabilityErrors` 會回報 `in-incognito`，可安裝性需用 `launchPersistentContext`；(3) §5.2「CI 建置的前提」所列檔案目前未提交，MC-03 執行時需一併處理 |
| 主控（MC-01） | BUG-003；`sources/pwa/README.md` 步驟 1 的裁切範圍與四角補色方式 |

### 15.11 BUG-003 複驗（第 1 次來回，2026-11-03）

主控重新產生 4 張圖示並重建（BUILD_ID `5b5ae7a6d4bd0164`，`npm test` 963 / 963）。QA 複驗：

| 項目 | 結果 |
| :--- | :--- |
| TC-34-03a | 通過：4 張圖示外圈 2px 非藍 0、灰 0；`icon-512.png` 底列 (20,92,171)、四角皆藍；maskable 圓外白 0、橘 0，最遠 203.8px < 204.8px |
| 靜態與建置 | static-check 10 / 10；pwa-static 12 通過＋1 待人工（TC-PWA-H4），含 PNG 規格、與來源位元組相同、可重現、MC-03 模擬 |
| 雙擊開啟 HTML 與部署 HTML | `dist/english-master-track.html` 與 `dist/site/index.html` 逐位元組相同；QA 重建與 `dist/` 相同 |
| 抽測 E2E | e2e-pwa Chrome 23 / 23、Edge 8 / 8；e2e-pwa-update 7 通過＋1 待人工（V1 `5b5ae7a6d4bd0164` → V2 `a7e3c5d36ac92bd9`） |
| 最終統計 | 311 個 TC：通過 272、失敗 0、待人工 20、不適用 19；AC：通過 212（47 另待人工確認）、待人工 9、失敗 0、不適用 22 |

BUG-003 改為 verified。AC-34-03 自動化通過，但圖示在實機上的外觀屬必要人工項目，因此判定為「待人工」（TC-PWA-H1／H2）。

### 15.12 觀察事項與待決事項清單

| 類別 | 編號 | 內容 | 處理者 |
| :--- | :--- | :--- | :--- |
| 待決 | H-4-2 | MC-03 取代 `static.yml` 時，須一併提交 12 個尚未追蹤的 CI 建置必要檔（4 張圖示、`sources/deploy/ads.txt`、PWA 程式 5 檔、`tools/serve.mjs`、`.gitattributes`）；`(a[r.result]` 的刪除也會一併提交 | 主控／人類 |
| 待決 | H-4-3 | QA 新增的 devDependency `playwright-core`：`.gitignore` 是否加入 `node_modules/`（建議加入）、是否提交 `package-lock.json` | 人類 |
| 待決 | H-4-4 | 實機人工：TC-PWA-H1～H5；第 3 輪的 V-MIC、TC-M01～M10 尚未回報 | 人類 |
| 待決 | H-4-5 | AC-36-01 (b)：只改資料檔註解不觸發更新，是否接受（QA 建議接受；回饋 PM 修字面） | 人類／PM |
| 待決 | H-4-6 | 2 個前次 QA 執行殘留的無頭 Chrome（PID 41376、40576，建立於 2026-11-02 14:42），本輪未啟動、未關閉 | 主控 |
| 觀察 | O-4-1 | 資料檔只改註解時交付 HTML 與 BUILD_ID 不變 | — |
| 觀察 | O-4-2 | 首次畫面收到 `beforeinstallprompt` 會保留，進入主控台即顯示按鈕（符合 IN-1、IN-3） | — |
| 觀察 | O-4-3 | 附屬檔 404 時 Chrome 自動記錄 404 訊息（AC-37-03 允許） | — |
| 觀察 | O-4-4 | 圖示四角逐列補色，放大可見細微藍色水平條紋（非灰色） | 主控（可選） |
| 觀察 | O-4-5 | file:// 下 `getRegistrations()` 以 `SecurityError` 拒絕，仍屬無註冊 | — |
| 觀察 | O-4-6 | Edge 下載中樞的內部請求不屬頁面請求，已排除 | — |
| 觀察 | O-4-7 | 本機 CRLF 與 CI LF 的 BUILD_ID 不同（SD-FB-37） | — |
| 觀察 | O-4-8 | TC-22-01m 減少動態效能邊緣，請 TC-M07 於基準環境量測 | 人類 |
| 回饋上游 | §15.10 | PM：AC-36-01 (b) 字面；SD：無資料 fixture 需 `sources.js`、Playwright 無痕可安裝性、CI 前提檔未提交 | PM／SD |

## 16. 第 5 輪驗收（PRD v0.13：版面與視覺）

範圍：PRD v0.13（41 個 US、270 個 AC；應驗收 36 個 US、248 個 AC，暫停 22），重點為 v0.12 新增的 27 個 AC（US-38～US-41）、修改的 30 個 AC 與 v0.13 的 AC-38-01 例外（標題列品牌圖示可用橘色），並全套回歸。契約 v0.13（§11、V-LAY-01～08）、architecture v0.8（§7.19、§10.5、§15）、tasks.json v0.7（CT-24、FE-54～FE-62 done）。執行日期 2026-11-03。

### 16.1 執行紀錄

| 項目 | 指令 | 結果（QA 自行執行） |
| :--- | :--- | :--- |
| PG 單元測試 | `npm test` | 1,134 / 1,134 通過、fail 0（80 個 suite）（參考，非驗收依據） |
| 資料自驗 | `npm run validate:data` | 錯誤 0、警告 61、結果通過（與前幾輪相同） |
| 靜態 | `tests/static/static-check.mjs` | TC-S01～TC-S11、TC-L-S01～S04 全數通過（TC-S09 重建與 `dist/` 逐位元組相同） |
| PWA 靜態與建置 | `tests/static/pwa-static.mjs` | 依 v0.12 更新 theme-color、`<title>`、manifest 色值後通過；TC-PWA-H4 待人工 |
| 越界 | `boundary-check.mjs`、`boundary-r5.mjs` | 不屬於任何任務 0；與 HEAD 相比 PG 變動 45 檔，超出 0 |
| 驗收全套 | `npm run test:e2e`（含 Chrome 全套、Edge 冒煙、`tools/serve.mjs` 埠 8080 的 PWA E2E） | 子程序結束碼：tests/data/data-check.mjs=0、tests/data/records-check.mjs=0、tests/static/static-check.mjs=0、tests/static/boundary-check.mjs=0、tests/static/boundary-r5.mjs=0、tests/static/pwa-static.mjs=0、tests/e2e/e2e-goal.mjs=0、tests/e2e/e2e-cards.mjs=0、tests/e2e/e2e-speech.mjs=0、tests/e2e/e2e-content.mjs=0、tests/e2e/e2e-env.mjs=0、tests/e2e/e2e-persist.mjs=0、tests/e2e/e2e-firstrun.mjs=0、tests/e2e/e2e-progress.mjs=0、tests/e2e/e2e-mic.mjs=0、tests/e2e/e2e-hidden.mjs=0、tests/e2e/e2e-reinit.mjs=0、tests/e2e/e2e-motion.mjs=0、tests/e2e/e2e-layout.mjs=0、tests/e2e/e2e-goal.mjs（edge）=0、tests/e2e/e2e-hidden.mjs（edge）=0、tests/e2e/e2e-pwa.mjs=3221226505、tests/e2e/e2e-pwa-update.mjs=0、tests/e2e/e2e-pwa.mjs（edge）=0 |
| 單獨重跑 | `node tests/e2e/e2e-pwa.mjs`、`node tests/e2e/e2e-env.mjs`、`node tests/static/pwa-static.mjs`（全套後） | e2e-pwa（Chrome）在全套中於第 5 項後程序異常結束（結束碼 3221226505 = 0xC0000409，未產生結果檔；同一次全套的 Edge 子集與 e2e-pwa-update 正常）；單獨重跑 23 / 23 通過。e2e-env：TC-18-05、TC-20-01 測試程式判定條件更新後重跑 21 項通過、3 項不適用（§16.6 O-5-2、O-5-7）。pwa-static：只更新 TC-PWA-H4 過時說明後重跑，12 通過＋1 待人工 |
| QA 檢視 | `node tests/tools/qa-review-r5.mjs` | `tests/results/qa-review.json`（TC-D18～D20、TC-B01～B03、TC-X-edge、TC-R5-J1～J4、人工 TC 21 個） |
| 彙整 | `rebuild-summary.mjs`、`ac-matrix.mjs`、`tc-list.mjs` | `tests/results/summary.json`、`ac-matrix.json`；test-plan §5、§7 |

各套件結果（彙整後）：

| 套件 | 通過 | 失敗 | 待人工 | 不適用 |
| :--- | :--- | :--- | :--- | :--- |
| data | 17 | 0 | 0 | 0 |
| e2e-cards | 37 | 0 | 0 | 0 |
| e2e-content | 9 | 0 | 0 | 10 |
| e2e-env | 18 | 0 | 0 | 3 |
| e2e-firstrun | 25 | 0 | 0 | 1 |
| e2e-goal | 22 | 0 | 0 | 5 |
| e2e-hidden | 5 | 0 | 0 | 0 |
| e2e-layout | 28 | 0 | 0 | 0 |
| e2e-mic | 11 | 0 | 0 | 0 |
| e2e-motion | 15 | 0 | 0 | 0 |
| e2e-persist | 1 | 0 | 0 | 0 |
| e2e-progress | 18 | 0 | 0 | 0 |
| e2e-pwa | 23 | 0 | 0 | 0 |
| e2e-pwa-update | 7 | 0 | 1 | 0 |
| e2e-reinit | 15 | 0 | 0 | 0 |
| e2e-speech | 20 | 0 | 0 | 0 |
| pwa-static | 12 | 0 | 1 | 0 |
| qa-review | 11 | 0 | 21 | 0 |
| static | 15 | 0 | 0 | 0 |
| **合計** | **309** | **0** | **23** | **19** |

失敗 TC：無

### 16.2 測試程式更新（QA）

| 檔案 | 異動 |
| :--- | :--- |
| `tests/e2e/e2e-layout.mjs`（新）、`lib/layout-probe.mjs`（新） | US-38～US-41 的 28 個 TC：色彩掃描、WCAG 對比、卡片與字級樣式、v0.11 對照（git `4fcbb9f`）、標題列圖示、鍵盤與減少動態、名稱與不改清單、主控台編排與寬度、進度條、首次畫面固定底部列；截圖存 `tests/results/diag/layout-r5/` |
| `tests/e2e/lib/state.mjs` | `clickCard`／`pressed`／`est` 改 `.cz-level`；`dashGoal` 改讀今日任務卡目標行；新增 `GOAL_LINE`、`dashStats`、`expandBackup` |
| `e2e-goal.mjs` | TC-01-01、TC-17-06 依 v0.12 改寫（精簡列表、目標行、無功能入口）；其餘目標區斷言改比對目標行字串 |
| `e2e-cards.mjs`、`e2e-hidden.mjs`、`e2e-reinit.mjs`、`e2e-firstrun.mjs`、`e2e-env.mjs` | 匯出、匯入前先展開「資料備份」；單字掌握數改讀「已掌握 N 字」、打卡改讀 3 格數據 |
| `e2e-content.mjs` | TC-17-01 改讀 3 格數據並檢查各只出現 1 次；TC-23-02 改由頁尾開啟並確認主控台本體無入口 |
| `e2e-env.mjs` | TC-20-02 的「主控台入口」改為觸控「資料備份」「變更」「開始今日學習」；AC-22-05 量測點改「開始今日學習」；TC-18-05 的「畫面正常顯示」由「文字 > 200 字」改為「開始今日學習可見且文字 > 50 字」（§16.6 O-5-2）；TC-20-01 的裁切偵測排除 AC-26-01 允許截斷的 `.cz-level__desc`（O-5-7） |
| `e2e-firstrun.mjs` | TC-25-01（摘要行取代試算結果卡）、TC-25-02／03／10（目標行）、TC-24-10（空狀態）、TC-26-01（精簡列表，一般頁與首次畫面） |
| `e2e-progress.mjs`、`e2e-reinit.mjs` | 主環中央只顯示 X（SD-FB-40）、小環形圖改 3 格數字、近 7 天空狀態（AC-30-01、AC-30-10、AC-30-12、AC-32-02） |
| `e2e-pwa.mjs`、`pwa-static.mjs` | 新色值 `#1e9bf0`／`#eef4fa`、`<title>` EnglishContext；安裝與 NT-1 檢查前展開「資料備份」，並加驗收合時隱藏；離線與 AC-35-04 就緒判定改「開始今日學習」；AC-37-06 的「加入 PWA 前版本」改取 `e9372f2`（HEAD 已是 PWA 版） |
| `e2e-persist.mjs`、`e2e-pwa-update.mjs` | 色級列選擇器 |
| `pwa-static.mjs`（TC-PWA-H4） | 更新過時說明：`static.yml` 已為 MC-03 新版，v0.12 尚未部署 |
| `tests/static/static-check.mjs` | 新增 TC-S11（cz-color__range 規則調整）、TC-L-S01～S04 |
| `tests/static/boundary-r5.mjs`（新）、`tests/run-all.mjs` | 與 git HEAD 比對的越界增量；run-all 加入 e2e-layout、改用 boundary-r5 |
| `tests/tools/qa-review-r5.mjs`（新）、`tc-list.mjs`、`tc-desc.json` | 第 5 輪 QA 檢視、人工 TC-LAY-H1～H3、新 TC 說明 |
| 診斷（不列入 run-all） | `diag-r5-dom.mjs`、`diag-r5-footer.mjs`、`diag-r5-p5clip.mjs`、`diag-r5-tab.mjs`、`diag-r5-textlen.mjs` |

### 16.3 新增 AC 判定（US-38～US-41）

| AC | 判定 | 對應 TC |
| :--- | :--- | :--- |
| AC-38-01 | 通過 | TC-38-01 |
| AC-38-02 | 通過（另待人工確認） | TC-38-02、TC-PWA-H2、TC-LAY-H3 |
| AC-38-03 | 通過 | TC-38-03 |
| AC-38-04 | 通過 | TC-38-04 |
| AC-38-05 | 通過（另待人工確認） | TC-38-05、TC-M03、TC-LAY-H2、TC-L-S04 |
| AC-38-06 | 通過 | TC-38-06、TC-R5-J1 |
| AC-38-07 | 通過 | TC-38-07、TC-L-S01 |
| AC-38-08 | 通過 | TC-38-08、TC-R5-J1 |
| AC-38-09 | 通過 | TC-38-09 |
| AC-38-10 | 通過 | TC-38-10、TC-L-S02、TC-L-S03 |
| AC-39-01 | 通過 | TC-39-01 |
| AC-39-02 | 通過 | TC-39-02 |
| AC-39-03 | 通過 | TC-39-03、TC-39-03b、TC-R5-J2 |
| AC-39-04 | 通過 | TC-39-04 |
| AC-39-05 | 通過 | TC-39-05、TC-R5-J2 |
| AC-39-06 | 通過 | TC-39-06 |
| AC-39-07 | 通過 | TC-39-07、TC-R5-J3 |
| AC-39-08 | 通過 | TC-39-08、TC-R5-J2 |
| AC-39-09 | 通過 | TC-39-09 |
| AC-39-10 | 通過 | TC-39-10 |
| AC-40-01 | 通過 | TC-40-01 |
| AC-40-02 | 通過 | TC-39-10 |
| AC-40-03 | 通過 | TC-38-03、TC-40-03 |
| AC-41-01 | 通過 | TC-41-01、TC-R5-J4 |
| AC-41-02 | 通過 | TC-41-02 |
| AC-41-03 | 通過（另待人工確認） | TC-41-03、TC-LAY-H1 |
| AC-41-04 | 通過（另待人工確認） | TC-41-04、TC-LAY-H1 |

重點量測（本機無頭 Chrome）：

| AC | 結果 |
| :--- | :--- |
| AC-38-01 | 標題列圖示（.app-logo）依 v0.13 例外不列入。375px 首次畫面：橘 1 處（cz-start.background-color）；375px 主控台：橘 3 處（db-start.background-color、db-stat__icon.fill）；375px 難易度設定：橘 0 處（無）；375px 單字卡：橘 0 處（無）；375px 模擬測驗：橘 0 處（無）；375px 資料來源與授權：橘 0 處（無）；1366px 首次畫面：橘 1 處（cz-start.background-color）；1366px 主控台：橘 3 處（db-start.background-color、db-stat__icon.fill）；1366px 難易度設定：橘 0 處（無）；1366px 單字卡：橘 0 處（無）；1366px 模擬測驗：橘 0 處（無）；1366px 資料來源與授權：橘 0 處（無）；不允許位置：無；主環形圖未達成進度色 375px #1e9bf0、1366px #1e9bf0；模擬測驗進度條填色 375px #1e9bf0、1366px #1e9bf0 |
| AC-38-04 | WCAG 公式量測可見文字（不含停用按鈕、Q-55 語意色、標題列圖示；鎖定列以 opacity 合成）：375px 首次畫面：量測 27 處、最小 5.32；375px 主控台：量測 38 處、最小 5.39；375px 難易度設定：量測 67 處、最小 5.18；375px 單字卡：量測 23 處、最小 5.18；375px 模擬測驗：量測 19 處、最小 5.39；375px 資料來源與授權：量測 108 處、最小 5.39；1366px 首次畫面：量測 27 處、最小 5.32；1366px 主控台：量測 38 處、最小 5.39；1366px 難易度設定：量測 67 處、最小 5.18；1366px 單字卡：量測 23 處、最小 5.18；1366px 模擬測驗：量測 19 處、最小 5.39；1366px 資料來源與授權：量測 108 處、最小 5.39；未達標 無 |
| AC-38-08 | v0.11（4fcbb9f）與 v0.12 單字卡頁元素樹（標籤、class、文字、順序）比對：375-card：元素 42/42、順序與文字相同=true；375-quiz：元素 37/37、順序與文字相同=true；1366-card：元素 42/42、順序與文字相同=true；1366-quiz：元素 37/37、順序與文字相同=true；幾何（收音條相對位置列入判定，其餘參考）：375-card 收音條相對位置 v0.11 (161,390) v0.12 (161,390)；375-card 相對頁面原點位置或尺寸差 > 1px 的元素 0；375-quiz 相對頁面原點位置或尺寸差 > 1px 的元素 0；1366-card 收音條相對位置 v0.11 (177,382) v0.12 (177,382)；1366-card 相對頁面原點位置或尺寸差 > 1px 的元素 0；1366-quiz 相對頁面原點位置或尺寸差 > 1px 的元素 0；截圖 tests/results/diag/layout-r5/r5-fc-*.png。AC-06～09、28、33 照常見既有套件 |
| AC-39-07 | 375px：(a) 長條 3,0,0,10,0,0,4、最高 64px（≤ 80）、圖表區 104px（≤ 120）；(b) 「開始學習後會顯示紀錄」、長條顯示=false、文字高 24px、圖表區（標題下至卡片內距）28px（≤ 48）、可見文字 ["開始學習後會顯示紀錄"]；學 1 字後回主控台 → 長條=true、今天 1；1366px：(a) 長條 3,0,0,10,0,0,4、最高 64px（≤ 80）、圖表區 104px（≤ 120）；(b) 「開始學習後會顯示紀錄」、長條顯示=false、文字高 24px、圖表區（標題下至卡片內距）28px（≤ 48）、可見文字 ["開始學習後會顯示紀錄"]；學 1 字後回主控台 → 長條=true、今天 1 |
| AC-39-09 | 375×667：捲動 0、按鈕下緣 245、底部導覽上緣 611、完整在視窗內=true、可點=true；由導覽切回 捲動 0 可見=true；390×844：捲動 0、按鈕下緣 245、底部導覽上緣 788、完整在視窗內=true、可點=true；由導覽切回 捲動 0 可見=true；412×915：捲動 0、按鈕下緣 245、底部導覽上緣 859、完整在視窗內=true、可點=true；由導覽切回 捲動 0 可見=true；768×1024：捲動 0、按鈕下緣 291、完整在視窗內=true、可點=true；由導覽切回 捲動 0 可見=true；1366×768：捲動 0、按鈕下緣 299、完整在視窗內=true、可點=true；由導覽切回 捲動 0 可見=true；1920×1080：捲動 0、按鈕下緣 299、完整在視窗內=true、可點=true；由導覽切回 捲動 0 可見=true |
| AC-41-03 | 375×667 選綠：不捲動三者在視窗內=true、可點=true、position fixed；捲到中段（93/186）=true、到底（186）=true；375×667 選藍：不捲動三者在視窗內=true、可點=true、position fixed；捲到中段（93/186）=true、到底（186）=true；390×844 選綠：不捲動三者在視窗內=true、可點=true、position fixed；捲到中段（5/9）=true、到底（9）=true；390×844 選藍：不捲動三者在視窗內=true、可點=true、position fixed；捲到中段（5/9）=true、到底（9）=true；412×915 選綠：不捲動三者在視窗內=true、可點=true、position fixed；捲到中段（0/0）=true、到底（0）=true；412×915 選藍：不捲動三者在視窗內=true、可點=true、position fixed；捲到中段（0/0）=true、到底（0）=true；768×1024 選綠：不捲動三者在視窗內=true、可點=true、position static；768×1024 選藍：不捲動三者在視窗內=true、可點=true、position static；1366×768 選綠：不捲動三者在視窗內=true、可點=true、position static；1366×768 選藍：不捲動三者在視窗內=true、可點=true、position static；1920×1080 選綠：不捲動三者在視窗內=true、可點=true、position static；1920×1080 選藍：不捲動三者在視窗內=true、可點=true、position static；375×812 選綠：不捲動三者在視窗內=true、可點=true、position fixed；捲到中段（21/41）=true、到底（41）=true；375×812 選藍：不捲動三者在視窗內=true、可點=true、position fixed；捲到中段（21/41）=true、到底（41）=true |
| AC-41-04 | 底部列高 152/152/152/180/180px（≤ 184）；捲到底頁尾連結下緣 459 ≤ 底部列上緣 487=true、可點=true；各色級列可捲到底部列上方 orange:true brown:true green:true blue:true gold:true；格式錯誤提示 [{"t":"備份檔格式錯誤，未匯入","b":471}]、底部列上緣 487，不被遮住=true；Tab 順序 row:orange,row:brown,row:green,row:blue,row:gold,cz-start,cz-restore,footer-sources |

### 16.4 修改 AC 判定與 PG 超出設計字面之處

| AC | 判定 | 對應 TC |
| :--- | :--- | :--- |
| AC-01-01 | 通過 | TC-26-01、TC-01-01、TC-S11 |
| AC-01-02 | 通過 | TC-01-02 |
| AC-01-07 | 通過 | TC-26-04、TC-01-07 |
| AC-17-01 | 通過 | TC-17-01、TC-39-05 |
| AC-17-06 | 通過 | TC-17-06、TC-39-04 |
| AC-22-05 | 通過（另待人工確認） | TC-22-05a、TC-22-05b、TC-39-09、TC-M07 |
| AC-35-04 | 通過（另待人工確認） | TC-35-04、TC-M07 |
| AC-23-02 | 通過 | TC-D10、TC-23-02、TC-23-02b、TC-25-07、TC-39-06、TC-23-02c、TC-D18 |
| AC-24-01 | 通過（另待人工確認） | TC-24-01、TC-18-03、TC-M06 |
| AC-24-12 | 通過 | TC-39-08、TC-37-01a、TC-37-02、TC-24-12a、TC-24-12b |
| AC-34-07 | 通過（另待人工確認） | TC-34-07、TC-PWA-H1 |
| AC-24-10 | 通過 | TC-24-10 |
| AC-30-12 | 通過 | TC-30-12 |
| AC-32-02 | 通過 | TC-32-02 |
| AC-25-01 | 通過 | TC-22-05b、TC-25-01、TC-41-01、TC-R5-J4 |
| AC-25-02 | 通過 | TC-25-02 |
| AC-25-03 | 通過 | TC-25-03 |
| AC-25-06 | 通過 | TC-25-06 |
| AC-25-10 | 通過 | TC-25-10 |
| AC-26-06 | 通過 | TC-26-06 |
| AC-26-01 | 通過（另待人工確認） | TC-26-01、TC-M05 |
| AC-30-01 | 通過 | TC-30-01 |
| AC-30-10 | 通過 | TC-39-05、TC-30-10、TC-30-10b |
| AC-33-02 | 待人工（V-MIC-2） | TC-33-02a、TC-MIC-2 |
| AC-34-01 | 通過（另待人工確認） | TC-34-01、TC-PS-02、TC-PS-03、TC-X-edge、TC-PWA-H1、TC-L-S02 |
| AC-34-02 | 待人工（TC-PWA-H1／H2） | TC-PWA-H1、TC-PWA-H2、TC-L-S02 |
| AC-36-01 | 通過 | TC-36-01a、TC-36-01b、TC-36-01c、TC-36-01obs |
| AC-34-03 | 待人工（TC-PWA-H1／H2） | TC-34-03a、TC-PS-03、TC-PWA-H1、TC-PWA-H2 |
| AC-34-05 | 待人工（TC-PWA-H3（iOS）） | TC-34-05a、TC-PS-03、TC-PS-04、TC-PWA-H3 |
| AC-34-08 | 通過（另待人工確認） | TC-37-01a、TC-37-01b、TC-34-07、TC-34-08、TC-PWA-H3 |

PG 回報超出設計字面之處（主控指示範圍 4）：

| 編號 | 內容 | 判定 |
| :--- | :--- | :--- |
| TC-R5-J1 | 單字卡頁另加 `#view-flashcards .card.fc-card { box-shadow: var(--shadow) }` | 不違反：`--shadow` 值與 v0.11 相同，單字卡本體維持 v0.11 陰影，正是 AC-38-08「只換配色」的要求；AC-38-06 明列單字卡本體不在範圍。TC-38-08 元素樹與相對幾何差異 0 |
| TC-R5-J2 | 主控台重繪清單加入 `streak` | 不違反：只重繪打卡數字，不寫 localStorage（TC-39-03、TC-39-08 前後逐字相同），打卡顯示照常（TC-17-02、TC-17-05） |
| TC-R5-J3 | 近 7 天卡片內距縮小 | 不違反：AC-39-07 只限高度，實測長條最高 64px、圖表區 104px、空狀態圖表區 28px；AC-38-06 不規定內距 |
| TC-R5-J4 | `#cz-guide` 直接不建立（設計原為 hidden） | 不違反：AC-41-01 規定的首次畫面元素不含引導文字；不建立與隱藏在畫面、Tab 順序、無障礙樹的結果相同 |

### 16.5 已知事項的處理

| 項目 | 處理 |
| :--- | :--- |
| 「產物不含 `cz-color__range`」命中 1 次 | 命中處為 `20-customizer.css` 檔頭記載 v0.10 刪除該 class 的歷史註解，不影響畫面與行為。**判定調整檢查規則、不開 BUG**：新規則 TC-S11 只檢查程式與 CSS 規則（去除註解），結果 0／0。若希望產物連註解都不含，可在下次修改該檔時順手刪除（非必要） |
| 測驗模式結構對照 | 依主控指示以初始化腳本固定 `Math.random`（種子 20261103）後比對，v0.11 與 v0.12 元素樹相同（TC-38-08） |
| SD-FB-39（標題列圖示橘色） | PRD v0.13 已將標題列品牌圖示列為 AC-38-01 例外；TC-38-01 掃描排除 `.app-logo`，其餘位置的橘色只有「開始今日學習」「開始學習」底色與打卡圖示 |

### 16.6 觀察事項（不構成缺陷）

| 編號 | 內容 |
| :--- | :--- |
| O-5-1 | 換頁轉場進行中（約 240ms）以座標點擊頁尾連結，可能因頁面高度改變而點不到（測試程式改為換頁後等待 350ms 再點）。屬既有換頁動畫行為，非本輪變更；實機手動操作不受影響 |
| O-5-2 | TC-18-05 第 1 次全套失敗：測試程式以「body 文字超過 200 字」判斷畫面正常顯示，v0.12 主控台精簡且資料備份預設收合，重設後主控台畫面文字實測 179 字（`diag-r5-textlen.mjs`）；4 種損壞資料的提示、目標行、localStorage 重設與原字串保存皆正確。改為「開始今日學習可見且文字超過 50 字」後重跑通過 |
| O-5-7 | TC-20-01 第 1 次全套失敗：通用的文字裁切偵測把 375px 難易度設定頁 `.cz-level__desc` 的省略號截斷判為裁切。AC-26-01（v0.12）明定說明「一行，過長截斷」（SD-FB-47），屬 AC 允許；排除該元素（名稱與數字仍檢查，另見 TC-26-01）後重跑通過 |
| O-5-8 | 全套中 e2e-pwa（Chrome）在第 5 項後程序異常結束（Windows 結束碼 0xC0000409，未寫出結果檔），同次全套的 Edge 子集正常；單獨重跑 23 / 23 通過。研判為本機 Playwright／瀏覽器程序偶發異常，非產品行為；若再發生請保留 `tests/results/tmp/r5-run-all.txt` |
| O-5-3 | 單字卡頁與其他頁卡片風格不同（單字卡頁維持 v0.11 的 8px 圓角與框線，SD-FB-42），符合 AC-38-08；若希望統一需修改 AC |
| O-5-4 | 首次畫面 375×667 選藍、金時固定底部列高 180px（設計預算 184px），色級列與頁尾都能捲到列上方；餘裕 4px，日後增加文字需注意 |
| O-5-5 | 1366×768 首次畫面的固定底部列依 SD-FB-46 隨內容排列，不捲動仍完整可見（TC-41-03） |
| O-5-6 | 樣稿 `docs/mockups/v0.12-layout-demo.html` 未作為判定依據；與交付版的差異（廣告框等）依 PRD 不在範圍 |

### 16.7 越界與安全（本輪）

| 項目 | 結果 |
| :--- | :--- |
| 第 5 輪增量（TC-B03） | 與 git HEAD `4fcbb9f`（v0.11 交付）比對，含 `.gitignore` 的 `dist/site/`：PG 變動 45 檔全部在 CT-24、FE-54～FE-62 paths 內（超出 0）；`src/app/styles/32-quiz.css`、`90-overrides.css` 未變動（允許）。授權例外：`docs/mockups/` 2 檔、`docs/01-PRD.md`、`docs/02-contract/` 3 檔、`docs/03-design/` 2 檔 |
| 檔案歸屬（TC-B01） | 不屬於任何任務 0 |
| 上游與 QA 目錄（TC-B02） | `english_master_track.md` 未修改；`sources/` 未修改；`tests/` 在本輪 QA 開始時與 HEAD 相同（PG 未寫入）；`docs/04-qa/` 在本輪 QA 開始前最後修改為第 4 輪 |
| XSS | 新增文字（目標行、摘要行、空狀態、原創內容來源）皆以 `textContent` 寫入；禁用 DOM API 0（TC-S03）；自訂單字 XSS 回歸通過（TC-04-09） |
| 外部資源 | 標題列圖示為內嵌 SVG 406 bytes、無 `xmlns`／`href`／`<image>`；CSS 無 `@font-face`、`url(`；`file://` 連網與斷網主文件以外的請求 0（TC-38-05、TC-L-S01、TC-L-S04） |
| 不改清單 | localStorage 鍵、`schemaVersion` 2、備份 `format`、匯出檔名 `english-master-track-backup-YYYYMMDD.json`、交付檔名、快取前綴、`emt-build-id` 與 v0.11 相同；v0.11 寫入的 localStorage 直接進主控台、資料逐欄相同；v0.11 備份可匯入（TC-38-10、TC-L-S03） |

### 16.8 需要人類決定或執行的事項

| 編號 | 事項 |
| :--- | :--- |
| H-5-1 | 實機人工驗收（test-plan §6.2）：TC-LAY-H1 固定底部列與安全區、TC-LAY-H2 標題列圖示清晰度、TC-LAY-H3 狀態列顏色 `#1e9bf0` |
| H-5-2 | 沿用前幾輪尚未回報的實機項目：V-MIC-1～5、TC-M01～M10、TC-PWA-H1～H5（步驟已依 v0.12 調整，見 test-plan §6.2 開頭） |
| H-5-3 | 部署：本輪變更尚未提交與部署；push 後 V-PWA (a) 的 TC-PWA-H1／H2／H5 與 TC-LAY-H3 才能在正式網址驗證 |

### 16.9 缺陷

本輪新開 0 張。既有 BUG-001、BUG-002、BUG-003 皆 verified，無 open 缺陷。

### 16.10 回饋上游

| 對象 | 內容 |
| :--- | :--- |
| SD（architecture §10.5） | 鍵盤 E2E 以 CDP 送 Enter 時需帶 `text`（否則按鈕預設動作不觸發）；Tab 序列量測前需重新載入或重設循序焦點起點，建議在 §10.5 註明 |

## 17. 變更紀錄

| 版本 | 日期 | 作者 | 說明 |
| :--- | :--- | :--- | :--- |
| 0.1 | 2026-10-30 | qa-agent | 初版：範圍 all；158 個 TC，通過 148、失敗 2、待人工 8；AC 覆蓋 141/141；開立 BUG-001、BUG-002 |
| 0.2 | 2026-10-30 | qa-agent | 退回修正第 1 輪驗證（§11）：BUG-001 verified；BUG-002 維持 open、retries 1（新增回歸 AC-16-01）；新增 TC-16-01c；冷啟動判定不列入自動化、改列 TC-M07 (7)；159 個 TC，通過 148、失敗 3、待人工 8 |
| 0.3 | 2026-10-30 | qa-agent | 退回修正第 2 輪驗證（§12）：依人類決議（JimmyLin「偶爾失敗沒關係」）TC-22-01、TC-16-01b、TC-16-01c 改用多輪判定（test-plan v0.3 §2.3）；TC-22-01 改採嚴格量法並新增 TC-22-01r；BUG-002 verified；TC-M07 新增 (9) 句型庫捲軸觀察、(10) 自訂器延後顯示觀察；160 個 TC，通過 152、失敗 0、待人工 8 |
| 0.4 | 2026-11-02 | qa-agent | 第 3 輪驗收（§0、§14）：範圍 PRD v0.10（v0.8 + v0.9 + v0.10），192 個 AC 應驗收、22 個不適用（暫停）。264 個 TC：通過 230、失敗 0、待人工 15、不適用 19；AC 通過 188（其中 37 另待人工確認）、待人工 4、失敗 0；新開缺陷 0。更新與新增測試程式（§14.2）；TC-22-01m 全套執行 1 次不符、單獨重跑 2 次符合，判定通過並列觀察（§14.3）；新增觀察 O-7～O-13、需人類決定 H-1～H-5、回饋上游 QA-FB-03、QA-FB-04。原 §13 變更紀錄改為 §15 |
| 0.5 | 2026-11-03 | qa-agent | 第 4 輪驗收（§0、§15）：範圍 PRD v0.11（新增 PWA），221 個 AC 應驗收、22 個不適用（暫停）。311 個 TC：通過 271、失敗 1、待人工 20、不適用 19；AC 通過 212（47 個另待人工確認）、待人工 8、失敗 1（AC-34-03）。新開 BUG-003（minor，主控 MC-01）。新增 Playwright（devDependency `playwright-core`）與 PWA 測試；第 3 輪結論移至 §0.1；變更紀錄改為 §16 ；同日 BUG-003 複驗通過改 verified（§15.11），最終 TC 通過 272、失敗 0、待人工 20、不適用 19，AC 通過 212（47 另待人工）、待人工 9、失敗 0；新增 §15.12 清單 |
| 0.6 | 2026-11-03 | qa-agent | 第 5 輪驗收（§0、§16）：範圍 PRD v0.13（版面風格調整，新增 US-38～US-41、修改 30 個 AC），248 個 AC 應驗收、22 個不適用（暫停）。351 個 TC：通過 309、失敗 0、待人工 23、不適用 19；AC 通過 239（52 個另待人工確認）、待人工 9、失敗 0。新開缺陷 0。新增 e2e-layout 等測試程式並依 SD-FB-45 更新既有 E2E（§16.2）；判定 PG 超出設計字面 4 處皆不違反 AC（§16.4）；「cz-color__range」靜態規則改為只查程式與 CSS 規則（§16.5）。第 4 輪結論移至 §0.1；變更紀錄改為 §17 |
