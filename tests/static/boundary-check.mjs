// QA 越界檢查：專案內每個檔案是否屬於 tasks.json 某任務的 paths（或主控授權補修／QA 自有目錄）
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const tasks = JSON.parse(fs.readFileSync(path.join(ROOT, "docs/03-design/tasks.json"), "utf8")).tasks;
const owner = new Map();
for (const t of tasks) for (const p of t.paths) { const k = p.split(path.sep).join("/"); if (!owner.has(k)) owner.set(k, []); owner.get(k).push(t.id); }
const files = [];
(function walk(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); const rel = path.relative(ROOT, p).split(path.sep).join("/"); if (f.isDirectory()) { if (!["node_modules", ".git"].includes(f.name)) walk(p); } else files.push(rel); } })(ROOT);
const human = (r) => r.startsWith("sources/") || r.startsWith("docs/") || r.startsWith(".claude/") || r === "english_master_track.md" || r === "CLAUDE.md";
const qa = (r) => r.startsWith("tests/");
const rows = { owned: [], human: [], qa: [], orphan: [] };
for (const r of files) { if (owner.has(r)) rows.owned.push(`${r} ← ${owner.get(r).join("、")}`); else if (human(r)) rows.human.push(r); else if (qa(r)) rows.qa.push(r); else rows.orphan.push(r); }
const missing = [...owner.keys()].filter((k) => !files.includes(k));
console.log(`檔案總數 ${files.length}；屬於任務 ${rows.owned.length}；人類／上游文件 ${rows.human.length}；QA tests/ ${rows.qa.length}；不屬於任何任務 ${rows.orphan.length}`);
if (rows.orphan.length) console.log("不屬於任何任務：\n  " + rows.orphan.join("\n  "));
console.log("任務 paths 中不存在的檔案：" + (missing.join("、") || "無"));
console.log("多任務共用檔案：" + [...owner.entries()].filter(([, v]) => v.length > 1).map(([k, v]) => `${k}(${v.join("→")})`).join("、"));
if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify({ ...rows, missing }, null, 2));
