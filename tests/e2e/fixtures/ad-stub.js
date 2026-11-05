/*
 * QA 廣告腳本替身（第 9 輪；PRD V-AD (b)、architecture §7.25.4、DS-54）。只由 tests/e2e 以 context.route 回應，不進部署目錄（DP-1）。
 * 只模擬契約 AD-8 假設的介面：覆寫 window.adsbygoogle.push、依結果對 ins.adsbygoogle 設 data-ad-status。
 * **不等於真實 AdSense 行為**（FB-73、T-106、T-107）：真實腳本的 inline height、量寬度時機、自動廣告與 CMP 都不在此模擬範圍。
 *
 * 由 init script 指定：
 *   window.__qaAdMode   "filled"（預設）｜"unfilled"｜"late-filled"（__qaAdLateMs 後才 filled，用於逾時後才到）｜"silent"（永不回結果）｜"throw"（push 拋例外）
 *   window.__qaAdDelay  回結果前的毫秒數（預設 30）
 *   window.__qaAdHeight filled 時 iframe 高度（預設 250）
 * 記錄於 window.__qaAd：runs（腳本執行次數）、pushes（每次 push 的參數 JSON）、results、setAt（設定結果的 performance.now）。
 */
(function () {
  "use strict";
  var w = window;
  var rec = w.__qaAd = w.__qaAd || { runs: 0, pushes: [], results: [], setAt: null, pending: 0 };
  rec.runs++;
  function target() {
    return document.querySelector("ins.adsbygoogle");
  }
  function respond() {
    var mode = w.__qaAdMode || "filled";
    var delay = typeof w.__qaAdDelay === "number" ? w.__qaAdDelay : 30;
    var height = typeof w.__qaAdHeight === "number" ? w.__qaAdHeight : 250;
    function setResult(status) {
      var ins = target();
      if (!ins) { return; }
      if (status === "filled") {
        var frame = document.createElement("iframe");
        frame.title = "qa-ad-stub";
        frame.style.cssText = "display:block;width:100%;height:" + height + "px;border:0";
        frame.setAttribute("srcdoc", "<!doctype html><body style='margin:0;background:#ddd'>QA stub ad</body>");
        ins.style.height = height + "px";
        ins.appendChild(frame);
      }
      ins.setAttribute("data-ad-status", status);
      rec.results.push(status);
      rec.setAt = performance.now();
    }
    if (mode === "filled") { setTimeout(function () { setResult("filled"); }, delay); }
    else if (mode === "unfilled") { setTimeout(function () { setResult("unfilled"); }, delay); }
    else if (mode === "late-filled") { setTimeout(function () { setResult("filled"); }, w.__qaAdLateMs || 11000); }
    /* silent：永不回結果 */
  }
  function push(arg) {
    rec.pushes.push(JSON.stringify(arg));
    if (w.__qaAdMode === "throw") { throw new Error("qa-stub-push-throw"); }
    respond();
    return 1;
  }
  var queued = Array.isArray(w.adsbygoogle) ? w.adsbygoogle.slice() : [];
  var api = { push: push, loaded: true };
  w.adsbygoogle = api;
  for (var i = 0; i < queued.length; i++) { api.push(queued[i]); }
})();
