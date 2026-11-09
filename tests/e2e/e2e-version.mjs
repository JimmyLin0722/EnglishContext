// QA 第 6 輪（PRD v0.14，R-22）：網站版本號（US-42）、隱藏領域範本（US-43）、難易度設定頁狀態列（AC-01-08）、
// 主控台目標行與「變更」按鈕（AC-39-04 v0.14）、首次畫面底部遮擋（AC-41-04 v0.14）。
// 依據：契約 README §12（VR、LS、V-VER-01～06、V-LAY-09／10）、§5.8 HT-6～HT-9、FB-51；architecture.md v0.9 §7.20、§10.6。
// 執行：node tests/e2e/e2e-version.mjs（Playwright＋本機 Chrome；QA_BROWSER=edge 時只跑畫面類 TC，不跑建置與 PWA 更新）
// 需要埠 8080（tools/serve.mjs，與 npm run serve 同一支程式）；只關閉自己啟動的伺服器。
// 建置一律輸出到 QA_TMP（或 OS 暫存）下的子目錄，不寫入 dist/、src/、package.json。
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync, execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import {
  ROOT, DIST, SITE, BASE, KEY, BROWSER, FILE_URL, sleep, allowedUrls, serve, stopServer, launchBrowser, newEnv, startLearning, waitSW, recorder, resultPath,
} from "./lib/pwa-env.mjs";
import { TOAST_RECORDER, fakeTts, fakeStt, fakeMic } from "./lib/inits.mjs";

const R = recorder("e2e-version");
R.na = (tc, ac, note) => { R.results.push({ suite: "e2e-version", tc, ac, result: "不適用（暫停）", note }); console.log(`  N/A ${tc} ${ac} ${note}`); };
const TMP = fs.mkdtempSync(path.join(process.env.QA_TMP || os.tmpdir(), "ver-"));
const INITS = [TOAST_RECORDER, fakeTts("ok"), fakeStt("ok"), fakeMic("ok", -25)];
const PKG = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const HTML = fs.readFileSync(DIST, "utf8");
const metaOf = (html, name) => { const m = [...html.matchAll(new RegExp(`<meta name="${name}" content="([^"]*)">`, "g"))]; return m.length === 1 ? m[0][1] : (m.length ? "重複 " + m.length : null); };
const BUILD_ID = metaOf(HTML, "emt-build-id");
const APP_VER = metaOf(HTML, "emt-app-version");
const EXPECT_LINE = `版本 ${PKG.version}（建置 ${String(BUILD_ID).slice(0, 7)}）`;
const LINE_RE = /^版本 \d+\.\d+\.\d+（建置 [0-9a-f]{7}）$/;
const ORANGE = "rgb(247, 137, 59)", GREYLINE = "rgb(213, 217, 224)";
const EDGE = BROWSER === "edge";
console.log(`package.json ${PKG.version}；emt-app-version ${APP_VER}；BUILD_ID ${BUILD_ID}；期望版本行「${EXPECT_LINE}」；瀏覽器 ${BROWSER}`);

// ───────── 頁面內共用函式（以 addInitScript 注入，供 evaluate 使用） ─────────
const PROBE = `(() => {
  const parse = (c) => { const m = String(c).match(/rgba?\\(([^)]+)\\)/); if (!m) return null; const p = m[1].split(",").map((x) => parseFloat(x)); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const effBg = (e) => { for (let n = e; n && n.nodeType === 1; n = n.parentElement) { const c = parse(getComputedStyle(n).backgroundColor); if (c && c.a >= 0.999) return c; } return { r: 255, g: 255, b: 255, a: 1 }; };
  const contrast = (fg, bg) => { const a = lum(fg) + 0.05, b = lum(bg) + 0.05; return +(Math.max(a, b) / Math.min(a, b)).toFixed(2); };
  const shown = (e) => { if (!e) return false; for (let n = e; n && n.nodeType === 1; n = n.parentElement) { if (n.hidden || n.hasAttribute("inert")) return false; const s = getComputedStyle(n); if (s.display === "none" || s.visibility === "hidden") return false; } const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  /** 畫面可見文字＋可見元素的 aria-label、title（HT-7；隱藏容器內不計） */
  const visibleText = () => { const out = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) { const p = n.parentElement; if (p && n.textContent.trim() && shown(p) && !p.closest("script,style")) out.push(n.textContent.trim()); }
    for (const e of document.querySelectorAll("[aria-label],[title],[placeholder],[alt]")) if (shown(e)) for (const a of ["aria-label", "title", "placeholder", "alt"]) if (e.getAttribute(a)) out.push("@" + a + "=" + e.getAttribute(a));
    out.push("@document.title=" + document.title); return out; };
  window.__qaV = { parse, effBg, contrast, shown, visibleText,
    line() { const all = document.querySelectorAll("#app-version"); const e = all[0]; if (!e) return { count: 0 };
      const s = getComputedStyle(e); const fg = parse(s.color); const bg = effBg(e); const r = e.getBoundingClientRect();
      const rng = document.createRange(); rng.selectNodeContents(e); const lines = new Set([...rng.getClientRects()].map((x) => Math.round(x.top))).size;
      return { count: all.length, text: e.textContent, inner: e.innerText, tag: e.tagName, prevId: e.previousElementSibling && e.previousElementSibling.id, parentId: e.parentElement && e.parentElement.id,
        tabindex: e.getAttribute("tabindex"), role: e.getAttribute("role"), inLink: !!e.closest("a,button,[role=button],[onclick]"), lines, scrollW: e.scrollWidth, clientW: e.clientWidth,
        color: s.color, bgc: s.backgroundColor, contrast: contrast(fg, bg), cursor: s.cursor, shown: shown(e), top: r.top + scrollY, bottom: r.bottom, left: r.left, right: r.right, vw: innerWidth }; },
  };
})();`;

const browser = await launchBrowser();
async function env(opts = {}) { const e = await newEnv(browser, { inits: [...INITS, PROBE], ...opts }); const page = await e.newPage(); return { ...e, page }; }
const tabNow = (page) => page.evaluate(() => (window.EMT && EMT.router && EMT.router.current()) || null);
async function goTab(page, tab) {
  if (tab === "sources") { await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await page.click("#footer-sources"); }
  else await page.evaluate((t) => EMT.router.go(t), tab);
  await sleep(350);
}
const lsAll = (page) => page.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); } return o; });
const errorsOf = (e) => [...e.log.errors, ...e.log.console.filter((m) => m.type === "error").map((m) => m.text)];
/** Tab 走一輪（最多 n 次），回傳每次焦點元素的描述 */
async function tabWalk(page, n = 120) {
  await page.evaluate(() => { document.activeElement && document.activeElement.blur(); window.scrollTo(0, 0); });
  const seen = [];
  for (let i = 0; i < n; i++) {
    await page.keyboard.press("Tab");
    const d = await page.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return "body"; return (e.id ? "#" + e.id : e.tagName.toLowerCase()) + (e.dataset.template ? "[tpl=" + e.dataset.template + "]" : "") + (e.closest("[hidden],[inert]") ? "(在隱藏容器內)" : ""); });
    seen.push(d);
    if (i > 3 && d === seen[0]) break;
  }
  return seen;
}

