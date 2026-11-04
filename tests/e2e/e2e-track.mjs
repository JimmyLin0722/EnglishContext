// QA E2E 第 7 輪（PRD v0.15，R-23）套件 1：單字卡記住上次位置（US-44）、新資料的保存／備份／舊資料相容（US-47）、AC-18-01、AC-24-02（v0.15）
// 依據：PRD v0.15 US-44、US-47、E-102～E-108、E-113～E-116；契約 v0.15 §5.3 MG-5～MG-8、RD-3、RD-4、§5.10 FP-1～FP-9、§5.12 WR-1～WR-5、§6.2 IM-9、IM-10；
//       architecture v0.10 §7.21.1、§7.21.2、§7.21.5、§10.7 E2E 表。
// 驅動：tests/e2e/lib/cdp.mjs（本機無頭 Chrome，file://）。每個區塊各自啟動並關閉瀏覽器（同時只開 1 個）。
// 樣本：src/app/__tests__/_samples/（FE-70 凍結，唯讀，只讀取不改寫）；v1.0.0 舊交付檔由環境變數 QA_V100 指定（未指定時對應 TC 記失敗並說明）。
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { launch, recorder, sleep, FILE_URL, ROOT, resultPath } from "./lib/cdp.mjs";
import { TOAST_RECORDER, fakeTts, fakeStt, fakeMic, storageMode } from "./lib/inits.mjs";
import { KEY, SV, V2_KEYS, V3_KEYS, stateRecord, stateRecordV2, expandBackup, readState, dialogInfo } from "./lib/state.mjs";

const R = recorder("e2e-track");
const TMP = process.env.QA_TMP || path.join(ROOT, "tests", "results", "tmp");
fs.mkdirSync(TMP, { recursive: true });
const SAMPLES = path.join(ROOT, "src", "app", "__tests__", "_samples");
const sample = (f) => fs.readFileSync(path.join(SAMPLES, f), "utf8");
const V100 = process.env.QA_V100 || "";
const FIX = process.env.QA_FIXTURE_NODATA || "";
const FAIL_TEXT = "資料讀取失敗";
const QUOTA_TEXT = "儲存空間不足";
const UNSAVE_TEXT = "進度將無法保存";
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const TODAY = ymd(new Date());
const J = (x) => JSON.stringify(x);

/** setItem 計數（每個文件載入時重設；只計本系統主鍵） */
const SET_COUNTER = `(() => { window.__sets = 0; const o = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (k === ${J(KEY)}) window.__sets++; return o.call(this, k, v); }; })();`;
/** 減少動態（避免換頁與換卡動畫影響量測，主控指示） */
async function reduce(p) { await p.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] }); }

async function open({ inits = [], vp = [1366, 900], autoStart = true, chooser = false } = {}) {
  const p = await launch();
  for (const s of [TOAST_RECORDER, fakeTts("ok"), fakeStt("ok"), fakeMic("ok"), SET_COUNTER, ...inits]) await p.addInitScript(s);
  await p.viewport(vp[0], vp[1]);
  await reduce(p);
  p.autoStart = autoStart;
  if (chooser) { await p.send("Page.setInterceptFileChooserDialog", { enabled: true }); p.onEvent((m) => { if (m.method === "Page.fileChooserOpened") p.chooser = m.params; }); }
  return p;
}
const toasts = (p) => p.ev(`(window.__qaToasts || []).map((t) => t.text)`);
const lsRaw = (p) => p.ev(`localStorage.getItem(${J(KEY)})`);
const lsKeys = (p) => p.ev(`Object.keys(localStorage).sort()`);
const mem = (p) => p.ev(`JSON.parse(JSON.stringify(EMT.store.getState().data))`);
const errs = (p) => p.log.exceptions.concat(p.log.console.filter((c) => c.type === "error").map((c) => c.text));
const netReqs = (p) => p.log.requests.filter((r) => !/^(file|blob|data|about|chrome-extension):/.test(r.url));
/** 單字卡頁狀態 */
const fc = (p) => p.ev(`(() => { const q = (s) => document.querySelector("#view-flashcards " + s); const vis = (e) => !!e && !e.hidden && !e.closest("[hidden]") && e.getClientRects().length > 0;
  const c = q(".fc-card"); return { pos: q(".fc-position") ? q(".fc-position").textContent : null, total: q(".fc-total") ? q(".fc-total").textContent : null,
    word: q(".fc-front .fc-word") ? q(".fc-front .fc-word").textContent : null, flipped: c ? c.dataset.flipped : null, cardVisible: vis(c), empty: vis(q(".fc-empty")),
    quiz: !!q(".fcq-option") && vis(q(".fcq-option")), modePressed: q(".fc-mode-btn") ? q(".fc-mode-btn").getAttribute("aria-pressed") : null,
    prevDis: q(".fc-prev") ? q(".fc-prev").disabled || q(".fc-prev").getAttribute("aria-disabled") === "true" : null, nextDis: q(".fc-next") ? q(".fc-next").disabled || q(".fc-next").getAttribute("aria-disabled") === "true" : null,
    active: document.querySelector("#app-nav [aria-current=page], #app-nav [aria-selected=true]") ? (document.querySelector("#app-nav [aria-current=page], #app-nav [aria-selected=true]").dataset.tab || "") : "" }; })()`);
const studyWord = (p, i) => p.ev(`(() => { const c = EMT.store.getState().runtime.studySet[${i}]; return c ? (c.word || (c.item && c.item.word)) : null; })()`);
const studyLen = () => `EMT.store.getState().runtime.studySet.length`;
/** 在頁面內以 el.click() 觸發並量到條件成立（下一個繪製影格為止）的時間（ms） */
const clickAndTime = (p, sel, condJs) => p.ev(`(async () => { const el = document.querySelector(${J(sel)}); if (!el) return { ms: null, err: "no ${sel.replace(/"/g, "'")}" };
  const t0 = performance.now(); el.click(); const cond = () => { try { return !!(${condJs}); } catch (e) { return false; } };
  for (let i = 0; i < 120; i++) { await new Promise((r) => requestAnimationFrame(() => r())); if (cond()) return { ms: Math.round((performance.now() - t0) * 10) / 10 }; }
  return { ms: null, err: "條件未成立" }; })()`);
/** 關閉分頁（導離本檔）後重新開啟同一檔案（同 e2e-persist） */
async function closeReopen(p, url = FILE_URL) { await p.goto("about:blank", { waitReady: false }); await sleep(400); await p.goto(url); }
async function nextN(p, n) { for (let i = 0; i < n; i++) { await p.click(".fc-next"); await sleep(30); } }
async function setLs(p, rec) { await p.ev(`localStorage.setItem(${J(KEY)}, ${J(typeof rec === "string" ? rec : J(rec))})`); }
async function addWord(p, word, meaning = "測試") { await p.go("customizer"); await p.type("#cv-word", word); await p.type("#cv-meaning", meaning); await p.click('.cv-form button[type="submit"]'); await sleep(80); }
async function delWord(p, word) { await p.go("customizer"); await p.click(`.cv-item__delete[aria-label="刪除 ${word}"]`); await sleep(80); }
async function importFile(p, content, name, { trigger = '[data-action="import-backup"]', confirm = true } = {}) {
  const f = path.join(TMP, "trk-" + Date.now() + "-" + name); fs.writeFileSync(f, content);
  if (trigger.includes("import-backup")) { await p.go("dashboard"); await sleep(200); await expandBackup(p); }
  p.chooser = null; await p.click(trigger);
  for (let i = 0; i < 60 && !p.chooser; i++) await sleep(50);
  if (!p.chooser) throw new Error("未出現檔案選擇器");
  await p.send("DOM.setFileInputFiles", { files: [f], backendNodeId: p.chooser.backendNodeId }); await sleep(350);
  const dlg = await dialogInfo(p);
  if (dlg) { await p.click(`.dialog [data-action="${confirm ? "ok" : "cancel"}"]`); await sleep(400); }
  return dlg;
}
async function exportNow(p) {
  await p.go("dashboard"); await sleep(200); await expandBackup(p);
  for (const f of fs.readdirSync(p.downloads)) { try { fs.rmSync(path.join(p.downloads, f)); } catch { /* 忽略 */ } } // 同名下載會覆蓋，先清空
  const before = new Set(fs.readdirSync(p.downloads));
  await p.click('[data-action="export-backup"]');
  for (let i = 0; i < 60; i++) { const now = fs.readdirSync(p.downloads).filter((f) => !before.has(f) && f.endsWith(".json")); if (now.length) { await sleep(150); return { name: now[0], text: fs.readFileSync(path.join(p.downloads, now[0]), "utf8") }; } await sleep(100); }
  throw new Error("未下載備份檔");
}
const p5info = (p) => p.ev(`(() => { const q = (s) => document.querySelector("#view-part5 " + s); const t = (s) => (q(s) ? q(s).textContent : null);
  const only = q("[data-p5=only]"); return { number: t("[data-p5=number]"), count: t("[data-p5=correct-count]"), badge: t("[data-p5=correct-badge]"), only: only ? only.checked : null, allCorrect: !!q("[data-p5=allcorrect-title]") }; })()`);

