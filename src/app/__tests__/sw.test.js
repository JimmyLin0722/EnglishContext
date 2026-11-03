/*
 * sw.test.js — service worker 範本單元測試（FE-46）
 * 受測：pwa/sw.template.js（以測試內小函式做與建置 B-15 相同的兩個替換，在 node:vm 沙箱以替身執行）
 * 依據：architecture.md v0.7 §7.18.3、§5.1 B-15、§10.4「sw.test.js」列；契約 README §10.6 SW-1～SW-11、§10.11 V-PWA-05
 * 涵蓋：AC-21-03、AC-35-01、AC-35-02、AC-35-03、AC-35-05、AC-36-03、AC-36-05、AC-36-06、AC-37-05
 */
"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const pwa = require("../core/pwa.js");

const TEMPLATE_FILE = path.join(__dirname, "..", "pwa", "sw.template.js");
const TEMPLATE = fs.readFileSync(TEMPLATE_FILE, "utf8").replace(/^﻿/, "");
const BUILD_ID = "0123456789abcdef";
const CACHE_NAME = pwa.PWA_CACHE_PREFIX + BUILD_ID;
const SW_URL = "https://u.github.io/p/sw.js";
const BASE = "https://u.github.io/p/";

/** 與建置 B-15 相同的兩個替換 */
function inject(template, buildId) {
  return template
    .replace("@@BUILD_ID@@", buildId)
    .replace("/* @@PRECACHE_URLS@@ */", pwa.PWA_PRECACHE_URLS.map((u) => JSON.stringify(u)).join(", "));
}

// ── 替身 ──

function fakeResponse(url, opts = {}) {
  const status = opts.status === undefined ? 200 : opts.status;
  const body = opts.body !== undefined ? opts.body : "body:" + url;
  return {
    url,
    status,
    ok: status >= 200 && status < 300,
    redirected: !!opts.redirected,
    body,
    clones: 0,
    clone() {
      this.clones++;
      return fakeResponse(url, { status, body, redirected: opts.redirected });
    },
  };
}

class FakeCache {
  constructor(log) {
    this.map = new Map();
    this.log = log;
  }
  put(req, res) {
    const key = new URL(typeof req === "string" ? req : req.url, SW_URL).href;
    this.log.puts.push(key);
    this.map.set(key, res);
    return Promise.resolve();
  }
  match(req, opts) {
    const key = new URL(typeof req === "string" ? req : req.url, SW_URL).href;
    this.log.matches.push({ key, opts });
    return Promise.resolve(this.map.get(key));
  }
}

/**
 * 建立沙箱並執行注入後的 sw.js。
 * @param {{ fail?: Record<string, {status?: number, redirected?: boolean, reject?: boolean}>, existing?: string[] }} [o]
 */
function setup(o = {}) {
  const log = { fetches: [], puts: [], matches: [], deleted: [], opened: [], skip: 0, claim: 0, order: [] };
  const listeners = {};
  const store = new Map();
  for (const name of o.existing || []) store.set(name, new FakeCache(log));

  const caches = {
    open(name) {
      log.opened.push(name);
      if (!store.has(name)) store.set(name, new FakeCache(log));
      return Promise.resolve(store.get(name));
    },
    keys() {
      return Promise.resolve([...store.keys()]);
    },
    delete(name) {
      log.deleted.push(name);
      log.order.push("delete:" + name);
      return Promise.resolve(store.delete(name));
    },
    has(name) {
      return Promise.resolve(store.has(name));
    },
  };

  function Request(url, init = {}) {
    this.url = new URL(url, SW_URL).href;
    this.cache = init.cache;
    this.method = init.method || "GET";
  }

  function fetch(req) {
    const url = typeof req === "string" ? new URL(req, SW_URL).href : req.url;
    log.fetches.push({ url, cache: req && req.cache, method: req && req.method });
    const f = (o.fail || {})[url];
    if (f && f.reject) return Promise.reject(new TypeError("offline"));
    return Promise.resolve(fakeResponse(url, f || {}));
  }

  const self = {
    location: { href: SW_URL },
    addEventListener(type, fn) {
      (listeners[type] = listeners[type] || []).push(fn);
    },
    skipWaiting() {
      log.skip++;
      return Promise.resolve();
    },
    clients: {
      claim() {
        log.claim++;
        log.order.push("claim");
        return Promise.resolve();
      },
    },
  };

  const sandbox = { self, caches, fetch, Request, URL };
  vm.createContext(sandbox);
  vm.runInContext(inject(TEMPLATE, BUILD_ID), sandbox, { filename: "sw.js" });

  function fire(type, ev) {
    for (const fn of listeners[type] || []) fn(ev);
  }

  return { log, listeners, store, fire, sandbox };
}

