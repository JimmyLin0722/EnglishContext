---
doc: CT-06-RECORD
version: 0.4
status: in-review
author: pg-content-agent
approved_by:
approved_at:
---

# CT-06 交付紀錄：字庫內容批次 04（vocab-1201.js）

## 1. 摘要

| 項目 | 內容 |
| :--- | :--- |
| 任務 | CT-06 |
| 涵蓋 | US-06、US-23、AC-06-01、AC-06-02、AC-23-01、AC-23-03、AC-23-04 |
| 分檔 | `src/data/vocab-1201.js` |
| 排名區間 | 1,201～1,600（rank 連續，NGSL） |
| 筆數 | 400（phonetic、pos、meaning、collocation、example 全部非空；academicContext 填寫 306 筆、留空 94 筆） |
| 依據 | 契約 v0.5（README §3.2 M-1～M-7、§7.2 V-VOC-01～18）、architecture.md v0.2 §8.2～§8.5、`_records/CT-01.md` |
| 流程 | `material.mjs` 匯出素材 → 每段 50 筆共 8 個 `part-NN.jsonl`（scratchpad）→ `fill.mjs` 合併 → `validate.mjs --stage final` → `sample.mjs` 自查 |
| 日期 | 2026-10-30 |
| `sources/` | 只讀；修改時間仍為主控放置時間（wordlists 2026-10-29 15:59、ecdict 2026-10-30 09:28～10:06） |

## 2. 驗證結果（S-1、S-2、H-1～H-7）

指令：`node src/data/_tools/validate.mjs --file src/data/vocab-1201.js --stage final`（最後一次執行）

| 項目 | 結果 |
| :--- | :--- |
| 總計 | **錯誤 0、警告 0，結果：通過** |
| V-VOC-01～10、13、15、16 | 全部通過（V-VOC-10 依 v0.5 改寫版：等於 null／undefined 0 筆、角括號 0 筆、獨立單字 null／undefined 0 筆） |
| V-VOC-14（meaning 重複，只報告） | 0 筆 |
| V-VOC-17 | 資訊 13 筆，警告 0 筆（見 §4） |
| S-2 骨架欄位 | 400 筆通過 |
| H-1 簡體專用字 | 0 筆 |
| H-2 音標字元集與英式符號 | 0 筆（3 筆因驗證器誤判改寫，見 §7.1） |
| H-3 長度上限 | 0 筆超限 |
| H-4 大寫開頭、句尾標點、含詞形 | 0 筆警告 |
| H-5 分檔內 example／meaning 重複 | 0 筆 |
| H-7 平均每筆 bytes | 419.0 bytes（< 600） |

## 3. `meaningSource = "ORIGINAL"` 清單（M-6、M-7、V-VOC-09）

| wordKey | 原因 |
| :--- | :--- |
| （無） | 本區間無 missing 字；400 筆釋義皆由 `_zhtw` translation 精簡而來，未整段改寫，全部維持 `"ECDICT"` |

## 4. 上下文用詞清單（V-VOC-17、M-3、H-6）

| rank | wordKey | 英文詞義（本卡採用） | 簡體原詞 | 處理 | 最終 `meaning` |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1212 | map | 地圖；繪製地圖 | 程序（[计] 实用程序） | 電腦義項未採用 | 地圖；繪製地圖；計劃 |
| 1236 | mass | 大量；群眾；物理質量 | 质量 | 物理義保留「質量」並括註 | 大量；群眾；大規模的；質量（物理） |
| 1295 | path | 路徑；途徑 | 程序（DOS 讀取程序的路徑） | 電腦義項未採用 | 路徑；小路；途徑 |
| 1319 | package | 包裹；套裝軟體；整套 | 程序（程序包） | 「程式包」未採用 | 包裹；套裝軟體；包裝；整套的 |
| 1321 | expand | 擴張；發展 | 文件（压缩文件） | 電腦義項未採用 | 擴張；發展；詳述 |
| 1375 | sum | 金額；總數 | 程序（系统实用程序） | 電腦義項未採用 | 金額；總數；概括 |
| 1377 | monitor | 監視；監督；監視器 | 程序（监视程序） | 「監視程式」未採用 | 監視；監督；監視器 |
| 1410 | route | 路線；按路線傳送 | 程序（路由设定程序） | 電腦義項未採用 | 路線；途徑；按規定路線傳送 |
| 1455 | load | 負荷；工作量；裝載 | 程序（装入程序） | 電腦義項未採用 | 負荷；工作量；裝載 |
| 1500 | register | 登記；註冊 | 注册 | 活動、研討會用「登記」；公司、帳號用「註冊」，兩者並列 | 登記；註冊；登記簿；掛號 |
| 1525 | device | 裝置；設計；策略 | 程序（设备驱动程序） | 電腦義項未採用 | 裝置；設計；策略 |
| 1539 | resident | 居民；居住者 | 程序（常驻程序） | 「常駐程式」未採用 | 居民；居住者；定居的 |
| 1558 | session | 會議；期間；學期 | 程序（通用任务程序） | 電腦義項未採用 | 會議；期間；開庭期；學期 |

