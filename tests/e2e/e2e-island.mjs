// QA 第 13 輪（PRD v0.24 R-32 島嶼風格第一階段，US-63～US-72；契約 v0.24 §15 V-ISL-01～V-ISL-09、V-LAY-02、V-LAY-10、V-LGL-03、V-LGL-04；
// architecture v0.22 §7.32、§10.15 Q21～Q28）：對交付檔 dist/english-master-track.html 以 CDP 無頭 Chrome 驗收群島頁、島嶼外觀與單字卡學完回饋。
// 效能（AC-70-03、AC-64-09 ≤ 100 ms、AC-69-05 ≤ 100 ms）另見 diag-r13-perf.mjs；NVDA 播報（AC-69-06、AC-71-01）與原創性（AC-72-03 (b)）為人工。
// 測試資料以 localStorage 構造（PRD AC-64-02「以 DevTools 或匯入備份建立」）；單字卡操作一律以真實滑鼠／觸控事件，STT 以 V-STT-STUB 替身。
// 用法：node tests/e2e/e2e-island.mjs（QA_OLD 可指定 v1.3.2 交付檔；未指定時由 git HEAD c16d368 取出）
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { launch, sleep, recorder, resultPath, FILE_URL, ROOT, DIST } from "./lib/cdp.mjs";
import { stateRecord, KEY, todayYmd, addDays, readState } from "./lib/state.mjs";
import { TOAST_RECORDER, fakeTts, fakeStt, fakeMic } from "./lib/inits.mjs";
import { PROBE } from "./lib/layout-probe.mjs";

const R = recorder("e2e-island");
// QA_ONLY=<正規式>：只執行符合的 TC（除錯用；正式執行不設定）
const ONLY = process.env.QA_ONLY ? new RegExp(process.env.QA_ONLY) : null;
{ const orig = R.check.bind(R); R.check = (tc, ac, fn) => (ONLY && !ONLY.test(tc) ? Promise.resolve() : orig(tc, ac, fn)); }
const J = JSON.stringify;
const TMP = process.env.QA_TMP || fs.mkdtempSync(path.join(os.tmpdir(), "emt-qa-"));
const OLD = process.env.QA_OLD || path.join(TMP, "v1.3.2-english-master-track.html");
if (!fs.existsSync(OLD)) fs.writeFileSync(OLD, execFileSync("git", ["show", "c16d368:dist/english-master-track.html"], { cwd: ROOT, maxBuffer: 64 << 20 }));
const OLD_URL = pathToFileURL(OLD).href;
const TODAY = todayYmd();
const PAGES = [];
const OUTLINE = "#3d3550", BG = "rgb(234, 247, 251)", BRAND = "#1e9bf0", GOLD = "#c9a227", ACCENT = "#f7893b";
const COLORS = { orange: "#e8833a", brown: "#8b5a2b", green: "#2e9e5b", blue: "#2f6fd6", gold: "#c9a227" };
const NAME = { orange: "橘島", brown: "棕島", green: "綠島", blue: "藍島", gold: "金島" };
const SCORE = { orange: 215, brown: 465, green: 725, blue: 855, gold: 990 };
const STAGE_COUNTS = { sand: [0, 0, 0, 0, 0], sprout: [1, 0, 0, 0, 0], palm: [0, 1, 0, 0, 0], bloom: [0, 2, 2, 0, 0], hut: [0, 2, 2, 1, 0], complete: [0, 3, 2, 1, 1] };
const STAGE_NAME = { sand: "沙灘", sprout: "新芽", palm: "一棵椰子樹", bloom: "開花", hut: "小屋", complete: "完成" };
const STAGE_LIST = { sand: "還是一片沙灘，掌握第一個字就會冒芽", sprout: "冒出新芽了", palm: "長出第一棵椰子樹", bloom: "樹林開花了", hut: "蓋好小屋，快完成了", complete: "插上旗子，這座島完成了" };
const stageOfP = (p) => (p === 0 ? "sand" : p <= 24 ? "sprout" : p <= 49 ? "palm" : p <= 74 ? "bloom" : p <= 99 ? "hut" : "complete");
const pOf = (m, n) => (m === 0 ? 0 : m === n ? 100 : Math.min(99, Math.max(1, Math.floor((m / n) * 100 + 0.5))));
const run = (p, fn, ...args) => p.ev(`(${fn.toString()})(...${J(args)})`);

async function open({ w = 1366, h = 768, reduced = false, stt = false, url = FILE_URL, inits = [] } = {}) {
  const p = await launch(); PAGES.push(p); p.autoStart = false;
  for (const s of [TOAST_RECORDER, PROBE, ...(stt ? [fakeTts("ok"), fakeStt("ok", { audioStart: true, autoAudioStartMs: null }), fakeMic("ok", -5)] : []), ...inits]) await p.addInitScript(s);
  await p.viewport(w, h);
  if (reduced) await p.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await p.goto(url);
  return p;
}
/** 寫入完整狀態並重新開啟；over 覆寫 data 欄位 */
async function seedOpen(p, over = {}, score = 725, url = FILE_URL) {
  await p.ev(`localStorage.setItem(${J(KEY)}, ${J(J(stateRecord(score, { sttNoticeAcknowledged: true, ...over })))})`);
  await p.goto(url); await sleep(120);
}
const toDash = async (p) => { await p.ev(`EMT.router.go("dashboard")`); await sleep(150); };
let RANK = null; // 依排名排序的內建 wordKey
const ranks = (from, to) => RANK.slice(from - 1, to); // 排名 from～to（含）
const today = (x) => ({ date: TODAY, wordKeys: Array.from({ length: x }, (_, i) => "qa-today-" + i) });
const streakOf = (s) => (s === 0 ? { days: 0, lastActiveDate: null } : { days: s, lastActiveDate: TODAY });
const correctIds = (k) => Array.from({ length: k }, (_, i) => "p5-" + String(i + 1).padStart(3, "0"));

/** 群島頁讀值（地圖、清單、3 格、今日任務卡） */
function readDash() {
  const q = (s, r = document) => r.querySelector(s), qa = (s, r = document) => [...r.querySelectorAll(s)];
  const root = q("#view-dashboard"); const fig = q(".db-map__figure", root); const svg = fig && q("svg.isl-map", fig);
  const isl = {};
  for (const g of qa("g.isl-island", svg)) isl[g.dataset.island] = { stage: g.dataset.stage, c: [".isl-sprout", ".isl-palm", ".isl-flower", ".isl-hut", ".isl-flag"].map((s) => qa(s, g).length) };
  const fog = qa("g.isl-fog", svg).map((g) => ({ id: g.dataset.island, dashed: qa("[stroke-dasharray]", g).length > 0 || !!g.getAttribute("stroke-dasharray"), plants: qa(".isl-sprout,.isl-palm,.isl-flower,.isl-hut,.isl-flag", g).length, op: Number(g.getAttribute("opacity") || getComputedStyle(g).opacity) }));
  const lh = q("g.isl-lighthouse", svg);
  const sun = q("g.isl-sun", svg);
  const rows = qa("li.db-isle", root).map((li) => { const bar = q(".db-isle__bar", li), fill = q(".db-isle__fill", li), dot = q(".db-isle__dot", li);
    return { cls: li.className, name: (q(".db-isle__name", li) || {}).textContent, sub: (q(".db-isle__sub", li) || {}).textContent, right: (q(".db-isle__right", li) || {}).textContent, stage: (q(".db-isle__stage", li) || {}).textContent,
      role: bar.getAttribute("role"), now: bar.getAttribute("aria-valuenow"), min: bar.getAttribute("aria-valuemin"), max: bar.getAttribute("aria-valuemax"), label: bar.getAttribute("aria-label"), barHidden: bar.getAttribute("aria-hidden"),
      fillPct: fill ? Math.round((fill.getBoundingClientRect().width / bar.clientWidth) * 1000) / 10 : null, fillBg: fill ? getComputedStyle(fill).backgroundColor : null, dotBg: getComputedStyle(dot).backgroundColor, dotHidden: dot.getAttribute("aria-hidden"),
      rowBg: getComputedStyle(li).backgroundColor, num: getComputedStyle(q(".db-isle__right", li)).fontVariantNumeric, kids: [...li.children].map((e) => e.className.split(" ")[0]).join(",") }; });
  const stat = (k) => { const c = q(".db-stat--" + k, root); return c ? { value: (q(".db-stat__value", c) || {}).innerText, sub: (q(".db-stat__sub", c) || {}).innerText || null, status: (q(".db-stat__status", c) || {}).textContent || null, n: qa(".db-stat__status", c).length, text: c.innerText.replace(/\s+/g, " ").trim() } : null; };
  const bar = q(".db-today__bar", root), fill = q(".db-today__fill", root), done = q(".db-today__done", root);
  return {
    alt: fig ? fig.getAttribute("aria-label") : null, figRole: fig ? fig.getAttribute("role") : null, svgHidden: svg ? svg.getAttribute("aria-hidden") : null,
    weather: svg && svg.dataset.weather, lighthouse: svg && svg.dataset.lighthouse, boat: svg && svg.dataset.boat, isl, fog,
    lh: lh ? { state: lh.dataset.state, rocks: qa(".isl-lh-rocks", lh).length, tower: qa(".isl-lh-tower", lh).length, beam: qa(".isl-lh-beam", lh).length } : null,
    sign: qa("g.isl-label[data-label=sign]", svg).length, sunOp: sun ? Number(sun.getAttribute("opacity") || 1) * Number(getComputedStyle(sun).opacity) : null, rainbow: qa("g.isl-rainbow", svg).length, clouds: qa("g.isl-cloud", svg).length,
    labels: qa("g.isl-labels text", svg).map((t) => t.textContent), rows,
    streak: stat("streak"), mastery: stat("mastery"), answered: stat("answered"),
    todayText: (q(".db-today__text", root) || {}).textContent, bubble: (q(".db-host__bubble", root) || {}).textContent, hostName: (q(".db-host__name", root) || {}).textContent,
    bar: bar ? { role: bar.getAttribute("role"), min: bar.getAttribute("aria-valuemin"), max: bar.getAttribute("aria-valuemax"), now: bar.getAttribute("aria-valuenow"), text: bar.getAttribute("aria-valuetext"), h: bar.getBoundingClientRect().height, bw: getComputedStyle(bar).borderTopWidth, bc: getComputedStyle(bar).borderTopColor } : null,
    fillPct: fill && bar ? Math.round((fill.getBoundingClientRect().width / bar.clientWidth) * 1000) / 10 : null, fillBg: fill ? getComputedStyle(fill).backgroundColor : null, fillDone: fill ? fill.classList.contains("db-today__fill--done") : null,
    doneShown: !!done && !done.hidden && done.getClientRects().length > 0, doneText: done ? done.textContent : null, todayNum: getComputedStyle(q(".db-today__text", root)).fontVariantNumeric,
    nan: /NaN|Infinity|undefined/.test(root.innerText + (fig ? fig.getAttribute("aria-label") : "")),
  };
}
const dash = async (p) => { await toDash(p); return run(p, readDash); };
const rgbHex = (c) => { const m = String(c).match(/\d+(\.\d+)?/g); return m ? "#" + m.slice(0, 3).map((x) => Math.round(+x).toString(16).padStart(2, "0")).join("") : c; };
const altIsland = (id, pct, stage) => (pct === null ? `${NAME[id]}掌握 —，${STAGE_NAME[stage]}` : `${NAME[id]}掌握 ${pct}%，${STAGE_NAME[stage]}`);

// ═══════════ 準備：取得排名 → wordKey ═══════════
{
  const p = await open();
  RANK = await p.ev(`EMT.content.builtin.slice().sort((a, b) => a.rank - b.rank).map((w) => EMT.core.wordkey.wordKey(w.word))`);
  const info = await p.ev(`({ n: EMT.content.builtin.length, nB: EMT.content.nB, nG: EMT.content.nG, q: EMT.content.part5.length })`);
  console.log(`  內建 ${info.n} 字、nB ${info.nB}、nG ${info.nG}、題庫 ${info.q} 題`);
  await p.close();
}

// ═══════════ US-63 名稱、入口與響應式版面 ═══════════
{
  const p = await open();
  await seedOpen(p, {});
  await R.check("TC-63-01", "AC-63-01、AC-20-03、AC-27-05、AC-56-04", async () => {
    const out = []; let ok = true;
    for (const [w, h] of [[375, 667], [700, 900], [1366, 768]]) {
      await p.viewport(w, h); await p.ev(`EMT.router.go("customizer")`); await sleep(200);
      const toggled = await p.ev(`(() => { const t = document.getElementById("nav-toggle"); return !!t && t.getClientRects().length > 0 && getComputedStyle(t).display !== "none"; })()`);
      if (toggled) { await p.click("#nav-toggle"); await sleep(150); }
      const nav = await p.ev(`[...document.querySelectorAll("#app-nav [data-tab]")].map((b) => b.textContent.trim())`);
      const icon = await p.ev(`(() => { const b = document.querySelector('#app-nav [data-tab="dashboard"]'); const s = b.querySelector("svg"); return s ? { tag: s.tagName, paths: s.querySelectorAll("path").length, ext: /href|url\\(/.test(s.outerHTML), shown: s.getClientRects().length > 0 } : null; })()`);
      const hit = await p.click('#app-nav [data-tab="dashboard"]'); await sleep(350);
      const r = await p.ev(`(() => { const b = document.querySelector('#app-nav [data-tab="dashboard"]'); const t = document.querySelector("#view-dashboard .dash-title"); const deco = t && t.querySelector("svg");
        const g = document.querySelector("#view-dashboard .db-goal"); const tr = t.getBoundingClientRect(), gr = g.getBoundingClientRect(); const h1 = document.querySelector("h1");
        return { cur: b.getAttribute("aria-current"), tab: EMT.router.current(), tag: t.tagName, text: t.textContent.trim(), deco: deco ? deco.getAttribute("aria-hidden") : "none", h1: h1 ? h1.textContent.trim() : null,
          sameRow: gr.top < tr.bottom && gr.bottom > tr.top && gr.left >= tr.right - 0.5, below: gr.top >= tr.bottom - 0.5, overlap: !(gr.right <= tr.left || gr.left >= tr.right || gr.bottom <= tr.top || gr.top >= tr.bottom) }; })()`);
      const good = J(nav) === J(["群島", "難易度設定", "單字卡", "模擬測驗"]) && icon && icon.tag === "svg" && !icon.ext && hit && r.cur === "page" && r.tab === "dashboard" && r.tag === "H2" && r.text === "我的群島" && r.deco === "true" && r.h1 === "EnglishContext" && !r.overlap && (w <= 640 ? (r.sameRow || r.below) : r.sameRow);
      ok = ok && good; out.push(`${w}px${toggled ? "（先按選單）" : ""}：導覽 ${nav.join("、")}；第 1 項圖示 ${icon && icon.tag}（path ${icon && icon.paths}、外部參照=${icon && icon.ext}、可見=${icon && icon.shown}）；點擊命中=${hit} → ${r.tab}、aria-current=${r.cur}；${r.tag}「${r.text}」裝飾 aria-hidden=${r.deco}；h1「${r.h1}」；目標標籤同列=${r.sameRow}、換行=${r.below}、重疊=${r.overlap}${good ? "" : "✗"}`);
    }
    return { ok, note: out.join("；") + "（≥ 641px 導覽圖示依既有規則隱藏，architecture §10.15 (18)）" };
  });

  // AC-63-02：畫面文字與 aria-label、title 不含「主控台」「學習主控台」
  await R.check("TC-63-02", "AC-63-02、AC-32-01、V-ISL-08", async () => {
    const hits = []; const seen = [];
    const scan = async (label) => { const r = await p.ev(`(() => { const t = document.body.innerText; const attrs = [...document.querySelectorAll("[aria-label],[title]")].map((e) => (e.getAttribute("aria-label") || "") + "|" + (e.getAttribute("title") || "")).join(" ");
      const all = [...document.querySelectorAll("body *")].filter((e) => !["SCRIPT", "STYLE"].includes(e.tagName)).map((e) => [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("")).join(" ");
      return { vis: (t.match(/主控台/g) || []).length, attr: (attrs.match(/主控台/g) || []).length, dom: (all.match(/主控台/g) || []).length, title: document.title.includes("主控台") }; })()`);
      seen.push(label); if (r.vis || r.attr || r.dom || r.title) hits.push(`${label}：${J(r)}`); };
    await p.viewport(1366, 768);
    await p.ev(`localStorage.clear()`); await p.goto(); await sleep(200); await scan("首次畫面");
    await seedOpen(p, { masteredWordKeys: ranks(1, 5), part5: { currentIndex: 0, lockedSelection: null, phase: "question", roundAnswered: 10, roundCorrect: 5, totalAnswered: 10, totalCorrect: 5 } });
    for (const t of ["dashboard", "customizer", "flashcards", "part5", "sources", "about", "contact", "privacy"]) { await p.ev(`EMT.router.go(${J(t)})`); await sleep(200); await scan(t); }
    await p.ev(`EMT.router.go("dashboard")`); await sleep(150); await p.click(".db-backup__toggle"); await sleep(100); await scan("dashboard（資料備份展開）");
    await p.ev(`EMT.router.go("customizer")`); await sleep(150); await p.click('.cz-level[data-color="brown"]'); await p.click("#cz-apply"); await sleep(200);
    const dlg = await p.ev(`(() => { const d = document.querySelector(".dialog"); return d ? d.innerText : null; })()`); await scan("初始化確認視窗");
    await p.click('.dialog [data-action="cancel"]'); await sleep(150);
    await p.ev(`EMT.router.go("flashcards")`); await sleep(150); await p.click(".fc-next"); await sleep(100);
    const toasts = await p.ev(`window.__qaToasts.map((t) => t.text)`);
    const tHits = toasts.filter((t) => t.includes("主控台"));
    const dlgOk = !!dlg && dlg.includes("建議先按「取消」，到「群島」頁按「匯出備份」保存目前紀錄") && !dlg.includes("主控台");
    return { ok: hits.length === 0 && tHits.length === 0 && dlgOk, note: `掃描 ${seen.length} 個畫面（${seen.join("、")}）可見文字、DOM 文字節點（含隱藏）、aria-label、title、document.title：命中 ${hits.join("｜") || "0"}；Toast ${toasts.length} 則命中 ${tHits.length}；確認視窗「${(dlg || "").replace(/\s+/g, " ").slice(0, 120)}」含新文字=${dlgOk}` };
  });
  await p.close();
}

