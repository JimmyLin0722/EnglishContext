---
doc: CT-15-RECORD
version: 0.3
status: in-review
author: pg-content-agent
approved_by:
approved_at:
---

# CT-15 交付紀錄：字庫內容第 13 批（vocab-4560.js）

## 1. 摘要

| 項目 | 內容 |
| :--- | :--- |
| 任務 | CT-15 |
| 涵蓋 | US-06、US-23、AC-06-01、AC-06-02、AC-06-08、AC-23-01、AC-23-03、AC-23-04 |
| 分檔 | `src/data/vocab-4560.js` |
| 排名區間 | 4,560～4,909（BSL 區段），350 筆，rank 連續 |
| 依據 | architecture.md v0.2 §8.2～§8.5；契約 v0.5（README §3.2 M-1～M-7、§7.2 V-VOC-01～18，V-VOC-10 依 DF-06）；`_records/CT-01.md` |
| 流程 | `material.mjs` 匯出素材 → 7 個分段檔 `part-01.jsonl`～`part-07.jsonl`（每檔 50 筆，放 scratchpad）→ `fill.mjs` 合併 → `validate.mjs --stage final` → `sample.mjs` 自查 |
| 欄位統計 | phonetic、meaning、collocation、academicContext、example：350／350 非空；pos 空 0 |
| `meaningSource` | ECDICT 344、ORIGINAL 6（本區間無 missing 字；6 筆依 M-6 改為原創，見 §3） |
| 日期 | 2026-10-30 |
| `sources/` | 只讀；修改時間仍為主控放置時間（ecdict 2026-10-30 09:28～10:06、wordlists 2026-10-29 15:59） |

## 2. 驗證結果（S-1、S-2、H-1～H-7）

指令：`node src/data/_tools/validate.mjs --file src/data/vocab-4560.js --stage final`
結果：**錯誤 0、警告 7；結果：通過**（exit 0；依最後一次執行的結果）

| 規則 | 結果 |
| :--- | :--- |
| FILE、LOAD、V-IN-01～07 | 通過 |
| V-VOC-01、02、03、05、06、07、13 | 通過，錯誤 0 |
| V-VOC-08（academicContext 必填） | 通過 350，錯誤 0 |
| V-VOC-09 | 錯誤 0、警告 6：6 筆 ORIGINAL 不在 missing 清單，原因見 §3 |
| V-VOC-10（v0.5） | 通過 4,027 項，錯誤 0、警告 0。null（4646）本身各欄位含 null 字樣，依 DF-06 明文允許；其他 349 筆沒有任何獨立單字 null／undefined |
| V-VOC-14（meaning 重複，只報告） | 警告 0。另以腳本比對其他 14 個分檔的現有 meaning，原本有 6 筆和其他分檔字串相同（analytical、explosion、portray、utilization、reinforcement、underestimate），已調整措辭或義項順序，現在跨檔重複 0 |
| V-VOC-15、16 | 通過，錯誤 0 |
| V-VOC-17 | 資訊 5 筆、警告 1 筆（script，見 §4，判斷「程式」正確） |
| S-2 骨架欄位未改動 | 通過 350（資訊 6：meaningSource ECDICT → ORIGINAL，允許） |
| H-1 簡體專用字 | 錯誤 0 |
| H-2 音標字元集與英式符號 | 錯誤 0（`aɪə` 等組合依 R5-2 直接寫標準形式，如 proprietary /prəˈpraɪəˌtɛri/、viable /ˈvaɪəbəl/、triumph /ˈtraɪəmf/，沒有加滑音 j） |
| H-3 長度上限 | 警告 0 |
| H-4 大寫開頭、句尾標點、含詞形 | 警告 0（collocation、example 全部含該字或 lemmatized 詞形；academicContext 也全部含詞形） |
| H-5 分檔內 example／meaning 重複 | 錯誤 0、警告 0 |
| H-7 平均每筆 bytes | 453.1 bytes（低於 600） |

## 3. `meaningSource = "ORIGINAL"` 清單（M-6、M-7、V-VOC-09）

本區間沒有 `ecdict_subset_missing.txt` 的字。下列 6 筆因 ECDICT 義項缺少該字在多益／商務中最主要的意思（或義項錯誤），依 M-2「新增義項即屬原創」改標 ORIGINAL：

