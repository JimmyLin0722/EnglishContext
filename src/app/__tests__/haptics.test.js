/*
 * haptics.test.js — 答題震動服務單元測試（FE-29）
 * 受測：services/haptics.js（EMT.services.haptics.vibrate）
 * 依據：architecture.md v0.4 §4.5、§7.11（A-3）、§7.12、§10.1
 * 涵蓋：AC-29-02、AC-29-03、AC-31-03
 * 做法：Node 下以第 2 個參數注入替身 navigator；另以 vm 沙箱模擬瀏覽器（全域 navigator、EMT.core.interaction）。
 */
"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const H = require("../services/haptics.js");
const ia = require("../core/interaction.js");

/** 替身 navigator：記錄 vibrate 呼叫 */
function fakeNav(ret) {
  const calls = [];
  return {
    calls,
    vibrate(p) {
      calls.push(p);
      return ret === undefined ? true : ret;
    }
  };
}

/** 監看 console.error 是否被呼叫 */
function watchConsoleError(fn) {
  const orig = console.error;
  let n = 0;
  console.error = () => { n += 1; };
  try {
    fn();
  } finally {
    console.error = orig;
  }
  return n;
}

describe("haptics.test.js", () => {
  test("答對：呼叫 1 次、參數 = vibratePattern(\"correct\")、回傳 true", () => {
    const nav = fakeNav();
    assert.equal(H.vibrate("correct", nav), true);
    assert.equal(nav.calls.length, 1);
    assert.equal(nav.calls[0], ia.vibratePattern("correct"));
    assert.ok(ia.patternTotal(nav.calls[0]) <= 200);
  });

  test("答錯：呼叫 1 次、參數 = vibratePattern(\"wrong\")（兩下，總長 ≤ 200 ms）", () => {
    const nav = fakeNav();
    assert.equal(H.vibrate("wrong", nav), true);
    assert.equal(nav.calls.length, 1);
    assert.deepEqual([...nav.calls[0]], [...ia.vibratePattern("wrong")]);
    assert.ok(ia.patternTotal(nav.calls[0]) <= 200);
  });

  test("navigator 或 vibrate 不存在 → 回 false、不拋出、不 console.error（AC-29-03）", () => {
    const n = watchConsoleError(() => {
      assert.equal(H.vibrate("correct", undefined), false);
      assert.equal(H.vibrate("correct", null), false);
      assert.equal(H.vibrate("wrong", {}), false);
      assert.equal(H.vibrate("wrong", { vibrate: "yes" }), false);
    });
    assert.equal(n, 0);
  });

  test("vibrate 拋例外或回傳 false → 回 false、不拋出、不 console.error", () => {
    const n = watchConsoleError(() => {
      const throwing = { vibrate() { throw new Error("NotAllowedError"); } };
      assert.doesNotThrow(() => H.vibrate("correct", throwing));
      assert.equal(H.vibrate("correct", throwing), false);
      const refused = fakeNav(false);
      assert.equal(H.vibrate("wrong", refused), false);
      assert.equal(refused.calls.length, 1);
    });
    assert.equal(n, 0);
  });

  test("不合法的 kind → 回 false 且不呼叫 vibrate", () => {
    const nav = fakeNav();
    assert.equal(H.vibrate("maybe", nav), false);
    assert.equal(H.vibrate(undefined, nav), false);
    assert.equal(nav.calls.length, 0);
  });

  test("瀏覽器模擬（vm）：載入時不讀其他模組；呼叫時用全域 navigator，且不受減少動態影響", () => {
    const src = fs.readFileSync(path.join(__dirname, "..", "services", "haptics.js"), "utf8");
    const nav = fakeNav();
    const sandbox = {
      navigator: nav,
      // 減少動態為真也照常震動（AC-31-03）
      matchMedia: () => ({ matches: true }),
      console: { error() { throw new Error("不應呼叫 console.error"); } }
    };
    sandbox.self = sandbox;
    vm.createContext(sandbox);
    // 載入時 EMT.core.interaction 尚未存在也不得出錯（LD-2）
    vm.runInContext(src, sandbox);
    assert.equal(typeof sandbox.EMT.services.haptics.vibrate, "function");
    sandbox.EMT.core = { interaction: ia };
    assert.equal(sandbox.EMT.services.haptics.vibrate("correct"), true);
    assert.equal(nav.calls.length, 1);
    assert.equal(nav.calls[0], ia.UI.VIBRATE_CORRECT);
  });

  test("瀏覽器模擬（vm）：沒有 navigator.vibrate（如 iOS Safari）→ 回 false", () => {
    const src = fs.readFileSync(path.join(__dirname, "..", "services", "haptics.js"), "utf8");
    const sandbox = { navigator: {} };
    sandbox.self = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(src, sandbox);
    sandbox.EMT.core = { interaction: ia };
    assert.equal(sandbox.EMT.services.haptics.vibrate("wrong"), false);
  });

  test("navigator.vibrate 在 src/app 程式中只出現在 services/haptics.js", () => {
    const appDir = path.join(__dirname, "..");
    const hits = [];
    (function walk(dir) {
      for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) {
          if (ent.name !== "__tests__") walk(p);
        } else if (ent.name.endsWith(".js") && /navigator\.vibrate/.test(fs.readFileSync(p, "utf8"))) {
          hits.push(path.relative(appDir, p).split(path.sep).join("/"));
        }
      }
    })(appDir);
    assert.deepEqual(hits, ["services/haptics.js"]);
  });
});
