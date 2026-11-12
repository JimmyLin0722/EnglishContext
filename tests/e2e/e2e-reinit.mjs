// QA E2E 套件 11（第 3 輪新增，PRD v0.9 US-32、v0.10 改寫）：切換難易度時確認並初始化學習紀錄（AC-32-01～AC-32-11）
// 另：AC-31-03（減少動態下確認視窗直接出現）、FB-35 觀察（取消後重新整理的選中卡片）。
// 依據：契約 v0.10 §5.7 CI-1～CI-10、§5.9 GS-1～GS-8、FB-35、FB-36；architecture v0.6 §7.15、§10.2、§10.3。
// 第 5 輪（PRD v0.13）：主控台改讀今日任務卡目標行與 3 格數據；AC-32-02 v0.12 改寫（近 7 天空狀態、「單字掌握率 0% 且已掌握 0 字」）；匯入前先展開「資料備份」
import fs from "node:fs";
import path from "node:path";
import { launch, recorder, sleep, resultPath } from "./lib/cdp.mjs";
import { TOAST_RECORDER, fakeTts, fakeStt, fakeMic, storageMode, micOnStrict } from "./lib/inits.mjs";
import { KEY, stateRecord, seed, readState, clickCard, apply, est, dashGoal, dialogInfo, todayYmd, addDays, GOAL_LINE, expandBackup } from "./lib/state.mjs";

const R = recorder("e2e-reinit");
const TMP = process.env.QA_TMP || path.resolve("tests/results/tmp");
fs.mkdirSync(TMP, { recursive: true });
const TODAY = todayYmd();
const PAGES = [];
// 第 7 輪（PRD v0.15 AC-32-02、Q-67 A）：學習進度紀錄加 (7) 模擬測驗答對紀錄
const LEARN = ["masteredWordKeys", "vocabQuiz", "part5", "streak", "todayLearned", "learnedHistory", "part5CorrectIds"];
const pick = (d, ks) => Object.fromEntries(ks.map((k) => [k, d[k]]));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

async function open(inits = [], vp = [1366, 900]) {
  const p = await launch(); PAGES.push(p);
  await p.addInitScript(TOAST_RECORDER);
  for (const s of [fakeTts("ok"), fakeStt("ok"), fakeMic("ok"), ...inits]) await p.addInitScript(s);
  await p.viewport(vp[0], vp[1]);
  await p.send("Page.setInterceptFileChooserDialog", { enabled: true });
  p.chooser = null;
  p.onEvent((m) => { if (m.method === "Page.fileChooserOpened") p.chooser = m.params; });
  return p;
}
const cv = (id, word, meaning) => ({ id, word, meaning, phonetic: "", pos: "n.", collocation: "", example: "", academicContext: "", origin: "manual", templateId: null, createdAt: "2026-11-01T08:00:00.000Z" });
const CUSTOM = [cv("c_qa_mon", "monetization", "營利化"), cv("c_qa_a", "qareinitalpha", "測試甲"), cv("c_qa_b", "qareinitbeta", "測試乙")];
/** 有學習紀錄的既有狀態：600（綠，v0.9 以前留下的分數）、已掌握 5 字（含 monetization）、模擬測驗 10 題對 7、打卡 3 天、今日已學 3 字 */
function withRecords(score = 600) {
  return stateRecord(score, {
    customVocab: CUSTOM,
    masteredWordKeys: ["the", "of", "and", "to", "monetization"],
    vocabQuiz: { answered: 6, correct: 5 },
    part5: { currentIndex: 10, lockedSelection: null, phase: "question", roundAnswered: 10, roundCorrect: 7, totalAnswered: 10, totalCorrect: 7 },
    streak: { days: 3, lastActiveDate: TODAY },
    part5CorrectIds: ["p5-001", "p5-003", "p5-007"], // 第 7 輪：答對紀錄（初始化時清空）
    sttNoticeAcknowledged: true,
    todayLearned: { date: TODAY, wordKeys: ["the", "of", "monetization"] },
    learnedHistory: { [addDays(TODAY, -2)]: 4, [addDays(TODAY, -1)]: 6, [TODAY]: 3 },
  });
}
const progress = (p) => p.ev(`(() => { EMT.router.go("dashboard"); const q = (s) => document.querySelector("#view-dashboard " + s); const tx = (s) => (q(s) ? q(s).textContent : "");
  const shown = (e) => !!e && !e.hidden && e.getClientRects().length > 0;
  return { today: tx(".db-today__text"), bars: [...document.querySelectorAll("#view-dashboard .db-bars__item")].map((b) => Number(b.querySelector(".db-bars__count").textContent)).join(","),
    empty: shown(q(".db-chart__empty")) ? tx(".db-chart__empty") : "", barsShown: shown(q(".db-bars")),
    stats: [tx(".db-stat--streak .db-stat__num") + " " + tx(".db-stat--streak .db-stat__unit"), tx(".db-stat--mastery .db-stat__value"), tx(".db-stat--mastery .db-stat__sub"), tx(".db-stat--answered .db-stat__value")].join("｜") }; })()`);
