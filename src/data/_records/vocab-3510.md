---
doc: CT-12-RECORD
version: 0.3
status: in-review
author: pg-content-agent
approved_by:
approved_at:
---

# CT-12 交付紀錄：字庫內容第 10 批（vocab-3510.js）

## 1. 摘要

| 項目 | 內容 |
| :--- | :--- |
| 任務 | CT-12 |
| 涵蓋 | US-06、US-23、AC-06-01、AC-06-02、AC-06-08、AC-23-01、AC-23-03、AC-23-04 |
| 分檔 | `src/data/vocab-3510.js` |
| 排名區間 | 3,510～3,859（TSL 區段），350 筆，rank 連續 |
| 依據 | architecture.md v0.2 §8.2～§8.5；契約 v0.5（README §3.2 M-1～M-7、§7.2 V-VOC-01～18）；`_records/CT-01.md` |
| 流程 | `material.mjs` 匯出素材 → 7 個分段檔 `part-01.jsonl`～`part-07.jsonl`（每檔 50 筆，放 scratchpad）→ `fill.mjs` 合併 → `validate.mjs --stage final` → `sample.mjs` 自查 |
| 欄位統計 | phonetic、pos、meaning、collocation、academicContext、example：350／350 非空（排名 > 2,809，academicContext 全數必填，AC-06-08） |
| `meaningSource` | ECDICT 347、ORIGINAL 3（missing 1 筆 + M-6 整段改寫 2 筆，見 §3） |
| 日期 | 2026-10-30 |
| `sources/` | 只讀；修改時間仍為主控放置時間（ecdict 2026-10-30 09:28～10:06、wordlists 2026-10-29 15:59） |

## 2. 驗證結果（S-1、S-2、H-1～H-7）

指令：`node src/data/_tools/validate.mjs --file src/data/vocab-3510.js --stage final`
結果：**錯誤 0、警告 3；結果：通過**（exit 0；依最後一次執行的結果）

| 規則 | 結果 |
| :--- | :--- |
| FILE、LOAD、V-IN-01～07 | 通過 |
| V-VOC-01、02、03、05、06、07、08、13 | 通過，錯誤 0（V-VOC-08：350 筆 academicContext 全部非空） |
| V-VOC-09 | 錯誤 0、警告 2：teen、condominium 為 M-6 改標 ORIGINAL，原因見 §3 |
| V-VOC-10 | 通過 4,116 項，錯誤 0 |
| V-VOC-14（meaning 重複） | 警告 0 |
| V-VOC-15、16 | 通過，錯誤 0 |
| V-VOC-17 | 資訊 2、警告 1（archive 的「檔案」用法，判斷見 §4） |
| S-2 骨架欄位未改動 | 通過 350（資訊 2：teen、condominium 的 meaningSource ECDICT → ORIGINAL） |
| H-1 簡體專用字 | 錯誤 0 |
| H-2 音標字元集與英式符號 | 錯誤 0（`aɪə`、`ɔɪə` 依 R5-2 修正後的驗證器直接寫標準形式，如 violin `/ˌvaɪəˈlɪn/`、enjoyable `/ɪnˈdʒɔɪəbəl/`） |
| H-3 長度上限 | 警告 0 |
| H-4 大寫開頭、句尾標點、含詞形 | 警告 0 |
| H-5 example／meaning 重複 | 錯誤 0、警告 0 |
| H-7 平均每筆 bytes | 439.3 bytes（低於 600 警告門檻） |

另以 scratchpad 腳本逐筆檢查字數：example 全部 8～20 字（O-2）、academicContext 全部 8～25 字（O-3），350 筆無例外。

## 3. `meaningSource = "ORIGINAL"` 清單（M-6、M-7、V-VOC-09）

| rank | wordKey | 原因 | 最終 `meaning` |
| :--- | :--- | :--- | :--- |
| 3523 | entrée | 列於 `ecdict_subset_missing.txt`，ECDICT 查無（E-37），釋義與詞性原創 | 主菜；入場權 |
| 3687 | teen | ECDICT 只有古英文義「憤怒, 悲哀」，與現代常用義「青少年」完全無關；未取用任何 ECDICT 義項，整段改寫 | 青少年；十幾歲的 |
| 3774 | condominium | ECDICT 只有「共同統治；財產共有權」，與多益常見的「分戶產權公寓」不符；未取用任何 ECDICT 義項，整段改寫 | 分戶出售的公寓；公寓大廈 |

## 4. 上下文用詞清單（V-VOC-17、M-7、H-6）

