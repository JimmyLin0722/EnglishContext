/*
 * FE-03 單元測試：契約常數、wordKey、分數與色級試算
 * 執行：node --test src/app/__tests__/goal.test.js
 * 數值例全部取自 docs/01-PRD.md v0.6 的 AC；nG 6000 為 PRD 例題假設值。
 * （FE-34）v0.9 常數：NAV_TAB_ORDER 4 項、HIDDEN_TAB_IDS、LEARNING_PROGRESS_FIELDS（architecture.md v0.5 §10.2 goal.test.js 列）。
 */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const C = require("../core/constants.js");
const { wordKey } = require("../core/wordkey.js");
const G = require("../core/goal.js");

const NB = 2809; // 契約 §4.2 紀錄值，亦為 AC-02-05 例題值
const NG_EXAMPLE = 6000; // AC-02-05、AC-02-10 例題假設值
const SCORES = [10, 215, 220, 465, 470, 725, 730, 855, 860, 990];

// ── constants.js ──────────────────────────────────────────────────

test("契約常數：COLOR_LEVELS 5 筆逐欄字面值相同", () => {
  assert.deepEqual(
    C.COLOR_LEVELS.map((l) => [l.id, l.nameZh, l.scoreMin, l.scoreMax, l.status, l.dailyNewWords, l.vocabTarget]),
    [
      ["orange", "橘", 10, 215, "open", 10, "N_O"],
      ["brown", "棕", 220, 465, "open", 10, "N_B"],
      ["green", "綠", 470, 725, "open", 15, "N_G"],
      ["blue", "藍", 730, 855, "locked", 20, null],
      ["gold", "金", 860, 990, "locked", 20, null],
    ]
  );
  assert.deepEqual(
    C.COLOR_LEVELS.map((l) => l.scenarioZh),
    [
      "入門：最高頻的生活基礎字彙",
      "基礎：日常溝通與簡單職場用語",
      "大學畢業門檻、基礎商務日常、職場多數情境、碩士先修",
      "高階商務談判、複雜文獻流暢處理",
      "專業熟練者、近母語水準",
    ]
  );
  // 每筆恰 8 個欄位，不自創欄位
  for (const l of C.COLOR_LEVELS) {
    assert.deepEqual(Object.keys(l), ["id", "nameZh", "scoreMin", "scoreMax", "status", "dailyNewWords", "vocabTarget", "scenarioZh"]);
  }
});

test("契約常數：其餘 13 個常數字面值相同", () => {
  assert.equal(C.SCORE_MIN, 10);
  assert.equal(C.SCORE_MAX, 990);
  assert.equal(C.SCORE_STEP, 5);
  assert.equal(C.SCORE_DEFAULT, 600);
  assert.equal(C.N_O, 1000);
  assert.deepEqual({ ...C.POS_LABELS }, {
    "n.": "名詞", "v.": "動詞", "adj.": "形容詞", "adv.": "副詞",
    "prep.": "介系詞", "conj.": "連接詞", "pron.": "代名詞", "det.": "限定詞",
    "art.": "冠詞", "num.": "數詞", "aux.": "助動詞", "int.": "感嘆詞", "phr.": "片語",
    "pref.": "字首",
  });
  // 順序也須與 data-schema.ts 一致（v0.7 新增 "pref." 在最後，FB-25）
  assert.deepEqual(Object.keys(C.POS_LABELS), ["n.", "v.", "adj.", "adv.", "prep.", "conj.", "pron.", "det.", "art.", "num.", "aux.", "int.", "phr.", "pref."]);
  assert.deepEqual({ ...C.PART5_TYPE_LABELS }, {
    preposition_collocation: "固定介系詞搭配",
    part_of_speech: "詞性辨析",
    context_vocabulary: "上下文單字",
    connector: "讓步/因果連接詞",
  });
  assert.equal(C.PART5_BLANK, "_____");
  assert.deepEqual({ ...C.PHRASE_CATEGORY_LABELS }, {
    all: "全部",
    gap: "研究空白 Gap",
    aim: "研究目的 Aim",
    findings: "研究結果 Findings",
    limitations: "研究限制 Limitations",
  });
  // v0.8（FE-22）：持久化升版
  assert.equal(C.CURRENT_SCHEMA_VERSION, 2);
  assert.deepEqual([...C.SUPPORTED_SCHEMA_VERSIONS], [1, 2]);
  assert.deepEqual({ ...C.STORAGE_KEYS }, {
    state: "englishMasterTrack:state",
    unreadable: "englishMasterTrack:unreadable",
  });
  assert.equal(C.BACKUP_FORMAT_ID, "english-master-track-backup");
  // v0.8（FE-20）新增 4 個常數，共 18 個；v0.9（FE-34）再新增 HIDDEN_TAB_IDS、LEARNING_PROGRESS_FIELDS，共 20 個
  assert.equal(Object.keys(C).length, 20);
});

