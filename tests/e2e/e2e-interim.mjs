// QA E2E（第 12 輪新增，PRD v0.21 R-30）：US-62 聆聽中即時文字（AC-62-01～AC-62-11），以及 v0.21 修改的 AC-08-10、AC-30-04、AC-58-07、AC-59-01、AC-59-05。
// 依據：契約 v0.21 §14.6 IT-1～IT-10、MS-1 (2b)／(4)、V-STT-11～V-STT-17；architecture v0.17 §7.30、§7.30.8（T1～T8）、§10.14 Q13、Q16。
// 替身：tests/e2e/lib/inits.mjs fakeStt（V-STT-STUB，第 12 輪加 emitInterim，isFinal = false）。各區塊明確指定支援／不支援 audiostart、關閉自動 audiostart，
// 不受 QA_STT_AUDIOSTART 影響。真人語音（AC-62-12）與 NVDA 播報（AC-62-07 後半）不在本套件，列待人工。
// ≤ 100 ms 的量法同 test-plan §2.10：頁面內觸發事件到「條件成立後的下一個畫格」，含處理器同步耗時，不含 CDP 往返。
// 用法：node tests/e2e/e2e-interim.mjs（QA_BROWSER=edge 改用 Edge；QA_INTERIM_SKIP_PWA=1 略過部署目錄＋Service Worker 段）
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { launch, recorder, sleep, resultPath, ROOT, DIST } from "./lib/cdp.mjs";
import { TOAST_RECORDER, fakeTts, fakeStt, fakeMic } from "./lib/inits.mjs";
import { stateRecord, seed, KEY, injectTpl, V3_KEYS } from "./lib/state.mjs";
import { PROBE } from "./lib/layout-probe.mjs";

const R = recorder("e2e-interim");
const J = JSON.stringify;
const PAGES = [];
const T_READY = 5000, T_FALLBACK = 1500;
const TXT = {
  listen: "聆聽中", label: "聽到：",
  heard: "有收到聲音，但沒聽出英文單字，請再說一次", noSpeech: "未偵測到語音，請再試一次", noResp: "語音辨識沒有回應，請再試一次",
  noDevice: "找不到麥克風裝置", net: "語音辨識需要網路連線", perm: "需要麥克風權限", generic: "語音辨識發生錯誤，請稍後再試一次",
};
const MUTED = "rgb(91, 100, 114)";

async function open({ w = 1366, h = 900, as = true, reduced = false, db = -5, over = {} } = {}) {
  const p = await launch();
  for (const s of [TOAST_RECORDER, fakeTts("ok"), fakeStt("ok", { audioStart: as, autoAudioStartMs: null }), fakeMic("ok", db), PROBE]) await p.addInitScript(s);
  await p.viewport(w, h);
  if (reduced) await p.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await p.goto();
  await seed(p, stateRecord(725, { sttNoticeAcknowledged: true, ...over }));
  await p.go("customizer"); await injectTpl(p, "cs"); await sleep(80);
  await p.go("flashcards"); await sleep(80);
  PAGES.push(p);
  return p;
}
// 即時文字列與面板狀態（文件層級查詢：切換測驗模式後 .fc-front 可能不存在）
const LV = `(() => { const vis = (e) => !!e && !e.hidden && !e.closest("[hidden]") && e.getClientRects().length > 0 && getComputedStyle(e).display !== "none";
  const all = [...document.querySelectorAll(".sp-live")]; const l = all[0] || null; const f = document.querySelector(".fc-front");
  const b = f && f.querySelector(".sp-mic"); const m = f && f.querySelector(".sp-msg"); const r = f && f.querySelector(".sp-result");
  const lab = l && l.querySelector(".sp-live__label"), val = l && l.querySelector(".sp-live__text");
  const rows = vis(r) ? [...r.querySelectorAll(".sp-compare__row")].map((x) => ({ l: x.querySelector("dt").textContent, v: x.querySelector("dd").textContent })) : [];
  const sp = window.EMT ? EMT.store.getState().runtime.speech : {};
  return { n: all.length, shown: vis(l), label: lab ? lab.textContent : null, text: val ? val.textContent : null, lang: val ? val.getAttribute("lang") : null, kids: l ? l.children.length : -1, valKids: val ? val.children.length : -1, all: l ? l.textContent : "",
    status: b ? b.dataset.status : "(無面板)", phase: sp.preparingPhase || null, micText: b ? (b.querySelector(".sp-mic__text") || b).textContent : "",
    bars: f ? [...f.querySelectorAll(".sp-meter__bar")].map((x) => (x.classList.contains("is-on") ? 1 : 0)).join("") : "",
    msg: vis(m) ? m.innerText.replace(/\\s+/g, " ").trim() : "", score: vis(r) && !!r.querySelector(".sp-result__badge"), badge: vis(r) && r.querySelector(".sp-result__badge") ? r.querySelector(".sp-result__badge").textContent : "",
    light: vis(r) && r.querySelector(".sp-result__light") ? r.querySelector(".sp-result__light").textContent : "", rows,
    today: window.EMT ? EMT.store.getState().data.todayLearned.wordKeys.length : -1, toasts: (window.__qaToasts || []).length }; })()`;
const lv = (p) => p.ev(LV);
const S = (o) => `${o.status}${o.phase ? "/" + o.phase : ""}「${o.micText}」${o.bars}${o.shown ? "、即時「" + o.text + "」" : "、無即時列"}${o.msg ? "、訊息「" + o.msg.slice(0, 26) + "」" : ""}${o.score ? "、分數 " + o.badge + o.light : ""}`;
const emit = (p, js) => p.ev(`(() => { const r = window.__qaStt.last; ${js} })()`);
/** 頁面內執行 js（r = 目前替身實例），回傳同步狀態與「條件成立後下一個畫格」的 ms */
const timed = (p, js, cond, max = 400) => p.ev(`(async () => { const r = window.__qaStt.last; window.__qaOld = r; const t0 = performance.now(); ${js}; const sync = (${LV});
  for (;;) { const s = (${LV}); if (${cond}) { await new Promise((res) => requestAnimationFrame(() => res())); return { ms: +(performance.now() - t0).toFixed(1), sync, s }; }
    if (performance.now() - t0 > ${max}) return { ms: -1, sync, s }; await new Promise((res) => setTimeout(res, 1)); } })()`);
