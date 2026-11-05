// 診斷（第 9 輪，FE-89 回饋 1；AC-38-09、AC-27-03）：375×667 以真實 Tab 走過每個功能區，記錄取得焦點的控制項是否被固定底部導覽列遮住。
// 比對 v1.3.0（dist）與 v1.2.0（git 25e3c3f）。用法：node tests/e2e/diag-r9-focus.mjs [輸出 JSON]；環境變數 QA_V120 指向舊交付檔（未指定時由 git 取出到 QA_TMP）。
// 結果也寫 tests/results/e2e-focus.json（TC-38-09f 由主控回饋判定；缺陷見 BUG-005）。
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { launch, recorder, sleep, FILE_URL, ROOT, resultPath } from "./lib/cdp.mjs";
import { TOAST_RECORDER, fakeTts, fakeStt, fakeMic } from "./lib/inits.mjs";
import { KEY, stateRecord } from "./lib/state.mjs";

const J = (x) => JSON.stringify(x);
const TMP = process.env.QA_TMP || path.join(ROOT, "tests/results/tmp"); fs.mkdirSync(TMP, { recursive: true });
const V12 = process.env.QA_V120 || path.join(TMP, "v1.2.0.html");
if (!fs.existsSync(V12)) fs.writeFileSync(V12, execFileSync("git", ["show", "25e3c3f:dist/english-master-track.html"], { cwd: ROOT, maxBuffer: 64 << 20 }));
const VERS = [["1.3.0", FILE_URL], ["1.2.0", pathToFileURL(V12).href]];
const SIZES = [[375, 667], [390, 844]];

const label = `(e) => { const parts = []; if (e.id) parts.push("#" + e.id); const cl = (e.className && typeof e.className === "string") ? e.className.trim().split(/\\s+/).filter((c) => !/^btn(--|$)/.test(c)).slice(0, 2).map((c) => "." + c) : []; parts.push(...cl); if (e.dataset && e.dataset.color) parts.push("[" + e.dataset.color + "]"); if (e.dataset && e.dataset.action) parts.push("[" + e.dataset.action + "]"); const txt = (e.textContent || "").trim().slice(0, 12); return (parts.join("") || e.tagName) + (txt ? "「" + txt + "」" : ""); }`;
const probe = `(() => { const lab = ${label}; const e = document.activeElement; if (!e || e === document.body) return null; const nav = document.getElementById("app-nav"); const fixed = nav && getComputedStyle(nav).position === "fixed" && nav.getClientRects().length > 0; const r = e.getBoundingClientRect(); const nt = fixed ? nav.getBoundingClientRect().top : innerHeight; const inNav = !!e.closest("#app-nav");
  const visH = Math.max(0, Math.min(r.bottom, nt) - Math.max(r.top, 0)); const frac = r.height > 0 ? visH / r.height : 1; const cx = r.left + r.width / 2; const cy = Math.min(r.top + r.height / 2, innerHeight - 1); const hit = document.elementFromPoint(cx, cy); const hitOk = !!hit && (hit === e || e.contains(hit) || hit.contains(e));
  return { name: lab(e), top: Math.round(r.top), bottom: Math.round(r.bottom), navTop: Math.round(nt), vh: innerHeight, inNav, visibleFraction: +frac.toFixed(2), centerHit: hitOk, hitName: hit && !hitOk ? lab(hit) : null, scrollY: Math.round(scrollY) }; })()`;

