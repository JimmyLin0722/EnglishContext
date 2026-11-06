// QA 第 10 輪（PRD v0.20 US-61、AC-38-09、AC-61-01、AC-61-02；architecture v0.15 §7.27.4、§10.12 Q5；BUG-005 複驗）
// 以真實鍵盤事件（CDP Input.dispatchKeyEvent）走過 4 個功能區，Tab 與 Shift+Tab 都測；比對 1.3.1（dist）與 1.3.0（git a358556）。
// 用法：node tests/e2e/diag-r10-focus.mjs；環境變數 QA_V130 指向 1.3.0 交付檔（未指定時由 git 取出到 QA_TMP）。
// 輸出：tests/results/e2e-focus.json（TC 判定）、tests/results/diag/r10-focus.json（全部停點原始數字）。
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { launch, recorder, sleep, FILE_URL, ROOT, resultPath } from "./lib/cdp.mjs";
import { TOAST_RECORDER, fakeTts, fakeStt, fakeMic } from "./lib/inits.mjs";
import { KEY, stateRecord } from "./lib/state.mjs";

const J = (x) => JSON.stringify(x);
const TMP = process.env.QA_TMP || path.join(ROOT, "tests/results/tmp"); fs.mkdirSync(TMP, { recursive: true });
const V130 = process.env.QA_V130 || path.join(TMP, "v1.3.0.html");
if (!fs.existsSync(V130)) fs.writeFileSync(V130, execFileSync("git", ["show", "a358556:dist/english-master-track.html"], { cwd: ROOT, maxBuffer: 64 << 20 }));
const OLD = pathToFileURL(V130).href;
const R = recorder("e2e-focus");
const RAW = {};

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const days = {}; for (let i = 0; i < 7; i++) days[ymd(new Date(Date.now() - i * 86400000))] = 5 + i;
const SEED = stateRecord(725, { sttNoticeAcknowledged: true, learnedHistory: days, todayLearned: { date: ymd(new Date()), wordKeys: ["the", "be", "to", "of", "and"] }, streak: { days: 3, lastActiveDate: ymd(new Date()) },
  part5: { currentIndex: 2, lockedSelection: null, phase: "question", roundAnswered: 1, roundCorrect: 1, totalAnswered: 2, totalCorrect: 1 }, part5CorrectIds: ["p5-001"] });

