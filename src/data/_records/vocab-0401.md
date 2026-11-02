---
doc: VOCAB-0401-RECORD
version: 0.4
status: in-review
author: pg-content-agent
approved_by:
approved_at:
---

# CT-04 交付紀錄：字庫內容批次 02（vocab-0401.js，排名 401～800）

## 1. 摘要

| 項目 | 內容 |
| :--- | :--- |
| 任務 | CT-04（`/pg-run`） |
| 涵蓋 | US-06、US-23、AC-06-01、AC-06-02、AC-23-01、AC-23-03、AC-23-04 |
| 依據 | architecture.md v0.2 §8.2～§8.5、契約 v0.5（README §3.2 M-1～M-7、§7.2 V-VOC-01～18）、`_records/CT-01.md`（工具用法） |
| 分檔 | `src/data/vocab-0401.js` |
| 排名區間 | 401～800（400 筆，全部 NGSL） |
| 填寫欄位 | `phonetic`、`pos`、`meaning`、`collocation`、`academicContext`、`example`（400 筆全部非空；`academicContext` 填 290 筆、留空 110 筆） |
| 骨架欄位 | `rank`、`word`、`sources`、`phoneticSource`、`contentSource`、`meaningSource` 皆未改動（S-2 通過） |
| 流程 | `material.mjs` 匯出素材 → 8 個分段檔（每檔 50 筆，scratchpad）→ `fill.mjs` 合併 → `validate.mjs --stage final` → `sample.mjs` 自查 |
| 日期 | 2026-10-30 |
| `sources/` | 只讀；檔案修改時間仍為主控放置時間（wordlists 2026-10-29、ecdict 2026-10-30 09:28～10:06），未複製進 `src/data/` |

### 1.1 撰寫慣例摘要

| 欄位 | 做法 |
| :--- | :--- |
| `phonetic` | 美式 IPA（P-1～P-9），全部原創，未參考 ECDICT 英式標註的寫法；名動詞重音不同者取 `pos` 第一個詞性（research /ˈrisɝtʃ/、project /ˈprɑdʒɛkt/、contract /ˈkɑntrækt/、address /ˈædrɛs/、produce /prəˈdus/） |
| `meaning` | 由 `_zhtw` 的 `translation` 精簡 2～4 個義項，全形「；」分隔；刪除 `[計]` 等領域義項；未新增 ECDICT 沒有的義項 |
| `pos` | 依 M-4，只保留 `meaning` 實際涵蓋的詞性，依常用度排序 |
| `collocation` | 2～3 個多益常見搭配，原創 |
| `example` | 8～20 字職場／多益情境句，原創；檔內無重複 |
| `academicContext` | 論文風格句 8～25 字；功能詞、代名詞與生活字（wait、girl、door、morning、hotel、movie 等 110 筆）留 `""` |

## 2. 驗證結果（S-1、S-2、H-1～H-7）

指令：`node src/data/_tools/validate.mjs --file src/data/vocab-0401.js --stage final`（最後一次執行：exit 0）

| 規則 | 結果 |
| :--- | :--- |
| V-VOC-01～04、06～10、13、15、16 | 全數通過，錯誤 0、警告 0 |
| V-VOC-10 | 錯誤 0、警告 0（無欄位等於 undefined／null，也無獨立單字 null／undefined） |
| V-VOC-14 | 分檔內 meaning 重複 0（全庫跨分檔比對需 `--all`，待其他批次完成後由主控／QA 執行） |
| V-VOC-17 | 資訊 10 筆、警告 0（見 §4） |
| S-2 | 400 筆骨架欄位未改動 |
| H-1 | 簡體專用字 0 |
| H-2 | 音標字元集與英式符號錯誤 0（society 的處理見 §7.1） |
| H-3 | 長度超限 0 |
| H-4 | 0 警告（大寫開頭、句尾標點、collocation／example 含該字或詞形全數通過） |
| H-5 | example 重複 0、meaning 重複 0 |
| H-7 | 壓縮後平均每筆 406.3 bytes（< 600） |
| 總計 | **錯誤 0、警告 0；結果：通過** |

