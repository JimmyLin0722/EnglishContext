// QA E2E 套件 2：自訂單字、領域範本、抽認卡、出處標示、四選一、打卡、備份匯出匯入
// US-04、US-05、US-06、US-09、US-17（AC-17-02、AC-17-03、AC-17-05）、US-23（AC-23-01）、US-24
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { launch, recorder, sleep, FILE_URL, resultPath } from "./lib/cdp.mjs";
import { TOAST_RECORDER, fakeTts, fakeStt, fakeDate, fakeMic } from "./lib/inits.mjs";
import { stateRecord, seed, apply as applyGoal, clickCard, expandBackup } from "./lib/state.mjs";
// 第 5 輪（PRD v0.13）：匯出、匯入前先展開「資料備份」（AC-39-08）；單字掌握數改讀 3 格數據小字「已掌握 N 字」、打卡天數改讀 3 格數據（AC-39-05）
// 第 3 輪（PRD v0.9／v0.10）：加麥克風替身（按麥克風先取得麥克風）；目標分數改以既有狀態或點卡片設定

const R = recorder("e2e-cards");
const TMP = process.env.QA_TMP || path.resolve("tests/results/tmp");
fs.mkdirSync(TMP, { recursive: true });
const KEY = "englishMasterTrack:state";
const XSS = "<img src=x onerror=alert(1)>";
const XSS2 = "<img src=x onerror=\"window.__xss=1\"><script>window.__xss=2</script>";

const p = await launch();
await p.addInitScript(TOAST_RECORDER);
await p.addInitScript(fakeTts("ok"));
await p.addInitScript(fakeStt("ok"));
await p.addInitScript(fakeMic("ok"));
await p.viewport(1366, 900);
await p.send("Page.setInterceptFileChooserDialog", { enabled: true });
let chooser = null;
p.onEvent((m) => { if (m.method === "Page.fileChooserOpened") chooser = m.params; });
await p.goto();

const toastsSince = async (n) => p.ev(`window.__qaToasts.slice(${n}).map((t) => t.text)`);
const toastCount = () => p.ev(`window.__qaToasts.length`);
const state = () => p.ev(`EMT.store.getState()`);
async function addWord(f) {
  await p.go("customizer");
  for (const k of ["word", "meaning", "phonetic", "pos", "collocation", "example"]) await p.type(`#cv-${k}`, f[k] || "");
  await p.click('.cv-form button[type="submit"]'); await sleep(80);
  return p.ev(`(() => { const o = {}; for (const k of ["word","meaning","phonetic","pos","collocation","example"]) { const e = document.getElementById("cv-" + k + "-error"); o[k] = e && !e.hidden ? e.textContent : ""; }
    const m = document.querySelector(".cv-form__message"); o.message = m && !m.hidden ? m.textContent : ""; return o; })()`);
}
const card = () => p.ev(`(() => { const c = document.querySelector(".fc-card"); if (!c) return null; const vis = (e) => !!e && !e.hidden && !e.closest("[hidden]") && e.getClientRects().length > 0;
  const fields = (sel) => [...document.querySelectorAll(sel + " .fc-field")].filter(vis).map((f) => ({ k: f.className.replace(/.*fc-field--/, ""), label: f.querySelector(".fc-field__label").textContent, value: f.querySelector(".fc-field__value").textContent }));
  return { flipped: c.dataset.flipped, kind: c.className, word: document.querySelector(".fc-front .fc-word").textContent, phon: (document.querySelector(".fc-front .fc-phonetic") || {}).textContent,
    front: fields(".fc-front"), back: fields(".fc-back"), frontVisible: vis(document.querySelector(".fc-front")), backVisible: vis(document.querySelector(".fc-back")),
    attrib: [...document.querySelectorAll(".fc-attrib__line")].map((e) => e.textContent), pos: document.querySelector(".fc-position").textContent, total: document.querySelector(".fc-total").textContent,
    tts: [...document.querySelectorAll(".fc-front .sp-tts__btn")].map((b) => b.textContent), mic: !!document.querySelector(".fc-front .sp-mic"), net: (document.querySelector(".fc-front .sp-net") || {}).textContent,
    text: document.querySelector(".fc-main").innerText }; })()`);
async function gotoCard(i) { await p.go("flashcards"); await p.ev(`EMT.store.actions.gotoCard(${i})`); await sleep(40); }
const studyLen = () => p.ev(`EMT.store.getState().runtime.studySet.length`);

async function importFile(content, { confirm = true, name = "backup.json" } = {}) {
  const f = path.join(TMP, "imp-" + Date.now() + "-" + name);
  fs.writeFileSync(f, content);
  await p.go("dashboard"); await sleep(300); await expandBackup(p);
  const n = await toastCount();
  chooser = null;
  await p.click('[data-action="import-backup"]');
  for (let i = 0; i < 40 && !chooser; i++) await sleep(50);
  if (!chooser) throw new Error("未出現檔案選擇器");
  await p.send("DOM.setFileInputFiles", { files: [f], backendNodeId: chooser.backendNodeId });
  await sleep(250);
  const dlg = await p.ev(`(() => { const d = document.querySelector(".dialog"); return d ? d.innerText : null; })()`);
  if (dlg) { await p.click(`.dialog [data-action="${confirm ? "ok" : "cancel"}"]`); await sleep(250); }
  return { dialog: dlg, toasts: await toastsSince(n) };
}

// ═════════ US-04 自訂單字 ═════════
await R.check("TC-04-01", "AC-04-01", async () => {
  await p.go("customizer");
  const f = await p.ev(`[...document.querySelectorAll(".cv-form .field")].map((d) => d.querySelector("label").textContent)`);
  const exp = ["英文單字（必填）", "中文釋義（必填）", "音標（選填）", "詞性（選填）", "搭配詞（選填）", "論文例句（選填）"];
  return { ok: JSON.stringify(f) === JSON.stringify(exp), note: f.join("、") };
});

await R.check("TC-04-03", "AC-04-03", async () => {
  const before = (await state()).data.customVocab.length;
  const a = await addWord({ word: "", meaning: "測試" });
  const b = await addWord({ word: "qawordx", meaning: "   " });
  const after = (await state()).data.customVocab.length;
  return { ok: !!a.word && !a.meaning && !!b.meaning && before === after, note: `英文空白 → 「${a.word}」；釋義空白 → 「${b.meaning}」；自訂字數 ${before} → ${after}` };
});

