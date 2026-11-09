// QA 第 10 輪（PRD v0.20 共通規則 1、AC-58-12、AC-59-07、AC-60-07；architecture §10.12 M-4）：1.3.0 → 1.3.1 舊資料相容性。
// 以 1.3.0 交付檔（git a358556）實際學習後：(1) 直接以 1.3.1 開啟同一份 localStorage；(2) 1.3.0 匯出的備份以 1.3.1 的「從備份還原」匯入；
// (3) 1.3.1 匯出備份的頂層欄位、data 欄位與 1.3.0 相同。用法：node tests/e2e/e2e-compat-r10.mjs（QA_V130 可指定 1.3.0 交付檔）。
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { launch, recorder, sleep, FILE_URL, ROOT, resultPath } from "./lib/cdp.mjs";
import { TOAST_RECORDER, fakeTts, fakeStt, fakeMic } from "./lib/inits.mjs";
import { KEY, expandBackup, dialogInfo } from "./lib/state.mjs";
const PKG_VER = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")).version; // 第 12 輪

const J = JSON.stringify;
const R = recorder("e2e-compat-r10");
const TMP = process.env.QA_TMP || path.join(ROOT, "tests/results/tmp"); fs.mkdirSync(TMP, { recursive: true });
const V130 = process.env.QA_V130 || path.join(TMP, "v1.3.0.html");
if (!fs.existsSync(V130)) fs.writeFileSync(V130, execFileSync("git", ["show", "a358556:dist/english-master-track.html"], { cwd: ROOT, maxBuffer: 64 << 20 }));
const OLD = pathToFileURL(V130).href;
const SET_COUNTER = `(() => { window.__sets = 0; const o = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (k === ${J(KEY)}) window.__sets++; return o.call(this, k, v); }; })();`;
const lsAll = (p) => p.ev(`(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); } return o; })()`);

const p = await launch();
for (const s of [TOAST_RECORDER, fakeTts("ok"), fakeStt("ok"), fakeMic("ok"), SET_COUNTER]) await p.addInitScript(s);
await p.send("Page.setInterceptFileChooserDialog", { enabled: true }); p.onEvent((m) => { if (m.method === "Page.fileChooserOpened") p.chooser = m.params; });
await p.viewport(1366, 900); p.autoStart = false;

// ── 1.3.0 學習 ──
await p.goto(OLD);
const oldVer = await p.ev(`(document.querySelector('meta[name="emt-app-version"]') || {}).content`);
await p.click('.cz-level[data-color="brown"]'); await p.click("#cz-start"); await sleep(400);
await p.ev(`EMT.store.actions.addCustomWord({ word: "qacompatword", meaning: "相容" })`); await p.ev(`EMT.store.actions.injectTemplate("cs")`); await sleep(100);
await p.go("flashcards"); await p.click(".fc-flip"); await sleep(450); await p.click(".fc-flip"); await sleep(450);
for (let i = 0; i < 4; i++) { await p.click(".fc-next"); await sleep(120); }
await p.ev(`EMT.store.actions.acknowledgeSttNotice()`);
await p.click(".fc-front .sp-mic"); await sleep(400); // 1.3.0：按下後直接聆聽中
const word = await p.ev(`document.querySelector(".fc-front .fc-word").textContent`);
await p.ev(`(() => { const r = window.__qaStt.last; r.emitResult(${J("x")}); r.emitEnd(); })()`); await sleep(200);
await p.go("part5"); for (let i = 0; i < 3; i++) { const ci = await p.ev(`PART5_QUESTION_BANK[${i}].correctIndex`); await p.click(`#view-part5 [data-p5=option][data-index="${i === 1 ? (ci + 1) % 4 : ci}"]`); await sleep(60); await p.click("#view-part5 [data-p5=next]"); await sleep(60); }
const old = await lsAll(p); const oldRaw = old[KEY]; const oldState = JSON.parse(oldRaw);
const oldBackup = await p.ev(`EMT.store.actions.exportBackup().json`); const oldBk = JSON.parse(oldBackup);
const bkFile = path.join(TMP, "r10-backup-1.3.0.json"); fs.writeFileSync(bkFile, oldBackup);

