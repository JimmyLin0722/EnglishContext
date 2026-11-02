// QA E2E 套件 1：目標與字庫自訂器、單字集截取、主控台目標區、持久化
// US-01、US-02、US-03、US-17（AC-17-06）、US-18（AC-18-01、AC-18-02）、AC-22-02、AC-22-04
import { launch, recorder, sleep, resultPath } from "./lib/cdp.mjs";
import { TOAST_RECORDER } from "./lib/inits.mjs";

const R = recorder("e2e-goal");
const p = await launch();
await p.addInitScript(TOAST_RECORDER);
await p.viewport(1366, 900);
p.autoStart = false; // （v0.8）TC-18-02 需先檢視首次畫面
await p.goto();

const KEY = "englishMasterTrack:state";
const est = () => p.ev(`(() => { const q = (s) => document.querySelector(s); const vis = (s) => { const e = q(s); return !!e && !e.hidden && e.getClientRects().length > 0; };
  return { color: q(".cz-est-color").textContent, target: q(".cz-est-target").textContent, daily: q(".cz-est-daily").textContent, weeks: q(".cz-est-weeks").textContent,
    mastered: q(".cz-est-mastered").textContent, achieved: vis(".cz-achieved"), note: vis(".cz-note"), cap: vis(".cz-estimate .cz-warning") || vis(".cz-warning:not(.cz-status__cap)"),
    statusCap: vis(".cz-status__cap"), target2: q(".cz-st-target").textContent, effective: q(".cz-st-effective").textContent, stScore: q(".cz-st-score").textContent,
    input: q("#cz-score-input").value, slider: q("#cz-score-range").value, error: vis("#cz-score-error") ? q("#cz-score-error").textContent : "" }; })()`);
async function setScore(v) { await p.type("#cz-score-input", String(v)); await p.key("Tab", "Tab", 9); await sleep(30); }
async function clickColor(c) { await p.click(`.cz-color[data-color="${c}"]`); await sleep(30); }
async function apply() { await p.click("#cz-apply"); await sleep(60); }
async function fcTotal() { await p.go("flashcards"); const t = await p.text(".fc-total"); return t; }
async function dash() { await p.go("dashboard"); return p.ev(`[...document.querySelectorAll(".dash-stats--goal .dash-stat")].map((e) => e.querySelector(".dash-stat__label").textContent + "=" + e.querySelector(".dash-stat__value").textContent).join("｜")`); }
async function setMastered(n) {
  // 直接寫入 localStorage 已掌握單字（排名 1～n 的 wordKey），再重新載入；用於試算 c 值
  await p.ev(`(() => { const k = ${JSON.stringify(KEY)}; let r = JSON.parse(localStorage.getItem(k));
    const keys = MASTER_VOCAB_DATABASE.slice().sort((a, b) => a.rank - b.rank).slice(0, ${n}).map((w) => w.word.normalize("NFC").trim().replace(/\\s+/g, " ").toLowerCase());
    r.data.masteredWordKeys = keys; r.data.vocabQuiz = { answered: Math.max(r.data.vocabQuiz.answered, keys.length), correct: Math.max(r.data.vocabQuiz.correct, keys.length) };
    localStorage.setItem(k, JSON.stringify(r)); })()`);
  await p.reload();
}

// ── AC-18-02：首次使用預設值 ──
await R.check("TC-18-02", "AC-18-02", async () => {
  // v0.8：空 storage 先顯示首次畫面（分數 600、選中綠），直接按「開始學習」以預設值啟動
  const stored = await p.ev(`localStorage.getItem(${JSON.stringify(KEY)})`);
  const fr = await p.ev(`({ entry: document.body.dataset.entry, input: document.getElementById("cz-score-input").value,
    pressed: [...document.querySelectorAll(".cz-color[aria-pressed=true]")].map((b) => b.dataset.color).join(","), start: !!document.getElementById("cz-start") })`);
  await p.click("#cz-start"); await sleep(350);
  p.autoStart = true;
  const d = await dash();
  const total = await fcTotal();
  const toasts = await p.ev(`window.__qaToasts.map((t) => t.text)`);
  const ok = stored === null && fr.entry === "firstRun" && fr.input === "600" && fr.pressed === "green" && fr.start
    && d.includes("目前目標分數=600") && d.includes("目前目標色級=綠") && d.includes("目前生效色級=綠") && total === "共 5620 張" && toasts.length === 0 && p.log.exceptions.length === 0;
  return { ok, note: `localStorage 初始=${stored === null ? "無" : "有"}；首次畫面 ${JSON.stringify(fr)}；按「開始學習」後 ${d}；${total}；toast=${JSON.stringify(toasts)}；例外 ${p.log.exceptions.length}` };
});

