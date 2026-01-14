# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 專案概述

旅遊清單檢查 PWA - 家庭旅遊行李檢查清單應用程式，支援離線使用、拖曳排序、多清單儲存/載入。

## 啟動方式

```bash
# 使用 PHP 內建伺服器
php -S localhost:8000

# 或透過 WAMP
# http://localhost/PHP8/Demo/travelChecklist
```

## 技術架構

### 前端技術
- **純 JavaScript (Vanilla JS)** - 無框架，使用 ES6+ 語法
- **Tailwind CSS 3.x** (CDN) - 樣式框架
- **SortableJS** (CDN) - 拖曳排序
- **SweetAlert2** (CDN) - 彈窗通知

### 資料儲存
- **localStorage** - 主要資料儲存（單用戶模式）
  - `travelChecklistData`: 當前清單資料
  - `savedChecklists`: 已儲存的清單集合
- **IndexedDB** - 模組已實作但目前未使用（`storage.js`）

### PWA 架構
- `manifest.json`: PWA 配置，部署於 GitHub Pages `/TravelPrepList/`
- `sw.js`: Service Worker，使用 Cache First 策略

## 程式碼結構

```
assets/js/
├── app.js        # 主應用程式邏輯（App 物件）
├── storage.js    # IndexedDB 封裝（Storage 物件，目前未使用）
├── user.js       # 用戶管理模組（User 物件，目前未使用）
└── checklist.js  # 清單管理模組（Checklist 物件，目前未使用）
```

### 核心物件：App（app.js）

所有業務邏輯集中於 `App` 物件：
- `init()`: 應用程式初始化
- `getData()` / `saveData()`: localStorage 存取
- `renderChecklist()` / `renderCategory()` / `renderItem()`: 渲染邏輯
- `handleItemCheck()`: 勾選處理
- `saveChecklist()` / `loadChecklist()`: 清單儲存載入
- `updateStats()`: 進度統計（含加權分數計算）

### 資料結構

```javascript
// localStorage: travelChecklistData
{
  categories: [{
    id: number,
    name: string,
    order: number,
    items: [{
      id: number,
      name: string,
      order: number,
      checked: boolean,
      priority: 0-5  // 星號數量，影響進度加權
    }]
  }]
}
```

### 進度計算

進度百分比採用加權計算（`updateStats()` 方法）：
- 0 星 = 1 分
- 1-2 星 = 2-3 分
- 3-5 星 = 5/8/13 分（費波那契數列）

## 開發注意事項

- JS 檔案載入時使用版本號參數（`?v=7`），更新時需同步修改 `index.html`
- Service Worker 快取版本 `CACHE_VERSION = 'v2'`，更新靜態資源時需修改
- 預設清單位於 `data/default-checklist.json`
- PWA 圖示位於 `assets/icons/` 和 `AppImages/`

## Git 部署注意事項

- **暫存檔排除**: `tmpclaude-*` 為 Claude Code 產生的暫存檔，已加入 `.gitignore`，部署時不要推送到 GitHub
- **本地設定排除**: `.claude/settings.local.json` 為本地設定，不應推送
