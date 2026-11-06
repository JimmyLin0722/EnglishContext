// QA E2E：以 Page.addScriptToEvaluateOnNewDocument 注入的模擬環境（architecture.md §10「E2E」）

/** 記錄所有出現過的 toast 文字（toast 會自動消失，故以 MutationObserver 收集） */
export const TOAST_RECORDER = `
(() => {
  window.__qaToasts = [];
  const seen = new WeakSet();
  const grab = (n) => {
    if (!n || n.nodeType !== 1) return;
    const list = n.matches && n.matches(".toast") ? [n] : (n.querySelectorAll ? [...n.querySelectorAll(".toast")] : []);
    for (const t of list) { if (!seen.has(t)) { seen.add(t); window.__qaToasts.push({ text: t.textContent, kind: t.getAttribute("data-kind") || "", at: performance.now() }); } }
  };
  new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) grab(n); })
    .observe(document, { childList: true, subtree: true });
})();
`;

/**
 * 假的 speechSynthesis / SpeechSynthesisUtterance。
 * mode："ok"（有 en-US 本機語音）、"novoice"（只有非 en-US 語音）、"unsupported"（API 不存在）
 */
export function fakeTts(mode = "ok") {
  return `
(() => {
  const mode = ${JSON.stringify(mode)};
  window.__qaTts = { spoken: [], cancels: 0, mode };
  if (mode === "unsupported") {
    try { Object.defineProperty(window, "speechSynthesis", { value: undefined, configurable: true, writable: true }); } catch (e) {}
    try { Object.defineProperty(window, "SpeechSynthesisUtterance", { value: undefined, configurable: true, writable: true }); } catch (e) {}
    return;
  }
  const voices = mode === "novoice"
    ? [{ name: "QA zh-TW", lang: "zh-TW", localService: true, default: true, voiceURI: "qa-zh" }]
    : [{ name: "QA en-GB", lang: "en-GB", localService: true, default: false, voiceURI: "qa-gb" },
       { name: "QA en-US remote", lang: "en-US", localService: false, default: false, voiceURI: "qa-us-r" },
       { name: "QA en-US local", lang: "en_US", localService: true, default: true, voiceURI: "qa-us-l" }];
  class U { constructor(text) { this.text = text; this.lang = ""; this.rate = 1; this.voice = null; this.onend = null; this.onerror = null; this.onstart = null; } }
  const synth = {
    speaking: false, pending: false, paused: false,
    getVoices() { return voices.slice(); },
    speak(u) { window.__qaTts.spoken.push({ text: u.text, lang: u.lang, rate: u.rate, voice: u.voice && u.voice.name, queueBefore: synth.speaking }); synth.speaking = true; },
    cancel() { window.__qaTts.cancels++; synth.speaking = false; },
    pause() {}, resume() {},
    addEventListener() {}, removeEventListener() {}, onvoiceschanged: null,
  };
  Object.defineProperty(window, "speechSynthesis", { value: synth, configurable: true, writable: true });
  Object.defineProperty(window, "SpeechSynthesisUtterance", { value: U, configurable: true, writable: true });
})();
`;
}

/**
 * 假的 SpeechRecognition（第 10 輪改為 V-STT-STUB，architecture v0.15 §10.12 Q1）。mode："ok" 或 "unsupported"。
 * 測試以 window.__qaStt.last 取得最近一個實例，呼叫 emitAudioStart() / emitSoundStart() / emitSpeechStart() /
 * emitResult(text) / emitNomatch() / emitError(code) / emitEnd()。
 *
 * opts.audioStart：true = 模擬「支援 audiostart」（建構子設 onaudiostart、onsoundstart、onspeechstart、onnomatch = null，
 *   產品以 "onaudiostart" in rec 判定）；false = 完全不定義這 4 個屬性（模擬不支援，產品走 T_FALLBACK 1500 ms 後備）。
 *   省略時依環境變數 QA_STT_AUDIOSTART："0" 為不支援，其他（預設）為支援。
 * opts.autoAudioStartMs：支援時，start() 後幾 ms 自動觸發 audiostart（模擬引擎開始收音；預設 200）；null 不自動。
 *   執行中可改 window.__qaStt.autoMs（null 停用）。不支援時一律不自動觸發。
 * window.__qaStt.throwOnStart = true：下一次 start() 拋出例外（AC-58-08）。
 * window.__qaStt.log：替身事件時間軸 [{ ev, t, i }]（t = performance.now()，i = 實例序號），含 "start-return"。
 * window.__qaMicSeq：頁面中任一 .sp-mic 的 data-status 變化 [{ s, t }]（MutationObserver，供「先準備中再聆聽中」斷言）。
 */
