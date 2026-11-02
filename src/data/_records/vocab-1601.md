---
doc: CT-07-RECORD
version: 0.4
status: in-review
author: pg-content-agent
approved_by:
approved_at:
---

# CT-07 交付紀錄：字庫內容第 05 批（vocab-1601.js）

## 1. 摘要

| 項目 | 內容 |
| :--- | :--- |
| 任務 | CT-07 |
| 涵蓋 | US-06、US-23、AC-06-01、AC-06-02、AC-23-01、AC-23-03、AC-23-04 |
| 分檔 | `src/data/vocab-1601.js` |
| 排名區間 | 1,601～2,000（NGSL），400 筆，rank 連續 |
| 依據 | architecture.md v0.2 §8.2～§8.5；契約 v0.5（README §3.2 M-1～M-7、§7.2 V-VOC-01～18）；`_records/CT-01.md` |
| 流程 | `material.mjs` 匯出素材 → 8 個分段檔 `part-01.jsonl`～`part-08.jsonl`（每檔 50 筆，放 scratchpad）→ `fill.mjs` 合併 → `validate.mjs --stage final` → `sample.mjs` 自查 |
| 欄位統計 | phonetic、pos、meaning、collocation、example：400／400 非空；academicContext 非空 177 筆、空字串 223 筆（功能詞與無學術用途的生活字依 O-3 留空） |
| `meaningSource` | ECDICT 400、ORIGINAL 0（本區間無 missing 字，也沒有整段改寫） |
| 日期 | 2026-10-30 |
| `sources/` | 只讀；修改時間仍為主控放置時間（ecdict 2026-10-30 09:28～10:06、wordlists 2026-10-29 15:59） |

## 2. 驗證結果（S-1、S-2、H-1～H-7）

指令：`node src/data/_tools/validate.mjs --file src/data/vocab-1601.js --stage final`
結果：**錯誤 0、警告 0；結果：通過**（exit 0；依最後一次執行的結果）

| 規則 | 結果 |
| :--- | :--- |
| FILE、LOAD | 通過 |
| V-VOC-01、02、03、04、06、07、08、09、13 | 通過，錯誤 0 |
| V-VOC-10（v0.5，「等於」null／undefined 與角括號） | 通過 4,545 項，錯誤 0、警告 0（無任何獨立單字 null／undefined） |
| V-VOC-14（meaning 重複，只報告） | 警告 0 |
| V-VOC-15（對照表殘留、領域標記） | 通過，錯誤 0 |
| V-VOC-16（ECDICT 舊式音標字元） | 通過，錯誤 0 |
| V-VOC-17 | 資訊 3 筆（見 §4），警告 0 |
| S-2 骨架欄位未改動 | 通過 400 |
| H-1 簡體專用字 | 錯誤 0 |
| H-2 音標字元集與英式符號 | 錯誤 0（3 筆的寫法見 §7.1） |
| H-3 長度上限 | 警告 0（無 meaning 超過 30 字） |
| H-4 大寫開頭、句尾標點、含詞形 | 警告 0（collocation、example 全部含該字或 lemmatized 詞形） |
| H-5 分檔內 example／meaning 重複 | 錯誤 0、警告 0 |
| H-7 平均每筆 bytes | 381.9 bytes（低於 600 的警告門檻） |

## 3. `meaningSource = "ORIGINAL"` 清單（M-6、M-7、V-VOC-09）

| wordKey | 原因 |
| :--- | :--- |
| （無） | 本區間沒有 `ecdict_subset_missing.txt` 的字；所有釋義都是從 `_zhtw` 的 `translation` 精簡而來，沒有整段改寫，所以 0 筆改成 ORIGINAL |

## 4. 上下文用詞清單（V-VOC-17、M-7、H-6）

| wordKey | 英文詞義 | 簡體原詞（出現位置） | 最終 `meaning` | 處理說明 |
| :--- | :--- | :--- | :--- | :--- |
| fat | 脂肪；肥胖的 | 「文件分配表」（`[计]` FAT 縮寫義項） | 脂肪；肥肉；肥的；胖的 | 電腦縮寫義項非本字常用義，整項刪除；`meaning` 不含「文件」「檔案」 |
| gap | 缺口；差距 | 「通用汇编程序」（`[计]` GAP 縮寫義項） | 缺口；縫隙；間距 | 電腦縮寫義項刪除；`meaning` 不含「程序」「程式」 |
| install | 安裝 | 「安装程序」（`[计]`） | 安裝；安置；使就職 | 只保留動詞義，「安裝程式」義項刪除；`meaning` 不含「程序」「程式」 |

