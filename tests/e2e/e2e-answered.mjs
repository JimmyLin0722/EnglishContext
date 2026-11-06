// QA E2E 第 9 輪（PRD v0.19，R-27 一）：主控台與結算改看已答對題數（US-49，AC-49-01～AC-49-08，E-135～E-137；另涵蓋 AC-17-04、AC-11-07、AC-32-02、AC-45-05、AC-48-06、AC-46-08）
// 依據：契約 §13.1 AS-1～AS-7、V-ANS-01～03；architecture v0.14 §7.25.1、§10.11。驅動：lib/cdp.mjs（file://）。
// AC-49-06：以 git 25e3c3f 取回 v1.2.0 交付檔，實際作答、翻卡、匯出備份，再以 1.3.0 開啟同一份 localStorage；不以手寫資料代替。
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { launch, recorder, sleep, FILE_URL, ROOT, resultPath } from "./lib/cdp.mjs";
import { TOAST_RECORDER, fakeTts, fakeStt, fakeMic } from "./lib/inits.mjs";
import { KEY, stateRecord, dialogInfo, expandBackup, V3_KEYS } from "./lib/state.mjs";

const R = recorder("e2e-answered");
const TMP = process.env.QA_TMP || path.join(ROOT, "tests", "results", "tmp"); fs.mkdirSync(TMP, { recursive: true });
const J = (x) => JSON.stringify(x);
const PKG_VER = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")).version; // 第 10 輪：版本行改讀 package.json（1.3.1），不寫死
const id = (n) => "p5-" + String(n).padStart(3, "0");
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => id(a + i));
const V12 = path.join(TMP, "v1.2.0.html");
if (!fs.existsSync(V12)) fs.writeFileSync(V12, execFileSync("git", ["show", "25e3c3f:dist/english-master-track.html"], { cwd: ROOT, maxBuffer: 64 << 20 }));
const V12_URL = pathToFileURL(V12).href;
const SIZES = [[375, 667], [390, 844], [412, 915], [768, 1024], [1366, 768], [1920, 1080]];
const TWO = [[375, 667], [1366, 768]];
const line = (k, q = 200) => { const raw = Math.round((k / q) * 100); const pp = k < q ? Math.min(raw, 99) : raw; return `已答對 ${k} / ${q} 題（${pp}%）`; };
const BAD = /NaN|Infinity|undefined|0 \/ 0/;

async function open({ vp = [1366, 900], chooser = true } = {}) {
  const p = await launch();
  for (const s of [TOAST_RECORDER, fakeTts("ok"), fakeStt("ok"), fakeMic("ok")]) await p.addInitScript(s);
  await p.viewport(vp[0], vp[1]);
  await p.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  if (chooser) { await p.send("Page.setInterceptFileChooserDialog", { enabled: true }); p.onEvent((m) => { if (m.method === "Page.fileChooserOpened") p.chooser = m.params; }); }
  return p;
}
const seed = async (p, { part5 = {}, ids = [], over = {}, url = FILE_URL } = {}) => {
  const rec = stateRecord(725, { part5: { currentIndex: 0, lockedSelection: null, phase: "question", roundAnswered: 0, roundCorrect: 0, totalAnswered: 0, totalCorrect: 0, ...part5 }, part5CorrectIds: ids, sttNoticeAcknowledged: true, ...over });
  await p.ev(`localStorage.setItem(${J(KEY)}, ${J(J(rec))})`); await p.goto(url); return rec;
};
const dash = (p) => p.ev(`(() => { EMT.router.go("dashboard"); const d = document.querySelector("#view-dashboard"); const v = d.querySelector(".db-stat--answered .db-stat__value"); const lb = d.querySelector(".db-stat--answered .db-stat__label"); const t = d.innerText; const cs = getComputedStyle(v);
  return { text: v.textContent, label: lb.textContent, count: t.split(v.textContent).length - 1, numeric: cs.fontVariantNumeric, fs: parseFloat(cs.fontSize), all: t, oldPct: /正確率/.test(t) }; })()`);
const summary = (p) => p.ev(`(() => { const v = document.getElementById("view-part5"); const q = (s) => v.querySelector(s); const t = (s) => (q(s) ? q(s).textContent : null);
  return { title: t("[data-p5=summary-title]"), score: t("[data-p5=summary-score]"), none: t("[data-p5=summary-none]"), answered: t("[data-p5=summary-answered]"), answeredCount: v.querySelectorAll("[data-p5=summary-answered]").length, count: t("[data-p5=correct-count]"), allCorrect: !!q("[data-p5=allcorrect-title]"), allTitle: t("[data-p5=allcorrect-title]"), text: v.innerText, number: t("[data-p5=number]") }; })()`);
