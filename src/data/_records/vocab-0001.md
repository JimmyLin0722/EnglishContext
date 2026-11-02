---
doc: VOCAB-0001-RECORD
version: 0.3
status: in-review
author: pg-content-agent
approved_by:
approved_at:
---

# CT-03 交付紀錄：字庫內容批次 01（vocab-0001.js，排名 1～400）

## 1. 摘要

| 項目 | 內容 |
| :--- | :--- |
| 任務 | CT-03 |
| 涵蓋 | US-03、US-06、US-23、AC-03-09、AC-06-01、AC-06-02、AC-23-01、AC-23-03、AC-23-04 |
| 分檔 | `src/data/vocab-0001.js` |
| 排名區間 | 1～400（NGSL，含全部高頻功能詞） |
| 筆數 | 400（rank 1～400 連續） |
| 依據 | 契約 v0.5（README §3.2 M-1～M-7、§7.2 V-VOC-01～18）、architecture.md v0.2 §8.2～§8.5、`_records/CT-01.md`（工具用法） |
| 日期 | 2026-10-30 |
| 流程 | `material.mjs` 匯出素材 → 8 個分段檔（每檔 50 筆，scratchpad）→ `fill.mjs` 合併 → `validate.mjs --stage final` → `sample.mjs --ratio 0.1 --min 35 --seed 1` |
| 欄位統計 | `phonetic`、`pos`、`meaning`、`collocation`、`example` 400／400 非空；`academicContext` 非空 88 筆（功能詞與生活字留 `""`，排名 ≤ 2,809 選填） |
| 骨架欄位 | `rank`、`word`、`sources`、`phoneticSource`、`contentSource` 未改動；`meaningSource` 全部維持 `ECDICT` |
| `sources/` | 只讀；未寫入、未複製進 `src/data/` |

## 2. 驗證結果（S-1、S-2、H-1～H-7）

指令：`node src/data/_tools/validate.mjs --file src/data/vocab-0001.js --stage final`（最後一次執行：錯誤 0、警告 1，exit 0）

| 規則 | 結果 |
| :--- | :--- |
| V-IN-01～07 | 通過（N_B 2,809、N_G 5,620 與契約一致） |
| V-VOC-01～04、06～10、13、15、16 | 全數通過，錯誤 0 |
| V-VOC-10 | 錯誤 0；第 (3) 項獨立單字 `null`／`undefined` 警告 0 |
| V-VOC-14 | `meaning` 重複 0 |
| V-VOC-17 | 資訊 14 筆（見 §4）；警告 1 筆：rank 240 program，說明見 §4 |
| S-2 | 通過 400／錯誤 0 |
| H-1 | 簡體專用字 0 |
| H-2 | 音標字元集與英式符號錯誤 0 |
| H-3 | 長度超限 0 |
| H-4 | 警告 0（初次執行 1 筆：rank 377 win 例句只用 `won`，詞形表無此形；已改寫為含 `win` 的例句） |
| H-5 | `example` 重複 0、`meaning` 重複 0 |
| H-7 | 平均每筆約 366 bytes（< 600） |

### 2.1 10 個指定功能詞（AC-03-09）

| word | rank | phonetic（P-7 弱讀） | pos | meaning | collocation（句型提示） |
| :--- | :--- | :--- | :--- | :--- | :--- |
| the | 1 | /ðə/ | art. | （定冠詞）那 | the + 名詞：the company policy；the next meeting |
| and | 3 | /ənd/ | conj. | 和；與 | A and B：research and development；terms and conditions |
| of | 4 | /əv/ | prep. | 的；屬於 | 名詞 + of + 名詞：the head of sales；a copy of the invoice |
| to | 5 | /tə/ | prep. | 到；向；趨於 | to + 地點：go to the office；to + 動詞：plan to hire |
| a | 6 | /ə/ | art. | （不定冠詞）一個 | a + 單數名詞：a job offer；a business trip |
| in | 7 | /ɪn/ | prep., adv. | 在…之內；在…期間；進入 | in + 地點／時間：in the office；in March；in charge of |
| it | 9 | /ɪt/ | pron. | 它 | it + 動詞：it takes time；it is important to |
| he | 11 | /hi/ | pron. | 他 | he + 動詞：he is in charge of；he reports to |
| will | 28 | /wɪl/ | aux., n. | 將；願意；意志；遺囑 | will + 動詞：will be held；will be delivered |
| can | 38 | /kən/ | aux., n. | 能；可以；罐頭 | can + 動詞：can be reached at；can help |

