// QA E2E 套件 3：TTS（US-07）、STT 辨識吻合度（US-08）、AC-22-03、AC-21-03（執行期）
// 語音 API 以注入的假物件模擬（architecture.md §10）；真實麥克風與語音列人工驗收。
// 第 3 輪（PRD v0.9）：按麥克風會先以 getUserMedia 取得麥克風（收音條），以 fakeMic 替身提供測試音源；
// 收音條與麥克風生命週期（US-33）另見 e2e-mic.mjs。
import { launch, recorder, sleep, resultPath } from "./lib/cdp.mjs";
import { TOAST_RECORDER, fakeTts, fakeStt, fakeMic } from "./lib/inits.mjs";
import { injectTpl } from "./lib/state.mjs"; // 第 6 輪：範本按鈕隱藏（AC-43-01），改以 store 注入前置資料

const R = recorder("e2e-speech");
const KEY = "englishMasterTrack:state";

async function open({ tts = "ok", stt = "ok", mic = "ok" } = {}) {
  const p = await launch();
  await p.addInitScript(TOAST_RECORDER);
  await p.addInitScript(fakeTts(tts));
  await p.addInitScript(fakeStt(stt));
  await p.addInitScript(fakeMic(mic));
  await p.viewport(1366, 900);
  await p.goto();
  return p;
}
const toastsSince = (p, n) => p.ev(`window.__qaToasts.slice(${n}).map((t) => t.text)`);
const tc = (p) => p.ev(`window.__qaToasts.length`);
async function addWord(p, w, m = "測試") { await p.go("customizer"); await p.type("#cv-word", w); await p.type("#cv-meaning", m); await p.click('.cv-form button[type="submit"]'); await sleep(60); }
async function gotoWord(p, w) {
  await p.go("flashcards");
  const i = await p.ev(`EMT.store.getState().runtime.studySet.findIndex((c) => (c.word || (c.item && c.item.word)) === ${JSON.stringify(w)})`);
  if (i < 0) throw new Error("單字集找不到 " + w);
  await p.ev(`EMT.store.actions.gotoCard(${i})`); await sleep(40);
}
const panel = (p) => p.ev(`(() => { const b = document.querySelector(".fc-front .sp-mic"); const m = document.querySelector(".fc-front .sp-msg"); const r = document.querySelector(".fc-front .sp-result");
  const bars = [...document.querySelectorAll(".fc-front .sp-meter__bar")].map((x) => (x.classList.contains("is-on") ? 1 : 0)).join("");
  return { bars, status: b.dataset.status, listening: b.classList.contains("is-listening"), micText: b.innerText, micAria: b.getAttribute("aria-disabled"), micTitle: b.getAttribute("title"), micDisabled: b.hasAttribute("disabled"),
    msg: m && !m.hidden ? m.innerText : "", result: r && !r.hidden ? r.innerText : "", badge: r && !r.hidden && r.querySelector(".sp-result__badge") ? r.querySelector(".sp-result__badge").textContent : "",
    light: r && !r.hidden && r.querySelector(".sp-result__light") ? r.querySelector(".sp-result__light").textContent : "", lightColor: r && !r.hidden ? getComputedStyle(r.querySelector(".sp-result__badge")).backgroundColor : "" }; })()`);
/** 按麥克風並等待進入聆聽中（v0.9：先取得麥克風，為非同步） */
async function micOn(p) {
  await p.click(".fc-front .sp-mic");
  for (let i = 0; i < 40; i++) { if ((await p.ev(`document.querySelector(".fc-front .sp-mic").dataset.status`)) === "listening") break; await sleep(25); }
  await sleep(20);
}
async function speakAndScore(p, recognized) {
  await micOn(p);
  await p.ev(`(() => { const r = window.__qaStt.last; r.emitResult(${JSON.stringify(recognized)}); r.emitEnd(); })()`); await sleep(60);
  return panel(p);
}

