// QA E2E 套件 12（第 3 輪新增，PRD v0.8 US-28、US-29、US-31）：單字卡手勢與翻轉動畫、答題回饋（動畫與震動）、換頁動畫與減少動態
// 依據：architecture v0.6 §7.10～§7.12、§10.1「E2E 與人工」；觸控以 CDP Input.dispatchTouchEvent 模擬（實機手感列人工）。
// 已知：FE-28 以 CDP 快速滑動後約 1.5 秒內的 click 會被吞（防誤觸），滑動後的點擊一律等待 1.6 秒。
import { launch, recorder, sleep, resultPath } from "./lib/cdp.mjs";
import { TOAST_RECORDER, fakeTts, fakeStt, fakeMic, fakeVibrate } from "./lib/inits.mjs";
import { stateRecord, seed } from "./lib/state.mjs";

const R = recorder("e2e-motion");
const PAGES = [];
async function open({ vib = "stub", vp = [1366, 900], reduced = false } = {}) {
  const p = await launch(); PAGES.push(p);
  for (const s of [TOAST_RECORDER, fakeTts("ok"), fakeStt("ok"), fakeMic("ok"), fakeVibrate(vib)]) await p.addInitScript(s);
  await p.viewport(vp[0], vp[1]);
  if (reduced) await p.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await p.goto();
  await seed(p, stateRecord(725, { sttNoticeAcknowledged: true }));
  return p;
}
const fc = (p) => p.ev(`(() => { const c = document.querySelector(".fc-card"); const f = document.querySelector(".fc-front"), b = document.querySelector(".fc-back");
  const shown = (e) => !!e && !e.hidden && e.getClientRects().length > 0;
  return { pos: (document.querySelector(".fc-position") || {}).textContent, flipped: c ? c.dataset.flipped : null, front: shown(f), back: shown(b), word: f ? (f.querySelector(".fc-word") || {}).textContent : null,
    flipCls: [...document.querySelectorAll(".fc-face--flip-in")].length, slideCls: c ? [...c.classList].filter((x) => /fc-card--in/.test(x)).join(",") : "" }; })()`);
const goto = async (p, i) => { await p.go("flashcards"); await p.ev(`EMT.store.actions.gotoCard(${i})`); await sleep(60); };
/** 點卡片上按鈕以外的區域（正面字詞下方的空白處） */
async function clickCardArea(p) {
  const pt = await p.ev(`(() => { const face = [...document.querySelectorAll(".fc-face")].find((f) => !f.hidden); face.scrollIntoView({ block: "center" }); const r = face.getBoundingClientRect();
    const cand = [[0.5, 0.12], [0.1, 0.5], [0.9, 0.5], [0.5, 0.95]].map(([a, b]) => ({ x: r.left + r.width * a, y: r.top + r.height * b }));
    const ok = cand.find((c) => { const h = document.elementFromPoint(c.x, c.y); return h && face.contains(h) && !h.closest("button, a, input, .fc-speech"); }); return ok || null; })()`);
  if (!pt) throw new Error("找不到卡片上非按鈕的點擊位置");
  for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) await p.send("Input.dispatchMouseEvent", { type, x: pt.x, y: pt.y, button: "left", clickCount: 1 });
}

