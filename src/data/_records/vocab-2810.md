---
doc: CT-10-RECORD
version: 0.3
status: in-review
author: pg-content-agent
approved_by:
approved_at:
---

# CT-10 交付紀錄：字庫內容第 08 批（vocab-2810.js）

## 1. 摘要

| 項目 | 內容 |
| :--- | :--- |
| 任務 | CT-10 |
| 涵蓋 | US-06、US-23、AC-06-01、AC-06-02、AC-06-08、AC-23-01、AC-23-03、AC-23-04 |
| 分檔 | `src/data/vocab-2810.js` |
| 排名區間 | 2,810～3,159（TSL 區段），350 筆，rank 連續 |
| 依據 | architecture.md v0.2 §8.2～§8.5；契約 v0.5（README §3.2 M-1～M-7、§7.2 V-VOC-01～18）；`_records/CT-01.md` |
| 流程 | `material.mjs` 匯出素材 → 7 個分段檔 `part-01.jsonl`～`part-07.jsonl`（每檔 50 筆，放 scratchpad）→ `fill.mjs` 合併 → `validate.mjs --stage final` → `sample.mjs` 自查 |
| 欄位統計 | phonetic、pos、meaning、collocation、academicContext、example：350／350 非空（排名 > 2,809，academicContext 全數必填，AC-06-08） |
| `meaningSource` | ECDICT 340、ORIGINAL 10（missing 2 筆 + 依 M-6 整段改寫 8 筆，見 §3） |
| 日期 | 2026-10-30 |
| `sources/` | 只讀；修改時間仍為主控放置時間（ecdict 2026-10-30 09:28～10:06、wordlists 2026-10-29 15:59） |

## 2. 驗證結果（S-1、S-2、H-1～H-7）

指令：`node src/data/_tools/validate.mjs --file src/data/vocab-2810.js --stage final`
結果：**錯誤 0、警告 8；結果：通過**（exit 0；依最後一次執行的結果）

| 規則 | 結果 |
| :--- | :--- |
| FILE、LOAD | 通過 |
| V-VOC-01、02、03、05、06、07、13 | 通過，錯誤 0 |
| V-VOC-08 academicContext | 通過 350，錯誤 0 |
| V-VOC-09 來源標記 | 錯誤 0、警告 8：8 筆非 missing 的 ORIGINAL（M-6 整段改寫，原因見 §3） |
| V-VOC-10 禁用值與角括號 | 通過，錯誤 0 |
| V-VOC-14 meaning 重複 | 警告 0 |
| V-VOC-15 對照表殘留、領域標記 | 通過，錯誤 0 |
| V-VOC-16 ECDICT 舊式音標字元 | 通過，錯誤 0 |
| V-VOC-17 | 資訊 7 筆（見 §4），警告 0 |
| S-2 骨架欄位未改動 | 通過 350（資訊 8：meaningSource ECDICT → ORIGINAL，皆列於 §3） |
| H-1 簡體專用字 | 錯誤 0 |
| H-2 音標字元集與英式符號 | 錯誤 0（`aɪə`、`iə` 等依 R5-2 直接寫標準形式，如 dial /ˈdaɪəl/、cafeteria /ˌkæfəˈtɪriə/） |
| H-3 長度上限 | 警告 0 |
| H-4 大寫開頭、句尾標點、含詞形 | 警告 0（初跑 1 筆：mister 例句以引號結尾，已改寫） |
| H-5 分檔內 example／meaning 重複 | 錯誤 0、警告 0 |
| H-7 平均每筆 bytes | 459.0 bytes（低於 600 警告門檻） |

## 3. `meaningSource = "ORIGINAL"` 清單（M-6、M-7、V-VOC-09）