### 4.1 v0.6 新增比對詞清單（V-VOC-17 補產，R6-6）

依契約 v0.6 V-VOC-17，以腳本比對簡體原檔 `ecdict_subset.csv` 的 `translation` 是否含 M-3 補充表 10 詞（支持、类型、实例、触摸、局部、保存、社区、连接、循环、菜单），列出 `meaningSource = "ECDICT"` 的命中字共 **6 筆**；判斷欄依 architecture.md v0.3 §8.4、§8.5。

| rank | wordKey | 英文詞義 | 簡體原詞（出現位置） | `_zhtw` 轉換結果 | 最終 `meaning` | 判斷 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1620 | conservative | 保守的；守舊的 | a.「有保存力的」、[化]「保存剂」 | 儲存 | 保守的；守舊的 | 不採用該義項：「有保存力的」「保存劑」未列入；meaning 不含「儲存」 |
| 1682 | joint | 共同的；聯合的；關節 | n.「连接处」、a.「连接的」、vt.「连接」 | 連線 | 共同的；聯合的；關節 | 不採用該義項：「連接處」「連接的」未列入；meaning 不含「連線」 |
| 1688 | reserve | 預訂；保留；儲備金 | vt.「保存」 | 儲存 | 預訂；保留；儲備金 | 不採用該義項：vt.「保存」未列入，以「保留」表達；meaning 不含「儲存」 |
| 1712 | circle | 圓周；社交圈；環繞 | n.「循环」、vi.「循环」 | 迴圈 | 圓周；社交圈；範圍；環繞 | 不採用該義項：「循環」未列入；meaning 不含「迴圈」 |
| 1935 | preserve | 保存；保護；維持；保護區 | vt.「保存」 | 儲存 | 保存；保護；維持；保護區 | 已修改：原為「保護；保持；維持」，改為「保存；保護；維持；保護區」。`_zhtw` 把核心義「保存」轉成「儲存」，原撰寫時略去；依 M-3 還原「保存」列首。另補 n.「保護區」使 meaning 涵蓋 pos 的 n.（M-4），刪去與「維持」重複的「保持」 |
| 1970 | revolution | 革命；大變革；旋轉 | n.「循环」 | 迴圈 | 革命；大變革；旋轉 | 不採用該義項：「循環」未列入；meaning 不含「迴圈」 |

## 5. 清單外大陸用語修正（M-3、T-2）

| wordKey | 原詞（`_zhtw`） | 改後 `meaning` | 說明 |
| :--- | :--- | :--- | :--- |
| online | `[計] 聯機` | （電腦）連線的；線上 | 「聯機」為大陸用語，台灣用「連線」「線上」；`[計]` 依 T-3 改為「（電腦）」括註；未新增義項 |

其他領域標記改寫（T-3）：reduction 的 `[化] 還原` → 「（化學）還原」。其餘 `[計]`、`[醫]`、`[法]`、`[經]` 義項都直接刪除，沒有保留到 `meaning`。

## 6. 自查抽樣（S-3）

指令：`node src/data/_tools/sample.mjs --file src/data/vocab-1601.js --ratio 0.1 --min 35 --seed 1601`
母體 400，抽出 **40 筆**。檢查項目：釋義是精簡而不是新增（對照 `_zhtw`）、沒有大陸用語、`pos` 和釋義一致、音標是美式而且正確、例句自然而且原創。