await R.check("TC-04-02", "AC-04-02", async () => {
  const n0 = await studyLen();
  const n = await toastCount();
  const r = await addWord({ word: "kubernetes", meaning: "容器編排平台", phonetic: "/ˌkubɚˈnɛtiz/", pos: "n.", collocation: "deploy on kubernetes", example: "We deploy every service on Kubernetes." });
  const list = await p.ev(`[...document.querySelectorAll(".cv-item")].map((li) => li.innerText.replace(/\\n/g, " "))`);
  const n1 = await studyLen();
  await gotoCard(n1 - 1);
  const c = await card();
  const spokenBefore = await p.ev(`window.__qaTts.spoken.length`);
  await p.click(".fc-front .sp-tts__btn"); await sleep(150);
  const spoken = await p.ev(`window.__qaTts.spoken.slice(${spokenBefore})`);
  return { ok: !r.word && list.some((t) => t.includes("kubernetes") && t.includes("自訂擴充")) && n1 === n0 + 1 && c.word === "kubernetes" && c.tts.length === 2 && c.mic && spoken.length === 1 && spoken[0].text === "kubernetes",
    note: `toast ${JSON.stringify(await toastsSince(n))}；清單「${list.find((t) => t.includes("kubernetes"))}」；單字集 ${n0} → ${n1}；卡片 ${c.word}、${c.pos}、TTS ${c.tts.join("/")}、麥克風=${c.mic}；朗讀 ${JSON.stringify(spoken)}` };
});

await R.check("TC-04-04", "AC-04-04", async () => {
  const r = await addWord({ word: "qaxss", meaning: XSS, phonetic: XSS, pos: XSS, collocation: XSS2, example: XSS2 });
  const r2 = await addWord({ word: XSS, meaning: XSS });
  await sleep(200);
  const list = await p.ev(`(() => { const items = [...document.querySelectorAll(".cv-item")].filter((li) => li.textContent.includes("<img")); return { n: items.length, text: items.map((i) => i.innerText.slice(0, 120)), imgs: document.querySelectorAll("#view-customizer img, #view-customizer script").length }; })()`);
  const idx = (await state()).runtime.studySet.findIndex((c) => (c.word || (c.item && c.item.word)) === "qaxss");
  const sset = (await state()).runtime.studySet;
  const i2 = sset.findIndex((c) => JSON.stringify(c).includes("qaxss"));
  await gotoCard(i2); await p.click(".fc-flip");
  const c = await card();
  const imgs = await p.ev(`document.querySelectorAll("img").length + document.querySelectorAll("body script").length - 2`);
  const flag = await p.ev(`window.__xss === undefined`);
  const ok = list.n >= 1 && list.imgs === 0 && c.text.includes("<img src=x onerror=alert(1)>") && imgs === 0 && flag && p.log.dialogs.length === 0;
  return { ok, note: `第二筆（英文單字欄為 XSS 字串）結果 ${JSON.stringify(r2)}；清單含原文字元 ${list.n} 筆、img/script 元素 ${list.imgs}；卡片顯示原文=${c.text.includes(XSS)}；整頁 img/額外 script ${imgs}；腳本未執行=${flag}；alert 對話框 ${p.log.dialogs.length}（studySet 索引 ${idx}/${i2}）` };
});

await R.check("TC-04-06", "AC-04-06", async () => {
  const a = await addWord({ word: "Office", meaning: "辦公室" });
  await p.click('[data-template="cs"]'); await sleep(100);
  const b = await addWord({ word: "LATENCY", meaning: "延遲" });
  const keys = (await state()).data.customVocab.map((c) => c.word.toLowerCase());
  return { ok: a.word === "單字已存在" && b.word === "單字已存在" && keys.filter((k) => k === "latency").length === 1 && !keys.includes("office"), note: `內建 Office → 「${a.word}」；自訂已有 Latency 再加 LATENCY → 「${b.word}」` };
});

await R.check("TC-04-05", "AC-04-05", async () => {
  const before = (await state()).data.customVocab;
  await p.reload();
  const after = (await state()).data.customVocab;
  await p.go("customizer");
  const listText = await p.ev(`document.querySelector(".cv-list").innerText`);
  return { ok: JSON.stringify(before) === JSON.stringify(after) && listText.includes("kubernetes") && listText.includes(XSS), note: `重載前後自訂單字 ${before.length} / ${after.length} 筆，內容完全相同=${JSON.stringify(before) === JSON.stringify(after)}` };
});

// ═════════ US-05 範本 ═════════
await R.check("TC-05-01", "AC-05-01", async () => {
  await p.go("customizer");
  const b = await p.ev(`[...document.querySelectorAll(".cv-templates__btn")].map((x) => x.textContent)`);
  return { ok: b.join("、") === "資工、商管、生醫統計", note: b.join("、") };
});

await R.check("TC-05-02", "AC-05-02、AC-05-04", async () => {
  await p.ev(`localStorage.clear()`); await p.reload(); await p.go("customizer");
  const n = await toastCount();
  await p.click('[data-template="cs"]'); await sleep(150);
  const st1 = await p.ev(`(() => { const s = document.querySelector(".cv-templates__status"); return s && !s.hidden ? s.textContent : ""; })()`);
  const t1 = await toastsSince(n);
  const words = (await state()).data.customVocab.map((c) => c.word);
  const n2 = await toastCount();
  await p.click('[data-template="cs"]'); await sleep(150);
  const st2 = await p.ev(`(() => { const s = document.querySelector(".cv-templates__status"); return s && !s.hidden ? s.textContent : ""; })()`);
  const t2 = await toastsSince(n2);
  const words2 = (await state()).data.customVocab.map((c) => c.word);
  const msg1 = [st1, ...t1].join(" | "), msg2 = [st2, ...t2].join(" | ");
  return { ok: words.includes("Latency") && words.includes("Scalability") && words.length === 10 && msg1.includes("已注入 10 個單字") && words2.length === 10 && msg2.includes("已注入 0 個單字（皆已存在）"),
    note: `第一次：${words.length} 字、提示「${msg1}」；第二次：${words2.length} 字、提示「${msg2}」` };
});

