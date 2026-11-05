/*
 * first-run.test.js — 首次進入流程：共用匯入流程、應用殼屬性與首次模式樣式（FE-32）
 * 依據：architecture.md v0.4 §4.2（index.html 屬性、main.js 啟動順序）、§4.5（importFlow）、§7.9、§10.1（first-run.test.js 列）；
 *       契約 ImportResult、ImportErrorCode、README §5.5 FS-1～FS-7、§6.2、IM-3、IM-5、IM-6
 * 涵蓋：US-25；AC-25-01、AC-25-07、AC-25-10、AC-25-11、AC-24-04～AC-24-09（文字）、AC-20-03（首次不顯示導覽）
 * 做法：
 * - messageOf 與 views/dashboard.js 的 importMessage 逐一比對（兩處文字不得分歧）。
 * - importFlow.start 以 node:vm 沙箱載入，假 DOM（input、body）、假 FileReader、假 dialog／toast；
 *   另以 _fixtures.makeStore({ firstRun: true }) 的真實 store 驗證還原成功與失敗後的 entryMode 與主鍵。
 * - index.html、00-base.css、main.js 靜態檢查。
 */
"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const F = require("./_fixtures.js");
const APP_DIR = F.APP_DIR;
const flowNode = require(path.join(APP_DIR, "ui", "import-flow.js"));
const dashboard = require(path.join(APP_DIR, "views", "dashboard.js"));
const C = require(path.join(APP_DIR, "core", "constants.js"));

const MAIN_KEY = C.STORAGE_KEYS.state;

/** 讀取原始碼（去除 BOM） */
function source(rel) {
  return fs.readFileSync(path.join(APP_DIR, rel), "utf8").replace(/^﻿/, "");
}

// ─────────────────────────────────────────────────────────────
// messageOf（§4.5：文字與 dashboard.importMessage 完全相同）
// ─────────────────────────────────────────────────────────────

describe("first-run.test.js：importFlow.messageOf", () => {
  const CASES = [
    ["ok 略過 0", { ok: true, skipped: 0 }],
    ["ok 略過 3", { ok: true, skipped: 3 }],
    ["ok 略過缺漏", { ok: true }],
    ["format", { ok: false, error: "format" }],
    ["version 2.5", { ok: false, error: "version", fileVersion: 2.5 }],
    ["version null", { ok: false, error: "version", fileVersion: null }],
    ["version 3", { ok: false, error: "version", fileVersion: 3 }],
    ["version 缺 fileVersion", { ok: false, error: "version" }],
    ["quota", { ok: false, error: "quota" }],
    ["write_failed", { ok: false, error: "write_failed" }],
    ["未預期錯誤碼", { ok: false, error: "weird" }],
    ["null", null],
    ["非物件", "x"]
  ];

  for (const [name, r] of CASES) {
    test("與 dashboard.importMessage 完全相同：" + name, () => {
      assert.deepEqual(flowNode.messageOf(r), dashboard.importMessage(r));
    });
  }

  test("cancelled → null（不提示，AC-25-11 (a)）", () => {
    assert.equal(flowNode.messageOf({ ok: false, error: "cancelled" }), null);
    assert.equal(dashboard.importMessage({ ok: false, error: "cancelled" }), null);
  });

  test("逐字內容（AC-24-05、AC-24-06、AC-24-09、IM-3、IM-6）", () => {
    assert.deepEqual(flowNode.messageOf({ ok: true, skipped: 3 }), { text: "已匯入，略過 3 筆", kind: "success" });
    assert.deepEqual(flowNode.messageOf({ ok: false, error: "format" }), { text: "備份檔格式錯誤，未匯入", kind: "error" });
    assert.equal(flowNode.messageOf({ ok: false, error: "version", fileVersion: 2.5 }).text,
      "備份檔版本不相容（檔案版本：2.5；支援版本：1、2、3）");
    assert.equal(flowNode.messageOf({ ok: false, error: "version", fileVersion: null }).text,
      "備份檔版本不相容（檔案版本：無；支援版本：1、2、3）");
    assert.equal(flowNode.messageOf({ ok: false, error: "quota" }).text, "儲存空間不足，未匯入");
    assert.equal(flowNode.messageOf({ ok: false, error: "write_failed" }).text, "儲存失敗，未匯入");
  });

  test("匯入相關 TEXT 與 dashboard.TEXT 逐字相同", () => {
    for (const k of Object.keys(flowNode.TEXT)) {
      assert.equal(flowNode.TEXT[k], dashboard.TEXT[k], k);
    }
  });
});