export function fakeStt(mode = "ok", opts = {}) {
  const audioStart = opts.audioStart !== undefined ? !!opts.audioStart : process.env.QA_STT_AUDIOSTART !== "0";
  const autoMs = opts.autoAudioStartMs !== undefined ? opts.autoAudioStartMs : 200;
  return `
(() => {
  const mode = ${JSON.stringify(mode)};
  const AS = ${JSON.stringify(audioStart)};
  const Q = window.__qaStt = { instances: [], starts: 0, stops: 0, aborts: 0, last: null, audioStart: AS, autoMs: AS ? ${JSON.stringify(autoMs)} : null, throwOnStart: false, log: [] };
  window.__qaMicSeq = [];
  try {
    new MutationObserver((ms) => { for (const m of ms) { const t = m.target; if (t && t.classList && t.classList.contains("sp-mic")) { const s = t.getAttribute("data-status"); const last = window.__qaMicSeq[window.__qaMicSeq.length - 1]; if (!last || last.s !== s) window.__qaMicSeq.push({ s, t: performance.now() }); } } })
      .observe(document, { attributes: true, attributeFilter: ["data-status"], subtree: true });
  } catch (e) {}
  if (mode === "unsupported") {
    try { Object.defineProperty(window, "SpeechRecognition", { value: undefined, configurable: true, writable: true }); } catch (e) {}
    try { Object.defineProperty(window, "webkitSpeechRecognition", { value: undefined, configurable: true, writable: true }); } catch (e) {}
    return;
  }
  const L = (ev, r) => Q.log.push({ ev, t: performance.now(), i: r ? r.__i : -1 });
  class R {
    constructor() {
      this.lang = ""; this.interimResults = true; this.maxAlternatives = 5; this.continuous = true; this.onresult = null; this.onerror = null; this.onend = null; this.started = false;
      if (AS) { this.onaudiostart = null; this.onsoundstart = null; this.onspeechstart = null; this.onnomatch = null; }
      this.__i = Q.instances.length; Q.instances.push(this); Q.last = this;
    }
    start() {
      if (Q.throwOnStart) { Q.throwOnStart = false; L("start-throw", this); throw new DOMException("qa start failed", "InvalidStateError"); }
      this.started = true; Q.starts++; L("start", this);
      const self = this;
      if (AS && typeof Q.autoMs === "number") setTimeout(() => { if (self.started && !self.__aborted && !self.__ended) self.emitAudioStart(); }, Q.autoMs);
      // start() 回傳時刻：在呼叫端同步程式結束後的第一個微任務記錄
      Promise.resolve().then(() => L("start-return", self));
    }
    stop() { Q.stops++; L("stop", this); const self = this; setTimeout(() => self.emitEnd(), 10); }
    abort() { Q.aborts++; this.__aborted = true; L("abort", this); const self = this; setTimeout(() => { self.onerror && self.onerror({ error: "aborted" }); self.emitEnd(); }, 10); }
    emitAudioStart() { L("audiostart", this); const f = this.onaudiostart; f && f({}); }
    emitSoundStart() { L("soundstart", this); const f = this.onsoundstart; f && f({}); }
    emitSpeechStart() { L("speechstart", this); const f = this.onspeechstart; f && f({}); }
    emitNomatch() { L("nomatch", this); const f = this.onnomatch; f && f({ results: [] }); }
    emitResult(text) { L("result", this); const alt = { transcript: text, confidence: 0.9 }; const res = [alt]; res.isFinal = true; const results = [res]; this.onresult && this.onresult({ results, resultIndex: 0 }); }
    emitError(code) { L("error:" + code, this); this.onerror && this.onerror({ error: code }); }
    emitEnd() { this.__ended = true; L("end", this); const f = this.onend; f && f({}); }
  }
  Object.defineProperty(window, "SpeechRecognition", { value: undefined, configurable: true, writable: true });
  Object.defineProperty(window, "webkitSpeechRecognition", { value: R, configurable: true, writable: true });
})();
`;
}

/**
 * （第 10 輪）按麥克風並等待進入聆聽中；斷言「先準備中、後聆聽中」（architecture §10.12 Q2）。
 * 支援 audiostart 時由替身自動觸發（預設 200 ms），不支援時等 T_FALLBACK（1500 ms）；最多等 maxMs。
 * 回傳 { seq, ms }；沒有先經過準備中或逾時未進入聆聽中時拋出例外（呼叫端 TC 記失敗）。
 */
