// 診斷（第 10 輪，AC-60-06）：分數出現使頁面變得可捲動、出現傳統捲軸時，分數區上方的 TTS、麥克風、收音條是否位移。
// 比對 1.3.1（dist）與 1.3.0（git a358556），三種燈號。本機 CDP 無頭 Chrome 預設顯示 15 px 傳統捲軸（Playwright 預設隱藏）；本腳本不加 --hide-scrollbars。
// 第 11 輪（BUG-008 複驗；PG 回饋 (c)、SD-FB-94）：scrollbar-gutter: stable 時 innerWidth − clientWidth 恆為 15，不能用來判斷捲軸是否出現，改記 clientWidth、可捲動與 getComputedStyle(html).scrollbarGutter；
// 位移只以同一建置內「分數出現前後」的座標判定，不跨版本比絕對座標（v0.16 §7.29.4：不可捲動頁面比 1.3.0 左移 7.5 px 屬預期）。
// QA_R10CSS=<html> 時另加「1.3.1 第 10 輪樣式」對照組（目前原始碼只把 00-base.css、85-ad.css 還原為 FE-96 之前，由 QA 建置）。
// 用法：node tests/e2e/diag-r10-scrollbar.mjs；輸出 tests/results/diag/r10-scrollbar.json。
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { launch, sleep, FILE_URL, ROOT } from "./lib/cdp.mjs";
import { TOAST_RECORDER, fakeTts, fakeStt, fakeMic } from "./lib/inits.mjs";
import { KEY, stateRecord } from "./lib/state.mjs";

const J = JSON.stringify;
const TMP = process.env.QA_TMP || path.join(ROOT, "tests/results/tmp"); fs.mkdirSync(TMP, { recursive: true });
const V130 = process.env.QA_V130 || path.join(TMP, "v1.3.0.html");
if (!fs.existsSync(V130)) fs.writeFileSync(V130, execFileSync("git", ["show", "a358556:dist/english-master-track.html"], { cwd: ROOT, maxBuffer: 64 << 20 }));
const VERS = [["1.3.1", FILE_URL], ["1.3.0", pathToFileURL(V130).href], ...(process.env.QA_R10CSS ? [["1.3.1-r10css", pathToFileURL(process.env.QA_R10CSS).href]] : [])];
const RECT = `(() => { const r = (e) => { const b = e.getBoundingClientRect(); return [b.left, b.top + scrollY].map((v) => +v.toFixed(1)).join(","); };
  return { tts: [...document.querySelectorAll(".fc-front .sp-tts__btn")].map(r).join("|"), mic: r(document.querySelector(".fc-front .sp-mic")), meter: r(document.querySelector(".fc-front .sp-meter")),
    cw: document.documentElement.clientWidth, scrollable: document.documentElement.scrollHeight > innerHeight, gutter: getComputedStyle(document.documentElement).scrollbarGutter }; })()`;
const out = {};
for (const [w, h] of [[1366, 768], [768, 1024], [1920, 1080]]) for (const [ver, url] of VERS) {
  const p = await launch(); for (const s of [TOAST_RECORDER, fakeTts("ok"), fakeStt("ok", { audioStart: true, autoAudioStartMs: 150 }), fakeMic("ok")]) await p.addInitScript(s);
  await p.viewport(w, h, false); p.autoStart = false; await p.goto(url);
  await p.ev(`localStorage.setItem(${J(KEY)}, ${J(J(stateRecord(725, { sttNoticeAcknowledged: true })))})`); await p.goto(url);
  await p.ev(`EMT.store.actions.injectTemplate("cs")`); await p.ev(`EMT.store.actions.addCustomWord({ word: "comply with", meaning: "遵守" })`); await p.ev(`EMT.store.actions.addCustomWord({ word: "sitting", meaning: "坐" })`);
  const rows = [];
  for (const [light, word, rec] of [["綠燈", "comply with", "comply with"], ["黃燈", "comply with", "complied with"], ["紅燈", "sitting", "kitten"], ["綠燈", "Latency", "Latency"]]) {
    await p.ev(`EMT.router.go("flashcards")`); await sleep(200);
    const i = await p.ev(`EMT.store.getState().runtime.studySet.findIndex((c) => (c.word || (c.item && c.item.word)) === ${J(word)})`);
    await p.ev(`EMT.store.actions.gotoCard(${i})`); await sleep(600); await p.ev(`window.scrollTo(0, 0)`); await sleep(100);
    const a = await p.ev(RECT);
    await p.ev(`document.querySelector(".fc-front .sp-mic").click()`);
    for (let k = 0; k < 100; k++) { if ((await p.ev(`document.querySelector(".fc-front .sp-mic").dataset.status`)) === "listening") break; await sleep(25); }
    await p.ev(`(() => { const r = window.__qaStt.last; r.emitResult(${J(rec)}); r.emitEnd(); })()`); await sleep(300);
    const b = await p.ev(RECT); const lt = await p.ev(`(document.querySelector(".fc-front .sp-result__light") || {}).textContent || ""`);
    rows.push({ light, got: lt, word, before: a, after: b, moved: a.tts !== b.tts || a.mic !== b.mic || a.meter !== b.meter });
  }
  out[`${ver}@${w}x${h}`] = rows; await p.close();
  console.log(`${ver} ${w}×${h}：` + rows.map((r) => `${r.word} ${r.got}：clientWidth ${r.before.cw}→${r.after.cw}、可捲動 ${r.before.scrollable}→${r.after.scrollable}、上方元素位移=${r.moved}${r.moved ? `（麥克風 ${r.before.mic} → ${r.after.mic}）` : ""}`).join("；") + `；scrollbar-gutter ${rows[0].before.gutter}`);
}
fs.mkdirSync(path.join(ROOT, "tests/results/diag"), { recursive: true }); fs.writeFileSync(path.join(ROOT, "tests/results/diag/" + (process.env.QA_OUT_PREFIX || "r10") + "-scrollbar.json"), J(out, null, 1));