// ─────────────────────────────────────────────────────────────
// importFlow.start（vm 沙箱）
// ─────────────────────────────────────────────────────────────

/** 假元素（只實作 import-flow.js 用到的部分） */
function fakeInput(tag, props) {
  const attrs = Object.assign({}, (props && props.attrs) || {});
  const listeners = {};
  const el = {
    tagName: String(tag).toUpperCase(),
    className: (props && props.className) || "",
    parentNode: null,
    files: null,
    value: "",
    clicks: 0,
    getAttribute: (k) => (k in attrs ? attrs[k] : null),
    setAttribute: (k, v) => { attrs[k] = String(v); },
    addEventListener: (t, fn) => { (listeners[t] = listeners[t] || []).push(fn); },
    dispatch(t) { (listeners[t] || []).forEach((fn) => fn({ type: t, target: el })); },
    click() { el.clicks++; }
  };
  return el;
}

/** 等待 Promise 鏈跑完 */
function flush() {
  return new Promise((r) => setImmediate(r));
}

/**
 * 建立沙箱並載入 ui/import-flow.js。
 * @param {{ store?: object, noDialog?: boolean, confirm?: boolean, readerError?: boolean, noStore?: boolean }} [opt]
 */
function setup(opt) {
  opt = opt || {};
  const created = [];
  const bodyChildren = [];
  const body = {
    appendChild(n) { bodyChildren.push(n); n.parentNode = body; return n; },
    removeChild(n) { const i = bodyChildren.indexOf(n); if (i >= 0) bodyChildren.splice(i, 1); n.parentNode = null; return n; }
  };
  const toasts = [];
  const dialogs = [];
  const reads = [];
  const importCalls = [];

  class FakeFileReader {
    constructor() { this.result = null; this._l = {}; }
    addEventListener(t, fn) { (this._l[t] = this._l[t] || []).push(fn); }
    readAsText(file) {
      reads.push(file);
      setImmediate(() => {
        if (opt.readerError) { (this._l.error || []).forEach((fn) => fn()); return; }
        this.result = file.text;
        (this._l.load || []).forEach((fn) => fn());
      });
    }
  }

  const store = opt.store || {
    result: { ok: true, skipped: 2 },
    actions: {
      importBackup(text, confirmFn) {
        importCalls.push(text);
        if (store.throws) throw new Error("boom");
        return Promise.resolve(confirmFn()).then((yes) => (yes ? store.result : { ok: false, error: "cancelled" }));
      }
    }
  };

  const sandbox = {
    console: { log() {}, info() {}, warn() {}, error() {}, debug() {} },
    setTimeout,
    FileReader: FakeFileReader
  };
  sandbox.self = sandbox;
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  // 載入時不得讀取 DOM 或其他模組（LD-2）：document、EMT 成員於載入後才放入
  vm.runInContext(source("ui/import-flow.js"), sandbox, { filename: "ui/import-flow.js" });
  const EMT = sandbox.EMT;
  sandbox.document = { body };
  EMT.core = {
    constants: C,
    dom: { el: (tag, props) => { const n = fakeInput(tag, props); created.push(n); return n; } }
  };
  if (!opt.noStore) EMT.store = store;
  EMT.ui.toast = { show: (text, o) => toasts.push({ text, kind: o && o.kind }) };
  if (!opt.noDialog) {
    EMT.ui.dialog = {
      confirm: (o) => { dialogs.push(o); return Promise.resolve(opt.confirm !== false); }
    };
  }
  return { EMT, sandbox, store, created, bodyChildren, toasts, dialogs, reads, importCalls, last: () => created[created.length - 1] };
}

/** 模擬使用者選了一個檔案 */
function choose(s, text) {
  const input = s.last();
  input.files = [{ name: "backup.json", text }];
  input.dispatch("change");
}

