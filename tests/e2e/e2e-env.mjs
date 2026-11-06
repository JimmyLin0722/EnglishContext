// QA E2E 套件 5：儲存異常（AC-18-03～AC-18-05、AC-24-09、AC-24-01 停用）、網路請求（AC-18-06、AC-21-01）、
// 離線（AC-19-02 自動化部分）、file:// 開啟（AC-19-03）、RWD（AC-20-01～AC-20-03、AC-23-02 375px）、效能（AC-22-01～AC-22-05）
// 第 3 輪（PRD v0.9／v0.10）：導覽 4 項、解碼器與句型庫暫停（不量、不檢查）；分數輸入隱藏，改點卡片；按麥克風先取得麥克風（fakeMic）
import fs from "node:fs";
import path from "node:path";
import { launch, recorder, sleep, FILE_URL, resultPath } from "./lib/cdp.mjs";
import { TOAST_RECORDER, fakeTts, fakeStt, fakeClipboard, storageMode, fakeMic, micOnStrict } from "./lib/inits.mjs";
import { stateRecord, readState, dashGoal, GOAL_LINE, expandBackup, injectTpl } from "./lib/state.mjs";

const R = recorder("e2e-env");
const KEY = "englishMasterTrack:state";
const TMP = process.env.QA_TMP || path.resolve("tests/results/tmp");
fs.mkdirSync(TMP, { recursive: true });
const TABS = ["dashboard", "customizer", "flashcards", "part5", "sources"];
/** 按麥克風並等待進入聆聽中 */
// 第 10 輪（v0.20 US-58）：先準備中，替身 audiostart 或 T_FALLBACK 後才聆聽中；未經準備中即拋出（architecture §10.12 Q2）
async function micOn(p) { return micOnStrict(p); }
const toasts = (p) => p.ev(`window.__qaToasts.map((t) => t.text)`);

async function open(inits = [], vp = [1366, 900]) {
  const p = await launch();
  await p.addInitScript(TOAST_RECORDER);
  for (const s of inits) await p.addInitScript(s);
  await p.viewport(vp[0], vp[1]);
  return p;
}

// ═════════ AC-18-03、AC-24-01（停用）：localStorage 停用 ═════════
{
  const p = await open([storageMode("disabled"), fakeTts("ok"), fakeStt("ok"), fakeMic("ok")]);
  await p.goto();
  await R.check("TC-18-03", "AC-18-03、AC-24-01", async () => {
    const banner = await p.ev(`document.getElementById("app-banner").innerText`);
    await p.go("customizer"); await p.click('.cz-level[data-color="brown"]'); await p.click("#cz-apply");
    await p.type("#cv-word", "qastorageoff"); await p.type("#cv-meaning", "停用測試"); await p.click('.cv-form button[type="submit"]'); await sleep(80);
    await injectTpl(p, "cs"); await sleep(80);
    await p.go("flashcards"); const total = await p.text(".fc-total"); await p.click(".fc-flip");
    await p.go("part5"); await p.click("[data-p5=option]", 0); const answered = await p.ev(`EMT.store.getState().data.part5.totalAnswered`);
    await p.go("dashboard"); await sleep(300); await expandBackup(p); await p.click('[data-action="export-backup"]');
    let files = []; for (let i = 0; i < 30; i++) { await sleep(100); files = fs.readdirSync(p.downloads).filter((f) => f.endsWith(".json")); if (files.length) break; }
    const j = files.length ? JSON.parse(fs.readFileSync(path.join(p.downloads, files[0]), "utf8")) : null;
    const d = await p.ev(`[...document.querySelectorAll("#view-dashboard .db-stat")].map((x) => x.innerText.replace(/\\s*\\n\\s*/g, "=")).join("；")`);
    return { ok: banner.includes("進度將無法保存") && total === "共 2820 張" && answered === 1 && !!j && j.data.goal.appliedScore === 465 && j.data.goal.effectiveColor === "brown" && j.data.customVocab.length === 11 && p.log.exceptions.length === 0,
      note: `警示「${banner}」；點棕套用 + 自訂 1 + 範本 10 → ${total}；Part 5 作答 ${answered}；匯出 ${files[0] || "無"}（分數 ${j && j.data.goal.appliedScore}、自訂 ${j && j.data.customVocab.length}）；主控台 ${d}；例外 ${p.log.exceptions.length}` };
  });
  await p.close();
}

