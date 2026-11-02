---
doc: CT-09-RECORD
version: 0.3
status: in-review
author: pg-content-agent
approved_by:
approved_at:
---

# CT-09 交付紀錄：字庫內容第 07 批（vocab-2401.js）

## 1. 摘要

| 項目 | 內容 |
| :--- | :--- |
| 任務 | CT-09 |
| 涵蓋 | US-06、US-23、AC-06-01、AC-06-02、AC-23-01、AC-23-03、AC-23-04 |
| 分檔 | `src/data/vocab-2401.js` |
| 排名區間 | 2,401～2,809（NGSL 最後一段），409 筆，rank 連續 |
| 依據 | architecture.md v0.2 §8.2～§8.5；契約 v0.5（README §3.2 M-1～M-7、§7.2 V-VOC-01～18）；`_records/CT-01.md` |
| 流程 | `material.mjs` 匯出素材 → 9 個分段檔 `part-01.jsonl`～`part-09.jsonl`（前 8 檔各 50 筆、第 9 檔 9 筆，放 scratchpad）→ `fill.mjs` 合併 → `validate.mjs --stage final` → `sample.mjs` 自查 |
| 欄位統計 | phonetic、pos、meaning、collocation、example：409／409 非空；academicContext 非空 179 筆、空字串 230 筆（功能詞與無學術用途的生活字依 O-3 留空） |
| `meaningSource` | ECDICT 408、ORIGINAL 1（pro，見 §3） |
| 日期 | 2026-10-30 |
| `sources/` | 只讀；修改時間仍為主控放置時間（ecdict 2026-10-30 09:28～10:06、wordlists 2026-10-29 15:59） |

## 2. 驗證結果（S-1、S-2、H-1～H-7）

指令：`node src/data/_tools/validate.mjs --file src/data/vocab-2401.js --stage final`
結果：**錯誤 0、警告 1；結果：通過**（exit 0；依最後一次執行的結果）

| 規則 | 結果 |
| :--- | :--- |
| FILE、LOAD | 通過 |
| V-VOC-01、02、03、04、06、07、08、13 | 通過，錯誤 0 |
| V-VOC-09 | 錯誤 0、警告 1：rank 2629 pro 為 ORIGINAL 且不在 missing 清單（依 M-6 改標，原因見 §3） |
| V-VOC-10 | 通過 4,632 項，錯誤 0 |
| V-VOC-14（meaning 重複，只報告） | 警告 0 |
| V-VOC-15、16 | 通過，錯誤 0 |
| V-VOC-17 | 資訊 4 筆（見 §4），警告 0 |
| S-2 骨架欄位未改動 | 通過 409；資訊 1（pro 的 meaningSource ECDICT → ORIGINAL，允許） |
| H-1 簡體專用字 | 錯誤 0 |
| H-2 音標字元集與英式符號 | 錯誤 0（R5-2 修正後的驗證器；violent `/ˈvaɪələnt/`、reliable `/rɪˈlaɪəbəl/`、quietly `/ˈkwaɪətli/`、bias `/ˈbaɪəs/`、liability `/ˌlaɪəˈbɪləti/`、royal `/ˈrɔɪəl/`、mayor `/ˈmeɪɚ/` 等都用標準寫法，沒有加滑音 j） |
| H-3 長度上限 | 警告 0（meaning 全部 ≤ 30 字） |
| H-4 大寫開頭、句尾標點、含詞形 | 警告 0 |
| H-5 分檔內 example／meaning 重複 | 錯誤 0、警告 0 |
| H-7 平均每筆 bytes | 404.2 bytes（低於 600） |

## 3. `meaningSource = "ORIGINAL"` 清單（M-6、M-7、V-VOC-09）

| wordKey | 原因 |
| :--- | :--- |
| pro | `_zhtw` 只有「adv. 正面地」與 `[計] 可程式設計遠端操作`（縮寫義），沒有本字最常用的名詞義（pros and cons 的「贊成的理由；優點」）。最終 `meaning` =「贊成的理由；優點；正面地」，前兩個義項是新增的（依 ECDICT `definition` 英文義 "an argument in favor of a proposal" 自行翻譯，非抄錄中文），依 M-2／M-6 屬原創，標 ORIGINAL |

