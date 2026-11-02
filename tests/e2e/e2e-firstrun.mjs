// QA E2E 套件 7（v0.8）：首次進入流程（US-25）、難易度大卡片（US-26）、手機底部導覽列（US-27）、
// 舊版備份相容與學習紀錄匯入正規化（AC-24-10、AC-24-11）
// 依據：PRD v0.8、契約 v0.8 §5.5 FS-1～FS-7、§6.2／§6.3、architecture v0.4 §7.9、§9.1、§10.1「E2E 與人工」
import fs from "node:fs";
import path from "node:path";
import { launch, recorder, sleep, resultPath } from "./lib/cdp.mjs";
import { TOAST_RECORDER, storageMode } from "./lib/inits.mjs";

const R = recorder("e2e-firstrun");
const KEY = "englishMasterTrack:state";
const TMP = process.env.QA_TMP || path.resolve("tests/results/tmp");
fs.mkdirSync(TMP, { recursive: true });
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (s, n) => { const [y, m, d] = s.split("-").map(Number); return ymd(new Date(y, m - 1, d + n)); };
const TODAY = ymd(new Date());

const PAGES = [];
async function open(inits = [], vp = [1366, 900]) {
  const p = await launch(); PAGES.push(p);
  await p.addInitScript(TOAST_RECORDER);
  for (const s of inits) await p.addInitScript(s);
  await p.viewport(vp[0], vp[1]);
  p.autoStart = false;
  await p.send("Page.setInterceptFileChooserDialog", { enabled: true });
  p.chooser = null;
  p.onEvent((m) => { if (m.method === "Page.fileChooserOpened") p.chooser = m.params; });
  return p;
}
const toasts = (p, n = 0) => p.ev(`window.__qaToasts.slice(${n}).map((t) => t.text)`);
const vis = (p, sel) => p.ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return false; const s = getComputedStyle(e); if (s.display === "none" || s.visibility === "hidden" || e.closest("[hidden]")) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; })()`);
const stored = (p) => p.ev(`localStorage.getItem(${JSON.stringify(KEY)})`);
const goalTexts = (p) => p.ev(`[...document.querySelectorAll(".dash-stats--goal .dash-stat")].map((e) => e.querySelector(".dash-stat__label").textContent + "=" + e.querySelector(".dash-stat__value").textContent).join("｜")`);
const firstRunInfo = (p) => p.ev(`(() => { const v = (sel) => { const e = typeof sel === "string" ? document.querySelector(sel) : sel; if (!e) return false; const s = getComputedStyle(e); if (s.display === "none" || s.visibility === "hidden" || e.closest("[hidden]")) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  return { entry: document.body.dataset.entry, tab: EMT.router.current(), cards: [...document.querySelectorAll(".cz-colors .cz-color")].filter(v).map((b) => b.dataset.color).join(","),
    pressed: [...document.querySelectorAll(".cz-color[aria-pressed=true]")].map((b) => b.dataset.color).join(","), input: v("#cz-score-input") ? document.getElementById("cz-score-input").value : null,
    slider: v("#cz-score-range"), estimate: v(".cz-estimate"), start: v("#cz-start"), restore: v("#cz-restore"), apply: !!document.getElementById("cz-apply"),
    nav: v("#app-nav"), navBtns: [...document.querySelectorAll("#app-nav [data-tab]")].filter(v).length, toggle: v("#nav-toggle"), dashboard: v("#view-dashboard"), entries: [...document.querySelectorAll(".dash-entry")].filter(v).length,
    custom: v("#customizer-custom"), form: v(".cv-form"), templates: [...document.querySelectorAll(".cv-templates__btn")].filter(v).length, status: v(".cz-status"), footerSources: v("#footer-sources") }; })()`);

async function pickFile(p, content, name, { confirm = true, trigger = "#cz-restore" } = {}) {
  const f = path.join(TMP, "fr-" + Date.now() + "-" + name);
  fs.writeFileSync(f, content);
  p.chooser = null;
  await p.click(trigger);
  for (let i = 0; i < 40 && !p.chooser; i++) await sleep(50);
  if (!p.chooser) throw new Error("未出現檔案選擇器");
  await p.send("DOM.setFileInputFiles", { files: [f], backendNodeId: p.chooser.backendNodeId });
  await sleep(300);
  const dlg = await p.ev(`(() => { const d = document.querySelector(".dialog"); return d ? d.innerText : null; })()`);
  if (dlg) { await p.click(`.dialog [data-action="${confirm ? "ok" : "cancel"}"]`); await sleep(400); }
  return dlg;
}

// 先產生一份「v0.8 匯出的合法備份」（目標 300 棕、自訂 10 字、學習紀錄）與一份 v1 備份（v0.7 格式）
let BACKUP_V2, BACKUP_V1;
{
  const p = await open();
  await p.goto(); await p.startLearning();
  await p.go("customizer"); await p.type("#cz-score-input", "300"); await p.click("#cz-apply");
  await p.click('[data-template="cs"]'); await sleep(100);
  await p.go("flashcards"); await p.click(".fc-flip"); await p.click(".fc-next"); await sleep(400); await p.click(".fc-flip");
  await p.go("part5"); await p.click("[data-p5=option]", 0);
  BACKUP_V2 = await p.ev(`EMT.store.actions.exportBackup().json`);
  const b = JSON.parse(BACKUP_V2); b.schemaVersion = 1; delete b.data.todayLearned; delete b.data.learnedHistory;
  BACKUP_V1 = JSON.stringify(b);
  await p.close();
}

// ═════════ US-25 首次進入 ═════════
{
  const p = await open();
  await p.goto();
  await R.check("TC-25-01", "AC-25-01、AC-20-03（首次畫面不顯示導覽）", async () => {
    const a = await firstRunInfo(p);
    const key = await stored(p);
    await p.viewport(375, 667); await sleep(150);
    const m = await firstRunInfo(p);
    await p.viewport(1366, 900); await sleep(100);
    const ok = key === null && a.entry === "firstRun" && a.tab === "customizer" && a.cards === "orange,brown,green,blue,gold" && a.pressed === "green" && a.input === "600" && a.slider && a.estimate && a.start && a.restore && !a.apply
      && !a.nav && a.navBtns === 0 && !a.toggle && !a.dashboard && a.entries === 0 && !a.custom && !a.form && a.templates === 0 && a.footerSources
      && !m.nav && m.navBtns === 0 && !m.toggle && m.start;
    return { ok, note: `1366：${JSON.stringify(a)}；375：導覽可見=${m.nav}、可見導覽鈕 ${m.navBtns}、選單鈕=${m.toggle}；狀態鍵=${key === null ? "無" : "有"}` };
  });
  await R.check("TC-25-04", "AC-25-04", async () => {
    await p.click('.cz-color[data-color="orange"]'); await p.type("#cz-score-input", "455"); await p.key("Tab", "Tab", 9);
    const changed = await firstRunInfo(p);
    await p.reload(); const a = await firstRunInfo(p); const k1 = await stored(p);
    await p.goto("about:blank", { waitReady: false }); await sleep(300); await p.goto();
    const b = await firstRunInfo(p); const k2 = await stored(p);
    const ok = changed.input === "455" && a.entry === "firstRun" && a.input === "600" && a.pressed === "green" && k1 === null && b.entry === "firstRun" && b.input === "600" && b.pressed === "green" && k2 === null;
    return { ok, note: `改分數後 ${changed.input}/${changed.pressed}；重新整理 → ${a.entry}、${a.input}、選中 ${a.pressed}、狀態鍵 ${k1 === null ? "無" : "有"}；關閉重開 → ${b.entry}、${b.input}、選中 ${b.pressed}、狀態鍵 ${k2 === null ? "無" : "有"}` };
  });
  await R.check("TC-25-07", "AC-25-07、AC-23-02（任一頁面）", async () => {
    await p.click('.cz-color[data-color="brown"]');
    await p.click("#footer-sources"); await sleep(350);
    const s = await p.ev(`({ tab: EMT.router.current(), sources: !document.getElementById("view-sources").hidden && document.getElementById("view-sources").innerText.length > 200, entry: document.body.dataset.entry })`);
    const navInSources = await vis(p, "#app-nav"); const back = await vis(p, "#footer-first-run-back");
    const backText = await p.ev(`(document.getElementById("footer-first-run-back") || {}).textContent`);
    await p.click("#footer-first-run-back"); await sleep(350);
    const a = await firstRunInfo(p); const key = await stored(p);
    const ok = s.tab === "sources" && s.sources && s.entry === "firstRun" && !navInSources && back && a.entry === "firstRun" && a.tab === "customizer" && !a.nav && !a.dashboard && a.start && key === null;
    return { ok, note: `資料來源頁 ${JSON.stringify(s)}、導覽可見=${navInSources}、返回連結「${backText}」可見=${back}；返回後 ${a.entry}/${a.tab}、導覽=${a.nav}、主控台=${a.dashboard}、選中 ${a.pressed}、分數 ${a.input}；狀態鍵 ${key === null ? "無" : "有"}` };
  });
  await R.check("TC-25-11", "AC-25-11", async () => {
    const out = []; let ok = true;
    // (a1) 檔案選擇器取消：不設定檔案（選擇器關閉後 input 無 change 事件）
    p.chooser = null; await p.click("#cz-restore"); for (let i = 0; i < 40 && !p.chooser; i++) await sleep(50);
    await sleep(200);
    let a = await firstRunInfo(p); let k = await stored(p); let n = (await toasts(p)).length;
    const okA1 = !!p.chooser && a.entry === "firstRun" && k === null; ok = ok && okA1; out.push(`(a) 檔案選擇器開啟=${!!p.chooser} 後未選檔：${a.entry}、狀態鍵 ${k === null ? "無" : "有"}`);
    // (a2) 確認對話框取消
    const dlg = await pickFile(p, BACKUP_V2, "cancel.json", { confirm: false });
    a = await firstRunInfo(p); k = await stored(p); let t = await toasts(p, n);
    const okA2 = !!dlg && dlg.includes("匯入將覆蓋目前所有進度") && a.entry === "firstRun" && k === null && t.length === 0; ok = ok && okA2;
    out.push(`(a) 確認框「${(dlg || "").replace(/\n/g, " ")}」按取消：${a.entry}、狀態鍵 ${k === null ? "無" : "有"}、提示 ${JSON.stringify(t)}`);
    // (b) 格式錯誤、(c) 版本不相容
    for (const [label, content, exp] of [["(b) 非 JSON", "{oops", "備份檔格式錯誤，未匯入"], ["(b) 空檔", "", "備份檔格式錯誤，未匯入"], ["(c) 版本 99", JSON.stringify({ ...JSON.parse(BACKUP_V2), schemaVersion: 99 }), "備份檔版本不相容"]]) {
      n = (await toasts(p)).length;
      await pickFile(p, content, "bad.json");
      a = await firstRunInfo(p); k = await stored(p); t = await toasts(p, n);
      const good = t.some((x) => x.includes(exp)) && a.entry === "firstRun" && !a.nav && k === null && a.start && a.restore;
      ok = ok && good; out.push(`${label}：${JSON.stringify(t)}、${a.entry}、狀態鍵 ${k === null ? "無" : "有"}`);
    }
    const v = (await toasts(p)).filter((x) => x.includes("備份檔版本不相容")).pop() || "";
    ok = ok && v.includes("99") && v.includes("1、2");
    out.push(`版本訊息「${v}」`);
    // 之後仍可按「開始學習」
    await p.click("#cz-start"); await sleep(400);
    const e = await p.ev(`document.body.dataset.entry`); k = await stored(p);
    ok = ok && e === "main" && k !== null; out.push(`之後按「開始學習」→ ${e}、狀態鍵 ${k === null ? "無" : "有"}`);
    return { ok, note: out.join("；") };
  });
  await p.close();
}
{
  // (d) 容量不足
  const p = await open([storageMode("quota")]);
  await p.goto();
  await R.check("TC-25-11d", "AC-25-11（d）、AC-24-09", async () => {
    const n = (await toasts(p)).length;
    await pickFile(p, BACKUP_V2, "quota.json");
    const a = await firstRunInfo(p); const k = await stored(p); const t = await toasts(p, n);
    await p.ev(`window.__qaQuota = false`);
    await p.click("#cz-start"); await sleep(400);
    const e = await p.ev(`document.body.dataset.entry`); const k2 = await stored(p);
    return { ok: t.includes("儲存空間不足，未匯入") && a.entry === "firstRun" && !a.nav && k === null && e === "main" && k2 !== null, note: `容量不足還原：提示 ${JSON.stringify(t)}、${a.entry}、狀態鍵 ${k === null ? "無" : "有"}；解除後按「開始學習」→ ${e}、狀態鍵 ${k2 === null ? "無" : "有"}` };
  });
  await p.close();
}
{
  const p = await open();
  await p.goto();
  await R.check("TC-25-02", "AC-25-02", async () => {
    await p.type("#cz-score-input", "720"); await p.key("Tab", "Tab", 9);
    const pre = await firstRunInfo(p);
    await p.click("#cz-start"); await sleep(400);
    const a = await firstRunInfo(p); const g = await goalTexts(p); const k = JSON.parse(await stored(p) || "null");
    const total = await p.ev(`EMT.store.getState().runtime.studySet.length`);
    const ok = pre.pressed === "green" && a.entry === "main" && a.tab === "dashboard" && a.dashboard && a.nav && a.navBtns === 6 && g.includes("目前目標分數=720") && g.includes("目前生效色級=綠") && g.includes("每日新字量=15 字/天")
      && k && k.schemaVersion === 2 && k.data.goal.appliedScore === 720 && k.data.goal.effectiveColor === "green" && total === 5620;
    return { ok, note: `720 選中 ${pre.pressed}；按「開始學習」→ ${a.entry}/${a.tab}、導覽 ${a.navBtns} 鈕；主控台 ${g}；單字集 ${total}；寫入 schemaVersion ${k && k.schemaVersion}、goal ${k && JSON.stringify(k.data.goal)}` };
  });
  await R.check("TC-25-06", "AC-25-06", async () => {
    await p.go("customizer"); await sleep(300);
    const a = await firstRunInfo(p);
    const ok = a.entry === "main" && a.nav && a.custom && a.form && a.templates === 3 && a.apply && !a.start && !a.restore && a.status;
    return { ok, note: JSON.stringify(a) };
  });
  await R.check("TC-25-05", "AC-25-05", async () => {
    await p.reload(); const a = await firstRunInfo(p);
    await p.goto("about:blank", { waitReady: false }); await sleep(300); await p.goto(); const b = await firstRunInfo(p);
    return { ok: a.entry === "main" && a.tab === "dashboard" && a.dashboard && a.nav && !a.start && b.entry === "main" && b.dashboard, note: `重新載入 → ${a.entry}/${a.tab}、導覽=${a.nav}；關閉重開 → ${b.entry}/${b.tab}（v0.7 狀態見 TC-30-12）` };
  });
  await p.close();
}
{
  const p = await open();
  await p.goto();
  await R.check("TC-25-03", "AC-25-03、AC-26-04（首次畫面）", async () => {
    await p.click('.cz-color[data-color="blue"]');
    const pre = await p.ev(`({ input: document.getElementById("cz-score-input").value, cap: [...document.querySelectorAll(".cz-warning")].some((e) => !e.hidden && e.getClientRects().length && e.textContent === "目前內建字庫到綠色為止"), pressed: [...document.querySelectorAll(".cz-color[aria-pressed=true]")].map((b) => b.dataset.color).join() })`);
    await p.click("#cz-start"); await sleep(400);
    const g = await goalTexts(p);
    const ok = pre.input === "730" && pre.cap && pre.pressed === "blue" && g.includes("目前目標分數=730") && g.includes("目前目標色級=藍") && g.includes("目前生效色級=綠（內建上限）") && g.includes("每日新字量=15 字/天");
    return { ok, note: `點藍 → ${JSON.stringify(pre)}；開始學習後主控台 ${g}` };
  });
  await p.close();
}
{
  // AC-25-08：localStorage 停用
  const p = await open([storageMode("disabled")]);
  await p.goto();
  await R.check("TC-25-08", "AC-25-08、AC-18-03", async () => {
    const a = await firstRunInfo(p); const banner = await p.ev(`document.getElementById("app-banner").innerText`);
    await p.click("#cz-start"); await sleep(400);
    const b = await firstRunInfo(p);
    await p.go("flashcards"); await p.click(".fc-flip"); const fl = await p.ev(`document.querySelector(".fc-card").dataset.flipped`);
    await p.go("customizer"); await p.click('[data-template="cs"]'); await sleep(100); const cv = await p.ev(`EMT.store.getState().data.customVocab.length`);
    await p.reload(); const c = await firstRunInfo(p); const banner2 = await p.ev(`document.getElementById("app-banner").innerText`);
    const ok = a.entry === "firstRun" && banner.includes("進度將無法保存") && b.entry === "main" && b.dashboard && b.nav && fl === "true" && cv === 10 && c.entry === "firstRun" && banner2.includes("進度將無法保存") && p.log.exceptions.length === 0;
    return { ok, note: `開啟 ${a.entry}、警示「${banner.trim()}」；開始學習 → ${b.entry}、可翻卡=${fl}、注入範本 ${cv} 字；重新開啟 → ${c.entry}、警示「${banner2.trim()}」；例外 ${p.log.exceptions.length}` };
  });
  await p.close();
}
{
  // AC-25-09：狀態鍵存在但格式不合法；AC-25-10：首次畫面從備份還原成功
  const p = await open();
  await p.goto();
  await R.check("TC-25-09", "AC-25-09、AC-18-05", async () => {
    const out = []; let ok = true;
    for (const [k, v] of [["非 JSON", "{broken"], ["空字串", ""], ["版本 99", JSON.stringify({ schemaVersion: 99, savedAt: new Date().toISOString(), data: {} })]]) {
      await p.ev(`localStorage.setItem(${JSON.stringify(KEY)}, ${JSON.stringify(v)})`);
      await p.reload();
      const a = await firstRunInfo(p); const t = await toasts(p);
      const good = a.entry === "main" && a.tab === "dashboard" && a.nav && !a.start && t.includes("資料讀取失敗，已重設");
      ok = ok && good; out.push(`${k}：${a.entry}/${a.tab}、提示 ${JSON.stringify(t)}`);
    }
    await p.ev(`localStorage.clear()`);
    return { ok, note: out.join("；") };
  });
  await p.reload();
  await R.check("TC-25-10", "AC-25-10、AC-24-03", async () => {
    await p.click('.cz-color[data-color="gold"]'); // 首次畫面上尚未生效的選擇（860）
    const n = (await toasts(p)).length;
    const dlg = await pickFile(p, BACKUP_V2, "restore.json");
    await sleep(300);
    const a = await firstRunInfo(p); const g = await goalTexts(p); const t = await toasts(p, n);
    const exp = JSON.parse(BACKUP_V2).data;
    const now = await p.ev(`EMT.store.getState().data`);
    await p.reload(); const b = await firstRunInfo(p); const g2 = await goalTexts(p);
    const ok = !!dlg && a.entry === "main" && a.tab === "dashboard" && a.nav && g.includes("目前目標分數=300") && g.includes("目前生效色級=棕") && t.some((x) => x.startsWith("已匯入，略過 0 筆"))
      && JSON.stringify(now.goal) === JSON.stringify(exp.goal) && now.customVocab.length === exp.customVocab.length && b.entry === "main" && g2.includes("目前目標分數=300");
    return { ok, note: `首次畫面點金（860）後還原 300 棕備份：確認框=${!!dlg}、提示 ${JSON.stringify(t)} → ${a.entry}/${a.tab}、導覽=${a.nav}；主控台 ${g}；goal ${JSON.stringify(now.goal)}；重新載入 → ${b.entry}、${g2}` };
  });
  await p.close();
}

// ═════════ AC-24-10、AC-24-11：舊版備份、學習紀錄的無效項目 ═════════
{
  const p = await open();
  await p.goto(); await p.startLearning();
  const importMain = async (content, name, confirm = true) => {
    await p.go("dashboard"); const n = (await toasts(p)).length;
    const dlg = await pickFile(p, content, name, { confirm, trigger: '[data-action="import-backup"]' });
    return { dlg, t: await toasts(p, n) };
  };
  const progress = () => p.ev(`(() => { EMT.router.go("dashboard"); return { text: document.querySelector(".db-today__text").textContent, bars: [...document.querySelectorAll(".db-bars__item")].map((b) => b.querySelector(".db-bars__count").textContent).join(",") }; })()`);
  await R.check("TC-24-10", "AC-24-10", async () => {
    const r = await importMain(BACKUP_V1, "v1.json");
    const d = await p.ev(`EMT.store.getState().data`); const pr = await progress();
    const exp = JSON.parse(BACKUP_V1).data;
    const same = ["goal", "customVocab", "masteredWordKeys", "vocabQuiz", "part5", "streak", "sttNoticeAcknowledged"].every((k) => JSON.stringify(d[k]) === JSON.stringify(exp[k]));
    await p.reload(); const k = JSON.parse(await stored(p));
    const ok = r.t.some((x) => x.startsWith("已匯入，略過 0 筆")) && !r.t.some((x) => /格式錯誤|版本不相容/.test(x)) && same && pr.text.startsWith("今日已學 0 /") && pr.bars === "0,0,0,0,0,0,0" && k.schemaVersion === 2 && !!k.data.todayLearned && !!k.data.learnedHistory;
    return { ok, note: `v1 備份（無 todayLearned、learnedHistory）匯入：提示 ${JSON.stringify(r.t)}；既有 7 欄還原相同=${same}；${pr.text}、長條 ${pr.bars}；重新載入後 localStorage schemaVersion ${k.schemaVersion}、todayLearned ${JSON.stringify(k.data.todayLearned)}` };
  });
  await R.check("TC-24-11", "AC-24-11、AC-24-05", async () => {
    const base = JSON.parse(BACKUP_V2);
    const hist = { "2026-13-40": 3, yesterday: 2, [addDays(TODAY, -1)]: -1, [addDays(TODAY, -2)]: 1.5, [addDays(TODAY, 1)]: 4, [addDays(TODAY, -30)]: 6, [addDays(TODAY, -29)]: 7, [addDays(TODAY, -5)]: 5, [addDays(TODAY, -3)]: "2" };
    const f1 = { ...base, data: { ...base.data, todayLearned: { date: addDays(TODAY, -1), wordKeys: ["the", "of"] }, learnedHistory: hist } };
    const r1 = await importMain(JSON.stringify(f1), "hist.json");
    const d = await p.ev(`EMT.store.getState().data`); const pr = await progress();
    const keys = Object.keys(d.learnedHistory).sort();
    const okHist = JSON.stringify(keys) === JSON.stringify([addDays(TODAY, -29), addDays(TODAY, -5)].sort()) && d.learnedHistory[addDays(TODAY, -5)] === 5 && d.learnedHistory[addDays(TODAY, -29)] === 7;
    const ok1 = r1.t.some((x) => x.startsWith("已匯入，略過 0 筆")) && okHist && pr.text.startsWith("今日已學 0 /") && d.goal.appliedScore === base.data.goal.appliedScore;
    // 整個欄位型別錯誤 → 格式錯誤，不匯入
    const out = [];
    let ok2 = true;
    for (const [k, v] of [["learnedHistory 為陣列", { learnedHistory: [1, 2] }], ["todayLearned 為字串", { todayLearned: "x" }], ["wordKeys 不是清單", { todayLearned: { date: TODAY, wordKeys: "the" } }], ["learnedHistory 缺少", { learnedHistory: undefined }]]) {
      const before = await stored(p);
      const r = await importMain(JSON.stringify({ ...base, data: { ...base.data, ...v } }), "type.json");
      const after = await stored(p);
      const good = r.t.includes("備份檔格式錯誤，未匯入") && before === after; ok2 = ok2 && good; out.push(`${k}：${JSON.stringify(r.t)}${before === after ? "" : "（資料被改）"}`);
    }
    return { ok: ok1 && ok2, note: `無效項目：提示 ${JSON.stringify(r1.t)}、匯入後歷史 ${JSON.stringify(d.learnedHistory)}、todayLearned ${JSON.stringify(d.todayLearned)}、${pr.text}；型別錯誤：${out.join("；")}` };
  });
  await R.check("TC-24-02b", "AC-24-02", async () => {
    const j = JSON.parse(BACKUP_V2); const d = j.data;
    const ok = j.schemaVersion === 2 && d.todayLearned && d.todayLearned.date === TODAY && Array.isArray(d.todayLearned.wordKeys) && d.todayLearned.wordKeys.length === 2 && d.learnedHistory[TODAY] === 2 && !/MASTER_VOCAB|PART5_QUESTION/.test(BACKUP_V2);
    return { ok, note: `v0.8 匯出：schemaVersion ${j.schemaVersion}、todayLearned ${JSON.stringify(d.todayLearned)}、learnedHistory ${JSON.stringify(d.learnedHistory)}（翻 2 張卡；模擬測驗作答不計）` };
  });
  await p.close();
}

// ═════════ US-26 難易度大卡片 ═════════
{
  const p = await open();
  await p.goto(); await p.startLearning();
  const cards = () => p.ev(`[...document.querySelectorAll(".cz-colors .cz-color")].map((b) => { const r = b.getBoundingClientRect(); return { c: b.dataset.color, tag: b.tagName, name: b.querySelector(".cz-color__name").textContent, range: b.querySelector(".cz-color__range").textContent,
    vocab: b.querySelector(".cz-color__vocab strong").textContent, daily: b.querySelector(".cz-color__daily").textContent, scen: b.querySelector(".cz-color__scenario").textContent, lock: !!b.querySelector("svg"), soon: b.textContent.includes("即將開放"),
    pressed: b.getAttribute("aria-pressed"), w: Math.round(r.width), h: Math.round(r.height) }; })`);
  await R.check("TC-26-01", "AC-26-01、AC-01-01", async () => {
    const out = []; let ok = true;
    for (const [w, h] of [[375, 667], [768, 1024], [1366, 900]]) {
      await p.viewport(w, h); await p.go("customizer"); await sleep(300);
      const cs = await cards(); const it = Object.fromEntries(cs.map((x) => [x.c, x]));
      const good = cs.map((x) => x.c).join() === "orange,brown,green,blue,gold" && cs.every((x) => x.tag === "BUTTON" && x.w >= 44 && x.h >= 44 && x.name && x.range && x.scen)
        && it.orange.vocab === "1,000 字" && it.brown.vocab === "2,809 字" && it.green.vocab === "5,620 字" && it.blue.vocab === "待定" && it.gold.vocab === "待定"
        && /10 字\/天/.test(it.orange.daily) && /10 字\/天/.test(it.brown.daily) && /15 字\/天/.test(it.green.daily) && /20 字\/天.*僅供試算/.test(it.blue.daily) && /20 字\/天.*僅供試算/.test(it.gold.daily) && !/僅供試算/.test(it.green.daily)
        && it.blue.lock && it.gold.lock && it.blue.soon && it.gold.soon && !it.orange.lock && !it.green.soon;
      ok = ok && good; out.push(`${w}px：${cs.map((x) => `${x.name} ${x.range} ${x.vocab} ${x.daily.replace(/\s+/g, "")} ${x.w}×${x.h}${x.lock ? " 鎖" : ""}`).join("／")}`);
    }
    // 整張卡片可點：點卡片右下角（非文字區）
    await p.type("#cz-score-input", "300"); await p.key("Tab", "Tab", 9);
    const pt = await p.ev(`(() => { const b = document.querySelector('.cz-color[data-color="green"]'); b.scrollIntoView({ block: "center" }); const r = b.getBoundingClientRect(); return { x: r.right - 6, y: r.bottom - 6 }; })()`);
    for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) await p.send("Input.dispatchMouseEvent", { type, x: pt.x, y: pt.y, button: "left", clickCount: 1 });
    await sleep(80);
    const after = await p.ev(`document.getElementById("cz-score-input").value`);
    const forbidden = await p.ev(`/官方門檻|Tier\\s*[1-4]/.test(document.body.innerText)`);
    ok = ok && after === "470" && !forbidden;
    return { ok, note: out.join("｜") + `；點綠卡右下角 → 分數 ${after}；官方門檻/Tier 字樣=${forbidden}` };
  });
  await R.check("TC-26-02", "AC-26-02", async () => {
    await p.go("customizer"); await p.click('.cz-color[data-color="green"]'); await p.click("#cz-apply"); // 生效綠
    await p.type("#cz-score-input", "300"); await p.key("Tab", "Tab", 9);
    const a = await cards();
    await p.click('.cz-color[data-color="green"]');
    const b = await cards();
    const e = await p.ev(`({ input: document.getElementById("cz-score-input").value, color: document.querySelector(".cz-est-color").textContent, daily: document.querySelector(".cz-est-daily").textContent, eff: document.querySelector(".cz-st-effective").textContent, n: EMT.store.getState().runtime.studySet.length, eff2: EMT.store.getState().data.goal.effectiveColor })`);
    // 生效色級不變：改點橘（未套用）後檢查
    await p.click('.cz-color[data-color="orange"]');
    const c = await p.ev(`({ eff: EMT.store.getState().data.goal.effectiveColor, n: EMT.store.getState().runtime.studySet.length, pressed: [...document.querySelectorAll(".cz-color[aria-pressed=true]")].map((x) => x.dataset.color).join() })`);
    const ok = a.filter((x) => x.pressed === "true").map((x) => x.c).join() === "brown" && b.filter((x) => x.pressed === "true").map((x) => x.c).join() === "green" && e.input === "470" && e.color === "綠" && e.daily === "15 字/天"
      && c.eff === "green" && c.n === 5620 && c.pressed === "orange";
    return { ok, note: `300 → 選中 ${a.filter((x) => x.pressed === "true").map((x) => x.c)}；點綠 → 選中 ${b.filter((x) => x.pressed === "true").map((x) => x.c)}、分數 ${e.input}、試算 ${e.color}/${e.daily}；再點橘（未套用）→ 選中 ${c.pressed}、生效 ${c.eff}、單字集 ${c.n}` };
  });
  await R.check("TC-26-03", "AC-26-03", async () => {
    await p.type("#cz-score-input", "600"); await p.key("Tab", "Tab", 9);
    await p.type("#cz-score-input", "300"); await p.key("Tab", "Tab", 9);
    const a = await p.ev(`[...document.querySelectorAll(".cz-color[aria-pressed=true]")].map((x) => x.dataset.color).join()`);
    await p.type("#cz-score-input", "600"); await p.key("Tab", "Tab", 9);
    await p.ev(`(() => { const s = document.getElementById("cz-score-range"); s.value = "300"; s.dispatchEvent(new Event("input", { bubbles: true })); })()`);
    const b = await p.ev(`[[...document.querySelectorAll(".cz-color[aria-pressed=true]")].map((x) => x.dataset.color).join(), document.getElementById("cz-score-input").value]`);
    await p.click('.cz-color[data-color="gold"]'); const c = await p.ev(`[document.getElementById("cz-score-range").value, document.getElementById("cz-score-input").value]`);
    return { ok: a === "brown" && b[0] === "brown" && b[1] === "300" && c[0] === "860" && c[1] === "860", note: `輸入 300 → 選中 ${a}；滑桿 300 → 選中 ${b[0]}、輸入框 ${b[1]}；點金卡 → 滑桿/輸入框 ${c.join("/")}（交互使用）` };
  });
  await R.check("TC-26-04", "AC-26-04、AC-01-07", async () => {
    const out = []; let ok = true;
    for (const [c, s] of [["blue", "730"], ["gold", "860"]]) {
      await p.type("#cz-score-input", "600"); await p.key("Tab", "Tab", 9);
      await p.click(`.cz-color[data-color="${c}"]`);
      const r = await p.ev(`({ input: document.getElementById("cz-score-input").value, color: document.querySelector(".cz-est-color").textContent, cap: [...document.querySelectorAll(".cz-estimate .cz-warning")].some((e) => !e.hidden && e.textContent === "目前內建字庫到綠色為止"), applyEnabled: !document.getElementById("cz-apply").disabled })`);
      const good = r.input === s && r.cap && r.applyEnabled && r.color.includes("即將開放"); ok = ok && good; out.push(`${c}：${JSON.stringify(r)}`);
    }
    return { ok, note: out.join("；") };
  });
  await p.close();
}

// ═════════ US-27 手機底部導覽列 ═════════
{
  const p = await open();
  await p.goto(); await p.startLearning();
  const navState = () => p.ev(`(() => { const nav = document.getElementById("app-nav"); const cs = getComputedStyle(nav); const r = nav.getBoundingClientRect();
    const items = [...nav.querySelectorAll("[data-tab]")].map((b) => { const rr = b.getBoundingClientRect(); const lab = b.querySelector(".app-nav__label"); const ic = b.querySelector("svg.app-nav__icon");
      return { tab: b.dataset.tab, text: lab ? lab.textContent : b.textContent, w: Math.round(rr.width * 10) / 10, h: Math.round(rr.height * 10) / 10, clipped: lab ? lab.scrollWidth > lab.clientWidth + 0.5 || lab.getBoundingClientRect().right > rr.right + 0.5 || lab.getBoundingClientRect().left < rr.left - 0.5 : false,
        icon: !!ic && ic.getBoundingClientRect().width > 0 && getComputedStyle(ic).display !== "none", iconHref: !!b.querySelector("img, use, image") }; });
    return { position: cs.position, top: Math.round(r.top), bottom: Math.round(r.bottom), vh: window.innerHeight, display: cs.display, toggle: getComputedStyle(document.getElementById("nav-toggle")).display, items }; })()`);
  await R.check("TC-27-01", "AC-27-01、AC-20-01（底部導覽文字）", async () => {
    const out = []; let ok = true;
    for (const w of [375, 640]) {
      await p.viewport(w, 740); await p.reload(); await sleep(200);
      const a = await navState();
      await p.ev(`window.scrollTo(0, 400)`); await sleep(100); const b = await navState();
      await p.ev(`window.scrollTo(0, document.documentElement.scrollHeight)`); await sleep(100); const c = await navState();
      const reach = [];
      for (const it of a.items) { await p.click(`#app-nav [data-tab="${it.tab}"]`); await sleep(80); reach.push((await p.ev(`EMT.router.current()`)) === it.tab); }
      const good = a.position === "fixed" && a.bottom === a.vh && b.top === a.top && c.top === a.top && a.items.map((x) => x.text).join("、") === "主控台、難易度設定、單字卡、模擬測驗、解碼器、句型庫"
        && a.items.every((x) => x.icon && !x.clipped) && reach.every(Boolean) && a.toggle === "none";
      ok = ok && good;
      out.push(`${w}px：position=${a.position}、導覽 top ${a.top}/${b.top}/${c.top}（捲動前/中/底）、bottom=${a.bottom}/視窗 ${a.vh}、項目 ${a.items.map((x) => `${x.text}${x.icon ? "+圖示" : ""}${x.clipped ? "(裁切)" : ""}`).join("、")}、點擊到達 ${reach.filter(Boolean).length}/6、選單鈕 display=${a.toggle}`);
    }
    return { ok, note: out.join("｜") };
  });
  await R.check("TC-27-02", "AC-27-02", async () => {
    const out = []; let ok = true;
    for (const w of [375, 640]) { await p.viewport(w, 740); await sleep(200); const a = await navState(); const good = a.items.every((x) => x.w >= 44 && x.h >= 44); ok = ok && good; out.push(`${w}px：${a.items.map((x) => `${x.w}×${x.h}`).join("、")}`); }
    return { ok, note: out.join("｜") };
  });
  await R.check("TC-27-03", "AC-27-03（自動化部分）", async () => {
    const out = []; let ok = true;
    for (const w of [375, 640]) {
      await p.viewport(w, 667); await sleep(200);
      for (const tab of ["dashboard", "customizer", "flashcards", "part5", "decoder", "phrasebank", "sources"]) {
        await p.ev(`EMT.router.go(${JSON.stringify(tab)})`); await sleep(tab === "phrasebank" ? 1500 : 300); // 句型庫分批補齊完成後再捲到底
        await p.ev(`window.scrollTo(0, document.documentElement.scrollHeight)`); await sleep(150);
        await p.ev(`window.scrollTo(0, document.documentElement.scrollHeight)`); await sleep(150);
        const r = await p.ev(`(() => { const nav = document.getElementById("app-nav").getBoundingClientRect(); const all = [...document.querySelectorAll("#app-main *, #app-footer *")].filter((e) => { const s = getComputedStyle(e); if (s.display === "none" || s.visibility === "hidden" || e.closest("[hidden]") || e.closest(".visually-hidden")) return false; const d = e.closest("details:not([open])"); if (d && !e.closest("summary")) return false; const rr = e.getBoundingClientRect(); return rr.width > 0 && rr.height > 0; });
          const lastBottom = Math.max(...all.map((e) => e.getBoundingClientRect().bottom)); return { navTop: Math.round(nav.top), lastBottom: Math.round(lastBottom) }; })()`);
        const good = r.lastBottom <= r.navTop; ok = ok && good; if (!good || tab === "dashboard") out.push(`${w}px ${tab}：最後元素底 ${r.lastBottom} ≤ 導覽頂 ${r.navTop}=${good}`);
      }
      // Toast：觸發套用的 toast
      await p.ev(`EMT.router.go("customizer")`); await sleep(300);
      await p.click("#cz-apply"); await sleep(120);
      const t = await p.ev(`(() => { const nav = document.getElementById("app-nav").getBoundingClientRect(); const ts = [...document.querySelectorAll("#toast-root .toast")].map((e) => e.getBoundingClientRect()); return { n: ts.length, maxBottom: ts.length ? Math.round(Math.max(...ts.map((r) => r.bottom))) : null, navTop: Math.round(nav.top) }; })()`);
      const tOk = t.n > 0 && t.maxBottom <= t.navTop; ok = ok && tOk; out.push(`${w}px toast：${t.n} 則、底 ${t.maxBottom} ≤ 導覽頂 ${t.navTop}=${tOk}`);
      // 輸入中：聚焦自訂單字欄位 → 導覽隱藏（html.is-typing）
      await p.ev(`(() => { const e = document.getElementById("cv-word"); e.scrollIntoView({ block: "end" }); e.focus(); })()`); await sleep(120);
      const f = await p.ev(`(() => { const nav = document.getElementById("app-nav"); const r = document.getElementById("cv-word").getBoundingClientRect(); const nr = nav.getBoundingClientRect(); const hidden = getComputedStyle(nav).display === "none";
        return { typing: document.documentElement.classList.contains("is-typing"), navHidden: hidden, covered: !hidden && r.bottom > nr.top }; })()`);
      await p.ev(`document.activeElement.blur()`); await sleep(80);
      const back = await p.ev(`[document.documentElement.classList.contains("is-typing"), getComputedStyle(document.getElementById("app-nav")).display]`);
      const fOk = f.typing && f.navHidden && !f.covered && back[0] === false && back[1] !== "none"; ok = ok && fOk; out.push(`${w}px 輸入：is-typing=${f.typing}、導覽隱藏=${f.navHidden}、離開後恢復=${!back[0] && back[1] !== "none"}`);
    }
    return { ok, note: out.join("；") + "（實機虛擬鍵盤列人工 TC-M10）" };
  });
  await R.check("TC-27-04", "AC-27-04、AC-20-03", async () => {
    const out = []; let ok = true;
    for (const [w, h] of [[641, 800], [768, 1024], [1366, 768]]) {
      await p.viewport(w, h); await p.reload(); await sleep(200);
      const a = await navState();
      const reach = [];
      for (const tab of ["dashboard", "customizer", "flashcards", "part5", "decoder", "phrasebank"]) { await p.go(tab); reach.push((await p.ev(`EMT.router.current()`)) === tab); }
      const good = a.position !== "fixed" && reach.every(Boolean) && a.items.every((x) => !x.icon); ok = ok && good;
      out.push(`${w}px：position=${a.position}、圖示顯示=${a.items.some((x) => x.icon)}、選單鈕 display=${a.toggle}、到達 ${reach.filter(Boolean).length}/6`);
    }
    return { ok, note: out.join("；") };
  });
  await p.close();
}
{
  // AC-27-05：斷網開啟，圖示內嵌顯示
  const p = await open();
  await p.send("Network.emulateNetworkConditions", { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await p.viewport(375, 667);
  await p.goto(); await p.startLearning();
  await R.check("TC-27-05", "AC-27-05、AC-19-01", async () => {
    const r = await p.ev(`(() => { const ics = [...document.querySelectorAll("#app-nav svg.app-nav__icon")]; return { n: ics.length, shown: ics.filter((s) => s.getBoundingClientRect().width >= 16 && s.querySelector("path")).length, ext: [...document.querySelectorAll("#app-nav img, #app-nav use, #app-nav image, #app-nav link")].length,
      xmlns: ics.some((s) => s.outerHTML.includes("http")), fonts: [...document.fonts].length }; })()`);
    const reqs = p.log.requests.filter((x) => !x.url.startsWith("file://") && !/^(blob|data):/.test(x.url));
    const errs = p.log.logEntries.filter((e) => e.level === "error");
    return { ok: r.n === 6 && r.shown === 6 && r.ext === 0 && !r.xmlns && reqs.length === 0 && errs.length === 0, note: `離線 375px：內嵌 SVG 圖示 ${r.n} 個、顯示 ${r.shown}；外部圖示元素 ${r.ext}；SVG 含 http 字串=${r.xmlns}；外部請求 ${reqs.length}；Console 錯誤 ${errs.length}；document.fonts ${r.fonts}` };
  });
  await p.close();
}

{
  const ex = PAGES.flatMap((x) => x.log.exceptions); const ce = PAGES.flatMap((x) => x.log.console.filter((c) => c.type === "error").map((c) => c.text));
  R[ex.length === 0 ? "pass" : "fail"]("TC-X-firstrun", "（全套件）無未處理例外", `例外 ${JSON.stringify(ex).slice(0, 400)}；console.error ${JSON.stringify(ce).slice(0, 300)}`);
}
R.save(resultPath("e2e-firstrun"));
