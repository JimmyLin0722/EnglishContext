// QA 第 4 輪（PRD v0.11，R-20 PWA）：file:// 相容、manifest／圖示、安裝按鈕（替身事件，FB-42）、service worker 註冊與快取、
// 離線開啟、快取寫入失敗、附屬檔 404、啟用條件、隱私（環境層請求記錄）、加入 PWA 前的使用者。
// 更新流程（V1 → V2）、建置可重現、workflow 模擬另見 e2e-pwa-update.mjs。
// 執行：node tests/e2e/e2e-pwa.mjs   （QA_BROWSER=edge 時只跑冒煙子集，結果檔加 -edge）
// 第 5 輪（PRD v0.13）：theme_color #1e9bf0、background_color #eef4fa、<title> EnglishContext；「安裝 App」與匯出入在收合的「資料備份」內，需先展開（AC-39-08、AC-34-07）；
// 主控台模組入口移除，就緒判定改「開始今日學習」（AC-35-04）。
// 前提：npm run build 已產生 dist/；埠 8080 未被佔用（本腳本以 tools/serve.mjs 啟動、結束時只關閉自己的程序）。
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import {
  ROOT, DIST, SITE, FILE_URL, BASE, ORIGIN, KEY, PRECACHE, CACHE_PREFIX, NT1, BROWSER, sleep, allowedUrls,
  serve, stopServer, launchBrowser, newEnv, visible, startLearning, goTab, waitSW, cacheInfo, readStore,
  fireBip, fireInstalled, TRUSTED_BIP, layoutCheck, decodePng, recorder, resultPath,
} from "./lib/pwa-env.mjs";
import { TOAST_RECORDER, fakeTts, fakeStt, fakeMic } from "./lib/inits.mjs";
import { stateRecord } from "./lib/state.mjs";
import { chromium } from "playwright-core";

const R = recorder("e2e-pwa");
const SMOKE = BROWSER === "edge";
const TMP = fs.mkdtempSync(path.join(process.env.QA_TMP || os.tmpdir(), "pwa-"));
const INITS = [TOAST_RECORDER, fakeTts("ok"), fakeStt("ok"), fakeMic("ok", -25), TRUSTED_BIP];
const MANIFEST_EXPECTED = {
  name: "EnglishContext", short_name: "EnglishContext", id: "./", start_url: "./", scope: "./", display: "standalone", lang: "zh-Hant-TW",
  theme_color: "#1e9bf0", background_color: "#eef4fa",
  icons: [
    { src: "icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
};
const browser = await launchBrowser();
const seedRec = () => stateRecord(725, { sttNoticeAcknowledged: true, streak: { days: 3, lastActiveDate: null }, vocabQuiz: { answered: 4, correct: 3 }, masteredWordKeys: [] });

/** 第 5 輪：展開主控台「資料備份」（已展開則不動作）；回傳展開前的 aria-expanded */
async function expand(page) {
  const st = await page.evaluate(() => { const b = document.querySelector(".db-backup__toggle"); return b ? b.getAttribute("aria-expanded") : null; });
  if (st === "false") { await page.click(".db-backup__toggle"); await sleep(80); }
  return st;
}
/** 主控台安裝按鈕與相關狀態 */
const installState = (page) => page.evaluate(() => {
  const v = (e) => { if (!e) return false; const s = getComputedStyle(e); if (s.display === "none" || s.visibility === "hidden" || e.closest("[hidden]")) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const btns = [...document.querySelectorAll('[data-action="install-app"]')];
  const box = document.querySelector(".dash-backup__install");
  return { n: btns.length, visible: btns.filter(v).length, text: btns.map((b) => b.textContent).join("|"), boxHidden: box ? box.hidden : null, boxH: box ? Math.round(box.getBoundingClientRect().height) : null,
    prompts: window.__qaPrompt || 0, tab: window.EMT && EMT.router ? EMT.router.current() : null, entry: document.body.dataset.entry,
    update: v(document.querySelector("#pwa-update")), trusted: window.__qaTrustedBip || 0, expanded: (document.querySelector(".db-backup__toggle") || { getAttribute: () => null }).getAttribute("aria-expanded") };
});
/** 主控台 NT-1 與匯出按鈕的位置關係 */
const ntInfo = (page) => page.evaluate((nt) => {
  const o = document.querySelector(".dash-backup__origin"); const ex = document.querySelector('[data-action="export-backup"]');
  if (!o) return { exists: false };
  const prev = o.previousElementSibling; const inst = document.querySelector(".dash-backup__install");
  return { exists: true, exact: o.textContent === nt, tag: o.tagName, afterExport: !!(prev && ex && (prev === ex || prev.contains(ex))),
    sameBlock: !!(ex && o.parentElement && o.parentElement.contains(ex)), installAfter: !!(inst && (o.compareDocumentPosition(inst) & Node.DOCUMENT_POSITION_FOLLOWING)),
    dialog: !!o.closest(".dialog,[role=dialog]") };
}, NT1);

/** 完整操作（不含匯出入）：各分頁、翻卡、STT 替身、Part 5 作答、資料來源頁 */
async function exercise(page) {
  const done = [];
  await goTab(page, "customizer"); done.push("難易度設定");
  await goTab(page, "flashcards");
  await page.click(".fc-flip"); await sleep(450); await page.click(".fc-flip"); await sleep(450); await page.click(".fc-next"); await sleep(200); done.push("翻卡");
  try {
    await page.click(".fc-front .sp-mic"); await sleep(300);
    if (await page.$('.dialog [data-action="ok"]')) { await page.click('.dialog [data-action="ok"]'); await sleep(200); }
    await page.evaluate(() => { const r = window.__qaStt.last; if (r) { r.emitResult("hello"); r.emitEnd(); } }); await sleep(300); done.push("STT（替身）");
  } catch (e) { done.push("STT 失敗：" + e.message); }
  await goTab(page, "part5");
  const opts = []; for (const o of await page.$$("[data-p5=option]")) if (await o.isEnabled()) opts.push(o);
  if (opts[1]) { await opts[1].click(); await sleep(300); done.push("Part 5 作答"); } else done.push("Part 5（本題已作答）");
  await page.click("#footer-sources"); await sleep(300); done.push("資料來源與授權");
  await goTab(page, "dashboard"); done.push("主控台");
  return done;
}
/** 匯出備份並匯入同一檔（確認視窗按確定） */
async function exportImport(page) {
  await goTab(page, "dashboard"); await sleep(250); await expand(page);
  const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 5000 }), page.click('[data-action="export-backup"]')]);
  const f = path.join(TMP, "backup-" + Date.now() + ".json"); await dl.saveAs(f);
  const [fc] = await Promise.all([page.waitForEvent("filechooser", { timeout: 5000 }), page.click('[data-action="import-backup"]')]);
  await fc.setFiles(f); await sleep(400);
  if (await page.$('.dialog [data-action="ok"]')) { await page.click('.dialog [data-action="ok"]'); await sleep(400); }
  return JSON.parse(fs.readFileSync(f, "utf8"));
}
const consoleBad = (log) => [
  ...log.console.filter((m) => m.type === "error" || m.type === "warning").map((m) => `console.${m.type}: ${m.text}`),
  ...log.cdp.filter((m) => m.kind === "log" && (m.level === "error" || m.level === "warning")).map((m) => `log.${m.level}(${m.source}): ${m.text} ${m.url}`),
  ...log.errors.map((e) => "pageerror: " + e),
];
const pwaWarn = (arr) => arr.filter((t) => /manifest|service ?worker|icon|apple-mobile|mobile-web-app|favicon/i.test(t));