本區間沒有 `ecdict_subset_missing.txt` 的字。

## 4. 上下文用詞清單（V-VOC-17、M-7、H-6）

| wordKey | 英文詞義 | 簡體原詞（出現位置） | 最終 `meaning` | 處理說明 |
| :--- | :--- | :--- | :--- | :--- |
| remote | 遙遠的；遠端的 | 「远程访问实用程序」（`[计]` 義項） | 遙遠的；偏僻的；遠端 | 「遠端存取公用程式」義項刪除，只留「遠端」；`meaning` 不含「程序」「程式」 |
| shell | 殼；外殼 | 「指定命令行处理程序」（`[计]` DOS 命令說明） | 貝殼；殼；外殼；去殼 | DOS 命令說明整項刪除；`meaning` 不含「程序」「程式」 |
| server | 伺服器；服務生 | 「服务器启动程序, 服务台程序」（`[计]`） | 伺服器；服侍者；發球員 | 兩個電腦程式義項刪除；`meaning` 不含「程序」「程式」 |
| registration | 登記；註冊 | 「注册」（n. 義項） | 登記；註冊；掛號 | 本字泛指登記、報名、車輛／公司註冊，「註冊」用於公司、車輛、帳號屬台灣正確用法，保留；「登記」放第一位涵蓋活動報名、入住登記 |

### 4.1 v0.6 新增比對詞清單（V-VOC-17 補產，R6-6）

依契約 v0.6 V-VOC-17，以腳本比對簡體原檔 `ecdict_subset.csv` 的 `translation` 是否含 M-3 補充表 10 詞（支持、类型、实例、触摸、局部、保存、社区、连接、循环、菜单），列出 `meaningSource = "ECDICT"` 的命中字共 **6 筆**；判斷欄依 architecture.md v0.3 §8.4、§8.5。

| rank | wordKey | 英文詞義 | 簡體原詞（出現位置） | `_zhtw` 轉換結果 | 最終 `meaning` | 判斷 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 2513 | gear | 齒輪；工具；使適應 | vi.「连接上」 | 連線 | 齒輪；工具；使適應；安排 | 不採用該義項：vi.「連接上」未列入；meaning 不含「連線」 |
| 2597 | menu | 菜單；（電腦）選單 | n.「菜单」、[计]「菜单」 | 選單 | 菜單；（電腦）選單 | 保留：餐飲義已還原為「菜單」，電腦義保留「（電腦）選單」，分屬不同義項 |
| 2654 | stamp | 郵票；圖章；蓋章於 | n.「类型」 | 型別 | 郵票；印；圖章；蓋章於 | 不採用該義項：「類型」未列入；meaning 不含「型別」 |
| 2737 | shore | 海岸；支撐 | vt.「支持」 | 支援 | 海岸；海濱；支撐 | 不採用該義項：vt.「支持」未列入，以「支撐」表達；meaning 不含「支援」 |
| 2794 | attachment | 附件；附屬物；連接 | n.「连接」、n.「连接物」 | 連線 | 附件；附屬物；愛慕；連接 | 保留：已還原為「連接」，英文詞義為附著、連結（非網路連線） |
| 2795 | holder | 持有人；所有人 | n.「支持物」 | 支援 | 持有人；所有人 | 不採用該義項：「支持物」未列入；meaning 不含「支援」 |

## 5. 清單外大陸用語、過度轉換與錯字修正（M-3、T-2）

