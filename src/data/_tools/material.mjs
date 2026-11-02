// material.mjs — 匯出某字庫分檔的撰寫素材（JSONL）（CT-01；architecture.md §8.2 W-3）
// 只使用 Node 內建模組；輸出請放在 scratchpad（architecture.md D-4），不要放進專案。

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import {
  DEFAULT_SOURCES_DIR, ECDICT_POS_MAP, vocabFileInfo, loadWordlists, computeRanking, loadEcdict, loadMissing,
  loadLemmaForms, loadDataFile, wordKey, contextHits, splitSenses, parseArgs,
} from "./lib.mjs";

const HELP = `用法：
  node src/data/_tools/material.mjs --file <vocab 分檔> --out <輸出 .jsonl> [--sources <目錄>]

說明：
  依分檔內每筆的 rank 輸出撰寫素材，每行一個 JSON 物件：
    rank、word、wordKey、sources
    zhtw          ecdict_subset_zhtw.csv 的 translation（釋義與詞性的撰寫素材，M-2）
    simplified    ecdict_subset.csv（簡體原檔）的 translation（M-3 回查用）
    inMissing     是否列於 ecdict_subset_missing.txt（true → meaning、pos 原創，meaningSource = ORIGINAL）
    contextHits   簡體 translation 命中的上下文用詞（质量、程序、水平、注册、文件、文档、地铁；V-VOC-17、H-6）
    posHints      依 M-4 由 zhtw 各義項開頭縮寫推得的詞性（僅供參考）
    forms         lemmatized 檔的詞形（僅供撰寫例句參考，R-7）
    refPhoneticBritish  ECDICT 原 phonetic（英式舊式標註，僅供辨識讀音參考；不得照抄，音標須自行撰寫美式 IPA，M-5）
  分檔不存在但檔名屬於 architecture.md §8.1 分檔表時，改以 R-1～R-8 重算的該區間輸出（並提示）。
  --sources 預設為專案的 sources/（唯讀）。`;

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.file || !args.out || args.file === true || args.out === true) { console.log(HELP); return args.help ? 0 : 1; }
  const sourcesDir = resolve(args.sources && args.sources !== true ? args.sources : DEFAULT_SOURCES_DIR);
  const file = resolve(args.file);
  const out = resolve(args.out);

  const ranking = computeRanking(loadWordlists(sourcesDir));
  let entries; // { rank, word, sources }
  if (existsSync(file)) {
    let win;
    try { win = loadDataFile(file); } catch (e) { console.error(`無法執行資料檔 ${file}：${e.message}`); return 1; }
    const arr = win.MASTER_VOCAB_DATABASE;
    if (!Array.isArray(arr)) { console.error(`${file} 沒有 MASTER_VOCAB_DATABASE 陣列`); return 1; }
    entries = arr.map((it) => ({ rank: it.rank, word: it.word, sources: it.sources }));
  } else {
    const info = vocabFileInfo(basename(file));
    if (!info) { console.error(`找不到分檔 ${file}，且檔名不在分檔表中`); return 1; }
    console.error(`提示：${file} 不存在，改用重算排名 ${info.rankFrom}～${info.rankTo}`);
    entries = ranking.items.slice(info.rankFrom - 1, info.rankTo).map((x) => ({ rank: x.rank, word: x.word, sources: x.sources }));
  }
  entries.sort((a, b) => a.rank - b.rank);

  const ecdict = loadEcdict(sourcesDir);
  const missing = loadMissing(sourcesDir);
  const forms = loadLemmaForms(sourcesDir);
  const lines = [];
  let hitCount = 0; let missCount = 0; let mismatch = 0;
  for (const e of entries) {
    const wk = wordKey(e.word);
    const exp = ranking.items[e.rank - 1];
    if (!exp || exp.wordKey !== wk) mismatch++;
    const ec = ecdict.map.get(wk) || null;
    const hits = ec ? contextHits(ec.simplified) : [];
    if (hits.length) hitCount++;
    if (missing.has(wk)) missCount++;
    const posHints = [];
    if (ec && ec.zhtw) for (const s of splitSenses(ec.zhtw)) {
      const m = /^([a-z]+\.)/i.exec(s);
      const p = m && ECDICT_POS_MAP[m[1].toLowerCase()];
      if (p && !posHints.includes(p)) posHints.push(p);
    }
    lines.push(JSON.stringify({
      rank: e.rank, word: e.word, wordKey: wk, sources: e.sources,
      zhtw: ec ? ec.zhtw : null, simplified: ec ? ec.simplified : null,
      inMissing: missing.has(wk), contextHits: hits, posHints,
      forms: forms.get(wk) || [e.word],
      refPhoneticBritish: ec ? ec.phonetic : null,
    }));
  }
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, lines.join("\n") + "\n", "utf8");
  console.log(`已輸出 ${lines.length} 筆素材 → ${out}`);
  console.log(`上下文用詞命中 ${hitCount} 筆（V-VOC-17 清單需列入交付紀錄）；missing ${missCount} 筆（meaningSource = ORIGINAL）`);
  if (mismatch) { console.error(`警告：${mismatch} 筆的 rank／word 與 R-1～R-8 重算不符，請先執行 validate.mjs`); }
  return 0;
}

let code = 1;
try { code = main(); } catch (e) { console.error(`material.mjs 發生錯誤：${e && e.stack ? e.stack : e}`); code = 1; }
process.exitCode = code;
