/*
 * ad-service.test.js — 廣告環境判定、腳本載入與結果監看（FE-88）
 * 受測：services/ad.js（以 create() 注入假 document、假 script、假 MutationObserver、假計時器）
 * 依據：architecture.md v0.14 §7.25.3「啟動」「載入流程」「隱私」、§7.25.4 替身表、§10.11；
 *       契約 README §13.2 AD-4、AD-7、AD-8、AD-11、AD-12、AD-13、§13.7 V-AD-02、V-AD-04、V-AD-06
 * 涵蓋：US-50、US-51、AC-50-01、AC-50-02、AC-50-07、AC-50-08、AC-50-10、AC-51-01、AC-51-04
 *
 * 本檔的 data-ad-status、script error 都是替身模擬的行為。真實 AdSense 是否這樣回報未經連網核對（FB-73），
 * 這裡驗的是「本系統對這些訊號的反應」，不是「AdSense 會發出這些訊號」。
 */
"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const svc = require("../services/ad.js");
const A = require("../core/ad.js");
const PWA = require("../core/pwa.js");

const APP_DIR = path.join(__dirname, "..");
const SRC = fs.readFileSync(path.join(APP_DIR, "services", "ad.js"), "utf8");

const PUBLISHER = "ca-pub-4051803210893105";
const SLOT = "1234567890";
const PROD = { protocol: "https:", hostname: "jimmyfantasyworld.com" };

/** core/ad.js 的複本，只替換設定值（AD_CONFIG 已凍結；初始判定以參數傳入設定） */
function adWith(adSlotId) {
  return Object.assign({}, A, { AD_CONFIG: { publisherId: PUBLISHER, adSlotId } });
}

/** 假 ins：setStatus 模擬替身腳本設定 data-ad-status，並通知監看中的 observer */
function fakeIns(env) {
  const attrs = {};
  return {
    getAttribute: (k) => (k in attrs ? attrs[k] : null),
    setStatus(v) {
      attrs["data-ad-status"] = v;
      env.observers.filter((o) => o.target === this && !o.disconnected).forEach((o) => o.cb([{ attributeName: "data-ad-status" }]));
    }
  };
}

/**
 * 建立環境替身。adsbygoogle 以存取子計數，用來驗「未存取」。
 * @param {object} [o] location、navigator、matchMedia、status、MutationObserver、push、createThrows、appendThrows
 */
function fakeEnv(o = {}) {
  const env = {
    observers: [],
    scripts: [],
    created: [],
    appended: [],
    timers: [],
    cleared: [],
    events: [],
    initCalls: [],
    pushes: [],
    adsReads: 0,
    adsWrites: 0,
    htmlAttrs: {},
    status: o.status === undefined ? "loading" : o.status
  };
  let ads = o.ads;
  const g = {
    location: o.location === undefined ? PROD : o.location,
    navigator: o.navigator === undefined ? { onLine: true } : o.navigator,
    matchMedia: o.matchMedia === undefined ? () => ({ matches: false }) : o.matchMedia,
    document: {
      documentElement: { setAttribute: (k, v) => { env.htmlAttrs[k] = v; } },
      head: {
        appendChild(n) {
          if (o.appendThrows) throw new Error("append");
          env.appended.push(n);
          return n;
        }
      },
      createElement(tag) {
        env.created.push(tag);
        if (o.createThrows) throw new Error("create");
        const listeners = {};
        const n = {
          tag,
          listeners,
          addEventListener: (t, fn) => { (listeners[t] = listeners[t] || []).push(fn); },
          fire: (t) => (listeners[t] || []).forEach((fn) => fn({ type: t }))
        };
        if (tag === "script") env.scripts.push(n);
        return n;
      }
    },
    setTimeout(fn, ms) {
      const t = { fn, ms, id: env.timers.length + 1 };
      env.timers.push(t);
      return t.id;
    },
    clearTimeout(id) {
      env.cleared.push(id);
    }
  };
  if (o.MutationObserver !== null) {
    g.MutationObserver = o.MutationObserver || class {
      constructor(cb) { this.cb = cb; this.disconnected = false; env.observers.push(this); }
      observe(target, opts) { this.target = target; this.opts = opts; }
      disconnect() { this.disconnected = true; }
    };
  }
  Object.defineProperty(g, "adsbygoogle", {
    configurable: true,
    get() { env.adsReads++; return ads; },
    set(v) {
      env.adsWrites++;
      ads = v;
      if (o.push) ads.push = o.push;
      else {
        const orig = ads.push;
        ads.push = function (x) { env.pushes.push(x); return orig.call(this, x); };
      }
    }
  });
  env.g = g;
  env.cb = {
    initAd: (s) => env.initCalls.push(s),
    adEvent: (e) => {
      env.events.push(e);
      // 依真實 store 的轉移表更新狀態
      env.status = A.transition(env.status, e);
    },
    getStatus: () => env.status
  };
  env.runTimeout = () => {
    env.timers.filter((t) => !env.cleared.includes(t.id)).forEach((t) => t.fn());
  };
  return env;
}