const goSummary = async (p, st) => { await seed(p, st); await p.ev(`EMT.router.go("part5")`); await sleep(40); };
const ci = (p, i) => p.ev(`PART5_QUESTION_BANK[${i}].correctIndex`);
const answer = async (p, i, ok = true) => { const c = await ci(p, i); await p.click(`#view-part5 [data-p5=option][data-index="${ok ? c : (c + 1) % 4}"]`); await sleep(60); };
const next = async (p) => { await p.click("#view-part5 [data-p5=next]"); await sleep(40); };
const ls = (p) => p.ev(`JSON.parse(localStorage.getItem(${J(KEY)}))`);
const lsRaw = (p) => p.ev(`localStorage.getItem(${J(KEY)})`);
const toasts = (p) => p.ev(`(window.__qaToasts || []).map((t) => t.text)`);
const errs = (p) => p.log.exceptions.concat(p.log.console.filter((c) => c.type === "error").map((c) => c.text));
const netReqs = (p) => p.log.requests.filter((r) => !/^(file|blob|data|about|chrome-extension):/.test(r.url));
async function exportNow(p) { await p.ev(`EMT.router.go("dashboard")`); await sleep(200); await expandBackup(p); for (const f of fs.readdirSync(p.downloads)) { try { fs.rmSync(path.join(p.downloads, f)); } catch { /* 忽略 */ } } await p.click('[data-action="export-backup"]'); for (let i = 0; i < 80; i++) { const now = fs.readdirSync(p.downloads).filter((f) => f.endsWith(".json")); if (now.length) { await sleep(150); return fs.readFileSync(path.join(p.downloads, now[0]), "utf8"); } await sleep(100); } throw new Error("未下載備份檔"); }
async function importFile(p, content) { const f = path.join(TMP, "ans-" + Date.now() + ".json"); fs.writeFileSync(f, content); await p.ev(`EMT.router.go("dashboard")`); await sleep(200); await expandBackup(p); p.chooser = null; await p.click('[data-action="import-backup"]'); for (let i = 0; i < 60 && !p.chooser; i++) await sleep(50); if (!p.chooser) throw new Error("未出現檔案選擇器"); await p.send("DOM.setFileInputFiles", { files: [f], backendNodeId: p.chooser.backendNodeId }); await sleep(350); const d = await dialogInfo(p); if (d) { await p.click('.dialog [data-action="ok"]'); await sleep(400); } return d; }

