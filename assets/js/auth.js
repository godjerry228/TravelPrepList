// 認證模組 - 多用戶密碼驗證
const Auth = {
  STORAGE_KEYS: {
    USERS: 'travelChecklist_users',
    TOKEN: 'travelChecklist_authToken',
    EXPIRY: 'travelChecklist_authExpiry',
    CURRENT_USER: 'travelChecklist_currentUser'
  },

  TOKEN_DURATION: 7 * 24 * 60 * 60 * 1000, // 7 天

  // 密碼雜湊（使用 SHA-256）
  async hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  // 取得所有用戶
  getUsers() {
    const users = localStorage.getItem(this.STORAGE_KEYS.USERS);
    return users ? JSON.parse(users) : {};
  },

  // 儲存用戶資料
  saveUsers(users) {
    localStorage.setItem(this.STORAGE_KEYS.USERS, JSON.stringify(users));
  },

  // 檢查用戶名是否存在
  userExists(username) {
    const users = this.getUsers();
    return !!users[username];
  },

  // 註冊新用戶
  async register(username, password) {
    if (!username || !password) {
      throw new Error('請輸入帳號和密碼');
    }

    if (username.length < 2) {
      throw new Error('帳號至少需要 2 個字元');
    }

    if (password.length < 4) {
      throw new Error('密碼至少需要 4 個字元');
    }

    if (this.userExists(username)) {
      throw new Error('此帳號已被使用');
    }

    const users = this.getUsers();
    const userId = Date.now().toString();
    const passwordHash = await this.hashPassword(password);

    users[username] = {
      id: userId,
      passwordHash,
      createdAt: new Date().toISOString()
    };

    this.saveUsers(users);

    // 註冊後自動登入
    this.setAuthToken(userId, username);

    return { userId, username };
  },

  // 登入
  async login(username, password) {
    if (!username || !password) {
      throw new Error('請輸入帳號和密碼');
    }

    const users = this.getUsers();
    const user = users[username];

    if (!user) {
      throw new Error('帳號或密碼錯誤');
    }

    const passwordHash = await this.hashPassword(password);

    if (user.passwordHash !== passwordHash) {
      throw new Error('帳號或密碼錯誤');
    }

    this.setAuthToken(user.id, username);

    return { userId: user.id, username };
  },

  // 設定認證 Token
  setAuthToken(userId, username) {
    const expiry = Date.now() + this.TOKEN_DURATION;
    localStorage.setItem(this.STORAGE_KEYS.TOKEN, userId);
    localStorage.setItem(this.STORAGE_KEYS.EXPIRY, expiry.toString());
    localStorage.setItem(this.STORAGE_KEYS.CURRENT_USER, username);
  },

  // 檢查是否已登入
  isLoggedIn() {
    const token = localStorage.getItem(this.STORAGE_KEYS.TOKEN);
    const expiry = localStorage.getItem(this.STORAGE_KEYS.EXPIRY);

    if (!token || !expiry) {
      return false;
    }

    if (Date.now() > parseInt(expiry)) {
      this.logout();
      return false;
    }

    return true;
  },

  // 取得當前用戶
  getCurrentUser() {
    if (!this.isLoggedIn()) {
      return null;
    }

    return {
      userId: localStorage.getItem(this.STORAGE_KEYS.TOKEN),
      username: localStorage.getItem(this.STORAGE_KEYS.CURRENT_USER)
    };
  },

  // 登出
  logout() {
    localStorage.removeItem(this.STORAGE_KEYS.TOKEN);
    localStorage.removeItem(this.STORAGE_KEYS.EXPIRY);
    localStorage.removeItem(this.STORAGE_KEYS.CURRENT_USER);
  },

  // 取得用戶專屬的 Storage Key
  getUserStorageKey(baseKey) {
    const user = this.getCurrentUser();
    if (!user) return baseKey;
    return `${baseKey}_${user.userId}`;
  }
};
