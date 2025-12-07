# 旅遊清單檢查 PWA

家庭旅遊行李檢查清單應用程式

## 功能特色

- ✅ 完全離線可用的 PWA
- ✅ 支援多用戶管理（5人以內家庭使用）
- ✅ 管理者可維護預設清單
- ✅ 用戶可自訂個人清單
- ✅ 拖曳排序（分類與物品）
- ✅ 勾選統計與進度顯示
- ✅ 一鍵重設（含二次確認）
- ✅ 現代化扁平設計（Tailwind CSS）
- ✅ 響應式介面（手機/平板/桌面）

## 技術棧

- **前端**: Vanilla JavaScript
- **CSS**: Tailwind CSS 3.x (CDN)
- **儲存**: IndexedDB
- **PWA**: Service Worker + manifest.json
- **排序**: SortableJS
- **伺服器**: PHP 8 / 任意 HTTP 伺服器

## 安裝步驟

### 1. 環境需求

- PHP 8.0 或以上（或任意 HTTP 伺服器）
- 現代化瀏覽器（支援 IndexedDB 與 Service Worker）

### 2. 啟動應用程式

#### 方式一：使用 PHP 內建伺服器

```bash
cd C:\wamp\www\travelChecklist
php -S localhost:8000
```

#### 方式二：使用 WAMP/XAMPP

將專案放在 `www` 目錄下，透過 `http://localhost/travelChecklist` 訪問

### 3. 產生 PWA 圖示

目前專案缺少 PWA 圖示，請使用以下方式產生：

**線上工具**：
- [PWA Icon Generator](https://www.pwabuilder.com/)
- [RealFaviconGenerator](https://realfavicongenerator.net/)

**產生尺寸**：
- 72x72
- 96x96
- 128x128
- 144x144
- 152x152
- 192x192
- 384x384
- 512x512

將產生的圖示檔案放入 `assets/icons/` 目錄

**簡易替代方案**：
如果只是測試，可以暫時使用純色圖片或現有的 logo 圖片重新命名

### 4. 訪問應用程式

開啟瀏覽器訪問：`http://localhost:8000`

## 使用說明

### 初次使用

1. 第一次開啟會自動建立「管理者」用戶
2. 自動載入預設清單（6大分類、30+物品）
3. 可開始勾選、新增、編輯清單

### 用戶管理

- **切換用戶**：頂部用戶選擇器
- **新增用戶**：點擊「管理用戶」→ 選擇 1
- **刪除用戶**：點擊「管理用戶」→ 選擇 2
- **設定管理者**：點擊「管理用戶」→ 選擇 3

### 清單管理

- **新增分類**：底部「新增分類」按鈕
- **新增物品**：分類卡片右上角「+」按鈕
- **編輯名稱**：雙擊分類或物品名稱
- **刪除**：點擊對應的刪除按鈕
- **排序**：拖曳 ☰ 手柄

### 勾選功能

- **勾選物品**：點擊勾選框
- **查看進度**：頂部顯示「已勾選: X/Y (Z%)」
- **重設清單**：底部「重設清單」按鈕（需二次確認）

### PWA 安裝

#### 手機（Android/iOS）

1. 使用 Chrome/Safari 開啟應用程式
2. 點擊「加入主畫面」或「安裝」
3. 完成後可像 APP 一樣使用

#### 桌面（Chrome/Edge）

1. 網址列右側會出現「安裝」圖示
2. 點擊安裝
3. 可在開始選單找到捷徑

## 資料結構

### IndexedDB Schema

**資料庫名稱**: `TravelChecklistDB`

1. **users** - 用戶資料
2. **checklists** - 分類清單
3. **checkItems** - 檢查項目
4. **settings** - 系統設定

### 資料隔離

- 每個用戶擁有獨立的清單副本
- 管理者可編輯預設清單（`userId = null`）
- 新用戶建立時自動複製當前預設清單
- 管理者修改預設清單不影響現有用戶

## 離線功能

應用程式使用 Service Worker 實現完全離線可用：

- 所有靜態資源預先快取
- 資料儲存在本地端 IndexedDB
- 無需網路連線即可使用全部功能

## 預設清單

應用程式內建 6 大分類：

1. **重要資料文件**：機票、護照、證件、Visit Japan、外幣
2. **行程文件資料**：行程表、旅遊書、旅館資料
3. **3C 電子類**：手機、充電器、行動電源、相機、記憶卡
4. **盥洗用品**：牙刷牙膏、洗面乳、毛巾、防曬乳
5. **衣物鞋襪**：上衣、褲子、內衣褲、襪子、外套、鞋子
6. **藥品保健**：常備藥、OK繃、口罩

## 瀏覽器支援

- Chrome 67+
- Firefox 62+
- Safari 11.1+
- Edge 79+

## 注意事項

1. **資料備份**：IndexedDB 資料存在瀏覽器中，清除瀏覽器資料會遺失
2. **跨裝置**：目前不支援雲端同步，每個裝置獨立儲存
3. **用戶數量**：建議 5 人以內使用（設計目標）
4. **圖示檔案**：記得產生並放置 PWA 圖示

## 開發資訊

### 檔案結構

```
travelChecklist/
├── index.html              # 主頁面
├── manifest.json           # PWA 配置
├── sw.js                  # Service Worker
├── assets/
│   ├── css/app.css        # 自訂樣式
│   ├── js/
│   │   ├── storage.js     # IndexedDB 封裝
│   │   ├── user.js        # 用戶管理
│   │   ├── checklist.js   # 清單管理
│   │   └── app.js         # 主應用邏輯
│   └── icons/             # PWA 圖示
└── data/
    └── default-checklist.json  # 預設清單
```

### 清除資料

如需清除所有資料重新開始：

1. 開啟瀏覽器開發者工具（F12）
2. Application → IndexedDB → 刪除 `TravelChecklistDB`
3. Application → Service Workers → Unregister
4. Application → Cache Storage → 刪除所有快取
5. 重新整理頁面

## 授權

MIT License

## 作者

Jerry

## 版本

v1.0.0 (2025-12-07)