| rank | wordKey | 最終 `meaning` | 原因 |
| :--- | :--- | :--- | :--- |
| 2835 | résumé | 履歷；履歷表 | 列於 `ecdict_subset_missing.txt`，ECDICT 查無；釋義、詞性原創 |
| 2914 | café | 咖啡館；小餐館 | 列於 `ecdict_subset_missing.txt`，ECDICT 查無；釋義、詞性原創 |
| 2878 | cellphone | 手機；行動電話 | ECDICT 只有「蜂窩式便攜無線電話；大哥大」，前者為大陸用語、後者為過時俗稱，均不適用卡片；整段改寫 |
| 2905 | laptop | 筆記型電腦 | ECDICT 只有 `[計] 膝上型的`（形容詞、舊譯），未涵蓋名詞「筆記型電腦」；整段改寫 |
| 2916 | mall | 購物中心；林蔭步道 | ECDICT 只有「林蔭路」，缺少多益最核心的 shopping mall 義；整段改寫 |
| 2998 | download | 下載 | ECDICT 為 `[計] 卸载, 下栽`（簡體原檔），「卸載」義錯誤、「下栽」為錯字，`_zhtw` 再被轉成「解除安裝」；整段改寫 |
| 3005 | cart | 手推車；運貨馬車；用車裝載 | ECDICT 只有「二輪運貨馬車」，缺少多益常見的 shopping／luggage cart「手推車」義；整段改寫（保留原義項於後） |
| 3027 | affordable | 負擔得起的；價格合理的 | ECDICT 只有 `[計] 普及型`，與英文詞義不符；整段改寫 |
| 3040 | complimentary | 免費贈送的；稱讚的；問候的 | ECDICT 缺少多益最常考的「免費贈送的」（complimentary breakfast）；整段改寫（保留原義項於後） |
| 3154 | internship | 實習；實習職位 | ECDICT 只有「實習醫師的職務」，範圍過窄，與職場實習用法不符；整段改寫 |

## 4. 上下文用詞清單（V-VOC-17、M-7、H-6）

| wordKey | 英文詞義 | 簡體原詞（出現位置） | 最終 `meaning` | 處理說明 |
| :--- | :--- | :--- | :--- | :--- |
| client | 客戶；委託人 | 「客户机程序」（`[计]` 義項） | 客戶；顧客；委託人 | 電腦義項刪除；不含「程序」「程式」 |
| supervisor | 管理者；監督者 | 「管理程序」（`[计]` 義項） | 管理者；監督者；指導者 | 電腦義項刪除 |
| subway | 地下鐵；地下道 | 「地铁」「乘地铁」 | 地鐵；捷運；地下道 | 依 M-3 範例補「捷運」；「地道」改台灣用法「地下道」（§5） |
| destination | 目的地 | 「目的文件」（`[计]` 義項） | 目的地；目標；目的 | 電腦義項刪除；不含「文件」「檔案」 |
| folder | 資料夾 | 「文件夹」（`_zhtw` 已轉為「資料夾」） | 資料夾；卷宗 | 「資料夾」為台灣用法，保留 |
| suite | 套房；一套 | 「程序组」（`[电]` 義項） | 套房；（一）套；組曲 | 電子義項刪除 |
| utility | 公用事業；實用 | 「实用程序」（`_zhtw` 轉為「實用程式」） | 公用事業；功用；實用的 | 「實用程式」義（utility program）屬電腦義，非本卡主要用法，刪除；不含「程序」「程式」 |

### 4.1 v0.6 新增比對詞清單（V-VOC-17 補產，R6-6）

依契約 v0.6 V-VOC-17，以腳本比對簡體原檔 `ecdict_subset.csv` 的 `translation` 是否含 M-3 補充表 10 詞（支持、类型、实例、触摸、局部、保存、社区、连接、循环、菜单），列出 `meaningSource = "ECDICT"` 的命中字共 **2 筆**；判斷欄依 architecture.md v0.3 §8.4、§8.5。

