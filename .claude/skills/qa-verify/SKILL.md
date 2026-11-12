---
name: qa-verify
description: AMS 第 5 階段：呼叫 QA 代理依 PRD 驗收條件測試，並把 BUG 派回對應 PG 代理修正（最多 3 輪）。使用者輸入 /qa-verify 時使用，可指定 US、任務、BUG 範圍，或 release 跑全套回歸。
argument-hint: "<US-xx… | FE-xx/CT-xx… | BUG-xxx… | release>"
disable-model-invocation: true
---

你是 AMS 主控。執行第 5 階段（驗收）。範圍：$ARGUMENTS

| 範圍 | 驗什麼 |
| :--- | :--- |
| US／AC／任務／BUG 編號 | 只驗這些 AC 對應的 TC 與相關自動化測試，加上越界檢查（平常用這個） |
| `release`（或 `all`） | 全套回歸，只在發版前跑 |
| 未提供 | 依本輪任務與最近的 git 變更推定範圍，先告知使用者推定結果再執行；**不**預設跑全套 |

## 關卡檢查
1. 範圍內涉及的任務在 `docs/03-design/tasks.json` 中都必須是 `done`（在 `docs/archive/tasks-done.json` 的任務視為 `done`）。否則列出未完成任務並停止。

## 驗收
2. 用 Agent 工具呼叫子代理 `qa`（subagent_type: `qa`），提示內容包含驗收範圍與閱讀清單（要讀的 AC、契約 §、測試檔），並寫明「清單外不用讀」；範圍不是 `release` 時明說「不跑全套回歸」。
3. 讀取 QA 回報與 `docs/04-qa/bug-reports/` 中 `status: open` 的 BUG。

## 退回重修迴圈（Inner Loop）
4. 對每張 `open` 的 BUG：
   - `retries` ≥ 3 → 改為 `escalated`，不再派工。
   - 否則依 BUG 的 `owner` 派給對應 PG 代理（彼此不衝突的可平行），提示內容包含 BUG 檔路徑、對應任務 ID 與閱讀清單，提醒只能改該任務 `paths` 內的檔案。對應任務的 `retries` 加 1。
5. PG 全部回報後，再呼叫 `qa` 代理**只驗證這些 BUG**（並回歸測試相關 TC）。
6. 重複步驟 4～5，直到沒有 `open` 的 BUG 或全部已 `escalated`。

## 發版後封存
7. 範圍為 `release` 且全部通過時，提醒使用者可以封存：把 `done` 任務、已處理的回饋上游、舊變更紀錄移到 `docs/archive/`（見 CLAUDE.md「省 token 規則」）。

## 回報使用者
- 測試總數、通過 / 失敗 / 待人工；全套時加 AC 覆蓋率
- 已修復的 BUG、`escalated` 的 BUG（需使用者判斷）
- 人工驗收清單（例如實際麥克風收音、不同瀏覽器）
- 報告路徑 `docs/04-qa/test-report.md`
