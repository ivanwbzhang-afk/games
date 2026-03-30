/* ========== Campfire System ========== */
const Fire = {
  // 状态: 'ash' | 'burning' | 'dying'
  state: 'ash',
  intensity: 0,           // 0~1 火焰强度
  targetIntensity: 0,
  remainingTime: 0,       // 剩余秒数
  maxTimePerWood: 300,    // 每根柴 300秒 = 5分钟

  // 粒子系统
  particles: [],
  embers: [],        // 火星
  smokeParticles: [],
  ashGlow: 0,        // 灰烬余温

  // 木炭系统 - 熄灭后的红热木炭
  charcoals: [],
  charcoalHeat: 0,   // 0~1 木炭整体红热度

  // 统计
  stats: {
    lighter: null,         // 点火人
    woodAdders: [],        // 添柴记录
    totalWood: 0,
    notesBurned: 0,
    meteorsSeen: 0,
    foodCooked: 0,
    animalVisits: 0,
    startTime: null,
  },

  // 篝火底座（柴火堆）
  logPixels: null,

  // 灰烬中的宝藏
  treasures: [
    { type: '徽章', name: '旅人之星', msg: '送给每一个路过的人。' },
    { type: '卡片', name: '旧明信片', msg: '另一边写着：希望你也看到了那颗流星。' },
    { type: '留言', name: '字条', msg: '我在这里坐了很久，但一点也不孤单。' },
    { type: '徽章', name: '篝火守望者', msg: '感谢你让火继续燃烧。' },
    { type: '卡片', name: '手绘地图', msg: '上面画着一条通往某个地方的路，但终点被涂掉了。' },
    { type: '留言', name: '折叠的纸', msg: '有些话说不出口，就让它留在灰烬里吧。' },
    { type: '徽章', name: '星光碎片', msg: '据说是从划过的流星上掉下来的。' },
    { type: '留言', name: '小瓶子', msg: '瓶子里装着一粒沙，和一句话：等你。' },
  ],

  init(canvasWidth, canvasHeight) {
    this.cx = canvasWidth / 2;
    this.cy = canvasHeight * 0.52; // 篝火在场域中心
    this.w = canvasWidth;
    this.h = canvasHeight;

    // 初始化柴火堆像素数据
    this._generateLogBase();

    // 设置初始灰烬状态，有微弱余温
    this.state = 'ash';
    this.intensity = 0;
    this.ashGlow = 0.3;
    this.charcoalHeat = 0.15;
    this._generateCharcoals();
  },

  _generateLogBase() {
    // 柴火堆 - 放大版
    this.logPixels = [];
    const baseW = 90;
    // 底层大木头
    for (let i = 0; i < 4; i++) {
      const x = this.cx - baseW/2 + i * 24 + Utils.randFloat(-4, 4);
      const y = this.cy + 8 + Utils.randFloat(-3, 3);
      this.logPixels.push({ x, y, w: Utils.randInt(28, 40), h: Utils.randInt(8, 12), color: Utils.pick(['#3a2510', '#4a3015', '#352010']) });
    }
    // 上层交叉
    for (let i = 0; i < 3; i++) {
      const x = this.cx - 28 + i * 22;
      const y = this.cy - 3 + Utils.randFloat(-4, 2);
      this.logPixels.push({ x, y, w: Utils.randInt(22, 34), h: Utils.randInt(6, 10), color: Utils.pick(['#4a2a12', '#3a2818', '#503218']), angle: Utils.randFloat(-0.3, 0.3) });
    }
    // 石头圈
    this.stoneRing = [];
    const stoneCount = Utils.randInt(10, 14);
    const radiusX = 52, radiusY = 22;
    for (let i = 0; i < stoneCount; i++) {
      const angle = (i / stoneCount) * Math.PI * 2 + Utils.randFloat(-0.15, 0.15);
      this.stoneRing.push({
        x: this.cx + Math.cos(angle) * radiusX + Utils.randFloat(-3, 3),
        y: this.cy + 12 + Math.sin(angle) * radiusY + Utils.randFloat(-2, 2),
        w: Utils.randInt(6, 10),
        h: Utils.randInt(5, 8),
        shade: Utils.randInt(55, 80),
        highlight: Utils.randInt(75, 100),
      });
    }
  },

  _generateCharcoals() {
    this.charcoals = [];
    const count = Utils.randInt(8, 14);
    for (let i = 0; i < count; i++) {
      const angle = Utils.randFloat(0, Math.PI * 2);
      const dist = Utils.randFloat(4, 38);
      this.charcoals.push({
        x: this.cx + Math.cos(angle) * dist + Utils.randFloat(-6, 6),
        y: this.cy + 6 + Math.sin(angle) * dist * 0.4 + Utils.randFloat(-3, 3),
        w: Utils.randInt(4, 10),
        h: Utils.randInt(3, 7),
        heat: Utils.randFloat(0.3, 1.0),
        flicker: Utils.randFloat(0, Math.PI * 2),
      });
    }
    // 预生成白色灰烬碎片位置（固定，不闪烁）
    this.ashFlakes = [];
    const flakeCount = Utils.randInt(18, 30);
    for (let i = 0; i < flakeCount; i++) {
      const angle = Utils.randFloat(0, Math.PI * 2);
      const dist = Utils.randFloat(5, 45);
      const gray = Utils.randInt(155, 210);
      this.ashFlakes.push({
        x: this.cx + Math.cos(angle) * dist,
        y: this.cy + 10 + Math.sin(angle) * dist * 0.35,
        gray: gray,
        size: Utils.randInt(3, 5),
      });
    }
  },

  // 添柴
  addWood(playerName) {
    if (this.state === 'ash') {
      // 第一根柴，点燃篝火
      this.state = 'burning';
      this.stats.lighter = playerName;
      this.stats.startTime = Date.now();
      this.targetIntensity = 0.7;
      // 如果木炭还在通红，保持高温；否则从低温开始
      if (this.charcoalHeat < 0.1) this.charcoalHeat = 0.1;
    } else {
      this.targetIntensity = Math.min(1, this.intensity + 0.3);
      // 往通红的炭上加柴，保持当前热度
    }

    this.remainingTime += this.maxTimePerWood;
    this.stats.totalWood++;
    this.stats.woodAdders.push({ name: playerName, time: Date.now() });
    this.ashGlow = 1;
  },

  update(dt, time) {
    if (this.state === 'burning') {
      this.remainingTime -= dt;
      if (this.remainingTime <= 0) {
        this.remainingTime = 0;
        this.state = 'dying';
      }
      // 火焰强度直接与剩余燃烧时间正相关
      // 满柴（≥900s/15min）= 满强度1.0，逐渐衰减到0
      const maxFuelTime = this.maxTimePerWood * 3; // 15分钟为满火
      const ratio = Math.min(1, this.remainingTime / maxFuelTime);
      // 平滑曲线：高燃料时火焰旺盛，低燃料时快速衰减
      this.targetIntensity = Math.max(0.06, ratio * 0.6 + Math.sqrt(ratio) * 0.4);
      this.intensity = Utils.lerp(this.intensity, this.targetIntensity, 0.015);

      // 柴火白热化：火焰越弱，木炭越热
      const targetHeat = 0.2 + (1 - this.intensity) * 0.7;
      this.charcoalHeat = Utils.lerp(this.charcoalHeat, targetHeat, 0.008);

    } else if (this.state === 'dying') {
      this.targetIntensity = 0;
      this.intensity = Utils.lerp(this.intensity, 0, 0.005);
      // dying阶段木炭持续升温到通红
      this.charcoalHeat = Utils.lerp(this.charcoalHeat, 0.95, 0.005);

      if (this.intensity < 0.01) {
        this.intensity = 0;
        this.state = 'ash';
        this.lastDiedTime = Date.now();
        this.ashGlow = 0.5;
        this.charcoalHeat = Math.max(this.charcoalHeat, 0.85); // 保持通红
        this._generateCharcoals();
        if (this.stats.startTime && typeof Game !== 'undefined') {
          Game.onFireDied();
        }
      }
    } else if (this.state === 'ash') {
      this.ashGlow = Math.max(0, this.ashGlow - 0.00004);
      this.charcoalHeat = Math.max(0, this.charcoalHeat - 0.000011);
    }

    // 更新火焰粒子
    this._updateParticles(dt, time);

    // 更新火星
    this._updateEmbers(dt, time);

    // 更新烟雾
    this._updateSmoke(dt, time);
  },

  _updateParticles(dt, time) {
    // 少量柔和粒子 - 不喷发
    if (this.state === 'burning' || (this.state === 'dying' && this.intensity > 0.05)) {
      const count = Math.floor(this.intensity * 3) + 1;
      for (let i = 0; i < count; i++) {
        this.particles.push({
          x: this.cx + Utils.randFloat(-10, 10) * this.intensity,
          y: this.cy - 2,
          vx: Utils.randFloat(-0.4, 0.4),
          vy: Utils.randFloat(-1.5, -0.4) * this.intensity,
          life: 1,
          maxLife: Utils.randFloat(0.5, 1.0),
          size: Utils.randFloat(3, 6) * this.intensity,
          hue: Utils.randFloat(0, 60),
        });
      }
    }

    this.particles = this.particles.filter(p => {
      p.life -= dt / p.maxLife;
      p.x += p.vx + Math.sin(time * 0.002 + p.x * 0.08) * 0.2;
      p.y += p.vy;
      p.vy -= 0.008; // 轻微加速上升
      p.size *= 0.993;
      return p.life > 0 && p.size > 0.5;
    });
  },

  _updateEmbers(dt, time) {
    // 偶尔飘出几颗火星
    if (this.intensity > 0.3 && Math.random() < this.intensity * 0.03) {
      this.embers.push({
        x: this.cx + Utils.randFloat(-8, 8),
        y: this.cy - Utils.randFloat(10, 30) * this.intensity,
        vx: Utils.randFloat(-0.8, 0.8),
        vy: Utils.randFloat(-1.5, -0.5),
        life: 1,
        maxLife: Utils.randFloat(1.5, 3),
        size: Utils.randFloat(1, 2.5),
      });
    }

    this.embers = this.embers.filter(e => {
      e.life -= dt / e.maxLife;
      e.x += e.vx + Math.sin(time * 0.003 + e.x) * 0.3;
      e.y += e.vy;
      e.vy += 0.005;
      e.vx *= 0.995;
      return e.life > 0;
    });
  },

  _updateSmoke(dt, time) {
    if (this.intensity > 0 && this.intensity < 0.5 && Math.random() < 0.05) {
      this.smokeParticles.push({
        x: this.cx + Utils.randFloat(-8, 8),
        y: this.cy - 25,
        vx: Utils.randFloat(-0.4, 0.4),
        vy: Utils.randFloat(-0.8, -0.3),
        life: 1,
        size: Utils.randFloat(6, 16),
        opacity: Utils.randFloat(0.1, 0.25),
      });
    }
    if (this.state === 'ash' && this.ashGlow > 0.1 && Math.random() < 0.01) {
      this.smokeParticles.push({
        x: this.cx + Utils.randFloat(-12, 12),
        y: this.cy - 8,
        vx: Utils.randFloat(-0.2, 0.2),
        vy: Utils.randFloat(-0.4, -0.15),
        life: 1,
        size: Utils.randFloat(5, 12),
        opacity: Utils.randFloat(0.05, 0.12),
      });
    }
    // 木炭余热产生的热气升腾
    if (this.state === 'ash' && this.charcoalHeat > 0.2 && Math.random() < this.charcoalHeat * 0.04) {
      this.smokeParticles.push({
        x: this.cx + Utils.randFloat(-20, 20),
        y: this.cy - 4,
        vx: Utils.randFloat(-0.15, 0.15),
        vy: Utils.randFloat(-0.5, -0.2),
        life: 1,
        size: Utils.randFloat(4, 9),
        opacity: Utils.randFloat(0.03, 0.08) * this.charcoalHeat,
      });
    }

    this.smokeParticles = this.smokeParticles.filter(s => {
      s.life -= dt * 0.3;
      s.x += s.vx + Math.sin(time * 0.001 + s.y * 0.05) * 0.3;
      s.y += s.vy;
      s.size += 0.05;
      return s.life > 0;
    });
  },

  draw(ctx, time) {
    const ps = 4; // 放大像素

    // ===== 篝火近距离辉光（椭圆形透视）=====
    if (this.intensity > 0) {
      const glowRx = 70 + this.intensity * 90;
      const glowRy = glowRx * 0.55;
      ctx.save();
      ctx.translate(this.cx, this.cy);
      ctx.scale(1, glowRy / glowRx);
      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, glowRx);
      glow.addColorStop(0, `rgba(255, 180, 60, ${this.intensity * 0.35})`);
      glow.addColorStop(0.3, `rgba(255, 140, 40, ${this.intensity * 0.18})`);
      glow.addColorStop(0.6, `rgba(255, 100, 20, ${this.intensity * 0.08})`);
      glow.addColorStop(1, 'rgba(255, 80, 10, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, glowRx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // ===== 灰烬余温辉光（椭圆）=====
    if (this.state === 'ash' && this.ashGlow > 0) {
      const ashRx = 60 + this.ashGlow * 50;
      const ashRy = ashRx * 0.55;
      ctx.save();
      ctx.translate(this.cx, this.cy + 8);
      ctx.scale(1, ashRy / ashRx);
      const ashGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, ashRx);
      ashGlow.addColorStop(0, `rgba(255, 180, 60, ${this.ashGlow * 0.3})`);
      ashGlow.addColorStop(1, 'rgba(200, 100, 20, 0)');
      ctx.fillStyle = ashGlow;
      ctx.beginPath();
      ctx.arc(0, 0, ashRx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // ===== 木炭红热辉光（椭圆）=====
    if (this.charcoalHeat > 0.1) {
      const charRx = 55 + this.charcoalHeat * 55;
      const charRy = charRx * 0.55;
      ctx.save();
      ctx.translate(this.cx, this.cy + 4);
      ctx.scale(1, charRy / charRx);
      const charGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, charRx);
      charGlow.addColorStop(0, `rgba(255, 200, 70, ${this.charcoalHeat * 0.35})`);
      charGlow.addColorStop(0.4, `rgba(255, 150, 40, ${this.charcoalHeat * 0.15})`);
      charGlow.addColorStop(1, 'rgba(255, 100, 20, 0)');
      ctx.fillStyle = charGlow;
      ctx.beginPath();
      ctx.arc(0, 0, charRx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // ===== 石头圈 =====
    if (this.stoneRing) {
      this.stoneRing.forEach(s => {
        // 石头主体 — 灰棕色
        ctx.fillStyle = `rgb(${s.shade}, ${s.shade - 5}, ${s.shade - 10})`;
        ctx.fillRect(s.x, s.y, s.w, s.h);
        // 顶部高光
        ctx.fillStyle = `rgb(${s.highlight}, ${s.highlight - 4}, ${s.highlight - 8})`;
        ctx.fillRect(s.x + 1, s.y, s.w - 2, Math.max(1, Math.floor(s.h * 0.4)));
        // 篝火烤红的一面
        if (this.charcoalHeat > 0.1 || this.intensity > 0.1) {
          const heat = Math.max(this.charcoalHeat * 0.3, this.intensity * 0.2);
          ctx.fillStyle = `rgba(255, 140, 50, ${heat * 0.3})`;
          ctx.fillRect(s.x, s.y, s.w, s.h);
        }
      });
    }

    // ===== 柴火堆 =====
    this.logPixels.forEach(log => {
      ctx.save();
      if (log.angle) {
        ctx.translate(log.x + log.w/2, log.y + log.h/2);
        ctx.rotate(log.angle);
        ctx.translate(-(log.x + log.w/2), -(log.y + log.h/2));
      }

      // 柴火颜色随燃烧变化 — 同时考虑火焰和木炭热度
      const heat = this.charcoalHeat;
      if (this.intensity > 0.5 && heat < 0.3) {
        // 刚点燃，火旺但柴还没热透 — 正常木色+边缘发红
        ctx.fillStyle = log.color;
        ctx.fillRect(log.x, log.y, log.w, log.h);
        ctx.fillStyle = `rgba(200, 60, 10, ${this.intensity * 0.25})`;
        ctx.fillRect(log.x, log.y, log.w, 2);
      } else if (heat > 0.5) {
        // 白热化的木炭 — 不管有没有火苗都显示通红
        const flk = 0.92 + 0.08 * Math.sin(time * 0.001 + log.x * 0.1);
        ctx.fillStyle = `rgb(255, ${Math.floor(220 * flk)}, ${Math.floor(80 * flk)})`;
        ctx.fillRect(log.x, log.y, log.w, log.h);
        ctx.fillStyle = `rgba(255, 255, 200, ${heat * 0.7 * flk})`;
        ctx.fillRect(log.x + 2, log.y + 1, Math.max(1, log.w - 4), Math.max(1, log.h - 2));
        ctx.fillStyle = 'rgba(60, 30, 10, 0.3)';
        ctx.fillRect(log.x, log.y, 1, log.h);
        ctx.fillRect(log.x + log.w - 1, log.y, 1, log.h);
        // 发光光晕
        const lx = log.x + log.w / 2, ly = log.y + log.h / 2;
        const lr = Math.max(log.w, log.h) + heat * 12;
        const logGlow = ctx.createRadialGradient(lx, ly, 0, lx, ly, lr);
        logGlow.addColorStop(0, `rgba(255, 200, 80, ${heat * 0.4 * flk})`);
        logGlow.addColorStop(0.6, `rgba(255, 140, 40, ${heat * 0.12 * flk})`);
        logGlow.addColorStop(1, 'rgba(255, 100, 20, 0)');
        ctx.fillStyle = logGlow;
        ctx.fillRect(lx - lr, ly - lr, lr * 2, lr * 2);
      } else if (heat > 0.15) {
        // 中温 — 暗橙色过渡
        const flk = 0.9 + 0.1 * Math.sin(time * 0.0008 + log.x * 0.1);
        const r = Math.floor(120 + heat * 270 * flk);
        const g = Math.floor(40 + heat * 180 * flk);
        const b = Math.floor(5 + heat * 30);
        ctx.fillStyle = `rgb(${Math.min(255,r)}, ${Math.min(180,g)}, ${b})`;
        ctx.fillRect(log.x, log.y, log.w, log.h);
        const lx = log.x + log.w / 2, ly = log.y + log.h / 2;
        const lr = Math.max(log.w, log.h) * 0.6 + heat * 6;
        const logGlow = ctx.createRadialGradient(lx, ly, 0, lx, ly, lr);
        logGlow.addColorStop(0, `rgba(255, 160, 50, ${heat * 0.2 * flk})`);
        logGlow.addColorStop(1, 'rgba(200, 100, 20, 0)');
        ctx.fillStyle = logGlow;
        ctx.fillRect(lx - lr, ly - lr, lr * 2, lr * 2);
      } else if (this.state === 'ash' && heat <= 0.15) {
        // 完全冷却
        ctx.fillStyle = 'rgb(30, 28, 25)';
        ctx.fillRect(log.x, log.y, log.w, log.h);
        ctx.fillStyle = 'rgba(190, 185, 175, 0.55)';
        ctx.fillRect(log.x + 1, log.y, log.w - 2, 3);
        ctx.fillStyle = 'rgba(160, 155, 148, 0.35)';
        ctx.fillRect(log.x, log.y + log.h - 2, log.w, 2);
      } else {
        // 刚点燃/低热度 — 正常木色
        ctx.fillStyle = log.color;
        ctx.fillRect(log.x, log.y, log.w, log.h);
        if (this.intensity > 0) {
          ctx.fillStyle = `rgba(200, 80, 20, ${this.intensity * 0.2})`;
          ctx.fillRect(log.x, log.y, log.w, 2);
        }
      }
      ctx.restore();
    });

    // ===== 灰烬层 =====
    ctx.fillStyle = this.state === 'ash' ? 'rgba(60, 55, 48, 0.7)' : 'rgba(40, 35, 28, 0.4)';
    for (let i = -35; i < 35; i += ps) {
      const w = 40 - Math.abs(i) * 0.5;
      if (w > 0 && Math.random() > 0.2) {
        ctx.fillRect(this.cx + i - w/2, this.cy + 16 + Math.sin(i*0.3)*3, ps, ps);
      }
    }

    // ===== 白色灰烬散落（固定位置，不闪烁）=====
    if (this.state === 'ash' && this.ashFlakes) {
      const ashWhiteness = Math.max(0, 1 - this.charcoalHeat * 0.8);
      this.ashFlakes.forEach(f => {
        const alpha = 0.25 + ashWhiteness * 0.3;
        ctx.fillStyle = `rgba(${f.gray}, ${f.gray - 5}, ${f.gray - 12}, ${alpha})`;
        ctx.fillRect(f.x, f.y, f.size, f.size);
      });
    }

    // ===== 发光木炭碎片 =====
    if (this.charcoalHeat > 0.02) {
      this.charcoals.forEach(c => {
        const heat = c.heat * this.charcoalHeat;
        const ccx = c.x + c.w / 2;
        const ccy = c.y + c.h / 2;
        if (heat < 0.02) {
          ctx.fillStyle = 'rgb(25, 22, 20)';
          ctx.fillRect(c.x, c.y, c.w, c.h);
          ctx.fillStyle = 'rgba(175, 170, 162, 0.4)';
          ctx.fillRect(c.x, c.y, c.w, Math.max(1, c.h / 2));
          return;
        }
        const flk = 0.9 + 0.1 * Math.sin(time * 0.0008 + c.flicker);
        if (heat > 0.35) {
          // 亮黄白色——和火苗一样的温度感
          ctx.fillStyle = `rgb(255, ${Math.floor(210 * flk)}, ${Math.floor(70 * flk)})`;
          ctx.fillRect(c.x, c.y, c.w, c.h);
          // 中心白热
          ctx.fillStyle = `rgba(255, 250, 190, ${heat * 0.65 * flk})`;
          ctx.fillRect(c.x + 1, c.y, Math.max(1, c.w - 2), c.h);
          // 光晕
          const glowR = Math.max(c.w, c.h) * 1.2 + heat * 12;
          const cg = ctx.createRadialGradient(ccx, ccy, 0, ccx, ccy, glowR);
          cg.addColorStop(0, `rgba(255, 200, 70, ${heat * 0.4 * flk})`);
          cg.addColorStop(0.5, `rgba(255, 140, 40, ${heat * 0.12 * flk})`);
          cg.addColorStop(1, 'rgba(255, 100, 20, 0)');
          ctx.fillStyle = cg;
          ctx.fillRect(ccx - glowR, ccy - glowR, glowR * 2, glowR * 2);
        } else if (heat > 0.1) {
          // 中温——橙色发光
          const r = Math.floor(160 + heat * 280 * flk);
          const g = Math.floor(60 + heat * 200 * flk);
          const b = Math.floor(10 + heat * 30);
          ctx.fillStyle = `rgb(${Math.min(255,r)}, ${Math.min(200,g)}, ${b})`;
          ctx.fillRect(c.x, c.y, c.w, c.h);
          if (heat > 0.2) {
            const glowR = Math.max(c.w, c.h) + heat * 6;
            const cg = ctx.createRadialGradient(ccx, ccy, 0, ccx, ccy, glowR);
            cg.addColorStop(0, `rgba(255, 160, 50, ${heat * 0.25 * flk})`);
            cg.addColorStop(1, 'rgba(200, 100, 20, 0)');
            ctx.fillStyle = cg;
            ctx.fillRect(ccx - glowR, ccy - glowR, glowR * 2, glowR * 2);
          }
        } else {
          ctx.fillStyle = `rgb(${Math.floor(40 + heat * 150)}, ${Math.floor(25 + heat * 50)}, 18)`;
          ctx.fillRect(c.x, c.y, c.w, c.h);
        }
      });
    }

    // ===== 烟雾 =====
    this.smokeParticles.forEach(s => {
      ctx.fillStyle = `rgba(120, 115, 110, ${s.opacity * s.life})`;
      const sz = Math.floor(s.size / ps) * ps;
      ctx.fillRect(
        Math.floor(s.x / ps) * ps - sz/2,
        Math.floor(s.y / ps) * ps,
        sz, sz
      );
    });

    // ===== 火焰主体 =====
    if (this.intensity > 0) {
      this._drawFlameBody(ctx, time, ps);
    }

    // ===== 火焰粒子（少量，紧贴火焰上方）=====
    this.particles.forEach(p => {
      let r, g, b;
      if (p.life > 0.6) {
        r = 255; g = 220 + (1-p.life) * 35; b = 120 + (1-p.life) * 80;
      } else if (p.life > 0.3) {
        r = 255; g = 140 + p.life * 80; b = 30;
      } else {
        r = 200 + p.life * 55; g = 50 + p.life * 50; b = 10;
      }

      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${p.life * 0.6})`;
      const sz = Math.min(ps * 2, Math.max(ps, Math.floor(p.size / ps) * ps));
      ctx.fillRect(
        Math.floor(p.x / ps) * ps,
        Math.floor(p.y / ps) * ps,
        sz, sz
      );
    });

    // ===== 火星 =====
    this.embers.forEach(e => {
      const alpha = e.life * 0.9;
      ctx.fillStyle = `rgba(255, ${150 + e.life * 100}, 30, ${alpha})`;
      ctx.fillRect(Math.floor(e.x), Math.floor(e.y), 3, 3);
      ctx.fillStyle = `rgba(255, 100, 10, ${alpha * 0.3})`;
      ctx.fillRect(Math.floor(e.x - e.vx), Math.floor(e.y - e.vy), 2, 2);
    });
  },

  _drawFlameBody(ctx, time, ps) {
    // 柔和火焰 - 紧凑的火苗形状，自然飘动
    const layers = [
      { color: [255, 245, 200], heightMul: 0.35, widthMul: 0.25, alpha: 0.85 }, // 内焰 白黄
      { color: [255, 200, 80],  heightMul: 0.6,  widthMul: 0.45, alpha: 0.7 },  // 中焰 金
      { color: [255, 130, 30],  heightMul: 0.85, widthMul: 0.7,  alpha: 0.5 },  // 外焰 橙
      { color: [200, 60, 15],   heightMul: 1.0,  widthMul: 1.0,  alpha: 0.25 }, // 最外 暗红
    ];

    const baseHeight = 55 * this.intensity;
    const baseWidth = 22 * this.intensity;

    // 缓慢波动参数
    const t1 = time * 0.0015;
    const t2 = time * 0.0022;
    const t3 = time * 0.0018;

    layers.forEach((layer, li) => {
      const h = baseHeight * layer.heightMul;
      const w = baseWidth * layer.widthMul;

      for (let y = 0; y < h; y += ps) {
        const yRatio = y / h;

        // 柔和的左右摆动（越高摆动越大，模拟火苗飘动）
        const sway = Math.sin(t1 + y * 0.06 + li * 0.5) * (3 + yRatio * 5) * this.intensity;
        const sway2 = Math.sin(t2 + y * 0.1) * yRatio * 3;

        // 火苗形状：底宽顶尖，二次曲线收窄
        const taper = 1 - yRatio * yRatio; // 顶部急剧收窄
        const breathWidth = 0.9 + 0.1 * Math.sin(t3 + y * 0.08); // 轻微呼吸感
        const rowWidth = w * taper * breathWidth;

        if (rowWidth < 1) continue;

        for (let x = -rowWidth; x < rowWidth; x += ps) {
          const xRatio = Math.abs(x) / Math.max(1, rowWidth);
          // 提高中心密度，边缘稀疏
          const density = 0.85 - yRatio * 0.4 - xRatio * 0.3;
          if (Math.random() < density) {
            const [r, g, b] = layer.color;
            const a = layer.alpha * (1 - yRatio * 0.8) * (1 - xRatio * 0.6);
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
            ctx.fillRect(
              Math.floor((this.cx + x + sway + sway2) / ps) * ps,
              Math.floor((this.cy - y - 8) / ps) * ps,
              ps, ps
            );
          }
        }
      }
    });

    // 火苗尖端 - 1~2 个小火舌自然飘动
    if (this.intensity > 0.3) {
      const tipCount = Math.floor(this.intensity * 2) + 1;
      for (let i = 0; i < tipCount; i++) {
        const tipSway = Math.sin(t1 * 1.5 + i * 2.1) * 6 * this.intensity;
        const tx = this.cx + tipSway;
        const ty = this.cy - baseHeight * 0.9 - Utils.randFloat(2, 8) * this.intensity;
        ctx.fillStyle = `rgba(255, 210, 80, ${Utils.randFloat(0.2, 0.45)})`;
        ctx.fillRect(Math.floor(tx/ps)*ps, Math.floor(ty/ps)*ps, ps, ps);
        // 一个稍暗的像素在上面
        ctx.fillStyle = `rgba(255, 160, 40, ${Utils.randFloat(0.1, 0.25)})`;
        ctx.fillRect(Math.floor(tx/ps)*ps, Math.floor((ty - ps)/ps)*ps, ps, ps);
      }
    }
  },

  // 格式化剩余时间
  getTimeString() {
    if (this.state === 'ash') return '灰烬 · 等待点燃';
    const m = Math.floor(this.remainingTime / 60);
    const s = Math.floor(this.remainingTime % 60);
    if (this.state === 'dying') return `即将熄灭...`;
    return `🔥 燃烧中 · ${m}:${s.toString().padStart(2, '0')}`;
  },

  // 获取篝火故事
  generateStory() {
    const duration = this.stats.startTime
      ? Math.floor((Date.now() - this.stats.startTime) / 1000 / 60)
      : 0;

    let story = '';
    story += `<p>这堆火燃烧了 <b>${duration}</b> 分钟。</p>`;
    story += `<p>🔥 点火人：<b>${this.stats.lighter || '无名旅人'}</b></p>`;
    story += `<p>🪵 共添柴 <b>${this.stats.totalWood}</b> 根</p>`;
    if (this.stats.notesBurned > 0) {
      story += `<p>📝 有 <b>${this.stats.notesBurned}</b> 张纸条化为星火</p>`;
    }
    if (this.stats.foodCooked > 0) {
      story += `<p>🍢 烤了 <b>${this.stats.foodCooked}</b> 份食物</p>`;
    }
    if (this.stats.meteorsSeen > 0) {
      story += `<p>🌠 划过 <b>${this.stats.meteorsSeen}</b> 颗流星</p>`;
    }
    if (this.stats.animalVisits > 0) {
      story += `<p>🦊 来过 <b>${this.stats.animalVisits}</b> 只小动物</p>`;
    }
    return story;
  }
};
