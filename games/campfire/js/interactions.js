/* ========== Interactions System ========== */
const Interactions = {
  animals: [],
  animalSpawnTimer: 0,

  animalTypes: [
    { name: '小狐狸', emoji: '🦊',
      pixels: [[0,0,1,0,0,0,1,0,0],[0,1,1,0,0,0,1,1,0],[0,1,1,1,1,1,1,1,0],[1,2,1,2,1,2,1,2,1],[1,1,1,1,1,1,1,1,1],[0,1,1,1,1,1,1,1,0],[0,0,1,0,0,0,1,0,0]],
      colors: { 1: '#d47030', 2: '#f0f0e8' }, speed: 0.3, flying: false },
    { name: '小兔子', emoji: '🐰',
      pixels: [[0,0,1,0,1,0,0],[0,0,1,0,1,0,0],[0,1,1,1,1,1,0],[1,2,1,1,1,2,1],[1,1,1,1,1,1,1],[0,1,1,1,1,1,0],[0,0,1,0,1,0,0]],
      colors: { 1: '#c0b8a8', 2: '#2a2a2a' }, speed: 0.5, flying: false },
    { name: '猫头鹰', emoji: '🦉',
      pixels: [[0,1,1,1,1,1,0],[1,2,1,1,1,2,1],[1,2,3,1,3,2,1],[0,1,1,3,1,1,0],[0,0,1,1,1,0,0]],
      colors: { 1: '#6a5a40', 2: '#f0d868', 3: '#1a1a1a' }, speed: 0, flying: false },
    { name: '小麻雀', emoji: '🐦',
      pixels: [[0,0,1,1,0,0],[0,1,1,1,1,0],[1,2,1,1,2,1],[0,1,1,1,1,0],[0,0,1,0,1,0]],
      colors: { 1: '#8a6a40', 2: '#1a1a1a' }, speed: 0.6, flying: true },
    { name: '青鸟', emoji: '🕊️',
      pixels: [[0,0,0,1,0,0,0,0],[0,0,1,1,1,0,0,0],[1,1,1,1,1,1,1,0],[0,0,1,1,1,0,0,1],[0,0,0,1,0,0,0,0]],
      colors: { 1: '#5a9ac0' }, speed: 0.5, flying: true },
    { name: '小刺猬', emoji: '🦔',
      pixels: [[0,0,1,1,1,0,0],[0,1,1,1,1,1,0],[1,1,1,1,1,1,1],[1,2,1,1,1,2,1],[0,1,1,1,1,1,0],[0,0,1,0,1,0,0]],
      colors: { 1: '#7a6a50', 2: '#1a1a1a' }, speed: 0.2, flying: false },
    { name: '萤火虫', emoji: '✨',
      pixels: [[0,1,0],[1,2,1],[0,1,0]],
      colors: { 1: '#3a5a30', 2: '#ccff66' }, speed: 0.3, flying: true },
    { name: '蝴蝶', emoji: '🦋',
      pixels: [[1,0,0,0,1],[1,1,0,1,1],[0,1,2,1,0],[1,1,0,1,1],[1,0,0,0,1]],
      colors: { 1: '#c080d0', 2: '#4a3a50' }, speed: 0.4, flying: true },
  ],

  // 小动物掉落物品池
  animalDrops: [
    { type: 'food', name: '野蘑菇', emoji: '🍄', desc: '小狐狸叼来了一颗野蘑菇！可以拿来烤。' },
    { type: 'food', name: '松果', emoji: '🌰', desc: '兔子蹦跶着丢下了一颗松果。' },
    { type: 'story', name: '森林传说', emoji: '📖', desc: '据说在很久以前，这片森林里住着一只会说话的鹿。每到满月之夜，它会来到篝火旁，给旅人讲一个故事。' },
    { type: 'story', name: '萤火虫之歌', emoji: '✨', desc: '猫头鹰歪头看了你一眼，仿佛在说：夏天的时候，这里的萤火虫会排成星座的形状。' },
    { type: 'item', name: '发光的石子', emoji: '💎', desc: '小动物留下了一颗微微发光的石子。据说把它埋进灰烬，下一个人会做一个好梦。' },
    { type: 'item', name: '羽毛', emoji: '🪶', desc: '一根漂亮的羽毛飘落在你面前。来自某只夜间飞过的鸟。' },
    { type: 'food', name: '野莓', emoji: '🫐', desc: '灌木丛里滚出几颗野莓，是小兔子碰掉的。' },
    { type: 'item', name: '旧铃铛', emoji: '🔔', desc: '猫头鹰脚上系着一个很小的铃铛，它把铃铛留给了你。轻轻摇，声音很好听。' },
    { type: 'story', name: '远方的信', emoji: '📮', desc: '麻雀腿上绑着一封小小的信，上面写着：别担心，一切都会好的。' },
    { type: 'item', name: '蓝色花瓣', emoji: '🌸', desc: '青鸟衔来了一片蓝色的花瓣，放在你手心。它来自很远很远的山谷。' },
    { type: 'food', name: '小坚果', emoji: '🥜', desc: '刺猬背上掉落了几颗小坚果，可以放在火上烤一烤。' },
    { type: 'item', name: '微光种子', emoji: '🌱', desc: '萤火虫留下了一颗会发光的种子。传说种下它，会长出一棵萤火之树。' },
    { type: 'wood', name: '柴火', emoji: '🪵', desc: '小动物从林子里叼来了一根干树枝。' },
    { type: 'wood', name: '柴火', emoji: '🪵', desc: '一根被风吹来的干柴，正好可以添到篝火里。' },
  ],

  burnNoteParticles: [],
  // 夜间环境萤火虫（不可点击，纯装饰）
  ambientFireflies: [],

  init() {
    this.animals = [];
    this.animalSpawnTimer = Utils.randFloat(20, 60);
  },

  // 检查点击是否命中某个小动物
  checkAnimalClick(clickX, clickY) {
    for (let i = 0; i < this.animals.length; i++) {
      const a = this.animals[i];
      if (a.phase !== 'idle' || a.claimed) continue;
      const ps = 3;
      const aw = a.type.pixels[0].length * ps;
      const ah = a.type.pixels.length * ps;
      if (clickX >= a.x - 10 && clickX <= a.x + aw + 10 &&
          clickY >= a.y - 10 && clickY <= a.y + ah + 10) {
        // 被点击！
        a.claimed = true;
        const drop = Utils.pick(this.animalDrops);
        a.phase = 'leave';
        a.dir = a.x < 200 ? -1 : 1;
        return drop;
      }
    }
    return null;
  },

  update(dt, time, canvasWidth, canvasHeight) {
    const fireCx = canvasWidth / 2;

    this.animalSpawnTimer -= dt;
    if (this.animalSpawnTimer <= 0 && this.animals.length < 2) {
      this._spawnAnimal(canvasWidth, canvasHeight);
      this.animalSpawnTimer = Utils.randFloat(40, 100);
    }

    this.animals = this.animals.filter(a => {
      a.timer -= dt;
      // 飞行动物的上下浮动
      if (a.flying) {
        a.flyPhase += dt * 2.5;
        a.y = a.baseY + Math.sin(a.flyPhase) * 8;
      }
      if (a.phase === 'approach') {
        a.x += a.speed * a.dir;
        if (a.flying) a.baseY += (a.flying && a.baseY < canvasHeight * 0.15 ? 0.1 : 0);
        if (Math.abs(a.x - a.targetX) < 5) {
          a.phase = 'idle';
          a.timer = Utils.randFloat(12, 30);
        }
      } else if (a.phase === 'idle') {
        if (a.timer <= 0) {
          a.phase = 'leave';
          a.dir = a.x < fireCx ? -1 : 1;
        }
      } else if (a.phase === 'leave') {
        a.x += a.speed * a.dir * 1.5;
        if (a.flying) a.baseY -= 0.3;
        if (a.x < -50 || a.x > canvasWidth + 50) return false;
      }
      return true;
    });

    this.burnNoteParticles = this.burnNoteParticles.filter(p => {
      p.life -= dt * 0.5;
      p.x += p.vx + Math.sin(time * 0.005 + p.x) * 0.5;
      p.y += p.vy;
      p.vy -= 0.02;
      p.size *= 0.99;
      return p.life > 0;
    });

    // 夜间环境萤火虫
    if (Utils.isNight()) {
      // 自动补充萤火虫（最多4只）
      while (this.ambientFireflies.length < 4) {
        this.ambientFireflies.push({
          x: Utils.randFloat(20, canvasWidth - 20),
          y: Utils.randFloat(canvasHeight * 0.15, canvasHeight * 0.75),
          vx: Utils.randFloat(-0.15, 0.15),
          vy: Utils.randFloat(-0.1, 0.1),
          phase: Utils.randFloat(0, Math.PI * 2),
          speed: Utils.randFloat(0.8, 2.0),
          life: Utils.randFloat(15, 40),
        });
      }
      this.ambientFireflies = this.ambientFireflies.filter(f => {
        f.life -= dt;
        f.phase += dt * f.speed;
        f.x += f.vx + Math.sin(time * 0.0005 + f.phase) * 0.3;
        f.y += f.vy + Math.cos(time * 0.0007 + f.phase * 1.3) * 0.2;
        // 柔和随机变向
        if (Math.random() < 0.005) { f.vx = Utils.randFloat(-0.15, 0.15); f.vy = Utils.randFloat(-0.1, 0.1); }
        // 边界约束
        if (f.x < 10) f.vx = Math.abs(f.vx); if (f.x > canvasWidth - 10) f.vx = -Math.abs(f.vx);
        if (f.y < canvasHeight * 0.1) f.vy = Math.abs(f.vy); if (f.y > canvasHeight * 0.8) f.vy = -Math.abs(f.vy);
        return f.life > 0;
      });
    } else {
      // 白天清除
      this.ambientFireflies = [];
    }
  },

  _spawnAnimal(canvasWidth, canvasHeight) {
    const type = Utils.pick(this.animalTypes);
    const fromLeft = Math.random() > 0.5;
    const groundY = canvasHeight * 0.18;
    const isFlying = type.flying;
    const animal = {
      type,
      x: fromLeft ? -30 : canvasWidth + 30,
      y: isFlying
        ? Utils.randFloat(canvasHeight * 0.05, canvasHeight * 0.25)
        : groundY + Utils.randFloat(canvasHeight * 0.3, canvasHeight * 0.6),
      baseY: 0,
      targetX: canvasWidth * Utils.randFloat(0.1, 0.9),
      speed: (type.speed || 0.3) * 0.8,
      dir: fromLeft ? 1 : -1,
      phase: 'approach',
      timer: 60,
      claimed: false,
      flying: isFlying,
      flyPhase: Utils.randFloat(0, Math.PI * 2),
    };
    animal.baseY = animal.y;
    this.animals.push(animal);
    Fire.stats.animalVisits++;
    setTimeout(() => {
      Utils.notify(`${type.emoji} 一只${type.name}来到了篝火旁，点击它试试！`);
      Chat.addSystemMessage(`一只${type.name}悄悄来到了篝火旁... 点击它看看？`);
    }, 2000);
  },

  draw(ctx, time) {
    const ps = 3;
    this.animals.forEach(a => {
      const wobble = Math.sin(time * 0.003 + a.x) * 1;
      const drawX = a.x, drawY = a.y + wobble;
      const pixels = a.type.pixels, colors = a.type.colors;
      ctx.save();
      if (a.dir < 0) {
        ctx.scale(-1, 1);
        ctx.translate(-drawX * 2 - pixels[0].length * ps, 0);
      }
      pixels.forEach((row, r) => {
        row.forEach((v, c) => {
          if (v === 0) return;
          ctx.fillStyle = colors[v] || '#ff00ff';
          ctx.fillRect(drawX + c * ps, drawY + r * ps, ps, ps);
        });
      });
      ctx.restore();

      // 未领取时显示闪烁提示
      if (a.phase === 'idle' && !a.claimed) {
        const pulse = 0.5 + 0.5 * Math.sin(time * 0.004);
        ctx.font = '11px sans-serif';
        ctx.fillStyle = `rgba(255, 220, 100, ${pulse * 0.7})`;
        ctx.textAlign = 'center';
        ctx.fillText('点击', drawX + pixels[0].length * ps / 2, drawY - 8);
        ctx.textAlign = 'left';
      } else if (a.phase === 'idle') {
        ctx.font = '11px sans-serif';
        ctx.fillStyle = 'rgba(200,200,200,0.4)';
        ctx.textAlign = 'center';
        ctx.fillText(a.type.name, drawX + pixels[0].length * ps / 2, drawY - 6);
        ctx.textAlign = 'left';
      }
    });

    this.burnNoteParticles.forEach(p => {
      if (p.type === 'paper') {
        ctx.fillStyle = `rgba(255, 240, 200, ${p.life * 0.6})`;
        ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);
      } else {
        ctx.fillStyle = `rgba(${p.r}, ${p.g}, ${p.b}, ${p.life * 0.8})`;
        ctx.fillRect(Math.floor(p.x), Math.floor(p.y), 2, 2);
      }
    });
  },

  triggerBurnNote(cx, cy) {
    for (let i = 0; i < 12; i++) {
      this.burnNoteParticles.push({ type: 'paper', x: cx+Utils.randFloat(-8,8), y: cy+Utils.randFloat(-5,5), vx: Utils.randFloat(-1,1), vy: Utils.randFloat(-2,-0.5), life: 1, size: Utils.randFloat(2,5) });
    }
    for (let i = 0; i < 20; i++) {
      this.burnNoteParticles.push({ type: 'spark', x: cx+Utils.randFloat(-5,5), y: cy, vx: Utils.randFloat(-2,2), vy: Utils.randFloat(-3,-1), life: 1, r: Utils.randInt(150,255), g: Utils.randInt(100,200), b: Utils.randInt(50,150) });
    }
  },

  drawFireflies(ctx, time) {
    this.ambientFireflies.forEach(f => {
      const glow = 0.3 + 0.7 * Math.max(0, Math.sin(f.phase));
      const alpha = glow * Math.min(1, f.life * 0.3);
      // 固定大小光晕，只变亮度
      const r = 4;
      const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r);
      grad.addColorStop(0, `rgba(200, 255, 100, ${alpha * 0.7})`);
      grad.addColorStop(0.5, `rgba(150, 230, 60, ${alpha * 0.2})`);
      grad.addColorStop(1, 'rgba(100, 200, 40, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(f.x - r, f.y - r, r * 2, r * 2);
      // 固定大小中心亮点
      ctx.fillStyle = `rgba(230, 255, 150, ${alpha * 0.9})`;
      ctx.fillRect(Math.floor(f.x), Math.floor(f.y), 1.5, 1.5);
    });
  }
};