const fcPos = (p) => p.ev(`(() => { EMT.router.go("flashcards"); return [document.querySelector(".fc-position").textContent, document.querySelector(".fc-card") ? document.querySelector(".fc-card").dataset.flipped : null]; })()`);
const p5Pos = (p) => p.ev(`(() => { EMT.router.go("part5"); const n = document.querySelector("[data-p5=number]"); return [n ? n.textContent : "", [...document.querySelectorAll("[data-p5=option]")].every((b) => !b.disabled)]; })()`);
async function freshDefaults() {
  // 「清除網站資料後在首次畫面按開始學習」所得的 6 欄值（AC-32-02 比對基準）
  const q = await open(); q.autoStart = false;
  await q.goto(); await q.click("#cz-start"); await sleep(400);
  const d = (await readState(q)).data; await q.close();
  return pick(d, LEARN);
}
const DEFAULTS = await freshDefaults();

// ═════════ AC-32-01、AC-32-02、AC-32-03、AC-32-10 ═════════
{
  const p = await open();
  await p.goto(); await seed(p, withRecords());
  // 單字卡先停在第 6 張
  await p.ev(`EMT.store.actions.gotoCard(5)`); await sleep(50);
  const s0 = await readState(p);
  const keys0 = await p.ev(`Object.keys(localStorage).sort().join(",")`);
  await p.go("customizer"); await sleep(200);
  let dlg = null, during = null, beforeApply = null;
  await R.check("TC-32-01", "AC-32-01", async () => {
    await clickCard(p, "brown");
    beforeApply = await p.ev(`localStorage.getItem(${JSON.stringify(KEY)})`);
    const n0 = await p.ev(`EMT.store.getState().runtime.studySet.length`);
    const r = await apply(p, "leave"); dlg = r.dialog;
    // 背景不可操作：以真實滑鼠點導覽列「單字卡」與色級卡片
    const tab0 = await p.ev(`EMT.router.current()`);
    const pt = await p.ev(`(() => { const b = document.querySelector('#app-nav [data-tab="flashcards"]'); const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, hit: document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === b }; })()`);
    for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) await p.send("Input.dispatchMouseEvent", { type, x: pt.x, y: pt.y, button: "left", clickCount: 1 });
    await sleep(100);
    const tab1 = await p.ev(`EMT.router.current()`); const stillOpen = !!(await dialogInfo(p));
    during = { eff: await p.ev(`EMT.store.getState().data.goal.effectiveColor`), n: await p.ev(`EMT.store.getState().runtime.studySet.length`), ls: await p.ev(`localStorage.getItem(${JSON.stringify(KEY)})`), st: await p.ev(`document.getElementById("cz-st-line").textContent.replace("目前色級：", "")`) /* 第 6 輪：AC-01-08 */ };
    const msgOk = !!dlg && dlg.message.includes("目前已有學習統計資料，切換難易度將初始化學習紀錄") && dlg.message.includes("建議先按「取消」，到「群島」頁按「匯出備份」保存目前紀錄");
    const ok = msgOk && dlg.buttons.length === 2 && dlg.buttons.includes("確定") && dlg.buttons.includes("取消") && dlg.modal === "true" && !pt.hit && tab1 === tab0 && stillOpen
      && during.eff === "green" && during.st === "綠" && during.n === n0 && during.ls === beforeApply;
    return { ok, note: `視窗標題「${dlg && dlg.title}」內文「${dlg && dlg.message.replace(/\n/g, "⏎")}」按鈕 ${JSON.stringify(dlg && dlg.buttons)}、aria-modal=${dlg && dlg.modal}；點背景導覽「單字卡」命中=${pt.hit}、頁面 ${tab0}→${tab1}、視窗仍開=${stillOpen}；視窗開啟中生效 ${during.eff}/${during.st}、單字集 ${during.n}（前 ${n0}）、localStorage 與按套用前相同=${during.ls === beforeApply}` };
  });
  await R.check("TC-32-02", "AC-32-02", async () => {
    await p.click('.dialog [data-action="ok"]'); await sleep(250);
    const closed = !(await dialogInfo(p));
    const st = await readState(p);
    const e = await est(p);
    const fc = await fcPos(p);
    const pr = await progress(p); const g = await dashGoal(p);
    const p5 = await p5Pos(p);
    await p.reload();
    const pr2 = await progress(p); const st2 = await readState(p); const fc2 = await fcPos(p); const p52 = await p5Pos(p);
    const backup = JSON.parse(await p.ev(`EMT.store.actions.exportBackup().json`)).data;
    const ok = closed && st.data.goal.appliedScore === 465 && st.data.goal.appliedColor === "brown" && st.data.goal.effectiveColor === "brown" && g === GOAL_LINE.brown
      && fc[0] === "第 1 / 2812 張" && fc[1] === "false" && e.mastered === "0 字" && e.weeks === "41 週"
      && pr.today === "今日已學 0 / 10 字" && pr.bars === "0,0,0,0,0,0,0" && pr.empty === "開始學習後會顯示紀錄" && !pr.barsShown && pr.stats === "0 天｜0%｜已掌握 0 字｜已答對 0 / 200 題（0%）"
      && p5[0].startsWith("第 1 /") && p5[1] && same(pr, pr2) && same(st.data, st2.data) && fc2[0] === "第 1 / 2812 張" && p52[0].startsWith("第 1 /")
      && same(pick(backup, LEARN), DEFAULTS);
    return { ok, note: `確定後視窗關閉=${closed}；localStorage goal ${JSON.stringify(st.data.goal)}；主控台 ${g}、${pr.today}、長條 ${pr.bars}、近 7 天「${pr.empty}」、3 格 ${pr.stats}；試算 c=${e.mastered}、棕 ${e.weeks}；單字卡 ${fc.join("/")}；模擬測驗 ${p5[0]}（未作答=${p5[1]}）；重新載入後相同=${same(pr, pr2) && same(st.data, st2.data)}；匯出備份 7 欄（第 7 輪含答對紀錄）${JSON.stringify(pick(backup, LEARN))} 與首次啟動預設相同=${same(pick(backup, LEARN), DEFAULTS)}` };
  });
  await R.check("TC-32-03", "AC-32-03", async () => {
    const st = await readState(p);
    const n = await p.ev(`EMT.store.getState().runtime.studySet.length`);
    const words = await p.ev(`EMT.store.getState().runtime.studySet.slice(-5).map((c) => c.word || (c.item && c.item.word))`);
    // 回到單字卡頁按麥克風：不再顯示 STT 說明
    // 第 10 輪（v0.20 US-58）：先準備中，替身 audiostart 或 T_FALLBACK 後才聆聽中（micOnStrict 未經準備中即拋出）
    await p.go("flashcards"); let seq = ""; try { seq = (await micOnStrict(p)).seq.join("→"); } catch (e) { seq = "失敗：" + e.message; }
    const notice = !!(await dialogInfo(p)); const status = await p.ev(`document.querySelector(".fc-front .sp-mic").dataset.status`);
    await p.click(".fc-front .sp-mic"); await sleep(100);
    const ok = same(st.data.customVocab, CUSTOM) && n === 2809 + 3 && !st.data.masteredWordKeys.includes("monetization") && st.data.masteredWordKeys.length === 0 && st.data.sttNoticeAcknowledged === true && !notice && status === "listening" && /^preparing→listening/.test(seq);
    return { ok, note: `自訂單字與確定前完全相同=${same(st.data.customVocab, CUSTOM)}（${st.data.customVocab.map((c) => c.word).join("、")}）；單字集 ${n} = 2,809 + 3；monetization 仍計入掌握=${st.data.masteredWordKeys.includes("monetization")}；STT 已讀保留=${st.data.sttNoticeAcknowledged}、按麥克風出現說明=${notice}、狀態 ${status}（序列 ${seq}）` };
  });
  await R.check("TC-32-10", "AC-32-10", async () => {
    const s1 = await readState(p);
    const keys1 = await p.ev(`Object.keys(localStorage).sort().join(",")`);
    const reqs = p.log.requests.filter((r) => !r.url.startsWith("file:") && !/^(blob|data):/.test(r.url));
    const ok = s0.schemaVersion === 3 && s1.schemaVersion === 3 && keys0 === keys1 && same(Object.keys(s0.data).sort(), Object.keys(s1.data).sort()) && same(Object.keys(s0.data.goal).sort(), Object.keys(s1.data.goal).sort())
      && same(s0.data.customVocab, s1.data.customVocab) && reqs.length === 0;
    return { ok, note: `schemaVersion ${s0.schemaVersion}→${s1.schemaVersion}；localStorage 鍵 [${keys0}]→[${keys1}]；data 欄位 ${Object.keys(s1.data).length} 個相同；goal 欄位相同；自訂單字相同；網路請求 ${reqs.length}` };
  });
  await p.close();
}