// ═════════ TC-42-01a／TC-42-01b、TC-42-03a／b、TC-41-04v：各畫面頁尾版本行（file:// 與 npm run serve） ═════════
const SCREENS = ["firstRun", "dashboard", "customizer", "flashcards", "part5", "sources"];
async function screensCheck(base, width, height, { offline = false } = {}) {
  const x = await env({ width, height, serviceWorkers: base.startsWith("file:") ? "block" : "allow" });
  const { page } = x;
  if (offline) await x.ctx.setOffline(true);
  await page.goto(base); await sleep(400);
  const out = []; let ok = true; const texts = new Set();
  for (const s of SCREENS) {
    if (s === "dashboard") await startLearning(page);
    if (s !== "firstRun") await goTab(page, s);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await sleep(150);
    const l = await page.evaluate(() => window.__qaV.line());
    const occl = await page.evaluate(() => { const v = document.getElementById("app-version"); if (!v) return null; const r = v.getBoundingClientRect();
      const nav = document.getElementById("app-nav"), fb = document.querySelector(".cz-firstbar"); const vis = (e) => e && window.__qaV.shown(e) && getComputedStyle(e).position === "fixed";
      const bar = vis(nav) ? nav : vis(fb) ? fb : null; const top = bar ? bar.getBoundingClientRect().top : innerHeight;
      return { bar: bar ? (bar.id || bar.className) : "無固定列", vBottom: Math.round(r.bottom * 10) / 10, barTop: Math.round(top * 10) / 10, inView: r.top >= 0 && r.bottom <= innerHeight, ok: r.bottom <= top + 0.5 && r.top >= 0 }; });
    const body = await page.evaluate(() => document.body.innerText);
    const bad = ["@@", "undefined", "（建置 ）", "（建置）"].filter((k) => body.includes(k)).concat(/\bnull\b/.test(body) ? ["null"] : []);
    const good = l.count === 1 && l.text === EXPECT_LINE && LINE_RE.test(l.text) && l.prevId === "footer-links" && l.parentId === "app-footer" && l.tag === "P" && l.tabindex === null && l.role === null && !l.inLink
      && l.lines === 1 && l.scrollW <= l.clientW && l.contrast >= 4.5 && l.color !== ORANGE && l.shown && occl && occl.ok && bad.length === 0 && l.cursor !== "pointer";
    ok = ok && good; texts.add(l.text);
    out.push(`${s}：${l.count} 行「${l.text}」<${l.tag}> 前一兄弟 #${l.prevId}、行數 ${l.lines}、對比 ${l.contrast}、色 ${l.color}、捲到底下緣 ${occl && occl.vBottom} ≤ ${occl && occl.bar} 上緣 ${occl && occl.barTop}=${occl && occl.ok}${bad.length ? "、畫面含 " + bad.join("/") : ""}${good ? "" : "（不符）"}`);
  }
  // 版本行不可取得焦點（主控台、資料來源頁各走一輪 Tab）
  const focus = [];
  for (const s of ["dashboard", "sources"]) { await goTab(page, s); const seq = await tabWalk(page); focus.push(`${s}：Tab ${seq.length} 次、到達 #app-version=${seq.includes("#app-version")}、到達 #footer-sources=${seq.includes("#footer-sources")}`); ok = ok && !seq.includes("#app-version") && seq.includes("#footer-sources"); }
  // 點擊版本行不導覽、不改變畫面
  await goTab(page, "dashboard"); const before = await tabNow(page); const nav0 = x.log.navigations.length;
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await page.click("#app-version"); await sleep(300);
  const after = await tabNow(page); ok = ok && before === after && x.log.navigations.length === nav0;
  const reqs = x.log.requests.filter((r) => !r.url.startsWith("data:"));
  const errs = errorsOf(x);
  await x.ctx.close();
  return { ok: ok && errs.length === 0, out, focus, texts: [...texts], clickNoop: before === after, reqs, errs };
}

await R.check("TC-42-01a", "AC-42-01 (a)、AC-41-04、AC-27-03、AC-23-02、E-95、E-96", async () => {
  const notes = []; let ok = true; const texts = new Set();
  for (const [w, h] of [[375, 667], [1366, 768]]) {
    const r = await screensCheck(FILE_URL, w, h);
    ok = ok && r.ok; r.texts.forEach((t) => texts.add(t));
    notes.push(`【file:// ${w}×${h}】` + r.out.join("；") + "；" + r.focus.join("；") + `；點版本行不導覽=${r.clickNoop}；Console 錯誤 ${r.errs.length}`);
  }
  globalThis.__fileText = [...texts];
  return { ok: ok && texts.size === 1, note: notes.join(" ／ ") };
});

// AC-42-03 (a)：file:// 連網與斷網，請求數皆 0；localStorage 與備份不含版本號
await R.check("TC-42-03a", "AC-42-03 (a)、AC-21-01 (a)、E-98", async () => {
  const notes = []; let ok = true;
  for (const offline of [false, true]) {
    const r = await screensCheck(FILE_URL, 1366, 768, { offline });
    const extra = r.reqs.filter((q) => q.url !== FILE_URL);
    ok = ok && r.ok && extra.length === 0;
    notes.push(`${offline ? "斷網" : "連網"}：6 畫面版本行皆正常=${r.ok}、文字 ${r.texts.join("/")}；主文件以外請求 ${extra.length}${extra.length ? JSON.stringify(extra.map((q) => q.url)) : ""}`);
  }
  // localStorage／備份
  const x = await env({ serviceWorkers: "block" }); const { page } = x;
  await page.goto(FILE_URL); await startLearning(page);
  const ls0 = await lsAll(page);
  for (const s of ["customizer", "flashcards", "part5", "sources", "dashboard"]) await goTab(page, s);
  const ls1 = await lsAll(page);
  const bk = await page.evaluate(() => EMT.store.actions.exportBackup().json);
  const bj = JSON.parse(bk); const code = BUILD_ID.slice(0, 7);
  const lsText = JSON.stringify(ls1);
  const rec = JSON.parse(ls1[KEY] || "{}");
  const okLs = JSON.stringify(ls0) === JSON.stringify(ls1) && Object.keys(ls1).join() === KEY && rec.schemaVersion === 3 && !lsText.includes(PKG.version) && !lsText.includes(code) && !/emt-app-version|appVersion|buildId/i.test(lsText);
  const okBk = Object.keys(bj).length === 5 && !bk.includes(PKG.version) && !bk.includes(code) && !/appVersion|buildId|版本/.test(bk);
  await x.ctx.close();
  ok = ok && okLs && okBk;
  notes.push(`localStorage 鍵 ${Object.keys(ls1).join(",")}、schemaVersion ${rec.schemaVersion}、切換 5 個畫面前後相同=${JSON.stringify(ls0) === JSON.stringify(ls1)}、含版本號或建置碼=${lsText.includes(PKG.version) || lsText.includes(code)}；備份頂層 ${Object.keys(bj).join(",")}（${Object.keys(bj).length} 欄）、含版本號或建置碼=${bk.includes(PKG.version) || bk.includes(code)}`);
  return { ok, note: notes.join("；") };
});

