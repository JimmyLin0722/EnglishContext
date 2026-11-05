// QA 第 9 輪（PRD v0.19 AC-55-04、AC-23-07 (8)；契約 ML-3、ML-4、V-MAIL-01、V-MAIL-02；architecture §10.11 Q5）
// 本檔不含任何完整地址：規則一律以字串拼接或判定式組成，輸出也只列「檔案:行」與遮蔽值，不輸出命中字串。
// TC-55-04a：git ls-files（文字檔）＋未追蹤檔案（--exclude-standard）＋ tests/results/ 全部（含 tmp、diag）＋ dist/site：ML-3 連續地址命中 = 0
// TC-55-04b：同上範圍，ML-4 空白形式：每個命中都必須等於現行值；上游文件（docs/03-design/tasks.json FE-77，SD-FB-78）另列，不由 QA 修改
// TC-55-04c：現行地址的本地部分（無空白）在範圍內命中 = 0；任何 @ 網域形式的連續地址列為資訊（例如第三方套件授權）
// TC-55-04h：Git 歷史（只回報，不改寫；人類決定，R-28 風險 (3)）：列出曾加入或移除連續地址的 commit 與路徑，不輸出地址
// 用法：node tests/static/mail-scan.mjs [輸出 JSON]
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const out = process.argv[2];
const git = (...a) => execFileSync("git", ["-c", "core.quotepath=false", ...a], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28 });
const AT = String.fromCharCode(64);
const DOMAIN = "gm" + "ail" + "\\." + "c" + "om";
const ML3 = new RegExp("[A-Za-z0-9._%+-]*" + AT + DOMAIN, "ig"); // 含「@ 加網域」即命中（本地部分可為空）
const ML4 = /(?:[A-Za-z0-9._%+-] ){3,}@(?: [A-Za-z0-9._%+-])+/g;
const GENERIC = new RegExp("[A-Za-z0-9._%+-]+" + AT + "[A-Za-z0-9-]+(?:\\.[A-Za-z0-9-]+)*\\.[A-Za-z]{2,}", "g");
const CONTACT_FILE = path.join(ROOT, "src/app/core/site-content.js");
const CURRENT_LINE = (fs.readFileSync(CONTACT_FILE, "utf8").match(/SOURCES_CONTACT_TEXT = "([^"]+)"/) || [])[1];
const CURRENT = CURRENT_LINE.replace(/^email: /, "");
const LOCAL_COMPACT = CURRENT.split(" @ ")[0].replace(/ /g, "");

const tracked = git("ls-files").split(/\r?\n/).filter(Boolean);
const untracked = git("ls-files", "--others", "--exclude-standard").split(/\r?\n/).filter(Boolean);
const extra = [];
(function walk(d) { if (!fs.existsSync(d)) return; for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else extra.push(path.relative(ROOT, p).split(path.sep).join("/")); } })(path.join(ROOT, "dist/site"));
const files = [...new Set([...tracked, ...untracked, ...extra])].sort();

const lineOf = (s, i) => s.slice(0, i).split("\n").length;
const mask = (v) => v.length <= 2 ? "**" : v[0] + "…（遮蔽，" + v.length + " 字元）";
let scanned = 0, binary = 0, missing = 0;
const ml3 = [], ml4Bad = [], ml4Good = [], compact = [], generic = [];
for (const f of files) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) { missing++; continue; }
  const b = fs.readFileSync(p);
  if (b.includes(0)) { binary++; continue; }
  scanned++;
  const s = b.toString("utf8");
  for (const m of s.matchAll(ML3)) ml3.push(`${f}:${lineOf(s, m.index)}`);
  for (const m of s.matchAll(ML4)) { const at = `${f}:${lineOf(s, m.index)}`; if (m[0].trim() === CURRENT) ml4Good.push(at); else ml4Bad.push({ at, masked: mask(m[0]) }); }
  if (s.includes(LOCAL_COMPACT)) compact.push(f);
  for (const m of s.matchAll(GENERIC)) if (!/\.(png|jpe?g|svg|webp)$/i.test(m[0])) generic.push(`${f}:${lineOf(s, m.index)}`);
}
// Git 歷史：用 -G 找異動行含規則的 commit（-G 為 POSIX 正則，組字以免本檔含連續字串）
const histRe = "[A-Za-z0-9._%+-]+" + AT + "gm" + "ail" + "[.]" + "c" + "om";
const hist = git("log", "--all", "--format=%h", "--name-only", "-G" + histRe).split(/\r?\n/).filter(Boolean);
const histCommits = hist.filter((x) => /^[0-9a-f]{7,}$/.test(x));
const histPaths = [...new Set(hist.filter((x) => !/^[0-9a-f]{7,}$/.test(x)))];

