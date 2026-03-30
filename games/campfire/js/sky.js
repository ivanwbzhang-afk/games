/* ========== Sky & Environment System (俯视视角) ========== */
const Sky = {
  // 天空颜色配置 — 更丰富的24小时关键帧，模拟真实大气散射色调
  colorStops: [
    { hour: 0,    sky: '#080e28', horizon: '#0c1230' },   // 深夜 — 极深蓝黑
    { hour: 3,    sky: '#0a1030', horizon: '#101838' },   // 凌晨 — 微微泛蓝
    { hour: 4.5,  sky: '#141e48', horizon: '#1e2858' },   // 黎明前 — 深靛蓝
    { hour: 5.2,  sky: '#2a3468', horizon: '#3a2858' },   // 蓝色时刻(blue hour) — 天际紫蓝
    { hour: 5.8,  sky: '#3e4878', horizon: '#6a3858' },   // 曙暮光 — 地平线泛紫红
    { hour: 6.2,  sky: '#5a5888', horizon: '#d07050' },   // 日出前 — 天空淡紫，地平线橙红
    { hour: 6.5,  sky: '#7a6898', horizon: '#e88860' },   // 日出 — 紫金混合
    { hour: 7.0,  sky: '#8a88b8', horizon: '#f0a870' },   // 日出后 — 暖粉蓝
    { hour: 7.5,  sky: '#88aad0', horizon: '#f0c088' },   // 晨光 — 柔和蓝+金边
    { hour: 8.5,  sky: '#8abce0', horizon: '#d8dce8' },   // 清晨 — 清新蓝
    { hour: 10,   sky: '#78b8ee', horizon: '#b0d8f0' },   // 上午 — 明亮天蓝
    { hour: 12,   sky: '#68b0f0', horizon: '#98d0f0' },   // 正午 — 最明亮蓝
    { hour: 14,   sky: '#70b4ec', horizon: '#a0d4f0' },   // 下午 — 稳定蓝
    { hour: 15.5, sky: '#78ade0', horizon: '#b0ccec' },   // 午后 — 微微偏暖
    { hour: 16.5, sky: '#7898c8', horizon: '#c0b8c8' },   // 傍晚前 — 开始偏暖灰
    { hour: 17.2, sky: '#7080b0', horizon: '#d09878' },   // 黄金时刻开始 — 暖金
    { hour: 17.8, sky: '#6870a0', horizon: '#d88058' },   // 黄金时刻 — 深金橙
    { hour: 18.2, sky: '#584878', horizon: '#c06040' },   // 日落 — 紫橙
    { hour: 18.6, sky: '#3e3068', horizon: '#a84830' },   // 日落后 — 深紫+暗红
    { hour: 19.0, sky: '#2a2458', horizon: '#6a3038' },   // 蓝色时刻 — 深蓝紫+暗红
    { hour: 19.5, sky: '#1a1a48', horizon: '#3a2040' },   // 暮色 — 靛蓝
    { hour: 20.2, sky: '#101438', horizon: '#1a1838' },   // 入夜 — 深蓝
    { hour: 21,   sky: '#0c1030', horizon: '#121630' },   // 夜晚 — 深蓝黑
    { hour: 24,   sky: '#080e28', horizon: '#0c1230' },   // 午夜 — 回到深夜
  ],

  stars: [],
  maxStars: 50,
  shootingStars: [],
  clouds: [],
  trees: [],
  fireflies: [],
  _treesGenerated: false, // 树只生成一次
  _treeTemplates: null,   // 存储树的归一化模板（0~1 比例）

  // 种子随机数生成器（确保树木位置固定）
  _seededRandom: (function() {
    let seed = 20260101; // 固定种子
    return {
      reset() { seed = 20260101; },
      next() {
        seed = (seed * 16807 + 0) % 2147483647;
        return (seed - 1) / 2147483646;
      },
      float(min, max) { return min + this.next() * (max - min); },
      int(min, max) { return Math.floor(this.float(min, max + 1)); }
    };
  })(),

  init(canvasWidth, canvasHeight) {
    this.w = canvasWidth;
    this.h = canvasHeight;
    // 俯视视角：天空只占顶部很窄的区域，地面是主体
    this.groundY = canvasHeight * 0.18;

    // 星星 - 只在顶部窄条
    this.stars = [];
    for (let i = 0; i < this.maxStars; i++) {
      this.stars.push({
        x: Utils.randFloat(0, canvasWidth),
        y: Utils.randFloat(0, this.groundY * 0.9),
        size: Utils.randInt(1, 3),
        twinkleSpeed: Utils.randFloat(0.5, 2),
        twinkleOffset: Utils.randFloat(0, Math.PI * 2),
        brightness: Utils.randFloat(0.4, 1)
      });
    }

    // 云朵 - 顶部
    this.clouds = [];
    for (let i = 0; i < 3; i++) {
      this.clouds.push({
        x: Utils.randFloat(-100, canvasWidth + 100),
        y: Utils.randFloat(5, this.groundY * 0.6),
        width: Utils.randFloat(40, 90),
        speed: Utils.randFloat(0.08, 0.2),
        opacity: Utils.randFloat(0.08, 0.2)
      });
    }

    // 树木 — 只在第一次生成模板，后续 resize 时从模板还原
    if (!this._treesGenerated) {
      this._generateTreeTemplates();
      this._treesGenerated = true;
    }
    this._rebuildTreesFromTemplates();

    // 萤火虫 - 少量分布在地面区域
    this.fireflies = [];
    for (let i = 0; i < 6; i++) {
      this.fireflies.push({
        x: Utils.randFloat(0, canvasWidth),
        y: Utils.randFloat(this.groundY, canvasHeight * 0.85),
        vx: Utils.randFloat(-0.3, 0.3),
        vy: Utils.randFloat(-0.2, 0.2),
        phase: Utils.randFloat(0, Math.PI * 2),
        glowSpeed: Utils.randFloat(1, 3)
      });
    }

    // 地面装饰缓存
    this._stones = null;
    this._grassTufts = null;
  },

  // 用种子随机数生成树的归一化模板（比例值 0~1），确保每次一样
  _generateTreeTemplates() {
    const rng = this._seededRandom;
    rng.reset();
    this._treeTemplates = [];

    // 左侧边缘树
    for (let i = 0; i < 6; i++) {
      this._treeTemplates.push({
        xRatio: rng.float(-0.025, 0.12), baseYRatio: rng.float(0, 0.2),
        height: rng.float(100, 200), width: rng.float(40, 70),
        trunkWidth: rng.int(5, 10), swayOffset: rng.float(0, Math.PI * 2),
        type: rng.int(0, 2), depth: rng.float(0.3, 0.7), group: 'left'
      });
    }
    // 右侧边缘树
    for (let i = 0; i < 6; i++) {
      this._treeTemplates.push({
        xRatio: rng.float(0.88, 1.025), baseYRatio: rng.float(0, 0.2),
        height: rng.float(100, 200), width: rng.float(40, 70),
        trunkWidth: rng.int(5, 10), swayOffset: rng.float(0, Math.PI * 2),
        type: rng.int(0, 2), depth: rng.float(0.3, 0.7), group: 'right'
      });
    }
    // 中景散落树（可砍）
    for (let i = 0; i < 4; i++) {
      const side = rng.next() > 0.5;
      this._treeTemplates.push({
        xRatio: side ? rng.float(0.12, 0.28) : rng.float(0.72, 0.88),
        baseYRatio: rng.float(0.08, 0.35),
        height: rng.float(80, 160), width: rng.float(35, 60),
        trunkWidth: rng.int(5, 9), swayOffset: rng.float(0, Math.PI * 2),
        type: rng.int(0, 2), depth: rng.float(0.4, 0.7), group: 'mid'
      });
    }
    // 远端地平线树
    for (let i = 0; i < 6; i++) {
      this._treeTemplates.push({
        xRatio: rng.float(0.05, 0.95), baseYRatio: rng.float(-0.006, 0.012),
        height: rng.float(30, 60), width: rng.float(15, 35),
        trunkWidth: rng.int(3, 5), swayOffset: rng.float(0, Math.PI * 2),
        type: rng.int(0, 2), depth: rng.float(0.1, 0.3), group: 'far'
      });
    }
  },

  // 根据模板和当前画布尺寸还原树的实际坐标
  _rebuildTreesFromTemplates() {
    this.trees = this._treeTemplates.map(t => ({
      x: t.xRatio * this.w,
      baseY: this.groundY + t.baseYRatio * this.h,
      height: t.height, width: t.width, trunkWidth: t.trunkWidth,
      swayOffset: t.swayOffset, type: t.type, depth: t.depth,
      choppable: true
    }));
  },

  getCurrentColors() {
    const now = new Date();
    const hour = now.getHours() + now.getMinutes() / 60;
    let prev = this.colorStops[0];
    let next = this.colorStops[1];
    for (let i = 0; i < this.colorStops.length - 1; i++) {
      if (hour >= this.colorStops[i].hour && hour < this.colorStops[i+1].hour) {
        prev = this.colorStops[i];
        next = this.colorStops[i+1];
        break;
      }
    }
    const t = (hour - prev.hour) / (next.hour - prev.hour);
    return {
      sky: Utils.lerpColor(prev.sky, next.sky, t),
      horizon: Utils.lerpColor(prev.horizon, next.horizon, t)
    };
  },

  // 检查点击是否命中可砍的树（返回树对象和走到的位置）
  checkTreeClick(clickX, clickY) {
    // 只检测近景可见的大树（depth > 0.3），远端小树太小不可交互
    const clickable = this.trees.filter(t => t.choppable && t.depth > 0.3);
    for (const tree of clickable) {
      // 碰撞框：以树干为中心，宽度基于树冠
      const treeTop = tree.baseY - tree.height * 0.85;
      const treeBottom = tree.baseY + 5;
      const halfW = tree.width * 0.4;
      if (clickX >= tree.x - halfW && clickX <= tree.x + halfW &&
          clickY >= treeTop && clickY <= treeBottom) {
        // 走到树旁边（内侧，朝向画面中心）
        const inward = tree.x < this.w / 2 ? 1 : -1;
        const walkX = Math.max(30, Math.min(this.w - 30, tree.x + inward * (halfW + 15)));
        const walkY = Math.max(this.groundY + 30, Math.min(this.h - 30, tree.baseY));
        return { tree, walkX, walkY };
      }
    }
    return null;
  },

  maybeShootingStar() {
    // 10%/分钟 ≈ 0.0000278/帧@60fps，夜间概率翻倍
    const prob = Utils.isNight() ? 0.000055 : 0.0000278;
    if (Math.random() < prob && this.shootingStars.length < 2) {
      const skyH = this.groundY * 0.9;
      this.shootingStars.push({
        x: Utils.randFloat(this.w * 0.05, this.w * 0.95),
        y: Utils.randFloat(0, skyH),
        vx: Utils.randFloat(2.5, 5) * (Math.random() > 0.5 ? 1 : -1),
        vy: Utils.randFloat(0.5, 2),
        life: 1,
        length: Utils.randInt(12, 30)
      });
    }
  },

  update(time) {
    this.clouds.forEach(c => {
      c.x += c.speed;
      if (c.x > this.w + 150) c.x = -150;
    });

    this.shootingStars = this.shootingStars.filter(s => {
      s.x += s.vx;
      s.y += s.vy;
      s.life -= 0.02;
      return s.life > 0 && s.y < this.groundY;
    });
    this.maybeShootingStar();

    if (Utils.isNight()) {
      this.fireflies.forEach(f => {
        f.x += f.vx + Math.sin(time * 0.001 + f.phase) * 0.2;
        f.y += f.vy + Math.cos(time * 0.0008 + f.phase) * 0.15;
        if (f.x < 0 || f.x > this.w) f.vx *= -1;
        if (f.y < this.groundY || f.y > this.h * 0.9) f.vy *= -1;
        f.x = Math.max(0, Math.min(this.w, f.x));
        f.y = Math.max(this.groundY, Math.min(this.h * 0.9, f.y));
      });
    }
  },

  // 连续环境光参数 — 模拟真实世界24小时色调变化
  getAmbientLight() {
    const p = Utils.getDayProgress(); // 0=午夜, 0.5=正午

    // === 亮度曲线 ===
    // 更平滑的日出/日落过渡，午后有微妙衰减
    let brightness;
    if (p < 0.21) brightness = 0.03;                                    // 0:00-5:02 深夜
    else if (p < 0.245) brightness = Utils.easeInOut((p - 0.21) / 0.035) * 0.15; // 5:02-5:52 曙暮光微亮
    else if (p < 0.30) brightness = 0.15 + Utils.easeInOut((p - 0.245) / 0.055) * 0.85; // 5:52-7:12 日出
    else if (p < 0.50) brightness = 1.0;                                // 白天上午→正午
    else if (p < 0.65) brightness = 1.0 - (p - 0.50) / 0.15 * 0.06;   // 正午→下午微降（0.94）
    else if (p < 0.72) brightness = 0.94 - (p - 0.65) / 0.07 * 0.04;  // 下午→傍晚（0.90）
    else if (p < 0.77) brightness = 0.90 - Utils.easeInOut((p - 0.72) / 0.05) * 0.55; // 黄金时刻急降
    else if (p < 0.83) brightness = 0.35 - Utils.easeInOut((p - 0.77) / 0.06) * 0.32; // 日落→暮色
    else brightness = 0.03;                                              // 夜晚

    // === 色温：多段细分 ===
    // warmth: 0=冷蓝(夜)  0.3=中性白(白天)  0.7-1.0=暖金(黄金时刻)
    // coolness: 额外冷蓝成分（蓝色时刻、深夜）
    let warmth = 0;
    let coolness = 0;

    if (p > 0.215 && p < 0.255) {
      // 曙暮光蓝色时刻(blue hour) — 清冷的蓝紫
      coolness = Math.sin((p - 0.215) / 0.04 * Math.PI) * 0.6;
    } else if (p > 0.255 && p < 0.32) {
      // 日出金色时刻 — 温暖金橙
      warmth = Math.sin((p - 0.255) / 0.065 * Math.PI) * 0.85;
    } else if (p > 0.32 && p < 0.50) {
      // 上午 — 微暖，逐渐中性
      warmth = 0.18 - (p - 0.32) / 0.18 * 0.05;
    } else if (p >= 0.50 && p < 0.65) {
      // 午后 — 微暖偏金
      warmth = 0.13 + (p - 0.50) / 0.15 * 0.12;
    } else if (p >= 0.65 && p < 0.72) {
      // 傍晚前 — 渐暖
      warmth = 0.25 + (p - 0.65) / 0.07 * 0.35;
    } else if (p >= 0.72 && p < 0.78) {
      // 黄金时刻 — 强暖金
      warmth = 0.60 + Math.sin((p - 0.72) / 0.06 * Math.PI) * 0.40;
    } else if (p >= 0.78 && p < 0.82) {
      // 日落后 — 暖色衰减+冷蓝混入
      warmth = 0.60 * (1 - (p - 0.78) / 0.04);
      coolness = Utils.easeInOut((p - 0.78) / 0.04) * 0.5;
    } else if (p >= 0.82 && p < 0.87) {
      // 蓝色时刻(dusk blue hour) — 深蓝紫色调
      coolness = 0.5 - (p - 0.82) / 0.05 * 0.2;
    } else if (brightness < 0.1) {
      // 深夜 — 微冷蓝
      coolness = 0.25;
    }

    // === 太阳位置（供阴影计算）===
    const sunT = Math.max(0, Math.min(1, (p - 0.25) / 0.55));
    const sunNx = 0.15 + sunT * 0.7;
    const sunNy = -0.3 + Math.sin(sunT * Math.PI) * 0.25;

    return { brightness, warmth, coolness, isNight: brightness < 0.15, sunNx, sunNy };
  },

  draw(ctx, time, fireIntensity) {
    const colors = this.getCurrentColors();
    const ambient = this.getAmbientLight();
    const isNight = ambient.isNight;
    const br = ambient.brightness; // 0~1
    const warm = ambient.warmth;   // 0~1
    const ps = 3;

    // ===== 天空（顶部窄条）=====
    const skyGrad = ctx.createLinearGradient(0, 0, 0, this.groundY);
    skyGrad.addColorStop(0, colors.sky);
    skyGrad.addColorStop(1, colors.horizon);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, this.w, this.groundY);

    // ===== 星星 & 月亮 — 根据亮度渐显/渐隐 =====
    const starAlpha = Math.max(0, Math.min(1, (0.25 - br) / 0.2)); // br<0.05全亮, br>0.25全隐
    if (starAlpha > 0.01) {
      this.stars.forEach(star => {
        const twinkle = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(time * 0.001 * star.twinkleSpeed + star.twinkleOffset));
        ctx.fillStyle = `rgba(255, 255, 240, ${star.brightness * twinkle * starAlpha})`;
        ctx.fillRect(
          Math.floor(star.x / ps) * ps,
          Math.floor(star.y / ps) * ps,
          star.size, star.size
        );
      });
      this._drawMoon(ctx, time, starAlpha);
    }
    // ===== 太阳 — 白天渐显 =====
    if (br > 0.1) {
      const sunAlpha = Math.min(1, (br - 0.1) / 0.3);
      this._drawSun(ctx, time, sunAlpha);
    }

    // ===== 流星 =====
    this.shootingStars.forEach(s => {
      ctx.strokeStyle = `rgba(255, 255, 220, ${s.life * 0.8})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - s.vx * s.length * 0.3, s.y - s.vy * s.length * 0.3);
      ctx.stroke();
      ctx.fillStyle = `rgba(255, 255, 255, ${s.life})`;
      ctx.fillRect(Math.floor(s.x), Math.floor(s.y), 3, 3);
    });

    // ===== 云朵 — 色调随时间变化 =====
    const cool = ambient.coolness || 0;
    this.clouds.forEach(c => {
      const cloudAlpha = c.opacity * (0.3 + br * 0.7);
      const cR = Math.floor(100 + br * 155 + warm * 30 - cool * 20);
      const cG = Math.floor(100 + br * 150 + warm * 10 - cool * 25);
      const cB = Math.floor(100 + br * 155 + warm * 20 + cool * 20);
      ctx.fillStyle = `rgba(${Math.max(60,cR)}, ${Math.max(60,cG)}, ${Math.min(255,cB)}, ${cloudAlpha})`;
      this._drawPixelCloud(ctx, c.x, c.y, c.width, ps);
    });

    // ===== 远景树林轮廓（地平线处）=====
    this._drawTreeline(ctx, ambient, fireIntensity);

    // ===== 地面 =====
    this._drawGround(ctx, time, ambient, fireIntensity);

    // ===== 边缘树木阴影（白天）=====
    if (br > 0.3) {
      const shadowAlpha = br * 0.12;
      this.trees.filter(t => t.depth > 0.3).forEach(tree => {
        // 阴影方向：反太阳方向
        const shadowLen = tree.height * 0.4 * (1.2 - Math.sin(Math.max(0, Math.min(1, (Utils.getDayProgress() - 0.25) / 0.55)) * Math.PI) * 0.8);
        const sunT = Math.max(0, Math.min(1, (Utils.getDayProgress() - 0.25) / 0.55));
        const shadowDirX = -(ambient.sunNx - tree.x / this.w) * 2;
        ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
        ctx.beginPath();
        ctx.ellipse(
          tree.x + shadowDirX * shadowLen * 0.5,
          tree.baseY + 4,
          tree.width * 0.3 + shadowLen * 0.15,
          shadowLen * 0.12 + 3,
          shadowDirX * 0.1, 0, Math.PI * 2
        );
        ctx.fill();
      });
    }

    // ===== 边缘树木 =====
    this.trees.filter(t => t.depth > 0.3).forEach(tree => {
      this._drawPixelTree(ctx, tree, time, ambient, fireIntensity);
    });

    // ===== 萤火虫 =====
    if (isNight) {
      this.fireflies.forEach(f => {
        const glow = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(time * 0.001 * f.glowSpeed + f.phase));
        ctx.fillStyle = `rgba(180, 255, 100, ${glow * 0.6})`;
        ctx.fillRect(Math.floor(f.x), Math.floor(f.y), 2, 2);
        ctx.fillStyle = `rgba(180, 255, 100, ${glow * 0.1})`;
        ctx.fillRect(Math.floor(f.x) - 1, Math.floor(f.y) - 1, 4, 4);
      });
    }
  },

  _drawMoon(ctx, time, alpha) {
    alpha = alpha || 1;
    const mx = this.w * 0.78;
    const my = this.groundY * 0.2;
    const ps = 3;
    const moonData = [
      [0,0,1,1,1,1,0,0],
      [0,1,1,1,1,1,1,0],
      [1,1,1,1,1,0,1,0],
      [1,1,1,1,0,0,1,0],
      [1,1,1,1,0,0,1,0],
      [1,1,1,1,1,0,1,0],
      [0,1,1,1,1,1,1,0],
      [0,0,1,1,1,1,0,0],
    ];
    ctx.fillStyle = `rgba(230, 230, 210, ${0.9 * alpha})`;
    moonData.forEach((row, r) => {
      row.forEach((v, c) => {
        if (v) ctx.fillRect(mx + c * ps, my + r * ps, ps, ps);
      });
    });
    ctx.fillStyle = `rgba(200, 200, 180, ${0.06 * alpha})`;
    ctx.beginPath();
    ctx.arc(mx + 12, my + 12, 25, 0, Math.PI * 2);
    ctx.fill();
  },

  _drawSun(ctx, time, alpha) {
    alpha = alpha || 1;
    // 太阳位置：根据一天中的时间移动
    const dayProgress = Utils.getDayProgress();
    const sunT = Math.max(0, Math.min(1, (dayProgress - 0.25) / 0.55));
    const sx = this.w * 0.15 + sunT * this.w * 0.7;
    const sy = this.groundY * (0.8 - Math.sin(sunT * Math.PI) * 0.65);
    const ps = 3;

    // 外层光晕
    const outerR = 30;
    const outerGlow = ctx.createRadialGradient(sx, sy, 0, sx, sy, outerR);
    outerGlow.addColorStop(0, `rgba(255, 240, 180, ${0.15 * alpha})`);
    outerGlow.addColorStop(0.5, `rgba(255, 220, 130, ${0.06 * alpha})`);
    outerGlow.addColorStop(1, 'rgba(255, 200, 100, 0)');
    ctx.fillStyle = outerGlow;
    ctx.beginPath();
    ctx.arc(sx, sy, outerR, 0, Math.PI * 2);
    ctx.fill();

    // 光芒射线
    const rayLen = 12 + Math.sin(time * 0.0008) * 2;
    const rayAngleOffset = time * 0.0002;
    ctx.fillStyle = `rgba(255, 240, 180, ${0.35 * alpha})`;
    for (let i = 0; i < 8; i++) {
      const angle = rayAngleOffset + (i / 8) * Math.PI * 2;
      const rx = sx + Math.cos(angle) * rayLen;
      const ry = sy + Math.sin(angle) * rayLen;
      ctx.fillRect(Math.floor(rx / ps) * ps, Math.floor(ry / ps) * ps, ps, ps);
      const rx2 = sx + Math.cos(angle) * rayLen * 0.6;
      const ry2 = sy + Math.sin(angle) * rayLen * 0.6;
      ctx.fillRect(Math.floor(rx2 / ps) * ps, Math.floor(ry2 / ps) * ps, ps, ps);
    }

    // 太阳本体
    ctx.globalAlpha = alpha;
    const sunData = [
      [0,0,1,1,1,0,0],
      [0,1,2,2,2,1,0],
      [1,2,2,2,2,2,1],
      [1,2,2,2,2,2,1],
      [1,2,2,2,2,2,1],
      [0,1,2,2,2,1,0],
      [0,0,1,1,1,0,0],
    ];
    const startX = sx - 3.5 * ps;
    const startY = sy - 3.5 * ps;
    sunData.forEach((row, r) => {
      row.forEach((v, c) => {
        if (v === 0) return;
        ctx.fillStyle = v === 1 ? 'rgba(255, 200, 80, 0.9)' : 'rgba(255, 240, 200, 0.95)';
        ctx.fillRect(Math.floor(startX + c * ps), Math.floor(startY + r * ps), ps, ps);
      });
    });
    ctx.globalAlpha = 1;
  },

  _drawPixelCloud(ctx, x, y, width, ps) {
    const segments = Math.floor(width / (ps * 2));
    for (let i = 0; i < segments; i++) {
      const h = Math.sin(i / segments * Math.PI) * 3 + 1;
      for (let j = 0; j < h; j++) {
        ctx.fillRect(Math.floor(x + i * ps * 2), Math.floor(y - j * ps), ps * 2, ps);
      }
    }
  },

  // 远景树林 - 地平线处的树林轮廓
  _drawTreeline(ctx, ambient, fireIntensity) {
    const groundY = this.groundY;
    const br = ambient.brightness;
    const warm = ambient.warmth;
    const cool = ambient.coolness || 0;

    // 第一层（最远）
    const r1 = Math.floor(6 + br * 22 + warm * 18 - cool * 4);
    const g1 = Math.floor(12 + br * 48 + warm * 6 - cool * 6);
    const b1 = Math.floor(18 - br * 4 + cool * 18);
    ctx.fillStyle = `rgba(${Math.max(0,r1)}, ${Math.max(0,g1)}, ${Math.max(0,b1)}, 0.85)`;
    ctx.beginPath();
    ctx.moveTo(0, groundY + 5);
    for (let x = 0; x <= this.w; x += 6) {
      const arcOffset = -Math.sin((x / this.w) * Math.PI) * 8;
      const treeShape = Math.abs(Math.sin(x * 0.025)) * 20 + Math.abs(Math.sin(x * 0.06 + 1)) * 10;
      ctx.lineTo(x, groundY + arcOffset - treeShape);
    }
    ctx.lineTo(this.w, groundY + 5);
    ctx.fill();

    // 第二层（稍近）
    const r2 = Math.floor(8 + br * 24 + warm * 14 - cool * 3);
    const g2 = Math.floor(14 + br * 52 + warm * 5 - cool * 5);
    const b2 = Math.floor(20 - br * 6 + cool * 14);
    ctx.fillStyle = `rgba(${Math.max(0,r2)}, ${Math.max(0,g2)}, ${Math.max(0,b2)}, 0.8)`;
    ctx.beginPath();
    ctx.moveTo(0, groundY + 10);
    for (let x = 0; x <= this.w; x += 6) {
      const arcOffset = -Math.sin((x / this.w) * Math.PI) * 5;
      const treeShape = Math.abs(Math.sin(x * 0.03 + 2)) * 16 + Math.abs(Math.sin(x * 0.08 + 0.5)) * 8;
      ctx.lineTo(x, groundY + 5 + arcOffset - treeShape);
    }
    ctx.lineTo(this.w, groundY + 10);
    ctx.fill();
  },

  _drawPixelTree(ctx, tree, time, ambient, fireIntensity) {
    const ps = 4;
    const baseY = tree.baseY;
    const sway = Math.sin(time * 0.0005 + tree.swayOffset) * 2;
    const depthDarken = 1 - tree.depth * 0.3;
    const br = ambient.brightness;
    const warm = ambient.warmth;
    const cool = ambient.coolness || 0;

    // 树干
    const trR = Math.floor((16 + br * 44 + warm * 22 - cool * 8) * depthDarken);
    const trG = Math.floor((12 + br * 32 + warm * 10 - cool * 6) * depthDarken);
    const trB = Math.floor((8 + br * 18 + cool * 12) * depthDarken);
    ctx.fillStyle = `rgb(${Math.max(0,trR)},${Math.max(0,trG)},${Math.max(0,trB)})`;
    const trunkH = tree.height * 0.35;
    for (let i = 0; i < trunkH / ps; i++) {
      ctx.fillRect(
        Math.floor(tree.x - tree.trunkWidth/2 + sway * 0.3),
        Math.floor(baseY - i * ps),
        tree.trunkWidth, ps
      );
    }

    // 树冠
    const levels = Math.floor(tree.height * 0.65 / ps);
    const trunkTop = baseY - trunkH;
    for (let i = 0; i < levels; i++) {
      const ratio = i / levels;
      let w;
      if (tree.type === 0) w = (1 - ratio) * tree.width;
      else if (tree.type === 1) w = Math.sin(ratio * Math.PI) * tree.width * 0.8;
      else w = (1 - ratio * 0.7) * tree.width * 0.5;

      const r = Math.floor((6 + br * 24 + warm * 18 - cool * 6 + Math.sin(i * 0.8) * 4) * depthDarken);
      const g = Math.floor((18 + br * 50 + warm * 8 - cool * 8 + Math.sin(i * 0.5 + 1) * 8) * depthDarken);
      const b = Math.floor((8 + br * 10 + cool * 16 + Math.sin(i * 0.6 + 2) * 4) * depthDarken);

      const fireTint = fireIntensity * 0.1;
      ctx.fillStyle = `rgb(${Math.max(0, r + Math.floor(fireTint * 30))}, ${Math.max(0, g + Math.floor(fireTint * 10))}, ${Math.max(0, b)})`;

      for (let j = -w/2; j < w/2; j += ps) {
        const leafHash = Math.sin(j * 0.7 + i * 1.3) * 0.5 + 0.5;
        if (leafHash > 0.15) {
          ctx.fillRect(
            Math.floor(tree.x + j + sway * ratio),
            Math.floor(trunkTop - i * ps),
            ps, ps
          );
        }
      }
    }
  },

  _drawGround(ctx, time, ambient, fireIntensity) {
    const ps = 4;
    const groundY = this.groundY;
    const fireCx = this.w / 2;
    const fireCy = this.h * 0.52;
    const br = ambient.brightness;
    const warm = ambient.warmth;
    const cool = ambient.coolness || 0;

    // 地面主体 — 连续亮度+色温+冷色调
    for (let y = groundY; y < this.h; y += ps) {
      for (let x = 0; x < this.w; x += ps) {
        const ix = x / ps, iy = y / ps;
        const h = Math.sin(ix * 127.1 + iy * 311.7) * 43758.5453;
        const noise = (h - Math.floor(h));

        // 基础色：夜间深绿→白天明亮草绿，蓝色时刻偏蓝紫，黄金时刻偏暖金
        let r = 12 + br * 38 + warm * 28 - cool * 6 + noise * (4 + br * 6);
        let g = 18 + br * 55 + warm * 6 - cool * 8 + noise * (4 + br * 8);
        let b = 8 + br * 14 - warm * 6 + cool * 20 + noise * (2 + br * 4);

        ctx.fillStyle = `rgb(${Math.floor(Math.max(0, Math.min(255, r)))},${Math.floor(Math.max(0, Math.min(255, g)))},${Math.floor(Math.max(0, Math.min(255, b)))})`;
        ctx.fillRect(x, y, ps, ps);
      }
    }

    // ===== 篝火照明效果 =====
    if (fireIntensity > 0) {
      const lightR = this.w * 0.4 * (0.5 + fireIntensity * 0.5);
      const lightGrad = ctx.createRadialGradient(fireCx, fireCy, 0, fireCx, fireCy, lightR);
      const fireAlpha = fireIntensity * (0.08 + (1 - br) * 0.15);
      lightGrad.addColorStop(0, `rgba(255, 150, 50, ${fireAlpha})`);
      lightGrad.addColorStop(0.35, `rgba(255, 100, 25, ${fireAlpha * 0.4})`);
      lightGrad.addColorStop(1, 'rgba(255, 80, 20, 0)');
      ctx.fillStyle = lightGrad;
      ctx.fillRect(0, groundY, this.w, this.h - groundY);
    }

    // ===== 白天阳光光晕 =====
    if (br > 0.3) {
      const dayProgress = Utils.getDayProgress();
      const sunT = Math.max(0, Math.min(1, (dayProgress - 0.25) / 0.55));
      const sunX = this.w * 0.15 + sunT * this.w * 0.7;
      const sunY = groundY * (0.8 - Math.sin(sunT * Math.PI) * 0.65);
      const haloR = this.w * 0.5;
      const haloAlpha = (br - 0.3) * 0.1 + warm * 0.06;
      const halo = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY + haloR * 0.4, haloR);
      halo.addColorStop(0, `rgba(255, 250, 230, ${haloAlpha})`);
      halo.addColorStop(0.3, `rgba(255, 240, 200, ${haloAlpha * 0.5})`);
      halo.addColorStop(0.7, `rgba(255, 230, 180, ${haloAlpha * 0.15})`);
      halo.addColorStop(1, 'rgba(255, 220, 160, 0)');
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, this.w, this.h);
    }

    // ===== 全局色调叠加 — 更丰富的时段色彩 =====
    // 黄金时刻暖色叠加
    if (warm > 0.1) {
      ctx.fillStyle = `rgba(255, 150, 50, ${warm * 0.10})`;
      ctx.fillRect(0, 0, this.w, this.h);
      // 强黄金时刻额外橙红叠加
      if (warm > 0.5) {
        ctx.fillStyle = `rgba(255, 100, 30, ${(warm - 0.5) * 0.08})`;
        ctx.fillRect(0, 0, this.w, this.h);
      }
    }
    // 蓝色时刻 — 蓝紫色叠加（日出前/日落后）
    if (cool > 0.05) {
      ctx.fillStyle = `rgba(40, 30, 100, ${cool * 0.12})`;
      ctx.fillRect(0, 0, this.w, this.h);
      // 地平线附近偏紫红
      const blueGrad = ctx.createLinearGradient(0, 0, 0, this.h);
      blueGrad.addColorStop(0, `rgba(30, 20, 80, ${cool * 0.06})`);
      blueGrad.addColorStop(0.3, 'rgba(30, 20, 80, 0)');
      blueGrad.addColorStop(0.7, 'rgba(30, 20, 80, 0)');
      blueGrad.addColorStop(1, `rgba(50, 25, 60, ${cool * 0.05})`);
      ctx.fillStyle = blueGrad;
      ctx.fillRect(0, 0, this.w, this.h);
    }
    // 夜间冷蓝叠加
    if (br < 0.3 && warm < 0.2 && cool < 0.3) {
      ctx.fillStyle = `rgba(15, 25, 70, ${(0.3 - br) * 0.15})`;
      ctx.fillRect(0, 0, this.w, this.h);
    }

    // ===== 全局暗色遮罩 =====
    const darkAlpha = Math.max(0, (1 - br) * 0.5 - fireIntensity * (1 - br) * 0.25);
    if (darkAlpha > 0.02) {
      const clearR = this.w * 0.25 * (0.5 + fireIntensity * 0.8);
      const darkGrad = ctx.createRadialGradient(fireCx, fireCy, clearR, fireCx, fireCy, Math.max(this.w, this.h) * 0.8);
      darkGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      darkGrad.addColorStop(0.5, `rgba(0, 0, 0, ${darkAlpha * 0.6})`);
      darkGrad.addColorStop(1, `rgba(0, 0, 0, ${darkAlpha})`);
      ctx.fillStyle = darkGrad;
      ctx.fillRect(0, 0, this.w, this.h);
    }

    // 草丛点缀
    if (!this._grassTufts) {
      this._grassTufts = [];
      for (let i = 0; i < 40; i++) {
        this._grassTufts.push({
          x: Utils.randFloat(0, this.w),
          y: Utils.randFloat(groundY + 10, this.h - 10),
          size: Utils.randInt(1, 3),
          shade: Utils.randFloat(0.8, 1.2)
        });
      }
    }
    this._grassTufts.forEach(g => {
      const gr = Math.floor(12 + br * 28 + warm * 12 - cool * 4);
      const gg = Math.floor(28 + br * 52 + warm * 6 - cool * 6);
      const gb = Math.floor(10 + br * 14 + cool * 12);
      ctx.fillStyle = `rgba(${Math.max(0,gr)}, ${Math.max(0,gg)}, ${Math.max(0,gb)}, ${0.5 + br * 0.3})`;
      ctx.fillRect(g.x, g.y, ps * g.size, ps);
      ctx.fillRect(g.x + ps, g.y - ps, ps, ps);
    });

    // 散落石子
    if (!this._stones) {
      this._stones = [];
      for (let i = 0; i < 12; i++) {
        this._stones.push({
          x: Utils.randFloat(this.w * 0.1, this.w * 0.9),
          y: Utils.randFloat(groundY + 20, this.h - 20),
          size: 1,
          shade: Utils.randInt(50, 80)
        });
      }
    }
    this._stones.forEach(s => {
      const sr = Math.floor(s.shade + br * 40 + warm * 10 - cool * 4);
      const sg = Math.floor(s.shade - 3 + br * 36 + warm * 6 - cool * 5);
      const sb = Math.floor(s.shade - 6 + br * 30 + cool * 10);
      ctx.fillStyle = `rgb(${Math.max(0,sr)},${Math.max(0,sg)},${Math.max(0,sb)})`;
      ctx.fillRect(s.x, s.y, s.size * ps, s.size * ps);
    });
  }
};