// ═════ AC-49-01、AC-49-08：K = 48；全部尺寸 ═════
{
  const p = await open(); await p.goto();
  await R.check("TC-49-01", "AC-49-01、AC-17-01、AC-17-04、AC-30-01、AC-30-10、AC-39-05、AC-39-06、AC-38-07", async () => {
    await seed(p, { part5: { totalAnswered: 300, totalCorrect: 210 }, ids: range(1, 48) });
    const out = []; let ok = true;
    for (const [w, h] of TWO) { await p.viewport(w, h, w < 768); await sleep(80); const d = await dash(p);
      const g = d.label === "模擬測驗" && d.text === "已答對 48 / 200 題（24%）" && d.count === 1 && /tabular-nums/.test(d.numeric) && !d.all.includes("70%") && !d.oldPct;
      ok = ok && g; out.push(`${w}px：標籤「${d.label}」「${d.text}」${d.count} 次、${d.numeric}、70% 出現=${d.all.includes("70%")}、含正確率=${d.oldPct}`); }
    return { ok, note: out.join("；") };
  });
  await R.check("TC-17-04c", "AC-17-04", async () => {
    await seed(p, { part5: { totalAnswered: 10, totalCorrect: 7 }, ids: range(1, 7) }); const d = await dash(p);
    return { ok: d.text === "已答對 7 / 200 題（4%）" && !d.all.includes("70%"), note: `K = 7、a = 10、c = 7 →「${d.text}」；70% 出現=${d.all.includes("70%")}` };
  });
  await R.check("TC-49-02", "AC-49-02", async () => {
    const out = []; let ok = true;
    for (const k of [0, 1, 199, 200]) { await goSummary(p, { part5: { currentIndex: 199, phase: "summary", roundAnswered: 1, roundCorrect: 1, totalAnswered: 300, totalCorrect: 200 }, ids: range(1, k) }); const s = await summary(p); const d = await dash(p);
      const want = line(k);
      const g = d.text === want && s.answered === want && !s.allCorrect && !BAD.test(d.text) && !BAD.test(s.text) && d.text !== "—";
      ok = ok && g; out.push(`K=${k}：主控台「${d.text}」、結算「${s.answered}」`); }
    return { ok, note: out.join("；") + "（開關關閉；開關開啟且 K = Q 的全部答對畫面不另加行，見 TC-49-03）" };
  });
  await R.check("TC-49-03b", "AC-49-02（K = Q、開關關閉的結算）、AC-48-07", async () => {
    await goSummary(p, { part5: { currentIndex: 199, phase: "summary", roundAnswered: 0, roundCorrect: 0, totalAnswered: 200, totalCorrect: 200 }, ids: range(1, 200) }); const s = await summary(p);
    return { ok: s.none === "本輪沒有新作答的題目" ? s.answered === "已答對 200 / 200 題（100%）" : s.allCorrect, note: `K = Q、開關關閉 y = 0：標題「${s.title}」「${s.none}」「${s.answered}」全部答對=${s.allCorrect}` };
  });
  await R.check("TC-49-03", "AC-49-03、AC-48-06、AC-45-05、AC-45-06", async () => {
    const out = []; let ok = true;
    for (const only of [false, true]) {
      const over = { part5UnansweredOnly: only };
      await goSummary(p, { part5: { currentIndex: 199, phase: "summary", roundAnswered: 5, roundCorrect: 3, totalAnswered: 50, totalCorrect: 30 }, ids: range(1, 30), over }); const a = await summary(p);
      await goSummary(p, { part5: { currentIndex: 199, phase: "summary", roundAnswered: 0, roundCorrect: 0, totalAnswered: 50, totalCorrect: 30 }, ids: range(1, 30), over }); const b = await summary(p);
      await goSummary(p, { part5: { currentIndex: 199, phase: "summary", roundAnswered: 0, roundCorrect: 0, totalAnswered: 0, totalCorrect: 0 }, ids: [], over }); const c = await summary(p);
      const g = a.score === "答對 3 / 5" && a.none === null && a.answered === line(30) && b.none === "本輪沒有新作答的題目" && b.score === null && b.answered === line(30) && c.answered === line(0) && !/累計答對/.test(a.text + b.text + c.text) && !BAD.test(a.text + b.text + c.text);
      ok = ok && g; out.push(`開關 ${only}：(a)「${a.score}」「${a.answered}」；(b)「${b.none}」「${b.answered}」；a = 0「${c.answered}」`);
    }
    await goSummary(p, { part5: { currentIndex: 199, phase: "summary", roundAnswered: 2, roundCorrect: 2, totalAnswered: 200, totalCorrect: 200 }, ids: range(1, 200), over: { part5UnansweredOnly: true } }); const d = await summary(p);
    const gd = d.allCorrect && d.allTitle === "200 題全部答對！" && d.answeredCount === 0 && d.score === "答對 2 / 2"; ok = ok && gd; out.push(`全部答對：「${d.allTitle}」「${d.score}」已答對行 ${d.answeredCount} 個`);
    return { ok, note: out.join("；") };
  });
  await R.check("TC-49-04", "AC-49-04、AC-45-06、AC-48-02", async () => {
    await seed(p, { part5: { currentIndex: 10 }, ids: range(1, 5) }); const out = []; let ok = true;
    const check = async (k, why) => { const d = await dash(p); await p.ev(`EMT.router.go("part5")`); await sleep(40); const s = await summary(p); const g = d.text === line(k) && s.count === `已答對 ${k} / 200 題`; ok = ok && g; out.push(`${why}：主控台「${d.text}」模擬測驗「${s.count}」`); };
    await p.ev(`EMT.router.go("part5")`); await sleep(40);
    await answer(p, 10, true); await check(6, "(a) 答對未曾答對題"); await next(p);
    await answer(p, 11, false); await check(6, "(b) 答錯"); await next(p);
    // (c) 經過鎖定檢視：回第 1 題（曾答對）
    await seed(p, { part5: { currentIndex: 2 }, ids: range(1, 5) }); await p.ev(`EMT.router.go("part5")`); await sleep(40); const locked = await p.ev(`document.querySelector("[data-p5=correct-badge]") ? document.querySelector("[data-p5=correct-badge]").textContent : null`); await next(p); await check(5, "(c) 鎖定檢視「" + locked + "」");
    // (d) 不存在與重複 id
    await seed(p, { ids: ["p5-001", "p5-001", "p5-002", "p5-999", "not-exist", "p5-002"] }); await check(2, "(d) 不存在與重複 id");
    await goSummary(p, { part5: { currentIndex: 199, phase: "summary", roundAnswered: 1, roundCorrect: 1, totalAnswered: 1, totalCorrect: 1 }, ids: ["p5-001", "p5-001", "p5-002", "p5-999", "not-exist"] }); const s2 = await summary(p); const d2 = await dash(p);
    const g = s2.answered === d2.text && d2.text === line(2); ok = ok && g; out.push(`(d) 結算「${s2.answered}」= 主控台「${d2.text}」`);
    return { ok, note: out.join("；") };
  });
  await R.check("TC-49-05", "AC-49-05、AC-11-07、AC-32-02、AC-46-08、AC-48-11、E-136", async () => {
    const out = []; let ok = true; const base = { part5: { currentIndex: 199, phase: "summary", roundAnswered: 2, roundCorrect: 1, totalAnswered: 9, totalCorrect: 6 }, ids: range(1, 6) };
    // (a) 重新開始
    await goSummary(p, base); await p.click("#view-part5 [data-p5=restart]"); await sleep(60); let d = await dash(p); await p.reload(); const d1 = await dash(p); const sa = await ls(p);
    const ga = d.text === line(6) && d1.text === line(6) && sa.data.part5.totalAnswered === 9 && sa.data.part5.totalCorrect === 6; ok = ok && ga; out.push(`(a) 重新開始：「${d.text}」、載入後「${d1.text}」、a=${sa.data.part5.totalAnswered}、c=${sa.data.part5.totalCorrect}`);
    // (b) 清除
    await goSummary(p, base); await p.click("#view-part5 [data-p5=clear]"); await sleep(80); const dlg = await dialogInfo(p); await p.click('.dialog [data-action="ok"]'); await sleep(120); d = await dash(p); await p.ev(`EMT.router.go("part5")`); await sleep(40); await p.reload(); const d2 = await dash(p); const sb = await ls(p);
    const gb = d.text === line(0) && d2.text === line(0) && sb.data.part5.totalAnswered === 9 && sb.data.part5.totalCorrect === 6 && J(sb.data.part5CorrectIds) === "[]" && dlg.message.includes("將清除全部題目的答對紀錄") && dlg.message.includes("「已答對」會回到 0 題") && !dlg.message.includes("累計答題數與正確率") && J([...dlg.buttons].sort()) === J(["取消", "確定"].sort()); ok = ok && gb; out.push(`(b) 清除：對話框「${dlg.message}」；「${d.text}」、a=${sb.data.part5.totalAnswered}、c=${sb.data.part5.totalCorrect}`);
    // (c) 切換生效色級確認初始化
    await seed(p, base); await p.ev(`EMT.router.go("customizer")`); await sleep(80); await p.click('.cz-level[data-color="orange"]'); await sleep(40); await p.click("#cz-apply"); await sleep(100); const dlg2 = await dialogInfo(p); if (dlg2) { await p.click('.dialog [data-action="ok"]'); await sleep(200); } d = await dash(p); await p.reload(); const d3 = await dash(p); const sc = await ls(p);
    const gc = !!dlg2 && d.text === line(0) && d3.text === line(0) && sc.data.part5.totalAnswered === 0 && sc.data.part5.totalCorrect === 0; ok = ok && gc; out.push(`(c) 初始化：對話框=${!!dlg2}；「${d.text}」、a=${sc.data.part5.totalAnswered}、c=${sc.data.part5.totalCorrect}`);
    // (d) 匯入備份
    await seed(p, { part5: { totalAnswered: 4, totalCorrect: 4 }, ids: range(1, 4) }); const bk = await exportNow(p); await seed(p, base); await importFile(p, bk); d = await dash(p); await p.ev(`EMT.router.go("part5")`); await sleep(40); const cnt = (await summary(p)).count; await p.reload(); const d4 = await dash(p);
    const gd = d.text === line(4) && d4.text === line(4) && cnt === "已答對 4 / 200 題"; ok = ok && gd; out.push(`(d) 匯入（K = 4）：「${d.text}」模擬測驗「${cnt}」載入後「${d4.text}」`);
    return { ok, note: out.join("；") };
  });
  await R.check("TC-49-07", "AC-49-07、AC-46-08、AC-45-05（V-ANS-03）", async () => {
    const WORDS = ["正確率", "累計答對"]; const scan = async (label, out) => { const t = await p.ev(`document.body.innerText`); const hits = WORDS.filter((w) => t.includes(w)); out.push(`${label}${hits.length ? "✗" + hits.join("、") : "0"}`); return hits.length === 0; };
    const out = []; let ok = true;
    await seed(p, { part5: { totalAnswered: 50, totalCorrect: 30 }, ids: range(1, 30) });
    for (const t of ["dashboard", "customizer", "flashcards", "part5", "sources", "about", "contact", "privacy"]) { await p.ev(`EMT.router.go(${J(t)})`); await sleep(60); ok = (await scan(t + "：", out)) && ok; }
    await p.ev(`EMT.router.go("part5")`); await sleep(40); await p.click("#view-part5 [data-p5=clear]"); await sleep(80); ok = (await scan("清除對話框：", out)) && ok; await p.click('.dialog [data-action="cancel"]'); await sleep(80);
    await p.ev(`EMT.router.go("customizer")`); await sleep(60); await p.click('.cz-level[data-color="orange"]'); await sleep(40); await p.click("#cz-apply"); await sleep(80); ok = (await scan("初始化對話框：", out)) && ok; await p.click('.dialog [data-action="cancel"]'); await sleep(80);
    await goSummary(p, { part5: { currentIndex: 199, phase: "summary", roundAnswered: 2, roundCorrect: 1, totalAnswered: 50, totalCorrect: 30 }, ids: range(1, 30) }); ok = (await scan("結算：", out)) && ok;
    await goSummary(p, { part5: { totalAnswered: 200, totalCorrect: 200 }, ids: range(1, 200), over: { part5UnansweredOnly: true } }); ok = (await scan("全部答對：", out)) && ok;
    const T = (await toasts(p)).join("；"); const hitT = WORDS.filter((w) => T.includes(w)); ok = ok && hitT.length === 0; out.push(`Toast 紀錄 ${hitT.length}`);
    await p.ev(`localStorage.clear()`); p.autoStart = false; await p.goto(); await sleep(60); ok = (await scan("首次畫面：", out)) && ok; p.autoStart = true;
    // 單字測驗統計不受影響：畫面文字來源不含舊字詞
    const html = fs.readFileSync(path.join(ROOT, "dist/english-master-track.html"), "utf8"); const dlgOld = html.includes("累計答題數與正確率不受影響"); ok = ok && !dlgOld; out.push(`交付檔含舊確認句=${dlgOld}`);
    return { ok, note: out.join("；") };
  });
  await R.check("TC-49-07b", "AC-49-07（單字測驗統計與 AC-46-08 不受影響）", async () => {
    await p.goto(); await goSummary(p, { part5: { currentIndex: 199, phase: "summary", roundAnswered: 3, roundCorrect: 2, totalAnswered: 8, totalCorrect: 5 }, ids: range(1, 2) }); const s = await summary(p);
    return { ok: s.score === "答對 2 / 3", note: `本輪「${s.score}」保留` };
  });
  await R.check("TC-X-answered-a", "Console 無未處理錯誤、無網路請求", async () => ({ ok: errs(p).length === 0 && netReqs(p).length === 0, note: `錯誤 ${J(errs(p)).slice(0, 300)}；非 file 請求 ${netReqs(p).length}` }));
  await p.close();
}
// AC-49-02 Q = 0（無內建資料 fixture）
if (process.env.QA_FIXTURE_NODATA && fs.existsSync(process.env.QA_FIXTURE_NODATA)) {
  const p = await open(); const url = pathToFileURL(process.env.QA_FIXTURE_NODATA).href; await p.goto(url);
  await R.check("TC-49-02q", "AC-49-02、E-18、E-27（Q = 0）", async () => {
    const rec = stateRecord(725, { part5: { currentIndex: 0, lockedSelection: null, phase: "summary", roundAnswered: 0, roundCorrect: 0, totalAnswered: 0, totalCorrect: 0 }, part5CorrectIds: ["p5-001"], sttNoticeAcknowledged: true });
    await p.ev(`localStorage.setItem(${J(KEY)}, ${J(J(rec))})`); await p.goto(url); const d = await dash(p); await p.ev(`EMT.router.go("part5")`); await sleep(40); const s = await summary(p);
    return { ok: d.text === "—" && s.answeredCount === 0 && !BAD.test(d.all + s.text) && !/已答對 \d+ \/ 0/.test(d.all + s.text), note: `Q = 0：主控台「${d.text}」；模擬測驗頁已答對行 ${s.answeredCount} 個；含 NaN／Infinity／undefined／0 / 0=${BAD.test(d.all + s.text)}` };
  });
  await p.close();
} else R.manual("TC-49-02q", "AC-49-02（Q = 0）", "未提供 QA_FIXTURE_NODATA；由 run-r9 提供");

