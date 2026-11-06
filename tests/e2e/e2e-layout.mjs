// QA E2E 套件 15（第 5 輪新增，PRD v0.13 R-21）：版面與視覺 US-38～US-41（AC-38-01～AC-41-04）
// 依據：PRD v0.13 §3「版面與視覺」、V-LAYOUT；契約 v0.13 §11 NM／VC／DB／FT／MT、V-LAY-01～08；architecture v0.8 §7.19、§10.5。
// 樣稿 docs/mockups/v0.12-layout-demo.html 只供參考，判定一律以 AC 為準。
// v0.11 對照版：git 提交 4fcbb9f 的 dist/english-master-track.html（AC-38-03、AC-38-08、AC-38-10 (2)）。
// 單字卡頁測驗模式結構對照前固定 Math.random（主控指示）。
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { launch, recorder, sleep, resultPath, FILE_URL, ROOT, DIST } from "./lib/cdp.mjs";
import { TOAST_RECORDER, fakeTts, fakeStt, fakeMic } from "./lib/inits.mjs";
import { KEY, stateRecord, seed, readState, clickCard, apply, dashGoal, GOAL_LINE, todayYmd, addDays } from "./lib/state.mjs";
import { PROBE } from "./lib/layout-probe.mjs";

const R = recorder("e2e-layout");
const TMP = process.env.QA_TMP || path.resolve("tests/results/tmp");
fs.mkdirSync(TMP, { recursive: true });
const SHOTS = path.join(ROOT, "tests", "results", "diag", "layout-r5"); fs.mkdirSync(SHOTS, { recursive: true });
const V011 = path.join(TMP, "v011", "english-master-track.html");
fs.mkdirSync(path.dirname(V011), { recursive: true });
fs.writeFileSync(V011, execFileSync("git", ["show", "4fcbb9f:dist/english-master-track.html"], { cwd: ROOT, maxBuffer: 64 << 20 }));
const V011_URL = pathToFileURL(V011).href;
const MANIFEST = JSON.parse(fs.readFileSync(path.join(ROOT, "dist", "site", "manifest.webmanifest"), "utf8"));
const SIZES = [[375, 667], [390, 844], [412, 915], [768, 1024], [1366, 768], [1920, 1080]];
const TWO = [[375, 667], [1366, 768]];
const BRAND = "#1e9bf0", ACCENT = "#f7893b";
const PAGES = [];
const TODAY = todayYmd();
const FIXED_RANDOM = `(() => { let s = 20261103; Math.random = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; }; })();`;

async function open({ inits = [], vp = [1366, 768], autoStart = true } = {}) {
  const p = await launch(); PAGES.push(p);
  for (const s of [TOAST_RECORDER, fakeTts("ok"), fakeStt("ok"), fakeMic("ok"), PROBE, ...inits]) await p.addInitScript(s);
  await p.viewport(vp[0], vp[1]);
  p.autoStart = autoStart;
  await p.send("Page.setInterceptFileChooserDialog", { enabled: true });
  p.chooser = null; p.onEvent((m) => { if (m.method === "Page.fileChooserOpened") p.chooser = m.params; });
  return p;
}
const fnEv = (p, f, ...args) => p.ev(`(${f.toString()})(...${JSON.stringify(args)})`);
const shot = async (p, name) => { try { const r = await p.send("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(path.join(SHOTS, name + ".png"), Buffer.from(r.data, "base64")); } catch { /* 略過 */ } };
const goTab = async (p, tab) => { await p.ev(`EMT.router.go(${JSON.stringify(tab)})`); await sleep(350); await p.ev(`window.scrollTo(0, 0)`); await sleep(50); };
/** 寫入狀態後重新開啟指定網址（seed() 固定回到 v0.12 交付檔，v0.11 對照版改用此函式） */
const seedAt = async (p, rec, url) => { await p.ev(`localStorage.setItem(${JSON.stringify(KEY)}, ${JSON.stringify(JSON.stringify(rec))})`); await p.goto(url); };
/** 鍵盤 Enter／空白鍵（帶 text，使瀏覽器產生 keypress 並觸發按鈕的預設動作） */
const enter = async (p) => { await p.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: "\r" }); await p.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 }); await sleep(60); };
const space = async (p) => { await p.send("Input.dispatchKeyEvent", { type: "keyDown", key: " ", code: "Space", windowsVirtualKeyCode: 32, text: " " }); await p.send("Input.dispatchKeyEvent", { type: "keyUp", key: " ", code: "Space", windowsVirtualKeyCode: 32 }); await sleep(60); };
const lsAll = (p) => p.ev(`(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); } return JSON.stringify(o); })()`);
/** 有連續打卡與學習紀錄的狀態（AC-38-01 Given：「開始今日學習」與連續打卡格皆顯示） */
const richRecord = () => stateRecord(725, { streak: { days: 3, lastActiveDate: TODAY }, vocabQuiz: { answered: 4, correct: 3 }, masteredWordKeys: ["the", "of"],
  part5: { currentIndex: 4, lockedSelection: null, phase: "question", roundAnswered: 4, roundCorrect: 3, totalAnswered: 4, totalCorrect: 3 },
  todayLearned: { date: TODAY, wordKeys: ["the", "of", "and"] }, learnedHistory: { [addDays(TODAY, -3)]: 6, [TODAY]: 3 }, sttNoticeAcknowledged: true });

