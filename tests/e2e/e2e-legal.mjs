// QA E2E 第 8 輪：補 PRD v0.17 R-25、v0.16 R-24 留下的 TC（architecture §10.9、§10.10 Q4）
// TC-23-08s：V-LGL-05 (b) 畫面文字（首次畫面、4 個功能區、資料來源頁、對話框、Toast）；TC-10-02-*：LT-2、§7.23.4 量測；TC-23-02d-*：LT-3～LT-5 各 1 次；TC-23-07-*：聯絡行（Range 量行數，SD-FB-69）。
// 驅動：lib/cdp.mjs（file://）；TC-23-07h 以 lib/pwa-env.mjs（V-PWA (b)，埠 8080，只關閉自己啟動的伺服器）。
import path from "node:path";
import fs from "node:fs";
import { launch, recorder, sleep, FILE_URL, ROOT, resultPath } from "./lib/cdp.mjs";
import { TOAST_RECORDER, fakeTts, fakeStt, fakeMic } from "./lib/inits.mjs";
import { KEY, stateRecord, dialogInfo, expandBackup } from "./lib/state.mjs";

const R = recorder("e2e-legal");
const J = (x) => JSON.stringify(x);
const TMP = process.env.QA_TMP || path.join(ROOT, "tests", "results", "tmp"); fs.mkdirSync(TMP, { recursive: true });
const LT2 = "題型參考 TOEIC®（多益），非 ETS 官方或認可內容";
const LT3 = "原創內容（例句、解析、Part 5 題目、長難句、句型）由 JimmyLin 以 AI 輔助編製，JimmyLin 就其享有的權利以 CC BY-SA 4.0 授權";
const LT4 = "PWA 圖示由 AI 依 JimmyLin 的構想生成；圖示與名稱「EnglishContext」作為品牌標識使用，JimmyLin 保留其享有的權利，不適用 MIT 與 CC BY-SA 4.0";
const LT5 = "TOEIC® 為 ETS 的註冊商標。本網站與 ETS 無關，亦未經其認可或核准。";
const CONTACT = "email: d o n c l y d e 0 7 2 2 @ g m a i l . c o m";
const A = ["多益", "TOEIC"]; const B = ["常考", "必考", "最常考", "最常見", "最常用", "高頻"];
const ACCENT = "rgb(247, 137, 59)";
const P5 = (o = {}) => ({ currentIndex: 0, lockedSelection: null, phase: "question", roundAnswered: 0, roundCorrect: 0, totalAnswered: 0, totalCorrect: 0, ...o });

async function open({ vp = [1366, 900], autoStart = true } = {}) {
  const p = await launch(); p.autoStart = autoStart;
  for (const s of [TOAST_RECORDER, fakeTts("ok"), fakeStt("ok"), fakeMic("ok")]) await p.addInitScript(s);
  await p.viewport(vp[0], vp[1]);
  await p.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  return p;
}
const seed = async (p, part5, ids = [], only = false) => { const rec = stateRecord(725, { part5: P5(part5), part5CorrectIds: ids, part5UnansweredOnly: only }); await p.ev(`localStorage.setItem(${J(KEY)}, ${J(J(rec))})`); await p.reload(); await p.go("part5"); await sleep(60); };
const errs = (p) => p.log.exceptions.concat(p.log.console.filter((c) => c.type === "error").map((c) => c.text));
const netReqs = (p) => p.log.requests.filter((r) => !/^(file|blob|data|about):/.test(r.url));

