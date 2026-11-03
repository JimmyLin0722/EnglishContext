// QA（第 3 輪）：寫入 tests/results/qa-review.json（QA 人工判讀結果與人工 TC 清單），需在 run-all 之後執行（讀取 Edge 冒煙與越界結果）
// 之後再執行 node tests/tools/rebuild-summary.mjs 或重跑 run-all 以併入 summary.json
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RES = path.join(ROOT, "tests", "results");
const rd = (f) => JSON.parse(fs.readFileSync(path.join(RES, f), "utf8"));
const b = rd("boundary.json"), d = rd("boundary-delta.json");
const edge = fs.readdirSync(RES).filter((f) => f.endsWith("-edge.json")).map((f) => ({ f, r: rd(f) }));
const edgeTxt = edge.map((x) => `${x.f}：通過 ${x.r.filter((r) => r.result === "通過").length}、不適用（暫停）${x.r.filter((r) => r.result === "不適用（暫停）").length}、失敗 ${x.r.filter((r) => r.result === "失敗").length}（共 ${x.r.length}）`).join("；");
const edgeOk = edge.length >= 2 && edge.every((x) => x.r.every((r) => r.result === "通過" || r.result === "不適用（暫停）"));
const S = "qa-review";
const out = [
  { suite: S, tc: "TC-D18", ac: "AC-23-02、AC-23-03（architecture §8.4 紀錄完整性）", result: "通過", note: "沿用第 1 輪逐筆判讀（V-VOC-17 187 筆、V-VOC-09 原創原因 40 筆、_records 缺列 0）。第 3 輪 src/data 自 2026-10-30 起未修改（TC-B03），records-check 本輪重跑通過" },
  { suite: S, tc: "TC-D19", ac: "AC-23-03（V-VOC-18 抽查）", result: "通過", note: "沿用第 1 輪抽查 301 筆、不合格 0；第 3 輪資料未修改（TC-B03）" },
  { suite: S, tc: "TC-D20", ac: "AC-11-01（V-P5-05 正解唯一性）", result: "通過", note: "沿用第 1 輪 40 題全數正確；第 3 輪資料未修改（TC-B03）" },
  { suite: S, tc: "TC-B01", ac: "（越界檢查：檔案歸屬）", result: b.orphan.length === 0 ? "通過" : "失敗", note: `boundary-check：屬於任務 ${b.owned.length}、人類／上游文件 ${b.human.length}、QA tests/ ${b.qa.length}、人類自放（非 PG）${b.nonPg.length}［${b.nonPg.join("、")}］、不屬於任何任務 ${b.orphan.length}；任務 paths 中不存在 ${b.missing.join("、") || "無"}（90-overrides.css 只在發現問題時才寫，非缺陷）` },
  { suite: S, tc: "TC-B02", ac: "（越界檢查：sources/、english_master_track.md、docs/）", result: "通過", note: "english_master_track.md 最後修改 2026-10-29 14:02；sources/ 無 2026-10-30 10:07 之後的修改；docs/ 於第 3 輪期間的修改只有 PRD v0.10（pm-agent，JimmyLin 核准）、契約 v0.10 三檔（sa-agent，主控代核）、architecture v0.6、tasks.json v0.5（sd-agent／主控，JimmyLin 核准）與 docs/04-qa（QA），未發現 PG 修改；bug-reports 未被 PG 修改" },
  { suite: S, tc: "TC-B03", ac: "（越界檢查：第 3 輪增量）", result: d.outside.length === 0 ? "通過" : "失敗", note: `boundary-delta：${d.since} 之後修改 ${d.rows.length} 個檔案，超出 FE-${d.minFe} 以後任務 paths ${d.outside.length} 個${d.outside.length ? "：" + d.outside.map((x) => x.file).join("、") : ""}。主控授權追加的 FE-41 backup.test.js、FE-43 views/flashcards.js、flashcards.test.js 已在 tasks.json paths 內；src/data/ 未修改` },
  { suite: S, tc: "TC-X-edge", ac: "AC-19-02（Chrome／Edge）跨瀏覽器冒煙", result: edgeOk ? "通過" : "失敗", note: `以 Microsoft Edge（headless）重跑：${edgeTxt}` },
];
const manual = [
  ["TC-M01", "AC-08-01、AC-08-09、AC-08-13、AC-08-14、AC-21-01、AC-21-03", "真實麥克風辨識、權限、收音條與資料不留存"],
  ["TC-M02", "AC-07-01～AC-07-05", "真實 TTS 語音"],
  ["TC-M03", "AC-19-02", "實際斷網以 file:// 開啟"],
  ["TC-M04", "AC-19-03、AC-18-01", "雙擊開啟、關閉後重開"],
  ["TC-M05", "AC-20-01～AC-20-03、AC-26-01、AC-27-01、AC-27-02、AC-28-03～AC-28-06", "Android Chrome 實機觸控、底部導覽、滑動換卡"],
  ["TC-M06", "AC-24-01、AC-24-03", "跨裝置匯出匯入"],
  ["TC-M07", "AC-22-01～AC-22-05", "基準環境效能量測"],
  ["TC-M08", "AC-23-04", "原創性 20 筆精確片語搜尋"],
  ["TC-M09", "AC-27-03", "實機虛擬鍵盤不遮輸入欄"],
  ["TC-M10", "AC-29-02、AC-29-03", "Android 實機震動、iOS Safari 不震動不報錯"],
  ["TC-MIC-1", "AC-33-01", "V-MIC-1：Chrome、Edge 停留單字卡頁只詢問一次權限"],
  ["TC-MIC-2", "AC-33-02", "V-MIC-2：離開單字卡頁 1 秒內釋放麥克風、使用中圖示消失"],
  ["TC-MIC-3", "AC-33-03、AC-33-08", "V-MIC-3：真實說話時收音條、減少動態"],
  ["TC-MIC-4", "AC-08-09", "V-MIC-4：權限封鎖"],
  ["TC-MIC-5", "AC-33-05、AC-33-06", "V-MIC-5：拔除麥克風"],
];
for (const [tc, ac, note] of manual) out.push({ suite: S, tc, ac, result: "待人工", note });
fs.writeFileSync(path.join(RES, "qa-review.json"), JSON.stringify(out, null, 2));
console.log(out.map((r) => `${r.tc} ${r.result}`).join("\n"));
