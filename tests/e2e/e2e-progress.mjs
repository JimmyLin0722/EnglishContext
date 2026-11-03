// QA E2E 套件 8（v0.8）：主控台今日學習進度（US-30）、v1 → v2 遷移（AC-30-12）、學習紀錄正規化（AC-30-13）、容量不足（AC-30-14）
// 依據：PRD v0.8 US-30、契約 v0.8 §5.3 MG-1～MG-4、§5.4 LR-1～LR-8、V-ST-09～V-ST-12；architecture v0.4 §7.7、§7.8
// 特別留意（主控指示）：FE-25／FE-30 跨午夜後「非學習 action」寫出的 todayLearned 以 today() 正規化（TC-30-07c）
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { launch, recorder, sleep, resultPath } from "./lib/cdp.mjs";
import { TOAST_RECORDER, fakeTts, fakeStt, storageMode, controllableClock, fakeMic } from "./lib/inits.mjs";
// 第 3 輪（PRD v0.9／v0.10）：主控台目標區 3 項（無目標分數）；改點卡片套用；按麥克風先取得麥克風（fakeMic）
// 第 5 輪（PRD v0.13）：主控台改版（US-39）：主環形圖中央只顯示 X（SD-FB-40）、2 個小環形圖改為 3 格數據的數字（AC-30-01、AC-30-10）、
// 近 7 天全 0 改顯示空狀態「開始學習後會顯示紀錄」（AC-30-12、AC-39-07）
async function micOn(p) { await p.click(".fc-front .sp-mic"); for (let i = 0; i < 40; i++) { if ((await p.ev(`document.querySelector(".fc-front .sp-mic").dataset.status`)) === "listening") break; await sleep(25); } }
async function applyCard(p, c) { await p.go("customizer"); await p.click(`.cz-level[data-color="${c}"]`); await p.click("#cz-apply"); await sleep(80); }

const R = recorder("e2e-progress");
const KEY = "englishMasterTrack:state";
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (s, n) => { const [y, m, d] = s.split("-").map(Number); return ymd(new Date(y, m - 1, d + n)); };
const label = (s) => { const [, m, d] = s.split("-").map(Number); return `${m}/${d}`; };
const TODAY = ymd(new Date());
const PAGES = [];

async function open(inits = [], vp = [1366, 900]) {
  const p = await launch(); PAGES.push(p);
  await p.addInitScript(TOAST_RECORDER);
  for (const s of inits) await p.addInitScript(s);
  await p.viewport(vp[0], vp[1]);
  return p;
}
const toasts = (p, n = 0) => p.ev(`window.__qaToasts.slice(${n}).map((t) => t.text)`);
const progress = (p) => p.ev(`(() => { EMT.router.go("dashboard"); const q = (s) => document.querySelector("#view-dashboard " + s);
  const ratio = (bar) => { const c = parseFloat(bar.getAttribute("stroke-dasharray")); const o = parseFloat(bar.getAttribute("stroke-dashoffset")); return Math.round((1 - o / c) * 1000) / 10; };
  const main = q(".db-ring"); const shown = (e) => !!e && !e.hidden && e.getClientRects().length > 0; const tx = (s) => (q(s) ? q(s).textContent : null);
  return { text: tx(".db-today__text"), center: tx(".db-ring__value"), done: main.classList.contains("db-ring--done"), doneText: q(".db-today__done").hidden ? "" : q(".db-today__done").textContent,
    mainRatio: ratio(main.querySelector(".db-ring__bar")), mainStroke: getComputedStyle(main.querySelector(".db-ring__bar")).stroke,
    rings: document.querySelectorAll("#view-dashboard svg.db-ring, #view-dashboard .db-mini").length,
    stats: { labels: [...document.querySelectorAll("#view-dashboard .db-stat__label")].map((e) => e.textContent).join("、"), mastery: tx(".db-stat--mastery .db-stat__value"), sub: tx(".db-stat--mastery .db-stat__sub"), accuracy: tx(".db-stat--accuracy .db-stat__value"), streak: tx(".db-stat--streak .db-stat__num") },
    chartTitle: tx("#db-chart-h"), empty: shown(q(".db-chart__empty")) ? q(".db-chart__empty").textContent : null, barsShown: shown(q(".db-bars")),
    bars: [...document.querySelectorAll("#view-dashboard .db-bars__item")].filter((b) => !b.hidden).map((b) => ({ date: b.dataset.date, label: b.querySelector(".db-bars__label").textContent, count: Number(b.querySelector(".db-bars__count").textContent), h: parseFloat(b.querySelector(".db-bars__fill").style.height) || 0 })) }; })()`);
