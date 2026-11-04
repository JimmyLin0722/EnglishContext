---
doc: FE-70-samples
version: 0.1
status: in-review
author: pg-frontend-agent
approved_by:
approved_at:
---

# v0.14／v0.7 持久化樣本（FE-70，v2 → v3 遷移測試夾具）

> **本目錄唯讀，後續任務不得重新產生或改寫**（architecture.md v0.10 D-15、§7.21.1）。
> 使用者：`migrate-v3.test.js`（FE-73）、`store-track.test.js`（FE-74）；自身檢查：`samples.test.js`。

## 產生方式

| 項目 | 內容 |
| :--- | :--- |
| 方式 | **首選**：無頭 Chromium（`playwright-core` 1.64.1 + 本機 Chrome `C:/Program Files/Google/Chrome/Application/chrome.exe`，headless）以 `file://` 開啟 `dist/english-master-track.html`，全新 browser context（網站資料為空） |
| 交付檔 | `dist/english-master-track.html`，`<meta name="emt-app-version" content="1.0.0">`，3,322,315 bytes |
| 交付檔 SHA-256 | `fc074ac341a398b0f0c218f984553a2544bfb7d5dcc741e48032a1ab617a1b62` |
| 時間控制 | `page.clock` 可用：`page.clock.install({ time: D − 1 10:00 })`，步驟 (4) 前 `page.clock.setSystemTime(D 10:00)` |
| 本地日期 | D = **2026-11-04**；D − 1 = **2026-11-03** |
| 時區 | `Asia/Taipei`（UTC+08:00） |
| 產生日期 | 2026-11-04 |

## 操作序列（architecture.md §7.21.1）

| 步驟 | 日期 | 操作 | 執行結果 |
| :--- | :--- | :--- | :--- |
| (1) | D − 1 | `localStorage.clear()` 後重新載入 → 首次畫面點「棕」→「開始學習」 | `entry = main` |
| (2) | D − 1 | 難易度設定頁表單新增 `Monetization`（營利化；變現）、`Latency`（延遲）；Console `EMT.store.actions.injectTemplate("cs")` | `{ injected: 9, skipped: 1 }`（`Latency` 與範本重複被略過），`customVocab` 11 筆（2 manual、9 template） |
| (3) | D − 1 | 單字卡翻面 3 張（翻面 → 下一張 ×3）；切到測驗模式作答 4 題（對、錯、對、對） | `vocabQuiz = { answered: 4, correct: 3 }` |
| (4) | D | Console `EMT.store.actions.acknowledgeSttNotice()` | `sttNoticeAcknowledged = true` |
| (4b) | D | **偏離設計（見下）**：切回單字卡模式，下一張後翻面 2 張 | `todayLearned = { date: "2026-11-04", wordKeys: ["have", "it"] }` |
| (5) | D | 模擬測驗作答 6 題（對、錯、對、對、錯、對），前 5 題按「下一題」，第 6 題作答後**不按** | `part5 = { currentIndex: 5, lockedSelection: 0, phase: "question", roundAnswered: 6, roundCorrect: 4, totalAnswered: 6, totalCorrect: 4 }` |
| (6) | D | 難易度設定頁點「綠」卡片，**不套用** | `goal = { draftScore: 725, appliedScore: 465, appliedColor: "brown", effectiveColor: "brown" }` |
| (7) | D | `localStorage.getItem("englishMasterTrack:state")` 存為 `v014-state.json`；主控台展開「資料備份」→「匯出備份」，下載檔 `english-master-track-backup-20261104.json` 原始位元組存為 `v014-backup.json` | 匯出前後主鍵字串相同；頁面錯誤 0 |

最終 `streak = { days: 2, lastActiveDate: "2026-11-04" }`、`learnedHistory = { "2026-11-03": 7, "2026-11-04": 2 }`。

**偏離設計（4b）**：§7.21.1 預期「`learnedHistory` 有 2 天」，但照序列執行時 D 當天只有模擬測驗作答（LR-1：不計今日已學），實測 `learnedHistory` 只有 D − 1 一天、`todayLearned` 為預設值。為達成設計預期並讓 D + 1 換日測試有實際作用，在 D 當天加入翻面 2 張（4b）。其他步驟照設計。

## 衍生樣本

| 檔案 | 產生方式 |
| :--- | :--- |
| `v07-state.json` | `persist.test.js` 的 `V07_RAW` 求值後的字串（逐字，單行） |
| `v07-backup.json` | `v014-backup.json` 刪除 `data.todayLearned`、`data.learnedHistory`，`schemaVersion` 改為 1，`JSON.stringify(obj, null, 2)` 輸出（結尾無換行，與匯出檔相同） |

## SHA-256

| 檔案 | bytes | SHA-256 |
| :--- | ---: | :--- |
| `v014-state.json` | 5,687 | `0b8979e415c6a2e6f99404ca8ac3e1ab439b7e51fa7070c8afc0119a5f1fc6e6` |
| `v014-backup.json` | 7,443 | `b034e29c711a2b8dda6d6a7df904762c07d773bf72e823e0c7862ab48e0e8702` |
| `v07-state.json` | 1,051 | `f9c1cd2f555a28d60895763f2295a4472e42ed138d3d31cdec33eba915ec27e6` |
| `v07-backup.json` | 7,253 | `da0165d3c1be5b01e1117c8443d194643e39a9f24379a3489705fbcd743d0061` |

## 使用注意

- 讀取以 `fs.readFileSync(path, "utf8")` 取得原字串，**不可**重新排版後再比對位元組。
- 讀取樣本的測試請以 `now` = D（2026-11-04）當天 12:00（本地）執行；D + 1 只允許 V-ST-09～V-ST-11 換日正規化造成的差異。
