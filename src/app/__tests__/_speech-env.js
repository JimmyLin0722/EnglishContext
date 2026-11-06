/*
 * _speech-env.js — 語音面板測試共用沙箱（FE-92；不是測試檔，不符合 *.test.js，npm test 不會直接執行）
 * 供 speech-flow.test.js 使用：最小假 DOM、假時鐘（注入 setTimeout／clearTimeout）、替身 store／tts／stt／mic、
 * 假 SpeechRecognition 全域（可選「支援 audiostart」）。依據：architecture.md v0.15 §7.26.3、§10.12；
 * v0.16 §7.28.3、§10.13（FE-95：假 requestAnimationFrame 與 fakeMic active 選項）。
 * 每次 makeEnv 都是新的 vm 沙箱，模組內狀態（gen、att）不互相影響。
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const APP_DIR = path.join(__dirname, "..");

/** 最小假元素：只實作 core/dom.js 與 speech-panel.js 用到的成員 */
class FakeEl {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this.nodeType = 1;
    this.childNodes = [];
    this.parentNode = null;
    this.attrs = new Map();
    this.listeners = {};
    this.className = "";
    this.hidden = false;
    this.isConnected = true;
    this._text = "";
    const self = this;
    this.classList = {
      toggle(c, force) {
        const set = new Set(self.className.split(/\s+/).filter(Boolean));
        const on = force === undefined ? !set.has(c) : !!force;
        if (on) set.add(c); else set.delete(c);
        self.className = Array.from(set).join(" ");
        return on;
      },
      contains(c) { return self.className.split(/\s+/).includes(c); }
    };
  }
  get firstChild() { return this.childNodes[0] || null; }
  appendChild(n) { n.parentNode = this; this.childNodes.push(n); return n; }
  removeChild(n) { const i = this.childNodes.indexOf(n); if (i >= 0) this.childNodes.splice(i, 1); n.parentNode = null; return n; }
  setAttribute(k, v) { this.attrs.set(k, String(v)); }
  getAttribute(k) { return this.attrs.has(k) ? this.attrs.get(k) : null; }
  hasAttribute(k) { return this.attrs.has(k); }
  removeAttribute(k) { this.attrs.delete(k); }
  addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); }
  set textContent(v) { this.childNodes = []; this._text = String(v); }
  get textContent() { return this._text + this.childNodes.map((c) => c.textContent).join(""); }
  click() {
    if (this.hasAttribute("disabled") || this.disabled === true) return;
    (this.listeners.click || []).forEach((f) => f({ type: "click", currentTarget: this, stopPropagation() {} }));
  }
  findAll(pred, out = []) {
    for (const c of this.childNodes) {
      if (c.nodeType === 1) {
        if (pred(c)) out.push(c);
        c.findAll(pred, out);
      }
    }
    return out;
  }
}

const fakeDocument = {
  createElement: (t) => new FakeEl(t),
  createElementNS: (_ns, t) => new FakeEl(t),
  createTextNode: (s) => ({ nodeType: 3, textContent: String(s) })
};

/** 假時鐘：setTimeout／clearTimeout 只在 advance(ms) 時依到期時間順序執行 */
function fakeClock() {
  let now = 0;
  let nextId = 1;
  const timers = new Map();
  const c = {
    now: () => now,
    setTimeout(fn, ms) {
      const id = nextId++;
      timers.set(id, { at: now + Math.max(0, Number(ms) || 0), fn, ms: Number(ms) || 0 });
      return id;
    },
    clearTimeout(id) { timers.delete(id); },
    /** 推進 ms 毫秒，依序執行到期的計時器（含執行中新設、同樣到期者） */
    advance(ms) {
      const end = now + ms;
      for (;;) {
        let best = null;
        for (const [id, t] of timers) if (t.at <= end && (!best || t.at < best[1].at || (t.at === best[1].at && id < best[0]))) best = [id, t];
        if (!best) break;
        timers.delete(best[0]);
        now = best[1].at;
        best[1].fn();
      }
      now = end;
    },
    /** 目前尚未到期的計時器延遲值（ms，供斷言） */
    pending: () => [...timers.values()].map((t) => t.ms)
  };
  return c;
}

/** 讓 Promise 回呼全部執行完 */
const flush = () => new Promise((r) => setImmediate(r));

/**
 * 假 SpeechRecognition 全域（給真正的 services/stt.js create 使用）。
 * @param {{audioStart?: boolean, online?: boolean, onStart?: Function}} o
 *   audioStart：原型上有 onaudiostart（模擬可依賴 audiostart）；onStart(rec)：在 rec.start() 內同步執行（模擬同步事件）
 */
