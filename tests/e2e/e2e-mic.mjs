// QA E2E 套件 9（第 3 輪新增，PRD v0.9 US-33、AC-08-09 getUserMedia 路徑、AC-21-03 執行期）
// 麥克風以 fakeMic 替身（Web Audio 1 kHz 正弦波串流，architecture §10.2「收音條（替身音源）」）；
// 權限詢問次數、瀏覽器使用中圖示等真實行為無法在無頭環境驗證，列 V-MIC-1～V-MIC-5 待人類實機。
import fs from "node:fs";
import { launch, recorder, sleep, resultPath } from "./lib/cdp.mjs";
import { TOAST_RECORDER, fakeTts, fakeStt, fakeMic } from "./lib/inits.mjs";
import { stateRecord, seed } from "./lib/state.mjs";

const R = recorder("e2e-mic");
const READS = `(() => { window.__qaReads = []; const P = window.AnalyserNode && AnalyserNode.prototype; if (!P) return;
  for (const n of ["getFloatTimeDomainData", "getByteTimeDomainData"]) { const o = P[n]; P[n] = function (a) { window.__qaReads.push(performance.now()); return o.call(this, a); }; } })();`;

async function open(mic = "ok", { db = -25, reduced = false } = {}) {
  const p = await launch();
  await p.addInitScript(TOAST_RECORDER);
  await p.addInitScript(fakeTts("ok"));
  await p.addInitScript(fakeStt("ok"));
  await p.addInitScript(fakeMic(mic, db));
  await p.addInitScript(READS);
  await p.viewport(1366, 900);
  if (reduced) await p.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await p.goto();
  // V-MIC 前提：localStorage 已有「STT 說明已讀」
  await seed(p, stateRecord(725, { sttNoticeAcknowledged: true }));
  await p.go("flashcards");
  return p;
}
const st = (p) => p.ev(`(() => { const b = document.querySelector(".fc-front .sp-mic"); const m = document.querySelector(".fc-front .sp-msg"); const r = document.querySelector(".fc-front .sp-result");
  const bars = [...document.querySelectorAll(".fc-front .sp-meter__bar")]; const meter = document.querySelector(".fc-front .sp-meter");
  return { status: b.dataset.status, bars: bars.map((x) => (x.classList.contains("is-on") ? 1 : 0)).join(""), nBars: bars.length, meterShown: !!meter && !meter.hidden && meter.getClientRects().length > 0,
    msg: m && !m.hidden ? m.innerText.replace(/\\s+/g, " ") : "", score: !!(r && !r.hidden && r.querySelector(".sp-result__badge")), dialog: !!document.querySelector(".dialog") }; })()`);
async function micPress(p, wait = "listening") {
  await p.click(".fc-front .sp-mic");
  for (let i = 0; i < 40; i++) { const s = await p.ev(`document.querySelector(".fc-front .sp-mic").dataset.status`); if (!wait || s === wait) break; await sleep(25); }
  await sleep(30);
}
const finish = (p, text = "Latency") => p.ev(`(() => { const r = window.__qaStt.last; r.emitResult(${JSON.stringify(text)}); r.emitEnd(); })()`);
const micInfo = (p) => p.ev(`({ calls: window.__qaMic.calls, live: window.__qaMic.live ? window.__qaMic.live() : 0, states: (window.__qaMic.tracks || []).map((t) => t.readyState).join(","),
  held: EMT.services.mic.tracks().length, active: EMT.services.mic.isActive(), starts: window.__qaStt.starts })`);
const lit = (bars) => (bars.match(/1/g) || []).length;
const contiguous = (bars) => /^1*0*$/.test(bars);
const PAGES = [];