// ═════════ A. file:// 相容（AC-37-01、AC-37-02、AC-24-12、AC-34-08 (a)、AC-21-01 (a)、AC-21-03） ═════════
async function fileCase(tc, ac, url, { offline = false, label }) {
  await R.check(tc, ac, async () => {
    const env = await newEnv(browser, { inits: INITS });
    if (offline) await env.ctx.setOffline(true);
    const page = await env.newPage();
    await page.goto(url); await sleep(800);
    await startLearning(page); await sleep(1500);
    const reg = await page.evaluate(async () => { try { if (!("serviceWorker" in navigator) || !navigator.serviceWorker) return "無 API"; const r = await navigator.serviceWorker.getRegistrations(); return r.length; } catch (e) { return "拒絕：" + e.name; } });
    const links = await page.evaluate(() => [...document.querySelectorAll("link")].map((l) => `${l.rel}=${l.getAttribute("href")}`));
    const prevented = await fireBip(page); await sleep(200);
    const ist = await installState(page);
    const nt = await ntInfo(page);
    const ops = await exercise(page);
    const backup = await exportImport(page);
    const caches = await cacheInfo(page);
    const idb = await page.evaluate(async () => (indexedDB.databases ? (await indexedDB.databases()).map((d) => d.name) : "不支援"));
    const ist2 = await installState(page);
    // 瀏覽器自身介面（如 Edge 下載中樞 edge://downloads-hub）的資源不是頁面請求，另列
    const internal = env.log.requests.filter((r) => /^(edge|chrome|devtools|chrome-extension):/.test(r.url));
    const net = env.log.requests.filter((r) => !(r.url === url && r.nav) && !/^(blob|data|edge|chrome|devtools|chrome-extension):/.test(r.url));
    const blobData = env.log.requests.filter((r) => /^(blob|data):/.test(r.url)).map((r) => r.url.slice(0, 30));
    const bad = consoleBad(env.log);
    const noCache = caches.unavailable || Object.keys(caches).length === 0;
    const ok = (reg === 0 || reg === "無 API" || String(reg).startsWith("拒絕")) && !links.some((l) => /^(manifest|apple-touch-icon)=/.test(l)) && links.every((l) => l === "icon=data:,")
      && net.length === 0 && bad.length === 0 && !prevented && ist.visible === 0 && ist.n === 0 && !ist.update && ist2.visible === 0 && !ist2.update
      && nt.exists && nt.exact && nt.afterExport && noCache && Array.isArray(idb) && idb.length === 0 && backup && backup.schemaVersion !== undefined;
    await env.ctx.close();
    return { ok, note: `${label}：getRegistrations=${reg}；DOM link=${JSON.stringify(links)}；替身安裝事件 preventDefault=${prevented}（未監聽）、安裝按鈕 ${ist.n}／顯示 ${ist.visible}、新版提示 ${ist.update}；NT-1 逐字=${nt.exact}、緊接匯出按鈕=${nt.afterExport}；操作 ${ops.join("、")}、匯出＋匯入備份；請求（不含主文件、blob/data）${net.length} 筆${net.length ? JSON.stringify(net.map((r) => r.url)) : ""}；blob/data ${blobData.length} 筆；瀏覽器內部頁面（下載介面等，非頁面請求）${internal.length} 筆；Console 錯誤／警告與例外 ${bad.length}${bad.length ? JSON.stringify(bad) : ""}；Cache Storage ${JSON.stringify(caches)}；IndexedDB ${JSON.stringify(idb)}` };
  });
}
await fileCase("TC-37-01a", "AC-37-01、AC-21-01、AC-34-08、AC-24-12、AC-21-03", FILE_URL, { label: `file:// 連網（${BROWSER}）` });
await fileCase("TC-37-01b", "AC-37-01、AC-21-01、AC-34-08", FILE_URL, { offline: true, label: `file:// 斷網（${BROWSER}）` });
{
  const lone = path.join(TMP, "lone"); fs.mkdirSync(lone, { recursive: true });
  const f = path.join(lone, "english-master-track.html"); fs.copyFileSync(DIST, f);
  await fileCase("TC-37-02", "AC-37-02、AC-24-12", pathToFileURL(f).href, { label: `只有 HTML 的空資料夾 ${fs.readdirSync(lone).join(",")}（${BROWSER}）` });
}

// AC-24-12：375／1366、file:// 與 localhost 文字相同、不被裁切與遮住
async function ntLayout(tc, url, label) {
  await R.check(tc, "AC-24-12", async () => {
    const out = []; let ok = true;
    for (const w of [375, 1366]) {
      const env = await newEnv(browser, { width: w, height: w === 375 ? 740 : 900, inits: INITS });
      const page = await env.newPage();
      await page.goto(url); await sleep(500); await startLearning(page); await sleep(300);
      const hiddenBefore = !(await visible(page, ".dash-backup__origin")); await expand(page); // 第 5 輪：收合時隱藏、展開後可見（AC-24-12 v0.12）
      const nt = await ntInfo(page); const lay = await layoutCheck(page, ".dash-backup__origin");
      const good = hiddenBefore && nt.exact && nt.afterExport && nt.sameBlock && !nt.dialog && lay.covered === 0 && !lay.clipped;
      ok = ok && good; out.push(`${w}px：收合時隱藏=${hiddenBefore}、展開後逐字=${nt.exact}、緊接匯出按鈕=${nt.afterExport}、同區塊=${nt.sameBlock}、非彈窗=${!nt.dialog}、遮住點 ${lay.covered}/5、裁切=${lay.clipped}、${lay.w}×${lay.h}`);
      await env.ctx.close();
    }
    return { ok, note: `${label}：${out.join("；")}` };
  });
}
await ntLayout("TC-24-12a", FILE_URL, "file://");

