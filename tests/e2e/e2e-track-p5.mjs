// QA E2E 第 7 輪（PRD v0.15，R-23）套件 2：模擬測驗答對紀錄（US-45）、只練沒答對的題目（US-46）、AC-32-02（v0.15）、AC-47-07 (a)、AC-47-08 (b)
// 依據：PRD v0.15 US-45、US-46、E-108～E-112；契約 v0.15 §5.11 CR-1～CR-9、UO-1～UO-9、§15 PART5_RECORD_TEXTS；architecture v0.10 §7.21.3、§7.21.4、§10.7。
// 驅動：tests/e2e/lib/cdp.mjs（file://）；AC-47-08 (b) 以 lib/pwa-env.mjs（playwright-core，tools/serve.mjs 埠 8080，只關閉自己啟動的伺服器）。
// 構造答對紀錄：依 architecture §10.7「以 DevTools 構造答對紀錄」，直接寫入 localStorage 主鍵後重新載入。
import fs from "node:fs";
import path from "node:path";
import { launch, recorder, sleep, FILE_URL, ROOT, resultPath } from "./lib/cdp.mjs";
import { TOAST_RECORDER, fakeTts, fakeStt, fakeMic } from "./lib/inits.mjs";
import { KEY, stateRecord, dialogInfo, expandBackup } from "./lib/state.mjs";

const R = recorder("e2e-track-p5");
const TMP = process.env.QA_TMP || path.join(ROOT, "tests", "results", "tmp");
fs.mkdirSync(TMP, { recursive: true });
const J = (x) => JSON.stringify(x);
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const TODAY = ymd(new Date());
const id = (n) => "p5-" + String(n).padStart(3, "0");
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => id(a + i));
const ACCENT = "rgb(247, 137, 59)";

async function open({ vp = [1366, 900], chooser = false } = {}) {
  const p = await launch();
  for (const s of [TOAST_RECORDER, fakeTts("ok"), fakeStt("ok"), fakeMic("ok")]) await p.addInitScript(s);
  await p.viewport(vp[0], vp[1]);
  await p.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  if (chooser) { await p.send("Page.setInterceptFileChooserDialog", { enabled: true }); p.onEvent((m) => { if (m.method === "Page.fileChooserOpened") p.chooser = m.params; }); }
  return p;
}
const lsRaw = (p) => p.ev(`localStorage.getItem(${J(KEY)})`);
const ls = async (p) => JSON.parse(await lsRaw(p));
const toasts = (p) => p.ev(`(window.__qaToasts || []).map((t) => t.text)`);
const errs = (p) => p.log.exceptions.concat(p.log.console.filter((c) => c.type === "error").map((c) => c.text));
const netReqs = (p) => p.log.requests.filter((r) => !/^(file|blob|data|about):/.test(r.url));
const P5 = (over = {}) => ({ currentIndex: 0, lockedSelection: null, phase: "question", roundAnswered: 0, roundCorrect: 0, totalAnswered: 0, totalCorrect: 0, ...over });
/** 寫入狀態後重新載入並進入模擬測驗頁 */
async function seed(p, { part5 = {}, ids = [], only = false, over = {} } = {}) {
  const rec = stateRecord(725, { part5: P5(part5), part5CorrectIds: ids, part5UnansweredOnly: only, ...over });
  await p.ev(`localStorage.setItem(${J(KEY)}, ${J(J(rec))})`); await p.reload(); await p.go("part5"); await sleep(60);
  return rec;
}
const ci = (p, i) => p.ev(`PART5_QUESTION_BANK[${i}].correctIndex`);
const curIdx = (p) => p.ev(`EMT.store.getState().data.part5.currentIndex`);
/** 模擬測驗畫面資訊 */
const info = (p) => p.ev(`(() => { const v = document.getElementById("view-part5"); const q = (s) => v.querySelector(s); const t = (s) => (q(s) ? q(s).textContent : null);
  const only = q("[data-p5=only]"); const opts = [...v.querySelectorAll("[data-p5=option]")]; const bar = q(".p5-progress");
  return { number: t("[data-p5=number]"), count: t("[data-p5=correct-count]"), counts: v.querySelectorAll("[data-p5=correct-count]").length, onlies: v.querySelectorAll("[data-p5=only]").length,
    badge: t("[data-p5=correct-badge]"), badges: v.querySelectorAll("[data-p5=correct-badge]").length, only: only ? only.checked : null,
    optCount: opts.length, optEnabled: opts.filter((o) => !o.disabled && o.getAttribute("aria-disabled") !== "true").length,
    locked: opts.length > 0 && opts.every((o) => o.disabled || o.getAttribute("aria-disabled") === "true"),
    allCorrect: !!q("[data-p5=allcorrect-title]"), title: t("[data-p5=allcorrect-title]"), note: t(".p5-allcorrect__note"), score: t("[data-p5=summary-score]"), summaryTitle: !!q("[data-p5=summary-title]"),
    restart: !!q("[data-p5=restart]"), replay: t("[data-p5=replay]"), clear: t("[data-p5=clear]"), qIndex: q(".p5-question") ? Number(q(".p5-question").dataset.index) : null,
    bar: bar ? { now: bar.getAttribute("aria-valuenow"), max: bar.getAttribute("aria-valuemax"), fill: (q(".p5-progress__fill") || {}).style ? q(".p5-progress__fill").style.width || getComputedStyle(q(".p5-progress__fill")).width : null } : null,
    text: v.innerText }; })()`);
const answer = async (p, i, correct = true) => { const c = await ci(p, i); await p.click(`#view-part5 [data-p5=option][data-index="${correct ? c : (c + 1) % 4}"]`); await sleep(80); };
const clickTimed = (p, sel, condJs) => p.ev(`(async () => { const el = document.querySelector(${J(sel)}); if (!el) return { ms: null, err: "無元素" };
  const t0 = performance.now(); el.click(); const cond = () => { try { return !!(${condJs}); } catch (e) { return false; } };
  for (let i = 0; i < 120; i++) { await new Promise((r) => requestAnimationFrame(() => r())); if (cond()) return { ms: Math.round((performance.now() - t0) * 10) / 10 }; }
  return { ms: null, err: "條件未成立" }; })()`);
const countText = (k) => `已答對 ${k} / 200 題`;
const dashAcc = (p) => p.ev(`(() => { EMT.router.go("dashboard"); const e = document.querySelector("#view-dashboard .db-stat--accuracy .db-stat__value"); const t = document.querySelector("#view-dashboard").innerText; EMT.router.go("part5"); return { acc: e ? e.innerText.replace(/\\s+/g, "") : null, hasK: /已答對/.test(t) }; })()`);
/** 對比：文字色對實際背景（向上找第一個不透明背景） */
const contrastJs = (sel) => `(() => { const el = document.querySelector(${J(sel)}); if (!el) return null; const rgb = (s) => (s.match(/[\\d.]+/g) || []).map(Number);
  const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  let bgEl = el, bg = null; while (bgEl) { const c = rgb(getComputedStyle(bgEl).backgroundColor); if (c.length >= 3 && (c.length < 4 || c[3] > 0.5)) { bg = c; break; } bgEl = bgEl.parentElement; } bg = bg || [255, 255, 255];
  const fg = rgb(getComputedStyle(el).color); const L1 = lum(fg), L2 = lum(bg); return { ratio: Math.round(((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)) * 100) / 100, fg: getComputedStyle(el).color, bg: "rgb(" + bg.slice(0, 3).join(", ") + ")" }; })()`;

