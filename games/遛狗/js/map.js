/**
 * map.js - 公园地图系统（完全重写 - 丰富美观版）
 */

const GameMap = {
  WIDTH: 1600,
  HEIGHT: 1600,
  TILE: 16,
  landmarks: [],
  digSpots: [],
  npcSpawns: [],
  scentMarks: [],

  // 预生成的草地细节（性能优化）
  _grassDetails: [],
  _leaves: [],

  // 预生成星星
  _stars: [],
  // 路灯
  _lamps: [],

  init() {
    this._generateLandmarks();
    this._generateDigSpots();
    this._generateGrassDetails();
    this._generateLeaves();
    this._generateStars();
    this._generateLamps();
    return this;
  },

  _generateStars() {
    for (let i = 0; i < 80; i++) {
      this._stars.push({
        x: Math.random() * this.WIDTH,
        y: Math.random() * this.HEIGHT * 0.35,
        size: 0.8 + Math.random() * 1.2,
        phase: Math.random() * Math.PI * 2,
        speed: 0.008 + Math.random() * 0.015,
      });
    }
  },

  _generateLamps() {
    this._lamps = [
      { x: 350, y: 520 }, { x: 750, y: 520 }, { x: 1100, y: 520 },
      { x: 500, y: 800 }, { x: 900, y: 800 },
      { x: 300, y: 1100 }, { x: 700, y: 1100 }, { x: 1100, y: 1050 },
      { x: 200, y: 350 }, { x: 1300, y: 600 },
    ];
  },

  _generateGrassDetails() {
    // 预生成大量草地纹理点，避免每帧计算
    for (let i = 0; i < 3000; i++) {
      const x = Math.random() * this.WIDTH;
      const y = Math.random() * this.HEIGHT;
      if (this.isWater(x, y)) continue;
      const type = Math.random();
      this._grassDetails.push({
        x, y,
        type: type < 0.3 ? 'dark' : type < 0.5 ? 'light' : type < 0.65 ? 'tuft' : 'dot',
        size: 2 + Math.random() * 3,
      });
    }
  },

  _generateLeaves() {
    // 在树附近生成落叶
    for (const lm of this.landmarks) {
      if (lm.type === 'tree' || lm.type === 'crookedTree') {
        const count = 3 + Math.floor(Math.random() * 5);
        for (let i = 0; i < count; i++) {
          this._leaves.push({
            x: lm.x + (Math.random() - 0.5) * 60,
            y: lm.y + 20 + Math.random() * 30,
            color: ['#8B7355', '#a08050', '#6b8c3e', '#c8a050', '#7a6030'][Math.floor(Math.random() * 5)],
            size: 2 + Math.random() * 2,
            rot: Math.random() * Math.PI,
          });
        }
      }
    }
  },

  _generateLandmarks() {
    this.landmarks = [
      // ---- 树木（多种分布，更密集）----
      { type: 'tree', x: 100, y: 80 }, { type: 'tree', x: 250, y: 60 },
      { type: 'tree', x: 450, y: 100 }, { type: 'tree', x: 700, y: 70 },
      { type: 'tree', x: 950, y: 130 }, { type: 'tree', x: 1200, y: 90 },
      { type: 'tree', x: 1400, y: 160 },
      // 左侧树林带
      { type: 'tree', x: 80, y: 300 }, { type: 'tree', x: 130, y: 350 },
      { type: 'tree', x: 60, y: 400 }, { type: 'tree', x: 140, y: 450 },
      // 中间散落
      { type: 'tree', x: 500, y: 350 }, { type: 'tree', x: 850, y: 280 },
      { type: 'tree', x: 1100, y: 400 }, { type: 'tree', x: 1350, y: 350 },
      // 下半区
      { type: 'tree', x: 300, y: 800 }, { type: 'tree', x: 600, y: 900 },
      { type: 'tree', x: 900, y: 750 }, { type: 'tree', x: 1050, y: 850 },
      { type: 'tree', x: 1300, y: 900 },
      // 底部
      { type: 'tree', x: 150, y: 1200 }, { type: 'tree', x: 500, y: 1300 },
      { type: 'tree', x: 800, y: 1150 }, { type: 'tree', x: 1100, y: 1250 },
      { type: 'tree', x: 1400, y: 1100 },

      // 歪脖子老树
      { type: 'crookedTree', x: 750, y: 500, special: true },

      // ---- 长椅（更多）----
      { type: 'bench', x: 400, y: 300 }, { type: 'bench', x: 800, y: 600 },
      { type: 'bench', x: 300, y: 900 }, { type: 'bench', x: 1100, y: 500 },
      { type: 'bench', x: 600, y: 1200 },

      // ---- 树桩 ----
      { type: 'stump', x: 350, y: 200 }, { type: 'stump', x: 600, y: 550 },
      { type: 'stump', x: 950, y: 400 }, { type: 'stump', x: 450, y: 1000 },
      { type: 'stump', x: 1200, y: 700 },

      // ---- 芦苇丛（湖周围更多）----
      { type: 'reed', x: 180, y: 750 }, { type: 'reed', x: 210, y: 780 },
      { type: 'reed', x: 160, y: 810 }, { type: 'reed', x: 230, y: 830 },
      { type: 'reed', x: 140, y: 850 }, { type: 'reed', x: 200, y: 870 },
      { type: 'reed', x: 260, y: 760 }, { type: 'reed', x: 120, y: 790 },

      // ---- 花丛（更多更分散）----
      { type: 'flower', x: 350, y: 450 }, { type: 'flowerBlue', x: 365, y: 465 },
      { type: 'flowerPink', x: 345, y: 440 },
      { type: 'flower', x: 700, y: 800 }, { type: 'flowerBlue', x: 720, y: 790 },
      { type: 'flowerPink', x: 690, y: 810 },
      { type: 'flower', x: 1000, y: 600 }, { type: 'flowerPink', x: 1015, y: 615 },
      { type: 'flower', x: 1300, y: 500 }, { type: 'flowerBlue', x: 1310, y: 520 },
      { type: 'flower', x: 500, y: 1150 }, { type: 'flowerPink', x: 515, y: 1140 },
      { type: 'flowerBlue', x: 900, y: 1050 },

      // ---- 石头 ----
      { type: 'stone', x: 550, y: 250 }, { type: 'stone', x: 850, y: 500 },
      { type: 'stone', x: 250, y: 700 }, { type: 'stone', x: 1050, y: 350 },
      { type: 'stone', x: 700, y: 1100 }, { type: 'stone', x: 1300, y: 800 },
    ];

    this.npcSpawns = [
      { x: 200, y: 600 },
      { x: 1300, y: 400 },
      { x: 700, y: 1300 },
    ];
  },

  _generateDigSpots() {
    this.digSpots = [
      { x: 360, y: 215, item: 'bone', found: false, name: '小骨头', desc: '一根被埋起来的小骨头' },
      { x: 610, y: 565, item: 'badge', found: false, name: '旧徽章', desc: '一枚锈迹斑斑的旧徽章' },
      { x: 960, y: 415, item: 'bone', found: false, name: '大骨头', desc: '一根粗壮的大骨头' },
      { x: 460, y: 1015, item: 'cookie', found: false, name: '宠物饼干', desc: '一块被埋起来的饼干' },
      { x: 760, y: 515, item: 'bone', found: false, name: '古老骨头', desc: '歪脖子老树下的骨头' },
      { x: 250, y: 780, item: 'badge', found: false, name: '闪亮徽章', desc: '湖边芦苇丛里发现的' },
      { x: 1200, y: 715, item: 'bone', found: false, name: '神秘骨头', desc: '散发着奇怪光芒' },
      { x: 500, y: 1310, item: 'badge', found: false, name: '金色徽章', desc: '非常稀有的收藏' },
    ];
  },

  isWater(x, y) {
    // 更大的湖泊，偏左中位置
    const cx = 200, cy = 800, rx = 140, ry = 100;
    const dx = (x - cx) / rx, dy = (y - cy) / ry;
    return dx * dx + dy * dy < 1;
  },

  isPath(x, y) {
    // 主要环形步道
    const paths = [
      // 横向主道
      () => {
        const py = 560 + Math.sin(x / 200) * 50;
        return Math.abs(y - py) < 16;
      },
      // 纵向主道
      () => {
        const px = 700 + Math.sin(y / 180) * 40;
        return Math.abs(x - px) < 16;
      },
      // 湖边弯路
      () => {
        const angle = Math.atan2(y - 800, x - 200);
        const dist = Math.hypot(x - 200, y - 800);
        return dist > 150 && dist < 180 && angle > -1.5 && angle < 1.5;
      },
      // 右侧小路
      () => {
        const py = 400 + Math.sin(x / 100) * 20;
        return x > 1000 && x < 1500 && Math.abs(y - py) < 12;
      },
    ];

    for (const test of paths) {
      if (test()) return true;
    }
    return false;
  },

  isWalkable(x, y) {
    if (x < 10 || x > this.WIDTH - 10 || y < 10 || y > this.HEIGHT - 10) return false;
    if (this.isWater(x, y)) return false;
    for (const lm of this.landmarks) {
      if (lm.type === 'tree' || lm.type === 'crookedTree') {
        if (Math.abs(x - lm.x - 12) < 10 && Math.abs(y - lm.y + 2) < 10) return false;
      }
    }
    return true;
  },

  getNearbyDigSpot(x, y, radius = 30) {
    return this.digSpots.find(s => !s.found && Math.hypot(s.x - x, s.y - y) < radius);
  },
  getNearbyStump(x, y, radius = 40) {
    return this.landmarks.find(l => l.type === 'stump' && Math.hypot(l.x - x, l.y - y) < radius);
  },
  getNearestBench(x, y) {
    let minDist = Infinity, nearest = null;
    this.landmarks.filter(l => l.type === 'bench').forEach(b => {
      const d = Math.hypot(b.x - x, b.y - y);
      if (d < minDist) { minDist = d; nearest = b; }
    });
    return nearest;
  },
  getBenchAt(x, y, range = 30) {
    return this.landmarks.find(l =>
      l.type === 'bench' && Math.abs(l.x + 20 - x) < range && Math.abs(l.y + 6 - y) < range
    );
  },

  // ===== 渲染（夜景） =====
  render(ctx, camera) {
    const { x: cx, y: cy, w: cw, h: ch } = camera;
    const t = Date.now() / 1000;

    // 地平线位置（相对屏幕）
    const horizonWorld = 420; // 世界坐标中的地平线
    const horizonScreen = horizonWorld - cy;

    // 1) 天空渐变
    const skyGrd = ctx.createLinearGradient(0, 0, 0, Math.max(horizonScreen + 40, ch));
    skyGrd.addColorStop(0, '#0c0c1a');
    skyGrd.addColorStop(0.3, '#1a1430');
    skyGrd.addColorStop(0.6, '#2a2040');
    skyGrd.addColorStop(1, '#1a3028');
    ctx.fillStyle = skyGrd;
    ctx.fillRect(0, 0, cw, ch);

    // 2) 星星（只在天空区域绘制）
    for (const star of this._stars) {
      const sx = star.x - cx, sy = star.y - cy;
      if (sx < -5 || sx > cw + 5 || sy < -5 || sy > horizonScreen + 20) continue;
      const twinkle = 0.15 + 0.6 * Math.abs(Math.sin(t * star.speed * 6 + star.phase));
      ctx.fillStyle = `rgba(255,255,255,${twinkle})`;
      ctx.fillRect(sx, sy, star.size, star.size);
    }

    // 3) 月亮（固定在视口右上角区域）
    const moonX = cw * 0.8;
    const moonY = 60 - cy * 0.02;
    if (moonY > -50 && moonY < ch * 0.5) {
      // 月亮光晕
      ctx.fillStyle = 'rgba(255,252,230,0.05)';
      ctx.beginPath();
      ctx.arc(moonX, moonY, 50, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,252,230,0.1)';
      ctx.beginPath();
      ctx.arc(moonX, moonY, 30, 0, Math.PI * 2);
      ctx.fill();
      // 月亮本体
      ctx.fillStyle = 'rgba(255,252,230,0.9)';
      ctx.beginPath();
      ctx.arc(moonX, moonY, 16, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4) 远山剪影
    const hillY = horizonScreen - 30;
    if (hillY < ch + 60) {
      ctx.fillStyle = '#111a18';
      ctx.beginPath();
      ctx.moveTo(0, hillY + 40);
      for (let x = 0; x <= cw; x += 2) {
        const wx = x + cx;
        const h = Math.sin(wx * 0.003) * 25 + Math.sin(wx * 0.007) * 15 + Math.cos(wx * 0.002) * 20;
        ctx.lineTo(x, hillY - h);
      }
      ctx.lineTo(cw, hillY + 80);
      ctx.lineTo(0, hillY + 80);
      ctx.closePath();
      ctx.fill();
    }

    // 5) 草地
    const grassTop = horizonScreen + 10;
    if (grassTop < ch) {
      const grassGrd = ctx.createLinearGradient(0, Math.max(0, grassTop), 0, ch);
      grassGrd.addColorStop(0, '#1c3c26');
      grassGrd.addColorStop(0.3, '#1e4a2a');
      grassGrd.addColorStop(1, '#0e2418');
      ctx.fillStyle = grassGrd;
      ctx.fillRect(0, Math.max(0, grassTop), cw, ch - Math.max(0, grassTop));
    }

    // 6) 草地细节纹理（暗色调）
    for (const g of this._grassDetails) {
      if (g.x < cx - 10 || g.x > cx + cw + 10 || g.y < cy - 10 || g.y > cy + ch + 10) continue;
      const sx = g.x - cx, sy = g.y - cy;
      switch (g.type) {
        case 'dark':
          ctx.fillStyle = 'rgba(30,60,30,0.4)';
          ctx.fillRect(sx, sy, g.size, g.size);
          break;
        case 'light':
          ctx.fillStyle = 'rgba(40,90,40,0.25)';
          ctx.fillRect(sx, sy, g.size, g.size * 0.6);
          break;
        case 'tuft':
          ctx.fillStyle = '#1a4a20';
          ctx.fillRect(sx, sy, 1, -4);
          ctx.fillRect(sx + 2, sy, 1, -5);
          ctx.fillRect(sx - 1, sy, 1, -3);
          break;
        case 'dot':
          ctx.fillStyle = 'rgba(40,80,35,0.3)';
          ctx.beginPath();
          ctx.arc(sx, sy, g.size * 0.4, 0, Math.PI * 2);
          ctx.fill();
          break;
      }
    }

    // 7) 落叶（暗色调）
    for (const l of this._leaves) {
      if (l.x < cx - 5 || l.x > cx + cw + 5 || l.y < cy - 5 || l.y > cy + ch + 5) continue;
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = l.color;
      ctx.save();
      ctx.translate(l.x - cx, l.y - cy);
      ctx.rotate(l.rot);
      ctx.fillRect(-l.size / 2, -l.size / 4, l.size, l.size / 2);
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    // 8) 小径（暗色调）
    this._renderPaths(ctx, camera);

    // 9) 湖泊
    this._renderLake(ctx, camera);

    // 10) 路灯（下层光晕 - 在地标之前渲染地面光）
    for (const lamp of this._lamps) {
      if (lamp.x < cx - 80 || lamp.x > cx + cw + 80 || lamp.y < cy - 80 || lamp.y > cy + ch + 80) continue;
      const lx = lamp.x - cx, ly = lamp.y - cy;
      // 地面光晕
      ctx.fillStyle = 'rgba(255,220,100,0.04)';
      ctx.beginPath();
      ctx.ellipse(lx, ly + 14, 40, 20, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 11) 地标（按y排序）
    const sorted = [...this.landmarks].sort((a, b) => a.y - b.y);
    for (const lm of sorted) {
      if (lm.x < cx - 60 || lm.x > cx + cw + 60 || lm.y < cy - 60 || lm.y > cy + ch + 60) continue;
      const sprite = SCENE_SPRITES[lm.type];
      if (sprite) {
        if (lm.type === 'tree' || lm.type === 'crookedTree') {
          ctx.fillStyle = 'rgba(0,0,0,0.15)';
          ctx.beginPath();
          ctx.ellipse(lm.x - cx + 15, lm.y - cy + 30, 18, 6, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        PixelArt.draw(ctx, sprite, lm.x - cx, lm.y - cy, 3);
      }
    }

    // 12) 路灯（灯杆 + 灯头 + 上层光晕）
    for (const lamp of this._lamps) {
      if (lamp.x < cx - 50 || lamp.x > cx + cw + 50 || lamp.y < cy - 60 || lamp.y > cy + ch + 30) continue;
      const lx = lamp.x - cx, ly = lamp.y - cy;
      // 灯杆
      ctx.fillStyle = '#4a4a4a';
      ctx.fillRect(lx - 1, ly - 28, 2, 42);
      // 灯头
      ctx.fillStyle = 'rgba(255,220,120,0.9)';
      ctx.beginPath();
      ctx.arc(lx, ly - 28, 3.5, 0, Math.PI * 2);
      ctx.fill();
      // 灯光光晕
      const glow = ctx.createRadialGradient(lx, ly - 20, 2, lx, ly - 10, 35);
      glow.addColorStop(0, 'rgba(255,220,100,0.12)');
      glow.addColorStop(0.5, 'rgba(255,220,100,0.04)');
      glow.addColorStop(1, 'rgba(255,220,100,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(lx, ly - 10, 35, 0, Math.PI * 2);
      ctx.fill();
    }

    // 13) 萤火虫
    for (let i = 0; i < 15; i++) {
      const fx = ((i * 137.5 + 50) % this.WIDTH);
      const fy = 450 + ((i * 89.3 + 30) % (this.HEIGHT - 500));
      if (fx < cx - 20 || fx > cx + cw + 20 || fy < cy - 20 || fy > cy + ch + 20) continue;
      const flicker = 0.15 + 0.55 * Math.abs(Math.sin(t * 1.5 + i * 2.1));
      ctx.fillStyle = `rgba(180,230,100,${flicker})`;
      ctx.beginPath();
      ctx.arc(
        fx - cx + Math.sin(t * 0.8 + i) * 8,
        fy - cy + Math.cos(t + i) * 5,
        1.5, 0, Math.PI * 2
      );
      ctx.fill();
    }

    // 14) 气味标记
    for (const mark of this.scentMarks) {
      if (mark.x < cx - 10 || mark.x > cx + cw + 10 || mark.y < cy - 10 || mark.y > cy + ch + 10) continue;
      ctx.globalAlpha = mark.alpha || 0.3;
      ctx.fillStyle = '#f1c40f';
      ctx.beginPath();
      ctx.arc(mark.x - cx, mark.y - cy, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  },

  _renderPaths(ctx, camera) {
    const { x: cx, y: cy, w: cw, h: ch } = camera;

    // 蜿蜒横路 - 暗色泥土路
    for (let x = Math.max(30, cx - 20); x < Math.min(this.WIDTH - 30, cx + cw + 20); x += 1) {
      const py = 560 + Math.sin(x / 200) * 50;
      const screenX = x - cx;
      if (screenX < -2 || screenX > cw + 2) continue;
      ctx.fillStyle = 'rgba(80,65,40,0.5)';
      ctx.fillRect(screenX, py - cy - 14, 2, 30);
      if ((x & 7) === 0) {
        ctx.fillStyle = 'rgba(70,55,30,0.4)';
        ctx.fillRect(screenX, py - cy - 8, 3, 2);
      }
    }
    for (let x = Math.max(30, cx - 20); x < Math.min(this.WIDTH - 30, cx + cw + 20); x += 2) {
      const py = 560 + Math.sin(x / 200) * 50;
      const screenX = x - cx;
      if (screenX < -2 || screenX > cw + 2) continue;
      ctx.fillStyle = 'rgba(60,50,30,0.4)';
      ctx.fillRect(screenX, py - cy - 15, 2, 2);
      ctx.fillRect(screenX, py - cy + 15, 2, 2);
    }

    // 蜿蜒竖路
    for (let y = Math.max(30, cy - 20); y < Math.min(this.HEIGHT - 30, cy + ch + 20); y += 1) {
      const px = 700 + Math.sin(y / 180) * 40;
      const screenY = y - cy;
      if (screenY < -2 || screenY > ch + 2) continue;
      ctx.fillStyle = 'rgba(80,65,40,0.5)';
      ctx.fillRect(px - cx - 14, screenY, 30, 2);
      if ((y & 7) === 0) {
        ctx.fillStyle = 'rgba(70,55,30,0.4)';
        ctx.fillRect(px - cx - 5, screenY, 2, 3);
      }
    }
    for (let y = Math.max(30, cy - 20); y < Math.min(this.HEIGHT - 30, cy + ch + 20); y += 2) {
      const px = 700 + Math.sin(y / 180) * 40;
      const screenY = y - cy;
      if (screenY < -2 || screenY > ch + 2) continue;
      ctx.fillStyle = 'rgba(60,50,30,0.4)';
      ctx.fillRect(px - cx - 15, screenY, 2, 2);
      ctx.fillRect(px - cx + 15, screenY, 2, 2);
    }
  },

  _renderLake(ctx, camera) {
    const { x: cx, y: cy } = camera;
    const lx = 200, ly = 800, rx = 140, ry = 100;

    // 湖岸泥土（暗色）
    ctx.fillStyle = '#3a3020';
    ctx.beginPath();
    ctx.ellipse(lx - cx, ly - cy, rx + 8, ry + 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // 浅水区
    ctx.fillStyle = '#1a4a5a';
    ctx.beginPath();
    ctx.ellipse(lx - cx, ly - cy, rx + 3, ry + 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // 深水
    ctx.fillStyle = '#153a50';
    ctx.beginPath();
    ctx.ellipse(lx - cx, ly - cy, rx - 5, ry - 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 月光反射
    ctx.fillStyle = 'rgba(200,220,240,0.12)';
    ctx.beginPath();
    ctx.ellipse(lx - cx - 20, ly - cy - 15, rx * 0.3, ry * 0.15, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // 动态波纹（暗色）
    const t = Date.now() / 1000;
    ctx.strokeStyle = 'rgba(100,160,200,0.12)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const wr = 20 + i * 25 + Math.sin(t * 0.5 + i) * 5;
      ctx.beginPath();
      ctx.ellipse(lx - cx + Math.sin(t + i) * 10, ly - cy + Math.cos(t * 0.7 + i) * 8, wr, wr * 0.5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  },

  addScentMark(x, y) {
    if (this.scentMarks.length > 50) this.scentMarks.shift();
    this.scentMarks.push({ x, y, alpha: 0.5, time: Date.now() });
  },

  updateScentMarks() {
    const now = Date.now();
    this.scentMarks = this.scentMarks.filter(m => {
      m.alpha = Math.max(0.1, 0.5 - (now - m.time) / 60000);
      return m.alpha > 0.1;
    });
  }
};