test("契約常數 v0.8（FE-20）／v0.9（FE-34）：TAB_LABELS、NAV_TAB_ORDER、LEARNED_HISTORY_DAYS、DASHBOARD_CHART_DAYS 逐字相同", () => {
  // TAB_LABELS 7 項，鍵順序同 data-schema.ts
  assert.deepEqual({ ...C.TAB_LABELS }, {
    dashboard: "主控台",
    customizer: "難易度設定",
    flashcards: "單字卡",
    part5: "模擬測驗",
    decoder: "解碼器",
    phrasebank: "句型庫",
    sources: "資料來源與授權",
  });
  assert.deepEqual(Object.keys(C.TAB_LABELS), ["dashboard", "customizer", "flashcards", "part5", "decoder", "phrasebank", "sources"]);
  // （v0.9）NAV_TAB_ORDER 恰好 4 項，不含 sources、不含隱藏頁（R-18 三、AC-20-03、AC-27-01）
  assert.deepEqual([...C.NAV_TAB_ORDER], ["dashboard", "customizer", "flashcards", "part5"]);
  assert.equal(C.NAV_TAB_ORDER.length, 4);
  assert.ok(!C.NAV_TAB_ORDER.includes("sources"));
  C.NAV_TAB_ORDER.forEach((id) => assert.ok(Object.prototype.hasOwnProperty.call(C.TAB_LABELS, id)));
  assert.equal(C.LEARNED_HISTORY_DAYS, 30);
  assert.equal(C.DASHBOARD_CHART_DAYS, 7);
  // （FE-22）持久化升版：寫入 2、支援 1、2
  assert.equal(C.CURRENT_SCHEMA_VERSION, 2);
});

// ── v0.9 契約常數（FE-34）────────────────────────────────────────

/** 從契約 data-schema.ts 擷取 `export const NAME ... = [ ... ];` 陣列中的字串（逐項同序比對用） */
function contractStringArray(name) {
  const file = path.join(__dirname, "..", "..", "..", "docs", "02-contract", "data-schema.ts");
  const src = fs.readFileSync(file, "utf8");
  const m = new RegExp("export const " + name + "\\b[^=]*=\\s*\\[([\\s\\S]*?)\\];").exec(src);
  assert.ok(m, "data-schema.ts 找不到 " + name);
  return [...m[1].matchAll(/"([^"]*)"/g)].map((x) => x[1]);
}

test("契約常數 v0.9（FE-34）：HIDDEN_TAB_IDS 恰為 decoder、phrasebank（AC-20-04、HT-4）", () => {
  assert.deepEqual([...C.HIDDEN_TAB_IDS], ["decoder", "phrasebank"]);
  assert.deepEqual([...C.HIDDEN_TAB_IDS], contractStringArray("HIDDEN_TAB_IDS"));
});

test("契約常數 v0.9（FE-34）：NAV_TAB_ORDER 與 data-schema.ts 逐項同序", () => {
  assert.deepEqual([...C.NAV_TAB_ORDER], contractStringArray("NAV_TAB_ORDER"));
});

test("契約常數 v0.9（FE-34）：LEARNING_PROGRESS_FIELDS 6 項，與 data-schema.ts 逐項同序（US-32、CI-4）", () => {
  const expected = ["masteredWordKeys", "vocabQuiz", "part5", "streak", "todayLearned", "learnedHistory"];
  assert.deepEqual([...C.LEARNING_PROGRESS_FIELDS], expected);
  assert.deepEqual([...C.LEARNING_PROGRESS_FIELDS], contractStringArray("LEARNING_PROGRESS_FIELDS"));
  assert.equal(C.LEARNING_PROGRESS_FIELDS.length, 6);
  // 不含保留欄位（AC-32-03）
  assert.ok(!C.LEARNING_PROGRESS_FIELDS.includes("goal"));
  assert.ok(!C.LEARNING_PROGRESS_FIELDS.includes("customVocab"));
  assert.ok(!C.LEARNING_PROGRESS_FIELDS.includes("sttNoticeAcknowledged"));
});

