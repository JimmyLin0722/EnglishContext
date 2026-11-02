// QA E2E 套件 4：Part 5（US-10、US-11）、解碼器（US-12～US-14）、句型庫（US-15、US-16）、
// 資料來源與授權頁（AC-23-02）、主控台統計（AC-17-01、AC-17-04）
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
const accText = async () => { await p.go("dashboard"); return p.ev(`[...document.querySelectorAll(".dash-stat")].find((d) => d.textContent.includes("模擬測驗正確率")).querySelector(".dash-stat__value").textContent`); };

// ═════════ Part 5 ═════════
await R.check("TC-17-04a", "AC-17-04", async () => { const t = await accText(); return { ok: t === "—", note: `答題數 0 時顯示「${t}」` }; });
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
  return { ok: t.totalAnswered === 10 && t.totalCorrect === 7 && a === "70%", note: `答題 ${t.totalAnswered}、答對 ${t.totalCorrect} → 正確率「${a}」` };
});
await R.check("TC-17-01", "AC-17-01", async () => {
  await p.go("dashboard");
  const s = await p.ev(`[...document.querySelectorAll(".dash-stats:not(.dash-stats--goal) .dash-stat")].map((d) => d.innerText.replace(/\\n/g, "="))`);
  return { ok: s.length === 3 && s[0].startsWith("連續打卡天數") && s[1].startsWith("單字掌握數") && s[2].startsWith("模擬測驗正確率") && !/NaN|Infinity|undefined/.test(s.join()), note: s.join("；") };
});

// ═════════ 解碼器 ═════════
await p.go("decoder");
const hueOf = (rgb) => { const m = rgb.match(/\d+(\.\d+)?/g); if (!m) return null; const [r, g, b] = m.slice(0, 3).map(Number); const mx = Math.max(r, g, b), mn = Math.min(r, g, b); if (mx - mn < 15) return null; let h; if (mx === r) h = ((g - b) / (mx - mn)) % 6; else if (mx === g) h = (b - r) / (mx - mn) + 2; else h = (r - g) / (mx - mn) + 4; h *= 60; if (h < 0) h += 360; return Math.round(h); };
const family = (h) => h === null ? "灰" : (h < 20 || h >= 340) ? "紅" : h < 70 ? "橙黃" : h < 170 ? "綠" : h < 255 ? "藍" : "紫";
await R.check("TC-12-01", "AC-12-01、AC-12-02、AC-12-03", async () => {
  const legend = await p.ev(`[...document.querySelectorAll(".dc-legend__item")].map((e) => e.innerText.replace(/\\n/g, ""))`);
  const all = []; const bad = []; let count = 0; const fams = { subject: new Set(), verb: new Set(), object: new Set(), modifier: new Set() };
  const total = Number((await p.text(".dc-pos")).match(/\/ (\d+)/)[1]);
  for (let i = 0; i < total; i++) {
    const r = await p.ev(`(() => { const segs = [...document.querySelectorAll(".dc-sentence .seg")]; const role = (s) => (s.className.match(/seg--(subject|verb|object|modifier)/) || [])[1];
      return { pos: document.querySelector(".dc-pos").textContent, segs: segs.filter(role).map((s) => { const cs = getComputedStyle(s); return { role: role(s), color: cs.color, bg: cs.backgroundColor, border: cs.borderBottomColor || cs.textDecorationColor }; }) }; })()`);
    count++;
    const roles = r.segs.map((s) => s.role);
    if (!roles.includes("subject") || !roles.includes("verb")) bad.push(r.pos + " 缺主詞或動詞");
    for (const s of r.segs) { const f = family(hueOf(s.color)); const fb = family(hueOf(s.bg)); fams[s.role].add(f + "/" + fb); }
    if (i < total - 1) await p.click(".dc-next");
  }
  const famOk = [...fams.subject].every((x) => x.split("/").every((y) => y === "藍")) && [...fams.verb].every((x) => x.split("/").every((y) => y === "紅")) && [...fams.object].every((x) => x.split("/").every((y) => y === "綠")) && [...fams.modifier].every((x) => x.split("/").every((y) => y === "紫"));
  const noInput = await p.ev(`document.querySelectorAll("#view-decoder textarea, #view-decoder input[type=text], #view-decoder [contenteditable=true]").length === 0`);
  return { ok: total >= 50 && count === total && bad.length === 0 && famOk && legend.length === 4 && noInput, note: `例句 ${total} 句逐一切換檢查；缺主詞/動詞 ${bad.length}；色系（文字/底色）主詞 ${[...fams.subject]}、動詞 ${[...fams.verb]}、受詞 ${[...fams.object]}、修飾 ${[...fams.modifier]}；圖例 ${legend.join("、")}；任意句輸入框不存在=${noInput}` };
});
const dimState = () => p.ev(`(() => { const out = { mod: [], core: [] }; for (const s of document.querySelectorAll(".dc-sentence .seg")) { const cs = getComputedStyle(s); const o = { op: cs.opacity, f: cs.filter };
  if (s.classList.contains("seg--modifier")) out.mod.push(o); else if (/seg--(subject|verb|object)/.test(s.className)) out.core.push(o); }
  const b = document.querySelector(".dc-dim"); out.btn = b.textContent; out.pressed = b.getAttribute("aria-pressed"); out.pos = document.querySelector(".dc-pos").textContent; return out; })()`);
