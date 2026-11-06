/*
 * speech-flow.test.js — 語音辨識準備中、訊息分流與辨識文字（FE-92）
 * 受測：views/speech-panel.js（vm 沙箱 + 假 DOM + 注入的假時鐘）、與 services/stt.js、services/mic.js 串接
 * 依據：architecture.md v0.15 §7.26.1～§7.26.9、§10.12「speech-flow.test.js」列；
 *       契約 README §14.1 PR-1～PR-12、§14.2 MS-1～MS-6、§14.3 RT-1～RT-6、§14.5 V-STT-01～V-STT-10；data-schema §18
 * 涵蓋：AC-58-01～AC-58-13、AC-59-01～AC-59-07、AC-60-01～AC-60-05、AC-08-01、AC-08-06～AC-08-08、AC-08-10、AC-08-13、
 *       AC-30-04、AC-33-01、AC-33-03、AC-33-06、AC-33-07
 *
 * 時間值一律取自面板 TIMING（不寫死），範圍由契約檔驗證（V-STT-09）。
 */
"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const E = require("./_speech-env.js");
const panel = require("../views/speech-panel.js");
const sttLib = require("../services/stt.js");
const micLib = require("../services/mic.js");

const { TIMING, TEXT, outcomeOf } = panel;
const { makeEnv, fakeClock, flush, fakeSttGlobal, resultEv, fakeMic, messageOf, barsOf, resultBoxOf, callsOf } = E;
const DARK = [false, false, false, false, false];
const ROOT = path.join(__dirname, "..", "..", "..");

/** 以真正 stt.js 建立環境：audioStart 決定替身原型是否有 onaudiostart */
function realEnv(o = {}) {
  const f = fakeSttGlobal({ audioStart: o.audioStart, onStart: o.onStart });
  const stt = sttLib.create(f.g);
  const clock = o.clock === null ? undefined : (o.clock || fakeClock());
  const env = makeEnv(Object.assign({}, o, { sttImpl: stt, clock }));
  env.made = f.made;
  env.clock = clock;
  env.rec = () => f.made[f.made.length - 1];
  return env;
}

/** 按下麥克風並等取得完成 */
async function press(env) {
  env.mic.click();
  await flush();
}

/** 按鈕狀態快照 */
function micState(env) {
  return {
    text: env.micText.textContent,
    label: env.mic.getAttribute("aria-label"),
    pressed: env.mic.getAttribute("aria-pressed"),
    status: env.mic.getAttribute("data-status"),
    preparing: env.mic.classList.contains("is-preparing"),
    listening: env.mic.classList.contains("is-listening")
  };
}

// ════════════════════════════ V-STT-01 準備中畫面 ════════════════════════════

describe("V-STT-01 按下同步進入準備中", () => {
  test("文字「準備中」、aria-label 逐字、aria-pressed true、data-status、is-preparing；收音條全暗、不讀音量（AC-58-01、AC-58-02）", () => {
    const mic = fakeMic({ deferred: true });
    const env = makeEnv({ clock: fakeClock(), mic, audioStart: true });
    assert.deepEqual(micState(env), { text: "麥克風跟讀", label: "開始語音辨識", pressed: "false", status: "idle", preparing: false, listening: false });
    env.mic.click();
    // 同步（不等任何 Promise）
    assert.equal(env.state.runtime.speech.sttStatus, "preparing");
    assert.equal(env.state.runtime.speech.preparingPhase, "acquiringMic");
    assert.deepEqual(micState(env), { text: "準備中", label: "準備中，再按一次取消", pressed: "true", status: "preparing", preparing: true, listening: false });
    assert.deepEqual(barsOf(env), DARK);
    assert.equal(mic.log.startMeter, 0, "準備中不開始讀音量");
    assert.equal(env.log.start, 0, "取得完成前不呼叫 stt.start");
    assert.equal(env.log.ttsStop, 1, "開始嘗試時停止朗讀");
  });

  test("按下時清除前次分數與訊息；聆聽中按鈕為「聆聽中」與 is-listening", async () => {
    const env = realEnv({ audioStart: true, mic: fakeMic() });
    await press(env);
    env.rec().onaudiostart({});
    env.rec().onresult(resultEv("Latency."));
    assert.equal(resultBoxOf(env).hidden, false);
    env.mic.click();
    assert.equal(resultBoxOf(env).hidden, true, "beginAttempt 清除分數（PR-4）");
    assert.equal(env.state.runtime.speech.lastResult, null);
    await flush();
    env.rec().onaudiostart({});
    assert.deepEqual(micState(env), { text: "聆聽中", label: "聆聽中，再按一次停止", pressed: "true", status: "listening", preparing: false, listening: true });
  });
});

// ════════════════════════════ V-STT-02 audiostart 順序 ════════════════════════════

describe("V-STT-02 start → audiostart → 聆聽中", () => {
  test("可依賴 audiostart：acquiringMic → awaitingAudioStart → listening；T_BUFFER 0 時在同一個處理器內（AC-58-03）", async () => {
    const mic = fakeMic();
    const env = realEnv({ audioStart: true, mic });
    await press(env);
    assert.equal(env.made.length, 1);
    assert.equal(env.rec().started, 1, "已呼叫 rec.start()");
    assert.equal(env.state.runtime.speech.preparingPhase, "awaitingAudioStart");
    assert.deepEqual(env.clock.pending(), [TIMING.readyTimeoutMs], "自 start() 回傳起計 T_READY");
    assert.equal(mic.log.startMeter, 0);
    assert.equal(TIMING.bufferMs, 0);
    env.rec().onaudiostart({});
    // 同步：處理器返回時即為聆聽中
    assert.equal(env.state.runtime.speech.sttStatus, "listening");
    assert.deepEqual(env.log.phases, ["preparing:acquiringMic", "preparing:awaitingAudioStart", "listening"]);
    assert.equal(mic.log.startMeter, 1, "聆聽中才開始讀音量");
    assert.deepEqual(env.clock.pending(), [], "T_READY 已清除");
  });

  test("start() 內同步觸發 audiostart：直接聆聽，不再設定子階段與計時器（§7.26.4）", async () => {
    const env = realEnv({ audioStart: true, mic: fakeMic(), onStart: (rec) => rec.onaudiostart({}) });
    await press(env);
    assert.equal(env.state.runtime.speech.sttStatus, "listening");
    assert.deepEqual(env.log.phases, ["preparing:acquiringMic", "listening"]);
    assert.deepEqual(env.clock.pending(), []);
  });
});