test("契約常數 v0.9（FE-34）：NAV_TAB_ORDER ∩ HIDDEN_TAB_IDS = ∅，三者聯集 = TAB_LABELS 的鍵，TAB_LABELS 仍 7 項", () => {
  C.HIDDEN_TAB_IDS.forEach((id) => assert.ok(!C.NAV_TAB_ORDER.includes(id), id + " 不得在 NAV_TAB_ORDER"));
  const union = new Set([...C.NAV_TAB_ORDER, ...C.HIDDEN_TAB_IDS, "sources"]);
  assert.equal(union.size, C.NAV_TAB_ORDER.length + C.HIDDEN_TAB_IDS.length + 1);
  assert.deepEqual([...union].sort(), Object.keys(C.TAB_LABELS).sort());
  assert.equal(Object.keys(C.TAB_LABELS).length, 7);
  // 隱藏頁的文字保留（HT-4）
  assert.equal(C.TAB_LABELS.decoder, "解碼器");
  assert.equal(C.TAB_LABELS.phrasebank, "句型庫");
});

test("契約常數：物件深層凍結", () => {
  assert.ok(Object.isFrozen(C));
  assert.ok(Object.isFrozen(C.COLOR_LEVELS));
  C.COLOR_LEVELS.forEach((l) => assert.ok(Object.isFrozen(l)));
  assert.ok(Object.isFrozen(C.POS_LABELS));
  assert.ok(Object.isFrozen(C.PART5_TYPE_LABELS));
  assert.ok(Object.isFrozen(C.PHRASE_CATEGORY_LABELS));
  assert.ok(Object.isFrozen(C.SUPPORTED_SCHEMA_VERSIONS));
  assert.ok(Object.isFrozen(C.STORAGE_KEYS));
  assert.ok(Object.isFrozen(C.TAB_LABELS));
  assert.ok(Object.isFrozen(C.NAV_TAB_ORDER));
  assert.throws(() => { C.TAB_LABELS.part5 = "Part 5"; }, TypeError);
  assert.throws(() => { C.NAV_TAB_ORDER.push("sources"); }, TypeError);
  // （FE-34）v0.9 新增常數同樣凍結
  assert.ok(Object.isFrozen(C.HIDDEN_TAB_IDS));
  assert.ok(Object.isFrozen(C.LEARNING_PROGRESS_FIELDS));
  assert.throws(() => { C.HIDDEN_TAB_IDS.push("part5"); }, TypeError);
  assert.throws(() => { C.LEARNING_PROGRESS_FIELDS[0] = "goal"; }, TypeError);
  assert.throws(() => { C.NAV_TAB_ORDER[3] = "decoder"; }, TypeError);
  assert.throws(() => { C.SUPPORTED_SCHEMA_VERSIONS.push(3); }, TypeError);
  assert.throws(() => { C.LEARNED_HISTORY_DAYS = 31; }, TypeError);
  assert.throws(() => { C.COLOR_LEVELS[2].dailyNewWords = 99; }, TypeError);
});

// ── wordkey.js ────────────────────────────────────────────────────

test("wordKey：依 C-2 正規化", () => {
  assert.equal(wordKey("  Monetization "), "monetization");
  assert.equal(wordKey("Take\t  Into\n Account"), "take into account");
  assert.equal(wordKey("CAFÉ"), "café"); // NFC 合成
  assert.equal(wordKey("café"), wordKey("café"));
  assert.equal(wordKey("   "), "");
  assert.equal(wordKey(null), "");
  assert.equal(wordKey(undefined), "");
  assert.equal(wordKey(123), "");
});

// ── goal.js ───────────────────────────────────────────────────────

test("AC-02-03：10 個分數的每日新字量", () => {
  assert.deepEqual(SCORES.map(G.dailyNewWords), [10, 10, 10, 10, 15, 15, 20, 20, 20, 20]);
});