### 4.1 v0.6 新增比對詞清單（V-VOC-17 補產，R6-6）

依契約 v0.6 V-VOC-17，以腳本比對簡體原檔 `ecdict_subset.csv` 的 `translation` 是否含 M-3 補充表 10 詞（支持、类型、实例、触摸、局部、保存、社区、连接、循环、菜单），列出 `meaningSource = "ECDICT"` 的命中字共 **3 筆**；判斷欄依 architecture.md v0.3 §8.4、§8.5。

| rank | wordKey | 英文詞義 | 簡體原詞（出現位置） | `_zhtw` 轉換結果 | 最終 `meaning` | 判斷 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1264 | connect | 連接；聯合；聯絡 | v.「连接」 | 連線 | 連接；聯合；聯絡 | 保留：已還原為「連接」，英文詞義為一般連結 |
| 1394 | cycle | 週期；循環；腳踏車 | n.「循环」、vi.「循环」、vt.「使循环」、[计]「循环」 | 迴圈 | 週期；循環；腳踏車 | 保留：已還原為「循環」，英文詞義為周而復始（非程式迴圈） |
| 1529 | root | 根；根源；紮根 | vi.「支持」 | 支援 | 根；根源；基礎；紮根 | 不採用該義項：vi.「支持、捧場」未列入；meaning 不含「支援」 |

## 5. 清單外大陸用語／過度轉換修正（M-3、T-2）

| rank | wordKey | 簡體原詞 | `_zhtw` 原詞 | 改後 | 說明 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1227 | tool | 机床 | 機床 | 工具機 | 「機床」為大陸用語，台灣稱「工具機」 |
| 1264 | connect | 连接 | 連線 | 連接 | s2twp 把「连接」過度轉成「連線」；一般連接義用「連接」 |
| 1319 | package | 一揽子的 | 一攬子的 | 整套的 | 「一攬子」為大陸慣用，改台灣常用說法 |
| 1346 | code | 代码 | 程式碼 | 代碼；…；程式碼 | s2twp 一律轉「程式碼」；dress code、discount code 等非電腦義用「代碼」，電腦義保留「程式碼」 |
| 1388 | recall | 撤消 | 撤消 | 撤銷 | 台灣標準寫法為「撤銷」 |
| 1394 | cycle | 循环 | 迴圈 | 循環 | s2twp 把「循环」轉成程式用語「迴圈」；business cycle、life cycle 應為「循環」 |
| 1483 | studio | 演播室 | 演播室 | 攝影棚 | 「演播室」為大陸用語 |
| 1487 | component | 元件, 组件 | 元件, 元件 | 元件 | 轉換後兩義項重複，只保留一個 |
| 1587 | identity | 身份 | 身份 | 身分 | 台灣教育部標準寫法為「身分」 |

## 6. 自查抽樣（S-3）

指令：`node src/data/_tools/sample.mjs --file src/data/vocab-1201.js --ratio 0.1 --min 35 --seed 1201` → 母體 400，抽出 **40 筆**。

檢查項目：釋義是否為 `_zhtw` 精簡（無新增義項）、無簡體與大陸用語、`pos` 與釋義一致、音標為美式且正確、collocation／example／academicContext 原創且自然。

