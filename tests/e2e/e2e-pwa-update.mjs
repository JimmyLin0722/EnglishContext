// QA 第 4 輪（PRD v0.11 US-36）：重新部署後更新（V1 = dist/site，V2 = 以 src/app 複本改 1 個字建置；不修改 src/）。
// 涵蓋 AC-36-03～AC-36-06、AC-37-05（經過 1 次更新）、AC-31-03（提示無動畫）、AC-27-03（提示不被遮住）。
// 同一埠 8080 換目錄重啟 tools/serve.mjs 模擬重新部署（同來源）；停止伺服器模擬裝置離線。
// 執行：node tests/e2e/e2e-pwa-update.mjs
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  ROOT, SITE, BASE, ORIGIN, KEY, CACHE_PREFIX, sleep, allowedUrls, serve, stopServer, launchBrowser, newEnv,
  startLearning, goTab, waitSW, cacheInfo, cachedBuildId, pageBuildId, readStore, layoutCheck, recorder, resultPath,
} from "./lib/pwa-env.mjs";
import { TOAST_RECORDER, fakeTts, fakeStt, fakeMic } from "./lib/inits.mjs";
import { stateRecord } from "./lib/state.mjs";

const R = recorder("e2e-pwa-update");
const TMP = fs.mkdtempSync(path.join(process.env.QA_TMP || os.tmpdir(), "pwa-upd-"));
const INITS = [TOAST_RECORDER, fakeTts("ok"), fakeStt("ok"), fakeMic("ok", -25)];
const ALLOWED = allowedUrls(BASE);

// ── 準備 V2（architecture §10.4「準備 V2」）──
const app2 = path.join(TMP, "app"); fs.cpSync(path.join(ROOT, "src/app"), app2, { recursive: true, filter: (s) => !s.includes("__tests__") });
{ const f = path.join(app2, "main.js"); const s = fs.readFileSync(f, "utf8"); const i = s.indexOf("。"); fs.writeFileSync(f, s.slice(0, i) + "，" + s.slice(i + 1)); }
const b = spawnSync(process.execPath, ["tools/build.mjs", "--app", app2, "--out", path.join(TMP, "v2", "t.html")], { cwd: ROOT, encoding: "utf8" });
if (b.status !== 0) throw new Error("V2 建置失敗：" + b.stdout + b.stderr);
const V2DIR = path.join(TMP, "v2", "site");
const idOf = (dir) => (fs.readFileSync(path.join(dir, "index.html"), "utf8").match(/<meta name="emt-build-id" content="([0-9a-f]+)">/) || [])[1];
const V1 = idOf(SITE), V2 = idOf(V2DIR);
console.log(`V1 ${V1}、V2 ${V2}`);

const notice = (page) => page.evaluate(() => {
  const h = document.querySelector("#pwa-update"); if (!h) return { exists: false };
  const s = getComputedStyle(h); const vis = !h.hidden && s.display !== "none" && h.getBoundingClientRect().height > 0;
  const btn = h.querySelector("button"); const txt = h.querySelector(".pwa-update__text");
  const media = h.querySelectorAll("img,svg,video,canvas,iframe").length;
  const anim = [h, btn, txt].filter(Boolean).map((e) => { const c = getComputedStyle(e); return `${c.animationName}/${c.transitionDuration}`; });
  return { exists: true, vis, text: txt ? txt.textContent : null, btn: btn ? btn.textContent : null, role: h.getAttribute("role"), media, anim, dialog: !!h.closest("[role=dialog],.dialog"), inMain: !!h.closest("#app-main") };
});
async function waitNotice(page, ms = 60000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { const n = await notice(page); if (n.vis) return { ...n, ms: Date.now() - t0 }; await sleep(250); }
  return { ...(await notice(page)), ms: null };
}
const seedRec = () => stateRecord(465, { sttNoticeAcknowledged: true, streak: { days: 5, lastActiveDate: null }, vocabQuiz: { answered: 9, correct: 7 },
  part5: { currentIndex: 3, lockedSelection: null, phase: "question", roundAnswered: 3, roundCorrect: 2, totalAnswered: 12, totalCorrect: 8 },
  customVocab: [{ word: "Qaword", meaning: "測試字", phonetic: "", pos: "", collocation: "", example: "", academicContext: "", custom: true }].slice(0, 0) });