`example` 全部非空；`academicContext` 依 O-3 留 `""`。其他功能詞同樣採 P-7 弱讀：for /fɚ/、as /əz/、at /ət/、but /bət/、from /frəm/、or /ɚ/、than /ðən/、per /pɚ/、would /wʊd/、could /kʊd/、should /ʃʊd/。

## 3. `meaningSource = "ORIGINAL"` 清單（M-6、M-7、V-VOC-09）

| wordKey | 原因 |
| :--- | :--- |
| （無） | 本區間無 missing 字；所有釋義都由 `_zhtw` `translation` 精簡（刪減、合併、調整順序與標點），未整段改寫 |

改成 ORIGINAL 的筆數：**0**。

## 4. V-VOC-17 上下文用詞清單（M-3、H-6）

`material.mjs` 列出 14 筆，每筆都已有最終 `meaning`：

| wordKey | 英文詞義（本卡取用） | 簡體原詞（出現位置） | `_zhtw` 寫法 | 最終 `meaning` | 處理 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| get | 得到、到達 | 文件（[计] 获取文件） | 獲取檔案 | 得到；獲得；到達；變得 | 電腦義項刪除 |
| find | 發現、找到 | 文件（DOS 命令說明） | 檔案 | 發現；找到；認為 | 電腦義項刪除 |
| call | 呼叫、打電話 | 文件（批处理文件） | 檔案 | 呼叫；打電話；召集；訪問 | 電腦義項刪除 |
| help | 幫助 | 程序、文件（帮助程序、电子文件） | 程式、檔案 | 幫助；幫忙；有用；幫助者 | 電腦義項刪除 |
| put | 放、表達 | 文件（发送文件） | 傳送檔案 | 放；擺；寫上；表達 | 電腦義項刪除 |
| include | 包括 | 文件（CONFIG.SYS 文件） | 檔案 | 包括；把…算入 | 電腦義項刪除 |
| move | 移動、搬家 | 文件（移动文件） | 檔案 | 移動；搬家；感動；步驟 | 電腦義項刪除 |
| name | 名字、命名 | 文件（文件名） | 檔名 | 名字；名稱；名譽；命名；任命 | 電腦義項刪除 |
| plan | 計劃、平面圖 | 程序（程序表） | 程式表 | 計劃；方案；策略；平面圖 | 「程式表」為過度轉換，義項刪除 |
| program | 節目、計劃、電腦程式 | 程序（节目单, 程序…[计] 程序） | 程式 | 節目；計劃；（電腦）程式；規劃 | 見下方說明 |
| level | 水準、級別 | 水平（水平, 水准） | 水平 | 水準；級別；平坦的；弄平 | 指程度的「水平」改「水準」 |
| process | 過程、程序 | 程序（n. 程序, 进行, 过程） | 程式 | 過程；程序；加工；處理 | s2twp 過度轉換，還原為「程序」 |
| share | 分享、份額 | 文件（文件共享） | 檔案 | 分享；分擔；份額；參股 | 電腦義項刪除 |
| type | 類型、打字 | 文件（显示指定文件） | 檔案 | 類型；樣式；典型；打字 | 電腦義項刪除；另見 §5「型別」 |

**rank 240 program 的 V-VOC-17 警告**：簡體原檔的「程序」在 program 一字指「電腦程式」（`[计] 程序`），台灣用法正是「程式」，不是過度轉換；`meaning` 以括註「（電腦）程式」標明義項，與「節目；計劃」區分。驗證器規則是只要簡體有「程序」且 meaning 有「程式」就警告，無法分辨詞義，所以這筆警告保留並在此說明。

### 4.1 v0.6 新增比對詞清單（V-VOC-17 補產，R6-6）

依契約 v0.6 V-VOC-17，以腳本比對簡體原檔 `ecdict_subset.csv` 的 `translation` 是否含 M-3 補充表 10 詞（支持、类型、实例、触摸、局部、保存、社区、连接、循环、菜单），列出 `meaningSource = "ECDICT"` 的命中字共 **18 筆**；判斷欄依 architecture.md v0.3 §8.4、§8.5。