// 停點量測：焦點元素與「可用下緣」（#app-nav 固定時取其上緣；首次畫面另取 .cz-firstbar 上緣）
const PROBE = `(() => { const e = document.activeElement; if (!e || e === document.body || e === document.documentElement) return null;
  window.__fid = window.__fid || new WeakMap(); window.__fn = window.__fn || 0; if (!window.__fid.has(e)) window.__fid.set(e, ++window.__fn);
  const txt = (e.textContent || e.value || e.getAttribute("aria-label") || "").trim().replace(/\\s+/g, " ").slice(0, 14);
  const cl = typeof e.className === "string" ? e.className.trim().split(/\\s+/).filter((c) => !/^btn(--|$)/.test(c)).slice(0, 2).map((c) => "." + c).join("") : "";
  const name = ((e.id ? "#" + e.id : "") + cl + (e.dataset && e.dataset.color ? "[" + e.dataset.color + "]" : "") + (txt ? "「" + txt + "」" : "")) || e.tagName;
  const nav = document.getElementById("app-nav"); const ns = nav && getComputedStyle(nav); const navFixed = !!nav && ns.position === "fixed" && nav.getClientRects().length > 0 && ns.visibility !== "hidden";
  const bar = document.body.dataset.entry === "firstRun" ? document.querySelector(".cz-firstbar") : null; const barFixed = !!bar && getComputedStyle(bar).position === "fixed" && bar.getClientRects().length > 0;
  const navTop = navFixed ? nav.getBoundingClientRect().top : innerHeight; const barTop = barFixed ? bar.getBoundingClientRect().top : innerHeight;
  const limit = Math.min(innerHeight, navTop, barTop);
  const inBar = !!e.closest("#app-nav") || (barFixed && !!e.closest(".cz-firstbar"));
  const r = e.getBoundingClientRect(); const vis = Math.max(0, Math.min(r.bottom, limit) - Math.max(r.top, 0)); const frac = r.height > 0 ? vis / r.height : 1;
  const tall = r.height > limit;
  const full = tall ? r.top >= -0.5 && vis >= 44 : r.top >= -0.5 && r.bottom <= limit + 0.5 && r.left >= -0.5 && r.right <= innerWidth + 0.5;
  const cs = getComputedStyle(e);
  let must = null;
  if (e.matches(".db-backup__toggle")) must = "資料備份";
  else if (e.matches(".cz-level[data-color=gold]")) must = "金色級列";
  else if (e.matches("button") && /新增單字/.test(e.textContent)) must = "新增單字";
  else if (e.matches(".fc-flip")) must = "翻面";
  else if (e.matches(".fc-next")) must = "下一張";
  else if (e.matches('[data-p5="option"][data-index="2"]')) must = "選項C";
  else if (e.matches('[data-p5="option"][data-index="3"]')) must = "選項D";
  let ac3809 = null;
  if (e.matches(".db-start")) ac3809 = "開始今日學習"; else if (e.matches(".db-change")) ac3809 = "變更"; else if (e.matches(".db-backup__toggle")) ac3809 = "資料備份"; else if (e.matches("#cz-start")) ac3809 = "首次開始學習";
  return { id: window.__fid.get(e), name, top: +r.top.toFixed(1), bottom: +r.bottom.toFixed(1), h: +r.height.toFixed(1), navTop: Math.round(navTop), barTop: Math.round(barTop), limit: Math.round(limit), inBar, frac: +frac.toFixed(3), full, ring: parseFloat(cs.outlineWidth) || 0, outline: cs.outlineStyle, fv: e.matches(":focus-visible"), must, ac3809, scrollY: Math.round(scrollY) }; })()`;

async function key(p, shift) {
  const m = shift ? 8 : 0;
  if (shift) await p.send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "Shift", code: "ShiftLeft", windowsVirtualKeyCode: 16, modifiers: 8 });
  await p.send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9, modifiers: m });
  await p.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9, modifiers: m });
  if (shift) await p.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Shift", code: "ShiftLeft", windowsVirtualKeyCode: 16, modifiers: 0 });
}
async function walk(p, shift, max = 160) {
  await p.ev(`document.activeElement && document.activeElement.blur(); window.scrollTo(0, ${shift ? "document.documentElement.scrollHeight" : 0})`); await sleep(80);
  const stops = []; let first = null; let nulls = 0;
  for (let i = 0; i < max; i++) {
    await key(p, shift); await sleep(45);
    const s = await p.ev(PROBE);
    if (!s) { if (stops.length && ++nulls > 2) break; continue; }
    if (first === null) first = s.id; else if (s.id === first) break; // 繞回
    stops.push(s);
  }
  return stops;
}
const AREAS = [
  ["主控台（收合）", `EMT.router.go("dashboard")`],
  ["主控台（展開）", `(() => { EMT.router.go("dashboard"); const b = document.querySelector(".db-backup__toggle"); if (b.getAttribute("aria-expanded") === "false") b.click(); })()`],
  ["難易度設定", `EMT.router.go("customizer")`],
  ["單字卡", `EMT.router.go("flashcards")`],
  ["模擬測驗", `EMT.router.go("part5")`],
];
async function open(url, w, h, { mobile = w <= 640, seed = true, reduced = false } = {}) {
  const p = await launch(); for (const s of [TOAST_RECORDER, fakeTts("ok"), fakeStt("ok"), fakeMic("ok")]) await p.addInitScript(s);
  await p.viewport(w, h, mobile);
  if (reduced) await p.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  p.autoStart = false; await p.goto(url);
  if (seed) { await p.ev(`localStorage.setItem(${J(KEY)}, ${J(J(SEED))})`); await p.goto(url); }
  await sleep(150);
  return p;
}
const NAMES = ["資料備份", "金色級列", "新增單字", "翻面", "下一張", "選項C", "選項D"];