| rank | wordKey | 英文詞義 | 簡體原詞（出現位置） | `_zhtw` 轉換結果 | 最終 `meaning` | 判斷 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 2918 | recycle | 回收再利用；再循環 | vt.「使再循环」、n.「再循环」 | 迴圈 | 重新利用；使再循環；再製 | 保留：已還原為「使再循環」，英文詞義為回收循環（非程式迴圈） |
| 2993 | tag | 標籤；標記 | vt.「连接」 | 連線 | 標籤；標記；附以籤條 | 不採用該義項：vt.「連接」未列入；meaning 不含「連線」 |

## 5. 清單外大陸用語修正（M-3、T-2）

| wordKey | 原詞（`_zhtw`） | 改後 `meaning` | 說明 |
| :--- | :--- | :--- | :--- |
| feedback | 反饋, 反應 | 回饋；反應 | 「反饋」為大陸用語，台灣用「回饋」 |
| recycle | 使再迴圈, 重新利用, 再製 | 重新利用；使再循環；再製 | s2twp 過度轉換（循环 → 迴圈），依原意改回「循環」 |
| container | 容器, 集裝箱 | 容器；貨櫃 | 「集裝箱」為大陸用語，台灣用「貨櫃」 |
| salad | 色拉 | 沙拉 | 「色拉」為大陸音譯，台灣用「沙拉」 |
| umbrella | 包羅永珍的 | 雨傘；保護傘；包羅萬象的 | s2twp 誤轉（万象 → 永珍），改回「包羅萬象」 |
| underline | 下劃線 | 在…下面劃線；強調；底線 | 「下劃線」為大陸電腦用語，台灣用「底線」 |
| cartridge | 墨粉鼓 | 碳粉匣；彈藥筒；一卷軟片 | 「墨粉」為大陸用語，台灣用「碳粉匣」 |
| subway | 地道 | 地下道 | 台灣用「地下道」 |
| reschedule | 修訂計劃 | 重新安排；修訂計畫 | 台灣名詞用「計畫」；「重安排」補成通順的「重新安排」 |
| identification | 身份證明 | 識別；身分證明；認同 | 依教育部用字改「身分」 |
| distribution | 分佈 | 分配；分布 | 依教育部用字改「分布」 |
| workshop、workplace | 車間 | 研討會；工場／工作場所；工廠 | 「車間」為大陸用語，直接刪除該義項 |

其他領域標記：`[計]`、`[經]`、`[法]`、`[醫]`、`[化]`、`[機]`、`[電]` 等標記一律未保留在 `meaning`（V-VOC-15 通過）。

## 6. 自查抽樣（S-3）

### 6.1 第一次抽樣（種子 2810）

指令：`node src/data/_tools/sample.mjs --file src/data/vocab-2810.js --ratio 0.1 --min 35 --seed 2810`
母體 350，抽出 **35 筆**。檢查項目：釋義精簡而非新增（對照 `_zhtw`）、無大陸用語、`pos` 與釋義一致、音標美式且正確、例句自然且原創。

| # | rank | wordKey | 結論 | 備註 |
| :--- | :--- | :--- | :--- | :--- |
| 1 | 2827 | deadline | 合格 | |
| 2 | 2835 | résumé | 合格 | missing，ORIGINAL |
| 3 | 2847 | shipment | 合格 | |
| 4 | 2861 | attendant | 合格 | |
| 5 | 2868 | oval | 合格 | |
| 6 | 2871 | suitcase | 合格 | |
| 7 | 2872 | destination | 合格 | V-VOC-17 |
| 8 | 2885 | depart | 合格 | |
| 9 | 2890 | precede | 合格 | |
| 10 | 2894 | coworker | 合格 | |
| 11 | 2895 | upcoming | 合格 | |
| 12 | 2906 | underline | 合格 | 「底線」見 §5 |
| 13 | 2910 | exit | 合格 | |
| 14 | 2916 | mall | 合格 | ORIGINAL，見 §3 |
| 15 | 2918 | recycle | **不合格** | `pos` 多列 `n.`（釋義只有動詞義） |
| 16 | 2940 | warehouse | 合格 | |
| 17 | 2948 | inspect | 合格 | |
| 18 | 2949 | mechanic | 合格 | |
| 19 | 2965 | lab | 合格 | |
| 20 | 2971 | respondent | 合格 | |
| 21 | 2972 | jewelry | 合格 | |
| 22 | 2976 | outstanding | 合格 | |
| 23 | 3040 | complimentary | 合格 | ORIGINAL，見 §3 |
| 24 | 3051 | courier | **不合格** | `pos` 多列 `v.`（釋義只有名詞義） |
| 25 | 3068 | memorandum | 合格 | 與 memo 釋義已區分（V-VOC-14） |
| 26 | 3074 | dental | 合格 | |
| 27 | 3078 | patron | 合格 | |
| 28 | 3081 | salad | 合格 | 「沙拉」見 §5 |
| 29 | 3085 | calculator | 合格 | |
| 30 | 3087 | defect | 合格 | |
| 31 | 3105 | urgent | 合格 | |
| 32 | 3108 | delete | 合格 | |
| 33 | 3122 | taker | 合格 | |
| 34 | 3148 | vacancy | 合格 | |
| 35 | 3158 | prediction | 合格 | |