// ═════ AC-49-08：全部尺寸 ═════
{
  const p = await open(); await p.goto();
  await R.check("TC-49-08", "AC-49-08、AC-20-01、AC-38-04、AC-38-07、AC-39-09", async () => {
    await seed(p, { part5: { currentIndex: 199, phase: "summary", roundAnswered: 2, roundCorrect: 2, totalAnswered: 200, totalCorrect: 200 }, ids: range(1, 200) }); const out = []; let ok = true;
    for (const [w, h] of SIZES) { await p.viewport(w, h, w < 768); await sleep(80); await p.ev(`EMT.router.go("dashboard")`); await sleep(60);
      const r = await p.ev(`(() => { const parse = (c) => { const m = c.match(/rgba?\\(([^)]+)\\)/); const a = m[1].split(/[ ,\\/]+/).filter(Boolean).map(Number); return { r: a[0], g: a[1], b: a[2], a: a.length > 3 ? a[3] : 1 }; }; const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); }; const bgOf = (e) => { for (let n = e; n; n = n.parentElement) { const c = parse(getComputedStyle(n).backgroundColor); if (c.a === 1) return c; } return { r: 255, g: 255, b: 255, a: 1 }; };
        const cells = [...document.querySelectorAll("#view-dashboard .db-stat")]; const tops = cells.map((c) => Math.round(c.getBoundingClientRect().top)); const v = document.querySelector(".db-stat--answered .db-stat__value"); const cr = v.parentElement.getBoundingClientRect(); const vr = v.getBoundingClientRect(); const cs = getComputedStyle(v); const a = parse(cs.color), b = bgOf(v); const L1 = lum(a), L2 = lum(b); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
        const overlap = cells.flatMap((c, i) => cells.slice(i + 1).filter((d) => { const x = c.getBoundingClientRect(), y = d.getBoundingClientRect(); return x.right > y.left + 0.5 && y.right > x.left + 0.5 && x.bottom > y.top + 0.5 && y.bottom > x.top + 0.5; })).length;
        const rg = document.createRange(); rg.selectNodeContents(v); const tr = rg.getBoundingClientRect();
        const big = getComputedStyle(document.querySelector(".db-stat--mastery .db-stat__value")).fontSize; const num = getComputedStyle(document.querySelector(".db-stat--streak .db-stat__num")).fontSize;
        return { sameRow: new Set(tops).size === 1, text: v.textContent, fs: parseFloat(cs.fontSize), ratio: +ratio.toFixed(2), clipped: v.scrollWidth > v.clientWidth + 0.5 || v.scrollHeight > v.clientHeight + 0.5 || tr.right > cr.right + 0.5 || tr.left < cr.left - 0.5, overlap, hs: document.documentElement.scrollWidth > document.documentElement.clientWidth, big, num, lines: Math.round(tr.height / parseFloat(cs.lineHeight)), cellH: Math.round(cr.height), overflow: cs.overflow, nowrap: cs.whiteSpace }; })()`);
      await p.ev(`EMT.router.go("part5")`); await sleep(50);
      const s = await p.ev(`(() => { const v = document.querySelector("[data-p5=summary-answered]"); if (!v) return null; const c = getComputedStyle(v); const r = v.getBoundingClientRect(); return { fs: parseFloat(c.fontSize), left: r.left, right: r.right, vw: innerWidth, hs: document.documentElement.scrollWidth > document.documentElement.clientWidth, text: v.textContent }; })()`);
      // 結算（K < Q：K = 200 開關關閉 y ≥ 1 時為結算畫面）
      const g = r.sameRow && r.text === "已答對 200 / 200 題（100%）" && r.fs >= 14 && r.ratio >= 4.5 && !r.clipped && r.overlap === 0 && !r.hs && (!s || (s.fs >= 14 && s.right <= s.vw + 0.5 && !s.hs)); ok = ok && g;
      out.push(`${w}×${h}：同列=${r.sameRow}、${r.fs}px、對比 ${r.ratio}、裁切=${r.clipped}、重疊 ${r.overlap}、水平捲軸=${r.hs}、${r.lines} 行、其他 2 格 ${r.big}／${r.num}、結算 ${s ? s.fs + "px「" + s.text + "」" : "（全部答對）"}`); }
    return { ok, note: out.join("；") };
  });
  await R.check("TC-39-09r", "AC-39-09、T-111（第 3 格 2～3 行後的首屏）", async () => {
    const out = []; let ok = true;
    for (const [w, h] of SIZES) { await p.viewport(w, h, w < 768); await sleep(60); await p.ev(`EMT.router.go("dashboard"); window.scrollTo(0,0)`); await sleep(80); const r = await p.ev(`(() => { const b = document.querySelector("#view-dashboard .db-start").getBoundingClientRect(); const nav = document.querySelector("#app-nav"); const nr = nav.getBoundingClientRect(); const fixed = getComputedStyle(nav).position === "fixed"; return { top: Math.round(b.top), bottom: Math.round(b.bottom), navTop: fixed ? Math.round(nr.top) : null, inView: b.top >= 0 && b.bottom <= innerHeight, clear: !fixed || b.bottom <= nr.top, scrollY }; })()`); const g = r.inView && r.clear && r.scrollY === 0; ok = ok && g; out.push(`${w}×${h}：按鈕 ${r.top}～${r.bottom}、導覽上緣 ${r.navTop}、=${g}`); }
    return { ok, note: out.join("；") };
  });
  await p.close();
}

