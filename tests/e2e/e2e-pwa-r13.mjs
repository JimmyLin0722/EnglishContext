// QA 第 13 輪（PRD v0.24 AC-72-04、AC-36-03、AC-36-04、E-185；architecture v0.22 §10.15 Q28）：本機模擬「已安裝 v1.3.2 → 部署 1.4.0 → 依 AC-36-03 更新」。
// v1.3.2 部署目錄：以 git archive c16d368（v1.3.2 提交）取出 src/、tools/、sources/deploy/、package.json 到暫存目錄後執行 tools/build.mjs（dist/site 不在版本控制內）；1.4.0 為目前 dist/site。
// 同一埠 8080 換目錄重啟 tools/serve.mjs 模擬重新部署（同來源），Playwright（lib/pwa-env.mjs）。正式網址的部署後更新仍列人工 TC-72-04h。
// 執行：node tests/e2e/e2e-pwa-r13.mjs
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync, execFileSync } from "node:child_process";
import { ROOT, SITE, BASE, KEY, CACHE_PREFIX, sleep, serve, stopServer, launchBrowser, newEnv, waitSW, cacheInfo, pageBuildId, readStore, recorder, resultPath } from "./lib/pwa-env.mjs";
import { TOAST_RECORDER, fakeTts, fakeStt, fakeMic } from "./lib/inits.mjs";
import { stateRecord, todayYmd } from "./lib/state.mjs";

const R = recorder("e2e-pwa-r13");
const TMP = process.env.QA_TMP || fs.mkdtempSync(path.join(os.tmpdir(), "emt-qa-"));
const SRC = path.join(TMP, "v132src"); fs.rmSync(SRC, { recursive: true, force: true }); fs.mkdirSync(SRC, { recursive: true });
const tarBuf = execFileSync("git", ["archive", "--format=tar", "c16d368", "src", "tools", "sources/deploy", "package.json"], { cwd: ROOT, maxBuffer: 256 << 20 });
// 以標準輸入解開（避免 GNU tar 把「C:」當成遠端主機）
const x = spawnSync("tar", ["-xf", "-"], { cwd: SRC, input: tarBuf, encoding: "utf8", maxBuffer: 64 << 20 }); if (x.status !== 0) throw new Error("解開 v1.3.2 原始碼失敗：" + x.stderr);
const b = spawnSync(process.execPath, ["tools/build.mjs"], { cwd: SRC, encoding: "utf8" }); if (b.status !== 0) throw new Error("v1.3.2 建置失敗：" + b.stdout + b.stderr);
const OLDSITE = path.join(SRC, "dist", "site");
const idOf = (dir) => (fs.readFileSync(path.join(dir, "index.html"), "utf8").match(/<meta name="emt-build-id" content="([0-9a-f]+)">/) || [])[1];
const verOf = (dir) => (fs.readFileSync(path.join(dir, "index.html"), "utf8").match(/<meta name="emt-app-version" content="([^"]+)">/) || [])[1];
const V1 = idOf(OLDSITE), V2 = idOf(SITE);
console.log(`v1.3.2 ${verOf(OLDSITE)} ${V1}、1.4.0 ${verOf(SITE)} ${V2}`);

const notice = (page) => page.evaluate(() => { const h = document.querySelector("#pwa-update"); if (!h) return { vis: false }; const s = getComputedStyle(h); return { vis: !h.hidden && s.display !== "none" && h.getBoundingClientRect().height > 0, text: (h.querySelector(".pwa-update__text") || {}).textContent, btn: (h.querySelector("button") || {}).textContent }; });
async function waitNotice(page, ms = 60000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const n = await notice(page); if (n.vis) return { ...n, ms: Date.now() - t0 }; await sleep(250); } return { ...(await notice(page)), ms: null }; }
const look = (page) => page.evaluate(() => ({ entry: document.body.dataset.entry, tab: window.EMT && EMT.router ? EMT.router.current() : null, map: !!document.querySelector("#view-dashboard svg.isl-map"), title: (document.querySelector("#view-dashboard .page-title") || {}).textContent, nav: [...document.querySelectorAll("#app-nav [data-tab]")].map((e) => e.textContent.trim()).join("、"), ver: (document.querySelector("#app-version, .version-line") || {}).textContent || "", bg: getComputedStyle(document.body).backgroundColor }));

const browser = await launchBrowser();
await serve(OLDSITE);
const env = await newEnv(browser, { inits: [TOAST_RECORDER, fakeTts("ok"), fakeStt("ok"), fakeMic("ok", -25)] });
const page = await env.newPage();
await page.goto(BASE);
const T = todayYmd();
const rec = stateRecord(725, { sttNoticeAcknowledged: true, masteredWordKeys: ["the", "be", "and", "of", "to"], streak: { days: 3, lastActiveDate: T }, todayLearned: { date: T, wordKeys: ["the", "be"] }, learnedHistory: { [T]: 2 }, part5CorrectIds: ["p5-001", "p5-002"], part5: { currentIndex: 2, lockedSelection: null, phase: "question", roundAnswered: 2, roundCorrect: 2, totalAnswered: 2, totalCorrect: 2 } });
await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, JSON.stringify(rec)]); await page.reload();
const sw = await waitSW(page); await sleep(1500);
const before = await look(page); const id0 = await pageBuildId(page); const store0 = await readStore(page);
await stopServer(); await serve(SITE);
await R.check("TC-72-04a", "AC-72-04、AC-36-03、AC-36-04、E-185", async () => {
  await page.reload(); const n = await waitNotice(page, 60000);
  const mid = await look(page); const idMid = await pageBuildId(page);
  await page.click(".pwa-update__btn"); await sleep(5000);
  const after = await look(page); const id1 = await pageBuildId(page); const store1 = await readStore(page);
  const caches = Object.keys(await cacheInfo(page)).filter((k) => k.startsWith(CACHE_PREFIX));
  const same = JSON.stringify(store0) === JSON.stringify(store1);
  const ok = !!sw && id0 === V1 && !before.map && n.vis && n.ms !== null && idMid === V1 && !mid.map && id1 === V2 && after.entry === "main" && after.tab === "dashboard" && after.map && after.title.includes("我的群島") && after.nav.startsWith("群島") && same && caches.length === 1 && caches[0] === CACHE_PREFIX + V2;
  return { ok, note: `v1.3.2（${V1}）安裝 service worker、有學習資料；部署 1.4.0（${V2}）後重新載入 → ${n.ms} ms 顯示「${n.text}」＋「${n.btn}」；更新前頁面仍為舊版（識別碼 ${idMid}、地圖=${mid.map}、標題「${(mid.title || "").trim()}」，E-185 預期）；按「更新版本」→ 識別碼 ${id1}、${after.entry}/${after.tab}、地圖=${after.map}、標題「${(after.title || "").trim()}」、導覽 ${after.nav}、body ${after.bg}；localStorage 與更新前完全相同=${same}；本專案快取 ${JSON.stringify(caches)}` };
});
await stopServer();
await browser.close();
R.save(resultPath("e2e-pwa-r13"));
const c = (k) => R.results.filter((r) => r.result === k).length;
console.log(`e2e-pwa-r13：通過 ${c("通過")}、失敗 ${c("失敗")}、待人工 ${c("待人工")}`);
