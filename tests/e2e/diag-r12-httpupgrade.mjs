// 診斷（第 12 輪，TC-50-01 http://jimmyfantasyworld.com 失敗原因）：瀏覽器是否把 http 導覽自動升級為 https（HTTPS-Upgrades）。
// 與 e2e-ad 相同：本機 HTTPS 伺服器、--host-resolver-rules、context.route 攔 http 來源。用法：node tests/e2e/diag-r12-httpupgrade.mjs（QA_BROWSER=edge 改用 Edge）
import fs from "node:fs"; import os from "node:os"; import path from "node:path";
import { launchBrowser, newEnv } from "./lib/pwa-env.mjs";
import { routeSite, startProdServer, prodBrowserArgs } from "./lib/ad-env.mjs";
const TMP = fs.mkdtempSync(path.join(process.env.QA_TMP || os.tmpdir(), "httpup-"));
const dir = path.join(TMP, "site"); fs.mkdirSync(dir); fs.writeFileSync(path.join(dir, "index.html"), "<!doctype html><title>qa</title><p id=x>local https server</p>");
const dirHttp = path.join(TMP, "site-http"); fs.mkdirSync(dirHttp); fs.writeFileSync(path.join(dirHttp, "index.html"), "<!doctype html><title>qa</title><p id=x>http route</p>");
const server = await startProdServer(TMP, dir);
for (const extra of [[], ["--disable-features=HttpsUpgrades,HttpsFirstModeV2,HttpsFirstBalancedModeAutoEnable,HttpsFirstModeV2ForTypicallySecureUsers,HttpsFirstModeIncognito,HttpsFirstBalancedMode"]]) {
  const browser = await launchBrowser([...prodBrowserArgs(server.port), ...extra]);
  const env = await newEnv(browser, {}); await routeSite(env.ctx, dirHttp, "http://jimmyfantasyworld.com/");
  const page = await env.newPage(); await page.goto("http://jimmyfantasyworld.com/", { waitUntil: "load" }).catch((e) => console.log("goto 錯誤", e.message.slice(0, 120)));
  console.log(`${process.env.QA_BROWSER || "chrome"} ${browser.version()} 參數 ${JSON.stringify(extra)}：最終網址 ${page.url()}、內容「${await page.textContent("#x").catch(() => "?")}」、導覽 ${JSON.stringify(env.log.navigations.map((n) => n.url))}`);
  await browser.close();
}
await server.close();
