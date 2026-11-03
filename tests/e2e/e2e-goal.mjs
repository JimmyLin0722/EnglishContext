// QA E2E 套件 1（第 3 輪改寫，PRD v0.10）：難易度設定（只選色級、不顯示分數）、單字集截取、主控台目標區、目標持久化
// US-01、US-02、US-03、AC-17-06、AC-18-02、AC-22-02、AC-22-04、AC-26-06
// v0.10 依 R-19：分數滑桿與輸入框隱藏，一律以點卡片設定（該色上限），目標分數以 localStorage 驗證，不從畫面讀取。
import { launch, recorder, sleep, resultPath } from "./lib/cdp.mjs";
import { TOAST_RECORDER } from "./lib/inits.mjs";
import { KEY, CAP, NAME, stateRecord, seed, readState, clickCard, apply, est, dashGoal, dialogInfo } from "./lib/state.mjs";

const R = recorder("e2e-goal");
const p = await launch();
await p.addInitScript(TOAST_RECORDER);
await p.viewport(1366, 900);
p.autoStart = false; // TC-18-02 需先檢視首次畫面
await p.goto();

const applied = async () => { const s = await readState(p); return s && s.data.goal; };
async function fcTotal() { await p.go("flashcards"); return p.text(".fc-total"); }
async function dash() { await p.go("dashboard"); return dashGoal(p); }
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor((s.length - 1) / 2)]; };
const p90 = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.ceil(s.length * 0.9) - 1)]; };
async function setMastered(n) {
  // 直接寫入 localStorage 已掌握單字（排名 1～n 的 wordKey）後重新載入；用於試算 c 值
  await p.ev(`(() => { const k = ${JSON.stringify(KEY)}; let r = JSON.parse(localStorage.getItem(k));
    const keys = MASTER_VOCAB_DATABASE.slice().sort((a, b) => a.rank - b.rank).slice(0, ${n}).map((w) => w.word.normalize("NFC").trim().replace(/\\s+/g, " ").toLowerCase());
    r.data.masteredWordKeys = keys; r.data.vocabQuiz = { answered: Math.max(r.data.vocabQuiz.answered, keys.length), correct: Math.max(r.data.vocabQuiz.correct, keys.length) };
    localStorage.setItem(k, JSON.stringify(r)); })()`);
  await p.reload();
}

// ── AC-18-02：首次使用預設值（725、綠） ──
await R.check("TC-18-02", "AC-18-02", async () => {
  const stored = await p.ev(`localStorage.getItem(${JSON.stringify(KEY)})`);
  const fr = await p.ev(`({ entry: document.body.dataset.entry, pressed: [...document.querySelectorAll(".cz-color[aria-pressed=true]")].map((b) => b.dataset.color).join(","), start: !!document.getElementById("cz-start") })`);
  await p.click("#cz-start"); await sleep(350);
  p.autoStart = true;
  const g = await applied();
  const d = await dash();
  const total = await fcTotal();
  const toasts = await p.ev(`window.__qaToasts.filter((t) => t.kind === "error" || t.kind === "warning").map((t) => t.text)`);
  const ok = stored === null && fr.entry === "firstRun" && fr.pressed === "green" && fr.start
    && g.appliedScore === 725 && g.draftScore === 725 && g.appliedColor === "green" && g.effectiveColor === "green"
    && d.includes("目前目標色級=綠") && d.includes("目前生效色級=綠") && !d.includes("分數") && total === "共 5620 張" && toasts.length === 0 && p.log.exceptions.length === 0;
  return { ok, note: `localStorage 初始=${stored === null ? "無" : "有"}；首次畫面 ${JSON.stringify(fr)}；按「開始學習」後 localStorage goal=${JSON.stringify(g)}；主控台 ${d}；${total}；錯誤 toast=${JSON.stringify(toasts)}；例外 ${p.log.exceptions.length}` };
});

