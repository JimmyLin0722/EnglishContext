// 建置腳本 tools/build.mjs 的單元測試（FE-01；architecture.md §5 B-1～B-8）
// 以 os.tmpdir() 下的 fixture 目錄測試，不寫入 dist/。
// （v0.7，FE-47）既有 fixture 的 opts 一律 site: false（舊模板無 @@BUILD_ID@@，走非 PWA 模式，既有斷言不變）；
// 新增 PWA 建置（B-10～B-16、V-PWA-01～V-PWA-06、AC-36-01 三情境）與 tools/serve.mjs 測試，見檔尾。
// （v0.9，FE-63）PWA fixture 模板加 emt-app-version meta，並以暫存 package.json（packageFile）建置；HD-1 改為 8 項；
// 新增 B-17～B-19（V-VER-01、V-VER-02、V-VER-06、VR-4）測試，見檔尾。舊非 PWA fixture 無版本佔位 → 略過版本步驟。
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const { pathToFileURL } = require("node:url");
const { spawnSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..", "..", "..");
const BUILD = path.join(ROOT, "tools", "build.mjs");

/** 載入 ESM 建置模組 */
let modPromise = null;
function loadBuild() {
  if (!modPromise) modPromise = import(pathToFileURL(BUILD).href);
  return modPromise;
}

/** 標準最小模板（與 src/app/index.html 標記位置相同） */
const TEMPLATE = [
  "<!DOCTYPE html>",
  '<html lang="zh-Hant-TW">',
  "<head>",
  '<meta charset="utf-8">',
  "<!-- @@LICENSE@@ -->",
  "<title>T</title>",
  "<style>/* @@STYLES@@ */</style>",
  "</head>",
  "<body>",
  "<!-- @@DATA@@ -->",
  "<!-- @@APP@@ -->",
  "</body>",
  "</html>",
  "",
].join("\n");

const LICENSE = "MIT License\n\nCopyright (c) {{YEAR}} JimmyLin\n";

/** 建立暫存 fixture：files 為 { 相對路徑: 內容 } */
function fixture(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "emt-build-"));
  const all = Object.assign(
    { "app/index.html": TEMPLATE, "app/license-header.txt": LICENSE },
    files
  );
  for (const [rel, content] of Object.entries(all)) {
    if (content === null) continue; // null = 不建立
    const abs = path.join(dir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content, "utf8");
  }
  fs.mkdirSync(path.join(dir, "data"), { recursive: true });
  return {
    dir,
    opts: {
      app: path.join(dir, "app"),
      data: path.join(dir, "data"),
      out: path.join(dir, "out", "t.html"),
      site: false,
      log: () => {},
      warn: () => {},
    },
    cleanup: () => fs.rmSync(dir, { recursive: true, force: true }),
  };
}

/** 執行建置並回傳結果；fixture 自動清除 */
async function runBuild(files, extra) {
  const { build } = await loadBuild();
  const fx = fixture(files);
  try {
    const res = build(Object.assign({}, fx.opts, extra));
    res.written = fs.existsSync(fx.opts.out) ? fs.readFileSync(fx.opts.out, "utf8") : null;
    return res;
  } finally {
    fx.cleanup();
  }
}

/** 斷言建置中止且錯誤代碼相符，且未寫出產物 */
async function expectAbort(files, code) {
  const { build } = await loadBuild();
  const fx = fixture(files);
  try {
    assert.throws(() => build(fx.opts), (err) => {
      assert.equal(err.name, "BuildError");
      assert.equal(err.code, code, err.message);
      return true;
    });
    assert.equal(fs.existsSync(fx.opts.out), false, "中止時不得寫出產物");
  } finally {
    fx.cleanup();
  }
}

/** 字庫分檔寫法（契約 §3.1） */
function vocabFile(items) {
  return (
    "// 測試用字庫\nwindow.MASTER_VOCAB_DATABASE = (window.MASTER_VOCAB_DATABASE || []).concat([\n" +
    items.map((x) => JSON.stringify(x)).join(",\n") +
    "\n]);\n"
  );
}

/** 在沙箱執行產物中的所有 <script>，回傳 window */
function runOutputScripts(html) {
  const sandbox = { window: {} };
  sandbox.self = sandbox.window;
  const re = /<script>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html))) vm.runInNewContext(m[1], sandbox);
  return sandbox.window;
}

// ─── B-1 模板標記 ───

test("B-1：缺少任一標記即中止", async () => {
  for (const marker of ["<!-- @@LICENSE@@ -->", "/* @@STYLES@@ */", "<!-- @@DATA@@ -->", "<!-- @@APP@@ -->"]) {
    await expectAbort({ "app/index.html": TEMPLATE.replace(marker, "") }, "MARKER_MISSING");
  }
});

test("B-1：標記重複、位置錯誤即中止", async () => {
  await expectAbort(
    { "app/index.html": TEMPLATE.replace("<!-- @@APP@@ -->", "<!-- @@APP@@ -->\n<!-- @@APP@@ -->") },
    "MARKER_DUPLICATE"
  );
  // DATA 在 APP 之後
  await expectAbort(
    { "app/index.html": TEMPLATE.replace("<!-- @@DATA@@ -->\n<!-- @@APP@@ -->", "<!-- @@APP@@ -->\n<!-- @@DATA@@ -->") },
    "MARKER_POSITION"
  );
  // LICENSE 未緊接 <meta charset>（v0.2）
  await expectAbort(
    { "app/index.html": TEMPLATE.replace('<meta charset="utf-8">\n<!-- @@LICENSE@@ -->', '<meta charset="utf-8">\n<p>x</p><!-- @@LICENSE@@ -->') },
    "MARKER_POSITION"
  );
  // 舊順序：LICENSE 在 <html> 之前（授權標頭會把 charset 推出前 1,024 bytes）
  await expectAbort(
    {
      "app/index.html": TEMPLATE.replace("\n<!-- @@LICENSE@@ -->", "").replace(
        "<!DOCTYPE html>\n",
        "<!DOCTYPE html>\n<!-- @@LICENSE@@ -->\n"
      ),
    },
    "MARKER_POSITION"
  );
  // 開頭順序錯誤：<meta charset> 在 <html> 之前
  await expectAbort(
    {
      "app/index.html": TEMPLATE.replace(
        '<!DOCTYPE html>\n<html lang="zh-Hant-TW">\n<head>\n<meta charset="utf-8">',
        '<!DOCTYPE html>\n<meta charset="utf-8">\n<html lang="zh-Hant-TW">\n<head>'
      ),
    },
    "MARKER_POSITION"
  );
  // STYLES 不在 <style> 內
  await expectAbort(
    { "app/index.html": TEMPLATE.replace("<style>/* @@STYLES@@ */</style>", "<style></style>/* @@STYLES@@ */") },
    "MARKER_POSITION"
  );
  // APP 在 </body> 之後
  await expectAbort(
    { "app/index.html": TEMPLATE.replace("<!-- @@APP@@ -->\n</body>", "</body>\n<!-- @@APP@@ -->") },
    "MARKER_POSITION"
  );
});

test("B-1：專案的 src/app/index.html 通過標記檢查且含必要元素", async () => {
  const { checkTemplate } = await loadBuild();
  const tpl = fs.readFileSync(path.join(ROOT, "src", "app", "index.html"), "utf8");
  checkTemplate(tpl);
  assert.match(
    tpl,
    /^<!DOCTYPE html>\r?\n<html lang="zh-Hant-TW">\r?\n<head>\r?\n<meta charset="utf-8">\r?\n<!-- @@LICENSE@@ -->/
  );
  assert.match(tpl, /<html lang="zh-Hant-TW">/);
  assert.match(tpl, /<meta charset="utf-8">/);
  assert.match(tpl, /<meta name="viewport"/);
  // （v0.12，FE-56，NM-1）
  assert.match(tpl, /<title>EnglishContext<\/title>/);
  assert.doesNotMatch(tpl, /english\s*master\s*track/i);
  assert.match(tpl, /<style>\/\* @@STYLES@@ \*\/<\/style>/);
});

// ─── B-7 外部資源與大小 ───

test("B-7：模板或程式含外部 <script src> 即中止", async () => {
  await expectAbort(
    { "app/index.html": TEMPLATE.replace("</head>", '<script src="https://example.com/a.js"></script>\n</head>') },
    "EXTERNAL_RESOURCE"
  );
  await expectAbort({ "app/core/x.js": 'var s = "<script type=\\"x\\" src=\\"a.js\\">";\n' }, "EXTERNAL_RESOURCE");
});

test("B-7：其他外部資源樣式（link href、img、iframe、CDN）即中止", async () => {
  const cases = [
    '<link rel="stylesheet" href="a.css">',
    '<img alt="" >',
    "<iframe></iframe>",
    "<p>cdn.example.com</p>",
    "<p>fonts.googleapis</p>",
  ];
  for (const c of cases) {
    await expectAbort({ "app/index.html": TEMPLATE.replace("</head>", c + "\n</head>") }, "EXTERNAL_RESOURCE");
  }
});

