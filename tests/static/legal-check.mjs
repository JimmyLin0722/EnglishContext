// QA 靜態檢查（第 8 輪，補 PRD v0.17 R-25 留下的 TC；契約 L-8、§7.8 V-LGL-01～06；architecture §10.9、§10.10 Q4）
// TC-23-08a：V-LGL-05 (a) 進入交付 HTML 的資料檔字串值；TC-23-08b：V-LGL-06 p5-009、p5-103 與上一個交付版本（git f547158）比對；
// TC-LGL-S01：交付 HTML 全文舊文字 0 次、新文字至少 1 次（V-LGL-01～04）；TC-LGL-S02：.p5-heading-note、.p5-record__hint 樣式規則。
// 用法：node tests/static/legal-check.mjs [輸出 JSON]
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const out = process.argv[2];
const results = [];
function rec(tc, ac, ok, note) { results.push({ suite: "legal", tc, ac, result: ok ? "通過" : "失敗", note }); console.log(`  ${ok ? "PASS" : "FAIL"} ${tc} ${ac} ${note}`); }
const J = (x) => JSON.stringify(x);
// 第 9 輪（ML-1、ML-3、V-MAIL-02）：只保留現行空白格式；連續地址以規則判斷，本檔不含完整地址
const CONTACT = "email: d o n c l y d e 0 7 2 2 @ g m a i l . c o m";
const MAIL_RE = new RegExp("[A-Za-z0-9._%+-]*" + String.fromCharCode(64) + "gm" + "ail" + "\\." + "c" + "om", "ig");
const html = fs.readFileSync(path.join(ROOT, "dist/english-master-track.html"), "utf8");
const LT = {
  1: "常用搭配詞",
  2: "題型參考 TOEIC®（多益），非 ETS 官方或認可內容",
  3: "原創內容（例句、解析、Part 5 題目、長難句、句型）由 JimmyLin 以 AI 輔助編製，JimmyLin 就其享有的權利以 CC BY-SA 4.0 授權",
  4: "PWA 圖示由 AI 依 JimmyLin 的構想生成；圖示與名稱「EnglishContext」作為品牌標識使用，JimmyLin 保留其享有的權利，不適用 MIT 與 CC BY-SA 4.0",
  5: "TOEIC® 為 ETS 的註冊商標。本網站與 ETS 無關，亦未經其認可或核准。",
  6: "be interested in 表示「對……有興趣」，是常見的形容詞＋介系詞搭配。",
};
const A = ["多益", "TOEIC"]; const B = ["常考", "必考", "最常考", "最常見", "最常用", "高頻"];
// V-LGL-05 分句符號（SA 定案，FB-63）
const splitSent = (s) => s.split(/[。；？！;?!\n\r]|\.(?=\s|$)/);