| rank | wordKey | 英文詞義 | 簡體原詞（出現位置） | `_zhtw` 轉換結果 | 最終 `meaning` | 判斷 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 77 | give | 給；授予；發表（give way 屈服） | vi.「支持不住」 | 支援 | 給；授予；發表 | 不採用該義項：「支持不住」（give way）未列入 meaning；meaning 不含「支援」「支持」，符合 M-3 |
| 94 | back | 向後；背部；支持（back a plan） | vt.「支持」 | 支援 | 向後；背部；後面的 | 不採用該義項：「支持」（vt.）未列入 meaning；meaning 不含「支援」 |
| 101 | last | 最後的；持續；維持 | vi.「支持」 | 支援 | 最後的；最近的；持續 | 不採用該義項：vi.「支持」（撐得住）未列入，以「持續」表達；meaning 不含「支援」 |
| 117 | feel | 感覺；觸摸 | vt.「触摸」、n.「触摸」 | 觸控 | 感覺；覺得；以為 | 不採用該義項：「觸摸」未列入 meaning（以感覺義為主）；meaning 不含「觸控」 |
| 130 | part | 部分；零件；角色 | n.「局部」、a.「局部的」 | 區域性 | 部分；零件；角色；分開 | 不採用該義項：「局部」與「部分」同義，只列「部分」；meaning 不含「區域性」 |
| 177 | keep | 保持；保存；遵守；經營 | vt.「保存」 | 儲存 | 保持；遵守；維持；經營 | 不採用該義項：「保存」未列入，以「保持；維持」表達；meaning 不含「儲存」 |
| 198 | hand | 手；協助；交給 | vt.「支持」 | 支援 | 手；人手；協助；交給 | 不採用該義項：vt.「支持、攙扶」未列入；meaning 不含「支援」 |
| 208 | friend | 朋友；支持者 | n.「支持者」 | 支援 | 朋友；支持者；贊助者 | 保留：`_zhtw` 本即「支持者」（未被轉換），英文詞義為擁護者，台灣用法正確 |
| 222 | hold | 握住；持有；保存 | vt.「保存」、vi.「支持」 | 支援、儲存 | 握住；持有；佔據；掌握 | 不採用該義項：「保存」「支持」皆未列入；meaning 不含「儲存」「支援」 |
| 226 | second | 第二的；助手；附議（second a motion） | n.「支持者」、vt.「支持」 | 支援 | 第二的；其次的；秒；助手；支持 | 保留：已還原為「支持」，英文詞義為附議、贊成（非技術支援） |
| 235 | example | 例子；實例 | n.「实例」、[化]「实例」 | 例項 | 例子；樣本；實例 | 保留：已還原為「實例」，`_zhtw`「例項」非台灣用語（V-VOC-15） |
| 257 | form | 表格；形式；形狀 | n.「类型」 | 型別 | 表格；形式；形狀；形成 | 不採用該義項：「類型」未列入 meaning；meaning 不含「型別」 |
| 272 | support | 支持；支撐；援助 | n.「支持」、vt.「支持」、[计]「支持」 | 支援 | 支持；支撐；援助；供養 | 保留：已還原為「支持」，英文詞義為擁護、扶持；技術支援義未列入 |
| 276 | side | 旁邊；方面；站在…一邊 | vt.「支持」、vi.「支持」 | 支援 | 旁邊；側；方面；次要的 | 不採用該義項：v.「支持」未列入；meaning 不含「支援」 |
| 300 | local | 當地的；地方性的 | a.「局部的」、n.「局部」、[计]「局部」 | 區域性 | 當地的；地方性的；本地的；當地居民 | 不採用該義項：「局部的」未列入（以當地義為主）；meaning 不含「區域性」 |
| 345 | stay | 停留；逗留；支撐 | vt.「支持」 | 支援 | 停留；逗留；暫停 | 不採用該義項：vt.「支持、支撐」未列入；meaning 不含「支援」 |
| 353 | share | 分享；分擔；份額 | 「文件锁定及检测磁盘更动和对超过32MB硬盘分区的支持」 | 支援 | 分享；分擔；份額；參股 | 不採用該義項：「支持」僅出現在 DOS 命令說明（[計]），整項刪除；meaning 不含「支援」 |
| 389 | type | 類型；樣式；打字 | n.「类型」、vt.「测定类型」、[计]「类型」 | 型別 | 類型；樣式；典型；打字 | 保留：已還原為「類型」，英文詞義為一般種類（非程式資料型別） |

## 5. 清單外大陸用語與過度轉換修正（M-3、T-2）

