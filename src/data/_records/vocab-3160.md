---
doc: CT-11-RECORD
version: 0.3
status: in-review
author: pg-content-agent
approved_by:
approved_at:
---

# CT-11 交付紀錄：字庫內容第 09 批（vocab-3160.js）

## 1. 摘要

| 項目 | 內容 |
| :--- | :--- |
| 任務 | CT-11 |
| 涵蓋 | US-06、US-23、AC-06-01、AC-06-02、AC-06-08、AC-23-01、AC-23-03、AC-23-04 |
| 分檔 | `src/data/vocab-3160.js` |
| 排名區間 | 3,160～3,509（TSL 區段），350 筆，rank 連續 |
| 依據 | architecture.md v0.2 §8.2～§8.5；契約 v0.5（README §3.2 M-1～M-7、§7.2 V-VOC-01～18）；`_records/CT-01.md` |
| 流程 | `material.mjs` 匯出素材 → 7 個分段檔 `part-01.jsonl`～`part-07.jsonl`（每檔 50 筆，放 scratchpad）→ `fill.mjs` 合併 → `validate.mjs --stage final` → `sample.mjs` 自查 |
| 欄位統計 | phonetic、pos、meaning、collocation、academicContext、example：350／350 非空；pos 空 0 |
| 詞性分布 | n. 221、adj. 83、v. 79、adv. 24、prep. 1（一筆可多詞性） |
| `meaningSource` | ECDICT 345、ORIGINAL 5（依 M-6 改寫，見 §3；本區間無 missing 字） |
| 字數自查 | `example` 全部 8～20 字（O-2）、`academicContext` 全部 8～25 字（O-3）；`academicContext` 分檔內不重複 |
| 日期 | 2026-10-30 |
| `sources/` | 只讀；修改時間仍為主控放置時間（ecdict 2026-10-30 09:28～10:06、wordlists 2026-10-29 15:59） |

## 2. 驗證結果（S-1、S-2、H-1～H-7）

指令：`node src/data/_tools/validate.mjs --file src/data/vocab-3160.js --stage final`
結果：**錯誤 0、警告 6；結果：通過**（exit 0；依最後一次執行的結果）

| 規則 | 結果 |
| :--- | :--- |
| FILE、LOAD | 通過 |
| V-VOC-01、02、03、05、06、07、13 | 通過，錯誤 0 |
| V-VOC-08（rank > 2,809 academicContext 必填） | 通過 350，錯誤 0 |
| V-VOC-09 | 錯誤 0、警告 5：5 筆 `meaningSource = ORIGINAL`（不在 missing 清單），原因見 §3 |
| V-VOC-10 | 通過 4,152 項，錯誤 0、警告 0 |
| V-VOC-14（meaning 重複，只報告） | 警告 0 |
| V-VOC-15 | 通過 700，錯誤 0 |
| V-VOC-16 | 通過 350，錯誤 0 |
| V-VOC-17 | 資訊 8 筆、警告 1 筆（programmer，判斷見 §4） |
| S-2 骨架欄位未改動 | 通過 350（資訊 5：meaningSource ECDICT → ORIGINAL，均列於 §3） |
| H-1 簡體專用字 | 錯誤 0 |
| H-2 音標字元集與英式符號 | 錯誤 0；`aɪə`、`ɔɪə`、`aʊə`、`eɪə` 依 R5-2 直接用標準寫法（loyal /ˈlɔɪəl/、towel /ˈtaʊəl/、payable /ˈpeɪəbəl/、violation /ˌvaɪəˈleɪʃən/），未加滑音 j |
| H-3 長度上限 | 警告 0（無 meaning 超過 30 字） |
| H-4 大寫開頭、句尾標點、含詞形 | 警告 0（collocation、example 全部含該字或 lemmatized 詞形） |
| H-5 分檔內 example／meaning 重複 | 錯誤 0、警告 0 |
| H-7 平均每筆 bytes | 465.9 bytes（低於 600 警告門檻） |

## 3. `meaningSource = "ORIGINAL"` 清單（M-6、M-7、V-VOC-09）