function load(dir, read = (f) => fs.readFileSync(path.join(dir, f), "utf8"), files = fs.readdirSync(dir).filter((f) => f.endsWith(".js"))) {
  const sandbox = { window: {}, self: {}, console: { log() {}, warn() {}, error() {} } }; sandbox.globalThis = sandbox; sandbox.window = sandbox; sandbox.self = sandbox;
  const ctx = vm.createContext(sandbox);
  for (const f of files) vm.runInContext(read(f), ctx, { filename: f });
  return sandbox;
}
const dataDir = path.join(ROOT, "src/data");
const files = fs.readdirSync(dataDir).filter((f) => f.endsWith(".js"));
const box = load(dataDir);
const roots = Object.keys(box).filter((k) => !["window", "self", "console", "globalThis"].includes(k));
let nStr = 0; const lit = [], ab = [], alone = [];
function visit(v, where) {
  if (typeof v === "string") {
    nStr++;
    for (const w of ["多益常考", "多益最常見"]) if (v.includes(w)) lit.push(`${where}：${v.slice(0, 60)}`);
    for (const sent of splitSent(v)) if (A.some((a) => sent.includes(a)) && B.some((b) => sent.includes(b))) ab.push(`${where}：${sent.slice(0, 80)}`);
    if (/常考|必考/.test(v)) alone.push(`${where}：${v.slice(0, 80)}`);
  } else if (Array.isArray(v)) v.forEach((x, i) => visit(x, `${where}[${i}]`));
  else if (v && typeof v === "object") for (const k of Object.keys(v)) visit(v[k], `${where}.${k}`);
}
for (const k of roots) visit(box[k], k);
// 單獨出現的「常考」「必考」判讀：「通常考慮」屬一般語意；其餘列出交人工判讀
const aloneBad = alone.filter((x) => !/通常考|非常考|常考慮|經常考/.test(x));
rec("TC-23-08a", "AC-23-08 (1)(3)、E-122（V-LGL-05 (a)）", lit.length === 0 && ab.length === 0 && aloneBad.length === 0,
  `src/data 頂層 ${files.length} 檔、全域變數 ${roots.length} 個、字串 ${nStr.toLocaleString()} 筆：「多益常考」「多益最常見」${lit.length} 筆；A 組與 B 組同句 ${ab.length} 筆${ab.length ? "（" + ab.slice(0, 5).join("；") + "）" : ""}；單獨「常考」「必考」${alone.length} 筆${alone.length ? "（" + alone.slice(0, 5).join("；") + "）" : ""}，判讀為考試頻率語意 ${aloneBad.length} 筆`);

// V-LGL-06
{
  const bank = box.PART5_QUESTION_BANK;
  const oldCode = execFileSync("git", ["show", "f547158:src/data/part5.js"], { cwd: ROOT, maxBuffer: 64 << 20, encoding: "utf8" });
  const oldBox = load("", () => oldCode, ["part5.js"]);
  const oldBank = oldBox.PART5_QUESTION_BANK;
  const by = (b, id) => b.find((q) => q.id === id);
  const q9 = by(bank, "p5-009"), o9 = by(oldBank, "p5-009");
  const fields = ["id", "sentence", "options", "correctIndex", "type", "source"];
  const same9 = fields.filter((f) => J(q9[f]) !== J(o9[f])); const structSame = q9.explanation.structure === o9.explanation.structure;
  const same103 = J(by(bank, "p5-103")) === J(by(oldBank, "p5-103"));
  const others = bank.filter((q) => !["p5-009"].includes(q.id) && J(q) !== J(by(oldBank, q.id))).map((q) => q.id);
  rec("TC-23-08b", "AC-23-08 (2)、Q-71、Q-75（V-LGL-06）", q9.explanation.coreStrategy === LT[6] && same9.length === 0 && structSame && same103 && others.length === 0 && bank.length === 200,
    `p5-009 coreStrategy 逐字 LT-6=${q9.explanation.coreStrategy === LT[6]}；與上一交付版本（f547158）相比變動欄位 ${same9.join("、") || "無"}、structure 相同=${structSame}（舊 coreStrategy「${o9.explanation.coreStrategy.slice(0, 40)}…」）；p5-103 整筆相同=${same103}；其他題目變動 ${others.length} 題`);
}

