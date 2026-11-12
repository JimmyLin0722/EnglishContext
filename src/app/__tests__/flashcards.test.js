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
    assert.equal(m.front[0].label, "常用搭配詞"); // （v0.12，FE-78）契約 L-8 LT-1、V-LGL-01
    assert.ok(m.front.every((f) => !f.label.includes("多益")), "單字卡正面標籤不含「多益」");
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
    assert.deepEqual(Object.keys(st.runtime.flashcard).sort(), ["index", "isFlipped", "islandFeedback", "mode", "quiz"]);
    assert.deepEqual(st.runtime.flashcard, { index: 0, isFlipped: false, mode: "card", quiz: null, islandFeedback: null });
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
// （v0.14，FE-68；HT-7、DS-27、AC-43-02）空狀態提示不再提及領域範本；字串常值不含「範本」
describe("flashcards.test.js：空狀態提示（FE-43、FE-68）", () => {
  test("fc-empty__hint 為「請到難易度設定選擇色級並按「套用」，或新增自訂單字。」，且畫面文字不含「目標分數」「範本」", () => {
    const fs = require("node:fs");
    const path = require("node:path");
    const src = fs.readFileSync(path.join(__dirname, "..", "views", "flashcards.js"), "utf8");
    assert.ok(src.includes('className: "fc-empty__hint", text: "請到難易度設定選擇色級並按「套用」，或新增自訂單字。"'));
    assert.ok(!src.includes("注入領域範本"));
    // 只檢查字串常值（註解可提及版本說明）
    const lits = src.match(/"[^"\n]*"/g) || [];
    assert.ok(!lits.some((s) => s.includes("目標分數")));
    assert.ok(!lits.some((s) => s.includes("範本")), "flashcards.js 字串常值不含「範本」");
    assert.ok(lits.includes('"前往難易度設定"'));
    // 刪字後文句完整：以「。」結尾，不以「或」「、」「，」結尾
    const hint = "請到難易度設定選擇色級並按「套用」，或新增自訂單字。";
    assert.ok(hint.endsWith("。"));
    assert.ok(!/[或、，]$/.test(hint.slice(0, -1)));
  });
});

// ─────────────────────────────────────────────────────────────
// （v0.23，FE-109）單字卡島嶼外觀、卡片角落裝飾與學完回饋列
// 依據：architecture.md §7.32.9、§7.32.10、§10.15「flashcards.test.js」列；契約 README §15.5 LF-3、LF-4、§15.7 IV-3
// 涵蓋：AC-69-01、AC-69-02（文字逐字呈現）、AC-69-05、AC-69-06、AC-68-02、AC-68-03、AC-70-02、AC-71-02、AC-38-08
// 做法：極簡假 DOM ＋ node:vm 依瀏覽器方式載入 core/dom.js、ui/island-art.js 與 views/flashcards.js；
//       store 用 _fixtures 的真實 store（Node 版），由測試代替 router 呼叫 setTab 與 show()／hide()
// ─────────────────────────────────────────────────────────────