// ════════════════════════════ V-STT-03 其他確認事件與後備 ════════════════════════════

describe("V-STT-03 soundstart／speechstart、result、nomatch、不支援 audiostart", () => {
  for (const ev of ["onsoundstart", "onspeechstart"]) {
    test(ev + " → 立即聆聽中（AC-58-07）", async () => {
      const env = realEnv({ audioStart: true, mic: fakeMic() });
      await press(env);
      env.rec()[ev]({});
      assert.equal(env.state.runtime.speech.sttStatus, "listening");
      assert.deepEqual(env.clock.pending(), []);
    });
  }

  test("result 有文字 → 評分、recordSttScored 1 次（AC-08-03）", async () => {
    const env = realEnv({ audioStart: true, mic: fakeMic() });
    await press(env);
    env.rec().onaudiostart({});
    env.rec().onresult(resultEv("Latency."));
    assert.equal(env.state.runtime.speech.lastResult.score, 100);
    assert.equal(callsOf(env, "recordSttScored"), 1);
    assert.equal(messageOf(env).hidden, true);
    assert.equal(env.state.runtime.speech.sttStatus, "idle");
  });

  test("準備中直接收到 result（未經 audiostart）也評分", async () => {
    const env = realEnv({ audioStart: true, mic: fakeMic() });
    await press(env);
    env.rec().onresult(resultEv("Latency."));
    assert.equal(env.state.runtime.speech.lastResult.score, 100);
    assert.deepEqual(env.clock.pending(), []);
  });

  test("nomatch → heardNoWords（AC-59-02）", async () => {
    const env = realEnv({ audioStart: true, mic: fakeMic() });
    await press(env);
    env.rec().onaudiostart({});
    env.rec().onnomatch({});
    assert.deepEqual(messageOf(env), { hidden: false, text: TEXT.heardNoWords, help: "", kind: "info" });
    env.rec().onend({});
    assert.equal(messageOf(env).text, TEXT.heardNoWords, "end 不覆蓋");
  });

  test("不支援 audiostart → fallbackWait；推進 T_FALLBACK 後聆聽中；推進 T_READY 不逾時（AC-58-09）", async () => {
    const mic = fakeMic();
    const env = realEnv({ audioStart: false, mic });
    await press(env);
    assert.equal(env.state.runtime.speech.preparingPhase, "fallbackWait");
    assert.deepEqual(env.clock.pending(), [TIMING.fallbackMs], "只設 T_FALLBACK，不套用 T_READY");
    env.clock.advance(TIMING.fallbackMs - 1);
    assert.equal(env.state.runtime.speech.sttStatus, "preparing");
    assert.equal(mic.log.startMeter, 0);
    env.clock.advance(1);
    assert.equal(env.state.runtime.speech.sttStatus, "listening");
    assert.equal(mic.log.startMeter, 1);
    env.clock.advance(TIMING.readyTimeoutMs * 2);
    assert.equal(env.state.runtime.speech.sttStatus, "listening", "不逾時");
    assert.equal(messageOf(env).hidden, true);
    // 後備時間到 = 已確認：無結果結束 → noSpeech
    env.rec().onend({});
    assert.equal(messageOf(env).text, TEXT.noSpeech);
  });

  test("fallbackWait 期間收到 audiostart／soundstart → 立即聆聽、清 T_FALLBACK", async () => {
    for (const ev of ["onaudiostart", "onsoundstart"]) {
      // 替身沒有原型屬性但仍可觸發（模擬判定為不支援、實際有事件）
      const env = realEnv({ audioStart: false, mic: fakeMic() });
      await press(env);
      env.rec()[ev]({});
      assert.equal(env.state.runtime.speech.sttStatus, "listening", ev);
      assert.deepEqual(env.clock.pending(), [], ev);
    }
  });
});

// ════════════════════════════ V-STT-04 取消與遲到事件 ════════════════════════════

