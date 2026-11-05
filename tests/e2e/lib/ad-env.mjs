// QA 第 9 輪（PRD V-AD (b)；architecture §7.25.4）：把 https://jimmyfantasyworld.com/** 路由到本機部署目錄，廣告腳本由 fixtures/ad-stub.js 或指定方式回應。
// 回傳的請求紀錄含網址、方法、本文、發起者（CDP Network.requestWillBeSent initiator），供 AC-50-07、AC-50-08 匯出。
import fs from "node:fs";
import https from "node:https";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { sleep, KEY } from "./pwa-env.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const STUB = fs.readFileSync(path.join(HERE, "..", "fixtures", "ad-stub.js"), "utf8");
export const PROD = "https://jimmyfantasyworld.com/";
export const AD_HOST = "https://pagead2.googlesyndication.com/";
const MIME = { html: "text/html; charset=utf-8", js: "text/javascript; charset=utf-8", webmanifest: "application/manifest+json", png: "image/png", txt: "text/plain; charset=utf-8", xml: "application/xml" };

/**
 * 第 9 輪教訓：context.route 攔不到瀏覽器程序對 sw.js 的更新檢查，曾實際連到線上 v1.2.0 的 sw.js，使快取與更新結果失真。
 * 需要 service worker 的案例一律用本機 HTTPS 伺服器：瀏覽器以 --host-resolver-rules 把正式主機對應到本機，其他主機一律解析失敗（完全不連外）。
 * 憑證以 openssl 在暫存目錄產生，不進版控；--ignore-certificate-errors 讓 service worker 可註冊。
 */
export async function startProdServer(tmp, dir) {
  const key = path.join(tmp, "qa-prod-key.pem"), crt = path.join(tmp, "qa-prod-crt.pem");
  if (!fs.existsSync(key) || !fs.existsSync(crt)) {
    const candidates = ["openssl", "C:/Program Files/Git/mingw64/bin/openssl.exe", "C:/Program Files/Git/usr/bin/openssl.exe"]; let done = false;
    for (const exe of candidates) { const r = spawnSync(exe, ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", key, "-out", crt, "-days", "2", "-subj", "/CN=jimmyfantasyworld.com"], { encoding: "utf8" }); if (r.status === 0) { done = true; break; } }
    if (!done) throw new Error("無法以 openssl 產生測試憑證");
  }
  const state = { dir, seen: [] };
  const srv = https.createServer({ key: fs.readFileSync(key), cert: fs.readFileSync(crt) }, (req, res) => {
    const u = new URL(req.url, "https://jimmyfantasyworld.com"); const rel = decodeURIComponent(u.pathname.slice(1)) || "index.html"; const f = path.join(state.dir, rel); state.seen.push(u.pathname);
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404, { "content-type": "text/plain" }); res.end("not found"); return; }
    res.writeHead(200, { "content-type": MIME[f.split(".").pop()] || "application/octet-stream", "cache-control": "max-age=600" }); res.end(fs.readFileSync(f));
  });
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  return { port: srv.address().port, state, setDir(d) { state.dir = d; }, close: () => new Promise((r) => { srv.closeAllConnections && srv.closeAllConnections(); srv.close(r); }) };
}
export const prodBrowserArgs = (port) => [`--host-resolver-rules=MAP jimmyfantasyworld.com:443 127.0.0.1:${port},MAP * ~NOTFOUND,EXCLUDE localhost,EXCLUDE 127.0.0.1`, "--ignore-certificate-errors"];

/** 把 origin 底下的請求對應到 dir（找不到回 404）。回傳本路由處理過的網址清單 */
export async function routeSite(ctx, dir, origin = PROD, net = { offline: false }) {
  const served = [];
  await ctx.route(origin + "**", async (route) => {
    if (net.offline) return route.abort("internetdisconnected"); // 路由會略過 context.setOffline，離線需自行中斷
    const u = new URL(route.request().url()); const rel = decodeURIComponent(u.pathname.slice(new URL(origin).pathname.length));
    const f = path.join(dir, rel === "" ? "index.html" : rel); served.push(u.href);
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return route.fulfill({ status: 404, contentType: "text/plain", body: "not found" });
    return route.fulfill({ status: 200, headers: { "content-type": MIME[f.split(".").pop()] || "application/octet-stream", "cache-control": "max-age=600" }, body: fs.readFileSync(f) });
  });
  return served;
}

