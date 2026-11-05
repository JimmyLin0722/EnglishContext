// QA 第 4 輪（PRD v0.11 PWA）靜態與建置檢查：V-PWA-01～06（產物層）、AC-34-01／03／04／05（檔案部分）、AC-36-01、AC-36-02、
// AC-36-07（MC-03 新 workflow 本機模擬）、AC-19-01（附屬檔參照）。不修改 src/、tools/、dist/；所有建置輸出到暫存目錄。
// 用法：node tests/static/pwa-static.mjs [輸出 JSON]
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { decodePng, solidPng } from "../e2e/lib/pwa-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SITE = path.join(ROOT, "dist", "site");
const DIST = path.join(ROOT, "dist", "english-master-track.html");
const TMP = fs.mkdtempSync(path.join(process.env.QA_TMP || os.tmpdir(), "pwa-static-"));
const BASH = process.env.QA_BASH || "C:/Program Files/Git/bin/bash.exe";
const out = process.argv[2];
const results = [];
const rec = (tc, ac, ok, note) => { results.push({ suite: "pwa-static", tc, ac, result: ok ? "通過" : "失敗", note }); console.log(`  ${ok ? "PASS" : "FAIL"} ${tc} ${ac} ${note}`); };
const manualRec = (tc, ac, note) => { results.push({ suite: "pwa-static", tc, ac, result: "待人工", note }); console.log(`  MANUAL ${tc} ${ac} ${note}`); };
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex").slice(0, 12);
const DEPLOY = ["index.html", "manifest.webmanifest", "sw.js", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "icons/apple-touch-icon-180.png", "ads.txt", "about.html", "contact.html", "privacy.html", "robots.txt", "sitemap.xml"];
const ICONS = { "icons/icon-192.png": 192, "icons/icon-512.png": 512, "icons/icon-maskable-512.png": 512, "icons/apple-touch-icon-180.png": 180 };
const PRECACHE = ["./", "./index.html", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-maskable-512.png", "./icons/apple-touch-icon-180.png"];
function listFiles(dir, base = dir, acc = []) { for (const f of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, f.name); if (f.isDirectory()) listFiles(p, base, acc); else acc.push(path.relative(base, p).split(path.sep).join("/")); } return acc; }
function build(args, cwd = ROOT) { const r = spawnSync(process.execPath, ["tools/build.mjs", ...args], { cwd, encoding: "utf8" }); return { status: r.status, log: (r.stdout || "") + (r.stderr || "") }; }
const buildId = (html) => (String(html).match(/<meta name="emt-build-id" content="([^"]*)">/) || [])[1];
const swId = (sw) => (String(sw).match(/var BUILD_ID = "([^"]*)";/) || [])[1];

const html = fs.readFileSync(DIST); const htmlS = html.toString("utf8");
const sw = fs.readFileSync(path.join(SITE, "sw.js"), "utf8");

