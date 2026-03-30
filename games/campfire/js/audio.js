/* ========== Web Audio Synthesized Sound Effects ========== */
const AudioManager = {
  ctx: null,
  masterGain: null,
  muted: false,
  initialized: false,

  // 环境音节点
  ambientNodes: {},

  init() {
    if (this.initialized) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.6;
    this.masterGain.connect(this.ctx.destination);
    this.initialized = true;
  },

  ensureContext() {
    if (!this.initialized) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },

  // ========== 篝火噼啪声 ==========
  _fireCrackleInterval: null,
  _fireCrackleGain: null,

  startFireCrackle(intensity = 0.5) {
    this.ensureContext();
    if (this._fireCrackleInterval) return;

    this._fireCrackleGain = this.ctx.createGain();
    this._fireCrackleGain.gain.value = intensity * 0.4;
    this._fireCrackleGain.connect(this.masterGain);

    // 持续的低频火焰轰鸣底噪
    const rumbleLen = this.ctx.sampleRate * 4;
    const rumbleBuf = this.ctx.createBuffer(1, rumbleLen, this.ctx.sampleRate);
    const rumbleData = rumbleBuf.getChannelData(0);
    for (let i = 0; i < rumbleLen; i++) rumbleData[i] = (Math.random() * 2 - 1);
    this._fireRumble = this.ctx.createBufferSource();
    this._fireRumble.buffer = rumbleBuf;
    this._fireRumble.loop = true;
    const rumbleFilter = this.ctx.createBiquadFilter();
    rumbleFilter.type = 'lowpass'; rumbleFilter.frequency.value = 250; rumbleFilter.Q.value = 0.8;
    const rumbleGain = this.ctx.createGain();
    rumbleGain.gain.value = intensity * 0.12;
    this._fireRumbleGain = rumbleGain;
    this._fireRumble.connect(rumbleFilter);
    rumbleFilter.connect(rumbleGain);
    rumbleGain.connect(this.masterGain);
    this._fireRumble.start();

    const crackle = () => {
      if (this.muted) return;
      const now = this.ctx.currentTime;

      // 随机噼啪声 - 白噪声脉冲
      const bufferSize = this.ctx.sampleRate * Utils.randFloat(0.02, 0.1);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
      }

      const source = this.ctx.createBufferSource();
      source.buffer = buffer;

      // 带通滤波器，让声音更像木头噼啪
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = Utils.randFloat(600, 4000);
      filter.Q.value = Utils.randFloat(1, 6);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(Utils.randFloat(0.15, 0.5) * intensity, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + Utils.randFloat(0.04, 0.18));

      source.connect(filter);
      filter.connect(gain);
      gain.connect(this._fireCrackleGain);
      source.start(now);
    };

    // 偶尔的大声木材爆裂（噼里啪啦连续声）
    const bigPop = () => {
      if (this.muted) return;
      const now = this.ctx.currentTime;
      const popCount = Utils.randInt(3, 6);
      for (let i = 0; i < popCount; i++) {
        const t = now + i * Utils.randFloat(0.03, 0.08);
        const bufLen = this.ctx.sampleRate * Utils.randFloat(0.03, 0.08);
        const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let j = 0; j < bufLen; j++) d[j] = (Math.random()*2-1) * Math.pow(1-j/bufLen, 2);
        const src = this.ctx.createBufferSource(); src.buffer = buf;
        const f2 = this.ctx.createBiquadFilter();
        f2.type = 'bandpass'; f2.frequency.value = Utils.randFloat(500, 2500); f2.Q.value = Utils.randFloat(2, 8);
        const g2 = this.ctx.createGain();
        g2.gain.setValueAtTime(Utils.randFloat(0.3, 0.6) * intensity, t);
        g2.gain.exponentialRampToValueAtTime(0.001, t + Utils.randFloat(0.06, 0.15));
        src.connect(f2); f2.connect(g2); g2.connect(this._fireCrackleGain);
        src.start(t);
      }
    };

    // 随机间隔的噼啪声 - 更频繁
    const scheduleNext = () => {
      crackle();
      // 10%概率触发大声爆裂
      if (Math.random() < 0.1) bigPop();
      const nextDelay = Utils.randFloat(60, 400) / Math.max(intensity, 0.1);
      this._fireCrackleInterval = setTimeout(scheduleNext, nextDelay);
    };
    scheduleNext();
  },

  updateFireCrackle(intensity) {
    if (this._fireCrackleGain) {
      this._fireCrackleGain.gain.value = Math.max(0, intensity * 0.4);
    }
    if (this._fireRumbleGain) {
      this._fireRumbleGain.gain.value = Math.max(0, intensity * 0.12);
    }
  },

  stopFireCrackle() {
    if (this._fireCrackleInterval) {
      clearTimeout(this._fireCrackleInterval);
      this._fireCrackleInterval = null;
    }
    if (this._fireCrackleGain) this._fireCrackleGain.gain.value = 0;
    if (this._fireRumble) { try { this._fireRumble.stop(); } catch(e){} this._fireRumble = null; }
    if (this._fireRumbleGain) this._fireRumbleGain.gain.value = 0;
  },

  // ========== 风声（持续噪声 + 低通滤波） ==========
  _windSource: null,
  _windGain: null,

  startWind(volume = 0.05) {
    this.ensureContext();
    if (this._windSource) return;

    const bufferSize = this.ctx.sampleRate * 4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    this._windSource = this.ctx.createBufferSource();
    this._windSource.buffer = buffer;
    this._windSource.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 300;
    filter.Q.value = 0.3;

    // LFO 让风声有起伏
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = 0.1;
    lfoGain.gain.value = 100;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();

    this._windGain = this.ctx.createGain();
    this._windGain.gain.value = volume;

    this._windSource.connect(filter);
    filter.connect(this._windGain);
    this._windGain.connect(this.masterGain);
    this._windSource.start();
  },

  stopWind() {
    if (this._windSource) {
      this._windSource.stop();
      this._windSource = null;
    }
  },

  // ========== 虫鸣（夜间环境音） ==========
  _cricketInterval: null,
  _cricketGain: null,

  startCrickets(volume = 0.12) {
    this.ensureContext();
    if (this._cricketInterval) return;

    this._cricketGain = this.ctx.createGain();
    this._cricketGain.gain.value = volume;
    this._cricketGain.connect(this.masterGain);

    const chirp = () => {
      if (this.muted) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = Utils.randFloat(3800, 5200);

      const gain = this.ctx.createGain();
      const dur = Utils.randFloat(0.06, 0.1);

      // 快速 on/off 模式模拟蟋蟀
      const repeats = Utils.randInt(3, 8);
      for (let i = 0; i < repeats; i++) {
        const t = now + i * dur * 2;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.08, t + dur * 0.2);
        gain.gain.linearRampToValueAtTime(0, t + dur);
      }

      osc.connect(gain);
      gain.connect(this._cricketGain);
      osc.start(now);
      osc.stop(now + repeats * dur * 2 + 0.1);
    };

    const scheduleNext = () => {
      chirp();
      this._cricketInterval = setTimeout(scheduleNext, Utils.randFloat(800, 3000));
    };
    scheduleNext();
  },

  stopCrickets() {
    if (this._cricketInterval) {
      clearTimeout(this._cricketInterval);
      this._cricketInterval = null;
    }
  },

  // ========== 添柴声 ==========
  playAddWood() {
    this.ensureContext();
    const now = this.ctx.currentTime;

    // 低沉的撞击声
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.2);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    // 木头碰撞的噪声
    const bufLen = this.ctx.sampleRate * 0.1;
    const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) d[i] = (Math.random()*2-1) * Math.pow(1-i/bufLen, 4);
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.3, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    const noiseFilt = this.ctx.createBiquadFilter();
    noiseFilt.type = 'bandpass';
    noiseFilt.frequency.value = 1200;

    osc.connect(gain);
    gain.connect(this.masterGain);
    noise.connect(noiseFilt);
    noiseFilt.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.4);
    noise.start(now);
  },

  // ========== 纸条燃烧声 ==========
  playBurnNote() {
    this.ensureContext();
    const now = this.ctx.currentTime;

    const bufLen = this.ctx.sampleRate * 1.5;
    const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      const env = Math.pow(1 - i/bufLen, 1.5);
      d[i] = (Math.random()*2-1) * env * 0.2;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1500;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.linearRampToValueAtTime(0.5, now + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    source.start(now);
  },

  // ========== 发现宝藏声 ==========
  playTreasure() {
    this.ensureContext();
    const now = this.ctx.currentTime;

    // 上行音阶 闪闪发光感
    const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const gain = this.ctx.createGain();
      const t = now + i * 0.12;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.2, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.5);
    });
  },

  // ========== 烤食物滋滋声 ==========
  _cookingInterval: null,
  _cookingGain: null,
  _cookHiss: null,

  startCooking() {
    this.ensureContext();
    if (this._cookingInterval) return;

    this._cookingGain = this.ctx.createGain();
    this._cookingGain.gain.value = 0.2;
    this._cookingGain.connect(this.masterGain);

    // 持续底层嘶嘶声
    const hissLen = this.ctx.sampleRate * 3;
    const hissBuf = this.ctx.createBuffer(1, hissLen, this.ctx.sampleRate);
    const hd = hissBuf.getChannelData(0);
    for (let i = 0; i < hissLen; i++) hd[i] = (Math.random() * 2 - 1);
    this._cookHiss = this.ctx.createBufferSource();
    this._cookHiss.buffer = hissBuf;
    this._cookHiss.loop = true;
    const hf = this.ctx.createBiquadFilter();
    hf.type = 'bandpass'; hf.frequency.value = 3000; hf.Q.value = 1.5;
    const hg = this.ctx.createGain(); hg.gain.value = 0.06;
    this._cookHiss.connect(hf); hf.connect(hg); hg.connect(this._cookingGain);
    this._cookHiss.start();

    const sizzle = () => {
      if (this.muted) return;
      const now = this.ctx.currentTime;
      const bufLen = this.ctx.sampleRate * Utils.randFloat(0.03, 0.12);
      const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < bufLen; i++) {
        d[i] = (Math.random()*2-1) * Math.pow(1-i/bufLen, 1.5);
      }
      const source = this.ctx.createBufferSource();
      source.buffer = buf;
      const filt = this.ctx.createBiquadFilter();
      filt.type = 'bandpass';
      filt.frequency.value = Utils.randFloat(1500, 6000);
      filt.Q.value = Utils.randFloat(0.5, 2);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(Utils.randFloat(0.1, 0.3), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + Utils.randFloat(0.05, 0.12));
      source.connect(filt); filt.connect(gain); gain.connect(this._cookingGain);
      source.start(now);
    };

    const scheduleNext = () => {
      sizzle();
      this._cookingInterval = setTimeout(scheduleNext, Utils.randFloat(40, 180));
    };
    scheduleNext();
  },

  stopCooking() {
    if (this._cookingInterval) {
      clearTimeout(this._cookingInterval);
      this._cookingInterval = null;
    }
    if (this._cookHiss) { try { this._cookHiss.stop(); } catch(e){} this._cookHiss = null; }
  },

  // ========== 偶尔的蝉鸣 / 小动物叫声 ==========
  _ambientInterval: null,

  startAmbientSounds() {
    if (this._ambientInterval) return;
    const playOne = () => {
      if (this.muted || !this.initialized) return;
      const now = this.ctx.currentTime;
      const type = Utils.randInt(0, 2);
      if (type === 0) {
        // 蝉鸣 — 高频持续震颤
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = Utils.randFloat(4000, 6000);
        const lfo = this.ctx.createOscillator();
        lfo.frequency.value = Utils.randFloat(40, 80);
        const lfoG = this.ctx.createGain();
        lfoG.gain.value = Utils.randFloat(200, 500);
        lfo.connect(lfoG); lfoG.connect(osc.frequency); lfo.start(now);
        const dur = Utils.randFloat(1.5, 4);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.04, now + 0.3);
        g.gain.linearRampToValueAtTime(0.04, now + dur - 0.5);
        g.gain.linearRampToValueAtTime(0, now + dur);
        osc.connect(g); g.connect(this.masterGain);
        osc.start(now); osc.stop(now + dur + 0.1); lfo.stop(now + dur + 0.1);
      } else if (type === 1) {
        // 小鸟叫 — 短促上扬音
        const count = Utils.randInt(2, 4);
        for (let i = 0; i < count; i++) {
          const osc = this.ctx.createOscillator(); osc.type = 'sine';
          const t = now + i * Utils.randFloat(0.15, 0.3);
          const baseF = Utils.randFloat(2000, 3500);
          osc.frequency.setValueAtTime(baseF, t);
          osc.frequency.linearRampToValueAtTime(baseF * 1.3, t + 0.08);
          const g = this.ctx.createGain();
          g.gain.setValueAtTime(0, t);
          g.gain.linearRampToValueAtTime(0.03, t + 0.02);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
          osc.connect(g); g.connect(this.masterGain);
          osc.start(t); osc.stop(t + 0.15);
        }
      } else {
        // 远处的蛙叫 — 低频脉冲
        const osc = this.ctx.createOscillator(); osc.type = 'triangle';
        osc.frequency.value = Utils.randFloat(180, 350);
        const dur = Utils.randFloat(0.1, 0.2);
        const reps = Utils.randInt(2, 5);
        const g = this.ctx.createGain();
        for (let i = 0; i < reps; i++) {
          const t = now + i * dur * 3;
          g.gain.setValueAtTime(0, t);
          g.gain.linearRampToValueAtTime(0.025, t + dur * 0.3);
          g.gain.linearRampToValueAtTime(0, t + dur);
        }
        osc.connect(g); g.connect(this.masterGain);
        osc.start(now); osc.stop(now + reps * dur * 3 + 0.2);
      }
    };
    const scheduleNext = () => {
      playOne();
      this._ambientInterval = setTimeout(scheduleNext, Utils.randFloat(8000, 25000));
    };
    this._ambientInterval = setTimeout(scheduleNext, Utils.randFloat(5000, 10000));
  },

  stopAmbientSounds() {
    if (this._ambientInterval) { clearTimeout(this._ambientInterval); this._ambientInterval = null; }
  }
};