// ═════════ 同頁重用、離開釋放、收音條 ═════════
{
  const p = await open("ok"); PAGES.push(p);

  await R.check("TC-33-01a", "AC-33-01（自動化代理：getUserMedia 呼叫次數）", async () => {
    const log = [];
    await micPress(p); log.push((await st(p)).status); await finish(p); await sleep(80);
    const after1 = await micInfo(p);
    // 期間換卡、翻面、切測驗模式再切回
    await p.click(".fc-next"); await sleep(80); await p.click(".fc-flip"); await sleep(450); await p.click(".fc-flip"); await sleep(450);
    await p.click(".fc-mode-btn"); await sleep(150); await p.click(".fc-mode-btn"); await sleep(150);
    let dialogs = 0;
    for (let i = 0; i < 4; i++) {
      await micPress(p); const s = await st(p); log.push(s.status); if (s.dialog) dialogs++;
      if (i % 2 === 0) await finish(p, "hello"); else await p.click(".fc-front .sp-mic"); // 完成辨識或再按一次停止
      await sleep(100);
    }
    const m = await micInfo(p);
    const ok = after1.calls === 1 && m.calls === 1 && log.every((x) => x === "listening") && dialogs === 0 && m.starts === 5 && m.active;
    return { ok, note: `5 次按下的狀態 ${log.join("、")}；getUserMedia 呼叫：第 1 次後 ${after1.calls}、5 次後 ${m.calls}；SpeechRecognition.start ${m.starts} 次；說明視窗 ${dialogs} 次；仍持有麥克風=${m.active}（真實權限詢問次數列 V-MIC-1）` };
  });

  await R.check("TC-33-03", "AC-33-03", async () => {
    const idle = await st(p);
    const rect0 = await p.ev(`JSON.stringify(document.querySelector(".fc-front .sp-mic").getBoundingClientRect())`);
    await p.ev(`window.__qaReads.length = 0`);
    await micPress(p); await sleep(600);
    const on = await st(p);
    const rect1 = await p.ev(`JSON.stringify(document.querySelector(".fc-front .sp-mic").getBoundingClientRect())`);
    const reads = await p.ev(`window.__qaReads.slice()`);
    const gaps = reads.slice(1).map((t, i) => +(t - reads[i]).toFixed(1));
    const maxGap = Math.max(...gaps);
    // 各種結束方式 → ≤ 100ms 回到全暗
    const ends = [];
    const endCases = [["結果", `r.emitResult("latency"); r.emitEnd();`], ["逾時", `r.emitEnd();`], ["無結果", `r.emitResult("  "); r.emitEnd();`], ["錯誤", `r.emitError("no-speech"); r.emitEnd();`], ["再按停止", null]];
    let litBefore = true;
    for (const [name, code] of endCases) {
      if (name !== "結果") { await micPress(p); await sleep(300); }
      litBefore = litBefore && lit((await st(p)).bars) > 0;
      let ms;
      if (code) {
        ms = await p.ev(`(async () => { const r = window.__qaStt.last; const t0 = performance.now(); ${code}
          for (let i = 0; i < 100; i++) { if (![...document.querySelectorAll(".fc-front .sp-meter__bar")].some((b) => b.classList.contains("is-on"))) return +(performance.now() - t0).toFixed(1); await new Promise((r) => setTimeout(r, 2)); }
          return -1; })()`);
      } else {
        await p.ev(`window.__qaT0 = 0; document.querySelector(".fc-front .sp-mic").addEventListener("click", () => { window.__qaT0 = performance.now(); }, { capture: true, once: true })`);
        await p.click(".fc-front .sp-mic");
        ms = await p.ev(`(async () => { for (let i = 0; i < 100; i++) { if (![...document.querySelectorAll(".fc-front .sp-meter__bar")].some((b) => b.classList.contains("is-on"))) return +(performance.now() - window.__qaT0).toFixed(1); await new Promise((r) => setTimeout(r, 2)); } return -1; })()`);
      }
      await sleep(120);
      const s = await st(p);
      ends.push({ name, ms, bars: s.bars, status: s.status });
    }
    const ok = idle.nBars === 5 && idle.meterShown && idle.bars === "00000" && on.status === "listening" && lit(on.bars) > 0 && contiguous(on.bars) && rect0 === rect1
      && gaps.length >= 5 && maxGap <= 100 && litBefore && ends.every((e) => e.ms >= 0 && e.ms <= 100 && e.bars === "00000" && e.status === "idle");
    return { ok, note: `待機 ${idle.nBars} 格、可見=${idle.meterShown}、${idle.bars}；聆聽中 ${on.bars}（亮格連續=${contiguous(on.bars)}）；麥克風按鈕位置不變=${rect0 === rect1}；音量讀取 ${reads.length} 次、間隔 ms 最大 ${maxGap}（中位數 ${gaps.sort((a, b) => a - b)[Math.floor(gaps.length / 2)]}）；結束後回到全暗 ${ends.map((e) => `${e.name} ${e.ms}ms/${e.bars}/${e.status}`).join("、")}` };
  });

  await R.check("TC-33-04", "AC-33-04", async () => {
    const T = await p.ev(`EMT.core.meter.THRESHOLDS_DBFS.slice()`);
    const levels = [T[0] - 5, (T[0] + T[1]) / 2, (T[1] + T[2]) / 2, (T[2] + T[3]) / 2, (T[3] + T[4]) / 2, T[4] + 5];
    await micPress(p);
    const got = [];
    for (const db of levels) { await p.ev(`window.__qaMic.setDb(${db})`); await sleep(1100); got.push(lit((await st(p)).bars)); }
    await p.ev(`window.__qaMic.setDb(null)`); await sleep(1100); const silent = lit((await st(p)).bars);
    await p.click(".fc-front .sp-mic"); await sleep(120);
    await p.ev(`window.__qaMic.setDb(-25)`);
    const ok = got.join() === "0,1,2,3,4,5" && silent === 0;
    return { ok, note: `門檻 T1～T5 = ${T.join("、")} dBFS（Q-37 預設）；測試音源 ${levels.join("、")} dBFS → 亮格 ${got.join("、")}；靜音 → ${silent}` };
  });

  await R.check("TC-33-02a", "AC-33-02（自動化代理：音軌停止）", async () => {
    const out = [];
    let ok = true;
    for (const [how, act] of [["導覽→主控台", async () => p.go("dashboard")], ["導覽→難易度設定", async () => p.go("customizer")], ["頁尾→資料來源與授權", async () => p.click("#footer-sources")]]) {
      await p.go("flashcards"); await micPress(p); await finish(p); await sleep(80);
      const before = await micInfo(p);
      const t0 = Date.now(); await act();
      let after;
      for (let i = 0; i < 40; i++) { after = await micInfo(p); if (after.live === 0 && after.held === 0) break; await sleep(25); }
      const ms = Date.now() - t0;
      const good = before.live >= 1 && after.live === 0 && after.held === 0 && !after.active && !after.states.includes("live") && ms <= 1000;
      ok = ok && good; out.push(`${how}：離開前 live ${before.live} → 離開後 live ${after.live}、持有 ${after.held}、${ms}ms 內`);
    }
    // 回到單字卡頁再按 → 重新取得
    await p.go("flashcards"); const c0 = (await micInfo(p)).calls; await micPress(p); const c1 = (await micInfo(p)).calls; const s = await st(p); await finish(p); await sleep(80);
    ok = ok && c1 === c0 + 1 && s.status === "listening";
    out.push(`回單字卡頁再按：getUserMedia ${c0} → ${c1}、${s.status}`);
    // 重新整理：pagehide 時已停止（測試的 pagehide 監聽排在產品之後，把音軌狀態寫到 sessionStorage）
    await p.ev(`window.addEventListener("pagehide", () => { sessionStorage.setItem("__qaPagehide", JSON.stringify({ states: window.__qaMic.tracks.map((t) => t.readyState), held: EMT.services.mic.tracks().length })); })`);
    await p.reload();
    const ph = await p.ev(`JSON.parse(sessionStorage.getItem("__qaPagehide"))`);
    ok = ok && ph && ph.held === 0 && !ph.states.includes("live");
    out.push(`重新整理：pagehide 時音軌 ${ph && ph.states.join(",")}、持有 ${ph && ph.held}`);
    return { ok, note: out.join("；") + "（瀏覽器麥克風使用中圖示、關閉分頁列 V-MIC-2）" };
  });
}

