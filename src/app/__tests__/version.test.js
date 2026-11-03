/*
 * version.test.js — EMT.core.version 單元測試（FE-63）
 * 依據：architecture.md v0.9 §4.9「EMT.core.version」、§10.6「version.test.js」；契約 data-schema.ts §14、
 *       README §12.1 VR-5、VR-8、§12.4 V-VER-04
 * 涵蓋：AC-42-01、AC-42-02、AC-36-02
 */
"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const V = require("../core/version.js");
const PWA = require("../core/pwa.js");
const SRC_FILE = path.join(__dirname, "..", "core", "version.js");

/** data-schema.ts §14 契約原文（測試內複製，逐字比對） */
const CONTRACT = {
  APP_VERSION_META_NAME: "emt-app-version",
  APP_VERSION_PATTERN: "^(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)$",
  BUILD_CODE_LENGTH: 7,
  VERSION_LINE_TEXT: "版本 {version}（建置 {build}）"
};

const GOOD_ID = "3f9a2c1d77e2b6a4";

describe("version.test.js：契約常數", () => {
  test("4 個常數與 data-schema.ts §14 逐字相同", () => {
    for (const [k, v] of Object.entries(CONTRACT)) assert.equal(V[k], v, k);
    // 全形括號、半形空白
    assert.ok(V.VERSION_LINE_TEXT.includes("（") && V.VERSION_LINE_TEXT.includes("）"));
    assert.equal(V.VERSION_LINE_TEXT.indexOf("版本 {version}"), 0);
  });

  test("api 物件已凍結；meta name 與 emt-build-id 不同", () => {
    assert.ok(Object.isFrozen(V));
    assert.notEqual(V.APP_VERSION_META_NAME, PWA.PWA_BUILD_ID_META_NAME);
  });
});

describe("version.test.js：isValidVersion", () => {
  test("合法：1.0.0、1.0.1、0.10.3、0.0.0、10.20.30", () => {
    for (const v of ["1.0.0", "1.0.1", "0.10.3", "0.0.0", "10.20.30"]) assert.equal(V.isValidVersion(v), true, v);
  });
  test("不合法：v1.0.0、1.0、1.0.0-beta、1.0.0+1、01.0.0、空字串、前後空白、null、undefined、數字、物件", () => {
    for (const v of ["v1.0.0", "1.0", "1.0.0-beta", "1.0.0+1", "01.0.0", "1.00.0", "", " 1.0.0", "1.0.0\n", "@@APP_VERSION@@", null, undefined, 1, {}, ["1.0.0"]]) {
      assert.equal(V.isValidVersion(v), false, String(v));
    }
  });
});

describe("version.test.js：buildCode", () => {
  test("16 位小寫 hex → 前 7 碼", () => {
    assert.equal(V.buildCode(GOOD_ID), "3f9a2c1");
    assert.equal(V.buildCode("0000000000000000"), "0000000");
  });
  test("@@BUILD_ID@@、15／17 位、大寫、非字串 → null", () => {
    for (const v of ["@@BUILD_ID@@", GOOD_ID.slice(0, 15), GOOD_ID + "a", GOOD_ID.toUpperCase(), "", null, undefined, 123]) {
      assert.equal(V.buildCode(v), null, String(v));
    }
  });
});

describe("version.test.js：versionLineText", () => {
  test("合法 → 「版本 1.0.0（建置 3f9a2c1）」逐字（全形括號、半形空白）", () => {
    assert.equal(V.versionLineText("1.0.0", GOOD_ID), "版本 1.0.0（建置 3f9a2c1）");
    assert.equal(V.versionLineText("1.0.0", GOOD_ID), "版本 1.0.0（建置 3f9a2c1）");
    assert.equal(V.versionLineText("0.10.3", "abcdef0123456789"), "版本 0.10.3（建置 abcdef0）");
  });
  test("任一不合法 → null（不產生部分文字）", () => {
    const bad = [
      ["@@APP_VERSION@@", GOOD_ID],
      ["v1.0.0", GOOD_ID],
      [undefined, GOOD_ID],
      ["1.0.0", "@@BUILD_ID@@"],
      ["1.0.0", GOOD_ID.slice(0, 15)],
      ["1.0.0", null],
      [null, null]
    ];
    for (const [v, b] of bad) assert.equal(V.versionLineText(v, b), null, `${v} / ${b}`);
  });
  test("版本字串中的 $ 樣式不被解讀（split/join）", () => {
    // 合法版本號不可能含 $，此處直接驗證組字方式：原始碼不以 replace 組字
    const src = fs.readFileSync(SRC_FILE, "utf8");
    assert.ok(/split\("\{version\}"\)\.join\(/.test(src));
    assert.ok(/split\("\{build\}"\)\.join\(/.test(src));
  });
});

describe("version.test.js：瀏覽器載入（LD-1）", () => {
  test("在只有 self／window 的沙箱載入：登錄 EMT.core.version；buildCode 於呼叫時取用 EMT.core.pwa，沒有 pwa → null", () => {
    const sandbox = { console };
    sandbox.self = sandbox;
    sandbox.window = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(SRC_FILE, "utf8"), sandbox, { filename: "core/version.js" });
    const ver = sandbox.EMT.core.version;
    assert.equal(ver.APP_VERSION_META_NAME, "emt-app-version");
    assert.equal(ver.buildCode(GOOD_ID), null, "尚未載入 core/pwa.js");
    vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "core", "pwa.js"), "utf8"), sandbox, { filename: "core/pwa.js" });
    assert.equal(ver.buildCode(GOOD_ID), "3f9a2c1");
    assert.equal(ver.versionLineText("1.0.0", GOOD_ID), "版本 1.0.0（建置 3f9a2c1）");
  });
});

describe("version.test.js：原始碼掃描（VR-5）", () => {
  const src = fs.readFileSync(SRC_FILE, "utf8");
  test("不含 @@、不含形如 X.Y.Z 的版本字面值", () => {
    assert.ok(!src.includes("@@"));
    assert.doesNotMatch(src, /\d+\.\d+\.\d+/);
  });
  test("不讀檔、不發請求、不碰 DOM 與儲存", () => {
    for (const w of ["fetch", "XMLHttpRequest", "import(", "package.json", "localStorage", "document"]) {
      assert.ok(!src.includes(w), w);
    }
  });
});
