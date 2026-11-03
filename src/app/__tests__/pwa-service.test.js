/*
 * pwa-service.test.js — PWA 頁面端服務單元測試（FE-48）
 * 受測：services/pwa.js（以 create() 注入替身 location、navigator、document、計時器、performance）
 * 依據：architecture.md v0.7 §4.7「EMT.services.pwa」、§7.18.4～§7.18.6、§7.18.8、§10.4「pwa-service.test.js」列；
 *       契約 README §10.4 HD-2、§10.5 PE-1～PE-4、§10.6 SW-1、§10.7 UP-1～UP-9、§10.8 IN-2～IN-8、§10.11 V-PWA-07～V-PWA-10
 * 涵蓋：AC-21-01、AC-21-03、AC-34-01、AC-34-05～AC-34-10、AC-35-01、AC-35-05、AC-36-03、AC-36-06、AC-37-01～AC-37-05
 */
"use strict";

const { describe, test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const svc = require("../services/pwa.js");

const APP_DIR = path.join(__dirname, "..");

/** 等待 Promise 鏈跑完 */
async function flush(n = 10) {
  for (let i = 0; i < n; i++) await new Promise((r) => setImmediate(r));
}

// ── 替身 ──

function fakeTarget() {
  const listeners = {};
  return {
    listeners,
    addEventListener(type, fn, opts) {
      (listeners[type] = listeners[type] || []).push({ fn, opts });
    },
    fire(type, ev) {
      const list = (listeners[type] || []).slice();
      for (const l of list) {
        if (l.opts && l.opts.once) listeners[type].splice(listeners[type].indexOf(l), 1);
        l.fn(ev);
      }
    },
    count(type) {
      return (listeners[type] || []).length;
    },
  };
}

function fakeWorker(log, state = "installing") {
  const t = fakeTarget();
  return Object.assign(t, {
    state,
    postMessage(m) {
      log.post.push(m);
    },
    setState(s) {
      this.state = s;
      this.fire("statechange", {});
    },
  });
}

function fakeRegistration(log, o = {}) {
  const t = fakeTarget();
  return Object.assign(t, {
    waiting: o.waiting || null,
    installing: null,
    update() {
      log.update++;
      return o.updateRejects ? Promise.reject(new Error("offline")) : Promise.resolve();
    },
  });
}

function fakeHead() {
  const children = [];
  return {
    children,
    appendChild(el) {
      children.push(el);
      return el;
    },
    querySelector(sel) {
      const m = /^link\[rel="([^"]+)"\]$/.exec(sel);
      if (!m) return null;
      return children.find((c) => c.tagName === "LINK" && c.attrs.rel === m[1]) || null;
    },
  };
}

/**
 * 建立替身全域物件。
 * @param {object} o
 *   href：網址；secure：isSecureContext（預設依網址）；noSw：沒有 serviceWorker；
 *   readyState：document.readyState（預設 "loading"）；standaloneMedia、iosStandalone；
 *   controller：是否已有 controller；reg：register 解析的 registration；registerRejects；registerThrows
 */
