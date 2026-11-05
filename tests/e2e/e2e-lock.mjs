// QA E2E 第 8 輪（PRD v0.18，R-26）：顯示全部時曾答對的題目為綠色鎖定（US-48，AC-48-01～AC-48-12，E-124～E-134）
// 依據：PRD v0.18 US-48；契約 v0.18 §5.11 LV-1～LV-7、SM-1～SM-3、HN-1、CR-10、UO-7、UO-8、UO-10、V-ST-23～V-ST-27；architecture v0.13 §7.24、§10.10。
// 驅動：tests/e2e/lib/cdp.mjs（file://）。輸入一律用真實事件：Input.dispatchMouseEvent（滑鼠）、Input.dispatchTouchEvent（觸控）、Input.dispatchKeyEvent（鍵盤）。
// v1.1.0 對照：git f57145a 的 dist/english-master-track.html（AC-48-08，實際作答產生資料，不以手寫資料代替）。
// 測試資料題庫：複製 src/data 到暫存目錄，改 part5.js 後以 tools/build.mjs --data --no-site 建置（AC-48-09 (c)(d)）；無內建資料 fixture（AC-48-12 題庫為空）。
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { launch, recorder, sleep, FILE_URL, ROOT, resultPath } from "./lib/cdp.mjs";
import { TOAST_RECORDER, fakeTts, fakeStt, fakeMic, fakeVibrate, storageMode } from "./lib/inits.mjs";
import { KEY, stateRecord, dialogInfo, expandBackup } from "./lib/state.mjs";

const R = recorder("e2e-lock");
const TMP = process.env.QA_TMP || path.join(ROOT, "tests", "results", "tmp");
fs.mkdirSync(TMP, { recursive: true });
const J = (x) => JSON.stringify(x);
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const TODAY = ymd(new Date());
const YESTERDAY = ymd(new Date(Date.now() - 86400000));
const id = (n) => "p5-" + String(n).padStart(3, "0");
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => id(a + i));
const ACCENT = "rgb(247, 137, 59)";
const LOCK_FB = "你之前答對過這一題";
const NONE = "本輪沒有新作答的題目";
const HINT = "關閉時顯示全部題目，答對過的題目會以綠色鎖定。";
const HINT_ALL = "要檢視全部題目，請關閉上方的「只練沒答對的題目」。";
const CLEAR = "清除答對紀錄，重新來過";
const NOTE = "題型參考 TOEIC®（多益）Part 5，非 ETS 官方或認可內容";
const countText = (k, q = 200) => `已答對 ${k} / ${q} 題`;

// 計 setItem（只計主鍵）與未處理錯誤；以 sessionStorage 無關，每次載入歸 0
const COUNT_SET = `(() => { window.__sets = 0; const o = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (k === ${J(KEY)}) window.__sets++; return o.call(this, k, v); }; })();`;

async function open({ vp = [1366, 900], chooser = false, reduced = true, inits = [] } = {}) {
  const p = await launch();
  for (const s of [TOAST_RECORDER, fakeTts("ok"), fakeStt("ok"), fakeMic("ok"), fakeVibrate("stub"), ...inits]) await p.addInitScript(s);
  await p.viewport(vp[0], vp[1]);
  await p.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: reduced ? "reduce" : "no-preference" }] });
  if (chooser) { await p.send("Page.setInterceptFileChooserDialog", { enabled: true }); p.onEvent((m) => { if (m.method === "Page.fileChooserOpened") p.chooser = m.params; }); }
  return p;
}
const lsRaw = (p) => p.ev(`localStorage.getItem(${J(KEY)})`);
const ls = async (p) => JSON.parse(await lsRaw(p));
const errs = (p) => p.log.exceptions.concat(p.log.console.filter((c) => c.type === "error").map((c) => c.text));
const netReqs = (p) => p.log.requests.filter((r) => !/^(file|blob|data|about):/.test(r.url));
const toasts = (p) => p.ev(`(window.__qaToasts || []).map((t) => t.text)`);
const P5 = (over = {}) => ({ currentIndex: 0, lockedSelection: null, phase: "question", roundAnswered: 0, roundCorrect: 0, totalAnswered: 0, totalCorrect: 0, ...over });
async function seed(p, { part5 = {}, ids = [], only = false, over = {} } = {}) {
  const rec = stateRecord(725, { part5: P5(part5), part5CorrectIds: ids, part5UnansweredOnly: only, ...over });
  await p.ev(`localStorage.setItem(${J(KEY)}, ${J(J(rec))})`); await p.reload(); await p.go("part5"); await sleep(60);
  return rec;
}
const ci = (p, i) => p.ev(`PART5_QUESTION_BANK[${i}].correctIndex`);
/** 模擬測驗畫面資訊 */
const info = (p) => p.ev(`(() => { const v = document.getElementById("view-part5"); const q = (s) => v.querySelector(s); const t = (s) => (q(s) ? q(s).textContent : null); const n = (s) => v.querySelectorAll(s).length;
  const only = q("[data-p5=only]"); const opts = [...v.querySelectorAll("[data-p5=option]")]; const bar = q(".p5-progress");
  return { number: t("[data-p5=number]"), count: t("[data-p5=correct-count]"), badge: t("[data-p5=correct-badge]"), badges: n("[data-p5=correct-badge]"), only: only ? only.checked : null, onlies: n("[data-p5=only]"),
    optCount: opts.length, optDisabled: opts.filter((o) => o.disabled).length, pressedTrue: opts.filter((o) => o.getAttribute("aria-pressed") === "true").length, optStates: opts.map((o) => o.dataset.state).join(","), optBadges: opts.map((o) => (o.querySelector(".p5-option__badge") || {}).textContent || ""),
    feedback: t("[data-p5=feedback]"), feedbacks: n("[data-p5=feedback]"), core: t("[data-p5=core]"), coreTitle: t("[data-p5=core-title]"), structure: t("[data-p5=structure]"), structureTitle: t("[data-p5=structure-title]"), warn: t(".p5-warning"),
    next: !!q("[data-p5=next]"), nextDisabled: q("[data-p5=next]") ? q("[data-p5=next]").disabled : null, allCorrect: !!q("[data-p5=allcorrect-title]"), title: t("[data-p5=allcorrect-title]"), score: t("[data-p5=summary-score]"), none: t("[data-p5=summary-none]"), total: t("[data-p5=summary-answered]"), summaryTitle: t("[data-p5=summary-title]"), summaryText: q(".p5-summary") ? q(".p5-summary").innerText : null,
    restart: !!q("[data-p5=restart]"), hint: t("[data-p5=filter-hint]"), hints: n("[data-p5=filter-hint]"), clear: t("[data-p5=clear]"), clearCount: n("[data-p5=clear]"), clearInRecord: !!q(".p5-record [data-p5=clear]"), clearClass: q("[data-p5=clear]") ? q("[data-p5=clear]").className : null,
    qIndex: q(".p5-question") ? Number(q(".p5-question").dataset.index) : null, bar: bar ? { now: bar.getAttribute("aria-valuenow"), max: bar.getAttribute("aria-valuemax") } : null, text: v.innerText, html: v.textContent }; })()`);
const isLR = (a) => a.optCount === 4 && a.optDisabled === 4 && a.pressedTrue === 0 && a.feedback === LOCK_FB && a.badge === "✓ 曾答對" && a.next && !a.nextDisabled;
const isIdle = (a) => a.optCount === 4 && a.optDisabled === 0 && !a.badge && a.feedback === null && !a.next;
const answer = async (p, i, correct = true) => { const c = await ci(p, i); await p.click(`#view-part5 [data-p5=option][data-index="${correct ? c : (c + 1) % 4}"]`); await sleep(80); };
const next = async (p) => { await p.click("#view-part5 [data-p5=next]"); await sleep(50); };
const pressEnter = async (p) => { await p.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: "\r" }); await p.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 }); await sleep(60); };
const pressSpace = async (p) => { await p.send("Input.dispatchKeyEvent", { type: "keyDown", key: " ", code: "Space", windowsVirtualKeyCode: 32, text: " " }); await p.send("Input.dispatchKeyEvent", { type: "keyUp", key: " ", code: "Space", windowsVirtualKeyCode: 32 }); await sleep(60); };
const clickTimed = (p, sel, condJs) => p.ev(`(async () => { const el = document.querySelector(${J(sel)}); if (!el) return { ms: null, err: "無元素" };
  const t0 = performance.now(); el.click(); const cond = () => { try { return !!(${condJs}); } catch (e) { return false; } };
  for (let i = 0; i < 120; i++) { await new Promise((r) => requestAnimationFrame(() => r())); if (cond()) return { ms: Math.round((performance.now() - t0) * 10) / 10 }; }
  return { ms: null, err: "條件未成立" }; })()`);
const numberIs = (n) => `document.querySelector("#view-part5 [data-p5=number]") && document.querySelector("#view-part5 [data-p5=number]").textContent === "第 ${n} / 200 題"`;
/** 對比：文字色對實際背景（向上找第一個不透明背景） */
const contrastJs = (sel) => `(() => { const el = document.querySelector(${J(sel)}); if (!el) return null; const rgb = (s) => (s.match(/[\\d.]+/g) || []).map(Number);
  const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  let bgEl = el, bg = null; while (bgEl) { const c = rgb(getComputedStyle(bgEl).backgroundColor); if (c.length >= 3 && (c.length < 4 || c[3] > 0.5)) { bg = c; break; } bgEl = bgEl.parentElement; } bg = bg || [255, 255, 255];
  const fg = rgb(getComputedStyle(el).color); const L1 = lum(fg), L2 = lum(bg); return { ratio: Math.round(((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)) * 100) / 100, fg: getComputedStyle(el).color, bg: "rgb(" + bg.slice(0, 3).join(", ") + ")" }; })()`;
const optStyles = (p) => p.ev(`[...document.querySelectorAll("#view-part5 [data-p5=option]")].map((o) => { const c = getComputedStyle(o); return { state: o.dataset.state, bg: c.backgroundColor, border: c.borderTopColor, color: c.color, opacity: c.opacity }; })`);
const dashAcc = (p) => p.ev(`(() => { EMT.router.go("dashboard"); const e = document.querySelector("#view-dashboard .db-stat--answered .db-stat__value"); const r = e ? e.innerText.replace(/\\s+/g, "") : null; EMT.router.go("part5"); return r; })()`);
const hscroll = (p) => p.ev(`document.documentElement.scrollWidth > document.documentElement.clientWidth`);
const part5Of = (s) => s.data.part5;
const CORE = (s) => J({ a: part5Of(s).totalAnswered, c: part5Of(s).totalCorrect, x: part5Of(s).roundCorrect, y: part5Of(s).roundAnswered, ids: s.data.part5CorrectIds, streak: s.data.streak, today: s.data.todayLearned });