export async function micOnStrict(p, { sel = ".fc-front .sp-mic", maxMs = 3500, click } = {}) {
  const n0 = await p.ev(`(window.__qaMicSeq || []).length`);
  const t0 = Date.now();
  if (click) await click(); else await p.click(sel);
  let s = "";
  while (Date.now() - t0 < maxMs) { s = await p.ev(`(() => { const b = document.querySelector(${JSON.stringify(sel)}); return b ? b.dataset.status : ""; })()`); if (s === "listening") break; await new Promise((r) => setTimeout(r, 25)); }
  const seq = await p.ev(`(window.__qaMicSeq || []).slice(${n0}).map((x) => x.s)`);
  if (s !== "listening") throw new Error(`micOnStrict：${maxMs} ms 內未進入聆聽中（狀態序列 ${seq.join("→")}）`);
  const iP = seq.indexOf("preparing"), iL = seq.indexOf("listening");
  if (iP < 0 || iL < iP) throw new Error(`micOnStrict：聆聽中之前沒有經過準備中（狀態序列 ${seq.join("→")}）`);
  await new Promise((r) => setTimeout(r, 20));
  return { seq, ms: Date.now() - t0 };
}

/** 剪貼簿：mode "ok"（記錄寫入內容）、"reject"、"missing" */
export function fakeClipboard(mode = "ok") {
  return `
(() => {
  const mode = ${JSON.stringify(mode)};
  window.__qaClip = { written: [] };
  const nav = navigator;
  if (mode === "missing") { try { Object.defineProperty(nav, "clipboard", { value: undefined, configurable: true }); } catch (e) {} return; }
  const clip = { writeText(t) { if (mode === "reject") return Promise.reject(new DOMException("denied", "NotAllowedError")); window.__qaClip.written.push(t); return Promise.resolve(); } };
  try { Object.defineProperty(nav, "clipboard", { value: clip, configurable: true }); } catch (e) {}
})();
`;
}

/**
 * localStorage 模擬：mode "disabled"（存取即拋 SecurityError）、"quota"（setItem 拋 QuotaExceededError，
 * 可由 window.__qaQuota = false 解除）
 */
export function storageMode(mode) {
  return `
(() => {
  const mode = ${JSON.stringify(mode)};
  if (mode === "disabled") {
    const thrower = () => { throw new DOMException("The operation is insecure.", "SecurityError"); };
    try { Object.defineProperty(window, "localStorage", { get: thrower, configurable: true }); } catch (e) {}
    for (const k of ["getItem", "setItem", "removeItem", "clear", "key"]) Storage.prototype[k] = thrower;
    return;
  }
  if (mode === "quota") {
    window.__qaQuota = true;
    const orig = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (window.__qaQuota) throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
      return orig.call(this, k, v);
    };
  }
})();
`;
}

/** 把裝置時鐘固定位移到指定的本地日期（同一時刻的時分秒），用於打卡跨日測試 */
export function fakeDate(ymd) {
  return `
(() => {
  const [y, m, d] = ${JSON.stringify(ymd)}.split("-").map(Number);
  const RealDate = Date;
  const now = new RealDate();
  const target = new RealDate(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds());
  const offset = target.getTime() - now.getTime();
  class FakeDate extends RealDate {
    constructor(...a) { if (a.length === 0) super(RealDate.now() + offset); else super(...a); }
    static now() { return RealDate.now() + offset; }
  }
  FakeDate.UTC = RealDate.UTC; FakeDate.parse = RealDate.parse;
  window.Date = FakeDate;
})();
`;
}

/**
 * （v0.8）可在執行中調整的時鐘：初始為本地 `ymd hh:mm:ss`，之後以 window.__qaSetClock("YYYY-MM-DDTHH:MM:SS") 跳到指定本地時間
 * （之後照實際流逝前進）。用於 AC-30-07 跨午夜。
 */
export function controllableClock(local) {
  return `
(() => {
  const RealDate = Date;
  const parse = (s) => { const [d, t = "12:00:00"] = s.split("T"); const [y, m, dd] = d.split("-").map(Number); const [hh, mm, ss] = t.split(":").map(Number); return new RealDate(y, m - 1, dd, hh, mm, ss || 0).getTime(); };
  // 位移保存在 sessionStorage，重新載入後沿用（同一分頁內時間持續前進，不會倒回初始值）
  let offset = parse(${JSON.stringify(local)}) - RealDate.now();
  try { const v = sessionStorage.getItem("__qaClockOffset"); if (v !== null) offset = Number(v); else sessionStorage.setItem("__qaClockOffset", String(offset)); } catch (e) {}
  window.__qaSetClock = (s) => { offset = parse(s) - RealDate.now(); try { sessionStorage.setItem("__qaClockOffset", String(offset)); } catch (e) {} };
  class FakeDate extends RealDate {
    constructor(...a) { if (a.length === 0) super(RealDate.now() + offset); else super(...a); }
    static now() { return RealDate.now() + offset; }
  }
  FakeDate.UTC = RealDate.UTC; FakeDate.parse = RealDate.parse;
  window.Date = FakeDate;
})();
`;
}

