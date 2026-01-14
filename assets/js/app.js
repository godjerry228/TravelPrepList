// 主應用程式 - 單用戶模式
const App = {
  STORAGE_KEY: 'travelChecklistData',
  sortableInstances: [],

  // 分類顏色
  categoryColors: [
    'dot-red', 'dot-orange', 'dot-yellow', 'dot-green', 'dot-teal',
    'dot-blue', 'dot-indigo', 'dot-purple', 'dot-pink', 'dot-rose'
  ],

  // 初始化應用程式
  async init() {
    try {
      // 預載入已儲存的清單到 localStorage
      await this.preloadSavedLists();

      // 載入用戶清單資料
      await this.loadUserData();

      // 渲染介面
      await this.renderChecklist();
      await this.updateStats();

      // 綁定事件
      this.bindEvents();

      this.showToast('載入完成', 'success');
    } catch (error) {
      console.error('初始化失敗:', error);
      this.showToast('初始化失敗: ' + error.message, 'error');
    }
  },

  // 預載入已儲存的清單
  async preloadSavedLists() {
    try {
      // 檢查是否已經預載入過
      const preloadFlag = localStorage.getItem('savedListsPreloaded');
      if (preloadFlag === 'true') {
        return; // 已經預載入過，不需要重複載入
      }

      // 嘗試載入 Jerry 的清單
      const response = await fetch('saved-lists/Jerry 2026日本冬天之旅清單.json');
      if (response.ok) {
        const jerryList = await response.json();

        // 取得現有的已儲存清單
        const savedLists = JSON.parse(localStorage.getItem('savedChecklists') || '{}');

        // 將 Jerry 的清單加入
        savedLists['Jerry 2026日本冬天之旅清單'] = {
          name: 'Jerry 2026日本冬天之旅清單',
          checklist: jerryList,
          modified: Date.now()
        };

        // 儲存回 localStorage
        localStorage.setItem('savedChecklists', JSON.stringify(savedLists));

        // 設定預載入標記
        localStorage.setItem('savedListsPreloaded', 'true');

        console.log('已預載入 Jerry 2026日本冬天之旅清單');
      }
    } catch (error) {
      console.error('預載入清單失敗:', error);
      // 不中斷應用程式初始化
    }
  },

  // 載入用戶資料
  async loadUserData() {
    const savedData = localStorage.getItem(this.STORAGE_KEY);

    if (!savedData) {
      // 初次使用，載入預設清單
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

    const colorClass = this.categoryColors[index % this.categoryColors.length];
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
          <div class="category-dot ${colorClass}"></div>
          <h3 class="category-name">${category.name}</h3>
          <div class="category-progress">
            <div class="category-progress-bar">
              <div class="category-progress-fill" style="width: ${progress.percentage}%"></div>
            </div>
            <span>${progress.checked}/${progress.total}</span>
          </div>
          <div class="category-actions">
            <button class="category-action-btn add-item-btn text-blue-500" data-category-id="${category.id}" title="新增物品">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
              </svg>
            </button>
            <button class="category-action-btn edit-category-btn text-green-500" data-category-id="${category.id}" title="編輯分類">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
              </svg>
            </button>
            <button class="category-action-btn delete-category-btn text-red-500" data-category-id="${category.id}" title="刪除分類">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
            </button>
          </div>
        </div>

        <!-- 物品列表 -->
        <div id="items-${category.id}" class="item-list">
          ${items.map(item => this.renderItem(item)).join('')}
        </div>

        ${items.length === 0 ? '<p class="text-center text-gray-400 py-4 text-sm">尚無物品，點擊 + 新增</p>' : ''}
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

    document.getElementById('exportChecklistBtn').addEventListener('click', () => {
      this.toggleMenu(false);
      this.saveChecklist();
    });

    document.getElementById('importChecklistBtn').addEventListener('click', () => {
      this.toggleMenu(false);
      this.loadChecklist();
    });

    document.getElementById('resetAllBtn').addEventListener('click', () => {
      this.toggleMenu(false);
      this.showResetConfirmModal();
    });

    const grid = document.getElementById('checklistGrid');

    // 長按計時器
    let longPressTimer = null;
    let longPressTriggered = false;

    // 長按開始（觸控）
    grid.addEventListener('touchstart', (e) => {
      const itemRow = e.target.closest('.item-row');
      if (itemRow && !e.target.closest('.drag-handle')) {
        longPressTriggered = false;
        longPressTimer = setTimeout(() => {
          longPressTriggered = true;
          this.showItemActionMenu(itemRow.dataset.itemId);
        }, 500); // 500ms 長按觸發
      }
    }, { passive: true });

    // 長按取消（觸控移動或結束）
    grid.addEventListener('touchmove', () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    }, { passive: true });

    grid.addEventListener('touchend', () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    });

    // 右鍵選單（桌面版）
    grid.addEventListener('contextmenu', (e) => {
      const itemRow = e.target.closest('.item-row');
      if (itemRow) {
        e.preventDefault();
        this.showItemActionMenu(itemRow.dataset.itemId);
      }
    });

    // 點擊事件
    grid.addEventListener('click', async (e) => {
      // 如果剛觸發長按，忽略這次點擊
      if (longPressTriggered) {
        longPressTriggered = false;
        return;
      }

      // 處理「更多」按鈕（電腦版用）
      if (e.target.closest('.item-more-btn')) {
        e.stopPropagation();
        const btn = e.target.closest('.item-more-btn');
        this.showItemActionMenu(btn.dataset.itemId);
        return;
      }

      // 處理分類按鈕
      if (e.target.closest('.add-item-btn')) {
        const btn = e.target.closest('.add-item-btn');
        this.showAddItemModal(btn.dataset.categoryId);
        return;
      }

      if (e.target.closest('.edit-category-btn')) {
        const btn = e.target.closest('.edit-category-btn');
        this.editCategory(btn.dataset.categoryId);
        return;
      }

      if (e.target.closest('.delete-category-btn')) {
        const btn = e.target.closest('.delete-category-btn');
        this.handleDeleteCategory(btn.dataset.categoryId);
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

  // 顯示物品操作選單（長按觸發）
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

  // 儲存清單
  async saveChecklist() {
    const { value: listName } = await Swal.fire({
      title: '儲存清單',
      input: 'text',
      inputPlaceholder: '請輸入清單名稱',
      showCancelButton: true,
      confirmButtonText: '儲存',
      cancelButtonText: '取消',
      inputValidator: (value) => {
        if (!value) return '請輸入清單名稱';
        if (/[\/\\:\*\?"<>\|]/.test(value)) return '檔名不可包含特殊字元';
      }
    });

    if (!listName) return;

    const data = this.getData();

    const exportData = {
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

    try {
      const savedLists = JSON.parse(localStorage.getItem('savedChecklists') || '{}');
      savedLists[listName] = {
        name: listName,
        checklist: exportData,
        modified: Date.now()
      };
      localStorage.setItem('savedChecklists', JSON.stringify(savedLists));

      Swal.fire({
        title: '儲存成功',
        text: `清單「${listName}」已儲存`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      Swal.fire({
        title: '儲存失敗',
        text: '儲存時發生錯誤',
        icon: 'error'
      });
    }
  },

  // 載入清單
  async loadChecklist() {
    try {
      const savedLists = JSON.parse(localStorage.getItem('savedChecklists') || '{}');
      const listsArray = Object.values(savedLists).sort((a, b) => b.modified - a.modified);

      if (listsArray.length === 0) {
        Swal.fire({
          title: '無已儲存清單',
          text: '目前沒有已儲存的清單',
          icon: 'info'
        });
        return;
      }

      const listsHtml = listsArray.map(list => `
        <div class="flex items-center justify-between p-3 border rounded-lg mb-2 hover:bg-gray-50">
          <span class="flex-1 text-left">${list.name}</span>
          <div class="flex gap-2">
            <button class="load-list-btn px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm" data-listname="${list.name}">載入</button>
            <button class="delete-list-btn px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm" data-listname="${list.name}">刪除</button>
          </div>
        </div>
      `).join('');

      await Swal.fire({
        title: '管理已儲存清單',
        html: `<div class="text-left max-h-96 overflow-y-auto">${listsHtml}</div>`,
        showCancelButton: true,
        showConfirmButton: false,
        cancelButtonText: '關閉',
        didOpen: () => {
          document.querySelectorAll('.load-list-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
              const listName = btn.dataset.listname;
              Swal.close();
              await this.performLoadChecklist(listName);
            });
          });

          document.querySelectorAll('.delete-list-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
              const listName = btn.dataset.listname;

              const confirmDelete = await Swal.fire({
                title: '確定刪除？',
                text: `確定要刪除「${listName}」清單嗎？此操作無法復原`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                cancelButtonColor: '#6b7280',
                confirmButtonText: '確定刪除',
                cancelButtonText: '取消'
              });

              if (confirmDelete.isConfirmed) {
                await this.deleteChecklist(listName);
                Swal.close();
                this.loadChecklist();
              }
            });
          });
        }
      });
    } catch (error) {
      Swal.fire({
        title: '載入失敗',
        text: '載入時發生錯誤',
        icon: 'error'
      });
    }
  },

  // 執行載入清單
  async performLoadChecklist(listName) {
    try {
      if (!listName) return;

      const savedLists = JSON.parse(localStorage.getItem('savedChecklists') || '{}');
      const savedList = savedLists[listName];

      if (!savedList) {
        Swal.fire({
          title: '載入失敗',
          text: '找不到此清單',
          icon: 'error'
        });
        return;
      }

      const confirmResult = await Swal.fire({
        title: '確定載入清單？',
        text: '這將會覆蓋目前的清單內容（所有勾選狀態將被清除）',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3b82f6',
        cancelButtonColor: '#6b7280',
        confirmButtonText: '確定載入',
        cancelButtonText: '取消'
      });

      if (confirmResult.isConfirmed) {
        const newData = {
          categories: savedList.checklist.categories.map(cat => ({
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

        this.saveData(newData);
        this.renderChecklist();
        this.updateStats();

        Swal.fire({
          title: '載入成功',
          text: '清單已更新',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      }
    } catch (error) {
      Swal.fire({
        title: '載入失敗',
        text: '載入時發生錯誤',
        icon: 'error'
      });
    }
  },

  // 刪除清單
  async deleteChecklist(listName) {
    try {
      const savedLists = JSON.parse(localStorage.getItem('savedChecklists') || '{}');
      delete savedLists[listName];
      localStorage.setItem('savedChecklists', JSON.stringify(savedLists));

      this.showToast('清單已刪除', 'success');
    } catch (error) {
      Swal.fire({
        title: '刪除失敗',
        text: '刪除時發生錯誤',
        icon: 'error'
      });
    }
  },

  // 顯示 Toast 通知
  showToast(message, type = 'info') {
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
  App.init();
});
