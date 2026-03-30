/**
 * entities.js - 游戏实体（主人、宠物、NPC）
 */

class Owner {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.speed = 1.5;
    this.state = 'idle'; // idle, walk, sit, walkToSit
    this.facing = 1; // 1=右, -1=左
    this.animFrame = 0;
    this.animTimer = 0;
    // 记录互动前的位置，用于恢复
    this._preSitX = x;
    this._preSitY = y;
  }

  moveTo(tx, ty) {
    if (!GameMap.isWalkable(tx, ty)) return;
    this.targetX = tx;
    this.targetY = ty;
    this.state = 'walk';
  }

  /**
   * 走到目标位置然后坐下（平滑过渡，不瞬移）
   */
  walkToAndSit(tx, ty) {
    this._preSitX = this.x;
    this._preSitY = this.y;
    this.targetX = tx;
    this.targetY = ty;
    this.state = 'walkToSit';
  }

  /**
   * 结束坐下，走回互动前的位置
   */
  standUpAndReturn() {
    this.targetX = this._preSitX;
    this.targetY = this._preSitY;
    this.state = 'walk';
  }

  update(dt) {
    if (this.state === 'sit') return;

    if (this.state === 'walkToSit') {
      // 走向长椅
      const dx = this.targetX - this.x;
      const dy = this.targetY - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 3) {
        const vx = (dx / dist) * this.speed;
        const vy = (dy / dist) * this.speed;
        const nx = this.x + vx;
        const ny = this.y + vy;
        if (GameMap.isWalkable(nx, ny)) {
          this.x = nx;
          this.y = ny;
        } else {
          // 走不过去就在原地坐下
          this.state = 'sit';
          return;
        }
        if (Math.abs(vx) > 0.1) this.facing = vx > 0 ? 1 : -1;
        this.animTimer += dt;
        if (this.animTimer > 300) {
          this.animTimer = 0;
          this.animFrame = (this.animFrame + 1) % 2;
        }
      } else {
        // 到了，坐下
        this.state = 'sit';
        this.animFrame = 0;
      }
      return;
    }

    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 3) {
      const vx = (dx / dist) * this.speed;
      const vy = (dy / dist) * this.speed;
      const nx = this.x + vx;
      const ny = this.y + vy;

      if (GameMap.isWalkable(nx, ny)) {
        this.x = nx;
        this.y = ny;
      }

      if (Math.abs(vx) > 0.1) this.facing = vx > 0 ? 1 : -1;
      this.state = 'walk';

      // 动画帧
      this.animTimer += dt;
      if (this.animTimer > 300) {
        this.animTimer = 0;
        this.animFrame = (this.animFrame + 1) % 2;
      }
    } else {
      this.state = 'idle';
      this.animFrame = 0;
    }
  }

  render(ctx, camera) {
    const sx = this.x - camera.x;
    const sy = this.y - camera.y;

    const renderState = (this.state === 'walkToSit') ? 'walk' : this.state;
    const sprites = OWNER_SPRITES[renderState] || OWNER_SPRITES.idle;
    const frame = sprites[this.animFrame % sprites.length];

    if (this.facing === -1) {
      PixelArt.drawFlipped(ctx, frame, sx - 12, sy - 34);
    } else {
      PixelArt.draw(ctx, frame, sx - 12, sy - 34);
    }
  }
}

class Pet {
  constructor(x, y, type, name) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.name = name || PET_SPRITES[type].name;
    this.sprites = PET_SPRITES[type];

    // 状态
    this.state = 'idle'; // idle, walk, sniff, dig, sit, play, follow, surprise
    this.facing = 1;
    this.animFrame = 0;
    this.animTimer = 0;

    // AI 参数
    this.aiTarget = null;
    this.aiTimer = 0;
    this.aiNextAction = 0;
    this.sniffTimer = 0;
    this.digTimer = 0;
    this.playTimer = 0;
    this.surpriseTimer = 0;
    this._surpriseType = null;

    // 主人/牵绳
    this.owner = null;
    this.leashLength = 60;
    this.wanderRadius = 50;

    // 情绪
    this.happiness = 80;
    this.energy = 100;
    this.excitement = 0;

    // 互动状态
    this.playPartner = null;
    this.interacting = false;

    // 速度
    this.speed = 1.8;

    // 嗅探粒子
    this.particles = [];

