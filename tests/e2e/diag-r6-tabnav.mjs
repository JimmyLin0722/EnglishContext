// 第 6 輪診斷（不列入 run-all）：AC-26-05 區塊 375px Tab 走 80 次後導覽列為何尺寸 0（e2e-firstrun 第 423 行）
import fs from "node:fs";
import { launch, sleep } from "./lib/cdp.mjs";
const p = await launch();
await p.viewport(375, 667);
await p.ev(`localStorage.clear()`).catch(() => {}); p.autoStart = false; await p.goto();
await p.click("#cz-start"); await sleep(400);
await p.go("customizer"); await sleep(300);
for (const c of ["orange", "brown", "green", "blue", "gold"]) await p.click(`.cz-level[data-color="${c}"]`);
await p.click("#cz-apply"); await sleep(200);
const st = () => p.ev(`(() => { const e = document.activeElement; const b = document.querySelector('#app-nav [data-tab="dashboard"]').getBoundingClientRect(); const n = document.getElementById("app-nav");
  return { active: e ? (e.id || e.tagName + "." + e.className) : null, bodyClass: document.body.className, navDisplay: getComputedStyle(n).display, navW: b.width, navH: b.height }; })()`);
const before = await st();
await p.ev(`document.activeElement && document.activeElement.blur(); window.scrollTo(0, 0)`);
const seq = [];
for (let i = 0; i < 80; i++) { await p.key("Tab", "Tab", 9); seq.push(await p.ev(`(() => { const e = document.activeElement; return e ? (e.id || e.tagName.toLowerCase() + "." + String(e.className).split(" ")[0]) : null; })()`)); }
const after = await st();
await p.ev(`document.activeElement.blur()`); await sleep(200);
const afterBlur = await st();
const out = { before, after, afterBlur, last10: seq.slice(-10), uniq: [...new Set(seq)] };
console.log(JSON.stringify(out, null, 1));
fs.writeFileSync("tests/results/diag/r6-tabnav.json", JSON.stringify(out, null, 2));
await p.close();