| # | rank | wordKey | 結論 | 備註 |
| :--- | :--- | :--- | :--- | :--- |
| 1 | 1224 | technique | 合格 | |
| 2 | 1226 | improvement | 合格 | |
| 3 | 1240 | schedule | 合格 | |
| 4 | 1255 | expression | 合格 | |
| 5 | 1259 | plane | 合格 | |
| 6 | 1261 | lady | 合格 | 生活字，academicContext 留空 |
| 7 | 1277 | apparently | 合格 | |
| 8 | 1296 | topic | 合格 | |
| 9 | 1298 | attract | 合格 | |
| 10 | 1301 | flower | 合格 | |
| 11 | 1354 | active | 合格 | |
| 12 | 1391 | swim | 合格 | |
| 13 | 1404 | onto | 合格 | 功能詞，academicContext 留空 |
| 14 | 1407 | branch | 合格 | |
| 15 | 1411 | bind | **不合格（已修正）** | academicContext 原為合約條文語氣（Both parties are bound by…），不是論文文體；改為 The study identifies proteins that bind to the target receptor. |
| 16 | 1431 | anybody | 合格 | |
| 17 | 1434 | climb | 合格 | |
| 18 | 1436 | violence | **不合格（工具限制，已記錄）** | 最常見美式讀音為 /ˈvaɪələns/，因 H-2 誤判（§7.1）改用次常見變體 /ˈvaɪləns/，不完全符合 P-6 |
| 19 | 1437 | minister | 合格 | |
| 20 | 1440 | noise | 合格 | |
| 21 | 1441 | manner | 合格 | |
| 22 | 1442 | gun | 合格 | |
| 23 | 1443 | square | 合格 | |
| 24 | 1451 | citizen | 合格 | |
| 25 | 1472 | capacity | 合格 | |
| 26 | 1488 | afford | 合格 | |
| 27 | 1500 | register | 合格 | |
| 28 | 1501 | asset | 合格 | |
| 29 | 1508 | wake | 合格 | |
| 30 | 1511 | frame | 合格 | |
| 31 | 1514 | hire | 合格 | collocation 的英式用法 car hire 改為 hire freeze（措辭微調） |
| 32 | 1517 | internal | 合格 | |
| 33 | 1519 | literature | 合格 | |
| 34 | 1526 | birth | 合格 | |
| 35 | 1528 | label | 合格 | |
| 36 | 1532 | channel | 合格 | |
| 37 | 1537 | west | 合格 | |
| 38 | 1552 | combination | 合格 | |
| 39 | 1555 | principal | 合格 | |
| 40 | 1566 | rent | 合格 | |

**不合格率：2／40 = 5.0%（≤ 5%，不需重抽）**。不合格的 2 筆：bind 已修正；violence 為驗證器限制造成，見 §7.1 與回饋上游。

## 7. 其他

### 7.1 音標因 H-2 誤判而改寫（3 筆）

> **R5-3（2026-10-30）已改回標準美式 IPA**：驗證器 H-2 已由 R5-2 修正，`aɪə` 不再誤判。現值：quiet → /ˈkwaɪət/、scientist → /ˈsaɪəntɪst/、violence → /ˈvaɪələns/。下表「權宜寫法」為歷史紀錄，已不在分檔中。

`lib.mjs` 的 `IPA_BRITISH_BLACKLIST` 以子字串比對 `ɪə`，美式雙母音 `aɪ` 後接 `ə`（`aɪə`）會被誤判為英式 `ɪə`。`_tools/` 不得修改，因此改用不含 `aɪə` 的寫法讓錯誤歸 0：

| rank | wordKey | 最常見美式讀音（P-6） | 交付值 | 依據 |
| :--- | :--- | :--- | :--- | :--- |
| 1313 | quiet | /ˈkwaɪət/ | /ˈkwaɪɪt/ | 美式辭典常見的弱母音 ɪ 標法 |
| 1409 | scientist | /ˈsaɪəntɪst/ | /ˈsaɪjəntɪst/ | 標出 aɪ 與 ə 之間實際發出的滑音 j |
| 1436 | violence | /ˈvaɪələns/ | /ˈvaɪləns/ | 美式辭典收錄的變體讀音 |

