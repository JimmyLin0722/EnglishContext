# English Master Track 系統規格書 (SA & SD Specification)

本文件定義「English Master Track — 多益目標衝刺與碩士學術英文訓練系統」之**系統分析（System Analysis, SA）**與**系統設計（System Design, SD）**規格，涵蓋自定義目標門檻、動態字庫生成、美式口說語音辨識診斷、長難句拆解與學術句型庫等完整功能。

---

# 第一部分：系統分析 (System Analysis, SA)

## 1.1 系統目標與背景
* **目標受眾**：英文基礎較弱、預備就讀國內外碩士研究所、需跨越學術文獻門檻與多益特定分數目標（如 550～860+ 分）之學習者。
* **核心價值**：
  1. **降低學習摩擦力**：擺脫單字死背與厚例文法，採用「骨架拆解」與「情境搭配詞」教學。
  2. **目標彈性客製**：支援學習者自訂目標分數與領域，動態調適字庫與衝刺進度。
  3. **雙向多益與學術接軌**：以多益 670–750 分為核心樞紐，向上無縫銜接研究所論文閱讀（Academic Purposes）。
  4. **零額外硬體成本**：透過瀏覽器原生 Web API 完成美式語音示範與即時收音評分。

---

## 1.2 使用者角色與使用情境 (User Stories & Use Cases)

| 角色 | 使用情境 | 系統預期價值 |
| :--- | :--- | :--- |
| **碩士新生 / 準研究生** | 讀不懂期刊論文的長句子，文獻閱讀速度極慢。 | 透過「彩色長難句解碼器」先抓 S+V 主幹，並可一鍵淡化修飾語，快速掌握論文貢獻。 |
| **多益考生 (衝刺 700 分)** | 想達到畢業或免修門檻，但單字量不足且不知從何背起。 | 透過「自訂目標與單字產生器」設定 700 分，系統動態鎖定 5,500～7,000 字的核心商務搭配詞。 |
| **特定專業研究生 (資工/商管/生醫)** | 論文中充斥大量領域專有術語（如 Latency, Synergy）。 | 利用「自訂專業字庫注入器」新增或套用範本，單字自動同步至美式發音練習與抽認卡。 |
| **口說發音弱勢者** | 唸單字不確定是否標準、尾音常吞掉。 | 點擊麥克風以美式（en-US）收音，即時獲得發音相似度百分比與文字對比。 |

---

## 1.3 功能性需求 (Functional Requirements, FR)

### 模組一：自定義目標與動態單字產生器 (Target & Vocab Customizer)
* **FR-1.1 官方多益門檻級距切換**：
  * **Tier 1 (550 – 650 分)**：約 5,000 字（大學畢業門檻 / 基礎商務日常）。
  * **Tier 2 (670 – 750 分)**：約 5,500 – 7,000 字（職場多數情境 / 專業討論 / 碩士先修）。
  * **Tier 3 (750 – 850 分)**：約 7,500 – 9,000 字（高階商務談判 / 複雜文獻流暢處理）。
  * **Tier 4 (860+ 分 金色證書)**：約 9,500 字以上（專業熟練者 / 近母語水準）。
* **FR-1.2 連續性分數自訂與試算**：
  * 支援滑桿或數字輸入任意多益分數（500～990 分）。
  * 即時依公式試算：建議總字量、每日建議背誦配額（如 35 字/天）、建議達成週期（週數）。
* **FR-1.3 單字庫動態過濾與產生**：
  * 當使用者切換目標級距並套用時，系統依階梯關係自動聚合單字庫（如設定 Tier 2 則包含 Tier 1 與 Tier 2 之字彙）。
* **FR-1.4 專業領域字彙擴充與注入 (Custom Vocab Injector)**：
  * 支援表單自訂：英文單字、音標、中文釋義、搭配詞、論文例句。
  * 支援一鍵範本注入：資工（Latency, Scalability）、商管（Synergy）、生醫統計（Heterogeneous）。

### 模組二：動態單字抽認卡與美式發音評分 (Flashcard & Voice Engine)
* **FR-2.1 卡片翻轉與雙向學習**：
  * 正面：單字、音標、多益常考搭配詞、發音與錄音控制。
  * 背面：詞性、中文釋義、學術文獻應用情境（對照基礎日常字與學術用字）、完整例句。
