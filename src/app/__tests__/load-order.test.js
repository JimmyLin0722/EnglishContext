/*
 * load-order.test.js — src/app 全部模組依建置順序載入的回歸測試（FE-19）
 * 依據：architecture.md v0.3 §4.1 模組取用時機 LD-1～LD-3、「回歸測試位置：全部模組」；§5 建置串接順序
 * 做法：以 tools/build.mjs 的 listAppFiles 取得實際串接順序，在只有 self／window／console 的 node:vm 沙箱
 *       （沒有 module、require、document、localStorage、資料全域變數）依序載入 src/app 全部 .js（不含 main.js、__tests__）。
 * （FE-44）v0.10：新增 SCORE_DEFAULT 725 與 scoreForCard 斷言。
 * （FE-69）v0.14：新增 core/version.js、ui/version-line.js 與 layout.goalLineText、levelStatusText 斷言。
 * （FE-76）v0.15：新增 core/position.js、core/part5flow.js（載入時不讀 document、不取用 persist）、
 *           CURRENT_SCHEMA_VERSION 3 與 PART5_RECORD_TEXTS 凍結斷言。
 * 背景：R6-1（backup.js 早於 persist.js 載入，載入時取用 EMT.core.persist 得到 undefined）在 Node 單元測試中
 *       因 require 不受順序影響而測不到；本檔對全部模組做同樣的瀏覽器環境模擬。
 */
"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { pathToFileURL } = require("node:url");