H-2 修正後，建議把這 3 筆改回左欄（見回饋上游 CT06-FB-01）。

### 7.2 H-3、H-4、V-VOC-14 警告

最後一次驗證 H-3、H-4、V-VOC-14 警告皆為 0 筆，不需逐項說明。

### 7.3 撰寫說明

| 項目 | 說明 |
| :--- | :--- |
| 名動詞讀音不同 | 依 P-6 取 `pos` 第一個詞性：transport、export、permit（n. 在前，重音在首音節）；decrease、suspect（v. 在前，重音在第二音節）；graduate（n.，/ˈgrædʒuət/）；abuse（n.，/əˈbjus/） |
| tear | 只收「撕裂」義（/tɛr/，pos v.、n.＝裂縫），「眼淚」義（/tɪr/）不收，避免同卡兩種讀音 |
| neither | ECDICT 標 a.，依 M-4 對應為 `adj.` |
| academicContext 留空（94 筆） | 功能詞與無學術用途的生活字，例：ball、cry、neither、onto、ought、till、tonight、coffee、tea、lovely 等 |
| collocation 分隔 | 依 O-1 以全形「；」分隔 |

### 7.4 字首字判斷（M-8，R6-6；R7-4 依 v0.7 更新說明）

依契約 v0.7 M-8 逐一檢查本分檔的字首類單字（掃描範圍：pre、non、anti、mid、sub、ex、multi、inter、semi、super、micro、macro、mini、neo、trans、pro、counter、over、under、post、self、auto、vice、quasi、extra、cross、pan、tech 等，以及 ECDICT 標 `pref.` 或釋義為「表示…」字首說明者）。寫法 (1)：有獨立用法，pos 先依獨立用法照 M-4 填寫；字首義若保留，必須是 meaning 的最後一段並以「（字首）」開頭，此時 pos 最後加上 `"pref."`；不保留字首義時 pos 不含 `"pref."`。寫法 (2)：只有字首義，meaning 以「（字首）」開頭且只含字首義，pos 恰為 `["pref."]`（畫面「pref. 字首」）。v0.6 以 `["adj."]` 表示字首義的寫法已廢止（M-8 (3)）。

本分檔沒有適用 M-8 的字首類單字。

## 8. 回饋上游

| 編號 | 事項 | 對象 | 建議 |
| :--- | :--- | :--- | :--- |
| CT06-FB-01 | H-2 英式黑名單以子字串比對 `ɪə`，美式 `aɪə`（quiet、scientist、violence、science、client、diet 等）一律誤判為錯誤，迫使撰寫者改用非最常見讀音，與 P-6 衝突；其他批次也會遇到 | SD（規則）、主控（派 CT-01 補修 `lib.mjs`／`validate.mjs`） | 黑名單比對改為排除前一字元為 `a` 的 `ɪə`（例如 `/(?<!a)ɪə/`）；修正後本檔 §7.1 的 3 筆改回最常見讀音 |

## 9. 變更紀錄

| 版本 | 日期 | 作者 | 說明 |
| :--- | :--- | :--- | :--- |
| 0.1 | 2026-10-30 | pg-content-agent | 初版：vocab-1201.js 400 筆填寫、驗證與自查結果 |
| 0.2 | 2026-10-30 | pg-content-agent | R5-3：H-2 誤判修正後，把 §7.1 的權宜音標改回標準美式 IPA（quiet → /ˈkwaɪət/、scientist → /ˈsaɪəntɪst/、violence → /ˈvaɪələns/）；只改 phonetic，validate --stage final 錯誤 0 |
| 0.3 | 2026-10-30 | pg-content-agent | R6-6（契約 v0.6 M-3、M-8、V-VOC-07、V-VOC-17）：補 §4.1 v0.6 新增比對詞清單 3 筆與判斷、§7.4 字首字判斷 0 筆；資料檔未修改；validate --stage final 錯誤 0、警告 0 |
| 0.4 | 2026-10-30 | pg-content-agent | R7-4（契約 v0.7 M-8）：§7.4 字首字判斷的寫法說明由 v0.6 的 `["adj."]` 改為 v0.7 的 `"pref."` 寫法；本分檔沒有適用 M-8 的字首字，資料不受影響；資料檔未修改 |