* **FR-2.2 美式語音示範 (TTS)**：
  * 支援 1.0x（正常速度）及 0.75x（慢速咬字拆解）之原生美式發音（`en-US`）。
* **FR-2.3 美式口說辨識診斷 (STT)**：
  * 呼叫瀏覽器麥克風，強制鎖定 `en-US` 美式語言模型進行語音辨識。
  * 使用編輯距離算法評估發音吻合度，給予 0～100 分之評分與顏色反饋（綠燈優秀、黃燈接近、紅燈需修正）。
* **FR-2.4 四選一即時測驗模式**：
  * 抽認卡支援一鍵切換至測驗模式，由系統自動產生選項，測驗成果即時回饋並記錄於後台。

### 模組三：多益 Part 5 文法與搭配詞模擬測驗 (Part 5 Simulator)
* **FR-3.1 題型覆蓋**：包含固定介系詞搭配、詞性辨析、上下文單字與讓步/因果連接詞題型。
* **FR-3.2 即時破題與結構解析**：
  * 點選選項後即時鎖定並標示正確/錯誤。
  * 提供「解題核心思路」與「句型語法拆解（S + V + O + 修飾語）」。

### 模組四：碩士論文長難句解碼器 (Academic Sentence Decoder)
* **FR-4.1 彩色語法骨架標籤**：
  * 主詞（Subject）：藍色標籤
  * 核心動詞（Verb）：紅色標籤
  * 受詞 / 補語（Object / Complement）：綠色標籤
  * 修飾語 / 子句 / 插入語（Modifier）：紫色標籤
* **FR-4.2 淡化修飾語功能**：
  * 提供一鍵按鈕將所有修飾語淡化（Opacity 30% + 灰階），突顯句子核心主張。
* **FR-4.3 閱讀策略提示**：針對 Abstract 摘要、方法論、文獻回顧（Research Gap）提供閱讀心法。

### 模組五：學術寫作句型庫 (Academic Phrasebank)
* **FR-5.1 情境分類篩選**：指出先前研究空白（Gap）、陳述研究目的（Aim）、解釋實驗結果（Findings）、說明局限性（Limitations）。
* **FR-5.2 關鍵字搜尋與一鍵複製**：即時過濾模板並支援點擊複製至剪貼簿。

### 模組六：進度追蹤與數據持久化 (Progress & Storage)
* **FR-6.1 打卡天數與正確率計算**：連續打卡天數、單字掌握數、Part 5 正確率。
* **FR-6.2 本機儲存持久化**：所有目標分數、自訂單字、學習進度均存於瀏覽器 `localStorage`。

---

## 1.4 非功能性需求 (Non-Functional Requirements, NFR)
* **NFR-1 單一檔案部署 (Single-File Architecture)**：全系統（HTML、CSS、JavaScript）整合成單一 `.html` 檔案，支援離線執行、零伺服器環境架設。
* **NFR-2 響應式介面 (RWD)**：支援桌機、平板與手機螢幕尺寸（Tailwind CSS 自適應排版）。
* **NFR-3 隱私性與零授權費用**：語音辨識與合成皆調用瀏覽器原生 Web API，不需串接付費雲端語音服務或傳輸使用者隱私音檔。
* **NFR-4 反應效能**：頁面切換、單字庫過濾與發音評分均需於 100ms 內完成畫面渲染。

---

# 第二部分：系統設計 (System Design, SD)

## 2.1 系統架構圖 (Architecture Overview)

```
+-----------------------------------------------------------------------+
|                             使用者介面層                              |
|   +-------------------+  +-------------------+  +-------------------+ |
|   | 學習主控台        |  | 目標與字庫自訂器  |  | 動態單字抽認卡   | |
|   +-------------------+  +-------------------+  +-------------------+ |
|   +-------------------+  +-------------------+  +-------------------+ |
|   | Part 5 測驗題庫   |  | 論文長難句解碼器  |  | 學術寫作句型庫   | |
|   +-------------------+  +-------------------+  +-------------------+ |
+-----------------------------------------------------------------------+
                                    |
+-----------------------------------------------------------------------+
|                             核心業務邏輯層                            |
|  - 目標分數演算法 (Score & Vocab Estimator)                           |
|  - 動態字庫過濾引擎 (Tier Filtering & Custom Vocab Merge)             |
|  - 發音相似度比對引擎 (Levenshtein Distance Scoring)                 |
|  - 句型骨架剖析與淡化渲染 (DOM Tagging & Modifier Dimming)            |
+-----------------------------------------------------------------------+
                                    |
+-----------------------------------------------------------------------+
|                           瀏覽器原生服務與資料層                      |
|  - Web Speech API (SpeechRecognition: en-US, SpeechSynthesis: en-US)  |
|  - LocalStorage Engine (進度、分數目標、自訂字庫持久化)               |
+-----------------------------------------------------------------------+
```

