// 第 5 輪 QA 診斷：模擬測驗頁 scrollWidth > clientWidth 的文字元素（AC-40-02）、資料來源頁原創內容來源一行（AC-38-10）
import { launch, sleep } from "./lib/cdp.mjs";
const p = await launch();
await p.viewport(375, 667); await p.goto();
await p.ev(`EMT.router.go("part5")`); await sleep(400);
const clip = () => [...document.querySelectorAll("#view-part5 .p5 *")].filter((x) => x.getClientRects().length && [...x.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && x.scrollWidth > x.clientWidth + 1 && getComputedStyle(x).overflowX !== "visible")
  .map((x) => `${x.className} sw=${x.scrollWidth} cw=${x.clientWidth} ov=${getComputedStyle(x).overflowX} text=${x.textContent.slice(0, 40)}`);
console.log(await p.ev(`(${clip.toString()})()`));
await p.ev(`EMT.router.go("sources")`); await sleep(400);
const src = () => [...document.querySelectorAll("#view-sources *")].filter((e) => /原創內容來源/.test([...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(""))).map((e) => `${e.tagName}.${e.className}：${e.textContent}`);
console.log(await p.ev(`(${src.toString()})()`));
console.log(await p.ev(`(() => { const r = (window.DATA_SOURCE_REGISTRY || []).find((x) => x.code === "ORIGINAL"); return r ? r.fullName : "無 ORIGINAL"; })()`));
await p.close();
