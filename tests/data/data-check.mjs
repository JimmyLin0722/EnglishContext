// QA 資料驗收（獨立實作，不引用 src/data/_tools）：依 PRD AC 與契約 §4、§7 檢查交付資料檔。
// 用法：node tests/data/data-check.mjs [輸出 JSON 路徑]
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DATA = path.join(ROOT, "src", "data");
const SRC = path.join(ROOT, "sources");
const out = process.argv[2];

const results = [];
function rec(tc, ac, ok, note) {
  results.push({ suite: "data", tc, ac, result: ok ? "通過" : "失敗", note });
  console.log(`  ${ok ? "PASS" : "FAIL"} ${tc} ${ac} ${note}`);
}

// ── 載入資料檔（依建置順序；與 tools/build.mjs B-2 相同：vm 中執行） ──
const win = {};
const ctx = vm.createContext({ window: win });
const files = fs.readdirSync(DATA).filter((f) => f.endsWith(".js") && !f.startsWith("_"));
const order = (f) => (f === "sources.js" ? 0 : f.startsWith("vocab-") ? 1 : 2);
files.sort((a, b) => order(a) - order(b) || a.localeCompare(b));
for (const f of files) vm.runInContext(fs.readFileSync(path.join(DATA, f), "utf8"), ctx, { filename: f });

const V = [...win.MASTER_VOCAB_DATABASE].sort((a, b) => a.rank - b.rank);
const REG = win.DATA_SOURCE_REGISTRY;
const MAN = win.VOCAB_MANIFEST;
const wk = (w) => (typeof w === "string" ? w.normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase() : "");

// ── 讀字表（V-IN-01：UTF-8 嚴格 → latin-1） ──
function readText(p) {
  const buf = fs.readFileSync(p);
  let t;
  try { t = new TextDecoder("utf-8", { fatal: true }).decode(buf); } catch { t = new TextDecoder("latin1").decode(buf); }
  return t.replace(/^﻿/, "");
}
function rows(p) {
  return readText(p).split(/\r?\n/).map((l) => l.split(",").map((c) => c.trim())).filter((r) => r.some((c) => c) && !r[0].startsWith("##"));
}
function rankList(file, rankCol) {
  const r = rows(path.join(SRC, "wordlists", file));
  const head = r[0];
  const ri = head.indexOf(rankCol);
  const list = r.slice(1).map((x, i) => ({ w: wk(x[0]), r: parseInt(x[ri], 10), i })).filter((x) => x.w);
  list.sort((a, b) => a.r - b.r || a.i - b.i);
  const seen = new Set(); const outL = [];
  for (const x of list) if (!seen.has(x.w)) { seen.add(x.w); outL.push(x.w); }
  return outL;
}
const NGSL = rankList("NGSL_12_stats.csv", "SFI Rank");
const TSL = rankList("TSL_12_stats.csv", "TSL Rank");
const BSL = rankList("BSL_120_stats.csv", "BSL Rank");
const NAWL = (() => { const seen = new Set(); const o = []; for (const x of rows(path.join(SRC, "wordlists", "NAWL_12_lemmatized_for_teaching.csv"))) { const w = wk(x[0]); if (w && !seen.has(w)) { seen.add(w); o.push(w); } } return o; })();

// 依契約 §4.1 R-1～R-4 獨立重算期望排名
const expected = [];
const used = new Set();
for (const list of [NGSL, TSL, BSL, NAWL]) for (const w of list) if (!used.has(w)) { used.add(w); expected.push(w); }
const setOf = { NGSL: new Set(NGSL), TSL: new Set(TSL), BSL: new Set(BSL), NAWL: new Set(NAWL) };

const N_O = 1000;
const nB = V.filter((x) => Array.isArray(x.sources) && x.sources.includes("NGSL")).length;
const nG = V.length;

// TC-D01 AC-03-06：字量與契約 §4.2 紀錄值
rec("TC-D01", "AC-03-06", nB === 2809 && nG === 5620 && MAN && MAN.nB === 2809 && MAN.nG === 5620 && expected.length === 5620,
  `N_O=${N_O}、N_B=${nB}、N_G=${nG}；VOCAB_MANIFEST nB=${MAN && MAN.nB} nG=${MAN && MAN.nG}；依字表重算=${expected.length}`);

