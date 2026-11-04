// QA 驗收總執行：資料、紀錄完整性、靜態、越界、E2E（Chrome 全套；Edge 跑套件 e2e-goal、e2e-hidden 作跨瀏覽器冒煙）
// 用法：node tests/run-all.mjs   （npm run test:e2e）
// 環境變數：QA_TMP（暫存目錄，預設 OS 暫存）、QA_PERF_RUNS（效能輪數，預設 7）
// 第 3 輪（PRD v0.10）：新增 e2e-firstrun、e2e-progress、e2e-mic、e2e-hidden、e2e-reinit、e2e-motion 與 boundary-delta；
// 結果可為「通過／失敗／待人工／不適用（暫停）」。
// 第 4 輪（PRD v0.11 PWA）：新增 e2e-pwa（Chrome 全套、Edge 冒煙）、e2e-pwa-update（Chrome）、tests/static/pwa-static.mjs；
// 無內建資料 fixture 改為「只含 sources.js 的資料目錄＋--no-site」（PWA 模式下缺 PROJECT_LICENSE.copyrightYear 會 LICENSE_YEAR 中止，architecture §5.1）。
// PWA 套件需要 devDependency playwright-core（npm install）與空閒的埠 8080。
// 第 5 輪（PRD v0.13 版面風格）：新增 e2e-layout（US-38～US-41）；越界增量檢查改用 boundary-r5.mjs（與 git HEAD 比對，CT-24、FE-54～FE-62），輸出仍為 boundary-delta.json。
// 第 6 輪（PRD v0.14 版本號與介面精簡）：新增 e2e-version（US-42、US-43、AC-01-08、AC-39-04 v0.14；Chrome 全套、Edge 只跑畫面類）；
// 越界增量檢查改用 boundary-r6.mjs（與 git HEAD 8a266c3 比對，FE-63～FE-69），輸出仍為 boundary-delta.json。
// 第 7 輪（PRD v0.15 學習位置與作答紀錄）：新增 e2e-track（US-44、US-47）、e2e-track-p5（US-45、US-46；Edge 冒煙跑 file:// 部分）；
// 越界增量檢查改用 boundary-r7.mjs（與 git HEAD a5eee06 比對，FE-70～FE-76、CT-25）。環境變數 QA_V100 指向 v1.0.0 舊交付檔（TC-47-04b）。
// 本機記憶體不足時整個程序可能被系統停止（第 6 輪 O-6-1）：可改為逐一執行各套件（每個套件結束即關閉瀏覽器）。
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RES = path.join(ROOT, "tests", "results");
const TMP = process.env.QA_TMP || fs.mkdtempSync(path.join(os.tmpdir(), "emt-qa-"));
fs.mkdirSync(RES, { recursive: true });
const env = { ...process.env, QA_TMP: TMP };
const exits = [];
const run = (args, extra = {}) => { console.log("\n▶ node " + args.join(" ")); const r = spawnSync(process.execPath, args, { cwd: ROOT, env: { ...env, ...extra }, stdio: "inherit" }); exits.push(`${args[0]}${extra.QA_BROWSER ? "（" + extra.QA_BROWSER + "）" : ""}=${r.status}`); return r.status; };

// 0. 清除上一輪的結果檔（避免已移除的套件殘留）
for (const f of fs.readdirSync(RES)) if (f.endsWith(".json") && f !== "qa-review.json") fs.rmSync(path.join(RES, f)); // qa-review.json 為 QA 人工判讀結果，保留

// 1. 資料與靜態
run(["tests/data/data-check.mjs", path.join(RES, "data.json")]);
const vfull = path.join(TMP, "validate-full.txt");
fs.writeFileSync(vfull, spawnSync(process.execPath, ["src/data/_tools/validate.mjs", "--all", "--stage", "final", "--max", "100000"], { cwd: ROOT, encoding: "utf8" }).stdout);
run(["tests/data/records-check.mjs", vfull, path.join(RES, "records.json")]);
const rebuilt = path.join(TMP, "rebuilt.html");
spawnSync(process.execPath, ["tools/build.mjs", "--out", rebuilt], { cwd: ROOT, stdio: "ignore" });
run(["tests/static/static-check.mjs", path.join(RES, "static.json"), rebuilt]);
run(["tests/static/boundary-check.mjs", path.join(RES, "boundary.json")]);
run(["tests/static/boundary-r7.mjs", path.join(RES, "boundary-delta.json")]);

