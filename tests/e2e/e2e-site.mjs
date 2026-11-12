// QA E2E 第 9 輪（PRD v0.19，R-27 三、R-28）：頁尾與應用內三頁、靜態頁、第一階段零廣告（US-53～US-57、AC-50-02、AC-23-07、AC-25-01、AC-41-04、AC-42-01、AC-21-01、AC-37-05、AC-52-01 第一階段）
// 依據：契約 §13.3 SP-1～SP-9、§13.4 SC-1～SC-6、V-SITE、V-SEO-05、V-SEO-08；architecture v0.14 §7.25.5～§7.25.10。
// 驅動：file:// 以 lib/cdp.mjs；正式網址以本機 HTTPS 伺服器＋瀏覽器主機對應（lib/ad-env.mjs startProdServer；對外網路全部阻斷）提供 dist/site（V-AD (b) 第一階段）。
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { launch, recorder, sleep, FILE_URL, ROOT, resultPath } from "./lib/cdp.mjs";
import { TOAST_RECORDER, fakeTts, fakeStt, fakeMic } from "./lib/inits.mjs";
import { KEY, stateRecord } from "./lib/state.mjs";
import { launchBrowser, newEnv, SITE, waitSW, cacheInfo, PRECACHE } from "./lib/pwa-env.mjs";
import { routeAd, PROD, seedInit, adState, startProdServer, prodBrowserArgs } from "./lib/ad-env.mjs";

const R = recorder("e2e-site");
const TMP = process.env.QA_TMP || path.join(ROOT, "tests", "results", "tmp"); fs.mkdirSync(TMP, { recursive: true });
const J = (x) => JSON.stringify(x);
const SIZES = [[375, 667], [390, 844], [412, 915], [768, 1024], [1366, 768], [1920, 1080]];
const TWO = [[375, 667], [1366, 768]];
const CONTACT = "email: d o n c l y d e 0 7 2 2 @ g m a i l . c o m";
const LINKS = ["關於我", "聯絡我們", "隱私權政策", "資料來源與授權"];
const PAGES = { about: "關於我", contact: "聯絡我們", privacy: "隱私權政策" };
const LABEL = { dashboard: "群島" /* 第 13 輪：AC-63-01 */, customizer: "難易度設定", flashcards: "單字卡", part5: "模擬測驗" };
const errs = (p) => p.log.exceptions.concat(p.log.console.filter((c) => c.type === "error").map((c) => c.text));
const netReqs = (p) => p.log.requests.filter((r) => !/^(file|blob|data|about|chrome-extension):/.test(r.url));
const lsRaw = (p) => p.ev(`localStorage.getItem(${J(KEY)})`);
const lsKeys = (p) => p.ev(`Object.keys(localStorage).sort()`);
async function open({ vp = [1366, 768] } = {}) {
  const p = await launch();
  for (const s of [TOAST_RECORDER, fakeTts("ok"), fakeStt("ok"), fakeMic("ok")]) await p.addInitScript(s);
  await p.viewport(vp[0], vp[1], vp[0] < 768);
  await p.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  return p;
}
const seed = async (p, over = {}) => { await p.ev(`localStorage.setItem(${J(KEY)}, ${J(J(stateRecord(725, { sttNoticeAcknowledged: true, ...over })))})`); await p.goto(); };

const footerInfo = (p) => p.ev(`(() => { const f = document.getElementById("footer-links"); const bs = [...f.querySelectorAll("button, a")]; const nav = document.getElementById("app-nav"); const fixedNav = nav && getComputedStyle(nav).position === "fixed" && nav.getClientRects().length > 0; const ver = document.getElementById("app-version"); const fr = f.getBoundingClientRect(); const vr = ver ? ver.getBoundingClientRect() : null;
  return { texts: bs.map((b) => b.textContent.trim()), sizes: bs.map((b) => { const r = b.getBoundingClientRect(); return [Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10]; }), clipped: bs.filter((b) => b.scrollWidth > b.clientWidth + 0.5).length, versionBelow: !!vr && vr.top >= fr.bottom - 0.5, verText: ver ? ver.textContent : null, role: f.getAttribute("role"), countAll: LINK_COUNT(), hs: document.documentElement.scrollWidth > document.documentElement.clientWidth };
  function LINK_COUNT() { return ${J(LINKS)}.map((t) => [...document.querySelectorAll("#app-footer button, #app-footer a")].filter((x) => x.textContent.trim() === t).length); } })()`);
/** 捲到底並確認頁尾與版本行不被底部導覽或首次固定列遮住 */
const footerCover = (p) => p.ev(`(async () => { window.scrollTo(0, document.documentElement.scrollHeight); await new Promise((r) => setTimeout(r, 120)); const els = [...document.querySelectorAll("#footer-links button"), document.getElementById("app-version")].filter(Boolean); const bad = []; for (const e of els) { const r = e.getBoundingClientRect(); const pts = [[r.left + r.width / 2, r.top + r.height / 2], [r.left + 2, r.top + 2], [r.right - 2, r.bottom - 2]]; for (const [x, y] of pts) { const h = document.elementFromPoint(x, y); if (!h || !(h === e || e.contains(h) || h.contains(e))) { bad.push((e.id || e.textContent.trim()) + "@" + Math.round(x) + "," + Math.round(y) + "→" + (h ? (h.id || h.className || h.nodeName) : "null")); break; } } if (r.bottom > innerHeight + 0.5) bad.push((e.id || e.textContent.trim()) + " 超出視窗"); } return bad; })()`);
const content = (p, id) => p.ev(`(() => { const v = document.getElementById("view-${id}"); const c = v.querySelector("[data-site-page-content]"); const b = v.querySelector(".site-return"); const hs = [...document.querySelectorAll("h1, h2, h3")].filter((e) => e.getClientRects().length > 0 && !e.closest("[hidden]")).map((e) => e.tagName + ":" + e.textContent.trim().slice(0, 16)); return { visible: !v.hidden && v.getClientRects().length > 0, text: c ? c.innerText.replace(/\\s+/g, " ").trim() : null, textContent: c ? c.textContent : null, tags: c ? [...c.querySelectorAll("*")].map((e) => e.tagName.toLowerCase()) : [], back: b ? b.textContent : null, backInside: !!(c && b && c.contains(b)), heads: hs, form: v.querySelectorAll("form, input, textarea, select").length, sub: v.querySelectorAll("button[type=submit], input[type=submit]").length, nav: document.querySelector("#app-nav") ? document.querySelector("#app-nav").getClientRects().length > 0 : false, focus: document.activeElement ? document.activeElement.tagName + ":" + document.activeElement.textContent.slice(0, 12) : "", tab: EMT.router.current() }; })()`);

