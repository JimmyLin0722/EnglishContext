// 第 6 輪診斷（不列入 run-all）：persist.js 驗證訊息「origin 為 template 時須為範本代碼」是否會出現在畫面（HT-7）
import fs from "node:fs"; import os from "node:os"; import path from "node:path";
import { FILE_URL, KEY, sleep, launchBrowser, newEnv, startLearning } from "./lib/pwa-env.mjs";
import { TOAST_RECORDER } from "./lib/inits.mjs";
const b = await launchBrowser(); const e = await newEnv(b, { serviceWorkers: "block", inits: [TOAST_RECORDER] }); const p = await e.newPage();
await p.goto(FILE_URL); await startLearning(p);
const bk = JSON.parse(await p.evaluate(() => EMT.store.actions.exportBackup().json));
bk.data.customVocab = [{ word: "Qaz", meaning: "x", phonetic: "", pos: "", collocation: "", example: "", academicContext: "", origin: "template", templateId: "zz", createdAt: new Date().toISOString() }];
const f = path.join(fs.mkdtempSync(path.join(process.env.QA_TMP || os.tmpdir(), "diag6-")), "bad.json"); fs.writeFileSync(f, JSON.stringify(bk));
await p.click(".db-backup__toggle").catch(() => {}); await sleep(150);
const [fc] = await Promise.all([p.waitForEvent("filechooser"), p.click('[data-action="import-backup"]')]); await fc.setFiles(f); await sleep(500);
const dlg = await p.evaluate(() => (document.querySelector(".dialog") || {}).innerText || null);
if (dlg) { await p.click('.dialog [data-action="ok"]').catch(() => {}); await sleep(400); }
const out = { dialog: dlg, toasts: await p.evaluate(() => window.__qaToasts.map((t) => t.text)), body: (await p.evaluate(() => document.body.innerText)).includes("範本"), ls: JSON.parse(await p.evaluate((k) => localStorage.getItem(k), KEY)).data.customVocab.length };
console.log(JSON.stringify(out)); fs.writeFileSync("tests/results/diag/r6-importerr.json", JSON.stringify(out, null, 2));
await b.close();
