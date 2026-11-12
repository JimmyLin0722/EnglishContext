/*
 * island-map.test.js — 群島地圖 EMT.ui.islandMap、插圖 EMT.ui.islandArt、styles/11-island-map.css 單元測試（FE-107；signature、setPlay 為 FE-115）
 * 依據：architecture.md v0.19 §4.16、§7.32.4、§7.32.8、§7.32.10、§7.32.12、§10.15「island-map.test.js」列；
 *       契約 README §15.3 IS-8、§15.4 IS-11～IS-13、§15.6 IA-3、IA-4、IA-6、§15.7 IV-2、IV-5、VC-3
 * 涵蓋：AC-64-01、AC-64-02、AC-64-05～AC-64-07、AC-64-10、AC-65-03、AC-66-01、AC-67-02、AC-68-05、
 *       AC-70-01、AC-70-02、AC-71-01、AC-71-02、AC-71-04、AC-63-03、AC-63-04、AC-31-03
 * 做法：假 document（createElementNS／createElement／createTextNode），core/dom.js 以 setDocument 注入；
 *       外框以元素屬性計算（path 取控制點外框、加上描邊半寬與 1 單位餘量、動畫位移範圍），只允許 translate。
 * 期望文字在本檔以字面值寫出（不讀 docs/）。
 */
"use strict";

const { describe, test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const APP_DIR = path.join(__dirname, "..");
const D = require("../core/dom.js");
const island = require("../core/island.js");
const MAP = require("../ui/island-map.js");
const ART = require("../ui/island-art.js");

// ── 假 DOM ──

class FNode {
  constructor(doc, tag, ns) {
    this.ownerDocument = doc;
    this.tagName = tag;
    this.namespaceURI = ns || null;
    this.nodeType = tag === "#text" ? 3 : 1;
    this.childNodes = [];
    this.parentNode = null;
    this.attrs = {};
    this.listeners = {};
    this.className = "";
    this._text = "";
  }
  appendChild(n) {
    if (n.parentNode) n.parentNode.childNodes.splice(n.parentNode.childNodes.indexOf(n), 1);
    this.childNodes.push(n);
    n.parentNode = this;
    return n;
  }
  set textContent(t) {
    if (this.nodeType === 3) { this._text = String(t); return; }
    this.childNodes = [];
    if (String(t) !== "") this.appendChild(this.ownerDocument.createTextNode(String(t)));
  }
  get textContent() { return this.nodeType === 3 ? this._text : this.childNodes.map((c) => c.textContent).join(""); }
  get children() { return this.childNodes.filter((c) => c.nodeType === 1); }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  hasAttribute(k) { return k in this.attrs; }
  addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); }
  /** class 屬性（SVG）或 className（HTML）拆成陣列 */
  classes() { return (this.getAttribute("class") || this.className || "").split(/\s+/).filter(Boolean); }
  hasClass(c) { return this.classes().includes(c); }
}

function makeDoc() {
  const doc = {
    createElement(tag) { return new FNode(doc, tag, "http://www.w3.org/1999/xhtml"); },
    createElementNS(ns, tag) { return new FNode(doc, tag, ns); },
    createTextNode(t) { const n = new FNode(doc, "#text"); n._text = String(t); return n; }
  };
  return doc;
}

/** 走訪全部元素節點 */
function walk(node, out = []) {
  if (node.nodeType === 1) out.push(node);
  for (const c of node.childNodes) walk(c, out);
  return out;
}
const byClass = (root, c) => walk(root).filter((n) => n.hasClass(c));
const ancestors = (n) => { const a = []; for (let p = n.parentNode; p; p = p.parentNode) a.push(p); return a; };

// ── 測試資料 ──

const STAGES = ["sand", "sprout", "palm", "bloom", "hut", "complete"];
const COUNTS = {
  sand: { sprouts: 0, palms: 0, flowers: 0, huts: 0, flags: 0 },
  sprout: { sprouts: 1, palms: 0, flowers: 0, huts: 0, flags: 0 },
  palm: { sprouts: 0, palms: 1, flowers: 0, huts: 0, flags: 0 },
  bloom: { sprouts: 0, palms: 2, flowers: 2, huts: 0, flags: 0 },
  hut: { sprouts: 0, palms: 2, flowers: 2, huts: 1, flags: 0 },
  complete: { sprouts: 0, palms: 3, flowers: 2, huts: 1, flags: 1 }
};
const P_OF = { sand: 0, sprout: 1, palm: 25, bloom: 50, hut: 75, complete: 100 };

/** 組一份 IslandState（欄位同 core/island.js state() 的輸出） */
function makeState(o = {}) {
  const st = o.stages || {};
  const isl = (id) => {
    const stage = st[id] || "sand";
    return { island: id, n: 1000, m: 0, p: P_OF[stage], stage, outOfGoal: false };
  };
  const ratio = o.boatRatio === undefined ? 0 : o.boatRatio;
  return {
    islands: [isl("orange"), isl("brown"), isl("green")],
    streakDays: o.streakDays === undefined ? 0 : o.streakDays,
    weather: o.weather || "cloudy",
    k: o.k === undefined ? 0 : o.k,
    q: 200,
    lighthouse: o.lighthouse || "unbuilt",
    x: o.x === undefined ? 0 : o.x,
    d: o.d === undefined ? 10 : o.d,
    boatRatio: ratio,
    boat: o.boat || (ratio >= 1 ? "docked" : "sailing"),
    remaining: 0
  };
}

function buildMap(st, opts) {
  const fig = MAP.build(st, opts);
  const svg = fig.children[0];
  return { fig, svg };
}

// ── 外框計算 ──

/** 解析 translate(x y)；其他 transform 一律視為不支援 */
function parseTranslate(t) {
  const m = /^translate\(\s*(-?[\d.]+)[\s,]+(-?[\d.]+)\s*\)$/.exec(t);
  assert.ok(m, "只允許 translate(x y)：" + t);
  return [Number(m[1]), Number(m[2])];
}

/** path 的控制點外框（只支援 M L H V C Q Z，大小寫皆可；控制點凸包必包住曲線） */
function pathBox(d) {
  const toks = d.match(/[A-Za-z]|-?\d*\.?\d+(?:e-?\d+)?/g);
  let i = 0;
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;
  let cmd = null;
  const xs = [];
  const ys = [];
  const isCmd = (t) => /^[A-Za-z]$/.test(t);
  const n = () => Number(toks[i++]);
  const add = (x, y) => { xs.push(x); ys.push(y); };
  while (i < toks.length) {
    if (isCmd(toks[i])) cmd = toks[i++];
    assert.ok(/^[MmLlHhVvCcQqZz]$/.test(cmd), "不支援的 path 指令：" + cmd);
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    if (C === "Z") { cx = sx; cy = sy; continue; }
    const ox = rel ? cx : 0;
    const oy = rel ? cy : 0;
    if (C === "M" || C === "L") {
      cx = ox + n(); cy = oy + n(); add(cx, cy);
      if (C === "M") { sx = cx; sy = cy; cmd = rel ? "l" : "L"; }
    } else if (C === "H") {
      cx = ox + n(); add(cx, cy);
    } else if (C === "V") {
      cy = oy + n(); add(cx, cy);
    } else if (C === "C" || C === "Q") {
      const k = C === "C" ? 3 : 2;
      let px = 0;
      let py = 0;
      for (let j = 0; j < k; j++) { px = ox + n(); py = oy + n(); add(px, py); }
      cx = px; cy = py;
    }
  }
  return { x1: Math.min(...xs), y1: Math.min(...ys), x2: Math.max(...xs), y2: Math.max(...ys) };
}

