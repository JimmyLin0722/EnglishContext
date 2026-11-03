// QA 第 4 輪（PRD v0.11 PWA）共用：Playwright（playwright-core，使用本機 Chrome／Edge）、本機伺服器（tools/serve.mjs，埠 8080）、
// 環境層請求記錄（context 的 request 事件，serviceWorkers: "allow" 時含 service worker 發出的請求）、PNG 解碼、替身安裝事件（FB-42）。
// 依據：architecture.md v0.7 §10.4「E2E（QA；本機 V-PWA (b)，Playwright Chromium）」、契約 README §10。
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright-core";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, "../../..");
export const DIST = path.join(ROOT, "dist", "english-master-track.html");
export const SITE = path.join(ROOT, "dist", "site");
export const FILE_URL = pathToFileURL(DIST).href;
export const PORT = 8080;
export const ORIGIN = `http://localhost:${PORT}`;
export const BASE_PATH = "/english-master-track/";
export const BASE = ORIGIN + BASE_PATH;
export const KEY = "englishMasterTrack:state";
export const PRECACHE = ["./", "./index.html", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-maskable-512.png", "./icons/apple-touch-icon-180.png"];
export const CACHE_PREFIX = "english-master-track-pwa-";
export const NT1 = "學習紀錄只存在目前的瀏覽器與網址；檔案版、網頁版、主畫面 App 彼此不互通，可用匯出備份／匯入轉移";
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const BROWSER = process.env.QA_BROWSER === "edge" ? "edge" : "chrome";

/** 允許的請求網址（AC-37-05）：以 base 解析的預先快取清單 7 項 + sw.js */
export function allowedUrls(base = BASE) {
  return new Set([...PRECACHE.map((u) => new URL(u, base).href), new URL("./sw.js", base).href]);
}

// ───────── 本機伺服器（只用 8080；只關閉自己啟動的程序） ─────────
let server = null;
async function portUp() {
  try { const r = await fetch(`http://127.0.0.1:${PORT}${BASE_PATH}`, { method: "HEAD" }); return r.status > 0; } catch { return false; }
}
/** 以 tools/serve.mjs 提供 dir（= npm run serve 的同一支程式；直接以 node 啟動，結束時才能確實關閉自己的程序） */
export async function serve(dir = SITE) {
  await stopServer();
  if (await portUp()) throw new Error("埠 8080 已被其他程序佔用，QA 不關閉非自己啟動的程序");
  server = spawn(process.execPath, ["tools/serve.mjs", "--dir", dir, "--port", String(PORT)], { cwd: ROOT, stdio: "ignore" });
  for (let i = 0; i < 100; i++) { if (await portUp()) return; await sleep(100); }
  throw new Error("serve.mjs 未在 10 秒內啟動");
}
export async function stopServer() {
  if (!server) return;
  const s = server; server = null;
  const done = new Promise((r) => s.once("exit", r));
  s.kill();
  await Promise.race([done, sleep(3000)]);
  for (let i = 0; i < 50 && (await portUp()); i++) await sleep(100);
}

// ───────── 瀏覽器 ─────────
export async function launchBrowser(extraArgs = []) {
  return chromium.launch({
    channel: BROWSER === "edge" ? "msedge" : "chrome",
    headless: true,
    args: ["--host-resolver-rules=MAP emt.test 127.0.0.1", "--allow-file-access-from-files", "--autoplay-policy=no-user-gesture-required", ...extraArgs],
  });
}

/**
 * 建立 context 並在環境層記錄：請求（含 service worker 發出的請求）、回應來源、console、pageerror、CDP Log／Audits。
 * @returns {Promise<{ctx, log, newPage: function(): Promise<any>}>}
 */
export async function newEnv(browser, { serviceWorkers = "allow", width = 1366, height = 900, reducedMotion, inits = [] } = {}) {
  const ctx = await browser.newContext({ serviceWorkers, viewport: { width, height }, reducedMotion, acceptDownloads: true });
  const log = { requests: [], responses: [], console: [], errors: [], cdp: [], navigations: [] };
  ctx.on("request", (req) => {
    let sw = false; try { sw = !!req.serviceWorker(); } catch { /* 忽略 */ }
    log.requests.push({ url: req.url(), method: req.method(), type: req.resourceType(), sw, nav: req.isNavigationRequest(), body: req.postData() !== null, at: Date.now() });
  });
  ctx.on("response", (res) => { log.responses.push({ url: res.url(), status: res.status(), fromSW: res.fromServiceWorker(), at: Date.now() }); });
  for (const s of inits) await ctx.addInitScript({ content: s });
  async function newPage() {
    const page = await ctx.newPage();
    page.on("console", (m) => log.console.push({ type: m.type(), text: m.text(), url: (m.location() || {}).url || "" }));
    page.on("pageerror", (e) => log.errors.push(String(e && e.message ? e.message : e)));
    page.on("framenavigated", (f) => { if (f === page.mainFrame()) log.navigations.push({ url: f.url(), at: Date.now() }); });
    try {
      const cdp = await ctx.newCDPSession(page);
      cdp.on("Log.entryAdded", (m) => log.cdp.push({ kind: "log", level: m.entry.level, source: m.entry.source, text: m.entry.text, url: m.entry.url || "" }));
      cdp.on("Audits.issueAdded", (m) => log.cdp.push({ kind: "issue", code: m.issue.code, text: JSON.stringify(m.issue.details).slice(0, 300) }));
      await cdp.send("Log.enable");
      await cdp.send("Audits.enable");
      page.__cdp = cdp;
    } catch { /* 忽略 */ }
    return page;
  }
  return { ctx, log, newPage };
}

/** 本頁可見（非 hidden、非 display:none、有尺寸） */
export const visJs = `(sel) => { const e = typeof sel === "string" ? document.querySelector(sel) : sel; if (!e) return false; const s = getComputedStyle(e);
  if (s.display === "none" || s.visibility === "hidden" || e.closest("[hidden]")) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }`;
export const visible = (page, sel) => page.evaluate(`(${visJs})(${JSON.stringify(sel)})`);

/** 若在首次畫面則按「開始學習」（有確認視窗時按確定） */
export async function startLearning(page) {
  const entry = await page.evaluate(() => document.body.dataset.entry);
  if (entry === "firstRun") {
    await page.click("#cz-start");
    await sleep(300);
    if (await page.$(".dialog [data-action=\"ok\"]")) { await page.click(".dialog [data-action=\"ok\"]"); await sleep(300); }
  }
  await page.waitForFunction(() => document.body.dataset.entry === "main", null, { timeout: 5000 });
}
export async function goTab(page, tab) { await page.click(`#app-nav [data-tab="${tab}"]`); await sleep(150); }

/** 等待本專案 service worker 啟用（≤ timeout）；回傳註冊資訊 */
export async function waitSW(page, timeout = 10000) {
  return page.evaluate(async (t) => {
    const t0 = performance.now();
    const until = (p) => Promise.race([p, new Promise((r) => setTimeout(() => r(null), t))]);
    const reg = await until(navigator.serviceWorker.ready);
    if (!reg) return { ok: false, ms: Math.round(performance.now() - t0) };
    for (let i = 0; i < 100 && !(reg.active && reg.active.state === "activated"); i++) await new Promise((r) => setTimeout(r, 50));
    const regs = await navigator.serviceWorker.getRegistrations();
    return { ok: !!(reg.active && reg.active.state === "activated"), ms: Math.round(performance.now() - t0), scope: reg.scope, script: reg.active && reg.active.scriptURL,
      count: regs.length, controller: !!navigator.serviceWorker.controller, waiting: !!reg.waiting };
  }, timeout);
}

/** Cache Storage 內容：{ 名稱: [網址…] } */
export const cacheInfo = (page) => page.evaluate(async () => {
  if (typeof caches === "undefined") return { unavailable: true };
  const out = {};
  for (const n of await caches.keys()) { const c = await caches.open(n); out[n] = (await c.keys()).map((r) => r.url); }
  return out;
});
/** 快取中 ./ 的 HTML 建置識別碼 */
export const cachedBuildId = (page, name, key) => page.evaluate(async ([n, k]) => {
  const c = await caches.open(n); const r = await c.match(k); if (!r) return null;
  const t = await r.text(); const m = t.match(/<meta name="emt-build-id" content="([0-9a-f]+)">/); return m ? m[1] : "（無）";
}, [name, key]);
export const pageBuildId = (page) => page.evaluate(() => (document.querySelector('meta[name="emt-build-id"]') || {}).content || null);
export const readStore = (page) => page.evaluate((k) => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const kk = localStorage.key(i); o[kk] = localStorage.getItem(kk); } return o; }, KEY);