// ═════════ AC-48-01：兩種寬度、兩種動態設定 ═════════
for (const [w, h] of [[375, 667], [1366, 900]]) {
  const p = await open({ vp: [w, h] }); await p.goto();
  await R.check(`TC-48-01-${w}`, "AC-48-01、AC-45-04、AC-38-03、AC-38-04、AC-40-02、LV-2", async () => {
    // 先取「本次答對」的綠色作為比較基準（AC-38-03 同色）
    await seed(p, { part5: { currentIndex: 7 } }); await answer(p, 7, true); const refStyles = await optStyles(p); const ref = refStyles.find((o) => o.state === "correct");
    await seed(p, { part5: { currentIndex: 3 }, ids: ["p5-005"] }); await answer(p, 3, false);
    const m = await clickTimed(p, "#view-part5 [data-p5=next]", numberIs(5)); await sleep(60);
    const a = await info(p); const st = await optStyles(p); const c = await ci(p, 4);
    const correct = st[c]; const others = st.filter((_, i) => i !== c);
    const refWrong = "rgb(254, 242, 242)";
    const fbCt = await p.ev(contrastJs("#view-part5 [data-p5=feedback]"));
    const clip = await p.ev(`(() => { const vw = document.documentElement.clientWidth; const bad = [...document.querySelectorAll("#view-part5 [data-p5=option], #view-part5 [data-p5=feedback], #view-part5 [data-p5=next], #view-part5 [data-p5=core], #view-part5 [data-p5=structure]")].filter((e) => { const r = e.getBoundingClientRect(); return r.left < 0 || r.right > vw + 0.5 || e.scrollWidth > e.clientWidth + 1; }).map((e) => e.dataset.p5); return bad; })()`);
    const hs = await hscroll(p);
    const banned = ["你的選擇", "答對了！", "答錯了"].filter((t) => a.text.includes(t));
    const redo = /上一題|重新作答|重做/.test(a.text);
    // 「下一題」可用鍵盤操作：Tab 到達後 Enter
    await p.ev(`document.activeElement && document.activeElement.blur(); window.scrollTo(0, 0)`);
    let kb = false; for (let k = 0; k < 40 && !kb; k++) { await p.key("Tab", "Tab", 9); kb = await p.ev(`document.activeElement && document.activeElement.dataset.p5 === "next"`); }
    const ring = await p.ev(`(() => { const c = getComputedStyle(document.activeElement); return c.outlineStyle + " " + c.outlineWidth; })()`);
    await pressEnter(p); await sleep(40); const af = await info(p);
    const ok = m.ms !== null && m.ms <= 100 && a.number === "第 5 / 200 題" && isLR(a) && a.optStates.split(",")[c] === "correct" && a.optStates.split(",").filter((s) => s === "locked").length === 3
      && a.optBadges[c] === "正確答案" && a.optBadges.filter(Boolean).length === 1 && correct.bg === ref.bg && correct.border === ref.border && others.every((o) => o.bg !== ref.bg && o.bg !== refWrong)
      && banned.length === 0 && !redo && a.coreTitle === "解題核心思路" && /^句型語法拆解/.test(a.structureTitle || "") && !!(a.core || "").trim() && !!(a.structure || "").trim() && fbCt.ratio >= 4.5 && clip.length === 0 && !hs && kb && af.number === "第 6 / 200 題";
    return { ok, note: `${w}px：下一題 ${m.ms} ms →「${a.number}」「${a.badge}」；選項狀態 ${a.optStates}、disabled ${a.optDisabled}/4、aria-pressed=true ${a.pressedTrue}、選項標記 ${J(a.optBadges)}；正解背景 ${correct.bg} 與本次答對 ${ref.bg} 同色=${correct.bg === ref.bg}；其他選項背景 ${[...new Set(others.map((o) => o.bg))].join("/")}；回饋「${a.feedback}」對比 ${fbCt.ratio}；禁止文字 ${banned.join("/") || "無"}；單題重做或上一題=${redo}；解析兩段非空=${!!(a.core || "").trim() && !!(a.structure || "").trim()}；裁切 ${clip.join("/") || "無"}、水平捲軸=${hs}；Tab 到「下一題」=${kb}（焦點框 ${ring}）、Enter →「${af.number}」` };
  });
  await R.check(`TC-X-lock-${w}`, "Console 無未處理錯誤、無網路請求", async () => ({ ok: errs(p).length === 0 && netReqs(p).length === 0, note: `錯誤 ${J(errs(p)).slice(0, 300)}；非 file 請求 ${netReqs(p).length}` }));
  await p.close();
}
{
  const p = await open({ vp: [1366, 900], reduced: false }); await p.goto();
  await R.check("TC-48-01m", "AC-48-01（減少動態關閉時結果相同）、AC-31-03", async () => {
    await seed(p, { part5: { currentIndex: 3 }, ids: ["p5-005"] }); await answer(p, 3, false); await next(p); const a = await info(p);
    await p.close();
    const q = await open({ vp: [1366, 900], reduced: true }); await q.goto(); await seed(q, { part5: { currentIndex: 3 }, ids: ["p5-005"] }); await answer(q, 3, false); await next(q); const b = await info(q); await q.close();
    const same = a.optStates === b.optStates && a.feedback === b.feedback && a.number === b.number && a.badge === b.badge;
    return { ok: isLR(a) && isLR(b) && same, note: `無減少動態「${a.number}」${a.optStates}「${a.feedback}」；減少動態「${b.number}」${b.optStates}「${b.feedback}」；相同=${same}` };
  });
}