// ── AC-01-01：色級卡片內容（不顯示分數範圍） ──
await p.go("customizer");
await R.check("TC-01-01", "AC-01-01", async () => {
  const r = await p.ev(`(() => { const bs = [...document.querySelectorAll(".cz-colors .cz-color")];
    return { order: bs.map((b) => b.dataset.color).join(","), items: bs.map((b) => ({ c: b.dataset.color, name: b.querySelector(".cz-color__name").textContent, text: b.innerText,
      vocab: b.querySelector(".cz-color__vocab strong").textContent, note: b.querySelector(".cz-color__vocab .cz-color__note").textContent, scen: b.querySelector(".cz-color__scenario").textContent,
      lock: !!b.querySelector("svg"), soon: b.textContent.includes("即將開放") })),
      bodyHasForbidden: /官方門檻|Tier\\s*[1-4]/.test(document.body.innerText) }; })()`);
  const it = Object.fromEntries(r.items.map((x) => [x.c, x]));
  const rangeHits = r.items.filter((x) => /\d+\s*[～~－-]\s*\d+/.test(x.text) || /\d+\s*分/.test(x.text));
  const ok = r.order === "orange,brown,green,blue,gold"
    && it.orange.vocab === "1,000 字" && it.brown.vocab === "2,809 字" && it.green.vocab === "5,620 字" && it.blue.vocab === "待定" && it.gold.vocab === "待定"
    && r.items.every((x) => x.note.includes("本系統建議字量") && x.scen)
    && !it.orange.lock && !it.brown.lock && !it.green.lock && it.blue.lock && it.gold.lock && it.blue.soon && it.gold.soon && !r.bodyHasForbidden && rangeHits.length === 0;
  return { ok, note: r.items.map((x) => `${x.name}：${x.vocab}${x.note}${x.lock ? "、鎖定" : ""}${x.soon ? "、即將開放" : ""}`).join("；") + `；卡片含分數範圍 ${rangeHits.length} 張；官方門檻/Tier 字樣=${r.bodyHasForbidden}` };
});

// ── AC-02-03、AC-02-04：依序點 5 卡（試算每日新字量、對應色級、套用後 localStorage 為色級上限） ──
{
  const daily = [], colors = [], only = [], scores = [], dlg = [];
  for (const c of ["orange", "brown", "green", "blue", "gold"]) {
    await p.go("customizer"); await clickCard(p, c);
    const e = await est(p); daily.push(e.daily); colors.push(e.color); only.push(e.pressed === c);
    const a = await apply(p, "leave"); dlg.push(!!a.dialog);
    scores.push((await applied()).appliedScore);
  }
  const expD = ["10 字/天", "10 字/天", "15 字/天", "20 字/天", "20 字/天"];
  R[daily.join() === expD.join() ? "pass" : "fail"]("TC-02-03", "AC-02-03", `依序點橘、棕、綠、藍、金 → 試算每日新字量 ${daily.join("、")}`);
  const expC = ["橘", "棕", "綠", "藍（即將開放）", "金（即將開放）"];
  const okC = colors.every((c, i) => c === expC[i]) && only.every(Boolean) && scores.join() === "215,465,725,855,990" && !dlg.some(Boolean);
  R[okC ? "pass" : "fail"]("TC-02-04", "AC-02-04", `對應色級 ${colors.join("、")}；每次只有被點卡片選中=${only.every(Boolean)}；套用後 localStorage appliedScore ${scores.join("、")}；確認視窗出現 ${dlg.filter(Boolean).length} 次（無學習紀錄應 0）`);
}

// ── AC-02-05：預計週數（c = 0） ──
await R.check("TC-02-05a", "AC-02-05", async () => {
  const out = [];
  await p.go("customizer");
  for (const [c, w, t] of [["orange", "15 週", "1,000 字"], ["brown", "41 週", "2,809 字"], ["green", "54 週", "5,620 字"]]) { await clickCard(p, c); const e = await est(p); out.push([c, e.weeks, e.target, e.weeks === w && e.target === t]); }
  return { ok: out.every((x) => x[3]), note: out.map((x) => `${NAME[x[0]]} → ${x[2]}、${x[1]}`).join("；") + "（c=0；N_G=5,620 → ⌈5620/105⌉=54）" };
});

// ── AC-02-10：藍、金試算（c = 0） ──
await R.check("TC-02-10a", "AC-02-10", async () => {
  await clickCard(p, "blue"); const e = await est(p);
  await clickCard(p, "gold"); const f = await est(p);
  const ok = e.color === "藍（即將開放）" && e.target === "待定" && e.daily === "20 字/天" && e.weeks === "41 週" && e.note && e.cap
    && f.color === "金（即將開放）" && f.target === "待定" && f.daily === "20 字/天" && f.weeks === "41 週" && f.note && f.cap;
  return { ok, note: `藍：「${e.color}」「${e.target}」${e.daily}、${e.weeks}、旁註=${e.note}、提示=${e.cap}；金：「${f.color}」${f.weeks}（⌈5620/140⌉=41）` };
});

