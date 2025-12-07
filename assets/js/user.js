// 用戶管理模組
const User = {
  // 取得所有用戶
  async getAllUsers() {
    return await Storage.getAll('users');
  },

  // 取得當前用戶
  async getCurrentUser() {
    const setting = await Storage.get('settings', 'currentUserId');
    if (!setting || !setting.value) return null;
    return await Storage.get('users', setting.value);
  },

  // 設定當前用戶
  async setCurrentUser(userId) {
    await Storage.update('settings', {
      key: 'currentUserId',
      value: userId
    });
  },

  // 切換用戶
  async switchUser(userId) {
    const user = await Storage.get('users', userId);
    if (!user) throw new Error('用戶不存在');

    await this.setCurrentUser(userId);
    await this.updateLastActive(userId);
    return user;
  },

  // 建立用戶
  async createUser(name, isAdmin = false) {
    const userData = {
      name,
      isAdmin,
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString()
    };

    const userId = await Storage.add('users', userData);

    // 新用戶自動複製預設清單
    await this.copyDefaultChecklist(userId);

    return userId;
  },

  // 刪除用戶
  async deleteUser(userId) {
    // 檢查是否為最後一個用戶
    const allUsers = await this.getAllUsers();
    if (allUsers.length === 1) {
      throw new Error('無法刪除最後一個用戶');
    }

    // 刪除用戶的所有清單
    const userChecklists = await Storage.query('checklists', 'userId', userId);
    for (const checklist of userChecklists) {
      await Storage.delete('checklists', checklist.id);

      // 刪除該分類下的所有物品
      const items = await Storage.query('checkItems', 'checklistId', checklist.id);
      for (const item of items) {
        await Storage.delete('checkItems', item.id);
      }
    }

    // 刪除用戶
    await Storage.delete('users', userId);

    // 如果刪除的是當前用戶，切換到第一個用戶
    const currentUser = await this.getCurrentUser();
    if (!currentUser || currentUser.id === userId) {
      const remainingUsers = await this.getAllUsers();
      if (remainingUsers.length > 0) {
        await this.setCurrentUser(remainingUsers[0].id);
      }
    }
  },

  // 設定管理者
  async setAdmin(userId, isAdmin) {
    const user = await Storage.get('users', userId);
    if (!user) throw new Error('用戶不存在');

    user.isAdmin = isAdmin;
    await Storage.update('users', user);
  },

  // 更新最後活動時間
  async updateLastActive(userId) {
    const user = await Storage.get('users', userId);
    if (user) {
      user.lastActive = new Date().toISOString();
      await Storage.update('users', user);
    }
  },

  // 複製預設清單給新用戶
  async copyDefaultChecklist(userId) {
    // 取得所有預設分類 (userId = null)
    const allChecklists = await Storage.getAll('checklists');
    const defaultChecklists = allChecklists.filter(c => c.userId === null && c.isDefault);

    for (const defaultChecklist of defaultChecklists) {
      // 建立用戶專屬分類
      const newChecklistId = await Storage.add('checklists', {
        userId,
        categoryName: defaultChecklist.categoryName,
        categoryOrder: defaultChecklist.categoryOrder,
        isDefault: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // 取得該預設分類的所有物品
      const allItems = await Storage.getAll('checkItems');
      const defaultItems = allItems.filter(item =>
        item.checklistId === defaultChecklist.id &&
        item.userId === null &&
        item.isDefault
      );

      // 複製物品給新用戶
      for (const defaultItem of defaultItems) {
        await Storage.add('checkItems', {
          checklistId: newChecklistId,
          userId,
          itemName: defaultItem.itemName,
          itemOrder: defaultItem.itemOrder,
          checked: false,
          isDefault: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    }
  }
};
