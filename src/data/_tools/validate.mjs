// validate.mjs — 內容資料驗證器（CT-01）
// 依據：契約 README §7.0～§7.6（V-IN、V-SRC、V-VOC、V-TPL、V-P5、V-DEC、V-RS、V-PH；V-VOC-15、17 依 v0.6 M-3；V-VOC-07 依 v0.7 M-8）、
//       architecture.md v0.3 §8.4（S-2、H-1～H-5、H-7；H-1 繁簡同形白名單 → H-1W）。
// 只使用 Node 內建模組。有錯誤時 exit code 1；資料檔不存在列為「缺檔」錯誤，不拋出未處理例外。
// CT-25（契約 v0.15 README §7.4 V-P5-08、§9.8 DS-37；architecture.md v0.10 §7.21.6）：新增題目 id 穩定性檢查
//       （V-P5-08／V-P5-08W／V-P5-08N）與 --update-snapshot、--accept <id>，快照檔 src/data/_records/part5-ids.json。

import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import {
  DEFAULT_DATA_DIR, DEFAULT_SOURCES_DIR, VOCAB_FILES, VOCAB_KEYS, DATA_FILES, PART_OF_SPEECH, CONFIRMED_WORDLISTS,
  WORDLIST_ORDER, RECORDED, EXPECTED_REGISTRY, WORDLIST_MODIFICATION_KEYWORDS, SOURCE_ENTRY_KEYS, EXPECTED_PROJECT_LICENSE,
  IPA_ALLOWED_CHARS, IPA_BRITISH_BLACKLIST, IPA_BARE_VOWEL_RE, ECDICT_LEGACY_PHONETIC_CHARS,
  vocabFileInfo, loadWordlists, computeRanking, loadEcdict, loadMissing, loadTwTerms, loadEcdictLicense,
  simplifiedOnlyChars, splitH1Chars, H1_HOMOGRAPH_WHITELIST, MEANING_FORBIDDEN_TERMS, PREFIX_MEANING_MARK, PREFIX_POS, PREFIX_ONLY_POS,
  loadLemmaForms, loadDataFile, wordKey, charLength, contextHits, parseArgs, readText,
} from "./lib.mjs";

const HELP = `用法：
  node src/data/_tools/validate.mjs --all  [--stage skeleton|partial|final] [--data <目錄>] [--sources <目錄>] [--max <n>]
  node src/data/_tools/validate.mjs --file <資料檔> [--stage skeleton|partial|final] [--sources <目錄>] [--max <n>]

選項：
  --all              檢查 --data 目錄（預設 src/data/）下全部交付資料檔：sources.js、15 個 vocab 分檔、templates.js、
                     part5.js、decoder.js、phrasebank.js；缺檔列為錯誤。
  --file <path>      只檢查單一資料檔（依檔名判斷種類）；字庫分檔只檢查該檔排名區間（V-VOC-02、03 限區間內）。
  --stage <s>        skeleton：字庫內容欄位可為 "" 與 pos 可為 []（骨架階段）
                     partial ：略過總數規則 V-P5-01（題型筆數）、V-DEC-01（筆數）、V-PH-01（筆數）與 V-P5-05 的位置分布
                     final   ：全部檢查（預設）
  --sources <dir>    唯讀輸入目錄（預設 sources/），用於排名重算（S-2、V-VOC-04/05）、ECDICT 比對、H-1 字集等。
  --max <n>          每條規則最多列出幾筆明細（預設 20）。
  --update-snapshot  （CT-25）把 part5.js 中快照沒有的題目 id 新增到 src/data/_records/part5-ids.json；
                     不刪除、不覆寫既有項目。需同時載入 part5.js（--all 或 --file part5.js）。
  --accept <id>      （CT-25）人工確認某題的 sentence／正解修改只是錯字修正（題意與正解不變）後，
                     以目前內容覆寫該 id 的指紋；多個 id 以逗號分隔。只寫 _records/part5-ids.json。
  --help             顯示本說明。

V-P5-08（題目 id 穩定，只在 --stage final 且快照檔存在時執行；快照一律讀專案的 src/data/_records/part5-ids.json，
  不隨 --data 改變，因此可用 --data 指向修改過的副本與已交付快照比對）：
  指紋 = SHA-256 前 16 個 hex，對象字串先 NFC → trim → 連續空白壓成 1 個 → 小寫；每題 s = sentence、a = options[correctIndex]。
  快照 id 仍在題庫且 s、a 皆不同 → 錯誤 V-P5-08（id 改指另一題）；只有一個不同 → 警告 V-P5-08W（請確認為錯字修正，
  確認後用 --accept <id>）；快照 id 不在題庫 → 資訊 V-P5-08（刪題，id 不得重用）；題庫 id 不在快照 → 警告 V-P5-08N
  （新題，交付後用 --update-snapshot 更新快照）。

輸出：每條規則的「通過／錯誤／警告／資訊」數與前 n 筆明細；有任何錯誤時 exit code 1。
涵蓋規則：V-IN-01～07、V-SRC-01～05、V-VOC-01～11、13～17（14 只報告；17 列清單 + 疑似過度轉換警告）、
          S-2、H-1（白名單字元降為 H-1W 警告）～H-5、H-7、V-TPL-01～04、V-P5-01～07（05 只檢查索引範圍與位置分布）、V-P5-08（含 08W、08N）、V-DEC-01～04、V-RS-01、V-PH-01～03。
不在此檢查：V-VOC-12（前端）、V-VOC-18（人工抽查，用 sample.mjs）、V-ST／V-IMP（前端）。`;

// ─────────────────────────────────────────────────────────────
// 報告器
// ─────────────────────────────────────────────────────────────

const RULE_ORDER = [
  "FILE", "LOAD",
  "V-IN-01", "V-IN-02", "V-IN-03", "V-IN-04", "V-IN-05", "V-IN-06", "V-IN-07",
  "V-SRC-01", "V-SRC-02", "V-SRC-03", "V-SRC-04", "V-SRC-05",
  ...Array.from({ length: 17 }, (_, i) => `V-VOC-${String(i + 1).padStart(2, "0")}`),
  "S-2", "H-1", "H-1W", "H-2", "H-3", "H-4", "H-5", "H-7",
  "V-TPL-01", "V-TPL-02", "V-TPL-03", "V-TPL-04",
  "V-P5-01", "V-P5-02", "V-P5-03", "V-P5-04", "V-P5-05", "V-P5-06", "V-P5-07", "V-P5-08", "V-P5-08W", "V-P5-08N",
  "V-DEC-01", "V-DEC-02", "V-DEC-03", "V-DEC-04", "V-RS-01",
  "V-PH-01", "V-PH-02", "V-PH-03", "INTERNAL",
];
const RULE_TITLE = {
  FILE: "資料檔存在", LOAD: "資料檔可執行且為 JSON 相容字面值（C-4）",
  "V-IN-01": "讀檔編碼", "V-IN-02": "換行與欄位 trim", "V-IN-03": "略過空行與 ## 註解", "V-IN-04": "表頭欄名定位",
  "V-IN-05": "排名欄整數", "V-IN-06": "字表報告", "V-IN-07": "N_B、N_G、區段與 §4.2 一致",
  "V-SRC-01": "來源代碼集合", "V-SRC-02": "來源登錄內容與確認紀錄", "V-SRC-03": "引用筆數", "V-SRC-04": "PROJECT_LICENSE", "V-SRC-05": "MIT 聲明原文",
  "V-VOC-01": "12 個鍵與型別", "V-VOC-02": "rank 連續不重複", "V-VOC-03": "wordKey 不重複", "V-VOC-04": "1～N_B = NGSL 序列",
  "V-VOC-05": "N_B 之後的區段順序", "V-VOC-06": "sources 合法與排序", "V-VOC-07": "必填欄位與音標斜線、pos、字首字（M-8）", "V-VOC-08": "academicContext",
  "V-VOC-09": "來源標記", "V-VOC-10": "禁用值（等於 undefined／null）與角括號", "V-VOC-11": "VOCAB_MANIFEST", "V-VOC-13": "分檔區間與檔名",
  "V-VOC-14": "meaning 重複（只報告）", "V-VOC-15": "對照表殘留、領域標記與「例項」", "V-VOC-16": "ECDICT 舊式音標字元", "V-VOC-17": "上下文用詞清單",
  "S-2": "骨架欄位未改動", "H-1": "簡體專用字", "H-1W": "繁簡同形字（白名單，警告）", "H-2": "音標字元集與英式符號", "H-3": "長度上限", "H-4": "大寫開頭、句尾標點、含詞形",
  "H-5": "分檔內 example／meaning 重複", "H-7": "平均每筆 bytes",
  "V-TPL-01": "3 範本 × 10 字", "V-TPL-02": "必含代表字", "V-TPL-03": "不在內建字庫", "V-TPL-04": "30 字不重複",
  "V-P5-01": "題型與筆數", "V-P5-02": "id", "V-P5-03": "空格", "V-P5-04": "選項", "V-P5-05": "正解索引與位置分布", "V-P5-06": "解析", "V-P5-07": "source",
  "V-P5-08": "id 穩定（快照比對：改指另一題為錯誤、刪題為資訊）", "V-P5-08W": "id 對應題目只改 sentence 或正解之一（請確認為錯字修正）",
  "V-P5-08N": "新題 id 不在快照（交付後請更新快照）",
  "V-DEC-01": "筆數與 id", "V-DEC-02": "segments 串接", "V-DEC-03": "subject／verb／modifier", "V-DEC-04": "role、翻譯、section、source", "V-RS-01": "閱讀策略",
  "V-PH-01": "類別與筆數", "V-PH-02": "id、template、說明", "V-PH-03": "source、exampleEn", INTERNAL: "驗證器內部例外",
};