function env(o = {}) {
  const u = new URL(o.href || "https://u.github.io/p/");
  const log = { register: [], reload: 0, post: [], update: 0, timers: [], navReads: 0, created: [], onChange: [] };
  const win = fakeTarget();
  const sw = fakeTarget();
  sw.controller = o.controller ? {} : null;
  sw.register = (url, opts) => {
    log.register.push([url, opts]);
    if (o.registerThrows) throw new Error("sync");
    if (o.registerRejects) return Promise.reject(new Error("404"));
    return Promise.resolve(o.reg || null);
  };
  const nav = o.noSw ? {} : { serviceWorker: sw };
  if (o.iosStandalone) nav.standalone = true;
  const head = fakeHead();
  const doc = Object.assign(fakeTarget(), {
    readyState: o.readyState || "loading",
    visibilityState: "visible",
    head,
    createElement(tag) {
      const el = {
        tagName: tag.toUpperCase(),
        attrs: {},
        setAttribute(k, v) {
          this.attrs[k] = String(v);
        },
        getAttribute(k) {
          return this.attrs[k];
        },
      };
      log.created.push(el);
      return el;
    },
  });
  let clock = 1000;
  const g = Object.assign(win, {
    location: {
      protocol: u.protocol,
      hostname: u.hostname,
      href: u.href,
      reload() {
        log.reload++;
      },
    },
    isSecureContext: o.secure !== undefined ? o.secure : u.protocol === "https:" || ["localhost", "127.0.0.1"].includes(u.hostname),
    document: doc,
    matchMedia(q) {
      return { media: q, matches: !!o.standaloneMedia && q === "(display-mode: standalone)" };
    },
    setTimeout(fn, ms) {
      log.timers.push({ fn, ms });
      return log.timers.length;
    },
    performance: {
      now() {
        return clock;
      },
    },
  });
  Object.defineProperty(g, "navigator", {
    get() {
      log.navReads++;
      return nav;
    },
  });
  const inst = svc.create(g);
  return {
    g, sw, doc, head, log, inst,
    setClock(t) {
      clock = t;
    },
    runTimers() {
      const ts = log.timers.splice(0);
      ts.forEach((t) => t.fn());
    },
    onChange(p) {
      log.onChange.push(JSON.parse(JSON.stringify(p)));
    },
  };
}

/** 收集 console.error／warn 與未處理 rejection */
let errors;
let origError;
let origWarn;
const onUnhandled = (r) => errors.push(["unhandled", r]);
beforeEach(() => {
  errors = [];
  origError = console.error;
  origWarn = console.warn;
  console.error = (...a) => errors.push(["error", a]);
  console.warn = (...a) => errors.push(["warn", a]);
  process.on("unhandledRejection", onUnhandled);
});
afterEach(() => {
  console.error = origError;
  console.warn = origWarn;
  process.off("unhandledRejection", onUnhandled);
});

describe("(a) PE-2：不符合 PE-1 時什麼都不做（V-PWA-07 單元代理）", () => {
  for (const href of ["file:///C:/x/english-master-track.html", "http://192.168.0.2/p/"]) {
    test(href, async () => {
      const e = env({ href, readyState: "complete", secure: true });
      const r = e.inst.start({ onChange: (p) => e.onChange(p) });
      assert.deepStrictEqual(r, { eligible: false, standalone: false });
      e.runTimers();
      await flush();
      assert.equal(e.log.onChange.length, 0);
      assert.equal(e.log.register.length, 0);
      assert.equal(e.g.count("beforeinstallprompt"), 0);
      assert.equal(e.g.count("appinstalled"), 0);
      assert.equal(e.g.count("load"), 0);
      assert.equal(e.head.children.length, 0);
      assert.equal(e.log.created.length, 0);
      assert.equal(e.log.navReads, 0, "第 (1) 步即判定，不讀 navigator");
      assert.equal(e.log.timers.length, 0);
      // 不符合時 requestReload／requestInstall 都不做事
      e.inst.requestReload();
      await e.inst.requestInstall();
      assert.equal(e.log.reload, 0);
      assert.equal(errors.length, 0);
    });
  }

  test("https 但不支援 service worker → false，不做事", () => {
    const e = env({ noSw: true });
    assert.deepStrictEqual(e.inst.start({ onChange: (p) => e.onChange(p) }), { eligible: false, standalone: false });
    assert.equal(e.log.onChange.length, 0);
    assert.equal(e.head.children.length, 0);
  });
});

