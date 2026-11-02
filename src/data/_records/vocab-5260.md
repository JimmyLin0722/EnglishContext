---
doc: CT-17-RECORD
version: 0.3
status: in-review
author: pg-content-agent
approved_by:
approved_at:
---

# CT-17 交付紀錄：字庫內容第 15 批（vocab-5260.js）

## 1. 摘要

| 項目 | 內容 |
| :--- | :--- |
| 任務 | CT-17 |
| 涵蓋 | US-06、US-23、AC-06-01、AC-06-02、AC-06-08、AC-23-01、AC-23-03、AC-23-04 |
| 分檔 | `src/data/vocab-5260.js` |
| 排名區間 | 5,260～5,620（NAWL，依字母序），361 筆，rank 連續 |
| 依據 | architecture.md v0.2 §8.2～§8.5；契約 v0.5（README §3.2 M-1～M-7、§7.2 V-VOC-01～18）；`_records/CT-01.md` |
| 流程 | `material.mjs` 匯出素材 → 8 個分段檔 `part-01.jsonl`～`part-08.jsonl`（50 筆 × 7 + 11 筆，放 scratchpad）→ `fill.mjs` 合併 → `validate.mjs --stage final` → `sample.mjs` 自查 |
| 欄位統計 | phonetic、meaning、collocation、academicContext、example：361／361 非空；pos 361 筆皆至少 1 個 |
| `meaningSource` | ECDICT 359、ORIGINAL 2（見 §3） |
| 日期 | 2026-10-30 |
| `sources/` | 只讀；修改時間仍為主控放置時間（ecdict 2026-10-30 09:28～10:06、wordlists 2026-10-29 15:59），本任務未寫入 |

## 2. 驗證結果（S-1、S-2、H-1～H-7）

指令：`node src/data/_tools/validate.mjs --file src/data/vocab-5260.js --stage final`
結果：**錯誤 0、警告 2；結果：通過**（exit 0；依最後一次執行的結果）

| 規則 | 結果 |
| :--- | :--- |
| FILE、LOAD、V-IN-01～07 | 通過（重算 N_B = 2,809、N_G = 5,620，與 §4.2 一致） |
| V-VOC-01、02、03、05、06、07、13 | 通過，錯誤 0 |
| V-VOC-08 academicContext（排名 > 2,809 必填） | 通過 361，錯誤 0 |
| V-VOC-09 來源標記 | 錯誤 0、警告 2：contradictory、trans 為 ORIGINAL（原因見 §3） |
| V-VOC-10 | 通過，錯誤 0、警告 0 |
| V-VOC-14（meaning 重複，只報告） | 警告 0 |
| V-VOC-15、16 | 通過，錯誤 0 |
| V-VOC-17 | 資訊 4 筆（見 §4），警告 0 |
| S-2 骨架欄位未改動 | 通過 361（資訊 2：上述 2 筆 ECDICT → ORIGINAL，允許） |
| H-1 簡體專用字 | 錯誤 0 |
| H-2 音標字元集與英式符號 | 錯誤 0 |
| H-3 長度上限 | 警告 0 |
| H-4 大寫開頭、句尾標點、含詞形 | 警告 0（collocation、example 全部含該字或 lemmatized 詞形） |
| H-5 分檔內 example／meaning 重複 | 錯誤 0、警告 0 |
| H-7 平均每筆 bytes | 466.3 bytes（低於 600 的警告門檻） |

## 3. `meaningSource = "ORIGINAL"` 清單（M-6、M-7、V-VOC-09）

本區間沒有 `ecdict_subset_missing.txt` 的字；以下 2 筆因 ECDICT 釋義不適用而整段改寫：

| wordKey | ECDICT `_zhtw` 原文 | 最終 `meaning`／`pos` | 原因 |
| :--- | :--- | :--- | :--- |
| contradictory | a. 反駁的, 反對的, 抗辯的 / n. 矛盾因素, 對立物 | 矛盾的；相互牴觸的／adj. | ECDICT 形容詞義只有「反駁的、反對的」，沒有本字最主要的「矛盾的」（contradictory results／evidence）；名詞義罕用。為了讓卡片正確，整段改寫 |
| trans | [電] transimitter的簡寫 | （化學）反式的／adj. | ECDICT 只有一筆錯字的電子縮寫義（transimitter），不是 NAWL 學術用法；本字在學術文本主要用於 trans fats、trans isomers。原創釋義與詞性 |