| rank | wordKey | `_zhtw` 原釋義 | 最終 `meaning` | 原因 |
| :--- | :--- | :--- | :--- | :--- |
| 3230 | mandatory | 命令的, 託管的；[經] 受託者, 命令者 | 強制的；義務的；命令的 | ECDICT 缺多益最常用的「強制的、義務的」義項；「託管的」「受託者」不適用。新增義項依 M-6 標原創 |
| 3233 | promotional | 增進的 | 促銷的；宣傳的；增進的 | ECDICT 只有「增進的」，與商務常用義（促銷、宣傳）不符；新增義項依 M-6 標原創 |
| 3328 | disruption | 分裂, 崩潰, 瓦解 | 中斷；干擾；瓦解 | ECDICT 缺「中斷、干擾」（service／supply chain disruption 的核心義）；新增義項依 M-6 標原創 |
| 3397 | tech | 技術學院或學校 | 科技；技術人員；技術學院 | ECDICT 只有「技術學院」，不涵蓋 tech company、tech support 等常用義；新增義項依 M-6 標原創 |
| 3467 | alternatively | 非此即彼 | 或者；另一種方式是；非此即彼 | ECDICT「非此即彼」不足以表達副詞連接用法（「或者、另一種方式是」）；新增義項依 M-6 標原創 |

本區間沒有 `ecdict_subset_missing.txt` 的字。

## 4. 上下文用詞清單（V-VOC-17、M-7、H-6）

| wordKey | 英文詞義 | 簡體原詞（出現位置） | 最終 `meaning` | 處理說明 |
| :--- | :--- | :--- | :--- | :--- |
| enroll | 登記、入學、加入 | 「注册」（vi. 義項） | 登記；使加入；註冊（入學） | 指學校入學註冊，台灣仍用「註冊」（如註冊費、註冊組），保留並加括註；「參軍」義項刪除 |
| librarian | 圖書館員 | 「程序库管理程序」（`[计]` 義項） | 圖書館員；圖書管理員 | 電腦義項非本字常用義，整項刪除；`meaning` 不含「程序」「程式」 |
| portfolio | 作品集、投資組合 | 「文件夹」（`[法]` 義項） | 藝術代表作選輯；有價證券目錄；公文包 | 「文件夾／資料夾」義項刪除；`meaning` 不含「文件」「檔案」 |
| login | 登入 | 「注册(程序)」「用户注册程序」（`[计]`） | （電腦）登入；登記 | 依 M-3「註冊依情境改」：電腦帳號登入的台灣用語為「登入」；「註冊程序」義項刪除；`[計]` 依 T-3 改為括註 |
| programmer | 程式設計師 | 「程序员」「程序设计员」 | 程式設計師 | 指電腦程式，台灣用「程式」正確。**V-VOC-17 警告為預期**（簡體「程序」而 meaning 用「程式」），非過度轉換 |
| documentary | 紀錄片；文件的 | 「文件的」（a. 義項）；「记录片」 | 紀錄片；文件的 | `_zhtw`「檔案的」為 s2twp 過度轉換，依原意（documentary evidence 文書證據）改回「文件的」；「記錄片」改台灣慣用「紀錄片」 |
| documentation | 文件、說明文件 | 「(总称)文件」；`[计]`「文件编制, 文档」 | （總稱）文件；文件編製 | `_zhtw`「檔案」「檔案編制」為過度轉換，依原意（紙本或正式文書）改回「文件」；「編制」改「編製」（製作義） |
| translator | 翻譯者 | 「翻译程序」（`[计]`） | 翻譯者；（電腦）翻譯器 | 「翻譯程式」義項刪除，保留「翻譯器」並依 T-3 加「（電腦）」括註；`meaning` 不含「程序」「程式」 |

### 4.1 v0.6 新增比對詞清單（V-VOC-17 補產，R6-6）

依契約 v0.6 V-VOC-17，以腳本比對簡體原檔 `ecdict_subset.csv` 的 `translation` 是否含 M-3 補充表 10 詞（支持、类型、实例、触摸、局部、保存、社区、连接、循环、菜单），列出 `meaningSource = "ECDICT"` 的命中字共 **4 筆**；判斷欄依 architecture.md v0.3 §8.4、§8.5。

