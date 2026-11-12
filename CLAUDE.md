# English Master Track — AMS（Agentic Multi-Agent System）開發規範

本專案以多代理協作方式開發：PM → SA → SD → PG（Content / Frontend）→ QA。
每個角色是 `.claude/agents/` 下的子代理，只透過 `docs/` 中的結構化文件交接；人類在每個階段結束時審核。

## 原始需求

- `english_master_track.md`（專案根目錄）是使用者提供的原始需求，**任何代理都不得修改**。

## 階段、指令與產出物

| 階段 | 指令 | 子代理 | 輸入 | 產出物 | 進入條件 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 需求 | `/pm-draft` | `pm` | `english_master_track.md` | `docs/01-PRD.md` | 無 |
| 2 分析 | `/sa-design` | `sa` | `docs/01-PRD.md` | `docs/02-contract/data-schema.ts`、`docs/02-contract/storage-schema.json`、`docs/02-contract/README.md` | PRD 為 `approved` |
| 3 設計 | `/sd-plan` | `sd` | PRD + 契約 | `docs/03-design/architecture.md`、`docs/03-design/tasks.json` | 契約為 `approved` |
| 4 實作 | `/pg-run` | `pg-content`、`pg-frontend` | `tasks.json` 中的任務 + 契約 | `src/data/`、`src/app/` | tasks 為 `approved` |
| 5 驗收 | `/qa-verify` | `qa` | 程式碼 + PRD 驗收條件 | `docs/04-qa/test-plan.md`、`docs/04-qa/test-report.md`、`docs/04-qa/bug-reports/BUG-xxx.md` | 所有指定任務為 `done` |

**禁止跨階段**：代理只做自己階段的事；發現上游文件有問題時，寫進自己產出物的「回饋上游」段落，不得自行修改上游文件。

## 審核關卡（Human-in-the-Loop）

每份 Markdown 產出物開頭必須有以下 frontmatter（JSON 檔改用頂層 `"meta"` 物件，TS 檔改用開頭註解區塊，欄位相同）：

```yaml
---
doc: PRD            # 文件代號
version: 0.1
status: draft       # draft | in-review | approved
author: pm-agent
approved_by:
approved_at:
---
```

- 代理只能寫 `draft` 或 `in-review`，**絕對不可以把 status 改為 `approved`**，也不可填 `approved_by`。
- 只有人類能核准。指令執行前會檢查上游文件是否為 `approved`，未核准就停止並提示。
- 已核准文件若需修改，代理要把 `status` 改回 `draft`、`version` 遞增，並在文末「變更紀錄」寫明原因。

## 追溯編號

全專案使用同一套編號，任何文件引用時都要寫編號：

- 原始需求：`FR-x.y`、`NFR-x`（沿用規格書）
- 使用者故事：`US-xx`
- 驗收條件：`AC-xx-yy`（屬於 `US-xx`）
- 待決議事項：`Q-xx`
- 任務：`CT-xx`（內容）、`FE-xx`（前端）
- 測試案例：`TC-xx`（需標註對應 `AC`）
- 缺陷：`BUG-xxx`

## 架構限制（來自原始需求，除非 PRD 決議變更）

- 最終交付為單一離線可執行的 `.html` 檔，無後端伺服器。
- 資料持久化使用瀏覽器 `localStorage`。
- `src/data/`：內容資料（字庫、題庫、例句、句型），由 `pg-content` 負責。
- `src/app/`：介面、狀態、演算法，由 `pg-frontend` 負責。
- PG 代理只能寫自己負責的目錄；QA 會檢查是否越界。

## 第 4 階段自動化授權（JimmyLin，2026-10-30）

| 項目 | 規則 |
| :--- | :--- |
| 進入 `/pg-run` | `architecture.md`、`tasks.json` 仍須人類核准一次；核准後 `/pg-run all` 自動逐批執行，不需每批停下來簡報 |
| PG 遇到問題 | 主控自動派 `sa`／`sd` 修訂契約或設計，不需先問人類 |
| 主控代核（小修） | 不改 PRD、不改 localStorage 持久化結構（`schemaVersion` 不變）的契約／設計修訂，由主控代核：`status: approved`、`approved_by: JimmyLin（授權主控代核）`、`approved_at` 填日期，並在該文件變更紀錄註明「主控代核」與原因 |
| 必須停下來問人類 | 需要修改 PRD（回 `pm`）、localStorage 持久化結構變更、BUG 超過 3 次來回（`escalated`） |

此授權僅限上述範圍；PRD 永遠只有人類能核准。

## 改動分級（主控接到需求先判斷，2026-11-11 起）

| 等級 | 判斷條件 | 流程 |
| :--- | :--- | :--- |
| 小修 | 不新增、不改變任何 AC 的行為；不動契約與 localStorage；例如錯字、顏色、間距、一句非契約文案、單檔明顯 bug | 主控直接改 → 跑相關測試與建置 → 在 `docs/changelog.md` 記一列（日期、內容、檔案、測試結果）；**不改** PRD／契約／架構的版本與 status，不派子代理 |
| 中修 | 新增或修改少量 US／AC，不改 localStorage 持久化結構 | `pm` 改 PRD（人類核准）→ **只派 `sd`**，授權它同一輪修訂契約與設計（例外於「禁止跨階段」，主控代核）→ `pg` → `qa` 只驗本次範圍 |
| 大改 | 新功能群、改版、localStorage 結構變更 | 完整五個角色 |

- PRD 或契約有逐字規定的文案、數值，改它就不算小修。
- 判斷不了時以較高等級處理，並告知使用者採用哪一級。

## 省 token 規則

- **閱讀清單**：主控交辦子代理時必須列出要讀的檔案與範圍（§章節、US／AC、任務或 BUG 編號），並寫明「清單外不用讀」。用編號指定，不用行號。
- **定位而非通讀**：子代理用 Grep 依編號找到段落，只讀命中處前後；不整份讀 PRD、契約、架構。
- **封存**：`docs/archive/` 放歷史（已完成任務 `tasks-done.json`、舊變更紀錄、已處理的回饋上游）。主文件只留現行條文、未處理事項與最新變更紀錄。子代理預設不讀封存檔，主文件找不到某編號時才去 grep。
- **何時封存**：每次發版後，主控把 `done` 任務、已處理的回饋上游、舊變更紀錄移到 `docs/archive/`（屬主控代核，原文照搬、編號不變）。
- **寫法**：正文直接寫現行規則，不加「（v0.x 新增）」「v0.y 見 §z」等歷史標註；已決議的 Q 要把結論寫進正文條文。
- **QA 範圍**：平常只驗本次改動的 AC／任務與相關測試；全套回歸只在發版前（`/qa-verify release`）跑。

## 退回重修迴圈

QA 開出的 `BUG-xxx` 由主控派回對應 PG 修正，同一張 BUG 最多來回 **3 次**；超過即標記 `escalated`，停下來交給人類判斷。

## 語言與風格

- 所有文件、提示詞、註解使用**繁體中文（台灣用語）**；英文學習內容本身除外。
- 文件用 Markdown，表格優先，避免冗長敘述。
