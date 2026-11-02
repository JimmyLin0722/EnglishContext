// QA 診斷腳本（BUG-002 第 1 輪驗證；不列入 run-all）：瀏覽器冷啟動 vs 重新載入的切頁時間、句型庫分批補齊前的首次按鍵
// 用法：node tests/e2e/perf-phrasebank.mjs [瀏覽器啟動次數，預設 5]
// 量測方法與 TC-22-01 相同：click() 前後 performance.now()，等待 requestAnimationFrame + setTimeout 0。
import fs from "node:fs";
import path from "node:path";
import { launch, sleep } from "./lib/cdp.mjs";
import { TOAST_RECORDER, fakeTts, fakeStt } from "./lib/inits.mjs";

const K = Number(process.argv[2] || 5);
const RELOADS = 3;
const TMP = process.env.QA_TMP || path.resolve("tests/results/tmp");
fs.mkdirSync(TMP, { recursive: true });
const TABS = ["customizer", "flashcards", "part5", "decoder", "phrasebank", "dashboard", "sources", "customizer", "flashcards", "dashboard"];

const NAV = `(async () => { const tabs = ${JSON.stringify(TABS)}; const out = [];
  for (const t of tabs) { const b = document.querySelector('#app-nav [data-tab="' + t + '"]') || document.getElementById("footer-sources"); const t0 = performance.now(); b.click();
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0))); out.push(+(performance.now() - t0).toFixed(1)); } return out; })()`;

// 載入後立即切到句型庫，在分批補齊完成前輸入第一個字／點分類（非預設條件會同步補齊）
const FIRST_KEY = (mode) => `(async () => {
  const b = document.querySelector('#app-nav [data-tab="phrasebank"]'); const t0 = performance.now(); b.click();
  await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0))); const nav = +(performance.now() - t0).toFixed(1);
  const built = document.querySelectorAll(".pb-item").length;
  const t1 = performance.now();
  if (${JSON.stringify(mode)} === "key") { const el = document.getElementById("pb-search"); el.value = "g"; el.dispatchEvent(new Event("input", { bubbles: true })); }
  else document.querySelector('.pb-filter__btn[data-category="gap"]').click();
  const syncN = [...document.querySelectorAll(".pb-item")].filter((li) => !li.hidden).length;
  await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0))); const act = +(performance.now() - t1).toFixed(1);
  return { nav, builtBefore: built, act, syncVisible: syncN, total: document.querySelectorAll(".pb-item").length, count: document.querySelector(".pb-count").textContent }; })()`;

const out = { meta: { date: new Date().toISOString(), launches: K, reloads: RELOADS, tabs: TABS }, cold4x: [], cold1x: [], firstKey: [] };

for (let i = 0; i < K; i++) {
  const p = await launch();
  await p.addInitScript(TOAST_RECORDER); await p.addInitScript(fakeTts("ok")); await p.addInitScript(fakeStt("ok"));
  await p.viewport(1366, 900);
  await p.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const runs = [];
  await p.goto(); runs.push(await p.ev(NAV)); // 冷啟動後第一次載入
  for (let r = 0; r < RELOADS; r++) { await p.reload(); runs.push(await p.ev(NAV)); }
  // 分批補齊前的首次按鍵／分類點擊（重新載入後立即操作）
  for (const mode of ["key", "cat"]) { await p.reload(); out.firstKey.push({ launch: i + 1, mode, ...(await p.ev(FIRST_KEY(mode))) }); }
  out.cold4x.push(runs);
  console.log(`4x 啟動 ${i + 1}：` + runs.map((r, k) => `${k === 0 ? "冷" : "重載" + k} 句型庫 ${r[4]} 最大 ${Math.max(...r)}`).join("；"));
  await p.close();
}
for (let i = 0; i < Math.min(K, 3); i++) {
  const p = await launch();
  await p.addInitScript(TOAST_RECORDER); await p.addInitScript(fakeTts("ok")); await p.addInitScript(fakeStt("ok"));
  await p.viewport(1366, 900);
  await p.goto(); const r = await p.ev(NAV);
  out.cold1x.push(r); console.log(`1x 冷啟動 ${i + 1}：${r.join("、")}`);
  await p.close();
}
for (const f of out.firstKey) console.log(`首次操作 ${f.mode}：切頁 ${f.nav}ms、操作前已建 ${f.builtBefore} 則、操作 ${f.act}ms、同步可見 ${f.syncVisible}、總節點 ${f.total}、${f.count}`);
const DIAG = path.resolve("tests/results/diag"); fs.mkdirSync(DIAG, { recursive: true }); // 不放 tests/results 根目錄，避免被 run-all 彙整
fs.writeFileSync(path.join(DIAG, "perf-phrasebank.json"), JSON.stringify(out, null, 2));