async function walk(p, tag, maxTabs = 45) {
  await p.ev(`document.activeElement && document.activeElement.blur(); window.scrollTo(0, 0)`); await sleep(60);
  const stops = []; const seen = new Set();
  for (let i = 0; i < maxTabs; i++) { await p.key("Tab", "Tab", 9); await sleep(60); const s = await p.ev(probe); if (!s) { if (stops.length) break; continue; } const key = s.name; if (seen.has(key)) { if (s.name === stops[0]?.name) break; } seen.add(key); stops.push(s); }
  const content = stops.filter((s) => !s.inNav); const covered = content.filter((s) => s.visibleFraction < 1); const hidden = content.filter((s) => s.visibleFraction === 0);
  return { tag, stops: content.length, covered: covered.map((s) => ({ name: s.name, top: s.top, bottom: s.bottom, navTop: s.navTop, visible: s.visibleFraction, hit: s.hitName })), hidden: hidden.map((s) => s.name) };
}
const seed = (over = {}) => stateRecord(725, { sttNoticeAcknowledged: true, part5: { currentIndex: 2, lockedSelection: null, phase: "question", roundAnswered: 1, roundCorrect: 1, totalAnswered: 2, totalCorrect: 1 }, part5CorrectIds: ["p5-001"], ...over });
const out = {};
for (const [ver, url] of VERS) for (const [w, h] of SIZES) {
  const p = await launch(); for (const s of [TOAST_RECORDER, fakeTts("ok"), fakeStt("ok"), fakeMic("ok")]) await p.addInitScript(s);
  await p.viewport(w, h, true); await p.goto(url); await p.ev(`localStorage.setItem(${J(KEY)}, ${J(J(seed()))})`); await p.goto(url); await sleep(120);
  const res = [];
  await p.ev(`EMT.router.go("dashboard")`); await sleep(120); res.push(await walk(p, "主控台（資料備份收合）"));
  // FE-89 回報的情境：有近 7 天長條、今日已學資料時主控台較高
  const today = await p.ev(`(() => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); })()`); const days = {}; for (let i = 0; i < 7; i++) { const d = new Date(Date.now() - i * 86400000); days[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`] = 5 + i; }
  await p.ev(`localStorage.setItem(${J(KEY)}, ${J(J(seed({ learnedHistory: days, todayLearned: { date: today, wordKeys: ["the", "be", "to", "of", "and"] }, streak: { days: 3, lastActiveDate: today } })))})`); await p.goto(url); await sleep(120); await p.ev(`EMT.router.go("dashboard")`); await sleep(120); res.push(await walk(p, "主控台（有近 7 天資料、收合）"));
  await p.ev(`document.querySelector(".db-backup__toggle").click()`); await sleep(80); res.push(await walk(p, "主控台（有近 7 天資料、展開）"));
  await p.ev(`EMT.router.go("customizer")`); await sleep(120); res.push(await walk(p, "難易度設定"));
  await p.ev(`EMT.router.go("flashcards")`); await sleep(160); res.push(await walk(p, "單字卡"));
  await p.ev(`EMT.router.go("part5")`); await sleep(120); res.push(await walk(p, "模擬測驗"));
  out[`${ver}@${w}x${h}`] = res; await p.close();
}
const name = (r) => r.covered.map((c) => `${c.name}（可見 ${Math.round(c.visible * 100)}%）`).join("、") || "無";
const lines = []; for (const [k, r] of Object.entries(out)) { lines.push(`【${k}】`); for (const x of r) lines.push(`  ${x.tag}：Tab 停點 ${x.stops}；被遮 ${x.covered.length}：${name(x)}`); }
console.log(lines.join("\n"));
// 結果（BUG-005）：v1.3.0 375px 有控制項取得焦點時被遮 → 失敗；是否舊有另記
const cur = out["1.3.0@375x667"]; const old = out["1.2.0@375x667"]; const covered = cur.flatMap((x) => x.covered.map((c) => x.tag + "：" + c.name + "（可見 " + Math.round(c.visible * 100) + "%）")); const oldCovered = old.flatMap((x) => x.covered.map((c) => x.tag + "：" + c.name + "（可見 " + Math.round(c.visible * 100) + "%）")); const toggle = cur.some((x) => x.covered.some((c) => /db-backup__toggle|db-start|db-change/.test(c.name)));
const R = recorder("e2e-focus"); const NOTE = `375×667 真實 Tab：v1.3.0 被遮 ${covered.length}：${covered.join("、") || "無"}；v1.2.0 被遮 ${oldCovered.length}：${oldCovered.join("、") || "無"}（BUG-005，舊有；390×844 見 tests/results/diag/r9-focus.json）`;
if (covered.length) R.fail("TC-38-09f", toggle ? "AC-38-09 (a)" : "AC-38-09（範圍外控制項，同類問題）", NOTE); else R.pass("TC-38-09f", "AC-38-09 (a)", NOTE);
R.save(resultPath("e2e-focus"));
fs.mkdirSync(path.join(ROOT, "tests/results/diag"), { recursive: true }); fs.writeFileSync(process.argv[2] || path.join(ROOT, "tests/results/diag/r9-focus.json"), J(out));