    // 偏好记忆
    this.favoriteSpots = [];
  }

  update(dt) {
    this.animTimer += dt;

    // 更新粒子
    this._updateParticles(dt);

    switch (this.state) {
      case 'idle':
        this._idleBehavior(dt);
        break;
      case 'walk':
        this._walkBehavior(dt);
        break;
      case 'sniff':
        this._sniffBehavior(dt);
        break;
      case 'dig':
        this._digBehavior(dt);
        break;
      case 'sit':
        break;
      case 'play':
        this._playBehavior(dt);
        break;
      case 'follow':
        this._followOwner(dt);
        break;
      case 'surprise':
        this._surpriseBehavior(dt);
        break;
    }

    // 动画帧（玩耍时可用更快的速度）
    const animInterval = this._playAnimSpeed || 350;
    if (this.animTimer > animInterval) {
      this.animTimer = 0;
      this.animFrame = (this.animFrame + 1) % 2;
    }

    // 能量缓慢恢复
    this.energy = Math.min(100, this.energy + dt * 0.002);
  }

  _idleBehavior(dt) {
    this.aiTimer += dt;

    if (this.aiTimer > this.aiNextAction) {
      this.aiTimer = 0;
      this.aiNextAction = 1200 + Math.random() * 2500;

      if (this.owner) {
        const r = Math.random();

        // 低概率触发惊喜！（约8%概率，不在互动中时）
        if (r < 0.08 && !this.interacting && this === Game?.playerPet) {
          this._triggerSurprise();
          return;
        }

        // 检查附近是否有树桩可以嗅（扩大范围，狗鼻子灵）
        const stump = GameMap.getNearbyStump(this.x, this.y, 120);
        if (stump && r < 0.3) {
          this.aiTarget = { x: stump.x + 10, y: stump.y + 10 };
          this.state = 'walk';
          this._willSniffAfterWalk = true;
          return;
        }

        // 检查附近是否有可挖点
        const digSpot = GameMap.getNearbyDigSpot(this.x, this.y, 100);
        if (digSpot && r < 0.5) {
          this.aiTarget = { x: digSpot.x, y: digSpot.y };
          this.state = 'walk';
          this._willDigAfterWalk = true;
          return;
        }

        // 如果有偏好地点，较高概率走向那里（会拉着主人去）
        if (this.favoriteSpots.length > 0 && r < 0.35) {
          const fav = this.favoriteSpots[Math.floor(Math.random() * this.favoriteSpots.length)];
          const tx = fav.x + (Math.random() - 0.5) * 20;
          const ty = fav.y + (Math.random() - 0.5) * 20;
          if (GameMap.isWalkable(tx, ty)) {
            this.aiTarget = { x: tx, y: ty };
            this.state = 'walk';
            return;
          }
        }

        // 随机走走 —— 允许走到主人牵绳范围边缘
        if (r < 0.75) {
          const angle = Math.random() * Math.PI * 2;
          const dist = 25 + Math.random() * this.leashLength * 0.8;
          const tx = this.owner.x + Math.cos(angle) * dist;
          const ty = this.owner.y + Math.sin(angle) * dist;

          if (GameMap.isWalkable(tx, ty)) {
            this.aiTarget = { x: tx, y: ty };
            this.state = 'walk';
          }
        }
      }
    }
  }

  _walkBehavior(dt) {
    if (!this.aiTarget) {
      this.state = 'idle';
      return;
    }

    // 如果在追踪另一只宠物，持续更新目标位置
    if (this._seekTarget) {
      this.aiTarget.x = this._seekTarget.x;
      this.aiTarget.y = this._seekTarget.y;
    }

    const dx = this.aiTarget.x - this.x;
    const dy = this.aiTarget.y - this.y;
    const dist = Math.hypot(dx, dy);

    // 追踪时跑得更快
    const spd = this._seekTarget ? this.speed * 1.8 : this.speed;

    if (dist > 3) {
      const vx = (dx / dist) * spd;
      const vy = (dy / dist) * spd;
      const nx = this.x + vx;
      const ny = this.y + vy;

      if (GameMap.isWalkable(nx, ny)) {
        this.x = nx;
        this.y = ny;
      } else {
        this.state = 'idle';
        this.aiTarget = null;
        return;
      }

      if (Math.abs(vx) > 0.1) this.facing = vx > 0 ? 1 : -1;

      // 宠物拥有最高移动权，不再被牵绳拉回（主人会被拖着走）
    } else {
      // 到达目标
      if (this._willSniffAfterWalk) {
        this._willSniffAfterWalk = false;
        this.state = 'sniff';
        this.sniffTimer = 0;
        return;
      }
      if (this._willDigAfterWalk) {
        this._willDigAfterWalk = false;
        const spot = GameMap.getNearbyDigSpot(this.x, this.y, 30);
        if (spot && !spot.found) {
          this.state = 'dig';
          this.digTimer = 0;
          this._currentDigSpot = spot;
          return;
        }
      }
      this.state = 'idle';
      this.aiTarget = null;
    }
  }

  _sniffBehavior(dt) {
    this.sniffTimer += dt;

    // 嗅闻粒子
    if (Math.random() < 0.3) {
      this.particles.push({
        x: this.x + this.facing * 4,
        y: this.y - 6,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -Math.random() * 0.8,
        life: 500,
        maxLife: 500,
        color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)]
      });
    }

    // 嗅完之后留下气味标记
    if (this.sniffTimer > 2000) {
      GameMap.addScentMark(this.x, this.y);
      // 有概率成为偏好地点
      if (Math.random() < 0.3 && this.favoriteSpots.length < 5) {
        this.favoriteSpots.push({ x: this.x, y: this.y });
      }
      this.state = 'idle';
      this.sniffTimer = 0;
      this.happiness = Math.min(100, this.happiness + 5);
    }
  }

  _digBehavior(dt) {
    this.digTimer += dt;

    // 刨地粒子
    if (Math.random() < 0.4) {
      this.particles.push({
        x: this.x + this.facing * 6,
        y: this.y + 2,
        vx: this.facing * (0.5 + Math.random()),
        vy: -Math.random() * 1.5,
        life: 400,
        maxLife: 400,
        color: '#8B7355'
      });
    }

    if (this.digTimer > 2500) {
      // 挖到东西了！
      if (this._currentDigSpot && !this._currentDigSpot.found) {
        this._currentDigSpot.found = true;
        this.excitement = 100;
        this.happiness = Math.min(100, this.happiness + 15);

        // 触发发现事件
        if (typeof Game !== 'undefined') {
          Game.onDiscovery(this._currentDigSpot);
        }
      }
      this.state = 'idle';
      this.digTimer = 0;
      this._currentDigSpot = null;
    }
  }

  _playBehavior(dt) {
    this.playTimer += dt;

    if (!this.playPartner) {
      this.state = 'idle';
      return;
    }

    const partner = this.playPartner;
    const midX = (this.x + partner.x) / 2;
    const midY = (this.y + partner.y) / 2;

    // 初始化玩耍子状态
    if (!this._playPhase) {
      this._playPhase = 'approach'; // 初始：靠近嗅闻
      this._phaseTimer = 0;
      this._phaseIndex = 0;
      this._playCenter = { x: midX, y: midY };
      // 是否是主导方（玩家宠物主导，避免两只同时做同一动作）
      this._isLead = (this === Game?.playerPet);
    }

    this._phaseTimer += dt;

    switch (this._playPhase) {
      case 'approach':
        this._phaseApproach(dt, partner);
        break;
      case 'sniff_greet':
        this._phaseSniffGreet(dt, partner);
        break;
      case 'chase':
        this._phaseChase(dt, partner);
        break;
      case 'circle':
        this._phaseCircle(dt, partner);
        break;
      case 'tug':
        this._phaseTug(dt, partner);
        break;
      case 'fake_fall':
        this._phaseFakeFall(dt, partner);
        break;
      case 'pounce':
        this._phasePounce(dt, partner);
        break;
      case 'rest':
        this._phaseRest(dt, partner);
        break;
      case 'zoomies':
        this._phaseZoomies(dt, partner);
        break;
      case 'nudge':
        this._phaseNudge(dt, partner);
        break;
      default:
        this._nextPhase();
        break;
    }

    // 兴奋粒子（根据阶段调整频率）
    const particleRate = (this._playPhase === 'rest') ? 0.03 :
                         (this._playPhase === 'zoomies') ? 0.3 : 0.1;
    if (Math.random() < particleRate) {
      const colors = ['#f1c40f', '#ff6b6b', '#ff9ff3', '#54a0ff', '#5f27cd'];
      this.particles.push({
        x: this.x + (Math.random() - 0.5) * 8,
        y: this.y - 10 - Math.random() * 6,
        vx: (Math.random() - 0.5) * 1.2,
        vy: -0.5 - Math.random() * 1,
        life: 400 + Math.random() * 300,
        maxLife: 700,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
  }

  // 可用的玩耍阶段序列（会随机打乱）
  static PLAY_PHASES = [
    'chase', 'circle', 'tug', 'fake_fall', 'pounce',
    'rest', 'zoomies', 'nudge', 'chase', 'circle',
    'sniff_greet', 'zoomies', 'tug', 'fake_fall', 'nudge',
    'rest', 'chase', 'pounce', 'circle', 'zoomies',
  ];

  _nextPhase() {
    this._phaseTimer = 0;
    this._phaseIndex = (this._phaseIndex + 1) % Pet.PLAY_PHASES.length;
    this._playPhase = Pet.PLAY_PHASES[this._phaseIndex];
    // 随机稍微错开，避免两只完全同步
    if (!this._isLead) {
      this._phaseTimer = -200 - Math.random() * 400;
    }
  }

  // ---- 阶段：靠近 ----
  _phaseApproach(dt, partner) {
    const dx = partner.x - this.x;
    const dy = partner.y - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 20) {
      const spd = this.speed * 0.8;
      this.x += (dx / dist) * spd;
      this.y += (dy / dist) * spd;
      this.facing = dx > 0 ? 1 : -1;
    } else {
      this._playPhase = 'sniff_greet';
      this._phaseTimer = 0;
    }
  }

  // ---- 阶段：嗅闻问好 ----
  _phaseSniffGreet(dt, partner) {
    this.facing = partner.x > this.x ? 1 : -1;
    // 鼻子靠近：微微前后晃动
    const wobble = Math.sin(this._phaseTimer / 150) * 2;
    if (this._isLead) {
      this.x += wobble * 0.05;
    }
    // 嗅闻粒子
    if (Math.random() < 0.25) {
      this.particles.push({
        x: this.x + this.facing * 8,
        y: this.y - 4,
        vx: this.facing * 0.3,
        vy: -0.4,
        life: 350, maxLife: 350,
        color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)]
      });
    }

    if (this._phaseTimer > 2500) this._nextPhase();
  }

  // ---- 阶段：追逐 ----
  _phaseChase(dt, partner) {
    // 一只追、一只跑
    const center = this._playCenter || { x: this.x, y: this.y };

    if (this._isLead) {
      // 跑（绕大圈）
      const angle = this._phaseTimer / 800;
      const radius = 35 + Math.sin(this._phaseTimer / 1200) * 15;
      const tx = center.x + Math.cos(angle) * radius;
      const ty = center.y + Math.sin(angle) * radius * 0.6;
      const dx = tx - this.x;
      const dy = ty - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 1) {
        const spd = this.speed * 1.5;
        this.x += (dx / dist) * spd;
        this.y += (dy / dist) * spd;
        this.facing = dx > 0 ? 1 : -1;
      }
    } else {
      // 追
      const dx = partner.x - this.x;
      const dy = partner.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 8) {
        const spd = this.speed * 1.4;
        this.x += (dx / dist) * spd;
        this.y += (dy / dist) * spd;
        this.facing = dx > 0 ? 1 : -1;
      }
    }

    if (this._phaseTimer > 4000) this._nextPhase();
  }

  // ---- 阶段：绕圈互闻 ----
  _phaseCircle(dt, partner) {
    const center = { x: (this.x + partner.x) / 2, y: (this.y + partner.y) / 2 };
    const offset = this._isLead ? 0 : Math.PI;
    const angle = this._phaseTimer / 600 + offset;
    const r = 18;

    this.x += (center.x + Math.cos(angle) * r - this.x) * 0.1;
    this.y += (center.y + Math.sin(angle) * r * 0.7 - this.y) * 0.1;
    this.facing = Math.cos(angle + 0.5) > 0 ? 1 : -1;

    if (this._phaseTimer > 3500) this._nextPhase();
  }

  // ---- 阶段：抢东西（拔河） ----
  _phaseTug(dt, partner) {
    const center = { x: (this.x + partner.x) / 2, y: (this.y + partner.y) / 2 };
    this.facing = partner.x > this.x ? 1 : -1;

    // 来回拉扯动作
    const pull = Math.sin(this._phaseTimer / 200) * 4;
    if (this._isLead) {
      this.x += (center.x - 15 + pull - this.x) * 0.12;
      this.y += (center.y - this.y) * 0.12;
    } else {
      this.x += (center.x + 15 - pull - this.x) * 0.12;
      this.y += (center.y - this.y) * 0.12;
    }

    // 用力粒子
    if (Math.random() < 0.15) {
      this.particles.push({
        x: center.x, y: center.y - 6,
        vx: (Math.random() - 0.5) * 2,
        vy: -Math.random() * 1.5,
        life: 250, maxLife: 250,
        color: '#e74c3c'
      });
    }

    if (this._phaseTimer > 3000) this._nextPhase();
  }

  // ---- 阶段：假摔 ----
  _phaseFakeFall(dt, partner) {
    this.facing = partner.x > this.x ? 1 : -1;

    if (this._isLead) {
      // 假装摔倒（使用 sit 动画模拟趴下）
      // 不移动，原地趴着
    } else {
      // 跑过去查看
      if (this._phaseTimer < 800) {
        const dx = partner.x - this.x;
        const dy = partner.y - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 12) {
          this.x += (dx / dist) * this.speed;
          this.y += (dy / dist) * this.speed;
          this.facing = dx > 0 ? 1 : -1;
        }
      } else {
        // 到了，嗅一嗅
        if (Math.random() < 0.15) {
          this.particles.push({
            x: this.x + this.facing * 5, y: this.y - 5,
            vx: this.facing * 0.3, vy: -0.5,
            life: 300, maxLife: 300,
            color: '#f39c12'
          });
        }
      }
    }

    // 假摔的那只在2秒后突然跳起
    if (this._isLead && this._phaseTimer > 2000 && this._phaseTimer < 2200) {
      this.y -= 1.5; // 跳起效果
    }

    if (this._phaseTimer > 2800) this._nextPhase();
  }

  // ---- 阶段：扑跳 ----
  _phasePounce(dt, partner) {
    if (this._isLead) {
      if (this._phaseTimer < 600) {
        // 蓄力：身体微微后缩
      } else if (this._phaseTimer < 900) {
        // 扑过去
        const dx = partner.x - this.x;
        const dy = partner.y - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 5) {
          this.x += (dx / dist) * this.speed * 3;
          this.y += (dy / dist) * this.speed * 3;
          this.facing = dx > 0 ? 1 : -1;
        }
      } else {
        // 扑完了，原地
      }
    } else {
      // 被扑的那只：如果扑到了就退后一点
      if (this._phaseTimer > 800 && this._phaseTimer < 1200) {
        this.x -= this.facing * 0.5;
      }
    }

    if (this._phaseTimer > 2200) this._nextPhase();
  }

  // ---- 阶段：短暂休息 ----
  _phaseRest(dt, partner) {
    // 两只都停下来，面朝同一方向（看远方）
    if (this._phaseTimer < 300) {
      // 慢慢停下
      const center = { x: (this.x + partner.x) / 2, y: (this.y + partner.y) / 2 };
      const side = this._isLead ? -12 : 12;
      this.x += (center.x + side - this.x) * 0.06;
      this.y += (center.y - this.y) * 0.06;
      this.facing = 1; // 都看向右边
    }
    // 之后就安静呆着，尾巴偶尔摇
    // 偶尔一个小呵欠粒子
    if (Math.random() < 0.02) {
      this.particles.push({
        x: this.x + this.facing * 6, y: this.y - 10,
        vx: 0.1, vy: -0.3,
        life: 600, maxLife: 600,
        color: '#dfe6e9'
      });
    }

    if (this._phaseTimer > 4000) this._nextPhase();
  }

  // ---- 阶段：疯跑（zoomies） ----
  _phaseZoomies(dt, partner) {
    const center = this._playCenter || { x: this.x, y: this.y };
    const t = this._phaseTimer / 300;
    const offset = this._isLead ? 0 : 1.5;

    // 8字形疯跑
    const radius = 30 + Math.sin(t * 0.5) * 10;
    const tx = center.x + Math.sin(t + offset) * radius;
    const ty = center.y + Math.sin((t + offset) * 2) * radius * 0.35;

    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 1) {
      const spd = this.speed * 2;
      this.x += (dx / dist) * spd;
      this.y += (dy / dist) * spd;
      this.facing = dx > 0 ? 1 : -1;
    }

    // 疯跑尘土
    if (Math.random() < 0.3) {
      this.particles.push({
        x: this.x, y: this.y + 2,
        vx: -this.facing * (0.3 + Math.random() * 0.5),
        vy: -Math.random() * 0.3,
        life: 300, maxLife: 300,
        color: '#b0a07e'
      });
    }

    if (this._phaseTimer > 3500) this._nextPhase();
  }

  // ---- 阶段：轻碰鼻子 ----
  _phaseNudge(dt, partner) {
    this.facing = partner.x > this.x ? 1 : -1;
    const center = { x: (this.x + partner.x) / 2, y: (this.y + partner.y) / 2 };

    if (this._phaseTimer < 1500) {
      // 慢慢靠近
      const side = this._isLead ? -8 : 8;
      this.x += (center.x + side - this.x) * 0.04;
      this.y += (center.y - this.y) * 0.04;
    } else if (this._phaseTimer < 1800) {
      // 碰鼻——微微前伸
      if (this._isLead) this.x += 0.3;
      else this.x -= 0.3;
    } else {
      // 碰完后退一点
      if (this._phaseTimer < 2200) {
        if (this._isLead) this.x -= 0.2;
        else this.x += 0.2;
      }
    }

    // 碰鼻瞬间的爱心粒子
    if (this._phaseTimer > 1500 && this._phaseTimer < 1900 && Math.random() < 0.2) {
      this.particles.push({
        x: center.x, y: center.y - 14,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -0.8 - Math.random() * 0.5,
        life: 600, maxLife: 600,
        color: '#ff6b6b'
      });
    }

    if (this._phaseTimer > 3000) this._nextPhase();
  }

  // 清理玩耍状态
  _cleanPlayState() {
    this._playPhase = null;
    this._phaseTimer = 0;
    this._phaseIndex = 0;
    this._playCenter = null;
    this._isLead = false;
  }

  // ===== 惊喜系统 =====
  static SURPRISES = [
    { type: 'flower', name: '一朵小野花', desc: '它叼着一朵花跑回来了，送给你！', emoji: '🌸', item: 'flower' },
    { type: 'butterfly', name: '一只蝴蝶', desc: '它追了好久，居然真的抓到了...轻轻放在你手心', emoji: '🦋', item: null },
    { type: 'treasure', name: '闪闪发光的石头', desc: '它兴奋地刨了两下，叼出来一颗亮晶晶的石头', emoji: '💎', item: 'gem' },
    { type: 'feather', name: '一根漂亮的羽毛', desc: '风吹来一根羽毛，它跳起来咬住了！', emoji: '🪶', item: 'feather' },
    { type: 'pinecone', name: '一颗松果', desc: '它从树下捡了一颗完美的松果，骄傲地叼过来', emoji: '🌰', item: 'pinecone' },
    { type: 'stick', name: '一根好看的树枝', desc: '这根树枝形状特别好，它觉得你一定会喜欢', emoji: '🪵', item: null },
    { type: 'clover', name: '四叶草', desc: '天哪！它居然找到了一片四叶草！', emoji: '🍀', item: 'clover' },
    { type: 'shell', name: '一个小贝壳', desc: '不知道哪来的贝壳，但它很宝贝地叼给你', emoji: '🐚', item: 'shell' },
  ];

  _triggerSurprise() {
    const surprise = Pet.SURPRISES[Math.floor(Math.random() * Pet.SURPRISES.length)];
    this._surpriseType = surprise;
    this.surpriseTimer = 0;
    this.state = 'surprise';
    this.excitement = 80;

    // 先跑到附近随机一个点（模拟去找东西）
    const angle = Math.random() * Math.PI * 2;
    const dist = 30 + Math.random() * 25;
    this.aiTarget = {
      x: this.x + Math.cos(angle) * dist,
      y: this.y + Math.sin(angle) * dist
    };
    this._surprisePhase = 'goFind'; // goFind -> finding -> bringBack
  }

  _surpriseBehavior(dt) {
    this.surpriseTimer += dt;

    if (!this._surpriseType) { this.state = 'idle'; return; }

    switch (this._surprisePhase) {
      case 'goFind': {
        // 跑向目标点
        if (!this.aiTarget) { this._surprisePhase = 'finding'; break; }
        const dx = this.aiTarget.x - this.x;
        const dy = this.aiTarget.y - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 4) {
          this.x += (dx / dist) * this.speed * 1.3;
          this.y += (dy / dist) * this.speed * 1.3;
          if (Math.abs(dx) > 0.5) this.facing = dx > 0 ? 1 : -1;
        } else {
          this._surprisePhase = 'finding';
          this.surpriseTimer = 0;
        }
        break;
      }
      case 'finding': {
        // 嗅闻/刨地动作
        if (Math.random() < 0.25) {
          this.particles.push({
            x: this.x + this.facing * 5, y: this.y - 4,
            vx: (Math.random() - 0.5) * 0.8, vy: -0.5 - Math.random() * 0.5,
            life: 400, maxLife: 400,
            color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)]
          });
        }
        if (this.surpriseTimer > 1800) {
          this._surprisePhase = 'bringBack';
          this.surpriseTimer = 0;
          this.excitement = 100;
        }
        break;
      }
      case 'bringBack': {
        // 跑回主人身边
        if (!this.owner) { this.state = 'idle'; return; }
        const dx = this.owner.x - this.x;
        const dy = this.owner.y - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 15) {
          this.x += (dx / dist) * this.speed * 1.5;
          this.y += (dy / dist) * this.speed * 1.5;
          if (Math.abs(dx) > 0.5) this.facing = dx > 0 ? 1 : -1;
        } else {
          // 到了！给主人惊喜
          if (typeof Game !== 'undefined') {
            Game.onSurprise(this._surpriseType);
          }
          // 开心粒子爆发
          for (let i = 0; i < 8; i++) {
            this.particles.push({
              x: this.x, y: this.y - 8,
              vx: (Math.random() - 0.5) * 2,
              vy: -1 - Math.random() * 2,
              life: 600, maxLife: 600,
              color: ['#f1c40f', '#ff6b6b', '#ff9ff3', '#2ecc71', '#54a0ff'][Math.floor(Math.random() * 5)]
            });
          }
          this.happiness = Math.min(100, this.happiness + 10);
          this._surpriseType = null;
          this._surprisePhase = null;
          this.state = 'idle';
        }
        break;
      }
    }
  }

  _followOwner(dt) {
    if (!this.owner) { this.state = 'idle'; return; }

    const dx = this.owner.x - this.x;
    const dy = this.owner.y - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist > this.leashLength * 0.5) {
      const vx = (dx / dist) * this.speed * 1.2;
      const vy = (dy / dist) * this.speed * 1.2;
      this.x += vx;
      this.y += vy;
      if (Math.abs(vx) > 0.1) this.facing = vx > 0 ? 1 : -1;
    } else {
      this.state = 'idle';
    }
  }

  _updateParticles(dt) {
    this.particles = this.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= dt;
      return p.life > 0;
    });
  }

  render(ctx, camera) {
    const sx = this.x - camera.x;
    const sy = this.y - camera.y;

    // 获取当前动画帧
    let anim = this.sprites[this.state] || this.sprites.idle;
    if (!anim) anim = this.sprites.idle;
    const frame = anim[this.animFrame % anim.length];

    // 绘制宠物
    if (this.facing === -1) {
      PixelArt.drawFlipped(ctx, frame, sx - 14, sy - 18);
    } else {
      PixelArt.draw(ctx, frame, sx - 14, sy - 18);
    }

    // 名字标签
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    const font = '-apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
    ctx.font = `500 9px ${font}`;
    const tw = ctx.measureText(this.name).width;
    ctx.beginPath();
    ctx.roundRect(sx - tw / 2 - 3, sy - 26, tw + 6, 13, 6);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText(this.name, sx - tw / 2, sy - 16);

    // 粒子
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - camera.x - 1, p.y - camera.y - 1, 3, 3);
    }
    ctx.globalAlpha = 1;

    // 状态指示器
    if (this.excitement > 50) {
      // 兴奋时头上有感叹号
      ctx.fillStyle = '#f1c40f';
      ctx.font = 'bold 14px monospace';
      ctx.fillText('!', sx - 2, sy - 26);
    }

    // 嗅闻时头上有 "..."
    if (this.state === 'sniff') {
      ctx.fillStyle = '#aaa';
      ctx.font = '10px monospace';
      const dotX = sx + this.facing * 12;
      ctx.fillText('~', dotX, sy - 10);
      ctx.fillText('~', dotX + 4, sy - 14);
    }
  }
}