/** 屬性沿祖先繼承 */
function inherited(node, name) {
  for (let p = node; p; p = p.parentNode) {
    if (p.nodeType === 1 && p.hasAttribute(name)) return p.getAttribute(name);
  }
  return null;
}

/** 單一圖形元素的絕對外框（含描邊、動畫位移範圍；pad 為額外餘量） */
function absBox(node, pad) {
  const a = (k) => Number(node.getAttribute(k));
  let b;
  switch (node.tagName) {
    case "rect": b = { x1: a("x"), y1: a("y"), x2: a("x") + a("width"), y2: a("y") + a("height") }; break;
    case "circle": b = { x1: a("cx") - a("r"), y1: a("cy") - a("r"), x2: a("cx") + a("r"), y2: a("cy") + a("r") }; break;
    case "ellipse": b = { x1: a("cx") - a("rx"), y1: a("cy") - a("ry"), x2: a("cx") + a("rx"), y2: a("cy") + a("ry") }; break;
    case "line": b = { x1: Math.min(a("x1"), a("x2")), y1: Math.min(a("y1"), a("y2")), x2: Math.max(a("x1"), a("x2")), y2: Math.max(a("y1"), a("y2")) }; break;
    case "path": b = pathBox(node.getAttribute("d")); break;
    default: throw new Error("非圖形元素：" + node.tagName);
  }
  let tx = 0;
  let ty = 0;
  for (const p of [node].concat(ancestors(node))) {
    if (p.nodeType !== 1) continue;
    const t = p.getAttribute("transform");
    if (t) { const [x, y] = parseTranslate(t); tx += x; ty += y; }
  }
  b = { x1: b.x1 + tx, y1: b.y1 + ty, x2: b.x2 + tx, y2: b.y2 + ty };
  const stroke = inherited(node, "stroke");
  const sw = stroke && stroke !== "none" ? Number(inherited(node, "stroke-width") || 1) : 0;
  const e = sw / 2 + pad;
  b = { x1: b.x1 - e, y1: b.y1 - e, x2: b.x2 + e, y2: b.y2 + e };
  const anc = ancestors(node);
  if (anc.some((p) => p.nodeType === 1 && (p.hasClass("isl-anim-wave") || p.hasClass("isl-anim-boat")))) b.y1 -= 2.5;
  if (anc.some((p) => p.nodeType === 1 && p.hasClass("isl-anim-cloud"))) b.x1 -= 8;
  if (anc.some((p) => p.nodeType === 1 && p.hasClass("isl-anim-sway"))) { b.x1 -= 2; b.x2 += 2; b.y1 -= 2; b.y2 += 2; }
  b.node = node;
  return b;
}

const intersects = (a, b) => a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2;
const GRAPHIC = new Set(["path", "ellipse", "rect", "circle", "line"]);

/** 文字層以外的所有圖形外框（不含海面） */
function graphicBoxes(svg) {
  const labels = byClass(svg, "isl-labels")[0];
  return walk(svg)
    .filter((n) => GRAPHIC.has(n.tagName) && !n.hasClass("isl-sea") && !ancestors(n).includes(labels))
    .map((n) => absBox(n, 1));
}

/** 文字層的白底牌外框（含描邊半寬） */
function plateBoxes(svg) {
  const labels = byClass(svg, "isl-labels")[0];
  return labels.children.map((g) => {
    const rect = g.children.find((c) => c.tagName === "rect");
    const b = absBox(rect, 0);
    b.key = g.getAttribute("data-label");
    return b;
  });
}

// ── 測試 ──

before(() => D.setDocument(makeDoc()));
after(() => D.setDocument(null));