describe("V-STT-04 取消、遲到事件、立即再按", () => {
  test("取得中再按 = 取消：回待機、不提示；遲到的取得完成不開始辨識（AC-58-04 (a)）", async () => {
    const mic = fakeMic({ deferred: true });
    const env = realEnv({ audioStart: true, mic });
    env.mic.click();
    env.mic.click();
    assert.equal(env.state.runtime.speech.sttStatus, "idle");
    assert.equal(env.state.runtime.speech.preparingPhase, null);
    assert.equal(messageOf(env).hidden, true);
    mic.resolveAll();
    await flush();
    assert.equal(env.made.length, 0, "代號已失效：不呼叫 stt.start");
    assert.equal(env.state.runtime.speech.sttStatus, "idle");
    assert.equal(mic.log.release, 0, "音軌保留供同頁重用");
  });

  for (const audioStart of [true, false]) {
    test("已 start（" + (audioStart ? "awaitingAudioStart" : "fallbackWait") + "）再按 = 取消：abort 先解除處理器、遲到事件不改畫面（AC-58-04 (b)、AC-58-05）", async () => {
      const env = realEnv({ audioStart, mic: fakeMic() });
      await press(env);
      const rec = env.rec();
      const held = { a: rec.onaudiostart, r: rec.onresult, e: rec.onend, s: rec.onspeechstart };
      env.mic.click();
      assert.equal(rec.aborted, 1);
      assert.equal(rec.onresult, null);
      assert.equal(rec.onaudiostart, null);
      assert.equal(env.state.runtime.speech.sttStatus, "idle");
      assert.deepEqual(env.clock.pending(), [], "計時器已清除");
      const before = JSON.stringify(env.log.phases);
      held.a({}); held.s({}); held.r(resultEv("Latency.")); held.e({});
      env.clock.advance(TIMING.readyTimeoutMs + TIMING.fallbackMs);
      assert.equal(JSON.stringify(env.log.phases), before, "遲到事件與計時器不改狀態");
      assert.equal(messageOf(env).hidden, true);
      assert.equal(env.state.runtime.speech.lastResult, null);
      assert.equal(callsOf(env, "recordSttScored"), 0);
    });
  }

  test("取消後立即再按：mic.acquire 共用擱置中的 Promise，getUserMedia 次數不增加；只有新代號開始辨識（AC-58-05、PR-8）", async () => {
    const gum = [];
    const pendingGum = [];
    const g = {
      AudioContext: function () {
        this.close = () => Promise.resolve();
        this.resume = () => Promise.resolve();
        this.destination = {};
        this.createMediaStreamSource = () => ({ connect() {}, disconnect() {} });
        this.createAnalyser = () => ({ fftSize: 2048, connect() {}, disconnect() {}, getFloatTimeDomainData() {} });
      },
      setInterval: () => 1,
      clearInterval() {},
      addEventListener() {},
      navigator: {
        mediaDevices: {
          getUserMedia(c) {
            gum.push(c);
            return new Promise((r) => pendingGum.push(r));
          }
        }
      }
    };
    const realMic = micLib.create(g);
    const env = realEnv({ audioStart: true, mic: realMic });
    env.mic.click();
    await flush();
    assert.equal(gum.length, 1);
    env.mic.click(); // 取消
    assert.equal(env.state.runtime.speech.sttStatus, "idle");
    env.mic.click(); // ≤ 100 ms 內再按（同步）
    assert.equal(env.state.runtime.speech.sttStatus, "preparing");
    await flush();
    assert.equal(gum.length, 1, "getUserMedia 不再被呼叫");
    const t = { readyState: "live", stop() { this.readyState = "ended"; }, addEventListener() {}, removeEventListener() {} };
    pendingGum.forEach((r) => r({ getAudioTracks: () => [t] }));
    await flush();
    await flush();
    assert.equal(env.made.length, 1, "只有新代號呼叫 stt.start");
    assert.equal(env.state.runtime.speech.preparingPhase, "awaitingAudioStart");
    env.rec().onaudiostart({});
    assert.equal(env.state.runtime.speech.sttStatus, "listening");
  });

  test("T_READY 之後才 audiostart：不影響畫面；再按可重新開始（AC-58-06）", async () => {
    const env = realEnv({ audioStart: true, mic: fakeMic() });
    await press(env);
    const rec = env.rec();
    const late = rec.onaudiostart;
    env.clock.advance(TIMING.readyTimeoutMs);
    assert.equal(messageOf(env).text, TEXT.noResponse);
    late({});
    assert.equal(env.state.runtime.speech.sttStatus, "idle");
    assert.equal(messageOf(env).text, TEXT.noResponse);
    await press(env);
    assert.equal(env.made.length, 2);
    assert.equal(env.state.runtime.speech.preparingPhase, "awaitingAudioStart");
    assert.equal(messageOf(env).hidden, true, "新嘗試清除訊息");
  });

  test("已判定（評分完）但 end 未到時再按：新嘗試，舊工作被 abort，同時只有 1 個辨識工作（AC-58-05）", async () => {
    const env = realEnv({ audioStart: true, mic: fakeMic() });
    await press(env);
    const r1 = env.rec();
    r1.onaudiostart({});
    r1.onresult(resultEv("Latency."));
    const lateEnd = r1.onend;
    await press(env);
    assert.equal(env.made.length, 2);
    assert.equal(r1.aborted, 1);
    assert.equal(r1.onend, null);
    lateEnd && lateEnd({});
    assert.equal(env.state.runtime.speech.sttStatus, "preparing", "舊 end 不影響新嘗試");
  });
});

// ════════════════════════════ V-STT-05 逾時 ════════════════════════════

describe("V-STT-05 T_READY 逾時與沒有回應", () => {
  test("推進 T_READY → abort、noResponse、回待機（AC-58-06）", async () => {
    const env = realEnv({ audioStart: true, mic: fakeMic() });
    await press(env);
    env.clock.advance(TIMING.readyTimeoutMs - 1);
    assert.equal(env.state.runtime.speech.sttStatus, "preparing");
    env.clock.advance(1);
    assert.equal(env.rec().aborted, 1);
    assert.equal(env.state.runtime.speech.sttStatus, "idle");
    assert.deepEqual(messageOf(env), { hidden: false, text: "語音辨識沒有回應，請再試一次", help: "", kind: "info" });
    assert.deepEqual(barsOf(env), DARK);
    assert.equal(callsOf(env, "recordSttScored"), 0);
  });

  test("權限詢問擱置超過 T_READY：維持準備中／acquiringMic（E-157）", async () => {
    const mic = fakeMic({ deferred: true });
    const env = realEnv({ audioStart: true, mic });
    env.mic.click();
    env.clock.advance(TIMING.readyTimeoutMs * 3);
    assert.equal(env.state.runtime.speech.sttStatus, "preparing");
    assert.equal(env.state.runtime.speech.preparingPhase, "acquiringMic");
    assert.equal(messageOf(env).hidden, true);
    mic.resolveAll();
    await flush();
    assert.equal(env.state.runtime.speech.preparingPhase, "awaitingAudioStart", "取得完成後才開始計 T_READY");
    assert.deepEqual(env.clock.pending(), [TIMING.readyTimeoutMs]);
  });

  test("準備中無錯誤的 end → noResponse（AC-58-08）", async () => {
    for (const audioStart of [true, false]) {
      const env = realEnv({ audioStart, mic: fakeMic() });
      await press(env);
      env.rec().onend({});
      assert.equal(messageOf(env).text, TEXT.noResponse, String(audioStart));
      assert.deepEqual(env.clock.pending(), [], "計時器已清除");
    }
  });
});

// ════════════════════════════ V-STT-06 outcomeOf 判定表 ════════════════════════════