describe("(b) https：連結、事件綁定、load 後註冊", () => {
  test("onChange、head 加 2 個相對路徑連結、load 前不註冊、load 後註冊 1 次", async () => {
    const e = env();
    const r = e.inst.start({ onChange: (p) => e.onChange(p) });
    assert.deepStrictEqual(r, { eligible: true, standalone: false });
    assert.deepStrictEqual(e.log.onChange[0], { eligible: true, standalone: false });
    assert.equal(e.head.children.length, 2);
    const [m, a] = e.head.children;
    assert.deepStrictEqual(m.attrs, { rel: "manifest", href: "manifest.webmanifest" });
    assert.deepStrictEqual(a.attrs, { rel: "apple-touch-icon", sizes: "180x180", href: "icons/apple-touch-icon-180.png" });
    assert.equal(e.g.count("beforeinstallprompt"), 1);
    assert.equal(e.g.count("appinstalled"), 1);
    assert.equal(e.log.register.length, 0, "load 前不註冊");
    assert.equal(e.g.listeners.load[0].opts.once, true);
    e.g.fire("load", {});
    await flush();
    assert.deepStrictEqual(e.log.register, [["./sw.js", { scope: "./", updateViaCache: "none" }]]);
    e.g.fire("load", {});
    assert.equal(e.log.register.length, 1);
  });

  test("readyState 為 complete → setTimeout 0 後註冊", () => {
    const e = env({ readyState: "complete" });
    e.inst.start({ onChange: (p) => e.onChange(p) });
    assert.equal(e.log.register.length, 0);
    assert.equal(e.log.timers.length, 1);
    assert.equal(e.log.timers[0].ms, 0);
    e.runTimers();
    assert.equal(e.log.register.length, 1);
  });

  test("start 只執行一次：再次呼叫回傳相同結果、不重複綁定與加連結", () => {
    const e = env();
    const first = e.inst.start({ onChange: (p) => e.onChange(p) });
    const second = e.inst.start({ onChange: (p) => e.onChange(p) });
    assert.deepStrictEqual(second, first);
    assert.equal(e.head.children.length, 2);
    assert.equal(e.g.count("beforeinstallprompt"), 1);
    assert.equal(e.g.count("load"), 1);
    assert.equal(e.log.onChange.length, 1);
  });

  test("已存在同 rel 連結時不重複加入", () => {
    const e = env();
    const el = e.doc.createElement("link");
    el.setAttribute("rel", "manifest");
    e.head.appendChild(el);
    e.inst.start({});
    assert.equal(e.head.children.filter((c) => c.attrs.rel === "manifest").length, 1);
    assert.equal(e.head.children.length, 2);
  });

  test("localhost 與 127.0.0.1 的 http 也啟用", () => {
    for (const href of ["http://localhost:8080/english-master-track/", "http://127.0.0.1:8080/x/"]) {
      const e = env({ href });
      assert.equal(e.inst.start({}).eligible, true, href);
    }
  });

  test("standalone（matchMedia 或 iOS navigator.standalone）→ onChange 帶 standalone: true", () => {
    const e1 = env({ standaloneMedia: true });
    assert.deepStrictEqual(e1.inst.start({ onChange: (p) => e1.onChange(p) }), { eligible: true, standalone: true });
    assert.deepStrictEqual(e1.log.onChange[0], { eligible: true, standalone: true });
    const e2 = env({ iosStandalone: true });
    assert.equal(e2.inst.start({}).standalone, true);
  });

  test("onChange 拋例外被攔下，流程照常", async () => {
    const e = env({ readyState: "complete" });
    const r = e.inst.start({ onChange: () => { throw new Error("boom"); } });
    assert.equal(r.eligible, true);
    assert.equal(e.head.children.length, 2);
    e.runTimers();
    await flush();
    assert.equal(e.log.register.length, 1);
    assert.equal(errors.length, 0);
  });
});

describe("(c) PE-3：註冊失敗靜默", () => {
  for (const kind of ["registerRejects", "registerThrows"]) {
    test(kind + " → 無 onChange、無未處理 rejection、console.error 0 次", async () => {
      const e = env({ readyState: "complete", [kind]: true });
      e.inst.start({ onChange: (p) => e.onChange(p) });
      e.runTimers();
      await flush();
      assert.equal(e.log.register.length, 1);
      assert.equal(e.log.onChange.length, 1, "只有 start 時的 eligible 回報");
      assert.equal(errors.length, 0, JSON.stringify(errors));
    });
  }
});

/** 啟動並完成註冊 */
async function registered(o = {}) {
  const e = env(Object.assign({ readyState: "complete" }, o));
  const log = e.log;
  const reg = o.reg || fakeRegistration(log, o.regOpts || {});
  e.reg = reg;
  e.sw.register = (url, opts) => {
    log.register.push([url, opts]);
    return Promise.resolve(reg);
  };
  e.inst.start({ onChange: (p) => e.onChange(p) });
  e.runTimers();
  await flush();
  return e;
}

