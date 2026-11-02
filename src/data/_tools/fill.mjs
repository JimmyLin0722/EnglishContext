// fill.mjs — 把撰寫結果依 rank 合併回字庫分檔（CT-01；architecture.md §8.2 W-4、W-5）
// 只使用 Node 內建模組。任何一筆被拒絕時整批不寫入、exit code 1。

import { existsSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { CONTENT_KEYS, VOCAB_KEYS, vocabFileInfo, loadDataFile, serializeVocabFile, parseArgs } from "./lib.mjs";

const HELP = `用法：
  node src/data/_tools/fill.mjs --file <vocab 分檔> --input <目錄或 .jsonl> [--dry-run] [--out <另存路徑>]

輸入：
  --input 為目錄時讀取其中所有 *.jsonl（依檔名排序）；也可直接指定單一 .jsonl。
  每行一個 JSON 物件：{ "rank": 401, "phonetic": "/…/", "pos": ["v."], "meaning": "…", "collocation": "…",
                       "academicContext": "…", "example": "…", "meaningSource": "ORIGINAL" }
  - 必填 rank；其餘內容欄位（phonetic、pos、meaning、collocation、academicContext、example）有給才覆寫。
  - meaningSource 選填，只允許改為 "ORIGINAL"（M-6，需在交付紀錄說明原因）。
  - 可附 word、sources、phoneticSource、contentSource 供核對，但必須與分檔現值完全相同。

拒絕（exit code 1，分檔不變）：
  rank 不在分檔區間、同一 rank 出現多次、改動 rank／word／sources／phoneticSource／contentSource、
  meaningSource 改為 "ORIGINAL" 以外的值、未知欄位、欄位型別錯誤、JSON 解析失敗。

輸出：依 architecture.md §8.2 重寫分檔（檔頭註解、concat 包裝、每筆一行、鍵順序依 data-schema.ts）。
  --dry-run 只檢查不寫入；--out 寫到另一路徑（測試用）。`;

const ALLOWED = new Set([...CONTENT_KEYS, "rank", "meaningSource", "word", "sources", "phoneticSource", "contentSource"]);
const LOCKED = ["word", "sources", "phoneticSource", "contentSource"];

function readInputs(input) {
  const st = statSync(input);
  const files = st.isDirectory()
    ? readdirSync(input).filter((f) => f.toLowerCase().endsWith(".jsonl")).sort().map((f) => join(input, f))
    : [input];
  const recs = []; const errors = [];
  for (const f of files) {
    const lines = readFileSync(f, "utf8").replace(/^﻿/, "").split(/\r?\n/);
    lines.forEach((l, i) => {
      if (!l.trim()) return;
      try { recs.push({ rec: JSON.parse(l), where: `${basename(f)}:${i + 1}` }); }
      catch (e) { errors.push(`${basename(f)}:${i + 1} JSON 解析失敗：${e.message}`); }
    });
  }
  return { files, recs, errors };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.file || !args.input || args.file === true || args.input === true) { console.log(HELP); return args.help ? 0 : 1; }
  const file = resolve(args.file);
  const input = resolve(args.input);
  if (!existsSync(file)) { console.error(`分檔不存在：${file}（請先由 CT-02 產生骨架）`); return 1; }
  if (!existsSync(input)) { console.error(`輸入不存在：${input}`); return 1; }

  let win;
  try { win = loadDataFile(file); } catch (e) { console.error(`無法執行分檔 ${file}：${e.message}`); return 1; }
  const items = win.MASTER_VOCAB_DATABASE;
  if (!Array.isArray(items)) { console.error(`${file} 沒有 MASTER_VOCAB_DATABASE 陣列`); return 1; }
  const byRank = new Map(items.map((it) => [it.rank, it]));
  const info = vocabFileInfo(basename(file));
  const ranks = items.map((it) => it.rank);
  const rankFrom = info ? info.rankFrom : Math.min(...ranks);
  const rankTo = info ? info.rankTo : Math.max(...ranks);

  const { files, recs, errors } = readInputs(input);
  if (!files.length) errors.push(`輸入目錄沒有 .jsonl 檔：${input}`);
  const seen = new Map();
  const updates = [];
  for (const { rec, where } of recs) {
    if (rec === null || typeof rec !== "object" || Array.isArray(rec)) { errors.push(`${where}：不是物件`); continue; }
    const r = rec.rank;
    if (!Number.isInteger(r)) { errors.push(`${where}：rank 必須是整數（${JSON.stringify(r)}）`); continue; }
    if (r < rankFrom || r > rankTo || !byRank.has(r)) { errors.push(`${where}：rank ${r} 不在分檔區間 ${rankFrom}～${rankTo}，拒絕`); continue; }
    if (seen.has(r)) { errors.push(`${where}：rank ${r} 重複（先前在 ${seen.get(r)}）`); continue; }
    seen.set(r, where);
    const cur = byRank.get(r);
    const bad = [];
    for (const k of Object.keys(rec)) if (!ALLOWED.has(k)) bad.push(`未知欄位 ${k}`);
    for (const k of LOCKED) if (k in rec && JSON.stringify(rec[k]) !== JSON.stringify(cur[k])) bad.push(`不得改動 ${k}（現值 ${JSON.stringify(cur[k])}，輸入 ${JSON.stringify(rec[k])}）`);
    if ("meaningSource" in rec && rec.meaningSource !== cur.meaningSource && rec.meaningSource !== "ORIGINAL") bad.push(`meaningSource 只允許改為 "ORIGINAL"（輸入 ${JSON.stringify(rec.meaningSource)}）`);
    for (const k of CONTENT_KEYS) {
      if (!(k in rec)) continue;
      if (k === "pos") { if (!Array.isArray(rec.pos) || !rec.pos.every((p) => typeof p === "string")) bad.push("pos 必須是字串陣列"); }
      else if (typeof rec[k] !== "string") bad.push(`${k} 必須是字串`);
    }
    if (bad.length) { errors.push(`${where}（rank ${r} ${cur.word}）：${bad.join("；")}`); continue; }
    updates.push(rec);
  }

  if (errors.length) {
    console.error(`拒絕合併（${errors.length} 個問題），分檔未變更：`);
    for (const e of errors.slice(0, 50)) console.error(`  - ${e}`);
    if (errors.length > 50) console.error(`  …另有 ${errors.length - 50} 個`);
    return 1;
  }

  const fieldCount = {};
  for (const rec of updates) {
    const cur = byRank.get(rec.rank);
    for (const k of [...CONTENT_KEYS, "meaningSource"]) if (k in rec) { cur[k] = k === "pos" ? rec.pos.slice() : rec[k]; fieldCount[k] = (fieldCount[k] || 0) + 1; }
  }
  // 補齊缺鍵以免輸出漏鍵（僅在分檔本身缺鍵時發生，驗證器會另行報告）
  const out = items.map((it) => { const o = {}; for (const k of VOCAB_KEYS) if (k in it) o[k] = it[k]; for (const k of Object.keys(it)) if (!(k in o)) o[k] = it[k]; return o; });
  const text = serializeVocabFile(out, rankFrom, rankTo);
  const filled = items.filter((it) => typeof it.meaning === "string" && it.meaning.trim() && typeof it.example === "string" && it.example.trim()).length;
  console.log(`讀入 ${files.length} 個 .jsonl、${recs.length} 筆；合併 ${updates.length} 筆；欄位更新：${Object.entries(fieldCount).map(([k, v]) => `${k} ${v}`).join("、") || "無"}`);
  console.log(`分檔 ${basename(file)}：${items.length} 筆，已有 meaning 與 example 的 ${filled} 筆`);
  if (args["dry-run"]) { console.log("--dry-run：未寫入"); return 0; }
  const target = args.out && args.out !== true ? resolve(args.out) : file;
  const tmp = `${target}.tmp-${process.pid}`;
  writeFileSync(tmp, text, "utf8");
  renameSync(tmp, target);
  console.log(`已寫入 ${target}；請接著執行 validate.mjs --file ${target}`);
  return 0;
}

let code = 1;
try { code = main(); } catch (e) { console.error(`fill.mjs 發生錯誤：${e && e.stack ? e.stack : e}`); code = 1; }
process.exitCode = code;