// TC-D02 AC-03-07：wordKey 不重複（不分大小寫）
{
  const m = new Map(); const dup = [];
  for (const x of V) { const k = wk(x.word); if (m.has(k)) dup.push(k); m.set(k, x.rank); }
  rec("TC-D02", "AC-03-07", dup.length === 0, `重複 ${dup.length} 筆${dup.length ? "：" + dup.slice(0, 10).join("、") : ""}`);
}

// TC-D03 AC-03-08：排名連續、NGSL 順序、後段來源
{
  const ranksOk = V.every((x, i) => Number.isInteger(x.rank) && x.rank === i + 1);
  const keys = V.map((x) => wk(x.word));
  const ngslOrderOk = NGSL.every((w, i) => keys[i] === w);
  const restOk = V.slice(nB).every((x) => !x.sources.includes("NGSL") && ["TSL", "BSL", "NAWL"].includes(x.sources[0]) && x.sources.some((s) => setOf[s] && setOf[s].has(wk(x.word))));
  const orderAll = expected.every((w, i) => keys[i] === w);
  const mism = []; for (let i = 0; i < Math.min(keys.length, expected.length); i++) if (keys[i] !== expected[i]) { mism.push(`#${i + 1} ${keys[i]}≠${expected[i]}`); if (mism.length > 5) break; }
  rec("TC-D03", "AC-03-08", ranksOk && ngslOrderOk && restOk && orderAll,
    `排名連續=${ranksOk}；1～N_B 與 NGSL SFI Rank 順序一致=${ngslOrderOk}；> N_B 皆來自 TSL/BSL/NAWL=${restOk}；全序列符合 R-1～R-4=${orderAll}${mism.length ? "；差異：" + mism.join(" ") : ""}`);
}

// TC-D04 AC-03-09：1～N_B 集合 = NGSL；功能詞
{
  const a = new Set(V.slice(0, nB).map((x) => wk(x.word)));
  const same = a.size === setOf.NGSL.size && [...setOf.NGSL].every((w) => a.has(w));
  const fw = ["the", "of", "a", "and", "to", "in", "he", "it", "can", "will"];
  const miss = fw.filter((w) => !a.has(w));
  const fwCards = fw.map((w) => V.find((x) => wk(x.word) === w)).filter((x) => x && x.meaning && x.example && x.phonetic).length;
  rec("TC-D04", "AC-03-09", same && miss.length === 0 && fwCards === fw.length, `集合相同=${same}（${a.size} vs ${setOf.NGSL.size}）；缺少功能詞=${miss.join("、") || "無"}；功能詞具完整卡片欄位 ${fwCards}/10`);
}

// TC-D05 AC-06-08：排名 > N_B 的學術情境非空
{
  const bad = V.slice(nB).filter((x) => typeof x.academicContext !== "string" || !x.academicContext.trim());
  const badType = V.slice(0, nB).filter((x) => typeof x.academicContext !== "string");
  rec("TC-D05", "AC-06-08", bad.length === 0 && badType.length === 0, `> N_B 空白 ${bad.length} 筆；≤ N_B 型別錯誤 ${badType.length} 筆；≤ N_B 空白 ${V.slice(0, nB).filter((x) => !x.academicContext).length} 筆（允許）`);
}

// TC-D06 AC-06-01、AC-06-02、AC-06-07：卡片欄位完整、無 undefined/null 字樣、無角括號
{
  const POS = new Set(["n.", "v.", "adj.", "adv.", "prep.", "conj.", "pron.", "art.", "num.", "int.", "aux.", "det.", "abbr.", "phr.", "pref."]);
  const bad = [];
  for (const x of V) {
    for (const f of ["word", "phonetic", "meaning", "collocation", "example"]) if (typeof x[f] !== "string" || !x[f].trim()) bad.push(`${x.rank}:${f} 空白`);
    if (!/^\/.+\/$/.test(x.phonetic || "")) bad.push(`${x.rank}:phonetic 格式`);
    if (!Array.isArray(x.pos) || !x.pos.length) bad.push(`${x.rank}:pos 空`);
    for (const [k, v] of Object.entries(x)) {
      if (typeof v !== "string") continue;
      if (/^(undefined|null)$/i.test(v.trim()) && !(k === "word" && wk(x.word) === "null")) bad.push(`${x.rank}:${k}=${v}`);
      if (/[<>]/.test(v)) bad.push(`${x.rank}:${k} 含角括號`);
    }
  }
  const posVals = new Set(V.flatMap((x) => x.pos));
  rec("TC-D06", "AC-06-01、AC-06-02、AC-06-07", bad.length === 0, `欄位問題 ${bad.length} 筆${bad.length ? "：" + bad.slice(0, 8).join("；") : ""}；pos 值：${[...posVals].join(" ")}`);
}