test("B-7（v0.5，FE-41）：程式、註解或模板含 MediaRecorder 即中止（AC-21-03）", async () => {
  const { FORBIDDEN_PATTERNS } = await loadBuild();
  assert.ok(
    FORBIDDEN_PATTERNS.some((p) => p.name === "MediaRecorder" && p.re.test("MediaRecorder")),
    "FORBIDDEN_PATTERNS 須含 MediaRecorder"
  );
  // 程式呼叫
  await expectAbort({ "app/services/x.js": "var r = new MediaRecorder(stream);\n" }, "EXTERNAL_RESOURCE");
  // 只出現在註解也中止
  await expectAbort({ "app/core/x.js": "// 不使用 MediaRecorder\nvar a = 1;\n" }, "EXTERNAL_RESOURCE");
  // 模板
  await expectAbort({ "app/index.html": TEMPLATE.replace("</head>", "<!-- MediaRecorder -->\n</head>") }, "EXTERNAL_RESOURCE");
  // 對照：getUserMedia 本身不在 B-7 禁止清單（位置由靜態檢查限制）
  const ok = await runBuild({ "app/services/mic.js": "var g = 'getUserMedia';\n" });
  assert.ok(ok.written && ok.written.includes("getUserMedia"));
});

test("B-5：樣式含 @import 或 url(http 即中止；B-7 模板含 @import 也中止", async () => {
  await expectAbort({ "app/styles/00-base.css": '@import "x.css";\nbody{}' }, "CSS_IMPORT");
  await expectAbort({ "app/styles/00-base.css": "body{background:url( 'https://x/y.png')}" }, "CSS_EXTERNAL_URL");
  await expectAbort(
    { "app/index.html": TEMPLATE.replace("</head>", "<style>@import url(a.css);</style>\n</head>") },
    "EXTERNAL_RESOURCE"
  );
});

test("B-7：charset 宣告結束位置超出前 1,024 bytes 即中止（v0.2）", async () => {
  // <html> 帶長屬性仍符合 B-1 開頭規則，但會把 charset 推出前 1,024 bytes
  const longAttr = "x".repeat(1000);
  await expectAbort(
    { "app/index.html": TEMPLATE.replace('<html lang="zh-Hant-TW">', `<html lang="zh-Hant-TW" data-x="${longAttr}">`) },
    "CHARSET_POSITION"
  );
  // 邊界：結束位置恰為 1,024 bytes 通過、1,025 bytes 中止
  const { checkCharset, CHARSET_MAX_BYTES } = await loadBuild();
  const meta = '<meta charset="utf-8">';
  const pad = (n) => "<!DOCTYPE html>" + " ".repeat(n - 15 - meta.length) + meta + "\n<p>本文</p>";
  assert.equal(CHARSET_MAX_BYTES, 1024);
  assert.equal(checkCharset(pad(1024)), 1024);
  assert.throws(() => checkCharset(pad(1025)), (e) => e.code === "CHARSET_POSITION");
  // charset 前有非 ASCII 字元、或缺少 charset 也中止
  assert.throws(() => checkCharset("<!-- 中文 -->" + meta), (e) => e.code === "CHARSET_POSITION");
  assert.throws(() => checkCharset("<!DOCTYPE html><p>x</p>"), (e) => e.code === "CHARSET_POSITION");
});

test("B-7：產物超過 5,242,880 bytes 即中止", async () => {
  const big = "a".repeat(5242880);
  await expectAbort({ "data/part5.js": `window.PART5_QUESTION_BANK = [${JSON.stringify(big)}];` }, "SIZE_LIMIT");
});

test("B-7：超過 4.5 MiB 只警告、仍成功", async () => {
  const big = "a".repeat(4800000);
  const res = await runBuild({ "data/part5.js": `window.PART5_QUESTION_BANK = [${JSON.stringify(big)}];` });
  assert.ok(res.bytes > 4718592 && res.bytes <= 5242880);
  assert.ok(res.warnings.some((w) => w.includes("4.5 MiB")));
});

// ─── B-3 內嵌安全 ───

test("B-3：資料中的 </script> 與 <!-- 被跳脫，且執行後值不變", async () => {
  const evil = 'x</script><script>alert(1)</script><!-- y $& $1 <!-- @@APP@@ -->';
  const res = await runBuild({
    "data/decoder.js": `window.DECODER_SENTENCES = [{ "id": "d1", "text": ${JSON.stringify(evil)} }];`,
  });
  const html = res.written;
  // 產物只有資料、程式兩個 </script>
  assert.equal((html.match(/<\/script/gi) || []).length, 2);
  assert.ok(html.includes("<\\/script>"));
  assert.ok(html.includes("<\\!--"));
  // 資料段內不得出現未跳脫的 <!--
  const dataScript = /<script>([\s\S]*?)<\/script>/.exec(html)[1];
  assert.equal(dataScript.includes("<!--"), false);
  const win = JSON.parse(JSON.stringify(runOutputScripts(html)));
  assert.equal(win.DECODER_SENTENCES[0].text, evil);
});

test("B-3：程式含 </script 字樣即中止", async () => {
  await expectAbort({ "app/core/x.js": 'var s = "</SCRIPT>";\n' }, "CODE_SCRIPT_CLOSE");
});

// ─── B-2 資料收集 ───

test("B-2：多個 vocab 檔合併後依 rank 排序為單一陣列，與 concat 結果等價", async () => {
  const a = [{ rank: 2, word: "b" }, { rank: 1, word: "a" }, { rank: 3, word: "c" }];
  const b = [{ rank: 5, word: "e" }, { rank: 4, word: "d" }];
  const res = await runBuild({
    "data/vocab-0004.js": vocabFile(b),
    "data/vocab-0001.js": vocabFile(a),
    "data/sources.js": 'window.PROJECT_LICENSE = { "copyrightHolder": "JimmyLin", "copyrightYear": 2026 };',
  });
  const html = res.written;
  assert.equal((html.match(/window\.MASTER_VOCAB_DATABASE=/g) || []).length, 1, "只輸出一次");
  assert.equal(html.includes(".concat("), false, "輸出為單一陣列字面值");
  const win = JSON.parse(JSON.stringify(runOutputScripts(html)));
  assert.deepEqual(win.MASTER_VOCAB_DATABASE.map((x) => x.rank), [1, 2, 3, 4, 5]);
  assert.deepEqual(win.MASTER_VOCAB_DATABASE.map((x) => x.word), ["a", "b", "c", "d", "e"]);
  assert.equal(res.vocabCount, 5);
  // 與瀏覽器 concat 後排序的結果等價
  const concat = [...b, ...a].sort((x, y) => x.rank - y.rank);
  assert.deepEqual(JSON.parse(JSON.stringify(win.MASTER_VOCAB_DATABASE)), concat);
  // 載入順序：sources.js 在 vocab 之前
  assert.ok(html.indexOf("window.PROJECT_LICENSE=") < html.indexOf("window.MASTER_VOCAB_DATABASE="));
});

test("B-2：資料檔依 sources → vocab → templates → part5 → decoder → phrasebank → 其他排序", async () => {
  const { listDataFiles } = await loadBuild();
  const fx = fixture({
    "data/phrasebank.js": "",
    "data/zzz.js": "",
    "data/decoder.js": "",
    "data/part5.js": "",
    "data/templates.js": "",
    "data/vocab-0401.js": "",
    "data/vocab-0001.js": "",
    "data/sources.js": "",
    "data/notes.txt": "",
  });
  try {
    const { files, unknown } = listDataFiles(fx.opts.data);
    assert.deepEqual(files, [
      "sources.js", "vocab-0001.js", "vocab-0401.js", "templates.js",
      "part5.js", "decoder.js", "phrasebank.js", "zzz.js",
    ]);
    assert.deepEqual(unknown, ["zzz.js"]);
  } finally {
    fx.cleanup();
  }
});

test("B-2：資料檔執行失敗或不符 C-4 即中止", async () => {
  await expectAbort({ "data/part5.js": "window.PART5_QUESTION_BANK = [;" }, "DATA_EXEC");
  await expectAbort({ "data/part5.js": "throw new Error('x');" }, "DATA_EXEC");
  await expectAbort({ "data/part5.js": "window.PART5_QUESTION_BANK = [function () {}];" }, "DATA_NOT_JSON");
  await expectAbort({ "data/part5.js": "window.PART5_QUESTION_BANK = [{ a: undefined }];" }, "DATA_NOT_JSON");
  await expectAbort({ "data/vocab-0001.js": "window.MASTER_VOCAB_DATABASE = 1;" }, "DATA_NOT_JSON");
});