// 2. 無內建資料的 fixture 建置（AC-06-06、AC-09-06、AC-30-10）
const empty = path.join(TMP, "emptydata"); fs.mkdirSync(empty, { recursive: true });
fs.copyFileSync(path.join(ROOT, "src", "data", "sources.js"), path.join(empty, "sources.js")); // 只有授權登錄、沒有字庫與題庫
const fixture = path.join(TMP, "fixture-nodata.html");
const fx = spawnSync(process.execPath, ["tools/build.mjs", "--out", fixture, "--data", empty, "--no-site"], { cwd: ROOT, encoding: "utf8" });
if (fx.status !== 0) console.log("無資料 fixture 建置失敗：" + (fx.stdout + fx.stderr).slice(-400));
run(["tests/static/pwa-static.mjs", path.join(RES, "pwa-static.json")]);

// 3. E2E（Chrome）
const SUITES = ["e2e-goal", "e2e-cards", "e2e-speech", "e2e-content", "e2e-env", "e2e-persist", "e2e-firstrun", "e2e-progress", "e2e-mic", "e2e-hidden", "e2e-reinit", "e2e-motion", "e2e-layout"];
for (const s of SUITES) run([`tests/e2e/${s}.mjs`], { QA_FIXTURE_NODATA: fixture });
// 跨瀏覽器冒煙（Edge）
for (const s of ["e2e-goal", "e2e-hidden"]) run([`tests/e2e/${s}.mjs`], { QA_BROWSER: "edge" });
// 第 4 輪：PWA（本機 V-PWA (b)，埠 8080）
run(["tests/e2e/e2e-pwa.mjs"]);
run(["tests/e2e/e2e-pwa-update.mjs"]);
run(["tests/e2e/e2e-pwa.mjs"], { QA_BROWSER: "edge" });
// 第 6 輪：版本號、隱藏領域範本、狀態列、「變更」按鈕（含 npm run serve 與建置可重現；埠 8080）
run(["tests/e2e/e2e-version.mjs"], { QA_FIXTURE_NODATA: fixture });
run(["tests/e2e/e2e-version.mjs"], { QA_BROWSER: "edge", QA_FIXTURE_NODATA: fixture });
// 第 7 輪：單字卡位置、答對紀錄、只練沒答對（e2e-track-p5 的 http 區塊使用埠 8080；Edge 只跑 file:// 部分）
run(["tests/e2e/e2e-track.mjs"], { QA_FIXTURE_NODATA: fixture });
run(["tests/e2e/e2e-track-p5.mjs"]);
run(["tests/e2e/e2e-track-p5.mjs"], { QA_BROWSER: "edge" });

// 4. 彙整（-edge.json 為跨瀏覽器重跑，於報告以 TC-X-edge 一項計）
const all = [];
for (const f of fs.readdirSync(RES).filter((x) => x.endsWith(".json") && !x.endsWith("-edge.json") && !["summary.json", "records.json", "boundary.json", "boundary-delta.json"].includes(x))) {
  const arr = JSON.parse(fs.readFileSync(path.join(RES, f), "utf8"));
  if (Array.isArray(arr)) for (const r of arr) all.push({ file: f, ...r });
}
const edge = fs.readdirSync(RES).filter((x) => x.endsWith("-edge.json")).flatMap((f) => JSON.parse(fs.readFileSync(path.join(RES, f), "utf8")).map((r) => ({ file: f, ...r })));
const count = (k) => all.filter((r) => r.result === k).length;
const summary = {
  date: new Date().toISOString(), total: all.length, pass: count("通過"), fail: count("失敗"), manual: count("待人工"), na: count("不適用（暫停）"),
  failed: all.filter((r) => r.result === "失敗").map((r) => `${r.file} ${r.tc} ${r.ac}`),
  edge: { total: edge.length, pass: edge.filter((r) => r.result === "通過").length, failed: edge.filter((r) => r.result === "失敗").map((r) => `${r.file} ${r.tc}`) },
  exits,
};
fs.writeFileSync(path.join(RES, "summary.json"), JSON.stringify({ summary, results: all, edge }, null, 2));
console.log("\n══ 彙整 ══", JSON.stringify(summary, null, 2));