// ═════════ AC-44-01、AC-44-02、AC-44-03、AC-44-09：兩種寬度（375 觸控、1366） ═════════
for (const [w, h] of [[375, 667], [1366, 900]]) {
  const p = await open({ vp: [w, h] });
  await p.goto();
  const N = await p.ev(studyLen());
  await p.go("flashcards");
  await nextN(p, 9);
  const at10 = await fc(p); const W = at10.word;
  const lsAt10 = JSON.parse(await lsRaw(p));
  const t0 = (await toasts(p)).length;
  await R.check(`TC-44-01-${w}`, "AC-44-01、AC-39-03、AC-22-01、FP-3、FP-8", async () => {
    await closeReopen(p);
    const tA0 = (await toasts(p)).length;
    // (a) 由導覽「單字卡」進入：量點擊到卡片顯示
    const tabBtn = w <= 640 ? '#app-nav [data-tab="flashcards"]' : '#app-nav [data-tab="flashcards"]';
    const ma = await clickAndTime(p, tabBtn, `document.querySelector("#view-flashcards .fc-position") && document.querySelector("#view-flashcards .fc-position").textContent === ${J(`第 10 / ${N} 張`)} && !document.querySelector("#view-flashcards").hidden`);
    await sleep(120); const a = await fc(p); const da = await dialogInfo(p); const ta = (await toasts(p)).slice(tA0);
    // (b) 重新開啟後由主控台「開始今日學習」進入
    await closeReopen(p); await p.go("dashboard"); await sleep(150);
    const tB0 = (await toasts(p)).length;
    const mb = await clickAndTime(p, "#view-dashboard .db-start", `document.querySelector("#view-flashcards .fc-position") && document.querySelector("#view-flashcards .fc-position").textContent === ${J(`第 10 / ${N} 張`)} && !document.querySelector("#view-flashcards").hidden`);
    await sleep(120); const b = await fc(p); const db = await dialogInfo(p); const tb = (await toasts(p)).slice(tB0);
    const okA = a.word === W && a.pos === `第 10 / ${N} 張` && a.flipped === "false" && !a.quiz && a.prevDis === false && a.nextDis === false && !da && ta.length === 0 && ma.ms !== null && ma.ms <= 100;
    const okB = b.word === W && b.pos === `第 10 / ${N} 張` && b.flipped === "false" && !db && tb.length === 0 && mb.ms !== null && mb.ms <= 100;
    return { ok: okA && okB && lsAt10.data.flashcardPosition && lsAt10.data.flashcardPosition.ordinal === 10,
      note: `${w}px：按「下一張」9 次到第 10 張「${W}」，localStorage flashcardPosition ${J(lsAt10.data.flashcardPosition)}；關閉重開後 (a) 導覽進入 ${ma.ms} ms →「${a.pos}」「${a.word}」正面=${a.flipped === "false"}、上一張停用=${a.prevDis}、下一張停用=${a.nextDis}、對話框=${!!da}、Toast ${J(ta)}；(b)「開始今日學習」${mb.ms} ms →「${b.pos}」「${b.word}」、對話框=${!!db}、Toast ${J(tb)}` };
  });
  await R.check(`TC-44-03-${w}`, "AC-44-03、FP-7、AC-30-04、AC-17-02", async () => {
    const st = JSON.parse(await lsRaw(p)); const d = st.data;
    await p.go("dashboard"); await sleep(150);
    const dash = await p.ev(`({ today: (document.querySelector("#view-dashboard .db-today__text") || {}).textContent, streak: (document.querySelector("#view-dashboard .db-stat--streak .db-stat__value") || {}).innerText, mastered: (document.querySelector("#view-dashboard .db-stat--mastery .db-stat__sub") || {}).textContent })`);
    await p.go("flashcards"); const c = await fc(p);
    const ok = d.todayLearned.wordKeys.length === 0 && Object.keys(d.learnedHistory).length === 0 && d.streak.days === 0 && d.streak.lastActiveDate === null && d.masteredWordKeys.length === 0 && dash.today === "今日已學 0 / 15 字" && c.flipped === "false" && c.word === W;
    return { ok, note: `還原到第 10 張（未翻面、未作答）後：todayLearned ${J(d.todayLearned)}、learnedHistory ${J(d.learnedHistory)}、streak ${J(d.streak)}、已掌握 ${d.masteredWordKeys.length}；主控台「${dash.today}」、連續打卡「${(dash.streak || "").replace(/\s+/g, " ")}」、「${dash.mastered}」；卡片正面=${c.flipped === "false"}` };
  });
  if (w === 375) {
    await R.check("TC-44-02", "AC-44-02、AC-28-03、FP-3", async () => {
      // 依序：上一張 → 重新載入；向右滑動 → 重新載入；下一張 → 重新載入（每次換卡後立即重新載入並進入單字卡頁）
      const seq = []; let okAll = true;
      await p.go("flashcards");
      const steps = [["上一張", 9], ["向右滑動", 8], ["下一張", 9]];
      for (const [how, exp] of steps) {
        const s0 = await p.ev(`window.__sets`); let ms = null;
        if (how === "上一張") ms = (await clickAndTime(p, "#view-flashcards .fc-prev", `document.querySelector("#view-flashcards .fc-position").textContent === ${J(`第 ${exp} / ${N} 張`)}`)).ms;
        else if (how === "下一張") ms = (await clickAndTime(p, "#view-flashcards .fc-next", `document.querySelector("#view-flashcards .fc-position").textContent === ${J(`第 ${exp} / ${N} 張`)}`)).ms;
        else {
          await p.ev(`window.__swT0 = null; window.__swMs = null; (() => { const el = document.querySelector("#view-flashcards .fc-position"); new MutationObserver(() => { if (window.__swT0 !== null && window.__swMs === null && el.textContent === ${J(`第 ${exp} / ${N} 張`)}) requestAnimationFrame(() => { window.__swMs = performance.now() - window.__swT0; }); }).observe(el, { childList: true, characterData: true, subtree: true }); document.addEventListener("touchend", () => { window.__swT0 = performance.now(); }, { capture: true, once: true }); })()`);
          await p.swipe("#view-flashcards .fc-card", 160, 0, { durationMs: 200 }); await sleep(300);
          ms = await p.ev(`window.__swMs === null ? null : Math.round(window.__swMs * 10) / 10`);
        }
        await sleep(80);
        const before = await fc(p); const sets = (await p.ev(`window.__sets`)) - s0; const fp = JSON.parse(await lsRaw(p)).data.flashcardPosition;
        await p.reload(); await p.go("flashcards"); const after = await fc(p);
        const ok = before.pos === `第 ${exp} / ${N} 張` && after.pos === before.pos && after.word === before.word && sets === 1 && fp.ordinal === exp && fp.wordKey === before.word.toLowerCase() && ms !== null && ms <= 100;
        okAll = okAll && ok; seq.push(`${how} ${ms} ms →「${before.pos}」${before.word}（setItem ${sets} 次、紀錄 ${J(fp)}）→ 重新載入「${after.pos}」${after.word}`);
        if (how === "向右滑動") await sleep(1600); // FE-28：滑動後 1.5 秒內 click 可能被吞
      }
      return { ok: okAll, note: seq.join("；") };
    });
    await R.check("TC-44-09", "AC-44-09、FP-1、Q-68", async () => {
      await p.go("flashcards"); const pos0 = await fc(p);
      await p.click("#view-flashcards .fc-mode-btn"); await sleep(120); const q = await fc(p);
      await p.reload(); await p.go("flashcards"); const a = await fc(p);
      // 同一工作階段：切測驗模式 → 離開 → 回來（維持 v0.14 現況，記錄觀察）
      await p.click("#view-flashcards .fc-mode-btn"); await sleep(120); await p.go("dashboard"); await p.go("flashcards"); const back = await fc(p);
      await p.click("#view-flashcards .fc-mode-btn").catch(() => {}); await sleep(80);
      const ok = q.quiz && q.modePressed === "true" && !a.quiz && a.modePressed === "false" && a.flipped === "false" && a.pos === pos0.pos && a.word === pos0.word;
      return { ok, note: `第 ${pos0.pos} 切測驗模式（aria-pressed ${q.modePressed}、選項可見=${q.quiz}）→ 重新載入：單字卡模式=${!a.quiz}（aria-pressed ${a.modePressed}）、正面=${a.flipped === "false"}、「${a.pos}」${a.word}；同一工作階段切測驗模式後離開再回來：aria-pressed ${back.modePressed}（v0.14 現況，僅記錄）` };
    });
  }
  await R.check(`TC-X-track-${w}`, "Console 無未處理錯誤、無網路請求（AC-47-08 (a)）", async () => ({ ok: errs(p).length === 0 && netReqs(p).length === 0, note: `例外／錯誤 ${J(errs(p)).slice(0, 300)}；非 file 請求 ${netReqs(p).length}` }));
  await p.close();
}