// ═════ AC-49-06：v1.2.0 實際資料（不以手寫資料代替）═════
{
  const p = await open(); p.autoStart = false; let raw12 = null; let bk12 = null; let exp = null;
  await R.check("TC-49-06a", "AC-49-06（v1.2.0 實際作答與匯出）", async () => {
    await p.goto(V12_URL); await p.startLearning(); await sleep(100);
    const ver = await p.ev(`(document.querySelector("#app-version") || {}).textContent`);
    await p.go("part5"); await sleep(60);
    for (let i = 0; i < 4; i++) { await answer(p, i, i !== 2); await next(p); }
    await p.go("flashcards"); await sleep(120); await p.click(".fc-card"); await sleep(120); await p.click(".fc-next"); await sleep(100);
    const st = await ls(p); raw12 = await lsRaw(p); bk12 = await exportNow(p); const b = JSON.parse(bk12); exp = { a: st.data.part5.totalAnswered, c: st.data.part5.totalCorrect, ids: st.data.part5CorrectIds };
    const acc = await p.ev(`document.querySelector(".db-stat--accuracy .db-stat__value") ? document.querySelector(".db-stat--accuracy .db-stat__value").textContent : null`);
    return { ok: /1\.2\.0/.test(ver || "") && st.schemaVersion === 3 && exp.a === 4 && exp.c === 3 && exp.ids.length === 3 && b.schemaVersion === 3, note: `v1.2.0「${ver}」實際作答 4 題（對 3）、翻卡 1 張；localStorage schemaVersion ${st.schemaVersion}、a=${exp.a}、c=${exp.c}、紀錄 ${J(exp.ids)}；舊版第 3 格「${acc}」；備份頂層 ${Object.keys(b).join("、")}（${bk12.length} 字元）` };
  });
  await R.check("TC-49-06b", "AC-49-06、AC-47-04、AC-36-03（目前版本開啟 v1.2.0 實際 localStorage，不改寫）", async () => {
    await p.addInitScript(`(() => { window.__sets = 0; const o = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (k === ${J(KEY)}) window.__sets++; return o.call(this, k, v); }; })();`);
    await p.goto("about:blank", { waitReady: false }); await sleep(300); await p.goto(FILE_URL); await sleep(150);
    const raw13 = await lsRaw(p); const sets = await p.ev("window.__sets"); const t = await toasts(p); const entry = await p.entry(); const ver = await p.ev(`document.querySelector("#app-version").textContent`); const d = await dash(p); const st = JSON.parse(raw13); const keys = Object.keys(st.data);
    const stays = raw13 === raw12; return { ok: ver.includes("版本 " + PKG_VER + "（") && stays && sets === 0 && entry === "main" && !t.some((x) => /錯誤|失敗/.test(x)) && d.text === line(exp.ids.length) && !d.all.includes("75%") && st.schemaVersion === 3 && J(keys.slice().sort()) === J([...V3_KEYS].sort()), note: `「${ver}」；入口 ${entry}；localStorage 位元組不變=${stays}、setItem ${sets}；Toast ${J(t)}；主控台「${d.text}」（舊正確率 75% 不顯示）；schemaVersion ${st.schemaVersion}、${keys.length} 欄` };
  });
  await R.check("TC-49-06c", "AC-49-06、AC-11-03（作答仍更新累計）、AC-48-01", async () => {
    await p.ev(`EMT.router.go("part5")`); await sleep(50); const before = (await ls(p)).data.part5; const n = before.currentIndex; const c = await ci(p, n); await p.click(`#view-part5 [data-p5=option][data-index="${c}"]`); await sleep(60); const after = await ls(p); const d = await dash(p);
    return { ok: after.data.part5.totalAnswered === before.totalAnswered + 1 && after.data.part5.totalCorrect === before.totalCorrect + 1 && d.text === line(exp.ids.length + 1) && after.schemaVersion === 3, note: `第 ${n + 1} 題答對：a ${before.totalAnswered}→${after.data.part5.totalAnswered}、c ${before.totalCorrect}→${after.data.part5.totalCorrect}、主控台「${d.text}」` };
  });
  await R.check("TC-49-06d", "AC-49-06、AC-24-02（匯出格式與 v1.2.0 相同）", async () => {
    const bk = JSON.parse(await exportNow(p)); const old = JSON.parse(bk12); const tops = J(Object.keys(bk)); const dataA = Object.keys(bk.data).sort(), dataB = Object.keys(old.data).sort(); const types = (o) => Object.keys(o).sort().map((k) => k + ":" + (Array.isArray(o[k]) ? "array" : o[k] === null ? "null" : typeof o[k])).join();
    return { ok: tops === J(Object.keys(old)) && J(dataA) === J(dataB) && bk.schemaVersion === 3 && types(bk).replace(/null/g, "x") === types(old).replace(/null/g, "x"), note: `頂層 1.3.0 ${tops} = v1.2.0；data 欄位 ${dataA.length} 欄相同=${J(dataA) === J(dataB)}；schemaVersion ${bk.schemaVersion}` };
  });
  await R.check("TC-49-06e", "AC-49-06、AC-24-03、AC-49-05 (d)（1.3.0 匯入 v1.2.0 實際備份）", async () => {
    await p.ev(`localStorage.clear()`); await p.goto(); await p.startLearning(); await sleep(100); await importFile(p, bk12); const st = await ls(p); const d = await dash(p); const t = await toasts(p);
    return { ok: st.schemaVersion === 3 && st.data.part5.totalAnswered === exp.a && st.data.part5.totalCorrect === exp.c && J(st.data.part5CorrectIds) === J(exp.ids) && d.text === line(exp.ids.length) && !t.some((x) => /錯誤|格式/.test(x)), note: `匯入 v1.2.0 備份：a=${st.data.part5.totalAnswered}、c=${st.data.part5.totalCorrect}、紀錄 ${st.data.part5CorrectIds.length} 筆、主控台「${d.text}」；Toast ${J(t).slice(0, 200)}` };
  });
  await R.check("TC-49-06f", "AC-49-06、AC-32-01（有學習紀錄仍以累計答題數判定）、E-135", async () => {
    await seed(p, { part5: { totalAnswered: 12, totalCorrect: 8 }, ids: [] }); const d = await dash(p); await p.ev(`EMT.router.go("customizer")`); await sleep(80); await p.click('.cz-level[data-color="orange"]'); await sleep(40); await p.click("#cz-apply"); await sleep(100); const dlg = await dialogInfo(p); if (dlg) { await p.click('.dialog [data-action="cancel"]'); await sleep(80); } const st = await ls(p);
    return { ok: !!dlg && d.text === line(0) && st.data.part5.totalAnswered === 12, note: `K = 0、a = 12（v1.1.0 以前作答）：主控台「${d.text}」、切換色級跳確認=${!!dlg}、累計保留 ${st.data.part5.totalAnswered}` };
  });
  await R.check("TC-X-answered-b", "Console 無未處理錯誤、無網路請求（v1.2.0 → 1.3.0）", async () => ({ ok: errs(p).length === 0 && netReqs(p).length === 0, note: `錯誤 ${J(errs(p)).slice(0, 300)}；非 file 請求 ${netReqs(p).length}` }));
  await p.close();
}
R.save(resultPath("e2e-answered"));
const pass = R.results.filter((r) => r.result === "通過").length; const fail = R.results.filter((r) => r.result === "失敗").length;
console.log(`e2e-answered：通過 ${pass}、失敗 ${fail}、共 ${R.results.length}`);