// ═════════ 1. 窄視窗掃描（1.3.1 判定；1.3.0 同腳本對照）════════
for (const [ver, url] of [["1.3.1", FILE_URL], ["1.3.0", OLD]]) for (const [w, h] of [[375, 667], [390, 844]]) {
  const p = await open(url, w, h);
  const k = `${ver}@${w}x${h}`; RAW[k] = {};
  const must = new Map(); const summary = []; let allOk = true; const ringBad = [];
  for (const [area, go] of AREAS) {
    await p.ev(go); await sleep(350);
    for (const shift of [false, true]) {
      const stops = await walk(p, shift); RAW[k][`${area} ${shift ? "Shift+Tab" : "Tab"}`] = stops;
      const content = stops.filter((s) => !s.inBar);
      const bad = content.filter((s) => !s.full);
      for (const s of content) { if (s.must) { const m = must.get(s.must) || []; m.push({ dir: shift ? "Shift+Tab" : "Tab", frac: s.frac, full: s.full }); must.set(s.must, m); } if (s.ac3809 && (s.ring < 2 || s.outline === "none")) ringBad.push(s.name); }
      allOk = allOk && bad.length === 0 && content.length > 0;
      summary.push(`${area} ${shift ? "Shift+Tab" : "Tab"}：停點 ${content.length}、被遮或不完整 ${bad.length}${bad.length ? "（" + bad.map((s) => `${s.name} ${s.top}～${s.bottom}／下緣 ${s.limit}，可見 ${Math.round(s.frac * 100)}%`).join("、") + "）" : ""}`);
    }
  }
  const mustLine = NAMES.map((n) => { const m = must.get(n) || []; return `${n} ${m.length ? m.map((x) => `${x.dir} ${Math.round(x.frac * 100)}%`).join("/") : "未停到"}`; });
  const mustOk = NAMES.every((n) => { const m = must.get(n) || []; return m.some((x) => x.dir === "Tab") && m.some((x) => x.dir === "Shift+Tab") && m.every((x) => x.full && x.frac === 1); });
  RAW[k].summary = summary; RAW[k].must = Object.fromEntries(must);
  if (ver === "1.3.1") {
    R[allOk ? "pass" : "fail"](`TC-61-01-${w}`, `AC-61-01（${w}×${h}，Tab 與 Shift+Tab，4 個功能區）、E-166`, summary.join("；"));
    R[mustOk ? "pass" : "fail"](`TC-61-01m-${w}`, `AC-61-01 必測 7 項（${w}×${h}）`, mustLine.join("；"));
    R[ringBad.length === 0 && must.has("資料備份") && mustOk ? "pass" : "fail"](`TC-38-09f-${w}`, `AC-38-09 (a)（BUG-005 複驗，${w}×${h}）`, `AC-38-09 列舉控制項焦點框寬 < 2 或 none：${ringBad.length}${ringBad.length ? "（" + ringBad.join("、") + "）" : ""}；資料備份 ${(must.get("資料備份") || []).map((x) => `${x.dir} 可見 ${Math.round(x.frac * 100)}%`).join("、")}`);
  } else console.log(`[對照 ${k}] ${summary.join("；")}；必測 ${mustLine.join("；")}`);
  await p.close();
}