// ═════════ AC-44-04、AC-44-05 (a)：以單字找回、刪除後退回 min(i, N) ═════════
{
  const p = await open();
  await p.goto();
  const M = await p.ev(studyLen());
  for (const w of ["qaalpha", "qabravo", "qacharlie"]) await addWord(p, w);
  await R.check("TC-44-04", "AC-44-04、FP-2 (3)、FP-5、E-105", async () => {
    await p.go("flashcards"); await p.ev(`EMT.store.actions.gotoCard(${M + 2})`); await sleep(60);
    const c0 = await fc(p);
    await delWord(p, "qaalpha"); await p.go("flashcards"); const c1 = await fc(p);
    await p.reload(); await p.go("flashcards"); const c2 = await fc(p);
    await addWord(p, "qaecho"); await p.go("flashcards"); const c3 = await fc(p);
    await p.reload(); await p.go("flashcards"); const c3r = await fc(p);
    const fp = JSON.parse(await lsRaw(p)).data.flashcardPosition;
    const ok = c0.word === "qacharlie" && c0.pos === `第 ${M + 3} / ${M + 3} 張` && c1.word === "qacharlie" && c1.pos === `第 ${M + 2} / ${M + 2} 張` && c2.word === "qacharlie" && c2.pos === c1.pos
      && c3.word === "qacharlie" && c3.pos === `第 ${M + 2} / ${M + 3} 張` && c3r.word === "qacharlie" && c3r.pos === c3.pos && fp.wordKey === "qacharlie" && fp.ordinal === M + 2;
    return { ok, note: `M = ${M}；上次位置 C：「${c0.pos}」${c0.word}；(1) 刪除 A 回單字卡「${c1.pos}」${c1.word}；(2) 重新載入「${c2.pos}」${c2.word}；(3) 新增 E 後「${c3.pos}」${c3.word}、重新載入「${c3r.pos}」${c3r.word}；紀錄 ${J(fp)}` };
  });
  await R.check("TC-44-05a", "AC-44-05 (a)、AC-04-08、FP-2 (4)、E-104", async () => {
    // 目前單字集 = M + qabravo、qacharlie、qaecho；位置在 qabravo（中間），到難易度設定刪除 → 原本的下一張
    await p.go("flashcards"); await p.ev(`EMT.store.actions.gotoCard(${M})`); await sleep(60); const y0 = await fc(p);
    await delWord(p, "qabravo"); await p.reload(); await p.go("flashcards"); const y1 = await fc(p);
    // 位置在最後一張 qaecho，刪除 → 前一張
    await p.ev(`EMT.store.actions.gotoCard(${M + 1})`); await sleep(60); const z0 = await fc(p);
    await delWord(p, "qaecho"); await p.reload(); await p.go("flashcards"); const z1 = await fc(p);
    const ok = y0.word === "qabravo" && y1.word === "qacharlie" && y1.pos === `第 ${M + 1} / ${M + 2} 張` && z0.word === "qaecho" && z1.word === "qacharlie" && z1.pos === `第 ${M + 1} / ${M + 1} 張` && y1.flipped === "false" && z1.flipped === "false" && errs(p).length === 0;
    return { ok, note: `中間：「${y0.pos}」${y0.word} 刪除 → 重新載入「${y1.pos}」${y1.word}（原本的下一張）；最後一張：「${z0.pos}」${z0.word} 刪除 → 重新載入「${z1.pos}」${z1.word}（前一張）；Console 錯誤 ${errs(p).length}` };
  });
  await p.close();
}

