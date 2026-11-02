// QA：architecture.md §8.4「QA（v0.3）紀錄完整性」— validate.mjs --all 輸出的 V-VOC-17 警告／資訊、H-1W 警告、
// V-VOC-09 原創原因，逐筆比對 src/data/_records/vocab-XXXX.md 是否有對應列。
// 用法：node tests/data/records-check.mjs <validate --max 100000 輸出檔>
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const txt = fs.readFileSync(process.argv[2], "utf8");
const sec = (id) => { const lines = txt.split(/\r?\n/); const i = lines.findIndex((l) => new RegExp("^[✓!✗] " + id + " ").test(l)); if (i < 0) return []; const out = []; for (let j = i + 1; j < lines.length && /^\s{4}/.test(lines[j]); j++) out.push(lines[j].trim()); return out; };
const parse = (l) => { const m = l.match(/(vocab-\d{4}\.js) rank (\d+) (.+?)：/); return m ? { file: m[1], rank: +m[2], word: m[3], line: l } : null; };
const groups = { "V-VOC-17 警告": sec("V-VOC-17").filter((l) => l.startsWith("警告")), "V-VOC-17 清單（資訊）": sec("V-VOC-17").filter((l) => l.startsWith("資訊")), "H-1W 警告": sec("H-1W").filter((l) => l.startsWith("警告")), "V-VOC-09 原創原因": sec("V-VOC-09").filter((l) => l.startsWith("警告")) };
const res = {};
for (const [g, lines] of Object.entries(groups)) {
  const miss = [];
  for (const l of lines) {
    const p = parse(l); if (!p) continue;
    const recFile = path.join(ROOT, "src/data/_records", p.file.replace(".js", ".md"));
    const md = fs.existsSync(recFile) ? fs.readFileSync(recFile, "utf8") : "";
    const re = new RegExp("(^|[^A-Za-z])" + escRe(p.word) + "([^A-Za-z]|$)", "m");
    const rows = md.split(/\r?\n/).filter((r) => r.startsWith("|") && re.test(r));
    if (!rows.length) miss.push(`${p.file} ${p.rank} ${p.word}`);
  }
  res[g] = { total: lines.length, missing: miss };
  console.log(`${g}：${lines.length} 筆，紀錄缺列 ${miss.length}${miss.length ? "：" + miss.join("；") : ""}`);
}
if (process.argv[3]) fs.writeFileSync(process.argv[3], JSON.stringify(res, null, 2));