// TC-D07 契約 v0.7 M-8：字首字 pos = pref.
{
  const bad = [];
  for (const x of V) {
    const m = (x.meaning || "").trim();
    const hasPref = x.pos.includes("pref.");
    if (m.startsWith("（字首）") && !(x.pos.length === 1 && x.pos[0] === "pref.")) bad.push(`${x.rank} ${x.word}`);
    if (hasPref && (!m.includes("（字首）") || x.pos[x.pos.length - 1] !== "pref.")) bad.push(`${x.rank} ${x.word}`);
    if (!m.startsWith("（字首）") && m.includes("（字首）")) { const segs = m.split("；"); if (!segs[segs.length - 1].startsWith("（字首）") || x.pos.length < 2 || x.pos[x.pos.length - 1] !== "pref.") bad.push(`${x.rank} ${x.word}`); }
  }
  const prefs = V.filter((x) => x.pos.includes("pref.")).map((x) => x.word);
  rec("TC-D07", "AC-06-02（契約 V-VOC-07 M-8）", bad.length === 0, `字首字 ${prefs.length} 筆（${prefs.join("、")}）；不符 ${bad.length}`);
}

// TC-D08 AC-23-03：來源標記
{
  const codes = new Set(REG.map((r) => r.code));
  const wl = new Set(REG.filter((r) => r.kind === "wordlist").map((r) => r.code));
  const missing = readText(path.join(SRC, "ecdict", "ecdict_subset_missing.txt")).split(/\r?\n/).map((s) => wk(s)).filter(Boolean);
  const ecdictKeys = new Set();
  // ecdict_subset.csv 第一欄 = word（可能有引號欄位，只取每筆紀錄的第一欄）
  {
    const t = readText(path.join(SRC, "ecdict", "ecdict_subset.csv"));
    let i = 0, field = "", inQ = false, col = 0, first = null, row = 0;
    for (; i < t.length; i++) {
      const c = t[i];
      if (inQ) { if (c === '"') { if (t[i + 1] === '"') { field += '"'; i++; } else inQ = false; } else field += c; continue; }
      if (c === '"') inQ = true;
      else if (c === ",") { if (col === 0) first = field; col++; field = ""; }
      else if (c === "\n" || c === "\r") { if (c === "\r" && t[i + 1] === "\n") i++; if (col === 0) first = field; if (row > 0 && first) ecdictKeys.add(wk(first)); row++; col = 0; field = ""; first = null; }
      else field += c;
    }
  }
  const bad = [];
  for (const x of V) {
    if (!Array.isArray(x.sources) || !x.sources.length || !x.sources.every((s) => wl.has(s))) bad.push(`${x.rank}:sources`);
    if (!["ECDICT", "ORIGINAL"].includes(x.meaningSource)) bad.push(`${x.rank}:meaningSource`);
    if (x.phoneticSource !== "ORIGINAL") bad.push(`${x.rank}:phoneticSource=${x.phoneticSource}`);
    if (x.contentSource !== "ORIGINAL") bad.push(`${x.rank}:contentSource`);
    if (x.meaningSource === "ECDICT" && !ecdictKeys.has(wk(x.word))) bad.push(`${x.rank}:ECDICT 查無 ${x.word}`);
  }
  const missOk = missing.every((w) => { const it = V.find((x) => wk(x.word) === w); return it && it.meaningSource === "ORIGINAL"; });
  const ec = V.filter((x) => x.meaningSource === "ECDICT").length;
  rec("TC-D08", "AC-23-03", bad.length === 0 && missOk && missing.length === 4,
    `問題 ${bad.length}${bad.length ? "：" + bad.slice(0, 6).join("；") : ""}；missing 4 筆（${missing.join("、")}）皆原創=${missOk}；ECDICT 釋義 ${ec} 筆、原創 ${nG - ec} 筆；音標標 ECDICT 0 筆=${V.every((x) => x.phoneticSource === "ORIGINAL")}；ECDICT 子集鍵 ${ecdictKeys.size}`);
}