// ═════════ 一般環境（TTS、STT 皆可用） ═════════
{
  const p = await open();
  await p.go("customizer");
  for (const t of ["cs"]) { await injectTpl(p, t); await sleep(80); }
  for (const w of ["sitting", "comply with", "abcdefghij", "abcdefghi", "abcdefghijklmnopqrst", "abcdefghijklmnopqrstuvwxy"]) await addWord(p, w);

  // AC-08-13：首次說明（先做，localStorage 尚無已讀）
  await R.check("TC-08-13", "AC-08-13", async () => {
    await gotoWord(p, "Latency");
    const badge = await p.ev(`document.querySelector(".fc-front .sp-net").textContent`);
    const s0 = await p.ev(`window.__qaStt.starts`);
    await p.click(".fc-front .sp-mic"); await sleep(120);
    const dlg1 = await p.ev(`(() => { const d = document.querySelector(".dialog"); return d ? { text: d.querySelector(".dialog__message").textContent, ok: d.querySelector('[data-action="ok"]').textContent, cancel: d.querySelector('[data-action="cancel"]').textContent } : null; })()`);
    await p.click('.dialog [data-action="cancel"]'); await sleep(100);
    const a = await panel(p); const s1 = await p.ev(`window.__qaStt.starts`); const ack1 = await p.ev(`EMT.store.getState().data.sttNoticeAcknowledged`); const g1 = await p.ev(`window.__qaMic.calls`);
    await p.click(".fc-front .sp-mic"); await sleep(120);
    const dlg2 = await p.ev(`!!document.querySelector(".dialog")`);
    await p.click('.dialog [data-action="ok"]'); await sleep(250);
    const b = await panel(p); const s2 = await p.ev(`window.__qaStt.starts`); const g2 = await p.ev(`window.__qaMic.calls`);
    const stored = await p.ev(`JSON.parse(localStorage.getItem(${JSON.stringify(KEY)})).data.sttNoticeAcknowledged`);
    await p.click(".fc-front .sp-mic"); await sleep(80); // 停止
    await p.click(".fc-front .sp-mic"); await sleep(250);
    const dlg3 = await p.ev(`!!document.querySelector(".dialog")`); const s3 = await p.ev(`window.__qaStt.starts`);
    await p.click(".fc-front .sp-mic"); await sleep(80);
    const expText = "語音辨識由瀏覽器提供，您的語音會傳送到瀏覽器廠商（如 Google、Microsoft）的伺服器處理；本系統只即時讀取音量以顯示收音條，不錄音、不保存、不上傳錄音。停留在單字卡頁期間，瀏覽器可能持續顯示麥克風使用中圖示，離開單字卡頁即停止使用麥克風";
    const ok = badge === "需要連網" && dlg1 && dlg1.text === expText && dlg1.ok === "我知道了" && dlg1.cancel === "取消" && s1 === s0 && g1 === 0 && a.status === "idle" && ack1 === false && dlg2 && s2 === s1 + 1 && g2 === 1 && b.status === "listening" && stored === true && !dlg3 && s3 === s2 + 1;
    return { ok, note: `常駐標示「${badge}」；首次按下說明「${dlg1 && dlg1.text}」[${dlg1 && dlg1.ok}/${dlg1 && dlg1.cancel}]；取消後 starts ${s0}→${s1}、getUserMedia 呼叫 ${g1}、狀態 ${a.status}、已讀 ${ack1}；「我知道了」後 getUserMedia ${g2}；再按仍顯示說明=${dlg2}；我知道了 → starts ${s2}、狀態 ${b.status}、localStorage 已讀 ${stored}；之後再按顯示說明=${dlg3}` };
  });

  await R.check("TC-07-01", "AC-07-01、AC-07-02", async () => {
    await gotoWord(p, "Latency");
    const n = await p.ev(`window.__qaTts.spoken.length`);
    await p.click(".fc-front .sp-tts__btn", 0); await sleep(100);
    await p.click(".fc-front .sp-tts__btn", 1); await sleep(100);
    const sp = await p.ev(`window.__qaTts.spoken.slice(${n})`);
    return { ok: sp.length === 2 && sp[0].lang === "en-US" && sp[0].rate === 1 && sp[0].text === "Latency" && sp[1].lang === "en-US" && sp[1].rate === 0.75 && sp[0].voice === "QA en-US local", note: JSON.stringify(sp) };
  });
  await R.check("TC-07-03", "AC-07-03", async () => {
    const c0 = await p.ev(`window.__qaTts.cancels`); const n = await p.ev(`window.__qaTts.spoken.length`);
    await p.click(".fc-front .sp-tts__btn", 0); await sleep(60);
    const c1 = await p.ev(`window.__qaTts.cancels`);
    await p.click(".fc-front .sp-tts__btn", 1); await sleep(60);
    const c2 = await p.ev(`window.__qaTts.cancels`);
    await p.click(".fc-next"); await sleep(60);
    const c3 = await p.ev(`window.__qaTts.cancels`);
    const sp = await p.ev(`window.__qaTts.spoken.slice(${n})`);
    return { ok: c1 > c0 && c2 > c1 && c3 > c2 && sp.every((s) => s.queueBefore === false), note: `cancel 次數：播放前 ${c0} → 第一次播放 ${c1} → 播放中再按 ${c2} → 切換卡片 ${c3}；每次 speak 前皆已無朗讀中=${sp.every((s) => s.queueBefore === false)}` };
  });

  await R.check("TC-08-01", "AC-08-01", async () => {
    await gotoWord(p, "Latency");
    const idle = await panel(p);
    await micOn(p); await sleep(300);
    const a = await panel(p); const r = await p.ev(`({ lang: window.__qaStt.last.lang, interim: window.__qaStt.last.interimResults, started: window.__qaStt.last.started })`);
    await p.click(".fc-front .sp-mic"); await sleep(80);
    const lit = (a.bars.match(/1/g) || []).length;
    return { ok: r.lang === "en-US" && r.started && a.status === "listening" && a.listening && a.micText.includes("聆聽中") && idle.bars === "00000" && lit > 0,
      note: `lang=${r.lang}、interimResults=${r.interim}；按鈕狀態 ${a.status}、文字「${a.micText}」；收音條 待機 ${idle.bars} → 聆聽中（替身 −25 dBFS）${a.bars}` };
  });
  await R.check("TC-08-03", "AC-08-03", async () => { await gotoWord(p, "Latency"); const r = await speakAndScore(p, "Latency."); return { ok: r.badge.includes("100") && r.light === "綠燈", note: `Latency. → ${r.badge}、${r.light}` }; });
  await R.check("TC-08-04", "AC-08-04", async () => { await gotoWord(p, "address"); const r = await speakAndScore(p, "adress"); return { ok: /\b86\b/.test(r.badge), note: `address ← adress → ${r.badge}、${r.light}` }; });
  await R.check("TC-08-05", "AC-08-05", async () => { await gotoWord(p, "sitting"); const r = await speakAndScore(p, "kitten"); return { ok: /\b57\b/.test(r.badge) && r.light === "紅燈", note: `sitting ← kitten → ${r.badge}、${r.light}` }; });
  await R.check("TC-08-12", "AC-08-12", async () => {
    await gotoWord(p, "comply with"); const a = await speakAndScore(p, "Comply with."); const b = await speakAndScore(p, "complied with");
    return { ok: /\b100\b/.test(a.badge) && /\b75\b/.test(b.badge) && b.light === "黃燈", note: `Comply with. → ${a.badge}；complied with → ${b.badge}、${b.light}` };
  });
  await R.check("TC-08-06", "AC-08-06、AC-08-07、AC-08-08", async () => {
    const cases = [["abcdefghij", "abcdefghij", 100, "綠燈"], ["abcdefghij", "abcdefghiz", 90, "綠燈"], ["abcdefghi", "abcdefghz", 89, "黃燈"], ["abcdefghijklmnopqrst", "abcdefghijklmzzzzzzz", 65, "黃燈"],
      ["abcdefghijklmnopqrstuvwxy", "abcdefghijklmnopzzzzzzzzz", 64, "紅燈"], ["abcdefghij", "zzzzzzzzzz", 0, "紅燈"]];
    const out = []; let ok = true; const colors = {};
    for (const [w, rec, sc, light] of cases) {
      await gotoWord(p, w); const r = await speakAndScore(p, rec);
      const tipShown = r.result.includes("放慢速度或重聽 0.75x 示範");
      const cmp = r.result.includes("辨識文字") && r.result.includes("目標文字") && r.result.includes(rec) && r.result.includes(w);
      const good = new RegExp("\\b" + sc + "\\b").test(r.badge) && r.light === light && (light === "黃燈" ? tipShown : !tipShown) && (light === "紅燈" ? cmp : !r.result.includes("辨識文字"));
      colors[light] = r.lightColor; ok = ok && good; out.push(`${sc}→${r.badge}/${r.light}${tipShown ? "/提示" : ""}${cmp ? "/並列" : ""}`);
    }
    return { ok: ok && new Set(Object.values(colors)).size === 3, note: out.join("；") + `；徽章底色 ${JSON.stringify(colors)}` };
  });
  await R.check("TC-08-11", "AC-08-11", async () => {
    await gotoWord(p, "Latency"); const r = await speakAndScore(p, "latency");
    const title = await p.ev(`document.querySelector(".fc-front .sp-result__title").textContent`);
    const note = await p.ev(`document.querySelector(".fc-front .sp-result__note").textContent`);
    const body = await p.ev(`document.body.innerText.includes("發音評分")`);
    return { ok: title === "辨識吻合度" && note === "此分數比對的是語音辨識出的文字，不代表音素層級的發音準確度" && !body, note: `標題「${title}」；說明「${note}」；畫面含「發音評分」=${body}` };
  });
  await R.check("TC-08-09", "AC-08-09（含 §7.6 錯誤對照表）", async () => {
    const out = []; let ok = true;
    const exp = { "not-allowed": ["需要麥克風權限", "開啟方式"], "service-not-allowed": ["需要麥克風權限", "開啟方式"], "audio-capture": ["找不到麥克風裝置", "請確認裝置已連接麥克風後再按一次"],
      "network": ["語音辨識需要網路連線", ""], "no-speech": ["未偵測到語音，請再試一次", ""], "aborted": ["語音辨識發生錯誤，請稍後再試一次", ""], "language-not-supported": ["語音辨識發生錯誤，請稍後再試一次", ""] };
    for (const [code, [main, help]] of Object.entries(exp)) {
      await gotoWord(p, "Latency");
      await micOn(p);
      await p.ev(`(() => { const r = window.__qaStt.last; r.emitError(${JSON.stringify(code)}); r.emitEnd(); })()`); await sleep(60);
      const r = await panel(p);
      const good = r.msg.startsWith(main) && (!help || r.msg.includes(help)) && r.status === "idle" && !r.result && r.bars === "00000";
      ok = ok && good; out.push(`${code}：「${r.msg.replace(/\n/g, " ")}」、${r.status}、收音條 ${r.bars}${r.result ? "、顯示分數" : ""}`);
    }
    return { ok: ok && p.log.exceptions.length === 0, note: out.join("；") };
  });
  await R.check("TC-08-10", "AC-08-10", async () => {
    const out = []; let ok = true;
    await gotoWord(p, "Latency");
    // (a) 空結果
    await micOn(p);
    await p.ev(`(() => { const r = window.__qaStt.last; r.emitResult("  "); r.emitEnd(); })()`); await sleep(60);
    let r = await panel(p); ok = ok && r.msg === "未偵測到語音，請再試一次" && !r.result && r.status === "idle"; out.push(`空結果：「${r.msg}」${r.result ? "（顯示分數）" : ""}、${r.status}`);
    // (b) 逾時：無結果直接結束
    await micOn(p);
    await p.ev(`window.__qaStt.last.emitEnd()`); await sleep(60);
    r = await panel(p); ok = ok && r.msg === "未偵測到語音，請再試一次" && !r.result && r.status === "idle"; out.push(`逾時：「${r.msg}」、${r.status}`);
    // (c) 再按一次停止
    await micOn(p);
    const mid = await panel(p);
    await p.click(".fc-front .sp-mic"); await sleep(100);
    r = await panel(p); ok = ok && mid.status === "listening" && r.status === "idle" && !r.msg && !r.result; out.push(`再按停止：${mid.status} → ${r.status}、訊息「${r.msg}」`);
    return { ok, note: out.join("；") };
  });
  await R.check("TC-22-03", "AC-22-03", async () => {
    await gotoWord(p, "Latency");
    const times = [];
    for (let i = 0; i < 10; i++) {
      await micOn(p);
      times.push(await p.ev(`(async () => { const r = window.__qaStt.last; const t0 = performance.now(); r.emitResult(${JSON.stringify(i % 2 ? "latensy" : "Latency")});
        await new Promise((res) => requestAnimationFrame(() => setTimeout(res, 0))); const ok = !!document.querySelector(".fc-front .sp-result:not([hidden]) .sp-result__badge"); r.emitEnd(); return ok ? +(performance.now() - t0).toFixed(1) : -1; })()`));
      await sleep(30);
    }
    const srt = [...times].sort((a, b) => a - b);
    return { ok: times.every((t) => t >= 0 && t <= 100), // AC-22-03 每次 ≤ 100ms
      note: `onresult → 徽章繪製 ms：${times.join("、")}；中位數 ${srt[4]}、p90 ${srt[8]}、最大 ${srt[9]}（無頭 Chrome、未降速）` };
  });
  await R.check("TC-21-03", "AC-21-03（執行期）", async () => {
    const raw = await p.ev(`(() => { const out = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); out[k] = localStorage.getItem(k).length; } return out; })()`);
    const s = await p.ev(`localStorage.getItem(${JSON.stringify(KEY)})`);
    const hasAudio = /audio|base64|data:|blob:|wav|webm|ogg/i.test(s);
    const api = await p.ev(`typeof window.__qaMR`);
    return { ok: !hasAudio && Object.keys(raw).every((k) => k.startsWith("englishMasterTrack:")), note: `localStorage 鍵與長度 ${JSON.stringify(raw)}；含音訊樣式字串=${hasAudio}` };
  });
  await R.check("TC-08-14", "AC-08-14", async () => {
    await p.send("Network.emulateNetworkConditions", { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }); await sleep(100);
    const online = await p.ev(`navigator.onLine`);
    await gotoWord(p, "Throughput");
    const s0 = await p.ev(`window.__qaStt.starts`);
    await p.click(".fc-front .sp-mic"); await sleep(150);
    const r = await panel(p); const s1 = await p.ev(`window.__qaStt.starts`);
    // 開始後才斷線（辨識服務回 network 錯誤）
    await p.send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }); await sleep(80);
    await micOn(p);
    await p.ev(`(() => { const x = window.__qaStt.last; x.emitError("network"); x.emitEnd(); })()`); await sleep(60);
    const r2 = await panel(p);
    return { ok: online === false && r.msg === "語音辨識需要網路連線" && r.status === "idle" && !r.result && r.bars === "00000" && s1 === s0 && r2.msg === "語音辨識需要網路連線" && r2.status === "idle" && !r2.result && r2.bars === "00000" && p.log.exceptions.length === 0,
      note: `離線 navigator.onLine=${online}：「${r.msg}」、${r.status}、收音條 ${r.bars}、未開始辨識=${s1 === s0}、顯示分數=${!!r.result}；辨識中 network 錯誤：「${r2.msg}」、${r2.status}、收音條 ${r2.bars}、顯示分數=${!!r2.result}` };
  });
  // 同一張卡先有評分結果，再於離線時按下麥克風
  await R.check("TC-08-14b", "AC-08-14", async () => {
    await gotoWord(p, "Scalability");
    const r0 = await speakAndScore(p, "scalability");
    await p.send("Network.emulateNetworkConditions", { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }); await sleep(100);
    await p.click(".fc-front .sp-mic"); await sleep(150);
    const r = await panel(p);
    const last = await p.ev(`JSON.stringify(EMT.store.getState().runtime.speech.lastResult)`);
    await p.send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }); await sleep(100);
    // 恢復連線後再評分一次，確認清除動作未影響正常評分路徑（BUG-001 回歸）
    const r3 = await speakAndScore(p, "scalability");
    return { ok: r.msg === "語音辨識需要網路連線" && r.status === "idle" && !r.result && last === "null" && r3.badge === r0.badge && r3.light === r0.light,
      note: `先評分 ${r0.badge}/${r0.light}，離線再按麥克風：訊息「${r.msg}」、${r.status}、分數區文字「${r.result.replace(/\n+/g, " ")}」、lastResult=${last}；恢復連線再評分 ${r3.badge}/${r3.light}` };
  });
  await R.check("TC-X-speech", "（全套件）無未處理例外", async () => ({ ok: p.log.exceptions.length === 0, note: JSON.stringify(p.log.exceptions).slice(0, 300) }));
  await p.close();
}