/** 替身 beforeinstallprompt（FB-42：附 prompt() 與 userChoice）；回傳是否被 preventDefault */
export const fireBip = (page, outcome = "accepted") => page.evaluate((oc) => {
  window.__qaPrompt = window.__qaPrompt || 0;
  const e = new Event("beforeinstallprompt", { cancelable: true });
  e.platforms = ["web"];
  e.prompt = () => { window.__qaPrompt++; return Promise.resolve({ outcome: oc }); };
  e.userChoice = Promise.resolve({ outcome: oc, platform: "web" });
  window.dispatchEvent(e);
  return e.defaultPrevented;
}, outcome);
export const fireInstalled = (page) => page.evaluate(() => window.dispatchEvent(new Event("appinstalled")));
/** 記錄瀏覽器真實（isTrusted）安裝事件 */
export const TRUSTED_BIP = `(() => { window.__qaTrustedBip = 0; window.addEventListener("beforeinstallprompt", (e) => { if (e.isTrusted) window.__qaTrustedBip++; }, true); })();`;

/** 元素是否完整可見、未被裁切、未被底部導覽列等元素遮住（scrollIntoView center 後以 elementFromPoint 檢查中心與四角） */
export const layoutCheck = (page, sel) => page.evaluate(async (s) => {
  const e = document.querySelector(s); if (!e) return { exists: false };
  e.scrollIntoView({ block: "center" }); await new Promise((r) => setTimeout(r, 120));
  const r = e.getBoundingClientRect();
  const pts = [[r.left + r.width / 2, r.top + r.height / 2], [r.left + 2, r.top + 2], [r.right - 2, r.top + 2], [r.left + 2, r.bottom - 2], [r.right - 2, r.bottom - 2]];
  // 命中自身、子孫或祖先（圓角外側落在自己的容器）都不算遮住；命中其他元素（如固定的底部導覽列）才算
  const covered = pts.filter(([x, y]) => { const h = document.elementFromPoint(x, y); return !(h && (h === e || e.contains(h) || h.contains(e))); }).length;
  const clipped = e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1 || r.left < 0 || r.right > window.innerWidth + 0.5;
  const nav = document.querySelector("#app-nav"); const nr = nav ? nav.getBoundingClientRect() : null;
  return { exists: true, w: Math.round(r.width), h: Math.round(r.height), covered, clipped, text: e.textContent, vw: window.innerWidth,
    overlapNav: !!(nr && nr.height > 0 && getComputedStyle(nav).position === "fixed" && r.bottom > nr.top && r.top < nr.bottom && r.right > nr.left && r.left < nr.right) };
}, sel);