// ═════════ AC-32-04：取消／Esc／點視窗外；FB-35 觀察 ═════════
{
  const p = await open();
  await p.goto();
  const out = []; let ok = true; let obs = "";
  for (const how of ["cancel", "esc", "backdrop"]) {
    await seed(p, withRecords());
    await p.ev(`EMT.store.actions.gotoCard(7)`); await sleep(50);
    const s0 = await readState(p); const fc0 = await fcPos(p); const n0 = await p.ev(`EMT.store.getState().runtime.studySet.length`);
    await p.go("customizer"); await sleep(150);
    await clickCard(p, "brown");
    const beforeApply = await p.ev(`localStorage.getItem(${JSON.stringify(KEY)})`);
    const r = await apply(p, how);
    const closed = !(await dialogInfo(p));
    const e = await est(p); const mem = await p.ev(`EMT.store.getState().data`); const after = await p.ev(`localStorage.getItem(${JSON.stringify(KEY)})`); const s1 = JSON.parse(after);
    const fc1 = await fcPos(p); const n1 = await p.ev(`EMT.store.getState().runtime.studySet.length`);
    const good = !!r.dialog && closed && e.pressed === "green" && e.daily === "15 字/天" && e.color === "綠" && mem.goal.draftScore === 600 && s1.data.goal.appliedScore === 600 && mem.goal.effectiveColor === "green"
      && e.stEffective === "綠" && n1 === n0 && same(fc0, fc1) && same(pick(mem, LEARN), pick(s0.data, LEARN)) && same(mem.customVocab, s0.data.customVocab) && after === beforeApply;
    ok = ok && good;
    out.push(`${how}：視窗關閉=${closed}、選中 ${e.pressed}、試算 ${e.color}/${e.daily}、記憶體 draftScore ${mem.goal.draftScore}、localStorage appliedScore ${s1.data.goal.appliedScore}（draftScore ${s1.data.goal.draftScore}）、生效 ${e.stEffective}、單字卡 ${fc1[0]}、學習紀錄不變=${same(pick(mem, LEARN), pick(s0.data, LEARN))}、localStorage 與按套用前相同=${after === beforeApply}`);
    if (how === "cancel") {
      // FB-35 觀察：取消後、任何寫入前重新整理
      await p.reload(); await p.go("customizer"); await sleep(200);
      const e2 = await est(p); const g2 = (await readState(p)).data.goal;
      obs = `取消後重新整理：選中 ${e2.pressed}、試算每日新字量 ${e2.daily}、生效 ${e2.stEffective}、localStorage draftScore ${g2.draftScore}／appliedScore ${g2.appliedScore}`;
    }
  }
  R[ok ? "pass" : "fail"]("TC-32-04", "AC-32-04", out.join("；"));
  R.pass("TC-32-04obs", "AC-32-04（觀察：FB-35）", obs + "（不違反 AC：AC-32-04 只規範取消當下；重新整理後選中卡片依 draftScore，屬 AC-01-03「未套用」語意，契約 FB-35、SD T-43；列觀察事項）");
  await p.close();
}

