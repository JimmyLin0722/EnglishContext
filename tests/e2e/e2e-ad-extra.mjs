// QA E2E 第 9 輪（替身驗證，V-AD (b)）：E-147 已安裝獨立視窗不載入（Q-89）；E-144 第三方寫入同網域儲存不進本系統狀態與備份（AC-50-08）。
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { launchBrowser, newEnv, recorder, resultPath, KEY } from "./lib/pwa-env.mjs";
import { stateRecord } from "./lib/state.mjs";
import { routeAd, PROD, seedInit, modeInit, adState, waitAdStatus, startProdServer, prodBrowserArgs } from "./lib/ad-env.mjs";
import { buildAdTest } from "../tools/build-ad-test.mjs";

const R = recorder("e2e-ad-extra");
const TMP = fs.mkdtempSync(path.join(process.env.QA_TMP || os.tmpdir(), "ad-extra-"));
const built = await buildAdTest(path.join(TMP, "b"));
const server = await startProdServer(TMP, built.site);
const browser = await launchBrowser(prodBrowserArgs(server.port));
const rec = stateRecord(725, { sttNoticeAcknowledged: true, part5: { currentIndex: 5, lockedSelection: null, phase: "question", roundAnswered: 0, roundCorrect: 0, totalAnswered: 3, totalCorrect: 2 }, part5CorrectIds: ["p5-001"] });
const J = (x) => JSON.stringify(x);
const ready = (page) => page.waitForFunction(() => document.documentElement.getAttribute("data-ready") === "1", null, { timeout: 15000 });
{
  const STANDALONE = "(() => { const o = window.matchMedia.bind(window); window.matchMedia = (q) => /display-mode:\\s*standalone/.test(q) ? { matches: true, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} } : o(q); })();";
  const env = await newEnv(browser, { serviceWorkers: "block", width: 1366, height: 768, inits: [modeInit("filled"), seedInit(rec), STANDALONE] }); const ad = await routeAd(env.ctx, "stub"); const page = await env.newPage();
  await R.check("TC-50-01s", "AC-50-01、E-147、Q-89（獨立視窗不載入）", async () => { await page.goto(PROD, { waitUntil: "load" }); await ready(page); await page.waitForTimeout(600); const s = await adState(page); return { ok: ad.hits.length === 0 && s.status === "ineligible" && s.ads === 0 && s.env === null && !s.state, note: `【替身驗證】display-mode: standalone：廣告請求 ${ad.hits.length}、狀態 ${s.status}、框 ${s.ads}、data-ad-env ${s.env}（matchMedia 替身；實機已安裝 App 見 TC-PWA-H1）` }; });
  await env.ctx.close();
}
{
  const env = await newEnv(browser, { serviceWorkers: "block", width: 1366, height: 768, inits: [modeInit("filled"), seedInit(rec)] }); await routeAd(env.ctx, "stub"); const page = await env.newPage();
  await R.check("TC-50-08b", "AC-50-08、E-144（第三方寫入同網域儲存）", async () => {
    await page.goto(PROD, { waitUntil: "load" }); await ready(page); await waitAdStatus(page, "filled", 3000);
    await page.evaluate(() => { localStorage.setItem("__gads_qa", "third-party-value"); document.cookie = "__gpi_qa=third-party-cookie; path=/"; return new Promise((res) => { const r = indexedDB.open("qa-third-party", 1); r.onupgradeneeded = () => r.result.createObjectStore("s"); r.onsuccess = () => { r.result.close(); res(); }; }); });
    await page.evaluate(() => EMT.router.go("dashboard")); await page.waitForTimeout(80); await page.click(".db-backup__toggle"); await page.waitForTimeout(60); const dl = page.waitForEvent("download", { timeout: 5000 }); await page.click('[data-action="export-backup"]'); const d = await dl; const fp = path.join(TMP, "bk.json"); await d.saveAs(fp); const bk = fs.readFileSync(fp, "utf8");
    await page.reload({ waitUntil: "load" }); await ready(page); const st = await page.evaluate((k) => ({ raw: JSON.parse(localStorage.getItem(k)), toast: document.getElementById("toast-root").innerText, third: localStorage.getItem("__gads_qa") }), KEY);
    const leak = /third-party|__gads_qa|__gpi_qa|qa-third-party/.test(bk) || /third-party|__gads_qa/.test(J(st.raw)); const keys = Object.keys(JSON.parse(bk));
    return { ok: !leak && J(keys) === J(["format", "schemaVersion", "exportedAt", "contentDataVersion", "data"]) && st.raw.schemaVersion === 3 && Object.keys(st.raw.data).length === 12 && st.third === "third-party-value" && !st.toast, note: `【替身驗證】模擬第三方寫入 localStorage、Cookie、IndexedDB；備份與本系統狀態含第三方內容=${leak}；備份頂層 ${keys.join("、")}；schemaVersion ${st.raw.schemaVersion}、${Object.keys(st.raw.data).length} 欄；第三方項目保留不動=${st.third === "third-party-value"}；提示「${st.toast}」` };
  });
  await env.ctx.close();
}
await browser.close(); await server.close();
R.save(resultPath("e2e-ad-extra"));
console.log(`e2e-ad-extra：通過 ${R.results.filter((r) => r.result === "通過").length}、失敗 ${R.results.filter((r) => r.result === "失敗").length}`);
