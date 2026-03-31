/* ========== Main Entry ========== */
const Main = {
  canvas: null,
  ctx: null,
  lastTime: 0,
  pixelRatio: 1,
  started: false,

  init() {
    this._bindLobby();
  },

  _bindLobby() {
    const enterBtn = document.getElementById('btn-enter');
    this._fixHeight();
    window.addEventListener('resize', () => this._fixHeight());

    this._updateLobbyStatus();
    setInterval(() => this._updateLobbyStatus(), 3000);

    // 大厅预览小 canvas
    const lobbyCanvas = document.getElementById('lobby-canvas');
    if (lobbyCanvas) {
      lobbyCanvas.width = 280;
      lobbyCanvas.height = 160;
      const lctx = lobbyCanvas.getContext('2d');
      lctx.imageSmoothingEnabled = false;
      this._drawLobbyPreview(lctx, 280, 160);
    }

    enterBtn.addEventListener('click', () => {
      document.getElementById('lobby').classList.add('hidden');
      document.getElementById('app').classList.remove('hidden');
      // app 可见后重新设高度
      this._fixHeight();
      if (!this.started) {
        this.started = true;
        this._startGame();
      }
    });
  },

  _fixHeight() {
    // 首次记住完整视口高度，键盘弹起时不更新（避免页面被压缩）
    const h = window.innerHeight;
    if (!this._initialHeight) {
      this._initialHeight = h;
    }
    // 如果高度缩小超过 25%（键盘弹起），不更新布局
    if (h < this._initialHeight * 0.75) return;
    this._initialHeight = h;
    const lobby = document.getElementById('lobby');
    const app = document.getElementById('app');
    if (lobby) lobby.style.height = h + 'px';
    if (app) app.style.height = h + 'px';
  },

  _updateLobbyStatus() {
    const now = new Date();
    const h = now.getHours().toString().padStart(2,'0');
    const m = now.getMinutes().toString().padStart(2,'0');
    document.getElementById('lobby-time').textContent = `${h}:${m}`;
    // 模拟在场人数
    const people = Utils ? Utils.randInt(3, 8) : 5;
    document.getElementById('lobby-people').textContent = people;
    document.getElementById('lobby-fire-state').textContent =
      Fire && Fire.state === 'burning' ? '燃烧中' :
      Fire && Fire.state === 'dying' ? '即将熄灭' : '灰烬';
  },

  _drawLobbyPreview(ctx, w, h) {
    // 简单的像素风预览
    // 天空
    const isNight = Utils ? Utils.isNight() : true;
    ctx.fillStyle = isNight ? '#0e1230' : '#5a90c8';
    ctx.fillRect(0, 0, w, h * 0.25);
    // 地面
    ctx.fillStyle = isNight ? '#141a10' : '#324a1e';
    ctx.fillRect(0, h * 0.25, w, h * 0.75);
    // 篝火辉光
    const glow = ctx.createRadialGradient(w/2, h*0.5, 0, w/2, h*0.5, 60);
    glow.addColorStop(0, 'rgba(255, 140, 40, 0.15)');
    glow.addColorStop(1, 'rgba(255, 100, 20, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    // 小火焰
    ctx.fillStyle = '#ff9930';
    ctx.fillRect(w/2 - 4, h*0.45, 3, 6);
    ctx.fillRect(w/2, h*0.43, 3, 8);
    ctx.fillRect(w/2 + 3, h*0.46, 3, 5);
    // 柴火
    ctx.fillStyle = '#3a2510';
    ctx.fillRect(w/2 - 10, h*0.52, 20, 4);
    // 小人轮廓
    const angles = [0.3, 1.2, 2.5, 3.8, 5.0];
    angles.forEach(a => {
      const px = w/2 + Math.cos(a) * 45;
      const py = h*0.5 + Math.sin(a) * 25;
      ctx.fillStyle = '#555';
      ctx.fillRect(px - 2, py - 4, 4, 6);
      ctx.fillStyle = '#daa878';
      ctx.fillRect(px - 1, py - 6, 3, 3);
    });
    // 星星
    if (isNight) {
      for (let i = 0; i < 15; i++) {
        ctx.fillStyle = 'rgba(255,255,240,0.6)';
        ctx.fillRect(Math.random() * w, Math.random() * h * 0.2, 1, 1);
      }
    }
  },

  _startGame() {
    this.canvas = document.getElementById('scene-canvas');
    this.ctx = this.canvas.getContext('2d');

    this.resize();
    window.addEventListener('resize', () => this.resize());

    const container = document.getElementById('scene-container');
    const rect = container.getBoundingClientRect();
    const w = rect.width, h = rect.height;
    Sky.init(w, h);
    Fire.init(w, h);
    Characters.init(w, h);
    Interactions.init();
    Backpack.init();
    Chat.init();
    Game.init();

    // 更新在场人数
    document.getElementById('count-num').textContent = Characters.list.length;

    const initAudio = () => {
      AudioManager.init();
      if (Utils.isNight()) AudioManager.startCrickets(0.08);
      AudioManager.startAmbientSounds();
      document.removeEventListener('click', initAudio);
      document.removeEventListener('touchstart', initAudio);
    };
    document.addEventListener('click', initAudio);
    document.addEventListener('touchstart', initAudio);

    this._updateFireStatus();
    this.lastTime = performance.now();
    requestAnimationFrame(t => this.loop(t));
  },

  resize() {
    const container = document.getElementById('scene-container');
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.pixelRatio = dpr;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
    // 重置后再缩放，防止 resize 时 scale 累积
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // 逻辑尺寸 = CSS 尺寸
    const w = rect.width, h = rect.height;
    if (Sky.w) {
      Sky.init(w, h);
      Fire.init(w, h);
      Characters.init(w, h);
    }
  },

  loop(timestamp) {
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    Sky.update(timestamp);
    Fire.update(dt, timestamp);
    Characters.update(dt, timestamp);
    Interactions.update(dt, timestamp, Sky.w, Sky.h);
    Chat.update(dt);
    Game.updateCooking(dt);

    AudioManager.updateFireCrackle(Fire.intensity);
    if (Utils.isNight() && !AudioManager._cricketInterval) AudioManager.startCrickets(0.1);
    else if (!Utils.isNight() && AudioManager._cricketInterval) AudioManager.stopCrickets();

    const prevMeteors = Sky.shootingStars.length;
    const ctx = this.ctx;
    const dpr = this.pixelRatio;
    // 每帧重置变换，确保 DPR 正确
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, Sky.w, Sky.h);

    Sky.draw(ctx, timestamp, Fire.intensity);
    Interactions.draw(ctx, timestamp);
    const ambient = Sky.getAmbientLight();
    // 正确的遮挡：篝火后面的角色 → 篝火 → 篝火前面的角色
    Characters.drawBehindFire(ctx, timestamp, Fire.intensity, Fire.cy, ambient);
    Fire.draw(ctx, timestamp);
    Characters.drawInFrontOfFire(ctx, timestamp, Fire.intensity, Fire.cy, ambient);
    Interactions.drawFireflies(ctx, timestamp);
    Characters.updateLabels();

    this._updateFireStatus();
    if (Sky.shootingStars.length > prevMeteors) {
      Fire.stats.meteorsSeen++;
      Utils.notify('🌠 一颗流星划过夜空！');
    }

    requestAnimationFrame(t => this.loop(t));
  },

  _updateFireStatus() {
    document.getElementById('fire-timer').textContent = Fire.getTimeString();
  }
};

window.addEventListener('DOMContentLoaded', () => {
  Main.init();
});