// AC-42-01 (b)、AC-42-03 (b)：npm run serve（tools/serve.mjs，dist/site）
if (!EDGE) {
  await serve(SITE);
  try {
    await R.check("TC-42-01b", "AC-42-01 (b)、AC-42-03 (b)、AC-37-05、AC-41-04、AC-27-03", async () => {
      const allow = allowedUrls(BASE);
      const notes = []; let ok = true; const texts = new Set();
      for (const [w, h] of [[375, 667], [1366, 768]]) {
        const r = await screensCheck(BASE, w, h);
        const bad = r.reqs.filter((q) => !allow.has(q.url.split("#")[0]));
        const pkg = r.reqs.filter((q) => /package\.json/.test(q.url));
        const body = r.reqs.filter((q) => q.body || q.method !== "GET");
        ok = ok && r.ok && bad.length === 0 && pkg.length === 0 && body.length === 0; r.texts.forEach((t) => texts.add(t));
        notes.push(`【http ${w}×${h}】` + r.out.join("；") + "；" + r.focus.join("；") + `；請求 ${r.reqs.length} 筆（${[...new Set(r.reqs.map((q) => q.url.replace(BASE, "./")))].join(" ")}），非允許清單 ${bad.length}、package.json ${pkg.length}、非 GET 或帶本文 ${body.length}；Console 錯誤 ${r.errs.length}`);
      }
      const same = texts.size === 1 && [...texts][0] === (globalThis.__fileText || [])[0];
      return { ok: ok && same, note: notes.join(" ／ ") + `；file:// 與 http 文字相同=${same}` };
    });
  } finally { await stopServer(); }
} else R.na("TC-42-01b", "AC-42-01 (b)、AC-42-03 (b)", "Edge 冒煙只跑 file:// 畫面類 TC（Chrome 已驗）");

// ═════════ TC-42-02：版本行與產物一致（V-VER-01、V-VER-06） ═════════
await R.check("TC-42-02", "AC-42-02、AC-36-02、AC-36-07、E-96", async () => {
  const site = fs.readFileSync(path.join(SITE, "index.html"));
  const same = Buffer.compare(site, fs.readFileSync(DIST)) === 0;
  const sw = fs.readFileSync(path.join(SITE, "sw.js"), "utf8");
  const swId = (sw.match(/BUILD_ID\s*=\s*"([0-9a-f]+)"/) || [])[1];
  const cacheName = (sw.match(/CACHE_NAME\s*=\s*([^;\n]+)/) || [])[1];
  const metaCount = (HTML.match(/<meta name="emt-app-version"/g) || []).length;
  const leftovers = HTML.match(/@@[A-Za-z0-9_]+@@/g) || [];
  const swLeft = sw.match(/@@[A-Za-z0-9_]+@@/g) || [];
  const pkgInSite = fs.readdirSync(SITE).filter((f) => /package/.test(f));
  const fileText = (globalThis.__fileText || [])[0];
  const ok = PKG.version === "1.3.2" /* 第 12 輪：v0.21 Q-105 A，MC-10（第 10 輪 1.3.1、MC-09） */ && APP_VER === PKG.version && metaCount === 1 && /^[0-9a-f]{16}$/.test(BUILD_ID) && swId === BUILD_ID && swId.slice(0, 7) === BUILD_ID.slice(0, 7)
    && same && leftovers.length === 0 && swLeft.length === 0 && pkgInSite.length === 0 && fileText === `版本 ${PKG.version}（建置 ${BUILD_ID.slice(0, 7)}）`;
  return { ok, note: `package.json version ${PKG.version}；emt-app-version ${APP_VER}（${metaCount} 個）；emt-build-id ${BUILD_ID}；sw.js BUILD_ID ${swId}、CACHE_NAME ${cacheName && cacheName.trim()}；畫面「${fileText}」；dist 與 site/index.html 逐位元組相同=${same}；@@ 殘留 HTML ${leftovers.length}／sw ${swLeft.length}；site 內 package 檔 ${pkgInSite.length}（共 ${fs.readdirSync(SITE, { recursive: true }).filter((f) => fs.statSync(path.join(SITE, f)).isFile()).length} 檔）` };
});

// ═════════ TC-42-04：建置可重現與版本敏感（V-VER-02；不改 src、package.json、dist） ═════════
if (!EDGE) {
  const sha = (f) => crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex").slice(0, 16);
  const build = (dir, extra = []) => { const r = spawnSync(process.execPath, ["tools/build.mjs", "--out", path.join(dir, "t.html"), ...extra], { cwd: ROOT, encoding: "utf8" }); if (r.status !== 0) throw new Error(dir + " 建置失敗：" + (r.stdout + r.stderr).slice(-500)); return dir; };
  const files = ["t.html", "site/index.html", "site/sw.js", "site/manifest.webmanifest"];
  const A1 = build(path.join(TMP, "a1")), A2 = build(path.join(TMP, "a2"));
  // 第 7 輪起：AC-42-04 (b) 以「目前版本的修訂號 +1」執行（第 8 輪 v0.18 為 1.2.0 → 1.2.1；條文例子 1.0.0 → 1.0.1，性質相同）
  const BUMP = PKG.version.replace(/\d+$/, (n) => String(Number(n) + 1));
  const pkg101 = path.join(TMP, "package-bump.json"); fs.writeFileSync(pkg101, JSON.stringify({ ...PKG, version: BUMP }, null, 2) + "\n");
  const B = build(path.join(TMP, "b"), ["--package", pkg101]);
  const app2 = path.join(TMP, "app-c"); fs.cpSync(path.join(ROOT, "src/app"), app2, { recursive: true, filter: (s) => !s.includes("__tests__") });
  { const f = path.join(app2, "main.js"); const s = fs.readFileSync(f, "utf8"); const i = s.indexOf("。"); fs.writeFileSync(f, s.slice(0, i) + "，" + s.slice(i + 1)); }
  const C = build(path.join(TMP, "c"), ["--app", app2]);
  const info = (dir) => { const h = fs.readFileSync(path.join(dir, "t.html"), "utf8"); const sw = fs.readFileSync(path.join(dir, "site/sw.js"), "utf8"); return { ver: metaOf(h, "emt-app-version"), id: metaOf(h, "emt-build-id"), swId: (sw.match(/BUILD_ID\s*=\s*"([0-9a-f]+)"/) || [])[1], sw: sha(path.join(dir, "site/sw.js")) }; };
  const ia = info(A1), ib = info(B), ic = info(C);
  await R.check("TC-42-04a", "AC-42-04 (a)、AC-36-01 (a)", async () => {
    const eq = files.map((f) => [f, sha(path.join(A1, f)) === sha(path.join(A2, f))]);
    const eqDist = sha(path.join(A1, "t.html")) === sha(DIST) && sha(path.join(A1, "site/sw.js")) === sha(path.join(SITE, "sw.js"));
    return { ok: eq.every(([, v]) => v) && eqDist && ia.ver === PKG.version, note: `連續建置 2 次（--out 到暫存目錄）：${eq.map(([f, v]) => `${f} 相同=${v}`).join("、")}；與 dist 相同=${eqDist}；版本 ${ia.ver}、BUILD_ID ${ia.id}` };
  });
  await R.check("TC-42-04b", "AC-42-04 (b)、E-97（建置面）", async () => {
    const ok = ib.ver === BUMP && ib.id !== ia.id && ib.swId === ib.id && ib.sw !== ia.sw && /^[0-9a-f]{16}$/.test(ib.id);
    return { ok, note: `只改 --package 的 version ${PKG.version}→${BUMP}（複本 ${path.basename(pkg101)}，不改專案 package.json）：emt-app-version ${ib.ver}；BUILD_ID ${ia.id}→${ib.id}；sw.js BUILD_ID ${ib.swId}、內容不同=${ib.sw !== ia.sw}；未手動修改 HTML、sw、快取設定` };
  });
  await R.check("TC-42-04c", "AC-42-04 (c)、AC-36-01 (b)", async () => {
    const ok = ic.ver === PKG.version && ic.id !== ia.id && ic.swId === ic.id;
    return { ok, note: `src/app 複本 main.js 改 1 個字（「。」→「，」）：emt-app-version ${ic.ver}（不變）；BUILD_ID ${ia.id}→${ic.id}；sw.js BUILD_ID ${ic.swId}` };
  });
  // (b) 的 PWA 更新：已造訪目前版本（第 8 輪 1.2.0）的 https 版（本機 serve），重新部署修訂號 +1 版後出現「有新版本，請更新版本」與「更新版本」按鈕並更新
  await R.check("TC-42-04d", "AC-42-04 (b)（更新流程）、AC-36-03、E-97", async () => {
    await serve(SITE);
    const x = await env({});
    try {
      const { page } = x;
      await page.goto(BASE); await startLearning(page); const sw = await waitSW(page); await sleep(1500);
      const v1 = await page.evaluate(() => (document.getElementById("app-version") || {}).textContent);
      await stopServer(); await serve(path.join(B, "site"));
      await page.reload(); const t0 = Date.now(); let n = null;
      while (Date.now() - t0 < 60000) { n = await page.evaluate(() => { const h = document.querySelector("#pwa-update"); if (!h || h.hidden || getComputedStyle(h).display === "none") return null; return (h.querySelector(".pwa-update__text") || h).textContent; }); if (n) break; await sleep(250); }
      const ms = Date.now() - t0;
      const btn = n ? await page.evaluate(() => (document.querySelector(".pwa-update__btn") || {}).textContent) : null;
      if (n) { await page.click(".pwa-update__btn"); await sleep(5000); }
      const v2 = await page.evaluate(() => (document.getElementById("app-version") || {}).textContent);
      const ok = sw.ok && v1 === `版本 ${PKG.version}（建置 ${ia.id.slice(0, 7)}）` && n === "有新版本，請更新版本" && btn === "更新版本" && v2 === `版本 ${BUMP}（建置 ${ib.id.slice(0, 7)}）`;
      return { ok, note: `V1 service worker 啟用=${sw.ok}、版本行「${v1}」；部署 ${BUMP} 後重新載入 ${n ? ms + " ms 出現「" + n + "」" : "60 秒內未出現提示"}；按鈕「${btn}」；按下後版本行「${v2}」` };
    } finally { await x.ctx.close(); await stopServer(); }
  });
} else for (const t of ["TC-42-04a", "TC-42-04b", "TC-42-04c", "TC-42-04d"]) R.na(t, "AC-42-04", "Edge 冒煙不跑建置類 TC（Chrome 已驗）");

