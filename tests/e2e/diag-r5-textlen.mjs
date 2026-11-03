// 第 5 輪 QA 診斷：資料損壞重設後主控台的可見文字長度（TC-18-05 舊門檻「> 200 字」的失敗原因，O-5-2）
import { launch, sleep } from "./lib/cdp.mjs";
const p = await launch();
await p.viewport(1366, 900); await p.goto();
await p.ev(`localStorage.setItem("englishMasterTrack:state", "{broken")`); await p.reload();
await p.ev(`EMT.router.go("dashboard")`); await sleep(400);
console.log(await p.ev(`({ len: document.body.innerText.length, tab: EMT.router.current() })`));
await p.close();