// ═════════ AC-44-05 (b)(c)、AC-44-06、AC-47-05：localStorage 構造 ═════════
{
  const p = await open();
  await p.goto();
  const N = await p.ev(studyLen());
  const base = stateRecord(725, { masteredWordKeys: ["the"], vocabQuiz: { answered: 3, correct: 2 }, streak: { days: 2, lastActiveDate: TODAY }, sttNoticeAcknowledged: true,
    todayLearned: { date: TODAY, wordKeys: ["the"] }, learnedHistory: { [TODAY]: 1 }, part5: { currentIndex: 4, lockedSelection: null, phase: "question", roundAnswered: 4, roundCorrect: 3, totalAnswered: 9, totalCorrect: 6 },
    part5CorrectIds: ["p5-001", "p5-002"], part5UnansweredOnly: false });
  const tryState = async (over) => {
    const rec = JSON.parse(J(base)); Object.assign(rec.data, over);
    await setLs(p, rec); const tN = (await toasts(p)).length; await p.reload();
    const t = (await toasts(p)).slice(tN); const d = await mem(p); const keys = await lsKeys(p); await p.go("flashcards"); const c = await fc(p);
    return { t, d, keys, c, rec };
  };
  await R.check("TC-44-05bc", "AC-44-05 (b)(c)、FP-2 (4)、E-104", async () => {
    const b = await tryState({ flashcardPosition: { wordKey: "qanotexist", ordinal: 5 } });
    const w5 = await studyWord(p, 4);
    const c = await tryState({ flashcardPosition: { wordKey: "qanotexist", ordinal: 999999 } });
    const wN = await studyWord(p, N - 1);
    const ok = b.c.pos === `第 5 / ${N} 張` && b.c.word === w5 && b.c.cardVisible && c.c.pos === `第 ${N} / ${N} 張` && c.c.word === wN && c.c.cardVisible
      && !b.t.concat(c.t).some((x) => x.includes(FAIL_TEXT)) && errs(p).length === 0 && !b.keys.includes("englishMasterTrack:unreadable");
    return { ok, note: `(b) 紀錄 {qanotexist, 5}、N = ${N} →「${b.c.pos}」${b.c.word}（期望第 5 張 ${w5}）；(c) {qanotexist, 999999} →「${c.c.pos}」${c.c.word}（期望第 N 張 ${wN}）；空白卡 0、Toast ${J(b.t.concat(c.t))}、Console 錯誤 ${errs(p).length}` };
  });
  await R.check("TC-44-06", "AC-44-06 (b)(c)、AC-47-05（flashcardPosition）、RD-3 (d)、E-107", async () => {
    const out = []; let ok = true;
    const bads = [["序號 0", { wordKey: "of", ordinal: 0 }], ["序號字串", { wordKey: "of", ordinal: "10" }], ["序號 1.5", { wordKey: "of", ordinal: 1.5 }], ["序號 -1", { wordKey: "of", ordinal: -1 }], ["單字為數字", { wordKey: 5, ordinal: 3 }],
      ["陣列", ["of", 3]], ["空物件", {}], ["字串", "of"], ["多餘鍵", { wordKey: "of", ordinal: 3, extra: 1 }], ["缺鍵", { wordKey: "of" }]];
    for (const [k, v] of bads) {
      const r = await tryState({ flashcardPosition: v });
      const others = V3_KEYS.filter((x) => x !== "flashcardPosition" && x !== "part5").every((x) => J(r.d[x]) === J(r.rec.data[x])) && J(r.d.part5) === J(r.rec.data.part5);
      const good = r.c.pos === `第 1 / ${N} 張` && r.c.flipped === "false" && others && !r.t.some((x) => x.includes(FAIL_TEXT)) && !r.keys.includes("englishMasterTrack:unreadable") && (r.d.flashcardPosition === null || r.d.flashcardPosition.ordinal === 1);
      ok = ok && good; out.push(`${k}${good ? "" : "✗"}→「${r.c.pos}」記憶體紀錄 ${J(r.d.flashcardPosition)}、其他欄位不變=${others}`);
    }
    // (b) v0.14 以前（schemaVersion 2、無 3 欄）
    const v2 = stateRecordV2(725, { masteredWordKeys: ["the"], vocabQuiz: { answered: 3, correct: 2 }, streak: { days: 2, lastActiveDate: TODAY } });
    await setLs(p, v2); const tN = (await toasts(p)).length; await p.reload(); const t2 = (await toasts(p)).slice(tN);
    const sets = await p.ev(`window.__sets`); const st = JSON.parse(await lsRaw(p)); await p.go("flashcards"); const c2 = await fc(p);
    const same9 = V2_KEYS.every((x) => J(st.data[x]) === J(v2.data[x]));
    const okB = c2.pos === `第 1 / ${N} 張` && !t2.some((x) => x.includes(FAIL_TEXT)) && st.schemaVersion === SV && same9 && st.data.flashcardPosition === null && sets === 1;
    ok = ok && okB;
    return { ok: ok && errs(p).length === 0, note: `(c) ${out.join("；")}；(b) v2 狀態 →「${c2.pos}」、Toast ${J(t2)}、遷移寫回 setItem ${sets} 次、schemaVersion ${st.schemaVersion}、9 欄不變=${same9}、flashcardPosition ${J(st.data.flashcardPosition)}；Console 錯誤 ${errs(p).length}` };
  });
  await R.check("TC-47-05", "AC-47-05、RD-3 (a)～(c)、E-116", async () => {
    const out = []; let ok = true;
    const cases = [
      ["答對紀錄為字串", { part5CorrectIds: "p5-001" }, (d) => J(d.part5CorrectIds) === "[]"],
      ["答對紀錄為物件", { part5CorrectIds: { a: 1 } }, (d) => J(d.part5CorrectIds) === "[]"],
      ["答對紀錄為 null", { part5CorrectIds: null }, (d) => J(d.part5CorrectIds) === "[]"],
      ["答對紀錄含非字串項目", { part5CorrectIds: [1, "p5-002", null, { id: "p5-004" }, "p5-003"] }, (d) => J(d.part5CorrectIds) === J(["p5-002", "p5-003"])],
      ["開關為字串 true", { part5UnansweredOnly: "true" }, (d) => d.part5UnansweredOnly === false],
      ["開關為 1", { part5UnansweredOnly: 1 }, (d) => d.part5UnansweredOnly === false],
      ["開關為 null", { part5UnansweredOnly: null }, (d) => d.part5UnansweredOnly === false],
      ["上次位置為陣列", { flashcardPosition: [] }, (d) => d.flashcardPosition === null || d.flashcardPosition.ordinal === 1],
    ];
    for (const [k, over, chk] of cases) {
      const r = await tryState(over); const field = Object.keys(over)[0];
      const others = V3_KEYS.filter((x) => x !== field && x !== "flashcardPosition").every((x) => J(r.d[x]) === J(r.rec.data[x]));
      await p.go("part5"); await sleep(60); const pi = await p5info(p);
      const good = chk(r.d) && others && !r.t.some((x) => x.includes(FAIL_TEXT)) && !r.keys.includes("englishMasterTrack:unreadable");
      ok = ok && good; out.push(`${k}${good ? "" : "✗"}→ ${field} = ${J(r.d[field])}、其他欄位不變=${others}、${pi.count}、開關 ${pi.only}`);
    }
    return { ok: ok && errs(p).length === 0, note: out.join("；") + `；Toast 含「${FAIL_TEXT}」0、unreadable 鍵 0；Console 錯誤 ${errs(p).length}` };
  });
  await p.close();
}

// ═════════ AC-44-07：有紀錄但單字集為空（無內建資料 fixture） ═════════
if (FIX && fs.existsSync(FIX)) {
  const p = await open();
  const url = pathToFileURL(FIX).href;
  await p.goto(url);
  await R.check("TC-44-07", "AC-44-07、AC-06-06、FP-2 (1)、E-106", async () => {
    const out = []; let ok = true;
    for (const [label, fp, add, expWord] of [["記錄的單字在", { wordKey: "qamono", ordinal: 3 }, ["qamono"], "qamono"], ["記錄的單字不在", { wordKey: "qaghost", ordinal: 3 }, ["qafirst"], "qafirst"]]) {
      await setLs(p, stateRecord(725, { flashcardPosition: fp })); await p.goto(url);
      await p.go("flashcards"); const e = await fc(p); const kept = JSON.parse(await lsRaw(p)).data.flashcardPosition;
      for (const w of add) await addWord(p, w);
      await p.go("flashcards"); const c = await fc(p);
      const good = e.empty && !e.cardVisible && J(kept) === J(fp) && c.word === expWord && c.pos === "第 1 / 1 張";
      ok = ok && good; out.push(`${label}：紀錄 ${J(fp)}，空狀態=${e.empty}、紀錄不動=${J(kept) === J(fp)}；新增 ${add.join(",")} 後「${c.pos}」${c.word}`);
    }
    return { ok: ok && errs(p).length === 0, note: out.join("；") + `；Console 錯誤 ${errs(p).length}` };
  });
  await p.close();
} else R.fail("TC-44-07", "AC-44-07", "未提供 QA_FIXTURE_NODATA，無法執行");