class Report {
  constructor(max) { this.max = max; this.rules = new Map(); this.skipped = new Set(); }
  r(id) {
    if (!this.rules.has(id)) this.rules.set(id, { pass: 0, error: 0, warn: 0, info: 0, details: [] });
    return this.rules.get(id);
  }
  ok(id, n = 1) { this.r(id).pass += n; }
  add(id, level, msg) { const x = this.r(id); x[level]++; x.details.push(`${{ error: "錯誤", warn: "警告", info: "資訊" }[level]}：${msg}`); }
  err(id, msg) { this.add(id, "error", msg); }
  warn(id, msg) { this.add(id, "warn", msg); }
  info(id, msg) { this.add(id, "info", msg); }
  check(id, cond, msg, level = "error") { if (cond) this.ok(id); else this.add(id, level, typeof msg === "function" ? msg() : msg); return cond; }
  skip(id, why) { this.skipped.add(`${id}（${why}）`); }
  get errorCount() { let n = 0; for (const v of this.rules.values()) n += v.error; return n; }
  get warnCount() { let n = 0; for (const v of this.rules.values()) n += v.warn; return n; }
  print(header) {
    const lines = [header, ""];
    const ids = [...this.rules.keys()].sort((a, b) => idx(a) - idx(b));
    for (const id of ids) {
      const v = this.rules.get(id);
      const tag = v.error ? "✗" : v.warn ? "!" : "✓";
      lines.push(`${tag} ${id} ${RULE_TITLE[id] ?? ""}：通過 ${v.pass}／錯誤 ${v.error}／警告 ${v.warn}${v.info ? `／資訊 ${v.info}` : ""}`);
      for (const d of v.details.slice(0, this.max)) lines.push(`    ${d}`);
      if (v.details.length > this.max) lines.push(`    …另有 ${v.details.length - this.max} 筆`);
    }
    if (this.skipped.size) { lines.push("", "略過的規則："); for (const s of this.skipped) lines.push(`  - ${s}`); }
    lines.push("", `總計：錯誤 ${this.errorCount}、警告 ${this.warnCount}；結果：${this.errorCount ? "不通過" : "通過"}`);
    console.log(lines.join("\n"));
  }
}
function idx(id) { const i = RULE_ORDER.indexOf(id); return i < 0 ? 999 : i; }

// ─────────────────────────────────────────────────────────────
// 共用小工具
// ─────────────────────────────────────────────────────────────

const isStr = (v) => typeof v === "string";
const nonEmpty = (v) => isStr(v) && v.trim().length >= 1;
const isInt = (v) => Number.isInteger(v);
const isPlainObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const sameArr = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => x === b[i]);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const show = (v) => JSON.stringify(v);

/** C-4：值必須是 JSON 相容（字串、有限數字、布林、null、陣列、純物件）。回傳第一個問題路徑或 null。 */
function jsonIssue(v, path = "") {
  if (v === null || typeof v === "string" || typeof v === "boolean") return null;
  if (typeof v === "number") return Number.isFinite(v) ? null : `${path} 為非有限數字`;
  if (Array.isArray(v)) { for (let i = 0; i < v.length; i++) { const p = jsonIssue(v[i], `${path}[${i}]`); if (p) return p; } return null; }
  if (typeof v === "object") {
    const proto = Object.getPrototypeOf(v);
    if (proto !== null && proto.constructor && proto.constructor.name !== "Object") return `${path} 不是純物件`;
    for (const k of Object.keys(v)) { const p = jsonIssue(v[k], `${path}.${k}`); if (p) return p; }
    return null;
  }
  return `${path} 型別為 ${typeof v}（不可為函式或 undefined）`;
}

/** 走訪所有字串值（含陣列內）。 */
function eachString(v, fn, path = "") {
  if (typeof v === "string") fn(v, path);
  else if (Array.isArray(v)) v.forEach((x, i) => eachString(x, fn, `${path}[${i}]`));
  else if (isPlainObj(v)) for (const k of Object.keys(v)) eachString(v[k], fn, path ? `${path}.${k}` : k);
}

function containsForm(text, forms) {
  return forms.some((f) => new RegExp(`(^|[^\\p{L}\\p{N}])${esc(f)}($|[^\\p{L}\\p{N}])`, "iu").test(text));
}

// ─────────────────────────────────────────────────────────────
// 主程式
// ─────────────────────────────────────────────────────────────

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || (!args.all && !args.file)) { console.log(HELP); return args.help ? 0 : 1; }
  const stage = args.stage === undefined ? "final" : args.stage;
  if (!["skeleton", "partial", "final"].includes(stage)) { console.error(`--stage 只能是 skeleton、partial、final（收到：${stage}）`); return 1; }
  const max = args.max ? parseInt(args.max, 10) : 20;
  const sourcesDir = resolve(args.sources && args.sources !== true ? args.sources : DEFAULT_SOURCES_DIR);
  const rep = new Report(max);
  const mode = args.all ? "all" : "file";

  // ── 參考資料（sources/）──
  const ref = loadReference(sourcesDir, rep);

  // ── 決定要讀的資料檔 ──
  let targets = []; // { path, kind: "vocab"|檔名, info }
  if (mode === "all") {
    const dataDir = resolve(args.data && args.data !== true ? args.data : DEFAULT_DATA_DIR);
    const expected = ["sources.js", ...VOCAB_FILES.map((f) => f.file), "templates.js", "part5.js", "decoder.js", "phrasebank.js"];
    for (const f of expected) {
      const p = join(dataDir, f);
      if (rep.check("FILE", existsSync(p), `缺檔：${p}`)) targets.push({ path: p, kind: f.startsWith("vocab-") ? "vocab" : f });
    }
    if (existsSync(dataDir)) {
      for (const f of readdirSync(dataDir)) {
        if (/^vocab-\d{4}\.js$/.test(f) && !vocabFileInfo(f)) { rep.warn("V-VOC-13", `多出的分檔 ${f} 不在 architecture.md §8.1 分檔表，仍納入檢查`); targets.push({ path: join(dataDir, f), kind: "vocab" }); }
      }
    }
  } else {
    const p = resolve(String(args.file));
    const b = basename(p);
    const kind = /^vocab-\d{4}\.js$/.test(b) ? "vocab" : DATA_FILES[b] ? b : null;
    if (!kind) { rep.err("FILE", `無法依檔名判斷資料檔種類：${b}（應為 vocab-XXXX.js 或 ${Object.keys(DATA_FILES).join("、")}）`); }
    else if (rep.check("FILE", existsSync(p), `缺檔：${p}`)) targets.push({ path: p, kind });
  }

  // ── 載入 ──
  const loaded = {}; // kind → window（vocab 另存陣列）
  const vocabFiles = []; // { path, name, items, text }
  for (const t of targets) {
    let win;
    try { win = loadDataFile(t.path); }
    catch (e) { rep.err("LOAD", `${basename(t.path)} 執行失敗：${e.message}`); continue; }
    const globals = t.kind === "vocab" ? ["MASTER_VOCAB_DATABASE"] : DATA_FILES[t.kind];
    let good = true;
    for (const g of globals) {
      if (win[g] === undefined) { rep.err("LOAD", `${basename(t.path)} 未定義 window.${g}`); good = false; continue; }
      const issue = jsonIssue(win[g], g);
      if (issue) { rep.err("LOAD", `${basename(t.path)}：${issue}`); good = false; }
    }
    const extra = Object.keys(win).filter((k) => !globals.includes(k));
    if (extra.length) rep.warn("LOAD", `${basename(t.path)} 另外定義了 window.${extra.join("、window.")}`);
    if (good) rep.ok("LOAD");
    if (t.kind === "vocab") {
      const arr = win.MASTER_VOCAB_DATABASE;
      if (!Array.isArray(arr)) { if (arr !== undefined) rep.err("LOAD", `${basename(t.path)} 的 MASTER_VOCAB_DATABASE 不是陣列`); continue; }
      vocabFiles.push({ path: t.path, name: basename(t.path), items: arr, text: readText(t.path) });
    } else loaded[t.kind] = win;
  }

  // --file sources.js 時，從同目錄讀字庫分檔供 V-SRC-01／03、V-VOC-11 比對（不列入字庫規則檢查）
  let vocabForSources = null;
  if (mode === "all") vocabForSources = vocabFiles.flatMap((f) => f.items);
  else if (loaded["sources.js"]) {
    const dir = dirname(resolve(String(args.file)));
    const items = [];
    for (const f of existsSync(dir) ? readdirSync(dir) : []) {
      if (!/^vocab-\d{4}\.js$/.test(f)) continue;
      try { const w = loadDataFile(join(dir, f)); if (Array.isArray(w.MASTER_VOCAB_DATABASE)) items.push(...w.MASTER_VOCAB_DATABASE); } catch { /* 由各分檔自己的驗證報告 */ }
    }
    vocabForSources = items.length ? items : null;
  }

  // ── 各類檢查（各段獨立攔截例外）──
  const guard = (name, fn) => { try { fn(); } catch (e) { rep.err("INTERNAL", `${name}：${e && e.stack ? e.stack.split("\n").slice(0, 3).join(" | ") : e}`); } };
  if (vocabFiles.length) guard("字庫", () => checkVocab(vocabFiles, ref, rep, stage, mode));
  if (loaded["sources.js"]) guard("sources.js", () => checkSources(loaded["sources.js"], vocabForSources, ref, rep, mode));
  if (loaded["templates.js"]) guard("templates.js", () => checkTemplates(loaded["templates.js"].DOMAIN_TEMPLATES, ref, vocabFiles, rep));
  if (loaded["part5.js"]) guard("part5.js", () => checkPart5(loaded["part5.js"].PART5_QUESTION_BANK, rep, stage));
  // CT-25：V-P5-08 與快照更新選項
  const wantUpdate = args["update-snapshot"] === true;
  const acceptIds = args.accept === undefined ? null : args.accept === true ? [] : String(args.accept).split(",").map((x) => x.trim()).filter(Boolean);
  if (args["update-snapshot"] !== undefined && !wantUpdate) rep.err("V-P5-08", `--update-snapshot 不接受參數（收到：${args["update-snapshot"]}）`);
  if (acceptIds && !acceptIds.length) rep.err("V-P5-08", "--accept 需要題目 id（例：--accept p5-012，多個以逗號分隔）");
  if ((wantUpdate || (acceptIds && acceptIds.length)) && !loaded["part5.js"]) rep.err("V-P5-08", "--update-snapshot／--accept 需要載入 part5.js（使用 --all 或 --file part5.js）；未寫入快照");
  if (loaded["part5.js"]) guard("V-P5-08", () => checkPart5Ids(loaded["part5.js"].PART5_QUESTION_BANK, rep, stage, { wantUpdate, acceptIds: acceptIds || [] }));
  if (loaded["decoder.js"]) guard("decoder.js", () => checkDecoder(loaded["decoder.js"], rep, stage));
  if (loaded["phrasebank.js"]) guard("phrasebank.js", () => checkPhrasebank(loaded["phrasebank.js"].ACADEMIC_PHRASEBANK, rep, stage));

  const head = [`validate.mjs　模式：${mode === "all" ? "--all" : `--file ${args.file}`}　階段：${stage}　sources：${sourcesDir}`];
  if (ref.h1) {
    const hit = [...ref.h1Hits];
    head.push(`H-1 簡體專用字集：導出 ${ref.h1.derived.size} 字；扣除繁簡同形白名單後 ${ref.h1.errorChars.size} 字（H-1 錯誤）；`
      + `降為警告 H-1W 的白名單字元 ${ref.h1.warnChars.size} 字「${[...ref.h1.warnChars].join("")}」（白名單共 ${H1_HOMOGRAPH_WHITELIST.length} 字，其餘不在導出字集、無作用）；`
      + `本次命中 H-1W：${hit.length ? `「${hit.join("")}」` : "無"}`);
  }
  rep.print(head.join("\n"));
  return rep.errorCount ? 1 : 0;
}