| rank | wordKey | 英文詞義 | 簡體原詞（出現位置） | `_zhtw` 轉換結果 | 最終 `meaning` | 判斷 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 3288 | adjacent | 鄰近的；毗連的 | a.「连接的」 | 連線 | 鄰近的；毗連的；相鄰的 | 不採用該義項：「連接的」未列入，以「毗連的」表達；meaning 不含「連線」 |
| 3415 | locally | 在當地；地方性地 | adv.「局部性地」 | 區域性 | 在當地；地方性地 | 不採用該義項：「局部性地」未列入；meaning 不含「區域性」 |
| 3451 | periodically | 定期；週期地；間歇 | adv.「循环」 | 迴圈 | 定期；週期地；間歇 | 不採用該義項：「循環」未列入；meaning 不含「迴圈」 |
| 3476 | circulation | 流通；循環；發行量 | n.「循环」 | 迴圈 | 流通；循環；發行量 | 保留：已還原為「循環」，英文詞義為血液循環、流通 |

## 5. 清單外大陸用語修正與 s2twp 誤轉（M-3、T-2）

| wordKey | 原詞（`_zhtw`／簡體） | 改後 `meaning` | 說明 |
| :--- | :--- | :--- | :--- |
| packet | `[計]` 分組, 資料分組 | 小包；一批信件；（電腦）資料封包 | 網路 packet 台灣用「封包」，「分組」為大陸用語 |
| projector | `[計]` 投影儀 | 放映機；投影機；計劃人 | 「投影儀」為大陸用語，台灣用「投影機」 |
| brake | 剎車 | 煞車；阻礙 | 台灣慣用「煞車」 |
| clip | 回形針 | 夾子；迴紋針；修剪 | 「回形針」為大陸用語，台灣用「迴紋針」 |
| sauna | 桑拿浴 | 三溫暖 | 「桑拿」為大陸音譯，台灣用「三溫暖」 |
| adhere | 粘著 | 堅持；追隨；黏著 | 台灣標準字為「黏」 |
| culinary | 烹呼叫的（簡體「烹调用的」） | 烹調用的；廚房的 | s2twp 把「调用」誤轉為「呼叫」，依簡體原檔改回 |
| circulation | 迴圈（簡體「循环」） | 流通；循環；發行量 | s2twp 過度轉換（循環→迴圈），改回「循環」 |
| periodically | 迴圈（簡體「循环」） | 定期；週期地；間歇 | 同上；該義項未採用 |
| locally | 區域性性地（簡體「局部性地」） | 在當地；地方性地 | s2twp 過度轉換（局部→區域性），義項未採用 |
| adjacent | 連線的（簡體「连接的」） | 鄰近的；毗連的；相鄰的 | s2twp 過度轉換（連接→連線），義項未採用 |
| fasten | 系（簡體「系」，應為「繫」） | 拴緊；使固定；扣緊 | 簡繁一對多誤轉，義項未採用 |
| firefighter | <美>消防隊員 | 消防隊員 | 角括號標記刪除（V-VOC-10、O-4） |

其他領域標記改寫（T-3）：pie 的 `[計] 餅圖` → 「（電腦）餅圖」。其餘 `[計]`、`[醫]`、`[法]`、`[經]`、`[化]`、`[機]` 標記均未原樣保留；取用其中義項時直接併入（如 comply「遵守」、instruct「指示」、physician 未取 `[醫]`）。

## 6. 自查抽樣（S-3）

指令：`node src/data/_tools/sample.mjs --file src/data/vocab-3160.js --ratio 0.1 --min 35 --seed 3160`
母體 350，抽出 **35 筆**。檢查項目：釋義是精簡而不是新增（對照 `_zhtw`）、沒有大陸用語、`pos` 和釋義一致、音標是美式而且正確、例句與學術句自然且原創。

