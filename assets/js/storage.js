// IndexedDB 封裝模組
const Storage = {
  dbName: 'TravelChecklistDB',
  dbVersion: 1,
  db: null,

  // 初始化資料庫
  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // 建立 users 資料表
        if (!db.objectStoreNames.contains('users')) {
          const userStore = db.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
          userStore.createIndex('name', 'name', { unique: false });
          userStore.createIndex('isAdmin', 'isAdmin', { unique: false });
        }

        // 建立 checklists 資料表
        if (!db.objectStoreNames.contains('checklists')) {
          const checklistStore = db.createObjectStore('checklists', { keyPath: 'id', autoIncrement: true });
          checklistStore.createIndex('userId', 'userId', { unique: false });
          checklistStore.createIndex('categoryOrder', 'categoryOrder', { unique: false });
        }

        // 建立 checkItems 資料表
        if (!db.objectStoreNames.contains('checkItems')) {
          const itemStore = db.createObjectStore('checkItems', { keyPath: 'id', autoIncrement: true });
          itemStore.createIndex('checklistId', 'checklistId', { unique: false });
          itemStore.createIndex('userId', 'userId', { unique: false });
          itemStore.createIndex('checked', 'checked', { unique: false });
        }

        // 建立 settings 資料表
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
    });
  },

  // 取得 ObjectStore
  getStore(storeName, mode = 'readonly') {
    const transaction = this.db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  },

  // 新增資料
  async add(storeName, data) {
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName, 'readwrite');
      const request = store.add(data);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  // 取得單筆資料
  async get(storeName, id) {
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  // 取得全部資料
  async getAll(storeName) {
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  // 更新資料
  async update(storeName, data) {
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName, 'readwrite');
      const request = store.put(data);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  // 刪除資料
  async delete(storeName, id) {
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName, 'readwrite');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  // 索引查詢
  async query(storeName, indexName, value) {
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  // 批次更新
  async batchUpdate(storeName, dataArray) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      dataArray.forEach(data => store.put(data));

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  },

  // 清空資料表
  async clear(storeName) {
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName, 'readwrite');
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
};
