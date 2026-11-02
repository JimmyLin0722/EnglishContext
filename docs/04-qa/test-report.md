---
doc: TEST-REPORT
version: 0.3
status: in-review
author: qa-agent
approved_by:
approved_at:
---

# English Master Track — 測試報告（第 5 階段驗收）

> 依據：`docs/04-qa/test-plan.md` v0.3；PRD v0.7、契約 v0.7、architecture v0.3、tasks.json v0.2。受測物（v0.2，退回修正第 1 輪）`dist/english-master-track.html` 3,030,574 bytes（QA 以 `tools/build.mjs --out` 重建後與 `dist/` 位元組相同）；初版受測物 3,022,217 bytes。（v0.3，退回修正第 2 輪）受測物 3,047,158 bytes，只驗證 BUG-002 並回歸 AC-01-*、AC-02-*、AC-04-*、AC-05-*、AC-16-*、AC-20-02、AC-22-*，詳見 §12。執行日期 2026-10-30。v0.2 範圍只驗證 BUG-001、BUG-002，並回歸 AC-08-*、AC-15-*、AC-16-*、AC-20-02、AC-22-*、靜態與越界檢查，詳見 §11；其餘 TC 沿用 v0.1 結果（本輪 `npm run test:e2e` 全套重跑，其餘 TC 結果不變）。

## 1. 摘要

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

## 13. 變更紀錄

| 版本 | 日期 | 作者 | 說明 |
| :--- | :--- | :--- | :--- |
| 0.1 | 2026-10-30 | qa-agent | 初版：範圍 all；158 個 TC，通過 148、失敗 2、待人工 8；AC 覆蓋 141/141；開立 BUG-001、BUG-002 |
| 0.2 | 2026-10-30 | qa-agent | 退回修正第 1 輪驗證（§11）：BUG-001 verified；BUG-002 維持 open、retries 1（新增回歸 AC-16-01）；新增 TC-16-01c；冷啟動判定不列入自動化、改列 TC-M07 (7)；159 個 TC，通過 148、失敗 3、待人工 8 |
| 0.3 | 2026-10-30 | qa-agent | 退回修正第 2 輪驗證（§12）：依人類決議（JimmyLin「偶爾失敗沒關係」）TC-22-01、TC-16-01b、TC-16-01c 改用多輪判定（test-plan v0.3 §2.3）；TC-22-01 改採嚴格量法並新增 TC-22-01r；BUG-002 verified；TC-M07 新增 (9) 句型庫捲軸觀察、(10) 自訂器延後顯示觀察；160 個 TC，通過 152、失敗 0、待人工 8 |