| rank | wordKey | `_zhtw` 原文 | 最終 `meaning` | 原因 |
| :--- | :--- | :--- | :--- | :--- |
| 4596 | logistics | 後勤學, 後勤；[醫] 後勤學 | 後勤；物流；後勤學 | 缺商業最常用義「物流」（logistics company、logistics costs）；新增 1 個義項 |
| 4682 | viable | 能養活的, 能生長發育的；[醫] 有活力的, 有生機的 | 可行的；能生存的；有生機的 | 缺最常用義「可行的」（a viable option）；新增 1 個義項 |
| 4683 | subprime | 準一流的, 近乎頭等的; 準最低貸款利率的 | 次級的（指信用較差的貸款） | ECDICT 義項與實際用法不符（subprime 是低於優質等級，不是「準一流」）；整段改寫 |
| 4751 | competitiveness | [經] 競爭 | 競爭力 | 「競爭」是 competition 的意思，competitiveness 是「競爭力」；整段改寫 |
| 4833 | denominate | vt. 命名 | 命名；以（某貨幣）計價 | 缺財經最常用義（denominated in US dollars）；新增 1 個義項 |
| 4887 | downside | 底側；下降趨勢 | 缺點；不利之處；下降趨勢 | 缺最常用義「缺點；不利之處」（the downside of）；新增義項 |

## 4. 上下文用詞清單（V-VOC-17、M-7、H-6）

| rank | wordKey | 英文詞義 | 簡體原詞（出現位置） | 最終 `meaning` | 處理說明 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 4635 | acid | 酸；酸性的 | 「自动文档互参与索引生成程序」（`[计]` ACID 縮寫義項） | 酸；酸性的；尖刻的 | 電腦縮寫義項刪除；`meaning` 不含「文件」「檔案」「程序」「程式」 |
| 4722 | browser | 瀏覽器；瀏覽的人 | 「浏览程序」（`[计]`） | 瀏覽器；瀏覽書本的人 | 指電腦軟體，台灣通用「瀏覽器」；`_zhtw` 的「瀏覽程式」改為「瀏覽器」（同義、台灣用語），不含「程序」「程式」 |
| 4764 | trim | 修剪；整齊的 | 「库存管理检查规则程序」（`[计]` 縮寫義項） | 修剪；使整齊；整齊的 | 電腦縮寫義項刪除 |
| 4814 | script | 手稿；手寫體；（電腦）腳本 | 「小型程序」（`[计]`） | 手稿；手寫體；（電腦）小型程式 | 此義項指電腦上執行的指令碼，屬 program 意思，依 M-3 用「程式」正確（不是 procedure 的「程序」）。驗證器的 V-VOC-17 警告為預期，判斷保留「程式」 |
| 4851 | predictor | 預測者；預測變數 | 「预测程序」（`[计]`） | 預言者；預示變數 | 只保留「預言者」與統計用的「預示變數」，「預測程式」義項刪除 |

補充：coordination（4782）的簡體原檔是「进程协调」，`_zhtw` 被 s2twp 轉成「程序協調」，因為原詞不是 7 個上下文詞，不在 V-VOC-17 清單；這個電腦義項已刪除，最終 `meaning` 為「協調；同等」。

### 4.1 v0.6 新增比對詞清單（V-VOC-17 補產，R6-6）

依契約 v0.6 V-VOC-17，以腳本比對簡體原檔 `ecdict_subset.csv` 的 `translation` 是否含 M-3 補充表 10 詞（支持、类型、实例、触摸、局部、保存、社区、连接、循环、菜单），列出 `meaningSource = "ECDICT"` 的命中字共 **3 筆**；判斷欄依 architecture.md v0.3 §8.4、§8.5。

| rank | wordKey | 英文詞義 | 簡體原詞（出現位置） | `_zhtw` 轉換結果 | 最終 `meaning` | 判斷 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 4723 | cyclical | 週期的；循環的 | a.「循环的」、[计]「循环的」 | 迴圈 | 週期的；循環的；輪轉的 | 保留：已還原為「循環的」，英文詞義為景氣循環（cyclical industry） |
| 4763 | hub | 中心；轂；集線器 | [计]「连接器」 | 連線 | 中心；轂；集線器 | 不採用該義項：「連接器」（[計]）未列入；「集線器」為電腦設備，台灣用法正確；meaning 不含「連線」 |
| 4900 | conjunction | 結合；聯合；連接詞 | n.「连接词」 | 連線 | 結合；聯合；連接詞 | 保留：已還原為「連接詞」（文法用語），台灣用法正確 |

