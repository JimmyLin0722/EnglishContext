// 診斷（第 4 輪，不列入 run-all）：「安裝 App」按鈕四角 elementFromPoint 命中元素（TC-34-07 遮住點判讀）
import { serve, stopServer, launchBrowser, newEnv, BASE, KEY, fireBip, sleep } from "./lib/pwa-env.mjs";
import { stateRecord } from "./lib/state.mjs";
await serve();
const browser = await launchBrowser();
for (const w of [1366, 375]) {
  const env = await newEnv(browser, { width: w, height: w === 375 ? 740 : 900 }); const page = await env.newPage();
  await page.goto(BASE); await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, JSON.stringify(stateRecord(725))]); await page.reload(); await sleep(800);
  await fireBip(page); await sleep(200);
  const r = await page.evaluate(async () => {
    const e = document.querySelector('[data-action="install-app"]'); e.scrollIntoView({ block: "center" }); await new Promise((r) => setTimeout(r, 150));
    const b = e.getBoundingClientRect(); const cs = getComputedStyle(e);
    const pts = { 中心: [b.left + b.width / 2, b.top + b.height / 2], 左上: [b.left + 2, b.top + 2], 右上: [b.right - 2, b.top + 2], 左下: [b.left + 2, b.bottom - 2], 右下: [b.right - 2, b.bottom - 2], 左上內縮8: [b.left + 8, b.top + 8], 右下內縮8: [b.right - 8, b.bottom - 8] };
    const name = (h) => h ? h.tagName.toLowerCase() + (h.className ? "." + String(h.className).split(" ").join(".") : "") : "null";
    return { rect: [b.left, b.top, b.width, b.height].map(Math.round), radius: cs.borderRadius, hits: Object.fromEntries(Object.entries(pts).map(([k, [x, y]]) => [k, name(document.elementFromPoint(x, y))])) };
  });
  console.log(w, JSON.stringify(r));
  await env.ctx.close();
}
await browser.close(); await stopServer();