// ═════════ AC-44-08：套用不同生效色級（直接、確定、取消） ═════════
{
  const p = await open();
  await p.goto();
  let rawBeforeApply = null; // 點卡片之後、按「套用」之前的 localStorage（AC-32-04 的比較基準）
  const applyColor = async (c, dialog) => { await p.go("customizer"); await p.click(`.cz-level[data-color="${c}"]`); await sleep(40); rawBeforeApply = await lsRaw(p); await p.click("#cz-apply"); await sleep(120); const d = await dialogInfo(p); if (d) { await p.click(`.dialog [data-action="${dialog}"]`); await sleep(200); } return d; };
  const to10 = async () => { await p.go("flashcards"); await p.ev(`EMT.store.actions.gotoCard(0)`); await nextN(p, 9); return fc(p); };
  await R.check("TC-44-08", "AC-44-08、AC-03-05、AC-32-04、FP-4、CI-9、E-108", async () => {
    const out = [];
    // (a1) 無學習紀錄直接套用棕
    const a0 = await to10(); const d1 = await applyColor("brown"); await p.go("flashcards"); const a1 = await fc(p); await p.reload(); await p.go("flashcards"); const a1r = await fc(p); const fp1 = JSON.parse(await lsRaw(p)).data.flashcardPosition;
    out.push(`(a) 無紀錄：「${a0.pos}」套用棕 → 對話框=${!!d1}、「${a1.pos}」${a1.word}、重新載入「${a1r.pos}」、紀錄 ${J(fp1)}`);
    // (a2) 有學習紀錄（翻面 1 張）在第 10 張，套用綠 → 確定
    await p.go("flashcards"); await p.ev(`EMT.store.actions.gotoCard(0)`); await p.click("#view-flashcards .fc-flip"); await sleep(100); await p.click("#view-flashcards .fc-flip"); await sleep(100);
    const b0 = await to10(); const d2 = await applyColor("green", "ok"); await p.go("flashcards"); const b1 = await fc(p); await p.reload(); await p.go("flashcards"); const b1r = await fc(p); const fp2 = JSON.parse(await lsRaw(p)).data.flashcardPosition;
    out.push(`有紀錄：「${b0.pos}」套用綠 → 對話框=${!!d2}、確定 →「${b1.pos}」、重新載入「${b1r.pos}」、紀錄 ${J(fp2)}`);
    // (b) 有學習紀錄，套用棕 → 取消
    await p.ev(`EMT.store.actions.gotoCard(0)`); await p.click("#view-flashcards .fc-flip"); await sleep(100); await p.click("#view-flashcards .fc-flip"); await sleep(100);
    const c0 = await to10(); const d3 = await applyColor("brown", "cancel"); const raw0 = rawBeforeApply; const raw1 = await lsRaw(p); await p.go("flashcards"); const c1 = await fc(p); await p.reload(); await p.go("flashcards"); const c1r = await fc(p);
    out.push(`(b) 有紀錄：「${c0.pos}」${c0.word} 套用棕 → 對話框=${!!d3}、取消 →「${c1.pos}」${c1.word}、localStorage 與按「套用」前相同=${raw0 === raw1}、重新載入「${c1r.pos}」${c1r.word}`);
    const ok = !d1 && /^第 1 \/ /.test(a1.pos) && /^第 1 \/ /.test(a1r.pos) && fp1 === null && a0.pos.startsWith("第 10 /")
      && !!d2 && /^第 1 \/ /.test(b1.pos) && /^第 1 \/ /.test(b1r.pos) && fp2 === null && b0.pos.startsWith("第 10 /")
      && !!d3 && c1.pos === c0.pos && c1.word === c0.word && raw0 === raw1 && c1r.pos === c0.pos && c1r.word === c0.word;
    return { ok, note: out.join("；") };
  });
  // FB-54：生效色級未改變（綠 → 藍 → 金 → 綠）的套用不回第 1 張
  await R.check("TC-44-08b", "AC-44-08（FB-54：同生效色級套用）、AC-32-05", async () => {
    const a0 = await to10(); const seq = [];
    for (const c of ["blue", "gold", "green"]) { const d = await applyColor(c, "ok"); await p.go("flashcards"); const x = await fc(p); seq.push(`${c}${d ? "（對話框）" : ""}→「${x.pos}」${x.word}`); }
    await p.reload(); await p.go("flashcards"); const r = await fc(p);
    const ok = seq.every((s) => !s.includes("對話框") && s.includes(`「${a0.pos}」${a0.word}`)) && r.pos === a0.pos;
    return { ok, note: `目前生效綠、「${a0.pos}」${a0.word}：${seq.join("；")}；重新載入「${r.pos}」${r.word}` };
  });
  await p.close();
}

// ═════════ AC-44-10 (a)、AC-47-07 (a)：localStorage 停用 ═════════
{
  const p = await open({ inits: [storageMode("disabled")] });
  await p.goto();
  await R.check("TC-44-10a", "AC-44-10 (a)、AC-47-07 (a)、AC-18-03、FP-9、WR-3、E-102", async () => {
    await p.go("flashcards"); await nextN(p, 9); const a = await fc(p);
    await p.go("dashboard"); await p.go("flashcards"); const back = await fc(p);
    // 模擬測驗：答對第 1 題、切換開關
    await p.go("part5"); const ci = await p.ev(`PART5_QUESTION_BANK[EMT.store.getState().data.part5.currentIndex].correctIndex`);
    await p.click(`#view-part5 [data-p5=option][data-index="${ci}"]`); await sleep(120); const q1 = await p5info(p);
    await p.click("#view-part5 [data-p5=only-label]"); await sleep(120); const q2 = await p5info(p);
    const banner1 = await p.ev(`document.body.innerText.includes(${J(UNSAVE_TEXT)})`);
    await p.reload(); await p.go("flashcards"); const r = await fc(p); await p.go("part5"); const q3 = await p5info(p);
    const banner2 = await p.ev(`document.body.innerText.includes(${J(UNSAVE_TEXT)})`);
    const ok = a.pos.startsWith("第 10 /") && back.pos === a.pos && back.word === a.word && q1.badge === "✓ 曾答對" && q1.count === "已答對 1 / 200 題" && q2.only === true && banner1
      && r.pos.startsWith("第 1 /") && q3.count === "已答對 0 / 200 題" && q3.only === false && !q3.badge && banner2 && p.log.exceptions.length === 0;
    return { ok, note: `停用 storage：換到「${a.pos}」→ 離開再回來「${back.pos}」${back.word}；作答答對 → 標示「${q1.badge}」「${q1.count}」；開關 → ${q2.only}；「${UNSAVE_TEXT}」顯示=${banner1}；重新載入 →「${r.pos}」、「${q3.count}」、開關 ${q3.only}、標示 ${q3.badge}、警示仍顯示=${banner2}；未處理例外 ${p.log.exceptions.length}` };
  });
  await p.close();
}