// ═════════ US-38 品牌視覺 ═════════
{
  const p = await open({ autoStart: false });
  await p.goto();
  // AC-38-01 色彩掃描、AC-38-02 背景、AC-38-04 對比、AC-38-06 卡片、AC-38-07 字級（兩種寬度、首次畫面與 4 功能區、資料來源頁）
  const scan = { orange: [], brandText: [], whiteOnBrand: [], ring: [], p5: [], bodyBg: [], cards: [], contrast: [], titles: [], tab: [], statSize: [], btnBorder: [], statBorder: [] };
  const bad = { orange: [], contrast: [], cards: [], titles: [], tab: [], btnBorder: [], statBorder: [], statSize: [] };
  const ALLOWED_ORANGE = (h) => (h.ctx === "db-start" && h.prop === "background-color" && /db-start/.test(h.sel)) || (h.ctx === "cz-start" && h.prop === "background-color" && /#cz-start/.test(h.sel)) || (h.ctx === "db-stat__icon" && (h.prop === "fill" || h.prop === "color"));
  for (const [w, h] of TWO) {
    await p.viewport(w, h);
    await p.ev(`localStorage.clear()`); await p.goto(); await sleep(300);
    const screens = [["首次畫面", null]];
    for (const [label, tab] of [["首次畫面", null], ["主控台", "dashboard"], ["難易度設定", "customizer"], ["單字卡", "flashcards"], ["模擬測驗", "part5"], ["資料來源與授權", "sources"]]) {
      if (tab === "dashboard") { await p.click("#cz-start"); await sleep(400); await seed(p, richRecord()); }
      if (tab) await goTab(p, tab);
      const r = await p.ev(`(() => { const L = window.__qaL; const hits = L.colorScan(["${ACCENT}", "${BRAND}"]);
        const text = [...document.querySelectorAll("body *")].filter((e) => L.shown(e) && L.ownText(e) && !e.closest(".app-logo"));
        const brandText = text.filter((e) => ["${ACCENT}", "${BRAND}"].includes(L.hex(getComputedStyle(e).color))).map((e) => e.className + ":" + L.ownText(e).slice(0, 10));
        const whiteOn = [...document.querySelectorAll("body *")].filter((e) => L.shown(e) && !e.closest(".app-logo") && L.hex(getComputedStyle(e).color) === "#ffffff" && (L.ownText(e) || e.tagName === "BUTTON") && ["${ACCENT}", "${BRAND}"].includes(L.hex(L.effective(e).bg ? "rgb(" + [L.effective(e).bg.r, L.effective(e).bg.g, L.effective(e).bg.b].join(",") + ")" : ""))).map((e) => e.className);
        const ring = document.querySelector("#view-dashboard:not([hidden]) .db-ring:not(.db-ring--done) .db-ring__bar"); const fill = document.querySelector("#view-part5:not([hidden]) .p5-progress__fill");
        return { hits, brandText, whiteOn, ring: ring && L.shown(ring) ? L.hex(getComputedStyle(ring).stroke) : null, fill: fill && L.shown(fill) ? L.hex(getComputedStyle(fill).backgroundColor) : null, body: getComputedStyle(document.body).backgroundColor, contrast: L.contrast(document.body) }; })()`);
      const orangeHits = r.hits.filter((x) => x.color === ACCENT);
      const disallowed = orangeHits.filter((x) => !ALLOWED_ORANGE(x));
      scan.orange.push(`${w}px ${label}：橘 ${orangeHits.length} 處（${[...new Set(orangeHits.map((x) => (x.ctx || x.sel) + "." + x.prop))].join("、") || "無"}）`);
      if (disallowed.length) bad.orange.push(`${w}px ${label}：${disallowed.map((x) => x.sel + " " + x.prop).join("、")}`);
      if (r.brandText.length) bad.orange.push(`${w}px ${label} 文字色為品牌色/強調橘：${r.brandText.join("、")}`);
      if (r.whiteOn.length) bad.orange.push(`${w}px ${label} 白字在品牌色/強調橘底：${r.whiteOn.join("、")}`);
      if (tab === "dashboard") scan.ring.push(`${w}px ${r.ring}`);
      if (tab === "part5") scan.p5.push(`${w}px ${r.fill}`);
      scan.bodyBg.push(`${w}px ${label} ${r.body}`);
      const cfail = r.contrast.filter((x) => !x.ok);
      const minR = Math.min(...r.contrast.map((x) => x.ratio));
      scan.contrast.push(`${w}px ${label}：量測 ${r.contrast.length} 處、最小 ${minR}`);
      if (cfail.length) bad.contrast.push(`${w}px ${label}：${cfail.map((x) => `${x.sel}「${x.text}」${x.color}/${x.bg}=${x.ratio}（需 ${x.need}）`).join("；")}`);
      // AC-38-06 卡片與按鈕、AC-38-07 標題與數字
      const c = await p.ev(`(() => { const L = window.__qaL; const v = [...document.querySelectorAll("#app-main .view:not([hidden]) .card, #app-main .view:not([hidden]) section.card")].filter((e, i, a) => L.shown(e) && a.indexOf(e) === i && !e.closest("#view-flashcards"));
        const cards = v.map((e) => { const s = getComputedStyle(e); return { sel: e.className, bg: L.hex(s.backgroundColor), rad: [s.borderTopLeftRadius, s.borderTopRightRadius, s.borderBottomRightRadius, s.borderBottomLeftRadius].join("/"), shadow: s.boxShadow, bw: [s.borderTopWidth, s.borderRightWidth, s.borderBottomWidth, s.borderLeftWidth].join("/"), bs: s.borderTopStyle }; });
        const btns = [...document.querySelectorAll("button.btn, .db-start, #app-nav [data-tab]")].filter(L.shown).map((e) => { const s = getComputedStyle(e); const sides = ["Top", "Right", "Bottom", "Left"].filter((k) => parseFloat(s["border" + k + "Width"]) > 0 && s["border" + k + "Style"] !== "none" && L.hex(s["border" + k + "Color"]) === "#d5d9e0"); return sides.length ? e.className + ":" + e.textContent.trim().slice(0, 8) : null; }).filter(Boolean);
        const stats = [...document.querySelectorAll(".db-stat")].filter(L.shown).map((e) => { const s = getComputedStyle(e); return [s.borderTopWidth, s.borderRightWidth, s.borderBottomWidth, s.borderLeftWidth].every((x) => parseFloat(x) === 0) || s.borderTopStyle === "none"; });
        const titles = [...document.querySelectorAll("#view-dashboard:not([hidden]) .section-title, #view-customizer:not([hidden]) .section-title, #view-customizer:not([hidden]) .cv-section__title, #view-part5:not([hidden]) .p5-number, #view-part5:not([hidden]) .p5-summary__title, #view-part5:not([hidden]) .p5-explain__title")].filter(L.shown).map((e) => { const s = getComputedStyle(e); return { t: e.textContent.trim().slice(0, 10), fs: parseFloat(s.fontSize), fw: Number(s.fontWeight) }; });
        const nums = [...document.querySelectorAll(".db-today__text, .db-stat__value, .db-bars__count, .cz-est-target, .cz-est-daily, .cz-est-weeks, .cz-est-mastered, .cz-firstbar__summary, .cz-level__vocab, .cz-level__daily, .fc-position, .p5-number")].filter(L.shown).map((e) => ({ c: e.className.split(" ")[0], tab: getComputedStyle(e).fontVariantNumeric.includes("tabular-nums") }));
        const statSize = [...document.querySelectorAll(".db-stat__value:not(.db-stat__value--answered)")].filter(L.shown).map((e) => parseFloat(getComputedStyle(e).fontSize));
        return { cards, btns, stats, titles, nums, statSize }; })()`);
      for (const k of c.cards) { const good = k.bg === "#ffffff" && k.rad === "16px/16px/16px/16px" && k.shadow !== "none" && (k.bw === "0px/0px/0px/0px" || k.bs === "none"); if (!good) bad.cards.push(`${w}px ${label} ${k.sel}：${k.bg}、${k.rad}、陰影 ${k.shadow === "none" ? "none" : "有"}、邊框 ${k.bw}`); }
      scan.cards.push(`${w}px ${label} ${c.cards.length} 張`);
      if (c.btns.length) bad.btnBorder.push(`${w}px ${label}：${c.btns.join("、")}`);
      if (c.stats.some((x) => !x)) bad.statBorder.push(`${w}px ${label}`);
      for (const t of c.titles) if (!(t.fs >= 18 && t.fw >= 600)) bad.titles.push(`${w}px ${label}「${t.t}」${t.fs}px/${t.fw}`);
      scan.titles.push(`${w}px ${label} ${c.titles.map((t) => `「${t.t}」${t.fs}/${t.fw}`).join(" ")}`);
      for (const n of c.nums) if (!n.tab) bad.tab.push(`${w}px ${label} ${n.c}`);
      scan.tab.push(`${w}px ${label} ${c.nums.length} 處`);
      for (const s of c.statSize) if (s < 24) bad.statSize.push(`${w}px ${s}px`);
      if (c.statSize.length) scan.statSize.push(`${w}px ${c.statSize.join("/")}px`);
      await shot(p, `r5-${w}-${tab || "firstrun"}`);
    }
  }
  const ringOk = scan.ring.every((x) => x.endsWith(BRAND)), fillOk = scan.p5.every((x) => x.endsWith(BRAND));
  R[bad.orange.length === 0 && ringOk && fillOk ? "pass" : "fail"]("TC-38-01", "AC-38-01", `標題列圖示（.app-logo）依 v0.13 例外不列入。${scan.orange.join("；")}；不允許位置：${bad.orange.join("｜") || "無"}；主環形圖未達成進度色 ${scan.ring.join("、")}；模擬測驗進度條填色 ${scan.p5.join("、")}`);
  const bgOk = scan.bodyBg.every((x) => x.endsWith("rgb(238, 244, 250)"));
  // HSL 檢查 #eef4fa
  const hsl = (() => { const [r, g, b] = [0xee, 0xf4, 0xfa].map((v) => v / 255); const mx = Math.max(r, g, b), mn = Math.min(r, g, b); const l = (mx + mn) / 2; const d = mx - mn; const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1)); let hh = 0; if (d) { if (mx === r) hh = ((g - b) / d) % 6; else if (mx === g) hh = (b - r) / d + 2; else hh = (r - g) / d + 4; } return [Math.round(hh * 60 < 0 ? hh * 60 + 360 : hh * 60), Math.round(s * 100), Math.round(l * 1000) / 10]; })();
  const meta = await p.ev(`(document.querySelector('meta[name="theme-color"]') || {}).content`);
  R[bgOk && bad.cards.length === 0 && hsl[0] >= 190 && hsl[0] <= 220 && hsl[1] >= 15 && hsl[2] >= 94 && hsl[2] <= 98 && MANIFEST.background_color === "#eef4fa" && MANIFEST.theme_color === BRAND && meta === BRAND ? "pass" : "fail"]("TC-38-02", "AC-38-02、AC-34-04",
    `body 背景 ${[...new Set(scan.bodyBg.map((x) => x.split(" ").slice(-3).join(" ")))].join("、")}（#eef4fa，HSL ${hsl[0]}°、${hsl[1]}%、${hsl[2]}%）；區塊卡片 ${scan.cards.join("、")}，不符 ${bad.cards.length}；manifest background_color ${MANIFEST.background_color}、theme_color ${MANIFEST.theme_color}；<meta name="theme-color"> ${meta}`);
  R[bad.contrast.length === 0 ? "pass" : "fail"]("TC-38-04", "AC-38-04", `WCAG 公式量測可見文字（不含停用按鈕、Q-55 語意色、標題列圖示；鎖定列以 opacity 合成）：${scan.contrast.join("；")}；未達標 ${bad.contrast.join("｜") || "無"}`);
  R[bad.cards.length === 0 && bad.btnBorder.length === 0 && bad.statBorder.length === 0 ? "pass" : "fail"]("TC-38-06", "AC-38-06", `區塊卡片 ${scan.cards.join("、")}：白底、四角 16px、有陰影、無邊框，不符 ${bad.cards.join("｜") || "無"}；按鈕以 #d5d9e0 為邊框 ${bad.btnBorder.join("｜") || "無"}；統計格有邊框 ${bad.statBorder.join("｜") || "無"}（單字卡頁卡片、表單欄、色級列選中、作答選項、對話框不在範圍）`);
  R[bad.titles.length === 0 && bad.tab.length === 0 && bad.statSize.length === 0 ? "pass" : "fail"]("TC-38-07", "AC-38-07", `區塊標題 ${scan.titles.join("；")}；不符 ${bad.titles.join("、") || "無"}；tabular-nums 檢查 ${scan.tab.join("、")}，缺 ${bad.tab.join("、") || "無"}；3 格數據數值字級 ${scan.statSize.join("、")}，< 24px ${bad.statSize.join("、") || "無"}（@font-face 與外部字型見 TC-S01、TC-L-S01）`);
  await p.close();
}

// AC-38-03：v0.11 與 v0.12 語意色相同
{
  const read = async (url, isNew) => {
    const p = await open({ autoStart: false }); await p.goto(url); await p.ev(`localStorage.clear()`); await p.goto(url); await sleep(300);
    const vars = await p.ev(`(() => { const s = getComputedStyle(document.documentElement); return ["--color-orange", "--color-brown", "--color-green", "--color-blue", "--color-gold", "--correct", "--wrong", "--light-green", "--light-yellow", "--light-red"].map((k) => k + "=" + s.getPropertyValue(k).trim().toLowerCase()).join(" "); })()`);
    let elems = {};
    if (isNew) {
      elems.bars = await p.ev(`[...document.querySelectorAll(".cz-level__bar")].map((e) => window.__qaL.hex(getComputedStyle(e).backgroundColor)).join(",")`);
      elems.selBorder = await p.ev(`window.__qaL.hex(getComputedStyle(document.querySelector(".cz-level[aria-pressed=true]")).borderTopColor)`);
    }
    await p.click("#cz-start"); await sleep(400);
    if (isNew) {
      const dots = [];
      for (const c of ["orange", "brown", "green", "blue", "gold"]) { await goTab(p, "customizer"); await clickCard(p, c); await apply(p, "leave"); await goTab(p, "dashboard"); dots.push(await p.ev(`window.__qaL.hex(getComputedStyle(document.querySelector(".db-goal__dot")).backgroundColor)`)); }
      elems.dots = dots.join(",");
      await seedAt(p, stateRecord(725, { todayLearned: { date: TODAY, wordKeys: Array.from({ length: 15 }, (_, i) => "w" + i) }, learnedHistory: { [TODAY]: 15 } }), url);
      await goTab(p, "dashboard"); elems.gold = await p.ev(`window.__qaL.hex(getComputedStyle(document.querySelector(".db-ring--done .db-ring__bar")).stroke)`);
    }
    // 模擬測驗對錯色（兩版同一題）
    await seedAt(p, stateRecord(725), url); await goTab(p, "part5");
    const ci = await p.ev(`PART5_QUESTION_BANK[0].correctIndex`);
    await p.click("[data-p5=option]", (ci + 1) % 4); await sleep(200);
    const p5 = await p.ev(`[...document.querySelectorAll("[data-p5=option]")].map((b) => b.dataset.state + ":" + getComputedStyle(b).borderTopColor + "/" + getComputedStyle(b).backgroundColor + "/" + getComputedStyle(b).color).filter((x) => /correct|wrong/.test(x)).join(" ")`);
    await p.close();
    return { vars, p5, ...elems };
  };
  const a = await read(V011_URL, false), b = await read(FILE_URL, true);
  const lv = "#e8833a,#8b5a2b,#2e9e5b,#2f6fd6,#c9a227";
  const ok = a.vars === b.vars && a.p5 === b.p5 && b.vars.includes("--color-blue=#2f6fd6") && b.bars === lv && b.dots === "#e8833a,#8b5a2b,#2e9e5b,#2e9e5b,#2e9e5b" /* 第 6 輪：色點依生效色級（SD-FB-53、AC-39-04 v0.14），藍、金套用時為綠；色值本身不變 */ && b.gold === "#c9a227" && b.selBorder === "#2e9e5b" && b.vars.includes("--correct=#15803d") && b.vars.includes("--wrong=#b91c1c") && /--light-green=#16a34a.*--light-yellow=#ca8a04.*--light-red=#dc2626/.test(b.vars);
  R[ok ? "pass" : "fail"]("TC-38-03", "AC-38-03、AC-40-03（對錯色）", `語意色變數 v0.11「${a.vars}」／v0.12「${b.vars}」相同=${a.vars === b.vars}；v0.12 色級列色條 ${b.bars}、選中框 ${b.selBorder}、目標行色點 ${b.dots}、達成金環 ${b.gold}；模擬測驗答錯後選項色 v0.11「${a.p5}」／v0.12「${b.p5}」相同=${a.p5 === b.p5}；藍色級未被品牌色取代=${b.vars.includes("--color-blue=#2f6fd6")}（STT 燈號以變數比對，元素見 TC-08 系列）`);
}