describe("first-run.test.js：importFlow.start", () => {
  test("載入只登錄 EMT.ui.importFlow（start、messageOf），不讀 document", () => {
    const s = setup();
    assert.equal(typeof s.EMT.ui.importFlow.start, "function");
    assert.equal(typeof s.EMT.ui.importFlow.messageOf, "function");
  });

  test("建立隱藏 file input（accept .json,application/json）並開啟選檔", () => {
    const s = setup();
    s.EMT.ui.importFlow.start();
    const input = s.last();
    assert.equal(input.tagName, "INPUT");
    assert.equal(input.getAttribute("type"), "file");
    assert.equal(input.getAttribute("accept"), ".json,application/json");
    assert.equal(input.clicks, 1);
    assert.deepEqual(s.bodyChildren, [input]);
  });

  test("選檔 → 讀檔 → importBackup → 確認對話框「匯入將覆蓋目前所有進度」→ 成功 toast，回傳結果、移除 input", async () => {
    const s = setup();
    const p = s.EMT.ui.importFlow.start();
    choose(s, "{\"x\":1}");
    const r = await p;
    assert.deepEqual(JSON.parse(JSON.stringify(r)), { ok: true, skipped: 2 });
    assert.deepEqual(s.importCalls, ["{\"x\":1}"]);
    assert.equal(s.dialogs.length, 1);
    assert.equal(s.dialogs[0].message, "匯入將覆蓋目前所有進度");
    assert.equal(s.dialogs[0].title, "匯入備份");
    assert.deepEqual(s.toasts, [{ text: "已匯入，略過 2 筆", kind: "success" }]);
    assert.deepEqual(s.bodyChildren, []);
  });

  test("確認對話框按取消 → cancelled、不提示（AC-25-11 (a)）", async () => {
    const s = setup({ confirm: false });
    const p = s.EMT.ui.importFlow.start();
    choose(s, "{}");
    const r = await p;
    assert.equal(r.error, "cancelled");
    assert.deepEqual(s.toasts, []);
  });

  test("對話框不可用 → 視為取消", async () => {
    const s = setup({ noDialog: true });
    const p = s.EMT.ui.importFlow.start();
    choose(s, "{}");
    assert.equal((await p).error, "cancelled");
    assert.deepEqual(s.toasts, []);
  });

  test("選檔視窗取消（cancel 事件）→ null、不讀檔、不提示", async () => {
    const s = setup();
    const p = s.EMT.ui.importFlow.start();
    s.last().dispatch("cancel");
    assert.equal(await p, null);
    assert.deepEqual(s.reads, []);
    assert.deepEqual(s.importCalls, []);
    assert.deepEqual(s.toasts, []);
    assert.deepEqual(s.bodyChildren, []);
  });

  test("change 但沒有檔案 → null", async () => {
    const s = setup();
    const p = s.EMT.ui.importFlow.start();
    s.last().files = [];
    s.last().dispatch("change");
    assert.equal(await p, null);
    assert.deepEqual(s.toasts, []);
  });

  test("各錯誤碼的提示文字與主控台相同（format、version、quota、write_failed）", async () => {
    for (const r of [
      { ok: false, error: "format" },
      { ok: false, error: "version", fileVersion: 2.5 },
      { ok: false, error: "version", fileVersion: null },
      { ok: false, error: "quota" },
      { ok: false, error: "write_failed" }
    ]) {
      const s = setup();
      s.store.result = r;
      const p = s.EMT.ui.importFlow.start();
      choose(s, "{}");
      assert.equal((await p).error, r.error);
      const m = dashboard.importMessage(r);
      assert.deepEqual(s.toasts, [{ text: m.text, kind: m.kind }]);
    }
  });

  test("importBackup 拋例外、讀檔失敗 → format（IM-5）", async () => {
    const a = setup();
    a.store.throws = true;
    const pa = a.EMT.ui.importFlow.start();
    choose(a, "{}");
    assert.equal((await pa).error, "format");
    assert.deepEqual(a.toasts, [{ text: "備份檔格式錯誤，未匯入", kind: "error" }]);

    const b = setup({ readerError: true });
    const pb = b.EMT.ui.importFlow.start();
    choose(b, "{}");
    assert.equal((await pb).error, "format");
    assert.deepEqual(b.importCalls, []);
  });

  test("選檔視窗開啟中再次 start：前一次以 null 結束；匯入中再次 start 回同一個 Promise", async () => {
    const s = setup();
    const p1 = s.EMT.ui.importFlow.start();
    const p2 = s.EMT.ui.importFlow.start();
    assert.equal(await p1, null);
    assert.equal(s.bodyChildren.length, 1, "只留下第二次的 input");
    choose(s, "{}");
    const p3 = s.EMT.ui.importFlow.start();
    assert.equal(p3, p2, "匯入中不重複開啟");
    assert.equal((await p2).ok, true);
    assert.equal(s.importCalls.length, 1);
  });

  test("缺少 store → 丟出含模組名稱的 Error（LD-3，不當成格式錯誤）", () => {
    const s = setup({ noStore: true });
    assert.throws(() => s.EMT.ui.importFlow.start(), /EMT\.store/);
    assert.deepEqual(s.toasts, []);
  });
});

