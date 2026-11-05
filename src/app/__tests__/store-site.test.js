/*
 * store-site.test.js — 對外頁面返回目標與廣告版位的執行期狀態（FE-86）
 * 依據：architecture.md v0.14 §4.12、§7.25.3、§7.25.5、§10.11；契約 data-schema.ts TabId、RuntimeState.ad、
 *       RuntimeState.sitePageReturnTab、README §13.2 AD-5、AD-10、§13.3 SP-1、SP-3、SP-4、DS-50、DS-56、SD-FB-82
 * 涵蓋：AC-20-03、AC-25-07、AC-52-02、AC-53-01、AC-57-01
 * 做法：以 _fixtures.makeStore 的真實 store 與計數假 storage；router.js 與 store.js 的常數以靜態比對。
 * 斷言「只在記憶體」：所有 action 後 setItem 次數不變，且 localStorage 主鍵內容與匯出備份都不含新欄位。
 */
"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const F = require("./_fixtures.js");
const C = require(path.join(F.APP_DIR, "core", "constants.js"));
const AD = require(path.join(F.APP_DIR, "core", "ad.js"));

const MAIN_KEY = C.STORAGE_KEYS.state;

const TAB_IDS = ["dashboard", "customizer", "flashcards", "part5", "decoder", "phrasebank", "sources", "about", "contact", "privacy"];
const FIRST_RUN_TABS = ["customizer", "sources", "about", "contact", "privacy"];
const SITE_TABS = ["sources", "about", "contact", "privacy"];
const ALL_STATUSES = ["ineligible", "waiting", "loading", "filled", "collapsed", "dismissed"];

/** 目前的 runtime */
function rt(m) {
  return m.store.getState().runtime;
}

/** 由原始碼取出字串陣列常數 */
function arrayConst(rel, name) {
  const src = fs.readFileSync(path.join(F.APP_DIR, rel), "utf8");
  const m = src.match(new RegExp("var " + name + " = \\[([^\\]]*)\\];"));
  assert.ok(m, rel + " 找不到 " + name);
  return JSON.parse("[" + m[1] + "]");
}

/** 收集通知的 tags */
function recordTags(m) {
  const list = [];
  m.store.subscribe((st, tags) => list.push(tags.slice()));
  return list;
}

/** 依事件序列把版位推到指定狀態 */
function toStatus(m, status) {
  const paths = {
    ineligible: [],
    waiting: [],
    loading: ["load"],
    filled: ["load", "filled"],
    collapsed: ["collapse"],
    dismissed: ["dismiss"]
  };
  if (status !== "ineligible") m.a.initAd("waiting");
  for (const e of paths[status]) m.a.adEvent(e);
  assert.equal(rt(m).ad.status, status);
}

/** 在一般模式 store 建立學習紀錄（有紀錄、生效色級改變需要確認） */
function withLearning(opts) {
  const m = F.makeStore(opts);
  m.a.flipCard();
  assert.ok(m.store.getState().data.todayLearned.wordKeys.length > 0, "fixture 應已有學習紀錄");
  return m;
}

/** 切換生效色級，讓 confirmApplyGoal 成立 */
function pickOtherColor(m) {
  const cur = m.store.getState().data.goal.effectiveColor;
  m.a.clickColor(cur === "brown" ? "green" : "brown");
}

describe("store-site.test.js：頁面代碼（SP-1、DS-50）", () => {
  test("router 與 store 的 TAB_IDS 都是 10 個、FIRST_RUN_TABS 都是 5 個，兩處相同", () => {
    const sTabs = arrayConst("state/store.js", "TAB_IDS");
    const rTabs = arrayConst("ui/router.js", "TAB_IDS");
    assert.deepEqual(sTabs, TAB_IDS);
    assert.deepEqual(rTabs, sTabs);
    const sFirst = arrayConst("state/store.js", "FIRST_RUN_TABS");
    const rFirst = arrayConst("ui/router.js", "FIRST_RUN_TABS");
    assert.deepEqual(sFirst, FIRST_RUN_TABS);
    assert.deepEqual(rFirst, sFirst);
  });

  test("TAB_IDS = TAB_LABELS 的鍵；NAV_TAB_ORDER、HIDDEN_TAB_IDS 不變", () => {
    assert.deepEqual([...TAB_IDS].sort(), Object.keys(C.TAB_LABELS).sort());
    assert.deepEqual([...C.NAV_TAB_ORDER], ["dashboard", "customizer", "flashcards", "part5"]);
    assert.deepEqual([...C.HIDDEN_TAB_IDS], ["decoder", "phrasebank"]);
  });
});

