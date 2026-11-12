/*
 * EMT.core.island — 島嶼推算核心（FE-102；FE-113 islandsOf 單筆快取）
 * 依據：architecture.md v0.19 §4.16「EMT.core.island」、§7.32.1；v0.21 §4.16、§7.32.15 P-4；
 *       契約 data-schema.ts §19、README §15.2、§15.3 IS-5～IS-10、§15.4 IS-11～IS-16、§15.5 LF-2、§15.6 IA-2、IA-4、FB-83～FB-85
 * 涵蓋：AC-64-02～AC-64-08、AC-65-01～AC-65-03、AC-66-02、AC-66-03、AC-67-01、AC-67-02、AC-69-02～AC-69-04、AC-71-01
 *
 * - STAGES、THRESHOLDS、LIST_ORDER、STYLE_TOKENS、TEXTS 與 data-schema.ts §19 逐字相同（island.test.js 以 node:vm 比對），深度凍結。
 * - 全部為純函式：不讀寫 DOM、儲存、時鐘；today 相關的值（S、X）由呼叫端算好傳入。
 * - 任何輸入（null、非陣列、負數、NaN、空字庫）都不得產生 NaN、Infinity、負數或 undefined；
 *   P 只能是 0～100 的整數或 null（§15.2 性質）。
 * - 推算結果不持久化（IS-1）：回傳值只供當次繪製與學完回饋比較，不得寫入 PersistedData、瀏覽器儲存或備份檔。
 * - L1 模組：載入時不取用任何其他模組（LD-1）；N_O 於函式被呼叫時才向 EMT.core.constants 取用，取不到丟出含模組名稱的 Error（LD-3）。
 * - 文字一律純文字：呼叫端以 textContent／setAttribute 寫入（IA-6、C-7）。
 * - islandsOf 單筆快取（FE-113；architecture.md v0.21 §4.16、§7.32.15 P-4）：輸入鍵與上一次全部相同時不重算，
 *   回傳快取內容的新陣列與新物件。前提：呼叫端不原地修改傳入的 builtin、builtinMap、masteredWordKeys
 *   （store 與 views 一律產生新陣列）；同一陣列原地加長以長度偵測、會重算，原地替換元素則無法偵測。
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.EMT = root.EMT || {};
    root.EMT.core = root.EMT.core || {};
    root.EMT.core.island = api;
  }
})(typeof self !== "undefined" ? self : this, function (root) {
  "use strict";

  // 深層凍結：物件與其中所有子物件、陣列都不可再修改
  function deepFreeze(obj) {
    Object.getOwnPropertyNames(obj).forEach(function (name) {
      var value = obj[name];
      if (value && typeof value === "object") {
        deepFreeze(value);
      }
    });
    return Object.freeze(obj);
  }

  // ── data-schema.ts §19 常數（逐字複製，不得自行修改）──

  /** 島嶼階段表（順序即成長順序；Q-118 A、IS-8） */
  var STAGES = [
    { stage: "sand", minP: 0, maxP: 0, nameZh: "沙灘", listText: "還是一片沙灘，掌握第一個字就會冒芽", levelUpText: null, sprouts: 0, palms: 0, flowers: 0, huts: 0, flags: 0 },
    { stage: "sprout", minP: 1, maxP: 24, nameZh: "新芽", listText: "冒出新芽了", levelUpText: "{island}冒出新芽了！", sprouts: 1, palms: 0, flowers: 0, huts: 0, flags: 0 },
    { stage: "palm", minP: 25, maxP: 49, nameZh: "一棵椰子樹", listText: "長出第一棵椰子樹", levelUpText: "{island}長出第一棵椰子樹！", sprouts: 0, palms: 1, flowers: 0, huts: 0, flags: 0 },
    { stage: "bloom", minP: 50, maxP: 74, nameZh: "開花", listText: "樹林開花了", levelUpText: "{island}的樹林開花了！", sprouts: 0, palms: 2, flowers: 2, huts: 0, flags: 0 },
    { stage: "hut", minP: 75, maxP: 99, nameZh: "小屋", listText: "蓋好小屋，快完成了", levelUpText: "{island}蓋好小屋了！", sprouts: 0, palms: 2, flowers: 2, huts: 1, flags: 0 },
    { stage: "complete", minP: 100, maxP: 100, nameZh: "完成", listText: "插上旗子，這座島完成了", levelUpText: "{island}插上旗子，這座島完成了！", sprouts: 0, palms: 3, flowers: 2, huts: 1, flags: 1 }
  ];

  /** 天氣與燈塔門檻（一律以「≥」比較；E-188） */
  var THRESHOLDS = {
    weatherSunnyMin: 1,
    weatherRainbowMin: 7,
    lighthouseBuiltMin: 1,
    lighthouseLitMin: 50
  };

  /** 島嶼清單順序（前 3 項為開放島，後 2 項為霧中島；IS-9、LF-2 的島嶼先後） */
  var LIST_ORDER = ["orange", "brown", "green", "blue", "gold"];

  /** 島嶼外觀 token（建議值，畫面實際取 CSS 變數；README §15.7） */
  var STYLE_TOKENS = {
    outline: "#3d3550",
    sea: "#9fe0ec",
    dialogBg: "#fff6df",
    fogRowBg: "#f3f6fa"
  };

  /** 群島頁與學完回饋的文字（逐字使用；{名稱} 為佔位符） */
  var TEXTS = {
    islandName: { orange: "橘島", brown: "棕島", green: "綠島", blue: "藍島", gold: "金島" },
    islandSubtitle: { orange: "入門", brown: "基礎", green: "職場與商務", blue: "高階商務", gold: "近母語" },
    fogMapLabel: "{island}・霧中",
    lighthouseMapLabel: "測驗燈塔",
    lighthouseUnbuiltSign: "待建",
    listTitle: "島嶼",
    listMastery: "掌握 {p}%",
    listMasteryNoData: "掌握 —",
    listFogStatus: "尚未開放",
    listFogStage: "還在霧中，之後的版本開放",
    listOutOfGoalSuffix: "（目前目標未包含）",
    progressLabel: "{island}掌握率",
    hostName: "島主 龜龜",
    dialogSailing: "再學 {n} 個字，今天的小船就靠岸囉！",
    dialogDocked: "今天的小船靠岸了！想多學也可以，島上會更熱鬧。",
    todayGoalReached: "今日目標達成",
    weather: { cloudy: "陰天", sunny: "晴天", rainbow: "出現彩虹" },
    lighthouse: { unbuilt: "燈塔待建", built: "燈塔蓋好", lit: "燈塔點亮" },
    boat: { sailing: "航行中", docked: "已靠岸" },
    feedbackMastered: "{island}又多掌握 1 個字（掌握 {p}%）",
    feedbackDocked: "今天的小船靠岸了！",
    feedbackSailing: "小船又前進了，再 {n} 個字靠岸",
    mapAlt: "群島地圖：{islands}；藍島、金島尚未開放；連續打卡 {s} 天，{weather}；模擬測驗已答對 {k} 題，{lighthouse}；今日小船 {x} / {d} 字，{boat}",
    mapAltIsland: "{island}掌握 {p}%，{stage}",
    mapAltIslandNoData: "{island}掌握 —，{stage}",
    mapAltIslandSeparator: "；"
  };

  deepFreeze(STAGES);
  deepFreeze(THRESHOLDS);
  deepFreeze(LIST_ORDER);
  deepFreeze(STYLE_TOKENS);
  deepFreeze(TEXTS);

  /** 3 座開放島（= LIST_ORDER 前 3 項 = IslandState.islands 順序） */
  var OPEN_ISLANDS = LIST_ORDER.slice(0, 3);
  /** 2 座霧中島 */
  var FOG_ISLANDS = LIST_ORDER.slice(3);

  var hasOwn = Object.prototype.hasOwnProperty;

  // ── 模組取用（LD-1、LD-3）──

  /** 呼叫時才取用 core/constants.js；取不到屬程式組裝錯誤，丟出含模組名稱的 Error */
  function constantsModule() {
    if (typeof require === "function" && typeof module === "object") {
      return require("./constants.js");
    }
    var emt = root && root.EMT;
    if (!emt || !emt.core || !emt.core.constants) {
      throw new Error("[EMT.core.island] 缺少模組 EMT.core.constants");
    }
    return emt.core.constants;
  }

  /** 契約常數 N_O（橘島區段上界；R-8） */
  function nO() {
    return toCount(constantsModule().N_O);
  }

  // ── 數值防呆 ──

  /** 非負整數：有限且 > 0 的數字取 floor；其餘（null、NaN、Infinity、負數、非數字）一律 0 */
  function toCount(v) {
    return typeof v === "number" && isFinite(v) && v > 0 ? Math.floor(v) : 0;
  }

  /** 每日新字量 D：≥ 1 的整數；小於 1、非整數或非有限數以 1 計（§4.16 boatOf 防呆） */
  function toDaily(v) {
    return typeof v === "number" && isFinite(v) && v >= 1 && Math.floor(v) === v ? v : 1;
  }

  /** 合法的排名：正整數；否則 null */
  function rankOf(item) {
    var r = item && typeof item === "object" ? item.rank : null;
    return typeof r === "number" && isFinite(r) && r >= 1 && Math.floor(r) === r ? r : null;
  }

  /**
   * 排名歸屬的島（IS-5）：0 橘（1～nO）、1 棕（nO+1～nB）、2 綠（nB+1～nG）、-1 不屬任何島。
   * 依序判斷，同一個排名只歸 1 座島（資料正常時三區段本就不重疊）。
   */
  function sectionIndex(rank, o, b, g) {
    if (rank === null) { return -1; }
    if (rank <= o) { return 0; }
    if (rank > o && rank <= b) { return 1; }
    if (rank > b && rank <= g) { return 2; }
    return -1;
  }

  // ── 區段與掌握數（IS-5、IS-6）──

  /** sectionSizes 的快取：以 builtin 陣列為鍵，值為 { key: "nB,nG", sizes } */
  var sizeCache = new WeakMap();

  /**
   * 區段字數 n（IS-5）：以 rank 計數，不是區段邊界的差。上界小於下界時 n = 0。
   * 同一份字庫（同一個陣列）與同一組 nB、nG 只數 1 次。
   * @param {Array<{rank:number}>} builtin 已驗證、整理後的內建字庫
   * @param {number} nB
   * @param {number} nG
   * @returns {number[]} [橘 n, 棕 n, 綠 n]
   */
  function sectionSizes(builtin, nB, nG) {
    if (!Array.isArray(builtin)) { return [0, 0, 0]; }
    var o = nO();
    var b = toCount(nB);
    var g = toCount(nG);
    var key = o + "," + b + "," + g;
    var hit = sizeCache.get(builtin);
    if (hit && hit.key === key) { return hit.sizes.slice(); }
    var sizes = [0, 0, 0];
    for (var i = 0; i < builtin.length; i++) {
      var idx = sectionIndex(rankOf(builtin[i]), o, b, g);
      if (idx >= 0) { sizes[idx]++; }
    }
    sizeCache.set(builtin, { key: key, sizes: sizes });
    return sizes.slice();
  }

  /**
   * 島嶼已掌握數 m（IS-6）：已掌握集合先去重，再以 builtinMap 查內建字的 rank 歸區段。
   * 不屬內建字庫的 wordKey（自訂單字、已不存在的字）不計；自訂卡與內建同 wordKey 時計入該內建字所屬的島（FB-85）。
   * 只走已掌握集合（O(已掌握數)），不看目前單字集、不受生效色級影響。
   * @param {string[]|Set<string>} masteredWordKeys
   * @param {Map<string, {rank:number}>} builtinMap wordKey → 內建字
   * @param {number} nB
   * @param {number} nG
   * @returns {number[]} [橘 m, 棕 m, 綠 m]
   */
  function masteredCounts(masteredWordKeys, builtinMap, nB, nG) {
    var counts = [0, 0, 0];
    if (!builtinMap || typeof builtinMap.get !== "function") { return counts; }
    var list;
    if (Array.isArray(masteredWordKeys)) {
      list = masteredWordKeys;
    } else if (masteredWordKeys instanceof Set) {
      list = Array.from(masteredWordKeys);
    } else {
      return counts;
    }
    var o = nO();
    var b = toCount(nB);
    var g = toCount(nG);
    var seen = new Set();
    for (var i = 0; i < list.length; i++) {
      var key = list[i];
      if (typeof key !== "string" || seen.has(key)) { continue; }
      seen.add(key);
      var idx = sectionIndex(rankOf(builtinMap.get(key)), o, b, g);
      if (idx >= 0) { counts[idx]++; }
    }
    return counts;
  }

  // ── 掌握率與階段（IS-7、IS-8）──

  /**
   * 島嶼掌握率 P（IS-7，整數運算，.5 進位）：n = 0 → null；m = 0 → 0；m ≥ n → 100；
   * 其餘 floor((200m + n) ÷ 2n) 再限制在 1～99。
   * @param {number} m
   * @param {number} n
   * @returns {number|null}
   */
  function percent(m, n) {
    var mm = toCount(m);
    var nn = toCount(n);
    if (nn === 0) { return null; }
    if (mm === 0) { return 0; }
    if (mm >= nn) { return 100; }
    return Math.min(Math.max(Math.floor((200 * mm + nn) / (2 * nn)), 1), 99);
  }

  /** 依 P 取 STAGES 的索引；null 或不合法 → 0（sand） */
  function stageIndexOfP(p) {
    if (typeof p !== "number" || !isFinite(p)) { return 0; }
    for (var i = 0; i < STAGES.length; i++) {
      if (p >= STAGES[i].minP && p <= STAGES[i].maxP) { return i; }
    }
    return p > 100 ? STAGES.length - 1 : 0;
  }

  /**
   * 階段（IS-8）：依整數 P 查 STAGES；P 為 null → "sand"。
   * @param {number|null} p
   * @returns {string} IslandStage
   */
  function stageOf(p) {
    return STAGES[stageIndexOfP(p)].stage;
  }

  /** 階段代碼在 STAGES 的索引（成長順序）；不認得的代碼 → 0 */
  function stageIndex(stage) {
    for (var i = 0; i < STAGES.length; i++) {
      if (STAGES[i].stage === stage) { return i; }
    }
    return 0;
  }

  /** 生效色級在 LIST_ORDER 的索引；不認得時比照綠（與 vocab.limitOf 相同：橘、棕以外一律視為綠） */
  function goalIndex(effectiveColor) {
    var idx = LIST_ORDER.indexOf(effectiveColor);
    return idx >= 0 ? idx : LIST_ORDER.indexOf("green");
  }

  /** islandsOf 的單筆快取：{ key, result }；result 為模組私有、不外流（回傳的一律是拷貝） */
  var islandsCache = null;

  /**
   * 3 座開放島的推算結果（IS-5～IS-9）。
   * @param {{builtin:Array, builtinMap:Map, nB:number, nG:number, masteredWordKeys:(string[]|Set), effectiveColor:string}} input
   * 單筆快取：masteredWordKeys 為陣列且 builtin 參照、builtinMap 參照、nB、nG、N_O、masteredWordKeys 參照與長度、
   * effectiveColor 都與上一次相同 → 不呼叫 sectionSizes／masteredCounts，回傳快取內容的拷貝（§4.16）。
   * @returns {Array<{island:string, n:number, m:number, p:(number|null), stage:string, outOfGoal:boolean}>} 依序橘、棕、綠（每次都是新陣列與新物件）
   */
  function islandsOf(input) {
    var src = input && typeof input === "object" ? input : {};
    var key = islandsKeyOf(src);
    if (key !== null && islandsCache !== null && sameIslandsKey(islandsCache.key, key)) {
      return copyIslands(islandsCache.result);
    }
    var result = computeIslands(src);
    // 只有 masteredWordKeys 為陣列時才保留；Set／非陣列每次都重算，順手清掉舊快取
    islandsCache = key !== null ? { key: key, result: result } : null;
    return copyIslands(result);
  }

  /**
   * islandsOf 的快取鍵；masteredWordKeys 不是陣列 → null（不快取）。
   * N_O 只在原邏輯會用到時才取（builtin 為陣列或 builtinMap 可查），
   * 讓「缺少 EMT.core.constants」時是否拋錯與未加快取前完全相同（LD-3）。
   */
  function islandsKeyOf(src) {
    var keys = src.masteredWordKeys;
    if (!Array.isArray(keys)) { return null; }
    var map = src.builtinMap;
    var needO = Array.isArray(src.builtin) || Boolean(map && typeof map.get === "function");
    return {
      builtin: src.builtin,
      builtinMap: map,
      nB: toCount(src.nB),
      nG: toCount(src.nG),
      o: needO ? nO() : null,
      keys: keys,
      length: keys.length,
      effectiveColor: src.effectiveColor
    };
  }

  /** 兩組快取鍵是否全部相同（參照比較 builtin、builtinMap、masteredWordKeys；其餘比值） */
  function sameIslandsKey(a, b) {
    return a.builtin === b.builtin &&
      a.builtinMap === b.builtinMap &&
      a.nB === b.nB &&
      a.nG === b.nG &&
      a.o === b.o &&
      a.keys === b.keys &&
      a.length === b.length &&
      a.effectiveColor === b.effectiveColor;
  }

  /** 新陣列、每島物件淺拷貝（欄位皆為基本型別），呼叫端修改或凍結回傳值都不影響快取 */
  function copyIslands(list) {
    return list.map(function (it) {
      return { island: it.island, n: it.n, m: it.m, p: it.p, stage: it.stage, outOfGoal: it.outOfGoal };
    });
  }

  /** islandsOf 的實際推算（未加快取前的原邏輯） */
  function computeIslands(src) {
    var sizes = sectionSizes(src.builtin, src.nB, src.nG);
    var counts = masteredCounts(src.masteredWordKeys, src.builtinMap, src.nB, src.nG);
    var gi = goalIndex(src.effectiveColor);
    return OPEN_ISLANDS.map(function (island, i) {
      var n = sizes[i];
      // 字庫與對照表不一致時（資料異常）m 仍不得超過 n
      var m = Math.min(counts[i], n);
      var p = percent(m, n);
      return {
        island: island,
        n: n,
        m: m,
        p: p,
        stage: stageOf(p),
        outOfGoal: LIST_ORDER.indexOf(island) > gi
      };
    });
  }

  // ── 天氣、燈塔、小船（IS-11～IS-13）──

  /**
   * 天氣（IS-11）：S = 0 → cloudy；1～6 → sunny；≥ 7 → rainbow。
   * @param {number} s 連續打卡顯示值
   * @returns {string} WeatherKind
   */
  function weatherOf(s) {
    var v = toCount(s);
    if (v >= THRESHOLDS.weatherRainbowMin) { return "rainbow"; }
    if (v >= THRESHOLDS.weatherSunnyMin) { return "sunny"; }
    return "cloudy";
  }

  /**
   * 燈塔（IS-12）：K = 0 → unbuilt；1～49 → built；≥ 50 → lit（固定題數，不隨 Q 縮放）。
   * @param {number} k 已答對題數
   * @returns {string} LighthouseKind
   */
  function lighthouseOf(k) {
    var v = toCount(k);
    if (v >= THRESHOLDS.lighthouseLitMin) { return "lit"; }
    if (v >= THRESHOLDS.lighthouseBuiltMin) { return "built"; }
    return "unbuilt";
  }

  /**
   * 小船（IS-13）：r = min(X ÷ D, 1)；r = 1 → docked，否則 sailing；remaining = max(D − X, 0)。
   * D 小於 1 或非整數時以 1 計（防呆）。
   * @param {number} x 今日已學數
   * @param {number} d 每日新字量
   * @returns {{boatRatio:number, boat:string, remaining:number}}
   */
  function boatOf(x, d) {
    var xx = toCount(x);
    var dd = toDaily(d);
    var ratio = Math.min(xx / dd, 1);
    return {
      boatRatio: ratio,
      boat: ratio >= 1 ? "docked" : "sailing",
      remaining: Math.max(dd - xx, 0)
    };
  }

  /**
   * 群島頁一次繪製所需的全部推算值（IslandState；IS-3 單一來源）。
   * 呼叫端傳入與 3 格數據、今日進度列同一組 S、K、Q、X、D。回傳值深度凍結。
   * @param {object} input islandsOf 的欄位 + streakDays、k、q、x、d
   * @returns {object} IslandState
   */
  function state(input) {
    var src = input && typeof input === "object" ? input : {};
    var streakDays = toCount(src.streakDays);
    var q = toCount(src.q);
    // K 為 0～Q 的整數；Q = 0 時 K = 0（AS-1）
    var k = Math.min(toCount(src.k), q);
    var x = toCount(src.x);
    var d = toDaily(src.d);
    var boat = boatOf(x, d);
    return deepFreeze({
      islands: islandsOf(src),
      streakDays: streakDays,
      weather: weatherOf(streakDays),
      k: k,
      q: q,
      lighthouse: lighthouseOf(k),
      x: x,
      d: d,
      boatRatio: boat.boatRatio,
      boat: boat.boat,
      remaining: boat.remaining
    });
  }

  // ── 組字 ──

  /**
   * 格式字串替換：把 {名稱} 換成 String(values[名稱])，其餘字元逐字保留；不做 HTML 跳脫（呼叫端以 textContent 寫入）。
   * 模板中出現但 values 沒有（或為 null／undefined）的鍵 → 拋 TypeError（屬程式錯誤，比照 layout.fill）。
   * @param {string} template
   * @param {object} values
   * @returns {string}
   */
  function fillText(template, values) {
    var src = values && typeof values === "object" ? values : {};
    return String(template).replace(/\{(\w+)\}/g, function (all, key) {
      if (!hasOwn.call(src, key) || src[key] === null || src[key] === undefined) {
        throw new TypeError("island.fillText：缺少佔位符 {" + key + "} 的值");
      }
      return String(src[key]);
    });
  }

  /** 島名；不是 LIST_ORDER 中的島 → TypeError（程式錯誤） */
  function islandNameOf(island) {
    if (typeof island !== "string" || !hasOwn.call(TEXTS.islandName, island)) {
      throw new TypeError("island：未知的島嶼代碼 " + String(island));
    }
    return TEXTS.islandName[island];
  }

  /** IslandProgress 的 P 正規化：0～100 的整數或 null */
  function normalizedP(p) {
    return typeof p === "number" && isFinite(p) && p >= 0 && p <= 100 && Math.floor(p) === p ? p : null;
  }

  // ── 學完回饋（LF-2）──

  /** 依島嶼代碼取快照中的 IslandProgress；找不到 → null */
  function progressIn(st, island) {
    var list = st && Array.isArray(st.islands) ? st.islands : [];
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].island === island) { return list[i]; }
    }
    return null;
  }

  /**
   * 學完回饋（LF-2）：比較學習行為前（before）與套用全部資料變更後（after）的 IslandState，一個動作最多 1 則。
   * 優先序：(1) 升階 > (2) 剛靠岸 > (3) 多掌握 > (4) 小船前進；(5) 都不成立 → null。
   * (1)(3) 同時涉及兩座島時（資料異常）取 LIST_ORDER 較前者。
   * @param {object} before 至少含 islands、x、d
   * @param {object} after 至少含 islands、x、d
   * @returns {{kind:string, island:(string|null), text:string}|null}
   */
  function feedbackOf(before, after) {
    if (!before || typeof before !== "object" || !after || typeof after !== "object") { return null; }
    var i, b, a;

    // (1) 升階：A 階段索引 > B
    for (i = 0; i < OPEN_ISLANDS.length; i++) {
      b = progressIn(before, OPEN_ISLANDS[i]);
      a = progressIn(after, OPEN_ISLANDS[i]);
      if (!a || !b) { continue; }
      var ai = stageIndex(a.stage);
      if (ai > stageIndex(b.stage) && STAGES[ai].levelUpText !== null) {
        return deepFreeze({
          kind: "levelUp",
          island: OPEN_ISLANDS[i],
          text: fillText(STAGES[ai].levelUpText, { island: islandNameOf(OPEN_ISLANDS[i]) })
        });
      }
    }

    var bx = toCount(before.x);
    var ax = toCount(after.x);
    var d = toDaily(after.d);

    // (2) 剛靠岸：B.x < d ≤ A.x
    if (bx < d && d <= ax) {
      return deepFreeze({ kind: "docked", island: null, text: TEXTS.feedbackDocked });
    }

    // (3) 多掌握：A.m > B.m（{p} = A.p）
    for (i = 0; i < OPEN_ISLANDS.length; i++) {
      b = progressIn(before, OPEN_ISLANDS[i]);
      a = progressIn(after, OPEN_ISLANDS[i]);
      if (!a || !b) { continue; }
      var ap = normalizedP(a.p);
      if (toCount(a.m) > toCount(b.m) && ap !== null) {
        return deepFreeze({
          kind: "mastered",
          island: OPEN_ISLANDS[i],
          text: fillText(TEXTS.feedbackMastered, { island: islandNameOf(OPEN_ISLANDS[i]), p: ap })
        });
      }
    }

    // (4) 小船前進：A.x > B.x 且 A.x < d（{n} = d − A.x，≥ 1）
    if (ax > bx && ax < d) {
      return deepFreeze({ kind: "sailing", island: null, text: fillText(TEXTS.feedbackSailing, { n: d - ax }) });
    }

    // (5) 不產生回饋
    return null;
  }

  // ── 畫面文字 ──

  /**
   * 龜龜對話框（IS-14）：remaining > 0 → dialogSailing（{n} = remaining）；remaining = 0 → dialogDocked。
   * @param {object} st IslandState
   * @returns {string}
   */
  function dialogText(st) {
    var remaining = toCount(st && st.remaining);
    return remaining > 0 ? fillText(TEXTS.dialogSailing, { n: remaining }) : TEXTS.dialogDocked;
  }

  /** 天氣狀態行（AC-64-06、AC-67-01）；不認得的代碼比照 cloudy */
  function weatherText(kind) {
    return hasOwn.call(TEXTS.weather, kind) ? TEXTS.weather[kind] : TEXTS.weather.cloudy;
  }

  /** 燈塔狀態行（AC-64-05、AC-67-01）；不認得的代碼比照 unbuilt */
  function lighthouseText(kind) {
    return hasOwn.call(TEXTS.lighthouse, kind) ? TEXTS.lighthouse[kind] : TEXTS.lighthouse.unbuilt;
  }

  /** 小船文字（文字替代的 {boat}）；不認得的代碼比照 sailing */
  function boatText(kind) {
    return hasOwn.call(TEXTS.boat, kind) ? TEXTS.boat[kind] : TEXTS.boat.sailing;
  }

  /**
   * 島嶼清單一列（開放島，IA-2）。
   * - right：「掌握 {p}%」；P 為 null 時「掌握 —」（FB-84）
   * - stageText：STAGES[階段].listText，outOfGoal 時接「（目前目標未包含）」（IS-9）
   * - valueNow：progressbar 的 aria-valuenow；P 為 null 時 null（呼叫端省略該屬性、填滿 0）
   * - label：progressbar 的 aria-label「{島名}掌握率」
   * @param {object} progress IslandProgress
   * @returns {{name:string, sub:string, right:string, stageText:string, valueNow:(number|null), label:string, fog:boolean}}
   */
  function listRowOf(progress) {
    var src = progress && typeof progress === "object" ? progress : {};
    if (OPEN_ISLANDS.indexOf(src.island) < 0) {
      throw new TypeError("island.listRowOf：不是開放島 " + String(src.island));
    }
    var name = islandNameOf(src.island);
    var p = normalizedP(src.p);
    var stage = STAGES[stageIndex(src.stage)];
    return deepFreeze({
      name: name,
      sub: TEXTS.islandSubtitle[src.island],
      right: p === null ? TEXTS.listMasteryNoData : fillText(TEXTS.listMastery, { p: p }),
      stageText: stage.listText + (src.outOfGoal === true ? TEXTS.listOutOfGoalSuffix : ""),
      valueNow: p,
      label: fillText(TEXTS.progressLabel, { island: name }),
      fog: false
    });
  }

  /**
   * 島嶼清單一列（霧中島：藍、金，IA-2）。進度條為空且 aria-hidden，不是 progressbar，故 valueNow、label 皆為 null。
   * @param {string} colorId "blue" | "gold"
   * @returns {{name:string, sub:string, right:string, stageText:string, valueNow:null, label:null, fog:boolean}}
   */
  function fogRowOf(colorId) {
    if (FOG_ISLANDS.indexOf(colorId) < 0) {
      throw new TypeError("island.fogRowOf：不是霧中島 " + String(colorId));
    }
    return deepFreeze({
      name: TEXTS.islandName[colorId],
      sub: TEXTS.islandSubtitle[colorId],
      right: TEXTS.listFogStatus,
      stageText: TEXTS.listFogStage,
      valueNow: null,
      label: null,
      fog: true
    });
  }

  /**
   * 地圖文字替代（IA-4，role="img" 的可存取名稱）。數字以 String(整數)，不加千分位；
   * 不含「（目前目標未包含）」；P 為 null 的島以 mapAltIslandNoData 組字。
   * @param {object} st IslandState
   * @returns {string}
   */
  function mapAltText(st) {
    var src = st && typeof st === "object" ? st : {};
    var parts = OPEN_ISLANDS.map(function (island) {
      var pr = progressIn(src, island) || {};
      var p = normalizedP(pr.p);
      var values = { island: islandNameOf(island), stage: STAGES[stageIndex(pr.stage)].nameZh };
      if (p === null) {
        return fillText(TEXTS.mapAltIslandNoData, values);
      }
      values.p = String(p);
      return fillText(TEXTS.mapAltIsland, values);
    });
    return fillText(TEXTS.mapAlt, {
      islands: parts.join(TEXTS.mapAltIslandSeparator),
      s: String(toCount(src.streakDays)),
      weather: weatherText(src.weather),
      k: String(toCount(src.k)),
      lighthouse: lighthouseText(src.lighthouse),
      x: String(toCount(src.x)),
      d: String(toDaily(src.d)),
      boat: boatText(src.boat)
    });
  }

  return deepFreeze({
    STAGES: STAGES,
    THRESHOLDS: THRESHOLDS,
    LIST_ORDER: LIST_ORDER,
    STYLE_TOKENS: STYLE_TOKENS,
    TEXTS: TEXTS,
    sectionSizes: sectionSizes,
    masteredCounts: masteredCounts,
    percent: percent,
    stageOf: stageOf,
    islandsOf: islandsOf,
    weatherOf: weatherOf,
    lighthouseOf: lighthouseOf,
    boatOf: boatOf,
    state: state,
    feedbackOf: feedbackOf,
    dialogText: dialogText,
    weatherText: weatherText,
    lighthouseText: lighthouseText,
    listRowOf: listRowOf,
    fogRowOf: fogRowOf,
    mapAltText: mapAltText,
    fillText: fillText
  });
});