// AC-23-02（v0.11 修訂，Q-48）：資料來源與授權頁的品牌標識聲明，375px 可完整閱讀
if (!SMOKE) await R.check("TC-23-02c", "AC-23-02（v0.11 品牌標識聲明）", async () => {
  const BRAND = "PWA 圖示與名稱「EnglishContext」為品牌標識，著作權人 JimmyLin，保留所有權利，不適用 MIT 與 CC BY-SA 4.0";
  const out = []; let ok = true;
  for (const w of [375, 1366]) {
    const env = await newEnv(browser, { width: w, height: 740, inits: INITS }); const page = await env.newPage();
    await page.goto(FILE_URL); await sleep(500);
    await page.click("#footer-sources"); await sleep(400);
    const a = await page.evaluate((b) => { const els = [...document.querySelectorAll("li,p,dd,div")].filter((e) => e.children.length === 0 && e.textContent.includes(b));
      const e = els[0]; if (!e) return { found: false, body: document.body.innerText.includes(b) };
      const r = e.getBoundingClientRect(); return { found: true, exact: e.textContent.trim() === b || e.textContent.includes(b), left: r.left, right: r.right, vw: window.innerWidth, hscroll: document.documentElement.scrollWidth > window.innerWidth,
        others: ["程式碼以 MIT 授權（Copyright JimmyLin）", "單字資料以 CC BY-SA 4.0 授權"].map((t) => document.body.innerText.includes(t)) }; }, BRAND);
    const good = a.found && a.exact && a.left >= 0 && a.right <= a.vw + 0.5 && !a.hscroll && a.others.every(Boolean);
    ok = ok && good; out.push(`${w}px：聲明逐字存在=${a.found && a.exact}、在視窗內=${a.left >= 0 && a.right <= a.vw + 0.5}、水平捲軸=${a.hscroll}、既有 MIT／CC BY-SA 聲明仍在=${JSON.stringify(a.others)}`);
    await env.ctx.close();
  }
  return { ok, note: out.join("；") };
});

// ═════════ B. localhost（V-PWA (b)） ═════════
await serve(SITE);
const ALLOWED = allowedUrls(BASE);
{ const orig = R.check.bind(R); R.check = async (tc, ac, fn) => { await serve(SITE); return orig(tc, ac, fn); }; }

// AC-34-01、AC-34-04、AC-34-05（連結與圖示）
await R.check("TC-34-01", "AC-34-01", async () => {
  const env = await newEnv(browser, { inits: INITS }); const page = await env.newPage();
  await page.goto(BASE); await page.waitForLoadState("load"); await sleep(800);
  const links = await page.evaluate(() => [...document.querySelectorAll("link")].map((l) => ({ rel: l.rel, href: l.getAttribute("href"), abs: l.href, sizes: l.getAttribute("sizes") })));
  const mf = await env.ctx.request.get(BASE + "manifest.webmanifest");
  const mfBuf = await mf.body(); const mfJson = JSON.parse(mfBuf.toString("utf8"));
  const deep = JSON.stringify(mfJson) === JSON.stringify(MANIFEST_EXPECTED);
  const res = (u) => new URL(u, BASE + "manifest.webmanifest").href;
  const rel = ["id", "start_url", "scope"].map((k) => `${k}→${res(mfJson[k])}`);
  const relOk = ["id", "start_url", "scope"].every((k) => res(mfJson[k]) === BASE && !/^(\/|https?:)/.test(mfJson[k]));
  const icons = [];
  for (const ic of mfJson.icons) {
    const r = await env.ctx.request.get(res(ic.src)); const b = await r.body(); const d = decodePng(b);
    icons.push({ src: ic.src, status: r.status(), mime: r.headers()["content-type"], w: d.w, h: d.h, ct: d.ct, tRNS: d.tRNS, ok: r.status() === 200 && r.headers()["content-type"] === "image/png" && `${d.w}x${d.h}` === ic.sizes });
  }
  let appManifest = null, inst = null;
  try { appManifest = await page.__cdp.send("Page.getAppManifest"); inst = await page.__cdp.send("Page.getInstallabilityErrors"); } catch (e) { appManifest = { errors: ["CDP 失敗 " + e.message] }; }
  const mErr = (appManifest && appManifest.errors) || [];
  const iErrIncog = (inst && inst.installabilityErrors) || [];
  // Playwright 的 newContext 等同無痕（in-incognito 為環境因素）；改以一般設定檔（launchPersistentContext）再取一次
  const prof = fs.mkdtempSync(path.join(TMP, "prof-"));
  const pctx = await chromium.launchPersistentContext(prof, { channel: BROWSER === "edge" ? "msedge" : "chrome", headless: true, serviceWorkers: "allow" });
  const pp = pctx.pages()[0] || await pctx.newPage(); await pp.goto(BASE); await waitSW(pp); await pp.reload(); await pp.waitForLoadState("load"); await sleep(1500);
  const pcdp = await pctx.newCDPSession(pp);
  const iErr = ((await pcdp.send("Page.getInstallabilityErrors")).installabilityErrors) || [];
  const mErr2 = ((await pcdp.send("Page.getAppManifest")).errors) || [];
  await pctx.close();
  const bom = mfBuf[0] === 0xef;
  const ok = mf.status() === 200 && !bom && deep && Object.keys(mfJson).length === 10 && relOk && icons.length === 3 && icons.every((x) => x.ok)
    && links.some((l) => l.rel === "manifest" && l.href === "manifest.webmanifest") && mErr.length === 0 && mErr2.length === 0 && iErr.length === 0;
  await env.ctx.close();
  return { ok, note: `manifest ${mf.status()} ${mf.headers()["content-type"]}、BOM=${bom}、與契約常數深度相等=${deep}、鍵 ${Object.keys(mfJson).length}；${rel.join("、")}；圖示 ${JSON.stringify(icons)}；動態連結 ${JSON.stringify(links.map((l) => l.rel + "=" + l.href + (l.sizes ? "(" + l.sizes + ")" : "")))}；DevTools Manifest 錯誤 ${JSON.stringify(mErr)}（一般設定檔 ${JSON.stringify(mErr2)}）；可安裝性錯誤：一般設定檔 ${JSON.stringify(iErr)}（Playwright 無痕 context：${JSON.stringify(iErrIncog.map((e) => e.errorId))}，環境因素）` };
});

