/*
 * meter.test.js — 收音條音量核心單元測試（FE-35）
 * 依據：architecture.md v0.5 §7.14「收音條常數」「core/meter.js 函式」、§10.2「meter.test.js」列
 * 涵蓋：US-33；AC-33-03、AC-33-04
 */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");
const meter = require("../core/meter.js");

const {
  THRESHOLDS_DBFS, DEFAULT_THRESHOLDS_DBFS, BAR_COUNT, MAX_WINDOW_MS, FFT_SIZE_MAX, UPDATE_INTERVAL_MS,
  rmsOf, dbfsOf, levelOf, levelOfSamples, bytesToFloat, fftSizeFor, validateThresholds, barsModel
} = meter;

/** AC-33-04 六段 QA 測試音源（dBFS）與預期亮格數。 */
const AC_33_04 = [
  [-55, 0], [-45, 1], [-35, 2], [-25, 3], [-15, 4], [-5, 5]
];

/**
 * 產生 1 kHz 正弦樣本：振幅 √2 × 10^(dB/20)，使 RMS ≈ 10^(dB/20)。
 * @param {number} db 目標 RMS（dBFS）
 * @param {number} [rate] 取樣率
 * @param {number} [n] 樣本數
 */
function sine(db, rate = 48000, n = 2048) {
  const amp = Math.SQRT2 * Math.pow(10, db / 20);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = amp * Math.sin(2 * Math.PI * 1000 * i / rate);
  return out;
}

// ── 常數 ──

test("常數值依 §7.14", () => {
  assert.deepEqual([...THRESHOLDS_DBFS], [-50, -40, -30, -20, -10]);
  assert.deepEqual([...DEFAULT_THRESHOLDS_DBFS], [-50, -40, -30, -20, -10]);
  assert.notEqual(THRESHOLDS_DBFS, DEFAULT_THRESHOLDS_DBFS, "預設值應為獨立物件，供範圍檢查");
  assert.equal(BAR_COUNT, 5);
  assert.equal(MAX_WINDOW_MS, 100);
  assert.equal(FFT_SIZE_MAX, 2048);
  assert.equal(UPDATE_INTERVAL_MS, 50);
});

test("AC-33-03：UPDATE_INTERVAL_MS ≤ 100", () => {
  assert.ok(UPDATE_INTERVAL_MS <= 100);
  assert.ok(UPDATE_INTERVAL_MS > 0);
});

test("常數與模組物件凍結", () => {
  assert.ok(Object.isFrozen(meter));
  assert.ok(Object.isFrozen(THRESHOLDS_DBFS));
  assert.ok(Object.isFrozen(DEFAULT_THRESHOLDS_DBFS));
  assert.throws(() => { "use strict"; THRESHOLDS_DBFS[0] = -60; }, TypeError);
  assert.throws(() => { "use strict"; meter.BAR_COUNT = 6; }, TypeError);
  assert.equal(THRESHOLDS_DBFS[0], -50);
});

// ── validateThresholds（DS-01 可調範圍鎖定） ──

test("validateThresholds(THRESHOLDS_DBFS).ok === true（門檻在可調範圍內）", () => {
  const r = validateThresholds(THRESHOLDS_DBFS);
  assert.equal(r.ok, true);
  assert.deepEqual([...r.errors], []);
});

test("validateThresholds：範圍內的微調通過", () => {
  assert.equal(validateThresholds([-60, -48, -36, -24, -12]).ok, true);
  assert.equal(validateThresholds([-45, -39, -33, -27, -9]).ok, true, "相鄰差恰 6、T5 恰 −9");
  assert.equal(validateThresholds([-40, -30, -21, -15, -9]).ok, true, "各恰在 +10 以內");
});

test("validateThresholds：超出 ±10、非遞增、相鄰差 5、T5 = −8 皆不通過", () => {
  const bad = {
    "T1 超出 −10": [-61, -40, -30, -20, -10],
    "T1 超出 +10": [-39, -30, -21, -15, -9],
    "非遞增": [-50, -30, -40, -20, -10],
    "相等": [-50, -40, -40, -20, -10],
    "相鄰差 5": [-50, -45, -30, -20, -10],
    "T5 = −8": [-50, -40, -30, -20, -8],
    "長度 4": [-50, -40, -30, -20],
    "長度 6": [-50, -40, -30, -20, -10, -5],
    "含 NaN": [-50, NaN, -30, -20, -10],
    "含 −Infinity": [-Infinity, -40, -30, -20, -10],
    "含字串": [-50, "-40", -30, -20, -10]
  };
  for (const [name, th] of Object.entries(bad)) {
    const r = validateThresholds(th);
    assert.equal(r.ok, false, name);
    assert.ok(r.errors.length > 0, name + " 應有錯誤訊息");
  }
  for (const v of [null, undefined, "x", 5, {}]) {
    assert.equal(validateThresholds(v).ok, false);
  }
});

// ── rmsOf、dbfsOf ──

