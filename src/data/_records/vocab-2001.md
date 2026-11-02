---
doc: CT-08-RECORD
version: 0.3
status: in-review
author: pg-content-agent
approved_by:
approved_at:
---

# CT-08 交付紀錄：字庫內容第 06 批（vocab-2001.js）

## 1. 摘要

| 項目 | 內容 |
| :--- | :--- |
| 任務 | CT-08 |
| 涵蓋 | US-06、US-23、AC-06-01、AC-06-02、AC-23-01、AC-23-03、AC-23-04 |
| 分檔 | `src/data/vocab-2001.js` |
| 排名區間 | 2,001～2,400（NGSL），400 筆，rank 連續 |
| 依據 | architecture.md v0.2 §8.2～§8.5；契約 v0.5（README §3.2 M-1～M-7、§7.2 V-VOC-01～18）；`_records/CT-01.md` |
| 流程 | `material.mjs` 匯出素材 → 8 個分段檔 `part-01.jsonl`～`part-08.jsonl`（每檔 50 筆，放 scratchpad `CT-08\parts\`）→ `fill.mjs` 合併 → `validate.mjs --stage final` → `sample.mjs` 自查 |
| 欄位統計 | phonetic、pos、meaning、collocation、example：400／400 非空；academicContext 非空 293 筆、空字串 107 筆（功能詞與無學術用途的生活字依 O-3 留空，如 beer、cake、mom、sir、pub、knee） |
| `meaningSource` | ECDICT 397、ORIGINAL 3（gay、album、vice，依 M-6，見 §3） |
| 日期 | 2026-10-30 |
| `sources/` | 只讀；修改時間仍為主控放置時間（ecdict 2026-10-30 09:28～10:06、wordlists 2026-10-29 15:59） |

## 2. 驗證結果（S-1、S-2、H-1～H-7）

指令：`node src/data/_tools/validate.mjs --file src/data/vocab-2001.js --stage final`
結果：**錯誤 0、警告 3；結果：通過**（exit 0；依最後一次執行的結果）

| 規則 | 結果 |
| :--- | :--- |
| FILE、LOAD | 通過 |
| V-VOC-01、02、03、04、06、07、08、13 | 通過，錯誤 0 |
| V-VOC-09 | 錯誤 0、警告 3：gay、album、vice 為 `ORIGINAL` 且不在 missing 清單，原因見 §3（M-6 預期的提醒） |
| V-VOC-10 | 通過，錯誤 0、警告 0 |
| V-VOC-14（meaning 重複，只報告） | 警告 0（初版 restrict／restriction 同為「限制；限定；約束」，已把 restrict 改為「限制；約束」） |
| V-VOC-15、16 | 通過，錯誤 0 |
| V-VOC-17 | 資訊 3 筆（見 §4），警告 0 |
| S-2 骨架欄位未改動 | 通過 400；資訊 3 筆（上述 3 筆 meaningSource ECDICT → ORIGINAL，允許） |
| H-1 簡體專用字 | 錯誤 0 |
| H-2 音標字元集與英式符號 | 錯誤 0；`aɪə`、`aʊə`、`oʊə` 都直接用標準寫法（anxiety `/æŋˈzaɪəti/`、giant `/ˈdʒaɪənt/`、dialog `/ˈdaɪəˌlɔg/`、nowadays `/ˈnaʊəˌdeɪz/`、poem `/ˈpoʊəm/`），沒有加滑音 j |
| H-3 長度上限 | 警告 0 |
| H-4 大寫開頭、句尾標點、含詞形 | 警告 0 |
| H-5 分檔內 example／meaning 重複 | 錯誤 0、警告 0 |
| H-7 平均每筆 bytes | 428.6 bytes（低於 600 的警告門檻） |

## 3. `meaningSource = "ORIGINAL"` 清單（M-6、M-7、V-VOC-09）

| wordKey | 最終 `meaning` | `_zhtw` 原文 | 原因 |
| :--- | :--- | :--- | :--- |
| gay | 同性戀的；歡快的；快樂的 | 歡快的, 豔麗的, 快樂的, 放蕩的 | ECDICT 缺當代主要義項「同性戀的」；只保留舊義會誤導學習者。新增 ECDICT 沒有的義項，依 M-2、M-6 標原創 |
| album | 相簿；（音樂）專輯 | 貼上簿, 唱片套 | 「貼上簿」是 s2twp 把簡體「粘贴簿」過度轉換的結果；「唱片套」也不是現代常用義。整段改寫成台灣常用的「相簿」「專輯」，未取用 ECDICT 義項，依 M-6 標原創 |
| vice | 副的（職位）；惡習；罪惡 | 惡習, 惡行, 罪惡, …, prep. 代替 | 多益最常見的用法是 vice president（副總裁），ECDICT 沒有「副」的義項；新增義項，依 M-2、M-6 標原創。「惡習；罪惡」仍取自 ECDICT |

## 4. 上下文用詞清單（V-VOC-17、M-7、H-6）

| wordKey | 英文詞義 | 簡體原詞（出現位置） | 最終 `meaning` | 處理說明 |
| :--- | :--- | :--- | :--- | :--- |
| restore | 恢復；修復 | 「从备份盘中取回文件」（`[计]` DOS 外部命令說明） | 恢復；修復；歸還；修補 | DOS 命令說明非本字常用義，整項刪除；`meaning` 不含「文件」「檔案」 |
| edit | 編輯 | 「编辑文本文件的全屏幕编辑程序」（`[计]` DOS 命令說明） | 編輯；編校；修訂；剪輯 | DOS 命令說明刪除；`meaning` 不含「程序」「程式」「文件」「檔案」 |
| cap | 帽子；蓋子 | 「呼叫程序分析」「程序代码分析程序」等（`[计]` 縮寫義項） | 蓋子；帽子；覆蓋；勝過 | 電腦縮寫義項非本字常用義，整項刪除；`meaning` 不含「程序」「程式」 |

### 4.1 v0.6 新增比對詞清單（V-VOC-17 補產，R6-6）

依契約 v0.6 V-VOC-17，以腳本比對簡體原檔 `ecdict_subset.csv` 的 `translation` 是否含 M-3 補充表 10 詞（支持、类型、实例、触摸、局部、保存、社区、连接、循环、菜单），列出 `meaningSource = "ECDICT"` 的命中字共 **2 筆**；判斷欄依 architecture.md v0.3 §8.4、§8.5。

| rank | wordKey | 英文詞義 | 簡體原詞（出現位置） | `_zhtw` 轉換結果 | 最終 `meaning` | 判斷 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 2109 | supporter | 支持者；後盾 | n.「支持者」、[法]「支持者」 | 支援 | 支持者；後盾 | 保留：`_zhtw` 本即「支持者」，台灣用法正確 |
| 2273 | sustain | 支持；持續；承受 | vt.「支持」 | 支援 | 支持；持續；承受；蒙受 | 保留：已還原為「支持」，英文詞義為撐住、維持（sustain growth） |

## 5. 清單外大陸用語修正（M-3、T-2）

| wordKey | 原詞（`_zhtw`／簡體） | 改後 `meaning` | 說明 |
| :--- | :--- | :--- | :--- |
| sustain | `_zhtw`「支援」（簡體「支持」） | 支持；持續；承受；蒙受 | s2twp 過度轉換，sustain 是「支持、撐住」，依簡體原檔改回「支持」；「持續」取自 `[電] 持續` |
| digital | 數字的、數字顯示的 | 數位的；數字顯示的 | 「數字的」為大陸用法，台灣用「數位的」 |
| custom | 定製的；自定義 | 習慣；風俗；訂製的 | 「定製」「自定義」為大陸用法，改「訂製」；「自定義」義項刪除 |
| depression | `[醫] 抑鬱[症]` | 不景氣；沮喪；（醫學）憂鬱症 | 台灣醫學用語為「憂鬱症」；`[醫]` 依 T-3 改「（醫學）」括註 |
| meter | 米, 公尺 | 公尺；儀表；計量器；以儀表計量 | 「米」為大陸用法，只保留「公尺」 |
| expansion | `[計] 擴充套件`（簡體「扩展」） | 擴充；開展；膨脹 | s2twp 過度轉換的電腦義項整項刪除 |
| flood | 溢位（簡體「溢出」） | 洪水；淹沒；使氾濫；湧進 | s2twp 過度轉換，該義項未取用 |
| publication | `[經] 釋出`（簡體「发布」） | 出版物；出版；公佈 | s2twp 過度轉換，該義項未取用 |

用字統一（非大陸用語，只是改成台灣較常見的寫法，未改變義項）：furniture「傢俱」→「家具」；platform「站臺、月臺、講臺、平臺」→「月台；講台；平台」；occasionally「偶而」→「偶爾」。

其他領域標記：`[醫]`、`[計]` 等標記只保留 7 處並改為括註（port「（電腦）埠」、justify「（電腦）兩端對齊」、extension「（電腦）副檔名」、boot「（電腦）引導」、episode「（醫學）發作」、consultant「（醫學）顧問醫師」、depression「（醫學）憂鬱症」），其餘領域義項直接刪除。

## 6. 自查抽樣（S-3）

指令：`node src/data/_tools/sample.mjs --file src/data/vocab-2001.js --ratio 0.1 --min 35 --seed 2001`
母體 400，抽出 **40 筆**。檢查項目：釋義是精簡而不是新增（對照 `_zhtw`）、沒有大陸用語、`pos` 和釋義一致、音標是美式而且正確、例句自然而且原創。

| # | rank | wordKey | 結論 | 備註 |
| :--- | :--- | :--- | :--- | :--- |
| 1 | 2028 | preparation | 合格 | |
| 2 | 2034 | entertainment | 合格 | |
| 3 | 2037 | retail | 合格 | 「零售」同時涵蓋 n.、v. |
| 4 | 2049 | equivalent | 合格 | |
| 5 | 2056 | port | 合格 | 「（電腦）埠」取自 `[計] 埠` |
| 6 | 2065 | profile | 合格 | |
| 7 | 2068 | crack | 合格 | |
| 8 | 2077 | sensitive | 合格 | |
| 9 | 2087 | recruit | 合格 | |
| 10 | 2100 | restore | 合格 | V-VOC-17 上下文用詞，見 §4 |
| 11 | 2125 | external | 合格 | |
| 12 | 2135 | pour | 合格 | |
| 13 | 2140 | anger | 合格 | 「忿怒」照 `_zhtw` 保留，台灣通用 |
| 14 | 2145 | database | 合格 | |
| 15 | 2151 | apparent | 合格 | |
| 16 | 2153 | expansion | 合格 | 過度轉換義項已刪，見 §5 |
| 17 | 2156 | scare | 合格 | |
| 18 | 2161 | essay | 合格 | |
| 19 | 2171 | platform | 合格 | 臺→台用字統一，見 §5 |
| 20 | 2178 | designer | 合格 | |
| 21 | 2186 | extension | 合格 | |
| 22 | 2187 | wealth | 合格 | |
| 23 | 2194 | invitation | 合格 | |
| 24 | 2196 | frighten | 合格 | |
| 25 | 2212 | agricultural | 合格 | |
| 26 | 2245 | vice | 合格 | ORIGINAL，見 §3 |
| 27 | 2247 | similarly | 合格 | |
| 28 | 2265 | bloody | 合格 | |
| 29 | 2266 | ally | 合格 | 初稿「使結盟」改為 ECDICT 原有的「結盟」 |
| 30 | 2269 | mature | 合格 | |
| 31 | 2273 | sustain | 合格 | 支援→支持，見 §5 |
| 32 | 2301 | apologize | 合格 | |
| 33 | 2318 | summary | 合格 | |
| 34 | 2332 | drag | 合格 | |
| 35 | 2336 | dependent | 合格 | |
| 36 | 2347 | admire | 合格 | |
| 37 | 2351 | significance | 合格 | |
| 38 | 2370 | segment | 合格 | |
| 39 | 2371 | custom | 合格 | 定製→訂製，見 §5 |
| 40 | 2373 | sand | 合格 | |

**不合格率：0／40 = 0%**（≤ 5%，不需要換種子重抽）。

交付前另做的全檔檢查（非抽樣）：

| 檢查 | 結果 |
| :--- | :--- |
| `meaning` 每個義項是否能在 `_zhtw` 原文找到 | 除 §3、§5 已列的 13 筆外，其餘全部可直接對應；另 gender「性別」（`_zhtw`「性」的同義寫法）、stroke「撫摩」（合併「撫, 摩」）、lend「借（給）」屬精簡改寫，未新增義項 |
| `pos` 與 `meaning` 一致 | 全檔逐筆核對；初稿 wire、mount、angle、league、opponent 多列了 `meaning` 沒涵蓋的詞性，已刪除 |
| s2twp 過度轉換字詞（支援、型別、例項、觸控、區域性、儲存、社群、連線、迴圈、釋出、套件、溢位） | `meaning` 中 0 筆 |
| 例句是否適合職場 | 初稿 god 的例句用感嘆語 Thank God，改為博物館展覽情境 |

## 7. 其他

### 7.1 長度超限、例句未含詞形

H-3、H-4 警告 0，沒有需要說明的項目。例句 8～20 字、學術句 8～25 字，以 scratchpad 轉檔腳本逐筆計數確認。

### 7.2 釋義取捨說明（供 QA 對照 V-VOC-18）

| wordKey | 說明 |
| :--- | :--- |
| typically | `_zhtw` 只有「代表性地；作為特色地」，沒有「通常」；依 M-2 不新增義項 |
| elderly | `_zhtw` 只有「過了中年的, 稍老的」；同上 |
| involvement | `_zhtw` 沒有「參與」，只保留「捲入；牽連；包含」 |
| stem | `_zhtw` 沒有 stem from「起源於」，collocation 改用 stem the flow 等 ECDICT 有的義項（阻止） |
| incentive | `_zhtw` 只有「動機；激勵的」，沒有「獎勵、誘因」 |
| cap | `_zhtw` 沒有「上限」，collocation、例句只用「帽子、蓋子」義 |
| awful | 「莊嚴的、虔敬的」為古義，刪除，只留「可怕的」 |
| cream | 「乳酪」照 `_zhtw` 保留（ECDICT 指乳脂），排在「奶油；面霜」之後 |
| teenager | 照 `_zhtw`「十三歲到十九歲的少年」原樣保留 |

### 7.3 字首字判斷（M-8，R6-6；R7-3 依 v0.7 更新）

依契約 v0.6 M-8 逐一檢查本分檔的字首類單字（掃描範圍：pre、non、anti、mid、sub、ex、multi、inter、semi、super、micro、macro、mini、neo、trans、pro、counter、over、under、post、self、auto、vice、quasi、extra、cross、pan、tech 等，以及 ECDICT 標 `pref.` 或釋義為「表示…」字首說明者）。寫法 (1)：有獨立用法，pos 依獨立用法；字首義若保留，必須是 meaning 最後一段並以「（字首）」開頭，此時 pos 最後加 `"pref."`；寫法 (2)：只有字首義，meaning 以「（字首）」開頭、pos 恰為 `["pref."]`（畫面「pref. 字首」）。（R7-3：依契約 v0.7 M-8 更新；v0.6 以 `["adj."]` 表示字首義的寫法已廢止。）

| rank | wordKey | 寫法 | 最終 `pos` | 最終 `meaning` | 判斷 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 2245 | vice | (1) | `["adj.","n."]` | 副的（職位）；惡習；罪惡 | 獨立的名詞（惡習）；vice president 為分寫的開放式複合詞，vice 作形容詞「副的」（字典列為 adj.），非字首；不變 |

## 8. doneWhen 對照

| doneWhen | 結果 |
| :--- | :--- |
| `validate.mjs --file src/data/vocab-2001.js --stage final` 錯誤 0（含 S-2、H-1、H-2、H-5、H-7） | 通過：錯誤 0；警告 3 為 V-VOC-09 的 ORIGINAL 提醒（§3 已列原因） |
| 恰 400 筆、rank 2001～2400 連續；phonetic、meaning、collocation、example 全部非空，pos 至少 1 個 | 通過：400 筆、連續；四個欄位空值 0、pos 空 0 |
| 紀錄含驗證摘要、ORIGINAL 清單、V-VOC-17 清單、清單外大陸用語修正、自查抽樣（種子 2001、≥ 40 筆、不合格率 ≤ 5%） | 通過：§2～§6；抽樣 40 筆、不合格率 0% |
| H-3、H-4、V-VOC-14 警告逐項修正或說明 | 通過：H-3、H-4 警告 0；V-VOC-14 唯一 1 組重複已修正 |
| 只寫入本任務 paths；`sources/` 未被修改 | 通過：專案內只寫入 `src/data/vocab-2001.js` 和本檔；分段檔、素材檔、轉檔腳本都放 scratchpad |

## 9. 回饋上游

| 編號 | 事項 | 對象 | 建議 |
| :--- | :--- | :--- | :--- |
| CT08-FB-01 | ECDICT 有些高頻字缺少現代主要義項（gay「同性戀的」、vice「副」、album「專輯」），本批依 M-6 改標 ORIGINAL，使 ORIGINAL 數量超過 M-7 預期的「只有 missing 4 筆」 | SA（契約 M-7、N-3 的 ECDICT `includedItemCount` 預期值 5,616） | M-7 改成「預期 missing 4 筆，另加各批依 M-6 記錄的字」；N-3 的 ECDICT 筆數改以實際 `meaningSource = "ECDICT"` 計算（validate 目前就是這樣推導，只需調整文字） |

## 10. 變更紀錄

| 版本 | 日期 | 作者 | 說明 |
| :--- | :--- | :--- | :--- |
| 0.1 | 2026-10-30 | pg-content-agent | 初版：CT-08 第 06 批 400 筆內容與自查結果 |
| 0.2 | 2026-10-30 | pg-content-agent | R6-6（契約 v0.6 M-3、M-8、V-VOC-07、V-VOC-17）：補 §4.1 v0.6 新增比對詞清單 2 筆與判斷、§7.3 字首字判斷 1 筆；資料檔未修改；validate --stage final 錯誤 0、警告 3 |
| 0.3 | 2026-10-30 | pg-content-agent | R7-3（契約 v0.7 M-8）：字首字判斷段的寫法說明改為 v0.7（`pref.`）；本分檔字首判斷結果與資料檔皆未修改；validate --stage final 錯誤 0、警告 3 |