function fakeSttGlobal(o = {}) {
  const made = [];
  function R() { this.started = 0; this.stopped = 0; this.aborted = 0; made.push(this); }
  R.prototype.start = function () { this.started++; if (o.onStart) o.onStart(this); };
  R.prototype.stop = function () { this.stopped++; };
  R.prototype.abort = function () { this.aborted++; };
  if (o.audioStart) {
    R.prototype.onaudiostart = null;
    R.prototype.onsoundstart = null;
    R.prototype.onspeechstart = null;
    R.prototype.onnomatch = null;
  }
  return { g: { SpeechRecognition: R, navigator: { onLine: o.online !== false } }, made };
}

/** 辨識結果事件 */
const resultEv = (t) => ({ resultIndex: 0, results: [[{ transcript: t }]] });

/**
 * 替身 EMT.services.mic。
 * result：acquire 回傳值；deferred：acquire 回傳待決 Promise（每次新的），以 resolveAll(r) 完成
 * （v0.16 FE-95）active：isActive() 的回傳值（模擬已持有音軌；可再改 m.active）
 */
function fakeMic(o = {}) {
  const log = { acquire: 0, startMeter: 0, stopMeter: 0, release: 0 };
  const m = {
    log,
    result: o.result || { ok: true, reused: false, metering: true },
    deferred: !!o.deferred,
    waiters: [],
    onLevel: null,
    endedCb: null,
    active: !!o.active,
    isSupported: () => true,
    isActive: () => m.active,
    acquire() {
      log.acquire++;
      if (m.deferred) return new Promise((r) => m.waiters.push(r));
      return Promise.resolve(m.result);
    },
    resolveAll(r) { m.waiters.splice(0).forEach((f) => f(r || m.result)); },
    startMeter(fn) { log.startMeter++; m.onLevel = fn; return true; },
    stopMeter() { log.stopMeter++; },
    onTrackEnded(fn) { m.endedCb = fn; },
    release() { log.release++; },
    tracks: () => []
  };
  return m;
}

/**
 * 建立面板測試環境。
 * @param {object} o
 *   clock：fakeClock()（注入沙箱的 setTimeout／clearTimeout；省略 = 沙箱沒有計時器）
 *   sttImpl：EMT.services.stt（例如 require("../services/stt.js").create(fakeSttGlobal().g)）；省略用簡易替身
 *   audioStart：簡易替身 start() 回傳的 audioStartSupported
 *   mic、dialog、acknowledged（預設 true）、online（預設 true）、ttsSupported、sttSupported（預設 true）、card
 *   raf（v0.16 FE-95）：true = 注入假 requestAnimationFrame／cancelAnimationFrame（env.frame() 執行、
 *       env.rafPending() 查數量、env.rafLog 記次數）；"throw" = requestAnimationFrame 呼叫時拋例外；
 *       省略 = 沙箱不定義 requestAnimationFrame（既有案例行為不變）
 */
