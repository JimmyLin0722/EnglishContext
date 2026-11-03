// QA E2E 共用：以 CDP 驅動本機無頭 Chrome／Edge（不需安裝套件）。
// 依據：architecture.md §10「E2E」；以 file:// 開啟 dist/english-master-track.html。
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, "../../..");
export const DIST = path.join(ROOT, "dist", "english-master-track.html");
export const FILE_URL = pathToFileURL(DIST).href;

const BROWSERS = {
  chrome: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  edge: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
};

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 結果檔路徑：tests/results/<name>[-<瀏覽器>].json（非 chrome 時加後綴） */
export function resultPath(name) {
  const b = process.env.QA_BROWSER && process.env.QA_BROWSER !== "chrome" ? "-" + process.env.QA_BROWSER : "";
  return path.join(ROOT, "tests", "results", name + b + ".json");
}

/** 啟動瀏覽器並連上第一個分頁 */
export async function launch({ browser = process.env.QA_BROWSER || "chrome", tmpRoot } = {}) {
  const exe = BROWSERS[browser] || browser;
  const port = 9400 + Math.floor(Math.random() * 2000);
  const base = tmpRoot || process.env.QA_TMP || os.tmpdir();
  const profile = fs.mkdtempSync(path.join(base, "qa-profile-"));
  const downloads = path.join(profile, "_downloads");
  fs.mkdirSync(downloads, { recursive: true });
  const proc = spawn(exe, [
    "--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    "--no-first-run", "--no-default-browser-check", "--disable-extensions", "--disable-gpu",
    "--disable-background-networking", "--disable-component-update", "--disable-sync",
    "--allow-file-access-from-files",
    // （第 3 輪）麥克風替身以 Web Audio 產生測試音源，避免無頭模式的自動播放政策讓 AudioContext 停在 suspended
    "--autoplay-policy=no-user-gesture-required",
    "about:blank",
  ], { stdio: "ignore" });

  let list;
  for (let i = 0; i < 150; i++) {
    try { list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); if (list.some((t) => t.type === "page")) break; } catch { /* 等待 */ }
    await sleep(200);
  }
  if (!list) throw new Error("無法連線瀏覽器 DevTools");
  const pageT = list.find((t) => t.type === "page");
  const ws = new WebSocket(pageT.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });

  let seq = 0;
  const pending = new Map();
  const listeners = [];
  const log = { console: [], exceptions: [], logEntries: [], requests: [], dialogs: [] };
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) {
      const { res, rej } = pending.get(m.id); pending.delete(m.id);
      if (m.error) rej(new Error(m.error.message + " " + JSON.stringify(m.error.data || ""))); else res(m.result);
      return;
    }
    if (m.method === "Runtime.consoleAPICalled") {
      log.console.push({ type: m.params.type, text: m.params.args.map((a) => a.value ?? a.description).join(" ") });
    } else if (m.method === "Runtime.exceptionThrown") {
      const d = m.params.exceptionDetails;
      log.exceptions.push(`${d.text} ${(d.exception && d.exception.description) || ""}`);
    } else if (m.method === "Log.entryAdded") {
      log.logEntries.push({ level: m.params.entry.level, text: m.params.entry.text, url: m.params.entry.url || "" });
    } else if (m.method === "Network.requestWillBeSent") {
      log.requests.push({ url: m.params.request.url, type: m.params.type });
    } else if (m.method === "Page.javascriptDialogOpening") {
      log.dialogs.push(m.params.message);
      send("Page.handleJavaScriptDialog", { accept: false }).catch(() => {});
    }
    for (const fn of listeners) fn(m);
  };
  function send(method, params = {}) {
    return new Promise((res, rej) => { const i = ++seq; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  }
  await send("Runtime.enable"); await send("Log.enable"); await send("Network.enable"); await send("Page.enable");
  await send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: downloads, eventsEnabled: true }).catch(() => {});

  const initScripts = [];
  const page = {
    send, log, profile, downloads, browser,
    onEvent(fn) { listeners.push(fn); },
    async ev(expr) {
      const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true, userGesture: true });
      if (r.exceptionDetails) throw new Error("evaluate 失敗：" + ((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text));
      return r.result.value;
    },
    async addInitScript(src) {
      const r = await send("Page.addScriptToEvaluateOnNewDocument", { source: src });
      initScripts.push(r.identifier); return r.identifier;
    },
    async clearInitScripts() {
      for (const id of initScripts.splice(0)) await send("Page.removeScriptToEvaluateOnNewDocument", { identifier: id }).catch(() => {});
    },
    async goto(url = FILE_URL, { waitReady = true, timeout = 20000 } = {}) {
      await send("Page.navigate", { url });
      if (!waitReady) return;
      const t0 = Date.now();
      while (Date.now() - t0 < timeout) {
        await sleep(50);
        try { if ((await page.ev("document.documentElement.getAttribute('data-ready')")) === "1") { await sleep(80); if (page.autoStart) await page.startLearning(); return; } } catch (e) { if (e && e.qaStart) throw e; /* 導覽中 */ }
      }
      throw new Error("等待 data-ready 逾時");
    },
    /**
     * （v0.8，SD-FB-13）空 storage 開啟會進首次畫面（PRD US-25）。page.autoStart 為 true（預設）時，
     * goto 後若處於首次模式即按「開始學習」以預設值（v0.10 起為 725、綠，Q-39）進入主控台，等同 v0.7 的「首次使用」狀態。
     * 測首次流程的腳本設 page.autoStart = false 自行操作。
     */
    autoStart: true,
    async entry() { return page.ev(`document.body.dataset.entry`); },
    async startLearning() {
      if ((await page.entry()) !== "firstRun") return false;
      const ok = await page.ev(`(() => { const b = document.getElementById("cz-start"); if (!b) return false; b.click(); return true; })()`);
      if (!ok) { const e = new Error("首次畫面找不到「開始學習」"); e.qaStart = true; throw e; }
      for (let i = 0; i < 40; i++) { if ((await page.entry()) === "main") break; await sleep(25); }
      await sleep(320); // 換頁動畫（240ms）結束
      return true;
    },
    async reload() { return page.goto(FILE_URL); },
    async viewport(w, h, mobile = w < 768) {
      await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile });
      if (mobile) await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 }).catch(() => {});
      else await send("Emulation.setTouchEmulationEnabled", { enabled: false }).catch(() => {});
    },
    /** 以真實滑鼠事件點擊（元素中心點；回傳是否命中該元素） */
    async click(selector, nth = 0) {
      const pt = await page.ev(`(() => { const els = [...document.querySelectorAll(${JSON.stringify(selector)})].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
        const el = els[${nth}]; if (!el) return null; el.scrollIntoView({ block: "center", inline: "nearest" }); const r = el.getBoundingClientRect();
        const x = r.left + r.width / 2, y = r.top + r.height / 2; const hit = document.elementFromPoint(x, y);
        return { x, y, hitOk: !!hit && (hit === el || el.contains(hit)) }; })()`);
      if (!pt) throw new Error("找不到可見元素：" + selector + " #" + nth);
      for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) {
        await send("Input.dispatchMouseEvent", { type, x: pt.x, y: pt.y, button: "left", clickCount: 1 });
      }
      await sleep(60);
      return pt.hitOk;
    },
    /** 以觸控事件點擊 */
    async tap(selector, nth = 0) {
      const pt = await page.ev(`(() => { const els = [...document.querySelectorAll(${JSON.stringify(selector)})].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
        const el = els[${nth}]; if (!el) return null; el.scrollIntoView({ block: "center", inline: "nearest" }); const r = el.getBoundingClientRect();
        const x = r.left + r.width / 2, y = r.top + r.height / 2; const hit = document.elementFromPoint(x, y);
        return { x, y, w: r.width, h: r.height, hitOk: !!hit && (hit === el || el.contains(hit)) }; })()`);
      if (!pt) throw new Error("找不到可見元素：" + selector);
      await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: pt.x, y: pt.y }] });
      await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await sleep(120);
      return pt;
    },
    /**
     * （v0.8）以觸控事件在元素上滑動：起點為元素中心（或 at 指定比例），分 steps 步移動 (dx, dy) 後放開。
     * durationMs 為整個滑動的時間（FE-28：CDP 模擬瞬間快速滑動後約 1.5 秒內 Chrome 可能吞掉下一次 click，故預設較慢）。
     */
    async swipe(selector, dx, dy, { nth = 0, steps = 8, durationMs = 160, at = [0.5, 0.5], scroll = true } = {}) {
      const pt = await page.ev(`(() => { const els = [...document.querySelectorAll(${JSON.stringify(selector)})].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
        const el = els[${nth}]; if (!el) return null; if (${scroll}) el.scrollIntoView({ block: "center", inline: "nearest" }); const r = el.getBoundingClientRect();
        return { x: r.left + r.width * ${at[0]}, y: r.top + r.height * ${at[1]} }; })()`);
      if (!pt) throw new Error("找不到可見元素：" + selector);
      await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: pt.x, y: pt.y }] });
      for (let k = 1; k <= steps; k++) {
        await sleep(durationMs / steps);
        await send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: pt.x + (dx * k) / steps, y: pt.y + (dy * k) / steps }] });
      }
      await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await sleep(60);
      return pt;
    },
    /** 聚焦並以實際輸入取代內容 */
    async type(selector, text, { clear = true } = {}) {
      await page.ev(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) throw new Error("no ${selector.replace(/"/g, "'")}"); el.scrollIntoView({block:"center"}); el.focus(); if (${clear}) { el.select ? el.select() : null; } })()`);
      if (clear) {
        await send("Input.dispatchKeyEvent", { type: "keyDown", key: "a", code: "KeyA", modifiers: 2, windowsVirtualKeyCode: 65 });
        await send("Input.dispatchKeyEvent", { type: "keyUp", key: "a", code: "KeyA", modifiers: 2, windowsVirtualKeyCode: 65 });
        await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Delete", code: "Delete", windowsVirtualKeyCode: 46 });
        await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Delete", code: "Delete", windowsVirtualKeyCode: 46 });
      }
      if (text) await send("Input.insertText", { text });
      await sleep(40);
    },
    async key(key, code = key, vk = 13) {
      await send("Input.dispatchKeyEvent", { type: "keyDown", key, code, windowsVirtualKeyCode: vk });
      await send("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode: vk });
      await sleep(40);
    },
    async text(selector) { return page.ev(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); return e ? e.innerText : null; })()`); },
    async go(tab) {
      // 透過導覽按鈕切頁（窄螢幕先展開選單）
      const hidden = await page.ev(`(() => { const b = document.querySelector('#app-nav [data-tab="${tab}"]'); if (!b) return "none"; const r = b.getBoundingClientRect(); return r.width === 0 || r.height === 0; })()`);
      if (hidden === true) await page.click("#nav-toggle");
      if (hidden === "none") await page.ev(`EMT.router.go(${JSON.stringify(tab)})`);
      else await page.click(`#app-nav [data-tab="${tab}"]`);
      await sleep(60);
    },
    async toasts() { return page.ev(`[...document.querySelectorAll("#toast-root *")].map((e) => e.textContent).filter(Boolean).join(" | ")`); },
    async clearToasts() { await page.ev(`(() => { const r = document.getElementById("toast-root"); if (r) r.textContent = ""; })()`); },
    async close() {
      // （第 3 輪）可重複呼叫；Browser.close 最多等 2 秒（連線已斷時 send 不會回應）
      if (page._closed) return; page._closed = true;
      try { await Promise.race([send("Browser.close"), sleep(2000)]); } catch { /* 已關閉 */ }
      try { ws.close(); } catch { /* 忽略 */ }
      await sleep(300);
      try { proc.kill(); } catch { /* 忽略 */ }
      await sleep(200);
      try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* 檔案鎖定時略過 */ }
    },
  };
  return page;
}

