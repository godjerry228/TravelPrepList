# 快速啟動指引

## 步驟 1：產生 PWA 圖示

應用程式需要 PWA 圖示才能完整運作。請先產生圖示：

### 最快方式（純色測試用）

使用線上工具快速產生：
1. 訪問 https://favicon.io/favicon-generator/
2. 設定：
   - Text: ✓
   - Background: #3b82f6
   - Font Family: Arial
   - Font Size: 90
3. 下載並解壓縮
4. 將產生的 PNG 檔案重新命名並複製到 `assets/icons/` 目錄

### 專業方式

1. 訪問 https://www.pwabuilder.com/imageGenerator
2. 上傳 512x512 的旅遊主題圖片
3. 下載圖示包
4. 放入 `assets/icons/` 目錄

## 步驟 2：啟動伺服器

### 使用 PHP 內建伺服器（推薦）

```bash
cd H:\wamp\www\PHP8\Demo\travelChecklist
php -S localhost:8000
```

### 使用 WAMP

1. 確保 WAMP 已啟動
2. 訪問 `http://localhost/PHP8/Demo/travelChecklist`

## 步驟 3：訪問應用程式

開啟瀏覽器訪問：
- PHP 內建伺服器：`http://localhost:8000`
- WAMP：`http://localhost/PHP8/Demo/travelChecklist`

## 步驟 4：初次使用

1. 第一次開啟會自動初始化
2. 建立「管理者」用戶
3. 載入預設清單（6大分類）
4. 開始使用！

## 常見問題

### Q: 圖示無法顯示？
A: 檢查 `assets/icons/` 目錄是否有所有尺寸的圖示檔案

### Q: Service Worker 無法註冊？
A: 必須使用 HTTP/HTTPS 協定，不能使用 `file://` 開啟

### Q: 資料遺失了？
A: 資料存在瀏覽器的 IndexedDB 中，清除瀏覽器資料會遺失。建議定期匯出備份。

### Q: 如何重新開始？
A: 開啟開發者工具（F12）→ Application → IndexedDB → 刪除 `TravelChecklistDB`

## 下一步

- 📱 試試在手機上「加入主畫面」
- 👥 新增家庭成員用戶
- ✏️ 自訂你的旅遊清單
- ✈️ 開始計劃下次旅行！

## 測試 PWA 功能

1. 開啟開發者工具（F12）
2. Application → Manifest：檢查 PWA 設定
3. Application → Service Workers：確認已註冊
4. 測試離線：Network → Offline，重新整理頁面應該仍可使用

---

**祝旅遊愉快！** 🎒✈️🌍