**不合格率：2／35 = 5.7%（> 5%）** → 依 S-3 全檔重新檢查 `pos` 與 `meaning` 的一致性，共修正 9 筆（含上述 2 筆）：

| wordKey | 修正前 `pos` | 修正後 `pos` |
| :--- | :--- | :--- |
| recycle | v.、n. | v. |
| courier | n.、v. | n. |
| calendar | n.、v. | n. |
| overtime | n.、adj.、adv. | n.、adj. |
| skim | v.、n. | v. |
| commute | v.、n. | v. |
| quit | v.、n. | v. |
| designate | v.、adj. | v. |
| graph | n.、v. | n. |

修正後重新 `fill.mjs`、`validate.mjs`（錯誤 0），再換種子抽樣。

### 6.2 第二次抽樣（種子 2811）

指令：`node src/data/_tools/sample.mjs --file src/data/vocab-2810.js --ratio 0.1 --min 35 --seed 2811`
抽出 35 筆：reservation、deadline、lobby、publish、cafeteria、correctly、bicycle、receptionist、dentist、passport、upcoming、inspection、workplace、drawer、submission、briefcase、innovative、cloudy、shopper、cart（ORIGINAL）、administrative、coordinate、installation、automobile、worldwide、carrier、grocery、delegate、salesperson、cab、buffet、basketball、bench、knowledgeable、overdue。

**結論：35 筆全部合格，不合格率 0／35 = 0%**（≤ 5%）。備註：delegate、coordinate 的音標依 P-6 取 `pos` 第一個詞性的讀音（delegate 名詞 /ˈdɛləgət/、coordinate 動詞 /koʊˈɔrdəˌneɪt/）。

## 7. 其他

### 7.1 長度超限、例句未含詞形

H-3、H-4 警告 0，無需說明的項目。

### 7.2 釋義取捨說明（供 QA 對照 V-VOC-18）

| wordKey | 說明 |
| :--- | :--- |
| o'clock | ECDICT 標 `n.`，依 M-4 保留 `n.`，釋義「…點鐘」 |
| venue | `_zhtw` 只有「犯罪地點, 審判地, 發生地點」，取「發生地點；審判地」，未新增「場地」 |
| commuter | `_zhtw` 無「通勤者」，取原義「乘公共車輛上下班者」 |
| commute | 取「經常乘車來往；減輕；交換」，未新增「通勤」 |
| soccer | `_zhtw` 只有「英式足球」，原樣保留 |
| gym | `_zhtw` 無「健身房」，取「體育館；體育課；體操」 |
| bench | `[機] 臺` 為機械專用義，刪除，只留「長椅子」 |
| developer | 取「開發者；顯影器」，`[計]` 標記刪除 |
| memo／memorandum、baggage／luggage | 依 T-5 以補充義項區分（備忘錄 vs 備忘錄；便函；便箋；行李 vs 行李；皮箱） |

