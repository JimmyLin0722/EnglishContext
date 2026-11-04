// 診斷（第 8 輪，不列入 run-all）：TC-20-01 間歇出現「.fcq-option--correct × .fcq-option--neutral 重疊」是否只發生在答題 pop 動畫期間
// 逐影格取得作答後選項的 getBoundingClientRect 重疊量與進行中動畫數，直到動畫結束後再量 1 次。重複 5 次。
import fs from "node:fs";
import path from "node:path";
import { launch, sleep, ROOT } from "./lib/cdp.mjs";
import { fakeTts, fakeStt, fakeMic } from "./lib/inits.mjs";

const p = await launch();
for (const s of [fakeTts("ok"), fakeStt("ok"), fakeMic("ok")]) await p.addInitScript(s);
await p.viewport(1366, 768);
await p.goto();
const out = [];
for (let k = 0; k < 5; k++) {
  await p.reload(); await p.go("flashcards"); await p.click(".fc-mode-btn"); await sleep(40);
  const r = await p.ev(`(async () => { const overlap = () => { const b = [...document.querySelectorAll(".fcq-option")].map((x) => x.getBoundingClientRect()); let m = 0; for (let i = 0; i < b.length; i++) for (let j = i + 1; j < b.length; j++) { const ix = Math.min(b[i].right, b[j].right) - Math.max(b[i].left, b[j].left), iy = Math.min(b[i].bottom, b[j].bottom) - Math.max(b[i].top, b[j].top); if (ix > 2 && iy > 2) m = Math.max(m, iy); } return +m.toFixed(1); };
    document.querySelectorAll(".fcq-option")[0].click(); const t0 = performance.now(); const fr = []; for (let i = 0; i < 40; i++) { await new Promise((r) => requestAnimationFrame(r)); fr.push({ t: Math.round(performance.now() - t0), over: overlap(), anim: document.getAnimations().filter((a) => a.playState === "running" && a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest(".fcq-option")).length }); }
    await Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))); return { withAnim: fr.filter((x) => x.anim > 0 && x.over > 0).length, withoutAnim: fr.filter((x) => x.anim === 0 && x.over > 0).length, maxOver: Math.max(...fr.map((x) => x.over)), last: overlap(), lastAnimT: Math.max(0, ...fr.filter((x) => x.anim > 0).map((x) => x.t)) }; })()`);
  out.push(r); console.log(JSON.stringify(r));
  await p.click(".fc-mode-btn");
}
await p.close();
fs.mkdirSync(path.join(ROOT, "tests/results/diag"), { recursive: true }); fs.writeFileSync(path.join(ROOT, "tests/results/diag/r8-quizpop.json"), JSON.stringify(out, null, 2));