另以 scratchpad 腳本補查 O-2、O-3 字數（驗證器不檢查）：`example` 400 筆皆 8～20 字、非空 `academicContext` 290 筆皆 8～25 字（初稿有 57 句學術句、10 句例句少於 8 字，已全部改寫）。

## 3. `meaningSource = "ORIGINAL"` 清單（M-6、M-7、V-VOC-09）

| wordKey | 原因 |
| :--- | :--- |
| （無） | 本區間無 missing 字；400 筆釋義皆由 `_zhtw` 精簡而來，`meaningSource` 全部維持 `"ECDICT"`。改為 ORIGINAL 的筆數：**0** |

## 4. V-VOC-17 上下文用詞清單（M-3、H-6）

`material.mjs` 列出 10 筆（簡體原檔 `translation` 含 7 個上下文用詞）；全部回查 `ecdict_subset.csv` 判斷原意。

| wordKey | 英文詞義（本卡取用） | 簡體原詞（所在義項） | `_zhtw` 寫法 | 處理 | 最終 `meaning` |
| :--- | :--- | :--- | :--- | :--- | :--- |
| paper | 紙；正式文書；論文 | 「文件」（n. 文件） | 檔案（過度轉換） | paper 指紙本文書，改回「文件」 | 紙；文件；文章；報紙 |
| quality | 品質 | 「质量」（n. 品质, 特性, 才能, 质量） | 質量 | 指 quality 而非 mass，刪去「質量」，保留「品質」 | 品質；特性；才能；優質的 |
| security | 安全；保安；擔保 | 「程序」（[计] 安全检查程序） | 安全檢查程式 | 該義項屬 `[計]` 領域，整項刪除 | 安全；保安；抵押品；保證金 |
| choice | 選擇 | 「文件」（[计] 批处理文件） | 批處理檔案 | `[計]` DOS 命令說明，整項刪除 | 選擇；精選品；選擇權；上等的 |
| source | 來源 | 「程序」（[计] 源程序） | 源程式 | `[計]` 義項刪除 | 來源；根源；原始資料 |
| pause | 暫停 | 「文件」（[计] 批处理文件） | 批處理檔案 | `[計]` DOS 命令說明，整項刪除 | 暫停；中止；停頓 |
| average | 平均；一般程度 | 「水平」（n. 一般水平） | 一般水平 | 指程度、標準，改為「水準」 | 平均；平均數；一般水準；平均的 |
| analysis | 分析 | 「程序」（[计] 分析程序） | 分析程式 | `[計]` 義項刪除 | 分析 |
| statement | 陳述；聲明 | 「程序」（[计] 程序语句） | 程式語句 | `[計]` 義項刪除；另見 §5（声明→宣告） | 陳述；聲明；指令 |
| aim | 目標；瞄準 | 「程序」（[计] 高级信息管理程序） | 高階資訊管理程式 | `[計]` 縮寫說明，整項刪除 | 目標；瞄準；致力；打算 |

### 4.1 v0.6 新增比對詞清單（V-VOC-17 補產，R6-6）

依契約 v0.6 V-VOC-17，以腳本比對簡體原檔 `ecdict_subset.csv` 的 `translation` 是否含 M-3 補充表 10 詞（支持、类型、实例、触摸、局部、保存、社区、连接、循环、菜单），列出 `meaningSource = "ECDICT"` 的命中字共 **8 筆**；判斷欄依 architecture.md v0.3 §8.4、§8.5。

