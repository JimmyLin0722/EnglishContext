// QA E2E（第 10 輪新增，PRD v0.20 R-29）：US-58 準備中、US-59 訊息分流、US-60 辨識文字；修改的 AC-08-*、AC-30-04、AC-31-03、AC-33-*；SD-FB-85
// 依據：契約 v0.20 §14（PR-1～PR-12、MS-1～MS-6、RT-1～RT-6、V-STT-STUB）、architecture v0.15 §7.26、§10.12 Q3。
// 替身：tests/e2e/lib/inits.mjs fakeStt（V-STT-STUB）。本套件依各 TC 明確指定「支援 audiostart」或「不支援」，不受 QA_STT_AUDIOSTART 影響；
// 支援時關閉自動 audiostart（autoAudioStartMs: null），由測試逐一觸發事件。getUserMedia 擱置以 GUM_HOLD 包住 fakeMic 模擬（權限詢問未回答）。
// 真人語音（AC-58-14、AC-59-08）不在本套件，列待人工。
import fs from "node:fs";
import path from "node:path";
import { launch, recorder, sleep, resultPath, ROOT } from "./lib/cdp.mjs";
import { TOAST_RECORDER, fakeTts, fakeStt, fakeMic } from "./lib/inits.mjs";
import { stateRecord, seed, KEY, injectTpl } from "./lib/state.mjs"; // injectTpl：cs 範本提供 Latency、Throughput 等單字（同 e2e-speech）
import { PROBE } from "./lib/layout-probe.mjs";

const R = recorder("e2e-stt-flow");
const J = JSON.stringify;
const PAGES = [];
const T_READY = 5000, T_FALLBACK = 1500;
const TXT = {
  prep: "準備中", prepLabel: "準備中，再按一次取消", listen: "聆聽中", idle: "麥克風跟讀",
  heard: "有收到聲音，但沒聽出英文單字，請再說一次", noSpeech: "未偵測到語音，請再試一次", noResp: "語音辨識沒有回應，請再試一次",
};
// getUserMedia 擱置（模擬權限詢問未回答）：window.__qaHold.on = true 時呼叫會擱置，release() 才交給 fakeMic
const GUM_HOLD = `(() => { const md = navigator.mediaDevices; if (!md || !md.getUserMedia) return; const orig = md.getUserMedia.bind(md);
  const H = window.__qaHold = { on: false, calls: 0, pending: [] };
  H.release = () => { const a = H.pending.splice(0); a.forEach((f) => f()); return a.length; };
  Object.defineProperty(md, "getUserMedia", { value: function (c) { H.calls++; if (!H.on) return orig(c); return new Promise((res, rej) => H.pending.push(() => orig(c).then(res, rej))); }, configurable: true, writable: true }); })();`;

async function open({ w = 1366, h = 900, as = true, reduced = false, hold = false, ack = true, db = -5, over = {} } = {}) {
  const p = await launch();
  for (const s of [TOAST_RECORDER, fakeTts("ok"), fakeStt("ok", { audioStart: as, autoAudioStartMs: null }), fakeMic("ok", db), GUM_HOLD, PROBE]) await p.addInitScript(s);
  if (hold) await p.addInitScript(`window.__qaHoldInit = true;`);
  await p.viewport(w, h);
  if (reduced) await p.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await p.goto();
  await seed(p, stateRecord(725, { sttNoticeAcknowledged: ack, ...over }));
  await p.go("customizer"); await injectTpl(p, "cs"); await sleep(80);
  if (hold) await p.ev(`window.__qaHold.on = true`);
  await p.go("flashcards"); await sleep(80);
  PAGES.push(p);
  return p;
}
const ST = `(() => { const f = document.querySelector(".fc-front"); const b = f.querySelector(".sp-mic"); const m = f.querySelector(".sp-msg"); const r = f.querySelector(".sp-result");
  const shown = !!(r && !r.hidden && r.getClientRects().length);
  const rows = shown ? [...r.querySelectorAll(".sp-compare__row")].map((x) => { const dd = x.querySelector("dd"); return { l: x.querySelector("dt").textContent, v: dd.textContent, lang: dd.getAttribute("lang"), kids: dd.children.length }; }) : [];
  const sp = EMT.store.getState().runtime.speech;
  return { status: b.dataset.status, phase: sp.preparingPhase, text: (b.querySelector(".sp-mic__text") || b).textContent, aria: b.getAttribute("aria-label"), pressed: b.getAttribute("aria-pressed"),
    prepCls: b.classList.contains("is-preparing"), listenCls: b.classList.contains("is-listening"),
    bars: [...f.querySelectorAll(".sp-meter__bar")].map((x) => (x.classList.contains("is-on") ? 1 : 0)).join(""),
    msg: m && !m.hidden ? m.innerText.replace(/\\s+/g, " ").trim() : "", score: shown && !!r.querySelector(".sp-result__badge"), badge: shown && r.querySelector(".sp-result__badge") ? r.querySelector(".sp-result__badge").textContent : "",
    light: shown && r.querySelector(".sp-result__light") ? r.querySelector(".sp-result__light").textContent : "", rows, resultText: shown ? r.innerText : "", panelText: f.querySelector(".sp-mic").closest(".fc-front").innerText,
    toasts: window.__qaToasts.length, starts: window.__qaStt.starts, aborts: window.__qaStt.aborts, stops: window.__qaStt.stops, inst: window.__qaStt.instances.length,
    gum: window.__qaHold ? window.__qaHold.calls : -1, live: window.__qaMic.live ? window.__qaMic.live() : -1, held: EMT.services.mic.tracks().length }; })()`;
const st = (p) => p.ev(ST);
const S = (o) => `${o.status}${o.phase ? "/" + o.phase : ""}「${o.text}」${o.bars}${o.msg ? "、訊息「" + o.msg + "」" : ""}${o.score ? "、分數 " + o.badge + o.light : ""}`;
/** 頁面內點按麥克風並等條件成立，回傳到「條件成立後的下一個畫格」的 ms（in-page click，不含 CDP 往返；含點按處理器的同步耗時，即使用者看到變化的時間） */
const clickUntil = (p, cond, max = 400) => p.ev(`(async () => { const b = document.querySelector(".fc-front .sp-mic"); const t0 = performance.now(); b.click();
  for (;;) { const s = (${ST}); if (${cond}) { await new Promise((r) => requestAnimationFrame(() => r())); return +(performance.now() - t0).toFixed(1); } if (performance.now() - t0 > ${max}) return -1; await new Promise((r) => setTimeout(r, 1)); } })()`);
/**
 * 第一次按下的細項：點按處理器同步耗時、data-status 變化時間、畫出時間（ms，自 click 前起算）。
 * 第 11 輪（PG 回饋 (a)、architecture v0.16 §7.28.6）：量測用的 requestAnimationFrame 必須在 click「之前」登錄，
 * 其回呼內再 setTimeout(0) 取得「畫出之後」的時間 t2。若在 click 之後才登錄，產品在 click 內登錄的 rAF 先執行、先排入 setTimeout(0)，
 * 產品延後的 acquire（含 new AudioContext 約 110 ms）就會先於量測計時器執行而被誤算進去。
 * 另記 getUserMedia 呼叫數（__qaHold.calls）：t1（處理器結束）、t2（畫出後）、t2 後 250 ms，用來確認取得是在畫出之後才開始。
 * 不使用 Event Timing（PG 回饋 (b)：無頭模式不可靠）。
 */
const firstPress = (p) => p.ev(`(async () => { const b = document.querySelector(".fc-front .sp-mic"); const n = window.__qaMicSeq.length; const H = window.__qaHold;
  const painted = new Promise((r) => requestAnimationFrame(() => setTimeout(() => r(performance.now()), 0)));
  const g0 = H.calls; const t0 = performance.now(); b.click(); const t1 = performance.now(); const s1 = b.dataset.status; const g1 = H.calls;
  const t2 = await painted; const g2 = H.calls; await new Promise((r) => setTimeout(r, 250)); const g3 = H.calls; const x = window.__qaMicSeq.slice(n).find((y) => y.s === "preparing");
  return { sync: +(t1 - t0).toFixed(1), attr: x ? +(x.t - t0).toFixed(1) : -1, frame: +(t2 - t0).toFixed(1), statusAtT1: s1, gumT1: g1 - g0, gumPaint: g2 - g0, gumLater: g3 - g0, status: b.dataset.status, text: (b.querySelector(".sp-mic__text") || b).textContent }; })()`);
// 第 11 輪：AudioContext 建構記錄（實例、建構耗時、state），用於 TC-58-01f（耗時來源）、TC-58-04c（延後期間取消時 0 個）、TC-33-03r（state）
const AC_LOG = `(() => { const O = window.AudioContext; if (!O) return; const L = window.__qaAC = { list: [] };
  const W = function (...a) { const t0 = performance.now(); const c = new O(...a); L.list.push({ c, t: +t0.toFixed(1), ms: +(performance.now() - t0).toFixed(1), state0: c.state }); return c; };
  W.prototype = O.prototype; Object.setPrototypeOf(W, O); window.AudioContext = W; })();`;
const emit = (p, js, which = "last") => p.ev(`(() => { const r = ${which === "last" ? "window.__qaStt.last" : `window.__qaStt.instances[${which}]`}; ${js} })()`);
async function waitFor(p, cond, max = 3000) { const t0 = Date.now(); for (;;) { const s = await st(p); if (eval(cond)) return s; if (Date.now() - t0 > max) return s; await sleep(20); } } // eslint-disable-line no-eval
/** 按下並等到「已開始辨識、尚未 audiostart」（awaitingAudioStart 或 fallbackWait） */
async function toAwaiting(p) { await p.click(".fc-front .sp-mic"); return waitFor(p, `s.status === "preparing" && (s.phase === "awaitingAudioStart" || s.phase === "fallbackWait")`, 1500); }
async function toListening(p) { await toAwaiting(p); await emit(p, `r.emitAudioStart()`); return waitFor(p, `s.status === "listening"`, 500); }
async function gotoWord(p, w) {
  await p.go("flashcards");
  const i = await p.ev(`EMT.store.getState().runtime.studySet.findIndex((c) => (c.word || (c.item && c.item.word)) === ${J(w)})`);
  if (i < 0) throw new Error("單字集找不到 " + w);
  await p.ev(`EMT.store.actions.gotoCard(${i})`); await sleep(60);
}
async function addWords(p, words) { for (const w of words) await p.ev(`EMT.store.actions.addCustomWord({ word: ${J(w)}, meaning: "測試" })`); await sleep(80); }
async function scoreWith(p, text) { await toListening(p); await emit(p, `r.emitResult(${J(text)}); r.emitEnd();`); await sleep(80); return st(p); }
// Enter 鍵（含 text 換行字元，按鈕才會觸發 click）
const enter = async (p) => { await p.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: String.fromCharCode(13), unmodifiedText: String.fromCharCode(13) }); await p.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 }); };
const lsRaw = (p) => p.ev(`localStorage.getItem(${J(KEY)})`);
const lsKeys = (p) => p.ev(`Object.keys(localStorage).sort()`);
const seqSince = (p, n) => p.ev(`window.__qaMicSeq.slice(${n})`);

