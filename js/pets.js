/**
 * pets.js - 宠物选择系统
 */

const PetSelect = {
  selectedPet: null,
  petKeys: Object.keys(PET_SPRITES),

  init() {
    this._renderGrid();
    this._bindEvents();
  },

  _renderGrid() {
    const grid = document.getElementById('petGrid');
    grid.innerHTML = '';

    this.petKeys.forEach((key, i) => {
      const pet = PET_SPRITES[key];
      const card = document.createElement('div');
      card.className = 'pet-card';
      card.dataset.petKey = key;

      // 创建预览canvas
      const canvas = document.createElement('canvas');
      canvas.width = 56;
      canvas.height = 40;
      const ctx = canvas.getContext('2d');

      const frame = pet.down_idle ? pet.down_idle[0] : (pet.idle ? pet.idle[0] : []);
      PixelArt.draw(ctx, frame, 0, 0);

      const name = document.createElement('div');
      name.className = 'pet-name';
      name.textContent = pet.name;

      const trait = document.createElement('div');
      trait.className = 'pet-trait';
      trait.textContent = pet.trait;

      card.appendChild(canvas);
      card.appendChild(name);
      card.appendChild(trait);
      grid.appendChild(card);
    });
  },

  _bindEvents() {
    const grid = document.getElementById('petGrid');
    const startBtn = document.getElementById('startBtn');

    grid.addEventListener('click', (e) => {
      const card = e.target.closest('.pet-card');
      if (!card) return;

      // 清除之前选择
      grid.querySelectorAll('.pet-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');

      this.selectedPet = card.dataset.petKey;
      startBtn.classList.add('ready');
    });

    startBtn.addEventListener('click', () => {
      if (!this.selectedPet) return;
      // 隐藏选择界面, 开始游戏
      document.getElementById('petSelectOverlay').classList.add('hidden');
      Game.start(this.selectedPet);
    });
  }
};
