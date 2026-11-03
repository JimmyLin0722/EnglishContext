// QA 診斷（第 3 輪，不列入 run-all）：首次畫面「開始學習」在窄螢幕是否需要捲動才看得到（觀察事項，主控指示請人類決定）
// 用法：node tests/e2e/diag-start-button.mjs   結果寫入 tests/results/diag/start-button.json
import fs from "node:fs";
import path from "node:path";
import { launch, sleep, ROOT } from "./lib/cdp.mjs";

const out = [];
const p = await launch();
p.autoStart = false;
for (const [w, h] of [[375, 667], [375, 812], [390, 844], [412, 915], [768, 1024], [1366, 768]]) {
  await p.viewport(w, h);
  await p.goto(); await sleep(200);
  const r = await p.ev(`(() => { window.scrollTo(0, 0); const b = document.getElementById("cz-start"); const rr = b.getBoundingClientRect(); const cards = document.querySelector(".cz-colors").getBoundingClientRect();
    return { entry: document.body.dataset.entry, startTop: Math.round(rr.top), startBottom: Math.round(rr.bottom), vh: window.innerHeight, docH: document.documentElement.scrollHeight, visibleWithoutScroll: rr.bottom <= window.innerHeight, scrollNeeded: Math.max(0, Math.round(rr.bottom - window.innerHeight)), cardsBottom: Math.round(cards.bottom), position: getComputedStyle(b.parentElement).position }; })()`);
  out.push({ viewport: `${w}x${h}`, ...r });
  console.log(`${w}x${h}：開始學習 top ${r.startTop}／bottom ${r.startBottom}、視窗高 ${r.vh}、免捲動可見=${r.visibleWithoutScroll}、需捲動 ${r.scrollNeeded}px、頁高 ${r.docH}、按鈕區 position=${r.position}`);
}
await p.close();
const dir = path.join(ROOT, "tests", "results", "diag"); fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "start-button.json"), JSON.stringify(out, null, 2));