// ═════════ US-28 桌機：翻轉動畫、按鈕不翻面、鍵盤、連點 ═════════
{
  const p = await open();
  await R.check("TC-28-01", "AC-28-01", async () => {
    await goto(p, 3); const a = await fc(p);
    await clickCardArea(p); await sleep(40);
    const mid = await fc(p);
    const dur = await p.ev(`(() => { const e = document.querySelector(".fc-face--flip-in"); return e ? getComputedStyle(e).animationDuration : "無"; })()`);
    await sleep(450); const b = await fc(p);
    await clickCardArea(p); await sleep(40); const mid2 = await fc(p); await sleep(450); const c = await fc(p);
    const sec = parseFloat(dur);
    const ok = a.flipped === "false" && mid.back && mid.flipCls === 1 && sec > 0 && sec <= 0.4 && b.flipped === "true" && b.back && !b.front && b.flipCls === 0 && mid2.front && mid2.flipCls === 1 && c.flipped === "false" && c.front && !c.back;
    return { ok, note: `點卡片非按鈕區：正面 → 動畫中（背面顯示、flip-in class ${mid.flipCls}、animation-duration ${dur}）→ 450ms 後背面、無殘留 class；再點 → 動畫中正面 → 正面（≤ 400ms，Q-33）` };
  });
  await R.check("TC-28-02", "AC-28-02", async () => {
    await goto(p, 3);
    const n0 = await p.ev(`window.__qaTts.spoken.length`);
    await p.click(".fc-front .sp-tts__btn", 0); await sleep(450); const a = await fc(p);
    await p.click(".fc-front .sp-tts__btn", 1); await sleep(450); const b = await fc(p);
    await p.click(".fc-front .sp-mic"); await sleep(450); const c = await fc(p); const st = await p.ev(`document.querySelector(".fc-front .sp-mic").dataset.status`);
    await p.click(".fc-front .sp-mic"); await sleep(450); const d = await fc(p);
    const n1 = await p.ev(`window.__qaTts.spoken.length`);
    const ok = [a, b, c, d].every((x) => x.flipped === "false" && x.front && !x.back) && n1 === n0 + 2 && st === "listening";
    return { ok, note: `按 1.0x、0.75x、麥克風（開始／停止）後卡片皆為正面=${[a, b, c, d].every((x) => x.flipped === "false")}；朗讀 ${n1 - n0} 次；麥克風狀態 ${st}` };
  });
  await R.check("TC-28-07", "AC-28-07", async () => {
    await goto(p, 3); const a = await fc(p);
    const press = async (sel, key) => { await p.ev(`document.querySelector(${JSON.stringify(sel)}).focus()`); // CDP：keyDown 須帶 text 才會產生 keypress（按鈕的 Enter 啟動依賴 keypress）
      if (key === "Enter") await p.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: "\r" }).then(() => p.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 })); else await p.send("Input.dispatchKeyEvent", { type: "keyDown", key: " ", code: "Space", windowsVirtualKeyCode: 32, text: " " }).then(() => p.send("Input.dispatchKeyEvent", { type: "keyUp", key: " ", code: "Space", windowsVirtualKeyCode: 32 })); await sleep(450); };
    await press(".fc-flip", "Enter"); const b = await fc(p);
    await press(".fc-flip", " "); const c = await fc(p);
    await press(".fc-next", "Enter"); const d = await fc(p);
    await press(".fc-next", " "); const e = await fc(p);
    await press(".fc-prev", "Enter"); const f = await fc(p);
    // Tab 可到達三個按鈕
    const tabbable = await p.ev(`[".fc-flip", ".fc-prev", ".fc-next"].map((s) => { const e = document.querySelector(s); return !!e && e.tabIndex >= 0 && !e.disabled; })`);
    const ok = a.pos === "第 4 / 5620 張" && b.flipped === "true" && c.flipped === "false" && d.pos === "第 5 / 5620 張" && e.pos === "第 6 / 5620 張" && f.pos === "第 5 / 5620 張" && tabbable.every(Boolean);
    return { ok, note: `鍵盤：翻面 Enter → ${b.flipped}、空白鍵 → ${c.flipped}；下一張 Enter → ${d.pos}、空白鍵 → ${e.pos}；上一張 Enter → ${f.pos}；三鈕可 Tab 聚焦=${tabbable.every(Boolean)}` };
  });
  await R.check("TC-28-08", "AC-28-08", async () => {
    await goto(p, 3);
    await p.ev(`(() => { window.__qaFaces = []; const t0 = performance.now(); const tick = () => { const f = document.querySelector(".fc-front"), b = document.querySelector(".fc-back");
      const vis = (e) => !!e && !e.hidden && getComputedStyle(e).display !== "none"; window.__qaFaces.push([+(performance.now() - t0).toFixed(0), vis(f), vis(b)]); if (performance.now() - t0 < 900) requestAnimationFrame(tick); }; requestAnimationFrame(tick); })()`);
    await clickCardArea(p); await sleep(90); await clickCardArea(p);
    await sleep(900);
    const frames = await p.ev(`window.__qaFaces`); const end = await fc(p);
    const both = frames.filter((x) => x[1] && x[2]).length; const none = frames.filter((x) => !x[1] && !x[2]).length;
    const anim = await p.ev(`(() => { const e = document.querySelector(".fc-front"); return getComputedStyle(e).transform; })()`);
    const ok = end.flipped === "false" && end.front && !end.back && end.flipCls === 0 && both === 0 && none === 0 && (anim === "none" || anim === "matrix(1, 0, 0, 1, 0, 0)");
    return { ok, note: `動畫中連點 2 次：最終 ${end.flipped === "false" ? "正面" : "背面"}、殘留動畫 class ${end.flipCls}、正面 transform ${anim}；${frames.length} 個畫格中正反面同時可見 ${both}、皆不可見 ${none}` };
  });
  await p.close();
}

