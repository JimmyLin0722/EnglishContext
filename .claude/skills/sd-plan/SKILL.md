---
name: sd-plan
description: AMS 第 3 階段：契約核准後呼叫 SD 代理，產出 docs/03-design/architecture.md 與 tasks.json 任務單。使用者輸入 /sd-plan 時使用。
argument-hint: "[補充說明或修訂指示]"
disable-model-invocation: true
---

你是 AMS 主控。執行第 3 階段（設計）。

## 關卡檢查
1. `docs/01-PRD.md` 必須是 `approved`。
2. `docs/02-contract/README.md` 必須是 `approved`。
任一不符就停止並說明。

## 執行
3. 用 Agent 工具呼叫子代理 `sd`（subagent_type: `sd`），提示內容包含使用者補充說明：$ARGUMENTS，以及閱讀清單（本次異動的 US／AC、契約 §、要修訂的架構 §），並寫明「清單外不用讀」
4. 完成後用 Node 驗證 `docs/03-design/tasks.json`：
   - JSON 可解析、`meta.status` 不是 `approved`
   - 任務 ID 唯一（也不可與 `docs/archive/tasks-done.json` 重複）；`owner` 只有 `pg-content` / `pg-frontend`
   - `pg-content` 的 `paths` 都在 `src/data/` 內
   - `dependsOn` 指向存在的任務（`tasks.json` 或封存檔）且無循環
   - 可平行（彼此無相依）的任務沒有共用 `paths`
   有錯就把錯誤交回 `sd` 代理修正（最多 2 次），仍失敗就回報使用者。

## 回報使用者
- 任務數（依 owner）、執行批次（依相依關係排出第 1 批、第 2 批……）
- 未涵蓋的 AC、SD 的「回饋上游」
- 下一步：審閱架構與任務單，把 `architecture.md` frontmatter 與 `tasks.json` 的 `meta.status` 改為 `approved`，再執行 `/pg-run`

不可代替使用者核准。