if (!SMOKE) {
  await R.check("TC-34-04", "AC-34-04", async () => {
    const env = await newEnv(browser, { inits: INITS }); const page = await env.newPage();
    await page.goto(BASE); await sleep(600);
    const a = await page.evaluate(() => ({ theme: (document.querySelector('meta[name="theme-color"]') || {}).content, bg: getComputedStyle(document.body).backgroundColor, entry: document.body.dataset.entry }));
    await env.ctx.close();
    const ok = a.theme === MANIFEST_EXPECTED.theme_color && a.bg === "rgb(238, 244, 250)" && a.entry === "firstRun";
    return { ok, note: `首次畫面（${a.entry}）：meta theme-color=${a.theme}（manifest ${MANIFEST_EXPECTED.theme_color}）；body 背景 ${a.bg}（manifest background_color ${MANIFEST_EXPECTED.background_color} = rgb(238, 244, 250)）` };
  });

  await R.check("TC-34-05a", "AC-34-05（連結與圖示部分；iOS 實機見 TC-PWA-H3）", async () => {
    const env = await newEnv(browser, { inits: INITS }); const page = await env.newPage();
    await page.goto(BASE); await page.waitForLoadState("load"); await sleep(500);
    const a = await page.evaluate(() => ({ link: [...document.querySelectorAll('link[rel="apple-touch-icon"]')].map((l) => ({ href: l.getAttribute("href"), sizes: l.getAttribute("sizes"), abs: l.href })),
      title: [...document.querySelectorAll('meta[name="apple-mobile-web-app-title"]')].map((m) => m.content), docTitle: document.title }));
    const r = a.link[0] ? await env.ctx.request.get(a.link[0].abs) : null; const d = r ? decodePng(await r.body()) : {};
    await env.ctx.close();
    const ok = a.link.length === 1 && a.link[0].sizes === "180x180" && r && r.status() === 200 && d.w === 180 && d.h === 180 && d.ct === 2 && !d.tRNS && a.title.length === 1 && a.title[0] === "EnglishContext" && a.docTitle === "EnglishContext";
    return { ok, note: `apple-touch-icon ${JSON.stringify(a.link)} → ${r && r.status()}、${d.w}×${d.h}、色彩類型 ${d.ct}（2=RGB 無 alpha）、tRNS=${d.tRNS}；apple-mobile-web-app-title=${JSON.stringify(a.title)}；<title>「${a.docTitle}」` };
  });

  // AC-34-03 自動化代理：圖示像素（四角藍色、無灰邊；maskable 安全圓外只有藍色補邊）
  await R.check("TC-34-03a", "AC-34-03（自動化代理；實機與 DevTools 遮罩預覽見 TC-PWA-H1／H2）", async () => {
    const notes = []; let ok = true;
    const blue = ([r, g, b]) => b >= 150 && b - r >= 60 && b - g >= 25;
    const grayish = ([r, g, b]) => Math.abs(r - g) < 18 && Math.abs(g - b) < 18 && r > 60;
    for (const f of ["icon-192.png", "icon-512.png", "apple-touch-icon-180.png", "icon-maskable-512.png"]) {
      const d = decodePng(fs.readFileSync(path.join(SITE, "icons", f)));
      const n = d.w; let edgeBad = 0, edgeGray = 0, edgeTotal = 0;
      for (let i = 0; i < n; i++) for (const [x, y] of [[i, 0], [i, n - 1], [0, i], [n - 1, i], [i, 1], [i, n - 2], [1, i], [n - 2, i]]) { edgeTotal++; const p = d.at(x, y); if (!blue(p)) edgeBad++; if (grayish(p)) edgeGray++; }
      const corners = [[0, 0], [n - 1, 0], [0, n - 1], [n - 1, n - 1]].map(([x, y]) => d.at(x, y));
      const edgeAvg = (pts) => { const t = [0, 0, 0]; for (const [x, y] of pts) { const p = d.at(x, y); t[0] += p[0]; t[1] += p[1]; t[2] += p[2]; } return t.map((v) => Math.round(v / pts.length)); };
      const idx = [...Array(n).keys()];
      const edges = { 上緣: edgeAvg(idx.map((i) => [i, 0])), 下緣: edgeAvg(idx.map((i) => [i, n - 1])), 左緣: edgeAvg(idx.map((i) => [0, i])), 右緣: edgeAvg(idx.map((i) => [n - 1, i])), 下緣上一列: edgeAvg(idx.map((i) => [i, n - 2])) };
      let line = `${f}：${n}×${n}、外圈 2px 非藍 ${edgeBad}/${edgeTotal}、灰 ${edgeGray}、四角 ${JSON.stringify(corners)}、各邊平均色 ${JSON.stringify(edges)}`;
      let good = edgeGray === 0 && corners.every(blue) && edgeBad / edgeTotal < 0.01;
      if (f === "icon-maskable-512.png") {
        // 安全區：中心圓、直徑 = 邊長 80%（半徑 204.8px）；圓外不得有白色文字或橘色對話框像素
        let white = 0, orange = 0, outside = 0, maxR = 0;
        for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
          const p = d.at(x, y); const rr = Math.hypot(x + 0.5 - n / 2, y + 0.5 - n / 2);
          const isW = p[0] > 200 && p[1] > 200 && p[2] > 200; const isO = p[0] > 190 && p[1] > 80 && p[1] < 190 && p[2] < 110;
          if (isW || isO) maxR = Math.max(maxR, rr);
          if (rr > n * 0.4) { outside++; if (isW) white++; if (isO) orange++; }
        }
        line += `；安全圓外像素 ${outside}：白 ${white}、橘 ${orange}；白／橘像素最遠距中心 ${maxR.toFixed(1)}px（安全圓半徑 ${(n * 0.4).toFixed(1)}px）`;
        good = good && white === 0 && orange === 0;
      }
      ok = ok && good; notes.push(line);
    }
    return { ok, note: notes.join("；") };
  });
}