// ── AC-01-01：色級按鈕 ──
await p.go("customizer");
await R.check("TC-01-01", "AC-01-01", async () => {
  const r = await p.ev(`(() => { const bs = [...document.querySelectorAll(".cz-colors .cz-color")];
    return { order: bs.map((b) => b.dataset.color).join(","), items: bs.map((b) => ({ c: b.dataset.color, name: b.querySelector(".cz-color__name").textContent, range: b.querySelector(".cz-color__range").textContent,
      vocab: b.querySelector(".cz-color__vocab strong").textContent, note: b.querySelector(".cz-color__note").textContent, scen: b.querySelector(".cz-color__scenario").textContent,
      lock: !!b.querySelector("svg"), soon: b.textContent.includes("即將開放") })),
      bodyHasForbidden: /官方門檻|Tier\\s*[1-4]/.test(document.body.innerText) }; })()`);
  const it = Object.fromEntries(r.items.map((x) => [x.c, x]));
  const ok = r.order === "orange,brown,green,blue,gold"
    && it.orange.vocab === "1,000 字" && it.brown.vocab === "2,809 字" && it.green.vocab === "5,620 字" && it.blue.vocab === "待定" && it.gold.vocab === "待定"
    && r.items.every((x) => x.note.includes("本系統建議字量") && x.range && x.scen)
    && !it.orange.lock && !it.green.lock && it.blue.lock && it.gold.lock && it.blue.soon && it.gold.soon && !r.bodyHasForbidden
    && it.blue.range === "730～855 分" && it.gold.range === "860～990 分" && it.orange.range === "10～215 分";
  return { ok, note: r.items.map((x) => `${x.name} ${x.range} ${x.vocab}${x.lock ? " 鎖定" : ""}${x.soon ? " 即將開放" : ""}`).join("；") + `；官方門檻/Tier 字樣=${r.bodyHasForbidden}` };
});

// ── AC-02-01：滑桿與輸入框同步 ──
await R.check("TC-02-01", "AC-02-01", async () => {
  await p.ev(`(() => { const s = document.getElementById("cz-score-range"); s.value = "720"; s.dispatchEvent(new Event("input", { bubbles: true })); })()`);
  const a = await est();
  await setScore(650);
  const b = await est();
  // 以鍵盤操作滑桿（原生拖曳的等效輸入）
  await p.ev(`document.getElementById("cz-score-range").focus()`);
  await p.key("ArrowRight", "ArrowRight", 39);
  const c = await est();
  return { ok: a.input === "720" && b.slider === "650" && c.input === "655" && c.slider === "655", note: `滑桿 720 → 輸入框 ${a.input}；輸入 650 → 滑桿 ${b.slider}；鍵盤右鍵 → ${c.slider}/${c.input}` };
});

// ── AC-02-02：無效輸入 ──
await R.check("TC-02-02", "AC-02-02", async () => {
  await setScore(600);
  const base = await est();
  const out = [];
  let ok = true;
  for (const v of ["5", "995", "", "abc", "1e2", "７００"]) {
    await p.type("#cz-score-input", v);
    const e = await est();
    const good = e.error === "請輸入 10～990 的分數" && e.weeks === base.weeks && e.color === base.color && e.target === base.target;
    ok = ok && good; out.push(`「${v}」→ 提示「${e.error}」試算 ${e.color}/${e.weeks}`);
  }
  await setScore(600);
  return { ok, note: out.join("；") };
});

// ── AC-02-03、AC-02-04：每日新字量與色級 ──
{
  const scores = [10, 215, 220, 465, 470, 725, 730, 855, 860, 990];
  const daily = [], colors = [];
  for (const s of scores) { await setScore(s); const e = await est(); daily.push(e.daily); colors.push(e.color); }
  const expD = [10, 10, 10, 10, 15, 15, 20, 20, 20, 20].map((n) => n + " 字/天");
  const expC = ["橘", "橘", "棕", "棕", "綠", "綠", "藍", "藍", "金", "金"];
  R[daily.join() === expD.join() ? "pass" : "fail"]("TC-02-03", "AC-02-03", `每日新字量：${daily.join("、")}`);
  const okC = colors.every((c, i) => c.startsWith(expC[i]));
  R[okC ? "pass" : "fail"]("TC-02-04", "AC-02-04", `對應色級：${colors.join("、")}`);
}

