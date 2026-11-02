// QA 診斷腳本（BUG-002 第 2 輪驗證；不列入 run-all）：確認 #customizer-custom 的位置（是否在首屏外）與延後顯示時序、自訂單字清單補齊時間
// 用法：node tests/e2e/diag-customizer-reveal.mjs
import fs from "node:fs";
import path from "node:path";
import { launch, sleep } from "./lib/cdp.mjs";
import { TOAST_RECORDER, fakeTts, fakeStt } from "./lib/inits.mjs";

const p = await launch();
await p.addInitScript(TOAST_RECORDER); await p.addInitScript(fakeTts("ok")); await p.addInitScript(fakeStt("ok"));
await p.viewport(1366, 900);
await p.goto();
await p.go("customizer");
for (const t of ["cs", "business", "biostat"]) await p.click(`[data-template="${t}"]`);
await p.go("dashboard");
const out = {};
for (const rate of [1, 4]) {
  await p.send("Emulation.setCPUThrottlingRate", { rate });
  await p.reload();
  out["rate" + rate] = await p.ev(`(async () => { const h = document.getElementById("customizer-custom"); const t0 = performance.now();
    document.querySelector('#app-nav [data-tab="customizer"]').click(); const hiddenAtClick = h.hidden; const frames = [];
    for (let i = 0; i < 4; i++) { await new Promise((r) => requestAnimationFrame(r)); frames.push({ t: +(performance.now() - t0).toFixed(1), hidden: h.hidden }); }
    const top = Math.round(h.getBoundingClientRect().top + scrollY); const items = () => h.querySelectorAll(".cv-item").length; const total = EMT.store.getState().data.customVocab.length;
    const itemsAtReveal = items(); let tFull = null; for (let i = 0; i < 200 && items() < total; i++) await new Promise((r) => setTimeout(r, 10)); tFull = +(performance.now() - t0).toFixed(1);
    return { viewportH: innerHeight, hostTop: top, belowFold: top >= innerHeight, hiddenAtClick, frames, itemsAtReveal, totalVocab: total, itemsFinal: items(), msUntilListFull: tFull }; })()`);
}
await p.send("Emulation.setCPUThrottlingRate", { rate: 1 });
await p.close();
console.log(JSON.stringify(out, null, 2));
const DIAG = path.resolve("tests/results/diag"); fs.mkdirSync(DIAG, { recursive: true });
fs.writeFileSync(path.join(DIAG, "customizer-reveal.json"), JSON.stringify(out, null, 2));