// AC-35-01：註冊與快取；同時記錄首次造訪的請求（AC-37-05 部分）
let V1_ID = null;
await R.check("TC-35-01", "AC-35-01、AC-21-03", async () => {
  const env = await newEnv(browser, { inits: INITS }); const page = await env.newPage();
  await page.goto(BASE);
  const sw = await waitSW(page, 10000);
  await sleep(300);
  const caches = await cacheInfo(page);
  const names = Object.keys(caches); const mine = names.filter((n) => n.startsWith(CACHE_PREFIX));
  const want = PRECACHE.map((u) => new URL(u, BASE).href).sort();
  const got = mine.length === 1 ? caches[mine[0]].slice().sort() : [];
  V1_ID = await page.evaluate(() => document.querySelector('meta[name="emt-build-id"]').content);
  const idb = await page.evaluate(async () => (await indexedDB.databases()).map((d) => d.name));
  await env.ctx.close();
  const ok = sw.ok && sw.ms <= 10000 && sw.count === 1 && sw.scope === BASE && sw.script === BASE + "sw.js" && new URL(sw.script).origin === ORIGIN
    && names.length === 1 && mine.length === 1 && mine[0] === CACHE_PREFIX + V1_ID && JSON.stringify(got) === JSON.stringify(want) && idb.length === 0;
  return { ok, note: `啟用 ${sw.ms} ms、註冊 ${sw.count} 個、scope ${sw.scope}、腳本 ${sw.script}；快取 ${JSON.stringify(names)}（BUILD_ID ${V1_ID}）；項目 ${got.length}：${JSON.stringify(got.map((u) => u.replace(ORIGIN, "")))}；與預先快取清單相同=${JSON.stringify(got) === JSON.stringify(want)}；IndexedDB ${JSON.stringify(idb)}` };
});

// AC-37-05、AC-21-01 (b)、AC-21-03：完整操作（含匯出入、STT）期間環境層請求
if (!SMOKE) await R.check("TC-37-05a", "AC-37-05、AC-21-01、AC-21-03", async () => {
  const env = await newEnv(browser, { inits: INITS }); const page = await env.newPage();
  await page.goto(BASE); await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, JSON.stringify(seedRec())]);
  await page.reload(); await waitSW(page); await page.reload(); await page.waitForLoadState("load"); await sleep(1500);
  const before = env.log.requests.length;
  const ops = await exercise(page); const backup = await exportImport(page); await sleep(500);
  const after = env.log.requests.slice(before).filter((r) => !/^(blob|data):/.test(r.url));
  const all = env.log.requests.filter((r) => !/^(blob|data):/.test(r.url));
  const bad = all.filter((r) => !ALLOWED.has(r.url) || r.method !== "GET" || r.body || new URL(r.url).search !== "" || new URL(r.url).origin !== ORIGIN);
  const swReqs = all.filter((r) => r.sw).map((r) => r.url.replace(ORIGIN, ""));
  const caches = await cacheInfo(page); const idb = await page.evaluate(async () => (await indexedDB.databases()).map((d) => d.name));
  const cacheOk = Object.keys(caches).length === 1 && Object.values(caches)[0].every((u) => ALLOWED.has(u) && !u.endsWith("sw.js"));
  const store = await readStore(page);
  await env.ctx.close();
  const ok = bad.length === 0 && after.length === 0 && cacheOk && idb.length === 0 && Object.keys(store).every((k) => k.startsWith("englishMasterTrack:")) && consoleBad(env.log).length === 0;
  return { ok, note: `整個工作階段請求 ${all.length} 筆（含 service worker 發出 ${swReqs.length} 筆：${JSON.stringify(swReqs)}）：${JSON.stringify([...new Set(all.map((r) => r.method + " " + r.url.replace(ORIGIN, "")))])}；不在允許清單／非 GET／帶本文／有查詢字串／跨來源 ${bad.length}${bad.length ? JSON.stringify(bad.map((r) => r.method + " " + r.url)) : ""}；載入完成後操作（${ops.join("、")}、匯出＋匯入）請求 ${after.length}；Cache Storage ${JSON.stringify(Object.fromEntries(Object.entries(caches).map(([k, v]) => [k, v.length])))}；IndexedDB ${JSON.stringify(idb)}；localStorage 鍵 ${JSON.stringify(Object.keys(store))}；Console 錯誤／警告 ${consoleBad(env.log).length}` };
});

// AC-35-02、AC-35-04：離線開啟（停止伺服器＋context 離線）
await R.check("TC-35-02", "AC-35-02、AC-19-02（離線範圍）", async () => {
  const env = await newEnv(browser, { inits: INITS }); const page = await env.newPage();
  await page.goto(BASE); await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, JSON.stringify(seedRec())]);
  await page.reload(); await waitSW(page); await sleep(500);
  const store0 = await readStore(page);
  await stopServer(); await env.ctx.setOffline(true);
  const out = []; let ok = true;
  try {
  for (const u of [BASE, BASE + "index.html"]) {
    const n0 = env.log.responses.length;
    const resp = await page.goto(u); await sleep(800);
    const fromSW = resp ? resp.fromServiceWorker() : false;
    const st = await readStore(page); const kept = !!st[KEY] && (u !== BASE || st[KEY] === store0[KEY]); // 第一次離線載入時與離線前逐字相同
    const a = await page.evaluate(() => ({ entry: document.body.dataset.entry, entries: document.querySelectorAll("#view-dashboard .db-start").length, streak: (document.querySelector("#view-dashboard .db-stats") || {}).innerText || "" }));
    const ops = await exercise(page);
    const resErr = [...env.log.cdp.filter((m) => m.kind === "log" && m.level === "error"), ...env.log.console.filter((m) => m.type === "error")];
    const allSW = env.log.responses.slice(n0).filter((r) => r.url.startsWith(ORIGIN)).every((r) => r.fromSW);
    const good = kept && fromSW && allSW && a.entry === "main" && a.entries > 0 && ops.length >= 6 && resErr.length === 0 && env.log.errors.length === 0;
    ok = ok && good;
    out.push(`${u.replace(ORIGIN, "")}：學習資料保留=${kept}、回應來自 service worker=${fromSW}（同源回應皆來自 SW=${allSW}）、${a.entry}、「開始今日學習」${a.entries}、操作 ${ops.join("、")}、資源錯誤 ${resErr.length}${resErr.length ? JSON.stringify(resErr).slice(0, 200) : ""}`);
  }
  return { ok, note: out.join("；") + "；離線操作後學習紀錄照常寫入 localStorage（連續天數等因操作而更新屬正常）" };
  } finally { await env.ctx.close(); await serve(SITE); }
});