| wordKey | `_zhtw` 原詞 | 改後 | 說明 |
| :--- | :--- | :--- | :--- |
| support | 支援 | 支持 | 簡體「支持」被 s2twp 轉成「支援」；support 的支持義在台灣用「支持」 |
| second | 支援（vt.） | 支持 | 同上（second a motion＝附議、支持） |
| type | 型別 | 類型 | 簡體「类型」被轉成程式術語「型別」；一般義用「類型」 |
| example | 例項 | 實例 | 簡體「实例」被轉成「例項」 |
| seem | 象是 | 像是 | 「象」為大陸用字，台灣用「像」 |
| as | 做為 | 作為 | 台灣標準寫法 |
| order | 定購 | 訂購 | 台灣用「訂購」 |
| report | 報道 | 報導 | 台灣慣用「報導」 |
| week | 周 | 週 | 台灣用「週」 |
| feel | 觸控 | （刪除） | 簡體「触摸」被轉成「觸控」，不取用 |
| part、local | 區域性 | （不取用） | 簡體「局部」被轉成「區域性」，不取用此義項 |
| hold | 儲存 | （不取用） | 簡體「保存」被轉成「儲存」，不取用 |
| back | 支援 | （不取用） | 同 support，不取用 |

## 6. 自查抽樣（S-3）

指令：`node src/data/_tools/sample.mjs --file src/data/vocab-0001.js --ratio 0.1 --min 35 --seed 1`，母體 400，抽出 **40 筆**。

檢查項目：釋義是否由 `_zhtw` 精簡（沒有新增義項）、是否有大陸用語、`pos` 與釋義是否一致、音標是否為美式且正確、例句是否自然且原創。

| rank | wordKey | 結論 | rank | wordKey | 結論 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 3 | and | 合格 | 185 | set | 合格 |
| 20 | I | 合格 | 188 | follow | 合格 |
| 22 | as | 合格（做為→作為，§5） | 200 | move | 合格（V-VOC-17） |
| 39 | which | 合格 | 202 | fact | 合格 |
| 43 | get | 合格（V-VOC-17） | 204 | area | 合格 |
| 66 | could | 合格 | 212 | without | 合格 |
| 75 | look | 合格 | 232 | plan | 合格（V-VOC-17） |
| 94 | back | 合格 | 246 | today | 合格 |
| 103 | tell | 合格 | 248 | student | 合格 |
| 104 | really | 合格 | 251 | idea | 合格 |
| 110 | show | 合格 | 273 | whether | 合格 |
| 117 | feel | 合格 | 291 | actually | 合格 |
| 124 | great | 合格 | 298 | hard | **不合格 → 已修正**：原例句用 hard copy，詞義不在 meaning（困難的；堅硬的；努力地；辛苦地）中；改寫為 "Our team worked hard to finish the annual report on time." |
| 129 | own | 合格 | 311 | yet | 合格 |
| 137 | talk | 合格 | 312 | rate | 合格 |
| 156 | world | 合格 | 316 | sort | 合格 |
| 169 | woman | 合格 | 325 | soon | 合格 |
| 170 | around | 合格 | 388 | along | 合格 |
| 175 | again | 合格 | 393 | game | 合格 |
| | | | 398 | sale | 合格 |
| | | | 399 | policy | 合格 |

不合格 1／40 = **2.5%**（≤ 5%，不需換種子重抽）。修正後已重新執行 `fill.mjs`、`validate.mjs`（錯誤 0）。

## 7. 其他說明

| 項目 | 說明 |
| :--- | :--- |
| H-3 長度超限 | 無 |
| H-4 例句未含詞形 | 無（rank 377 win 已改寫） |
| P-6 一字一音 | can 取 aux. 弱讀 /kən/（n.「罐頭」讀 /kæn/ 未另標）；live 取 v. /lɪv/；lead 取 v. /lid/；present 取 adj. /ˈprɛzənt/；record 取 n. /ˈrɛkɚd/；use 取 v. /juz/；close 取 v. /kloʊz/；minute 取 n. /ˈmɪnɪt/ |
| or 的音標 | 依 P-7 取一般語流弱讀 /ɚ/ |
| 原創性 | `collocation`、`example`、`academicContext` 全部自行撰寫，未取用 ECDICT `definition` 例句、ETS 題本或市售教材 |

### 7.1 字首字判斷（M-8，R6-6；R7-4 依 v0.7 更新說明）

