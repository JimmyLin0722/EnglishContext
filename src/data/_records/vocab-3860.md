---
doc: CT-13-RECORD
version: 0.3
status: in-review
author: pg-content-agent
approved_by:
approved_at:
---

# CT-13 交付紀錄：字庫內容第 11 批（vocab-3860.js）

## 1. 摘要

| 項目 | 內容 |
| :--- | :--- |
| 任務 | CT-13 |
| 涵蓋 | US-06、US-23、AC-06-01、AC-06-02、AC-06-08、AC-23-01、AC-23-03、AC-23-04 |
| 分檔 | `src/data/vocab-3860.js` |
| 排名區間 | 3,860～4,209，350 筆，rank 連續（3,860～4,059 TSL、4,060～4,209 BSL） |
| 依據 | architecture.md v0.2 §8.2～§8.5；契約 v0.5（README §3.2 M-1～M-7、§7.2 V-VOC-01～18）；`_records/CT-01.md` |
| 流程 | `material.mjs` 匯出素材 → 7 個分段檔 `part-01`～`part-07`（每檔 50 筆，放 scratchpad `CT-13\`）→ `fill.mjs` 合併 → `validate.mjs --stage final` → `sample.mjs` 自查 |
| 欄位統計 | phonetic、pos、meaning、collocation、academicContext、example：350／350 非空（排名 > 2,809，academicContext 全部必填，V-VOC-08、AC-06-08） |
| `meaningSource` | ECDICT 345、ORIGINAL 5（本區間沒有 missing 的字；5 筆依 M-6 改寫，見 §3） |
| 日期 | 2026-10-30 |
| `sources/` | 只讀；修改時間仍為主控放置時間（ecdict 2026-10-30 09:28～10:06、wordlists 2026-10-29 15:59） |

## 2. 驗證結果（S-1、S-2、H-1～H-7）

指令：`node src/data/_tools/validate.mjs --file src/data/vocab-3860.js --stage final`
結果：**錯誤 0、警告 6；結果：通過**（依最後一次執行的結果）

| 規則 | 結果 |
| :--- | :--- |
| LOAD、V-IN-01～07 | 通過（重算 N_B = 2809、N_G = 5620，BSL 自 4,060 起） |
| V-VOC-01、02、03、05、06、07、08、13 | 通過，錯誤 0 |
| V-VOC-09 | 錯誤 0、警告 5：meaningSource = ORIGINAL 的 5 筆，原因見 §3 |
| V-VOC-10 | 錯誤 0、警告 0（沒有獨立單字 null／undefined） |
| V-VOC-14（meaning 重複，只報告） | 警告 0 |
| V-VOC-15、16 | 通過，錯誤 0 |
| V-VOC-17 | 資訊 7 筆、警告 1 筆（benchmark，判斷見 §4） |
| S-2 骨架欄位未改動 | 通過 350（資訊 5：上述 5 筆 ECDICT → ORIGINAL） |
| H-1 簡體專用字 | 錯誤 0 |
| H-2 音標字元集與英式符號 | 錯誤 0（`aɪə`、`aʊə` 直接寫標準形式，如 alliance、liable、allowance、unreliable，未加滑音） |
| H-3 長度上限 | 警告 0 |
| H-4 大寫開頭、句尾標點、含詞形 | 警告 0（中途 1 筆 derivative 例句以引號結尾，已改寫） |
| H-5 分檔內 example／meaning 重複 | 錯誤 0、警告 0 |
| H-7 平均每筆 bytes | 472.0 bytes（低於 600 警告門檻） |

另以 scratchpad 腳本自查：academicContext 8～25 字、example 8～20 字、collocation／example／academicContext 均含該字或 lemmatized 詞形，350 筆全數符合。

## 3. `meaningSource = "ORIGINAL"` 清單（M-6、M-7、V-VOC-09）

| rank | wordKey | 最終 `meaning` | 原因 |
| :--- | :--- | :--- | :--- |
| 3935 | donut | 甜甜圈 | `_zhtw` 只有 `[醫] 電子迴旋加速器環狀真空室…`，與本字常用義無關，整段改寫 |
| 4082 | pre | （字首）在…之前；預先 | `_zhtw` 只有縮寫義「煉油工程師（Petroleum Refining Engineer）」，不適用（BSL 收的是 pre-tax 等的字首），整段改寫。pos 原取 `prep.`；R6-6 依契約 v0.6 M-8 改為 `["adj."]`；R7-3 依契約 v0.7 改為 `["pref."]`（見 §7.3） |
| 4126 | stakeholder | 利害關係人；相關人士 | `_zhtw` 只有「賭金保管者；賭款儲存人」，商業與學術常用義「利害關係人」不在 ECDICT，整段改寫 |
| 4140 | marketer | 行銷人員；市場商人 | `_zhtw` 只有「趕集者；市場商人」，本字在 BSL 的主要義「行銷人員」不在 ECDICT；新增義項依 T-1 標原創 |
| 4155 | emission | 排放；排放物；發射 | `_zhtw` 為「發射；射出；發行；遺精」，缺少商業與學術最常用的「排放（物）」；新增義項依 T-1 標原創 |

## 4. 上下文用詞清單（V-VOC-17、M-7、H-6）

| rank | wordKey | 英文詞義 | 簡體原詞（出現位置） | 最終 `meaning` | 處理說明 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 3886 | rider | 騎手；（合約的）附加條款 | 「(文件后的)附件」 | 騎手；（文件後的）附件 | 指紙本文書，`_zhtw` 被 s2twp 過度轉換為「檔案」，依 M-3 改回「文件」 |
| 3900 | underground | 地下的；秘密的 | 「地铁」（英式 the Underground） | 地下的；秘密的；在地下 | 美式不以 underground 指地鐵，義項刪除；`meaning` 不含「地鐵」 |
| 3940 | enrollment | 登記；入學註冊 | 「注册」 | 登記；註冊 | 指學校入學註冊、保險加保登記，台灣學校亦稱「註冊」，保留 |
| 3951 | interpreter | 口譯者 | 「直译程序」（電腦直譯器） | 口譯者；解釋者 | 電腦義項刪除；`meaning` 不含「程序」「程式」 |
| 4020 | erase | 擦掉；抹除 | 「删除一个或多个文件」（`[计]` DOS 命令說明） | 抹去；擦掉；擦除 | DOS 命令說明整項刪除；`meaning` 不含「文件」「檔案」 |
| 4100 | par | 同等；票面價值 | 「同等水平」 | 標準；票面價值；同等水準 | 指程度、標準，依 M-3 改「水準」 |
| 4141 | benchmark | 基準 | 「基准程序」（`[计]`） | 基準；（電腦）基準程式 | **驗證器警告此筆**：簡體「基准程序」指電腦效能測試用的程式（benchmark program），台灣用語即「基準程式」，s2twp 此處轉換正確，保留「程式」；`[計]` 依 T-3 改為「（電腦）」 |

### 4.1 v0.6 新增比對詞清單（V-VOC-17 補產，R6-6）

依契約 v0.6 V-VOC-17，以腳本比對簡體原檔 `ecdict_subset.csv` 的 `translation` 是否含 M-3 補充表 10 詞（支持、类型、实例、触摸、局部、保存、社区、连接、循环、菜单），列出 `meaningSource = "ECDICT"` 的命中字共 **2 筆**；判斷欄依 architecture.md v0.3 §8.4、§8.5。

| rank | wordKey | 英文詞義 | 簡體原詞（出現位置） | `_zhtw` 轉換結果 | 最終 `meaning` | 判斷 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 3979 | repetition | 重複；反覆；背誦 | n.「循环」 | 迴圈 | 重複；反覆；背誦 | 不採用該義項：「循環」未列入；meaning 不含「迴圈」 |
| 4025 | genre | 類型；流派 | n.「类型」 | 型別 | 類型；流派 | 保留：已還原為「類型」，英文詞義為文藝作品的類別 |

## 5. 清單外大陸用語修正（M-3、T-2）

| rank | wordKey | 原詞（`_zhtw`） | 改後 `meaning` | 說明 |
| :--- | :--- | :--- | :--- | :--- |
| 3918 | cheeseburger | 乾酪漢堡包 | 起司漢堡 | 台灣慣用「起司」「漢堡」 |
| 3947 | hacker | 計算機竊賊 | 駭客；電腦竊賊 | 「計算機」指電腦為大陸用語 |
| 3965 | outage | (水、電、煤)斷供 | （水、電、瓦斯）供應中斷；儲運損耗 | 「斷供」「煤（氣）」為大陸用語，改「供應中斷」「瓦斯」 |
| 3987 | smartphone | 智慧手機 | 智慧型手機 | 台灣慣用「智慧型手機」 |
| 3991 | tablecloth | 檯布 | 桌布 | 台灣慣用「桌布」 |
| 3998 | tuna | 金槍魚, 金槍魚肉 | 鮪魚；鮪魚肉 | 台灣慣用「鮪魚」 |
| 4006 | allergy | 變應性；變態反應 | 過敏（症）；反感；厭惡 | 「變應性／變態反應」為大陸醫學用語，台灣稱「過敏」；同一義項換用語，非新增 |
| 4035 | mower | 刈草機, 刈草的人 | 割草機；割草的人 | 台灣慣用「割草機」 |
| 4063 | hedge | 套期保值 | 樹籬；避險；兩面下注以防損失 | 「套期保值」為大陸金融用語，台灣稱「避險」 |
| 4066 | variance | [化] 方差 | 變化；分歧；變異數 | 統計「方差」台灣稱「變異數」 |
| 4160 | referendum | 全民公決，全民投票 | 全民投票 | 「全民公決」為大陸用語，刪除 |

s2twp 過度轉換與原檔錯字（回查簡體原檔）：

| rank | wordKey | `_zhtw` | 簡體原檔 | 改後 |
| :--- | :--- | :--- | :--- | :--- |
| 3979 | repetition | 迴圈 | 循环 | 刪除該義項，`meaning` = 重複；反覆；背誦 |
| 4025 | genre | 型別 | 类型 | 類型；流派 |
| 4029 | homemade | 自制的 | 自制的 | 自製的；國產的（「自製」為正確字形） |
| 4131 | parameter | 參變數, 參變數, 引數 | 参变数, 参变量, 参数 | 參數；參變數；參量（「參數」被轉為程式用語「引數」，改回） |
| 4203 | discrimination | 岐視 | 岐视 | 歧視；差別；辨別力（原檔錯字「岐」改「歧」） |

領域標記改寫（T-3）：integral「（數學）積分」、workbook「（電腦）工作簿」、benchmark「（電腦）基準程式」、ex「（經濟）不附（紅利）」。其餘 `[計]`、`[醫]`、`[法]`、`[經]`、`[化]` 標記都已刪除或只取其義項文字。

## 6. 自查抽樣（S-3）

指令：`node src/data/_tools/sample.mjs --file src/data/vocab-3860.js --ratio 0.1 --min 35 --seed 3860`
母體 350，抽出 **35 筆**。檢查：釋義為精簡而非新增（對照 `_zhtw`）、無大陸用語、`pos` 與釋義一致、音標為美式且正確、例句自然且原創。

| # | rank | wordKey | 結論 | # | rank | wordKey | 結論 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | 3861 | honestly | 合格 | 19 | 4072 | aggregate | 合格 |
| 2 | 3866 | interactive | 合格（「互動」取自 `[計]` 義項） | 20 | 4073 | valuation | 合格 |
| 3 | 3889 | salespeople | 合格 | 21 | 4080 | receivable | 合格 |
| 4 | 3892 | someday | 合格 | 22 | 4093 | coalition | 合格 |
| 5 | 3899 | terrific | 合格 | 23 | 4096 | gross | 合格 |
| 6 | 3906 | wrinkle | 合格 | 24 | 4104 | trader | 合格 |
| 7 | 3911 | audition | 合格 | 25 | 4106 | correlation | 合格 |
| 8 | 3932 | diamond | 合格 | 26 | 4114 | insurer | 合格 |
| 9 | 3936 | doorman | 合格 | 27 | 4130 | liable | 合格 |
| 10 | 3943 | fork | 合格 | 28 | 4138 | publicly | 合格 |
| 11 | 3946 | gossip | 合格 | 29 | 4153 | allowance | 合格 |
| 12 | 3964 | operational | 合格 | 30 | 4157 | telecom | 合格 |
| 13 | 3989 | stimulus | 合格 | 31 | 4159 | exploit | 合格 |
| 14 | 3993 | thrill | 合格 | 32 | 4165 | technological | 合格 |
| 15 | 4008 | automotive | 合格 | 33 | 4202 | fluctuation | 合格 |
| 16 | 4041 | workbook | 合格 | 34 | 4203 | discrimination | 合格（錯字已修，見 §5） |
| 17 | 4048 | liter | 合格 | 35 | 4208 | orient | 合格 |
| 18 | 4060 | equity | 合格 | | | | |

**不合格率：0／35 = 0%**（≤ 5%，不需換種子重抽）。

## 7. 其他

### 7.1 長度超限、例句未含詞形

H-3、H-4 警告 0，無需說明。

### 7.2 釋義取捨說明（供 QA 對照 V-VOC-18）

| rank | wordKey | 說明 |
| :--- | :--- | :--- |
| 3894 | stereo | `_zhtw` 無「立體音響」，只取「立體的；立體照片」，未新增 |
| 3945 | getaway | `_zhtw` 只有「逃走；起步」，無「短期度假」；依 M-2 不新增，例句配合「逃走」義 |
| 3988 | soar | `_zhtw` 無「暴漲」，保留「翱翔；高聳；往上飛舞」，例句用 prices soar 的引申用法 |
| 4061 | sponsorship | `_zhtw` 無「贊助」，取「主辦；發起；倡議」 |
| 4062、4068、4076、4085、4108、4163 | non、anti、mid、sub、ex、multi | BSL 收錄的字首型詞條；釋義取 ECDICT 原有義項，collocation 與例句以 non-refundable、anti-fraud、mid-year、sub-Saharan、ex works、multi-year 等複合形式呈現（驗證器以字界比對，均判定含該字）。R6-6 依 M-8 調整 non、ex、multi 的 pos／meaning；R7-3 依 v0.7 再把 non、pre、multi 的 pos 改為 `["pref."]`、ex 的 pos 最後加 `"pref."`，見 §7.3 |
| 4107 | stockmarket | 詞形檔只有 stockmarket／stockmarkets，例句依 H-4 使用連寫形式 |

### 7.3 字首字判斷（M-8，R6-6；R7-3 依 v0.7 更新）

依契約 v0.6 M-8 逐一檢查本分檔的字首類單字（掃描範圍：pre、non、anti、mid、sub、ex、multi、inter、semi、super、micro、macro、mini、neo、trans、pro、counter、over、under、post、self、auto、vice、quasi、extra、cross、pan、tech 等，以及 ECDICT 標 `pref.` 或釋義為「表示…」字首說明者）。寫法 (1)：有獨立用法，pos 依獨立用法；字首義若保留，必須是 meaning 最後一段並以「（字首）」開頭，此時 pos 最後加 `"pref."`；寫法 (2)：只有字首義，meaning 以「（字首）」開頭、pos 恰為 `["pref."]`（畫面「pref. 字首」）。（R7-3：依契約 v0.7 M-8 更新；v0.6 以 `["adj."]` 表示字首義的寫法已廢止。）

| rank | wordKey | 寫法 | 最終 `pos` | 最終 `meaning` | 判斷 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 4062 | non | (2) | `["pref."]` | （字首）非；不 | R7-3 依契約 v0.7 M-8 (2) pos 由 `["adj."]` 改 `["pref."]`。R6-6 已修改：ECDICT 只有「非, 不」，英文無獨立用法（契約 M-8 例）；pos 由 `["adv."]` 改 `["adj."]`，meaning 由「非；不」改為「（字首）非；不」 |
| 4068 | anti | (1) | `["adj.","n."]` | 反對的；反對者 | 獨立的形容詞、名詞（反對的、反對者）；anti-fraud 等以「反對的」理解；不變 |
| 4076 | mid | (1) | `["adj.","prep."]` | 中間的；中部的；在…之中 | 獨立的形容詞、介系詞（中間的、在…之中）；不變 |
| 4082 | pre | (2) | `["pref."]` | （字首）在…之前；預先 | R7-3 依契約 v0.7 M-8 (2) pos 由 `["adj."]` 改 `["pref."]`。R6-6 已修改（錯誤修正）：pos 由 `["prep."]` 改 `["adj."]`（M-8 (3) 不得用 prep. 表示字首義）；meaning 維持「（字首）在…之前；預先」，meaningSource 維持 ORIGINAL |
| 4085 | sub | (1) | `["n.","adj.","v."]` | 補充人員；附屬的；替代 | 獨立的名詞、形容詞、動詞（補充人員、附屬的、替代）；不變 |
| 4108 | ex | (1) | `["n.","prep.","pref."]` | 前配偶；（經濟）不附（紅利）；（在…）交貨；（字首）前任的 | R7-3 依契約 v0.7 M-8 (1)：字首義保留在 meaning 最後一段（已確認），pos 最後加 `"pref."`，由 `["n.","prep."]` 改 `["n.","prep.","pref."]`；下列 R6-6 所述「不因字首義加詞性」已被 v0.7 取代。R6-6 已修改：獨立名詞「前配偶」與商業介系詞（ex works、ex dividend，字典列為 prep.，非字首）；meaning 由「已離婚的配偶；…」改為「前配偶；（經濟）不附（紅利）；（在…）交貨；（字首）前任的」，末尾補字首義對應 collocation 的 an ex-employee（M-8 (1) 例）；pos 維持 `["n.","prep."]`，不因字首義加詞性 |
| 4163 | multi | (2) | `["pref."]` | （字首）多；多重 | R7-3 依契約 v0.7 M-8 (2) pos 由 `["adj."]` 改 `["pref."]`。R6-6 已修改：ECDICT 只有「[計] 多」，英文無獨立用法；meaning 由「多」改為「（字首）多；多重」（契約 M-8 例），pos 維持 `["adj."]` |

## 8. doneWhen 對照

| doneWhen | 結果 |
| :--- | :--- |
| `validate.mjs --file src/data/vocab-3860.js --stage final` 錯誤 0（含 S-2、H-1、H-2、H-5、H-7） | 通過：錯誤 0、警告 6（V-VOC-09 5 筆見 §3；V-VOC-17 1 筆見 §4） |
| 恰 350 筆、rank 3860～4209 連續；phonetic、meaning、collocation、academicContext、example 全部非空，pos 至少 1 個 | 通過：V-VOC-02、07、08 錯誤 0 |
| 紀錄含驗證摘要、ORIGINAL 清單、V-VOC-17 清單、清單外大陸用語修正、自查抽樣（種子 3860、≥ 35 筆、不合格率 ≤ 5%） | 通過：§2～§6；抽樣 35 筆、不合格率 0% |
| H-3、H-4、V-VOC-14 警告逐項修正或說明 | 通過：三項警告皆為 0 |
| 只寫入本任務 paths；`sources/` 未被修改 | 通過：專案內只寫入 `src/data/vocab-3860.js` 與本檔；分段檔、素材檔都放 scratchpad |

## 9. 回饋上游

| 編號 | 事項 | 對象 | 建議 |
| :--- | :--- | :--- | :--- |
| CT13-FB-01 | `PartOfSpeech` 沒有「字首」類別，BSL／NAWL 收錄的 pre、non、anti、mid、sub、ex、multi（以及 CT-14 的 inter）只能借用 `prep.`／`adj.`／`adv.` 等詞性 | SA（知會） | 不需改格式；若日後要精確顯示，可考慮在契約註明字首型詞條的 pos 慣例，讓各批一致（R6-6：契約 v0.6 已以 M-8 定案，本分檔已依 §7.3 修正；R7-3：契約 v0.7 依 FB-25 新增 `"pref."`，本分檔 4 筆已改用，本項結案） |

## 10. 變更紀錄

| 版本 | 日期 | 作者 | 說明 |
| :--- | :--- | :--- | :--- |
| 0.1 | 2026-10-30 | pg-content-agent | 初版：CT-13 第 11 批 350 筆內容與自查結果 |
| 0.2 | 2026-10-30 | pg-content-agent | R6-6（契約 v0.6 M-3、M-8、V-VOC-07、V-VOC-17）：補 §4.1 v0.6 新增比對詞清單 2 筆與判斷、§7.3 字首字判斷 7 筆；修改資料 4062 non、4082 pre、4108 ex、4163 multi（以 fill.mjs 寫入）；validate --stage final 錯誤 0、警告 6 |
| 0.3 | 2026-10-30 | pg-content-agent | R7-3（契約 v0.7 M-4、M-8、V-VOC-07）：§7.3 寫法說明更新；修改資料 4062 non、4082 pre、4163 multi 的 pos 由 `["adj."]` 改 `["pref."]`，4108 ex 的 pos 由 `["n.","prep."]` 改 `["n.","prep.","pref."]`（meaning 末段已是「（字首）前任的」，不變）（以 fill.mjs 寫入）；validate --stage final 錯誤 0、警告 6 |
