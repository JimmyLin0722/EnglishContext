// QA E2E 第 9 輪（AC-51-03、AC-51-02 參考；替身驗證 V-AD (b)，本機非基準環境）：廣告已載入（替身回傳版位）時重測反應時間，並與無廣告（dist）對照。
// 量法同 AC-22-01：頁面內 el.click() → 下一個畫格後（rAF + setTimeout 0）。每項各 10 次 × ROUNDS 個瀏覽器環境；一般與 4 倍降速。
// 回報每項的中位數、p90、最大值、樣本數與 > 100 ms 筆數（不只挑有利指標）。用法：node tests/e2e/e2e-ad-perf.mjs [ROUNDS，預設 3]
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { launchBrowser, newEnv, recorder, resultPath, SITE, ROOT } from "./lib/pwa-env.mjs";
import { stateRecord } from "./lib/state.mjs";
import { routeAd, PROD, seedInit, modeInit, waitAdStatus, startProdServer, prodBrowserArgs } from "./lib/ad-env.mjs";
import { buildAdTest } from "../tools/build-ad-test.mjs";

const ROUNDS = Number(process.argv[2] || 3);
const R = recorder("e2e-ad-perf");
const TMP = fs.mkdtempSync(path.join(process.env.QA_TMP || os.tmpdir(), "ad-perf-"));
const built = await buildAdTest(path.join(TMP, "b"));
const server = await startProdServer(TMP, built.site);
const browser = await launchBrowser(prodBrowserArgs(server.port));
const id = (n) => "p5-" + String(n).padStart(3, "0");
const part5 = (over = {}) => ({ currentIndex: 0, lockedSelection: null, phase: "question", roundAnswered: 0, roundCorrect: 0, totalAnswered: 3, totalCorrect: 2, ...over });
const STATES = {
  "AC-22-01": () => stateRecord(725, { sttNoticeAcknowledged: true, part5: part5({ currentIndex: 5 }), part5CorrectIds: ["p5-001"] }),
  "AC-39-03": () => stateRecord(725, { sttNoticeAcknowledged: true, part5: part5({ currentIndex: 5 }), part5CorrectIds: ["p5-001"] }),
  "AC-45-01": () => stateRecord(725, { sttNoticeAcknowledged: true, part5: part5({ currentIndex: 10 }), part5CorrectIds: ["p5-001"] }),
  "AC-46-03": () => stateRecord(725, { sttNoticeAcknowledged: true, part5: part5({ currentIndex: 10 }), part5CorrectIds: Array.from({ length: 100 }, (_, i) => id(2 * i + 12)), part5UnansweredOnly: true }),
  "AC-48-01": () => stateRecord(725, { sttNoticeAcknowledged: true, part5: part5({ currentIndex: 10 }), part5CorrectIds: Array.from({ length: 200 }, (_, i) => id(i + 1)) }),
};
const PAINT = `const paint = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));`;
const CASES = {
  "AC-22-01": async (page) => { const out = []; const TABS = ["customizer", "flashcards", "part5", "dashboard"]; for (let i = 0; i < 10; i++) { const t = TABS[i % 4]; out.push(await page.evaluate(`(async () => { ${PAINT} const b = document.querySelector('#app-nav [data-tab="${t}"]'); const t0 = performance.now(); b.click(); await paint(); return performance.now() - t0; })()`)); await page.waitForTimeout(120); } return out; },
  "AC-39-03": async (page) => { const out = []; for (let i = 0; i < 10; i++) { await page.evaluate(() => EMT.router.go("dashboard")); await page.waitForTimeout(150); out.push(await page.evaluate(`(async () => { ${PAINT} const b = document.querySelector("#view-dashboard .db-start"); const t0 = performance.now(); b.click(); await paint(); return EMT.router.current() === "flashcards" ? performance.now() - t0 : null; })()`)); await page.waitForTimeout(120); } return out; },
  "AC-45-01": async (page) => { const out = []; await page.evaluate(() => EMT.router.go("part5")); await page.waitForTimeout(120); for (let i = 0; i < 10; i++) { const idx = await page.evaluate(() => Number(document.querySelector(".p5-question").dataset.index)); const c = await page.evaluate((n) => PART5_QUESTION_BANK[n].correctIndex, idx); out.push(await page.evaluate(`(async () => { ${PAINT} const b = document.querySelector('#view-part5 [data-p5=option][data-index="${c}"]'); const t0 = performance.now(); b.click(); await paint(); return document.querySelector("[data-p5=correct-badge]") ? performance.now() - t0 : null; })()`)); await page.waitForTimeout(100); await page.evaluate(() => document.querySelector("#view-part5 [data-p5=next]").click()); await page.waitForTimeout(100); } return out; },
  "AC-46-03": async (page) => { const out = []; await page.evaluate(() => EMT.router.go("part5")); await page.waitForTimeout(120); for (let i = 0; i < 10; i++) { const before = await page.evaluate(() => Number(document.querySelector(".p5-question").dataset.index)); const c = await page.evaluate((n) => PART5_QUESTION_BANK[n].correctIndex, before); await page.evaluate((x) => document.querySelector(`#view-part5 [data-p5=option][data-index="${x}"]`).click(), c); await page.waitForTimeout(100); out.push(await page.evaluate(`(async () => { ${PAINT} const b = document.querySelector("#view-part5 [data-p5=next]"); const t0 = performance.now(); b.click(); await paint(); return Number(document.querySelector(".p5-question").dataset.index) >= ${before + 2} ? performance.now() - t0 : null; })()`)); await page.waitForTimeout(100); } return out; },
  "AC-48-01": async (page) => { const out = []; await page.evaluate(() => EMT.router.go("part5")); await page.waitForTimeout(120); for (let i = 0; i < 10; i++) { out.push(await page.evaluate(`(async () => { ${PAINT} const b = document.querySelector("#view-part5 [data-p5=next]"); const t0 = performance.now(); b.click(); await paint(); return document.querySelector("[data-p5=correct-badge]") ? performance.now() - t0 : null; })()`)); await page.waitForTimeout(100); } return out; },
};
const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const pct = (a, q) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.ceil(q * s.length) - 1)]; };
const stat = (a) => ({ median: +median(a).toFixed(1), p90: +pct(a, 0.9).toFixed(1), max: +Math.max(...a).toFixed(1), n: a.length, over100: a.filter((x) => x > 100).length });
const results = {};
for (const rate of [1, 4]) for (const variant of ["廣告已顯示", "無廣告（dist）"]) for (const ac of Object.keys(CASES)) { const all = []; let nulls = 0;
  for (let r = 0; r < ROUNDS; r++) {
    server.setDir(variant === "廣告已顯示" ? built.site : SITE);
    const env = await newEnv(browser, { serviceWorkers: "block", width: 1366, height: 900, inits: [modeInit("filled", 30), seedInit(STATES[ac]())] });
    await routeAd(env.ctx, "stub"); const page = await env.newPage(); await page.goto(PROD, { waitUntil: "load" }); await page.waitForFunction(() => document.documentElement.getAttribute("data-ready") === "1"); if (variant === "廣告已顯示") await waitAdStatus(page, "filled", 4000);
    for (const t of ["customizer", "flashcards", "part5", "dashboard"]) { await page.evaluate((x) => EMT.router.go(x), t); await page.waitForTimeout(60); }
    const cdp = await env.ctx.newCDPSession(page); if (rate !== 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate });
    const vals = await CASES[ac](page); if (rate !== 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 }); nulls += vals.filter((x) => x === null).length; all.push(...vals.filter((x) => x !== null)); await env.ctx.close();
  }
  const k = `${rate}x｜${variant}｜${ac}`; results[k] = { ...stat(all), notReached: nulls }; console.log(k, JSON.stringify(results[k]));
}
fs.mkdirSync(path.join(ROOT, "tests/results/diag"), { recursive: true }); fs.writeFileSync(path.join(ROOT, "tests/results/diag/r9-ad-perf.json"), JSON.stringify(results, null, 1));
const AC = ["AC-22-01", "AC-39-03", "AC-45-01", "AC-46-03", "AC-48-01"];
const norm = AC.map((a) => results[`1x｜廣告已顯示｜${a}`]); const slow = AC.map((a) => results[`4x｜廣告已顯示｜${a}`]);
const fmt = (a, r) => `${a}：中位 ${r.median}、p90 ${r.p90}、最大 ${r.max}、n=${r.n}、> 100 ms ${r.over100} 筆`;
const ok1 = norm.every((r) => r.over100 === 0 && r.notReached === 0);
R[ok1 ? "pass" : "fail"]("TC-51-03a", "AC-51-03（一般速度，本機替身，非基準環境）", "【替身驗證】" + AC.map((a, i) => fmt(a, norm[i])).join("；"));
const ok4 = slow.every((r) => r.over100 === 0 && r.notReached === 0);
const note4 = "【替身驗證】4 倍降速：" + AC.map((a, i) => fmt(a, slow[i])).join("；") + "；同條件無廣告對照：" + AC.map((a) => fmt(a, results[`4x｜無廣告（dist）｜${a}`])).join("；");
if (ok4) R.pass("TC-51-03b", "AC-51-03（4 倍降速，本機替身，非基準環境）", note4); else R.manual("TC-51-03b", "AC-51-03（4 倍降速，本機替身，非基準環境）", "本機參考值不符（依 test-plan §2.3 不算通過也不算缺陷，以 TC-M07 為準）：" + note4);
await browser.close(); await server.close();
R.save(resultPath("e2e-ad-perf"));
console.log(`e2e-ad-perf：通過 ${R.results.filter((r) => r.result === "通過").length}、待人工 ${R.results.filter((r) => r.result === "待人工").length}、失敗 ${R.results.filter((r) => r.result === "失敗").length}`);