| wordKey | 英文詞義 | 簡體原詞（出現位置） | 最終 `meaning` | 處理說明 |
| :--- | :--- | :--- | :--- | :--- |
| spreadsheet | 電子試算表 | 「空白表格程序」（`_zhtw` 已被過度轉換為「程式」） | 電子試算表；電子資料表 | 「空白表格程序」義項刪除；`[计] 电子表格` 為大陸用法，改為台灣慣用的「電子試算表」（見 §5）；`meaning` 不含「程序」「程式」 |
| archive | 檔案庫；存檔 | 「档案文件」（`_zhtw` 被轉成「檔案檔案」） | 檔案館；檔案；存檔 | 驗證器警告「文件→檔案」可能過度轉換。判斷：此處 archive 的「檔案」指機關保存的紀錄（archives），台灣用法本就是「檔案」，不是電腦 file 的誤轉；只取「檔案」一詞，不保留重複的「檔案檔案」，也不需改成「文件」 |

### 4.1 v0.6 新增比對詞清單（V-VOC-17 補產，R6-6）

依契約 v0.6 V-VOC-17，以腳本比對簡體原檔 `ecdict_subset.csv` 的 `translation` 是否含 M-3 補充表 10 詞（支持、类型、实例、触摸、局部、保存、社区、连接、循环、菜单），列出 `meaningSource = "ECDICT"` 的命中字共 **4 筆**；判斷欄依 architecture.md v0.3 §8.4、§8.5。

| rank | wordKey | 英文詞義 | 簡體原詞（出現位置） | `_zhtw` 轉換結果 | 最終 `meaning` | 判斷 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 3538 | parcel | 包裹；部分；打包 | adv.「局部地」 | 區域性 | 包裹；部分；打包 | 不採用該義項：adv.「局部地」未列入；meaning 不含「區域性」 |
| 3681 | recur | 復發；重現；再來 | vi.「循环」 | 迴圈 | 復發；重現；再來 | 不採用該義項：「循環」未列入；meaning 不含「迴圈」 |
| 3775 | consecutive | 連續的；聯貫的 | [计]「连接的」 | 連線 | 連續的；聯貫的 | 不採用該義項：「連接的」（[計]）未列入；meaning 不含「連線」 |
| 3844 | circulate | 流通；循環；傳播 | v.「(使)循环」 | 迴圈 | 流通；循環；傳播 | 保留：已還原為「循環」，英文詞義為流通、傳閱 |

## 5. 清單外大陸用語修正（M-3、T-2）

| wordKey | 原詞（`_zhtw`） | 改後 `meaning` | 說明 |
| :--- | :--- | :--- | :--- |
| customize | 定製 | 客製化；訂做；按規格改製 | 台灣用「客製化」；「按規格改制」的「制」改為「製」 |
| spill | 溢位、使溢位 | 溢出；灑；濺出 | s2twp 把「溢出」過度轉換成電腦用語「溢位」，回查簡體原檔為「溢出」，改回 |
| spreadsheet | 電子表格 | 電子試算表；電子資料表 | 台灣慣用「試算表」 |
| stapler | 訂書機 | 釘書機 | 台灣慣用「釘書機」 |
| staple | 訂書釘 | 主要產物；主要的；釘書針；釘住 | 台灣慣用「釘書針」 |
| toner | 色粉 | 碳粉；調色劑 | 印表機耗材台灣稱「碳粉」 |
| yen | 日元 | 日圓（日本貨幣單位）；渴望 | 台灣用「日圓」 |
| gram | 克 | 公克；克 | 台灣慣用「公克」 |
| centimeter | 釐米 | 公分；釐米 | 台灣慣用「公分」 |
| butter | 黃油、塗黃油於 | 奶油；塗奶油於 | 「黃油」為大陸用語 |
| hamburger | 漢堡包 | 漢堡；肉餅；漢堡牛排 | 台灣說「漢堡」 |
| skateboard | 溜冰板 | 滑板 | 台灣說「滑板」 |
| cordless | 無繩索的 | 無線的；無繩索的 | 大陸「無繩電話」，台灣稱「無線電話」 |
| deluxe | 高階的 | 豪華的；高級的 | 簡體原檔為「高级的」，s2twp 誤轉為「高階的」，改回「高級的」 |
| homeowner | 私房屋主 | 屋主；自己擁有住房者 | 「私房」為大陸用語，只留「屋主」 |
| circulate | (使)迴圈 | 流通；循環；傳播 | s2twp 把「循环」過度轉換成程式用語「迴圈」，回查簡體原檔後改回「循環」 |

