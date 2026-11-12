// QA 越界檢查：專案內每個檔案是否屬於 tasks.json 某任務的 paths（或主控授權補修／QA 自有目錄）
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
// 已完成任務封存於 docs/archive/tasks-done.json（2026-11-11），兩檔合併視為完整任務清單
const readTasks = (p) => (fs.existsSync(path.join(ROOT, p)) ? JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8")).tasks : []);
const tasks = [...readTasks("docs/archive/tasks-done.json"), ...readTasks("docs/03-design/tasks.json")];
const owner = new Map();
for (const t of tasks) for (const p of t.paths) { const k = p.split(path.sep).join("/"); if (!owner.has(k)) owner.set(k, []); owner.get(k).push(t.id); }
const files = [];
(function walk(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); const rel = path.relative(ROOT, p).split(path.sep).join("/"); if (f.isDirectory()) { if (!["node_modules", ".git"].includes(f.name)) walk(p); } else files.push(rel); } })(ROOT);
const human = (r) => r.startsWith("sources/") || r.startsWith("docs/") || r.startsWith(".claude/") || r === "english_master_track.md" || r === "CLAUDE.md";
const qa = (r) => r.startsWith("tests/");
// 第 3 輪：非 PG 產出、人類自行放置的檔案（主控指示 dist/Ads.txt 不算缺陷；LICENSE、.github/ 於 2026-11-02 出現，不屬任何任務，列出待人類確認）
// 第 4 輪（PRD v0.11）授權例外：src/app/assets/icons/（主控 MC-01，SD-FB-33）、.gitignore／.gitattributes（主控依人類決定新增）；
// package-lock.json 為 QA 新增 devDependency（playwright-core，E2E 用）時 npm 產生
// 第 8 輪：NOTICE.md、src/data/NOTICE.md 由 commit c10d5f0（「補上 repo 授權聲明」，第 8 輪前已提交）新增，不屬任何 PG 任務，列出待人類確認
const nonPg = (r) => r.toLowerCase() === "dist/ads.txt" || r === "LICENSE" || r === "NOTICE.md" || r === "src/data/NOTICE.md" || r.startsWith(".github/")
  || r.startsWith("src/app/assets/icons/") || r === ".gitignore" || r === ".gitattributes" || r === "package-lock.json";
const rows = { owned: [], human: [], qa: [], nonPg: [], orphan: [] };
for (const r of files) { if (owner.has(r)) rows.owned.push(`${r} ← ${owner.get(r).join("、")}`); else if (human(r)) rows.human.push(r); else if (qa(r)) rows.qa.push(r); else if (nonPg(r)) rows.nonPg.push(r); else rows.orphan.push(r); }
const missing = [...owner.keys()].filter((k) => !files.includes(k));
console.log(`檔案總數 ${files.length}；屬於任務 ${rows.owned.length}；人類／上游文件 ${rows.human.length}；QA tests/ ${rows.qa.length}；人類自放（非 PG）${rows.nonPg.length}［${rows.nonPg.join("、")}］；不屬於任何任務 ${rows.orphan.length}`);
if (rows.orphan.length) console.log("不屬於任何任務：\n  " + rows.orphan.join("\n  "));
console.log("任務 paths 中不存在的檔案：" + (missing.join("、") || "無"));
console.log("多任務共用檔案：" + [...owner.entries()].filter(([, v]) => v.length > 1).map(([k, v]) => `${k}(${v.join("→")})`).join("、"));
if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify({ ...rows, missing }, null, 2));