---

## 2.2 資料結構設計 (Data Schema)

### 1. 單字資料模型 (VocabItem)
```typescript
interface VocabItem {
  id: number;                 // 唯一識別碼 (時間戳記或數值)
  word: string;               // 單字或片語 (如 "address", "latency")
  phonetic: string;           // 國際音標 (如 "/əˈdres/")
  tier: string;               // 所屬門檻級距 ("tier1" | "tier2" | "tier3" | "tier4")
  tierLabel: string;          // 級距中文標記 ("550-650" | "670-750" | "自訂擴充")
  category: string;           // 分類代碼 ("workplace" | "contract" | "academic")
  categoryName: string;       // 分類中文名稱
  pos: string;                // 詞性 (如 "v. 動詞", "n. 名詞")
  meaning: string;            // 中文釋義
  collocation: string;        // 多益必考搭配詞 (如 "comply with regulations")
  academicContext: string;    // 學術文獻對應情境與換位例句
  example: string;            // 實用例句
  options: string[];          // 四選一選項陣列
  correctIndex: number;       // 正確選項索引 (0-3)
}
```

### 2. 全域狀態模型 (AppState)
```typescript
interface AppState {
  currentTab: string;           // 當前頁籤 ('dashboard' | 'customizer' | 'flashcards' | ...)
  targetScore: number;          // 使用者設定之多益目標分數 (500～990)
  activeTier: string;           // 當前生效級距 ('tier1' | 'tier2' | 'tier3' | 'tier4')
  customVocabList: VocabItem[]; // 使用者手動新增或注入之自訂單字庫
  streakDays: number;           // 連續打卡天數
  reviewedCardsCount: number;   // 已掌握單字累積計數
  quizCurrentIndex: number;     // Part 5 測驗題號
  quizScore: number;            // Part 5 答對題數
  quizAnswered: number;         // Part 5 總作答題數
  cardCurrentIndex: number;     // 抽認卡索引
  cardIsFlipped: boolean;       // 抽認卡正反面狀態
  isPracticeMode: boolean;      // 是否處於單字四選一模式
  filteredVocabList: VocabItem[];// 依當前級距合併自訂字後的動態單字集
  isModifierDimmed: boolean;    // 長難句是否淡化修飾語
  isRecordingVoice: boolean;    // 麥克風是否錄音中
  recognitionInstance: any;     // Web Speech Recognition 實例
}
```

---

## 2.3 核心演算法與數學模型

### 1. 多益目標單字量與每日配額推算模型
設使用者自訂目標分數為 $S$（其中 $500 \le S \le 990$），系統推算模型如下：

* **級距判定（Tier Mapping）**：
  $$\text{Tier}(S) = \begin{cases} 
  \text{tier1} & \text{若 } S < 670 \\ 
  \text{tier2} & \text{若 } 670 \le S < 750 \\ 
  \text{tier3} & \text{若 } 750 \le S < 860 \\ 
  \text{tier4} & \text{若 } S \ge 860 
  \end{cases}$$

* **每日建議背誦量 $W_d$（字/天）**：
  $$W_d = \begin{cases} 
  25 & \text{若 } S < 670 \\ 
  35 & \text{若 } 670 \le S < 750 \\ 
  40 & \text{若 } 750 \le S < 860 \\ 
  50 & \text{若 } S \ge 860 
  \end{cases}$$

* **預計達成週數 $T_{\text{weeks}}$**：
  $$T_{\text{weeks}} = \left\lceil \frac{\text{TargetVocab}(S) - \text{CurrentVocab}}{W_d \times 7} \right\rceil$$

---

### 2. 美式語音相似度評分演算法 (Levenshtein Distance)
為提供客觀的發音比對評分，系統使用動態規劃（Dynamic Programming）計算語音辨識輸出字串 $s_1$ 與目標單字 $s_2$ 之最小編輯距離：

