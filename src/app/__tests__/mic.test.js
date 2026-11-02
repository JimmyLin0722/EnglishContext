/*
 * mic.test.js — 麥克風服務單元測試（FE-36）
 * 受測：services/mic.js（以 create() 注入替身 navigator、AudioContext、計時器）
 * 依據：architecture.md v0.5 §7.14「services/mic.js API」「麥克風生命週期」「錯誤對照（DS-03）」、§10.2「mic.test.js」列
 * 涵蓋：AC-33-01、AC-33-02、AC-33-03、AC-33-04、AC-33-05、AC-33-06、AC-33-07、AC-08-09、AC-21-03
 */
"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const mic = require("../services/mic.js");
const meter = require("../core/meter.js");

// ── 替身 ──

/** 替身音軌：stop() 後 readyState 變為 ended；fireEnded() 模擬拔除 */
function fakeTrack() {
  const listeners = [];
  return {
    kind: "audio",
    readyState: "live",
    stopCalls: 0,
    stop() { this.stopCalls++; this.readyState = "ended"; },
    addEventListener(t, f) { if (t === "ended") listeners.push(f); },
    removeEventListener(t, f) { const i = listeners.indexOf(f); if (i >= 0) listeners.splice(i, 1); },
    fireEnded() { this.readyState = "ended"; listeners.slice().forEach((f) => f({})); },
    listeners
  };
}

function fakeStream(n = 1) {
  const ts = Array.from({ length: n }, fakeTrack);
  return { ts, getAudioTracks() { return ts.slice(); }, getTracks() { return ts.slice(); } };
}

/** 產生指定 dBFS RMS 的正弦樣本（正弦 RMS = 振幅 ÷ √2） */
function sineAt(db, n) {
  const amp = Math.pow(10, db / 20) * Math.SQRT2;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = amp * Math.sin((2 * Math.PI * 440 * i) / 48000);
  return out;
}

/**
 * 建立替身全域物件。
 * opts.gum：自訂 getUserMedia 行為（回 Promise）；opts.noMedia：沒有 mediaDevices；
 * opts.ctxThrows：AudioContext 建構拋例外；opts.analyserThrows：createAnalyser 拋例外；
 * opts.byteOnly：analyser 只有 getByteTimeDomainData
 */
function env(opts = {}) {
  const log = { gum: [], ctxs: [], connects: [], timers: new Map(), cleared: [], listeners: [] };
  let nextTimer = 1;
  let samples = new Float32Array(2048);
  const streams = [];

  function AudioContext() {
    if (opts.ctxThrows) throw new Error("no audio");
    const self = this;
    this.sampleRate = opts.sampleRate || 48000;
    this.state = "running";
    this.closeCalls = 0;
    this.resumeCalls = 0;
    this.destination = { isDestination: true };
    this.close = function () { self.closeCalls++; self.state = "closed"; return opts.closeRejects ? Promise.reject(new Error("x")) : Promise.resolve(); };
    this.resume = function () { self.resumeCalls++; return Promise.reject(new Error("resume 失敗也要吞掉")); };
    this.createMediaStreamSource = function (s) {
      const node = { kind: "source", stream: s, disconnected: 0,
        connect(t) { log.connects.push(["source", t]); }, disconnect() { this.disconnected++; } };
      self.source = node;
      return node;
    };
    this.createAnalyser = function () {
      if (opts.analyserThrows) throw new Error("no analyser");
      const node = { kind: "analyser", fftSize: 2048, disconnected: 0,
        connect(t) { log.connects.push(["analyser", t]); }, disconnect() { this.disconnected++; } };
      if (opts.byteOnly) {
        node.getByteTimeDomainData = (arr) => {
          for (let i = 0; i < arr.length; i++) arr[i] = Math.round(samples[i % samples.length] * 128 + 128);
        };
      } else {
        node.getFloatTimeDomainData = (arr) => { for (let i = 0; i < arr.length; i++) arr[i] = samples[i % samples.length]; };
      }
      self.analyser = node;
      return node;
    };
    log.ctxs.push(this);
  }

  const g = {
    setInterval(fn, ms) { const id = nextTimer++; log.timers.set(id, { fn, ms }); return id; },
    clearInterval(id) { log.cleared.push(id); log.timers.delete(id); },
    addEventListener(t, f) { log.listeners.push([t, f]); }
  };
  if (!opts.noCtx) g.AudioContext = AudioContext;
  if (!opts.noMedia) {
    g.navigator = {
      mediaDevices: {
        getUserMedia(c) {
          log.gum.push(c);
          if (opts.gum) return opts.gum(c);
          const s = fakeStream(opts.trackCount || 1);
          streams.push(s);
          return Promise.resolve(s);
        }
      }
    };
  } else {
    g.navigator = {};
  }
  return {
    g, log, streams,
    m: mic.create(g),
    setSamples(s) { samples = s; },
    tick() { for (const t of [...log.timers.values()]) t.fn(); },
    pagehide() { log.listeners.filter(([t]) => t === "pagehide").forEach(([, f]) => f({})); }
  };
}