// ═════════ 1. 支援 audiostart（主流程）════════
{
  const p = await open();
  await R.check("TC-58-01", "AC-58-01、AC-08-01（v0.20）", async () => {
    await gotoWord(p, "Latency");
    const sc = await scoreWith(p, "Latency."); // 先有前次分數
    const before = await st(p);
    const ms = await clickUntil(p, `s.status === "preparing"`);
    const a = await st(p);
    await waitFor(p, `s.phase === "awaitingAudioStart"`, 800);
    await emit(p, `r.emitError("no-speech"); r.emitEnd();`); await sleep(60); // 留下前次訊息（未確認 → no-speech 屬 AC-59-05）
    const withMsg = await st(p);
    const ms2 = await clickUntil(p, `s.status === "preparing"`);
    const b = await st(p);
    await p.click(".fc-front .sp-mic"); await sleep(60); // 取消
    const ok = sc.score && before.score && ms >= 0 && ms <= 100 && a.text === TXT.prep && a.aria === TXT.prepLabel && a.pressed === "true" && a.prepCls && !a.listenCls && !a.score && !a.msg && a.bars === "00000" && !a.panelText.includes(TXT.listen)
      && withMsg.msg && ms2 >= 0 && ms2 <= 100 && !b.msg && !b.score && b.status === "preparing";
    return { ok, note: `前次分數 ${before.badge}${before.light} → 按下 ${ms} ms 內 ${S(a)}、aria-label「${a.aria}」、aria-pressed ${a.pressed}、畫面含「聆聽中」=${a.panelText.includes(TXT.listen)}；前次訊息「${withMsg.msg}」→ 按下 ${ms2} ms 內清除=${!b.msg}` };
  });

  await R.check("TC-58-02", "AC-58-02、AC-33-03（v0.20 準備中全暗）", async () => {
    await p.ev(`window.__qaMic.setDb(-5)`);
    const a = await toAwaiting(p);
    const samples = [];
    const t0 = Date.now();
    while (Date.now() - t0 < T_READY - 600) { const s = await st(p); samples.push(s.status + ":" + s.bars); await sleep(150); }
    const allDark = samples.every((x) => x === "preparing:00000");
    await p.click(".fc-front .sp-mic"); await sleep(60);
    return { ok: a.status === "preparing" && a.phase === "awaitingAudioStart" && allDark && samples.length >= 20, note: `start() 已回傳（${a.phase}）、測試音源 −5 dBFS（足以亮 5 格）；${((T_READY - 600) / 1000).toFixed(1)} 秒內取樣 ${samples.length} 次全為「準備中、00000」=${allDark}` };
  });

  await R.check("TC-58-03", "AC-58-03、AC-08-01、AC-33-03", async () => {
    const out = []; let ok = true;
    for (let k = 0; k < 5; k++) {
      const n0 = await p.ev(`window.__qaMicSeq.length`); const l0 = await p.ev(`window.__qaStt.log.length`);
      await toAwaiting(p); await sleep(150 + k * 50);
      await emit(p, `r.emitAudioStart()`);
      const lit = await p.ev(`(async () => { const t0 = performance.now(); for (;;) { const on = [...document.querySelectorAll(".fc-front .sp-meter__bar")].some((x) => x.classList.contains("is-on")); if (on) return +(performance.now() - t0).toFixed(1); if (performance.now() - t0 > 500) return -1; await new Promise((r) => setTimeout(r, 2)); } })()`);
      const seq = await seqSince(p, n0); const log = await p.ev(`window.__qaStt.log.slice(${l0})`);
      const tRet = (log.find((x) => x.ev === "start-return") || {}).t, tAs = (log.find((x) => x.ev === "audiostart") || {}).t, tL = (seq.find((x) => x.s === "listening") || {}).t;
      const d = +(tL - tAs).toFixed(1);
      const good = tRet < tAs && tAs <= tL && d >= 0 && d <= 100 && seq[0].s === "preparing" && lit >= 0 && lit <= 300;
      ok = ok && good; out.push(`#${k + 1} start 回傳 → audiostart ${(tAs - tRet).toFixed(0)} ms → 聆聽中 +${d} ms、收音條 ${lit} ms 後點亮`);
      await emit(p, `r.emitResult("Latency"); r.emitEnd();`); await sleep(60);
    }
    return { ok, note: `T_BUFFER = 0：${out.join("；")}` };
  });

  await R.check("TC-58-04b", "AC-58-04 (b)", async () => {
    await gotoWord(p, "Latency");
    const a = await toAwaiting(p); const old = a.inst - 1; const ab0 = a.aborts;
    const ms = await clickUntil(p, `s.status === "idle"`);
    const b = await st(p);
    await sleep(60);
    await emit(p, `r.emitAudioStart(); r.emitSoundStart(); r.emitSpeechStart(); r.emitResult("Latency"); r.emitNomatch(); r.emitError("network"); r.emitEnd();`, old); await sleep(120);
    const c = await st(p);
    const ok = ms >= 0 && ms <= 100 && b.status === "idle" && b.text === TXT.idle && !b.msg && !b.score && b.bars === "00000" && b.toasts === a.toasts && b.aborts === ab0 + 1
      && c.status === "idle" && !c.msg && !c.score && c.bars === "00000" && c.toasts === a.toasts;
    return { ok, note: `已 start（${a.phase}）再按：${ms} ms 回 ${S(b)}、abort ${ab0}→${b.aborts}、Toast 增 ${b.toasts - a.toasts}；之後替身對舊實例觸發 audiostart、soundstart、speechstart、result、nomatch、error、end → ${S(c)}` };
  });

  await R.check("TC-58-05", "AC-58-05（已開始辨識後取消再按）", async () => {
    const a = await toAwaiting(p); const old = a.inst - 1;
    await p.ev(`(() => { const b = document.querySelector(".fc-front .sp-mic"); b.click(); window.__qaT = performance.now(); })()`);
    const ms = await p.ev(`(async () => { await new Promise((r) => setTimeout(r, 30)); const b = document.querySelector(".fc-front .sp-mic"); b.click(); return +(performance.now() - window.__qaT).toFixed(1); })()`);
    const b = await waitFor(p, `s.status === "preparing" && s.phase === "awaitingAudioStart"`, 800);
    await emit(p, `r.emitAudioStart(); r.emitResult("Latency"); r.emitEnd();`, old); await sleep(120);
    const c = await st(p);
    const started = await p.ev(`window.__qaStt.instances.map((r) => r.started && !r.__aborted && !r.__ended).filter(Boolean).length`);
    await emit(p, `r.emitAudioStart()`); await sleep(40); const d = await st(p);
    await emit(p, `r.emitResult("Latency"); r.emitEnd();`); await sleep(60); const e = await st(p);
    const ok = ms <= 100 && b.status === "preparing" && c.status === "preparing" && !c.msg && !c.score && started === 1 && d.status === "listening" && e.score && p.log.exceptions.length === 0;
    return { ok, note: `取消後 ${ms} ms 再按 → ${S(b)}；舊實例遲到 audiostart、result、end → ${S(c)}；同時進行中的辨識工作 ${started} 個；新實例 audiostart → ${d.status}、result → ${e.badge}${e.light}；未處理例外 ${p.log.exceptions.length}` };
  });

  await R.check("TC-58-06", "AC-58-06、E-156", async () => {
    await gotoWord(p, "Latency");
    const n0 = await p.ev(`window.__qaMicSeq.length`); const l0 = await p.ev(`window.__qaStt.log.length`);
    const a = await toAwaiting(p); const old = a.inst - 1;
    const s = await waitFor(p, `s.status === "idle"`, T_READY + 1500);
    const seq = await seqSince(p, n0); const log = await p.ev(`window.__qaStt.log.slice(${l0})`);
    const tRet = (log.find((x) => x.ev === "start-return") || {}).t; const tIdle = (seq.find((x) => x.s === "idle") || {}).t; const dt = +(tIdle - tRet).toFixed(0);
    const aborted = log.some((x) => x.ev === "abort" && x.i === old);
    await emit(p, `r.emitAudioStart(); r.emitResult("Latency"); r.emitEnd();`, old); await sleep(120); const c = await st(p);
    const d = await toAwaiting(p); await emit(p, `r.emitAudioStart()`); await sleep(40); const e = await st(p);
    await emit(p, `r.emitResult("Latency"); r.emitEnd();`); await sleep(60);
    const ok = Math.abs(dt - T_READY) <= 200 && aborted && s.status === "idle" && s.bars === "00000" && s.msg === TXT.noResp && !s.score && c.msg === TXT.noResp && !c.score && c.status === "idle" && d.status === "preparing" && e.status === "listening";
    return { ok, note: `start() 回傳到回待機 ${dt} ms（T_READY ${T_READY} ± 200）、中止辨識=${aborted}；${S(s)}；遲到 audiostart、result、end → ${S(c)}；再按 → ${d.status} → audiostart → ${e.status}` };
  });

  await R.check("TC-58-07", "AC-58-07", async () => {
    const out = []; let ok = true;
    for (const ev of ["emitSoundStart", "emitSpeechStart"]) {
      await toAwaiting(p); const ms = await p.ev(`(() => { const t0 = performance.now(); window.__qaStt.last.${ev}(); return document.querySelector(".fc-front .sp-mic").dataset.status === "listening" ? +(performance.now() - t0).toFixed(1) : -1; })()`);
      await sleep(T_READY + 400); const s = await st(p);
      const good = ms >= 0 && s.status === "listening";
      ok = ok && good; out.push(`${ev.slice(4)}：同一處理器內進入聆聽中（${ms} ms）、${(T_READY + 400) / 1000} 秒後仍 ${s.status}（不套用 T_READY）`);
      await emit(p, `r.emitResult("Latency"); r.emitEnd();`); await sleep(60);
    }
    await gotoWord(p, "address");
    await toAwaiting(p); await emit(p, `r.emitResult("adress"); r.emitEnd();`); await sleep(80); let s = await st(p);
    ok = ok && s.score && /\b86\b/.test(s.badge) && s.light === "黃燈" && s.status === "idle"; out.push(`準備中直接 result「adress」→ ${s.badge} ${s.light}`);
    await toAwaiting(p); await emit(p, `r.emitNomatch(); r.emitEnd();`); await sleep(80); s = await st(p);
    ok = ok && s.msg === TXT.heard && !s.score && s.status === "idle"; out.push(`準備中 nomatch → 「${s.msg}」`);
    return { ok, note: out.join("；") };
  });

  await R.check("TC-58-08", "AC-58-08、E-161", async () => {
    await gotoWord(p, "Latency");
    const out = []; let ok = true;
    const cases = [["not-allowed", "需要麥克風權限"], ["service-not-allowed", "需要麥克風權限"], ["audio-capture", "找不到麥克風裝置"], ["network", "語音辨識需要網路連線"], ["bad-grammar", "語音辨識發生錯誤，請稍後再試一次"], ["no-speech", TXT.noSpeech], [null, TXT.noResp]];
    for (const [code, exp] of cases) {
      await toAwaiting(p); await emit(p, code ? `r.emitError(${J(code)}); r.emitEnd();` : `r.emitEnd();`); await sleep(80); const s = await st(p);
      const good = s.status === "idle" && s.msg.startsWith(exp) && !s.score && s.bars === "00000";
      ok = ok && good; out.push(`${code || "無錯誤 end"} → 「${s.msg.slice(0, 24)}」${good ? "" : "（不符）"}`);
    }
    await p.ev(`window.__qaStt.throwOnStart = true`); await p.click(".fc-front .sp-mic"); const s = await waitFor(p, `s.status === "idle"`, 800);
    const good = s.msg === "語音辨識發生錯誤，請稍後再試一次" && !s.score && s.bars === "00000";
    ok = ok && good; out.push(`start() 拋例外 → 「${s.msg}」、${s.status}`);
    return { ok: ok && p.log.exceptions.length === 0, note: out.join("；") + `；未處理例外 ${p.log.exceptions.length}` };
  });

  await R.check("TC-58-11", "AC-58-11、AC-33-06 (b)（v0.20 準備中）、E-160", async () => {
    await gotoWord(p, "Latency"); await scoreWith(p, "Latency");
    const a = await toAwaiting(p);
    const ms = await p.ev(`(async () => { const t0 = performance.now(); window.__qaMic.unplug(); for (;;) { const b = document.querySelector(".fc-front .sp-mic"); if (b.dataset.status === "idle" && ![...document.querySelectorAll(".fc-front .sp-meter__bar")].some((x) => x.classList.contains("is-on"))) return +(performance.now() - t0).toFixed(1); if (performance.now() - t0 > 300) return -1; await new Promise((r) => setTimeout(r, 2)); } })()`);
    await sleep(100); const s = await st(p);
    const ok = a.held >= 1 && ms >= 0 && ms <= 100 && s.status === "idle" && s.bars === "00000" && s.msg.includes("找不到麥克風裝置") && s.msg.includes("請確認裝置已連接麥克風後再按一次") && !s.score && s.aborts > a.aborts && p.log.exceptions.length === 0;
    return { ok, note: `準備中（${a.phase}、持有音軌 ${a.held}）拔除 → ${ms} ms 回 ${S(s)}、abort ${a.aborts}→${s.aborts}` };
  });

  await R.check("TC-FB85", "AC-08-10（SD-FB-85：聆聽中停止後遲到的 result 不評分）", async () => {
    await gotoWord(p, "Latency");
    await toListening(p);
    await p.click(".fc-front .sp-mic"); // 停止
    const a = await st(p);
    await emit(p, `r.emitResult("Latency"); r.emitEnd();`); await sleep(120);
    const b = await st(p);
    const tl = await p.ev(`EMT.store.getState().data.todayLearned.wordKeys.length`);
    return { ok: a.status === "idle" && !b.score && !b.msg && b.status === "idle", note: `聆聽中按停止 → ${a.status}、stop ${a.stops}；之後替身送出 result「Latency」與 end → ${S(b)}（不評分、不提示；與 v1.3.0「停止後仍可能評分」不同，屬 SD-FB-85 刻意變更）；今日已學 ${tl}` };
  });
}