// ═════════ AC-32-05、AC-32-06、AC-32-07 ═════════
{
  const p = await open();
  await p.goto();
  await R.check("TC-32-05", "AC-32-05", async () => {
    await seed(p, withRecords());
    const s0 = await readState(p);
    const out = []; let ok = true;
    for (const [c, sc, tgt, eff] of [["green", 725, "綠", "綠"], ["blue", 855, "藍", "綠（內建上限）"], ["gold", 990, "金", "綠（內建上限）"], ["green", 725, "綠", "綠"]]) {
      await p.go("customizer"); await clickCard(p, c); const r = await apply(p, "leave"); const sl = (await est(p)).stLine; // 第 6 輪：AC-32-05 狀態列皆「目前色級：綠」（AC-01-08）
      const st = await readState(p); await p.go("dashboard"); await sleep(150); const d = await dashGoal(p);
      const good = !r.dialog && st.data.goal.appliedScore === sc && same(pick(st.data, LEARN), pick(s0.data, LEARN)) && d === GOAL_LINE[c] && sl === "目前色級：綠";
      ok = ok && good; out.push(`${c}：視窗=${!!r.dialog}、localStorage ${st.data.goal.appliedScore}、狀態列「${sl}」、${d}、學習紀錄不變=${same(pick(st.data, LEARN), pick(s0.data, LEARN))}`);
      if (r.dialog) await p.click('.dialog [data-action="cancel"]');
    }
    return { ok, note: out.join("；") };
  });
  await R.check("TC-32-06", "AC-32-06", async () => {
    await p.ev(`localStorage.clear()`); p.autoStart = false; await p.reload(); await p.click("#cz-start"); await sleep(400); p.autoStart = true;
    await p.go("flashcards"); for (let i = 0; i < 3; i++) { await p.click(".fc-next"); await sleep(200); }
    await p.go("customizer"); await clickCard(p, "brown"); const r = await apply(p, "leave");
    const st = await readState(p);
    if (r.dialog) await p.click('.dialog [data-action="cancel"]');
    return { ok: !r.dialog && st.data.goal.appliedScore === 465 && st.data.goal.effectiveColor === "brown", note: `首次預設 725 綠、只用「下一張」瀏覽 3 次 → 點棕套用：確認視窗=${!!r.dialog}、localStorage ${st.data.goal.appliedScore}/${st.data.goal.effectiveColor}` };
  });
  await R.check("TC-32-07", "AC-32-07", async () => {
    const base = stateRecord(725);
    const cases = [
      ["(a) 已掌握 1 字", { masteredWordKeys: ["the"] }],
      ["(b) 四選一答題 1", { vocabQuiz: { answered: 1, correct: 0 } }],
      ["(c) 模擬測驗答題 1", { part5: { currentIndex: 1, lockedSelection: null, phase: "question", roundAnswered: 1, roundCorrect: 0, totalAnswered: 1, totalCorrect: 0 } }],
      ["(d) 今日已學 1", { todayLearned: { date: TODAY, wordKeys: ["the"] } }],
      ["(e) 近 30 天歷史（昨天 3 字）", { learnedHistory: { [addDays(TODAY, -1)]: 3 } }],
      ["(f) 打卡紀錄", { streak: { days: 1, lastActiveDate: addDays(TODAY, -1) } }],
    ];
    const out = []; let ok = true;
    for (const [k, over] of cases) {
      await seed(p, { ...base, data: { ...base.data, ...over } });
      await p.go("customizer"); await clickCard(p, "brown"); const r = await apply(p, "cancel");
      ok = ok && !!r.dialog; out.push(`${k}：視窗=${!!r.dialog}`);
    }
    return { ok, note: out.join("；") };
  });
  await p.close();
}