await R.check("TC-05-03", "AC-05-03", async () => {
  await p.ev(`localStorage.clear()`); await p.reload(); await p.go("customizer");
  await p.click('[data-template="business"]'); await sleep(120);
  const b = (await state()).data.customVocab.map((c) => c.word);
  await p.ev(`localStorage.clear()`); await p.reload(); await p.go("customizer");
  await p.click('[data-template="biostat"]'); await sleep(120);
  const s = (await state()).data.customVocab.map((c) => c.word);
  return { ok: b.length === 10 && b.includes("Monetization") && s.length === 10 && s.includes("Heterogeneous"), note: `商管 ${b.length} 字（${b.join(",")}）；生醫統計 ${s.length} 字（${s.join(",")}）` };
});

await R.check("TC-05-05", "AC-05-05", async () => {
  const n = await studyLen();
  await gotoCard(n - 10);
  const c = await card();
  const before = await p.ev(`window.__qaTts.spoken.length`);
  await p.click(".fc-front .sp-tts__btn", 1); await sleep(150);
  const sp = await p.ev(`window.__qaTts.spoken.slice(${before})`);
  await p.ev(`EMT.store.actions.acknowledgeSttNotice()`);
  await p.click(".fc-front .sp-mic"); await sleep(250);
  await p.ev(`window.__qaStt.last.emitResult(${JSON.stringify(c.word)}); window.__qaStt.last.emitEnd()`); await sleep(120);
  const score = await p.ev(`(() => { const r = document.querySelector(".fc-front .sp-result"); return r && !r.hidden ? r.innerText : ""; })()`);
  return { ok: c.attrib.includes("自訂擴充") && sp.length === 1 && sp[0].text === c.word && score.includes("100"), note: `卡片 ${c.word}（${c.pos}）出處「${c.attrib.join("/")}」；0.75x 朗讀 ${JSON.stringify(sp)}；STT 結果「${score.replace(/\n/g, " ")}」` };
});

// ═════════ AC-04-07、AC-04-08 刪除 ═════════
await R.check("TC-04-07", "AC-04-07", async () => {
  await p.go("customizer");
  await p.click('[data-template="business"]'); await sleep(120);
  const n0 = await studyLen();
  const idx = await p.ev(`[...document.querySelectorAll(".cv-item")].findIndex((li) => li.querySelector(".cv-item__word").textContent === "Monetization")`);
  await p.click(".cv-item__delete", idx); await sleep(150);
  const dlg = await p.ev(`(() => { const d = document.querySelector(".dialog"); return d ? d.innerText : null; })()`);
  if (dlg) { await p.click('.dialog [data-action="ok"]'); await sleep(150); }
  const n1 = await studyLen();
  const t1 = await p.ev(`(EMT.router.go("flashcards"), document.querySelector(".fc-total").textContent)`);
  await p.reload();
  const words = (await state()).data.customVocab.map((c) => c.word);
  return { ok: idx >= 0 && n1 === n0 - 1 && !words.includes("Monetization") && t1 === `共 ${n0 - 1} 張`, note: `刪除前 ${n0} 張、刪除後 ${t1}；確認對話框：${dlg ? dlg.replace(/\n/g, " ") : "無"}；重載後清單含 Monetization=${words.includes("Monetization")}` };
});

await R.check("TC-04-08", "AC-04-08", async () => {
  // 生醫統計 10 字在單字集最後；刪中間一張與最後一張
  const n = await studyLen();
  const mid = n - 5;
  await gotoCard(mid);
  const cur = (await card()).word;
  const next = await p.ev(`(() => { const s = EMT.store.getState().runtime.studySet; const c = s[${mid + 1}]; return c.word || (c.item && c.item.word); })()`);
  await p.go("customizer");
  let idx = await p.ev(`[...document.querySelectorAll(".cv-item")].findIndex((li) => li.querySelector(".cv-item__word").textContent === ${JSON.stringify(cur)})`);
  await p.click(".cv-item__delete", idx); await sleep(120);
  if (await p.ev(`!!document.querySelector(".dialog")`)) { await p.click('.dialog [data-action="ok"]'); await sleep(120); }
  await p.go("flashcards");
  const a = await card();
  // 最後一張
  const n2 = await studyLen();
  await gotoCard(n2 - 1);
  const last = (await card()).word;
  const prev = await p.ev(`(() => { const s = EMT.store.getState().runtime.studySet; const c = s[${n2 - 2}]; return c.word || (c.item && c.item.word); })()`);
  await p.go("customizer");
  idx = await p.ev(`[...document.querySelectorAll(".cv-item")].findIndex((li) => li.querySelector(".cv-item__word").textContent === ${JSON.stringify(last)})`);
  await p.click(".cv-item__delete", idx); await sleep(120);
  if (await p.ev(`!!document.querySelector(".dialog")`)) { await p.click('.dialog [data-action="ok"]'); await sleep(120); }
  await p.go("flashcards");
  const b = await card();
  return { ok: a.word === next && b.word === prev && a.flipped === "false" && b.word.length > 0, note: `刪除目前卡 ${cur}（第 ${mid + 1} 張）後顯示 ${a.word}（預期下一張 ${next}、${a.pos}）；刪除最後一張 ${last} 後顯示 ${b.word}（預期前一張 ${prev}、${b.pos}）` };
});