describe("load-order.test.js", () => {
  const APP_DIR = path.join(__dirname, "..");
  const BUILD_MJS = path.join(APP_DIR, "..", "..", "tools", "build.mjs");

  /** 依建置順序列出要載入的檔案（不含 main.js 與 __tests__） */
  async function appFiles() {
    const build = await import(pathToFileURL(BUILD_MJS).href);
    const all = build.listAppFiles(APP_DIR);
    return {
      all: all,
      files: all.filter((f) => f !== "main.js" && !f.startsWith("__tests__/"))
    };
  }

  /** 讀取原始碼（去除 BOM） */
  function source(rel) {
    return fs.readFileSync(path.join(APP_DIR, rel), "utf8").replace(/^﻿/, "");
  }

  /**
   * 建立瀏覽器模擬沙箱：只有 self、window（皆指向全域）與 console。
   * console 會記錄 error／warn，供斷言載入時沒有錯誤輸出。
   */
  function makeSandbox() {
    const logs = { error: [], warn: [] };
    const con = {
      log() {},
      info() {},
      debug() {},
      warn: (...a) => logs.warn.push(a.map(String).join(" ")),
      error: (...a) => logs.error.push(a.map(String).join(" "))
    };
    const sandbox = { console: con };
    sandbox.self = sandbox;
    sandbox.window = sandbox;
    return { sandbox, logs };
  }

  /**
   * 依序載入檔案；回傳每個檔案的載入錯誤（無錯誤則為空陣列）。
   * @param {object} sandbox 已 createContext 的沙箱
   * @param {string[]} files
   * @param {Function} [after] 每載入一個檔案後呼叫 after(rel)
   */
  function loadAll(sandbox, files, after) {
    const failures = [];
    for (const rel of files) {
      try {
        vm.runInContext(source(rel), sandbox, { filename: rel });
      } catch (e) {
        failures.push(rel + "：" + (e && e.message));
      }
      if (after) after(rel);
    }
    return failures;
  }

  // ── 前提：建置順序 ──

  test("建置順序：core（constants、wordkey 最先）→ state → services → ui → views → main.js；涵蓋 src/app 全部 .js", async () => {
    const { all, files } = await appFiles();
    assert.deepEqual(all.slice(0, 2), ["core/constants.js", "core/wordkey.js"]);
    assert.equal(all[all.length - 1], "main.js");
    const layerOf = (f) => ["core", "state", "services", "ui", "views"].indexOf(f.split("/")[0]);
    for (let i = 1; i < files.length; i++) {
      assert.ok(layerOf(files[i - 1]) <= layerOf(files[i]), files[i - 1] + " → " + files[i]);
    }
    // 與實際目錄比對：每一層的 .js 都在清單中（不遺漏新增的模組）
    for (const layer of ["core", "state", "services", "ui", "views"]) {
      const onDisk = fs.readdirSync(path.join(APP_DIR, layer)).filter((n) => n.endsWith(".js")).map((n) => layer + "/" + n);
      for (const f of onDisk) assert.ok(files.includes(f), "建置清單缺少 " + f);
    }
    assert.ok(!all.some((f) => f.startsWith("__tests__/")), "測試檔不得被串接");
  });

  // ── LD-1、LD-2：依建置順序載入全部模組 ──

  test("LD-1、LD-2：依建置順序在 vm 沙箱載入 src/app 全部檔案（不含 main.js）不拋例外、無錯誤輸出", async () => {
    const { files } = await appFiles();
    const { sandbox, logs } = makeSandbox();
    vm.createContext(sandbox);
    const failures = loadAll(sandbox, files);
    assert.deepEqual(failures, [], "載入時拋出例外");
    assert.deepEqual(logs.error, [], "載入時輸出 console.error");
    assert.equal(typeof sandbox.module, "undefined");
    assert.equal(typeof sandbox.require, "undefined");
    assert.equal(typeof sandbox.document, "undefined");
  });

  test("載入後 EMT.core 下每個 core 檔對應的模組皆存在（content.js 依 §4.1 掛在 EMT.content）", async () => {
    const { files } = await appFiles();
    const { sandbox } = makeSandbox();
    vm.createContext(sandbox);
    loadAll(sandbox, files);
    const EMT = sandbox.EMT;
    assert.ok(EMT && EMT.core, "EMT.core 不存在");
    const coreFiles = files.filter((f) => f.startsWith("core/"));
    assert.ok(coreFiles.length >= 13);
    for (const rel of coreFiles) {
      const name = path.basename(rel, ".js");
      const mod = name === "content" ? EMT.content : EMT.core[name];
      assert.ok(mod && (typeof mod === "object" || typeof mod === "function"), "缺少模組：" + rel);
    }
    // 其他層也已完成登錄
    assert.equal(typeof EMT.store, "object");
    assert.equal(typeof EMT.router, "object");
    for (const s of ["clipboard", "download", "stt", "tts"]) assert.ok(EMT.services && EMT.services[s], "缺少 EMT.services." + s);
    for (const u of ["banner", "dialog", "toast"]) assert.ok(EMT.ui && EMT.ui[u], "缺少 EMT.ui." + u);
    for (const c of ["speechPanel", "flashcardQuiz"]) assert.ok(EMT.components && EMT.components[c], "缺少 EMT.components." + c);
  });

  test("v0.8 新模組（FE-33）：core learning／interaction、ui motion／bottomNav／importFlow、services haptics 依建置順序載入後皆存在", async () => {
    const { files } = await appFiles();
    // 檔案在建置清單中，且層級順序正確（core → services → ui）
    const expected = ["core/learning.js", "core/interaction.js", "services/haptics.js", "ui/motion.js", "ui/bottom-nav.js", "ui/import-flow.js"];
    for (const f of expected) assert.ok(files.includes(f), "建置清單缺少 " + f);
    assert.ok(files.indexOf("services/haptics.js") < files.indexOf("ui/motion.js"));
    assert.ok(files.indexOf("ui/motion.js") < files.findIndex((f) => f.startsWith("views/")));
    const { sandbox, logs } = makeSandbox();
    vm.createContext(sandbox);
    const failures = loadAll(sandbox, files);
    assert.deepEqual(failures, []);
    assert.deepEqual(logs.error, []);
    const EMT = sandbox.EMT;
    for (const c of ["learning", "interaction"]) assert.equal(typeof EMT.core[c], "object", "缺少 EMT.core." + c);
    assert.equal(typeof EMT.services.haptics, "object", "缺少 EMT.services.haptics");
    for (const u of ["motion", "bottomNav", "importFlow"]) assert.equal(typeof EMT.ui[u], "object", "缺少 EMT.ui." + u);
  });

  test("v0.9 新模組（FE-41）：core meter／reinit、services mic 依建置順序載入不拋例外且存在", async () => {
    const { files } = await appFiles();
    const expected = ["core/meter.js", "core/reinit.js", "services/mic.js"];
    for (const f of expected) assert.ok(files.includes(f), "建置清單缺少 " + f);
    // 層序：core 新模組在 services 之前，mic 在 ui、views 之前
    assert.ok(files.indexOf("core/meter.js") < files.findIndex((f) => f.startsWith("services/")));
    assert.ok(files.indexOf("core/reinit.js") < files.findIndex((f) => f.startsWith("services/")));
    assert.ok(files.indexOf("services/mic.js") < files.findIndex((f) => f.startsWith("ui/")));
    const { sandbox, logs } = makeSandbox();
    vm.createContext(sandbox);
    const failures = loadAll(sandbox, files);
    assert.deepEqual(failures, [], "載入時拋出例外");
    assert.deepEqual(logs.error, [], "載入時輸出 console.error");
    const EMT = sandbox.EMT;
    assert.equal(typeof EMT.core.meter, "object", "缺少 EMT.core.meter");
    assert.equal(typeof EMT.core.reinit, "object", "缺少 EMT.core.reinit");
    assert.equal(typeof EMT.services.mic, "object", "缺少 EMT.services.mic");
    // 載入時不得觸發麥克風（沙箱沒有 navigator；載入不拋例外即表示未於載入期取用）
    assert.equal(typeof sandbox.navigator, "undefined");
  });

  test("v0.10（FE-44）：依建置順序載入後 SCORE_DEFAULT 為 725、goal.scoreForCard(\"green\") 為 725（契約 GS-2、GS-7）", async () => {
    const { files } = await appFiles();
    const { sandbox, logs } = makeSandbox();
    vm.createContext(sandbox);
    const failures = loadAll(sandbox, files);
    assert.deepEqual(failures, [], "載入時拋出例外");
    assert.deepEqual(logs.error, [], "載入時輸出 console.error");
    const EMT = sandbox.EMT;
    assert.equal(EMT.core.constants.SCORE_DEFAULT, 725);
    assert.equal(typeof EMT.core.goal.scoreForCard, "function", "缺少 EMT.core.goal.scoreForCard");
    assert.equal(EMT.core.goal.scoreForCard("green"), 725);
    // 預設分數即綠色上限（點綠卡與預設值一致）
    assert.equal(EMT.core.goal.scoreForCard("green"), EMT.core.constants.SCORE_DEFAULT);
  });

  test("LD-2、HT-5：views 載入時只登錄頁面（主控台與 6 個功能區共 7 個頁籤皆經 EMT.views.register 登錄；隱藏頁 decoder、phrasebank 仍登錄）", async () => {
    const { files } = await appFiles();
    const { sandbox } = makeSandbox();
    vm.createContext(sandbox);
    const registered = [];
    loadAll(sandbox, files, (rel) => {
      // router 載入後包一層紀錄，之後的 views 呼叫 register 時記下頁籤代碼
      if (rel === "ui/router.js") {
        const views = sandbox.EMT.views;
        const orig = views.register;
        views.register = function (tabId, mod) {
          registered.push(tabId);
          return orig.apply(this, arguments);
        };
      }
    });
    const tabs = Array.from(new Set(registered)).sort();
    assert.deepEqual(tabs, ["customizer", "dashboard", "decoder", "flashcards", "part5", "phrasebank", "sources"].sort());
    // 自訂器頁 = customizer + custom-vocab 兩個模組
    assert.equal(registered.filter((t) => t === "customizer").length, 2);
  });

  test("LD-2：載入時不讀取 document、localStorage 與 9 個資料全域變數", async () => {
    const { files } = await appFiles();
    const { sandbox } = makeSandbox();
    const watched = [
      "document", "localStorage",
      "MASTER_VOCAB_DATABASE", "DATA_SOURCE_REGISTRY", "VOCAB_MANIFEST", "PROJECT_LICENSE", "DOMAIN_TEMPLATES",
      "PART5_QUESTION_BANK", "DECODER_SENTENCES", "READING_STRATEGIES", "ACADEMIC_PHRASEBANK"
    ];
    const hits = [];
    let current = "";
    for (const name of watched) {
      // getter 回傳 undefined（與不存在時相同），只記錄被讀取
      Object.defineProperty(sandbox, name, { configurable: true, get() { hits.push(current + " 讀取 " + name); return undefined; } });
    }
    vm.createContext(sandbox);
    const failures = [];
    for (const rel of files) {
      current = rel;
      try {
        vm.runInContext(source(rel), sandbox, { filename: rel });
      } catch (e) {
        failures.push(rel + "：" + e.message);
      }
    }
    assert.deepEqual(failures, []);
    assert.deepEqual(hits, []);
  });

  // ── LD-3：取用的模組不存在 → 丟出含模組名稱的 Error ──

  test("LD-3：缺少 core/persist.js 時，backup 匯入丟出含模組名稱的 Error，不被當成「格式錯誤」", async () => {
    const { files } = await appFiles();
    const { sandbox } = makeSandbox();
    vm.createContext(sandbox);
    const failures = loadAll(sandbox, files.filter((f) => f !== "core/persist.js"));
    assert.deepEqual(failures, [], "缺一個 core 模組時載入本身仍不應拋例外（LD-1）");
    const B = sandbox.EMT.core.backup;
    assert.ok(B);
    const backup = JSON.stringify({
      format: "english-master-track-backup",
      schemaVersion: 1,
      exportedAt: "2026-10-30T01:00:00.000Z",
      contentDataVersion: "2026.10.30",
      data: {
        goal: { draftScore: 600, appliedScore: 600, appliedColor: "green", effectiveColor: "green" },
        customVocab: [],
        masteredWordKeys: [],
        vocabQuiz: { answered: 0, correct: 0 },
        part5: { currentIndex: 0, lockedSelection: null, phase: "question", roundAnswered: 0, roundCorrect: 0, totalAnswered: 0, totalCorrect: 0 },
        streak: { days: 0, lastActiveDate: null },
        sttNoticeAcknowledged: false
      }
    });
    let result;
    let error = null;
    try {
      result = B.importSteps(backup, { builtinKeys: new Set(), part5Length: 4 });
    } catch (e) {
      error = e;
    }
    assert.ok(error, "應丟出例外，實際回傳：" + JSON.stringify(result));
    assert.match(String(error.message), /persist/);
  });
});

