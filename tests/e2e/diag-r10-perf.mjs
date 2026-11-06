// 診斷（第 10 輪，AC-22-01、AC-22-03、AC-58-01；test-plan §2.3）：1.3.0（git a358556）與 1.3.1 的 A/B 交錯，一般速度與 4 倍降速。
// 每輪 2 個版本各開 1 個瀏覽器（奇數輪先 1.3.0、偶數輪先 1.3.1），同一狀態（綠、STT 說明已讀、cs 範本）。每個瀏覽器先以一般速度暖機，
// 再依序量一般速度、4 倍降速。量測項目（ms，點擊或事件 → 下一個畫格）：
//   nav-<頁>：點導覽（4 頁 × 3 次）；next：單字卡「下一張」（5 次）；mic：按麥克風到按鈕狀態改變（5 次，不含本次載入第 1 次）；
//   mic-first：本次載入第 1 次按麥克風（每瀏覽器 1 次，只在一般速度量）；stt：onresult → 分數徽章繪製（5 次）。
// 用法：QA_V130=<1.3.0 html> node tests/e2e/diag-r10-perf.mjs [輪數，預設 16] [輸出前綴，預設 r10]；輸出 tests/results/diag/<前綴>-perf-ab.json（含全部原始數字）與 <前綴>-perf-raw.txt。
// 第 11 輪：mic、mic-first 改為「click 前登錄 rAF」量法（見 mic 定義）；版本標籤 1.3.1 指目前 dist（第 11 輪為 BUILD_ID 5f0dc11a7433624d）。
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { launch, sleep, FILE_URL, ROOT } from "./lib/cdp.mjs";
import { TOAST_RECORDER, fakeTts, fakeStt, fakeMic } from "./lib/inits.mjs";
import { stateRecord, KEY } from "./lib/state.mjs";

const N = Number(process.argv[2] || 16); const PFX = process.argv[3] || "r10";
const TMP = process.env.QA_TMP || path.join(ROOT, "tests/results/tmp"); fs.mkdirSync(TMP, { recursive: true });
const V130 = process.env.QA_V130 || path.join(TMP, "v1.3.0.html");
if (!fs.existsSync(V130)) fs.writeFileSync(V130, execFileSync("git", ["show", "a358556:dist/english-master-track.html"], { cwd: ROOT, maxBuffer: 64 << 20 }));
const VERS = { "1.3.0": pathToFileURL(V130).href, "1.3.1": FILE_URL };
const TABS = ["customizer", "flashcards", "part5", "dashboard"];
const PAINT = `new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)))`;
const nav = (tab) => `(async () => { const b = document.querySelector('#app-nav [data-tab="${tab}"]'); const t0 = performance.now(); b.click(); await ${PAINT}; return +(performance.now() - t0).toFixed(1); })()`;
const next = `(async () => { const b = document.querySelector(".fc-next"); const t0 = performance.now(); b.click(); await ${PAINT}; return +(performance.now() - t0).toFixed(1); })()`;
// 第 11 輪（PG 回饋 (a)、architecture v0.16 §7.28.6）：量測 rAF 在 click 之前登錄；按鈕狀態在處理器內就改變時，以該 rAF → setTimeout(0) 的時間為畫出時間。
// 若在 click 之後才登錄，產品在 click 內登錄的 rAF 先排入 setTimeout(0)，延後的 acquire（new AudioContext 約 110 ms）會被誤算進來。
// 狀態不是同步改變（1.3.0 要等取得麥克風才變）時沿用輪詢 + 之後的畫格。不使用 Event Timing（PG 回饋 (b)）。
const mic = `(async () => { const b = document.querySelector(".fc-front .sp-mic"); const s0 = b.dataset.status; const painted = new Promise((r) => requestAnimationFrame(() => setTimeout(() => r(performance.now()), 0)));
  const t0 = performance.now(); b.click(); if (b.dataset.status !== s0) return +((await painted) - t0).toFixed(1);
  for (;;) { if (b.dataset.status !== s0) break; if (performance.now() - t0 > 3000) return -1; await new Promise((r) => setTimeout(r, 1)); } await ${PAINT}; return +(performance.now() - t0).toFixed(1); })()`;