其他：recur 的「迴圈」（同上過度轉換）義項整項刪除；evacuate 的「排洩」義項刪除（自查時處理，見 §6）；`[計]`、`[醫]`、`[法]`、`[經]`、`[化]` 等領域標記全部刪除，沒有保留到 `meaning`。

## 6. 自查抽樣（S-3）

指令：`node src/data/_tools/sample.mjs --file src/data/vocab-3510.js --ratio 0.1 --min 35 --seed 3510`
母體 350，抽出 **35 筆**。檢查項目：釋義是精簡而不是新增（對照 `_zhtw`）、沒有大陸用語、`pos` 和釋義一致、音標是美式而且正確、例句自然而且原創。

| # | rank | wordKey | 結論 | 備註 |
| :--- | :--- | :--- | :--- | :--- |
| 1 | 3525 | freight | 合格 | |
| 2 | 3528 | gardener | 合格 | |
| 3 | 3540 | periodical | 合格 | |
| 4 | 3545 | relieve | 合格 | |
| 5 | 3549 | seaside | 合格 | |
| 6 | 3566 | compatible | 合格 | 「相容的」取自 `[計]` 義項（非電腦專用義） |
| 7 | 3601 | stapler | 合格 | 「訂書機」改「釘書機」，見 §5 |
| 8 | 3611 | administer | 合格 | |
| 9 | 3620 | congestion | 合格 | |
| 10 | 3648 | snowy | 合格 | |
| 11 | 3670 | disrupt | 合格 | 只取 vt. 義項，不列 adj. |
| 12 | 3675 | habitual | 合格 | |
| 13 | 3677 | invaluable | 合格 | |
| 14 | 3682 | reproduce | 合格 | |
| 15 | 3701 | blueprint | 合格 | |
| 16 | 3719 | flexibility | 合格 | |
| 17 | 3737 | overcharge | 合格 | |
| 18 | 3758 | termination | 合格 | |
| 19 | 3761 | transmission | 合格 | |
| 20 | 3768 | affirmative | 合格 | |
| 21 | 3771 | cage | 合格 | |
| 22 | 3788 | fatigue | 合格 | |
| 23 | 3792 | fog | 合格 | 音標取 `/fɔg/`（美式另有 `/fɑg/`，P-6 只寫一種） |
| 24 | 3796 | headphone | 合格 | |
| 25 | 3801 | lighter | 合格 | |
| 26 | 3803 | loyalty | 合格 | |
| 27 | 3816 | resume | 合格 | 只列動詞；名詞「履歷」屬 résumé（不同發音），不列入 |
| 28 | 3817 | reunion | 合格 | |
| 29 | 3819 | seafood | 合格 | |
| 30 | 3824 | superb | 合格 | |
| 31 | 3834 | archive | 合格 | 「檔案」判斷見 §4 |
| 32 | 3841 | bulk | 合格 | |
| 33 | 3845 | comb | 合格 | |
| 34 | 3854 | evacuate | 合格（已修） | 原 meaning 含「排洩」（非台灣標準寫法「排泄」，且非多益常用義），刪除後重新 fill、validate |
| 35 | 3857 | familiarity | 合格 | |

**不合格率：0／35 = 0%**（≤ 5%，不需要換種子重抽）。3854 的問題在交付前已修正。

## 7. 其他

### 7.1 長度超限、例句未含詞形

H-3、H-4 警告 0，沒有需要說明的項目。

### 7.2 詞性與釋義取捨說明（供 QA 對照 V-VOC-18）

| wordKey | 說明 |
| :--- | :--- |
| fundraise | `_zhtw` 標「n. 募捐」，但英文 fundraise 是動詞；依 M-4「依英文詞義判斷」，`pos` 填 `v.`，「募捐」在中文本可作動詞，釋義未改 |
| conveniently | `_zhtw` 標「a. 方便, 合宜」，實為副詞；`pos` 填 `adv.`，釋義加「地」成「方便地；合宜地」，未新增義項 |
| mileage | `_zhtw`「[經] 運費(按英里計算的)」改為「運費（按英里計算）」，改全形括號 |
| unload | 「擺脫...之負擔」精簡為「擺脫負擔」 |
| personalize | 「在(物品)上標明姓名」精簡為「在物品上標明姓名」 |
| ma'am | `_zhtw` 為「夫人, 女王, 公主」，只留「夫人」並加註「（對女性的尊稱）」，未新增義項 |
| meaningful、officially、microwave、outfit、fleet、sticker | `_zhtw` 沒有「有意義的」「正式地」「微波爐」「服裝」「車隊」「貼紙」等常見義，依 M-2 不新增，只從現有義項精簡；collocation／example 以這些字的常見用法撰寫 |

