// QA（第 3 輪）：由 tests/results/summary.json 產生 test-plan §5 的 TC 清單（Markdown，stdout）
// 驗證重點：tests/tools/tc-desc.json 優先，其次沿用 test-plan.md 既有列的說明
// 第 5 輪：TC-LAY-H* 為人工；TC-B03 改由 boundary-r5.mjs 產生；TC-R5-J* 為 QA 判讀
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sum = JSON.parse(fs.readFileSync(path.join(ROOT, "tests/results/summary.json"), "utf8"));
const desc = JSON.parse(fs.readFileSync(path.join(ROOT, "tests/tools/tc-desc.json"), "utf8"));
const oldPlan = fs.existsSync(process.argv[2] || "") ? fs.readFileSync(process.argv[2], "utf8") : "";
const old = new Map();
for (const m of oldPlan.matchAll(/^\| (TC-[^ |]+) \| [^|]* \| [^|]* \| [^|]* \| ([^|]*) \|$/gm)) old.set(m[1], m[2].trim());
const SCRIPT = { "data.json": "tests/data/data-check.mjs", "static.json": "tests/static/static-check.mjs", "pwa-static.json": "tests/static/pwa-static.mjs", "legal.json": "tests/static/legal-check.mjs", "site-check.json": "tests/static/site-check.mjs", "mail-scan.json": "tests/static/mail-scan.mjs" }; // 第 4 輪加 pwa-static；第 8 輪加 legal
const kind = (r) => {
  if (r.file === "data.json") return "自動化（資料檢查）";
  if (r.file === "site-check.json" && r.result === "待人工") return "人工";
  if (r.file === "static.json" || r.file === "legal.json" || r.file === "site-check.json" || r.file === "mail-scan.json") return "自動化（靜態檢查）";
  if (r.file === "pwa-static.json") return r.result === "待人工" ? "人工" : "自動化（靜態與建置檢查）";
  if (r.result === "待人工" && /^TC-(PWA|LAY|VER|TRK|AD|SITE)-H/.test(r.tc)) return "人工";
  if (r.file === "qa-review.json") return r.result === "待人工" ? "人工" : "QA 檢視";
  return "自動化 E2E";
};
const script = (r) => {
  if (/^TC-(PWA|LAY|VER|TRK|AD|SITE)-H/.test(r.tc)) return "§6";
  if (SCRIPT[r.file]) return SCRIPT[r.file];
  if (r.file === "qa-review.json") {
    if (/^TC-B0[13]/.test(r.tc)) return r.tc === "TC-B01" ? "tests/static/boundary-check.mjs" : "tests/static/boundary-r9.mjs";
    if (r.tc === "TC-B02") return "人工判讀（檔案時間、docs 變更紀錄）";
    if (r.tc === "TC-D18") return "tests/data/records-check.mjs＋人工判讀";
    if (/^TC-D/.test(r.tc)) return "src/data/_tools/sample.mjs＋人工判讀";
    if (/^TC-R5-J/.test(r.tc)) return "人工判讀（設計字面 vs AC）";
    if (r.tc === "TC-X-edge") return "e2e-goal、e2e-hidden、e2e-pwa、e2e-version、e2e-track-p5、e2e-lock、e2e-answered、e2e-site、e2e-ad（QA_BROWSER=edge）";
    return "§6";
  }
  if (r.file === "e2e-focus.json") return "tests/e2e/diag-r9-focus.mjs";
  return "tests/e2e/" + r.file.replace(".json", ".mjs");
};
const seen = new Set();
const rows = [];
for (const r of sum.results) {
  if (seen.has(r.tc)) continue; seen.add(r.tc);
  const d = r.result === "不適用（v0.18 移除）" ? `不適用（v0.18 移除）。${String(r.note || "").slice(0, 80)}` : r.result === "不適用（暫停）" ? (old.get(r.tc) ? `不適用（暫停）。原驗證：${old.get(r.tc).slice(0, 60)}` : `不適用（暫停）。${String(r.note || "").slice(0, 60)}`)
    : desc[r.tc] || old.get(r.tc) || String(r.note || "").slice(0, 80);
  rows.push({ tc: r.tc, ac: r.ac, k: kind(r), s: script(r), d: d.replace(/\|/g, "／") });
}
const key = (t) => t.replace(/^TC-/, "").replace(/^([A-Z]+)/, "zz$1");
rows.sort((a, b) => key(a.tc).localeCompare(key(b.tc), "en"));
const cnt = (k) => rows.filter((r) => r.k.startsWith(k)).length;
console.log(`共 ${rows.length} 個 TC：自動化 ${cnt("自動化")}、QA 檢視 ${cnt("QA 檢視")}、人工 ${cnt("人工")}（其中記「不適用（暫停）」${rows.filter((r) => r.d.startsWith("不適用（暫停）")).length} 個）。「TC-X-*」為各套件的「無未處理例外」檢查。\n`);
console.log("| TC | 對應 AC | 方式 | 腳本 | 驗證重點 |\n| :--- | :--- | :--- | :--- | :--- |");
for (const r of rows) console.log(`| ${r.tc} | ${r.ac} | ${r.k} | \`${r.s}\` | ${r.d} |`);