// ─────────────────────────────────────────────────────────────
// （v0.11，FE-53）PWA 模組依建置順序載入（architecture §10.4「load-order.test.js」列；LD-1、LD-2）
// ─────────────────────────────────────────────────────────────

describe("load-order.test.js：PWA 模組（v0.11，FE-53）", () => {
  const APP_DIR = path.join(__dirname, "..");
  const BUILD_MJS = path.join(APP_DIR, "..", "..", "tools", "build.mjs");

  test("EMT.core.pwa、EMT.services.pwa、EMT.ui.pwaNotice 依建置順序載入不拋例外且存在；PWA_TEXTS.installButton === \"安裝 App\"", async () => {
    const build = await import(pathToFileURL(BUILD_MJS).href);
    const files = build.listAppFiles(APP_DIR).filter((f) => f !== "main.js");
    for (const f of ["core/pwa.js", "services/pwa.js", "ui/pwa-notice.js"]) assert.ok(files.includes(f), "建置清單缺少 " + f);
    // sw 範本不打包（D-12）
    assert.ok(!files.some((f) => f.startsWith("pwa/")), "pwa/sw.template.js 不得被串接");
    assert.ok(files.indexOf("core/pwa.js") < files.findIndex((f) => f.startsWith("state/")));
    assert.ok(files.indexOf("services/pwa.js") < files.findIndex((f) => f.startsWith("ui/")));

    const errors = [];
    const sandbox = { console: { log() {}, info() {}, debug() {}, warn: (...a) => errors.push(a), error: (...a) => errors.push(a) } };
    sandbox.self = sandbox;
    sandbox.window = sandbox;
    // 載入時不得讀取 navigator、location、document（PE-2、LD-2）
    for (const name of ["navigator", "location", "document", "caches"]) {
      Object.defineProperty(sandbox, name, { configurable: true, get() { throw new Error("載入時讀取 " + name); } });
    }
    vm.createContext(sandbox);
    const failures = [];
    for (const rel of files) {
      try {
        vm.runInContext(fs.readFileSync(path.join(APP_DIR, rel), "utf8"), sandbox, { filename: rel });
      } catch (e) {
        failures.push(rel + "：" + e.message);
      }
    }
    assert.deepEqual(failures, []);
    assert.deepEqual(errors, []);
    const EMT = sandbox.EMT;
    assert.equal(typeof EMT.core.pwa, "object");
    assert.equal(typeof EMT.services.pwa, "object");
    assert.equal(typeof EMT.services.pwa.start, "function");
    assert.equal(typeof EMT.services.pwa.requestInstall, "function");
    assert.equal(typeof EMT.services.pwa.requestReload, "function");
    assert.equal(typeof EMT.ui.pwaNotice, "object");
    assert.equal(typeof EMT.ui.pwaNotice.init, "function");
    assert.equal(EMT.core.pwa.PWA_TEXTS.installButton, "安裝 App");
    assert.equal(typeof EMT.store.actions.setPwa, "function");
  });
});