function extendable() {
  return {
    promise: null,
    waitUntil(p) {
      this.promise = p;
    },
  };
}

function fetchEvent(url, method = "GET") {
  return {
    request: { url, method },
    calls: 0,
    promise: null,
    respondWith(p) {
      this.calls++;
      this.promise = p;
    },
  };
}

const ABS = pwa.PWA_PRECACHE_URLS.map((u) => new URL(u, SW_URL).href);

describe("設定區與監聽", () => {
  test("注入後 BUILD_ID、CACHE_NAME、PRECACHE_URLS 正確", () => {
    const { sandbox } = setup();
    assert.equal(sandbox.BUILD_ID, BUILD_ID);
    assert.equal(sandbox.CACHE_NAME, CACHE_NAME);
    assert.deepStrictEqual([...sandbox.PRECACHE_URLS], [...pwa.PWA_PRECACHE_URLS]);
  });

  test("只註冊 install、activate、fetch、message 各 1 次", () => {
    const { listeners } = setup();
    assert.deepStrictEqual(Object.keys(listeners).sort(), ["activate", "fetch", "install", "message"]);
    for (const k of Object.keys(listeners)) assert.equal(listeners[k].length, 1, k);
  });
});

describe("install（SW-4）", () => {
  test("fetch 6 次皆 cache: \"reload\"；快取 7 個鍵；./ 與 ./index.html 內容相同；skipWaiting 0 次", async () => {
    const { log, store, fire } = setup();
    const ev = extendable();
    fire("install", ev);
    assert.ok(ev.promise, "必須呼叫 waitUntil");
    await ev.promise;
    assert.equal(log.fetches.length, 6);
    for (const f of log.fetches) assert.equal(f.cache, "reload");
    assert.ok(!log.fetches.some((f) => f.url === BASE), "./ 不另發請求");
    assert.deepStrictEqual(log.opened, [CACHE_NAME]);
    const cache = store.get(CACHE_NAME);
    assert.deepStrictEqual([...cache.map.keys()].sort(), [...ABS].sort());
    assert.equal(cache.map.get(BASE).body, cache.map.get(BASE + "index.html").body);
    assert.equal(log.skip, 0);
    assert.equal(log.deleted.length, 0);
  });

  for (const [label, fail] of [
    ["404", { status: 404 }],
    ["轉址", { redirected: true }],
    ["網路錯誤", { reject: true }],
  ]) {
    test(`任一回應 ${label} → 刪除本版快取且 install Promise reject；skipWaiting 0 次`, async () => {
      const { log, store, fire } = setup({ fail: { [BASE + "icons/icon-512.png"]: fail } });
      const ev = extendable();
      fire("install", ev);
      await assert.rejects(ev.promise);
      assert.deepStrictEqual(log.deleted, [CACHE_NAME]);
      assert.equal(store.has(CACHE_NAME), false);
      assert.equal(log.skip, 0);
    });
  }
});

describe("activate（SW-5、SW-9）", () => {
  test("刪除舊前綴快取，保留非前綴與目前快取，之後 clients.claim 1 次", async () => {
    const { log, store, fire } = setup({
      existing: ["english-master-track-pwa-old", "other-project-cache", CACHE_NAME, "english-master-track-pwa-0000000000000000"],
    });
    const ev = extendable();
    fire("activate", ev);
    await ev.promise;
    assert.deepStrictEqual(log.deleted.sort(), ["english-master-track-pwa-0000000000000000", "english-master-track-pwa-old"]);
    assert.ok(store.has("other-project-cache"));
    assert.ok(store.has(CACHE_NAME));
    assert.equal(log.claim, 1);
    assert.equal(log.order[log.order.length - 1], "claim", "claim 在刪除之後");
    assert.equal(log.puts.length, 0, "activate 不寫入快取");
  });
});