class NPCOwner {
  constructor(x, y, petType, petName) {
    this.x = x;
    this.y = y;
    this.speed = 0.8;
    this.state = 'walk';
    this.facing = 1;
    this.animFrame = 0;
    this.animTimer = 0;

    // NPC 主人有一条随机路线
    this.waypoints = this._generateRoute(x, y);
    this.waypointIndex = 0;

    // NPC 的宠物
    this.pet = new Pet(x + 20, y, petType, petName);
    this.pet.owner = this;
    this.pet.leashLength = 50;

    // 衬衫颜色随机
    this.shirtColor = [PAL.SHIRT_RED, PAL.SHIRT_GREEN, PAL.SHIRT_PURPLE][Math.floor(Math.random() * 3)];

    // 互动前位置
    this._preSitX = x;
    this._preSitY = y;
    this._sitTargetX = x;
    this._sitTargetY = y;
  }

  walkToAndSit(tx, ty) {
    this._preSitX = this.x;
    this._preSitY = this.y;
    this._sitTargetX = tx;
    this._sitTargetY = ty;
    this.state = 'walkToSit';
  }

  standUpAndReturn() {
    this.state = 'walk';
    // 回到之前的路线
    if (this.waypoints.length > 0) {
      this.waypointIndex = 0;
      this.waypoints[0] = { x: this._preSitX, y: this._preSitY };
    }
  }

