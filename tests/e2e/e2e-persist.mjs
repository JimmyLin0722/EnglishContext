// QA E2E 套件 6：AC-18-01 關閉後重新開啟，全部資料還原
import { launch, recorder, sleep, resultPath } from "./lib/cdp.mjs";
import { TOAST_RECORDER, fakeTts, fakeStt } from "./lib/inits.mjs";

const R = recorder("e2e-persist");
const p = await launch();
await p.addInitScript(TOAST_RECORDER); await p.addInitScript(fakeTts("ok")); await p.addInitScript(fakeStt("ok"));
await p.viewport(1366, 900);
await p.goto();

await R.check("TC-18-01", "AC-18-01", async () => {
  await p.go("customizer"); await p.type("#cz-score-input", "455"); await p.click("#cz-apply");
  await p.type("#cv-word", "qapersist"); await p.type("#cv-meaning", "持久化"); await p.click('.cv-form button[type="submit"]'); await sleep(60);
  await p.go("part5"); await p.click("[data-p5=option]", 0); await p.click("[data-p5=next]"); await p.click("[data-p5=option]", 2);
  await p.go("flashcards"); await p.click(".fc-flip");
  await p.ev(`EMT.store.actions.acknowledgeSttNotice()`);
  const before = await p.ev(`JSON.stringify(EMT.store.getState().data)`);
  const viewBefore = await p.ev(`(() => { EMT.router.go("dashboard"); return document.querySelector(".dashboard").innerText; })()`);
  // 關閉分頁（導離本檔）後重新開啟同一檔案
  await p.goto("about:blank", { waitReady: false }); await sleep(500);
  await p.goto();
  const after = await p.ev(`JSON.stringify(EMT.store.getState().data)`);
  const viewAfter = await p.ev(`(() => { EMT.router.go("dashboard"); return document.querySelector(".dashboard").innerText; })()`);
  await p.go("part5"); const q = await p.text("[data-p5=number]"); const locked = await p.ev(`[...document.querySelectorAll("[data-p5=option]")].every((b) => b.disabled)`);
  const d = JSON.parse(after);
  return { ok: before === after && viewBefore === viewAfter && d.goal.appliedScore === 455 && d.goal.effectiveColor === "brown" && d.customVocab.length === 1 && d.part5.totalAnswered === 2 && d.streak.days === 1 && q === "第 2 / 200 題" && locked,
    note: `重新開啟後資料完全相同=${before === after}；主控台畫面相同=${viewBefore === viewAfter}；目標 ${d.goal.appliedScore}/${d.goal.effectiveColor}、自訂 ${d.customVocab.length}、Part 5 ${d.part5.totalAnswered}/${d.part5.totalCorrect}（${q}、已作答鎖定=${locked}）、打卡 ${d.streak.days} 天、STT 已讀 ${d.sttNoticeAcknowledged}` };
});
R.save(resultPath("e2e-persist"));
await p.close();