describe("fetch（SW-6、SW-7）", () => {
  test("7 個預先快取網址的 GET 皆 respondWith（含帶 hash）", () => {
    const { fire } = setup();
    for (const u of [...ABS, BASE + "index.html#top", BASE + "#x"]) {
      const ev = fetchEvent(u);
      fire("fetch", ev);
      assert.equal(ev.calls, 1, u);
    }
  });

  test("POST、跨來源、帶查詢字串、sw.js、ads.txt、/favicon.ico 皆不攔截", () => {
    const { fire } = setup();
    const cases = [
      [BASE + "index.html", "POST"],
      ["https://evil.example/p/index.html", "GET"],
      ["https://u.github.io/index.html", "GET"],
      [BASE + "index.html?x=1", "GET"],
      [BASE + "?x=1", "GET"],
      [BASE + "sw.js", "GET"],
      [BASE + "ads.txt", "GET"],
      ["https://u.github.io/favicon.ico", "GET"],
      [BASE + "icons/", "GET"],
    ];
    for (const [u, m] of cases) {
      const ev = fetchEvent(u, m);
      fire("fetch", ev);
      assert.equal(ev.calls, 0, `${m} ${u}`);
    }
  });

  test("命中 → 回傳快取（以去 hash 網址、ignoreVary 比對）；不另發網路請求", async () => {
    const { log, fire } = setup();
    const inst = extendable();
    fire("install", inst);
    await inst.promise;
    const fetchesBefore = log.fetches.length;
    const putsBefore = log.puts.length;
    const ev = fetchEvent(BASE + "#a");
    fire("fetch", ev);
    const res = await ev.promise;
    assert.equal(res.body, "body:" + BASE + "index.html");
    assert.equal(log.fetches.length, fetchesBefore);
    assert.equal(log.puts.length, putsBefore);
    const m = log.matches[log.matches.length - 1];
    assert.equal(m.key, BASE);
    assert.deepStrictEqual({ ...m.opts }, { ignoreVary: true });
  });

  test("未命中 → fetch 轉送且不寫入快取", async () => {
    const { log, fire } = setup();
    const ev = fetchEvent(BASE + "manifest.webmanifest");
    fire("fetch", ev);
    const res = await ev.promise;
    assert.equal(res.url, BASE + "manifest.webmanifest");
    assert.equal(log.fetches.length, 1);
    assert.equal(log.puts.length, 0);
  });
});

describe("message（SW-8）", () => {
  test("恰為 { type: \"SKIP_WAITING\" } → skipWaiting 1 次", () => {
    const { log, fire } = setup();
    fire("message", { data: { type: "SKIP_WAITING" } });
    assert.equal(log.skip, 1);
  });

  test("多鍵、字串、null、陣列、其他 type、無 data → 0 次", () => {
    const { log, fire } = setup();
    for (const data of [{ type: "SKIP_WAITING", x: 1 }, "SKIP_WAITING", null, ["SKIP_WAITING"], { type: "skip_waiting" }, {}, undefined]) {
      fire("message", { data });
    }
    fire("message", undefined);
    assert.equal(log.skip, 0);
  });
});

describe("範本原始碼掃描（V-PWA-05、B-15、SW-10）", () => {
  test("佔位各恰 1 次，全檔無其他 @@", () => {
    assert.equal(TEMPLATE.split("@@BUILD_ID@@").length - 1, 1);
    assert.equal(TEMPLATE.split("/* @@PRECACHE_URLS@@ */").length - 1, 1);
    const rest = TEMPLATE.replace("@@BUILD_ID@@", "").replace("/* @@PRECACHE_URLS@@ */", "");
    assert.ok(!rest.includes("@@"));
    assert.ok(!inject(TEMPLATE, BUILD_ID).includes("@@"));
  });

  test("設定區逐字", () => {
    for (const line of [
      'var BUILD_ID = "@@BUILD_ID@@";',
      'var CACHE_PREFIX = "english-master-track-pwa-";',
      "var CACHE_NAME = CACHE_PREFIX + BUILD_ID;",
      "var PRECACHE_URLS = [/* @@PRECACHE_URLS@@ */];",
    ]) {
      assert.equal(TEMPLATE.split(line).length - 1, 1, line);
    }
  });

  test("無 B-15 禁用字串（含註解）", () => {
    const banned = [
      "importScripts", "indexedDB", "localStorage", "sessionStorage", '"push"', '"sync"', "periodicsync",
      "notificationclick", "backgroundfetch", "BroadcastChannel", "navigationPreload", "caches.match(",
      "http://", "https://", "console.", "postMessage", "clients.matchAll", "matchAll",
    ];
    for (const s of banned) assert.ok(!TEMPLATE.includes(s), s);
    assert.ok(!/\bself\.on/.test(TEMPLATE), "不得以 self.on… 指派事件");
  });

  test("addEventListener 型別恰為 4 種各 1 次", () => {
    const types = [...TEMPLATE.matchAll(/addEventListener\(\s*["']([^"']+)["']/g)].map((m) => m[1]);
    assert.deepStrictEqual(types.sort(), ["activate", "fetch", "install", "message"]);
    assert.equal((TEMPLATE.match(/addEventListener/g) || []).length, 4);
  });

  test("只用 self.addEventListener 註冊", () => {
    const all = [...TEMPLATE.matchAll(/(\S*)addEventListener\(/g)].map((m) => m[1]);
    for (const prefix of all) assert.equal(prefix, "self.");
  });
});