| # | rank | wordKey | 結論 | 備註 |
| :--- | :--- | :--- | :--- | :--- |
| 1 | 1615 | ourselves | 合格 | |
| 2 | 1624 | debt | 合格 | 「借款」取自 `[經]` 義項 |
| 3 | 1658 | capture | 合格 | |
| 4 | 1671 | considerable | 合格 | |
| 5 | 1686 | faith | 合格 | 「信仰」取自 `[法]` 義項 |
| 6 | 1700 | formal | 合格 | |
| 7 | 1709 | index | 合格 | |
| 8 | 1710 | sad | 合格 | |
| 9 | 1712 | circle | 合格 | |
| 10 | 1713 | helpful | 合格 | |
| 11 | 1734 | via | 合格（附註） | 音標 `/ˈvaɪjə/` 為避開 H-2 誤判的寫法，見 §7.1 |
| 12 | 1735 | legislation | 合格 | |
| 13 | 1737 | unlike | 合格 | |
| 14 | 1763 | rare | 合格 | |
| 15 | 1771 | estate | 合格 | |
| 16 | 1774 | alive | 合格 | |
| 17 | 1781 | sweet | 合格 | |
| 18 | 1785 | tall | 合格 | |
| 19 | 1787 | enemy | 合格 | |
| 20 | 1790 | talent | 合格 | |
| 21 | 1793 | priority | 合格 | 「優先順序」取自 `[計]` 義項（非電腦專用義） |
| 22 | 1796 | pilot | 合格 | |
| 23 | 1799 | resolution | 合格 | |
| 24 | 1825 | truly | 合格 | |
| 25 | 1827 | yellow | 合格 | |
| 26 | 1830 | core | 合格 | |
| 27 | 1845 | initiative | 合格 | |
| 28 | 1856 | freeze | 合格 | |
| 29 | 1861 | negotiation | 合格 | |
| 30 | 1872 | deserve | 合格 | |
| 31 | 1882 | dish | 合格 | |
| 32 | 1899 | personally | 合格 | |
| 33 | 1907 | shirt | 合格（已修） | 抽查時發現例句用英式 trousers，改成美式 pants 後重新 fill、validate |
| 34 | 1909 | corporation | 合格 | |
| 35 | 1938 | illness | 合格 | |
| 36 | 1954 | primarily | 合格 | |
| 37 | 1955 | integrate | 合格 | |
| 38 | 1967 | silence | 合格 | |
| 39 | 1968 | rapidly | 合格 | |
| 40 | 1977 | grateful | 合格 | |

**不合格率：0／40 = 0%**（≤ 5%，不需要換種子重抽）。1907 的英式用字在交付前已修正；1734 的音標寫法是配合驗證器的權宜做法，已在 §7.1 說明。

## 7. 其他

### 7.1 H-2 誤判與音標權宜寫法

> **R5-3（2026-10-30）已改回標準美式 IPA**：驗證器 H-2 已由 R5-2 修正，`aɪə` 不再誤判。現值：via → /ˈvaɪə/、scientific → /ˌsaɪənˈtɪfɪk/、diet → /ˈdaɪət/。下表「權宜寫法」為歷史紀錄，已不在分檔中。

`lib.mjs` 的 `IPA_BRITISH_BLACKLIST` 用子字串比對 `ɪə`，美式雙母音 `aɪ` 後面接 schwa（`aɪə`）也會被當成英式 `ɪə` 而報錯。本批受影響 3 筆，改用加滑音 `j` 的寫法（實際發音中確實有這個滑音，美式讀音不變），讓 H-2 錯誤歸 0：

| wordKey | 標準美式 IPA | 交付寫法 |
| :--- | :--- | :--- |
| via | /ˈvaɪə/ | /ˈvaɪjə/ |
| scientific | /ˌsaɪənˈtɪfɪk/ | /ˌsaɪjənˈtɪfɪk/ |
| diet | /ˈdaɪət/ | /ˈdaɪjət/ |

H-2 修正後，建議把這 3 筆改回標準寫法（見回饋上游）。

### 7.2 長度超限、例句未含詞形

H-3、H-4 警告 0，沒有需要說明的項目。

### 7.3 釋義取捨說明（供 QA 對照 V-VOC-18）

| wordKey | 說明 |
| :--- | :--- |
| significantly | `_zhtw` 只有「值得注目地；意味深長地」，沒有「顯著地」；依 M-2 不新增義項，原樣精簡 |
| closely | `_zhtw` 只有「接近地」，沒有「密切地」；同上 |
| outcome | `_zhtw` 為「結果, 出口」，「出口」不適用，只留「結果」 |
| hi | `_zhtw` 只有「喂」，加註「（打招呼用語）」以免與電話用語混淆，未新增義項 |
| occupy | `_zhtw`「佔(時間、空間等)」改為全形括號「佔（時間、空間）」 |