// ═════════ TC-43-01：領域範本區塊 hidden＋inert、不可聚焦、不可觸發 ═════════
await R.check("TC-43-01", "AC-43-01、AC-25-06、E-101", async () => {
  const notes = []; let ok = true;
  for (const [w, h] of [[375, 667], [1366, 768]]) {
    const x = await env({ width: w, height: h, serviceWorkers: "block" }); const { page } = x;
    await page.goto(FILE_URL); await sleep(300);
    const fr = await page.evaluate(() => ({ entry: document.body.dataset.entry, tplShown: [...document.querySelectorAll("[data-template]")].filter((e) => window.__qaV.shown(e)).length, text: /領域範本|資工|商管|生醫統計/.test(document.body.innerText) }));
    const frTab = await tabWalk(page, 40);
    await startLearning(page); await goTab(page, "customizer");
    const r = await page.evaluate(() => { const host = document.getElementById("customizer-custom"); const kids = [...host.children];
      const sec = document.querySelector("[data-template]") && document.querySelector("[data-template]").closest("section");
      const form = kids[0], list = kids[2];
      return { kids: kids.length, secIdx: kids.indexOf(sec), hidden: sec && sec.hasAttribute("hidden"), inert: sec && sec.hasAttribute("inert"), display: sec && getComputedStyle(sec).display, h: sec && sec.getBoundingClientRect().height,
        btns: sec ? [...sec.querySelectorAll("[data-template]")].map((b) => b.dataset.template + ":" + b.textContent).join(",") : "", shownBtns: [...document.querySelectorAll("[data-template]")].filter((e) => window.__qaV.shown(e)).length,
        gap: Math.round((list.getBoundingClientRect().top - form.getBoundingClientRect().bottom) * 10) / 10, formMb: getComputedStyle(form).marginBottom,
        visTextHit: /領域範本|資工|商管|生醫統計/.test(document.getElementById("view-customizer").innerText), tplData: Array.isArray(window.DOMAIN_TEMPLATES) ? window.DOMAIN_TEMPLATES.length : -1,
        formShown: window.__qaV.shown(document.querySelector(".cv-form")), listShown: window.__qaV.shown(list) }; });
    const seq = await tabWalk(page);
    const cv0 = await page.evaluate(() => EMT.store.getState().data.customVocab.length);
    // 嘗試以程式聚焦後按 Enter／空白鍵、以 click() 事件觸發（一般使用者無法做到，此處只確認 inert 生效）
    const focusTry = await page.evaluate(() => { const b = document.querySelector('[data-template="cs"]'); b.focus(); return document.activeElement === b; });
    await page.keyboard.press("Enter"); await page.keyboard.press("Space"); await sleep(150);
    const clickTry = await page.click('[data-template="cs"]', { timeout: 800 }).then(() => "可點擊").catch(() => "無法點擊");
    const cv1 = await page.evaluate(() => EMT.store.getState().data.customVocab.length);
    const content = await page.content();
    const src = ["cs", "business", "biostat"].every((t) => content.includes(`data-template="${t}"`)) && HTML.includes("DOMAIN_TEMPLATES") && HTML.includes("injectTemplate");
    // AC-04 表單照常：新增與刪除
    await page.fill("#cv-word", "qaverword"); await page.fill("#cv-meaning", "版本測試"); await page.click('.cv-form button[type="submit"]'); await sleep(150);
    const added = await page.evaluate(() => EMT.store.getState().data.customVocab.map((c) => c.word).join());
    await page.click(".cv-item__delete"); await sleep(150); if (await page.$('.dialog [data-action="ok"]')) { await page.click('.dialog [data-action="ok"]'); await sleep(150); }
    const removed = await page.evaluate(() => EMT.store.getState().data.customVocab.length);
    const errs = errorsOf(x);
    const good = fr.entry === "firstRun" && fr.tplShown === 0 && !fr.text && !frTab.some((s) => /tpl=|隱藏容器/.test(s))
      && r.kids === 3 && r.secIdx === 1 && r.hidden && r.inert && r.display === "none" && r.h === 0 && r.shownBtns === 0 && r.btns === "cs:資工,business:商管,biostat:生醫統計"
      && Math.abs(r.gap - 12) <= 0.5 && !r.visTextHit && r.tplData === 3 && r.formShown && r.listShown && !seq.some((s) => /tpl=|隱藏容器/.test(s)) && !focusTry && clickTry === "無法點擊" && cv0 === cv1 && src
      && added === "qaverword" && removed === 0 && errs.length === 0;
    ok = ok && good;
    notes.push(`【${w}×${h}】首次畫面：可見範本按鈕 ${fr.tplShown}、可見範本字樣=${fr.text}、Tab ${frTab.length} 次無範本；一般頁：#customizer-custom 子節點 ${r.kids}、範本區為第 ${r.secIdx + 1} 個、hidden=${r.hidden}、inert=${r.inert}、display ${r.display}、高 ${r.h}、可見按鈕 ${r.shownBtns}、DOM 仍含 ${r.btns}；表單卡與清單卡間距 ${r.gap}px（表單 margin-bottom ${r.formMb}）；可見文字含範本名稱=${r.visTextHit}；Tab ${seq.length} 次焦點含範本=${seq.some((s) => /tpl=|隱藏容器/.test(s))}；程式 focus() 成功=${focusTry}、Enter／空白鍵與點擊（${clickTry}）後自訂字數 ${cv0}→${cv1}；交付檔含範本資料與注入程式=${src}、DOMAIN_TEMPLATES ${r.tplData} 筆；表單新增 ${added}、刪除後 ${removed}；Console 錯誤 ${errs.length}${errs.length ? JSON.stringify(errs).slice(0, 200) : ""}${good ? "" : "（不符）"}`);
    await x.ctx.close();
  }
  return { ok, note: notes.join(" ／ ") };
});

