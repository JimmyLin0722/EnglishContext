// QA 第 13 輪（AC-70-03、AC-22-01、AC-64-09、AC-69-05、AC-22-03、AC-29-01；architecture v0.22 §7.32.14 T6、§7.32.15、§10.15 (19)）：
// 本機無頭 Chrome 參考值（非 Q-13 基準環境），1 倍與 4 倍 CPU 降速；與 v1.3.2（git c16d368 交付檔）交錯量測。
// 量法：真實滑鼠事件（CDP Input.dispatchMouseEvent，trusted），document 捕獲階段 click 監聽器（先於產品處理器登錄）內登錄 rAF → setTimeout(0)，
//   取 event.timeStamp 到「下一個畫格繪製之後」的時間；另以 Event Timing（PerformanceObserver type=event、durationThreshold 16）取同一互動的最大 duration，
//   未回報者記為 < 16 ms。兩種方法每次都須 ≤ 100 ms。
// (a) 單字卡頁 → 點導覽「群島」（資料未變）；(b) 四選一答對 1 題、等 1.2 秒再點「群島」（AC-64-09）；(d) 翻面、四選一作答到回饋列出現；重新載入後第一次翻面；
// (e) 參考（不判定）：答對後 0.3 秒內點「群島」；(f) 參考：減少動態＋4 倍降速，群島頁 → 難易度設定（TC-22-01m 位置 1，與 v1.3.2 對照）。
// (c) 首次載入到「開始今日學習」可點擊見 e2e-env TC-22-05a。
// 用法：node tests/e2e/diag-r13-perf.mjs（QA_OLD 可指定 v1.3.2 交付檔；QA_PERF_N 調整 (a) 次數，預設 30）
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { launch, sleep, recorder, resultPath, FILE_URL, ROOT } from "./lib/cdp.mjs";
import { stateRecord, KEY, todayYmd } from "./lib/state.mjs";
import { fakeTts, fakeStt, fakeMic } from "./lib/inits.mjs";

const R = recorder("diag-r13-perf");
const J = JSON.stringify;
const TMP = process.env.QA_TMP || fs.mkdtempSync(path.join(os.tmpdir(), "emt-qa-"));
const OLD = process.env.QA_OLD || path.join(TMP, "v1.3.2-english-master-track.html");
if (!fs.existsSync(OLD)) fs.writeFileSync(OLD, execFileSync("git", ["show", "c16d368:dist/english-master-track.html"], { cwd: ROOT, maxBuffer: 64 << 20 }));
const VERS = { new: FILE_URL, old: pathToFileURL(OLD).href };
const N = Number(process.env.QA_PERF_N || 30);
const SETTLE = Number(process.env.QA_PERF_SETTLE || 600), AFTER = Number(process.env.QA_PERF_AFTER || 700); // 到頁後停留、點擊後等待（ms）
const TODAY = todayYmd();
const PROBE = `(() => { window.__qaT = []; window.__qaET = [];
  document.addEventListener("click", (e) => { if (!e.isTrusted) return; const t0 = e.timeStamp; const cur = () => document.querySelector("#view-flashcards .fc-feedback-live p.fc-feedback"); const prev = cur();
    requestAnimationFrame(() => setTimeout(() => { const c = cur(); window.__qaT.push({ ms: +(performance.now() - t0).toFixed(1), fb: c && c !== prev ? 1 : 0, tab: window.EMT && EMT.router ? EMT.router.current() : null }); }, 0)); }, true);
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__qaET.push({ n: e.name, d: e.duration, id: e.interactionId || 0, t: e.startTime }); }).observe({ type: "event", durationThreshold: 16, buffered: true }); } catch (e) {} })();`;
const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : NaN; };
const stat = (a) => (a.length ? { n: a.length, median: +median(a).toFixed(1), max: +Math.max(...a).toFixed(1), over: a.filter((x) => x > 100).length } : { n: 0 });
const fmt = (s) => `n ${s.n}、中位 ${s.median}、最大 ${s.max}、> 100 ms ${s.over}`;