## 5. 清單外大陸用語修正（M-3、T-2）

| rank | wordKey | 原詞（`_zhtw`） | 改後 `meaning` | 說明 |
| :--- | :--- | :--- | :--- | :--- |
| 4701 | counterparty | 合同的一方; 對手方 | 合約的一方；交易對手方 | 「合同」為大陸用語，台灣用「合約」「契約」；「交易對手」為台灣金融用語 |
| 4709 | covariance | 協方差 | 共變異數 | 大陸統計術語，台灣用「共變異數」；同一義項，未新增 |
| 4811 | macro | 宏 | 巨大的；大量的；（電腦）巨集 | 電腦 macro 大陸稱「宏」，台灣稱「巨集」；`[計]` 依 T-3 改「（電腦）」括註 |
| 4723 | cyclical | 迴圈的 | 週期的；循環的；輪轉的 | **s2twp 過度轉換**：簡體原檔為「循环的」，被轉成程式用語「迴圈」；依原意改回「循環的」 |
| 4900 | conjunction | 連線詞 | 結合；聯合；連接詞 | **s2twp 過度轉換**：簡體原檔為「连接词」，被轉成「連線詞」；改回文法術語「連接詞」 |
| 4632 | icon | 像標 | 圖示；偶像；肖像 | 「像標」為大陸用語，刪除，保留 `_zhtw` 已有的「圖示」 |
| 4717 | robot | 機械人 | 機器人；自動機械 | 改用 `_zhtw` `[計]` 義項已有的「機器人」 |
| 4728 | processor | 資訊處理機 | 處理器；加工者；處理者 | 刪除「資訊處理機」，保留 `[計]` 的「處理器」 |
| 4598 | restraint | 剋制 | 抑制；克制；束縛 | 台灣標準寫法為「克制」 |
| 4579、4705 | enact、declaration | 頒佈、宣佈 | 頒布、宣布 | 依台灣教育部標準字體寫法 |
| 4805 | deregulation | 撤消 | 解除控制；撤銷管制規定 | 「撤消」改台灣常用寫法「撤銷」 |
| 4715 | prospectus | 創辦計劃書 | （募債）說明書；創辦計畫書；內容簡介 | 台灣名詞用「計畫」 |
| 4873 | extremist | 偏激份子 | 偏激分子 | 台灣標準寫法為「分子」 |

領域標記（T-3）：macro 的 `[計]` 改為「（電腦）」；script 的 `[計]` 改為「（電腦）」；reconciliation 的 `[經] (銀行往來)調節` 改為「（銀行往來）調節」。其餘 `[計]`、`[醫]`、`[法]`、`[經]`、`[化]` 標記都刪除，沒有保留在 `meaning` 中。

## 6. 自查抽樣（S-3）

指令：`node src/data/_tools/sample.mjs --file src/data/vocab-4560.js --ratio 0.1 --min 35 --seed 4560`
母體 350，抽出 **35 筆**。檢查項目：釋義是精簡而不是新增（對照 `_zhtw`）、沒有大陸用語、`pos` 和釋義一致、音標是美式而且正確、例句與學術句自然而且原創。