// ═════════ TC-43-02：畫面文字不出現「範本」（含對話框、Toast、空狀態） ═════════
const EMPTY_LIST = "尚未新增自訂單字。可用上方表單新增。";
const EMPTY_FC = "請到難易度設定選擇色級並按「套用」，或新增自訂單字。";
// 無內建資料 fixture（單字集為空，AC-06-06）：只含 sources.js 的資料目錄＋--no-site
let NODATA = process.env.QA_FIXTURE_NODATA;
if (!NODATA || !fs.existsSync(NODATA)) {
  const d = path.join(TMP, "emptydata"); fs.mkdirSync(d, { recursive: true }); fs.copyFileSync(path.join(ROOT, "src/data/sources.js"), path.join(d, "sources.js"));
  NODATA = path.join(TMP, "fixture-nodata.html");
  const r = spawnSync(process.execPath, ["tools/build.mjs", "--out", NODATA, "--data", d, "--no-site"], { cwd: ROOT, encoding: "utf8" });
  if (r.status !== 0) console.log("無資料 fixture 建置失敗：" + (r.stdout + r.stderr).slice(-300));
}
await R.check("TC-43-02", "AC-43-02、AC-06-06、E-100、AC-43-01", async () => {
  const notes = []; let ok = true;
  const scan = async (page, where, hits) => { const t = await page.evaluate(() => window.__qaV.visibleText()); const h = t.filter((s) => s.includes("範本")); if (h.length) hits.push(`${where}：${h.join("｜").slice(0, 200)}`); return t; };
  for (const [w, h] of [[375, 667], [1366, 768]]) {
    // (a) 自訂單字為空（一般資料）
    const x = await env({ width: w, height: h, serviceWorkers: "block" }); const { page } = x; const hits = [];
    await page.goto(FILE_URL); await sleep(300); await scan(page, "首次畫面", hits);
    await startLearning(page);
    await scan(page, "主控台", hits);
    await page.click(".db-backup__toggle").catch(() => {}); await sleep(150); await scan(page, "主控台（資料備份展開）", hits);
    await goTab(page, "customizer"); await scan(page, "難易度設定（自訂清單空）", hits);
    const emptyList = await page.evaluate(() => { const e = document.querySelector(".cv-list__empty"); return e && window.__qaV.shown(e) ? e.textContent : null; });
    // 對話框：新增單字後刪除的確認視窗；Toast：新增單字
    await page.fill("#cv-word", "qatplscan"); await page.fill("#cv-meaning", "掃描"); await page.click('.cv-form button[type="submit"]'); await sleep(200);
    await scan(page, "新增單字後", hits);
    await page.click(".cv-item__delete"); await sleep(200); await scan(page, "刪除確認視窗", hits);
    if (await page.$('.dialog [data-action="ok"]')) { await page.click('.dialog [data-action="ok"]'); await sleep(200); }
    await goTab(page, "flashcards"); await scan(page, "單字卡", hits);
    await page.click(".fc-front .sp-mic").catch(() => {}); await sleep(300); await scan(page, "STT 說明視窗", hits);
    if (await page.$('.dialog [data-action="ok"]')) { await page.click('.dialog [data-action="ok"]'); await sleep(200); }
    // 有學習紀錄後切換色級 → 初始化確認視窗
    await page.click(".fc-next").catch(() => {}); await sleep(300);
    await goTab(page, "part5"); await page.click("[data-p5=option]").catch(() => {}); await sleep(200); await scan(page, "模擬測驗", hits);
    await goTab(page, "customizer"); await page.click('.cz-level[data-color="orange"]'); await page.click("#cz-apply"); await sleep(250); await scan(page, "初始化確認視窗", hits);
    const hadDialog = !!(await page.$(".dialog")); if (hadDialog) { await page.click('.dialog [data-action="cancel"]'); await sleep(200); }
    await goTab(page, "sources"); await scan(page, "資料來源與授權", hits);
    const toasts = await page.evaluate(() => (window.__qaToasts || []).map((t) => t.text));
    const tHits = toasts.filter((s) => s.includes("範本"));
    const errs = errorsOf(x); await x.ctx.close();
    // (b) 單字集為空（無內建資料 fixture）
    const y = await env({ width: w, height: h, serviceWorkers: "block" }); const q = y.page; const hits2 = [];
    await q.goto(pathToFileURL(NODATA).href); await sleep(300); await scan(q, "fixture 首次畫面", hits2);
    await startLearning(q); await scan(q, "fixture 主控台", hits2);
    await goTab(q, "flashcards"); await scan(q, "fixture 單字卡空狀態", hits2);
    const fc = await q.evaluate(() => { const e = document.querySelector(".fc-empty__hint"); const b = [...document.querySelectorAll("#view-flashcards button,#view-flashcards [data-go]")].filter((x) => window.__qaV.shown(x)).map((x) => x.textContent.trim()); return { hint: e && window.__qaV.shown(e) ? e.textContent : null, btns: b }; });
    await goTab(q, "customizer"); await scan(q, "fixture 難易度設定", hits2);
    const emptyList2 = await q.evaluate(() => { const e = document.querySelector(".cv-list__empty"); return e && window.__qaV.shown(e) ? e.textContent : null; });
    const errs2 = errorsOf(y); await y.ctx.close();
    const tail = (s) => !s || /[或、，（(]$/.test(s) || /（\s*）|\(\s*\)/.test(s);
    const good = hits.length === 0 && tHits.length === 0 && hits2.length === 0 && emptyList === EMPTY_LIST && emptyList2 === EMPTY_LIST && fc.hint === EMPTY_FC && !tail(emptyList) && !tail(fc.hint)
      && fc.btns.some((b) => b.includes("難易度設定")) && hadDialog && errs.length === 0 && errs2.length === 0;
    ok = ok && good;
    notes.push(`【${w}×${h}】(a) 掃描 10 個畫面／狀態（首次畫面、主控台含資料備份、難易度設定、新增後、刪除確認視窗、單字卡、STT 說明視窗、模擬測驗、初始化確認視窗=${hadDialog}、資料來源頁）命中 ${hits.length}${hits.length ? JSON.stringify(hits) : ""}；Toast ${toasts.length} 則（${toasts.join("｜").slice(0, 120)}）命中 ${tHits.length}；自訂清單空狀態「${emptyList}」；(b) 無資料 fixture 命中 ${hits2.length}${hits2.length ? JSON.stringify(hits2) : ""}、單字卡空狀態「${fc.hint}」、按鈕 ${fc.btns.join("/")}、自訂清單空狀態「${emptyList2}」；Console 錯誤 ${errs.length + errs2.length}${good ? "" : "（不符）"}`);
  }
  return { ok, note: notes.join(" ／ ") };
});

// ═════════ TC-43-03：v0.13 注入的範本單字保留（以 git 8a266c3 的 v0.13 交付檔實際注入「資工」產生前置資料） ═════════
const V013 = path.join(TMP, "v013.html");
let v013ok = false;
try { fs.writeFileSync(V013, execFileSync("git", ["show", "8a266c3:dist/english-master-track.html"], { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 })); v013ok = true; } catch (e) { console.log("取不到 v0.13 交付檔：" + e.message); }
let LS013 = null, BK013 = null;
if (v013ok) {
  const x = await env({ serviceWorkers: "block" }); const { page } = x;
  await page.goto(pathToFileURL(V013).href); await startLearning(page); await page.evaluate(() => EMT.router.go("customizer")); await sleep(300);
  await page.fill("#cv-word", "qaformword"); await page.fill("#cv-meaning", "表單字"); await page.click('.cv-form button[type="submit"]'); await sleep(200);
  await page.click('[data-template="cs"]'); await sleep(300); // v0.13 畫面上的範本按鈕
  LS013 = await lsAll(page); BK013 = await page.evaluate(() => EMT.store.actions.exportBackup().json);
  await x.ctx.close();
}
async function check4303(mode) {
  const x = await env({ serviceWorkers: "block" }); const { page } = x;
  const pre = JSON.parse(LS013[KEY]); const preCv = pre.data.customVocab;
  if (mode === "localStorage") {
    await page.goto(FILE_URL); await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, LS013[KEY]]); await page.reload(); await sleep(400);
  } else {
    await page.goto(FILE_URL); await startLearning(page); await page.evaluate(() => EMT.router.go("dashboard")); await sleep(300);
    await page.click(".db-backup__toggle").catch(() => {}); await sleep(150);
    const f = path.join(TMP, "v013-backup.json"); fs.writeFileSync(f, BK013);
    const [fcEv] = await Promise.all([page.waitForEvent("filechooser"), page.click('[data-action="import-backup"]')]);
    await fcEv.setFiles(f); await sleep(400);
    if (await page.$('.dialog [data-action="ok"]')) { await page.click('.dialog [data-action="ok"]'); await sleep(400); }
  }
  const s1 = await page.evaluate(() => ({ entry: document.body.dataset.entry, tab: EMT.router.current() }));
  const errs1 = errorsOf(x).slice();
  const ls1 = JSON.parse((await lsAll(page))[KEY]);
  const cvSame = JSON.stringify(ls1.data.customVocab) === JSON.stringify(preCv);
  await page.evaluate(() => EMT.router.go("customizer")); await sleep(300);
  const list = await page.evaluate(() => [...document.querySelectorAll(".cv-item")].map((li) => ({ word: (li.querySelector(".cv-item__word") || {}).textContent, badge: [...li.querySelectorAll(".cv-badge")].map((b) => b.textContent).join("/"), src: !!li.querySelector(".cv-item__source"), text: li.innerText })));
  const tplWords = preCv.filter((c) => c.origin === "template").map((c) => c.word);
  const listOk = list.length === 11 && list.every((i) => i.badge === "自訂擴充" && !i.src && !i.text.includes("範本") && !/資工|商管|生醫統計/.test(i.text)) && tplWords.length === 10 && tplWords.includes("Latency") && tplWords.includes("Scalability");
  // 單字卡：共 N 張含 11 字；範本字 TTS、STT
  const fcInfo = await page.evaluate((words) => { const s = EMT.store.getState().runtime.studySet; const w = (c) => c.word || (c.item && c.item.word);
    return { n: s.length, has: words.every((x) => s.some((c) => w(c) === x)), idx: s.findIndex((c) => w(c) === "Latency") }; }, preCv.map((c) => c.word));
  await page.evaluate(() => EMT.router.go("flashcards")); await sleep(300);
  const total = await page.evaluate(() => document.querySelector(".fc-total").textContent);
  await page.evaluate((i) => EMT.store.actions.gotoCard(i), fcInfo.idx); await sleep(150);
  const word = await page.evaluate(() => document.querySelector(".fc-front .fc-word").textContent);
  const attrib = await page.evaluate(() => [...document.querySelectorAll(".fc-attrib__line")].map((e) => e.textContent).join("/"));
  const sp0 = await page.evaluate(() => window.__qaTts.spoken.length);
  await page.click(".fc-front .sp-tts__btn"); await sleep(200);
  const spoken = await page.evaluate((n) => window.__qaTts.spoken.slice(n).map((s) => s.text), sp0);
  await page.evaluate(() => EMT.store.actions.acknowledgeSttNotice());
  await page.click(".fc-front .sp-mic"); await sleep(400);
  await page.evaluate((w) => { window.__qaStt.last.emitResult(w); window.__qaStt.last.emitEnd(); }, word); await sleep(250);
  const score = await page.evaluate(() => { const r = document.querySelector(".fc-front .sp-result"); return r && !r.hidden ? r.innerText.replace(/\s+/g, " ") : ""; });
  // (3) 表單新增 latency → 單字已存在
  const lsBefore3 = (await lsAll(page))[KEY];
  await page.evaluate(() => EMT.router.go("customizer")); await sleep(300);
  await page.fill("#cv-word", "latency"); await page.fill("#cv-meaning", "延遲"); await page.click('.cv-form button[type="submit"]'); await sleep(200);
  const dupMsg = await page.evaluate(() => { const e = document.getElementById("cv-word-error"); return e && !e.hidden ? e.textContent : ""; });
  const cvAfter3 = JSON.parse((await lsAll(page))[KEY]).data.customVocab;
  const same3 = JSON.stringify(cvAfter3) === JSON.stringify(JSON.parse(lsBefore3).data.customVocab);
  // (4) 刪除 Scalability
  const idx = await page.evaluate(() => [...document.querySelectorAll(".cv-item")].findIndex((li) => li.querySelector(".cv-item__word").textContent === "Scalability"));
  await page.click(`.cv-item:nth-child(${idx + 1}) .cv-item__delete`).catch(async () => { await page.evaluate((i) => document.querySelectorAll(".cv-item__delete")[i].click(), idx); });
  await sleep(200); if (await page.$('.dialog [data-action="ok"]')) { await page.click('.dialog [data-action="ok"]'); await sleep(250); }
  const ls4 = JSON.parse((await lsAll(page))[KEY]);
  const expect4 = preCv.filter((c) => c.word !== "Scalability");
  const same4 = JSON.stringify(ls4.data.customVocab) === JSON.stringify(expect4);
  // (5) 匯出備份
  const bk = JSON.parse(await page.evaluate(() => EMT.store.actions.exportBackup().json));
  const same5 = JSON.stringify(bk.data.customVocab) === JSON.stringify(expect4) && bk.data.customVocab.filter((c) => c.origin === "template" && c.templateId === "cs").length === 9;
  const keysOk = Object.keys(await lsAll(page)).join() === KEY && ls4.schemaVersion === 3 && JSON.stringify(Object.keys(ls4.data).slice(0, 9)) === JSON.stringify(Object.keys(pre.data).slice(0, 9)) && Object.keys(ls4.data).length === 12 && Object.keys(bk).length === 5;
  const errs = errorsOf(x); await x.ctx.close();
  const ok = s1.entry === "main" && s1.tab === "dashboard" && errs1.length === 0 && cvSame && listOk && fcInfo.has && total === `共 ${fcInfo.n} 張` && attrib.includes("自訂擴充")
    && spoken.length === 1 && spoken[0] === word && score.includes("100") && dupMsg === "單字已存在" && same3 && same4 && same5 && keysOk && errs.length === 0;
  return { ok, note: `(1) ${mode === "localStorage" ? "v0.13 localStorage 直接開啟" : "匯入 v0.13 備份並確認"} → ${s1.entry}/${s1.tab}、錯誤 ${errs1.length}；customVocab 與開啟前逐欄相同=${cvSame}（範本字 ${tplWords.length}：${tplWords.join(",")}）；(2) 清單 ${list.length} 項、標示 ${[...new Set(list.map((i) => i.badge))].join("/")}、含來源標示節點 ${list.filter((i) => i.src).length}、含「範本」${list.filter((i) => i.text.includes("範本")).length}；單字卡「${total}」含 11 字=${fcInfo.has}；卡片 ${word} 出處「${attrib}」、TTS ${JSON.stringify(spoken)}、STT「${score}」；(3) 新增 latency →「${dupMsg}」、localStorage 不變=${same3}；(4) 刪除 Scalability 後其餘 10 字逐欄相同=${same4}；(5) 備份 customVocab ${bk.data.customVocab.length} 字與 localStorage 相同、origin/templateId 保留=${same5}；鍵名、欄位集合、schemaVersion ${ls4.schemaVersion}、備份頂層 ${Object.keys(bk).length} 欄=${keysOk}；Console 錯誤 ${errs.length}` };
}
if (LS013) {
  await R.check("TC-43-03a", "AC-43-03（localStorage）、AC-04-06、AC-04-07、AC-23-01、E-99、E-19", () => check4303("localStorage"));
  await R.check("TC-43-03b", "AC-43-03（匯入 v0.13 備份）、AC-24-08、E-99", () => check4303("backup"));
} else { R.fail("TC-43-03a", "AC-43-03", "無法取得 v0.13 交付檔（git show 8a266c3）"); }

