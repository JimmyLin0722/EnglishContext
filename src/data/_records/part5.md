---
doc: PART5-RECORD
version: 0.2
status: in-review
author: pg-content-agent
approved_by:
approved_at:
---

# Part 5 題庫交付紀錄（`src/data/part5.js`）

> 本檔由 CT-19 建立，CT-20 接續更新（architecture.md D-2）。第 2、3 節已由 CT-20 更新為最終分布；CT-20 的摘要、驗證與自查見第 8 節。
> **id 已重編**：第 1、4～6 節保留 CT-19 當時的暫定 id；換算為最終 id 的規則見 §8.3。

## 1. 摘要（CT-19）

| 項目 | 內容 |
| :--- | :--- |
| 任務 | CT-19（第 2 批，`/pg-run`） |
| 涵蓋 | US-10、US-11、US-23、AC-10-01、AC-10-02、AC-11-02、AC-23-04 |
| 依據 | 契約 v0.4（`data-schema.ts` §5 `Part5Question`、`Part5Explanation`、`Part5QuestionType`、`PART5_BLANK`；README §3.1、§7.4 V-P5-01～07、C-1、C-4、C-5）、architecture.md v0.2（§8.3 O-4、D-2、SD-FB-06）、PRD v0.6 |
| 產出 | `src/data/part5.js`（`window.PART5_QUESTION_BANK`，100 題）、本檔 |
| id 範圍 | `p5-001`～`p5-050` preposition_collocation；`p5-051`～`p5-100` part_of_speech（**暫定**，CT-20 交錯重排後重編） |
| 日期 | 2026-10-30 |

### 1.1 檔案格式（方便 CT-20 續寫）

| 項目 | 規定 |
| :--- | :--- |
| 結構 | 3 行 `//` 說明註解 → `window.PART5_QUESTION_BANK = [` → 每題一行 → `];` |
| 每題一行 | `JSON.stringify(question)`，鍵順序 `id, type, sentence, options, correctIndex, explanation{coreStrategy, structure}, source`（依 `data-schema.ts` 宣告順序） |
| C-4 | 只有 `window.X = <JSON 相容字面值>;`，無函式、無 `undefined`；`validate.mjs` LOAD 規則通過 |
| `structure` 格式 | 固定 `S: … / V: … / O: … / 修飾語: …` 四段；無受詞時寫 `O: 無（被動語態）`、`O: 無（不及物動詞）` 或 `O: 無（補語 …）`；祈使句寫 `S: （you，祈使句省略）`；關係子句、分詞片語放在「修飾語」並以括註標示 |
| `coreStrategy` 寫法 | 先點出空格位置的關鍵線索（前後字、句構），再說明正解的固定搭配或詞性，必要時說明易混淆誘答錯在哪裡；不以 A～D 字母指稱選項（CT-20 會調整選項順序） |

## 2. 題型分布

最終分布（CT-20 交錯重排、重編 id 後）。

| type | 畫面標籤 | 題數 | 撰寫任務 | 最終 id（序號規則） |
| :--- | :--- | :--- | :--- | :--- |
| `preposition_collocation` | 固定介系詞搭配 | 50 | CT-19 | p5-001、005、009 …、197（序號除以 4 餘 1） |
| `part_of_speech` | 詞性辨析 | 50 | CT-19 | p5-002、006、010 …、198（餘 2） |
| `context_vocabulary` | 上下文單字 | 50 | CT-20 | p5-003、007、011 …、199（餘 3） |
| `connector` | 讓步/因果連接詞 | 50 | CT-20 | p5-004、008、012 …、200（整除） |
| 合計 | | **200** | | p5-001～p5-200 連續 |

## 3. 正解位置分布

最終分布（全題庫）。CT-19 的 100 題維持原選項順序與 `correctIndex`（未調整）；CT-20 的 100 題在交錯排序後依最終順序指定正解位置（mulberry32 種子 2001，A～D 各 25 題，並避免連續 4 題同位置），誘答順序以同一亂數洗牌。

| 範圍 | A | B | C | D | 合計 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| preposition_collocation（CT-19） | 13 | 12 | 13 | 12 | 50 |
| part_of_speech（CT-19） | 12 | 13 | 12 | 13 | 50 |
| context_vocabulary（CT-20） | 12 | 17 | 11 | 10 | 50 |
| connector（CT-20） | 13 | 8 | 14 | 15 | 50 |
| **全題庫** | **50** | **50** | **50** | **50** | 200 |
| 比例（V-P5-05 要求 20%～30%） | 25% | 25% | 25% | 25% | |