// TC-D09 AC-23-05：授權確認紀錄、未確認字表為唯一來源 = 0
{
  const bad = [];
  for (const r of REG) {
    const c = r.confirmation || {};
    if (c.status !== "confirmed" || !c.confirmedAt || !c.confirmedBy || !c.evidenceUrl) bad.push(r.code + ":confirmation");
    if (!r.licenseName || (r.code !== "ORIGINAL" && (!r.licenseUrl || !r.originUrl))) bad.push(r.code + ":license/url");
  }
  const confirmed = new Set(REG.filter((r) => r.confirmation && r.confirmation.status === "confirmed").map((r) => r.code));
  const unconf = V.filter((x) => !x.sources.some((s) => confirmed.has(s))).length;
  rec("TC-D09", "AC-23-05", bad.length === 0 && unconf === 0, `登錄 ${REG.map((r) => r.code).join("、")}；缺漏 ${bad.join("；") || "無"}；以未確認字表為唯一來源 ${unconf} 筆`);
}

// TC-D10 AC-23-02（資料面）：字表種類數、includedItemCount、ECDICT 授權全文
{
  const used = new Set(V.flatMap((x) => x.sources));
  const wl = REG.filter((r) => r.kind === "wordlist");
  const cntOk = wl.every((r) => r.includedItemCount === V.filter((x) => x.sources.includes(r.code)).length);
  const ec = REG.find((r) => r.code === "ECDICT");
  const ecCnt = V.filter((x) => x.meaningSource === "ECDICT").length;
  const lic = readText(path.join(SRC, "ecdict", "LICENSE")).replace(/\r\n/g, "\n").trim();
  const licOk = ec && ec.licenseText && ec.licenseText.replace(/\r\n/g, "\n").trim() === lic && ec.copyrightNotice;
  rec("TC-D10", "AC-23-02", used.size === wl.length && cntOk && ec && ec.includedItemCount === ecCnt && !!licOk && JSON.stringify(ec.modifications) === JSON.stringify(["簡體轉繁體台灣用語", "精簡釋義"]),
    `資料中字表種類 ${used.size}（${[...used].join("、")}）、登錄字表 ${wl.length}；includedItemCount 相符=${cntOk}；ECDICT 筆數登錄 ${ec && ec.includedItemCount} / 實際 ${ecCnt}；MIT 全文與 sources/ecdict/LICENSE 一致=${!!licOk}`);
}

// TC-D11 AC-05-01～AC-05-03（資料面）：範本
{
  const T = win.DOMAIN_TEMPLATES;
  const keys = new Set(V.map((x) => wk(x.word)));
  const labels = T.map((t) => t.label).join("、");
  const all = T.flatMap((t) => t.words.map((w) => wk(w.word)));
  const has = (id, w) => T.find((t) => t.id === id).words.some((x) => wk(x.word) === w);
  const ok = T.length === 3 && labels === "資工、商管、生醫統計" && T.every((t) => t.words.length === 10) && has("cs", "latency") && has("cs", "scalability") && has("business", "monetization") && has("biostat", "heterogeneous") && all.every((w) => !keys.has(w)) && new Set(all).size === 30;
  rec("TC-D11", "AC-05-01、AC-05-02、AC-05-03", ok, `範本 ${labels}；每範本字數 ${T.map((t) => t.words.length).join("/")}；與內建重複 ${all.filter((w) => keys.has(w)).length}；30 字互不重複=${new Set(all).size === 30}`);
}