describe("store-site.test.js：sitePageReturnTab（SP-3、§7.25.5）", () => {
  test("初始值：sitePageReturnTab = null、ad.status = ineligible（一般與首次模式）", () => {
    for (const firstRun of [false, true]) {
      const m = F.makeStore({ firstRun });
      assert.equal(rt(m).sitePageReturnTab, null);
      assert.deepEqual(rt(m).ad, { status: "ineligible" });
    }
  });

  test("單字卡 → 關於我：記下 flashcards", () => {
    const m = F.makeStore();
    m.a.setTab("flashcards");
    m.a.setTab("about");
    assert.equal(rt(m).sitePageReturnTab, "flashcards");
  });

  test("單字卡 → 關於我 → 隱私權政策 → 資料來源：不覆蓋，仍為 flashcards", () => {
    const m = F.makeStore();
    m.a.setTab("flashcards");
    for (const t of ["about", "privacy", "sources"]) {
      m.a.setTab(t);
      assert.equal(rt(m).sitePageReturnTab, "flashcards", t);
    }
  });

  test("首次畫面 → 聯絡我們：記下 customizer", () => {
    const m = F.makeStore({ firstRun: true });
    m.a.setTab("contact");
    assert.equal(rt(m).sitePageReturnTab, "customizer");
  });

  test("resetReturn：進入資料來源時為 null（啟動或模擬測驗中的 #sources，SP-6）", () => {
    const m = F.makeStore();
    m.a.setTab("sources", { resetReturn: true });
    assert.equal(rt(m).currentTab, "sources");
    assert.equal(rt(m).sitePageReturnTab, null);

    const p = F.makeStore();
    p.a.setTab("part5");
    p.a.setTab("sources", { resetReturn: true });
    assert.equal(p.store.getState().runtime.sitePageReturnTab, null);
  });

  test("resetReturn 在同一頁也清除，且通知 [\"tab\"] 1 次；無需清除時不通知", () => {
    const m = F.makeStore();
    m.a.setTab("flashcards");
    m.a.setTab("sources");
    const tags = recordTags(m);
    m.a.setTab("sources", { resetReturn: true });
    assert.equal(rt(m).sitePageReturnTab, null);
    assert.deepEqual(tags, [["tab"]]);
    m.a.setTab("sources", { resetReturn: true });
    assert.equal(tags.length, 1);
  });

  test("resetReturn 只認 true；其他值視為未指定", () => {
    const m = F.makeStore();
    m.a.setTab("part5");
    m.a.setTab("about", { resetReturn: "yes" });
    assert.equal(rt(m).sitePageReturnTab, "part5");
  });

  test("離開 4 頁 → null；重複切到同一頁不通知", () => {
    for (const t of SITE_TABS) {
      const m = F.makeStore();
      m.a.setTab("flashcards");
      m.a.setTab(t);
      const tags = recordTags(m);
      m.a.setTab(t);
      assert.deepEqual(tags, [], t);
      m.a.setTab("part5");
      assert.equal(rt(m).sitePageReturnTab, null, t);
    }
  });

  test("值永遠不是 4 頁或隱藏頁（契約 RuntimeState.sitePageReturnTab）", () => {
    const m = F.makeStore();
    for (const t of ["about", "decoder", "contact", "phrasebank", "sources", "dashboard", "privacy", "customizer", "contact"]) {
      m.a.setTab(t);
      const v = rt(m).sitePageReturnTab;
      assert.ok(v === null || (!SITE_TABS.includes(v) && !C.HIDDEN_TAB_IDS.includes(v)), t + " → " + v);
    }
  });

  test("隱藏頁與未知值忽略：currentTab、返回目標皆不變", () => {
    const m = F.makeStore();
    m.a.setTab("flashcards");
    m.a.setTab("about");
    for (const t of ["decoder", "phrasebank", "nope", undefined]) {
      m.a.setTab(t, { resetReturn: true });
      assert.equal(rt(m).currentTab, "about");
      assert.equal(rt(m).sitePageReturnTab, "flashcards");
    }
  });

  test("首次模式：5 個頁面可到、其他忽略；來回 setItem 0 次、無狀態鍵、entryMode 不變（SP-4、V-SITE-01）", () => {
    const m = F.makeStore({ firstRun: true });
    const before = m.storage.setCalls.length;
    for (const t of ["about", "contact", "privacy", "sources"]) {
      m.a.setTab(t);
      assert.equal(rt(m).currentTab, t);
      assert.equal(rt(m).sitePageReturnTab, "customizer");
      m.a.setTab("customizer");
      assert.equal(rt(m).sitePageReturnTab, null);
    }
    for (const t of ["dashboard", "flashcards", "part5"]) {
      m.a.setTab(t);
      assert.equal(rt(m).currentTab, "customizer", t);
    }
    assert.equal(rt(m).entryMode, "firstRun");
    assert.equal(m.storage.setCalls.length, before);
    assert.equal(m.storage.getItem(MAIN_KEY), null);
  });

  test("進入一般模式（開始學習）：返回目標為 null", () => {
    const m = F.makeStore({ firstRun: true });
    assert.equal(m.a.startLearning().ok, true);
    assert.equal(rt(m).currentTab, "dashboard");
    assert.equal(rt(m).sitePageReturnTab, null);
  });

  test("其他 action 保留返回目標（局部更新 runtime）", () => {
    const m = F.makeStore();
    m.a.setTab("flashcards");
    m.a.setTab("about");
    m.a.setBackupExpanded(true);
    m.a.setPwa({ online: false });
    assert.equal(rt(m).sitePageReturnTab, "flashcards");
  });
});