依契約 v0.7 M-8 逐一檢查本分檔的字首類單字（掃描範圍：pre、non、anti、mid、sub、ex、multi、inter、semi、super、micro、macro、mini、neo、trans、pro、counter、over、under、post、self、auto、vice、quasi、extra、cross、pan、tech 等，以及 ECDICT 標 `pref.` 或釋義為「表示…」字首說明者）。寫法 (1)：有獨立用法，pos 先依獨立用法照 M-4 填寫；字首義若保留，必須是 meaning 的最後一段並以「（字首）」開頭，此時 pos 最後加上 `"pref."`；不保留字首義時 pos 不含 `"pref."`。寫法 (2)：只有字首義，meaning 以「（字首）」開頭且只含字首義，pos 恰為 `["pref."]`（畫面「pref. 字首」）。v0.6 以 `["adj."]` 表示字首義的寫法已廢止（M-8 (3)）。本表 2 筆皆為寫法 (1) 且未保留字首義，pos 不含 `"pref."`，資料不受 v0.7 影響。

| rank | wordKey | 寫法 | 最終 `pos` | 最終 `meaning` | 判斷 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 82 | over | (1) | `["prep.","adv."]` | 在…之上；越過；結束 | 獨立的介系詞、副詞；over- 字首（overtime）義已由「越過」涵蓋，不另加字首義；不變 |
| 193 | under | (1) | `["prep.","adv.","adj."]` | 在…之下；低於；從屬的 | 獨立的介系詞、副詞、形容詞；不變 |

## 8. doneWhen 對照

| doneWhen | 結果 |
| :--- | :--- |
| `validate.mjs --file src/data/vocab-0001.js --stage final` 錯誤 0（含 S-2、H-1、H-2、H-5、H-7） | 通過：錯誤 0、警告 1（V-VOC-17 program，§4 說明） |
| 恰 400 筆、rank 1～400 連續；phonetic、meaning、collocation、example 全部非空，pos 至少 1 個 | 通過 |
| 10 個指定功能詞 5 個欄位皆非空 | 通過（§2.1） |
| 紀錄含驗證摘要、ORIGINAL 清單、V-VOC-17 清單、清單外用語修正、自查抽樣（種子 1、≥ 40 筆、不合格率 ≤ 5%） | 通過（§2～§6；40 筆、2.5%） |
| H-3、H-4、V-VOC-14 警告逐項修正或說明 | 通過：H-3 0、H-4 0（已修正 1）、V-VOC-14 0 |
| 只寫入本任務 paths；`sources/` 未被修改 | 通過：專案內只寫入 `vocab-0001.js` 與本檔；分段檔、素材在 scratchpad；`sources/` 無任何檔案晚於 CT-01 紀錄的修改時間 |

## 9. 回饋上游

| 編號 | 事項 | 對象 | 建議 |
| :--- | :--- | :--- | :--- |
| CT03-FB-01 | V-VOC-17 自動警告「簡體『程序』＋meaning『程式』」無法分辨詞義；program（電腦程式）這類字的正確台灣用法就是「程式」，警告無法消除 | SD（CT-01 驗證器） | 允許在紀錄說明後視為已處理，或在驗證器加入詞義白名單（如 program） |
| CT03-FB-02 | s2twp 的過度轉換不只 M-3 表列的「程序／文件」：本批另見「支持→支援」「类型→型別」「实例→例項」「触摸→觸控」「局部→區域性」「保存→儲存」，會影響所有批次 | SA | 可考慮把這些補進 M-3 表的「過度轉換」說明，讓平行批次處理一致 |

## 10. 變更紀錄

| 版本 | 日期 | 作者 | 說明 |
| :--- | :--- | :--- | :--- |
| 0.1 | 2026-10-30 | pg-content-agent | 初版：CT-03 批次 01 填寫、驗證、自查結果 |
| 0.2 | 2026-10-30 | pg-content-agent | R6-6（契約 v0.6 M-3、M-8、V-VOC-07、V-VOC-17）：補 §4.1 v0.6 新增比對詞清單 18 筆與判斷、§7.1 字首字判斷 2 筆；資料檔未修改；validate --stage final 錯誤 0、警告 1 |
| 0.3 | 2026-10-30 | pg-content-agent | R7-4（契約 v0.7 M-8）：§7.1 字首字判斷的寫法說明由 v0.6 的 `["adj."]` 改為 v0.7 的 `"pref."` 寫法；本分檔字首字皆為寫法 (1) 未保留字首義，資料不受影響；資料檔未修改 |
