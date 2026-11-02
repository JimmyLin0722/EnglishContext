// build-skeleton.mjs — 產生字庫骨架（15 分檔）與 sources.js（CT-02）
// 依據：docs/02-contract/README.md §3.1、§4.1 R-1～R-8、§4.2 N-1～N-3、§4.3 L-1～L-6、§7.1、§7.2；
//       docs/03-design/architecture.md §8.1、§8.2（W-2）。
// 唯讀輸入：sources/wordlists/*_stats.csv、NAWL_12_lemmatized_for_teaching.csv、
//           sources/ecdict/ecdict_subset.csv、ecdict_subset_missing.txt、LICENSE（SOURCE.txt 只供人工核對版本）。
// 只使用 Node 內建模組與同目錄 ./lib.mjs。

import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import * as L from "./lib.mjs";

const HELP = `用法：
  node src/data/_tools/build-skeleton.mjs [--out <目錄>] [--sources <目錄>] [--data-version YYYY.MM.DD] [--force] [--check]

  --out           輸出目錄（預設 src/data）
  --sources       唯讀輸入目錄（預設 sources）
  --data-version  VOCAB_MANIFEST.dataVersion（預設今日 YYYY.MM.DD；CT-23 會更新）
  --force         輸出目錄中的分檔已有內容欄位時仍覆寫（預設拒絕，避免蓋掉批次任務成果）
  --check         只重算並比對契約 §4.2（N-1），不寫檔

流程：
  1. 依 R-1～R-8 重算 N_B、N_G、segments，與契約 §4.2 比對；不一致即停止、不寫任何分檔（exit 1）。
  2. 依 architecture.md §8.1 寫 15 個分檔（§8.2 格式），每筆 12 鍵；內容欄位為 "" 與 []。
  3. 寫 sources.js：DATA_SOURCE_REGISTRY（6 筆）、VOCAB_MANIFEST、PROJECT_LICENSE。`;

const a = L.parseArgs(process.argv.slice(2));
if (a.help) { console.log(HELP); process.exit(0); }

const sourcesDir = resolve(typeof a.sources === "string" ? a.sources : L.DEFAULT_SOURCES_DIR);
const outDir = resolve(typeof a.out === "string" ? a.out : L.DEFAULT_DATA_DIR);

function today() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
}
const dataVersion = typeof a["data-version"] === "string" ? a["data-version"] : today();
if (!/^\d{4}\.\d{2}\.\d{2}(-\d+)?$/.test(dataVersion)) { console.error(`dataVersion 格式錯誤：${dataVersion}`); process.exit(1); }

function fail(msg) { console.error(`build-skeleton：${msg}`); process.exit(1); }

// ── 1. 重算排名（N-1、V-IN-07） ─────────────────────────────
const lists = L.loadWordlists(sourcesDir);
const R = L.computeRanking(lists);
console.log(`N_B = ${R.nB}（契約 ${L.RECORDED.nB}）　N_G = ${R.nG}（契約 ${L.RECORDED.nG}）`);
for (const s of R.steps) console.log(`  ${s.list}：輸入 ${s.inputRows}、不重複 ${s.inputUnique}、與先前重疊 ${s.overlap}、新增 ${s.added}、累計 ${s.cumulative}`);
for (const s of R.segments) console.log(`  區段 ${s.list} ${s.rankFrom}～${s.rankTo}`);
const same = R.nB === L.RECORDED.nB && R.nG === L.RECORDED.nG && JSON.stringify(R.segments) === JSON.stringify(L.RECORDED.segments);
if (!same) fail("重算結果與契約 §4.2 不一致：依 N-1 不得產出分檔，任務標 blocked 並回報差異");
console.log("與契約 §4.2 一致");