// ═════════ 2. 取得麥克風中（權限詢問未回答）════════
{
  const p = await open({ hold: true });
  await R.check("TC-58-04a", "AC-58-04 (a)、AC-58-01（含取得麥克風期間）、E-157", async () => {
    const ms = await clickUntil(p, `s.status === "preparing"`);
    // 第 11 輪（SD-FB-97、§7.28.3）：第 1 次按下時 getUserMedia 晚 1 個畫格才呼叫；等取得真的開始（權限詢問中）再按，才是「取得中再按」
    await waitFor(p, `s.gum >= 1`, 500);
    const a = await st(p);
    const ms2 = await clickUntil(p, `s.status === "idle"`);
    const b = await st(p);
    const n = await p.ev(`window.__qaHold.release()`); await sleep(300);
    const c = await st(p);
    // 再按：重用已取得的音軌（不再呼叫 getUserMedia）
    await p.ev(`window.__qaHold.on = false`);
    const g0 = c.gum; await p.click(".fc-front .sp-mic"); const d = await waitFor(p, `s.status === "preparing" && s.phase === "awaitingAudioStart"`, 800);
    await p.click(".fc-front .sp-mic"); await sleep(60);
    const ok = /* 第 1 次按下的 ≤ 100 ms 由 TC-58-01f 判定 */ a.status === "preparing" && a.phase === "acquiringMic" && a.text === TXT.prep && a.bars === "00000" && ms2 >= 0 && ms2 <= 100 && b.status === "idle" && !b.msg && !b.score && b.toasts === a.toasts && b.bars === "00000"
      && n === 1 && c.starts === a.starts && c.status === "idle" && !c.msg && c.held === 1 && c.live === 1 && d.gum === g0 && d.starts === c.starts + 1;
    return { ok, note: `按下 ${ms} ms 內 ${S(a)}；取得中再按 ${ms2} ms 回 ${S(b)}、Toast 增 ${b.toasts - a.toasts}；放行擱置的 getUserMedia（${n} 個）後：辨識開始 ${a.starts}→${c.starts}（不開始）、${S(c)}、保留音軌 ${c.held}（live ${c.live}）；再按 getUserMedia ${g0}→${d.gum}（重用）、start ${c.starts}→${d.starts}` };
  });
  await R.check("TC-58-06b", "AC-58-06（權限詢問不計入 T_READY）、E-157", async () => {
    await p.ev(`window.__qaMic.unplug()`); await sleep(100); // 讓下次按下重新取得
    await p.ev(`window.__qaHold.on = true`);
    const g0 = (await st(p)).gum;
    await p.click(".fc-front .sp-mic"); await sleep(T_READY + 1200);
    const a = await st(p);
    const ms = await clickUntil(p, `s.status === "idle"`); const b = await st(p);
    await p.ev(`window.__qaHold.release()`); await sleep(300); const c = await st(p);
    await p.ev(`window.__qaHold.on = false`);
    const ok = a.status === "preparing" && a.phase === "acquiringMic" && !a.msg && a.gum === g0 + 1 && ms <= 100 && b.status === "idle" && !b.msg && c.status === "idle" && c.starts === a.starts && !c.msg;
    return { ok, note: `getUserMedia 擱置 ${(T_READY + 1200) / 1000} 秒（> T_READY）後仍 ${S(a)}；再按 ${ms} ms 回 ${S(b)}；之後才允許 → 不開始辨識（start ${a.starts}→${c.starts}）、${S(c)}` };
  });
  await R.check("TC-58-05b", "AC-58-05（取得中取消後立即再按：共用取得、不出現第 2 個權限詢問）、PR-8", async () => {
    await p.ev(`window.__qaMic.unplug()`); await sleep(100); await p.ev(`window.__qaHold.on = true`);
    const a0 = await st(p);
    const ms = await p.ev(`(async () => { const b = document.querySelector(".fc-front .sp-mic"); b.click(); await new Promise((r) => setTimeout(r, 20)); const t0 = performance.now(); b.click(); await new Promise((r) => setTimeout(r, 20)); b.click(); return +(performance.now() - t0).toFixed(1); })()`);
    // 第 11 輪（SD-FB-97）：新嘗試的取得在「準備中」畫出後（1 個畫格 + setTimeout 0，後備 50 ms）才開始；晚 1 個畫格再讀 getUserMedia 次數
    await p.ev(`new Promise((r) => requestAnimationFrame(() => setTimeout(r, 60)))`);
    const a = await st(p);
    const n = await p.ev(`window.__qaHold.release()`);
    const b = await waitFor(p, `s.status === "preparing" && s.phase === "awaitingAudioStart"`, 1000);
    await sleep(200); const b2 = await st(p);
    await emit(p, `r.emitAudioStart()`); await sleep(40); const c = await st(p);
    await emit(p, `r.emitResult("Latency"); r.emitEnd();`); await sleep(60); const d = await st(p);
    await p.ev(`window.__qaHold.on = false`);
    const ok = ms <= 100 && a.status === "preparing" && a.gum === a0.gum + 1 && n === 1 && b.status === "preparing" && b2.starts === a0.starts + 1 && b2.inst === a0.inst + 1 && c.status === "listening" && d.score && p.log.exceptions.length === 0;
    return { ok, note: `取得中：按下 → 取消 → ${ms} ms 內再按 → ${S(a)}；getUserMedia 呼叫 ${a0.gum}→${a.gum}（第 2 次按下沿用擱置中的取得，不出現第 2 個權限詢問）；放行後只有新嘗試開始辨識（start ${a0.starts}→${b2.starts}、實例 ${a0.inst}→${b2.inst}）→ ${c.status} → ${d.badge}${d.light}` };
  });
  await R.check("TC-58-10a", "AC-58-10 (a) 取得麥克風期間、E-159", async () => {
    const out = []; let ok = true;
    await p.ev(`window.__qaHold.on = true`);
    const acts = [["換卡", async () => p.click(".fc-next")], ["切換測驗模式", async () => { await p.click(".fc-mode-btn"); await sleep(120); }], ["按 TTS", async () => p.click(".fc-front .sp-tts__btn", 0)]];
    for (const [name, act] of acts) {
      await p.ev(`window.__qaMic.unplug()`); await sleep(60);
      const sp0 = await p.ev(`window.__qaTts.spoken.length`);
      await p.click(".fc-front .sp-mic"); const a = await st(p);
      await act(); await sleep(80);
      const inQuiz = await p.ev(`!document.querySelector(".fc-front .sp-mic") || document.querySelector(".fc-front .sp-mic").getClientRects().length === 0`);
      if (inQuiz) { await p.click(".fc-mode-btn"); await sleep(120); }
      const b = await st(p); const sp1 = await p.ev(`window.__qaTts.spoken.length`);
      await p.ev(`window.__qaHold.release()`); await sleep(250); const c = await st(p);
      const good = a.phase === "acquiringMic" && b.status === "idle" && !b.msg && b.bars === "00000" && c.status === "idle" && c.starts === a.starts && !c.msg && (name !== "按 TTS" || sp1 === sp0 + 1);
      ok = ok && good; out.push(`${name}：${a.phase} → ${b.status}${b.msg ? "「" + b.msg + "」" : ""}，取得完成後不開始（start ${a.starts}→${c.starts}）${name === "按 TTS" ? `、照常朗讀 ${sp1 - sp0} 次` : ""}`);
    }
    // 翻面：與聆聽中相同（flashcards 不 reset），準備中繼續
    await p.ev(`window.__qaMic.unplug()`); await sleep(60);
    await p.click(".fc-front .sp-mic"); await p.click(".fc-flip"); await sleep(450); const f1 = await st(p); await p.click(".fc-flip"); await sleep(450);
    await p.ev(`window.__qaHold.release()`); const f2 = await waitFor(p, `s.phase === "awaitingAudioStart"`, 800); await p.click(".fc-front .sp-mic"); await sleep(60);
    ok = ok && f1.status === "preparing" && f2.status === "preparing"; out.push(`翻面（往返）：仍 ${f1.status}/${f1.phase}，取得完成後 ${f2.status}/${f2.phase}（同聆聽中：翻面不中止）`);
    // 離開單字卡頁：1 秒內釋放音軌；取得中被釋放 → 不顯示
    await p.ev(`window.__qaMic.unplug()`); await sleep(60);
    await p.click(".fc-front .sp-mic"); const a = await st(p);
    await p.go("dashboard"); await p.ev(`window.__qaHold.release()`);
    let live = -1; const t0 = Date.now(); for (let i = 0; i < 40; i++) { live = await p.ev(`window.__qaMic.live()`); const held = await p.ev(`EMT.services.mic.tracks().length`); if (live === 0 && held === 0) break; await sleep(25); }
    const relMs = Date.now() - t0;
    await p.go("flashcards"); await sleep(100); const b = await st(p);
    ok = ok && a.phase === "acquiringMic" && live === 0 && relMs <= 1000 && b.status === "idle" && !b.msg && b.starts === a.starts; out.push(`離開單字卡頁（取得中）：${relMs} ms 內音軌 live ${live}、回單字卡頁 ${S(b)}、未開始辨識`);
    await p.ev(`window.__qaHold.on = false`);
    return { ok: ok && p.log.exceptions.length === 0, note: out.join("；") };
  });
}

