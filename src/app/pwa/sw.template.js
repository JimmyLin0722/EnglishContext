/*
 * sw.js — English Master Track 的 service worker（FE-46）
 * 由 tools/build.mjs 依本範本（src/app/pwa/sw.template.js）產生，寫入部署目錄根；本範本不打包進 HTML，
 * 也不被 src/app 其他模組讀取（D-12）。建置只替換下方「設定」區的兩個佔位（建置識別碼、預先快取清單），
 * 程式結構全部在本範本內（範本位元組直接納入建置識別碼的雜湊，architecture.md §7.18.2）。
 * 依據：architecture.md v0.7 §7.18.3、§5.1 B-15；契約 README §10.6 SW-1～SW-11、§10.7 UP-1、UP-7、§10.10 PV-2、PV-5
 * 涵蓋：AC-21-03、AC-35-01、AC-35-02、AC-35-03、AC-35-05、AC-36-03、AC-36-05、AC-36-06、AC-37-05
 *
 * 行為：
 * - 安裝：開啟本版快取，向伺服器（不取瀏覽器 HTTP 快取）取得預先快取清單中 index.html 等 6 項；每個回應須成功（200、
 *   非轉址）才寫入；index.html 的回應以 clone() 同時寫入 "./" 與 "./index.html" 兩鍵（兩鍵位元組相同）。
 *   任一項失敗 → 刪除本版快取並讓安裝失敗，不留下部分快取；安裝期間不自行跳過等待。
 * - 啟用：刪除名稱以本專案前綴開頭、且不是本版的舊快取（其他前綴的快取不讀、不改、不刪），再接管目前頁面。
 * - 取用：只攔截「GET、去掉 hash 後恰為預先快取清單某一項」的請求（查詢字串必須相同；同源由絕對網址比對保證），
 *   只從本版快取以網址比對；未命中 → 直接向網路轉送，結果不寫入快取。其他請求一律不攔截。
 * - 訊息：只接受恰為 { type: "SKIP_WAITING" } 的物件（不得有其他鍵），收到後跳過等待；不對頁面送出任何訊息。
 * - 只處理安裝、啟用、取用、訊息 4 種事件；不使用背景同步、推播、其他儲存或任何外部腳本，不讀寫學習資料。
 */
"use strict";

// ── 設定（唯一由建置改值的地方）──
var BUILD_ID = "@@BUILD_ID@@";
var CACHE_PREFIX = "english-master-track-pwa-";
var CACHE_NAME = CACHE_PREFIX + BUILD_ID;
var PRECACHE_URLS = [/* @@PRECACHE_URLS@@ */];

// ── 網址表：以本檔網址解析預先快取清單（SW-6）──
var PRECACHE_ABS = PRECACHE_URLS.map(function (u) {
  return new URL(u, self.location.href).href;
});

/** 首頁的兩個快取鍵：只請求 "./index.html"，再以 clone() 寫入 "./"（SW-4） */
var PAGE_URL = "./index.html";
var ROOT_URL = "./";

/** 回應是否可寫入快取：ok、狀態 200、非轉址（SW-4） */
function isGood(res) {
  return !!res && res.ok === true && res.status === 200 && res.redirected !== true;
}

/**
 * 預先快取（SW-4）：全部成功才依序寫入；任何失敗 → 刪除本版快取後讓 Promise 拒絕（AC-35-05）。
 * @returns {Promise<void>}
 */
function precache() {
  return caches.open(CACHE_NAME).then(function (cache) {
    var targets = PRECACHE_URLS.filter(function (u) { return u !== ROOT_URL; });
    return Promise.all(targets.map(function (u) {
      return fetch(new Request(u, { cache: "reload" })).then(function (res) {
        if (!isGood(res)) { throw new Error("precache: " + u); }
        return { url: u, res: res };
      });
    })).then(function (list) {
      var puts = [];
      list.forEach(function (item) {
        if (item.url === PAGE_URL) {
          // 先 clone 再寫入原回應，兩鍵內容逐位元組相同
          puts.push(cache.put(ROOT_URL, item.res.clone()));
        }
        puts.push(cache.put(item.url, item.res));
      });
      return Promise.all(puts);
    });
  }).then(function () {
    return undefined;
  }, function (err) {
    return caches.delete(CACHE_NAME).then(function () { throw err; }, function () { throw err; });
  });
}

/**
 * 清除舊的本專案快取（SW-9）：以前綴開頭且不等於本版名稱者刪除；其他快取不動。
 * @returns {Promise<void>}
 */
function removeOldCaches() {
  return caches.keys().then(function (names) {
    return Promise.all(names.filter(function (n) {
      return typeof n === "string" && n.indexOf(CACHE_PREFIX) === 0 && n !== CACHE_NAME;
    }).map(function (n) {
      return caches.delete(n);
    }));
  });
}

/**
 * 請求網址去掉 hash 後的絕對網址；在預先快取清單內才回傳，否則回 null（SW-6）。
 * @param {string} url
 * @returns {string|null}
 */
function precacheKeyOf(url) {
  var u;
  try {
    u = new URL(url);
  } catch (e) {
    return null;
  }
  u.hash = "";
  var key = u.href;
  return PRECACHE_ABS.indexOf(key) >= 0 ? key : null;
}

self.addEventListener("install", function (event) {
  // 安裝期間不跳過等待（SW-4）；由使用者按「重新整理」才換版（UP-4、UP-7）
  event.waitUntil(precache());
});

self.addEventListener("activate", function (event) {
  event.waitUntil(removeOldCaches().then(function () {
    return self.clients.claim();
  }));
});

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (!req || req.method !== "GET") { return; }
  var key = precacheKeyOf(req.url);
  if (key === null) { return; }
  event.respondWith(caches.open(CACHE_NAME).then(function (cache) {
    return cache.match(key, { ignoreVary: true });
  }).then(function (hit) {
    // 未命中直接轉送，結果不寫入快取（SW-6、SW-7）
    return hit || fetch(req);
  }, function () {
    return fetch(req);
  }));
});

self.addEventListener("message", function (event) {
  var data = event ? event.data : null;
  if (data === null || typeof data !== "object" || Array.isArray(data)) { return; }
  var keys = Object.keys(data);
  if (keys.length !== 1 || keys[0] !== "type" || data.type !== "SKIP_WAITING") { return; }
  var p = self.skipWaiting();
  if (p && typeof p.then === "function") { p.then(null, function () {}); }
});