// 分檔表需首尾相接涵蓋 1～N_G
{
  let next = 1;
  for (const f of L.VOCAB_FILES) { if (f.rankFrom !== next) fail(`分檔表不連續：${f.file}`); next = f.rankTo + 1; }
  if (next - 1 !== R.nG) fail(`分檔表涵蓋 1～${next - 1}，與 N_G ${R.nG} 不符`);
}
if (a.check) process.exit(0);

// ── 2. 骨架 ────────────────────────────────────────────────
const ecdict = L.loadEcdict(sourcesDir);
const missing = L.loadMissing(sourcesDir);
const items = R.items.map((it) => {
  const inEc = ecdict.map.has(it.wordKey);
  const inMiss = missing.has(it.wordKey);
  if (inEc === inMiss) fail(`wordKey ${it.wordKey}（rank ${it.rank}）${inEc ? "同時在子集與 missing" : "不在子集也不在 missing"}`);
  return {
    rank: it.rank,
    word: it.word,
    phonetic: "",
    pos: [],
    meaning: "",
    collocation: "",
    academicContext: "",
    example: "",
    sources: it.sources.slice(),
    phoneticSource: "ORIGINAL",
    meaningSource: inEc ? "ECDICT" : "ORIGINAL",
    contentSource: "ORIGINAL",
  };
});

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

// 防呆：既有分檔若已有內容欄位，未加 --force 不覆寫
if (!a.force) {
  for (const f of L.VOCAB_FILES) {
    const p = join(outDir, f.file);
    if (!existsSync(p)) continue;
    let win;
    try { win = L.loadDataFile(p); } catch { continue; }
    const arr = Array.isArray(win.MASTER_VOCAB_DATABASE) ? win.MASTER_VOCAB_DATABASE : [];
    const filled = arr.filter((x) => x && L.CONTENT_KEYS.some((k) => (Array.isArray(x[k]) ? x[k].length : x[k])));
    if (filled.length) fail(`${f.file} 已有 ${filled.length} 筆內容，拒絕覆寫（確認後加 --force）`);
  }
}

const fileStats = [];
for (const f of L.VOCAB_FILES) {
  const part = items.filter((it) => it.rank >= f.rankFrom && it.rank <= f.rankTo);
  if (part.length !== f.rankTo - f.rankFrom + 1) fail(`${f.file} 筆數 ${part.length} 與區間不符`);
  writeFileSync(join(outDir, f.file), L.serializeVocabFile(part, f.rankFrom, f.rankTo), "utf8");
  fileStats.push({ file: f.file, rankFrom: f.rankFrom, rankTo: f.rankTo, count: part.length, original: part.filter((x) => x.meaningSource === "ORIGINAL").map((x) => `${x.word}(${x.rank})`) });
}

// ── 3. sources.js ─────────────────────────────────────────
const count = (code) => items.filter((it) => it.sources.includes(code)).length;
const ecdictCount = items.filter((it) => it.meaningSource === "ECDICT").length;
const licenseRaw = L.readText(join(sourcesDir, "ecdict", "LICENSE"));
const licenseLf = licenseRaw.replace(/\r\n/g, "\n");
const copyrightLine = licenseLf.split("\n").map((l) => l.trim()).find((l) => /^Copyright/.test(l));
if (!copyrightLine) fail("LICENSE 中找不到 Copyright 行");

const WORDLIST_MODS = ["合併 NGSL、TSL、BSL、NAWL 並去重", "重新編排頻率排名", "補充音標、詞性、釋義、搭配詞、學術情境、例句欄位"];
const CC_NOTE = "官網原文：CC BY-SA 4.0 International";