test("rmsOf：√(Σx² ÷ n)，接受陣列與 TypedArray", () => {
  assert.equal(rmsOf([3, 4]), Math.sqrt(12.5));
  assert.equal(rmsOf([0.5, -0.5, 0.5, -0.5]), 0.5);
  assert.ok(Math.abs(rmsOf(new Float32Array([0.5, -0.5])) - 0.5) < 1e-9);
  assert.equal(rmsOf(new Float32Array(1024)), 0);
});

test("rmsOf：空、非陣列、全無有效值 → 0；非有限值忽略", () => {
  for (const v of [[], new Float32Array(0), null, undefined, "abc", 1, {}, { length: 2, 0: 1, 1: 1 }]) {
    assert.equal(rmsOf(v), 0, String(v));
  }
  assert.equal(rmsOf([NaN, Infinity, -Infinity, "1", null]), 0);
  assert.equal(rmsOf([NaN, 0.5, Infinity, -0.5]), 0.5);
});

test("dbfsOf：20 × log10(rms)；0、負數、非有限 → −Infinity", () => {
  assert.equal(dbfsOf(1), 0);
  assert.ok(Math.abs(dbfsOf(0.1) - -20) < 1e-9);
  assert.ok(Math.abs(dbfsOf(0.01) - -40) < 1e-9);
  for (const v of [0, -0.5, NaN, Infinity, -Infinity, undefined, null, "0.1"]) {
    assert.equal(dbfsOf(v), -Infinity, String(v));
  }
});

// ── levelOf ──

test("AC-33-04：−55、−45、−35、−25、−15、−5 dBFS 依序得到 0、1、2、3、4、5 格；靜音 → 0", () => {
  for (const [db, n] of AC_33_04) assert.equal(levelOf(db), n, db + " dBFS");
  assert.equal(levelOf(-Infinity), 0);
  assert.equal(levelOf(dbfsOf(0)), 0);
  assert.equal(levelOf(NaN), 0);
  assert.equal(levelOf(undefined), 0);
});

test("levelOf：恰等於門檻 → 點亮該格", () => {
  THRESHOLDS_DBFS.forEach((t, i) => {
    assert.equal(levelOf(t), i + 1, "恰為 T" + (i + 1));
    assert.equal(levelOf(t - 1e-9), i, "略低於 T" + (i + 1));
  });
  assert.equal(levelOf(0), 5);
  assert.equal(levelOf(Infinity), 5);
});

test("levelOf：亮格自左連續（以非遞增的自訂門檻驗證遇到第一個不成立即停）", () => {
  // 第 2 格門檻高於第 3 格：−35 dB 通過第 1、3 格但不通過第 2 格 → 只亮 1 格
  assert.equal(levelOf(-35, [-50, -30, -40, -20, -10]), 1);
  // 逐 dB 掃描：結果單調不減，且 barsModel 的亮格皆在左側
  let prev = 0;
  for (let db = -80; db <= 5; db += 0.5) {
    const k = levelOf(db);
    assert.ok(k >= prev && k >= 0 && k <= 5);
    prev = k;
    const bars = barsModel(k);
    assert.equal(bars.indexOf(false) === -1 ? 5 : bars.indexOf(false), k);
    assert.ok(bars.slice(k).every((b) => b === false));
  }
});

test("levelOf：自訂門檻參數與非陣列門檻退回預設", () => {
  assert.equal(levelOf(-25, [-60, -48, -36, -24, -12]), 3);
  assert.equal(levelOf(-25, null), 3);
  assert.equal(levelOf(-25, "x"), 3);
});

// ── levelOfSamples（1 kHz 正弦音源） ──

test("AC-33-04：48 kHz、2048 樣本的 1 kHz 正弦（振幅 √2 × 10^(dB/20)）六段得到 0～5 格", () => {
  for (const [db, n] of AC_33_04) {
    const s = sine(db);
    assert.ok(Math.abs(dbfsOf(rmsOf(s)) - db) < 0.5, db + " dBFS 樣本 RMS 誤差過大");
    assert.equal(levelOfSamples(s), n, db + " dBFS");
  }
  assert.equal(levelOfSamples(new Float32Array(2048)), 0, "完全靜音");
});

test("levelOfSamples：其他常見取樣率與異常輸入", () => {
  for (const rate of [44100, 16000, 8000]) {
    const size = fftSizeFor(rate);
    for (const [db, n] of AC_33_04) assert.equal(levelOfSamples(sine(db, rate, size)), n, rate + " Hz " + db + " dBFS");
  }
  for (const v of [null, undefined, [], "abc"]) assert.equal(levelOfSamples(v), 0);
});

// ── bytesToFloat ──