const browser = await launchBrowser();
await serve(SITE);

// ── 各情境先在 V1 啟用 service worker ──
async function prepare({ seed = true, reduced } = {}) {
  const env = await newEnv(browser, { inits: INITS, reducedMotion: reduced });
  const page = await env.newPage();
  await page.goto(BASE);
  if (seed) { await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, JSON.stringify(seedRec())]); await page.reload(); }
  const sw = await waitSW(page); await sleep(1500);
  return { env, page, sw };
}
const A = await prepare({ reduced: "reduce" });     // 有學習資料、按「更新版本」、減少動態
const Bf = await prepare({ seed: false });          // 首次畫面（無狀態鍵）
const C = await prepare();                           // 離線時已部署 V2
const D = await prepare();                           // 不按「更新版本」
await A.page.evaluate(async () => { const c = await caches.open("other-project-cache"); await c.put("/other-project/data.txt", new Response("keep-me", { headers: { "Content-Type": "text/plain" } })); });

await R.check("TC-36-03a", "AC-36-03（首次安裝不提示、不重新載入）、AC-35-01", async () => {
  const out = []; let ok = true;
  for (const [n, x] of [["A", A], ["B", Bf], ["C", C], ["D", D]]) {
    const nt = await notice(x.page); const navs = x.env.log.navigations.length; const id = await pageBuildId(x.page);
    const good = x.sw.ok && x.sw.controller !== undefined && !nt.vis && id === V1;
    ok = ok && good; out.push(`${n}：啟用=${x.sw.ok}（${x.sw.ms} ms）、提示=${nt.vis}、主框架導覽 ${navs} 次、識別碼 ${id}`);
  }
  const navA = A.env.log.navigations.length;
  return { ok: ok && navA === 2, note: out.join("；") + `（A 導覽 2 次 = 開啟＋寫入狀態後重新載入，clients.claim() 後未自動重新載入）` };
});

// ── C：V2 部署前後裝置離線（AC-36-06）──
await stopServer();
await R.check("TC-36-06", "AC-36-06", async () => {
  await C.page.reload(); await sleep(4000);
  const n1 = await notice(C.page); const id1 = await pageBuildId(C.page); const e1 = await C.page.evaluate(() => document.body.dataset.entry);
  const errs = [...C.env.log.errors, ...C.env.log.console.filter((m) => m.type === "error").map((m) => m.text)];
  // 恢復連網（伺服器已是 V2）後再開啟
  await serve(V2DIR);
  await C.page.reload(); const n2 = await waitNotice(C.page, 60000);
  const ok = !n1.vis && id1 === V1 && e1 === "main" && errs.length === 0 && n2.vis;
  return { ok, note: `離線（伺服器停止）開啟：識別碼 ${id1}、${e1}、提示=${n1.vis}、錯誤 ${errs.length}${errs.length ? JSON.stringify(errs) : ""}；恢復連網（V2 已部署）重新開啟 → ${n2.ms} ms 後顯示提示=${n2.vis}` };
});

