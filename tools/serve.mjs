// English Master Track 本機靜態伺服器（FE-47；architecture.md §5.1「tools/serve.mjs」、§10.4 V-PWA (b)）
// 以 http://localhost:<port><base> 提供部署目錄（預設 dist/site/），模擬 GitHub Pages 專案子路徑，
// 供 PWA（service worker、manifest、更新流程）在本機安全環境（localhost）測試。只使用 Node 內建模組。
//
// 用法：
//   node tools/serve.mjs [--dir <dir>] [--port <n>] [--base <path>]
//     --dir   要提供的目錄，預設 dist/site
//     --port  埠號，預設 8080（0 = 隨機）
//     --base  網址子路徑，預設 /english-master-track/（必須以 / 開頭並以 / 結尾）
//
// 規則：
// - 只綁 127.0.0.1；只接受 GET、HEAD（其他 405）。
// - <base> → index.html；<base> 去尾斜線 → 301 到 <base>；<base><path> → --dir 下對應檔案；
//   解析後不在 --dir 內（路徑穿越）、<base> 以外（如 /favicon.ico）、檔案不存在 → 404。
// - Content-Type 依副檔名；Cache-Control: max-age=600（模擬 GitHub Pages）。
// - 每次請求都重新讀檔（不快取在記憶體），換掉 --dir 的內容即模擬重新部署。

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, "..");

/** 預設值 */
export const SERVE_DEFAULTS = Object.freeze({
  dir: path.join(PROJECT_ROOT, "dist", "site"),
  port: 8080,
  base: "/english-master-track/",
  host: "127.0.0.1",
});

/** 副檔名 → Content-Type */
export const MIME = Object.freeze({
  ".html": "text/html; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".txt": "text/plain; charset=utf-8",
  // （v0.14，FE-85）sitemap.xml（契約 §10.2）
  ".xml": "application/xml; charset=utf-8",
});

/** 模擬 GitHub Pages 的快取標頭 */
export const CACHE_CONTROL = "max-age=600";

/** 參數錯誤 */
export class ServeError extends Error {
  constructor(message) {
    super(message);
    this.name = "ServeError";
  }
}

/** 檢查 base 格式：以 / 開頭並以 / 結尾 */
function checkBase(base) {
  if (typeof base !== "string" || !base.startsWith("/") || !base.endsWith("/")) {
    throw new ServeError(`--base 必須以 / 開頭並以 / 結尾：${base}`);
  }
  return base;
}

/** 純文字回應 */
function sendText(res, method, status, text, headers = {}) {
  const body = Buffer.from(text + "\n", "utf8");
  res.writeHead(status, Object.assign({
    "Content-Type": "text/plain; charset=utf-8",
    "Content-Length": body.length,
    "Cache-Control": "no-store",
  }, headers));
  res.end(method === "HEAD" ? undefined : body);
}

/**
 * 把請求路徑對應到 dir 內的檔案；不在 base 內、解碼失敗、路徑穿越 → null。
 * @param {string} dir 絕對路徑
 * @param {string} base
 * @param {string} pathname 已由 URL 正規化的路徑（仍為百分比編碼）
 * @returns {string|null}
 */
export function resolveFile(dir, base, pathname) {
  if (!pathname.startsWith(base)) return null;
  let rel;
  try {
    rel = decodeURIComponent(pathname.slice(base.length));
  } catch (e) {
    return null;
  }
  if (rel.includes("\0")) return null;
  if (rel === "" || rel.endsWith("/")) rel += "index.html";
  const root = path.resolve(dir);
  const abs = path.resolve(root, rel);
  if (abs !== root && !abs.startsWith(root + path.sep)) return null;
  return abs;
}

/**
 * 建立請求處理函式。
 * @param {{ dir: string, base: string, log?: (s: string) => void }} opts
 */