| # | rank | wordKey | 結論 | 備註 |
| :--- | :--- | :--- | :--- | :--- |
| 1 | 3173 | definite | 合格 | 「確切的」取自 `[法]` 義項 |
| 2 | 3182 | profitable | 合格 | |
| 3 | 3183 | refrigerator | 合格 | |
| 4 | 3194 | trash | 合格 | |
| 5 | 3202 | loyal | 合格 | /ˈlɔɪəl/ 標準寫法 |
| 6 | 3212 | desktop | 合格 | ECDICT 只有「桌面」，未新增 |
| 7 | 3220 | yearly | 合格 | |
| 8 | 3223 | cooperate | 合格 | |
| 9 | 3233 | promotional | 合格 | ORIGINAL，見 §3 |
| 10 | 3238 | temporarily | 合格 | |
| 11 | 3245 | automatic | 合格 | |
| 12 | 3258 | prospective | 合格 | |
| 13 | 3265 | anytime | 合格 | |
| 14 | 3277 | meantime | 合格 | |
| 15 | 3285 | translation | 合格 | 「轉換」取自 `[計]` 義項 |
| 16 | 3288 | adjacent | 合格 | 已刪除誤轉義項「連線的」 |
| 17 | 3297 | rearrange | 合格 | |
| 18 | 3334 | login | 合格（已修） | 初稿為「（電腦）登入；登入程序；登記」，「登入程序」對應簡體「注册程序」（電腦程式義），用「程序」不妥；改為「（電腦）登入；登記」後重新 fill、validate |
| 19 | 3335 | managerial | 合格 | |
| 20 | 3357 | jam | 合格 | |
| 21 | 3364 | takeover | 合格 | |
| 22 | 3367 | verbal | 合格 | |
| 23 | 3372 | accumulate | 合格 | |
| 24 | 3395 | simplify | 合格 | |
| 25 | 3404 | comply | 合格 | 「遵守」取自 `[法]` 義項 |
| 26 | 3408 | economist | 合格 | |
| 27 | 3412 | informative | 合格 | 簡體「消息」，`_zhtw`「訊息」為台灣用法 |
| 28 | 3419 | parade | 合格 | |
| 29 | 3431 | accordingly | 合格 | |
| 30 | 3448 | maximize | 合格 | |
| 31 | 3454 | recruitment | 合格 | 「募集」取自 `[醫]` 義項，「徵召（新兵）」整理自「新兵徵召」 |
| 32 | 3487 | familiarize | 合格 | |
| 33 | 3498 | sauna | 合格 | 「桑拿浴」改台灣用語「三溫暖」，見 §5 |
| 34 | 3507 | acceptance | 合格 | 「驗收」取自 `[經]` 義項 |
| 35 | 3508 | allocate | 合格 | |

不合格 0 筆（login 為抽查時自行修正，修正後合格）；**不合格率 0%**（≤ 5%），不需換種子重抽。

## 7. 其他

### 7.1 長度超限、例句未含詞形

H-3、H-4 警告 0，沒有需要說明的項目。

### 7.2 釋義取捨說明（供 QA 對照 V-VOC-18）

| wordKey | 說明 |
| :--- | :--- |
| conditioner | `_zhtw` 只有「調節器」「整形器」等，沒有「潤髮乳」；依 M-2 不新增，例句用 air conditioner（調節器義） |
| pant | ECDICT 只收動詞「喘息」等義（無「褲子」）；釋義、例句、學術句一律依「喘息」義撰寫 |
| orientation | `_zhtw` 無「新生訓練」；保留「方向；定方位；適應」，搭配詞含 orientation session 供情境參考 |
| boardroom、certification、desktop、decorate | `_zhtw` 只有單一義項（會議室、證明、桌面、裝飾），依 M-2 原樣保留，未新增 |
| unattended | `_zhtw` 無「無人看管的」；取「未被注意的；無人出席的；無伴的」 |
| checkout | `_zhtw` 只有「結帳臺」，未新增「退房」義 |
| surf | 取 `_zhtw`「作衝浪運動」原文，pos 依其動詞義排第一 |
| overhead、escort、duplicate、alternate | 名動詞（或形容詞）讀音不同時依 P-6 取 `pos` 第一個詞性的讀音：overhead /ˈoʊvɚˌhɛd/、escort /ˈɛskɔrt/、duplicate /ˈdupləkət/、alternate /ˈɔltɚnət/ |
| 音標 `g` | 依 P-5 使用 ASCII `g`（garment、glove、generic 等） |

### 7.3 字首字判斷（M-8，R6-6；R7-3 依 v0.7 更新）

依契約 v0.6 M-8 逐一檢查本分檔的字首類單字（掃描範圍：pre、non、anti、mid、sub、ex、multi、inter、semi、super、micro、macro、mini、neo、trans、pro、counter、over、under、post、self、auto、vice、quasi、extra、cross、pan、tech 等，以及 ECDICT 標 `pref.` 或釋義為「表示…」字首說明者）。寫法 (1)：有獨立用法，pos 依獨立用法；字首義若保留，必須是 meaning 最後一段並以「（字首）」開頭，此時 pos 最後加 `"pref."`；寫法 (2)：只有字首義，meaning 以「（字首）」開頭、pos 恰為 `["pref."]`（畫面「pref. 字首」）。（R7-3：依契約 v0.7 M-8 更新；v0.6 以 `["adj."]` 表示字首義的寫法已廢止。）

