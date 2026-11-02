// sample.mjs — 固定種子抽樣（CT-01；architecture.md §8.4 S-3 自查與 QA V-VOC-18 抽查共用）
// 只使用 Node 內建模組。同一組參數與同一份分檔，輸出必定相同（無時間戳、無 Math.random）。

import { existsSync } from "node:fs";
import { basename, resolve } from "node:path";
import { DEFAULT_SOURCES_DIR, loadDataFile, loadEcdict, loadMissing, wordKey, contextHits, mulberry32, parseArgs } from "./lib.mjs";

const HELP = `用法：
  node src/data/_tools/sample.mjs --file <vocab 分檔> --ratio <r> --min <n> --seed <整數> [--ecdict-only] [--json] [--sources <目錄>]

說明：
  抽樣數 = min(母體數, max(--min, ceil(母體數 × --ratio)))；以 mulberry32(--seed) 做部分 Fisher–Yates 洗牌後取前 n 筆，依 rank 排序列出。
  母體 = 分檔全部筆數；加 --ecdict-only 時只取 meaningSource = "ECDICT" 者（QA V-VOC-18）。
  每筆列出完整 12 個欄位，以及 ECDICT 素材：zhtw（繁體台灣用語 translation）、simplified（簡體原檔）、上下文用詞命中。
  --json 改輸出 JSON（方便 QA 程式比對）。

慣例（architecture.md §8.4）：
  自查 S-3：--ratio 0.1 --min 35 --seed <起始排名>（不合格 > 5% 時改 --seed <起始排名 + 1>）
  QA     ：--ratio 0.05 --min 20 --seed <起始排名 + 1000> --ecdict-only`;

function main() {
  const a = parseArgs(process.argv.slice(2));
  if (a.help) { console.log(HELP); return 0; }
  const need = ["file", "ratio", "min", "seed"].filter((k) => a[k] === undefined || a[k] === true);
  if (need.length) { console.error(`缺少參數：${need.map((k) => `--${k}`).join("、")}\n`); console.log(HELP); return 1; }
  const ratio = Number(a.ratio); const min = Number(a.min); const seed = Number(a.seed);
  if (!(ratio >= 0 && ratio <= 1)) { console.error("--ratio 須為 0～1 的數字"); return 1; }
  if (!Number.isInteger(min) || min < 0) { console.error("--min 須為非負整數"); return 1; }
  if (!Number.isInteger(seed)) { console.error("--seed 須為整數"); return 1; }
  const file = resolve(a.file);
  if (!existsSync(file)) { console.error(`分檔不存在：${file}`); return 1; }
  let win;
  try { win = loadDataFile(file); } catch (e) { console.error(`無法執行分檔：${e.message}`); return 1; }
  const all = Array.isArray(win.MASTER_VOCAB_DATABASE) ? win.MASTER_VOCAB_DATABASE.slice() : null;
  if (!all) { console.error(`${file} 沒有 MASTER_VOCAB_DATABASE 陣列`); return 1; }
  all.sort((x, y) => x.rank - y.rank);
  const pop = a["ecdict-only"] ? all.filter((it) => it.meaningSource === "ECDICT") : all;
  const n = Math.min(pop.length, Math.max(min, Math.ceil(pop.length * ratio - 1e-9)));
  const rand = mulberry32(seed);
  const idx = pop.map((_, i) => i);
  for (let i = 0; i < n; i++) { const j = i + Math.floor(rand() * (idx.length - i)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  const picked = idx.slice(0, n).sort((x, y) => x - y).map((i) => pop[i]);

  const sourcesDir = resolve(a.sources && a.sources !== true ? a.sources : DEFAULT_SOURCES_DIR);
  let ecdict = null; let missing = new Set();
  try { ecdict = loadEcdict(sourcesDir); missing = loadMissing(sourcesDir); } catch (e) { console.error(`提示：無法讀取 ECDICT 素材（${e.message}），只列資料欄位`); }

  const rows = picked.map((it) => {
    const wk = wordKey(it.word);
    const ec = ecdict && ecdict.map.get(wk);
    return { item: it, material: { wordKey: wk, zhtw: ec ? ec.zhtw : null, simplified: ec ? ec.simplified : null, inMissing: missing.has(wk), contextHits: ec ? contextHits(ec.simplified) : [] } };
  });
  const head = { file: basename(file), population: pop.length, total: all.length, ecdictOnly: !!a["ecdict-only"], ratio, min, seed, sampled: n };
  if (a.json) { console.log(JSON.stringify({ params: head, samples: rows }, null, 2)); return 0; }
  const out = [];
  out.push(`抽樣：${head.file}　母體 ${head.population}${head.ecdictOnly ? "（只含 meaningSource = ECDICT）" : ""}／全檔 ${head.total}　ratio ${ratio}　min ${min}　seed ${seed}　抽出 ${n} 筆`);
  out.push(`抽到的 rank：${picked.map((it) => it.rank).join(", ")}`);
  rows.forEach(({ item: it, material: m }, k) => {
    out.push("", `── [${k + 1}/${n}] rank ${it.rank}　${it.word}`);
    out.push(`  phonetic        ${it.phonetic}`);
    out.push(`  pos             ${JSON.stringify(it.pos)}`);
    out.push(`  meaning         ${it.meaning}`);
    out.push(`  collocation     ${it.collocation}`);
    out.push(`  academicContext ${it.academicContext}`);
    out.push(`  example         ${it.example}`);
    out.push(`  sources         ${JSON.stringify(it.sources)}　phoneticSource ${it.phoneticSource}　meaningSource ${it.meaningSource}　contentSource ${it.contentSource}`);
    out.push(`  〔素材〕zhtw       ${m.zhtw === null ? "（ECDICT 查無）" : m.zhtw}`);
    out.push(`  〔素材〕simplified ${m.simplified === null ? "（ECDICT 查無）" : m.simplified}`);
    if (m.inMissing) out.push("  〔素材〕列於 ecdict_subset_missing.txt（meaningSource 應為 ORIGINAL）");
    if (m.contextHits.length) out.push(`  〔素材〕上下文用詞：${m.contextHits.join("、")}（M-3）`);
  });
  console.log(out.join("\n"));
  return 0;
}

let code = 1;
try { code = main(); } catch (e) { console.error(`sample.mjs 發生錯誤：${e && e.stack ? e.stack : e}`); code = 1; }
process.exitCode = code;