| # | rank | wordKey | 結論 | 備註 |
| :--- | :--- | :--- | :--- | :--- |
| 1 | 4577 | militia | 合格 | |
| 2 | 4578 | wisdom | 合格 | |
| 3 | 4614 | decent | 合格 | `_zhtw` 沒有「像樣的」，依 M-2 不新增；例句用 decent business attire（得體的服裝），與釋義一致 |
| 4 | 4616 | tobacco | 合格 | |
| 5 | 4631 | proprietary | 合格 | |
| 6 | 4633 | intermediate | 合格 | |
| 7 | 4634 | steep | 合格 | 「浸泡」合併 `_zhtw` 的「浸, 泡」 |
| 8 | 4649 | accountable | 合格 | |
| 9 | 4670 | optimize | 合格 | |
| 10 | 4679 | reconciliation | 合格 | `[經]` 標記改為全形括號（T-3） |
| 11 | 4684 | refusal | 合格 | collocation 的 right of first refusal 對應「優先決定權」 |
| 12 | 4690 | amortize | 合格 | |
| 13 | 4697 | mainland | 合格 | |
| 14 | 4719 | infect | 合格 | |
| 15 | 4736 | distinctive | 合格 | |
| 16 | 4739 | positively | 合格 | |
| 17 | 4767 | forthcoming | 合格 | |
| 18 | 4769 | artificial | 合格 | 「人工的」取自 `[醫]` 義項 |
| 19 | 4775 | financially | 合格 | |
| 20 | 4781 | continually | 合格 | |
| 21 | 4783 | awkward | 合格 | |
| 22 | 4785 | drift | 合格 | |
| 23 | 4796 | convergence | 合格 | 「會聚」取自 `[計]` 義項（非電腦專用義） |
| 24 | 4804 | static | 合格 | |
| 25 | 4816 | complement | 合格 | pos 以動詞為首，音標取動詞讀音 /ˈkɑmpləˌmɛnt/（P-6） |
| 26 | 4834 | shortfall | 合格 | 「缺少」取自 `[經]` 義項 |
| 27 | 4841 | dictator | 合格 | |
| 28 | 4860 | cotton | 合格 | |
| 29 | 4864 | immune | 合格 | |
| 30 | 4872 | clone | 合格（附註） | `_zhtw` 只有「無性系」與 `[計]`「代用件」；例句 a clone of a popular game 對應「代用件（仿製品）」義，未新增義項 |
| 31 | 4874 | peg | 合格 | |
| 32 | 4877 | annualize | 合格 | `_zhtw`「年度基礎換算」補成通順句「以年度為基礎換算」，未新增義項 |
| 33 | 4882 | woe | 合格 | |
| 34 | 4901 | overhaul | 合格 | pos 以動詞為首，音標取動詞讀音 /ˌoʊvɚˈhɔl/ |
| 35 | 4903 | doubtful | 合格 | |

**不合格率：0／35 = 0%**（≤ 5%，不需要換種子重抽）。

## 7. 其他

### 7.1 長度超限、例句未含詞形

H-3、H-4 警告 0。撰寫期間以自製預檢腳本（scratchpad）檢查例句 8～20 字、學術句 8～25 字，首輪有 11 筆字數不足或詞形不符（如 prospectus 學術句原用 prospectuses，不在 lemmatized 詞形中），交付前都已修正。

### 7.2 釋義取捨說明（供 QA 對照 V-VOC-18）

| rank | wordKey | 說明 |
| :--- | :--- | :--- |
| 4883 | capita | `_zhtw` 只有「[醫] 頭」；保留「頭」並加用法括註「（拉丁文，用於 per capita）」，未新增義項（per capita 即「按人頭」） |
| 4844 | internally | `_zhtw` 只有形容詞形式「[計] 內部的」；本字是副詞，改寫為「在內部；內部地」，同一義項 |
| 4876 | allegedly | `_zhtw`「依其申述」；加「據稱」作為同義的現代說法，未新增義項 |
| 4778 | competency | `_zhtw` 為「富裕收入；[法] 權能, 資格, 資產」；取「資格；權能」，不取過時的「富裕收入」義 |
| 4678 | discretionary | `_zhtw` 只有「[計] 選擇的」；寫成「可選擇的；任意選擇的」，同一義項 |
| 4826 | utilization | `_zhtw` 只有「利用」；為避開與 utilize（vocab-4210.js）的 meaning 字串重複（V-VOC-14），加註「（名詞）」 |
| 4599 | follower | `_zhtw` 為「從者, 屬下, 追補者」；只保留前兩項。例句的 social media followers 屬「追隨的人」，與「從者」同義 |
| 4630 | chunk | `_zhtw` 只有「大塊；矮胖的人（或物）」與 `[經]` 定樣；保留前兩項 |
| 4646 | null | 依契約 v0.5 V-VOC-10（DF-06），collocation 的 null and void、null hypothesis 與例句、學術句中的 null 明文允許；驗證器對此筆沒有報告 |

### 7.3 字首字判斷（M-8，R6-6；R7-4 依 v0.7 更新說明）