describe("V-STT-06 outcomeOf（契約 §14.5、architecture §7.26.5 逐列）", () => {
  const info = (over) => Object.assign({
    manual: false, hadResult: false, hadError: false, audioStarted: false,
    soundStarted: false, speechDetected: false, nomatch: false, errorCode: null
  }, over);
  const rows = [
    ["(1) manual", { manual: true, hadText: true, info: info({ errorCode: "network" }), confirmed: true }, { kind: "none" }],
    ["(1) info.manual", { hadText: true, info: info({ manual: true }) }, { kind: "none" }],
    ["(2) hadText", { hadText: true, info: info({ hadResult: true, speechDetected: true }), confirmed: true }, { kind: "score" }],
    ["(2) hadText 優先於錯誤", { hadText: true, info: info({ errorCode: "network" }) }, { kind: "score" }],
    ["(3) network", { hadText: false, info: info({ errorCode: "network", speechDetected: true }) }, { kind: "error", code: "network" }],
    ["(3) not-allowed", { hadText: false, info: info({ errorCode: "not-allowed" }) }, { kind: "error", code: "not-allowed" }],
    ["(3) audio-capture", { hadText: false, info: info({ errorCode: "audio-capture" }) }, { kind: "error", code: "audio-capture" }],
    ["(3) aborted（非手動）", { hadText: false, info: info({ errorCode: "aborted" }) }, { kind: "error", code: "aborted" }],
    ["(4) speechDetected", { hadText: false, info: info({ speechDetected: true }), confirmed: true }, { kind: "heardNoWords" }],
    ["(4) speechDetected + no-speech", { hadText: false, info: info({ speechDetected: true, errorCode: "no-speech" }) }, { kind: "heardNoWords" }],
    ["(4) nomatch", { hadText: false, info: info({ nomatch: true }) }, { kind: "heardNoWords" }],
    ["(4) hadResult 但清洗後為空", { hadText: false, info: info({ hadResult: true }) }, { kind: "heardNoWords" }],
    ["(5) no-speech", { hadText: false, info: info({ errorCode: "no-speech" }), confirmed: false }, { kind: "noSpeech" }],
    ["(5) confirmed（audiostart）", { hadText: false, info: info({ audioStarted: true }), confirmed: true }, { kind: "noSpeech" }],
    ["(5) soundstart 不算語音（AC-59-05 (c)）", { hadText: false, info: info({ soundStarted: true }), confirmed: true }, { kind: "noSpeech" }],
    ["(6) 未確認", { hadText: false, info: info({}), confirmed: false }, { kind: "noResponse" }],
    ["(6) T_READY 逾時", { manual: false, hadText: false, info: info({}), confirmed: false }, { kind: "noResponse" }],
    ["(6) 缺 info", {}, { kind: "noResponse" }],
    ["(6) 無輸入", undefined, { kind: "noResponse" }]
  ];
  for (const [name, input, want] of rows) {
    test(name, () => assert.deepEqual(outcomeOf(input), want));
  }
});

// ════════════════════════════ V-STT-07 每次嘗試 0 或 1 則訊息 ════════════════════════════

describe("V-STT-07 訊息只判定 1 次、新嘗試重設旗標（MS-2、MS-6）", () => {
  test("nomatch 後的 end、error 後的 end 都不改寫訊息；每次嘗試訊息至多 1 則", async () => {
    const env = realEnv({ audioStart: true, mic: fakeMic() });
    await press(env);
    env.rec().onaudiostart({});
    env.rec().onnomatch({});
    env.rec().onend({});
    assert.deepEqual(env.log.messages, [TEXT.heardNoWords]);

    env.log.messages.length = 0;
    await press(env);
    env.rec().onaudiostart({});
    env.rec().onerror({ error: "network" });
    env.rec().onend({});
    assert.deepEqual(env.log.messages, ["語音辨識需要網路連線"]);

    env.log.messages.length = 0;
    await press(env);
    env.rec().onaudiostart({});
    env.rec().onerror({ error: "no-speech" });
    env.rec().onend({});
    assert.deepEqual(env.log.messages, [TEXT.noSpeech]);

    env.log.messages.length = 0;
    await press(env);
    env.rec().onaudiostart({});
    env.rec().onresult(resultEv("Latency."));
    env.rec().onend({});
    assert.deepEqual(env.log.messages, [], "評分：0 則訊息");
  });

  test("新嘗試不沿用前一次的語音紀錄：speechstart 後結束 → heardNoWords；下一次只有 audiostart → noSpeech", async () => {
    const env = realEnv({ audioStart: true, mic: fakeMic() });
    await press(env);
    env.rec().onspeechstart({});
    env.rec().onend({});
    assert.equal(messageOf(env).text, TEXT.heardNoWords);
    await press(env);
    env.rec().onaudiostart({});
    env.rec().onend({});
    assert.equal(messageOf(env).text, TEXT.noSpeech);
  });

  test("聆聽中再按停止：不提示，之後遲到的 result 不評分（SD-FB-85、AC-08-10）", async () => {
    const env = realEnv({ audioStart: true, mic: fakeMic() });
    await press(env);
    const rec = env.rec();
    rec.onaudiostart({});
    env.mic.click();
    assert.equal(rec.stopped, 1);
    assert.equal(env.state.runtime.speech.sttStatus, "idle");
    rec.onresult(resultEv("Latency."));
    rec.onerror({ error: "aborted" });
    rec.onend({});
    assert.equal(env.state.runtime.speech.lastResult, null);
    assert.equal(callsOf(env, "recordSttScored"), 0);
    assert.deepEqual(env.log.messages, []);
  });

  test("說明對話框：未讀按下不清除畫面；「取消」畫面不變（FB-78）；顯示中按麥克風忽略（AC-08-13）", async () => {
    let answer = null;
    const shown = [];
    const dialog = { confirm: (o) => { shown.push(o); return new Promise((r) => { answer = r; }); } };
    const env = realEnv({ audioStart: true, mic: fakeMic(), dialog });
    await press(env);
    env.rec().onaudiostart({});
    env.rec().onresult(resultEv("Latency."));
    assert.equal(resultBoxOf(env).hidden, false);
    env.state.data.sttNoticeAcknowledged = false;
    env.mic.click();
    assert.equal(env.state.runtime.speech.sttStatus, "notice");
    assert.equal(resultBoxOf(env).hidden, false, "未讀時先開說明，不清除");
    env.mic.click();
    assert.equal(shown.length, 1, "對話框顯示中按麥克風忽略");
    answer(false);
    await flush();
    assert.equal(env.state.runtime.speech.sttStatus, "idle");
    assert.equal(resultBoxOf(env).hidden, false, "取消：畫面不變");
    assert.ok(env.state.runtime.speech.lastResult);
    // 我知道了 → 開始嘗試（此時才清除）
    env.mic.click();
    answer(true);
    await flush();
    assert.equal(env.state.data.sttNoticeAcknowledged, true);
    assert.equal(resultBoxOf(env).hidden, true);
    assert.equal(env.state.runtime.speech.sttStatus, "preparing");
  });

  test("對話框期間換卡後按「我知道了」：記錄已讀、回待機、不開始（AC-08-13）", async () => {
    let answer = null;
    const dialog = { confirm: () => new Promise((r) => { answer = r; }) };
    const mic = fakeMic();
    const env = realEnv({ audioStart: true, mic, dialog, acknowledged: false });
    env.mic.click();
    env.sp.reset();
    answer(true);
    await flush();
    assert.equal(env.state.data.sttNoticeAcknowledged, true);
    assert.equal(env.state.runtime.speech.sttStatus, "idle");
    assert.equal(mic.log.acquire, 0);
    assert.equal(env.made.length, 0);
  });

  test("離線：不經過準備中，直接清除分數並顯示「語音辨識需要網路連線」（SD-FB-90）", async () => {
    const env = makeEnv({ clock: fakeClock(), mic: fakeMic(), audioStart: true });
    await press(env);
    env.sttCb.onAudioStart({});
    env.sttCb.onResult("Latency.", {});
    assert.equal(resultBoxOf(env).hidden, false);
    env.opts.online = false;
    env.log.phases.length = 0;
    env.mic.click();
    assert.ok(!env.log.phases.some((p) => p.startsWith("preparing")), "未進入準備中：" + JSON.stringify(env.log.phases));
    assert.equal(env.state.runtime.speech.sttStatus, "idle");
    assert.equal(messageOf(env).text, "語音辨識需要網路連線");
    assert.equal(resultBoxOf(env).hidden, true);
  });
});

