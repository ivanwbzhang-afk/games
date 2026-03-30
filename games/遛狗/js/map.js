/**
 * map.js - 公园地图系统（俯视 + 真实时间光线）
 */

const GameMap = {
  WIDTH: 1600,
  HEIGHT: 1600,
  TILE: 16,
  landmarks: [],
  digSpots: [],
  npcSpawns: [],
  scentMarks: [],

  _grassDetails: [],
  _leaves: [],
  _lamps: [],

  // 时间光线系统
  _timeOfDay: 'day', // dawn, day, dusk, night

  getTimeOfDay() {
    const h = new Date().getHours();
    if (h >= 5 && h < 7) return 'dawn';
    if (h >= 7 && h < 17) return 'day';
    if (h >= 17 && h < 19) return 'dusk';
    return 'night';
  },

  // 根据时间返回环境配色
  getTimePalette() {
    const tod = this.getTimeOfDay();
    switch (tod) {
      case 'dawn': return {
        grass1: '#2a4a30', grass2: '#305538', grass3: '#253e28',
        detail_dark: 'rgba(40,70,40,0.4)', detail_light: 'rgba(70,120,60,0.25)',
        tuft: '#2a5528', dot: 'rgba(50,90,45,0.3)',
        path: 'rgba(100,85,55,0.45)', pathEdge: 'rgba(80,65,40,0.35)',
        lakeShore: '#4a4030', lakeShallow: '#3a6a7a', lakeDeep: '#2a5a6a',
        lakeHighlight: 'rgba(180,200,220,0.15)',
        lampGlow: 'rgba(255,220,100,0.05)', lampDot: 'rgba(255,220,120,0.4)',
        overlay: 'rgba(180,140,100,0.08)', // 暖色微光
        firefly: 0.3,
      };
      case 'day': return {
        grass1: '#3a6a3a', grass2: '#448a44', grass3: '#2e5a2e',
        detail_dark: 'rgba(50,90,40,0.35)', detail_light: 'rgba(90,150,70,0.25)',
        tuft: '#3a7a30', dot: 'rgba(60,110,50,0.3)',
        path: 'rgba(160,140,100,0.5)', pathEdge: 'rgba(130,110,70,0.4)',
        lakeShore: '#6a6040', lakeShallow: '#4a90b0', lakeDeep: '#3a80a0',
        lakeHighlight: 'rgba(150,210,240,0.3)',
        lampGlow: 'rgba(255,220,100,0)', lampDot: 'rgba(200,200,200,0.3)',
        overlay: null,
        firefly: 0,
      };
      case 'dusk': return {
        grass1: '#2e4a28', grass2: '#385530', grass3: '#233a20',
        detail_dark: 'rgba(35,65,30,0.4)', detail_light: 'rgba(55,100,50,0.25)',
        tuft: '#244a20', dot: 'rgba(45,85,38,0.3)',
        path: 'rgba(110,90,60,0.45)', pathEdge: 'rgba(90,70,45,0.35)',
        lakeShore: '#504030', lakeShallow: '#2a5a6a', lakeDeep: '#204a5a',
        lakeHighlight: 'rgba(220,180,140,0.15)',
        lampGlow: 'rgba(255,200,80,0.06)', lampDot: 'rgba(255,200,100,0.6)',
        overlay: 'rgba(160,100,60,0.06)',
        firefly: 0.4,
      };
      default: return { // night
        grass1: '#1a3a24', grass2: '#1e4a2a', grass3: '#162e1e',
        detail_dark: 'rgba(30,60,30,0.4)', detail_light: 'rgba(40,90,40,0.25)',
        tuft: '#1a4a20', dot: 'rgba(40,80,35,0.3)',
        path: 'rgba(80,65,40,0.5)', pathEdge: 'rgba(60,50,30,0.4)',
        lakeShore: '#3a3020', lakeShallow: '#1a4a5a', lakeDeep: '#153a50',
        lakeHighlight: 'rgba(200,220,240,0.12)',
        lampGlow: 'rgba(255,220,100,0.08)', lampDot: 'rgba(255,220,120,0.7)',
        overlay: null,
        firefly: 0.55,
      };
    }
  },

  init() {
    this._generateLandmarks();
    this._generateDigSpots();
    this._generateGrassDetails();
    this._generateLeaves();
    this._generateLamps();
    return this;
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
      // ---- 大树（bigTree）散布全图 ----
      { type: 'bigTree', x: 100, y: 80 }, { type: 'bigTree', x: 450, y: 100 },
      { type: 'bigTree', x: 850, y: 130 }, { type: 'bigTree', x: 1200, y: 90 },
      { type: 'bigTree', x: 80, y: 400 }, { type: 'bigTree', x: 500, y: 350 },
      { type: 'bigTree', x: 1100, y: 400 }, { type: 'bigTree', x: 300, y: 800 },
      { type: 'bigTree', x: 900, y: 750 }, { type: 'bigTree', x: 1300, y: 900 },
      { type: 'bigTree', x: 500, y: 1300 }, { type: 'bigTree', x: 1100, y: 1250 },

      // ---- 普通树 ----
      { type: 'tree', x: 250, y: 60 }, { type: 'tree', x: 700, y: 70 },
      { type: 'tree', x: 950, y: 130 }, { type: 'tree', x: 1400, y: 160 },
      { type: 'tree', x: 130, y: 350 }, { type: 'tree', x: 140, y: 450 },
      { type: 'tree', x: 850, y: 280 }, { type: 'tree', x: 1350, y: 350 },
      { type: 'tree', x: 600, y: 900 }, { type: 'tree', x: 1050, y: 850 },
      { type: 'tree', x: 150, y: 1200 }, { type: 'tree', x: 800, y: 1150 },
      { type: 'tree', x: 1400, y: 1100 },

      // ---- 圆形树（roundTree）----
      { type: 'roundTree', x: 350, y: 150 }, { type: 'roundTree', x: 650, y: 250 },
      { type: 'roundTree', x: 1000, y: 300 }, { type: 'roundTree', x: 200, y: 600 },
      { type: 'roundTree', x: 750, y: 650 }, { type: 'roundTree', x: 1200, y: 550 },
      { type: 'roundTree', x: 400, y: 1050 }, { type: 'roundTree', x: 950, y: 1100 },
      { type: 'roundTree', x: 1350, y: 1200 },

      // ---- 灌木丛（bush）----
      { type: 'bush', x: 180, y: 180 }, { type: 'bush', x: 400, y: 250 },
      { type: 'bush', x: 600, y: 150 }, { type: 'bush', x: 800, y: 400 },
      { type: 'bush', x: 1050, y: 200 }, { type: 'bush', x: 1250, y: 450 },
      { type: 'bush', x: 350, y: 650 }, { type: 'bush', x: 700, y: 500 },
      { type: 'bush', x: 550, y: 750 }, { type: 'bush', x: 1000, y: 650 },
      { type: 'bush', x: 250, y: 950 }, { type: 'bush', x: 650, y: 1050 },
      { type: 'bush', x: 850, y: 950 }, { type: 'bush', x: 1150, y: 800 },
      { type: 'bush', x: 1400, y: 700 }, { type: 'bush', x: 450, y: 1250 },
      { type: 'bush', x: 1000, y: 1350 }, { type: 'bush', x: 1300, y: 1050 },

      // 歪脖子老树
      { type: 'crookedTree', x: 750, y: 500, special: true },

      // ---- 长椅 ----
      { type: 'bench', x: 400, y: 300 }, { type: 'bench', x: 800, y: 600 },
      { type: 'bench', x: 300, y: 900 }, { type: 'bench', x: 1100, y: 500 },
      { type: 'bench', x: 600, y: 1200 },

      // ---- 树桩 ----
      { type: 'stump', x: 350, y: 200 }, { type: 'stump', x: 600, y: 550 },
      { type: 'stump', x: 950, y: 400 }, { type: 'stump', x: 450, y: 1000 },
      { type: 'stump', x: 1200, y: 700 },

      // ---- 芦苇丛 ----
      { type: 'reed', x: 180, y: 750 }, { type: 'reed', x: 210, y: 780 },
      { type: 'reed', x: 160, y: 810 }, { type: 'reed', x: 230, y: 830 },
      { type: 'reed', x: 140, y: 850 }, { type: 'reed', x: 200, y: 870 },
      { type: 'reed', x: 260, y: 760 }, { type: 'reed', x: 120, y: 790 },

      // ---- 花丛 ----
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

  // ===== 渲染（俯视 + 时间同步） =====
  render(ctx, camera) {
    const { x: cx, y: cy, w: cw, h: ch } = camera;
    const t = Date.now() / 1000;
    const pal = this.getTimePalette();

    // 1) 全屏草地
    const grassGrd = ctx.createLinearGradient(0, 0, 0, ch);
    grassGrd.addColorStop(0, pal.grass1);
    grassGrd.addColorStop(0.5, pal.grass2);
    grassGrd.addColorStop(1, pal.grass3);
    ctx.fillStyle = grassGrd;
    ctx.fillRect(0, 0, cw, ch);

    // 2) 草地细节
    for (const g of this._grassDetails) {
      if (g.x < cx - 10 || g.x > cx + cw + 10 || g.y < cy - 10 || g.y > cy + ch + 10) continue;
      const sx = g.x - cx, sy = g.y - cy;
      switch (g.type) {
        case 'dark': ctx.fillStyle = pal.detail_dark; ctx.fillRect(sx, sy, g.size, g.size); break;
        case 'light': ctx.fillStyle = pal.detail_light; ctx.fillRect(sx, sy, g.size, g.size * 0.6); break;
        case 'tuft': ctx.fillStyle = pal.tuft; ctx.fillRect(sx, sy, 1, -4); ctx.fillRect(sx+2, sy, 1, -5); ctx.fillRect(sx-1, sy, 1, -3); break;
        case 'dot': ctx.fillStyle = pal.dot; ctx.beginPath(); ctx.arc(sx, sy, g.size*0.4, 0, Math.PI*2); ctx.fill(); break;
      }
    }

    // 3) 落叶
    for (const l of this._leaves) {
      if (l.x < cx - 5 || l.x > cx + cw + 5 || l.y < cy - 5 || l.y > cy + ch + 5) continue;
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = l.color;
      ctx.save(); ctx.translate(l.x - cx, l.y - cy); ctx.rotate(l.rot);
      ctx.fillRect(-l.size/2, -l.size/4, l.size, l.size/2);
      ctx.restore(); ctx.globalAlpha = 1;
    }

    // 4) 小径
    this._renderPaths(ctx, camera, pal);

    // 5) 湖泊
    this._renderLake(ctx, camera, pal);

    // 6) 路灯光晕
    for (const lamp of this._lamps) {
      if (lamp.x < cx - 80 || lamp.x > cx + cw + 80 || lamp.y < cy - 80 || lamp.y > cy + ch + 80) continue;
      const lx = lamp.x - cx, ly = lamp.y - cy;
      if (pal.lampGlow !== 'rgba(255,220,100,0)') {
        const glow = ctx.createRadialGradient(lx, ly, 2, lx, ly, 45);
        glow.addColorStop(0, pal.lampGlow);
        glow.addColorStop(1, 'rgba(255,220,100,0)');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(lx, ly, 45, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = pal.lampDot;
      ctx.beginPath(); ctx.arc(lx, ly, 3, 0, Math.PI * 2); ctx.fill();
    }

    // 7) 地标（按y排序）
    const sorted = [...this.landmarks].sort((a, b) => a.y - b.y);
    for (const lm of sorted) {
      if (lm.x < cx - 80 || lm.x > cx + cw + 80 || lm.y < cy - 80 || lm.y > cy + ch + 80) continue;
      this._renderLandmark(ctx, lm, cx, cy);
    }

    // 8) 萤火虫（夜晚/黄昏可见）
    if (pal.firefly > 0) {
      for (let i = 0; i < 15; i++) {
        const fx = ((i * 137.5 + 50) % this.WIDTH);
        const fy = ((i * 89.3 + 30) % this.HEIGHT);
        if (fx < cx - 20 || fx > cx + cw + 20 || fy < cy - 20 || fy > cy + ch + 20) continue;
        const flicker = 0.15 + pal.firefly * Math.abs(Math.sin(t * 1.5 + i * 2.1));
        ctx.fillStyle = `rgba(180,230,100,${flicker})`;
        ctx.beginPath();
        ctx.arc(fx - cx + Math.sin(t*0.8+i)*8, fy - cy + Math.cos(t+i)*5, 1.5, 0, Math.PI*2);
        ctx.fill();
      }
    }

    // 9) 时间覆盖层
    if (pal.overlay) {
      ctx.fillStyle = pal.overlay;
      ctx.fillRect(0, 0, cw, ch);
    }

    // 10) 气味标记
    for (const mark of this.scentMarks) {
      if (mark.x < cx - 10 || mark.x > cx + cw + 10 || mark.y < cy - 10 || mark.y > cy + ch + 10) continue;
      ctx.globalAlpha = mark.alpha || 0.3;
      ctx.fillStyle = '#f1c40f';
      ctx.beginPath(); ctx.arc(mark.x - cx, mark.y - cy, 2, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;
    }
  },

  // 渲染单个地标
  _renderLandmark(ctx, lm, cx, cy) {
    const x = lm.x - cx, y = lm.y - cy;
    const sprite = SCENE_SPRITES[lm.type];
    if (lm.type === 'bigTree') {
      // 大树：圆形树冠 + 粗树干（俯视）
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.beginPath(); ctx.ellipse(x+18, y+40, 28, 10, 0, 0, Math.PI*2); ctx.fill();
      if (sprite) PixelArt.draw(ctx, sprite, x, y, 3);
    } else if (lm.type === 'roundTree') {
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.beginPath(); ctx.ellipse(x+12, y+28, 18, 7, 0, 0, Math.PI*2); ctx.fill();
      if (sprite) PixelArt.draw(ctx, sprite, x, y, 3);
    } else if (lm.type === 'bush') {
      if (sprite) PixelArt.draw(ctx, sprite, x, y, 3);
    } else if (lm.type === 'tree' || lm.type === 'crookedTree') {
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.beginPath(); ctx.ellipse(x+15, y+30, 18, 6, 0, 0, Math.PI*2); ctx.fill();
      if (sprite) PixelArt.draw(ctx, sprite, x, y, 3);
    } else {
      if (sprite) PixelArt.draw(ctx, sprite, x, y, 3);
    }
  },

  _renderPaths(ctx, camera, pal) {
    const { x: cx, y: cy, w: cw, h: ch } = camera;
    for (let x = Math.max(30, cx - 20); x < Math.min(this.WIDTH - 30, cx + cw + 20); x += 1) {
      const py = 560 + Math.sin(x / 200) * 50;
      const screenX = x - cx;
      if (screenX < -2 || screenX > cw + 2) continue;
      ctx.fillStyle = pal.path;
      ctx.fillRect(screenX, py - cy - 14, 2, 30);
    }
    for (let y = Math.max(30, cy - 20); y < Math.min(this.HEIGHT - 30, cy + ch + 20); y += 1) {
      const px = 700 + Math.sin(y / 180) * 40;
      const screenY = y - cy;
      if (screenY < -2 || screenY > ch + 2) continue;
      ctx.fillStyle = pal.path;
      ctx.fillRect(px - cx - 14, screenY, 30, 2);
    }
  },

  _renderLake(ctx, camera, pal) {
    const { x: cx, y: cy } = camera;
    const lx = 200, ly = 800, rx = 140, ry = 100;

    // 湖岸泥土（暗色）
    ctx.fillStyle = pal.lakeShore;
    ctx.beginPath();
    ctx.ellipse(lx - cx, ly - cy, rx + 8, ry + 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // 浅水区
    ctx.fillStyle = pal.lakeShallow;
    ctx.beginPath();
    ctx.ellipse(lx - cx, ly - cy, rx + 3, ry + 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // 深水
    ctx.fillStyle = pal.lakeDeep;
    ctx.beginPath();
    ctx.ellipse(lx - cx, ly - cy, rx - 5, ry - 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 月光反射
    ctx.fillStyle = pal.lakeHighlight;
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