| rank | wordKey | 英文詞義 | 簡體原詞（出現位置） | `_zhtw` 轉換結果 | 最終 `meaning` | 判斷 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 446 | carry | 攜帶；運送；包含 | vt.「支持」 | 支援 | 攜帶；運送；包含 | 不採用該義項：vt.「支持」未列入；meaning 不含「支援」 |
| 465 | community | 社區；公眾；共同體 | n.「社区」 | 社群 | 社區；公眾；共同體 | 保留：已還原為「社區」，英文詞義為地方社會（非網路社群） |
| 469 | join | 參加；加入；連接 | vt.「连接」、n.「连接」、[计]「连接」 | 連線 | 參加；加入；結合 | 不採用該義項：「連接」未列入，以「結合」表達；meaning 不含「連線」 |
| 497 | land | 陸地；登陸 | [计]「连接盘」 | 連線 | 陸地；土地；登陸；到達 | 不採用該義項：「連接盤」為電子用語（[計]），整項刪除；meaning 不含「連線」 |
| 514 | couple | 對；夫婦；連接 | vt.「连接」 | 連線 | 對；夫婦；數個；使成雙 | 不採用該義項：vt.「連接」未列入；meaning 不含「連線」 |
| 519 | round | 圓的；一輪；循環 | n.「循环」 | 迴圈 | 圓的；一輪；一回合；四捨五入 | 不採用該義項：n.「循環」未列入；meaning 不含「迴圈」 |
| 566 | save | 節省；儲蓄；保存；（電腦）存檔 | vt.「保存」、[计]「保存」 | 儲存 | 節省；儲蓄；挽救；保存；（電腦）儲存 | 已修改：原為「節省；儲蓄；挽救；儲存」，改為「節省；儲蓄；挽救；保存；（電腦）儲存」。簡體原檔一般義為「保存」（save food／save it for later），依 M-3 還原；collocation 有 save a file，電腦存檔義另列「（電腦）儲存」，兩者為不同義項 |
| 770 | link | 連結；環；聯合 | vi.「连接起来」、[计]「连接」 | 連線 | 連結；環；聯合 | 不採用該義項：「連接」（[計]）未列入，以「連結」表達；meaning 不含「連線」 |

## 5. 清單外大陸用語與過度轉換修正（M-3、T-2）

| wordKey | 簡體原詞 | `_zhtw` 原詞 | 改後 | 說明 |
| :--- | :--- | :--- | :--- | :--- |
| community | 社区 | 社群 | 社區 | `s2twp` 把「社区」轉成「社群」；community 的主要義項在台灣用「社區」 |
| statement | 声明 | 宣告 | 聲明 | 「聲明」為台灣常用語，回復原義 |
| event | 竞赛项目 | 競賽專案 | 競賽項目 | 「项目」被過度轉換為「專案」；此處指比賽項目 |
| item | 项目 | 專案 | 項目 | 同上；item 指清單上的項目 |
| computer | 计算机（[计]） | 計算機 | 不採用 | 「計算機」在台灣多指計算器；只保留「電腦；電子計算機」 |
| shop | 车间 | 車間 | 不採用 | 大陸用語（工廠作業區），刪除該義項 |
| data | 数据, 资料 | 資料, 資料 | 資料 | `s2twp` 將「数据」轉為「資料」造成重複，合併為一個 |

## 6. 自查抽樣（S-3）

指令：`node src/data/_tools/sample.mjs --file src/data/vocab-0401.js --ratio 0.1 --min 35 --seed 401`（抽樣數 = max(35, ceil(400 × 0.1)) = 40）

檢查項目：釋義是精簡而非新增（對照 `_zhtw`）、無大陸用語、`pos` 與 `meaning` 一致、音標為美式且正確、collocation／example 自然且原創。

### 6.1 第一次：種子 401（40 筆）

抽到的 wordKey：body、easy、full、pass、position、sometimes、forward、main、community、step、teacher、claim、organization、kill、itself、benefit、data、save、attention、check、court、recent、campaign、pause、plant、region、attempt、medium、hit、economy、image、enter、review、holiday、item、analysis、hotel、club、doctor、capital