// ─────────────────────────────────────────────────────────────
// 與真實 store（首次模式）整合：FS-5、FS-6、AC-25-10、AC-25-11
// ─────────────────────────────────────────────────────────────

describe("first-run.test.js：首次畫面還原（真實 store）", () => {
  /**
   * 由一般模式 store 匯出目標 300（棕）的備份（目前版本 3）；
   * version 2、1 時刻意改成 v0.14、v0.7 的備份形狀作為遷移輸入（v0.15，MG-8）
   */
  function backupJson(version) {
    const src = F.makeStore();
    src.a.setDraftScore(300); // 既有分數 300（棕）的備份 fixture（GS-4：原值保留），非畫面操作
    src.a.applyGoal();
    const json = src.a.exportBackup().json;
    if (version === undefined || version === C.CURRENT_SCHEMA_VERSION) return json;
    const o = JSON.parse(json);
    o.schemaVersion = version;
    delete o.data.flashcardPosition;
    delete o.data.part5CorrectIds;
    delete o.data.part5UnansweredOnly;
    if (version === 1) {
      delete o.data.todayLearned;
      delete o.data.learnedHistory;
    }
    return JSON.stringify(o);
  }

  async function restore(text, storeOpt) {
    const m = F.makeStore(Object.assign({ firstRun: true }, storeOpt || {}));
    assert.equal(m.store.getState().runtime.entryMode, "firstRun");
    m.a.clickColor("gold"); // 首次畫面上未生效的選擇（點金 → 990；E-58：還原成功時捨棄；v0.10 FE-43 改為點卡片）
    const tags = [];
    m.store.subscribe((st, t) => tags.push(t.slice()));
    const s = setup({ store: m.store });
    const p = s.EMT.ui.importFlow.start();
    choose(s, text);
    const r = await p;
    return { m, s, r, tags };
  }

  for (const ver of [3, 2, 1]) {
    test("v" + ver + " 備份還原成功 → main、主鍵寫入、資料依備份（300、棕）、通知含 entry（AC-25-10、AC-24-10）", async () => {
      const { m, s, r, tags } = await restore(backupJson(ver));
      assert.equal(r.ok, true);
      const st = m.store.getState();
      assert.equal(st.runtime.entryMode, "main");
      assert.equal(st.runtime.currentTab, "dashboard");
      assert.equal(st.data.goal.appliedScore, 300);
      assert.equal(st.data.goal.draftScore, 300);
      assert.equal(st.data.goal.appliedColor, "brown");
      assert.ok(m.storage.map.has(MAIN_KEY), "主鍵已寫入");
      assert.equal(JSON.parse(m.storage.map.get(MAIN_KEY)).schemaVersion, C.CURRENT_SCHEMA_VERSION);
      assert.ok(tags.some((t) => t.includes("entry")));
      assert.equal(s.toasts.length, 1);
      assert.match(s.toasts[0].text, /^已匯入，略過 \d+ 筆$/);
    });
  }

  const FAILS = [
    ["格式錯誤", "not json", null, "format"],
    ["版本不相容", null, null, "version"],
    ["容量不足", null, { quota: true }, "quota"]
  ];
  for (const [name, text0, stOpt, code] of FAILS) {
    test("還原失敗（" + name + "）→ 維持 firstRun、主鍵不存在、顯示對應訊息（AC-25-11、FS-6）", async () => {
      let text = text0;
      if (code === "version") {
        const o = JSON.parse(backupJson());
        o.schemaVersion = C.CURRENT_SCHEMA_VERSION + 1;
        text = JSON.stringify(o);
      }
      let storage;
      if (stOpt && stOpt.quota) {
        storage = F.fakeStorage();
        storage.quota = true;
      }
      const { m, s, r, tags } = await restore(text || backupJson(), storage ? { storage } : null);
      assert.equal(r.error, code);
      const st = m.store.getState();
      assert.equal(st.runtime.entryMode, "firstRun");
      assert.equal(st.data.goal.draftScore, 990, "記憶體不變");
      assert.ok(!m.storage.map.has(MAIN_KEY), "主鍵仍不存在");
      assert.ok(!tags.some((t) => t.includes("entry")));
      const msg = dashboard.importMessage(r);
      assert.deepEqual(s.toasts, [{ text: msg.text, kind: msg.kind }]);
    });
  }

  test("確認對話框取消 → 維持 firstRun、不提示、主鍵不存在", async () => {
    const m = F.makeStore({ firstRun: true });
    const s = setup({ store: m.store, confirm: false });
    const p = s.EMT.ui.importFlow.start();
    choose(s, backupJson());
    assert.equal((await p).error, "cancelled");
    assert.equal(m.store.getState().runtime.entryMode, "firstRun");
    assert.ok(!m.storage.map.has(MAIN_KEY));
    assert.deepEqual(s.toasts, []);
  });

  test("localStorage 停用時還原成功 → 只套用記憶體並進入 main（FS-5、契約 FB-31 (b)）", async () => {
    const storage = {
      getItem() { throw new Error("SecurityError"); },
      setItem() { throw new Error("SecurityError"); },
      removeItem() { throw new Error("SecurityError"); }
    };
    const { m, r } = await restore(backupJson(), { storage });
    assert.equal(r.ok, true);
    assert.equal(m.store.getState().runtime.entryMode, "main");
    assert.equal(m.store.getState().runtime.storageStatus, "unavailable");
  });
});