  _generateRoute(sx, sy) {
    const points = [];
    let cx = sx, cy = sy;
    for (let i = 0; i < 8; i++) {
      cx += (Math.random() - 0.5) * 200;
      cy += (Math.random() - 0.5) * 200;
      cx = Math.max(50, Math.min(GameMap.WIDTH - 50, cx));
      cy = Math.max(50, Math.min(GameMap.HEIGHT - 50, cy));
      if (GameMap.isWalkable(cx, cy)) {
        points.push({ x: cx, y: cy });
      }
    }
    // 回到起点
    points.push({ x: sx, y: sy });
    return points;
  }

  update(dt) {
    this.animTimer += dt;
    if (this.animTimer > 300) {
      this.animTimer = 0;
      this.animFrame = (this.animFrame + 1) % 2;
    }

    if (this.state === 'sit') {
      this.pet.update(dt);
      return;
    }

    if (this.state === 'walkToSit') {
      const dx = this._sitTargetX - this.x;
      const dy = this._sitTargetY - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 3) {
        const vx = (dx / dist) * this.speed * 1.5;
        const vy = (dy / dist) * this.speed * 1.5;
        if (GameMap.isWalkable(this.x + vx, this.y + vy)) {
          this.x += vx;
          this.y += vy;
        } else {
          this.state = 'sit';
        }
        if (Math.abs(vx) > 0.1) this.facing = vx > 0 ? 1 : -1;
      } else {
        this.state = 'sit';
        this.animFrame = 0;
      }
      this.pet.update(dt);
      return;
    }