// ═════════ 2. 1366×768 回歸：停點、捲動位置與 1.3.0 相同 ═════════
{
  const seq = {};
  for (const [ver, url] of [["1.3.1", FILE_URL], ["1.3.0", OLD]]) {
    const p = await open(url, 1366, 768); seq[ver] = {};
    for (const [area, go] of AREAS) { await p.ev(go); await sleep(350); for (const shift of [false, true]) seq[ver][`${area} ${shift ? "Shift+Tab" : "Tab"}`] = (await walk(p, shift)).map((s) => `${s.name}@${s.scrollY}@${s.top}`); }
    seq[ver].sp = await p.ev(`getComputedStyle(document.documentElement).scrollPaddingBottom`);
    await p.close();
  }
  RAW["1366"] = seq;
  const diffs = []; let n = 0;
  for (const k of Object.keys(seq["1.3.1"])) { if (k === "sp") continue; const a = seq["1.3.1"][k], b = seq["1.3.0"][k]; n += a.length; if (a.length !== b.length) diffs.push(`${k} 停點 ${b.length}→${a.length}`); a.forEach((x, i) => { if (x !== b[i]) diffs.push(`${k} #${i} ${b[i]} → ${x}`); }); }
  R[diffs.length === 0 ? "pass" : "fail"]("TC-61-02a", "AC-61-02（> 640px 版面與捲動不變：1366×768 與 1.3.0 逐停點比對）", `4 個功能區 Tab＋Shift+Tab 共 ${n} 個停點，名稱、scrollY、元素上緣全同=${diffs.length === 0}${diffs.length ? "：" + diffs.slice(0, 8).join("；") : ""}；scroll-padding-bottom 1.3.1 ${seq["1.3.1"].sp}、1.3.0 ${seq["1.3.0"].sp}`);
}

// ═════════ 3. 點擊與觸控不造成額外捲動；減少動態無捲動動畫（AC-61-02）═════════
{
  const out = []; let ok = true;
  for (const [w, h, reduced] of [[375, 667, false], [375, 667, true], [1366, 768, false]]) for (const [ver, url] of [["1.3.1", FILE_URL], ["1.3.0", OLD]]) {
    const p = await open(url, w, h, { reduced });
    const res = [];
    for (const [area, go, sel] of [["主控台", AREAS[1][1], ".db-backup__toggle"], ["難易度設定", AREAS[2][1], ".cz-level[data-color=gold]"], ["單字卡", AREAS[3][1], ".fc-next"], ["模擬測驗", AREAS[4][1], '[data-p5="option"][data-index="3"]']]) {
      await p.ev(go); await sleep(300);
      // 捲到使控制項部分落在導覽列後方仍可點的位置：控制項下緣在視窗下緣以上 70 px（窄視窗時位於導覽列後方）
      await p.ev(`(() => { const e = document.querySelector(${J(sel)}); const r = e.getBoundingClientRect(); window.scrollBy(0, r.bottom - (innerHeight - 70)); })()`); await sleep(80);
      const y0 = await p.ev(`scrollY`);
      const pt = await p.ev(`(() => { const e = document.querySelector(${J(sel)}); const r = e.getBoundingClientRect(); return { x: r.left + 8, y: r.top + 6, behavior: getComputedStyle(document.documentElement).scrollBehavior }; })()`);
      if (w <= 640) { await p.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: pt.x, y: pt.y }] }); await p.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); }
      else for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) await p.send("Input.dispatchMouseEvent", { type, x: pt.x, y: pt.y, button: "left", clickCount: 1 });
      await sleep(250); const y1 = await p.ev(`scrollY`);
      // 再以滑鼠點一次（窄視窗也測滑鼠）
      await p.ev(go); await sleep(250); await p.ev(`(() => { const e = document.querySelector(${J(sel)}); const r = e.getBoundingClientRect(); window.scrollBy(0, r.bottom - (innerHeight - 70)); })()`); await sleep(80);
      const y2 = await p.ev(`scrollY`); const pt2 = await p.ev(`(() => { const e = document.querySelector(${J(sel)}); const r = e.getBoundingClientRect(); return { x: r.left + 8, y: r.top + 6 }; })()`);
      for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) await p.send("Input.dispatchMouseEvent", { type, x: pt2.x, y: pt2.y, button: "left", clickCount: 1 });
      await sleep(250); const y3 = await p.ev(`scrollY`);
      res.push({ area, touchOrClick: [y0, y1], mouse: [y2, y3], behavior: pt.behavior });
    }
    RAW[`click-${ver}@${w}${reduced ? "-reduced" : ""}`] = res;
    await p.close();
    // 判定在 1.3.0 跑完後：模擬測驗第 1 次點選項是作答，作答後捲到回饋屬既有行為（1.3.0 相同），所以以「與 1.3.0 逐筆相同」判定，另列非作答控制項 scrollY 不變
    if (ver === "1.3.0") {
      const cur = RAW[`click-1.3.1@${w}${reduced ? "-reduced" : ""}`];
      const same = J(cur.map((r) => [r.touchOrClick, r.mouse])) === J(res.map((r) => [r.touchOrClick, r.mouse]));
      const nonAction = cur.filter((r) => r.area !== "模擬測驗").every((r) => r.touchOrClick[0] === r.touchOrClick[1] && r.mouse[0] === r.mouse[1]) && cur.find((r) => r.area === "模擬測驗").mouse[0] === cur.find((r) => r.area === "模擬測驗").mouse[1];
      const good = same && nonAction && cur.every((r) => r.behavior === "auto");
      ok = ok && good;
      out.push(`${w}px${reduced ? " 減少動態" : ""}：${cur.map((r) => `${r.area} ${w <= 640 ? "觸控" : "點擊"} scrollY ${r.touchOrClick.join("→")}、滑鼠 ${r.mouse.join("→")}`).join("、")}；與 1.3.0 逐筆相同=${same}；scroll-behavior ${cur[0].behavior}`);
    }
  }
  R[ok ? "pass" : "fail"]("TC-61-02b", "AC-61-02（點擊與觸控不額外捲動、減少動態捲動無動畫）", out.join("；") + "（模擬測驗第 1 次點選項為作答，作答後捲到回饋為既有行為，1.3.0 相同；第 2 次滑鼠點已鎖定的選項不捲動）");
}