// ═════════ US-45：答對紀錄（1366） ═════════
{
  const p = await open();
  await p.goto();
  await R.check("TC-45-01", "AC-45-01、CR-2、AC-11-03", async () => {
    await seed(p, { part5: { currentIndex: 4, totalAnswered: 7, totalCorrect: 3, roundAnswered: 4, roundCorrect: 2 }, ids: ["p5-001", "p5-002"] });
    const a = await info(p); const c = await ci(p, 4);
    const m = await clickTimed(p, `#view-part5 [data-p5=option][data-index="${c}"]`, `document.querySelector("#view-part5 [data-p5=correct-badge]") && document.querySelector("#view-part5 [data-p5=correct-count]").textContent === ${J(countText(3))}`);
    await sleep(80); const b = await info(p); const st = await ls(p);
    await p.reload(); await p.go("part5"); const r = await info(p); const st2 = await ls(p);
    const ok = a.number === "第 5 / 200 題" && !a.badge && a.count === countText(2) && m.ms !== null && m.ms <= 100 && b.badge === "✓ 曾答對" && b.count === countText(3)
      && st.data.part5.totalAnswered === 8 && st.data.part5.totalCorrect === 4 && J(st.data.part5CorrectIds) === J(["p5-001", "p5-002", "p5-005"]) && r.badge === "✓ 曾答對" && r.count === countText(3) && r.number === "第 5 / 200 題" && J(st2.data.part5CorrectIds) === J(st.data.part5CorrectIds);
    return { ok, note: `p5-005 未曾答對、K = 2：答對後 ${m.ms} ms 出現「${b.badge}」「${b.count}」；累計 7/3 → ${st.data.part5.totalAnswered}/${st.data.part5.totalCorrect}；紀錄 ${J(st.data.part5CorrectIds)}；重新載入「${r.number}」「${r.badge}」「${r.count}」` };
  });
  await R.check("TC-45-01p", "AC-45-01、AC-45-05（≤ 100ms，10 次）、NFR-4", async () => {
    await seed(p, { part5: { currentIndex: 20 } });
    const ms = [];
    for (let k = 0; k < 10; k++) {
      const i = await curIdx(p); const c = await ci(p, i);
      const m = await clickTimed(p, `#view-part5 [data-p5=option][data-index="${c}"]`, `document.querySelector("#view-part5 [data-p5=correct-count]").textContent === ${J(countText(k + 1))} && !!document.querySelector("#view-part5 [data-p5=correct-badge]")`);
      ms.push(m.ms); await sleep(40); await p.click("#view-part5 [data-p5=next]"); await sleep(40);
    }
    return { ok: ms.every((x) => x !== null && x <= 100), note: `連續 10 題答對，點擊到「✓ 曾答對」與計數更新完成（下一影格）：${ms.join("、")} ms；最大 ${Math.max(...ms.filter((x) => x !== null))} ms` };
  });
  await R.check("TC-45-02", "AC-45-02、CR-2", async () => {
    await seed(p, { part5: { currentIndex: 5, totalAnswered: 7, totalCorrect: 3 }, ids: ["p5-001"] });
    await answer(p, 5, false); const a = await info(p); const st = await ls(p);
    const ok = !a.badge && a.count === countText(1) && st.data.part5.totalAnswered === 8 && st.data.part5.totalCorrect === 3 && J(st.data.part5CorrectIds) === J(["p5-001"]) && !/未答對|答錯過/.test(a.text.replace("只練沒答對的題目", ""));
    return { ok, note: `p5-006 答錯：標示 ${a.badge}、「${a.count}」；累計 ${st.data.part5.totalAnswered}/${st.data.part5.totalCorrect}；紀錄 ${J(st.data.part5CorrectIds)}` };
  });
  await R.check("TC-45-03", "AC-45-03、AC-11-06、AC-11-07、CR-2", async () => {
    const out = [];
    // (c) 作答後重複點擊已鎖定的選項
    await seed(p, { part5: { currentIndex: 4, totalAnswered: 2, totalCorrect: 1 }, ids: ["p5-005"] });
    await answer(p, 4, true); const s0 = await ls(p);
    for (let k = 0; k < 4; k++) { await p.click("#view-part5 [data-p5=option]", k).catch(() => {}); await sleep(30); }
    const s1 = await ls(p); const c1 = await info(p);
    out.push(`(c) 鎖定後重複點擊 4 次：紀錄 ${J(s1.data.part5CorrectIds)}、累計 ${s1.data.part5.totalAnswered}/${s1.data.part5.totalCorrect}、localStorage 不變=${J(s0) === J(s1)}`);
    // (a) 「重新開始」後再遇到並答錯：最後一題作答 → 下一題 → 結算 → 重新開始 → 作答到 p5-005
    await seed(p, { part5: { currentIndex: 199, totalAnswered: 10, totalCorrect: 5, roundAnswered: 3, roundCorrect: 1 }, ids: ["p5-005"] });
    await answer(p, 199, false); await p.click("#view-part5 [data-p5=next]"); await sleep(60); const sm = await info(p);
    await p.click("#view-part5 [data-p5=restart]"); await sleep(60); const rs = await info(p);
    for (let i = 0; i < 4; i++) { await answer(p, i, false); await p.click("#view-part5 [data-p5=next]"); await sleep(40); }
    const b4 = await info(p); await answer(p, 4, false); const a1 = await info(p); const sa = await ls(p);
    out.push(`(a) 結算「${sm.score}」→ 重新開始「${rs.number}」→ 到「${b4.number}」作答前標示「${b4.badge}」、答錯後標示「${a1.badge}」「${a1.count}」；累計 ${sa.data.part5.totalAnswered}/${sa.data.part5.totalCorrect}`);
    // (b) 另一輪再遇到並答對
    await seed(p, { part5: { currentIndex: 4, totalAnswered: 16, totalCorrect: 5 }, ids: ["p5-005"] });
    await answer(p, 4, true); const sb = await ls(p); const b1 = await info(p);
    out.push(`(b) 再答對：紀錄 ${J(sb.data.part5CorrectIds)}、「${b1.count}」、累計 ${sb.data.part5.totalAnswered}/${sb.data.part5.totalCorrect}`);
    const ok = J(s0) === J(s1) && c1.count === countText(1) && sm.score && rs.number === "第 1 / 200 題" && b4.badge === "✓ 曾答對" && a1.badge === "✓ 曾答對" && a1.count === countText(1) && J(sa.data.part5CorrectIds) === J(["p5-005"])
      && sa.data.part5.totalAnswered === 16 && sa.data.part5.totalCorrect === 5 && J(sb.data.part5CorrectIds) === J(["p5-005"]) && b1.count === countText(1) && sb.data.part5.totalAnswered === 17 && sb.data.part5.totalCorrect === 6;
    return { ok, note: out.join("；") };
  });
  await R.check("TC-45-06", "AC-45-06、CR-5、CR-7、AC-17-04、AC-11-07、AC-17-02、AC-30-04", async () => {
    await p.ev(`localStorage.clear()`); await p.reload();
    await seed(p, { ids: ["p5-003"] });
    // 作答 4 題：p5-001 對、p5-002 錯、p5-003（曾答對）對、p5-004 錯
    for (const [i, c] of [[0, true], [1, false], [2, true], [3, false]]) { await answer(p, i, c); if (i < 3) { await p.click("#view-part5 [data-p5=next]"); await sleep(40); } }
    const s1 = await ls(p); const d1 = await dashAcc(p); const k1 = await info(p);
    // 跳到最後一題作答進入結算，再「重新開始」
    const rec = JSON.parse(J(s1)); rec.data.part5.currentIndex = 199; rec.data.part5.lockedSelection = null; await p.ev(`localStorage.setItem(${J(KEY)}, ${J(J(rec))})`); await p.reload(); await p.go("part5");
    await answer(p, 199, true); await p.click("#view-part5 [data-p5=next]"); await sleep(60); const sm = await info(p);
    await p.click("#view-part5 [data-p5=restart]"); await sleep(60); const s2 = await ls(p); const d2 = await dashAcc(p); const k2 = await info(p);
    const ok = s1.data.part5.totalAnswered === 4 && s1.data.part5.totalCorrect === 2 && s1.data.part5.roundAnswered === 4 && s1.data.part5.roundCorrect === 2 && d1.acc === "50%" && !d1.hasK && k1.count === countText(2)
      && J(s1.data.part5CorrectIds) === J(["p5-003", "p5-001"]) && s1.data.streak.days === 1 && s1.data.streak.lastActiveDate === TODAY && s1.data.todayLearned.wordKeys.length === 0
      && sm.score === "答對 3 / 5" && s2.data.part5.totalAnswered === 5 && s2.data.part5.totalCorrect === 3 && s2.data.part5.roundAnswered === 0 && J(s2.data.part5CorrectIds) === J(["p5-003", "p5-001", "p5-200"]) && d2.acc === "60%" && !d2.hasK && k2.count === countText(3) && k2.number === "第 1 / 200 題";
    return { ok, note: `作答 4 題（含曾答對的 p5-003）：累計 ${s1.data.part5.totalAnswered}/${s1.data.part5.totalCorrect}、本輪 ${s1.data.part5.roundAnswered}/${s1.data.part5.roundCorrect}、主控台正確率 ${d1.acc}（主控台出現「已答對」=${d1.hasK}）、K「${k1.count}」、打卡 ${J(s1.data.streak)}、今日已學 ${s1.data.todayLearned.wordKeys.length}；最後一題答對後結算「${sm.score}」；重新開始後累計 ${s2.data.part5.totalAnswered}/${s2.data.part5.totalCorrect}、本輪 ${s2.data.part5.roundAnswered}、紀錄 ${J(s2.data.part5CorrectIds)}（不清除）、正確率 ${d2.acc}、「${k2.count}」「${k2.number}」` };
  });
  await R.check("TC-45-07", "AC-45-07、CR-3、Q-71、E-109", async () => {
    const n0 = (await toasts(p)).length;
    await seed(p, { ids: ["p5-001", "p5-002", "p5-003", "p5-999", "p5-001"] });
    const seen = [];
    for (let i = 0; i < 4; i++) { const a = await info(p); seen.push(`${a.number}:${a.badge || "無"}`); await answer(p, i, i < 3); await p.click("#view-part5 [data-p5=next]"); await sleep(40); }
    const a = await info(p); const st = await ls(p); const keys = await p.ev(`Object.keys(localStorage)`); const t = (await toasts(p)).slice(n0);
    const ok = a.count === countText(3) && seen.join(",") === "第 1 / 200 題:✓ 曾答對,第 2 / 200 題:✓ 曾答對,第 3 / 200 題:✓ 曾答對,第 4 / 200 題:無" && st.data.part5CorrectIds.includes("p5-999") && !keys.includes("englishMasterTrack:unreadable") && !t.some((x) => x.includes("資料讀取失敗")) && !/p5-\d{3}/.test(a.text) && errs(p).length === 0;
    return { ok, note: `紀錄 [p5-001, p5-002, p5-003, p5-999, p5-001] → ${a.count}；逐題 ${seen.join("、")}；作答寫入後 localStorage 紀錄 ${J(st.data.part5CorrectIds)}（保留 p5-999）；unreadable 鍵 ${keys.includes("englishMasterTrack:unreadable")}；Toast ${J(t)}；畫面出現題目 id=${/p5-\d{3}/.test(a.text)}；Console 錯誤 ${errs(p).length}` };
  });
  await R.check("TC-45-08", "AC-45-08、AC-32-02（v0.15：學習進度紀錄 (7)、「已答對 0 / Q 題」）、AC-32-04、CI-4、CI-8、E-108", async () => {
    const ids37 = range(1, 37);
    await seed(p, { part5: { currentIndex: 49, totalAnswered: 60, totalCorrect: 40, roundAnswered: 10, roundCorrect: 7 }, ids: ids37, only: true, over: { masteredWordKeys: ["the"] } });
    const a0 = await info(p);
    await p.go("customizer"); await p.click('.cz-level[data-color="brown"]'); await sleep(40); const raw0 = await lsRaw(p);
    await p.click("#cz-apply"); await sleep(120); const d1 = await dialogInfo(p); await p.click('.dialog [data-action="cancel"]'); await sleep(150);
    const raw1 = await lsRaw(p); await p.go("part5"); const b = await info(p);
    await p.go("customizer"); await p.click('.cz-level[data-color="brown"]'); await sleep(40); await p.click("#cz-apply"); await sleep(120); const d2 = await dialogInfo(p); await p.click('.dialog [data-action="ok"]'); await sleep(200);
    await p.go("part5"); const a = await info(p); const st = await ls(p);
    await p.reload(); await p.go("part5"); const r = await info(p);
    const ok = a0.count === countText(37) && a0.only === true && !!d1 && raw0 === raw1 && b.count === countText(37) && b.only === true && !!d2
      && J(st.data.part5CorrectIds) === "[]" && st.data.part5UnansweredOnly === true && a.count === countText(0) && a.badges === 0 && a.only === true && a.number === "第 1 / 200 題" && !a.locked && a.optEnabled === 4
      && r.count === countText(0) && r.only === true && r.number === "第 1 / 200 題" && st.data.part5.totalAnswered === 0;
    return { ok, note: `K = 37、開關開啟：(b) 取消 → localStorage 不變=${raw0 === raw1}、「${b.count}」、開關 ${b.only}；(a) 確定 → 紀錄 ${J(st.data.part5CorrectIds)}、「${a.count}」、標示 ${a.badges} 個、開關 ${a.only}、「${a.number}」未作答=${!a.locked}；累計 ${st.data.part5.totalAnswered}；重新載入「${r.count}」「${r.number}」開關 ${r.only}` };
  });
  await R.check("TC-X-p5-us45", "Console 無未處理錯誤、無網路請求（AC-47-08 (a)）", async () => ({ ok: errs(p).length === 0 && netReqs(p).length === 0, note: `錯誤 ${J(errs(p)).slice(0, 300)}；非 file 請求 ${netReqs(p).length}` }));
  await p.close();
}