await R.check("TC-13-01", "AC-13-01、AC-13-02、AC-13-03、AC-13-04", async () => {
  await p.click(".dc-prev");
  const s0 = await dimState();
  await p.click(".dc-dim"); const a = await dimState();
  await p.click(".dc-prev"); const c = await dimState();
  await p.click(".dc-dim"); const b = await dimState();
  const okA = a.mod.length > 0 && a.mod.every((m) => m.op === "0.3" && /grayscale\(1\)/.test(m.f)) && a.core.every((m) => m.op === "1");
  const okC = c.pos !== a.pos && c.mod.every((m) => m.op === "0.3" && /grayscale/.test(m.f));
  const okB = b.mod.every((m) => m.op === "1" && !/grayscale\((1|100%)\)/.test(m.f));
  const okBtn = s0.btn !== a.btn || s0.pressed !== a.pressed;
  return { ok: okA && okB && okC && okBtn, note: `淡化：修飾語 ${a.mod.length} 段 opacity ${[...new Set(a.mod.map((m) => m.op))]}、filter ${[...new Set(a.mod.map((m) => m.f))]}、主幹 opacity ${[...new Set(a.core.map((m) => m.op))]}；切換到 ${c.pos} 仍淡化=${okC}；還原：opacity ${[...new Set(b.mod.map((m) => m.op))]}、filter ${[...new Set(b.mod.map((m) => m.f))]}；按鈕「${s0.btn}」(${s0.pressed}) → 「${a.btn}」(${a.pressed})` };
});
await R.check("TC-14-01", "AC-14-01", async () => {
  const r = await p.ev(`[...document.querySelectorAll(".dc-strategy")].map((d) => ({ t: d.querySelector("summary").textContent, tips: [...d.querySelectorAll("li")].map((l) => l.textContent.trim()).filter(Boolean).length }))`);
  return { ok: r.map((x) => x.t).join("|") === "Abstract 摘要|方法論|文獻回顧（Research Gap）" && r.every((x) => x.tips > 0), note: r.map((x) => `${x.t}（${x.tips} 則）`).join("、") };
});

// ═════════ 句型庫 ═════════
await p.go("phrasebank");
const pb = () => p.ev(`(() => { const items = [...document.querySelectorAll(".pb-item")].filter((li) => !li.hidden && li.getClientRects().length > 0); const e = document.querySelector(".pb-empty");
  return { n: items.length, cats: [...new Set(items.map((i) => i.dataset.category))], ids: items.map((i) => i.dataset.id), empty: e && !e.hidden ? e.textContent : "", count: document.querySelector(".pb-count").textContent }; })()`);
