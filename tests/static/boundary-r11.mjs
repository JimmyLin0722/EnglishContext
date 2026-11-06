// QA 越界檢查（第 11 輪，TC-B03；1.3.1 修正輪，architecture v0.16 §12.15、§10.13 M-1～M-5）：
// 第 10 輪驗收結束（預設 2026-11-05T19:15:00+08:00，test-report v0.11 寫入時間）之後修改過的檔案，是否都在 FE-95～FE-97 的 paths 內。
// 第 10 輪的變更尚未提交（git HEAD 仍為 a358556），無法以 git diff 分辨本輪，故以修改時間判定；node_modules、.git 不掃。
// 用法：node tests/static/boundary-r11.mjs [輸出 JSON] [起始時間]
// 授權例外：docs/03-design/architecture.md、docs/03-design/tasks.json（SD 產出 v0.16／v0.15，主控代核；PG 只改 tasks.json 的 status 欄，本檢查另比對 FE-95～FE-97 為 done）。
// QA 自有：tests/、docs/04-qa/（另列出 QA 開始前就已變動的 tests/ 檔案數，應為 0）。
// 必須無變動（M-1、M-5）：package.json、package-lock.json、src/data/、tools/、.github/、docs/01-PRD.md、docs/02-contract/、src/app/services/ad.js、src/app/views/flashcards.js。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const out = process.argv[2];
const since = new Date(process.argv[3] || "2026-11-05T19:15:00+08:00").getTime();
const qaStart = new Date(process.env.QA_R11_START || "2026-11-06T09:10:00+08:00").getTime(); // QA 本輪開始修改 tests/ 的時間（之前的 tests/ 變動視為非 QA）
const tasks = JSON.parse(fs.readFileSync(path.join(ROOT, "docs/03-design/tasks.json"), "utf8"));
const IDS = ["FE-95", "FE-96", "FE-97"];
const SCOPE = tasks.tasks.filter((t) => IDS.includes(t.id));
const notDone = SCOPE.filter((t) => t.status !== "done").map((t) => t.id);
const allowed = new Map();
for (const t of SCOPE) for (const p of t.paths) allowed.set(p, (allowed.get(p) || []).concat(t.id));
const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) { if (!["node_modules", ".git"].includes(f.name)) walk(p); } else files.push(path.relative(ROOT, p).split(path.sep).join("/"));
  }
})(ROOT);
const changed = files.filter((r) => fs.statSync(path.join(ROOT, r)).mtimeMs > since);
const AUTH = (r) => r === "docs/03-design/architecture.md" || r === "docs/03-design/tasks.json" ? "（上游：SD 產出、主控代核；PG 只改 tasks.json status，授權例外）"
  : r.startsWith("tests/") || r.startsWith("docs/04-qa/") ? "（QA 自有）" : null;
const rows = changed.sort().map((r) => ({ file: r, mtime: fs.statSync(path.join(ROOT, r)).mtime.toISOString(), owner: allowed.get(r) || (AUTH(r) ? [AUTH(r)] : null) }));
const outside = rows.filter((x) => !x.owner);
const pgTests = rows.filter((x) => x.file.startsWith("tests/") && !x.file.startsWith("tests/results/") && new Date(x.mtime).getTime() < qaStart).map((x) => x.file);
const MUST_ZERO = ["package.json", "package-lock.json", "src/data/", "tools/", ".github/", "docs/01-PRD.md", "docs/02-contract/", "src/app/services/ad.js", "src/app/views/flashcards.js", "english_master_track.md", "CLAUDE.md"];
const mustZeroHit = rows.filter((x) => MUST_ZERO.some((m) => x.file === m || x.file.startsWith(m))).map((x) => x.file);
const untouched = [...allowed.keys()].filter((k) => !changed.includes(k));
const ver = tasks.meta && tasks.meta.version;
for (const x of rows.filter((r) => !r.file.startsWith("tests/results/"))) console.log(`  ${x.owner ? "OK" : "??"} ${x.file} ${x.owner ? x.owner.join("、") : "不在 FE-95～FE-97 paths"}`);
console.log(`起始 ${new Date(since).toISOString()} 之後修改 ${rows.length} 個檔案（不含 tests/results 的列印）；超出任務 paths ${outside.length} 個；必須無變動路徑命中 ${mustZeroHit.length} 個（${mustZeroHit.join("、")}）；QA 開始前已變動的 tests/ 檔 ${pgTests.length} 個；tasks.json v${ver}、任務未 done ${notDone.length} 個；任務 paths 中未變動 ${untouched.length} 個（${untouched.join("、")}）`);
if (out) fs.writeFileSync(out, JSON.stringify({ since: new Date(since).toISOString(), scope: IDS, tasksVersion: ver, notDone, mustZeroHit, pgTests, rows, outside, untouched }, null, 2));
process.exitCode = outside.length || mustZeroHit.length || notDone.length || pgTests.length ? 1 : 0;