// ════════════════════════════ V-STT-08 辨識文字列 ════════════════════════════

describe("V-STT-08 分數區文字列（US-60、AC-60-01～AC-60-05）", () => {
  const cases = [
    ["latency", "Latency.", "green", 1],
    ["address", "adress", "yellow", 1],
    ["sitting", "kitten", "red", 2]
  ];
  for (const [word, said, light, rows] of cases) {
    test(word + " ←「" + said + "」→ " + light + "，" + rows + " 列，值逐字、lang=en、順序固定", async () => {
      const env = makeEnv({ clock: fakeClock(), audioStart: true, card: { kind: "builtin", wordKey: word, item: { word } } });
      env.mic.click();
      env.sttCb.onAudioStart({});
      env.sttCb.onResult(said, {});
      const box = resultBoxOf(env);
      assert.equal(box.getAttribute("data-light"), light);
      const kids = box.childNodes.map((n) => n.className);
      const want = ["sp-result__title", "sp-result__score"].concat(light === "yellow" ? ["sp-result__tip"] : [], ["sp-compare", "sp-result__note"]);
      assert.deepEqual(kids, want, "標題 → 分數與燈號 → 提示 → 文字列 → 說明");
      const dl = box.childNodes.find((n) => n.className === "sp-compare");
      assert.equal(dl.tagName, "DL");
      assert.equal(dl.childNodes.length, rows);
      const r0 = dl.childNodes[0];
      assert.equal(r0.className, "sp-compare__row");
      assert.equal(r0.childNodes[0].tagName, "DT");
      assert.equal(r0.childNodes[0].textContent, "辨識文字");
      assert.equal(r0.childNodes[1].tagName, "DD");
      assert.equal(r0.childNodes[1].textContent, said, "值逐字為引擎原文");
      assert.equal(r0.childNodes[1].getAttribute("lang"), "en");
      if (rows === 2) {
        assert.equal(dl.childNodes[1].childNodes[0].textContent, "目標文字");
        assert.equal(dl.childNodes[1].childNodes[1].textContent, word);
        assert.equal(dl.childNodes[1].childNodes[1].getAttribute("lang"), "en");
      } else {
        assert.ok(!box.textContent.includes("目標文字"), "綠、黃不顯示目標文字");
      }
    });
  }

  test("含 HTML 字元的辨識文字以純文字寫入：值元素內沒有子元素", () => {
    const env = makeEnv({ clock: fakeClock(), audioStart: true });
    const said = "<img src=x onerror=alert(1)> latency";
    env.mic.click();
    env.sttCb.onAudioStart({});
    env.sttCb.onResult(said, {});
    const dd = resultBoxOf(env).findAll((n) => n.tagName === "DD");
    assert.ok(dd.length >= 1);
    for (const d of dd) assert.equal(d.childNodes.length, 0);
    assert.equal(dd[0].textContent, said);
  });

  test("resultModel 純函式：compare 依燈號 1／1／2 列", () => {
    const sim = require("../core/similarity.js");
    for (const [word, said, light, rows] of cases) {
      const m = panel.resultModel(panel.buildResult(said, word, sim));
      assert.equal(m.light, light);
      assert.equal(m.compare.length, rows);
      assert.deepEqual(m.compare[0], { label: "辨識文字", value: said });
    }
  });

  test("沒有分數時不顯示分數區、不出現空白的「辨識文字」標籤（AC-60-04）", async () => {
    const env = realEnv({ audioStart: true, mic: fakeMic() });
    await press(env);
    env.rec().onaudiostart({});
    env.rec().onnomatch({});
    assert.equal(resultBoxOf(env).hidden, true);
    assert.ok(!env.container.textContent.includes("辨識文字"));
  });
});

// ════════════════════════════ V-STT-09 文字與時間常數對契約 ════════════════════════════

describe("V-STT-09 TEXT 與 TIMING 對 data-schema.ts §18", () => {
  const ts = fs.readFileSync(path.join(ROOT, "docs", "02-contract", "data-schema.ts"), "utf8");

  /** 取出 export const NAME ... = { ... } as const; 的本體 */
  function constBody(name) {
    const start = ts.indexOf("export const " + name);
    assert.ok(start >= 0, "契約缺少 " + name);
    const open = ts.indexOf("{", ts.indexOf("=", start));
    let depth = 0;
    for (let i = open; i < ts.length; i++) {
      if (ts[i] === "{") depth++;
      else if (ts[i] === "}") { depth--; if (depth === 0) return ts.slice(open + 1, i); }
    }
    throw new Error("無法解析 " + name);
  }

  test("STT_FLOW_TEXTS 7 個字串逐字相同（含 4 段新字串與 2 個標籤）", () => {
    const body = constBody("STT_FLOW_TEXTS");
    const pairs = {};
    for (const m of body.matchAll(/(\w+)\s*:\s*"([^"]*)"/g)) pairs[m[1]] = m[2];
    assert.deepEqual(Object.keys(pairs).sort(), ["heardNoWords", "labelRecognized", "labelTarget", "micPreparing", "micPreparingLabel", "noResponse", "noSpeech"]);
    for (const [k, v] of Object.entries(pairs)) assert.equal(TEXT[k], v, k);
    assert.ok(TEXT.micPreparingLabel.includes("，"), "全形逗號 U+FF0C");
  });

  test("TIMING 3 個值都在 STT_TIMING 範圍內（整數、凍結；不寫死數值）", () => {
    const body = constBody("STT_TIMING");
    const range = {};
    for (const m of body.matchAll(/(\w+)\s*:\s*\{\s*defaultMs:\s*(\d+),\s*minMs:\s*(\d+),\s*maxMs:\s*(\d+)\s*\}/g)) {
      range[m[1]] = { def: Number(m[2]), min: Number(m[3]), max: Number(m[4]) };
    }
    assert.deepEqual(Object.keys(range).sort(), ["buffer", "fallback", "readyTimeout"]);
    const map = { readyTimeoutMs: "readyTimeout", bufferMs: "buffer", fallbackMs: "fallback" };
    assert.deepEqual(Object.keys(TIMING).sort(), Object.keys(map).sort());
    for (const [k, c] of Object.entries(map)) {
      const v = TIMING[k];
      assert.ok(Number.isInteger(v), k);
      assert.ok(v >= range[c].min && v <= range[c].max, `${k} = ${v} 不在 [${range[c].min}, ${range[c].max}]`);
    }
    assert.equal(Object.isFrozen(TIMING), true);
  });

  test("STT_RESULT_ROWS 與 resultModel 的列種類一致", () => {
    const body = constBody("STT_RESULT_ROWS");
    const sim = require("../core/similarity.js");
    const sample = { green: ["latency", "Latency."], yellow: ["address", "adress"], red: ["sitting", "kitten"] };
    for (const m of body.matchAll(/(green|yellow|red)\s*:\s*\[([^\]]*)\]/g)) {
      const kinds = [...m[2].matchAll(/"(\w+)"/g)].map((x) => x[1]);
      const model = panel.resultModel(panel.buildResult(sample[m[1]][1], sample[m[1]][0], sim));
      assert.deepEqual(model.compare.map((r) => (r.label === "辨識文字" ? "recognized" : "target")), kinds, m[1]);
    }
  });
});

