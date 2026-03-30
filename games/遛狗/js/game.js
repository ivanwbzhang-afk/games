/**
 * game.js - 游戏主循环
 */

const Game = {
  canvas: null,
  ctx: null,
  running: false,
  lastTime: 0,

  // 核心实体
  playerOwner: null,
  playerPet: null,
  npcOwners: [],
  npcGrandpas: [],

  // 摄像机
  camera: { x: 0, y: 0, w: 0, h: 0 },

  // 缩放系统 - 玩耍时拉近特写
  zoom: 1,
  targetZoom: 1,
  zoomFocusX: 0,
  zoomFocusY: 0,

  // 背包（分类：food/toy/collect）
  inventory: [
    { id: 'snack', type: 'food', name: '小零食', icon: '🍖', count: 3, desc: '宠物最爱的肉干' },
    { id: 'cookie', type: 'food', name: '宠物饼干', icon: '🍪', count: 2, desc: '酥脆的小饼干' },
    { id: 'cake', type: 'food', name: '小蛋糕', icon: '🧁', count: 1, desc: '特别的日子才吃' },
    { id: 'ball', type: 'toy', name: '小球', icon: '🎾', count: 1, desc: '弹弹弹，追不停' },
    { id: 'rope', type: 'toy', name: '绳结', icon: '🪢', count: 1, desc: '拉扯最好的玩具' },
    { id: 'frisbee', type: 'toy', name: '飞盘', icon: '🥏', count: 1, desc: '扔出去，接回来！' },
  ],

  /**
   * 向背包添加物品（合并同名）
   */
  addToInventory(item) {
    const existing = this.inventory.find(i => i.id === item.id);
    if (existing) {
      existing.count = (existing.count || 1) + 1;
    } else {
      this.inventory.push({ ...item, count: 1 });
    }
  },

  /**
   * 消耗一个物品，返回是否成功
   */
  useInventoryItem(id) {
    const item = this.inventory.find(i => i.id === id);
    if (!item || item.count <= 0) return false;
    item.count--;
    if (item.count <= 0) {
      this.inventory = this.inventory.filter(i => i.id !== id);
    }
    return true;
  },

  // 通知
  notifTimer: 0,

  // 触摸/点击
  touchTarget: null,

  // 邀请冷却
  inviteCooldown: 0,

  // 随机事件
  eventTimer: 0,

  // NPC遭遇检测冷却
  encounterCheckTimer: 0,

  // 场域内语音气泡
  speechBubbles: [],

  // 世界事件实体（蝴蝶、飞盘等）
  worldEntities: [],

  /**
   * 初始化
   */
  init() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');

    // 初始化地图
    GameMap.init();

    // 初始化宠物选择
    PetSelect.init();

    // 绑定输入
    this._bindInput();

    // 适配窗口
    window.addEventListener('resize', () => this.resizeCanvas());
  },

  /**
   * 开始游戏
   */
  start(petType) {
    // 创建玩家
    const startX = 750;
    const startY = 700;
    this.playerOwner = new Owner(startX, startY);
    this.playerPet = new Pet(startX + 25, startY + 5, petType);
    this.playerPet.owner = this.playerOwner;
    this.playerPet.name = PET_SPRITES[petType].name;

    // 创建NPC遛狗人（3个）
    const npcPetTypes = Object.keys(PET_SPRITES).filter(k => k !== petType);
    const npcNames = ['小白', '旺财', '豆豆', '毛球', '黑子'];

    for (let i = 0; i < 3; i++) {
      const spawn = GameMap.npcSpawns[i];
      const pType = npcPetTypes[i % npcPetTypes.length];
      const pName = npcNames[i];
      const npc = new NPCOwner(spawn.x, spawn.y, pType, pName);
      this.npcOwners.push(npc);
    }

    // 创建NPC老爷爷
    this.npcGrandpas.push(new NPCGrandpa(400, 500));

    // 显示背包按钮
    document.getElementById('bagBtn').classList.add('show');

    // 显示底部输入栏
    document.getElementById('worldInputBar').classList.remove('hidden');

    // 初始化摄像机
    this.resizeCanvas();
    this._updateCamera();

    // 欢迎通知
    this.showNotification(`🐕 带着${this.playerPet.name}出发散步吧！点击地面移动`);

    // 开始游戏循环
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this._gameLoop(t));
  },

  /**
   * 调整Canvas大小
   */
  resizeCanvas() {
    const canvas = this.canvas;
    const dpr = window.devicePixelRatio || 1;

    let availH = window.innerHeight;
    if (ChatAIO.active) {
      availH = window.innerHeight * 0.55;
    } else {
      // 减去底部输入栏高度
      const worldBar = document.getElementById('worldInputBar');
      if (worldBar && !worldBar.classList.contains('hidden')) {
        availH -= worldBar.offsetHeight;
      }
    }

    canvas.style.height = availH + 'px';
    canvas.style.width = window.innerWidth + 'px';

    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(availH * dpr);

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.camera.w = window.innerWidth;
    this.camera.h = availH;
  },

  /**
   * 游戏主循环
   */
  _gameLoop(time) {
    if (!this.running) return;

    const dt = Math.min(time - this.lastTime, 50);
    this.lastTime = time;

    this._update(dt);
    this._render();

    requestAnimationFrame((t) => this._gameLoop(t));
  },

  _update(dt) {
    // 摇杆驱动主人移动
    if (this.joystickActive && this.playerOwner.state !== 'sit') {
      const speed = this.playerOwner.speed;
      const nx = this.playerOwner.x + this.joystickDir.x * speed;
      const ny = this.playerOwner.y + this.joystickDir.y * speed;
      if (GameMap.isWalkable(nx, ny)) {
        this.playerOwner.x = nx;
        this.playerOwner.y = ny;
      }
      if (Math.abs(this.joystickDir.x) > 0.1) {
        this.playerOwner.facing = this.joystickDir.x > 0 ? 1 : -1;
      }
      this.playerOwner.state = 'walk';
      this.playerOwner.targetX = this.playerOwner.x;
      this.playerOwner.targetY = this.playerOwner.y;
      this.playerOwner.animTimer += dt;
      if (this.playerOwner.animTimer > 300) {
        this.playerOwner.animTimer = 0;
        this.playerOwner.animFrame = (this.playerOwner.animFrame + 1) % 2;
      }
    } else if (!this.joystickActive && this.playerOwner.state === 'walk') {
      // 摇杆松开时，立刻停止行走，防止抖动
      const dx = this.playerOwner.targetX - this.playerOwner.x;
      const dy = this.playerOwner.targetY - this.playerOwner.y;
      if (Math.hypot(dx, dy) < 5) {
        this.playerOwner.state = 'idle';
        this.playerOwner.animFrame = 0;
        this.playerOwner.targetX = this.playerOwner.x;
        this.playerOwner.targetY = this.playerOwner.y;
      }
    }

    // 更新主人
    this.playerOwner.update(dt);

    // 更新玩家宠物
    this.playerPet.update(dt);

    // 更新NPC
    for (const npc of this.npcOwners) {
      npc.update(dt);
    }

    // 更新老爷爷
    for (const gp of this.npcGrandpas) {
      gp.update(dt);

      // 检查老爷爷互动
      if (gp.checkInteraction(this.playerPet)) {
        Interaction.handleGrandpaInteraction(gp);
      }
    }

    // 更新互动系统
    Interaction.update(dt);

    // 更新气味标记
    GameMap.updateScentMarks();

    // ===== 牵绳物理：人和宠物1:1平等权重 =====
    if (!this.playerPet.interacting) {
      const petDx = this.playerPet.x - this.playerOwner.x;
      const petDy = this.playerPet.y - this.playerOwner.y;
      const leashDist = Math.hypot(petDx, petDy);
      const leashMax = this.playerPet.leashLength;

      // 用户是否在手动控制主人
      const ownerMoving = this.joystickActive ||
        (this.playerOwner.state === 'walk' &&
        Math.hypot(this.playerOwner.targetX - this.playerOwner.x,
                   this.playerOwner.targetY - this.playerOwner.y) > 3);

      // 无操控时：主人缓慢跟随宠物方向
      if (!ownerMoving && leashDist > leashMax * 0.5) {
        const followSpeed = 0.3;
        const nx = this.playerOwner.x + (petDx / leashDist) * followSpeed;
        const ny = this.playerOwner.y + (petDy / leashDist) * followSpeed;
        if (GameMap.isWalkable(nx, ny)) {
          this.playerOwner.x = nx;
          this.playerOwner.y = ny;
        }
        if (Math.abs(petDx) > 1) this.playerOwner.facing = petDx > 0 ? 1 : -1;
        this.playerOwner.state = 'walk';
        this.playerOwner.targetX = this.playerOwner.x;
        this.playerOwner.targetY = this.playerOwner.y;
        this.playerOwner.animTimer += dt;
        if (this.playerOwner.animTimer > 400) {
          this.playerOwner.animTimer = 0;
          this.playerOwner.animFrame = (this.playerOwner.animFrame + 1) % 2;
        }
      }

      // 双向软约束：牵绳超长时，人1.2:狗0.8权重
      if (leashDist > leashMax) {
        const excess = leashDist - leashMax;
        const ownerPull = excess * 0.4; // 人承担40%
        const petPull = excess * 0.6;   // 狗承担60%
        const nx_dir = petDx / leashDist;
        const ny_dir = petDy / leashDist;

        // 主人被拉向宠物
        const ownerNx = this.playerOwner.x + nx_dir * ownerPull;
        const ownerNy = this.playerOwner.y + ny_dir * ownerPull;
        if (GameMap.isWalkable(ownerNx, ownerNy)) {
          this.playerOwner.x = ownerNx;
          this.playerOwner.y = ownerNy;
        }

        // 宠物被拉回主人
        const petNx = this.playerPet.x - nx_dir * petPull;
        const petNy = this.playerPet.y - ny_dir * petPull;
        if (GameMap.isWalkable(petNx, petNy)) {
          this.playerPet.x = petNx;
          this.playerPet.y = petNy;
        }
      }
    }

    // NPC宠物遭遇检测
    this.encounterCheckTimer += dt;
    if (this.encounterCheckTimer > 2000) {
      this.encounterCheckTimer = 0;
      this._checkEncounters();
    }

    // 随机事件 → 生成世界实体
    this.eventTimer += dt;
    if (this.eventTimer > 8000) {
      this.eventTimer = 0;
      this._spawnWorldEvent();
    }

    // 更新世界实体
    this.worldEntities = this.worldEntities.filter(e => {
      e.update(dt);
      return e.alive;
    });

    // 邀请冷却
    if (this.inviteCooldown > 0) this.inviteCooldown -= dt;

    // 更新语音气泡
    this.speechBubbles = this.speechBubbles.filter(b => {
      b.life -= dt;
      return b.life > 0;
    });

    // 摄像机跟随
    this._updateCamera();
  },

  /**
   * 宠物主动找其他狗 — 全地图搜索
   */
  _checkEncounters() {
    if (Interaction.playSessionActive) return;
    if (this.inviteCooldown > 0) return;
    if (this.playerPet.interacting) return;

    // 如果宠物正在主动跑向目标NPC
    if (this._seekingNpc) {
      const npc = this._seekingNpc;
      const dist = Math.hypot(this.playerPet.x - npc.pet.x, this.playerPet.y - npc.pet.y);
      // 到达附近，触发对视邀请
      if (dist < 50) {
        PetAI.triggerNotice(this.playerPet, npc.pet);
        PetAI.triggerNotice(npc.pet, this.playerPet);
        this._seekingNpc = null;
        this.playerPet._seekTarget = null;
        setTimeout(() => {
          if (!Interaction.playSessionActive) {
            Interaction.showInvite(npc);
          }
        }, 800);
        this.inviteCooldown = 60000;
      }
      return;
    }

    // 随机概率触发主动寻找（约15%概率每次检测）
    if (Math.random() > 0.15) return;

    // 全地图搜索最近的NPC宠物
    let closest = null, minDist = Infinity;
    for (const npc of this.npcOwners) {
      if (npc.pet.interacting) continue;
      const d = Math.hypot(this.playerPet.x - npc.pet.x, this.playerPet.y - npc.pet.y);
      if (d < minDist) { minDist = d; closest = npc; }
    }

    if (closest && minDist > 50) {
      // 宠物竖耳、兴奋，然后主动跑过去
      this.playerPet.excitement = 70;
      this.playerPet.facing = closest.pet.x > this.playerPet.x ? 1 : -1;
      this._seekingNpc = closest;

      // 让宠物跑向那只狗
      this.playerPet.aiTarget = { x: closest.pet.x, y: closest.pet.y };
      this.playerPet.state = 'walk';
      this.playerPet._seekTarget = closest.pet;

      this.showNotification(`${this.playerPet.name}发现了远处的${closest.pet.name}，兴奋地跑过去！`);
    }
  },

  _updateCamera() {
    // 平滑缩放
    this.zoom += (this.targetZoom - this.zoom) * 0.05;

    // 计算缩放后的逻辑视口大小
    const viewW = this.camera.w / this.zoom;
    const viewH = this.camera.h / this.zoom;

    let targetCX, targetCY;

    if (Interaction.playSessionActive && this.playerPet.playPartner) {
      // 玩耍时：镜头聚焦两只宠物中心
      const pet1 = this.playerPet;
      const pet2 = this.playerPet.playPartner;
      this.zoomFocusX = (pet1.x + pet2.x) / 2;
      this.zoomFocusY = (pet1.y + pet2.y) / 2;

      targetCX = this.zoomFocusX - viewW / 2;
      targetCY = this.zoomFocusY - viewH / 2;
    } else {
      // 正常：跟随玩家
      targetCX = this.playerOwner.x - viewW / 2;
      targetCY = this.playerOwner.y - viewH / 2;
    }

    this.camera.x += (targetCX - this.camera.x) * 0.08;
    this.camera.y += (targetCY - this.camera.y) * 0.08;

    // 限制在地图范围内
    this.camera.x = Math.max(0, Math.min(GameMap.WIDTH - viewW, this.camera.x));
    this.camera.y = Math.max(0, Math.min(GameMap.HEIGHT - viewH, this.camera.y));
  },

  _render() {
    const ctx = this.ctx;
    const cam = this.camera;
    const z = this.zoom;

    // 清屏
    ctx.clearRect(0, 0, cam.w, cam.h);

    // 应用缩放变换
    ctx.save();
    ctx.scale(z, z);

    // 缩放后的虚拟摄像机（逻辑视口）
    const vcam = {
      x: cam.x,
      y: cam.y,
      w: cam.w / z,
      h: cam.h / z
    };

    // 渲染地图
    GameMap.render(ctx, vcam);

    // 收集所有可渲染实体，按Y排序
    const entities = [];

    // 玩耍特写模式下只渲染两只宠物（和主人淡化）
    if (Interaction.playSessionActive && this.playerPet.playPartner) {
      // 两只宠物
      entities.push({ y: this.playerPet.y, render: () => this.playerPet.render(ctx, vcam) });
      entities.push({ y: this.playerPet.playPartner.y, render: () => this.playerPet.playPartner.render(ctx, vcam) });

      // 主人们半透明
      entities.push({ y: this.playerOwner.y, render: () => {
        ctx.globalAlpha = 0.35;
        this.playerOwner.render(ctx, vcam);
        ctx.globalAlpha = 1;
      }});
      for (const npc of this.npcOwners) {
        entities.push({ y: npc.y, render: () => {
          ctx.globalAlpha = 0.35;
          // 只渲染主人，不重复渲染宠物（宠物已单独加入）
          const sx = npc.x - vcam.x;
          const sy = npc.y - vcam.y;
          if (sx > -50 && sx < vcam.w + 50 && sy > -50 && sy < vcam.h + 50) {
            const renderState = (npc.state === 'walkToSit') ? 'walk' : npc.state;
            const sprites = OWNER_SPRITES[renderState] || OWNER_SPRITES.idle;
            const frame = sprites[npc.animFrame % sprites.length];
            const colored = frame.map(row => row.map(c => c === PAL.SHIRT_BLUE ? npc.shirtColor : c));
            if (npc.facing === -1) {
              PixelArt.drawFlipped(ctx, colored, sx - 12, sy - 34);
            } else {
              PixelArt.draw(ctx, colored, sx - 12, sy - 34);
            }
          }
          ctx.globalAlpha = 1;
        }});
      }
    } else {
      // 正常模式
      entities.push({ y: this.playerOwner.y, render: () => {
        this._renderLeash(ctx, vcam);
        this.playerOwner.render(ctx, vcam);
      }});

      entities.push({ y: this.playerPet.y, render: () => this.playerPet.render(ctx, vcam) });

      for (const npc of this.npcOwners) {
        entities.push({ y: npc.y, render: () => npc.render(ctx, vcam) });
      }

      for (const gp of this.npcGrandpas) {
        entities.push({ y: gp.y, render: () => gp.render(ctx, vcam) });
      }
    }

    // Y排序渲染
    entities.sort((a, b) => a.y - b.y);
    for (const e of entities) e.render();

    // 渲染世界实体（蝴蝶等，在最上层）
    for (const we of this.worldEntities) {
      we.render(ctx, vcam);
    }

    // 渲染触摸目标指示器（非玩耍模式）
    if (!Interaction.playSessionActive && this.touchTarget && this.playerOwner.state === 'walk') {
      ctx.strokeStyle = 'rgba(241,196,15,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(this.touchTarget.x - vcam.x, this.touchTarget.y - vcam.y, 8, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 渲染语音气泡
    this._renderSpeechBubbles(ctx, vcam);

    ctx.restore();

    // HUD 在缩放之外绘制（固定屏幕坐标）
    this._renderHUD(ctx);
  },

  _renderLeash(ctx, cam) {
    ctx.strokeStyle = PAL.LEASH;
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    const ox = this.playerOwner.x - cam.x;
    const oy = this.playerOwner.y - cam.y - 5;
    const px = this.playerPet.x - cam.x;
    const py = this.playerPet.y - cam.y - 3;

    ctx.moveTo(ox, oy);

    // 牵绳下垂曲线
    const mx = (ox + px) / 2;
    const my = (oy + py) / 2 + 8;
    ctx.quadraticCurveTo(mx, my, px, py);
    ctx.stroke();
  },

  _renderHUD(ctx) {
    // HUD 已移除，信息通过点击宠物查看
  },

  /**
   * 输入绑定
   */
  _bindInput() {
    const canvas = this.canvas;

    // ===== 虚拟摇杆 =====
    const joystick = document.getElementById('joystick');
    const knob = document.getElementById('joystickKnob');
    joystick.style.display = 'block';

    this.joystickDir = { x: 0, y: 0 };
    this.joystickActive = false;

    const joyRect = () => joystick.getBoundingClientRect();
    const joyRadius = 50;
    const knobMaxDist = 30;

    const handleJoyMove = (cx, cy) => {
      const r = joyRect();
      const centerX = r.left + r.width / 2;
      const centerY = r.top + r.height / 2;
      let dx = cx - centerX;
      let dy = cy - centerY;
      const dist = Math.hypot(dx, dy);
      if (dist > knobMaxDist) {
        dx = (dx / dist) * knobMaxDist;
        dy = (dy / dist) * knobMaxDist;
      }
      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      this.joystickDir.x = dx / knobMaxDist;
      this.joystickDir.y = dy / knobMaxDist;
      this.joystickActive = Math.hypot(this.joystickDir.x, this.joystickDir.y) > 0.15;
    };

    const handleJoyEnd = () => {
      knob.style.transform = 'translate(-50%, -50%)';
      this.joystickDir.x = 0;
      this.joystickDir.y = 0;
      this.joystickActive = false;
    };

    joystick.addEventListener('touchstart', (e) => {
      e.preventDefault(); e.stopPropagation();
      handleJoyMove(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });
    joystick.addEventListener('touchmove', (e) => {
      e.preventDefault(); e.stopPropagation();
      handleJoyMove(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });
    joystick.addEventListener('touchend', (e) => { e.preventDefault(); handleJoyEnd(); });
    joystick.addEventListener('touchcancel', handleJoyEnd);

    // PC鼠标支持
    let joyMouseDown = false;
    joystick.addEventListener('mousedown', (e) => { joyMouseDown = true; handleJoyMove(e.clientX, e.clientY); });
    document.addEventListener('mousemove', (e) => { if (joyMouseDown) handleJoyMove(e.clientX, e.clientY); });
    document.addEventListener('mouseup', () => { if (joyMouseDown) { joyMouseDown = false; handleJoyEnd(); } });

    // 点击画布用于交互检测（宠物/NPC/长椅），不用于移动
    const handleTap = (clientX, clientY) => {
      if (!this.running) return;
      if (Interaction.playSessionActive) return;

      const rect = canvas.getBoundingClientRect();
      const x = (clientX - rect.left) / this.zoom + this.camera.x;
      const y = (clientY - rect.top) / this.zoom + this.camera.y;

      // 检测宠物点击
      const ownPetDist = Math.hypot(this.playerPet.x - x, this.playerPet.y - y);
      if (ownPetDist < 22) { this.openPetPanel(this.playerPet, true); return; }
      for (const npc of this.npcOwners) {
        const pd = Math.hypot(npc.pet.x - x, npc.pet.y - y);
        if (pd < 22) { this.openPetPanel(npc.pet, false); return; }
      }

      // 检测长椅
      const bench = GameMap.getBenchAt(x, y, 25);
      if (bench) {
        if (this.playerOwner.state === 'sit') {
          this.playerOwner.state = 'idle';
          return;
        }
        this.playerOwner.walkToAndSit(bench.x + 12, bench.y - 2);
        return;
      }
    };

    canvas.addEventListener('click', (e) => handleTap(e.clientX, e.clientY));

    // 背包按钮 → 打开背包面板
    document.getElementById('bagBtn').addEventListener('click', () => {
      this.openBagPanel();
    });
    document.getElementById('bagCloseBtn').addEventListener('click', () => {
      document.getElementById('bagPanel').classList.remove('show');
    });
    // 背包tab切换
    document.querySelectorAll('.bag-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.bag-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this._renderBagItems(tab.dataset.tab);
      });
    });

    // 底部常驻输入栏 —— 发出的话以气泡形式出现在场域
    const worldInput = document.getElementById('worldInput');
    const worldSendBtn = document.getElementById('worldSendBtn');

    const sendWorldMsg = () => {
      const text = worldInput.value.trim();
      if (!text) return;
      worldInput.value = '';
      worldInput.blur();
      this.addSpeechBubble(this.playerOwner, text);
    };

    worldSendBtn.addEventListener('click', sendWorldMsg);
    worldInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendWorldMsg();
    });
    // 阻止输入框的触摸事件冒泡到canvas
    worldInput.addEventListener('touchstart', (e) => e.stopPropagation());
    worldSendBtn.addEventListener('touchstart', (e) => e.stopPropagation());
  },

  /**
   * 添加场域内语音气泡
   */
  addSpeechBubble(entity, text) {
    this.speechBubbles.push({
      entity,
      text,
      life: 4000,
      maxLife: 4000
    });
  },

  /**
   * 渲染场域内语音气泡
   */
  _renderSpeechBubbles(ctx, cam) {
    const font = '-apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';

    for (const b of this.speechBubbles) {
      const alpha = Math.min(1, b.life / 500); // 最后500ms淡出
      ctx.globalAlpha = alpha;

      const sx = b.entity.x - cam.x;
      const sy = b.entity.y - cam.y - 38;

      ctx.font = `500 10px ${font}`;
      const tw = ctx.measureText(b.text).width;
      const pw = 8, ph = 5;
      const bw = tw + pw * 2;
      const bh = 16 + ph;
      const bx = sx - bw / 2;
      const by = sy - bh;

      // 气泡背景
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 8);
      ctx.fill();

      // 小三角
      ctx.beginPath();
      ctx.moveTo(sx - 4, by + bh);
      ctx.lineTo(sx, by + bh + 5);
      ctx.lineTo(sx + 4, by + bh);
      ctx.fill();

      // 阴影
      ctx.shadowColor = 'rgba(0,0,0,0.08)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 2;

      // 文字
      ctx.fillStyle = '#1a1a1a';
      ctx.fillText(b.text, bx + pw, by + bh - ph - 2);

      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
    }
    ctx.globalAlpha = 1;
  },

  /**
   * 发现物品回调
   */
  onDiscovery(spot) {
    Interaction.showDiscovery(spot);
  },

  /**
   * 给NPC宠物喂饼干
   */
  _feedNpcPet(npcOwner) {
    const pet = npcOwner.pet;
    // 检查背包里有没有食物类物品
    const food = this.inventory.find(i => i.type === 'food' && i.count > 0);
    if (!food) {
      this.showNotification(`背包里没有零食，无法喂${pet.name}`);
      return;
    }
    const dist = Math.hypot(this.playerOwner.x - pet.x, this.playerOwner.y - pet.y);
    if (dist > 80) {
      this.showNotification(`离${pet.name}太远了，走近一点~`);
      return;
    }
    this.useInventoryItem(food.id);
    this.showNotification(`你喂了${pet.name}一块${food.name}！`);

    // 宠物开心反应：粒子爆发 + 停下来
    pet.happiness = Math.min(100, pet.happiness + 15);
    pet.excitement = 80;
    for (let i = 0; i < 6; i++) {
      pet.particles.push({
        x: pet.x, y: pet.y - 8,
        vx: (Math.random() - 0.5) * 2,
        vy: -1 - Math.random() * 1.5,
        life: 500, maxLife: 500,
        color: ['#ff6b6b', '#f1c40f', '#ff9ff3'][Math.floor(Math.random() * 3)]
      });
    }

    // 头上冒爱心气泡
    this.addSpeechBubble(pet, '❤️');

    setTimeout(() => {
      this.showNotification(`${pet.name}开心地摇起了尾巴~`);
    }, 1500);
  },

  /**
   * 宠物惊喜回调
   */
  onSurprise(surprise) {
    this.showNotification(`${surprise.emoji} ${this.playerPet.name}给你带来了${surprise.name}！`);
    if (surprise.item) {
      this.addToInventory({ id: surprise.item, type: 'collect', name: surprise.name, icon: surprise.emoji, desc: surprise.desc });
      setTimeout(() => {
        this.showNotification(surprise.desc);
      }, 2500);
    } else {
      setTimeout(() => {
        this.showNotification(surprise.desc);
      }, 2500);
    }
  },

  /**
   * 打开背包面板
   */
  openBagPanel() {
    document.getElementById('bagPanel').classList.add('show');
    this._renderBagItems('food');
    document.querySelectorAll('.bag-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.bag-tab[data-tab="food"]').classList.add('active');
  },

  _renderBagItems(tab) {
    const container = document.getElementById('bagItems');
    const items = this.inventory.filter(i => i.type === tab && i.count > 0);
    if (items.length === 0) {
      container.innerHTML = '<div class="bag-empty">空空如也~</div>';
      return;
    }
    container.innerHTML = items.map(i => `
      <div class="bag-item" data-id="${i.id}">
        ${i.count > 1 ? `<span class="bi-count">${i.count}</span>` : ''}
        <span class="bi-icon">${i.icon}</span>
        <span class="bi-name">${i.name}</span>
      </div>
    `).join('');
    // 点击物品 → 使用
    container.querySelectorAll('.bag-item').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.id;
        const item = this.inventory.find(i => i.id === id);
        if (!item) return;
        if (item.type === 'food') {
          if (this.useInventoryItem(id)) {
            this._feedOwnPet(item);
            this._renderBagItems(tab);
          }
        } else if (item.type === 'toy') {
          this._useToySelf(item);
        } else {
          this.showNotification(`${item.icon} ${item.name}：${item.desc}`);
        }
      });
    });
  },

  _feedOwnPet(item) {
    const pet = this.playerPet;
    pet.happiness = Math.min(100, pet.happiness + 10);
    pet.excitement = 70;
    this.showNotification(`${pet.name}吃了${item.name}，开心极了！`);
    for (let i = 0; i < 5; i++) {
      pet.particles.push({
        x: pet.x, y: pet.y - 8,
        vx: (Math.random()-0.5)*2, vy: -1-Math.random()*1.5,
        life: 500, maxLife: 500,
        color: ['#ff6b6b','#f1c40f','#ff9ff3'][Math.floor(Math.random()*3)]
      });
    }
  },

  _useToySelf(item) {
    this.showNotification(`你拿出了${item.icon}${item.name}！${this.playerPet.name}兴奋极了`);
    const pet = this.playerPet;
    pet.excitement = 100;
    pet.happiness = Math.min(100, pet.happiness + 5);
    document.getElementById('bagPanel').classList.remove('show');
  },

  /**
   * 打开宠物互动面板
   */
  openPetPanel(pet, isOwn) {
    const panel = document.getElementById('petPanel');
    document.getElementById('ppName').textContent = `🐕 ${pet.name}`;
    document.getElementById('ppMood').textContent = `❤️ ${Math.floor(pet.happiness)}`;

    const actions = document.getElementById('ppActions');
    if (isOwn) {
      actions.innerHTML = `
        <button class="pp-act" data-act="pat"><span class="pa-icon">🤚</span><span class="pa-label">抚摸</span></button>
        <button class="pp-act" data-act="feed"><span class="pa-icon">🍖</span><span class="pa-label">喂食</span></button>
        <button class="pp-act" data-act="spin"><span class="pa-icon">🔄</span><span class="pa-label">转圈</span></button>
        <button class="pp-act" data-act="dead"><span class="pa-icon">😵</span><span class="pa-label">装死</span></button>
        <button class="pp-act" data-act="shake"><span class="pa-icon">🤝</span><span class="pa-label">握手</span></button>
        <button class="pp-act" data-act="sit"><span class="pa-icon">🪑</span><span class="pa-label">坐下</span></button>
      `;
    } else {
      actions.innerHTML = `
        <button class="pp-act" data-act="feed"><span class="pa-icon">🍖</span><span class="pa-label">喂食</span></button>
        <button class="pp-act" data-act="tease"><span class="pa-icon">🖐️</span><span class="pa-label">挑逗</span></button>
        <button class="pp-act" data-act="praise"><span class="pa-icon">👍</span><span class="pa-label">夸夸</span></button>
      `;
    }

    actions.querySelectorAll('.pp-act').forEach(btn => {
      btn.addEventListener('click', () => {
        this._doPetAction(pet, btn.dataset.act, isOwn);
        panel.classList.remove('show');
      });
    });

    document.getElementById('ppClose').onclick = () => panel.classList.remove('show');
    panel.classList.add('show');
  },

  _doPetAction(pet, act, isOwn) {
    // 通用：生成粒子的辅助
    const burst = (emoji, count, color) => {
      for (let i = 0; i < count; i++) {
        pet.particles.push({
          x: pet.x + (Math.random()-0.5)*10,
          y: pet.y - 10 - Math.random()*8,
          vx: (Math.random()-0.5)*2,
          vy: -0.8 - Math.random()*1.5,
          life: 600 + Math.random()*300,
          maxLife: 900,
          color: color || '#f1c40f'
        });
      }
    };

    // 通用：临时状态切换（duration ms后恢复idle）
    const tempState = (state, duration) => {
      const prev = pet.state;
      pet.state = state;
      pet.animFrame = 0;
      pet._interactAnim = true;
      setTimeout(() => {
        if (pet._interactAnim) {
          pet.state = 'idle';
          pet.animFrame = 0;
          pet._interactAnim = false;
        }
      }, duration);
    };

    // 通用：弹跳动画（通过临时缩放偏移）
    const bounce = () => {
      pet._bounceTimer = 0;
      pet._bouncing = true;
      const interval = setInterval(() => {
        pet._bounceTimer += 50;
        if (pet._bounceTimer >= 600) {
          pet._bouncing = false;
          pet._bounceOffset = 0;
          clearInterval(interval);
        } else {
          pet._bounceOffset = Math.sin(pet._bounceTimer / 100 * Math.PI) * 4;
        }
      }, 50);
    };

    switch (act) {
      case 'pat':
        pet.happiness = Math.min(100, pet.happiness + 8);
        this.showNotification(`你轻轻摸了摸${pet.name}的头，它眯起了眼睛`);
        this.addSpeechBubble(pet, '😊');
        tempState('sit', 2000); // 蹲下享受抚摸
        burst(null, 6, '#ff9ff3');
        bounce();
        break;
      case 'feed': {
        const food = this.inventory.find(i => i.type === 'food' && i.count > 0);
        if (!food) { this.showNotification('背包里没有零食了~'); return; }
        this.useInventoryItem(food.id);
        pet.happiness = Math.min(100, pet.happiness + 12);
        this.showNotification(`${pet.name}吃了${food.name}，满足地舔舔嘴`);
        this.addSpeechBubble(pet, '😋');
        tempState('sniff', 2500); // 低头吃东西（用sniff动画模拟）
        // 食物粒子
        for (let i = 0; i < 8; i++) {
          pet.particles.push({
            x: pet.x + (Math.random()-0.5)*6,
            y: pet.y - 6,
            vx: (Math.random()-0.5)*1.5,
            vy: -1.2 - Math.random()*1,
            life: 500 + Math.random()*400,
            maxLife: 900,
            color: ['#ff6b6b','#f1c40f','#ff9ff3','#ffa502'][Math.floor(Math.random()*4)]
          });
        }
        break;
      }
      case 'spin':
        this.showNotification(`${pet.name}转了三个圈！好厉害`);
        this.addSpeechBubble(pet, '🌀');
        pet.happiness = Math.min(100, pet.happiness + 5);
        // 快速切换朝向模拟转圈
        pet._interactAnim = true;
        let spinCount = 0;
        const spinInterval = setInterval(() => {
          pet.facing *= -1;
          pet.animFrame = (pet.animFrame + 1) % 2;
          pet.state = 'walk';
          spinCount++;
          // 转圈粒子
          pet.particles.push({
            x: pet.x + Math.cos(spinCount)*8,
            y: pet.y - 5 + Math.sin(spinCount)*5,
            vx: Math.cos(spinCount)*1.5, vy: -0.5,
            life: 400, maxLife: 400, color: '#54a0ff'
          });
          if (spinCount >= 12) {
            clearInterval(spinInterval);
            pet.state = 'idle';
            pet.animFrame = 0;
            pet._interactAnim = false;
          }
        }, 120);
        break;
      case 'dead':
        this.showNotification(`${pet.name}四脚朝天"装死"，然后偷看你的反应`);
        this.addSpeechBubble(pet, '😵');
        pet.happiness = Math.min(100, pet.happiness + 5);
        tempState('dig', 3000); // dig姿态模拟趴下装死
        // 灵魂出窍粒子
        setTimeout(() => {
          for (let i = 0; i < 4; i++) {
            pet.particles.push({
              x: pet.x + (Math.random()-0.5)*4,
              y: pet.y - 12,
              vx: (Math.random()-0.5)*0.5,
              vy: -1.5 - Math.random()*0.5,
              life: 800, maxLife: 800, color: 'rgba(255,255,255,0.6)'
            });
          }
        }, 500);
        break;
      case 'shake':
        this.showNotification(`${pet.name}伸出爪子和你握手！`);
        this.addSpeechBubble(pet, '🤝');
        pet.happiness = Math.min(100, pet.happiness + 5);
        tempState('sit', 2000);
        bounce();
        burst(null, 5, '#f1c40f');
        // 闪光粒子
        setTimeout(() => {
          for (let i = 0; i < 6; i++) {
            pet.particles.push({
              x: pet.x + 6, y: pet.y - 4,
              vx: (Math.random()-0.5)*2, vy: -1 - Math.random(),
              life: 500, maxLife: 500, color: '#f1c40f'
            });
          }
        }, 300);
        break;
      case 'sit':
        pet.state = 'sit';
        pet.animFrame = 0;
        this.showNotification(`${pet.name}乖乖坐下了`);
        this.addSpeechBubble(pet, '🐾');
        setTimeout(() => { if (pet.state === 'sit') pet.state = 'idle'; }, 3000);
        break;
      case 'tease':
        pet.excitement = 90;
        this.showNotification(`你在${pet.name}面前晃了晃手，它跳了起来！`);
        this.addSpeechBubble(pet, '❗');
        bounce();
        // 快速左右看动画
        pet._interactAnim = true;
        let teaseCount = 0;
        const teaseInterval = setInterval(() => {
          pet.facing *= -1;
          pet.state = 'walk';
          pet.animFrame = (pet.animFrame + 1) % 2;
          teaseCount++;
          if (teaseCount >= 8) {
            clearInterval(teaseInterval);
            pet.state = 'idle';
            pet._interactAnim = false;
          }
        }, 150);
        burst(null, 4, '#ff6b6b');
        break;
      case 'praise':
        pet.happiness = Math.min(100, pet.happiness + 5);
        this.showNotification(`你夸了夸${pet.name}，它高兴地摇尾巴`);
        this.addSpeechBubble(pet, '🥰');
        bounce();
        // 爱心粒子
        for (let i = 0; i < 6; i++) {
          pet.particles.push({
            x: pet.x + (Math.random()-0.5)*12,
            y: pet.y - 12 - Math.random()*6,
            vx: (Math.random()-0.5)*1,
            vy: -1 - Math.random(),
            life: 700, maxLife: 700, color: '#ff6b6b'
          });
        }
        break;
    }
  },

  /**
   * 生成世界事件实体
   */
  _spawnWorldEvent() {
    if (this.worldEntities.length >= 3) return;
    const r = Math.random();
    const px = this.playerOwner.x + (Math.random() - 0.5) * 300;
    const py = this.playerOwner.y + (Math.random() - 0.5) * 200;

    if (r < 0.4) {
      // 蝴蝶
      this.worldEntities.push(new ButterflyEntity(px, py));
      this.showNotification('一只蝴蝶飞过来了...');
      // 宠物可能去追
      if (Math.random() < 0.5 && !this.playerPet.interacting && this.playerPet.state === 'idle') {
        this.playerPet.aiTarget = { x: px, y: py };
        this.playerPet.state = 'walk';
      }
    } else if (r < 0.6) {
      // 飞盘
      this.worldEntities.push(new FrisbeeEntity(px, py));
      this.showNotification('草坪上出现了一个飞盘！');
      if (!this.playerPet.interacting && this.playerPet.state === 'idle') {
        this.playerPet.aiTarget = { x: px, y: py };
        this.playerPet.state = 'walk';
        this.playerPet.excitement = 80;
      }
    }
    // 其余概率不生成（安静时刻）
  },

  /**
   * 显示通知
   */
  showNotification(text) {
    const el = document.getElementById('notification');
    el.textContent = text;
    el.classList.remove('show');
    // 触发 reflow
    void el.offsetHeight;
    el.classList.add('show');

    clearTimeout(this._notifTimeout);
    this._notifTimeout = setTimeout(() => {
      el.classList.remove('show');
    }, 3000);
  }
};

// 启动
window.addEventListener('DOMContentLoaded', () => {
  Game.init();
});