// ═════════ AC-18-04、AC-24-09：容量不足 ═════════
{
  const p = await open([storageMode("quota")]);
  await p.goto();
  await p.ev(`window.__qaQuota = false`);
  await R.check("TC-18-04", "AC-18-04", async () => {
    await p.go("customizer");
    await p.type("#cv-word", "qaquotaok"); await p.type("#cv-meaning", "正常"); await p.click('.cv-form button[type="submit"]'); await sleep(60);
    const before = await p.ev(`localStorage.getItem(${JSON.stringify(KEY)})`);
    await p.ev(`window.__qaQuota = true`);
    const n = (await toasts(p)).length;
    await p.type("#cv-word", "qaquotafail"); await p.type("#cv-meaning", "容量不足"); await p.click('.cv-form button[type="submit"]'); await sleep(80);
    const msg = await p.ev(`(() => { const m = document.querySelector(".cv-form__message"); return [m && !m.hidden ? m.textContent : "", ...[...document.querySelectorAll(".cv-form .field__error")].filter((e) => !e.hidden).map((e) => e.textContent)].filter(Boolean); })()`);
    await injectTpl(p, "business"); await sleep(100);
    const tst = (await toasts(p)).slice(n);
    const status = await p.ev(`(() => { const s = document.querySelector(".cv-templates__status"); return s && !s.hidden ? s.textContent : ""; })()`);
    const after = await p.ev(`localStorage.getItem(${JSON.stringify(KEY)})`);
    const mem = await p.ev(`EMT.store.getState().data.customVocab.map((c) => c.word)`);
    await p.ev(`window.__qaQuota = false`);
    const all = [...msg, ...tst, status].join(" | ");
    return { ok: all.includes("儲存空間不足") && !all.includes("已注入") && before === after && mem.join() === "qaquotaok" && JSON.parse(after).data.customVocab.length === 1,
      note: `新增時訊息 ${JSON.stringify(msg)}；範本注入 toast ${JSON.stringify(tst)}、狀態「${status}」；localStorage 不變=${before === after}；記憶體自訂字 ${mem.join(",")}` };
  });
  await R.check("TC-24-09", "AC-24-09", async () => {
    await p.go("dashboard"); await sleep(300); await expandBackup(p);
    await p.send("Page.setInterceptFileChooserDialog", { enabled: true });
    let chooser = null; p.onEvent((m) => { if (m.method === "Page.fileChooserOpened") chooser = m.params; });
    const backup = await p.ev(`EMT.store.actions.exportBackup().json`);
    const b = JSON.parse(backup); b.data.goal = { draftScore: 800, appliedScore: 800, appliedColor: "blue", effectiveColor: "green" };
    const f = path.join(TMP, "quota-import.json"); fs.writeFileSync(f, JSON.stringify(b));
    const before = await p.ev(`localStorage.getItem(${JSON.stringify(KEY)})`); const mem = await p.ev(`JSON.stringify(EMT.store.getState().data)`);
    await p.ev(`window.__qaQuota = true`);
    const n = (await toasts(p)).length;
    await p.click('[data-action="import-backup"]'); for (let i = 0; i < 40 && !chooser; i++) await sleep(50);
    await p.send("DOM.setFileInputFiles", { files: [f], backendNodeId: chooser.backendNodeId }); await sleep(250);
    await p.click('.dialog [data-action="ok"]'); await sleep(250);
    const t = (await toasts(p)).slice(n);
    await p.ev(`window.__qaQuota = false`);
    const after = await p.ev(`localStorage.getItem(${JSON.stringify(KEY)})`); const mem2 = await p.ev(`JSON.stringify(EMT.store.getState().data)`);
    return { ok: t.includes("儲存空間不足，未匯入") && before === after && mem === mem2, note: `提示 ${JSON.stringify(t)}；localStorage 不變=${before === after}；記憶體不變=${mem === mem2}` };
  });
  await p.close();
}

// ═════════ AC-18-05：資料損壞 ═════════
{
  const p = await open();
  await p.goto();
  await R.check("TC-18-05", "AC-18-05", async () => {
    const out = []; let ok = true;
    const valid = JSON.stringify(stateRecord(605));
    const variants = { "非 JSON": "{broken", "Schema 不符": JSON.stringify({ ...JSON.parse(valid), data: { ...JSON.parse(valid).data, goal: { draftScore: 5000 } } }), "版本 99": JSON.stringify({ ...JSON.parse(valid), schemaVersion: 99 }), "V-ST-03 違反": JSON.stringify({ ...JSON.parse(valid), data: { ...JSON.parse(valid).data, vocabQuiz: { answered: 1, correct: 5 } } }) };
    for (const [k, v] of Object.entries(variants)) {
      await p.ev(`localStorage.setItem(${JSON.stringify(KEY)}, ${JSON.stringify(v)})`);
      await p.reload();
      const t = await toasts(p);
      await p.ev(`EMT.router.go("dashboard")`); await sleep(300); const d = await dashGoal(p); // 第 5 輪：今日任務卡目標行（AC-39-04）
      const saved = await p.ev(`localStorage.getItem("englishMasterTrack:unreadable")`);
      // 第 5 輪：v0.12 主控台精簡、資料備份預設收合，畫面文字少於舊門檻 200 字；改以主控台主要元素可見判定「正常顯示」
      const visible = await p.ev(`(() => { const b = document.querySelector("#view-dashboard .db-start"); return !!b && b.getClientRects().length > 0 && document.body.innerText.length > 50; })()`);
      const g = (await readState(p)).data.goal;
      const good = t.includes("資料讀取失敗，已重設") && d === GOAL_LINE.green && g.appliedScore === 725 && saved === v && visible;
      ok = ok && good; out.push(`${k}：toast ${JSON.stringify(t)}、主控台 ${d}、localStorage 目標分數 ${g.appliedScore}、原字串保存=${saved === v}、畫面正常顯示=${visible}`);
    }
    return { ok: ok && p.log.exceptions.length === 0, note: out.join("；") };
  });
  await p.close();
}

// ═════════ AC-18-06、AC-21-01、AC-19-03：完整操作的網路請求 ═════════
{
  const p = await open([fakeTts("ok"), fakeStt("ok"), fakeClipboard("ok"), fakeMic("ok")]);
  await p.goto();
  await R.check("TC-21-01", "AC-21-01、AC-18-06、AC-19-03", async () => {
    const start = p.log.requests.length;
    await p.go("customizer"); await p.click('.cz-level[data-color="brown"]'); await p.click("#cz-apply"); await injectTpl(p, "biostat");
    await p.type("#cv-word", "qanet"); await p.type("#cv-meaning", "網路"); await p.click('.cv-form button[type="submit"]');
    await p.go("flashcards"); await p.click(".fc-flip"); await p.click(".fc-next"); await p.click(".fc-front .sp-tts__btn"); await p.ev(`EMT.store.actions.acknowledgeSttNotice()`);
    await micOn(p); await p.ev(`window.__qaMic.setDb(-20)`); await sleep(300); await p.ev(`(() => { const r = window.__qaStt.last; r.emitResult("hello"); r.emitEnd(); })()`);
    await p.click(".fc-mode-btn"); await p.click(".fcq-option", 0); await p.click(".fc-mode-btn");
    await p.go("part5"); await p.click("[data-p5=option]", 1); await p.click("[data-p5=next]");
    // 第 3 輪：另切換難易度觸發初始化確認視窗並按「確定」、匯入備份
    await p.go("customizer"); await p.click('.cz-level[data-color="orange"]'); await p.click("#cz-apply"); await sleep(100); if (await p.ev(`!!document.querySelector(".dialog")`)) await p.click('.dialog [data-action="ok"]');
    await p.go("sources"); await p.ev(`document.querySelectorAll("#view-sources details").forEach((d) => d.open = true)`);
    await p.go("dashboard"); await sleep(300); await expandBackup(p); await p.click('[data-action="export-backup"]'); await sleep(500);
    const reqs = p.log.requests.slice(start);
    const all = p.log.requests.map((r) => r.url.slice(0, 80));
    const nonLocal = p.log.requests.filter((r) => !r.url.startsWith("file://") && !/^(blob|data):/.test(r.url));
    const resErr = p.log.logEntries.filter((e) => e.level === "error");
    return { ok: reqs.filter((r) => !/^blob:/.test(r.url)).length === 0 && nonLocal.length === 0 && resErr.length === 0 && p.log.exceptions.length === 0,
      note: `操作含點卡片套用、自訂單字、範本、翻卡、TTS、麥克風收音條與 STT、四選一、模擬測驗、初始化確認、資料來源頁、匯出；整個工作階段請求 ${p.log.requests.length} 筆（${JSON.stringify(all)}）；載入後操作期間請求 ${reqs.length} 筆（${JSON.stringify(reqs.map((r) => r.url.slice(0, 40)))}）；非本機請求 ${nonLocal.length}；Console 資源錯誤 ${resErr.length}；以 file:// 直接開啟（無伺服器）正常運作` };
  });
  await p.close();
}