// ═════════ AC-23-08 (b)：畫面文字 ═════════
{
  const collect = `(() => { const out = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { const e = n.parentElement; if (!e || ["SCRIPT", "STYLE"].includes(e.tagName)) continue; if (e.closest("[hidden]") || getComputedStyle(e).display === "none") continue; const t = n.textContent.trim(); if (t) out.push(t); } return out; })()`;
  const scan = (texts, seen) => { for (const t of texts) seen.add(t); };
  const judge = (seen) => {
    const lit = [], ab = [], alone = [];
    for (const t of seen) {
      for (const w of ["多益常考", "多益最常見"]) if (t.includes(w)) lit.push(t);
      for (const s of t.split(/[。；？！;?!\n\r]|\.(?=\s|$)/)) if (A.some((a) => s.includes(a)) && B.some((b) => s.includes(b))) ab.push(s);
      if (/常考|必考/.test(t)) alone.push(t);
    }
    return { lit, ab, alone };
  };
  const p = await open({ autoStart: false }); await p.goto(); await p.ev(`localStorage.clear()`); await p.goto();
  await R.check("TC-23-08s", "AC-23-08 (1)(3)、E-122（V-LGL-05 (b) 畫面文字）、AC-38-10 (1)", async () => {
    const seen = new Set(); const visited = [];
    scan(await p.ev(collect), seen); visited.push(await p.entry() === "firstRun" ? "首次畫面" : "（非首次）");
    await p.startLearning(); await sleep(100);
    for (const tab of ["dashboard", "customizer", "flashcards", "part5"]) { await p.go(tab); await sleep(80); scan(await p.ev(collect), seen); visited.push(tab); }
    // 測驗模式、卡片背面
    await p.go("flashcards"); await p.ev(`(() => { const b = [...document.querySelectorAll("#view-flashcards button")].find((x) => /翻|背面/.test(x.textContent)); if (b) b.click(); })()`); await sleep(60); scan(await p.ev(collect), seen);
    // 模擬測驗作答後（含解析）、鎖定檢視、結算、全部答對、清除對話框
    await seed(p, { currentIndex: 8 }, ["p5-009", "p5-001"]); scan(await p.ev(collect), seen); visited.push("鎖定檢視（p5-009 解析）");
    await p.click("#view-part5 [data-p5=clear]"); await sleep(150); scan(await p.ev(collect), seen); const dlg1 = await dialogInfo(p); await p.click('.dialog [data-action="cancel"]'); await sleep(100); visited.push("清除對話框=" + !!dlg1);
    await seed(p, { currentIndex: 199, phase: "summary" }, ["p5-001"]); scan(await p.ev(collect), seen); visited.push("結算");
    const all = Array.from({ length: 200 }, (_, i) => "p5-" + String(i + 1).padStart(3, "0")); await seed(p, {}, all, true); scan(await p.ev(collect), seen); visited.push("全部答對");
    // 切換難易度確認對話框
    await seed(p, { totalAnswered: 2, totalCorrect: 1 }, ["p5-001"]); await p.go("customizer"); await p.click('.cz-level[data-color="brown"]'); await sleep(40); await p.click("#cz-apply"); await sleep(150); scan(await p.ev(collect), seen); const dlg2 = await dialogInfo(p); if (dlg2) { await p.click('.dialog [data-action="cancel"]'); await sleep(100); } visited.push("初始化對話框=" + !!dlg2);
    // 資料來源頁（展開 details）
    await p.click("#footer-sources"); await sleep(300); await p.ev(`document.querySelectorAll("#view-sources details").forEach((d) => { d.open = true; })`); scan(await p.ev(collect), seen); visited.push("資料來源頁");
    // Toast：所有固定 Toast 文字依實際觸發記錄
    const tt = await p.ev(`(window.__qaToasts || []).map((t) => t.text)`); for (const t of tt) seen.add(t); visited.push(`Toast ${tt.length} 則`);
    const r = judge(seen);
    const hasLT = [...seen].some((t) => t.includes(LT2)) && [...seen].some((t) => t.includes(LT5));
    return { ok: r.lit.length === 0 && r.ab.length === 0 && r.alone.length === 0 && hasLT, note: `檢視 ${visited.join("、")}；文字節點 ${seen.size} 種；「多益常考」「多益最常見」${r.lit.length}；A＋B 同句 ${r.ab.length}${r.ab.length ? "（" + r.ab.slice(0, 3).join("；") + "）" : ""}；單獨「常考」「必考」${r.alone.length}${r.alone.length ? "（" + r.alone.slice(0, 3).join("；") + "）" : ""}；LT-2、LT-5 仍在=${hasLT}` };
  });
  await R.check("TC-X-legal-screen", "Console 無未處理錯誤、無網路請求", async () => ({ ok: errs(p).length === 0 && netReqs(p).length === 0, note: `錯誤 ${J(errs(p)).slice(0, 300)}；非 file 請求 ${netReqs(p).length}` }));
  await p.close();
}