    // 沿路线行走
    if (this.waypoints.length === 0) return;
    const wp = this.waypoints[this.waypointIndex];
    const dx = wp.x - this.x;
    const dy = wp.y - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 5) {
      const vx = (dx / dist) * this.speed;
      const vy = (dy / dist) * this.speed;
      if (GameMap.isWalkable(this.x + vx, this.y + vy)) {
        this.x += vx;
        this.y += vy;
      } else {
        this.waypointIndex = (this.waypointIndex + 1) % this.waypoints.length;
      }
      if (Math.abs(vx) > 0.1) this.facing = vx > 0 ? 1 : -1;
      this.state = 'walk';
    } else {
      this.waypointIndex = (this.waypointIndex + 1) % this.waypoints.length;
    }

    // 更新宠物
    this.pet.update(dt);
  }

  render(ctx, camera) {
    const sx = this.x - camera.x;
    const sy = this.y - camera.y;

    // 简单裁剪
    if (sx < -50 || sx > camera.w + 50 || sy < -50 || sy > camera.h + 50) return;

    // 绘制主人（用不同颜色衬衫）
    const renderState = (this.state === 'walkToSit') ? 'walk' : this.state;
    const sprites = OWNER_SPRITES[renderState] || OWNER_SPRITES.idle;
    const frame = sprites[this.animFrame % sprites.length];

    // 换色后绘制
    const colored = frame.map(row => row.map(c => {
      if (c === PAL.SHIRT_BLUE) return this.shirtColor;
      return c;
    }));

    if (this.facing === -1) {
      PixelArt.drawFlipped(ctx, colored, sx - 12, sy - 34);
    } else {
      PixelArt.draw(ctx, colored, sx - 12, sy - 34);
    }

    // 牵绳
    this._renderLeash(ctx, camera);

    // 宠物
    this.pet.render(ctx, camera);
  }

  _renderLeash(ctx, camera) {
    ctx.strokeStyle = PAL.LEASH;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x - camera.x, this.y - camera.y - 5);

    // 简单曲线牵绳
    const mx = (this.x + this.pet.x) / 2;
    const my = (this.y + this.pet.y) / 2 + 5;
    ctx.quadraticCurveTo(mx - camera.x, my - camera.y, this.pet.x - camera.x, this.pet.y - camera.y - 3);
    ctx.stroke();
  }
}