// ── AC-02-05：預計週數（c = 0） ──
await R.check("TC-02-05a", "AC-02-05", async () => {
  const out = [];
  for (const [s, w, t] of [[100, "15 週", "1,000 字"], [300, "41 週", "2,809 字"], [600, "54 週", "5,620 字"]]) { await setScore(s); const e = await est(); out.push([s, e.weeks, e.target, e.weeks === w && e.target === t]); }
  return { ok: out.every((x) => x[3]), note: out.map((x) => `S=${x[0]} → ${x[2]}、${x[1]}`).join("；") + "（c=0；N_G=5,620 → ⌈5620/105⌉=54）" };
});

// ── AC-02-09：步進 5 ──
await R.check("TC-02-09", "AC-02-09", async () => {
  await setScore(723); const a = await est();
  await setScore(722); const b = await est();
  const step = await p.ev(`document.getElementById("cz-score-range").step`);
  await setScore(600);
  return { ok: a.input === "725" && b.input === "720" && step === "5", note: `723 → ${a.input}、722 → ${b.input}；滑桿 step=${step}` };
});

// ── AC-02-10：藍、金試算（c = 0） ──
await R.check("TC-02-10a", "AC-02-10", async () => {
  await setScore(800); const e = await est();
  const ok = e.color === "藍（即將開放）" && e.target === "待定" && e.daily === "20 字/天" && e.weeks === "41 週" && e.note && e.cap;
  return { ok, note: `色級「${e.color}」、字量「${e.target}」、${e.daily}、${e.weeks}、旁註=${e.note}、提示=${e.cap}（⌈5620/140⌉=41）` };
});

// ── AC-02-07、AC-22-04：試算更新時間 ──
await R.check("TC-02-07", "AC-02-07、AC-22-04", async () => {
  const times = await p.ev(`(async () => { const s = document.getElementById("cz-score-range"); const out = [];
    for (let i = 0; i < 10; i++) { const v = 400 + i * 40; const t0 = performance.now(); s.value = String(v); s.dispatchEvent(new Event("input", { bubbles: true }));
      const txt = document.querySelector(".cz-est-weeks").textContent; await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0))); out.push(+(performance.now() - t0).toFixed(1)); }
    return out; })()`);
  return { ok: Math.max(...times) <= 100, note: `10 次（輸入事件到繪製後）ms：${times.join("、")}；最大 ${Math.max(...times)}（無頭 Chrome、未降速；基準環境量測列人工 TC-M07）` };
});

// ── AC-01-05：點色級的分數連動 ──
await R.check("TC-01-05", "AC-01-05", async () => {
  await setScore(300); await clickColor("green"); const a = await est();
  await setScore(500); await clickColor("green"); const b = await est();
  return { ok: a.input === "470" && a.color === "綠" && a.daily === "15 字/天" && b.input === "500", note: `300 點綠 → ${a.input}（${a.color}、${a.daily}、${a.weeks}）；500 點綠 → ${b.input}` };
});

// ── AC-01-02、AC-03-01、AC-03-02、AC-03-06、AC-03-04 ──
await R.check("TC-03-06", "AC-03-06、AC-03-01、AC-03-02、AC-03-04", async () => {
  const out = [];
  for (const [c, n] of [["orange", 1000], ["brown", 2809], ["green", 5620]]) {
    await p.go("customizer"); await clickColor(c); await apply();
    const t = await fcTotal(); out.push([c, t, t === `共 ${n} 張`]);
  }
  return { ok: out.every((x) => x[2]), note: out.map((x) => `${x[0]} → ${x[1]}`).join("；") };
});

await R.check("TC-01-02", "AC-01-02", async () => {
  await p.go("customizer"); await clickColor("orange"); await apply();
  const a = await est();
  await clickColor("green"); await apply();
  const b = await est(); const t = await fcTotal();
  return { ok: a.effective === "橘" && b.effective === "綠" && t === "共 5620 張", note: `套用橘後生效 ${a.effective}；點綠套用後生效 ${b.effective}、抽認卡 ${t}` };
});

