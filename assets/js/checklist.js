// 清單管理模組
const Checklist = {
  // 載入預設清單 (僅初次使用)
  async loadDefaultChecklist() {
    try {
      const response = await fetch('data/default-checklist.json');
      const data = await response.json();

      // 寫入預設分類與物品
      for (const category of data.categories) {
        const checklistId = await Storage.add('checklists', {
          userId: null,
          categoryName: category.name,
          categoryOrder: category.order,
          isDefault: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        // 寫入該分類的物品
        for (const item of category.items) {
          await Storage.add('checkItems', {
            checklistId,
            userId: null,
            itemName: item.name,
            itemOrder: item.order,
            checked: false,
            isDefault: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error('載入預設清單失敗:', error);
      throw error;
    }
  },

  // 取得用戶清單
  async getUserChecklists(userId) {
    const checklists = await Storage.query('checklists', 'userId', userId);
    return checklists.sort((a, b) => a.categoryOrder - b.categoryOrder);
  },

  // 取得管理者的預設清單
  async getDefaultChecklists() {
    const allChecklists = await Storage.getAll('checklists');
    const defaultChecklists = allChecklists.filter(c => c.userId === null && c.isDefault);
    return defaultChecklists.sort((a, b) => a.categoryOrder - b.categoryOrder);
  },

  // 新增分類
  async addCategory(userId, categoryName) {
    const existingChecklists = await this.getUserChecklists(userId);
    const maxOrder = existingChecklists.length > 0
      ? Math.max(...existingChecklists.map(c => c.categoryOrder))
      : -1;

    return await Storage.add('checklists', {
      userId,
      categoryName,
      categoryOrder: maxOrder + 1,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  },

  // 更新分類
  async updateCategory(checklistId, data) {
    const checklist = await Storage.get('checklists', checklistId);
    if (!checklist) throw new Error('分類不存在');

    Object.assign(checklist, data);
    checklist.updatedAt = new Date().toISOString();
    await Storage.update('checklists', checklist);
  },

  // 刪除分類
  async deleteCategory(checklistId) {
    // 刪除該分類下的所有物品
    const items = await Storage.query('checkItems', 'checklistId', checklistId);
    for (const item of items) {
      await Storage.delete('checkItems', item.id);
    }

    // 刪除分類
    await Storage.delete('checklists', checklistId);
  },

  // 重新排序分類
  async reorderCategories(userId, orderedIds) {
    const checklists = await this.getUserChecklists(userId);
    const updates = [];

    orderedIds.forEach((id, index) => {
      const checklist = checklists.find(c => c.id === id);
      if (checklist) {
        checklist.categoryOrder = index;
        checklist.updatedAt = new Date().toISOString();
        updates.push(checklist);
      }
    });

    await Storage.batchUpdate('checklists', updates);
  },

  // 取得分類下的物品
  async getItemsByCategory(checklistId) {
    const items = await Storage.query('checkItems', 'checklistId', checklistId);
    return items.sort((a, b) => a.itemOrder - b.itemOrder);
  },

  // 新增物品
  async addItem(checklistId, userId, itemName) {
    const existingItems = await this.getItemsByCategory(checklistId);
    const maxOrder = existingItems.length > 0
      ? Math.max(...existingItems.map(item => item.itemOrder))
      : -1;

    return await Storage.add('checkItems', {
      checklistId,
      userId,
      itemName,
      itemOrder: maxOrder + 1,
      checked: false,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  },

  // 更新物品
  async updateItem(itemId, data) {
    const item = await Storage.get('checkItems', itemId);
    if (!item) throw new Error('物品不存在');

    Object.assign(item, data);
    item.updatedAt = new Date().toISOString();
    await Storage.update('checkItems', item);
  },

  // 刪除物品
  async deleteItem(itemId) {
    await Storage.delete('checkItems', itemId);
  },

  // 重新排序物品
  async reorderItems(checklistId, orderedIds) {
    const items = await this.getItemsByCategory(checklistId);
    const updates = [];

    orderedIds.forEach((id, index) => {
      const item = items.find(i => i.id === id);
      if (item) {
        item.itemOrder = index;
        item.updatedAt = new Date().toISOString();
        updates.push(item);
      }
    });

    await Storage.batchUpdate('checkItems', updates);
  },

  // 切換勾選狀態
  async toggleCheck(itemId) {
    const item = await Storage.get('checkItems', itemId);
    if (!item) throw new Error('物品不存在');

    item.checked = !item.checked;
    item.updatedAt = new Date().toISOString();
    await Storage.update('checkItems', item);
    return item.checked;
  },

  // 重設所有勾選
  async resetAllChecks(userId) {
    const allItems = await Storage.query('checkItems', 'userId', userId);
    const updates = allItems.map(item => {
      item.checked = false;
      item.updatedAt = new Date().toISOString();
      return item;
    });

    await Storage.batchUpdate('checkItems', updates);
  },

  // 取得勾選統計
  async getCheckStats(userId) {
    const allItems = await Storage.query('checkItems', 'userId', userId);
    const checkedCount = allItems.filter(item => item.checked).length;
    const totalCount = allItems.length;

    return {
      checked: checkedCount,
      total: totalCount,
      percentage: totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0
    };
  }
};
