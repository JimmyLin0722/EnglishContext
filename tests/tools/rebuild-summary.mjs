// QA（第 3 輪）：只重新彙整 tests/results/*.json 為 summary.json（不重跑測試；與 run-all.mjs 第 4 步相同的規則）
// 用途：單獨重跑某套件或更新 qa-review.json 後，更新彙整結果
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RES = path.join(ROOT, "tests", "results");
const prev = fs.existsSync(path.join(RES, "summary.json")) ? JSON.parse(fs.readFileSync(path.join(RES, "summary.json"), "utf8")).summary : {};
const all = [];
for (const f of fs.readdirSync(RES).filter((x) => x.endsWith(".json") && !x.endsWith("-edge.json") && !["summary.json", "records.json", "boundary.json", "boundary-delta.json"].includes(x))) {
  const arr = JSON.parse(fs.readFileSync(path.join(RES, f), "utf8"));
  if (Array.isArray(arr)) for (const r of arr) all.push({ file: f, ...r });
}
const edge = fs.readdirSync(RES).filter((x) => x.endsWith("-edge.json")).flatMap((f) => JSON.parse(fs.readFileSync(path.join(RES, f), "utf8")).map((r) => ({ file: f, ...r })));
const count = (k) => all.filter((r) => r.result === k).length;
const summary = {
  date: new Date().toISOString(), total: all.length, pass: count("通過"), fail: count("失敗"), manual: count("待人工"), na: all.filter((r) => String(r.result).startsWith("不適用")).length,
  failed: all.filter((r) => r.result === "失敗").map((r) => `${r.file} ${r.tc} ${r.ac}`),
  edge: { total: edge.length, pass: edge.filter((r) => r.result === "通過").length, failed: edge.filter((r) => r.result === "失敗").map((r) => `${r.file} ${r.tc}`) },
  exits: prev.exits || [], rebuilt: true,
};
fs.writeFileSync(path.join(RES, "summary.json"), JSON.stringify({ summary, results: all, edge }, null, 2));
console.log(JSON.stringify(summary, null, 2));