// ─────────────────────────────────────────────────────────────
// 參考資料與 V-IN
// ─────────────────────────────────────────────────────────────

function loadReference(sourcesDir, rep) {
  const ref = { ranking: null, lists: null, ecdict: null, missing: null, twTerms: null, simpOnly: null, h1: null, h1Hits: null, forms: null, license: null };
  try {
    ref.lists = loadWordlists(sourcesDir);
    for (const c of CONFIRMED_WORDLISTS) {
      const r = ref.lists[c].report;
      rep.info("V-IN-01", `${c}（${r.file}）以 ${r.encoding} 解碼`); rep.ok("V-IN-01");
      rep.ok("V-IN-02"); rep.ok("V-IN-03");
      if (r.anomalies.length) for (const a of r.anomalies) rep.err(/排名欄/.test(a) && /不是整數/.test(a) ? "V-IN-05" : "V-IN-04", `${c}：${a}`);
      else { rep.ok("V-IN-04"); rep.ok("V-IN-05"); }
      rep.info("V-IN-06", `${c}：資料列 ${r.dataRows}、有效 ${r.validRows}、不重複 wordKey ${r.uniqueWordKeys}、表內重複 ${r.duplicates.length}${r.duplicates.length ? `（${r.duplicates.map((d) => `${d.wordKey}@${d.lines.join("/")}`).join("、")}）` : ""}、非 ASCII 詞頭 ${r.nonAscii.length}${r.nonAscii.length ? `（${r.nonAscii.map((x) => x.word).join("、")}）` : ""}`);
      rep.ok("V-IN-06");
    }
    ref.ranking = computeRanking(ref.lists);
    const R = ref.ranking;
    rep.check("V-IN-07", R.nB === RECORDED.nB, `N_B 重算 ${R.nB} ≠ 契約 §4.2 紀錄值 ${RECORDED.nB}（依 N-1 回報）`);
    rep.check("V-IN-07", R.nG === RECORDED.nG, `N_G 重算 ${R.nG} ≠ 契約 §4.2 紀錄值 ${RECORDED.nG}（依 N-1 回報）`);
    rep.check("V-IN-07", show(R.segments) === show(RECORDED.segments), () => `區段重算 ${show(R.segments)} ≠ 契約 ${show(RECORDED.segments)}`);
    rep.info("V-IN-07", `重算結果 N_B=${R.nB}、N_G=${R.nG}、區段 ${R.segments.map((s) => `${s.list} ${s.rankFrom}～${s.rankTo}`).join("、")}`);
  } catch (e) { rep.err("V-IN-01", `無法讀取字表（${sourcesDir}/wordlists）：${e.message}；依賴排名的規則（S-2、V-VOC-04、05、11、V-TPL-03）將略過`); }
  try {
    ref.ecdict = loadEcdict(sourcesDir);
    ref.missing = loadMissing(sourcesDir);
    ref.twTerms = loadTwTerms(sourcesDir);
    ref.simpOnly = simplifiedOnlyChars(ref.ecdict);
    ref.h1 = splitH1Chars(ref.simpOnly);
    ref.h1Hits = new Set();
    ref.license = loadEcdictLicense(sourcesDir);
  } catch (e) { rep.err("V-IN-01", `無法讀取 ECDICT 素材（${sourcesDir}/ecdict）：${e.message}；V-VOC-09、15、17、H-1、V-SRC-05 將略過`); }
  try { ref.forms = loadLemmaForms(sourcesDir); } catch { ref.forms = new Map(); }
  return ref;
}

// ─────────────────────────────────────────────────────────────
// 字庫（V-VOC、S-2、H-*）
// ─────────────────────────────────────────────────────────────

