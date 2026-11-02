---
doc: CT-16-RECORD
version: 0.3
status: in-review
author: pg-content-agent
approved_by:
approved_at:
---

# CT-16 交付紀錄：字庫內容第 14 批（vocab-4910.js）

## 1. 摘要

| 項目 | 內容 |
| :--- | :--- |
| 任務 | CT-16 |
| 涵蓋 | US-06、US-23、AC-06-01、AC-06-02、AC-06-08、AC-23-01、AC-23-03、AC-23-04 |
| 分檔 | `src/data/vocab-4910.js` |
| 排名區間 | 4,910～5,259，350 筆，rank 連續；4,910～5,228 為 BSL 末段（319 筆），5,229～5,259 為 NAWL 起始段（31 筆） |
| 依據 | architecture.md v0.2 §8.2～§8.5；契約 v0.5（README §3.2 M-1～M-7、§7.2 V-VOC-01～18）；`_records/CT-01.md` |
| 流程 | `material.mjs` 匯出素材 → 7 個分段檔 `part-01.jsonl`～`part-07.jsonl`（每檔 50 筆，放 scratchpad `CT-16\`）→ `fill.mjs` 合併 → `validate.mjs --stage final` → `sample.mjs` 自查 |
| 欄位統計 | phonetic、pos、meaning、collocation、academicContext、example：350／350 非空（排名 > 2,809，academicContext 依 AC-06-08 全數填寫） |
| `meaningSource` | ECDICT 345、ORIGINAL 5（missing 1 筆 + M-6 改寫 4 筆，見 §3） |
| 日期 | 2026-10-30 |
| `sources/` | 只讀；修改時間仍為主控放置時間（ecdict 2026-10-30 09:28～10:06、wordlists 2026-10-29 15:59） |

NAWL 段（5,229 起）的字表是字母序，排名不代表頻率；撰寫時仍依各字在學術文體中的常見用法選搭配與例句。

## 2. 驗證結果（S-1、S-2、H-1～H-7）

指令：`node src/data/_tools/validate.mjs --file src/data/vocab-4910.js --stage final`
結果：**錯誤 0、警告 4；結果：通過**（依最後一次執行的結果）

| 規則 | 結果 |
| :--- | :--- |
| FILE、LOAD、V-IN-01～07 | 通過 |
| V-VOC-01、02、03、05、06、07、08、13 | 通過，錯誤 0 |
| V-VOC-08（academicContext 必填） | 通過 350，錯誤 0 |
| V-VOC-09 來源標記 | 錯誤 0、警告 4：clout、deployment、launder、globally 改為 ORIGINAL 須有紀錄 → 已列於 §3 |
| V-VOC-10 禁用值與角括號 | 錯誤 0、警告 0 |
| V-VOC-14 meaning 重複 | 警告 0 |
| V-VOC-15 對照表殘留、領域標記 | 錯誤 0 |
| V-VOC-16 ECDICT 舊式音標字元 | 錯誤 0 |
| V-VOC-17 | 資訊 2 筆（salvage、killer，見 §4），警告 0 |
| S-2 骨架欄位未改動 | 通過 350（資訊 4：上述 4 筆 meaningSource ECDICT → ORIGINAL） |
| H-1 簡體專用字 | 錯誤 0 |
| H-2 音標字元集與英式符號 | 錯誤 0（`aɪə` 等組合依 R5-2 寫標準形式，如 proprietorship `/prəˈpraɪətɚˌʃɪp/`） |
| H-3 長度上限 | 警告 0（無 meaning 超過 30 字） |
| H-4 大寫開頭、句尾標點、含詞形 | 警告 0 |
| H-5 example／meaning 重複 | 錯誤 0、警告 0 |
| H-7 平均每筆 bytes | 壓縮後 470.2 bytes（低於 600 警告門檻） |

另以 scratchpad 腳本檢查 O-2／O-3 字數：example 全部 8～20 字、academicContext 全部 8～25 字（初次檢查 5184 unexpectedly 的例句只有 6 字，已改寫後重新 fill、validate）。

## 3. `meaningSource = "ORIGINAL"` 清單（M-6、M-7、V-VOC-09）

| rank | wordKey | 最終 `meaning` | 原因 |
| :--- | :--- | :--- | :--- |
| 5037 | unauthorize | （多用 unauthorized）未經授權的；擅自的 | 列於 `ecdict_subset_missing.txt`，ECDICT 查無；釋義與詞性原創。實際用法幾乎只見過去分詞 unauthorized，故 pos 取 `adj.` 並在釋義括註；音標仍標詞頭 `/ʌnˈɔθəˌraɪz/` |
| 5027 | clout | 影響力；權勢；重擊 | `_zhtw` 只有「敲擊, 破布；打補釘」，缺多益與學術最常用的「影響力」（political clout、financial clout），照 ECDICT 精簡會與搭配、例句不符；整段改寫 |
| 5087 | deployment | 部署；配置；展開 | `_zhtw` 只有「[計] 展開」一個義項，無法涵蓋「部署（軟體、資源、人力）」的主要用法；整段改寫 |
| 5137 | launder | 洗（黑錢）；洗衣；燙衣 | `_zhtw` 為「流水槽；洗衣, 燙衣」，缺商業與法律文體的核心義「洗錢」（money laundering）；新增義項故標原創 |
| 5140 | globally | 全球性地；在全世界；整體地 | `_zhtw` 只有「[計] 全域性地」（簡體「全局地」，s2twp 過度轉換），只適用程式語境；一般與商務用法「全球性地」為新寫義項 |

## 4. 上下文用詞清單（V-VOC-17、M-7、H-6）

| wordKey | 英文詞義 | 簡體原詞（出現位置） | 最終 `meaning` | 處理說明 |
| :--- | :--- | :--- | :--- | :--- |
| salvage | 搶救；打撈 | 「文件恢复程序」（`[计]` 義項） | 搶救；打撈；搶救出來的財物 | 電腦義項非本字常用義，整項刪除；`meaning` 不含「程序／程式」「文件／檔案」 |
| killer | 殺手 | 「删除程序」（`[计]` 義項） | 殺手；殺人者；致死（疾病） | 電腦義項刪除；`meaning` 不含「程序」「程式」 |

### 4.1 v0.6 新增比對詞清單（V-VOC-17 補產，R6-6）

依契約 v0.6 V-VOC-17，以腳本比對簡體原檔 `ecdict_subset.csv` 的 `translation` 是否含 M-3 補充表 10 詞（支持、类型、实例、触摸、局部、保存、社区、连接、循环、菜单），列出 `meaningSource = "ECDICT"` 的命中字共 **7 筆**；判斷欄依 architecture.md v0.3 §8.4、§8.5。

| rank | wordKey | 英文詞義 | 簡體原詞（出現位置） | `_zhtw` 轉換結果 | 最終 `meaning` | 判斷 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 5010 | bolster | 支持；支撐；長枕 | n.「支持」、vt.「支持」 | 支援 | 支持；支撐；長枕 | 保留：已還原為「支持」，英文詞義為加強、撐腰 |
| 5014 | loop | 環；圈；循環 | n.「循环」、[计]「循环」 | 迴圈 | 環；圈；循環；使成環 | 保留：已還原為「循環」，英文詞義為環路、回饋循環（feedback loop）；本字例句非程式語境 |
| 5021 | endorsement | 支持；認可；背書 | n.「支持」 | 支援 | 支持；認可；背書 | 保留：已還原為「支持」，英文詞義為公開贊同 |
| 5025 | prop | 支撐；支柱；道具 | n.「支持者」 | 支援 | 支撐；維持；支柱；道具 | 不採用該義項：「支持者」未列入；meaning 不含「支援」 |
| 5091 | conservation | 保護；保存 | n.「保存」、[医]「保存」 | 儲存 | 保護；保存 | 保留：已還原為「保存」，英文詞義為保育、保存（非存檔） |
| 5189 | underpin | 支撐；支持 | vt.「支持」 | 支援 | 支撐；支持；從下面支承 | 保留：已還原為「支持」，英文詞義為作為基礎、撐住 |
| 5253 | articulate | 明白地說；口才好的 | vt.「以关节连接」 | 連線 | 明白地說；口才好的；發音清晰的 | 不採用該義項：「以關節連接」未列入；meaning 不含「連線」 |

## 5. 清單外大陸用語修正與過度轉換回查（M-3、T-2）

| wordKey | 原詞（`_zhtw`） | 簡體原檔 | 改後 `meaning` | 說明 |
| :--- | :--- | :--- | :--- | :--- |
| bolster | 支援 | 支持 | 支持；支撐；長枕 | s2twp 過度轉換，依原意改回「支持」 |
| endorsement | 支援 | 支持 | 支持；認可；背書 | 同上 |
| underpin | 支援 | 支持 | 支撐；支持；從下面支承 | 同上 |
| conservation | 儲存 | 保存 | 保護；保存 | 「保存→儲存」過度轉換，改回「保存」 |
| loop | 迴圈 | 循环 | 環；圈；循環；使成環 | 一般義為「循環」（feedback loop），改回；程式「迴圈」義未選用 |
| reportedly | 據報道 | 据报道 | 據報導；根據傳聞；根據傳說 | 「報道」為大陸用字，台灣用「報導」 |
| amino | 氨基 | 氨基 | 胺基的；胺基 | 台灣化學名詞用「胺基」（胺基酸） |
| aerosol | 氣溶膠 | 气溶胶 | 氣膠；煙霧劑；煙 | 台灣大氣科學慣用「氣膠」 |
| subsection | 分割槽 | 分区 | 分部；分段；分支 | 「分區→分割槽」過度轉換；未選用該義項 |
| partition | 分割槽 | 分区 | 隔牆；分割；隔開 | 同上，`[計]` 義項未選用 |
| decree | 釋出命令 | 发布命令 | 法令；判決；頒佈 | 「發布→釋出」過度轉換；該義項未選用 |
| articulate | 以關節連線 | 以关节连接 | 明白地說；口才好的；發音清晰的 | 「連接→連線」過度轉換；該義項未選用 |
| contributor | 投搞人 | 投搞人 | 貢獻者；捐助者；投稿者 | 原檔錯字，改用同列正確的「投稿者」 |

領域標記（T-3）：本批 `[計]`、`[醫]`、`[法]`、`[經]`、`[化]` 標記全部未保留在 `meaning`；取自這些義項的詞（如 coincide「重合」、dependency「從屬」、pensioner「領取退休金者」）直接寫成一般釋義。

## 6. 自查抽樣（S-3）

指令：`node src/data/_tools/sample.mjs --file src/data/vocab-4910.js --ratio 0.1 --min 35 --seed 4910`
母體 350，抽出 **35 筆**。檢查：釋義為精簡而非新增（對照 `_zhtw`）、無大陸用語、`pos` 與釋義一致、音標為美式且正確、例句與學術句自然且原創。

| # | rank | wordKey | 結論 | 備註 |
| :--- | :--- | :--- | :--- | :--- |
| 1 | 4915 | incline | 合格 | 動詞用法較常見，pos 排 `v.` 在前，音標取動詞重音 |
| 2 | 4937 | plead | 合格 | |
| 3 | 4985 | defensive | 合格 | |
| 4 | 4994 | composite | 合格 | |
| 5 | 4999 | eventual | 合格 | |
| 6 | 5000 | vague | 合格 | |
| 7 | 5030 | collectively | 合格 | `_zhtw`「共同, 集體」補「地」成副詞形式，未新增義項 |
| 8 | 5038 | pin | 合格 | |
| 9 | 5046 | prosper | 合格 | |
| 10 | 5050 | rigid | 合格 | |
| 11 | 5063 | sustainability | 合格 | |
| 12 | 5067 | realization | 合格 | |
| 13 | 5068 | neo | 合格（附註） | `_zhtw` 只有「[計] 最新式」，依 M-2 不新增義項；搭配與例句用 neo- 字首複合詞，見 §7.2 |
| 14 | 5087 | deployment | 合格 | ORIGINAL，見 §3 |
| 15 | 5090 | intelligent | 合格 | |
| 16 | 5093 | synergy | 合格 | |
| 17 | 5100 | constituent | 合格 | |
| 18 | 5110 | contributor | 合格 | 原檔錯字「投搞人」未取用，見 §5 |
| 19 | 5115 | rightly | 合格 | |
| 20 | 5116 | converge | 合格 | |
| 21 | 5128 | conceal | 合格 | |
| 22 | 5130 | clarity | 合格 | |
| 23 | 5142 | pronounce | 合格 | |
| 24 | 5145 | rein | 合格 | |
| 25 | 5148 | revival | 合格 | |
| 26 | 5149 | nationalize | 合格 | |
| 27 | 5151 | nationalism | 合格 | |
| 28 | 5170 | catastrophe | 合格 | |
| 29 | 5181 | inconsistent | 合格 | |
| 30 | 5201 | histogram | 合格 | |
| 31 | 5205 | intercept | 合格 | |
| 32 | 5210 | continuity | 合格 | |
| 33 | 5211 | geography | 合格 | |
| 34 | 5225 | confer | 合格 | |
| 35 | 5240 | alien | 合格 | |

**不合格率：0／35 = 0%**（≤ 5%，不需換種子重抽）。

## 7. 其他

### 7.1 長度超限、例句未含詞形（H-3、H-4）

H-3、H-4 警告 0，沒有需要說明的項目。

### 7.2 釋義取捨說明（供 QA 對照 V-VOC-18）

| wordKey | 說明 |
| :--- | :--- |
| externality | `_zhtw` 為「外形, 外在性」，無經濟學「外部性」；依 M-2 不新增，保留「外在性；外形」 |
| neo | `_zhtw` 只有「[計] 最新式」；去掉領域標記保留原義，pos 依英文詞義判為 `adj.`；R6-6 依 M-8 meaning 改為「（字首）新；新式」；R7-3 依契約 v0.7 pos 改為 `["pref."]`（見 §7.4） |
| cleric | `_zhtw` 標為「a. 牧師的, 教士的」，但英文為名詞；保留「牧師；教士」義項、去掉「的」，pos 依英文詞義改 `n.`（M-4 其他情況依英文詞義判斷） |
| micro | `_zhtw` 為「[計] 表示"小","微","微量"」；整理為「微的；小的；微量的」，pos `adj.` |
| flotation | `_zhtw` 只有化學／醫學「浮選」義；搭配與例句配合此義（froth flotation、flotation device），未寫股票上市義 |
| manipulation | `_zhtw` 為「操作, 處理」，無「操縱」；依 M-2 不新增 |
| appropriately、unexpectedly | `_zhtw` 副詞釋義誤寫為「…的」，改為「…地」，義項不變 |
| disastrous | `_zhtw`「損失慘重的, 悲傷的」，「悲傷的」不適用，只留「損失慘重的」 |
| tenure | 「(財產,職位等的)佔有」改為全形括號「（職位、財產的）佔有」 |
| syndicate | 只保留名詞義「企業聯合；財團」，pos 只列 `n.` |
| demise | 「崩, 薨」為帝王專用，未選用；保留「死亡；讓渡；轉讓」 |

### 7.3 音標說明

| wordKey | 寫法 | 說明 |
| :--- | :--- | :--- |
| incline | `/ɪnˈklaɪn/` | pos 第一個為 `v.`，依 P-6 取動詞重音（名詞為 `/ˈɪnklaɪn/`） |
| articulate | `/ɑrˈtɪkjəˌleɪt/` | pos 第一個為 `v.`，取動詞讀音（形容詞為 `/ɑrˈtɪkjələt/`） |
| deliberate | `/dɪˈlɪbərət/` | pos 第一個為 `adj.`，取形容詞讀音 |
| quasi | `/ˈkweɪzaɪ/` | 美式兩種常見讀音之一（另有 `/ˈkwɑzi/`），依 P-6 只寫一種 |

### 7.4 字首字判斷（M-8，R6-6；R7-3 依 v0.7 更新）

依契約 v0.6 M-8 逐一檢查本分檔的字首類單字（掃描範圍：pre、non、anti、mid、sub、ex、multi、inter、semi、super、micro、macro、mini、neo、trans、pro、counter、over、under、post、self、auto、vice、quasi、extra、cross、pan、tech 等，以及 ECDICT 標 `pref.` 或釋義為「表示…」字首說明者）。寫法 (1)：有獨立用法，pos 依獨立用法；字首義若保留，必須是 meaning 最後一段並以「（字首）」開頭，此時 pos 最後加 `"pref."`；寫法 (2)：只有字首義，meaning 以「（字首）」開頭、pos 恰為 `["pref."]`（畫面「pref. 字首」）。（R7-3：依契約 v0.7 M-8 更新；v0.6 以 `["adj."]` 表示字首義的寫法已廢止。）

| rank | wordKey | 寫法 | 最終 `pos` | 最終 `meaning` | 判斷 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 4995 | micro | (1) | `["adj."]` | 微的；小的；微量的 | ECDICT 只有字首說明，但 micro 在英文可獨立作形容詞（micro level、micro and macro factors），collocation 即此用法；pos `["adj."]`，meaning 不加「（字首）」；不變 |
| 5068 | neo | (2) | `["pref."]` | （字首）新；新式 | R7-3 依契約 v0.7 M-8 (2) pos 由 `["adj."]` 改 `["pref."]`。R6-6 已修改：ECDICT 只有「[計] 最新式」，英文無獨立用法（neo-classical、neo-liberal）；meaning 由「最新式」改為「（字首）新；新式」，pos 維持 `["adj."]` |
| 5197 | quasi | (1) | `["adj."]` | 類似的；準的；半 | 獨立的形容詞（quasi contract；ECDICT a.「類似的, 準的」）；不變 |

## 8. doneWhen 對照

| doneWhen | 結果 |
| :--- | :--- |
| `validate.mjs --file src/data/vocab-4910.js --stage final` 錯誤 0（含 S-2、H-1、H-2、H-5、H-7） | 達成：錯誤 0，警告 4 皆為 V-VOC-09 的 ORIGINAL 紀錄提示（§3） |
| 恰 350 筆、rank 4910～5259 連續；六欄非空、pos ≥ 1 | 達成 |
| 紀錄含驗證摘要、ORIGINAL 清單、V-VOC-17 清單、清單外大陸用語、自查抽樣（種子 4910、35 筆、不合格率 0%） | 達成（§2～§6） |
| H-3、H-4、V-VOC-14 警告逐項修正或說明 | 達成：三者警告皆為 0 |
| 只寫入本任務 paths；sources/ 未被修改 | 達成：只寫 `src/data/vocab-4910.js` 與本檔；暫存檔皆在 scratchpad |

## 9. 回饋上游

無。

## 10. 變更紀錄

| 版本 | 日期 | 作者 | 說明 |
| :--- | :--- | :--- | :--- |
| 0.1 | 2026-10-30 | pg-content-agent | 初版 |
| 0.2 | 2026-10-30 | pg-content-agent | R6-6（契約 v0.6 M-3、M-8、V-VOC-07、V-VOC-17）：補 §4.1 v0.6 新增比對詞清單 7 筆與判斷、§7.4 字首字判斷 3 筆；修改資料 5068 neo（以 fill.mjs 寫入）；validate --stage final 錯誤 0、警告 4 |
| 0.3 | 2026-10-30 | pg-content-agent | R7-3（契約 v0.7 M-4、M-8、V-VOC-07）：§7.4 寫法說明更新；修改資料 5068 neo 的 pos 由 `["adj."]` 改 `["pref."]`（以 fill.mjs 寫入）；validate --stage final 錯誤 0、警告 4 |