| wordKey | 原詞（`_zhtw`） | 改後 `meaning` | 說明 |
| :--- | :--- | :--- | :--- |
| menu | 選單, (功能)選擇單；`[計]` 選單（簡體原檔為「菜单」） | 菜單；（電腦）選單 | **s2twp 過度轉換**：簡體「菜单」被全部轉成「選單」，餐廳菜單義消失。依原意改回「菜單」，電腦義用台灣用語「選單」並加「（電腦）」括註（T-3） |
| attachment | 連線, 附屬物, 連線物（簡體「连接」） | 附件；附屬物；愛慕；連接 | **s2twp 過度轉換**：「连接」→「連線」，本字指連接、附著而非網路連線，改回「連接」 |
| click | `[計]` 單擊 | 咔噠聲；發出咔噠聲；（電腦）按一下 | 「單擊」為大陸用語，台灣說「按一下」「點一下」；`[計]` 改「（電腦）」括註；未新增義項 |
| shore | 支撐, 支援（簡體「支持」） | 海岸；海濱；支撐 | 「支持」被轉成「支援」（前批已知過度轉換）；本批取「支撐」，「支援」不使用 |
| holder | 支援物（簡體「支持物」） | 持有人；所有人 | 同上的過度轉換；此義項刪除，未使用 |
| stamp | 型別（簡體「类型」） | 郵票；印；圖章；蓋章於 | 「类型」→「型別」過度轉換；此義項刪除，未使用 |
| gear | 連線上（簡體「连接上」） | 齒輪；工具；使適應；安排 | 過度轉換；此義項刪除，未使用 |
| architecture | `[計]` 體系結構 | 建築學；建築式樣 | 「體系結構」為大陸電腦用語（台灣稱「架構」），義項刪除 |
| trick | 決竅 | 詭計；訣竅；惡作劇；欺騙 | ECDICT 錯字「決」更正為「訣」，非新增義項 |
| horrible | 遭透的 | 可怕的；糟透的；極討厭的 | ECDICT 錯字「遭」更正為「糟」 |
| bell | 鈴, 鍾 | 鈴；鐘 | 「鍾」為簡繁對應錯字（钟 → 鐘），更正為「鐘」 |
| server | 服伺者 | 伺服器；服侍者；發球員 | ECDICT 錯字「伺」更正為「侍」 |
| orange | 桔子 | 柑橘；橘子；橘色 | 「桔子」改台灣標準寫法「橘子」 |
| excess | 剩於 | 過度；超過；超額；過量的 | ECDICT 錯字義項（「剩餘」之誤）刪除，未使用 |

其他領域標記改寫（T-3）：menu、click 的 `[計]` → 「（電腦）」；versus 的 `[法] 訴` → 「（法律）訴」。其餘 `[計]`、`[醫]`、`[法]`、`[經]`、`[化]` 標記都已刪除，沒有原樣保留在 `meaning`（V-VOC-15 錯誤 0）。

## 6. 自查抽樣（S-3）

指令：`node src/data/_tools/sample.mjs --file src/data/vocab-2401.js --ratio 0.1 --min 35 --seed 2401`
母體 409，抽出 **41 筆**。檢查項目：釋義是精簡而不是新增（對照 `_zhtw`）、沒有大陸用語、`pos` 和釋義一致、音標是美式而且正確、例句自然而且原創。