/** 建立已判定為 waiting 的服務 */
function startedService(env, slot = SLOT) {
  const s = svc.create(env.g, { ad: adWith(slot), pwa: PWA });
  assert.equal(s.start(env.cb), "waiting");
  return s;
}

/** 隔離主控台錯誤輸出，回傳呼叫次數 */
function countErrors(fn) {
  const orig = console.error;
  let n = 0;
  console.error = () => { n++; };
  try {
    fn();
  } finally {
    console.error = orig;
  }
  return n;
}

describe("start：環境判定（AD-4、V-AD-01、V-AD-02）", () => {
  for (const [name, value] of [["null", null], ["空字串", ""], ["佔位文字", "TODO"], ["位數不足", "123"], ["非字串", 1234567890]]) {
    test("單元 ID " + name + " → ineligible；未 initAd、未設 data-ad-env、未建立節點、未存取廣告全域", () => {
      const env = fakeEnv();
      const s = svc.create(env.g, { ad: adWith(value), pwa: PWA });
      assert.equal(s.start(env.cb), "ineligible");
      assert.deepEqual(env.initCalls, []);
      assert.deepEqual(env.htmlAttrs, {});
      assert.deepEqual(env.created, []);
      assert.equal(env.adsReads + env.adsWrites, 0);
      // 判定不成立後即使被誤呼叫 load，也不得產生任何請求
      assert.equal(s.load({ getAttribute: () => null }), false);
      assert.deepEqual(env.created, []);
      assert.equal(env.adsReads + env.adsWrites, 0);
    });
  }

  for (const [name, loc] of [
    ["file://", { protocol: "file:", hostname: "" }],
    ["localhost", { protocol: "http:", hostname: "localhost" }],
    ["http 正式主機", { protocol: "http:", hostname: "jimmyfantasyworld.com" }],
    ["www", { protocol: "https:", hostname: "www.jimmyfantasyworld.com" }],
    ["github.io", { protocol: "https:", hostname: "x.github.io" }]
  ]) {
    test("位置 " + name + " → ineligible", () => {
      const env = fakeEnv({ location: loc });
      assert.equal(svc.create(env.g, { ad: adWith(SLOT), pwa: PWA }).start(env.cb), "ineligible");
      assert.deepEqual(env.initCalls, []);
    });
  }

  test("位置不成立時不查詢獨立視窗（前面條件不成立就不碰後面的環境物件）", () => {
    let media = 0;
    const env = fakeEnv({ location: { protocol: "file:", hostname: "" }, matchMedia: () => { media++; return { matches: false }; } });
    svc.create(env.g, { ad: adWith(SLOT), pwa: PWA }).start(env.cb);
    assert.equal(media, 0);
  });

  test("正式網址 + 瀏覽器分頁 + 已設定 → waiting；initAd 1 次、設 data-ad-env", () => {
    const env = fakeEnv();
    assert.equal(startedService(env) && env.initCalls.length, 1);
    assert.deepEqual(env.initCalls, ["waiting"]);
    assert.equal(env.htmlAttrs["data-ad-env"], "1");
    assert.deepEqual(env.created, [], "start 階段不建立節點");
    assert.equal(env.adsReads + env.adsWrites, 0, "start 階段不存取廣告全域");
  });

  test("獨立視窗（display-mode 或 iOS navigator.standalone）→ ineligible（E-147）", () => {
    const a = fakeEnv({ matchMedia: () => ({ matches: true }) });
    assert.equal(svc.create(a.g, { ad: adWith(SLOT), pwa: PWA }).start(a.cb), "ineligible");
    const b = fakeEnv({ navigator: { onLine: true, standalone: true } });
    assert.equal(svc.create(b.g, { ad: adWith(SLOT), pwa: PWA }).start(b.cb), "ineligible");
  });

  test("matchMedia 拋例外或不可用：無法確認不是獨立視窗 → ineligible（AD-4 例外視為不成立）", () => {
    const a = fakeEnv({ matchMedia: () => { throw new Error("x"); } });
    assert.equal(svc.create(a.g, { ad: adWith(SLOT), pwa: PWA }).start(a.cb), "ineligible");
    const b = fakeEnv({ matchMedia: "not-a-function" });
    assert.equal(svc.create(b.g, { ad: adWith(SLOT), pwa: PWA }).start(b.cb), "ineligible");
  });

  test("location 取用拋例外 → ineligible，不拋出、不輸出錯誤", () => {
    const env = fakeEnv();
    Object.defineProperty(env.g, "location", { get() { throw new Error("x"); } });
    const errors = countErrors(() => {
      assert.equal(svc.create(env.g, { ad: adWith(SLOT), pwa: PWA }).start(env.cb), "ineligible");
    });
    assert.equal(errors, 0);
  });

  test("initAd 拋例外 → 視為不成立，不設 data-ad-env，load 不動作", () => {
    const env = fakeEnv();
    env.cb.initAd = () => { throw new Error("x"); };
    const s = svc.create(env.g, { ad: adWith(SLOT), pwa: PWA });
    assert.equal(s.start(env.cb), "ineligible");
    assert.deepEqual(env.htmlAttrs, {});
    assert.equal(s.load({ getAttribute: () => null }), false);
    assert.deepEqual(env.created, []);
  });

  test("start 只生效 1 次", () => {
    const env = fakeEnv();
    const s = startedService(env);
    assert.equal(s.start(env.cb), "waiting");
    assert.equal(env.initCalls.length, 1);
  });

  test("以真實 core/ad.js 的預設設定啟動：結果只由 isSlotConfigured 決定（不寫死 AD_SLOT_ID 的值，AC-50-05）", () => {
    const env = fakeEnv();
    const expected = A.isSlotConfigured(A.AD_CONFIG) ? "waiting" : "ineligible";
    assert.equal(svc.create(env.g).start(env.cb), expected);
  });
});

