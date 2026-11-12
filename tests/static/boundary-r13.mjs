// QA 越界檢查（第 13 輪，TC-B02、TC-B03；1.4.0，architecture v0.22 §10.15 Q27、M-1～M-5、§12.17；tasks.json v0.20 FE-102～FE-117）：
// 第 12 輪變更已提交（HEAD c16d368），本輪以 git 判定：git diff HEAD 的已追蹤檔、未追蹤檔（--exclude-standard），以及被 .gitignore 排除的 dist/site/（以修改時間晚於 HEAD 提交時間判定）。
// 授權例外：package.json（M-1，只改 version 1.3.2 → 1.4.0，本檢查比對 git diff 只有此 1 行）；docs/01-PRD.md、docs/02-contract/（storage-schema.json 只可改 meta）、
//   docs/03-design/architecture.md、docs/03-design/tasks.json（PM／SA／SD 產出，人類核准或主控代核；PG 只改 tasks.json 的 status）；
//   主控與人類的流程檔（CLAUDE.md、.claude/、docs/archive/、docs/mockups/、tests/static/boundary-check.mjs 與 boundary-delta.mjs 的封存合併，2026-11-11 主控封存）。
// QA 自有：tests/、docs/04-qa/（另列 QA 開始前就已變動的 tests/ 檔案數；主控封存的 2 檔除外）。
// 必須無變動（M-5）：src/data/、tools/、src/app/services/、src/app/site/static-page.css、.github/、package-lock.json、english_master_track.md。
// 用法：node tests/static/boundary-r13.mjs [輸出 JSON]
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const out = process.argv[2];
const git = (...a) => execFileSync("git", ["-c", "core.quotepath=false", ...a], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 << 20 });
const head = git("rev-parse", "--short", "HEAD").trim();
const headTime = new Date(git("log", "-1", "--format=%cI").trim()).getTime();
const qaStart = new Date(process.env.QA_R13_START || "2026-11-12T11:45:00+08:00").getTime(); // QA 本輪開始修改 tests/ 的時間
const tasks = JSON.parse(fs.readFileSync(path.join(ROOT, "docs/03-design/tasks.json"), "utf8"));
const IDS = Array.from({ length: 16 }, (_, i) => "FE-" + (102 + i));
const SCOPE = tasks.tasks.filter((t) => IDS.includes(t.id));
const missing = IDS.filter((id) => !SCOPE.some((t) => t.id === id));
const notDone = SCOPE.filter((t) => t.status !== "done").map((t) => t.id);
const allowed = new Map();
for (const t of SCOPE) for (const p of t.paths) allowed.set(p, (allowed.get(p) || []).concat(t.id));
const tracked = git("diff", "--name-only", "HEAD").split(/\r?\n/).filter(Boolean);
const untracked = git("ls-files", "--others", "--exclude-standard").split(/\r?\n/).filter(Boolean);
const site = []; (function walk(d) { if (!fs.existsSync(d)) return; for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else site.push(path.relative(ROOT, p).split(path.sep).join("/")); } })(path.join(ROOT, "dist/site"));
const siteChanged = site.filter((r) => fs.statSync(path.join(ROOT, r)).mtimeMs > headTime);
const changed = [...new Set([...tracked, ...untracked, ...siteChanged])].sort();
const pkgDiff = git("diff", "-U0", "HEAD", "--", "package.json").split(/\r?\n/).filter((l) => /^[+-]/.test(l) && !/^(\+\+\+|---)/.test(l));
const pkgOnlyVersion = pkgDiff.length === 2 && pkgDiff[0].includes('"version": "1.3.2"') && pkgDiff[1].includes('"version": "1.4.0"');
const ssOld = JSON.parse(git("show", "HEAD:docs/02-contract/storage-schema.json")); const ssNew = JSON.parse(fs.readFileSync(path.join(ROOT, "docs/02-contract/storage-schema.json"), "utf8"));
delete ssOld.meta; delete ssNew.meta; const storageOnlyMeta = JSON.stringify(ssOld) === JSON.stringify(ssNew);
const UP = ["docs/01-PRD.md", "docs/02-contract/README.md", "docs/02-contract/data-schema.ts", "docs/02-contract/storage-schema.json", "docs/03-design/architecture.md", "docs/03-design/tasks.json"];
const CTRL = ["tests/static/boundary-check.mjs", "tests/static/boundary-delta.mjs"];
const AUTH = (r) => r === "package.json" ? (pkgOnlyVersion ? "（M-1：version 1.3.2 → 1.4.0，git diff 只有此 1 行）" : null)
  : r === "docs/02-contract/storage-schema.json" ? (storageOnlyMeta ? "（上游：SA 產出，只改 meta、結構不變）" : null)
  : UP.includes(r) ? "（上游：PM／SA／SD 產出，人類核准或主控代核；PG 只改 tasks.json status）"
  : CTRL.includes(r) ? "（主控：2026-11-11 封存後改讀 tasks-done.json）"
  : r === "CLAUDE.md" || r.startsWith(".claude/") || r.startsWith("docs/archive/") || r.startsWith("docs/mockups/") ? "（主控／人類：流程規範、封存、設計稿）"
  : r.startsWith("tests/") || r.startsWith("docs/04-qa/") ? "（QA 自有）" : null;
