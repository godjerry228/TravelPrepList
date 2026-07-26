// 用戶管理模組 - 多用戶模式（無密碼）
const Users = {
  USERS_KEY: 'tc_users',
  CURRENT_KEY: 'tc_currentUserId',
  BACKUP_KEY: 'tc_backup_v1',
  MIGRATED_KEY: 'tc_migrated_v1',

  // 舊版鍵值（遷移用）
  LEGACY_DATA_KEY: 'travelChecklistData',
  LEGACY_SAVED_KEY: 'savedChecklists',

  // 取得所有用戶
  getAll() {
    try {
      const raw = localStorage.getItem(this.USERS_KEY);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (error) {
      console.error('讀取用戶清單失敗:', error);
      return [];
    }
  },

  // 寫入用戶清單
  saveAll(users) {
    localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
  },

  // 產生用戶 id
  generateId() {
    return 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  },

  // 新增用戶（名字不可空白、不可重複）
  create(name) {
    const trimmed = (name || '').trim();
    if (!trimmed) throw new Error('請輸入用戶名稱');

    const users = this.getAll();
    if (users.some(u => u.name === trimmed)) {
      throw new Error('已有相同名稱的用戶');
    }

    const user = {
      id: this.generateId(),
      name: trimmed,
      createdAt: Date.now()
    };

    users.push(user);
    this.saveAll(users);
    return user;
  },

  // 刪除用戶（連同其清單資料）
  remove(userId) {
    const users = this.getAll().filter(u => u.id !== userId);
    this.saveAll(users);

    localStorage.removeItem(this.dataKey(userId));
    localStorage.removeItem(this.savedKey(userId));

    if (this.getCurrentId() === userId) {
      localStorage.removeItem(this.CURRENT_KEY);
    }
  },

  // 重新命名用戶
  rename(userId, newName) {
    const trimmed = (newName || '').trim();
    if (!trimmed) throw new Error('請輸入用戶名稱');

    const users = this.getAll();
    if (users.some(u => u.name === trimmed && u.id !== userId)) {
      throw new Error('已有相同名稱的用戶');
    }

    const user = users.find(u => u.id === userId);
    if (!user) throw new Error('找不到此用戶');

    user.name = trimmed;
    this.saveAll(users);
    return user;
  },

  // 目前選定的用戶 id
  getCurrentId() {
    return localStorage.getItem(this.CURRENT_KEY);
  },

  // 目前選定的用戶物件
  getCurrent() {
    const id = this.getCurrentId();
    if (!id) return null;
    return this.getAll().find(u => u.id === id) || null;
  },

  // 設定目前用戶
  setCurrent(userId) {
    localStorage.setItem(this.CURRENT_KEY, userId);
  },

  // 清除目前用戶（回到選擇畫面）
  clearCurrent() {
    localStorage.removeItem(this.CURRENT_KEY);
  },

  // 各用戶的儲存鍵
  dataKey(userId) {
    return 'tc_data_' + userId;
  },

  savedKey(userId) {
    return 'tc_saved_' + userId;
  },

  // 一次性資料遷移：把舊的單用戶資料轉給預設用戶
  migrateLegacyData() {
    if (localStorage.getItem(this.MIGRATED_KEY) === 'true') return;

    const legacyData = localStorage.getItem(this.LEGACY_DATA_KEY);
    const legacySaved = localStorage.getItem(this.LEGACY_SAVED_KEY);

    // 沒有舊資料就直接標記完成
    if (!legacyData && !legacySaved) {
      localStorage.setItem(this.MIGRATED_KEY, 'true');
      return;
    }

    try {
      // 先完整備份，任何情況都不覆蓋既有備份
      if (!localStorage.getItem(this.BACKUP_KEY)) {
        localStorage.setItem(this.BACKUP_KEY, JSON.stringify({
          travelChecklistData: legacyData,
          savedChecklists: legacySaved,
          backupAt: Date.now()
        }));
      }

      // 建立預設用戶（若同名用戶已存在則沿用）
      let user = this.getAll().find(u => u.name === 'Jerry');
      if (!user) {
        user = this.create('Jerry');
      }

      if (legacyData && !localStorage.getItem(this.dataKey(user.id))) {
        localStorage.setItem(this.dataKey(user.id), legacyData);
      }

      if (legacySaved && !localStorage.getItem(this.savedKey(user.id))) {
        localStorage.setItem(this.savedKey(user.id), legacySaved);
      }

      localStorage.setItem(this.MIGRATED_KEY, 'true');
      console.log('舊資料已遷移至用戶：' + user.name);
    } catch (error) {
      // 遷移失敗時不清除任何舊鍵值，備份仍在
      console.error('資料遷移失敗:', error);
    }
  }
};