其他：全題庫連續相同正解位置最長 3 題。CT-20 兩題型各自的位置分布不平均（B 17／8），但契約 V-P5-05 與 doneWhen 只規範全題庫，且交錯排序後同題型不會相鄰，不影響作答體驗。

## 4. 驗證結果

### 4.1 `node src/data/_tools/validate.mjs --file src/data/part5.js --stage partial`

| 規則 | 通過 | 錯誤 | 警告 |
| :--- | :--- | :--- | :--- |
| FILE、LOAD | 2 | 0 | 0 |
| V-P5-01（題型；筆數為 partial 略過） | 100 | 0 | 0 |
| V-P5-02 id 格式、不重複 | 201 | 0 | 0 |
| V-P5-03 恰 1 個 `_____` | 100 | 0 | 0 |
| V-P5-04 4 個選項、非空、互異、不含 `_____` | 300 | 0 | 0 |
| V-P5-05 索引範圍（分布為 partial 略過；資訊列 A 25、B 25、C 25、D 25） | 100 | 0 | 0 |
| V-P5-06 解析兩欄非空 | 100 | 0 | 0 |
| V-P5-07 source = ORIGINAL | 100 | 0 | 0 |
| **總計** | | **0** | **0** |

結果：**通過**（exit 0）。V-IN-01～07 亦一併通過（驗證器每次執行都會重算字表，與本任務無關）。

### 4.2 額外自查（scratchpad 腳本）

| 項目 | 結果 |
| :--- | :--- |
| 題數／題型 | 100；preposition_collocation 50、part_of_speech 50 |
| 題目句重複（不分大小寫） | 0（100 句皆不同） |
| `options[correctIndex]` 與撰寫稿正解一致 | 100／100 |
| 題目句長度 | 6～16 字，平均 11.6 字 |
| 解析含常見簡體字（粗查字集） | 0 |
| 解析以 A～D 字母指稱選項 | 0 |

## 5. 內容說明

| 項目 | 說明 |
| :--- | :--- |
| 原創性（AC-23-04、O-4） | 100 題的題目句、選項組合與解析皆為本任務撰寫；未參考、改寫 ETS 官方題本或市售題庫。情境為一般職場（人事、行銷、採購、物流、會議、飯店、合約），人名與地名為虛構通用名 |
| 固定介系詞搭配考點 | 動詞＋介系詞（depend on、refer to、object to、specialize in、result in、succeed in…）、形容詞＋介系詞（responsible for、compatible with、eligible for、liable for、subject to、similar to…）、名詞＋介系詞（shortage of、dependence on、access to、background in…）、固定片語（in charge of、in accordance with、on behalf of、on the grounds that、in recognition of、take advantage of、keep track of、upon request…）、時間介系詞 by vs until（1 題）、between vs among（1 題） |
| 詞性辨析考點 | 冠詞／所有格後接名詞、名詞前接形容詞、修飾動詞用副詞、助動詞與過去分詞之間放副詞、be 動詞後接形容詞補語、對等連接詞前後詞性一致、不定詞與使役結構後接原形動詞、名詞指人 vs 指物（applicant／application、specialist／specialty） |
| 難度 | 以綠色級（470～725）常見考點為主；約 8 題屬藍色級（如 attributed to、on the grounds that、accountable to、unanimously、complexity、overwhelming demand、in recognition of、pending approval from） |
| 誘答設計 | 固定介系詞題的 3 個誘答皆與該字無合法搭配或語意明顯不通；詞性題 4 個選項為同字根不同詞性，誘答放入空格必定造成語法錯誤 |

## 6. 正解唯一性自查（每題型 10 題）

方法：以 mulberry32 固定種子洗牌該題型 50 題後取前 10 題（固定介系詞種子 19、詞性種子 20），逐題把 4 個選項分別代入空格，判斷是否只有正解合乎語法與語意。

### 6.1 preposition_collocation（種子 19）

| id | 考點 | 正解 | 誘答檢查 | 結論 |
| :--- | :--- | :--- | :--- | :--- |
| p5-002 | in charge of | C) of | for／with／on 不接在 in charge 後 | 唯一 |
| p5-007 | be attributed to | C) to | for／with 無此搭配；by 表執行者，語意不通 | 唯一 |
| p5-009 | agree to（條款） | C) to | at／by／from 不與 agree 搭配（刻意不放 on、with，避免 agree on／with the terms 也成立） | 唯一 |
| p5-014 | close to | A) to | at／with／on 不接在表距離的 close 後 | 唯一 |
| p5-018 | available upon request | A) upon | at／in／with request 皆非慣用說法 | **自查時修正**：初稿誘答含 by，而 available by request 有人使用，改為 with；on request 亦成立故從未列入選項 |
| p5-024 | apply to（適用於） | B) to | of／at／with 不與 apply 搭配 | **自查時修正**：初稿誘答含 for，口語偶見 the rule applies for everyone，改為 of |
| p5-025 | invest in | D) in | on／at／to 非標準搭配 | 唯一 |
| p5-031 | take advantage of | B) of | for／to／with 不成立 | 唯一 |
| p5-038 | consult with 人 | C) with | to／about／at 不可帶出商量對象 | 唯一 |
| p5-039 | be liable for | D) for | liable to 後接原形動詞或「易患」，接 items 不通；of／with 不成立 | 唯一 |