async function waitFor(p, cond, max = 3000) { const t0 = Date.now(); for (;;) { const s = await lv(p); if (eval(cond)) return s; if (Date.now() - t0 > max) return s; await sleep(20); } } // eslint-disable-line no-eval
async function toAwaiting(p) { await p.click(".fc-front .sp-mic"); return waitFor(p, `s.status === "preparing" && (s.phase === "awaitingAudioStart" || s.phase === "fallbackWait")`, 1500); }
async function toListening(p) { const a = await toAwaiting(p); if (a.phase === "awaitingAudioStart") await emit(p, `r.emitAudioStart()`); return waitFor(p, `s.status === "listening"`, T_FALLBACK + 600); }
async function gotoWord(p, w) {
  await p.go("flashcards");
  const i = await p.ev(`EMT.store.getState().runtime.studySet.findIndex((c) => (c.word || (c.item && c.item.word)) === ${J(w)})`);
  if (i < 0) throw new Error("單字集找不到 " + w);
  await p.ev(`EMT.store.actions.gotoCard(${i})`); await sleep(60);
}
async function addWords(p, words) { for (const w of words) await p.ev(`EMT.store.actions.addCustomWord({ word: ${J(w)}, meaning: "測試" })`); await sleep(80); }
// rAF 每畫格取樣：即時文字列與分數區、訊息區是否同時可見（AC-62-03 (a)「不會同時出現」）
const FRAMES_ON = `(() => { window.__qaFr = []; window.__qaFrOn = true; const vis = (e) => !!e && !e.hidden && !e.closest("[hidden]") && e.getClientRects().length > 0;
  const f = () => { const l = document.querySelector(".sp-live"), r = document.querySelector(".fc-front .sp-result"), m = document.querySelector(".fc-front .sp-msg");
    window.__qaFr.push({ t: +performance.now().toFixed(1), live: vis(l), res: vis(r), msg: vis(m) }); if (window.__qaFrOn) requestAnimationFrame(f); }; requestAnimationFrame(f); })()`;
const framesOff = async (p) => { await sleep(120); return p.ev(`(() => { window.__qaFrOn = false; const a = window.__qaFr; return { n: a.length, both: a.filter((x) => x.live && (x.res || x.msg)).length }; })()`); };
const reqs = (p, from) => p.log.requests.slice(from).filter((r) => !/^(file|data|blob|chrome-extension|devtools):/.test(r.url));

