/* ========== Backpack System ========== */
const Backpack = {
  items: [], // { id, type, name, emoji, desc, cookKey?, quality? }
  nextId: 1,
  isOpen: false,
  selectMode: null, // null | 'cook' | 'give'
  giveTarget: null,  // NPC name for giving

  // 初始背包
  init() {
    this.items = [];
    this.nextId = 1;
    this.addItem({ type: 'wood', name: '柴火', emoji: '🪵', desc: '一根干燥的柴火，可以添到篝火里。' });
    this.addItem({ type: 'food', name: '棉花糖', emoji: '🍡', cookKey: 'marshmallow' });
    this.addItem({ type: 'food', name: '红薯', emoji: '🍠', cookKey: 'sweetpotato' });
    this.addItem({ type: 'food', name: '香肠', emoji: '🌭', cookKey: 'sausage' });
    this._bindUI();
  },

  addItem(item) {
    this.items.push({ ...item, id: this.nextId++ });
    this._updateBadge();
    return this.items[this.items.length - 1];
  },

  removeItem(id) {
    this.items = this.items.filter(i => i.id !== id);
    this._updateBadge();
  },

  getByType(type) {
    return this.items.filter(i => i.type === type);
  },

  getFoodItems() {
    return this.items.filter(i => i.type === 'food' && i.cookKey);
  },

  getCookedItems() {
    return this.items.filter(i => i.type === 'cooked');
  },

  getGiftableItems() {
    return this.items.filter(i => i.type === 'cooked' || i.type === 'item' || i.type === 'story' || i.type === 'wood');
  },

  getWoodItems() {
    return this.items.filter(i => i.type === 'wood');
  },

  open(mode, target) {
    this.selectMode = mode || null;
    this.giveTarget = target || null;
    this.isOpen = true;
    this._render();
    document.getElementById('backpack-panel').classList.remove('hidden');
  },

  close() {
    this.isOpen = false;
    this.selectMode = null;
    this.giveTarget = null;
    document.getElementById('backpack-panel').classList.add('hidden');
  },

  _bindUI() {
    document.getElementById('btn-backpack').addEventListener('click', () => {
      if (this.isOpen) { this.close(); return; }
      this.open();
    });
    document.getElementById('backpack-close').addEventListener('click', () => this.close());
    document.getElementById('backpack-list').addEventListener('click', (e) => {
      const el = e.target.closest('.bp-item');
      if (!el) return;
      const id = parseInt(el.dataset.id);
      const item = this.items.find(i => i.id === id);
      if (!item) return;

      if (this.selectMode === 'cook') {
        if (item.type !== 'food' || !item.cookKey) {
          Utils.notify('这个不能烤...');
          return;
        }
        this.removeItem(id);
        this.close();
        Game._startCookFromBackpack(item.cookKey);
      } else if (this.selectMode === 'give') {
        this._pendingGiveItem = item;
        this._pendingGiveItemId = id;
        this.close();
        // 弹出备注输入（可选）
        document.getElementById('give-note-to').textContent = `送 ${item.emoji}${item.name} 给 ${this.giveTarget}`;
        document.getElementById('give-note-input').value = '';
        document.getElementById('give-note-panel').classList.remove('hidden');
        this._pendingGiveTarget = this.giveTarget;
      } else {
        // 普通查看模式 — 显示描述
        if (item.desc) Utils.notify(`${item.emoji} ${item.desc.substring(0, 30)}`);
      }
    });
    // 送礼备注面板
    document.getElementById('give-note-cancel').addEventListener('click', () => {
      document.getElementById('give-note-panel').classList.add('hidden');
    });
    document.getElementById('give-note-send').addEventListener('click', () => {
      const note = document.getElementById('give-note-input').value.trim();
      document.getElementById('give-note-panel').classList.add('hidden');
      if (this._pendingGiveItem) {
        this.removeItem(this._pendingGiveItemId);
        Game._giveItemToNPC(this._pendingGiveTarget, this._pendingGiveItem, note);
        this._pendingGiveItem = null;
      }
    });
  },

  _render() {
    const list = document.getElementById('backpack-list');
    let title = '🎒 背包';
    let filterItems = this.items;

    if (this.selectMode === 'cook') {
      title = '🍢 选择要烤的食材';
      filterItems = this.getFoodItems();
    } else if (this.selectMode === 'give') {
      title = `🎁 送给 ${this.giveTarget}`;
      filterItems = this.getGiftableItems();
    }
    document.getElementById('backpack-title').textContent = title;

    if (filterItems.length === 0) {
      list.innerHTML = `<div class="bp-empty">${
        this.selectMode === 'cook' ? '没有可烤的食材...' :
        this.selectMode === 'give' ? '没有可赠送的物品...' :
        '背包是空的'
      }</div>`;
      return;
    }

    list.innerHTML = filterItems.map(item => {
      const tag = item.type === 'food' ? '食材' :
                  item.type === 'cooked' ? (item.quality || '烤好的') :
                  item.type === 'wood' ? '柴火' :
                  item.type === 'item' ? '物品' : '故事';
      const tagClass = item.type === 'cooked' ? 'tag-cooked' :
                       item.type === 'food' ? 'tag-food' :
                       item.type === 'wood' ? 'tag-wood' : 'tag-item';
      return `<div class="bp-item" data-id="${item.id}">
        <span class="bp-emoji">${item.emoji}</span>
        <span class="bp-name">${item.name}</span>
        <span class="bp-tag ${tagClass}">${tag}</span>
      </div>`;
    }).join('');
  },

  _updateBadge() {
    const badge = document.getElementById('bp-badge');
    if (badge) {
      badge.textContent = this.items.length;
      badge.style.display = this.items.length > 0 ? 'flex' : 'none';
    }
  }
};
