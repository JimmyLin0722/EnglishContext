// QA 第 8 輪：逐一執行各套件（每個套件結束即關閉瀏覽器，同時只開 1 個瀏覽器；全套 run-all 曾因記憶體不足中斷，O-6-1）
// 用法：node tests/tools/run-r8.mjs [套件名…]（不給時跑 architecture §10.10 Q5 的回歸清單）；輸出 tests/results/tmp/r8-<套件>.txt、結果 JSON 由各套件寫入 tests/results/。
// 環境變數：QA_TMP（暫存目錄）、QA_V100（v1.0.0 舊交付檔，TC-47-04b；未指定時由 git a5eee06 取出）。
import { spawnSync, execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RES = path.join(ROOT, "tests", "results"); const LOG = path.join(RES, "tmp"); fs.mkdirSync(LOG, { recursive: true });
const TMP = process.env.QA_TMP || fs.mkdtempSync(path.join(os.tmpdir(), "emt-qa-")); fs.mkdirSync(TMP, { recursive: true });
const v100 = process.env.QA_V100 || path.join(TMP, "v1.0.0-english-master-track.html");
if (!fs.existsSync(v100)) fs.writeFileSync(v100, execFileSync("git", ["show", "a5eee06:dist/english-master-track.html"], { cwd: ROOT, maxBuffer: 64 << 20 }));
const rebuilt = path.join(TMP, "rebuilt.html");
const empty = path.join(TMP, "emptydata"); fs.mkdirSync(empty, { recursive: true }); fs.copyFileSync(path.join(ROOT, "src/data/sources.js"), path.join(empty, "sources.js"));
const fixture = path.join(TMP, "fixture-nodata.html");
const once = (args) => spawnSync(process.execPath, args, { cwd: ROOT, encoding: "utf8" });
once(["tools/build.mjs", "--out", rebuilt]);
once(["tools/build.mjs", "--out", fixture, "--data", empty, "--no-site"]);
const vfull = path.join(TMP, "validate-full.txt");
fs.writeFileSync(vfull, spawnSync(process.execPath, ["src/data/_tools/validate.mjs", "--all", "--stage", "final", "--max", "100000"], { cwd: ROOT, encoding: "utf8", maxBuffer: 256 << 20 }).stdout);
const J = (n) => path.join(RES, n + ".json");
const ALL = {
  data: ["tests/data/data-check.mjs", J("data")],
  records: ["tests/data/records-check.mjs", vfull, J("records")],
  static: ["tests/static/static-check.mjs", J("static"), rebuilt],
  legal: ["tests/static/legal-check.mjs", J("legal")],
  boundary: ["tests/static/boundary-check.mjs", J("boundary")],
  "boundary-r8": ["tests/static/boundary-r8.mjs", J("boundary-delta")],
  "pwa-static": ["tests/static/pwa-static.mjs", J("pwa-static")],
};
const list = process.argv.slice(2);
const DEFAULT = ["data", "records", "static", "legal", "boundary", "boundary-r8", "pwa-static", "e2e-lock", "e2e-track-p5", "e2e-legal", "e2e-track", "e2e-content", "e2e-layout", "e2e-motion", "e2e-persist", "e2e-progress", "e2e-env", "e2e-cards", "e2e-pwa", "e2e-pwa-update", "e2e-version"];
for (const raw of list.length ? list : DEFAULT) {
  const [name, browser] = raw.split(":"); // 例 e2e-goal:edge
  const args = ALL[name] || [`tests/e2e/${name}.mjs`];
  const env = { ...process.env, QA_TMP: TMP, QA_V100: v100, QA_FIXTURE_NODATA: fixture, ...(browser ? { QA_BROWSER: browser } : {}) };
  const t0 = Date.now();
  // stdout、stderr 直接寫檔。第 8 輪以管線執行時 e2e-lock 的 Node 程序曾 1 次以結束碼 3221226505 中止（原因未確認，Node 程序本身，非受測頁面）；改寫檔後重跑通過
  const logFile = path.join(LOG, `r8-${name}${browser ? "-" + browser : ""}.txt`); const fd = fs.openSync(logFile, "w");
  const r = spawnSync(process.execPath, args, { cwd: ROOT, env, stdio: ["ignore", fd, fd], timeout: 1500000 }); fs.closeSync(fd);
  const log = fs.readFileSync(logFile, "utf8");
  const fails = log.split("\n").filter((l) => /^\s*FAIL /.test(l)).map((l) => l.trim().slice(0, 40));
  console.log(`${name}${browser ? "（" + browser + "）" : ""}：結束碼 ${r.status}${r.error ? " " + r.error.code : ""}、${Math.round((Date.now() - t0) / 1000)} 秒、FAIL ${fails.length}${fails.length ? "：" + fails.join("｜") : ""}；${new Date().toISOString().slice(11, 19)}；可用記憶體 ${Math.round(os.freemem() / 1048576)} MB`);
}
