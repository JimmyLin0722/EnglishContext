/*
 * flashcards.test.js — 抽認卡頁顯示邏輯單元測試（FE-11 測試移入，FE-19）
 * 受測：views/flashcards.js 匯出的純邏輯（cardModel、attributionLines、posText、counterModel）；
 *       搭配 state/store.js 產生的 AppState 驗證 §4.4 的 state.runtime.flashcard 結構
 * 依據：architecture.md v0.3 §4.3、§4.4（AppState = { data, runtime }，抽認卡狀態在 state.runtime.flashcard）
 * 涵蓋：AC-04-08、AC-06-01、AC-06-02、AC-06-04、AC-06-06、AC-06-07、AC-23-01、AC-24-07、C-6
 * 資料：一律使用 _fixtures.js（不讀正式內容資料檔）
 */
"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");

const L = require("../views/flashcards.js");
const K = require("../core/constants.js");
const F = require("./_fixtures.js");

describe("flashcards.test.js", () => {
  const REG = F.registry();
  const opt = { posLabels: K.POS_LABELS, registry: REG };

  /** 以 fixture 內建字建立 StudyCard */
  function builtinCard(word) {
    const item = F.builtin().find((x) => x.word === word);
    assert.ok(item, "fixture 缺少 " + word);
    return { kind: "builtin", wordKey: word.toLowerCase(), item: item };
  }

  const the = builtinCard("the");                // NGSL、ECDICT、學術情境 ""
  const multi = builtinCard("address");          // TSL + BSL、v. n.
  const cafe = builtinCard("café");              // meaningSource ORIGINAL
  const cust = {
    kind: "custom",
    wordKey: "monetization",
    item: {
      id: "c_1", word: "Monetization", meaning: "營利化", phonetic: "", pos: "", collocation: "", example: "",
      academicContext: "", origin: "manual", templateId: null, createdAt: "2026-10-29T00:00:00Z"
    }
  };
  const xss = { kind: "custom", wordKey: "x", item: Object.assign({}, cust.item, { word: "<img src=x onerror=alert(1)>", pos: "n." }) };

  /** 顯示模型中不得出現 undefined／null 字樣（templateId 的 null 除外） */
  function noBad(m) {
    const s = JSON.stringify(m);
    assert.ok(!/undefined|null/.test(s.replace(/"(templateId)":null/g, "")), s);
  }

  test("內建空學術情境整欄隱藏；詞性用 POS_LABELS（AC-06-07）", () => {
    const m = L.cardModel(the, opt);
    assert.deepEqual(m.back.map((f) => f.key), ["pos", "meaning", "example"]);
    assert.equal(m.back[0].value, "art. 冠詞");
    assert.equal(m.front[0].label, "多益常考搭配詞");
    noBad(m);
  });

  test("內建出處 AC-23-01 與範例逐字一致", () => {
    assert.deepEqual(L.attributionLines(the, REG), ["單字來源：NGSL 1.2（CC BY-SA 4.0）", "音標：原創；釋義：ECDICT（MIT，已修改）"]);
    assert.deepEqual(L.attributionLines(cafe, REG), ["單字來源：BSL 1.2（CC BY-SA 4.0）", "音標：原創；釋義：原創"]);
    assert.equal(L.attributionLines(multi, REG)[0], "單字來源：TSL 1.2（CC BY-SA 4.0）、BSL 1.2（CC BY-SA 4.0）");
    assert.equal(L.posText(multi, K.POS_LABELS), "v. 動詞、n. 名詞");
    assert.ok(L.cardModel(multi, opt).back.some((f) => f.key === "academicContext"));
  });

  test("字首詞性 pref. 顯示「字首」（FB-25、README M-8 v0.7）", () => {
    const only = { kind: "builtin", wordKey: "non", item: { word: "non", pos: ["pref."] } };
    const mixed = { kind: "builtin", wordKey: "ex", item: { word: "ex", pos: ["n.", "prep.", "pref."] } };
    assert.equal(L.posText(only, K.POS_LABELS), "pref. 字首");
    assert.equal(L.posText(mixed, K.POS_LABELS), "n. 名詞、prep. 介系詞、pref. 字首");
  });

  test("出處由登錄推導（改登錄即改文字）", () => {
    const reg2 = REG.map((e) => (e.code === "ECDICT" ? Object.assign({}, e, { name: "DICTX", licenseName: "BSD" }) : e));
    assert.equal(L.attributionLines(the, reg2)[1], "音標：原創；釋義：DICTX（BSD，已修改）");
    assert.deepEqual(L.attributionLines(the, []), ["單字來源：NGSL", "音標：原創；釋義：ECDICT"]);
  });

  test("自訂卡：空白欄顯示 —、出處自訂擴充；XSS 字串原樣當文字（AC-06-07、AC-24-07）", () => {
    const m = L.cardModel(cust, opt);
    assert.equal(m.phonetic, "—");
    assert.deepEqual(m.back.map((f) => [f.key, f.value]), [["pos", "—"], ["meaning", "營利化"], ["academicContext", "—"], ["example", "—"]]);
    assert.equal(m.front[0].value, "—");
    assert.deepEqual(m.attribution, ["自訂擴充"]);
    noBad(m);
    assert.equal(L.cardModel(xss, opt).word, "<img src=x onerror=alert(1)>");
    assert.equal(L.posText(xss, K.POS_LABELS), "n.");
  });

  test("欄位缺漏不出現 undefined／null；單字 null 照常顯示（C-6、V-VOC-10）", () => {
    noBad(L.cardModel({ kind: "builtin", wordKey: "a", item: { word: "a" } }, opt));
    noBad(L.cardModel({ kind: "custom", wordKey: "b", item: { word: "b", meaning: null, pos: undefined } }, {}));
    assert.equal(L.cardModel(builtinCard("null"), opt).word, "null");
  });

  test("計數與頭尾（AC-06-04）", () => {
    assert.deepEqual(L.counterModel(0, 3), { total: "共 3 張", position: "第 1 / 3 張", hasPrev: false, hasNext: true });
    assert.deepEqual(L.counterModel(2, 3), { total: "共 3 張", position: "第 3 / 3 張", hasPrev: true, hasNext: false });
    assert.deepEqual(L.counterModel(0, 1), { total: "共 1 張", position: "第 1 / 1 張", hasPrev: false, hasNext: false });
    assert.deepEqual(L.counterModel(0, 0), { total: "共 0 張", position: "", hasPrev: false, hasNext: false });
  });

  test("AppState 結構：抽認卡狀態在 state.runtime.flashcard（§4.3、§4.4 v0.3）", () => {
    const { store } = F.makeStore();
    const st = store.getState();
    assert.deepEqual(Object.keys(st).sort(), ["data", "runtime"]);
    assert.equal(st.flashcard, undefined, "不得有扁平的 state.flashcard");
    assert.deepEqual(Object.keys(st.runtime.flashcard).sort(), ["index", "isFlipped", "mode", "quiz"]);
    assert.deepEqual(st.runtime.flashcard, { index: 0, isFlipped: false, mode: "card", quiz: null });
    const c = L.counterModel(st.runtime.flashcard.index, st.runtime.studySet.length);
    assert.equal(c.total, "共 8 張");
    assert.equal(c.position, "第 1 / 8 張");
  });

  test("store 單字集中每張卡都能組出完整畫面（fixture 內建 8 張）", () => {
    const { store } = F.makeStore();
    const set = store.getState().runtime.studySet;
    assert.equal(set.length, 8);
    for (const card of set) {
      const m = L.cardModel(card, opt);
      assert.ok(m.word, card.wordKey);
      assert.ok(m.back.some((f) => f.key === "meaning"), card.wordKey);
      assert.equal(m.attribution.length, 2, card.wordKey);
      if (card.wordKey !== "null") noBad(m);
    }
  });

  test("刪除目前顯示的自訂字：顯示原本下一張；最後一張則前一張（AC-04-08）", () => {
    const { a, store } = F.makeStore();
    const x = a.addCustomWord(F.customFields("Xenon", "氙")).item;
    const y = a.addCustomWord(F.customFields("Yield", "產量")).item;
    a.gotoCard(8);
    assert.equal(store.getState().runtime.studySet[8].wordKey, "xenon");

    a.deleteCustomWord(x.id);
    let st = store.getState();
    let fc = st.runtime.flashcard;
    assert.equal(st.runtime.studySet[fc.index].wordKey, "yield");
    assert.equal(L.counterModel(fc.index, st.runtime.studySet.length).position, "第 9 / 9 張");

    a.deleteCustomWord(y.id);
    st = store.getState();
    fc = st.runtime.flashcard;
    assert.equal(st.runtime.studySet[fc.index].wordKey, "hypothesis");
    assert.deepEqual(L.counterModel(fc.index, st.runtime.studySet.length),
      { total: "共 8 張", position: "第 8 / 8 張", hasPrev: true, hasNext: false });
  });

  test("刪到單字集為空 → 計數為空狀態（AC-04-08、AC-06-06）", () => {
    const content = F.loadContent({ MASTER_VOCAB_DATABASE: [], VOCAB_MANIFEST: undefined });
    const { a, store } = F.makeStore({ content: content });
    const only = a.addCustomWord(F.customFields("Solo", "唯一")).item;
    assert.equal(store.getState().runtime.studySet.length, 1);
    a.deleteCustomWord(only.id);
    const st = store.getState();
    assert.equal(st.runtime.studySet.length, 0);
    assert.equal(st.runtime.flashcard.index, 0);
    assert.deepEqual(L.counterModel(st.runtime.flashcard.index, st.runtime.studySet.length),
      { total: "共 0 張", position: "", hasPrev: false, hasNext: false });
  });

  // ─── FE-28：手勢與動畫（architecture.md v0.4 §7.10～§7.12、§10.1） ───

  const IA = require("../core/interaction.js");
  const fs = require("node:fs");
  const path = require("node:path");

  test("swipeDecision：中間卡左滑下一張、右滑上一張（AC-28-03）", () => {
    assert.deepEqual(L.swipeDecision("card", 3, 8, -80, 5), { action: "goto", index: 4 });
    assert.deepEqual(L.swipeDecision("card", 3, 8, 80, -5), { action: "goto", index: 2 });
    // 恰 50 算滑動
    assert.deepEqual(L.swipeDecision("card", 3, 8, -50, 0), { action: "goto", index: 4 });
    assert.deepEqual(L.swipeDecision("card", 3, 8, 50, 0), { action: "goto", index: 2 });
  });

  test("swipeDecision：首張右滑、末張左滑不動；單張卡不動（AC-28-04、E-26）", () => {
    assert.deepEqual(L.swipeDecision("card", 0, 8, 120, 0), { action: "none" });
    assert.deepEqual(L.swipeDecision("card", 7, 8, -120, 0), { action: "none" });
    assert.deepEqual(L.swipeDecision("card", 0, 1, -120, 0), { action: "none" });
    assert.deepEqual(L.swipeDecision("card", 0, 1, 120, 0), { action: "none" });
    assert.deepEqual(L.swipeDecision("card", 0, 0, -120, 0), { action: "none" });
    // 首張仍可左滑、末張仍可右滑
    assert.deepEqual(L.swipeDecision("card", 0, 8, -120, 0), { action: "goto", index: 1 });
    assert.deepEqual(L.swipeDecision("card", 7, 8, 120, 0), { action: "goto", index: 6 });
  });

  test("swipeDecision：位移 49、垂直為主、|dx| = |dy| 不換卡（AC-28-05）", () => {
    assert.deepEqual(L.swipeDecision("card", 3, 8, -49, 0), { action: "none" });
    assert.deepEqual(L.swipeDecision("card", 3, 8, 49, 0), { action: "none" });
    assert.deepEqual(L.swipeDecision("card", 3, 8, -60, 200), { action: "none" });
    assert.deepEqual(L.swipeDecision("card", 3, 8, 70, -70), { action: "none" });
    assert.deepEqual(L.swipeDecision("card", 3, 8, 0, 0), { action: "none" });
    assert.deepEqual(L.swipeDecision("card", 3, 8, NaN, 0), { action: "none" });
  });

  test("swipeDecision：測驗模式一律 none（AC-28-06、E-42）", () => {
    for (const [dx, dy] of [[-200, 0], [200, 0], [-50, 0], [0, 0]]) {
      assert.deepEqual(L.swipeDecision("quiz", 3, 8, dx, dy), { action: "none" });
    }
    assert.deepEqual(L.swipeDecision(undefined, 3, 8, -200, 0), { action: "none" });
  });

  test("觸控位移判斷：任一軸 ≥ TAP_SLOP_PX（10）算已位移", () => {
    assert.equal(IA.UI.TAP_SLOP_PX, 10);
    assert.equal(L.movedBeyondSlop(9, 9), false);
    assert.equal(L.movedBeyondSlop(10, 0), true);
    assert.equal(L.movedBeyondSlop(0, -10), true);
    assert.equal(L.movedBeyondSlop(-3, 2), false);
    assert.equal(L.movedBeyondSlop("12", 0), false);
  });

  test("suppressClick 時間窗：位移後 350 ms 內的 click 忽略，未位移不忽略（AC-28-05）", () => {
    assert.equal(IA.UI.CLICK_SUPPRESS_MS, 350);
    const until = L.suppressUntilAfter(true, 1000);
    assert.equal(until, 1350);
    assert.equal(L.suppressClick(1000, until), true);
    assert.equal(L.suppressClick(1349, until), true);
    assert.equal(L.suppressClick(1350, until), false);
    assert.equal(L.suppressClick(2000, until), false);
    // 未位移（tap）→ 不抑制，點擊照常翻面
    const tap = L.suppressUntilAfter(false, 1000);
    assert.equal(tap, 0);
    assert.equal(L.suppressClick(1001, tap), false);
    assert.equal(L.suppressClick(undefined, until), false);
  });

  test("換卡滑入方向：索引增加 in-next、減少 in-prev、不變或先前非卡片不播放", () => {
    assert.equal(L.slideClassFor(2, 3), "fc-card--in-next");
    assert.equal(L.slideClassFor(3, 2), "fc-card--in-prev");
    assert.equal(L.slideClassFor(3, 3), null);
    assert.equal(L.slideClassFor(null, 0), null);
    assert.equal(L.slideClassFor(undefined, 1), null);
  });

  // 極簡假元素與假 motion（記錄呼叫並以 classList 模擬加上／移除）
  function fakeEl(name) {
    const attrs = {};
    const cls = new Set();
    return {
      name: name,
      hidden: false,
      classList: { add: (c) => cls.add(c), remove: (c) => cls.delete(c), contains: (c) => cls.has(c) },
      setAttribute: (k, v) => { attrs[k] = String(v); },
      getAttribute: (k) => (k in attrs ? attrs[k] : null),
      _cls: cls
    };
  }
  function fakeCard() {
    const root = fakeEl("root");
    root.setAttribute("data-flipped", "false");
    const front = fakeEl("front");
    const back = fakeEl("back");
    back.hidden = true;
    root.children = [front, back];
    return { root: root, front: front, back: back };
  }
  function fakeMotion() {
    const calls = [];
    return {
      calls: calls,
      enter(el, c, ms) { calls.push(["enter", el.name, c, ms]); el.classList.remove(c); el.classList.add(c); return true; },
      cancel(el, c) { calls.push(["cancel", el.name, c]); el.classList.remove(c); }
    };
  }

  test("翻卡只切 hidden 與動畫 class、不重建卡片（AC-28-01）", () => {
    const card = fakeCard();
    const { root, front, back } = card;
    const kids = root.children.slice();
    const m = fakeMotion();
    assert.equal(L.applyFlipTo(card, true, m, true), true);
    assert.equal(card.root, root);
    assert.deepEqual(root.children, kids, "子節點不變");
    assert.equal(front.hidden, true);
    assert.equal(back.hidden, false);
    assert.equal(root.getAttribute("data-flipped"), "true");
    assert.ok(back.classList.contains(L.FLIP_IN_CLASS));
    assert.ok(!front.classList.contains(L.FLIP_IN_CLASS));
    assert.deepEqual(m.calls, [["cancel", "front", "fc-face--flip-in"], ["enter", "back", "fc-face--flip-in", IA.UI.FLIP_ANIM_MS]]);
    assert.equal(L.FLIP_IN_CLASS, "fc-face--flip-in");
  });

  test("動畫中連點兩次 → 停在正面、只有正面有翻轉 class、兩面不同時可見（AC-28-08）", () => {
    const card = fakeCard();
    const m = fakeMotion();
    L.applyFlipTo(card, true, m, true);
    L.applyFlipTo(card, false, m, true);
    assert.equal(card.front.hidden, false);
    assert.equal(card.back.hidden, true);
    assert.equal(card.root.getAttribute("data-flipped"), "false");
    assert.ok(card.front.classList.contains(L.FLIP_IN_CLASS));
    assert.ok(!card.back.classList.contains(L.FLIP_IN_CLASS));
  });

  test("翻面狀態未變、animate 為假或 motion 不存在 → 不播放動畫但照樣切換", () => {
    const card = fakeCard();
    const m = fakeMotion();
    assert.equal(L.applyFlipTo(card, false, m, true), false);
    assert.equal(m.calls.length, 0);
    assert.equal(L.applyFlipTo(card, true, m, false), true);
    assert.equal(m.calls.length, 0);
    assert.equal(card.back.hidden, false);
    assert.equal(L.applyFlipTo(card, false, null, true), true);
    assert.equal(card.front.hidden, false);
    assert.equal(L.applyFlipTo(null, true, m, true), false);
  });

  test("CSS：動畫時長使用變數、卡片 touch-action: pan-y；程式無禁用 API、無動畫結束事件、touch 監聽為 passive", () => {
    const APP = path.join(__dirname, "..");
    const css = fs.readFileSync(path.join(APP, "styles", "30-flashcards.css"), "utf8");
    assert.match(css, /@keyframes fc-flip-in\s*\{[\s\S]*?rotateY\(-90deg\)[\s\S]*?rotateY\(0\)/);
    assert.match(css, /\.fc-face--flip-in\s*\{[^}]*animation:\s*fc-flip-in var\(--emt-dur-flip\)/);
    assert.match(css, /\.fc-card--in-next\s*\{[^}]*var\(--emt-dur-slide\)/);
    assert.match(css, /\.fc-card--in-prev\s*\{[^}]*var\(--emt-dur-slide\)/);
    assert.match(css, /\.fc-card\s*\{[^}]*touch-action:\s*pan-y/);
    // 動畫時長不得寫死數字（A-4 單一來源）
    assert.doesNotMatch(css, /animation:[^;]*\b\d+m?s\b/);
    const js = fs.readFileSync(path.join(APP, "views", "flashcards.js"), "utf8");
    for (const bad of ["innerHTML", "outerHTML", "insertAdjacentHTML", "document.write", "Math.random", "animationend", "preventDefault"]) {
      assert.ok(!js.includes(bad), "不得出現 " + bad);
    }
    const touchAdds = js.match(/addEventListener\("touch\w+", \w+, passive\)/g) || [];
    assert.equal(touchAdds.length, 4);
    assert.match(js, /var passive = \{ passive: true \};/);
    assert.ok(!/addEventListener\("(mouse|pointer)/.test(js), "不綁滑鼠／Pointer 拖曳");
  });

  test("測驗模式不足提示文字與 AC-09-06 逐字相同", () => {
    assert.equal(L.INSUFFICIENT_MESSAGE, "單字數不足 4 個，無法產生選項");
    const content = F.loadContent({ MASTER_VOCAB_DATABASE: [], VOCAB_MANIFEST: undefined });
    const { a, store } = F.makeStore({ content: content });
    ["Alpha:甲", "Beta:乙", "Gamma:丙"].forEach((p) => a.addCustomWord(F.customFields(...p.split(":"))));
    assert.deepEqual(a.setFlashcardMode("quiz"), { ok: false, reason: "insufficient" });
    assert.equal(store.getState().runtime.flashcard.mode, "card");
  });

  // ── v0.5（FE-39）：離開單字卡頁釋放麥克風（§4.4、§7.14、§10.2「flashcards.test.js」列；AC-33-02） ──

  /** 以 vm 沙箱載入 views/flashcards.js（瀏覽器分支），取得登錄的頁面物件 */
  function loadFlashcardsView(speechPanel) {
    const vm = require("node:vm");
    const sandbox = { console: console };
    sandbox.self = sandbox;
    sandbox.window = sandbox;
    vm.createContext(sandbox);
    let registered = null;
    sandbox.EMT = {
      views: { register: (id, v) => { registered = { id, v }; } },
      components: speechPanel ? { speechPanel } : {}
    };
    const file = path.join(__dirname, "..", "views", "flashcards.js");
    vm.runInContext(fs.readFileSync(file, "utf8"), sandbox, { filename: "views/flashcards.js" });
    assert.ok(registered, "flashcards 已登錄");
    assert.equal(registered.id, "flashcards");
    return registered.v;
  }

  test("hide() 呼叫 speechPanel.release（不呼叫 reset）；沒有 release 時退回 reset（AC-33-02）", () => {
    const calls = [];
    const view = loadFlashcardsView({ reset: () => calls.push("reset"), release: () => calls.push("release") });
    view.hide();
    assert.deepEqual(calls, ["release"]);

    const old = [];
    const view2 = loadFlashcardsView({ reset: () => old.push("reset") });
    view2.hide();
    assert.deepEqual(old, ["reset"]);

    // 語音面板不存在、或 release 拋例外：hide 不拋例外
    assert.doesNotThrow(() => loadFlashcardsView(null).hide());
    const orig = console.error;
    console.error = () => {};
    try {
      assert.doesNotThrow(() => loadFlashcardsView({ reset() {}, release() { throw new Error("x"); } }).hide());
    } finally {
      console.error = orig;
    }
  });

  test("原始碼：換卡與切換模式仍只呼叫 reset，release 只出現在 hide 路徑", () => {
    const js = fs.readFileSync(path.join(__dirname, "..", "views", "flashcards.js"), "utf8");
    const code = js.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    assert.equal((code.match(/"release"/g) || []).length, 1, "release 只在 releaseSpeech 中呼叫");
    assert.match(code, /hide:\s*function\s*\(\)\s*\{\s*releaseSpeech\(\);\s*\}/);
    for (const bad of ["getUser" + "Media", "Media" + "Recorder"]) assert.ok(!js.includes(bad), "不得出現 " + bad);
  });
});

// （v0.10，FE-43；AC-06-06、R-19）空狀態提示不再引導使用者輸入或查看目標分數
describe("flashcards.test.js：空狀態提示（FE-43）", () => {
  test("fc-empty__hint 為「請到難易度設定選擇色級並按「套用」，或新增自訂單字、注入領域範本。」，且畫面文字不含「目標分數」", () => {
    const fs = require("node:fs");
    const path = require("node:path");
    const src = fs.readFileSync(path.join(__dirname, "..", "views", "flashcards.js"), "utf8");
    assert.ok(src.includes('className: "fc-empty__hint", text: "請到難易度設定選擇色級並按「套用」，或新增自訂單字、注入領域範本。"'));
    // 只檢查字串常值（註解可提及版本說明）
    const lits = src.match(/"[^"\n]*"/g) || [];
    assert.ok(!lits.some((s) => s.includes("目標分數")));
    assert.ok(lits.includes('"前往難易度設定"'));
  });
});
