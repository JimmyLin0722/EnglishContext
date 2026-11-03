// 第 5 輪 QA 診斷：首次畫面 Tab 序列（AC-38-09、AC-41-04）
import { launch, sleep } from "./lib/cdp.mjs";
const p = await launch(); p.autoStart = false;
await p.viewport(1366, 900); await p.goto();
await p.ev(`document.activeElement && document.activeElement.blur(); window.scrollTo(0, 0)`);
const seq = [];
for (let i = 0; i < 14; i++) { await p.key("Tab", "Tab", 9); seq.push(await p.ev(`(() => { const e = document.activeElement; return e ? (e.id || e.className || e.tagName) + "|" + (e.innerText || "").trim().slice(0, 8) : null; })()`)); }
console.log(seq.join("\n"));
await p.close();