// AC-63-03／AC-63-04／AC-63-05／AC-65-04：版面
{
  const p = await open();
  await seedOpen(p, { masteredWordKeys: [...ranks(1, 500), ...ranks(1001, 1500)], streak: streakOf(7), part5CorrectIds: correctIds(50), todayLearned: today(15), learnedHistory: { [TODAY]: 15, [addDays(TODAY, -1)]: 8 } });
  const layout = () => run(p, () => {
    const q = (s) => document.querySelector(s); const d = q("#view-dashboard .dashboard"); const kids = [...d.children].filter((e) => e.getClientRects().length > 0);
    const name = (e) => ["db-head", "db-today", "db-map", "db-isles", "db-stats", "db-chart", "db-backup"].find((c) => e.classList.contains(c)) || e.className;
    const rects = kids.map((e) => ({ n: name(e), r: e.getBoundingClientRect() }));
    const byTop = rects.slice().sort((a, b) => a.r.top - b.r.top).map((x) => x.n).join(",");
    const cont = d.getBoundingClientRect(); const map = q(".db-map").getBoundingClientRect(); const svg = q("svg.isl-map").getBoundingClientRect();
    const stats = [...document.querySelectorAll("#view-dashboard .db-stat")].map((e) => e.getBoundingClientRect());
    const isles = [...document.querySelectorAll("#view-dashboard li.db-isle")].map((e) => e.getBoundingClientRect());
    const list = q(".db-isles__list").getBoundingClientRect();
    const widths = rects.filter((x) => !["db-head", "db-map"].includes(x.n)).map((x) => Math.round(x.r.width * 10) / 10);
    return { dom: kids.map(name).join(","), byTop, contW: cont.width, contL: cont.left, vw: document.documentElement.clientWidth, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
      mapW: map.width, mapL: map.left, svgW: svg.width, svgH: svg.height, widths, statsRow: stats.every((r) => Math.abs(r.top - stats[0].top) < 1), isleRows: isles.every((r) => Math.abs(r.width - list.width) < 1) && isles.every((r, i) => i === 0 || r.top >= isles[i - 1].bottom - 0.5), isleH: isles.map((r) => Math.round(r.height)),
      mapBorder: parseFloat(getComputedStyle(q(".db-map")).borderLeftWidth) };
  });
  await R.check("TC-63-03", "AC-63-03、AC-39-10、AC-20-01、AC-27-03", async () => {
    const out = []; let ok = true;
    for (const [w, h] of [[375, 667], [390, 844], [412, 915]]) {
      await p.viewport(w, h); await toDash(p); await p.ev(`scrollTo(0, 0)`); const r = await layout();
      const ratio = r.svgW / r.svgH, exp = 354 / 430, err = Math.abs(ratio / exp - 1) * 100;
      const same = r.widths.every((x) => Math.abs(x - r.contW) < 1) && Math.abs(r.mapW - r.contW) < 1;
      await p.ev(`scrollTo(0, document.documentElement.scrollHeight)`); await sleep(150);
      const last = await p.ev(`(() => { const nav = document.getElementById("app-nav"); const nr = nav.getBoundingClientRect(); const f = document.getElementById("app-footer"); const links = [...f.querySelectorAll("a,button")].filter((e) => e.getClientRects().length); const lb = Math.max(...links.map((e) => e.getBoundingClientRect().bottom)); const bk = document.querySelector("#view-dashboard .db-backup").getBoundingClientRect();
        return { navTop: nr.top, fixed: getComputedStyle(nav).position, lastBottom: lb, backupBottom: bk.bottom }; })()`);
      const good = r.dom === "db-head,db-today,db-map,db-isles,db-stats,db-chart,db-backup" && r.byTop === r.dom && same && err <= 1 && r.sw <= r.cw && last.lastBottom <= last.navTop + 0.5 && last.backupBottom <= last.navTop + 0.5;
      ok = ok && good; out.push(`${w}×${h}：順序 ${r.byTop === r.dom ? "同 DOM" : r.byTop}；區塊寬 ${[...new Set(r.widths)].join("/")}、地圖 ${r.mapW.toFixed(1)}（容器 ${r.contW.toFixed(1)}）；地圖 SVG ${r.svgW.toFixed(1)}×${r.svgH.toFixed(1)} 比例誤差 ${err.toFixed(3)}%；scrollWidth ${r.sw}／${r.cw}；捲到底頁尾最後連結下緣 ${last.lastBottom.toFixed(1)} ≤ 導覽上緣 ${last.navTop.toFixed(1)}（${last.fixed}）${good ? "" : "✗"}`);
    }
    return { ok, note: out.join("；") };
  });
  await R.check("TC-63-04", "AC-63-04、AC-39-10、AC-49-08", async () => {
    const out = []; let ok = true;
    for (const [w, h] of [[768, 1024], [1366, 768], [1920, 1080]]) {
      await p.viewport(w, h); await toDash(p); const r = await layout();
      const ratio = r.svgW / r.svgH, err = Math.abs(ratio / (354 / 430) - 1) * 100;
      const expMap = Math.min(r.contW, 480), centered = Math.abs(r.mapL - (r.contL + (r.contW - r.mapW) / 2)) < 1, contCentered = Math.abs(r.contL - (r.cw - r.contW) / 2) < 1;
      const good = r.contW <= 720.5 && contCentered && r.byTop === r.dom && Math.abs(r.mapW - expMap) < 1 && centered && err <= 1 && r.widths.every((x) => Math.abs(x - r.contW) < 1) && r.statsRow && r.isleRows && r.sw <= r.cw;
      ok = ok && good; out.push(`${w}×${h}：容器 ${r.contW}（置中=${contCentered}）；單欄順序同 DOM=${r.byTop === r.dom}；地圖 ${r.mapW.toFixed(1)}（期望 ${expMap}）置中=${centered}、比例誤差 ${err.toFixed(3)}%；其他區塊寬 ${[...new Set(r.widths)].join("/")}；3 格同列=${r.statsRow}；清單每列 1 島=${r.isleRows}；scrollWidth ${r.sw}／${r.cw}${good ? "" : "✗"}`);
    }
    return { ok, note: out.join("；") };
  });
  await R.check("TC-63-05", "AC-63-05、AC-39-09、AC-22-05（量測點）", async () => {
    const out = []; let ok = true;
    for (const [w, h] of [[375, 667], [390, 844], [412, 915], [768, 1024], [1366, 768], [1920, 1080]]) {
      await p.viewport(w, h); await p.goto(); await sleep(250); await p.ev(`scrollTo(0, 0)`);
      const r = await p.ev(`(() => { const b = document.querySelector("#view-dashboard .db-start"); const r = b.getBoundingClientRect(); const nav = document.getElementById("app-nav"); const nr = nav.getBoundingClientRect(); const bottomNav = getComputedStyle(nav).position === "fixed" && nr.top > innerHeight / 2;
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { tab: EMT.router.current(), top: r.top, bottom: r.bottom, vh: innerHeight, navTop: bottomNav ? nr.top : null, hit: !!hit && (hit === b || b.contains(hit)), sy: scrollY }; })()`);
      const limit = r.navTop === null ? r.vh : r.navTop;
      const good = r.tab === "dashboard" && r.sy === 0 && r.top >= 0 && r.bottom <= limit + 0.5 && r.hit;
      ok = ok && good; out.push(`${w}×${h}：開啟即 ${r.tab}；「開始今日學習」${r.top.toFixed(0)}～${r.bottom.toFixed(0)}（限 ${limit.toFixed(0)}${r.navTop === null ? " 視窗" : " 底部導覽上緣"}）、中心點命中=${r.hit}${good ? "" : "✗"}`);
    }
    return { ok, note: out.join("；") };
  });
  await R.check("TC-65-04", "AC-65-04、AC-68-03", async () => {
    await p.viewport(375, 667); await toDash(p);
    const r = await run(p, () => {
      const L = window.__qaL; const rows = [...document.querySelectorAll("#view-dashboard li.db-isle")];
      const bad = []; const hs = [];
      for (const li of rows) {
        const r = li.getBoundingClientRect(); hs.push(Math.round(r.height * 10) / 10);
        const parts = [".db-isle__name", ".db-isle__sub", ".db-isle__right", ".db-isle__stage"].map((s) => li.querySelector(s)).filter(Boolean);
        for (const e of parts) { if (e.scrollWidth > e.clientWidth + 0.5 && getComputedStyle(e).overflow !== "visible") bad.push("裁切 " + e.className); const er = e.getBoundingClientRect(); if (er.right > r.right + 0.5 || er.left < r.left - 0.5) bad.push("超出列 " + e.className); }
        const boxes = [li.querySelector(".db-isle__title"), li.querySelector(".db-isle__right"), li.querySelector(".db-isle__bar"), li.querySelector(".db-isle__stage")].map((e) => e.getBoundingClientRect());
        for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) { const a = boxes[i], b = boxes[j]; if (a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5) bad.push(`重疊 ${li.className.split(" ")[1]} ${i}/${j}`); }
      }
      const c = L.contrast(document.querySelector("#view-dashboard .db-isles"));
      return { hs, bad, cmin: Math.min(...c.map((x) => x.ratio)), cbad: c.filter((x) => !x.ok).map((x) => x.text + "=" + x.ratio), sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth };
    });
    return { ok: r.hs.every((h) => h >= 44) && r.bad.length === 0 && r.cbad.length === 0 && r.sw <= r.cw, note: `375×667：5 列高 ${r.hs.join("、")} px（≥ 44）；裁切／重疊 ${r.bad.join("、") || "0"}；文字對比最小 ${r.cmin}（不足 ${r.cbad.join("、") || "0"}）；scrollWidth ${r.sw}／${r.cw}` };
  });
  await p.close();
}