// ═════════ 1. 支援 audiostart：顯示、隱藏、評分（AC-62-01、AC-62-03～AC-62-06、AC-62-08、AC-62-11）═════════
{
  const p = await open();
  await gotoWord(p, "Latency");

  await R.check("TC-62-01", "AC-62-01、AC-33-03、V-STT-11、V-STT-15、IT-3、IT-6", async () => {
    await toListening(p);
    const out = []; let ok = true;
    const cfg = await p.ev(`window.__qaStt.config.slice(-1)[0]`);
    // 第 12 輪判讀：收音條自進入聆聽中到第 1 格亮約 60～460 ms（本頁第 1 次較久；audiostart 與即時文字路徑相同，diag-r12-meter.mjs），
    // 不屬「即時文字 ≤ 100 ms」的範圍，改為先等收音條亮起（≤ 1000 ms）再逐段送即時文字，每段檢查收音條仍亮
    const litMs = await p.ev(`(async () => { const t0 = performance.now(); for (;;) { if ([...document.querySelectorAll(".fc-front .sp-meter__bar")].some((x) => x.classList.contains("is-on"))) return +(performance.now() - t0).toFixed(1); if (performance.now() - t0 > 1000) return -1; await new Promise((r) => setTimeout(r, 5)); } })()`);
    for (const [args, exp] of [[["la"], "la"], [["late"], "late"], [["latency"], "latency"], [[" comply ", "with"], "comply with"], [["Hello, World?"], "Hello, World?"]]) {
      const r = await timed(p, `r.emitInterim(...${J(args)})`, `s.shown && s.text === ${J(exp)}`);
      const s = r.s;
      const good = r.ms >= 0 && r.ms <= 100 && r.sync.shown && s.n === 1 && s.label === TXT.label && s.text === exp && s.lang === "en" && s.status === "listening" && s.micText === TXT.listen && !s.score && !s.msg && s.bars !== "00000";
      ok = ok && good; out.push(`${J(args)} → 「${s.text}」${r.ms} ms（同步顯示 ${r.sync.shown}）、列數 ${s.n}、標籤「${s.label}」、lang ${s.lang}、按鈕「${s.micText}」、收音條 ${s.bars}、分數區 ${s.score}、訊息「${s.msg}」${good ? "" : "（不符）"}`);
    }
    await p.click(".fc-front .sp-mic"); await sleep(60);
    ok = ok && cfg && cfg.interimResults === true && cfg.lang === "en-US";
    return { ok: ok && litMs >= 0, note: `start() 當下 interimResults=${cfg && cfg.interimResults}、lang ${cfg && cfg.lang}；聆聽中收音條 ${litMs} ms 後亮；${out.join("；")}` };
  });

  await R.check("TC-62-01b", "AC-62-01（空白暫時結果不顯示；保留上一段，FB-80、IT-3）、E-169", async () => {
    await toListening(p);
    await emit(p, `r.emitInterim(""); r.emitInterim("   "); r.emitInterim("", "  ")`); await sleep(40); const a = await lv(p);
    await emit(p, `r.emitInterim("adr")`); await sleep(20); const b = await lv(p);
    await emit(p, `r.emitInterim("  "); r.emitInterim("")`); await sleep(40); const c = await lv(p);
    await p.click(".fc-front .sp-mic"); await sleep(60);
    const ok = !a.shown && a.status === "listening" && b.shown && b.text === "adr" && c.shown && c.text === "adr" && c.status === "listening";
    return { ok, note: `聆聽中只收到空字串／空白 → 即時列 ${a.shown}（${a.status}）；adr → 「${b.text}」；之後空白 → 仍「${c.text}」` };
  });

  await R.check("TC-62-01f", "AC-62-01、IT-6、IT-7（翻面重建面板：聆聽中還原即時文字，architecture §7.30.4 build()）", async () => {
    await toListening(p); await emit(p, `r.emitInterim("adr")`); await sleep(30); const a = await lv(p);
    await p.click(".fc-flip"); await sleep(400); const back = await lv(p);
    await p.click(".fc-flip"); await sleep(400); const s = await lv(p);
    const consistent = s.status === "listening" ? s.shown && s.text === "adr" && s.n === 1 : !s.shown;
    if (s.status === "listening") await p.click(".fc-front .sp-mic"); await sleep(80);
    return { ok: a.shown && consistent && !s.score, note: `聆聽中顯示 adr → 翻到背面（${back.status}、可見即時列 ${back.shown}）→ 翻回正面：${S(s)}、列數 ${s.n}（聆聽中須還原 adr；已結束須隱藏）` };
  });

  await gotoWord(p, "address");
  await R.check("TC-62-03a", "AC-62-03 (a)、AC-60-01、V-STT-12", async () => {
    await toListening(p); await emit(p, `r.emitInterim("adress")`); await sleep(30); const a = await lv(p);
    await p.ev(FRAMES_ON); await sleep(50);
    const r = await timed(p, `r.emitResult("address"); r.emitEnd();`, `!s.shown && s.score`);
    const fr = await framesOff(p);
    const s = r.s; const rec = s.rows.find((x) => x.l === "辨識文字");
    const ok = a.shown && a.text === "adress" && r.ms >= 0 && r.ms <= 100 && !r.sync.shown && r.sync.score && /\b100\b/.test(s.badge) && s.light === "綠燈" && rec && rec.v === "address" && fr.both === 0 && fr.n >= 3;
    return { ok, note: `即時「${a.text}」顯示中 → 最終 address：${r.ms} ms 內 ${S(s)}、辨識文字「${rec && rec.v}」；同一同步工作內即時列隱藏=${!r.sync.shown}、分數區出現=${r.sync.score}；rAF 取樣 ${fr.n} 格中同時可見 ${fr.both} 格` };
  });

  await R.check("TC-62-03b", "AC-62-03 (b)、AC-08-04、V-STT-17", async () => {
    await p.ev(`(() => { window.__qaLiveSeen = 0; const mo = new MutationObserver(() => { const l = document.querySelector(".sp-live"); if (l && !l.hidden) window.__qaLiveSeen++; }); mo.observe(document.querySelector(".fc-front"), { subtree: true, attributes: true, childList: true, characterData: true }); window.__qaMo = mo; })()`);
    await toListening(p); await emit(p, `r.emitResult("adress"); r.emitEnd();`); await sleep(80); const s = await lv(p);
    const seen = await p.ev(`(() => { window.__qaMo.disconnect(); return window.__qaLiveSeen; })()`);
    const rec = s.rows.find((x) => x.l === "辨識文字");
    return { ok: /\b86\b/.test(s.badge) && s.light === "黃燈" && rec && rec.v === "adress" && seen === 0 && !s.shown, note: `無暫時結果、直接最終 adress → ${S(s)}、辨識文字「${rec && rec.v}」；全程即時列可見次數 ${seen}` };
  });

  await R.check("TC-62-04", "AC-62-04、AC-59-03、V-STT-06（hadResult 但 hadText 假）", async () => {
    const out = []; let ok = true;
    for (const t of ["", "..."]) {
      const t0 = await p.ev(`EMT.store.getState().data.todayLearned.wordKeys.length`);
      await toListening(p); await emit(p, `r.emitInterim("ad")`); await sleep(20);
      const r = await timed(p, `r.emitResult(${J(t)}); r.emitEnd();`, `!s.shown && s.status === "idle"`); await sleep(40); const s = await lv(p);
      const good = r.ms >= 0 && r.ms <= 100 && !r.sync.shown && s.msg === TXT.heard && !s.score && s.today === t0;
      ok = ok && good; out.push(`即時 ad → 最終 ${J(t)}：${r.ms} ms 隱藏、${S(s)}、今日已學 ${t0}→${s.today}${good ? "" : "（不符）"}`);
    }
    return { ok, note: out.join("；") };
  });

  await R.check("TC-62-05b", "AC-62-05（最後一段即時文字清洗後為空 → AC-59-03）、V-STT-06", async () => {
    const t0 = await p.ev(`EMT.store.getState().data.todayLearned.wordKeys.length`);
    await toListening(p); await emit(p, `r.emitInterim("adr"); r.emitInterim("...")`); await sleep(20); const a = await lv(p);
    const r = await timed(p, `r.emitEnd()`, `s.status === "idle"`); await sleep(40); const s = await lv(p);
    return { ok: a.text === "..." && r.ms >= 0 && r.ms <= 100 && s.msg === TXT.heard && !s.score && !s.shown && s.today === t0, note: `即時 adr → 「${a.text}」→ end：${r.ms} ms、${S(s)}、今日已學 ${t0}→${s.today}` };
  });

  await R.check("TC-62-06", "AC-62-06 (a)～(f)、AC-08-10（v0.21 再按）、AC-58-10、AC-60-07、AC-08-09、AC-08-14、AC-33-05、AC-33-06 (b)、AC-59-02、IT-7、E-171", async () => {
    await gotoWord(p, "Latency");
    const out = []; let ok = true;
    const t0 = await p.ev(`EMT.store.getState().data.todayLearned.wordKeys.length`);
    const cases = [
      ["(a) 再按（手動停止）", `document.querySelector(".fc-front .sp-mic").click()`, "", true],
      ["(b) 換卡（下一張）", `document.querySelector(".fc-next").click()`, "", false],
      ["(b) 切換測驗模式", `document.querySelector(".fc-mode-btn").click()`, "", false],
      ["(b) 按 TTS", `document.querySelector(".fc-front .sp-tts__btn").click()`, "", false],
      ["(b) 離開單字卡頁", `document.querySelector('#app-nav [data-tab="dashboard"]').click()`, "", false],
      ["(c) error network", `r.emitError("network"); r.emitEnd();`, TXT.net, false],
      ["(c) error not-allowed", `r.emitError("not-allowed"); r.emitEnd();`, TXT.perm, false],
      ["(c) error audio-capture", `r.emitError("audio-capture"); r.emitEnd();`, TXT.noDevice, false],
      ["(c) error 其他代碼 bad-grammar", `r.emitError("bad-grammar"); r.emitEnd();`, TXT.generic, false],
      ["(d) error no-speech（無 speechstart）", `r.emitError("no-speech"); r.emitEnd();`, TXT.heard, false],
      ["(e) nomatch", `r.emitNomatch(); r.emitEnd();`, TXT.heard, false],
      ["(f) 音軌結束（拔除）", `window.__qaMic.unplug()`, TXT.noDevice, false],
    ];
    for (const [name, js, expMsg] of cases) {
      await p.go("flashcards"); await sleep(60);
      if ((await lv(p)).status === "(無面板)") { await p.click(".fc-mode-btn"); await sleep(150); }
      await gotoWord(p, "Latency");
      await toListening(p); await emit(p, `r.emitInterim("adr")`); await sleep(20); const a = await lv(p);
      const r = await timed(p, js, `!s.shown`); await sleep(80);
      let s = await lv(p);
      // 遲到事件：舊實例再送即時文字、最終結果、end，都不重新顯示、不評分
      await p.ev(`(() => { const r = window.__qaOld; try { r.emitInterim("adress late"); r.emitResult("Latency"); r.emitEnd(); } catch (e) {} })()`); await sleep(80);
      const late = await lv(p);
      let back = late;
      if (name.includes("切換測驗模式")) { await p.click(".fc-mode-btn"); await sleep(150); back = await lv(p); }
      if (name.includes("離開單字卡頁")) { await p.go("flashcards"); await sleep(100); back = await lv(p); }
      const msgOk = expMsg ? s.msg.startsWith(expMsg) && !s.msg.includes(TXT.noSpeech) : !s.msg;
      const good = a.shown && a.text === "adr" && r.ms >= 0 && r.ms <= 100 && !r.sync.shown && !s.shown && !s.score && msgOk && !late.shown && !late.score && !back.shown && !back.score && late.today === t0;
      ok = ok && good; out.push(`${name}：${r.ms} ms 隱藏（同步 ${!r.sync.shown}）→ ${S(s)}；遲到事件後即時列 ${late.shown}、分數 ${late.score}${back !== late ? "；返回後 " + S(back) : ""}${good ? "" : "（不符）"}`);
      if (name.includes("拔除")) { await sleep(100); }
    }
    const t1 = await p.ev(`EMT.store.getState().data.todayLearned.wordKeys.length`);
    return { ok: ok && t1 === t0 && p.log.exceptions.length === 0, note: `${out.join("；")}；今日已學 ${t0}→${t1}；未處理例外 ${p.log.exceptions.length}` };
  });

  await R.check("TC-62-08", "AC-62-08、AC-60-05、C-7、RT-3、規格書 2.6、Q-22", async () => {
    await p.reload(); await p.go("flashcards"); await gotoWord(p, "Latency");
    const req0 = p.log.requests.length, dlg0 = p.log.dialogs.length;
    await toListening(p);
    const out = []; let ok = true;
    for (const t of ["<img src=x onerror=alert(1)>", "&lt;b&gt;", "<script>alert(2)</script><b>x</b>"]) {
      await emit(p, `r.emitInterim(${J(t)})`); await sleep(120); const s = await lv(p);
      const imgs = await p.ev(`document.querySelectorAll(".sp-live img, .sp-live script, .sp-live b").length`);
      const good = s.text === t && s.kids === 2 && s.valKids === 0 && imgs === 0;
      ok = ok && good; out.push(`${J(t)} → textContent 逐字=${s.text === t}、.sp-live 子元素 ${s.kids}、值子元素 ${s.valKids}、img/script/b ${imgs}`);
    }
    await p.click(".fc-front .sp-mic"); await sleep(80);
    const src = fs.readFileSync(path.join(ROOT, "src/app/views/speech-panel.js"), "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
    const bad = (src.match(/innerHTML|insertAdjacentHTML|outerHTML|document\.write|eval\(/g) || []);
    const nr = reqs(p, req0);
    ok = ok && bad.length === 0 && nr.length === 0 && p.log.dialogs.length === dlg0;
    return { ok, note: `${out.join("；")}；對話框 ${p.log.dialogs.length - dlg0}、非本機請求 ${nr.length}；speech-panel.js（去註解）HTML 寫入 API ${bad.length} 處` };
  });

  await R.check("TC-62-11", "AC-62-11、AC-60-03、V-STT-15、RT-4", async () => {
    await toListening(p);
    const out = []; let ok = true;
    const BAN = ["偵測到", "語言", "英文", "中文", "你說的是", "發音", "分數"];
    for (const t of ["comply with", "你好世界", "12345", "Latency 測試 2026"]) {
      await emit(p, `r.emitInterim(${J(t)})`); await sleep(20); const s = await lv(p);
      const fixed = s.all.replace(t, "");
      const hit = BAN.filter((w) => fixed.includes(w));
      const good = s.all === TXT.label + t && s.label === TXT.label && hit.length === 0;
      ok = ok && good; out.push(`${J(t)} → 列全文「${s.all}」、固定文字「${fixed}」、禁用字 ${hit.join("、") || "0"}`);
    }
    await p.click(".fc-front .sp-mic"); await sleep(60);
    return { ok, note: out.join("；") };
  });

  await R.check("TC-62-07a", "AC-62-07（DOM 屬性部分）、V-STT-16", async () => {
    await toListening(p); await emit(p, `r.emitInterim("adr")`); await sleep(30);
    const a = await p.ev(`(() => { const l = document.querySelector(".sp-live"); const chain = []; const bad = [];
      for (let e = l.parentElement; e; e = e.parentElement) { const al = e.getAttribute("aria-live"), ro = e.getAttribute("role"); chain.push(e.tagName.toLowerCase() + (e.id ? "#" + e.id : "") + (e.className && typeof e.className === "string" ? "." + e.className.trim().split(/\\s+/)[0] : ""));
        if ((al && al !== "off") || ["status", "alert", "log"].includes(ro)) bad.push(chain[chain.length - 1] + "[" + al + "," + ro + "]"); }
      const inside = [...l.querySelectorAll("*")].filter((e) => (e.getAttribute("aria-live") && e.getAttribute("aria-live") !== "off") || ["status", "alert", "log"].includes(e.getAttribute("role"))).length;
      const msg = document.querySelector(".fc-front .sp-msg"), res = document.querySelector(".fc-front .sp-result");
      return { al: l.getAttribute("aria-live"), role: l.getAttribute("role"), chain, bad, inside, msg: [msg.getAttribute("role"), msg.getAttribute("aria-live")], res: res.getAttribute("aria-live"), msgIsAncestor: msg.contains(l), resIsAncestor: res.contains(l) }; })()`);
    await p.click(".fc-front .sp-mic"); await sleep(60);
    const ok = a.al === "off" && a.role === null && a.bad.length === 0 && a.inside === 0 && a.msg[0] === "status" && a.msg[1] === "polite" && a.res === "polite" && !a.msgIsAncestor && !a.resIsAncestor && a.chain[a.chain.length - 1] === "html";
    return { ok, note: `.sp-live aria-live=${a.al}、role=${a.role}；祖先 ${a.chain.length} 層（${a.chain.join(" ← ")}）中即時區域 ${J(a.bad)}；列內即時區域 ${a.inside}；訊息區 role=${a.msg[0]}／aria-live=${a.msg[1]}、分數區 aria-live=${a.res}（皆非祖先）。NVDA 實際播報另列 TC-62-07h（人工）` };
  });
  await p.close();
}

// ═════════ 2. AC-62-05 以即時文字評分 vs 直接最終結果（2 個獨立頁面，比較分數區、lastResult、持久化資料）═════════
{
  const run = async (interim) => {
    const p = await open(); await gotoWord(p, "address");
    const d0 = await p.ev(`JSON.parse(localStorage.getItem(${J(KEY)})).data`);
    await toListening(p);
    let r;
    if (interim) { await emit(p, `r.emitInterim("adr")`); await sleep(20); await emit(p, `r.emitInterim("adress")`); await sleep(20); await p.ev(FRAMES_ON); await sleep(40); r = await timed(p, `r.emitEnd()`, `s.score`); }
    else r = await timed(p, `r.emitResult("adress"); r.emitEnd();`, `s.score`);
    const fr = interim ? await framesOff(p) : { n: 0, both: 0 };
    await sleep(150);
    const s = await lv(p);
    const x = await p.ev(`(() => { const r = document.querySelector(".fc-front .sp-result"); const st = EMT.store.getState(); return { html: r.outerHTML, last: st.runtime.speech.lastResult, data: JSON.parse(localStorage.getItem(${J(KEY)})).data, dash: null }; })()`);
    await p.go("dashboard"); await sleep(120);
    const dash = await p.ev(`(document.querySelector("#view-dashboard") || document.body).innerText.replace(/\\s+/g, " ").slice(0, 400)`);
    await p.close();
    return { r, s, fr, d0, ...x, dash };
  };
  const A = await run(true), B = await run(false);
  await R.check("TC-62-05", "AC-62-05、AC-08-04、AC-30-01、AC-17-02、MS-1 (2b)、IT-9、V-STT-14、LR-1", async () => {
    // 兩頁各自注入 cs 範本，自訂單字 id（含時間與亂數）與 createdAt 每次不同、與評分無關，比較時去除這 2 欄
    const strip = (d) => { const o = JSON.parse(J(d)); o.customVocab = (o.customVocab || []).map(({ id, createdAt, ...x }) => x); return o; };
    const diffKeys = Object.keys(A.data).filter((k) => J(strip(A.data)[k]) !== J(strip(B.data)[k])).map((k) => `${k}: ${J(A.data[k]).slice(0, 120)} vs ${J(B.data[k]).slice(0, 120)}`);
    const sameHtml = A.html === B.html, sameLast = J(A.last) === J(B.last), sameData = J(strip(A.data)) === J(strip(B.data)), sameDash = A.dash === B.dash;
    const rec = A.s.rows.find((x) => x.l === "辨識文字");
    const ok = A.r.ms >= 0 && A.r.ms <= 100 && /\b86\b/.test(A.s.badge) && A.s.light === "黃燈" && rec && rec.v === "adress" && !A.s.shown && !A.s.msg && A.last && A.last.recognizedText === "adress"
      && sameHtml && sameLast && sameData && sameDash && A.data.todayLearned.wordKeys.length === A.d0.todayLearned.wordKeys.length + 1 && A.fr.both === 0;
    return { ok, note: `即時 adr、adress → end：${A.r.ms} ms 內分數區繪製、${S(A.s)}、辨識文字「${rec && rec.v}」；對照（直接最終 adress，${B.r.ms} ms）${S(B.s)}；分數區 outerHTML 相同=${sameHtml}（${A.html.length} 字元）、lastResult 相同=${sameLast} ${J(A.last)}；評分後 localStorage data（今日已學、打卡、掌握、learnedHistory 等 12 欄）相同=${sameData}${diffKeys.length ? "（不同：" + diffKeys.join("；") + "）" : ""}、主控台文字相同=${sameDash}；今日已學 ${A.d0.todayLearned.wordKeys.length}→${A.data.todayLearned.wordKeys.length}、打卡 ${A.data.streak.days}；rAF 取樣 ${A.fr.n} 格中即時列與分數區同時可見 ${A.fr.both}` };
  });
}

// ═════════ 3. 準備中收到即時文字（AC-62-02、AC-58-07 v0.21）：支援與不支援 audiostart ═════════
for (const as of [true, false]) {
  const p = await open({ as });
  await gotoWord(p, "address");
  const tag = as ? "a" : "b";
  await R.check(`TC-62-02${tag}`, `AC-62-02 (${tag})、AC-58-07（v0.21 暫時結果）、AC-33-03、IT-5、PR-5 (b)${as ? "" : "、AC-58-09"}`, async () => {
    const a = await toAwaiting(p);
    const t0 = await p.ev(`EMT.store.getState().data.todayLearned.wordKeys.length`);
    const r = await timed(p, `r.emitInterim("ad")`, `s.status === "listening" && s.shown && s.text === "ad"`);
    const litMs = await p.ev(`(async () => { const t0 = performance.now(); for (;;) { if ([...document.querySelectorAll(".fc-front .sp-meter__bar")].some((x) => x.classList.contains("is-on"))) return +(performance.now() - t0).toFixed(1); if (performance.now() - t0 > 1000) return -1; await new Promise((r) => setTimeout(r, 5)); } })()`); const lit = await lv(p);
    await sleep(T_READY + 1000);
    const after = await lv(p);
    if (as) { await emit(p, `r.emitAudioStart()`); await sleep(100); }
    const afterAs = await lv(p);
    const ok = a.status === "preparing" && a.phase === (as ? "awaitingAudioStart" : "fallbackWait") && r.ms >= 0 && r.ms <= 100 && r.sync.status === "listening" && r.sync.shown && r.sync.text === "ad"
      && litMs >= 0 && lit.bars !== "00000" && after.status === "listening" && after.shown && after.text === "ad" && !after.msg && after.toasts === a.toasts && !after.score && after.today === t0
      && afterAs.status === "listening" && afterAs.text === "ad" && afterAs.bars !== "00000" && !afterAs.msg;
    await p.click(".fc-front .sp-mic"); await sleep(60);
    return { ok, note: `準備中（${a.phase}）收到 ad：${r.ms} ms 內（同步 ${r.sync.status}、即時「${r.sync.text}」）→ ${S(r.s)}；轉聆聽中後 ${litMs} ms 收音條亮（${lit.bars}；本頁第 1 次取得麥克風，與 audiostart 路徑相同，diag-r12-meter）；再等 ${(T_READY + 1000) / 1000} 秒（> T_READY${as ? "" : "、T_FALLBACK"}）→ ${S(after)}、未評分（今日已學 ${t0}→${after.today}）${as ? "；之後 audiostart → " + S(afterAs) : ""}` };
  });
  if (as) {
    await R.check("TC-58-07i", "AC-58-07（v0.21：準備中暫時結果視同已開始收音，不評分）", async () => {
      // 準備中依序收到 interim → 最終結果：interim 只轉聆聽中，評分以最終結果為準
      const a = await toAwaiting(p);
      await emit(p, `r.emitInterim("adres")`); await sleep(30); const b = await lv(p);
      await emit(p, `r.emitResult("address"); r.emitEnd();`); await sleep(80); const c = await lv(p);
      const ok = a.status === "preparing" && b.status === "listening" && b.text === "adres" && !b.score && /\b100\b/.test(c.badge) && c.light === "綠燈" && !c.shown;
      return { ok, note: `準備中（${a.phase}）interim adres → ${S(b)}（不評分）；最終 address → ${S(c)}` };
    });
  }
  await p.close();
}

// ═════════ 4. 修改的 AC：AC-08-10、AC-59-01、AC-59-05、AC-30-04 ═════════
{
  const p = await open();
  await gotoWord(p, "address");
  const once = async (js, pre = "") => { await toListening(p); if (pre) { await emit(p, pre); await sleep(20); } await emit(p, js); await sleep(90); return lv(p); };
  await R.check("TC-59-01i", "AC-59-01（v0.21：最終與暫時結果都沒有）、AC-62-05", async () => {
    const a = await once(`r.emitSpeechStart(); r.emitEnd();`);
    const b = await once(`r.emitSpeechStart(); r.emitEnd();`, `r.emitInterim("adress")`);
    const ok = a.msg === TXT.heard && !a.score && a.status === "idle" && a.bars === "00000" && /\b86\b/.test(b.badge) && !b.msg;
    return { ok, note: `speechstart → end（無最終、無暫時）：${S(a)}；有暫時結果 adress 時 speechstart → end：${S(b)}（依 AC-62-05 評分）` };
  });
  await R.check("TC-59-05i", "AC-59-05（v0.21：含即時文字）、AC-62-06 (d)、Q-107 A", async () => {
    const out = []; let ok = true;
    for (const [name, js] of [["(a) error no-speech → end", `r.emitError("no-speech"); r.emitEnd();`], ["(b) 無錯誤 end", `r.emitEnd();`], ["(c) soundstart → end", `r.emitSoundStart(); r.emitEnd();`]]) {
      const a = await once(js); const b = await once(js, `r.emitInterim("adr")`);
      const expB = name.startsWith("(a)") ? "heard" : "score";
      const good = a.msg === TXT.noSpeech && !a.score && a.bars === "00000" && (expB === "heard" ? b.msg === TXT.heard && !b.score : b.score && !b.msg);
      ok = ok && good; out.push(`${name}：無即時文字「${a.msg}」；有即時 adr → ${expB === "heard" ? "「" + b.msg + "」" : "分數 " + b.badge + b.light}${good ? "" : "（不符）"}`);
    }
    return { ok, note: out.join("；") };
  });
  await R.check("TC-08-10i", "AC-08-10（v0.21：沒有辨識結果 = 最終與即時文字都沒有；再按不評分）、AC-62-05、AC-62-06 (a)", async () => {
    const a = await once(`r.emitEnd();`);
    const b = await once(`r.emitEnd();`, `r.emitInterim("adress")`);
    await toListening(p); await emit(p, `r.emitInterim("adress")`); await sleep(20); await p.click(".fc-front .sp-mic"); await sleep(120); const c = await lv(p);
    const ok = a.msg === TXT.noSpeech && !a.score && /\b86\b/.test(b.badge) && !b.msg && c.status === "idle" && !c.msg && !c.score && !c.shown;
    return { ok, note: `無結果 end → 「${a.msg}」；只有即時文字 end → ${b.badge}${b.light}；即時文字後再按 → ${S(c)}（不評分、不提示）` };
  });
  await p.close();
}
{
  const p = await open(); // 今日已學 X = 0
  await R.check("TC-30-04i", "AC-30-04（v0.21：顯示過即時文字但以手動停止、換卡、錯誤、nomatch 結束）、AC-62-06、MS-6", async () => {
    await gotoWord(p, "address");
    const x0 = await p.ev(`EMT.store.getState().data.todayLearned.wordKeys.length`); const raw0 = await p.ev(`localStorage.getItem(${J(KEY)})`);
    const out = [];
    const run = async (name, js) => { await gotoWord(p, "address"); await toListening(p); await emit(p, `r.emitInterim("adress")`); await sleep(20); await p.ev(`(() => { const r = window.__qaStt.last; ${js} })()`); await sleep(120); const x = await p.ev(`EMT.store.getState().data.todayLearned.wordKeys.length`); out.push(`${name} → X=${x}`); return x; };
    const xs = [await run("手動停止", `document.querySelector(".fc-front .sp-mic").click()`), await run("換卡", `document.querySelector(".fc-next").click()`), await run("TTS", `document.querySelector(".fc-front .sp-tts__btn").click()`),
      await run("error network", `r.emitError("network"); r.emitEnd()`), await run("error no-speech", `r.emitError("no-speech"); r.emitEnd()`), await run("nomatch", `r.emitNomatch(); r.emitEnd()`)];
    const raw1 = await p.ev(`localStorage.getItem(${J(KEY)})`);
    const noPos = (x) => { const o = JSON.parse(x); delete o.savedAt; delete o.data.flashcardPosition; return J(o); };
    await gotoWord(p, "address"); await toListening(p); await emit(p, `r.emitInterim("adress")`); await sleep(20); await emit(p, `r.emitEnd()`); await sleep(120);
    const xScore = await p.ev(`EMT.store.getState().data.todayLearned.wordKeys.length`);
    await p.go("dashboard"); await sleep(120); const dash = await p.ev(`(document.querySelector("#view-dashboard") || document.body).innerText.replace(/\\s+/g, " ")`);
    const ok = x0 === 0 && xs.every((x) => x === 0) && noPos(raw1) === noPos(raw0) && xScore === 1;
    return { ok, note: `X 初值 ${x0}；${out.join("、")}；除 flashcardPosition 外 localStorage 不變=${noPos(raw1) === noPos(raw0)}；之後以即時文字評分（AC-62-05，不屬本條）→ X=${xScore}；主控台「${(dash.match(/今日已學[^。]{0,24}/) || [""])[0]}」` };
  });
  await p.close();
}

// ═════════ 5. AC-62-09 版面（375／768／1366；一般與減少動態）═════════
{
  const LONG20 = "The quick brown fox jumps over the lazy dog while seven bright students review difficult academic vocabulary every single morning";
  const NOSP60 = "abcdefghij".repeat(6);
  for (const reduced of [false, true]) for (const [w, h] of [[375, 667], [768, 1024], [1366, 768]]) {
    const p = await open({ w, h, reduced });
    await R.check(`TC-62-09${reduced ? "m" : ""}-${w}`, `AC-62-09${reduced ? " (b)" : " (a)"}、AC-20-01、AC-38-04、AC-27-03（${w}px）`, async () => {
      await gotoWord(p, "Latency");
      // 先評分 1 次取得「辨識文字」值的顏色（AC-62-09：與分數區辨識文字值不同）
      await toListening(p); await emit(p, `r.emitResult("Latency"); r.emitEnd();`); await sleep(100);
      const cmp = await p.ev(`(() => { const v = document.querySelector(".fc-front .sp-compare__value"); return v ? getComputedStyle(v).color : null; })()`);
      const out = []; let ok = true;
      for (const [label, t] of [["comply with", "comply with"], ["20 字長句", LONG20], ["60 字元無空白", NOSP60]]) {
        await p.ev(`window.scrollTo(0, 0)`); await sleep(reduced ? 80 : 500);
        const RECT = `(() => { const q = (s) => { const e = document.querySelector(s); if (!e) return ""; const b = e.getBoundingClientRect(); return [b.left, b.top + scrollY, b.width, b.height].map((v) => +v.toFixed(1)).join(","); };
          return [...document.querySelectorAll(".fc-front .sp-tts__btn")].map((e) => { const b = e.getBoundingClientRect(); return [b.left, b.top + scrollY, b.width, b.height].map((v) => +v.toFixed(1)).join(","); }).join("|") + "#" + q(".fc-front .sp-mic") + "#" + q(".fc-front .sp-meter"); })()`;
        let r0 = await p.ev(RECT); for (let k = 0; k < 20; k++) { await sleep(100); const again = await p.ev(RECT); if (again === r0) break; r0 = again; }
        await toListening(p); await sleep(60); const rL = await p.ev(RECT);
        await emit(p, `r.emitInterim(${J(t.slice(0, Math.ceil(t.length / 2)))})`); await sleep(60); const rS = await p.ev(RECT);
        await emit(p, `r.emitInterim(${J(t)})`); await sleep(60); const rU = await p.ev(RECT);
        const m = await p.ev(`(() => { const l = document.querySelector(".sp-live"), lab = l.querySelector(".sp-live__label"), val = l.querySelector(".sp-live__text"); const nav = document.getElementById("app-nav"); const navTop = nav && getComputedStyle(nav).position === "fixed" ? nav.getBoundingClientRect().top : innerHeight;
          const vis = (sel) => { const e = document.querySelector(sel); if (!e) return "無"; e.scrollIntoView({ block: "nearest" }); const b = e.getBoundingClientRect(); return b.top >= -0.5 && b.bottom <= Math.min(innerHeight, navTop) + 0.5 ? "可見" : "被遮 " + b.bottom.toFixed(0) + ">" + navTop.toFixed(0); };
          const cs = (e) => getComputedStyle(e); const lr = l.getBoundingClientRect(), vr = val.getBoundingClientRect(); const pr = document.querySelector(".fc-front .sp-panel").getBoundingClientRect();
          const rat = (e) => +window.__qaL.ratio(window.__qaL.effective(e).fg, window.__qaL.effective(e).bg).toFixed(2);
          const res = { text: val.textContent, hs: document.documentElement.scrollWidth > document.documentElement.clientWidth, lsw: l.scrollWidth, lcw: l.clientWidth, vsw: val.scrollWidth, inPanel: lr.left >= pr.left - 0.5 && lr.right <= pr.right + 0.5 && vr.right <= lr.right + 0.5,
            italic: cs(val).fontStyle, cLab: cs(lab).color, cVal: cs(val).color, ws: cs(val).whiteSpace, ov: cs(l).overflow, to: cs(val).textOverflow, lines: Math.round(vr.height / parseFloat(cs(val).lineHeight || 20)), h: +lr.height.toFixed(1),
            anim: [l, lab, val].map((e) => cs(e).animationName).join("/"), trans: [l, lab, val].map((e) => cs(e).transitionDuration).join("/"), display: cs(l).display, rLab: rat(lab), rVal: rat(val) };
          res.flip = vis(".fc-flip"); res.prev = vis(".fc-prev"); res.next = vis(".fc-next"); return res; })()`);
        await p.ev(`window.scrollTo(0, 0)`); await sleep(60);
        await p.click(".fc-front .sp-mic"); await sleep(80); const rH = await p.ev(RECT); const hid = await lv(p);
        const same = r0 === rL && rL === rS && rS === rU && rU === rH;
        const good = same && m.text === t && !m.hs && m.lsw <= m.lcw && m.inPanel && m.italic === "italic" && m.cLab === MUTED && m.cVal === MUTED && m.cVal !== cmp && m.ov === "visible" && m.to === "clip"
          && /^none\/none\/none$/.test(m.anim) && /^0s\/0s\/0s$/.test(m.trans) && m.flip === "可見" && m.prev === "可見" && m.next === "可見" && m.rLab >= 4.5 && m.rVal >= 4.5 && !hid.shown;
        ok = ok && good; out.push(`${label}：座標 待機/聆聽/出現/更新/隱藏 相同=${same}${same ? "" : "（" + [r0, rL, rS, rU, rH].join(" → ") + "）"}、全文=${m.text === t}、水平捲軸 ${m.hs}、列 scrollWidth ${m.lsw} ≤ clientWidth ${m.lcw}、在面板內 ${m.inPanel}、行數 ${m.lines}（高 ${m.h}）、${m.italic}、標籤 ${m.cLab}／值 ${m.cVal} vs 辨識文字 ${cmp}、對比 ${m.rLab}／${m.rVal}、animation ${m.anim}、transition ${m.trans}、display ${m.display}、翻面/上一張/下一張 ${m.flip}/${m.prev}/${m.next}、隱藏後 ${hid.shown ? "仍顯示" : "已隱藏"}${good ? "" : "（不符）"}`);
      }
      return { ok, note: out.join("；") };
    });
    await p.close();
  }
}

// ═════════ 6. AC-62-10 不持久化（file://）═════════
{
  const p = await open();
  await R.check("TC-62-10", "AC-62-10、AC-21-03、AC-53-06、AC-08-13、V-STT-17、IT-8、Q-106 A", async () => {
    await gotoWord(p, "address");
    const keys0 = await p.ev(`Object.keys(localStorage).sort()`);
    const req0 = p.log.requests.length;
    const U = ["QAzetaA", "QAzetaB", "QAzetaC"];
    await toListening(p); await emit(p, `r.emitInterim(${J(U[0])})`); await sleep(20); await emit(p, `r.emitResult("address"); r.emitEnd();`); await sleep(100); const a = await lv(p); // AC-62-03 (a)
    await toListening(p); await emit(p, `r.emitInterim(${J(U[1])})`); await sleep(20); await emit(p, `r.emitEnd();`); await sleep(100); const b = await lv(p); // AC-62-05（以 QAzetaB 評分）
    await toListening(p); await emit(p, `r.emitInterim(${J(U[2])})`); await sleep(20); await p.click(".fc-front .sp-mic"); await sleep(120); const c = await lv(p); // AC-62-06 (a)
    const scan = await p.ev(`(async () => { const U = ${J(U)}; const ls = Object.keys(localStorage).map((k) => k + "=" + localStorage.getItem(k)).join("\\n");
      let idb = []; try { idb = indexedDB.databases ? (await indexedDB.databases()).map((d) => d.name) : ["(不支援)"]; } catch (e) { idb = ["(錯誤)"]; }
      let cacheTxt = "", cacheN = 0; try { for (const n of await caches.keys()) { const c = await caches.open(n); for (const rq of await c.keys()) { cacheN++; const r = await c.match(rq); cacheTxt += rq.url + (r ? await r.text() : ""); } } } catch (e) { cacheTxt = "(caches 不可用：" + e.name + ")"; }
      const bk = EMT.store.actions.exportBackup().json; const o = JSON.parse(bk);
      const ss = Object.keys(sessionStorage).map((k) => k + "=" + sessionStorage.getItem(k)).join("\\n");
      return { lsHit: U.filter((u) => ls.includes(u)), idb, cacheN, cacheHit: U.filter((u) => cacheTxt.includes(u)), bkHit: U.filter((u) => bk.includes(u)), ssHit: U.filter((u) => ss.includes(u)), bkTop: Object.keys(o), bkData: Object.keys(o.data), sv: o.schemaVersion,
        lsSv: JSON.parse(localStorage.getItem(${J(KEY)})).schemaVersion, lsData: Object.keys(JSON.parse(localStorage.getItem(${J(KEY)})).data), stateHit: U.filter((u) => JSON.stringify(EMT.store.getState().data).includes(u)) }; })()`);
    const nr = reqs(p, req0); const reqHit = p.log.requests.slice(req0).filter((r) => U.some((u) => r.url.includes(u)));
    const keys1 = await p.ev(`Object.keys(localStorage).sort()`);
    await p.reload(); await p.go("flashcards"); await sleep(100); const d = await lv(p);
    const html = fs.readFileSync(DIST, "utf8"); const mr = (html.match(/MediaRecorder/g) || []).length;
    const old = execFileSync("git", ["show", "HEAD:dist/english-master-track.html"], { cwd: ROOT, maxBuffer: 64 << 20, encoding: "utf8" });
    const NOTICE = "語音辨識由瀏覽器提供，您的語音會傳送到瀏覽器廠商（如 Google、Microsoft）的伺服器處理；本系統只即時讀取音量以顯示收音條，不錄音、不保存、不上傳錄音。停留在單字卡頁期間，瀏覽器可能持續顯示麥克風使用中圖示，離開單字卡頁即停止使用麥克風";
    const PRIV5 = "語音由瀏覽器廠商（如 Google、Microsoft）處理；本系統不錄音、不保存、不上傳錄音。";
    const privHtml = fs.readFileSync(path.join(ROOT, "dist/site/privacy.html"), "utf8");
    const textSame = html.includes(NOTICE) && old.includes(NOTICE) && html.includes(PRIV5) && old.includes(PRIV5) && privHtml.includes(PRIV5);
    const ok = /\b100\b/.test(a.badge) && /\b(\d+)\b/.test(b.badge) && !c.score && scan.lsHit.length === 0 && scan.cacheHit.length === 0 && scan.bkHit.length === 0 && scan.ssHit.length === 0 && scan.stateHit.length === 0 && scan.idb.length === 0
      && J(keys0) === J(keys1) && scan.sv === 3 && scan.lsSv === 3 && J(scan.lsData) === J(V3_KEYS) && J(scan.bkTop) === J(["format", "schemaVersion", "exportedAt", "contentDataVersion", "data"]) && J(scan.bkData) === J(V3_KEYS)
      && nr.length === 0 && reqHit.length === 0 && d.status === "idle" && !d.shown && d.n === 1 && mr === 0 && textSame;
    return { ok, note: `3 種結束：AC-62-03 (a) ${a.badge}${a.light}、AC-62-05 ${b.badge}${b.light}（辨識文字 ${J(b.rows.map((x) => x.v))}）、AC-62-06 (a) ${S(c)}；即時文字命中 localStorage ${scan.lsHit.length}、sessionStorage ${scan.ssHit.length}、AppState.data ${scan.stateHit.length}、IndexedDB 資料庫 ${J(scan.idb)}、Cache Storage ${scan.cacheN} 筆命中 ${scan.cacheHit.length}、匯出備份 ${scan.bkHit.length}；鍵 ${J(keys1)}（前 ${J(keys0)}）、schemaVersion ${scan.lsSv}／備份 ${scan.sv}、data ${scan.lsData.length} 欄、備份頂層 ${J(scan.bkTop)}；非本機請求 ${nr.length}、含即時文字的請求 ${reqHit.length}；重新載入 → ${S(d)}；交付檔 MediaRecorder ${mr} 次；AC-08-13 說明與隱私權政策 (5) 與 HEAD 交付檔逐字相同=${textSame}` };
  });
  await p.close();
}

// ═════════ 7. AC-62-10 部署目錄＋Service Worker（Playwright，本機 8080；FE-101 以 CDP 無法裝起 SW）═════════
if (process.env.QA_INTERIM_SKIP_PWA !== "1") {
  const E = await import("./lib/pwa-env.mjs");
  await R.check("TC-62-10b", "AC-62-10（部署目錄、Service Worker 與 Cache Storage）、AC-37-05", async () => {
    await E.serve();
    const browser = await E.launchBrowser();
    try {
      const env = await E.newEnv(browser, { inits: [TOAST_RECORDER, fakeTts("ok"), fakeStt("ok", { audioStart: true, autoAudioStartMs: 50 }), fakeMic("ok", -5)] });
      const page = await env.newPage();
      await page.goto(E.BASE); await page.waitForFunction(() => document.documentElement.getAttribute("data-ready") === "1", null, { timeout: 20000 });
      await E.startLearning(page);
      const sw = await E.waitSW(page, 15000);
      await page.evaluate((k) => { const o = JSON.parse(localStorage.getItem(k)); o.data.sttNoticeAcknowledged = true; localStorage.setItem(k, JSON.stringify(o)); }, KEY);
      await page.reload(); await page.waitForFunction(() => document.documentElement.getAttribute("data-ready") === "1", null, { timeout: 20000 });
      const ctl = await page.evaluate(() => !!navigator.serviceWorker.controller);
      await E.goTab(page, "flashcards"); await sleep(200);
      const n0 = env.log.requests.length;
      const U = ["QAomegaA", "QAomegaB", "QAomegaC"];
      const one = async (u, how) => { await page.click(".fc-front .sp-mic"); await page.waitForFunction(() => document.querySelector(".fc-front .sp-mic").dataset.status === "listening", null, { timeout: 4000 });
        await page.evaluate((x) => window.__qaStt.last.emitInterim(x), u); await sleep(40); const shown = await page.evaluate(() => !document.querySelector(".sp-live").hidden);
        if (how === "final") await page.evaluate(() => { const r = window.__qaStt.last; r.emitResult("Latency"); r.emitEnd(); });
        else if (how === "end") await page.evaluate(() => window.__qaStt.last.emitEnd());
        else await page.click(".fc-front .sp-mic");
        await sleep(150); return shown; };
      const shown = [await one(U[0], "final"), await one(U[1], "end"), await one(U[2], "stop")];
      const scan = await page.evaluate(async (U) => { let txt = "", n = 0; const names = await caches.keys(); for (const nm of names) { const c = await caches.open(nm); for (const rq of await c.keys()) { n++; const r = await c.match(rq); txt += rq.url + (r ? await r.text() : ""); } }
        const ls = Object.keys(localStorage).map((k) => k + "=" + localStorage.getItem(k)).join("\n"); const idb = indexedDB.databases ? (await indexedDB.databases()).map((d) => d.name) : [];
        return { names, n, cacheHit: U.filter((u) => txt.includes(u)), lsHit: U.filter((u) => ls.includes(u)), idb, keys: Object.keys(localStorage) }; }, U);
      const after = env.log.requests.slice(n0);
      const hit = after.filter((r) => U.some((u) => r.url.includes(u)));
      const ext = after.filter((r) => !r.url.startsWith(E.ORIGIN) && !/^(data|blob):/.test(r.url));
      await page.reload(); await page.waitForFunction(() => document.documentElement.getAttribute("data-ready") === "1", null, { timeout: 20000 }); await E.goTab(page, "flashcards"); await sleep(200);
      const d = await page.evaluate(() => ({ status: document.querySelector(".fc-front .sp-mic").dataset.status, hidden: document.querySelector(".sp-live").hidden }));
      const ok = sw.ok && ctl && scan.n >= 7 && shown.every(Boolean) && scan.cacheHit.length === 0 && scan.lsHit.length === 0 && scan.idb.length === 0 && hit.length === 0 && ext.length === 0 && d.status === "idle" && d.hidden && env.log.errors.length === 0;
      return { ok, note: `${E.BASE}：Service Worker 啟用=${sw.ok}（${sw.ms} ms）、控制中=${ctl}；Cache Storage ${J(scan.names)} 共 ${scan.n} 筆；3 種結束前即時列顯示 ${J(shown)}；即時文字命中 Cache ${scan.cacheHit.length}、localStorage ${scan.lsHit.length}、IndexedDB ${J(scan.idb)}；期間請求 ${after.length} 筆（含即時文字 ${hit.length}、跨來源 ${ext.length}）；重新載入 → ${d.status}、即時列 hidden=${d.hidden}；pageerror ${env.log.errors.length}；瀏覽器 ${E.BROWSER}` };
    } finally { await browser.close().catch(() => {}); await E.stopServer(); }
  });
}

const exc = PAGES.flatMap((p) => p.log.exceptions);
const errs = PAGES.flatMap((p) => p.log.console.filter((c) => c.type === "error").map((c) => c.text));
R[exc.length === 0 ? "pass" : "fail"]("TC-X-interim", "（全套件）無未處理例外", `例外 ${exc.length}：${J(exc).slice(0, 300)}；console.error ${errs.length}：${J(errs).slice(0, 300)}`);
R.results.splice(0, R.results.length, ...R.results.filter(Boolean));
R.save(resultPath("e2e-interim"));
console.log(`e2e-interim：通過 ${R.results.filter((r) => r.result === "通過").length}、失敗 ${R.results.filter((r) => r.result === "失敗").length}`);
process.exit(0);