if (!SMOKE) await R.check("TC-35-04", "AC-35-04", async () => {
  const env = await newEnv(browser, { inits: INITS }); const page = await env.newPage();
  await page.goto(BASE); await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, JSON.stringify(seedRec())]);
  await page.reload(); await waitSW(page); await sleep(300);
  await stopServer(); await env.ctx.setOffline(true);
  const ready = () => page.waitForFunction(() => { const e = document.querySelector("#view-dashboard .db-start"); if (!e || e.disabled) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && document.body.dataset.entry === "main"; }, null, { timeout: 15000, polling: "raf" });
  const runs = { normal: [], cpu4: [] };
  for (const mode of ["normal", "cpu4"]) {
    await page.__cdp.send("Emulation.setCPUThrottlingRate", { rate: mode === "cpu4" ? 4 : 1 });
    for (let i = 0; i < 5; i++) { await page.reload({ waitUntil: "commit" }); await ready(); runs[mode].push(Math.round(await page.evaluate(() => performance.now()))); await sleep(200); }
  }
  await page.__cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  await env.ctx.close(); await serve(SITE);
  const ok = runs.normal.every((t) => t <= 3000) && runs.cpu4.every((t) => t <= 6000);
  return { ok, note: `離線（伺服器停止＋context 離線）重新載入到主控台「開始今日學習」可點擊：一般 ${runs.normal.join("、")} ms（門檻每次 ≤ 3000）；4 倍 CPU 降速 ${runs.cpu4.join("、")} ms（門檻每次 ≤ 6000）` };
});

// AC-34-07～AC-34-10：安裝按鈕（替身事件）
await R.check("TC-34-07", "AC-34-07、AC-34-08 (f)", async () => {
  const notes = []; let ok = true;
  for (const w of [1366, 375]) {
    const env = await newEnv(browser, { width: w, height: w === 375 ? 740 : 900, inits: INITS }); const page = await env.newPage();
    await page.goto(BASE); await page.waitForLoadState("load"); await sleep(600);
    // 首次畫面：事件到來也不顯示
    const p0 = await fireBip(page); await sleep(150); const f0 = await installState(page);
    await startLearning(page); await sleep(300);
    const s1 = await installState(page);
    // 重新載入 → 事件前不顯示
    await page.reload(); await page.waitForLoadState("load"); await sleep(600);
    const s2 = await installState(page);
    const prevented = await fireBip(page); await sleep(200);
    const s3c = await installState(page); await expand(page); // 第 5 輪：收合時隨區塊隱藏，展開即可見（AC-34-07 v0.12）
    const s3 = await installState(page);
    const lay = await layoutCheck(page, '[data-action="install-app"]');
    const nt = await ntInfo(page);
    const others = {};
    for (const t of ["customizer", "flashcards", "part5"]) { await goTab(page, t); others[t] = (await installState(page)).visible; }
    await page.click("#footer-sources"); await sleep(250); others.sources = (await installState(page)).visible;
    const navHas = await page.evaluate(() => !!document.querySelector('#app-nav [data-action="install-app"], header [data-action="install-app"]'));
    await goTab(page, "dashboard"); const back = await installState(page);
    const banners = await page.evaluate(() => document.querySelectorAll(".dialog,[role=dialog]").length);
    const good = f0.entry === "firstRun" && f0.visible === 0 && s2.visible === 0 && s2.boxHidden === true && s2.boxH === 0 && prevented && s3c.visible === 0 && s3c.expanded === "false" && s3.visible === 1 && s3.text === "安裝 App"
      && lay.w >= 44 && lay.h >= 44 && lay.covered === 0 && !lay.clipped && nt.installAfter && Object.values(others).every((v) => v === 0) && !navHas && back.visible === 1 && s3.prompts === 0 && banners === 0;
    ok = ok && good;
    notes.push(`${w}px：首次畫面收到事件 → 顯示 ${f0.visible}（preventDefault=${p0}）；開始學習後主控台 ${s1.visible}（首次畫面事件已存）；重新載入事件前 ${s2.visible}（容器 hidden=${s2.boxHidden}、高 ${s2.boxH}px）；事件後收合中 ${s3c.visible}、展開後 ${s3.visible}「${s3.text}」preventDefault=${prevented}；${lay.w}×${lay.h}、遮住點 ${lay.covered}/5、裁切=${lay.clipped}、位於 NT-1 之後=${nt.installAfter}；其他畫面 ${JSON.stringify(others)}、導覽列內=${navHas}；回主控台（仍展開=${back.expanded}）${back.visible}；自動 prompt ${s3.prompts} 次；彈窗 ${banners}；瀏覽器真實事件 ${s3.trusted} 次`);
    await env.ctx.close();
  }
  return { ok, note: notes.join("；") };
});

