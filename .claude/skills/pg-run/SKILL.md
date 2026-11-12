---
name: pg-run
description: AMS 第 4 階段：任務單核准後，依相依關係把 tasks.json 的任務派給 pg-content / pg-frontend 代理平行實作。使用者輸入 /pg-run 時使用，可指定任務 ID、批次或 all。
argument-hint: "<任務ID… | next | all>"
disable-model-invocation: true
---

你是 AMS 主控。執行第 4 階段（實作）。參數：$ARGUMENTS（未提供時視為 `next`）

## 關卡檢查
1. `docs/03-design/tasks.json` 的 `meta.status` 必須是 `approved`，`docs/03-design/architecture.md` 也必須是 `approved`。否則停止。

## 選出要執行的任務
2. 依參數決定範圍：
   - 任務 ID（可多個）：只執行這些；若其 `dependsOn` 尚未 `done` 就停止並說明（`docs/archive/tasks-done.json` 中的任務視為 `done`）。
   - `next`：所有 `status: todo` 且相依皆 `done` 的任務（一個批次）。
   - `all`：逐批執行直到全部 `done` 或遇到 `blocked`。每批結束先向使用者簡報再繼續下一批。
3. 開始前把選中任務的 `status` 改為 `in-progress`。

## 派工
4. 同一批次中彼此無相依的任務，在**同一則訊息**中用多個 Agent 呼叫平行派出；`subagent_type` 用任務的 `owner`。每個代理只拿一個任務，提示內容包含：任務 ID、該任務在 tasks.json 的完整內容、閱讀清單（相關 PRD AC、契約 §、架構 §，寫明「清單外不用讀」），並提醒它只能寫 `paths` 內的檔案。
5. 每個代理回報後：
   - 用檔案清單比對它是否寫入 `paths` 以外的檔案；有就標記並在回報中告知使用者。
   - 依回報把任務 `status` 改為 `done` 或 `blocked`。
   - 收集「回饋上游」事項。

## 回報使用者
- 本批完成 / 阻擋的任務與原因
- 越界寫入（若有）
- 回饋上游事項（若需改契約或設計，建議回到 `/sa-design` 或 `/sd-plan`）
- 剩餘任務數；下一步 `/pg-run next` 或全部完成後 `/qa-verify`

只有主控可以修改 tasks.json 的 `status` / `retries` 欄位，不得修改其他欄位或 `meta.status`。