// ═════════ US-06 抽認卡 ═════════
await p.ev(`localStorage.clear()`); await p.reload();
await R.check("TC-06-01", "AC-06-01", async () => {
  await gotoCard(0); const c = await card();
  const labels = c.front.map((f) => f.label);
  return { ok: c.word === "the" && c.phon === "/ðə/" && labels.includes("多益常考搭配詞") && c.tts.join() === "1.0x,0.75x" && c.mic && c.net === "需要連網" && c.frontVisible && !c.backVisible, note: `正面：${c.word} ${c.phon}、欄位 ${labels.join("/")}、TTS ${c.tts.join("/")}、麥克風=${c.mic}、標示「${c.net}」` };
});
await R.check("TC-06-02", "AC-06-02、AC-06-03", async () => {
  await gotoCard(3000);
  await p.click(".fc-card .fc-front .fc-word"); await sleep(60);
  const a = await card();
  await p.click(".fc-card .fc-back .fc-word"); await sleep(60);
  const b = await card();
  await p.click(".fc-flip"); await sleep(40);
  const c = await card();
  await p.click(".fc-flip"); await sleep(40);
  const labels = a.back.map((f) => f.label);
  return { ok: a.flipped === "true" && a.backVisible && labels.join("/") === "詞性/中文釋義/學術文獻應用情境/完整例句" && a.back.every((f) => f.value.trim()) && b.flipped === "false" && b.frontVisible && c.flipped === "true",
    note: `點卡片 → 背面（${a.word}）：${a.back.map((f) => f.label + "=" + f.value.slice(0, 20)).join("；")}；再點 → 正面=${b.flipped === "false"}；「翻面」鈕 → ${c.flipped}` };
});
await R.check("TC-06-04", "AC-06-04、AC-06-05", async () => {
  await gotoCard(0);
  const s0 = await p.ev(`[document.querySelector(".fc-prev").disabled, document.querySelector(".fc-position").textContent]`);
  await p.click(".fc-prev").catch(() => {}); const s1 = await p.text(".fc-position");
  await p.click(".fc-flip"); await p.click(".fc-next"); const c = await card();
  const n = await studyLen();
  await gotoCard(n - 1);
  const e0 = await p.ev(`[document.querySelector(".fc-next").disabled, document.querySelector(".fc-position").textContent]`);
  await p.click(".fc-next").catch(() => {}); const e1 = await p.text(".fc-position");
  return { ok: s0[0] && s0[1] === `第 1 / ${n} 張` && s1 === s0[1] && c.pos === `第 2 / ${n} 張` && c.flipped === "false" && e0[0] && e0[1] === `第 ${n} / ${n} 張` && e1 === e0[1],
    note: `第 1 張：上一張停用=${s0[0]}、點擊後 ${s1}；背面按下一張 → ${c.pos}、正面=${c.flipped === "false"}；最後一張：下一張停用=${e0[0]}、點擊後 ${e1}` };
});
await R.check("TC-06-07", "AC-06-07", async () => {
  const out = []; let ok = true;
  await gotoCard(0); await p.click(".fc-flip"); const a = await card();
  if (a.back.some((f) => f.k === "academicContext") || /學術文獻應用情境/.test(a.text)) { ok = false; }
  out.push(`the 背面欄位 ${a.back.map((f) => f.label).join("/")}`);
  // 掃描前 300 張與隨機 200 張不得出現 undefined/null 字樣或空欄位
  const bad = await p.ev(`(async () => { const s = EMT.store.getState().runtime.studySet; const idx = []; for (let i = 0; i < 300; i++) idx.push(i); for (let i = 0; i < 200; i++) idx.push(Math.floor(Math.random() * s.length));
    const bad = []; for (const i of idx) { EMT.store.actions.gotoCard(i); EMT.store.actions.flipCard(); const main = document.querySelector(".fc-card"); const w = main.querySelector(".fc-word").textContent;
      const txt = main.innerText; const t2 = txt.split(w).join(" ");
      if (/\\bundefined\\b/.test(txt) || (w.toLowerCase() !== "null" && /\\bnull\\b/i.test(t2) && !/null hypothesis/i.test(t2))) bad.push(i + ":" + w);
      for (const f of main.querySelectorAll(".fc-field")) { if (f.closest("[hidden]")) continue; const v = f.querySelector(".fc-field__value"); if (!v || !v.textContent.trim()) bad.push(i + ":空欄 " + f.className); }
    } return bad; })()`);
  if (bad.length) ok = false;
  out.push(`抽查 500 張問題 ${bad.length}${bad.length ? "：" + bad.slice(0, 5).join("、") : ""}`);
  // 自訂單字選填欄位空白
  await addWord({ word: "qaemptyopt", meaning: "只填必填" });
  const n = await studyLen(); await gotoCard(n - 1);
  const f = await card(); await p.click(".fc-flip"); const b = await card();
  const custOk = !/undefined|null/.test(f.text + b.text) && [...f.front, ...b.back].every((x) => x.value.trim() === "—" || x.value.trim().length > 0);
  if (!custOk) ok = false;
  out.push(`自訂卡正面 ${f.front.map((x) => x.label + "=" + x.value).join("；")}；背面 ${b.back.map((x) => x.label + "=" + x.value).join("；")}；音標 ${f.phon}`);
  return { ok, note: out.join("｜") };
});

// ═════════ AC-23-01 卡片出處 ═════════
await R.check("TC-23-01", "AC-23-01", async () => {
  const r = await p.ev(`(() => { const reg = Object.fromEntries(DATA_SOURCE_REGISTRY.map((x) => [x.code, x])); const db = MASTER_VOCAB_DATABASE.slice().sort((a, b) => a.rank - b.rank);
    const idx = new Set([0, 1, 2]); for (let i = 0; i < db.length; i += 23) idx.add(i);
    for (const w of ["café", "résumé", "entrée", "unauthorize", "gay", "album", "laptop", "analysis", "hypothesis"]) { const j = db.findIndex((x) => x.word === w); if (j >= 0) idx.add(j); }
    const multi = db.findIndex((x) => x.sources.length >= 3); idx.add(multi);
    const bad = []; let n = 0; const samples = [];
    for (const i of idx) { EMT.store.actions.gotoCard(i); const w = db[i]; const lines = [...document.querySelectorAll(".fc-attrib__line")].map((e) => e.textContent);
      const exp1 = "單字來源：" + w.sources.map((c) => reg[c].name + " " + reg[c].version + "（" + reg[c].licenseName + "）").join("、");
      const lab = (c) => c === "ECDICT" ? "ECDICT（MIT，已修改）" : "原創"; const exp2 = "音標：" + lab(w.phoneticSource) + "；釋義：" + lab(w.meaningSource);
      const ok1 = lines.some((l) => l.replace(/[、，,]\\s*/g, "、") === exp1.replace(/[、，,]\\s*/g, "、")) || (lines.join("").includes(w.sources.map((c) => reg[c].name + " " + reg[c].version).join("")) === false && w.sources.every((c) => lines.join("").includes(reg[c].name + " " + reg[c].version + "（" + reg[c].licenseName + "）")));
      const ok2 = lines.includes(exp2);
      if (!ok1 || !ok2) bad.push(w.word + "：" + lines.join("/") + " ≠ " + exp1 + " / " + exp2);
      if (["café", "gay"].includes(w.word) || i === multi || i === 0) samples.push(w.word + "「" + lines.join(" ／ ") + "」");
      n++; }
    return { n, bad, samples }; })()`);
  return { ok: r.bad.length === 0 && r.n > 200, note: `檢查 ${r.n} 張內建卡；不一致 ${r.bad.length}${r.bad.length ? "：" + r.bad.slice(0, 4).join("；") : ""}；範例 ${r.samples.join("；")}；自訂卡見 TC-05-05` };
});