function makeEnv(o = {}) {
  const sandbox = { console: console, document: fakeDocument, Promise: Promise };
  if (o.clock) {
    sandbox.setTimeout = o.clock.setTimeout;
    sandbox.clearTimeout = o.clock.clearTimeout;
  }
  // （v0.16 FE-95）假 requestAnimationFrame：回呼排入佇列，env.frame() 才執行；未給 raf 時沙箱不定義
  const rafQueue = new Map();
  const rafLog = { requested: 0, canceled: 0 };
  let rafNext = 1;
  if (o.raf) {
    sandbox.requestAnimationFrame = (fn) => {
      if (o.raf === "throw") throw new Error("rAF 失敗");
      rafLog.requested++;
      const id = rafNext++;
      rafQueue.set(id, fn);
      return id;
    };
    sandbox.cancelAnimationFrame = (id) => {
      if (rafQueue.delete(id)) rafLog.canceled++;
    };
  }
  sandbox.self = sandbox;
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const rel of ["core/dom.js", "core/similarity.js", "core/meter.js", "views/speech-panel.js"]) {
    vm.runInContext(fs.readFileSync(path.join(APP_DIR, rel), "utf8"), sandbox, { filename: rel });
  }
  const ttsSupported = o.ttsSupported !== false;
  const sttSupported = o.sttSupported !== false;
  const log = { toasts: [], speak: 0, ttsStop: 0, start: 0, stop: 0, abort: 0, phases: [], actions: [], messages: [] };
  const sttCb = {};
  const state = {
    data: { sttNoticeAcknowledged: o.acknowledged !== false },
    runtime: { speech: { ttsSupported, sttSupported, sttStatus: "idle", preparingPhase: null, lastResult: null } }
  };
  const subs = [];
  const notify = () => subs.forEach((f) => f(state, ["speech"]));
  const EMT = sandbox.EMT;
  EMT.ui = { toast: { show: (text) => log.toasts.push(text) } };
  if (o.dialog) EMT.ui.dialog = o.dialog;
  EMT.services = {};
  if (o.mic) EMT.services.mic = o.mic;
  EMT.services.tts = {
    isSupported: () => ttsSupported,
    speak: () => { log.speak++; return Promise.resolve({ ok: true }); },
    stop() { log.ttsStop++; }
  };
  const opts = { online: o.online !== false };
  EMT.services.stt = o.sttImpl || {
    isSupported: () => sttSupported,
    isOnline: () => opts.online,
    start: (cb) => {
      log.start++;
      for (const k of Object.keys(sttCb)) delete sttCb[k];
      Object.assign(sttCb, cb);
      return o.audioStart === undefined ? { ok: true } : { ok: true, audioStartSupported: !!o.audioStart };
    },
    stop: () => { log.stop++; },
    abort: () => { log.abort++; }
  };
  const actions = {
    setSttStatus: (s, phase) => {
      state.runtime.speech.sttStatus = s;
      state.runtime.speech.preparingPhase = s === "preparing" ? phase : null;
      log.phases.push(s === "preparing" ? s + ":" + phase : s);
      notify();
    },
    setSttResult: (r) => { state.runtime.speech.lastResult = r; notify(); },
    recordSttScored() {},
    acknowledgeSttNotice() { state.data.sttNoticeAcknowledged = true; }
  };
  const spied = {};
  for (const [name, fn] of Object.entries(actions)) {
    spied[name] = (...args) => { log.actions.push({ name, args }); return fn(...args); };
  }
  EMT.store = {
    getState: () => state,
    subscribe: (f) => { subs.push(f); return () => {}; },
    actions: spied
  };
  const container = new FakeEl("div");
  container.className = "fc-speech";
  const card = o.card || { kind: "builtin", wordKey: "latency", item: { word: "latency" } };
  const sp = EMT.components.speechPanel;
  sp.render(container, card, state);
  const env = { sandbox, container, log, state, sttCb, opts, sp, card, rafLog };
  /** 執行目前佇列中的所有畫格回呼（回呼內新排的留到下一次） */
  env.frame = () => {
    const due = [...rafQueue.entries()];
    rafQueue.clear();
    for (const [, fn] of due) fn(0);
    return due.length;
  };
  /** 尚未執行的畫格回呼數 */
  env.rafPending = () => rafQueue.size;
  bindDom(env);
  return env;
}

/** 重新取得 DOM 參照（render 新容器後呼叫），並記錄訊息列每次顯示的主訊息 */
function bindDom(env) {
  const buttons = env.container.findAll((n) => n.tagName === "BUTTON");
  env.tts = buttons.filter((b) => b.className.includes("sp-tts__btn"));
  env.mic = buttons.find((b) => b.className.includes("sp-mic"));
  env.micText = env.mic.findAll((n) => n.className === "sp-mic__text")[0];
  env.msgBox = env.container.findAll((n) => n.className.includes("sp-msg") && !n.className.includes("sp-msg__"))[0];
  const orig = env.msgBox.appendChild.bind(env.msgBox);
  env.msgBox.appendChild = (n) => {
    if (n && n.className === "sp-msg__text") env.log.messages.push(n.textContent);
    return orig(n);
  };
  return env;
}

/** 訊息列目前的主訊息與補充說明 */
function messageOf(env) {
  const text = env.msgBox.findAll((n) => n.className === "sp-msg__text")[0];
  const help = env.msgBox.findAll((n) => n.className === "sp-msg__help")[0];
  return { hidden: env.msgBox.hidden, text: text ? text.textContent : "", help: help ? help.textContent : "", kind: env.msgBox.getAttribute("data-kind") };
}

/** 收音條 5 格的 is-on 狀態 */
function barsOf(env) {
  return env.container
    .findAll((n) => n.className.split(/\s+/).includes("sp-meter__bar"))
    .map((b) => b.classList.contains("is-on"));
}

/** 分數區元素 */
function resultBoxOf(env) {
  return env.container.findAll((n) => n.className === "sp-result")[0];
}

/** 指定 action 的呼叫次數 */
function callsOf(env, name) {
  return env.log.actions.filter((c) => c.name === name).length;
}

module.exports = {
  APP_DIR, FakeEl, fakeDocument, fakeClock, flush, fakeSttGlobal, resultEv, fakeMic,
  makeEnv, bindDom, messageOf, barsOf, resultBoxOf, callsOf
};
