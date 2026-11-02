---
doc: CT-21-RECORD
version: 0.1
status: in-review
author: pg-content-agent
approved_by:
approved_at:
---

# CT-21 交付紀錄：長難句 50 句與閱讀策略 3 主題（decoder.js）

## 1. 摘要

| 項目 | 內容 |
| :--- | :--- |
| 任務 | CT-21（`/pg-run` 第 2 批） |
| 涵蓋 | US-12、US-13、US-14、US-23、AC-12-01～03、AC-13-01、AC-14-01、AC-23-04 |
| 依據 | 契約 v0.4（`DecoderSentence`、`DecoderSegment`、`SyntaxRole`、`ReadingStrategy`、`ReadingStrategyId`、README §7.5 V-DEC-01～04、V-RS-01）、architecture.md v0.2、PRD v0.6 |
| 產出 | `src/data/decoder.js`（`window.DECODER_SENTENCES` 50 句、`window.READING_STRATEGIES` 3 筆）、本檔 |
| 檔案格式 | 開頭 2 行註解 + `window.X = [ … ];`，每筆一行 `JSON.stringify`，鍵順序依 `data-schema.ts`（C-4） |
| 檔案大小 | 41,319 bytes |
| 來源 | 句子、翻譯、noteZh、閱讀策略全部原創，`source` 皆為 `"ORIGINAL"`（AC-23-04）；未引用真實作者或文獻 |
| 撰寫方式 | 在 scratchpad 以標記語法（`[S:…]`、`[V:…]`、`[O:…]`、`[M:…\|noteZh]`，括號外 = `plain`）撰寫，產生器轉成 segments，保證串接 = 原句 |

## 2. 驗證結果

`node src/data/_tools/validate.mjs --file src/data/decoder.js --stage final`：**錯誤 0、警告 0，結果通過**。

| 規則 | 通過數 | 錯誤 |
| :--- | :--- | :--- |
| V-DEC-01 筆數與 id（50 句、`ds-001`～`ds-050` 不重複） | 52 | 0 |
| V-DEC-02 segments 串接（首尾無空白、無連續空白、以 `.` 結尾） | 250 | 0 |
| V-DEC-03 每句有 subject／verb／modifier | 150 | 0 |
| V-DEC-04 role、translationZh、section、source、無多餘鍵 | 1,328 | 0 |
| V-RS-01 閱讀策略 3 筆、順序與標題 | 10 | 0 |

產生器額外自檢（全部通過）：每句 20～45 字（實測最少 20、最多 32、平均 24.7）；`plain` 段只含空白與標點（不含英文字母或數字）；串接後無殘留標記。

## 3. 分布統計

### 3.1 section 分布

| section | 句數 | id 範圍 | 要求 |
| :--- | :--- | :--- | :--- |
| abstract | 17 | ds-001～ds-017 | ≥ 16 |
| methodology | 17 | ds-018～ds-034 | ≥ 16 |
| literature_review | 16 | ds-035～ds-050 | ≥ 16 |
| 合計 | 50 | | ≥ 50 |

### 3.2 角色統計（段數）

| section | subject | verb | object | modifier | plain | 無 object 的句數 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| abstract | 17 | 17 | 17 | 35 | 86 | 0 |
| methodology | 17 | 17 | 9 | 41 | 84 | 8 |
| literature_review | 16 | 16 | 15 | 36 | 83 | 2 |
| 合計 | 50 | 50 | 41 | 112 | 253 | 10 |

- 無 object 段的 10 句：ds-018、020、024、026、028、030、032、034（方法段落多為被動語態）、ds-038（`little is known`）、ds-046（不及物 `has evolved`）。契約不要求 object 段。
- modifier 段 112 段全部附 `noteZh`（112／112）。

### 3.3 modifier 結構類型（依 noteZh 主類別）

| 類型 | 段數 | 類型 | 段數 |
| :--- | :--- | :--- | :--- |
| 介系詞片語 | 50 | 不定詞片語 | 4 |
| 關係子句（含介系詞 + which／whom） | 9 | 時間副詞子句 | 4 |
| 分詞構句 | 8 | 原因副詞子句 | 4 |
| 非限定關係子句 | 6 | 同位語 | 2 |
| 過去分詞片語（後位修飾、插入語） | 6 | 現在分詞片語 | 2 |
| 讓步子句 | 5 | with 獨立分詞構句 | 2 |
| 其他（各 1）：讓步副詞片語、形容詞片語、總結副詞、分詞片語、獨立分詞構句、副詞、副詞 + 介系詞片語、as 引導的省略子句、given that 引導的理由子句、限定關係子句 | 10 | | |