// ═════════ US-09 四選一 ═════════
await p.ev(`localStorage.clear()`); await p.reload();
const quiz = () => p.ev(`(() => { const q = document.querySelector(".fcq"); if (!q) return null; return { word: q.querySelector(".fcq-word").textContent, answered: q.dataset.answered,
  opts: [...q.querySelectorAll(".fcq-option")].map((b) => ({ t: b.querySelector(".fcq-option__text").textContent, s: b.dataset.state, dis: b.disabled, bg: getComputedStyle(b).backgroundColor, bc: getComputedStyle(b).borderColor })),
  stats: q.querySelector(".fcq-stats").textContent }; })()`);
const meaningOf = (w) => p.ev(`(() => { const s = EMT.store.getState().runtime.studySet; const c = s.find((x) => (x.word || (x.item && x.item.word)) === ${JSON.stringify(w)}); return c ? (c.meaning || (c.item && c.item.meaning) || "").trim() : null; })()`);
await R.check("TC-09-01", "AC-09-01", async () => {
  await gotoCard(10);
  await p.click(".fc-mode-btn"); await sleep(80); const a = await quiz();
  await p.click(".fc-mode-btn"); await sleep(80); const b = await p.ev(`[!!document.querySelector(".fcq"), !!document.querySelector(".fc-card")]`);
  return { ok: !!a && a.opts.length === 4 && b[0] === false && b[1] === true, note: `測驗模式：${a && a.word}、${a && a.opts.length} 選項；再點 → 抽認卡=${b[1]}` };
});
await R.check("TC-09-02", "AC-09-02", async () => {
  const out = []; let ok = true;
  const setMeanings = await p.ev(`new Set(EMT.store.getState().runtime.studySet.map((c) => (c.meaning || (c.item && c.item.meaning) || "").trim())).size`);
  for (const i of [0, 5, 500, 3000, 5600]) {
    await gotoCard(i); await p.click(".fc-mode-btn"); await sleep(60);
    const q = await quiz(); const m = await meaningOf(q.word);
    const texts = q.opts.map((o) => o.t);
    const inSet = await p.ev(`(() => { const s = new Set(EMT.store.getState().runtime.studySet.map((c) => (c.meaning || (c.item && c.item.meaning) || "").trim())); return ${JSON.stringify(texts)}.every((t) => s.has(t)); })()`);
    const good = new Set(texts).size === 4 && texts.includes(m) && inSet;
    ok = ok && good; out.push(`${q.word}：${texts.join(" | ")}`);
    await p.click(".fc-mode-btn"); await sleep(40);
  }
  return { ok, note: out.join("；") + `（單字集相異釋義 ${setMeanings}）` };
});
await R.check("TC-09-03", "AC-09-03、AC-17-03", async () => {
  await gotoCard(20); await p.click(".fc-mode-btn"); await sleep(60);
  let q = await quiz(); let m = await meaningOf(q.word);
  let ci = q.opts.findIndex((o) => o.t === m);
  await p.click(".fcq-option", ci); await sleep(80);
  const a = await quiz();
  await p.click(".fcq-option", (ci + 1) % 4).catch(() => {}); await sleep(40); const a2 = await quiz();
  const st1 = (await state()).data;
  // 同一字再答對一次（切換模式重新出題）
  await p.click(".fc-mode-btn"); await p.click(".fc-mode-btn"); await sleep(60);
  q = await quiz(); m = await meaningOf(q.word); ci = q.opts.findIndex((o) => o.t === m);
  await p.click(".fcq-option", ci); await sleep(60);
  const st2 = (await state()).data;
  // 錯誤
  await p.click(".fc-next"); await sleep(60);
  q = await quiz(); m = await meaningOf(q.word); ci = q.opts.findIndex((o) => o.t === m);
  const wi = (ci + 1) % 4;
  await p.click(".fcq-option", wi); await sleep(60);
  const b = await quiz();
  await p.go("dashboard"); const dashM = await p.ev(`(document.querySelector("#view-dashboard .db-stat--mastery .db-stat__sub") || {}).textContent`);
  const okA = a.opts[ci] && a.opts.every((o) => o.dis) && a.opts.filter((o) => o.s === "correct").length === 1 && a.opts.filter((o) => o.s === "wrong").length === 0 && JSON.stringify(a2.opts) === JSON.stringify(a.opts);
  const okB = b.opts[wi].s === "wrong" && b.opts[ci].s === "correct" && b.opts.every((o) => o.dis);
  const colorOk = /\(.*\)/.test(b.opts[wi].bg + b.opts[wi].bc) && b.opts[wi].bg !== b.opts[ci].bg;
  return { ok: okA && okB && colorOk && st1.masteredWordKeys.length === 1 && st2.masteredWordKeys.length === 1 && st2.vocabQuiz.answered === 2 && st2.vocabQuiz.correct === 2 && dashM === "已掌握 1 字",
    note: `答對：狀態 ${a.opts.map((o) => o.s).join(",")}、鎖定=${a.opts.every((o) => o.dis)}、再點不變=${JSON.stringify(a2.opts) === JSON.stringify(a.opts)}；答錯：${b.opts.map((o) => o.s + "(" + o.bg + ")").join(",")}；同字答對兩次後掌握數 ${st2.masteredWordKeys.length}（主控台「${dashM}」）、答題 ${st2.vocabQuiz.answered}/${st2.vocabQuiz.correct}` };
});
await R.check("TC-09-04", "AC-09-04", async () => {
  const before = (await state()).data;
  await p.reload();
  const raw = await p.ev(`JSON.parse(localStorage.getItem(${JSON.stringify(KEY)})).data`);
  return { ok: raw.vocabQuiz.answered === before.vocabQuiz.answered && raw.vocabQuiz.correct === before.vocabQuiz.correct && JSON.stringify(raw.masteredWordKeys) === JSON.stringify(before.masteredWordKeys) && raw.vocabQuiz.answered === 3,
    note: `localStorage：答題 ${raw.vocabQuiz.answered}、答對 ${raw.vocabQuiz.correct}、已掌握 ${JSON.stringify(raw.masteredWordKeys)}` };
});
await R.check("TC-09-05", "AC-09-05", async () => {
  await addWord({ word: "qaquizword", meaning: "四選一自訂測試" });
  const n = await studyLen(); await gotoCard(n - 1);
  await p.click(".fc-mode-btn"); await sleep(60);
  const q = await quiz();
  await p.click(".fc-mode-btn");
  return { ok: !!q && q.word === "qaquizword" && q.opts.length === 4 && q.opts.some((o) => o.t === "四選一自訂測試"), note: q ? `${q.word}：${q.opts.map((o) => o.t).join(" | ")}` : "無題目" };
});
await R.check("TC-09-07", "AC-09-07", async () => {
  await gotoCard(100);
  const pos = [];
  for (let i = 0; i < 20; i++) { await p.click(".fc-mode-btn"); await sleep(30); const q = await quiz(); const m = await meaningOf(q.word); pos.push("ABCD"[q.opts.findIndex((o) => o.t === m)]); await p.click(".fc-mode-btn"); await sleep(20); }
  return { ok: new Set(pos).size > 1, note: `20 次正解位置：${pos.join("")}` };
});

