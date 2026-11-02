---
doc: CT-14-RECORD
version: 0.3
status: in-review
author: pg-content-agent
approved_by:
approved_at:
---

# CT-14 交付紀錄：字庫內容第 12 批（vocab-4210.js）

## 1. 摘要

| 項目 | 內容 |
| :--- | :--- |
| 任務 | CT-14 |
| 涵蓋 | US-06、US-23、AC-06-01、AC-06-02、AC-06-08、AC-23-01、AC-23-03、AC-23-04 |
| 分檔 | `src/data/vocab-4210.js` |
| 排名區間 | 4,210～4,559（BSL 區段），350 筆，rank 連續 |
| 依據 | architecture.md v0.2 §8.2～§8.5；契約 v0.5（README §3.2 M-1～M-7、§7.2 V-VOC-01～18）；`_records/CT-01.md` |
| 流程 | `material.mjs` 匯出素材 → 7 個分段檔 `part-01.jsonl`～`part-07.jsonl`（每檔 50 筆，放 scratchpad）→ `fill.mjs` 合併 → `validate.mjs --stage final` → `sample.mjs` 自查 |
| 欄位統計 | phonetic、pos、meaning、collocation、academicContext、example：350／350 非空（排名 > 2,809，academicContext 依 AC-06-08 全數填寫） |
| `meaningSource` | ECDICT 346、ORIGINAL 4（M-6 改寫，見 §3；本區間無 missing 字） |
| 日期 | 2026-10-30 |
| `sources/` | 只讀；修改時間仍為主控放置時間（ecdict 2026-10-30 09:28～10:06、wordlists 2026-10-29 15:59） |

## 2. 驗證結果（S-1、S-2、H-1～H-7）

指令：`node src/data/_tools/validate.mjs --file src/data/vocab-4210.js --stage final`
結果：**錯誤 0、警告 4；結果：通過**（警告 4 筆皆為 V-VOC-09 的 ORIGINAL 提醒，原因見 §3）

| 規則 | 結果 |
| :--- | :--- |
| FILE、LOAD、V-IN-01～07 | 通過 |
| V-VOC-01、02、03、05、06、07、13 | 通過，錯誤 0 |
| V-VOC-08 academicContext | 通過 350，錯誤 0 |
| V-VOC-09 來源標記 | 錯誤 0、警告 4（conglomerate、sustainable、tricky、niche 改 ORIGINAL，見 §3） |
| V-VOC-10 | 通過 4,044 項，錯誤 0 |
| V-VOC-14 meaning 重複 | 警告 0 |
| V-VOC-15 對照表殘留、領域標記 | 錯誤 0 |
| V-VOC-16 ECDICT 舊式音標字元 | 錯誤 0 |
| V-VOC-17 | 資訊 3 筆（見 §4），警告 0 |
| S-2 骨架欄位未改動 | 通過 350；資訊 4 筆（meaningSource ECDICT → ORIGINAL，允許） |
| H-1 簡體專用字 | 錯誤 0 |
| H-2 音標字元集與英式符號 | 錯誤 0（`aɪə` 依 R5-2 直接寫標準形式：reliance、riot、pioneer，未加滑音 j） |
| H-3 長度上限 | 警告 0 |
| H-4 大寫開頭、句尾標點、含詞形 | 警告 0 |
| H-5 分檔內 example／meaning 重複 | 錯誤 0、警告 0 |
| H-7 平均每筆 bytes | 447.5 bytes（低於 600 警告門檻） |

撰寫時另以 scratchpad 腳本預檢：example 8～20 字、academicContext 8～25 字（O-2、O-3），全數符合。

## 3. `meaningSource = "ORIGINAL"` 清單（M-6、M-7、V-VOC-09）

| wordKey | `_zhtw` 原釋義 | 最終 `meaning` | 原因 |
| :--- | :--- | :--- | :--- |
| conglomerate | a. 聚成球形的, 礫岩性的；n. 整合物（簡體原檔為「集成物」，s2twp 過度轉換）, 混合體, 礫岩；v. (使)凝聚成團 | 企業集團；綜合性大企業 | ECDICT 只有地質／物理義，缺商務核心義「企業集團」；依 M-2 屬新增義項，整段改寫並標原創 |
| sustainable | 足可支撐的, 養得起的, 可以忍受的 | 永續的；可持續的；足以維持的 | ECDICT 缺學術與商務最常用的「永續」義；新增義項，標原創 |
| tricky | 狡猾的, 機敏的 | 棘手的；難處理的；狡猾的 | ECDICT 缺現代最常用的「棘手的」義；新增義項，標原創 |
| niche | 壁龕；放入壁龕, 安頓 | 利基；合適的位置；壁龕 | ECDICT 缺商務核心義「利基（市場）」；新增義項，標原創 |