// ═════════ US-28 觸控：滑動換卡（375px、觸控模擬） ═════════
{
  const p = await open({ vp: [375, 667] });
  const swipeTimed = async (dx, dy, opt = {}) => {
    await p.ev(`(() => { window.__qaSw = { end: 0, change: 0 }; const pos = document.querySelector(".fc-position"); const before = pos.textContent;
      document.addEventListener("touchend", () => { window.__qaSw.end = performance.now(); }, { capture: true, once: true });
      const mo = new MutationObserver(() => { const t = document.querySelector(".fc-position"); if (t && t.textContent !== before && !window.__qaSw.change) { window.__qaSw.change = performance.now(); mo.disconnect(); } });
      mo.observe(document.getElementById("view-flashcards"), { subtree: true, childList: true, characterData: true }); setTimeout(() => mo.disconnect(), 1500); })()`);
    await p.swipe(".fc-card", dx, dy, { durationMs: 200, ...opt }); await sleep(150);
    const t = await p.ev(`window.__qaSw`);
    return t.change && t.end ? +(t.change - t.end).toFixed(1) : null;
  };
  await R.check("TC-28-03", "AC-28-03", async () => {
    await goto(p, 4); await p.click(".fc-flip"); await sleep(450); const a = await fc(p);
    const ms1 = await swipeTimed(-120, 6); const b = await fc(p);
    const ms2 = await swipeTimed(120, -4); const c = await fc(p);
    const ok = a.pos === "第 5 / 5620 張" && a.flipped === "true" && b.pos === "第 6 / 5620 張" && b.flipped === "false" && b.front && c.pos === "第 5 / 5620 張" && c.front && ms1 !== null && ms1 <= 100 && ms2 !== null && ms2 <= 100;
    return { ok, note: `第 5 張（背面）向左滑 120px → ${b.pos}、${b.front ? "正面" : "背面"}（手指離開到新卡 ${ms1}ms）；向右滑 → ${c.pos}（${ms2}ms）（實機手感列人工 TC-M05）` };
  });
  await R.check("TC-28-04", "AC-28-04", async () => {
    await goto(p, 0); await p.swipe(".fc-card", 120, 0, { durationMs: 200 }); await sleep(300); const a = await fc(p);
    const n = await p.ev(`EMT.store.getState().runtime.studySet.length`);
    await goto(p, n - 1); await p.swipe(".fc-card", -120, 0, { durationMs: 200 }); await sleep(300); const b = await fc(p);
    return { ok: a.pos === "第 1 / 5620 張" && b.pos === `第 ${n} / ${n} 張`, note: `第 1 張向右滑 → ${a.pos}；第 N 張向左滑 → ${b.pos}` };
  });
  await R.check("TC-28-05", "AC-28-05", async () => {
    await goto(p, 4);
    await p.swipe(".fc-card", -49, 0, { durationMs: 200 }); await sleep(300); const a = await fc(p);
    await p.swipe(".fc-card", 49, 2, { durationMs: 200 }); await sleep(300); const b = await fc(p);
    await p.ev(`window.scrollTo(0, 0)`);
    const y0 = await p.ev(`window.scrollY`);
    await p.swipe(".fc-card", -60, -160, { durationMs: 300, scroll: false }); await sleep(400); const c = await fc(p); const y1 = await p.ev(`window.scrollY`);
    const ta = await p.ev(`getComputedStyle(document.querySelector(".fc-card")).touchAction`);
    const ok = [a, b, c].every((x) => x.pos === "第 5 / 5620 張" && x.flipped === "false") && /pan-y|auto/.test(ta);
    return { ok, note: `水平 −49px → ${a.pos}；+49px → ${b.pos}；垂直為主（dx −60、dy −160）→ ${c.pos}、${c.flipped === "true" ? "翻面" : "未翻面"}、頁面捲動 ${y0}→${y1}；卡片 touch-action=${ta}（允許垂直捲動）` };
  });
  await R.check("TC-28-06", "AC-28-06", async () => {
    await goto(p, 4); await p.click(".fc-mode-btn"); await sleep(200);
    const before = await p.ev(`({ ans: document.querySelector(".fcq").dataset.answered, sel: EMT.store.getState().runtime.flashcard.quiz.selectedIndex, idx: EMT.store.getState().runtime.flashcard.index, q: EMT.store.getState().data.vocabQuiz.answered })`);
    await p.swipe(".fcq-word", -120, 0, { durationMs: 200 }); await sleep(200);
    await p.swipe(".fcq-option", -120, 0, { durationMs: 200, nth: 1 }); await sleep(200);
    await p.swipe(".fcq-option", 120, 0, { durationMs: 200, nth: 2 }); await sleep(300);
    const after = await p.ev(`({ ans: document.querySelector(".fcq").dataset.answered, sel: EMT.store.getState().runtime.flashcard.quiz.selectedIndex, idx: EMT.store.getState().runtime.flashcard.index, q: EMT.store.getState().data.vocabQuiz.answered, disabled: [...document.querySelectorAll(".fcq-option")].some((b) => b.disabled || b.getAttribute("aria-disabled") === "true") })`);
    await sleep(1600); // FE-28：CDP 快速滑動後 1.5 秒內的 click 會被吞
    await p.tap(".fcq-option", 0); await sleep(150);
    const tapped = await p.ev(`({ ans: document.querySelector(".fcq").dataset.answered, q: EMT.store.getState().data.vocabQuiz.answered })`);
    await p.click(".fc-mode-btn"); await sleep(150);
    const ok = after.sel === null && after.idx === before.idx && after.q === before.q && after.ans !== "true" && !after.disabled && tapped.ans === "true" && tapped.q === before.q + 1;
    return { ok, note: `測驗模式在題目與選項上左右滑動 3 次：作答=${after.ans}、selectedIndex ${after.sel}、題目（卡片索引）${before.idx}→${after.idx}、答題數 ${before.q}→${after.q}、選項鎖定=${after.disabled}；1.6 秒後點擊（tap）選項 → 作答=${tapped.ans}、答題數 ${tapped.q}` };
  });
  await p.close();
}

