// QA E2E（第 11 輪，BUG-006、BUG-008 複驗；architecture v0.16 §7.29.5、§10.13 Q10、Q11）：根元素 scrollbar-gutter: stable 的載入期 header 位移與回歸。
// 本機 CDP 啟動的無頭 Chrome、Edge（lib/cdp.mjs，不加 --hide-scrollbars，傳統捲軸 15 px；mobile 只在 375 寬）。
// 判定一律以「同一建置內」前後或逐畫格比較（SD-FB-94）；不用 innerWidth − clientWidth 判斷捲軸（PG 回饋 (c)），改看座標與 getComputedStyle(html).scrollbarGutter；不用 Event Timing。
//   TC-52-05f：file:// 交付檔，1920×1080、1366×768，(1) 一般 (2) init script 在 DOMContentLoaded 設 html[data-ad-env] 模擬廣告環境 → 逐畫格 header 左緣不變、gutter 自第一個畫格起為 stable、header layout shift 0。
//   TC-52-05g：已設定單元 ID 的測試建置（tests/tools/build-ad-test.mjs）以本機 HTTPS 當正式網址（lib/ad-env.mjs startProdServer；其他主機一律解析失敗，廣告腳本載入失敗 → 收合），同上判定。
//   TC-R11-375：375×667（mobile）主控台、單字卡、模擬測驗的主要元素座標與「第 10 輪樣式對照組」相同、無水平捲軸（AC-20-01、AC-40-02）。對照組由 QA 以目前原始碼、只還原 00-base.css 與 85-ad.css 建置（QA_R10CSS）。
//   TC-R11-1366b：1366×768 主控台展開「資料備份」使頁面由不可捲動變可捲動，展開前後主控台內容 dx = 0。
// 用法：QA_R10CSS=<對照組 html> node tests/e2e/diag-r11-gutter.mjs；輸出 tests/results/diag-r11-gutter[-edge].json（QA_BROWSER=edge 時只跑 Edge；預設 Chrome 與 Edge 都跑）。
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { launch, recorder, sleep, resultPath, FILE_URL } from "./lib/cdp.mjs";
import { stateRecord, seed, KEY } from "./lib/state.mjs";
import { LAYOUT_SHIFT_INIT, startProdServer, prodBrowserArgs, PROD } from "./lib/ad-env.mjs";
import { buildAdTest } from "../tools/build-ad-test.mjs";

const R = recorder("diag-r11-gutter");
const J = JSON.stringify;
const BROWSERS = process.env.QA_BROWSER ? [process.env.QA_BROWSER] : ["chrome", "edge"];
const TMP = fs.mkdtempSync(path.join(process.env.QA_TMP || os.tmpdir(), "r11-gutter-"));
const REC = stateRecord(725, { sttNoticeAcknowledged: true, part5: { currentIndex: 5, lockedSelection: null, phase: "question", roundAnswered: 0, roundCorrect: 0, totalAnswered: 3, totalCorrect: 2 }, part5CorrectIds: ["p5-001", "p5-002"] });
// 逐畫格紀錄（init script，於文件建立時開始）
const FRAMES = `window.__qaF = []; (() => { const snap = (w) => { const de = document.documentElement; const h = document.querySelector(".app-header__inner");
  window.__qaF.push({ w, t: Math.round(performance.now()), env: de.hasAttribute("data-ad-env"), gutter: getComputedStyle(de).scrollbarGutter, hl: h ? +h.getBoundingClientRect().left.toFixed(2) : null, scrollable: de.scrollHeight > innerHeight }); };
  document.addEventListener("DOMContentLoaded", () => snap("dcl")); const tick = () => { snap("raf"); if (performance.now() < 1500) requestAnimationFrame(tick); }; requestAnimationFrame(tick); })();`;
const SET_ENV = `document.addEventListener("DOMContentLoaded", () => document.documentElement.setAttribute("data-ad-env", ""));`;
const judge = async (p) => {
  await sleep(1300);
  const f = (await p.ev(`window.__qaF`)).filter((x) => x.hl !== null);
  const ls = await p.ev(`window.__qaLS || []`);
  const hdr = ls.filter((e) => e.sources.some((x) => /app-header/.test(x.name)));
  const nonFooter = ls.filter((e) => e.sources.some((x) => !/app-footer|footer-/.test(x.name)));
  const gut = [...new Set(f.map((x) => x.gutter))], hls = [...new Set(f.map((x) => x.hl))];
  return { frames: f.length, first: f[0], gut, hls, env: [...new Set(f.map((x) => x.env))], scrollable: [...new Set(f.map((x) => x.scrollable))], hdr: hdr.length, nonFooter: nonFooter.map((e) => ({ t: e.t, v: +e.value.toFixed(4), s: e.sources.map((x) => x.name) })), ok: f.length >= 3 && gut.length === 1 && gut[0] === "stable" && hls.length === 1 && hdr.length === 0 };
};
const fmt = (r) => `畫格 ${r.frames}（首畫格 ${r.first ? r.first.t + " ms、" + r.first.w + "、gutter " + r.first.gutter : "無"}）、gutter ${J(r.gut)}、header 左緣 ${J(r.hls)}、data-ad-env ${J(r.env)}、可捲動 ${J(r.scrollable)}、header layout shift ${r.hdr}、非頁尾 layout shift ${r.nonFooter.length}${r.nonFooter.length ? J(r.nonFooter).slice(0, 200) : ""}`;

