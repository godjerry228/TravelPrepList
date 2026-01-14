// 認證模組 - 純前端驗證（支援 GitHub Pages）
const Auth = {
  TOKEN_KEY: 'travelChecklist_token',
  // 密碼雜湊值 (SHA-256)
  PASSWORD_HASH: '23b7e21ee35a1a7923ab8dfecd0fa0302bc4e1c85877151e1e9d1f1978d8d188',

  // SHA-256 雜湊函數
  async sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  // 登入
  async login(password) {
    if (!password) {
      throw new Error('請輸入密碼');
    }

    const inputHash = await this.sha256(password);

    if (inputHash !== this.PASSWORD_HASH) {
      throw new Error('密碼錯誤');
    }

    // 產生隨機 token
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0')).join('');

    // 儲存 token 到 sessionStorage（關閉瀏覽器後失效）
    sessionStorage.setItem(this.TOKEN_KEY, token);

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