| # | rank | wordKey | 結論 | 備註 |
| :--- | :--- | :--- | :--- | :--- |
| 1 | 2418 | greatly | 合格 | |
| 2 | 2423 | awareness | 合格 | |
| 3 | 2443 | mortgage | 合格 | 「抵押」兼作名詞、動詞，pos 為 n.、v. |
| 4 | 2474 | silent | 合格 | |
| 5 | 2486 | friendship | 合格 | |
| 6 | 2529 | clause | 合格 | |
| 7 | 2558 | potentially | 合格 | |
| 8 | 2575 | indication | 合格 | |
| 9 | 2583 | carbon | 合格 | |
| 10 | 2592 | magic | 合格 | |
| 11 | 2610 | regardless | 合格（附註） | ECDICT 標 `a.`，但英文定義為副詞（r.）、實際用法為副詞，依 M-4「其他情況依英文詞義判斷」pos 取 adv.，見 §7.3 |
| 12 | 2613 | racial | 合格 | |
| 13 | 2617 | trick | 合格 | 「訣竅」為 ECDICT 錯字更正，見 §5 |
| 14 | 2620 | chocolate | 合格 | |
| 15 | 2621 | stimulate | 合格 | |
| 16 | 2636 | interior | 合格 | |
| 17 | 2639 | pray | 合格 | |
| 18 | 2640 | championship | 合格（已修） | 原 meaning 含「捍衛」，在卡片上容易誤解，刪除後重新 fill、validate |
| 19 | 2642 | immigrant | 合格 | |
| 20 | 2654 | stamp | 合格 | |
| 21 | 2659 | consume | 合格 | |
| 22 | 2665 | firstly | 合格 | |
| 23 | 2676 | nerve | 合格 | |
| 24 | 2686 | raw | 合格 | |
| 25 | 2696 | slope | 合格 | |
| 26 | 2697 | happiness | 合格 | |
| 27 | 2701 | reckon | 合格 | |
| 28 | 2702 | silly | 合格 | |
| 29 | 2705 | comedy | 合格 | |
| 30 | 2706 | chase | 合格（已修） | 原例句用英式 chase up，改成 "chasing unpaid invoices" 後重新 fill、validate |
| 31 | 2710 | sheep | 合格 | |
| 32 | 2717 | adjustment | 合格 | |
| 33 | 2718 | reasonably | 合格 | |
| 34 | 2720 | flexible | 合格 | |
| 35 | 2723 | precise | 合格 | |
| 36 | 2738 | monthly | 合格 | |
| 37 | 2744 | experimental | 合格 | |
| 38 | 2752 | ownership | 合格 | |
| 39 | 2763 | structural | 合格 | |
| 40 | 2764 | website | 合格 | |
| 41 | 2787 | tender | 合格 | |

**不合格率：0／41 = 0%**（≤ 5%，不需要換種子重抽）。2640、2706 在交付前已修正。

## 7. 其他

### 7.1 長度超限、例句未含詞形

H-3、H-4 警告 0，沒有需要說明的項目。

### 7.2 V-VOC-14 meaning 重複

警告 0。

### 7.3 釋義與詞性取捨說明（供 QA 對照 V-VOC-18）

| wordKey | 說明 |
| :--- | :--- |
| regardless | `_zhtw` 標 `a.`，英文定義與實際用法為副詞，pos 取 `adv.`（M-4 依英文詞義判斷） |
| barely | `_zhtw` 只有「幾乎不」，沒有「勉強；僅僅」；依 M-2 不新增義項，原樣保留 |
| fantastic | `_zhtw` 只有「奇妙的；稀奇的；空想的」，沒有口語「極好的」；同上 |
| consequently | `_zhtw` 只有「所以」，原樣保留 |
| excess | 名詞重音 `/ɪkˈsɛs/`（pos 第一個為 n.，P-6） |
| contest | 名詞重音 `/ˈkɑntɛst/`（pos 第一個為 n.，P-6） |
| extract | 動詞重音 `/ɪkˈstrækt/`（pos 第一個為 v.，P-6） |
| universe | `_zhtw`「(思想等)範圍」改全形括號「（思想等）範圍」 |
| float | 「發行」加「（股票）」括註說明，未新增義項 |
| whilst | 英式用字，但屬 NGSL 收錄字，例句與 academicContext 照常提供 |

### 7.4 字首字判斷（M-8，R6-6；R7-4 依 v0.7 更新說明）