const stt = `(async () => { const r = window.__qaStt.last; const t0 = performance.now(); r.emitResult("Latency"); await ${PAINT}; const ok = !!document.querySelector(".fc-front .sp-result:not([hidden]) .sp-result__badge"); r.emitEnd(); return ok ? +(performance.now() - t0).toFixed(1) : -1; })()`;
const raw = []; // { round, ver, rate, metric, ms }
async function waitStatus(p, s, max = 3000) { const t0 = Date.now(); while (Date.now() - t0 < max) { if ((await p.ev(`document.querySelector(".fc-front .sp-mic").dataset.status`)) === s) return true; await sleep(20); } return false; }
async function one(round, ver) {
  let p = null; for (let tries = 0; tries < 3 && !p; tries++) { try { p = await launch(); } catch (e) { console.log("瀏覽器啟動失敗，重試：" + e.message); await sleep(3000); } }
  if (!p) throw new Error("瀏覽器連續 3 次啟動失敗");
  for (const s of [TOAST_RECORDER, fakeTts("ok"), fakeStt("ok", { audioStart: true, autoAudioStartMs: 150 }), fakeMic("ok")]) await p.addInitScript(s);
  p.autoStart = false; await p.viewport(1366, 900, false); await p.goto(VERS[ver]);
  await p.ev(`localStorage.setItem(${JSON.stringify(KEY)}, ${JSON.stringify(JSON.stringify(stateRecord(725, { sttNoticeAcknowledged: true })))})`); await p.goto(VERS[ver]);
  await p.ev(`EMT.store.actions.injectTemplate("cs")`); await sleep(100);
  const push = (rate, metric, ms) => raw.push({ round, ver, rate, metric, ms });
  // 本次載入第 1 次按麥克風（一般速度）
  await p.ev(`EMT.router.go("flashcards")`); await sleep(300);
  const i = await p.ev(`EMT.store.getState().runtime.studySet.findIndex((c) => (c.word || (c.item && c.item.word)) === "Latency")`); await p.ev(`EMT.store.actions.gotoCard(${i})`); await sleep(100);
  push(1, "mic-first", await p.ev(mic)); await waitStatus(p, "listening"); await p.ev(`(() => { const r = window.__qaStt.last; r.emitResult("Latency"); r.emitEnd(); })()`); await sleep(100);
  for (const t of [...TABS, ...TABS]) { await p.ev(nav(t)); await sleep(60); } // 暖機
  for (const rate of [1, 4]) {
    await p.send("Emulation.setCPUThrottlingRate", { rate });
    for (let r = 0; r < 3; r++) for (const t of TABS) { push(rate, "nav-" + t, await p.ev(nav(t))); await sleep(120); }
    await p.ev(`EMT.router.go("flashcards")`); await sleep(300);
    for (let k = 0; k < 5; k++) { push(rate, "next", await p.ev(next)); await sleep(150); }
    await p.ev(`EMT.store.actions.gotoCard(${i})`); await sleep(150);
    for (let k = 0; k < 5; k++) {
      push(rate, "mic", await p.ev(mic));
      if (!(await waitStatus(p, "listening", 4000))) { push(rate, "stt", -1); continue; }
      await sleep(80); push(rate, "stt", await p.ev(stt)); await sleep(150);
    }
    await p.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  }
  await p.close();
}
for (let r = 1; r <= N; r++) { const order = r % 2 ? ["1.3.0", "1.3.1"] : ["1.3.1", "1.3.0"]; for (const v of order) await one(r, v); console.log(`第 ${r}/${N} 輪完成`); }

const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : +((s[m - 1] + s[m]) / 2).toFixed(1); };
const pct = (a, q) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.ceil(q * s.length) - 1)]; };
const metrics = [...new Set(raw.map((x) => x.metric))];
const summary = {};
for (const rate of [1, 4]) for (const m of metrics) for (const v of Object.keys(VERS)) {
  const a = raw.filter((x) => x.rate === rate && x.metric === m && x.ver === v).map((x) => x.ms); if (!a.length) continue;
  summary[`${rate}x|${m}|${v}`] = { n: a.length, median: median(a), p90: pct(a, 0.9), max: Math.max(...a), over100: a.filter((x) => x > 100).length, invalid: a.filter((x) => x < 0).length };
}
console.log(JSON.stringify(summary, null, 1));
const outDir = path.join(ROOT, "tests/results/diag"); fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, PFX + "-perf-ab.json"), JSON.stringify({ rounds: N, summary, raw }));
const lines = [];
for (const rate of [1, 4]) for (const m of metrics) for (const v of Object.keys(VERS)) {
  const rows = []; for (let r = 1; r <= N; r++) { const a = raw.filter((x) => x.round === r && x.rate === rate && x.metric === m && x.ver === v).map((x) => x.ms); if (a.length) rows.push(`R${r}[${a.join(",")}]`); }
  if (rows.length) lines.push(`${rate}x ${m} ${v}: ${rows.join(" ")}`);
}
fs.writeFileSync(path.join(outDir, PFX + "-perf-raw.txt"), lines.join("\n") + "\n");