// ═════════ AC-45-04、AC-45-05、AC-46-01：兩種寬度的版面與操作 ═════════
for (const [w, h] of [[375, 667], [1366, 900]]) {
  const p = await open({ vp: [w, h] });
  await p.goto();
  await R.check(`TC-45-04-${w}`, "AC-45-04、AC-38-01、AC-38-04、AC-11-01、CR-4 (a)", async () => {
    await seed(p, { part5: { currentIndex: 4 }, ids: ["p5-005"] });
    const g = await p.ev(`(() => { const b = document.querySelector("#view-part5 [data-p5=correct-badge]"); if (!b) return null; const meta = b.closest(".p5-meta"); const type = document.querySelector("#view-part5 .p5-type");
      const r = b.getBoundingClientRect(); const cs = getComputedStyle(b); return { inMeta: !!meta && !!meta.closest(".p5-question"), afterType: !!type && !!(type.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) && type.parentElement === b.parentElement,
      text: b.textContent, clipped: r.left < 0 || r.right > document.documentElement.clientWidth || b.scrollWidth > b.clientWidth + 1, color: cs.color, border: cs.borderTopColor, hscroll: document.documentElement.scrollWidth > document.documentElement.clientWidth }; })()`);
    const ct = await p.ev(contrastJs("#view-part5 [data-p5=correct-badge]"));
    const a = await info(p);
    await answer(p, 4, false); const after = await info(p); // 標示不影響作答：可作答、對錯顏色照常
    const fb = await p.ev(`[...document.querySelectorAll("#view-part5 [data-p5=option]")].map((o) => o.className).join("|")`);
    await seed(p, { part5: { currentIndex: 5 }, ids: ["p5-005"] }); const b = await info(p);
    const ok = !!g && g.inMeta && g.afterType && g.text === "✓ 曾答對" && !g.clipped && !g.hscroll && g.color !== ACCENT && ct.ratio >= 4.5 && a.optEnabled === 4 && !a.locked && after.locked && /correct|wrong|incorrect/.test(fb)
      && b.badges === 0 && !/未答對|答錯過/.test(b.text.replace("只練沒答對的題目", ""));
    return { ok, note: `${w}px p5-005（曾答對）作答前：標示「${g && g.text}」在 .p5-meta 內=${g && g.inMeta}、在題型標籤之後=${g && g.afterType}、顏色 ${g && g.color}（對比 ${ct.ratio}，背景 ${ct.bg}；非強調橘=${g && g.color !== ACCENT}）、裁切=${g && g.clipped}、水平捲軸=${g && g.hscroll}；選項可作答 ${a.optEnabled}/4；作答後鎖定=${after.locked}、選項樣式 ${fb.slice(0, 120)}；p5-006 標示 ${b.badges} 個、無「未答對／答錯過」=${!/未答對|答錯過/.test(b.text.replace("只練沒答對的題目", ""))}` };
  });
  await R.check(`TC-45-05-${w}`, "AC-45-05、AC-40-01、AC-38-07、CR-4 (b)、MT-1", async () => {
    const out = []; let ok = true;
    for (const [k, ids] of [[0, []], [37, range(1, 37)], [200, range(1, 200)]]) {
      for (const phase of ["question", "summary"]) {
        await seed(p, { part5: { currentIndex: phase === "summary" ? 199 : 60, phase, roundAnswered: phase === "summary" ? 5 : 0, roundCorrect: phase === "summary" ? 3 : 0, totalAnswered: 5, totalCorrect: 3 }, ids });
        const g = await p.ev(`(() => { const v = document.getElementById("view-part5"); const c = v.querySelector("[data-p5=correct-count]"); const bar = v.querySelector(".p5-progress"); const num = v.querySelector("[data-p5=number]");
          const body = v.querySelector(".p5-question, .p5-summary, .p5-allcorrect"); const rc = c.getBoundingClientRect(); const rn = num ? num.getBoundingClientRect() : null; const ro = v.querySelector("[data-p5=only-label]").getBoundingClientRect();
          const inter = (a, b) => !!a && !!b && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
          return { text: c.textContent, n: (v.innerText.match(/已答對 \\d+ \\/ \\d+ 題/g) || []).length, tab: getComputedStyle(c).fontVariantNumeric, afterBar: !!bar && !!(bar.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING),
            beforeBody: !!body && !!(c.compareDocumentPosition(body) & Node.DOCUMENT_POSITION_FOLLOWING), overlapNum: inter(rc, rn), overlapOnly: inter(rc, ro), clipped: rc.left < 0 || rc.right > document.documentElement.clientWidth || c.scrollWidth > c.clientWidth + 1,
            hscroll: document.documentElement.scrollWidth > document.documentElement.clientWidth, lines: Math.round(rc.height / parseFloat(getComputedStyle(c).lineHeight || 20)) }; })()`);
        const good = g.text === countText(k) && g.n === 1 && /tabular-nums/.test(g.tab) && g.afterBar && g.beforeBody && !g.overlapNum && !g.overlapOnly && !g.clipped && !g.hscroll;
        ok = ok && good; out.push(`K=${k} ${phase === "summary" ? "結算" : "題目"}${good ? "" : "✗"}「${g.text}」×${g.n}${g.overlapNum || g.overlapOnly || g.clipped || g.hscroll ? `（重疊題號 ${g.overlapNum}、重疊開關 ${g.overlapOnly}、裁切 ${g.clipped}、捲軸 ${g.hscroll}）` : ""}`);
      }
    }
    return { ok, note: `${w}px：${out.join("；")}；字型數字 tabular-nums、位於進度條之後與題目之前` };
  });
  await R.check(`TC-46-01-${w}`, "AC-46-01、AC-38-09、AC-31-03、UO-1", async () => {
    await p.ev(`localStorage.clear()`); await p.reload(); await p.go("part5"); await sleep(60);
    const q0 = await info(p); const st0 = await ls(p);
    const g = await p.ev(`(() => { const i = document.querySelector("#view-part5 [data-p5=only]"); const l = i.closest("label"); const r = l.getBoundingClientRect(); const ri = i.getBoundingClientRect();
      return { type: i.type, tag: i.tagName, labelText: l.textContent.trim(), w: r.width, h: r.height, appearance: getComputedStyle(i).appearance, role: i.getAttribute("role"), checked: i.checked, iw: ri.width, ih: ri.height }; })()`);
    const res = [];
    // Tab 取得焦點（從頁面開頭往後找）
    await p.ev(`document.activeElement && document.activeElement.blur(); window.scrollTo(0, 0)`);
    let reached = false, ring = "";
    for (let k = 0; k < 40; k++) { await p.key("Tab", "Tab", 9); const a = await p.ev(`(() => { const e = document.activeElement; if (!e || e.dataset.p5 !== "only") return null; const cs = getComputedStyle(e); return cs.outlineStyle + " " + cs.outlineWidth + " " + cs.outlineColor; })()`); if (a) { reached = true; ring = a; break; } }
    await p.key(" ", "Space", 32); await sleep(80); const s1 = await info(p); const f1 = await p.ev(`document.activeElement && document.activeElement.dataset.p5`); const l1 = (await ls(p)).data.part5UnansweredOnly;
    await p.key("Enter", "Enter", 13); await sleep(80); const s2 = await info(p); const f2 = await p.ev(`document.activeElement && document.activeElement.dataset.p5`); const l2 = (await ls(p)).data.part5UnansweredOnly;
    await p.ev(`document.activeElement && document.activeElement.blur()`);
    let s3 = null;
    if (w === 375) { await p.tap("#view-part5 [data-p5=only-label]"); await sleep(80); s3 = await info(p); await p.tap("#view-part5 [data-p5=only-label]"); await sleep(80); }
    else { await p.click("#view-part5 [data-p5=only-label]"); await sleep(80); s3 = await info(p); await p.click("#view-part5 [data-p5=only-label]"); await sleep(80); }
    const anim = await p.ev(`(() => { const l = document.querySelector("#view-part5 [data-p5=only-label]"); l.click(); const n = document.getAnimations().length; const cs = getComputedStyle(l.querySelector("input")); l.click(); return { n, tr: cs.transitionDuration, an: cs.animationName }; })()`);
    // 結算畫面也有開關
    await seed(p, { part5: { currentIndex: 199, phase: "summary", roundAnswered: 1, roundCorrect: 1, totalAnswered: 1, totalCorrect: 1 } }); const sm = await info(p);
    await p.click("#view-part5 [data-p5=only-label]"); await sleep(80); const sm2 = await info(p);
    res.push(`首次進入：開關 ${q0.onlies} 個、checked=${q0.only}、localStorage ${st0.data.part5UnansweredOnly}；元素 <${g.tag.toLowerCase()} type=${g.type}>（role ${g.role}、appearance ${g.appearance}，原生核取方塊勾選有 ✓ 形狀）、標籤「${g.labelText}」、觸控區 ${Math.round(g.w)}×${Math.round(g.h)}`);
    res.push(`Tab 取得焦點=${reached}（外框 ${ring}）；空白鍵 → ${s1.only}（焦點 ${f1}、localStorage ${l1}）；Enter → ${s2.only}（焦點 ${f2}、localStorage ${l2}）；${w === 375 ? "觸控" : "滑鼠"}點擊 → ${s3.only}；減少動態切換時動畫 ${anim.n}、transition ${anim.tr}、animation ${anim.an}；結算畫面開關 ${sm.onlies} 個、可切換 ${sm.only}→${sm2.only}`);
    const ok = q0.onlies === 1 && q0.only === false && st0.data.part5UnansweredOnly === false && g.tag === "INPUT" && g.type === "checkbox" && g.appearance !== "none" && g.labelText === "只練沒答對的題目" && g.w >= 44 && g.h >= 44
      && reached && /solid/.test(ring) && parseFloat(ring.split(" ")[1]) >= 2 && s1.only === true && l1 === true && f1 === "only" && s2.only === false && l2 === false && f2 === "only" && s3.only === true && anim.n === 0
      && sm.onlies === 1 && sm.summaryTitle && sm.only === false && sm2.only === true;
    return { ok, note: `${w}px：${res.join("；")}` };
  });
  await R.check(`TC-X-p5-${w}`, "Console 無未處理錯誤、無網路請求", async () => ({ ok: errs(p).length === 0 && netReqs(p).length === 0, note: `錯誤 ${J(errs(p)).slice(0, 300)}；非 file 請求 ${netReqs(p).length}` }));
  await p.close();
}