依契約 v0.7 M-8 逐一檢查本分檔的字首類單字（掃描範圍：pre、non、anti、mid、sub、ex、multi、inter、semi、super、micro、macro、mini、neo、trans、pro、counter、over、under、post、self、auto、vice、quasi、extra、cross、pan、tech 等，以及 ECDICT 標 `pref.` 或釋義為「表示…」字首說明者）。寫法 (1)：有獨立用法，pos 先依獨立用法照 M-4 填寫；字首義若保留，必須是 meaning 的最後一段並以「（字首）」開頭，此時 pos 最後加上 `"pref."`；不保留字首義時 pos 不含 `"pref."`。寫法 (2)：只有字首義，meaning 以「（字首）」開頭且只含字首義，pos 恰為 `["pref."]`（畫面「pref. 字首」）。v0.6 以 `["adj."]` 表示字首義的寫法已廢止（M-8 (3)）。本表 2 筆皆為寫法 (1) 且未保留字首義，pos 不含 `"pref."`，資料不受 v0.7 影響。

| rank | wordKey | 寫法 | 最終 `pos` | 最終 `meaning` | 判斷 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 2412 | counter | (1) | `["n.","adj."]` | 櫃檯；計數器；相反的 | 獨立的名詞、形容詞（櫃檯、相反的）；不變 |
| 2629 | pro | (1) | `["n.","adv."]` | 贊成的理由；優點；正面地 | 獨立的名詞、副詞（pros and cons）；不變 |

## 8. doneWhen 對照

| doneWhen | 結果 |
| :--- | :--- |
| `validate.mjs --file src/data/vocab-2401.js --stage final` 錯誤 0（含 S-2、H-1、H-2、H-5、H-7） | 通過：錯誤 0（警告 1 為 V-VOC-09 pro，已於 §3 說明） |
| 恰 409 筆、rank 2401～2809 連續；phonetic、meaning、collocation、example 全部非空，pos 至少 1 個 | 通過：409 筆、連續；四個欄位空值 0、pos 空 0 |
| 紀錄含驗證摘要、ORIGINAL 清單、V-VOC-17 清單、清單外大陸用語修正、自查抽樣（種子 2401、≥ 41 筆、不合格率 ≤ 5%） | 通過：§2～§6；抽樣 41 筆、不合格率 0% |
| H-3、H-4、V-VOC-14 警告逐項修正或說明 | 通過：三項警告都是 0 |
| 只寫入本任務 paths；`sources/` 未被修改 | 通過：專案內只寫入 `src/data/vocab-2401.js` 和本檔；分段檔、素材檔、轉換腳本都放 scratchpad |

## 9. 回饋上游

| 編號 | 事項 | 對象 | 建議 |
| :--- | :--- | :--- | :--- |
| CT09-FB-01 | `tw_terms.tsv` 未處理的 s2twp 過度轉換又發現兩類：「菜单」→「選單」（menu 的餐廳義消失）、「连接」→「連線」（attachment、gear）。本批已逐筆依原意修正（§5） | SA、主控 | 後續若重產 `_zhtw`，可將「菜單」「連接」加入 M-3 需回查清單，或在 `tw_terms.tsv` 增加反向修正 |
| CT09-FB-02 | ECDICT 原檔有錯字（決竅、遭透、服伺、剩於），本批依原意更正為正確字並記錄，未新增義項；QA 依 V-VOC-18 (2)「義項可在 `_zhtw` 找到」比對時請視為同一義項 | QA | 比對時容許錯字更正 |

## 10. 變更紀錄

| 版本 | 日期 | 作者 | 說明 |
| :--- | :--- | :--- | :--- |
| 0.1 | 2026-10-30 | pg-content-agent | 初版：CT-09 第 07 批 409 筆內容與自查結果 |
| 0.2 | 2026-10-30 | pg-content-agent | R6-6（契約 v0.6 M-3、M-8、V-VOC-07、V-VOC-17）：補 §4.1 v0.6 新增比對詞清單 6 筆與判斷、§7.4 字首字判斷 2 筆；資料檔未修改；validate --stage final 錯誤 0、警告 1 |
| 0.3 | 2026-10-30 | pg-content-agent | R7-4（契約 v0.7 M-8）：§7.4 字首字判斷的寫法說明由 v0.6 的 `["adj."]` 改為 v0.7 的 `"pref."` 寫法；本分檔字首字皆為寫法 (1) 未保留字首義，資料不受影響；資料檔未修改 |
