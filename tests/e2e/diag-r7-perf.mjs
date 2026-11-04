// 診斷（第 7 輪，不列入 run-all）：TC-22-01m（減少動態＋4 倍降速，主控台 → 難易度設定第一次切頁，嚴格量法）在 1.1.0 與 v1.0.0 交付檔的 A/B 交錯比較
// 用法：QA_V100=<v1.0.0 html> node tests/e2e/diag-r7-perf.mjs [輪數，預設 10]
// 每輪每個版本各開 1 個瀏覽器（新舊交替先後）；狀態相同（綠、30 個自訂單字、無學習紀錄；舊版用 schemaVersion 2、新版用 3，避免遷移寫回）；
// 先以一般速度切過各頁，再於減少動態＋4 倍降速下「重新載入 → 點難易度設定」5 次（early = 第 1、3、5 次，late = 第 2、4 次），量到 #customizer-custom 顯示並繪製完成
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { launch, sleep, FILE_URL, ROOT } from "./lib/cdp.mjs";
import { stateRecord, stateRecordV2, KEY } from "./lib/state.mjs";

const N = Number(process.argv[2] || 10);
const OLD = pathToFileURL(process.env.QA_V100).href;
const words = Array.from({ length: 30 }, (_, i) => ({ id: "c_qa_" + i, word: "qaperf" + String.fromCharCode(97 + (i % 26)) + i, meaning: "效能", phonetic: "", pos: "", collocation: "", example: "", academicContext: "", origin: "manual", templateId: null, createdAt: new Date(Date.UTC(2026, 10, 1, 0, i)).toISOString() }));
const measure = `(async () => { const paint = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0))); const frame = () => new Promise((r) => requestAnimationFrame(r));
  const b = document.querySelector('#app-nav [data-tab="customizer"]'); const t0 = performance.now(); b.click(); await paint();
  const h = document.getElementById("customizer-custom"); let n = 0; while (h.hidden && n < 120) { await frame(); n++; } await new Promise((r) => setTimeout(r, 0));
  return +(performance.now() - t0).toFixed(1); })()`;
const res = { old: { early: [], late: [] }, cur: { early: [], late: [] } };
// 暖機模式（較接近 e2e-env 的 TC-22-01m）：每輪每個版本開 1 個瀏覽器，先以一般速度載入並切過各頁，再在 4 倍降速＋減少動態下「重新載入 → 點難易度設定」重複 5 次
for (let i = 0; i < N; i++) {
  for (const [k, url, rec] of [["old", OLD, stateRecordV2(725, { customVocab: words })], ["cur", FILE_URL, stateRecord(725, { customVocab: words })]].sort(() => (i % 2 ? 1 : -1))) {
    const p = await launch();
    await p.viewport(1366, 900);
    await p.goto(url);
    await p.ev(`localStorage.setItem(${JSON.stringify(KEY)}, ${JSON.stringify(JSON.stringify(rec))})`);
    await p.goto(url);
    for (const t of ["customizer", "flashcards", "part5", "dashboard"]) { await p.ev(`document.querySelector('#app-nav [data-tab="${t}"]').click()`); await sleep(300); }
    await p.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
    await p.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    for (let j = 0; j < 5; j++) {
      await p.goto(url);
      res[k][j % 2 ? "late" : "early"].push(await p.ev(measure));
    }
    await p.close();
  }
  console.log(`第 ${i + 1} 輪`, JSON.stringify(res));
}
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
const summary = Object.fromEntries(Object.entries(res).map(([k, v]) => [k, Object.fromEntries(Object.entries(v).map(([w, a]) => [w, { median: med(a), max: Math.max(...a), samples: a }]))]));
fs.mkdirSync(path.join(ROOT, "tests", "results", "diag"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "tests", "results", "diag", "r7-perf-ab.json"), JSON.stringify({ date: new Date().toISOString(), n: N, summary }, null, 2));
console.log(JSON.stringify(summary, null, 2));