// ═════════ US-46：只練沒答對的題目（1366） ═════════
{
  const p = await open({ chooser: true });
  await p.goto();
  await R.check("TC-46-02", "AC-46-02、UO-2、AC-11-01～AC-11-07", async () => {
    await seed(p, { ids: ["p5-002"] }); await answer(p, 0, true); await p.click("#view-part5 [data-p5=next]"); await sleep(60);
    const a = await info(p);
    const ok = a.number === "第 2 / 200 題" && a.badge === "✓ 曾答對" && a.optEnabled === 4 && a.only === false && a.bar.now === "2";
    return { ok, note: `開關關閉、p5-002 曾答對：p5-001 作答後「下一題」→「${a.number}」、標示「${a.badge}」、可作答 ${a.optEnabled}/4、進度 ${a.bar.now}/${a.bar.max}` };
  });
  await R.check("TC-46-03", "AC-46-03、UO-5、Q-66、MT-1", async () => {
    await seed(p, { ids: ["p5-002", "p5-003"], only: true }); await answer(p, 0, false); const s0 = await ls(p);
    const m = await clickTimed(p, "#view-part5 [data-p5=next]", `document.querySelector("#view-part5 [data-p5=number]") && document.querySelector("#view-part5 [data-p5=number]").textContent === "第 4 / 200 題"`);
    await sleep(60); const a = await info(p); const s1 = await ls(p);
    const ok = m.ms !== null && m.ms <= 100 && a.number === "第 4 / 200 題" && !a.locked && a.optEnabled === 4 && !a.badge && a.bar.now === "4" && a.bar.max === "200" && s1.data.part5.roundAnswered === s0.data.part5.roundAnswered && s1.data.part5.totalAnswered === s0.data.part5.totalAnswered;
    return { ok, note: `開關開啟、p5-002／003 曾答對：p5-001 作答後「下一題」${m.ms} ms →「${a.number}」未作答=${!a.locked}、進度 aria-valuenow ${a.bar.now}/${a.bar.max}（填滿 ${a.bar.fill}）；本輪 ${s0.data.part5.roundAnswered}→${s1.data.part5.roundAnswered}、累計 ${s0.data.part5.totalAnswered}→${s1.data.part5.totalAnswered}（跳過不計）` };
  });
  await R.check("TC-46-03p", "AC-46-03（≤ 100ms，10 次）、NFR-4", async () => {
    await seed(p, { ids: range(1, 200).filter((_, i) => i % 2 === 1), only: true });
    const ms = []; const nums = [];
    for (let k = 0; k < 10; k++) {
      const i = await curIdx(p); await answer(p, i, false); const exp = `第 ${i + 3} / 200 題`;
      const m = await clickTimed(p, "#view-part5 [data-p5=next]", `document.querySelector("#view-part5 [data-p5=number]") && document.querySelector("#view-part5 [data-p5=number]").textContent === ${J(exp)}`);
      ms.push(m.ms); nums.push((await info(p)).number);
    }
    return { ok: ms.every((x) => x !== null && x <= 100), note: `偶數題曾答對、開關開啟，連續 10 次「下一題」（每次跳過 1 題）：${ms.join("、")} ms；題號 ${nums.join("、")}` };
  });
  await R.check("TC-46-04", "AC-46-04、UO-4、E-110", async () => {
    const out = [];
    // (a) 開關關閉、p5-010 曾答對且未作答 → 開啟
    await seed(p, { part5: { currentIndex: 9, totalAnswered: 12, totalCorrect: 7, roundAnswered: 3, roundCorrect: 2 }, ids: ["p5-010", "p5-011"] }); const a0 = await info(p); const s0 = await ls(p);
    const m = await clickTimed(p, "#view-part5 [data-p5=only]", `document.querySelector("#view-part5 [data-p5=number]") && document.querySelector("#view-part5 [data-p5=number]").textContent === "第 12 / 200 題"`);
    await sleep(60); const a1 = await info(p); const s1 = await ls(p);
    out.push(`(a)「${a0.number}」${a0.badge} → 開啟 ${m.ms} ms →「${a1.number}」未作答=${!a1.locked}、標示 ${a1.badges}`);
    // (b) 開關關閉、p5-010 已作答鎖定 → 開啟 → 維持結果；下一題 → p5-012
    await seed(p, { part5: { currentIndex: 9, totalAnswered: 12, totalCorrect: 7, roundAnswered: 3, roundCorrect: 2 }, ids: ["p5-011"] }); await answer(p, 9, true); const s2 = await ls(p);
    await p.click("#view-part5 [data-p5=only-label]"); await sleep(80); const b1 = await info(p); const s3 = await ls(p);
    await p.click("#view-part5 [data-p5=next]"); await sleep(80); const b2 = await info(p);
    out.push(`(b) p5-010 答對鎖定 → 開啟後「${b1.number}」鎖定=${b1.locked}、標示「${b1.badge}」；下一題 →「${b2.number}」`);
    // 重新載入情境：開關開啟、目前題號指向曾答對且未作答
    await seed(p, { part5: { currentIndex: 9 }, ids: ["p5-010", "p5-011"], only: true }); const c1 = await info(p);
    out.push(`重新載入（開啟、指向 p5-010 曾答對未作答）→「${c1.number}」未作答=${!c1.locked}`);
    // 開啟、關閉開關不改計數
    const cnt = (s) => J([s.data.part5.roundAnswered, s.data.part5.roundCorrect, s.data.part5.totalAnswered, s.data.part5.totalCorrect]);
    const ok = m.ms !== null && m.ms <= 100 && a0.number === "第 10 / 200 題" && a0.badge === "✓ 曾答對" && a1.number === "第 12 / 200 題" && !a1.locked && a1.badges === 0 && cnt(s0) === cnt(s1)
      && b1.number === "第 10 / 200 題" && b1.locked && b1.badge === "✓ 曾答對" && cnt(s2) === cnt(s3) && b2.number === "第 12 / 200 題" && !b2.locked && c1.number === "第 12 / 200 題" && !c1.locked;
    return { ok, note: out.join("；") + `；計數 (a) ${cnt(s0)}→${cnt(s1)}、(b) ${cnt(s2)}→${cnt(s3)}` };
  });
  await R.check("TC-46-05", "AC-46-05、UO-5、UO-6、AC-11-04、AC-40-01、E-112", async () => {
    await seed(p, { part5: { currentIndex: 9, totalAnswered: 4, totalCorrect: 2, roundAnswered: 2, roundCorrect: 1 }, ids: ["p5-001", ...range(11, 200)], only: true });
    const a0 = await info(p); await answer(p, 9, false); await p.click("#view-part5 [data-p5=next]"); await sleep(80); const sm = await info(p);
    await p.click("#view-part5 [data-p5=restart]"); await sleep(80); const r = await info(p);
    const ok = a0.number === "第 10 / 200 題" && sm.summaryTitle && sm.score === "答對 1 / 3" && sm.restart && sm.bar.now === sm.bar.max && !sm.allCorrect && r.number === "第 2 / 200 題" && !r.locked && r.optEnabled === 4 && !r.badge;
    return { ok, note: `開關開啟、p5-010 之後全部曾答對、之前 p5-002～009 未答對：作答 p5-010 後「下一題」→ 結算「${sm.score}」、重新開始鈕=${sm.restart}、進度 ${sm.bar.now}/${sm.bar.max}；「重新開始」→「${r.number}」未作答=${!r.locked}` };
  });
  await R.check("TC-46-06", "AC-46-06、UO-3、UO-7、MT-1、AC-38-09、E-111", async () => {
    const out = []; let ok = true;
    // 作答結束進入：只剩 p5-200 未答對
    await seed(p, { part5: { currentIndex: 199, totalAnswered: 50, totalCorrect: 40, roundAnswered: 5, roundCorrect: 4 }, ids: range(1, 199), only: true });
    await answer(p, 199, true); const lk = await info(p);
    await p.click("#view-part5 [data-p5=next]"); await sleep(100); const a = await info(p); const foc = await p.ev(`document.activeElement && document.activeElement.dataset.p5`);
    const btn = await p.ev(`[...document.querySelectorAll("#view-part5 [data-p5=replay], #view-part5 [data-p5=clear]")].map((b) => { const r = b.getBoundingClientRect(); return { tag: b.tagName, w: Math.round(r.width), h: Math.round(r.height) }; })`);
    let kb = 0; await p.ev(`document.activeElement && document.activeElement.blur(); window.scrollTo(0,0)`);
    for (let k = 0; k < 40 && kb < 2; k++) { await p.key("Tab", "Tab", 9); const t = await p.ev(`document.activeElement && document.activeElement.dataset.p5`); if (t === "replay" || t === "clear") kb++; }
    const g1 = lk.number === "第 200 / 200 題" && lk.locked && lk.badge === "✓ 曾答對" && a.allCorrect && a.title === "200 題全部答對！" && a.note === "每一題都至少答對過一次了。可以保留紀錄、全部題目再練一次，或清除答對紀錄後重新來過。"
      && a.score === "答對 5 / 6" && a.replay === "全部題目再練一次（保留紀錄）" && a.clear === "清除答對紀錄，重新來過" && a.optCount === 0 && a.number === null && !a.restart && a.count === countText(200) && a.bar.now === a.bar.max && a.only === true
      && btn.length === 2 && btn.every((b) => b.tag === "BUTTON" && b.w >= 44 && b.h >= 44) && kb === 2 && foc === "allcorrect-title" && !/第 \d+ \/ \d+ 題/.test(a.text);
    ok = ok && g1; out.push(`答對最後 1 題（p5-200）後仍顯示結果「${lk.number}」鎖定=${lk.locked}；「下一題」→「${a.title}」、說明句逐字=${a.note === "每一題都至少答對過一次了。可以保留紀錄、全部題目再練一次，或清除答對紀錄後重新來過。"}、本輪「${a.score}」、按鈕「${a.replay}」「${a.clear}」（${btn.map((b) => b.w + "×" + b.h).join("、")}，Tab 可達 ${kb}/2）、焦點 ${foc}、選項 ${a.optCount}、題號 ${a.number}、「${a.count}」、進度 ${a.bar.now}/${a.bar.max}`);
    // K = Q 時才開啟開關
    await seed(p, { part5: { currentIndex: 30 }, ids: range(1, 200) }); const b0 = await info(p); await p.click("#view-part5 [data-p5=only-label]"); await sleep(100); const b1 = await info(p);
    const g2 = b0.number === "第 31 / 200 題" && b0.badge === "✓ 曾答對" && b1.allCorrect && b1.score === null && b1.optCount === 0; ok = ok && g2;
    out.push(`K = Q、開關關閉在「${b0.number}」→ 開啟 → 全部答對畫面=${b1.allCorrect}（無本輪結算=${b1.score === null}）`);
    // K = Q 時開啟狀態下重新載入
    await p.reload(); await p.go("part5"); const c1 = await info(p); const g3 = c1.allCorrect && c1.optCount === 0 && c1.only === true; ok = ok && g3;
    out.push(`開啟狀態重新載入 → 全部答對畫面=${c1.allCorrect}、選項 ${c1.optCount}`);
    return { ok, note: out.join("；") };
  });
  await R.check("TC-46-07", "AC-46-07、UO-7 (a)、CR-7", async () => {
    await seed(p, { part5: { currentIndex: 120, totalAnswered: 50, totalCorrect: 40, roundAnswered: 5, roundCorrect: 4 }, ids: range(1, 200), only: true }); const a0 = await info(p);
    await p.click("#view-part5 [data-p5=replay]"); await sleep(100); const a = await info(p); const st = await ls(p); const foc = await p.ev(`document.activeElement && document.activeElement.dataset.p5`);
    await p.reload(); await p.go("part5"); const r = await info(p);
    const ok = a0.allCorrect && a.only === false && a.number === "第 1 / 200 題" && !a.locked && a.badge === "✓ 曾答對" && a.count === countText(200) && st.data.part5.totalAnswered === 50 && st.data.part5.totalCorrect === 40 && st.data.part5.roundAnswered === 0
      && st.data.part5UnansweredOnly === false && st.data.part5CorrectIds.length === 200 && r.only === false && r.number === "第 1 / 200 題";
    return { ok, note: `全部答對畫面按「全部題目再練一次（保留紀錄）」→ 開關 ${a.only}、「${a.number}」未作答=${!a.locked}、標示「${a.badge}」、「${a.count}」、累計 ${st.data.part5.totalAnswered}/${st.data.part5.totalCorrect}、本輪 ${st.data.part5.roundAnswered}、焦點 ${foc}；重新載入開關 ${r.only}、「${r.number}」` };
  });
  await R.check("TC-46-08", "AC-46-08、CR-6、UO-7 (b)、AC-17-04", async () => {
    await seed(p, { part5: { currentIndex: 120, totalAnswered: 50, totalCorrect: 40, roundAnswered: 5, roundCorrect: 4 }, ids: range(1, 200), only: true });
    const acc0 = await dashAcc(p); await p.go("part5");
    const out = []; let ok = true;
    for (const how of ["cancel", "esc", "backdrop"]) {
      const raw0 = await lsRaw(p); await p.click("#view-part5 [data-p5=clear]"); await sleep(150); const d = await dialogInfo(p);
      if (how === "cancel") await p.click('.dialog [data-action="cancel"]');
      else if (how === "esc") await p.key("Escape", "Escape", 27);
      else { const pt = await p.ev(`(() => { const b = document.querySelector(".dialog-backdrop"); const r = b.getBoundingClientRect(); return { x: r.left + 5, y: r.top + 5 }; })()`); for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) await p.send("Input.dispatchMouseEvent", { type, x: pt.x, y: pt.y, button: "left", clickCount: 1 }); }
      await sleep(150); const a = await info(p); const raw1 = await lsRaw(p); const d2 = await dialogInfo(p); const foc = await p.ev(`document.activeElement && document.activeElement.dataset.p5`);
      const good = !!d && d.message.includes("將清除全部題目的答對紀錄") && d.message.includes("累計答題數與正確率不受影響") && J([...d.buttons].sort()) === J(["取消", "確定"].sort()) && !d2 && a.allCorrect && raw0 === raw1;
      ok = ok && good; out.push(`${how}：對話框「${d && d.title}」「${d && d.message}」按鈕 ${J(d && d.buttons)} → 關閉=${!d2}、留在全部答對畫面=${a.allCorrect}、資料不變=${raw0 === raw1}、焦點 ${foc}`);
    }
    await p.click("#view-part5 [data-p5=clear]"); await sleep(150); await p.click('.dialog [data-action="ok"]'); await sleep(150);
    const a = await info(p); const st = await ls(p); const acc1 = await dashAcc(p); await p.reload(); await p.go("part5"); const r = await info(p);
    const g = J(st.data.part5CorrectIds) === "[]" && a.count === countText(0) && a.badges === 0 && a.only === true && a.number === "第 1 / 200 題" && !a.locked && st.data.part5.totalAnswered === 50 && st.data.part5.totalCorrect === 40 && acc0.acc === acc1.acc && r.count === countText(0);
    ok = ok && g; out.push(`確定 → 紀錄 ${J(st.data.part5CorrectIds)}、「${a.count}」、標示 ${a.badges}、開關 ${a.only}、「${a.number}」未作答=${!a.locked}、累計 ${st.data.part5.totalAnswered}/${st.data.part5.totalCorrect}、正確率 ${acc0.acc}→${acc1.acc}；重新載入「${r.count}」`);
    return { ok, note: out.join("；") };
  });
  await R.check("TC-46-09", "AC-46-09、UO-8", async () => {
    await seed(p, { part5: { currentIndex: 9 }, ids: ["p5-011"], only: true }); await answer(p, 9, false);
    await p.click("#view-part5 [data-p5=only-label]"); await sleep(80); const a0 = await info(p);
    await p.click("#view-part5 [data-p5=next]"); await sleep(80); const a = await info(p);
    const ok = a0.only === false && a0.number === "第 10 / 200 題" && a0.locked && a.number === "第 11 / 200 題" && a.badge === "✓ 曾答對" && !a.locked;
    return { ok, note: `開啟、p5-010 已作答 → 關閉開關（仍顯示「${a0.number}」鎖定=${a0.locked}）→「下一題」→「${a.number}」標示「${a.badge}」未作答=${!a.locked}` };
  });
  await R.check("TC-46-10", "AC-46-10、Q-69、AC-46-04（不變式）、US-32「有學習紀錄」不含開關", async () => {
    const out = [];
    await p.ev(`localStorage.clear()`); await p.reload(); await p.go("part5");
    await p.click("#view-part5 [data-p5=only-label]"); await sleep(80); const a0 = await info(p);
    await p.reload(); await p.go("part5"); const a1 = await info(p);
    await p.goto("about:blank", { waitReady: false }); await sleep(300); await p.goto(); await p.go("part5"); const a2 = await info(p);
    // 開關不屬「有學習紀錄」：只有開關開啟時套用棕不跳確認視窗
    await p.go("customizer"); await p.click('.cz-level[data-color="brown"]'); await sleep(40); await p.click("#cz-apply"); await sleep(150); const dlg = await dialogInfo(p); if (dlg) { await p.click('.dialog [data-action="cancel"]'); await sleep(100); }
    // 匯出 → 清除網站資料 → 匯入（不變式：開啟且指向曾答對未作答的題目 → 匯入後已跳題）
    const rec = await ls(p); rec.data.part5CorrectIds = ["p5-001", "p5-002"]; rec.data.part5.currentIndex = 0; await p.ev(`localStorage.setItem(${J(KEY)}, ${J(J(rec))})`); await p.reload();
    await p.go("dashboard"); await expandBackup(p); const before = new Set(fs.readdirSync(p.downloads)); await p.click('[data-action="export-backup"]'); let file = null;
    for (let i = 0; i < 60 && !file; i++) { const f = fs.readdirSync(p.downloads).filter((x) => !before.has(x) && x.endsWith(".json")); if (f.length) file = f[0]; else await sleep(100); }
    await sleep(150); const text = fs.readFileSync(path.join(p.downloads, file), "utf8"); const bj = JSON.parse(text);
    // 備份內 currentIndex 改回 0（指向曾答對的 p5-001）以驗匯入時的不變式
    bj.data.part5.currentIndex = 0; const f2 = path.join(TMP, "p5-only-" + Date.now() + ".json"); fs.writeFileSync(f2, J(bj));
    await p.ev(`localStorage.clear()`); await p.reload(); await p.go("dashboard"); await expandBackup(p);
    p.chooser = null; await p.click('[data-action="import-backup"]'); for (let i = 0; i < 60 && !p.chooser; i++) await sleep(50);
    await p.send("DOM.setFileInputFiles", { files: [f2], backendNodeId: p.chooser.backendNodeId }); await sleep(300); if (await dialogInfo(p)) { await p.click('.dialog [data-action="ok"]'); await sleep(300); }
    await p.go("part5"); const a3 = await info(p); await p.reload(); await p.go("part5"); const a4 = await info(p);
    out.push(`開啟 → ${a0.only}；重新載入 ${a1.only}；關閉重開 ${a2.only}；只開開關後套用棕 → 確認視窗=${!!dlg}；備份開關 ${bj.data.part5UnansweredOnly}；清除後匯入 → 開關 ${a3.only}、「${a3.number}」（p5-001、002 曾答對）未作答=${!a3.locked}；重新載入 ${a4.only}「${a4.number}」`);
    const ok = a0.only && a1.only && a2.only && !dlg && bj.data.part5UnansweredOnly === true && a3.only === true && a3.number === "第 3 / 200 題" && !a3.locked && a4.only === true && a4.number === "第 3 / 200 題";
    return { ok, note: out.join("；") };
  });
  await R.check("TC-X-p5-us46", "Console 無未處理錯誤、無網路請求（AC-47-08 (a)：作答、開關、清除答對紀錄、匯出、匯入）", async () => ({ ok: errs(p).length === 0 && netReqs(p).length === 0, note: `錯誤 ${J(errs(p)).slice(0, 300)}；非 file 請求 ${netReqs(p).length}` }));
  await p.close();
}

