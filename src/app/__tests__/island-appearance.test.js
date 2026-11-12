/*
 * island-appearance.test.js — 其他畫面套用島嶼外觀 token（FE-110）
 * 受測：styles/20-customizer.css、21-custom-vocab.css、31-speech.css、32-quiz.css、40-part5.css、
 *       70-sources.css、75-site-pages.css、80-pwa.css（讀檔解析，不執行瀏覽器）；
 *       變數值讀 00-base.css 的 :root（唯讀，不受測）；DOM 對應只讀 views/*.js 的 className 字串常值（唯讀）
 * 依據：architecture.md §7.32.7「其他畫面」、§10.15「island-appearance.test.js」列；
 *       契約 README §11.2 VC-4、VC-7、V-LAY-02，§15.7 IV-1、IV-3
 * 涵蓋：AC-68-02（區塊卡片與按鈕外框、圓角）、AC-68-03（外框色）、AC-68-04（範圍外樣式不變）、AC-71-05（觸控、焦點框）
 * 判定：
 * - 選擇器主體（最後一個複合選擇器）含 .card、.btn（.btn--link 除外）或已知的區塊卡片／按鈕 class 的規則，
 *   若設定外框：寬 ≥ 2px、顏色 var(--outline)、實線，不得 0／none／transparent；圓角 ≥ 16（卡片）／12（按鈕）。
 * - .site-page__content、.src-card、.src-project 明示卡片樣式；TTS、麥克風按鈕帶 .btn 且各狀態外框色為 var(--outline)。
 * - 範圍外（輸入框、.cz-level、作答選項、焦點框、收音條、即時文字列、燈號、首次畫面固定底部列）維持原樣式。
 */
"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const APP_DIR = path.join(__dirname, "..");
const STYLES_DIR = path.join(APP_DIR, "styles");

/** 本任務的 8 個樣式檔（tasks.json FE-110 paths） */
const FILES = [
  "20-customizer.css",
  "21-custom-vocab.css",
  "31-speech.css",
  "32-quiz.css",
  "40-part5.css",
  "70-sources.css",
  "75-site-pages.css",
  "80-pwa.css"
];

/** 區塊卡片：全域 .card 與這些畫面上帶 .card（或本任務指定為卡片）的元素 class */
const CARD_CLASSES = new Set([
  "card",
  "cz-colors-wrap", "cz-estimate", "cz-score", "cz-status",
  "cv-section",
  "p5-question", "p5-summary", "p5-empty", "p5-allcorrect",
  "src-card", "src-project",
  "site-page__content"
]);

/** 按鈕：全域 .btn 與這些畫面上帶 .btn（非 .btn--link）的元素 class */
const BUTTON_CLASSES = new Set([
  "btn", "btn--primary", "btn--secondary", "btn--danger", "btn--accent",
  "cz-apply", "cz-start",
  "cv-templates__btn", "cv-item__delete", "cv-list__more",
  "sp-tts__btn", "sp-mic",
  "p5-record__clear",
  "pwa-update__btn"
]);

/** 範圍外 class（AC-68-02 不在範圍）：主體含這些 class 的規則不做卡片／按鈕判定 */
const OUT_OF_SCOPE = /^(cz-level|fcq-option|p5-option|app-nav|ad-|btn--link|site-page__link|cz-restore)/;

