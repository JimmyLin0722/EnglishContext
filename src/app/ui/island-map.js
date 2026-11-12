/*
 * ui/island-map.js — 群島地圖 SVG（FE-107；簽章與動畫切換 FE-115）
 * 依據：architecture.md v0.21 §4.16「EMT.ui.islandMap」、§7.32.4、§7.32.8、§7.32.10、§7.32.12；
 *       契約 README §15.3 IS-8、§15.4 IS-11～IS-13、§15.6 IA-3、IA-4、IA-6、§15.7 IV-2、IV-5、VC-3；
 *       data-schema.ts §19 ISLAND_STAGES、ISLAND_TEXTS、ISLAND_STYLE_TOKENS
 * 涵蓋：AC-64-01、AC-64-02、AC-64-05～AC-64-07、AC-64-10、AC-65-03、AC-67-02、AC-68-05、AC-70-01、AC-70-02、
 *       AC-71-01、AC-71-02、AC-71-04、AC-63-03、AC-63-04、AC-31-03
 *
 * EMT.ui.islandMap.build(st, opts) → div.db-map__figure[role="img"][aria-label = island.mapAltText(st)]
 *   > svg.isl-map[viewBox="0 0 354 430"][aria-hidden="true"][focusable="false"]
 * - 以 core/dom.js 的 svg() 建立節點（createElementNS），只用 path／ellipse／rect／circle／line／g／text；
 *   不用 use、symbol、image、foreignObject 元素，不寫外部參照屬性與網址函式，不設焦點順序屬性（IV-5、AC-71-02）。
 * - 繪製順序（後者在上）：海面 → 海浪 → 彩虹 → 太陽 → 雲 → 霧中島 → 航線 → 綠島 → 棕島 → 橘島（含碼頭）
 *   → 燈塔島 → 小船 → 文字層 g.isl-labels（最後一個子群組，每段文字下方有白底牌，AC-71-04）。
 * - 植物只建立需要的元素：個數逐一等於 STAGES[stage] 的 sprouts、palms、flowers、huts、flags（IS-8）。
 * - 定位一律放外層 g 的 transform 屬性，動畫只放內層 g.isl-anim-*（CSS transform 會覆蓋屬性，T-141）；
 *   帶 isl-anim-* class 的元素不設 transform 屬性。opts.play === true 才在 svg 加 isl-map--play（§7.32.8）。
 * - 插圖顏色為柔和色，fill／stroke 不使用強調橘、不使用 --accent、--brand 變數（VC-3、IV-2、AC-68-05）。
 * - 所有文字以 textContent／setAttribute 寫入（IA-6、C-7）。每次呼叫建立新節點，不讀 store、不持久化。
 * - 素材全部為本檔以基本圖形繪製的原創 SVG（§7.32.12；聲明見 LT-7）。
 * EMT.ui.islandMap.signature(st) → string：圖形簽章，與 build 共用同一份正規化（FE-115，§7.32.15 P-1）。
 * EMT.ui.islandMap.setPlay(figure, play)：只切換 svg.isl-map 的 isl-map--play，不增減節點（FE-115）。
 * 載入時只做登錄，不讀 document、不取用其他模組（LD-1）；Node 下 module.exports 供測試。
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.EMT = root.EMT || {};
    root.EMT.ui = root.EMT.ui || {};
    root.EMT.ui.islandMap = api;
  }
})(typeof self !== "undefined" ? self : this, function (root) {
  "use strict";

  // 深層凍結：物件與其中所有子物件、陣列都不可再修改
  function deepFreeze(obj) {
    Object.getOwnPropertyNames(obj).forEach(function (name) {
      var value = obj[name];
      if (value && typeof value === "object") deepFreeze(value);
    });
    return Object.freeze(obj);
  }

  /** viewBox 尺寸（寬：高 = 354：430，AC-63-03、AC-63-04） */
  var VIEWBOX = deepFreeze({ w: 354, h: 430 });

  /**
   * 構圖座標（viewBox 單位；§7.32.4 表，金島與彩虹微調以通過外框不相交測試）。
   * - waves：每段海浪外框左上角，大小 waveSize
   * - clouds：雲中心與縮放；fog：霧中島橢圓
   * - islands：沙灘橢圓中心與半徑；plants：植物底部錨點（相對島中心，依 rx / 66 縮放）
   * - labels：文字牌中心與寬高（文字層）；route：航線起點 S 與碼頭 E
   */
  var LAYOUT = deepFreeze({
    sea: { x: 0, y: 0, w: 354, h: 430 },
    waveSize: { w: 32, h: 6 },
    waves: [
      { x: 20, y: 230 },
      { x: 40, y: 170 },
      { x: 150, y: 250 },
      { x: 160, y: 410 },
      { x: 318, y: 200 }
    ],
    rainbow: { cx: 200, cy: 126, radii: [52, 46, 40, 34], width: 6 },
    sun: { cx: 316, cy: 44, r: 19 },
    clouds: [
      { x: 282, y: 74, scale: 1 },
      { x: 210, y: 26, scale: 0.7 }
    ],
    fog: [
      { island: "blue", cx: 46, cy: 62, rx: 26, ry: 9 },
      { island: "gold", cx: 124, cy: 30, rx: 22, ry: 8 }
    ],
    route: { S: { x: 236, y: 414 }, E: { x: 206, y: 346 } },
    // 繪製順序：綠 → 棕 → 橘（遠到近）
    islandOrder: ["green", "brown", "orange"],
    islands: {
      green: { cx: 178, cy: 168, rx: 66, ry: 20 },
      brown: { cx: 272, cy: 252, rx: 62, ry: 19 },
      orange: { cx: 100, cy: 326, rx: 74, ry: 23 }
    },
    plantBaseRx: 66,
    plants: {
      sprout: [0, -6],
      palms: {
        1: [[-12, -8]],
        2: [[-34, -4], [8, -4]],
        3: [[-12, -8], [-34, -4], [8, -4]]
      },
      flowers: [[-44, 2], [22, 6]],
      hut: [32, -4],
      flag: [50, -2]
    },
    dock: { x: 156, y: 322, w: 34, h: 12, posts: [164, 182], postBottom: 344 },
    lighthouse: { cx: 298, cy: 380, rx: 34, ry: 11 },
    boatBox: { left: -16, right: 16, top: -24, bottom: 9 },
    labels: {
      blue: { cx: 46, cy: 92, w: 84, h: 22 },
      gold: { cx: 124, cy: 56, w: 84, h: 22 },
      green: { cx: 178, cy: 214, w: 56, h: 24 },
      brown: { cx: 272, cy: 294, w: 56, h: 24 },
      orange: { cx: 100, cy: 380, w: 56, h: 24 },
      lighthouse: { cx: 298, cy: 414, w: 76, h: 24 },
      sign: { cx: 316, cy: 352, w: 40, h: 22 }
    }
  });

  /** 插圖色（§7.32.4 顏色；不含強調橘，VC-3） */
  var COLOR = deepFreeze({
    outline: "#3d3550",
    sea: "#9fe0ec",
    wave: "#ffffff",
    sand: "#f7e2b0",
    grass: { orange: "#ffd09a", brown: "#e2c39b", green: "#9be3a0" },
    leaf: "#6fcf97",
    leafLight: "#8fe3b0",
    trunk: "#c98b5a",
    coconut: "#a86b3c",
    flower: "#ffb3c7",
    roof: "#ff8f6b",
    wall: "#fff3d6",
    sun: "#ffd166",
    cloud: "#ffffff",
    fogFill: "#d6eef4",
    fogStroke: "#7fb6c6",
    rainbow: ["#ff9aa2", "#ffd166", "#9be3a0", "#8ec5ff"],
    rock: "#c7c3d6",
    stone: "#e4e1ee",
    tower: "#ffffff",
    lampOff: "#e4e1ee",
    beam: "#fff3a6",
    sail: "#ffffff",
    plate: "#ffffff",
    text: "#3d3550"
  });

  var WEATHERS = ["cloudy", "sunny", "rainbow"];
  var LIGHTHOUSES = ["unbuilt", "built", "lit"];
  var BOATS = ["sailing", "docked"];
  var STAGE_IDS = ["sand", "sprout", "palm", "bloom", "hut", "complete"];
  var FOG_ISLANDS = ["blue", "gold"];

  /** 文字牌的字級、字重（§7.32.4；375px 時 14 × 0.952 ≈ 13.3 CSS px ≥ 12，AC-71-04） */
  var LABEL_FONT_SIZE = 14;
  var LABEL_FONT_WEIGHT = 700;
  /** 文字基線相對牌中心的下移量 */
  var LABEL_BASELINE_DY = 5;
  /** 陰天時太陽群組的 opacity 屬性（IS-11：≤ 0.4） */
  var CLOUDY_SUN_OPACITY = "0.35";
  /** 四分之一圓的三次貝茲控制點比例（彩虹以貝茲曲線繪製，不用弧線指令） */
  var ARC_K = 0.5523;

  /**
   * 呼叫時才取用 core 模組（LD-1）：Node 以 require，瀏覽器以 EMT.core.<name>；取不到 → 丟出含模組名稱的 Error。
   * @param {"dom"|"island"} name
   * @returns {object}
   */
  function core(name) {
    var mod = null;
    if (typeof module === "object" && module.exports && typeof require === "function") {
      try {
        if (name === "dom") mod = require("../core/dom.js");
        if (name === "island") mod = require("../core/island.js");
      } catch (e) {
        mod = null;
      }
    } else {
      var emt = root && root.EMT;
      mod = emt && emt.core && emt.core[name] ? emt.core[name] : null;
    }
    if (!mod) throw new Error("[EMT.ui.islandMap] 缺少 EMT.core." + name);
    return mod;
  }

  /** 數值轉屬性字串（最多 2 位小數，去除多餘的 0） */
  function num(n) {
    var v = Math.round(n * 100) / 100;
    return String(v === 0 ? 0 : v);
  }

  /** translate 屬性字串 */
  function translate(x, y) {
    return "translate(" + num(x) + " " + num(y) + ")";
  }

  /** 比例限制在 0～1；非有限數 → 0 */
  function clampRatio(r) {
    var v = Number(r);
    if (!isFinite(v) || v <= 0) return 0;
    return v >= 1 ? 1 : v;
  }

  /**
   * 小船錨點：起點 S 到碼頭 E 的線性內插（AC-64-07、IS-13）。
   * @param {number} ratio r = min(X ÷ D, 1)
   * @returns {{x: number, y: number}}
   */
  function boatPoint(ratio) {
    var r = clampRatio(ratio);
    var S = LAYOUT.route.S;
    var E = LAYOUT.route.E;
    return { x: S.x + (E.x - S.x) * r, y: S.y + (E.y - S.y) * r };
  }

  /** 由描邊屬性組合常用的屬性物件 */
  function stroked(attrs, width) {
    attrs.stroke = COLOR.outline;
    attrs["stroke-width"] = width;
    attrs["stroke-linejoin"] = "round";
    return attrs;
  }

  // ── 各部件（s = dom.svg） ──

  /** 海浪 5 段：外層定位、內層 g.isl-anim-wave 上下擺動 */
  function waves(s) {
    return LAYOUT.waves.map(function (w) {
      return s("g", { class: "isl-wave", transform: translate(w.x, w.y) }, [
        s("g", { class: "isl-anim-wave" }, [
          s("path", {
            d: "M0 3 q8 -6 16 0 q8 6 16 0",
            fill: "none",
            stroke: COLOR.wave,
            "stroke-width": 2.4,
            "stroke-linecap": "round",
            opacity: 0.85
          })
        ])
      ]);
    });
  }

  /** 半圓弧路徑（左 → 頂 → 右，兩段三次貝茲） */
  function semicircle(cx, cy, r) {
    var k = ARC_K * r;
    return [
      "M" + num(cx - r) + " " + num(cy),
      "C" + num(cx - r) + " " + num(cy - k) + " " + num(cx - k) + " " + num(cy - r) + " " + num(cx) + " " + num(cy - r),
      "C" + num(cx + k) + " " + num(cy - r) + " " + num(cx + r) + " " + num(cy - k) + " " + num(cx + r) + " " + num(cy)
    ].join(" ");
  }

  /** 彩虹（只在 rainbow 天氣建立，4 條弧） */
  function rainbow(s) {
    var rb = LAYOUT.rainbow;
    return s("g", { class: "isl-rainbow", fill: "none", "stroke-width": rb.width, "stroke-linecap": "round" },
      rb.radii.map(function (r, i) {
        return s("path", { d: semicircle(rb.cx, rb.cy, r), stroke: COLOR.rainbow[i] });
      }));
  }

  /** 太陽（笑臉）；陰天時群組 opacity 0.35 */
  function sun(s, weather) {
    var su = LAYOUT.sun;
    var attrs = { class: "isl-sun", transform: translate(su.cx, su.cy) };
    if (weather === "cloudy") attrs.opacity = CLOUDY_SUN_OPACITY;
    return s("g", attrs, [
      s("circle", stroked({ cx: 0, cy: 0, r: su.r, fill: COLOR.sun }, 2.5)),
      s("circle", { cx: -6, cy: -3, r: 2, fill: COLOR.outline }),
      s("circle", { cx: 6, cy: -3, r: 2, fill: COLOR.outline }),
      s("circle", { cx: -11, cy: 4, r: 2.6, fill: COLOR.flower }),
      s("circle", { cx: 11, cy: 4, r: 2.6, fill: COLOR.flower }),
      s("path", { d: "M-5 5 Q0 9 5 5", fill: "none", stroke: COLOR.outline, "stroke-width": 2, "stroke-linecap": "round" })
    ]);
  }

  /** 雲的路徑（中心 (0,0)，依 scale 縮放） */
  function cloudPath(scale) {
    var pts = [
      ["M", -28, 10],
      ["C", -38, 10, -38, -2, -28, -2],
      ["C", -28, -12, -14, -14, -8, -6],
      ["C", -4, -16, 16, -16, 18, -4],
      ["C", 28, -6, 36, 2, 30, 10]
    ];
    return pts.map(function (seg) {
      return seg[0] + seg.slice(1).map(function (v) { return num(v * scale); }).join(" ");
    }).join(" ") + " Z";
  }

  /** 雲 2 朵：外層定位、內層 g.isl-anim-cloud 水平飄移 */
  function clouds(s) {
    return LAYOUT.clouds.map(function (c) {
      return s("g", { class: "isl-cloud", transform: translate(c.x, c.y) }, [
        s("g", { class: "isl-anim-cloud" }, [
          s("path", stroked({ d: cloudPath(c.scale), fill: COLOR.cloud }, 2.4))
        ])
      ]);
    });
  }

  /** 霧中島（虛線外框、較淡、無植物，AC-64-01） */
  function fogIsland(s, f) {
    return s("g", { class: "isl-fog", "data-island": f.island, transform: translate(f.cx, f.cy), opacity: 0.75 }, [
      s("ellipse", {
        cx: 0,
        cy: 0,
        rx: f.rx,
        ry: f.ry,
        fill: COLOR.fogFill,
        stroke: COLOR.fogStroke,
        "stroke-width": 2,
        "stroke-dasharray": "4 4"
      })
    ]);
  }

  /** 航線（白色虛線，端點 = S、E） */
  function route(s) {
    var S = LAYOUT.route.S;
    var E = LAYOUT.route.E;
    return s("line", {
      class: "isl-route",
      x1: S.x,
      y1: S.y,
      x2: E.x,
      y2: E.y,
      stroke: COLOR.wave,
      "stroke-width": 3,
      "stroke-linecap": "round",
      "stroke-dasharray": "2 7"
    });
  }

  // ── 植物（原點 = 底部錨點） ──

  function sprout(s, x, y) {
    return s("g", { class: "isl-sprout", transform: translate(x, y) }, [
      s("line", { x1: 0, y1: 0, x2: 0, y2: -10, stroke: COLOR.outline, "stroke-width": 2.2, "stroke-linecap": "round" }),
      s("path", stroked({ d: "M0 -8 C-4 -8 -8 -11 -8 -16 C-3 -16 0 -12 0 -8 Z", fill: COLOR.leafLight }, 1.8)),
      s("path", stroked({ d: "M0 -9 C4 -9 8 -12 8 -16 C3 -16 0 -13 0 -9 Z", fill: COLOR.leaf }, 1.8))
    ]);
  }

  function palm(s, x, y) {
    var trunk = "M0 0 C-1 -10 -2 -19 2 -28";
    return s("g", { class: "isl-palm", transform: translate(x, y) }, [
      s("g", { class: "isl-anim-sway" }, [
        s("path", { d: trunk, fill: "none", stroke: COLOR.outline, "stroke-width": 5, "stroke-linecap": "round" }),
        s("path", { d: trunk, fill: "none", stroke: COLOR.trunk, "stroke-width": 2.6, "stroke-linecap": "round" }),
        s("path", stroked({ d: "M2 -28 C-5 -36 -13 -34 -17 -27 C-10 -30 -4 -29 2 -26 Z", fill: COLOR.leaf }, 2.2)),
        s("path", stroked({ d: "M2 -28 C9 -36 17 -34 20 -27 C13 -30 7 -29 2 -26 Z", fill: COLOR.leaf }, 2.2)),
        s("path", stroked({ d: "M2 -28 C-1 -38 3 -42 9 -42 C6 -38 5 -33 2 -27 Z", fill: COLOR.leafLight }, 2.2)),
        s("circle", stroked({ cx: 0, cy: -25, r: 2.4, fill: COLOR.coconut }, 1.4)),
        s("circle", stroked({ cx: 5, cy: -25, r: 2.4, fill: COLOR.coconut }, 1.4))
      ])
    ]);
  }

  function flower(s, x, y) {
    return s("g", { class: "isl-flower", transform: translate(x, y) }, [
      s("circle", stroked({ cx: 0, cy: -7, r: 2.6, fill: COLOR.flower }, 1.2)),
      s("circle", stroked({ cx: -3, cy: -3, r: 2.6, fill: COLOR.flower }, 1.2)),
      s("circle", stroked({ cx: 3, cy: -3, r: 2.6, fill: COLOR.flower }, 1.2)),
      s("circle", { cx: 0, cy: -4.5, r: 1.8, fill: COLOR.sun })
    ]);
  }

  function hut(s, x, y) {
    return s("g", { class: "isl-hut", transform: translate(x, y) }, [
      s("rect", stroked({ x: -10, y: -14, width: 20, height: 14, rx: 2, fill: COLOR.wall }, 2.2)),
      s("path", stroked({ d: "M-14 -12 L0 -24 L14 -12 Z", fill: COLOR.roof }, 2.2)),
      s("rect", stroked({ x: -3, y: -9, width: 6, height: 9, rx: 1.5, fill: COLOR.trunk }, 1.8))
    ]);
  }

  function flag(s, x, y) {
    return s("g", { class: "isl-flag", transform: translate(x, y) }, [
      s("line", { x1: 0, y1: 0, x2: 0, y2: -28, stroke: COLOR.outline, "stroke-width": 2.4, "stroke-linecap": "round" }),
      s("path", stroked({ d: "M1 -27 L12 -23 L1 -18 Z", fill: COLOR.sun }, 2))
    ]);
  }

  /** 碼頭（橘島右側；座標換算為相對島中心） */
  function dock(s, ox, oy) {
    var d = LAYOUT.dock;
    var parts = [s("rect", stroked({ class: "isl-dock", x: d.x - ox, y: d.y - oy, width: d.w, height: d.h, rx: 2, fill: COLOR.trunk }, 2))];
    d.posts.forEach(function (px) {
      parts.push(s("line", {
        x1: px - ox,
        y1: d.y + d.h - oy,
        x2: px - ox,
        y2: d.postBottom - oy,
        stroke: COLOR.outline,
        "stroke-width": 2.4,
        "stroke-linecap": "round"
      }));
    });
    return parts;
  }

  /**
   * 一座開放島（沙灘、草地、依階段建立的植物）。
   * @param {Function} s dom.svg
   * @param {string} id orange／brown／green
   * @param {string} stage IslandStage
   * @param {object} def STAGES 中該階段的定義
   */
  function openIsland(s, id, stage, def) {
    var g = LAYOUT.islands[id];
    var k = g.rx / LAYOUT.plantBaseRx;
    var P = LAYOUT.plants;
    var children = [];
    if (id === "orange") children = children.concat(dock(s, g.cx, g.cy));
    children.push(s("ellipse", stroked({ cx: 0, cy: 0, rx: g.rx, ry: g.ry, fill: COLOR.sand }, 2.5)));
    children.push(s("ellipse", stroked({
      cx: 0,
      cy: num(-6 * k),
      rx: num(g.rx - 14 * k),
      ry: num(g.ry - 7 * k),
      fill: COLOR.grass[id]
    }, 2.2)));
    function at(pt, fn) {
      children.push(fn(s, pt[0] * k, pt[1] * k));
    }
    var palms = Math.max(0, Math.min(3, def.palms | 0));
    if (palms > 0) P.palms[palms].forEach(function (pt) { at(pt, palm); });
    for (var i = 0; i < Math.min(1, def.sprouts | 0); i++) at(P.sprout, sprout);
    for (var h = 0; h < Math.min(1, def.huts | 0); h++) at(P.hut, hut);
    for (var f = 0; f < Math.min(1, def.flags | 0); f++) at(P.flag, flag);
    for (var j = 0; j < Math.min(P.flowers.length, def.flowers | 0); j++) at(P.flowers[j], flower);
    return s("g", { class: "isl-island", "data-island": id, "data-stage": stage, transform: translate(g.cx, g.cy) }, children);
  }

  /** 燈塔塔身（built：燈未亮；lit：燈亮） */
  function tower(s, lit) {
    return s("g", { class: "isl-lh-tower" }, [
      s("path", stroked({ d: "M-9 -4 L-6 -46 L6 -46 L9 -4 Z", fill: COLOR.tower }, 2.4)),
      s("path", { d: "M-8.3 -14 L8.3 -14 L8.9 -6 L-8.9 -6 Z M-7.1 -34 L7.1 -34 L7.6 -26 L-7.6 -26 Z", fill: COLOR.roof }),
      s("rect", stroked({ x: -8, y: -58, width: 16, height: 12, rx: 3, fill: lit ? COLOR.sun : COLOR.lampOff }, 2.4)),
      s("path", stroked({ d: "M-10 -58 L0 -68 L10 -58 Z", fill: COLOR.roof }, 2.4))
    ]);
  }

  /** 燈塔島（3 種結構，IS-12） */
  function lighthouse(s, kind) {
    var L = LAYOUT.lighthouse;
    var children = [s("ellipse", stroked({ cx: 0, cy: 0, rx: L.rx, ry: L.ry, fill: COLOR.rock }, 2.5))];
    if (kind === "unbuilt") {
      // 只有石塊；「待建」牌在文字層，此處只畫牌柱（不碰到牌）
      var sign = LAYOUT.labels.sign;
      children.push(s("g", { class: "isl-lh-rocks" }, [
        s("circle", stroked({ cx: -14, cy: -4, r: 5, fill: COLOR.stone }, 2)),
        s("circle", stroked({ cx: -2, cy: -6, r: 4, fill: COLOR.stone }, 2)),
        s("circle", stroked({ cx: 8, cy: -3, r: 3, fill: COLOR.stone }, 2)),
        s("line", {
          x1: sign.cx - L.cx,
          y1: -14,
          x2: sign.cx - L.cx,
          y2: -6,
          stroke: COLOR.outline,
          "stroke-width": 2,
          "stroke-linecap": "round"
        })
      ]));
    } else {
      if (kind === "lit") {
        children.push(s("g", { class: "isl-lh-beam" }, [
          s("path", { d: "M-4 -52 L-44 -62 L-44 -42 Z", fill: COLOR.beam, opacity: 0.85 }),
          s("path", { d: "M4 -52 L44 -62 L44 -42 Z", fill: COLOR.beam, opacity: 0.85 })
        ]));
      }
      children.push(tower(s, kind === "lit"));
    }
    return s("g", { class: "isl-lighthouse", "data-state": kind, transform: translate(L.cx, L.cy) }, children);
  }

  /** 小船：外層以 transform 屬性定位，內層 g.isl-anim-boat 上下擺動 */
  function boat(s, ratio) {
    var p = boatPoint(ratio);
    return s("g", { class: "isl-boat", "data-ratio": String(ratio), transform: translate(p.x, p.y) }, [
      s("g", { class: "isl-anim-boat" }, [
        s("path", stroked({ d: "M-16 0 L16 0 L11 9 L-11 9 Z", fill: COLOR.roof }, 2.4)),
        s("line", { x1: 0, y1: 0, x2: 0, y2: -24, stroke: COLOR.outline, "stroke-width": 2.4, "stroke-linecap": "round" }),
        s("path", stroked({ d: "M1 -23 L14 -4 L1 -4 Z", fill: COLOR.sail }, 2.2))
      ])
    ]);
  }

  /** 一段文字與其白底牌 */
  function label(s, key, text) {
    var b = LAYOUT.labels[key];
    var t = s("text", {
      x: b.cx,
      y: b.cy + LABEL_BASELINE_DY,
      "text-anchor": "middle",
      "font-size": LABEL_FONT_SIZE,
      "font-weight": LABEL_FONT_WEIGHT,
      fill: COLOR.text
    });
    t.textContent = String(text);
    return s("g", { class: "isl-label", "data-label": key }, [
      s("rect", {
        x: b.cx - b.w / 2,
        y: b.cy - b.h / 2,
        width: b.w,
        height: b.h,
        rx: 8,
        fill: COLOR.plate,
        stroke: COLOR.outline,
        "stroke-width": 1.5
      }),
      t
    ]);
  }

  /** 文字層（最上層；IA-3） */
  function labels(s, island, lhKind) {
    var T = island.TEXTS;
    var parts = FOG_ISLANDS.map(function (id) {
      return label(s, id, island.fillText(T.fogMapLabel, { island: T.islandName[id] }));
    });
    ["green", "brown", "orange"].forEach(function (id) {
      parts.push(label(s, id, T.islandName[id]));
    });
    parts.push(label(s, "lighthouse", T.lighthouseMapLabel));
    if (lhKind === "unbuilt") parts.push(label(s, "sign", T.lighthouseUnbuiltSign));
    return s("g", { class: "isl-labels" }, parts);
  }

  /** 取出某島的階段（不合法 → sand） */
  function stageOfIsland(st, id) {
    var list = st && Array.isArray(st.islands) ? st.islands : [];
    for (var i = 0; i < list.length; i++) {
      var it = list[i];
      if (it && it.island === id) return STAGE_IDS.indexOf(it.stage) >= 0 ? it.stage : "sand";
    }
    return "sand";
  }

  /** 依階段代碼找 STAGES 定義 */
  function stageDef(island, stage) {
    for (var i = 0; i < island.STAGES.length; i++) {
      if (island.STAGES[i].stage === stage) return island.STAGES[i];
    }
    return island.STAGES[0];
  }

  /**
   * 影響圖形的值的正規化（build 與 signature 共用同一份，避免兩者分歧，§7.32.15 P-1）。
   * 不認得的天氣 → cloudy、燈塔 → unbuilt、比例夾在 0～1、小船種類不合法時依比例推導、階段不合法 → sand。
   * @param {object} st IslandState
   * @returns {{src: object, weather: string, lighthouse: string, ratio: number, boat: string,
   *            stages: {green: string, brown: string, orange: string}}}
   */
  function normalize(st) {
    var src = st && typeof st === "object" ? st : {};
    var ratio = clampRatio(src.boatRatio);
    var stages = {};
    LAYOUT.islandOrder.forEach(function (id) { stages[id] = stageOfIsland(src, id); });
    return {
      src: src,
      weather: WEATHERS.indexOf(src.weather) >= 0 ? src.weather : "cloudy",
      lighthouse: LIGHTHOUSES.indexOf(src.lighthouse) >= 0 ? src.lighthouse : "unbuilt",
      ratio: ratio,
      boat: BOATS.indexOf(src.boat) >= 0 ? src.boat : ratio >= 1 ? "docked" : "sailing",
      stages: stages
    };
  }

  /**
   * 圖形簽章（§4.16、§7.32.15 P-1）：天氣、燈塔、小船種類、String(boatRatio)、綠／棕／橘三島階段。
   * 兩個 st 的簽章相同 ⇔ build 產生的 svg 子樹相同（外層 aria-label 不屬簽章）。
   * 純函式、不建 DOM、不取用其他模組。
   * @param {object} st IslandState
   * @returns {string}
   */
  function signature(st) {
    var g = normalize(st);
    var parts = [g.weather, g.lighthouse, g.boat, String(g.ratio)];
    LAYOUT.islandOrder.forEach(function (id) { parts.push(id + ":" + g.stages[id]); });
    return parts.join("|");
  }

  /** 是否帶有指定 class（SVG 以 class 屬性為準；無 classList 時的後備） */
  function hasClassName(node, name) {
    if (node.classList && typeof node.classList.contains === "function") return node.classList.contains(name);
    var raw = typeof node.getAttribute === "function" ? node.getAttribute("class") : "";
    return String(raw || "").split(/\s+/).indexOf(name) >= 0;
  }

  /** 在 root 的子孫中找第 1 個 svg.isl-map（深度優先；找不到 → null） */
  function findMapSvg(root) {
    if (typeof root.querySelector === "function") return root.querySelector("svg.isl-map");
    var kids = root.childNodes || [];
    for (var i = 0; i < kids.length; i++) {
      var n = kids[i];
      if (!n || n.nodeType !== 1) continue;
      if (String(n.tagName).toLowerCase() === "svg" && hasClassName(n, "isl-map")) return n;
      var hit = findMapSvg(n);
      if (hit) return hit;
    }
    return null;
  }

  /**
   * 同步地圖動畫 class（§4.16、§7.32.8「重播」）：figure 內的 svg.isl-map 依 play === true 加上或移除 isl-map--play。
   * figure 不是元素或找不到 svg.isl-map → 不做事、不拋例外；不建立或移除任何節點。
   * @param {Element} figure build 回傳的 div.db-map__figure
   * @param {boolean} play
   */
  function setPlay(figure, play) {
    if (!figure || typeof figure !== "object" || figure.nodeType !== 1) return;
    var svgEl = findMapSvg(figure);
    if (!svgEl) return;
    var on = play === true;
    if (svgEl.classList && typeof svgEl.classList.toggle === "function") {
      svgEl.classList.toggle("isl-map--play", on);
      return;
    }
    // 無 classList 時改寫 class 屬性（保留其他 class 的順序）
    var list = String(svgEl.getAttribute("class") || "").split(/\s+/).filter(function (c) {
      return c && c !== "isl-map--play";
    });
    if (on) list.push("isl-map--play");
    svgEl.setAttribute("class", list.join(" "));
  }

  /**
   * 建立群島地圖。
   * @param {object} st IslandState（core/island.js state() 的結果）
   * @param {{ play?: boolean }} [opts] play === true 才播放 4 種裝飾動畫
   * @returns {HTMLDivElement}
   */
  function build(st, opts) {
    var dom = core("dom");
    var island = core("island");
    var s = dom.svg;
    var g = normalize(st);
    var src = g.src;
    var weather = g.weather;
    var lhKind = g.lighthouse;
    var ratio = g.ratio;
    var boatKind = g.boat;

    var children = [s("rect", {
      class: "isl-sea",
      x: LAYOUT.sea.x,
      y: LAYOUT.sea.y,
      width: LAYOUT.sea.w,
      height: LAYOUT.sea.h,
      fill: COLOR.sea
    })];
    children = children.concat(waves(s));
    if (weather === "rainbow") children.push(rainbow(s));
    children.push(sun(s, weather));
    children = children.concat(clouds(s));
    LAYOUT.fog.forEach(function (f) { children.push(fogIsland(s, f)); });
    children.push(route(s));
    LAYOUT.islandOrder.forEach(function (id) {
      var stage = g.stages[id];
      children.push(openIsland(s, id, stage, stageDef(island, stage)));
    });
    children.push(lighthouse(s, lhKind));
    children.push(boat(s, ratio));
    children.push(labels(s, island, lhKind));

    var cls = "isl-map" + (opts && opts.play === true ? " isl-map--play" : "");
    var svgEl = s("svg", {
      class: cls,
      viewBox: "0 0 " + VIEWBOX.w + " " + VIEWBOX.h,
      "aria-hidden": "true",
      focusable: "false",
      "data-weather": weather,
      "data-lighthouse": lhKind,
      "data-boat": boatKind
    }, children);

    return dom.el("div", {
      className: "db-map__figure",
      attrs: { role: "img", "aria-label": island.mapAltText(src) }
    }, [svgEl]);
  }

  return {
    VIEWBOX: VIEWBOX,
    LAYOUT: LAYOUT,
    boatPoint: boatPoint,
    build: build,
    signature: signature,
    setPlay: setPlay
  };
});