// ═════ TC-52-05f：file://（一般、模擬廣告環境）═════
{
  const out = []; let ok = true;
  for (const browser of BROWSERS) for (const [w, h] of [[1920, 1080], [1366, 768]]) for (const [name, extra] of [["一般", []], ["DOMContentLoaded 設 data-ad-env", [SET_ENV]]]) {
    const p = await launch({ browser }); p.autoStart = false;
    await p.viewport(w, h, false); await p.goto(); await p.ev(`localStorage.setItem(${J(KEY)}, ${J(J(REC))})`);
    for (const s of [LAYOUT_SHIFT_INIT, FRAMES, ...extra]) await p.addInitScript(s);
    await p.goto();
    const r = await judge(p); const envOk = name === "一般" ? !r.env.includes(true) : r.env.includes(true);
    ok = ok && r.ok && envOk; out.push(`${browser} ${w}×${h} ${name}：${fmt(r)}${r.ok && envOk ? "" : "（不符）"}`);
    await p.close();
  }
  R[ok ? "pass" : "fail"]("TC-52-05f", "AC-52-05（BUG-006：file:// 載入期 header；一般與模擬廣告環境）", out.join("；"));
}
// ═════ TC-52-05g：已設定單元 ID 的測試建置、本機 HTTPS 正式網址 ═════
{
  const built = await buildAdTest(path.join(TMP, "b"));
  const server = await startProdServer(TMP, built.site);
  const out = []; let ok = true;
  for (const browser of BROWSERS) for (const [w, h] of [[1920, 1080], [1366, 768]]) for (let i = 0; i < 2; i++) {
    const p = await launch({ browser, args: prodBrowserArgs(server.port) }); p.autoStart = false;
    await p.viewport(w, h, false); await p.goto(PROD); await p.ev(`localStorage.setItem(${J(KEY)}, ${J(J(REC))})`);
    for (const s of [LAYOUT_SHIFT_INIT, FRAMES]) await p.addInitScript(s);
    await p.goto(PROD);
    const r = await judge(p); const st = await p.ev(`(() => ({ s: EMT.store.getState().runtime.ad.status, ads: document.querySelectorAll("ins.adsbygoogle").length, bid: document.querySelector('meta[name="emt-build-id"]').content }))()`);
    const envOk = r.env.includes(true);
    ok = ok && r.ok && envOk; out.push(`${browser} ${w}×${h} #${i + 1}：廣告狀態 ${st.s}、ins ${st.ads}；${fmt(r)}${r.ok && envOk ? "" : "（不符）"}`);
    await p.close();
  }
  await server.close();
  R[ok ? "pass" : "fail"]("TC-52-05g", "AC-52-05（BUG-006：廣告環境成立的測試建置，本機 HTTPS，一般捲軸）", `【替身驗證】測試建置 BUILD_ID ${built.buildId}（單元 ID 為測試值）；廣告腳本主機解析失敗 → 收合（filled 情況由 e2e-ad TC-52-05b 以替身驗證）；` + out.join("；"));
}
// ═════ TC-R11-375：375 版面與第 10 輪樣式對照組相同 ═════
const PROBE_RECTS = `(() => { const v = document.querySelector(".view:not([hidden])") || document.getElementById("app-main"); const sel = ".app-header__inner, #app-nav, .card, h1, h2, h3, button, .fc-card, .sp-mic, .sp-meter, .p5-question, input, select";
  const els = [document.querySelector(".app-header__inner"), ...v.querySelectorAll(sel)].filter((e) => e && e.getClientRects().length > 0);
  return { n: els.length, rects: els.map((e) => { const r = e.getBoundingClientRect(); return [e.className && e.className.baseVal === undefined ? String(e.className).split(" ")[0] : e.tagName, +r.left.toFixed(1), +(r.top + scrollY).toFixed(1), +r.width.toFixed(1), +r.height.toFixed(1)].join(","); }).join("|"),
    hs: document.documentElement.scrollWidth > document.documentElement.clientWidth, gutter: getComputedStyle(document.documentElement).scrollbarGutter }; })()`;
