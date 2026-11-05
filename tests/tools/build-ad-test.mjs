// QA 第 9 輪（architecture §7.25.4 Q4、V-AD (b)）：呼叫 build({ adSlotIdOverride }) 產生「已設定單元 ID」的測試建置，輸出到暫存目錄。
// 測試輸出不可落在專案 dist/：build() 本身以 AD_OVERRIDE 中止（第 3 層保護），本工具另先自行檢查。
// 用法：import { buildAdTest } from "../tools/build-ad-test.mjs"; 或 node tests/tools/build-ad-test.mjs <輸出目錄>
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const TEST_SLOT_ID = "1234567890"; // 測試值（architecture §7.25.4），不是真實單元 ID

/** 回傳 { dir, out, site, buildId }；dir 不可在 dist/ 內 */
export async function buildAdTest(dir, opts = {}) {
  const root = path.resolve(dir || fs.mkdtempSync(path.join(process.env.QA_TMP || os.tmpdir(), "ad-build-")));
  const dist = path.join(ROOT, "dist") + path.sep;
  if ((root + path.sep).toLowerCase().startsWith(dist.toLowerCase())) throw new Error("測試建置不可寫入 dist/：" + root);
  fs.mkdirSync(root, { recursive: true });
  const out = path.join(root, "english-master-track.html");
  const site = path.join(root, "site");
  const { build } = await import(pathToFileURL(path.join(ROOT, "tools/build.mjs")).href);
  const logs = [];
  build({ adSlotIdOverride: opts.slot || TEST_SLOT_ID, out, site, log: (s) => logs.push(s), warn: (s) => logs.push("警告：" + s), ...(opts.app ? { app: opts.app } : {}) });
  const html = fs.readFileSync(out, "utf8");
  return { dir: root, out, site, logs, buildId: (html.match(/<meta name="emt-build-id" content="([0-9a-f]+)">/) || [])[1] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const r = await buildAdTest(process.argv[2]);
  console.log(JSON.stringify({ out: r.out, site: r.site, buildId: r.buildId }, null, 1));
  console.log(r.logs.filter((l) => /廣告/.test(l)).join("\n"));
}