const UPSTREAM = (x) => x.at.startsWith("docs/03-design/tasks.json"); // SD-FB-78：既有任務內容不動，主控決定
const ml4Own = ml4Bad.filter((x) => !UPSTREAM(x));
const results = [
  { suite: "mail-scan", tc: "TC-55-04a", ac: "AC-55-04（V-MAIL-01、ML-3）", result: ml3.length === 0 ? "通過" : "失敗",
    note: `掃描 ${scanned} 個文字檔（git ls-files ${tracked.length}、未追蹤 ${untracked.length}、dist/site ${extra.length}；二進位略過 ${binary}、已不存在 ${missing}）；ML-3 連續地址命中 ${ml3.length}${ml3.length ? "：" + ml3.slice(0, 20).join("、") : ""}；含本檔自身` },
  { suite: "mail-scan", tc: "TC-55-04b", ac: "AC-23-07 (8)、AC-55-04（ML-4）", result: ml4Own.length === 0 ? "通過" : "失敗",
    note: `ML-4 空白形式：等於現行值 ${ml4Good.length} 處；不等於現行值 ${ml4Bad.length} 處（上游 tasks.json FE-77 ${ml4Bad.length - ml4Own.length} 處，SD-FB-78 由主控決定；其他 ${ml4Own.length} 處${ml4Own.length ? "：" + ml4Own.map((x) => x.at).join("、") : ""}）` },
  { suite: "mail-scan", tc: "TC-55-04c", ac: "AC-55-04（現行地址本地部分連續形式）", result: compact.length === 0 ? "通過" : "失敗",
    note: `本地部分連續形式命中 ${compact.length} 個檔案${compact.length ? "：" + compact.join("、") : ""}；其他網域的連續地址形式（資訊，不屬 ML-3）${generic.length} 處${generic.length ? "：" + generic.slice(0, 12).join("、") : ""}` },
  { suite: "mail-scan", tc: "TC-55-04h", ac: "AC-55-04（不含 Git 歷史，只回報）", result: "通過",
    note: `AC 明定不含 Git 歷史；回報：全部分支有 ${histCommits.length} 個 commit 異動過連續地址（${histCommits.slice(0, 10).join("、")}），路徑 ${histPaths.slice(0, 10).join("、")}${histPaths.length > 10 ? " 等" : ""}。未改寫歷史（人類決定）；本工具不輸出地址` },
];
for (const r of results) console.log(`  ${r.result === "通過" ? "PASS" : "FAIL"} ${r.tc} ${r.note}`);
if (out) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(results, null, 2));
  fs.writeFileSync(path.join(path.dirname(out), "mail-scan-detail.txt"), [`ml3=${ml3.length}`, `ml4Good=${ml4Good.length}`, `ml4Bad=${ml4Bad.map((x) => x.at).join(",")}`, `compact=${compact.join(",")}`, `generic=${generic.join(",")}`, `histCommits=${histCommits.join(",")}`, `histPaths=${histPaths.join(",")}`].join("\n") + "\n");
}
process.exitCode = results.some((r) => r.result === "失敗") ? 1 : 0;