// ═════════ 3. 已開始辨識期間的中斷（AC-58-10 (b)）════════
{
  const p = await open();
  await R.check("TC-58-10b", "AC-58-10 (b) 已開始辨識期間、E-159", async () => {
    const out = []; let ok = true;
    const acts = [["換卡", async () => p.click(".fc-next")], ["切換測驗模式", async () => { await p.click(".fc-mode-btn"); await sleep(120); await p.click(".fc-mode-btn"); await sleep(120); }], ["按 TTS", async () => p.click(".fc-front .sp-tts__btn", 0)]];
    for (const [name, act] of acts) {
      const sp0 = await p.ev(`window.__qaTts.spoken.length`);
      const a = await toAwaiting(p); const old = a.inst - 1;
      await act(); await sleep(60); const b = await st(p); const sp1 = await p.ev(`window.__qaTts.spoken.length`);
      await emit(p, `r.emitAudioStart(); r.emitResult("Latency"); r.emitEnd();`, old); await sleep(100); const c = await st(p);
      const good = b.status === "idle" && !b.msg && !b.score && b.bars === "00000" && b.aborts === a.aborts + 1 && c.status === "idle" && !c.msg && !c.score && (name !== "按 TTS" || sp1 === sp0 + 1);
      ok = ok && good; out.push(`${name}：${a.phase} → ${b.status}、abort +${b.aborts - a.aborts}${name === "按 TTS" ? `、朗讀 ${sp1 - sp0} 次` : ""}；遲到事件 → ${S(c)}`);
    }
    // 翻面：準備中與聆聽中都繼續（v1.3.0 聆聽中相同）
    let a = await toAwaiting(p); await p.click(".fc-flip"); await sleep(450); let b = await st(p); await p.click(".fc-flip"); await sleep(450);
    await emit(p, `r.emitAudioStart()`); await sleep(40); const l1 = await st(p); await p.click(".fc-flip"); await sleep(450); const l2 = await st(p); await p.click(".fc-flip"); await sleep(450);
    await emit(p, `r.emitResult("x"); r.emitEnd();`); await sleep(60);
    ok = ok && b.status === "preparing" && l1.status === "listening" && l2.status === "listening"; out.push(`翻面：準備中 → ${b.status}；聆聽中 → ${l2.status}（行為相同）`);
    // 離開頁面
    a = await toAwaiting(p); const old = a.inst - 1;
    const t0 = Date.now(); await p.go("dashboard");
    let live = -1; for (let i = 0; i < 40; i++) { live = await p.ev(`window.__qaMic.live()`); if (live === 0) break; await sleep(25); } const relMs = Date.now() - t0;
    await emit(p, `r.emitAudioStart(); r.emitResult("Latency"); r.emitEnd();`, old); await sleep(80);
    await p.go("flashcards"); await sleep(80); b = await st(p);
    ok = ok && live === 0 && relMs <= 1000 && b.status === "idle" && !b.msg && !b.score; out.push(`離開單字卡頁：${relMs} ms 內音軌 live ${live}；遲到事件後回單字卡頁 ${S(b)}`);
    return { ok: ok && p.log.exceptions.length === 0, note: out.join("；") };
  });
  await R.check("TC-58-12", "AC-58-12、AC-30-04（v0.20 準備中取消與逾時）、AC-17-02", async () => {
    await p.go("flashcards");
    const raw0 = await lsRaw(p); const keys0 = await lsKeys(p);
    const bk0 = await p.ev(`EMT.store.actions.exportBackup().json`);
    await toAwaiting(p); await p.click(".fc-front .sp-mic"); await sleep(60); // 取消
    await toAwaiting(p); await waitFor(p, `s.status === "idle"`, T_READY + 1500); // 逾時
    await toListening(p); await emit(p, `r.emitSpeechStart(); r.emitEnd();`); await sleep(60); // 有收到聲音
    await toListening(p); await emit(p, `r.emitEnd();`); await sleep(60); // 未偵測到語音
    const raw1 = await lsRaw(p); const keys1 = await lsKeys(p);
    const bk1 = await p.ev(`EMT.store.actions.exportBackup().json`);
    const strip = (s) => { const o = JSON.parse(s); delete o.exportedAt; delete o.savedAt; return JSON.stringify(o); };
    const st1 = JSON.parse(raw1); const bko = JSON.parse(bk1);
    const leak = /preparing|preparingPhase|sttStatus|audiostart|speechDetected|awaitingAudioStart|fallbackWait|acquiringMic/.test(raw1 + bk1);
    await toAwaiting(p); // 準備中時重新載入
    await p.reload(); await p.go("flashcards"); const r = await st(p);
    const dash = await p.ev(`(() => { EMT.router.go("dashboard"); return document.querySelector("#view-dashboard").innerText.match(/今日已學[^\\n]*/)[0]; })()`);
    const ok = raw1 === raw0 && J(keys1) === J(keys0) && keys1.length === 1 && st1.schemaVersion === 3 && strip(bk1) === strip(bk0) && Object.keys(bko).length === 5 && !leak
      && r.status === "idle" && r.phase === null; // 今日已學、打卡、掌握數：前面 TC 已評分過，以 localStorage 位元組不變判定（不是 0）
    return { ok, note: `取消、逾時、有收到聲音、未偵測到語音後：localStorage 位元組不變=${raw1 === raw0}、鍵 ${J(keys1)}、schemaVersion ${st1.schemaVersion}；匯出備份（去掉時間欄）不變=${strip(bk1) === strip(bk0)}、頂層 ${Object.keys(bko).join(",")}；含準備中或事件字樣=${leak}；準備中重新載入 → ${r.status}、preparingPhase ${r.phase}；${dash}、打卡 ${st1.data.streak.days}、掌握 ${st1.data.masteredWordKeys.length}` };
  });
}

// ═════════ 4. 不支援 audiostart（AC-58-09）════════
{
  const p = await open({ as: false });
  await R.check("TC-58-09", "AC-58-09、E-158", async () => {
    const out = []; let ok = true;
    await gotoWord(p, "Latency");
    for (let k = 0; k < 3; k++) {
      const n0 = await p.ev(`window.__qaMicSeq.length`); const l0 = await p.ev(`window.__qaStt.log.length`);
      await p.click(".fc-front .sp-mic"); const a = await waitFor(p, `s.phase === "fallbackWait"`, 800);
      const s = await waitFor(p, `s.status === "listening"`, T_FALLBACK + 1000); await sleep(300); const s2 = await st(p);
      const seq = await seqSince(p, n0); const log = await p.ev(`window.__qaStt.log.slice(${l0})`);
      const tRet = (log.find((x) => x.ev === "start-return") || {}).t; const tL = (seq.find((x) => x.s === "listening") || {}).t; const dt = +(tL - tRet).toFixed(0);
      const good = a.status === "preparing" && a.text === TXT.prep && a.bars === "00000" && s.status === "listening" && dt >= T_FALLBACK - 20 && dt <= T_FALLBACK + 120 && s2.bars !== "00000";
      ok = ok && good; out.push(`#${k + 1} ${a.phase}「${a.text}」${a.bars} → start 回傳後 ${dt} ms 聆聽中、收音條 ${s2.bars}`);
      if (k === 0) { await sleep(T_READY + 300); const t = await st(p); ok = ok && t.status === "listening"; out.push(`再等 ${(T_READY + 300) / 1000} 秒仍 ${t.status}（不套用 T_READY）`); }
      await emit(p, `r.emitResult("Latency"); r.emitEnd();`); await sleep(60);
    }
    // 期間再按 = 取消
    await p.click(".fc-front .sp-mic"); await waitFor(p, `s.phase === "fallbackWait"`, 800);
    const ms = await clickUntil(p, `s.status === "idle"`); await sleep(T_FALLBACK + 200); let s = await st(p);
    ok = ok && ms <= 100 && s.status === "idle" && !s.msg; out.push(`後備等待中再按 ${ms} ms 回待機、${T_FALLBACK + 200} ms 後仍 ${s.status}`);
    // 提前事件
    const early = [["speechstart", `r.emitSpeechStart()`, (x) => x.status === "listening"], ["result", `r.emitResult("Latency"); r.emitEnd();`, (x) => x.score], ["error network", `r.emitError("network"); r.emitEnd();`, (x) => x.msg === "語音辨識需要網路連線"], ["無錯誤 end", `r.emitEnd();`, (x) => x.msg === TXT.noResp]];
    for (const [name, js, chk] of early) {
      await p.click(".fc-front .sp-mic"); await waitFor(p, `s.phase === "fallbackWait"`, 800); await emit(p, js); await sleep(60); s = await st(p);
      ok = ok && chk(s); out.push(`提前 ${name} → ${S(s)}`);
      if (s.status === "listening") { await emit(p, `r.emitResult("Latency"); r.emitEnd();`); await sleep(60); }
    }
    return { ok: ok && p.log.exceptions.length === 0, note: `替身沒有 onaudiostart 屬性（"onaudiostart" in rec 為 false）：${out.join("；")}` };
  });
}

