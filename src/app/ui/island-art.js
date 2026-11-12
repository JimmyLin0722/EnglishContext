/*
 * ui/island-art.js — 龜龜與島嶼裝飾小圖（FE-107）
 * 依據：architecture.md v0.19 §4.16「EMT.ui.islandArt」、§7.32.3、§7.32.10、§7.32.12；
 *       契約 README §15.7 IV-2、IV-5、VC-3
 * 涵蓋：AC-66-01、AC-68-05、AC-71-02
 *
 * EMT.ui.islandArt.turtle()（72×64）、titleDeco()（28×28）、cardDeco()（40×24）、sprout()（24×24）
 * - 各回傳 1 個新的 svg：aria-hidden="true"、focusable="false"、固定 viewBox 與 width／height；
 *   可傳入選用的 className（例：群島頁以 "db-host__turtle" 呼叫 turtle），加在固定 class 之後。
 * - 以 core/dom.js 的 svg() 建立，只用 path／ellipse／rect／circle／line／g；不含 text、use、image 元素，
 *   不寫外部參照屬性、網址函式與焦點順序屬性（IV-5、AC-71-02）。
 * - 原創造型、柔和色；fill／stroke 不使用強調橘（VC-3、AC-68-05）。素材聲明見 LT-7。
 * 載入時只做登錄，不讀 document、不取用其他模組（LD-1）；Node 下 module.exports 供測試。
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.EMT = root.EMT || {};
    root.EMT.ui = root.EMT.ui || {};
    root.EMT.ui.islandArt = api;
  }
})(typeof self !== "undefined" ? self : this, function (root) {
  "use strict";

  /** 插圖色（與 ui/island-map.js 同一組柔和色） */
  var C = Object.freeze({
    outline: "#3d3550",
    shell: "#6fcf97",
    shellLight: "#8fe3b0",
    skin: "#b8f0c8",
    cheek: "#ffb3c7",
    sand: "#f7e2b0",
    grass: "#9be3a0",
    trunk: "#c98b5a",
    leaf: "#6fcf97",
    leafLight: "#8fe3b0",
    white: "#ffffff",
    wave: "#7fb6c6"
  });

  /**
   * 呼叫時才取用 core/dom.js（LD-1）；取不到 → 丟出含模組名稱的 Error。
   * @returns {object}
   */
  function dom() {
    var mod = null;
    if (typeof module === "object" && module.exports && typeof require === "function") {
      try {
        mod = require("../core/dom.js");
      } catch (e) {
        mod = null;
      }
    } else {
      var emt = root && root.EMT;
      mod = emt && emt.core && emt.core.dom ? emt.core.dom : null;
    }
    if (!mod) throw new Error("[EMT.ui.islandArt] 缺少 EMT.core.dom");
    return mod;
  }

  /** 帶描邊的屬性 */
  function ol(attrs, width) {
    attrs.stroke = C.outline;
    attrs["stroke-width"] = width;
    attrs["stroke-linejoin"] = "round";
    attrs["stroke-linecap"] = "round";
    return attrs;
  }

  /**
   * 建立外層 svg（裝飾圖：aria-hidden、不可聚焦）。
   * @param {string} kind 圖名（class 後綴）
   * @param {number} w 寬
   * @param {number} h 高
   * @param {string} [extraClass] 呼叫端額外的 class
   * @param {Function} draw (s) → 子節點陣列
   */
  function frame(kind, w, h, extraClass, draw) {
    var s = dom().svg;
    var cls = "isl-art isl-art--" + kind;
    if (typeof extraClass === "string" && extraClass.trim() !== "") cls += " " + extraClass.trim();
    return s("svg", {
      class: cls,
      viewBox: "0 0 " + w + " " + h,
      width: w,
      height: h,
      "aria-hidden": "true",
      focusable: "false"
    }, draw(s));
  }

  /** 島主「龜龜」：圓頂殼上長著一株新芽的海龜，面向右（72×64，AC-66-01） */
  function turtle(extraClass) {
    return frame("turtle", 72, 64, extraClass, function (s) {
      return [
        // 後腳與前腳
        s("ellipse", ol({ cx: 15, cy: 53, rx: 7, ry: 4.5, fill: C.skin }, 2)),
        s("ellipse", ol({ cx: 45, cy: 54, rx: 7.5, ry: 4.5, fill: C.skin }, 2)),
        // 頭與頸
        s("path", ol({ d: "M48 40 C50 34 52 30 55 28 L58 40 Z", fill: C.skin }, 2)),
        s("circle", ol({ cx: 59, cy: 31, r: 10, fill: C.skin }, 2.4)),
        s("circle", { cx: 62, cy: 28, r: 2.3, fill: C.outline }),
        s("circle", { cx: 62.8, cy: 27.2, r: 0.8, fill: C.white }),
        s("circle", { cx: 63, cy: 35, r: 2.4, fill: C.cheek }),
        s("path", { d: "M55 36 Q58 38.5 61 36", fill: "none", stroke: C.outline, "stroke-width": 1.8, "stroke-linecap": "round" }),
        // 圓頂殼
        s("path", ol({ d: "M6 48 C7 28 18 18 32 18 C46 18 53 29 53 48 Z", fill: C.shell }, 2.4)),
        // 殼上的六角紋與放射紋
        s("path", ol({ d: "M23 37 L28 30 L36 30 L41 37 L36 43 L28 43 Z", fill: C.shellLight }, 1.8)),
        s("path", { d: "M28 30 L24 22 M36 30 L40 22 M23 37 L12 38 M41 37 L50 38 M28 43 L26 47 M36 43 L38 47", fill: "none", stroke: C.outline, "stroke-width": 1.6, "stroke-linecap": "round", opacity: 0.6 }),
        // 殼緣
        s("rect", ol({ x: 4, y: 45, width: 51, height: 7, rx: 3.5, fill: C.sand }, 2)),
        // 頭頂的新芽（島主的記號）
        s("line", { x1: 32, y1: 18, x2: 32, y2: 10, stroke: C.outline, "stroke-width": 2, "stroke-linecap": "round" }),
        s("path", ol({ d: "M32 12 C28 12 25 9 25 5 C29 5 32 8 32 12 Z", fill: C.leafLight }, 1.6)),
        s("path", ol({ d: "M32 11 C36 11 39 8 39 4 C35 4 32 7 32 11 Z", fill: C.leaf }, 1.6))
      ];
    });
  }

  /** 標題裝飾：沙丘上的一棵椰子樹（28×28） */
  function titleDeco(extraClass) {
    return frame("title", 28, 28, extraClass, function (s) {
      return [
        s("ellipse", ol({ cx: 14, cy: 21, rx: 12, ry: 4.5, fill: C.sand }, 1.8)),
        s("path", { d: "M14 20 C13 15 13 11 15 7", fill: "none", stroke: C.outline, "stroke-width": 3.4, "stroke-linecap": "round" }),
        s("path", { d: "M14 20 C13 15 13 11 15 7", fill: "none", stroke: C.trunk, "stroke-width": 1.6, "stroke-linecap": "round" }),
        s("path", ol({ d: "M15 7 C11 3 6 4 4 8 C8 7 11 7 15 9 Z", fill: C.leaf }, 1.6)),
        s("path", ol({ d: "M15 7 C19 3 24 4 25 8 C21 7 18 7 15 9 Z", fill: C.leafLight }, 1.6))
      ];
    });
  }

  /** 卡片角落裝飾：浪花旁的小島與新芽（40×24） */
  function cardDeco(extraClass) {
    return frame("card", 40, 24, extraClass, function (s) {
      return [
        s("path", { d: "M2 21 q3 -2.5 6 0 q3 2.5 6 0", fill: "none", stroke: C.wave, "stroke-width": 1.8, "stroke-linecap": "round" }),
        s("ellipse", ol({ cx: 24, cy: 18, rx: 14, ry: 4.5, fill: C.sand }, 1.8)),
        s("ellipse", ol({ cx: 24, cy: 16, rx: 9, ry: 2.6, fill: C.grass }, 1.4)),
        s("line", { x1: 24, y1: 15, x2: 24, y2: 9, stroke: C.outline, "stroke-width": 1.6, "stroke-linecap": "round" }),
        s("path", ol({ d: "M24 10.5 C21 10.5 19 8.5 19 5.5 C22 5.5 24 7.5 24 10.5 Z", fill: C.leafLight }, 1.3)),
        s("path", ol({ d: "M24 10 C27 10 29 8 29 5 C26 5 24 7 24 10 Z", fill: C.leaf }, 1.3))
      ];
    });
  }

  /** 學完回饋的新芽圖示（24×24） */
  function sprout(extraClass) {
    return frame("sprout", 24, 24, extraClass, function (s) {
      return [
        s("ellipse", ol({ cx: 12, cy: 20, rx: 8, ry: 2.6, fill: C.sand }, 1.6)),
        s("line", { x1: 12, y1: 19, x2: 12, y2: 10, stroke: C.outline, "stroke-width": 2, "stroke-linecap": "round" }),
        s("path", ol({ d: "M12 12 C8 12 5 9 5 4.5 C9.5 4.5 12 7.5 12 12 Z", fill: C.leafLight }, 1.6)),
        s("path", ol({ d: "M12 11 C16 11 19 8 19 4 C14.5 4 12 7 12 11 Z", fill: C.leaf }, 1.6))
      ];
    });
  }

  return {
    turtle: turtle,
    titleDeco: titleDeco,
    cardDeco: cardDeco,
    sprout: sprout
  };
});