// ═════════ US-29 答題回饋 ═════════
async function answerQuiz(p, correct) {
  await p.go("flashcards"); await p.ev(`EMT.store.actions.gotoCard(${correct ? 20 : 21})`); await sleep(60);
  await p.click(".fc-mode-btn"); await sleep(150);
  const ci = await p.ev(`EMT.store.getState().runtime.flashcard.quiz.correctIndex`);
  const idx = correct ? ci : (ci + 1) % 4;
  await p.ev(`(() => { window.__qaAns = { t0: 0, color: 0, cls: "" }; const btns = [...document.querySelectorAll(".fcq-option")]; const target = btns[${idx}];
    target.addEventListener("click", () => { window.__qaAns.t0 = performance.now(); }, { capture: true, once: true });
    const mo = new MutationObserver(() => { const b = document.querySelectorAll(".fcq-option")[${idx}]; if (b && b.dataset.state && b.dataset.state !== "idle" && !window.__qaAns.color) { window.__qaAns.color = performance.now(); } });
    mo.observe(document.getElementById("view-flashcards"), { subtree: true, attributes: true, childList: true }); setTimeout(() => mo.disconnect(), 2000); })()`);
  await p.click(".fcq-option", idx);
  const anim = await p.ev(`(() => { const all = [...document.querySelectorAll(".fcq-option")]; return all.map((b) => ({ s: b.dataset.state, cls: [...b.classList].filter((c) => /qz-opt--/.test(c)).join(","), dur: getComputedStyle(b).animationDuration, name: getComputedStyle(b).animationName })); })()`);
  const t = await p.ev(`window.__qaAns`);
  await sleep(700);
  const after = await p.ev(`[...document.querySelectorAll(".fcq-option")].map((b) => ({ s: b.dataset.state, cls: [...b.classList].filter((c) => /qz-opt--/.test(c)).join(","), dis: b.disabled || b.getAttribute("aria-disabled") === "true" }))`);
  const vib = await p.ev(`window.__qaVib.length`);
  // 鎖定後再點
  await p.click(".fcq-option", (idx + 2) % 4); await sleep(150);
  const again = await p.ev(`({ vib: window.__qaVib.length, cls: [...document.querySelectorAll(".fcq-option")].some((b) => /qz-opt--/.test(b.className)) })`);
  await p.click(".fc-mode-btn"); await sleep(150);
  return { idx, ci, anim, ms: t.color && t.t0 ? +(t.color - t.t0).toFixed(1) : null, after, vib, again };
}
async function answerP5(p, correct) {
  await p.go("part5"); await sleep(150);
  const ci = await p.ev(`PART5_QUESTION_BANK[EMT.store.getState().data.part5.currentIndex].correctIndex`);
  const idx = correct ? ci : (ci + 1) % 4;
  await p.ev(`(() => { window.__qaAns = { t0: 0, color: 0 }; const target = document.querySelectorAll("[data-p5=option]")[${idx}];
    target.addEventListener("click", () => { window.__qaAns.t0 = performance.now(); }, { capture: true, once: true });
    const mo = new MutationObserver(() => { const b = document.querySelectorAll("[data-p5=option]")[${idx}]; if (b && b.dataset.state && !/idle|default/.test(b.dataset.state) && !window.__qaAns.color) window.__qaAns.color = performance.now(); });
    mo.observe(document.getElementById("view-part5"), { subtree: true, attributes: true, childList: true }); setTimeout(() => mo.disconnect(), 2000); })()`);
  const s0 = await p.ev(`[...document.querySelectorAll("[data-p5=option]")].map((b) => b.dataset.state).join(",")`);
  await p.click("[data-p5=option]", idx);
  const anim = await p.ev(`[...document.querySelectorAll("[data-p5=option]")].map((b) => ({ s: b.dataset.state, cls: [...b.classList].filter((c) => /p5-opt--/.test(c)).join(","), dur: getComputedStyle(b).animationDuration, name: getComputedStyle(b).animationName }))`);
  const t = await p.ev(`window.__qaAns`);
  await sleep(700);
  const after = await p.ev(`[...document.querySelectorAll("[data-p5=option]")].map((b) => ({ s: b.dataset.state, cls: [...b.classList].filter((c) => /p5-opt--/.test(c)).join(","), dis: b.disabled }))`);
  const vib = await p.ev(`window.__qaVib.length`);
  await p.click("[data-p5=option]", (idx + 2) % 4).catch(() => {}); await sleep(150);
  const again = await p.ev(`({ vib: window.__qaVib.length, cls: [...document.querySelectorAll("[data-p5=option]")].some((b) => /p5-opt--/.test(b.className)) })`);
  await p.click("[data-p5=next]"); await sleep(150);
  return { idx, ci, s0, anim, ms: t.color && t.t0 ? +(t.color - t.t0).toFixed(1) : null, after, vib, again };
}
const animOk = (r, correct, re) => {
  const tgt = r.anim[correct ? r.ci : r.idx];
  const cls = correct ? "pop" : "shake";
  return tgt.cls.includes(cls) && parseFloat(tgt.dur) > 0 && parseFloat(tgt.dur) <= 0.6 && r.after[r.ci].s === "correct" && (correct || r.after[r.idx].s === "wrong") && r.after.every((x) => x.dis) && r.after.every((x) => !x.cls) && re.test(r.anim[r.ci].s);
};
{
  const p = await open();
  const res = {};
  res.qOk = await answerQuiz(p, true); const v1 = await p.ev(`window.__qaVib.slice()`);
  res.qNg = await answerQuiz(p, false); const v2 = await p.ev(`window.__qaVib.slice()`);
  res.pOk = await answerP5(p, true); const v3 = await p.ev(`window.__qaVib.slice()`);
  res.pNg = await answerP5(p, false); const v4 = await p.ev(`window.__qaVib.slice()`);
  const fmt = (r) => `點擊→顏色 ${r.ms}ms、動畫 ${JSON.stringify(r.anim[r.ci === r.idx ? r.ci : r.idx].cls)}/${r.anim[r.ci === r.idx ? r.ci : r.idx].dur}、700ms 後狀態 ${r.after.map((x) => x.s).join(",")}、鎖定=${r.after.every((x) => x.dis)}、殘留動畫 class=${r.after.some((x) => x.cls)}`;
  const ok1 = [["qOk", true], ["qNg", false], ["pOk", true], ["pNg", false]].every(([k, c]) => res[k].ms !== null && res[k].ms <= 100 && animOk(res[k], c, /correct/));
  R[ok1 ? "pass" : "fail"]("TC-29-01", "AC-29-01", `四選一答對：${fmt(res.qOk)}；四選一答錯：${fmt(res.qNg)}；模擬測驗答對：${fmt(res.pOk)}；模擬測驗答錯：${fmt(res.pNg)}（動畫上限 600ms，Q-33）`);
  const total = (pat) => (Array.isArray(pat) ? pat.reduce((a, b) => a + b, 0) : pat);
  const calls = [v1, v2.slice(v1.length), v3.slice(v2.length), v4.slice(v3.length)];
  const ok2 = calls.every((c) => c.length === 1 && total(c[0]) <= 200) && [res.qOk, res.qNg, res.pOk, res.pNg].every((r) => r.again.vib === r.vib && !r.again.cls);
  R[ok2 ? "pass" : "fail"]("TC-29-02", "AC-29-02", `每次作答 navigator.vibrate 呼叫：${calls.map((c) => `${c.length} 次 ${JSON.stringify(c)}（總長含停頓 ${c.length ? total(c[0]) : "-"}ms）`).join("；")}；鎖定後再點 震動次數不變=${[res.qOk, res.qNg, res.pOk, res.pNg].every((r) => r.again.vib === r.vib)}、無動畫=${[res.qOk, res.qNg, res.pOk, res.pNg].every((r) => !r.again.cls)}（實機震動列人工）`);
  await p.close();
}
{
  const out = []; let ok = true;
  for (const mode of ["missing", "throw"]) {
    const p = await open({ vib: mode });
    const a = await answerQuiz(p, false); const b = await answerP5(p, true);
    const t = await p.ev(`window.__qaToasts.map((x) => x.text)`);
    const err = p.log.exceptions.length + p.log.console.filter((c) => c.type === "error").length;
    const good = animOk(a, false, /correct/) && animOk(b, true, /correct/) && t.length === 0 && err === 0;
    ok = ok && good; out.push(`${mode === "missing" ? "vibrate 不存在" : "vibrate 拋例外"}：四選一答錯與模擬測驗答對的顏色、動畫、鎖定正常=${animOk(a, false, /correct/) && animOk(b, true, /correct/)}、提示 ${JSON.stringify(t)}、錯誤 ${err}`);
    await p.close();
  }
  R[ok ? "pass" : "fail"]("TC-29-03", "AC-29-03", out.join("；") + "（iOS Safari 實機列人工）");
}