// ───────── PNG（色彩類型 2、位元深度 8）解碼，供圖示像素檢查 ─────────
export function decodePng(buf) {
  const sig = buf.subarray(0, 8).toString("hex");
  if (sig !== "89504e470d0a1a0a") throw new Error("不是 PNG");
  let off = 8, w = 0, h = 0, ct = -1, bd = -1; const idat = []; const chunks = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off); const type = buf.subarray(off + 4, off + 8).toString("latin1"); const data = buf.subarray(off + 8, off + 8 + len);
    chunks.push(type);
    if (type === "IHDR") { w = data.readUInt32BE(0); h = data.readUInt32BE(4); bd = data[8]; ct = data[9]; }
    if (type === "IDAT") idat.push(data);
    off += 12 + len;
  }
  const info = { w, h, ct, bd, chunks, tRNS: chunks.includes("tRNS") };
  if (ct !== 2 || bd !== 8) return { ...info, px: null };
  const raw = zlib.inflateSync(Buffer.concat(idat)); const bpp = 3, stride = w * bpp; const px = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)]; const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? px[y * stride + x - bpp] : 0, b = y > 0 ? px[(y - 1) * stride + x] : 0, c = x >= bpp && y > 0 ? px[(y - 1) * stride + x - bpp] : 0;
      let v = line[x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      px[y * stride + x] = v & 255;
    }
  }
  return { ...info, px, at: (x, y) => [px[(y * w + x) * 3], px[(y * w + x) * 3 + 1], px[(y * w + x) * 3 + 2]] };
}
/** 產生單色 RGB PNG（AC-36-01 (c) 換圖示用） */
export function solidPng(size, [r, g, b]) {
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (bb) => { let c = 0xffffffff; for (const x of bb) c = crcTable[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t, "latin1"), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2;
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: size }, () => [r, g, b]).flat())]);
  return Buffer.concat([Buffer.from("89504e470d0a1a0a", "hex"), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(Buffer.concat(Array(size).fill(row)))), chunk("IEND", Buffer.alloc(0))]);
}

/** TC 結果收集器（格式同 tests/e2e/lib/cdp.mjs recorder） */
export function recorder(suite) {
  const results = [];
  const push = (tc, ac, result, note, tag) => { results.push({ suite, tc, ac, result, note }); console.log(`  ${tag} ${tc} ${ac} ${note}`); };
  return {
    results,
    pass: (tc, ac, note = "") => push(tc, ac, "通過", note, "PASS"),
    fail: (tc, ac, note) => push(tc, ac, "失敗", note, "FAIL"),
    manual: (tc, ac, note) => push(tc, ac, "待人工", note, "MANUAL"),
    async check(tc, ac, fn) {
      try {
        const r = await fn();
        if (r === true || (r && r.ok === true)) this.pass(tc, ac, (r && r.note) || "");
        else this.fail(tc, ac, (r && r.note) || JSON.stringify(r).slice(0, 800));
      } catch (e) { this.fail(tc, ac, "例外：" + String(e && e.message ? e.message : e).slice(0, 600)); }
    },
    save(file) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(results, null, 2)); },
  };
}
export function resultPath(name) { return path.join(ROOT, "tests", "results", name + (BROWSER === "edge" ? "-edge" : "") + ".json"); }