await R.check("TC-R10-C1", "共通規則 1（1.3.0 的 localStorage 以 1.3.1 開啟）、AC-58-12、AC-47-04", async () => {
  await p.goto(FILE_URL); const ver = await p.ev(`(document.querySelector('meta[name="emt-app-version"]') || {}).content`);
  const entry = await p.entry(); const sets1 = await p.ev(`window.__sets`); const a1 = await lsAll(p);
  await p.go("flashcards"); await sleep(200); await p.go("part5"); await sleep(200); await p.go("dashboard"); await sleep(200);
  const sets1b = await p.ev(`window.__sets`); const a1b = await lsAll(p);
  await p.reload(); const sets2 = await p.ev(`window.__sets`); const a2 = await lsAll(p);
  const ok = oldVer === "1.3.0" && ver === PKG_VER /* 第 12 輪：改讀 package.json（1.3.2；第 10、11 輪寫死 1.3.1） */ && entry === "main" && sets1 === 0 && sets1b === 0 && sets2 === 0 && J(a1) === J(old) && J(a1b) === J(old) && J(a2) === J(old) && Object.keys(a2).length === 1 && JSON.parse(a2[KEY]).schemaVersion === 3 && p.log.exceptions.length === 0;
  return { ok, note: `1.3.0（${oldVer}）學習後 localStorage 鍵 ${J(Object.keys(old))}、schemaVersion ${oldState.schemaVersion}、data ${Object.keys(oldState.data).length} 欄（今日已學 ${oldState.data.todayLearned.wordKeys.length}、自訂 ${oldState.data.customVocab.length}、模擬測驗累計 ${oldState.data.part5.totalAnswered}）；以 ${ver} 開啟 → ${entry}、開啟時 setItem ${sets1} 次、切換 3 頁後 ${sets1b} 次、重新載入 ${sets2} 次；localStorage 逐位元組與 1.3.0 相同=${J(a2) === J(old)}` };
});

await R.check("TC-R10-C2", "共通規則 1（1.3.0 匯出備份以 1.3.1 匯入）、AC-24-02、AC-24-03", async () => {
  await p.ev(`localStorage.clear()`); await p.goto(FILE_URL); await p.startLearning(); await sleep(150);
  await p.ev(`EMT.router.go("dashboard")`); await sleep(200); await expandBackup(p); p.chooser = null;
  await p.click('[data-action="import-backup"]'); for (let i = 0; i < 60 && !p.chooser; i++) await sleep(50);
  if (!p.chooser) throw new Error("未出現檔案選擇器");
  await p.send("DOM.setFileInputFiles", { files: [bkFile], backendNodeId: p.chooser.backendNodeId }); await sleep(400);
  const d = await dialogInfo(p); if (d) { await p.click('.dialog [data-action="ok"]'); await sleep(500); }
  const toasts = await p.ev(`window.__qaToasts.map((t) => t.text)`);
  const a = await lsAll(p); const st = JSON.parse(a[KEY]);
  const same = Object.keys(oldState.data).every((k) => J(st.data[k]) === J(oldState.data[k]));
  const s0 = await p.ev(`window.__sets`); await p.reload(); const s1 = await p.ev(`window.__sets`); const b = await lsAll(p);
  await p.go("flashcards"); await sleep(200); const pos = await p.ev(`document.querySelector(".fc-position").textContent`);
  const ok = !!d && same && st.schemaVersion === 3 && J(Object.keys(st.data)) === J(Object.keys(oldState.data)) && J(b) === J(a) && s1 === 0 && Object.keys(b).length === 1 && p.log.exceptions.length === 0;
  return { ok, note: `匯入確認視窗「${d && d.title}」；Toast ${J(toasts.slice(-2))}；匯入後 data ${Object.keys(st.data).length} 欄與 1.3.0 逐欄相同=${same}（欄位順序相同=${J(Object.keys(st.data)) === J(Object.keys(oldState.data))}）；匯入時 setItem ${s0} 次；重新載入 setItem ${s1} 次、localStorage 不變=${J(b) === J(a)}；單字卡「${pos}」` };
});

await R.check("TC-R10-C3", "§10.12 M-4（備份格式不變：頂層 5 欄、data 欄位）、AC-60-07", async () => {
  const bk = JSON.parse(await p.ev(`EMT.store.actions.exportBackup().json`));
  const ok = J(Object.keys(bk)) === J(Object.keys(oldBk)) && Object.keys(bk).length === 5 && bk.format === oldBk.format && bk.schemaVersion === oldBk.schemaVersion && J(Object.keys(bk.data)) === J(Object.keys(oldBk.data))
    && !/preparing|sttStatus|recognizedText|audiostart/.test(J(bk));
  return { ok, note: `1.3.1 匯出頂層 ${J(Object.keys(bk))}（1.3.0 ${J(Object.keys(oldBk))}）；format ${bk.format}／${oldBk.format}；schemaVersion ${bk.schemaVersion}；data 欄位相同=${J(Object.keys(bk.data)) === J(Object.keys(oldBk.data))}；含執行期欄位=${/preparing|sttStatus|recognizedText|audiostart/.test(J(bk))}` };
});
await p.close();
R.save(resultPath("e2e-compat-r10"));
console.log(`e2e-compat-r10：通過 ${R.results.filter((r) => r.result === "通過").length}、失敗 ${R.results.filter((r) => r.result === "失敗").length}`);