// ═════════ 權限被拒（AC-08-09 getUserMedia 路徑）════════
{
  const p = await open("denied"); PAGES.push(p);
  await R.check("TC-08-09b", "AC-08-09（getUserMedia 權限被拒）", async () => {
    const s0 = (await micInfo(p)).starts;
    await micPress(p, null); await sleep(200);
    const a = await st(p); const m1 = await micInfo(p);
    await micPress(p, null); await sleep(200);
    const m2 = await micInfo(p);
    const ok = a.status === "idle" && a.msg.startsWith("需要麥克風權限") && a.msg.includes("開啟方式") && a.bars === "00000" && !a.score && m1.starts === s0 && m1.calls === 1 && m2.calls === 2 && m2.starts === s0 && p.log.exceptions.length === 0;
    return { ok, note: `「${a.msg}」、${a.status}、收音條 ${a.bars}、分數=${a.score}；SpeechRecognition.start ${s0}→${m1.starts}；再按會重新嘗試 getUserMedia ${m1.calls}→${m2.calls}；例外 ${p.log.exceptions.length}（真實權限「封鎖」列 V-MIC-4）` };
  });
}

// ═════════ 找不到麥克風（AC-33-05）════════
{
  const p = await open("notfound"); PAGES.push(p);
  await R.check("TC-33-05", "AC-33-05", async () => {
    const s0 = (await micInfo(p)).starts;
    await micPress(p, null); await sleep(200);
    const a = await st(p); const m = await micInfo(p);
    const ok = a.status === "idle" && a.msg.includes("找不到麥克風裝置") && a.msg.includes("請確認裝置已連接麥克風後再按一次") && a.bars === "00000" && !a.score && m.starts === s0 && p.log.exceptions.length === 0;
    return { ok, note: `「${a.msg}」、${a.status}、收音條 ${a.bars}、分數=${a.score}、辨識開始 ${m.starts - s0} 次、例外 ${p.log.exceptions.length}（實機拔除列 V-MIC-5）` };
  });
}