### 7.3 字首字判斷（M-8，R6-6；R7-4 依 v0.7 更新說明）

依契約 v0.7 M-8 逐一檢查本分檔的字首類單字（掃描範圍：pre、non、anti、mid、sub、ex、multi、inter、semi、super、micro、macro、mini、neo、trans、pro、counter、over、under、post、self、auto、vice、quasi、extra、cross、pan、tech 等，以及 ECDICT 標 `pref.` 或釋義為「表示…」字首說明者）。寫法 (1)：有獨立用法，pos 先依獨立用法照 M-4 填寫；字首義若保留，必須是 meaning 的最後一段並以「（字首）」開頭，此時 pos 最後加上 `"pref."`；不保留字首義時 pos 不含 `"pref."`。寫法 (2)：只有字首義，meaning 以「（字首）」開頭且只含字首義，pos 恰為 `["pref."]`（畫面「pref. 字首」）。v0.6 以 `["adj."]` 表示字首義的寫法已廢止（M-8 (3)）。本表 1 筆為寫法 (1) 且未保留字首義，pos 不含 `"pref."`，資料不受 v0.7 影響。

| rank | wordKey | 寫法 | 最終 `pos` | 最終 `meaning` | 判斷 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 3537 | pan | (1) | `["n.","v."]` | 平鍋；淺盤；搖鏡頭 | 獨立的名詞、動詞（平鍋、搖鏡頭）；pan- 字首義不列入；不變 |

### 7.4 diagnose 釋義修改（V-VOC-14，R7-4）

rank 3518 diagnose 與 rank 5322 diagnosis（vocab-5260.js）的 meaning 同為「診斷」，四選一可能出現相同選項（V-VOC-14）。diagnose 改用動詞寫法以區分；diagnosis 維持名詞「診斷」不動。

| rank | wordKey | 欄位 | 修改前 | 修改後 | 依據 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 3518 | diagnose | `meaning` | 診斷 | 診斷出（疾病或問題）；為…做診斷 | ECDICT `translation` 只有「v. 診斷」一個義項，未新增義項，只改為動詞寫法；「疾病或問題」取自 ECDICT `definition`（the nature of a problem or an illness）。`pos` 維持 `["v."]`，`meaningSource` 維持 `"ECDICT"` |

主控建議的「判斷（問題）」不在 ECDICT `translation` 義項內，依 M-2（精簡而非新增）未採用。

## 8. doneWhen 對照

| doneWhen | 結果 |
| :--- | :--- |
| `validate.mjs --file src/data/vocab-3510.js --stage final` 錯誤 0（含 S-2、H-1、H-2、H-5、H-7） | 達成（錯誤 0、警告 3，皆已在 §3、§4 說明） |
| 恰 350 筆、rank 3510～3859 連續；各內容欄位非空、pos ≥ 1 | 達成 |
| 本紀錄含 §8.5 各段 | 達成（§2～§7） |
| H-3、H-4、V-VOC-14 警告已修正或說明 | 三項警告皆 0 |
| 只寫入本任務 paths；sources/ 未被修改 | 達成（只寫 `src/data/vocab-3510.js`、本檔；暫存檔在 scratchpad） |

## 9. 回饋上游

無。

## 10. 變更紀錄

| 版本 | 日期 | 說明 |
| :--- | :--- | :--- |
| 0.1 | 2026-10-30 | 初版 |
| 0.2 | 2026-10-30 | R6-6（契約 v0.6 M-3、M-8、V-VOC-07、V-VOC-17）：補 §4.1 v0.6 新增比對詞清單 4 筆與判斷、§7.3 字首字判斷 1 筆；資料檔未修改；validate --stage final 錯誤 0、警告 3 |
| 0.3 | 2026-10-30 | R7-4（契約 v0.7 M-8）：§7.3 字首字判斷的寫法說明由 v0.6 的 `["adj."]` 改為 v0.7 的 `"pref."` 寫法；本分檔字首字皆為寫法 (1) 未保留字首義，資料不受影響；另依 V-VOC-14 修改 rank 3518 diagnose 的 meaning（§7.4）；validate --file --stage final 錯誤 0、警告 3；--all 錯誤 0、V-VOC-14 由 14 組減為 13 組 |