## 4. 標註原則

| 角色 | 標註方式 |
| :--- | :--- |
| subject | 主詞名詞片語的核心（限定詞 + 形容詞 + 名詞）；後位修飾的介系詞片語、分詞片語、關係子句另切為 modifier。例外：數量／集合結構（`a panel of three bilingual experts`、`a growing body of research`、`Most of the literature`）整體保留在 subject，因拆開後中心語不完整 |
| verb | 核心動詞，含助動詞、否定、夾在動詞片語中的副詞與片語動詞的介系詞（`were randomly assigned`、`did not show`、`have relied largely on`、`was associated with`、`tend to underestimate`） |
| object | 受詞、主詞補語（ds-042 `mixed`、ds-044、ds-047 標 noteZh「主詞補語」）、受詞補語（ds-040 `as the three basic psychological needs` 標「受詞補語」）；名詞子句當受詞時整個子句為一段 object（如 ds-004、ds-005） |
| modifier | 副詞子句、分詞構句、關係子句、插入語、同位語、介系詞片語、不定詞片語、副詞 |
| plain | 只有空白、逗號、句點 |

## 5. 人工檢查：主幹 S＋V 標註自查（全 50 句）

檢查項目：(1) subject 段是否為該句主要子句的主詞；(2) verb 段是否為與該主詞搭配的限定動詞（時態、單複數一致）；(3) 去掉所有 modifier 後，S＋V（＋O）是否仍是合乎文法的完整句。

| id | subject | verb | 去修飾語後主幹 | 結果 |
| :--- | :--- | :--- | :--- | :--- |
| ds-001 | the framework | cuts | the framework cuts average response time. | 正確 |
| ds-002 | This study | examines | This study examines how … use generative AI tools. | 正確 |
| ds-003 | we | investigated | we investigated the extent. | 正確（the extent 由 to which 子句補足語意） |
| ds-004 | The results | indicate | The results indicate that … outperformed their peers … | 正確 |
| ds-005 | These findings | suggest | These findings suggest that urban green space contributes … | 正確（複數一致） |
| ds-006 | the present study | develops | the present study develops a lightweight sensor network. | 正確 |
| ds-007 | this paper | identifies | this paper identifies four organizational factors. | 正確 |
| ds-008 | Our analysis | reveals | Our analysis reveals a strong link between … | 正確（插入語不影響一致） |
| ds-009 | the flipped classroom model | was associated with | the model was associated with higher levels of student engagement. | 正確 |
| ds-010 | The proposed algorithm | achieves | The proposed algorithm achieves an accuracy of 94.2 percent. | 正確 |
| ds-011 | this study | evaluates | this study evaluates whether rent subsidies improve … | 正確 |
| ds-012 | We | argue | We argue that coastal communities require … | 正確 |
| ds-013 | the intervention group | did not show | the intervention group did not show significant gains … | 正確 |
| ds-014 | This article | offers | This article offers practical guidance. | 正確 |
| ds-015 | the study | produces | the study produces the first high-resolution estimate … | 正確 |
| ds-016 | The evidence | points to | The evidence points to a clear trade-off. | 正確 |
| ds-017 | the study | demonstrates | the study demonstrates that peer tutoring can be … | 正確 |
| ds-018 | Participants | were randomly assigned | Participants were randomly assigned. | 正確（被動，無受詞） |
| ds-019 | two trained researchers | independently coded | two trained researchers independently coded a random sample … | 正確 |
| ds-020 | Data | were collected | Data were collected. | 正確（學術用法 data 作複數） |
| ds-021 | each participant | completed | each participant completed a short practice session. | 正確 |
| ds-022 | The sample | consisted of | The sample consisted of 186 small business owners. | 正確 |
| ds-023 | we | removed | we removed responses. | 正確 |
| ds-024 | Semi-structured interviews | were conducted | Semi-structured interviews were conducted. | 正確 |
| ds-025 | we | applied | we applied a nonparametric test. | 正確 |
| ds-026 | The prototype | was tested | The prototype was tested. | 正確 |
| ds-027 | the research team | observed | the research team observed twelve classroom sessions. | 正確 |
| ds-028 | Ethical approval | was obtained | Ethical approval was obtained. | 正確 |
| ds-029 | the analysis | included | the analysis included monthly fixed effects. | 正確 |
| ds-030 | Each text | was segmented | Each text was segmented. | 正確 |
| ds-031 | this study | measured | this study measured smartphone use. | 正確 |
| ds-032 | Missing values | were handled | Missing values were handled. | 正確 |
| ds-033 | a panel of three bilingual experts | reviewed | a panel … reviewed each item. | 正確（見 §4 例外） |
| ds-034 | Model performance | was evaluated | Model performance was evaluated. | 正確 |
| ds-035 | a growing body of research | has examined | a growing body of research has examined the role of motivation. | 正確（中心語 body，單數一致） |
| ds-036 | relatively few studies | have investigated | relatively few studies have investigated its long-term effects … | 正確 |
| ds-037 | Previous studies | have relied largely on | Previous studies have relied largely on data. | 正確 |
| ds-038 | little | is known | little is known. | 正確 |
| ds-039 | Several scholars | have argued | Several scholars have argued that standardized testing narrows the curriculum. | 正確 |
| ds-040 | researchers | have identified | researchers have identified autonomy, competence, and relatedness as … | 正確 |
| ds-041 | Existing models | tend to underestimate | Existing models tend to underestimate runoff. | 正確 |
| ds-042 | the evidence | remains | the evidence remains mixed. | 正確 |
| ds-043 | Most of the literature | has focused on | Most of the literature has focused on large listed companies. | 正確（literature 不可數，單數一致） |
| ds-044 | its usefulness | remains | its usefulness remains a matter of debate. | 正確 |
| ds-045 | Earlier work | demonstrated | Earlier work demonstrated that retrieval practice enhances … | 正確 |
| ds-046 | the concept | has evolved | the concept has evolved. | 正確（不及物） |
| ds-047 | This gap | is | This gap is particularly significant. | 正確 |
| ds-048 | Studies | have often produced | Studies have often produced inconsistent results. | 正確 |
| ds-049 | no previous study | has systematically compared | no previous study has systematically compared the energy efficiency … | 正確 |
| ds-050 | Researchers | have long debated | Researchers have long debated whether flexible schedules improve productivity. | 正確 |