describe("load：載入流程（AD-7、AD-11、§7.25.3）", () => {
  test("順序：監看 → 計時 → 加入腳本 → push；腳本屬性依 AD-7；push 參數恆為空物件", () => {
    const env = fakeEnv();
    const s = startedService(env);
    const ins = fakeIns(env);
    assert.equal(s.load(ins), true);

    assert.equal(env.observers.length, 1);
    assert.equal(env.observers[0].target, ins);
    assert.deepEqual(env.observers[0].opts.attributeFilter, ["data-ad-status"]);
    assert.equal(env.timers.length, 1);
    assert.equal(env.timers[0].ms, A.AD_LOAD_TIMEOUT_MS);
    assert.equal(A.AD_LOAD_TIMEOUT_MS, 10000);

    assert.equal(env.scripts.length, 1);
    const sc = env.scripts[0];
    assert.equal(sc.async, true);
    assert.equal(sc.crossOrigin, "anonymous");
    assert.equal(sc.src, A.AD_SCRIPT_URL);
    assert.equal(env.appended[0], sc);

    assert.equal(env.pushes.length, 1);
    assert.deepEqual(env.pushes[0], {});
    assert.equal(Object.keys(env.pushes[0]).length, 0);
    assert.deepEqual(env.events, [], "尚未有結果");
  });

  test("重複呼叫 load：腳本與 push 仍各 1 次（AD-7、AD-9）", () => {
    const env = fakeEnv();
    const s = startedService(env);
    const ins = fakeIns(env);
    assert.equal(s.load(ins), true);
    assert.equal(s.load(ins), false);
    assert.equal(s.load(fakeIns(env)), false);
    assert.equal(env.scripts.length, 1);
    assert.equal(env.pushes.length, 1);
    assert.equal(env.observers.length, 1);
  });

  test("window.adsbygoogle 已存在：沿用，不覆蓋成新陣列", () => {
    const existing = [];
    const env = fakeEnv({ ads: existing });
    const s = startedService(env);
    s.load(fakeIns(env));
    assert.equal(env.g.adsbygoogle, existing);
    assert.equal(existing.length, 1);
  });

  test("狀態不是 loading 時呼叫 load：不加入腳本", () => {
    for (const status of ["waiting", "collapsed", "dismissed", "filled"]) {
      const env = fakeEnv({ status });
      const s = startedService(env);
      assert.equal(s.load(fakeIns(env)), false);
      assert.deepEqual(env.created, []);
      assert.equal(env.adsReads + env.adsWrites, 0);
    }
  });

  test("沒有廣告框 → collapse，不加入腳本", () => {
    const env = fakeEnv();
    const s = startedService(env);
    assert.equal(s.load(null), false);
    assert.deepEqual(env.events, ["collapse"]);
    assert.deepEqual(env.created, []);
  });
});

