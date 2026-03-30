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
        grass1: '#4a7a3a', grass2: '#3d662f', grass3: '#2d5220',
        detail_dark: 'rgba(40,70,40,0.4)', detail_light: 'rgba(70,120,60,0.25)',
        tuft: '#3a6125', dot: 'rgba(50,90,45,0.3)',
        path: '#b5854a', pathEdge: '#8f6130', pathBorder: '#613b16',
        lakeShore: '#3a2e1d', lakeShallow: '#366e7a', lakeDeep: '#26535e',
        lakeHighlight: 'rgba(180,200,220,0.15)',
        lampGlow: 'rgba(255,220,100,0.05)', lampDot: 'rgba(255,220,120,0.4)',
        overlay: 'rgba(200,120,80,0.15)', // 晨光
        firefly: 0.2,
      };
      case 'day': return {
        grass1: '#5fac33', grass2: '#52962a', grass3: '#458220',
        detail_dark: 'rgba(50,90,40,0.35)', detail_light: 'rgba(90,150,70,0.25)',
        tuft: '#4a8a1c', dot: 'rgba(60,110,50,0.3)',
        path: '#d4a464', pathEdge: '#ad7637', pathBorder: '#804c1e',
        lakeShore: '#453625', lakeShallow: '#418b99', lakeDeep: '#2d6a7d',
        lakeHighlight: 'rgba(150,210,240,0.3)',
        lampGlow: 'rgba(255,220,100,0)', lampDot: 'rgba(200,200,200,0.3)',
        overlay: null,
        firefly: 0,
      };
      case 'dusk': return {
        grass1: '#3d7020', grass2: '#345e1a', grass3: '#284a12',
        detail_dark: 'rgba(35,65,30,0.4)', detail_light: 'rgba(55,100,50,0.25)',
        tuft: '#386318', dot: 'rgba(45,85,38,0.3)',
        path: '#c49060', pathEdge: '#a06e3e', pathBorder: '#704a22',
        lakeShore: '#382a1c', lakeShallow: '#326c7a', lakeDeep: '#21505e',
        lakeHighlight: 'rgba(220,180,140,0.18)',
        lampGlow: 'rgba(255,180,60,0.2)', lampDot: 'rgba(255,200,100,0.8)',
        overlay: 'rgba(200,80,30,0.15)',
        firefly: 0.5,
      };
      default: return { // night
        grass1: '#1e3e24', grass2: '#17301b', grass3: '#112510',
        detail_dark: 'rgba(30,60,30,0.4)', detail_light: 'rgba(40,90,40,0.25)',
        tuft: '#18381c', dot: 'rgba(40,80,35,0.3)',
        path: '#7a6850', pathEdge: '#5c4a35', pathBorder: '#3d3025',
        lakeShore: '#2e2418', lakeShallow: '#1e4a5a', lakeDeep: '#153542',
        lakeHighlight: 'rgba(160,200,220,0.12)',
        lampGlow: 'rgba(255,200,80,0.25)', lampDot: 'rgba(255,220,120,0.9)',
        overlay: 'rgba(8,12,35,0.4)',
        firefly: 0.8,
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
      if (lm.type === 'bigTree') {
        if (x > lm.x + 10 && x < lm.x + 50 && y > lm.y + 30 && y < lm.y + 55) return false;
      } else if (lm.type === 'tree' || lm.type === 'crookedTree' || lm.type === 'roundTree') {
        if (x > lm.x + 5 && x < lm.x + 35 && y > lm.y + 20 && y < lm.y + 45) return false;
      } else if (lm.type === 'bush') {
        if (x > lm.x && x < lm.x + 30 && y > lm.y + 10 && y < lm.y + 25) return false;
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
    const TILE = 32; // 星露谷风格网格尺寸

    // 1) 基础草地底色
    ctx.fillStyle = pal.grass2;
    ctx.fillRect(0, 0, cw, ch);

    // 2) 网格化渲染水、路、草地纹理
    const startX = Math.floor(cx / TILE) * TILE;
    const startY = Math.floor(cy / TILE) * TILE;

    for (let x = startX - TILE; x < cx + cw + TILE; x += TILE) {
      for (let y = startY - TILE; y < cy + ch + TILE; y += TILE) {
        const sx = x - cx;
        const sy = y - cy;
        const cxGrid = x + TILE / 2;
        const cyGrid = y + TILE / 2;

        const isW = this.isWater(cxGrid, cyGrid);
        const isP = this.isPath(cxGrid, cyGrid);

        const hX = Math.floor(x);
        const hY = Math.floor(y);
        const hash = Math.sin(hX * 12.9898 + hY * 78.233) * 43758.5453;
        const rand = hash - Math.floor(hash);

        if (isW) {
          // 伪 Auto-Tiling 计算水岸边
          const wT = this.isWater(cxGrid, cyGrid - TILE);
          const wB = this.isWater(cxGrid, cyGrid + TILE);
          const wL = this.isWater(cxGrid - TILE, cyGrid);
          const wR = this.isWater(cxGrid + TILE, cyGrid);

          const isDeepW = wT && wB && wL && wR;

          // 基础浅水
          ctx.fillStyle = pal.lakeShallow;
          ctx.fillRect(sx, sy, TILE, TILE);

          // 深水及波纹
          if (isDeepW) {
            ctx.fillStyle = pal.lakeDeep;
            ctx.fillRect(sx + 4, sy + 4, TILE - 8, TILE - 8);
            if (Math.sin(x * 12.3 + y * 7.1 + t * 2) > 0.8) {
              ctx.fillStyle = pal.lakeHighlight;
              ctx.fillRect(sx + 8, sy + 12, TILE - 16, 4);
            }
          }

          // 绘制泥土色的岸边
          ctx.fillStyle = pal.lakeShore;
          if (!wT) ctx.fillRect(sx, sy, TILE, 6);
          if (!wB) ctx.fillRect(sx, sy + TILE - 6, TILE, 6);
          if (!wL) ctx.fillRect(sx, sy, 6, TILE);
          if (!wR) ctx.fillRect(sx + TILE - 6, sy, 6, TILE);

          // 岸边过渡点缀（角落泥土）
          if (!wT && !wL) ctx.fillRect(sx, sy, 8, 8);
          if (!wT && !wR) ctx.fillRect(sx + TILE - 8, sy, 8, 8);
          if (!wB && !wL) ctx.fillRect(sx, sy + TILE - 8, 8, 8);
          if (!wB && !wR) ctx.fillRect(sx + TILE - 8, sy + TILE - 8, 8, 8);
        } else if (isP) {
          // 土路
          ctx.fillStyle = pal.pathBorder;
          ctx.fillRect(sx, sy, TILE, TILE);

          // 内部稍微亮一点
          ctx.fillStyle = pal.pathEdge;
          ctx.fillRect(sx + 2, sy + 2, TILE - 4, TILE - 4);

          ctx.fillStyle = pal.path;
          ctx.fillRect(sx + 4, sy + 4, TILE - 8, TILE - 8);

          // 路面随机斑点
          if (rand < 0.2) {
            ctx.fillStyle = pal.pathEdge;
            ctx.fillRect(sx + 8, sy + 8, 8, 8);
          }
        } else {
          // 草地网格交错颜色
          if ((Math.floor(x / TILE) + Math.floor(y / TILE)) % 2 === 0) {
            ctx.fillStyle = pal.grass1;
            ctx.fillRect(sx, sy, TILE, TILE);
          }
          // 星露谷风格小草簇 (V型或U型)
          if (rand < 0.1) {
            ctx.fillStyle = pal.tuft;
            ctx.fillRect(sx + 8, sy + 12, 4, 8);
            ctx.fillRect(sx + 12, sy + 8, 4, 12);
            ctx.fillRect(sx + 16, sy + 12, 4, 8);
          } else if (rand > 0.9) {
            ctx.fillStyle = pal.detail_dark;
            ctx.fillRect(sx + 4, sy + 4, 8, 4);
            ctx.fillRect(sx + 12, sy + 8, 4, 4);
          }
        }
      }
    }

    // 3) 草地细节
    for (const g of this._grassDetails) {
      if (g.x < cx - 10 || g.x > cx + cw + 10 || g.y < cy - 10 || g.y > cy + ch + 10) continue;
      const sx = g.x - cx, sy = g.y - cy;
      switch (g.type) {
        case 'dark': ctx.fillStyle = pal.detail_dark; ctx.fillRect(sx, sy, g.size, g.size); break;
        case 'light': ctx.fillStyle = pal.detail_light; ctx.fillRect(sx, sy, g.size, g.size * 0.6); break;
        case 'tuft': ctx.fillStyle = pal.tuft; ctx.fillRect(sx, sy, 1, -4); ctx.fillRect(sx+2, sy, 1, -5); ctx.fillRect(sx-1, sy, 1, -3); break;
        case 'dot': ctx.fillStyle = pal.dot; ctx.fillRect(sx, sy, g.size, g.size); break;
      }
    }

    // 4) 落叶
    for (const l of this._leaves) {
      if (l.x < cx - 5 || l.x > cx + cw + 5 || l.y < cy - 5 || l.y > cy + ch + 5) continue;
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = l.color;
      ctx.save(); ctx.translate(l.x - cx, l.y - cy); ctx.rotate(l.rot);
      ctx.fillRect(-l.size/2, -l.size/4, l.size, l.size/2);
      ctx.restore(); ctx.globalAlpha = 1;
    }

    // 5) 路灯光晕
    for (const lamp of this._lamps) {
      if (lamp.x < cx - 80 || lamp.x > cx + cw + 80 || lamp.y < cy - 80 || lamp.y > cy + ch + 80) continue;
      const lx = lamp.x - cx, ly = lamp.y - cy;
      if (pal.lampGlow !== 'rgba(255,220,100,0)') {
        const glow = ctx.createRadialGradient(lx, ly, 2, lx, ly, 60);
        glow.addColorStop(0, pal.lampGlow);
        glow.addColorStop(1, 'rgba(255,220,100,0)');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(lx, ly, 60, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = pal.lampDot;
      ctx.beginPath(); ctx.arc(lx, ly, 4, 0, Math.PI * 2); ctx.fill();
    }

    // 6) 地标（按y排序）
    const sorted = [...this.landmarks].sort((a, b) => a.y - b.y);
    for (const lm of sorted) {
      if (lm.x < cx - 80 || lm.x > cx + cw + 80 || lm.y < cy - 80 || lm.y > cy + ch + 80) continue;
      this._renderLandmark(ctx, lm, cx, cy);
    }

    // 7) 萤火虫（夜晚/黄昏可见）
    if (pal.firefly > 0) {
      for (let i = 0; i < 20; i++) {
        const fx = ((i * 137.5 + 50 + t * 5) % this.WIDTH);
        const fy = ((i * 89.3 + 30 + Math.sin(t + i) * 10) % this.HEIGHT);
        if (fx < cx - 20 || fx > cx + cw + 20 || fy < cy - 20 || fy > cy + ch + 20) continue;
        const flicker = 0.2 + pal.firefly * Math.abs(Math.sin(t * 3 + i * 2.1));
        ctx.fillStyle = `rgba(180,230,100,${flicker})`;
        ctx.fillRect(fx - cx, fy - cy, 3, 3);
      }
    }

    // 8) 时间覆盖层
    if (pal.overlay) {
      ctx.fillStyle = pal.overlay;
      ctx.fillRect(0, 0, cw, ch);
    }

    // 9) 气味标记
    for (const mark of this.scentMarks) {
      if (mark.x < cx - 10 || mark.x > cx + cw + 10 || mark.y < cy - 10 || mark.y > cy + ch + 10) continue;
      ctx.globalAlpha = mark.alpha || 0.3;
      ctx.fillStyle = '#f1c40f';
      ctx.fillRect(mark.x - cx - 2, mark.y - cy - 2, 4, 4);
      ctx.globalAlpha = 1;
    }
  },

  // 渲染单个地标
  _renderLandmark(ctx, lm, cx, cy) {
    const x = lm.x - cx, y = lm.y - cy;
    const sprite = SCENE_SPRITES[lm.type];
    
    // 统一像素风地标阴影
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    if (lm.type === 'bigTree') {
      ctx.fillRect(x + 12, y + 36, 40, 16);
      if (sprite) PixelArt.draw(ctx, sprite, x, y, 3);
    } else if (lm.type === 'roundTree') {
      ctx.fillRect(x + 8, y + 26, 28, 12);
      if (sprite) PixelArt.draw(ctx, sprite, x, y, 3);
    } else if (lm.type === 'bush') {
      ctx.fillRect(x + 4, y + 14, 28, 8);
      if (sprite) PixelArt.draw(ctx, sprite, x, y, 3);
    } else if (lm.type === 'tree' || lm.type === 'crookedTree') {
      ctx.fillRect(x + 10, y + 28, 28, 12);
      if (sprite) PixelArt.draw(ctx, sprite, x, y, 3);
    } else {
      ctx.fillRect(x + 4, y + 10, 24, 8);
      if (sprite) PixelArt.draw(ctx, sprite, x, y, 3);
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