// ═════════ TC-01-08：難易度設定頁狀態列只顯示一行「目前色級：{生效}」 ═════════
await R.check("TC-01-08", "AC-01-08、AC-01-07、AC-25-06、E-92", async () => {
  const notes = []; let ok = true;
  for (const [w, h] of [[375, 667], [1366, 768]]) {
    const x = await env({ width: w, height: h, serviceWorkers: "block" }); const { page } = x;
    await page.goto(FILE_URL); await startLearning(page); await goTab(page, "customizer");
    const st = () => page.evaluate(() => { const card = document.querySelector(".cz-status"); const l = document.getElementById("cz-st-line"); const v = document.getElementById("view-customizer").innerText;
      const rng = document.createRange(); if (l) rng.selectNodeContents(l);
      return { line: l ? l.textContent : null, cardText: card ? card.innerText.trim() : null, lines: l ? new Set([...rng.getClientRects()].map((r) => Math.round(r.top))).size : 0, clip: l ? l.scrollWidth > l.clientWidth : true,
        banned: ["目前目標色級", "目前生效色級", "內建上限"].filter((k) => v.includes(k)), old: document.querySelectorAll(".cz-st-target,.cz-st-effective,.cz-rows--status,.cz-status__cap").length,
        pressed: [...document.querySelectorAll(".cz-level[aria-pressed=true]")].map((b) => b.dataset.color).join(), aria: card && card.getAttribute("aria-label") }; });
    const seq = [];
    for (const c of ["orange", "brown", "green", "blue", "gold"]) { await page.click(`.cz-level[data-color="${c}"]`); await page.click("#cz-apply"); await sleep(200); if (await page.$('.dialog [data-action="ok"]')) { await page.click('.dialog [data-action="ok"]'); await sleep(200); } seq.push(await st()); }
    const exp = ["目前色級：橘", "目前色級：棕", "目前色級：綠", "目前色級：綠", "目前色級：綠"];
    const ok1 = seq.every((s, i) => s.line === exp[i] && s.cardText === exp[i] && s.lines === 1 && !s.clip && s.banned.length === 0 && s.old === 0 && s.aria === "目前色級");
    await page.click('.cz-level[data-color="green"]'); await page.click("#cz-apply"); await sleep(200);
    await page.click('.cz-level[data-color="brown"]'); await sleep(150); const s2 = await st();
    await page.click('.cz-level[data-color="blue"]'); await page.click("#cz-apply"); await sleep(200);
    const ls = JSON.parse((await lsAll(page))[KEY]);
    await page.reload(); await sleep(400); await goTab(page, "customizer"); const s3 = await st();
    const ok2 = s2.line === "目前色級：綠" && s2.pressed === "brown" && s2.banned.length === 0;
    const ok3 = s3.line === "目前色級：綠" && s3.pressed === "blue" && s3.lines === 1 && s3.banned.length === 0 && ls.schemaVersion === 3 && ls.data.goal.appliedColor === "blue" && ls.data.goal.effectiveColor === "green" && ls.data.goal.appliedScore === 855 && Object.keys(ls.data.goal).length === 4;
    const errs = errorsOf(x); await x.ctx.close();
    ok = ok && ok1 && ok2 && ok3 && errs.length === 0;
    notes.push(`【${w}px】(1) ${seq.map((s) => `「${s.line}」(${s.lines} 行${s.clip ? "、裁切" : ""})`).join("→")}；卡片全文＝該行=${seq.every((s, i) => s.cardText === exp[i])}、舊節點 ${seq[0].old}、aria-label「${seq[0].aria}」；(2) 套用綠後點棕未套用：「${s2.line}」、選中 ${s2.pressed}；(3) 套用藍後重新載入：「${s3.line}」、選中 ${s3.pressed}；禁用字樣 ${[...new Set([...seq, s2, s3].flatMap((s) => s.banned))].join("/") || "0"}；localStorage goal ${JSON.stringify(ls.data.goal)}、schemaVersion ${ls.schemaVersion}；Console 錯誤 ${errs.length}`);
  }
  return { ok, note: notes.join(" ／ ") };
});