// ─────────────────────────────────────────────────────────────
// 靜態檢查：index.html、00-base.css、main.js
// ─────────────────────────────────────────────────────────────

describe("first-run.test.js：應用殼與樣式", () => {
  const html = source("index.html");
  const css = source("styles/00-base.css").replace(/\/\*[\s\S]*?\*\//g, "");

  /** 取出選擇器清單（逗號分隔）含 sel 的規則宣告內容（不含 @media 內） */
  function topLevelDecls(sel) {
    // 移除所有 @media 區塊，只看頂層規則
    let src = css;
    for (;;) {
      const at = src.indexOf("@media");
      if (at < 0) break;
      const open = src.indexOf("{", at);
      let depth = 0;
      let i = open;
      for (; i < src.length; i++) {
        if (src[i] === "{") depth++;
        else if (src[i] === "}") { depth--; if (depth === 0) break; }
      }
      src = src.slice(0, at) + src.slice(i + 1);
    }
    const out = [];
    for (const m of src.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
      const sels = m[1].split(",").map((x) => x.trim().replace(/\s+/g, " "));
      if (sels.includes(sel)) out.push(m[2]);
    }
    return out.join(";");
  }
  function has(decls, prop, value) {
    return new RegExp("(^|;)\\s*" + prop + "\\s*:\\s*" + value.replace(/[()]/g, "\\$&") + "\\s*(;|$)").test(decls);
  }

  test("index.html：<body data-entry=\"boot\">，<html> 與開頭片段不變（B-1）", () => {
    assert.match(html, /<body data-entry="boot">/);
    assert.ok(html.startsWith("<!DOCTYPE html>\n<html lang=\"zh-Hant-TW\">\n<head>\n<meta charset=\"utf-8\">"));
    assert.ok(!/<html[^>]*data-entry/.test(html));
  });

  test("（v0.19，FE-86）index.html：頁尾無 #footer-first-run-back，「資料來源與授權」保留既有 id（SD-FB-79、AC-25-07 改由內容區返回按鈕滿足）", () => {
    const footer = html.match(/<footer[^>]*>([\s\S]*?)<\/footer>/)[1];
    assert.ok(!html.includes("footer-first-run-back"));
    assert.ok(!footer.includes("返回難易度設定"));
    assert.match(footer, /id="footer-sources"[^>]*data-go="sources">資料來源與授權</);
  });

  test("（v0.19，FE-86）首次模式可到 5 個頁面，其他頁忽略；開啟與返回都不寫入、仍為首次模式（SP-4、AC-25-07）", () => {
    const m = F.makeStore({ firstRun: true });
    const before = m.storage.setCalls.length;
    for (const t of ["sources", "about", "contact", "privacy", "customizer"]) {
      m.a.setTab(t);
      assert.equal(m.store.getState().runtime.currentTab, t, t);
    }
    for (const t of ["dashboard", "flashcards", "part5", "decoder", "phrasebank"]) {
      m.a.setTab(t);
      assert.equal(m.store.getState().runtime.currentTab, "customizer", t);
    }
    assert.equal(m.store.getState().runtime.entryMode, "firstRun");
    assert.equal(m.storage.setCalls.length, before, "setItem 0 次");
    assert.equal(m.storage.getItem(MAIN_KEY), null, "無狀態鍵");
  });

  test("00-base.css：boot 隱藏 #app-nav、#nav-toggle、#app-main", () => {
    for (const id of ["#app-nav", "#nav-toggle", "#app-main"]) {
      assert.ok(has(topLevelDecls('body[data-entry="boot"] ' + id), "display", "none"), id);
    }
  });

  test("00-base.css：firstRun 隱藏 #app-nav、#nav-toggle、#customizer-custom，取消底部導覽留白（AC-25-01、AC-20-03）", () => {
    for (const id of ["#app-nav", "#nav-toggle", "#customizer-custom"]) {
      assert.ok(has(topLevelDecls('body[data-entry="firstRun"] ' + id), "display", "none"), id);
    }
    assert.ok(has(topLevelDecls('body[data-entry="firstRun"]'), "padding-bottom", "0"));
    assert.ok(!has(topLevelDecls('body[data-entry="firstRun"] #app-main'), "display", "none"), "首次模式不隱藏主要內容");
  });

  test("（v0.19，FE-86）00-base.css：#footer-first-run-back 規則已移除（SD-FB-79）", () => {
    assert.ok(!source("styles/00-base.css").includes("footer-first-run-back"));
  });

  test("main.js：store.init 後設 body.dataset.entry，再 router.start(firstRun ? customizer : dashboard)；bottomNav、emt-ready 順序保留", () => {
    const src = source("main.js");
    const iInit = src.indexOf('step("store.init"');
    const iBanner = src.indexOf('step("banner.render"');
    const iEntry = src.indexOf('step("entry"');
    const iStart = src.indexOf('step("router.start"');
    const iNav = src.indexOf('step("bottomNav.init"');
    const iReady = src.indexOf('step("emt-ready"');
    assert.ok(iInit >= 0 && iBanner > iInit && iEntry > iBanner && iStart > iEntry && iNav > iStart && iReady > iNav);
    assert.match(src, /document\.body\.dataset\.entry = entryMode/);
    assert.match(src, /EMT\.router\.start\(entryMode === "firstRun" \? "customizer" : "dashboard"\)/);
    assert.match(src, /return "main";/);
  });
});

// ─────────────────────────────────────────────────────────────
// （v0.12，FE-57）首次畫面固定底部列樣式（architecture.md §7.19.5；契約 FT-2；AC-41-03、AC-41-04）
// ─────────────────────────────────────────────────────────────

describe("first-run.test.js：20-customizer.css 固定底部列（v0.12，FE-57）", () => {
  const css = source("styles/20-customizer.css").replace(/\/\*[\s\S]*?\*\//g, "");
  const base = source("styles/00-base.css").replace(/\/\*[\s\S]*?\*\//g, "");

  /** 取出 @media (max-width: 640px) 區塊內容（串接） */
  function narrow(src) {
    const out = [];
    let from = 0;
    for (;;) {
      const at = src.indexOf("@media (max-width: 640px)", from);
      if (at < 0) break;
      const open = src.indexOf("{", at);
      let depth = 0;
      let i = open;
      for (; i < src.length; i++) {
        if (src[i] === "{") depth++;
        else if (src[i] === "}") { depth--; if (depth === 0) break; }
      }
      out.push(src.slice(open + 1, i));
      from = i + 1;
    }
    return out.join("\n");
  }
  /** 區塊中選擇器完全相同的規則宣告 */
  function decls(block, sel) {
    const out = [];
    for (const m of block.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const sels = m[1].split(",").map((x) => x.trim().replace(/\s+/g, " "));
      if (sels.includes(sel)) out.push(m[2]);
    }
    return out.join(";");
  }
  function val(d, prop) {
    const m = [...d.matchAll(new RegExp("(?:^|;|\\s)" + prop + "\\s*:\\s*([^;]+)", "g"))];
    return m.length ? m[m.length - 1][1].trim() : null;
  }

  test("≤ 640px：.cz-firstbar position: fixed、貼底、z-index 800（< 底部導覽 900、< 對話框 1100）", () => {
    const d = decls(narrow(css), ".cz-firstbar");
    assert.equal(val(d, "position"), "fixed");
    assert.equal(val(d, "bottom"), "0");
    assert.equal(val(d, "left"), "0");
    assert.equal(val(d, "right"), "0");
    assert.equal(val(d, "z-index"), "800");
    assert.match(val(d, "padding"), /env\(safe-area-inset-bottom/);
  });

  test("> 640px：.cz-firstbar 不固定（頂層規則無 position: fixed）", () => {
    const top = css.replace(/@media[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, "");
    const d = decls(top, ".cz-firstbar");
    assert.ok(d, "有頂層 .cz-firstbar 規則");
    assert.notEqual(val(d, "position"), "fixed");
    assert.equal(val(d, "display"), "grid");
  });

  test("≤ 640px：body[data-entry=firstRun][data-tab=customizer] 底部留白與 Toast 上移引用 --emt-firstbar-h（AC-41-04、E-93）", () => {
    const n = narrow(css);
    const body = decls(n, 'body[data-entry="firstRun"][data-tab="customizer"]');
    assert.match(val(body, "padding-bottom"), /var\(--emt-firstbar-h\)/);
    assert.match(val(body, "padding-bottom"), /env\(safe-area-inset-bottom/);
    const toast = decls(n, 'body[data-entry="firstRun"][data-tab="customizer"] .toast-root');
    assert.match(val(toast, "bottom"), /var\(--emt-firstbar-h\)/);
    // 預留高度 184px 定義在 00-base.css（= layout.UI_LAYOUT.FIRSTBAR_RESERVE_PX）
    const layout = require(path.join(APP_DIR, "core", "layout.js"));
    assert.match(base, new RegExp("--emt-firstbar-h:\\s*" + layout.UI_LAYOUT.FIRSTBAR_RESERVE_PX + "px"));
  });

  test("#view-customizer 內容寬 720px 置中（--content-narrow）", () => {
    const d = decls(css, "#view-customizer");
    assert.equal(val(d, "max-width"), "var(--content-narrow)");
    assert.equal(val(d, "margin-inline"), "auto");
  });

  test("色級列：min-height 56px、鎖定列 opacity 0.85 且文字 --text；說明一行截斷", () => {
    assert.equal(val(decls(css, ".cz-level"), "min-height"), "56px");
    assert.equal(val(decls(css, ".cz-level.is-locked"), "opacity"), "0.85");
    for (const sel of [".cz-level.is-locked .cz-level__name", ".cz-level.is-locked .cz-level__desc", ".cz-level.is-locked .cz-level__side"]) {
      assert.equal(val(decls(css, sel), "color"), "var(--text)", sel);
    }
    const desc = decls(css, ".cz-level__desc");
    assert.equal(val(desc, "white-space"), "nowrap");
    assert.equal(val(desc, "text-overflow"), "ellipsis");
    // ✓ 只在選中時顯示
    assert.equal(val(decls(css, ".cz-level__check"), "display"), "none");
    assert.equal(val(decls(css, '.cz-level[aria-pressed="true"] .cz-level__check'), "display"), "inline");
  });

  test("不得有 color: var(--brand)、var(--accent) 只經 .btn--accent（20-customizer.css 不直接使用）", () => {
    assert.doesNotMatch(css, /(?<![-\w])color\s*:\s*var\(--brand\)/);
    assert.doesNotMatch(css, /var\(--accent\)/);
  });
});