依契約 v0.7 M-8 逐一檢查本分檔的字首類單字（掃描範圍：pre、non、anti、mid、sub、ex、multi、inter、semi、super、micro、macro、mini、neo、trans、pro、counter、over、under、post、self、auto、vice、quasi、extra、cross、pan、tech 等，以及 ECDICT 標 `pref.` 或釋義為「表示…」字首說明者）。寫法 (1)：有獨立用法，pos 先依獨立用法照 M-4 填寫；字首義若保留，必須是 meaning 的最後一段並以「（字首）」開頭，此時 pos 最後加上 `"pref."`；不保留字首義時 pos 不含 `"pref."`。寫法 (2)：只有字首義，meaning 以「（字首）」開頭且只含字首義，pos 恰為 `["pref."]`（畫面「pref. 字首」）。v0.6 以 `["adj."]` 表示字首義的寫法已廢止（M-8 (3)）。本表 2 筆皆為寫法 (1) 且未保留字首義，pos 不含 `"pref."`，資料不受 v0.7 影響。

| rank | wordKey | 寫法 | 最終 `pos` | 最終 `meaning` | 判斷 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 4650 | super | (1) | `["adj.","adv."]` | 超級的；極好的；非常 | 獨立的形容詞、副詞（超級的、非常）；不變 |
| 4811 | macro | (1) | `["adj.","n."]` | 巨大的；大量的；（電腦）巨集 | ECDICT 有 pref.「宏」與 a.、[計] 義項；pos 依獨立用法 adj.、n.；不變 |

## 8. doneWhen 對照

| doneWhen | 結果 |
| :--- | :--- |
| `validate.mjs --file src/data/vocab-4560.js --stage final` 錯誤 0（含 S-2、H-1、H-2、H-5、H-7） | 通過：錯誤 0；警告 7（V-VOC-09 6 筆見 §3、V-VOC-17 1 筆見 §4） |
| 恰 350 筆、rank 4560～4909 連續；phonetic、meaning、collocation、academicContext、example 全部非空，pos 至少 1 個 | 通過：350 筆、連續；五個欄位空值 0、pos 空 0 |
| 紀錄含驗證摘要、ORIGINAL 清單、V-VOC-17 清單、清單外大陸用語修正、自查抽樣（種子 4560、≥ 35 筆、不合格率 ≤ 5%） | 通過：§2～§6；抽樣 35 筆、不合格率 0% |
| H-3、H-4、V-VOC-14 警告逐項修正或說明 | 通過：三項警告都是 0（含跨分檔 meaning 重複 0） |
| 只寫入本任務 paths；`sources/` 未被修改 | 通過：專案內只寫入 `src/data/vocab-4560.js` 和本檔；分段檔、素材檔、預檢腳本都放 scratchpad |

## 9. 回饋上游

| 編號 | 事項 | 對象 | 建議 |
| :--- | :--- | :--- | :--- |
| CT15-FB-01 | s2twp 過度轉換又發現兩種：「循环」→「迴圈」（cyclical）、「连接词」→「連線詞」（conjunction）；另有「进程」→「程序」（coordination 的 `[计]` 義項），這個不在 V-VOC-17 的 7 個詞內，驗證器偵測不到 | 主控（轉知其他 CT 批次）、SA | 各批次撰寫時留意「迴圈」「連線」字樣要回查簡體原檔；若要自動偵測，可考慮讓 V-VOC-17 加入「循环」「连接」兩詞（只是資訊等級） |
| CT15-FB-02 | V-VOC-14 在 `--file` 模式只比對單一分檔，平行批次之間的 meaning 重複要等 `--all` 才看得到。本批另外以腳本比對已填寫的其他分檔，發現 6 筆和詞族字（analytic、explode、portrayal、utilize、reinforce、undervalue）字串相同，已自行調整 | 主控 | 全部 CT 完成後執行一次 `validate.mjs --all --stage final`，檢查跨檔 V-VOC-14 |

## 10. 變更紀錄

| 版本 | 日期 | 作者 | 說明 |
| :--- | :--- | :--- | :--- |
| 0.1 | 2026-10-30 | pg-content-agent | 初版：CT-15 第 13 批 350 筆內容與自查結果 |
| 0.2 | 2026-10-30 | pg-content-agent | R6-6（契約 v0.6 M-3、M-8、V-VOC-07、V-VOC-17）：補 §4.1 v0.6 新增比對詞清單 3 筆與判斷、§7.3 字首字判斷 2 筆；資料檔未修改；validate --stage final 錯誤 0、警告 7 |
| 0.3 | 2026-10-30 | pg-content-agent | R7-4（契約 v0.7 M-8）：§7.3 字首字判斷的寫法說明由 v0.6 的 `["adj."]` 改為 v0.7 的 `"pref."` 寫法；本分檔字首字皆為寫法 (1) 未保留字首義，資料不受影響；資料檔未修改 |