// ── AC-01-03：未套用就離開 ──
await R.check("TC-01-03", "AC-01-03", async () => {
  await p.go("customizer"); await clickColor("brown");
  await p.go("dashboard"); const d = await dash(); const t = await fcTotal();
  await p.go("customizer"); const e = await est();
  return { ok: e.effective === "綠" && t === "共 5620 張" && d.includes("目前生效色級=綠"), note: `點棕未套用後離開：生效 ${e.effective}、${t}；主控台 ${d}` };
});

// ── AC-01-06：調分數未套用 ──
await R.check("TC-01-06", "AC-01-06", async () => {
  await p.go("customizer"); await setScore(300); const e = await est(); const t = await fcTotal();
  return { ok: e.color === "棕" && e.effective === "綠" && t === "共 5620 張", note: `分數對應色級 ${e.color}；目前生效 ${e.effective}；${t}` };
});

// ── AC-01-07、AC-03-03：鎖定色級 ──
await R.check("TC-01-07", "AC-01-07、AC-03-03", async () => {
  await p.go("customizer"); await setScore(600); await clickColor("green"); await apply();
  await clickColor("blue"); const a = await est();
  await apply(); const b = await est(); const t1 = await fcTotal();
  await p.go("customizer"); await clickColor("gold"); const c = await est(); await apply(); const d = await est(); const t2 = await fcTotal();
  const ok = a.input === "730" && a.color === "藍（即將開放）" && a.cap && b.target2 === "藍" && b.effective === "綠（內建上限）" && b.statusCap && t1 === "共 5620 張"
    && c.input === "860" && d.target2 === "金" && d.effective === "綠（內建上限）" && t2 === "共 5620 張";
  return { ok, note: `點藍 → ${a.input}、「${a.color}」、提示=${a.cap}；套用後目標 ${b.target2}、生效「${b.effective}」、${t1}；點金 → ${c.input}；套用後目標 ${d.target2}、生效「${d.effective}」、${t2}` };
});

// ── AC-17-06：主控台每日新字量依生效色級 ──
await R.check("TC-17-06", "AC-17-06", async () => {
  const out = [];
  for (const s of [600, 730, 860, 300, 100]) { await p.go("customizer"); await setScore(s); await apply(); out.push(`${s}：${await dash()}`); }
  const ok = out[0].includes("目前目標分數=600") && out[0].includes("目前目標色級=綠") && out[0].includes("目前生效色級=綠") && out[0].includes("每日新字量=15 字/天")
    && out[1].includes("目前目標色級=藍") && out[1].includes("每日新字量=15 字/天") && out[2].includes("目前目標色級=金") && out[2].includes("每日新字量=15 字/天")
    && out[3].includes("每日新字量=10 字/天") && out[4].includes("每日新字量=10 字/天");
  // 入口
  await p.go("customizer"); await setScore(600); await apply();
  const entries = [];
  for (const tab of ["customizer", "flashcards", "part5", "decoder", "phrasebank", "sources"]) {
    await p.go("dashboard"); await p.click(`.dash-entry[data-go="${tab}"]`); await sleep(50);
    entries.push(`${tab}:${await p.ev(`!document.getElementById("view-${tab}").hidden`)}`);
  }
  const stats = await p.ev(`[...document.querySelectorAll(".dash-stats:not(.dash-stats--goal) .dash-stat__label")].map((e) => e.textContent).join("、")`);
  await p.go("dashboard");
  const entryLabels = await p.ev(`["customizer", "flashcards", "part5", "decoder", "phrasebank", "sources"].map((t) => { const e = document.querySelector('.dash-entry[data-go="' + t + '"]'); return e ? (e.querySelector(".dash-entry__label") || e).textContent.trim() : "無"; }).join("、")`);
  return { ok: ok && entries.every((e) => e.endsWith("true")) && stats === "連續打卡天數、單字掌握數、模擬測驗正確率" && entryLabels === "難易度設定、單字卡、模擬測驗、解碼器、句型庫、資料來源與授權", note: out.join(" ／ ") + `；入口 ${entries.join(" ")}（文字 ${entryLabels}）；統計 ${stats}` };
});

