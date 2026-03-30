/* ========== Main Entry ========== */
const Main = {
  canvas: null,
  ctx: null,
  lastTime: 0,
  pixelRatio: 1,

  init() {
    this._fixHeight();
    window.addEventListener('resize', () => this._fixHeight());
    this._startGame();
  },

  _fixHeight() {
    const h = window.innerHeight;
    const app = document.getElementById('app');
    if (app) app.style.height = h + 'px';
  },

  _startGame() {
    this.canvas = document.getElementById('scene-canvas');
    this.ctx = this.canvas.getContext('2d');

    this.resize();
    window.addEventListener('resize', () => this.resize());

    const w = this.canvas.width, h = this.canvas.height;
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
    const dpr = 1;
    this.pixelRatio = dpr;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
    this.ctx.imageSmoothingEnabled = false;
    if (Sky.w) {
      Sky.init(this.canvas.width, this.canvas.height);
      Fire.init(this.canvas.width, this.canvas.height);
      Characters.init(this.canvas.width, this.canvas.height);
    }
  },

  loop(timestamp) {
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    Sky.update(timestamp);
    Fire.update(dt, timestamp);
    Characters.update(dt, timestamp);
    Interactions.update(dt, timestamp, this.canvas.width, this.canvas.height);
    Chat.update(dt);
    Game.updateCooking(dt);

    AudioManager.updateFireCrackle(Fire.intensity);
    if (Utils.isNight() && !AudioManager._cricketInterval) AudioManager.startCrickets(0.1);
    else if (!Utils.isNight() && AudioManager._cricketInterval) AudioManager.stopCrickets();

    const prevMeteors = Sky.shootingStars.length;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    Sky.draw(ctx, timestamp, Fire.intensity);
    Interactions.draw(ctx, timestamp);
    const ambient = Sky.getAmbientLight();
    Characters.drawBehindFire(ctx, timestamp, Fire.intensity, Fire.cy, ambient);
    Fire.draw(ctx, timestamp);
    Characters.drawInFrontOfFire(ctx, timestamp, Fire.intensity, Fire.cy, ambient);
    Interactions.drawFireflies(ctx, timestamp);

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