結果：50／50 句主幹 S＋V 標註正確（要求至少抽查 15 句）。撰寫過程中修正的問題：

| 句 | 原稿問題 | 修正 |
| :--- | :--- | :--- |
| ds-008 | 「but have little effect on …」是受詞子句的一部分，不能標成 modifier | 改寫為讓步子句 `although the effect … appears limited` |
| ds-018、ds-024、ds-028、ds-045 | 原稿以 `and …`／`yet …` 帶出含限定動詞的對等子句，標 modifier 不妥 | 改用非限定關係子句、介系詞片語、同位語 |
| ds-024 | 字數 18（< 20） | 增加時間介系詞片語 `between March and May 2025` |

## 6. 閱讀策略（READING_STRATEGIES）

| 順序 | id | title（逐字） | tips 則數 | source |
| :--- | :--- | :--- | :--- | :--- |
| 1 | abstract | Abstract 摘要 | 5 | ORIGINAL |
| 2 | methodology | 方法論 | 5 | ORIGINAL |
| 3 | literature_review | 文獻回顧（Research Gap） | 5 | ORIGINAL |

tips 內容為繁體中文（台灣用語），英文訊號詞（如 `little is known`、`were recruited`）與本檔例句的句型呼應，方便學習者對照。

## 7. 寫入範圍

只寫入 `src/data/decoder.js`、`src/data/_records/decoder.md`；產生器與統計腳本放在 scratchpad（`CT-21/gen.mjs`、`CT-21/stat.cjs`），未寫入專案。

## 8. 回饋上游

無。

## 9. 變更紀錄

| 版本 | 日期 | 作者 | 說明 |
| :--- | :--- | :--- | :--- |
| 0.1 | 2026-10-30 | pg-content-agent | 初版：50 句長難句、3 主題閱讀策略、驗證與自查結果 |