describe("islandMap：結構與屬性（§4.16、§7.32.4、IA-3、AC-71-01、AC-71-02）", () => {
  test("VIEWBOX、LAYOUT 凍結；VIEWBOX = 354 × 430", () => {
    assert.deepEqual({ ...MAP.VIEWBOX }, { w: 354, h: 430 });
    assert.ok(Object.isFrozen(MAP.VIEWBOX));
    assert.ok(Object.isFrozen(MAP.LAYOUT));
    assert.ok(Object.isFrozen(MAP.LAYOUT.labels.green));
    assert.ok(Object.isFrozen(MAP.LAYOUT.waves));
  });

  test("回傳 div.db-map__figure[role=img] > 1 個 svg.isl-map（viewBox、aria-hidden、focusable）", () => {
    const { fig, svg } = buildMap(makeState());
    assert.equal(fig.tagName, "div");
    assert.equal(fig.className, "db-map__figure");
    assert.equal(fig.getAttribute("role"), "img");
    assert.equal(fig.children.length, 1);
    assert.equal(svg.tagName, "svg");
    assert.equal(svg.namespaceURI, "http://www.w3.org/2000/svg");
    assert.ok(svg.hasClass("isl-map"));
    assert.equal(svg.getAttribute("viewBox"), "0 0 354 430");
    assert.equal(svg.getAttribute("aria-hidden"), "true");
    assert.equal(svg.getAttribute("focusable"), "false");
    assert.equal(svg.hasAttribute("xmlns"), false);
  });

  test("aria-label = island.mapAltText(st)；AC-71-01 範例逐字", () => {
    const st = makeState({
      stages: { orange: "palm", brown: "sprout", green: "sand" },
      streakDays: 3, weather: "sunny", k: 48, lighthouse: "built", x: 4, d: 15, boatRatio: 4 / 15, boat: "sailing"
    });
    st.islands[0].p = 25;
    st.islands[1].p = 1;
    st.islands[2].p = 0;
    const { fig } = buildMap(st);
    assert.equal(fig.getAttribute("aria-label"), island.mapAltText(st));
    assert.equal(
      fig.getAttribute("aria-label"),
      "群島地圖：橘島掌握 25%，一棵椰子樹；棕島掌握 1%，新芽；綠島掌握 0%，沙灘；藍島、金島尚未開放；連續打卡 3 天，晴天；模擬測驗已答對 48 題，燈塔蓋好；今日小船 4 / 15 字，航行中"
    );
  });

  test("P 為 null 的島：文字替代為「{島名}掌握 —，沙灘」", () => {
    const st = makeState();
    st.islands[2].p = null;
    const { fig } = buildMap(st);
    assert.match(fig.getAttribute("aria-label"), /綠島掌握 —，沙灘/);
  });

  test("繪製順序：海面 → 海浪 → 彩虹 → 太陽 → 雲 → 霧中島 → 航線 → 綠 → 棕 → 橘 → 燈塔 → 小船 → 文字層（最後）", () => {
    const { svg } = buildMap(makeState({ weather: "rainbow", streakDays: 7 }));
    const seq = svg.children.map((c) => {
      for (const k of ["isl-sea", "isl-wave", "isl-rainbow", "isl-sun", "isl-cloud", "isl-fog", "isl-route", "isl-island", "isl-lighthouse", "isl-boat", "isl-labels"]) {
        if (c.hasClass(k)) return k === "isl-island" || k === "isl-fog" ? k + ":" + c.getAttribute("data-island") : k;
      }
      return "?" + c.tagName;
    });
    assert.deepEqual(seq, [
      "isl-sea", "isl-wave", "isl-wave", "isl-wave", "isl-wave", "isl-wave", "isl-rainbow", "isl-sun", "isl-cloud", "isl-cloud",
      "isl-fog:blue", "isl-fog:gold", "isl-route", "isl-island:green", "isl-island:brown", "isl-island:orange",
      "isl-lighthouse", "isl-boat", "isl-labels"
    ]);
    assert.equal(svg.children[svg.children.length - 1].hasClass("isl-labels"), true);
  });

  test("只使用 svg／g／path／ellipse／rect／circle／line／text；無 use、image、foreignObject、symbol、href、xlink:href、tabindex、url(", () => {
    const allowed = new Set(["svg", "g", "path", "ellipse", "rect", "circle", "line", "text"]);
    for (const lh of ["unbuilt", "built", "lit"]) {
      for (const w of ["cloudy", "sunny", "rainbow"]) {
        const { fig } = buildMap(makeState({ weather: w, lighthouse: lh, stages: { orange: "complete", brown: "hut", green: "bloom" } }), { play: true });
        for (const n of walk(fig)) {
          if (n === fig) continue;
          assert.ok(allowed.has(n.tagName), "不允許的元素：" + n.tagName);
          for (const [k, v] of Object.entries(n.attrs)) {
            assert.ok(!["href", "xlink:href", "tabindex", "src", "style"].includes(k.toLowerCase()), "不允許的屬性：" + k);
            assert.ok(!/^on/i.test(k), "不允許事件屬性：" + k);
            assert.doesNotMatch(v, /url\(/i, k);
          }
        }
        assert.equal(fig.hasAttribute("tabindex"), false);
        assert.equal(Object.keys(fig.listeners).length, 0, "地圖不得有事件（AC-64-10）");
      }
    }
  });

  test("任何 fill／stroke 都不是 #f7893b（不分大小寫），也不用 var(--accent)、var(--brand)（VC-3、AC-68-05）", () => {
    for (const lh of ["unbuilt", "built", "lit"]) {
      const { fig } = buildMap(makeState({ weather: "rainbow", lighthouse: lh, stages: { orange: "complete", brown: "complete", green: "complete" } }));
      for (const n of walk(fig)) {
        for (const v of Object.values(n.attrs)) {
          assert.doesNotMatch(v, /f7893b/i);
          assert.doesNotMatch(v, /var\(--(accent|brand)\)/);
        }
      }
    }
  });

  test("opts.play === true 才有 isl-map--play；其他值沒有", () => {
    assert.ok(buildMap(makeState(), { play: true }).svg.hasClass("isl-map--play"));
    for (const o of [undefined, null, {}, { play: false }, { play: 1 }, { play: "true" }]) {
      assert.equal(buildMap(makeState(), o).svg.hasClass("isl-map--play"), false, JSON.stringify(o));
    }
  });

  test("每次呼叫建立新節點", () => {
    const st = makeState();
    const a = MAP.build(st);
    const b = MAP.build(st);
    assert.notEqual(a, b);
    assert.notEqual(a.children[0], b.children[0]);
  });

  test("帶 isl-anim-* class 的元素沒有 transform 屬性；其父層 g 以 transform 定位（T-141）", () => {
    const { svg } = buildMap(makeState({ stages: { orange: "complete", brown: "complete", green: "complete" } }), { play: true });
    const anims = walk(svg).filter((n) => n.classes().some((c) => c.indexOf("isl-anim-") === 0));
    const kinds = new Set(anims.map((n) => n.classes().find((c) => c.indexOf("isl-anim-") === 0)));
    assert.deepEqual([...kinds].sort(), ["isl-anim-boat", "isl-anim-cloud", "isl-anim-sway", "isl-anim-wave"]);
    assert.equal(byClass(svg, "isl-anim-wave").length, 5);
    assert.equal(byClass(svg, "isl-anim-cloud").length, 2);
    assert.equal(byClass(svg, "isl-anim-boat").length, 1);
    assert.equal(byClass(svg, "isl-anim-sway").length, 9);
    for (const n of anims) {
      assert.equal(n.hasAttribute("transform"), false, n.classes().join(" "));
      assert.equal(n.tagName, "g");
      assert.ok(n.parentNode.hasAttribute("transform"), "外層需定位：" + n.parentNode.classes().join(" "));
    }
  });

  test("不合法或缺漏的 st 不拋例外（預設陰天、待建、起點、沙灘）", () => {
    for (const st of [undefined, null, {}, { islands: "x", weather: "storm", lighthouse: 3, boatRatio: NaN }]) {
      const { fig, svg } = buildMap(st);
      assert.equal(svg.getAttribute("data-weather"), "cloudy");
      assert.equal(svg.getAttribute("data-lighthouse"), "unbuilt");
      assert.equal(svg.getAttribute("data-boat"), "sailing");
      assert.equal(byClass(svg, "isl-boat")[0].getAttribute("data-ratio"), "0");
      for (const g of byClass(svg, "isl-island")) assert.equal(g.getAttribute("data-stage"), "sand");
      assert.equal(typeof fig.getAttribute("aria-label"), "string");
    }
  });
});

describe("islandMap：島嶼元素計數（IS-8、AC-64-02、AC-65-03）", () => {
  for (const id of ["orange", "brown", "green"]) {
    for (const stage of STAGES) {
      test(`${id} × ${stage}：植物個數逐一等於階段表`, () => {
        const stages = { orange: "sand", brown: "sand", green: "sand" };
        stages[id] = stage;
        const { svg } = buildMap(makeState({ stages }));
        const g = byClass(svg, "isl-island").find((n) => n.getAttribute("data-island") === id);
        assert.ok(g);
        assert.equal(g.getAttribute("data-stage"), stage);
        const c = COUNTS[stage];
        assert.equal(byClass(g, "isl-sprout").length, c.sprouts, "新芽");
        assert.equal(byClass(g, "isl-palm").length, c.palms, "椰子樹");
        assert.equal(byClass(g, "isl-flower").length, c.flowers, "花");
        assert.equal(byClass(g, "isl-hut").length, c.huts, "小屋");
        assert.equal(byClass(g, "isl-flag").length, c.flags, "旗子");
        // 其他兩島為沙灘：無任何植物
        for (const other of byClass(svg, "isl-island").filter((n) => n !== g)) {
          for (const k of ["isl-sprout", "isl-palm", "isl-flower", "isl-hut", "isl-flag"]) {
            assert.equal(byClass(other, k).length, 0);
          }
        }
        // 不以 opacity 0 隱藏
        for (const n of walk(g)) assert.notEqual(n.getAttribute("opacity"), "0");
      });
    }
  }

  test("碼頭只在橘島（rect.isl-dock 恰 1 個）", () => {
    const { svg } = buildMap(makeState());
    const docks = byClass(svg, "isl-dock");
    assert.equal(docks.length, 1);
    assert.equal(docks[0].tagName, "rect");
    assert.ok(ancestors(docks[0]).some((p) => p.nodeType === 1 && p.getAttribute("data-island") === "orange"));
  });

  test("霧中島 2 座：藍、金；虛線外框、opacity 0.75、無植物", () => {
    const { svg } = buildMap(makeState({ stages: { orange: "complete", brown: "complete", green: "complete" } }));
    const fogs = byClass(svg, "isl-fog");
    assert.deepEqual(fogs.map((n) => n.getAttribute("data-island")), ["blue", "gold"]);
    for (const f of fogs) {
      assert.equal(f.getAttribute("opacity"), "0.75");
      const shapes = walk(f).filter((n) => n !== f);
      assert.ok(shapes.length >= 1);
      assert.ok(shapes.some((n) => n.getAttribute("stroke-dasharray") === "4 4"));
      for (const k of ["isl-sprout", "isl-palm", "isl-flower", "isl-hut", "isl-flag"]) assert.equal(byClass(f, k).length, 0);
    }
  });
});

describe("islandMap：天氣、燈塔、小船（IS-11～IS-13、AC-64-05～AC-64-07、AC-67-02）", () => {
  test("cloudy：太陽 opacity ≤ 0.4、有雲、無彩虹", () => {
    const { svg } = buildMap(makeState({ weather: "cloudy" }));
    assert.equal(svg.getAttribute("data-weather"), "cloudy");
    const sun = byClass(svg, "isl-sun");
    assert.equal(sun.length, 1);
    assert.ok(Number(sun[0].getAttribute("opacity")) <= 0.4);
    assert.equal(byClass(svg, "isl-cloud").length, 2);
    assert.equal(byClass(svg, "isl-rainbow").length, 0);
  });

  test("sunny：太陽不淡化、有雲、無彩虹", () => {
    const { svg } = buildMap(makeState({ weather: "sunny", streakDays: 3 }));
    assert.equal(svg.getAttribute("data-weather"), "sunny");
    const sun = byClass(svg, "isl-sun")[0];
    assert.ok(!sun.hasAttribute("opacity") || Number(sun.getAttribute("opacity")) === 1);
    assert.equal(byClass(svg, "isl-cloud").length, 2);
    assert.equal(byClass(svg, "isl-rainbow").length, 0);
  });

  test("rainbow：太陽、雲、彩虹（4 條弧）", () => {
    const { svg } = buildMap(makeState({ weather: "rainbow", streakDays: 7 }));
    assert.equal(svg.getAttribute("data-weather"), "rainbow");
    const sun = byClass(svg, "isl-sun")[0];
    assert.ok(!sun.hasAttribute("opacity"));
    assert.equal(byClass(svg, "isl-cloud").length, 2);
    const rb = byClass(svg, "isl-rainbow");
    assert.equal(rb.length, 1);
    assert.equal(rb[0].children.filter((c) => c.tagName === "path").length, 4);
  });

  test("燈塔 unbuilt：只有石塊與「待建」牌，無塔、無光束", () => {
    const { svg } = buildMap(makeState({ lighthouse: "unbuilt" }));
    assert.equal(svg.getAttribute("data-lighthouse"), "unbuilt");
    const lh = byClass(svg, "isl-lighthouse");
    assert.equal(lh.length, 1);
    assert.equal(lh[0].getAttribute("data-state"), "unbuilt");
    assert.equal(byClass(lh[0], "isl-lh-rocks").length, 1);
    assert.equal(byClass(svg, "isl-lh-tower").length, 0);
    assert.equal(byClass(svg, "isl-lh-beam").length, 0);
    const sign = byClass(svg, "isl-labels")[0].children.filter((g) => g.getAttribute("data-label") === "sign");
    assert.equal(sign.length, 1);
    assert.equal(sign[0].textContent, "待建");
  });

  test("燈塔 built：有塔、無光束、無待建牌", () => {
    const { svg } = buildMap(makeState({ lighthouse: "built", k: 1 }));
    assert.equal(byClass(svg, "isl-lighthouse")[0].getAttribute("data-state"), "built");
    assert.equal(byClass(svg, "isl-lh-tower").length, 1);
    assert.equal(byClass(svg, "isl-lh-beam").length, 0);
    assert.equal(byClass(svg, "isl-lh-rocks").length, 0);
    assert.equal(byClass(svg, "isl-labels")[0].children.some((g) => g.getAttribute("data-label") === "sign"), false);
  });

  test("燈塔 lit：塔與光束、無待建牌", () => {
    const { svg } = buildMap(makeState({ lighthouse: "lit", k: 50 }));
    assert.equal(byClass(svg, "isl-lighthouse")[0].getAttribute("data-state"), "lit");
    assert.equal(byClass(svg, "isl-lh-tower").length, 1);
    assert.equal(byClass(svg, "isl-lh-beam").length, 1);
    assert.equal(byClass(svg, "isl-lh-rocks").length, 0);
    assert.equal(byClass(svg, "isl-labels")[0].children.some((g) => g.getAttribute("data-label") === "sign"), false);
  });

  test("boatPoint 線性：r = 0 在起點 S、r = 1 在碼頭 E，其餘為線性內插；超出範圍夾在 0～1", () => {
    const S = MAP.LAYOUT.route.S;
    const E = MAP.LAYOUT.route.E;
    assert.deepEqual(MAP.boatPoint(0), { x: S.x, y: S.y });
    assert.deepEqual(MAP.boatPoint(1), { x: E.x, y: E.y });
    for (const r of [0.1, 0.25, 0.5, 0.9]) {
      const p = MAP.boatPoint(r);
      assert.ok(Math.abs(p.x - (S.x + (E.x - S.x) * r)) < 1e-9);
      assert.ok(Math.abs(p.y - (S.y + (E.y - S.y) * r)) < 1e-9);
    }
    assert.deepEqual(MAP.boatPoint(1.5), MAP.boatPoint(1));
    assert.deepEqual(MAP.boatPoint(-1), MAP.boatPoint(0));
    assert.deepEqual(MAP.boatPoint(NaN), MAP.boatPoint(0));
  });

  test("AC-64-07：D = 10、X 0／5／9／10／15 → 小船位於航線 r 比例處（誤差 ≤ 航線長度 2%），10 與 15 位置相同", () => {
    const { svg: s0 } = buildMap(makeState());
    const line = byClass(s0, "isl-route")[0];
    const S = { x: Number(line.getAttribute("x1")), y: Number(line.getAttribute("y1")) };
    const E = { x: Number(line.getAttribute("x2")), y: Number(line.getAttribute("y2")) };
    assert.deepEqual(S, { ...MAP.LAYOUT.route.S });
    assert.deepEqual(E, { ...MAP.LAYOUT.route.E });
    const len = Math.hypot(E.x - S.x, E.y - S.y);
    const pos = {};
    for (const x of [0, 5, 9, 10, 15]) {
      const b = island.boatOf(x, 10);
      const { svg } = buildMap(makeState({ x, d: 10, boatRatio: b.boatRatio, boat: b.boat }));
      assert.equal(svg.getAttribute("data-boat"), b.boat);
      const g = byClass(svg, "isl-boat")[0];
      assert.equal(g.getAttribute("data-ratio"), String(b.boatRatio));
      const [bx, by] = parseTranslate(g.getAttribute("transform"));
      const ex = S.x + (E.x - S.x) * b.boatRatio;
      const ey = S.y + (E.y - S.y) * b.boatRatio;
      assert.ok(Math.hypot(bx - ex, by - ey) <= len * 0.02, `X=${x}`);
      pos[x] = [bx, by];
    }
    assert.deepEqual(pos[0], [S.x, S.y]);
    assert.deepEqual(pos[10], pos[15]);
    assert.equal(buildMap(makeState({ boatRatio: 1, boat: "docked" })).svg.getAttribute("data-boat"), "docked");
  });
});

describe("islandMap：文字層（IA-3、AC-64-01、AC-71-04）", () => {
  test("文字逐字、font-size ≥ 14、font-weight 700、fill #3d3550、text-anchor middle、位於白底牌中央", () => {
    for (const lh of ["unbuilt", "built", "lit"]) {
      const { svg } = buildMap(makeState({ lighthouse: lh }));
      const labels = byClass(svg, "isl-labels")[0];
      const texts = walk(labels).filter((n) => n.tagName === "text");
      const expected = ["藍島・霧中", "金島・霧中", "綠島", "棕島", "橘島", "測驗燈塔"].concat(lh === "unbuilt" ? ["待建"] : []);
      assert.deepEqual(texts.map((t) => t.textContent), expected);
      // 「・」為 U+30FB
      assert.equal(texts[0].textContent.charCodeAt(2), 0x30fb);
      for (const t of texts) {
        assert.ok(Number(t.getAttribute("font-size")) >= 14);
        assert.equal(t.getAttribute("font-weight"), "700");
        assert.equal(t.getAttribute("fill").toLowerCase(), "#3d3550");
        assert.equal(t.getAttribute("text-anchor"), "middle");
        assert.equal(t.hasAttribute("opacity"), false);
        const g = t.parentNode;
        const rect = g.children.find((c) => c.tagName === "rect");
        assert.ok(rect, "每段文字下方需有白底牌");
        assert.ok(g.children.indexOf(rect) < g.children.indexOf(t), "牌在文字下方");
        assert.equal(rect.getAttribute("fill").toLowerCase(), "#ffffff");
        assert.equal(rect.getAttribute("stroke").toLowerCase(), "#3d3550");
        const x = Number(rect.getAttribute("x"));
        const y = Number(rect.getAttribute("y"));
        const w = Number(rect.getAttribute("width"));
        const h = Number(rect.getAttribute("height"));
        assert.ok(Math.abs(Number(t.getAttribute("x")) - (x + w / 2)) < 1e-9);
        const ty = Number(t.getAttribute("y"));
        assert.ok(ty > y + h / 2 && ty < y + h, "基線在牌內");
        // 牌寬足以容納文字（每字 14 單位）
        assert.ok(w >= t.textContent.length * 14 + 8, t.textContent);
        // 牌位置與 LAYOUT 一致
        const L = MAP.LAYOUT.labels[g.getAttribute("data-label")];
        assert.deepEqual([x + w / 2, y + h / 2, w, h], [L.cx, L.cy, L.w, L.h]);
        // 牌在 viewBox 內
        assert.ok(x >= 0 && y >= 0 && x + w <= 354 && y + h <= 430);
      }
      // 文字層與其祖先沒有 opacity（霧化不影響文字對比）
      for (const p of [labels].concat(ancestors(labels))) assert.equal(p.nodeType === 1 && p.hasAttribute("opacity"), false);
    }
  });

  test("文字牌外框與其他圖形外框不相交（各天氣 × 燈塔 × 階段，小船 r = 0～1 掃過範圍、雲的漂移範圍），牌與牌也不相交", () => {
    const ratios = [];
    for (let i = 0; i <= 20; i++) ratios.push(i / 20);
    const combos = [];
    for (const weather of ["cloudy", "sunny", "rainbow"]) {
      for (const lighthouse of ["unbuilt", "built", "lit"]) {
        for (const stage of STAGES) combos.push({ weather, lighthouse, stage });
      }
    }
    let checked = 0;
    for (const c of combos) {
      const rs = c.stage === "complete" ? ratios : [0, 1];
      for (const r of rs) {
        const { svg } = buildMap(makeState({ weather: c.weather, lighthouse: c.lighthouse, boatRatio: r, stages: { orange: c.stage, brown: c.stage, green: c.stage } }));
        const plates = plateBoxes(svg);
        const shapes = graphicBoxes(svg);
        for (const p of plates) {
          for (const g of shapes) {
            assert.equal(intersects(p, g), false,
              `${JSON.stringify(c)} r=${r}：牌 ${p.key} 與 ${g.node.tagName}.${ancestors(g.node).map((a) => a.classes && a.classes().join(".")).filter(Boolean).join("<")} 相交`);
            checked++;
          }
        }
        for (let i = 0; i < plates.length; i++) {
          for (let j = i + 1; j < plates.length; j++) assert.equal(intersects(plates[i], plates[j]), false, plates[i].key + "／" + plates[j].key);
        }
      }
    }
    assert.ok(checked > 1000);
  });

  test("圖形都在 viewBox 內（含描邊）", () => {
    const { svg } = buildMap(makeState({ weather: "rainbow", lighthouse: "lit", stages: { orange: "complete", brown: "complete", green: "complete" } }));
    for (const b of graphicBoxes(svg).map((x) => absBox(x.node, 0))) {
      assert.ok(b.x1 >= -1 && b.y1 >= -1 && b.x2 <= 355 && b.y2 <= 431, `${b.node.tagName} ${b.x1},${b.y1},${b.x2},${b.y2}`);
    }
  });
});

describe("islandMap、islandArt：原始碼掃描（IV-5、VC-3、§7.32.12）", () => {
  for (const rel of ["ui/island-map.js", "ui/island-art.js", "styles/11-island-map.css"]) {
    test(`${rel}：不含 f7893b、<use、<image、<foreignObject、<symbol、xlink、url(、tabindex、innerHTML、var(--accent)、var(--brand)`, () => {
      const src = fs.readFileSync(path.join(APP_DIR, rel), "utf8");
      assert.doesNotMatch(src, /f7893b/i);
      assert.doesNotMatch(src, /<(use|image|foreignObject|symbol)\b/i);
      assert.doesNotMatch(src, /xlink|url\(|tabindex|innerHTML|insertAdjacentHTML|outerHTML/i);
      assert.doesNotMatch(src, /var\(--(accent|brand)\)/);
      assert.doesNotMatch(src, /requestAnimationFrame|setTimeout|setInterval|\.animate\(/);
    });
  }

  test("LD-1：vm 沙箱載入時不讀其他模組；呼叫時缺 core 模組 → 含模組名稱的 Error", () => {
    for (const [rel, key] of [["ui/island-map.js", "islandMap"], ["ui/island-art.js", "islandArt"]]) {
      const sandbox = { console };
      sandbox.self = sandbox;
      vm.createContext(sandbox);
      vm.runInContext(fs.readFileSync(path.join(APP_DIR, rel), "utf8"), sandbox, { filename: rel });
      const api = sandbox.EMT.ui[key];
      assert.equal(typeof api, "object");
      assert.equal(sandbox.EMT.core, undefined, "載入時不得建立或讀取 EMT.core");
      const call = key === "islandMap" ? () => api.build({}) : () => api.turtle();
      assert.throws(call, /EMT\.core\.dom/);
    }
  });

  test("瀏覽器形態：沙箱依序載入 core/dom.js、core/island.js 與兩個模組後可建立地圖與插圖", () => {
    const doc = makeDoc();
    const sandbox = { console, document: doc };
    sandbox.self = sandbox;
    vm.createContext(sandbox);
    for (const rel of ["core/dom.js", "core/island.js", "ui/island-map.js", "ui/island-art.js"]) {
      vm.runInContext(fs.readFileSync(path.join(APP_DIR, rel), "utf8"), sandbox, { filename: rel });
    }
    const fig = sandbox.EMT.ui.islandMap.build(makeState({ weather: "sunny" }), { play: true });
    assert.equal(fig.getAttribute("role"), "img");
    assert.ok(fig.children[0].hasClass("isl-map--play"));
    const t = sandbox.EMT.ui.islandArt.turtle();
    assert.equal(t.getAttribute("aria-hidden"), "true");
  });
});

describe("islandArt：4 種插圖（§4.16、AC-66-01、AC-71-02、AC-68-05）", () => {
  const SPEC = { turtle: [72, 64], titleDeco: [28, 28], cardDeco: [40, 24], sprout: [24, 24] };
  for (const [fn, [w, h]] of Object.entries(SPEC)) {
    test(`${fn}()：新的 svg、aria-hidden、focusable=false、viewBox 0 0 ${w} ${h}、width／height 固定、無 text／use／image／href／tabindex／#f7893b`, () => {
      const a = ART[fn]();
      const b = ART[fn]();
      assert.notEqual(a, b);
      assert.equal(a.tagName, "svg");
      assert.equal(a.namespaceURI, "http://www.w3.org/2000/svg");
      assert.equal(a.getAttribute("aria-hidden"), "true");
      assert.equal(a.getAttribute("focusable"), "false");
      assert.equal(a.getAttribute("viewBox"), `0 0 ${w} ${h}`);
      assert.equal(a.getAttribute("width"), String(w));
      assert.equal(a.getAttribute("height"), String(h));
      assert.ok(a.hasClass("isl-art"));
      const allowed = new Set(["svg", "g", "path", "ellipse", "rect", "circle", "line"]);
      const nodes = walk(a);
      assert.ok(nodes.length > 3);
      for (const n of nodes) {
        assert.ok(allowed.has(n.tagName), "不允許的元素：" + n.tagName);
        for (const [k, v] of Object.entries(n.attrs)) {
          assert.ok(!["href", "xlink:href", "tabindex", "role", "aria-label"].includes(k), k);
          assert.doesNotMatch(v, /f7893b|url\(|var\(--(accent|brand)\)/i);
        }
      }
      assert.equal(a.textContent, "", "不得含文字");
      // 圖形在 viewBox 內
      for (const n of nodes.filter((x) => GRAPHIC.has(x.tagName))) {
        const bx = absBox(n, 0);
        assert.ok(bx.x1 >= -0.5 && bx.y1 >= -0.5 && bx.x2 <= w + 0.5 && bx.y2 <= h + 0.5, `${fn} ${n.tagName} ${bx.x1},${bx.y1},${bx.x2},${bx.y2}`);
      }
    });
  }

  test("選用 className 加在固定 class 之後（例：db-host__turtle）", () => {
    const t = ART.turtle("db-host__turtle");
    assert.deepEqual(t.classes(), ["isl-art", "isl-art--turtle", "db-host__turtle"]);
    assert.deepEqual(ART.sprout().classes(), ["isl-art", "isl-art--sprout"]);
  });
});

describe("11-island-map.css：尺寸、動畫與減少動態（§7.32.8、AC-70-01、AC-70-02、AC-31-03、AC-63-03）", () => {
  const css = fs.readFileSync(path.join(APP_DIR, "styles", "11-island-map.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

  /** 解析成 { at, selector, body } 清單；@media 與 @keyframes 內的區塊帶 at（一層巢狀） */
  function parse(text) {
    const out = [];
    let i = 0;
    function block(at) {
      while (i < text.length) {
        const open = text.indexOf("{", i);
        const close = text.indexOf("}", i);
        if (close >= 0 && (open < 0 || close < open)) { i = close + 1; return; }
        if (open < 0) { i = text.length; return; }
        const head = text.slice(i, open).trim();
        i = open + 1;
        if (head.startsWith("@")) {
          block(head);
        } else {
          const end = text.indexOf("}", i);
          out.push({ at, selector: head, body: text.slice(i, end).trim() });
          i = end + 1;
        }
      }
    }
    block(null);
    return out;
  }
  const rules = parse(css);
  const decls = (body) => body.split(";").map((d) => d.trim()).filter(Boolean).map((d) => {
    const k = d.indexOf(":");
    return [d.slice(0, k).trim(), d.slice(k + 1).trim()];
  });

  test(".db-map__figure 與 .isl-map：display block、width 100%、height auto、aspect-ratio 354 / 430、cursor default", () => {
    const fig = rules.find((r) => !r.at && r.selector === ".db-map__figure");
    const map = rules.find((r) => !r.at && r.selector === ".isl-map");
    assert.ok(fig && map);
    const f = Object.fromEntries(decls(fig.body));
    const m = Object.fromEntries(decls(map.body));
    assert.equal(f.display, "block");
    assert.equal(f.cursor, "default");
    assert.equal(m.display, "block");
    assert.equal(m.width, "100%");
    assert.equal(m.height, "auto");
    assert.equal(m["aspect-ratio"].replace(/\s+/g, " "), "354 / 430");
    assert.equal(m.cursor, "default");
    assert.doesNotMatch(css, /cursor\s*:\s*pointer/);
  });

  test("animation 只在 .isl-map--play 下；4 種動畫各 1 條；次數有限且「時長 × 次數」≤ 4.4 秒", () => {
    const anim = rules.filter((r) => !r.at && /(^|;)\s*animation(-name|-duration|-iteration-count)?\s*:/.test(r.body));
    assert.equal(anim.length, 4);
    const targets = [];
    for (const r of anim) {
      for (const sel of r.selector.split(",").map((x) => x.trim())) {
        assert.match(sel, /^\.isl-map--play\s+\.isl-anim-(wave|boat|cloud|sway)$/, sel);
        targets.push(sel.split(/\s+/)[1]);
      }
      const d = decls(r.body);
      assert.equal(d.filter(([k]) => k.startsWith("animation")).length, 1, "只用 animation 簡寫：" + r.selector);
      const value = d.find(([k]) => k === "animation")[1];
      assert.doesNotMatch(value, /infinite/);
      assert.doesNotMatch(value, /,/, "單一動畫");
      const toks = value.split(/\s+/);
      const durs = toks.filter((t) => /^[\d.]+m?s$/.test(t));
      assert.equal(durs.length, 1, "只寫時長、不寫延遲：" + value);
      const sec = /ms$/.test(durs[0]) ? parseFloat(durs[0]) / 1000 : parseFloat(durs[0]);
      const counts = toks.filter((t) => /^\d+(\.\d+)?$/.test(t)).map(Number);
      assert.equal(counts.length, 1, "需明寫有限次數：" + value);
      assert.ok(counts[0] >= 1);
      assert.ok(sec * counts[0] <= 4.4 + 1e-9, value);
      assert.doesNotMatch(value, /\b(forwards|both)\b/, "結束後回到原位");
    }
    assert.deepEqual(targets.sort(), [".isl-anim-boat", ".isl-anim-cloud", ".isl-anim-sway", ".isl-anim-wave"]);
    // @media 內不得播放動畫（只有 none）
    for (const r of rules.filter((x) => x.at && x.at.startsWith("@media"))) {
      for (const [k, v] of decls(r.body)) if (k.startsWith("animation")) assert.match(v, /^none/);
    }
  });

  test("@keyframes 只用 transform；位移 ≤ 2.5（Y）／8（X）、旋轉 ≤ 2deg；無 opacity", () => {
    const kf = rules.filter((r) => r.at && r.at.startsWith("@keyframes"));
    const names = new Set(kf.map((r) => r.at.replace("@keyframes", "").trim()));
    assert.deepEqual([...names].sort(), ["isl-bob", "isl-drift", "isl-sway"]);
    for (const r of kf) {
      for (const [k, v] of decls(r.body)) {
        assert.equal(k, "transform", r.at + " " + r.selector);
        for (const m of v.matchAll(/translateY\((-?[\d.]+)px\)/g)) assert.ok(Math.abs(Number(m[1])) <= 2.5, v);
        for (const m of v.matchAll(/translateX\((-?[\d.]+)px\)/g)) assert.ok(Math.abs(Number(m[1])) <= 8, v);
        for (const m of v.matchAll(/rotate\((-?[\d.]+)deg\)/g)) assert.ok(Math.abs(Number(m[1])) <= 2, v);
        assert.doesNotMatch(v, /scale|translate\(|matrix|skew/, v);
      }
    }
    assert.doesNotMatch(css, /opacity/);
    // 各動畫引用的 keyframes 都存在
    for (const m of css.matchAll(/animation\s*:\s*([\w-]+)/g)) if (m[1] !== "none") assert.ok(names.has(m[1]), m[1]);
  });

  test("prefers-reduced-motion：.isl-map 與其子孫 animation: none !important", () => {
    const red = rules.filter((r) => r.at && /prefers-reduced-motion\s*:\s*reduce/.test(r.at));
    assert.equal(red.length, 1);
    const sels = red[0].selector.split(",").map((s) => s.trim());
    assert.deepEqual(sels.sort(), [".isl-map", ".isl-map *"]);
    assert.match(red[0].body, /animation\s*:\s*none\s*!important/);
  });

  test("不設定 .db-map 外框（屬 FE-108）；不使用 transition", () => {
    assert.equal(rules.some((r) => r.selector.split(",").some((s) => s.trim() === ".db-map")), false);
    assert.doesNotMatch(css, /transition/);
  });
});

// ── FE-115：圖形簽章 signature 與動畫切換 setPlay（architecture.md v0.21 §4.16、§7.32.8、§7.32.15 P-1、§10.15） ──

/** 假 DOM 節點序列化（屬性依寫入順序；等同 outerHTML 的比對用途） */
function serialize(n) {
  if (n.nodeType === 3) return n._text;
  const cls = n.className ? ' className="' + n.className + '"' : "";
  const attrs = Object.keys(n.attrs).map((k) => " " + k + '="' + n.attrs[k] + '"').join("");
  return "<" + n.tagName + cls + attrs + ">" + n.childNodes.map(serialize).join("") + "</" + n.tagName + ">";
}

/** 以 makeState 為基礎，覆寫某島的欄位 */
function withIsland(st, id, patch) {
  return Object.assign({}, st, {
    islands: st.islands.map((it) => (it.island === id ? Object.assign({}, it, patch) : it))
  });
}

describe("islandMap.signature：圖形簽章（FE-115，§4.16、§7.32.15 P-1、AC-70-03）", () => {
  const ISLES = ["green", "brown", "orange"];

  test("回傳字串；純函式（不需要 document、同一輸入多次呼叫結果相同、不改動輸入）", () => {
    const st = makeState({ weather: "sunny", lighthouse: "built", boatRatio: 0.5, stages: { green: "palm" } });
    const before = JSON.stringify(st);
    D.setDocument(null);
    try {
      const a = MAP.signature(st);
      assert.equal(typeof a, "string");
      assert.equal(MAP.signature(st), a);
    } finally {
      D.setDocument(makeDoc());
    }
    assert.equal(JSON.stringify(st), before);
  });

  test("影響圖形的 6 類值（天氣、燈塔、小船種類、boatRatio、三島階段）任一改變 → 簽章不同", () => {
    const base = makeState({ boatRatio: 0.5 });
    const sig = MAP.signature(base);
    const vary = [];
    for (const w of ["sunny", "rainbow"]) vary.push(["weather " + w, Object.assign({}, base, { weather: w })]);
    for (const l of ["built", "lit"]) vary.push(["lighthouse " + l, Object.assign({}, base, { lighthouse: l })]);
    vary.push(["boat docked", Object.assign({}, base, { boat: "docked" })]);
    for (const r of [0, 0.25, 0.9, 1]) vary.push(["boatRatio " + r, Object.assign({}, base, { boatRatio: r })]);
    for (const id of ISLES) {
      for (const stg of STAGES.slice(1)) vary.push([id + " " + stg, withIsland(base, id, { stage: stg })]);
    }
    for (const [name, st] of vary) assert.notEqual(MAP.signature(st), sig, name);
    // 天氣 3 種、燈塔 3 種兩兩不同
    assert.equal(new Set(["cloudy", "sunny", "rainbow"].map((w) => MAP.signature(Object.assign({}, base, { weather: w })))).size, 3);
    assert.equal(new Set(["unbuilt", "built", "lit"].map((l) => MAP.signature(Object.assign({}, base, { lighthouse: l })))).size, 3);
    // 同一島 6 階段兩兩不同；同一階段放在不同島也不同
    for (const id of ISLES) {
      assert.equal(new Set(STAGES.map((stg) => MAP.signature(withIsland(base, id, { stage: stg })))).size, 6, id);
    }
    assert.equal(new Set(ISLES.map((id) => MAP.signature(withIsland(base, id, { stage: "hut" })))).size, 3);
  });

  test("只改 P、m、n、outOfGoal、streakDays、k、q、x、d、remaining 等不影響圖形的值 → 簽章相同", () => {
    const base = makeState({ weather: "sunny", lighthouse: "built", boatRatio: 0.5, stages: { green: "bloom", brown: "palm" } });
    const sig = MAP.signature(base);
    const same = [
      Object.assign({}, base, { streakDays: 6 }),
      Object.assign({}, base, { k: 49 }),
      Object.assign({}, base, { q: 0 }),
      Object.assign({}, base, { x: 5, d: 10 }),
      Object.assign({}, base, { remaining: 7 }),
      withIsland(base, "green", { p: 63 }),
      withIsland(base, "green", { p: null, n: 0 }),
      withIsland(base, "brown", { m: 999 }),
      withIsland(base, "orange", { n: 1, outOfGoal: true })
    ];
    for (const st of same) assert.equal(MAP.signature(st), sig, JSON.stringify(st));
  });

  test("不合法值與 build 同樣正規化（未知天氣 = cloudy、燈塔 = unbuilt、比例夾在 0～1、階段 = sand、小船種類依比例推導）", () => {
    const base = makeState({ boatRatio: 0.5 });
    const eq = (a, b, name) => assert.equal(MAP.signature(a), MAP.signature(b), name);
    eq(Object.assign({}, base, { weather: "storm" }), Object.assign({}, base, { weather: "cloudy" }), "未知天氣");
    eq(Object.assign({}, base, { weather: undefined }), base, "缺天氣");
    eq(Object.assign({}, base, { lighthouse: 3 }), Object.assign({}, base, { lighthouse: "unbuilt" }), "未知燈塔");
    eq(Object.assign({}, base, { boatRatio: "0.5" }), base, "比例字串");
    for (const r of [NaN, -1, -0, null, undefined, "x", Infinity]) {
      eq(Object.assign({}, base, { boatRatio: r, boat: "sailing" }), Object.assign({}, base, { boatRatio: 0, boat: "sailing" }), "比例 " + r);
    }
    for (const r of [1.5, 2]) {
      eq(Object.assign({}, base, { boatRatio: r, boat: "docked" }), Object.assign({}, base, { boatRatio: 1, boat: "docked" }), "比例 " + r);
    }
    eq(Object.assign({}, base, { boat: "flying" }), Object.assign({}, base, { boat: "sailing" }), "未知小船（r < 1）");
    eq(Object.assign({}, base, { boatRatio: 1, boat: "x" }), Object.assign({}, base, { boatRatio: 1, boat: "docked" }), "未知小船（r = 1）");
    eq(withIsland(base, "green", { stage: "jungle" }), base, "未知階段");
    eq(Object.assign({}, base, { islands: "x" }), base, "islands 非陣列");
    eq(Object.assign({}, base, { islands: [] }), base, "缺島");
    eq(Object.assign({}, base, { islands: [null, 3, { island: "green" }] }), base, "島資料殘缺");
    for (const st of [undefined, null, {}, "x", 7]) eq(st, makeState(), "st " + String(st));
    // 簽章的正規化結果與 build 的 data-* 一致
    const odd = { weather: "storm", lighthouse: 3, boatRatio: 2, boat: "?", islands: [{ island: "brown", stage: "hut" }] };
    const { svg } = buildMap(odd);
    assert.equal(svg.getAttribute("data-weather"), "cloudy");
    assert.equal(svg.getAttribute("data-lighthouse"), "unbuilt");
    assert.equal(svg.getAttribute("data-boat"), "docked");
    assert.equal(MAP.signature(odd), MAP.signature(makeState({ boatRatio: 1, stages: { brown: "hut" } })));
  });

  test("簽章相同 ⇔ build 出的 svg 子樹相同（6 階段 × 3 島抽樣＋天氣、燈塔、比例、小船組合；aria-label 不屬簽章）", () => {
    const samples = [];
    // 三島各走過 6 階段（其他兩島錯開）
    STAGES.forEach((stg, i) => {
      samples.push(makeState({ stages: { green: stg, brown: STAGES[(i + 2) % 6], orange: STAGES[(i + 4) % 6] } }));
      samples.push(makeState({ stages: { green: STAGES[(i + 1) % 6], brown: stg, orange: STAGES[(i + 3) % 6] } }));
      samples.push(makeState({ stages: { green: STAGES[(i + 5) % 6], brown: STAGES[(i + 1) % 6], orange: stg } }));
    });
    // 天氣 × 燈塔 × 比例 × 小船
    for (const w of ["cloudy", "sunny", "rainbow"]) {
      for (const l of ["unbuilt", "built", "lit"]) {
        for (const r of [0, 0.5, 0.9, 1]) {
          samples.push(makeState({ weather: w, lighthouse: l, boatRatio: r, stages: { green: "complete", orange: "sprout" } }));
          if (r < 1) samples.push(makeState({ weather: w, lighthouse: l, boatRatio: r, boat: "docked", stages: { brown: "bloom" } }));
        }
      }
    }
    // 簽章相同但輸入不同的變體（不影響圖形的欄位、不合法值）
    const variants = [];
    for (const st of samples.slice(0, 18)) {
      variants.push(Object.assign({}, st, { streakDays: 9, k: 3, remaining: 4 }));
      variants.push(withIsland(st, "green", { p: 77, m: 5, n: 0 }));
    }
    variants.push(Object.assign({}, makeState(), { weather: "storm", lighthouse: "?", boatRatio: NaN }));
    variants.push(Object.assign({}, makeState({ boatRatio: 1 }), { boatRatio: 3, boat: undefined }));
    variants.push(undefined, null, {});
    const all = samples.concat(variants);

    const bySig = new Map();
    const htmlOf = new Map();
    for (const st of all) {
      const sig = MAP.signature(st);
      const html = serialize(buildMap(st, { play: true }).svg);
      if (bySig.has(sig)) assert.equal(html, bySig.get(sig), "簽章相同 → svg 相同：" + sig);
      else bySig.set(sig, html);
      if (htmlOf.has(html)) assert.equal(sig, htmlOf.get(html), "svg 相同 → 簽章相同");
      else htmlOf.set(html, sig);
    }
    assert.equal(bySig.size, htmlOf.size);
    assert.ok(bySig.size >= 40, "抽樣需涵蓋多種圖形：" + bySig.size);
    // aria-label 不屬簽章：P 不同時簽章相同、svg 相同，但外層 aria-label 可不同
    const a = makeState({ stages: { green: "palm" } });
    const b = withIsland(a, "green", { p: 49 });
    assert.equal(MAP.signature(a), MAP.signature(b));
    const fa = MAP.build(a);
    const fb = MAP.build(b);
    assert.equal(serialize(fa.children[0]), serialize(fb.children[0]));
    assert.notEqual(fa.getAttribute("aria-label"), fb.getAttribute("aria-label"));
  });
});

describe("islandMap.setPlay：只切換 isl-map--play（FE-115，§4.16、§7.32.8「重播」、AC-70-01）", () => {
  const count = (n) => walk(n).length;

  test("加上與移除 isl-map--play；同一個 svg 節點、節點數不變、其他屬性與 class 保留", () => {
    const st = makeState({ weather: "rainbow", stages: { green: "complete" } });
    const fig = MAP.build(st, { play: false });
    const svg = fig.children[0];
    const n0 = count(fig);
    const html0 = serialize(svg);
    MAP.setPlay(fig, true);
    assert.equal(fig.children[0], svg);
    assert.ok(svg.hasClass("isl-map--play"));
    assert.ok(svg.hasClass("isl-map"));
    assert.equal(count(fig), n0);
    MAP.setPlay(fig, true);
    assert.equal(svg.classes().filter((c) => c === "isl-map--play").length, 1, "重複呼叫不重複加入");
    // 與 build(play: true) 的 svg 相同
    assert.equal(serialize(svg), serialize(MAP.build(st, { play: true }).children[0]));
    MAP.setPlay(fig, false);
    assert.equal(svg.hasClass("isl-map--play"), false);
    assert.ok(svg.hasClass("isl-map"));
    assert.equal(count(fig), n0);
    assert.equal(serialize(svg), html0);
  });

  test("play 只有 === true 才加上；其他值一律移除", () => {
    const fig = MAP.build(makeState(), { play: true });
    for (const v of [false, undefined, null, 1, "true", {}]) {
      MAP.setPlay(fig, true);
      MAP.setPlay(fig, v);
      assert.equal(fig.children[0].hasClass("isl-map--play"), false, String(v));
    }
  });

  test("figure 不是元素或找不到 svg.isl-map → 不做事、不拋例外、節點數不變", () => {
    for (const v of [undefined, null, 0, "x", {}, { nodeType: 3 }]) {
      assert.doesNotThrow(() => MAP.setPlay(v, true));
    }
    const doc = makeDoc();
    const text = doc.createTextNode("x");
    assert.doesNotThrow(() => MAP.setPlay(text, true));
    const empty = doc.createElement("div");
    assert.doesNotThrow(() => MAP.setPlay(empty, true));
    assert.equal(count(empty), 1);
    // 只有別的 svg（非 isl-map）
    const other = doc.createElement("div");
    const art = ART.turtle();
    other.appendChild(art);
    const artCls = art.getAttribute("class");
    const n0 = count(other);
    assert.doesNotThrow(() => MAP.setPlay(other, true));
    assert.equal(art.getAttribute("class"), artCls);
    assert.equal(count(other), n0);
  });

  test("瀏覽器路徑：有 querySelector 與 classList 時以 classList.toggle(isl-map--play, play === true) 切換", () => {
    const calls = [];
    const svg = { nodeType: 1, classList: { toggle: (c, on) => calls.push([c, on]) } };
    const fig = { nodeType: 1, querySelector: (sel) => (sel === "svg.isl-map" ? svg : null) };
    MAP.setPlay(fig, true);
    MAP.setPlay(fig, false);
    MAP.setPlay(fig, "true");
    assert.deepEqual(calls, [["isl-map--play", true], ["isl-map--play", false], ["isl-map--play", false]]);
    const none = { nodeType: 1, querySelector: () => null };
    assert.doesNotThrow(() => MAP.setPlay(none, true));
  });
});