// ─────────────────────────────────────────────────────────────
// （v0.12，FE-62）版面模組與 VC-5 跨模組一致（architecture.md v0.8 §10.5 load-order.test.js 列；契約 VC-5、LD-1）
// ─────────────────────────────────────────────────────────────

describe("load-order.test.js：版面模組（v0.12，FE-62）", () => {
  const APP_DIR = path.join(__dirname, "..");
  const BUILD_MJS = path.join(APP_DIR, "..", "..", "tools", "build.mjs");

  /** 依建置順序在 vm 沙箱載入 src/app 全部檔案（不含 main.js），回傳 EMT 與失敗清單 */
  async function loadInBuildOrder() {
    const build = await import(pathToFileURL(BUILD_MJS).href);
    const files = build.listAppFiles(APP_DIR).filter((f) => f !== "main.js");
    const errors = [];
    const sandbox = { console: { log() {}, info() {}, debug() {}, warn: (...a) => errors.push(a), error: (...a) => errors.push(a) } };
    sandbox.self = sandbox;
    sandbox.window = sandbox;
    for (const name of ["navigator", "location", "document", "localStorage"]) {
      Object.defineProperty(sandbox, name, { configurable: true, get() { throw new Error("載入時讀取 " + name); } });
    }
    vm.createContext(sandbox);
    const failures = [];
    for (const rel of files) {
      try {
        vm.runInContext(fs.readFileSync(path.join(APP_DIR, rel), "utf8"), sandbox, { filename: rel });
      } catch (e) {
        failures.push(rel + "：" + e.message);
      }
    }
    return { files, EMT: sandbox.EMT, failures, errors };
  }

  test("EMT.core.layout 依建置順序載入不拋例外且存在；core/layout.js 在 state/、views/ 之前", async () => {
    const { files, EMT, failures, errors } = await loadInBuildOrder();
    assert.ok(files.includes("core/layout.js"), "建置清單缺少 core/layout.js");
    assert.ok(files.indexOf("core/layout.js") < files.findIndex((f) => f.startsWith("state/")));
    assert.ok(files.indexOf("core/layout.js") < files.findIndex((f) => f.startsWith("views/")));
    assert.deepEqual(failures, []);
    assert.deepEqual(errors, []);
    assert.equal(typeof EMT.core.layout, "object");
    assert.equal(typeof EMT.core.layout.goalLine, "function");
    assert.equal(typeof EMT.core.layout.part5Progress, "function");
    assert.equal(EMT.core.layout.LAYOUT_TEXTS.startToday, "開始今日學習");
    assert.equal(typeof EMT.store.actions.setBackupExpanded, "function");
  });

  test("VC-5：layout.APP_DISPLAY_NAME === pwa.PWA_APP_NAME；COLOR_TOKENS.background === PWA_BACKGROUND_COLOR；COLOR_TOKENS.themeColor === PWA_THEME_COLOR", async () => {
    const { EMT } = await loadInBuildOrder();
    const L = EMT.core.layout;
    const W = EMT.core.pwa;
    assert.equal(L.APP_DISPLAY_NAME, W.PWA_APP_NAME);
    assert.equal(L.COLOR_TOKENS.background, W.PWA_BACKGROUND_COLOR);
    assert.equal(L.COLOR_TOKENS.themeColor, W.PWA_THEME_COLOR);
    assert.equal(W.PWA_MANIFEST.background_color, L.COLOR_TOKENS.background);
    assert.equal(W.PWA_MANIFEST.theme_color, L.COLOR_TOKENS.themeColor);
    // FROZEN_IDENTIFIERS 與執行中常數一致（NM-5）
    assert.equal(L.FROZEN_IDENTIFIERS.storageStateKey, EMT.core.constants.STORAGE_KEYS.state);
    assert.equal(L.FROZEN_IDENTIFIERS.storageUnreadableKey, EMT.core.constants.STORAGE_KEYS.unreadable);
    assert.equal(L.FROZEN_IDENTIFIERS.backupFormatId, EMT.core.constants.BACKUP_FORMAT_ID);
    assert.equal(L.FROZEN_IDENTIFIERS.pwaCachePrefix, W.PWA_CACHE_PREFIX);
    assert.equal(L.FROZEN_IDENTIFIERS.buildIdMetaName, W.PWA_BUILD_ID_META_NAME);
  });
});

