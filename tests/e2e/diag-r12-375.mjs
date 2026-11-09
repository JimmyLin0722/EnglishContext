// QA 第 12 輪（architecture v0.17 §10.14 回歸；AC-20-01、AC-40-02、AC-10-02）：375／390 窄視窗版面與 1.3.1（git HEAD 2cb2ca2 的交付檔）比較。
// TC-R12-375：主控台、單字卡（含即時文字列隱藏時）元素座標與 1.3.1 逐一相同；模擬測驗頁只有標題說明行數改變（R-31 拿掉「 Part 5」，§7.31.3 允許 1 或 2 行），
//   說明以上元素座標相同、說明以下元素只在垂直方向平移同一個量（= 說明高度差），水平位置與寬高相同；三頁皆無水平捲軸。
// 用法：node tests/e2e/diag-r12-375.mjs（預設 Chrome 與 Edge 都跑）；輸出 tests/results/diag-r12-375.json
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { launch, recorder, sleep, FILE_URL, ROOT } from "./lib/cdp.mjs";
import { stateRecord, KEY } from "./lib/state.mjs";

const R = recorder("diag-r12-375");
const J = JSON.stringify;
const OLD = path.join(process.env.QA_TMP || ROOT, "r12-v131-english-master-track.html");
if (!fs.existsSync(OLD)) fs.writeFileSync(OLD, execFileSync("git", ["show", "2cb2ca2:dist/english-master-track.html"], { cwd: ROOT, maxBuffer: 64 << 20 }));
const REC = stateRecord(725, { sttNoticeAcknowledged: true });
const PROBE = `(() => { const v = document.querySelector(".view:not([hidden])") || document.getElementById("app-main"); const sel = ".app-header__inner, #app-nav, .card, h1, h2, h3, button, .fc-card, .sp-mic, .sp-meter, .sp-live, .p5-question, .p5-heading-note, input, select";
  const els = [document.querySelector(".app-header__inner"), ...v.querySelectorAll(sel)].filter((e) => e && e.getClientRects().length > 0);
  const note = document.querySelector(".p5-heading-note"); const nb = note ? note.getBoundingClientRect() : null;
  return { n: els.length, hs: document.documentElement.scrollWidth > document.documentElement.clientWidth, noteH: nb ? +nb.height.toFixed(1) : null, noteBottom: nb ? +(nb.bottom + scrollY).toFixed(1) : null, noteText: note ? note.textContent.trim() : null,
    rects: els.map((e) => { const r = e.getBoundingClientRect(); return { k: e.className && e.className.baseVal === undefined ? String(e.className).split(" ")[0] : e.tagName, x: +r.left.toFixed(1), y: +(r.top + scrollY).toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) }; }) }; })()`;
const BROWSERS = process.env.QA_BROWSER ? [process.env.QA_BROWSER] : ["chrome", "edge"];
const out = []; let ok = true;
for (const browser of BROWSERS) for (const [w, h] of [[375, 667], [390, 844]]) {
  const res = {};
  for (const [ver, url] of [["1.3.2", FILE_URL], ["1.3.1", pathToFileURL(OLD).href]]) {
    const p = await launch({ browser }); p.autoStart = false;
    await p.viewport(w, h, true); await p.goto(url); await p.ev(`localStorage.setItem(${J(KEY)}, ${J(J(REC))})`); await p.goto(url);
    res[ver] = {};
    for (const tab of ["dashboard", "flashcards", "part5"]) { await p.ev(`EMT.router.go(${J(tab)})`); await sleep(500); await p.ev(`window.scrollTo(0, 0)`); await sleep(100); res[ver][tab] = await p.ev(PROBE); }
    await p.close();
  }
  for (const tab of ["dashboard", "flashcards", "part5"]) {
    const a = res["1.3.2"][tab], b = res["1.3.1"][tab];
    let good, detail;
    if (tab !== "part5") { good = J(a.rects) === J(b.rects) && !a.hs; detail = `元素 ${a.n}／${b.n}、座標相同=${J(a.rects) === J(b.rects)}`; }
    else {
      const dy = +(b.noteH - a.noteH).toFixed(1); const bad = [];
      if (a.n !== b.n) bad.push(`元素數 ${a.n}／${b.n}`);
      a.rects.forEach((r, i) => { const o = b.rects[i]; if (!o) return; const above = o.y < b.noteBottom - 0.5 && r.k !== "p5-heading-note";
        const ex = above ? 0 : r.k === "p5-heading-note" ? 0 : dy; const hOk = r.k === "p5-heading-note" || r.h === o.h;
        if (r.k !== o.k || r.x !== o.x || r.w !== o.w || !hOk || Math.abs((o.y - r.y) - ex) > 0.6) bad.push(`${r.k}@${i}(${o.x},${o.y},${o.w},${o.h}→${r.x},${r.y},${r.w},${r.h})`); });
      good = bad.length === 0 && !a.hs && a.noteText === "題型參考 TOEIC®（多益），非 ETS 官方或認可內容";
      detail = `標題說明高 ${b.noteH} → ${a.noteH}（差 ${dy} px）、說明以下元素一律上移 ${dy} px、水平與寬高不變；不符 ${bad.length}${bad.length ? "：" + bad.slice(0, 5).join("、") : ""}`;
    }
    ok = ok && good; out.push(`${browser} ${w}×${h} ${tab}：${detail}、水平捲軸 ${a.hs}${good ? "" : "（不符）"}`);
  }
}
R[ok ? "pass" : "fail"]("TC-R12-375", "AC-20-01、AC-40-02、AC-10-02（375／390 版面與 1.3.1 相比：只因 R-31 標題說明行數改變）", out.join("；"));
R.save(path.join(ROOT, "tests", "results", "diag-r12-375.json"));
console.log(`diag-r12-375：通過 ${R.results.filter((r) => r.result === "通過").length}、失敗 ${R.results.filter((r) => r.result === "失敗").length}`);