// ═════════ AC-19-02（自動化部分）：離線開啟 ═════════
{
  const p = await open([fakeTts("ok")]);
  await p.send("Network.emulateNetworkConditions", { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await p.goto();
  await R.check("TC-19-02a", "AC-19-02", async () => {
    const out = [];
    for (const t of TABS) { await p.go(t); out.push(`${t}:${await p.ev(`(() => { const s = document.getElementById("view-${t}"); return !s.hidden && s.innerText.trim().length > 20; })()`)}`); }
    await p.go("flashcards"); await p.click(".fc-front .sp-tts__btn"); const sp = await p.ev(`window.__qaTts.spoken.length`);
    const errs = p.log.logEntries.filter((e) => e.level === "error").concat(p.log.console.filter((c) => c.type === "error").map((c) => ({ text: c.text })));
    return { ok: out.every((x) => x.endsWith("true")) && errs.length === 0 && sp === 1 && (await p.ev(`navigator.onLine`)) === false, note: `離線模擬下各頁 ${out.join(" ")}；TTS（本機語音）朗讀 ${sp} 次；Console 錯誤 ${errs.length}；實機斷網列人工 TC-M03` };
  });
  await p.close();
}

// ═════════ RWD：AC-20-01、AC-14-02、AC-23-02（375） ═════════
const LAYOUT = `(() => {
  const d = document.documentElement, cw = d.clientWidth, vw = window.innerWidth;
  const vis = (el) => { const s = getComputedStyle(el); if (s.display === "none" || s.visibility === "hidden") return false; if (el.closest("[hidden]")) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const desc = (el) => el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\\s+/).slice(0, 2).join(".") : "");
  const out = [], clip = [], overlap = [];
  for (const el of document.querySelectorAll("body *")) {
    if (!vis(el)) continue;
    const r = el.getBoundingClientRect();
    let p = el.parentElement, inScroller = false;
    while (p && p !== document.body) { const ox = getComputedStyle(p).overflowX; if (ox === "auto" || ox === "scroll") { inScroller = true; break; } p = p.parentElement; }
    if (!inScroller && (r.right > cw + 1 || r.left < -1)) out.push(desc(el) + " [" + Math.round(r.left) + "," + Math.round(r.right) + "]");
    const s = getComputedStyle(el);
    // 第 5 輪：色級列說明 .cz-level__desc 依 AC-26-01（v0.12）「一行，過長截斷」以省略號截斷屬 AC 允許（SD-FB-47）；名稱與數字仍檢查
    if (el.classList.contains("cz-level__desc")) continue;
    if (el.children.length === 0 && el.textContent.trim() && !el.closest(".visually-hidden") && (s.overflowX === "hidden" || s.overflow === "hidden" || s.textOverflow === "ellipsis") && el.scrollWidth > el.clientWidth + 1) clip.push(desc(el));
  }
  // 按鈕之間重疊
  // v0.8：固定於視窗底部的導覽列（US-27）與捲動中的內容重疊屬 AC-27-03 範圍（另由 e2e-v08 檢查），此處排除固定定位元素
  const fixedAnc = (el) => { for (let x = el; x && x !== document.body; x = x.parentElement) if (getComputedStyle(x).position === "fixed") return true; return false; };
  const btns = [...document.querySelectorAll("button, input, select, textarea, a[href], summary")].filter(vis).filter((b) => !fixedAnc(b)).map((b) => [b, b.getBoundingClientRect()]);
  for (let i = 0; i < btns.length; i++) for (let j = i + 1; j < btns.length; j++) { const [a, ra] = btns[i], [b, rb] = btns[j]; if (a.contains(b) || b.contains(a)) continue;
    const ix = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), iy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top); if (ix > 2 && iy > 2) overlap.push(desc(a) + "×" + desc(b)); }
  return { hScroll: d.scrollWidth > cw, sw: d.scrollWidth, cw, out: out.slice(0, 6), outN: out.length, clip: clip.slice(0, 6), overlap: overlap.slice(0, 6) };
})()`;
{
  const p = await open([fakeTts("ok"), fakeStt("ok"), fakeMic("ok")]);
  await p.viewport(1366, 900);
  await p.goto();
  // 加入長字串自訂單字與 XSS 字串，檢查斷行
  await p.go("customizer");
  await p.type("#cv-word", "Pneumonoultramicroscopicsilicovolcanoconiosis"); await p.type("#cv-meaning", "肺塵病".repeat(20)); await p.type("#cv-collocation", "x".repeat(120)); await p.click('.cv-form button[type="submit"]'); await sleep(80);
  const states = [
    ["dashboard", null], ["customizer", null], ["flashcards", null], ["flashcards", "flip"], ["flashcards", "quiz"], ["flashcards", "custom-long"], ["part5", null], ["part5", "answered"],
    ["sources", null], ["sources", "details"],
  ];
  const results = [];
  for (const [w, h] of [[375, 667], [768, 1024], [1366, 768], [1920, 1080]]) {
    await p.viewport(w, h); await p.reload();
    for (const [tab, mode] of states) {
      await p.go(tab);
      if (mode === "flip") await p.click(".fc-flip");
      if (mode === "quiz") { await p.click(".fc-mode-btn"); await sleep(40); await p.click(".fcq-option", 0); }
      if (mode === "custom-long") { const n = await p.ev(`EMT.store.getState().runtime.studySet.length`); await p.ev(`EMT.store.actions.setFlashcardMode && EMT.store.actions.setFlashcardMode("card"); EMT.store.actions.gotoCard(${n - 1})`); await sleep(40); await p.click(".fc-flip"); }
      if (mode === "answered") await p.click("[data-p5=option]", 1);
      if (mode === "labels") await p.click(".dc-label-toggle");
      if (mode === "strategies") await p.ev(`document.querySelectorAll(".dc-strategy").forEach((d) => d.open = true)`);
      if (mode === "details") await p.ev(`document.querySelectorAll("#view-sources details").forEach((d) => d.open = true)`);
      await sleep(60);
      // 第 8 輪：等答題 pop 動畫結束再量版面（動畫中 transform 放大使選項暫時重疊，高負載時才會量到；diag-r8-quizpop）
      await p.ev(`Promise.race([Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))), new Promise((r) => setTimeout(r, 1500))]).then(() => 1)`);
      const r = await p.ev(LAYOUT);
      results.push({ vp: `${w}x${h}`, page: tab + (mode ? "/" + mode : ""), ...r });
      if (mode === "quiz") await p.click(".fc-mode-btn");
      if (mode === "flip" || mode === "custom-long") await p.click(".fc-flip");
      if (mode === "labels") await p.click(".dc-label-toggle");
    }
  }
  const bad = results.filter((r) => r.hScroll || r.outN || r.clip.length || r.overlap.length);
  R[bad.length === 0 ? "pass" : "fail"]("TC-20-01", "AC-20-01", `${results.length} 個畫面狀態（4 尺寸 × ${states.length} 狀態）；問題 ${bad.length}${bad.length ? "：" + bad.slice(0, 5).map((b) => `${b.vp} ${b.page} sw=${b.sw}/${b.cw} 超出=${b.out.join(",")} 裁切=${b.clip.join(",")} 重疊=${b.overlap.join(",")}`).join("；") : ""}`);
  const s375 = results.filter((r) => r.vp === "375x667" && r.page.startsWith("sources"));
  R[s375.every((r) => !r.hScroll && !r.outN && !r.clip.length) ? "pass" : "fail"]("TC-23-02b", "AC-23-02（375px）", s375.map((r) => `${r.page}：水平捲軸=${r.hScroll}、超出 ${r.outN}、裁切 ${r.clip.length}`).join("；"));
  R.na("TC-14-02", "AC-14-02", "PRD v0.10 標「v0.9 暫停（隱藏）」，本版不驗收（原 375px 閱讀策略檢查）；AC-23-02 的 375px 部分改由 TC-23-02b");
  fs.writeFileSync(path.join(TMP, "rwd-results.json"), JSON.stringify(results, null, 2));
  await p.close();
}

// ═════════ AC-20-02、AC-20-03：375px 觸控 ═════════
{
  const p = await open([fakeTts("ok"), fakeStt("ok"), fakeClipboard("ok"), fakeMic("ok")], [375, 667]);
  await p.goto();
  const steps = []; const small = [];
  const T = async (name, sel, check, nth = 0) => {
    try { for (let w = 0; w < 80 && (await p.ev(`document.querySelectorAll("#toast-root .toast").length`)); w++) await sleep(100); const pt = await p.tap(sel, nth); const ok = await check(); steps.push(`${name}:${ok && pt.hitOk ? "OK" : "NG"}`); if (pt.w < 44 || pt.h < 44) small.push(`${name} ${Math.round(pt.w)}×${Math.round(pt.h)}`); }
    catch (e) { steps.push(`${name}:例外 ${e.message.slice(0, 60)}`); }
  };
  const cur = () => p.ev(`EMT.router.current()`);
  // v0.8：≤ 640px 為固定底部導覽列（US-27），不再有「選單」按鈕；若選單鈕可見（舊版面）才先展開
  const toggleVisible = () => p.ev(`(() => { const b = document.getElementById("nav-toggle"); if (!b) return false; const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(b).display !== "none"; })()`);
  const navTo = async (tab) => { if (await toggleVisible()) await T("選單", "#nav-toggle", async () => (await p.ev(`document.getElementById("nav-toggle").getAttribute("aria-expanded")`)) === "true"); await T("導覽 " + tab, `#app-nav [data-tab="${tab}"]`, async () => (await cur()) === tab); };
  const reach = [];
  for (const t of ["dashboard", "customizer", "flashcards", "part5"]) { await navTo(t); reach.push(`${t}:${(await cur()) === t}`); }
  const navInfo = await p.ev(`(() => { const nav = document.getElementById("app-nav"); const cs = getComputedStyle(nav); const r = nav.getBoundingClientRect();
    return { labels: [...nav.querySelectorAll("[data-tab]")].map((b) => (b.querySelector(".app-nav__label") || b).textContent.trim()).join("、"), position: cs.position, bottomGap: Math.round(window.innerHeight - r.bottom), toggle: getComputedStyle(document.getElementById("nav-toggle")).display }; })()`);
  const labelsOk = navInfo.labels === "主控台、難易度設定、單字卡、模擬測驗";
  R[reach.every((x) => x.endsWith("true")) && labelsOk && navInfo.position === "fixed" && navInfo.bottomGap === 0 ? "pass" : "fail"]("TC-20-03", "AC-20-03", `375px 以導覽到達：${reach.join(" ")}；導覽文字「${navInfo.labels}」；導覽 position=${navInfo.position}、距視窗底 ${navInfo.bottomGap}px、選單鈕 display=${navInfo.toggle}`);

  await navTo("customizer");
  // 第 3 輪（v0.10）：分數滑桿與輸入框已隱藏，不在檢查範圍（AC-20-02）；改逐一觸控 5 張色級卡片
  for (const [c, sc] of [["orange", 215], ["brown", 465], ["blue", 855], ["gold", 990], ["green", 725]]) await T("色級 " + c, `.cz-level[data-color="${c}"]`, async () => (await p.ev(`EMT.store.getState().data.goal.draftScore`)) === sc);
  await T("套用", "#cz-apply", async () => !(await p.ev(`!!document.querySelector(".dialog")`)));
  await T("英文單字欄", "#cv-word", async () => (await p.ev(`document.activeElement.id`)) === "cv-word");
  await p.send("Input.insertText", { text: "qatouch" });
  await T("中文釋義欄", "#cv-meaning", async () => (await p.ev(`document.activeElement.id`)) === "cv-meaning");
  await p.send("Input.insertText", { text: "觸控" });
  await T("新增單字", '.cv-form button[type="submit"]', async () => (await p.ev(`EMT.store.getState().data.customVocab.length`)) === 1);
  await injectTpl(p, "cs"); // 第 6 輪：範本按鈕已隱藏（AC-43-01），不再列入觸控目標；以 store 注入維持後續「刪除自訂字」的前置狀態
  await T("刪除自訂字", ".cv-item__delete", async () => { if (await p.ev(`!!document.querySelector(".dialog")`)) await p.tap('.dialog [data-action="ok"]'); return (await p.ev(`EMT.store.getState().data.customVocab.length`)) === 10; });
  await navTo("flashcards");
  await T("翻面", ".fc-flip", async () => (await p.ev(`document.querySelector(".fc-card").dataset.flipped`)) === "true");
  await T("點卡片翻回", ".fc-card .fc-back .fc-word", async () => (await p.ev(`document.querySelector(".fc-card").dataset.flipped`)) === "false");
  await T("下一張", ".fc-next", async () => (await p.text(".fc-position")).startsWith("第 2"));
  await T("上一張", ".fc-prev", async () => (await p.text(".fc-position")).startsWith("第 1"));
  await T("TTS 1.0x", ".fc-front .sp-tts__btn", async () => (await p.ev(`window.__qaTts.spoken.length`)) === 1);
  await T("TTS 0.75x", ".fc-front .sp-tts__btn", async () => (await p.ev(`window.__qaTts.spoken.length`)) === 2, 1);
  await T("麥克風", ".fc-front .sp-mic", async () => !!(await p.ev(`document.querySelector(".dialog")`)));
  await T("說明 我知道了", '.dialog [data-action="ok"]', async () => { for (let i = 0; i < 20 && (await p.ev(`window.__qaStt.starts`)) < 1; i++) await sleep(25); return (await p.ev(`window.__qaStt.starts`)) === 1; });
  await T("麥克風停止", ".fc-front .sp-mic", async () => (await p.ev(`document.querySelector(".fc-front .sp-mic").dataset.status`)) === "idle");
  await T("測驗模式", ".fc-mode-btn", async () => !!(await p.ev(`document.querySelector(".fcq")`)));
  await T("四選一選項", ".fcq-option", async () => (await p.ev(`document.querySelector(".fcq").dataset.answered`)) === "true", 2);
  await T("離開測驗模式", ".fc-mode-btn", async () => !(await p.ev(`document.querySelector(".fcq")`)));
  await navTo("part5");
  await T("Part 5 選項", "[data-p5=option]", async () => (await p.ev(`document.querySelector("[data-p5=option]").disabled`)) === true, 3);
  await T("下一題", "[data-p5=next]", async () => (await p.text("[data-p5=number]")).includes("第"));
  await T("頁尾 資料來源", "#footer-sources", async () => (await cur()) === "sources");
  await navTo("dashboard");
  // 第 5 輪（v0.12）：功能入口移除；改觸控「資料備份」展開、「變更」與「開始今日學習」
  await T("資料備份 展開", ".db-backup__toggle", async () => (await p.ev(`document.querySelector(".db-backup__toggle").getAttribute("aria-expanded")`)) === "true");
  await T("變更", ".db-change", async () => (await cur()) === "customizer");
  await navTo("dashboard");
  await T("開始今日學習", ".db-start", async () => (await cur()) === "flashcards");
  // 第 3 輪：初始化確認視窗的按鈕（已有學習紀錄後點橘套用 → 取消）
  await navTo("customizer");
  await T("色級 橘（有紀錄）", '.cz-level[data-color="orange"]', async () => true);
  await T("套用（跳出確認視窗）", "#cz-apply", async () => !!(await p.ev(`document.querySelector(".dialog")`)));
  await T("確認視窗 取消", '.dialog [data-action="cancel"]', async () => !(await p.ev(`document.querySelector(".dialog")`)) && (await p.ev(`EMT.store.getState().data.goal.effectiveColor`)) === "green");
  const okAll = steps.every((s) => s.includes(":OK"));
  R[okAll ? "pass" : "fail"]("TC-20-02", "AC-20-02", `375px 觸控操作 ${steps.length} 項：${steps.join("、")}；小於 44px 的點擊目標：${small.join("、") || "無"}`);
  await p.close();
}

// ═════════ 效能：AC-22-01～AC-22-04（4 倍 CPU 降速）、AC-22-05 ═════════
// BUG-002 第 2 輪起：依人類決議（JimmyLin，2026-10-30）改為多輪判定，規則見 test-plan §2.3「效能多輪判定規則」：
// 1. 執行 QA_PERF_RUNS 輪（預設 7），每輪重新啟動瀏覽器；2. 排除「同一輪多數頁面同時偏高」的輪次；
// 3. 剩餘 ≥ 3 輪時，每個量測位置的中位數 ≤ 100ms 且合併樣本 p90 ≤ 100ms 才通過。
// TC-22-01 改用嚴格量法：切到自訂器時計時到 #customizer-custom 由 hidden 轉為顯示的那個畫格繪製完成（rAF 內偵測 + setTimeout 0）。
const PERF_RUNS = Math.max(3, Number(process.env.QA_PERF_RUNS || 7));
// 第 3 輪：解碼器與句型庫暫停，10 個切頁位置改為 4 個功能區與資料來源頁
const NAV_TABS = ["customizer", "flashcards", "part5", "dashboard", "sources", "customizer", "flashcards", "part5", "sources", "dashboard"];
async function perfRun(withLoads) {
  const p = await open([fakeTts("ok"), fakeStt("ok"), fakeMic("ok")]);
  await p.goto();
  // 減少動態下的切頁量測（嚴格量法：計時到 #customizer-custom 也顯示並繪製完成）
  const measureNav = () => p.ev(`(async () => { const tabs = ${JSON.stringify(NAV_TABS)}; const out = [];
      const frame = () => new Promise((r) => requestAnimationFrame(r)); const paint = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
      for (const t of tabs) { const b = document.querySelector('#app-nav [data-tab="' + t + '"]') || document.getElementById("footer-sources"); const t0 = performance.now(); b.click(); await paint();
        if (t === "customizer") { const h = document.getElementById("customizer-custom"); let n = 0; while (h.hidden && n < 120) { await frame(); n++; } await new Promise((r) => setTimeout(r, 0)); }
        out.push(+(performance.now() - t0).toFixed(1)); await new Promise((r) => setTimeout(r, 30)); }
      return out; })()`);
  const measure = async (label) => {
    const nav = await p.ev(`(async () => { const tabs = ${JSON.stringify(NAV_TABS)}; const loose = [], strict = [], strictRaf = [], hostInfo = [];
      const frame = () => new Promise((r) => requestAnimationFrame(r)); const paint = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
      for (const t of tabs) { const b = document.querySelector('#app-nav [data-tab="' + t + '"]') || document.getElementById("footer-sources"); const t0 = performance.now(); b.click();
        const hostNow = t === "customizer" ? document.getElementById("customizer-custom").hidden : false;
        await paint(); const l = +(performance.now() - t0).toFixed(1); loose.push(l);
        if (t === "customizer") {
          const h = document.getElementById("customizer-custom"); let n = 0;
          while (h.hidden && n < 120) { await frame(); n++; } // 在 #customizer-custom 轉為顯示的那個畫格內偵測到
          await new Promise((r) => setTimeout(r, 0)); // 該畫格繪製完成
          strict.push(+(performance.now() - t0).toFixed(1));
          hostInfo.push({ wasHidden: hostNow, frames: n, visible: !h.hidden, height: h.offsetHeight, children: h.querySelectorAll("*").length });
          await paint(); strictRaf.push(+(performance.now() - t0).toFixed(1)); // 參考：再多等一個畫格
        } else { strict.push(l); strictRaf.push(l); }
      } return { loose, strict, strictRaf, hostInfo }; })()`);
    await p.go("customizer");
    for (const t of ["cs", "business", "biostat"]) await injectTpl(p, t);
    const apply = await p.ev(`(async () => { const out = []; for (let i = 0; i < 10; i++) { if (document.querySelector(".dialog")) throw new Error("套用量測中出現確認視窗"); document.querySelector('.cz-level[data-color="' + (i % 2 ? "green" : "brown") + '"]').click(); const t0 = performance.now(); document.getElementById("cz-apply").click();
      await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0))); out.push(+(performance.now() - t0).toFixed(1)); } return out; })()`);
    // v0.10（AC-22-04 改寫）：點選色級卡片（未套用）到選中狀態與試算繪製完成
    const slider = await p.ev(`(async () => { const order = ["orange", "brown", "green", "blue", "gold"]; const out = []; for (let i = 0; i < 10; i++) { const el = document.querySelector('.cz-level[data-color="' + order[i % 5] + '"]'); const t0 = performance.now(); el.click();
      await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0))); out.push(+(performance.now() - t0).toFixed(1)); await new Promise((r) => setTimeout(r, 30)); } return out; })()`);
    await p.go("flashcards"); await p.ev(`EMT.store.actions.acknowledgeSttNotice()`);
    const stt = [];
    for (let i = 0; i < 10; i++) { await micOn(p); stt.push(await p.ev(`(async () => { const r = window.__qaStt.last; const t0 = performance.now(); r.emitResult("the"); await new Promise((res) => requestAnimationFrame(() => setTimeout(res, 0))); r.emitEnd(); return +(performance.now() - t0).toFixed(1); })()`)); }
    return { label, nav: nav.strict, navLoose: nav.loose, navStrictRaf: nav.strictRaf, hostInfo: nav.hostInfo, apply, slider, stt };
  };
  const normal = await measure("一般");
  // 第 3 輪：第一次量測的 STT 評分會產生學習紀錄，再套用不同色級會跳出初始化確認視窗（US-32）。只把學習紀錄 6 欄重設為初始值（保留 30 個自訂單字，
  // 與第 2 輪相同條件：4 倍降速第一次切到難易度設定時自訂單字清單有 30 筆）
  await p.ev(`(() => { const k = "englishMasterTrack:state"; const r = JSON.parse(localStorage.getItem(k)); Object.assign(r.data, { masteredWordKeys: [], vocabQuiz: { answered: 0, correct: 0 }, part5: { currentIndex: 0, lockedSelection: null, phase: "question", roundAnswered: 0, roundCorrect: 0, totalAnswered: 0, totalCorrect: 0 }, streak: { days: 0, lastActiveDate: null }, todayLearned: { date: null, wordKeys: [] }, learnedHistory: {} }); localStorage.setItem(k, JSON.stringify(r)); })()`);
  await p.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await p.reload();
  const slow = await measure("4 倍降速");
  await p.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  // v0.8（AC-22-01 修訂）：減少動態模式下量到新頁面完成繪製（嚴格量法），4 倍降速
  await p.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await p.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await p.reload();
  const slowReduced = await measureNav();
  await p.send("Emulation.setEmulatedMedia", { features: [] });
  await p.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  // AC-22-05（v0.12 修訂）：每輪都量；一般模式（有狀態鍵）到主控台「開始今日學習」可點擊、首次模式（無狀態鍵）到「開始學習」可點擊
  const loads = { normal: [], slow: [], frNormal: [], frSlow: [], readyOk: [] };
  await p.send("Network.setCacheDisabled", { cacheDisabled: true });
  p.autoStart = false;
  for (const [k, rate, first] of [["normal", 1, false], ["slow", 4, false], ["frNormal", 1, true], ["frSlow", 4, true]]) {
    await p.send("Emulation.setCPUThrottlingRate", { rate });
    for (let i = 0; i < 5; i++) {
      if (first) await p.ev(`localStorage.clear()`);
      await p.goto("about:blank", { waitReady: false }); await sleep(200);
      await p.goto();
      const r = await p.ev(`(() => { const m = performance.getEntriesByName("emt-ready")[0]; const vis = (e) => !!e && e.getClientRects().length > 0 && !e.disabled;
        const target = ${first} ? document.getElementById("cz-start") : document.querySelector("#view-dashboard .db-start"); // 第 5 輪：v0.12 量測點改「開始今日學習」（AC-22-05）
        return { ms: m ? Math.round(m.startTime) : -1, entry: document.body.dataset.entry, clickable: vis(target) }; })()`);
      loads[k].push(r.ms); loads.readyOk.push(r.entry === (first ? "firstRun" : "main") && r.clickable);
    }
    if (first) { await p.ev(`(() => { const b = document.getElementById("cz-start"); b && b.click(); })()`); await sleep(400); }
  }
  p.autoStart = true;
  await p.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  await p.close();
  return { normal, slow, slowReduced, loads };
}
{
  const runs = [];
  for (let i = 0; i < PERF_RUNS; i++) { runs.push(await perfRun(i === 0)); console.log(`  效能第 ${i + 1}/${PERF_RUNS} 輪：4 倍降速切頁 嚴格 ${runs[i].slow.nav.join("、")}｜寬鬆 ${runs[i].slow.navLoose.join("、")}`); }
  const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const pct = (a, q) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.ceil(q * s.length) - 1)]; };
  const r1 = (x) => Math.round(x * 10) / 10;
  // 偏高輪：該輪該條件的切頁量測（嚴格量法，10 個位置）有過半數 > 全部輪次同位置中位數的 2 倍
  const outlier = (cond) => {
    const pos = NAV_TABS.map((_, j) => median(runs.map((r) => r[cond].nav[j])));
    return runs.map((r) => r[cond].nav.filter((v, j) => v > 2 * pos[j]).length > NAV_TABS.length / 2);
  };
  const flags = { normal: outlier("normal"), slow: outlier("slow") };
  const judge = (cond, get) => {
    const kept = runs.filter((_, i) => !flags[cond][i]).map(get);
    if (kept.length < 3) return { ok: false, text: `有效輪數 ${kept.length} < 3` };
    const pm = kept[0].map((_, j) => median(kept.map((a) => a[j])));
    const all = kept.flat(); const p90 = pct(all, 0.9); const mx = Math.max(...all); const over = all.filter((v) => v > 100).length;
    return { ok: pm.every((v) => v <= 100) && p90 <= 100, pm, p90, text: `有效 ${kept.length}/${runs.length} 輪（排除第 ${flags[cond].map((f, i) => (f ? i + 1 : 0)).filter(Boolean).join("、") || "無"} 輪）；各位置中位數最大 ${r1(Math.max(...pm))}；p90 ${r1(p90)}；最大 ${r1(mx)}；>100ms ${over}/${all.length} 筆` };
  };
  const rawList = (cond, get) => runs.map((r, i) => `第${i + 1}輪${flags[cond][i] ? "（偏高輪）" : ""}[${get(r).join("、")}]`).join("；");
  const C = { normal: "一般", slow: "4 倍降速" };
  const evalTc = (tc, ac, get, note) => {
    const j = { normal: judge("normal", (r) => get(r, "normal")), slow: judge("slow", (r) => get(r, "slow")) };
    const ok = j.normal.ok && j.slow.ok;
    R[ok ? "pass" : "fail"](tc, ac, `本機無頭 Chrome 參考值（非基準環境），多輪判定（test-plan §2.3）${note || ""}：` + ["normal", "slow"].map((c) => `${C[c]}：${j[c].text}；原始 ${rawList(c, (r) => get(r, c))}`).join("｜"));
    return { ok, j };
  };
  // TC-22-01：嚴格量法（判定）；寬鬆量法與「再多等一個畫格」列為參考
  // v0.8（AC-22-01 修訂）：終點為「換頁動畫的第一個影格」→ 以點擊到下一個畫格繪製（rAF + setTimeout 0）判定（原「寬鬆量法」）；
  // 減少動態模式下終點為「新頁面完成繪製」→ 以嚴格量法於 4 倍降速 + reduce 判定（TC-22-01m）；一般模式的嚴格量法列參考（TC-22-01r）
  evalTc("TC-22-01", "AC-22-01", (r, c) => r[c].navLoose, "；終點 = 換頁動畫第一個影格（點擊 → 下一個畫格繪製）");
  {
    const kept = runs.map((r) => r.slowReduced);
    const pm = kept[0].map((_, j) => median(kept.map((a) => a[j]))); const all = kept.flat(); const p90 = pct(all, 0.9);
    const ok = pm.every((v) => v <= 100) && p90 <= 100;
    R[ok ? "pass" : "fail"]("TC-22-01m", "AC-22-01、AC-31-03", `本機無頭 Chrome 參考值：prefers-reduced-motion: reduce + 4 倍降速，嚴格量法（含 #customizer-custom 顯示並繪製完成）${runs.length} 輪：各位置中位數 ${pm.map(r1).join("、")}；最大中位數 ${r1(Math.max(...pm))}；p90 ${r1(p90)}；最大 ${r1(Math.max(...all))}；>100ms ${all.filter((v) => v > 100).length}/${all.length} 筆；原始 ${kept.map((a, i) => `第${i + 1}輪[${a.join("、")}]`).join("；")}`);
  }
  {
    const jl = { normal: judge("normal", (r) => r.normal.navLoose), slow: judge("slow", (r) => r.slow.navLoose) };
    const jr = { normal: judge("normal", (r) => r.normal.navStrictRaf), slow: judge("slow", (r) => r.slow.navStrictRaf) };
    const hi = runs.flatMap((r) => [...r.normal.hostInfo, ...r.slow.hostInfo]);
    const hostOk = hi.every((h) => h.visible && h.height > 0 && h.children > 0);
    R[hostOk ? "pass" : "fail"]("TC-22-01r", "AC-22-01", `參考（只檢查嚴格量法終點有效，不另行判定效能）：#customizer-custom 在終點時皆已顯示且有內容 ${hostOk}（點擊後先為 hidden 的次數 ${hi.filter((h) => h.wasHidden).length}/${hi.length}；額外等待畫格數 ${[...new Set(hi.map((h) => h.frames))].join("/")}；高度 ${[...new Set(hi.map((h) => h.height))].join("/")}px）。寬鬆量法（第 1 輪方法）：一般 ${jl.normal.text}；4 倍降速 ${jl.slow.text}，判定 ${jl.normal.ok && jl.slow.ok ? "符合" : "不符"}；原始 ${rawList("slow", (r) => r.slow.navLoose)}。嚴格 + 再一個畫格：一般 ${jr.normal.text}；4 倍降速 ${jr.slow.text}，判定 ${jr.normal.ok && jr.slow.ok ? "符合" : "不符"}`);
  }
  // v0.8：AC-22-04（難易度設定頁加入色級大卡片，餘裕小）改用多輪判定（各位置中位數 + p90）；每筆最大值另列
  {
    const res = evalTc("TC-22-04b", "AC-22-04", (r, c) => r[c].slider, "（點色級卡片到選中狀態與試算繪製）");
    const mxN = Math.max(...runs.map((r) => Math.max(...r.normal.slider))), mxS = Math.max(...runs.map((r) => Math.max(...r.slow.slider)));
    const last = R.results[R.results.length - 1]; last.note += `；全部樣本最大：一般 ${mxN} ms、4 倍降速 ${mxS} ms`;
  }
  for (const [tc, ac, key] of [["TC-22-02b", "AC-22-02", "apply"], ["TC-22-03b", "AC-22-03", "stt"]]) {
    const mxN = Math.max(...runs.map((r) => Math.max(...r.normal[key]))), mxS = Math.max(...runs.map((r) => Math.max(...r.slow[key])));
    const ok = mxN <= 100 && mxS <= 100;
    R[ok ? "pass" : "fail"](tc, ac, `本機無頭 Chrome 參考值（非基準環境），${runs.length} 輪全部樣本每筆 ≤ 100ms：一般最大 ${mxN} ms；4 倍降速最大 ${mxS} ms（第 1 輪 4 倍降速 ${runs[0].slow[key].join("、")}）`);
  }
  R.na("TC-16-01b", "AC-16-01", "PRD v0.10 標「v0.9 暫停（隱藏）」，句型庫不驗收");
  R.na("TC-16-01c", "AC-16-01", "PRD v0.10 標「v0.9 暫停（隱藏）」，句型庫不驗收");
  // AC-22-05（v0.8 修訂）：一般模式到主控台入口可點擊、首次模式到「開始學習」可點擊；每輪各 5 次，多輪中位數 + p90 判定（上限 3 秒／6 秒），每次最大值另列
  {
    const readyOk = runs.every((r) => r.loads.readyOk.every(Boolean));
    const st = (k, lim) => { const all = runs.flatMap((r) => r.loads[k]); const pm = [0, 1, 2, 3, 4].map((j) => median(runs.map((r) => r.loads[k][j]))); const p90 = pct(all, 0.9); const mx = Math.max(...all);
      return { ok: all.every((t) => t > 0) && pm.every((v) => v <= lim) && p90 <= lim, text: `中位數 ${r1(median(all))}、各次序中位數最大 ${r1(Math.max(...pm))}、p90 ${p90}、最大 ${mx}（上限 ${lim}；> 上限 ${all.filter((t) => t > lim).length}/${all.length}）` }; };
    const a = st("normal", 3000), b = st("slow", 6000);
    R[a.ok && b.ok && readyOk ? "pass" : "fail"]("TC-22-05a", "AC-22-05", `本機無頭 Chrome 參考值，${runs.length} 輪 × 5 次：一般模式（timeOrigin → emt-ready，「開始今日學習」可點擊）一般 ${a.text}；4 倍降速 ${b.text}；emt-ready 時目標元素可點擊 ${readyOk}；第 1 輪原始 一般 ${runs[0].loads.normal.join("、")}、降速 ${runs[0].loads.slow.join("、")}；基準環境實測列人工 TC-M07`);
    const c = st("frNormal", 3000), d = st("frSlow", 6000);
    R[c.ok && d.ok && readyOk ? "pass" : "fail"]("TC-22-05b", "AC-22-05、AC-25-01", `本機無頭 Chrome 參考值，${runs.length} 輪 × 5 次：首次模式（無狀態鍵；timeOrigin → emt-ready，「開始學習」可點擊）一般 ${c.text}；4 倍降速 ${d.text}；第 1 輪原始 一般 ${runs[0].loads.frNormal.join("、")}、降速 ${runs[0].loads.frSlow.join("、")}`);
  }
  const DIAG = path.resolve("tests/results/diag"); fs.mkdirSync(DIAG, { recursive: true }); // 不放 tests/results 根目錄，避免被 run-all 彙整
  fs.writeFileSync(path.join(DIAG, "perf-runs.json"), JSON.stringify({ date: new Date().toISOString(), navTabs: NAV_TABS, flags, runs: runs.map((r) => ({ normal: r.normal, slow: r.slow, slowReduced: r.slowReduced, loads: r.loads })) }, null, 2));
}

R.save(resultPath("e2e-env"));