// ════════════════════════════ V-STT-10 不記錄、中斷處理、原始碼 ════════════════════════════

describe("V-STT-10 分流／取消／逾時不記錄；換卡、TTS、拔除麥克風、離開頁面", () => {
  /** 所有 store action 參數中不得出現數字（音量值不進 store）；setSttResult 的吻合度除外 */
  function assertNoNumberArgs(env) {
    const deep = (v) => typeof v === "number" || (v !== null && typeof v === "object" && Object.values(v).some(deep));
    for (const c of env.log.actions) {
      if (c.name === "setSttResult") continue;
      assert.ok(!c.args.some(deep), c.name + " 參數含數字：" + JSON.stringify(c.args));
    }
  }

  test("3 種分流訊息、取消、逾時都不呼叫 recordSttScored；action 參數無音量值（AC-30-04、AC-59-07）", async () => {
    const scenarios = {
      heardNoWords: (env) => { env.rec().onaudiostart({}); env.rec().onnomatch({}); },
      noSpeech: (env) => { env.rec().onaudiostart({}); env.rec().onend({}); },
      noResponse: (env) => { env.rec().onend({}); },
      cancel: (env) => { env.mic.click(); },
      timeout: (env) => { env.clock.advance(TIMING.readyTimeoutMs); }
    };
    for (const [name, run] of Object.entries(scenarios)) {
      const mic = fakeMic();
      const env = realEnv({ audioStart: true, mic });
      await press(env);
      if (mic.onLevel) mic.onLevel(4);
      run(env);
      assert.equal(callsOf(env, "recordSttScored"), 0, name);
      assert.equal(env.state.runtime.speech.lastResult, null, name);
      assert.equal(env.state.runtime.speech.sttStatus, "idle", name);
      assertNoNumberArgs(env);
    }
  });

  test("準備中換卡（reset）→ 待機、不提示、abort；之後的取得完成與事件不影響（AC-58-10）", async () => {
    const mic = fakeMic({ deferred: true });
    const env = realEnv({ audioStart: true, mic });
    env.mic.click();
    env.sp.reset();
    assert.equal(env.state.runtime.speech.sttStatus, "idle");
    assert.equal(messageOf(env).hidden, true);
    mic.resolveAll();
    await flush();
    assert.equal(env.made.length, 0);
    // awaitingAudioStart 中換卡
    const env2 = realEnv({ audioStart: true, mic: fakeMic() });
    await press(env2);
    const rec = env2.rec();
    env2.sp.reset();
    assert.equal(rec.aborted, 1);
    assert.equal(env2.state.runtime.speech.sttStatus, "idle");
    assert.deepEqual(env2.clock.pending(), []);
  });

  test("準備中按 TTS → 取消並回待機，再照常朗讀（AC-58-10）", async () => {
    const env = realEnv({ audioStart: true, mic: fakeMic() });
    await press(env);
    const rec = env.rec();
    env.tts[0].click();
    assert.equal(rec.aborted, 1);
    assert.equal(env.state.runtime.speech.sttStatus, "idle");
    assert.equal(env.log.speak, 1);
    assert.deepEqual(env.clock.pending(), []);
    assert.equal(messageOf(env).hidden, true);
  });

  test("翻面（同一張卡重繪）不中止準備中；之後 audiostart 照常聆聽（AC-58-10）", async () => {
    const env = realEnv({ audioStart: true, mic: fakeMic() });
    await press(env);
    const rec = env.rec();
    env.sp.render(env.container, env.card, env.state);
    E.bindDom(env);
    assert.equal(micState(env).text, "準備中");
    assert.equal(rec.aborted, 0);
    rec.onaudiostart({});
    assert.equal(env.state.runtime.speech.sttStatus, "listening");
    assert.equal(micState(env).text, "聆聽中");
  });

  test("準備中音軌結束 → 取消、「找不到麥克風裝置」；待機時只歸暗（AC-58-11、AC-33-06）", async () => {
    const mic = fakeMic();
    const env = realEnv({ audioStart: true, mic });
    await press(env);
    const rec = env.rec();
    mic.endedCb();
    assert.equal(rec.aborted, 1);
    assert.equal(env.state.runtime.speech.sttStatus, "idle");
    assert.deepEqual(messageOf(env), { hidden: false, text: "找不到麥克風裝置", help: "請確認裝置已連接麥克風後再按一次", kind: "error" });
    assert.deepEqual(env.clock.pending(), []);
    // 取得中拔除
    const mic2 = fakeMic({ deferred: true });
    const env2 = realEnv({ audioStart: true, mic: mic2 });
    env2.mic.click();
    mic2.endedCb();
    assert.equal(env2.state.runtime.speech.sttStatus, "idle");
    assert.equal(messageOf(env2).text, "找不到麥克風裝置");
    mic2.resolveAll();
    await flush();
    assert.equal(env2.made.length, 0);
    // 待機
    const mic3 = fakeMic();
    const env3 = realEnv({ audioStart: true, mic: mic3 });
    mic3.endedCb();
    assert.equal(messageOf(env3).hidden, true);
  });

  test("取得中離開頁面（release）→ 待機、mic.release 1 次、取得完成（released）不顯示（AC-58-10、AC-33-02）", async () => {
    const mic = fakeMic({ deferred: true });
    const env = realEnv({ audioStart: true, mic });
    env.mic.click();
    env.sp.release();
    assert.equal(mic.log.release, 1);
    assert.equal(env.state.runtime.speech.sttStatus, "idle");
    mic.resolveAll({ ok: false, reason: "released" });
    await flush();
    assert.equal(messageOf(env).hidden, true);
    assert.equal(env.made.length, 0);
  });

  test("取得失敗：permission／notfound 顯示既有訊息；unavailable 照常辨識（AC-08-09、AC-33-05、AC-33-07）", async () => {
    for (const [reason, text] of [["permission", "需要麥克風權限"], ["notfound", "找不到麥克風裝置"]]) {
      const env = realEnv({ audioStart: true, mic: fakeMic({ result: { ok: false, reason } }) });
      await press(env);
      assert.equal(env.made.length, 0, reason);
      assert.equal(messageOf(env).text, text, reason);
      assert.equal(env.state.runtime.speech.sttStatus, "idle", reason);
    }
    const env = realEnv({ audioStart: true, mic: fakeMic({ result: { ok: false, reason: "unavailable" } }) });
    await press(env);
    assert.equal(env.made.length, 1);
    assert.equal(env.state.runtime.speech.preparingPhase, "awaitingAudioStart");
  });

  test("原始碼：speech-panel.js 不含 3 種 HTML 字串寫入 API；分數區固定文字不含 RT-4 字樣", () => {
    const js = fs.readFileSync(path.join(E.APP_DIR, "views", "speech-panel.js"), "utf8");
    for (const bad of ["inner" + "HTML", "insertAdjacent" + "HTML", "outer" + "HTML"]) {
      assert.ok(!js.includes(bad), "不得出現 " + bad);
    }
    const fixed = [TEXT.resultTitle, TEXT.tipYellow, TEXT.labelRecognized, TEXT.labelTarget, TEXT.resultNote].concat(Object.values(panel.LIGHT_LABELS));
    for (const t of fixed) {
      for (const w of ["偵測到", "語言", "英文", "中文", "你說的是"]) assert.ok(!t.includes(w), t + " 含「" + w + "」");
    }
  });

  test("31-speech.css：.sp-mic.is-preparing 不用 --light-red、無動畫、不改尺寸；.sp-compare__value 可換行（AC-58-13、AC-60-06）", () => {
    const css = fs.readFileSync(path.join(E.APP_DIR, "styles", "31-speech.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const blocks = [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)].map((m) => ({ sel: m[1].trim(), body: m[2] }));
    const prep = blocks.filter((b) => b.sel.includes("is-preparing"));
    assert.ok(prep.length >= 1);
    for (const b of prep) {
      assert.doesNotMatch(b.body, /--light-red/, b.sel);
      assert.doesNotMatch(b.body, /sp-blink/, b.sel);
      assert.doesNotMatch(b.body, /border-width|padding|min-width|width\s*:|height\s*:|font-size|border\s*:/, b.sel);
      const anim = b.body.match(/animation\s*:\s*([^;]+)/);
      if (anim) assert.equal(anim[1].trim(), "none", b.sel);
      const tr = b.body.match(/transition\s*:\s*([^;]+)/);
      if (tr) assert.equal(tr[1].trim(), "none", b.sel);
    }
    const main = prep.find((b) => b.sel === ".sp-mic.is-preparing");
    assert.match(main.body, /animation:\s*none/);
    assert.match(main.body, /transition:\s*none/);
    assert.match(main.body, /color:\s*var\(--brand-deep\)/);
    const val = blocks.find((b) => b.sel === ".sp-compare__value");
    assert.match(val.body, /overflow-wrap:\s*anywhere/);
  });
});

// ════════════════════════════ v0.16 §10.13 先畫出準備中再取得麥克風（FE-95、BUG-007） ════════════════════════════

describe("v0.16 §10.13 第 1 次按下：準備中畫出後才取得麥克風（AC-58-01、AC-58-04、AC-58-05、§7.28.3）", () => {
  const { PAINT_FALLBACK_MS } = panel;

  /** 真正 mic.js + 計數 getUserMedia 的替身全域（getUserMedia 永遠擱置） */
  function realMicWithGum() {
    const gum = [];
    const g = {
      AudioContext: function () {
        this.state = "running";
        this.sampleRate = 48000;
        this.close = () => Promise.resolve();
        this.resume = () => Promise.resolve();
        this.createMediaStreamSource = () => ({ connect() {}, disconnect() {} });
        this.createAnalyser = () => ({ fftSize: 2048, connect() {}, disconnect() {}, getFloatTimeDomainData() {} });
      },
      setInterval: () => 1,
      clearInterval() {},
      addEventListener() {},
      navigator: { mediaDevices: { getUserMedia(c) { gum.push(c); return new Promise(() => {}); } } }
    };
    return { mic: micLib.create(g), gum };
  }

  test("(a) 按下後同步 preparing、acquire 0 次、已要求 1 個畫格；畫格後仍 0；0 ms 計時器後 1；之後流程照常", async () => {
    const mic = fakeMic();
    const clock = fakeClock();
    const env = makeEnv({ clock, raf: true, mic, audioStart: true });
    env.mic.click();
    assert.equal(env.state.runtime.speech.sttStatus, "preparing");
    assert.equal(env.state.runtime.speech.preparingPhase, "acquiringMic");
    assert.equal(micState(env).text, "準備中");
    assert.equal(mic.log.acquire, 0, "點按處理器內不取得");
    assert.equal(env.rafPending(), 1);
    assert.equal(env.rafLog.requested, 1);
    assert.deepEqual(clock.pending(), [PAINT_FALLBACK_MS], "後備計時器");
    env.frame();
    assert.equal(mic.log.acquire, 0, "rAF 回呼內不得直接取得");
    assert.deepEqual(clock.pending(), [0], "畫格後只剩 0 ms 計時器（後備已清）");
    clock.advance(0);
    assert.equal(mic.log.acquire, 1);
    await flush();
    assert.equal(env.log.start, 1);
    assert.equal(env.state.runtime.speech.preparingPhase, "awaitingAudioStart");
    env.sttCb.onAudioStart({});
    assert.equal(env.state.runtime.speech.sttStatus, "listening");
  });

  test("(b) 延後期間再按 → 待機、不提示；畫格與推進時間後 acquire、getUserMedia 仍 0，clock.pending() 為空", async () => {
    for (const kind of ["fake", "real"]) {
      const clock = fakeClock();
      const r = kind === "real" ? realMicWithGum() : { mic: fakeMic(), gum: [] };
      const env = makeEnv({ clock, raf: true, mic: r.mic, audioStart: true });
      env.mic.click();
      env.mic.click();
      assert.equal(env.state.runtime.speech.sttStatus, "idle", kind);
      assert.equal(messageOf(env).hidden, true, kind);
      assert.equal(env.rafPending(), 0, kind + "：畫格已取消");
      env.frame();
      clock.advance(1000);
      await flush();
      if (kind === "fake") assert.equal(r.mic.log.acquire, 0);
      assert.equal(r.gum.length, 0, kind);
      assert.deepEqual(clock.pending(), [], kind);
      assert.equal(env.log.start, 0, kind);
    }
  });

  test("(c) 延後期間 reset、release、按 TTS → 同 (b)", async () => {
    const ops = {
      reset: (env) => env.sp.reset(),
      release: (env) => env.sp.release(),
      tts: (env) => env.tts[0].click()
    };
    for (const [name, op] of Object.entries(ops)) {
      for (const kind of ["fake", "real"]) {
        const clock = fakeClock();
        const r = kind === "real" ? realMicWithGum() : { mic: fakeMic(), gum: [] };
        const env = makeEnv({ clock, raf: true, mic: r.mic, audioStart: true });
        env.mic.click();
        op(env);
        assert.equal(env.state.runtime.speech.sttStatus, "idle", name + "/" + kind);
        env.frame();
        clock.advance(1000);
        await flush();
        if (kind === "fake") assert.equal(r.mic.log.acquire, 0, name);
        assert.equal(r.gum.length, 0, name + "/" + kind);
        assert.deepEqual(clock.pending(), [], name + "/" + kind);
        assert.equal(env.log.start, 0, name + "/" + kind);
        if (name === "tts") assert.equal(env.log.speak, 1);
      }
    }
  });

  test("(d) 不執行畫格：PAINT_FALLBACK_MS 後備生效 → acquire 1；之後再執行畫格與推進時間仍 1（只執行 1 次）", async () => {
    const mic = fakeMic({ deferred: true });
    const clock = fakeClock();
    const env = makeEnv({ clock, raf: true, mic, audioStart: true });
    env.mic.click();
    clock.advance(PAINT_FALLBACK_MS - 1);
    assert.equal(mic.log.acquire, 0);
    clock.advance(1);
    assert.equal(mic.log.acquire, 1);
    assert.equal(env.rafPending(), 0, "後備執行時取消畫格");
    env.frame();
    clock.advance(1000);
    assert.equal(mic.log.acquire, 1);
    // 畫格先到、0 ms 計時器與後備競爭：仍只 1 次
    const mic2 = fakeMic({ deferred: true });
    const clock2 = fakeClock();
    const env2 = makeEnv({ clock: clock2, raf: true, mic: mic2, audioStart: true });
    env2.mic.click();
    env2.frame();
    clock2.advance(PAINT_FALLBACK_MS * 2);
    assert.equal(mic2.log.acquire, 1);
    mic2.resolveAll();
    await flush();
    assert.equal(env2.log.start, 1);
  });

  test("(e) 已持有音軌（isActive 為 true）→ 按下後同步 acquire 1、未要求畫格", () => {
    const mic = fakeMic({ active: true });
    const clock = fakeClock();
    const env = makeEnv({ clock, raf: true, mic, audioStart: true });
    env.mic.click();
    assert.equal(mic.log.acquire, 1);
    assert.equal(env.rafLog.requested, 0);
    assert.equal(env.rafPending(), 0);
    assert.deepEqual(clock.pending(), []);
  });

  test("(f) requestAnimationFrame 拋例外 → 同步取得", () => {
    const mic = fakeMic({ deferred: true });
    const clock = fakeClock();
    const env = makeEnv({ clock, raf: "throw", mic, audioStart: true });
    env.mic.click();
    assert.equal(mic.log.acquire, 1);
    assert.deepEqual(clock.pending(), []);
  });

  test("(g) 「我知道了」路徑同樣延後", async () => {
    let answer = null;
    const dialog = { confirm: () => new Promise((r) => { answer = r; }) };
    const mic = fakeMic();
    const clock = fakeClock();
    const env = makeEnv({ clock, raf: true, mic, audioStart: true, dialog, acknowledged: false });
    env.mic.click();
    assert.equal(env.state.runtime.speech.sttStatus, "notice");
    answer(true);
    await flush();
    assert.equal(env.state.runtime.speech.sttStatus, "preparing");
    assert.equal(mic.log.acquire, 0);
    assert.equal(env.rafPending(), 1);
    env.frame();
    clock.advance(0);
    assert.equal(mic.log.acquire, 1);
  });

  test("(h) 取消後立即再按（延後模式）→ 只有新代號呼叫 acquire，總計 1 次；getUserMedia 1 次", async () => {
    const mic = fakeMic({ deferred: true });
    const clock = fakeClock();
    const env = makeEnv({ clock, raf: true, mic, audioStart: true });
    env.mic.click();
    env.mic.click();
    env.mic.click();
    assert.equal(env.state.runtime.speech.sttStatus, "preparing");
    assert.equal(env.rafPending(), 1, "舊代號的畫格已取消");
    env.frame();
    clock.advance(PAINT_FALLBACK_MS * 2);
    assert.equal(mic.log.acquire, 1);
    mic.resolveAll();
    await flush();
    assert.equal(env.log.start, 1);
    // 真正 mic.js：getUserMedia 1 次
    const r = realMicWithGum();
    const clock2 = fakeClock();
    const env2 = makeEnv({ clock: clock2, raf: true, mic: r.mic, audioStart: true });
    env2.mic.click();
    env2.mic.click();
    env2.mic.click();
    env2.frame();
    clock2.advance(PAINT_FALLBACK_MS * 2);
    await flush();
    assert.equal(r.gum.length, 1);
  });

  test("(i) PAINT_FALLBACK_MS 為 50，且 TIMING 鍵集合不變（不放進 TIMING）", () => {
    assert.equal(PAINT_FALLBACK_MS, 50);
    assert.deepEqual(Object.keys(TIMING).sort(), ["bufferMs", "fallbackMs", "readyTimeoutMs"]);
    assert.equal(Object.prototype.hasOwnProperty.call(TIMING, "PAINT_FALLBACK_MS"), false);
  });
});