// ═════════ AC-10-02：LT-2、§7.23.4 ═════════
const NOTE_MEASURE = `(() => { const el = document.querySelector("#view-part5 .p5-heading-note"); const r = document.createRange(); r.selectNodeContents(el); const lines = new Set([...r.getClientRects()].map((x) => Math.round(x.top))).size; const b = el.getBoundingClientRect(); const cs = getComputedStyle(el); const vw = document.documentElement.clientWidth; const nx = el.nextElementSibling ? el.nextElementSibling.getBoundingClientRect() : null;
  const rec = document.querySelector("#view-part5 .p5-record"); const rr = rec ? rec.getBoundingClientRect() : null; const inter = rr && rr.left < b.right && b.left < rr.right && rr.top < b.bottom - 0.5 && b.top < rr.bottom - 0.5;
  return { text: el.textContent.trim(), lines, sw: el.scrollWidth, cw: el.clientWidth, sh: el.scrollHeight, ch: el.clientHeight, left: b.left, right: b.right, vw, bottom: b.bottom, nextTop: nx ? nx.top : null, doc: document.documentElement.scrollWidth, ws: cs.whiteSpace, to: cs.textOverflow, title: document.querySelector("#view-part5 h2").textContent, overlapRecord: !!inter }; })()`;
const noteOk = (m, { font = false } = {}) => m.text === LT2 && m.sw <= m.cw && m.sh <= m.ch + 1 && m.left >= 0 && m.right <= m.vw + 0.5 && (m.nextTop === null || m.bottom <= m.nextTop + 0.5) && (font || m.doc <= m.vw) && m.ws !== "nowrap" && m.to !== "ellipsis" && m.title === "模擬測驗" && !m.overlapRecord;
for (const [w, h] of [[375, 667], [768, 1024], [1366, 768]]) {
  const p = await open({ vp: [w, h] }); await p.goto();
  await R.check(`TC-10-02-${w}`, "AC-10-02、AC-20-01、AC-40-02、E-123、V-LGL-02", async () => {
    const out = []; let ok = true;
    for (const [name, part5, ids] of [["題目 K=0", {}, []], ["題目 K≥1", { currentIndex: 2 }, ["p5-001"]], ["鎖定檢視", {}, ["p5-001"]], ["作答後", { currentIndex: 2, lockedSelection: 0, roundAnswered: 1, totalAnswered: 1 }, ["p5-001"]]]) {
      await seed(p, part5, ids); const m = await p.ev(NOTE_MEASURE); const good = noteOk(m); ok = ok && good;
      const t = await p.ev(`document.getElementById("view-part5").innerText`); const old = t.includes("題型對應多益 Part 5"); ok = ok && !old;
      const hasContent = await p.ev(`(() => { const q = document.querySelector("#view-part5 .p5-question"); return !!q && !!q.querySelector("[data-p5=blank]") && q.querySelectorAll("[data-p5=option]").length === 4 && !!q.querySelector("[data-p5=type]"); })()`); ok = ok && hasContent;
      out.push(`${name}${good ? "" : "✗" + J(m)}：${m.lines} 行、scrollWidth ${m.sw}/${m.cw}、與 .p5-record 重疊=${m.overlapRecord}、舊文字=${old}`);
    }
    return { ok, note: `${w}×${h}：${out.join("；")}` };
  });
  if (w === 375) await R.check("TC-10-02z", "AC-10-02、E-123（375px，html font-size 150%）", async () => {
    await seed(p, { currentIndex: 2 }, ["p5-001"]); await p.ev(`document.documentElement.style.fontSize = "150%"`); await sleep(100); const m = await p.ev(NOTE_MEASURE); await p.ev(`document.documentElement.style.fontSize = ""`);
    return { ok: noteOk(m, { font: true }), note: `375px 字級 150%：${m.lines} 行、說明 scrollWidth ${m.sw}/${m.cw}、left ${m.left}、right ${m.right}；文件 scrollWidth ${m.doc}/${m.vw}（文件溢出依 §7.23.4 只回報）` };
  });
  await p.close();
}

// ═════════ AC-23-02（LT-3～LT-5）、AC-23-07 ═════════
const contactJs = `(() => { const list = [...document.querySelectorAll("#view-sources .src-contact")]; const el = list[0]; if (!el) return { n: 0 }; const r = document.createRange(); r.selectNodeContents(el); const lines = new Set([...r.getClientRects()].map((x) => Math.round(x.top))).size; const b = el.getBoundingClientRect(); const cs = getComputedStyle(el); const vw = document.documentElement.clientWidth;
  const muted = [...document.querySelectorAll("#view-sources .src-muted")].find((x) => !x.classList.contains("src-contact")); const mcs = muted ? getComputedStyle(muted) : null; let anc = el, a = false; while (anc) { if (anc.tagName === "A") a = true; anc = anc.parentElement; }
  const nav = document.getElementById("app-nav"); const nb = nav ? nav.getBoundingClientRect() : null; el.scrollIntoView({ block: "center" }); const c = el.getBoundingClientRect(); const hit = document.elementFromPoint(c.left + c.width / 2, c.top + c.height / 2); const footer = document.getElementById("footer-sources");
  return { n: list.length, text: el.textContent.trim(), lines, sw: el.scrollWidth, cw: el.clientWidth, left: b.left, right: b.right, vw, anc: a, tag: el.tagName, tabindex: el.getAttribute("tabindex"), color: cs.color, size: cs.fontSize, mutedColor: mcs && mcs.color, mutedSize: mcs && mcs.fontSize, doc: document.documentElement.scrollWidth, hit: !!hit && (hit === el || el.contains(hit)), beforeFooter: footer ? !!(el.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING) : null }; })()`;