// ═════════ 5. US-59 訊息分流 ═════════
{
  const p = await open();
  await gotoWord(p, "Latency");
  const once = async (js) => { await toListening(p); const t0 = (await st(p)).toasts; const n0 = await p.ev(`window.__qaMsgLog = []; 0`); await emit(p, js); await sleep(80); const s = await st(p); return { ...s, newToasts: s.toasts - t0 }; };
  // 訊息變化紀錄（同一次嘗試最多 1 則）
  await p.ev(`(() => { const m = document.querySelector(".fc-front .sp-msg"); window.__qaMsgLog = []; new MutationObserver(() => { const t = m.hidden ? "" : m.innerText.replace(/\\s+/g, " ").trim(); if (t) window.__qaMsgLog.push(t); }).observe(m, { childList: true, subtree: true, characterData: true, attributes: true }); })()`);
  const msgLog = () => p.ev(`[...new Set(window.__qaMsgLog)]`);
  await R.check("TC-59-01", "AC-59-01、AC-08-10（v0.20）、E-05", async () => {
    const s = await once(`r.emitSpeechStart(); r.emitEnd();`); const ml = await msgLog();
    return { ok: s.status === "idle" && s.bars === "00000" && s.msg === TXT.heard && !s.score && ml.length === 1 && s.newToasts === 0, note: `speechstart → end：${S(s)}；訊息紀錄 ${J(ml)}` };
  });
  await R.check("TC-59-02", "AC-59-02", async () => {
    const out = []; let ok = true;
    for (const [name, js] of [["無 speechstart", `r.emitNomatch(); window.__qaMid = document.querySelector(".fc-front .sp-msg").innerText.trim(); r.emitEnd();`], ["有 speechstart", `r.emitSpeechStart(); r.emitNomatch(); window.__qaMid = document.querySelector(".fc-front .sp-msg").innerText.trim(); r.emitEnd();`]]) {
      const s = await once(js); const mid = await p.ev(`window.__qaMid`); const ml = await msgLog();
      const good = s.msg === TXT.heard && mid === TXT.heard && ml.length === 1 && !s.score && s.status === "idle" && s.newToasts === 0;
      ok = ok && good; out.push(`${name}：nomatch 後「${mid}」、end 後「${s.msg}」、訊息紀錄 ${ml.length} 則`);
    }
    return { ok, note: out.join("；") };
  });
  await R.check("TC-59-03", "AC-59-03、AC-60-04", async () => {
    const out = []; let ok = true;
    for (const sp of [false, true]) for (const t of ["", "   ", "..."]) {
      const s = await once(`${sp ? "r.emitSpeechStart(); " : ""}r.emitResult(${J(t)}); r.emitEnd();`);
      const noLabel = !s.panelText.includes("辨識文字") && !s.score && s.rows.length === 0;
      const good = s.msg === TXT.heard && noLabel && s.status === "idle" && s.bars === "00000";
      ok = ok && good; out.push(`${sp ? "有" : "無"} speechstart ${J(t)} → 「${s.msg}」、分數區=${s.score}、「辨識文字」標籤=${s.panelText.includes("辨識文字")}`);
    }
    return { ok, note: out.join("；") };
  });
  await R.check("TC-59-04", "AC-59-04", async () => {
    const s = await once(`r.emitSpeechStart(); r.emitError("no-speech"); r.emitEnd();`);
    return { ok: s.msg === TXT.heard && !s.score && s.status === "idle", note: `speechstart → error no-speech → end：${S(s)}` };
  });
  await R.check("TC-59-05", "AC-59-05、E-162", async () => {
    const out = []; let ok = true;
    for (const [name, js] of [["(a) error no-speech → end", `r.emitError("no-speech"); r.emitEnd();`], ["(b) 無錯誤 end", `r.emitEnd();`], ["(c) soundstart → end", `r.emitSoundStart(); r.emitEnd();`]]) {
      const s = await once(js); const ml = await msgLog();
      const good = s.msg === TXT.noSpeech && !s.score && s.status === "idle" && s.bars === "00000" && ml.length === 1;
      ok = ok && good; out.push(`${name}：「${s.msg}」`);
    }
    return { ok, note: out.join("；") + "（聆聽中 = 已確認開始收音）" };
  });
  await R.check("TC-59-06", "AC-59-06、MS-6", async () => {
    const out = []; let ok = true;
    let s = await once(`r.emitSpeechStart(); r.emitResult("Latency"); r.emitEnd();`); ok = ok && s.score && !s.msg; out.push(`(a) 非空文字 → ${s.badge}${s.light}、訊息「${s.msg}」`);
    await toListening(p); await emit(p, `r.emitSpeechStart()`); await p.click(".fc-front .sp-mic"); await sleep(80); s = await st(p); ok = ok && s.status === "idle" && !s.msg; out.push(`(b) 再按停止 → ${S(s)}`);
    await toListening(p); await emit(p, `r.emitSpeechStart()`); await p.click(".fc-next"); await sleep(80); s = await st(p); ok = ok && s.status === "idle" && !s.msg; out.push(`(b) 換卡 → ${S(s)}`);
    await gotoWord(p, "Latency");
    for (const [code, exp] of [["not-allowed", "需要麥克風權限"], ["network", "語音辨識需要網路連線"], ["audio-capture", "找不到麥克風裝置"]]) {
      s = await once(`r.emitSpeechStart(); r.emitError(${J(code)}); r.emitEnd();`); const good = s.msg.startsWith(exp) && !s.msg.includes(TXT.heard) && !s.score; ok = ok && good; out.push(`(c) speechstart → ${code} → 「${s.msg.slice(0, 16)}」`);
    }
    // 每次新的按下重新判定，不沿用前一次的語音紀錄
    s = await once(`r.emitSpeechStart(); r.emitEnd();`); const s2 = await once(`r.emitEnd();`);
    ok = ok && s.msg === TXT.heard && s2.msg === TXT.noSpeech; out.push(`前一次有 speechstart（「${s.msg}」），下一次只有 end → 「${s2.msg}」`);
    return { ok, note: out.join("；") };
  });
  await R.check("TC-59-07", "AC-59-07、AC-30-04（v0.20 分流提示）", async () => {
    const raw0 = await lsRaw(p);
    const bk0 = await p.ev(`EMT.store.actions.exportBackup().json`);
    const out = [];
    let s = await once(`r.emitSpeechStart(); r.emitEnd();`); out.push(`「${s.msg}」`);
    const raw1 = await lsRaw(p); const d1 = JSON.parse(raw1).data;
    const ms = await clickUntil(p, `!s.msg`); const a = await st(p); await p.click(".fc-front .sp-mic"); await sleep(50); // 再按 → 清除
    s = await once(`r.emitEnd();`); out.push(`「${s.msg}」`);
    const rawBeforeNext = await lsRaw(p); const bk1 = await p.ev(`EMT.store.actions.exportBackup().json`);
    await p.click(".fc-next"); await sleep(80); const b = await st(p); // 換卡 → 清除（換卡本身會寫 flashcardPosition，AC-44，另比對其餘欄位）
    const raw2 = await lsRaw(p);
    const strip = (x) => { const o = JSON.parse(x); delete o.exportedAt; delete o.savedAt; return JSON.stringify(o); };
    const noPos = (x) => { const o = JSON.parse(x); delete o.savedAt; delete o.data.flashcardPosition; return JSON.stringify(o); };
    const d0 = JSON.parse(raw0).data;
    const ok = raw1 === raw0 && rawBeforeNext === raw0 && strip(bk1) === strip(bk0) && noPos(raw2) === noPos(raw0)
      && J(d1.todayLearned) === J(d0.todayLearned) && J(d1.streak) === J(d0.streak) && J(d1.masteredWordKeys) === J(d0.masteredWordKeys) && !a.msg && ms <= 100 && !b.msg;
    return { ok, note: `${out.join("、")} 顯示後：localStorage 位元組不變=${raw1 === raw0 && rawBeforeNext === raw0}、匯出備份（去時間欄）不變=${strip(bk1) === strip(bk0)}；換卡後除 flashcardPosition 外不變=${noPos(raw2) === noPos(raw0)}；今日已學 ${d1.todayLearned.wordKeys.length}（前 ${d0.todayLearned.wordKeys.length}）、打卡 ${d1.streak.days}（前 ${d0.streak.days}）、掌握 ${d1.masteredWordKeys.length}；再按 ${ms} ms 內清除=${!a.msg}；換卡清除=${!b.msg}` };
  });
}