結論：10 題中 8 題初稿即唯一，2 題（p5-018、p5-024）各有 1 個邊緣可接受的誘答，已替換後重新驗證，最終 10／10 唯一。修正後同步複查其餘 40 題的誘答，另外刻意避開的組合：agree on／with、in behalf of、walking distance from、succeed at、submitted by、approval by、result from、on request。

### 6.2 part_of_speech（種子 20）

| id | 考點 | 正解 | 誘答檢查 | 結論 |
| :--- | :--- | :--- | :--- | :--- |
| p5-051 | 冠詞 a 後接名詞（make a decision） | C) decision | decide 動詞、decisive 形容詞、decisively 副詞，皆不能單獨當 a 的中心名詞 | 唯一 |
| p5-063 | has 與 approved 之間放副詞 | C) unanimously | unanimous 形容詞；unanimity、unanimousness 名詞，皆不能插在完成式中 | 唯一 |
| p5-065 | 所有格後接名詞（attention to detail） | D) attention | attend 動詞、attentive 形容詞、attentively 副詞 | 唯一 |
| p5-066 | be + much more + 形容詞 + than | D) reliable | reliably 副詞不能當 be 的補語；reliability、rely 詞性不符 | 唯一 |
| p5-074 | be 動詞後接形容詞補語 | D) limited | limit、limits（名詞／動詞）、limitation（名詞）放入後語法或語意不通；刻意不放 limitless（文法成立但與句意矛盾，易起爭議） | 唯一 |
| p5-078 | be responsible for | B) responsible | responsibly 副詞、responsibility 名詞、respond 動詞 | 唯一 |
| p5-080 | a + 形容詞 + 名詞 | D) thorough | thoroughly、more thoroughly 副詞；thoroughness 名詞（刻意不放 thoroughgoing，同為形容詞） | 唯一 |
| p5-085 | a + 指人名詞 + to manage | A) specialist | specialize 動詞、specialized 形容詞；specialty 是名詞但指「專長」，不能管理帳號 | 唯一 |
| p5-097 | 及物動詞 improved 接名詞受詞 | D) productivity | productive 形容詞、productively 副詞；producing 動名詞語意不通（刻意不放 produce，因其名詞義「農產品」文法上可成立） | 唯一 |
| p5-099 | to + 原形動詞 | C) analyze | analysis 名詞、analytical 形容詞、analytically 副詞 | 唯一 |

結論：10／10 正解唯一，不合格 0。

## 7. 回饋上游

無。

## 8. CT-20：上下文單字、讓步/因果連接詞與交錯重排

### 8.1 摘要

| 項目 | 內容 |
| :--- | :--- |
| 任務 | CT-20（第 3 批，`/pg-run`） |
| 涵蓋 | US-10、US-11、US-23、AC-10-01、AC-11-02、AC-23-04 |
| 依據 | 契約 v0.5（`Part5Question`、`Part5Explanation`、`Part5QuestionType`、`PART5_BLANK`；README §7.4 V-P5-01～07）、architecture.md v0.2（SD-FB-06、D-2、O-4）、PRD v0.6、本檔 §1.1 |
| 新增 | `context_vocabulary` 50 題、`connector` 50 題，格式依 §1.1 |
| CT-19 題目 | 100 題的 `type`、`sentence`、`options`、`correctIndex`、`explanation`、`source` 全部未變更（腳本逐欄比對 100／100 相同），只改 `id` 與陣列位置 |
| 檔頭註解 | 第 2 行改為說明 CT-19／CT-20 分工與重編結果（仍為 3 行 `//` 註解） |
| 日期 | 2026-10-30 |

### 8.2 內容說明

