// QA 第 5 輪（PRD v0.13，US-38～US-41）：在頁面內執行的版面量測函式（以 Function.toString 注入）。
// 對比依 WCAG 2.x 相對亮度公式；有效背景沿祖先鏈合成，opacity < 1 的祖先以「其外層背景」混色（AC-26-01 鎖定列）。

/** 安裝到 window.__qaL（作為 init script 或直接 evaluate） */
export function installProbe() {
  const parse = (c) => { const m = String(c).match(/rgba?\(([^)]+)\)/); if (!m) return null; const a = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: a[0], g: a[1], b: a[2], a: a.length > 3 ? a[3] : 1 }; };
  const hex = (c) => { const p = parse(c); if (!p) return null; if (p.a === 0) return "transparent"; return "#" + [p.r, p.g, p.b].map((x) => Math.round(x).toString(16).padStart(2, "0")).join(""); };
  const blend = (top, under, a) => ({ r: top.r * a + under.r * (1 - a), g: top.g * a + under.g * (1 - a), b: top.b * a + under.b * (1 - a), a: 1 });
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const shown = (e) => { if (!e || !e.isConnected) return false; if (e.closest("[hidden]")) return false; const s = getComputedStyle(e); if (s.display === "none" || s.visibility === "hidden") return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  /** 由 el 往上合成背景，直到 stop（不含）；回傳不透明色 */
  const bgChain = (el, stop) => {
    const layers = [];
    for (let e = el; e && e !== stop && e.nodeType === 1; e = e.parentElement) { const p = parse(getComputedStyle(e).backgroundColor); if (p && p.a > 0) { layers.push(p); if (p.a >= 1) break; } }
    let c = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = layers.length - 1; i >= 0; i--) c = blend(layers[i], c, layers[i].a);
    return { c, opaque: layers.length > 0 && layers[layers.length - 1].a >= 1 };
  };
  const effective = (el) => {
    const st = getComputedStyle(el); const fg = parse(st.color);
    // 最外層 opacity < 1 的祖先
    let op = null, o = 1;
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const v = Number(getComputedStyle(e).opacity); if (v < 1) { o *= v; op = e; } }
    if (!op) { const bg = bgChain(el, null).c; return { fg: blend(fg, bg, fg.a), bg }; }
    const inside = bgChain(el, op.parentElement); const under = bgChain(op.parentElement, null).c;
    const bgIn = inside.opaque ? inside.c : under;
    const bg = blend(bgIn, under, o); const fgc = blend(blend(fg, bgIn, fg.a), under, o);
    return { fg: fgc, bg, opacity: o };
  };
  const ownText = (e) => [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim();
  const SEMANTIC = new Set(["#e8833a", "#8b5a2b", "#2e9e5b", "#2f6fd6", "#c9a227", "#15803d", "#b91c1c", "#16a34a", "#ca8a04", "#dc2626"]);
  window.__qaL = {
    parse, hex, ratio, shown, effective, ownText, SEMANTIC: [...SEMANTIC],
    /** 量測 root 內可見文字的對比（排除停用按鈕、語意色、visually-hidden、標題列圖示） */
    contrast(root = document.body) {
      const out = [];
      for (const e of root.querySelectorAll("*")) {
        const t = ownText(e); if (!t) continue;
        if (!shown(e) || e.closest(".visually-hidden, .app-logo, svg")) continue;
        const btn = e.closest("button, [role=button]"); if (btn && (btn.disabled || btn.getAttribute("aria-disabled") === "true")) continue;
        const st = getComputedStyle(e); const h = hex(st.color);
        if (SEMANTIC.has(h)) continue;
        const { fg, bg, opacity } = effective(e);
        const fs = parseFloat(st.fontSize), fw = Number(st.fontWeight) || 400;
        const large = fs >= 24 || (fs >= 18.66 && fw >= 700);
        const r = ratio(fg, bg);
        out.push({ text: t.slice(0, 24), sel: e.tagName.toLowerCase() + (e.id ? "#" + e.id : "") + (typeof e.className === "string" && e.className ? "." + e.className.trim().split(/\s+/).join(".") : ""), color: h, bg: hex(`rgb(${bg.r},${bg.g},${bg.b})`), ratio: Math.round(r * 100) / 100, large, need: large ? 3 : 4.5, ok: r >= (large ? 3 : 4.5) - 0.005, opacity: opacity || 1 });
      }
      return out;
    },
    /** 掃描計算後顏色等於指定色的元素（排除 skipSel 內的元素） */
    colorScan(colors, skipSel = ".app-logo") {
      const hits = [];
      const all = [document.documentElement, ...document.querySelectorAll("body *")];
      for (const e of all) {
        if (skipSel && e.closest(skipSel)) continue;
        if (!shown(e) && !(e instanceof SVGElement && e.closest("svg") && shown(e.closest("svg")))) continue;
        const st = getComputedStyle(e);
        const props = { color: st.color, "background-color": st.backgroundColor, "border-top-color": st.borderTopColor, "border-right-color": st.borderRightColor, "border-bottom-color": st.borderBottomColor, "border-left-color": st.borderLeftColor, fill: st.fill, stroke: st.stroke };
        for (const [k, v] of Object.entries(props)) { const h = hex(v); if (colors.includes(h)) hits.push({ sel: e.tagName.toLowerCase() + (e.id ? "#" + e.id : "") + (typeof e.className === "string" && e.className ? "." + e.className.trim().split(/\s+/).join(".") : (e.className && e.className.baseVal ? "." + e.className.baseVal.trim().split(/\s+/).join(".") : "")), prop: k, color: h, text: ownText(e).slice(0, 12), ctx: e.closest(".db-start") ? "db-start" : e.closest(".db-stat__icon") ? "db-stat__icon" : e.closest("#cz-start") ? "cz-start" : "" }); }
      }
      return hits;
    },
    rect(sel) { const e = typeof sel === "string" ? document.querySelector(sel) : sel; if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, b: r.bottom, r: r.right }; },
    inView(sel) { const r = this.rect(sel); return !!r && r.w > 0 && r.y >= -0.5 && r.x >= -0.5 && r.b <= innerHeight + 0.5 && r.r <= document.documentElement.clientWidth + 0.5; },
    hitOk(sel) { const e = document.querySelector(sel); if (!e) return false; const r = e.getBoundingClientRect(); const h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!h && (h === e || e.contains(h)); },
  };
}
export const PROBE = `(${installProbe.toString()})();`;
