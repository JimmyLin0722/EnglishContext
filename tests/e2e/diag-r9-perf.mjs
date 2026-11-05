// 診斷（第 9 輪，AC-22-01、§2.3）：v1.2.0（git 25e3c3f）與 1.3.0 的 A/B 交錯，4 倍降速（一般速度也量）。
// 回報全部頁面的中位數、p90、最大值與樣本數，不只挑模擬測驗頁。
// 用法：QA_V120=<v1.2.0 html> node tests/e2e/diag-r9-perf.mjs [輪數，預設 16] [降速，預設 4]
// 每輪 4 個組合各開 1 個瀏覽器（先後交替）；狀態相同（綠、K = 1）；idle = 題號指向未作答題；locked = 題號指向曾答對題。
// 先以一般速度切過各頁暖機，再於設定的降速下依序切換，量「點導覽 → 下一個畫格繪製」。
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { launch, sleep, FILE_URL, ROOT } from "./lib/cdp.mjs";
import { stateRecord, KEY } from "./lib/state.mjs";

const N = Number(process.argv[2] || 16); const RATE = Number(process.argv[3] || 4); const REP = 3;
const TMP = process.env.QA_TMP || path.join(ROOT, "tests/results/tmp"); fs.mkdirSync(TMP, { recursive: true });
const V12 = process.env.QA_V120 || path.join(TMP, "v1.2.0.html");
if (!fs.existsSync(V12)) fs.writeFileSync(V12, execFileSync("git", ["show", "25e3c3f:dist/english-master-track.html"], { cwd: ROOT, maxBuffer: 64 << 20 }));
const OLD = pathToFileURL(V12).href;
const TABS = ["customizer", "flashcards", "part5", "dashboard"];
const measure = (tab) => `(async () => { const paint = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0))); const b = document.querySelector('#app-nav [data-tab="${tab}"]'); const t0 = performance.now(); b.click(); await paint(); return +(performance.now() - t0).toFixed(1); })()`;
const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const pct = (a, q) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.ceil(q * s.length) - 1)]; };
const SERIES = { "v1.2.0-idle": [OLD, 3], "v1.3.0-idle": [FILE_URL, 3], "v1.2.0-locked": [OLD, 0], "v1.3.0-locked": [FILE_URL, 0] };
const res = {}; for (const k of Object.keys(SERIES)) { res[k] = {}; for (const t of TABS) res[k][t] = []; }
async function one(key) {
  const [url, idx] = SERIES[key];
  let p = null; for (let tries = 0; tries < 3 && !p; tries++) { try { p = await launch(); } catch (e) { console.log("瀏覽器啟動失敗，重試：" + e.message); await sleep(3000); } } // 第 9 輪曾 1 次「無法連線瀏覽器 DevTools」
  if (!p) throw new Error("瀏覽器連續 3 次啟動失敗"); p.autoStart = false;
  await p.viewport(1366, 900, false); await p.goto(url);
  const rec = stateRecord(725, { part5: { currentIndex: idx, lockedSelection: null, phase: "question", roundAnswered: 0, roundCorrect: 0, totalAnswered: 1, totalCorrect: 1 }, part5CorrectIds: ["p5-001"], sttNoticeAcknowledged: true });
  await p.ev(`localStorage.setItem(${JSON.stringify(KEY)}, ${JSON.stringify(JSON.stringify(rec))})`); await p.goto(url);
  for (const t of [...TABS, ...TABS]) { await p.ev(measure(t)); await sleep(60); }
  await p.send("Emulation.setCPUThrottlingRate", { rate: RATE });
  for (let r = 0; r < REP; r++) for (const t of TABS) { res[key][t].push(await p.ev(measure(t))); await sleep(120); }
  await p.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  await p.close();
}
const keys = Object.keys(SERIES);
for (let i = 0; i < N; i++) { const order = i % 2 ? [...keys].reverse() : keys; for (const k of order) await one(k); console.log(`第 ${i + 1}/${N} 輪完成`); }
const stat = (a) => ({ median: median(a), p90: pct(a, 0.9), max: Math.max(...a), n: a.length, over100: a.filter((x) => x > 100).length });
const out = {}; for (const k of keys) { out[k] = {}; const all = []; for (const t of TABS) { out[k][t] = stat(res[k][t]); all.push(...res[k][t]); } out[k].all = stat(all); }
console.log(JSON.stringify(out, null, 1));
const f = path.join(ROOT, `tests/results/diag/r9-perf-ab-${RATE}x.json`); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify({ rate: RATE, rounds: N, out, raw: res }));