/** （v0.8）navigator.vibrate 替身：mode "stub"（記錄參數、回 true）、"missing"（不存在，如 iOS Safari）、"throw"（呼叫即拋） */
export function fakeVibrate(mode = "stub") {
  return `
(() => {
  const mode = ${JSON.stringify(mode)};
  window.__qaVib = [];
  const proto = Object.getPrototypeOf(navigator);
  if (mode === "missing") { try { delete proto.vibrate; } catch (e) {} try { Object.defineProperty(navigator, "vibrate", { value: undefined, configurable: true }); } catch (e) {} return; }
  const fn = mode === "throw" ? function () { throw new Error("qa vibrate throw"); } : function (p) { window.__qaVib.push(JSON.parse(JSON.stringify(p))); return true; };
  try { Object.defineProperty(navigator, "vibrate", { value: fn, configurable: true, writable: true }); } catch (e) {}
})();
`;
}

/**
 * （第 3 輪，v0.9 US-33）麥克風替身：覆寫 navigator.mediaDevices.getUserMedia（architecture §10.2「收音條（替身音源）」）。
 * 屬 QA 測試腳本，不在產品程式中。mode：
 *  "ok"（回傳 Web Audio 1 kHz 正弦波串流，音量以 window.__qaMic.setDb(dBFS) 或 setDb(null)=靜音 調整）、
 *  "denied"（NotAllowedError）、"notfound"（NotFoundError）、"notreadable"（NotReadableError）、
 *  "missing"（navigator.mediaDevices 不存在）、"nogum"（mediaDevices 存在但無 getUserMedia）。
 * 執行中可改 window.__qaMic.mode（"ok"／"denied"／"notfound"／"notreadable"）。
 * window.__qaMic.calls：getUserMedia 呼叫次數；tracks：曾交付的音軌；unplug()：停止目前音軌並觸發 ended（模擬拔除）。
 */
export function fakeMic(mode = "ok", initialDb = -25) {
  return `
(() => {
  const M = window.__qaMic = { mode: ${JSON.stringify(mode)}, calls: 0, args: [], tracks: [], db: ${JSON.stringify(initialDb)}, ctx: null, gain: null };
  if (M.mode === "missing") { try { Object.defineProperty(navigator, "mediaDevices", { value: undefined, configurable: true }); } catch (e) {} return; }
  if (M.mode === "nogum") { try { Object.defineProperty(navigator, "mediaDevices", { value: { enumerateDevices: () => Promise.resolve([]) }, configurable: true }); } catch (e) {} return; }
  const amp = (db) => (db === null ? 0 : Math.SQRT2 * Math.pow(10, db / 20));
  M.setDb = (db) => { M.db = db; if (M.gain) M.gain.gain.setValueAtTime(amp(db), M.ctx.currentTime); };
  M.unplug = () => { for (const t of M.tracks) { if (t.readyState === "live") { t.stop(); t.dispatchEvent(new Event("ended")); } } };
  M.live = () => M.tracks.filter((t) => t.readyState === "live").length;
  const err = (name) => new DOMException("qa " + name, name);
  const gum = function (c) {
    M.calls++; M.args.push(JSON.stringify(c));
    if (M.mode === "denied") return Promise.reject(err("NotAllowedError"));
    if (M.mode === "notfound") return Promise.reject(err("NotFoundError"));
    if (M.mode === "notreadable") return Promise.reject(err("NotReadableError"));
    if (!M.ctx) {
      M.ctx = new AudioContext();
      const osc = M.ctx.createOscillator(); osc.type = "sine"; osc.frequency.value = 1000;
      M.gain = M.ctx.createGain(); M.gain.gain.value = amp(M.db);
      osc.connect(M.gain); osc.start();
    }
    try { M.ctx.resume(); } catch (e) {}
    const dest = M.ctx.createMediaStreamDestination();
    M.gain.connect(dest);
    const s = dest.stream;
    for (const t of s.getAudioTracks()) M.tracks.push(t);
    return Promise.resolve(s);
  };
  const md = navigator.mediaDevices || {};
  try { Object.defineProperty(md, "getUserMedia", { value: gum, configurable: true, writable: true }); } catch (e) { md.getUserMedia = gum; }
  if (!navigator.mediaDevices) { try { Object.defineProperty(navigator, "mediaDevices", { value: md, configurable: true }); } catch (e) {} }
})();
`;
}
