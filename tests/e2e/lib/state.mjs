// QA E2E 共用（第 3 輪，PRD v0.10）：構造 localStorage 狀態、點色級卡片、套用與初始化確認視窗。
// 依據：契約 v0.10 storage-schema.json（schemaVersion 2）、FB-36（構造既有分數時 draftScore = appliedScore）、
// architecture v0.6 §7.15（確認視窗）、§7.17（只選色級）。
import { sleep } from "./cdp.mjs";

export const KEY = "englishMasterTrack:state";
export const CAP = { orange: 215, brown: 465, green: 725, blue: 855, gold: 990 };
export const DAILY = { orange: 10, brown: 10, green: 15, blue: 20, gold: 20 };
export const NAME = { orange: "橘", brown: "棕", green: "綠", blue: "藍", gold: "金" };

export const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const addDays = (s, n) => { const [y, m, d] = s.split("-").map(Number); return ymd(new Date(y, m - 1, d + n)); };
export const todayYmd = () => ymd(new Date());

/** PRD 色級定義表：Color(S) */
export function colorOf(s) {
  if (s <= 215) return "orange";
  if (s <= 465) return "brown";
  if (s <= 725) return "green";
  if (s <= 855) return "blue";
  return "gold";
}
const effOf = (c) => (c === "blue" || c === "gold" ? "green" : c);

/**
 * 產生 schemaVersion 2 的完整狀態紀錄。score 同時寫入 draftScore 與 appliedScore（FB-36）。
 * data 內其餘欄位可由 over 覆寫（淺層合併）。
 */
export function stateRecord(score = 725, over = {}) {
  const c = colorOf(score);
  const data = {
    goal: { draftScore: score, appliedScore: score, appliedColor: c, effectiveColor: effOf(c) },
    customVocab: [],
    masteredWordKeys: [],
    vocabQuiz: { answered: 0, correct: 0 },
    part5: { currentIndex: 0, lockedSelection: null, phase: "question", roundAnswered: 0, roundCorrect: 0, totalAnswered: 0, totalCorrect: 0 },
    streak: { days: 0, lastActiveDate: null },
    sttNoticeAcknowledged: false,
    todayLearned: { date: null, wordKeys: [] },
    learnedHistory: {},
    ...over,
  };
  return { schemaVersion: 2, savedAt: new Date().toISOString(), data };
}

/** 寫入狀態後重新載入（頁面須已在 file:// 來源上） */
export async function seed(p, rec) {
  await p.ev(`localStorage.setItem(${JSON.stringify(KEY)}, ${JSON.stringify(JSON.stringify(rec))})`);
  await p.reload();
}
export const readState = (p) => p.ev(`(() => { const v = localStorage.getItem(${JSON.stringify(KEY)}); return v === null ? null : JSON.parse(v); })()`);

/** 點色級卡片（真實滑鼠事件） */
export async function clickCard(p, color) { await p.click(`.cz-color[data-color="${color}"]`); await sleep(40); }
export const pressed = (p) => p.ev(`[...document.querySelectorAll(".cz-color[aria-pressed=true]")].map((b) => b.dataset.color).join(",")`);

/** 目前開啟中的確認視窗（無則 null） */
export const dialogInfo = (p) => p.ev(`(() => { const d = document.querySelector(".dialog"); if (!d) return null;
  return { title: (d.querySelector(".dialog__title") || {}).textContent || "", message: (d.querySelector(".dialog__message") || {}).textContent || "",
    buttons: [...d.querySelectorAll("button")].map((b) => b.textContent.trim()), modal: d.getAttribute("aria-modal"), role: d.getAttribute("role") }; })()`);

/**
 * 按「套用」。dialog："ok"｜"cancel"｜"esc"｜"backdrop"｜"leave"（不處理，保持開啟）。
 * 回傳 { dialog: 視窗資訊或 null }
 */
export async function apply(p, dialog = "ok") {
  await p.click("#cz-apply"); await sleep(80);
  const d = await dialogInfo(p);
  if (d && dialog !== "leave") {
    if (dialog === "ok") await p.click('.dialog [data-action="ok"]');
    else if (dialog === "cancel") await p.click('.dialog [data-action="cancel"]');
    else if (dialog === "esc") await p.key("Escape", "Escape", 27);
    else if (dialog === "backdrop") {
      // 點視窗外區域（背景遮罩左上角）
      const pt = await p.ev(`(() => { const b = document.querySelector(".dialog-backdrop"); const r = b.getBoundingClientRect(); return { x: r.left + 5, y: r.top + 5 }; })()`);
      for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) await p.send("Input.dispatchMouseEvent", { type, x: pt.x, y: pt.y, button: "left", clickCount: 1 });
    }
    await sleep(120);
  }
  return { dialog: d };
}

/** 難易度設定頁的試算與狀態（只讀可見文字） */
export const est = (p) => p.ev(`(() => { const q = (s) => document.querySelector(s); const vis = (s) => { const e = q(s); return !!e && !e.hidden && !e.closest("[hidden]") && e.getClientRects().length > 0; };
  const t = (s) => (q(s) ? q(s).textContent : null);
  return { color: t(".cz-est-color"), target: t(".cz-est-target"), daily: t(".cz-est-daily"), weeks: t(".cz-est-weeks"), mastered: t(".cz-est-mastered"),
    achieved: vis(".cz-achieved"), note: vis(".cz-note"), cap: vis(".cz-estimate .cz-warning"), statusCap: vis(".cz-status__cap"),
    stTarget: t(".cz-st-target"), stEffective: t(".cz-st-effective"),
    pressed: [...document.querySelectorAll(".cz-color[aria-pressed=true]")].map((b) => b.dataset.color).join(",") }; })()`);

/** 主控台目標區（標籤=值） */
export const dashGoal = (p) => p.ev(`[...document.querySelectorAll(".dash-stats--goal .dash-stat")].map((e) => e.querySelector(".dash-stat__label").textContent + "=" + e.querySelector(".dash-stat__value").textContent).join("｜")`);

/** 畫面上可見的分數輸入相關元素與文字（AC-26-05） */
export const scoreVisibility = (p) => p.ev(`(() => { const shown = (e) => { if (!e) return false; const s = getComputedStyle(e); if (s.display === "none" || s.visibility === "hidden" || e.closest("[hidden]")) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const sliders = [...document.querySelectorAll('input[type=range], [role=slider]')].filter(shown).length;
  const inputs = [...document.querySelectorAll('#cz-score-input, input[inputmode=numeric]')].filter(shown).length;
  const txt = document.body.innerText;
  return { sliders, inputs, rangeText: (txt.match(/\\d+\\s*[～~－-]\\s*\\d+\\s*分/g) || []), targetScore: /目標分數/.test(txt), invalidMsg: /請輸入 10～990 的分數/.test(txt) }; })()`);