// ═════════ AC-32-08：首次畫面與匯入不跳視窗 ═════════
{
  const p = await open();
  p.autoStart = false;
  await p.goto();
  await R.check("TC-32-08", "AC-32-08", async () => {
    // (a) 首次畫面選藍按「開始學習」
    await clickCard(p, "blue"); await p.click("#cz-start"); await sleep(400);
    const a = { dialog: !!(await dialogInfo(p)), entry: await p.ev(`document.body.dataset.entry`), g: (await readState(p)).data.goal };
    p.autoStart = true;
    // (b) 主控台已有學習紀錄，匯入生效色級不同（棕）的備份
    await seed(p, withRecords(725));
    const b0 = stateRecord(300, { masteredWordKeys: ["the", "of"], vocabQuiz: { answered: 2, correct: 2 }, streak: { days: 1, lastActiveDate: TODAY }, todayLearned: { date: TODAY, wordKeys: ["the", "of"] }, learnedHistory: { [TODAY]: 2 } });
    const backup = { format: "english-master-track-backup", schemaVersion: 3, exportedAt: new Date().toISOString(), data: b0.data }; // 第 7 輪：stateRecord 改產生 v3（12 欄）
    const ref = JSON.parse(await p.ev(`EMT.store.actions.exportBackup().json`));
    for (const k of Object.keys(ref)) if (!(k in backup)) backup[k] = ref[k];
    const f = path.join(TMP, "reinit-import-" + Date.now() + ".json"); fs.writeFileSync(f, JSON.stringify(backup));
    await p.go("dashboard"); await sleep(300); await expandBackup(p); p.chooser = null; await p.click('[data-action="import-backup"]');
    for (let i = 0; i < 40 && !p.chooser; i++) await sleep(50);
    await p.send("DOM.setFileInputFiles", { files: [f], backendNodeId: p.chooser.backendNodeId }); await sleep(300);
    const d1 = await dialogInfo(p);
    await p.click('.dialog [data-action="ok"]'); await sleep(400);
    const d2 = await dialogInfo(p);
    const st = await readState(p);
    const ok = !a.dialog && a.entry === "main" && a.g.appliedScore === 855 && !!d1 && d1.message.includes("匯入將覆蓋目前所有進度") && !/初始化學習紀錄/.test(d1.message) && !d2
      && st.data.goal.effectiveColor === "brown" && st.data.goal.appliedScore === 300 && same(st.data.masteredWordKeys, ["the", "of"]) && st.data.vocabQuiz.answered === 2 && same(st.data.todayLearned, b0.data.todayLearned);
    return { ok, note: `(a) 首次畫面點藍「開始學習」：確認視窗=${a.dialog}、${a.entry}、goal ${JSON.stringify(a.g)}；(b) 有紀錄時匯入棕色備份：匯入確認框「${d1 && d1.message.replace(/\n/g, " ")}」、之後無初始化視窗=${!d2}；匯入後 goal ${JSON.stringify(st.data.goal)}、已掌握 ${JSON.stringify(st.data.masteredWordKeys)}、四選一 ${JSON.stringify(st.data.vocabQuiz)}（依備份內容，未另外清除）。首次畫面「從備份還原」不跳視窗見 TC-25-10` };
  });
  await p.close();
}