// ═════════ US-31 換頁動畫 ═════════
{
  const p = await open();
  await R.check("TC-31-01", "AC-31-01", async () => {
    const out = []; let ok = true;
    for (const t of ["customizer", "flashcards", "part5", "dashboard"]) {
      const r = await p.ev(`(async () => { const b = document.querySelector('#app-nav [data-tab="${t}"]'); const v = document.getElementById("view-${t}"); const t0 = performance.now(); b.click();
        const cls = v.classList.contains("view--entering"); const dur = getComputedStyle(v).animationDuration; const name = getComputedStyle(v).animationName;
        await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0))); const first = +(performance.now() - t0).toFixed(1); await new Promise((r) => setTimeout(r, 400));
        return { cls, dur, name, first, left: v.classList.contains("view--entering"), op: getComputedStyle(v).opacity }; })()`);
      const good = r.cls && r.name !== "none" && parseFloat(r.dur) > 0 && parseFloat(r.dur) <= 0.3 && r.first <= 100 && !r.left && r.op === "1";
      ok = ok && good; out.push(`${t}：${r.name}/${r.dur}、點擊到第一個影格 ${r.first}ms、結束後移除 class=${!r.left}`);
    }
    return { ok, note: out.join("；") + "（效能多輪判定見 TC-22-01）" };
  });
  await R.check("TC-31-02", "AC-31-02", async () => {
    const out = [];
    for (let k = 0; k < 3; k++) {
      await p.go("dashboard"); await sleep(400);
      const seq = [["customizer", "flashcards", "part5"], ["part5", "dashboard", "customizer"], ["flashcards", "customizer", "dashboard"]][k];
      await p.ev(`(async () => { for (const t of ${JSON.stringify(seq)}) { document.querySelector('#app-nav [data-tab="' + t + '"]').click(); await new Promise((r) => setTimeout(r, 40)); } })()`);
      await sleep(450);
      const r = await p.ev(`(() => { const vs = [...document.querySelectorAll("#app-main > .view")]; const shown = vs.filter((v) => !v.hidden); return { cur: EMT.router.current(), shown: shown.map((v) => v.id), entering: vs.filter((v) => v.classList.contains("view--entering")).length, op: shown.map((v) => getComputedStyle(v).opacity).join(","), tf: shown.map((v) => getComputedStyle(v).transform).join(",") }; })()`);
      out.push({ seq, ...r });
    }
    const ok = out.every((r) => r.cur === r.seq[2] && r.shown.length === 1 && r.shown[0] === "view-" + r.seq[2] && r.entering === 0 && r.op === "1" && r.tf === "none");
    return { ok, note: out.map((r) => `連點 ${r.seq.join("→")}（間隔 40ms）→ 目前 ${r.cur}、顯示 ${r.shown.join(",")}、殘留動畫 ${r.entering}、opacity ${r.op}、transform ${r.tf}`).join("；") };
  });
  await p.close();
}