// ═════════ 拔除麥克風（AC-33-06）════════
{
  const p = await open("ok"); PAGES.push(p);
  await R.check("TC-33-06", "AC-33-06", async () => {
    const out = [];
    // (a) 未聆聽時拔除，再按：另有可用麥克風 → 正常聆聽
    await micPress(p); await finish(p); await sleep(80);
    const c0 = (await micInfo(p)).calls;
    await p.ev(`window.__qaMic.unplug()`); await sleep(80);
    await micPress(p); const a1 = await st(p); const c1 = (await micInfo(p)).calls; await finish(p); await sleep(80);
    out.push(`(a) 拔除後再按（仍有麥克風）：getUserMedia ${c0}→${c1}、${a1.status}`);
    // (a) 沒有其他麥克風 → AC-33-05
    await p.ev(`window.__qaMic.unplug(); window.__qaMic.mode = "notfound";`); await sleep(80);
    await micPress(p, null); await sleep(200); const a2 = await st(p);
    out.push(`(a) 拔除後再按（無麥克風）：「${a2.msg}」、${a2.status}、${a2.bars}`);
    // (b) 聆聽中拔除
    await p.ev(`window.__qaMic.mode = "ok"`);
    await micPress(p); await sleep(300); const b0 = await st(p);
    const ms = await p.ev(`(async () => { const t0 = performance.now(); window.__qaMic.unplug();
      for (let i = 0; i < 100; i++) { const b = document.querySelector(".fc-front .sp-mic"); if (b.dataset.status === "idle" && ![...document.querySelectorAll(".fc-front .sp-meter__bar")].some((x) => x.classList.contains("is-on"))) return +(performance.now() - t0).toFixed(1); await new Promise((r) => setTimeout(r, 2)); }
      return -1; })()`);
    await sleep(150); const b1 = await st(p);
    out.push(`(b) 聆聽中拔除（前 ${b0.status}/${b0.bars}）：${ms}ms 回到 ${b1.status}/${b1.bars}、訊息「${b1.msg}」、分數=${b1.score}`);
    const ok = c1 === c0 + 1 && a1.status === "listening" && a2.status === "idle" && a2.msg.includes("找不到麥克風裝置") && a2.bars === "00000"
      && b0.status === "listening" && lit(b0.bars) > 0 && ms >= 0 && ms <= 100 && b1.status === "idle" && b1.bars === "00000" && !b1.score && (b1.msg.includes("找不到麥克風裝置") || b1.msg.includes("需要麥克風權限")) && p.log.exceptions.length === 0;
    return { ok, note: out.join("；") + `；例外 ${p.log.exceptions.length}（實機拔除列 V-MIC-5）` };
  });
}

// ═════════ getUserMedia 不存在或其他失敗（AC-33-07）════════
{
  const out = []; let ok = true;
  for (const mode of ["missing", "nogum", "notreadable"]) {
    const p = await open(mode); PAGES.push(p);
    const s0 = (await micInfo(p).catch(() => ({ starts: 0 }))).starts;
    await micPress(p); const a = await st(p);
    const starts = await p.ev(`window.__qaStt.starts`);
    await finish(p, "the"); await sleep(120); const b = await st(p);
    const good = a.status === "listening" && a.bars === "00000" && !a.msg && starts === s0 + 1 && b.score && b.bars === "00000" && p.log.exceptions.length === 0;
    ok = ok && good; out.push(`${mode}：${a.status}、收音條 ${a.bars}、訊息「${a.msg}」、辨識開始 ${starts - s0}、評分顯示=${b.score}`);
    await p.close();
  }
  R[ok ? "pass" : "fail"]("TC-33-07", "AC-33-07", out.join("；"));
}