// ═════════ AC-32-09：初始化後重新計數 ═════════
{
  const p = await open();
  await p.goto();
  await R.check("TC-32-09", "AC-32-09", async () => {
    await seed(p, withRecords());
    await p.go("customizer"); await clickCard(p, "brown"); await apply(p, "ok");
    const pr0 = await progress(p);
    // 單字 A = the（排名 1，在棕色單字集中）翻到背面
    await p.go("flashcards"); await p.ev(`EMT.store.actions.gotoCard(0)`); await sleep(50);
    const w = await p.ev(`document.querySelector(".fc-front .fc-word").textContent`);
    await p.click(".fc-flip"); await sleep(450);
    const pr = await progress(p); const st = await readState(p);
    const ok = w.toLowerCase() === "the" && pr0.today === "今日已學 0 / 10 字" && pr.today === "今日已學 1 / 10 字" && pr.bars.split(",")[6] === "1" && st.data.streak.days === 1 && st.data.learnedHistory[TODAY] === 1 && pr.stats.startsWith("1 天");
    return { ok, note: `初始化後 ${pr0.today}；再翻 ${w} → ${pr.today}、長條今天 ${pr.bars.split(",")[6]}、連續打卡 ${st.data.streak.days}、統計 ${pr.stats}` };
  });
  await p.close();
}