const rows = changed.map((r) => { const p = path.join(ROOT, r); const ex = fs.existsSync(p); return { file: r, exists: ex, mtime: ex ? fs.statSync(p).mtime.toISOString() : null, owner: allowed.get(r) && r !== "package.json" ? allowed.get(r) : (AUTH(r) ? [AUTH(r)] : null) }; });
const outside = rows.filter((x) => !x.owner);
const pgTests = rows.filter((x) => x.file.startsWith("tests/") && !CTRL.includes(x.file) && !x.file.startsWith("tests/results/") && x.mtime && new Date(x.mtime).getTime() < qaStart).map((x) => x.file);
const MUST_ZERO = ["src/data/", "tools/", "src/app/services/", "src/app/site/static-page.css", ".github/", "package-lock.json", "english_master_track.md"];
const mustZeroHit = rows.filter((x) => MUST_ZERO.some((m) => x.file === m || x.file.startsWith(m))).map((x) => x.file);
const untouched = [...allowed.keys()].filter((k) => !changed.includes(k));
const workflowDiff = git("diff", "HEAD", "--", ".github/workflows/static.yml").length;
const dataStatus = git("status", "--porcelain", "--", "src/data").trim();
const pg = rows.filter((x) => x.owner && allowed.get(x.file));
for (const x of rows.filter((r) => !r.file.startsWith("tests/results/"))) console.log(`  ${x.owner ? "OK" : "??"} ${x.file} ${x.owner ? x.owner.join("、") : "不在 FE-102～FE-117 paths"}`);
console.log(`HEAD ${head}：變動 ${rows.length} 個（已追蹤 ${tracked.length}、未追蹤 ${untracked.length}、dist/site 晚於 HEAD ${siteChanged.length}／${site.length}）；PG 檔 ${pg.length} 個；超出任務 paths ${outside.length} 個（${outside.map((x) => x.file).join("、")}）；必須無變動路徑命中 ${mustZeroHit.length} 個（${mustZeroHit.join("、")}）；src/data git status「${dataStatus}」；static.yml diff ${workflowDiff}；package.json 只改 version=${pkgOnlyVersion}；storage-schema 只改 meta=${storageOnlyMeta}；QA 開始前已變動的 tests/ 檔 ${pgTests.length} 個；任務缺 ${missing.length}、未 done ${notDone.length} 個；任務 paths 中未變動 ${untouched.length} 個（${untouched.join("、")}）`);
if (out) fs.writeFileSync(out, JSON.stringify({ head, headTime: new Date(headTime).toISOString(), scope: IDS, tasksVersion: tasks.meta && tasks.meta.version, missing, notDone, pkgOnlyVersion, storageOnlyMeta, workflowDiff, dataStatus, mustZeroHit, pgTests, tracked, untracked, siteChanged, rows, outside, untouched }, null, 2));
process.exitCode = outside.length || mustZeroHit.length || notDone.length || missing.length || pgTests.length || workflowDiff ? 1 : 0;