// ═════════ 6. US-60 辨識文字 ═════════
{
  const p = await open();
  const XSS1 = "<img src=x onerror=alert(1)>", XSS2 = "&lt;b&gt;";
  await addWords(p, ["imgsrcxonerroralert1", "imgsrcxonerroralert1abc", "ltbgt", "qauniquetext", "sitting"]);
  await R.check("TC-60-01", "AC-60-01、AC-60-02、AC-08-06～AC-08-08（v0.20）", async () => {
    const out = []; let ok = true;
    for (const [w, rec, light, rows] of [["latency", "Latency.", "綠燈", ["辨識文字"]], ["address", "adress", "黃燈", ["辨識文字"]], ["sitting", "kitten", "紅燈", ["辨識文字", "目標文字"]]]) {
      await gotoWord(p, w === "latency" ? "Latency" : w); const s = await scoreWith(p, rec);
      const order = await p.ev(`[...document.querySelector(".fc-front .sp-result").children].filter((e) => !e.hidden && e.getClientRects().length).map((e) => e.className.split(" ")[0])`);
      const title = await p.ev(`document.querySelector(".fc-front .sp-result__title").textContent`); const note = await p.ev(`document.querySelector(".fc-front .sp-result__note").textContent`);
      const good = s.light === light && J(s.rows.map((x) => x.l)) === J(rows) && s.rows[0].v === rec && (light !== "紅燈" || s.rows[1].v === (w === "latency" ? "Latency" : w)) && s.rows.every((x) => x.lang === "en" && x.kids === 0)
        && title === "辨識吻合度" && note === "此分數比對的是語音辨識出的文字，不代表音素層級的發音準確度" && !s.resultText.includes("目標文字") === (light !== "紅燈");
      ok = ok && good; out.push(`${w} ← ${J(rec)}：${s.badge} ${s.light}、列 ${J(s.rows.map((x) => x.l + "=" + x.v))}、lang ${s.rows.map((x) => x.lang).join("/")}、子元素順序 ${order.join(" > ")}`);
    }
    return { ok, note: out.join("；") };
  });
  await R.check("TC-60-01o", "AC-60-01（順序：分數與燈號 → 提示 → 文字列 → 說明）", async () => {
    await gotoWord(p, "address"); await scoreWith(p, "adress");
    const pos = await p.ev(`(() => { const r = document.querySelector(".fc-front .sp-result"); const y = (sel) => { const e = r.querySelector(sel); return e ? e.getBoundingClientRect().top : null; }; const all = [...r.querySelectorAll("*")]; const idx = (sel) => all.indexOf(r.querySelector(sel));
      return { title: idx(".sp-result__title"), badge: idx(".sp-result__badge"), tip: all.findIndex((e) => e.textContent === "放慢速度或重聽 0.75x 示範"), rows: idx(".sp-compare"), note: idx(".sp-result__note"), yBadge: y(".sp-result__badge"), yRows: y(".sp-compare"), yNote: y(".sp-result__note") }; })()`);
    const ok = pos.title < pos.badge && pos.badge < pos.tip && pos.tip < pos.rows && pos.rows < pos.note && pos.yBadge < pos.yRows && pos.yRows < pos.yNote;
    return { ok, note: `DOM 順序 標題 ${pos.title} < 分數 ${pos.badge} < 提示 ${pos.tip} < 文字列 ${pos.rows} < 說明 ${pos.note}；畫面 y ${pos.yBadge.toFixed(0)} < ${pos.yRows.toFixed(0)} < ${pos.yNote.toFixed(0)}` };
  });
  await R.check("TC-60-03", "AC-60-03、E-165、RT-4", async () => {
    const out = []; let ok = true;
    const BAN = ["偵測到", "語言", "英文", "中文", "你說的是"];
    for (const t of ["hello world", "你好", "12345", "Latency"]) {
      await gotoWord(p, "Latency"); const s = await scoreWith(p, t);
      const fixed = s.resultText.replace(t, "");
      const hit = BAN.filter((b) => fixed.includes(b));
      const note = await p.ev(`document.querySelector(".fc-front .sp-result__note").textContent`);
      const good = s.score && s.rows[0].v === t && hit.length === 0 && note === "此分數比對的是語音辨識出的文字，不代表音素層級的發音準確度";
      ok = ok && good; out.push(`${J(t)} → ${s.badge}${s.light}、辨識文字「${s.rows[0].v}」、禁用字樣 ${J(hit)}`);
    }
    return { ok, note: out.join("；") };
  });
  await R.check("TC-60-04", "AC-60-04", async () => {
    const out = []; let ok = true;
    for (const [name, js] of [["speechstart+end", `r.emitSpeechStart(); r.emitEnd();`], ["nomatch", `r.emitNomatch(); r.emitEnd();`], ["空白結果", `r.emitResult("  "); r.emitEnd();`], ["no-speech", `r.emitError("no-speech"); r.emitEnd();`], ["end", `r.emitEnd();`]]) {
      await gotoWord(p, "Latency"); await scoreWith(p, "Latency"); // 先有分數，確認會被清掉
      await toListening(p); await emit(p, js); await sleep(60); const s = await st(p);
      const resEl = await p.ev(`(() => { const r = document.querySelector(".fc-front .sp-result"); return r ? { hidden: r.hidden || !r.getClientRects().length, dt: r.querySelectorAll("dt").length } : null; })()`);
      const good = !s.score && !s.panelText.includes("辨識文字") && (!resEl || resEl.hidden) && (s.msg === TXT.heard || s.msg === TXT.noSpeech);
      ok = ok && good; out.push(`${name}：分數區隱藏=${!resEl || resEl.hidden}、「辨識文字」=${s.panelText.includes("辨識文字")}、訊息「${s.msg}」`);
    }
    return { ok, note: out.join("；") };
  });
  await R.check("TC-60-05", "AC-60-05、E-164、RT-3", async () => {
    const out = []; let ok = true;
    const req0 = p.log.requests.length; const dlg0 = p.log.dialogs.length;
    for (const [w, t, light] of [["imgsrcxonerroralert1", XSS1, "綠燈"], ["imgsrcxonerroralert1abc", XSS1, "黃燈"], ["ltbgt", XSS2, "綠燈"], ["imgsrcxonerroralert1", XSS2, "紅燈"]]) {
      await gotoWord(p, w); const s = await scoreWith(p, t); await sleep(150);
      const imgs = await p.ev(`document.querySelectorAll(".fc-front .sp-result img, .fc-front .sp-result b").length`);
      const good = s.light === light && s.rows[0].v === t && s.rows.every((x) => x.kids === 0) && imgs === 0;
      ok = ok && good; out.push(`${w} ← ${J(t)}：${s.badge}${s.light}、值逐字=${s.rows[0].v === t}、子元素 ${s.rows.map((x) => x.kids).join("/")}、img/b ${imgs}`);
    }
    const src = fs.readFileSync(path.join(ROOT, "src/app/views/speech-panel.js"), "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
    const bad = (src.match(/innerHTML|insertAdjacentHTML|outerHTML|document\.write/g) || []);
    const reqs = p.log.requests.slice(req0).filter((r) => !/^(file|data|blob):/.test(r.url));
    ok = ok && bad.length === 0 && reqs.length === 0 && p.log.dialogs.length === dlg0 && p.log.exceptions.length === 0;
    return { ok, note: `${out.join("；")}；alert 對話框 ${p.log.dialogs.length - dlg0}、非本機請求 ${reqs.length}；speech-panel.js（去註解）HTML 寫入 API ${bad.length} 處` };
  });
  await R.check("TC-60-07", "AC-60-07、AC-21-03、AC-24-02", async () => {
    const out = []; let ok = true;
    await gotoWord(p, "qauniquetext"); const tl0 = (await p.ev(`EMT.store.getState().data.todayLearned.wordKeys.slice()`));
    let s = await scoreWith(p, "QAuniquetext!"); ok = ok && s.score && s.rows[0].v === "QAuniquetext!"; out.push(`評分 ${s.badge}${s.light}、辨識文字「${s.rows[0].v}」`);
    const tl1 = await p.ev(`EMT.store.getState().data.todayLearned.wordKeys.slice()`);
    await p.click(".fc-next"); await sleep(80); s = await st(p); ok = ok && !s.score; out.push(`換卡 → 分數區=${s.score}`);
    await p.click(".fc-prev"); await sleep(80); s = await st(p); ok = ok && !s.score; out.push(`回上一張 → 不殘留=${!s.score}`);
    // 「依既有規則」：1.3.0 與 1.3.1 實測相同 —— 切換模式往返、離開頁面再回來時仍在同一張卡，分數保留；換到另一張卡才清除（不殘留到另一張卡）
    const nextClear = async () => { await p.click(".fc-next"); await sleep(80); const x = await st(p); await p.click(".fc-prev"); await sleep(80); return !x.score; };
    await scoreWith(p, "QAuniquetext!"); await p.click(".fc-mode-btn"); await sleep(120); await p.click(".fc-mode-btn"); await sleep(120); s = await st(p); let nc = await nextClear(); ok = ok && nc; out.push(`切換模式往返 → 同一張卡分數區=${s.score}（同 1.3.0）、換卡後清除=${nc}`);
    await scoreWith(p, "QAuniquetext!"); await p.go("dashboard"); await p.go("flashcards"); await sleep(80); s = await st(p); nc = await nextClear(); ok = ok && nc; out.push(`離開頁面再回來 → 同一張卡分數區=${s.score}（同 1.3.0）、換卡後清除=${nc}`);
    await scoreWith(p, "QAuniquetext!"); await p.click(".fc-front .sp-mic"); await sleep(40); s = await st(p); ok = ok && !s.score && s.status === "preparing"; out.push(`再按麥克風 → ${s.status}、分數區=${s.score}`);
    await p.click(".fc-front .sp-mic"); await sleep(40);
    await scoreWith(p, "QAuniquetext!");
    const raw = await lsRaw(p); const bk = await p.ev(`EMT.store.actions.exportBackup().json`);
    await p.reload(); await p.go("flashcards"); s = await st(p);
    const leak = raw.includes("QAuniquetext!") || bk.includes("QAuniquetext!");
    ok = ok && !leak && !s.score && tl1.length === tl0.length + 1; out.push(`localStorage／備份含辨識文字=${leak}；重新載入後分數區=${s.score}；評分計入今日已學 ${tl0.length}→${tl1.length}（recordSttScored 不變）`);
    return { ok, note: out.join("；") };
  });
}

// ═════════ 7. AC-58-13、AC-60-06 版面（375、768、1366；一般與減少動態）════════
{
  const sizes = [[375, 667], [1366, 768]];
  for (const reduced of [false, true]) for (const [w, h] of sizes) {
    const p = await open({ w, h, reduced });
    await R.check(`TC-58-13${reduced ? "m" : ""}-${w}`, `AC-58-13${reduced ? " (b)、AC-31-03、AC-33-08（v0.20）、E-66" : " (a)"}（${w}px）`, async () => {
      await gotoWord(p, "Latency");
      const M = `(() => { const b = document.querySelector(".fc-front .sp-mic"); const t = b.querySelector(".sp-mic__text") || b; const m = document.querySelector(".fc-front .sp-meter"); const cs = getComputedStyle(b); const d = b.querySelector(".sp-mic__dot"); const ds = d ? getComputedStyle(d) : null; const rr = (e) => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.width, r.height].map((v) => +v.toFixed(2)).join(","); };
        const eff = window.__qaL.effective(t); return { btn: rr(b), meter: rr(m), bg: cs.backgroundColor, color: cs.color, border: cs.borderTopColor, anim: cs.animationName, trans: cs.transitionDuration, dotAnim: ds ? ds.animationName : "", dotBg: ds ? ds.backgroundColor : "", text: t.textContent,
          clip: t.scrollWidth > t.clientWidth + 0.5 || b.scrollWidth > b.clientWidth + 0.5, hscroll: document.documentElement.scrollWidth > document.documentElement.clientWidth, ratio: +window.__qaL.ratio(eff.fg, eff.bg).toFixed(2),
          lightRed: getComputedStyle(document.documentElement).getPropertyValue("--light-red").trim() }; })()`;
      const hex = (c) => p.ev(`window.__qaL.hex(${J(c)})`);
      await p.ev(`document.querySelector(".fc-front .sp-mic").scrollIntoView({ block: "center" })`); await sleep(500); // 等換卡動畫結束（一般設定下卡片滑入約 240 ms）
      const idle = await p.ev(M);
      await toAwaiting(p); const prep = await p.ev(M); const prepSt = await st(p);
      await emit(p, `r.emitAudioStart()`); await sleep(500); const lis = await p.ev(M);
      await emit(p, `r.emitResult("Latency"); r.emitEnd();`); await sleep(60);
      const prepCols = [await hex(prep.bg), await hex(prep.color), await hex(prep.border), await hex(prep.dotBg)];
      const lisCols = [await hex(lis.bg), await hex(lis.color), await hex(lis.border)];
      const redHex = (prep.lightRed || "").toLowerCase();
      const diff = prep.bg !== lis.bg || prep.color !== lis.color;
      // 鍵盤（Enter）與觸控
      await p.ev(`document.querySelector(".fc-front .sp-mic").focus()`); await enter(p); await sleep(60); const kb = await st(p); await enter(p); await sleep(60); const kb2 = await st(p);
      await p.ev(`document.querySelector(".fc-front .sp-mic").focus()`); await p.key(" ", "Space", 32); await sleep(60); const sp1 = await st(p); await p.key(" ", "Space", 32); await sleep(60);
      let tap = { status: "（> 640px 未測觸控）" }; if (w <= 640) { await p.tap(".fc-front .sp-mic"); await sleep(60); tap = await st(p); await p.tap(".fc-front .sp-mic"); await sleep(60); }
      const animOk = prep.anim === "none" && prep.dotAnim === "none" && /^0s(,\s*0s)*$/.test(prep.trans) && (!reduced || (lis.anim === "none" || /^0s/.test(lis.anim)));
      const ok = prepSt.text === "準備中" && prep.btn === lis.btn && prep.meter === lis.meter && idle.btn === prep.btn && diff && !prepCols.includes(redHex) && !prepCols.some((c) => c === lisCols[0] && c !== "#ffffff")
        && animOk && !prep.clip && !lis.clip && !prep.hscroll && prep.ratio >= 4.5 && kb.status === "preparing" && kb2.status === "idle" && sp1.status === "preparing" && (w > 640 || tap.status === "preparing");
      return { ok, note: `座標（左,上,寬,高）待機 ${idle.btn}／準備中 ${prep.btn}／聆聽中 ${lis.btn}、收音條 ${prep.meter} vs ${lis.meter}；準備中 底 ${prepCols[0]} 字 ${prepCols[1]} 框 ${prepCols[2]} 圓點 ${prepCols[3]}、聆聽中 底 ${lisCols[0]} 字 ${lisCols[1]} 框 ${lisCols[2]}、--light-red ${redHex}；準備中 animation ${prep.anim}／圓點 ${prep.dotAnim}、transition ${prep.trans}；聆聽中 animation ${lis.anim}；文字裁切 ${prep.clip}/${lis.clip}、水平捲軸 ${prep.hscroll}；準備中文字對比 ${prep.ratio}；Enter → ${kb.status} → ${kb2.status}、空白鍵 → ${sp1.status}、觸控 → ${tap.status}` };
    });
    await p.close();
  }
}
{
  const LONG20 = "The quick brown fox jumps over the lazy dog while seven bright students review difficult academic vocabulary every single morning";
  const NOSP60 = "abcdefghij".repeat(6);
  const texts = [["comply with", "comply with", "complied with", "sitting"], [LONG20, LONG20, LONG20.replace("quick brown fox", "slow red cat").replace("every single morning", "on rainy days"), "sitting"], [NOSP60, NOSP60, NOSP60.slice(0, 48) + "zzzzzzzzzzzz", "sitting"]];
  for (const reduced of [false, true]) for (const [w, h] of reduced ? [[375, 667]] : [[375, 667], [768, 1024], [1366, 768]]) {
    const p = await open({ w, h, reduced });
    await addWords(p, ["comply with", LONG20, NOSP60, "sitting"]);
    await R.check(`TC-60-06${reduced ? "m" : ""}-${w}`, `AC-60-06${reduced ? " (b)" : ""}、E-164（${w}px）`, async () => {
      const out = []; let ok = true; let scrollFlip = 0; // 分數出現前不可捲動的情況數（之後可捲動與否見各列）
      for (const [label, target, yellowRec, redTarget] of texts) {
        for (const [light, tgt, rec] of [["綠燈", target, target], ["黃燈", target, yellowRec], ["紅燈", redTarget, target]]) {
          await gotoWord(p, tgt); await p.ev(`window.scrollTo(0, 0)`); await sleep(reduced ? 60 : 500); // 等換卡動畫結束再量「分數出現前」
          const rect = `(() => { const r = (s) => { const e = document.querySelector(s); if (!e) return ""; const b = e.getBoundingClientRect(); return [b.left, b.top + scrollY, b.width, b.height].map((v) => +v.toFixed(1)).join(","); };
            return [...document.querySelectorAll(".fc-front .sp-tts__btn")].map((e) => { const b = e.getBoundingClientRect(); return [b.left, b.top + scrollY, b.width].map((v) => +v.toFixed(1)).join(","); }).join("|") + "#" + r(".fc-front .sp-mic") + "#" + r(".fc-front .sp-meter"); })()`;
          let before = await p.ev(rect); for (let q = 0; q < 20; q++) { await sleep(100); const again = await p.ev(rect); if (again === before) break; before = again; } // 等版面穩定（換卡動畫）
          const sc0 = await p.ev(`document.documentElement.scrollHeight > innerHeight`);
          await toListening(p); await emit(p, `r.emitResult(${J(rec)}); r.emitEnd();`); await sleep(120);
          const s = await st(p); const after = await p.ev(rect); scrollFlip += sc0 === false ? 1 : 0;
          const m = await p.ev(`(() => { const r = document.querySelector(".fc-front .sp-result"); const dds = [...r.querySelectorAll(".sp-compare__value")]; const nav = document.getElementById("app-nav"); const navTop = nav && getComputedStyle(nav).position === "fixed" ? nav.getBoundingClientRect().top : innerHeight;
              const vis = (sel) => { const e = document.querySelector(sel); if (!e) return "無"; e.scrollIntoView({ block: "nearest" }); const b = e.getBoundingClientRect(); return b.top >= -0.5 && b.bottom <= Math.min(innerHeight, navTop) + 0.5 ? "可見" : "被遮 " + b.bottom.toFixed(0) + ">" + navTop.toFixed(0); };
              const cs = dds.map((d) => window.__qaL.ratio(window.__qaL.effective(d).fg, window.__qaL.effective(d).bg)); const ls = [...r.querySelectorAll(".sp-compare__label")].map((d) => window.__qaL.ratio(window.__qaL.effective(d).fg, window.__qaL.effective(d).bg));
              const anims = [r, ...r.querySelectorAll("*")].map((e) => getComputedStyle(e).animationName).filter((a) => a !== "none");
              return { gutter: getComputedStyle(document.documentElement).scrollbarGutter, scrollable: document.documentElement.scrollHeight > innerHeight, hs: document.documentElement.scrollWidth > document.documentElement.clientWidth, over: dds.some((d) => d.scrollWidth > d.clientWidth + 0.5 || d.getBoundingClientRect().right > r.getBoundingClientRect().right + 0.5), full: dds.map((d) => d.textContent).join("|"), wrap: getComputedStyle(dds[0]).overflowWrap, ws: getComputedStyle(dds[0]).whiteSpace,
                lines: dds.map((d) => Math.round(d.getBoundingClientRect().height / parseFloat(getComputedStyle(d).lineHeight || 20))).join("/"), flip: vis(".fc-flip"), prev: vis(".fc-prev"), next: vis(".fc-next"), minC: Math.min(...cs, ...ls), anims }; })()`);
          // 第 11 輪（§7.29.5）：getComputedStyle(html).scrollbarGutter === "stable"；位移一律以同一建置內前後座標判定（PG 回饋 (c)：不用 innerWidth−clientWidth）
          const good = s.light === light && s.rows[0].v === rec && !m.hs && !m.over && before === after && m.gutter === "stable" && m.flip === "可見" && m.prev === "可見" && m.next === "可見" && m.minC >= 4.5 && (!reduced || m.anims.length === 0);
          ok = ok && good; out.push(`${label.slice(0, 12)}${label.length > 12 ? "…" : ""} ${s.light}${s.light === light ? "" : "（預期 " + light + "）"}：水平捲軸 ${m.hs}、溢出 ${m.over}、行數 ${m.lines}、上方座標不變 ${before === after}、gutter ${m.gutter}、分數後可捲動 ${m.scrollable}、翻面/上一張/下一張 ${m.flip}/${m.prev}/${m.next}、最低對比 ${m.minC.toFixed(2)}${reduced ? "、動畫 " + J(m.anims) : ""}${before === after ? "" : "（前 " + before + " 後 " + after + "）"}${good ? "" : "（不符）"}`);
        }
      }
      return { ok, note: `overflow-wrap anywhere：${out.join("；")}；分數出現前不可捲動 ${scrollFlip} / 9 種情況` };
    });
    await p.close();
  }
}

// ═════════ 8. 本次載入第 1 次按下（AC-58-01 ≤ 100 ms；Chrome 與 Edge 各 3 次新載入）════════
// 第 11 輪（BUG-007 複驗，architecture v0.16 §7.28.6）：量測 rAF 在 click 之前登錄、rAF → setTimeout(0) 取畫出時間；
// 另判處理器 t1 − t0 ≤ 16 ms、t1 時 data-status 已是 preparing、getUserMedia 在畫出之後才呼叫（t1、t2 時 0 次，之後 1 次）。
{
  const rows = []; let ok = true; const acMs = [];
  const cancel = async (p) => { await p.ev(`document.querySelector(".fc-front .sp-mic").click()`); await sleep(80); };
  const fresh = async (browser) => {
    const p = await launch({ browser });
    for (const s of [TOAST_RECORDER, fakeTts("ok"), fakeStt("ok", { audioStart: true, autoAudioStartMs: null }), fakeMic("ok", -5), GUM_HOLD, AC_LOG]) await p.addInitScript(s);
    await p.viewport(1366, 900); await p.goto(); await seed(p, stateRecord(725, { sttNoticeAcknowledged: true }));
    await p.ev(`window.__qaHold.on = true`); // 只量產品：getUserMedia 擱置，替身不建立音訊
    await p.go("flashcards"); await sleep(300);
    return p;
  };
  const F = (x) => `${x.sync}／${x.attr}／${x.frame}（t1 ${x.statusAtT1}、gUM ${x.gumT1}/${x.gumPaint}/${x.gumLater}）`;
  for (const browser of ["chrome", "edge"]) for (let k = 0; k < 3; k++) {
    const p = await fresh(browser);
    const a = await firstPress(p); await cancel(p);
    const b = await firstPress(p); await cancel(p);
    await p.go("dashboard"); await sleep(1200); await p.go("flashcards"); await sleep(300);
    const c = await firstPress(p); await cancel(p);
    const ac = await p.ev(`(window.__qaAC ? window.__qaAC.list : []).map((x) => x.ms)`); acMs.push(`${browser}#${k + 1} ${ac.join("/")}`);
    const base = (x) => x.frame <= 100 && x.sync <= 16 && x.statusAtT1 === "preparing" && x.text === TXT.prep && x.gumT1 === 0;
    const good = [a, b, c].every(base) && a.gumPaint === 0 && a.gumLater === 1 && c.gumPaint === 0 && c.gumLater === 1 && b.gumLater === 0;
    ok = ok && good;
    rows.push(`${browser}#${k + 1}：第 1 次 ${F(a)}；第 2 次 ${F(b)}；離開再回來 ${F(c)}${good ? "" : "（不符）"}`);
    await p.close();
  }
  R[ok ? "pass" : "fail"]("TC-58-01f", "AC-58-01（本次載入第 1 次按下 ≤ 100 ms；BUG-007）", rows.join("；") + `（ms：處理器 t1−t0／狀態屬性／畫出 t2−t0；gUM = getUserMedia 呼叫數於 t1／t2／t2+250 ms。第 2 次沿用擱置中的取得，故 0。產品 new AudioContext 耗時（第 1 次／離開再回來）${acMs.join("、")} ms，發生在畫出之後）`);
}
// 4 倍 CPU 降速（§7.28.6「降速」）：離開單字卡頁再回來後第 1 次，Chrome、Edge 各 16 次；另記本次載入第 1 次 3 次（參考）
{
  const rows = []; let ok = true; const all = {};
  for (const browser of ["chrome", "edge"]) {
    const p = await launch({ browser });
    for (const s of [TOAST_RECORDER, fakeTts("ok"), fakeStt("ok", { audioStart: true, autoAudioStartMs: null }), fakeMic("ok", -5), GUM_HOLD, AC_LOG]) await p.addInitScript(s);
    await p.viewport(1366, 900); await p.goto(); await seed(p, stateRecord(725, { sttNoticeAcknowledged: true }));
    const back = [], load = [];
    for (let k = 0; k < 3; k++) {
      if (k > 0) await p.reload();
      await p.ev(`window.__qaHold.on = true`); await p.go("flashcards"); await sleep(300);
      await p.send("Emulation.setCPUThrottlingRate", { rate: 4 }); const x = await firstPress(p); await p.send("Emulation.setCPUThrottlingRate", { rate: 1 });
      load.push(x); await p.ev(`document.querySelector(".fc-front .sp-mic").click()`); await sleep(100);
    }
    for (let k = 0; k < 16; k++) {
      await p.go("dashboard"); await sleep(1200); await p.go("flashcards"); await sleep(300);
      await p.send("Emulation.setCPUThrottlingRate", { rate: 4 }); const x = await firstPress(p); await p.send("Emulation.setCPUThrottlingRate", { rate: 1 });
      back.push(x); await p.ev(`document.querySelector(".fc-front .sp-mic").click()`); await sleep(100);
    }
    const okB = back.every((x) => x.frame <= 100 && x.statusAtT1 === "preparing" && x.gumT1 === 0);
    ok = ok && okB; all[browser] = { back, load };
    const fr = (a) => a.map((x) => x.frame); const mx = (a) => Math.max(...a);
    rows.push(`${browser}：離開再回來後第 1 次 ${back.filter((x) => x.frame <= 100).length}/16 ≤ 100 ms（畫出 ${fr(back).join(",")}；最大 ${mx(fr(back))}；處理器最大 ${mx(back.map((x) => x.sync))}）；本次載入第 1 次（參考）畫出 ${fr(load).join(",")}、處理器 ${load.map((x) => x.sync).join(",")}`);
    await p.close();
  }
  fs.mkdirSync(path.join(ROOT, "tests/results/diag"), { recursive: true }); fs.writeFileSync(path.join(ROOT, "tests/results/diag/r11-first-press-4x.json"), J(all));
  R[ok ? "pass" : "fail"]("TC-58-01g", "AC-58-01（4 倍 CPU 降速；BUG-007 §21.5 的 2/16 超過）", rows.join("；") + "（ms；本機無頭、非基準環境）");
}
// 延後期間取消（§7.28.3、AC-58-04 (a)、AC-58-05）：同一個任務內按下再按 → getUserMedia 0 次、未建立 AudioContext、回待機無訊息；之後再按只取得 1 次
{
  const out = []; let ok = true;
  for (const browser of ["chrome", "edge"]) {
    const p = await launch({ browser });
    for (const s of [TOAST_RECORDER, fakeTts("ok"), fakeStt("ok", { audioStart: true, autoAudioStartMs: null }), fakeMic("ok", -5), GUM_HOLD, AC_LOG]) await p.addInitScript(s);
    await p.viewport(1366, 900); await p.goto(); await seed(p, stateRecord(725, { sttNoticeAcknowledged: true }));
    await p.ev(`window.__qaHold.on = true`); await p.go("flashcards"); await sleep(300);
    const t0 = await st(p);
    const r = await p.ev(`(async () => { const b = document.querySelector(".fc-front .sp-mic"); const H = window.__qaHold; const g0 = H.calls; b.click(); const mid = b.dataset.status; b.click(); const s1 = b.dataset.status;
      await new Promise((x) => setTimeout(x, 300)); return { mid, s1, s2: b.dataset.status, gum: H.calls - g0, ac: (window.__qaAC ? window.__qaAC.list.length : -1) }; })()`);
    const a = await st(p);
    const r2 = await p.ev(`(async () => { const b = document.querySelector(".fc-front .sp-mic"); const H = window.__qaHold; const g0 = H.calls; b.click(); const g1 = H.calls; await new Promise((x) => setTimeout(x, 300)); return { s: b.dataset.status, g1: g1 - g0, g2: H.calls - g0, ac: window.__qaAC.list.length }; })()`);
    await p.ev(`document.querySelector(".fc-front .sp-mic").click()`); await sleep(80);
    const good = r.mid === "preparing" && r.s1 === "idle" && r.s2 === "idle" && r.gum === 0 && r.ac === 0 && !a.msg && !a.score && a.toasts === t0.toasts && a.bars === "00000" && r2.s === "preparing" && r2.g1 === 0 && r2.g2 === 1 && r2.ac === 1 && p.log.exceptions.length === 0;
    ok = ok && good; out.push(`${browser}：按下 → ${r.mid} → 同一任務再按 → ${r.s1}，300 ms 後 ${r.s2}、getUserMedia ${r.gum} 次、AudioContext ${r.ac} 個、訊息「${a.msg}」、Toast 增 ${a.toasts - t0.toasts}；之後再按 → ${r2.s}，處理器結束時 getUserMedia ${r2.g1}、300 ms 後 ${r2.g2}、AudioContext ${r2.ac}`);
    await p.close();
  }
  R[ok ? "pass" : "fail"]("TC-58-04c", "AC-58-04 (a)、AC-58-05（延後期間取消：不呼叫 getUserMedia；§7.28.3）", out.join("；"));
}
// AudioContext 狀態與收音條（§7.28.4、§7.28.6、AC-33-03）：瀏覽器假裝置（--use-fake-device-for-media-stream、--use-fake-ui-for-media-stream），
// 不加 --autoplay-policy=no-user-gesture-required（驗真實自動播放政策）；不用 fakeMic，產品經真實 getUserMedia 取得假音源；以 CDP 滑鼠事件點按（使用者手勢）
{
  const out = []; let ok = true;
  for (const browser of ["chrome", "edge"]) for (const how of ["本次載入第 1 次", "離開再回來後第 1 次"]) {
    const p = await launch({ browser, autoplayFlag: false, args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] });
    for (const s of [TOAST_RECORDER, fakeTts("ok"), fakeStt("ok", { audioStart: true, autoAudioStartMs: 150 }), AC_LOG]) await p.addInitScript(s);
    await p.viewport(1366, 900); await p.goto(); await seed(p, stateRecord(725, { sttNoticeAcknowledged: true }));
    await p.go("flashcards"); await sleep(300);
    if (how !== "本次載入第 1 次") {
      await p.click(".fc-front .sp-mic"); for (let i = 0; i < 80; i++) { if ((await p.ev(`document.querySelector(".fc-front .sp-mic").dataset.status`)) === "listening") break; await sleep(25); }
      await p.ev(`(() => { const r = window.__qaStt.last; r.emitResult("Latency"); r.emitEnd(); })()`); await sleep(100);
      await p.go("dashboard"); await sleep(1200); await p.go("flashcards"); await sleep(300);
    }
    const n0 = await p.ev(`window.__qaAC.list.length`);
    await p.click(".fc-front .sp-mic");
    let stt = ""; for (let i = 0; i < 140; i++) { stt = await p.ev(`document.querySelector(".fc-front .sp-mic").dataset.status`); if (stt === "listening") break; await sleep(25); }
    let maxLit = 0; const samples = [];
    for (let i = 0; i < 40; i++) { const n = await p.ev(`[...document.querySelectorAll(".fc-front .sp-meter__bar")].filter((x) => x.classList.contains("is-on")).length`); samples.push(n); maxLit = Math.max(maxLit, n); await sleep(50); }
    const ac = await p.ev(`window.__qaAC.list.slice(${n0}).map((x) => ({ state0: x.state0, now: x.c.state, ms: x.ms }))`);
    const tracks = await p.ev(`EMT.services.mic.tracks().length`);
    await p.ev(`(() => { const r = window.__qaStt.last; if (r) { r.emitResult("Latency"); r.emitEnd(); } })()`); await sleep(80);
    const good = stt === "listening" && ac.length === 1 && ac[0].now === "running" && maxLit >= 1 && tracks >= 1 && p.log.exceptions.length === 0;
    ok = ok && good; out.push(`${browser} ${how}：${stt}、新 AudioContext ${ac.length} 個（建立時 ${ac.map((x) => x.state0).join("/")} → 聆聽中 ${ac.map((x) => x.now).join("/")}，建構 ${ac.map((x) => x.ms).join("/")} ms）、音軌 ${tracks}、收音條 2 秒內最多亮 ${maxLit} 格（取樣 ${samples.join("")}）`);
    await p.close();
  }
  R[ok ? "pass" : "fail"]("TC-33-03r", "AC-33-03、AC-58-01（§7.28.4：AudioContext 不在點按處理器內建立後仍為 running；收音條會亮）", out.join("；") + "（瀏覽器假音源；實機麥克風見 Q12 人工項）");
}

const exc = PAGES.flatMap((p) => p.log.exceptions);
const errs = PAGES.flatMap((p) => p.log.console.filter((c) => c.type === "error").map((c) => c.text));
R[exc.length === 0 ? "pass" : "fail"]("TC-X-sttflow", "（全套件）無未處理例外", `例外 ${exc.length}：${J(exc).slice(0, 300)}；console.error ${errs.length}：${J(errs).slice(0, 300)}`);
for (const p of PAGES) await p.close();
R.save(resultPath("e2e-stt-flow"));
console.log(`e2e-stt-flow：通過 ${R.results.filter((r) => r.result === "通過").length}、失敗 ${R.results.filter((r) => r.result === "失敗").length}`);