### 7.3 回饋上游

- architecture.md §8.3 P-5 寫明 `g` 用 ASCII（不用 U+0261），`lib.mjs` 的 `IPA_ALLOWED_CHARS` 也只收 ASCII `g`；但共通說明（ct_common.md）寫「用 `ɡ`（U+0261）而非 ASCII `g`，若 P-9 允許字元有規定，依 P-9」，文字容易誤讀。本批依 P-5／P-9 全用 ASCII `g`。建議主控統一說明文字。
- ECDICT 子集中若干 TSL 高頻多益字缺核心義（mall、cart、complimentary、internship、laptop、affordable、download），本批依 M-6 改 ORIGINAL 並逐筆列於 §3；後續 TSL 批次（CT-11～CT-13）可能有同類情形，`N-3` 預期的 ECDICT 筆數（5,616）會相應減少，提請 SA 知悉。

### 7.4 字首字判斷（M-8，R6-6；R7-3 依 v0.7 更新）

依契約 v0.6 M-8 逐一檢查本分檔的字首類單字（掃描範圍：pre、non、anti、mid、sub、ex、multi、inter、semi、super、micro、macro、mini、neo、trans、pro、counter、over、under、post、self、auto、vice、quasi、extra、cross、pan、tech 等，以及 ECDICT 標 `pref.` 或釋義為「表示…」字首說明者）。寫法 (1)：有獨立用法，pos 依獨立用法；字首義若保留，必須是 meaning 最後一段並以「（字首）」開頭，此時 pos 最後加 `"pref."`；寫法 (2)：只有字首義，meaning 以「（字首）」開頭、pos 恰為 `["pref."]`（畫面「pref. 字首」）。（R7-3：依契約 v0.7 M-8 更新；v0.6 以 `["adj."]` 表示字首義的寫法已廢止。）

| rank | wordKey | 寫法 | 最終 `pos` | 最終 `meaning` | 判斷 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 2923 | mini | (1) | `["adj.","n."]` | 微型的；同類中的極小者 | 獨立的形容詞、名詞；不變 |

## 8. doneWhen 對照

| doneWhen | 結果 |
| :--- | :--- |
| `validate.mjs --file src/data/vocab-2810.js --stage final` 錯誤 0（含 S-2、H-1、H-2、H-5、H-7） | 符合（錯誤 0、警告 8 皆為 V-VOC-09 M-6 提醒，已於 §3 列原因） |
| 恰 350 筆、rank 2810～3159 連續；phonetic、meaning、collocation、academicContext、example 非空，pos 至少 1 個 | 符合 |
| 紀錄含驗證摘要、ORIGINAL 清單、V-VOC-17 清單、清單外大陸用語修正、自查抽樣（種子 2810、≥ 35 筆、不合格率 ≤ 5%） | 符合（種子 2810 為 5.7%，依 S-3 全檔重查後以種子 2811 重抽為 0%） |
| H-3、H-4、V-VOC-14 警告逐項已修正或說明 | 符合（皆為 0） |
| 只寫入本任務 paths；sources/ 未被修改 | 符合 |

## 9. 變更紀錄

| 版本 | 日期 | 作者 | 說明 |
| :--- | :--- | :--- | :--- |
| 0.1 | 2026-10-30 | pg-content-agent | 初版 |
| 0.2 | 2026-10-30 | pg-content-agent | R6-6（契約 v0.6 M-3、M-8、V-VOC-07、V-VOC-17）：補 §4.1 v0.6 新增比對詞清單 2 筆與判斷、§7.4 字首字判斷 1 筆；資料檔未修改；validate --stage final 錯誤 0、警告 8 |
| 0.3 | 2026-10-30 | pg-content-agent | R7-3（契約 v0.7 M-8）：字首字判斷段的寫法說明改為 v0.7（`pref.`）；本分檔字首判斷結果與資料檔皆未修改；validate --stage final 錯誤 0、警告 8 |
