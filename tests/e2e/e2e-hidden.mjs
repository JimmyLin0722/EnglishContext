// QA E2E 套件 10（第 3 輪新增，PRD v0.9 R-18 三）：隱藏解碼器與句型庫（AC-20-04）、導覽 4 項（AC-20-03）
// 判定依主控指示：以畫面可見性、Tab 焦點、無障礙樹判定，不以原始碼搜尋（程式與資料依決議保留，SD-FB-21、SD-FB-29）。
import fs from "node:fs";
import path from "node:path";
import { launch, recorder, sleep, resultPath, FILE_URL } from "./lib/cdp.mjs";
import { TOAST_RECORDER } from "./lib/inits.mjs";
import { stateRecord, seed } from "./lib/state.mjs";

const R = recorder("e2e-hidden");
const TMP = process.env.QA_TMP || path.resolve("tests/results/tmp");
fs.mkdirSync(TMP, { recursive: true });
const p = await launch();
await p.addInitScript(TOAST_RECORDER);
await p.send("Page.setInterceptFileChooserDialog", { enabled: true });
let chooser = null;
p.onEvent((m) => { if (m.method === "Page.fileChooserOpened") chooser = m.params; });
await p.send("Accessibility.enable").catch(() => {});
await p.viewport(1366, 900);
await p.goto();

/** 畫面上（可見）出現解碼器／句型庫文字或入口、隱藏頁顯示中 */
const scan = () => p.ev(`(() => { const shown = (e) => { const s = getComputedStyle(e); if (s.display === "none" || s.visibility === "hidden" || e.closest("[hidden]")) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const clickables = [...document.querySelectorAll("button, a, [role=button], [data-go], [data-tab]")].filter(shown);
  const bad = clickables.filter((e) => /解碼器|句型庫/.test(e.innerText + " " + (e.getAttribute("aria-label") || "") + " " + (e.title || "")) || ["decoder", "phrasebank"].includes(e.dataset.go) || ["decoder", "phrasebank"].includes(e.dataset.tab));
  const navText = [...document.querySelectorAll("#app-nav [data-tab]")].filter(shown).map((b) => b.innerText.trim());
  return { textHit: /解碼器|句型庫/.test(document.body.innerText), bad: bad.map((e) => e.tagName + ":" + e.innerText.trim()), navText, decoderShown: shown(document.getElementById("view-decoder")) && !document.getElementById("view-decoder").hidden,
    phrasebankShown: !document.getElementById("view-phrasebank").hidden, current: EMT.router.current(), dashboardShown: !document.getElementById("view-dashboard").hidden }; })()`);
const ax = async () => {
  const t = await p.send("Accessibility.getFullAXTree");
  return (t.nodes || []).filter((n) => !n.ignored && /解碼器|句型庫/.test((n.name && n.name.value) || "")).map((n) => `${n.role && n.role.value}:${n.name.value}`);
};
const tabFocus = async () => {
  await p.ev(`document.activeElement && document.activeElement.blur(); window.scrollTo(0, 0)`);
  const hits = []; const seen = new Set();
  for (let i = 0; i < 60; i++) {
    await p.key("Tab", "Tab", 9);
    const a = await p.ev(`(() => { const e = document.activeElement; if (!e || e === document.body) return null; return { k: e.tagName + "#" + e.id + "." + (typeof e.className === "string" ? e.className : ""), inHidden: !!e.closest("#view-decoder, #view-phrasebank"), text: (e.innerText || "").trim().slice(0, 20) }; })()`);
    if (!a) continue; seen.add(a.k + "@" + a.text);
    if (a.inHidden || /解碼器|句型庫/.test(a.text)) hits.push(a.k);
  }
  return { n: seen.size, hits };
};

// ── AC-20-03、AC-20-04：375 與 1366 的導覽、主控台、頁尾、各頁 ──
await R.check("TC-20-04a", "AC-20-04（畫面入口、Tab、無障礙樹）、AC-20-03", async () => {
  const out = []; let ok = true;
  for (const [w, h] of [[375, 667], [1366, 900]]) {
    await p.viewport(w, h); await p.reload();
    for (const tab of ["dashboard", "customizer", "flashcards", "part5", "sources"]) {
      await p.ev(`EMT.router.go(${JSON.stringify(tab)})`); await sleep(320);
      const s = await scan(); const a = await ax();
      const good = !s.textHit && s.bad.length === 0 && a.length === 0 && !s.decoderShown && !s.phrasebankShown;
      ok = ok && good; if (!good) out.push(`${w}px ${tab}：文字=${s.textHit}、入口 ${JSON.stringify(s.bad)}、無障礙樹 ${JSON.stringify(a)}`);
    }
    await p.ev(`EMT.router.go("dashboard")`); await sleep(320);
    const s = await scan(); const tf = await tabFocus();
    // 窄螢幕為底部導覽；寬螢幕導覽列
    const navOk = s.navText.join("、") === "主控台、難易度設定、單字卡、模擬測驗";
    ok = ok && navOk && tf.hits.length === 0;
    out.push(`${w}px：導覽 ${s.navText.join("、")}；Tab ${tf.n} 個焦點落在隱藏頁或其入口 ${tf.hits.length}`);
  }
  return { ok, note: out.join("；") + "；5 個可到達頁面皆無「解碼器／句型庫」文字、入口與無障礙節點" };
});