function errNamed(name) {
  const e = new Error(name || "x");
  if (name !== undefined) e.name = name;
  else delete e.name;
  return e;
}

describe("mic.test.js", () => {
  test("isSupported：依 mediaDevices.getUserMedia 是否存在", () => {
    assert.equal(env().m.isSupported(), true);
    assert.equal(env({ noMedia: true }).m.isSupported(), false);
    assert.equal(mic.create({}).isSupported(), false);
    assert.equal(mic.create(null).isSupported(), false);
  });

  test("AC-33-01：首次 acquire 呼叫 getUserMedia 1 次且參數為 { audio: true }；再次 acquire 重用不再呼叫", async () => {
    const e = env();
    const r1 = await e.m.acquire();
    assert.deepEqual(r1, { ok: true, reused: false, metering: true });
    assert.equal(e.log.gum.length, 1);
    assert.deepEqual(e.log.gum[0], { audio: true });
    assert.equal(e.m.isActive(), true);
    const r2 = await e.m.acquire();
    assert.deepEqual(r2, { ok: true, reused: true, metering: true });
    const r3 = await e.m.acquire();
    assert.equal(r3.reused, true);
    assert.equal(e.log.gum.length, 1);
    // 重用時呼叫 ctx.resume()，其 reject 被吞掉
    assert.equal(e.log.ctxs[0].resumeCalls, 2);
    assert.equal(e.log.ctxs.length, 1);
  });

  test("AudioContext 在 acquire 同步階段建立（getUserMedia 之前）", () => {
    let ctxCountAtGum = -1;
    const holder = {};
    const e = env({ gum: () => { ctxCountAtGum = holder.log.ctxs.length; return Promise.resolve(fakeStream()); } });
    holder.log = e.log;
    const p = e.m.acquire();
    assert.equal(e.log.ctxs.length, 1);
    assert.equal(ctxCountAtGum, 1);
    return p;
  });

  test("取得中再次 acquire 共用同一個結果，不重複呼叫 getUserMedia", async () => {
    let resolveGum;
    const e = env({ gum: () => new Promise((r) => { resolveGum = r; }) });
    const p1 = e.m.acquire();
    const p2 = e.m.acquire();
    assert.equal(p1, p2);
    assert.equal(e.log.gum.length, 1);
    resolveGum(fakeStream());
    assert.equal((await p1).ok, true);
  });

  test("AC-33-02：release 後所有 track stop、readyState ended、AudioContext.close、節點 disconnect、計時器清除、isActive false；冪等", async () => {
    const e = env({ trackCount: 2 });
    await e.m.acquire();
    assert.equal(e.m.startMeter(() => {}), true);
    const ts = e.m.tracks();
    assert.equal(ts.length, 2);
    const ctx = e.log.ctxs[0];
    e.m.release();
    for (const t of ts) {
      assert.equal(t.stopCalls, 1);
      assert.equal(t.readyState, "ended");
      assert.equal(t.listeners.length, 0);
    }
    assert.equal(ctx.closeCalls, 1);
    assert.ok(ctx.source.disconnected >= 1);
    assert.ok(ctx.analyser.disconnected >= 1);
    assert.equal(e.log.timers.size, 0);
    assert.equal(e.m.isActive(), false);
    assert.deepEqual(e.m.tracks(), []);
    assert.doesNotThrow(() => { e.m.release(); e.m.release(); });
    assert.equal(ctx.closeCalls, 1);
    // 釋放後再取得 → 重新呼叫 getUserMedia
    const r = await e.m.acquire();
    assert.equal(r.reused, false);
    assert.equal(e.log.gum.length, 2);
  });

  test("release：AudioContext.close 的 reject 被吞掉", async () => {
    const e = env({ closeRejects: true });
    await e.m.acquire();
    assert.doesNotThrow(() => e.m.release());
    await new Promise((r) => setImmediate(r));
  });

  test("tracks() 回傳複本，修改不影響內部狀態", async () => {
    const e = env();
    await e.m.acquire();
    const a = e.m.tracks();
    a.length = 0;
    assert.equal(e.m.tracks().length, 1);
    assert.equal(e.m.isActive(), true);
  });

  test("取得中 release → 晚到的 track 被停止且回 released", async () => {
    let resolveGum;
    const late = fakeStream(2);
    const e = env({ gum: () => new Promise((r) => { resolveGum = r; }) });
    const p = e.m.acquire();
    e.m.release();
    assert.equal(e.log.ctxs[0].closeCalls >= 1, true);
    resolveGum(late);
    const r = await p;
    assert.deepEqual(r, { ok: false, reason: "released" });
    for (const t of late.ts) assert.equal(t.readyState, "ended");
    assert.equal(e.m.isActive(), false);
    assert.deepEqual(e.m.tracks(), []);
    // 之後可重新取得
    const p2 = e.m.acquire();
    assert.equal(e.log.gum.length, 2);
    resolveGum(fakeStream());
    assert.equal((await p2).ok, true);
  });

  test("取得中 release 且 getUserMedia 晚到 reject → 回 released", async () => {
    let rejectGum;
    const e = env({ gum: () => new Promise((_, j) => { rejectGum = j; }) });
    const p = e.m.acquire();
    e.m.release();
    rejectGum(errNamed("NotAllowedError"));
    assert.deepEqual(await p, { ok: false, reason: "released" });
  });

  describe("§7.14 錯誤對照（AC-08-09、AC-33-05、AC-33-07）", () => {
    const table = [
      ["NotAllowedError", "permission"],
      ["PermissionDeniedError", "permission"],
      ["SecurityError", "permission"],
      ["NotFoundError", "notfound"],
      ["DevicesNotFoundError", "notfound"],
      ["OverconstrainedError", "notfound"],
      ["NotReadableError", "unavailable"],
      ["TrackStartError", "unavailable"],
      ["AbortError", "unavailable"],
      ["TypeError", "unavailable"],
      ["SomethingElse", "unavailable"],
      [undefined, "unavailable"]
    ];
    for (const [name, reason] of table) {
      test(`getUserMedia reject ${name === undefined ? "（無 name）" : name} → ${reason}`, async () => {
        const e = env({ gum: () => Promise.reject(errNamed(name)) });
        const r = await e.m.acquire();
        assert.deepEqual(r, { ok: false, reason });
        assert.equal(e.m.isActive(), false);
        // 預先建立的 AudioContext 被關閉
        assert.equal(e.log.ctxs[0].closeCalls, 1);
        assert.equal(mic.reasonOfError(errNamed(name)), reason);
      });
    }

    test("reject 值不是物件（字串、null）→ unavailable", async () => {
      for (const v of ["boom", null, undefined]) {
        const e = env({ gum: () => Promise.reject(v) });
        assert.deepEqual(await e.m.acquire(), { ok: false, reason: "unavailable" });
      }
    });

    test("getUserMedia 同步拋例外 → 依 name 分類，不 reject", async () => {
      const e = env({ gum: () => { throw errNamed("NotAllowedError"); } });
      assert.deepEqual(await e.m.acquire(), { ok: false, reason: "permission" });
    });

    test("permission 後下次按下重新嘗試取得", async () => {
      let n = 0;
      const e = env({ gum: () => (++n === 1 ? Promise.reject(errNamed("NotAllowedError")) : Promise.resolve(fakeStream())) });
      assert.equal((await e.m.acquire()).reason, "permission");
      const r = await e.m.acquire();
      assert.deepEqual(r, { ok: true, reused: false, metering: true });
      assert.equal(e.log.gum.length, 2);
    });

    test("無 mediaDevices → unavailable，且不建立 AudioContext", async () => {
      const e = env({ noMedia: true });
      assert.deepEqual(await e.m.acquire(), { ok: false, reason: "unavailable" });
      assert.equal(e.log.ctxs.length, 0);
      assert.deepEqual(await mic.create({}).acquire(), { ok: false, reason: "unavailable" });
      assert.deepEqual(await mic.create(undefined).acquire(), { ok: false, reason: "unavailable" });
    });

    test("getUserMedia 回傳沒有音軌的串流 → unavailable", async () => {
      const e = env({ gum: () => Promise.resolve({ getAudioTracks: () => [] }) });
      assert.deepEqual(await e.m.acquire(), { ok: false, reason: "unavailable" });
      const e2 = env({ gum: () => Promise.resolve(null) });
      assert.deepEqual(await e2.m.acquire(), { ok: false, reason: "unavailable" });
    });
  });

  describe("AudioContext 失敗 → 音軌保留、metering false（AC-33-07）", () => {
    test("建構拋例外", async () => {
      const e = env({ ctxThrows: true });
      const r = await e.m.acquire();
      assert.deepEqual(r, { ok: true, reused: false, metering: false });
      assert.equal(e.m.isActive(), true);
      // 重用仍不再詢問
      assert.deepEqual(await e.m.acquire(), { ok: true, reused: true, metering: false });
      assert.equal(e.log.gum.length, 1);
      const levels = [];
      assert.equal(e.m.startMeter((k) => levels.push(k)), false);
      assert.deepEqual(levels, [0]);
      assert.equal(e.log.timers.size, 0);
      e.m.release();
      assert.equal(e.streams[0].ts[0].readyState, "ended");
    });

    test("不存在 AudioContext", async () => {
      const e = env({ noCtx: true });
      assert.deepEqual(await e.m.acquire(), { ok: true, reused: false, metering: false });
    });

    test("createAnalyser 失敗 → 關閉 AudioContext、斷開 source", async () => {
      const e = env({ analyserThrows: true });
      assert.deepEqual(await e.m.acquire(), { ok: true, reused: false, metering: false });
      assert.equal(e.log.ctxs[0].closeCalls, 1);
      assert.ok(e.log.ctxs[0].source.disconnected >= 1);
      assert.equal(e.m.isActive(), true);
    });
  });

  test("AC-33-06：track ended → isActive false、onTrackEnded 被呼叫、資源釋放、下次 acquire 再呼叫 getUserMedia", async () => {
    const e = env({ trackCount: 2 });
    let ended = 0;
    e.m.onTrackEnded(() => { ended++; });
    await e.m.acquire();
    e.m.startMeter(() => {});
    const [t1, t2] = e.streams[0].ts;
    t1.fireEnded();
    assert.equal(ended, 1);
    assert.equal(e.m.isActive(), false);
    assert.equal(e.log.timers.size, 0);
    assert.equal(t2.readyState, "ended");
    assert.equal(e.log.ctxs[0].closeCalls, 1);
    // 其他音軌晚到的 ended 不重複通知
    t2.fireEnded();
    assert.equal(ended, 1);
    const r = await e.m.acquire();
    assert.equal(r.reused, false);
    assert.equal(e.log.gum.length, 2);
  });

  test("onTrackEnded：再設定則覆蓋；回呼例外被攔下", async () => {
    const e = env();
    const calls = [];
    e.m.onTrackEnded(() => calls.push("a"));
    e.m.onTrackEnded(() => { calls.push("b"); throw new Error("x"); });
    await e.m.acquire();
    const orig = console.error;
    console.error = () => {};
    try {
      assert.doesNotThrow(() => e.streams[0].ts[0].fireEnded());
    } finally {
      console.error = orig;
    }
    assert.deepEqual(calls, ["b"]);
  });

  test("音軌已全部結束但未觸發事件 → acquire 重新取得", async () => {
    const e = env();
    await e.m.acquire();
    e.streams[0].ts[0].readyState = "ended";
    assert.equal(e.m.isActive(), false);
    const r = await e.m.acquire();
    assert.equal(r.reused, false);
    assert.equal(e.log.gum.length, 2);
    assert.equal(e.log.ctxs[0].closeCalls, 1);
  });

  test("AC-21-03：任何節點都未 connect 到 destination；只有 source → analyser", async () => {
    const e = env();
    await e.m.acquire();
    await e.m.acquire();
    e.m.startMeter(() => {});
    e.tick();
    const ctx = e.log.ctxs[0];
    assert.equal(e.log.connects.length, 1);
    for (const [, target] of e.log.connects) assert.notEqual(target, ctx.destination);
    assert.deepEqual(e.log.connects[0], ["source", ctx.analyser]);
  });

  test("analyser.fftSize = meter.fftSizeFor(sampleRate)", async () => {
    for (const rate of [48000, 44100, 8000]) {
      const e = env({ sampleRate: rate });
      await e.m.acquire();
      assert.equal(e.log.ctxs[0].analyser.fftSize, meter.fftSizeFor(rate));
    }
  });

  describe("startMeter／stopMeter（AC-33-03、AC-33-04）", () => {
    test("以 UPDATE_INTERVAL_MS 建立計時器；正弦樣本 → 預期格數，只在改變時回呼", async () => {
      const e = env();
      await e.m.acquire();
      const levels = [];
      assert.equal(e.m.startMeter((k) => levels.push(k)), true);
      assert.equal(e.log.timers.size, 1);
      assert.equal([...e.log.timers.values()][0].ms, meter.UPDATE_INTERVAL_MS);
      const seq = [
        [-55, 0], [-45, 1], [-45, 1], [-35, 2], [-25, 3], [-25, 3], [-15, 4], [-5, 5], [-5, 5]
      ];
      for (const [db] of seq) {
        e.setSamples(sineAt(db, 2048));
        e.tick();
      }
      e.setSamples(new Float32Array(2048));
      e.tick();
      assert.deepEqual(levels, [0, 1, 2, 3, 4, 5, 0]);
    });

    test("只有 getByteTimeDomainData 時經 bytesToFloat 換算", async () => {
      const e = env({ byteOnly: true });
      assert.equal((await e.m.acquire()).metering, true);
      const levels = [];
      e.m.startMeter((k) => levels.push(k));
      e.setSamples(sineAt(-25, 2048));
      e.tick();
      e.setSamples(sineAt(-5, 2048));
      e.tick();
      assert.deepEqual(levels, [3, 5]);
    });

    test("stopMeter 後不再回呼；冪等；重複 startMeter 先停舊計時器", async () => {
      const e = env();
      await e.m.acquire();
      const a = [];
      const b = [];
      e.m.startMeter((k) => a.push(k));
      const firstId = [...e.log.timers.keys()][0];
      e.m.startMeter((k) => b.push(k));
      assert.ok(e.log.cleared.includes(firstId));
      assert.equal(e.log.timers.size, 1);
      e.setSamples(sineAt(-35, 2048));
      e.tick();
      assert.deepEqual(a, []);
      assert.deepEqual(b, [2]);
      e.m.stopMeter();
      assert.equal(e.log.timers.size, 0);
      e.setSamples(sineAt(-5, 2048));
      e.tick();
      assert.deepEqual(b, [2]);
      assert.doesNotThrow(() => { e.m.stopMeter(); e.m.stopMeter(); });
    });

    test("未取得時 startMeter → 立即 onLevel(0)、回 false；onLevel 例外被攔下", () => {
      const e = env();
      const levels = [];
      assert.equal(e.m.startMeter((k) => levels.push(k)), false);
      assert.deepEqual(levels, [0]);
      const orig = console.error;
      console.error = () => {};
      try {
        assert.doesNotThrow(() => e.m.startMeter(() => { throw new Error("x"); }));
      } finally {
        console.error = orig;
      }
      assert.doesNotThrow(() => e.m.startMeter(undefined));
    });
  });

  test("pagehide 只登錄一次且觸發 release", async () => {
    const e = env();
    assert.equal(e.log.listeners.length, 0);
    await e.m.acquire();
    e.m.release();
    await e.m.acquire();
    assert.equal(e.log.listeners.filter(([t]) => t === "pagehide").length, 1);
    const t = e.streams[1].ts[0];
    e.pagehide();
    assert.equal(t.readyState, "ended");
    assert.equal(e.m.isActive(), false);
    assert.equal(e.log.ctxs[1].closeCalls, 1);
  });

  test("取得失敗時不登錄 pagehide", async () => {
    const e = env({ gum: () => Promise.reject(errNamed("NotAllowedError")) });
    await e.m.acquire();
    assert.equal(e.log.listeners.length, 0);
  });

  test("所有路徑 Promise 不 reject（含替身各種異常）", async () => {
    const weird = [
      env({ gum: () => { throw "plain"; } }),
      env({ gum: () => Promise.resolve({}) }),
      env({ gum: () => Promise.resolve({ getAudioTracks() { throw new Error("x"); } }) }),
      env({ gum: () => undefined }),
      env({ ctxThrows: true, gum: () => Promise.reject(errNamed("NotFoundError")) })
    ];
    const throwingNav = { get navigator() { throw new Error("x"); } };
    const all = weird.map((e) => e.m.acquire()).concat([mic.create(throwingNav).acquire()]);
    const results = await Promise.allSettled(all);
    for (const r of results) {
      assert.equal(r.status, "fulfilled");
      assert.equal(typeof r.value.ok, "boolean");
    }
  });

  test("預設實例在 Node（無瀏覽器 API）下可安全呼叫", async () => {
    assert.equal(mic.isSupported(), typeof navigator !== "undefined" && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia));
    assert.equal(mic.isActive(), false);
    assert.deepEqual(mic.tracks(), []);
    assert.doesNotThrow(() => { mic.stopMeter(); mic.release(); });
  });

  test("原始碼掃描：mic.js 不含錄音、輸出與網路、儲存 API 名稱（AC-21-03）", () => {
    const src = fs.readFileSync(path.join(__dirname, "..", "services", "mic.js"), "utf8");
    // 以字串拼接寫出禁止字，避免本測試檔本身被掃描誤判
    const banned = [
      "Media" + "Recorder", "Bl" + "ob", "createObject" + "URL", "File" + "Reader", "fet" + "ch",
      "XMLHttp" + "Request", "Web" + "Socket", "send" + "Beacon", "local" + "Storage", "indexed" + "DB",
      "Script" + "Processor", "Audio" + "Worklet", "createMediaStream" + "Destination"
    ];
    for (const w of banned) assert.equal(src.includes(w), false, "mic.js 不應出現 " + w);
    // getUserMedia 參數固定 { audio: true }
    assert.ok(/getUserMedia\(\{ audio: true \}\)/.test(src));
    // 不得 connect 到 destination
    assert.equal(/connect\([^)]*destination/.test(src), false);
  });
});
