// QA 越界檢查（第 12 輪，TC-B02、TC-B03；1.3.2，architecture v0.17 §10.14 M-1～M-6、§12.16；tasks.json v0.16 FE-98～FE-101、MC-10）：
// 第 11 輪變更已提交（HEAD 2cb2ca2），本輪以 git 判定：git diff HEAD 的已追蹤檔、未追蹤檔（--exclude-standard），以及被 .gitignore 排除的 dist/site/（以修改時間晚於 HEAD 提交時間判定）。
// 授權例外：package.json（MC-10，只改 version 1.3.1 → 1.3.2，本檢查比對 git diff 只有此 1 行）；docs/01-PRD.md、docs/02-contract/（storage-schema.json 只可改 meta）、
//   docs/03-design/architecture.md、docs/03-design/tasks.json（PM／SA／SD 產出，人類核准或主控代核；PG 只改 tasks.json 的 status）。
// QA 自有：tests/、docs/04-qa/（另列 QA 開始前就已變動的 tests/ 檔案數，應為 0）。
// 必須無變動（M-5）：src/data/、tools/、.github/、package-lock.json、src/app/views/flashcards.js、src/app/state/store.js、src/app/services/mic.js、english_master_track.md、CLAUDE.md。
// 用法：node tests/static/boundary-r12.mjs [輸出 JSON]
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const out = process.argv[2];
const git = (...a) => execFileSync("git", ["-c", "core.quotepath=false", ...a], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 << 20 });
const head = git("rev-parse", "--short", "HEAD").trim();
const headTime = new Date(git("log", "-1", "--format=%cI").trim()).getTime();
const qaStart = new Date(process.env.QA_R12_START || "2026-11-09T16:58:00+08:00").getTime(); // QA 本輪開始修改 tests/ 的時間
const tasks = JSON.parse(fs.readFileSync(path.join(ROOT, "docs/03-design/tasks.json"), "utf8"));
const IDS = ["FE-98", "FE-99", "FE-100", "FE-101", "MC-10"];
const SCOPE = tasks.tasks.filter((t) => IDS.includes(t.id));
const notDone = SCOPE.filter((t) => t.id !== "MC-10" && t.status !== "done").map((t) => t.id);
const allowed = new Map();
for (const t of SCOPE) for (const p of t.paths) allowed.set(p, (allowed.get(p) || []).concat(t.id));
const tracked = git("diff", "--name-only", "HEAD").split(/\r?\n/).filter(Boolean);
const untracked = git("ls-files", "--others", "--exclude-standard").split(/\r?\n/).filter(Boolean);
const site = []; (function walk(d) { if (!fs.existsSync(d)) return; for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else site.push(path.relative(ROOT, p).split(path.sep).join("/")); } })(path.join(ROOT, "dist/site"));
const siteChanged = site.filter((r) => fs.statSync(path.join(ROOT, r)).mtimeMs > headTime);
const changed = [...new Set([...tracked, ...untracked, ...siteChanged])].sort();
// package.json：只改 version 1 行
const pkgDiff = git("diff", "-U0", "HEAD", "--", "package.json").split(/\r?\n/).filter((l) => /^[+-]/.test(l) && !/^(\+\+\+|---)/.test(l));
const pkgOnlyVersion = pkgDiff.length === 2 && pkgDiff[0].includes('"version": "1.3.1"') && pkgDiff[1].includes('"version": "1.3.2"');
// storage-schema.json：只改 meta
const ssOld = JSON.parse(git("show", "HEAD:docs/02-contract/storage-schema.json")); const ssNew = JSON.parse(fs.readFileSync(path.join(ROOT, "docs/02-contract/storage-schema.json"), "utf8"));
delete ssOld.meta; delete ssNew.meta; const storageOnlyMeta = JSON.stringify(ssOld) === JSON.stringify(ssNew);
// tasks.json：與 HEAD 相比，既有任務（FE-97 以前）除 status 外不變；新任務為 SD 產出
const tOld = JSON.parse(git("show", "HEAD:docs/03-design/tasks.json"));
const oldChanged = tOld.tasks.filter((o) => { const n = tasks.tasks.find((x) => x.id === o.id); if (!n) return true; const a = { ...o }, b = { ...n }; delete a.status; delete b.status; return JSON.stringify(a) !== JSON.stringify(b); }).map((o) => o.id);
const UP = ["docs/01-PRD.md", "docs/02-contract/README.md", "docs/02-contract/data-schema.ts", "docs/02-contract/storage-schema.json", "docs/03-design/architecture.md", "docs/03-design/tasks.json"];
const AUTH = (r) => r === "package.json" ? (pkgOnlyVersion ? "（MC-10：主控修改 version 1.3.1 → 1.3.2，git diff 只有此 1 行）" : null)
  : r === "docs/02-contract/storage-schema.json" ? (storageOnlyMeta ? "（上游：SA 產出，只改 meta、結構不變）" : null)
  : UP.includes(r) ? "（上游：PM／SA／SD 產出，人類核准或主控代核；PG 只改 tasks.json status）"
  : r.startsWith("tests/") || r.startsWith("docs/04-qa/") ? "（QA 自有）" : null;
