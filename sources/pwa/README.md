# PWA 圖示來源與產生方式

| 項目 | 內容 |
| :--- | :--- |
| 來源檔 | `sources/pwa/PWA_Icon.jpg`（2048×2048 JPG，JimmyLin 提供構想後由 AI 生成，2026-11-04 JimmyLin 說明；作為品牌標識使用，JimmyLin 保留其享有的權利，不適用 MIT 與 CC BY-SA 4.0） |
| 決議 | PRD Q-41 A（裁灰邊、保留「EnglishContext」字樣）、Q-45 A（主控預先產生） |
| 產生者 | 主控，2026-11-02 初版；2026-11-03 依 BUG-003 重新產生；工具 Python 3 + Pillow 12.3.0 |

## 步驟

1. 裁切藍色方塊範圍：`crop((341, 342, 1707, 1708))`，得 1366×1366。
2. 邊緣列／欄修正（BUG-003，2026-11-03）：裁切範圍最外側若有「中段一半以上像素非藍色」的列或欄（來源的灰色外框與陰影），以往內最近的藍色列／欄覆蓋。
3. 四角補色：從裁切圖四個角做 flood fill，凡「非藍色」像素（判定 `b>170 且 r<110 且 b−r>90` 不成立）且與角落相連者，以同列往內第一個藍色像素的顏色取代（整列都已填補時改取同欄往內的像素）；文字與對話框不與角落相連，不受影響。
4. 縮放（LANCZOS）：`icon-512.png`、`icon-192.png`、`apple-touch-icon-180.png`。
5. maskable（`icon-maskable-512.png`）：以 `icon-512.png` 縮至 **78%**（399px）置中；背景為縮放圖左側內縮 40px 欄位的逐列顏色（垂直漸層）；貼上時用內縮 25px 的矩形遮罩加 GaussianBlur(13) 羽化。白色文字最遠點距中心 202.3px，落在直徑 80% 的安全圓（半徑 204.8px）內。85% 時為 221.4px，會超出安全圓，因此採 78%（SD-FB-31）。
6. 全部輸出為 RGB 8 位元 PNG（色彩類型 2），無透明度、無 tRNS。

## 檔案

| 檔名 | 尺寸 | 用途 |
| :--- | :--- | :--- |
| `src/app/assets/icons/icon-192.png` | 192×192 | any |
| `src/app/assets/icons/icon-512.png` | 512×512 | any |
| `src/app/assets/icons/icon-maskable-512.png` | 512×512 | maskable |
| `src/app/assets/icons/apple-touch-icon-180.png` | 180×180 | iOS apple-touch-icon |