const contrast = `(() => { const el = document.querySelector("#view-sources .src-contact"); const rgb = (s) => (s.match(/[\\d.]+/g) || []).map(Number); const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); }; let e = el, bg = null; while (e) { const c = rgb(getComputedStyle(e).backgroundColor); if (c.length >= 3 && (c.length < 4 || c[3] > 0.5)) { bg = c; break; } e = e.parentElement; } bg = bg || [255, 255, 255]; const L1 = lum(rgb(getComputedStyle(el).color)), L2 = lum(bg); return Math.round(((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)) * 100) / 100; })()`;
for (const [w, h] of [[375, 667], [1366, 900]]) {
  const p = await open({ vp: [w, h] }); await p.goto();
  await R.check(`TC-23-02d-${w}`, "AC-23-02（v0.17 LT-3、LT-4、LT-5）、V-LGL-03", async () => {
    await p.click("#footer-sources"); await sleep(300);
    const g = await p.ev(`(() => { const s = document.getElementById("view-sources").textContent; const c = (t) => s.split(t).length - 1; return { lt3: c(${J(LT3)}), lt4: c(${J(LT4)}), lt5: c(${J(LT5)}), old: ["著作權人 JimmyLin", "保留所有權利"].filter((x) => s.includes(x)), mit: c("程式碼以 MIT 授權（Copyright JimmyLin）"), cc: c("單字資料以 CC BY-SA 4.0 授權"), contact: c(${J(CONTACT)}), doc: document.documentElement.scrollWidth, vw: document.documentElement.clientWidth,
      clipped: [...document.querySelectorAll("#view-sources p, #view-sources li")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.left < 0 || r.right > document.documentElement.clientWidth + 0.5); }).length }; })()`);
    return { ok: g.lt3 === 1 && g.lt4 === 1 && g.lt5 === 1 && g.old.length === 0 && g.mit >= 1 && g.cc >= 1 && g.contact === 1 && g.doc <= g.vw && g.clipped === 0, note: `${w}px：LT-3 ${g.lt3} 次、LT-4 ${g.lt4} 次、LT-5 ${g.lt5} 次；舊文字 ${g.old.join("/") || "無"}；MIT 聲明 ${g.mit}、CC 聲明 ${g.cc}、聯絡行 ${g.contact}；水平捲軸=${g.doc > g.vw}、超出視窗元素 ${g.clipped}` };
  });
  await R.check(`TC-23-07-${w}`, "AC-23-07 (1)(2)(3)(5)(6)、AC-27-03、AC-38-01、AC-38-04、SD-FB-69", async () => {
    await p.go("dashboard"); const reqs0 = netReqs(p).length; await p.click("#footer-sources"); await sleep(300);
    const raw0 = await p.ev(`localStorage.getItem(${J(KEY)})`);
    const c = await p.ev(contactJs); const ct = await p.ev(contrast);
    // 點擊該行：不換頁、不跳頁
    const url0 = await p.ev("location.href"); const click = await p.click("#view-sources .src-contact"); await sleep(100); const url1 = await p.ev("location.href"); const still = await p.ev(`!document.getElementById("view-sources").hidden`);
    // Tab 走完不落在該行
    await p.ev(`document.activeElement && document.activeElement.blur(); window.scrollTo(0, 0)`); let focused = 0; for (let k = 0; k < 40; k++) { await p.key("Tab", "Tab", 9); if (await p.ev(`!!(document.activeElement && document.activeElement.classList.contains("src-contact"))`)) focused++; }
    const raw1 = await p.ev(`localStorage.getItem(${J(KEY)})`);
    const ok = c.n === 1 && c.text === CONTACT && c.lines === 1 && c.sw <= c.cw && c.left >= 0 && c.right <= c.vw + 0.5 && !c.anc && c.tag !== "A" && c.tabindex === null && c.color === c.mutedColor && c.size === "13px" && c.color !== ACCENT && ct >= 4.5 && c.doc <= c.vw && c.hit && c.beforeFooter !== false && url0 === url1 && still && focused === 0 && raw0 === raw1 && netReqs(p).length === reqs0;
    return { ok, note: `${w}px：${c.n} 行元素、逐字=${c.text === CONTACT}、Range 行數 ${c.lines}、scrollWidth ${c.sw}/${c.cw}、祖先有 <a>=${c.anc}、<${c.tag}> tabindex ${c.tabindex}、顏色 ${c.color} 與 .src-muted 相同=${c.color === c.mutedColor}、字級 ${c.size}（§7.22.2 定案 0.8125rem）、對比 ${ct}；水平捲軸=${c.doc > c.vw}、未被遮住=${c.hit}；點擊不換頁=${url0 === url1 && still}、Tab 落在該行 ${focused} 次；localStorage 不變=${raw0 === raw1}；請求增加 ${netReqs(p).length - reqs0}` };
  });
  await R.check(`TC-23-07x-${w}`, "AC-23-07 (4)（file:// 斷網）、(7)（其他畫面不顯示）", async () => {
    const out = []; let ok = true;
    for (const tab of ["dashboard", "customizer", "flashcards", "part5"]) { await p.go(tab); await sleep(40); const v = await p.ev(`[...document.querySelectorAll(".src-contact")].filter((e) => !e.closest("[hidden]") && e.getClientRects().length > 0).length`); const t = await p.ev(`document.body.innerText.includes(${J(CONTACT)})`); ok = ok && v === 0 && !t; out.push(`${tab}：可見 ${v}`); }
    await p.send("Network.emulateNetworkConditions", { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
    await p.click("#footer-sources"); await sleep(250); const c = await p.ev(contactJs); await p.send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    ok = ok && c.n === 1 && c.text === CONTACT; out.push(`斷網仍顯示且逐字=${c.text === CONTACT}`);
    return { ok, note: `${w}px：${out.join("；")}` };
  });
  await R.check(`TC-X-legal-${w}`, "Console 無未處理錯誤、無網路請求", async () => ({ ok: errs(p).length === 0 && netReqs(p).length === 0, note: `錯誤 ${J(errs(p)).slice(0, 300)}；非 file 請求 ${netReqs(p).length}` }));
  await p.close();
}
// 首次畫面不顯示聯絡行（AC-23-07 (7)）
{
  const p = await open({ autoStart: false }); await p.goto(); await p.ev(`localStorage.clear()`); await p.goto();
  await R.check("TC-23-07f", "AC-23-07 (7)（首次畫面不顯示）", async () => { const t = await p.ev(`document.body.innerText.includes(${J(CONTACT)})`); const entry = await p.entry(); return { ok: entry === "firstRun" && !t, note: `entry ${entry}；首次畫面顯示聯絡行=${t}` }; });
  await p.close();
}
// V-PWA (b)
{
  const E = await import("./lib/pwa-env.mjs");
  await E.serve(E.SITE);
  try {
    await R.check("TC-23-07h", "AC-23-07 (4)(5)（V-PWA (b)）、AC-37-05", async () => {
      const browser = await E.launchBrowser();
      try {
        const env = await E.newEnv(browser, { reducedMotion: "reduce", width: 375, height: 667 }); const page = await env.newPage(); const reqs = []; page.on("request", (r) => reqs.push({ url: r.url(), method: r.method() }));
        await page.goto(E.BASE); await sleep(800); await E.startLearning(page); await E.waitSW(page); await page.reload(); await sleep(700); const r0 = reqs.length;
        await page.click("#footer-sources"); await sleep(300); const t = await page.evaluate(() => { const e = document.querySelector("#view-sources .src-contact"); return e ? e.textContent.trim() : null; });
        const ver = await page.evaluate(() => (document.getElementById("app-version") || {}).textContent); const after = reqs.slice(r0); await env.ctx.close();
        return { ok: t === CONTACT && after.length === 0 && reqs.every((q) => q.url.startsWith(E.ORIGIN) && q.method === "GET"), note: `http 版聯絡行逐字=${t === CONTACT}、版本行「${ver}」；開啟資料來源頁新增請求 ${after.length} 筆；全程跨來源或非 GET ${reqs.filter((q) => !q.url.startsWith(E.ORIGIN) || q.method !== "GET").length}` };
      } finally { await browser.close(); }
    });
  } finally { await E.stopServer(); }
}

R.save(resultPath("e2e-legal"));
console.log(`e2e-legal：通過 ${R.results.filter((r) => r.result === "通過").length}、失敗 ${R.results.filter((r) => r.result === "失敗").length}`);
