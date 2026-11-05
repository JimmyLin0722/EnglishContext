// QA E2E 套件 4：模擬測驗（US-10、US-11）、解碼器與句型庫（第 3 輪：暫停，記不適用）、
// 資料來源與授權頁（AC-23-02）、主控台統計（AC-17-01、AC-17-04）
// 第 5 輪（PRD v0.13）：主控台統計改讀 3 格數據（AC-39-05）；「資料來源與授權」只從頁尾開啟（AC-23-02 v0.12、Q-50）
import { launch, recorder, sleep, resultPath } from "./lib/cdp.mjs";
import { TOAST_RECORDER, fakeClipboard } from "./lib/inits.mjs";

const R = recorder("e2e-content");
const KEY = "englishMasterTrack:state";

const p = await launch();
await p.addInitScript(TOAST_RECORDER);
await p.addInitScript(fakeClipboard("ok"));
await p.viewport(1366, 900);
await p.goto();

const p5 = () => p.ev(`(() => { const q = document.querySelector(".p5-question"); if (!q) { const s = document.querySelector(".p5"); return { summary: s ? s.innerText : "" }; }
  return { num: q.querySelector("[data-p5=number]").textContent, type: q.querySelector("[data-p5=type]").textContent, sentence: q.querySelector("[data-p5=sentence]").textContent, blank: !!q.querySelector("[data-p5=blank]"),
    opts: [...q.querySelectorAll("[data-p5=option]")].map((b) => ({ letter: b.querySelector(".p5-option__letter").textContent, text: b.querySelector(".p5-option__text").textContent, state: b.dataset.state, dis: b.disabled, bg: getComputedStyle(b).backgroundColor })),
    explain: q.querySelector("[data-p5=explanation]") ? q.querySelector("[data-p5=explanation]").innerText : "", core: (q.querySelector("[data-p5=core]") || {}).textContent || "", structure: (q.querySelector("[data-p5=structure]") || {}).textContent || "",
    next: !!document.querySelector("[data-p5=next]") }; })()`);
const totals = () => p.ev(`EMT.store.getState().data.part5`);
const correctIdx = (i) => p.ev(`PART5_QUESTION_BANK[${i}].correctIndex`);
const accText = async () => { await p.go("dashboard"); return p.ev(`document.querySelector("#view-dashboard .db-stat--answered .db-stat__value").textContent`); };