// ── AC-22-04：點卡片到選中狀態與試算繪製完成（一般、4 倍降速各 10 次） ──
await R.check("TC-22-04", "AC-22-04", async () => {
  await p.go("customizer");
  const measure = () => p.ev(`(async () => { const order = ["orange", "brown", "green", "blue", "gold"]; const out = []; let wrong = 0;
    for (let i = 0; i < 10; i++) { const c = order[(i + 1) % 5]; const el = document.querySelector('.cz-color[data-color="' + c + '"]');
      const t0 = performance.now(); el.click(); await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0))); out.push(+(performance.now() - t0).toFixed(1));
      if (el.getAttribute("aria-pressed") !== "true") wrong++; await new Promise((r) => setTimeout(r, 50)); }
    return { out, wrong }; })()`);
  const a = await measure();
  await p.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const b = await measure();
  await p.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  const ok = median(a.out) <= 100 && p90(a.out) <= 100 && median(b.out) <= 100 && p90(b.out) <= 100 && a.wrong + b.wrong === 0;
  return { ok, note: `一般 ms：${a.out.join("、")}（中位數 ${median(a.out)}、p90 ${p90(a.out)}）；4 倍降速 ms：${b.out.join("、")}（中位數 ${median(b.out)}、p90 ${p90(b.out)}）；選中狀態錯誤 ${a.wrong + b.wrong}（無頭 Chrome 參考值，基準環境列 TC-M07）` };
});

// ── AC-01-05：(a) 300（棕）、(b) 600（綠，既有）點綠 → 725 ──
await R.check("TC-01-05", "AC-01-05", async () => {
  const out = [];
  for (const s of [300, 600]) {
    await seed(p, stateRecord(s)); await p.go("customizer");
    const before = await est(p);
    await clickCard(p, "green"); const e = await est(p);
    await apply(p, "leave"); const g = await applied(); const d = await dialogInfo(p);
    out.push({ s, before: before.pressed, pressed: e.pressed, color: e.color, daily: e.daily, applied: g.appliedScore, draft: g.draftScore, dialog: !!d });
  }
  const ok = out[0].before === "brown" && out[1].before === "green" && out.every((x) => x.pressed === "green" && x.color === "綠" && x.daily === "15 字/天" && x.applied === 725 && x.draft === 725 && !x.dialog);
  return { ok, note: out.map((x) => `既有 ${x.s}（選中 ${x.before}）點綠 → 選中 ${x.pressed}、試算 ${x.color}/${x.daily}；套用後 localStorage ${x.applied}；視窗=${x.dialog}`).join("；") };
});

// ── AC-03-06、AC-03-01、AC-03-02、AC-03-04：套用橘、棕、綠的「共 N 張」 ──
await R.check("TC-03-06", "AC-03-06、AC-03-01、AC-03-02、AC-03-04", async () => {
  await seed(p, stateRecord(725));
  const out = [];
  for (const [c, n] of [["orange", 1000], ["brown", 2809], ["green", 5620]]) {
    await p.go("customizer"); await clickCard(p, c); await apply(p, "leave");
    const t = await fcTotal(); out.push([c, t, t === `共 ${n} 張`]);
  }
  return { ok: out.every((x) => x[2]), note: out.map((x) => `${NAME[x[0]]} → ${x[1]}`).join("；") };
});

// ── AC-01-02：橘 → 綠，無學習紀錄不跳視窗 ──
await R.check("TC-01-02", "AC-01-02", async () => {
  await seed(p, stateRecord(215));
  await p.go("customizer"); const a = await est(p);
  await clickCard(p, "green"); const r = await apply(p, "leave");
  const b = await est(p); const t = await fcTotal();
  return { ok: a.stEffective === "橘" && b.stEffective === "綠" && !r.dialog && t === "共 5620 張", note: `生效 ${a.stEffective} → 點綠套用後 ${b.stEffective}；確認視窗=${!!r.dialog}；單字卡 ${t}` };
});

