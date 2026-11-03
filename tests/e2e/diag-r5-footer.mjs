// 第 5 輪 QA 診斷：主控台頁尾「資料來源與授權」連結可見與點擊（AC-39-06、AC-23-02）
import { launch, sleep } from "./lib/cdp.mjs";
const p = await launch();
await p.viewport(1366, 900);
await p.goto();
await p.go("dashboard"); await sleep(400);
console.log(await p.ev(`(() => { const b = document.getElementById("footer-sources"); const r = b.getBoundingClientRect(); return { vis: r.width + "x" + r.height + "@" + Math.round(r.top), hidden: b.hidden, disp: getComputedStyle(b).display, inner: innerHeight, docH: document.documentElement.scrollHeight }; })()`));
const hit = await p.click("#footer-sources"); await sleep(400);
console.log("hit", hit, await p.ev(`EMT.router.current()`), await p.ev(`!document.getElementById("view-sources").hidden`));
await p.close();