// ═════ AC-57-01、AC-42-01、AC-53-01：頁尾與開啟返回（一般模式、全部尺寸）═════
{
  const p = await open(); await p.goto(); await seed(p, { part5: { currentIndex: 3, lockedSelection: null, phase: "question", roundAnswered: 1, roundCorrect: 1, totalAnswered: 2, totalCorrect: 1 } });
  await R.check("TC-57-01a", "AC-57-01、AC-42-01、AC-20-03、AC-27-03（V-SITE-01；全部尺寸 × 8 畫面）", async () => {
    const out = []; let ok = true;
    for (const [w, h] of SIZES) { await p.viewport(w, h, w < 768); await sleep(70); const line = [];
      for (const tab of ["dashboard", "customizer", "flashcards", "part5", "about", "contact", "privacy", "sources"]) { await p.ev(`EMT.router.go(${J(tab)})`); await sleep(50); const f = await footerInfo(p); const c = await footerCover(p); const nav = await p.ev(`[...document.querySelectorAll("#app-nav [data-tab]")].map((b) => b.textContent.trim()).join("、")`);
        const small = f.sizes.filter(([a, b]) => a < 44 || b < 44); const g = J(f.texts) === J(LINKS) && small.length === 0 && f.clipped === 0 && f.versionBelow && f.countAll.every((n) => n === 1) && c.length === 0 && !f.hs && nav === "群島、難易度設定、單字卡、模擬測驗" /* 第 13 輪 AC-20-03 v0.22 */; ok = ok && g; if (!g) line.push(`${tab}✗ ${J(f)} 遮 ${J(c)} 導覽 ${nav}`); }
      const f = await footerInfo(p); out.push(`${w}×${h}：${line.length ? line.join("｜") : "8 畫面全符合"}；連結尺寸 ${J(f.sizes)}`); }
    return { ok, note: out.join("；") };
  });
  await R.check("TC-57-01b", "AC-57-01、AC-53-01、AC-38-09（點擊與 Tab＋Enter 開啟返回；返回原畫面）", async () => {
    await p.viewport(1366, 768, false); const out = []; let ok = true;
    for (const from of ["dashboard", "customizer", "flashcards", "part5"]) for (const id of ["about", "contact", "privacy", "sources"]) {
      await p.ev(`EMT.router.go(${J(from)})`); await sleep(40);
      await p.click(`#footer-${id}`); await sleep(60); const c = await content(p, id); const expect = "返回" + LABEL[from];
      await p.click(`#view-${id} .site-return`); await sleep(60); const back = await p.ev("EMT.router.current()");
      const g = c.tab === id && c.visible && c.back === expect && back === from; ok = ok && g; if (!g) out.push(`${from}→${id}✗ ${J(c).slice(0, 200)} 返回 ${back}`);
    }
    // 頁面間切換後返回不應回到對外頁面（SP-3）
    await p.ev(`EMT.router.go("part5")`); await sleep(40); await p.click("#footer-about"); await sleep(50); await p.click("#footer-contact"); await sleep(50); const c2 = await content(p, "contact"); await p.click("#view-contact .site-return"); await sleep(50); const back2 = await p.ev("EMT.router.current()"); const g2 = c2.back === "返回模擬測驗" && back2 === "part5"; ok = ok && g2; out.push(`模擬測驗→關於我→聯絡我們→返回 = ${back2}`);
    // Tab + Enter
    await p.ev(`EMT.router.go("dashboard"); document.activeElement && document.activeElement.blur(); window.scrollTo(0,0)`); await sleep(50); let hit = false; for (let i = 0; i < 80 && !hit; i++) { await p.key("Tab", "Tab", 9); hit = await p.ev(`document.activeElement && document.activeElement.id === "footer-about"`); }
    const ring = await p.ev(`(() => { const c = getComputedStyle(document.activeElement); return c.outlineStyle + " " + c.outlineWidth; })()`);
    await p.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: "\r" }); await p.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 }); await sleep(100); const c3 = await content(p, "about"); const g3 = hit && c3.tab === "about" && /^H2/.test(c3.focus) && /solid/.test(ring) && parseFloat(ring.split(" ")[1]) >= 2; ok = ok && g3; out.push(`Tab 到關於我=${hit}、焦點框 ${ring}、Enter 開啟 ${c3.tab}、焦點 ${c3.focus}`);
    return { ok, note: out.join("；") + "；4 來源 × 4 頁面點擊開啟與返回皆回原畫面" };
  });
  await R.check("TC-56-04a", "AC-56-04（應用內 h1～h3）", async () => {
    const out = []; let ok = true;
    for (const t of ["dashboard", "customizer", "flashcards", "part5", "about", "contact", "privacy", "sources"]) { await p.ev(`EMT.router.go(${J(t)})`); await sleep(50); const r = await p.ev(`(() => { const hs = [...document.querySelectorAll("h1, h2, h3")].filter((e) => e.getClientRects().length > 0 && !e.closest("[hidden]")); const lv = hs.map((e) => Number(e.tagName[1])); return { h1: lv.filter((x) => x === 1).length, jump: lv.some((v, i) => i > 0 && v > lv[i - 1] + 1), lv: lv.join(""), h2: (hs.find((e) => e.tagName === "H2") || {}).textContent }; })()`); const need = PAGES[t] ? r.h2 === PAGES[t] : true; const g = r.h1 === 1 && !r.jump && need; ok = ok && g; out.push(`${t}：h1 ${r.h1}、層級 ${r.lv}${PAGES[t] ? "、h2「" + r.h2 + "」" : ""}${g ? "" : "✗"}`); }
    return { ok, note: out.join("；") };
  });
  await R.check("TC-55-01a", "AC-55-01、AC-55-02、AC-55-03、AC-53-05（聯絡我們內容區）", async () => {
    await p.ev(`EMT.router.go("contact")`); await sleep(50); const c = await content(p, "contact"); const line = await p.ev(`(() => { const e = [...document.querySelectorAll("#view-contact [data-site-page-content] p")][0]; const cs = getComputedStyle(e); const rg = document.createRange(); rg.selectNodeContents(e); const a = e.closest("a"); return { text: e.textContent, isLink: !!a, tabindex: e.getAttribute("tabindex"), aria: e.getAttribute("aria-label"), title: e.getAttribute("title"), color: cs.color, cls: e.className, lines: rg.getClientRects().length }; })()`);
    const g = c.text === `聯絡我們 ${CONTACT}` && J(c.tags) === J(["h2", "p"]) && c.form === 0 && c.sub === 0 && !c.backInside && line.text === CONTACT && !line.isLink && line.tabindex === null && line.aria === null && line.title === null && line.color !== "rgb(247, 137, 59)";
    return { ok: g, note: `內容區「${c.text}」元素 ${c.tags.join("、")}；表單 ${c.form}；返回鈕在內容區外=${!c.backInside}；信箱行 ${J(line)}` };
  });
  await R.check("TC-23-07t", "AC-23-07 (1)(2)(4)(6)(7)、AC-55-02、AC-53-02 (6)（全部頁面與兩種寬度）", async () => {
    const out = []; let ok = true;
    for (const [w, h] of TWO) { await p.viewport(w, h, w < 768); await sleep(60);
      const list = {}; for (const t of ["dashboard", "customizer", "flashcards", "part5", "about", "contact", "privacy", "sources"]) { await p.ev(`EMT.router.go(${J(t)})`); await sleep(40); list[t] = await p.ev(`(() => { const t = [...document.querySelectorAll("#app-main p")].filter((e) => e.getClientRects().length > 0 && e.textContent.trim() === ${J(CONTACT)}); const e = t[0]; if (!e) return { n: 0 }; const r = e.getBoundingClientRect(); const rg = document.createRange(); rg.selectNodeContents(e); const lines = new Set([...rg.getClientRects()].map((x) => Math.round(x.top))).size; e.scrollIntoView({ block: "center" }); const q = e.getBoundingClientRect(); const hit = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); return { n: t.length, lines, a: !!e.closest("a"), clipped: e.scrollWidth > e.clientWidth + 0.5, hit: !!hit && (hit === e || e.contains(hit)), hs: document.documentElement.scrollWidth > document.documentElement.clientWidth }; })()`); }
      const shows = Object.entries(list).filter(([, v]) => v.n > 0).map(([k]) => k).sort(); const g = J(shows) === J(["contact", "privacy", "sources"]) && ["contact", "privacy", "sources"].every((k) => list[k].n === 1 && !list[k].a && !list[k].clipped && list[k].hit && !list[k].hs); ok = ok && g; out.push(`${w}px：顯示於 ${shows.join("、")}；${J({ c: list.contact, p: list.privacy, s: list.sources })}`); }
    return { ok, note: out.join("；") };
  });
  await R.check("TC-57-02a", "AC-57-02、AC-53-03、AC-21-01、AC-37-01（file:// 閱讀 3 頁：請求 0、不寫入）", async () => {
    await p.viewport(1366, 768, false); const raw = await lsRaw(p); const before = netReqs(p).length; for (const t of ["about", "contact", "privacy"]) { await p.ev(`EMT.router.go(${J(t)})`); await sleep(60); await p.ev(`window.scrollTo(0, document.documentElement.scrollHeight)`); await sleep(50); const c = await content(p, t); if (!c.text || c.text.length < 5) return { ok: false, note: t + " 無內容" }; } const raw2 = await lsRaw(p); const ext = await p.ev(`[...document.querySelectorAll("#view-privacy [data-site-page-content] a, #view-about [data-site-page-content] a")].map((a) => ({ href: a.getAttribute("href"), rel: a.getAttribute("rel"), target: a.getAttribute("target") }))`); const relOk = ext.length >= 1 && ext.every((a) => /noopener/.test(a.rel || ""));
    return { ok: raw === raw2 && netReqs(p).length === before && before === 0 && errs(p).length === 0 && relOk, note: `localStorage 不變=${raw === raw2}；非 file 請求 ${netReqs(p).length}；錯誤 ${errs(p).length}；應用內外部連結 ${J(ext)} rel noopener=${relOk}` };
  });
  await R.check("TC-57-07", "AC-53-05（版面）、AC-38-01、AC-38-04、AC-20-01（3 頁全部尺寸）", async () => {
    const out = []; let ok = true;
    for (const [w, h] of SIZES) { await p.viewport(w, h, w < 768); await sleep(60); for (const t of ["about", "contact", "privacy"]) { await p.ev(`EMT.router.go(${J(t)}); window.scrollTo(0, 0)`); await sleep(40); const r = await p.ev(`(() => { const parse = (c) => { const m = c.match(/rgba?\\(([^)]+)\\)/); const a = m[1].split(/[ ,\\/]+/).filter(Boolean).map(Number); return { r: a[0], g: a[1], b: a[2], a: a.length > 3 ? a[3] : 1 }; }; const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); }; const bgOf = (e) => { for (let n = e; n; n = n.parentElement) { const c = parse(getComputedStyle(n).backgroundColor); if (c.a === 1) return c; } return { r: 255, g: 255, b: 255, a: 1 }; };
        const v = document.getElementById("view-${t}"); const els = [...v.querySelectorAll("h2, h3, p, li, a, button")].filter((e) => e.getClientRects().length > 0 && e.textContent.trim()); const low = []; let orange = 0; for (const e of els) { const cs = getComputedStyle(e); const c = parse(cs.color), b = bgOf(e); const L1 = lum(c), L2 = lum(b); const ra = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05); if (ra < 4.5) low.push(e.tagName + ":" + ra.toFixed(2)); if (cs.color === "rgb(247, 137, 59)" || cs.backgroundColor === "rgb(247, 137, 59)") orange++; } const clipped = els.filter((e) => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).display !== "inline").length; window.scrollTo(0, document.documentElement.scrollHeight); return { low, orange, clipped, hs: document.documentElement.scrollWidth > document.documentElement.clientWidth, n: els.length }; })()`); await sleep(40); const last = await p.ev(`(() => { const v = document.getElementById("view-${t}"); const c = v.querySelector("[data-site-page-content]"); const e = c.lastElementChild; e.scrollIntoView({ block: "center" }); const q = e.getBoundingClientRect(); const h = document.elementFromPoint(q.left + Math.min(q.width / 2, 40), q.top + q.height / 2); return !!h && (h === e || e.contains(h) || h.contains(e)); })()`); const g = r.low.length === 0 && r.orange === 0 && r.clipped === 0 && !r.hs && last; ok = ok && g; if (!g) out.push(`${w}px ${t}✗ ${J(r)} 最後一元素可見=${last}`); } }
    return { ok, note: out.length ? out.join("；") : "6 尺寸 × 3 頁：對比 ≥ 4.5、無強調橘、不裁切、無水平捲軸、最後元素不被遮" };
  });
  await R.check("TC-53-06", "AC-53-06、AC-24-12、AC-08-13、AC-23-02（畫面文字無矛盾）", async () => {
    await p.viewport(1366, 768, false); const BAD = ["零請求", "完全不連網", "不會傳送任何資料", "沒有第三方", "廣告無法讀取", "不連接網路", "不會連網"]; const hits = []; let nt = false;
    for (const t of ["dashboard", "customizer", "flashcards", "part5", "sources", "about", "contact", "privacy"]) { await p.ev(`EMT.router.go(${J(t)})`); await sleep(50); if (t === "dashboard") { await p.ev(`(() => { const b = document.querySelector(".db-backup__toggle"); if (b.getAttribute("aria-expanded") === "false") b.click(); })()`); await sleep(50); const tx = await p.ev(`document.querySelector("#view-dashboard").innerText`); nt = tx.includes("學習紀錄只存在目前的瀏覽器與網址"); await p.ev(`document.querySelector(".db-backup__toggle").click()`); } const body = await p.ev(`document.body.innerText`); for (const w of BAD) if (body.includes(w)) hits.push(t + ":" + w); }
    const html = fs.readFileSync(path.join(ROOT, "dist/english-master-track.html"), "utf8"); const srcHits = BAD.filter((w) => html.includes(w)); const stt = /不錄音|不會錄音|不上傳/.test(html); const privacy = await p.ev(`document.querySelector("#view-privacy [data-site-page-content]").innerText`); const pOk = privacy.includes("學習紀錄只存在你目前使用的瀏覽器") && privacy.includes("不錄音、不保存、不上傳錄音");
    return { ok: hits.length === 0 && srcHits.length === 0 && nt && stt && pOk, note: `禁用字詞畫面 ${hits.join("、") || "0"}、交付檔字串 ${srcHits.join("、") || "0"}；AC-24-12 說明存在=${nt}；AC-08-13 相符文字存在=${stt}；隱私權政策 (1)(5)=${pOk}` };
  });
  await R.check("TC-23-07c", "AC-23-07 (3)、AC-53-02 (6)、AC-55-02、AC-38-01、AC-38-04（FE-89 回饋 3：連結與聯絡行顏色）", async () => {
    await p.viewport(1366, 768, false); const out = {}; let ok = true;
    const colorOf = (sel, tab) => p.ev(`(() => { EMT.router.go(${J(tab)}); const parse = (c) => { const m = c.match(/rgba?\\(([^)]+)\\)/); const a = m[1].split(/[ ,\\/]+/).filter(Boolean).map(Number); return { r: a[0], g: a[1], b: a[2], a: a.length > 3 ? a[3] : 1 }; }; const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); }; const bgOf = (e) => { for (let n = e; n; n = n.parentElement) { const c = parse(getComputedStyle(n).backgroundColor); if (c.a === 1) return c; } return { r: 255, g: 255, b: 255, a: 1 }; }; const e = document.querySelector(${J(sel)}); if (!e) return null; const cs = getComputedStyle(e); const a = parse(cs.color), b = bgOf(e); const L1 = lum(a), L2 = lum(b); return { color: cs.color, ratio: +((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)).toFixed(2), under: cs.textDecorationLine, tag: e.tagName }; })()`);
    out.footer = await colorOf("#footer-about", "dashboard"); out.back = await colorOf("#view-about .site-return", "about"); out.pageLink = await colorOf("#view-about .site-page__link", "about"); out.external = await colorOf("#view-privacy [data-site-page-content] a", "privacy");
    out.contact = await colorOf("#view-contact [data-site-page-content] p", "contact"); out.privacyLine = await colorOf("#view-privacy [data-site-page-content] p:last-child", "privacy"); out.sourcesLine = await colorOf("#view-sources .src-contact", "sources"); out.srcMuted = await colorOf("#view-sources .src-muted", "sources");
    const vals = Object.values(out); const banned = ["rgb(247, 137, 59)", "rgb(30, 155, 240)"]; ok = vals.every((v) => v && v.ratio >= 4.5 && !banned.includes(v.color));
    const secondary = out.contact.color === out.srcMuted.color && out.privacyLine.color === out.srcMuted.color && out.sourcesLine.color === out.srcMuted.color; const blues = [...new Set([out.footer.color, out.back.color, out.pageLink.color, out.external.color])];
    return { ok: ok && secondary, note: `${J(out)}；信箱行同 .src-muted 次要文字=${secondary}；連結顏色 ${blues.length} 種 ${J(blues)}` };
  });
  await R.check("TC-57-sources", "AC-57-04（#sources 入口）、AC-20-04、V-SITE-07", async () => {
    await p.goto(FILE_URL + "#sources"); await sleep(120); const a = await p.ev(`({ tab: EMT.router.current(), hash: location.hash, back: (document.querySelector("#view-sources .site-return") || {}).textContent })`); await p.ev(`EMT.router.back()`); await sleep(60); const b = await p.ev("EMT.router.current()"); await p.goto(FILE_URL + "#decoder"); await sleep(120); const c = await p.ev(`({ tab: EMT.router.current(), hash: location.hash })`); await p.goto(FILE_URL + "#about"); await sleep(120); const d = await p.ev(`({ tab: EMT.router.current(), hash: location.hash })`); await p.goto(FILE_URL); await sleep(100);
    return { ok: a.tab === "sources" && a.hash === "" && a.back === "返回群島" /* 第 13 輪：IA-1 */ && b === "dashboard" && c.tab === "dashboard" && d.tab === "dashboard", note: `#sources → ${J(a)}、返回 ${b}；#decoder → ${J(c)}；#about（無效片段行為不變）→ ${J(d)}` };
  });
  await R.check("TC-X-site-a", "Console 無未處理錯誤、無網路請求（file://）", async () => ({ ok: errs(p).length === 0 && netReqs(p).length === 0, note: `錯誤 ${J(errs(p)).slice(0, 300)}；非 file 請求 ${netReqs(p).length}` }));
  await p.close();
}
// ═════ 首次模式 ═════
{
  const p = await open({ vp: [375, 667] }); p.autoStart = false; await p.goto(); await p.ev("localStorage.clear()"); await p.goto();
  await p.addInitScript(`(() => { window.__sets = 0; const o = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { window.__sets++; return o.call(this, k, v); }; })();`); await p.goto();
  await R.check("TC-57-01c", "AC-57-01、AC-25-01、AC-25-07、AC-41-04、E-148（首次模式；4 頁返回、無狀態鍵）", async () => {
    const out = []; let ok = true;
    for (const [w, h] of TWO) { await p.viewport(w, h, w < 768); await sleep(60);
      for (const id of ["about", "contact", "privacy", "sources"]) { await p.click(`#footer-${id}`); await sleep(70); const c = await content(p, id); const navVis = c.nav; await p.click(`#view-${id} .site-return`); await sleep(70); const a = await p.ev(`({ entry: document.body.dataset.entry, tab: EMT.router.current(), nav: document.querySelector("#app-nav").getClientRects().length > 0, start: !!document.getElementById("cz-start") && document.getElementById("cz-start").getClientRects().length > 0 })`); const keys = await lsKeys(p); const sets = await p.ev("window.__sets"); const g = c.visible && c.back === "返回難易度設定" && !navVis && a.entry === "firstRun" && a.tab === "customizer" && !a.nav && a.start && keys.length === 0 && sets === 0; ok = ok && g; if (!g) out.push(`${w} ${id}✗ ${J(c).slice(0, 160)} ${J(a)} keys ${J(keys)} sets ${sets}`); }
      const f = await footerInfo(p); const small = f.sizes.filter(([a, b]) => a < 44 || b < 44); const cov = await footerCover(p); const g = J(f.texts) === J(LINKS) && small.length === 0 && cov.length === 0 && f.versionBelow; ok = ok && g; out.push(`${w}px 首次畫面頁尾：尺寸 ${J(f.sizes)}、遮 ${J(cov)}、版本行在下=${f.versionBelow}`); }
    return { ok, note: out.join("；") };
  });
  await R.check("TC-41-04r", "AC-41-04、AC-25-01（首次畫面 Tab 順序：色級 → 開始學習 → 從備份還原 → 頁尾）", async () => {
    await p.viewport(375, 667, true); await p.goto(); await p.ev("document.activeElement && document.activeElement.blur(); window.scrollTo(0,0)"); const seq = []; for (let i = 0; i < 24; i++) { await p.key("Tab", "Tab", 9); const t = await p.ev(`(() => { const e = document.activeElement; return e && e !== document.body ? (e.dataset.color ? "level" : e.id || e.className.split(" ")[0]) : null; })()`); if (t) seq.push(t); }
    const uniq = seq.filter((x, i) => x !== seq[i - 1]); const cycle = uniq.slice(0, uniq.indexOf("footer-sources") + 1); const iS = cycle.indexOf("cz-start"), iR = cycle.indexOf("cz-restore"), iF = cycle.indexOf("footer-about"), iL = cycle.lastIndexOf("level"); const fl = ["footer-about", "footer-contact", "footer-privacy", "footer-sources"].map((x) => cycle.indexOf(x));
    return { ok: iL >= 0 && iL < iS && iS < iR && iR < iF && fl.every((v, i) => v >= 0 && (i === 0 || v > fl[i - 1])), note: `順序 ${cycle.join(" → ")}` };
  });
  await R.check("TC-56-04b", "AC-56-04（首次畫面 h1～h3）", async () => {
    const r = await p.ev(`(() => { const hs = [...document.querySelectorAll("h1, h2, h3")].filter((e) => e.getClientRects().length > 0 && !e.closest("[hidden]")); const lv = hs.map((e) => Number(e.tagName[1])); return { h1: lv.filter((x) => x === 1).length, jump: lv.some((v, i) => i > 0 && v > lv[i - 1] + 1), lv: lv.join(""), entry: document.body.dataset.entry }; })()`);
    return { ok: r.h1 === 1 && !r.jump && r.entry === "firstRun", note: J(r) };
  });
  await R.check("TC-X-site-b", "Console 無未處理錯誤、無網路請求（首次）", async () => ({ ok: errs(p).length === 0 && netReqs(p).length === 0, note: `錯誤 ${J(errs(p)).slice(0, 200)}；非 file 請求 ${netReqs(p).length}` }));
  await p.close();
}
// ═════ 複製到空資料夾（AC-56-10、AC-37-02、V-SEO-08）═════
{
  const dir = fs.mkdtempSync(path.join(TMP, "lone-")); const f = path.join(dir, "emt copy.html"); fs.copyFileSync(path.join(ROOT, "dist/english-master-track.html"), f); const url = pathToFileURL(f).href;
  for (const off of [false, true]) { const p = await open(); await p.send("Network.emulateNetworkConditions", { offline: off, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }); await p.goto(); await p.goto(url); await sleep(150); for (const t of ["dashboard", "about", "contact", "privacy", "sources", "part5", "flashcards", "customizer"]) { await p.ev(`EMT.router.go(${J(t)})`); await sleep(40); }
    await R.check(off ? "TC-56-10b" : "TC-56-10a", "AC-56-10、AC-21-01 (a)、AC-37-01、AC-37-02、AC-19-04、AC-50-09、AC-53-03、AC-57-02（V-SEO-08）", async () => { const req = netReqs(p); const ad = await p.ev(`({ adsbygoogle: typeof window.adsbygoogle, slot: !!document.getElementById("ad-slot"), ins: document.querySelectorAll("ins.adsbygoogle").length, env: document.documentElement.getAttribute("data-ad-env"), noscriptVisible: [...document.querySelectorAll("noscript")].some((n) => n.getClientRects().length > 0) })`); const logs = p.log.logEntries.filter((l) => l.level === "error"); return { ok: req.length === 0 && errs(p).length === 0 && logs.length === 0 && ad.adsbygoogle === "undefined" && !ad.slot && ad.ins === 0 && ad.env === null && !ad.noscriptVisible, note: `${off ? "斷網" : "連網"}、空資料夾：非 file 請求 ${req.length}；錯誤 ${errs(p).length}；Log 錯誤 ${logs.length}；廣告 ${J(ad)}` }; });
    await p.close(); }
}
// ═════ 第一階段：正式網址路由到 dist/site（V-AD (b)；不是真實 AdSense）═════
const server = await startProdServer(TMP, SITE);
const b = await launchBrowser(prodBrowserArgs(server.port));
{
  const env = await newEnv(b, { serviceWorkers: "allow", width: 1366, height: 768, inits: [TOAST_RECORDER, fakeTts("ok"), fakeStt("ok"), fakeMic("ok")] });
  const ad = await routeAd(env.ctx, "stub"); const page = await env.newPage();
  await R.check("TC-50-02", "AC-50-02、AC-21-01 (b)、AC-37-05、AC-18-06、AC-21-03、AC-24-01、AC-42-03、AC-47-08、E-139（第一階段完整操作）", async () => {
    await page.addInitScript(seedInit(stateRecord(725, { sttNoticeAcknowledged: true, part5: { currentIndex: 5, lockedSelection: null, phase: "question", roundAnswered: 0, roundCorrect: 0, totalAnswered: 3, totalCorrect: 2 }, part5CorrectIds: ["p5-001", "p5-002"] })));
    await page.goto(PROD, { waitUntil: "load" }); await waitSW(page); await page.reload({ waitUntil: "load" }); await page.waitForFunction(() => document.documentElement.getAttribute("data-ready") === "1");
    for (const t of ["dashboard", "customizer", "flashcards", "part5", "sources", "about", "contact", "privacy", "dashboard"]) { await page.evaluate((x) => EMT.router.go(x), t); await page.waitForTimeout(90); }
    await page.evaluate(() => EMT.router.go("flashcards")); await page.waitForTimeout(80); await page.click(".fc-card"); await page.waitForTimeout(80); await page.click(".fc-next"); await page.waitForTimeout(80);
    await page.evaluate(() => EMT.router.go("part5")); await page.waitForTimeout(80); await page.click("[data-p5=option]"); await page.waitForTimeout(100);
    await page.evaluate(() => EMT.router.go("dashboard")); await page.waitForTimeout(100); await page.click(".db-backup__toggle"); await page.waitForTimeout(60); const dl = page.waitForEvent("download", { timeout: 5000 }); await page.click('[data-action="export-backup"]'); await dl; await page.waitForTimeout(150);
    const ao = await adState(page); const cross = env.log.requests.filter((r) => { try { return new URL(r.url).origin !== new URL(PROD).origin && !/^(data|blob):/.test(r.url); } catch { return false; } });
    const same = env.log.requests.filter((r) => r.url.startsWith(PROD)); const allowed = new Set([...PRECACHE.map((u) => new URL(u, PROD).href), new URL("./sw.js", PROD).href]); const bad = same.filter((r) => !allowed.has(r.url.split("#")[0]) || r.method !== "GET");
    const globals = await page.evaluate(() => ({ a: typeof window.adsbygoogle, insCount: document.querySelectorAll("ins.adsbygoogle").length, slot: !!document.getElementById("ad-slot"), label: [...document.querySelectorAll("#app-main *, body > *")].filter((e) => e.children.length === 0 && e.textContent.trim() === "廣告").length, env: document.documentElement.getAttribute("data-ad-env"), status: EMT.store.getState().runtime.ad.status }));
    return { ok: cross.length === 0 && ad.hits.length === 0 && bad.length === 0 && globals.a === "undefined" && globals.insCount === 0 && !globals.slot && globals.label === 0 && globals.env === null && globals.status === "ineligible" && ao.h === 0 && env.log.errors.length === 0, note: `完整操作後請求 ${env.log.requests.length} 筆：跨來源 ${cross.length}、廣告腳本 ${ad.hits.length}、同源但不在 AC-37-05 允許清單或非 GET ${bad.length}${bad.length ? J(bad.map((x) => x.url)) : ""}；${J(globals)}；頁面錯誤 ${env.log.errors.length}（本機 HTTPS 模擬正式網址，非真實網路）` };
  });
  await R.check("TC-57-05a", "AC-57-05、AC-53-04、E-152（靜態頁連網直接開啟；不被 SW 攔截；Cache 不變）", async () => {
    const before = await cacheInfo(page); const seen = []; const onResp = (r) => seen.push({ url: r.url(), sw: r.fromServiceWorker(), status: r.status() }); env.ctx.on("response", onResp);
    const p2 = await env.newPage(); const notes = []; let ok = true;
    for (const id of ["about", "contact", "privacy"]) { seen.length = 0; await p2.goto(PROD + id + ".html", { waitUntil: "load" }); await p2.waitForTimeout(150); const info = await p2.evaluate(() => ({ h1: document.querySelector("h1").textContent, scripts: document.scripts.length, ctrl: !!navigator.serviceWorker.controller, hs: document.documentElement.scrollWidth > document.documentElement.clientWidth, keys: Object.keys(localStorage).length, regs: 0 })); const doc = seen.filter((s) => s.url.includes(id + ".html")); const others = seen.filter((s) => !s.url.includes(id + ".html") && !s.url.startsWith("data:")); const g = doc.length === 1 && doc[0].status === 200 && !doc[0].sw && others.length === 0 && info.scripts === 0; ok = ok && g; notes.push(`${id}.html：回應 ${J(doc)}、其他請求 ${others.length}、h1「${info.h1}」、scripts ${info.scripts}`); }
    env.ctx.off("response", onResp); const after = await cacheInfo(page); const same = J(before) === J(after); await p2.close();
    // 不讀寫：無狀態時亦可直接開啟
    return { ok: ok && same, note: notes.join("；") + `；Cache Storage 前後相同=${same}` };
  });
  await R.check("TC-53-04a", "AC-53-04、AC-57-04、V-SITE-04（無本系統狀態與有本系統狀態；重新載入；停用 JS 可讀；全部尺寸）", async () => {
    const out = []; let ok = true;
    for (const js of [false, true]) { const ctx = await b.newContext({ javaScriptEnabled: js, viewport: { width: 375, height: 667 } }); const reqs = []; ctx.on("request", (r) => reqs.push(r.url())); const q = await ctx.newPage();
      for (const id of ["about", "contact", "privacy"]) for (const [w, h] of SIZES) { await q.setViewportSize({ width: w, height: h }); await q.goto(PROD + id + ".html"); await q.reload(); const size = await q.evaluate(() => { const de = document.documentElement; const clip = [...document.querySelectorAll("h1,h2,p,li,a")].filter((e) => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).display !== "inline").length; const small = [...document.querySelectorAll(".sp-links a, .sp-header a")].filter((e) => e.getBoundingClientRect().height < 44).length; return { hs: de.scrollWidth > de.clientWidth, clip, small, main: document.querySelector("main").innerText.trim().length, sw: "serviceWorker" in navigator && !!navigator.serviceWorker.controller }; }); const g = !size.hs && size.clip === 0 && size.small === 0 && size.main > 5; ok = ok && g; if (!g) out.push(`JS=${js} ${id} ${w}px✗ ${J(size)}`); }
      const cross = reqs.filter((u) => !u.startsWith(PROD) && !u.startsWith("data:")); const fav = reqs.filter((u) => /favicon/.test(u)); const stored = js ? await q.evaluate(() => Object.keys(localStorage)) : []; const regs = js ? await q.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length) : 0; const g = cross.length === 0 && fav.length === 0 && stored.length === 0 && regs === 0; ok = ok && g; out.push(`JS=${js}：跨來源 ${cross.length}、favicon ${fav.length}、localStorage 鍵 ${stored.length}、SW 註冊 ${regs}`); await ctx.close(); }
    return { ok, note: out.join("；") + "（6 尺寸 × 3 頁、無水平捲軸、不裁切、連結 ≥ 44px）" };
  });
  await R.check("TC-57-04b", "AC-57-04（連結可鍵盤操作；回首頁）、AC-56-06（一般連結可導向）", async () => {
    const q = await env.newPage(); await q.goto(PROD + "about.html"); const seq = []; for (let i = 0; i < 8; i++) { await q.keyboard.press("Tab"); seq.push(await q.evaluate(() => (document.activeElement.getAttribute("href") || document.activeElement.tagName))); } const ring = await q.evaluate(() => { const c = getComputedStyle(document.activeElement); return c.outlineStyle + " " + c.outlineWidth; });
    await q.goto(PROD + "contact.html"); await q.focus('a[href="./"]'); await q.keyboard.press("Enter"); await q.waitForFunction(() => document.documentElement.getAttribute("data-ready") === "1", null, { timeout: 8000 }); const home = q.url();
    await q.goto(PROD + "privacy.html"); await q.click('a[href="./#sources"]'); await q.waitForFunction(() => document.documentElement.getAttribute("data-ready") === "1", null, { timeout: 8000 }); await q.waitForTimeout(150); const src = await q.evaluate(() => ({ tab: EMT.router.current(), hash: location.hash })); await q.close();
    return { ok: seq.includes("./") && seq.includes("about.html") && seq.includes("./#sources") && /solid/.test(ring) && home === PROD && src.tab === "sources" && src.hash === "", note: `Tab 序 ${seq.join(" → ")}；焦點框 ${ring}；回首頁 ${home}；資料來源入口 ${J(src)}` };
  });
  await R.check("TC-57-03", "AC-57-03、AC-53-02、AC-54-01、AC-55-01（應用內與靜態 main 正規化文字完全相同，SC-4）", async () => {
    const q = await env.newPage(); await q.goto(PROD, { waitUntil: "load" }); await q.waitForFunction(() => document.documentElement.getAttribute("data-ready") === "1"); const notes = []; let ok = true; const norm = `(s) => s.replace(/\\s+/g, " ").trim()`;
    for (const id of ["about", "contact", "privacy"]) { await q.evaluate((x) => EMT.router.go(x), id); await q.waitForTimeout(80); const inApp = await q.evaluate(`(${norm})(document.querySelector("#view-${id} [data-site-page-content]").textContent)`); const inAppInner = await q.evaluate(`(${norm})(document.querySelector("#view-${id} [data-site-page-content]").innerText)`); const q2 = await env.newPage(); await q2.goto(PROD + id + ".html"); const st = await q2.evaluate(`(${norm})(document.querySelector("main").textContent)`); const stInner = await q2.evaluate(`(${norm})(document.querySelector("main").innerText)`); await q2.close(); const g = inAppInner === stInner; ok = ok && g; notes.push(`${id}：innerText 相同=${g}（${inAppInner.length} 字元）；textContent 相同=${inApp === st}${g ? "" : "；應用內「" + inAppInner.slice(0, 180) + "」靜態「" + stInner.slice(0, 180) + "」"}`); }
    await q.close(); return { ok, note: notes.join("；") };
  });
  await R.check("TC-57-05b", "AC-57-05（離線直接開靜態頁屬預期）、AC-57-02（V-PWA 離線應用內可讀）、AC-35-02、E-152", async () => {
    await env.ctx.setOffline(true); await page.reload({ waitUntil: "load" }); await page.waitForFunction(() => document.documentElement.getAttribute("data-ready") === "1", null, { timeout: 8000 }); const rds = {}; const bef = await page.evaluate((k) => localStorage.getItem(k), KEY); for (const id of ["about", "contact", "privacy"]) { await page.evaluate((x) => EMT.router.go(x), id); await page.waitForTimeout(60); rds[id] = await page.evaluate((x) => document.querySelector(`#view-${x} [data-site-page-content]`).innerText.length, id); } const aft = await page.evaluate((k) => localStorage.getItem(k), KEY);
    const q = await env.newPage(); let offErr = null; try { await q.goto(PROD + "privacy.html", { timeout: 6000 }); } catch (e) { offErr = String(e.message).split("\n")[0].slice(0, 90); } await q.close(); await env.ctx.setOffline(false);
    return { ok: Object.values(rds).every((n) => n > 5) && bef === aft && !!offErr, note: `離線應用內 3 頁字元 ${J(rds)}；localStorage 不變=${bef === aft}；離線直接開靜態頁 → ${offErr}（模擬；E-152 預期瀏覽器離線頁，部署後 D-8 複驗）` };
  });
  await env.ctx.close();
}
// AC-56-06：啟用 JS 不可見；不閃現；停用 JS 可讀
{
  const ctx = await b.newContext({ viewport: { width: 1366, height: 768 } }); const q = await ctx.newPage();
  await R.check("TC-56-06b", "AC-56-06、AC-25-01、AC-41-01（啟用 JS 時 noscript 不渲染、不閃現）", async () => {
    await q.addInitScript(`window.__nsSeen = 0; new MutationObserver(() => { for (const n of document.querySelectorAll("noscript")) if (n.getClientRects().length > 0 || n.children.length > 0) window.__nsSeen++; }).observe(document, { childList: true, subtree: true });`); await q.goto(PROD, { waitUntil: "load" }); const r = await q.evaluate(() => ({ seen: window.__nsSeen, kids: [...document.querySelectorAll("noscript")].map((n) => n.children.length), vis: [...document.querySelectorAll("noscript")].map((n) => n.getClientRects().length), h1: [...document.querySelectorAll("h1")].filter((e) => e.getClientRects().length > 0).length, entry: document.body.dataset.entry })); return { ok: r.seen === 0 && r.kids.every((n) => n === 0) && r.vis.every((n) => n === 0) && r.h1 === 1 && r.entry === "firstRun", note: J(r) };
  });
  await ctx.close();
  const c2 = await b.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 667 } }); const n = await c2.newPage();
  await R.check("TC-56-06c", "AC-56-06、E-150、AC-37-02（停用 JS）", async () => { await n.goto(PROD); const t = await n.evaluate(() => document.body.innerText); const a = await n.evaluate(() => [...document.querySelectorAll("noscript a")].map((e) => [e.getAttribute("href"), e.getBoundingClientRect().height])); return { ok: /EnglishContext/.test(t) && /單字卡/.test(t) && /模擬測驗/.test(t) && a.length === 3 && !/開始學習/.test(t), note: `可見文字 ${t.length} 字元「${t.replace(/\s+/g, " ").slice(0, 120)}…」；連結 ${J(a)}；停用 JS 不顯示學習入口` }; });
  await c2.close();
}
await b.close(); await server.close();
R.save(resultPath("e2e-site"));
const pass = R.results.filter((r) => r.result === "通過").length; const fail = R.results.filter((r) => r.result === "失敗").length;
console.log(`e2e-site：通過 ${pass}、失敗 ${fail}、共 ${R.results.length}`);