## 4. 上下文用詞清單（V-VOC-17、M-7、H-6）

| wordKey | 英文詞義 | 簡體原詞（出現位置） | 最終 `meaning` | 處理說明 |
| :--- | :--- | :--- | :--- | :--- |
| binary | 二元的；二進位的 | 「二进制文件传输类型设置命令」（`[计]` 義項） | 二元的；二進位的；由兩部分組成的 | 電腦命令義項刪除；`meaning` 不含「文件」「檔案」。另：`_zhtw`「二進位制」是 s2twp 對「二进制」的轉換，台灣慣用「二進位」，只取一般義項的「二進位的」 |
| migrate | 移動；遷移 | 「迁移程序」（`[计]` 義項） | 移動；移往；（電腦）遷移 | 只保留「遷移」，依 T-3 改為「（電腦）」括註；`meaning` 不含「程序」「程式」 |
| nucleus | 核心；原子核 | 「核心程序」（`[计]` 義項） | 核心；原子核；起點 | 電腦義項刪除；`meaning` 不含「程序」「程式」 |
| pi | 圓周率 | 「程序中断」（`[计]` PI 縮寫義項） | 圓周率 | 電腦縮寫義項刪除；`meaning` 不含「程序」「程式」 |

### 4.1 v0.6 新增比對詞清單（V-VOC-17 補產，R6-6）

依契約 v0.6 V-VOC-17，以腳本比對簡體原檔 `ecdict_subset.csv` 的 `translation` 是否含 M-3 補充表 10 詞（支持、类型、实例、触摸、局部、保存、社区、连接、循环、菜单），列出 `meaningSource = "ECDICT"` 的命中字共 **6 筆**；判斷欄依 architecture.md v0.3 §8.4、§8.5。

| rank | wordKey | 英文詞義 | 簡體原詞（出現位置） | `_zhtw` 轉換結果 | 最終 `meaning` | 判斷 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 5263 | binary | 二元的；二進位的 | [计]「二进制文件传输类型设置命令」 | 型別 | 二元的；二進位的；由兩部分組成的 | 不採用該義項：「類型」只出現在 [計] 命令說明，整項刪除；meaning 不含「型別」 |
| 5294 | connector | 連結物；連結者 | [计]「连接口」 | 連線 | 連結物；連結者 | 不採用該義項：「連接口」（[計]）未列入；meaning 不含「連線」 |
| 5297 | conserve | 保存；使（能量等）守恆 | vt.「保存」 | 儲存 | 保存；使（能量等）守恆 | 保留：已還原為「保存」，英文詞義為節約保存資源 |
| 5309 | cyclic | 週期的；循環的；環狀的 | a.「循环的」、[计]「循环的」 | 迴圈 | 週期的；循環的；環狀的 | 保留：已還原為「循環的」，英文詞義為周而復始 |
| 5532 | rotate | 旋轉；使輪流 | vi.「循环」 | 迴圈 | 旋轉；使轉動；使輪流 | 不採用該義項：vi.「循環」未列入；meaning 不含「迴圈」 |
| 5533 | rotation | 旋轉；輪流；循環 | n.「循环」 | 迴圈 | 旋轉；輪流；循環 | 保留：已還原為「循環」，英文詞義為輪替、輪作（非程式迴圈） |

## 5. 清單外大陸用語與 s2twp 過度轉換修正（M-3、T-2）