| wordKey | 結論 | 問題 |
| :--- | :--- | :--- |
| community | 不合格 | `meaning` 用了 `s2twp` 轉換錯誤的「社群」（簡體原詞「社区」），應為「社區」 |
| campaign | 不合格 | `pos` 為 `["n.","v."]`，但 `meaning`（運動；戰役；競選運動）只有名詞義項 |
| club | 不合格 | `pos` 為 `["n.","v."]`，但 `meaning`（俱樂部；球棒；木棍）只有名詞義項 |
| data | 合格（順手修正） | 「資料；數據」的「數據」不在 `_zhtw`，改為「資料」，避免 V-VOC-18 (2) 爭議 |
| 其餘 36 筆 | 合格 | — |

不合格率：**3 / 40 = 7.5%（> 5%）** → 依 S-3 全檔重新檢查後換種子再抽。

### 6.2 全檔重新檢查（400 筆）

逐筆核對 `pos`、`meaning` 與素材，並修正以下各筆：

| 類型 | wordKey | 修正 |
| :--- | :--- | :--- |
| `pos` 多列了 `meaning` 沒有涵蓋的詞性 | war、model、section、bed、size、drug、wall、purpose、campaign、club、unit、card | 改為 `["n."]` |
| 同上 | join、raise、kill、save | 改為 `["v."]` |
| 同上 | easy、strong、wrong、alone、wide | 改為 `["adj."]` |
| 大陸用語／轉換錯誤 | community | 「社群」→「社區」（§5） |
| 釋義不在 `_zhtw` | data | 「資料；數據」→「資料」 |

修正後 `validate.mjs --stage final` 仍為錯誤 0、警告 0。

### 6.3 第二次：種子 402（40 筆）

抽到的 wordKey：body、film、table、cut、himself、difficult、please、difference、charge、enjoy、wish、rest、kid、risk、news、usually、technology、common、patient、street、prepare、laugh、employee、feature、factor、everyone、various、addition、comment、occur、significant、direct、lack、college、mark、achieve、method、interview、release、television

| 結論 | 筆數 |
| :--- | :--- |
| 合格 | 40 |
| 不合格 | 0 |

不合格率：**0 / 40 = 0%（≤ 5%）**。另確認種子 401 的 3 筆不合格已修正（community「社區；公眾；共同體」、campaign `["n."]`、club `["n."]`）。

## 7. 其他說明

### 7.1 society 音標（H-2 誤判）

> **R5-3（2026-10-30）已改回標準美式 IPA**：驗證器 H-2 已由 R5-2 修正，`aɪə` 不再誤判。現值：society → /səˈsaɪəti/。下表「權宜寫法」為歷史紀錄，已不在分檔中。

| 項目 | 內容 |
| :--- | :--- |
| 標準美式 | /səˈsaɪəti/（aɪ + ə 兩個音節） |
| 問題 | H-2 以子字串比對 P-4 黑名單，`aɪə` 內含 `ɪə` 被判為英式雙母音，報錯誤 |
| 暫行處理 | 填 /səˈsaɪɪti/（弱化母音以 ɪ 表示，部分字典採用的寫法），使 H-2 錯誤為 0 |
| 後續 | 列入回饋上游 CT04-FB-01；工具修正後建議改回 /səˈsaɪəti/ |

### 7.2 其他

| 項目 | 說明 |
| :--- | :--- |
| H-3 長度超限 | 0 筆，無需說明 |
| H-4 未含詞形 | 0 筆；用到的不規則形（sold、rose、drawn、died、chosen、taught 等）都在 lemmatized 詞形表中 |
| V-VOC-10 第 (3) 項 | 0 筆含獨立單字 null／undefined |
| TRUE（rank 478） | `word` 依來源字表保留大寫；內容用小寫 true，H-4 不分大小寫，通過 |
| 原創性 | collocation、example、academicContext 全部由本代理撰寫，未參考 ETS 題本、市售書或 ECDICT `definition` 例句 |

### 7.3 字首字判斷（M-8，R6-6；R7-3 依 v0.7 更新）

