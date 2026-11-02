---
doc: CT-22-RECORD
version: 0.1
status: in-review
author: pg-content-agent
approved_by:
approved_at:
---

# CT-22 交付紀錄：學術句型庫 `phrasebank.js`

## 1. 摘要

| 項目 | 內容 |
| :--- | :--- |
| 任務 | CT-22（第 2 批，`/pg-run`） |
| 涵蓋 | US-15、US-16、US-23、AC-15-02、AC-16-03、AC-23-04 |
| 依據 | 契約 v0.4（`PhraseTemplate`、`PhraseCategory`、README §7.6 V-PH-01～03、C-5）、architecture.md v0.2（§8.3 O-4）、PRD v0.6 |
| 產出 | `src/data/phrasebank.js`（`window.ACADEMIC_PHRASEBANK`）、本檔 |
| 格式 | 開頭 4 行註解 + 陣列字面值；每則一行 `JSON.stringify`，鍵順序 `id`、`category`、`template`、`descriptionZh`、`exampleEn`、`source` |
| 日期 | 2026-10-30 |

## 2. 分類統計

| 類別 | 標籤（契約常數） | id 範圍 | 則數 | 含 `exampleEn` |
| :--- | :--- | :--- | ---: | ---: |
| `gap` | 研究空白 Gap | ph-001～ph-025 | 25 | 25 |
| `aim` | 研究目的 Aim | ph-026～ph-050 | 25 | 25 |
| `findings` | 研究結果 Findings | ph-051～ph-075 | 25 | 25 |
| `limitations` | 研究限制 Limitations | ph-076～ph-100 | 25 | 25 |
| 合計 | | | 100 | 100 |

## 3. 撰寫規則

| 代號 | 規則 |
| :--- | :--- |
| PH-W1 | `template` 為完整英文句型，可替換處一律以半形方括號標示（如 `[topic]`、`[method]`）；100 則皆至少含 1 個替換處，括號成對 |
| PH-W2 | `descriptionZh` 以類別關鍵字開頭（「研究空白」「研究目的」「研究結果」「研究限制」），再說明用途、語氣與常見位置，供中文關鍵字搜尋（AC-16-01） |
| PH-W3 | `exampleEn` 為套用後的完整例句，不含方括號；情境以職場、教育、公共衛生、商業等一般領域為主 |
| PH-W4 | 英文字 `gap`：template 含 gap 5 則（ph-006、ph-014、ph-020、ph-025、ph-041），template 或 descriptionZh 含 gap 合計 9 則（AC-16-01 搜尋 `gap` 有結果） |
| PH-W5 | 不含 `<`、`>`、`undefined`、`null`（O-4）；descriptionZh 無簡體專用字（以 `simplifiedOnlyChars` 1,067 字集檢查，0 命中） |

## 4. 原創性自查（AC-23-04、O-4）

| 項目 | 說明 |
| :--- | :--- |
| 撰寫方式 | 全部 100 則由本代理依學術寫作常見功能（指出缺口、陳述目的、報告結果、承認限制）自行撰寫，未參考或改寫 Manchester Academic Phrasebank 或市售書籍 |
| 避開常見原句 | 撰寫後逐則自查，凡與該句庫廣為流傳的句子結構過於接近者即改寫，例如：「Little attention has been paid to…」（契約範例句，未採用）、「Few researchers have addressed…」→ 改為 ph-009 視角句、「This project was undertaken to…」→ 改為 ph-034 前導研究句、「Taken together, these results suggest…」→ 改為 ph-061「Viewed as a whole, the evidence points to…」、「These results are consistent with those of…」→ 改為 ph-057、「The findings of this study have to be seen in light of some limitations」→ 改為 ph-088、「This study set out to…」→ 改為 ph-026、「An unexpected finding was…」→ 改為 ph-066 |
| 殘留風險 | 學術英文有大量通用片語（如 remain largely unexplored、cannot be excluded），短片語難以完全避免與任何出版物部分相同；本庫整句皆為自行組合，未發現整句逐字相同者。QA 依 AC-23-04 以精確片語搜尋抽樣時，若有命中請開 BUG 退回改寫 |
| `source` | 100 則皆為 `"ORIGINAL"`（C-5） |

## 5. 驗證結果

| 檢查 | 指令／方式 | 結果 |
| :--- | :--- | :--- |
| V-PH-01～03 | `node src/data/_tools/validate.mjs --file src/data/phrasebank.js --stage final` | 錯誤 0、警告 0，exit 0（V-PH-01 通過 105、V-PH-02 通過 402、V-PH-03 通過 200） |
| 4 類各 25、id 依類別順序 | scratchpad 自查腳本 | 通過（ph-001～ph-100 連號，每 25 則一類） |
| template 不分大小寫不重複 | V-PH-02 | 通過 |
| 含 gap ≥ 5 則 | scratchpad 自查腳本（template + "\n" + descriptionZh 轉小寫比對，同 architecture.md 搜尋做法） | 9 則，通過 |
| 每則有替換處、例句無方括號、禁用字樣、簡體字 | scratchpad 自查腳本 | 全部通過 |
| 寫入範圍 | 只寫 `src/data/phrasebank.js`、`src/data/_records/phrasebank.md` | 通過 |

## 6. 回饋上游

無。

## 變更紀錄

| 版本 | 日期 | 作者 | 說明 |
| :--- | :--- | :--- | :--- |
| 0.1 | 2026-10-30 | pg-content-agent | 初版：100 則原創句型 |