test("bytesToFloat：(v − 128) ÷ 128", () => {
  const f = bytesToFloat(new Uint8Array([0, 64, 128, 192, 255]));
  assert.ok(f instanceof Float32Array);
  assert.deepEqual([...f], [-1, -0.5, 0, 0.5, 127 / 128].map((x) => Math.fround(x)));
  assert.deepEqual([...bytesToFloat([128, 128])], [0, 0]);
  assert.equal(bytesToFloat(null).length, 0);
  assert.equal(bytesToFloat("abc").length, 0);
  assert.equal(levelOfSamples(bytesToFloat(new Uint8Array(2048).fill(128))), 0, "位元組靜音 → 0 格");
  // 非有限值轉 NaN，rmsOf 忽略
  const g = bytesToFloat([128, NaN, 192]);
  assert.ok(Number.isNaN(g[1]));
  assert.equal(rmsOf(g), Math.sqrt((0 + 0.25) / 2));
});

test("bytesToFloat 銜接 levelOfSamples：位元組化的正弦仍得到相同格數（量化誤差容許範圍內）", () => {
  // 8 位元量化雜訊約 −59 dBFS，僅驗證 −45 dBFS 以上各段
  for (const [db, n] of AC_33_04.slice(1)) {
    const s = sine(db);
    const bytes = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) bytes[i] = Math.max(0, Math.min(255, Math.round(s[i] * 128 + 128)));
    assert.equal(levelOfSamples(bytesToFloat(bytes)), n, db + " dBFS");
  }
});

// ── fftSizeFor ──

test("fftSizeFor：48000 → 2048、44100 → 2048、16000 → 1024、8000 → 512、0 → 2048", () => {
  assert.equal(fftSizeFor(48000), 2048);
  assert.equal(fftSizeFor(44100), 2048);
  assert.equal(fftSizeFor(16000), 1024);
  assert.equal(fftSizeFor(8000), 512);
  assert.equal(fftSizeFor(0), 2048);
});

test("fftSizeFor：非正有限數 → 2048；結果為 2 的冪、32～2048，且 fftSize ÷ rate ≤ 0.1", () => {
  for (const v of [-1, NaN, Infinity, -Infinity, undefined, null, "48000"]) {
    assert.equal(fftSizeFor(v), 2048, String(v));
  }
  for (const rate of [3000, 8000, 11025, 16000, 22050, 24000, 32000, 44100, 48000, 88200, 96000, 192000, 20480, 20479]) {
    const size = fftSizeFor(rate);
    assert.ok(size >= 32 && size <= FFT_SIZE_MAX, rate + " → " + size);
    assert.equal(size & (size - 1), 0, "2 的冪");
    assert.ok(size / rate <= MAX_WINDOW_MS / 1000, rate + " Hz 視窗 " + (size / rate * 1000).toFixed(1) + " ms");
    // 最大：再加倍就超過上限或 100 ms
    if (size < FFT_SIZE_MAX) assert.ok((size * 2) / rate > 0.1, rate + " 應取最大 2 的冪");
  }
  assert.equal(fftSizeFor(20480), 2048, "恰 100 ms 時可採用");
  assert.equal(fftSizeFor(20479), 1024);
  assert.equal(fftSizeFor(100), 32, "極低取樣率取最小 32");
  // 48 kHz 時視窗 42.7 ms
  assert.equal((fftSizeFor(48000) / 48000 * 1000).toFixed(1), "42.7");
});

// ── barsModel ──

test("barsModel：長度 5，前 level 個為 true；非 0～5 整數 → 全 false", () => {
  for (let k = 0; k <= 5; k++) {
    const bars = barsModel(k);
    assert.equal(bars.length, 5);
    assert.deepEqual([...bars], [0, 1, 2, 3, 4].map((i) => i < k));
  }
  for (const v of [-1, 6, 2.5, NaN, Infinity, undefined, null, "3"]) {
    assert.deepEqual([...barsModel(v)], [false, false, false, false, false], String(v));
  }
  assert.ok(Object.isFrozen(barsModel(3)));
});

// ── 模組邊界（程式審查的自動化部分） ──

test("meter.js 不含 DOM、Web Audio、計時器與網路 API；不取用其他模組", () => {
  const src = fs.readFileSync(path.join(__dirname, "..", "core", "meter.js"), "utf8");
  const banned = [
    "document", "window", "navigator", "AudioContext", "Analyser", "getUserMedia", "MediaRecorder",
    "setInterval", "setTimeout", "requestAnimationFrame", "fetch", "XMLHttpRequest", "WebSocket",
    "sendBeacon", "localStorage", "require("
  ];
  for (const word of banned) assert.ok(!src.includes(word), "meter.js 不得出現 " + word);
  assert.ok(!/EMT\.core\.(?!meter\b)\w/.test(src), "meter.js 不得取用其他 core 模組");
});

test("瀏覽器載入方式：在無 module 的 vm 沙箱中掛到 EMT.core.meter", () => {
  const src = fs.readFileSync(path.join(__dirname, "..", "core", "meter.js"), "utf8");
  const sandbox = { self: undefined };
  sandbox.self = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: "core/meter.js" });
  const m = sandbox.EMT && sandbox.EMT.core && sandbox.EMT.core.meter;
  assert.ok(m, "EMT.core.meter 不存在");
  assert.equal(m.levelOf(-25), 3);
  assert.equal(m.fftSizeFor(48000), 2048);
});