describe("flashcards.test.js：島嶼外觀、角落裝飾與學完回饋列（FE-109）", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const vm = require("node:vm");
  const APP_DIR = path.join(__dirname, "..");
  const read = (rel) => fs.readFileSync(path.join(APP_DIR, rel), "utf8");

  /** 極簡假節點：appendChild 會先自原父節點移除（與瀏覽器相同），hidden 屬性與特性同步 */
  function makeNode(tag) {
    const listeners = {};
    const classes = new Set();
    const n = {
      nodeType: tag === "#text" ? 3 : 1,
      tagName: tag.toUpperCase(),
      attrs: {},
      childNodes: [],
      style: {},
      disabled: false,
      _text: "",
      listeners,
      parentNode: null,
      classList: {
        add: (c) => classes.add(c),
        remove: (c) => classes.delete(c),
        contains: (c) => classes.has(c),
        toggle: (c, force) => {
          const on = force === undefined ? !classes.has(c) : !!force;
          if (on) classes.add(c); else classes.delete(c);
          return on;
        }
      },
      get className() { return [...classes].join(" "); },
      set className(v) { classes.clear(); String(v).split(/\s+/).filter(Boolean).forEach((c) => classes.add(c)); },
      get hidden() { return Object.prototype.hasOwnProperty.call(this.attrs, "hidden"); },
      set hidden(v) { if (v) this.attrs.hidden = ""; else delete this.attrs.hidden; },
      setAttribute(k, v) { if (k === "class") this.className = v; else this.attrs[k] = String(v); },
      getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
      removeAttribute(k) { delete this.attrs[k]; },
      addEventListener(t, fn) { (listeners[t] = listeners[t] || []).push(fn); },
      appendChild(c) {
        if (c.parentNode) c.parentNode.removeChild(c);
        this.childNodes.push(c);
        c.parentNode = this;
        return c;
      },
      removeChild(c) { this.childNodes.splice(this.childNodes.indexOf(c), 1); c.parentNode = null; return c; },
      get firstChild() { return this.childNodes[0] || null; },
      get children() { return this.childNodes.filter((c) => c.nodeType === 1); },
      get textContent() { return this.nodeType === 3 ? this._text : this._text + this.childNodes.map((c) => c.textContent).join(""); },
      set textContent(v) { this.childNodes = []; this._text = String(v); },
      // （FE-117）同瀏覽器 cloneNode：複製標籤、屬性、class、文字；deep 時遞迴複製子節點，不複製監聽器與父節點
      cloneNode(deep) {
        const c = makeNode(this.nodeType === 3 ? "#text" : this.tagName.toLowerCase());
        c.attrs = Object.assign({}, this.attrs);
        c.className = this.className;
        c._text = this._text;
        if (deep) this.childNodes.forEach((k) => c.appendChild(k.cloneNode(true)));
        return c;
      }
    };
    return n;
  }

  function findAll(n, pred, out = []) {
    if (n.nodeType === 1 && pred(n)) out.push(n);
    for (const c of n.childNodes || []) findAll(c, pred, out);
    return out;
  }
  const byClass = (root, cls) => findAll(root, (n) => n.classList.contains(cls));
  const one = (root, cls) => {
    const list = byClass(root, cls);
    assert.equal(list.length, 1, "." + cls + " 應恰 1 個");
    return list[0];
  };

  /**
   * 以瀏覽器方式載入並 mount 單字卡頁。
   * @param {{ store?: object, noArt?: boolean, quiz?: object, artHook?: Function }} [o]
   *   store：省略時用 _fixtures 的真實 store；noArt：不載入 ui/island-art.js；quiz：假的 flashcardQuiz 元件；
   *   artHook：（FE-117）載入 island-art.js 後、載入單字卡頁前以 EMT.ui.islandArt 呼叫，供包裝或替換插圖函式
   */
  function setup(o = {}) {
    const document = {
      createElement: (t) => makeNode(t),
      createElementNS: (ns, t) => makeNode(t),
      createTextNode: (t) => { const n = makeNode("#text"); n._text = t; return n; }
    };
    const errors = [];
    const sandbox = { document, console: { log() {}, warn() {}, error: (...a) => errors.push(a) } };
    sandbox.self = sandbox;
    sandbox.window = sandbox;
    vm.createContext(sandbox);
    const files = ["core/constants.js", "core/dom.js", "core/interaction.js"];
    if (!o.noArt) files.push("ui/island-art.js");
    for (const rel of files) vm.runInContext(read(rel), sandbox, { filename: rel });
    if (o.artHook && !o.noArt) o.artHook(sandbox.EMT.ui.islandArt);
    let view = null;
    sandbox.EMT.views = { register: (id, v) => { if (id === "flashcards") view = v; } };
    sandbox.EMT.components = o.quiz ? { flashcardQuiz: o.quiz } : {};
    let made = null;
    if (o.store) sandbox.EMT.store = o.store;
    else {
      made = F.makeStore();
      sandbox.EMT.store = made.store;
    }
    vm.runInContext(read("views/flashcards.js"), sandbox, { filename: "views/flashcards.js" });
    assert.ok(view, "flashcards 已登錄");
    const rootEl = makeNode("section");
    view.mount(rootEl);
    view.show();
    return { view, rootEl, store: sandbox.EMT.store, a: made ? made.a : null, errors };
  }

  /** 回饋容器的元素子節點 */
  const liveKids = (rootEl) => one(rootEl, "fc-feedback-live").children;

  test("回饋容器常駐：role=status、aria-live=polite、aria-atomic=true；null 時無子元素（LF-3、AC-69-05）", () => {
    const { rootEl, store } = setup();
    assert.equal(store.getState().runtime.flashcard.islandFeedback, null);
    const live = one(rootEl, "fc-feedback-live");
    assert.equal(live.tagName, "DIV");
    assert.equal(live.getAttribute("role"), "status");
    assert.equal(live.getAttribute("aria-live"), "polite");
    assert.equal(live.getAttribute("aria-atomic"), "true");
    assert.equal(live.childNodes.length, 0, "未觸發回饋前不渲染回饋列");
    assert.equal(live.textContent, "");
    assert.equal(byClass(rootEl, "fc-feedback").length, 0);
  });

  test("回饋容器位於 .fc-stage 之後、.fc-nav 之前；.fc-main 其餘順序不變（AC-69-05、AC-38-08）", () => {
    const { rootEl } = setup();
    const main = one(rootEl, "fc-main");
    assert.deepEqual(main.children.map((c) => c.className), ["fc-toolbar", "fc-stage", "fc-feedback-live", "fc-nav"]);
  });

  test("新值 → 1 個 p.fc-feedback：新芽圖示 aria-hidden ＋ 文字逐字（LF-4、AC-69-03、AC-71-02）", () => {
    const { rootEl, store, a } = setup();
    a.setTab("flashcards");
    a.flipCard();
    const fb = store.getState().runtime.flashcard.islandFeedback;
    assert.ok(fb && typeof fb.text === "string", "store 產生回饋");
    const kids = liveKids(rootEl);
    assert.equal(kids.length, 1);
    const p = kids[0];
    assert.equal(p.tagName, "P");
    assert.ok(p.classList.contains("fc-feedback"));
    assert.equal(p.children.length, 2);
    const [icon, span] = p.children;
    assert.equal(icon.tagName, "SVG");
    assert.ok(icon.classList.contains("fc-feedback__icon"));
    assert.ok(icon.classList.contains("isl-art--sprout"));
    assert.equal(icon.getAttribute("aria-hidden"), "true");
    assert.equal(icon.getAttribute("focusable"), "false");
    assert.equal(span.tagName, "SPAN");
    assert.ok(span.classList.contains("fc-feedback__text"));
    assert.equal(span.textContent, fb.text);
    assert.equal(span.textContent, "小船又前進了，再 14 個字靠岸");
    assert.equal(p.textContent, fb.text, "回饋列只有 1 行文字");
  });

  test("同值不重建；換卡、切換模式、翻回正面保留同一個 p；新值才替換（LF-3、AC-69-05）", () => {
    const { rootEl, store, a } = setup();
    a.setTab("flashcards");
    a.flipCard();
    const p1 = liveKids(rootEl)[0];
    const fb1 = store.getState().runtime.flashcard.islandFeedback;
    a.flipCard(); // 翻回正面：不比較
    assert.equal(liveKids(rootEl)[0], p1);
    a.gotoCard(1); // 換卡：保留
    assert.equal(store.getState().runtime.flashcard.islandFeedback, fb1);
    assert.equal(liveKids(rootEl).length, 1);
    assert.equal(liveKids(rootEl)[0], p1, "參照相同 → 不動 DOM（不重播淡入）");
    a.setFlashcardMode("quiz");
    assert.equal(liveKids(rootEl)[0], p1, "切換測驗模式保留");
    a.setFlashcardMode("card");
    assert.equal(liveKids(rootEl)[0], p1, "切回單字卡模式保留");
    a.flipCard(); // 第 2 個新字翻到背面 → 新回饋
    const fb2 = store.getState().runtime.flashcard.islandFeedback;
    assert.notEqual(fb2, fb1);
    const kids = liveKids(rootEl);
    assert.equal(kids.length, 1, "以新的 p 取代，不累加");
    assert.notEqual(kids[0], p1);
    assert.equal(byClass(kids[0], "fc-feedback__text")[0].textContent, "小船又前進了，再 13 個字靠岸");
  });

  test("切頁後清空；回到單字卡頁仍為空（LF-3、AC-69-05）", () => {
    const { rootEl, view, a } = setup();
    a.setTab("flashcards");
    a.flipCard();
    assert.equal(liveKids(rootEl).length, 1);
    a.setTab("dashboard");
    view.hide();
    assert.equal(liveKids(rootEl).length, 0, "離開單字卡頁即清空");
    a.setTab("flashcards");
    view.show();
    assert.equal(one(rootEl, "fc-feedback-live").childNodes.length, 0);
  });

  test("回饋文字以 textContent 寫入（XSS 字串原樣當文字）；缺 text 或空字串不渲染；tab 通知也同步", () => {
    const base = F.makeStore().store.getState();
    let state = base;
    const subs = [];
    const stub = {
      getState: () => state,
      subscribe: (fn) => { subs.push(fn); return () => {}; },
      actions: {}
    };
    const set = (fb, tags) => {
      state = { data: base.data, runtime: Object.assign({}, base.runtime, { flashcard: Object.assign({}, base.runtime.flashcard, { islandFeedback: fb }) }) };
      subs.forEach((fn) => fn(state, tags));
    };
    const { rootEl } = setup({ store: stub });
    const evil = "<img src=x onerror=alert(1)>";
    set({ kind: "sailing", island: null, text: evil }, ["islandFeedback"]);
    const span = one(rootEl, "fc-feedback__text");
    assert.equal(span.textContent, evil);
    assert.equal(span.children.length, 0, "不解析成元素");
    assert.equal(findAll(rootEl, (n) => n.tagName === "IMG").length, 0);
    set({ kind: "sailing", island: null, text: "" }, ["islandFeedback"]);
    assert.equal(liveKids(rootEl).length, 0);
    set({ kind: "sailing", island: null }, ["islandFeedback"]);
    assert.equal(liveKids(rootEl).length, 0);
    set({ kind: "docked", island: null, text: "今天的小船靠岸了！" }, ["tab"]);
    assert.equal(one(rootEl, "fc-feedback__text").textContent, "今天的小船靠岸了！");
    set({ kind: "levelUp", island: "orange", text: "橘島長出第一棵椰子樹！" }, ["speech"]);
    assert.equal(one(rootEl, "fc-feedback__text").textContent, "今天的小船靠岸了！", "無關 tag 不更新");
    set(null, ["islandFeedback"]);
    assert.equal(liveKids(rootEl).length, 0);
  });

  test(".fc-deco：每次重建卡片區後仍為 .fc-stage 最後一個子元素、恰 1 個、aria-hidden（AC-69-01、AC-71-02、SD-FB-108）", () => {
    const quizCalls = [];
    const quiz = {
      // 假測驗元件：冪等重繪，只清空並填入自己的容器
      render(container, st) {
        quizCalls.push(st.runtime.flashcard.index);
        while (container.firstChild) container.removeChild(container.firstChild);
        const q = makeNode("p");
        q.textContent = "題目";
        container.appendChild(q);
      }
    };
    const env = setup({ quiz });
    const { rootEl, a } = env;
    const stage = one(rootEl, "fc-stage");
    function check(label) {
      const kids = stage.children;
      const deco = kids[kids.length - 1];
      assert.ok(deco.classList.contains("fc-deco"), label + "：最後一個子元素為 .fc-deco");
      assert.equal(byClass(stage, "fc-deco").length, 1, label + "：恰 1 個裝飾");
      assert.equal(deco.tagName, "SVG");
      assert.ok(deco.classList.contains("isl-art--card"));
      assert.equal(deco.getAttribute("aria-hidden"), "true");
      assert.equal(deco.getAttribute("focusable"), "false");
      assert.equal(deco.getAttribute("tabindex"), null);
      assert.equal(kids.length, 2, label + "：卡片區只有卡片（或測驗容器）與裝飾");
      return deco;
    }
    const d0 = check("首次顯示");
    assert.ok(stage.children[0].classList.contains("fc-card"));
    a.gotoCard(2);
    assert.equal(check("換卡"), d0, "裝飾只建立 1 次");
    a.flipCard();
    check("翻面");
    assert.equal(a.setFlashcardMode("quiz").ok, true);
    check("進入測驗模式");
    assert.ok(stage.children[0].classList.contains("fc-quiz"));
    a.gotoCard(3);
    check("測驗換題重繪");
    assert.ok(quizCalls.length >= 2, "測驗元件已重繪");
    a.setFlashcardMode("card");
    assert.equal(check("切回單字卡"), d0);
    env.view.show();
    check("回到本頁（強制重建）");
  });

  test("islandArt 未載入：不拋例外、無裝飾；回饋仍顯示文字", () => {
    const { rootEl, a, errors } = setup({ noArt: true });
    assert.equal(byClass(rootEl, "fc-deco").length, 0);
    a.setTab("flashcards");
    a.flipCard();
    const p = one(rootEl, "fc-feedback");
    assert.equal(p.children.length, 1);
    assert.equal(p.children[0].className, "fc-feedback__text");
    assert.equal(errors.length, 0);
  });

  test("其餘元素順序、按鈕數量與文字不變；不新增返回鈕、今日 X / D、色級徽章、上一張 N 分（AC-69-01、AC-38-08、IV-3）", () => {
    const { rootEl, a } = setup();
    assert.deepEqual(rootEl.children[0].children.map((c) => c.className), ["fc-title", "fc-main", "card fc-empty"]);
    assert.equal(one(rootEl, "fc-title").textContent, "單字卡");
    const main = one(rootEl, "fc-main");
    const btnText = () => findAll(main, (n) => n.tagName === "BUTTON").map((b) => b.textContent);
    assert.deepEqual(btnText(), ["測驗模式", "上一張", "翻面", "下一張"]);
    a.setTab("flashcards");
    a.flipCard();
    assert.deepEqual(btnText(), ["測驗模式", "上一張", "翻面", "下一張"], "回饋列不含按鈕");
    assert.doesNotMatch(main.textContent, /今日\s*\d+\s*\/\s*\d+|上一張\s*\d+\s*分|返回|橘級|棕級|綠級/);
    // 卡片內部結構不變：正面、背面、出處
    const card = one(main, "fc-card");
    assert.deepEqual(card.children.map((c) => c.className), ["fc-face fc-front", "fc-face fc-back", "fc-attrib"]);
  });

  test("純邏輯 feedbackTextOf、feedbackChange：參照相同不更新、無效值視為 null", () => {
    const fb = { kind: "mastered", island: "orange", text: "橘島又多掌握 1 個字（掌握 24%）" };
    assert.equal(L.feedbackTextOf(fb), "橘島又多掌握 1 個字（掌握 24%）");
    assert.equal(L.feedbackTextOf(null), null);
    assert.equal(L.feedbackTextOf({ text: "  " }), null);
    assert.equal(L.feedbackTextOf({ text: 3 }), null);
    assert.deepEqual(L.feedbackChange(null, null), { change: false, value: null });
    assert.deepEqual(L.feedbackChange(fb, fb), { change: false, value: fb });
    assert.deepEqual(L.feedbackChange(null, fb), { change: true, value: fb });
    const same = Object.assign({}, fb);
    assert.equal(L.feedbackChange(fb, same).change, true, "內容相同但物件不同 → 替換（重播淡入）");
    assert.deepEqual(L.feedbackChange(fb, { text: "" }), { change: true, value: null });
    assert.deepEqual(L.feedbackChange(fb, null), { change: true, value: null });
  });

  // ── CSS（architecture.md §7.32.7、§7.32.9） ──

  const css = read("styles/30-flashcards.css").replace(/\/\*[\s\S]*?\*\//g, "");
  // 去掉 @media 區塊後的頂層規則
  const topCss = css.replace(/@media[^{]*\{(?:[^{}]*\{[^}]*\})*\s*\}/g, "");
  /** 取出頂層選擇器完全相同的規則宣告 */
  function rule(sel) {
    const esc = sel.replace(/[.*+?^${}()|[\]\\>]/g, "\\$&");
    const m = topCss.match(new RegExp("(^|\\})\\s*" + esc + "\\s*\\{([^}]*)\\}"));
    assert.ok(m, "缺少規則 " + sel);
    return m[2];
  }

  test("CSS：刪除 v0.11 卡片幾何覆寫；卡片與按鈕沿用全站外框（AC-68-02、AC-69-01）", () => {
    assert.doesNotMatch(css, /#view-flashcards\s+\.card/);
    // 本檔不再覆寫卡片／按鈕的外框、圓角、陰影
    const blocks = css.match(/[^{}]+\{[^{}]*\}/g) || [];
    let checked = 0;
    for (const b of blocks) {
      const [sel, decls] = b.split("{");
      if (!/\.(card|btn|fc-card|fc-quiz|fc-mode-btn|fc-prev|fc-next|fc-flip)(?![\w-])/.test(sel)) continue;
      checked++;
      assert.doesNotMatch(decls, /\bborder(-color|-width|-radius|-style)?\s*:|box-shadow\s*:/, "選擇器：" + sel.trim());
    }
    assert.ok(checked >= 4);
    // 單字卡本體翻到背面不換底色（區塊卡片背景 = 白，AC-68-02）
    assert.doesNotMatch(css, /\.fc-card\[data-flipped="true"\]\s*\{[^}]*background/);
  });

  test("CSS：.fc-stage 定位基準、.fc-deco 右上角絕對定位且不攔點擊、卡片上內距 ≥ 34px（AC-69-01）", () => {
    assert.match(rule(".fc-stage"), /position:\s*relative/);
    const deco = rule(".fc-deco");
    assert.match(deco, /position:\s*absolute/);
    assert.match(deco, /top:\s*8px/);
    assert.match(deco, /right:\s*12px/);
    assert.match(deco, /pointer-events:\s*none/);
    const pad = rule(".fc-stage > .card").match(/padding-top:\s*(\d+)px/);
    assert.ok(pad && Number(pad[1]) >= 34, "上內距 ≥ 34px");
    // 裝飾矩形 top 8 + 高 24 = 32 < 上內距
    assert.ok(8 + 24 < Number(pad[1]));
    // 其他規則（含 @media）不得以 .fc-stage > .card 改小上內距
    assert.equal((css.match(/\.fc-stage\s*>\s*\.card\s*\{/g) || []).length, 1);
  });

  test("CSS：回饋容器無內距、外框、外距；回饋列樣式與 200ms 只改 opacity 的淡入（AC-69-05、AC-70-02、AC-68-03）", () => {
    const live = rule(".fc-feedback-live");
    assert.match(live, /margin:\s*0/);
    assert.match(live, /padding:\s*0/);
    assert.match(live, /border:\s*0/);
    const fb = rule(".fc-feedback");
    for (const re of [/display:\s*flex/, /align-items:\s*center/, /gap:\s*8px/, /margin:\s*12px 0 0/, /padding:\s*8px 12px/,
      /background:\s*var\(--feedback-bg\)/, /border:\s*2px solid var\(--outline\)/, /border-radius:\s*16px/,
      /font-size:\s*0\.875rem/, /font-weight:\s*700/, /(^|[^-])color:\s*var\(--text\)/, /overflow-wrap:\s*anywhere/]) {
      assert.match(fb, re);
    }
    // 淡入時長用變數（A-4）且 = 200ms（--emt-dur-slide）
    assert.match(fb, /animation:\s*fc-fb-in var\(--emt-dur-slide\) ease-out/);
    const motionCss = read("styles/05-motion.css");
    assert.match(motionCss, /--emt-dur-slide:\s*200ms/);
    const kf = css.match(/@keyframes fc-fb-in\s*\{([\s\S]*?\})\s*\}/);
    assert.ok(kf, "缺少 @keyframes fc-fb-in");
    const props = kf[1].match(/[\w-]+(?=\s*:)/g) || [];
    assert.ok(props.length > 0 && props.every((p) => p === "opacity"), "只改 opacity：" + props.join(","));
    // 減少動態由全域規則關閉
    assert.match(motionCss, /prefers-reduced-motion:\s*reduce[\s\S]*animation:\s*none !important/);
    // 回饋文字對比（--text #1f2937 對 --feedback-bg #e9fbef ≥ 4.5:1）
    const base = read("styles/00-base.css");
    assert.match(base, /--feedback-bg:\s*#e9fbef/);
    assert.match(base, /--text:\s*#1f2937/);
    const lum = (hex) => {
      const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
        .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
      return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    };
    const ratio = (lum("#e9fbef") + 0.05) / (lum("#1f2937") + 0.05);
    assert.ok(ratio >= 4.5, "對比 " + ratio.toFixed(2));
  });

  // ─────────────────────────────────────────────────────────────
  // （FE-117）新芽圖示範本：mount 建 1 份，之後 cloneNode(true)（architecture.md §7.32.9、§7.32.15 P-6、§10.15）
  // ─────────────────────────────────────────────────────────────

  /** 可由測試直接推送 islandFeedback 的假 store（參照每次不同） */
  function feedbackStub() {
    const base = F.makeStore().store.getState();
    let state = base;
    const subs = [];
    const store = {
      getState: () => state,
      subscribe: (fn) => { subs.push(fn); return () => {}; },
      actions: {}
    };
    const push = (fb) => {
      state = { data: base.data, runtime: Object.assign({}, base.runtime, { flashcard: Object.assign({}, base.runtime.flashcard, { islandFeedback: fb }) }) };
      subs.forEach((fn) => fn(state, ["islandFeedback"]));
    };
    return { store, push };
  }

  /** 節點結構（標籤、class、屬性、文字、子節點），用來比較複製品與 sprout() 的輸出 */
  const shape = (n) => ({
    tag: n.tagName,
    cls: n.className,
    attrs: Object.assign({}, n.attrs),
    text: n._text,
    kids: n.childNodes.map(shape)
  });

  test("新芽圖示：sprout 在 mount 呼叫 1 次，之後 3 次不同回饋不再呼叫；每個圖示是不同節點、結構同 sprout()；範本不在文件中（FE-117、AC-69-05）", () => {
    let calls = 0;
    let template = null;
    let art = null;
    const { store, push } = feedbackStub();
    const { rootEl, errors } = setup({
      store,
      artHook: (a) => {
        art = a;
        const orig = a.sprout;
        a.sprout = function (cls) {
          calls++;
          template = orig.call(this, cls);
          return template;
        };
      }
    });
    assert.equal(calls, 1, "mount 時建立 1 份範本");
    assert.ok(template, "範本已建立");
    assert.equal(byClass(rootEl, "fc-feedback").length, 0, "尚無回饋列");

    const texts = ["小船又前進了，再 14 個字靠岸", "小船又前進了，再 13 個字靠岸", "今天的小船靠岸了！"];
    const icons = [];
    texts.forEach((text, i) => {
      push({ kind: i === 2 ? "docked" : "sailing", island: null, text });
      const p = one(rootEl, "fc-feedback");
      assert.equal(p.tagName, "P");
      assert.equal(p.children.length, 2);
      const [icon, span] = p.children;
      assert.equal(icon.tagName, "SVG");
      assert.ok(icon.classList.contains("fc-feedback__icon"));
      assert.ok(icon.classList.contains("isl-art--sprout"));
      assert.equal(icon.getAttribute("aria-hidden"), "true");
      assert.equal(icon.getAttribute("focusable"), "false");
      assert.equal(span.textContent, text);
      assert.equal(p.textContent, text, "圖示不帶文字");
      icons.push(icon);
    });
    assert.equal(calls, 1, "之後的回饋列不再呼叫 sprout");
    assert.equal(new Set(icons).size, 3, "每個回饋列的圖示是不同節點");
    icons.forEach((icon) => assert.notEqual(icon, template, "不直接使用範本"));

    // 結構與 sprout() 新建的圖示相同（以原函式另建一份比較，不影響計數斷言）
    const fresh = template.cloneNode(true);
    assert.deepEqual(shape(icons[2]), shape(fresh));
    assert.deepEqual(shape(icons[0]), shape(template));
    assert.ok(shape(template).kids.length > 0, "範本含圖形子節點");

    // 範本不在文件中，也未被複製品取代內容
    assert.equal(template.parentNode, null, "範本沒有父節點");
    assert.equal(findAll(rootEl, (n) => n === template).length, 0, "範本不在頁面樹中");
    assert.ok(art && typeof art.sprout === "function");
    assert.equal(errors.length, 0);
  });

  test("新芽圖示：結構與直接呼叫 islandArt.sprout(\"fc-feedback__icon\") 相同（FE-117）", () => {
    let direct = null;
    const { store, push } = feedbackStub();
    const { rootEl } = setup({
      store,
      artHook: (a) => { direct = a.sprout("fc-feedback__icon"); }
    });
    push({ kind: "sailing", island: null, text: "小船又前進了，再 14 個字靠岸" });
    const icon = one(rootEl, "fc-feedback").children[0];
    assert.notEqual(icon, direct);
    assert.deepEqual(shape(icon), shape(direct));
  });

  test("新芽圖示：sprout 回傳 null 時回饋列只有文字、不拋例外，之後也不重試（FE-117、AC-69-05）", () => {
    let calls = 0;
    const { store, push } = feedbackStub();
    const { rootEl, errors } = setup({
      store,
      artHook: (a) => { a.sprout = () => { calls++; return null; }; }
    });
    assert.equal(calls, 1);
    ["小船又前進了，再 14 個字靠岸", "今天的小船靠岸了！"].forEach((text) => {
      assert.doesNotThrow(() => push({ kind: "sailing", island: null, text }));
      const p = one(rootEl, "fc-feedback");
      assert.equal(p.children.length, 1, "只有文字");
      assert.equal(p.children[0].className, "fc-feedback__text");
      assert.equal(p.textContent, text);
    });
    assert.equal(calls, 1, "範本為 null 時不在回饋時重建");
    assert.equal(errors.length, 0);
    // 角落裝飾不受影響（placeDeco 不改）
    assert.equal(byClass(rootEl, "fc-deco").length, 1);
  });

  test("新芽圖示：sprout 拋例外時記錄錯誤、回饋列只有文字（FE-117）", () => {
    const { store, push } = feedbackStub();
    const { rootEl, errors } = setup({
      store,
      artHook: (a) => { a.sprout = () => { throw new Error("boom"); }; }
    });
    assert.equal(errors.length, 1, "mount 時記錄 1 次");
    assert.doesNotThrow(() => push({ kind: "sailing", island: null, text: "今天的小船靠岸了！" }));
    const p = one(rootEl, "fc-feedback");
    assert.equal(p.children.length, 1);
    assert.equal(p.textContent, "今天的小船靠岸了！");
    assert.equal(errors.length, 1, "回饋時不再呼叫");
  });

  test("原始碼：renderFeedback 不再直接呼叫 makeArt(\"sprout\")，改用範本 cloneNode(true)（FE-117）", () => {
    const src = read("views/flashcards.js");
    const m = src.match(/function renderFeedback\([\s\S]*?\n  \}\n/);
    assert.ok(m, "找到 renderFeedback");
    assert.doesNotMatch(m[0], /makeArt\(/);
    assert.match(m[0], /cloneSprout\(\)/);
    assert.match(src, /sproutTemplate\.cloneNode\(true\)/);
    assert.equal((src.match(/makeArt\("sprout"/g) || []).length, 1, "只在 mount 建立範本");
  });
});