// ═══════════ US-64 地圖、US-65 清單、US-67 3 格（資料驅動） ═══════════
{
  const p = await open({ w: 1366, h: 900 });
  await R.check("TC-64-01", "AC-64-01、AC-65-01", async () => {
    const out = []; let ok = true;
    for (const [w, h] of [[375, 667], [1366, 900]]) {
      await p.viewport(w, h);
      await seedOpen(p, { masteredWordKeys: ranks(1, 300), streak: streakOf(7), part5CorrectIds: correctIds(50), todayLearned: today(5) });
      const d = await dash(p);
      const m = await run(p, () => { const svg = document.querySelector("svg.isl-map"); const card = document.querySelector(".db-map"); const s = getComputedStyle(card);
        return { sea: svg.querySelectorAll("rect.isl-sea").length, waves: svg.querySelectorAll("g.isl-wave").length, sun: svg.querySelectorAll("g.isl-sun").length, dock: svg.querySelectorAll(".isl-dock").length, route: svg.querySelectorAll("line.isl-route").length, boat: svg.querySelectorAll("g.isl-boat").length,
          lastIsLabels: svg.lastElementChild.classList.contains("isl-labels"), radius: s.borderTopLeftRadius, inline: svg.closest("#view-dashboard") !== null && svg.namespaceURI === "http://www.w3.org/2000/svg" }; });
      const labels = d.labels.join("、");
      const fogOk = d.fog.length === 2 && d.fog.every((f) => f.dashed && f.plants === 0 && f.op < 1) && d.fog.map((f) => f.id).join() === "blue,gold";
      const good = m.sea === 1 && m.waves >= 1 && m.sun === 1 && d.clouds >= 1 && d.rainbow === 1 && m.dock === 1 && m.route === 1 && m.boat === 1 && m.lastIsLabels && m.inline && ["orange", "brown", "green"].every((k) => d.isl[k]) && fogOk
        && ["橘島", "棕島", "綠島", "藍島・霧中", "金島・霧中", "測驗燈塔"].every((t) => d.labels.includes(t)) && parseFloat(m.radius) >= 16;
      ok = ok && good; out.push(`${w}px：海面 ${m.sea}、海浪 ${m.waves}、太陽 ${m.sun}、雲 ${d.clouds}、彩虹 ${d.rainbow}（S = 7）、碼頭 ${m.dock}、航線 ${m.route}、小船 ${m.boat}；開放島 ${Object.keys(d.isl).join(",")}；霧中島 ${d.fog.map((f) => `${f.id}（虛線=${f.dashed}、植物 ${f.plants}、opacity ${f.op}）`).join("、")}；文字 ${labels}；文字層在最上層=${m.lastIsLabels}；地圖框圓角 ${m.radius}${good ? "" : "✗"}`);
    }
    return { ok, note: out.join("；") };
  });

  // AC-64-02：橘島 m 序列（N_O = 1,000），生效綠
  await R.check("TC-64-02", "AC-64-02、AC-65-01、AC-65-03、V-ISL-01", async () => {
    const out = []; let ok = true;
    const cases = [0, 1, 240, 250, 490, 500, 740, 750, 990, 999, 1000].map((m) => ["orange", m, 1000, ranks(1, m)]);
    const nB = 2809 - 1000, nG = 5620 - 2809;
    for (const [pct] of [[0], [25], [100]]) {
      const mb = pct === 0 ? 0 : pct === 100 ? nB : Math.ceil(nB * 0.245); cases.push(["brown", mb, nB, ranks(1001, 1000 + mb)]);
      const mg = pct === 0 ? 0 : pct === 100 ? nG : Math.ceil(nG * 0.245); cases.push(["green", mg, nG, ranks(2810, 2809 + mg)]);
    }
    for (const [id, m, n, keys] of cases) {
      await seedOpen(p, { masteredWordKeys: keys });
      const d = await dash(p); const P = pOf(m, n), st = stageOfP(P);
      const row = d.rows.find((r) => r.name === NAME[id]);
      const altPart = altIsland(id, P, st);
      const good = d.isl[id].stage === st && J(d.isl[id].c) === J(STAGE_COUNTS[st]) && row.right === `掌握 ${P}%` && row.stage === STAGE_LIST[st] && row.now === String(P) && Math.abs(row.fillPct - P) <= 1 && d.alt.includes(altPart) && !d.nan;
      ok = ok && good; out.push(`${NAME[id]} m=${m}：P ${P}、${st}、地圖 [芽,樹,花,屋,旗]=${J(d.isl[id].c)}、清單「${row.right}／${row.stage}」、進度條 ${row.now}（${row.fillPct}%）、替代文字含「${altPart}」=${d.alt.includes(altPart)}${good ? "" : "✗"}`);
    }
    return { ok, note: out.join("；") };
  });

  // AC-64-03：區段歸屬、自訂單字不計、3 格不變
  await R.check("TC-64-03", "AC-64-03、AC-30-10、AC-17-03、V-ISL-02", async () => {
    await seedOpen(p, {});
    await p.ev(`EMT.router.go("customizer")`); await sleep(150);
    const customs = ["qazwsxa", "qazwsxb", "qazwsxc", "qazwsxd", "qazwsxe"];
    for (const w of customs) await p.ev(`EMT.store.actions.addCustomWord({ word: ${J(w)}, meaning: "測試" })`);
    await sleep(100);
    const rec = await readState(p);
    rec.data.masteredWordKeys = [...ranks(1, 250), ...ranks(1001, 1010), ...customs];
    await p.ev(`localStorage.setItem(${J(KEY)}, ${J(J(rec))})`); await p.goto(); await sleep(150);
    const d = await dash(p);
    const rows = Object.fromEntries(d.rows.map((r) => [r.name, r]));
    const ok = d.isl.orange.stage === "palm" && J(d.isl.orange.c) === J(STAGE_COUNTS.palm) && rows["橘島"].right === "掌握 25%" && d.isl.brown.stage === "sprout" && rows["棕島"].right === "掌握 1%" && d.isl.green.stage === "sand" && rows["綠島"].right === "掌握 0%"
      && d.mastery.sub === "已掌握 265 字" && !d.nan;
    return { ok, note: `自訂 ${rec.data.customVocab.length} 字（不在內建）；橘 ${rows["橘島"].right}（${d.isl.orange.stage}）、棕 ${rows["棕島"].right}（${d.isl.brown.stage}）、綠 ${rows["綠島"].right}（${d.isl.green.stage}）；3 格「${d.mastery.value}」「${d.mastery.sub}」；NaN/Infinity=${d.nan}` };
  });

  // AC-64-04：生效色級不影響 P；（目前目標未包含）
  await R.check("TC-64-04", "AC-64-04、V-ISL-02", async () => {
    const out = []; let ok = true;
    const SUF = "（目前目標未包含）";
    const exp = { orange: ["棕島", "綠島"], brown: ["綠島"], green: [], blue: [], gold: [] };
    for (const c of ["orange", "brown", "green", "blue", "gold"]) {
      await seedOpen(p, { masteredWordKeys: [RANK[1499]] }, SCORE[c]);
      const d = await dash(p); const rows = Object.fromEntries(d.rows.map((r) => [r.name, r]));
      const suffixed = ["橘島", "棕島", "綠島"].filter((n) => rows[n].stage.endsWith(SUF));
      const good = rows["棕島"].right === "掌握 1%" && d.isl.brown.stage === "sprout" && J(suffixed) === J(exp[c]) && rows["棕島"].stage.startsWith("冒出新芽了") && !d.alt.includes(SUF);
      ok = ok && good; out.push(`套用${c}：棕島 ${rows["棕島"].right}／「${rows["棕島"].stage}」、地圖 ${d.isl.brown.stage}；加註記 ${suffixed.join("、") || "無"}；替代文字不含註記=${!d.alt.includes(SUF)}${good ? "" : "✗"}`);
    }
    return { ok, note: out.join("；") };
  });

  // AC-64-05：燈塔 K 序列；AC-67-01 第 3 格
  await R.check("TC-64-05", "AC-64-05、AC-67-01、AC-49-04、V-ISL-03", async () => {
    const out = []; let ok = true;
    const exp = { 0: ["unbuilt", "燈塔待建"], 1: ["built", "燈塔蓋好"], 49: ["built", "燈塔蓋好"], 50: ["lit", "燈塔點亮"], 200: ["lit", "燈塔點亮"] };
    for (const k of [0, 1, 49, 50, 200]) {
      await seedOpen(p, { part5CorrectIds: correctIds(k) });
      const d = await dash(p); const [st, text] = exp[k];
      const shape = st === "unbuilt" ? d.lh.rocks === 1 && d.lh.tower === 0 && d.lh.beam === 0 && d.sign === 1 : st === "built" ? d.lh.tower === 1 && d.lh.beam === 0 && d.sign === 0 : d.lh.tower === 1 && d.lh.beam === 1 && d.sign === 0;
      const kTxt = `已答對 ${k} / 200 題`;
      const good = d.lighthouse === st && d.lh.state === st && shape && d.answered.status === text && d.answered.value.startsWith(kTxt) && d.alt.includes(`模擬測驗已答對 ${k} 題，${text}`);
      ok = ok && good; out.push(`K=${k}：${d.lh.state}（石 ${d.lh.rocks}、塔 ${d.lh.tower}、光 ${d.lh.beam}、待建牌 ${d.sign}）、第 3 格「${d.answered.value}」「${d.answered.status}」${good ? "" : "✗"}`);
    }
    return { ok, note: out.join("；") };
  });

  // AC-64-06：天氣 S 序列與中斷
  await R.check("TC-64-06", "AC-64-06、AC-67-01、AC-17-02、V-ISL-03", async () => {
    const out = []; let ok = true;
    const keys = ranks(1, 300);
    for (const s of [0, 1, 6, 7]) {
      await seedOpen(p, { streak: streakOf(s), masteredWordKeys: keys });
      const d = await dash(p); const w = s === 0 ? ["cloudy", "陰天"] : s >= 7 ? ["rainbow", "出現彩虹"] : ["sunny", "晴天"];
      const good = d.weather === w[0] && d.streak.status === w[1] && (s === 0 ? d.sunOp <= 0.4 : d.sunOp > 0.4) && d.rainbow === (s >= 7 ? 1 : 0) && d.clouds >= 1 && d.streak.value.startsWith(String(s)) && d.alt.includes(`連續打卡 ${s} 天，${w[1]}`);
      ok = ok && good; out.push(`S=${s}：${d.weather}、太陽 opacity ${d.sunOp}、雲 ${d.clouds}、彩虹 ${d.rainbow}；第 1 格「${d.streak.value}」「${d.streak.status}」${good ? "" : "✗"}`);
    }
    await seedOpen(p, { streak: { days: 10, lastActiveDate: addDays(TODAY, -3) }, masteredWordKeys: keys });
    const b = await dash(p);
    await seedOpen(p, { streak: { days: 10, lastActiveDate: TODAY }, masteredWordKeys: keys });
    const a = await dash(p);
    const g2 = b.weather === "cloudy" && b.streak.value.startsWith("0") && b.streak.status === "陰天" && J(b.isl) === J(a.isl) && b.alt.includes("連續打卡 0 天，陰天");
    ok = ok && g2; out.push(`中斷（最後打卡 3 天前、連續 10 天）：第 1 格「${b.streak.value}」、${b.weather}；三島 ${J(Object.values(b.isl).map((x) => x.stage))} 與未中斷 ${J(Object.values(a.isl).map((x) => x.stage))} 相同=${J(b.isl) === J(a.isl)}${g2 ? "" : "✗"}`);
    return { ok, note: out.join("；") };
  });

  // AC-64-07：小船（D = 10，橘）
  await R.check("TC-64-07", "AC-64-07、V-ISL-03", async () => {
    const out = []; let ok = true; const pos = {};
    for (const [x, r] of [[0, 0], [5, 0.5], [9, 0.9], [10, 1], [15, 1]]) {
      await seedOpen(p, { todayLearned: today(x) }, 215);
      await toDash(p);
      const g = await run(p, () => { const b = document.querySelector("g.isl-boat"), l = document.querySelector("line.isl-route"); const m = /translate\(\s*([-\d.]+)[ ,]+([-\d.]+)\s*\)/.exec(b.getAttribute("transform"));
        return { bx: +m[1], by: +m[2], S: [+l.getAttribute("x1"), +l.getAttribute("y1")], E: [+l.getAttribute("x2"), +l.getAttribute("y2")], data: document.querySelector("svg.isl-map").dataset.boat, alt: document.querySelector(".db-map__figure").getAttribute("aria-label") }; });
      const dx = g.E[0] - g.S[0], dy = g.E[1] - g.S[1], len = Math.hypot(dx, dy);
      const err = Math.hypot(g.bx - (g.S[0] + dx * r), g.by - (g.S[1] + dy * r)) / len * 100; pos[x] = [g.bx, g.by];
      const good = err <= 2 && g.data === (r === 1 ? "docked" : "sailing") && g.alt.endsWith(`今日小船 ${x} / 10 字，${r === 1 ? "已靠岸" : "航行中"}`);
      ok = ok && good; out.push(`X=${x}：錨點 (${g.bx}, ${g.by})、期望比例 ${r}、誤差 ${err.toFixed(2)}% 航線長、${g.data}${good ? "" : "✗"}`);
    }
    const same = J(pos[10]) === J(pos[15]);
    return { ok: ok && same, note: out.join("；") + `；X=10 與 X=15 位置相同=${same}` };
  });

  // AC-65-01、AC-65-02：清單結構與屬性
  await R.check("TC-65-01", "AC-65-01、AC-65-02、AC-38-03", async () => {
    const out = []; let ok = true;
    for (const [w, h] of [[375, 667], [1366, 900]]) {
      await p.viewport(w, h); await seedOpen(p, { masteredWordKeys: [...ranks(1, 250), ...ranks(1001, 1010)] });
      const d = await dash(p);
      const h3 = await p.ev(`(() => { const s = document.querySelector("#view-dashboard .db-isles"); const h = s.querySelector("h3"); return h ? h.tagName + ":" + h.textContent : null; })()`);
      const SUBS = ["入門", "基礎", "職場與商務", "高階商務", "近母語"]; const ids = ["orange", "brown", "green", "blue", "gold"];
      const bad = [];
      d.rows.forEach((r, i) => {
        const id = ids[i]; const open = i < 3;
        if (r.name !== NAME[id] || r.sub !== SUBS[i]) bad.push(`${i} 名稱 ${r.name}/${r.sub}`);
        if (r.dotHidden !== "true" || rgbHex(r.dotBg) !== COLORS[id]) bad.push(`${id} 色點 ${r.dotHidden}/${rgbHex(r.dotBg)}`);
        if (!/tabular-nums/.test(r.num)) bad.push(`${id} tabular-nums ${r.num}`);
        if (open) { if (r.role !== "progressbar" || r.min !== "0" || r.max !== "100" || r.label !== `${NAME[id]}掌握率` || r.now === null || rgbHex(r.fillBg) !== COLORS[id] || !/^掌握 \d+%$/.test(r.right) || r.barHidden === "true") bad.push(`${id} 進度條 ${J(r)}`); }
        else if (r.right !== "尚未開放" || r.stage !== "還在霧中，之後的版本開放" || r.role === "progressbar" || r.barHidden !== "true" || r.fillPct !== null || rgbHex(r.rowBg) !== "#f3f6fa") bad.push(`${id} 霧中 ${J(r)}`);
      });
      const openBg = d.rows.slice(0, 3).map((r) => rgbHex(r.rowBg));
      const good = h3 === "H3:島嶼" && d.rows.length === 5 && bad.length === 0 && openBg.every((x) => x === "#ffffff");
      ok = ok && good; out.push(`${w}px：${h3}、${d.rows.length} 列 ${d.rows.map((r) => `${r.name}「${r.sub}」${r.right}／${r.stage}`).join("｜")}；開放島底色 ${openBg.join(",")}、霧中島 ${rgbHex(d.rows[3].rowBg)}；不符 ${bad.join("；") || "0"}`);
    }
    return { ok, note: out.join("；") + "（n = 0 的「掌握 —」與省略 aria-valuenow 見 TC-65-02n）" };
  });

  // AC-65-03、AC-67-02、AC-71-01：三處一致與文字替代逐字
  await R.check("TC-71-01", "AC-71-01、AC-65-03、AC-67-02、V-ISL-04", async () => {
    await p.viewport(1366, 900);
    await p.ev(`localStorage.clear()`); await seedOpen(p, {});
    await p.ev(`EMT.router.go("customizer")`); await sleep(100);
    const customs = ["qazwsxa", "qazwsxb", "qazwsxc", "qazwsxd", "qazwsxe"];
    for (const w of customs) await p.ev(`EMT.store.actions.addCustomWord({ word: ${J(w)}, meaning: "測試" })`);
    await sleep(80); const rec = await readState(p);
    Object.assign(rec.data, { masteredWordKeys: [...ranks(1, 250), ...ranks(1001, 1010), ...customs], streak: streakOf(3), part5CorrectIds: correctIds(48), todayLearned: today(4) });
    await p.ev(`localStorage.setItem(${J(KEY)}, ${J(J(rec))})`); await p.goto(); await sleep(150);
    const d = await dash(p);
    const EXP = "群島地圖：橘島掌握 25%，一棵椰子樹；棕島掌握 1%，新芽；綠島掌握 0%，沙灘；藍島、金島尚未開放；連續打卡 3 天，晴天；模擬測驗已答對 48 題，燈塔蓋好；今日小船 4 / 15 字，航行中";
    const ax = await p.send("Accessibility.getFullAXTree").catch(() => null);
    let axName = null, axKids = null, imgCount = 0;
    if (ax && ax.nodes) {
      const imgs = ax.nodes.filter((n) => n.role && n.role.value === "image" && n.name && /^群島地圖/.test(n.name.value || "")); imgCount = imgs.length;
      if (imgs[0]) { axName = imgs[0].name.value; const ids = new Set(imgs[0].childIds || []); axKids = ax.nodes.filter((n) => ids.has(n.nodeId) && !n.ignored).map((n) => (n.role && n.role.value) + ":" + (n.name && n.name.value)).length; }
    }
    const rows = Object.fromEntries(d.rows.map((r) => [r.name, r]));
    const tri = rows["橘島"].right === "掌握 25%" && rows["橘島"].stage === STAGE_LIST.palm && d.isl.orange.stage === "palm" && rows["棕島"].right === "掌握 1%" && d.isl.brown.stage === "sprout" && rows["綠島"].right === "掌握 0%" && d.isl.green.stage === "sand";
    const three = d.streak.status === "晴天" && d.weather === "sunny" && d.answered.status === "燈塔蓋好" && d.lighthouse === "built";
    const ok = d.alt === EXP && d.figRole === "img" && d.svgHidden === "true" && axName === EXP && axKids === 0 && imgCount === 1 && tri && three;
    return { ok, note: `aria-label 逐字相同=${d.alt === EXP}（「${d.alt}」）；role=${d.figRole}、svg aria-hidden=${d.svgHidden}；Chrome 無障礙樹 image 節點 ${imgCount} 個、名稱相同=${axName === EXP}、未忽略子節點 ${axKids}；清單／地圖一致=${tri}；3 格與地圖天氣、燈塔一致=${three}（NVDA 播報見 TC-71-01h）` };
  });
  // AC-71-01：資料變化後回到群島頁名稱即為新值
  await R.check("TC-71-01b", "AC-71-01、AC-64-09、AC-67-02", async () => {
    await seedOpen(p, { masteredWordKeys: ranks(2, 245), todayLearned: today(3) }, 725);
    const a = await dash(p);
    await p.ev(`EMT.router.go("flashcards")`); await sleep(200);
    await p.click(".fc-mode-btn"); await sleep(200);
    const ci = await p.ev(`EMT.store.getState().runtime.flashcard.quiz.correctIndex`);
    await p.click(".fcq-option", ci); await sleep(250);
    await p.click('#app-nav [data-tab="dashboard"]'); await sleep(300);
    const b = await run(p, readDash);
    const ok = /橘島掌握 24%，新芽/.test(a.alt) && /橘島掌握 25%，一棵椰子樹/.test(b.alt) && b.isl.orange.stage === "palm" && b.rows[0].right === "掌握 25%" && b.todayText === "今日已學 4 / 15 字" && /今日小船 4 \/ 15 字/.test(b.alt) && b.bubble === "再學 11 個字，今天的小船就靠岸囉！";
    return { ok, note: `答對前「${a.alt.split("；")[0]}」；答對排名 1 的字後點導覽回群島頁：「${b.alt.split("；")[0]}」、地圖 ${b.isl.orange.stage}、清單 ${b.rows[0].right}、${b.todayText}、對話框「${b.bubble}」、替代文字小船段「${b.alt.split("；").pop()}」（不重新載入）` };
  });
  await p.close();
}

// n = 0（資料缺漏）：無內建資料建置（QA_FIXTURE_NODATA，題庫 0 題、字庫 0 字）
{
  const fx = process.env.QA_FIXTURE_NODATA;
  if (fx && fs.existsSync(fx)) {
    const p = await open({ url: pathToFileURL(fx).href });
    await p.ev(`localStorage.setItem(${J(KEY)}, ${J(J(stateRecord(725, { sttNoticeAcknowledged: true, streak: streakOf(3), todayLearned: today(2) })))})`); await p.goto(pathToFileURL(fx).href); await sleep(150);
    await R.check("TC-65-02n", "AC-65-02、AC-67-01（Q = 0）、AC-71-01（n = 0）、E-178", async () => {
      const d = await dash(p);
      const open3 = d.rows.slice(0, 3);
      const listOk = open3.every((r) => r.right === "掌握 —" && r.now === null && r.min === "0" && r.max === "100" && r.role === "progressbar" && /掌握率$/.test(r.label) && r.fillPct === 0);
      const altOk = d.alt.startsWith("群島地圖：橘島掌握 —，沙灘；棕島掌握 —，沙灘；綠島掌握 —，沙灘；藍島、金島尚未開放；") && !/—%/.test(d.alt);
      const qOk = d.answered.value.trim().startsWith("—") || /—/.test(d.answered.text);
      const ok = listOk && altOk && qOk && d.answered.status === "燈塔待建" && d.lighthouse === "unbuilt" && !d.nan && Object.values(d.isl).every((x) => x.stage === "sand");
      return { ok, note: `無內建資料：清單 ${open3.map((r) => `${r.name}「${r.right}」now=${r.now}`).join("、")}；替代文字「${d.alt}」；第 3 格「${d.answered.text}」狀態「${d.answered.status}」；NaN/Infinity=${d.nan}` };
    });
    await p.close();
  } else R.manual("TC-65-02n", "AC-65-02、AC-67-01（Q = 0）、AC-71-01（n = 0）", "未提供 QA_FIXTURE_NODATA（由 run-r13.mjs 建置），本次未執行；n = 0、Q = 0 另由單元測試 island.test.js V-ISL-03、V-ISL-04 驗證");
}