// ─────────────────────────────────────────────────────────────
// （v0.9，FE-69）v0.14 新模組：core/version.js（FE-63）、ui/version-line.js（FE-64）；layout 新函式（FE-65）
// ─────────────────────────────────────────────────────────────

describe("load-order.test.js：版本號與介面精簡（v0.14，FE-69）", () => {
  const APP_DIR = path.join(__dirname, "..");
  const BUILD_MJS = path.join(APP_DIR, "..", "..", "tools", "build.mjs");

  test("依建置順序載入後 EMT.core.version、EMT.ui.versionLine 存在且載入不讀 document；layout.goalLineText、levelStatusText 存在；版本 meta 名稱 ≠ BUILD_ID meta 名稱", async () => {
    const build = await import(pathToFileURL(BUILD_MJS).href);
    const files = build.listAppFiles(APP_DIR).filter((f) => f !== "main.js");
    for (const f of ["core/version.js", "ui/version-line.js"]) assert.ok(files.includes(f), "建置清單缺少 " + f);
    assert.ok(files.indexOf("core/version.js") < files.findIndex((f) => f.startsWith("state/")));
    assert.ok(files.indexOf("ui/version-line.js") < files.findIndex((f) => f.startsWith("views/")));
    const errors = [];
    const sandbox = { console: { log() {}, info() {}, debug() {}, warn: (...a) => errors.push(a), error: (...a) => errors.push(a) } };
    sandbox.self = sandbox;
    sandbox.window = sandbox;
    let docReads = 0;
    Object.defineProperty(sandbox, "document", { configurable: true, get() { docReads++; return undefined; } });
    vm.createContext(sandbox);
    const failures = [];
    for (const rel of files) {
      try {
        vm.runInContext(fs.readFileSync(path.join(APP_DIR, rel), "utf8"), sandbox, { filename: rel });
      } catch (e) {
        failures.push(rel + "：" + e.message);
      }
    }
    assert.deepEqual(failures, [], "載入時拋出例外");
    assert.deepEqual(errors, [], "載入時輸出 console.error／warn");
    assert.equal(docReads, 0, "載入過程不讀 document（LD-2）");
    const EMT = sandbox.EMT;
    assert.equal(typeof EMT.core.version, "object", "缺少 EMT.core.version");
    assert.equal(typeof EMT.ui.versionLine, "object", "缺少 EMT.ui.versionLine");
    assert.equal(typeof EMT.ui.versionLine.init, "function");
    assert.equal(typeof EMT.core.layout.goalLineText, "function", "缺少 layout.goalLineText");
    assert.equal(typeof EMT.core.layout.levelStatusText, "function", "缺少 layout.levelStatusText");
    assert.equal(EMT.core.version.APP_VERSION_META_NAME, "emt-app-version");
    assert.notEqual(EMT.core.version.APP_VERSION_META_NAME, EMT.core.pwa.PWA_BUILD_ID_META_NAME);
    // 瀏覽器環境下組字可用（buildCode 於呼叫時取用 EMT.core.pwa）
    assert.equal(EMT.core.version.versionLineText("1.0.0", "3f9a2c1d77e2b6a4"), "版本 1.0.0（建置 3f9a2c1）");
    assert.equal(EMT.core.layout.levelStatusText(EMT.core.goal.levelOf("green")), "目前色級：綠");
    assert.equal(EMT.core.layout.goalLineText(EMT.core.goal.levelOf("orange")), "橘級・每日 10 字");
  });
});

