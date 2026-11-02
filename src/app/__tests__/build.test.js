// 建置腳本 tools/build.mjs 的單元測試（FE-01；architecture.md §5 B-1～B-8）
// 以 os.tmpdir() 下的 fixture 目錄測試，不寫入 dist/。
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
  assert.match(tpl, /<title>English Master Track<\/title>/);
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
  assert.ok(
    txt.includes(
      "單字資料與原創內容（例句、解析、Part 5 題目、長難句、句型）以 CC BY-SA 4.0 授權，原創內容著作權人 JimmyLin"
    )
  );
  assert.ok(txt.includes("https://creativecommons.org/licenses/by-sa/4.0/"));
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
      [BUILD, "--out", fx.opts.out, "--data", fx.opts.data, "--app", fx.opts.app],
      { encoding: "utf8" }
    );
    assert.equal(ok.status, 0, ok.stderr);
    assert.match(ok.stdout, /總大小/);
    assert.ok(fs.readFileSync(fx.opts.out, "utf8").startsWith("<!DOCTYPE html>"));

    fs.rmSync(fx.opts.out);
    fs.writeFileSync(path.join(fx.opts.app, "index.html"), TEMPLATE.replace("<!-- @@DATA@@ -->", ""));
    const bad = spawnSync(
      process.execPath,
      [BUILD, `--out=${fx.opts.out}`, `--data=${fx.opts.data}`, `--app=${fx.opts.app}`],
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
