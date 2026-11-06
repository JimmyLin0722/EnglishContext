// 診斷（第 11 輪，AC-22-01、AC-31-03；TC-22-01m 4 倍降速＋減少動態參考值不符的原因）：本輪 dist 與「第 10 輪樣式對照組」交錯 A/B。
// 對照組 = 目前原始碼、只把 00-base.css、85-ad.css 還原為 FE-96 之前（QA 建置，QA_R10CSS），兩者只差 html { scrollbar-gutter: stable }。
// 每輪每個版本各開 1 個瀏覽器（奇數輪先對照組）；狀態比照 e2e-env perfRun：首次「開始學習」、注入 cs、business、biostat 範本後回主控台；
// 之後 prefers-reduced-motion: reduce＋4 倍降速重新載入，依 e2e-env 的 NAV_TABS 與「嚴格量法」量 10 個切頁位置（點擊 → #customizer-custom 顯示並繪製完成）。
// 另以同條件但 1 倍速、無減少動態量一次（參考）。一律不加 --hide-scrollbars（傳統捲軸 15 px）。
// 用法：QA_R10CSS=<html> node tests/e2e/diag-r11-navab.mjs [輪數，預設 8] [寬 高，預設 1366 900]；輸出 tests/results/diag/r11-navab.json
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { launch, sleep, FILE_URL, ROOT } from "./lib/cdp.mjs";
import { TOAST_RECORDER, fakeTts, fakeStt, fakeMic } from "./lib/inits.mjs";
import { injectTpl } from "./lib/state.mjs";

const N = Number(process.argv[2] || 8); const W = Number(process.argv[3] || 1366), H = Number(process.argv[4] || 900);
const VERS = { r10css: pathToFileURL(process.env.QA_R10CSS).href, cur: FILE_URL };
const NAV_TABS = ["customizer", "flashcards", "part5", "dashboard", "sources", "customizer", "flashcards", "part5", "sources", "dashboard"];
const NAV = `(async () => { const tabs = ${JSON.stringify(NAV_TABS)}; const out = [];
  const frame = () => new Promise((r) => requestAnimationFrame(r)); const paint = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
  for (const t of tabs) { const b = document.querySelector('#app-nav [data-tab="' + t + '"]') || document.getElementById("footer-sources"); const t0 = performance.now(); b.click(); await paint();
    if (t === "customizer") { const h = document.getElementById("customizer-custom"); let n = 0; while (h.hidden && n < 120) { await frame(); n++; } await new Promise((r) => setTimeout(r, 0)); }
    out.push(+(performance.now() - t0).toFixed(1)); await new Promise((r) => setTimeout(r, 30)); }
  return { out, sh: document.documentElement.scrollHeight, gutter: getComputedStyle(document.documentElement).scrollbarGutter }; })()`;
const raw = [];
for (let i = 0; i < N; i++) for (const v of i % 2 ? ["cur", "r10css"] : ["r10css", "cur"]) {
  const p = await launch();
  for (const s of [TOAST_RECORDER, fakeTts("ok"), fakeStt("ok"), fakeMic("ok")]) await p.addInitScript(s);
  await p.viewport(W, H); await p.goto(VERS[v]);
  await p.go("customizer"); for (const t of ["cs", "business", "biostat"]) await injectTpl(p, t); await p.go("dashboard"); await sleep(200);
  await p.goto(VERS[v]); await sleep(300); const normal = await p.ev(NAV);
  await p.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] }); await p.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await p.goto(VERS[v]); const slowReduced = await p.ev(NAV);
  await p.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  raw.push({ round: i + 1, v, normal: normal.out, slowReduced: slowReduced.out, gutter: slowReduced.gutter });
  console.log(`R${i + 1} ${v}：4 倍＋減少動態 ${slowReduced.out.join("、")}｜1 倍 ${normal.out.join("、")}（gutter ${slowReduced.gutter}）`);
  await p.close();
}
const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : +((s[m - 1] + s[m]) / 2).toFixed(1); };
const sum = {};
for (const v of ["r10css", "cur"]) for (const k of ["slowReduced", "normal"]) {
  const rs = raw.filter((x) => x.v === v).map((x) => x[k]); const pm = NAV_TABS.map((_, j) => median(rs.map((r) => r[j])));
  sum[`${v}|${k}`] = { posMedian: pm, maxPosMedian: Math.max(...pm), over100: rs.flat().filter((x) => x > 100).length, n: rs.flat().length };
}
console.log(JSON.stringify(sum, null, 1));
fs.mkdirSync(path.join(ROOT, "tests/results/diag"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "tests/results/diag/r11-navab.json"), JSON.stringify({ size: [W, H], navTabs: NAV_TABS, summary: sum, raw }, null, 1));