本區間沒有 `ecdict_subset_missing.txt` 的字。

## 4. 上下文用詞清單（V-VOC-17、M-7、H-6）

| wordKey | 英文詞義 | 簡體原詞（出現位置） | 最終 `meaning` | 處理說明 |
| :--- | :--- | :--- | :--- | :--- |
| horizontal | 水平的；橫的 | 「水平线」「水平面」「水平」 | 水平的；橫的；水平線 | 本字即指水平面（horizontal），依 M-3 保留「水平」 |
| hybrid | 混合物；混合的 | 「主机实用程序」「双重用户建立程序」（`[计]` NetWare 義項） | 混合物；混合的；雜種 | 電腦產品義項非本字常用義，整項刪除；`meaning` 不含「程序」「程式」 |
| protocol | 協議；禮儀 | 「协议列表实用程序」（`[计]`） | 協議；禮儀；草案 | 電腦工具義項刪除；`meaning` 不含「程序」「程式」 |

### 4.1 v0.6 新增比對詞清單（V-VOC-17 補產，R6-6）

依契約 v0.6 V-VOC-17，以腳本比對簡體原檔 `ecdict_subset.csv` 的 `translation` 是否含 M-3 補充表 10 詞（支持、类型、实例、触摸、局部、保存、社区、连接、循环、菜单），列出 `meaningSource = "ECDICT"` 的命中字共 **3 筆**；判斷欄依 architecture.md v0.3 §8.4、§8.5。

| rank | wordKey | 英文詞義 | 簡體原詞（出現位置） | `_zhtw` 轉換結果 | 最終 `meaning` | 判斷 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 4269 | periodic | 定期的；週期的；間歇的 | a.「循环的」 | 迴圈 | 定期的；週期的；間歇的 | 不採用該義項：「循環的」未列入；meaning 不含「迴圈」 |
| 4302 | endorse | 支持；贊同；背書 | vt.「支持」 | 支援 | 支持；贊同；背書 | 保留：已還原為「支持」，英文詞義為公開表態贊成 |
| 4404 | tangible | 有形的；可觸摸的 | a.「可触摸的」 | 觸控 | 有形的；可觸摸的；有形資產 | 保留：已還原為「可觸摸的」，英文詞義為摸得到的（非觸控） |

## 5. 清單外大陸用語與 s2twp 過度轉換修正（M-3、T-2）

| wordKey | 原詞（`_zhtw`） | 簡體原檔 | 改後 `meaning` | 說明 |
| :--- | :--- | :--- | :--- | :--- |
| endorse | 支援, 贊同 | 支持 | 支持；贊同；背書 | s2twp 過度轉換（支持→支援）；endorse 為「支持」義，依原意改回 |
| tangible | 可觸控的 | 可触摸的 | 有形的；可觸摸的；有形資產 | s2twp 過度轉換（触摸→觸控），改回「可觸摸」 |
| interact | 互動作用 | 交互作用 | 互相影響；交互作用 | 依簡體原檔寫回「交互作用」（台灣學術用語亦用此詞） |
| periodic | 迴圈的 | 循环的 | 定期的；週期的；間歇的 | s2twp 過度轉換（循环→迴圈）；該義項刪除不用 |
| macroeconomics | 整體經濟學, 宏觀經濟學 | 同左 | 總體經濟學；整體經濟學 | 「宏觀經濟學」為大陸用語，台灣用「總體經濟學」；刪去「宏觀」，以台灣用法替換（同義、非新增義項） |
| macroeconomic | 整體經濟（n.） | 整体经济 | 整體經濟的；總體經濟的 | 同上補台灣用語「總體」；本字為形容詞，`pos` 依英文詞義判為 `adj.`（M-4「依英文詞義判斷」），釋義加「的」 |
| missile | 導彈, 飛彈 | 导弹, 飞弹 | 飛彈；發射物 | 台灣慣用「飛彈」，刪去「導彈」 |
| empirical | 完全跟據經驗的 | 完全跟据经验的 | 根據經驗的；經驗主義的 | ECDICT 原文錯字「跟據」改為「根據」 |

其他領域標記改寫（T-3）：本批 `[計]`、`[醫]`、`[經]`、`[法]`、`[化]` 標記都沒有保留在 `meaning`；有用到的義項（如 consultancy 的 `[經]` 諮詢業務、globalization／privatization 的 `[計]` 全球化／私有化、amortization 的 `[計]` 分期付款、node 的 `[計]` 節點、algorithm 的 `[計]` 演算法）直接取詞，不加括註。

## 6. 自查抽樣（S-3）

指令：`node src/data/_tools/sample.mjs --file src/data/vocab-4210.js --ratio 0.1 --min 35 --seed 4210`
母體 350，抽出 **35 筆**。檢查項目：釋義是精簡而不是新增（對照 `_zhtw`）、沒有大陸用語、`pos` 和釋義一致、音標是美式而且正確、例句自然而且原創。