// ═════════ AC-32-11：(a) localStorage 停用、(b) 寫入失敗 ═════════
{
  const p = await open([storageMode("disabled")]);
  await p.goto();
  await R.check("TC-32-11a", "AC-32-11（a）", async () => {
    await p.go("flashcards"); await p.click(".fc-flip"); await sleep(450); // 產生學習紀錄（記憶體）
    const x0 = (await progress(p)).today;
    await p.go("customizer"); await clickCard(p, "brown"); const r = await apply(p, "ok");
    const pr = await progress(p); const g = await dashGoal(p); const banner = await p.ev(`document.getElementById("app-banner").innerText`);
    const t = await p.ev(`window.__qaToasts.map((x) => x.text)`);
    const ok = !!r.dialog && x0 === "今日已學 1 / 15 字" && pr.today === "今日已學 0 / 10 字" && g === GOAL_LINE.brown && banner.includes("進度將無法保存") && !t.includes("儲存空間不足，未套用") && p.log.exceptions.length === 0;
    return { ok, note: `停用時：翻卡後 ${x0} → 確認視窗=${!!r.dialog} 按確定 → ${pr.today}、${g}；警示「${banner.trim()}」；toast ${JSON.stringify(t.slice(-2))}；例外 ${p.log.exceptions.length}` };
  });
  await p.close();
}
{
  const p = await open([storageMode("quota")]);
  await p.goto();
  await p.ev(`window.__qaQuota = false`);
  await R.check("TC-32-11b", "AC-32-11（b）", async () => {
    await seed(p, withRecords());
    const pr0 = await progress(p); const mem0 = await p.ev(`JSON.stringify(EMT.store.getState().data)`);
    await p.go("customizer"); await clickCard(p, "brown");
    const before = await p.ev(`localStorage.getItem(${JSON.stringify(KEY)})`);
    await p.ev(`window.__qaQuota = true`);
    const n = await p.ev(`window.__qaToasts.length`);
    const r = await apply(p, "ok");
    const t = await p.ev(`window.__qaToasts.slice(${n}).map((x) => x.text)`);
    const after = await p.ev(`localStorage.getItem(${JSON.stringify(KEY)})`);
    const e = await est(p); const mem = await p.ev(`EMT.store.getState().data`);
    await p.ev(`window.__qaQuota = false`);
    const pr = await progress(p); const g = await dashGoal(p);
    const memLearn = same(pick(mem, LEARN), pick(JSON.parse(mem0), LEARN));
    const ok = !!r.dialog && t.includes("儲存空間不足，未套用") && before === after && e.pressed === "green" && e.stEffective === "綠" && mem.goal.effectiveColor === "green" && mem.goal.appliedScore === 600 && memLearn
      && same(pr, pr0) && g === GOAL_LINE.green && p.log.exceptions.length === 0;
    return { ok, note: `寫入拋 QuotaExceededError 時按確定：toast ${JSON.stringify(t)}；localStorage 不變=${before === after}；畫面選中 ${e.pressed}、生效 ${e.stEffective}；記憶體 goal ${JSON.stringify(mem.goal)}、學習紀錄不變=${memLearn}；主控台與套用前相同=${same(pr, pr0)}（${pr.today}）；例外 ${p.log.exceptions.length}` };
  });
  await p.close();
}

// ═════════ AC-31-03：減少動態下確認視窗直接出現 ═════════
{
  const p = await open();
  await p.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await p.goto(); await seed(p, withRecords());
  await R.check("TC-31-03d", "AC-31-03（初始化確認視窗）", async () => {
    await p.go("customizer"); await clickCard(p, "brown");
    await p.click("#cz-apply");
    const s = await p.ev(`(() => { const out = []; for (const sel of [".dialog-backdrop", ".dialog"]) { const e = document.querySelector(sel); if (!e) { out.push(sel + ":無"); continue; } const c = getComputedStyle(e); out.push({ sel, anim: c.animationName, ad: c.animationDuration, td: c.transitionDuration, op: c.opacity }); } return out; })()`);
    await p.click('.dialog [data-action="cancel"]');
    const ok = s.every((x) => typeof x === "object" && (x.anim === "none" || /^0s/.test(x.ad)) && x.td.split(",").every((v) => /^0s/.test(v.trim())) && x.op === "1");
    return { ok, note: `prefers-reduced-motion: reduce 下視窗出現當下（無等待）樣式 ${JSON.stringify(s)}` };
  });
  await p.close();
}

{
  const ex = PAGES.flatMap((x) => x.log.exceptions); const ce = PAGES.flatMap((x) => x.log.console.filter((c) => c.type === "error").map((c) => c.text));
  R[ex.length === 0 ? "pass" : "fail"]("TC-X-reinit", "（全套件）無未處理例外", `例外 ${JSON.stringify(ex).slice(0, 400)}；console.error ${JSON.stringify(ce).slice(0, 300)}`);
}
for (const p of PAGES) await p.close();
R.save(resultPath("e2e-reinit"));