// ── AC-01-03：點棕未套用就離開 ──
await R.check("TC-01-03", "AC-01-03", async () => {
  await p.go("customizer"); await clickCard(p, "brown");
  const d = await dash(); const t = await fcTotal();
  await p.go("customizer"); const e = await est(p); const g = await applied();
  return { ok: e.stEffective === "綠" && t === "共 5620 張" && d.includes("目前生效色級=綠") && g.appliedScore === 725 && g.effectiveColor === "green", note: `點棕未套用即離開：生效 ${e.stEffective}、${t}；主控台 ${d}；localStorage appliedScore ${g.appliedScore}` };
});

// ── AC-01-07、AC-03-03：鎖定色級（含有學習紀錄時也不跳視窗） ──
await R.check("TC-01-07", "AC-01-07、AC-03-03", async () => {
  await seed(p, stateRecord(725, { masteredWordKeys: ["the"], vocabQuiz: { answered: 1, correct: 1 } }));
  await p.go("customizer"); await clickCard(p, "blue"); const a = await est(p);
  const ra = await apply(p, "leave"); const b = await est(p); const gb = await applied(); const t1 = await fcTotal();
  await p.go("customizer"); await clickCard(p, "gold"); const rc = await apply(p, "leave"); const d = await est(p); const gd = await applied(); const t2 = await fcTotal();
  const st = await readState(p);
  const ok = a.pressed === "blue" && a.color === "藍（即將開放）" && a.cap && !ra.dialog && b.stTarget === "藍" && b.stEffective === "綠（內建上限）" && b.statusCap && gb.appliedScore === 855 && t1 === "共 5620 張"
    && !rc.dialog && d.stTarget === "金" && d.stEffective === "綠（內建上限）" && gd.appliedScore === 990 && t2 === "共 5620 張" && st.data.masteredWordKeys.length === 1;
  return { ok, note: `點藍 → 選中 ${a.pressed}、「${a.color}」、提示=${a.cap}；套用（視窗=${!!ra.dialog}）後目標 ${b.stTarget}、生效「${b.stEffective}」、localStorage ${gb.appliedScore}、${t1}；點金套用（視窗=${!!rc.dialog}）→ 目標 ${d.stTarget}、生效「${d.stEffective}」、${gd.appliedScore}、${t2}；學習紀錄保留=${st.data.masteredWordKeys.length === 1}` };
});

// ── AC-17-06：主控台目標區（無目標分數）、每日新字量依生效色級、入口 ──
await R.check("TC-17-06", "AC-17-06", async () => {
  const out = [];
  await seed(p, stateRecord(725));
  for (const c of ["green", "blue", "gold", "brown", "orange"]) { await p.go("customizer"); await clickCard(p, c); await apply(p, "leave"); out.push(`${NAME[c]}：${await dash()}`); }
  const ok = out[0].includes("目前目標色級=綠") && out[0].includes("目前生效色級=綠") && out[0].includes("每日新字量=15 字/天")
    && out[1].includes("目前目標色級=藍") && out[1].includes("每日新字量=15 字/天") && out[2].includes("目前目標色級=金") && out[2].includes("每日新字量=15 字/天")
    && out[3].includes("每日新字量=10 字/天") && out[4].includes("每日新字量=10 字/天") && out.every((x) => !/分數/.test(x));
  await p.go("customizer"); await clickCard(p, "green"); await apply(p, "leave");
  await p.go("dashboard");
  const dashText = await p.ev(`document.getElementById("view-dashboard").innerText`);
  const entryInfo = await p.ev(`[...document.querySelectorAll("#view-dashboard .dash-entry")].filter((e) => e.getClientRects().length).map((e) => e.dataset.go + ":" + e.textContent.trim())`);
  const entries = [];
  for (const tab of ["customizer", "flashcards", "part5", "sources"]) {
    await p.go("dashboard"); await p.click(`.dash-entry[data-go="${tab}"]`); await sleep(80);
    entries.push(`${tab}:${await p.ev(`!document.getElementById("view-${tab}").hidden`)}`);
  }
  await p.go("dashboard");
  const stats = await p.ev(`[...document.querySelectorAll(".dash-stats:not(.dash-stats--goal) .dash-stat__label")].map((e) => e.textContent).join("、")`);
  const goEntries = entryInfo.map((x) => x.split(":")[0]).join(",");
  const noHidden = !/解碼器|句型庫/.test(dashText) && !/目標分數/.test(dashText);
  return { ok: ok && entries.every((e) => e.endsWith("true")) && stats === "連續打卡天數、單字掌握數、模擬測驗正確率" && goEntries === "customizer,flashcards,part5,sources" && noHidden,
    note: out.join(" ／ ") + `；入口 ${entryInfo.join("、")}；可到達 ${entries.join(" ")}；統計 ${stats}；主控台含「解碼器／句型庫／目標分數」=${!noHidden}` };
});