// ═════════ 不支援環境 ═════════
{
  const p = await open({ tts: "unsupported", stt: "unsupported" });
  await R.check("TC-07-04", "AC-07-04", async () => {
    await p.go("flashcards");
    const b = await p.ev(`[...document.querySelectorAll(".fc-front .sp-tts__btn")].map((x) => ({ aria: x.getAttribute("aria-disabled"), title: x.getAttribute("title"), disabled: x.hasAttribute("disabled"), opacity: getComputedStyle(x).opacity, cursor: getComputedStyle(x).cursor }))`);
    const n = await tc(p);
    await p.click(".fc-front .sp-tts__btn", 0); await sleep(100);
    const t = await toastsSince(p, n);
    await p.click(".fc-flip"); const flipped = await p.ev(`document.querySelector(".fc-card").dataset.flipped`);
    await p.click(".fc-flip"); await sleep(420); // v0.8：等翻卡動畫（360ms）結束再點正面按鈕
    return { ok: b.length === 2 && b.every((x) => x.aria === "true" && x.title && !x.disabled) && t.some((x) => x.includes("不支援")) && flipped === "true" && p.log.exceptions.length === 0,
      note: `按鈕 ${JSON.stringify(b)}；點擊 toast ${JSON.stringify(t)}；其他功能（翻面）正常=${flipped === "true"}` };
  });
  await R.check("TC-08-02", "AC-08-02", async () => {
    const r = await panel(p); const n = await tc(p);
    await p.click(".fc-front .sp-mic"); await sleep(100);
    const t = await toastsSince(p, n); const r2 = await panel(p);
    const g = await p.ev(`window.__qaMic.calls`);
    return { ok: r.micAria === "true" && !!r.micTitle && !r.micDisabled && t.includes("建議使用 Google Chrome / Edge") && r2.status === "idle" && g === 0 && r2.bars === "00000" && p.log.exceptions.length === 0,
      note: `麥克風 aria-disabled=${r.micAria}、title「${r.micTitle}」、disabled 屬性=${r.micDisabled}；toast ${JSON.stringify(t)}；狀態 ${r2.status}；getUserMedia 呼叫 ${g}（應 0）；收音條 ${r2.bars}` };
  });
  await p.close();
}
{
  const p = await open({ tts: "novoice" });
  await R.check("TC-07-05", "AC-07-05", async () => {
    await p.go("flashcards"); const n = await tc(p);
    await p.click(".fc-front .sp-tts__btn", 0); await sleep(300);
    const t = await toastsSince(p, n); const sp = await p.ev(`window.__qaTts.spoken.length`);
    return { ok: t.includes("此裝置未安裝美式英語語音") && sp === 0 && p.log.exceptions.length === 0, note: `toast ${JSON.stringify(t)}；實際朗讀 ${sp} 次；未處理例外 ${p.log.exceptions.length}` };
  });
  await p.close();
}

R.save(resultPath("e2e-speech"));