const rows = changed.map((r) => { const p = path.join(ROOT, r); const ex = fs.existsSync(p); return { file: r, exists: ex, mtime: ex ? fs.statSync(p).mtime.toISOString() : null, owner: allowed.get(r) && r !== "package.json" ? allowed.get(r) : (AUTH(r) ? [AUTH(r)] : null) }; });
const outside = rows.filter((x) => !x.owner);
const pgTests = rows.filter((x) => x.file.startsWith("tests/") && !x.file.startsWith("tests/results/") && x.mtime && new Date(x.mtime).getTime() < qaStart).map((x) => x.file);
const MUST_ZERO = ["src/data/", "tools/", ".github/", "package-lock.json", "src/app/views/flashcards.js", "src/app/state/store.js", "src/app/services/mic.js", "english_master_track.md", "CLAUDE.md"];
const mustZeroHit = rows.filter((x) => MUST_ZERO.some((m) => x.file === m || x.file.startsWith(m))).map((x) => x.file);
const untouched = [...allowed.keys()].filter((k) => !changed.includes(k));
const workflowDiff = git("diff", "HEAD", "--", ".github/workflows/static.yml").length;
const dataStatus = git("status", "--porcelain", "--", "src/data").trim();
for (const x of rows.filter((r) => !r.file.startsWith("tests/results/"))) console.log(`  ${x.owner ? "OK" : "??"} ${x.file} ${x.owner ? x.owner.join("、") : "不在 FE-98～FE-101、MC-10 paths"}`);
console.log(`HEAD ${head}：變動 ${rows.length} 個（已追蹤 ${tracked.length}、未追蹤 ${untracked.length}、dist/site 晚於 HEAD ${siteChanged.length}／${site.length}）；超出任務 paths ${outside.length} 個；必須無變動路徑命中 ${mustZeroHit.length} 個（${mustZeroHit.join("、")}）；src/data git status「${dataStatus}」；static.yml diff ${workflowDiff}；package.json 只改 version=${pkgOnlyVersion}；storage-schema 只改 meta=${storageOnlyMeta}；tasks.json 既有任務（除 status）變動 ${oldChanged.length} 個；QA 開始前已變動的 tests/ 檔 ${pgTests.length} 個；任務未 done ${notDone.length} 個；任務 paths 中未變動 ${untouched.length} 個（${untouched.join("、")}）`);
if (out) fs.writeFileSync(out, JSON.stringify({ head, headTime: new Date(headTime).toISOString(), scope: IDS, tasksVersion: tasks.meta && tasks.meta.version, notDone, pkgOnlyVersion, storageOnlyMeta, oldTasksChanged: oldChanged, workflowDiff, dataStatus, mustZeroHit, pgTests, tracked, untracked, siteChanged, rows, outside, untouched }, null, 2));
process.exitCode = outside.length || mustZeroHit.length || notDone.length || pgTests.length || workflowDiff || oldChanged.length ? 1 : 0;
