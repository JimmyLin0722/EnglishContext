/*
 * speech.test.js — TTS／STT 服務與語音面板單元測試（FE-12 測試移入，FE-19；v0.9 麥克風與收音條 FE-39）
 * 受測：services/tts.js、services/stt.js、views/speech-panel.js（純邏輯 + 以假 DOM 在 vm 沙箱驗證停用按鈕與錯誤流程）
 * 依據：architecture.md v0.5 §7.6「STT 錯誤對照表」（audio-capture v0.5 修訂）、§9「狀態：例外」「收音條」
 *       （需點擊提示的停用按鈕：aria-disabled="true" + title、沒有 disabled 屬性、點擊只顯示 toast）、
 *       §7.11 A-5、A-6、§7.14（生命週期、決定表、錯誤對照、speech-panel 修改重點）、§10.2「speech.test.js」列
 * 涵蓋：AC-07-01～AC-07-05、AC-08-01、AC-08-02～AC-08-14、AC-33-01～AC-33-08、AC-21-03、AC-30-04、AC-31-03
 * （v0.15，FE-90）服務：8 欄 SttEndInfo、4 種新事件、audioStartSupported 判定（architecture §7.26.2、§10.12）
 * （v0.17，FE-98）服務：onInterim 即時文字、9 欄 SttEndInfo（加 lastInterimText）、end 時不補發 onResult
 *       （architecture §7.30.1、§10.14 S1～S10；契約 README §14.6 IT-1～IT-4、V-STT-14、V-STT-17）
 * （v0.15，FE-92）面板：按下先進入準備中再聆聽（本檔沙箱沒有 setTimeout → fallbackWait 直接聆聽，§7.26.3）；
 *       綠燈也顯示「辨識文字」1 列；空結果 → heardNoWords；取得中再按 = 取消。假時鐘與事件順序見 speech-flow.test.js。
 */
"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const tts = require("../services/tts.js");
const stt = require("../services/stt.js");
const panel = require("../views/speech-panel.js");
const sim = require("../core/similarity.js");

