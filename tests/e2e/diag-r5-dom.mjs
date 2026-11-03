// 第 5 輪 QA 診斷：輸出首次畫面、難易度設定、主控台、模擬測驗的 DOM 摘要（選擇器更新參考）
import { launch, sleep } from "./lib/cdp.mjs";
function dumpFn(sel) {
  const out = [];
  const walk = (e, d) => {
    if (d > 7) return;
    const cls = String((e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className) || "").trim();
    const own = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(" ").slice(0, 50);
    const attrs = ["data-go", "data-action", "data-color", "aria-pressed", "aria-expanded", "role", "data-tab"].filter((a) => e.hasAttribute(a)).map((a) => " [" + a + "=" + e.getAttribute(a) + "]").join("");
    out.push("  ".repeat(d) + e.tagName.toLowerCase() + (e.id ? "#" + e.id : "") + (cls ? "." + cls.split(/\s+/).join(".") : "") + (e.hidden ? " [hidden]" : "") + attrs + (own ? " 「" + own + "」" : ""));
    for (const c of e.children) walk(c, d + 1);
  };
  const r = document.querySelector(sel); if (r) walk(r, 0); return out.join("\n");
}
const p = await launch();
const dump = (sel) => p.ev(`(${dumpFn.toString()})(${JSON.stringify(sel)})`);
await p.viewport(375, 667);
p.autoStart = false;
await p.goto();
console.log("=== header ===\n" + await dump("header"));
console.log("=== firstRun #view-customizer ===\n" + await dump("#view-customizer"));
await p.startLearning();
console.log("=== dashboard ===\n" + await dump("#view-dashboard"));
await p.go("customizer"); await sleep(400);
console.log("=== customizer ===\n" + (await dump("#view-customizer")).split("\n").slice(0, 60).join("\n"));
await p.go("part5"); await sleep(400);
console.log("=== part5 ===\n" + (await dump("#view-part5")).split("\n").slice(0, 25).join("\n"));
console.log("=== footer ===\n" + await dump("footer"));
await p.close();
