// 主應用程式 - 多用戶模式
const App = {
  sortableInstances: [],
  eventsBound: false,

  // 目前用戶的清單儲存鍵
  get STORAGE_KEY() {
    const userId = Users.getCurrentId();
    return userId ? Users.dataKey(userId) : 'tc_data_none';
  },

  // 啟動應用程式（入口點）
  start() {
    Users.migrateLegacyData();
    this.bindUserScreenEvents();

    const current = Users.getCurrent();
    if (current) {
      this.enterApp();
    } else {
      this.showUserScreen();
    }
  },

  // 顯示用戶選擇畫面
  showUserScreen() {
    document.getElementById('userScreen').classList.remove('hidden');
    document.getElementById('appContainer').classList.add('hidden');
    document.getElementById('appFooter').classList.add('hidden');
    this.renderUserList();
  },

  // 顯示主應用程式
  showApp() {
    document.getElementById('userScreen').classList.add('hidden');
    document.getElementById('appContainer').classList.remove('hidden');
    document.getElementById('appFooter').classList.remove('hidden');
  },

  // 進入主畫面並初始化
  async enterApp() {
    this.showApp();
    const current = Users.getCurrent();
    document.getElementById('currentUserName').textContent = current ? current.name : '';

    try {
      await this.init();
    } catch (error) {
      this.showToast('初始化發生問題：' + error.message, 'error');
    }
  },

  // 渲染用戶卡片清單
  renderUserList() {
    const container = document.getElementById('userList');
    const users = Users.getAll();

    if (users.length === 0) {
      container.innerHTML = '<p class="user-list-empty">尚無用戶，請先新增一位</p>';
      return;
    }

    container.innerHTML = users.map(u => `
      <div class="user-card" data-userid="${u.id}">
        <button type="button" class="user-card-main" data-userid="${u.id}">
          <span class="user-avatar">${this.escapeHtml(u.name.charAt(0))}</span>
          <span class="user-card-name">${this.escapeHtml(u.name)}</span>
        </button>
        <button type="button" class="user-delete-btn" data-userid="${u.id}" aria-label="刪除用戶">✕</button>
      </div>
    `).join('');
  },

  // 綁定用戶選擇畫面事件
  bindUserScreenEvents() {
    document.getElementById('addUserBtn').addEventListener('click', () => {
      this.showAddUserModal();
    });

    document.getElementById('userList').addEventListener('click', async (e) => {
      const deleteBtn = e.target.closest('.user-delete-btn');
      if (deleteBtn) {
        await this.confirmDeleteUser(deleteBtn.dataset.userid);
        return;
      }

      const mainBtn = e.target.closest('.user-card-main');
      if (mainBtn) {
        Users.setCurrent(mainBtn.dataset.userid);
        await this.enterApp();
      }
    });
  },

  // 新增用戶彈窗（輸入名稱後選擇清單來源）
  async showAddUserModal() {
    const { value: name } = await Swal.fire({
      title: '新增用戶',
      input: 'text',
      inputPlaceholder: '請輸入用戶名稱',
      showCancelButton: true,
      confirmButtonText: '下一步',
      cancelButtonText: '取消',
      inputValidator: (value) => {
        if (!value || !value.trim()) return '請輸入用戶名稱';
        if (Users.getAll().some(u => u.name === value.trim())) return '已有相同名稱的用戶';
      }
    });

    if (!name) return;

    // 選擇清單來源
    const source = await Swal.fire({
      title: `「${name.trim()}」的清單要用哪一份？`,
      icon: 'question',
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: '使用預設清單',
      denyButtonText: '匯入 JSON 檔案',
      cancelButtonText: '取消',
      confirmButtonColor: '#3b82f6',
      denyButtonColor: '#6366f1',
      cancelButtonColor: '#6b7280'
    });

    if (!source.isConfirmed && !source.isDenied) return;

    // 選擇匯入時，先確認檔案讀取成功才建立用戶，避免留下半成品
    let importedData = null;
    if (source.isDenied) {
      importedData = await this.pickChecklistFile();
      if (!importedData) return;
    }

    let user;
    try {
      user = Users.create(name);
    } catch (error) {
      this.showAlert(error.message, 'error');
      return;
    }

    try {
      if (importedData) {
        localStorage.setItem(Users.dataKey(user.id), JSON.stringify(importedData));
      }
      // 使用預設清單時不寫入資料，進入清單後會自動載入預設內容

      this.renderUserList();
      this.showToast(`已建立用戶「${user.name}」`, 'success');
    } catch (error) {
      // 寫入失敗就把剛建立的用戶收回，維持資料一致
      Users.remove(user.id);
      this.renderUserList();
      this.showAlert('建立失敗，可能是本機空間不足', 'error');
    }
  },

  // 刪除用戶確認
  async confirmDeleteUser(userId) {
    const user = Users.getAll().find(u => u.id === userId);
    if (!user) return;

    const result = await Swal.fire({
      title: `確定刪除「${user.name}」？`,
      text: '該用戶的清單與勾選進度將一併刪除，無法復原',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: '確定刪除',
      cancelButtonText: '取消'
    });

    if (!result.isConfirmed) return;

    Users.remove(userId);
    this.renderUserList();
    this.showToast('用戶已刪除', 'success');
  },

  // 切換用戶（返回選擇畫面）
  handleSwitchUser() {
    Users.clearCurrent();
    this.showUserScreen();
  },

  // 初始化應用程式（選定用戶後）
  async init() {
    try {
      // 載入用戶清單資料
      await this.loadUserData();

      // 渲染介面
      await this.renderChecklist();
      await this.updateStats();

      // 綁定事件（只綁一次，避免切換用戶時重複綁定）
      if (!this.eventsBound) {
        this.bindEvents();
        this.eventsBound = true;
      }
    } catch (error) {
      console.error('初始化失敗:', error);
      this.showToast('初始化失敗: ' + error.message, 'error');
    }
  },

  // 載入用戶資料
  async loadUserData() {
    const savedData = localStorage.getItem(this.STORAGE_KEY);

    if (!savedData) {
      // 該用戶初次使用，載入預設清單
      await this.loadDefaultChecklist();
    }
  },

  // 載入預設清單
  async loadDefaultChecklist() {
    try {
      const response = await fetch('data/default-checklist.json');
      const data = await response.json();

      const checklistData = {
        categories: data.categories.map(cat => ({
          id: Date.now() + Math.random(),
          name: cat.name,
          order: cat.order,
          items: cat.items.map(item => ({
            id: Date.now() + Math.random(),
            name: item.name,
            order: item.order,
            checked: false,
            priority: item.priority || 0
          }))
        }))
      };

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(checklistData));
    } catch (error) {
      console.error('載入預設清單失敗:', error);
      throw error;
    }
  },

  // 取得清單資料
  getData() {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : { categories: [] };
  },

  // 儲存清單資料
  saveData(data) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  },

  // 渲染清單
  async renderChecklist() {
    const grid = document.getElementById('checklistGrid');
    const emptyState = document.getElementById('emptyState');

    const data = this.getData();

    if (data.categories.length === 0) {
      grid.innerHTML = '';
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');

    this.sortableInstances.forEach(s => s.destroy());
    this.sortableInstances = [];

    // 排序分類
    data.categories.sort((a, b) => a.order - b.order);

    grid.innerHTML = data.categories.map((cat, index) => this.renderCategory(cat, index)).join('');

    // 初始化分類拖曳排序
    new Sortable(grid, {
      animation: 150,
      handle: '.category-drag-handle',
      onEnd: () => this.saveCategoryOrder()
    });

    // 初始化每個分類內的物品拖曳排序
    data.categories.forEach(cat => {
      const itemList = document.getElementById(`items-${cat.id}`);
      if (itemList) {
        const sortable = new Sortable(itemList, {
          animation: 150,
          handle: '.drag-handle',
          onEnd: () => this.saveItemOrder(cat.id)
        });
        this.sortableInstances.push(sortable);
      }
    });
  },

  // 計算分類完成度
  getCategoryProgress(category) {
    const items = category.items || [];
    if (items.length === 0) return { checked: 0, total: 0, percentage: 0 };

    const checked = items.filter(item => item.checked).length;
    return {
      checked,
      total: items.length,
      percentage: Math.round((checked / items.length) * 100)
    };
  },

  // 渲染單一分類卡片
  renderCategory(category, index) {
    const items = category.items || [];
    items.sort((a, b) => a.order - b.order);

    const progress = this.getCategoryProgress(category);

    return `
      <div class="category-card animate-fade-in" data-category-id="${category.id}">
        <!-- 分類標題 -->
        <div class="category-header">
          <div class="category-drag-handle drag-handle">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
          </div>
          <h3 class="category-name">${category.name}</h3>
          <div class="category-progress">
            <div class="category-progress-bar">
              <div class="category-progress-fill" style="width: ${progress.percentage}%"></div>
            </div>
            <span>${progress.checked}/${progress.total}</span>
          </div>
          <button class="category-more-btn" data-category-id="${category.id}" title="更多選項">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path>
            </svg>
          </button>
        </div>

        <!-- 物品列表 -->
        <div id="items-${category.id}" class="item-list">
          ${items.map(item => this.renderItem(item)).join('')}
        </div>

        ${items.length === 0 ? '<p class="text-center text-gray-400 py-4 text-sm">尚無物品，點擊 ⋮ 新增</p>' : ''}
      </div>
    `;
  },

  // 渲染單一物品（簡化版：長按/右鍵/更多按鈕開啟選單）
  renderItem(item) {
    const priority = item.priority || 0;
    const priorityDots = this.renderPriorityDots(priority);
    const checkedClass = item.checked ? 'checked' : '';

    return `
      <div class="item-row ${checkedClass}" data-item-id="${item.id}">
        <div class="drag-handle">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
          </svg>
        </div>
        <div class="check-circle">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        <span class="item-name">${item.name}</span>
        ${priorityDots}
        <button class="item-more-btn" data-item-id="${item.id}" title="更多選項">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path>
          </svg>
        </button>
      </div>
    `;
  },

  // 渲染優先級小圓點
  renderPriorityDots(priority) {
    if (priority === 0) return '';

    const dots = [];
    for (let i = 0; i < priority && i < 5; i++) {
      dots.push('<span class="priority-dot"></span>');
    }

    return `<div class="priority-dots">${dots.join('')}</div>`;
  },

  // 綁定事件
  bindEvents() {
    // 選單按鈕
    document.getElementById('menuBtn').addEventListener('click', () => {
      this.toggleMenu(true);
    });

    document.getElementById('closeMenuBtn').addEventListener('click', () => {
      this.toggleMenu(false);
    });

    // 點擊選單背景關閉（點擊空白處）
    document.getElementById('fullscreenMenu').addEventListener('click', (e) => {
      if (e.target.id === 'fullscreenMenu') {
        this.toggleMenu(false);
      }
    });

    // 選單內的功能按鈕
    document.getElementById('addCategoryBtn').addEventListener('click', () => {
      this.toggleMenu(false);
      this.showAddCategoryModal();
    });

    document.getElementById('resetAllBtn').addEventListener('click', () => {
      this.toggleMenu(false);
      this.showResetConfirmModal();
    });

    document.getElementById('checkUpdateBtn').addEventListener('click', () => {
      this.toggleMenu(false);
      this.checkForUpdate();
    });

    document.getElementById('importJsonBtn').addEventListener('click', () => {
      this.toggleMenu(false);
      this.triggerImportJson();
    });

    document.getElementById('exportJsonBtn').addEventListener('click', () => {
      this.toggleMenu(false);
      this.exportJson();
    });

    document.getElementById('importFileInput').addEventListener('change', (e) => {
      this.handleImportFile(e.target.files[0]);
    });

    document.getElementById('switchUserBtn').addEventListener('click', () => {
      this.toggleMenu(false);
      this.handleSwitchUser();
    });

    const grid = document.getElementById('checklistGrid');

    // 點擊事件
    grid.addEventListener('click', async (e) => {
      // 處理物品「更多」按鈕
      if (e.target.closest('.item-more-btn')) {
        e.stopPropagation();
        const btn = e.target.closest('.item-more-btn');
        this.showItemActionMenu(btn.dataset.itemId);
        return;
      }

      // 處理分類「更多」按鈕
      if (e.target.closest('.category-more-btn')) {
        e.stopPropagation();
        const btn = e.target.closest('.category-more-btn');
        this.showCategoryActionMenu(btn.dataset.categoryId);
        return;
      }

      // 處理項目列點擊（打勾）- 排除拖曳手柄和更多按鈕
      const itemRow = e.target.closest('.item-row');
      if (itemRow && !e.target.closest('.drag-handle') && !e.target.closest('.item-more-btn')) {
        this.handleItemCheck(itemRow.dataset.itemId, itemRow);
        return;
      }
    });
  },

  // 顯示分類操作選單
  async showCategoryActionMenu(categoryId) {
    const data = this.getData();
    const category = data.categories.find(c => String(c.id) === String(categoryId));

    if (!category) return;

    const result = await Swal.fire({
      title: category.name,
      html: '<p class="text-gray-500">選擇要執行的操作</p>',
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: '➕ 新增物品',
      denyButtonText: '✏️ 編輯名稱',
      cancelButtonText: '關閉',
      confirmButtonColor: '#3b82f6',
      denyButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      footer: '<button id="delete-category-btn" class="text-red-500 hover:text-red-700 text-sm underline">🗑️ 刪除此分類</button>',
      didOpen: () => {
        document.getElementById('delete-category-btn').addEventListener('click', async () => {
          Swal.close();
          this.handleDeleteCategory(categoryId);
        });
      }
    });

    if (result.isConfirmed) {
      this.showAddItemModal(categoryId);
    } else if (result.isDenied) {
      this.editCategory(categoryId);
    }
  },

  // 顯示物品操作選單
  async showItemActionMenu(itemId) {
    const data = this.getData();
    let foundItem = null;
    let foundCat = null;

    for (const cat of data.categories) {
      const item = cat.items.find(i => String(i.id) === String(itemId));
      if (item) {
        foundItem = item;
        foundCat = cat;
        break;
      }
    }

    if (!foundItem) return;

    // 震動回饋（如果支援）
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    const currentPriority = foundItem.priority || 0;

    const result = await Swal.fire({
      title: foundItem.name,
      html: `
        <div class="item-action-menu">
          <div class="action-menu-section">
            <label class="action-menu-label">重要程度</label>
            <div id="star-rating" class="flex gap-2 justify-center text-3xl cursor-pointer">
              <span class="star" data-value="1">☆</span>
              <span class="star" data-value="2">☆</span>
              <span class="star" data-value="3">☆</span>
              <span class="star" data-value="4">☆</span>
              <span class="star" data-value="5">☆</span>
            </div>
            <button id="clear-stars-btn" type="button" class="text-sm text-gray-500 mt-2 underline">清除星號</button>
          </div>
        </div>
      `,
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: '編輯名稱',
      denyButtonText: '刪除物品',
      cancelButtonText: '關閉',
      confirmButtonColor: '#3b82f6',
      denyButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      didOpen: () => {
        let selectedRating = currentPriority;
        const stars = document.querySelectorAll('.star');

        const updateStars = (rating) => {
          stars.forEach((star, index) => {
            if (index < rating) {
              star.textContent = '★';
              star.style.color = '#fbbf24';
            } else {
              star.textContent = '☆';
              star.style.color = '#d1d5db';
            }
          });
        };

        updateStars(selectedRating);

        stars.forEach((star) => {
          star.addEventListener('click', function() {
            selectedRating = parseInt(this.dataset.value);
            updateStars(selectedRating);
            // 立即儲存星星變更
            foundItem.priority = selectedRating;
            App.saveData(data);
            App.renderChecklist();
            App.updateStats();
          });
        });

        document.getElementById('clear-stars-btn').addEventListener('click', () => {
          selectedRating = 0;
          updateStars(0);
          foundItem.priority = 0;
          App.saveData(data);
          App.renderChecklist();
          App.updateStats();
        });
      }
    });

    if (result.isConfirmed) {
      // 編輯名稱
      const { value: newName } = await Swal.fire({
        title: '編輯物品名稱',
        input: 'text',
        inputValue: foundItem.name,
        showCancelButton: true,
        confirmButtonText: '確定',
        cancelButtonText: '取消',
        inputValidator: (value) => {
          if (!value) return '請輸入物品名稱';
        }
      });

      if (newName && newName.trim() !== foundItem.name) {
        foundItem.name = newName.trim();
        this.saveData(data);
        this.renderChecklist();
        this.showToast('已更新物品名稱', 'success');
      }
    } else if (result.isDenied) {
      // 刪除物品
      const confirmDelete = await Swal.fire({
        title: '確定刪除？',
        text: `確定要刪除「${foundItem.name}」嗎？`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#6b7280',
        confirmButtonText: '確定刪除',
        cancelButtonText: '取消'
      });

      if (confirmDelete.isConfirmed) {
        this.handleDeleteItem(itemId);
      }
    }
  },

  // 切換選單
  toggleMenu(show) {
    const menu = document.getElementById('fullscreenMenu');

    if (show) {
      menu.classList.add('open');
      document.body.style.overflow = 'hidden';
    } else {
      menu.classList.remove('open');
      document.body.style.overflow = '';
    }
  },

  // 處理物品勾選
  handleItemCheck(itemId, itemRow) {
    const data = this.getData();

    for (const cat of data.categories) {
      const item = cat.items.find(i => String(i.id) === String(itemId));
      if (item) {
        item.checked = !item.checked;
        this.saveData(data);

        // 立即更新 UI 而不重新渲染整個列表
        if (item.checked) {
          itemRow.classList.add('checked');
          const checkCircle = itemRow.querySelector('.check-circle');
          if (checkCircle) checkCircle.classList.add('check-pop');
        } else {
          itemRow.classList.remove('checked');
        }

        // 更新分類進度
        this.updateCategoryProgress(cat.id);
        this.updateStats();
        return;
      }
    }
  },

  // 更新單一分類的進度顯示
  updateCategoryProgress(categoryId) {
    const data = this.getData();
    const cat = data.categories.find(c => String(c.id) === String(categoryId));
    if (!cat) return;

    const progress = this.getCategoryProgress(cat);
    const card = document.querySelector(`[data-category-id="${categoryId}"]`);
    if (!card) return;

    const progressBar = card.querySelector('.category-progress-fill');
    const progressText = card.querySelector('.category-progress span');

    if (progressBar) progressBar.style.width = `${progress.percentage}%`;
    if (progressText) progressText.textContent = `${progress.checked}/${progress.total}`;
  },

  // 處理刪除分類
  async handleDeleteCategory(categoryId) {
    const result = await Swal.fire({
      title: '確定刪除？',
      text: '此分類及其所有物品將被刪除，無法復原',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: '確定刪除',
      cancelButtonText: '取消'
    });

    if (result.isConfirmed) {
      const data = this.getData();
      data.categories = data.categories.filter(cat => String(cat.id) !== String(categoryId));
      this.saveData(data);
      this.renderChecklist();
      this.updateStats();
      this.showToast('分類已刪除', 'success');
    }
  },

  // 處理刪除物品
  handleDeleteItem(itemId) {
    const data = this.getData();

    for (const cat of data.categories) {
      const index = cat.items.findIndex(i => String(i.id) === String(itemId));
      if (index !== -1) {
        cat.items.splice(index, 1);
        this.saveData(data);
        this.renderChecklist();
        this.updateStats();
        this.showToast('物品已刪除', 'success');
        return;
      }
    }
  },

  // 儲存分類排序
  saveCategoryOrder() {
    const grid = document.getElementById('checklistGrid');
    const categoryCards = grid.querySelectorAll('[data-category-id]');
    const orderedIds = Array.from(categoryCards).map(card => card.dataset.categoryId);

    const data = this.getData();
    orderedIds.forEach((id, index) => {
      const cat = data.categories.find(c => String(c.id) === String(id));
      if (cat) cat.order = index;
    });

    this.saveData(data);
  },

  // 儲存物品排序
  saveItemOrder(categoryId) {
    const itemList = document.getElementById(`items-${categoryId}`);
    const itemElements = itemList.querySelectorAll('[data-item-id]');
    const orderedIds = Array.from(itemElements).map(el => el.dataset.itemId);

    const data = this.getData();
    const cat = data.categories.find(c => String(c.id) === String(categoryId));

    if (cat) {
      orderedIds.forEach((id, index) => {
        const item = cat.items.find(i => String(i.id) === String(id));
        if (item) item.order = index;
      });

      this.saveData(data);
    }
  },

  // 更新統計
  updateStats() {
    const data = this.getData();
    let totalCount = 0;
    let checkedCount = 0;
    let totalScore = 0;
    let earnedScore = 0;

    data.categories.forEach(cat => {
      cat.items.forEach(item => {
        totalCount++;

        const itemWeight = item.priority === 0 ? 1 :
                          item.priority === 1 ? 2 :
                          item.priority === 2 ? 3 :
                          item.priority === 3 ? 5 :
                          item.priority === 4 ? 8 : 13;

        totalScore += itemWeight;

        if (item.checked) {
          checkedCount++;
          earnedScore += itemWeight;
        }
      });
    });

    const percentage = totalScore > 0 ? Math.round((earnedScore / totalScore) * 100) : 0;

    document.getElementById('bannerCheckedCount').textContent = checkedCount;
    document.getElementById('bannerTotalCount').textContent = totalCount;

    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const progressSlogan = document.getElementById('progressSlogan');

    progressBar.style.width = `${percentage}%`;
    progressText.textContent = `${percentage}%`;

    // 根據進度改變顏色等級和標語
    let slogan = '';
    let levelClass = '';
    let sloganColor = '';

    if (percentage === 100) {
      slogan = '完美！準備出發！✈️';
      levelClass = 'level-4';
      sloganColor = 'text-green-600';
    } else if (percentage >= 90) {
      slogan = '快完成囉！加油！🎉';
      levelClass = 'level-4';
      sloganColor = 'text-green-600';
    } else if (percentage >= 60) {
      slogan = '做得不錯，繼續努力！💪';
      levelClass = 'level-3';
      sloganColor = 'text-blue-600';
    } else if (percentage >= 30) {
      slogan = '還有一半，加把勁！⚡';
      levelClass = 'level-2';
      sloganColor = 'text-yellow-600';
    } else if (percentage > 0) {
      slogan = '剛開始，慢慢來！📝';
      levelClass = 'level-1';
      sloganColor = 'text-orange-600';
    } else {
      slogan = '開始整理行李吧！🧳';
      levelClass = 'level-0';
      sloganColor = 'text-gray-600';
    }

    progressSlogan.textContent = slogan;
    progressSlogan.className = `progress-slogan ${sloganColor}`;

    // 更新進度條顏色等級
    progressBar.className = `progress-bar-fill ${levelClass}`;
  },

  // 編輯物品
  async editItem(itemId) {
    const data = this.getData();
    let foundItem = null;

    for (const cat of data.categories) {
      const item = cat.items.find(i => String(i.id) === String(itemId));
      if (item) {
        foundItem = item;
        break;
      }
    }

    if (!foundItem) return;

    const currentPriority = foundItem.priority || 0;

    const result = await Swal.fire({
      title: '編輯物品',
      html: `
        <div class="space-y-4">
          <div>
            <label class="block text-left text-sm font-medium text-gray-700 mb-2">物品名稱</label>
            <input id="item-name-input" type="text" value="${foundItem.name}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>
          <div>
            <label class="block text-left text-sm font-medium text-gray-700 mb-2">重要程度</label>
            <div id="star-rating" class="flex gap-1 justify-center text-3xl cursor-pointer mb-2">
              <span class="star" data-value="1">☆</span>
              <span class="star" data-value="2">☆</span>
              <span class="star" data-value="3">☆</span>
              <span class="star" data-value="4">☆</span>
              <span class="star" data-value="5">☆</span>
            </div>
            <div class="text-center">
              <button id="clear-stars-btn" type="button" class="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300">清除星號</button>
            </div>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: '確定',
      cancelButtonText: '取消',
      didOpen: () => {
        let selectedRating = currentPriority;
        const stars = document.querySelectorAll('.star');

        const updateStars = (rating) => {
          stars.forEach((star, index) => {
            if (index < rating) {
              star.textContent = '★';
              star.style.color = '#fbbf24';
            } else {
              star.textContent = '☆';
              star.style.color = '#d1d5db';
            }
          });
        };

        updateStars(selectedRating);

        stars.forEach((star) => {
          star.addEventListener('click', function() {
            selectedRating = parseInt(this.dataset.value);
            updateStars(selectedRating);
          });
        });

        document.getElementById('clear-stars-btn').addEventListener('click', () => {
          selectedRating = 0;
          updateStars(0);
        });
      },
      preConfirm: () => {
        const name = document.getElementById('item-name-input').value;
        const stars = document.querySelectorAll('.star');
        let priority = 0;
        stars.forEach((star, index) => {
          if (star.textContent === '★') {
            priority = index + 1;
          }
        });

        if (!name) {
          Swal.showValidationMessage('請輸入物品名稱');
          return false;
        }

        return { name: name.trim(), priority };
      }
    });

    if (result.isConfirmed && result.value) {
      foundItem.name = result.value.name;
      foundItem.priority = result.value.priority;
      this.saveData(data);
      this.renderChecklist();
      this.showToast('已更新物品', 'success');
    }
  },

  // 編輯分類
  async editCategory(categoryId) {
    const data = this.getData();
    const cat = data.categories.find(c => String(c.id) === String(categoryId));

    if (!cat) return;

    const { value: newName } = await Swal.fire({
      title: '編輯分類名稱',
      input: 'text',
      inputValue: cat.name,
      showCancelButton: true,
      confirmButtonText: '確定',
      cancelButtonText: '取消',
      inputValidator: (value) => {
        if (!value) return '請輸入分類名稱';
      }
    });

    if (newName && newName.trim() !== cat.name) {
      cat.name = newName.trim();
      this.saveData(data);
      this.renderChecklist();
      this.showToast('已更新分類名稱', 'success');
    }
  },

  // 顯示新增分類彈窗
  async showAddCategoryModal() {
    const { value: categoryName } = await Swal.fire({
      title: '新增分類',
      input: 'text',
      inputPlaceholder: '請輸入分類名稱',
      showCancelButton: true,
      confirmButtonText: '新增',
      cancelButtonText: '取消',
      inputValidator: (value) => {
        if (!value) return '請輸入分類名稱';
      }
    });

    if (categoryName) {
      const data = this.getData();
      const maxOrder = data.categories.length > 0 ? Math.max(...data.categories.map(c => c.order)) : -1;

      data.categories.push({
        id: Date.now() + Math.random(),
        name: categoryName.trim(),
        order: maxOrder + 1,
        items: []
      });

      this.saveData(data);
      this.renderChecklist();
      this.showToast('分類已新增', 'success');
    }
  },

  // 顯示新增物品彈窗
  async showAddItemModal(categoryId) {
    const result = await Swal.fire({
      title: '新增物品',
      html: `
        <div class="space-y-4">
          <div>
            <label class="block text-left text-sm font-medium text-gray-700 mb-2">物品名稱</label>
            <input id="new-item-name-input" type="text" placeholder="請輸入物品名稱" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>
          <div>
            <label class="block text-left text-sm font-medium text-gray-700 mb-2">重要程度</label>
            <div id="star-rating" class="flex gap-1 justify-center text-3xl cursor-pointer mb-2">
              <span class="star" data-value="1">☆</span>
              <span class="star" data-value="2">☆</span>
              <span class="star" data-value="3">☆</span>
              <span class="star" data-value="4">☆</span>
              <span class="star" data-value="5">☆</span>
            </div>
            <div class="text-center">
              <button id="clear-stars-btn" type="button" class="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300">清除星號</button>
            </div>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: '新增',
      cancelButtonText: '取消',
      didOpen: () => {
        let selectedRating = 0;
        const stars = document.querySelectorAll('.star');

        const updateStars = (rating) => {
          stars.forEach((star, index) => {
            if (index < rating) {
              star.textContent = '★';
              star.style.color = '#fbbf24';
            } else {
              star.textContent = '☆';
              star.style.color = '#d1d5db';
            }
          });
        };

        stars.forEach((star) => {
          star.addEventListener('click', function() {
            selectedRating = parseInt(this.dataset.value);
            updateStars(selectedRating);
          });
        });

        document.getElementById('clear-stars-btn').addEventListener('click', () => {
          selectedRating = 0;
          updateStars(0);
        });
      },
      preConfirm: () => {
        const name = document.getElementById('new-item-name-input').value;
        const stars = document.querySelectorAll('.star');
        let priority = 0;
        stars.forEach((star, index) => {
          if (star.textContent === '★') {
            priority = index + 1;
          }
        });

        if (!name) {
          Swal.showValidationMessage('請輸入物品名稱');
          return false;
        }

        return { name: name.trim(), priority };
      }
    });

    if (result.isConfirmed && result.value) {
      const data = this.getData();
      const cat = data.categories.find(c => String(c.id) === String(categoryId));

      if (cat) {
        const maxOrder = cat.items.length > 0 ? Math.max(...cat.items.map(i => i.order)) : -1;

        cat.items.push({
          id: Date.now() + Math.random(),
          name: result.value.name,
          order: maxOrder + 1,
          checked: false,
          priority: result.value.priority
        });

        this.saveData(data);
        this.renderChecklist();
        this.updateStats();
        this.showToast('物品已新增', 'success');
      }
    }
  },

  // 顯示重設確認彈窗
  async showResetConfirmModal() {
    const result = await Swal.fire({
      title: '重設清單選項',
      html: `
        <p class="mb-4">請選擇重設方式：</p>
      `,
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: '只清除勾選',
      denyButtonText: '恢復預設清單',
      cancelButtonText: '取消',
      confirmButtonColor: '#3b82f6',
      denyButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280'
    });

    if (result.isConfirmed) {
      const data = this.getData();
      data.categories.forEach(cat => {
        cat.items.forEach(item => {
          item.checked = false;
        });
      });
      this.saveData(data);
      this.renderChecklist();
      this.updateStats();

      Swal.fire({
        title: '重設完成',
        text: '所有勾選已清除',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    } else if (result.isDenied) {
      const confirmRestore = await Swal.fire({
        title: '確定恢復預設清單？',
        text: '這將清除您所有的自訂內容，無法復原',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#6b7280',
        confirmButtonText: '確定恢復',
        cancelButtonText: '取消'
      });

      if (confirmRestore.isConfirmed) {
        localStorage.removeItem(this.STORAGE_KEY);
        await this.loadDefaultChecklist();
        await this.renderChecklist();
        this.updateStats();

        Swal.fire({
          title: '恢復完成',
          text: '已恢復為預設清單',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      }
    }
  },

  // 檢查更新
  async checkForUpdate() {
    try {
      // 清除 Service Worker 快取
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }

      // 清除瀏覽器快取並重新載入
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      this.showToast('正在更新...', 'info');

      // 強制重新載入頁面
      setTimeout(() => {
        location.reload(true);
      }, 1000);
    } catch (error) {
      console.error('更新失敗:', error);
      // 即使清除快取失敗，也嘗試重新載入
      location.reload(true);
    }
  },

  // HTML 逸出，避免用戶名稱含特殊字元破壞版面
  escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
  },

  // 驗證匯入的 JSON 結構
  validateChecklistJson(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('檔案格式不正確，缺少清單內容');
    }
    if (!Array.isArray(data.categories)) {
      throw new Error('檔案格式不正確，找不到分類資料');
    }
    data.categories.forEach((cat, i) => {
      if (!cat || typeof cat.name !== 'string' || !Array.isArray(cat.items)) {
        throw new Error(`第 ${i + 1} 個分類格式不正確`);
      }
      cat.items.forEach((item, j) => {
        if (!item || typeof item.name !== 'string') {
          throw new Error(`分類「${cat.name}」的第 ${j + 1} 個項目格式不正確`);
        }
      });
    });
    return true;
  },

  // 將匯入的資料轉為內部格式（補齊 id / order / checked / priority）
  normalizeImportedData(data) {
    let seed = Date.now();
    return {
      categories: data.categories.map((cat, ci) => ({
        id: ++seed + Math.random(),
        name: cat.name,
        order: typeof cat.order === 'number' ? cat.order : ci,
        items: cat.items.map((item, ii) => ({
          id: ++seed + Math.random(),
          name: item.name,
          order: typeof item.order === 'number' ? item.order : ii,
          checked: item.checked === true,
          priority: typeof item.priority === 'number' ? item.priority : 0
        }))
      }))
    };
  },

  // 觸發選擇本機 JSON 檔
  triggerImportJson() {
    const input = document.getElementById('importFileInput');
    input.value = '';
    input.click();
  },

  // 讀取並解析使用者選擇的 JSON 檔，失敗時回傳 null 並提示原因
  async readChecklistFile(file) {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      this.validateChecklistJson(parsed);
      return this.normalizeImportedData(parsed);
    } catch (error) {
      const message = error instanceof SyntaxError
        ? '檔案內容不是有效的 JSON'
        : error.message;
      this.showAlert('匯入失敗：' + message, 'error');
      return null;
    }
  },

  // 讓使用者選一個 JSON 檔並回傳解析後的清單（新增用戶流程使用）
  pickChecklistFile() {
    return new Promise((resolve) => {
      const input = document.getElementById('importFileInput');
      input.value = '';

      const onChange = async () => {
        cleanup();
        const file = input.files[0];
        resolve(file ? await this.readChecklistFile(file) : null);
      };

      // 使用者按取消時不會觸發 change，用視窗 focus 當作補救
      const onFocus = () => {
        setTimeout(() => {
          if (input.files.length === 0) {
            cleanup();
            resolve(null);
          }
        }, 500);
      };

      const cleanup = () => {
        input.removeEventListener('change', onChange);
        window.removeEventListener('focus', onFocus);
      };

      input.addEventListener('change', onChange);
      window.addEventListener('focus', onFocus, { once: true });
      input.click();
    });
  },

  // 處理選到的 JSON 檔（主畫面選單的「匯入清單檔」）
  async handleImportFile(file) {
    if (!file) return;

    const newData = await this.readChecklistFile(file);
    if (!newData) return;

    // 該用戶沒有清單時直接匯入，不需多問
    if (this.getData().categories.length === 0) {
      this.saveData(newData);
      await this.renderChecklist();
      this.updateStats();
      this.showToast('清單已匯入', 'success');
      return;
    }

    const result = await Swal.fire({
      title: '確定要取代目前清單？',
      text: '目前的清單內容與勾選進度將被覆蓋，無法復原',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: '確定取代',
      cancelButtonText: '取消',
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#6b7280'
    });

    if (!result.isConfirmed) return;

    this.saveData(newData);
    await this.renderChecklist();
    this.updateStats();
    this.showToast('清單已匯入', 'success');
  },

  // 產生匯出用的資料（不含勾選狀態與內部 id）
  buildExportPayload(data) {
    return {
      categories: data.categories.map(cat => ({
        name: cat.name,
        order: cat.order,
        items: cat.items.map(item => ({
          name: item.name,
          order: item.order,
          priority: item.priority || 0
        }))
      }))
    };
  },

  // 匯出目前清單為 JSON 檔並下載
  async exportJson() {
    const data = this.getData();

    if (data.categories.length === 0) {
      this.showAlert('目前沒有清單可以匯出', 'info');
      return;
    }

    const currentUser = Users.getCurrent();
    const userName = currentUser ? currentUser.name : '旅遊';

    const { value: listName } = await Swal.fire({
      title: '匯出 JSON 檔案',
      input: 'text',
      inputValue: '旅遊清單',
      inputPlaceholder: '請輸入清單名稱',
      showCancelButton: true,
      confirmButtonText: '下載',
      cancelButtonText: '取消',
      inputValidator: (value) => {
        if (!value || !value.trim()) return '請輸入清單名稱';
        if (/[\/\\:\*\?"<>\|]/.test(value)) return '名稱不可包含特殊字元';
      }
    });

    if (!listName) return;

    try {
      const payload = this.buildExportPayload(data);
      const blob = new Blob([JSON.stringify(payload, null, 4)], {
        type: 'application/json;charset=utf-8'
      });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `${userName} ${listName.trim()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      this.showToast('清單已下載', 'success');
    } catch (error) {
      this.showAlert('匯出失敗：' + error.message, 'error');
    }
  },

  // 置中彈窗提示（需按「確定」關閉），用於一定要讓使用者看到的訊息
  showAlert(message, type = 'info') {
    if (typeof Swal === 'undefined') {
      alert(message);
      return;
    }

    Swal.fire({
      icon: type,
      title: message,
      confirmButtonText: '確定'
    });
  },

  showToast(message, type = 'info') {
    // SweetAlert2 由 CDN 載入，若手機網路擋掉 CDN 則 Swal 不存在，
    // 此時退回原生提示，避免整個流程因為找不到 Swal 而中斷（登入無反應）
    if (typeof Swal === 'undefined') {
      alert(message);
      return;
    }

    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer);
        toast.addEventListener('mouseleave', Swal.resumeTimer);
      }
    });

    Toast.fire({
      icon: type,
      title: message
    });
  }
};

// 啟動應用程式
document.addEventListener('DOMContentLoaded', () => {
  App.start();
});