// TC-D12 AC-10-01、AC-10-02、AC-11-02（資料面）：Part 5
{
  const Q = win.PART5_QUESTION_BANK;
  const by = {}; for (const q of Q) by[q.type] = (by[q.type] || 0) + 1;
  const bad = [];
  for (const q of Q) {
    if ((q.sentence.match(/_____/g) || []).length !== 1 || /_{6,}/.test(q.sentence)) bad.push(q.id + ":blank");
    if (!Array.isArray(q.options) || q.options.length !== 4 || new Set(q.options.map((o) => o.trim().toLowerCase())).size !== 4) bad.push(q.id + ":options");
    if (!(q.correctIndex >= 0 && q.correctIndex <= 3)) bad.push(q.id + ":correctIndex");
    if (!q.explanation || !q.explanation.coreStrategy || !q.explanation.coreStrategy.trim() || !q.explanation.structure || !q.explanation.structure.trim()) bad.push(q.id + ":explanation");
    if (q.source !== "ORIGINAL") bad.push(q.id + ":source");
  }
  const types = ["preposition_collocation", "part_of_speech", "context_vocabulary", "connector"];
  const pos = [0, 0, 0, 0]; Q.forEach((q) => pos[q.correctIndex]++);
  rec("TC-D12", "AC-10-01、AC-10-02、AC-11-02", Q.length >= 200 && types.every((t) => by[t] >= 50) && bad.length === 0,
    `共 ${Q.length} 題；${types.map((t) => t + " " + by[t]).join("、")}；結構問題 ${bad.length}${bad.length ? "：" + bad.slice(0, 5).join("、") : ""}；正解位置 A～D ${pos.join("/")}`);
}

// TC-D13 AC-12-02、AC-12-03（資料面）：長難句
{
  const D = win.DECODER_SENTENCES;
  const bad = D.filter((d) => !d.segments.some((s) => s.role === "subject") || !d.segments.some((s) => s.role === "verb") || d.source !== "ORIGINAL");
  rec("TC-D13", "AC-12-02、AC-12-03", D.length >= 50 && bad.length === 0, `共 ${D.length} 句；缺主詞或動詞或非原創 ${bad.length} 句`);
}

// TC-D14 AC-14-01（資料面）
{
  const R = win.READING_STRATEGIES;
  const ok = R.length === 3 && R.map((r) => r.title).join("|") === "Abstract 摘要|方法論|文獻回顧（Research Gap）" && R.every((r) => r.tips.length && r.tips.every((t) => t.trim()));
  rec("TC-D14", "AC-14-01", ok, `主題：${R.map((r) => `${r.title}(${r.tips.length})`).join("、")}`);
}

// TC-D15 AC-15-02（資料面）
{
  const P = win.ACADEMIC_PHRASEBANK;
  const by = {}; for (const p of P) by[p.category] = (by[p.category] || 0) + 1;
  const ok = P.length >= 100 && ["gap", "aim", "findings", "limitations"].every((c) => by[c] >= 25) && P.every((p) => p.source === "ORIGINAL" && p.template.trim() && p.descriptionZh.trim());
  rec("TC-D15", "AC-15-02", ok, `共 ${P.length} 則；${Object.entries(by).map(([k, v]) => k + " " + v).join("、")}`);
}

// TC-D16 AC-23-04（來源標記部分）：所有原創內容的 source 皆為 ORIGINAL
{
  const all = [
    ...V.map((x) => x.contentSource), ...win.PART5_QUESTION_BANK.map((q) => q.source),
    ...win.DECODER_SENTENCES.map((d) => d.source), ...win.ACADEMIC_PHRASEBANK.map((p) => p.source),
  ];
  const bad = all.filter((s) => s !== "ORIGINAL").length;
  rec("TC-D16", "AC-23-04（標記）", bad === 0, `來源標記非原創 ${bad} 筆（共 ${all.length}）；精確片語搜尋比對列入人工驗收 TC-M09`);
}

// TC-D17 AC-09-02（資料面）：單字集內釋義相異量足以出題
{
  const nonEmpty = V.filter((x) => x.meaning.trim()).length;
  const distinct = new Set(V.map((x) => x.meaning.trim())).size;
  const dupGroups = {}; for (const x of V) { const k = x.meaning.trim(); dupGroups[k] = (dupGroups[k] || 0) + 1; }
  const maxDup = Math.max(...Object.values(dupGroups));
  rec("TC-D17", "AC-09-02", nonEmpty === nG && distinct > 4, `釋義非空 ${nonEmpty}/${nG}；相異釋義 ${distinct}；同一釋義最多重複 ${maxDup} 次`);
}

const sum = { pass: results.filter((r) => r.result === "通過").length, fail: results.filter((r) => r.result === "失敗").length };
console.log(`資料驗收：通過 ${sum.pass}、失敗 ${sum.fail}`);
if (out) { fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, JSON.stringify(results, null, 2)); }