test("D-1：_ 開頭檔案／目錄與 __tests__ 不被打包", async () => {
  const res = await runBuild({
    "data/_tools/lib.js": 'window.SHOULD_NOT_1 = "x";',
    "data/_draft.js": 'window.SHOULD_NOT_2 = "x";',
    "data/_records/a.md": "SHOULD_NOT_3",
    "data/templates.js": 'window.DOMAIN_TEMPLATES = [];',
    "app/__tests__/a.test.js": "/* SHOULD_NOT_4 */",
    "app/core/__tests__/b.test.js": "/* SHOULD_NOT_5 */",
    "app/core/_scratch.js": "/* SHOULD_NOT_6 */",
    "app/core/goal.js": "/* GOAL_OK */",
  });
  for (let i = 1; i <= 6; i++) assert.equal(res.written.includes(`SHOULD_NOT_${i}`), false, `SHOULD_NOT_${i}`);
  assert.ok(res.written.includes("GOAL_OK"));
  assert.ok(res.written.includes("window.DOMAIN_TEMPLATES=[];"));
});

test("無資料檔（含資料目錄不存在）時仍成功，只警告", async () => {
  const res = await runBuild({});
  assert.ok(res.written.startsWith("<!DOCTYPE html>"));
  assert.equal(res.vocabCount, 0);
  assert.ok(res.warnings.some((w) => w.includes("沒有可打包的資料檔")));

  const res2 = await runBuild({}, { data: path.join(os.tmpdir(), "emt-build-no-such-dir-" + Date.now()) });
  assert.ok(res2.written.startsWith("<!DOCTYPE html>"));
});

// ─── B-4 程式串接順序 ───

test("B-4：程式依 core（constants、wordkey 最先）→ state → services → ui → views → main.js 串接", async () => {
  const res = await runBuild({
    "app/main.js": "/* M_MAIN */",
    "app/views/a.js": "/* M_VIEWS */",
    "app/ui/a.js": "/* M_UI */",
    "app/services/a.js": "/* M_SERVICES */",
    "app/state/store.js": "/* M_STATE */",
    "app/core/aaa.js": "/* M_CORE_AAA */",
    "app/core/wordkey.js": "/* M_WORDKEY */",
    "app/core/constants.js": "/* M_CONSTANTS */",
    "app/core/zzz.js": "/* M_CORE_ZZZ */",
  });
  const order = ["M_CONSTANTS", "M_WORDKEY", "M_CORE_AAA", "M_CORE_ZZZ", "M_STATE", "M_SERVICES", "M_UI", "M_VIEWS", "M_MAIN"];
  const idx = order.map((k) => res.written.indexOf(k));
  assert.ok(idx.every((i) => i >= 0));
  assert.deepEqual([...idx].sort((x, y) => x - y), idx);
  // 標記皆已替換
  assert.ok(res.written.indexOf("<!-- @@") < 0);
});

test("B-5：樣式依檔名序串接進 <style>", async () => {
  const res = await runBuild({
    "app/styles/10-b.css": ".b{}",
    "app/styles/00-a.css": ".a{}",
  });
  const style = /<style>([\s\S]*?)<\/style>/.exec(res.written)[1];
  assert.ok(style.indexOf(".a{}") >= 0 && style.indexOf(".a{}") < style.indexOf(".b{}"));
});

// ─── B-6 授權標頭 ───

test("B-6：年份取自 PROJECT_LICENSE.copyrightYear，缺時用當年並警告", async () => {
  const res = await runBuild({
    "data/sources.js": 'window.PROJECT_LICENSE = { "copyrightHolder": "JimmyLin", "copyrightYear": 2031 };',
  });
  assert.ok(res.written.startsWith('<!DOCTYPE html>\n<html lang="zh-Hant-TW">\n<head>\n<meta charset="utf-8">\n<!--\n'));
  assert.ok(res.written.includes("Copyright (c) 2031 JimmyLin"));

  const res2 = await runBuild({}, { now: new Date(2029, 5, 1) });
  assert.ok(res2.written.includes("Copyright (c) 2029 JimmyLin"));
  assert.ok(res2.warnings.some((w) => w.includes("copyrightYear")));
});

test("B-6：授權標頭含連續兩個減號即中止", async () => {
  await expectAbort({ "app/license-header.txt": "MIT -- x" }, "LICENSE_DOUBLE_DASH");
});

test("AC-23-06：專案 license-header.txt 含 MIT 全文與 CC BY-SA 4.0 聲明，且無連續兩個減號", () => {
  const txt = fs.readFileSync(path.join(ROOT, "src", "app", "license-header.txt"), "utf8");
  assert.equal(txt.includes("--"), false);
  assert.ok(txt.includes("Copyright (c) {{YEAR}} JimmyLin"));
  assert.ok(txt.includes("Permission is hereby granted, free of charge, to any person obtaining a copy"));
  assert.ok(txt.includes("The above copyright notice and this permission notice shall be included in all"));
  assert.ok(txt.includes('THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND'));
  // （v0.12，FE-78）單字資料與原創內容分成兩句；固定文字逐字照契約 L-8 LT-3（V-LGL-04）
  assert.ok(txt.includes("單字資料以 CC BY-SA 4.0 授權"));
  assert.ok(
    txt.includes(
      "原創內容（例句、解析、Part 5 題目、長難句、句型）由 JimmyLin 以 AI 輔助編製，JimmyLin 就其享有的權利以 CC BY-SA 4.0 授權"
    )
  );
  assert.ok(txt.includes("https://creativecommons.org/licenses/by-sa/4.0/"));
  // （v0.11，FE-47；v0.12，FE-78）品牌標識聲明 LT-4 + 全形句號，逐字一行（AC-23-06、Q-48）
  assert.ok(
    txt.split(/\r?\n/).includes(
      "PWA 圖示由 AI 依 JimmyLin 的構想生成；圖示與名稱「EnglishContext」作為品牌標識使用，JimmyLin 保留其享有的權利，不適用 MIT 與 CC BY-SA 4.0。"
    )
  );
  // （v0.12，FE-78）第一行名稱不變（NM-4）；舊聲明與 LT-5 不得出現（R-25 PM 判斷 (c)）
  assert.equal(txt.split(/\r?\n/)[0], "EnglishContext");
  assert.equal(txt.includes("原創內容著作權人 JimmyLin"), false);
  assert.equal(txt.includes("保留所有權利"), false);
  assert.equal(txt.includes("TOEIC® 為 ETS 的註冊商標。本網站與 ETS 無關，亦未經其認可或核准。"), false);
});

// ─── B-8 報告 ───

test("B-8：報告含總 bytes、各區段 bytes 與字庫平均每筆 bytes", async () => {
  const lines = [];
  const res = await runBuild(
    {
      "data/vocab-0001.js": vocabFile([{ rank: 1, word: "a" }, { rank: 2, word: "b" }]),
      "data/part5.js": "window.PART5_QUESTION_BANK = [];",
      "app/styles/00-a.css": ".a{}",
      "app/main.js": "/* main */",
    },
    { log: (s) => lines.push(s) }
  );
  const report = lines.join("\n");
  assert.match(report, /總大小：[\d,]+ bytes/);
  for (const name of ["授權標頭", "CSS", "資料 window.MASTER_VOCAB_DATABASE", "資料 window.PART5_QUESTION_BANK", "程式"]) {
    assert.match(report, new RegExp(name.replace(/\./g, "\\.") + "：[\\d,]+ bytes"));
  }
  assert.match(report, /平均每筆 [\d.]+ bytes/);
  assert.equal(res.sections.reduce((a, s) => a + s.bytes, 0), res.bytes, "各區段加總等於總大小");
  assert.equal(Buffer.byteLength(res.written, "utf8"), res.bytes);
});

// ─── 命令列 ───

test("CLI：--out、--data、--app 參數；成功結束碼 0，中止結束碼 1 且不寫出產物", () => {
  const fx = fixture({ "data/templates.js": "window.DOMAIN_TEMPLATES = [];" });
  try {
    const ok = spawnSync(
      process.execPath,
      [BUILD, "--out", fx.opts.out, "--data", fx.opts.data, "--app", fx.opts.app, "--no-site"],
      { encoding: "utf8" }
    );
    assert.equal(ok.status, 0, ok.stderr);
    assert.match(ok.stdout, /總大小/);
    assert.ok(fs.readFileSync(fx.opts.out, "utf8").startsWith("<!DOCTYPE html>"));

    fs.rmSync(fx.opts.out);
    fs.writeFileSync(path.join(fx.opts.app, "index.html"), TEMPLATE.replace("<!-- @@DATA@@ -->", ""));
    const bad = spawnSync(
      process.execPath,
      [BUILD, `--out=${fx.opts.out}`, `--data=${fx.opts.data}`, `--app=${fx.opts.app}`, "--no-site"],
      { encoding: "utf8" }
    );
    assert.equal(bad.status, 1);
    assert.match(bad.stderr, /MARKER_MISSING/);
    assert.equal(fs.existsSync(fx.opts.out), false);

    const badArg = spawnSync(process.execPath, [BUILD, "--nope"], { encoding: "utf8" });
    assert.equal(badArg.status, 1);
  } finally {
    fx.cleanup();
  }
});