// ═════════ Part 5 ═════════
await R.check("TC-17-04a", "AC-17-04", async () => { const t = await accText(); return { ok: t === "已答對 0 / 200 題（0%）", note: `K = 0、答題數 0 時顯示「${t}」（v0.19：K = 0 不顯示「—」，AC-49-02）` }; });
await p.go("part5");
await R.check("TC-10-02", "AC-10-02", async () => {
  const out = []; let ok = true;
  const q = await p5();
  ok = q.blank && q.opts.length === 4 && q.opts.map((o) => o.letter).join("") === "A.B.C.D." && !!q.type;
  out.push(`第 1 題：${q.type}、空格=${q.blank}、選項 ${q.opts.map((o) => o.letter + o.text).join(" ")}`);
  const types = await p.ev(`[...new Set(PART5_QUESTION_BANK.slice(0, 8).map((x) => x.type))].length`);
  return { ok: ok && types === 4, note: out.join("") + `；前 8 題涵蓋題型 ${types} 種` };
});
await R.check("TC-11-01", "AC-11-01、AC-11-02、AC-11-03、AC-11-06", async () => {
  const t0 = await totals();
  const ci = await correctIdx(0);
  const wi = (ci + 1) % 4;
  await p.click("[data-p5=option]", wi); await sleep(60);
  const a = await p5(); const t1 = await totals();
  for (let k = 0; k < 4; k++) await p.ev(`document.querySelectorAll("[data-p5=option]")[${k}].click()`);
  await p.click("[data-p5=option]", ci).catch(() => {});
  const t1b = await totals();
  await p.click("[data-p5=next]"); await sleep(60);
  const ci2 = await correctIdx(1);
  await p.click("[data-p5=option]", ci2); await sleep(60);
  const b = await p5(); const t2 = await totals();
  const okA = a.opts.every((o) => o.dis) && a.opts[wi].state === "wrong" && a.opts[ci].state === "correct" && a.opts.filter((o) => o.state === "correct").length === 1;
  const okB = b.opts.every((o) => o.dis) && b.opts[ci2].state === "correct" && !b.opts.some((o) => o.state === "wrong");
  const okE = a.explain.includes("解題核心思路") && a.explain.includes("句型語法拆解（S + V + O + 修飾語）") && a.core.trim() && a.structure.trim();
  const okC = t1.totalAnswered === t0.totalAnswered + 1 && t1.totalCorrect === t0.totalCorrect && t2.totalAnswered === t0.totalAnswered + 2 && t2.totalCorrect === t0.totalCorrect + 1 && JSON.stringify(t1b) === JSON.stringify(t1);
  return { ok: okA && okB && okE && okC, note: `答錯：${a.opts.map((o) => o.state + "(" + o.bg + ")").join(",")}；答對：${b.opts.map((o) => o.state).join(",")}；解析兩段非空=${!!okE}；計數 ${t0.totalAnswered}/${t0.totalCorrect} → 答錯 ${t1.totalAnswered}/${t1.totalCorrect} → 重複點擊 ${t1b.totalAnswered}/${t1b.totalCorrect} → 答對 ${t2.totalAnswered}/${t2.totalCorrect}` };
});
await R.check("TC-11-05", "AC-11-05", async () => {
  for (let i = 1; i < 4; i++) { await p.click("[data-p5=next]").catch(async () => { await p.click("[data-p5=option]", 0); await p.click("[data-p5=next]"); }); await sleep(30); if ((await p5()).opts && !(await p5()).opts[0].dis && i < 4) { /* 下一題未作答 */ } if (i < 4) { const q = await p5(); if (q.num !== "第 5 / 200 題") { await p.click("[data-p5=option]", 0); } } }
  // 確保停在第 5 題且未作答
  let q = await p5();
  for (let guard = 0; guard < 10 && q.num !== "第 5 / 200 題"; guard++) { if (!q.opts[0].dis) await p.click("[data-p5=option]", 0); await p.click("[data-p5=next]"); q = await p5(); }
  const before = await p5();
  await p.reload(); await p.go("part5");
  const after = await p5();
  return { ok: before.num === "第 5 / 200 題" && after.num === "第 5 / 200 題" && after.opts.every((o) => !o.dis && o.state === "idle"), note: `重載前 ${before.num}（未作答=${before.opts.every((o) => !o.dis)}）；重載後 ${after.num}、未作答=${after.opts.every((o) => !o.dis)}` };
});
await R.check("TC-11-04", "AC-11-04、AC-11-07", async () => {
  // 下一題為未作答
  await p.click("[data-p5=option]", 0); await p.click("[data-p5=next]"); const nx = await p5();
  // 走完整輪（剩餘題目），每題答對
  let q = nx; let guard = 0;
  while (q.num && guard++ < 260) {
    const idx = Number(q.num.match(/第 (\d+)/)[1]) - 1;
    await p.ev(`document.querySelectorAll("[data-p5=option]")[PART5_QUESTION_BANK[${idx}].correctIndex].click()`);
    await p.ev(`document.querySelector("[data-p5=next]").click()`);
    q = await p5();
  }
  const sum = q.summary || "";
  const t = await totals();
  const restartBtn = await p.ev(`[...document.querySelectorAll(".p5 button")].map((b) => b.textContent)`);
  await p.ev(`[...document.querySelectorAll(".p5 button")].find((b) => b.textContent.includes("重新開始")).click()`); await sleep(60);
  const r = await p5(); const t2 = await totals();
  const m = sum.match(/答對\s*(\d+)\s*\/\s*(\d+)/);
  return { ok: nx.opts.every((o) => !o.dis) && !!m && Number(m[2]) === t.roundAnswered && restartBtn.some((b) => b.includes("重新開始")) && r.num === "第 1 / 200 題" && r.opts.every((o) => !o.dis) && t2.totalAnswered === t.totalAnswered && t2.totalCorrect === t.totalCorrect,
    note: `下一題未作答=${nx.opts.every((o) => !o.dis)}；結算「${sum.replace(/\n+/g, " ").slice(0, 80)}」、按鈕 ${restartBtn.join("/")}；累計 ${t.totalAnswered}/${t.totalCorrect}；重新開始後 ${r.num}、未作答=${r.opts.every((o) => !o.dis)}、累計 ${t2.totalAnswered}/${t2.totalCorrect}` };
});
await R.check("TC-17-04b", "AC-17-04", async () => {
  // 改用剛好 10 題、答對 7 題
  await p.ev(`localStorage.clear()`); await p.reload(); await p.go("part5");
  for (let i = 0; i < 10; i++) { const ci = await correctIdx(i); await p.click("[data-p5=option]", i < 7 ? ci : (ci + 1) % 4); await p.click("[data-p5=next]"); }
  const t = await totals(); const a = await accText();
  return { ok: t.totalAnswered === 10 && t.totalCorrect === 7 && a === "已答對 7 / 200 題（4%）", note: `答題 ${t.totalAnswered}、答對 ${t.totalCorrect} → 第 3 格「${a}」（AC-17-04 v0.19）` };
});
await R.check("TC-17-01", "AC-17-01", async () => {
  await p.go("dashboard");
  // v0.12：3 格依序為連續打卡天數、單字掌握率（大字）＋小字「已掌握 N 字」（= 單字掌握數）、模擬測驗（v0.19 已答對行）；各只出現 1 次
  const s = await p.ev(`[...document.querySelectorAll("#view-dashboard .db-stat")].map((d) => d.innerText.replace(/\\s*\\n\\s*/g, "="))`);
  const body = await p.ev(`document.querySelector("#view-dashboard .dashboard").innerText`);
  const once = ["連續打卡天數", "單字掌握率", "模擬測驗", "已掌握", "已答對"].every((w) => body.split(w).length === 2);
  return { ok: s.length === 3 && s[0].startsWith("連續打卡天數") && s[1].startsWith("單字掌握率") && /=已掌握 \d[\d,]* 字$/.test(s[1]) && s[2].startsWith("模擬測驗=已答對 ") && once && !/單字掌握數/.test(body) && !/NaN|Infinity|undefined/.test(s.join()), note: s.join("；") + `；各只出現 1 次=${once}` };
});