// ── A：連網重新載入 → 60 秒內提示 → 按「更新版本」（AC-36-03、AC-36-04、AC-36-05、AC-31-03、AC-27-03）──
const storeA0 = await readStore(A.page);
await R.check("TC-36-03b", "AC-36-03、AC-31-03、AC-27-03", async () => {
  await A.page.reload(); const t0 = Date.now();
  const n = await waitNotice(A.page, 60000);
  const caches = await cacheInfo(A.page); const mine = Object.keys(caches).filter((k) => k.startsWith(CACHE_PREFIX));
  const v2cache = mine.find((k) => k.endsWith(V2));
  const htmlId = v2cache ? await cachedBuildId(A.page, v2cache, BASE) : null;
  const htmlId2 = v2cache ? await cachedBuildId(A.page, v2cache, BASE + "index.html") : null;
  const lay = await layoutCheck(A.page, "#pwa-update");
  const pageId = await pageBuildId(A.page);
  const narrow = await (async () => { await A.page.setViewportSize({ width: 375, height: 740 }); await sleep(200); const l = await layoutCheck(A.page, ".pwa-update__btn"); await A.page.setViewportSize({ width: 1366, height: 900 }); return l; })();
  const noAnim = n.anim.every((a) => /^none\/0s$/.test(a));
  const ok = n.vis && n.ms !== null && n.ms <= 60000 && n.text === "有新版本，請更新版本" && n.btn === "更新版本" && n.media === 0 && !n.dialog && noAnim && lay.covered === 0 && narrow.covered === 0 && !narrow.clipped && htmlId === V2 && htmlId2 === V2 && pageId === V1;
  return { ok, note: `重新載入後 ${n.ms} ms 顯示「${n.text}」＋按鈕「${n.btn}」（role=${n.role}、圖像 ${n.media}、非彈窗=${!n.dialog}）；減少動態下 animation/transition ${JSON.stringify(n.anim)}；1366 遮住點 ${lay.covered}/5、375 按鈕遮住點 ${narrow.covered}/5 裁切=${narrow.clipped}；按下前頁面識別碼 ${pageId}（V1 照常運作）；本專案快取 ${JSON.stringify(mine)}（更新等待期間 2 份，FB-39）；V2 快取中 ./ 與 ./index.html 的識別碼 ${htmlId}、${htmlId2}（取自伺服器而非 HTTP 快取；伺服器 Cache-Control: max-age=600，距 V1 安裝 ${Math.round((Date.now() - t0) / 1000)} 秒內）` };
});
await R.check("TC-36-03c", "AC-36-03（按「更新版本」）、AC-36-04、AC-36-05", async () => {
  const nav0 = A.env.log.navigations.length;
  await A.page.click(".pwa-update__btn"); await sleep(400);
  await A.page.click(".pwa-update__btn", { timeout: 300 }).catch(() => {});
  await sleep(5000);
  const navs = A.env.log.navigations.length - nav0;
  const id = await pageBuildId(A.page); const n = await notice(A.page); const entry = await A.page.evaluate(() => document.body.dataset.entry);
  const caches = await cacheInfo(A.page); const mine = Object.keys(caches).filter((k) => k.startsWith(CACHE_PREFIX));
  const other = await A.page.evaluate(async () => { const c = await caches.open("other-project-cache"); const r = await c.match("/other-project/data.txt"); return r ? await r.text() : null; });
  const store1 = await readStore(A.page);
  const same = JSON.stringify(storeA0) === JSON.stringify(store1); const ver = JSON.parse(store1[KEY]).schemaVersion;
  const ok = navs === 1 && id === V2 && !n.vis && entry === "main" && mine.length === 1 && mine[0] === CACHE_PREFIX + V2 && Object.keys(caches).includes("other-project-cache") && other === "keep-me" && same && ver === 3;
  return { ok, note: `按下（另補按 1 次）→ 重新載入 ${navs} 次、識別碼 ${id}（V2 ${V2}）、提示=${n.vis}、${entry}；本專案快取 ${JSON.stringify(mine)}、全部快取 ${JSON.stringify(Object.keys(caches))}、other-project-cache 內容「${other}」；localStorage 與更新前完全相同=${same}（鍵 ${JSON.stringify(Object.keys(store1))}、schemaVersion ${ver}）` };
});
await R.check("TC-37-05b", "AC-37-05、AC-21-01（經過 1 次更新）", async () => {
  const all = A.env.log.requests.filter((r) => !/^(blob|data):/.test(r.url));
  const bad = all.filter((r) => !ALLOWED.has(r.url) || r.method !== "GET" || r.body || new URL(r.url).search !== "" || new URL(r.url).origin !== ORIGIN);
  const ok = bad.length === 0 && !all.some((r) => r.url.endsWith("/favicon.ico"));
  return { ok, note: `情境 A（V1 安裝、V2 更新、按更新版本）環境層請求 ${all.length} 筆（service worker 發出 ${all.filter((r) => r.sw).length}）：${JSON.stringify([...new Set(all.map((r) => r.method + " " + r.url.replace(ORIGIN, "")))])}；違規 ${bad.length}${bad.length ? JSON.stringify(bad.map((r) => r.method + " " + r.url)) : ""}` };
});