// ═══════════════════════════════════════════════════════════════
// （v0.7，FE-47）PWA 建置 B-10～B-16、V-PWA-01～V-PWA-06、AC-36-01、tools/serve.mjs
// 依據：architecture.md v0.7 §5.1、§7.18.2、§10.4「build.test.js」列 (1)～(12)
// PNG 以測試內函式產生（不讀 src/app/assets）；常數取專案 core/pwa.js（與建置相同來源）
// ═══════════════════════════════════════════════════════════════

const zlib = require("node:zlib");
const http = require("node:http");
const PWA = require("../core/pwa.js");

/** CRC-32（PNG 區塊用） */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

/**
 * 產生最小 PNG。
 * @param {number} size 邊長
 * @param {{ colorType?: number, trns?: boolean, height?: number, shade?: number }} [o]
 */
function makePng(size, o = {}) {
  const colorType = o.colorType === undefined ? 2 : o.colorType;
  const height = o.height || size;
  const channels = colorType === 6 ? 4 : 3;
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = colorType;
  const row = Buffer.alloc(1 + size * channels, o.shade || 0x40);
  row[0] = 0;
  const raw = Buffer.concat(Array.from({ length: height }, () => row));
  const parts = [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr)];
  if (o.trns) parts.push(chunk("tRNS", Buffer.from([0, 0, 0, 0, 0, 0])));
  parts.push(chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0)));
  return Buffer.concat(parts);
}

/** HD-1 的 8 個靜態元素（逐字；v0.9 起 emt-app-version 緊接 emt-build-id） */
const HD1 = [
  '<meta name="theme-color" content="#1e9bf0">',
  '<meta name="apple-mobile-web-app-title" content="EnglishContext">',
  '<meta name="apple-mobile-web-app-capable" content="yes">',
  '<meta name="mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-status-bar-style" content="default">',
  '<meta name="emt-build-id" content="@@BUILD_ID@@">',
  '<meta name="emt-app-version" content="@@APP_VERSION@@">',
  '<link rel="icon" href="data:,">',
];
/** data:, 圖示連結（HD1 中的位置隨版本 meta 加入而後移，以名稱取用） */
const ICON_LINK = '<link rel="icon" href="data:,">';
/** 暫存 package.json 的內容（只有 version 會被讀取） */
function pkgJson(version, extra) {
  return JSON.stringify(Object.assign({ name: "fixture", version }, extra), null, 2) + "\n";
}

const PWA_TEMPLATE_HTML = [
  "<!DOCTYPE html>",
  '<html lang="zh-Hant-TW">',
  "<head>",
  '<meta charset="utf-8">',
  "<!-- @@LICENSE@@ -->",
  '<meta name="viewport" content="width=device-width, initial-scale=1">',
  "<title>EnglishContext</title>",
  ...HD1,
  "<style>/* @@STYLES@@ */</style>",
  "</head>",
  "<body>",
  "<!-- @@DATA@@ -->",
  "<!-- @@APP@@ -->",
  "</body>",
  "</html>",
  "",
].join("\n");

const SW_TEMPLATE_REAL = fs.readFileSync(path.join(__dirname, "..", "pwa", "sw.template.js"), "utf8");
const ADS = "google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0\n";

/** PWA fixture 的預設檔案（{ 相對路徑: 內容 }；Buffer 原樣寫入） */
function pwaFiles(over = {}) {
  return Object.assign(
    {
      "app/index.html": PWA_TEMPLATE_HTML,
      "app/license-header.txt": LICENSE,
      "app/pwa/sw.template.js": SW_TEMPLATE_REAL,
      "app/styles/00-base.css": ":root {\n  --bg: #eef4fa;\n  --primary: #0866ad;\n}\nbody { background: var(--bg); }\n",
      "app/core/a.js": "/* APP_A */ var a = 1;\n",
      "app/assets/icons/icon-192.png": makePng(192),
      "app/assets/icons/icon-512.png": makePng(512),
      "app/assets/icons/icon-maskable-512.png": makePng(512, { shade: 0x50 }),
      "app/assets/icons/apple-touch-icon-180.png": makePng(180),
      "data/sources.js": 'window.PROJECT_LICENSE = { "copyrightHolder": "JimmyLin", "copyrightYear": 2026 };',
      "data/part5.js": 'window.PART5_QUESTION_BANK = [{ "id": "p5-001" }];',
      "ads.txt": ADS,
      "package.json": pkgJson("1.0.0"),
    },
    over
  );
}

/** 建立 PWA fixture（site 預設 = out 所在目錄下的 site；ads 指向 fixture 的 ads.txt） */
function pwaFixture(over) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "emt-pwa-"));
  for (const [rel, content] of Object.entries(pwaFiles(over))) {
    if (content === null) continue;
    const abs = path.join(dir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content);
  }
  fs.mkdirSync(path.join(dir, "data"), { recursive: true });
  const out = path.join(dir, "out", "t.html");
  return {
    dir,
    out,
    siteDir: path.join(dir, "out", "site"),
    opts: {
      app: path.join(dir, "app"),
      data: path.join(dir, "data"),
      out,
      ads: path.join(dir, "ads.txt"),
      packageFile: path.join(dir, "package.json"),
      log: () => {},
      warn: () => {},
    },
    cleanup: () => fs.rmSync(dir, { recursive: true, force: true }),
  };
}

/** 以 PWA fixture 建置（extra 覆寫 opts）；回傳結果與 fixture（呼叫端負責 cleanup） */
async function pwaBuild(over, extra) {
  const { build } = await loadBuild();
  const fx = pwaFixture(over);
  const res = build(Object.assign({}, fx.opts, extra));
  return { res, fx };
}

/** 斷言 PWA 建置中止、錯誤代碼相符、out 與部署目錄都未寫 */
async function expectPwaAbort(over, code, extra) {
  const { build } = await loadBuild();
  const fx = pwaFixture(over);
  try {
    assert.throws(() => build(Object.assign({}, fx.opts, extra)), (err) => {
      assert.equal(err.name, "BuildError");
      assert.equal(err.code, code, err.message);
      return true;
    });
    assert.equal(fs.existsSync(fx.out), false, "中止時不得寫出產物");
    assert.equal(fs.existsSync(fx.siteDir), false, "中止時不得建立部署目錄");
  } finally {
    fx.cleanup();
  }
}

/** 遞迴列出檔案（相對路徑，/ 分隔） */
function listFiles(dir, rel = "") {
  const out = [];
  for (const d of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
    const r = rel ? `${rel}/${d.name}` : d.name;
    if (d.isDirectory()) out.push(...listFiles(dir, r));
    else out.push(r);
  }
  return out.sort();
}

test("PWA (1) V-PWA-01：部署目錄恰 8 檔、大小寫相同；index.html = out；ads.txt、PNG 與來源位元組相同；build() 回傳 buildId、site", async () => {
  const { res, fx } = await pwaBuild();
  try {
    const files = listFiles(fx.siteDir);
    assert.deepEqual(files, PWA.PWA_DEPLOY_FILES.map((f) => f.path).sort());
    assert.equal(files.length, 8);
    const outBytes = fs.readFileSync(fx.out);
    assert.ok(fs.readFileSync(path.join(fx.siteDir, "index.html")).equals(outBytes));
    assert.ok(fs.readFileSync(path.join(fx.siteDir, "ads.txt")).equals(fs.readFileSync(fx.opts.ads)));
    for (const f of PWA.PWA_DEPLOY_FILES.filter((x) => x.sizePx)) {
      const src = path.join(fx.opts.app, "assets", "icons", f.path.replace("icons/", ""));
      assert.ok(fs.readFileSync(path.join(fx.siteDir, f.path)).equals(fs.readFileSync(src)), f.path);
    }
    assert.match(res.buildId, new RegExp(PWA.PWA_BUILD_ID_PATTERN));
    assert.equal(res.site.dir, fx.siteDir);
    assert.deepEqual(res.site.files.map((f) => f.path), PWA.PWA_DEPLOY_FILES.map((f) => f.path));
    assert.equal(res.html, outBytes.toString("utf8"));
    // 文字檔 UTF-8 無 BOM（DP-7）
    for (const n of ["index.html", "manifest.webmanifest", "sw.js"]) {
      const b = fs.readFileSync(path.join(fx.siteDir, n));
      assert.ok(!(b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf), n);
    }
  } finally {
    fx.cleanup();
  }
});

test("PWA (1b) 部署目錄已存在且只含部署檔（上一次建置）→ 重建成功；--no-site 的 HTML 與完整建置位元組相同", async () => {
  const { build } = await loadBuild();
  const fx = pwaFixture();
  try {
    const a = build(fx.opts);
    fs.writeFileSync(path.join(fx.siteDir, "sw.js"), "舊內容");
    const b = build(fx.opts);
    assert.equal(b.buildId, a.buildId);
    assert.ok(fs.readFileSync(path.join(fx.siteDir, "sw.js")).equals(a.site.files.find((f) => f.path === "sw.js").bytes));
    const out2 = path.join(fx.dir, "only", "t.html");
    const c = build(Object.assign({}, fx.opts, { out: out2, site: false }));
    assert.equal(c.site, null);
    assert.equal(c.buildId, a.buildId);
    assert.ok(fs.readFileSync(out2).equals(fs.readFileSync(fx.out)));
    assert.equal(fs.existsSync(path.join(fx.dir, "only", "site")), false);
  } finally {
    fx.cleanup();
  }
});