await R.check("TC-15-01", "AC-15-01", async () => {
  const f = await p.ev(`[...document.querySelectorAll(".pb-filter__btn")].map((b) => b.textContent)`);
  return { ok: f.join("|") === "全部|研究空白 Gap|研究目的 Aim|研究結果 Findings|研究限制 Limitations", note: f.join("、") };
});
await R.check("TC-15-02", "AC-15-02、AC-15-03", async () => {
  const out = {};
  for (const c of ["gap", "aim", "findings", "limitations"]) { await p.click(`.pb-filter__btn[data-category="${c}"]`); out[c] = await pb(); }
  await p.click('.pb-filter__btn[data-category="all"]'); const all = await pb();
  const ok = Object.entries(out).every(([c, r]) => r.cats.length === 1 && r.cats[0] === c && r.n >= 25) && all.n === 100;
  return { ok, note: Object.entries(out).map(([c, r]) => `${c} ${r.n} 則（類別 ${r.cats}）`).join("；") + `；回到全部 ${all.n} 則` };
});
await R.check("TC-16-01", "AC-16-01", async () => {
  // 真實按鍵逐字輸入 gap，並與「研究目的 Aim」分類同時成立
  await p.click('.pb-filter__btn[data-category="all"]');
  const exp = (kw, cat) => p.ev(`ACADEMIC_PHRASEBANK.filter((x) => (cat === "all" || x.category === cat) && (x.template + "\\n" + x.descriptionZh).toLowerCase().includes(${JSON.stringify(kw)}.toLowerCase())).map((x) => x.id)`.replace("cat ===", `${JSON.stringify(cat)} ===`).replace("x.category === cat", `x.category === ${JSON.stringify(cat)}`));
  await p.type("#pb-search", "");
  const out = []; let ok = true;
  for (const [i, ch] of ["g", "a", "p"].entries()) {
    await p.send("Input.dispatchKeyEvent", { type: "keyDown", key: ch, text: ch, code: "Key" + ch.toUpperCase(), windowsVirtualKeyCode: ch.toUpperCase().charCodeAt(0) });
    await p.send("Input.dispatchKeyEvent", { type: "keyUp", key: ch, code: "Key" + ch.toUpperCase(), windowsVirtualKeyCode: ch.toUpperCase().charCodeAt(0) });
    await sleep(20);
    const kw = "gap".slice(0, i + 1); const r = await pb(); const e = await exp(kw, "all");
    const good = JSON.stringify(r.ids) === JSON.stringify(e); ok = ok && good; out.push(`「${kw}」${r.n} 則${good ? "" : "（預期 " + e.length + "）"}`);
  }
  const upper = await (async () => { await p.type("#pb-search", "GAP"); const r = await pb(); const e = await exp("gap", "all"); return JSON.stringify(r.ids) === JSON.stringify(e); })();
  const zh = await (async () => { await p.type("#pb-search", "缺口"); const r = await pb(); const e = await exp("缺口", "all"); return [r.n, JSON.stringify(r.ids) === JSON.stringify(e)]; })();
  await p.type("#pb-search", "gap"); await p.click('.pb-filter__btn[data-category="aim"]');
  const both = await pb(); const eb = await exp("gap", "aim");
  const okBoth = JSON.stringify(both.ids) === JSON.stringify(eb);
  // 每次按鍵到清單更新的時間
  const times = await p.ev(`(async () => { const el = document.getElementById("pb-search"); el.value = ""; el.dispatchEvent(new Event("input", { bubbles: true })); const out = [];
    for (const kw of ["r", "re", "res", "rese", "resea", "resear", "researc", "research", "research ", "research g"]) { const t0 = performance.now(); el.value = kw; el.dispatchEvent(new Event("input", { bubbles: true }));
      await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0))); out.push(+(performance.now() - t0).toFixed(1)); } return out; })()`);
  await p.type("#pb-search", ""); await p.click('.pb-filter__btn[data-category="all"]');
  return { ok: ok && upper && zh[1] && okBoth && Math.max(...times) <= 100, note: `逐字：${out.join("、")}；大寫 GAP 相同=${upper}；中文「缺口」${zh[0]} 則、相符=${zh[1]}；gap + Aim 分類 ${both.n} 則、相符=${okBoth}；10 次按鍵更新 ms：${times.join("、")}` };
});
await R.check("TC-16-02", "AC-16-02", async () => {
  await p.type("#pb-search", "zzqqxxnotfound"); const r = await pb(); await p.type("#pb-search", "");
  return { ok: r.n === 0 && r.empty === "找不到符合的句型", note: `${r.n} 則、提示「${r.empty}」` };
});
await R.check("TC-16-03", "AC-16-03", async () => {
  const n = await p.ev(`window.__qaToasts.length`);
  await p.click(".pb-item__copy", 3); await sleep(150);
  const r = await p.ev(`({ w: window.__qaClip.written.slice(-1)[0], tpl: document.querySelectorAll(".pb-item")[3].querySelector(".pb-item__template").textContent, data: ACADEMIC_PHRASEBANK[3].template, t: window.__qaToasts.slice(${n}).map((x) => x.text) })`);
  return { ok: r.w === r.data && r.w === r.tpl && r.t.includes("已複製"), note: `剪貼簿「${r.w}」與模板相同=${r.w === r.data}；提示 ${JSON.stringify(r.t)}` };
});