describe("(d) 更新流程（V-PWA-10）", () => {
  test("註冊成功 → lastUpdateCheckAt；首次安裝（controller null）不設 updateAvailable", async () => {
    const e = await registered({ controller: false });
    assert.deepStrictEqual(e.log.onChange[1], { lastUpdateCheckAt: 1000 });
    // 首次安裝：updatefound → installed，但沒有 controller
    const w = fakeWorker(e.log);
    e.reg.installing = w;
    e.reg.fire("updatefound", {});
    w.setState("installed");
    assert.ok(!e.log.onChange.some((p) => p.updateAvailable === true));
    // clients.claim 造成的 controllerchange 不重新載入
    e.sw.fire("controllerchange", {});
    assert.equal(e.log.reload, 0);
  });

  test("已有 waiting 且有 controller → updateAvailable", async () => {
    const log0 = { post: [] };
    const waiting = fakeWorker(log0, "installed");
    const e = await registered({ controller: true, reg: null, regOpts: { waiting } });
    assert.deepStrictEqual(e.log.onChange[1], { lastUpdateCheckAt: 1000, updateAvailable: true });
  });

  test("updatefound → installed 且有 controller → updateAvailable（只回報一次）", async () => {
    const e = await registered({ controller: true });
    const w = fakeWorker(e.log);
    e.reg.installing = w;
    e.reg.fire("updatefound", {});
    w.setState("installing");
    assert.ok(!e.log.onChange.some((p) => p.updateAvailable));
    w.setState("installed");
    w.setState("installed");
    assert.equal(e.log.onChange.filter((p) => p.updateAvailable === true).length, 1);
  });

  test("requestReload 連按 2 次 → postMessage 恰 1 次 { type: \"SKIP_WAITING\" }；controllerchange 2 次 → reload 1 次", async () => {
    const e = await registered({ controller: true });
    const waiting = fakeWorker(e.log, "installed");
    e.reg.waiting = waiting;
    e.inst.requestReload();
    e.inst.requestReload();
    assert.equal(e.log.post.length, 1);
    assert.deepStrictEqual(e.log.post[0], { type: "SKIP_WAITING" });
    assert.deepStrictEqual(Object.keys(e.log.post[0]), ["type"]);
    assert.equal(e.log.reload, 0, "等 controllerchange 才重新載入");
    assert.ok(e.log.onChange.some((p) => p.reloadRequested === true));
    e.sw.fire("controllerchange", {});
    e.sw.fire("controllerchange", {});
    assert.equal(e.log.reload, 1);
  });

  test("未按「重新整理」時 controllerchange → reload 0 次（UP-5、UP-7）", async () => {
    const e = await registered({ controller: true });
    e.sw.fire("controllerchange", {});
    assert.equal(e.log.reload, 0);
    assert.equal(e.log.post.length, 0);
  });

  test("沒有 waiting 時 requestReload → 直接 reload 1 次，之後 controllerchange 不再 reload", async () => {
    const e = await registered({ controller: true });
    e.inst.requestReload();
    assert.equal(e.log.reload, 1);
    assert.equal(e.log.post.length, 0);
    e.sw.fire("controllerchange", {});
    assert.equal(e.log.reload, 1);
  });
});