class NPCGrandpa {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.state = 'walk';
    this.speed = 0.5;
    this.facing = 1;
    this.talked = false;
    this.talkBubble = null;
    this.talkTimer = 0;

    // 随机行走目标
    this.targetX = x + (Math.random() - 0.5) * 200;
    this.targetY = y + (Math.random() - 0.5) * 100;
  }

  update(dt) {
    // 行走
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 5) {
      const vx = (dx / dist) * this.speed;
      const vy = (dy / dist) * this.speed;
      if (GameMap.isWalkable(this.x + vx, this.y + vy)) {
        this.x += vx;
        this.y += vy;
      }
      if (Math.abs(vx) > 0.1) this.facing = vx > 0 ? 1 : -1;
    } else {
      // 新目标
      this.targetX = this.x + (Math.random() - 0.5) * 300;
      this.targetY = this.y + (Math.random() - 0.5) * 200;
      this.targetX = Math.max(50, Math.min(GameMap.WIDTH - 50, this.targetX));
      this.targetY = Math.max(50, Math.min(GameMap.HEIGHT - 50, this.targetY));
    }

    // 对话气泡消失
    if (this.talkBubble) {
      this.talkTimer += dt;
      if (this.talkTimer > 3000) {
        this.talkBubble = null;
        this.talkTimer = 0;
      }
    }
  }

  /**
   * 检查是否与玩家宠物接近，触发搭话
   */
  checkInteraction(playerPet) {
    if (this.talked) return false;
    const dist = Math.hypot(this.x - playerPet.x, this.y - playerPet.y);
    if (dist < 50) {
      this.talked = true;
      this.talkBubble = '真精神！给你零食~';
      this.talkTimer = 0;
      return true;
    }
    return false;
  }

  render(ctx, camera) {
    const sx = this.x - camera.x;
    const sy = this.y - camera.y;

    if (sx < -50 || sx > camera.w + 50 || sy < -50 || sy > camera.h + 50) return;

    if (this.facing === -1) {
      PixelArt.drawFlipped(ctx, NPC_GRANDPA_SPRITE, sx - 12, sy - 30);
    } else {
      PixelArt.draw(ctx, NPC_GRANDPA_SPRITE, sx - 12, sy - 30);
    }

    // 对话气泡
    if (this.talkBubble) {
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = '10px monospace';
      const tw = ctx.measureText(this.talkBubble).width;
      const bx = sx - tw / 2 - 4;
      const by = sy - 38;

      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.roundRect(bx, by, tw + 8, 16, 4);
      ctx.fill();

      ctx.fillStyle = '#333';
      ctx.fillText(this.talkBubble, bx + 4, by + 11);
    }
  }
}