test("AC-02-04：10 個分數的對應色級", () => {
  assert.deepEqual(
    SCORES.map(G.colorOf),
    ["orange", "orange", "brown", "brown", "green", "green", "blue", "blue", "gold", "gold"]
  );
  // 經輸入解析後亦同
  assert.deepEqual(
    SCORES.map((s) => G.colorOf(G.parseScoreInput(String(s)).score)),
    ["orange", "orange", "brown", "brown", "green", "green", "blue", "blue", "gold", "gold"]
  );
});

test("AC-02-05：4 個算例", () => {
  // c = 0、S = 100 → 1,000 ÷ 70 = 14.29 → 15 週
  let r = G.estimate(100, 0, NB, NG_EXAMPLE);
  assert.equal(r.color, "orange");
  assert.equal(r.targetVocab, 1000);
  assert.equal(r.dailyNewWords, 10);
  assert.equal(r.weeks, 15);
  assert.equal(r.achieved, false);
  assert.equal(r.basedOnGreen, false);
  // c = 0、S = 300、N_B = 2,809 → 40.13 → 41 週
  r = G.estimate(300, 0, NB, NG_EXAMPLE);
  assert.equal(r.color, "brown");
  assert.equal(r.targetVocab, 2809);
  assert.equal(r.dailyNewWords, 10);
  assert.equal(r.weeks, 41);
  // c = 0、S = 600、N_G = 6,000 → 6,000 ÷ 105 = 57.14 → 58 週
  r = G.estimate(600, 0, NB, NG_EXAMPLE);
  assert.equal(r.color, "green");
  assert.equal(r.targetVocab, 6000);
  assert.equal(r.dailyNewWords, 15);
  assert.equal(r.weeks, 58);
  // c = 409、S = 300 → 2,400 ÷ 70 = 34.29 → 35 週
  r = G.estimate(300, 409, NB, NG_EXAMPLE);
  assert.equal(r.weeks, 35);
  assert.equal(r.achieved, false);
});

test("AC-02-06：c ≥ T 週數 0 且已達成，不得為負", () => {
  let r = G.estimate(100, 1000, NB, NG_EXAMPLE);
  assert.equal(r.weeks, 0);
  assert.equal(r.achieved, true);
  r = G.estimate(100, 1500, NB, NG_EXAMPLE);
  assert.equal(r.weeks, 0);
  assert.equal(r.achieved, true);
  r = G.estimate(300, 2809, NB, NG_EXAMPLE);
  assert.equal(r.weeks, 0);
  assert.equal(r.achieved, true);
  r = G.estimate(600, 9999, NB, NG_EXAMPLE);
  assert.equal(r.weeks, 0);
  assert.equal(r.achieved, true);
  // 差 1 字仍未達成
  r = G.estimate(100, 999, NB, NG_EXAMPLE);
  assert.equal(r.weeks, 1);
  assert.equal(r.achieved, false);
});

test("AC-02-09：723 → 725、722 → 720", () => {
  assert.equal(G.normalizeScore(723), 725);
  assert.equal(G.normalizeScore(722), 720);
  assert.deepEqual(G.parseScoreInput("723"), { ok: true, score: 725 });
  assert.deepEqual(G.parseScoreInput("722"), { ok: true, score: 720 });
  // 據以試算：725 為綠、720 為綠
  assert.equal(G.colorOf(G.parseScoreInput("723").score), "green");
  // 修正後仍夾在範圍內
  assert.equal(G.normalizeScore(989), 990);
  assert.equal(G.normalizeScore(11), 10);
  assert.equal(G.normalizeScore(3), 10);
  assert.equal(G.normalizeScore(2000), 990);
});

