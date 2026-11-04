// 診斷（第 7 輪，不列入 run-all）：E-117（範圍外，只記錄）——以 v1.0.0 舊交付檔匯入 1.1.0 格式（schemaVersion 3）的備份
// 用法：QA_V100=<v1.0.0 html> node tests/e2e/diag-r7-e117.mjs
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { launch, sleep, ROOT } from "./lib/cdp.mjs";
import { TOAST_RECORDER } from "./lib/inits.mjs";
import { stateRecord } from "./lib/state.mjs";

const OLD = pathToFileURL(process.env.QA_V100).href;
const TMP = process.env.QA_TMP || path.join(ROOT, "tests", "results", "tmp");
const rec = stateRecord(725, { flashcardPosition: { wordKey: "of", ordinal: 2 }, part5CorrectIds: ["p5-001"], part5UnansweredOnly: true });
const backup = { format: "english-master-track-backup", schemaVersion: 3, exportedAt: new Date().toISOString(), contentDataVersion: "2026.10.30", data: rec.data };
const f = path.join(TMP, "e117-v3.json"); fs.writeFileSync(f, JSON.stringify(backup, null, 2));
const p = await launch();
await p.addInitScript(TOAST_RECORDER);
p.autoStart = false;
await p.send("Page.setInterceptFileChooserDialog", { enabled: true });
p.onEvent((m) => { if (m.method === "Page.fileChooserOpened") p.chooser = m.params; });
await p.goto(OLD);
const ver = await p.ev(`(document.querySelector('meta[name="emt-app-version"]') || {}).content`);
p.chooser = null; await p.click("#cz-restore"); for (let i = 0; i < 60 && !p.chooser; i++) await sleep(50);
await p.send("DOM.setFileInputFiles", { files: [f], backendNodeId: p.chooser.backendNodeId }); await sleep(500);
const toasts = await p.ev(`window.__qaToasts.map((t) => t.text)`);
const dlg = await p.ev(`(() => { const d = document.querySelector(".dialog"); return d ? d.innerText : null; })()`);
const key = await p.ev(`localStorage.getItem("englishMasterTrack:state")`);
const out = { date: new Date().toISOString(), oldVersion: ver, toasts, dialog: dlg, stateKeyWritten: key !== null, exceptions: p.log.exceptions };
fs.mkdirSync(path.join(ROOT, "tests", "results", "diag"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "tests", "results", "diag", "r7-e117.json"), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out));
await p.close();