// ═════════ 減少動態（AC-33-08）════════
{
  const p = await open("ok", { reduced: true }); PAGES.push(p);
  await R.check("TC-33-08", "AC-33-08、AC-31-03（聆聽中）", async () => {
    const mq = await p.ev(`matchMedia("(prefers-reduced-motion: reduce)").matches`);
    await micPress(p); await sleep(800);
    const sty = await p.ev(`(() => { const b = document.querySelector(".fc-front .sp-mic"); const s = getComputedStyle(b); const bars = [...document.querySelectorAll(".fc-front .sp-meter__bar")].map((x) => getComputedStyle(x));
      return { anim: s.animationName, animDur: s.animationDuration, text: b.innerText, barTrans: [...new Set(bars.map((x) => x.transitionDuration))].join(","), barAnim: [...new Set(bars.map((x) => x.animationName))].join(",") }; })()`);
    const a = await st(p);
    await p.ev(`window.__qaMic.setDb(-5)`); await sleep(600); const b = await st(p);
    await p.ev(`window.__qaMic.setDb(-45)`); await sleep(600); const c = await st(p);
    await p.click(".fc-front .sp-mic"); await sleep(100);
    const ok = mq && (sty.anim === "none" || /^0s/.test(sty.animDur)) && sty.text.includes("聆聽中") && sty.barTrans.split(",").every((x) => /^0s/.test(x)) && sty.barAnim === "none" && lit(b.bars) === 5 && lit(c.bars) === 1 && lit(a.bars) > 0;
    return { ok, note: `prefers-reduced-motion=${mq}；聆聽中按鈕 animation=${sty.anim}/${sty.animDur}、文字「${sty.text}」；收音條 transition=${sty.barTrans}、animation=${sty.barAnim}；音量 −25/−5/−45 dBFS → ${a.bars}/${b.bars}/${c.bars}（實機列 V-MIC-3）` };
  });
}

// ═════════ AC-21-03 執行期：使用 STT 與收音條後不留音訊 ═════════
{
  const p = await open("ok"); PAGES.push(p);
  await R.check("TC-21-03b", "AC-21-03（執行期，v0.9 收音條）", async () => {
    for (let i = 0; i < 3; i++) { await micPress(p); await p.ev(`window.__qaMic.setDb(${-45 + i * 15})`); await sleep(400); await finish(p, "latency"); await sleep(100); }
    await p.go("dashboard"); await sleep(200);
    const ls = await p.ev(`(() => { const out = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); out[k] = localStorage.getItem(k); } return out; })()`);
    const keys = Object.keys(ls);
    const data = JSON.parse(ls["englishMasterTrack:state"]).data;
    const dataKeys = Object.keys(data).sort().join(",");
    const audioLike = /audio|base64|data:|blob:|wav|webm|ogg|rms|dbfs|level|meter|volume/i.test(ls["englishMasterTrack:state"]);
    const idb = await p.ev(`(async () => { try { return (await indexedDB.databases()).map((d) => d.name); } catch (e) { return "例外：" + e.name; } })()`);
    const cache = await p.ev(`(async () => { try { return await caches.keys(); } catch (e) { return "不可用：" + e.name; } })()`);
    const downloads = fs.readdirSync(p.downloads);
    const reqs = p.log.requests.filter((r) => !r.url.startsWith("file:") && !r.url.startsWith("data:"));
    const ok = keys.length === 1 && keys[0] === "englishMasterTrack:state" && dataKeys === "customVocab,flashcardPosition,goal,learnedHistory,masteredWordKeys,part5,part5CorrectIds,part5UnansweredOnly,streak,sttNoticeAcknowledged,todayLearned,vocabQuiz" /* 第 7 輪：v0.15 data 12 欄（C-8） */ && !audioLike
      && Array.isArray(idb) && idb.length === 0 && (!Array.isArray(cache) || cache.length === 0) && downloads.length === 0 && reqs.length === 0;
    return { ok, note: `localStorage 鍵 ${keys.join("、")}；data 欄位 ${dataKeys}；含音訊／音量樣式字串=${audioLike}；IndexedDB ${JSON.stringify(idb)}；Cache Storage ${JSON.stringify(cache)}；下載 ${downloads.length} 個；非 file: 網路請求 ${reqs.length}` };
  });
}

const exc = PAGES.flatMap((p) => p.log.exceptions);
R[exc.length === 0 ? "pass" : "fail"]("TC-X-mic", "（全套件）無未處理例外", `例外：${JSON.stringify(exc).slice(0, 400)}`);
for (const p of PAGES) await p.close();
R.save(resultPath("e2e-mic"));
