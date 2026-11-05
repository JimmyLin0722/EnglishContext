// 診斷（第 9 輪，AC-51-04、FE-89 回饋 2）：(1) 離線重新載入時 navigator.onLine 與廣告判定；(2) 廣告環境 header 位移的時序與捲軸寬度。不列入總表。
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { launchBrowser, newEnv, sleep, waitSW, SITE } from "./lib/pwa-env.mjs";
import { stateRecord } from "./lib/state.mjs";
import { routeAd, PROD, seedInit, modeInit, startProdServer, prodBrowserArgs, LAYOUT_SHIFT_INIT } from "./lib/ad-env.mjs";
import { buildAdTest } from "../tools/build-ad-test.mjs";

const TMP = fs.mkdtempSync(path.join(process.env.QA_TMP || os.tmpdir(), "ad-off-"));
const built = await buildAdTest(path.join(TMP, "b"));
const server = await startProdServer(TMP, built.site);
const browser = await launchBrowser(prodBrowserArgs(server.port));
const rec = stateRecord(725, { sttNoticeAcknowledged: true, part5: { currentIndex: 5, lockedSelection: null, phase: "question", roundAnswered: 0, roundCorrect: 0, totalAnswered: 3, totalCorrect: 2 }, part5CorrectIds: ["p5-001"] });
{
  const env = await newEnv(browser, { serviceWorkers: "allow", width: 1366, height: 768, inits: [modeInit("filled"), seedInit(rec), "window.__onLineAtBoot = navigator.onLine; window.__onLineLog = [navigator.onLine];"] });
  const ad = await routeAd(env.ctx, "stub"); const page = await env.newPage();
  await page.goto(PROD, { waitUntil: "load" }); await waitSW(page); await page.reload({ waitUntil: "load" }); await sleep(800);
  const h0 = ad.hits.length; console.log("連網：", await page.evaluate(() => ({ on: navigator.onLine, st: EMT.store.getState().runtime.ad.status })), "廣告請求", h0);
  await env.ctx.setOffline(true); await sleep(200);
  console.log("setOffline 後（未重載）：", await page.evaluate(() => navigator.onLine));
  await page.reload({ waitUntil: "load" }); await sleep(1000);
  console.log("離線重載：", await page.evaluate(() => ({ on: navigator.onLine, boot: window.__onLineAtBoot, st: EMT.store.getState().runtime.ad.status, ctrl: !!navigator.serviceWorker.controller })), "廣告請求增加", ad.hits.length - h0);
  await env.ctx.setOffline(false); await env.ctx.close();
}
// 真實離線：不經 Playwright 路由，廣告主機本來就解析失敗
{
  const env = await newEnv(browser, { serviceWorkers: "allow", width: 1366, height: 768, inits: [modeInit("filled"), seedInit(rec), "window.__onLineAtBoot = navigator.onLine;"] }); const page = await env.newPage();
  await page.goto(PROD, { waitUntil: "load" }); await waitSW(page); await page.reload({ waitUntil: "load" }); await sleep(500);
  await env.ctx.setOffline(true); await page.reload({ waitUntil: "load" }); await sleep(1000);
  const adReq = env.log.requests.filter((r) => /googlesyndication/.test(r.url)).length;
  console.log("不攔截廣告腳本：", await page.evaluate(() => ({ on: navigator.onLine, boot: window.__onLineAtBoot, st: EMT.store.getState().runtime.ad.status })), "累計腳本請求（含前 2 次載入）", adReq);
  await env.ctx.setOffline(false); await env.ctx.close();
}
// header 位移：捲軸與 gutter 狀態
for (const [name, dir] of [["廣告環境", built.site], ["第一階段", SITE]]) {
  server.setDir(dir);
  const env = await newEnv(browser, { serviceWorkers: "block", width: 1366, height: 768, inits: [modeInit("filled"), seedInit(rec), LAYOUT_SHIFT_INIT, `window.__snap = []; const snap = (w) => { const de = document.documentElement; const h = document.querySelector(".app-header__inner"); window.__snap.push({ w, t: Math.round(performance.now()), env: de.getAttribute("data-ad-env"), gutter: de && getComputedStyle(de).scrollbarGutter, sbw: innerWidth - de.clientWidth, sh: de.scrollHeight, headerLeft: h ? h.getBoundingClientRect().left : null }); }; const tick = () => { snap("raf"); if (performance.now() < 900) requestAnimationFrame(tick); }; requestAnimationFrame(tick);`] });
  await routeAd(env.ctx, "stub"); const page = await env.newPage(); await page.goto(PROD, { waitUntil: "load" }); await sleep(1000);
  const snaps = await page.evaluate(() => window.__snap); const uniq = []; for (const s of snaps) { const k = `${s.env}|${s.sbw}|${s.headerLeft}`; if (!uniq.length || uniq[uniq.length - 1].k !== k) uniq.push({ ...s, k }); }
  console.log(name, JSON.stringify(uniq.map(({ k, ...x }) => x))); console.log(name, "layout-shift", JSON.stringify(await page.evaluate(() => (window.__qaLS || []).map((e) => ({ t: e.t, v: +e.value.toFixed(4), s: e.sources.map((x) => x.name) })))));
  await env.ctx.close();
}
await browser.close(); await server.close();