describe("store-site.test.js：initAd、adEvent（AD-4、AD-5）", () => {
  test("initAd(\"waiting\")：通知 [\"ad\"] 1 次、setItem 0 次；只生效 1 次", () => {
    const m = F.makeStore();
    const before = m.storage.setCalls.length;
    const tags = recordTags(m);
    assert.deepEqual(m.a.initAd("waiting"), { changed: true });
    assert.equal(rt(m).ad.status, "waiting");
    assert.deepEqual(tags, [["ad"]]);
    m.a.adEvent("load");
    assert.deepEqual(m.a.initAd("waiting"), { changed: false });
    assert.equal(rt(m).ad.status, "loading");
    assert.equal(tags.length, 2);
    assert.equal(m.storage.setCalls.length, before);
  });

  test("initAd(\"ineligible\")：不改變、不通知，且佔用這 1 次（環境判定一頁一次，AD-4）", () => {
    const m = F.makeStore();
    const tags = recordTags(m);
    assert.deepEqual(m.a.initAd("ineligible"), { changed: false });
    assert.deepEqual(m.a.initAd("waiting"), { changed: false });
    assert.equal(rt(m).ad.status, "ineligible");
    assert.deepEqual(tags, []);
  });

  test("initAd 其他值一律忽略，不佔用這 1 次", () => {
    const m = F.makeStore();
    for (const v of ["loading", "filled", "collapsed", "dismissed", "", null, undefined, 1, {}]) {
      assert.deepEqual(m.a.initAd(v), { changed: false }, String(v));
    }
    assert.equal(rt(m).ad.status, "ineligible");
    assert.deepEqual(m.a.initAd("waiting"), { changed: true });
  });

  test("首次模式也可 initAd（setItem 0 次、無狀態鍵）", () => {
    const m = F.makeStore({ firstRun: true });
    m.a.initAd("waiting");
    assert.equal(rt(m).ad.status, "waiting");
    assert.deepEqual(m.storage.setCalls, []);
    assert.equal(m.storage.getItem(MAIN_KEY), null);
  });

  test("adEvent 依轉移表（全組合與 core/ad.transition 一致）；有改變才通知 [\"ad\"]；setItem 0 次（AD-5）", () => {
    const events = ["load", "filled", "collapse", "dismiss", "nope", "", null, undefined];
    for (const status of ALL_STATUSES) {
      for (const ev of events) {
        const m = F.makeStore();
        toStatus(m, status);
        const before = m.storage.setCalls.length;
        const tags = recordTags(m);
        const r = m.a.adEvent(ev);
        const expected = AD.transition(status, ev);
        const label = status + " + " + ev;
        assert.equal(rt(m).ad.status, expected, label);
        assert.deepEqual(r, { changed: expected !== status }, label);
        assert.deepEqual(tags, expected !== status ? [["ad"]] : [], label);
        assert.equal(m.storage.setCalls.length, before, label);
      }
    }
  });

  test("狀態表逐列（README §13.2）：終態不回頭", () => {
    const m = F.makeStore();
    m.a.initAd("waiting");
    m.a.adEvent("load");
    m.a.adEvent("filled");
    assert.equal(rt(m).ad.status, "filled");
    assert.deepEqual(m.a.adEvent("collapse"), { changed: false });
    m.a.adEvent("dismiss");
    assert.equal(rt(m).ad.status, "dismissed");
    for (const e of ["load", "filled", "collapse", "dismiss"]) {
      assert.deepEqual(m.a.adEvent(e), { changed: false }, e);
    }
    assert.equal(rt(m).ad.status, "dismissed");
  });

  test("ad 以新物件取代（呼叫端不可修改舊 state）；切頁不影響 ad", () => {
    const m = F.makeStore();
    m.a.initAd("waiting");
    const old = rt(m).ad;
    m.a.adEvent("load");
    assert.notEqual(rt(m).ad, old);
    assert.equal(old.status, "waiting");
    m.a.setTab("about");
    m.a.setTab("part5");
    assert.equal(rt(m).ad.status, "loading");
  });
});