// ── AC-03-05：換色級回第 1 張正面（有學習紀錄：取消維持第 k 張、確定回第 1 張） ──
await R.check("TC-03-05", "AC-03-05、AC-32-04（單字卡位置）", async () => {
  await seed(p, stateRecord(725));
  await p.go("flashcards");
  for (let i = 0; i < 4; i++) await p.click(".fc-next");
  await p.click(".fc-flip"); await sleep(450);
  const before = await p.ev(`[document.querySelector(".fc-position").textContent, document.querySelector(".fc-card").dataset.flipped]`);
  await p.go("customizer"); await clickCard(p, "orange"); const rc = await apply(p, "cancel");
  await p.go("flashcards");
  const afterCancel = await p.ev(`document.querySelector(".fc-position").textContent`);
  await p.go("customizer"); await clickCard(p, "orange"); const ro = await apply(p, "ok");
  await p.go("flashcards");
  const after = await p.ev(`[document.querySelector(".fc-position").textContent, document.querySelector(".fc-card").dataset.flipped]`);
  const ok = before[0] === "第 5 / 5620 張" && before[1] === "true" && !!rc.dialog && afterCancel === "第 5 / 5620 張" && !!ro.dialog && after[0] === "第 1 / 1000 張" && after[1] === "false";
  return { ok, note: `套用前 ${before.join("/")}；點橘套用 → 視窗=${!!rc.dialog}，取消後 ${afterCancel}；再套用按確定（視窗=${!!ro.dialog}）→ ${after.join("/")}` };
});

// ── AC-02-08：套用藍（855）後重新載入 ──
await R.check("TC-02-08", "AC-02-08", async () => {
  await seed(p, stateRecord(725));
  await p.go("customizer"); await clickCard(p, "blue"); await apply(p, "leave"); const a = await est(p);
  await p.reload(); await p.go("customizer"); const b = await est(p); const g = await applied();
  const ok = b.pressed === "blue" && a.weeks === b.weeks && a.color === b.color && a.daily === b.daily && a.target === b.target && g.appliedScore === 855 && g.draftScore === 855;
  return { ok, note: `重載前 ${a.pressed}/${a.color}/${a.target}/${a.daily}/${a.weeks}；重載後 ${b.pressed}/${b.color}/${b.target}/${b.daily}/${b.weeks}；localStorage ${g.draftScore}/${g.appliedScore}` };
});

// ── AC-01-04：套用棕（465）後重新載入 ──
await R.check("TC-01-04", "AC-01-04", async () => {
  await p.go("customizer"); await clickCard(p, "brown"); await apply(p, "leave");
  await p.reload(); await p.go("customizer"); const e = await est(p); const g = await applied();
  return { ok: e.stEffective === "棕" && e.pressed === "brown" && g.appliedScore === 465, note: `重載後 生效 ${e.stEffective}、選中 ${e.pressed}、localStorage appliedScore ${g.appliedScore}` };
});

// ── AC-02-05（c = 409）、AC-02-06、AC-02-10（c ≥ N_G） ──
await R.check("TC-02-05b", "AC-02-05", async () => {
  await setMastered(409); await p.go("customizer"); await clickCard(p, "brown"); const e = await est(p);
  return { ok: e.weeks === "35 週" && e.mastered === "409 字", note: `c=${e.mastered}、點棕 → ${e.weeks}（預期 35 週）` };
});
await R.check("TC-02-06", "AC-02-06", async () => {
  await setMastered(1000); await p.go("customizer"); await clickCard(p, "orange"); const e = await est(p);
  return { ok: e.weeks === "0 週" && e.achieved, note: `c=${e.mastered}、點橘 → ${e.weeks}、顯示「已達成目標字量」=${e.achieved}` };
});
await R.check("TC-02-10b", "AC-02-10", async () => {
  await setMastered(5620); await p.go("customizer"); await clickCard(p, "blue"); const e = await est(p); await clickCard(p, "green"); const f = await est(p);
  return { ok: e.weeks === "0 週" && !/-/.test(e.weeks) && f.weeks === "0 週" && f.achieved, note: `c=${e.mastered}、點藍 → ${e.weeks}；點綠 → ${f.weeks}、已達成=${f.achieved}` };
});