describe("結果判定（AD-8、V-AD-04；以替身訊號驗）", () => {
  function loaded(o) {
    const env = fakeEnv(o);
    const s = startedService(env);
    const ins = fakeIns(env);
    const r = s.load(ins);
    return { env, s, ins, r };
  }

  /** 結束後必須已解除監看、清除計時 */
  function assertFinished(env) {
    assert.ok(env.observers.every((o) => o.disconnected), "observer 已 disconnect");
    assert.ok(env.timers.every((t) => env.cleared.includes(t.id)), "計時已清除");
  }

  test("data-ad-status = filled → filled；之後的 unfilled、逾時、error 都不改變結果", () => {
    const { env, ins } = loaded();
    ins.setStatus("filled");
    assert.deepEqual(env.events, ["filled"]);
    assert.equal(env.status, "filled");
    assertFinished(env);
    ins.setStatus("unfilled");
    env.runTimeout();
    env.scripts[0].fire("error");
    assert.deepEqual(env.events, ["filled"]);
  });

  test("data-ad-status = unfilled → collapse", () => {
    const { env, ins } = loaded();
    ins.setStatus("unfilled");
    assert.deepEqual(env.events, ["collapse"]);
    assert.equal(env.status, "collapsed");
    assertFinished(env);
  });

  test("未知的 data-ad-status 值：繼續等待", () => {
    const { env, ins } = loaded();
    ins.setStatus("pending");
    assert.deepEqual(env.events, []);
    assert.equal(env.status, "loading");
    ins.setStatus("filled");
    assert.deepEqual(env.events, ["filled"]);
  });

  test("腳本 error 事件 → collapse", () => {
    const { env } = loaded();
    env.scripts[0].fire("error");
    assert.deepEqual(env.events, ["collapse"]);
    assertFinished(env);
  });

  test("push 拋例外 → collapse，不重試，不輸出錯誤", () => {
    let calls = 0;
    let errors = 0;
    const env = fakeEnv({ push() { calls++; throw new Error("x"); } });
    errors = countErrors(() => {
      const s = startedService(env);
      assert.equal(s.load(fakeIns(env)), false);
    });
    assert.equal(calls, 1);
    assert.equal(errors, 0);
    assert.deepEqual(env.events, ["collapse"]);
    assertFinished(env);
  });

  test("建立或附加腳本拋例外 → collapse，不 push", () => {
    for (const o of [{ createThrows: true }, { appendThrows: true }]) {
      const env = fakeEnv(o);
      const s = startedService(env);
      assert.equal(s.load(fakeIns(env)), false);
      assert.deepEqual(env.events, ["collapse"]);
      assert.equal(env.pushes.length, 0);
    }
  });

  test("10 秒無回應 → collapse；逾時後才到的 filled 被忽略（AC-51-01 (e)）", () => {
    const { env, ins } = loaded();
    env.runTimeout();
    assert.deepEqual(env.events, ["collapse"]);
    assert.equal(env.status, "collapsed");
    assertFinished(env);
    ins.setStatus("filled");
    assert.deepEqual(env.events, ["collapse"]);
    assert.equal(env.status, "collapsed");
  });

  test("逾時後才到的 filled：即使 observer 仍送達，狀態檢查也會忽略（雙重保護）", () => {
    const { env, ins } = loaded();
    env.runTimeout();
    env.observers.forEach((o) => { o.disconnected = false; });
    ins.setStatus("filled");
    assert.deepEqual(env.events, ["collapse"]);
  });

  test("等待中被隱藏（dismissed）：之後的任何結果都不回報", () => {
    for (const late of ["filled", "unfilled"]) {
      const { env, ins } = loaded();
      env.status = "dismissed";
      ins.setStatus(late);
      assert.deepEqual(env.events, []);
      assert.equal(env.status, "dismissed");
      assertFinished(env);
    }
    const { env } = loaded();
    env.status = "dismissed";
    env.runTimeout();
    assert.deepEqual(env.events, []);
  });

  test("沒有 MutationObserver：仍會加入腳本，結果收斂到逾時 collapse", () => {
    const { env, r } = loaded({ MutationObserver: null });
    assert.equal(r, true);
    env.runTimeout();
    assert.deepEqual(env.events, ["collapse"]);
  });

  test("MutationObserver 建構拋例外 → collapse，不加入腳本", () => {
    const { env, r } = loaded({ MutationObserver: class { constructor() { throw new Error("x"); } } });
    assert.equal(r, false);
    assert.deepEqual(env.events, ["collapse"]);
    assert.deepEqual(env.created, []);
  });

  test("任何結果都不再建立新腳本或再次 push（不重試）", () => {
    const { env } = loaded();
    env.scripts[0].fire("error");
    env.runTimeout();
    assert.equal(env.scripts.length, 1);
    assert.equal(env.pushes.length, 1);
    assert.equal(env.timers.length, 1);
  });

  test("adEvent 或 getStatus 拋例外：靜默，不往外拋、不輸出錯誤", () => {
    const env = fakeEnv();
    const s = startedService(env);
    const ins = fakeIns(env);
    s.load(ins);
    env.cb.adEvent = () => { throw new Error("x"); };
    const errors = countErrors(() => ins.setStatus("filled"));
    assert.equal(errors, 0);
  });
});

