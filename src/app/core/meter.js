/*
 * core/meter.js — 收音條音量核心（FE-35）
 * 依據：architecture.md v0.5 §7.14「收音條常數」「core/meter.js 函式」；契約 README §9.3 DS-01
 * 涵蓋：US-33；AC-33-03（5 格、更新間隔 ≤ 100 ms）、AC-33-04（RMS、dBFS、門檻 T1～T5、分析視窗 ≤ 100 ms）
 * 純函式與凍結常數：不依賴其他模組，無 DOM、無 Web Audio、無計時器、無任何網路 API。
 *
 * 門檻 THRESHOLDS_DBFS 是本專案唯一來源（Q-37 決議 A 預設值）。
 * 可調範圍（範圍內由主控代核、不改 PRD）：
 *   - 每格在預設值 ±10 dB 以內；
 *   - T1 < T2 < T3 < T4 < T5，且相鄰差 ≥ 6 dB；
 *   - T5 ≤ −9 dBFS。
 * 超出上述範圍須回 PM 修訂 PRD。meter.test.js 以 validateThresholds(THRESHOLDS_DBFS).ok === true 鎖定。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.EMT = root.EMT || {};
    root.EMT.core = root.EMT.core || {};
    root.EMT.core.meter = api;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /** 預設門檻（dBFS），供 validateThresholds 做 ±10 dB 範圍檢查；不可修改。 */
  var DEFAULT_THRESHOLDS_DBFS = Object.freeze([-50, -40, -30, -20, -10]);

  /** 目前採用的門檻 T1～T5（dBFS）；≥ Tn 點亮第 n 格。 */
  var THRESHOLDS_DBFS = Object.freeze([-50, -40, -30, -20, -10]);

  /** 收音條格數（AC-33-03）。 */
  var BAR_COUNT = 5;

  /** 分析視窗上限（毫秒；AC-33-04「最近一個 ≤ 100 ms 分析視窗」）。 */
  var MAX_WINDOW_MS = 100;

  /** 分析視窗樣本數上限（48 kHz 時 42.7 ms、44.1 kHz 時 46.4 ms）。 */
  var FFT_SIZE_MAX = 2048;

  /** 分析視窗樣本數下限（瀏覽器分析節點允許的最小值）。 */
  var FFT_SIZE_MIN = 32;

  /** 顯示更新間隔（毫秒；AC-33-03 ≤ 100 ms）。 */
  var UPDATE_INTERVAL_MS = 50;

  /** 範圍檢查參數（§7.14 可調範圍）。 */
  var RANGE = Object.freeze({
    MAX_DEVIATION_DB: 10,
    MIN_GAP_DB: 6,
    T5_MAX_DBFS: -9
  });

  /** 是否為有限數值（NaN、±Infinity、非 number 皆否）。 */
  function isNum(v) {
    return typeof v === "number" && isFinite(v);
  }

  /** 是否為可逐項讀取的樣本序列（一般陣列或 TypedArray；DataView 除外）。 */
  function isSeq(v) {
    if (Array.isArray(v)) return true;
    return typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView(v) &&
      typeof v.length === "number";
  }

  /**
   * 均方根：√(Σx² ÷ n)。非有限值忽略不計入 n；空、非陣列或全無有效值 → 0。
   * @param {number[]|Float32Array|ArrayLike<number>} samples 時域樣本（−1～1）
   * @returns {number}
   */
  function rmsOf(samples) {
    if (!isSeq(samples)) return 0;
    var sum = 0;
    var n = 0;
    for (var i = 0; i < samples.length; i++) {
      var x = samples[i];
      if (!isNum(x)) continue;
      sum += x * x;
      n++;
    }
    if (n === 0) return 0;
    return Math.sqrt(sum / n);
  }

  /**
   * RMS → dBFS：rms > 0 且有限 → 20 × log10(rms)；否則 −Infinity（RMS = 0 視為全暗）。
   * @param {number} rms
   * @returns {number}
   */
  function dbfsOf(rms) {
    if (!isNum(rms) || rms <= 0) return -Infinity;
    return 20 * Math.log(rms) / Math.LN10;
  }

  /**
   * dBFS → 亮格數 0～5：由第 1 格起逐格檢查 db >= th[i]，遇到第一個不成立即停，
   * 因此亮格一定從左側連續；恰等於門檻算點亮；NaN、−Infinity → 0。
   * @param {number} db
   * @param {number[]} [th] 門檻陣列，預設 THRESHOLDS_DBFS
   * @returns {number}
   */
  function levelOf(db, th) {
    var t = Array.isArray(th) ? th : THRESHOLDS_DBFS;
    if (typeof db !== "number" || db !== db || db === -Infinity) return 0;
    var max = Math.min(t.length, BAR_COUNT);
    var k = 0;
    while (k < max && isNum(t[k]) && db >= t[k]) k++;
    return k;
  }

  /**
   * 時域樣本 → 亮格數：levelOf(dbfsOf(rmsOf(samples)))。
   * @param {number[]|Float32Array} samples
   * @returns {number}
   */
  function levelOfSamples(samples) {
    return levelOf(dbfsOf(rmsOf(samples)));
  }

  /**
   * 位元組時域樣本（0～255，128 為零點）→ 浮點樣本：(v − 128) ÷ 128。
   * 供只能讀取位元組時域資料的實作使用。非陣列 → 長度 0；非有限值轉為 NaN（rmsOf 會忽略）。
   * @param {Uint8Array|number[]} bytes
   * @returns {Float32Array}
   */
  function bytesToFloat(bytes) {
    if (!isSeq(bytes)) return new Float32Array(0);
    var out = new Float32Array(bytes.length);
    for (var i = 0; i < bytes.length; i++) {
      var v = bytes[i];
      out[i] = isNum(v) ? (v - 128) / 128 : NaN;
    }
    return out;
  }

  /**
   * 分析視窗樣本數：不超過 FFT_SIZE_MAX 且 fftSize ÷ sampleRate ≤ MAX_WINDOW_MS / 1000 的最大 2 的冪，
   * 最小 FFT_SIZE_MIN；sampleRate 非正有限數 → FFT_SIZE_MAX。
   * @param {number} sampleRate 取樣率（Hz）
   * @returns {number}
   */
  function fftSizeFor(sampleRate) {
    if (!isNum(sampleRate) || sampleRate <= 0) return FFT_SIZE_MAX;
    var size = FFT_SIZE_MAX;
    // 以「size × 1000 ≤ MAX_WINDOW_MS × rate」比較，避免浮點除法誤差
    while (size > FFT_SIZE_MIN && size * 1000 > MAX_WINDOW_MS * sampleRate) size = size / 2;
    return size;
  }

  /**
   * 檢查門檻是否在 §7.14 可調範圍內。
   * 規則：長度 5、皆為有限數、各在預設 ±10 dB、嚴格遞增且相鄰差 ≥ 6 dB、T5 ≤ −9 dBFS。
   * @param {number[]} th
   * @returns {{ ok: boolean, errors: string[] }}
   */
  function validateThresholds(th) {
    var errors = [];
    if (!Array.isArray(th)) {
      errors.push("門檻必須是陣列");
      return Object.freeze({ ok: false, errors: Object.freeze(errors) });
    }
    if (th.length !== BAR_COUNT) {
      errors.push("門檻數量必須為 " + BAR_COUNT + "（目前 " + th.length + "）");
    }
    var allNum = true;
    for (var i = 0; i < th.length; i++) {
      if (!isNum(th[i])) {
        errors.push("T" + (i + 1) + " 不是有限數值");
        allNum = false;
      }
    }
    if (allNum && th.length === BAR_COUNT) {
      for (var j = 0; j < BAR_COUNT; j++) {
        if (Math.abs(th[j] - DEFAULT_THRESHOLDS_DBFS[j]) > RANGE.MAX_DEVIATION_DB) {
          errors.push("T" + (j + 1) + " 超出預設值 " + DEFAULT_THRESHOLDS_DBFS[j] + " ±" + RANGE.MAX_DEVIATION_DB + " dB");
        }
        if (j > 0) {
          var gap = th[j] - th[j - 1];
          if (gap <= 0) {
            errors.push("T" + j + " < T" + (j + 1) + " 不成立（必須嚴格遞增）");
          } else if (gap < RANGE.MIN_GAP_DB) {
            errors.push("T" + j + " 與 T" + (j + 1) + " 相差 " + gap + " dB，小於 " + RANGE.MIN_GAP_DB + " dB");
          }
        }
      }
      if (th[BAR_COUNT - 1] > RANGE.T5_MAX_DBFS) {
        errors.push("T5 必須 ≤ " + RANGE.T5_MAX_DBFS + " dBFS");
      }
    }
    return Object.freeze({ ok: errors.length === 0, errors: Object.freeze(errors) });
  }

  /**
   * 亮格數 → 長度 5 的布林陣列（前 level 個為 true）；非 0～5 整數 → 全 false。
   * @param {number} level
   * @returns {ReadonlyArray<boolean>}
   */
  function barsModel(level) {
    var ok = typeof level === "number" && level % 1 === 0 && level >= 0 && level <= BAR_COUNT;
    var bars = [];
    for (var i = 0; i < BAR_COUNT; i++) bars.push(ok && i < level);
    return Object.freeze(bars);
  }

  return Object.freeze({
    THRESHOLDS_DBFS: THRESHOLDS_DBFS,
    DEFAULT_THRESHOLDS_DBFS: DEFAULT_THRESHOLDS_DBFS,
    BAR_COUNT: BAR_COUNT,
    MAX_WINDOW_MS: MAX_WINDOW_MS,
    FFT_SIZE_MAX: FFT_SIZE_MAX,
    UPDATE_INTERVAL_MS: UPDATE_INTERVAL_MS,
    rmsOf: rmsOf,
    dbfsOf: dbfsOf,
    levelOf: levelOf,
    levelOfSamples: levelOfSamples,
    bytesToFloat: bytesToFloat,
    fftSizeFor: fftSizeFor,
    validateThresholds: validateThresholds,
    barsModel: barsModel
  });
});