// ─────────────────────────────────────────────────────────────
// （v0.10，FE-76）v0.15 新模組：core/position.js（FE-71）、core/part5flow.js（FE-72）；持久化 v3（FE-73）
// 依據：architecture.md v0.10 §10.7 load-order.test.js 列；LD-1、LD-2；契約 C-8、data-schema.ts §15
// ─────────────────────────────────────────────────────────────

describe("load-order.test.js：單字卡位置與答對紀錄（v0.15，FE-76）", () => {
  const APP_DIR = path.join(__dirname, "..");
  const BUILD_MJS = path.join(APP_DIR, "..", "..", "tools", "build.mjs");
  const NEW_CORE = ["core/position.js", "core/part5flow.js"];

  /**
   * 依建置順序在 vm 沙箱載入 src/app 全部檔案（不含 main.js）。
   * - document：以 getter 記錄讀取次數（依檔名分開）。
   * - EMT.core.persist：constants.js 建立 EMT.core 後，改為存取子屬性，記錄「誰在載入時讀取」；
   *   persist.js 自己的指派經 setter 正常保存。
   */
  async function loadWithTraps() {
    const build = await import(pathToFileURL(BUILD_MJS).href);
    const files = build.listAppFiles(APP_DIR).filter((f) => f !== "main.js");
    const errors = [];
    const sandbox = { console: { log() {}, info() {}, debug() {}, warn: (...a) => errors.push(a), error: (...a) => errors.push(a) } };
    sandbox.self = sandbox;
    sandbox.window = sandbox;
    let current = "";
    const docReads = [];
    const persistReads = [];
    Object.defineProperty(sandbox, "document", { configurable: true, get() { docReads.push(current); return undefined; } });
    vm.createContext(sandbox);
    const failures = [];
    let trapped = false;
    for (const rel of files) {
      current = rel;
      try {
        vm.runInContext(fs.readFileSync(path.join(APP_DIR, rel), "utf8"), sandbox, { filename: rel });
      } catch (e) {
        failures.push(rel + "：" + e.message);
      }
      if (!trapped && sandbox.EMT && sandbox.EMT.core) {
        // 在 EMT.core 建立後立即安裝陷阱（persist.js 載入前）
        let stored;
        Object.defineProperty(sandbox.EMT.core, "persist", {
          configurable: true,
          enumerable: true,
          get() { persistReads.push(current); return stored; },
          set(v) { stored = v; }
        });
        trapped = true;
      }
    }
    current = "";
    return { files, sandbox, EMT: sandbox.EMT, failures, errors, docReads, persistReads, trapped };
  }

  test("core/position.js、core/part5flow.js 在建置清單中，且位於 state/、views/ 之前；position 在 wordkey 之後", async () => {
    const build = await import(pathToFileURL(BUILD_MJS).href);
    const files = build.listAppFiles(APP_DIR).filter((f) => f !== "main.js");
    for (const f of NEW_CORE) {
      assert.ok(files.includes(f), "建置清單缺少 " + f);
      assert.ok(files.indexOf(f) < files.findIndex((x) => x.startsWith("state/")), f + " 應在 state/ 之前");
      assert.ok(files.indexOf(f) < files.findIndex((x) => x.startsWith("views/")), f + " 應在 views/ 之前");
    }
    // position 載入時取用 EMT.core.wordkey（LD-1：相依模組須先載入）
    assert.ok(files.indexOf("core/wordkey.js") < files.indexOf("core/position.js"));
  });

  test("依建置順序載入後 EMT.core.position、EMT.core.part5flow 存在；載入時不讀 document、不取用 EMT.core.persist（LD-1、LD-2）", async () => {
    const { sandbox, EMT, failures, errors, docReads, persistReads, trapped } = await loadWithTraps();
    assert.ok(trapped, "未能安裝 EMT.core.persist 陷阱");
    assert.deepEqual(failures, [], "載入時拋出例外");
    assert.deepEqual(errors, [], "載入時輸出 console.error／warn");
    for (const f of NEW_CORE) {
      assert.ok(!docReads.includes(f), f + " 載入時讀取 document");
      assert.ok(!persistReads.includes(f), f + " 載入時取用 EMT.core.persist");
    }
    assert.deepEqual(docReads, [], "載入過程不讀 document（LD-2）");
    assert.equal(typeof EMT.core.position, "object", "缺少 EMT.core.position");
    assert.equal(typeof EMT.core.part5flow, "object", "缺少 EMT.core.part5flow");
    for (const fn of ["isShape", "normalize", "resolve", "fromIndex", "sameCard"]) {
      assert.equal(typeof EMT.core.position[fn], "function", "缺少 position." + fn);
    }
    for (const fn of ["normalizeIds", "countCorrect", "viewKind", "questionState", "canAnswer", "normalizeOnly", "next", "restart", "setOnly", "recordAnswer", "clearAndRestart"]) {
      assert.equal(typeof EMT.core.part5flow[fn], "function", "缺少 part5flow." + fn);
    }
    // （v0.18，UO-7）replay 函式已移除，不保留為隱藏程式
    assert.equal(EMT.core.part5flow["replay" + "KeepRecords"], undefined);
    // persist 本身仍正常登錄（陷阱的 setter 有保存）
    assert.equal(typeof EMT.core.persist, "object");
    // 瀏覽器環境下可用：position 取到 wordkey（以字找回）；
    // 物件在沙箱內建立（isShape 檢查原型，主 realm 的物件會被判為非純物件）
    const pos = vm.runInContext("EMT.core.position.normalize({ wordKey: '  Pay   Off ', ordinal: 2 })", sandbox);
    assert.equal(JSON.stringify(pos), JSON.stringify({ wordKey: "pay off", ordinal: 2 }));
  });

  test("constants.CURRENT_SCHEMA_VERSION === 3；SUPPORTED_SCHEMA_VERSIONS 含 1、2、3；PART5_RECORD_TEXTS 為凍結物件（C-8、data-schema.ts §15）", async () => {
    const { EMT, failures } = await loadWithTraps();
    assert.deepEqual(failures, []);
    const C = EMT.core.constants;
    assert.equal(C.CURRENT_SCHEMA_VERSION, 3);
    assert.deepEqual(Array.from(C.SUPPORTED_SCHEMA_VERSIONS), [1, 2, 3]);
    const T = C.PART5_RECORD_TEXTS;
    assert.equal(typeof T, "object");
    assert.ok(Object.isFrozen(T), "PART5_RECORD_TEXTS 應凍結");
    assert.ok(Object.isFrozen(T.clearConfirmMustInclude), "clearConfirmMustInclude 應凍結");
    assert.deepEqual(Object.keys(T), [
      "correctBadge", "correctCount", "unansweredOnlyLabel", "allCorrectTitle", "clearAndRestart",
      "lockedReviewFeedback", "summaryNoNewAnswers", "filterHint", "filterHintAllCorrect",
      "clearConfirmMustInclude", "confirmOk", "confirmCancel"
    ]);
    assert.equal(T.correctBadge, "✓ 曾答對");
    assert.equal(T.correctCount, "已答對 {k} / {q} 題");
  });
});