describe("(e) UP-3：回到前景重新檢查", () => {
  test("未滿 1 小時不 update；滿 1 小時 update 1 次並更新 lastUpdateCheckAt；hidden 不檢查", async () => {
    const e = await registered({ controller: true });
    e.setClock(1000 + 3_599_999);
    e.doc.fire("visibilitychange", {});
    assert.equal(e.log.update, 0);
    e.setClock(1000 + 3_600_000);
    e.doc.visibilityState = "hidden";
    e.doc.fire("visibilitychange", {});
    assert.equal(e.log.update, 0);
    e.doc.visibilityState = "visible";
    e.doc.fire("visibilitychange", {});
    assert.equal(e.log.update, 1);
    assert.deepStrictEqual(e.log.onChange[e.log.onChange.length - 1], { lastUpdateCheckAt: 3_601_000 });
    e.doc.fire("visibilitychange", {});
    assert.equal(e.log.update, 1, "剛檢查過不再檢查");
  });

  test("update reject 靜默（UP-9 離線）", async () => {
    const e = await registered({ controller: true, regOpts: { updateRejects: true } });
    e.setClock(10_000_000);
    e.doc.fire("visibilitychange", {});
    await flush();
    assert.equal(e.log.update, 1);
    assert.ok(!e.log.onChange.some((p) => p.updateAvailable));
    assert.equal(errors.length, 0);
  });
});

/** 替身 BeforeInstallPromptEvent（FB-42） */
function bip(log, o = {}) {
  const ev = {
    prevented: 0,
    prompts: 0,
    preventDefault() {
      this.prevented++;
    },
    userChoice: o.choiceRejects ? Promise.reject(new Error("x")) : Promise.resolve({ outcome: o.outcome || "accepted" }),
  };
  if (ev.userChoice.catch) ev.userChoice.catch(() => {});
  if (!o.noPrompt) {
    ev.prompt = function () {
      ev.prompts++;
      if (log) log.order.push("prompt");
      if (o.promptThrows) throw new Error("prompt");
      return Promise.resolve();
    };
  }
  return ev;
}

describe("(f) 安裝事件（V-PWA-09）", () => {
  test("沒有 prompt 函式的事件忽略（不 preventDefault、不回報）", () => {
    const e = env();
    e.inst.start({ onChange: (p) => e.onChange(p) });
    const ev = bip(null, { noPrompt: true });
    e.g.fire("beforeinstallprompt", ev);
    assert.equal(ev.prevented, 0);
    assert.ok(!e.log.onChange.some((p) => p.installPromptAvailable));
  });

  test("有效事件 → preventDefault 1 次、installPromptAvailable: true；requestInstall 連呼 2 次 → prompt 1 次且狀態更新早於 prompt", async () => {
    const e = env();
    const order = [];
    e.inst.start({ onChange: (p) => { e.onChange(p); order.push(JSON.stringify(p)); } });
    const ev = bip({ order });
    e.g.fire("beforeinstallprompt", ev);
    assert.equal(ev.prevented, 1);
    assert.deepStrictEqual(e.log.onChange[e.log.onChange.length - 1], { installPromptAvailable: true });
    const p1 = e.inst.requestInstall();
    const p2 = e.inst.requestInstall();
    await Promise.all([p1, p2]);
    assert.equal(ev.prompts, 1);
    const hideAt = order.indexOf(JSON.stringify({ installPromptAvailable: false, installSuppressed: true }));
    assert.ok(hideAt >= 0 && hideAt < order.indexOf("prompt"), order.join(" | "));
    // 之後再來的事件一律忽略（本頁不再顯示）
    const ev2 = bip(null);
    e.g.fire("beforeinstallprompt", ev2);
    assert.equal(ev2.prevented, 0);
    assert.equal(e.log.onChange.filter((p) => p.installPromptAvailable === true).length, 1);
  });

  test("拒絕（dismissed）後同樣不再顯示", async () => {
    const e = env();
    e.inst.start({ onChange: (p) => e.onChange(p) });
    e.g.fire("beforeinstallprompt", bip(null, { outcome: "dismissed" }));
    await e.inst.requestInstall();
    e.g.fire("beforeinstallprompt", bip(null));
    assert.equal(e.log.onChange.filter((p) => p.installPromptAvailable === true).length, 1);
  });

  test("沒有事件時 requestInstall 不做事、resolve", async () => {
    const e = env();
    e.inst.start({ onChange: (p) => e.onChange(p) });
    await e.inst.requestInstall();
    assert.equal(e.log.onChange.length, 1);
  });

  test("appinstalled → suppressed，之後事件忽略", () => {
    const e = env();
    e.inst.start({ onChange: (p) => e.onChange(p) });
    e.g.fire("beforeinstallprompt", bip(null));
    e.g.fire("appinstalled", {});
    assert.deepStrictEqual(e.log.onChange[e.log.onChange.length - 1], { installPromptAvailable: false, installSuppressed: true });
    const ev = bip(null);
    e.g.fire("beforeinstallprompt", ev);
    assert.equal(ev.prevented, 0);
  });

  test("standalone 時事件忽略", () => {
    const e = env({ standaloneMedia: true });
    e.inst.start({ onChange: (p) => e.onChange(p) });
    const ev = bip(null);
    e.g.fire("beforeinstallprompt", ev);
    assert.equal(ev.prevented, 0);
    assert.ok(!e.log.onChange.some((p) => p.installPromptAvailable));
  });

  test("prompt 拋例外、userChoice reject → 靜默、Promise 不 reject、狀態維持 suppressed", async () => {
    for (const o of [{ promptThrows: true }, { choiceRejects: true }]) {
      const e = env();
      e.inst.start({ onChange: (p) => e.onChange(p) });
      e.g.fire("beforeinstallprompt", bip(null, o));
      await e.inst.requestInstall();
      await flush();
      assert.ok(e.log.onChange.some((p) => p.installSuppressed === true));
      assert.equal(errors.length, 0, JSON.stringify(errors));
    }
  });
});