// ═════════ AC-47-08 (b)：npm run serve（V-PWA (b)）下本節全部功能各操作一次 ═════════
if (process.env.QA_BROWSER !== "edge") {
  const E = await import("./lib/pwa-env.mjs");
  await E.serve(E.SITE);
  try {
    await R.check("TC-47-08b", "AC-47-08 (b)、AC-37-05、WR-4", async () => {
      const browser = await E.launchBrowser();
      try {
        const env = await E.newEnv(browser, { reducedMotion: "reduce" }); const page = await env.newPage();
        const reqs = []; page.on("request", (r) => reqs.push({ url: r.url(), method: r.method(), body: !!r.postData() }));
        await page.goto(E.BASE); await sleep(800); await E.startLearning(page); const sw = await E.waitSW(page); await page.reload(); await sleep(800);
        const r0 = reqs.length;
        const ev = (js) => page.evaluate(js);
        // 換卡 3 次、作答答對、開關、構造全部答對後「清除答對紀錄」確定、匯出、匯入
        await E.goTab(page, "flashcards"); for (let i = 0; i < 3; i++) { await page.click("#view-flashcards .fc-next"); await sleep(60); }
        await E.goTab(page, "part5"); const c0 = await ev(`PART5_QUESTION_BANK[EMT.store.getState().data.part5.currentIndex].correctIndex`); await page.click(`#view-part5 [data-p5=option][data-index="${c0}"]`); await sleep(100);
        await page.click("#view-part5 [data-p5=only-label]"); await sleep(100);
        await ev(`(() => { const r = JSON.parse(localStorage.getItem(${J(KEY)})); r.data.part5CorrectIds = Array.from({ length: 200 }, (_, i) => "p5-" + String(i + 1).padStart(3, "0")); r.data.part5.lockedSelection = null; localStorage.setItem(${J(KEY)}, JSON.stringify(r)); })()`);
        await page.reload(); await sleep(800); await E.goTab(page, "part5"); const allC = await ev(`!!document.querySelector("#view-part5 [data-p5=allcorrect-title]")`);
        await page.click("#view-part5 [data-p5=clear]"); await sleep(200); await page.click('.dialog [data-action="ok"]'); await sleep(200);
        const k = await ev(`document.querySelector("#view-part5 [data-p5=correct-count]").textContent`);
        await E.goTab(page, "dashboard"); await page.click(".db-backup__toggle").catch(() => {}); await sleep(100);
        const [dl] = await Promise.all([page.waitForEvent("download"), page.click('[data-action="export-backup"]')]); const fpath = path.join(TMP, "p5-http-" + Date.now() + ".json"); await dl.saveAs(fpath);
        const [fc] = await Promise.all([page.waitForEvent("filechooser"), page.click('[data-action="import-backup"]')]); await fc.setFiles(fpath); await sleep(300);
        await page.click('.dialog [data-action="ok"]').catch(() => {}); await sleep(300);
        const allow = E.allowedUrls(E.BASE);
        const after = reqs.slice(r0); const bad = after.filter((q) => !allow.has(q.url.split("#")[0]) || q.method !== "GET" || q.body);
        const cross = reqs.filter((q) => !q.url.startsWith(E.ORIGIN));
        await env.ctx.close();
        const ok = sw.ok && allC && k === countText(0) && bad.length === 0 && cross.length === 0;
        return { ok, note: `service worker 啟用=${sw.ok}；操作期間請求 ${after.length} 筆（${[...new Set(after.map((q) => q.method + " " + q.url.replace(E.BASE, "./")))].join(" ") || "無"}），非允許清單／非 GET／帶本文 ${bad.length}；全程跨來源 ${cross.length}；全部答對畫面=${allC}、清除後「${k}」` };
      } finally { await browser.close(); }
    });
  } finally { await E.stopServer(); }
}

R.save(resultPath("e2e-track-p5"));
console.log(`e2e-track-p5：通過 ${R.results.filter((r) => r.result === "通過").length}、失敗 ${R.results.filter((r) => r.result === "失敗").length}`);
