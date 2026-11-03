/*
 * EMT.core.version — 網站版本號契約常數與純函式（FE-63）
 * 依據：architecture.md v0.9 §4.9「EMT.core.version」、§5.4；契約 data-schema.ts §14、README §12.1 VR-1～VR-9、
 *       §12.4 V-VER-01、V-VER-04
 * 涵蓋：US-42、AC-42-01、AC-42-02、AC-42-04、AC-36-02
 *
 * - 4 個契約常數與 data-schema.ts §14 逐字相同（version.test.js 以測試內複製的契約原文比對）。
 * - 純函式：不碰 DOM、不讀 window 資料、不讀任何檔案；版本號只由建置寫入 HTML 的 meta，再由 ui/version-line.js
 *   讀 DOM 後交給本檔組字（VR-5）。本檔不得寫死任何版本號，也不得含建置佔位字串。
 * - 本檔同時由 tools/build.mjs 以 createRequire 讀取（B-18 驗證建置讀到的版本號格式）：
 *   Node 下 module.exports 即同一個 api 物件，不得依賴 window 與 DOM。
 * - L1 模組：載入時不取用任何其他模組（LD-1）；buildCode 需要的 PWA_BUILD_ID_PATTERN 在「呼叫時」才向
 *   core/pwa.js 取用（Node：require("./pwa.js")；瀏覽器：EMT.core.pwa），取不到 → 視為不合法（回 null）。
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.EMT = root.EMT || {};
    root.EMT.core = root.EMT.core || {};
    root.EMT.core.version = api;
  }
})(typeof self !== "undefined" ? self : this, function (root) {
  "use strict";

  // ── data-schema.ts §14 常數（逐字複製，不得自行修改）──

  /** HTML 中記錄網站版本號的 <meta> name（VR-2；日後不得改名） */
  var APP_VERSION_META_NAME = "emt-app-version";

  /** 版本號 X.Y.Z 格式（SemVer 主.次.修訂，無前綴、無預發布與建置中繼資料；VR-3） */
  var APP_VERSION_PATTERN = "^(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)$";

  /** 建置碼長度：BUILD_ID 的前 7 個字元（AC-42-02） */
  var BUILD_CODE_LENGTH = 7;

  /** 頁尾版本行格式字串（全形括號；「版本」「建置」後各 1 個半形空白；VR-7） */
  var VERSION_LINE_TEXT = "版本 {version}（建置 {build}）";

  var VERSION_RE = new RegExp(APP_VERSION_PATTERN);

  /**
   * 版本號是否合法：必須是字串且符合 APP_VERSION_PATTERN（建置與頁面共用）。
   * @param {*} v
   * @returns {boolean}
   */
  function isValidVersion(v) {
    return typeof v === "string" && VERSION_RE.test(v);
  }

  /**
   * 呼叫時才取用 core/pwa.js（LD-1：載入時不取用其他模組）。取不到 → null。
   * @returns {object|null}
   */
  function pwaCore() {
    try {
      if (typeof module === "object" && module.exports && typeof require === "function") {
        return require("./pwa.js");
      }
    } catch (e) {
      return null;
    }
    var emt = root && root.EMT;
    return emt && emt.core && emt.core.pwa ? emt.core.pwa : null;
  }

  /**
   * 建置碼：buildId 為字串且符合 PWA_BUILD_ID_PATTERN → 前 BUILD_CODE_LENGTH 個字元；否則 null。
   * @param {*} buildId
   * @returns {string|null}
   */
  function buildCode(buildId) {
    if (typeof buildId !== "string") { return null; }
    var pwa = pwaCore();
    if (!pwa || typeof pwa.PWA_BUILD_ID_PATTERN !== "string") { return null; }
    if (!new RegExp(pwa.PWA_BUILD_ID_PATTERN).test(buildId)) { return null; }
    return buildId.slice(0, BUILD_CODE_LENGTH);
  }

  /**
   * 頁尾版本行文字。兩者皆合法 → VERSION_LINE_TEXT 的 {version}、{build} 各替換 1 次
   * （以 split/join，避免 replace 的 $ 樣式被解讀）；任一不合法 → null（VR-8：不產生部分文字）。
   * @param {*} version emt-app-version 的 content
   * @param {*} buildId emt-build-id 的 content
   * @returns {string|null}
   */
  function versionLineText(version, buildId) {
    if (!isValidVersion(version)) { return null; }
    var code = buildCode(buildId);
    if (code === null) { return null; }
    return VERSION_LINE_TEXT.split("{version}").join(version).split("{build}").join(code);
  }

  return Object.freeze({
    APP_VERSION_META_NAME: APP_VERSION_META_NAME,
    APP_VERSION_PATTERN: APP_VERSION_PATTERN,
    BUILD_CODE_LENGTH: BUILD_CODE_LENGTH,
    VERSION_LINE_TEXT: VERSION_LINE_TEXT,
    isValidVersion: isValidVersion,
    buildCode: buildCode,
    versionLineText: versionLineText
  });
});
