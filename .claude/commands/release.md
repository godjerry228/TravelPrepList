# GitHub Release 建立指令

建立新的 GitHub Release。

## 使用方式

```
/release [版本號] [標題]
```

- 版本號：如 v1.8.0（若未提供，自動遞增 minor 版本）
- 標題：Release 標題（若未提供，會詢問）

## 執行步驟

1. **檢查 git 狀態**
   - 確認工作區乾淨，若有未提交變更則先提交

2. **取得最新版本號**
   ```bash
   git tag --sort=-version:refname | head -1
   ```

3. **建立新 tag**
   ```bash
   git tag -a [版本號] -m "[標題]"
   git push origin [版本號]
   ```

4. **使用 GitHub API 建立 Release**
   ```bash
   TOKEN=$(printf "protocol=https\nhost=github.com\n" | git credential fill 2>/dev/null | grep password | cut -d= -f2)

   cat > /tmp/release.json << JSONEOF
   {
     "tag_name": "[版本號]",
     "name": "[版本號] - [標題]",
     "body": "[Release 內容]",
     "draft": false,
     "prerelease": false
   }
   JSONEOF

   curl -s -X POST \
     -H "Authorization: token $TOKEN" \
     -H "Accept: application/vnd.github.v3+json" \
     -H "Content-Type: application/json" \
     https://api.github.com/repos/godjerry228/TravelPrepList/releases \
     -d @/tmp/release.json

   rm -f /tmp/release.json
   ```

5. **回傳 Release 連結**
   - 格式：`https://github.com/godjerry228/TravelPrepList/releases/tag/[版本號]`

## 注意事項

- 執行前必須先清理暫存檔：`rm -f tmpclaude-*`
- Release body 內容根據 git log 自動產生，或詢問用戶