test("PWA (2) V-PWA-02：manifest 與 PWA_MANIFEST 深度相等、鍵恰 10 個、UTF-8 無 BOM、格式固定", async () => {
  const { fx } = await pwaBuild();
  try {
    const text = fs.readFileSync(path.join(fx.siteDir, "manifest.webmanifest"), "utf8");
    assert.equal(text, JSON.stringify(PWA.PWA_MANIFEST, null, 2) + "\n");
    const m = JSON.parse(text);
    assert.deepStrictEqual(m, JSON.parse(JSON.stringify(PWA.PWA_MANIFEST)));
    assert.equal(Object.keys(m).length, 10);
    assert.ok(!text.includes("@@"));
  } finally {
    fx.cleanup();
  }
});

test("PWA (3) V-PWA-03：PNG 色彩類型 6、含 tRNS、尺寸不符、非正方形、非 PNG、缺檔 → PWA_ICON", async () => {
  const cases = [
    { "app/assets/icons/icon-192.png": makePng(192, { colorType: 6 }) },
    { "app/assets/icons/icon-512.png": makePng(512, { trns: true }) },
    { "app/assets/icons/icon-maskable-512.png": makePng(256) },
    { "app/assets/icons/apple-touch-icon-180.png": makePng(180, { height: 179 }) },
    { "app/assets/icons/icon-192.png": Buffer.from("not a png at all, just text bytes......") },
    { "app/assets/icons/apple-touch-icon-180.png": null },
  ];
  for (const c of cases) await expectPwaAbort(c, "PWA_ICON");
  const { checkPng } = await loadBuild();
  assert.deepEqual(checkPng(makePng(192), 192), []);
  assert.ok(checkPng(makePng(192, { colorType: 6 }), 192).some((p) => p.includes("色彩類型 6")));
  assert.ok(checkPng(makePng(192, { trns: true }), 192).some((p) => p.includes("tRNS")));
});

test("PWA (4) V-PWA-04、HD-3：HD-1 缺任一 → PWA_HEAD；靜態 manifest／apple-touch-icon 連結、第二個 data:, 連結 → 中止", async () => {
  for (const e of HD1) {
    const code = e.includes("@@BUILD_ID@@") ? "PWA_TEMPLATE" : e.includes("@@APP_VERSION@@") ? "APP_VERSION_TEMPLATE" : "PWA_HEAD";
    await expectPwaAbort({ "app/index.html": PWA_TEMPLATE_HTML.replace(e + "\n", "") }, code);
  }
  // HD-1 元素不在 </head> 之前
  await expectPwaAbort(
    { "app/index.html": PWA_TEMPLATE_HTML.replace(HD1[2] + "\n", "").replace("<body>", "<body>\n" + HD1[2]) },
    "PWA_HEAD"
  );
  // <title> 換成其他字串（v0.12：必須為 <title>${PWA_APP_NAME}</title>，§5.3）
  await expectPwaAbort({ "app/index.html": PWA_TEMPLATE_HTML.replace("<title>EnglishContext</title>", "<title>Other</title>") }, "PWA_HEAD");
  // 舊標題（v0.11）→ 中止
  await expectPwaAbort({ "app/index.html": PWA_TEMPLATE_HTML.replace("<title>EnglishContext</title>", "<title>English Master Track</title>") }, "PWA_HEAD");
  // 標題出現 2 次 → 中止
  await expectPwaAbort({ "app/index.html": PWA_TEMPLATE_HTML.replace("<title>EnglishContext</title>", "<title>EnglishContext</title><title>EnglishContext</title>") }, "PWA_HEAD");
  // 靜態 manifest、apple-touch-icon（無論 href 在前或在後、或無 href）
  for (const tag of [
    '<link rel="manifest" href="manifest.webmanifest">',
    '<link rel="apple-touch-icon" sizes="180x180" href="icons/apple-touch-icon-180.png">',
    '<link href="manifest.webmanifest" rel="manifest">',
    "<link rel=manifest>",
    '<link rel="preload" as="image">',
  ]) {
    await expectPwaAbort({ "app/index.html": PWA_TEMPLATE_HTML.replace("</head>", tag + "\n</head>") }, "EXTERNAL_RESOURCE");
  }
  // 第二個 data:, 連結
  await expectPwaAbort({ "app/index.html": PWA_TEMPLATE_HTML.replace("</head>", ICON_LINK + "\n</head>") }, "PWA_HEAD");
  // 程式碼中出現白名單字串（第二次）也中止
  await expectPwaAbort({ "app/core/z.js": "var s = '" + ICON_LINK + "';\n" }, "PWA_HEAD");
  // 指向檔案的 icon 連結：既有 <link href> 規則照常中止
  await expectPwaAbort({ "app/index.html": PWA_TEMPLATE_HTML.replace("</head>", '<link rel="icon" href="icons/icon-192.png">\n</head>') }, "EXTERNAL_RESOURCE");
});

test("PWA (4b) B-7 白名單：只有 1 個逐字字串；FORBIDDEN_PATTERNS 既有 10 條未刪改", async () => {
  const { ALLOWED_STATIC_TAGS, FORBIDDEN_PATTERNS } = await loadBuild();
  assert.deepEqual([...ALLOWED_STATIC_TAGS], ['<link rel="icon" href="data:,">']);
  const expected = [
    ["<script src>", "/<script[^>]*\\ssrc=/i"],
    ["<link href>", "/<link[^>]*\\shref=/i"],
    ["@import", "/@import/i"],
    ["url(http…)", "/url\\(\\s*['\"]?https?:/i"],
    ["<img", "/<img/i"],
    ["<iframe", "/<iframe/i"],
    ["cdn.", "/cdn\\./i"],
    ["fonts.googleapis", "/fonts\\.googleapis/i"],
    ["cdn.tailwindcss.com", "/cdn\\.tailwindcss\\.com/i"],
    ["MediaRecorder", "/MediaRecorder/"],
  ];
  assert.deepEqual(FORBIDDEN_PATTERNS.slice(0, 10).map((p) => [p.name, String(p.re)]), expected);
  assert.equal(FORBIDDEN_PATTERNS.length, 11);
  assert.equal(FORBIDDEN_PATTERNS[10].name, "<link rel=PWA 附屬檔>");
});

test("PWA (5) V-PWA-05：sw.js 的 BUILD_ID = HTML meta、CACHE_NAME 前綴、預先快取 7 項；範本違規 → PWA_SW／PWA_SW_TEMPLATE", async () => {
  const { res, fx } = await pwaBuild();
  try {
    const sw = fs.readFileSync(path.join(fx.siteDir, "sw.js"), "utf8");
    const html = fs.readFileSync(fx.out, "utf8");
    const meta = /<meta name="emt-build-id" content="([0-9a-f]{16})">/.exec(html)[1];
    assert.equal(meta, res.buildId);
    assert.ok(sw.includes(`var BUILD_ID = "${res.buildId}";`));
    assert.ok(sw.includes('var CACHE_PREFIX = "english-master-track-pwa-";'));
    assert.ok(sw.includes("var CACHE_NAME = CACHE_PREFIX + BUILD_ID;"));
    const list = /var PRECACHE_URLS = \[([^\]]*)\];/.exec(sw)[1];
    assert.deepEqual(JSON.parse("[" + list + "]"), [...PWA.PWA_PRECACHE_URLS]);
    assert.ok(!sw.includes("@@"));
    assert.ok(!html.includes("@@BUILD_ID@@"));
  } finally {
    fx.cleanup();
  }
  const bad = (s) => ({ "app/pwa/sw.template.js": s });
  await expectPwaAbort(bad(SW_TEMPLATE_REAL + "\nimportScripts('x.js');\n"), "PWA_SW");
  await expectPwaAbort(bad(SW_TEMPLATE_REAL + '\nself.addEventListener("push", function () {});\n'), "PWA_SW");
  await expectPwaAbort(bad(SW_TEMPLATE_REAL + '\nself.addEventListener("fetch", function () {});\n'), "PWA_SW");
  await expectPwaAbort(bad(SW_TEMPLATE_REAL + "\nself.onmessage = null;\n"), "PWA_SW");
  await expectPwaAbort(bad(SW_TEMPLATE_REAL + "\n// see https://example.com\n"), "PWA_SW");
  await expectPwaAbort(bad(SW_TEMPLATE_REAL.replace('var CACHE_PREFIX = "english-master-track-pwa-";', 'var CACHE_PREFIX = "x-";')), "PWA_SW");
  await expectPwaAbort(bad(SW_TEMPLATE_REAL + "\n// @@BUILD_ID@@\n"), "PWA_SW_TEMPLATE");
  await expectPwaAbort(bad(SW_TEMPLATE_REAL.replace("/* @@PRECACHE_URLS@@ */", "")), "PWA_SW_TEMPLATE");
  await expectPwaAbort({ "app/pwa/sw.template.js": null }, "PWA_SW_TEMPLATE");
});

