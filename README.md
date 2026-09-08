# ⚡ Trio Discipline & Treasury OS (好友共同自律與公費懲罰系統)

專為 **Johnson、Jason、Willy** 三人打造的 Desktop-First 桌機全螢幕自律儀表板與公費懲罰金庫系統。

---

## 🚀 核心功能架構

1. **身分切換與專屬視角 (User Selection Modal)**
   - 首次進入居中彈出「你是誰？」身分選擇卡片。
   - 身分狀態持久化儲存於 `localStorage`。
   - 右上角隨時透過頭像下拉選單切換操作者。

2. **任務打卡與照片強制綁定 (Proof-to-Complete)**
   - 嚴格防作弊：Checkbox 禁止直接手動勾選完成。
   - 點擊任務強制彈出「上傳證明」視窗，支援本機照片上傳（直傳 Supabase Storage `task-proofs` 桶）或外部佐證網址（Notion/GitHub/HackMD）。
   - 打卡成功後自動燃放彩帶特效，並在任務旁顯示縮圖，點擊可開啟高解析度 Lightbox 檢視。

3. **不可抗力豁免機制 (Skip with Reason)**
   - 遭遇極端天候或突發不可抗力狀況，可申請「不可抗力豁免」。
   - 強制填寫詳細豁免理由（提供暴雨、突發加班、身體微恙等快捷標籤）。
   - 標記豁免之項目加上刪除線與括號理由備註，午夜結算時**不計入失敗罰款**。

4. **每日必做、明日預排與午夜自動結算 (Daily Reset & Auto-Audit)**
   - **今日必做 (Today's Tasks)**：鎖定核心項目，僅供打卡佐證，不可任意更動，維護自律誠信。
   - **明日預排 (Tomorrow's Tasks)**：當日 23:59 前規劃隔天任務，且**每日預排不得少於 2 項**。
   - **午夜結算審查 (`daily_midnight_audit`)**：
     - 昨日任務未打卡且未豁免者，每項計 1 次失敗（罰 $100）。
     - 今日任務在午夜前若未預排或少於 2 項，追加 1 次失敗（罰 $100）。
     - 明日預排任務自動正名輪轉為今日任務開放打卡。

5. **每週任務看板 (Weekly To-Do Milestones)**
   - Monday 至 Sunday 7 天橫向並排卡片。
   - 獨立管理各日重大單次任務、考試檢定、專案發布。

6. **公費金庫 (Fund & Goal Dashboard)**
   - 頂部即時匯總三人罰金總額（公費總池）。
   - 夢想目標進度條（京都古民家 & 居酒屋公費度假基金）。
   - 個人累計罰金與失敗次數排行榜，自動標記「罰金王」。

---

## 🛠️ 本地開發與啟動

### 1. 安裝依賴
```bash
npm install
```

### 2. 環境變數設定
複製 `.env.example` 為 `.env` 並填入你的 Supabase 憑證：
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_PENALTY_UNIT=100
```
> **提示**：系統具備零配置智慧備援（Local Cache Mode）。即使尚未綁定 Supabase，所有打卡、豁免、預排與結算功能亦可正常在瀏覽器中操作！

### 3. 啟動本機開發伺服器
```bash
npm run dev
```

---

## 🗄️ Supabase 資料庫初始化

登入 [Supabase 控制台](https://supabase.com)，前往 **SQL Editor**，複製專案中的 `supabase/schema.sql` 內容並執行。腳本會自動完成：
- 建立 `profiles`、`tasks`、`audit_logs` 資料表與索引。
- 建立公開 Storage 桶 `task-proofs` 與 RLS 安全存取策略。
- 註入 Johnson、nigga、shorty 預設資料與對應頭像。
- 建立 `daily_midnight_audit()` 函數（以台北時間 UTC+8 計算昨日/今日）。
- 啟用 `pg_cron` 並排程於每天台灣時間午夜 00:00 自動執行結算。

---

## ☁️ Cloudflare Pages 部署教學

1. **推動程式碼至 GitHub 倉庫**。
2. 進入 [Cloudflare Dashboard](https://dash.cloudflare.com/) -> **Workers & Pages** -> **Create application** -> **Pages** -> **Connect to Git**。
3. 選擇本專案倉庫，填寫建置設定：
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. 在 **Environment variables** (環境變數) 中新增：
   - `VITE_SUPABASE_URL`: 你的 Supabase 專案網址
   - `VITE_SUPABASE_ANON_KEY`: 你的 Supabase anon 公開金鑰
   - `VITE_PENALTY_UNIT`: `100`
5. 點擊 **Save and Deploy** 即可完成部署！
   - 專案已在 `public/_redirects` 預先配置 `/*  /index.html  200`，確保 SPA 重新整理頁面不會出現 404。