// ═════════ AC-17-02、AC-17-05 打卡 ═════════
async function withDate(ymd) { await p.clearInitScripts(); await p.addInitScript(TOAST_RECORDER); await p.addInitScript(fakeTts("ok")); await p.addInitScript(fakeStt("ok")); await p.addInitScript(fakeMic("ok")); if (ymd) await p.addInitScript(fakeDate(ymd)); await p.reload(); }
const streakText = async () => { await p.go("dashboard"); return p.ev(`(() => { const v = document.querySelector("#view-dashboard .db-stat--streak"); return v.querySelector(".db-stat__num").textContent + " " + v.querySelector(".db-stat__unit").textContent; })()`); };
await R.check("TC-17-02", "AC-17-02", async () => {
  await p.ev(`localStorage.clear()`);
  const out = [];
  await withDate("2026-03-30"); out.push("初始 " + await streakText());
  await gotoCard(1); await p.click(".fc-flip"); out.push("D 翻卡 " + await streakText());
  await p.go("part5"); await p.click("[data-p5=option]", 0); out.push("D 再做 Part 5 " + await streakText());
  await withDate("2026-03-31"); out.push("D+1 開啟 " + await streakText());
  await gotoCard(2); await p.click(".fc-flip"); out.push("D+1 翻卡 " + await streakText());
  await withDate("2026-04-02"); out.push("中斷一天（D+3）開啟 " + await streakText());
  await gotoCard(3); await p.click(".fc-mode-btn"); await sleep(50); await p.click(".fcq-option", 0); await p.click(".fc-mode-btn"); out.push("D+3 四選一作答 " + await streakText());
  const ld = (await state()).data.streak;
  const ok = out[1].endsWith("1 天") && out[2].endsWith("1 天") && out[4].endsWith("2 天") && out[6].endsWith("1 天") && ld.lastActiveDate === "2026-04-02";
  return { ok, note: out.join("；") + `；lastActiveDate=${ld.lastActiveDate}` };
});
await R.check("TC-17-05", "AC-17-05", async () => {
  await withDate("2026-04-03"); await gotoCard(4); await p.click(".fc-flip");
  const a = await streakText(); const s1 = (await state()).data.streak;
  await withDate("2026-03-20"); const b = await streakText();
  await gotoCard(5); await p.click(".fc-flip"); const c = await streakText(); const s2 = (await state()).data.streak;
  return { ok: a === "2 天" && b === "2 天" && c === "2 天" && s2.days === s1.days && s2.lastActiveDate === "2026-04-03" && s2.days >= 0, note: `4/3 學習後 ${a}；時鐘調回 3/20 開啟 ${b}、學習後 ${c}（days ${s1.days} → ${s2.days}、lastActiveDate ${s2.lastActiveDate}）` };
});
await withDate(null);

