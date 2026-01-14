// 認證模組 - 簡化版（密碼驗證由 PHP 處理）
const Auth = {
  TOKEN_KEY: 'travelChecklist_token',

  // 登入
  async login(password) {
    if (!password) {
      throw new Error('請輸入密碼');
    }

    const response = await fetch('api/login.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message);
    }

    // 儲存 token 到 sessionStorage（關閉瀏覽器後失效）
    sessionStorage.setItem(this.TOKEN_KEY, result.token);

    return true;
  },

  // 檢查是否已登入
  isLoggedIn() {
    return !!sessionStorage.getItem(this.TOKEN_KEY);
  },

  // 登出
  logout() {
    sessionStorage.removeItem(this.TOKEN_KEY);
  }
};