if (process.env.QA_R10CSS) {
  const BASE = pathToFileURL(process.env.QA_R10CSS).href;
  const out = []; let ok = true;
  for (const browser of BROWSERS) for (const [w, h] of [[375, 667], [390, 844]]) {
    const res = {};
    for (const [ver, url] of [["本輪", FILE_URL], ["對照組", BASE]]) {
      const p = await launch({ browser }); p.autoStart = false;
      await p.viewport(w, h, true); await p.goto(url); await p.ev(`localStorage.setItem(${J(KEY)}, ${J(J(REC))})`); await p.goto(url);
      res[ver] = {};
      for (const tab of ["dashboard", "flashcards", "part5"]) { await p.ev(`EMT.router.go(${J(tab)})`); await sleep(500); await p.ev(`window.scrollTo(0, 0)`); await sleep(100); res[ver][tab] = await p.ev(PROBE_RECTS); }
      await p.close();
    }
    for (const tab of ["dashboard", "flashcards", "part5"]) {
      const a = res["本輪"][tab], b = res["對照組"][tab]; const same = a.rects === b.rects;
      ok = ok && same && !a.hs; out.push(`${browser} ${w}×${h} ${tab}：元素 ${a.n}／${b.n}、座標相同=${same}、水平捲軸 ${a.hs}、gutter ${a.gutter}（對照組 ${b.gutter}）`);
    }
  }
  R[ok ? "pass" : "fail"]("TC-R11-375", "AC-20-01、AC-40-02（v0.16 §7.29.4：覆蓋式捲軸無影響；375／390 版面與第 10 輪樣式相同）", out.join("；") + "（對照組 = 目前原始碼、只把 00-base.css、85-ad.css 還原為 FE-96 之前，QA 建置）");
} else console.log("  （TC-R11-375 未設定 QA_R10CSS，不執行；第 12 輪由 diag-r12-375.mjs TC-R12-375 與 1.3.1 比較取代）");
// ═════ TC-R11-1366b：1366 主控台展開資料備份（不可捲動 → 可捲動）dx = 0 ═════
{
  const out = []; let ok = true;
  const RECTS = `(() => [".app-header__inner", "#view-dashboard .db-goal", "#view-dashboard .db-today, #view-dashboard .db-task", "#view-dashboard .db-stats", "#view-dashboard .db-chart", "#view-dashboard .db-backup", "#app-footer"].map((s) => { const e = document.querySelector(s); if (!e) return s + ":無"; const r = e.getBoundingClientRect(); return [+r.left.toFixed(2), +(r.top + scrollY).toFixed(2), +r.width.toFixed(2)].join(","); }))()`;
  for (const browser of BROWSERS) for (const [w, h] of [[1366, 768], [1366, 900], [1920, 1080]]) {
    const p = await launch({ browser }); p.autoStart = false;
    await p.viewport(w, h, false); await p.goto(); await p.ev(`localStorage.setItem(${J(KEY)}, ${J(J(REC))})`); await p.goto(); await p.ev(`EMT.router.go("dashboard")`); await sleep(400);
    const sc0 = await p.ev(`document.documentElement.scrollHeight > innerHeight`); const a = await p.ev(RECTS);
    await p.ev(`document.querySelector(".db-backup__toggle").click()`); await sleep(300);
    const sc1 = await p.ev(`document.documentElement.scrollHeight > innerHeight`); const b = await p.ev(RECTS);
    const dx = a.map((x, i) => (x.includes(":") ? 0 : +(Number(b[i].split(",")[0]) - Number(x.split(",")[0])).toFixed(2)));
    const gutter = await p.ev(`getComputedStyle(document.documentElement).scrollbarGutter`);
    const good = dx.every((d) => d === 0) && gutter === "stable";
    ok = ok && good; out.push(`${browser} ${w}×${h}：展開前可捲動 ${sc0} → 後 ${sc1}；header、目標行、今日任務、3 格數據、近 7 天、資料備份、頁尾 dx ${J(dx)}；gutter ${gutter}`);
    await p.close();
  }
  R[ok ? "pass" : "fail"]("TC-R11-1366b", "AC-52-05、AC-39（v0.16 §7.29.5 回歸：頁面變可捲動時內容不左右移動）", out.join("；"));
}
R.save(resultPath("diag-r11-gutter"));
console.log(`diag-r11-gutter：通過 ${R.results.filter((r) => r.result === "通過").length}、失敗 ${R.results.filter((r) => r.result === "失敗").length}`);