const X = async (p) => { const r = await progress(p); const m = r.text.match(/今日已學 (\d+) \/ (\d+) 字/); return m ? Number(m[1]) : NaN; };
const stored = async (p) => JSON.parse(await p.ev(`localStorage.getItem(${JSON.stringify(KEY)})`) || "null");
const flipAt = async (p, i) => { await p.go("flashcards"); await p.ev(`EMT.store.actions.gotoCard(${i})`); await sleep(30); await p.click(".fc-flip"); await sleep(420); await p.click(".fc-flip"); await sleep(420); };
const wordKeysOfRanks = (p, from, to) => p.ev(`MASTER_VOCAB_DATABASE.slice().sort((a, b) => a.rank - b.rank).slice(${from}, ${to}).map((w) => w.word.normalize("NFC").trim().replace(/\\s+/g, " ").toLowerCase())`);
/** 以 mutate(record) 改寫目前狀態後重新載入 */
async function preset(p, mutate) {
  const rec = await stored(p);
  mutate(rec);
  await p.ev(`localStorage.setItem(${JSON.stringify(KEY)}, ${JSON.stringify(JSON.stringify(rec))})`);
  await p.reload();
}
async function fresh(p) { await p.ev(`localStorage.clear()`); await p.reload(); }

{
  const p = await open([fakeTts("ok"), fakeStt("ok"), fakeMic("ok")]);
  await p.goto();

  await R.check("TC-30-01", "AC-30-01", async () => {
    // v0.12：主環形圖 1 個；3 格數據以數字顯示（不使用小環形圖）；近 7 天無資料時為空狀態（AC-39-07）
    const r = await progress(p);
    const goal = await p.ev(`document.querySelectorAll("#view-dashboard .dash-stats--goal, #view-dashboard .dash-stat").length`);
    const ok = r.text === "今日已學 0 / 15 字" && r.rings === 1 && r.stats.labels === "連續打卡天數、單字掌握率、模擬測驗正確率" && r.stats.mastery === "0%" && r.stats.sub === "已掌握 0 字" && r.stats.accuracy === "—"
      && r.chartTitle && r.bars.length === 7 && r.bars[6].date === TODAY && r.empty === "開始學習後會顯示紀錄" && !r.barsShown && goal === 0;
    return { ok, note: `主環「${r.text}」（中央 ${r.center}）；環形圖 ${r.rings} 個；3 格 ${r.stats.labels}：${r.stats.streak}／${r.stats.mastery}（${r.stats.sub}）／${r.stats.accuracy}；圖表「${r.chartTitle}」空狀態「${r.empty}」、長條顯示=${r.barsShown}；舊目標區元素 ${goal}` };
  });

  await R.check("TC-30-02", "AC-30-02", async () => {
    const out = [];
    for (const c of ["orange", "green", "blue"]) { await applyCard(p, c); out.push(`${c}→${(await progress(p)).text}`); }
    await applyCard(p, "green");
    return { ok: out[0].endsWith("/ 10 字") && out[1].endsWith("/ 15 字") && out[2].endsWith("/ 15 字"), note: out.join("；") };
  });

  await R.check("TC-30-03", "AC-30-03、AC-17-02（學習行為）", async () => {
    await fresh(p);
    const seq = [];
    const word = (i) => p.ev(`(() => { const c = EMT.store.getState().runtime.studySet[${i}]; return c.word || (c.item && c.item.word); })()`);
    const meaningOf = (w) => p.ev(`(() => { const c = EMT.store.getState().runtime.studySet.find((x) => (x.word || (x.item && x.item.word)) === ${JSON.stringify(w)}); return (c.meaning || (c.item && c.item.meaning) || "").trim(); })()`);
    const quizAnswer = async (correct) => { await p.click(".fc-mode-btn"); await sleep(60); const q = await p.ev(`({ w: document.querySelector(".fcq-word").textContent, o: [...document.querySelectorAll(".fcq-option__text")].map((e) => e.textContent) })`); const m = await meaningOf(q.w); const ci = q.o.indexOf(m); await p.click(".fcq-option", correct ? ci : (ci + 1) % 4); await sleep(60); await p.click(".fc-mode-btn"); await sleep(60); return q.w; };
    await p.go("flashcards"); await p.ev(`EMT.store.actions.gotoCard(10)`); await sleep(40);
    await p.click(".fc-flip"); await sleep(420); seq.push(await X(p));                                 // A 翻到背面
    await p.go("flashcards"); await p.click(".fc-flip"); await sleep(420); await p.click(".fc-flip"); await sleep(420); seq.push(await X(p)); // A 翻回再翻
    await p.go("flashcards"); await p.click(".fc-flip"); await sleep(420); // 回正面再進測驗
    const qa = await quizAnswer(false); seq.push(await X(p));                                             // A 四選一答錯
    await p.go("flashcards"); await p.ev(`EMT.store.actions.gotoCard(11)`); await sleep(40); await p.click(".fc-flip"); await sleep(420); seq.push(await X(p)); // B
    await p.go("flashcards"); await p.ev(`EMT.store.actions.gotoCard(12)`); await sleep(40); await p.ev(`EMT.store.actions.acknowledgeSttNotice()`);
    const wc = await word(12); await micOn(p); await p.ev(`(() => { const r = window.__qaStt.last; r.emitResult(${JSON.stringify(wc)}); r.emitEnd(); })()`); await sleep(120); seq.push(await X(p)); // C STT
    await p.go("flashcards"); await p.ev(`EMT.store.actions.gotoCard(13)`); await sleep(40); const qe = await quizAnswer(true); seq.push(await X(p)); // E 答對
    const st = await stored(p);
    const wa = await word(10), wb = await word(11), we = await word(13);
    const ok = seq.join(",") === "1,1,1,2,3,4" && qa === wa && qe === we && st.data.todayLearned.wordKeys.length === 4 && st.data.learnedHistory[TODAY] === 4;
    return { ok, note: `X 依序 ${seq.join("、")}（A=${wa}、B=${wb}、C=${wc}、E=${we}；測驗題目 ${qa}/${qe}）；localStorage todayLearned ${JSON.stringify(st.data.todayLearned)}、歷史今天 ${st.data.learnedHistory[TODAY]}` };
  });

  await R.check("TC-30-04", "AC-30-04", async () => {
    await fresh(p);
    await p.go("flashcards");
    for (let i = 0; i < 4; i++) { await p.click(".fc-next"); await sleep(250); }
    await p.click(".fc-prev"); await sleep(250);
    await p.ev(`EMT.store.actions.acknowledgeSttNotice()`);
    const sttCases = [];
    for (const [k, fn] of [["逾時 no-speech", `r.emitError("no-speech"); r.emitEnd();`], ["空結果", `r.emitResult(""); r.emitEnd();`], ["權限 not-allowed", `r.emitError("not-allowed"); r.emitEnd();`], ["結束無結果", `r.emitEnd();`]]) {
      await micOn(p); await p.ev(`(() => { const r = window.__qaStt.last; ${fn} })()`); await sleep(120);
      sttCases.push(`${k}:${await p.ev(`(() => { const e = document.querySelector(".fc-front .sp-result"); return e && !e.hidden ? "有分數" : "無分數"; })()`)}`);
    }
    await p.send("Network.emulateNetworkConditions", { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    await p.click(".fc-front .sp-mic"); await sleep(200); sttCases.push("離線:" + (await p.ev(`EMT.store.getState().runtime.speech.status`)));
    await p.send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    await p.go("part5"); for (let i = 0; i < 3; i++) { await p.click("[data-p5=option]", 0); await p.click("[data-p5=next]"); }
    const x = await X(p); const tl = (await p.ev(`EMT.store.getState().data.todayLearned`));
    const p5 = await p.ev(`EMT.store.getState().data.part5.totalAnswered`);
    return { ok: x === 0 && (!tl.wordKeys || tl.wordKeys.length === 0) && p5 === 3, note: `瀏覽 5 次換卡未翻面、STT ${sttCases.join("、")}、模擬測驗作答 ${p5} 題 → X=${x}；todayLearned ${JSON.stringify(tl)}` };
  });

  await R.check("TC-30-05", "AC-30-05", async () => {
    const keys = await wordKeysOfRanks(p, 100, 114);
    await preset(p, (r) => { r.data.todayLearned = { date: TODAY, wordKeys: keys }; r.data.learnedHistory = { [TODAY]: 14 }; });
    const a = await progress(p);
    await flipAt(p, 200); const b = await progress(p);
    for (const i of [201, 202, 203]) await flipAt(p, i);
    const c = await progress(p);
    const gold = "rgb(201, 162, 39)";
    const ok = a.text === "今日已學 14 / 15 字" && !a.done && a.mainStroke !== gold && Math.abs(a.mainRatio - 93.3) <= 1
      && b.text === "今日已學 15 / 15 字" && b.done && b.doneText === "今日目標達成" && b.mainRatio === 100 && b.mainStroke === gold
      && c.text === "今日已學 18 / 15 字" && c.center === "18" && c.done && c.mainRatio === 100 && c.mainStroke === gold;
    return { ok, note: `X=14：「${a.text}」比例 ${a.mainRatio}%、色 ${a.mainStroke}；X=15：「${b.text}」滿圈 ${b.mainRatio}%、金色=${b.mainStroke === gold}、「${b.doneText}」；X=18：「${c.text}」中央「${c.center}」、${c.mainRatio}%、金色=${c.mainStroke === gold}` };
  });

  await R.check("TC-30-06", "AC-30-06", async () => {
    await fresh(p);
    await flipAt(p, 0); await flipAt(p, 1);
    await p.go("customizer"); await p.type("#cv-word", "qaprogressy"); await p.type("#cv-meaning", "今日已學刪除測試"); await p.click('.cv-form button[type="submit"]'); await sleep(80);
    const n = await p.ev(`EMT.store.getState().runtime.studySet.length`); await flipAt(p, n - 1);
    const a = await X(p);
    await p.go("customizer"); const idx = await p.ev(`[...document.querySelectorAll(".cv-item")].findIndex((li) => li.querySelector(".cv-item__word").textContent === "qaprogressy")`);
    await p.click(".cv-item__delete", idx); await sleep(120); if (await p.ev(`!!document.querySelector(".dialog")`)) { await p.click('.dialog [data-action="ok"]'); await sleep(150); }
    const b = await X(p); const exists = await p.ev(`EMT.store.getState().data.customVocab.some((c) => c.word === "qaprogressy")`);
    await p.reload(); const c = await X(p);
    return { ok: a === 3 && b === 3 && !exists && c === 3, note: `學過 2 個內建 + 自訂 Y → X=${a}；刪除 Y（已刪除=${!exists}）→ X=${b}；重新載入 → X=${c}` };
  });

  await R.check("TC-30-08", "AC-30-08", async () => {
    const keys = await wordKeysOfRanks(p, 0, 4);
    await preset(p, (r) => { r.data.todayLearned = { date: TODAY, wordKeys: keys }; r.data.learnedHistory = { [addDays(TODAY, -6)]: 3, [addDays(TODAY, -3)]: 10, [TODAY]: 4 }; });
    const r = await progress(p);
    const expDates = [-6, -5, -4, -3, -2, -1, 0].map((n) => addDays(TODAY, n));
    const prop = r.bars.filter((b) => b.count > 0).map((b) => Math.round((b.h / b.count) * 100) / 100);
    const ok = r.bars.map((b) => b.count).join(",") === "3,0,0,10,0,0,4" && r.bars.map((b) => b.date).join() === expDates.join() && r.bars.every((b, i) => b.label === label(expDates[i]))
      && r.bars.filter((b) => b.count === 0).every((b) => b.h === 0) && Math.max(...prop) - Math.min(...prop) <= 0.2;
    return { ok, note: `長條 ${r.bars.map((b) => `${b.label}:${b.count}(${b.h}%)`).join(" ")}；高度/字數比 ${[...new Set(prop)].join("、")}` };
  });

  await R.check("TC-30-09", "AC-30-09", async () => {
    const hist = { [addDays(TODAY, -45)]: 9, [addDays(TODAY, -30)]: 8, [addDays(TODAY, -29)]: 7, [addDays(TODAY, -10)]: 2 };
    for (let k = 1; k <= 28; k++) if (!hist[addDays(TODAY, -k)]) hist[addDays(TODAY, -k)] = 1;
    await preset(p, (r) => { r.data.todayLearned = { date: null, wordKeys: [] }; r.data.learnedHistory = hist; });
    await flipAt(p, 50);
    const x = await X(p);
    const j = JSON.parse(await p.ev(`EMT.store.actions.exportBackup().json`));
    const h = j.data.learnedHistory; const keys = Object.keys(h).sort();
    const st = (await stored(p)).data.learnedHistory;
    const ok = !(addDays(TODAY, -45) in h) && !(addDays(TODAY, -30) in h) && h[addDays(TODAY, -29)] === 7 && keys.length <= 30 && keys[0] >= addDays(TODAY, -29) && keys[keys.length - 1] === TODAY && h[TODAY] === x && x === 1
      && !(addDays(TODAY, -30) in st) && Object.keys(st).length <= 30;
    return { ok, note: `預寫 ${Object.keys(hist).length} 筆（含今天往前第 30、45 天）→ 學 1 字後匯出歷史 ${keys.length} 筆（${keys[0]}～${keys[keys.length - 1]}）、第 29 天=${h[addDays(TODAY, -29)]}、今天=${h[TODAY]}、X=${x}；localStorage 歷史 ${Object.keys(st).length} 筆` };
  });

  await R.check("TC-30-10", "AC-30-10", async () => {
    await fresh(p);
    await applyCard(p, "orange"); // 單字集 1,000
    const inSet = await wordKeysOfRanks(p, 0, 250); const outSet = await wordKeysOfRanks(p, 2000, 2010);
    await preset(p, (r) => { const k = [...inSet, ...outSet]; r.data.masteredWordKeys = k; r.data.vocabQuiz = { answered: k.length, correct: k.length }; });
    await p.go("part5");
    for (let i = 0; i < 10; i++) { const ci = await p.ev(`PART5_QUESTION_BANK[${i}].correctIndex`); await p.click("[data-p5=option]", i < 7 ? ci : (ci + 1) % 4); await p.click("[data-p5=next]"); }
    const r = await progress(p); const n = await p.ev(`EMT.store.getState().runtime.studySet.length`);
    const s = r.stats; // v0.12：3 格數據（AC-30-10：掌握率 = 集內 ÷ 單字集；小字「已掌握 N 字」含集外）
    const ok = n === 1000 && s.mastery === "25%" && s.sub === "已掌握 260 字" && s.accuracy === "70%" && r.rings === 1 && !/NaN|Infinity/.test(JSON.stringify(r));
    return { ok, note: `單字集 ${n} 字、已掌握 260（集內 250、集外 10）→ 單字掌握率「${s.mastery}」、小字「${s.sub}」；模擬測驗 10 題對 7 → 正確率「${s.accuracy}」；環形圖 ${r.rings} 個（只有主環）。PRD 範例為 200 字/50 字，正式資料最小單字集為 1,000，故以同比例 250/1,000 驗證` };
  });

  await R.check("TC-30-11", "AC-30-11", async () => {
    await fresh(p);
    for (let i = 0; i < 6; i++) await flipAt(p, 300 + i);
    const a = await progress(p);
    await p.reload(); const b = await progress(p);
    await flipAt(p, 302); const c = await progress(p);
    const ok = a.text.startsWith("今日已學 6 /") && JSON.stringify(a.bars) === JSON.stringify(b.bars) && a.text === b.text && c.text === a.text;
    return { ok, note: `重新載入前「${a.text}」長條 ${a.bars.map((x) => x.count).join(",")}；重新載入後「${b.text}」長條相同=${JSON.stringify(a.bars) === JSON.stringify(b.bars)}；再翻已學過的字 →「${c.text}」` };
  });

  await R.check("TC-30-12", "AC-30-12、MG-3", async () => {
    await fresh(p);
    await applyCard(p, "brown");
    await p.type("#cv-word", "qamigrate"); await p.type("#cv-meaning", "遷移"); await p.click('.cv-form button[type="submit"]'); await sleep(80);
    await p.go("part5"); await p.click("[data-p5=option]", 0); await p.click("[data-p5=next]");
    await flipAt(p, 3); await p.ev(`EMT.store.actions.acknowledgeSttNotice()`);
    const before = (await stored(p)).data;
    const t0 = (await toasts(p)).length;
    await preset(p, (r) => { r.schemaVersion = 1; delete r.data.todayLearned; delete r.data.learnedHistory; });
    const entry = await p.ev(`document.body.dataset.entry`); const tab = await p.ev(`EMT.router.current()`);
    const t = await toasts(p); const d = await p.ev(`EMT.store.getState().data`); const r = await progress(p); const st = await stored(p);
    const fields = ["goal", "customVocab", "masteredWordKeys", "vocabQuiz", "part5", "streak", "sttNoticeAcknowledged"];
    const same = fields.every((k) => JSON.stringify(d[k]) === JSON.stringify(before[k]));
    const ok = entry === "main" && tab === "dashboard" && same && !t.some((x) => x.includes("資料讀取失敗")) && r.text.startsWith("今日已學 0 /") && r.bars.every((b) => b.count === 0) && r.empty === "開始學習後會顯示紀錄" && !r.barsShown
      && st.schemaVersion === 2 && JSON.stringify(st.data.todayLearned) === JSON.stringify({ date: null, wordKeys: [] }) && JSON.stringify(st.data.learnedHistory) === "{}" && !(await p.ev(`localStorage.getItem("englishMasterTrack:unreadable")`));
    return { ok, note: `v1 狀態開啟 → ${entry}/${tab}；7 欄不變=${same}；提示 ${JSON.stringify(t)}；${r.text}、長條 ${r.bars.map((b) => b.count).join(",")}、空狀態「${r.empty}」；localStorage 已寫回 schemaVersion ${st.schemaVersion}、todayLearned ${JSON.stringify(st.data.todayLearned)}、learnedHistory ${JSON.stringify(st.data.learnedHistory)}（t0=${t0}）` };
  });

  await R.check("TC-30-13", "AC-30-13、RD-1、V-ST-09～V-ST-11", async () => {
    const out = []; let ok = true;
    // (1) 歷史項目無效 + 今日紀錄為昨天
    await preset(p, (r) => { r.data.todayLearned = { date: addDays(TODAY, -1), wordKeys: ["the"] };
      r.data.learnedHistory = { "2026-13-40": 3, yesterday: 2, [addDays(TODAY, -1)]: -1, [addDays(TODAY, -2)]: 1.5, [addDays(TODAY, 1)]: 4, [addDays(TODAY, -3)]: 5, [addDays(TODAY, -4)]: "2" }; });
    let r = await progress(p); let t = await toasts(p); const g1 = await p.ev(`EMT.store.getState().data.goal.appliedScore`);
    let good = r.text.startsWith("今日已學 0 /") && r.bars.map((b) => b.count).join(",") === "0,0,0,5,0,0,0" && !t.some((x) => x.includes("資料讀取失敗")) && g1 === 465;
    await flipAt(p, 7); const st = (await stored(p)).data;
    good = good && (await X(p)) === 1 && JSON.stringify(Object.keys(st.learnedHistory).sort()) === JSON.stringify([addDays(TODAY, -3), TODAY].sort()) && st.todayLearned.date === TODAY;
    ok = ok && good; out.push(`(1) 無效歷史 + 昨天的今日紀錄：${r.text}、長條 ${r.bars.map((b) => b.count).join(",")}、提示 ${JSON.stringify(t)}、目標 ${g1}；學 1 字後寫出歷史 ${JSON.stringify(st.learnedHistory)}`);
    // (2) 今日清單重複與未正規化
    await preset(p, (r2) => { r2.data.todayLearned = { date: TODAY, wordKeys: ["the", "The", " the ", "of", 5, ""] }; r2.data.learnedHistory = { [TODAY]: 6 }; });
    r = await progress(p); good = r.text.startsWith("今日已學 2 /") && r.bars[6].count === 2; ok = ok && good; out.push(`(2) 重複單字：${r.text}、今天長條 ${r.bars[6].count}`);
    // (3) 今日紀錄為未來日期（時鐘調回）
    await preset(p, (r3) => { r3.data.todayLearned = { date: addDays(TODAY, 2), wordKeys: ["the", "of", "and"] }; r3.data.learnedHistory = { [addDays(TODAY, 2)]: 3 }; });
    r = await progress(p); good = r.text.startsWith("今日已學 0 /") && r.bars.every((b) => b.count === 0); ok = ok && good; out.push(`(3) 未來日期：${r.text}、長條 ${r.bars.map((b) => b.count).join(",")}`);
    // (4) 整個欄位型別錯誤：只重設該欄位
    const n0 = (await toasts(p)).length;
    await preset(p, (r4) => { r4.data.todayLearned = "abc"; r4.data.learnedHistory = [1, 2]; });
    r = await progress(p); t = await toasts(p); const d = await p.ev(`EMT.store.getState().data`); const entry = await p.ev(`document.body.dataset.entry`);
    good = r.text.startsWith("今日已學 0 /") && d.goal.appliedScore === 465 && d.customVocab.some((c) => c.word === "qamigrate") && !t.some((x) => x.includes("資料讀取失敗")) && entry === "main" && !(await p.ev(`localStorage.getItem("englishMasterTrack:unreadable")`));
    ok = ok && good; out.push(`(4) 欄位型別錯誤：${r.text}、目標 ${d.goal.appliedScore}、自訂字保留=${d.customVocab.some((c) => c.word === "qamigrate")}、提示 ${JSON.stringify(t.slice(n0))}、${entry}`);
    return { ok: ok && p.log.exceptions.length === 0, note: out.join("；") };
  });

  await R.check("TC-X-progress", "（全套件）無未處理例外", async () => ({ ok: p.log.exceptions.length === 0, note: JSON.stringify(p.log.exceptions).slice(0, 400) }));
  await p.close();
}

// ═════════ AC-30-07：跨午夜（可調時鐘） ═════════
{
  const T = "2026-10-30", T1 = "2026-10-31", T2 = "2026-11-01";
  const p = await open([controllableClock(`${T}T23:58:00`)]);
  await p.goto();
  await R.check("TC-30-07", "AC-30-07、E-49", async () => {
    for (let i = 0; i < 5; i++) await flipAt(p, 400 + i);
    const a = await progress(p);
    // (a) 跨過午夜後學一個字
    await p.ev(`window.__qaSetClock("${T1}T00:00:20")`);
    await p.go("flashcards"); await flipAt(p, 500);
    const b = await progress(p); const stA = (await stored(p)).data;
    // (b) 再跨一次午夜，不做學習行為：切到其他功能區再回到主控台
    await p.ev(`window.__qaSetClock("${T2}T00:00:20")`);
    await p.go("part5"); await sleep(100); await p.go("dashboard"); await sleep(100);
    const c = await progress(p);
    const okA = a.text.startsWith("今日已學 5 /") && b.text.startsWith("今日已學 1 /") && b.bars[6].date === T1 && b.bars[6].count === 1 && b.bars[5].date === T && b.bars[5].count === 5
      && stA.todayLearned.date === T1 && stA.learnedHistory[T] === 5 && stA.learnedHistory[T1] === 1;
    const okB = c.text.startsWith("今日已學 0 /") && c.bars[6].date === T2 && c.bars[6].count === 0 && c.bars[5].count === 1 && c.bars[4].count === 5;
    return { ok: okA && okB, note: `第 T 天「${a.text}」；(a) 過午夜學 1 字 →「${b.text}」、長條末兩根 ${b.bars.slice(5).map((x) => x.label + ":" + x.count).join(" ")}、寫出 todayLearned.date=${stA.todayLearned.date}；(b) 再過午夜、不學習、切頁回主控台 →「${c.text}」、長條末三根 ${c.bars.slice(4).map((x) => x.label + ":" + x.count).join(" ")}` };
  });
  await R.check("TC-30-07c", "AC-30-07、AC-30-13（FE-25／FE-30 跨午夜非學習寫入的正規化）", async () => {
    // 此時時鐘在 T2，記憶體 todayLearned 仍為 T1（尚未有學習事件換日）；以「非學習 action」觸發寫入
    const mem = await p.ev(`EMT.store.getState().data.todayLearned.date`);
    const out = []; let ok = true;
    for (const [k, fn] of [["點藍卡並套用（生效色級不變，無確認視窗）", async () => { await applyCard(p, "blue"); }], ["模擬測驗作答", async () => { await p.go("part5"); await p.click("[data-p5=option]", 0); }], ["注入範本", async () => { await p.go("customizer"); await p.click('[data-template="cs"]'); await sleep(100); }]]) {
      const saved0 = (await stored(p)).savedAt;
      await fn(); await sleep(80);
      const rec = await stored(p); const st = rec.data; const wrote = rec.savedAt !== saved0;
      const good = wrote && st.todayLearned.date !== T1 && (st.todayLearned.date === null || (st.todayLearned.date === T2 && st.todayLearned.wordKeys.length === 0)) && st.learnedHistory[T1] === 1 && st.learnedHistory[T] === 5 && !st.learnedHistory[T2];
      ok = ok && good; out.push(`${k} → ${wrote ? "有寫入" : "未寫入（savedAt 不變）"}、localStorage todayLearned ${JSON.stringify(st.todayLearned)}、歷史 ${JSON.stringify(st.learnedHistory)}`);
    }
    await p.reload(); const r = await progress(p);
    ok = ok && r.text.startsWith("今日已學 0 /") && r.bars[5].count === 1 && r.bars[4].count === 5;
    return { ok, note: `跨午夜前記憶體日期 ${mem}；${out.join("；")}；重新載入 →「${r.text}」、長條 ${r.bars.map((b) => b.count).join(",")}` };
  });
  await R.check("TC-X-clock", "（時鐘套件）無未處理例外", async () => ({ ok: p.log.exceptions.length === 0, note: JSON.stringify(p.log.exceptions).slice(0, 400) }));
  await p.close();
}

// ═════════ AC-30-14：學習紀錄寫入容量不足 ═════════
{
  const p = await open([storageMode("quota")]);
  await p.goto();
  await p.ev(`window.__qaQuota = false`);
  await R.check("TC-30-14", "AC-30-14、LR-7", async () => {
    await flipAt(p, 0);
    const before = await p.ev(`localStorage.getItem(${JSON.stringify(KEY)})`);
    const n = (await toasts(p)).length;
    await p.ev(`window.__qaQuota = true`);
    await flipAt(p, 1); const a = await X(p); const t1 = await toasts(p, n);
    await flipAt(p, 2); const b = await X(p); const t2 = await toasts(p, n);
    const after = await p.ev(`localStorage.getItem(${JSON.stringify(KEY)})`);
    await p.ev(`window.__qaQuota = false`);
    const q1 = t1.filter((x) => x === "儲存空間不足").length, q2 = t2.filter((x) => x === "儲存空間不足").length;
    return { ok: a === 2 && b === 3 && q1 === 1 && q2 === 1 && before === after && JSON.parse(after).data.todayLearned.wordKeys.length === 1, note: `容量不足時學新字：X ${a} → ${b}；提示 ${JSON.stringify(t2)}（「儲存空間不足」第 1 次後 ${q1} 則、第 2 次後 ${q2} 則）；localStorage 不變=${before === after}` };
  });
  await p.close();
}

// ═════════ AC-30-10：單字集為空、答題數 0（無內建資料 fixture） ═════════
const FIX = process.env.QA_FIXTURE_NODATA;
if (FIX && fs.existsSync(FIX)) {
  const p = await open();
  await p.goto(pathToFileURL(FIX).href);
  await R.check("TC-30-10b", "AC-30-10、E-48", async () => {
    const r = await progress(p);
    const ok = r.stats.mastery === "—" && r.stats.accuracy === "—" && !/NaN|Infinity|undefined/.test(JSON.stringify(r)) && r.text === "今日已學 0 / 15 字";
    return { ok, note: `單字集 0、答題 0：單字掌握率「${r.stats.mastery}」（${r.stats.sub}）、模擬測驗正確率「${r.stats.accuracy}」；主環「${r.text}」` };
  });
  await p.close();
} else {
  R.fail("TC-30-10b", "AC-30-10", "未提供 QA_FIXTURE_NODATA，無法執行");
}

R.save(resultPath("e2e-progress"));