describe("speech.test.js", () => {
  const APP_DIR = path.join(__dirname, "..");

  // ── 假 speechSynthesis ──
  function fakeTtsGlobal(voices) {
    const log = [];
    const listeners = [];
    const synth = {
      _voices: voices,
      getVoices() { return this._voices; },
      cancel() { log.push("cancel"); },
      speak(u) { log.push("speak:" + u.text + "@" + u.rate + "/" + u.lang + "/" + (u.voice && u.voice.name)); },
      addEventListener(t, f) { if (t === "voiceschanged") listeners.push(f); },
      removeEventListener(t, f) { const i = listeners.indexOf(f); if (i >= 0) listeners.splice(i, 1); },
      fire() { listeners.slice().forEach((f) => f({})); },
      listeners
    };
    function U(text) { this.text = text; }
    return { g: { speechSynthesis: synth, SpeechSynthesisUtterance: U }, log, synth };
  }
  const V = (name, lang, local) => ({ name, lang, localService: local });

  test("isEnUs：不分大小寫、底線視同連字號", () => {
    for (const x of ["en-US", "en_us", "EN-us", " en-US "]) assert.equal(tts.isEnUs(x), true, x);
    for (const x of ["en-GB", "en", "", null, undefined, 3]) assert.equal(tts.isEnUs(x), false, String(x));
  });

  test("pickVoice：優先本機 en-US，否則第一個 en-US，無則 null", () => {
    const remote = V("Google US English", "en-US", false);
    const local = V("Microsoft Zira", "en_US", true);
    assert.equal(tts.pickVoice([V("gb", "en-GB", true), remote, local]), local);
    assert.equal(tts.pickVoice([V("gb", "en-GB", true), remote]), remote);
    assert.equal(tts.pickVoice([V("gb", "en-GB", true)]), null);
    assert.equal(tts.pickVoice([]), null);
    assert.equal(tts.pickVoice(null), null);
  });

  test("normalizeRate：只接受 1、0.75", () => {
    assert.equal(tts.normalizeRate(1), 1);
    assert.equal(tts.normalizeRate(0.75), 0.75);
    assert.equal(tts.normalizeRate(2), 1);
    assert.equal(tts.normalizeRate("x"), 1);
  });

  test("speak：連按兩次只會 cancel → speak → cancel → speak（AC-07-03），語言 en-US、速度正確", async () => {
    const { g, log } = fakeTtsGlobal([V("Zira", "en-US", true)]);
    const t = tts.create(g);
    assert.equal(t.isSupported(), true);
    const p1 = t.speak("latency", 1);
    const p2 = t.speak("latency", 0.75);
    assert.deepEqual(log, ["cancel", "speak:latency@1/en-US/Zira", "cancel", "speak:latency@0.75/en-US/Zira"]);
    assert.deepEqual(await p1, { ok: true, voiceName: "Zira" });
    assert.equal((await p2).ok, true);
  });

  test("speak：無 en-US 語音 → no-voice（AC-07-05），不呼叫 speak", async () => {
    const { g, log } = fakeTtsGlobal([V("gb", "en-GB", true)]);
    const r = await tts.create(g).speak("x", 1);
    assert.deepEqual(r, { ok: false, reason: "no-voice" });
    assert.deepEqual(log, ["cancel"]);
  });

  test("speak：語音清單為空時等 voiceschanged", async () => {
    const f = fakeTtsGlobal([]);
    const t = tts.create(f.g);
    const p = t.speak("word", 1);
    assert.deepEqual(f.log, ["cancel"]);
    f.synth._voices = [V("Zira", "en-US", true)];
    f.synth.fire();
    const r = await p;
    assert.equal(r.ok, true);
    assert.equal(f.log[f.log.length - 1], "speak:word@1/en-US/Zira");
    assert.equal(f.synth.listeners.length, 0, "監聽已移除");
  });

  test("speak：語音清單一直為空，1 秒後回 no-voice", async () => {
    const f = fakeTtsGlobal([]);
    const t0 = Date.now();
    const r = await tts.create(f.g).speak("word", 1);
    assert.deepEqual(r, { ok: false, reason: "no-voice" });
    assert.ok(Date.now() - t0 >= 950);
  });

  test("speak：等待語音期間又按一次，前一個作廢（aborted），不重複播放", async () => {
    const f = fakeTtsGlobal([]);
    const t = tts.create(f.g);
    const p1 = t.speak("a", 1);
    const p2 = t.speak("b", 0.75);
    f.synth._voices = [V("Zira", "en-US", true)];
    f.synth.fire();
    const [r1, r2] = await Promise.all([p1, p2]);
    assert.equal(r1.reason, "aborted");
    assert.equal(r2.ok, true);
    assert.equal(f.log.filter((x) => x.startsWith("speak")).length, 1);
  });

  test("speak：不支援 → unsupported；cancel／speak 拋例外不外洩；空字串 → empty", async () => {
    assert.deepEqual(await tts.create({}).speak("a", 1), { ok: false, reason: "unsupported" });
    const f = fakeTtsGlobal([V("Zira", "en-US", true)]);
    f.synth.speak = () => { throw new Error("boom"); };
    f.synth.cancel = () => { throw new Error("boom"); };
    assert.deepEqual(await tts.create(f.g).speak("a", 1), { ok: false, reason: "error" });
    assert.equal((await tts.create(f.g).speak("  ", 1)).reason, "empty");
  });

  // ── 假 SpeechRecognition ──
  function fakeSttGlobal(online = true) {
    const made = [];
    function R() { this.started = 0; this.stopped = 0; this.aborted = 0; made.push(this); }
    R.prototype.start = function () { this.started++; };
    R.prototype.stop = function () { this.stopped++; };
    R.prototype.abort = function () { this.aborted++; };
    return { g: { webkitSpeechRecognition: R, navigator: { onLine: online } }, made };
  }
  const resultEv = (t) => ({ resultIndex: 0, results: [[{ transcript: t }]] });

  test("transcriptOf", () => {
    assert.equal(stt.transcriptOf(resultEv("Latency.")), "Latency.");
    assert.equal(stt.transcriptOf({ resultIndex: 1, results: [[{ transcript: "a" }], [{ transcript: " b " }]] }), "b");
    assert.equal(stt.transcriptOf(null), "");
    assert.equal(stt.transcriptOf({ results: [[{}]] }), "");
  });

  test("stt.start：設定 en-US、未提供 onInterim 時 interimResults false、maxAlternatives 1；結果與結束回呼", () => {
    const { g, made } = fakeSttGlobal();
    const s = stt.create(g);
    const ev = [];
    const r = s.start({ lang: "en-US", onResult: (t) => ev.push("r:" + t), onError: (c) => ev.push("e:" + c), onEnd: (i) => ev.push("end:" + JSON.stringify(i)) });
    // fakeSttGlobal 的原型沒有 onaudiostart → 不可依賴 audiostart（§7.26.2）
    assert.deepEqual(r, { ok: true, audioStartSupported: false });
    const rec = made[0];
    assert.equal(rec.lang, "en-US");
    // v0.17（FE-98）：未提供 onInterim → interimResults === false（IT-1、V-STT-17）
    assert.equal(rec.interimResults, false);
    assert.equal(rec.maxAlternatives, 1);
    assert.equal(rec.started, 1);
    assert.equal(s.isListening(), true);
    rec.onresult(resultEv("Latency."));
    rec.onend();
    // v0.15（FE-90）：onEnd 的 info 順序固定；v0.17（FE-98）：9 欄，最後為 lastInterimText
    assert.deepEqual(ev, ["r:Latency.", 'end:{"manual":false,"hadResult":true,"hadError":false,"audioStarted":false,"soundStarted":false,"speechDetected":false,"nomatch":false,"errorCode":null,"lastInterimText":""}']);
    assert.equal(s.isListening(), false);
  });

  // ── v0.15（FE-90）：4 種新事件、8 欄 SttEndInfo、audiostart 可依賴判定（§7.26.2、§10.12） ──

  // v0.17（FE-98）：9 欄，加 lastInterimText（DS-66）
  const INFO_KEYS = ["manual", "hadResult", "hadError", "audioStarted", "soundStarted", "speechDetected", "nomatch", "errorCode", "lastInterimText"];

  /** 記錄所有回呼；log 內每筆 [名稱, ...參數] */
  function recorder() {
    const log = [];
    const opts = {
      onAudioStart: (i) => log.push(["audiostart", i]),
      onSoundStart: (i) => log.push(["soundstart", i]),
      onSpeechStart: (i) => log.push(["speechstart", i]),
      onResult: (t, i) => log.push(["result", t, i]),
      onNomatch: (i) => log.push(["nomatch", i]),
      onError: (c, i) => log.push(["error", c, i]),
      onEnd: (i) => log.push(["end", i])
    };
    return { log, opts };
  }

  test("stt（FE-90）：onEnd info 9 欄（v0.17 加 lastInterimText）、順序固定、初始值 false／null／空字串", () => {
    const { g, made } = fakeSttGlobal();
    const s = stt.create(g);
    const { log, opts } = recorder();
    s.start(opts);
    made[0].onend();
    assert.equal(log.length, 1);
    const info = log[0][1];
    assert.deepEqual(Object.keys(info), INFO_KEYS);
    assert.deepEqual(info, {
      manual: false, hadResult: false, hadError: false, audioStarted: false,
      soundStarted: false, speechDetected: false, nomatch: false, errorCode: null, lastInterimText: ""
    });
  });

  test("stt（FE-90）：4 個新回呼依引擎順序轉送，info 為當下旗標的複本", () => {
    const { g, made } = fakeSttGlobal();
    const s = stt.create(g);
    const { log, opts } = recorder();
    s.start(opts);
    const rec = made[0];
    rec.onaudiostart({});
    rec.onsoundstart({});
    rec.onspeechstart({});
    rec.onnomatch({});
    rec.onresult(resultEv("Latency."));
    rec.onend({});
    assert.deepEqual(log.map((x) => x[0]), ["audiostart", "soundstart", "speechstart", "nomatch", "result", "end"]);
    // 每個 info 都是當下快照（之後的事件不改寫先前的物件）
    assert.equal(log[0][1].audioStarted, true);
    assert.equal(log[0][1].soundStarted, false);
    assert.equal(log[1][1].soundStarted, true);
    assert.equal(log[1][1].speechDetected, false);
    assert.equal(log[2][1].speechDetected, true);
    assert.equal(log[2][1].nomatch, false);
    assert.equal(log[3][1].nomatch, true);
    assert.equal(log[3][1].hadResult, false);
    assert.equal(log[4][1], "Latency.");
    assert.equal(log[4][2].hadResult, true);
    assert.deepEqual(log[5][1], {
      manual: false, hadResult: true, hadError: false, audioStarted: true,
      soundStarted: true, speechDetected: true, nomatch: true, errorCode: null, lastInterimText: ""
    });
    // 每次都是新物件
    const objs = [log[0][1], log[1][1], log[2][1], log[3][1], log[4][2], log[5][1]];
    assert.equal(new Set(objs).size, objs.length);
  });

  test("stt（FE-90）：服務不重排事件（speechstart 先於 audiostart 時照原順序轉送）", () => {
    const { g, made } = fakeSttGlobal();
    const s = stt.create(g);
    const { log, opts } = recorder();
    s.start(opts);
    made[0].onspeechstart({});
    made[0].onaudiostart({});
    made[0].onend({});
    assert.deepEqual(log.map((x) => x[0]), ["speechstart", "audiostart", "end"]);
    assert.equal(log[0][1].audioStarted, false);
  });

  test("stt（FE-90）：呼叫端修改 info 不影響服務", () => {
    const { g, made } = fakeSttGlobal();
    const s = stt.create(g);
    let endInfo = null;
    s.start({
      onAudioStart: (i) => { i.audioStarted = false; i.manual = true; i.errorCode = "x"; },
      onEnd: (i) => { endInfo = i; }
    });
    made[0].onaudiostart({});
    made[0].onend({});
    assert.equal(endInfo.audioStarted, true);
    assert.equal(endInfo.manual, false);
    assert.equal(endInfo.errorCode, null);
  });

  test("stt（FE-90）：errorCode 只記第一個；onError 收到 (code, info)", () => {
    const { g, made } = fakeSttGlobal();
    const s = stt.create(g);
    const { log, opts } = recorder();
    s.start(opts);
    made[0].onerror({ error: "no-speech" });
    made[0].onerror({ error: "network" });
    made[0].onerror({});
    made[0].onend({});
    assert.deepEqual(log.map((x) => x[0] === "error" ? "error:" + x[1] : x[0]), ["error:no-speech", "error:network", "error:unknown", "end"]);
    assert.equal(log[0][2].errorCode, "no-speech");
    assert.equal(log[0][2].hadError, true);
    assert.equal(log[1][2].errorCode, "no-speech");
    assert.equal(log[3][1].errorCode, "no-speech");
    assert.equal(log[3][1].hadError, true);
  });

  test("stt（FE-90）：手動停止造成的 aborted 不記入 errorCode、不回呼；非手動 aborted 照常記錄", () => {
    const { g, made } = fakeSttGlobal();
    const s = stt.create(g);
    const { log, opts } = recorder();
    s.start(opts);
    assert.equal(s.stop(), true);
    made[0].onerror({ error: "aborted" });
    made[0].onend({});
    assert.deepEqual(log.map((x) => x[0]), ["end"]);
    assert.equal(log[0][1].manual, true);
    assert.equal(log[0][1].hadError, false);
    assert.equal(log[0][1].errorCode, null);
    const r2 = recorder();
    s.start(r2.opts);
    made[1].onerror({ error: "aborted" });
    made[1].onend({});
    assert.equal(r2.log[0][1], "aborted");
    assert.equal(r2.log[1][1].errorCode, "aborted");
  });

  test("stt（FE-90）：每次 start() 旗標重設為初始值", () => {
    const { g, made } = fakeSttGlobal();
    const s = stt.create(g);
    s.start({});
    made[0].onspeechstart({});
    made[0].onerror({ error: "network" });
    made[0].onend({});
    let info = null;
    s.start({ onEnd: (i) => { info = i; } });
    made[1].onend({});
    assert.deepEqual(info, {
      manual: false, hadResult: false, hadError: false, audioStarted: false,
      soundStarted: false, speechDetected: false, nomatch: false, errorCode: null, lastInterimText: ""
    });
  });

  test("stt（FE-90）：end、abort、start 失敗後 7 個處理器屬性皆為 null", () => {
    const PROPS = ["onaudiostart", "onsoundstart", "onspeechstart", "onresult", "onnomatch", "onerror", "onend"];
    const { g, made } = fakeSttGlobal();
    const s = stt.create(g);
    s.start({});
    for (const p of PROPS) assert.equal(typeof made[0][p], "function", p + " 已綁定");
    made[0].onend({});
    for (const p of PROPS) assert.equal(made[0][p], null, "end 後 " + p);
    s.start({});
    s.abort();
    for (const p of PROPS) assert.equal(made[1][p], null, "abort 後 " + p);
    const f = fakeSttGlobal();
    f.g.webkitSpeechRecognition.prototype.start = () => { throw new Error("x"); };
    stt.create(f.g).start({});
    for (const p of PROPS) assert.equal(f.made[0][p], null, "start 失敗後 " + p);
  });

  test("stt（FE-90）：原型有 onaudiostart → audioStartSupported true；沒有 → false；判定拋例外 → false", () => {
    // 支援：原型上有 onaudiostart（同 Chrome、Edge、Safari）
    const a = fakeSttGlobal();
    a.g.webkitSpeechRecognition.prototype.onaudiostart = null;
    assert.deepEqual(stt.create(a.g).start({}), { ok: true, audioStartSupported: true });
    // 支援：建構子設定
    function R2() { this.onaudiostart = null; }
    R2.prototype.start = function () {};
    assert.deepEqual(stt.create({ SpeechRecognition: R2, navigator: { onLine: true } }).start({}), { ok: true, audioStartSupported: true });
    // 不支援：完全沒有這個屬性
    assert.deepEqual(stt.create(fakeSttGlobal().g).start({}), { ok: true, audioStartSupported: false });
    // 判定時拋例外 → false（以 Proxy 的 has 陷阱模擬）
    function R3() {
      return new Proxy(this, { has() { throw new Error("boom"); } });
    }
    R3.prototype.start = function () {};
    assert.deepEqual(stt.create({ SpeechRecognition: R3, navigator: { onLine: true } }).start({}), { ok: true, audioStartSupported: false });
    // 判定在 rec.start() 之前：start 內才加上的屬性不影響結果
    function R4() {}
    R4.prototype.start = function () { if (!("onaudiostart" in this)) this.onaudiostart = null; };
    assert.deepEqual(stt.create({ SpeechRecognition: R4, navigator: { onLine: true } }).start({}), { ok: true, audioStartSupported: false });
    // 失敗的 3 種 reason 不變
    assert.deepEqual(stt.create({}).start({}), { ok: false, reason: "unsupported" });
    assert.deepEqual(stt.create(fakeSttGlobal(false).g).start({}), { ok: false, reason: "offline" });
  });

  test("stt（FE-90）：abort 後替身再觸發任何事件（含握有舊處理器）都不回呼", () => {
    const { g, made } = fakeSttGlobal();
    const s = stt.create(g);
    const { log, opts } = recorder();
    s.start(opts);
    const rec = made[0];
    const held = {
      onaudiostart: rec.onaudiostart, onsoundstart: rec.onsoundstart, onspeechstart: rec.onspeechstart,
      onresult: rec.onresult, onnomatch: rec.onnomatch, onerror: rec.onerror, onend: rec.onend
    };
    s.abort();
    assert.equal(rec.aborted, 1);
    held.onaudiostart({});
    held.onsoundstart({});
    held.onspeechstart({});
    held.onresult(resultEv("late"));
    held.onnomatch({});
    held.onerror({ error: "network" });
    held.onend({});
    assert.deepEqual(log, []);
    assert.equal(s.isListening(), false);
  });

  test("transcriptOf（FE-90 不變）：多段結果以半形空白連接、各段 trim、空段略過", () => {
    assert.equal(stt.transcriptOf({ resultIndex: 0, results: [[{ transcript: " comply " }], [{ transcript: "" }], [{ transcript: "with " }]] }), "comply with");
    assert.equal(stt.transcriptOf({ resultIndex: 0, results: [[{ transcript: "   " }]] }), "");
    assert.equal(stt.transcriptOf({ resultIndex: -1, results: [[{ transcript: "a" }]] }), "a");
  });

  test("stt：錯誤代碼原樣回呼；手動停止的 aborted 不回呼", () => {
    const { g, made } = fakeSttGlobal();
    const s = stt.create(g);
    const ev = [];
    const cb = { onResult: (t) => ev.push("r:" + t), onError: (c) => ev.push("e:" + c), onEnd: (i) => ev.push("end:" + i.manual + i.hadError) };
    s.start(cb);
    made[0].onerror({ error: "not-allowed" });
    made[0].onend();
    s.start(cb);
    assert.equal(s.stop(), true);
    assert.equal(made[1].stopped, 1);
    made[1].onerror({ error: "aborted" });
    made[1].onend();
    assert.deepEqual(ev, ["e:not-allowed", "end:falsetrue", "end:truefalse"]);
  });

  test("stt：離線、不支援、start 拋例外；abort 後舊事件不回呼", () => {
    assert.deepEqual(stt.create(fakeSttGlobal(false).g).start({}), { ok: false, reason: "offline" });
    assert.deepEqual(stt.create({}).start({}), { ok: false, reason: "unsupported" });
    const f = fakeSttGlobal();
    f.g.webkitSpeechRecognition.prototype.start = () => { throw new Error("InvalidStateError"); };
    const s0 = stt.create(f.g);
    assert.deepEqual(s0.start({}), { ok: false, reason: "error" });
    assert.equal(s0.isListening(), false);

    const f2 = fakeSttGlobal();
    const s = stt.create(f2.g);
    let n = 0;
    s.start({ onResult: () => n++, onEnd: () => n++ });
    const old = f2.made[0];
    const h = old.onresult;
    s.abort();
    assert.equal(old.aborted, 1);
    assert.equal(old.onresult, null);
    h(resultEv("x"));
    assert.equal(n, 0);
    // 再次 start 會中止前一個
    s.start({});
    s.start({});
    assert.equal(f2.made[1].aborted, 1);
  });

  test("stt：回呼拋例外不外洩", () => {
    const f = fakeSttGlobal();
    const s = stt.create(f.g);
    s.start({ onResult: () => { throw new Error("x"); } });
    const orig = console.error;
    console.error = () => {};
    try {
      assert.doesNotThrow(() => f.made[0].onresult(resultEv("a")));
    } finally {
      console.error = orig;
    }
  });


  // ── v0.17（FE-98）：即時文字 onInterim、9 欄 SttEndInfo、服務不代替評分（§7.30.1、§10.14 S1～S10） ──

  /** 暫時結果事件：每段 isFinal = false */
  function interimEv(...texts) {
    return { resultIndex: 0, results: texts.map((t) => { const r = [{ transcript: t }]; r.isFinal = false; return r; }) };
  }
  /** 最終結果事件：isFinal = true */
  function finalEv(text) {
    const r = [{ transcript: text }];
    r.isFinal = true;
    return { resultIndex: 0, results: [r] };
  }
  /** recorder 加上 onInterim */
  function recorderI() {
    const r = recorder();
    r.opts.onInterim = (t, i) => r.log.push(["interim", t, i]);
    return r;
  }
  const names = (log) => log.map((x) => x[0]);

  test("S1（FE-98）：未提供 onInterim → interimResults false；isFinal false 的事件仍走 onResult 1 次（V-STT-17、AC-62-03 (b)）", () => {
    const { g, made } = fakeSttGlobal();
    const s = stt.create(g);
    const { log, opts } = recorder();
    s.start(opts);
    const rec = made[0];
    assert.equal(rec.interimResults, false);
    rec.onresult(interimEv("ad"));
    rec.onend({});
    assert.deepEqual(names(log), ["result", "end"]);
    assert.equal(log[0][1], "ad");
    assert.equal(log[0][2].hadResult, true);
    assert.equal(log[1][1].hadResult, true);
    assert.equal(log[1][1].lastInterimText, "");
  });

  test("S2（FE-98）：提供 onInterim → interimResults true；lang 預設 en-US、maxAlternatives 1、continuous false 不變（IT-1）", () => {
    const { g, made } = fakeSttGlobal();
    const s = stt.create(g);
    const { opts } = recorderI();
    assert.deepEqual(s.start(opts), { ok: true, audioStartSupported: false });
    const rec = made[0];
    assert.equal(rec.interimResults, true);
    assert.equal(rec.lang, "en-US");
    assert.equal(rec.maxAlternatives, 1);
    assert.equal(rec.continuous, false);
    // onInterim 不是函式 → 視為未提供
    s.start({ onInterim: "x" });
    assert.equal(made[1].interimResults, false);
  });

  test("S3（FE-98）：la、late、latency → onInterim 依序 3 次、值逐字、info.lastInterimText 與 text 相同；不改 hadResult（AC-62-01、IT-2）", () => {
    const { g, made } = fakeSttGlobal();
    const s = stt.create(g);
    const { log, opts } = recorderI();
    s.start(opts);
    const rec = made[0];
    for (const t of ["la", "late", "latency"]) rec.onresult(interimEv(t));
    assert.deepEqual(names(log), ["interim", "interim", "interim"]);
    assert.deepEqual(log.map((x) => x[1]), ["la", "late", "latency"]);
    for (const x of log) {
      assert.equal(x[2].lastInterimText, x[1]);
      assert.equal(x[2].hadResult, false);
      assert.deepEqual(Object.keys(x[2]), INFO_KEYS);
    }
    // 每次都是新物件
    assert.equal(new Set(log.map((x) => x[2])).size, 3);
    assert.equal(s.isListening(), true);
  });

  test("S4（FE-98）：同一事件 2 段以 1 個半形空白串接；自索引 0 取全部（含已確定部分）；標點與大小寫原樣（IT-3）", () => {
    const { g, made } = fakeSttGlobal();
    const s = stt.create(g);
    const { log, opts } = recorderI();
    s.start(opts);
    const rec = made[0];
    rec.onresult(interimEv(" comply ", "with"));
    assert.equal(log[0][1], "comply with");
    // resultIndex 1：索引 0 已是最終、索引 1 仍是暫時 → 即時文字，取出含索引 0
    const r0 = [{ transcript: "Comply," }];
    r0.isFinal = true;
    const r1 = [{ transcript: " WITH. " }];
    r1.isFinal = false;
    rec.onresult({ resultIndex: 1, results: [r0, r1] });
    assert.equal(log.length, 2);
    assert.equal(log[1][0], "interim");
    assert.equal(log[1][1], "Comply, WITH.");
    assert.equal(log[1][2].lastInterimText, "Comply, WITH.");
  });

  test("S5（FE-98）：空字串與只有空白的暫時結果 → onInterim 0 次、之後 onEnd 的 lastInterimText 維持上一段（IT-3、FB-80）", () => {
    const { g, made } = fakeSttGlobal();
    const s = stt.create(g);
    const { log, opts } = recorderI();
    s.start(opts);
    const rec = made[0];
    rec.onresult(interimEv("ad"));
    rec.onresult(interimEv(""));
    rec.onresult(interimEv("   "));
    rec.onresult(interimEv("", " "));
    rec.onresult({ resultIndex: 0, results: [] });
    rec.onend({});
    assert.deepEqual(names(log), ["interim", "end"]);
    assert.equal(log[1][1].lastInterimText, "ad");
    assert.equal(log[1][1].hadResult, false);
    // 一開始就只有空白 → onInterim 0 次、lastInterimText 為 ""
    const r2 = recorderI();
    s.start(r2.opts);
    made[1].onresult(interimEv("   "));
    made[1].onend({});
    assert.deepEqual(names(r2.log), ["end"]);
    assert.equal(r2.log[0][1].lastInterimText, "");
  });

  test("S6（FE-98）：interim adr → interim adress → end → onResult 0 次、onEnd 1 次、hadResult false、lastInterimText adress（V-STT-14、IT-4、DS-65）", () => {
    const { g, made } = fakeSttGlobal();
    const s = stt.create(g);
    const { log, opts } = recorderI();
    s.start(opts);
    const rec = made[0];
    rec.onresult(interimEv("adr"));
    rec.onresult(interimEv("adress"));
    rec.onend({});
    assert.deepEqual(names(log), ["interim", "interim", "end"]);
    assert.equal(log.filter((x) => x[0] === "result").length, 0);
    const info = log[2][1];
    assert.equal(info.hadResult, false);
    assert.equal(info.lastInterimText, "adress");
    assert.equal(info.manual, false);
    assert.equal(s.isListening(), false);
    // error、nomatch 之後的 end 也不補發 onResult（DS-65 理由）
    for (const after of [(r) => r.onerror({ error: "no-speech" }), (r) => r.onnomatch({})]) {
      const rr = recorderI();
      s.start(rr.opts);
      const r = made[made.length - 1];
      r.onresult(interimEv("adr"));
      after(r);
      r.onend({});
      assert.equal(rr.log.filter((x) => x[0] === "result").length, 0);
      assert.equal(rr.log[rr.log.length - 1][1].lastInterimText, "adr");
      assert.equal(rr.log[rr.log.length - 1][1].hadResult, false);
    }
  });

  test("S7（FE-98）：interim 後最終結果 address → onResult 1 次 address、hadResult true；onEnd 的 lastInterimText 仍為最後一段即時文字", () => {
    const { g, made } = fakeSttGlobal();
    const s = stt.create(g);
    const { log, opts } = recorderI();
    s.start(opts);
    const rec = made[0];
    rec.onresult(interimEv("ad"));
    rec.onresult(finalEv("address"));
    rec.onend({});
    assert.deepEqual(names(log), ["interim", "result", "end"]);
    assert.equal(log[1][1], "address");
    assert.equal(log[1][2].hadResult, true);
    assert.equal(log[1][2].lastInterimText, "ad");
    assert.equal(log[2][1].hadResult, true);
    assert.equal(log[2][1].lastInterimText, "ad");
    // 未提供 isFinal 的事件（既有替身）也視為最終
    const r2 = recorderI();
    s.start(r2.opts);
    made[1].onresult(resultEv("address"));
    assert.deepEqual(names(r2.log), ["result"]);
    assert.equal(r2.log[0][1], "address");
  });

  test("S8（FE-98）：onEnd info 恰 9 欄且順序固定；下一次 start() 全部重設（DS-66、V-STT-17）", () => {
    const { g, made } = fakeSttGlobal();
    const s = stt.create(g);
    const { log, opts } = recorderI();
    s.start(opts);
    const rec = made[0];
    rec.onaudiostart({});
    rec.onsoundstart({});
    rec.onspeechstart({});
    rec.onresult(interimEv("adr"));
    rec.onnomatch({});
    rec.onerror({ error: "network" });
    rec.onresult(finalEv("address"));
    rec.onend({});
    const info = log[log.length - 1][1];
    assert.deepEqual(Object.keys(info), INFO_KEYS);
    assert.equal(Object.keys(info).length, 9);
    assert.deepEqual(info, {
      manual: false, hadResult: true, hadError: true, audioStarted: true,
      soundStarted: true, speechDetected: true, nomatch: true, errorCode: "network", lastInterimText: "adr"
    });
    const r2 = recorderI();
    s.start(r2.opts);
    made[1].onend({});
    assert.deepEqual(Object.keys(r2.log[0][1]), INFO_KEYS);
    assert.deepEqual(r2.log[0][1], {
      manual: false, hadResult: false, hadError: false, audioStarted: false,
      soundStarted: false, speechDetected: false, nomatch: false, errorCode: null, lastInterimText: ""
    });
  });

  test("S9（FE-98）：stop() 後 end → onResult 0 次、manual true；abort() 後替身再觸發 onresult → 0 回呼", () => {
    const { g, made } = fakeSttGlobal();
    const s = stt.create(g);
    const { log, opts } = recorderI();
    s.start(opts);
    const rec = made[0];
    rec.onresult(interimEv("adr"));
    assert.equal(s.stop(), true);
    rec.onend({});
    assert.deepEqual(names(log), ["interim", "end"]);
    assert.equal(log[1][1].manual, true);
    assert.equal(log[1][1].hadResult, false);
    assert.equal(log[1][1].lastInterimText, "adr");
    // abort：處理器已解除；握有舊處理器也不回呼
    const r2 = recorderI();
    s.start(r2.opts);
    const rec2 = made[1];
    const held = { onresult: rec2.onresult, onend: rec2.onend };
    rec2.onresult(interimEv("ad"));
    s.abort();
    assert.equal(rec2.onresult, null);
    held.onresult(interimEv("adr"));
    held.onresult(finalEv("address"));
    held.onend({});
    assert.deepEqual(names(r2.log), ["interim"]);
  });

  test("S9（FE-98）：onInterim 拋例外不外洩，之後的最終結果照常回報", () => {
    const { g, made } = fakeSttGlobal();
    const s = stt.create(g);
    const got = [];
    s.start({ onInterim: () => { throw new Error("x"); }, onResult: (t) => got.push(t) });
    const orig = console.error;
    console.error = () => {};
    try {
      assert.doesNotThrow(() => made[0].onresult(interimEv("ad")));
    } finally {
      console.error = orig;
    }
    made[0].onresult(finalEv("address"));
    assert.deepEqual(got, ["address"]);
  });

  test("S10（FE-98）：hasFinalOf 邊界（無 results、resultIndex 超出、未提供 isFinal、拋例外；§7.30.1、SD-FB-98）", () => {
    const fin = (isFinal) => { const r = [{ transcript: "a" }]; if (isFinal !== undefined) r.isFinal = isFinal; return r; };
    assert.equal(typeof stt.hasFinalOf, "function");
    // results 不存在或不是類陣列 → 最終
    assert.equal(stt.hasFinalOf(null), true);
    assert.equal(stt.hasFinalOf(undefined), true);
    assert.equal(stt.hasFinalOf({}), true);
    assert.equal(stt.hasFinalOf({ results: null }), true);
    assert.equal(stt.hasFinalOf({ results: 3 }), true);
    assert.equal(stt.hasFinalOf({ results: {} }), true);
    // 未提供 isFinal → 最終；isFinal true → 最終；全部 false → 即時
    assert.equal(stt.hasFinalOf({ resultIndex: 0, results: [fin()] }), true);
    assert.equal(stt.hasFinalOf({ resultIndex: 0, results: [fin(true)] }), true);
    assert.equal(stt.hasFinalOf({ resultIndex: 0, results: [fin(false), fin(false)] }), false);
    assert.equal(stt.hasFinalOf({ resultIndex: 0, results: [fin(false), fin(true)] }), true);
    // isFinal 不是 false（例如 0、null）→ 最終
    assert.equal(stt.hasFinalOf({ resultIndex: 0, results: [fin(0)] }), true);
    assert.equal(stt.hasFinalOf({ resultIndex: 0, results: [fin(null)] }), true);
    // 只看 resultIndex 起：索引 0 為最終、自索引 1 起全部 false → 即時
    assert.equal(stt.hasFinalOf({ resultIndex: 1, results: [fin(true), fin(false)] }), false);
    // resultIndex 超出 → 自 resultIndex 起沒有任何結果 → 即時
    assert.equal(stt.hasFinalOf({ resultIndex: 5, results: [fin(true)] }), false);
    assert.equal(stt.hasFinalOf({ resultIndex: 0, results: [] }), false);
    // resultIndex 非數字或負數 → 視為 0
    assert.equal(stt.hasFinalOf({ resultIndex: -1, results: [fin(true)] }), true);
    assert.equal(stt.hasFinalOf({ resultIndex: "1", results: [fin(true), fin(false)] }), true);
    assert.equal(stt.hasFinalOf({ results: [fin(false)] }), false);
    // 判定時拋例外 → 最終
    const boom = { get results() { throw new Error("boom"); } };
    assert.equal(stt.hasFinalOf(boom), true);
    const r = [{ transcript: "a" }];
    Object.defineProperty(r, "isFinal", { get() { throw new Error("x"); } });
    assert.equal(stt.hasFinalOf({ resultIndex: 0, results: [r] }), true);
  });

  test("S10（FE-98）：allTextOf 邊界（無 results、空候選、非字串 transcript、拋例外；不受 resultIndex 影響）", () => {
    const seg = (t, isFinal = false) => { const r = [{ transcript: t }]; r.isFinal = isFinal; return r; };
    assert.equal(typeof stt.allTextOf, "function");
    assert.equal(stt.allTextOf(null), "");
    assert.equal(stt.allTextOf({}), "");
    assert.equal(stt.allTextOf({ results: 3 }), "");
    assert.equal(stt.allTextOf({ results: [] }), "");
    assert.equal(stt.allTextOf({ results: [[], [{}], [{ transcript: 5 }], null, seg("  ")] }), "");
    assert.equal(stt.allTextOf({ resultIndex: 9, results: [seg(" a "), seg("b", true)] }), "a b");
    assert.equal(stt.allTextOf({ results: [seg("Hello,"), seg(""), seg(" World. ")] }), "Hello, World.");
    // 段內空白不改（只 trim 兩端），串接只用 1 個半形空白
    assert.equal(stt.allTextOf({ results: [seg("comply  with"), seg("\tit\n")] }), "comply  with it");
    const boom = { get results() { throw new Error("boom"); } };
    assert.equal(stt.allTextOf(boom), "");
  });

  // ── STT 錯誤對照表（§7.6 v0.3） ──

  test("panel.messageForError：依 §7.6 對照表（AC-08-09、AC-08-10、AC-08-14）", () => {
    const perm = "需要麥克風權限";
    for (const code of ["not-allowed", "service-not-allowed"]) {
      const m = panel.messageForError(code);
      assert.equal(m.text, perm, code);
      assert.equal(m.kind, "error", code);
      assert.match(m.help, /網址列左側/, code);
      assert.match(m.help, /麥克風/, code);
      assert.match(m.help, /允許/, code);
    }
    // audio-capture（v0.5 修訂，DS-03）：「找不到麥克風裝置」＋「請確認裝置已連接麥克風後再按一次」
    assert.deepEqual(panel.messageForError("audio-capture"), {
      text: "找不到麥克風裝置", help: "請確認裝置已連接麥克風後再按一次", kind: "error"
    });

    assert.deepEqual(panel.messageForError("network"), { text: "語音辨識需要網路連線", help: "", kind: "error" });
    assert.deepEqual(panel.messageForError("no-speech"), { text: "未偵測到語音，請再試一次", help: "", kind: "info" });
    // aborted：手動停止的已由 stt.js 濾掉；傳到 view 的是非手動中止，視同其他錯誤（R7-1）
    for (const code of ["aborted", "language-not-supported", "bad-grammar", "whatever", undefined]) {
      assert.deepEqual(panel.messageForError(code), { text: "語音辨識發生錯誤，請稍後再試一次", help: "", kind: "error" }, String(code));
    }
  });

  test("panel.buildResult + resultModel：AC-08-03～AC-08-08、AC-08-11、AC-08-12", () => {
    const r = panel.buildResult("Latency.", "latency", sim);
    assert.deepEqual(r, { recognizedText: "Latency.", targetText: "latency", score: 100, light: "green" });
    const m = panel.resultModel(r);
    assert.equal(m.title, "辨識吻合度");
    assert.equal(m.scoreText, "100");
    assert.equal(m.lightLabel, "綠燈");
    assert.equal(m.note, "此分數比對的是語音辨識出的文字，不代表音素層級的發音準確度");
    assert.equal(m.tip, null);
    // v0.15（FE-92，STT_RESULT_ROWS.green）：綠燈 1 列「辨識文字」，值為引擎原文
    assert.deepEqual(m.compare, [{ label: "辨識文字", value: "Latency." }]);

    assert.equal(panel.buildResult("adress", "address", sim).score, 86);
    const y = panel.resultModel(panel.buildResult("complied with", "comply with", sim));
    assert.equal(y.scoreText, "75");
    assert.equal(y.light, "yellow");
    assert.equal(y.tip, "放慢速度或重聽 0.75x 示範");
    assert.deepEqual(y.compare, [{ label: "辨識文字", value: "complied with" }]);
    assert.equal(panel.buildResult("Comply with.", "comply with", sim).score, 100);
    const red = panel.resultModel(panel.buildResult("kitten", "sitting", sim));
    assert.equal(red.scoreText, "57");
    assert.equal(red.light, "red");
    assert.deepEqual(red.compare, [{ label: "辨識文字", value: "kitten" }, { label: "目標文字", value: "sitting" }]);
    // 空辨識結果不給分（AC-08-10）
    assert.equal(panel.buildResult("", "latency", sim), null);
    assert.equal(panel.buildResult("...", "latency", sim), null);
    assert.equal(panel.buildResult(undefined, "latency", sim), null);
    assert.equal(panel.resultModel(null), null);
  });

  test("燈號邊界（AC-08-06）經 resultModel", () => {
    const want = { 100: "綠燈", 90: "綠燈", 89: "黃燈", 65: "黃燈", 64: "紅燈", 0: "紅燈" };
    for (const [s, label] of Object.entries(want)) {
      const r = { recognizedText: "a", targetText: "b", score: Number(s), light: sim.lightOf(Number(s)) };
      assert.equal(panel.resultModel(r).lightLabel, label, s);
    }
  });

  test("畫面文字：不含「發音評分」；說明原文", () => {
    assert.ok(!JSON.stringify(panel.TEXT).includes("發音評分"));
    // AC-08-13（v0.9）原文
    assert.equal(panel.TEXT.notice, "語音辨識由瀏覽器提供，您的語音會傳送到瀏覽器廠商（如 Google、Microsoft）的伺服器處理；本系統只即時讀取音量以顯示收音條，不錄音、不保存、不上傳錄音。停留在單字卡頁期間，瀏覽器可能持續顯示麥克風使用中圖示，離開單字卡頁即停止使用麥克風");
    assert.equal(panel.TEXT.noDevice, "找不到麥克風裝置");
    assert.equal(panel.TEXT.noDeviceHelp, "請確認裝置已連接麥克風後再按一次");
    assert.equal(panel.TEXT.meterLabel, "收音音量");
    assert.equal(panel.targetOf({ item: { word: "latency" } }), "latency");
    assert.equal(panel.targetOf(null), "");
  });

  // ─────────────────────────────────────────────────────────────
  // 語音面板（瀏覽器端）：以最小假 DOM 在 vm 沙箱載入 core/dom.js 與 views/speech-panel.js
  // ─────────────────────────────────────────────────────────────

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
    /** 模擬瀏覽器：有 disabled 屬性的按鈕不會觸發 click */
    click() {
      if (this.hasAttribute("disabled") || this.disabled === true) return;
      (this.listeners.click || []).forEach((f) => f({ type: "click", currentTarget: this, stopPropagation() {} }));
    }
    /** 深度優先找出符合條件的後代 */
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

  /**
   * 建立語音面板測試環境（每次新的沙箱，避免模組內狀態互相影響）。
   * @param {{ttsSupported: boolean, sttSupported: boolean, online?: boolean, acknowledged?: boolean, sttImpl?: object}} o
   *   sttImpl：改用真正的 services/stt.js 實例（stt.create(假全域)），驗證服務與面板串接
   *   mic：替身 EMT.services.mic（省略 = 沒有麥克風服務，退回 v0.8 行為）
   *   dialog：替身 EMT.ui.dialog（說明對話框）；noMeter：不載入 core/meter.js
   */
  function panelEnv(o) {
    const sandbox = { console: console, document: fakeDocument, Promise: Promise };
    sandbox.self = sandbox;
    sandbox.window = sandbox;
    vm.createContext(sandbox);
    const files = o.noMeter
      ? ["core/dom.js", "core/similarity.js", "views/speech-panel.js"]
      : ["core/dom.js", "core/similarity.js", "core/meter.js", "views/speech-panel.js"];
    for (const rel of files) {
      vm.runInContext(fs.readFileSync(path.join(APP_DIR, rel), "utf8"), sandbox, { filename: rel });
    }
    // statuses：狀態序列；phases：同序列但準備中附子階段（"preparing:acquiringMic"）
    const log = { toasts: [], speak: 0, start: 0, stop: 0, abort: 0, statuses: [], phases: [], actions: [] };
    const sttCb = {};
    const state = {
      data: { sttNoticeAcknowledged: o.acknowledged !== false },
      runtime: { speech: { ttsSupported: o.ttsSupported, sttSupported: o.sttSupported, sttStatus: "idle", preparingPhase: null, lastResult: null } }
    };
    const subs = [];
    const notify = () => subs.forEach((f) => f(state, ["speech"]));
    const EMT = sandbox.EMT;
    EMT.ui = { toast: { show: (text) => log.toasts.push(text) } };
    if (o.dialog) EMT.ui.dialog = o.dialog;
    if (o.mic) EMT.services = { mic: o.mic };
    EMT.services = Object.assign(EMT.services || {}, {
      tts: {
        isSupported: () => o.ttsSupported,
        speak: () => { log.speak++; return Promise.resolve({ ok: true }); },
        stop() {}
      },
      stt: o.sttImpl || {
        isSupported: () => o.sttSupported,
        isOnline: () => o.online !== false,
        start: (opts) => { log.start++; Object.assign(sttCb, opts); return { ok: true }; },
        stop: () => { log.stop++; },
        abort: () => { log.abort++; }
      }
    });
    const actions = {
      // v0.15（FE-91 介面）：準備中附子階段；其他狀態子階段為 null
      setSttStatus: (s, phase) => {
        state.runtime.speech.sttStatus = s;
        state.runtime.speech.preparingPhase = s === "preparing" ? phase : null;
        log.statuses.push(s);
        log.phases.push(s === "preparing" ? s + ":" + phase : s);
        notify();
      },
      setSttResult: (r) => { state.runtime.speech.lastResult = r; notify(); },
      recordSttScored() {},
      acknowledgeSttNotice() { state.data.sttNoticeAcknowledged = true; }
    };
    // 每個 store action 的呼叫與參數都記錄下來（驗證音量值不會傳入 store）
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
    const card = { kind: "builtin", wordKey: "latency", item: { word: "latency" } };
    EMT.components.speechPanel.render(container, card, state);
    const buttons = container.findAll((n) => n.tagName === "BUTTON");
    const tts = buttons.filter((b) => b.className.includes("sp-tts__btn"));
    const mic = buttons.find((b) => b.className.includes("sp-mic"));
    const msgBox = container.findAll((n) => n.className.includes("sp-msg") && !n.className.includes("sp-msg__"))[0];
    return { sandbox, container, tts, mic, msgBox, log, state, sttCb };
  }

  /**
   * （v0.15）按下後先經過準備中（acquiringMic → fallbackWait）才進入聆聽中（AC-58-01、AC-58-09）。
   * 本檔替身 start() 回 { ok: true }（沒有 audioStartSupported）且沙箱沒有 setTimeout，所以 fallbackWait 直接聆聽。
   */
  function assertPreparedThenListening(env, label) {
    const p = env.log.phases;
    const i = p.lastIndexOf("preparing:acquiringMic");
    assert.ok(i >= 0, (label || "") + " 先進入準備中：" + JSON.stringify(p));
    assert.deepEqual(p.slice(i, i + 3), ["preparing:acquiringMic", "preparing:fallbackWait", "listening"], (label || "") + JSON.stringify(p));
  }

  /** 訊息列目前的主訊息與補充說明 */
  function messageOf(env) {
    const text = env.msgBox.findAll((n) => n.className === "sp-msg__text")[0];
    const help = env.msgBox.findAll((n) => n.className === "sp-msg__help")[0];
    return { hidden: env.msgBox.hidden, text: text ? text.textContent : "", help: help ? help.textContent : "" };
  }

  test("停用按鈕例外：不支援 TTS → 朗讀鈕 aria-disabled + title、無 disabled；點擊只顯示 toast（§9 v0.3、AC-07-04）", () => {
    const env = panelEnv({ ttsSupported: false, sttSupported: true });
    assert.equal(env.tts.length, 2);
    for (const b of env.tts) {
      assert.equal(b.getAttribute("aria-disabled"), "true");
      assert.equal(b.getAttribute("title"), "此瀏覽器不支援語音朗讀");
      assert.equal(b.hasAttribute("disabled"), false);
      assert.notEqual(b.disabled, true);
    }
    assert.doesNotThrow(() => env.tts[0].click());
    env.tts[1].click();
    assert.deepEqual(env.log.toasts, ["此瀏覽器不支援語音朗讀", "此瀏覽器不支援語音朗讀"]);
    assert.equal(env.log.speak, 0, "不開始朗讀");
    // 麥克風不受影響
    assert.equal(env.mic.hasAttribute("aria-disabled"), false);
  });

  test("停用按鈕例外：不支援 STT → 麥克風 aria-disabled + title、無 disabled；點擊 toast 逐字（§9 v0.3、AC-08-02）", () => {
    const env = panelEnv({ ttsSupported: true, sttSupported: false });
    assert.equal(env.mic.getAttribute("aria-disabled"), "true");
    assert.equal(env.mic.getAttribute("title"), "建議使用 Google Chrome / Edge");
    assert.equal(env.mic.hasAttribute("disabled"), false);
    assert.notEqual(env.mic.disabled, true);
    assert.doesNotThrow(() => env.mic.click());
    assert.deepEqual(env.log.toasts, ["建議使用 Google Chrome / Edge"]);
    assert.equal(env.log.start, 0, "不開始聆聽");
    assert.equal(env.state.runtime.speech.sttStatus, "idle");
    // 朗讀鈕不受影響
    for (const b of env.tts) assert.equal(b.hasAttribute("aria-disabled"), false);
  });

  test("支援時：按鈕皆無 aria-disabled、disabled", () => {
    const env = panelEnv({ ttsSupported: true, sttSupported: true });
    for (const b of env.tts.concat([env.mic])) {
      assert.equal(b.hasAttribute("aria-disabled"), false);
      assert.equal(b.hasAttribute("disabled"), false);
    }
    env.tts[0].click();
    assert.equal(env.log.speak, 1);
    assert.deepEqual(env.log.toasts, []);
  });

  test("麥克風流程：各錯誤代碼主訊息逐字、按鈕回待機、不拋例外（§7.6 對照表、AC-08-09、AC-08-14）", () => {
    const cases = [
      ["not-allowed", "需要麥克風權限", "網址列左側"],
      ["service-not-allowed", "需要麥克風權限", "網址列左側"],
      ["audio-capture", "找不到麥克風裝置", "請確認裝置已連接麥克風後再按一次"],
      ["network", "語音辨識需要網路連線", ""],
      ["no-speech", "未偵測到語音，請再試一次", ""],
      ["language-not-supported", "語音辨識發生錯誤，請稍後再試一次", ""],
      ["bad-grammar", "語音辨識發生錯誤，請稍後再試一次", ""]
    ];
    for (const [code, text, help] of cases) {
      const env = panelEnv({ ttsSupported: true, sttSupported: true });
      env.mic.click();
      assertPreparedThenListening(env, code);
      assert.equal(env.state.runtime.speech.sttStatus, "listening", code);
      assert.equal(env.mic.getAttribute("aria-pressed"), "true", code);
      assert.doesNotThrow(() => { env.sttCb.onError(code); env.sttCb.onEnd({ manual: false, hadResult: false, hadError: true }); }, code);
      const m = messageOf(env);
      assert.equal(m.hidden, false, code);
      assert.equal(m.text, text, code);
      if (help) assert.ok(m.help.includes(help), code + "：" + m.help);
      assert.equal(env.state.runtime.speech.sttStatus, "idle", code);
      assert.equal(env.mic.getAttribute("aria-pressed"), "false", code);
    }
  });

  test("麥克風流程：aborted 非手動停止 →「語音辨識發生錯誤，請稍後再試一次」（§7.6 對照表）", () => {
    const env = panelEnv({ ttsSupported: true, sttSupported: true });
    env.mic.click();
    assertPreparedThenListening(env);
    env.sttCb.onError("aborted");
    env.sttCb.onEnd({ manual: false, hadResult: false, hadError: true });
    assert.equal(env.state.runtime.speech.sttStatus, "idle");
    assert.equal(messageOf(env).hidden, false);
    assert.equal(messageOf(env).text, "語音辨識發生錯誤，請稍後再試一次");
    assert.equal(env.mic.getAttribute("aria-pressed"), "false");
  });

  test("麥克風流程（串接真正 stt.js）：非手動 aborted 顯示錯誤；手動停止的 aborted 不提示（§7.6、AC-08-10）", () => {
    // 非手動：辨識器自行中止
    const f1 = fakeSttGlobal();
    const env1 = panelEnv({ ttsSupported: true, sttSupported: true, sttImpl: stt.create(f1.g) });
    env1.mic.click();
    assert.equal(f1.made.length, 1);
    assertPreparedThenListening(env1);
    assert.equal(env1.state.runtime.speech.sttStatus, "listening");
    f1.made[0].onerror({ error: "aborted" });
    f1.made[0].onend();
    assert.equal(env1.state.runtime.speech.sttStatus, "idle");
    assert.equal(messageOf(env1).text, "語音辨識發生錯誤，請稍後再試一次");

    // 手動：聆聽中再按一次麥克風 → stop；之後瀏覽器送出 aborted 與 end
    const f2 = fakeSttGlobal();
    const env2 = panelEnv({ ttsSupported: true, sttSupported: true, sttImpl: stt.create(f2.g) });
    env2.mic.click();
    const rec = f2.made[0];
    env2.mic.click();
    assert.equal(rec.stopped, 1);
    rec.onerror({ error: "aborted" });
    rec.onend();
    assert.equal(env2.state.runtime.speech.sttStatus, "idle");
    assert.equal(messageOf(env2).hidden, true, "手動停止不顯示提示");
    assert.deepEqual(env2.log.toasts, []);
  });

  test("麥克風流程：聆聽中再按一次 → stop、回待機、不提示（AC-08-10）", () => {
    const env = panelEnv({ ttsSupported: true, sttSupported: true });
    env.mic.click();
    assert.equal(env.state.runtime.speech.sttStatus, "listening");
    env.mic.click();
    assert.equal(env.log.stop, 1);
    assert.equal(env.state.runtime.speech.sttStatus, "idle");
    env.sttCb.onEnd({ manual: true, hadResult: false, hadError: false });
    assert.equal(messageOf(env).hidden, true);
    assert.deepEqual(env.log.toasts, []);
  });

  test("麥克風流程：結束時無結果 → 依是否已確認收音分流、不顯示分數（AC-08-10、AC-59-03、AC-59-05、AC-58-08）", () => {
    // 已確認開始收音（本沙箱 fallbackWait 直接聆聽 = 後備時間已到）且無結果 →「未偵測到語音」（MS-1 (5)）
    const env = panelEnv({ ttsSupported: true, sttSupported: true });
    env.mic.click();
    assert.equal(env.state.runtime.speech.sttStatus, "listening");
    env.sttCb.onEnd({ manual: false, hadResult: false, hadError: false });
    assert.equal(messageOf(env).text, "未偵測到語音，請再試一次");
    assert.equal(env.state.runtime.speech.lastResult, null);
    // v0.15：辨識文字清洗後為空 →「有收到聲音，但沒聽出英文單字，請再說一次」（AC-59-03）
    const env2 = panelEnv({ ttsSupported: true, sttSupported: true });
    env2.mic.click();
    env2.sttCb.onResult("...");
    assert.equal(messageOf(env2).text, "有收到聲音，但沒聽出英文單字，請再說一次");
    assert.equal(env2.state.runtime.speech.lastResult, null);
    // 未經確認就結束（start 內同步 end，仍在準備中）→「語音辨識沒有回應，請再試一次」（MS-1 (6)）
    const env3 = panelEnv({ ttsSupported: true, sttSupported: true });
    const svc = env3.sandbox.EMT.services.stt;
    svc.start = (opts) => { env3.log.start++; opts.onEnd({ manual: false, hadResult: false, hadError: false }); return { ok: true }; };
    env3.mic.click();
    assert.equal(messageOf(env3).text, "語音辨識沒有回應，請再試一次");
    assert.equal(env3.state.runtime.speech.sttStatus, "idle");
    assert.equal(env3.state.runtime.speech.lastResult, null);
  });

  test("麥克風流程：離線 → 不開始聆聽、提示「語音辨識需要網路連線」（AC-08-14）", () => {
    const env = panelEnv({ ttsSupported: true, sttSupported: true, online: false });
    env.mic.click();
    assert.equal(env.log.start, 0);
    assert.equal(messageOf(env).text, "語音辨識需要網路連線");
    assert.equal(env.state.runtime.speech.sttStatus, "idle");
  });

  test("麥克風流程：辨識成功 → 寫入結果、顯示分數區（AC-08-03、AC-08-11）", () => {
    const env = panelEnv({ ttsSupported: true, sttSupported: true });
    env.mic.click();
    assertPreparedThenListening(env);
    env.sttCb.onResult("Latency.");
    const r = env.state.runtime.speech.lastResult;
    assert.equal(r.score, 100);
    assert.equal(r.light, "green");
    assert.equal(env.state.runtime.speech.sttStatus, "idle");
    const box = env.container.findAll((n) => n.className === "sp-result")[0];
    assert.equal(box.hidden, false);
    assert.ok(box.textContent.includes("辨識吻合度"));
    assert.ok(box.textContent.includes("100"));
  });

  /** 分數區元素 */
  function resultBoxOf(env) {
    return env.container.findAll((n) => n.className === "sp-result")[0];
  }

  test("BUG-001 回歸：先評分，再離線按麥克風 → 只顯示離線訊息、分數區隱藏且清空、lastResult 為 null（AC-08-14）", () => {
    // isOnline 每次呼叫都讀 opts.online，可於測試中途切換為離線
    const opts = { ttsSupported: true, sttSupported: true, online: true };
    const env = panelEnv(opts);
    env.mic.click();
    env.sttCb.onResult("Latency.");
    const box = resultBoxOf(env);
    assert.equal(box.hidden, false, "前置：已顯示分數");
    assert.ok(box.textContent.includes("100"));

    opts.online = false;
    assert.doesNotThrow(() => env.mic.click());
    assert.equal(env.log.start, 1, "離線不開始聆聽");
    assert.equal(messageOf(env).text, "語音辨識需要網路連線");
    assert.equal(env.state.runtime.speech.sttStatus, "idle");
    assert.equal(env.mic.getAttribute("aria-pressed"), "false");
    assert.equal(env.state.runtime.speech.lastResult, null, "lastResult 已清除");
    assert.equal(box.hidden, true, "分數區隱藏");
    assert.equal(box.textContent, "", "分數區無殘留文字");
    assert.ok(!env.container.textContent.includes("辨識吻合度"), "畫面不顯示分數");
  });

  test("BUG-001 回歸：先評分，再無法開始聆聽（start 失敗／例外）→ 錯誤訊息且不顯示前次分數", () => {
    const cases = [
      ["offline", { ok: false, reason: "offline" }, "語音辨識需要網路連線"],
      ["error", { ok: false, reason: "error" }, "語音辨識發生錯誤，請稍後再試一次"],
      ["throw", null, "語音辨識發生錯誤，請稍後再試一次"]
    ];
    for (const [name, ret, text] of cases) {
      const env = panelEnv({ ttsSupported: true, sttSupported: true });
      env.mic.click();
      env.sttCb.onResult("Latency.");
      assert.equal(resultBoxOf(env).hidden, false, name + "：前置已顯示分數");
      const svc = env.sandbox.EMT.services.stt;
      svc.start = () => { if (!ret) throw new Error("boom"); return ret; };
      const origError = console.error;
      console.error = () => {};
      try {
        assert.doesNotThrow(() => env.mic.click(), name);
      } finally {
        console.error = origError;
      }
      assert.equal(messageOf(env).text, text, name);
      assert.equal(env.state.runtime.speech.sttStatus, "idle", name);
      assert.equal(env.state.runtime.speech.lastResult, null, name);
      assert.equal(resultBoxOf(env).hidden, true, name);
      assert.equal(resultBoxOf(env).textContent, "", name);
    }
  });

  test("BUG-001 回歸：先評分，再聆聽發生錯誤 → 分數已清除（AC-08-09、AC-08-14）", () => {
    for (const code of ["not-allowed", "network", "no-speech", "aborted"]) {
      const env = panelEnv({ ttsSupported: true, sttSupported: true });
      env.mic.click();
      env.sttCb.onResult("Latency.");
      env.mic.click();
      env.sttCb.onError(code);
      env.sttCb.onEnd({ manual: false, hadResult: false, hadError: true });
      assert.equal(env.state.runtime.speech.lastResult, null, code);
      assert.equal(resultBoxOf(env).hidden, true, code);
    }
  });

  // ─────────────────────────────────────────────────────────────
  // v0.9（FE-39）：麥克風取得、5 格收音條、錯誤對照、釋放（§7.14、§10.2「speech.test.js」列）
  // ─────────────────────────────────────────────────────────────

  const NOTICE_V09 = "語音辨識由瀏覽器提供，您的語音會傳送到瀏覽器廠商（如 Google、Microsoft）的伺服器處理；本系統只即時讀取音量以顯示收音條，不錄音、不保存、不上傳錄音。停留在單字卡頁期間，瀏覽器可能持續顯示麥克風使用中圖示，離開單字卡頁即停止使用麥克風";
  const PERM = "需要麥克風權限";
  const NO_DEVICE = "找不到麥克風裝置";
  const NO_DEVICE_HELP = "請確認裝置已連接麥克風後再按一次";

  /** 讓 Promise 回呼全部執行完 */
  const flush = () => new Promise((r) => setImmediate(r));

  /**
   * 替身 EMT.services.mic。
   * result：acquire 回傳值；deferred：acquire 回傳待決 Promise，以 resolveAll(r) 完成
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
      isSupported: () => true,
      isActive: () => false,
      acquire() {
        log.acquire++;
        if (m.deferred) return new Promise((r) => m.waiters.push(r));
        return Promise.resolve(m.result);
      },
      resolveAll(r) { m.waiters.splice(0).forEach((f) => f(r || m.result)); },
      startMeter(fn) {
        log.startMeter++;
        m.onLevel = fn;
        if (!m.result.metering) { fn(0); return false; }
        return true;
      },
      // 刻意不清除 onLevel：用來驗證面板會忽略停止後晚到的回呼
      stopMeter() { log.stopMeter++; },
      onTrackEnded(fn) { m.endedCb = fn; },
      release() { log.release++; },
      tracks: () => []
    };
    return m;
  }

  /** 收音條 5 格的 is-on 狀態 */
  function barsOf(env) {
    return env.container
      .findAll((n) => n.className.split(/\s+/).includes("sp-meter__bar"))
      .map((b) => b.classList.contains("is-on"));
  }
  const DARK = [false, false, false, false, false];

  /** 所有 store action 參數中不得出現數字（音量值不進 store，§7.14）；可排除指定 action */
  function assertNoNumberArgs(env, except = []) {
    const deep = (v) => typeof v === "number" || (v !== null && typeof v === "object" && Object.values(v).some(deep));
    for (const c of env.log.actions) {
      if (except.includes(c.name)) continue;
      assert.ok(!c.args.some(deep), c.name + " 參數含數字：" + JSON.stringify(c.args));
    }
  }

  /** 以替身 mic 建立面板並按一次麥克風、等取得完成 */
  async function listeningEnv(extra = {}) {
    const mic = fakeMic(extra.micOpts);
    const env = panelEnv(Object.assign({ ttsSupported: true, sttSupported: true, mic }, extra));
    env.micSvc = mic;
    env.mic.click();
    await flush();
    return env;
  }

  test("純函式：messageForAcquire 四種 reason（§7.14 錯誤對照）", () => {
    const p = panel.messageForAcquire("permission");
    assert.equal(p.text, PERM);
    assert.equal(p.help, panel.TEXT.permissionHelp);
    assert.equal(p.kind, "error");
    assert.deepEqual(panel.messageForAcquire("notfound"), { text: NO_DEVICE, help: NO_DEVICE_HELP, kind: "error" });
    assert.equal(panel.messageForAcquire("unavailable"), null);
    assert.equal(panel.messageForAcquire("released"), null);
    assert.equal(panel.messageForAcquire(undefined), null);
  });

  test("純函式：meterBarsOf(0～5) 前 k 格亮；非 0～5 整數全暗", () => {
    for (let k = 0; k <= 5; k++) {
      assert.deepEqual(panel.meterBarsOf(k), DARK.map((_, i) => i < k), String(k));
    }
    for (const bad of [-1, 6, 2.5, NaN, "3", null, undefined]) assert.deepEqual(panel.meterBarsOf(bad), DARK, String(bad));
  });

  test("純函式：meter 不存在時 meterBarsOf 一律全暗（vm 沙箱不載入 core/meter.js）", () => {
    const env = panelEnv({ ttsSupported: true, sttSupported: true, noMeter: true });
    const logic = env.sandbox.EMT.components.speechPanelLogic;
    assert.deepEqual(Array.from(logic.meterBarsOf(3)), DARK);
    assert.deepEqual(barsOf(env), DARK);
  });

  test("DOM：.sp-stt 依序為麥克風、收音條（role=img、aria-label 收音音量、5 格）、需要連網；初始全暗（AC-33-03）", () => {
    const env = panelEnv({ ttsSupported: true, sttSupported: true, mic: fakeMic() });
    const row = env.container.findAll((n) => n.className === "sp-stt")[0];
    assert.equal(row.childNodes.length, 3);
    assert.ok(row.childNodes[0].className.includes("sp-mic"));
    const meterEl = row.childNodes[1];
    assert.equal(meterEl.className, "sp-meter");
    assert.equal(meterEl.tagName, "SPAN");
    assert.equal(meterEl.getAttribute("role"), "img");
    assert.equal(meterEl.getAttribute("aria-label"), "收音音量");
    assert.equal(meterEl.childNodes.length, 5);
    for (const b of meterEl.childNodes) {
      assert.equal(b.tagName, "SPAN");
      assert.equal(b.className, "sp-meter__bar");
      assert.equal(b.hidden, false);
    }
    assert.equal(row.childNodes[2].className, "sp-net");
    assert.deepEqual(barsOf(env), DARK);
  });

  test("不支援 SpeechRecognition → 只 toast，mic.acquire 0 次（AC-08-02）", async () => {
    const mic = fakeMic();
    const env = panelEnv({ ttsSupported: true, sttSupported: false, mic });
    env.mic.click();
    await flush();
    assert.deepEqual(env.log.toasts, ["建議使用 Google Chrome / Edge"]);
    assert.equal(mic.log.acquire, 0);
    assert.equal(env.log.start, 0);
  });

  test("離線 → 離線訊息，mic.acquire 0 次（AC-08-14）", async () => {
    const mic = fakeMic();
    const env = panelEnv({ ttsSupported: true, sttSupported: true, online: false, mic });
    env.mic.click();
    await flush();
    assert.equal(mic.log.acquire, 0);
    assert.equal(env.log.start, 0);
    assert.equal(messageOf(env).text, "語音辨識需要網路連線");
    assert.deepEqual(barsOf(env), DARK);
  });

  test("說明對話框：文字為 AC-08-13（v0.9）；「取消」→ acquire 0 次、回待機；「我知道了」→ acquire 後才 stt.start（AC-08-13）", async () => {
    const shown = [];
    let answer = false;
    const dialog = { confirm: (opts) => { shown.push(opts); return Promise.resolve(answer); } };
    const mic = fakeMic({ deferred: true });
    const env = panelEnv({ ttsSupported: true, sttSupported: true, acknowledged: false, mic, dialog });

    env.mic.click();
    assert.equal(env.state.runtime.speech.sttStatus, "notice");
    await flush();
    assert.equal(shown[0].message, NOTICE_V09);
    assert.equal(shown[0].okText, "我知道了");
    assert.equal(shown[0].cancelText, "取消");
    assert.equal(mic.log.acquire, 0, "取消不取得麥克風");
    assert.equal(env.log.start, 0);
    assert.equal(env.state.runtime.speech.sttStatus, "idle");
    assert.equal(env.state.data.sttNoticeAcknowledged, false);

    answer = true;
    env.mic.click();
    await flush();
    assert.equal(shown.length, 2, "未讀時仍顯示說明");
    assert.equal(mic.log.acquire, 1, "我知道了 → 取得麥克風");
    assert.equal(env.log.start, 0, "取得完成前不開始辨識");
    assert.equal(env.state.data.sttNoticeAcknowledged, true);
    assert.equal(env.state.runtime.speech.sttStatus, "preparing", "v0.15：取得期間為準備中");
    assert.equal(env.state.runtime.speech.preparingPhase, "acquiringMic");
    mic.resolveAll();
    await flush();
    assert.equal(env.log.start, 1);
    assertPreparedThenListening(env);
    assert.equal(env.state.runtime.speech.sttStatus, "listening");
    assert.equal(mic.log.startMeter, 1);
  });

  test("permission／notfound → 訊息逐字、stt.start 0 次、收音條全暗、不顯示分數；再按會重新取得（AC-08-09、AC-33-05）", async () => {
    const cases = [
      ["permission", PERM, null],
      ["notfound", NO_DEVICE, NO_DEVICE_HELP]
    ];
    for (const [reason, text, help] of cases) {
      const mic = fakeMic();
      const env = panelEnv({ ttsSupported: true, sttSupported: true, mic });
      // 前置：先完成一次評分，確認失敗時前次分數會被清除
      env.mic.click();
      await flush();
      env.sttCb.onResult("Latency.");
      assert.equal(resultBoxOf(env).hidden, false, reason);

      mic.result = { ok: false, reason };
      env.mic.click();
      await flush();
      assert.equal(env.log.start, 1, reason + "：不開始辨識");
      const m = messageOf(env);
      assert.equal(m.text, text, reason);
      if (help) assert.equal(m.help, help, reason);
      else assert.equal(m.help, panel.TEXT.permissionHelp, reason);
      assert.deepEqual(barsOf(env), DARK, reason);
      assert.equal(env.state.runtime.speech.sttStatus, "idle", reason);
      assert.equal(env.mic.getAttribute("aria-pressed"), "false", reason);
      assert.equal(env.state.runtime.speech.lastResult, null, reason);
      assert.equal(resultBoxOf(env).hidden, true, reason);

      env.mic.click();
      await flush();
      assert.equal(mic.log.acquire, 3, reason + "：下次按下重新嘗試取得");
    }
  });

  test("permission／notfound 首次按下：stt.start 0 次（AC-08-09、AC-33-05）", async () => {
    for (const reason of ["permission", "notfound"]) {
      const env = await listeningEnv({ micOpts: { result: { ok: false, reason } } });
      assert.equal(env.log.start, 0, reason);
      assert.equal(env.micSvc.log.startMeter, 0, reason);
      assert.deepEqual(barsOf(env), DARK, reason);
    }
  });

  test("unavailable 或 metering false → 照常 stt.start、收音條全暗、無訊息（AC-33-07）", async () => {
    for (const result of [{ ok: false, reason: "unavailable" }, { ok: true, reused: false, metering: false }]) {
      const env = await listeningEnv({ micOpts: { result } });
      assert.equal(env.log.start, 1, JSON.stringify(result));
      assertPreparedThenListening(env, JSON.stringify(result));
      assert.equal(env.state.runtime.speech.sttStatus, "listening");
      assert.equal(messageOf(env).hidden, true);
      assert.deepEqual(env.log.toasts, []);
      assert.deepEqual(barsOf(env), DARK);
    }
    // 沒有麥克風服務（mic 未載入）也一樣照常辨識
    const env2 = panelEnv({ ttsSupported: true, sttSupported: true });
    env2.mic.click();
    assert.equal(env2.log.start, 1);
    assert.deepEqual(barsOf(env2), DARK);
  });

  test("released → 不提示、不辨識", async () => {
    const env = await listeningEnv({ micOpts: { result: { ok: false, reason: "released" } } });
    assert.equal(env.log.start, 0);
    assert.equal(messageOf(env).hidden, true);
    assert.equal(env.state.runtime.speech.sttStatus, "idle");
  });

  test("聆聽中 onLevel(k) → 恰亮前 k 格，亮格從左側連續（AC-33-03、AC-33-04）", async () => {
    const env = await listeningEnv();
    assertPreparedThenListening(env);
    assert.equal(env.state.runtime.speech.sttStatus, "listening");
    assert.equal(env.micSvc.log.startMeter, 1, "進入聆聽後才開始讀音量");
    assert.deepEqual(barsOf(env), DARK);
    env.micSvc.onLevel(3);
    assert.deepEqual(barsOf(env), [true, true, true, false, false]);
    env.micSvc.onLevel(5);
    assert.deepEqual(barsOf(env), [true, true, true, true, true]);
    env.micSvc.onLevel(1);
    assert.deepEqual(barsOf(env), [true, false, false, false, false]);
    env.micSvc.onLevel(0);
    assert.deepEqual(barsOf(env), DARK);
  });

  test("聆聽結束的每種路徑：同步全暗、呼叫 stopMeter、晚到的音量回呼不再點亮（AC-33-03）", async () => {
    const endings = {
      "結果": (env) => env.sttCb.onResult("Latency."),
      "錯誤": (env) => env.sttCb.onError("network"),
      "逾時／無結果": (env) => env.sttCb.onEnd({ manual: false, hadResult: false, hadError: false }),
      "再按停止": (env) => env.mic.click(),
      "reset()": (env) => env.sandbox.EMT.components.speechPanel.reset(),
      "改按朗讀": (env) => env.tts[0].click()
    };
    for (const [name, end] of Object.entries(endings)) {
      const env = await listeningEnv();
      env.micSvc.onLevel(4);
      assert.deepEqual(barsOf(env), [true, true, true, true, false], name);
      const before = env.micSvc.log.stopMeter;
      end(env); // 同步檢查，不等任何計時器
      assert.deepEqual(barsOf(env), DARK, name + "：同步全暗");
      assert.ok(env.micSvc.log.stopMeter > before, name + "：呼叫 stopMeter");
      assert.equal(env.state.runtime.speech.sttStatus, "idle", name);
      env.micSvc.onLevel(5);
      assert.deepEqual(barsOf(env), DARK, name + "：晚到回呼被忽略");
    }
  });

  test("stt.start 失敗 → 收音條全暗、不開始讀音量", async () => {
    const mic = fakeMic();
    const env = panelEnv({ ttsSupported: true, sttSupported: true, mic });
    env.sandbox.EMT.services.stt.start = () => ({ ok: false, reason: "error" });
    env.mic.click();
    await flush();
    assert.equal(mic.log.startMeter, 0);
    assert.deepEqual(barsOf(env), DARK);
    assert.equal(messageOf(env).text, "語音辨識發生錯誤，請稍後再試一次");
    assert.equal(env.state.runtime.speech.sttStatus, "idle");
  });

  test("取得中再按 = 取消（v0.15，AC-58-04 (a)）；取得中換卡（reset）→ 完成後不開始辨識（§7.14）", async () => {
    const mic = fakeMic({ deferred: true });
    const env = panelEnv({ ttsSupported: true, sttSupported: true, mic });
    env.mic.click();
    assert.equal(env.state.runtime.speech.sttStatus, "preparing");
    assert.equal(mic.log.acquire, 1);
    env.mic.click(); // 取消
    assert.equal(env.state.runtime.speech.sttStatus, "idle", "取得中再按 = 取消，回待機");
    assert.equal(env.state.runtime.speech.preparingPhase, null);
    assert.equal(messageOf(env).hidden, true, "取消不提示");
    env.mic.click(); // 新嘗試（替身每次回新的待決 Promise；真正 mic.js 共用同一個，見 speech-flow.test.js）
    assert.equal(mic.log.acquire, 2);
    assert.equal(env.state.runtime.speech.sttStatus, "preparing");
    mic.resolveAll();
    await flush();
    assert.equal(env.log.start, 1, "只有新代號開始辨識");
    assert.equal(env.state.runtime.speech.sttStatus, "listening");
    env.mic.click(); // 停止
    assert.equal(env.state.runtime.speech.sttStatus, "idle");

    env.mic.click();
    assert.equal(mic.log.acquire, 3);
    env.sandbox.EMT.components.speechPanel.reset(); // 換卡
    assert.equal(env.state.runtime.speech.sttStatus, "idle", "準備中換卡 → 待機");
    mic.resolveAll();
    await flush();
    assert.equal(env.log.start, 1, "gen 已變：不開始辨識");
    assert.equal(mic.log.release, 0, "reset 不釋放音軌");
    assert.equal(env.state.runtime.speech.sttStatus, "idle");
    assert.deepEqual(barsOf(env), DARK);
  });

  test("聆聽中音軌結束 → stt.abort、回待機、「找不到麥克風裝置」、全暗；未聆聽時不提示（AC-33-06）", async () => {
    const env = await listeningEnv();
    env.micSvc.onLevel(3);
    assert.equal(typeof env.micSvc.endedCb, "function", "已登錄 onTrackEnded");
    const stopBefore = env.micSvc.log.stopMeter;
    assert.doesNotThrow(() => env.micSvc.endedCb());
    assert.equal(env.log.abort, 1);
    assert.equal(env.state.runtime.speech.sttStatus, "idle");
    assert.deepEqual(messageOf(env), { hidden: false, text: NO_DEVICE, help: NO_DEVICE_HELP });
    assert.deepEqual(barsOf(env), DARK);
    assert.ok(env.micSvc.log.stopMeter > stopBefore);
    assert.equal(env.state.runtime.speech.lastResult, null, "不顯示分數");
    // 已中止辨識：晚到的 onEnd 不覆蓋訊息
    env.sttCb.onEnd({ manual: false, hadResult: false, hadError: false });
    assert.equal(messageOf(env).text, NO_DEVICE);

    const micSvc = fakeMic();
    const idle = panelEnv({ ttsSupported: true, sttSupported: true, mic: micSvc });
    micSvc.endedCb();
    assert.equal(messageOf(idle).hidden, true);
    assert.equal(idle.log.abort, 0);
    // (a) 下次按下重新 acquire
    idle.mic.click();
    await flush();
    assert.equal(micSvc.log.acquire, 1);
    assert.equal(idle.log.start, 1);
  });

  test("reset() 不呼叫 mic.release；release() 會呼叫並停止聆聽、全暗（AC-33-01、AC-33-02）", async () => {
    const env = await listeningEnv();
    const sp = env.sandbox.EMT.components.speechPanel;
    assert.equal(typeof sp.release, "function");
    sp.reset();
    assert.equal(env.micSvc.log.release, 0);
    env.mic.click();
    await flush();
    assert.equal(env.state.runtime.speech.sttStatus, "listening");
    env.micSvc.onLevel(2);
    sp.release();
    assert.equal(env.micSvc.log.release, 1);
    assert.equal(env.state.runtime.speech.sttStatus, "idle");
    assert.deepEqual(barsOf(env), DARK);
  });

  test("音量值不進 store：onLevel 期間 store action 不被呼叫，所有參數不含數字（§7.14、AC-21-03）", async () => {
    const env = await listeningEnv();
    const n = env.log.actions.length;
    for (const k of [1, 2, 3, 4, 5, 0, 3]) env.micSvc.onLevel(k);
    assert.equal(env.log.actions.length, n, "onLevel 不呼叫任何 store action");
    env.sttCb.onEnd({ manual: false, hadResult: false, hadError: false });
    assertNoNumberArgs(env);
    // 有評分時只有 setSttResult 帶數字（SttResult.score 是吻合度，非音量）
    const env2 = await listeningEnv();
    env2.micSvc.onLevel(4);
    env2.sttCb.onResult("Latency.");
    assertNoNumberArgs(env2, ["setSttResult"]);
    const res = env2.log.actions.filter((c) => c.name === "setSttResult" && c.args[0]);
    assert.deepEqual(Object.keys(res[0].args[0]).sort(), ["light", "recognizedText", "score", "targetText"]);
    assert.equal(env2.log.actions.filter((c) => c.name === "recordSttScored").length, 1, "只在顯示分數後記錄（AC-30-04）");
  });

  test("取得失敗不記錄學習事件（AC-30-04）", async () => {
    for (const reason of ["permission", "notfound"]) {
      const env = await listeningEnv({ micOpts: { result: { ok: false, reason } } });
      assert.equal(env.log.actions.filter((c) => c.name === "recordSttScored").length, 0, reason);
    }
  });

  test("串接真正 services/mic.js：同頁換卡後重用不再 getUserMedia；release 後所有替身音軌 ended、AudioContext 關閉（AC-33-01、AC-33-02、AC-33-04）", async () => {
    const micLib = require("../services/mic.js");
    const gum = [];
    const tracks = [];
    const timers = new Map();
    const connects = [];
    let nextId = 1;
    const ctxs = [];
    let samples = new Float32Array(2048);
    function AudioContext() {
      const self = this;
      this.sampleRate = 48000;
      this.closed = 0;
      this.destination = {};
      this.close = () => { self.closed++; return Promise.resolve(); };
      this.resume = () => Promise.resolve();
      this.createMediaStreamSource = () => ({ connect(t) { connects.push(t === self.destination); }, disconnect() {} });
      this.createAnalyser = () => ({
        fftSize: 2048,
        connect(t) { connects.push(t === self.destination); },
        disconnect() {},
        getFloatTimeDomainData(arr) { for (let i = 0; i < arr.length; i++) arr[i] = samples[i % samples.length]; }
      });
      ctxs.push(this);
    }
    const g = {
      AudioContext,
      setInterval(fn) { const id = nextId++; timers.set(id, fn); return id; },
      clearInterval(id) { timers.delete(id); },
      addEventListener() {},
      navigator: {
        mediaDevices: {
          getUserMedia(c) {
            gum.push(c);
            const t = { readyState: "live", stop() { this.readyState = "ended"; }, addEventListener() {}, removeEventListener() {} };
            tracks.push(t);
            return Promise.resolve({ getAudioTracks: () => [t] });
          }
        }
      }
    };
    const real = micLib.create(g);
    const env = panelEnv({ ttsSupported: true, sttSupported: true, mic: real });
    const sp = env.sandbox.EMT.components.speechPanel;

    env.mic.click();
    assert.equal(env.state.runtime.speech.sttStatus, "preparing", "取得中為準備中");
    await flush();
    assert.equal(gum.length, 1);
    assert.deepEqual(gum[0], { audio: true });
    assertPreparedThenListening(env);
    assert.equal(env.state.runtime.speech.sttStatus, "listening");
    // 以 −25 dBFS 的 1 kHz 正弦樣本 → 3 格（AC-33-04）
    const amp = Math.pow(10, -25 / 20) * Math.SQRT2;
    samples = Float32Array.from({ length: 2048 }, (_, i) => amp * Math.sin((2 * Math.PI * 1000 * i) / 48000));
    for (const fn of [...timers.values()]) fn();
    assert.deepEqual(barsOf(env), [true, true, true, false, false]);
    env.sttCb.onResult("Latency.");
    assert.deepEqual(barsOf(env), DARK);
    assert.equal(timers.size, 0, "聆聽結束即清除音量計時器");

    // 換卡（reset + 新容器）後再按：重用，不再呼叫 getUserMedia
    sp.reset();
    sp.render(env.container, { kind: "builtin", wordKey: "address", item: { word: "address" } }, env.state);
    const mic2 = env.container.findAll((n) => n.tagName === "BUTTON").find((b) => b.className.includes("sp-mic"));
    mic2.click();
    await flush();
    assert.equal(gum.length, 1, "同頁重用（AC-33-01）");
    assert.equal(env.state.runtime.speech.sttStatus, "listening");

    // 離開單字卡頁
    sp.release();
    assert.ok(tracks.length > 0);
    assert.ok(tracks.every((t) => t.readyState === "ended"), "所有音軌 ended（AC-33-02）");
    assert.ok(ctxs.length > 0 && ctxs.every((c) => c.closed >= 1), "AudioContext 已關閉");
    assert.equal(timers.size, 0);
    assert.ok(!connects.includes(true), "從不接到 destination");
    assert.deepEqual(barsOf(env), DARK);
    assert.equal(env.state.runtime.speech.sttStatus, "idle");
  });

  test("CSS：收音條固定大小、.sp-meter__bar 一律無 transition／animation、亮格用 --correct；減少動態時聆聽中不閃爍（A-5、A-6、AC-33-08）", () => {
    const css = fs.readFileSync(path.join(APP_DIR, "styles", "31-speech.css"), "utf8");
    const block = (sel) => {
      const re = new RegExp("(^|\\n)" + sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\{([^}]*)\\}");
      const m = css.match(re);
      assert.ok(m, "缺少 " + sel);
      return m[2];
    };
    const meterCss = block(".sp-meter");
    assert.match(meterCss, /display:\s*inline-flex/);
    assert.match(meterCss, /width:\s*\d+px/);
    assert.match(meterCss, /height:\s*\d+px/);
    const bar = block(".sp-meter__bar");
    assert.match(bar, /transition:\s*none/);
    assert.match(bar, /animation:\s*none/);
    assert.match(bar, /background:\s*var\(--border\)/);
    assert.match(block(".sp-meter__bar.is-on"), /background:\s*var\(--correct\)/);
    // 任何收音條規則都不得設定漸變或動畫
    for (const m of css.matchAll(/\.sp-meter[^{]*\{([^}]*)\}/g)) {
      assert.doesNotMatch(m[1], /transition:(?!\s*none\b)/, m[0]);
      assert.doesNotMatch(m[1], /animation:(?!\s*none\b)/, m[0]);
    }
    // 聆聽中閃爍保留，減少動態時關閉（固定紅底白字 + 文字「聆聽中」）
    assert.match(block(".sp-mic.is-listening"), /animation:\s*sp-blink/);
    assert.match(css, /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.sp-mic\.is-listening\s*\{\s*animation:\s*none;/);
    assert.equal(panel.TEXT.micListening, "聆聽中");
    // 麥克風按鈕固定最小寬度：切換「聆聽中」時收音條不位移（AC-33-03）
    assert.match(block(".sp-mic"), /min-width:\s*[\d.]+em/);
  });

  test("原始碼：speech-panel.js 不含錄音 API 名稱、不直接存取麥克風或儲存", () => {
    const js = fs.readFileSync(path.join(APP_DIR, "views", "speech-panel.js"), "utf8");
    for (const bad of ["Media" + "Recorder", "getUser" + "Media", "Audio" + "Context", "local" + "Storage", "Blob", "innerHTML"]) {
      assert.ok(!js.includes(bad), "不得出現 " + bad);
    }
  });
});