test("AC-02-10：藍金以綠色字量試算", () => {
  // S = 800、N_G = 6,000、c = 0 → 6,000 ÷ 140 = 42.86 → 43 週
  let r = G.estimate(800, 0, NB, NG_EXAMPLE);
  assert.equal(r.color, "blue");
  assert.equal(r.targetVocab, null); // 畫面顯示「待定」
  assert.equal(r.dailyNewWords, 20);
  assert.equal(r.weeks, 43);
  assert.equal(r.basedOnGreen, true);
  assert.equal(r.achieved, false);
  // 金同理
  r = G.estimate(900, 0, NB, NG_EXAMPLE);
  assert.equal(r.color, "gold");
  assert.equal(r.weeks, 43);
  assert.equal(r.basedOnGreen, true);
  // c ≥ N_G → 0 週，不得為負
  r = G.estimate(800, 6000, NB, NG_EXAMPLE);
  assert.equal(r.weeks, 0);
  r = G.estimate(800, 7000, NB, NG_EXAMPLE);
  assert.equal(r.weeks, 0);
  assert.equal(r.achieved, false); // 藍金不顯示「已達成目標字量」
});

test("AC-02-02：5、995、空白、abc 無效並回提示文字", () => {
  for (const raw of ["5", "995", "", "   ", "abc", null, undefined, "Infinity", "NaN"]) {
    const r = G.parseScoreInput(raw);
    assert.equal(r.ok, false, "應無效：" + JSON.stringify(raw));
    assert.equal(r.message, "請輸入 10～990 的分數");
  }
  assert.equal(G.SCORE_INVALID_MESSAGE, "請輸入 10～990 的分數");
  // 邊界值有效
  assert.deepEqual(G.parseScoreInput("10"), { ok: true, score: 10 });
  assert.deepEqual(G.parseScoreInput(" 990 "), { ok: true, score: 990 });
  assert.deepEqual(G.parseScoreInput(600), { ok: true, score: 600 });
});

test("R2-2（§7.1 v0.2）：非十進位寫法的字串一律無效", () => {
  const invalid = [
    "1e2", "0x64", "+700", "-5", "７００", "1,000",
    "0o144", "0b1", "-Infinity", "700.", ".5", "7 00", "700abc",
  ];
  for (const raw of invalid) {
    const r = G.parseScoreInput(raw);
    assert.equal(r.ok, false, "應無效：" + JSON.stringify(raw));
    assert.equal(r.message, "請輸入 10～990 的分數");
  }
  // 數字型別：非有限數或超出範圍無效
  for (const raw of [NaN, Infinity, -Infinity, 5, 995]) {
    assert.equal(G.parseScoreInput(raw).ok, false, "應無效：" + String(raw));
  }
});

test("R2-2（§7.1 v0.2）：十進位字串與數字有效並修正", () => {
  assert.deepEqual(G.parseScoreInput(" 723 "), { ok: true, score: 725 });
  assert.deepEqual(G.parseScoreInput("722.5"), { ok: true, score: 725 });
  assert.deepEqual(G.parseScoreInput(700), { ok: true, score: 700 });
  assert.deepEqual(G.parseScoreInput("0700"), { ok: true, score: 700 });
  assert.deepEqual(G.parseScoreInput(722.5), { ok: true, score: 725 });
});

test("AC-01-05：300 點綠 → 470；500 點綠 → 500", () => {
  assert.equal(G.scoreAfterColorClick(300, "green"), 470);
  assert.equal(G.scoreAfterColorClick(500, "green"), 500);
});

test("AC-01-07：600 點藍 → 730、點金 → 860；生效色級為綠", () => {
  const blue = G.scoreAfterColorClick(600, "blue");
  assert.equal(blue, 730);
  assert.equal(G.colorOf(blue), "blue");
  assert.equal(G.effectiveColorOf(G.colorOf(blue)), "green");
  const gold = G.scoreAfterColorClick(600, "gold");
  assert.equal(gold, 860);
  assert.equal(G.effectiveColorOf(G.colorOf(gold)), "green");
});

test("AC-01-06：分數 300 對應棕，開放色級的生效色級不變換", () => {
  assert.equal(G.colorOf(300), "brown");
  assert.equal(G.effectiveColorOf("orange"), "orange");
  assert.equal(G.effectiveColorOf("brown"), "brown");
  assert.equal(G.effectiveColorOf("green"), "green");
});

test("AC-01-01：targetVocab 橘 N_O、棕 nB、綠 nG、藍金 null", () => {
  assert.equal(G.targetVocab(100, NB, 5620), 1000);
  assert.equal(G.targetVocab(300, NB, 5620), 2809);
  assert.equal(G.targetVocab(600, NB, 5620), 5620);
  assert.equal(G.targetVocab(800, NB, 5620), null);
  assert.equal(G.targetVocab(900, NB, 5620), null);
});