| 項目 | 說明 |
| :--- | :--- |
| 原創性（AC-23-04、O-4） | 100 題題目句、選項組合與解析皆為本任務撰寫，未參考或改寫 ETS 官方題本與市售題庫；人名、公司名（如 Rayburn Tech）為虛構 |
| 上下文單字考點 | 4 個選項詞性與詞形相同（同為過去分詞、名詞、形容詞等），只能靠上下文線索判斷；誘答多為拼字相近字（complimentary／complementary、status／statue／statute、exceed／exclude／excuse）或同字首／字根字（-tract、con-、re-），且放入後語意明顯不通。刻意不放近義可成立的字（如 postponed 題不放 delayed、required 題不放 requested、ensure 題不放 insure） |
| 讓步/因果連接詞考點 | 三類判斷：① 連接詞（although、even though、though、because、since、as、whereas、while、so）vs 介系詞（despite、in spite of、notwithstanding、because of、due to、owing to、on account of、thanks to、as a result of）看空格後是子句或名詞片語；② 連接副詞（however、nevertheless、nonetheless、therefore、consequently、thus、hence、accordingly、as a result）看「; ___,」或句首加逗號的位置；③ 讓步 vs 因果語意。每題選項皆含易混淆的連接詞／介系詞組合 |
| 連接詞題的正解類型 | 讓步／對比 22 題、因果 28 題 |
| 難度 | 以綠色級（470～725）為主；藍色級約 8 題（meticulous、outsource、unattended、accommodate、complimentary、notwithstanding、accordingly、hence） |
| 題目句長度（新 100 題） | 7～20 字，平均 13.3 字 |

### 8.3 交錯排序與重編 id（SD-FB-06）

| 項目 | 做法／結果 |
| :--- | :--- |
| 排序 | 固定循環 preposition_collocation → part_of_speech → context_vocabulary → connector，共 50 輪；各題型內部維持原順序 |
| 舊 id 換算 | CT-19 暫定 `p5-n`（n ≤ 50）→ 最終序號 4n − 3；暫定 `p5-(50+n)` → 4n − 2。例：p5-002 → p5-005、p5-051 → p5-002、p5-100 → p5-198 |
| 新題 id | context_vocabulary 第 k 題 → 4k − 1；connector 第 k 題 → 4k |
| 連續 4 題題型數（腳本檢查 197 個視窗） | 每個視窗皆為 **4 種**（最少 4 種；少於 3 種的視窗 0 個） |
| 同題型最長連續 | 1 題 |
| id | p5-001～p5-200 連續、無重複 |

### 8.4 驗證結果

`node src/data/_tools/validate.mjs --file src/data/part5.js --stage final`

| 規則 | 通過 | 錯誤 | 警告 |
| :--- | :--- | :--- | :--- |
| FILE、LOAD | 2 | 0 | 0 |
| V-P5-01 題型與筆數（200 題；4 型各 50） | 205 | 0 | 0 |
| V-P5-02 id | 401 | 0 | 0 |
| V-P5-03 空格 | 200 | 0 | 0 |
| V-P5-04 選項 | 600 | 0 | 0 |
| V-P5-05 索引與位置分布（A 50、B 50、C 50、D 50） | 204 | 0 | 0 |
| V-P5-06 解析 | 200 | 0 | 0 |
| V-P5-07 source | 200 | 0 | 0 |
| **總計** | | **0** | **0** |

結果：**通過**（exit 0；V-IN-01～07 亦通過）。

額外自查（scratchpad 腳本）：

| 項目 | 結果 |
| :--- | :--- |
| CT-19 100 題除 id 外逐欄相同 | 100／100 |
| 新題 `options[correctIndex]` 與撰寫稿正解一致 | 100／100 |
| 題目句重複（不分大小寫，全 200 題） | 0 |
| `structure` 符合 `S: … / V: … / O: … / 修飾語: …` 四段 | 200／200 |
| 解析以 A～D 字母指稱選項 | 0 |
| 解析含常見簡體字（粗查字集） | 0 |
| 全題庫連續相同正解位置最長 | 3 題 |

### 8.5 正解唯一性自查（每題型 10 題）

方法同 §6：以 mulberry32 固定種子洗牌該題型 50 題後取前 10 題（上下文單字種子 21、連接詞種子 22），逐題把 4 個選項代入空格，判斷是否只有正解合乎語法與語意。id 為最終 id。

#### 8.5.1 context_vocabulary（種子 21）