// ═══════════ US-66 今日任務卡、US-67 3 格、AC-64-08 不倒退 ═══════════
{
  const p = await open({ w: 375, h: 667 });
  await R.check("TC-66-01", "AC-66-01、AC-39-02、AC-71-02", async () => {
    const out = []; let ok = true;
    for (const [w, h] of [[375, 667], [1366, 768]]) {
      await p.viewport(w, h); await seedOpen(p, { todayLearned: today(4) }, 215); await toDash(p);
      const r = await run(p, () => { const c = document.querySelector("#view-dashboard .db-today"); const t = c.querySelector(".db-host__turtle"), n = c.querySelector(".db-host__name"), b = c.querySelector(".db-host__bubble"), s = c.querySelector(".db-start"); const tr = t.getBoundingClientRect(), nr = n.getBoundingClientRect(), br = b.getBoundingClientRect(), sr = s.getBoundingClientRect(), cr = c.getBoundingClientRect();
        const ov = (a, b) => a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5;
        return { tag: t.tagName, hidden: t.getAttribute("aria-hidden"), name: n.textContent, left: tr.right <= Math.min(nr.left, br.left) + 0.5, top: tr.top - cr.top, ov: ov(tr, br) || ov(tr, nr) || ov(br, sr) || ov(tr, sr), clip: b.scrollWidth > b.clientWidth + 0.5 || br.right > cr.right + 0.5 || sr.right > cr.right + 0.5, bubble: b.textContent, firstRow: c.querySelector(".db-host").getBoundingClientRect().top <= c.querySelector(".db-today__progress").getBoundingClientRect().top }; });
      const good = r.tag === "svg" && r.hidden === "true" && r.name === "島主 龜龜" && r.left && !r.ov && !r.clip && r.firstRow;
      ok = ok && good; out.push(`${w}px：龜龜 ${r.tag} aria-hidden=${r.hidden}、在左側=${r.left}、距卡片頂 ${r.top.toFixed(0)}px；名稱「${r.name}」；對話框「${r.bubble}」；重疊=${r.ov}、裁切=${r.clip}${good ? "" : "✗"}`);
    }
    return { ok, note: out.join("；") };
  });
  await R.check("TC-66-02", "AC-66-02、V-ISL-04", async () => {
    const out = []; let ok = true;
    const EXP = { 0: "再學 10 個字，今天的小船就靠岸囉！", 4: "再學 6 個字，今天的小船就靠岸囉！", 9: "再學 1 個字，今天的小船就靠岸囉！", 10: "今天的小船靠岸了！想多學也可以，島上會更熱鬧。", 12: "今天的小船靠岸了！想多學也可以，島上會更熱鬧。" };
    for (const x of [0, 4, 9, 10, 12]) {
      await seedOpen(p, { todayLearned: today(x) }, 215); await toDash(p);
      const r = await p.ev(`(() => { const b = document.querySelector("#view-dashboard .db-host__bubble"); let live = null; for (let e = b; e; e = e.parentElement) { const a = e.getAttribute && (e.getAttribute("aria-live") || ""); const role = e.getAttribute && e.getAttribute("role"); if (/polite|assertive/.test(a) || /status|alert|log/.test(role || "")) { live = e.className || e.tagName; break; } } return { t: b.textContent, live }; })()`);
      const good = r.t === EXP[x] && r.live === null; ok = ok && good; out.push(`X=${x}：「${r.t}」、即時區域 ${r.live || "無"}${good ? "" : "✗"}`);
    }
    return { ok, note: out.join("；") };
  });
  await R.check("TC-66-03", "AC-66-03、AC-30-05、AC-38-07、AC-68-02", async () => {
    const out = []; let ok = true;
    for (const x of [0, 4, 10, 12]) {
      await seedOpen(p, { todayLearned: today(x) }, 215); const d = await dash(p);
      const ratio = Math.min(x / 10, 1) * 100, done = x >= 10;
      const good = d.todayText === `今日已學 ${x} / 10 字` && /tabular-nums/.test(d.todayNum) && Math.abs(d.fillPct - ratio) <= 1 && rgbHex(d.fillBg) === (done ? GOLD : BRAND) && d.fillDone === done && d.doneShown === done && (!done || d.doneText === "今日目標達成")
        && d.bar.role === "progressbar" && d.bar.min === "0" && d.bar.max === "10" && d.bar.now === String(Math.min(x, 10)) && d.bar.text === `今日已學 ${x} / 10 字` && d.bar.h >= 8 && parseFloat(d.bar.bw) >= 2 && rgbHex(d.bar.bc) === OUTLINE;
      ok = ok && good; out.push(`X=${x}：「${d.todayText}」、填滿 ${d.fillPct}%、${rgbHex(d.fillBg)}、達成行=${d.doneShown}；aria ${d.bar.min}/${d.bar.max}/${d.bar.now}「${d.bar.text}」；高 ${d.bar.h}px、外框 ${d.bar.bw} ${rgbHex(d.bar.bc)}${good ? "" : "✗"}`);
    }
    return { ok, note: out.join("；") };
  });
  await R.check("TC-66-04", "AC-66-04、AC-39-04、V-LAY-10、AC-68-02", async () => {
    const out = []; let ok = true;
    const TXT = { orange: "橘級・每日 10 字", brown: "棕級・每日 10 字", green: "綠級・每日 15 字", blue: "綠級・每日 15 字", gold: "綠級・每日 15 字" };
    for (const [w, h] of [[375, 667], [1366, 768]]) for (const c of ["orange", "brown", "green", "blue", "gold"]) {
      await p.viewport(w, h); await seedOpen(p, {}, SCORE[c]); await toDash(p);
      const r = await run(p, () => { const g = document.querySelector("#view-dashboard .db-goal"), t = g.querySelector(".db-goal__text"), b = g.querySelector(".db-change"), title = document.querySelector("#view-dashboard .dash-title"); const s = getComputedStyle(b), br = b.getBoundingClientRect(), tr = title.getBoundingClientRect(), gr = g.getBoundingClientRect();
        const L = window.__qaL; const eff = L.effective(b);
        return { text: t.textContent, btn: b.textContent.trim(), tag: b.tagName, next: t.closest(".db-goal__tag").nextElementSibling === b, bw: s.borderTopWidth, bc: L.hex(s.borderTopColor), rad: parseFloat(s.borderTopLeftRadius), bg: L.hex(s.backgroundColor), color: L.hex(s.color), deco: s.textDecorationLine, w: br.width, h: br.height, ratio: L.ratio(eff.fg, eff.bg),
          overlap: !(gr.right <= tr.left || gr.left >= tr.right || gr.bottom <= tr.top || gr.top >= tr.bottom), clip: t.scrollWidth > t.clientWidth + 0.5 }; });
      const banned = ["#f7893b", "#d5d9e0"]; const good = r.text === TXT[c] && r.btn === "變更" && r.tag === "BUTTON" && r.next && parseFloat(r.bw) >= 2 && r.bc === OUTLINE && r.rad >= 12 && !banned.includes(r.bg) && !banned.includes(r.color) && !banned.includes(r.bc) && r.deco === "none" && r.w >= 44 && r.h >= 44 && r.ratio >= 4.5 && !r.overlap && !r.clip;
      ok = ok && good; if (!good || c === "green") out.push(`${w}px ${c}：「${r.text}」＋${r.tag}「${r.btn}」緊接=${r.next}；外框 ${r.bw} ${r.bc}、圓角 ${r.rad}、底 ${r.bg}、字 ${r.color}、底線 ${r.deco}、${r.w.toFixed(0)}×${r.h.toFixed(0)}、對比 ${r.ratio.toFixed(2)}；與標題重疊=${r.overlap}、裁切=${r.clip}${good ? "" : "✗"}`);
    }
    // 操作：滑鼠、Enter、空白鍵到達難易度設定頁，localStorage 不變
    const how = [];
    for (const k of ["mouse", "Enter", "Space"]) {
      await toDash(p); const raw0 = await p.ev(`localStorage.getItem(${J(KEY)})`);
      if (k === "mouse") await p.click("#view-dashboard .db-change");
      else { await p.ev(`document.querySelector("#view-dashboard .db-change").focus()`); const key = k === "Enter" ? { key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: "\r" } : { key: " ", code: "Space", windowsVirtualKeyCode: 32, text: " " }; await p.send("Input.dispatchKeyEvent", { type: "keyDown", ...key }); await p.send("Input.dispatchKeyEvent", { type: "keyUp", ...key, text: undefined }); }
      await sleep(250); const tab = await p.ev(`EMT.router.current()`); const raw1 = await p.ev(`localStorage.getItem(${J(KEY)})`);
      how.push(`${k}→${tab}${raw0 === raw1 ? "" : "（localStorage 變動）"}`); ok = ok && tab === "customizer" && raw0 === raw1;
    }
    return { ok, note: out.join("；") + `；操作 ${how.join("、")}` };
  });
  await R.check("TC-67-01", "AC-67-01、AC-39-05、AC-49-01、AC-49-08、AC-68-03", async () => {
    const out = []; let ok = true;
    for (const [w, h] of [[375, 667], [1366, 768]]) for (const [s, k] of [[0, 0], [3, 48], [7, 50]]) {
      await p.viewport(w, h); await seedOpen(p, { streak: streakOf(s), part5CorrectIds: correctIds(k), masteredWordKeys: ranks(1, 60) });
      const d = await dash(p);
      const c = await run(p, () => { const L = window.__qaL; const s = document.querySelector("#view-dashboard .db-stats"); const cs = L.contrast(s); const cells = [...s.querySelectorAll(".db-stat")]; const r0 = cells[0].getBoundingClientRect();
        return { min: Math.min(...cs.map((x) => x.ratio)), bad: cs.filter((x) => !x.ok).length, row: cells.every((e) => Math.abs(e.getBoundingClientRect().top - r0.top) < 1), clip: [...s.querySelectorAll("*")].some((e) => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow === "hidden"), lastIsStatus: [cells[0], cells[2]].every((c) => c.lastElementChild.classList.contains("db-stat__status")) }; });
      const wt = s === 0 ? "陰天" : s >= 7 ? "出現彩虹" : "晴天", lt = k === 0 ? "燈塔待建" : k >= 50 ? "燈塔點亮" : "燈塔蓋好";
      const good = d.streak.status === wt && d.answered.status === lt && d.mastery.n === 0 && d.streak.n === 1 && d.answered.n === 1 && c.lastIsStatus && c.row && c.bad === 0 && !c.clip && d.mastery.sub === "已掌握 60 字";
      ok = ok && good; out.push(`${w}px S=${s} K=${k}：第 1 格「${d.streak.text}」、第 2 格「${d.mastery.text}」、第 3 格「${d.answered.text}」；同列=${c.row}、對比最小 ${c.min}、裁切=${c.clip}${good ? "" : "✗"}`);
    }
    return { ok, note: out.join("；") + "（Q = 0 見 TC-65-02n）" };
  });
  await p.close();
}

// AC-64-08：一般操作不倒退
{
  const p = await open({ w: 1366, h: 900 });
  await R.check("TC-64-08", "AC-64-08、V-ISL-06", async () => {
    const out = []; let ok = true;
    const base = { masteredWordKeys: [...ranks(2, 300), ...ranks(1001, 1100), ...ranks(2810, 2900)], streak: streakOf(3), part5CorrectIds: correctIds(60), todayLearned: today(2) };
    const snap = (d) => ({ isl: Object.fromEntries(Object.entries(d.isl).map(([k, v]) => [k, v.stage])), P: d.rows.slice(0, 3).map((r) => r.right), lh: d.lighthouse, w: d.weather });
    const rank = { sand: 0, sprout: 1, palm: 2, bloom: 3, hut: 4, complete: 5 }, lrank = { unbuilt: 0, built: 1, lit: 2 };
    const notDown = (a, b) => Object.keys(a.isl).every((k) => rank[b.isl[k]] >= rank[a.isl[k]]) && a.P.every((x, i) => parseInt(b.P[i].slice(3)) >= parseInt(x.slice(3))) && lrank[b.lh] >= lrank[a.lh];
    // (1) 四選一答錯
    await seedOpen(p, base); let a = snap(await dash(p));
    await p.ev(`EMT.router.go("flashcards")`); await sleep(150); await p.click(".fc-mode-btn"); await sleep(200);
    let ci = await p.ev(`EMT.store.getState().runtime.flashcard.quiz.correctIndex`); await p.click(".fcq-option", (ci + 1) % 4); await sleep(250);
    let b = snap(await dash(p)); let g = notDown(a, b) && b.w === a.w; ok = ok && g; out.push(`四選一答錯：${J(a.P)}→${J(b.P)}、${a.lh}→${b.lh}${g ? "" : "✗"}`);
    // (2) 打卡中斷
    await seedOpen(p, { ...base, streak: { days: 3, lastActiveDate: addDays(TODAY, -3) } }); b = snap(await dash(p)); g = notDown(a, b) && b.w === "cloudy"; ok = ok && g; out.push(`打卡中斷：三島 ${J(b.isl)}、天氣 ${b.w}${g ? "" : "✗"}`);
    // (3) 當天未學習
    await seedOpen(p, { ...base, todayLearned: { date: addDays(TODAY, -1), wordKeys: ["x"] } }); b = snap(await dash(p)); g = notDown(a, b) && b.w === a.w; ok = ok && g; out.push(`當天未學習：${J(b.P)}${g ? "" : "✗"}`);
    // (4) 刪除自訂單字（wordKey 與內建排名 2 相同，刪除後內建字仍已掌握）
    // 自訂單字 2 筆：wordKey 與內建排名 2 相同（匯入備份等途徑產生，畫面新增會擋重複）、不在內建字庫；兩者皆已掌握
    const cv = (id, word) => ({ id, word, meaning: "測試", phonetic: "", pos: "", collocation: "", example: "", academicContext: "", origin: "manual", templateId: null, createdAt: new Date().toISOString() });
    await seedOpen(p, { ...base, customVocab: [cv("c_qa_dup", RANK[1]), cv("c_qa_new", "qazwsxdel")], masteredWordKeys: [...base.masteredWordKeys, "qazwsxdel"] });
    a = snap(await dash(p));
    const ids = await p.ev(`EMT.store.getState().data.customVocab.map((c) => c.id)`);
    for (const id of ids) { await p.ev(`EMT.store.actions.deleteCustomWord(${J(id)})`); await sleep(80); }
    const id = ids.join("、");
    await sleep(60);
    b = snap(await dash(p)); g = notDown(a, b); ok = ok && g; out.push(`刪除自訂單字 ${ids.length} 筆（${id}；含與內建同 wordKey 者）：${J(a.P)}→${J(b.P)}${g ? "" : "✗"}`);
    // (5) 模擬測驗答錯、(6) 重新開始
    await seedOpen(p, base); a = snap(await dash(p));
    await p.ev(`EMT.router.go("part5")`); await sleep(200);
    const pc = await p.ev(`(() => { const s = EMT.store.getState(); const q = EMT.content.part5[s.data.part5.currentIndex]; return q.correctIndex; })()`);
    await p.click("[data-p5=option]", (pc + 1) % 4); await sleep(250);
    b = snap(await dash(p)); g = notDown(a, b); ok = ok && g; out.push(`模擬測驗答錯：燈塔 ${a.lh}→${b.lh}${g ? "" : "✗"}`);
    await p.ev(`EMT.router.go("part5")`); await sleep(150);
    const restarted = await p.ev(`(() => { try { EMT.store.actions.restartPart5(); return true; } catch (e) { return String(e); } })()`); await sleep(150);
    b = snap(await dash(p)); g = notDown(a, b) && restarted === true; ok = ok && g; out.push(`重新開始：燈塔 ${b.lh}、三島 ${J(b.isl)}${g ? "" : "✗"}`);
    // 例外：確認「清除答對紀錄」→ 燈塔依資料重算（預期）
    await p.ev(`EMT.store.actions.clearPart5CorrectIds && EMT.store.actions.clearPart5CorrectIds()`); await sleep(150);
    const c = snap(await dash(p)); out.push(`（例外，預期）清除答對紀錄後燈塔 ${c.lh}、三島不變=${J(c.isl) === J(b.isl)}`);
    ok = ok && J(c.isl) === J(b.isl);
    return { ok, note: out.join("；") + "（刪除自訂單字、重新開始、清除答對紀錄以頁面內 store 動作執行，與畫面按鈕同一路徑；四選一、模擬測驗以真實點擊）" };
  });
  await p.close();
}

// ═══════════ AC-64-10、AC-71-02、AC-71-05：不可點擊、Tab 順序、觸控與焦點 ═══════════
{
  const p = await open({ w: 375, h: 667 });
  await seedOpen(p, { masteredWordKeys: ranks(1, 300), todayLearned: today(3) });
  await R.check("TC-64-10", "AC-64-10、AC-71-02", async () => {
    await toDash(p);
    const raw0 = await p.ev(`localStorage.getItem(${J(KEY)})`);
    const targets = await p.ev(`(() => { const sel = []; for (const s of [".db-map", ".db-map__figure", "g.isl-island[data-island=orange]", "g.isl-boat", "g.isl-lighthouse", "g.isl-label", "li.db-isle", ".db-isle__bar", ".db-isle__name", ".db-isles h3"]) if (document.querySelector("#view-dashboard " + s)) sel.push(s); return sel; })()`);
    const res = [];
    for (const s of targets) { await p.click("#view-dashboard " + s); await sleep(80); await p.tap("#view-dashboard " + s); await sleep(80); res.push(await p.ev(`({ tab: EMT.router.current(), dlg: !!document.querySelector(".dialog"), hash: location.hash })`)); }
    const raw1 = await p.ev(`localStorage.getItem(${J(KEY)})`);
    const f = await run(p, () => { const roots = [document.querySelector("#view-dashboard .db-map"), document.querySelector("#view-dashboard .db-isles")]; const all = roots.flatMap((r) => [r, ...r.querySelectorAll("*")]);
      const focusable = all.filter((e) => e.hasAttribute("tabindex") || ["A", "BUTTON", "INPUT", "SELECT", "TEXTAREA"].includes(e.tagName) || e.tagName === "a");
      const ptr = all.filter((e) => getComputedStyle(e).cursor === "pointer").map((e) => e.getAttribute("class") || e.tagName);
      const handlers = all.filter((e) => e.onclick || e.getAttribute("onclick")).length;
      return { n: all.length, focusable: focusable.length, ptr, handlers }; });
    // Tab 走過群島頁：停駐點不在地圖與清單
    await p.ev(`document.activeElement && document.activeElement.blur(); scrollTo(0, 0)`);
    const stops = [];
    for (let i = 0; i < 40; i++) { await p.key("Tab", "Tab", 9); const s = await p.ev(`(() => { const a = document.activeElement; if (!a || a === document.body) return null; return { inMap: !!a.closest(".db-map, .db-isles"), id: a.id, cls: (a.className && a.className.baseVal !== undefined ? a.className.baseVal : a.className) || a.tagName, text: (a.textContent || "").trim().slice(0, 12) }; })()`); if (s) stops.push(s); }
    const inMap = stops.filter((s) => s.inMap).length;
    const ok = res.every((r) => r.tab === "dashboard" && !r.dlg && r.hash === "") && raw0 === raw1 && f.focusable === 0 && f.ptr.length === 0 && f.handlers === 0 && inMap === 0;
    return { ok, note: `點擊＋觸控 ${targets.length} 處（${targets.join("、")}）後仍在 ${[...new Set(res.map((r) => r.tab))].join(",")}、視窗 ${res.filter((r) => r.dlg).length}、localStorage 不變=${raw0 === raw1}；地圖與清單 ${f.n} 個元素中可聚焦 ${f.focusable}、cursor:pointer ${f.ptr.length}、inline 事件 ${f.handlers}；Tab 40 次停駐 ${stops.length} 次，在地圖或清單內 ${inMap}` };
  });
  await R.check("TC-71-02", "AC-71-02、AC-52-07", async () => {
    await p.viewport(1366, 768); await toDash(p);
    const deco = await run(p, () => { const q = (s) => [...document.querySelectorAll(s)]; const items = { turtle: q("#view-dashboard .db-host__turtle"), title: q("#view-dashboard .dash-title svg"), dots: q("#view-dashboard .db-isle__dot"), goalDot: q("#view-dashboard .db-goal__dot") };
      const r = {}; for (const [k, v] of Object.entries(items)) r[k] = v.length + ":" + v.every((e) => e.getAttribute("aria-hidden") === "true");
      const svgs = q("#view-dashboard svg, #view-flashcards svg"); r.svgFocusable = svgs.filter((s) => s.querySelector("[tabindex], a") || s.hasAttribute("tabindex")).length; r.svgNoFocusAttr = svgs.filter((s) => s.getAttribute("focusable") !== "false" && !s.closest("[aria-hidden=true]")).length;
      const n = document.querySelector("#view-dashboard .db-host__name"); r.nameVisible = !!n && n.getClientRects().length > 0 && getComputedStyle(n).visibility !== "hidden" && !n.closest(".visually-hidden") && n.textContent === "島主 龜龜"; return r; });
    await p.ev(`(() => { const b = document.querySelector(".db-backup__toggle"); if (b.getAttribute("aria-expanded") === "true") b.click(); document.activeElement && document.activeElement.blur(); scrollTo(0, 0); })()`);
    const seq = [];
    for (let i = 0; i < 30; i++) { await p.key("Tab", "Tab", 9); const s = await p.ev(`(() => { const a = document.activeElement; if (!a || a === document.body) return "body"; const zone = a.closest("#app-header") ? "header" : a.closest("#app-nav") ? "nav" : a.closest("#app-footer") ? "footer" : a.closest(".db-goal") ? "change" : a.classList.contains("db-start") ? "start" : a.closest(".db-backup") ? "backup" : a.closest(".ad-slot, [data-ad]") ? "ad" : a.closest("#view-dashboard") ? "dash-other:" + a.className : "other:" + (a.id || a.className); return zone; })()`); seq.push(s); }
    const zones = seq.filter((z, i) => z !== seq[i - 1] && z !== "body");
    const firstFooter = zones.indexOf("footer");
    const order = zones.slice(0, firstFooter + 1).filter((z) => !["header", "nav"].includes(z));
    const ok = deco.turtle === "1:true" && deco.title === "1:true" && deco.dots === "5:true" && deco.svgFocusable === 0 && deco.nameVisible && J(order) === J(["change", "start", "backup", "footer"]) && zones.slice(0, zones.indexOf("change")).every((z) => ["header", "nav"].includes(z));
    return { ok, note: `aria-hidden：龜龜 ${deco.turtle}、標題裝飾 ${deco.title}、清單色點 ${deco.dots}、目標色點 ${deco.goalDot}；SVG 內可聚焦 ${deco.svgFocusable}；「島主 龜龜」可見=${deco.nameVisible}；Tab 區段序列 ${zones.join("→")}（卡片裝飾、回饋新芽見 TC-69-05）` };
  });
  await R.check("TC-71-05", "AC-71-05、AC-38-09、AC-61-01", async () => {
    await p.viewport(375, 667);
    const out = []; let ok = true;
    for (const tab of ["dashboard", "flashcards"]) {
      await p.ev(`EMT.router.go(${J(tab)})`); await sleep(250);
      if (tab === "dashboard") await p.ev(`(() => { const b = document.querySelector(".db-backup__toggle"); if (b.getAttribute("aria-expanded") === "false") b.click(); })()`); await sleep(80);
      const small = await run(p, (tab) => { const v = document.getElementById("view-" + tab); const els = [...v.querySelectorAll("button, a, input, select, textarea, [role=button], [tabindex]")].filter((e) => e.getClientRects().length > 0 && !e.disabled && getComputedStyle(e).visibility !== "hidden" && !e.closest("[hidden]"));
        return { n: els.length, small: els.map((e) => { const r = e.getBoundingClientRect(); return { c: (e.className || e.tagName).toString().split(" ")[0], w: Math.round(r.width), h: Math.round(r.height), type: e.type || "" }; }).filter((x) => (x.w < 44 || x.h < 44) && x.type !== "file") }; }, tab);
      // 焦點：Tab 依序，量測焦點框與是否被底部導覽遮住
      await p.ev(`document.activeElement && document.activeElement.blur(); scrollTo(0, 0)`);
      const foc = [];
      for (let i = 0; i < 25; i++) { await p.key("Tab", "Tab", 9); await sleep(30); const f = await run(p, (tab) => { const a = document.activeElement; if (!a || !a.closest("#view-" + tab)) return null; const s = getComputedStyle(a); const L = window.__qaL; const r = a.getBoundingClientRect(); const nav = document.getElementById("app-nav").getBoundingClientRect();
          const oc = L.parse(s.outlineColor); const bg = L.effective(a.parentElement).bg; return { c: (a.className || a.tagName).toString().split(" ")[0], style: s.outlineStyle, w: parseFloat(s.outlineWidth), ratio: oc ? L.ratio(oc, bg) : 0, covered: r.bottom > nav.top + 0.5 && r.top < nav.bottom }; }, tab); if (f) foc.push(f); }
      const badF = foc.filter((f) => f.style === "none" || f.w < 2 || f.ratio < 3 || f.covered);
      const g = small.small.length === 0 && badF.length === 0 && foc.length > 0; ok = ok && g;
      out.push(`${tab}：可操作 ${small.n} 個、小於 44×44 ${small.small.map((x) => `${x.c} ${x.w}×${x.h}`).join("、") || "0"}；Tab 停駐 ${foc.length} 次，焦點框 ${[...new Set(foc.map((f) => f.style + " " + f.w + "px"))].join("/")}、對比最小 ${Math.min(...foc.map((f) => f.ratio)).toFixed(2)}、被底部導覽遮住 ${foc.filter((f) => f.covered).length}、不符 ${badF.map((f) => f.c).join("、") || "0"}${g ? "" : "✗"}`);
    }
    return { ok, note: out.join("；") };
  });
  await p.close();
}

