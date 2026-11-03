// QA（第 3 輪；第 4 輪更新人工必要 AC）：由 PRD 的 AC 清單與 tests/results/summary.json（含 qa-review.json）產生 AC → TC 對照與 AC 判定。
// 用法：node tests/tools/ac-matrix.mjs [輸出 JSON]   （輸出 Markdown 表格到 stdout 供 test-plan／test-report 使用）
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const prd = fs.readFileSync(path.join(ROOT, "docs/01-PRD.md"), "utf8");
const acs = [];
for (const m of prd.matchAll(/^\| (AC-\d{2}-\d{2})(【[^】]*】)? \|/gm)) acs.push({ id: m[1], paused: !!(m[2] && m[2].includes("暫停")), note: m[2] || "" });
// 模組四、五整段暫停（US-12～US-16）
for (const a of acs) if (/^AC-1[2-6]-/.test(a.id)) { a.paused = true; a.note = a.note || "【v0.9 暫停（隱藏）】"; }
const sum = JSON.parse(fs.readFileSync(path.join(ROOT, "tests/results/summary.json"), "utf8"));
const results = [...sum.results];
// 展開 AC 字串：「AC-07-01～AC-07-05」「AC-20-01～03」等
function expand(s) {
  const out = new Set();
  for (const m of String(s).matchAll(/AC-(\d{2})-(\d{2})(?:\s*～\s*(?:AC-(\d{2})-)?(\d{2}))?/g)) {
    const us = m[1], a = Number(m[2]);
    if (m[4]) { const b = Number(m[4]); for (let i = a; i <= b; i++) out.add(`AC-${us}-${String(i).padStart(2, "0")}`); }
    else out.add(`AC-${us}-${m[2]}`);
  }
  return [...out];
}
const map = new Map(acs.map((a) => [a.id, []]));
for (const r of results) for (const id of expand(r.ac)) if (map.has(id)) map.get(id).push(r);
// 必須由人類實機判定的 AC（自動化只能做代理驗證）
// 第 4 輪（PRD v0.11）：AC-34-02、AC-34-03、AC-35-03 須實機安裝；AC-34-05 為 iOS 實機；AC-36-07 須 MC-03 修改 workflow 後 push 驗證部署結果
const HUMAN_ESSENTIAL = { "AC-33-01": "V-MIC-1", "AC-33-02": "V-MIC-2", "AC-23-04": "TC-M08", "AC-27-03": "TC-M09（虛擬鍵盤）",
  "AC-34-02": "TC-PWA-H1／H2", "AC-34-03": "TC-PWA-H1／H2", "AC-34-05": "TC-PWA-H3（iOS）", "AC-35-03": "TC-PWA-H2", "AC-36-07": "TC-PWA-H4（MC-03 後）" };
const rows = [];
for (const a of acs) {
  const rs = map.get(a.id);
  const tcs = [...new Set(rs.map((r) => r.tc))];
  let verdict;
  if (a.paused) verdict = "不適用（暫停）";
  else if (rs.some((r) => r.result === "失敗")) verdict = "失敗";
  else if (HUMAN_ESSENTIAL[a.id]) verdict = "待人工";
  else if (rs.filter((r) => r.result === "通過").length === 0) verdict = rs.length ? "待人工" : "未涵蓋";
  else if (rs.some((r) => r.result === "待人工")) verdict = "通過（另待人工確認）";
  else verdict = "通過";
  rows.push({ ac: a.id, paused: a.paused, verdict, tcs, human: HUMAN_ESSENTIAL[a.id] || "" });
}
const cnt = (v) => rows.filter((r) => r.verdict === v).length;
const stats = { total: rows.length, paused: cnt("不適用（暫停）"), pass: cnt("通過"), passManual: cnt("通過（另待人工確認）"), manual: cnt("待人工"), fail: cnt("失敗"), uncovered: cnt("未涵蓋") };
console.log(JSON.stringify(stats));
const md = ["| AC | 判定 | 對應 TC |", "| :--- | :--- | :--- |", ...rows.map((r) => `| ${r.ac} | ${r.verdict}${r.human ? "（" + r.human + "）" : ""} | ${r.tcs.join("、") || "—"} |`)].join("\n");
console.log(md);
if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify({ stats, rows }, null, 2));