describe("store-site.test.js：AD-10 隱藏", () => {
  test("(a) confirmApplyGoal 成功 → 各狀態依轉移表轉 dismissed，同一次通知含 \"ad\"", () => {
    for (const status of ["waiting", "loading", "filled"]) {
      const m = withLearning();
      toStatus(m, status);
      pickOtherColor(m);
      const tags = recordTags(m);
      assert.equal(m.a.confirmApplyGoal().ok, true, status);
      assert.equal(rt(m).ad.status, "dismissed", status);
      assert.equal(tags.length, 1, status + " 只通知 1 次");
      assert.ok(tags[0].includes("ad"), status);
    }
  });

  test("(a) 終態與 ineligible 維持原狀態且不加 \"ad\" tag（AD-5）", () => {
    for (const status of ["ineligible", "collapsed", "dismissed"]) {
      const m = withLearning();
      toStatus(m, status);
      pickOtherColor(m);
      const tags = recordTags(m);
      assert.equal(m.a.confirmApplyGoal().ok, true, status);
      assert.equal(rt(m).ad.status, status);
      assert.ok(!tags[0].includes("ad"), status);
    }
  });

  test("(a) 寫入失敗（quota、一般例外）：資料未改變，版位不隱藏（SD-FB-82）", () => {
    for (const flag of ["quota", "otherError"]) {
      const m = withLearning();
      toStatus(m, "filled");
      pickOtherColor(m);
      m.storage[flag] = true;
      assert.equal(m.a.confirmApplyGoal().ok, false, flag);
      assert.equal(rt(m).ad.status, "filled", flag);
    }
  });

  test("(a) storage 停用（不寫入、記憶體取代）也隱藏", () => {
    // 以 unavailable 啟動必為首次模式；開始學習後進入一般模式，storage 仍停用
    const u = F.makeStore({ storage: unavailableStorage() });
    assert.equal(u.store.getState().runtime.storageStatus, "unavailable");
    u.a.startLearning();
    u.a.flipCard();
    u.a.initAd("waiting");
    pickOtherColor(u);
    const r = u.a.confirmApplyGoal();
    assert.deepEqual(r, { ok: true, write: "disabled" });
    assert.equal(u.store.getState().runtime.ad.status, "dismissed");
  });

  test("(b) 匯入後無學習紀錄 → dismissed，同一次通知含 \"ad\"", async () => {
    const clean = F.makeStore().a.exportBackup().json;
    const m = withLearning();
    toStatus(m, "filled");
    const tags = recordTags(m);
    const r = await m.a.importBackup(clean, () => true);
    assert.equal(r.ok, true);
    assert.equal(rt(m).ad.status, "dismissed");
    assert.equal(tags.length, 1);
    assert.ok(tags[0].includes("ad"));
  });

  test("(b) 匯入後仍有學習紀錄 → 版位維持、無 \"ad\" tag", async () => {
    const learned = withLearning().a.exportBackup().json;
    const m = withLearning();
    toStatus(m, "filled");
    const tags = recordTags(m);
    assert.equal((await m.a.importBackup(learned, () => true)).ok, true);
    assert.equal(rt(m).ad.status, "filled");
    assert.ok(!tags[0].includes("ad"));
  });

  test("(b) 取消、格式錯誤、寫入失敗：版位不變", async () => {
    const clean = F.makeStore().a.exportBackup().json;
    const m = withLearning();
    toStatus(m, "waiting");
    assert.equal((await m.a.importBackup(clean, () => false)).ok, false);
    assert.equal((await m.a.importBackup("{bad", () => true)).ok, false);
    m.storage.quota = true;
    assert.equal((await m.a.importBackup(clean, () => true)).ok, false);
    assert.equal(rt(m).ad.status, "waiting");
  });

  test("(b) 首次還原成功同樣經 importBackup：無紀錄 → dismissed；有紀錄 → 維持 waiting", async () => {
    const clean = F.makeStore().a.exportBackup().json;
    const learned = withLearning().a.exportBackup().json;
    const a = F.makeStore({ firstRun: true });
    a.a.initAd("waiting");
    await a.a.importBackup(clean, () => true);
    assert.equal(rt(a).entryMode, "main");
    assert.equal(rt(a).ad.status, "dismissed");
    assert.equal(rt(a).sitePageReturnTab, null);
    const b = F.makeStore({ firstRun: true });
    b.a.initAd("waiting");
    await b.a.importBackup(learned, () => true);
    assert.equal(rt(b).entryMode, "main");
    assert.equal(rt(b).ad.status, "waiting");
  });

  test("(c) 清除答對紀錄不觸發：版位維持，無 \"ad\" tag", () => {
    const m = withLearning();
    toStatus(m, "filled");
    const tags = recordTags(m);
    m.a.clearPart5CorrectIds();
    assert.equal(rt(m).ad.status, "filled");
    assert.ok(tags.every((t) => !t.includes("ad")));
  });

  test("(d) dismissed 之後再產生學習紀錄：本頁仍隱藏", () => {
    const m = withLearning();
    toStatus(m, "filled");
    pickOtherColor(m);
    m.a.confirmApplyGoal();
    assert.equal(rt(m).ad.status, "dismissed");
    m.a.flipCard();
    m.a.flipCard();
    assert.ok(m.store.getState().data.todayLearned.wordKeys.length > 0);
    assert.equal(rt(m).ad.status, "dismissed");
    assert.equal(m.a.initAd("waiting").changed, false);
    assert.equal(m.a.adEvent("load").changed, false);
    assert.equal(rt(m).ad.status, "dismissed");
  });
});