describe("(g) 原始碼掃描（§7.18.8）", () => {
  /** src/app 下要打包的程式檔（排除 __tests__、pwa/） */
  function bundledFiles() {
    const out = [];
    (function walk(rel) {
      for (const d of fs.readdirSync(path.join(APP_DIR, rel), { withFileTypes: true })) {
        const r = rel ? rel + "/" + d.name : d.name;
        if (d.isDirectory()) {
          if (d.name === "__tests__" || d.name === "pwa" || d.name === "assets") continue;
          walk(r);
        } else if (d.name.endsWith(".js")) {
          out.push(r);
        }
      }
    })("");
    return out;
  }
  const src = (rel) => fs.readFileSync(path.join(APP_DIR, rel), "utf8");

  test("navigator.serviceWorker、beforeinstallprompt、appinstalled 只出現在 services/pwa.js", () => {
    const files = bundledFiles();
    assert.ok(files.includes("services/pwa.js"));
    for (const word of ["navigator.serviceWorker", "beforeinstallprompt", "appinstalled"]) {
      const hits = files.filter((f) => src(f).includes(word));
      assert.deepStrictEqual(hits, ["services/pwa.js"], word);
    }
  });

  test("caches 不出現在 src/app 任何打包檔", () => {
    const hits = bundledFiles().filter((f) => /\bcaches\b/.test(src(f)));
    assert.deepStrictEqual(hits, []);
  });

  test("services/pwa.js 無禁用 API 與 <link、<script 字樣；postMessage 只送 SKIP_WAITING", () => {
    const s = src("services/pwa.js");
    for (const word of ["localStorage", "sessionStorage", "indexedDB", "fetch(", "XMLHttpRequest", "sendBeacon", "<link", "<script", "console."]) {
      assert.ok(!s.includes(word), word);
    }
    const posts = [...s.matchAll(/postMessage\(([^)]*)\)/g)].map((m) => m[1]);
    assert.deepStrictEqual(posts, ['{ type: "SKIP_WAITING" }']);
  });

  test("瀏覽器載入（vm，無 module）：只登錄 EMT.services.pwa、不呼叫任何瀏覽器 API", () => {
    const sandbox = {};
    sandbox.self = sandbox;
    Object.defineProperty(sandbox, "navigator", { get() { throw new Error("載入時不得讀 navigator"); } });
    Object.defineProperty(sandbox, "document", { get() { throw new Error("載入時不得讀 document"); } });
    vm.createContext(sandbox);
    vm.runInContext(src("services/pwa.js"), sandbox);
    assert.equal(typeof sandbox.EMT.services.pwa.start, "function");
    assert.equal(typeof sandbox.EMT.services.pwa.requestInstall, "function");
    assert.equal(typeof sandbox.EMT.services.pwa.requestReload, "function");
  });
});