// ═════════ 4. 首次畫面 375×667（AC-41-04、AC-57-01 回歸；色級列鍵盤焦點觀察）═════════
{
  const res = {};
  for (const [ver, url] of [["1.3.1", FILE_URL], ["1.3.0", OLD]]) {
    const p = await open(url, 375, 667, { seed: false });
    const entry = await p.ev(`document.body.dataset.entry`);
    res[ver] = { entry };
    for (const shift of [false, true]) {
      const stops = await walk(p, shift); RAW[`firstRun-${ver}-${shift ? "Shift+Tab" : "Tab"}`] = stops;
      const footer = stops.filter((s) => /footer-links|關於我|聯絡我們|隱私權|資料來源/.test(s.name) && !s.inBar);
      const levels = stops.filter((s) => /cz-level/.test(s.name));
      res[ver][shift ? "shift" : "tab"] = { order: stops.map((s) => s.name), footer: footer.map((s) => ({ n: s.name, full: s.full, b: s.bottom, lim: s.limit })), levels: levels.map((s) => ({ n: s.name, frac: s.frac, b: s.bottom, bar: s.barTop })), start: stops.filter((s) => s.ac3809 === "首次開始學習").map((s) => ({ full: s.full, ring: s.ring, inBar: s.inBar })) };
    }
    // AC-41-04：每個色級列都能捲動到完全不被底部列遮住
    res[ver].scrollable = await p.ev(`[...document.querySelectorAll(".cz-level")].map((e) => { e.scrollIntoView({ block: "center" }); const r = e.getBoundingClientRect(); const bar = document.querySelector(".cz-firstbar").getBoundingClientRect(); return r.bottom <= bar.top + 0.5 && r.top >= 0; })`);
    await p.close();
  }
  RAW.firstRun = res;
  const a = res["1.3.1"];
  const footOk = [a.tab, a.shift].every((x) => x.footer.length >= 4 && x.footer.every((f) => f.full));
  const startOk = [a.tab, a.shift].every((x) => x.start.length >= 1 && x.start.every((s) => s.ring >= 2));
  R[a.entry === "firstRun" && footOk && startOk && a.scrollable.every(Boolean) ? "pass" : "fail"]("TC-61-02c", "AC-61-02（AC-41-04、AC-57-01 照常）、AC-38-09（首次「開始學習」焦點框）",
    `首次畫面 375×667：頁尾連結 Tab ${a.tab.footer.map((f) => (f.full ? "完整" : "被遮")).join("/")}、Shift+Tab ${a.shift.footer.map((f) => (f.full ? "完整" : "被遮")).join("/")}；「開始學習」焦點框 ${a.tab.start.map((s) => s.ring + "px").join("/")}；5 個色級列可捲到不被底部列遮住 ${a.scrollable.join("/")}`);
  const lv = (v) => v.tab.levels.map((l) => `${l.n.replace(/「.*$/, "")} ${Math.round(l.frac * 100)}%`).join("、");
  R.pass("TC-FR-OBS", "（觀察，不屬 AC 字面）首次畫面色級列鍵盤焦點",
    `以 Tab 聚焦時色級列未被首次底部列遮住的比例：1.3.1 ${lv(res["1.3.1"])}；1.3.0 ${lv(res["1.3.0"])}（首次畫面不在 AC-61-01 範圍；AC-41-04 只要求可捲到不被遮，已符合）`);
}

