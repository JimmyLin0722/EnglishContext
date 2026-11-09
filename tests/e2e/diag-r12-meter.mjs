// 診斷（第 12 輪）：收音條自進入聆聽中到第 1 格亮起的時間，比較「準備中收到 audiostart」與「準備中收到即時文字」、「聆聽中」（AC-62-01、AC-62-02、AC-33-03）
// 用法：node tests/e2e/diag-r12-meter.mjs [輪數]
import { launch, sleep } from "./lib/cdp.mjs";
import { TOAST_RECORDER, fakeTts, fakeStt, fakeMic } from "./lib/inits.mjs";
import { stateRecord, seed, injectTpl } from "./lib/state.mjs";
const N = Number(process.argv[2] || 4);
const out = [];
for (const as of [true, false]) {
  const p = await launch();
  for (const s of [TOAST_RECORDER, fakeTts("ok"), fakeStt("ok", { audioStart: as, autoAudioStartMs: null }), fakeMic("ok", -5)]) await p.addInitScript(s);
  await p.viewport(1366, 900); await p.goto(); await seed(p, stateRecord(725, { sttNoticeAcknowledged: true })); await p.go("customizer"); await injectTpl(p, "cs"); await p.go("flashcards"); await sleep(100);
  const lit = (js) => p.ev(`(async () => { const r = window.__qaStt.last; const t0 = performance.now(); ${js}; for (;;) { const on = [...document.querySelectorAll(".fc-front .sp-meter__bar")].some((x) => x.classList.contains("is-on")); if (on) return +(performance.now() - t0).toFixed(1); if (performance.now() - t0 > 3000) return -1; await new Promise((res) => setTimeout(res, 2)); } })()`);
  for (let k = 0; k < N; k++) for (const how of as ? ["audiostart", "interim", "soundstart"] : ["interim", "fallback"]) {
    await p.click(".fc-front .sp-mic");
    for (let i = 0; i < 60; i++) { const ph = await p.ev(`EMT.store.getState().runtime.speech.preparingPhase`); if (ph === "awaitingAudioStart" || ph === "fallbackWait") break; await sleep(20); }
    const ms = how === "audiostart" ? await lit(`r.emitAudioStart()`) : how === "soundstart" ? await lit(`r.emitSoundStart()`) : how === "interim" ? await lit(`r.emitInterim("ad")`) : await lit(``);
    out.push({ as, how, k, ms }); console.log(`替身${as ? "支援" : "不支援"} audiostart、${how}：${ms} ms 後第 1 格亮`);
    await p.ev(`(() => { const r = window.__qaStt.last; r.emitResult("Latency"); r.emitEnd(); })()`); await sleep(150);
  }
  await p.close();
}
const by = {}; for (const x of out) (by[(x.as ? "支援" : "不支援") + "-" + x.how] ||= []).push(x.ms);
console.log(JSON.stringify(by));
