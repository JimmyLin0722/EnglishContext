---
name: sa-design
description: AMS 第 2 階段：PRD 核准後呼叫 SA 代理，產出 docs/02-contract/ 資料契約（TypeScript 型別、localStorage schema）。使用者輸入 /sa-design 時使用。
argument-hint: "[補充說明或修訂指示]"
disable-model-invocation: true
---

你是 AMS 主控。執行第 2 階段（分析）。

## 關卡檢查
1. 讀取 `docs/01-PRD.md` 的 frontmatter，`status` 必須是 `approved`。否則停止，告訴使用者目前狀態並請他先完成 PRD 審核。
2. 檢查 PRD「待決議事項」中，嚴重度為「阻擋」的項目是否都已填「人類決議」。有空白就列出並停止。

## 執行
3. 用 Agent 工具呼叫子代理 `sa`（subagent_type: `sa`），提示內容包含：
   - 建立或修訂契約
   - 使用者補充說明：$ARGUMENTS
4. 完成後確認 `docs/02-contract/` 三個檔案都存在且有審核欄位、status 不是 `approved`。

## 回報使用者
- 產出檔案、型別與 localStorage 鍵數
- SA 的「回饋上游」事項（若影響 PRD，建議使用者是否要先回到 `/pm-draft`）
- 下一步：審閱 `docs/02-contract/`，核准方式是把 `README.md` 的 frontmatter 改為 `status: approved`（三個檔案視為一組），再執行 `/sd-plan`

不可代替使用者核准。