/** 讀檔、去除 BOM 與 CSS 註解 */
function readCss(file) {
  return fs.readFileSync(path.join(STYLES_DIR, file), "utf8").replace(/^﻿/, "").replace(/\/\*[\s\S]*?\*\//g, "");
}

/**
 * 極簡 CSS 解析：回傳所有一般規則 [{ selector, decls, media }]（@media 內的規則一併展開）
 * @param {string} src 已去除註解的 CSS
 */
function parseRules(src, media = "") {
  const out = [];
  let i = 0;
  while (i < src.length) {
    const open = src.indexOf("{", i);
    if (open < 0) break;
    const head = src.slice(i, open).trim();
    let depth = 0;
    let j = open;
    for (; j < src.length; j++) {
      if (src[j] === "{") depth++;
      else if (src[j] === "}") {
        depth--;
        if (depth === 0) break;
      }
    }
    const body = src.slice(open + 1, j);
    if (head.startsWith("@keyframes")) {
      // 關鍵影格不是元素規則，略過
    } else if (head.startsWith("@")) {
      out.push(...parseRules(body, head));
    } else {
      out.push({ selector: head, decls: body, media });
    }
    i = j + 1;
  }
  return out;
}

/** 宣告字串 → [{ prop, value }]（保留順序） */
function declsOf(body) {
  return body
    .split(";")
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => {
      const k = d.indexOf(":");
      return { prop: d.slice(0, k).trim().toLowerCase(), value: d.slice(k + 1).trim() };
    });
}

/** 取最後一次宣告的值；無則 null */
function prop(body, name) {
  const list = declsOf(body).filter((d) => d.prop === name);
  return list.length ? list[list.length - 1].value : null;
}

/** 00-base.css 所有非 @media 的 :root 變數（唯讀，用來解析 var()） */
const ROOT_VARS = (() => {
  const vars = {};
  for (const r of parseRules(readCss("00-base.css"))) {
    if (r.media || r.selector !== ":root") continue;
    for (const d of declsOf(r.decls)) if (d.prop.startsWith("--")) vars[d.prop] = d.value;
  }
  return vars;
})();

/** 解析 var(--x)（可巢狀）；無法解析時原樣回傳 */
function resolve(value) {
  let v = value.trim();
  for (let n = 0; n < 5; n++) {
    const m = v.match(/^var\((--[\w-]+)(?:\s*,\s*([^)]*))?\)$/);
    if (!m) break;
    if (Object.prototype.hasOwnProperty.call(ROOT_VARS, m[1])) v = ROOT_VARS[m[1]].trim();
    else if (m[2] !== undefined) v = m[2].trim();
    else break;
  }
  return v;
}