### 7.4 字首字判斷（M-8，R6-6；R7-3 依 v0.7 更新）

依契約 v0.6 M-8 逐一檢查本分檔的字首類單字（掃描範圍：pre、non、anti、mid、sub、ex、multi、inter、semi、super、micro、macro、mini、neo、trans、pro、counter、over、under、post、self、auto、vice、quasi、extra、cross、pan、tech 等，以及 ECDICT 標 `pref.` 或釋義為「表示…」字首說明者）。寫法 (1)：有獨立用法，pos 依獨立用法；字首義若保留，必須是 meaning 最後一段並以「（字首）」開頭，此時 pos 最後加 `"pref."`；寫法 (2)：只有字首義，meaning 以「（字首）」開頭、pos 恰為 `["pref."]`（畫面「pref. 字首」）。（R7-3：依契約 v0.7 M-8 更新；v0.6 以 `["adj."]` 表示字首義的寫法已廢止。）

| rank | wordKey | 寫法 | 最終 `pos` | 最終 `meaning` | 判斷 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1833 | self | (1) | `["n."]` | 自己；自我；本性 | 獨立的名詞（自我）；self- 複合字（self-service）以「自己」理解；不變 |

## 8. doneWhen 對照

| doneWhen | 結果 |
| :--- | :--- |
| `validate.mjs --file src/data/vocab-1601.js --stage final` 錯誤 0（含 S-2、H-1、H-2、H-5、H-7） | 通過：錯誤 0、警告 0 |
| 恰 400 筆、rank 1601～2000 連續；phonetic、meaning、collocation、example 全部非空，pos 至少 1 個 | 通過：400 筆、連續；四個欄位空值 0、pos 空 0 |
| 紀錄含驗證摘要、ORIGINAL 清單、V-VOC-17 清單、清單外大陸用語修正、自查抽樣（種子 1601、≥ 40 筆、不合格率 ≤ 5%） | 通過：§2～§6；抽樣 40 筆、不合格率 0% |
| H-3、H-4、V-VOC-14 警告逐項修正或說明 | 通過：三項警告都是 0 |
| 只寫入本任務 paths；`sources/` 未被修改 | 通過：專案內只寫入 `src/data/vocab-1601.js` 和本檔；分段檔、素材檔都放 scratchpad |

## 9. 回饋上游

| 編號 | 事項 | 對象 | 建議 |
| :--- | :--- | :--- | :--- |
| CT07-FB-01 | H-2 的 `IPA_BRITISH_BLACKLIST` 用子字串比對 `ɪə`，會誤判美式 `aɪ` + `ə`（via、diet、scientific，其他批次的 science、client、quiet、society、variety 等也會碰到）。本批暫時用 `/aɪjə/` 寫法避開 | SD、主控（派 CT-01 補修 `lib.mjs`／`validate.mjs`） | 比對 `ɪə` 時排除前一個字元是 `a` 的情況（例如 `/(?<!a)ɪə/`）；修正後各批把權宜寫法改回 `/aɪə/` |

## 10. 變更紀錄

| 版本 | 日期 | 作者 | 說明 |
| :--- | :--- | :--- | :--- |
| 0.1 | 2026-10-30 | pg-content-agent | 初版：CT-07 第 05 批 400 筆內容與自查結果 |
| 0.2 | 2026-10-30 | pg-content-agent | R5-3：H-2 誤判修正後，把 §7.1 的權宜音標改回標準美式 IPA（via → /ˈvaɪə/、scientific → /ˌsaɪənˈtɪfɪk/、diet → /ˈdaɪət/）；只改 phonetic，validate --stage final 錯誤 0 |
| 0.3 | 2026-10-30 | pg-content-agent | R6-6（契約 v0.6 M-3、M-8、V-VOC-07、V-VOC-17）：補 §4.1 v0.6 新增比對詞清單 6 筆與判斷、§7.4 字首字判斷 1 筆；修改資料 1935 preserve（以 fill.mjs 寫入）；validate --stage final 錯誤 0、警告 0 |
| 0.4 | 2026-10-30 | pg-content-agent | R7-3（契約 v0.7 M-8）：字首字判斷段的寫法說明改為 v0.7（`pref.`）；本分檔字首判斷結果與資料檔皆未修改；validate --stage final 錯誤 0、警告 0 |