| # | rank | wordKey | 結論 | 備註 |
| :--- | :--- | :--- | :--- | :--- |
| 1 | 4216 | accordance | 合格 | |
| 2 | 4226 | charter | 合格 | 「特許」對應 vt. 義項，pos 含 v. |
| 3 | 4268 | tonne | 合格 | 英式拼法字頭，例句用英國情境無礙；讀音同 ton |
| 4 | 4271 | accelerate | 合格 | |
| 5 | 4279 | ultimate | 合格 | 只取 a. 義項，pos 只列 adj. |
| 6 | 4282 | scrap | 合格 | 三詞性各對應一義項 |
| 7 | 4297 | fraction | 合格 | |
| 8 | 4300 | pioneer | 合格 | `/ˌpaɪəˈnɪr/` 標準寫法 |
| 9 | 4321 | capitalist | 合格 | |
| 10 | 4323 | contractual | 合格 | |
| 11 | 4346 | concession | 合格 | |
| 12 | 4357 | horizontal | 合格 | V-VOC-17，見 §4 |
| 13 | 4365 | treasury | 合格 | |
| 14 | 4372 | widen | 合格 | |
| 15 | 4379 | tolerance | 合格 | |
| 16 | 4380 | devise | 合格 | |
| 17 | 4382 | incremental | 合格 | |
| 18 | 4399 | threshold | 合格 | 「閾值」取自 `[計]` 義項 |
| 19 | 4401 | legitimate | 合格 | |
| 20 | 4419 | certainty | 合格 | |
| 21 | 4429 | handful | 合格 | |
| 22 | 4431 | queue | 合格（附註） | queue 偏英式用字（美式多用 line），例句須含本字，情境自然 |
| 23 | 4440 | grid | 合格 | |
| 24 | 4454 | legacy | 合格 | |
| 25 | 4481 | motive | 合格 | 只取 n. 義項 |
| 26 | 4482 | whereby | 合格 | |
| 27 | 4490 | constrain | 合格 | |
| 28 | 4491 | blank | 合格 | |
| 29 | 4501 | macroeconomics | 合格 | 「總體」修正見 §5 |
| 30 | 4507 | scrutiny | 合格 | |
| 31 | 4511 | clever | 合格 | |
| 32 | 4523 | freely | 合格 | |
| 33 | 4533 | nasty | 合格 | |
| 34 | 4551 | riot | 合格 | `/ˈraɪət/` 標準寫法 |
| 35 | 4559 | instant | 合格 | |

**不合格率：0／35 = 0%**（≤ 5%，不需要換種子重抽）。

## 7. 其他

### 7.1 長度超限、例句未含詞形

H-3、H-4 警告 0，沒有需要說明的項目。

### 7.2 釋義取捨與詞性判斷說明（供 QA 對照 V-VOC-18）

| wordKey | 說明 |
| :--- | :--- |
| consultancy | `_zhtw` 一般義項是 consult 的動詞義（商量、會診…），與本字不符，只取 `[經]` 義項「諮詢業務；諮詢服務」 |
| upward | `_zhtw` 的 adv.「以上」不適用，只留 a.「向上的」，pos 只列 adj. |
| semi | `_zhtw` 只有 `[計] 半`、無詞性縮寫；依英文詞義（字首 semi- 表「半」）判為 `adj.`；R6-6 依 M-8 meaning 改為「（字首）半」；R7-3 依契約 v0.7 pos 改為 `["pref."]`（見 §7.3） |
| privatize | `_zhtw`「vt.vi. 私有化」；寫成「使私有化」（vt. 用法），避免與 privatization「私有化」重複（V-VOC-14） |
| mandate | 只取 n. 義項（命令、指令、要求）；vt.「委任統治」不常用，刪除，pos 只列 n. |
| sack | 「解僱」不在 ECDICT，未新增；只取麻布袋與裝袋義 |
| gang | 只取 n. 義項（幫、群、隊），pos 只列 n. |
| suicide、crude、secular、semi | 只取實際使用的詞性義項，pos 依 meaning 精簡 |
| activist、empirical、payback、breakdown | ECDICT 義項較舊（如 activist 只有「激進主義分子」），依 M-2 不新增，原樣精簡；collocation／例句仍用現代常見用法 |

### 7.3 字首字判斷（M-8，R6-6；R7-3 依 v0.7 更新）