// AC-38-05：標題列圖示與名稱（file:// 連網與斷網）
{
  const out = []; let ok = true;
  for (const offline of [false, true]) {
    const p = await open({ autoStart: false });
    if (offline) await p.send("Network.emulateNetworkConditions", { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    for (const [w, h] of TWO) {
      await p.viewport(w, h); await p.ev(`localStorage.clear()`).catch(() => {}); await p.goto();
      for (const tab of [null, "dashboard", "customizer", "flashcards", "part5", "sources"]) {
        if (tab === "dashboard") { await p.click("#cz-start"); await sleep(400); }
        if (tab) await goTab(p, tab);
        const r = await p.ev(`(() => { const h1 = document.querySelector("h1.app-title"); const lg = h1 && h1.querySelector(".app-logo"); const t = h1 && h1.querySelector(".app-title__text"); const L = window.__qaL;
          const lr = lg ? lg.getBoundingClientRect() : null; const tr = t ? t.getBoundingClientRect() : null;
          return { name: h1 ? h1.textContent.trim() : null, tag: lg ? lg.tagName.toLowerCase() : null, w: lr && Math.round(lr.width * 10) / 10, h: lr && Math.round(lr.height * 10) / 10, hidden: lg ? (lg.getAttribute("aria-hidden") === "true" || lg.getAttribute("alt") === "") : false,
            order: !!(lg && t && lr.right <= tr.left + 0.5), clipped: t ? t.scrollWidth > t.clientWidth + 0.5 || tr.right > document.documentElement.clientWidth : true, ext: lg ? /href|src=|url\\(|<image/i.test(lg.outerHTML) : true,
            colors: lg ? [...lg.querySelectorAll("*")].map((e) => L.hex(getComputedStyle(e).fill)).join(",") : "", shown: !!lg && L.shown(lg) }; })()`);
        const good = r.name === "EnglishContext" && r.tag === "svg" && r.w === r.h && r.w >= 24 && r.w <= 40 && r.hidden && r.order && !r.clipped && !r.ext && r.shown && r.colors.startsWith(BRAND) && r.colors.includes(ACCENT);
        ok = ok && good; if (!good || (tab === null && w === 375)) out.push(`${offline ? "斷網" : "連網"} ${w}px ${tab || "首次畫面"}：${JSON.stringify(r)}`);
      }
    }
    const reqs = p.log.requests.filter((x) => !/^(blob|data):/.test(x.url) && !(x.type === "Document" && x.url.startsWith("file://")));
    ok = ok && reqs.length === 0; out.push(`${offline ? "斷網" : "連網"}：主文件以外的請求 ${reqs.length}${reqs.length ? JSON.stringify(reqs.map((x) => x.url.slice(0, 60))) : ""}`);
    await p.close();
  }
  const size = fs.statSync(DIST).size;
  ok = ok && size <= 5242880;
  R[ok ? "pass" : "fail"]("TC-38-05", "AC-38-05、AC-21-01 (a)", out.join("；") + `；首次畫面、4 個功能區、資料來源頁 × 兩種寬度 × 連網／斷網皆檢查；交付檔 ${size.toLocaleString()} bytes ≤ 5 MB`);
}

// AC-38-08：單字卡頁結構與 v0.11 相同（單字卡模式、測驗模式；兩種寬度；固定 Math.random）
{
  const dump = (root) => { const out = []; const walk = (e, d) => { const s = getComputedStyle(e); if (e.hidden || s.display === "none") return; const r = e.getBoundingClientRect();
    const own = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(" ");
    out.push({ d, k: e.tagName.toLowerCase() + "." + String(e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className).trim(), t: own.slice(0, 40), x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) });
    for (const c of e.children) walk(c, d + 1); }; walk(document.querySelector(root), 0); return out; };
  const take = async (url) => {
    const p = await open({ inits: [FIXED_RANDOM], autoStart: false }); const res = {};
    await p.goto(url); await p.ev(`localStorage.clear()`); await p.ev(`localStorage.setItem(${JSON.stringify(KEY)}, ${JSON.stringify(JSON.stringify(stateRecord(725, { sttNoticeAcknowledged: true })))})`);
    for (const [w, h] of TWO) {
      await p.viewport(w, h); await p.goto(url); await goTab(p, "flashcards");
      res[`${w}-card`] = await fnEv(p, dump, "#view-flashcards");
      await p.click(".fc-mode-btn"); await sleep(250);
      res[`${w}-quiz`] = await fnEv(p, dump, "#view-flashcards");
      await p.click(".fc-mode-btn"); await sleep(150);
      await shot(p, `r5-fc-${url === FILE_URL ? "v012" : "v011"}-${w}`);
    }
    await p.close(); return res;
  };
  const a = await take(V011_URL), b = await take(FILE_URL);
  const out = []; let ok = true; const geo = [];
  for (const k of Object.keys(a)) {
    // AC-38-08（v0.17）：搭配詞標籤文字依 AC-06-01，不視為差異（v0.11「多益常考搭配詞」→ LT-1「常用搭配詞」），其餘結構與文字仍須相同
    const sa = a[k].map((x) => `${x.d}|${x.k}|${x.t === "多益常考搭配詞" ? "常用搭配詞" : x.t}`), sb = b[k].map((x) => `${x.d}|${x.k}|${x.t}`);
    const same = JSON.stringify(sa) === JSON.stringify(sb);
    const diffs = []; for (let i = 0; i < Math.max(sa.length, sb.length); i++) if (sa[i] !== sb[i]) { diffs.push(`#${i} v0.11「${sa[i]}」≠ v0.12「${sb[i]}」`); if (diffs.length > 3) break; }
    const rel = (arr) => arr.map((x) => ({ ...x, x: x.x - arr[0].x, y: x.y - arr[0].y }));
    const ra = rel(a[k]), rb = same ? rel(b[k]) : [];
    const movedEl = same ? ra.map((x, i) => [x, rb[i]]).filter(([x, y]) => Math.abs(x.x - y.x) > 1 || Math.abs(x.y - y.y) > 1 || Math.abs(x.w - y.w) > 1 || Math.abs(x.h - y.h) > 1) : [];
    const moved = movedEl.map(([x, y]) => `${x.k}「${x.t.slice(0, 6)}」(${x.x},${x.y},${x.w}×${x.h})→(${y.x},${y.y},${y.w}×${y.h})`);
    const meterA = ra.find((x) => /sp-meter|sp-level/.test(x.k)), meterB = same ? rb.find((x) => /sp-meter|sp-level/.test(x.k)) : null;
    const meterSame = !meterA || (meterB && Math.abs(meterA.x - meterB.x) <= 1 && Math.abs(meterA.y - meterB.y) <= 1);
    ok = ok && meterSame; if (meterA) geo.push(`${k} 收音條相對位置 v0.11 (${meterA.x},${meterA.y}) v0.12 (${meterB && meterB.x},${meterB && meterB.y})`);
    ok = ok && same; out.push(`${k}：元素 ${sa.length}/${sb.length}、順序與文字相同=${same}${diffs.length ? "（" + diffs.join("；") + "）" : ""}`);
    geo.push(`${k} 相對頁面原點位置或尺寸差 > 1px 的元素 ${moved.length}${moved.length ? "（" + moved.slice(0, 6).join("、") + "）" : ""}`);
  }
  R[ok ? "pass" : "fail"]("TC-38-08", "AC-38-08", `v0.11（4fcbb9f）與 v0.12 單字卡頁元素樹（標籤、class、文字、順序）比對：${out.join("；")}；幾何（收音條相對位置列入判定，其餘參考）：${geo.join("；")}；截圖 tests/results/diag/layout-r5/r5-fc-*.png。AC-06～09、28、33 照常見既有套件`);
}

// AC-38-09：鍵盤、焦點框、觸控目標、減少動態
{
  const out = []; let ok = true;
  for (const reduce of [false, true]) {
    const p = await open({ autoStart: false });
    try {
    if (reduce) await p.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
    await p.viewport(1366, 900); await p.goto();
    // 首次畫面：Tab 依序到「開始學習」，Enter 生效
    const tabTo = async (pred, max = 60) => { for (let i = 0; i < max; i++) { await p.key("Tab", "Tab", 9); const a = await p.ev(`(() => { const e = document.activeElement; return e ? { id: e.id, cls: typeof e.className === "string" ? e.className : "", text: (e.innerText || "").trim().slice(0, 12), outline: getComputedStyle(e).outlineStyle + " " + getComputedStyle(e).outlineWidth, w: e.getBoundingClientRect().width, h: e.getBoundingClientRect().height } : null; })()`); if (a && pred(a)) return a; } return null; };
    await p.ev(`document.activeElement && document.activeElement.blur(); window.scrollTo(0, 0)`);
    const fr = await tabTo((a) => a.id === "cz-start");
    await enter(p); await sleep(450);
    const entered = await p.ev(`document.body.dataset.entry`);
    // 主控台：開始今日學習 → 變更 → 資料備份（Tab 順序由上到下）
    await goTab(p, "dashboard"); await p.ev(`document.activeElement && document.activeElement.blur(); window.scrollTo(0, 0)`);
    const seq = [];
    for (let i = 0; i < 40 && seq.length < 3; i++) { await p.key("Tab", "Tab", 9); const a = await p.ev(`(() => { const e = document.activeElement; const tag = e.classList.contains("db-start") ? "start" : e.classList.contains("db-change") ? "change" : e.classList.contains("db-backup__toggle") ? "toggle" : null; return tag ? { tag, outline: getComputedStyle(e).outlineStyle + " " + parseFloat(getComputedStyle(e).outlineWidth), w: e.getBoundingClientRect().width, h: e.getBoundingClientRect().height } : null; })()`); if (a && !seq.some((s) => s.tag === a.tag)) seq.push(a); }
    // 「資料備份」以空白鍵展開、Enter 收合
    await p.ev(`document.querySelector(".db-backup__toggle").focus()`);
    await space(p); await sleep(80); const ex1 = await p.ev(`document.querySelector(".db-backup__toggle").getAttribute("aria-expanded")`);
    const anim = await p.ev(`(() => { const els = [".db-backup__chev", ".db-backup__body", ".db-start", ".db-change", ".db-backup__toggle"].map((s) => document.querySelector(s)).filter(Boolean); return { running: document.getAnimations().length, trans: els.map((e) => getComputedStyle(e).transitionDuration).join("/") }; })()`);
    await enter(p); await sleep(80); const ex2 = await p.ev(`document.querySelector(".db-backup__toggle").getAttribute("aria-expanded")`);
    // 「變更」以 Enter；「開始今日學習」以空白鍵
    await p.ev(`document.querySelector(".db-change").focus()`); await enter(p); await sleep(400); const t1 = await p.ev(`EMT.router.current()`);
    await goTab(p, "dashboard"); await p.ev(`document.querySelector(".db-start").focus()`); await space(p); await sleep(400); const t2 = await p.ev(`EMT.router.current()`);
    // 模擬測驗進度條轉場
    await goTab(p, "part5"); const p5 = await p.ev(`(() => { const f = document.querySelector(".p5-progress__fill"); return f ? getComputedStyle(f).transitionDuration + "/" + getComputedStyle(f).transitionProperty : "無"; })()`);
    const ns = (s) => s.split(/[\/,]/).every((x) => parseFloat(x) === 0);
    const good = !!fr && /solid|auto/.test(fr.outline) && parseFloat(fr.outline.split(" ")[1]) >= 2 && fr.w >= 44 && fr.h >= 44 && entered === "main"
      && seq.map((s) => s.tag).join(",") === "start,change,toggle" && seq.every((s) => /solid|auto/.test(s.outline) && parseFloat(s.outline.split(" ")[1]) >= 2 && s.w >= 44 && s.h >= 44)
      && ex1 === "true" && ex2 === "false" && t1 === "customizer" && t2 === "flashcards" && (!reduce || (anim.running === 0 && ns(anim.trans) && /^0s/.test(p5)));
    ok = ok && good;
    out.push(`${reduce ? "(b) 減少動態" : "(a) 一般"}：首次畫面 Tab 到「開始學習」焦點框 ${fr && fr.outline}、${fr && Math.round(fr.w)}×${fr && Math.round(fr.h)}，Enter → ${entered}；主控台 Tab 順序 ${seq.map((s) => `${s.tag}(${s.outline}，${Math.round(s.w)}×${Math.round(s.h)})`).join(" → ")}；空白鍵展開 ${ex1}、Enter 收合 ${ex2}；展開後動畫 ${anim.running} 個、轉場 ${anim.trans}；「變更」Enter → ${t1}、「開始今日學習」空白鍵 → ${t2}；進度條轉場 ${p5}`);
    } catch (e) { ok = false; out.push(`${reduce ? "(b)" : "(a)"} 例外：${e.message.slice(0, 200)}`); }
    await p.close();
  }
  R[ok ? "pass" : "fail"]("TC-38-09", "AC-38-09、AC-31-03", out.join("｜") + "（首次畫面 Tab 順序見 TC-41-04；AC-28-07 見既有 TC-28-07）");
}

// AC-38-10：名稱 EnglishContext 與不改清單
{
  const out = []; let ok = true;
  const p = await open({ autoStart: false });
  await p.goto();
  const texts = [];
  const grab = async (label) => { const t = await p.ev(`document.title + "\\n" + document.body.innerText + "\\n" + [...document.querySelectorAll("[aria-label]")].map((e) => e.getAttribute("aria-label")).join(" ")`); texts.push([label, t]); };
  await grab("首次畫面");
  await p.click("#footer-sources"); await sleep(350); await grab("首次畫面→資料來源"); await p.click("#view-sources .site-return"); await sleep(350);
  await p.click("#cz-start"); await sleep(400);
  for (const tab of ["dashboard", "customizer", "flashcards", "part5", "sources"]) { await goTab(p, tab); if (tab === "sources") await p.ev(`document.querySelectorAll("#view-sources details").forEach((d) => d.open = true)`); await grab(tab); }
  // 對話框與 Toast：初始化確認視窗（有學習紀錄）、匯入確認、套用 toast
  await seed(p, stateRecord(725, { masteredWordKeys: ["the"], vocabQuiz: { answered: 1, correct: 1 } }));
  await goTab(p, "customizer"); await clickCard(p, "orange"); await p.click("#cz-apply"); await sleep(200); await grab("初始化確認視窗"); await p.click('.dialog [data-action="cancel"]'); await sleep(200);
  await clickCard(p, "blue"); await p.click("#cz-apply"); await sleep(150); const toastT = await p.ev(`window.__qaToasts.map((t) => t.text).join(" | ")`); texts.push(["Toast", toastT]);
  const hits = texts.filter(([, t]) => /english\s*master\s*track/i.test(t)).map(([l]) => l);
  const title = await p.ev(`document.title`);
  const orig = (texts.find(([l]) => l === "sources")[1].match(/原創內容來源：[^\n]*/) || [null])[0]; // 資料來源頁顯示時擷取的可見文字
  const html = fs.readFileSync(DIST, "utf8"); const first = (html.match(/<!--\s*\n?([^\n]*)/) || [])[1];
  ok = ok && hits.length === 0 && title === "EnglishContext｜英文單字卡與模擬測驗" && orig === "原創內容來源：EnglishContext 原創內容" && /^\s*EnglishContext\s*$/.test(first || "");
  out.push(`(1) <title>「${title}」；畫面文字含 English Master Track 的畫面 ${hits.length}（${hits.join("、") || "無"}；檢查 ${texts.map(([l]) => l).join("、")}）；資料來源頁「${orig}」；HTML 開頭註解第一行「${(first || "").trim()}」`);
  // (2) 不變項：匯出檔名、localStorage 鍵、schemaVersion、備份 format
  await goTab(p, "dashboard"); await p.click(".db-backup__toggle"); await sleep(80);
  for (const f of fs.readdirSync(p.downloads)) fs.rmSync(path.join(p.downloads, f), { force: true });
  await p.click('[data-action="export-backup"]');
  let files = []; for (let i = 0; i < 40; i++) { await sleep(100); files = fs.readdirSync(p.downloads).filter((f) => f.endsWith(".json")); if (files.length) break; }
  const bj = files.length ? JSON.parse(fs.readFileSync(path.join(p.downloads, files[0]), "utf8")) : {};
  const keys = await p.ev(`Object.keys(localStorage)`); const st = await readState(p);
  const d = new Date(); const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const ok2 = files[0] === `english-master-track-backup-${ymd}.json` && keys.includes("englishMasterTrack:state") && keys.every((k) => k.startsWith("englishMasterTrack:")) && st.schemaVersion === 3 && bj.format === "english-master-track-backup" && bj.schemaVersion === 3
    && fs.existsSync(path.join(ROOT, "dist", "english-master-track.html")) && /var CACHE_PREFIX = "english-master-track-pwa-";/.test(fs.readFileSync(path.join(ROOT, "dist", "site", "sw.js"), "utf8"));
  ok = ok && ok2;
  out.push(`(2) 匯出檔名 ${files[0]}；localStorage 鍵 ${JSON.stringify(keys)}、schemaVersion ${st.schemaVersion}；備份 format ${bj.format}、schemaVersion ${bj.schemaVersion}、欄位 ${Object.keys(bj.data || {}).join(",")}；交付檔名 dist/english-master-track.html 存在；sw.js 快取前綴 english-master-track-pwa-`);
  // (3) 授權聲明
  const src = texts.find(([l]) => l === "sources")[1];
  const ok3 = src.includes("Copyright JimmyLin") && src.includes("PWA 圖示由 AI 依 JimmyLin 的構想生成；圖示與名稱「EnglishContext」作為品牌標識使用，JimmyLin 保留其享有的權利，不適用 MIT 與 CC BY-SA 4.0");
  ok = ok && ok3; out.push(`(3) MIT 聲明 Copyright JimmyLin 與品牌標識聲明 LT-4（v0.17）=${ok3}`);
  await p.close();
  // (2) v0.11 寫入的 localStorage 與 v0.11 備份
  const q = await open({ autoStart: false });
  await q.goto(V011_URL); await q.ev(`localStorage.clear()`); await q.goto(V011_URL);
  await q.click("#cz-start"); await sleep(400);
  await q.ev(`EMT.router.go("customizer")`); await sleep(300); await q.click('.cz-color[data-color="brown"]'); await q.click("#cz-apply"); await sleep(150);
  await q.ev(`EMT.router.go("flashcards")`); await sleep(300); await q.click(".fc-flip"); await sleep(450);
  await q.ev(`EMT.router.go("part5")`); await sleep(300); await q.click("[data-p5=option]", 0); await sleep(150);
  const v11ls = await lsAll(q); const v11backup = await q.ev(`EMT.store.actions.exportBackup().json`);
  await q.goto(); await sleep(300);
  const after = await lsAll(q); const entry = await q.ev(`document.body.dataset.entry`); const tab = await q.ev(`EMT.router.current()`); const g = await dashGoal(q);
  const v11d = JSON.parse(JSON.parse(v11ls)[KEY]).data, newD = JSON.parse(JSON.parse(after)[KEY]).data;
  // 第 7 輪（PRD v0.15 共通規則 2、C-8）：v0.11 的 schemaVersion 2 資料以 1.1.0 開啟會遷移為 3 並補 3 個新欄位預設值；原 9 欄須逐欄相同（AC-47-04）
  const sameData = Object.keys(v11d).every((k) => JSON.stringify(v11d[k]) === JSON.stringify(newD[k])) && Object.keys(newD).length === Object.keys(v11d).length + 3
    && newD.flashcardPosition === null && JSON.stringify(newD.part5CorrectIds) === "[]" && newD.part5UnansweredOnly === false;
  // v0.11 備份匯入 v0.12
  const f = path.join(TMP, "v011-backup.json"); fs.writeFileSync(f, v11backup);
  await q.ev(`localStorage.setItem(${JSON.stringify(KEY)}, ${JSON.stringify(JSON.stringify(stateRecord(725)))})`); await q.goto(); await sleep(250);
  await q.click(".db-backup__toggle"); await sleep(80); const n = await q.ev(`window.__qaToasts.length`);
  q.chooser = null; await q.click('[data-action="import-backup"]'); for (let i = 0; i < 40 && !q.chooser; i++) await sleep(50);
  await q.send("DOM.setFileInputFiles", { files: [f], backendNodeId: q.chooser.backendNodeId }); await sleep(300);
  if (await q.ev(`!!document.querySelector(".dialog")`)) { await q.click('.dialog [data-action="ok"]'); await sleep(400); }
  const t = await q.ev(`window.__qaToasts.slice(${n}).map((x) => x.text)`); const imp = (await readState(q)).data;
  const ok4 = entry === "main" && tab === "dashboard" && sameData && g === GOAL_LINE.brown && t.some((x) => x.startsWith("已匯入")) && imp.goal.appliedScore === 465 && imp.part5.totalAnswered === 1;
  ok = ok && ok4;
  out.push(`(2) v0.11 寫入的 localStorage 以 v0.12 開啟 → ${entry}/${tab}、原 9 欄逐欄相同且新 3 欄為預設=${sameData}、目標行「${g}」；v0.11 備份匯入 → ${JSON.stringify(t)}、goal ${imp.goal.appliedScore}/${imp.goal.effectiveColor}、模擬測驗答題 ${imp.part5.totalAnswered}`);
  await q.close();
  R[ok ? "pass" : "fail"]("TC-38-10", "AC-38-10、AC-24-03", out.join("；"));
}

// ═════════ US-39 主控台 ═════════
{
  const p = await open();
  await p.goto(); await seed(p, richRecord());
  // AC-39-01、AC-39-02（兩種寬度與 1920）
  {
    const out = []; let ok = true;
    for (const [w, h] of [...TWO, [1920, 1080]]) {
      await p.viewport(w, h); await goTab(p, "dashboard");
      const r = await p.ev(`(() => { const d = document.querySelector("#view-dashboard .dashboard"); const kids = [...d.children].filter((e) => window.__qaL.shown(e));
        const name = (e) => e.classList.contains("page-title") ? "title" : e.classList.contains("db-today") ? "today" : e.classList.contains("db-stats") ? "stats" : e.classList.contains("db-chart") ? "chart" : e.classList.contains("db-backup") ? "backup" : e.className;
        const byTop = kids.slice().sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top || a.getBoundingClientRect().left - b.getBoundingClientRect().left).map(name);
        const footer = document.getElementById("app-footer").getBoundingClientRect().top >= kids[kids.length - 1].getBoundingClientRect().bottom - 0.5;
        const ring = document.querySelector(".db-ring-wrap").getBoundingClientRect(), st = document.querySelector(".db-start").getBoundingClientRect(), goal = document.querySelector(".db-goal").getBoundingClientRect();
        const s = getComputedStyle(document.querySelector(".db-start"));
        const txt = d.innerText;
        return { dom: kids.map(name).join(","), top: byTop.join(","), footer, titleText: kids[0].textContent, side: st.left >= ring.right - 0.5 && st.top < ring.bottom && st.bottom > ring.top, below: goal.top >= Math.max(ring.bottom, st.bottom) - 0.5,
          bw: Math.round(st.width), bh: Math.round(st.height), nowrap: s.whiteSpace, oneLine: st.height < parseFloat(s.lineHeight || "24") * 2 + 24, clip: document.querySelector(".db-start").scrollWidth > document.querySelector(".db-start").clientWidth + 0.5,
          bg: window.__qaL.hex(s.backgroundColor), fg: window.__qaL.hex(s.color), banned: ["功能入口", "學習統計", "目前目標"].filter((x) => txt.includes(x)), tiles: document.querySelectorAll("#view-dashboard .dash-entry, #view-dashboard .db-tile").length }; })()`);
      const good = r.dom === "title,today,stats,chart,backup" && r.top === r.dom && r.footer && r.titleText === "學習主控台" && r.side && r.below && r.bw >= 44 && r.bh >= 44 && r.oneLine && !r.clip && r.bg === ACCENT && r.fg === "#1f2937" && r.banned.length === 0 && r.tiles === 0;
      ok = ok && good; out.push(`${w}px：DOM ${r.dom}、畫面 ${r.top}、頁尾在後=${r.footer}；按鈕在環形圖右側=${r.side}、目標行在下方=${r.below}、按鈕 ${r.bw}×${r.bh} ${r.bg}/${r.fg} 不換行=${r.oneLine} 裁切=${r.clip}；禁止區塊 ${r.banned.join("、") || "無"}、圖示磚 ${r.tiles}`);
      await shot(p, `r5-dash-${w}`);
    }
    const [o1, o2] = [out.join("；"), ""];
    R[ok ? "pass" : "fail"]("TC-39-01", "AC-39-01", o1);
    R[ok ? "pass" : "fail"]("TC-39-02", "AC-39-02", "同 TC-39-01 量測：今日任務卡內主環形圖「今日已學 X / D 字」、「開始今日學習」位於環形圖右側並排、目標行在兩者下方；按鈕強調橘底深色字、≥ 44×44、不換行不裁切" + o2);
  }
  // AC-39-03：開始今日學習
  await R.check("TC-39-03", "AC-39-03、AC-22-01（量測方式）", async () => {
    await p.viewport(1366, 768); await goTab(p, "dashboard");
    const before = await lsAll(p);
    const times = [];
    for (let i = 0; i < 5; i++) {
      await goTab(p, "dashboard");
      times.push(await p.ev(`(async () => { const b = document.querySelector(".db-start"); const t0 = performance.now(); b.click(); await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0))); return +(performance.now() - t0).toFixed(1); })()`));
      await sleep(350);
    }
    const st = await p.ev(`({ tab: EMT.router.current(), visible: !document.getElementById("view-flashcards").hidden, cur: (document.querySelector('#app-nav [aria-current="page"]') || {}).dataset ? document.querySelector('#app-nav [aria-current="page"]').dataset.tab : null })`);
    const after = await lsAll(p);
    const viaNav = await (async () => { await goTab(p, "dashboard"); await p.click('#app-nav [data-tab="flashcards"]'); await sleep(350); return p.ev(`[EMT.router.current(), document.querySelector('#app-nav [aria-current="page"]').dataset.tab].join()`); })();
    const med = [...times].sort((a, b) => a - b)[2];
    return { ok: st.tab === "flashcards" && st.visible && st.cur === "flashcards" && before === after && med <= 100 && viaNav === "flashcards,flashcards", note: `點「開始今日學習」→ 目前頁 ${st.tab}、單字卡頁可見=${st.visible}、導覽選中 ${st.cur}（與點導覽「單字卡」結果 ${viaNav} 相同）；localStorage 前後逐字相同=${before === after}；點擊到下一畫格 ms ${times.join("、")}（中位數 ${med}，無頭 Chrome 參考值）；鍵盤操作見 TC-38-09；單字集為空見 TC-39-03b` };
  });
  // AC-39-04：目標行 5 色與「變更」
  await R.check("TC-39-04", "AC-39-04、AC-17-06、E-92", async () => {
    const out = []; let ok = true;
    await seed(p, stateRecord(725));
    for (const c of ["orange", "brown", "green", "blue", "gold"]) {
      await goTab(p, "customizer"); await clickCard(p, c); await apply(p, "leave"); await goTab(p, "dashboard");
      const g = await dashGoal(p); const ch = await p.ev(`(() => { const b = document.querySelector(".db-change"); const r = b.getBoundingClientRect(); return { tag: b.tagName, w: Math.round(r.width), h: Math.round(r.height) }; })()`);
      const good = g === GOAL_LINE[c] && !/分數/.test(g) && ch.tag === "BUTTON" && ch.w >= 44 && ch.h >= 44; ok = ok && good; out.push(`${c}「${g}」（變更 ${ch.w}×${ch.h}）`);
    }
    await p.click(".db-change"); await sleep(400);
    const gen = await p.ev(`({ tab: EMT.router.current(), entry: document.body.dataset.entry, apply: !!document.getElementById("cz-apply") && window.__qaL.shown(document.getElementById("cz-apply")), custom: window.__qaL.shown(document.getElementById("customizer-custom")), nav: window.__qaL.shown(document.getElementById("app-nav")) })`);
    ok = ok && gen.tab === "customizer" && gen.entry === "main" && gen.apply && gen.custom && gen.nav;
    return { ok, note: out.join("；") + `；點「變更」→ ${JSON.stringify(gen)}（一般難易度設定頁）` };
  });
  // AC-39-05、AC-17-01、AC-30-10：3 格數據
  await R.check("TC-39-05", "AC-39-05、AC-17-01、AC-30-10", async () => {
    await seed(p, stateRecord(215)); // 橘：單字集 1,000
    const keys = await p.ev(`MASTER_VOCAB_DATABASE.slice().sort((a, b) => a.rank - b.rank).map((w) => w.word.normalize("NFC").trim().replace(/\\s+/g, " ").toLowerCase())`);
    const mk = [...keys.slice(0, 250), ...keys.slice(2000, 2010)];
    await seed(p, stateRecord(215, { masteredWordKeys: mk, vocabQuiz: { answered: 260, correct: 260 }, part5CorrectIds: Array.from({ length: 48 }, (_, i) => "p5-" + String(i + 1).padStart(3, "0")), streak: { days: 3, lastActiveDate: TODAY }, part5: { currentIndex: 10, lockedSelection: null, phase: "question", roundAnswered: 10, roundCorrect: 7, totalAnswered: 10, totalCorrect: 7 } }));
    const out = []; let ok = true;
    for (const [w, h] of TWO) {
      await p.viewport(w, h); await goTab(p, "dashboard");
      const r = await p.ev(`(() => { const L = window.__qaL; const cells = [...document.querySelectorAll("#view-dashboard .db-stat")]; const tops = cells.map((c) => Math.round(c.getBoundingClientRect().top)); const lefts = cells.map((c) => Math.round(c.getBoundingClientRect().left));
        const t = (s) => (document.querySelector(s) || {}).textContent; const num = document.querySelector(".db-stat--streak .db-stat__num"); const icon = document.querySelector(".db-stat--streak .db-stat__icon");
        const clipped = cells.flatMap((c) => [...c.querySelectorAll("*")]).filter((e) => L.ownText(e) && (e.scrollWidth > e.clientWidth + 0.5)).map((e) => e.className);
        return { n: cells.length, row: new Set(tops).size === 1, ordered: lefts[0] < lefts[1] && lefts[1] < lefts[2], labels: cells.map((c) => c.querySelector(".db-stat__label").textContent).join("、"),
          streak: t(".db-stat--streak .db-stat__num") + t(".db-stat--streak .db-stat__unit"), numColor: L.hex(getComputedStyle(num).color), icon: icon ? L.hex(getComputedStyle(icon).fill) : null,
          mastery: t(".db-stat--mastery .db-stat__value"), sub: t(".db-stat--mastery .db-stat__sub"), subSmall: parseFloat(getComputedStyle(document.querySelector(".db-stat--mastery .db-stat__sub")).fontSize) < parseFloat(getComputedStyle(document.querySelector(".db-stat--mastery .db-stat__value")).fontSize),
          acc: t(".db-stat--answered .db-stat__value"), rings: document.querySelectorAll(".db-stats svg:not(.db-stat__icon)").length, clipped }; })()`);
      const good = r.n === 3 && r.row && r.ordered && r.labels === "連續打卡天數、單字掌握率、模擬測驗" && r.streak === "3天" && r.numColor !== ACCENT && r.icon === ACCENT && r.mastery === "25%" && r.sub === "已掌握 260 字" && r.subSmall && r.acc === "已答對 48 / 200 題（24%）" && r.rings === 0 && r.clipped.length === 0;
      ok = ok && good; out.push(`${w}px：${JSON.stringify(r)}`);
    }
    return { ok, note: out.join("；") + "。PRD 範例為 200 字/50 字/另 10 字；正式資料最小單字集為 1,000（橘），以同比例 250/1,000 + 集外 10 驗證；無資料「—」見 TC-30-10b" };
  });
  // AC-39-06：去除重複
  await R.check("TC-39-06", "AC-39-06、AC-23-02", async () => {
    await seed(p, stateRecord(725)); await p.viewport(1366, 768); await goTab(p, "dashboard");
    const out = []; let ok = true;
    for (const [w, h] of TWO) {
      await p.viewport(w, h); await goTab(p, "dashboard");
      const r = await p.ev(`(() => { const d = document.querySelector("#view-dashboard .dashboard"); const t = d.innerText; const c = (s) => t.split(s).length - 1;
        const xd = (t.match(/今日已學 \\d+ \\/ \\d+/g) || []).length; /* v0.19：已答對行也含「K / Q」，只計今日已學（AC-39-06） */
        const goTargets = [...d.querySelectorAll("[data-go], a[href], button")].filter((e) => window.__qaL.shown(e)).map((e) => (e.dataset.go || "") + ":" + e.textContent.trim()).filter((x) => /^(customizer|flashcards|part5|sources|dashboard):/.test(x));
        return { acc: c("已答對 "), mas: c("單字掌握率"), streak: c("連續打卡天數"), xd, color: c("綠級"), banned: ["目前目標色級", "目前生效色級", "單字掌握數", "資料來源與授權"].filter((x) => t.includes(x)), minis: d.querySelectorAll(".db-mini").length, goTargets,
          footer: window.__qaL.shown(document.getElementById("footer-sources")) }; })()`);
      const good = r.acc === 1 && r.mas === 1 && r.streak === 1 && r.xd === 1 && r.color === 1 && r.banned.length === 0 && r.minis === 0 && r.goTargets.join("、") === "flashcards:開始今日學習、customizer:變更" && r.footer;
      ok = ok && good; out.push(`${w}px：${JSON.stringify(r)}`);
    }
    await p.ev(`window.scrollTo(0, document.documentElement.scrollHeight)`); await sleep(100); await p.click("#footer-sources"); await sleep(400);
    const src = await p.ev(`EMT.router.current()`); ok = ok && src === "sources";
    return { ok, note: out.join("；") + `；頁尾「資料來源與授權」可見並開啟 → ${src}` };
  });
  // AC-39-07：近 7 天
  await R.check("TC-39-07", "AC-39-07、AC-30-08、E-88", async () => {
    const out = []; let ok = true;
    for (const [w, h] of TWO) {
      await p.viewport(w, h);
      await seed(p, stateRecord(725, { todayLearned: { date: TODAY, wordKeys: ["the", "of", "and", "to"] }, learnedHistory: { [addDays(TODAY, -6)]: 3, [addDays(TODAY, -3)]: 10, [TODAY]: 4 } }));
      await goTab(p, "dashboard");
      const a = await p.ev(`(() => { const ol = document.querySelector(".db-bars"); const fills = [...document.querySelectorAll(".db-bars__fill")].map((f) => f.getBoundingClientRect().height); const e = document.querySelector(".db-chart__empty");
        return { shown: window.__qaL.shown(ol), area: Math.round(ol.getBoundingClientRect().height), maxBar: Math.round(Math.max(...fills) * 10) / 10, counts: [...document.querySelectorAll(".db-bars__count")].map((x) => x.textContent).join(","), empty: window.__qaL.shown(e) }; })()`);
      await seed(p, stateRecord(725)); await goTab(p, "dashboard");
      const b = await p.ev(`(() => { const ol = document.querySelector(".db-bars"); const e = document.querySelector(".db-chart__empty"); const card = document.querySelector(".db-chart"); const h3 = card.querySelector(".section-title"); const cs = getComputedStyle(card);
        const area = card.getBoundingClientRect().bottom - parseFloat(cs.paddingBottom) - h3.getBoundingClientRect().bottom;
        const vis = [...card.querySelectorAll("*")].filter((x) => window.__qaL.shown(x) && window.__qaL.ownText(x) && !x.closest(".section-title")).map((x) => x.textContent);
        return { text: window.__qaL.shown(e) ? e.textContent : null, ol: window.__qaL.shown(ol), eh: Math.round(e.getBoundingClientRect().height), area: Math.round(area), vis }; })()`);
      await goTab(p, "flashcards"); await p.click(".fc-flip"); await sleep(450); await goTab(p, "dashboard");
      const c = await p.ev(`({ ol: window.__qaL.shown(document.querySelector(".db-bars")), empty: window.__qaL.shown(document.querySelector(".db-chart__empty")), today: document.querySelector(".db-bars__item--today .db-bars__count").textContent })`);
      const good = a.shown && !a.empty && a.counts === "3,0,0,10,0,0,4" && a.maxBar <= 80 && a.area <= 120 && b.text === "開始學習後會顯示紀錄" && !b.ol && b.area <= 48 && b.vis.length === 1 && c.ol && !c.empty && c.today === "1";
      ok = ok && good; out.push(`${w}px：(a) 長條 ${a.counts}、最高 ${a.maxBar}px（≤ 80）、圖表區 ${a.area}px（≤ 120）；(b) 「${b.text}」、長條顯示=${b.ol}、文字高 ${b.eh}px、圖表區（標題下至卡片內距）${b.area}px（≤ 48）、可見文字 ${JSON.stringify(b.vis)}；學 1 字後回主控台 → 長條=${c.ol}、今天 ${c.today}`);
    }
    return { ok, note: out.join("；") };
  });
  // AC-39-08：資料備份收合
  await R.check("TC-39-08", "AC-39-08、AC-24-12、E-90、E-91", async () => {
    const out = []; let ok = true;
    for (const [w, h] of TWO) {
      await p.viewport(w, h); await seed(p, stateRecord(725)); await goTab(p, "dashboard");
      const ls0 = await lsAll(p);
      const st = () => p.ev(`(() => { const L = window.__qaL; const b = document.querySelector(".db-backup"); const vis = [...b.querySelectorAll("*")].filter((e) => L.shown(e) && (L.ownText(e) || e.tagName === "BUTTON")).map((e) => e.dataset.action || (e.classList.contains("db-backup__toggle") ? "toggle" : e.className.split(" ")[0])); return { exp: document.querySelector(".db-backup__toggle").getAttribute("aria-expanded"), vis: [...new Set(vis)].join(",") }; })()`);
      const s1 = await st();
      await p.click(".db-backup__toggle"); await sleep(80); const s2 = await st();
      const order = await p.ev(`[...document.querySelector("#db-backup-body").children].filter((e) => window.__qaL.shown(e) && !e.classList.contains("visually-hidden")).map((e) => e.className.split(" ")[0] || e.tagName).join(",")`);
      await p.click(".db-backup__toggle"); await sleep(80); const s3 = await st();
      await p.ev(`document.querySelector(".db-backup__toggle").focus()`); await enter(p); await sleep(80); const s4 = await st();
      await goTab(p, "part5"); await goTab(p, "customizer"); await goTab(p, "dashboard"); const s5 = await st();
      // 匯入流程中不收合：開檔案選擇器 → 選不合法檔 → 錯誤提示
      const f = path.join(TMP, "bad-" + Date.now() + ".json"); fs.writeFileSync(f, "{bad");
      p.chooser = null; await p.click('[data-action="import-backup"]'); for (let i = 0; i < 40 && !p.chooser; i++) await sleep(50); const s6 = await st();
      await p.send("DOM.setFileInputFiles", { files: [f], backendNodeId: p.chooser.backendNodeId }); await sleep(300); const s7 = await st();
      // 合法檔：確認對話框期間
      const good2 = path.join(TMP, "ok-" + Date.now() + ".json"); fs.writeFileSync(good2, await p.ev(`EMT.store.actions.exportBackup().json`));
      p.chooser = null; await p.click('[data-action="import-backup"]'); for (let i = 0; i < 40 && !p.chooser; i++) await sleep(50);
      await p.send("DOM.setFileInputFiles", { files: [good2], backendNodeId: p.chooser.backendNodeId }); await sleep(300); const dlg = await p.ev(`!!document.querySelector(".dialog")`); const s8 = await st();
      await p.click('.dialog [data-action="cancel"]'); await sleep(200); const s9 = await st();
      // 375：展開後最後一個元素不被底部導覽遮住
      let cover = "—";
      if (w <= 640) { await p.ev(`window.scrollTo(0, document.documentElement.scrollHeight)`); await sleep(150); cover = await p.ev(`(() => { const nav = document.getElementById("app-nav").getBoundingClientRect(); const els = [...document.querySelectorAll("#db-backup-body > *")].filter((e) => window.__qaL.shown(e)); const last = els[els.length - 1].getBoundingClientRect(); return last.bottom <= nav.top + 0.5 ? "不遮住" : "遮住 " + Math.round(last.bottom - nav.top) + "px"; })()`); }
      const ls1 = await lsAll(p);
      await p.reload(); await goTab(p, "dashboard"); const s10 = await st(); const ls2 = await lsAll(p);
      const good = s1.exp === "false" && !/export|import|origin|hint|install/.test(s1.vis);
      const g2 = s2.exp === "true" && order === "dash-backup__hint,btn-row,dash-backup__origin" && s3.exp === "false" && s4.exp === "true" && s5.exp === "true" && s6.exp === "true" && s7.exp === "true" && dlg && s8.exp === "true" && s9.exp === "true" && s10.exp === "false" && !/export|import/.test(s10.vis) && ls0 === ls1 && ls1 === ls2 && (w > 640 || cover === "不遮住");
      ok = ok && good && g2;
      out.push(`${w}px：(1) 載入 aria-expanded=${s1.exp}、可見 ${s1.vis}；(2) 點擊 → ${s2.exp}、可見 ${s2.vis}、展開內容順序 ${order}（安裝鈕依 IN-1 另見 TC-34-07）；再點 → ${s3.exp}；Enter → ${s4.exp}；(3) 切頁回來 ${s5.exp}；選檔中 ${s6.exp}、格式錯誤提示後 ${s7.exp}、確認對話框=${dlg} 期間 ${s8.exp}、取消後 ${s9.exp}；375 展開捲到底 ${cover}；(4) 重新載入 ${s10.exp}；localStorage 操作前後相同=${ls0 === ls1 && ls1 === ls2}`);
    }
    return { ok, note: out.join("｜") };
  });
  // AC-39-09：首屏不捲動可見「開始今日學習」
  await R.check("TC-39-09", "AC-39-09、AC-22-05（量測點）", async () => {
    const out = []; let ok = true;
    for (const [w, h] of SIZES) {
      await p.viewport(w, h); await p.reload(); await sleep(250);
      const a = await p.ev(`(() => { const L = window.__qaL; const r = L.rect(".db-start"); const nav = document.getElementById("app-nav").getBoundingClientRect(); const fixed = getComputedStyle(document.getElementById("app-nav")).position === "fixed";
        return { y: scrollY, tab: EMT.router.current(), inView: L.inView(".db-start"), bottom: Math.round(r.b), navTop: Math.round(nav.top), fixed, clear: !fixed || r.b <= nav.top + 0.5, hit: L.hitOk(".db-start") }; })()`);
      await goTab(p, "part5"); await p.ev(`EMT.router.go("dashboard")`); await sleep(350);
      const b = await p.ev(`({ y: scrollY, inView: window.__qaL.inView(".db-start") })`);
      const good = a.y === 0 && a.tab === "dashboard" && a.inView && a.clear && a.hit && b.y === 0 && b.inView;
      ok = ok && good; out.push(`${w}×${h}：捲動 ${a.y}、按鈕下緣 ${a.bottom}${a.fixed ? `、底部導覽上緣 ${a.navTop}` : ""}、完整在視窗內=${a.inView}、可點=${a.hit}；由導覽切回 捲動 ${b.y} 可見=${b.inView}`);
      await shot(p, `r5-dash-fold-${w}x${h}`);
    }
    return { ok, note: out.join("；") };
  });
  // AC-39-10、AC-40-02：寬度 720 置中
  await R.check("TC-39-10", "AC-39-10、AC-40-02、AC-20-01", async () => {
    const out = []; let ok = true;
    for (const [w, h] of SIZES) {
      await p.viewport(w, h);
      for (const [tab, sel] of [["dashboard", "#view-dashboard .dashboard"], ["part5", "#view-part5 .p5"]]) {
        await goTab(p, tab);
        const r = await p.ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); const r = e.getBoundingClientRect(); const par = e.parentElement; const ps = getComputedStyle(par); const pr = par.getBoundingClientRect();
          // 第 11 輪（PG 回饋 (c)、architecture v0.16 §7.29.4）：根元素 scrollbar-gutter: stable 時，不可捲動頁面的 documentElement.clientWidth 仍含保留的 15 px，
          // 右側留白改以 html 盒寬（不含捲軸與保留區，即內容可用的視窗寬）計算；保留區與可捲動時的捲軸同樣不算留白
          const avail = pr.width - parseFloat(ps.paddingLeft) - parseFloat(ps.paddingRight); const cw = document.documentElement.getBoundingClientRect().width;
          const clipped = [...e.querySelectorAll("*")].filter((x) => window.__qaL.shown(x) && !x.closest(".visually-hidden") && window.__qaL.ownText(x) && x.scrollWidth > x.clientWidth + 1 && getComputedStyle(x).overflowX !== "visible").length;
          return { w: Math.round(r.width * 10) / 10, avail: Math.round(avail * 10) / 10, left: Math.round(r.left * 10) / 10, right: Math.round((cw - r.right) * 10) / 10, hs: document.documentElement.scrollWidth > document.documentElement.clientWidth, clipped }; })()`);
        // 模擬測驗另量作答後（含解析、下一題）的裁切與水平捲軸（AC-40-02）
        if (tab === "part5") { await p.click("[data-p5=option]", 0); await sleep(150); const r2 = await p.ev(`(() => { const e = document.querySelector("#view-part5 .p5"); const cw = document.documentElement.clientWidth; return { hs: document.documentElement.scrollWidth > cw, clipped: [...e.querySelectorAll("*")].filter((x) => window.__qaL.shown(x) && !x.closest(".visually-hidden") && window.__qaL.ownText(x) && x.scrollWidth > x.clientWidth + 1 && getComputedStyle(x).overflowX !== "visible").length, explain: !!document.querySelector("[data-p5=explanation]") }; })()`); r.hs = r.hs || r2.hs; r.clipped += r2.clipped; r.answered = r2.explain; await seed(p, stateRecord(725)); }
        const exp = Math.min(r.avail, 720);
        const good = !r.hs && r.clipped === 0 && (w >= 1366 ? r.w <= 720 && Math.abs(r.left - r.right) <= 2 : Math.abs(r.w - exp) <= 1);
        ok = ok && good; out.push(`${w}px ${tab}：寬 ${r.w}（可用 ${r.avail}）、左右留白 ${r.left}/${r.right}、水平捲軸=${r.hs}、文字裁切 ${r.clipped}${tab === "part5" ? `（含作答後解析=${r.answered}）` : ""}`);
      }
    }
    return { ok, note: out.join("；") };
  });
  await p.close();
}
// AC-39-03 (b)：單字集為空（無內建資料 fixture）
{
  const FIX = process.env.QA_FIXTURE_NODATA;
  if (FIX && fs.existsSync(FIX)) {
    const q = await open(); await q.goto(pathToFileURL(FIX).href);
    await R.check("TC-39-03b", "AC-39-03、AC-06-06", async () => {
      await goTab(q, "dashboard"); const ls0 = await lsAll(q);
      await q.click(".db-start"); await sleep(400);
      const r = await q.ev(`({ tab: EMT.router.current(), empty: (() => { const e = document.querySelector(".fc-empty"); return e && !e.hidden ? e.innerText.replace(/\\n/g, " ") : ""; })() })`);
      const ls1 = await lsAll(q);
      return { ok: r.tab === "flashcards" && r.empty.includes("前往難易度設定") && ls0 === ls1, note: `單字集 0：點「開始今日學習」→ ${r.tab}、空狀態「${r.empty}」；localStorage 不變=${ls0 === ls1}` };
    });
    await q.close();
  } else R.fail("TC-39-03b", "AC-39-03", "未提供 QA_FIXTURE_NODATA，無法執行");
}

// ═════════ US-40 模擬測驗進度條 ═════════
{
  const p = await open();
  await p.goto();
  await R.check("TC-40-01", "AC-40-01、AC-11-05", async () => {
    const out = []; let ok = true;
    const N = await p.ev(`PART5_QUESTION_BANK.length`);
    const prog = () => p.ev(`(() => { const b = document.querySelector(".p5-progress"); if (!b) return null; const f = b.querySelector(".p5-progress__fill"); const br = b.getBoundingClientRect(); const fr = f.getBoundingClientRect();
      const title = document.querySelector(".p5-heading").getBoundingClientRect(); const q = document.querySelector(".p5-question, .p5-summary, [data-p5=summary-title]"); const qr = q ? q.getBoundingClientRect() : null;
      const num = (document.querySelector("[data-p5=number]") || {}).textContent || "";
      return { pct: Math.round((fr.width / br.width) * 10000) / 100, h: br.height, now: b.getAttribute("aria-valuenow"), max: b.getAttribute("aria-valuemax"), role: b.getAttribute("role"), fill: window.__qaL.hex(getComputedStyle(f).backgroundColor),
        pos: br.top >= title.bottom - 0.5 && (!qr || br.bottom <= qr.top + 0.5), num, tr: getComputedStyle(f).transitionDuration }; })()`);
    for (const [w, h] of TWO) {
      await p.viewport(w, h); await seed(p, stateRecord(725)); await goTab(p, "part5");
      const a = await prog();
      const ci = await p.ev(`PART5_QUESTION_BANK[0].correctIndex`); await p.click("[data-p5=option]", ci); await sleep(100);
      const t = await p.ev(`(async () => { const b = document.querySelector("[data-p5=next]"); const t0 = performance.now(); b.click(); await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0))); return +(performance.now() - t0).toFixed(1); })()`);
      const b = await prog();
      for (let i = 1; i < 4; i++) { await p.click("[data-p5=option]", 0); await p.click("[data-p5=next]"); }
      const c = await prog(); await p.reload(); await goTab(p, "part5"); const d = await prog();
      // 結算：預寫到最後一題
      await seed(p, stateRecord(725, { part5: { currentIndex: N - 1, lockedSelection: null, phase: "question", roundAnswered: N - 1, roundCorrect: 0, totalAnswered: N - 1, totalCorrect: 0 } })); await goTab(p, "part5");
      const e = await prog(); await p.click("[data-p5=option]", 0); await p.click("[data-p5=next]"); await sleep(150); const f = await prog();
      await p.click("[data-p5=restart]"); await sleep(150); const g = await prog();
      const near = (x, exp) => Math.abs(x.pct - exp) <= 1;
      const good = a.role === "progressbar" && a.h >= 4 && a.fill === BRAND && a.pos && a.max === String(N) && a.now === "1" && near(a, 100 / N) && a.num === `第 1 / ${N} 題`
        && b.now === "2" && near(b, 200 / N) && t <= 100 && c.now === "5" && near(c, 500 / N) && d.now === "5" && near(d, 500 / N) && d.num === `第 5 / ${N} 題`
        && e.now === String(N) && near(e, 100) && f.now === String(N) && near(f, 100) && g.now === "1" && near(g, 100 / N);
      ok = ok && good;
      out.push(`${w}px：第 1 題 ${a.pct}%（now ${a.now}/max ${a.max}、高 ${a.h}px、${a.fill}、位於標題下題目上=${a.pos}）；下一題 ${t}ms → ${b.pct}%（${b.now}）；第 5 題 ${c.pct}%；重新載入 ${d.pct}%「${d.num}」；第 N 題 ${e.pct}%；結算 ${f.pct}%（now ${f.now}）；重新開始 ${g.pct}%（${g.now}）；轉場 ${a.tr}`);
    }
    await p.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] }); await p.reload(); await goTab(p, "part5");
    const r = await prog(); ok = ok && /^0s/.test(r.tr); out.push(`減少動態：填色轉場 ${r.tr}`);
    return { ok, note: out.join("；") };
  });
  R.pass("TC-40-03", "AC-40-03", "模擬測驗既有 AC 由既有套件判定：AC-10-01、AC-10-02（TC-10-02、資料檢查）、AC-11-01～07（e2e-content／e2e-goal 系列）、AC-29-01～03（e2e-motion）、AC-28-06（e2e-motion）；對錯色不變見 TC-38-03。本列在彙整時依上述 TC 結果覆核（test-report §16）");
  await p.close();
}

// ═════════ US-41 首次畫面 ═════════
{
  const p = await open({ autoStart: false });
  await p.goto();
  await R.check("TC-41-01", "AC-41-01、AC-25-01", async () => {
    const out = []; let ok = true;
    for (const [w, h] of TWO) {
      await p.viewport(w, h); await p.ev(`localStorage.clear()`); await p.goto(); await sleep(200);
      const r = await p.ev(`(() => { const L = window.__qaL; const root = document.querySelector("#view-customizer");
        const seq = [...root.querySelectorAll(".cz-title, .cz-subtitle, .cz-vocab-note, .cz-level")].filter(L.shown).map((e) => e.classList.contains("cz-level") ? "row" : e.className.split(" ").find((c) => c.startsWith("cz-")));
        const header = document.querySelector("h1.app-title").getBoundingClientRect().bottom <= document.querySelector(".cz-title").getBoundingClientRect().top;
        return { seq: seq.join(","), title: document.querySelector(".cz-title").textContent, sub: document.querySelector(".cz-subtitle").textContent, est: L.shown(document.querySelector(".cz-estimate")), nav: L.shown(document.getElementById("app-nav")), form: L.shown(document.querySelector(".cv-form")), tpl: [...document.querySelectorAll(".cv-templates__btn")].filter(L.shown).length, header,
          bg: getComputedStyle(document.body).backgroundColor }; })()`);
      const good = r.seq === "cz-title,cz-subtitle,cz-vocab-note,row,row,row,row,row" && r.title === "選擇你的目標" && r.sub === "之後可以在「難易度設定」隨時變更" && !r.est && !r.nav && !r.form && r.tpl === 0 && r.header && r.bg === "rgb(238, 244, 250)";
      ok = ok && good; out.push(`${w}px：${JSON.stringify(r)}`);
    }
    return { ok, note: out.join("；") + "（對比見 TC-38-04 首次畫面）" };
  });
  await R.check("TC-41-02", "AC-41-02、AC-02-03、AC-02-05、AC-02-10、AC-22-04", async () => {
    await p.viewport(375, 667); await p.ev(`localStorage.clear()`); await p.goto(); await sleep(200);
    const exp = { orange: "橘級・每日 10 字　預計 15 週", brown: "棕級・每日 10 字　預計 41 週", green: "綠級・每日 15 字　預計 54 週", blue: "藍級・每日 20 字　預計 41 週（以綠試算）", gold: "金級・每日 20 字　預計 41 週（以綠試算）" };
    const bar = () => p.ev(`(() => { const L = window.__qaL; const b = document.querySelector(".cz-firstbar"); const kids = [...b.children].filter(L.shown).map((e) => e.id || e.className.split(" ")[0]);
      const s = document.getElementById("cz-start").getBoundingClientRect(), r = document.getElementById("cz-restore").getBoundingClientRect(); const cs = getComputedStyle(document.getElementById("cz-start"));
      return { kids: kids.join(","), summary: document.querySelector(".cz-firstbar__summary").textContent, locked: L.shown(document.querySelector(".cz-firstbar__locked")) ? document.querySelector(".cz-firstbar__locked").textContent : null,
        start: [Math.round(s.width), Math.round(s.height)], restore: [Math.round(r.width), Math.round(r.height)], bg: L.hex(cs.backgroundColor), fg: L.hex(cs.color), score: /\\d+\\s*分/.test(b.innerText) }; })()`);
    const rows = []; let ok = true; const times = [];
    const ls0 = await p.ev(`localStorage.getItem(${JSON.stringify(KEY)})`);
    for (const c of ["orange", "brown", "green", "blue", "gold"]) {
      times.push(await p.ev(`(async () => { const el = document.querySelector('.cz-level[data-color="${c}"]'); const t0 = performance.now(); el.click(); await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0))); return +(performance.now() - t0).toFixed(1); })()`));
      const b = await bar(); const locked = c === "blue" || c === "gold";
      const good = b.summary === exp[c] && (locked ? b.locked === "目前內建字庫到綠色為止" && b.kids === "cz-firstbar__locked,cz-firstbar__summary,cz-start,cz-restore" : b.locked === null && b.kids === "cz-firstbar__summary,cz-start,cz-restore")
        && b.start[0] >= 44 && b.start[1] >= 44 && b.restore[0] >= 44 && b.restore[1] >= 44 && b.bg === ACCENT && b.fg === "#1f2937" && !b.score;
      ok = ok && good; rows.push(`${c}「${b.summary}」${b.locked ? "＋「" + b.locked + "」" : ""}（${b.kids}）`);
    }
    const ls1 = await p.ev(`localStorage.getItem(${JSON.stringify(KEY)})`);
    // 與一般難易度設定頁試算一致
    await p.click("#cz-start"); await sleep(400); await goTab(p, "customizer");
    const gen = [];
    for (const c of ["orange", "brown", "green", "blue", "gold"]) { await clickCard(p, c); gen.push(await p.ev(`[document.querySelector(".cz-est-daily").textContent, document.querySelector(".cz-est-weeks").textContent].join("/")`)); }
    const genExp = ["10 字/天/15 週", "10 字/天/41 週", "15 字/天/54 週", "20 字/天/41 週", "20 字/天/41 週"];
    const med = [...times].sort((a, b) => a - b)[2];
    ok = ok && gen.join() === genExp.join() && ls0 === null && ls1 === null && Math.max(...times) <= 100;
    return { ok, note: `${rows.join("；")}；點列到摘要更新 ms ${times.join("、")}（中位數 ${med}）；首次畫面期間 localStorage 無狀態鍵=${ls0 === null && ls1 === null}；一般頁試算（每日/週數）${gen.join("、")}，與摘要行相同；按鈕強調橘底深色字、「開始學習」「從備份還原」≥ 44×44；行為見 TC-25-02、TC-25-03、TC-25-10、TC-25-11` };
  });
  await R.check("TC-41-03", "AC-41-03", async () => {
    const out = []; let ok = true;
    for (const [w, h] of [...SIZES, [375, 812]]) {
      await p.viewport(w, h); await p.ev(`localStorage.clear()`); await p.goto(); await sleep(200);
      for (const c of ["green", "blue"]) {
        await p.ev(`document.querySelector('.cz-level[data-color="${c}"]').click(); window.scrollTo(0, 0)`); await sleep(60);
        const st = (pos) => p.ev(`(() => { const L = window.__qaL; ${pos} const ids = [".cz-firstbar__summary", "#cz-start", "#cz-restore"]; return { y: Math.round(scrollY), max: Math.round(document.documentElement.scrollHeight - innerHeight), all: ids.every((s) => L.inView(s)), hit: ["#cz-start", "#cz-restore"].every((s) => L.hitOk(s)), pos: getComputedStyle(document.querySelector(".cz-firstbar")).position }; })()`);
        const a = await st("");
        let mid = null, bot = null;
        if (w <= 640) { mid = await st(`window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) / 2);`); bot = await st(`window.scrollTo(0, document.documentElement.scrollHeight);`); }
        const good = a.y === 0 && a.all && a.hit && (w > 640 || (a.pos === "fixed" && mid.all && mid.hit && bot.all && bot.hit));
        ok = ok && good; out.push(`${w}×${h} 選${c === "green" ? "綠" : "藍"}：不捲動三者在視窗內=${a.all}、可點=${a.hit}、position ${a.pos}${w <= 640 ? `；捲到中段（${mid.y}/${mid.max}）=${mid.all && mid.hit}、到底（${bot.y}）=${bot.all && bot.hit}` : ""}`);
      }
      await p.ev(`window.scrollTo(0, 0)`); await shot(p, `r5-firstrun-${w}x${h}`);
    }
    return { ok, note: out.join("；") };
  });
  await R.check("TC-41-04", "AC-41-04、AC-25-07、AC-25-11 (b)、E-93", async () => {
    await p.viewport(375, 667); await p.ev(`localStorage.clear()`); await p.goto(); await sleep(200);
    const out = []; let ok = true;
    const barTop = () => p.ev(`document.querySelector(".cz-firstbar").getBoundingClientRect().top`);
    // 5 種選擇下列高 ≤ 184（設計預算）
    const hs = []; for (const c of ["orange", "brown", "green", "blue", "gold"]) { await p.ev(`document.querySelector('.cz-level[data-color="${c}"]').click()`); await sleep(40); hs.push(await p.ev(`Math.round(document.querySelector(".cz-firstbar").offsetHeight)`)); }
    // 捲到底：頁尾連結在底部列上方、可點
    await p.ev(`window.scrollTo(0, document.documentElement.scrollHeight)`); await sleep(120);
    const ft = await p.ev(`(() => { const f = document.getElementById("footer-sources").getBoundingClientRect(); const b = document.querySelector(".cz-firstbar").getBoundingClientRect(); return { fb: Math.round(f.bottom), bt: Math.round(b.top), ok: f.bottom <= b.top + 0.5 && f.top >= 0, hit: window.__qaL.hitOk("#footer-sources") }; })()`);
    ok = ok && ft.ok && ft.hit && hs.every((x) => x <= 184); out.push(`底部列高 ${hs.join("/")}px（≤ 184）；捲到底頁尾連結下緣 ${ft.fb} ≤ 底部列上緣 ${ft.bt}=${ft.ok}、可點=${ft.hit}`);
    // 每個色級列都能捲到不被遮住
    const rowsOk = [];
    for (const c of ["orange", "brown", "green", "blue", "gold"]) {
      const r = await p.ev(`(() => { const el = document.querySelector('.cz-level[data-color="${c}"]'); const bt = document.querySelector(".cz-firstbar").getBoundingClientRect().top; const target = el.getBoundingClientRect().bottom + scrollY - bt + 8; window.scrollTo(0, Math.max(0, target)); const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= document.querySelector(".cz-firstbar").getBoundingClientRect().top + 0.5 && window.__qaL.hitOk('.cz-level[data-color="${c}"]'); })()`);
      rowsOk.push(`${c}:${r}`); ok = ok && r;
    }
    out.push(`各色級列可捲到底部列上方 ${rowsOk.join(" ")}`);
    // 格式錯誤檔：錯誤訊息與 Toast 不被底部列遮住
    const f = path.join(TMP, "fr-bad-" + Date.now() + ".json"); fs.writeFileSync(f, "{not json");
    await p.ev(`window.scrollTo(0, 0)`); p.chooser = null; await p.click("#cz-restore"); for (let i = 0; i < 40 && !p.chooser; i++) await sleep(50);
    await p.send("DOM.setFileInputFiles", { files: [f], backendNodeId: p.chooser.backendNodeId }); await sleep(300);
    const t = await p.ev(`(() => { const bt = document.querySelector(".cz-firstbar").getBoundingClientRect().top; const ts = [...document.querySelectorAll("#toast-root .toast, .field__error:not([hidden]), [role=alert]:not([hidden])")].filter((e) => window.__qaL.shown(e)).map((e) => ({ t: e.textContent.slice(0, 20), b: Math.round(e.getBoundingClientRect().bottom) })); return { bt: Math.round(bt), ts }; })()`);
    const tOk = t.ts.length > 0 && t.ts.every((x) => x.b <= t.bt + 0.5); ok = ok && tOk; out.push(`格式錯誤提示 ${JSON.stringify(t.ts)}、底部列上緣 ${t.bt}，不被遮住=${tOk}`);
    // Tab 順序：色級列 → 開始學習 → 從備份還原 → 頁尾連結（重新載入，使循序焦點起點回到頁首）
    await p.goto(); await sleep(200); await p.ev(`window.scrollTo(0, 0)`);
    const seq = [];
    for (let i = 0; i < 20; i++) { await p.key("Tab", "Tab", 9); const a = await p.ev(`(() => { const e = document.activeElement; if (!e) return null; return e.classList.contains("cz-level") ? "row:" + e.dataset.color : e.id || e.tagName; })()`); if (a) seq.push(a); if (a === "footer-sources") break; }
    const s = seq.join(",");
    const tabOk = /^(.*,)?row:orange,row:brown,row:green,row:blue,row:gold,cz-start,cz-restore,footer-about,footer-contact,footer-privacy,footer-sources$/.test(s); ok = ok && tabOk;
    out.push(`Tab 順序 ${s}`);
    await p.ev(`window.scrollTo(0, 0)`); await shot(p, "r5-firstrun-375-bottom");
    return { ok, note: out.join("；") };
  });
  await p.close();
}

{
  const ex = PAGES.flatMap((x) => x.log.exceptions); const ce = PAGES.flatMap((x) => x.log.console.filter((c) => c.type === "error").map((c) => c.text));
  R[ex.length === 0 ? "pass" : "fail"]("TC-X-layout", "（全套件）無未處理例外", `例外 ${JSON.stringify(ex).slice(0, 400)}；console.error ${JSON.stringify(ce).slice(0, 300)}`);
}
R.save(resultPath("e2e-layout"));