function wordlistEntry(code) {
  const e = L.EXPECTED_REGISTRY[code];
  return {
    code, kind: e.kind, name: e.name, fullName: e.fullName, version: e.version, authors: e.authors.slice(),
    licenseName: e.licenseName, licenseUrl: e.licenseUrl, homepageUrl: e.homepageUrl, originUrl: e.originUrl,
    confirmation: { status: "confirmed", confirmedAt: e.confirmedAt, confirmedBy: e.confirmedBy, evidenceUrl: e.evidenceUrl, note: CC_NOTE },
    modifications: WORDLIST_MODS.slice(),
    originalItemCount: lists[code].report.uniqueWordKeys,
    includedItemCount: count(code),
    copyrightNotice: null,
    licenseText: null,
  };
}
const E = L.EXPECTED_REGISTRY.ECDICT;
const O = L.EXPECTED_REGISTRY.ORIGINAL;
const registry = [
  ...L.WORDLIST_ORDER.map(wordlistEntry),
  {
    code: "ECDICT", kind: E.kind, name: E.name, fullName: E.fullName, version: E.version, authors: E.authors.slice(),
    licenseName: E.licenseName, licenseUrl: E.licenseUrl, homepageUrl: E.homepageUrl, originUrl: E.originUrl,
    confirmation: { status: "confirmed", confirmedAt: E.confirmedAt, confirmedBy: E.confirmedBy, evidenceUrl: E.evidenceUrl, note: "commit ab22ad36302cafc6349a050e2b60894855208055（2026-10-24），下載 2026-10-30；需保留 MIT 聲明" },
    modifications: ["簡體轉繁體台灣用語", "精簡釋義"],
    originalItemCount: null,
    includedItemCount: ecdictCount,
    copyrightNotice: copyrightLine,
    licenseText: licenseLf,
  },
  {
    code: "ORIGINAL", kind: O.kind, name: O.name, fullName: O.fullName, version: dataVersion, authors: O.authors.slice(),
    licenseName: O.licenseName, licenseUrl: O.licenseUrl, homepageUrl: "", originUrl: O.originUrl,
    confirmation: { status: "confirmed", confirmedAt: O.confirmedAt, confirmedBy: O.confirmedBy, evidenceUrl: O.evidenceUrl, note: "PRD Q-31 決議：原創內容以 CC BY-SA 4.0 釋出" },
    modifications: [],
    originalItemCount: null,
    includedItemCount: null,
    copyrightNotice: null,
    licenseText: null,
  },
];
const manifest = { dataVersion, nO: 1000, nB: R.nB, nG: R.nG, segments: R.segments.map((s) => ({ list: s.list, rankFrom: s.rankFrom, rankTo: s.rankTo })) };
const projectLicense = {
  copyrightHolder: "JimmyLin",
  copyrightYear: 2026,
  codeLicense: "MIT",
  dataLicense: "CC BY-SA 4.0",
  dataLicenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  codeLicenseUrl: "https://opensource.org/license/mit",
};
const src = [
  "// 資料來源登錄、字庫摘要、專案授權（契約 §3.1；由 _tools/build-skeleton.mjs 產生）",
  `window.DATA_SOURCE_REGISTRY = ${JSON.stringify(registry, null, 2)};`,
  `window.VOCAB_MANIFEST = ${JSON.stringify(manifest, null, 2)};`,
  `window.PROJECT_LICENSE = ${JSON.stringify(projectLicense, null, 2)};`,
  "",
].join("\n");
writeFileSync(join(outDir, "sources.js"), src, "utf8");

// ── 摘要 ─────────────────────────────────────────────────
console.log(`\n輸出目錄：${outDir}　dataVersion：${dataVersion}`);
for (const s of fileStats) console.log(`  ${s.file}　${s.rankFrom}～${s.rankTo}　${s.count} 筆${s.original.length ? `　meaningSource ORIGINAL：${s.original.join("、")}` : ""}`);
console.log(`  合計 ${items.length} 筆`);
for (const e of registry) console.log(`  ${e.code}：originalItemCount ${e.originalItemCount}、includedItemCount ${e.includedItemCount}`);
const fw = ["the", "of", "a", "and", "to", "in", "he", "it", "can", "will"];
console.log(`  功能詞排名：${fw.map((w) => `${w} ${R.byKey.get(w)?.rank ?? "（缺）"}`).join("、")}`);