// ===== 世界事件实体 =====

class ButterflyEntity {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.startX = x;
    this.startY = y;
    this.alive = true;
    this.life = 12000;
    this.timer = 0;
    this.wingPhase = 0;
    this.colors = [
      ['#ff9ff3', '#f368e0'],
      ['#54a0ff', '#2e86de'],
      ['#feca57', '#ff9f43'],
      ['#5f27cd', '#341f97'],
    ][Math.floor(Math.random() * 4)];
  }

  update(dt) {
    this.timer += dt;
    this.life -= dt;
    if (this.life <= 0) { this.alive = false; return; }
    const t = this.timer / 1000;
    this.x = this.startX + Math.sin(t * 0.8) * 60 + Math.sin(t * 2.1) * 15;
    this.y = this.startY + Math.cos(t * 0.6) * 30 - t * 8;
    this.wingPhase = Math.sin(this.timer / 80);
    if (this.y < -50 || this.x < -50 || this.x > GameMap.WIDTH + 50) this.alive = false;
  }

  render(ctx, cam) {
    const sx = this.x - cam.x;
    const sy = this.y - cam.y;
    if (sx < -20 || sx > cam.w + 20 || sy < -20 || sy > cam.h + 20) return;
    const alpha = Math.min(1, this.life / 1000);
    ctx.globalAlpha = alpha;
    const wingW = 4 * Math.abs(this.wingPhase);
    ctx.fillStyle = this.colors[0];
    ctx.beginPath();
    ctx.ellipse(sx - wingW, sy, wingW + 1, 3, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = this.colors[1];
    ctx.beginPath();
    ctx.ellipse(sx + wingW, sy, wingW + 1, 3, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#333';
    ctx.fillRect(sx - 0.5, sy - 2, 1, 5);
    ctx.globalAlpha = 1;
  }
}

class FrisbeeEntity {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.alive = true;
    this.life = 15000;
    this.timer = 0;
    this.bobPhase = Math.random() * Math.PI * 2;
  }

  update(dt) {
    this.timer += dt;
    this.life -= dt;
    if (this.life <= 0) { this.alive = false; return; }
    this.bobPhase += dt * 0.003;
  }

  render(ctx, cam) {
    const sx = this.x - cam.x;
    const sy = this.y - cam.y + Math.sin(this.bobPhase) * 2;
    if (sx < -20 || sx > cam.w + 20 || sy < -20 || sy > cam.h + 20) return;
    const alpha = Math.min(1, this.life / 1000);
    ctx.globalAlpha = alpha;
    const glow = 0.3 + Math.sin(this.timer / 300) * 0.15;
    ctx.fillStyle = `rgba(231,76,60,${glow})`;
    ctx.beginPath();
    ctx.arc(sx, sy, 10, 0, Math.PI * 2);
    ctx.fill();
    PixelArt.draw(ctx, ITEM_SPRITES.frisbee, sx - 7, sy - 5, 2);
    ctx.globalAlpha = 1;
  }
}