export function createHandler(opts) {
  const dir = path.resolve(opts.dir);
  const base = checkBase(opts.base);
  const log = opts.log || (() => {});
  return function handle(req, res) {
    const method = req.method || "GET";
    const done = (status) => log(`${method} ${req.url} ${status}`);
    if (method !== "GET" && method !== "HEAD") {
      sendText(res, method, 405, "Method Not Allowed", { Allow: "GET, HEAD" });
      return done(405);
    }
    let pathname;
    try {
      pathname = new URL(req.url, "http://localhost").pathname;
    } catch (e) {
      sendText(res, method, 404, "Not Found");
      return done(404);
    }
    if (pathname === base.slice(0, -1)) {
      sendText(res, method, 301, "Moved Permanently", { Location: base });
      return done(301);
    }
    const file = resolveFile(dir, base, pathname);
    let stat = null;
    try {
      stat = file ? fs.statSync(file) : null;
    } catch (e) {
      stat = null;
    }
    if (!file || !stat || !stat.isFile()) {
      sendText(res, method, 404, "Not Found");
      return done(404);
    }
    let body;
    try {
      body = fs.readFileSync(file); // 每次請求都讀檔（不快取）
    } catch (e) {
      sendText(res, method, 404, "Not Found");
      return done(404);
    }
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream",
      "Content-Length": body.length,
      "Cache-Control": CACHE_CONTROL,
    });
    res.end(method === "HEAD" ? undefined : body);
    return done(200);
  };
}

/**
 * 啟動伺服器。
 * @param {{ dir?: string, port?: number, base?: string, host?: string, log?: (s: string) => void }} [opts]
 * @returns {Promise<{ server: http.Server, port: number, url: string, close: () => Promise<void> }>}
 */
export function startServer(opts = {}) {
  const dir = path.resolve(opts.dir || SERVE_DEFAULTS.dir);
  const base = checkBase(opts.base || SERVE_DEFAULTS.base);
  const host = opts.host || SERVE_DEFAULTS.host;
  const port = opts.port === undefined ? SERVE_DEFAULTS.port : opts.port;
  const server = http.createServer(createHandler({ dir, base, log: opts.log }));
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      const actual = server.address().port;
      resolve({
        server,
        port: actual,
        url: `http://localhost:${actual}${base}`,
        close: () => new Promise((r) => server.close(() => r())),
      });
    });
  });
}

/** 解析命令列參數 */
export function parseServeArgs(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    const m = /^--(dir|port|base)(?:=(.*))?$/.exec(argv[i]);
    if (!m) throw new ServeError(`不認識的參數：${argv[i]}（可用 --dir、--port、--base）`);
    const value = m[2] !== undefined ? m[2] : argv[++i];
    if (!value) throw new ServeError(`參數 --${m[1]} 缺少值`);
    if (m[1] === "port") {
      const n = Number(value);
      if (!Number.isInteger(n) || n < 0 || n > 65535) throw new ServeError(`--port 不合法：${value}`);
      opts.port = n;
    } else {
      opts[m[1]] = value;
    }
  }
  if (opts.base !== undefined) checkBase(opts.base);
  return opts;
}

/** 是否以命令列直接執行本檔 */
function isMain() {
  if (!process.argv[1]) return false;
  const self = path.resolve(fileURLToPath(import.meta.url));
  const entry = path.resolve(process.argv[1]);
  return process.platform === "win32" ? self.toLowerCase() === entry.toLowerCase() : self === entry;
}

if (isMain()) {
  try {
    const opts = parseServeArgs(process.argv.slice(2));
    const dir = path.resolve(opts.dir || SERVE_DEFAULTS.dir);
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
      throw new ServeError(`找不到目錄 ${dir}（請先執行 npm run build）`);
    }
    startServer(Object.assign({}, opts, { dir, log: (s) => console.log(s) })).then(
      (s) => {
        console.log(`提供 ${dir}`);
        console.log(`網址：${s.url}（只綁 127.0.0.1；按 Ctrl+C 結束）`);
      },
      (err) => {
        console.error(`[伺服器啟動失敗] ${err && err.message}`);
        process.exitCode = 1;
      }
    );
  } catch (err) {
    console.error(`[伺服器啟動失敗] ${err && err.message}`);
    process.exitCode = 1;
  }
}