依契約 v0.6 M-8 逐一檢查本分檔的字首類單字（掃描範圍：pre、non、anti、mid、sub、ex、multi、inter、semi、super、micro、macro、mini、neo、trans、pro、counter、over、under、post、self、auto、vice、quasi、extra、cross、pan、tech 等，以及 ECDICT 標 `pref.` 或釋義為「表示…」字首說明者）。寫法 (1)：有獨立用法，pos 依獨立用法；字首義若保留，必須是 meaning 最後一段並以「（字首）」開頭，此時 pos 最後加 `"pref."`；寫法 (2)：只有字首義，meaning 以「（字首）」開頭、pos 恰為 `["pref."]`（畫面「pref. 字首」）。（R7-3：依契約 v0.7 M-8 更新；v0.6 以 `["adj."]` 表示字首義的寫法已廢止。）

本分檔沒有適用 M-8 的字首類單字。

## 8. doneWhen 對照

| doneWhen | 結果 |
| :--- | :--- |
| `validate.mjs --file src/data/vocab-0401.js --stage final` 錯誤 0（含 S-2、H-1、H-2、H-5、H-7） | 通過：錯誤 0、警告 0（§2） |
| 檔內恰 400 筆、rank 401～800 連續；phonetic、meaning、collocation、example 全部非空，pos 至少 1 個 | 通過：V-VOC-02、V-VOC-07 全數通過 |
| 紀錄含驗證摘要、ORIGINAL 清單（含原因）、V-VOC-17 清單（每筆有最終 meaning）、清單外大陸用語修正、自查抽樣（種子 401、至少 40 筆、不合格率 ≤ 5%） | 完成：§2～§6；種子 401 為 7.5%，全檔重查後以種子 402 再抽為 0%（S-3 程序，兩次結果都已記錄） |
| H-3、H-4、V-VOC-14 警告逐項已修正或在紀錄說明 | 通過：三者警告皆為 0 |
| 只寫入本任務 paths；sources/ 未被修改 | 通過：專案內只寫入 `src/data/vocab-0401.js` 與本檔；分段檔、素材與檢查腳本都放在 scratchpad |

## 9. 回饋上游

| 編號 | 事項 | 對象 | 建議 |
| :--- | :--- | :--- | :--- |
| CT04-FB-01 | H-2 的 P-4 黑名單 `ɪə` 用子字串比對，會把美式 `aɪə`（society、science、quiet、variety、client、diet 等）誤判為英式雙母音 `ɪə`。本批只有 society 受影響，暫填 /səˈsaɪɪti/ | SD、主控（`_tools` 擁有者） | 檢查 `ɪə` 時排除前一字元為 `a`／`e` 的情況（`aɪə`、`eɪə`，例如 `/(?<![ae])ɪə/`）；`ʊə` 同理排除 `oʊə`、`aʊə`。修正後本批 society 改回 /səˈsaɪəti/ |

## 10. 變更紀錄

| 版本 | 日期 | 作者 | 說明 |
| :--- | :--- | :--- | :--- |
| 0.1 | 2026-10-30 | pg-content-agent | 初版：CT-04 400 筆內容、驗證與自查結果 |
| 0.2 | 2026-10-30 | pg-content-agent | R5-3：H-2 誤判修正後，把 §7.1 的權宜音標改回標準美式 IPA（society → /səˈsaɪəti/）；只改 phonetic，validate --stage final 錯誤 0 |
| 0.3 | 2026-10-30 | pg-content-agent | R6-6（契約 v0.6 M-3、M-8、V-VOC-07、V-VOC-17）：補 §4.1 v0.6 新增比對詞清單 8 筆與判斷、§7.3 字首字判斷 0 筆；修改資料 566 save（以 fill.mjs 寫入）；validate --stage final 錯誤 0、警告 0 |
| 0.4 | 2026-10-30 | pg-content-agent | R7-3（契約 v0.7 M-8）：字首字判斷段的寫法說明改為 v0.7（`pref.`）；本分檔字首判斷結果與資料檔皆未修改；validate --stage final 錯誤 0、警告 0 |