// ═════════ TC-39-04v：主控台目標行文字與「變更」按鈕（計算後樣式、四種操作、減少動態） ═════════
const changeStyle = (page) => page.evaluate(() => { const b = document.querySelector("#view-dashboard .db-change"); const g = b.closest(".db-goal"); const t = g.querySelector(".db-goal__text"); const s = getComputedStyle(b); const V = window.__qaV;
  const bg = V.parse(s.backgroundColor); const sides = ["Top", "Right", "Bottom", "Left"].map((k) => ({ w: parseFloat(s["border" + k + "Width"]), st: s["border" + k + "Style"], c: s["border" + k + "Color"] }));
  const r = b.getBoundingClientRect(), tr = t.getBoundingClientRect(), gr = g.getBoundingClientRect();
  return { tag: b.tagName, type: b.type, cls: b.className, go: b.dataset.go, label: b.textContent.trim(), bg: s.backgroundColor, bgOpaque: !!bg && bg.a >= 0.999, border: sides.every((x) => x.w >= 1 && x.st !== "none"), borderDesc: sides.map((x) => `${x.w}px ${x.st} ${x.c}`)[0],
    deco: s.textDecorationLine, color: s.color, colors: [s.color, s.backgroundColor, ...sides.map((x) => x.c)], contrast: V.contrast(V.parse(s.color), V.effBg(b)), w: r.width, h: r.height,
    overlap: !(tr.right <= r.left || r.right <= tr.left || tr.bottom <= r.top || r.bottom <= tr.top), inside: r.left >= gr.left - 0.5 && r.right <= gr.right + 0.5, clip: b.scrollWidth > b.clientWidth || t.scrollWidth > t.clientWidth,
    text: t.textContent, full: g.innerText.replace(/\s+/g, " ").trim(), dot: (g.querySelector(".db-goal__dot") || {}).nodeType ? g.querySelector(".db-goal__dot").closest("[data-color]").dataset.color : null, sep: g.querySelectorAll(".db-goal__sep").length }; });