/** 以空白切分值，但不切開括號內的內容 */
function splitTokens(value) {
  const out = [];
  let cur = "";
  let depth = 0;
  for (const ch of value) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (/\s/.test(ch) && depth === 0) {
      if (cur) out.push(cur);
      cur = "";
    } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

/** 長度 → px；無法換算回傳 NaN */
function px(value) {
  const v = resolve(value);
  if (v === "0") return 0;
  const m = v.match(/^(-?[\d.]+)px$/);
  return m ? Number(m[1]) : NaN;
}

const BORDER_STYLES = new Set(["none", "hidden", "solid", "dashed", "dotted", "double", "groove", "ridge", "inset", "outset"]);

/** 解析 border 簡寫 → { width, style, color }（未寫者為 null） */
function parseBorder(value) {
  const res = { width: null, style: null, color: null };
  const v = value.trim();
  if (v === "0" || v === "none") return { width: "0", style: "none", color: null };
  for (const t of splitTokens(v)) {
    const r = resolve(t);
    if (BORDER_STYLES.has(r)) res.style = r;
    else if (/^[\d.]+(px|em|rem)?$/.test(r) || /^(thin|medium|thick)$/.test(r)) res.width = t;
    else res.color = t;
  }
  return res;
}

/** 選擇器主體（最後一個複合選擇器）中的 class 名稱 */
function subjectClasses(sel) {
  const parts = sel.trim().split(/\s*[\s>+~]\s*/).filter(Boolean);
  const last = parts[parts.length - 1] || "";
  return [...last.matchAll(/\.([\w-]+)/g)].map((m) => m[1]);
}

/** 判定規則中每個選擇器的種類：card／button／null（範圍外或不相關） */
function kindsOf(rule) {
  const kinds = new Set();
  for (const sel of rule.selector.split(",")) {
    const cls = subjectClasses(sel);
    if (cls.some((c) => OUT_OF_SCOPE.test(c))) continue;
    if (cls.some((c) => CARD_CLASSES.has(c))) kinds.add("card");
    if (cls.some((c) => BUTTON_CLASSES.has(c))) kinds.add("button");
  }
  return kinds;
}

const RULES = Object.fromEntries(FILES.map((f) => [f, parseRules(readCss(f))]));

/** 找某檔指定選擇器（完全相同）且指定 media 的規則 */
function ruleOf(file, selector, media = "") {
  return RULES[file].find((r) => r.media === media && r.selector.split(",").map((s) => s.trim()).includes(selector));
}

/** 斷言一條規則具備區塊卡片樣式（白底、≥ 2px 外框色實線、圓角 ≥ 16px） */
function assertCardStyle(r, label) {
  assert.ok(r, "缺少規則 " + label);
  assert.equal(resolve(prop(r.decls, "background") || prop(r.decls, "background-color") || ""), "#ffffff", label + " 背景");
  const b = parseBorder(prop(r.decls, "border") || "");
  assert.equal(b.style, "solid", label + " border-style");
  assert.ok(px(b.width) >= 2, label + " border-width ≥ 2px：" + b.width);
  assert.equal(b.color, "var(--outline)", label + " border-color");
  const radius = prop(r.decls, "border-radius");
  assert.ok(radius, label + " 須設 border-radius");
  for (const t of splitTokens(radius.replace("/", " "))) assert.ok(px(t) >= 16, label + " 圓角 ≥ 16px：" + t);
}

describe("island-appearance：前置（FE-110）", () => {
  test("8 個樣式檔都存在且可解析", () => {
    for (const f of FILES) assert.ok(RULES[f].length > 0, f);
  });

  test("00-base.css 變數：--outline-w = 2px、--outline = #3d3550、--radius-card ≥ 16、--radius-btn ≥ 12（唯讀）", () => {
    assert.equal(ROOT_VARS["--outline-w"], "2px");
    assert.equal(ROOT_VARS["--outline"], "#3d3550");
    assert.ok(px("var(--radius-card)") >= 16);
    assert.ok(px("var(--radius-btn)") >= 12);
    assert.ok(px("var(--radius-cta)") >= 12);
  });
});

describe("island-appearance：卡片與按鈕覆寫規則（AC-68-02、VC-4）", () => {
  for (const file of FILES) {
    test(`${file}：卡片／按鈕規則的外框 ≥ 2px、var(--outline)、實線，不得 0／none／transparent`, () => {
      for (const r of RULES[file]) {
        const kinds = kindsOf(r);
        if (kinds.size === 0) continue;
        const where = r.selector + (r.media ? " @ " + r.media : "");
        for (const d of declsOf(r.decls)) {
          if (/^border(-(top|right|bottom|left))?$/.test(d.prop)) {
            const b = parseBorder(d.value);
            assert.notEqual(b.style, "none", where + " " + d.prop + ": " + d.value);
            if (b.width !== null) assert.ok(px(b.width) >= 2, where + " " + d.prop + " 寬 ≥ 2px：" + d.value);
            if (b.color !== null) assert.equal(b.color, "var(--outline)", where + " " + d.prop + " 色");
            if (b.style !== null) assert.equal(b.style, "solid", where + " " + d.prop + " 樣式");
          } else if (/^border(-(top|right|bottom|left))?-width$/.test(d.prop)) {
            for (const t of splitTokens(d.value)) assert.ok(px(t) >= 2, where + " " + d.prop + "：" + d.value);
          } else if (/^border(-(top|right|bottom|left))?-color$/.test(d.prop)) {
            assert.equal(d.value, "var(--outline)", where + " " + d.prop);
          } else if (/^border(-(top|right|bottom|left))?-style$/.test(d.prop)) {
            for (const t of splitTokens(d.value)) assert.equal(t, "solid", where + " " + d.prop);
          }
        }
      }
    });

    test(`${file}：卡片圓角 ≥ 16px、按鈕圓角 ≥ 12px；不得用 --radius（8px）`, () => {
      for (const r of RULES[file]) {
        const kinds = kindsOf(r);
        if (kinds.size === 0) continue;
        const where = r.selector + (r.media ? " @ " + r.media : "");
        const min = kinds.has("card") ? 16 : 12;
        for (const d of declsOf(r.decls)) {
          if (!/^border(-(top|bottom)-(left|right))?-radius$/.test(d.prop)) continue;
          assert.doesNotMatch(d.value, /var\(--radius\)/, where);
          for (const t of splitTokens(d.value.replace("/", " "))) {
            assert.ok(px(t) >= min, where + " " + d.prop + " ≥ " + min + "px：" + d.value);
          }
        }
      }
    });

    test(`${file}：卡片／按鈕規則不用 --border、#d5d9e0、--line 作外框（VC-4）`, () => {
      for (const r of RULES[file]) {
        if (kindsOf(r).size === 0) continue;
        for (const d of declsOf(r.decls)) {
          if (!/^border/.test(d.prop)) continue;
          assert.doesNotMatch(d.value, /var\(--border\)|#d5d9e0|var\(--line\)/i, r.selector + " " + d.prop);
        }
      }
    });
  }

  test("判定範圍確實涵蓋到規則（防止 class 清單失效）：31-speech.css 的 .sp-mic 系列、70-sources.css、75-site-pages.css 都被判定", () => {
    const hit = (file) => RULES[file].filter((r) => kindsOf(r).size > 0).map((r) => r.selector);
    assert.ok(hit("31-speech.css").some((s) => s === ".sp-mic.is-listening"));
    assert.ok(hit("31-speech.css").some((s) => s === ".sp-mic.is-preparing"));
    assert.ok(hit("31-speech.css").some((s) => s === ".sp-tts__btn"));
    assert.ok(hit("70-sources.css").some((s) => s.includes(".src-card")));
    assert.ok(hit("75-site-pages.css").some((s) => s === ".site-page__content"));
    // 子元素（例如 .sp-mic__dot）與連結樣式按鈕不屬判定對象
    assert.ok(!hit("31-speech.css").some((s) => s === ".sp-mic__dot"));
    assert.ok(!hit("31-speech.css").some((s) => s === ".sp-mic.is-listening .sp-mic__dot"));
  });
});

describe("island-appearance：區塊卡片（AC-68-02、V-LAY-02）", () => {
  test("75-site-pages.css：.site-page__content 為區塊卡片（白底、2px var(--outline)、圓角 22px、padding）", () => {
    const r = ruleOf("75-site-pages.css", ".site-page__content");
    assertCardStyle(r, ".site-page__content");
    assert.equal(prop(r.decls, "border"), "var(--outline-w) solid var(--outline)");
    assert.equal(prop(r.decls, "border-radius"), "var(--radius-card)");
    assert.ok(px(prop(r.decls, "padding") || "") > 0, "須設 padding");
  });

  test("75-site-pages.css：返回按鈕（.site-return）與行內連結（.site-page__link）不加外框（SD-FB-105）", () => {
    for (const sel of [".site-return", ".site-page__link"]) {
      for (const r of RULES["75-site-pages.css"].filter((x) => x.selector.split(",").map((s) => s.trim()).includes(sel))) {
        assert.equal(prop(r.decls, "border"), null, sel);
        assert.equal(prop(r.decls, "border-color"), null, sel);
      }
    }
  });

  test("70-sources.css：.src-card、.src-project（「資料來源與授權」各區塊）為區塊卡片", () => {
    assertCardStyle(ruleOf("70-sources.css", ".src-card"), ".src-card");
    assertCardStyle(ruleOf("70-sources.css", ".src-project"), ".src-project");
  });

  test("70-sources.css：授權全文摺疊框不是區塊卡片，維持 1px var(--line)、var(--radius)", () => {
    const r = ruleOf("70-sources.css", ".src-license");
    assert.equal(prop(r.decls, "border"), "1px solid var(--line)");
    assert.equal(prop(r.decls, "border-radius"), "var(--radius)");
  });

  test("views：資料來源各區塊帶 .card；應用內三頁內容區 class 為 site-page__content（DOM 不變，唯讀檢查）", () => {
    const src = fs.readFileSync(path.join(APP_DIR, "views", "sources-page.js"), "utf8");
    assert.ok(src.includes('"card src-card"'));
    assert.ok(src.includes('"card src-project"'));
    const site = fs.readFileSync(path.join(APP_DIR, "views", "site-pages.js"), "utf8");
    assert.ok(site.includes('className: "site-page__content"'));
  });

  test("其他畫面不覆寫 .card 的背景（白底沿用全域）", () => {
    for (const file of FILES) {
      for (const r of RULES[file]) {
        if (!kindsOf(r).has("card")) continue;
        const bg = prop(r.decls, "background") || prop(r.decls, "background-color");
        if (bg !== null) assert.equal(resolve(bg), "#ffffff", file + " " + r.selector);
      }
    }
  });
});

describe("island-appearance：TTS 與麥克風按鈕（AC-68-02）", () => {
  const FILE = "31-speech.css";

  test("speech-panel.js：朗讀與麥克風按鈕都帶 .btn（沿用全域 2px 外框色外框、圓角 14px；唯讀檢查）", () => {
    const js = fs.readFileSync(path.join(APP_DIR, "views", "speech-panel.js"), "utf8");
    assert.ok(js.includes('"btn btn--secondary sp-tts__btn"'));
    assert.ok(js.includes('"btn btn--secondary sp-mic"'));
  });

  test(".sp-mic 各狀態外框色 = var(--outline)，不用 --light-red、--brand 作外框", () => {
    for (const sel of [".sp-mic.is-listening", ".sp-mic.is-preparing"]) {
      const r = ruleOf(FILE, sel);
      assert.ok(r, sel);
      assert.equal(prop(r.decls, "border-color"), "var(--outline)", sel);
    }
    for (const r of RULES[FILE]) {
      if (!kindsOf(r).has("button")) continue;
      for (const d of declsOf(r.decls)) {
        if (/^border/.test(d.prop)) assert.doesNotMatch(d.value, /--light-red|var\(--brand\)/, r.selector);
      }
    }
  });

  test("聆聽中、準備中的底色與字色維持原值（只改外框色）", () => {
    const listen = ruleOf(FILE, ".sp-mic.is-listening").decls;
    assert.equal(prop(listen, "background"), "var(--light-red)");
    assert.equal(prop(listen, "color"), "#ffffff");
    const prep = ruleOf(FILE, ".sp-mic.is-preparing").decls;
    assert.equal(prop(prep, "background"), "var(--surface)");
    assert.equal(prop(prep, "color"), "var(--brand-deep)");
  });

  test("範圍外不變：收音條暗格／亮格、即時文字列、燈號色、分數區外框", () => {
    assert.equal(prop(ruleOf(FILE, ".sp-meter__bar").decls, "background"), "var(--border)");
    assert.equal(prop(ruleOf(FILE, ".sp-meter__bar.is-on").decls, "background"), "var(--correct)");
    assert.equal(prop(ruleOf(FILE, ".sp-live").decls, "border-left"), "3px solid var(--line)");
    assert.equal(prop(ruleOf(FILE, ".sp-live").decls, "color"), "var(--text-muted)");
    assert.equal(prop(ruleOf(FILE, '.sp-result[data-light="green"]').decls, "--sp-light"), "var(--light-green)");
    assert.equal(prop(ruleOf(FILE, '.sp-result[data-light="yellow"]').decls, "--sp-light"), "var(--light-yellow)");
    assert.equal(prop(ruleOf(FILE, '.sp-result[data-light="red"]').decls, "--sp-light"), "var(--light-red)");
    assert.equal(prop(ruleOf(FILE, ".sp-result").decls, "border"), "2px solid var(--sp-light)");
  });
});

describe("island-appearance：範圍外樣式不變（AC-68-04、AC-71-05）", () => {
  test("20-customizer.css：色級列 .cz-level 與選中樣式不變", () => {
    const lv = ruleOf("20-customizer.css", ".cz-level").decls;
    assert.equal(prop(lv, "border"), "2px solid transparent");
    assert.equal(prop(lv, "border-radius"), "14px");
    assert.equal(prop(lv, "min-height"), "56px");
    const sel = ruleOf("20-customizer.css", '.cz-level[aria-pressed="true"]').decls;
    assert.equal(prop(sel, "border-color"), "var(--cz-select)");
    assert.equal(prop(sel, "background"), "var(--cz-select-tint)");
  });

  test("20-customizer.css：首次畫面固定底部列不設外框", () => {
    for (const r of RULES["20-customizer.css"].filter((x) => x.selector === ".cz-firstbar")) {
      for (const d of declsOf(r.decls)) assert.doesNotMatch(d.prop, /^border(?!-radius)/, ".cz-firstbar @ " + r.media);
    }
  });

  test("32-quiz.css：四選一作答選項維持 --border 外框、--radius 圓角與對錯色", () => {
    const opt = ruleOf("32-quiz.css", ".fcq-option").decls;
    assert.equal(prop(opt, "border"), "2px solid var(--border)");
    assert.equal(prop(opt, "border-radius"), "var(--radius)");
    assert.equal(prop(opt, "min-height"), "var(--touch)");
    assert.equal(prop(ruleOf("32-quiz.css", ".fcq-option--correct").decls, "border-color"), "var(--correct)");
    assert.equal(prop(ruleOf("32-quiz.css", ".fcq-option--wrong").decls, "border-color"), "var(--wrong)");
  });

  test("40-part5.css：Part 5 作答選項維持 --border 外框、--radius 圓角與對錯色", () => {
    const opt = ruleOf("40-part5.css", ".p5-option").decls;
    assert.equal(prop(opt, "border"), "2px solid var(--border)");
    assert.equal(prop(opt, "border-radius"), "var(--radius)");
    assert.equal(prop(ruleOf("40-part5.css", ".p5-option--correct").decls, "border-color"), "var(--correct)");
    assert.equal(prop(ruleOf("40-part5.css", ".p5-option--wrong").decls, "border-color"), "var(--wrong)");
  });

  test("焦點框：8 個檔案中的 outline 一律為 3px solid var(--focus) 或 none（不改焦點框，AC-71-05）", () => {
    for (const file of FILES) {
      for (const r of RULES[file]) {
        const v = prop(r.decls, "outline");
        if (v === null) continue;
        assert.ok(v === "none" || v === "3px solid var(--focus)", file + " " + r.selector + "：" + v);
      }
    }
  });

  test("8 個檔案不含導覽項與廣告框的規則（樣式屬其他檔案，不在本任務）", () => {
    for (const file of FILES) {
      for (const r of RULES[file]) {
        assert.doesNotMatch(r.selector, /\.app-nav|\.ad-|\.ad\b/, file + " " + r.selector);
      }
    }
  });

  test("卡片／按鈕規則不縮小觸控目標：min-height／height 若設定須 ≥ 44px（AC-71-05）", () => {
    for (const file of FILES) {
      for (const r of RULES[file]) {
        if (!kindsOf(r).has("button")) continue;
        for (const p of ["min-height", "height"]) {
          const v = prop(r.decls, p);
          if (v === null || v === "auto" || /%$/.test(v)) continue;
          assert.ok(px(v) >= 44 || v === "var(--touch)", file + " " + r.selector + " " + p + "：" + v);
        }
      }
    }
  });
});