| wordKey | 簡體原檔 | `_zhtw` | 改後 `meaning` | 說明 |
| :--- | :--- | :--- | :--- | :--- |
| conserve | 保存 | 儲存 | 保存；使（能量等）守恆 | s2twp 把「保存」過度轉成「儲存」（電腦用語）；conserve 是保存、節約資源，改回「保存」 |
| cyclic | 循环的 | 迴圈的 | 週期的；循環的；環狀的 | 「迴圈」是程式用語，s2twp 過度轉換；一般義改回「循環的」 |
| rotation | 循环 | 迴圈 | 旋轉；輪流；循環 | 同上，改回「循環」 |
| syndrome | 综合征 | 綜合徵 | 症候群；併發症狀 | 「綜合徵（征）」為大陸醫學用語，台灣用「症候群」 |
| whichever | 无论那一个 | 無論那一個 | 無論哪一個；任何一個 | 疑問／任指用法現行台灣書寫用「哪」 |
| connector | 连接口 | 連線口 | 連結物；連結者 | s2twp 把「连接口」轉成「連線口」不合台灣用法（台灣稱「連接埠」）；`[計]` 義項直接刪除，不新增 |

其他處理：
- 領域標記（T-3）：migrate 的 `[計]` 改為「（電腦）」括註；colony「菌落」取自 `[醫] 菌(集)落`；fusion 的 `[化] 聚變`（大陸用語）未採用；dimensional 的 `[化] 量綱的`（大陸用語）未採用，改取同義項的「因次的」。其餘 `[計]`、`[醫]`、`[化]`、`[法]`、`[經]` 標記未保留在 `meaning`。
- 詞形調整（非新增義項）：fundamentally「基本上；根本上」、genetically「遺傳上；基因上」是把 ECDICT 名詞式譯語「基本、根本」「遺傳、基因」加上副詞語尾「上」；founds 加註「（found 的第三人稱單數）」取自 `_zhtw` 原文括註；encode「把……譯成密碼」省略原文括號內的「電文、情報等」。
- descriptor 的 ECDICT 原文只有 `[計]` 義項、無詞性縮寫，依 M-4「無標示時依英文詞義判斷」標 `n.`。

## 6. 自查抽樣（S-3）

指令：`node src/data/_tools/sample.mjs --file src/data/vocab-5260.js --ratio 0.1 --min 35 --seed 5260`
母體 361，抽出 **37 筆**（≥ 36）。檢查項目：釋義是精簡而不是新增（對照 `_zhtw`）、沒有大陸用語、`pos` 和釋義一致、音標是美式而且正確、例句與學術情境自然而且原創。

| # | rank | wordKey | 結論 | 備註 |
| :--- | :--- | :--- | :--- | :--- |
| 1 | 5262 | bilingual | 合格 | |
| 2 | 5266 | bizarre | 合格 | |
| 3 | 5267 | bleed | 合格 | |
| 4 | 5277 | chloride | 合格 | |
| 5 | 5289 | conception | 合格 | 「受孕」取自 `[醫]` 義項 |
| 6 | 5294 | connector | 合格 | 見 §5 |
| 7 | 5304 | critically | 合格 | |
| 8 | 5313 | deceive | 合格 | |
| 9 | 5338 | elementary | 合格 | |
| 10 | 5344 | enormously | 合格 | |
| 11 | 5348 | equivalence | 合格 | |
| 12 | 5370 | genetically | 合格（附註） | 副詞語尾「上」，見 §5 |
| 13 | 5384 | hepatitis | 合格 | |
| 14 | 5390 | incidence | 合格 | |
| 15 | 5394 | industrialization | 合格 | |
| 16 | 5421 | liver | 合格 | |
| 17 | 5449 | neuron | 合格 | |
| 18 | 5456 | nucleus | 合格 | V-VOC-17 已處理 |
| 19 | 5461 | optical | 合格 | |
| 20 | 5462 | organism | 合格 | |
| 21 | 5463 | oscillation | 合格 | |
| 22 | 5468 | paradox | 合格 | |
| 23 | 5469 | pardon | 合格 | |
| 24 | 5471 | parenthesis | 合格 | |
| 25 | 5473 | peasant | 合格 | |
| 26 | 5485 | plantation | 合格 | |
| 27 | 5503 | progression | 合格 | |
| 28 | 5506 | psychologist | 合格 | |
| 29 | 5512 | radiation | 合格 | |
| 30 | 5530 | ritual | 合格 | |
| 31 | 5554 | soluble | 合格（已修） | 原例句用 soluble coffee（偏英式，美式多說 instant coffee），改為 soluble tablet 後重新 fill、validate |
| 32 | 5563 | stereotype | 合格 | |
| 33 | 5568 | surgical | 合格 | |
| 34 | 5576 | syntax | 合格 | |
| 35 | 5582 | theorem | 合格 | 美式 `/ˈθɪrəm/`（亦有 `/ˈθiərəm/`，依 P-6 取一種） |
| 36 | 5611 | vein | 合格 | |
| 37 | 5620 | yeast | 合格 | |