// ═════════ 資料來源與授權頁 ═════════
await R.check("TC-23-02", "AC-23-02", async () => {
  await p.go("dashboard"); await p.click('.dash-entry[data-go="sources"]'); const viaDash = await p.ev(`!document.getElementById("view-sources").hidden`);
  await p.go("phrasebank"); await sleep(3500); await p.click("#footer-sources"); const viaFooter = await p.ev(`!document.getElementById("view-sources").hidden`);
  const t = await p.ev(`document.getElementById("view-sources").innerText`);
  const reg = await p.ev(`DATA_SOURCE_REGISTRY.filter((r) => r.code !== "ORIGINAL")`);
  const miss = [];
  for (const r of reg) for (const v of [r.name, r.version, r.licenseName, r.licenseUrl, r.homepageUrl, ...r.authors]) if (!t.includes(v)) miss.push(r.code + ":" + v);
  const statements = ["程式碼以 MIT 授權（Copyright JimmyLin）", "單字資料以 CC BY-SA 4.0 授權", "原創內容（例句、解析、Part 5 題目、長難句、句型）以 CC BY-SA 4.0 授權，著作權人 JimmyLin", "音標改寫為美式 IPA，標為原創，不屬 ECDICT", "簡體轉繁體台灣用語", "精簡釋義", "合併", "去重", "重新編排頻率排名", "補充", "修改者 JimmyLin"];
  const missS = statements.filter((s) => !t.includes(s));
  const wl = await p.ev(`[...document.querySelectorAll("#view-sources h3, #view-sources h4")].map((h) => h.textContent).filter((x) => /NGSL|TSL|BSL|NAWL/.test(x)).length`);
  const used = await p.ev(`new Set(MASTER_VOCAB_DATABASE.flatMap((w) => w.sources)).size`);
  const mit = await p.ev(`(() => { const d = [...document.querySelectorAll("#view-sources details")]; d.forEach((x) => x.open = true); return document.getElementById("view-sources").innerText.includes("Permission is hereby granted"); })()`);
  return { ok: viaDash && viaFooter && miss.length === 0 && missS.length === 0 && wl === used && mit, note: `主控台入口=${viaDash}、頁尾連結=${viaFooter}；缺欄位 ${miss.join("、") || "無"}；缺聲明 ${missS.join("、") || "無"}；列出字表 ${wl} 種／資料中 ${used} 種；ECDICT MIT 全文可展開=${mit}` };
});

await R.check("TC-X-content", "（全套件）無未處理例外", async () => ({ ok: p.log.exceptions.length === 0, note: JSON.stringify(p.log.exceptions).slice(0, 300) }));
await p.close();

// ═════════ 剪貼簿不可用 ═════════
for (const mode of ["reject", "missing"]) {
  const q = await launch();
  await q.addInitScript(TOAST_RECORDER); await q.addInitScript(fakeClipboard(mode));
  await q.viewport(1366, 900); await q.goto(); await q.go("phrasebank");
  await R.check(`TC-16-04${mode === "reject" ? "a" : "b"}`, "AC-16-04", async () => {
    await q.click(".pb-item__copy", 2); await sleep(200);
    const r = await q.ev(`({ t: window.__qaToasts.map((x) => x.text), sel: String(window.getSelection()), tpl: ACADEMIC_PHRASEBANK[2].template })`);
    return { ok: r.t.includes("複製失敗，請手動選取") && r.sel.trim() === r.tpl && q.log.exceptions.length === 0, note: `剪貼簿${mode === "reject" ? "拒絕" : "不存在"}：提示 ${JSON.stringify(r.t)}；反白文字與模板相同=${r.sel.trim() === r.tpl}；未處理例外 ${q.log.exceptions.length}` };
  });
  await q.close();
}

R.save(resultPath("e2e-content"));