// ═════════ 5. 輸入自訂單字（AC-27-03 回歸）與 scroll-padding 計算值 ═════════
{
  const out = []; let ok = true;
  for (const [w, h] of [[375, 667], [390, 844]]) {
    const p = await open(FILE_URL, w, h);
    await p.ev(`EMT.router.go("customizer")`); await sleep(300);
    const sp0 = await p.ev(`getComputedStyle(document.documentElement).scrollPaddingBottom`);
    await p.ev(`(() => { const e = document.getElementById("cv-word"); e.scrollIntoView({ block: "end" }); e.focus(); })()`); await p.send("Input.insertText", { text: "hello" }); await sleep(250);
    const r = await p.ev(`(() => { const e = document.getElementById("cv-word"); const x = e.getBoundingClientRect(); const nav = document.getElementById("app-nav"); const ns = getComputedStyle(nav); const navTop = (ns.display === "none" || ns.visibility === "hidden" || !nav.getClientRects().length) ? innerHeight : nav.getBoundingClientRect().top;
      return { typing: document.documentElement.classList.contains("is-typing"), sp: getComputedStyle(document.documentElement).scrollPaddingBottom, top: Math.round(x.top), bottom: Math.round(x.bottom), navTop: Math.round(navTop) }; })()`);
    const good = sp0 === "64px" && r.bottom <= r.navTop && r.top >= 0;
    ok = ok && good; out.push(`${w}×${h}：scroll-padding-bottom ${sp0}；輸入時 is-typing=${r.typing}、${r.sp}、輸入欄 ${r.top}～${r.bottom}／導覽上緣 ${r.navTop}`);
    await p.close();
  }
  R[ok ? "pass" : "fail"]("TC-61-02d", "AC-61-02（AC-27-03 正在輸入的欄位不被遮，自動化部分）", out.join("；") + "（實機虛擬鍵盤仍列 TC-M09）");
}

R.save(resultPath("e2e-focus"));
fs.mkdirSync(path.join(ROOT, "tests/results/diag"), { recursive: true }); fs.writeFileSync(path.join(ROOT, "tests/results/diag/r10-focus.json"), J(RAW));
console.log(`e2e-focus：通過 ${R.results.filter((r) => r.result === "通過").length}、失敗 ${R.results.filter((r) => r.result === "失敗").length}`);