// ═════════ AC-44-10 (b)、AC-47-07 (b)、V-ST-22（SD-FB-59）：容量已滿，一般寫入混合 20 次只提示 1 次 ═════════
{
  // 每次載入時先解除容量模擬（首次畫面「開始學習」與重新載入照常寫入），量測時才在執行期設為容量已滿；
  // 否則「開始學習」的寫入失敗就會用掉本工作階段唯一一次提示（WR-2、SD-FB-59）
  const p = await open({ inits: [storageMode("quota"), "window.__qaQuota = false;"] });
  await p.goto();
  // 先存一筆有內容的狀態（第 3 張、答對 p5-001）
  await p.go("flashcards"); await nextN(p, 2);
  await p.go("part5"); const ci0 = await p.ev(`PART5_QUESTION_BANK[0].correctIndex`); await p.click(`#view-part5 [data-p5=option][data-index="${ci0}"]`); await sleep(120); await p.click("#view-part5 [data-p5=next]"); await sleep(80);
  await R.check("TC-44-10b", "AC-44-10 (b)、AC-47-07 (b)、AC-30-14、WR-2、V-ST-22、E-103", async () => {
    const raw0 = await lsRaw(p); const n0 = (await toasts(p)).length;
    await p.ev(`window.__qaQuota = true`);
    const ops = [];
    await p.go("flashcards");
    for (let i = 0; i < 6; i++) { await p.click("#view-flashcards .fc-next"); await sleep(30); }
    const c = await fc(p); ops.push(`下一張 ×6 →「${c.pos}」`);
    await p.click("#view-flashcards .fc-flip"); await sleep(80); ops.push("翻面 1");
    await p.go("part5"); const ci = await p.ev(`PART5_QUESTION_BANK[EMT.store.getState().data.part5.currentIndex].correctIndex`);
    await p.click(`#view-part5 [data-p5=option][data-index="${ci}"]`); await sleep(120); const q1 = await p5info(p); ops.push(`作答答對 →「${q1.badge}」「${q1.count}」`);
    await p.click("#view-part5 [data-p5=next]"); await sleep(60);
    for (let i = 0; i < 4; i++) { await p.click("#view-part5 [data-p5=only-label]"); await sleep(60); } const q2 = await p5info(p); ops.push(`開關切換 4 次 → ${q2.only}`);
    await p.go("customizer"); for (const col of ["brown", "green", "orange", "green", "blue", "green"]) { await p.click(`.cz-level[data-color="${col}"]`); await sleep(40); } ops.push("點色級 6 次");
    const t = (await toasts(p)).slice(n0); const qn = t.filter((x) => x === QUOTA_TEXT).length; const raw1 = await lsRaw(p);
    await p.ev(`window.__qaQuota = false`);
    const memD = await mem(p);
    await p.reload(); await p.go("flashcards"); const r = await fc(p); await p.go("part5"); const q3 = await p5info(p);
    const ok = qn === 1 && raw0 === raw1 && c.pos.startsWith("第 9 /") && q1.badge === "✓ 曾答對" && q1.count === "已答對 2 / 200 題" && q2.only === false && memD.part5CorrectIds.length === 2
      && r.pos.startsWith("第 3 /") && q3.count === "已答對 1 / 200 題" && p.log.exceptions.length === 0;
    return { ok, note: `容量已滿下 ${ops.join("、")}（共 19 次寫入）：「${QUOTA_TEXT}」出現 ${qn} 次（全部 Toast ${J(t)}）；localStorage 原值不變=${raw0 === raw1}；記憶體答對紀錄 ${J(memD.part5CorrectIds)}；解除後重新載入 → 既有資料「${r.pos}」、「${q3.count}」；未處理例外 ${p.log.exceptions.length}` };
  });
  await p.close();
}