**不合格率：0／37 = 0%**（≤ 5%，不需要換種子重抽）。5554 的例句問題在交付前已修正。

另做全檔比對（scratchpad 腳本）：把每筆 `meaning` 各義項與 `_zhtw` 原文逐一比對，找不到原文的只有 §3 的 2 筆 ORIGINAL 與 §5 列出的修正與詞形調整；過程中發現 photographic「攝影的」與原文「攝影用的」不一致，已改為「攝影用的；照相的；逼真的」。

## 7. 其他

| 項目 | 說明 |
| :--- | :--- |
| H-3 長度超限 | 無 |
| O-2／O-3 字數 | 另以 scratchpad 腳本逐筆計算：example 全部 8～20 字、academicContext 全部 8～25 字；過程中發現 5399 infinity 例句只有 7 字，已加長為 12 字後重新 fill、validate |
| H-4 未含詞形 | 無 |
| V-VOC-10 null／undefined 字樣 | 無 |
| 學術情境（O-3） | 361 筆皆為英文論文風格句（方法、結果、文獻回顧用語），8～25 字 |
| 音標 | 全部原創美式 IPA；`aɪə`（diagnosis、ion、dialect）、`eɪə`（portrayal）、`aʊə`（vowel）依驗證器 R5-2 直接寫標準形式；`g` 用 ASCII（P-5） |

### 7.1 字首字判斷（M-8，R6-6；R7-4 依 v0.7 更新說明）

依契約 v0.7 M-8 逐一檢查本分檔的字首類單字（掃描範圍：pre、non、anti、mid、sub、ex、multi、inter、semi、super、micro、macro、mini、neo、trans、pro、counter、over、under、post、self、auto、vice、quasi、extra、cross、pan、tech 等，以及 ECDICT 標 `pref.` 或釋義為「表示…」字首說明者）。寫法 (1)：有獨立用法，pos 先依獨立用法照 M-4 填寫；字首義若保留，必須是 meaning 的最後一段並以「（字首）」開頭，此時 pos 最後加上 `"pref."`；不保留字首義時 pos 不含 `"pref."`。寫法 (2)：只有字首義，meaning 以「（字首）」開頭且只含字首義，pos 恰為 `["pref."]`（畫面「pref. 字首」）。v0.6 以 `["adj."]` 表示字首義的寫法已廢止（M-8 (3)）。本表 1 筆為寫法 (1) 且未保留字首義，pos 不含 `"pref."`，資料不受 v0.7 影響。

| rank | wordKey | 寫法 | 最終 `pos` | 最終 `meaning` | 判斷 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 5591 | trans | (1) | `["adj."]` | （化學）反式的 | 獨立的形容詞（化學「反式的」，trans fats 分寫）；不變 |

## 8. 回饋上游

| 編號 | 對象 | 內容 |
| :--- | :--- | :--- |
| — | — | 無 |

## 9. 變更紀錄

| 版本 | 日期 | 說明 |
| :--- | :--- | :--- |
| 0.1 | 2026-10-30 | 初版（CT-17） |
| 0.2 | 2026-10-30 | R6-6（契約 v0.6 M-3、M-8、V-VOC-07、V-VOC-17）：補 §4.1 v0.6 新增比對詞清單 6 筆與判斷、§7.1 字首字判斷 1 筆；資料檔未修改；validate --stage final 錯誤 0、警告 2 |
| 0.3 | 2026-10-30 | R7-4（契約 v0.7 M-8）：§7.1 字首字判斷的寫法說明由 v0.6 的 `["adj."]` 改為 v0.7 的 `"pref."` 寫法；本分檔字首字皆為寫法 (1) 未保留字首義，資料不受影響；資料檔未修改 |