依契約 v0.6 M-8 逐一檢查本分檔的字首類單字（掃描範圍：pre、non、anti、mid、sub、ex、multi、inter、semi、super、micro、macro、mini、neo、trans、pro、counter、over、under、post、self、auto、vice、quasi、extra、cross、pan、tech 等，以及 ECDICT 標 `pref.` 或釋義為「表示…」字首說明者）。寫法 (1)：有獨立用法，pos 依獨立用法；字首義若保留，必須是 meaning 最後一段並以「（字首）」開頭，此時 pos 最後加 `"pref."`；寫法 (2)：只有字首義，meaning 以「（字首）」開頭、pos 恰為 `["pref."]`（畫面「pref. 字首」）。（R7-3：依契約 v0.7 M-8 更新；v0.6 以 `["adj."]` 表示字首義的寫法已廢止。）

| rank | wordKey | 寫法 | 最終 `pos` | 最終 `meaning` | 判斷 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 4327 | inter | (1) | `["v."]` | 埋葬 | 獨立的動詞（埋葬）；collocation、例句皆示範動詞用法，字首義不另加；不變 |
| 4514 | semi | (2) | `["pref."]` | （字首）半 | R7-3 依契約 v0.7 M-8 (2) pos 由 `["adj."]` 改 `["pref."]`。R6-6 已修改：ECDICT 只有「[計] 半」，英文無獨立用法；meaning 由「半」改為「（字首）半」，pos 維持 `["adj."]`（R7-3 已改 `["pref."]`） |

### 7.4 同族不同詞性的 meaning 區分（R7-3，CT-23 建議）

CT-23 全庫 V-VOC-14 第 17 組「再投資」：4553 reinvest v.（本分檔）與 5069 reinvestment n.（vocab-4910）釋義相同。動詞改用 ECDICT 的動詞義「再投資於」並補受詞說明，名詞維持「再投資」。

| rank | word | pos | 原 meaning | 新 meaning | meaningSource | 依據 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 4553 | reinvest | `["v."]` | 再投資 | 再投資於；將（獲利）再投入 | ECDICT（不變） | `_zhtw`「vt. 再投資於」；「將（獲利）再投入」為同義的及物說明，對應 collocation reinvest profits，未新增義項（M-2、V-VOC-18） |

## 8. doneWhen 對照

| doneWhen | 結果 |
| :--- | :--- |
| `validate.mjs --file src/data/vocab-4210.js --stage final` 錯誤 0（含 S-2、H-1、H-2、H-5、H-7） | 通過：錯誤 0；警告 4 為 V-VOC-09 ORIGINAL 提醒（§3 已列原因） |
| 恰 350 筆、rank 4210～4559 連續；phonetic、meaning、collocation、academicContext、example 全部非空，pos 至少 1 個 | 通過：350 筆、連續；五個欄位空值 0、pos 空 0 |
| 紀錄含驗證摘要、ORIGINAL 清單、V-VOC-17 清單、清單外大陸用語修正、自查抽樣（種子 4210、≥ 35 筆、不合格率 ≤ 5%） | 通過：§2～§6；抽樣 35 筆、不合格率 0% |
| H-3、H-4、V-VOC-14 警告逐項修正或說明 | 通過：三項警告都是 0 |
| 只寫入本任務 paths；`sources/` 未被修改 | 通過：專案內只寫入 `src/data/vocab-4210.js` 和本檔；分段檔、素材檔、檢查腳本都放 scratchpad |

## 9. 回饋上游

| 編號 | 事項 | 對象 | 建議 |
| :--- | :--- | :--- | :--- |
| CT14-FB-01 | BSL 區段的商務字有不少 ECDICT 義項過舊或缺漏（conglomerate、sustainable、tricky、niche 已依 M-6 改原創；activist、sack「解僱」、breakdown「明細」、capitalize on「利用」等仍缺現代常用義） | SA、主控 | 是否放寬 M-2，允許在 ECDICT 義項之外補 1 個常用義（標 ORIGINAL 並記錄），由 SA 決定；本批未自行擴大 |

## 10. 變更紀錄

| 版本 | 日期 | 作者 | 說明 |
| :--- | :--- | :--- | :--- |
| 0.1 | 2026-10-30 | pg-content-agent | 初版：CT-14 第 12 批 350 筆內容與自查結果 |
| 0.2 | 2026-10-30 | pg-content-agent | R6-6（契約 v0.6 M-3、M-8、V-VOC-07、V-VOC-17）：補 §4.1 v0.6 新增比對詞清單 3 筆與判斷、§7.3 字首字判斷 2 筆；修改資料 4514 semi（以 fill.mjs 寫入）；validate --stage final 錯誤 0、警告 4 |
| 0.3 | 2026-10-30 | pg-content-agent | R7-3（契約 v0.7 M-4、M-8、V-VOC-07）：§7.3 寫法說明更新；修改資料 4514 semi 的 pos 由 `["adj."]` 改 `["pref."]`；依 CT-23 建議區分同族不同詞性的 meaning：4553 reinvest 由「再投資」改「再投資於；將（獲利）再投入」（§7.4）（以 fill.mjs 寫入）；validate --stage final 錯誤 0、警告 4 |