// ═════════ AC-47-01、AC-18-01（v0.15）、AC-47-02、AC-24-02（v0.15）、AC-46-10（備份）、AC-47-06 ═════════
{
  const p = await open({ chooser: true });
  p.autoStart = true;
  await p.goto();
  // 準備：棕 → 自訂單字 → 單字卡第 10 張（並翻面 1 張產生學習紀錄）→ 模擬測驗答對 p5-001、p5-005、p5-010（其餘答錯）→ 開關開啟 → STT 已讀
  await p.go("customizer"); await p.click('.cz-level[data-color="brown"]'); await p.click("#cz-apply"); await sleep(120);
  await addWord(p, "qapersist", "持久化");
  await p.go("flashcards"); await p.click("#view-flashcards .fc-flip"); await sleep(120); await p.click("#view-flashcards .fc-flip"); await sleep(120); await nextN(p, 9);
  const W = (await fc(p)).word;
  await p.go("part5");
  for (let i = 0; i < 10; i++) {
    const ci = await p.ev(`PART5_QUESTION_BANK[${i}].correctIndex`); const pick = [0, 4, 9].includes(i) ? ci : (ci + 1) % 4;
    await p.click(`#view-part5 [data-p5=option][data-index="${pick}"]`); await sleep(60);
    if (i < 9) { await p.click("#view-part5 [data-p5=next]"); await sleep(40); }
  }
  await p.click("#view-part5 [data-p5=only-label]"); await sleep(100);
  await p.ev(`EMT.store.actions.acknowledgeSttNotice()`);
  const expIds = ["p5-001", "p5-005", "p5-010"];
  await R.check("TC-47-01", "AC-47-01、AC-18-01（v0.15）、FP-1、CR-1、UO-1", async () => {
    const before = await p.ev(`JSON.stringify(EMT.store.getState().data)`); const lsB = JSON.parse(await lsRaw(p));
    const viewB = await p.ev(`(() => { EMT.router.go("dashboard"); return document.querySelector("#view-dashboard").innerText; })()`);
    await closeReopen(p);
    const after = await p.ev(`JSON.stringify(EMT.store.getState().data)`); const lsA = JSON.parse(await lsRaw(p)); const keys = await lsKeys(p);
    const viewA = await p.ev(`(() => { EMT.router.go("dashboard"); return document.querySelector("#view-dashboard").innerText; })()`);
    await p.go("flashcards"); const c = await fc(p); await p.go("part5"); const q = await p5info(p);
    const d = JSON.parse(after);
    const ok = before === after && viewB === viewA && c.word === W && c.pos.startsWith("第 10 /") && J(lsA.data.part5CorrectIds) === J(expIds) && q.count === "已答對 3 / 200 題" && q.only === true && lsA.data.part5UnansweredOnly === true
      && lsA.data.flashcardPosition.ordinal === 10 && J(keys) === J([KEY]) && lsA.schemaVersion === SV && Object.keys(lsA.data).length === 12
      && d.goal.appliedScore === 465 && d.customVocab.length === 1 && d.part5.totalAnswered === 10 && d.part5.totalCorrect === 3 && d.streak.days === 1 && d.sttNoticeAcknowledged === true && d.todayLearned.wordKeys.length === 1;
    return { ok, note: `關閉重開後：記憶體資料完全相同=${before === after}、主控台畫面相同=${viewB === viewA}；單字卡「${c.pos}」${c.word}（W=${W}）；localStorage 鍵 ${J(keys)}、schemaVersion ${lsA.schemaVersion}、data ${Object.keys(lsA.data).length} 欄；flashcardPosition ${J(lsA.data.flashcardPosition)}、part5CorrectIds ${J(lsA.data.part5CorrectIds)}、開關 ${lsA.data.part5UnansweredOnly}；模擬測驗「${q.count}」、開關 ${q.only}；其他：目標 ${d.goal.appliedScore}、自訂 ${d.customVocab.length}、Part 5 ${d.part5.totalAnswered}/${d.part5.totalCorrect}、打卡 ${d.streak.days}、STT 已讀 ${d.sttNoticeAcknowledged}、今日已學 ${d.todayLearned.wordKeys.length}` };
  });
  let EXPORT = null;
  await R.check("TC-47-02", "AC-47-02、AC-24-02（v0.15）、AC-46-10（備份）、AC-25-10、AC-24-03、AC-32-08、FP-6", async () => {
    const before = await mem(p);
    const ex = await exportNow(p); EXPORT = ex.text; const j = JSON.parse(ex.text); const d = j.data;
    const okFile = Object.keys(j).length === 5 && j.schemaVersion === SV && J(Object.keys(d)) === J(V3_KEYS) && d.flashcardPosition && d.flashcardPosition.ordinal === 10 && d.flashcardPosition.wordKey === W.toLowerCase()
      && J(d.part5CorrectIds) === J(expIds) && d.part5UnansweredOnly === true && !/MASTER_VOCAB|PART5_QUESTION/.test(ex.text);
    const res = [];
    for (const how of ["(a) 首次畫面「從備份還原」", "(b) 開始學習後主控台匯入"]) {
      await p.ev(`localStorage.clear()`); p.autoStart = false; await p.reload();
      const entry0 = await p.entry();
      let dlg;
      if (how.startsWith("(a)")) dlg = await importFile(p, ex.text, "a.json", { trigger: "#cz-restore" });
      else { await p.startLearning(); dlg = await importFile(p, ex.text, "b.json"); }
      p.autoStart = true;
      const m1 = await mem(p); await p.reload(); const m2 = await mem(p);
      await p.go("flashcards"); const c = await fc(p); await p.go("part5"); const q = await p5info(p);
      const same = V3_KEYS.every((k) => J(m2[k]) === J(before[k]));
      const good = entry0 === "firstRun" && same && J(m1) === J(m2) && c.word === W && c.pos.startsWith("第 10 /") && q.count === "已答對 3 / 200 題" && q.only === true && !(dlg || {}).message?.includes("初始化學習紀錄");
      res.push({ how, good, txt: `${how}：確認視窗「${((dlg || {}).message || "無").slice(0, 30)}」（非 US-32 初始化視窗=${!(dlg || {}).message?.includes("初始化學習紀錄")}）；12 欄與匯出前相同=${same}；重新載入後不變=${J(m1) === J(m2)}；「${c.pos}」${c.word}、「${q.count}」、開關 ${q.only}` });
    }
    return { ok: okFile && res.every((r) => r.good), note: `匯出 ${ex.name}：頂層 ${Object.keys(j).length} 欄、schemaVersion ${j.schemaVersion}、data 欄位 ${Object.keys(d).join(",")}；flashcardPosition ${J(d.flashcardPosition)}、part5CorrectIds ${J(d.part5CorrectIds)}、開關 ${d.part5UnansweredOnly}；${res.map((r) => r.txt).join("；")}` };
  });
  await R.check("TC-47-06", "AC-47-06、IM-9、IM-10、AC-45-07、AC-44-05、AC-24-05、E-116", async () => {
    const base = JSON.parse(EXPORT); const out = []; let ok = true;
    const N = await p.ev(studyLen());
    // (a) 題庫外 id、重複 id
    { const b = JSON.parse(J(base)); b.data.part5CorrectIds = ["p5-001", "p5-001", "p5-999", "p5-002", "p5-002"]; b.data.part5UnansweredOnly = false;
      const n0 = (await toasts(p)).length; await importFile(p, J(b), "ia.json"); const t = (await toasts(p)).slice(n0); await p.go("part5"); const q = await p5info(p); const st = JSON.parse(await lsRaw(p));
      const good = t.some((x) => x.startsWith("已匯入，略過 0 筆")) && q.count === "已答對 2 / 200 題" && st.data.part5CorrectIds.includes("p5-999") && new Set(st.data.part5CorrectIds).size === st.data.part5CorrectIds.length;
      ok = ok && good; out.push(`(a) ids ${J(b.data.part5CorrectIds)} → Toast ${J(t)}、「${q.count}」、localStorage ${J(st.data.part5CorrectIds)}`); }
    // (b) 位置的單字不在匯入後的單字集
    { const b = JSON.parse(J(base)); b.data.flashcardPosition = { wordKey: "qanotexist", ordinal: 7 };
      const n0 = (await toasts(p)).length; await importFile(p, J(b), "ib.json"); const t = (await toasts(p)).slice(n0); await p.go("flashcards"); const c = await fc(p); const w7 = await studyWord(p, 6);
      const good = t.some((x) => x.startsWith("已匯入")) && c.pos === `第 7 / ${N} 張` && c.word === w7;
      ok = ok && good; out.push(`(b) 位置 {qanotexist, 7} → Toast ${J(t)}、「${c.pos}」${c.word}（期望 ${w7}）`); }
    // (c) 整個欄位型別錯誤 → 格式錯誤、資料不變
    for (const [k, over] of [["答對紀錄非陣列", { part5CorrectIds: "p5-001" }], ["答對紀錄為 null", { part5CorrectIds: null }], ["開關為字串", { part5UnansweredOnly: "true" }], ["開關為 0", { part5UnansweredOnly: 0 }],
      ["位置為陣列", { flashcardPosition: [] }], ["位置序號 0", { flashcardPosition: { wordKey: "a", ordinal: 0 } }], ["位置序號 1.5", { flashcardPosition: { wordKey: "a", ordinal: 1.5 } }], ["位置單字為數字", { flashcardPosition: { wordKey: 1, ordinal: 1 } }]]) {
      const b = JSON.parse(J(base)); Object.assign(b.data, over);
      const raw0 = await lsRaw(p); const n0 = (await toasts(p)).length; const dlg = await importFile(p, J(b), "ic.json"); const t = (await toasts(p)).slice(n0); const raw1 = await lsRaw(p);
      const good = t.includes("備份檔格式錯誤，未匯入") && raw0 === raw1;
      ok = ok && good; out.push(`(c) ${k} → ${J(t)}、確認視窗=${!!dlg}、資料不變=${raw0 === raw1}`);
    }
    // 對照：位置為 null 合法（FB-59）
    { const b = JSON.parse(J(base)); b.data.flashcardPosition = null; const n0 = (await toasts(p)).length; await importFile(p, J(b), "inull.json"); const t = (await toasts(p)).slice(n0); await p.go("flashcards"); const c = await fc(p);
      const good = t.some((x) => x.startsWith("已匯入")) && c.pos.startsWith("第 1 /"); ok = ok && good; out.push(`位置 null（合法）→ ${J(t)}、「${c.pos}」`); }
    return { ok: ok && p.log.exceptions.length === 0, note: out.join("；") + `；未處理例外 ${p.log.exceptions.length}` };
  });
  await R.check("TC-X-track-backup", "Console 無未處理錯誤、無網路請求（AC-47-08 (a)：匯出、匯入）", async () => ({ ok: p.log.exceptions.length === 0 && netReqs(p).length === 0, note: `未處理例外 ${p.log.exceptions.length}；非 file 請求 ${netReqs(p).length}` }));
  await p.close();
}

// ═════════ AC-47-03：匯入 v0.14（FE-70 樣本）與 v0.7 備份 ═════════
{
  const p = await open({ chooser: true });
  await p.goto();
  await R.check("TC-47-03", "AC-47-03、AC-24-10、IM-9、MG-8、FP-6、E-113", async () => {
    const out = []; let ok = true;
    for (const f of ["v014-backup.json", "v07-backup.json"]) {
      const text = sample(f); const src = JSON.parse(text).data;
      // 先放一筆不同的 v0.15 狀態（第 5 張、K = 2、開關開啟），確認匯入後被 3 欄預設覆蓋
      await setLs(p, stateRecord(725, { flashcardPosition: { wordKey: "and", ordinal: 5 }, part5CorrectIds: ["p5-001", "p5-002"], part5UnansweredOnly: true })); await p.reload();
      const n0 = (await toasts(p)).length; await importFile(p, text, f); const t = (await toasts(p)).slice(n0);
      const m = await mem(p); await p.reload(); const m2 = await mem(p);
      const fields = Object.keys(src).filter((k) => !["todayLearned", "learnedHistory"].includes(k));
      const same = fields.every((k) => J(m2[k]) === J(src[k]));
      const sameLearn = f === "v014-backup.json" ? (src.todayLearned.date === TODAY ? J(m2.todayLearned) === J(src.todayLearned) : true) : (J(m2.todayLearned) === J({ date: null, wordKeys: [] }) && J(m2.learnedHistory) === "{}");
      await p.go("flashcards"); const c = await fc(p); await p.go("part5"); const q = await p5info(p);
      const good = t.some((x) => x.startsWith("已匯入")) && !t.some((x) => /格式錯誤|版本不相容/.test(x)) && same && sameLearn && J(m) === J(m2) && m2.flashcardPosition === null && J(m2.part5CorrectIds) === "[]" && m2.part5UnansweredOnly === false
        && c.pos.startsWith("第 1 /") && q.count === "已答對 0 / 200 題" && q.only === false;
      ok = ok && good; out.push(`${f}（schemaVersion ${JSON.parse(text).schemaVersion}）→ Toast ${J(t)}；${fields.length} 欄與備份相同=${same}；今日已學／歷史=${sameLearn}；「${c.pos}」、「${q.count}」、開關 ${q.only}；3 欄 ${J([m2.flashcardPosition, m2.part5CorrectIds, m2.part5UnansweredOnly])}`);
    }
    return { ok: ok && p.log.exceptions.length === 0, note: out.join("；") };
  });
  await p.close();
}