// TC-PS-01 V-PWA-01、DP-1～DP-3、DP-6（AC-36-07 部署目錄）
{
  const files = listFiles(SITE).sort();
  const same = JSON.stringify(files) === JSON.stringify([...DEPLOY].sort());
  const idx = fs.readFileSync(path.join(SITE, "index.html")).equals(html);
  const adsSrc = fs.readFileSync(path.join(ROOT, "sources/deploy/ads.txt"));
  const ads = fs.readFileSync(path.join(SITE, "ads.txt"));
  const adsOld = fs.existsSync(path.join(ROOT, "dist/ads.txt")) ? fs.readFileSync(path.join(ROOT, "dist/ads.txt")) : null;
  const iconSame = Object.keys(ICONS).every((p) => fs.readFileSync(path.join(SITE, p)).equals(fs.readFileSync(path.join(ROOT, "src/app/assets", p))));
  const lower = files.every((f) => f === f.toLowerCase());
  const forbidden = files.filter((f) => /^(docs|src|sources)\//.test(f) || f.endsWith(".map") || f === "english-master-track.html");
  rec("TC-PS-01", "AC-36-07、AC-19-01（V-PWA-01）", same && idx && ads.equals(adsSrc) && (!adsOld || ads.equals(adsOld)) && iconSame && lower && forbidden.length === 0,
    `dist/site 檔案 ${files.length} 個 ${JSON.stringify(files)}，與契約 13 檔相同=${same}；全小寫=${lower}；index.html 與 dist/english-master-track.html 位元組相同=${idx}；ads.txt 與 sources/deploy/ads.txt 相同=${ads.equals(adsSrc)}、與 dist/ads.txt 相同=${adsOld ? ads.equals(adsOld) : "（無）"}（${JSON.stringify(ads.toString("utf8").trim())}）；4 張 PNG 與 src/app/assets/icons 位元組相同=${iconSame}；不得出現的檔案 ${forbidden.length}`);
}

// TC-PS-02 V-PWA-02、MF-1～MF-3、DP-7
{
  const b = fs.readFileSync(path.join(SITE, "manifest.webmanifest"));
  const bom = b[0] === 0xef && b[1] === 0xbb;
  const j = JSON.parse(b.toString("utf8"));
  const keys = Object.keys(j);
  const order = ["name", "short_name", "id", "start_url", "scope", "display", "lang", "theme_color", "background_color", "icons"];
  const rel = ["id", "start_url", "scope", ...j.icons.map((_, i) => `icons[${i}]`)].every((k) => { const v = k.startsWith("icons[") ? j.icons[Number(k.slice(6, -1))].src : j[k]; return !/^(\/|https?:)/i.test(v); });
  const icons = j.icons.every((ic) => DEPLOY.includes(ic.src) && typeof ic.purpose === "string" && !ic.purpose.includes(" "));
  const exact = b.toString("utf8") === JSON.stringify(j, null, 2) + "\n";
  rec("TC-PS-02", "AC-34-01（V-PWA-02）", !bom && JSON.stringify(keys) === JSON.stringify(order) && rel && icons && j.name === "EnglishContext" && j.short_name === "EnglishContext" && j.theme_color === "#1e9bf0" && j.background_color === "#eef4fa" && exact && !/emt|[0-9a-f]{16}/.test(JSON.stringify(j)),
    `UTF-8 無 BOM=${!bom}；鍵 ${keys.length} 個、順序同契約=${JSON.stringify(keys) === JSON.stringify(order)}；相對路徑=${rel}；icons 皆在部署清單且單一 purpose=${icons}；格式為 JSON.stringify(…, null, 2)+"\\n"=${exact}；不含 BUILD_ID；theme_color ${j.theme_color}、background_color ${j.background_color}（第 5 輪：PRD v0.12 AC-38-02、Q-54）`);
}

// TC-PS-03 V-PWA-03、DP-4 (a)(b)
{
  const notes = []; let ok = true;
  for (const [p, n] of Object.entries(ICONS)) {
    const d = decodePng(fs.readFileSync(path.join(SITE, p)));
    const good = d.w === n && d.h === n && d.ct === 2 && d.bd === 8 && !d.tRNS && d.chunks[0] === "IHDR";
    ok = ok && good; notes.push(`${p} ${d.w}×${d.h} 色彩類型 ${d.ct} 位元深度 ${d.bd} tRNS=${d.tRNS}`);
  }
  rec("TC-PS-03", "AC-34-01、AC-34-03、AC-34-05（V-PWA-03）", ok, notes.join("；"));
}

// TC-PS-04 V-PWA-04、HD-1～HD-5（AC-34-04、AC-36-02、AC-37-01、AC-19-01）
// 第 5 輪（PRD v0.13）：theme-color 改 #1e9bf0（Q-54、AC-38-02）、<title> 改 EnglishContext（Q-49、NM-1）
{
  const head = htmlS.slice(0, htmlS.indexOf("</head>"));
  const HD1 = ['<meta name="theme-color" content="#1e9bf0">', '<meta name="apple-mobile-web-app-title" content="EnglishContext">', '<meta name="apple-mobile-web-app-capable" content="yes">',
    '<meta name="mobile-web-app-capable" content="yes">', '<meta name="apple-mobile-web-app-status-bar-style" content="default">', '<link rel="icon" href="data:,">'];
  const cnt = (s, t) => s.split(t).length - 1;
  const hd1 = HD1.map((t) => `${cnt(htmlS, t)}/${cnt(head, t)}`);
  const id = buildId(htmlS);
  const forb = [/<link\b[^>]*\brel=["']?(manifest|apple-touch-icon|apple-touch-startup-image|preload|prefetch|modulepreload)\b/i, /<script\b[^>]*\bsrc\s*=/i, /<link\b[^>]*rel=["']?icon["']?[^>]*href=["'](?!data:,)/i].filter((re) => re.test(htmlS)).map(String);
  const titles = htmlS.match(/<title>[^<]*<\/title>/g) || [];
  const linkTags = htmlS.match(/<link\b[^>]*>/gi) || [];
  rec("TC-PS-04", "AC-34-04、AC-34-05、AC-36-02、AC-37-01、AC-19-01（V-PWA-04）", HD1.every((t) => cnt(htmlS, t) === 1 && cnt(head, t) === 1) && /^[0-9a-f]{16}$/.test(id || "") && cnt(htmlS, "<meta name=\"emt-build-id\"") === 1 && forb.length === 0 && titles.length === 1 && titles[0] === "<title>EnglishContext｜英文單字卡與模擬測驗</title>" && linkTags.length === 2 && linkTags.includes('<link rel="canonical" href="https://jimmyfantasyworld.com/">') && !htmlS.includes("@@"),
    `HD-1 各元素（全檔／head 內）次數 ${hd1.join("、")}；emt-build-id=${id}；禁止元素命中 ${forb.length}${forb.length ? forb.join("、") : ""}；<link> 標籤 ${JSON.stringify(linkTags)}；${titles.join("")}；殘留佔位 @@=${htmlS.includes("@@")}`);
}

// TC-PS-05 V-PWA-05、SW-3、SW-10（AC-36-02、AC-37-05）
{
  const id = buildId(htmlS);
  const banned = ["importScripts", "indexedDB", "localStorage", "sessionStorage", '"push"', '"sync"', "periodicsync", "notificationclick", "backgroundfetch", "BroadcastChannel", "navigationPreload", "caches.match(", "http://", "https://", "@@", "postMessage", "matchAll", "clients.get"];
  const hits = banned.filter((w) => sw.includes(w));
  const listeners = [...sw.matchAll(/addEventListener\(\s*"([^"]+)"/g)].map((m) => m[1]);
  const pre = (sw.match(/var PRECACHE_URLS = (\[[^\]]*\]);/) || [])[1];
  const preArr = pre ? JSON.parse(pre) : [];
  const ok = swId(sw) === id && sw.includes(`var CACHE_PREFIX = "english-master-track-pwa-";`) && /var CACHE_NAME = CACHE_PREFIX \+ BUILD_ID;/.test(sw) && JSON.stringify(preArr.slice().sort()) === JSON.stringify(PRECACHE.slice().sort())
    && hits.length === 0 && JSON.stringify(listeners.slice().sort()) === JSON.stringify(["activate", "fetch", "install", "message"]) && !/self\.on\w+\s*=/.test(sw) && !/skipWaiting\(\)[\s\S]{0,40}install/.test(sw)
    && sw[0] !== "\ufeff";
  rec("TC-PS-05", "AC-36-02、AC-37-05、AC-35-01（V-PWA-05）", ok,
    `sw.js BUILD_ID=${swId(sw)}（HTML ${id}）；CACHE_NAME = 前綴 + BUILD_ID；PRECACHE_URLS ${JSON.stringify(preArr)}；禁用字串命中 ${hits.join("、") || "無"}；監聽 ${listeners.join("、")}；無 self.onX 指派；UTF-8 無 BOM`);
}

// TC-PS-06 AC-19-01：HTML 內對檔案的參照只有同目錄相對路徑的 PWA 附屬檔
{
  const refs = [...new Set([...htmlS.matchAll(/["'](\.{0,2}\/?[\w./-]+\.(?:webmanifest|png|js|json|ico|txt|css|html))["']/g)].map((m) => m[1]))];
  const bad = refs.filter((r) => !["manifest.webmanifest", "icons/apple-touch-icon-180.png", "icons/icon-192.png", "./sw.js", "./"].includes(r));
  // 第 9 輪（§10.11 Q3、§5.9 DS-55；放寬判定）：只排除逐字 canonical 與 <noscript> 內 3 個一般連結（使用者點擊才離開，不是資源）；其餘 src、href 絕對網址仍判失敗
  const absSrc = htmlS.replace('<link rel="canonical" href="https://jimmyfantasyworld.com/">', "").replace(/<noscript>[\s\S]*?<\/noscript>/, "");
  const abs = (absSrc.match(/(?:src|href)\s*=\s*["']\s*(?:https?:)?\/\//gi) || []);
  rec("TC-PS-06", "AC-19-01（附屬檔參照）", abs.length === 0,
    `HTML 中類檔名字串 ${refs.length} 種：PWA 附屬檔 ${JSON.stringify(refs.filter((r) => !bad.includes(r)))}；其他（內容資料中的字串，非資源參照，人工判讀）${JSON.stringify(bad.slice(0, 15))}；src/href 絕對網址 ${abs.length}`);
}

// TC-36-01a／b／c、TC-36-02：建置可重現與識別碼（V-PWA-06）
const ids = {};
{
  const b1 = path.join(TMP, "a1"), b2 = path.join(TMP, "a2");
  const r1 = build(["--out", path.join(b1, "t.html")]), r2 = build(["--out", path.join(b2, "t.html")]);
  const three = ["t.html", "site/index.html", "site/manifest.webmanifest", "site/sw.js"].map((f) => fs.readFileSync(path.join(b1, f)).equals(fs.readFileSync(path.join(b2, f))));
  const allSame = listFiles(b1).every((f) => fs.readFileSync(path.join(b1, f)).equals(fs.readFileSync(path.join(b2, f))));
  const vsDist = fs.readFileSync(path.join(b1, "t.html")).equals(html) && listFiles(path.join(b1, "site")).every((f) => fs.readFileSync(path.join(b1, "site", f)).equals(fs.readFileSync(path.join(SITE, f))));
  ids.base = buildId(fs.readFileSync(path.join(b1, "t.html"), "utf8"));
  rec("TC-36-01a", "AC-36-01 (a)（V-PWA-06）", r1.status === 0 && r2.status === 0 && three.every(Boolean) && allSame,
    `連續建置 2 次：HTML／index.html／manifest／sw.js 逐位元組相同 ${JSON.stringify(three)}、部署目錄全部相同=${allSame}（sha ${sha(fs.readFileSync(path.join(b1, "t.html")))}）；與 dist/ 現有產物相同=${vsDist}；BUILD_ID ${ids.base}`);

  const variants = [];
  // (b-app) src/app 改 1 個字（複本；main.js 第 1 個「。」改「，」）
  { const app = path.join(TMP, "app-b"); fs.cpSync(path.join(ROOT, "src/app"), app, { recursive: true, filter: (s) => !s.includes("__tests__") });
    const f = path.join(app, "main.js"); const s = fs.readFileSync(f, "utf8"); const i = s.indexOf("。"); fs.writeFileSync(f, s.slice(0, i) + "，" + s.slice(i + 1));
    variants.push(["src/app/main.js 改 1 字（註解「。」→「，」）", ["--app", app], "b"]); }
  // (b-data) src/data 改 1 個字（內容：templates.js 第一個 "延遲" → "延時"）
  { const data = path.join(TMP, "data-b"); fs.cpSync(path.join(ROOT, "src/data"), data, { recursive: true });
    const f = path.join(data, "templates.js"); const s = fs.readFileSync(f, "utf8"); fs.writeFileSync(f, s.replace("延遲；", "延時；"));
    variants.push(["src/data/templates.js 改 1 字（內容「延遲」→「延時」）", ["--data", data], "b"]); }
  // (b-data-comment) src/data 只改註解 1 個字（觀察：資料以 JSON 重新序列化，註解不進產物）
  { const data = path.join(TMP, "data-c"); fs.cpSync(path.join(ROOT, "src/data"), data, { recursive: true });
    const f = path.join(data, "templates.js"); const s = fs.readFileSync(f, "utf8"); fs.writeFileSync(f, s.replace("全部原創", "全部原作"));
    variants.push(["src/data/templates.js 只改第 1 行註解 1 字（觀察）", ["--data", data], "obs"]); }
  // (c) 換 1 張圖示（icon-192 改為單色 RGB PNG）
  { const app = path.join(TMP, "app-c"); fs.cpSync(path.join(ROOT, "src/app"), app, { recursive: true, filter: (s) => !s.includes("__tests__") });
    fs.writeFileSync(path.join(app, "assets/icons/icon-192.png"), solidPng(192, [47, 111, 214]));
    variants.push(["換 icons/icon-192.png（單色 192×192 RGB）", ["--app", app], "c"]); }
  // 只改 ads.txt → 不變（SW-2）
  { const ads = path.join(TMP, "ads-x.txt"); fs.writeFileSync(ads, "google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0\n");
    variants.push(["只改 ads.txt", ["--ads", ads], "ads"]); }
  const lines = []; let okB = true, okC = true, okAds = true, obs = "";
  for (const [label, args, kind] of variants) {
    const d = path.join(TMP, "v-" + kind + "-" + variants.indexOf(variants.find((v) => v[0] === label)));
    const r = build(["--out", path.join(d, "t.html"), ...args]);
    if (r.status !== 0) { lines.push(`${label}：建置失敗 ${r.log.slice(-200)}`); if (kind === "b") okB = false; if (kind === "c") okC = false; continue; }
    const h = fs.readFileSync(path.join(d, "t.html"), "utf8"); const s = fs.readFileSync(path.join(d, "site/sw.js"), "utf8"); const id = buildId(h);
    const swDiff = s !== sw; const idDiff = id !== ids.base; const match = swId(s) === id;
    lines.push(`${label}：BUILD_ID ${id}（不同=${idDiff}）、sw.js 不同=${swDiff}、HTML 與 sw 識別碼一致=${match}`);
    if (kind === "b") okB = okB && idDiff && swDiff && match;
    if (kind === "c") okC = okC && idDiff && swDiff && match;
    if (kind === "ads") okAds = !idDiff && !swDiff;
    if (kind === "obs") { obs = `${label} → BUILD_ID ${idDiff ? "改變" : "不變"}、HTML ${h === htmlS ? "與原產物相同" : "不同"}`; ids.obsComment = { idDiff, htmlSame: h === htmlS }; }
    if (kind === "b" && !ids.v2) ids.v2 = id;
  }
  rec("TC-36-01b", "AC-36-01 (b)、AC-36-02", okB, lines.filter((l) => /src\/app\/main|templates\.js 改 1 字/.test(l)).join("；") + "；全程未手動修改版本號、快取名稱或 sw 範本");
  rec("TC-36-01c", "AC-36-01 (c)", okC, lines.filter((l) => /icon-192/.test(l)).join("；"));
  rec("TC-36-02", "AC-36-02", okB && okAds && /^[0-9a-f]{16}$/.test(ids.base) && swId(sw) === buildId(htmlS),
    `HTML <meta name="emt-build-id"> = sw.js BUILD_ID = ${swId(sw)}（畫面不顯示，meta 標籤）；(b) 兩版識別碼 ${ids.base} ≠ ${ids.v2}；${lines.filter((l) => /ads/.test(l)).join("")}（ads.txt 不納入，SW-2）`);
  if (obs) results.push({ suite: "pwa-static", tc: "TC-36-01obs", ac: "AC-36-01（觀察）", result: "通過", note: obs + "：資料檔以 JSON 重新序列化，註解不進入交付 HTML，因此交付物不變、無需更新；列觀察與回饋上游（AC-36-01 (b)「任一處」的解讀）" });
}

// TC-36-07a：MC-03 新 workflow 本機模擬（architecture §5.2 全文中的 Build、Verify 步驟；以 LF 換行的乾淨複本模擬 CI checkout）
{
  // 第 9 輪：§5.2 的 yaml 為 v0.7 歷史（仍寫 8 檔），改讀實際部署的 .github/workflows/static.yml（MC-08）
  const yaml = fs.readFileSync(path.join(ROOT, ".github/workflows/static.yml"), "utf8").replace(/\r\n/g, "\n");
  const verify = (yaml.match(/- name: Verify deploy directory\n\s+run: \|\n([\s\S]*?)\n\s+- name:/) || [])[1] || "";
  const verifyScript = verify.split("\n").map((l) => l.replace(/^ {10}/, "")).join("\n");
  const buildCmd = (yaml.match(/- name: Build\n\s+run: (.+)/) || [])[1];
  const upload = (yaml.match(/path: (dist\/site)/) || [])[1];
  const noNpmCi = !/npm ci/.test(yaml.replace(/#.*$/gm, ""));
  const sim = path.join(TMP, "ci-checkout");
  const skip = new Set([".git", "node_modules", "dist"]);
  fs.cpSync(ROOT, sim, { recursive: true, filter: (s) => !skip.has(path.relative(ROOT, s).split(path.sep)[0]) });
  // .gitattributes：* text=auto eol=lf → CI checkout 的文字檔為 LF
  let conv = 0;
  for (const f of listFiles(sim)) { if (/\.(png|jpe?g|docx|gif|ico)$/i.test(f)) continue; const p = path.join(sim, f); const b = fs.readFileSync(p); if (b.includes(0)) continue; const s = b.toString("utf8"); if (s.includes("\r\n")) { fs.writeFileSync(p, s.replace(/\r\n/g, "\n")); conv++; } }
  const bRes = spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "build"], { cwd: sim, encoding: "utf8", shell: true });
  const vRes = spawnSync(BASH, ["-c", verifyScript], { cwd: sim, encoding: "utf8" });
  const files = fs.existsSync(path.join(sim, "dist/site")) ? listFiles(path.join(sim, "dist/site")) : [];
  const ciId = fs.existsSync(path.join(sim, "dist/site/index.html")) ? buildId(fs.readFileSync(path.join(sim, "dist/site/index.html"), "utf8")) : null;
  // CI checkout 只含已提交檔案：檢查 CI 建置所需而目前未被 git 追蹤的檔案
  const need = ["src/app/assets/icons/icon-192.png", "src/app/assets/icons/icon-512.png", "src/app/assets/icons/icon-maskable-512.png", "src/app/assets/icons/apple-touch-icon-180.png",
    "sources/deploy/ads.txt", "src/app/core/pwa.js", "src/app/pwa/sw.template.js", "src/app/services/pwa.js", "src/app/ui/pwa-notice.js", "src/app/styles/80-pwa.css", "tools/serve.mjs", "tools/build.mjs", "package.json", ".gitattributes"];
  const untracked = need.filter((f) => spawnSync("git", ["ls-files", "--error-unmatch", f], { cwd: ROOT, encoding: "utf8" }).status !== 0);
  const ok = bRes.status === 0 && vRes.status === 0 && files.length === 13 && buildCmd === "npm run build" && upload === "dist/site" && noNpmCi && verifyScript.includes("-eq 13");
  rec("TC-36-07a", "AC-36-07（本機模擬 MC-03 新 workflow）", ok,
    `取 .github/workflows/static.yml（MC-08）：Build「${buildCmd}」、上傳 path「${upload}」、不執行 npm ci=${noNpmCi}；以不含 .git／node_modules／dist 的複本（${conv} 個文字檔轉 LF，模擬 .gitattributes eol=lf 的 CI checkout）執行 npm run build → 結束碼 ${bRes.status}；Verify 步驟（逐字取自 static.yml，以 Git Bash 執行）結束碼 ${vRes.status}${vRes.status ? "：" + (vRes.stdout + vRes.stderr).slice(-200) : ""}；dist/site 恰 ${files.length} 個檔案 ${JSON.stringify(files.sort())}；CI 模擬 BUILD_ID ${ciId}（本機 CRLF 工作目錄 ${ids.base}；${ciId === ids.base ? "相同" : "不同，屬 SD-FB-37 已知事項"}）；CI 建置所需但尚未被 git 追蹤的檔案 ${untracked.length} 個${untracked.length ? JSON.stringify(untracked) : ""}`);
  manualRec("TC-PWA-H4", "AC-36-07（GitHub Pages 部署結果）", `MC-03 由主控整檔取代 static.yml 後，push 到 main：Actions 成功；部署網址下 13 個檔案皆 200 且與 artifact 相同；網站不含 docs/、src/、sources/。第 5 輪：static.yml 已為 MC-03 新版（npm run build＋Verify deploy directory），v0.11 部署時主控回報 Actions 成功、正式網址 8 檔皆 200；v0.12（本輪）尚未提交與部署，push 後由人類重驗`);
}

const sum = { pass: results.filter((r) => r.result === "通過").length, fail: results.filter((r) => r.result === "失敗").length };
console.log(`PWA 靜態與建置檢查：通過 ${sum.pass}、失敗 ${sum.fail}（暫存 ${TMP}）`);
if (out) { fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, JSON.stringify(results, null, 2)); }