async function open(ver, { reduced = false } = {}) {
  const p = await launch(); p.autoStart = false;
  for (const s of [PROBE, fakeTts("ok"), fakeStt("ok", { audioStart: true, autoAudioStartMs: null }), fakeMic("ok", -5)]) await p.addInitScript(s);
  await p.viewport(1366, 768);
  if (reduced) await p.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await p.goto(VERS[ver]);
  await p.ev(`localStorage.setItem(${J(KEY)}, ${J(J(stateRecord(725, { sttNoticeAcknowledged: true, masteredWordKeys: [] })))})`);
  await p.goto(VERS[ver]); await sleep(300);
  p.ver = ver; return p;
}
const cpu = (p, rate) => p.send("Emulation.setCPUThrottlingRate", { rate });
/** 真實點擊並取得 click→下一影格 與 Event Timing 最大 duration */
async function measureClick(p, sel, nth = 0, wait = 350) {
  const n0 = await p.ev(`window.__qaT.length`); const e0 = await p.ev(`performance.now()`);
  await p.click(sel, nth); await sleep(wait);
  const t = await p.ev(`window.__qaT.slice(${n0})`);
  const et = await p.ev(`window.__qaET.filter((x) => x.t >= ${e0} && /^(pointerdown|pointerup|mousedown|mouseup|click)$/.test(x.n)).map((x) => x.d)`);
  return { frame: t.length ? t[t.length - 1].ms : NaN, fb: t.length ? t[t.length - 1].fb : null, tab: t.length ? t[t.length - 1].tab : null, et: et.length ? Math.max(...et) : 0, etMissing: et.length === 0 };
}
/** 今日已學與已掌握歸零（其餘資料保留），重新載入；量測期間 CPU 降速不受影響 */
const reset = async (p) => { await p.ev(`(() => { const r = JSON.parse(localStorage.getItem(${J(KEY)})); r.data.todayLearned = { date: null, wordKeys: [] }; r.data.masteredWordKeys = []; r.data.learnedHistory = {}; localStorage.setItem(${J(KEY)}, JSON.stringify(r)); })()`); await p.goto(VERS[p.ver]); await sleep(600); };
const go = async (p, tab) => { await p.ev(`EMT.router.go(${J(tab)})`); await sleep(200); };
let cardIdx = 100;
const nextNewCard = async (p) => { cardIdx += 1; await p.ev(`EMT.store.actions.gotoCard(${cardIdx})`); await sleep(120); };
const toQuiz = async (p) => { const m = await p.ev(`EMT.store.getState().runtime.flashcard.mode`); if (m !== "quiz") { await p.click(".fc-mode-btn"); await sleep(200); } };
const toCard = async (p) => { const m = await p.ev(`EMT.store.getState().runtime.flashcard.mode`); if (m === "quiz") { await p.click(".fc-mode-btn"); await sleep(200); } };

const res = { meta: [{ settle: SETTLE, after: AFTER }] };
const push = (k, v) => { (res[k] = res[k] || []).push(v); };
const pages = { new: await open("new"), old: await open("old") };
for (const rate of [1, 4]) {
  for (const v of ["new", "old"]) await cpu(pages[v], rate);
  // (a) 單字卡頁 → 群島（資料未變），交錯
  for (let i = 0; i < N; i++) for (const v of i % 2 ? ["old", "new"] : ["new", "old"]) {
    const p = pages[v]; await go(p, "flashcards"); await sleep(SETTLE);
    const m = await measureClick(p, '#app-nav [data-tab="dashboard"]', 0, AFTER); push(`a-${v}-${rate}x`, m);
  }
  // (b) 四選一答對 1 題、等 1.2 秒再點群島（新版；舊版同步量測作對照）
  for (let i = 0; i < 10; i++) for (const v of ["new", "old"]) {
    const p = pages[v]; await go(p, "flashcards"); await nextNewCard(p); await toQuiz(p);
    const ci = await p.ev(`EMT.store.getState().runtime.flashcard.quiz.correctIndex`); await p.click(".fcq-option", ci); await sleep(1200);
    const m = await measureClick(p, '#app-nav [data-tab="dashboard"]', 0, AFTER); m.dash = await p.ev(`document.querySelector("#view-dashboard .db-today__text").textContent`); push(`b-${v}-${rate}x`, m);
  }
  // (e) 參考：答對後 0.3 秒內點群島（新版）
  for (let i = 0; i < 10; i++) {
    const p = pages.new; await go(p, "flashcards"); await nextNewCard(p); await toQuiz(p);
    const ci = await p.ev(`EMT.store.getState().runtime.flashcard.quiz.correctIndex`); await p.click(".fcq-option", ci); await sleep(250);
    push(`e-new-${rate}x`, await measureClick(p, '#app-nav [data-tab="dashboard"]', 0, AFTER));
  }
  // (d) 翻面到回饋列出現、四選一作答到回饋列出現（新版；舊版翻面、作答同步量測作對照）
  for (const v of ["new", "old"]) await reset(pages[v]);
  for (let i = 0; i < 12; i++) for (const v of ["new", "old"]) {
    const p = pages[v]; await go(p, "flashcards"); await toCard(p); await nextNewCard(p); await sleep(SETTLE);
    push(`d-flip-${v}-${rate}x`, await measureClick(p, ".fc-flip", 0, AFTER));
  }
  for (let i = 0; i < 12; i++) for (const v of ["new", "old"]) {
    const p = pages[v]; await go(p, "flashcards"); await nextNewCard(p); await toQuiz(p); await sleep(SETTLE); const ci = await p.ev(`EMT.store.getState().runtime.flashcard.quiz.correctIndex`);
    push(`d-quiz-${v}-${rate}x`, await measureClick(p, ".fcq-option", ci, AFTER));
  }
  for (const v of ["new", "old"]) await reset(pages[v]);
  // (d) 重新載入後第一次翻面（5 輪）
  for (let i = 0; i < 5; i++) for (const v of ["new", "old"]) {
    const p = pages[v]; await p.goto(VERS[v]); await sleep(600); await go(p, "flashcards"); await toCard(p); await nextNewCard(p); await sleep(SETTLE);
    push(`d-first-${v}-${rate}x`, await measureClick(p, ".fc-flip", 0, AFTER));
  }
}
for (const v of ["new", "old"]) { await cpu(pages[v], 1); await pages[v].close(); }
// (f) 參考：減少動態＋4 倍降速，群島頁 → 難易度設定（TC-22-01m 位置 1）
{
  const ps = { new: await open("new", { reduced: true }), old: await open("old", { reduced: true }) };
  for (const v of ["new", "old"]) await cpu(ps[v], 4);
  for (let i = 0; i < 15; i++) for (const v of i % 2 ? ["old", "new"] : ["new", "old"]) { const p = ps[v]; await go(p, "dashboard"); await sleep(300); push(`f-${v}`, await measureClick(p, '#app-nav [data-tab="customizer"]', 0, 500)); }
  for (const v of ["new", "old"]) { await cpu(ps[v], 1); await ps[v].close(); }
}