if (!SMOKE) {
  await R.check("TC-34-08", "AC-34-08 (b)(d)、AC-34-06 (b)", async () => {
    const notes = []; let ok = true;
    for (const [label, init] of [
      ["(d) display-mode: standalone", `(() => { const o = window.matchMedia.bind(window); window.matchMedia = (q) => /display-mode:\\s*standalone/.test(q) ? { matches: true, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} } : o(q); })();`],
      ["(b) iOS navigator.standalone", `(() => { Object.defineProperty(Navigator.prototype, "standalone", { get: () => true, configurable: true }); })();`],
    ]) {
      const env = await newEnv(browser, { inits: [...INITS, init] }); const page = await env.newPage();
      await page.goto(BASE); await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, JSON.stringify(seedRec())]); await page.reload(); await page.waitForLoadState("load"); await sleep(600); await expand(page);
      const prevented = await fireBip(page); await sleep(200); const s = await installState(page);
      const bad = consoleBad(env.log);
      const good = s.visible === 0 && s.n === 0 && s.boxHidden === true && bad.length === 0 && !prevented;
      ok = ok && good; notes.push(`${label}：替身事件 preventDefault=${prevented}、按鈕 ${s.n}、容器 hidden=${s.boxHidden}、Console 錯誤 ${bad.length}`);
      await env.ctx.close();
    }
    return { ok, note: notes.join("；") + "；(c) Firefox／桌機 Safari 不觸發事件 = (f) 情境，見 TC-34-07「事件前不顯示」；(a) 見 TC-37-01a" };
  });

  const installFlow = async (tc, ac, outcome, fn) => R.check(tc, ac, async () => {
    const env = await newEnv(browser, { inits: INITS }); const page = await env.newPage();
    await page.goto(BASE); await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, JSON.stringify(seedRec())]); await page.reload(); await page.waitForLoadState("load"); await sleep(600);
    await fireBip(page, outcome); await sleep(200); await expand(page);
    const r = await fn(page, env);
    await env.ctx.close();
    return r;
  });
  await installFlow("TC-34-09a", "AC-34-09 (a)", "accepted", async (page, env) => {
    const s0 = await readStore(page); const url0 = page.url();
    await page.click('[data-action="install-app"]'); const s1 = await installState(page); await sleep(300);
    await fireInstalled(page); await sleep(200); const s2 = await installState(page);
    await fireBip(page); await sleep(200); const s3 = await installState(page);
    const s4 = await readStore(page); const toasts = await page.evaluate(() => window.__qaToasts.length);
    const ok = s1.visible === 0 && s1.prompts === 1 && s2.visible === 0 && s3.visible === 0 && s3.prompts === 1 && JSON.stringify(s0) === JSON.stringify(s4) && page.url() === url0 && s3.tab === "dashboard" && toasts === 0 && env.log.errors.length === 0;
    return { ok, note: `按下 → 立即隱藏=${s1.visible === 0}、prompt ${s1.prompts} 次；appinstalled 後 ${s2.visible}；再次事件 ${s3.visible}（prompt 累計 ${s3.prompts}）；資料不變=${JSON.stringify(s0) === JSON.stringify(s4)}、網址與分頁不變=${page.url() === url0 && s3.tab === "dashboard"}；訊息 ${toasts}；例外 ${env.log.errors.length}；(d)(e) 見 TC-34-08` };
  });
  await installFlow("TC-34-09b", "AC-34-09 (b)、AC-34-10", "dismissed", async (page, env) => {
    const s0 = await readStore(page);
    await page.click('[data-action="install-app"]'); await sleep(300); const s1 = await installState(page);
    await fireBip(page); await sleep(200); const s1b = await installState(page);
    const toasts = await page.evaluate(() => window.__qaToasts.length);
    await page.reload(); await page.waitForLoadState("load"); await sleep(600); await expand(page); const s2 = await installState(page);
    await fireBip(page); await sleep(200); const s3 = await installState(page);
    const s4 = await readStore(page);
    const ok = s1.visible === 0 && s1.prompts === 1 && s1b.visible === 0 && toasts === 0 && s2.visible === 0 && s3.visible === 1 && JSON.stringify(s0) === JSON.stringify(s4) && env.log.errors.length === 0;
    return { ok, note: `拒絕 → 隱藏=${s1.visible === 0}、prompt ${s1.prompts}、本頁再次事件 ${s1b.visible}、訊息 ${toasts}；重新載入事件前 ${s2.visible}、（模擬解除安裝後）瀏覽器再次觸發 → ${s3.visible}；學習資料不變=${JSON.stringify(s0) === JSON.stringify(s4)}；例外 ${env.log.errors.length}` };
  });
  await installFlow("TC-34-09c", "AC-34-09 (c)", "accepted", async (page, env) => {
    await page.evaluate(() => { const b = document.querySelector('[data-action="install-app"]'); b.click(); b.click(); });
    await page.click('[data-action="install-app"]', { timeout: 500 }).catch(() => {}); await sleep(300);
    const s = await installState(page);
    const ok = s.prompts === 1 && s.visible === 0 && env.log.errors.length === 0 && consoleBad(env.log).length === 0;
    return { ok, note: `同步連點 2 次＋再點 1 次：prompt ${s.prompts} 次、按鈕 ${s.visible}、例外 ${env.log.errors.length}、Console 錯誤 ${consoleBad(env.log).length}` };
  });
}

