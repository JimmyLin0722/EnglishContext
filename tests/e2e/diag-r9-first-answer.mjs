// 診斷（第 9 輪，AC-45-01、AC-51-03）：4 倍降速下「本次載入後第 1 次作答」的反應時間，v1.2.0 與 1.3.0 比對（無廣告）。
// 用法：QA_V120=<v1.2.0 html> node tests/e2e/diag-r9-first-answer.mjs [輪數，預設 16]
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { launch, sleep, FILE_URL, ROOT } from "./lib/cdp.mjs";
import { stateRecord, KEY } from "./lib/state.mjs";

const N = Number(process.argv[2] || 16);
const OLD = pathToFileURL(process.env.QA_V120 || path.join(process.env.QA_TMP || "", "v1.2.0.html")).href;
const SERIES = { "v1.2.0": OLD, "v1.3.0": FILE_URL };
const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const pct = (a, q) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.ceil(q * s.length) - 1)]; };
const res = { "v1.2.0": { first: [], later: [] }, "v1.3.0": { first: [], later: [] } };
const measure = (c) => `(async () => { const paint = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0))); const b = document.querySelector('#view-part5 [data-p5=option][data-index="${c}"]'); const t0 = performance.now(); b.click(); await paint(); return +(performance.now() - t0).toFixed(1); })()`;
async function one(ver) {
  const url = SERIES[ver]; let p = null; for (let t = 0; t < 3 && !p; t++) { try { p = await launch(); } catch { await sleep(3000); } } if (!p) throw new Error("瀏覽器啟動失敗");
  p.autoStart = false; await p.viewport(1366, 900, false); await p.goto(url);
  const rec = stateRecord(725, { part5: { currentIndex: 10, lockedSelection: null, phase: "question", roundAnswered: 0, roundCorrect: 0, totalAnswered: 1, totalCorrect: 1 }, part5CorrectIds: ["p5-001"], sttNoticeAcknowledged: true });
  await p.ev(`localStorage.setItem(${JSON.stringify(KEY)}, ${JSON.stringify(JSON.stringify(rec))})`); await p.goto(url);
  await p.ev(`EMT.router.go("part5")`); await sleep(120); await p.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  for (let i = 0; i < 5; i++) { const idx = await p.ev(`Number(document.querySelector(".p5-question").dataset.index)`); const c = await p.ev(`PART5_QUESTION_BANK[${idx}].correctIndex`); const ms = await p.ev(measure(c)); (i === 0 ? res[ver].first : res[ver].later).push(ms); await sleep(120); await p.ev(`document.querySelector("#view-part5 [data-p5=next]").click()`); await sleep(120); }
  await p.send("Emulation.setCPUThrottlingRate", { rate: 1 }); await p.close();
}
for (let i = 0; i < N; i++) { for (const v of i % 2 ? ["v1.3.0", "v1.2.0"] : ["v1.2.0", "v1.3.0"]) await one(v); console.log(`第 ${i + 1}/${N} 輪完成`); }
const stat = (a) => ({ median: median(a), p90: pct(a, 0.9), max: Math.max(...a), n: a.length, over100: a.filter((x) => x > 100).length });
const out = {}; for (const v of Object.keys(res)) out[v] = { first: stat(res[v].first), later: stat(res[v].later) };
console.log(JSON.stringify(out));
fs.writeFileSync(path.join(ROOT, "tests/results/diag/r9-first-answer.json"), JSON.stringify({ rounds: N, out, raw: res }));
