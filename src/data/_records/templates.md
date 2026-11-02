---
doc: CT-18-RECORD
version: 0.1
status: in-review
author: pg-content-agent
approved_by:
approved_at:
---

# CT-18 交付紀錄：領域範本 templates.js

## 1. 摘要

| 項目 | 內容 |
| :--- | :--- |
| 任務 | CT-18（第 2 批，`/pg-run`） |
| 涵蓋 | US-05、US-23、AC-05-01、AC-05-02、AC-05-03、AC-05-05、AC-23-04 |
| 依據 | 契約 v0.4（§3.1、§4 `DomainTemplate`、`TemplateWord`、`DomainTemplateId`、§7.3 V-TPL-01～04）、PRD v0.6 R-12、architecture.md v0.2 §8.3（P-1～P-9、O-1～O-5） |
| 產出 | `src/data/templates.js`（`window.DOMAIN_TEMPLATES`，3 範本 × 10 字 = 30 字）、本檔 |
| 來源 | 全部原創（`source: "ORIGINAL"`，O-4）；釋義、音標、搭配詞、例句、學術情境皆為本任務撰寫 |
| 日期 | 2026-10-30 |

## 2. 驗證結果

| 檢查 | 方式 | 結果 |
| :--- | :--- | :--- |
| V-TPL-01～04 | `node src/data/_tools/validate.mjs --file src/data/templates.js --stage final` | 錯誤 0、警告 0；V-TPL-01 通過 73、V-TPL-02 通過 4、V-TPL-03 通過 30、V-TPL-04 通過 2 |
| V-TPL-02 代表字 | 以 wordKey 比對 | cs 含 `latency`、`scalability`；business 含 `monetization`、不含 `synergy`；biostat 含 `heterogeneous` |
| V-TPL-03 內建字庫 | CT-01 `lib.mjs` 的 `loadWordlists` + `computeRanking`（N_G = 5,620）逐字比對 wordKey | 30 字皆不在排名集合 |
| V-TPL-03 補充 | 另將 `sources/wordlists/` 全部 7 個 csv（含 lemmatized 詞形）切成字詞比對 | 30 字皆未出現（避免挑到內建字的屈折形） |
| 撰寫慣例自查 | scratchpad 腳本 | IPA 字元集（P-9）通過；`example` 8～20 字、`academicContext` 8～25 字、`collocation` ≤ 80 字元、`meaning` ≤ 30 字；三個原創欄位皆含該字或其詞形 |

## 3. 30 字與 V-TPL-03 檢查結果

