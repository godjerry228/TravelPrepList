// 主應用程式 - 單用戶模式
const App = {
  STORAGE_KEY: 'travelChecklistData',
  sortableInstances: [],

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

    grid.innerHTML = data.categories.map(cat => this.renderCategory(cat)).join('');

    // 初始化分類拖曳排序
    new Sortable(grid, {
      animation: 150,
      handle: '.category-handle',
      onEnd: () => this.saveCategoryOrder()
    });

    // 初始化每個分類內的物品拖曳排序
    data.categories.forEach(cat => {
      const itemList = document.getElementById(`items-${cat.id}`);
      if (itemList) {
        const sortable = new Sortable(itemList, {
          animation: 150,
          handle: '.item-handle',
          onEnd: () => this.saveItemOrder(cat.id)
        });
        this.sortableInstances.push(sortable);
      }
    });
  },

  // 渲染單一分類卡片
  renderCategory(category) {
    const items = category.items || [];
    items.sort((a, b) => a.order - b.order);

    return `
      <div class="bg-white rounded-lg shadow-md p-4 transition-all duration-200 hover:shadow-lg" data-category-id="${category.id}">
        <div class="flex items-center justify-between mb-3 pb-3 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50 -mx-4 -mt-4 px-4 pt-4 rounded-t-lg">
          <div class="flex items-center gap-2 flex-1">
            <svg class="w-5 h-5 text-gray-400 category-handle cursor-move" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
            <h3 class="text-lg font-semibold text-gray-800 flex-1 category-name" data-category-id="${category.id}">
              ${category.name}
            </h3>
          </div>
          <div class="flex items-center gap-1">
            <button class="edit-category-btn p-1 text-green-600 hover:bg-green-50 rounded" data-category-id="${category.id}" title="編輯分類">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
              </svg>
            </button>
            <button class="add-item-btn p-1 text-blue-500 hover:bg-blue-50 rounded" data-category-id="${category.id}" title="新增物品">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
              </svg>
            </button>
            <button class="delete-category-btn p-1 text-red-500 hover:bg-red-50 rounded" data-category-id="${category.id}" title="刪除分類">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
            </button>
          </div>
        </div>

        <ul id="items-${category.id}" class="space-y-2">
          ${items.map(item => this.renderItem(item)).join('')}
        </ul>

        ${items.length === 0 ? '<p class="text-gray-400 text-sm text-center py-4">尚無物品</p>' : ''}
      </div>
    `;
  },

  // 渲染單一物品
  renderItem(item) {
    const priority = item.priority || 0;
    const stars = this.renderStars(priority);

    return `
      <li class="group flex items-center gap-2 p-3 rounded hover:bg-blue-50 active:bg-blue-100 transition-all duration-200 cursor-pointer item-row" data-item-id="${item.id}">
        <svg class="w-4 h-4 text-gray-400 item-handle cursor-move flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
        </svg>
        <input
          type="checkbox"
          class="item-checkbox w-6 h-6 rounded border-gray-300 text-green-500 focus:ring-2 focus:ring-green-500 pointer-events-none flex-shrink-0"
          data-item-id="${item.id}"
          ${item.checked ? 'checked' : ''}
        >
        <span class="flex-1 item-name ${item.checked ? 'line-through text-gray-400' : 'text-gray-700'}">
          ${item.name}
        </span>
        ${stars ? `<div class="flex-shrink-0 ml-2">${stars}</div>` : ''}
        <button class="edit-item-btn p-1 text-blue-500 hover:text-blue-700 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 z-10" data-item-id="${item.id}" title="編輯" onclick="event.stopPropagation()">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
          </svg>
        </button>
        <button class="delete-item-btn p-1 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 z-10" data-item-id="${item.id}" title="刪除" onclick="event.stopPropagation()">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </li>
    `;
  },

  // 渲染星星
  renderStars(priority) {
    if (priority === 0) return '';

    const starSVG = `
      <svg class="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
      </svg>
    `;

    const stars = [];
    for (let i = 0; i < priority && i < 5; i++) {
      stars.push(starSVG);
    }

    return `<div class="flex gap-0.5">${stars.join('')}</div>`;
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

    document.getElementById('menuOverlay').addEventListener('click', () => {
      this.toggleMenu(false);
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

    document.getElementById('checklistGrid').addEventListener('click', async (e) => {
      // 優先處理按鈕點擊
      if (e.target.closest('.edit-item-btn')) {
        const btn = e.target.closest('.edit-item-btn');
        this.editItem(btn.dataset.itemId);
        return;
      }

      if (e.target.closest('.delete-item-btn')) {
        const btn = e.target.closest('.delete-item-btn');
        this.handleDeleteItem(btn.dataset.itemId);
        return;
      }

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

      // 處理項目列點擊（打勾）
      const itemRow = e.target.closest('.item-row');
      if (itemRow && !e.target.closest('.item-handle')) {
        this.handleItemCheck(itemRow.dataset.itemId);
        return;
      }

      // 處理分類名稱雙擊
      if (e.target.classList.contains('category-name')) {
        e.target.addEventListener('dblclick', () => {
          this.editCategoryName(e.target.dataset.categoryId, e.target.textContent.trim());
        });
      }
    });
  },

  // 切換選單
  toggleMenu(show) {
    const sideMenu = document.getElementById('sideMenu');
    const overlay = document.getElementById('menuOverlay');

    if (show) {
      sideMenu.classList.remove('translate-x-full');
      overlay.classList.remove('opacity-0', 'pointer-events-none');
    } else {
      sideMenu.classList.add('translate-x-full');
      overlay.classList.add('opacity-0', 'pointer-events-none');
    }
  },

  // 處理物品勾選
  handleItemCheck(itemId) {
    const data = this.getData();

    for (const cat of data.categories) {
      const item = cat.items.find(i => String(i.id) === String(itemId));
      if (item) {
        item.checked = !item.checked;
        this.saveData(data);
        this.renderChecklist();
        this.updateStats();
        return;
      }
    }
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
    let totalScore = 0; // 總分數（加權）
    let earnedScore = 0; // 已獲得分數（加權）

    data.categories.forEach(cat => {
      cat.items.forEach(item => {
        totalCount++;

        // 計算加權分數：星號越多分數越高
        // 0星 = 1分（一般項目）
        // 1星 = 2分
        // 2星 = 3分
        // 3星 = 5分
        // 4星 = 8分
        // 5星 = 13分（重點項目）
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

    // 使用加權分數計算百分比
    const percentage = totalScore > 0 ? Math.round((earnedScore / totalScore) * 100) : 0;

    document.getElementById('bannerCheckedCount').textContent = checkedCount;
    document.getElementById('bannerTotalCount').textContent = totalCount;

    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const progressTextCenter = document.getElementById('progressTextCenter');
    const progressSlogan = document.getElementById('progressSlogan');

    progressBar.style.width = `${percentage}%`;
    progressText.textContent = `${percentage}%`;
    progressTextCenter.textContent = `${percentage}%`;

    // 根據進度改變顏色和標語
    let slogan = '';
    let colorClass = '';

    if (percentage === 100) {
      slogan = '完美！準備出發！✈️';
      colorClass = 'bg-gradient-to-r from-green-400 to-green-600';
      progressSlogan.className = 'text-lg font-bold text-green-600';
    } else if (percentage >= 90) {
      slogan = '快完成囉！加油！🎉';
      colorClass = 'bg-gradient-to-r from-green-400 to-green-500';
      progressSlogan.className = 'text-lg font-bold text-green-600';
    } else if (percentage >= 60) {
      slogan = '做得不錯，繼續努力！💪';
      colorClass = 'bg-gradient-to-r from-blue-400 to-blue-600';
      progressSlogan.className = 'text-lg font-bold text-blue-600';
    } else if (percentage >= 30) {
      slogan = '還有一半，加把勁！⚡';
      colorClass = 'bg-gradient-to-r from-yellow-400 to-yellow-600';
      progressSlogan.className = 'text-lg font-bold text-yellow-600';
    } else if (percentage > 0) {
      slogan = '剛開始，慢慢來！📝';
      colorClass = 'bg-gradient-to-r from-orange-400 to-orange-600';
      progressSlogan.className = 'text-lg font-bold text-orange-600';
    } else {
      slogan = '你這樣沒辦法出國！😱';
      colorClass = 'bg-gradient-to-r from-red-400 to-red-600';
      progressSlogan.className = 'text-lg font-bold text-red-600';
    }

    progressSlogan.textContent = slogan;
    progressBar.className = `absolute top-0 left-0 h-full ${colorClass} transition-all duration-500 ease-out flex items-center justify-center`;

    // 顯示/隱藏百分比文字
    if (percentage > 10) {
      progressText.classList.remove('hidden');
      progressTextCenter.classList.add('hidden');
    } else {
      progressText.classList.add('hidden');
      progressTextCenter.classList.remove('hidden');
    }
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

        // 初始化星號顯示
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

        // 點擊星號
        stars.forEach((star) => {
          star.addEventListener('click', function() {
            selectedRating = parseInt(this.dataset.value);
            updateStars(selectedRating);
          });
        });

        // 清除星號按鈕
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

  // 編輯分類名稱
  async editCategoryName(categoryId, currentName) {
    const { value: newName } = await Swal.fire({
      title: '修改分類名稱',
      input: 'text',
      inputValue: currentName,
      showCancelButton: true,
      confirmButtonText: '確定',
      cancelButtonText: '取消',
      inputValidator: (value) => {
        if (!value) return '請輸入分類名稱';
      }
    });

    if (newName && newName.trim() !== currentName) {
      const data = this.getData();
      const cat = data.categories.find(c => String(c.id) === String(categoryId));
      if (cat) {
        cat.name = newName.trim();
        this.saveData(data);
        this.renderChecklist();
        this.showToast('已更新分類名稱', 'success');
      }
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

        // 初始化星號顯示
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

        // 點擊星號
        stars.forEach((star) => {
          star.addEventListener('click', function() {
            selectedRating = parseInt(this.dataset.value);
            updateStars(selectedRating);
          });
        });

        // 清除星號按鈕
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
      // 只清除勾選
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
      // 恢復預設清單
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

    // 移除 checked 狀態和 id，只保留結構
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
      // 使用 localStorage 儲存
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
      // 從 localStorage 取得已儲存的清單
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

      // 建立清單 HTML
      const listsHtml = listsArray.map(list => `
        <div class="flex items-center justify-between p-3 border rounded-lg mb-2 hover:bg-gray-50">
          <span class="flex-1">${list.name}</span>
          <div class="flex gap-2">
            <button class="load-list-btn px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600" data-listname="${list.name}">載入</button>
            <button class="delete-list-btn px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600" data-listname="${list.name}">刪除</button>
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
          // 載入按鈕事件
          document.querySelectorAll('.load-list-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
              const listName = btn.dataset.listname;
              Swal.close();
              await this.performLoadChecklist(listName);
            });
          });

          // 刪除按鈕事件
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

      // 從 localStorage 載入清單
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

      // 詢問是否要覆蓋目前清單
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
        // 轉換資料，加上 id 和 checked 狀態
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
      // 從 localStorage 刪除
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