function checkVocab(files, ref, rep, stage, mode) {
  const R = ref.ranking;
  const nB = R ? R.nB : RECORDED.nB;
  const skeleton = stage === "skeleton";
  const all = [];
  for (const f of files) for (const it of f.items) all.push({ it, file: f.name });

  // ── 逐筆 ──
  for (const { it, file } of all) {
    const tag = `${file} rank ${isPlainObj(it) ? it.rank : "?"}${isPlainObj(it) && isStr(it.word) ? ` ${it.word}` : ""}`;
    // V-VOC-01
    if (!isPlainObj(it)) { rep.err("V-VOC-01", `${file}：元素不是物件 ${show(it)}`); continue; }
    const keys = Object.keys(it);
    const missingKeys = VOCAB_KEYS.filter((k) => !keys.includes(k));
    const extraKeys = keys.filter((k) => !VOCAB_KEYS.includes(k));
    const typeErr = [];
    if (!isInt(it.rank)) typeErr.push("rank 非整數");
    for (const k of ["word", "phonetic", "meaning", "collocation", "academicContext", "example", "phoneticSource", "meaningSource", "contentSource"]) if (k in it && !isStr(it[k])) typeErr.push(`${k} 非字串`);
    for (const k of ["pos", "sources"]) if (k in it && !(Array.isArray(it[k]) && it[k].every(isStr))) typeErr.push(`${k} 非字串陣列`);
    rep.check("V-VOC-01", !missingKeys.length && !extraKeys.length && !typeErr.length,
      () => `${tag}：${[missingKeys.length ? `缺鍵 ${missingKeys.join(",")}` : "", extraKeys.length ? `多餘鍵 ${extraKeys.join(",")}` : "", ...typeErr].filter(Boolean).join("；")}`);
    const S = (k) => (isStr(it[k]) ? it[k] : "");
    const word = S("word");
    const wk = wordKey(word);

    // V-VOC-07
    const contentEmptyOk = (k) => skeleton && S(k) === "";
    for (const k of ["word", "phonetic", "meaning", "collocation", "example"]) {
      if (k === "word" || !contentEmptyOk(k)) rep.check("V-VOC-07", nonEmpty(it[k]), `${tag}：${k} 為空`);
    }
    if (nonEmpty(it.phonetic)) rep.check("V-VOC-07", it.phonetic.startsWith("/") && it.phonetic.endsWith("/") && it.phonetic.length >= 3, `${tag}：phonetic ${show(it.phonetic)} 未以 / 開頭與結尾`);
    if (Array.isArray(it.pos)) {
      if (!(skeleton && it.pos.length === 0)) {
        rep.check("V-VOC-07", it.pos.length >= 1, `${tag}：pos 至少 1 個`);
        rep.check("V-VOC-07", new Set(it.pos).size === it.pos.length, `${tag}：pos 重複 ${show(it.pos)}`);
        const bad = it.pos.filter((p) => !PART_OF_SPEECH.includes(p));
        rep.check("V-VOC-07", !bad.length, `${tag}：pos 不屬於 PartOfSpeech：${show(bad)}`);
      }
    }
    // V-VOC-07（契約 v0.7 M-8）字首字：
    //   (a) meaning（trim 後）以「（字首）」開頭 → pos 必須恰為 ["pref."]
    //   (b) 含「（字首）」但不在開頭 → 必須是最後一段（最後一個「；」之後以「（字首）」開頭，前面各段不得含），pos 長度 ≥ 2 且最後一個為 "pref."
    //   (c) pos 含 "pref." → meaning 必須含「（字首）」，且 "pref." 只能在 pos 最後一個位置
    const posArr = Array.isArray(it.pos) ? it.pos : [];
    const mTrim = isStr(it.meaning) ? it.meaning.trim() : "";
    if (mTrim.includes(PREFIX_MEANING_MARK)) {
      if (mTrim.startsWith(PREFIX_MEANING_MARK)) {
        rep.check("V-VOC-07", sameArr(posArr, PREFIX_ONLY_POS), () => `${tag}：meaning 以「${PREFIX_MEANING_MARK}」開頭（只有字首義，M-8 (2)），pos 必須恰為 ${show(PREFIX_ONLY_POS)}（實際 ${show(it.pos)}）：${show(it.meaning)}`);
      } else {
        const segs = mTrim.split("；");
        const last = segs[segs.length - 1].trim();
        const earlier = segs.slice(0, -1).some((s) => s.includes(PREFIX_MEANING_MARK));
        rep.check("V-VOC-07", segs.length >= 2 && last.startsWith(PREFIX_MEANING_MARK) && !earlier, () => `${tag}：「${PREFIX_MEANING_MARK}」不在開頭時必須是 meaning 的最後一段（最後一個「；」之後以「${PREFIX_MEANING_MARK}」開頭，M-8 (1)）：${show(it.meaning)}`);
        rep.check("V-VOC-07", posArr.length >= 2 && posArr[posArr.length - 1] === PREFIX_POS, () => `${tag}：meaning 末段為字首義（M-8 (1)），pos 至少 2 個且最後一個必須是 "${PREFIX_POS}"（實際 ${show(it.pos)}）：${show(it.meaning)}`);
      }
    }
    if (posArr.includes(PREFIX_POS)) {
      rep.check("V-VOC-07", mTrim.includes(PREFIX_MEANING_MARK), () => `${tag}：pos 含 "${PREFIX_POS}"，meaning 必須含「${PREFIX_MEANING_MARK}」（M-8）：${show(it.meaning)}`);
      rep.check("V-VOC-07", posArr.indexOf(PREFIX_POS) === posArr.length - 1, () => `${tag}：pos 的 "${PREFIX_POS}" 只能在最後一個位置（M-8）：${show(it.pos)}`);
    }
    // V-VOC-08
    if (!isStr(it.academicContext)) rep.err("V-VOC-08", `${tag}：academicContext 必須是字串（不得為 null 或省略）`);
    else if (isInt(it.rank) && it.rank > nB && !skeleton) rep.check("V-VOC-08", nonEmpty(it.academicContext), `${tag}：rank > N_B（${nB}）academicContext 必須非空`);
    else rep.ok("V-VOC-08");

    // V-VOC-09
    rep.check("V-VOC-09", it.contentSource === "ORIGINAL", `${tag}：contentSource 必須為 "ORIGINAL"（${show(it.contentSource)}）`);
    rep.check("V-VOC-09", it.phoneticSource === "ORIGINAL", `${tag}：phoneticSource 必須為 "ORIGINAL"（${show(it.phoneticSource)}）`);
    if (rep.check("V-VOC-09", it.meaningSource === "ECDICT" || it.meaningSource === "ORIGINAL", `${tag}：meaningSource 只能是 "ECDICT" 或 "ORIGINAL"（${show(it.meaningSource)}）`)) {
      if (ref.ecdict) {
        if (it.meaningSource === "ECDICT") rep.check("V-VOC-09", ref.ecdict.map.has(wk), `${tag}：meaningSource = ECDICT，但 wordKey ${wk} 不在 ecdict_subset.csv`);
        if (ref.missing.has(wk)) rep.check("V-VOC-09", it.meaningSource === "ORIGINAL", `${tag}：列於 ecdict_subset_missing.txt，meaningSource 必須為 "ORIGINAL"`);
        else if (it.meaningSource === "ORIGINAL") rep.warn("V-VOC-09", `${tag}：meaningSource = ORIGINAL 且不在 missing 清單，須在交付紀錄列出原因（M-6）`);
      }
    }

    // V-VOC-10
    // （契約 v0.5 DF-06）錯誤：值 trim 後不分大小寫「等於」undefined／null，唯一豁免為 wordKey 即該值那筆的 word 欄；
    // 警告：含獨立單字 undefined／null 且該筆 wordKey 不是 null／undefined；wordKey 為 null／undefined 的那筆不報告。
    const selfForbidden = wk === "null" || wk === "undefined";
    eachString(it, (s, p) => {
      const eq = s.trim().toLowerCase();
      if ((eq === "undefined" || eq === "null") && !(p === "word" && eq === wk)) rep.err("V-VOC-10", `${tag}：${p} 的值等於「${eq}」：${show(s)}`);
      else if (!selfForbidden && /\b(undefined|null)\b/i.test(s)) rep.warn("V-VOC-10", `${tag}：${p} 含獨立單字 undefined／null，須在交付紀錄說明為合法用法：${show(s)}`);
      else rep.ok("V-VOC-10");
      if (/[<>]/.test(s)) rep.err("V-VOC-10", `${tag}：${p} 含 < 或 >：${show(s)}`);
    });

    // V-VOC-15
    if (nonEmpty(it.meaning)) {
      if (ref.twTerms) {
        const hit = ref.twTerms.filter((t) => it.meaning.includes(t.from));
        rep.check("V-VOC-15", !hit.length, () => `${tag}：meaning 殘留 tw_terms.tsv 來源詞「${hit.map((h) => h.from).join("、")}」：${show(it.meaning)}`);
      }
      rep.check("V-VOC-15", !/\[[^\]]*\]/.test(it.meaning), `${tag}：meaning 含方括號領域標記：${show(it.meaning)}`);
    }
    // V-VOC-15（契約 v0.6 M-3 補充表）：「例項」為 s2twp 過度轉換產物
    if (nonEmpty(it.meaning)) {
      const over = MEANING_FORBIDDEN_TERMS.filter((t) => it.meaning.includes(t));
      rep.check("V-VOC-15", !over.length, () => `${tag}：meaning 含「${over.join("、")}」（s2twp 過度轉換產物，非台灣用語；一般義用「實例」，契約 v0.6 M-3）：${show(it.meaning)}`);
    }
    // V-VOC-16
    if (nonEmpty(it.phonetic)) {
      const bad = ECDICT_LEGACY_PHONETIC_CHARS.filter((c) => it.phonetic.includes(c));
      rep.check("V-VOC-16", !bad.length, () => `${tag}：phonetic 含 ECDICT 舊式字元 ${bad.map((c) => show(c)).join("、")}：${it.phonetic}`);
    }
    // V-VOC-17
    if (ref.ecdict && it.meaningSource === "ECDICT" && ref.ecdict.map.has(wk)) {
      const hits = contextHits(ref.ecdict.map.get(wk).simplified);
      if (hits.length) {
        rep.info("V-VOC-17", `${tag}：簡體原檔含「${hits.join("、")}」；meaning = ${show(S("meaning"))}`);
        if (hits.includes("程序") && S("meaning").includes("程式")) rep.warn("V-VOC-17", `${tag}：簡體原檔為「程序」，meaning 用「程式」，請確認是否為 s2twp 過度轉換（M-3）`);
        if (hits.includes("文件") && S("meaning").includes("檔案")) rep.warn("V-VOC-17", `${tag}：簡體原檔為「文件」，meaning 用「檔案」，請確認是否為 s2twp 過度轉換（M-3）`);
      }
    }

    // H-1／H-1W（architecture.md v0.3 §8.4、R3-4）：導出字集扣除白名單 → 錯誤；白名單 ∩ 導出字集 → 警告
    if (nonEmpty(it.meaning) && ref.h1) {
      const chars = [...new Set([...it.meaning])];
      const bad = chars.filter((ch) => ref.h1.errorChars.has(ch));
      rep.check("H-1", !bad.length, () => `${tag}：meaning 含簡體專用字「${bad.join("")}」：${show(it.meaning)}`);
      const homo = chars.filter((ch) => ref.h1.warnChars.has(ch));
      for (const ch of homo) { ref.h1Hits.add(ch); rep.warn("H-1W", `${tag}：含繁簡同形字「${ch}」，請確認為正確繁體用法：${show(it.meaning)}`); }
      if (!homo.length) rep.ok("H-1W");
    }
    // H-2
    if (nonEmpty(it.phonetic)) {
      const inner = it.phonetic.replace(/^\//, "").replace(/\/$/, "");
      const badChars = [...new Set([...inner].filter((c) => !IPA_ALLOWED_CHARS.has(c) || c === "/"))];
      const brit = IPA_BRITISH_BLACKLIST.filter((b) => b.re.test(inner)).map((b) => b.sym);
      const probs = [];
      if (badChars.length) probs.push(`不允許的字元 ${badChars.map((c) => `${show(c)}(U+${c.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")})`).join("、")}`);
      if (brit.length) probs.push(`英式符號 ${brit.join("、")}`);
      if (IPA_BARE_VOWEL_RE.test(inner)) probs.push("e／o／a 未組成 eɪ／oʊ／aɪ、aʊ");
      if (/^\s|\s$|\s{2}/.test(inner)) probs.push("空白位置不當");
      rep.check("H-2", !probs.length, () => `${tag}：phonetic ${it.phonetic}：${probs.join("；")}`);
    }
    // H-3
    const limits = [["meaning", 30, "字"], ["collocation", 80, "字元"], ["example", 160, "字元"], ["academicContext", 200, "字元"]];
    for (const [k, n, unit] of limits) {
      if (!nonEmpty(it[k])) continue;
      const len = charLength(it[k]);
      rep.check("H-3", len <= n, `${tag}：${k} 長 ${len} ${unit}，超過 ${n}（超過須在紀錄說明）`, "warn");
    }
    // H-4
    for (const k of ["example", "academicContext"]) {
      if (!nonEmpty(it[k])) continue;
      const s = it[k].trim();
      rep.check("H-4", /^\p{Lu}/u.test(s), `${tag}：${k} 未以大寫開頭：${show(s)}`, "warn");
      rep.check("H-4", /[.?!]$/.test(s), `${tag}：${k} 未以 . ? ! 結尾：${show(s)}`, "warn");
    }
    if (word) {
      const forms = [...new Set([word, ...((ref.forms && ref.forms.get(wk)) || [])])];
      for (const k of ["collocation", "example"]) {
        if (!nonEmpty(it[k])) continue;
        rep.check("H-4", containsForm(it[k], forms), `${tag}：${k} 未含該字或其詞形（${forms.slice(0, 6).join("/")}）：${show(it[k])}`, "warn");
      }
    }

    // S-2、V-VOC-04、05、06
    if (Array.isArray(it.sources)) {
      const srcOk = it.sources.length >= 1 && new Set(it.sources).size === it.sources.length
        && it.sources.every((s) => CONFIRMED_WORDLISTS.includes(s))
        && sameArr(it.sources, WORDLIST_ORDER.filter((c) => it.sources.includes(c)));
      rep.check("V-VOC-06", srcOk, `${tag}：sources ${show(it.sources)} 須至少 1 個、不重複、只含已確認字表、依 NGSL→TSL→BSL→NAWL 排序`);
    }
    if (R && isInt(it.rank)) {
      const exp = R.items[it.rank - 1];
      if (!exp) rep.err("S-2", `${tag}：rank 超出重算範圍 1～${R.nG}`);
      else {
        const diffs = [];
        if (it.word !== exp.word) diffs.push(`word ${show(it.word)} ≠ ${show(exp.word)}`);
        if (!sameArr(it.sources, exp.sources)) diffs.push(`sources ${show(it.sources)} ≠ ${show(exp.sources)}`);
        if (it.phoneticSource !== "ORIGINAL") diffs.push("phoneticSource ≠ ORIGINAL");
        if (it.contentSource !== "ORIGINAL") diffs.push("contentSource ≠ ORIGINAL");
        if (ref.ecdict) {
          const expMs = ref.ecdict.map.has(exp.wordKey) ? "ECDICT" : "ORIGINAL";
          if (it.meaningSource !== expMs && !(expMs === "ECDICT" && it.meaningSource === "ORIGINAL")) diffs.push(`meaningSource ${show(it.meaningSource)} 不可由骨架值 ${expMs} 改成此值`);
          else if (it.meaningSource !== expMs) rep.info("S-2", `${tag}：meaningSource 由骨架值 ECDICT 改為 ORIGINAL（允許，須有紀錄）`);
        }
        rep.check("S-2", !diffs.length, () => `${tag}：骨架欄位與重算不符：${diffs.join("；")}`);
        if (it.rank <= R.nB) rep.check("V-VOC-04", wk === exp.wordKey, `${tag}：排名 ${it.rank} 應為 NGSL 序列的 ${show(exp.wordKey)}`);
        else {
          const okSrc = Array.isArray(it.sources) && !it.sources.includes("NGSL") && ["TSL", "BSL", "NAWL"].includes(it.sources[0]);
          rep.check("V-VOC-05", okSrc, `${tag}：rank > N_B 的 sources 不得含 NGSL 且第一個須為 TSL／BSL／NAWL（${show(it.sources)}）`);
          rep.check("V-VOC-05", wk === exp.wordKey && Array.isArray(it.sources) && it.sources[0] === exp.firstList, `${tag}：依 R-2～R-4 應為 ${show(exp.wordKey)}（${exp.firstList} 區段）`);
        }
      }
    }
  }

  // ── 範圍性規則 ──
  const items = all.map((x) => x.it).filter(isPlainObj);
  const ranks = items.map((it) => it.rank).filter(isInt);
  const rankSet = new Set(ranks);
  const scopeRanges = mode === "all"
    ? [[1, R ? R.nG : Math.max(0, ...ranks)]]
    : files.map((f) => { const i = vocabFileInfo(f.name); const rs = f.items.map((x) => x && x.rank).filter(isInt); return i ? [i.rankFrom, i.rankTo] : [Math.min(...rs), Math.max(...rs)]; });
  // V-VOC-02
  rep.check("V-VOC-02", ranks.length === items.length, `有 ${items.length - ranks.length} 筆 rank 不是整數`);
  rep.check("V-VOC-02", rankSet.size === ranks.length, () => `rank 重複：${[...dupes(ranks)].slice(0, 20).join(", ")}`);
  for (const [a, b] of scopeRanges) {
    const missing = [];
    for (let r = a; r <= b; r++) if (!rankSet.has(r)) missing.push(r);
    const outside = ranks.filter((r) => r < a || r > b);
    rep.check("V-VOC-02", !missing.length, () => `區間 ${a}～${b} 缺少 rank：${compactRanges(missing)}`);
    if (mode === "all") rep.check("V-VOC-02", !outside.length, () => `rank 超出 1～N_G（${b}）：${outside.slice(0, 20).join(", ")}`);
  }
  if (mode === "all" && R) rep.check("V-VOC-02", items.length === R.nG, `字庫筆數 ${items.length} ≠ 重算 N_G ${R.nG}`);
  // V-VOC-03
  const wks = items.filter((it) => isStr(it.word)).map((it) => wordKey(it.word));
  const dup = [...dupes(wks)];
  rep.check("V-VOC-03", !dup.length, () => `wordKey 重複：${dup.slice(0, 20).join("、")}`);
  // V-VOC-04（全庫）
  if (mode === "all" && R) {
    const top = new Set(items.filter((it) => isInt(it.rank) && it.rank <= R.nB && isStr(it.word)).map((it) => wordKey(it.word)));
    for (const w of ["the", "of", "a", "and", "to", "in", "he", "it", "can", "will"]) rep.check("V-VOC-04", top.has(w), `排名 1～N_B 缺少功能詞 ${w}`);
    const ngslCount = items.filter((it) => Array.isArray(it.sources) && it.sources.includes("NGSL")).length;
    rep.check("V-VOC-04", ngslCount === R.nB, `sources 含 NGSL 的筆數 ${ngslCount} ≠ NGSL 去重字數 ${R.nB}`);
  }
  // V-VOC-13、H-5、H-7（分檔）
  for (const f of files) {
    const info = vocabFileInfo(f.name);
    const m = /^vocab-(\d{4})\.js$/.exec(f.name);
    const rs = f.items.map((x) => x && x.rank).filter(isInt).sort((a, b) => a - b);
    if (!rep.check("V-VOC-13", !!m, `${f.name}：檔名須為 vocab- + 4 位數起始排名`)) continue;
    const start = parseInt(m[1], 10);
    if (rs.length) {
      rep.check("V-VOC-13", rs[0] === start, `${f.name}：檔名起始排名 ${start} ≠ 檔內最小 rank ${rs[0]}`);
      rep.check("V-VOC-13", rs[rs.length - 1] - rs[0] + 1 === rs.length && new Set(rs).size === rs.length, `${f.name}：排名不連續（${rs[0]}～${rs[rs.length - 1]}，${rs.length} 筆）`);
      if (info) rep.check("V-VOC-13", rs[0] === info.rankFrom && rs[rs.length - 1] === info.rankTo, `${f.name}：區間 ${rs[0]}～${rs[rs.length - 1]} ≠ 分檔表 ${info.rankFrom}～${info.rankTo}`);
    } else rep.err("V-VOC-13", `${f.name}：沒有任何資料`);
    rep.check("V-VOC-13", /window\.MASTER_VOCAB_DATABASE\s*=\s*\(\s*window\.MASTER_VOCAB_DATABASE\s*\|\|\s*\[\s*\]\s*\)\s*\.concat\(\s*\[/.test(f.text), `${f.name}：未使用契約 §3.1 固定寫法 window.MASTER_VOCAB_DATABASE = (window.MASTER_VOCAB_DATABASE || []).concat([ ... ]);`);
    // H-5
    const ex = f.items.filter(isPlainObj).map((x) => (isStr(x.example) ? x.example.trim() : "")).filter(Boolean);
    const exDup = [...dupes(ex)];
    rep.check("H-5", !exDup.length, () => `${f.name}：example 重複 ${exDup.length} 組：${exDup.slice(0, 5).map(show).join("、")}`);
    const mn = f.items.filter(isPlainObj).map((x) => (isStr(x.meaning) ? x.meaning.trim() : "")).filter(Boolean);
    const mnDup = [...dupes(mn)];
    rep.check("H-5", !mnDup.length, () => `${f.name}：meaning 重複 ${mnDup.length} 組：${mnDup.slice(0, 5).map(show).join("、")}`, "warn");
    // H-7
    if (f.items.length) {
      const avg = Buffer.byteLength(JSON.stringify(f.items), "utf8") / f.items.length;
      if (avg > 700) rep.err("H-7", `${f.name}：壓縮後平均每筆 ${avg.toFixed(1)} bytes > 700`);
      else if (avg > 600) rep.warn("H-7", `${f.name}：壓縮後平均每筆 ${avg.toFixed(1)} bytes > 600`);
      else { rep.ok("H-7"); rep.info("H-7", `${f.name}：壓縮後平均每筆 ${avg.toFixed(1)} bytes`); }
    }
  }
  // V-VOC-14（只報告）
  const groups = new Map();
  for (const it of items) if (nonEmpty(it.meaning)) { const k = it.meaning.trim(); groups.set(k, (groups.get(k) || []).concat(it.rank)); }
  let dupGroups = 0;
  for (const [k, rs] of groups) if (rs.length > 1) { dupGroups++; rep.warn("V-VOC-14", `meaning ${show(k)} 重複於 rank ${rs.join(", ")}`); }
  if (!dupGroups) rep.ok("V-VOC-14");
}

function* dupes(arr) {
  const seen = new Set(); const out = new Set();
  for (const x of arr) { if (seen.has(x)) out.add(x); seen.add(x); }
  yield* out;
}
function compactRanges(nums) {
  const out = []; let s = null, p = null;
  for (const n of nums) { if (s === null) { s = p = n; } else if (n === p + 1) p = n; else { out.push(s === p ? `${s}` : `${s}～${p}`); s = p = n; } }
  if (s !== null) out.push(s === p ? `${s}` : `${s}～${p}`);
  return out.slice(0, 20).join(", ") + (out.length > 20 ? " …" : "");
}

// ─────────────────────────────────────────────────────────────
// sources.js（V-SRC、V-VOC-11）
// ─────────────────────────────────────────────────────────────

function checkSources(win, vocab, ref, rep, mode) {
  const reg = win.DATA_SOURCE_REGISTRY;
  const man = win.VOCAB_MANIFEST;
  const lic = win.PROJECT_LICENSE;
  const R = ref.ranking;

  // V-VOC-11：VOCAB_MANIFEST
  if (!isPlainObj(man)) rep.err("V-VOC-11", "VOCAB_MANIFEST 不是物件");
  else {
    const keys = Object.keys(man).sort().join(",");
    rep.check("V-VOC-11", keys === ["dataVersion", "nB", "nG", "nO", "segments"].sort().join(","), `VOCAB_MANIFEST 鍵應為 dataVersion、nO、nB、nG、segments（實際：${Object.keys(man).join(",")}）`);
    rep.check("V-VOC-11", isStr(man.dataVersion) && /^\d{4}\.\d{2}\.\d{2}(-\d+)?$/.test(man.dataVersion), `dataVersion ${show(man.dataVersion)} 格式應為 YYYY.MM.DD 或 YYYY.MM.DD-n`);
    rep.check("V-VOC-11", man.nO === 1000, `nO 應為 1000（${show(man.nO)}）`);
    rep.check("V-VOC-11", man.nB === RECORDED.nB, `nB ${show(man.nB)} ≠ 契約 §4.2 紀錄值 ${RECORDED.nB}`);
    rep.check("V-VOC-11", man.nG === RECORDED.nG, `nG ${show(man.nG)} ≠ 契約 §4.2 紀錄值 ${RECORDED.nG}`);
    if (R) rep.check("V-VOC-11", show(man.segments) === show(R.segments), () => `segments ${show(man.segments)} ≠ 依 R-1～R-4 重算 ${show(R.segments)}`);
    if (Array.isArray(man.segments)) {
      let next = 1; let okChain = true;
      for (const s of man.segments) { if (!isPlainObj(s) || s.rankFrom !== next || !(s.rankTo >= s.rankFrom) || !CONFIRMED_WORDLISTS.includes(s.list)) okChain = false; else next = s.rankTo + 1; }
      rep.check("V-VOC-11", okChain && next - 1 === man.nG, "segments 未首尾相接涵蓋 1～nG 或 list 非法");
    } else rep.err("V-VOC-11", "segments 不是陣列");
    if (vocab) {
      rep.check("V-VOC-11", man.nB === vocab.filter((it) => isPlainObj(it) && Array.isArray(it.sources) && it.sources.includes("NGSL")).length, "nB ≠ 字庫中 sources 含 NGSL 的筆數");
      rep.check("V-VOC-11", man.nG === vocab.length, `nG ${show(man.nG)} ≠ 字庫總筆數 ${vocab.length}`);
    }
  }

  // V-SRC-04
  if (!isPlainObj(lic)) rep.err("V-SRC-04", "PROJECT_LICENSE 不是物件");
  else {
    const want = [...Object.keys(EXPECTED_PROJECT_LICENSE), "copyrightYear"].sort().join(",");
    rep.check("V-SRC-04", Object.keys(lic).sort().join(",") === want, `PROJECT_LICENSE 鍵應恰為 ${want}`);
    for (const [k, v] of Object.entries(EXPECTED_PROJECT_LICENSE)) rep.check("V-SRC-04", lic[k] === v, `PROJECT_LICENSE.${k} 應為 ${show(v)}（${show(lic[k])}）`);
    rep.check("V-SRC-04", isInt(lic.copyrightYear) && lic.copyrightYear >= 2026, `copyrightYear 應為交付年份整數（${show(lic.copyrightYear)}）`);
  }

  if (!Array.isArray(reg)) { rep.err("V-SRC-01", "DATA_SOURCE_REGISTRY 不是陣列"); return; }
  const codes = reg.map((e) => (isPlainObj(e) ? e.code : undefined));
  // V-SRC-01
  rep.check("V-SRC-01", new Set(codes).size === codes.length, `code 重複：${show(codes)}`);
  let expectSet;
  if (vocab) {
    expectSet = new Set(["ORIGINAL"]);
    for (const it of vocab) if (isPlainObj(it)) { (Array.isArray(it.sources) ? it.sources : []).forEach((s) => expectSet.add(s)); if (it.meaningSource === "ECDICT") expectSet.add("ECDICT"); }
  } else {
    expectSet = new Set([...CONFIRMED_WORDLISTS, "ECDICT", "ORIGINAL"]);
    rep.info("V-SRC-01", "找不到字庫分檔，改以契約預期 6 筆（NGSL、TSL、BSL、NAWL、ECDICT、ORIGINAL）比對");
  }
  const got = new Set(codes);
  const lack = [...expectSet].filter((c) => !got.has(c));
  const more = [...got].filter((c) => !expectSet.has(c));
  rep.check("V-SRC-01", !lack.length && !more.length, `代碼集合不符：缺 ${show(lack)}、多 ${show(more)}`);

  for (const e of reg) {
    if (!isPlainObj(e)) { rep.err("V-SRC-02", `來源登錄元素不是物件：${show(e)}`); continue; }
    const tag = `來源 ${e.code}`;
    const exp = EXPECTED_REGISTRY[e.code];
    // 結構
    const keys = Object.keys(e);
    rep.check("V-SRC-02", SOURCE_ENTRY_KEYS.every((k) => keys.includes(k)) && keys.every((k) => SOURCE_ENTRY_KEYS.includes(k)), `${tag}：鍵應恰為 DataSourceEntry 的 16 個欄位（實際 ${keys.length} 個：${keys.join(",")}）`);
    if (!rep.check("V-SRC-02", !!exp, `${tag}：代碼不在契約 §4.3「可收錄 = 是」清單（L-1）`)) continue;
    // V-SRC-02：確認紀錄
    const c = e.confirmation;
    if (!isPlainObj(c)) rep.err("V-SRC-02", `${tag}：confirmation 不是物件`);
    else {
      rep.check("V-SRC-02", c.status === "confirmed", `${tag}：confirmation.status 應為 confirmed（${show(c.status)}）`);
      for (const k of ["confirmedAt", "confirmedBy", "evidenceUrl"]) rep.check("V-SRC-02", nonEmpty(c[k]), `${tag}：confirmation.${k} 必須非空`);
      for (const k of ["confirmedAt", "confirmedBy", "evidenceUrl"]) rep.check("V-SRC-02", c[k] === exp[k], `${tag}：confirmation.${k} ${show(c[k])} ≠ §4.3 ${show(exp[k])}`);
      const ck = Object.keys(c).filter((k) => !["status", "confirmedAt", "confirmedBy", "evidenceUrl", "note"].includes(k));
      rep.check("V-SRC-02", !ck.length, `${tag}：confirmation 多餘鍵 ${ck.join(",")}`);
      if ("note" in c) rep.check("V-SRC-02", nonEmpty(c.note), `${tag}：confirmation.note 若存在須非空字串`);
    }
    // L-3：內容與 §4.3 一致
    for (const k of ["kind", "name", "fullName", "licenseName", "licenseUrl", "originUrl"]) rep.check("V-SRC-02", e[k] === exp[k], `${tag}：${k} ${show(e[k])} ≠ §4.3 ${show(exp[k])}`);
    if (exp.homepageUrl !== undefined) rep.check("V-SRC-02", e.homepageUrl === exp.homepageUrl, `${tag}：homepageUrl ${show(e.homepageUrl)} ≠ §4.3 ${show(exp.homepageUrl)}`);
    else rep.check("V-SRC-02", isStr(e.homepageUrl), `${tag}：homepageUrl 必須是字串（尚無時填 ""）`);
    rep.check("V-SRC-02", sameArr(e.authors, exp.authors), `${tag}：authors ${show(e.authors)} ≠ §4.3 ${show(exp.authors)}`);
    const expVersion = e.code === "ORIGINAL" ? (isPlainObj(man) ? man.dataVersion : undefined) : exp.version;
    rep.check("V-SRC-02", e.version === expVersion, `${tag}：version ${show(e.version)} ≠ ${show(expVersion)}${e.code === "ORIGINAL" ? "（應同 VOCAB_MANIFEST.dataVersion）" : ""}`);
    // L-4：modifications
    if (!Array.isArray(e.modifications) || !e.modifications.every(isStr)) rep.err("V-SRC-02", `${tag}：modifications 必須是字串陣列`);
    else if (exp.modifications) rep.check("V-SRC-02", sameArr(e.modifications, exp.modifications), `${tag}：modifications 應恰為 ${show(exp.modifications)}（${show(e.modifications)}）`);
    else {
      const joined = e.modifications.join("／");
      const lackKw = WORDLIST_MODIFICATION_KEYWORDS.filter((kw) => !joined.includes(kw));
      rep.check("V-SRC-02", !lackKw.length, `${tag}：modifications 未涵蓋 ${lackKw.join("、")}（L-4）`);
    }
    // V-SRC-03
    if (exp.kind === "wordlist") {
      if (ref.lists) rep.check("V-SRC-03", e.originalItemCount === ref.lists[e.code].report.uniqueWordKeys, `${tag}：originalItemCount ${show(e.originalItemCount)} ≠ 輸入檔不重複 wordKey ${ref.lists[e.code].report.uniqueWordKeys}`);
    } else rep.check("V-SRC-03", e.originalItemCount === null, `${tag}：originalItemCount 應為 null`);
    if (e.code === "ORIGINAL") rep.check("V-SRC-03", e.includedItemCount === null, `${tag}：includedItemCount 應為 null`);
    else if (vocab) {
      const n = e.code === "ECDICT"
        ? vocab.filter((it) => isPlainObj(it) && it.meaningSource === "ECDICT").length
        : vocab.filter((it) => isPlainObj(it) && Array.isArray(it.sources) && it.sources.includes(e.code)).length;
      rep.check("V-SRC-03", e.includedItemCount === n, `${tag}：includedItemCount ${show(e.includedItemCount)} ≠ 字庫實際 ${n}`);
    } else rep.check("V-SRC-03", isInt(e.includedItemCount) && e.includedItemCount >= 0, `${tag}：includedItemCount 應為非負整數`);
    // V-SRC-05
    if (e.licenseName === "MIT") {
      rep.check("V-SRC-05", nonEmpty(e.copyrightNotice) && nonEmpty(e.licenseText), `${tag}：MIT 來源的 copyrightNotice、licenseText 必須非空`);
      if (ref.license) {
        const norm = (s) => String(s).replace(/\r\n/g, "\n").replace(/\s+$/, "");
        rep.check("V-SRC-05", isStr(e.licenseText) && norm(e.licenseText) === ref.license, `${tag}：licenseText 與 sources/ecdict/LICENSE 原文不一致`);
        rep.check("V-SRC-05", isStr(e.copyrightNotice) && ref.license.split("\n").some((l) => l.trim() === e.copyrightNotice.trim()) && /^Copyright/.test(e.copyrightNotice), `${tag}：copyrightNotice ${show(e.copyrightNotice)} 不是 LICENSE 中的著作權聲明行`);
      }
    } else rep.check("V-SRC-05", e.copyrightNotice === null && e.licenseText === null, `${tag}：非 MIT 來源的 copyrightNotice、licenseText 應為 null`);
  }
  if (mode === "all" && !vocab) rep.skip("V-SRC-03", "無字庫資料");
}

// ─────────────────────────────────────────────────────────────
// templates.js
// ─────────────────────────────────────────────────────────────

function checkTemplates(t, ref, vocabFiles, rep) {
  const EXP = [["cs", "資工"], ["business", "商管"], ["biostat", "生醫統計"]];
  const TW = ["word", "meaning", "phonetic", "pos", "collocation", "example", "academicContext"];
  if (!Array.isArray(t)) { rep.err("V-TPL-01", "DOMAIN_TEMPLATES 不是陣列"); return; }
  rep.check("V-TPL-01", t.length === 3, `範本應恰好 3 筆（${t.length}）`);
  const allKeys = [];
  t.forEach((tp, i) => {
    if (!isPlainObj(tp)) { rep.err("V-TPL-01", `第 ${i + 1} 筆不是物件`); return; }
    const e = EXP[i];
    if (e) rep.check("V-TPL-01", tp.id === e[0] && tp.label === e[1], `第 ${i + 1} 筆應為 ${e[0]}「${e[1]}」（${show(tp.id)}「${tp.label}」）`);
    rep.check("V-TPL-01", tp.source === "ORIGINAL", `${tp.id}：source 應為 "ORIGINAL"`);
    const ek = Object.keys(tp).filter((k) => !["id", "label", "words", "source"].includes(k));
    rep.check("V-TPL-01", !ek.length, `${tp.id}：多餘鍵 ${ek.join(",")}`);
    if (!Array.isArray(tp.words)) { rep.err("V-TPL-01", `${tp.id}：words 不是陣列`); return; }
    rep.check("V-TPL-01", tp.words.length === 10, `${tp.id}：words 應恰好 10 筆（${tp.words.length}）`);
    tp.words.forEach((w, j) => {
      if (!isPlainObj(w)) { rep.err("V-TPL-01", `${tp.id} 第 ${j + 1} 字不是物件`); return; }
      const keys = Object.keys(w);
      rep.check("V-TPL-01", keys.length === 7 && TW.every((k) => keys.includes(k)), `${tp.id} ${w.word}：鍵應恰為 ${TW.join(",")}`);
      const empty = TW.filter((k) => !nonEmpty(w[k]));
      rep.check("V-TPL-01", !empty.length, `${tp.id} ${w.word ?? `第 ${j + 1} 字`}：欄位為空 ${empty.join(",")}`);
      if (isStr(w.word)) allKeys.push({ tpl: tp.id, key: wordKey(w.word) });
    });
    const ks = new Set(allKeys.filter((x) => x.tpl === tp.id).map((x) => x.key));
    const need = { cs: ["latency", "scalability"], business: ["monetization"], biostat: ["heterogeneous"] }[tp.id] || [];
    for (const n of need) rep.check("V-TPL-02", ks.has(n), `${tp.id}：必須包含 ${n}`);
  });
  // V-TPL-03
  const builtin = new Set(ref.ranking ? ref.ranking.items.map((x) => x.wordKey) : []);
  for (const f of vocabFiles) for (const it of f.items) if (isPlainObj(it) && isStr(it.word)) builtin.add(wordKey(it.word));
  if (!builtin.size) rep.skip("V-TPL-03", "無排名與字庫資料");
  for (const { tpl, key } of allKeys) if (builtin.size) rep.check("V-TPL-03", !builtin.has(key), `${tpl}：${key} 已在內建字庫，注入時會被略過`);
  // V-TPL-04
  const d = [...dupes(allKeys.map((x) => x.key))];
  rep.check("V-TPL-04", !d.length, `範本單字 wordKey 重複：${d.join("、")}`);
  rep.check("V-TPL-04", allKeys.length === 30, `範本單字合計應為 30（${allKeys.length}）`);
}

// ─────────────────────────────────────────────────────────────
// part5.js
// ─────────────────────────────────────────────────────────────

function checkPart5(bank, rep, stage) {
  const TYPES = ["preposition_collocation", "part_of_speech", "context_vocabulary", "connector"];
  const KEYS = ["id", "type", "sentence", "options", "correctIndex", "explanation", "source"];
  if (!Array.isArray(bank)) { rep.err("V-P5-01", "PART5_QUESTION_BANK 不是陣列"); return; }
  const pos = [0, 0, 0, 0];
  const byType = Object.fromEntries(TYPES.map((t) => [t, 0]));
  const ids = [];
  bank.forEach((q, i) => {
    if (!isPlainObj(q)) { rep.err("V-P5-02", `第 ${i + 1} 題不是物件`); return; }
    const tag = `${q.id ?? `第 ${i + 1} 題`}`;
    const ek = Object.keys(q).filter((k) => !KEYS.includes(k));
    const mk = KEYS.filter((k) => !(k in q));
    rep.check("V-P5-02", !ek.length && !mk.length, `${tag}：鍵應恰為 ${KEYS.join(",")}（缺 ${mk.join(",") || "無"}、多 ${ek.join(",") || "無"}）`);
    // V-P5-01（題型）
    if (rep.check("V-P5-01", TYPES.includes(q.type), `${tag}：type ${show(q.type)} 不在 4 種題型`)) byType[q.type]++;
    // V-P5-02
    rep.check("V-P5-02", isStr(q.id) && /^p5-\d{3}$/.test(q.id), `${tag}：id 格式應為 p5-NNN`);
    ids.push(q.id);
    // V-P5-03
    if (!isStr(q.sentence) || !nonEmpty(q.sentence)) rep.err("V-P5-03", `${tag}：sentence 必須非空字串`);
    else {
      const runs = q.sentence.match(/_+/g) || [];
      rep.check("V-P5-03", runs.length === 1 && runs[0] === "_____", `${tag}：sentence 必須恰含 1 個「_____」且無其他連續底線（找到 ${show(runs)}）`);
    }
    // V-P5-04
    if (!Array.isArray(q.options) || q.options.length !== 4) rep.err("V-P5-04", `${tag}：options 必須恰好 4 個`);
    else {
      rep.check("V-P5-04", q.options.every(nonEmpty), `${tag}：options 有空值`);
      const norm = q.options.map((o) => (isStr(o) ? o.trim().toLowerCase() : o));
      rep.check("V-P5-04", new Set(norm).size === 4, `${tag}：options trim 後不分大小寫有重複 ${show(q.options)}`);
      rep.check("V-P5-04", q.options.every((o) => isStr(o) && !o.includes("_____")), `${tag}：options 不得含「_____」`);
    }
    // V-P5-05（索引範圍）
    if (rep.check("V-P5-05", isInt(q.correctIndex) && q.correctIndex >= 0 && q.correctIndex <= 3, `${tag}：correctIndex ${show(q.correctIndex)} 不在 0～3`)) pos[q.correctIndex]++;
    // V-P5-06
    const ex = q.explanation;
    rep.check("V-P5-06", isPlainObj(ex) && nonEmpty(ex.coreStrategy) && nonEmpty(ex.structure) && Object.keys(ex).length === 2, `${tag}：explanation 必須恰含非空的 coreStrategy、structure`);
    // V-P5-07
    rep.check("V-P5-07", q.source === "ORIGINAL", `${tag}：source 應為 "ORIGINAL"`);
  });
  const d = [...dupes(ids)];
  rep.check("V-P5-02", !d.length, `id 重複：${d.join("、")}`);
  if (stage === "partial") { rep.skip("V-P5-01 筆數", "partial"); rep.skip("V-P5-05 位置分布", "partial"); }
  else {
    rep.check("V-P5-01", bank.length >= 200, `總題數 ${bank.length} < 200`);
    for (const t of TYPES) rep.check("V-P5-01", byType[t] >= 50, `題型 ${t} 只有 ${byType[t]} 題（應 ≥ 50）`);
    const total = pos.reduce((a, b) => a + b, 0);
    if (total) pos.forEach((n, i) => rep.check("V-P5-05", n / total >= 0.2 && n / total <= 0.3, `正解位置 ${"ABCD"[i]} 佔 ${(n / total * 100).toFixed(1)}%（應 20%～30%）`));
  }
  rep.info("V-P5-05", `正解唯一性需人工判斷；位置分布 A ${pos[0]}、B ${pos[1]}、C ${pos[2]}、D ${pos[3]}`);
}

// ─────────────────────────────────────────────────────────────
// part5.js 題目 id 穩定性（CT-25；V-P5-08、V-P5-08W、V-P5-08N）
// ─────────────────────────────────────────────────────────────

const PART5_SNAPSHOT_PATH = join(DEFAULT_DATA_DIR, "_records", "part5-ids.json");
const FP_RE = /^[0-9a-f]{16}$/;

/** 指紋：NFC → trim → 連續空白壓成 1 個 → 小寫，SHA-256 取前 16 個 hex。 */
function part5Fingerprint(text) {
  const norm = String(text).normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();
  return createHash("sha256").update(norm, "utf8").digest("hex").slice(0, 16);
}

/** 單題指紋 { s, a }；sentence 或正解不是字串時回傳 null（格式錯誤由 V-P5-03～05 報告）。 */
function part5Prints(q) {
  if (!isPlainObj(q) || !isStr(q.sentence) || !Array.isArray(q.options) || !isInt(q.correctIndex) || !isStr(q.options[q.correctIndex])) return null;
  return { s: part5Fingerprint(q.sentence), a: part5Fingerprint(q.options[q.correctIndex]) };
}

function readPart5Snapshot() {
  let snap;
  try { snap = JSON.parse(readFileSync(PART5_SNAPSHOT_PATH, "utf8")); }
  catch (e) { return { snap: null, bad: [`無法解析 ${PART5_SNAPSHOT_PATH}：${e.message}`] }; }
  const bad = [];
  if (!isPlainObj(snap) || !isPlainObj(snap.meta) || !isPlainObj(snap.ids)) bad.push("頂層應為 { meta: 物件, ids: 物件 }");
  else for (const [id, v] of Object.entries(snap.ids)) {
    if (!/^p5-\d{3}$/.test(id) || !isPlainObj(v) || Object.keys(v).length !== 2 || !FP_RE.test(v.s) || !FP_RE.test(v.a)) bad.push(`ids.${id} 應為 p5-NNN → { s, a }（各 16 位小寫 hex）`);
  }
  return { snap, bad };
}

/** 依 id 排序後寫出（每題一行），meta.count = 快照 id 數。 */
function writePart5Snapshot(snap) {
  const ids = Object.keys(snap.ids).sort();
  snap.meta.count = ids.length;
  const body = ids.map((id) => `    ${JSON.stringify(id)}: ${JSON.stringify({ s: snap.ids[id].s, a: snap.ids[id].a })}`).join(",\n");
  writeFileSync(PART5_SNAPSHOT_PATH, `{\n  "meta": ${JSON.stringify(snap.meta)},\n  "ids": {\n${body}\n  }\n}\n`, "utf8");
}

function checkPart5Ids(bank, rep, stage, { wantUpdate, acceptIds }) {
  if (!Array.isArray(bank)) return; // V-P5-01 已報告
  // 題庫 id → 指紋（重複 id 由 V-P5-02 報告；這裡以第一次出現為準）
  const cur = new Map();
  for (const q of bank) {
    if (!isPlainObj(q) || !isStr(q.id) || !/^p5-\d{3}$/.test(q.id) || cur.has(q.id)) continue;
    cur.set(q.id, part5Prints(q));
  }
  const dupIds = new Set(dupes(bank.map((q) => (isPlainObj(q) ? q.id : undefined)).filter(isStr)));

  // ── 更新快照（只寫 _records/part5-ids.json）──
  if (wantUpdate || acceptIds.length) {
    let snap;
    if (existsSync(PART5_SNAPSHOT_PATH)) {
      const r = readPart5Snapshot();
      if (r.bad.length) { for (const b of r.bad) rep.err("V-P5-08", `快照格式錯誤，未更新：${b}`); return; }
      snap = r.snap;
    } else {
      snap = { meta: { createdBy: "CT-25", source: "src/data/part5.js", createdAt: new Date().toISOString(), count: 0 }, ids: {} };
    }
    let blocked = false;
    for (const id of acceptIds) {
      if (!cur.has(id)) { rep.err("V-P5-08", `--accept ${id}：題庫中沒有這個 id，未寫入`); blocked = true; }
      else if (dupIds.has(id) || !cur.get(id)) { rep.err("V-P5-08", `--accept ${id}：題目 id 重複或 sentence／正解格式錯誤，未寫入`); blocked = true; }
    }
    if (blocked) rep.info("V-P5-08", "因 --accept 參數錯誤，快照未寫入");
    else {
      const added = [];
      for (const id of acceptIds) snap.ids[id] = { ...cur.get(id) };
      if (wantUpdate) {
        for (const [id, fp] of cur) {
          if (id in snap.ids) continue;
          if (dupIds.has(id) || !fp) { rep.err("V-P5-08", `--update-snapshot：${id} 的 id 重複或 sentence／正解格式錯誤，未加入快照`); continue; }
          snap.ids[id] = { ...fp }; added.push(id);
        }
      }
      writePart5Snapshot(snap);
      rep.info("V-P5-08", `已寫入快照 ${PART5_SNAPSHOT_PATH}：新增 ${added.length} 筆${added.length ? `（${compactIds(added)}）` : ""}、覆寫 ${acceptIds.length} 筆${acceptIds.length ? `（${acceptIds.join("、")}）` : ""}；快照共 ${snap.meta.count} 筆`);
    }
  }

  // ── 檢查 ──
  if (stage !== "final") { rep.skip("V-P5-08", `階段 ${stage}，只在 final 執行`); return; }
  if (!existsSync(PART5_SNAPSHOT_PATH)) {
    console.log(`提示：找不到題目 id 快照 ${PART5_SNAPSHOT_PATH}，略過 V-P5-08；建立快照：node src/data/_tools/validate.mjs --all --stage final --update-snapshot`);
    rep.skip("V-P5-08", "快照檔不存在");
    return;
  }
  const { snap, bad } = readPart5Snapshot();
  if (bad.length) { for (const b of bad) rep.err("V-P5-08", `快照格式錯誤：${b}`); return; }
  const removed = [];
  for (const [id, old] of Object.entries(snap.ids)) {
    if (!cur.has(id)) { removed.push(id); continue; }
    const now = cur.get(id);
    if (!now) { rep.err("V-P5-08", `${id}：sentence 或正解格式錯誤，無法計算指紋`); continue; }
    const ds = now.s !== old.s, da = now.a !== old.a;
    if (ds && da) rep.err("V-P5-08", `${id}：sentence 與正解都和快照不同，疑似 id 改號或改指另一題（既有 id 不得改指另一題；若確為同一題的修訂，人工確認後執行 --accept ${id}）`);
    else if (ds || da) rep.warn("V-P5-08W", `${id}：${ds ? "sentence" : "正解 options[correctIndex]"} 和快照不同，請確認為錯字修正（題意與正解不變）；確認後執行 --accept ${id}`);
    else rep.ok("V-P5-08");
  }
  if (removed.length) rep.info("V-P5-08", `快照中有 ${removed.length} 個 id 不在題庫（已刪題，id 不得重用）：${compactIds(removed)}`);
  for (const id of cur.keys()) if (!(id in snap.ids)) rep.warn("V-P5-08N", `${id}：新題 id 不在快照（請確認未重用已刪除的 id；交付後執行 --update-snapshot 更新快照）`);
  rep.info("V-P5-08", `快照 ${Object.keys(snap.ids).length} 筆（meta.createdAt ${snap.meta.createdAt ?? "?"}）、題庫 ${cur.size} 個 id`);
}

function compactIds(ids) { return ids.length > 10 ? `${ids.slice(0, 10).join("、")}…等 ${ids.length} 個` : ids.join("、"); }

// ─────────────────────────────────────────────────────────────
// decoder.js
// ─────────────────────────────────────────────────────────────

function checkDecoder(win, rep, stage) {
  const ROLES = ["subject", "verb", "object", "modifier", "plain"];
  const SECTIONS = ["abstract", "methodology", "literature_review"];
  const ds = win.DECODER_SENTENCES;
  if (!Array.isArray(ds)) rep.err("V-DEC-01", "DECODER_SENTENCES 不是陣列");
  else {
    if (stage === "partial") rep.skip("V-DEC-01 筆數", "partial");
    else rep.check("V-DEC-01", ds.length >= 50, `長難句 ${ds.length} 句 < 50`);
    const ids = [];
    ds.forEach((s, i) => {
      if (!isPlainObj(s)) { rep.err("V-DEC-01", `第 ${i + 1} 句不是物件`); return; }
      const tag = s.id ?? `第 ${i + 1} 句`;
      rep.check("V-DEC-01", isStr(s.id) && /^ds-\d{3}$/.test(s.id), `${tag}：id 格式應為 ds-NNN`);
      ids.push(s.id);
      const ek = Object.keys(s).filter((k) => !["id", "segments", "translationZh", "section", "source"].includes(k));
      rep.check("V-DEC-04", !ek.length, `${tag}：多餘鍵 ${ek.join(",")}`);
      const segs = Array.isArray(s.segments) ? s.segments : null;
      if (!segs) { rep.err("V-DEC-02", `${tag}：segments 不是陣列`); }
      else {
        rep.check("V-DEC-02", segs.length >= 2, `${tag}：segments 至少 2 段`);
        rep.check("V-DEC-02", segs.every((g) => isPlainObj(g) && isStr(g.text) && g.text.length >= 1), `${tag}：每段 text 長度須 ≥ 1`);
        const full = segs.map((g) => (isPlainObj(g) && isStr(g.text) ? g.text : "")).join("");
        rep.check("V-DEC-02", full === full.trim(), `${tag}：串接後首尾有空白`);
        rep.check("V-DEC-02", !/ {2}/.test(full), `${tag}：串接後有連續兩個空白`);
        rep.check("V-DEC-02", /[.?!]$/.test(full), `${tag}：串接後未以 . ? ! 結尾`);
        const roles = segs.map((g) => isPlainObj(g) && g.role);
        for (const r of ["subject", "verb", "modifier"]) rep.check("V-DEC-03", roles.includes(r), `${tag}：缺少 ${r} 段`);
        segs.forEach((g, j) => {
          if (!isPlainObj(g)) return;
          rep.check("V-DEC-04", ROLES.includes(g.role), `${tag} 第 ${j + 1} 段：role ${show(g.role)} 不屬 SyntaxRole`);
          if ("noteZh" in g) rep.check("V-DEC-04", nonEmpty(g.noteZh), `${tag} 第 ${j + 1} 段：noteZh 若存在須非空`);
          const gk = Object.keys(g).filter((k) => !["text", "role", "noteZh"].includes(k));
          rep.check("V-DEC-04", !gk.length, `${tag} 第 ${j + 1} 段：多餘鍵 ${gk.join(",")}`);
        });
      }
      rep.check("V-DEC-04", nonEmpty(s.translationZh), `${tag}：translationZh 必須非空`);
      rep.check("V-DEC-04", SECTIONS.includes(s.section), `${tag}：section ${show(s.section)} 不合法`);
      rep.check("V-DEC-04", s.source === "ORIGINAL", `${tag}：source 應為 "ORIGINAL"`);
    });
    const d = [...dupes(ids)];
    rep.check("V-DEC-01", !d.length, `id 重複：${d.join("、")}`);
  }
  const rs = win.READING_STRATEGIES;
  const EXP = [["abstract", "Abstract 摘要"], ["methodology", "方法論"], ["literature_review", "文獻回顧（Research Gap）"]];
  if (!Array.isArray(rs)) { rep.err("V-RS-01", "READING_STRATEGIES 不是陣列"); return; }
  rep.check("V-RS-01", rs.length === 3, `閱讀策略應恰好 3 筆（${rs.length}）`);
  rs.forEach((r, i) => {
    if (!isPlainObj(r)) { rep.err("V-RS-01", `第 ${i + 1} 筆不是物件`); return; }
    const e = EXP[i];
    if (e) rep.check("V-RS-01", r.id === e[0] && r.title === e[1], `第 ${i + 1} 筆應為 ${e[0]}「${e[1]}」`);
    rep.check("V-RS-01", Array.isArray(r.tips) && r.tips.length >= 1 && r.tips.every(nonEmpty), `${r.id}：tips 至少 1 則且皆非空`);
    rep.check("V-RS-01", r.source === "ORIGINAL", `${r.id}：source 應為 "ORIGINAL"`);
  });
}

// ─────────────────────────────────────────────────────────────
// phrasebank.js
// ─────────────────────────────────────────────────────────────

function checkPhrasebank(pb, rep, stage) {
  const CATS = ["gap", "aim", "findings", "limitations"];
  if (!Array.isArray(pb)) { rep.err("V-PH-01", "ACADEMIC_PHRASEBANK 不是陣列"); return; }
  const byCat = Object.fromEntries(CATS.map((c) => [c, 0]));
  const ids = []; const tpls = [];
  pb.forEach((p, i) => {
    if (!isPlainObj(p)) { rep.err("V-PH-02", `第 ${i + 1} 則不是物件`); return; }
    const tag = p.id ?? `第 ${i + 1} 則`;
    if (rep.check("V-PH-01", CATS.includes(p.category), `${tag}：category ${show(p.category)} 不合法`)) byCat[p.category]++;
    rep.check("V-PH-02", isStr(p.id) && /^ph-\d{3}$/.test(p.id), `${tag}：id 格式應為 ph-NNN`);
    ids.push(p.id);
    rep.check("V-PH-02", nonEmpty(p.template), `${tag}：template 必須非空`);
    if (isStr(p.template)) tpls.push(p.template.trim().toLowerCase());
    rep.check("V-PH-02", nonEmpty(p.descriptionZh), `${tag}：descriptionZh 必須非空`);
    const ek = Object.keys(p).filter((k) => !["id", "category", "template", "descriptionZh", "exampleEn", "source"].includes(k));
    rep.check("V-PH-02", !ek.length, `${tag}：多餘鍵 ${ek.join(",")}`);
    rep.check("V-PH-03", p.source === "ORIGINAL", `${tag}：source 應為 "ORIGINAL"`);
    if ("exampleEn" in p) rep.check("V-PH-03", nonEmpty(p.exampleEn), `${tag}：exampleEn 若存在須非空`);
  });
  const d1 = [...dupes(ids)]; const d2 = [...dupes(tpls)];
  rep.check("V-PH-02", !d1.length, `id 重複：${d1.join("、")}`);
  rep.check("V-PH-02", !d2.length, `template 重複（trim、不分大小寫）：${d2.join("、")}`);
  if (stage === "partial") rep.skip("V-PH-01 筆數", "partial");
  else {
    rep.check("V-PH-01", pb.length >= 100, `句型總數 ${pb.length} < 100`);
    for (const c of CATS) rep.check("V-PH-01", byCat[c] >= 25, `類別 ${c} 只有 ${byCat[c]} 則（應 ≥ 25）`);
  }
}

// ─────────────────────────────────────────────────────────────

let code = 1;
try { code = main(); }
catch (e) { console.error(`驗證器發生未預期錯誤：${e && e.stack ? e.stack : e}`); code = 1; }
process.exitCode = code;