await R.check("TC-39-04v", "AC-39-04、AC-17-06、AC-38-01、AC-38-04、AC-38-06、AC-38-09、E-92", async () => {
  const notes = []; let ok = true;
  const EXP = { orange: "橘級・每日 10 字", brown: "棕級・每日 10 字", green: "綠級・每日 15 字", blue: "綠級・每日 15 字", gold: "綠級・每日 15 字" };
  for (const [w, h] of [[375, 667], [1366, 768]]) {
    const x = await env({ width: w, height: h, serviceWorkers: "block" }); const { page } = x;
    await page.goto(FILE_URL); await startLearning(page);
    const rows = [];
    for (const c of ["orange", "brown", "green", "blue", "gold"]) {
      await goTab(page, "customizer"); await page.click(`.cz-level[data-color="${c}"]`); await page.click("#cz-apply"); await sleep(200);
      if (await page.$('.dialog [data-action="ok"]')) { await page.click('.dialog [data-action="ok"]'); await sleep(200); }
      await goTab(page, "dashboard"); const s = await changeStyle(page);
      const eff = c === "blue" || c === "gold" ? "green" : c;
      const good = s.text === EXP[c] && !s.text.endsWith("・") && !/[藍金]|目標|生效|內建上限|分數/.test(s.full.replace("變更", "")) && s.sep === 0 && s.dot === eff
        && s.tag === "BUTTON" && s.type === "button" && !/btn--link/.test(s.cls) && s.go === "customizer" && s.label === "變更" && (s.bgOpaque || s.border) && !/underline/.test(s.deco)
        && !s.colors.includes(ORANGE) && !s.colors.includes(GREYLINE) && s.contrast >= 4.5 && s.w >= 44 && s.h >= 44 && !s.overlap && s.inside && !s.clip;
      ok = ok && good; rows.push({ c, s, good });
    }
    const s0 = rows[2].s;
    notes.push(`【${w}px】` + rows.map((r) => `${r.c}「${r.s.text}」點 ${r.s.dot}${r.good ? "" : "（不符：" + JSON.stringify(r.s).slice(0, 300) + "）"}`).join("、") + `；「變更」<${s0.tag} type=${s0.type} class="${s0.cls}">、底 ${s0.bg}（不透明=${s0.bgOpaque}）、框 ${s0.borderDesc}（四邊=${s0.border}）、字 ${s0.color}、裝飾線 ${s0.deco}、對比 ${s0.contrast}、${Math.round(s0.w)}×${Math.round(s0.h)}、與文字重疊=${s0.overlap}、裁切=${s0.clip}`);
    // 焦點框（Tab 取得焦點後）
    await page.evaluate(() => window.scrollTo(0, 0));
    let focusInfo = null;
    for (let i = 0; i < 40; i++) { await page.keyboard.press("Tab"); focusInfo = await page.evaluate(() => { const e = document.activeElement; if (!e || !e.classList.contains("db-change")) return null; const s = getComputedStyle(e); return { fv: e.matches(":focus-visible"), outline: `${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor}`, shadow: s.boxShadow, tabs: 0 }; }); if (focusInfo) { focusInfo.tabs = i + 1; break; } }
    const ringOk = !!focusInfo && focusInfo.fv && (!/^none/.test(focusInfo.outline) && parseFloat(focusInfo.outline.split(" ")[1]) >= 1 || focusInfo.shadow !== "none");
    ok = ok && ringOk; notes.push(`Tab ${focusInfo && focusInfo.tabs} 次到達「變更」、:focus-visible=${focusInfo && focusInfo.fv}、outline ${focusInfo && focusInfo.outline}、box-shadow ${focusInfo && focusInfo.shadow}`);
    // 四種操作：滑鼠、Enter、空白鍵（觸控另開 hasTouch context）
    const ops = [];
    for (const how of ["滑鼠", "Enter", "空白鍵"]) {
      await goTab(page, "dashboard"); const ls0 = JSON.stringify(await lsAll(page));
      if (how === "滑鼠") await page.click("#view-dashboard .db-change");
      else { await page.focus("#view-dashboard .db-change"); await page.keyboard.press(how === "Enter" ? "Enter" : "Space"); }
      await sleep(400);
      const r = await page.evaluate(() => ({ tab: EMT.router.current(), entry: document.body.dataset.entry, apply: window.__qaV.shown(document.getElementById("cz-apply")), custom: window.__qaV.shown(document.getElementById("customizer-custom")), nav: window.__qaV.shown(document.getElementById("app-nav")) }));
      const same = JSON.stringify(await lsAll(page)) === ls0;
      const good = r.tab === "customizer" && r.entry === "main" && r.apply && r.custom && r.nav && same; ok = ok && good; ops.push(`${how}→${r.tab}/${r.entry}、一般頁=${r.apply && r.custom}、localStorage 不變=${same}`);
    }
    notes.push(ops.join("、"));
    const errs = errorsOf(x); ok = ok && errs.length === 0; await x.ctx.close();
  }
  // 觸控
  {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true });
    for (const s of [...INITS, PROBE]) await ctx.addInitScript({ content: s });
    const page = await ctx.newPage(); await page.goto(FILE_URL); await startLearning(page); await page.evaluate(() => EMT.router.go("dashboard")); await sleep(300);
    const ls0 = JSON.stringify(await lsAll(page));
    await page.tap("#view-dashboard .db-change"); await sleep(400);
    const r = await page.evaluate(() => ({ tab: EMT.router.current(), apply: window.__qaV.shown(document.getElementById("cz-apply")) }));
    const same = JSON.stringify(await lsAll(page)) === ls0; ok = ok && r.tab === "customizer" && r.apply && same;
    notes.push(`觸控（375、hasTouch）→ ${r.tab}、一般頁=${r.apply}、localStorage 不變=${same}`);
    await ctx.close();
  }
  // (b) 減少動態
  {
    const x = await env({ width: 1366, height: 768, reducedMotion: "reduce", serviceWorkers: "block" }); const { page } = x;
    await page.goto(FILE_URL); await startLearning(page); await page.evaluate(() => EMT.router.go("dashboard")); await sleep(300);
    await page.click("#view-dashboard .db-change");
    const anims = []; for (let i = 0; i < 6; i++) { anims.push(await page.evaluate(() => document.getAnimations().length)); await sleep(50); }
    const tab = await tabNow(page); const tr = await page.evaluate(() => getComputedStyle(document.querySelector(".db-change")).transitionDuration);
    ok = ok && tab === "customizer" && anims.every((n) => n === 0);
    notes.push(`減少動態：點「變更」→ ${tab}、300 ms 內 getAnimations ${anims.join(",")}、按鈕 transition-duration ${tr}`);
    await x.ctx.close();
  }
  return { ok, note: notes.join("；") };
});

R.save(resultPath("e2e-version"));
await browser.close();
const f = R.results.filter((r) => r.result === "失敗").length;
console.log(`e2e-version：${R.results.length} 項，失敗 ${f}`);
process.exitCode = f ? 1 : 0;