// ═════════ 解碼器、句型庫（PRD v0.9 R-18 三：暫停（隱藏），本版不驗收）═════════
// 第 3 輪：原 TC-12-01～TC-16-04 的頁面已無入口，改記為「不適用（暫停）」；畫面不可到達另由 e2e-hidden.mjs（AC-20-04）驗證。
{
  const why = "PRD v0.10 標「v0.9 暫停（隱藏）」，本版不驗收；頁面不可到達見 TC-20-04";
  for (const [tc, ac] of [["TC-12-01", "AC-12-01、AC-12-02、AC-12-03"], ["TC-13-01", "AC-13-01、AC-13-02、AC-13-03、AC-13-04"], ["TC-14-01", "AC-14-01"],
    ["TC-15-01", "AC-15-01"], ["TC-15-02", "AC-15-02、AC-15-03"], ["TC-16-01", "AC-16-01"], ["TC-16-02", "AC-16-02"], ["TC-16-03", "AC-16-03"], ["TC-16-04a", "AC-16-04"], ["TC-16-04b", "AC-16-04"]]) R.na(tc, ac, why);
}

// ═════════ 資料來源與授權頁 ═════════
await R.check("TC-23-02", "AC-23-02", async () => {
  // v0.12：主控台本體不再有入口（Q-50），只從頁尾開啟；主控台的頁尾連結可見且可開啟
  await p.go("dashboard"); await sleep(350); const dashEntry = await p.ev(`document.querySelectorAll("#view-dashboard [data-go=sources]").length`);
  await p.click("#footer-sources"); await sleep(350); const viaDash = dashEntry === 0 && await p.ev(`!document.getElementById("view-sources").hidden`);
  await p.go("phrasebank"); await sleep(3500); await p.click("#footer-sources"); const viaFooter = await p.ev(`!document.getElementById("view-sources").hidden`);
  const t = await p.ev(`document.getElementById("view-sources").innerText`);
  const reg = await p.ev(`DATA_SOURCE_REGISTRY.filter((r) => r.code !== "ORIGINAL")`);
  const miss = [];
  for (const r of reg) for (const v of [r.name, r.version, r.licenseName, r.licenseUrl, r.homepageUrl, ...r.authors]) if (!t.includes(v)) miss.push(r.code + ":" + v);
  const statements = ["程式碼以 MIT 授權（Copyright JimmyLin）", "單字資料以 CC BY-SA 4.0 授權", "原創內容（例句、解析、Part 5 題目、長難句、句型）由 JimmyLin 以 AI 輔助編製，JimmyLin 就其享有的權利以 CC BY-SA 4.0 授權", "TOEIC® 為 ETS 的註冊商標。本網站與 ETS 無關，亦未經其認可或核准。", "音標改寫為美式 IPA，標為原創，不屬 ECDICT", "簡體轉繁體台灣用語", "精簡釋義", "合併", "去重", "重新編排頻率排名", "補充", "修改者 JimmyLin"];
  const missS = statements.filter((s) => !t.includes(s));
  const wl = await p.ev(`[...document.querySelectorAll("#view-sources h3, #view-sources h4")].map((h) => h.textContent).filter((x) => /NGSL|TSL|BSL|NAWL/.test(x)).length`);
  const used = await p.ev(`new Set(MASTER_VOCAB_DATABASE.flatMap((w) => w.sources)).size`);
  const mit = await p.ev(`(() => { const d = [...document.querySelectorAll("#view-sources details")]; d.forEach((x) => x.open = true); return document.getElementById("view-sources").innerText.includes("Permission is hereby granted"); })()`);
  return { ok: viaDash && viaFooter && miss.length === 0 && missS.length === 0 && wl === used && mit, note: `主控台本體入口 ${dashEntry} 個、主控台頁尾連結開啟=${viaDash}、其他頁頁尾連結=${viaFooter}；缺欄位 ${miss.join("、") || "無"}；缺聲明 ${missS.join("、") || "無"}；列出字表 ${wl} 種／資料中 ${used} 種；ECDICT MIT 全文可展開=${mit}` };
});

await R.check("TC-X-content", "（全套件）無未處理例外", async () => ({ ok: p.log.exceptions.length === 0, note: JSON.stringify(p.log.exceptions).slice(0, 300) }));
await p.close();

R.save(resultPath("e2e-content"));