// ── B：首次畫面也提示；不按 → 關閉全部分頁後重開為 V2，仍為首次畫面且無狀態鍵（AC-36-04 後半、UP-6、UP-7）──
await R.check("TC-36-04b", "AC-36-04（首次畫面）、AC-36-03（不按更新版本）", async () => {
  await Bf.page.reload(); const n = await waitNotice(Bf.page, 60000);
  const e1 = await Bf.page.evaluate(() => document.body.dataset.entry); const id1 = await pageBuildId(Bf.page);
  await Bf.page.click('.cz-level[data-color="brown"]').catch(() => {}); await sleep(300);
  await Bf.page.close(); await sleep(1500);
  const p2 = await Bf.env.newPage(); await p2.goto(BASE); await sleep(1500);
  const id2 = await pageBuildId(p2); const e2 = await p2.evaluate(() => document.body.dataset.entry); const st = await readStore(p2); const n2 = await notice(p2);
  const ok = n.vis && e1 === "firstRun" && id1 === V1 && id2 === V2 && e2 === "firstRun" && st[KEY] === undefined && !n2.vis;
  return { ok, note: `首次畫面重新載入 → ${n.ms} ms 顯示提示=${n.vis}（${e1}、識別碼 ${id1}）；不按、關閉全部分頁後重開 → 識別碼 ${id2}、${e2}、狀態鍵 ${st[KEY] === undefined ? "無" : "有"}、提示=${n2.vis}` };
});
await R.check("TC-36-03d", "AC-36-03（不按時維持 V1、關閉後重開為 V2）、AC-36-04", async () => {
  await D.page.reload(); const n = await waitNotice(D.page, 60000);
  const nav0 = D.env.log.navigations.length;
  await goTab(D.page, "flashcards"); await D.page.click(".fc-flip"); await sleep(500); await goTab(D.page, "part5"); await goTab(D.page, "dashboard"); await sleep(6000);
  const id1 = await pageBuildId(D.page); const navs = D.env.log.navigations.length - nav0; const errs = D.env.log.errors.length;
  const s0 = await readStore(D.page); // 關閉前（含 V1 期間操作寫入的學習紀錄）
  await D.page.close(); await sleep(1500);
  const p2 = await D.env.newPage(); await p2.goto(BASE); await sleep(1500);
  const id2 = await pageBuildId(p2); const s1 = await readStore(p2); const e2 = await p2.evaluate(() => document.body.dataset.entry);
  const sameKeys = JSON.stringify(Object.keys(s0).sort()) === JSON.stringify(Object.keys(s1).sort());
  const d0 = JSON.parse(s0[KEY]).data, d1 = JSON.parse(s1[KEY]).data;
  const same = s0[KEY] === s1[KEY];
  const ok = n.vis && id1 === V1 && navs === 0 && errs === 0 && id2 === V2 && e2 === "main" && sameKeys && same && JSON.parse(s1[KEY]).schemaVersion === 3;
  return { ok, note: `提示顯示=${n.vis}；不按並操作 6 秒以上：識別碼 ${id1}、自動重新載入 ${navs} 次、例外 ${errs}；關閉全部分頁後重開 → ${id2}、${e2}；localStorage 鍵相同=${sameKeys}、schemaVersion ${JSON.parse(s1[KEY]).schemaVersion}、關閉前與重開後狀態逐字相同=${same}（連續天數 ${d0.streak.days}→${d1.streak.days}）` };
});

for (const x of [A, Bf, C, D]) await x.env.ctx.close().catch(() => {});
await browser.close();
await stopServer();
R.manual("TC-PWA-H5", "AC-36-03（正式網址、已安裝 App、背景 ≥ 1 小時）、AC-36-05（正式網址同網域快取）", "V-PWA (a)：已安裝 App 於重新部署後重開，60 秒內提示並可更新；頁面開著切到背景 ≥ 1 小時後切回前景觸發更新檢查（UP-3 由單元測試 pwa-service.test.js 驗證計時條件）");
R.save(resultPath("e2e-pwa-update"));
const c = (k) => R.results.filter((r) => r.result === k).length;
console.log(`e2e-pwa-update：通過 ${c("通過")}、失敗 ${c("失敗")}、待人工 ${c("待人工")}`);