// ── 網址片段（hash）手動輸入 ──
await R.check("TC-20-04b", "AC-20-04（手動輸入網址片段、重新載入）", async () => {
  await p.viewport(1366, 900);
  const out = []; let ok = true;
  for (const hsh of ["#decoder", "#phrasebank", "#view-decoder", "#view-phrasebank", "#/decoder", "#/phrasebank", "#DECODER"]) {
    await p.ev(`EMT.router.go("part5")`); await sleep(300);
    await p.ev(`location.hash = ${JSON.stringify(hsh)}`); await sleep(400);
    const s = await scan();
    const good = s.current === "dashboard" && s.dashboardShown && !s.decoderShown && !s.phrasebankShown;
    ok = ok && good; out.push(`${hsh}→${s.current}`);
  }
  // 以含片段的網址開啟（等同在網址列輸入後按 Enter）與重新載入
  for (const hsh of ["#phrasebank", "#decoder"]) {
    await p.goto("about:blank", { waitReady: false }); await sleep(200);
    await p.goto(FILE_URL + hsh); await sleep(300);
    const s = await scan();
    await p.reload(); await sleep(300); const s2 = await scan();
    const good = s.current === "dashboard" && !s.decoderShown && !s.phrasebankShown && s2.current === "dashboard" && !s2.phrasebankShown && !s2.decoderShown;
    ok = ok && good; out.push(`開啟 ${hsh}→${s.current}、重新載入→${s2.current}`);
  }
  const err = p.log.exceptions.length + p.log.console.filter((c) => c.type === "error").length;
  return { ok: ok && err === 0, note: out.join("；") + `；未處理錯誤 ${err}` };
});

// ── 匯入備份後仍不顯示 ──
await R.check("TC-20-04c", "AC-20-04（匯入備份）", async () => {
  await p.goto(FILE_URL);
  await seed(p, stateRecord(300, { masteredWordKeys: ["the"], vocabQuiz: { answered: 1, correct: 1 } }));
  const json = await p.ev(`EMT.store.actions.exportBackup().json`);
  const f = path.join(TMP, "hidden-" + Date.now() + ".json"); fs.writeFileSync(f, json);
  await p.go("dashboard"); chooser = null;
  await p.click('[data-action="import-backup"]');
  for (let i = 0; i < 40 && !chooser; i++) await sleep(50);
  await p.send("DOM.setFileInputFiles", { files: [f], backendNodeId: chooser.backendNodeId }); await sleep(300);
  await p.click('.dialog [data-action="ok"]'); await sleep(500);
  const s = await scan(); const a = await ax();
  const t = await p.ev(`window.__qaToasts.map((x) => x.text)`);
  return { ok: t.some((x) => x.startsWith("已匯入")) && !s.textHit && s.bad.length === 0 && a.length === 0 && !s.decoderShown && !s.phrasebankShown && s.current === "dashboard", note: `匯入提示 ${JSON.stringify(t.slice(-1))}；之後目前頁 ${s.current}、文字=${s.textHit}、入口 ${s.bad.length}、無障礙樹 ${a.length}` };
});

// ── 交付檔仍含內容資料（程式碼與資料保留） ──
await R.check("TC-20-04d", "AC-20-04（內容資料保留）", async () => {
  const r = await p.ev(`({ dec: (window.DECODER_SENTENCES || []).length, rs: Array.isArray(window.READING_STRATEGIES) ? window.READING_STRATEGIES.length : Object.keys(window.READING_STRATEGIES || {}).length, pb: (window.ACADEMIC_PHRASEBANK || []).length })`);
  return { ok: r.dec >= 50 && r.rs >= 3 && r.pb >= 100, note: `交付檔載入後：長難句 ${r.dec} 句、閱讀策略 ${r.rs} 項、句型 ${r.pb} 則` };
});

R[p.log.exceptions.length === 0 ? "pass" : "fail"]("TC-X-hidden", "（全套件）無未處理例外", JSON.stringify(p.log.exceptions).slice(0, 300));
await p.close();
R.save(resultPath("e2e-hidden"));
