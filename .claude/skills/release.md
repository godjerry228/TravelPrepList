---
description: 自動創建 GitHub Release
argument-hint: "[版本號] [release標題]"
allowed-tools:
  - Bash
  - Read
  - Edit
---

# Release Skill

自動執行 Git tag 並創建 GitHub Release。

## 使用方式

```
/release v1.9.0 新功能標題
```

若未指定版本號，會自動取得下一個版本。

## 執行步驟

1. **檢查 git 狀態**：確認工作目錄乾淨
2. **取得版本號**：若未指定，自動計算下一個版本（現有最大版本 +0.1）
3. **取得 commit 歷史**：從上一個 tag 到現在的 commit 作為 release notes
4. **創建並推送 tag**
5. **創建 GitHub Release**：使用 `gh release create` 或 GitHub API

## 執行指令

```bash
# 1. 檢查狀態
cd "H:/wamp/www/PHP8/Demo/travelChecklist"
git status --short

# 2. 取得現有 tags 並計算下一版本
git tag -l 'v*' | sort -V | tail -1

# 3. 取得 commit 歷史（從上一個 tag 到 HEAD）
git log $(git describe --tags --abbrev=0)..HEAD --oneline

# 4. 創建 tag
git tag <版本號>
git push origin <版本號>

# 5. 創建 Release（需要 gh CLI 或 GITHUB_TOKEN）
gh release create <版本號> --title "<標題>" --notes "<release notes>"
```

## 環境需求

- **gh CLI**：`winget install GitHub.cli` 或
- **GITHUB_TOKEN**：設定環境變數用於 API 認證

## 注意事項

- 執行前確保所有變更已 commit 並 push
- 敏感檔案（如含密碼的 login.php）應加入 .gitignore 不上傳