// AC-35-05：圖示 404 → 安裝（預先快取）失敗
async function siteVariant(name, remove) {
  const d = path.join(TMP, name); fs.cpSync(SITE, d, { recursive: true });
  for (const f of remove) fs.rmSync(path.join(d, f), { recursive: true, force: true });
  return d;
}
if (!SMOKE) {
  await R.check("TC-35-05", "AC-35-05", async () => {
    await serve(await siteVariant("site-noicon", ["icons/icon-512.png"]));
    const env = await newEnv(browser, { inits: INITS }); const page = await env.newPage();
    await page.goto(BASE); await page.waitForLoadState("load"); await sleep(3000);
    await startLearning(page); const s = await readStore(page);
    const ops = await exercise(page);
    const regs = await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).map((r) => ({ a: !!r.active, i: !!r.installing, w: !!r.waiting })));
    const caches = await cacheInfo(page); const ist = await installState(page);
    const errs = [...env.log.errors, ...env.log.console.filter((m) => m.type === "error" && !/Failed to load resource|404/.test(m.text)).map((m) => m.text)];
    await env.ctx.close();
    const ok = !!s[KEY] && ops.length >= 6 && Object.keys(caches).filter((n) => n.startsWith(CACHE_PREFIX)).length === 0 && errs.length === 0 && !ist.update;
    return { ok, note: `icons/icon-512.png 回應 404：註冊 ${JSON.stringify(regs)}；Cache Storage ${JSON.stringify(caches)}（不留部分快取）；寫入 localStorage=${!!s[KEY]}；操作 ${ops.join("、")}；未處理錯誤／非 404 的 Console 錯誤 ${errs.length}${errs.length ? JSON.stringify(errs) : ""}；新版提示 ${ist.update}` };
  });

  await R.check("TC-37-03", "AC-37-03、AC-34-06", async () => {
    await serve(await siteVariant("site-noassets", ["manifest.webmanifest", "sw.js", "icons"]));
    const env = await newEnv(browser, { inits: INITS }); const page = await env.newPage();
    await page.goto(BASE); await page.waitForLoadState("load"); await sleep(2500);
    await startLearning(page); const ops = await exercise(page); const backup = await exportImport(page);
    const ist = await installState(page);
    const errs = env.log.errors;
    const cons = env.log.console.filter((m) => m.type === "error").map((m) => m.text);
    const non404 = cons.filter((t) => !/Failed to load resource|404|Manifest/i.test(t));
    const logs = env.log.cdp.filter((m) => m.kind === "log" && m.level === "error").map((m) => `${m.source}:${m.text}`);
    await env.ctx.close(); await serve(SITE);
    const ok = errs.length === 0 && non404.length === 0 && ist.visible === 0 && !ist.update && ops.length >= 6 && !!backup;
    return { ok, note: `manifest、sw.js、icons/ 全部 404：未處理例外 ${errs.length}；Console 錯誤 ${cons.length}（${JSON.stringify(cons)}；非 404 類 ${non404.length}）；Log 錯誤 ${JSON.stringify(logs)}；操作 ${ops.join("、")}＋匯出入；安裝按鈕 ${ist.visible}、新版提示 ${ist.update}` };
  });

  // AC-37-04：啟用條件
  await R.check("TC-37-04", "AC-37-04", async () => {
    const out = []; let ok = true;
    // (1) 127.0.0.1 → 註冊
    { const env = await newEnv(browser, { inits: INITS }); const page = await env.newPage();
      await page.goto(`http://127.0.0.1:8080/english-master-track/`); const sw = await waitSW(page, 10000);
      const links = await page.evaluate(() => [...document.querySelectorAll("link")].map((l) => l.rel));
      ok = ok && sw.ok && links.includes("manifest"); out.push(`127.0.0.1：註冊並啟用=${sw.ok}（scope ${sw.scope}）、manifest 連結=${links.includes("manifest")}`); await env.ctx.close(); }
    // (2) 非 localhost 的 http（emt.test 對應 127.0.0.1，非安全環境）→ 不註冊
    { const env = await newEnv(browser, { inits: INITS }); const page = await env.newPage();
      await page.goto(`http://emt.test:8080/english-master-track/`); await page.waitForLoadState("load"); await sleep(2000);
      const a = await page.evaluate(async () => ({ secure: window.isSecureContext, hasSW: !!navigator.serviceWorker, links: [...document.querySelectorAll("link")].map((l) => l.rel) }));
      await startLearning(page); const ops = await exercise(page);
      const reqs = [...new Set(env.log.requests.map((r) => r.url.replace("http://emt.test:8080", "")))];
      const bad = consoleBad(env.log);
      const good = !a.secure && !a.links.includes("manifest") && !reqs.some((u) => /sw\.js|manifest|icons\//.test(u)) && bad.length === 0 && ops.length >= 6;
      ok = ok && good; out.push(`http://emt.test（非安全環境）：isSecureContext=${a.secure}、DOM link ${JSON.stringify(a.links)}、請求 ${JSON.stringify(reqs)}、Console 錯誤／警告 ${bad.length}${bad.length ? JSON.stringify(bad) : ""}、操作 ${ops.length} 項`); await env.ctx.close(); }
    // (3) 停用 service worker 的環境（Playwright serviceWorkers: "block"）
    { const env = await newEnv(browser, { serviceWorkers: "block", inits: INITS }); const page = await env.newPage();
      await page.goto(BASE); await page.waitForLoadState("load"); await sleep(2000);
      await startLearning(page); const ops = await exercise(page);
      const regs = await page.evaluate(async () => { try { return (await navigator.serviceWorker.getRegistrations()).length; } catch (e) { return e.name; } });
      const errs = [...env.log.errors, ...env.log.console.filter((m) => m.type === "error").map((m) => m.text)];
      const good = errs.length === 0 && ops.length >= 6;
      ok = ok && good; out.push(`停用 service worker：註冊 ${regs}、未處理錯誤／Console 錯誤 ${errs.length}${errs.length ? JSON.stringify(errs) : ""}、線上操作 ${ops.length} 項`); await env.ctx.close(); }
    return { ok, note: out.join("；") + "；判定表與 file:／192.168.x 等見單元測試 pwa-core.test.js（V-PWA-08）" };
  });

  // AC-37-06：加入 PWA 前已在網址版學習（第 5 輪：HEAD 已是 v0.11 PWA 版，改取加入 PWA 前的提交 e9372f2 的 dist 模擬）
  await R.check("TC-37-06", "AC-37-06", async () => {
    const pre = path.join(TMP, "site-prepwa"); fs.mkdirSync(pre, { recursive: true });
    fs.writeFileSync(path.join(pre, "index.html"), execFileSync("git", ["show", "e9372f2:dist/english-master-track.html"], { cwd: ROOT, maxBuffer: 64 << 20 }));
    await serve(pre);
    const env = await newEnv(browser, { inits: INITS }); const page = await env.newPage();
    await page.goto(BASE); await sleep(800);
    const preBuild = await page.evaluate(() => !!document.querySelector('meta[name="emt-build-id"]'));
    await startLearning(page);
    await goTab(page, "flashcards"); await page.click(".fc-flip"); await sleep(450); await page.click(".fc-next"); await sleep(200);
    await goTab(page, "part5"); const o = await page.$$("[data-p5=option]"); if (o[0]) await o[0].click(); await sleep(300);
    await goTab(page, "dashboard");
    const before = await readStore(page);
    await serve(SITE);
    await page.reload(); const sw = await waitSW(page); await page.reload(); await page.waitForLoadState("load"); await sleep(800);
    const after = await readStore(page); const entry = await page.evaluate(() => document.body.dataset.entry);
    const b = JSON.parse(before[KEY]), a = JSON.parse(after[KEY]);
    const keysSame = JSON.stringify(Object.keys(before).sort()) === JSON.stringify(Object.keys(after).sort());
    const fieldsSame = JSON.stringify(Object.keys(b.data).sort()) === JSON.stringify(Object.keys(a.data).sort()) && JSON.stringify(Object.keys(b).sort()) === JSON.stringify(Object.keys(a).sort());
    const dataSame = JSON.stringify(b.data) === JSON.stringify(a.data);
    await env.ctx.close();
    const ok = !preBuild && sw.ok && keysSame && fieldsSame && dataSame && a.schemaVersion === 2 && entry === "main";
    return { ok, note: `加入 PWA 前版本（git e9372f2 的 dist，無建置識別碼=${!preBuild}）學習後換成 PWA 版：service worker 啟用=${sw.ok}；再載入 ${entry}；localStorage 鍵 ${JSON.stringify(Object.keys(after))} 相同=${keysSame}；StorageRecord／data 欄位集合相同=${fieldsSame}；data 內容完全相同=${dataSame}；schemaVersion ${a.schemaVersion}${dataSame ? "" : "；差異 前 " + JSON.stringify(b.data).slice(0, 300) + " 後 " + JSON.stringify(a.data).slice(0, 300)}` };
  });

  await ntLayout("TC-24-12b", BASE, "localhost（V-PWA (b)）");
}

await browser.close();
await stopServer();
R.save(resultPath("e2e-pwa"));
const c = (k) => R.results.filter((r) => r.result === k).length;
console.log(`e2e-pwa（${BROWSER}）：通過 ${c("通過")}、失敗 ${c("失敗")}、待人工 ${c("待人工")}`);
