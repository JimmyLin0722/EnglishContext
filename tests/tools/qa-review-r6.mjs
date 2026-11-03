// QA（第 6 輪，PRD v0.14 版本號與介面精簡）：寫入 tests/results/qa-review.json（QA 判讀結果與人工 TC 清單），需在 run-all 之後執行
// 結構同 qa-review-r5.mjs；新增 v0.14 人工項目 TC-VER-H1～H3；TC-B03 改讀 boundary-r6（FE-63～FE-69）。
// 之後再執行 node tests/tools/rebuild-summary.mjs 以併入 summary.json
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RES = path.join(ROOT, "tests", "results");
const rd = (f) => JSON.parse(fs.readFileSync(path.join(RES, f), "utf8"));
const b = rd("boundary.json"), d = rd("boundary-delta.json");
const edge = fs.readdirSync(RES).filter((f) => f.endsWith("-edge.json")).map((f) => ({ f, r: rd(f) }));
const edgeTxt = edge.map((x) => `${x.f}：通過 ${x.r.filter((r) => r.result === "通過").length}、不適用（暫停）${x.r.filter((r) => r.result === "不適用（暫停）").length}、失敗 ${x.r.filter((r) => r.result === "失敗").length}（共 ${x.r.length}）`).join("；");
const edgeOk = edge.length >= 3 && edge.every((x) => x.r.every((r) => r.result === "通過" || r.result === "不適用（暫停）"));
const pg = d.rows.filter((x) => x.owner && !x.owner[0].startsWith("（"));
const auth = d.rows.filter((x) => x.owner && x.owner[0].startsWith("（") && !x.owner[0].includes("QA 自有")).map((x) => x.file);
const S = "qa-review";
const out = [
  { suite: S, tc: "TC-D18", ac: "AC-23-02、AC-23-03（architecture §8.4 紀錄完整性）", result: "通過", note: "沿用第 1 輪逐筆判讀；第 6 輪 src/data 無任何變動（git status 無 src/data，DS-31），records-check 本輪重跑" },
  { suite: S, tc: "TC-D19", ac: "AC-23-03（V-VOC-18 抽查）", result: "通過", note: "沿用第 1 輪抽查 301 筆、不合格 0；vocab 分檔本輪未修改" },
  { suite: S, tc: "TC-D20", ac: "AC-11-01（V-P5-05 正解唯一性）", result: "通過", note: "沿用第 1 輪 40 題全數正確；part5.js 本輪未修改" },
  { suite: S, tc: "TC-B01", ac: "（越界檢查：檔案歸屬）", result: b.orphan.length === 0 ? "通過" : "失敗", note: `boundary-check：屬於任務 ${b.owned.length}、人類／上游文件 ${b.human.length}、QA tests/ ${b.qa.length}、人類自放或主控授權（非 PG）${b.nonPg.length}［${b.nonPg.join("、")}］、不屬於任何任務 ${b.orphan.length}；任務 paths 中不存在 ${b.missing.join("、") || "無"}（90-overrides.css 只在發現問題時才寫，非缺陷）` },
  { suite: S, tc: "TC-B02", ac: "（越界檢查：原始需求、sources/、docs/、tests/）", result: "通過", note: "english_master_track.md 最後修改 2026-10-29 14:02（未修改）；sources/ 無檔案晚於 HEAD 8a266c3 提交時間（2026-11-03 16:35:57）；docs/ 本輪變動只有 PRD v0.14、契約三檔 v0.14、architecture v0.9、tasks.json v0.8（上游代理與主控）；docs/04-qa 在本輪 QA 開始前最後修改為第 5 輪（2026-11-03 16:35，QA），bug-reports/ 最後修改 09:23；tests/ 在本輪 QA 開始前與 HEAD 8a266c3 相同（git status 無 tests/ 變動），PG 未修改；package.json 只有 version 0.1.0→1.0.0 一行（git diff，Q-62 授權）" },
  { suite: S, tc: "TC-B03", ac: "（越界檢查：第 6 輪增量 FE-63～FE-69）", result: d.outside.length === 0 ? "通過" : "失敗", note: `boundary-r6：與 git HEAD ${d.head} 比對（含 .gitignore 的 dist/site/ 依修改時間）變動 ${d.rows.length} 個檔案；PG 任務 paths 內 ${pg.length} 個；超出 ${d.outside.length} 個${d.outside.length ? "：" + d.outside.map((x) => x.file).join("、") : ""}；授權例外 ${auth.length} 個（${auth.join("、")}）；任務 paths 中未變動 ${d.untouched.join("、") || "無"}` },
  { suite: S, tc: "TC-X-edge", ac: "AC-19-02（Chrome／Edge）跨瀏覽器冒煙、AC-34-01、AC-35-01、AC-35-02、AC-37-01、AC-42-01、AC-43-01", result: edgeOk ? "通過" : "失敗", note: `以 Microsoft Edge（headless）重跑：${edgeTxt}` },
];
const manual = [
  ["TC-M01", "AC-08-01、AC-08-09、AC-08-13、AC-08-14、AC-21-01、AC-21-03", "真實麥克風辨識、權限、收音條與資料不留存"],
  ["TC-M02", "AC-07-01～AC-07-05", "真實 TTS 語音"],
  ["TC-M03", "AC-19-02、AC-37-01、AC-38-05", "實際斷網以 file:// 開啟（v0.12：另確認標題列圖示與名稱照常顯示）"],
  ["TC-M04", "AC-19-03、AC-18-01", "雙擊開啟、關閉後重開"],
  ["TC-M05", "AC-20-01～AC-20-03、AC-26-01、AC-27-01、AC-27-02、AC-28-03～AC-28-06", "Android Chrome 實機觸控、底部導覽、滑動換卡"],
  ["TC-M06", "AC-24-01、AC-24-03", "跨裝置匯出匯入（v0.12：匯出前先展開「資料備份」）"],
  ["TC-M07", "AC-22-01～AC-22-05、AC-35-04", "基準環境效能量測（v0.12：量測點為「開始今日學習」可點擊）"],
  ["TC-M08", "AC-23-04", "原創性 20 筆精確片語搜尋"],
  ["TC-M09", "AC-27-03", "實機虛擬鍵盤不遮輸入欄"],
  ["TC-M10", "AC-29-02、AC-29-03", "Android 實機震動、iOS Safari 不震動不報錯"],
  ["TC-MIC-1", "AC-33-01", "V-MIC-1：Chrome、Edge 停留單字卡頁只詢問一次權限"],
  ["TC-MIC-2", "AC-33-02", "V-MIC-2：由導覽離開單字卡頁 1 秒內釋放麥克風、使用中圖示消失"],
  ["TC-MIC-3", "AC-33-03、AC-33-08", "V-MIC-3：真實說話時收音條、減少動態"],
  ["TC-MIC-4", "AC-08-09", "V-MIC-4：權限封鎖"],
  ["TC-MIC-5", "AC-33-05、AC-33-06", "V-MIC-5：拔除麥克風"],
  ["TC-PWA-H1", "AC-34-01、AC-34-02、AC-34-03、AC-34-06、AC-34-07、AC-34-09、AC-34-10", "V-PWA-H1：Windows 11 Chrome、Edge 正式網址：原生安裝與「安裝 App」按鈕（v0.12：在主控台展開「資料備份」後出現）、安裝名稱 EnglishContext、獨立視窗標題列 EnglishContext、Manifest 面板無錯誤；（v0.14）頁尾版本行與 file:// 版文字相同"],
  ["TC-PWA-H2", "AC-34-02、AC-34-03、AC-35-03、AC-38-02", "V-PWA-H2：Android Chrome：安裝、圖示遮罩、啟動畫面背景色 #eef4fa（v0.12）、飛航模式啟動、狀態列顏色 #1e9bf0（見 TC-LAY-H3）"],
  ["TC-PWA-H3", "AC-34-05、AC-34-08", "V-PWA-H3：iOS Safari：加入主畫面名稱 EnglishContext、圖示、無安裝按鈕"],
  ["TC-LAY-H1", "AC-41-03、AC-41-04、E-93", "實機首次畫面固定底部列與安全區：Android Chrome、iPhone Safari（含瀏海／Home Indicator 機型）清除網站資料後開啟，不捲動即可看到摘要行、「開始學習」「從備份還原」；捲到中段與底部仍固定可點；最後一列與頁尾連結可捲到底部列上方；底部列下緣不被 Home Indicator 擋住"],
  ["TC-LAY-H2", "AC-38-05", "標題列圖示清晰度：Windows（縮放 100%、150%）、Android、iPhone 檢視首次畫面與主控台標題列圖示，藍底、橘色對話框與白色 EC 字樣清楚、無鋸齒或模糊，與 App 圖示一致"],
  ["TC-VER-H1", "AC-42-01、AC-27-03、AC-41-04、E-95", "實機版本行：Android Chrome、iPhone Safari 以正式網址開啟與從主畫面啟動已安裝 App，首次畫面與 4 個功能區、資料來源頁捲到底，「版本 1.0.0（建置 xxxxxxx）」完整顯示在底部導覽列或固定底部列上方、單行不裁切；含瀏海／Home Indicator 機型"],
  ["TC-VER-H2", "AC-42-02、AC-36-07", "部署後比對：push 後 Actions 成功，正式網址 https://jimmyfantasyworld.com/ 檢視原始碼 emt-app-version＝1.0.0、emt-build-id 前 7 碼＝頁尾建置碼＝sw.js BUILD_ID 前 7 碼（CI 為 LF 建置，建置碼與本機不同屬正常）"],
  ["TC-VER-H3", "AC-42-04 (b)、AC-36-03、E-97", "下次發布：人類只把 package.json version 改為下一版（例 1.0.1）後 push；已安裝的 App 連網開啟出現「有新版本，重新整理」，按下後頁尾版本行為新版本號；並確認 version 與預期一致（建置只驗格式不驗遞增）"],
  ["TC-LAY-H3", "AC-38-02、AC-34-04", "實機狀態列顏色：Android Chrome 以正式網址開啟與從主畫面啟動已安裝 App，網址列／狀態列為亮藍 #1e9bf0；已安裝 v0.11 者更新後顏色隨之改變（V-PWA-H1／H2 新 theme_color）"],
];
for (const [tc, ac, note] of manual) out.push({ suite: S, tc, ac, result: "待人工", note });
fs.writeFileSync(path.join(RES, "qa-review.json"), JSON.stringify(out, null, 2));
console.log(out.map((r) => `${r.tc} ${r.result}`).join("\n"));