test("PWA (6) V-PWA-06、AC-36-01：write: false 連續 2 次三檔相同；改資料、app、PNG、sw 範本 1 字 → BUILD_ID 不同；只改 ads.txt → 不變", async () => {
  const { build } = await loadBuild();
  const three = (r) => ({
    html: r.html,
    manifest: r.site.files.find((f) => f.path === "manifest.webmanifest").bytes.toString("utf8"),
    sw: r.site.files.find((f) => f.path === "sw.js").bytes.toString("utf8"),
  });
  const once = (over) => {
    const fx = pwaFixture(over);
    try {
      const r = build(Object.assign({}, fx.opts, { write: false }));
      assert.equal(fs.existsSync(fx.out), false, "write: false 不寫檔");
      assert.equal(fs.existsSync(fx.siteDir), false, "write: false 不建部署目錄");
      return r;
    } finally {
      fx.cleanup();
    }
  };
  const a = once();
  const b = once();
  assert.deepEqual(three(a), three(b));
  assert.equal(a.buildId, b.buildId);

  const variants = {
    data: { "data/part5.js": 'window.PART5_QUESTION_BANK = [{ "id": "p5-002" }];' },
    app: { "app/core/a.js": "/* APP_A */ var a = 2;\n" },
    css: { "app/styles/00-base.css": pwaFiles()["app/styles/00-base.css"] + ".x{}\n" },
    png: { "app/assets/icons/icon-512.png": makePng(512, { shade: 0x41 }) },
    sw: { "app/pwa/sw.template.js": SW_TEMPLATE_REAL.replace("清除舊的本專案快取", "清除舊的本專案快取。") },
    license: { "app/license-header.txt": LICENSE + "x\n" },
  };
  const ids = new Set([a.buildId]);
  for (const [name, over] of Object.entries(variants)) {
    const r = once(over);
    assert.notEqual(r.buildId, a.buildId, name);
    assert.notEqual(three(r).sw, three(a).sw, name + "：sw.js 不同");
    ids.add(r.buildId);
  }
  assert.equal(ids.size, Object.keys(variants).length + 1, "各變更的 BUILD_ID 互不相同");
  const adsOnly = once({ "ads.txt": "google.com, pub-1111111111111111, DIRECT, f08c47fec0942fa0\n" });
  assert.equal(adsOnly.buildId, a.buildId);
  assert.deepEqual(three(adsOnly), three(a));
});

test("PWA (7) DS-13：00-base.css 的 --bg 不符或缺漏 → PWA_BG_COLOR；大小寫不同視為相同", async () => {
  await expectPwaAbort({ "app/styles/00-base.css": ":root { --bg: #ffffff; }\n" }, "PWA_BG_COLOR");
  await expectPwaAbort({ "app/styles/00-base.css": ":root { --primary: #0866ad; }\n" }, "PWA_BG_COLOR");
  // v0.11 舊值 → 中止（VC-5）
  await expectPwaAbort({ "app/styles/00-base.css": ":root { --bg: #f6f7f9; }\n" }, "PWA_BG_COLOR");
  await expectPwaAbort({ "app/styles/00-base.css": null }, "PWA_BG_COLOR");
  const { fx } = await pwaBuild({ "app/styles/00-base.css": ":root { --bg: #EEF4FA; }\n" });
  fx.cleanup();
});

test("PWA (8) 部署目錄已有多餘檔案或目錄 → SITE_DIR_UNEXPECTED，未刪除任何檔案、out 未寫", async () => {
  const { build } = await loadBuild();
  for (const extra of ["notes.md", "icons/extra.png", "sub/x.txt", "ICONS/icon-192.png"]) {
    const fx = pwaFixture();
    try {
      const abs = path.join(fx.siteDir, ...extra.split("/"));
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, "keep");
      fs.writeFileSync(path.join(fx.siteDir, "index.html"), "old");
      assert.throws(() => build(fx.opts), (e) => e.code === "SITE_DIR_UNEXPECTED");
      assert.equal(fs.readFileSync(abs, "utf8"), "keep", extra);
      assert.equal(fs.readFileSync(path.join(fx.siteDir, "index.html"), "utf8"), "old");
      assert.equal(fs.existsSync(fx.out), false);
    } finally {
      fx.cleanup();
    }
  }
  // --site 指到一般檔案
  const fx = pwaFixture();
  try {
    const f = path.join(fx.dir, "afile");
    fs.writeFileSync(f, "x");
    assert.throws(() => build(Object.assign({}, fx.opts, { site: f })), (e) => e.code === "SITE_DIR_UNEXPECTED");
    assert.equal(fs.readFileSync(f, "utf8"), "x");
  } finally {
    fx.cleanup();
  }
});

test("PWA (9) 中止時 out 與部署目錄都未寫：ADS_MISSING、LICENSE_YEAR、PWA_TEMPLATE", async () => {
  await expectPwaAbort({ "ads.txt": null }, "ADS_MISSING");
  // --no-site 時不需要 ads.txt
  const { fx } = await pwaBuild({ "ads.txt": null }, { site: false });
  assert.ok(fs.existsSync(fx.out));
  fx.cleanup();
  // PWA 模式缺 copyrightYear：升級為中止
  await expectPwaAbort({ "data/sources.js": 'window.PROJECT_LICENSE = { "copyrightHolder": "JimmyLin" };' }, "LICENSE_YEAR");
  await expectPwaAbort({ "data/sources.js": null }, "LICENSE_YEAR");
  // 佔位 2 次、位置不符
  await expectPwaAbort({ "app/index.html": PWA_TEMPLATE_HTML.replace("<body>", "<body>\n<!-- @@BUILD_ID@@ -->") }, "PWA_TEMPLATE");
  await expectPwaAbort(
    { "app/index.html": PWA_TEMPLATE_HTML.replace('<meta name="emt-build-id" content="@@BUILD_ID@@">', '<meta name="x" content="@@BUILD_ID@@">') },
    "PWA_TEMPLATE"
  );
  // 程式含佔位字串
  await expectPwaAbort({ "app/core/z.js": "var p = '@@BUILD_ID@@';\n" }, "PWA_TEMPLATE");
  // 舊模板（無佔位）卻要求部署目錄
  await expectPwaAbort({ "app/index.html": TEMPLATE }, "PWA_TEMPLATE");
});

test("PWA (10) parseArgs：--site、--no-site、--ads 與衝突", async () => {
  const { parseArgs } = await loadBuild();
  assert.deepEqual(parseArgs(["--out", "a.html", "--site", "s", "--ads", "x.txt"]), { out: "a.html", site: "s", ads: "x.txt" });
  assert.deepEqual(parseArgs(["--site=s2", "--ads=y.txt"]), { site: "s2", ads: "y.txt" });
  assert.deepEqual(parseArgs(["--no-site", "--out", "b.html"]), { out: "b.html", site: false });
  // （v0.9）--package <file> → packageFile
  assert.deepEqual(parseArgs(["--package", "p.json"]), { packageFile: "p.json" });
  assert.deepEqual(parseArgs(["--package=q.json", "--out", "c.html"]), { packageFile: "q.json", out: "c.html" });
  assert.throws(() => parseArgs(["--package"]), (e) => e.code === "BAD_ARGS");
  assert.deepEqual(parseArgs([]), {});
  assert.throws(() => parseArgs(["--site", "s", "--no-site"]), (e) => e.code === "BAD_ARGS");
  assert.throws(() => parseArgs(["--no-site", "--site=s"]), (e) => e.code === "BAD_ARGS");
  assert.throws(() => parseArgs(["--site"]), (e) => e.code === "BAD_ARGS");
  assert.throws(() => parseArgs(["--ads"]), (e) => e.code === "BAD_ARGS");
  assert.throws(() => parseArgs(["--no-site=1"]), (e) => e.code === "BAD_ARGS");
});

test("PWA (10b) CLI：預設部署目錄 = --out 所在目錄下的 site；報告含 BUILD_ID 與 8 檔 bytes", () => {
  const fx = pwaFixture();
  try {
    const r = spawnSync(
      process.execPath,
      [BUILD, "--out", fx.out, "--data", fx.opts.data, "--app", fx.opts.app, "--ads", fx.opts.ads, "--package", fx.opts.packageFile],
      { encoding: "utf8" }
    );
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /BUILD_ID：[0-9a-f]{16}/);
    assert.match(r.stdout, /版本號：1\.0\.0/);
    for (const f of PWA.PWA_DEPLOY_FILES) assert.ok(r.stdout.includes(`${f.path}：`), f.path);
    assert.equal(listFiles(fx.siteDir).length, 8);
  } finally {
    fx.cleanup();
  }
});