// V-LGL-01～04：交付 HTML
{
  const gone = ["多益常考", "多益最常見", "題型對應多益 Part 5", "TOEIC®（多益）Part 5", "著作權人 JimmyLin", "保留所有權利"].filter((w) => html.includes(w));
  const count = (s) => html.split(s).length - 1;
  const ok = gone.length === 0 && [1, 2, 3, 5, 6].every((k) => count(LT[k]) >= 1) && count(CONTACT) >= 1 && count("mailto:") === 0 && (html.match(MAIL_RE) || []).length === 0;
  rec("TC-LGL-S01", "AC-06-01、AC-10-02、AC-23-02、AC-23-06、AC-23-07、AC-23-08（V-LGL-01～04、交付檔字串）", ok,
    `舊文字 ${gone.join("、") || "0 次"}；LT-1 ${count(LT[1])} 次、LT-2 ${count(LT[2])} 次、LT-3 ${count(LT[3])} 次、LT-5 ${count(LT[5])} 次、LT-6 ${count(LT[6])} 次；聯絡行字串 ${count(CONTACT)} 次（常數 1 處；v0.19 來源為 core/site-content.js）、mailto ${count("mailto:")}、無空格位址（ML-3 規則）${(html.match(MAIL_RE) || []).length}`);
}
// 第 12 輪（PRD v0.21 R-31、Q-108 A；契約 v0.21 V-LGL-02、DS-71；architecture v0.17 §7.31.3、§10.14 Q15）：
// dist/ 下 5 個 HTML 與 sw.js 全文（含內嵌程式註解）「TOEIC®（多益）Part 5」0 次；LT-2 新文字 ≥ 1（主 HTML、index、about）；LT-3「Part 5 題目」不屬本條、仍 ≥ 1
{
  const OLD2 = "TOEIC®（多益）Part 5";
  const files = ["dist/english-master-track.html", "dist/site/index.html", "dist/site/about.html", "dist/site/contact.html", "dist/site/privacy.html", "dist/site/sw.js"];
  const cnt = (s, w) => s.split(w).length - 1;
  const rows = files.map((f) => { const t = fs.existsSync(path.join(ROOT, f)) ? fs.readFileSync(path.join(ROOT, f), "utf8") : null; return { f, exists: t !== null, old: t ? cnt(t, OLD2) : -1, lt2: t ? cnt(t, LT[2]) : -1, lt3: t ? cnt(t, LT[3]) : -1 }; });
  const need2 = ["dist/english-master-track.html", "dist/site/index.html", "dist/site/about.html"];
  const ok = rows.every((r) => r.exists && r.old === 0) && rows.filter((r) => need2.includes(r.f)).every((r) => r.lt2 >= 1 && r.lt3 >= 1);
  rec("TC-LGL-S03", "AC-10-02、AC-54-01、AC-56-03、AC-56-05、AC-56-06、AC-56-07、AC-57-03、AC-23-08（V-LGL-02 v0.21：交付物「TOEIC®（多益）Part 5」0 次）", ok,
    rows.map((r) => `${r.f.replace("dist/", "")}：舊 ${r.old}、LT-2 ${r.lt2}、LT-3 ${r.lt3}`).join("；"));
}
// CSS（V-LGL-02、E-123、HN-1、E-134）
{
  const css = fs.readFileSync(path.join(ROOT, "src/app/styles/40-part5.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const rule = (sel) => [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)].filter((m) => m[1].split(",").map((x) => x.trim()).includes(sel)).map((m) => m[2]).join(";");
  const note = rule(".p5-heading-note"), hint = rule(".p5-record__hint");
  const badNote = ["nowrap", "text-overflow", "overflow: hidden", "height", "max-height"].filter((w) => note.replace(/line-height[^;]*;?/g, "").includes(w));
  const badHint = ["nowrap", "text-overflow", "overflow: hidden", "--accent"].filter((w) => hint.includes(w));
  rec("TC-LGL-S02", "AC-10-02、AC-48-12（V-LGL-02、E-123、HN-1、E-134）", !!note && !!hint && badNote.length === 0 && badHint.length === 0, `.p5-heading-note 禁用規則 ${badNote.join("、") || "無"}；.p5-record__hint 禁用規則 ${badHint.join("、") || "無"}`);
}
const sum = { pass: results.filter((r) => r.result === "通過").length, fail: results.filter((r) => r.result === "失敗").length };
console.log(`法律文字靜態檢查：通過 ${sum.pass}、失敗 ${sum.fail}`);
if (out) { fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, JSON.stringify(results, null, 2)); }
