// QA 越界檢查（第 3 輪，TC-B03）：某時間點之後修改過的 src/、tools/、dist/、sources/、english_master_track.md，
// 是否都在該期間任務（預設 FE-34～FE-44，PRD v0.9／v0.10 增量）的 paths 內。
// 用法：node tests/static/boundary-delta.mjs [輸出 JSON] [起始時間，預設 2026-11-02T15:40:00+08:00] [最小任務編號，預設 45]
// 第 4 輪（PRD v0.11）：預設改為第 3 輪驗收結束（2026-11-02 15:37）之後、FE-45～FE-53；授權例外見 AUTH
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const out = process.argv[2];
const since = new Date(process.argv[3] || "2026-11-02T15:40:00+08:00").getTime();
const minFe = Number(process.argv[4] || 45);
// 主控指示：人類自行放置、不算越界
const HUMAN = new Set(["dist/Ads.txt", "dist/ads.txt"]);
// 第 4 輪授權例外（主控指示）：src/app/assets/icons/、sources/（主控放置，SD-FB-33）；.gitignore、.gitattributes（主控依人類決定新增）
const AUTH = (r) => r.startsWith("src/app/assets/icons/") || r.startsWith("sources/") || r === ".gitignore" || r === ".gitattributes";
// 主控修改、PRD v0.11 R-20 風險 (3) 已記載（workflow 中 dist/Ads.txt 改為 dist/ads.txt）；不屬 PG，非越界；MC-03 整檔取代尚未執行
const MC = (r) => r === ".github/workflows/static.yml";

// 已完成任務封存於 docs/archive/tasks-done.json（2026-11-11），兩檔合併視為完整任務清單
const readTasks = (p) => (fs.existsSync(path.join(ROOT, p)) ? JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8")).tasks : []);
const tasks = [...readTasks("docs/archive/tasks-done.json"), ...readTasks("docs/03-design/tasks.json")];
const allowed = new Map();
for (const t of tasks.filter((x) => x.id.startsWith("FE-") && Number(x.id.slice(3)) >= minFe)) {
  for (const p of t.paths) allowed.set(p, (allowed.get(p) || []).concat(t.id));
}
const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) { if (!["node_modules", ".git"].includes(f.name)) walk(p); } else files.push(path.relative(ROOT, p).split(path.sep).join("/"));
  }
})(ROOT);
const scope = files.filter((r) => /^(src|tools|dist|sources)\//.test(r) || r === "english_master_track.md" || r === "package.json" || r === ".gitignore" || r === ".gitattributes" || r.startsWith(".github/"));
const changed = scope.filter((r) => fs.statSync(path.join(ROOT, r)).mtimeMs > since);
const rows = changed.map((r) => ({ file: r, mtime: fs.statSync(path.join(ROOT, r)).mtime.toISOString(), owner: allowed.get(r) || (HUMAN.has(r) ? ["（人類自放）"] : AUTH(r) ? ["（主控授權例外）"] : MC(r) ? ["（主控修改，PRD R-20 記載）"] : null) }));
const outside = rows.filter((x) => !x.owner);
for (const x of rows) console.log(`  ${x.owner ? "OK" : "??"} ${x.file} ${x.owner ? x.owner.join("、") : "不在 FE-" + minFe + " 以後任何任務 paths"}`);
console.log(`起始 ${new Date(since).toISOString()} 之後修改 ${rows.length} 個檔案；超出任務 paths ${outside.length} 個`);
if (out) fs.writeFileSync(out, JSON.stringify({ since: new Date(since).toISOString(), minFe, rows, outside }, null, 2));
process.exitCode = outside.length ? 1 : 0;
