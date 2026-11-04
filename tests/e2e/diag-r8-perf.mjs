// 診斷（第 8 輪，不列入 run-all）：TC-22-01、TC-22-01m 在 v1.1.0 與 1.2.0 的 A/B 交錯比較（4 倍降速）
// 用法：QA_V110=<v1.1.0 html> node tests/e2e/diag-r8-perf.mjs [輪數，預設 8]
// 每輪每個版本各開 1 個瀏覽器（新舊交替先後），狀態相同（綠、K = 1、題號 1）；先以一般速度切過各頁暖機，再於 4 倍降速下依序切換 12 次，量「點導覽 → 下一個畫格繪製」。
// part5 兩列分開：一般題目（未作答）與已答對鎖定檢視只存在 1.2.0，所以 cur 另量題號指向曾答對題的情況（curLocked）。
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { launch, sleep, FILE_URL, ROOT } from "./lib/cdp.mjs";
import { stateRecord, KEY } from "./lib/state.mjs";

const N = Number(process.argv[2] || 8);
const OLD = pathToFileURL(process.env.QA_V110).href;
const TABS = ["customizer", "flashcards", "part5", "dashboard"];
const measure = (tab) => `(async () => { const paint = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0))); const b = document.querySelector('#app-nav [data-tab="${tab}"]'); const t0 = performance.now(); b.click(); await paint(); return +(performance.now() - t0).toFixed(1); })()`;
const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const pct = (a, q) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.ceil(q * s.length) - 1)]; };
const res = { old: {}, cur: {}, curLocked: {} };
for (const k of Object.keys(res)) for (const t of TABS) res[k][t] = [];
async function one(url, key, currentIndex) {
  const p = await launch(); p.autoStart = false;
  await p.viewport(1366, 900);
  await p.goto(url);
  const rec = stateRecord(725, { part5: { currentIndex, lockedSelection: null, phase: "question", roundAnswered: 0, roundCorrect: 0, totalAnswered: 1, totalCorrect: 1 }, part5CorrectIds: ["p5-001"], sttNoticeAcknowledged: true });
  await p.ev(`localStorage.setItem(${JSON.stringify(KEY)}, ${JSON.stringify(JSON.stringify(rec))})`);
  await p.goto(url);
  for (const t of [...TABS, ...TABS]) { await p.ev(measure(t)); await sleep(60); }
  await p.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  for (let r = 0; r < 3; r++) for (const t of TABS) { res[key][t].push(await p.ev(measure(t))); await sleep(120); }
  await p.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  await p.close();
}
for (let i = 0; i < N; i++) {
  const order = i % 2 ? [["cur", FILE_URL, 3], ["old", OLD, 3], ["curLocked", FILE_URL, 0]] : [["old", OLD, 3], ["cur", FILE_URL, 3], ["curLocked", FILE_URL, 0]];
  for (const [k, u, idx] of order) await one(u, k, idx);
  console.log(`第 ${i + 1}/${N} 輪完成`);
}
const out = {};
for (const k of Object.keys(res)) { out[k] = {}; const all = []; for (const t of TABS) { out[k][t] = { median: median(res[k][t]), p90: pct(res[k][t], 0.9), max: Math.max(...res[k][t]), n: res[k][t].length }; all.push(...res[k][t]); } out[k].all = { median: median(all), p90: pct(all, 0.9), max: Math.max(...all), n: all.length }; }
console.log(JSON.stringify(out, null, 1));
fs.mkdirSync(path.join(ROOT, "tests/results/diag"), { recursive: true }); fs.writeFileSync(path.join(ROOT, "tests/results/diag/r8-perf-ab.json"), JSON.stringify({ out, raw: res }, null, 1));