test("PWA (11) 原始碼掃描：build.mjs 無 Math.random、Date.now、process.env、npm_package_version、performance.now；new Date( 只在 buildLicenseHeader 預設參數", () => {
  const src = fs.readFileSync(BUILD, "utf8");
  for (const w of ["Math.random", "Date.now", "process.env", "npm_package_version", "performance.now"]) assert.ok(!src.includes(w), w);
  const dates = src.split("\n").filter((l) => l.includes("new Date("));
  assert.equal(dates.length, 1);
  assert.match(dates[0], /export function buildLicenseHeader\(text, license, warn, now = new Date\(\)\)/);
  // 只用 Node 內建模組
  const imports = [...src.matchAll(/^import .* from "([^"]+)";/gm)].map((m) => m[1]);
  const allowed = ["node:fs", "node:path", "node:vm", "node:url", "node:crypto", "node:module"];
  for (const m of imports) assert.ok(allowed.includes(m), m);
});

// ─── (12) tools/serve.mjs ───

const SERVE = path.join(ROOT, "tools", "serve.mjs");

function request(port, method, urlPath) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: "127.0.0.1", port, method, path: urlPath }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on("error", reject);
    req.end();
  });
}

test("PWA (12) serve.mjs：MIME、Cache-Control、base 外 404、路徑穿越 404、POST 405、301、每次請求讀檔", async () => {
  const serve = await import(pathToFileURL(SERVE).href);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "emt-serve-"));
  const site = path.join(dir, "site");
  fs.mkdirSync(path.join(site, "icons"), { recursive: true });
  fs.writeFileSync(path.join(site, "index.html"), "<p>v1</p>");
  fs.writeFileSync(path.join(site, "manifest.webmanifest"), "{}");
  fs.writeFileSync(path.join(site, "sw.js"), "/* sw */");
  fs.writeFileSync(path.join(site, "ads.txt"), "ads");
  fs.writeFileSync(path.join(site, "icons", "icon-192.png"), makePng(4));
  fs.writeFileSync(path.join(dir, "secret.txt"), "secret");
  const s = await serve.startServer({ dir: site, port: 0, base: "/english-master-track/" });
  try {
    const B = "/english-master-track/";
    const mime = {
      "": "text/html; charset=utf-8",
      "index.html": "text/html; charset=utf-8",
      "manifest.webmanifest": "application/manifest+json",
      "sw.js": "text/javascript; charset=utf-8",
      "icons/icon-192.png": "image/png",
      "ads.txt": "text/plain; charset=utf-8",
    };
    for (const [rel, type] of Object.entries(mime)) {
      const r = await request(s.port, "GET", B + rel);
      assert.equal(r.status, 200, rel);
      assert.equal(r.headers["content-type"], type, rel);
      assert.equal(r.headers["cache-control"], "max-age=600", rel);
    }
    // 查詢字串不影響檔案對應
    assert.equal((await request(s.port, "GET", B + "index.html?x=1")).status, 200);
    // HEAD 無本文
    const head = await request(s.port, "HEAD", B + "sw.js");
    assert.equal(head.status, 200);
    assert.equal(head.body.length, 0);
    // base 外 404
    for (const p of ["/favicon.ico", "/", "/index.html", "/english-master-trackx/index.html"]) {
      assert.equal((await request(s.port, "GET", p)).status, 404, p);
    }
    // 路徑穿越 404
    for (const p of [B + "../secret.txt", B + "%2e%2e/secret.txt", B + "..%2fsecret.txt", B + "..%5csecret.txt", B + "icons/..%2f..%2fsecret.txt"]) {
      const r = await request(s.port, "GET", p);
      assert.equal(r.status, 404, p);
      assert.ok(!r.body.toString().includes("secret"), p);
    }
    // 不存在 404；目錄 404
    assert.equal((await request(s.port, "GET", B + "nope.png")).status, 404);
    assert.equal((await request(s.port, "GET", B + "icons/")).status, 404);
    // 非 GET/HEAD 405
    for (const m of ["POST", "PUT", "DELETE"]) {
      const r = await request(s.port, m, B + "index.html");
      assert.equal(r.status, 405, m);
      assert.equal(r.headers.allow, "GET, HEAD");
    }
    // base 去尾斜線 → 301
    const r301 = await request(s.port, "GET", "/english-master-track");
    assert.equal(r301.status, 301);
    assert.equal(r301.headers.location, B);
    // 每次請求讀檔：換掉內容即生效
    fs.writeFileSync(path.join(site, "index.html"), "<p>v2</p>");
    assert.equal((await request(s.port, "GET", B)).body.toString(), "<p>v2</p>");
    // 只綁 127.0.0.1
    assert.equal(s.server.address().address, "127.0.0.1");
  } finally {
    await s.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("PWA (12b) serve.mjs：參數解析與 base 格式", async () => {
  const serve = await import(pathToFileURL(SERVE).href);
  assert.deepEqual(serve.parseServeArgs(["--dir", "d", "--port", "0", "--base", "/x/"]), { dir: "d", port: 0, base: "/x/" });
  assert.deepEqual(serve.parseServeArgs([]), {});
  assert.throws(() => serve.parseServeArgs(["--port", "abc"]));
  assert.throws(() => serve.parseServeArgs(["--base", "x/"]));
  assert.throws(() => serve.parseServeArgs(["--base", "/x"]));
  assert.throws(() => serve.parseServeArgs(["--nope"]));
  assert.equal(serve.SERVE_DEFAULTS.port, 8080);
  assert.equal(serve.SERVE_DEFAULTS.base, "/english-master-track/");
  assert.equal(serve.SERVE_DEFAULTS.host, "127.0.0.1");
});

// ═══════════════════════════════════════════════════════════════
// （v0.9，FE-63）網站版本號注入 B-17～B-19
// 依據：architecture.md v0.9 §5.4、§10.6「build.test.js」；契約 README §12.1 VR-1～VR-4、VR-9、§12.4 V-VER-01、V-VER-02、V-VER-06
// 一律以暫存 package.json（packageFile）建置，不讀寫專案根目錄 package.json。
// ═══════════════════════════════════════════════════════════════

const VERSION = require("../core/version.js");
const PROJECT_PKG = path.join(ROOT, "package.json");
const PROJECT_PKG_BEFORE = fs.readFileSync(PROJECT_PKG);
const VERSION_META_RE = /<meta name="emt-app-version" content="([^"]*)">/g;
const VERSION_META_TPL = '<meta name="emt-app-version" content="@@APP_VERSION@@">';

test("V-VER-01：產物 emt-app-version 恰 1 個且 = fixture version；無 @@ 佔位殘留；build() 回傳 appVersion；報告列出版本號", async () => {
  const lines = [];
  const { res, fx } = await pwaBuild({ "package.json": pkgJson("2.13.40") }, { log: (s) => lines.push(s) });
  try {
    const html = fs.readFileSync(fx.out, "utf8");
    const metas = [...html.matchAll(VERSION_META_RE)];
    assert.equal(metas.length, 1);
    assert.equal(metas[0][1], "2.13.40");
    assert.equal(res.appVersion, "2.13.40");
    assert.doesNotMatch(html, /@@[A-Za-z0-9_]+@@/);
    assert.ok(!html.includes("@@"));
    // 緊接 emt-build-id 之後（模板順序保留）
    assert.ok(html.includes(`<meta name="emt-build-id" content="${res.buildId}">\n<meta name="emt-app-version" content="2.13.40">`));
    assert.match(lines.join("\n"), /版本號：2\.13\.40/);
    // 部署目錄 index.html 同一份（VR-9）
    assert.ok(fs.readFileSync(path.join(fx.siteDir, "index.html")).equals(fs.readFileSync(fx.out)));
  } finally {
    fx.cleanup();
  }
});

test("B-17 APP_VERSION_TEMPLATE：PWA 模式缺佔位、佔位 2 次、佔位在 meta 外、meta 在 </head> 後、程式或資料含佔位 → 中止且不寫檔", async () => {
  const cases = [
    PWA_TEMPLATE_HTML.replace(VERSION_META_TPL + "\n", ""),
    PWA_TEMPLATE_HTML.replace("<body>", "<body>\n<!-- @@APP_VERSION@@ -->"),
    PWA_TEMPLATE_HTML.replace(VERSION_META_TPL, '<meta name="x-version" content="@@APP_VERSION@@">'),
    PWA_TEMPLATE_HTML.replace(VERSION_META_TPL + "\n", "").replace("<body>", "<body>\n" + VERSION_META_TPL),
  ];
  for (const tpl of cases) await expectPwaAbort({ "app/index.html": tpl }, "APP_VERSION_TEMPLATE");
  await expectPwaAbort({ "app/core/z.js": "var p = '@@APP_VERSION@@';\n" }, "APP_VERSION_TEMPLATE");
  await expectPwaAbort({ "data/part5.js": 'window.PART5_QUESTION_BANK = [{ "id": "@@APP_VERSION@@" }];' }, "APP_VERSION_TEMPLATE");
});

