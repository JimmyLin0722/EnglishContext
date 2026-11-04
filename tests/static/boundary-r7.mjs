// QA 越界檢查（第 7 輪，TC-B03；PRD v0.15 學習位置與作答紀錄）：與 git HEAD（a5eee06，v0.14／1.0.0 交付）相比有變動的檔案，
// 以及 .gitignore 排除的 dist/site/ 中於 HEAD 提交時間之後修改的檔案，是否都在 FE-70～FE-76、CT-25 的 paths 內。
// 用法：node tests/static/boundary-r7.mjs [輸出 JSON]
// 授權例外（主控指示）：package.json（MC-04、Q-70 A，主控把 version 改為 1.1.0；本檢查另比對 git diff 只改 version）；docs/mockups/（主控放置樣稿）；docs/01-PRD.md、docs/02-contract/、docs/03-design/（上游代理產出，核准欄位與變更紀錄由主控填寫）；
// QA 自有：tests/、docs/04-qa/。
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const out = process.argv[2];
const git = (...a) => execFileSync("git", ["-c", "core.quotepath=false", ...a], { cwd: ROOT, encoding: "utf8" });
const head = git("rev-parse", "--short", "HEAD").trim();
const headTime = new Date(git("log", "-1", "--format=%cI").trim()).getTime();
const tasks = JSON.parse(fs.readFileSync(path.join(ROOT, "docs/03-design/tasks.json"), "utf8")).tasks;
const R5 = tasks.filter((t) => (t.id.startsWith("FE-") && Number(t.id.slice(3)) >= 70 && Number(t.id.slice(3)) <= 76) || t.id === "CT-25");
const allowed = new Map();
for (const t of R5) for (const p of t.paths) allowed.set(p, (allowed.get(p) || []).concat(t.id));
const changed = new Map();
for (const line of git("status", "--porcelain", "--untracked-files=all").split("\n").filter(Boolean)) {
  const st = line.slice(0, 2).trim(); const f = line.slice(3).replace(/^"|"$/g, "");
  changed.set(f, st);
}
// .gitignore 排除的部署目錄
(function walk(d) { if (!fs.existsSync(d)) return; for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else { const rel = path.relative(ROOT, p).split(path.sep).join("/"); if (fs.statSync(p).mtimeMs > headTime) changed.set(rel, "ignored-modified"); } } })(path.join(ROOT, "dist", "site"));
const pkgDiff = git("diff", "-U0", "HEAD", "--", "package.json").split(/\r?\n/).filter((l) => /^[+-]/.test(l) && !/^(\+\+\+|---)/.test(l));
const pkgOnlyVersion = pkgDiff.length === 2 && /"version": "1\.0\.0"/.test(pkgDiff[0]) && /"version": "1\.1\.0"/.test(pkgDiff[1]);
const AUTH = (r) => r === "package.json" ? (pkgOnlyVersion ? "（MC-04、Q-70 A：主控修改 version 1.0.0 → 1.1.0，git diff 只有此行，授權例外）" : null) : r.startsWith("docs/mockups/") ? "（主控放置樣稿，授權例外）"
  : r === "docs/01-PRD.md" || r.startsWith("docs/02-contract/") || r.startsWith("docs/03-design/") ? "（上游文件：PM／SA／SD 產出，核准欄位與變更紀錄由主控填寫，授權例外）"
  : r.startsWith("tests/") || r.startsWith("docs/04-qa/") ? "（QA 自有）" : null;
const rows = [...changed.entries()].sort().map(([file, st]) => ({ file, status: st, owner: allowed.get(file) || (AUTH(file) ? [AUTH(file)] : null), mtime: fs.existsSync(path.join(ROOT, file)) ? fs.statSync(path.join(ROOT, file)).mtime.toISOString() : "（已刪除）" }));
const outside = rows.filter((x) => !x.owner);
const pg = rows.filter((x) => x.owner && !x.owner[0].startsWith("（"));
// 範圍內任務 paths 中沒有變動的檔案（參考）
const untouched = [...allowed.keys()].filter((k) => !changed.has(k));
for (const x of rows) console.log(`  ${x.owner ? "OK" : "??"} [${x.status}] ${x.file} ${x.owner ? x.owner.join("、") : "不在 FE-70～FE-76、CT-25 paths"}`);
console.log(`HEAD ${head}；變動 ${rows.length} 個檔案（PG 任務 ${pg.length}、授權例外與 QA ${rows.length - pg.length - outside.length}）；超出任務 paths ${outside.length} 個；任務 paths 中未變動 ${untouched.length} 個（${untouched.join("、")}）`);
if (out) fs.writeFileSync(out, JSON.stringify({ head, since: new Date(headTime).toISOString(), scope: "FE-70～FE-76、CT-25", pkgDiff, pkgOnlyVersion, rows, outside, untouched }, null, 2));
process.exitCode = outside.length ? 1 : 0;
