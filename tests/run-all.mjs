// QA 驗收總執行：資料、紀錄完整性、靜態、越界、E2E（Chrome 全套；Edge 跑套件 1 作跨瀏覽器冒煙）
// 用法：node tests/run-all.mjs   （npm run test:e2e）
// 環境變數：QA_TMP（暫存目錄，預設 OS 暫存）
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
const run = (args, extra = {}) => { console.log("\n▶ node " + args.join(" ")); const r = spawnSync(process.execPath, args, { cwd: ROOT, env: { ...env, ...extra }, stdio: "inherit" }); return r.status; };

// 1. 資料與靜態
run(["tests/data/data-check.mjs", path.join(RES, "data.json")]);
const vfull = path.join(TMP, "validate-full.txt");
fs.writeFileSync(vfull, spawnSync(process.execPath, ["src/data/_tools/validate.mjs", "--all", "--stage", "final", "--max", "100000"], { cwd: ROOT, encoding: "utf8" }).stdout);
run(["tests/data/records-check.mjs", vfull, path.join(RES, "records.json")]);
const rebuilt = path.join(TMP, "rebuilt.html");
spawnSync(process.execPath, ["tools/build.mjs", "--out", rebuilt], { cwd: ROOT, stdio: "ignore" });
run(["tests/static/static-check.mjs", path.join(RES, "static.json"), rebuilt]);
run(["tests/static/boundary-check.mjs", path.join(RES, "boundary.json")]);

// 2. 無內建資料的 fixture 建置（AC-06-06、AC-09-06）
const empty = path.join(TMP, "emptydata"); fs.mkdirSync(empty, { recursive: true });
const fixture = path.join(TMP, "fixture-nodata.html");
spawnSync(process.execPath, ["tools/build.mjs", "--out", fixture, "--data", empty], { cwd: ROOT, stdio: "ignore" });

// 3. E2E
for (const s of ["e2e-goal", "e2e-cards", "e2e-speech", "e2e-content", "e2e-env", "e2e-persist"]) run([`tests/e2e/${s}.mjs`], { QA_FIXTURE_NODATA: fixture });
run(["tests/e2e/e2e-goal.mjs"], { QA_BROWSER: "edge" });

// 4. 彙整
const all = [];
for (const f of fs.readdirSync(RES).filter((x) => x.endsWith(".json") && !x.endsWith("-edge.json") && !["summary.json", "records.json", "boundary.json"].includes(x))) {
  // -edge.json 為跨瀏覽器重跑，於 qa-review.json 以 TC-X-edge 一項計
  const arr = JSON.parse(fs.readFileSync(path.join(RES, f), "utf8"));
  if (Array.isArray(arr)) for (const r of arr) all.push({ file: f, ...r });
}
const count = (k) => all.filter((r) => r.result === k).length;
const summary = { total: all.length, pass: count("通過"), fail: count("失敗"), manual: count("待人工"), failed: all.filter((r) => r.result === "失敗").map((r) => `${r.file} ${r.tc} ${r.ac}`) };
fs.writeFileSync(path.join(RES, "summary.json"), JSON.stringify({ summary, results: all }, null, 2));
console.log("\n══ 彙整 ══", JSON.stringify(summary, null, 2));