test("B-18 APP_VERSION：package 不存在、非 JSON、缺 version、v1.0.0、1.0、1.0.0-beta、1.0.0+1、01.0.0、數字 → 中止且不寫檔（訊息含實際值）", async () => {
  await expectPwaAbort({ "package.json": null }, "APP_VERSION");
  await expectPwaAbort({ "package.json": "{ not json" }, "APP_VERSION");
  await expectPwaAbort({ "package.json": JSON.stringify({ name: "x" }) }, "APP_VERSION");
  await expectPwaAbort({ "package.json": "[]" }, "APP_VERSION");
  for (const v of ["v1.0.0", "1.0", "1.0.0-beta", "1.0.0+1", "01.0.0", " 1.0.0", ""]) {
    await expectPwaAbort({ "package.json": pkgJson(v) }, "APP_VERSION");
  }
  await expectPwaAbort({ "package.json": JSON.stringify({ version: 1 }) }, "APP_VERSION");
  const { readAppVersion } = await loadBuild();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "emt-ver-"));
  try {
    const p = path.join(dir, "package.json");
    fs.writeFileSync(p, pkgJson("v1.0.0"));
    assert.throws(() => readAppVersion(p, VERSION), (e) => e.code === "APP_VERSION" && e.message.includes('"v1.0.0"'));
    // 去 BOM、其他欄位不影響
    fs.writeFileSync(p, "﻿" + pkgJson("0.10.3", { scripts: { build: "x" }, devDependencies: { a: "1" } }));
    assert.equal(readAppVersion(p, VERSION), "0.10.3");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("V-VER-02 (a)(b)(c)：同輸入兩次三檔相同；只改 version → meta 為 1.0.1、BUILD_ID 與 sw.js 不同；只改 1 個進入 HTML 的字元 → meta 不變、BUILD_ID 不同", async () => {
  const { build } = await loadBuild();
  const three = (r) => ({
    html: r.html,
    manifest: r.site.files.find((f) => f.path === "manifest.webmanifest").bytes.toString("utf8"),
    sw: r.site.files.find((f) => f.path === "sw.js").bytes.toString("utf8"),
  });
  const once = (over) => {
    const fx = pwaFixture(over);
    try {
      const r = build(Object.assign({}, fx.opts, { write: false }));
      assert.equal(fs.existsSync(fx.out), false);
      return r;
    } finally {
      fx.cleanup();
    }
  };
  const meta = (r) => [...r.html.matchAll(VERSION_META_RE)].map((m) => m[1]);
  const a = once();
  const b = once();
  assert.deepEqual(three(a), three(b));
  assert.equal(a.buildId, b.buildId);
  assert.deepEqual(meta(a), ["1.0.0"]);

  const v101 = once({ "package.json": pkgJson("1.0.1") });
  assert.deepEqual(meta(v101), ["1.0.1"]);
  assert.notEqual(v101.buildId, a.buildId);
  assert.notEqual(three(v101).sw, three(a).sw);
  assert.equal(three(v101).manifest, three(a).manifest);

  // 只改 package.json 的其他欄位 → 完全相同（只讀 version）
  const other = once({ "package.json": pkgJson("1.0.0", { description: "changed", scripts: { x: "y" } }) });
  assert.deepEqual(three(other), three(a));

  const oneChar = once({ "app/core/a.js": "/* APP_B */ var a = 1;\n" });
  assert.deepEqual(meta(oneChar), ["1.0.0"]);
  assert.notEqual(oneChar.buildId, a.buildId);
});

test("VR-4：以 computeBuildId 對 HTML₀′（含版本號、emt-build-id 為佔位）重算 = 回傳 buildId；以仍含版本佔位的 HTML₀ 計算則不同", async () => {
  const { computeBuildId } = await loadBuild();
  const { res, fx } = await pwaBuild();
  try {
    const files = pwaFiles();
    const html0v = res.html.replace(`content="${res.buildId}"`, 'content="@@BUILD_ID@@"');
    assert.equal(html0v.split("@@BUILD_ID@@").length - 1, 1);
    const records = (indexHtml) => [
      { path: "index.html", bytes: Buffer.from(indexHtml, "utf8") },
      { path: "manifest.webmanifest", bytes: res.site.files.find((f) => f.path === "manifest.webmanifest").bytes },
      ...PWA.PWA_DEPLOY_FILES.filter((f) => f.sizePx).map((f) => ({
        path: f.path,
        bytes: files["app/assets/icons/" + f.path.replace("icons/", "")],
      })),
      { path: "sw.js", bytes: Buffer.from(SW_TEMPLATE_REAL, "utf8") },
    ];
    assert.equal(computeBuildId(records(html0v)), res.buildId);
    const html0 = html0v.replace('<meta name="emt-app-version" content="1.0.0">', VERSION_META_TPL);
    assert.notEqual(html0, html0v);
    assert.notEqual(computeBuildId(records(html0)), res.buildId);
  } finally {
    fx.cleanup();
  }
});

test("V-VER-06：建置碼 = buildId 前 7 碼 = sw.js BUILD_ID 前 7 碼；versionLineText 以產物兩個 meta 組字", async () => {
  const { res, fx } = await pwaBuild();
  try {
    const sw = fs.readFileSync(path.join(fx.siteDir, "sw.js"), "utf8");
    const swId = /var BUILD_ID = "([0-9a-f]{16})";/.exec(sw)[1];
    assert.equal(swId.slice(0, 7), res.buildId.slice(0, 7));
    assert.equal(VERSION.buildCode(res.buildId), swId.slice(0, 7));
    const html = fs.readFileSync(fx.out, "utf8");
    const ver = /<meta name="emt-app-version" content="([^"]*)">/.exec(html)[1];
    const bid = /<meta name="emt-build-id" content="([^"]*)">/.exec(html)[1];
    assert.equal(VERSION.versionLineText(ver, bid), `版本 1.0.0（建置 ${res.buildId.slice(0, 7)}）`);
  } finally {
    fx.cleanup();
  }
});

test("非 PWA 舊 fixture：無版本佔位 → 略過版本步驟、appVersion 為 null、產物無版本 meta；非 PWA 但有佔位 → 照樣寫入", async () => {
  const res = await runBuild({});
  assert.equal(res.appVersion, null);
  assert.ok(!res.written.includes("emt-app-version"));
  const { build } = await loadBuild();
  const fx = fixture({
    "app/index.html": TEMPLATE.replace("<title>T</title>", "<title>T</title>\n" + VERSION_META_TPL),
    "package.json": pkgJson("3.2.1"),
  });
  try {
    const r = build(Object.assign({}, fx.opts, { packageFile: path.join(fx.dir, "package.json"), write: false }));
    assert.equal(r.appVersion, "3.2.1");
    assert.deepEqual([...r.html.matchAll(VERSION_META_RE)].map((m) => m[1]), ["3.2.1"]);
    assert.ok(!r.html.includes("@@"));
  } finally {
    fx.cleanup();
  }
});

test("B-19 checkAppVersionOutput：meta 0／2 個、值不符、殘留佔位 → 中止；略過模式下出現 meta → 中止", async () => {
  const { checkAppVersionOutput } = await loadBuild();
  const N = VERSION.APP_VERSION_META_NAME;
  const P = VERSION.APP_VERSION_PATTERN;
  const ok = '<head><meta name="emt-app-version" content="1.0.0"></head>';
  const code = (html, v) => {
    try {
      checkAppVersionOutput(html, v, N, P);
      return null;
    } catch (e) {
      return e.code;
    }
  };
  assert.equal(code(ok, "1.0.0"), null);
  assert.equal(code("<head></head>", "1.0.0"), "APP_VERSION");
  assert.equal(code(ok + ok, "1.0.0"), "APP_VERSION");
  assert.equal(code(ok, "1.0.1"), "APP_VERSION");
  assert.equal(code(ok + "<!-- @@NEW_THING@@ -->", "1.0.0"), "PWA_HEAD");
  assert.equal(code(ok, null), "APP_VERSION");
  assert.equal(code("<head></head>", null), null);
});

test("build.mjs 常數：APP_VERSION_PLACEHOLDER、APP_VERSION_CORE_FILE 固定專案檔、DEFAULTS.package；專案 package.json 未被測試修改", async () => {
  const B = await loadBuild();
  assert.equal(B.APP_VERSION_PLACEHOLDER, "@@APP_VERSION@@");
  assert.equal(B.APP_VERSION_CORE_FILE, path.join(ROOT, "src", "app", "core", "version.js"));
  assert.equal(B.DEFAULTS.package, PROJECT_PKG);
  assert.equal(B.loadVersionCore().APP_VERSION_META_NAME, "emt-app-version");
  assert.ok(fs.readFileSync(PROJECT_PKG).equals(PROJECT_PKG_BEFORE));
});