// ═════════ AC-47-04：v0.14、v0.7 程式寫入的 localStorage（FE-70 樣本）與 v1.0.0 交付檔實測 ═════════
{
  const p = await open({ chooser: true });
  await p.goto();
  await R.check("TC-47-04", "AC-47-04、AC-30-12、MG-5～MG-7、RD-4、E-114、V-ST-21", async () => {
    const out = []; let ok = true;
    for (const f of ["v014-state.json", "v07-state.json"]) {
      const raw = sample(f).trim(); const src = JSON.parse(raw);
      await p.ev(`localStorage.clear()`); await setLs(p, raw); const n0 = (await toasts(p)).length; await p.reload();
      const entry = await p.entry(); const sets1 = await p.ev(`window.__sets`); const t = (await toasts(p)).slice(n0); const raw1 = await lsRaw(p); const keys = await lsKeys(p);
      await p.reload(); const sets2 = await p.ev(`window.__sets`); const raw2 = await lsRaw(p);
      const st = JSON.parse(raw2); const m = await mem(p);
      const ex = JSON.parse((await exportNow(p)).text);
      // v0.7 樣本含需一般讀取流程正規化的值（冗餘色級不一致、currentIndex 999 超出題庫，FE-70 README），goal／part5 只比對分數與累計
      const keep = Object.keys(src.data).filter((k) => !["todayLearned", "learnedHistory"].includes(k) && !(f === "v07-state.json" && (k === "part5" || k === "goal")));
      const extra = f === "v07-state.json" ? st.data.goal.appliedScore === src.data.goal.appliedScore && st.data.part5.totalAnswered === src.data.part5.totalAnswered && st.data.part5.totalCorrect === src.data.part5.totalCorrect && ex.data.part5.totalAnswered === src.data.part5.totalAnswered : true;
      const same = extra && keep.every((k) => J(st.data[k]) === J(src.data[k]) && J(ex.data[k]) === J(src.data[k]));
      await p.go("part5"); const q = await p5info(p); await p.go("flashcards"); const c = await fc(p);
      const p5 = src.data.part5; const accExp = p5.totalAnswered ? Math.round((p5.totalCorrect / p5.totalAnswered) * 100) + "%" : "—";
      await p.go("dashboard"); const acc = await p.ev(`(document.querySelector("#view-dashboard .db-stat--accuracy .db-stat__value") || {}).innerText`);
      const p5same = f === "v014-state.json" ? J(st.data.part5) === J(p5) && q.number === `第 ${p5.currentIndex + 1} / 200 題` : true;
      const good = entry === "main" && !t.some((x) => /資料讀取失敗|錯誤/.test(x)) && sets1 === 1 && sets2 === 0 && raw1 === raw2 && J(keys) === J([KEY]) && st.schemaVersion === SV && same && p5same
        && (acc || "").replace(/\s+/g, "") === accExp && m.flashcardPosition === null && J(m.part5CorrectIds) === "[]" && m.part5UnansweredOnly === false && c.pos.startsWith("第 1 /") && q.count === "已答對 0 / 200 題" && q.only === false;
      ok = ok && good; out.push(`${f}（schemaVersion ${src.schemaVersion}）→ ${entry}、Toast ${J(t)}；開啟時 setItem ${sets1} 次、再載入 ${sets2} 次、主鍵位元組不變=${raw1 === raw2}；鍵 ${J(keys)}、schemaVersion ${st.schemaVersion}；${keep.length} 欄（localStorage 與匯出）與開啟前相同${f === "v07-state.json" ? "（另比 goal 分數、part5 累計）" : ""}=${same}；模擬測驗「${q.number}」原題號與累計=${p5same}、正確率「${(acc || "").trim()}」（期望 ${accExp}）；「${c.pos}」、「${q.count}」、開關 ${q.only}`);
    }
    return { ok: ok && p.log.exceptions.length === 0, note: out.join("；") };
  });
  await p.close();
}
if (V100 && fs.existsSync(V100)) {
  const p = await open();
  p.autoStart = false;
  const OLD = pathToFileURL(V100).href;
  await R.check("TC-47-04b", "AC-47-04（以 v1.0.0 交付檔實測，SD-FB-58）、AC-36-04", async () => {
    await p.goto(OLD); const oldVer = await p.ev(`(document.querySelector('meta[name="emt-app-version"]') || {}).content`);
    await p.click('.cz-level[data-color="brown"]'); await p.click("#cz-start"); await sleep(400);
    await addWord(p, "qaoldword", "舊版");
    await p.go("flashcards"); await p.click("#view-flashcards .fc-flip"); await sleep(150); await nextN(p, 4);
    await p.go("part5"); for (let i = 0; i < 3; i++) { const ci = await p.ev(`PART5_QUESTION_BANK[${i}].correctIndex`); await p.click(`#view-part5 [data-p5=option][data-index="${i === 1 ? (ci + 1) % 4 : ci}"]`); await sleep(60); await p.click("#view-part5 [data-p5=next]"); await sleep(40); }
    await p.ev(`EMT.store.actions.acknowledgeSttNotice()`);
    const oldRaw = await lsRaw(p); const old = JSON.parse(oldRaw);
    await p.goto(FILE_URL); const entry = await p.entry(); const sets1 = await p.ev(`window.__sets`); const raw1 = await lsRaw(p);
    await p.reload(); const sets2 = await p.ev(`window.__sets`); const raw2 = await lsRaw(p); const st = JSON.parse(raw2);
    const same = Object.keys(old.data).every((k) => J(st.data[k]) === J(old.data[k]));
    await p.go("part5"); const q = await p5info(p); await p.go("flashcards"); const c = await fc(p);
    const ok = oldVer === "1.0.0" && old.schemaVersion === 2 && Object.keys(old.data).length === 9 && entry === "main" && sets1 === 1 && sets2 === 0 && raw1 === raw2 && st.schemaVersion === SV && same
      && q.number === `第 ${old.data.part5.currentIndex + 1} / 200 題` && q.count === "已答對 0 / 200 題" && q.only === false && c.pos.startsWith("第 1 /") && p.log.exceptions.length === 0;
    return { ok, note: `v1.0.0（emt-app-version ${oldVer}）學習後主鍵 schemaVersion ${old.schemaVersion}、${Object.keys(old.data).length} 欄（part5 ${J(old.data.part5)}）→ 以 1.1.0 開啟：${entry}、setItem ${sets1} 次、再載入 ${sets2} 次且位元組不變=${raw1 === raw2}；schemaVersion ${st.schemaVersion}；9 欄逐欄相同=${same}；模擬測驗「${q.number}」「${q.count}」、開關 ${q.only}；單字卡「${c.pos}」；未處理例外 ${p.log.exceptions.length}` };
  });
  await p.close();
} else R.fail("TC-47-04b", "AC-47-04", "未提供 QA_V100（v1.0.0 舊交付檔），無法執行");

R.save(resultPath("e2e-track"));
console.log(`e2e-track：通過 ${R.results.filter((r) => r.result === "通過").length}、失敗 ${R.results.filter((r) => r.result === "失敗").length}`);