/** 廣告腳本回應方式：stub（替身）｜abort（阻擋或失敗）｜http500｜hang（永不回應） */
export async function routeAd(ctx, how = "stub") {
  const hits = [];
  const hanging = [];
  await ctx.route(AD_HOST + "**", async (route) => {
    hits.push({ url: route.request().url(), method: route.request().method(), at: Date.now() });
    if (how === "stub") return route.fulfill({ status: 200, headers: { "content-type": "text/javascript", "access-control-allow-origin": "*" }, body: STUB });
    if (how === "abort") return route.abort("blockedbyclient");
    if (how === "http500") return route.fulfill({ status: 500, headers: { "access-control-allow-origin": "*" }, body: "error" });
    hanging.push(route); /* hang：不回應 */
    return undefined;
  });
  return { hits, hanging };
}

export const seedInit = (rec) => `(() => { try { if (!sessionStorage.getItem("__qaSeeded")) { localStorage.setItem(${JSON.stringify(KEY)}, ${JSON.stringify(JSON.stringify(rec))}); sessionStorage.setItem("__qaSeeded", "1"); } } catch (e) {} })();`;
export const modeInit = (mode, delay = 30, height = 250, lateMs = 11000) => `window.__qaAdMode = ${JSON.stringify(mode)}; window.__qaAdDelay = ${delay}; window.__qaAdHeight = ${height}; window.__qaAdLateMs = ${lateMs};`;

/** 在頁面內等到版位狀態成為某值 */
export const adState = (page) => page.evaluate(() => { const s = document.getElementById("ad-slot"); const st = window.EMT && EMT.store.getState().runtime.ad.status; const r = s ? s.getBoundingClientRect() : null; const ins = document.querySelector("ins.adsbygoogle"); const lb = document.querySelector(".ad-slot__label");
  return { status: st, state: s ? s.dataset.adState : null, h: r ? r.height : 0, w: r ? r.width : 0, display: s ? getComputedStyle(s).display : null, label: lb ? { hidden: lb.hidden, text: lb.textContent, shown: lb.getClientRects().length > 0 } : null, insW: ins ? ins.getBoundingClientRect().width : null, insStatus: ins ? ins.getAttribute("data-ad-status") : null, ads: document.querySelectorAll("ins.adsbygoogle").length, env: document.documentElement.getAttribute("data-ad-env"), rec: window.__qaAd || null }; });
export async function waitAdStatus(page, want, timeout = 15000) { const t0 = Date.now(); while (Date.now() - t0 < timeout) { const s = await page.evaluate(() => window.EMT && EMT.store.getState().runtime.ad.status); if (s === want) return Date.now() - t0; await sleep(50); } return null; }

/** 由 CDP 記錄請求（含本文與發起者）；需在 goto 前呼叫 */
export async function recordRequests(ctx, page) {
  const list = []; const cdp = page.__cdp || (await ctx.newCDPSession(page));
  await cdp.send("Network.enable");
  cdp.on("Network.requestWillBeSent", (m) => {
    const init = m.initiator || {}; const stack = (init.stack && init.stack.callFrames && init.stack.callFrames[0]) ? init.stack.callFrames[0].url : (init.url || "");
    list.push({ url: m.request.url, method: m.request.method, body: m.request.postData || "", type: m.type, initiator: init.type, initiatorUrl: stack });
  });
  return list;
}

/** 4 個學習區塊的座標（AC-52-05） */
export const blockRects = (page) => page.evaluate(() => { const q = (s) => document.querySelector("#view-dashboard " + s); const y = window.scrollY;
  return Object.fromEntries(Object.entries({ task: ".db-today, .db-task", stats: ".db-stats", chart: ".db-chart", backup: ".db-backup" }).map(([k, s]) => { const e = q(s); if (!e) return [k, null]; const r = e.getBoundingClientRect(); return [k, { top: +(r.top + y).toFixed(2), left: +r.left.toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2) }]; })); });
/** 安裝 Layout Instability 紀錄：window.__qaLS = [{value, sources:[selector-ish...], t}] */
export const LAYOUT_SHIFT_INIT = `(() => { window.__qaLS = []; try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__qaLS.push({ value: e.value, t: Math.round(e.startTime), hadRecentInput: e.hadRecentInput, sources: (e.sources || []).map((s) => { const n = s.node; const name = n ? (n.id ? "#" + n.id : (n.className && n.className.baseVal === undefined ? "." + String(n.className).trim().split(/\\s+/)[0] : n.nodeName)) : "(null)"; return { name, from: s.previousRect ? [s.previousRect.x, s.previousRect.y, s.previousRect.width, s.previousRect.height] : null, to: s.currentRect ? [s.currentRect.x, s.currentRect.y, s.currentRect.width, s.currentRect.height] : null }; }) }); }).observe({ type: "layout-shift", buffered: true }); } catch (e) {} })();`;