// ═════════ US-24 備份 ═════════
const today = (() => { const d = new Date(); return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`; })();
let exported = null;
await R.check("TC-24-01", "AC-24-01、AC-24-02", async () => {
  await p.ev(`localStorage.clear()`); await p.reload();
  // 建立學習資料
  await seed(p, stateRecord(300)); // v0.10：畫面無分數輸入，以既有狀態 300（棕）開始（FB-36）
  await p.go("customizer");
  await p.click('[data-template="cs"]'); await sleep(80);
  await gotoCard(0); await p.click(".fc-mode-btn"); await sleep(50);
  const q = await quiz(); const m = await meaningOf(q.word); await p.click(".fcq-option", q.opts.findIndex((o) => o.t === m)); await p.click(".fc-mode-btn");
  await p.go("part5"); await p.click("[data-p5=option]", 0); await p.click("[data-p5=next]");
  await p.ev(`EMT.store.actions.acknowledgeSttNotice()`);
  const reqBefore = p.log.requests.length;
  for (const f of fs.readdirSync(p.downloads)) fs.rmSync(path.join(p.downloads, f), { force: true });
  await p.go("dashboard"); await sleep(300); await expandBackup(p); await p.click('[data-action="export-backup"]');
  let files = []; for (let i = 0; i < 40; i++) { await sleep(100); files = fs.readdirSync(p.downloads).filter((f) => f.endsWith(".json")); if (files.length) break; }
  const reqs = p.log.requests.slice(reqBefore).filter((r) => !/^(blob|data):/.test(r.url));
  const name = files[0];
  const text = fs.readFileSync(path.join(p.downloads, name), "utf8");
  exported = text;
  const j = JSON.parse(text);
  const d = j.data || {};
  // v0.8（AC-24-02 修訂）：另含 todayLearned（日期與當天已學單字清單）、learnedHistory（近 30 天每日已學字數）；備份 schemaVersion 2
  const keysOk = ["goal", "customVocab", "masteredWordKeys", "vocabQuiz", "part5", "streak", "sttNoticeAcknowledged", "todayLearned", "learnedHistory"].every((k) => k in d);
  const td = (() => { const x = new Date(); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; })();
  const learnOk = d.todayLearned && d.todayLearned.date === td && Array.isArray(d.todayLearned.wordKeys) && d.todayLearned.wordKeys.length === 1 && d.learnedHistory && d.learnedHistory[td] === 1;
  const noBuiltin = !/MASTER_VOCAB|PART5_QUESTION|DECODER|PHRASEBANK/.test(text) && text.length < 50000;
  const ok = files.length === 1 && name === `english-master-track-backup-${today}.json` && reqs.length === 0 && j.format === "english-master-track-backup" && j.schemaVersion === 2 && keysOk && learnOk && noBuiltin
    && d.goal.appliedScore === 300 && d.goal.appliedColor === "brown" && d.goal.effectiveColor === "brown" && d.customVocab.length === 10 && d.masteredWordKeys.length === 1 && d.vocabQuiz.answered === 1 && d.part5.totalAnswered === 1 && d.part5.currentIndex === 1 && d.streak.days === 1 && d.sttNoticeAcknowledged === true;
  return { ok, note: `檔名 ${name}（本地日期 ${today}）；網路請求 ${reqs.length}；${text.length} bytes；format=${j.format}、schemaVersion=${j.schemaVersion}；欄位齊全=${keysOk}；不含內建內容=${noBuiltin}；goal=${JSON.stringify(d.goal)}；自訂 ${d.customVocab.length}、已掌握 ${d.masteredWordKeys.length}、測驗 ${JSON.stringify(d.vocabQuiz)}、part5 ${JSON.stringify(d.part5)}、streak ${JSON.stringify(d.streak)}、STT 已讀 ${d.sttNoticeAcknowledged}、todayLearned ${JSON.stringify(d.todayLearned)}、learnedHistory ${JSON.stringify(d.learnedHistory)}` };
});
await R.check("TC-24-03", "AC-24-03", async () => {
  const exp = JSON.parse(exported).data;
  await p.ev(`localStorage.clear()`); await p.reload();
  const r = await importFile(exported);
  const now = (await state()).data;
  await p.reload();
  const after = (await state()).data;
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  return { ok: same(now, exp) && same(after, exp) && r.dialog && r.dialog.includes("匯入將覆蓋目前所有進度") && r.toasts.some((t) => t.startsWith("已匯入，略過 0 筆")), note: `對話框「${(r.dialog || "").replace(/\n/g, " ")}」；提示 ${JSON.stringify(r.toasts)}；匯入後與匯出內容相同=${same(now, exp)}；重載後相同=${same(after, exp)}` };
});
await R.check("TC-24-04", "AC-24-04", async () => {
  // v0.10：點藍卡套用（有學習紀錄 → 確認視窗按「確定」），使目前資料與備份不同
  await p.go("customizer"); await clickCard(p, "blue"); await applyGoal(p, "ok");
  const before = await p.ev(`localStorage.getItem(${JSON.stringify(KEY)})`); const mem = JSON.stringify((await state()).data);
  const r = await importFile(exported, { confirm: false });
  const after = await p.ev(`localStorage.getItem(${JSON.stringify(KEY)})`); const mem2 = JSON.stringify((await state()).data);
  return { ok: before === after && mem === mem2 && !!r.dialog, note: `取消後 localStorage 不變=${before === after}、記憶體不變=${mem === mem2}；提示 ${JSON.stringify(r.toasts)}` };
});
await R.check("TC-24-05", "AC-24-05", async () => {
  const base = JSON.parse(exported);
  const cases = { "非 JSON": "this is not json", "空檔": "", "缺少 data": JSON.stringify({ ...base, data: undefined }), "缺少 goal": JSON.stringify({ ...base, data: { ...base.data, goal: undefined } }),
    "型別錯誤": JSON.stringify({ ...base, data: { ...base.data, vocabQuiz: { answered: "3", correct: 1 } } }), "頂層為陣列": "[1,2]", "format 錯": JSON.stringify({ ...base, format: "other" }) };
  const out = []; let ok = true;
  for (const [k, v] of Object.entries(cases)) {
    const before = await p.ev(`localStorage.getItem(${JSON.stringify(KEY)})`); const mem = JSON.stringify((await state()).data);
    const r = await importFile(v, { name: "bad.json" });
    const after = await p.ev(`localStorage.getItem(${JSON.stringify(KEY)})`); const mem2 = JSON.stringify((await state()).data);
    const good = r.toasts.includes("備份檔格式錯誤，未匯入") && before === after && mem === mem2 && !r.dialog;
    ok = ok && good; out.push(`${k}：${r.toasts.join("/")}${r.dialog ? "（出現確認框）" : ""}${before === after && mem === mem2 ? "" : "（資料被改）"}`);
  }
  return { ok: ok && p.log.exceptions.length === 0, note: out.join("；") + `；未處理例外 ${p.log.exceptions.length}` };
});
await R.check("TC-24-06", "AC-24-06", async () => {
  const base = JSON.parse(exported);
  const out = []; let ok = true;
  for (const [k, v, fv] of [["版本缺失", { ...base, schemaVersion: undefined }, "無"], ["版本 99", { ...base, schemaVersion: 99 }, "99"], ["版本字串", { ...base, schemaVersion: "1" }, "無"]]) {
    const before = await p.ev(`localStorage.getItem(${JSON.stringify(KEY)})`);
    const r = await importFile(JSON.stringify(v), { name: "ver.json" });
    const after = await p.ev(`localStorage.getItem(${JSON.stringify(KEY)})`);
    const t = r.toasts.join("/");
    const good = t.includes("備份檔版本不相容") && t.includes(`檔案版本：${fv}`) && t.includes("支援版本：1、2") && before === after;
    ok = ok && good; out.push(`${k}：「${t}」`);
  }
  return { ok, note: out.join("；") };
});
await R.check("TC-24-07", "AC-24-07", async () => {
  const base = JSON.parse(exported);
  const item = { ...base.data.customVocab[0], id: "c_qaxss", word: "qaimportxss", meaning: XSS, phonetic: XSS, pos: XSS, collocation: XSS2, example: XSS2, origin: "manual", templateId: null };
  const f = { ...base, data: { ...base.data, customVocab: [...base.data.customVocab, item] } };
  const r = await importFile(JSON.stringify(f), { name: "xss.json" });
  await p.go("customizer");
  const listHas = await p.ev(`document.querySelector(".cv-list").innerText.includes(${JSON.stringify(XSS)})`);
  const i = await p.ev(`EMT.store.getState().runtime.studySet.findIndex((c) => JSON.stringify(c).includes("qaimportxss"))`);
  await gotoCard(i); await p.click(".fc-flip"); const c = await card();
  const imgs = await p.ev(`document.querySelectorAll("img").length`);
  return { ok: listHas && c.text.includes(XSS) && imgs === 0 && (await p.ev(`window.__xss === undefined`)) && p.log.dialogs.length === 0, note: `提示 ${JSON.stringify(r.toasts)}；清單原文=${listHas}；卡片原文=${c.text.includes(XSS)}；img 元素 ${imgs}；alert ${p.log.dialogs.length}` };
});
await R.check("TC-24-08", "AC-24-08", async () => {
  const base = JSON.parse(exported);
  const dup = { ...base.data.customVocab[0], id: "c_qadup", word: "OFFICE", meaning: "重複內建", origin: "manual", templateId: null };
  const dup2 = { ...base.data.customVocab[0], id: "c_qadup2", meaning: "檔內重複" };
  const f = { ...base, data: { ...base.data, customVocab: [...base.data.customVocab, dup, dup2], masteredWordKeys: [...base.data.masteredWordKeys, "zzqanotexist"], vocabQuiz: { answered: 5, correct: 3 } } };
  const r = await importFile(JSON.stringify(f), { name: "dup.json" });
  const d = (await state()).data;
  await p.go("dashboard"); const m = await p.ev(`(document.querySelector("#view-dashboard .db-stat--mastery .db-stat__sub") || {}).textContent`);
  return { ok: r.toasts.includes("已匯入，略過 3 筆") && !d.customVocab.some((c) => c.word === "OFFICE") && !d.masteredWordKeys.includes("zzqanotexist") && m === `已掌握 ${base.data.masteredWordKeys.length} 字`,
    note: `提示 ${JSON.stringify(r.toasts)}（預期略過 3 筆：內建重複 1、檔內重複 1、不存在的已掌握 1）；匯入後自訂 ${d.customVocab.length} 筆、掌握數「${m}」` };
});

await R.check("TC-X-cards", "（全套件）無未處理例外", async () => ({ ok: p.log.exceptions.length === 0, note: `例外：${JSON.stringify(p.log.exceptions).slice(0, 400)}` }));
await p.close();

// ═════════ 無內建資料的建置（fixture）：AC-06-06、AC-09-06、AC-04-08 空集合 ═════════
const FIX = process.env.QA_FIXTURE_NODATA;
if (FIX && fs.existsSync(FIX)) {
  const q = await launch();
  await q.addInitScript(TOAST_RECORDER);
  await q.viewport(1366, 900);
  await q.goto(pathToFileURL(FIX).href);
  const addW = async (w, m) => { await q.go("customizer"); await q.type("#cv-word", w); await q.type("#cv-meaning", m); await q.click('.cv-form button[type="submit"]'); await sleep(80); };
  await R.check("TC-06-06", "AC-06-06", async () => {
    await q.go("flashcards");
    const r = await q.ev(`(() => { const e = document.querySelector(".fc-empty"); const c = document.querySelector(".fc-main"); return { empty: e && !e.hidden ? e.innerText : "", cardVisible: !!c && !c.hidden && c.getClientRects().length > 0 && !!document.querySelector(".fc-card:not([hidden])") }; })()`);
    await q.click(".fc-empty__go"); const tab = await q.ev(`EMT.router.current()`);
    return { ok: r.empty.includes("前往難易度設定") && !/自訂器|抽認卡/.test(r.empty) && !r.cardVisible && tab === "customizer", note: `空狀態「${r.empty.replace(/\n/g, " ")}」；顯示卡片=${r.cardVisible}；按鈕導向 ${tab}（以無內建資料的 fixture 建置驗證）` };
  });
  await R.check("TC-09-06", "AC-09-06", async () => {
    await addW("alpha", "甲"); await addW("beta", "乙"); await addW("gamma", "丙");
    await q.go("flashcards"); const n = await q.ev(`window.__qaToasts.length`);
    await q.click(".fc-mode-btn"); await sleep(80);
    const t = await q.ev(`window.__qaToasts.slice(${n}).map((x) => x.text)`);
    const mode = await q.ev(`[!!document.querySelector(".fcq"), EMT.store.getState().runtime.flashcard.mode]`);
    return { ok: t.includes("單字數不足 4 個，無法產生選項") && !mode[0] && mode[1] === "card", note: `3 字時按測驗模式：提示 ${JSON.stringify(t)}；模式 ${mode[1]}` };
  });
  await R.check("TC-04-08b", "AC-04-08、AC-06-06", async () => {
    await q.go("customizer");
    for (let i = 0; i < 3; i++) { await q.click(".cv-item__delete", 0); await sleep(80); if (await q.ev(`!!document.querySelector(".dialog")`)) { await q.click('.dialog [data-action="ok"]'); await sleep(80); } }
    await q.go("flashcards");
    const r = await q.ev(`[document.querySelector(".fc-empty").hidden, !!document.querySelector(".fc-card:not([hidden])") && document.querySelector(".fc-main").getClientRects().length > 0]`);
    return { ok: r[0] === false && r[1] === false, note: `刪光後空狀態顯示=${!r[0]}、空白卡=${r[1]}` };
  });
  await R.check("TC-X-fixture", "（fixture）無未處理例外", async () => ({ ok: q.log.exceptions.length === 0, note: JSON.stringify(q.log.exceptions).slice(0, 300) }));
  await q.close();
} else {
  R.fail("TC-06-06", "AC-06-06", "未提供 QA_FIXTURE_NODATA，無法執行");
}

R.save(resultPath("e2e-cards"));