test("資料缺漏：nB、nG 未提供時不拋例外、週數為 null", () => {
  let r = G.estimate(300, 0, undefined, undefined);
  assert.equal(r.targetVocab, null);
  assert.equal(r.weeks, null);
  assert.equal(r.achieved, false);
  r = G.estimate(800, 0, null, null);
  assert.equal(r.weeks, null);
  // 橘不依賴資料
  r = G.estimate(100, 0, undefined, undefined);
  assert.equal(r.weeks, 15);
});

// R3-1（§7.1 v0.3）：nB、nG 不是大於 0 的有限數時視為資料缺漏
function assertMissing(r, label) {
  assert.equal(r.targetVocab, null, label + "：targetVocab 應為 null");
  assert.equal(r.weeks, null, label + "：weeks 應為 null");
  assert.equal(r.achieved, false, label + "：achieved 應為 false");
}

test("R3-1：字量為 0 時棕、綠、藍、金皆視為資料缺漏", () => {
  assertMissing(G.estimate(300, 0, 0, 0), "棕 (0, 0)");
  assertMissing(G.estimate(600, 0, NB, 0), "綠 (2809, 0)");
  assertMissing(G.estimate(800, 0, 0, 0), "藍 (0, 0)");
  assertMissing(G.estimate(900, 0, 0, 0), "金 (0, 0)");
  // 已掌握字數 > 0 也不得誤判為已達成
  assertMissing(G.estimate(300, 50, 0, 0), "棕 c=50");
  assertMissing(G.estimate(600, 50, NB, 0), "綠 c=50");
  // 藍色只看 nG：nB 為 0 但 nG 有效仍可試算
  const r = G.estimate(800, 0, 0, NG_EXAMPLE);
  assert.equal(r.targetVocab, null);
  assert.equal(r.weeks, 43);
  assert.equal(r.achieved, false);
});

test("R3-1：字量為 -1、NaN、Infinity、null、字串時同樣視為資料缺漏", () => {
  for (const bad of [-1, NaN, Infinity, -Infinity, null, undefined, "2809"]) {
    const label = String(bad);
    assertMissing(G.estimate(300, 0, bad, NG_EXAMPLE), "棕 nB=" + label);
    assertMissing(G.estimate(600, 0, NB, bad), "綠 nG=" + label);
    assertMissing(G.estimate(800, 0, NB, bad), "藍 nG=" + label);
    assertMissing(G.estimate(900, 0, NB, bad), "金 nG=" + label);
    assert.equal(G.targetVocab(300, bad, NG_EXAMPLE), null, "targetVocab 棕 nB=" + label);
    assert.equal(G.targetVocab(600, NB, bad), null, "targetVocab 綠 nG=" + label);
  }
  // 綠色只看 nG：nB 無效不影響
  assert.equal(G.estimate(600, 0, -1, NG_EXAMPLE).weeks, 58);
});

test("R3-1：橘色不受 nB、nG 影響，仍以 N_O 試算", () => {
  for (const bad of [0, -1, NaN, null]) {
    const r = G.estimate(100, 0, bad, bad);
    assert.equal(r.targetVocab, 1000);
    assert.equal(r.weeks, 15);
    assert.equal(r.achieved, false);
    assert.equal(G.estimate(100, 1000, bad, bad).achieved, true);
    assert.equal(G.targetVocab(100, bad, bad), 1000);
  }
});

// ── 載入方式 ─────────────────────────────────────────────────────

test("瀏覽器載入：三檔依序執行後掛到 EMT.core", () => {
  const sandbox = { self: {} };
  vm.createContext(sandbox);
  for (const f of ["constants.js", "wordkey.js", "goal.js"]) {
    const src = fs.readFileSync(path.join(__dirname, "..", "core", f), "utf8");
    vm.runInContext(src, sandbox, { filename: f });
  }
  const core = sandbox.self.EMT.core;
  assert.equal(core.constants.SCORE_DEFAULT, 600);
  assert.equal(core.wordkey.wordKey(" ABC "), "abc");
  assert.equal(core.goal.estimate(800, 0, NB, NG_EXAMPLE).weeks, 43);
  assert.equal(core.goal.scoreAfterColorClick(300, "green"), 470);
});