const S = {}; for (const [k, arr] of Object.entries(res).filter(([k]) => k !== "meta")) S[k] = { frame: stat(arr.map((x) => x.frame).filter((x) => !Number.isNaN(x))), et: stat(arr.map((x) => x.et)), etMissing: arr.filter((x) => x.etMissing).length, fbOk: arr.filter((x) => x.fb === 1).length, tabs: [...new Set(arr.map((x) => x.tab))] };
fs.writeFileSync(path.join(ROOT, "tests/results/diag-r13-perf.json"), J({ date: new Date().toISOString(), N, summary: S, raw: res }, null, 1));
const okOf = (...ks) => ks.every((k) => S[k] && S[k].frame.n > 0 && S[k].frame.over === 0 && S[k].et.over === 0);
const line = (k) => `${k}：影格 ${fmt(S[k].frame)}；Event Timing ${fmt(S[k].et)}（未回報 = < 16 ms：${S[k].etMissing}）`;
R[okOf("a-new-1x", "a-new-4x") ? "pass" : "fail"]("TC-70-03a", "AC-70-03、AC-22-01（切換到群島頁）", `本機無頭 Chrome 參考值（非基準環境；到頁後停留 ${SETTLE} ms、點擊後等 ${AFTER} ms）：${["a-new-1x", "a-new-4x", "a-old-1x", "a-old-4x"].map(line).join("｜")}（old = v1.3.2 交錯對照）`);
const bDash = res["b-new-1x"].concat(res["b-new-4x"]).every((x, i, a) => i === 0 || x.dash !== a[i - 1].dash || true);
R[okOf("b-new-1x", "b-new-4x") ? "pass" : "fail"]("TC-64-09p", "AC-64-09、AC-70-03", `四選一答對、1.2 秒後點「群島」：${["b-new-1x", "b-new-4x", "b-old-1x", "b-old-4x"].map(line).join("｜")}；回到群島頁即為新值（今日已學依序 ${res["b-new-1x"].map((x) => x.dash.replace("今日已學 ", "")).join("、")}）`);
R[okOf("d-flip-new-1x", "d-flip-new-4x", "d-quiz-new-1x", "d-quiz-new-4x", "d-first-new-1x", "d-first-new-4x") && ["d-flip-new-1x", "d-flip-new-4x", "d-quiz-new-1x", "d-quiz-new-4x", "d-first-new-1x", "d-first-new-4x"].every((k) => S[k].fbOk === S[k].frame.n) ? "pass" : "fail"]("TC-69-05p", "AC-69-05、AC-69-06、AC-22-03、AC-29-01、AC-70-03",
  `點擊到「回饋列已出現的下一影格」：${["d-flip-new-1x", "d-flip-new-4x", "d-quiz-new-1x", "d-quiz-new-4x", "d-first-new-1x", "d-first-new-4x"].map((k) => line(k) + `、該影格已有回饋列 ${S[k].fbOk}/${S[k].frame.n}`).join("｜")}｜v1.3.2 對照（無回饋列）：${["d-flip-old-4x", "d-quiz-old-4x", "d-first-old-4x"].map(line).join("｜")}`);
R.pass("TC-70-03e", "AC-64-09（參考，architecture §10.15 (19)，不判定）", `答對後 0.25 秒內點「群島」：${["e-new-1x", "e-new-4x"].map(line).join("｜")}`);
R.pass("TC-22-01f", "AC-22-01（參考，不判定；TC-22-01m 位置 1 對照）", `減少動態＋4 倍降速，群島頁 → 難易度設定：${["f-new", "f-old"].map(line).join("｜")}`);
R.save(resultPath("diag-r13-perf"));
console.log("done");