| rank | wordKey | 寫法 | 最終 `pos` | 最終 `meaning` | 判斷 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 3170 | auto | (1) | `["n."]` | 汽車 | ECDICT 有 n.「汽車」與 pref.；pos 依獨立用法 n.，字首義未列入（collocation 皆為 auto 汽車義）；不變 |
| 3397 | tech | (1) | `["n."]` | 科技；技術人員；技術學院 | 獨立的名詞；不變 |

### 7.4 同族不同詞性的 meaning 區分（R7-3，CT-23 建議）

CT-23 全庫 V-VOC-14 第 9 組（2301 apologize v.／3243 apology n.「道歉；辯解」）、第 11 組（2606 cooperation n.／3223 cooperate v.「合作；協力；配合」）為同族不同詞性。本分檔各改一筆，另一筆（vocab-2001 apologize、vocab-2401 cooperation）不變。

| rank | word | pos | 原 meaning | 新 meaning | meaningSource | 依據 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 3223 | cooperate | `["v."]` | 合作；協力；配合 | 與…合作；協力；配合 | ECDICT（不變） | `_zhtw`「vi. 合作, 協力, 配合」；加「與…」標示不及物動詞搭配 with（對應 collocation cooperate with），義項不變 |
| 3243 | apology | `["n."]` | 道歉；辯解 | 道歉；謝罪；辯護 | ECDICT（不變） | `_zhtw`「n. 道歉, 辯護；[法] 道歉, 謝罪, 辯解者」；改用名詞義項「謝罪」「辯護」（a formal written defense），與動詞 apologize「道歉；辯解」區分 |

## 8. doneWhen 對照

| doneWhen | 結果 |
| :--- | :--- |
| `validate.mjs --file src/data/vocab-3160.js --stage final` 錯誤 0（含 S-2、H-1、H-2、H-5、H-7） | 通過：錯誤 0、警告 6（V-VOC-09 × 5 見 §3；V-VOC-17 × 1 見 §4） |
| 恰 350 筆、rank 3160～3509 連續；phonetic、meaning、collocation、academicContext、example 全部非空，pos 至少 1 個 | 通過：350 筆、連續；五個欄位空值 0、pos 空 0 |
| 紀錄含驗證摘要、ORIGINAL 清單、V-VOC-17 清單、清單外大陸用語修正、自查抽樣（種子 3160、≥ 35 筆、不合格率 ≤ 5%） | 通過：§2～§6；抽樣 35 筆、不合格率 0% |
| H-3、H-4、V-VOC-14 警告逐項修正或說明 | 通過：三項警告都是 0 |
| 只寫入本任務 paths；`sources/` 未被修改 | 通過：專案內只寫入 `src/data/vocab-3160.js` 和本檔；素材、分段檔、檢查腳本都放 scratchpad |

## 9. 回饋上游

| 編號 | 事項 | 對象 | 建議 |
| :--- | :--- | :--- | :--- |
| CT11-FB-01 | V-VOC-17 對 programmer 這類「簡體程序員 → 程式設計師」的正確用法仍會發警告，每批都需在紀錄說明 | SD、主控（CT-01 補修，非必要） | 可考慮對 wordKey 本身就是 program／programmer／programming 的字略過此警告；不影響本批交付 |

## 10. 變更紀錄

| 版本 | 日期 | 作者 | 說明 |
| :--- | :--- | :--- | :--- |
| 0.1 | 2026-10-30 | pg-content-agent | 初版：CT-11 第 09 批 350 筆內容與自查結果 |
| 0.2 | 2026-10-30 | pg-content-agent | R6-6（契約 v0.6 M-3、M-8、V-VOC-07、V-VOC-17）：補 §4.1 v0.6 新增比對詞清單 4 筆與判斷、§7.3 字首字判斷 2 筆；資料檔未修改；validate --stage final 錯誤 0、警告 6 |
| 0.3 | 2026-10-30 | pg-content-agent | R7-3（契約 v0.7 M-8）：§7.3 寫法說明更新（本分檔字首判斷結果不變）；依 CT-23 建議區分同族不同詞性的 meaning：3223 cooperate 由「合作；協力；配合」改「與…合作；協力；配合」、3243 apology 由「道歉；辯解」改「道歉；謝罪；辯護」（§7.4）（以 fill.mjs 寫入）；validate --stage final 錯誤 0、警告 6 |
