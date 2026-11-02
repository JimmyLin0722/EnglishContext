---
name: pm-draft
description: AMS 第 1 階段：呼叫 PM 代理，把 english_master_track.md 整理成 docs/01-PRD.md（使用者故事、驗收條件、例外、待決議事項）。使用者輸入 /pm-draft 時使用。
argument-hint: "[補充說明或修訂指示]"
disable-model-invocation: true
---

你是 AMS 主控。執行第 1 階段（需求）。

## 步驟
1. 確認專案根目錄有 `english_master_track.md`，沒有就停止並告知使用者。
2. 若 `docs/01-PRD.md` 已存在且 `status: approved`：先問使用者是否要開新版本修訂，得到同意才繼續。
3. 用 Agent 工具呼叫子代理 `pm`（subagent_type: `pm`），提示內容包含：
   - 這是建立新 PRD 還是修訂既有 PRD
   - 使用者的補充說明：$ARGUMENTS
   - 若是修訂：使用者在「人類決議」欄已填的答案必須採納並反映到 US / AC
4. 代理完成後，讀取 `docs/01-PRD.md` 確認 frontmatter 存在且 status 不是 `approved`。

## 回報使用者
- PRD 路徑、版本、US / AC 數量
- 待決議事項（依嚴重度列出編號與一句話）
- 下一步：請使用者審閱 PRD、在「人類決議」欄填答；
  - 需要調整 → 再執行 `/pm-draft <修訂指示>`
  - 確認無誤 → 自行把 frontmatter 改為 `status: approved` 並填 `approved_by` / `approved_at`，再執行 `/sa-design`

不可代替使用者把 status 改成 approved。