// ═════════ AC-48-02：滑鼠、觸控、鍵盤實測 ═════════
{
  const st0 = { part5: { currentIndex: 4, totalAnswered: 9, totalCorrect: 6, roundAnswered: 3, roundCorrect: 2 }, ids: ["p5-001", "p5-005"], over: { streak: { days: 5, lastActiveDate: YESTERDAY }, todayLearned: { date: TODAY, wordKeys: ["the", "be"] } } };
  /** 共用判定：畫面仍為第 5 題鎖定檢視、資料與 setItem、震動、動畫都不變 */
  const verify = async (p, label, base, baseRaw, extra = {}) => {
    const a = await info(p); const raw = await lsRaw(p); const sets = await p.ev("window.__sets"); const vib = await p.ev("window.__qaVib.length");
    const anim = await p.ev(`[...document.querySelectorAll("#view-part5 [data-p5=option]")].filter((o) => /p5-opt--(pop|shake)/.test(o.className) || o.getAnimations().length > 0).length`);
    const ok = isLR(a) && a.number === "第 5 / 200 題" && a.count === countText(2) && raw === baseRaw && sets === 0 && vib === 0 && anim === 0 && errs(p).length === 0;
    return { ok, note: `${label}：鎖定檢視=${isLR(a)}、「${a.number}」「${a.count}」、localStorage 不變=${raw === baseRaw}、setItem ${sets}、vibrate ${vib}、動畫 ${anim}、錯誤 ${errs(p).length}${extra.note ? "；" + extra.note : ""}` };
  };
  // 滑鼠
  {
    const p = await open({ inits: [COUNT_SET] }); await p.goto();
    await R.check("TC-48-02-mouse", "AC-48-02、E-124、LV-4", async () => {
      await seed(p, st0); const base = await ls(p); const raw = await lsRaw(p); const acc0 = await dashAcc(p); await sleep(60); await p.ev("window.__sets = 0");
      const hits = []; for (let k = 0; k < 4; k++) { hits.push(await p.click("#view-part5 [data-p5=option]", k)); await sleep(30); }
      // 連點同一選項（dblclick）
      await p.click("#view-part5 [data-p5=option]", 0); await p.click("#view-part5 [data-p5=option]", 0);
      const r1 = await verify(p, "滑鼠點 4 個選項與連點", base, raw, { note: `點擊命中選項 ${hits.filter(Boolean).length}/4` });
      // 重新載入
      await p.reload(); await p.go("part5"); await sleep(60); const sets = await p.ev("window.__sets"); const a = await info(p); const raw2 = await lsRaw(p);
      // 按「下一題」：只有導航，a、c、x、y、K、打卡、今日已學不變（currentIndex 寫入 1 次）
      await next(p); const b = await info(p); const s2 = await ls(p); const acc1 = await dashAcc(p);
      const ok = r1.ok && hits.every(Boolean) && sets === 0 && raw2 === raw && isLR(a) && b.number === "第 6 / 200 題" && isIdle(b) && CORE(s2) === CORE(base) && acc0 === acc1;
      return { ok, note: `${r1.note}；重新載入 setItem ${sets}、鎖定檢視=${isLR(a)}、資料不變=${raw2 === raw}；下一題「${b.number}」統計不變=${CORE(s2) === CORE(base)}（${CORE(s2)}）；主控台第 3 格 ${acc0}→${acc1}` };
    });
    await p.close();
  }
  // 觸控（真實 touchStart／touchEnd，375px）
  {
    const p = await open({ vp: [375, 667], inits: [COUNT_SET] }); await p.goto();
    await R.check("TC-48-02-touch", "AC-48-02、E-124、AC-28-06", async () => {
      await seed(p, st0); const base = await ls(p); const raw = await lsRaw(p); await p.ev("window.__sets = 0");
      const pts = []; for (let k = 0; k < 4; k++) { pts.push(await p.tap("#view-part5 [data-p5=option]", k)); await sleep(50); }
      // 確認觸控輸入路徑有效：同一方式點未作答題會作答（對照組）
      const r1 = await verify(p, "觸控點 4 個選項", base, raw, { note: `觸控命中選項 ${pts.filter((x) => x.hitOk).length}/4、大小 ${Math.round(pts[0].w)}×${Math.round(pts[0].h)}` });
      await p.reload(); await p.go("part5"); const a = await info(p); const sets = await p.ev("window.__sets");
      await p.tap("#view-part5 [data-p5=next]"); await sleep(120); const b = await info(p); const s1 = await ls(p);
      const c5 = await ci(p, 5); await p.tap(`#view-part5 [data-p5=option][data-index="${(c5 + 1) % 4}"]`); await sleep(150); const c = await info(p); const s2 = await ls(p); const vibCtl = await p.ev("window.__qaVib.length");
      const ok = r1.ok && pts.every((x) => x.hitOk) && isLR(a) && sets === 0 && b.number === "第 6 / 200 題" && isIdle(b) && CORE(s1) === CORE(base) && /^答錯了/.test(c.feedback || "") && part5Of(s2).totalAnswered === 10 && vibCtl === 1;
      return { ok, note: `${r1.note}；重新載入 setItem ${sets}；觸控下一題「${b.number}」統計不變=${CORE(s1) === CORE(base)}；對照組（同一觸控路徑點未作答的 p5-006）回饋「${c.feedback}」、累計 ${part5Of(s2).totalAnswered}、vibrate ${vibCtl} 次（證明觸控事件確實送達）` };
    });
    await R.check("TC-48-02-swipe", "AC-48-02、AC-28-06（鎖定檢視在選項上滑動）", async () => {
      await seed(p, st0); const raw = await lsRaw(p); await p.ev("window.__sets = 0");
      await p.swipe("#view-part5 [data-p5=option]", 0, -60, { nth: 1 }); await sleep(150);
      return await verify(p, "在選項上滑動", null, raw);
    });
    await p.close();
  }
  // 鍵盤（真實按鍵）
  {
    const p = await open({ inits: [COUNT_SET] }); await p.goto();
    await R.check("TC-48-02-kbd", "AC-48-02、E-124、AC-38-09", async () => {
      await seed(p, st0); const base = await ls(p); const raw = await lsRaw(p); await p.ev("window.__sets = 0");
      // (1) Tab 走完全頁一圈：選項不可取得焦點（disabled）
      await p.ev(`document.activeElement && document.activeElement.blur(); window.scrollTo(0, 0)`);
      const seq = []; for (let k = 0; k < 45; k++) { await p.key("Tab", "Tab", 9); seq.push(await p.ev(`document.activeElement ? (document.activeElement.dataset.p5 || document.activeElement.id || document.activeElement.tagName) : "none"`)); }
      const optFocused = seq.filter((x) => x === "option").length; const reachedNext = seq.includes("next");
      // (2) 程式嘗試聚焦選項後按 Enter、空白鍵（disabled 不接受焦點；事件落在 body）
      for (let k = 0; k < 4; k++) { await p.ev(`document.activeElement && document.activeElement.blur(); document.querySelectorAll("#view-part5 [data-p5=option]")[${k}].focus()`); const f = await p.ev(`document.activeElement && document.activeElement.dataset.p5 === "option"`); if (f) seq.push("focus-option"); await pressEnter(p); await pressSpace(p); }
      const a0 = await info(p);
      // (3) 選項快捷鍵不應存在：A～D、1～4
      await p.ev(`document.activeElement && document.activeElement.blur()`);
      for (const [key, code, vk] of [["a", "KeyA", 65], ["b", "KeyB", 66], ["c", "KeyC", 67], ["d", "KeyD", 68], ["1", "Digit1", 49], ["2", "Digit2", 50], ["3", "Digit3", 51], ["4", "Digit4", 52]]) { await p.send("Input.dispatchKeyEvent", { type: "keyDown", key, code, windowsVirtualKeyCode: vk, text: key }); await p.send("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode: vk }); }
      await sleep(40);
      const r1 = await verify(p, "鍵盤", base, raw, { note: `Tab ${seq.length} 次：選項取得焦點 ${optFocused} 次、focus() 落在選項 ${seq.filter((x) => x === "focus-option").length} 次、到達下一題=${reachedNext}；按 Enter、空白鍵、A～D、1～4 無反應` });
      // (4) 重新載入與鍵盤「下一題」
      await p.reload(); await p.go("part5"); const sets = await p.ev("window.__sets"); await p.ev(`document.querySelector("#view-part5 [data-p5=next]").focus()`); await pressEnter(p); await sleep(40); const b = await info(p); const s1 = await ls(p);
      const c = await ci(p, 5); await p.ev(`document.querySelectorAll("#view-part5 [data-p5=option]")[${c}].focus()`); await pressEnter(p); await sleep(100); const d = await info(p); const s2 = await ls(p);
      const ok = r1.ok && optFocused === 0 && !seq.includes("focus-option") && reachedNext && a0.number === "第 5 / 200 題" && sets === 0 && b.number === "第 6 / 200 題" && isIdle(b) && CORE(s1) === CORE(base) && d.feedback === "答對了！" && part5Of(s2).totalAnswered === 10;
      return { ok, note: `${r1.note}；重新載入 setItem ${sets}；Enter 下一題「${b.number}」統計不變=${CORE(s1) === CORE(base)}；對照組（鍵盤對未作答 p5-006 按 Enter）回饋「${d.feedback}」累計 ${part5Of(s2).totalAnswered}（證明鍵盤事件有效）` };
    });
    await R.check("TC-48-02-force", "AC-48-02、V-ST-23（移除 disabled 後強制點擊、直接呼叫 store，防禦層）", async () => {
      await seed(p, st0); const raw = await lsRaw(p); await p.ev("window.__sets = 0");
      await p.ev(`document.querySelectorAll("#view-part5 [data-p5=option]").forEach((o) => { o.disabled = false; o.click(); })`); await sleep(40);
      const r = await p.ev(`EMT.store.actions.answerPart5(0)`); await sleep(40);
      const raw1 = await lsRaw(p); const sets = await p.ev("window.__sets"); const vib = await p.ev("window.__qaVib.length"); const anim = await p.ev(`[...document.querySelectorAll("#view-part5 [data-p5=option]")].filter((o) => /p5-opt--(pop|shake)/.test(o.className)).length`); const st = await p.ev(`EMT.store.getState().data.part5.lockedSelection`);
      await p.go("dashboard"); await p.go("part5"); await sleep(50); const a = await info(p);
      return { ok: raw1 === raw && sets === 0 && vib === 0 && anim === 0 && st === null && r && r.ok === false && isLR(a) && errs(p).length === 0, note: `移除 disabled 後 click 4 個選項、直接呼叫 answerPart5（回傳 ${J(r)}）：localStorage 不變=${raw1 === raw}、setItem ${sets}、vibrate ${vib}、動畫 ${anim}、lockedSelection ${st}；重繪後鎖定檢視=${isLR(a)}` };
    });
    await p.close();
  }
}

// ═════════ AC-48-03～AC-48-07、AC-48-10（1366） ═════════
{
  const p = await open({ inits: [COUNT_SET] }); await p.goto();
  await R.check("TC-48-03", "AC-48-03、AC-45-04、AC-40-01、UO-10", async () => {
    await seed(p, { ids: ["p5-001", "p5-002"], part5: { totalAnswered: 3, totalCorrect: 2 } });
    // p5-004 答錯過：先走一次真實流程建立「答錯過且未曾答對」
    const a1 = await info(p);
    const m1 = await clickTimed(p, "#view-part5 [data-p5=next]", numberIs(2)); await sleep(50); const a2 = await info(p);
    const m2 = await clickTimed(p, "#view-part5 [data-p5=next]", numberIs(3)); await sleep(50); const a3 = await info(p);
    const c2 = await ci(p, 2); await p.click(`#view-part5 [data-p5=option][data-index="${c2}"]`); await sleep(80); const a3b = await info(p);
    const m3 = await clickTimed(p, "#view-part5 [data-p5=next]", numberIs(4)); await sleep(50); const a4 = await info(p);
    const noWrong = !/答錯過|未答對/.test(a4.text.replace("只練沒答對的題目", ""));
    const c3 = await ci(p, 3); await p.click(`#view-part5 [data-p5=option][data-index="${(c3 + 1) % 4}"]`); await sleep(80); const a4b = await info(p); const st = await ls(p);
    const ok = isLR(a1) && isLR(a2) && a2.bar.now === "2" && isIdle(a3) && a3.bar.now === "3" && a3b.feedback === "答對了！" && isIdle(a4) && a4.bar.now === "4" && noWrong && /^答錯了/.test(a4b.feedback || "") && !a4b.badge && [m1, m2, m3].every((m) => m.ms !== null && m.ms <= 100) && J(st.data.part5CorrectIds) === J(["p5-001", "p5-002", "p5-003"]);
    return { ok, note: `p5-001、002 鎖定檢視=${isLR(a1)}/${isLR(a2)}；p5-003 未作答=${isIdle(a3)}（無「下一題」、無標示）、作答「${a3b.feedback}」；p5-004 未作答=${isIdle(a4)}、無答錯過標示=${noWrong}、可作答「${a4b.feedback}」；下一題 ${m1.ms}/${m2.ms}/${m3.ms} ms；進度 ${a2.bar.now}/${a3.bar.now}/${a4.bar.now}` };
  });
  await R.check("TC-48-04", "AC-48-04、AC-11-07、UO-6", async () => {
    const run = async (ids, wantLR) => {
      await seed(p, { part5: { currentIndex: 199, phase: "summary", roundAnswered: 4, roundCorrect: 2, totalAnswered: 9, totalCorrect: 5 }, ids });
      const s0 = await info(p); await p.click("#view-part5 [data-p5=restart]"); await sleep(70); const a = await info(p); const st = await ls(p);
      await p.reload(); await p.go("part5"); await sleep(50); const b = await info(p); const st2 = await ls(p);
      const good = (x) => x.number === "第 1 / 200 題" && x.bar.now === "1" && (wantLR ? isLR(x) : isIdle(x));
      const ok = s0.score === "答對 2 / 4" && good(a) && good(b) && part5Of(st).roundAnswered === 0 && part5Of(st).roundCorrect === 0 && part5Of(st).totalAnswered === 9 && part5Of(st).totalCorrect === 5 && J(st.data.part5CorrectIds) === J(ids) && J(st2.data.part5) === J(st.data.part5);
      return { ok, note: `${wantLR ? "(a) p5-001 曾答對" : "(b) p5-001 未曾答對"}：結算「${s0.score}」→「${a.number}」進度 ${a.bar.now}/${a.bar.max}、${wantLR ? "鎖定檢視" : "未作答"}=${good(a)}；本輪 ${part5Of(st).roundAnswered}/${part5Of(st).roundCorrect}、累計 ${part5Of(st).totalAnswered}/${part5Of(st).totalCorrect}、「${a.count}」；重新載入相同=${good(b)}` };
    };
    const A = await run(["p5-001", "p5-050"], true); const B = await run(["p5-050"], false);
    return { ok: A.ok && B.ok, note: A.note + "；" + B.note };
  });
  await R.check("TC-48-05", "AC-48-05、AC-11-05、LV-4", async () => {
    const out = []; let ok = true;
    const three = async (check, label) => {
      await p.reload(); await p.go("part5"); await sleep(50); const a = await info(p);
      await p.go("flashcards"); await sleep(50); await p.go("part5"); await sleep(50); const b = await info(p);
      await p.goto("about:blank", { waitReady: false }); await sleep(300); await p.goto(); await p.go("part5"); await sleep(50); const c = await info(p);
      const good = check(a) && check(b) && check(c); ok = ok && good; out.push(`${label}：重新載入／切換功能區／關閉重開 = ${check(a)}/${check(b)}/${check(c)}（「${c.number}」「${c.feedback}」）`); return good;
    };
    // (a)
    const rec = await seed(p, { part5: { currentIndex: 49, totalAnswered: 8, totalCorrect: 4, roundAnswered: 2, roundCorrect: 1 }, ids: ["p5-050"] });
    const raw0 = await lsRaw(p); await three((x) => isLR(x) && x.number === "第 50 / 200 題", "(a) p5-050 鎖定檢視");
    const raw1 = await lsRaw(p); const same = raw0 === raw1; ok = ok && same; out.push(`(a) localStorage 不變=${same}`);
    // (b) 剛答對 p5-051
    await next(p); const c50 = await ci(p, 50); await p.click(`#view-part5 [data-p5=option][data-index="${c50}"]`); await sleep(100); const just = await info(p); const s1 = await ls(p);
    await three((x) => x.number === "第 51 / 200 題" && x.feedback === "答對了！" && x.optDisabled === 4 && x.badge === "✓ 曾答對" && !!x.core && x.next && x.optStates.includes("correct"), "(b) p5-051 本次作答結果");
    const s2 = await ls(p); const sameCounts = J(part5Of(s1)) === J(part5Of(s2)); ok = ok && sameCounts && just.feedback === "答對了！"; out.push(`(b) 統計不變=${sameCounts}（累計 ${part5Of(s2).totalAnswered}/${part5Of(s2).totalCorrect}、本輪 ${part5Of(s2).roundAnswered}/${part5Of(s2).roundCorrect}）`);
    // 離開後「重新開始」回到 p5-051：改為鎖定文字
    await next(p); const after = await info(p);
    const r = JSON.parse(await lsRaw(p)); r.data.part5.currentIndex = 199; r.data.part5.lockedSelection = null; r.data.part5.phase = "summary"; await p.ev(`localStorage.setItem(${J(KEY)}, ${J(J(r))})`); await p.reload(); await p.go("part5"); await sleep(50);
    await p.click("#view-part5 [data-p5=restart]"); await sleep(60); const r1 = await info(p);
    const walk = await p.ev(`(async () => { const btn = () => document.querySelector("#view-part5 [data-p5=next]"); const opt = (i) => document.querySelectorAll("#view-part5 [data-p5=option]")[i]; for (let i = 0; i < 50; i++) { if (!btn()) { const q = PART5_QUESTION_BANK[EMT.store.getState().data.part5.currentIndex]; opt((q.correctIndex + 1) % 4).click(); await new Promise((r) => setTimeout(r, 5)); } btn().click(); await new Promise((r) => setTimeout(r, 5)); } return document.querySelector("#view-part5 [data-p5=number]").textContent; })()`);
    const back = await info(p); const good = after.number === "第 52 / 200 題" && r1.number === "第 1 / 200 題" && walk === "第 51 / 200 題" && isLR(back) && back.feedback === LOCK_FB; ok = ok && good;
    out.push(`按「下一題」離開「${after.number}」；再經「重新開始」回到「${back.number}」→ 鎖定文字「${back.feedback}」鎖定檢視=${isLR(back)}`);
    return { ok, note: out.join("；") };
  });
  await R.check("TC-48-06-1366", "AC-48-06、AC-11-04、SM-1、SM-2、E-125、E-27", async () => {
    const out = []; let ok = true;
    const summaryClean = (a) => !/0 \/ 0|NaN|Infinity|undefined|%/.test((a.summaryText || "").replace(a.total || "", "")); // v0.19：「%」只可在已答對行（AC-48-06）
    // 開關關閉、a ≥ 1
    await seed(p, { part5: { currentIndex: 198, totalAnswered: 12, totalCorrect: 7 }, ids: range(199, 200) }); await next(p); const q1 = await info(p); await next(p); const a = await info(p);
    const g1 = q1.number === "第 200 / 200 題" && isLR(q1) && a.summaryTitle === "本輪結算" && a.none === NONE && a.score === null && a.total === "已答對 2 / 200 題（1%）" && a.bar.now === a.bar.max && a.restart && summaryClean(a); ok = ok && g1;
    out.push(`關閉 a ≥ 1：「${a.summaryTitle}」「${a.none}」「${a.total}」進度 ${a.bar.now}/${a.bar.max}、結算區乾淨=${summaryClean(a)}`);
    // 開關關閉、a = 0
    await seed(p, { part5: { currentIndex: 199 }, ids: ["p5-200"] }); await next(p); const b = await info(p);
    const g2 = b.none === NONE && b.score === null && b.total === "已答對 1 / 200 題（1%）" && b.restart && b.bar.now === b.bar.max && summaryClean(b); ok = ok && g2;
    out.push(`關閉 a = 0：「${b.none}」累計行 ${b.total}、結算區乾淨=${summaryClean(b)}（${J(b.summaryText)}）`);
    await p.reload(); await p.go("part5"); const b2 = await info(p); ok = ok && b2.none === NONE && b2.total === "已答對 1 / 200 題（1%）"; out.push(`重新載入仍為 y = 0 結算=${b2.none === NONE}`);
    // 開關開啟、K < Q、開啟當下其後已無未答對
    await seed(p, { part5: { currentIndex: 9, totalAnswered: 5, totalCorrect: 3 }, ids: range(10, 200) }); await p.click("#view-part5 [data-p5=only-label]"); await sleep(80); const c = await info(p);
    const g3 = c.only === true && c.none === NONE && c.score === null && c.total === "已答對 191 / 200 題（96%）" && c.bar.now === c.bar.max && summaryClean(c) && !c.allCorrect; ok = ok && g3;
    out.push(`開啟路徑 a ≥ 1：「${c.none}」「${c.total}」`);
    await seed(p, { part5: { currentIndex: 9 }, ids: range(10, 200) }); await p.click("#view-part5 [data-p5=only-label]"); await sleep(80); const d = await info(p);
    const g4 = d.none === NONE && d.total === "已答對 191 / 200 題（96%）" && summaryClean(d); ok = ok && g4; out.push(`開啟路徑 a = 0：「${d.none}」累計行 ${d.total}`);
    // y ≥ 1 回歸
    await seed(p, { part5: { currentIndex: 199, roundAnswered: 2, roundCorrect: 1, totalAnswered: 2, totalCorrect: 1 } }); await answer(p, 199, true); await next(p); const e = await info(p);
    const g5 = e.score === "答對 2 / 3" && e.none === null && e.total === "已答對 1 / 200 題（1%）"; ok = ok && g5; out.push(`y ≥ 1：「${e.score}」「${e.total}」`);
    return { ok, note: out.join("；") };
  });
  await R.check("TC-48-07", "AC-48-07、E-126、UO-8、UO-10", async () => {
    const i = 195; const Q = 200;
    await seed(p, { part5: { currentIndex: i - 1, totalAnswered: 10, totalCorrect: 8 }, ids: range(1, 200) });
    const a0 = await info(p); await p.reload(); await p.go("part5"); const a1 = await info(p);
    await p.go("dashboard"); await p.go("part5"); const a2 = await info(p);
    let presses = 0; const seen = []; while (presses < 50) { const x = await info(p); seen.push(x.number); if (x.none || x.summaryTitle) break; if (!isLR(x)) { seen.push("非鎖定：" + x.number); break; } if (x.clearCount !== 1) { seen.push("清除鈕 " + x.clearCount); break; } await next(p); presses++; }
    const s = await info(p); const expect = Q - i + 1;
    await p.click("#view-part5 [data-p5=restart]"); await sleep(60); const r = await info(p);
    await p.click("#view-part5 [data-p5=only-label]"); await sleep(80); const on = await info(p);
    await p.click("#view-part5 [data-p5=only-label]"); await sleep(80); const off = await info(p); const st = await ls(p);
    const ok = isLR(a0) && a0.number === `第 ${i} / 200 題` && !a0.allCorrect && isLR(a1) && a1.number === a0.number && isLR(a2) && presses === expect && s.none === NONE && s.total === "已答對 200 / 200 題（100%）" && s.clearCount === 1 && isLR(r) && r.number === "第 1 / 200 題" && r.clearCount === 1 && on.allCorrect && on.clearCount === 1 && !off.allCorrect && isLR(off) && off.number === "第 1 / 200 題" && off.clearCount === 1 && a0.count === countText(200) && s.count === countText(200) && off.count === countText(200) && st.data.part5CorrectIds.length === 200;
    return { ok, note: `第 ${i} 題鎖定檢視、進入／重新載入／切換功能區皆同；按「下一題」${presses} 次（Q − i + 1 = ${expect}）進入結算「${s.none}」「${s.total}」；重新開始「${r.number}」鎖定檢視=${isLR(r)}；開啟 → 全部答對=${on.allCorrect}；關閉 →「${off.number}」鎖定檢視=${isLR(off)}；全程清除鈕各 1 個、K = ${st.data.part5CorrectIds.length}；途中 ${seen.slice(0, 7).join("、")}` };
  });
  await R.check("TC-48-07b", "AC-48-07（i = 1 走完整輪）、AC-48-10（恰按 Q 次）", async () => {
    await seed(p, { ids: range(1, 200) });
    const n = await p.ev(`(async () => { let c = 0; while (c < 500) { const b = document.querySelector("#view-part5 [data-p5=next]"); if (!b) break; b.click(); c++; await new Promise((r) => setTimeout(r, 0)); } return c; })()`);
    const s = await info(p);
    return { ok: n === 200 && s.none === NONE && s.total === "已答對 200 / 200 題（100%）", note: `K = Q、i = 1：「下一題」${n} 次進入結算「${s.none}」「${s.total}」（a = 0 也顯示已答對行）` };
  });
  await R.check("TC-48-10", "AC-48-10、AC-46-09 (a)、AC-46-07 原驗證、E-111、UO-8、UO-7", async () => {
    const out = []; let ok = true;
    const afterOff = async (label) => {
      const s0 = await ls(p); const y0 = part5Of(s0).roundAnswered;
      const m = await clickTimed(p, "#view-part5 [data-p5=only-label]", numberIs(1)); await sleep(70); const a = await info(p); const s1 = await ls(p);
      await p.reload(); await p.go("part5"); await sleep(50); const b = await info(p);
      const n = await p.ev(`(async () => { let c = 0; while (c < 500) { const b = document.querySelector("#view-part5 [data-p5=next]"); if (!b) break; b.click(); c++; await new Promise((r) => setTimeout(r, 0)); } return c; })()`); const e = await info(p); const s2 = await ls(p);
      const good = a.only === false && a.number === "第 1 / 200 題" && isLR(a) && !a.allCorrect && !a.summaryTitle && m.ms !== null && m.ms <= 100 && part5Of(s1).roundAnswered === 0 && part5Of(s1).roundCorrect === 0 && part5Of(s1).totalAnswered === part5Of(s0).totalAnswered && part5Of(s1).totalCorrect === part5Of(s0).totalCorrect && s1.data.part5CorrectIds.length === 200 && a.count === countText(200)
        && b.only === false && isLR(b) && b.number === "第 1 / 200 題" && n === 200 && e.none === NONE && part5Of(s2).totalAnswered === part5Of(s0).totalAnswered;
      ok = ok && good; out.push(`${label}：關閉 ${m.ms} ms →「${a.number}」鎖定檢視=${isLR(a)}、本輪 ${y0}→${part5Of(s1).roundAnswered}、累計 ${part5Of(s1).totalAnswered}/${part5Of(s1).totalCorrect}、K ${s1.data.part5CorrectIds.length}；重新載入相同=${isLR(b)}；下一題 ${n} 次進結算「${e.none}」`);
    };
    // (a) 答對最後 1 題 → 下一題 → 全部答對
    await seed(p, { part5: { currentIndex: 199, totalAnswered: 50, totalCorrect: 40, roundAnswered: 5, roundCorrect: 4 }, ids: range(1, 199), only: true }); await answer(p, 199, true); await next(p); const a0 = await info(p); ok = ok && a0.allCorrect && a0.score === "答對 5 / 6"; await afterOff("(a) 作答結束進入");
    // (b) K = Q 時才開啟
    await seed(p, { part5: { currentIndex: 30, totalAnswered: 50, totalCorrect: 40 }, ids: range(1, 200) }); await p.click("#view-part5 [data-p5=only-label]"); await sleep(80); const b0 = await info(p); ok = ok && b0.allCorrect; await afterOff("(b) 才開啟進入");
    // (c) 開啟狀態重新載入
    await seed(p, { part5: { currentIndex: 30, totalAnswered: 50, totalCorrect: 40 }, ids: range(1, 200), only: true }); await p.reload(); await p.go("part5"); const c0 = await info(p); ok = ok && c0.allCorrect; await afterOff("(c) 重新載入進入");
    // 例外：剛答對最後 1 題、尚未按下一題時關閉 → 維持本次作答結果（AC-46-09 (a)）
    await seed(p, { part5: { currentIndex: 199, totalAnswered: 50, totalCorrect: 40, roundAnswered: 5, roundCorrect: 4 }, ids: range(1, 199), only: true }); await answer(p, 199, true); const s0 = await ls(p);
    await p.click("#view-part5 [data-p5=only-label]"); await sleep(80); const ex = await info(p); const s1 = await ls(p); await next(p); const ex2 = await info(p);
    const g = ex.only === false && ex.number === "第 200 / 200 題" && ex.feedback === "答對了！" && part5Of(s1).roundAnswered === part5Of(s0).roundAnswered && ex2.score === "答對 5 / 6" && !ex2.allCorrect && ex2.summaryTitle === "本輪結算"; ok = ok && g;
    out.push(`例外：答對當下關閉 → 維持「${ex.number}」「${ex.feedback}」本輪不歸 0；下一題 → 結算「${ex2.score}」`);
    return { ok, note: out.join("；") };
  });
  await R.check("TC-X-lock-flow", "Console 無未處理錯誤、無網路請求", async () => ({ ok: errs(p).length === 0 && netReqs(p).length === 0, note: `錯誤 ${J(errs(p)).slice(0, 300)}；非 file 請求 ${netReqs(p).length}` }));
  await p.close();
}

// ═════════ AC-48-06、AC-48-11、AC-48-12：375 與 1366 ═════════
for (const [w, h] of [[375, 667], [1366, 900]]) {
  const p = await open({ vp: [w, h], inits: [COUNT_SET] }); await p.goto();
  if (w === 375) await R.check("TC-48-06-375", "AC-48-06、AC-40-02、E-125", async () => {
    await seed(p, { part5: { currentIndex: 199, totalAnswered: 12, totalCorrect: 7 }, ids: ["p5-200"] }); await next(p); const a = await info(p); const hs = await hscroll(p);
    const clip = await p.ev(`(() => { const e = document.querySelector("#view-part5 [data-p5=summary-none]"); const r = e.getBoundingClientRect(); return r.left < 0 || r.right > document.documentElement.clientWidth || e.scrollWidth > e.clientWidth + 1; })()`);
    return { ok: a.none === NONE && a.total === "已答對 1 / 200 題（1%）" && a.score === null && !hs && !clip && !/0 \/ 0|NaN|Infinity|undefined|%/.test((a.summaryText || "").replace(a.total || "", "")), note: `375px：「${a.none}」「${a.total}」、水平捲軸=${hs}、裁切=${clip}` };
  });
  // 共用：建立 11 個畫面組合
  const SCREENS = {
    "關閉 idle": { part5: { currentIndex: 5 }, ids: ["p5-001"] },
    "關閉 answered": { part5: { currentIndex: 5, lockedSelection: 1, roundAnswered: 1, totalAnswered: 1 }, ids: ["p5-001"] },
    "關閉 lockedReview": { part5: { currentIndex: 0 }, ids: ["p5-001"] },
    "關閉 結算": { part5: { currentIndex: 199, phase: "summary", roundAnswered: 2, roundCorrect: 1, totalAnswered: 2, totalCorrect: 1 }, ids: ["p5-001"] },
    "關閉 K=Q 結算": { part5: { currentIndex: 199, phase: "summary" }, ids: range(1, 200) },
    "開啟 idle": { part5: { currentIndex: 5 }, ids: ["p5-001"], only: true },
    "開啟 answered": { part5: { currentIndex: 5, lockedSelection: 1, roundAnswered: 1, totalAnswered: 1 }, ids: ["p5-001"], only: true },
    "開啟 結算": { part5: { currentIndex: 199, phase: "summary", roundAnswered: 2, roundCorrect: 1, totalAnswered: 2, totalCorrect: 1 }, ids: ["p5-001"], only: true },
    "開啟 全部答對": { part5: { currentIndex: 5 }, ids: range(1, 200), only: true },
  };
  await R.check(`TC-48-11a-${w}`, "AC-48-11 (a)（每個畫面恰 1 個、位置、樣式、44×44、鍵盤）、AC-38-01、CR-10", async () => {
    const out = []; let ok = true;
    for (const [name, st] of Object.entries(SCREENS)) {
      await seed(p, st); const a = await info(p);
      const g = await p.ev(`(() => { const b = document.querySelector("#view-part5 [data-p5=clear]"); if (!b) return null; const r = b.getBoundingClientRect(); const cs = getComputedStyle(b); const vw = document.documentElement.clientWidth; const rec = document.querySelector("#view-part5 .p5-record");
        return { w: r.width, h: r.height, color: cs.color, bg: cs.backgroundColor, border: cs.borderTopColor, clipped: r.left < 0 || r.right > vw + 0.5 || b.scrollWidth > b.clientWidth + 1, inRecord: !!rec && rec.contains(b), hscroll: document.documentElement.scrollWidth > vw, disabled: b.disabled, tag: b.tagName, cls: b.className }; })()`);
      const isAll = a.allCorrect;
      const good = a.clearCount === 1 && a.clear === CLEAR && !!g && g.w >= 44 && g.h >= 44 && !g.clipped && !g.hscroll && !g.disabled && g.tag === "BUTTON" && g.color !== ACCENT && g.bg !== ACCENT && g.border !== ACCENT && (isAll ? !g.inRecord : g.inRecord && /btn--secondary/.test(g.cls));
      ok = ok && good; out.push(`${name}${good ? "" : "✗"}：${a.clearCount} 個 ${g ? Math.round(g.w) + "×" + Math.round(g.h) : ""}${isAll ? "（全部答對卡片內）" : ""}`);
    }
    // 鍵盤：Tab 到清除鈕，Enter 開對話框，Esc 取消、焦點回到按鈕
    await seed(p, SCREENS["關閉 lockedReview"]); await p.ev(`document.activeElement && document.activeElement.blur(); window.scrollTo(0, 0)`);
    let reached = false; for (let k = 0; k < 40 && !reached; k++) { await p.key("Tab", "Tab", 9); reached = await p.ev(`document.activeElement && document.activeElement.dataset.p5 === "clear"`); }
    await pressEnter(p); await sleep(150); const d = await dialogInfo(p); await p.key("Escape", "Escape", 27); await sleep(150); const foc = await p.ev(`document.activeElement && document.activeElement.dataset.p5`);
    await pressSpace(p); await sleep(150); const d2 = await dialogInfo(p); if (d2) { await p.key("Escape", "Escape", 27); await sleep(150); }
    const kb = reached && !!d && foc === "clear" && !!d2; ok = ok && kb; out.push(`鍵盤：Tab 到達=${reached}、Enter 開對話框=${!!d}、Esc 後焦點 ${foc}、空白鍵開對話框=${!!d2}`);
    return { ok, note: `${w}px：${out.join("；")}` };
  });
  await R.check(`TC-48-11b-${w}`, "AC-48-11 (b)、E-132、AC-45-07", async () => {
    const out = []; let ok = true;
    for (const [name, ids] of [["紀錄為空", []], ["只含不存在 id", ["p5-999", "p5-888"]]]) for (const [scr, part5, only] of [["題目", {}, false], ["題目開啟", {}, true], ["結算", { currentIndex: 199, phase: "summary", roundAnswered: 1, roundCorrect: 0, totalAnswered: 1, totalCorrect: 0 }, false]]) {
      const rec = await seed(p, { part5, ids, only }); const a = await info(p); const s = await ls(p);
      const good = a.clearCount === 0 && a.count === countText(0) && J(s.data.part5CorrectIds) === J(ids); ok = ok && good; out.push(`${name}／${scr}：按鈕 ${a.clearCount}、「${a.count}」、紀錄保留=${J(s.data.part5CorrectIds) === J(ids)}`);
    }
    return { ok, note: `${w}px：${out.join("；")}` };
  });
  await R.check(`TC-48-11c-${w}`, "AC-48-11（取消、Esc、遮罩、確定）、AC-46-08、E-133、CR-6、UO-7、AC-17-04", async () => {
    const out = []; let ok = true;
    const cases = [["關閉 lockedReview", SCREENS["關閉 lockedReview"], false], ["關閉 answered（E-133）", SCREENS["關閉 answered"], false], ["開啟 idle", SCREENS["開啟 idle"], true], ["關閉 結算", SCREENS["關閉 結算"], false], ["開啟 全部答對", SCREENS["開啟 全部答對"], true]];
    for (const [name, st0, only] of cases) {
      const st = { ...st0, part5: { ...st0.part5, totalAnswered: 20, totalCorrect: 12, roundAnswered: 3, roundCorrect: 2 }, over: { streak: { days: 5, lastActiveDate: YESTERDAY } } };
      await seed(p, st); const acc0 = await dashAcc(p); await p.go("part5"); await sleep(40); const before = await info(p); const raw0 = await lsRaw(p);
      let cancels = 0;
      for (const how of ["cancel", "esc", "backdrop"]) {
        await p.ev("window.__sets = 0"); try { await p.click("#view-part5 [data-p5=clear]"); } catch (e) { throw new Error(`${name} ${how} 前找不到按鈕：K=${(await info(p)).count} 按鈕 ${(await info(p)).clearCount} 檢視 ${await p.ev(`document.getElementById("view-part5").hidden`)} 目前頁 ${await p.ev(`[...document.querySelectorAll("main section, [id^=view-]")].filter((x) => !x.hidden).map((x) => x.id).join()`)}`); } await sleep(150); const d = await dialogInfo(p);
        if (how === "cancel") await p.click('.dialog [data-action="cancel"]'); else if (how === "esc") await p.key("Escape", "Escape", 27);
        else { const pt = await p.ev(`(() => { const b = document.querySelector(".dialog-backdrop"); const r = b.getBoundingClientRect(); return { x: r.left + 5, y: r.top + 5 }; })()`); for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) await p.send("Input.dispatchMouseEvent", { type, x: pt.x, y: pt.y, button: "left", clickCount: 1 }); }
        await sleep(150); const a = await info(p); const raw1 = await lsRaw(p); const sets = await p.ev("window.__sets");
        if (d && d.message.includes("將清除全部題目的答對紀錄") && d.message.includes("「已答對」會回到 0 題") && !d.message.includes("累計答題數與正確率") && [...d.buttons].sort().join() === ["取消", "確定"].sort().join() && !(await dialogInfo(p)) && raw0 === raw1 && sets === 0 && a.number === before.number && a.allCorrect === before.allCorrect && a.feedback === before.feedback) cancels++;
      }
      await p.click("#view-part5 [data-p5=clear]"); await sleep(150); await p.click('.dialog [data-action="ok"]'); await sleep(180);
      const a = await info(p); const s = await ls(p); const acc1 = await dashAcc(p); await p.go("part5"); await sleep(40); const aa = await info(p); await p.reload(); await p.go("part5"); await sleep(40); const r = await info(p); const s2 = await ls(p);
      const good = cancels === 3 && J(s.data.part5CorrectIds) === "[]" && a.count === countText(0) && a.badges === 0 && a.only === only && a.number === "第 1 / 200 題" && isIdle(a) && a.clearCount === 0 && part5Of(s).roundAnswered === 0 && part5Of(s).roundCorrect === 0 && part5Of(s).totalAnswered === st.part5.totalAnswered && part5Of(s).totalCorrect === st.part5.totalCorrect && acc1 === "已答對0/200題（0%）" && s.data.streak.days === 5 && s.data.streak.lastActiveDate === YESTERDAY && r.count === countText(0) && isIdle(r) && r.number === "第 1 / 200 題" && r.only === only && r.clearCount === 0 && !aa.allCorrect;
      ok = ok && good; out.push(`${name}${good ? "" : "✗"}：取消／Esc／遮罩不變 ${cancels}/3；確定 → 紀錄 ${J(s.data.part5CorrectIds)}、「${a.count}」、「${a.number}」未作答=${isIdle(a)}、開關 ${a.only}、按鈕 ${a.clearCount}、本輪 ${part5Of(s).roundAnswered}、累計 ${part5Of(s).totalAnswered}/${part5Of(s).totalCorrect}、主控台 ${acc0}→${acc1}、打卡 ${J(s.data.streak)}；重新載入相同=${isIdle(r)}`);
    }
    return { ok, note: `${w}px：${out.join("；")}` };
  });
  // AC-48-12
  await R.check(`TC-48-12-${w}`, "AC-48-12、HN-1、AC-38-01、AC-38-04、AC-40-02、E-134、AC-10-02（不重疊）", async () => {
    const out = []; let ok = true;
    const scr = { ...SCREENS, "K=0 關閉 idle": { part5: {}, ids: [] }, "K=0 開啟 idle": { part5: {}, ids: [], only: true }, "K=0 結算": { part5: { currentIndex: 199, phase: "summary", roundAnswered: 1, roundCorrect: 0, totalAnswered: 1, totalCorrect: 0 }, ids: [] } };
    for (const [name, st] of Object.entries(scr)) {
      await seed(p, st); const a = await info(p); const expect = a.allCorrect ? HINT_ALL : HINT; const other = a.allCorrect ? HINT : HINT_ALL;
      const g = await p.ev(`(() => { const v = document.getElementById("view-part5"); const e = v.querySelector("[data-p5=filter-hint]"); const rec = v.querySelector(".p5-record"); const label = v.querySelector("[data-p5=only-label]"); const cs = getComputedStyle(e); const r = e.getBoundingClientRect(); const vw = document.documentElement.clientWidth;
        const kids = [...rec.children]; const rects = kids.map((k) => k.getBoundingClientRect()); const inter = (a, b) => a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5; let overlap = 0; for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) if (inter(rects[i], rects[j])) overlap++;
        const note = v.querySelector(".p5-heading-note").getBoundingClientRect(); const recR = rec.getBoundingClientRect(); const noteOverlap = inter(recR, note);
        const rg = document.createRange(); rg.selectNodeContents(e); const lines = new Set([...rg.getClientRects()].map((x) => Math.round(x.top))).size; const lr = label.getBoundingClientRect();
        return { clipped: r.left < 0 || r.right > vw + 0.5 || e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1, color: cs.color, overlap, noteOverlap, lines, ws: cs.whiteSpace, tov: cs.textOverflow, labelH: lr.height, labelW: lr.width, below: r.top >= lr.bottom - 0.5, hscroll: document.documentElement.scrollWidth > vw }; })()`);
      const ct = await p.ev(contrastJs("#view-part5 [data-p5=filter-hint]"));
      const occ = a.text.split(expect).length - 1; const occOther = a.text.split(other).length - 1;
      const good = a.hints === 1 && a.hint === expect && occ === 1 && occOther === 0 && ct.ratio >= 4.5 && g.color !== ACCENT && !g.clipped && g.overlap === 0 && !g.noteOverlap && !g.hscroll && g.ws !== "nowrap" && g.tov !== "ellipsis" && g.labelH >= 44 && g.labelW >= 44 && g.below;
      ok = ok && good; out.push(`${name}${good ? "" : "✗（" + J(g) + "）"}：${occ} 次、${g.lines} 行、對比 ${ct.ratio}`);
    }
    return { ok, note: `${w}px：${out.join("；")}` };
  });
  if (w === 375) await R.check("TC-48-12z", "AC-48-12、E-134（375px 放大字級 150%）、AC-48-11（375px 不裁切）", async () => {
    const out = []; let ok = true; const seeds = [["題目 K≥1", SCREENS["關閉 lockedReview"]], ["結算", SCREENS["關閉 結算"]], ["全部答對", SCREENS["開啟 全部答對"]]];
    for (const [name, st] of seeds) {
      await seed(p, st); await p.ev(`document.documentElement.style.fontSize = "150%"`); await sleep(100);
      const g = await p.ev(`(() => { const vw = document.documentElement.clientWidth; const v = document.getElementById("view-part5"); const chk = (s) => { const e = v.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { clipped: r.left < 0 || r.right > vw + 0.5 || e.scrollWidth > e.clientWidth + 1, h: Math.round(r.height), ws: getComputedStyle(e).whiteSpace }; };
        const rec = v.querySelector(".p5-record"); const rects = [...rec.children].map((k) => k.getBoundingClientRect()); const inter = (a, b) => a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5; let overlap = 0; for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) if (inter(rects[i], rects[j])) overlap++;
        const e = v.querySelector("[data-p5=filter-hint]"); const rg = document.createRange(); rg.selectNodeContents(e); return { hint: chk("[data-p5=filter-hint]"), clear: chk("[data-p5=clear]"), overlap, lines: new Set([...rg.getClientRects()].map((x) => Math.round(x.top))).size, docScroll: document.documentElement.scrollWidth, vw }; })()`);
      const good = !g.hint.clipped && (!g.clear || !g.clear.clipped) && g.overlap === 0 && g.docScroll <= g.vw; ok = ok && good; out.push(`${name}${good ? "" : "✗"}：說明 ${g.lines} 行、裁切=${g.hint.clipped}、清除鈕裁切=${g.clear ? g.clear.clipped : "無按鈕"}、重疊 ${g.overlap}、scrollWidth ${g.docScroll}/${g.vw}`);
      await p.ev(`document.documentElement.style.fontSize = ""`);
    }
    return { ok, note: out.join("；") };
  });
  await R.check(`TC-X-lock-${w}b`, "Console 無未處理錯誤、無網路請求", async () => ({ ok: errs(p).length === 0 && netReqs(p).length === 0, note: `錯誤 ${J(errs(p)).slice(0, 300)}；非 file 請求 ${netReqs(p).length}` }));
  await p.close();
}

// ═════════ AC-48-12 題庫為空 ═════════
{
  const empty = path.join(TMP, "lock-emptydata"); fs.mkdirSync(empty, { recursive: true }); fs.copyFileSync(path.join(ROOT, "src/data/sources.js"), path.join(empty, "sources.js"));
  const fixture = path.join(TMP, "lock-fixture-nodata.html");
  const fx = spawnSync(process.execPath, ["tools/build.mjs", "--out", fixture, "--data", empty, "--no-site"], { cwd: ROOT, encoding: "utf8" });
  await R.check("TC-48-12e", "AC-48-12（題庫為空）、AC-11 C-6", async () => {
    if (fx.status !== 0) return { ok: false, note: "fixture 建置失敗：" + (fx.stdout + fx.stderr).slice(-300) };
    const p = await open(); await p.goto(pathToFileURL(fixture).href);
    await p.go("part5"); await sleep(80);
    const g = await p.ev(`(() => { const v = document.getElementById("view-part5"); return { text: v.innerText, hint: v.querySelectorAll("[data-p5=filter-hint]").length, only: v.querySelectorAll("[data-p5=only]").length, clear: v.querySelectorAll("[data-p5=clear]").length, rec: v.querySelectorAll(".p5-record").length }; })()`);
    const e = errs(p); await p.close();
    return { ok: g.hint === 0 && g.only === 0 && g.clear === 0 && g.rec === 0 && !g.text.includes(HINT) && !g.text.includes(HINT_ALL) && g.text.includes("題庫尚未載入") && e.length === 0, note: `題庫為空：說明 ${g.hint}、開關 ${g.only}、清除鈕 ${g.clear}、畫面含「題庫尚未載入」=${g.text.includes("題庫尚未載入")}；錯誤 ${e.length}` };
  });
}

// ═════════ AC-48-09 (a)(b)：停用與容量已滿 ═════════
{
  const p = await open({ inits: [storageMode("disabled")] });
  // 停用時 autoStart 走首次畫面「開始學習」（工作階段內資料）
  await p.goto();
  await R.check("TC-48-09a", "AC-48-09 (a)、AC-47-07、E-129、WR", async () => {
    await p.go("part5"); await sleep(60);
    const warned = (await p.ev(`document.body.innerText`)).includes("進度將無法保存") || (await toasts(p)).join().includes("進度將無法保存");
    const Q = 200; const c = await ci(p, 0); await p.click(`#view-part5 [data-p5=option][data-index="${c}"]`); await sleep(100); const a1 = await info(p);
    // 走到結算：把題號直接移到最後一題的真實流程以 store 動作加速（下一題為 UO-10，答錯作答）
    await p.ev(`(async () => { const st = () => EMT.store.getState().data.part5; let g = 0; while (st().phase !== "summary" && g++ < 500) { const b = document.querySelector("#view-part5 [data-p5=next]"); if (b) b.click(); else { const q = PART5_QUESTION_BANK[st().currentIndex]; document.querySelectorAll("#view-part5 [data-p5=option]")[(q.correctIndex + 1) % 4].click(); } await new Promise((r) => setTimeout(r, 0)); } })()`);
    await sleep(60); const s = await info(p);
    await p.click("#view-part5 [data-p5=restart]"); await sleep(80); const r = await info(p);
    await p.reload(); await p.go("part5"); await sleep(80); const r2 = await info(p); const blank = await p.ev(`document.getElementById("view-part5").innerText.trim().length`);
    const warned2 = (await p.ev(`document.body.innerText`)).includes("進度將無法保存") || (await toasts(p)).join().includes("進度將無法保存");
    const ok = warned && a1.feedback === "答對了！" && a1.count === countText(1) && !!s.summaryTitle && isLR(r) && r.number === "第 1 / 200 題" && r.count === countText(1) && r2.count === countText(0) && isIdle(r2) && r2.number === "第 1 / 200 題" && blank > 0 && warned2 && errs(p).filter((x) => !/SecurityError|operation is insecure/.test(x)).length === 0;
    return { ok, note: `停用：提示「進度將無法保存」=${warned}；答對 p5-001「${a1.feedback}」「${a1.count}」；走到結算「${s.score}」→ 重新開始「${r.number}」鎖定檢視=${isLR(r)}「${r.count}」；重新載入「${r2.number}」「${r2.count}」未作答=${isIdle(r2)}、提示=${warned2}；非預期錯誤 ${J(errs(p).filter((x) => !/SecurityError|operation is insecure/.test(x))).slice(0, 200)}` };
  });
  await p.close();
}
{
  const QUOTA_OFF = `window.__qaQuota = false;`;
  const p = await open({ inits: [storageMode("quota"), `setTimeout(() => {}, 0);`, QUOTA_OFF] }); await p.goto();
  await R.check("TC-48-09b", "AC-48-09 (b)、AC-30-14、E-129", async () => {
    await seed(p, {}); await p.ev("window.__qaQuota = true"); const raw0 = await lsRaw(p); const n0 = (await toasts(p)).length;
    const c = await ci(p, 0); await p.click(`#view-part5 [data-p5=option][data-index="${c}"]`); await sleep(100); const a1 = await info(p);
    await p.ev(`(async () => { const st = () => EMT.store.getState().data.part5; let g = 0; while (st().phase !== "summary" && g++ < 500) { const b = document.querySelector("#view-part5 [data-p5=next]"); if (b) b.click(); else { const q = PART5_QUESTION_BANK[st().currentIndex]; document.querySelectorAll("#view-part5 [data-p5=option]")[(q.correctIndex + 1) % 4].click(); } await new Promise((r) => setTimeout(r, 0)); } })()`);
    await sleep(60); await p.click("#view-part5 [data-p5=restart]"); await sleep(80); const r = await info(p); const t = (await toasts(p)).slice(n0); const raw1 = await lsRaw(p);
    const quotaN = t.filter((x) => x.includes("儲存空間不足")).length;
    const ok = a1.feedback === "答對了！" && isLR(r) && r.number === "第 1 / 200 題" && r.count === countText(1) && quotaN === 1 && raw0 === raw1 && errs(p).length === 0;
    return { ok, note: `容量已滿：答對 p5-001「${a1.feedback}」；走到結算 → 重新開始「${r.number}」鎖定檢視=${isLR(r)}「${r.count}」；「儲存空間不足」${quotaN} 次；localStorage 原值不變=${raw0 === raw1}；錯誤 ${errs(p).length}` };
  });
  await p.close();
}

// ═════════ AC-48-09 (c)(d)(e)：測試資料題庫（實際建置） ═════════
{
  const data = path.join(TMP, "lock-baddata"); fs.rmSync(data, { recursive: true, force: true }); fs.mkdirSync(data, { recursive: true });
  for (const f of fs.readdirSync(path.join(ROOT, "src/data"), { withFileTypes: true })) if (f.isFile()) fs.copyFileSync(path.join(ROOT, "src/data", f.name), path.join(data, f.name));
  // 只改 3 題：p5-002 correctIndex 不合法、p5-003 correctIndex 不合法且解析為空、p5-004 無合法 id
  const code = fs.readFileSync(path.join(data, "part5.js"), "utf8");
  const edit = code + `\n;(function () { var b = window.PART5_QUESTION_BANK; b[1].correctIndex = 9; b[2].correctIndex = -1; b[2].explanation = { coreStrategy: "", structure: "" }; b[3].id = ""; })();\n`;
  fs.writeFileSync(path.join(data, "part5.js"), edit);
  const fixture = path.join(TMP, "lock-fixture-bad.html");
  const fx = spawnSync(process.execPath, ["tools/build.mjs", "--out", fixture, "--data", data, "--no-site"], { cwd: ROOT, encoding: "utf8" });
  await R.check("TC-48-09cde", "AC-48-09 (c)(d)(e)、E-130、AC-45-07、LV-6、V-ST-25", async () => {
    if (fx.status !== 0) return { ok: false, note: "測試資料建置失敗：" + (fx.stdout + fx.stderr).slice(-400) };
    const URL = pathToFileURL(fixture).href;
    const p = await open(); p.reloadUrl = URL; await p.goto(URL);
    const seedF = async (o) => { const rec = stateRecord(725, { part5: P5(o.part5 || {}), part5CorrectIds: o.ids || [], part5UnansweredOnly: false }); await p.ev(`localStorage.setItem(${J(KEY)}, ${J(J(rec))})`); await p.goto(URL); await p.go("part5"); await sleep(60); };
    const out = []; let ok = true;
    // (c) p5-002：correctIndex 9，解析完整
    await seedF({ part5: { currentIndex: 1 }, ids: ["p5-002", "p5-003"] }); const c1 = await info(p); const greens = (c1.optStates.match(/correct/g) || []).length;
    const gc = c1.feedback === "這一題的資料不完整。" && c1.feedbacks === 1 && (c1.text.split("這一題的資料不完整。").length - 1) === 1 && greens === 0 && c1.optDisabled === 4 && c1.next && c1.badge === "✓ 曾答對" && !c1.warn; ok = ok && gc;
    out.push(`(c) p5-002：回饋「${c1.feedback}」恰 ${c1.text.split("這一題的資料不完整。").length - 1} 次、選項 ${c1.optStates}（標綠 ${greens}）、disabled ${c1.optDisabled}/4、下一題=${c1.next}`);
    // 「下一題」可用；(c) 解析為空的 p5-003
    await p.click("#view-part5 [data-p5=next]"); await sleep(60); const c2 = await info(p); const gc2 = c2.number === "第 3 / 200 題" && c2.feedback === "這一題的資料不完整。" && c2.core === null && c2.structure === null && c2.next && (c2.optStates.match(/correct/g) || []).length === 0; ok = ok && gc2;
    out.push(`p5-003（解析空）：回饋「${c2.feedback}」、解析段落=${c2.core !== null}、下一題=${c2.next}`);
    // (d) p5-004 無合法 id：未作答、不顯示標示，答對後 K 不增加
    await p.click("#view-part5 [data-p5=next]"); await sleep(60); const d1 = await info(p); const k0 = d1.count;
    const c3 = await ci(p, 3); await p.click(`#view-part5 [data-p5=option][data-index="${c3}"]`); await sleep(100); const d2 = await info(p); const st = await ls(p);
    const gd = d1.number === "第 4 / 200 題" && isIdle(d1) && d2.feedback === "答對了！" && !d2.badge && d2.count === k0 && st.data.part5CorrectIds.length === 2; ok = ok && gd;
    out.push(`(d) p5-004 無 id：未作答=${isIdle(d1)}、答對後標示 ${d2.badge}、「${k0}」→「${d2.count}」、紀錄 ${J(st.data.part5CorrectIds)}`);
    // (e) 只含不存在 id
    await seedF({ part5: { currentIndex: 0 }, ids: ["p5-999"] }); const e1 = await info(p); const ge = isIdle(e1) && e1.count.startsWith("已答對 0 /") && e1.clearCount === 0; ok = ok && ge;
    out.push(`(e) 只含 p5-999：未作答=${isIdle(e1)}、「${e1.count}」、清除鈕 ${e1.clearCount}`);
    const blank = await p.ev(`document.getElementById("view-part5").innerText.trim().length`); ok = ok && blank > 0 && errs(p).length === 0; out.push(`不白屏；未處理錯誤 ${J(errs(p)).slice(0, 200)}`);
    await p.close();
    return { ok, note: out.join("；") };
  });
}

// ═════════ AC-48-08：v1.1.0 交付檔實際產生資料 ═════════
{
  const V110 = path.join(TMP, "v1.1.0-english-master-track.html");
  fs.writeFileSync(V110, execFileSync("git", ["show", "f57145a:dist/english-master-track.html"], { cwd: ROOT, maxBuffer: 64 << 20 }));
  const V110_URL = pathToFileURL(V110).href;
  const p = await open({ chooser: true, inits: [COUNT_SET] });
  const oldVer = await (async () => { await p.goto(V110_URL); await p.ev(`localStorage.clear()`); await p.goto(V110_URL); return p.ev(`document.querySelector('meta[name="emt-app-version"]').content`); })();
  /** 以 v1.1.0 程式實際作答（DOM 點擊）：p5-001、p5-005 答對，其餘答錯 */
  const clickAns = (i, correct) => p.ev(`(() => { const q = PART5_QUESTION_BANK[${i}]; const b = document.querySelectorAll("#view-part5 [data-p5=option]")[${correct} ? q.correctIndex : (q.correctIndex + 1) % 4]; b.click(); })()`);
  const clickNext = () => p.ev(`document.querySelector("#view-part5 [data-p5=next]").click()`);
  await p.go("part5"); await sleep(60);
  for (let i = 0; i < 5; i++) { await clickAns(i, i === 0 || i === 4); await sleep(15); await clickNext(); await sleep(15); }
  const RAW_B = await lsRaw(p); // (b)：題號指向 p5-006、無作答結果
  // 走完全部 200 題（其餘答錯）進入結算，再「重新開始」，答錯 p5-001（已曾答對，v1.1.0 可重答）～p5-004 到 p5-005
  await p.ev(`(async () => { const st = () => EMT.store.getState().data.part5; let g = 0; while (st().phase !== "summary" && g++ < 900) { const b = document.querySelector("#view-part5 [data-p5=next]"); if (b) b.click(); else { const q = PART5_QUESTION_BANK[st().currentIndex]; document.querySelectorAll("#view-part5 [data-p5=option]")[(q.correctIndex + 1) % 4].click(); } await new Promise((r) => setTimeout(r, 0)); } })()`);
  await sleep(50); await p.click("#view-part5 [data-p5=restart]"); await sleep(60);
  for (let i = 0; i < 4; i++) { await clickAns(i, false); await sleep(15); await clickNext(); await sleep(15); }
  const RAW_A = await lsRaw(p); // (a)：題號指向 p5-005、無作答結果
  await clickAns(4, false); await sleep(40);
  const RAW_C = await lsRaw(p); // (c)：題號指向 p5-005、保留該次答錯結果
  // v1.1.0 實際匯出備份（(a) 狀態）
  await p.ev(`localStorage.setItem(${J(KEY)}, ${J(RAW_A)})`); await p.goto(V110_URL); await p.go("dashboard"); await expandBackup(p);
  const exportNow = async () => { for (const f of fs.readdirSync(p.downloads).filter((x) => x.endsWith(".json"))) fs.rmSync(path.join(p.downloads, f), { force: true }); await p.click('[data-action="export-backup"]'); let file = null; for (let i = 0; i < 80 && !file; i++) { const fx = fs.readdirSync(p.downloads).filter((x) => x.endsWith(".json")); if (fx.length) file = fx[0]; else await sleep(100); } await sleep(150); return JSON.parse(fs.readFileSync(path.join(p.downloads, file), "utf8")); };
  const OLD_BACKUP = await exportNow();
  const parts = (raw) => { const r = JSON.parse(raw); return { sv: r.schemaVersion, p5: r.data.part5, ids: r.data.part5CorrectIds, keys: Object.keys(r.data) }; };
  const A = parts(RAW_A), B = parts(RAW_B), C = parts(RAW_C);
  const CURRENT = FILE_URL;
  const openNew = async (raw) => { await p.ev(`localStorage.setItem(${J(KEY)}, ${J(raw)})`); await p.goto(CURRENT); const entry = await p.ev(`document.body.dataset.entry`); await p.go("part5"); await sleep(60); return entry; };
  await R.check("TC-48-08-setup", "AC-48-08（樣本）、E-127", async () => {
    const ok = oldVer === "1.1.0" && A.sv === 3 && J(A.ids) === J(["p5-001", "p5-005"]) && A.p5.currentIndex === 4 && A.p5.lockedSelection === null && J(B.ids) === J(A.ids) && B.p5.currentIndex === 5 && B.p5.lockedSelection === null && C.p5.currentIndex === 4 && C.p5.lockedSelection !== null;
    return { ok, note: `v1.1.0 交付檔（git f57145a，emt-app-version ${oldVer}）實際作答產生：(a) 題號 ${A.p5.currentIndex + 1}、lockedSelection ${A.p5.lockedSelection}、紀錄 ${J(A.ids)}、累計 ${A.p5.totalAnswered}/${A.p5.totalCorrect}；(b) 題號 ${B.p5.currentIndex + 1}、累計 ${B.p5.totalAnswered}/${B.p5.totalCorrect}；(c) 題號 ${C.p5.currentIndex + 1}、lockedSelection ${C.p5.lockedSelection}、累計 ${C.p5.totalAnswered}/${C.p5.totalCorrect}` };
  });
  const dataSame = (raw, s) => { const o = JSON.parse(raw); return J(o.data) === J(s.data); };
  await R.check("TC-48-08a", "AC-48-08 (a)、E-127、LV-7、AC-48-01", async () => {
    const entry = await openNew(RAW_A); const a = await info(p); const s = await ls(p); const t = await toasts(p); const keys = await p.ev("Object.keys(localStorage)");
    const ok = entry === "main" && isLR(a) && a.number === "第 5 / 200 題" && a.count === countText(2) && dataSame(RAW_A, s) && s.schemaVersion === 3 && !t.some((x) => x.includes("資料讀取失敗")) && !keys.includes("englishMasterTrack:unreadable") && errs(p).length === 0;
    return { ok, note: `以 1.2.0 開啟：entry ${entry}、「${a.number}」鎖定檢視=${isLR(a)}「${a.feedback}」「${a.count}」；資料逐欄相同=${dataSame(RAW_A, s)}（累計 ${part5Of(s).totalAnswered}/${part5Of(s).totalCorrect}）；Toast ${J(t)}；unreadable 鍵=${keys.includes("englishMasterTrack:unreadable")}；錯誤 ${errs(p).length}` };
  });
  await R.check("TC-48-08b", "AC-48-08 (b)、E-127", async () => {
    const entry = await openNew(RAW_B); const a = await info(p); const s = await ls(p);
    return { ok: entry === "main" && isIdle(a) && a.number === "第 6 / 200 題" && a.count === countText(2) && dataSame(RAW_B, s), note: `entry ${entry}、「${a.number}」未作答=${isIdle(a)}「${a.count}」；資料逐欄相同=${dataSame(RAW_B, s)}` };
  });
  await R.check("TC-48-08c", "AC-48-08 (c)、AC-45-03 (d)、E-128、LV-7", async () => {
    const entry = await openNew(RAW_C); const a = await info(p); const st = await optStyles(p); const s = await ls(p); const c5 = C.p5.lockedSelection; const c = await ci(p, 4);
    const statesOk = a.optStates.split(",")[c] === "correct" && a.optStates.split(",")[c5] === "wrong";
    await p.reload(); await p.go("part5"); await sleep(50); const a2 = await info(p);
    await next(p); const b = await info(p); const s2 = await ls(p);
    // 之後回到 p5-005：先把本輪走到結算再重新開始（作答未曾答對的題目）
    await p.ev(`(async () => { const st = () => EMT.store.getState().data.part5; let g = 0; while (st().phase !== "summary" && g++ < 900) { const b = document.querySelector("#view-part5 [data-p5=next]"); if (b) b.click(); else { const q = PART5_QUESTION_BANK[st().currentIndex]; document.querySelectorAll("#view-part5 [data-p5=option]")[(q.correctIndex + 1) % 4].click(); } await new Promise((r) => setTimeout(r, 0)); } })()`);
    await sleep(40); await p.click("#view-part5 [data-p5=restart]"); await sleep(60);
    const f = await p.ev(`(async () => { for (let i = 0; i < 4; i++) { let b = document.querySelector("#view-part5 [data-p5=next]"); if (!b) { const q = PART5_QUESTION_BANK[EMT.store.getState().data.part5.currentIndex]; document.querySelectorAll("#view-part5 [data-p5=option]")[(q.correctIndex + 1) % 4].click(); await new Promise((r) => setTimeout(r, 0)); b = document.querySelector("#view-part5 [data-p5=next]"); } b.click(); await new Promise((r) => setTimeout(r, 0)); } return document.querySelector("#view-part5 [data-p5=number]").textContent; })()`);
    const back = await info(p);
    const ok = entry === "main" && a.number === "第 5 / 200 題" && /^答錯了/.test(a.feedback || "") && statesOk && a.optBadges[c5] === "你的選擇" && a.badge === "✓ 曾答對" && a.next && a.count === countText(2) && dataSame(RAW_C, s) && a2.feedback === a.feedback && b.number === "第 6 / 200 題" && part5Of(s2).totalAnswered === C.p5.totalAnswered && part5Of(s2).totalCorrect === C.p5.totalCorrect && J(s2.data.part5CorrectIds) === J(C.ids) && f === "第 5 / 200 題" && isLR(back);
    return { ok, note: `開啟：「${a.number}」回饋「${a.feedback}」、選項 ${a.optStates}、所選「${a.optBadges[c5]}」、「${a.count}」、資料相同=${dataSame(RAW_C, s)}；重新載入相同=${a2.feedback === a.feedback}；下一題「${b.number}」累計 ${part5Of(s2).totalAnswered}/${part5Of(s2).totalCorrect} 不重新計分；回到「${back.number}」鎖定檢視=${isLR(back)}「${back.feedback}」` };
  });
  await R.check("TC-48-08d", "AC-48-08（匯入 v1.1.0 備份、匯出比對）、DS-46、V-ST-27", async () => {
    await p.ev(`localStorage.clear()`); await p.goto(CURRENT); await p.go("dashboard"); await expandBackup(p);
    const f = path.join(TMP, "v110-backup-" + Date.now() + ".json"); fs.writeFileSync(f, J(OLD_BACKUP));
    p.chooser = null; await p.click('[data-action="import-backup"]'); for (let i = 0; i < 60 && !p.chooser; i++) await sleep(50);
    await p.send("DOM.setFileInputFiles", { files: [f], backendNodeId: p.chooser.backendNodeId }); await sleep(300); if (await dialogInfo(p)) { await p.click('.dialog [data-action="ok"]'); await sleep(300); }
    await p.go("part5"); await sleep(60); const a = await info(p); const s = await ls(p); const t = await toasts(p);
    await p.go("dashboard"); await expandBackup(p); const NEW = await exportNow();
    const top = (x) => Object.keys(x).sort().join(); const dk = (x) => Object.keys(x.data).sort().join();
    const sameData = J({ ...NEW.data }) === J({ ...OLD_BACKUP.data });
    const ok = isLR(a) && a.number === "第 5 / 200 題" && a.count === countText(2) && top(NEW) === top(OLD_BACKUP) && dk(NEW) === dk(OLD_BACKUP) && NEW.schemaVersion === 3 && OLD_BACKUP.schemaVersion === 3 && NEW.format === OLD_BACKUP.format && sameData && J(s.data.part5CorrectIds) === J(A.ids) && part5Of(s).totalAnswered === A.p5.totalAnswered && !t.some((x) => /格式錯誤|版本不相容|資料讀取失敗/.test(x));
    return { ok, note: `匯入 v1.1.0 備份後「${a.number}」鎖定檢視=${isLR(a)}「${a.count}」；1.2.0 匯出與 v1.1.0 匯出：頂層欄位相同=${top(NEW) === top(OLD_BACKUP)}、data 欄位相同=${dk(NEW) === dk(OLD_BACKUP)}（${Object.keys(NEW.data).length} 欄）、schemaVersion ${OLD_BACKUP.schemaVersion}→${NEW.schemaVersion}、data 內容相同=${sameData}；Toast ${J(t).slice(0, 120)}` };
  });
  await R.check("TC-X-lock-v110", "Console 無未處理錯誤、無網路請求（v1.1.0 → 1.2.0）", async () => ({ ok: errs(p).length === 0 && netReqs(p).length === 0, note: `錯誤 ${J(errs(p)).slice(0, 300)}；非 file 請求 ${netReqs(p).length}` }));
  await p.close();
}

R.save(resultPath("e2e-lock"));
console.log(`e2e-lock：通過 ${R.results.filter((r) => r.result === "通過").length}、失敗 ${R.results.filter((r) => r.result === "失敗").length}`);