describe("store-site.test.js：不持久化（DS-56、AD-5、SP-5）", () => {
  test("主鍵寫入與匯出備份都不含 ad、sitePageReturnTab；資料欄位集合不變", () => {
    const m = withLearning();
    m.a.initAd("waiting");
    m.a.adEvent("load");
    m.a.setTab("flashcards");
    m.a.setTab("about");
    m.a.flipCard(); // 觸發一次寫入
    const raw = m.storage.getItem(MAIN_KEY);
    assert.ok(raw);
    for (const w of ["sitePageReturnTab", "\"ad\"", "adStatus"]) {
      assert.ok(!raw.includes(w), "主鍵不得含 " + w);
    }
    const rec = JSON.parse(raw);
    assert.equal(rec.schemaVersion, C.CURRENT_SCHEMA_VERSION);
    assert.equal(rec.schemaVersion, 3);
    const backup = JSON.parse(m.a.exportBackup().json);
    assert.equal(backup.schemaVersion, 3);
    assert.deepEqual(Object.keys(backup.data).sort(), Object.keys(rec.data).sort());
    assert.ok(!Object.keys(backup.data).includes("sitePageReturnTab"));
    assert.ok(!Object.keys(backup.data).includes("ad"));
  });

  test("重新建立 store（模擬重新載入）：返回目標與版位都回到初始值", () => {
    const m = withLearning();
    m.a.initAd("waiting");
    m.a.setTab("part5");
    m.a.setTab("about");
    m.a.flipCard();
    const again = F.makeStore({ storage: m.storage });
    assert.equal(rt(again).sitePageReturnTab, null);
    assert.equal(rt(again).ad.status, "ineligible");
    assert.equal(rt(again).currentTab, "dashboard");
  });

  test("localStorage 鍵名只有主鍵（切頁與廣告事件不新增鍵）", () => {
    const m = F.makeStore();
    m.a.initAd("waiting");
    m.a.adEvent("collapse");
    m.a.setTab("about");
    m.a.setTab("dashboard");
    assert.deepEqual([...m.storage.map.keys()], [MAIN_KEY]);
  });
});

/** 存取即拋例外的 storage（AC-18-03 停用情境） */
function unavailableStorage() {
  return {
    getItem() { throw new Error("SecurityError"); },
    setItem() { throw new Error("SecurityError"); }
  };
}