* **距離轉移方程**：
  $$D(i, j) = \begin{cases} 
  \max(i, j) & \text{若 } \min(i, j) = 0 \\ 
  \min \begin{cases} 
  D(i-1, j) + 1 \\ 
  D(i, j-1) + 1 \\ 
  D(i-1, j-1) + \text{cost} 
  \end{cases} & \text{其他} 
  \end{cases}$$
  其中當 $s_1[i] = s_2[j]$ 時 $\text{cost} = 0$，否則 $\text{cost} = 1$。

* **標準化吻合度評分公式（Score %）**：
  $$\text{Score}(s_1, s_2) = \text{round}\left( \left( 1 - \frac{D(|s_1|, |s_2|)}{\max(|s_1|, |s_2|)} \right) \times 100 \right)$$

* **診斷級別閥值**：
  * $\text{Score} \ge 90\%$：發音優良（綠燈，美式口音標準）。
  * $65\% \le \text{Score} < 90\%$：發音接近（黃燈，提示放慢速度或重聽 0.75x 示範）。
  * $\text{Score} < 65\%$：需重新嘗試（紅燈，顯示實際識別文字與正確目標文字對比）。

---

## 2.4 Web Speech API 整合流程

```
[使用者按下麥克風按鈕]
        │
        ▼
[檢查瀏覽器 SpeechRecognition 支援度]
        │
        ├── 支援 ──► [實例化 recognition，指定 lang = 'en-US']
        │                  │
        │                  ▼
        │             [更新麥克風按鈕狀態 (閃爍紅燈 / 提示正在聆聽)]
        │                  │
        │                  ▼
        │             [使用者唸出單字，產生音訊串流]
        │                  │
        │                  ▼
        │             [辨識完成觸發 onresult 事件]
        │                  │
        │                  ▼
        │             [字串清洗：去除小寫、標點與空白]
        │                  │
        │                  ▼
        │             [執行 Levenshtein Distance 計算吻合度]
        │                  │
        │                  ▼
        │             [更新畫面分數徽章、彩色反饋與提示]
        │
        └── 不支援 ─► [彈出 Toast 提示：建議使用 Google Chrome / Edge]
```

---

## 2.5 碩士論文長難句拆解架構與淡化機制

### DOM 標籤化規則
* **主詞 (Subject)**：以 `<span class="bg-blue-100 text-blue-900 font-bold">` 包裹。
* **核心動詞 (Verb)**：以 `<span class="bg-red-100 text-red-900 font-bold">` 包裹。
* **受詞/補語 (Object/Complement)**：以 `<span class="bg-emerald-100 text-emerald-900">` 包裹。
* **修飾語/副詞子句/插入語 (Modifier)**：一律加上 `.modifier-tag` 類別，例如：
  ```html
  <span class="modifier-tag bg-purple-100 text-purple-900">[Although previous studies emphasized...]</span>
  ```

### 淡化演算法 (Modifier Dimming Logic)
當使用者點擊「淡化修飾語」時，系統切換 `state.isModifierDimmed`：
```javascript
function applyModifierDimming() {
  const modifiers = document.querySelectorAll('.modifier-tag');
  modifiers.forEach(el => {
    if (state.isModifierDimmed) {
      el.classList.add('opacity-30', 'grayscale', 'transition-opacity');
    } else {
      el.classList.remove('opacity-30', 'grayscale');
    }
  });
}
```
學習者視線得以完全聚焦於主幹結構，大幅降低期刊論文初讀者的認知負荷（Cognitive Load）。

---

## 2.6 安全性、限制與維護指引

1. **安全性（Security）**：
   * 所有自訂單字在呈現於 DOM 前，需透過 `escapeQuotes` 進行跳脫，避免 XSS 注入。
   * 資料均儲存在本機客戶端（`localStorage`），無任何隱私資料上傳外部伺服器。
2. **瀏覽器相容性限制（Compatibility Constraints）**：
   * 語音辨識（SpeechRecognition）於 Google Chrome 與 Microsoft Edge 具最佳支援。
   * 語音合成（SpeechSynthesis）相容於多數現代瀏覽器。
3. **擴充維護方式（Extensibility）**：
   * 新增預設多益單字時，僅需向 `MASTER_VOCAB_DATABASE` 陣列推入符合 `VocabItem` 規範之物件，並標註對應的 `tier` 屬性即可。