/** TC 結果收集器 */
export function recorder(suite) {
  const results = [];
  return {
    results,
    pass(tc, ac, note = "") { results.push({ suite, tc, ac, result: "通過", note }); console.log(`  PASS ${tc} ${ac} ${note}`); },
    fail(tc, ac, note) { results.push({ suite, tc, ac, result: "失敗", note }); console.log(`  FAIL ${tc} ${ac} ${note}`); },
    manual(tc, ac, note) { results.push({ suite, tc, ac, result: "待人工", note }); console.log(`  MANUAL ${tc} ${ac} ${note}`); },
    /** （第 3 輪）PRD 標「暫停」的 AC：不執行，記為「不適用（暫停）」 */
    na(tc, ac, note) { results.push({ suite, tc, ac, result: "不適用（暫停）", note }); console.log(`  N/A ${tc} ${ac} ${note}`); },
    async check(tc, ac, fn) {
      try {
        const r = await fn();
        if (r === true || (r && r.ok === true)) this.pass(tc, ac, (r && r.note) || "");
        else this.fail(tc, ac, (r && r.note) || JSON.stringify(r).slice(0, 600));
      } catch (e) {
        this.fail(tc, ac, "例外：" + (e && e.message ? e.message : String(e)).slice(0, 600));
      }
    },
    save(file) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, JSON.stringify(results, null, 2));
    },
  };
}