// ═════════ AC-31-03 減少動態 ═════════
{
  const p = await open({ reduced: true, vp: [375, 667] });
  await R.check("TC-31-03", "AC-31-03", async () => {
    const out = []; let ok = true;
    const mq = await p.ev(`matchMedia("(prefers-reduced-motion: reduce)").matches`);
    // 換頁
    const nav = await p.ev(`(async () => { const v = document.getElementById("view-part5"); document.querySelector('#app-nav [data-tab="part5"]').click(); const s = getComputedStyle(v); return { cls: v.classList.contains("view--entering"), name: s.animationName, op: s.opacity, shown: !v.hidden }; })()`);
    ok = ok && nav.shown && (!nav.cls || nav.name === "none") && nav.op === "1"; out.push(`換頁：立即顯示=${nav.shown}、animation ${nav.name}、opacity ${nav.op}`);
    // 翻卡
    await goto(p, 4); await clickCardArea(p); await sleep(20);
    const flip = await p.ev(`(() => { const b = document.querySelector(".fc-back"); const s = getComputedStyle(b); return { back: !b.hidden, name: s.animationName, tf: s.transform, flipped: document.querySelector(".fc-card").dataset.flipped }; })()`);
    ok = ok && flip.back && flip.flipped === "true" && flip.name === "none" && flip.tf === "none"; out.push(`翻卡：20ms 內背面=${flip.back}、animation ${flip.name}、transform ${flip.tf}`);
    await clickCardArea(p); await sleep(30);
    // 滑動換卡
    await p.swipe(".fc-card", -120, 0, { durationMs: 200 }); await sleep(30);
    const sw = await p.ev(`(() => { const c = document.querySelector(".fc-card"); const s = getComputedStyle(c); return { pos: document.querySelector(".fc-position").textContent, name: s.animationName, op: s.opacity, tf: s.transform }; })()`);
    ok = ok && sw.pos === "第 6 / 5620 張" && sw.name === "none" && sw.op === "1"; out.push(`滑動：${sw.pos}、animation ${sw.name}、opacity ${sw.op}`);
    await sleep(1600);
    // 四選一與模擬測驗作答
    const q = await answerQuiz(p, false); const r5 = await answerP5(p, true);
    const qa = q.anim[q.idx], pa = r5.anim[r5.ci];
    const ansOk = q.after[q.ci].s === "correct" && q.after[q.idx].s === "wrong" && r5.after[r5.ci].s === "correct" && qa.name === "none" && pa.name === "none" && q.vib === 1 && r5.vib === 2;
    ok = ok && ansOk; out.push(`作答：四選一 ${q.after.map((x) => x.s).join(",")}（animation ${qa.name}）、模擬測驗 ${r5.after.map((x) => x.s).join(",")}（animation ${pa.name}）、震動仍呼叫 ${r5.vib} 次`);
    // 主控台環形圖
    await p.go("dashboard"); await sleep(50);
    const ring = await p.ev(`[...document.querySelectorAll(".db-ring__bar")].map((b) => getComputedStyle(b).transitionDuration + "/" + getComputedStyle(b).animationName).join(",")`);
    const ringOk = ring.split(",").every((x) => /^0s\//.test(x) && x.endsWith("none"));
    ok = ok && ringOk; out.push(`環形圖 transition/animation ${ring}`);
    return { ok: ok && mq, note: `prefers-reduced-motion=${mq}；` + out.join("；") + "（收音條與聆聽中見 TC-33-08、確認視窗見 TC-31-03d）" };
  });
  await p.close();
}

{
  const ex = PAGES.flatMap((x) => x.log.exceptions);
  R[ex.length === 0 ? "pass" : "fail"]("TC-X-motion", "（全套件）無未處理例外", `例外 ${JSON.stringify(ex).slice(0, 400)}`);
}
for (const p of PAGES) await p.close();
R.save(resultPath("e2e-motion"));