describe("靜態規則（AD-8、AD-11、AD-12、AD-13、LD-2）", () => {
  /** 去掉註解的原始碼 */
  const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  test("不取用 store 與學習資料（AD-11）", () => {
    for (const re of [/EMT\.store/, /getState/, /state\.data/, /\.runtime/, /masteredWordKeys/, /part5/]) {
      assert.doesNotMatch(CODE, re);
    }
  });

  test("push 的參數只有空物件字面值", () => {
    const pushes = CODE.match(/\.push\(/g) || [];
    assert.equal(pushes.length, 1);
    assert.match(CODE, /\.push\(\{\}\)/);
  });

  test("不輸出到主控台、不寫瀏覽器儲存、不發其他請求、無同意視窗邏輯（AD-8、AD-13、DS-56）", () => {
    for (const re of [/console\./, /localStorage/, /sessionStorage/, /indexedDB/, /document\.cookie/, /fetch\(/, /XMLHttpRequest/, /sendBeacon/, /consent/i]) {
      assert.doesNotMatch(CODE, re);
    }
  });

  test("不含靜態廣告標籤與 HTML 字面值（FORBIDDEN_PATTERNS）", () => {
    assert.doesNotMatch(SRC, /<ins\b/i);
    assert.doesNotMatch(SRC, /<script/i);
    assert.doesNotMatch(SRC, /<iframe/i);
    assert.doesNotMatch(SRC, /cdn\./i);
  });

  test("腳本網址只取自 AD_SCRIPT_URL，本檔不另外寫死", () => {
    assert.doesNotMatch(SRC, /googlesyndication/);
    assert.doesNotMatch(SRC, /ca-pub-/);
  });

  test("載入本檔不存取瀏覽器 API（LD-2）", () => {
    const touched = [];
    const self = new Proxy({}, {
      get(t, k) {
        if (k !== "EMT") touched.push(String(k));
        return t[k];
      }
    });
    vm.runInContext(SRC, vm.createContext({ self }), { filename: "services/ad.js" });
    assert.deepEqual(touched, []);
    assert.equal(typeof self.EMT.services.ad.start, "function");
  });
});