| id | 考點 | 正解 | 誘答檢查 | 結論 |
| :--- | :--- | :--- | :--- | :--- |
| p5-003 | postpone until | A) postponed | estimated／reminded／attended 不能與 until next Thursday 表示延期（刻意不放 delayed） | 唯一 |
| p5-019 | complimentary（免費的） | B) complimentary | complementary（互補的）為拼字陷阱；contagious、confidential 不能形容接駁服務 | 唯一 |
| p5-039 | obtain permission from | C) permission | submission、emission 語意不通；admission 指入場／入學許可，不向主管取得 | 唯一 |
| p5-047 | 故障 → repair | B) repair | reply 為不及物動詞；require、retain 接 it 語意不通 | 唯一 |
| p5-103 | apologize for any inconvenience | A) inconvenience | innocence、independence、intelligence 不是停車場關閉造成的結果 | 唯一 |
| p5-107 | a sharp increase in | B) increase | instance、intention 不能描述數字變化 | **自查時修正**：初稿誘答含 interest，「報告顯示對網路銷售的強烈興趣」勉強可解讀，改為 invoice |
| p5-111 | relevant experience | C) experience | expense、experiment、expectation 不能以年資計 | 唯一 |
| p5-123 | convert A into B | B) convert | convince、convey、convict 不接 A into B（改建） | 唯一 |
| p5-135 | issue a refund | C) issue | inquire、insist 不直接接 a refund；install 語意不通（刻意不放 provide、offer） | 唯一 |
| p5-151 | ensure that | B) ensure | endure、enlarge、enroll 不接 that 子句（刻意不放 insure，美式有時與 ensure 通用） | 唯一 |
| p5-175 | severe weather | D) severe | sincere、several、secure 不能說明活動取消原因 | 唯一 |

註：p5-107 不在種子 21 的 10 題內，為撰寫後通讀時發現並修正，一併列出；抽樣 10 題（不含 p5-107）結論 10／10 唯一。

#### 8.5.2 connector（種子 22）

| id | 考點 | 正解 | 誘答檢查 | 結論 |
| :--- | :--- | :--- | :--- | :--- |
| p5-036 | 對比連接詞 + 子句 | A) whereas | despite、because of 是介系詞，不接子句；therefore 為副詞且表因果（刻意不放 while） | 唯一 |
| p5-072 | and + 連接副詞 + 子句（因果） | C) as a result | despite、because of 不接子句；although 會使 and 後只剩從屬子句 | 唯一 |
| p5-088 | 介系詞 + 名詞（因） | A) on account of | in spite of 語意相反；even though 要接子句；as a result 後須加 of | 唯一 |
| p5-092 | ; ___,（因果） | D) thus | however 語意不通；although、despite 不能放在此位置 | 唯一 |
| p5-108 | 介系詞 + 名詞（因） | D) because of | despite 語意相反；whereas、although 要接子句 | 唯一 |
| p5-112 | , ___ + 祈使句（結果） | D) so | because、although 不接祈使句；despite 不接子句 | 唯一 |
| p5-136 | ; ___,（因果） | A) accordingly | however、nevertheless 表轉折；otherwise 意為「否則」 | 唯一 |
| p5-140 | 介系詞 + 名詞（讓步） | A) Despite | Because of 語意相反；Although、Because 要接子句 | **自查時修正**：初稿誘答含 Since，而「Since the rise in fuel prices, the airline has not increased its fares.」中 since 作時間介系詞、搭配現在完成式，文法語意皆成立，改為 Because |
| p5-152 | 連接詞 + 子句（因） | B) as | despite、because of 不接子句；so 表結果、因果方向顛倒 | 唯一 |
| p5-188 | 介系詞 + 名詞（讓步） | C) In spite of | Owing to 語意相反；Although 要接子句；Therefore 不接名詞 | 唯一 |

結論：10 題中 9 題初稿即唯一，1 題（p5-140）有可成立的誘答，已替換並重新驗證，最終 10／10 唯一。修正後複查其餘 40 題：since、as、while 除 p5-028（「_____ of the road construction」，Since of 不合文法）外只出現在正解，未當誘答使用；不在同一題同時放 although／though／even though 或 while／whereas 等同類可互換的連接詞。

### 8.6 回饋上游（CT-20）

無。

## 變更紀錄

| 版本 | 日期 | 作者 | 內容 |
| :--- | :--- | :--- | :--- |
| 0.1 | 2026-10-30 | pg-content-agent | CT-19 初版：preposition_collocation 50 題、part_of_speech 50 題；正解位置 A～D 各 25；validate partial 錯誤 0；每題型 10 題正解唯一性自查 |
| 0.2 | 2026-10-30 | pg-content-agent | CT-20：新增 context_vocabulary 50 題、connector 50 題；全 200 題以題型循環交錯排序並重編 p5-001～p5-200（CT-19 題目內容與選項順序未變）；正解位置 A～D 各 50；validate final 錯誤 0；更新第 2、3 節為最終分布，新增第 8 節 |