// ── AC-26-06：12 個既有分數（draftScore = appliedScore，FB-36） ──
await R.check("TC-26-06", "AC-26-06", async () => {
  const scores = [10, 215, 220, 465, 470, 725, 730, 855, 860, 990, 600, 735];
  const expC = ["orange", "orange", "brown", "brown", "green", "green", "blue", "blue", "gold", "gold", "green", "blue"];
  const expD = [10, 10, 10, 10, 15, 15, 20, 20, 20, 20, 15, 20];
  const rows = []; let ok = true;
  for (let i = 0; i < scores.length; i++) {
    const s = scores[i];
    await seed(p, stateRecord(s));
    await p.go("customizer"); const e = await est(p);
    const r = await apply(p, "leave");
    const d = await dash(); const g1 = await applied();
    await p.reload(); const g2 = await applied(); const st = await readState(p);
    await p.go("customizer"); const e2 = await est(p);
    const c = expC[i]; const effTxt = c === "blue" || c === "gold" ? "綠（內建上限）" : NAME[c];
    const good = e.pressed === c && e.daily === `${expD[i]} 字/天` && !r.dialog && d.includes(`目前目標色級=${NAME[c]}`) && d.includes(`目前生效色級=${effTxt}`)
      && g1.appliedScore === s && g1.draftScore === s && g2.appliedScore === s && g2.draftScore === s && st.schemaVersion === 2 && e2.pressed === c;
    ok = ok && good;
    rows.push(`${s}→${e.pressed}/${e.daily}/主控台 ${d.split("｜").slice(0, 2).join("、")}/存 ${g1.appliedScore}→重載 ${g2.appliedScore}${good ? "" : "（不符）"}`);
  }
  return { ok, note: rows.join("；") };
});

// ── AC-22-02：最大單字集套用時間（無學習紀錄，不跳視窗） ──
await R.check("TC-22-02", "AC-22-02", async () => {
  await p.ev(`localStorage.clear()`); await p.reload();
  await p.go("customizer");
  for (const t of ["cs", "business", "biostat"]) { await p.click(`[data-template="${t}"]`); await sleep(80); }
  const t0 = await fcTotal();
  await p.go("customizer");
  const r = await p.ev(`(async () => { const out = []; const btn = document.getElementById("cz-apply"); let dialogs = 0;
    for (let i = 0; i < 10; i++) { document.querySelector('.cz-color[data-color="' + (i % 2 ? "green" : "orange") + '"]').click();
      const t = performance.now(); btn.click(); await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0))); out.push(+(performance.now() - t).toFixed(1));
      if (document.querySelector(".dialog")) dialogs++; }
    return { out, dialogs }; })()`);
  const t1 = await fcTotal();
  // AC-22-02 每次 ≤ 100ms（多輪中位數／p90 只用於 AC-22-01、AC-22-04、AC-22-05）
  return { ok: Math.max(...r.out) <= 100 && t1 === "共 5650 張" && t0 === "共 5650 張" && r.dialogs === 0,
    note: `單字集 ${t1}；10 次套用（含 toast 與繪製）ms：${r.out.join("、")}；中位數 ${median(r.out)}、p90 ${p90(r.out)}、最大 ${Math.max(...r.out)}（無頭 Chrome、未降速）；確認視窗 ${r.dialogs}` };
});

// ── v0.10 暫停（分數輸入隱藏）的 AC：記不適用 ──
for (const [tc, ac] of [["TC-01-06", "AC-01-06"], ["TC-02-01", "AC-02-01"], ["TC-02-02", "AC-02-02"], ["TC-02-07", "AC-02-07"], ["TC-02-09", "AC-02-09"]]) R.na(tc, ac, "PRD v0.10 標「v0.10 暫停（分數輸入隱藏）」，本版不驗收（分數滑桿與輸入框已隱藏；隱藏與不可聚焦另由 TC-26-05 驗證）");

await R.check("TC-X-goal", "（全套件）無未處理例外", async () => ({ ok: p.log.exceptions.length === 0 && p.log.console.filter((c) => c.type === "error").length === 0, note: `例外：${JSON.stringify(p.log.exceptions).slice(0, 400)}；console.error：${JSON.stringify(p.log.console.filter((c) => c.type === "error")).slice(0, 300)}` }));

R.save(resultPath("e2e-goal"));
await p.close();