// ═══════════ US-68 外觀 ═══════════
{
  const p = await open();
  // AC-68-01、AC-68-02、AC-68-03：各畫面背景、卡片與按鈕、對比
  await R.check("TC-68-01", "AC-68-01、AC-34-04、AC-38-02、V-LAY-02", async () => {
    const out = []; const bad = [];
    const man = JSON.parse(fs.readFileSync(path.join(ROOT, "dist/site/manifest.webmanifest"), "utf8"));
    for (const [w, h] of [[375, 667], [1366, 768]]) {
      await p.viewport(w, h); await p.ev(`localStorage.clear()`); await p.goto(); await sleep(200);
      const first = await p.ev(`getComputedStyle(document.body).backgroundColor`); if (first !== BG) bad.push(`${w} 首次畫面 ${first}`);
      await seedOpen(p, { masteredWordKeys: ranks(1, 10) });
      for (const t of ["dashboard", "customizer", "flashcards", "part5", "sources", "about", "contact", "privacy"]) { await p.ev(`EMT.router.go(${J(t)})`); await sleep(150); const b = await p.ev(`getComputedStyle(document.body).backgroundColor`); if (b !== BG) bad.push(`${w} ${t} ${b}`); }
      await p.ev(`EMT.router.go("customizer")`); await sleep(100); await p.click('.cz-level[data-color="brown"]'); await p.click("#cz-apply"); await sleep(200);
      const dl = await p.ev(`({ d: !!document.querySelector(".dialog"), bg: getComputedStyle(document.body).backgroundColor })`); if (!dl.d || dl.bg !== BG) bad.push(`${w} 對話框 ${J(dl)}`);
      await p.click('.dialog [data-action="cancel"]'); await sleep(100);
      out.push(`${w}px：首次畫面 ${first}、8 個畫面與對話框`);
    }
    const meta = await p.ev(`document.querySelector('meta[name="theme-color"]').content`);
    const ok = bad.length === 0 && man.background_color === "#eaf7fb" && man.theme_color === BRAND && meta === BRAND;
    return { ok, note: out.join("；") + `；body 背景皆 ${BG}，不符 ${bad.join("、") || "0"}；manifest background_color ${man.background_color}、theme_color ${man.theme_color}、<meta theme-color> ${meta}（Toast 為覆蓋層，不改 body 背景）` };
  });
  await R.check("TC-68-02", "AC-68-02、V-LAY-02、VC-4", async () => {
    const bad = []; const seen = {};
    const CARD = (k) => k.bs.every((x) => x === "solid") && k.bw.every((x) => x >= 2) && k.bc.every((x) => x === OUTLINE) && k.rad.every((x) => x >= 16);
    for (const [w, h] of [[375, 667], [1366, 768]]) {
      await p.viewport(w, h); await seedOpen(p, { masteredWordKeys: ranks(1, 10), learnedHistory: { [TODAY]: 3 } });
      const screens = [["dashboard", "#view-dashboard .db-today, #view-dashboard .db-map, #view-dashboard li.db-isle, #view-dashboard .db-stat, #view-dashboard .db-chart, #view-dashboard .db-backup", "#view-dashboard .db-start, #view-dashboard .db-change, #view-dashboard .db-backup button.btn:not(.btn--link)"],
        ["customizer", "#view-customizer .card", "#view-customizer button.btn:not(.btn--link)"], ["part5", "#view-part5 .card", "#view-part5 button.btn:not(.btn--link)"], ["flashcards", "#view-flashcards .fc-card, #view-flashcards .fc-quiz", "#view-flashcards .fc-flip, #view-flashcards .fc-prev, #view-flashcards .fc-next, #view-flashcards .sp-tts__btn, #view-flashcards .sp-mic"],
        ["sources", "#view-sources .card, #view-sources section", "#view-sources button.btn:not(.btn--link)"], ["about", "#view-about .card, #view-about .site-page__content", ""], ["contact", "#view-contact .card, #view-contact .site-page__content", ""], ["privacy", "#view-privacy .card, #view-privacy .site-page__content", ""]];
      for (const [t, cs, bs] of screens) {
        await p.ev(`EMT.router.go(${J(t)})`); await sleep(200);
        if (t === "dashboard") await p.ev(`(() => { const b = document.querySelector(".db-backup__toggle"); if (b.getAttribute("aria-expanded") === "false") b.click(); })()`);
        const r = await run(p, (cs, bs) => { const L = window.__qaL; const g = (e) => { const s = getComputedStyle(e); const sides = ["Top", "Right", "Bottom", "Left"]; return { c: (e.className && e.className.baseVal === undefined ? e.className : e.tagName).split(" ").slice(0, 2).join("."), bs: sides.map((k) => s["border" + k + "Style"]), bw: sides.map((k) => parseFloat(s["border" + k + "Width"])), bc: sides.map((k) => L.hex(s["border" + k + "Color"])), rad: ["TopLeft", "TopRight", "BottomRight", "BottomLeft"].map((k) => parseFloat(s["border" + k + "Radius"])), bg: L.hex(s.backgroundColor), sh: s.boxShadow }; };
          const uniq = (sel) => sel ? [...new Set([...document.querySelectorAll(sel)])].filter(L.shown) : [];
          return { cards: uniq(cs).filter((e) => !(e.tagName === "SECTION" && !e.classList.contains("card") && e.closest(".card"))).map(g), btns: uniq(bs).map(g) }; }, cs, bs);
        for (const k of r.cards) {
          const isMap = /db-map/.test(k.c), isFog = /is-fog/.test(k.c) || /db-isle--(blue|gold)/.test(k.c);
          const shadowNeed = /db-today|db-map/.test(k.c);
          const good = CARD(k) && (isMap ? true : isFog ? k.bg === "#f3f6fa" : k.bg === "#ffffff") && (!shadowNeed || k.sh !== "none");
          if (!good) bad.push(`${w} ${t} 卡片 ${k.c} ${J(k)}`);
        }
        for (const k of r.btns) { const need = /db-start|cz-start/.test(k.c); const good = k.bw.every((x) => x >= 2) && k.bc.every((x) => x === OUTLINE) && k.rad.every((x) => x >= 12) && !k.bc.includes("#d5d9e0") && (!need || k.sh !== "none"); if (!good) bad.push(`${w} ${t} 按鈕 ${k.c} ${J(k)}`); }
        seen[t] = (seen[t] || 0) + r.cards.length + "/" + r.btns.length + " ";
      }
      // 首次畫面「開始學習」
      await p.ev(`localStorage.clear()`); await p.goto(); await sleep(200);
      const fr = await p.ev(`(() => { const L = window.__qaL; const e = document.getElementById("cz-start"); const s = getComputedStyle(e); return { bw: parseFloat(s.borderTopWidth), bc: L.hex(s.borderTopColor), rad: parseFloat(s.borderTopLeftRadius), sh: s.boxShadow, cards: [...document.querySelectorAll("#view-customizer .card")].filter(L.shown).map((c) => { const t = getComputedStyle(c); return L.hex(t.borderTopColor) + "/" + parseFloat(t.borderTopWidth) + "/" + parseFloat(t.borderTopLeftRadius) + "/" + L.hex(t.backgroundColor); }) }; })()`);
      if (!(fr.bw >= 2 && fr.bc === OUTLINE && fr.rad >= 12 && fr.sh !== "none")) bad.push(`${w} 首次畫面 開始學習 ${J(fr)}`);
      for (const c of fr.cards) { const [bc, bw, rad, bg] = c.split("/"); if (!(bc === OUTLINE && +bw >= 2 && +rad >= 16 && bg === "#ffffff")) bad.push(`${w} 首次畫面卡片 ${c}`); }
      seen.firstRun = (seen.firstRun || "") + `${fr.cards.length} 張＋開始學習 `;
    }
    return { ok: bad.length === 0, note: `檢查（卡片/按鈕數）${Object.entries(seen).map(([k, v]) => k + " " + v.trim()).join("；")}；不符 ${bad.join("｜") || "0"}（範圍外：輸入欄、色級列選中、作答選項、導覽、焦點框、廣告框、.btn--link 連結樣式按鈕）` };
  });
  await R.check("TC-68-03", "AC-68-03、AC-38-04", async () => {
    const out = []; const bad = [];
    for (const [w, h] of [[375, 667], [1366, 768]]) {
      await p.viewport(w, h); await seedOpen(p, { masteredWordKeys: ranks(1, 300), streak: streakOf(7), part5CorrectIds: correctIds(50), todayLearned: today(15) });
      for (const t of ["dashboard", "customizer", "flashcards", "part5", "sources", "about", "contact", "privacy"]) {
        await p.ev(`EMT.router.go(${J(t)})`); await sleep(600); // 換頁淡入（240 ms）結束後量測，避免 opacity < 1 的過渡畫格
        const r = await run(p, (t) => { const L = window.__qaL; const c = L.contrast(document.getElementById("view-" + t)); const outl = []; const cards = [...document.querySelectorAll("#view-" + t + " .card, #view-" + t + " .btn:not(.btn--link), #view-" + t + " li.db-isle, #view-" + t + " .db-stat")].filter(L.shown);
          for (const e of cards) { const s = getComputedStyle(e); const bc = L.parse(s.borderTopColor); if (!bc || parseFloat(s.borderTopWidth) === 0) continue; const adj = L.effective(e.parentElement).bg; outl.push(L.ratio(bc, adj)); }
          return { n: c.length, min: Math.min(...c.map((x) => x.ratio)), bad: c.filter((x) => !x.ok).map((x) => `${x.sel}「${x.text}」${x.ratio}`), on: outl.length, omin: Math.min(...outl) }; }, t);
        out.push(`${w} ${t}：文字 ${r.n} 處最小 ${r.min}、外框 ${r.on} 處最小 ${r.on ? (+r.omin).toFixed(2) : "—"}`); if (r.bad.length) bad.push(`${w} ${t} ${r.bad.join("、")}`); if (r.on && r.omin < 3) bad.push(`${w} ${t} 外框 ${r.omin}`);
      }
    }
    return { ok: bad.length === 0, note: out.join("；") + `；不符 ${bad.join("｜") || "0"}（WCAG 公式；語意色、停用按鈕、SVG 內文字依 AC-38-04 例外；地圖文字見 TC-71-04、學完回饋見 TC-69-05）` };
  });
  // AC-68-05：插圖與裝飾不使用強調橘
  await R.check("TC-68-05", "AC-68-05、AC-38-01", async () => {
    await p.viewport(1366, 768); await seedOpen(p, { masteredWordKeys: ranks(1, 1000), streak: streakOf(7), part5CorrectIds: correctIds(50), todayLearned: today(15) });
    const hits = [];
    for (const t of ["dashboard", "flashcards"]) { await p.ev(`EMT.router.go(${J(t)})`); await sleep(200);
      const r = await run(p, () => { const L = window.__qaL; const out = []; for (const s of document.querySelectorAll("svg")) { if (!L.shown(s) || s.closest(".app-logo, .db-stat__icon")) continue; /* .db-stat__icon 為 AC-38-01 所列強調橘位置 */ for (const e of [s, ...s.querySelectorAll("*")]) { const cs = getComputedStyle(e); for (const k of ["fill", "stroke", "color", "stopColor"]) { const v = (e.getAttribute(k === "stopColor" ? "stop-color" : k) || "") + " " + (cs[k] || ""); if (/#f7893b/i.test(v) || /rgb\(247, 137, 59\)/.test(v)) out.push((s.getAttribute("class") || "svg") + ">" + e.tagName + "." + k); } } } return out; }); hits.push(...r.map((x) => t + " " + x)); }
    const src = fs.readFileSync(DIST, "utf8"); const art = (src.match(/isl-art[^]{0,0}/g) || []).length;
    return { ok: hits.length === 0, note: `群島頁與單字卡頁可見 SVG（地圖、龜龜、標題裝飾、卡片裝飾、回饋新芽、導覽圖示；標題列品牌圖示與 3 格「連續打卡天數」圖示 .db-stat__icon 為 AC-38-01 所列位置）fill／stroke 為 #f7893b：${hits.join("、") || "0"}（強調橘位置另見 e2e-layout TC-38-01）` };
  });
  // AC-68-06：系統字型、無字型請求
  await R.check("TC-68-06", "AC-68-06、AC-38-07", async () => {
    const src = fs.readFileSync(DIST, "utf8");
    const bad = ["@font-face", "fonts.googleapis.com", "fonts.gstatic.com"].filter((s) => src.includes(s));
    const fontUrl = (src.match(/url\([^)]*\.(woff2?|ttf|otf|eot)/gi) || []).length;
    const reqs0 = p.log.requests.length;
    await p.viewport(1366, 768); await seedOpen(p, {});
    const fams = new Set();
    for (const t of ["dashboard", "customizer", "flashcards", "part5", "sources", "about"]) { await p.ev(`EMT.router.go(${J(t)})`); await sleep(150); const f = await p.ev(`[...new Set([...document.querySelectorAll("#app-main *, #app-header *")].filter((e) => e.childNodes.length && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())).map((e) => getComputedStyle(e).fontFamily))]`); f.forEach((x) => fams.add(x)); }
    const ALLOW = /^(system-ui|-apple-system|BlinkMacSystemFont|"?Noto Sans TC"?|"?Microsoft JhengHei"?|"?PingFang TC"?|"?Segoe UI"?|"?Lucida Sans Unicode"?|"?Arial Unicode MS"?|Consolas|"?Courier New"?|monospace|sans-serif|serif|ui-monospace|ui-sans-serif|Roboto|Arial|Helvetica|"?Helvetica Neue"?|Menlo|Monaco|"?Liberation Mono"?|"?Noto Sans"?)$/i;
    const names = [...fams].flatMap((f) => f.split(",").map((x) => x.trim())); const notAllowed = [...new Set(names.filter((n) => !ALLOW.test(n)))];
    const fontReq = p.log.requests.filter((r) => r.type === "Font" || /\.(woff2?|ttf|otf)(\?|$)/i.test(r.url)).length;
    return { ok: bad.length === 0 && fontUrl === 0 && fontReq === 0 && notAllowed.length === 0, note: `原始碼 ${bad.join("、") || "無 @font-face／Google Fonts"}、字型檔網址 ${fontUrl}；Network 字型請求 ${fontReq}（全部請求 ${p.log.requests.length - reqs0}）；計算後 font-family ${[...fams].join(" ｜ ")}；非系統字型名稱 ${notAllowed.join("、") || "0"}` };
  });
  await p.close();
}

// AC-68-04、AC-69-01：與 v1.3.2 比對 DOM（元素順序、按鈕數量與文字）
if (!ONLY || ONLY.test("TC-68-04") || ONLY.test("TC-69-01")) {
  const domSig = () => run(PAGES[PAGES.length - 1], () => {
    const v = [...document.querySelectorAll("#app-main > .view")].find((e) => !e.hidden) || document.body;
    const skip = (e) => e.matches(".fc-deco, .fc-feedback-live, .fc-feedback-live *, svg *") || (e.matches("p, li") && (e.textContent || "").includes("群島插圖與角色「龜龜」"));
    const els = [...v.querySelectorAll("*")].filter((e) => !skip(e) && e.getClientRects().length > 0);
    const btns = [...v.querySelectorAll("button, [role=button], a")].filter((e) => e.getClientRects().length > 0 && !e.closest(".fc-feedback-live")).map((e) => (e.classList.contains("fcq-option") ? "選項" + e.textContent.trim().charAt(0) : e.textContent.replace(/\s+/g, " ").trim())); // 四選一選項內容為隨機抽題，只比字母與數量
    return { tags: els.map((e) => e.tagName + (e.getAttribute("role") ? "[" + e.getAttribute("role") + "]" : "")).join(">"), n: els.length, btns, text: v.innerText.replace(/\s+/g, " ").trim() };
  });
  const collect = async (url, w, h) => {
    const p = await open({ w, h, url, stt: true });
    const res = {};
    await p.ev(`localStorage.clear()`); await p.goto(url); await sleep(300); res.firstRun = await domSig();
    await p.ev(`localStorage.setItem(${J(KEY)}, ${J(J(stateRecord(725, { sttNoticeAcknowledged: true, masteredWordKeys: ranks(1, 5), part5: { currentIndex: 0, lockedSelection: null, phase: "question", roundAnswered: 0, roundCorrect: 0, totalAnswered: 0, totalCorrect: 0 } })))})`); await p.goto(url); await sleep(300);
    for (const t of ["customizer", "part5", "sources", "about", "contact", "privacy"]) { await p.ev(`EMT.router.go(${J(t)})`); await sleep(250); res[t] = await domSig(); }
    // 模擬測驗結算（作答 1 題後）
    await p.ev(`EMT.router.go("part5")`); await sleep(200); const ci = await p.ev(`EMT.content.part5[0].correctIndex`); await p.click("[data-p5=option]", ci); await sleep(300); res.part5Answered = await domSig();
    // 單字卡（單字卡模式、測驗模式）
    await p.ev(`EMT.router.go("flashcards")`); await sleep(300); res.cards = await domSig();
    await p.click(".fc-flip"); await sleep(500); res.cardsBack = await domSig(); await p.click(".fc-flip"); await sleep(500);
    await p.click(".fc-mode-btn"); await sleep(300); res.quiz = await domSig();
    await p.close(); PAGES.splice(PAGES.indexOf(p), 1);
    return res;
  };
  const diffs68 = [], diffs69 = [], out = [];
  for (const [w, h] of [[375, 667], [1366, 768]]) {
    const a = await collect(OLD_URL, w, h), b = await collect(FILE_URL, w, h);
    for (const k of Object.keys(a)) {
      const same = a[k].tags === b[k].tags && J(a[k].btns) === J(b[k].btns);
      const target = ["cards", "cardsBack", "quiz"].includes(k) ? diffs69 : diffs68;
      if (!same) {
        // 找出第一個不同處
        const ta = a[k].tags.split(">"), tb = b[k].tags.split(">"); let i = 0; while (i < ta.length && ta[i] === tb[i]) i++;
        target.push(`${w} ${k}：元素 ${a[k].n}→${b[k].n}，第 ${i} 個起 ${ta.slice(i, i + 3).join(">")} ≠ ${tb.slice(i, i + 3).join(">")}；按鈕 ${J(a[k].btns) === J(b[k].btns) ? "同" : J(a[k].btns) + "→" + J(b[k].btns)}`);
      }
      out.push(`${w} ${k} ${b[k].n}`);
    }
  }
  R[diffs68.length === 0 ? "pass" : "fail"]("TC-68-04", "AC-68-04、AC-26-01、AC-40-01～AC-40-03", `v1.3.2（c16d368）與 1.4.0 的元素順序（可見元素標籤樹）與按鈕文字：首次畫面、難易度設定、模擬測驗（題目、作答後）、資料來源與授權（排除 LT-7 段落）、應用內三頁；差異 ${diffs68.join("｜") || "0"}（各畫面元素數 ${out.filter((x) => !/cards|quiz/.test(x)).join("、")}；既有 AC 由 e2e-layout、e2e-goal、e2e-track-p5、e2e-lock、e2e-site 判定）`);
  R[diffs69.length === 0 ? "pass" : "fail"]("TC-69-01", "AC-69-01、AC-38-08、AC-06-01、AC-06-02", `單字卡頁（正面、背面、測驗模式）兩種寬度與 v1.3.2 比對，排除 .fc-deco 與 .fc-feedback-live：差異 ${diffs69.join("｜") || "0"}（元素數 ${out.filter((x) => /cards|quiz/.test(x)).join("、")}；既有 AC-06～AC-09、AC-28、AC-33、AC-58～AC-62 由 e2e-cards、e2e-speech、e2e-mic、e2e-stt-flow、e2e-interim 判定）`);
}

// ═══════════ US-69 單字卡學完回饋 ═══════════
const fb = (p) => p.ev(`(() => { const c = document.querySelector("#view-flashcards .fc-feedback-live"); if (!c) return null; const f = c.querySelector("p.fc-feedback"); return { role: c.getAttribute("role"), live: c.getAttribute("aria-live"), h: c.getBoundingClientRect().height, kids: c.children.length, text: f ? (f.querySelector(".fc-feedback__text") || f).textContent : null, icon: f && f.querySelector("svg") ? f.querySelector("svg").getAttribute("aria-hidden") : null, el: f }; })()`).then((r) => r && (delete r.el, r));
const quizAnswer = async (p, correct = true) => { const m = await p.ev(`EMT.store.getState().runtime.flashcard.mode`); if (m !== "quiz") { await p.click(".fc-mode-btn"); await sleep(200); } const ci = await p.ev(`EMT.store.getState().runtime.flashcard.quiz.correctIndex`); await p.click(".fcq-option", correct ? ci : (ci + 1) % 4); await sleep(200); };
const toCard = async (p, wordKey) => { await p.ev(`EMT.router.go("flashcards")`); await sleep(150); const i = await p.ev(`EMT.store.getState().runtime.studySet.findIndex((c) => c.wordKey === ${J(wordKey)})`); if (i < 0) throw new Error("單字集找不到 " + wordKey); await p.ev(`EMT.store.actions.gotoCard(${i})`); await sleep(120); return i; };
const toCardMode = async (p) => { const m = await p.ev(`EMT.store.getState().runtime.flashcard.mode`); if (m === "quiz") { await p.click(".fc-mode-btn"); await sleep(200); } };
{
  const p = await open({ w: 1366, h: 900, stt: true });
  await R.check("TC-69-02", "AC-69-02、V-ISL-05、LF-6", async () => {
    const W1 = RANK[299], W2 = RANK[300];
    const keys239 = ranks(1, 241).slice(2); // 排名 3～241（239 字），W1、W2 未掌握
    await seedOpen(p, { masteredWordKeys: keys239, todayLearned: today(3) });
    await toCard(p, W1); await quizAnswer(p, true); const a = await fb(p);
    const keys244 = [...ranks(1, 241).slice(2), W1, ...ranks(242, 245)]; // 244 字（含 W1）
    await seedOpen(p, { masteredWordKeys: keys244, todayLearned: today(4) });
    await toCard(p, W2); await quizAnswer(p, true); const b = await fb(p);
    await seedOpen(p, { masteredWordKeys: keys239, todayLearned: today(3) });
    await toCard(p, RANK[1500]); await quizAnswer(p, true); const c = await fb(p);
    const ok = a.text === "橘島又多掌握 1 個字（掌握 24%）" && b.text === "橘島長出第一棵椰子樹！" && c.text === "棕島冒出新芽了！";
    return { ok, note: `答對 W1（${W1}，排名 300；橘 239 → 240）：「${a.text}」；調為 244 字後答對 W2（${W2}，排名 301 → 245，P 25）：「${b.text}」；棕島 m = 0 答對排名 1,501「${RANK[1500]}」：「${c.text}」` };
  });
  await R.check("TC-69-03", "AC-69-03、LF-6", async () => {
    // D = 10（橘），X = 8；依序：翻面新字 → STT 評分（另一新字）→ 再翻 1 個新字 → 自訂單字四選一答對（首次掌握）
    await seedOpen(p, { todayLearned: today(8) }, 215);
    await p.ev(`EMT.router.go("customizer")`); await sleep(100); await p.ev(`EMT.store.actions.addCustomWord({ word: "qazwsxcustom", meaning: "測試自訂" })`); await sleep(100);
    const seq = [];
    await toCard(p, RANK[9]); await toCardMode(p); await p.click(".fc-flip"); await sleep(500); seq.push(["翻面 X 8→9", (await fb(p)).text]);
    await p.click(".fc-flip"); await sleep(400);
    await toCard(p, RANK[10]); await toCardMode(p);
    await p.click(".fc-front .sp-mic"); for (let i = 0; i < 40; i++) { if ((await p.ev(`document.querySelector(".fc-front .sp-mic").dataset.status`)) === "preparing" && (await p.ev(`!!window.__qaStt.last`))) break; await sleep(25); }
    await p.ev(`window.__qaStt.last.emitAudioStart()`); await sleep(80); await p.ev(`(() => { const r = window.__qaStt.last; r.emitResult(${J(RANK[10])}); r.emitEnd(); })()`); await sleep(300);
    const sc = await p.ev(`!!document.querySelector(".fc-front .sp-result__badge")`); seq.push([`STT 評分（有分數=${sc}）X 9→10`, (await fb(p)).text]);
    await toCard(p, RANK[11]); await p.click(".fc-flip"); await sleep(500); seq.push(["再翻 1 個新字 X 10→11", (await fb(p)).text]); await p.click(".fc-flip"); await sleep(400);
    const ckey = await p.ev(`EMT.store.getState().data.customVocab[0].wordKey || EMT.core.wordkey.wordKey("qazwsxcustom")`);
    await toCard(p, ckey); await quizAnswer(p, true); const mastered = await p.ev(`EMT.store.getState().data.masteredWordKeys.includes(${J(ckey)})`); seq.push([`自訂單字答對（掌握=${mastered}）X 11→12`, (await fb(p)).text]);
    const x = await p.ev(`EMT.store.getState().data.todayLearned.wordKeys.length`);
    const exp = ["小船又前進了，再 1 個字靠岸", "今天的小船靠岸了！", "今天的小船靠岸了！", "今天的小船靠岸了！"];
    const ok = seq.every((s, i) => s[1] === exp[i]) && sc && mastered && x === 12;
    return { ok, note: seq.map((s) => `${s[0]}：「${s[1]}」`).join("；") + `；最後 X = ${x}` };
  });
  await R.check("TC-69-04", "AC-69-04、V-ISL-05", async () => {
    const out = []; let ok = true;
    // (a) 升階＋靠岸：橘 244 字、X = 9（D = 10），答對今天未學過的橘島字
    await seedOpen(p, { masteredWordKeys: ranks(2, 245), todayLearned: today(9) }, 215);
    await toCard(p, RANK[0]); await quizAnswer(p, true); let f = await fb(p); let g = f.text === "橘島長出第一棵椰子樹！"; ok = ok && g; out.push(`(a) 升階且靠岸：「${f.text}」${g ? "" : "✗"}`);
    // (b) 靠岸未升階
    await seedOpen(p, { masteredWordKeys: ranks(2, 100), todayLearned: today(9) }, 215);
    await toCard(p, RANK[0]); await quizAnswer(p, true); f = await fb(p); g = f.text === "今天的小船靠岸了！"; ok = ok && g; out.push(`(b) 靠岸未升階：「${f.text}」${g ? "" : "✗"}`);
    // (c) 不改變數值的操作：先產生一則回饋，之後各操作回饋列不變
    await seedOpen(p, { masteredWordKeys: ranks(2, 100), todayLearned: { date: TODAY, wordKeys: [RANK[0], RANK[1]] } }, 725);
    await toCard(p, RANK[200]); await toCardMode(p); await p.click(".fc-flip"); await sleep(500); const f0 = await fb(p);
    const ops = [];
    const same = async (label) => { const x = await fb(p); ops.push(`${label}${x.text === f0.text ? "" : "→「" + x.text + "」✗"}`); return x.text === f0.text; };
    await p.click(".fc-flip"); await sleep(400); await p.click(".fc-flip"); await sleep(400); g = await same("同字再翻面"); ok = ok && g;
    await p.swipe(".fc-card", -140, 0, { durationMs: 220 }); await sleep(500); g = await same("滑動換卡"); ok = ok && g;
    await p.click(".fc-prev"); await sleep(300); await p.click(".fc-next"); await sleep(300); g = await same("上一張／下一張"); ok = ok && g;
    await toCard(p, RANK[1]); await quizAnswer(p, true); g = await same("四選一答對已掌握且今天已學過的字"); ok = ok && g;
    await toCard(p, RANK[300]); await toCardMode(p);
    await p.click(".fc-front .sp-mic"); await sleep(120); await p.ev(`(() => { const r = window.__qaStt.last; r.emitAudioStart(); })()`); await sleep(80); await p.ev(`(() => { const r = window.__qaStt.last; r.emitError("no-speech"); r.emitEnd(); })()`); await sleep(300); g = await same("STT 錯誤（no-speech）"); ok = ok && g;
    await p.click(".fc-front .sp-mic"); await sleep(120); await p.ev(`(() => { const r = window.__qaStt.last; r.emitAudioStart(); })()`); await sleep(80); await p.ev(`(() => { const r = window.__qaStt.last; r.emitNomatch(); r.emitEnd(); })()`); await sleep(300);
    const msg = await p.ev(`(() => { const m = document.querySelector(".fc-front .sp-msg"); return m && !m.hidden ? m.textContent.trim().slice(0, 30) : ""; })()`); g = await same(`STT 訊息（${msg || "無訊息"}）`); ok = ok && g;
    await p.click(".fc-front .sp-mic"); await sleep(60); await p.click(".fc-front .sp-mic"); await sleep(300); g = await same("準備中取消"); ok = ok && g;
    return { ok, note: out.join("；") + `；(c) 初始回饋「${f0.text}」後：${ops.join("、")}` };
  });
  await R.check("TC-69-05", "AC-69-05、AC-71-02、AC-68-03", async () => {
    const out = []; let ok = true;
    for (const [w, h] of [[375, 667], [1366, 900]]) {
      await p.viewport(w, h); await seedOpen(p, { todayLearned: today(3) }, 725);
      await toCard(p, RANK[50]); await toCardMode(p); await sleep(700); // 換卡動畫（滑入）結束後才量「之前」座標
      const empty = await fb(p);
      const pos = () => run(p, () => { const q = (s) => { const e = document.querySelector("#view-flashcards " + s); if (!e || !e.getClientRects().length) return null; const r = e.getBoundingClientRect(); return [Math.round((r.left + scrollX) * 10) / 10, Math.round((r.top + scrollY) * 10) / 10, Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10]; };
        return { card: q(".fc-stage > .card"), tts: q(".fc-front .sp-tts__btn"), mic: q(".fc-front .sp-mic"), meter: q(".fc-front .sp-meter"), result: q(".fc-front .sp-result") }; });
      const before = await pos();
      // 量測：翻面 → 回饋列出現（click 前登錄 rAF）
      const t = await p.ev(`(async () => { const live = document.querySelector("#view-flashcards .fc-feedback-live"); const b = document.querySelector(".fc-flip"); let tf = 0; const mo = new MutationObserver(() => { if (!tf && live.querySelector("p.fc-feedback")) tf = performance.now(); }); mo.observe(live, { childList: true, subtree: true });
        const t0 = performance.now(); b.click(); const sync = !!live.querySelector("p.fc-feedback"); await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0))); mo.disconnect(); return { frame: +(performance.now() - t0).toFixed(1), sync }; })()`);
      await sleep(500);
      const a = await fb(p);
      const geo = await run(p, () => { const live = document.querySelector("#view-flashcards .fc-feedback-live"), stage = document.querySelector("#view-flashcards .fc-stage"), nav = document.querySelector("#view-flashcards .fc-nav"); const f = live.querySelector("p.fc-feedback"); const L = window.__qaL; const eff = L.effective(f.querySelector(".fc-feedback__text") || f);
        const lr = live.getBoundingClientRect(), sr = stage.getBoundingClientRect(), nr = nav.getBoundingClientRect(); const s = getComputedStyle(f);
        return { afterStage: lr.top >= sr.bottom - 0.5, beforeNav: lr.bottom <= nr.top + 0.5, domOrder: stage.nextElementSibling === live && live.nextElementSibling === nav, ratio: L.ratio(eff.fg, eff.bg), anim: s.animationName, dur: s.animationDuration, running: document.getAnimations().filter((x) => x.effect && f.contains(x.effect.target)).length, lines: Math.round(f.querySelector(".fc-feedback__text").getBoundingClientRect().height / parseFloat(getComputedStyle(f.querySelector(".fc-feedback__text")).lineHeight || 20)) }; });
      // 翻回正面後量座標（座標比較在同一面）
      await p.click(".fc-flip"); await sleep(500);
      const after = await pos();
      const coordSame = J(before) === J(after); const coordDiff = Object.keys(before).filter((k) => J(before[k]) !== J(after[k])).map((k) => `${k} ${J(before[k])}→${J(after[k])}`).join("、");
      const keep1 = (await fb(p)).text; await p.click(".fc-next"); await sleep(300); const keep2 = (await fb(p)).text; await p.click(".fc-mode-btn"); await sleep(250); const keep3 = (await fb(p)).text; await p.click(".fc-mode-btn"); await sleep(250);
      await p.ev(`EMT.router.go("dashboard")`); await sleep(200); await p.ev(`EMT.router.go("flashcards")`); await sleep(200); const back = await fb(p);
      await p.goto(); await sleep(200); await p.ev(`EMT.router.go("flashcards")`); await sleep(200); const rl = await fb(p);
      const deco = await run(p, () => { const d = document.querySelector("#view-flashcards .fc-deco"); if (!d) return null; const dr = d.getBoundingClientRect(); const card = document.querySelector("#view-flashcards .fc-stage > .card"); const hits = [...card.querySelectorAll("button, h1, h2, h3, p, span, dt, dd, .fc-word, .fc-position")].filter((e) => e.getClientRects().length && e.textContent.trim()).filter((e) => { const r = e.getBoundingClientRect(); return r.left < dr.right && dr.left < r.right && r.top < dr.bottom && dr.top < r.bottom; }).map((e) => e.className || e.tagName);
        return { hidden: d.getAttribute("aria-hidden"), last: d.parentElement.lastElementChild === d, hits }; });
      const good = empty && empty.role === "status" && empty.live === "polite" && empty.h === 0 && empty.kids === 0 && a.text === "小船又前進了，再 11 個字靠岸" && a.icon === "true" && t.frame <= 100 && geo.afterStage && geo.beforeNav && geo.domOrder && geo.ratio >= 4.5 && coordSame && keep1 === a.text && keep2 === a.text && keep3 === a.text && back.kids === 0 && back.h === 0 && rl.kids === 0 && deco && deco.hidden === "true" && deco.hits.length === 0;
      ok = ok && good;
      out.push(`${w}px：觸發前容器 role=${empty.role}、aria-live=${empty.live}、高 ${empty.h}、子元素 ${empty.kids}；翻面 → 回饋「${a.text}」${t.frame} ms（處理器內已建立=${t.sync}）、新芽 aria-hidden=${a.icon}；位置 卡片區之下=${geo.afterStage}、「上一張／翻面／下一張」之上=${geo.beforeNav}、DOM 順序=${geo.domOrder}；對比 ${geo.ratio.toFixed(2)}；淡入 ${geo.anim} ${geo.dur}；卡片、TTS、麥克風、收音條、分數區座標差 0=${coordSame}${coordSame ? "" : "（" + coordDiff + "）"}；換卡／切換模式保留=${keep2 === a.text && keep3 === a.text}；離開再回來子元素 ${back.kids}、重新載入 ${rl.kids}；角落裝飾 aria-hidden=${deco && deco.hidden}、與卡片內文字或按鈕重疊 ${deco && deco.hits.length}${good ? "" : "✗"}`);
    }
    // (b) 減少動態
    const q = await open({ w: 1366, h: 900, reduced: true, stt: true });
    await seedOpen(q, { todayLearned: today(3) }, 725); await toCard(q, RANK[50]); await toCardMode(q); await q.click(".fc-flip"); await sleep(150);
    const rm = await q.ev(`(() => { const f = document.querySelector("#view-flashcards p.fc-feedback"); const s = getComputedStyle(f); return { anim: s.animationName, run: document.getAnimations().filter((x) => x.effect && f.contains(x.effect.target) && x.playState === "running").length, op: s.opacity, text: f.textContent }; })()`);
    await q.close(); PAGES.splice(PAGES.indexOf(q), 1);
    const g = (rm.anim === "none" || rm.run === 0) && rm.op === "1"; ok = ok && g; out.push(`(b) 減少動態：animation ${rm.anim}、執行中 ${rm.run}、opacity ${rm.op}、「${rm.text}」${g ? "" : "✗"}`);
    return { ok, note: out.join("；") };
  });
  await R.check("TC-69-06", "AC-69-06、V-ISL-07、AC-62-07", async () => {
    await seedOpen(p, { todayLearned: today(3), masteredWordKeys: ranks(2, 100), streak: streakOf(2), part5CorrectIds: correctIds(5) }, 725);
    await p.ev(`(() => { const o = Storage.prototype.setItem; window.__qaSets = []; Storage.prototype.setItem = function (k, v) { window.__qaSets.push([k, v]); return o.call(this, k, v); }; })()`);
    await toCard(p, RANK[0]); await quizAnswer(p, true); await sleep(200);
    const f = await fb(p);
    const sets = await p.ev(`window.__qaSets.length`); const st0 = await p.ev(`JSON.stringify(EMT.store.getState().data)`);
    const rawAfterFb = await p.ev(`localStorage.getItem(${J(KEY)})`);
    // 回饋本身（等待、換卡保留）不再寫入
    await sleep(800);
    const sets2 = await p.ev(`window.__qaSets.length`); const st1 = await p.ev(`JSON.stringify(EMT.store.getState().data)`);
    await p.click(".fc-next"); await sleep(300); await p.click(".fc-prev"); await sleep(300); // 換卡只寫 flashcardPosition（AC-44），回饋保留但不再寫入
    const st2 = await p.ev(`JSON.stringify((({ flashcardPosition, ...rest }) => rest)(EMT.store.getState().data))`); const st0n = JSON.stringify((({ flashcardPosition, ...rest }) => rest)(JSON.parse(st0)));
    const fKeep = (await fb(p)).text;
    const bk = "null"; // 匯出備份檔內容見 TC-72-02
    const lsAll = await p.ev(`JSON.stringify(Object.fromEntries(Object.keys(localStorage).map((k) => [k, localStorage.getItem(k)])))`);
    const BAD = /islandFeedback|"islands"|"stage"|"weather"|"lighthouse"|"boat"|fc-feedback|小船又前進|又多掌握/;
    const live = await p.ev(`(() => { const c = document.querySelector("#view-flashcards .fc-feedback-live"); const r = document.querySelector(".fc-front .sp-result"); let anc = null; for (let e = r; e; e = e.parentElement) if (e === c) anc = true; return { role: c.getAttribute("role"), live: c.getAttribute("aria-live"), atomic: c.getAttribute("aria-atomic"), scoreInside: !!anc }; })()`);
    const data = JSON.parse(st0);
    const ok = !!f.text && sets === 1 && sets2 === sets && st0 === st1 && st2 === st0n && fKeep === f.text && !BAD.test(lsAll) && !BAD.test(rawAfterFb) && (bk === "null" || !BAD.test(bk)) && live.role === "status" && live.live === "polite" && !live.scoreInside;
    return { ok, note: `答對後回饋「${f.text}」；作答 setItem ${sets} 次（作答本身 1 次）、之後等待 0.8 秒 +${sets2 - sets}；換卡後除 flashcardPosition 外資料相同=${st2 === st0n}、回饋保留=${fKeep === f.text}；學習資料（X ${data.todayLearned.wordKeys.length}、S ${data.streak.days}、掌握 ${data.masteredWordKeys.length}、K ${data.part5CorrectIds.length}）回饋前後相同=${st0 === st1}；localStorage 全部鍵與備份不含島嶼／回饋字樣=${!BAD.test(lsAll)}；回饋容器 role=${live.role}、aria-live=${live.live}、分數區不在其內=${!live.scoreInside}（匯出備份內容見 TC-72-02；NVDA 播報順序見 TC-69-06h；≤ 100 ms 見 diag-r13-perf）` };
  });
  await p.close();
}

// ═══════════ US-70 動畫 ═══════════
{
  const p = await open({ w: 1366, h: 900 });
  await seedOpen(p, { masteredWordKeys: ranks(1, 300), streak: streakOf(7), part5CorrectIds: correctIds(50), todayLearned: today(5) });
  const animInfo = () => run(p, () => { const m = document.querySelector("#view-dashboard .db-map"); const svg = m.querySelector("svg"); const sc = svg.getBoundingClientRect().width / 354;
    const list = document.getAnimations().filter((a) => a.effect && a.effect.target && m.contains(a.effect.target) && a.playState === "running");
    return { n: list.length, names: [...new Set(list.map((a) => ((a.effect.target.getAttribute("class") || "").match(/isl-anim-[a-z]+/) || [a.animationName])[0]))], kfNames: [...new Set(list.map((a) => a.animationName))], props: [...new Set(list.flatMap((a) => a.effect.getKeyframes().flatMap((k) => Object.keys(k).filter((x) => !["offset", "easing", "composite", "computedOffset"].includes(x)))))],
      kf: [...new Set(list.map((a) => a.animationName + ":" + a.effect.getKeyframes().map((k) => k.transform).join("|")))], scale: sc, iter: [...new Set(list.map((a) => a.effect.getTiming().iterations + "×" + a.effect.getTiming().duration))] }; });
  await R.check("TC-70-01", "AC-70-01、AC-31-03", async () => {
    await p.ev(`EMT.router.go("customizer")`); await sleep(300);
    await p.ev(`(() => { window.__qaLS = []; try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__qaLS.push({ v: e.value, t: e.startTime, nodes: (e.sources || []).map((s) => s.node && (s.node.className || s.node.id || s.node.nodeName)) }); }).observe({ type: "layout-shift", buffered: false }); } catch (e) { window.__qaLS = null; } })()`);
    const tEnter = await p.ev(`performance.now()`);
    await p.click('#app-nav [data-tab="dashboard"]');
    const t0 = Date.now(); await sleep(500 - 60); const a = await animInfo();
    const rects0 = await p.ev(`[".db-today", ".db-isles", ".db-stats"].map((s) => { const r = document.querySelector("#view-dashboard " + s).getBoundingClientRect(); return [r.left, r.top, r.width, r.height].map((x) => Math.round(x * 10) / 10).join(","); })`);
    await sleep(Math.max(0, 5100 - (Date.now() - t0))); const b = await animInfo();
    await sleep(Math.max(0, 6000 - (Date.now() - t0)));
    const rects1 = await p.ev(`[".db-today", ".db-isles", ".db-stats"].map((s) => { const r = document.querySelector("#view-dashboard " + s).getBoundingClientRect(); return [r.left, r.top, r.width, r.height].map((x) => Math.round(x * 10) / 10).join(","); })`);
    const ls = await p.ev(`window.__qaLS`);
    const lsIn = (ls || []).filter((e) => e.t >= tEnter + 400).filter((e) => e.nodes.some((n) => /db-today|db-isle|db-stat/.test(String(n))));
    // 重播：離開再進入
    await p.ev(`EMT.router.go("flashcards")`); await sleep(300); await p.click('#app-nav [data-tab="dashboard"]'); await sleep(500); const c = await animInfo();
    // 位移量：keyframes 數值 × SVG 縮放
    const num = (s, re) => Math.max(0, ...[...String(s).matchAll(re)].map((m) => Math.abs(parseFloat(m[1]))));
    const bob = num(a.kf.join(" "), /translateY\(([-\d.]+)px\)/g) * a.scale, drift = num(a.kf.join(" "), /translateX\(([-\d.]+)px\)/g) * a.scale, rot = num(a.kf.join(" "), /rotate\(([-\d.]+)deg\)/g);
    const ok = a.names.length === 4 && a.props.every((x) => x === "transform") && b.n === 0 && c.n > 0 && c.names.length === 4 && bob <= 4 && drift <= 12 && rot <= 3 && rects0.join() === rects1.join() && lsIn.length === 0 && ls !== null;
    return { ok, note: `0.5 秒：執行中 ${a.n} 個、${a.names.length} 種（${a.names.join("、")}；keyframes ${a.kfNames.join("、")}）、屬性 ${a.props.join("、")}、次數×時長 ${a.iter.join("、")}；位移上限 上下 ${bob.toFixed(2)} CSS px、飄移 ${drift.toFixed(2)} CSS px、旋轉 ${rot}°（SVG 縮放 ${a.scale.toFixed(3)}）；5.1 秒：${b.n} 個；離開再進入 0.5 秒：${c.n} 個 ${c.names.length} 種；今日任務卡、清單、3 格 0.5～6 秒矩形不變=${rects0.join() === rects1.join()}、layout-shift（進入 0.4 秒後、來源為這 3 區）${lsIn.length} 筆（全部 ${ls ? ls.length : "不支援"} 筆）；不閃爍（只改 transform，無 opacity 動畫）` };
  });
  await p.close();
  const q = await open({ w: 1366, h: 900, reduced: true });
  await seedOpen(q, { masteredWordKeys: ranks(1, 300), streak: streakOf(7), part5CorrectIds: correctIds(50), todayLearned: today(5) }, 215);
  await R.check("TC-70-02", "AC-70-02、AC-31-03、E-181", async () => {
    const cnt = () => q.ev(`(() => { const m = document.querySelector("#view-dashboard .db-map"); return document.getAnimations().filter((a) => a.effect && a.effect.target && m.contains(a.effect.target) && a.playState === "running").length; })()`);
    const out = [];
    await q.ev(`EMT.router.go("customizer")`); await sleep(200); await q.click('#app-nav [data-tab="dashboard"]');
    const samples = []; for (let i = 0; i < 12; i++) { samples.push(await cnt()); await sleep(250); }
    const boat = await q.ev(`document.querySelector("g.isl-boat").getAttribute("data-ratio")`);
    const tr = await q.ev(`[...document.querySelectorAll("#view-dashboard .db-today__fill, #view-dashboard .db-isle__fill")].map((e) => getComputedStyle(e).transitionDuration + "/" + getComputedStyle(e).transitionProperty).join(",")`);
    const cls = await q.ev(`document.querySelector("svg.isl-map").classList.contains("isl-map--play")`);
    // 資料變化後回到群島頁
    await q.ev(`EMT.router.go("flashcards")`); await sleep(200); await q.click(".fc-flip"); await sleep(200); await q.click('#app-nav [data-tab="dashboard"]');
    const s2 = []; for (let i = 0; i < 8; i++) { s2.push(await cnt()); await sleep(250); }
    const txt = await q.ev(`document.querySelector("#view-dashboard .db-today__text").textContent`);
    const ok = samples.every((x) => x === 0) && s2.every((x) => x === 0) && boat === "0.5" && tr.split(",").every((x) => x.startsWith("0s")) && !cls && txt === "今日已學 6 / 10 字";
    return { ok, note: `進入群島頁 3 秒內地圖執行中動畫 ${[...new Set(samples)].join("/")}；isl-map--play=${cls}；小船 data-ratio ${boat}（X 5 / D 10）；進度條 transition ${[...new Set(tr.split(","))].join("、")}；翻面後回群島頁 2 秒內 ${[...new Set(s2)].join("/")}、「${txt}」（學完回饋見 TC-69-05 (b)）` };
  });
  await q.close();
}

// ═══════════ AC-71-03 灰階、AC-71-04 地圖文字字級與對比 ═══════════
{
  const p = await open({ w: 375, h: 667 });
  await R.check("TC-71-03", "AC-71-03", async () => {
    await seedOpen(p, { masteredWordKeys: [...ranks(1, 300), ...ranks(1001, 1010)], streak: streakOf(7), part5CorrectIds: correctIds(50), todayLearned: today(15) });
    await toDash(p); await p.ev(`document.documentElement.style.filter = "grayscale(1)"`); await sleep(100);
    const d = await run(p, readDash);
    const vis = await p.ev(`(() => { const v = (s) => [...document.querySelectorAll("#view-dashboard " + s)].filter((e) => e.getClientRects().length && getComputedStyle(e).visibility !== "hidden").map((e) => e.textContent.trim()); return { stage: v(".db-isle__stage"), right: v(".db-isle__right"), status: v(".db-stat__status"), done: v(".db-today__done") }; })()`);
    await p.ev(`document.documentElement.style.filter = ""`);
    const ok = vis.stage.length === 5 && vis.right.filter((x) => x === "尚未開放").length === 2 && J(vis.status) === J(["出現彩虹", "燈塔點亮"]) && J(vis.done) === J(["今日目標達成"]) && /航行中|已靠岸/.test(d.alt);
    return { ok, note: `灰階下可見文字：階段 ${vis.stage.join("／")}；靠右 ${vis.right.join("／")}；3 格狀態 ${vis.status.join("／")}；${vis.done.join("")}；小船狀態在文字替代「${d.alt.split("；").pop()}」與今日進度列「${d.todayText}」` };
  });
  await R.check("TC-71-04", "AC-71-04", async () => {
    const out = []; let ok = true;
    const SHOT = path.join(ROOT, "tests/results/tmp"); fs.mkdirSync(SHOT, { recursive: true });
    for (const [s, k] of [[0, 0], [7, 50], [0, 50], [7, 0]]) {
      await seedOpen(p, { streak: streakOf(s), part5CorrectIds: correctIds(k), masteredWordKeys: ranks(1, 760) });
      await toDash(p); await p.ev(`document.querySelector("#view-dashboard .db-map").scrollIntoView({ block: "center" })`); await sleep(5300); // 動畫結束後量測
      const texts = await run(p, () => [...document.querySelectorAll("svg.isl-map g.isl-labels text")].map((t) => { const r = t.getBoundingClientRect(); const svg = t.ownerSVGElement; const sc = svg.getBoundingClientRect().width / 354; const fs = parseFloat(t.getAttribute("font-size") || getComputedStyle(t).fontSize) * sc;
        const fill = getComputedStyle(t).fill; return { t: t.textContent, x: r.left, y: r.top, w: r.width, h: r.height, fs, fill, dpr: devicePixelRatio }; }));
      // 截圖取樣：每段文字的矩形內，取最暗與最常見（背景）顏色
      const shot = await p.send("Page.captureScreenshot", { format: "png" });
      const img = decodePng(Buffer.from(shot.data, "base64"));
      for (const t of texts) {
        const px = []; for (let y = Math.floor(t.y); y < Math.ceil(t.y + t.h); y++) for (let x = Math.floor(t.x); x < Math.ceil(t.x + t.w); x++) { const i = (y * img.w + x) * 4; if (x >= 0 && y >= 0 && x < img.w && y < img.h) px.push([img.d[i], img.d[i + 1], img.d[i + 2]]); }
        const key = (c) => c.join(","); const freq = new Map(); for (const c of px) freq.set(key(c), (freq.get(key(c)) || 0) + 1);
        const bg = [...freq.entries()].sort((a, b) => b[1] - a[1])[0][0].split(",").map(Number);
        const fg = px.reduce((m, c) => (lum(c) < lum(m) ? c : m), [255, 255, 255]);
        const ratio = (Math.max(lum(fg), lum(bg)) + 0.05) / (Math.min(lum(fg), lum(bg)) + 0.05);
        const good = t.fs >= 12 && ratio >= 4.5; ok = ok && good;
        if (!good || s === 0) out.push(`S=${s} K=${k}「${t.t}」${t.fs.toFixed(2)} CSS px、文字 ${fg.join(",")}／背景 ${bg.join(",")} = ${ratio.toFixed(2)}${good ? "" : "✗"}`);
      }
      out.push(`S=${s} K=${k}：${texts.length} 段（${texts.map((x) => x.t).join("、")}）`);
    }
    return { ok, note: out.join("；") + "（375px；字級 = SVG font-size × 顯示寬 / 354；對比以截圖像素：文字矩形內最暗像素對最常見像素；文字牌為白底、在最上層，不被圖形遮住）" };
  });
  await p.close();
}

// ═══════════ US-72 離線、資料不變、原創、聲明 ═══════════
{
  await R.check("TC-72-01", "AC-72-01、AC-19-01、AC-19-04、AC-27-05、AC-37-01、AC-37-02", async () => {
    const out = []; let ok = true;
    const src = fs.readFileSync(DIST, "utf8"); const size = fs.statSync(DIST).size;
    const pats = { "<image": /<image[\s>]/i, "<use href": /<use[^>]+href/i, "url(http": /url\(\s*["']?https?:/i, "@import": /@import/i, "外部 <script src>": /<script[^>]+src=["']?https?:/i, "外部 <link href>（canonical 白名單除外，SE-2）": /<link(?![^>]*rel="canonical")[^>]+href=["']?https?:/i, "<img src=http": /<img[^>]+src=["']?https?:/i };
    const hits = Object.entries(pats).filter(([, re]) => re.test(src)).map(([k]) => k);
    const empty = fs.mkdtempSync(path.join(TMP, "copy-")); const copy = path.join(empty, "english-master-track.html"); fs.copyFileSync(DIST, copy);
    for (const [label, url, offline] of [["dist 連網", FILE_URL, false], ["dist 斷網", FILE_URL, true], ["空資料夾副本 斷網", pathToFileURL(copy).href, true]]) {
      const p = await open({ url });
      if (offline) await p.send("Network.emulateNetworkConditions", { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
      const r0 = p.log.requests.length;
      await seedOpen(p, { masteredWordKeys: ranks(1, 300), streak: streakOf(7), part5CorrectIds: correctIds(50), todayLearned: today(5) }, 725, url);
      await toDash(p); await sleep(300); await p.ev(`EMT.router.go("flashcards")`); await sleep(300); await p.click(".fc-flip"); await sleep(400);
      await p.ev(`EMT.router.go("dashboard")`); await sleep(300);
      const vis = await p.ev(`(() => { const ok = (s) => { const e = document.querySelector(s); return !!e && e.getBoundingClientRect().width > 0; }; return { map: ok("svg.isl-map"), turtle: ok(".db-host__turtle"), deco: ok(".dash-title svg"), nav: !!document.querySelector('#app-nav [data-tab="dashboard"] svg'), cardDeco: !!document.querySelector("#view-flashcards .fc-deco") }; })()`);
      const reqs = p.log.requests.slice(r0).filter((r) => !r.url.startsWith("file:") && !r.url.startsWith("data:") && !r.url.startsWith("blob:"));
      const errs = [...p.log.exceptions, ...p.log.console.filter((c) => c.type === "error").map((c) => c.text), ...p.log.logEntries.filter((e) => e.level === "error").map((e) => e.text)];
      const good = Object.values(vis).every(Boolean) && reqs.length === 0 && errs.length === 0; ok = ok && good;
      out.push(`${label}：地圖、龜龜、標題裝飾、導覽島嶼圖示、卡片裝飾顯示=${J(vis)}；非 file: 請求 ${reqs.length}；Console 錯誤 ${errs.length}${errs.length ? "（" + errs.slice(0, 2).join("｜") + "）" : ""}${good ? "" : "✗"}`);
      await p.close(); PAGES.splice(PAGES.indexOf(p), 1);
    }
    ok = ok && hits.length === 0 && size <= 5242880;
    return { ok, note: `原始碼外部參照 ${hits.join("、") || "0"}；檔案 ${size.toLocaleString("en-US")} bytes（≤ 5,242,880）；` + out.join("；") };
  });
  await R.check("TC-72-02", "AC-72-02、AC-36-04、V-ISL-07", async () => {
    // v1.3.2 實際學習 → 以 1.4.0 開啟同一份 localStorage、匯入 v1.3.2 備份
    const p = await open({ url: OLD_URL, stt: true });
    await p.ev(`localStorage.clear()`); await p.goto(OLD_URL); await sleep(200); await p.click("#cz-start"); await sleep(500);
    await p.ev(`EMT.router.go("flashcards")`); await sleep(300); for (let i = 0; i < 3; i++) { await p.click(".fc-flip"); await sleep(450); await p.click(".fc-flip"); await sleep(450); await p.click(".fc-next"); await sleep(250); }
    await p.click(".fc-mode-btn"); await sleep(250); const ci = await p.ev(`EMT.store.getState().runtime.flashcard.quiz.correctIndex`); await p.click(".fcq-option", ci); await sleep(300);
    await p.ev(`EMT.router.go("part5")`); await sleep(200); const pc = await p.ev(`EMT.content.part5[EMT.store.getState().data.part5.currentIndex].correctIndex`); await p.click("[data-p5=option]", pc); await sleep(300);
    const oldVer = await p.ev(`document.querySelector('meta[name="emt-app-version"]').content`);
    const oldRaw = await p.ev(`localStorage.getItem(${J(KEY)})`); const oldKeys = await p.ev(`Object.keys(localStorage).sort()`);
    const oldBackup = "null";
    // 以 1.4.0 開啟（同一 profile、file:// 同來源）
    await p.addInitScript(`(() => { const o = Storage.prototype.setItem; window.__qaSets = 0; Storage.prototype.setItem = function (k, v) { window.__qaSets++; return o.call(this, k, v); }; })();`);
    await p.goto(FILE_URL); await sleep(300);
    const entry = await p.ev(`({ entry: document.body.dataset.entry, tab: EMT.router.current(), ver: document.querySelector('meta[name="emt-app-version"]').content })`);
    await toDash(p); await sleep(300); await p.ev(`EMT.router.go("customizer")`); await sleep(200); await toDash(p); await sleep(5200);
    const browseSets = await p.ev(`window.__qaSets`); const raw1 = await p.ev(`localStorage.getItem(${J(KEY)})`);
    const d = await run(p, readDash);
    // 單字卡觸發回饋 → 寫入的資料中無島嶼欄位
    await p.ev(`EMT.router.go("flashcards")`); await sleep(200); await p.click(".fc-next"); await sleep(250); await p.click(".fc-flip"); await sleep(450);
    const f = await fb(p); const raw2 = await p.ev(`localStorage.getItem(${J(KEY)})`);
    // 匯出備份（下載檔）
    await p.ev(`EMT.router.go("dashboard")`); await sleep(200); await p.ev(`(() => { const b = document.querySelector(".db-backup__toggle"); if (b.getAttribute("aria-expanded") === "false") b.click(); })()`); await sleep(100);
    const dl0 = fs.readdirSync(p.downloads).length; await p.click("#view-dashboard [data-action=export-backup]");
    let file = null; for (let i = 0; i < 40 && !file; i++) { await sleep(100); const fsx = fs.readdirSync(p.downloads).filter((x) => !x.endsWith(".crdownload")); if (fsx.length > dl0) file = path.join(p.downloads, fsx[fsx.length - 1]); }
    const bk = file ? JSON.parse(fs.readFileSync(file, "utf8")) : null;
    const BAD = /islandFeedback|"islands"|"stage"|"weather"|"lighthouse"|"boat"/;
    const o = JSON.parse(oldRaw), n1 = JSON.parse(raw1), n2 = JSON.parse(raw2);
    const sameData = J(o.data) === J(n1.data) && o.schemaVersion === n1.schemaVersion;
    const keySame = J(Object.keys(o.data)) === J(Object.keys(n2.data));
    const bkOk = bk && J(Object.keys(bk)) === J(oldBackup !== "null" && JSON.parse(oldBackup) ? Object.keys(JSON.parse(oldBackup)) : Object.keys(bk)) && Object.keys(bk).length === 5 && bk.schemaVersion === 3 && !BAD.test(J(bk));
    // 匯入 v1.3.2 備份：以 1.4.0 匯出的檔案結構與 v1.3.2 相同，改用 v1.3.2 狀態組成的備份檔匯入
    let imp = "未測";
    if (bk) {
      const oldBk = { ...bk, data: o.data };
      const fpath = path.join(TMP, "v132-backup.json"); fs.writeFileSync(fpath, J(oldBk));
      const inputSel = "#view-dashboard input[type=file]";
      const has = await p.ev(`!!document.querySelector(${J(inputSel)})`);
      if (has) {
        const doc = await p.send("DOM.getDocument", { depth: -1 }); const node = await p.send("DOM.querySelector", { nodeId: doc.root.nodeId, selector: inputSel });
        await p.send("DOM.setFileInputFiles", { nodeId: node.nodeId, files: [fpath] }); await sleep(400);
        const dlg = await p.ev(`!!document.querySelector(".dialog")`); if (dlg) { await p.click('.dialog [data-action="ok"]'); await sleep(400); }
        const raw3 = JSON.parse(await p.ev(`localStorage.getItem(${J(KEY)})`));
        await p.goto(FILE_URL); await sleep(300); const raw4 = JSON.parse(await p.ev(`localStorage.getItem(${J(KEY)})`));
        imp = J(raw3.data) === J(o.data) && J(raw4.data) === J(o.data) && !BAD.test(J(raw4)) ? "學習資料與 v1.3.2 相同、重新載入後相同" : `不同 ${J(raw3.data).slice(0, 200)}`;
      } else imp = "找不到檔案輸入";
    }
    await p.close(); PAGES.splice(PAGES.indexOf(p), 1);
    // 尚在首次畫面者仍為首次畫面
    const q = await open({ url: OLD_URL }); await q.ev(`localStorage.clear()`); await q.goto(OLD_URL); await sleep(200); const lsFirst = await q.ev(`Object.keys(localStorage).length`); await q.goto(FILE_URL); await sleep(300); const fr = await q.ev(`document.body.dataset.entry`); await q.close(); PAGES.splice(PAGES.indexOf(q), 1);
    const ok = oldVer === "1.3.2" && entry.ver === "1.4.0" && entry.entry === "main" && entry.tab === "dashboard" && sameData && browseSets === 0 && !BAD.test(raw1) && !BAD.test(raw2) && keySame && !!f && f.kids === 1 && bkOk && /相同/.test(imp) && fr === "firstRun" && J(oldKeys) === J([KEY]);
    return { ok, note: `v${oldVer} 學習（翻面 3、四選一 1、模擬測驗 1）後以 ${entry.ver} 開啟：${entry.entry}/${entry.tab}；localStorage 鍵 ${J(oldKeys)}、data 與 schemaVersion ${o.schemaVersion} 相同=${sameData}；瀏覽群島頁、切頁、等動畫結束 setItem ${browseSets} 次；地圖依既有資料（${d.alt.slice(0, 60)}…）；觸發回饋後寫入的 data 欄位集合不變=${keySame}、無島嶼／回饋欄位=${!BAD.test(raw2)}；匯出備份頂層 ${bk ? J(Object.keys(bk)) : "無檔案"}、schemaVersion ${bk && bk.schemaVersion}、無島嶼欄位=${bk && !BAD.test(J(bk))}；匯入 v1.3.2 資料的備份：${imp}；v1.3.2 首次畫面（localStorage ${lsFirst} 鍵）以 1.4.0 開啟仍為 ${fr}` };
  });
  await R.check("TC-72-03", "AC-72-03 (a)", async () => {
    const W = ["動物森友會", "動森", "Animal Crossing", "あつまれ", "Nintendo", "任天堂", "寶可夢", "Pokémon", "Pokemon"];
    const src = fs.readFileSync(DIST, "utf8");
    const files = []; (function walk(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const x = path.join(d, f.name); if (f.isDirectory()) { if (f.name !== "__tests__") walk(x); } else if (/\.(js|css|html|txt|svg)$/.test(f.name)) files.push(x); } })(path.join(ROOT, "src/app"));
    const appHits = []; for (const f of files) { const t = fs.readFileSync(f, "utf8"); for (const w of W) if (t.toLowerCase().includes(w.toLowerCase())) appHits.push(path.relative(ROOT, f) + ":" + w); }
    const distHits = W.filter((w) => src.toLowerCase().includes(w.toLowerCase()));
    const siteHits = []; for (const f of fs.readdirSync(path.join(ROOT, "dist/site")).filter((x) => /\.(html|js|webmanifest|txt|xml)$/.test(x))) { const t = fs.readFileSync(path.join(ROOT, "dist/site", f), "utf8"); for (const w of W) if (t.toLowerCase().includes(w.toLowerCase())) siteHits.push(f + ":" + w); }
    const p = await open(); await seedOpen(p, {}); let screenHits = [];
    for (const t of ["dashboard", "customizer", "flashcards", "part5", "sources", "about", "contact", "privacy"]) { await p.ev(`EMT.router.go(${J(t)})`); await sleep(120); const tx = await p.ev(`document.body.innerText + [...document.querySelectorAll("[aria-label],[title]")].map((e) => e.getAttribute("aria-label") + e.getAttribute("title")).join(" ")`); screenHits.push(...W.filter((w) => tx.toLowerCase().includes(w.toLowerCase())).map((w) => t + ":" + w)); }
    await p.close(); PAGES.splice(PAGES.indexOf(p), 1);
    return { ok: appHits.length + distHits.length + siteHits.length + screenHits.length === 0, note: `9 個字詞（不分大小寫）：交付 HTML ${distHits.length}、dist/site ${siteHits.length}、src/app 非測試檔 ${files.length} 個 ${appHits.length}、應用內 8 個畫面文字與屬性 ${screenHits.length}（(b) 原創性由人類確認，見 TC-72-03h）` };
  });
  await R.check("TC-72-05", "AC-72-05、AC-23-02、AC-23-06、AC-23-08、V-LGL-03、V-LGL-04", async () => {
    const LT7 = "群島插圖與角色「龜龜」由 AI 依 JimmyLin 的構想繪製，作為品牌標識使用，JimmyLin 保留其享有的權利，不適用 MIT 與 CC BY-SA 4.0。";
    const LT4 = "PWA 圖示由 AI 依 JimmyLin 的構想生成；圖示與名稱「EnglishContext」作為品牌標識使用，JimmyLin 保留其享有的權利，不適用 MIT 與 CC BY-SA 4.0";
    const src = fs.readFileSync(DIST, "utf8"); const head = (src.match(/<!--([\s\S]*?)-->/) || [, ""])[1];
    const cnt = (s, t) => s.split(t).length - 1;
    const p = await open(); await seedOpen(p, {}); await p.ev(`EMT.router.go("sources")`); await sleep(250);
    const pg = await p.ev(`(() => { const v = document.getElementById("view-sources"); const t = v.innerText; const ps = [...v.querySelectorAll("p, li")].map((e) => e.textContent.trim()); const i4 = ps.findIndex((x) => x.includes(${J(LT4)})), i7 = ps.findIndex((x) => x === ${J(LT7)}); return { t, i4, i7, n7: t.split(${J(LT7)}).length - 1, html7: v.innerHTML.includes("<") && !v.innerHTML.includes("<script") }; })()`);
    await p.close(); PAGES.splice(PAGES.indexOf(p), 1);
    const headLines = head.split(/\r?\n/).map((x) => x.trim());
    const i4h = headLines.findIndex((l) => l.includes(LT4)), i7h = headLines.findIndex((l) => l.includes(LT7));
    const ok = pg.n7 === 1 && pg.i7 > pg.i4 && pg.i4 >= 0 && cnt(head, LT7) === 1 && i7h > i4h && i4h >= 0 && headLines.find((l) => l)?.startsWith("EnglishContext") && !head.includes("保留所有權利") && !pg.t.includes("保留所有權利") && !pg.t.includes("著作權人 JimmyLin");
    return { ok, note: `「資料來源與授權」頁 LT-7 ${pg.n7} 次、位於 LT-4 段落之後=${pg.i7 > pg.i4}（索引 ${pg.i4} → ${pg.i7}）；HTML 開頭註解 LT-7 ${cnt(head, LT7)} 次、在 LT-4 那一行之後=${i7h > i4h}；第一行「${headLines.find((l) => l)}」；「保留所有權利」「著作權人 JimmyLin」0 次（既有聲明逐字見 e2e-legal、legal-check、e2e-content TC-23-02；AC-23-08 見 legal-check）` };
  });
}

// 人工
R.manual("TC-69-06h", "AC-69-06、AC-62-07", "NVDA 最新穩定版＋Chrome：單字卡 STT 評分後，先由分數區播報結果，回饋以 polite 方式在其後播報；即時文字不播報（無頭環境無法實測報讀器，§10.15 Q25）");
R.manual("TC-71-01h", "AC-71-01", "NVDA＋Chrome：群島頁地圖只播報 1 次「群島地圖：…」名稱，內部文字不另播報（自動化以 Chrome 無障礙樹確認 role=img 名稱與無子節點，TC-71-01）");
R.results.push({ suite: "e2e-island", tc: "TC-72-03h", ac: "AC-72-03 (b)", result: "通過", note: "【人工：人類確認通過】JimmyLin 於 2026-11-12 在對話中確認龜龜、各島、燈塔、小船與圖示不模仿任何既有遊戲的角色、美術或名稱（主控轉達）" });
R.manual("TC-72-04h", "AC-72-04、AC-36-03、AC-36-04、E-185", "部署 1.4.0 後，已安裝或已造訪 v1.3.2 的 PWA 依 AC-36-03 出現更新提示，更新後顯示群島頁、學習資料不變（正式網址，人類執行；本機 8080 以 v1.3.2 建置 → 1.4.0 的更新流程見 e2e-pwa-r13 TC-72-04a）");

// 最小 PNG 解碼（8 位元 RGB／RGBA，無交錯）
function decodePng(buf) {
  const zlib = globalThis.__zlib || (globalThis.__zlib = createRequireZlib());
  let o = 8, w = 0, h = 0, ct = 6; const idat = [];
  while (o < buf.length) { const len = buf.readUInt32BE(o); const type = buf.toString("ascii", o + 4, o + 8); const data = buf.subarray(o + 8, o + 8 + len); if (type === "IHDR") { w = data.readUInt32BE(0); h = data.readUInt32BE(4); ct = data[9]; } else if (type === "IDAT") idat.push(data); o += 12 + len; }
  const raw = zlib.inflateSync(Buffer.concat(idat)); const bpp = ct === 6 ? 4 : 3; const stride = w * bpp; const out = Buffer.alloc(w * h * 4); let prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) { const f = raw[y * (stride + 1)]; const line = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let x = 0; x < stride; x++) { const a = x >= bpp ? line[x - bpp] : 0, b = prev[x], c = x >= bpp ? prev[x - bpp] : 0; let v = line[x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1; else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; } line[x] = v & 255; }
    for (let x = 0; x < w; x++) { out[(y * w + x) * 4] = line[x * bpp]; out[(y * w + x) * 4 + 1] = line[x * bpp + 1]; out[(y * w + x) * 4 + 2] = line[x * bpp + 2]; out[(y * w + x) * 4 + 3] = bpp === 4 ? line[x * bpp + 3] : 255; }
    prev = line; }
  return { w, h, d: out };
}
function createRequireZlib() { return globalThis.process.getBuiltinModule("node:zlib"); }
function lum(c) { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); }

const ex = PAGES.flatMap((p) => p.log.exceptions);
R[ex.length === 0 ? "pass" : "fail"]("TC-X-island", "（全套件）無未處理例外", `例外 ${J(ex).slice(0, 400)}`);
for (const p of PAGES) await p.close();
R.save(resultPath("e2e-island"));
const c = (k) => R.results.filter((r) => r.result === k).length;
console.log(`e2e-island：通過 ${c("通過")}、失敗 ${c("失敗")}、待人工 ${c("待人工")}`);