// ── AC-03-05：換色級回第 1 張正面 ──
await R.check("TC-03-05", "AC-03-05", async () => {
  await p.go("flashcards");
  for (let i = 0; i < 4; i++) await p.click(".fc-next");
  await p.click(".fc-flip");
  const before = await p.ev(`[document.querySelector(".fc-position").textContent, document.querySelector(".fc-card").dataset.flipped]`);
  await p.go("customizer"); await clickColor("orange"); await apply();
  await p.go("flashcards");
  const after = await p.ev(`[document.querySelector(".fc-position").textContent, document.querySelector(".fc-card").dataset.flipped, document.querySelector(".fc-front .fc-word").textContent]`);
  await p.go("customizer"); await clickColor("green"); await apply();
  return { ok: before[0] === "第 5 / 5620 張" && before[1] === "true" && after[0] === "第 1 / 1000 張" && after[1] === "false", note: `套用前 ${before.join("/")}；套用橘後 ${after.join("/")}` };
});

// ── AC-02-08、AC-01-04、AC-18-01（目標部分）：重新載入 ──
await R.check("TC-02-08", "AC-02-08", async () => {
  await p.go("customizer"); await setScore(735); const a = await est();
  await p.reload(); await p.go("customizer"); const b = await est();
  return { ok: b.input === "735" && b.slider === "735" && a.weeks === b.weeks && a.color === b.color, note: `重載前 ${a.input}/${a.color}/${a.weeks}；重載後 輸入框 ${b.input}、滑桿 ${b.slider}、${b.color}/${b.weeks}` };
});
await R.check("TC-01-04", "AC-01-04", async () => {
  await p.go("customizer"); await setScore(300); await apply();
  await p.reload(); await p.go("customizer"); const e = await est();
  return { ok: e.effective === "棕" && e.stScore === "300" && e.input === "300", note: `重載後 生效 ${e.effective}、目標分數 ${e.stScore}、輸入框 ${e.input}` };
});

// ── AC-02-05（c = 409）、AC-02-06、AC-02-10（c ≥ N_G） ──
await R.check("TC-02-05b", "AC-02-05", async () => {
  await setMastered(409); await p.go("customizer"); await setScore(300); const e = await est();
  return { ok: e.weeks === "35 週" && e.mastered === "409 字", note: `c=${e.mastered}、S=300 → ${e.weeks}（預期 35 週）` };
});
await R.check("TC-02-06", "AC-02-06", async () => {
  await setMastered(1000); await p.go("customizer"); await setScore(100); const e = await est();
  return { ok: e.weeks === "0 週" && e.achieved, note: `c=${e.mastered}、S=100 → ${e.weeks}、顯示「已達成目標字量」=${e.achieved}` };
});
await R.check("TC-02-10b", "AC-02-10", async () => {
  await setMastered(5620); await p.go("customizer"); await setScore(800); const e = await est();
  return { ok: e.weeks === "0 週" && !/-/.test(e.weeks), note: `c=${e.mastered}、S=800 → ${e.weeks}` };
});

// ── AC-22-02：最大單字集套用時間 ──
await R.check("TC-22-02", "AC-22-02", async () => {
  await p.ev(`localStorage.clear()`); await p.reload();
  await p.go("customizer");
  for (const t of ["cs", "business", "biostat"]) { await p.click(`[data-template="${t}"]`); await sleep(80); }
  const t0 = await fcTotal();
  await p.go("customizer");
  const times = await p.ev(`(async () => { const out = []; const btn = document.getElementById("cz-apply");
    for (let i = 0; i < 10; i++) { document.querySelector('.cz-color[data-color="' + (i % 2 ? "green" : "orange") + '"]').click();
      const t = performance.now(); btn.click(); await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0))); out.push(+(performance.now() - t).toFixed(1)); }
    return out; })()`);
  // 切到抽認卡頁時的繪製（單字集已更新）
  const t1 = await fcTotal();
  return { ok: Math.max(...times) <= 100 && t1 === "共 5650 張" && t0 === "共 5650 張", note: `單字集 ${t1}；10 次套用（含 toast 與繪製）ms：${times.join("、")}；最大 ${Math.max(...times)}（無頭 Chrome、未降速）` };
});

await R.check("TC-X-goal", "（全套件）無未處理例外", async () => ({ ok: p.log.exceptions.length === 0, note: `例外：${JSON.stringify(p.log.exceptions).slice(0, 400)}；console.error：${JSON.stringify(p.log.console.filter((c) => c.type === "error")).slice(0, 300)}` }));

R.save(resultPath("e2e-goal"));
await p.close();