| # | 範本 | word | wordKey | 音標 | 釋義 | 在排名集合 | 在 7 份 csv 原文 |
| ---: | :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| 1 | cs 資工 | Latency | latency | /ˈleɪtənsi/ | 延遲；（網路）回應時間 | 否 | 否 |
| 2 | cs 資工 | Scalability | scalability | /ˌskeɪləˈbɪləti/ | 可擴展性；延展性 | 否 | 否 |
| 3 | cs 資工 | Throughput | throughput | /ˈθrupʊt/ | 吞吐量；處理量 | 否 | 否 |
| 4 | cs 資工 | Concurrency | concurrency | /kənˈkɝənsi/ | 並行；同時執行 | 否 | 否 |
| 5 | cs 資工 | Middleware | middleware | /ˈmɪdəlˌwɛr/ | 中介軟體 | 否 | 否 |
| 6 | cs 資工 | Serialization | serialization | /ˌsɪriələˈzeɪʃən/ | 序列化（將資料轉為可儲存或傳輸的格式） | 否 | 否 |
| 7 | cs 資工 | Idempotent | idempotent | /ˌaɪdəmˈpoʊtənt/ | 冪等的（重複執行結果相同） | 否 | 否 |
| 8 | cs 資工 | Containerization | containerization | /kənˌteɪnərəˈzeɪʃən/ | 容器化（以容器封裝與部署程式） | 否 | 否 |
| 9 | cs 資工 | Tokenization | tokenization | /ˌtoʊkənəˈzeɪʃən/ | 斷詞；標記化；代碼化 | 否 | 否 |
| 10 | cs 資工 | Overfitting | overfitting | /ˌoʊvɚˈfɪtɪŋ/ | 過度擬合；過擬合 | 否 | 否 |
| 11 | business 商管 | Monetization | monetization | /ˌmɑnətəˈzeɪʃən/ | 營利化；變現 | 否 | 否 |
| 12 | business 商管 | Disintermediation | disintermediation | /ˌdɪsˌɪntɚˌmidiˈeɪʃən/ | 去中間化；去仲介化 | 否 | 否 |
| 13 | business 商管 | Commoditization | commoditization | /kəˌmɑdətəˈzeɪʃən/ | 商品化；同質化（產品失去差異只能比價） | 否 | 否 |
| 14 | business 商管 | Onboarding | onboarding | /ˈɑnˌbɔrdɪŋ/ | 新進人員到職訓練；（客戶）導入流程 | 否 | 否 |
| 15 | business 商管 | Crowdfunding | crowdfunding | /ˈkraʊdˌfʌndɪŋ/ | 群眾募資 | 否 | 否 |
| 16 | business 商管 | Rebranding | rebranding | /riˈbrændɪŋ/ | 品牌重塑；更換品牌形象 | 否 | 否 |
| 17 | business 商管 | Upselling | upselling | /ˈʌpˌsɛlɪŋ/ | 追加銷售；向上銷售 | 否 | 否 |
| 18 | business 商管 | Franchisee | franchisee | /ˌfræntʃaɪˈzi/ | 加盟主；加盟業者 | 否 | 否 |
| 19 | business 商管 | Churn | churn | /tʃɝn/ | 客戶流失；流失率 | 否 | 否 |
| 20 | business 商管 | Divestiture | divestiture | /daɪˈvɛstɪtʃɚ/ | 撤資；出售資產或事業部門 | 否 | 否 |
| 21 | biostat 生醫統計 | Heterogeneous | heterogeneous | /ˌhɛtərəˈdʒiniəs/ | 異質的；不均一的 | 否 | 否 |
| 22 | biostat 生醫統計 | Covariate | covariate | /koʊˈvɛriət/ | 共變數；共變量 | 否 | 否 |
| 23 | biostat 生醫統計 | Confounder | confounder | /kənˈfaʊndɚ/ | 干擾因子；混淆變項 | 否 | 否 |
| 24 | biostat 生醫統計 | Stratification | stratification | /ˌstrætəfəˈkeɪʃən/ | 分層；分層分析 | 否 | 否 |
| 25 | biostat 生醫統計 | Randomization | randomization | /ˌrændəməˈzeɪʃən/ | 隨機分派；隨機化 | 否 | 否 |
| 26 | biostat 生醫統計 | Multicollinearity | multicollinearity | /ˌmʌltikəˌlɪniˈærəti/ | 多重共線性 | 否 | 否 |
| 27 | biostat 生醫統計 | Heteroscedasticity | heteroscedasticity | /ˌhɛtəroʊskəˌdæˈstɪsəti/ | 異質變異性；變異數不齊 | 否 | 否 |
| 28 | biostat 生醫統計 | Biomarker | biomarker | /ˈbaɪoʊˌmɑrkɚ/ | 生物標記；生物指標 | 否 | 否 |
| 29 | biostat 生醫統計 | Imputation | imputation | /ˌɪmpjəˈteɪʃən/ | （遺漏值）插補；填補 | 否 | 否 |
| 30 | biostat 生醫統計 | Comorbidity | comorbidity | /ˌkoʊmɔrˈbɪdəti/ | 共病；合併症 | 否 | 否 |

## 4. 挑字時排除的候選字

| 候選字 | 原因 |
| :--- | :--- |
| synergy | 在內建字庫（BSL Rank 1564），V-TPL-02／03 明定不得收錄 |
| stakeholder、diversification、profitability、liquidity、amortization、conglomerate、accrual、prevalence、epidemiology | 在 `computeRanking` 排名集合中（內建字庫） |
| outsourcing、benchmarking | 不在排名集合，但出現在 lemmatized 檔（為內建字的屈折形）；為避免與內建字重疊而不採用 |

## 5. 其他

| 項目 | 內容 |
| :--- | :--- |
| 長度超限 | 無（`multicollinearity`、`heteroscedasticity` 的 `collocation` 初稿超過 80 字元，已刪減搭配詞） |
| 例句未含詞形 | 無 |
| 寫入範圍 | 只寫入 `src/data/templates.js`、`src/data/_records/templates.md`；生成與檢查腳本放 scratchpad |
| 回饋上游 | 無 |

## 變更紀錄

| 版本 | 日期 | 作者 | 說明 |
| :--- | :--- | :--- | :--- |
| 0.1 | 2026-10-30 | pg-content-agent | 初版 |
