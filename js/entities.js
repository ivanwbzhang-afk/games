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
    this.facing = 'down'; // down, up, left, right
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

  walkToAndSit(tx, ty) {
    this._preSitX = this.x;
    this._preSitY = this.y;
    this.targetX = tx;
    this.targetY = ty;
    this.state = 'walkToSit';
  }

  standUpAndReturn() {
    this.targetX = this._preSitX;
    this.targetY = this._preSitY;
    this.state = 'walk';
  }

  update(dt) {
    if (this.state === 'sit') return;

    let targetX = this.targetX;
    let targetY = this.targetY;
    let walkState = this.state === 'walkToSit' ? 'walk' : this.state;

    const dx = targetX - this.x;
    const dy = targetY - this.y;
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
        if (this.state === 'walkToSit') this.state = 'sit';
        else this.state = 'idle';
        return;
      }

      // 更新朝向
      if (Math.abs(vx) > Math.abs(vy)) {
        this.facing = vx > 0 ? 'right' : 'left';
      } else {
        this.facing = vy > 0 ? 'down' : 'up';
      }
      
      this.state = this.state === 'walkToSit' ? 'walkToSit' : 'walk';

      // 动画帧
      this.animTimer += dt;
      if (this.animTimer > 200) { // 加快动画速度
        this.animTimer = 0;
        this.animFrame = (this.animFrame + 1) % 2;
      }
    } else {
      if (this.state === 'walkToSit') {
        this.state = 'sit';
        this.facing = 'down';
      } else {
        this.state = 'idle';
      }
      this.animFrame = 0;
    }
  }

  getSpriteKey() {
    if (this.state === 'sit') return 'sit';
    let stateStr = (this.state === 'walkToSit') ? 'walk' : this.state;
    let dir = this.facing;
    if (dir === 'left' || dir === 'right') dir = 'side';
    return `${dir}_${stateStr}`;
  }

  render(ctx, camera) {
    const sx = this.x - camera.x;
    const sy = this.y - camera.y;

    // 阴影
    PixelArt.drawShadow(ctx, sx, sy, 14, 6);

    const key = this.getSpriteKey();
    const sprites = OWNER_SPRITES[key] || OWNER_SPRITES.down_idle;
    const frame = sprites[this.animFrame % sprites.length];

    // 12x20 sprite at scale 3 = 36x60 px
    if (this.facing === 'left') {
      PixelArt.drawFlipped(ctx, frame, sx - 18, sy - 57);
    } else {
      PixelArt.draw(ctx, frame, sx - 18, sy - 57);
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
    this.facing = 'right'; // down, up, left, right
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
    this._updateParticles(dt);

    switch (this.state) {
      case 'idle': this._idleBehavior(dt); break;
      case 'walk': this._walkBehavior(dt); break;
      case 'sniff': this._sniffBehavior(dt); break;
      case 'dig': this._digBehavior(dt); break;
      case 'sit': break;
      case 'play': this._playBehavior(dt); break;
      case 'follow': this._followOwner(dt); break;
      case 'surprise': this._surpriseBehavior(dt); break;
    }

    const animInterval = this._playAnimSpeed || 200;
    if (this.animTimer > animInterval) {
      this.animTimer = 0;
      this.animFrame = (this.animFrame + 1) % 2;
    }

    this.energy = Math.min(100, this.energy + dt * 0.002);
  }

  _updateFacing(vx, vy) {
    if (Math.abs(vx) > Math.abs(vy)) {
      this.facing = vx > 0 ? 'right' : 'left';
    } else {
      this.facing = vy > 0 ? 'down' : 'up';
    }
  }

  _idleBehavior(dt) {
    this.aiTimer += dt;
    if (this.aiTimer > this.aiNextAction) {
      this.aiTimer = 0;
      this.aiNextAction = 1200 + Math.random() * 2500;
      if (this.owner) {
        const r = Math.random();
        if (r < 0.08 && !this.interacting && this === Game?.playerPet) {
          this._triggerSurprise();
          return;
        }
        const stump = GameMap.getNearbyStump(this.x, this.y, 120);
        if (stump && r < 0.3) {
          this.aiTarget = { x: stump.x + 10, y: stump.y + 10 };
          this.state = 'walk';
          this._willSniffAfterWalk = true;
          return;
        }
        const digSpot = GameMap.getNearbyDigSpot(this.x, this.y, 100);
        if (digSpot && r < 0.5) {
          this.aiTarget = { x: digSpot.x, y: digSpot.y };
          this.state = 'walk';
          this._willDigAfterWalk = true;
          return;
        }
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
    if (this._seekTarget) {
      this.aiTarget.x = this._seekTarget.x;
      this.aiTarget.y = this._seekTarget.y;
    }
    const dx = this.aiTarget.x - this.x;
    const dy = this.aiTarget.y - this.y;
    const dist = Math.hypot(dx, dy);
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
      this._updateFacing(vx, vy);
    } else {
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
    if (Math.random() < 0.3) {
      this.particles.push({
        x: this.x + (this.facing==='right'?4:-4),
        y: this.y - 6,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -Math.random() * 0.8,
        life: 500, maxLife: 500,
        color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)]
      });
    }
    if (this.sniffTimer > 2000) {
      GameMap.addScentMark(this.x, this.y);
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
    if (Math.random() < 0.4) {
      this.particles.push({
        x: this.x + (this.facing==='right'?6:-6),
        y: this.y + 2,
        vx: (this.facing==='right'?1:-1) * (0.5 + Math.random()),
        vy: -Math.random() * 1.5,
        life: 400, maxLife: 400,
        color: '#8B7355'
      });
    }
    if (this.digTimer > 2500) {
      if (this._currentDigSpot && !this._currentDigSpot.found) {
        this._currentDigSpot.found = true;
        this.excitement = 100;
        this.happiness = Math.min(100, this.happiness + 15);
        if (typeof Game !== 'undefined') Game.onDiscovery(this._currentDigSpot);
      }
      this.state = 'idle';
      this.digTimer = 0;
      this._currentDigSpot = null;
    }
  }

  _playBehavior(dt) {
    this.playTimer += dt;
    if (!this.playPartner) { this.state = 'idle'; return; }
    const partner = this.playPartner;
    const midX = (this.x + partner.x) / 2;
    const midY = (this.y + partner.y) / 2;

    if (!this._playPhase) {
      this._playPhase = 'approach';
      this._phaseTimer = 0;
      this._phaseIndex = 0;
      this._playCenter = { x: midX, y: midY };
      this._isLead = (this === Game?.playerPet);
    }
    this._phaseTimer += dt;

    switch (this._playPhase) {
      case 'approach': this._phaseApproach(dt, partner); break;
      case 'sniff_greet': this._phaseSniffGreet(dt, partner); break;
      case 'chase': this._phaseChase(dt, partner); break;
      case 'circle': this._phaseCircle(dt, partner); break;
      case 'tug': this._phaseTug(dt, partner); break;
      case 'fake_fall': this._phaseFakeFall(dt, partner); break;
      case 'pounce': this._phasePounce(dt, partner); break;
      case 'rest': this._phaseRest(dt, partner); break;
      case 'zoomies': this._phaseZoomies(dt, partner); break;
      case 'nudge': this._phaseNudge(dt, partner); break;
      default: this._nextPhase(); break;
    }
  }

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
    if (!this._isLead) this._phaseTimer = -200 - Math.random() * 400;
  }

  _phaseApproach(dt, partner) {
    const dx = partner.x - this.x;
    const dy = partner.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 20) {
      const vx = (dx / dist) * this.speed * 0.8;
      const vy = (dy / dist) * this.speed * 0.8;
      this.x += vx; this.y += vy;
      this._updateFacing(vx, vy);
    } else {
      this._playPhase = 'sniff_greet';
      this._phaseTimer = 0;
    }
  }
  
  _phaseSniffGreet(dt, partner) {
    this.facing = partner.x > this.x ? 'right' : 'left';
    if (this._phaseTimer > 2500) this._nextPhase();
  }
  
  _phaseChase(dt, partner) {
    const center = this._playCenter || { x: this.x, y: this.y };
    if (this._isLead) {
      const angle = this._phaseTimer / 800;
      const radius = 35 + Math.sin(this._phaseTimer / 1200) * 15;
      const tx = center.x + Math.cos(angle) * radius;
      const ty = center.y + Math.sin(angle) * radius * 0.6;
      const dx = tx - this.x; const dy = ty - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 1) {
        const vx = (dx / dist) * this.speed * 1.5;
        const vy = (dy / dist) * this.speed * 1.5;
        this.x += vx; this.y += vy;
        this._updateFacing(vx, vy);
      }
    } else {
      const dx = partner.x - this.x; const dy = partner.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 8) {
        const vx = (dx / dist) * this.speed * 1.4;
        const vy = (dy / dist) * this.speed * 1.4;
        this.x += vx; this.y += vy;
        this._updateFacing(vx, vy);
      }
    }
    if (this._phaseTimer > 4000) this._nextPhase();
  }

  _phaseCircle(dt, partner) {
    const center = { x: (this.x + partner.x) / 2, y: (this.y + partner.y) / 2 };
    const offset = this._isLead ? 0 : Math.PI;
    const angle = this._phaseTimer / 600 + offset;
    const r = 18;
    this.x += (center.x + Math.cos(angle) * r - this.x) * 0.1;
    this.y += (center.y + Math.sin(angle) * r * 0.7 - this.y) * 0.1;
    this.facing = Math.cos(angle + 0.5) > 0 ? 'right' : 'left';
    if (this._phaseTimer > 3500) this._nextPhase();
  }

  _phaseTug(dt, partner) {
    if (this._phaseTimer > 3000) this._nextPhase();
  }
  _phaseFakeFall(dt, partner) {
    if (this._phaseTimer > 2800) this._nextPhase();
  }
  _phasePounce(dt, partner) {
    if (this._phaseTimer > 2200) this._nextPhase();
  }
  _phaseRest(dt, partner) {
    this.facing = 'down';
    if (this._phaseTimer > 4000) this._nextPhase();
  }
  _phaseZoomies(dt, partner) {
    if (this._phaseTimer > 3500) this._nextPhase();
  }
  _phaseNudge(dt, partner) {
    if (this._phaseTimer > 3000) this._nextPhase();
  }

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
  ];

  _triggerSurprise() {
    const surprise = Pet.SURPRISES[Math.floor(Math.random() * Pet.SURPRISES.length)];
    this._surpriseType = surprise;
    this.surpriseTimer = 0;
    this.state = 'surprise';
    this.excitement = 80;
    const angle = Math.random() * Math.PI * 2;
    const dist = 30 + Math.random() * 25;
    this.aiTarget = {
      x: this.x + Math.cos(angle) * dist,
      y: this.y + Math.sin(angle) * dist
    };
    this._surprisePhase = 'goFind';
  }

  _surpriseBehavior(dt) {
    this.surpriseTimer += dt;
    if (!this._surpriseType) { this.state = 'idle'; return; }
    if (this._surprisePhase === 'goFind') {
      if (!this.aiTarget) { this._surprisePhase = 'finding'; return; }
      const dx = this.aiTarget.x - this.x;
      const dy = this.aiTarget.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 4) {
        const vx = (dx / dist) * this.speed * 1.3;
        const vy = (dy / dist) * this.speed * 1.3;
        this.x += vx; this.y += vy;
        this._updateFacing(vx, vy);
      } else {
        this._surprisePhase = 'finding';
        this.surpriseTimer = 0;
      }
    } else if (this._surprisePhase === 'finding') {
      if (this.surpriseTimer > 1800) {
        this._surprisePhase = 'bringBack';
        this.surpriseTimer = 0;
        this.excitement = 100;
      }
    } else if (this._surprisePhase === 'bringBack') {
      if (!this.owner) { this.state = 'idle'; return; }
      const dx = this.owner.x - this.x;
      const dy = this.owner.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 15) {
        const vx = (dx / dist) * this.speed * 1.5;
        const vy = (dy / dist) * this.speed * 1.5;
        this.x += vx; this.y += vy;
        this._updateFacing(vx, vy);
      } else {
        if (typeof Game !== 'undefined') Game.onSurprise(this._surpriseType);
        this.happiness = Math.min(100, this.happiness + 10);
        this._surpriseType = null;
        this._surprisePhase = null;
        this.state = 'idle';
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
      this.x += vx; this.y += vy;
      this._updateFacing(vx, vy);
    } else {
      this.state = 'idle';
    }
  }

  _updateParticles(dt) {
    this.particles = this.particles.filter(p => {
      p.x += p.vx; p.y += p.vy; p.life -= dt;
      return p.life > 0;
    });
  }

  getSpriteKey() {
    let stateStr = this.state;
    if (stateStr === 'play' || stateStr === 'follow' || stateStr === 'surprise') stateStr = 'walk';
    if (!['idle', 'walk', 'sniff', 'dig', 'sit'].includes(stateStr)) stateStr = 'idle';
    
    // sniff/dig/sit only have flat directional mapping (often just one view)
    // we fallback to 'side_idle' or 'down_idle' if undefined.
    if (['sniff', 'dig', 'sit'].includes(stateStr)) return stateStr;

    let dir = this.facing;
    if (dir === 'left' || dir === 'right') dir = 'side';
    return `${dir}_${stateStr}`;
  }

  render(ctx, camera) {
    const sx = this.x - camera.x;
    let sy = this.y - camera.y;

    PixelArt.drawShadow(ctx, sx, sy, 10, 5);

    if (this._bouncing && this._bounceOffset) {
      sy -= this._bounceOffset;
    }

    const key = this.getSpriteKey();
    let anim = this.sprites[key] || this.sprites['down_idle'];
    if (!anim) anim = this.sprites['down_idle'];
    const frame = anim[this.animFrame % anim.length] || anim[0];

    if (this.facing === 'left') {
      PixelArt.drawFlipped(ctx, frame, sx - 13.5, sy - 24);
    } else {
      PixelArt.draw(ctx, frame, sx - 13.5, sy - 24);
    }

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    const font = '-apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
    ctx.font = `500 9px ${font}`;
    const tw = ctx.measureText(this.name).width;
    ctx.beginPath();
    ctx.roundRect(sx - tw / 2 - 3, sy - 34, tw + 6, 13, 6);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText(this.name, sx - tw / 2, sy - 24);

    for (const p of this.particles) {
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - camera.x - 1.5, p.y - camera.y - 1.5, 3, 3);
    }
    ctx.globalAlpha = 1;

    if (this.excitement > 50) {
      ctx.fillStyle = '#f1c40f';
      ctx.font = 'bold 14px monospace';
      ctx.fillText('!', sx - 2, sy - 36);
    }
    if (this.state === 'sniff') {
      ctx.fillStyle = '#aaa';
      ctx.font = '10px monospace';
      const dotX = sx + (this.facing==='right'?12:-12);
      ctx.fillText('~', dotX, sy - 15);
      ctx.fillText('~', dotX + 4, sy - 19);
    }
  }
}

class NPCOwner {
  constructor(x, y, petType, petName) {
    this.x = x; this.y = y;
    this.speed = 0.8;
    this.state = 'walk';
    this.facing = 'down';
    this.animFrame = 0; this.animTimer = 0;
    this.waypoints = this._generateRoute(x, y);
    this.waypointIndex = 0;

    this.pet = new Pet(x + 20, y, petType, petName);
    this.pet.owner = this;
    this.pet.leashLength = 50;

    this.shirtColor = [PAL.SHIRT_RED, PAL.SHIRT_GREEN, PAL.SHIRT_PURPLE][Math.floor(Math.random() * 3)];

    this._preSitX = x;
    this._preSitY = y;
  }

  walkToAndSit(tx, ty) {
    this._preSitX = this.x;
    this._preSitY = this.y;
    this._sitTarget = { x: tx, y: ty };
    this.state = 'walkToSit';
  }

  standUpAndReturn() {
    this._sitTarget = null;
    this.state = 'walk';
    // 恢复巡逻
    this.waypoints[0] = { x: this._preSitX, y: this._preSitY };
    this.waypointIndex = 0;
  }

  _generateRoute(sx, sy) {
    const points = [];
    let cx = sx, cy = sy;
    for (let i = 0; i < 8; i++) {
      cx += (Math.random() - 0.5) * 200;
      cy += (Math.random() - 0.5) * 200;
      cx = Math.max(50, Math.min(GameMap.WIDTH - 50, cx));
      cy = Math.max(50, Math.min(GameMap.HEIGHT - 50, cy));
      if (GameMap.isWalkable(cx, cy)) points.push({ x: cx, y: cy });
    }
    points.push({ x: sx, y: sy });
    return points;
  }

  update(dt) {
    this.animTimer += dt;
    if (this.animTimer > 200) {
      this.animTimer = 0;
      this.animFrame = (this.animFrame + 1) % 2;
    }

    if (this.state === 'sit') {
      this.pet.update(dt);
      return;
    }

    // walkToSit：走向目标椅子
    if (this.state === 'walkToSit' && this._sitTarget) {
      const dx = this._sitTarget.x - this.x;
      const dy = this._sitTarget.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 3) {
        const vx = (dx / dist) * this.speed;
        const vy = (dy / dist) * this.speed;
        if (GameMap.isWalkable(this.x + vx, this.y + vy)) {
          this.x += vx; this.y += vy;
        } else {
          this.state = 'sit'; this.facing = 'down';
        }
        if (Math.abs(vx) > Math.abs(vy)) this.facing = vx > 0 ? 'right' : 'left';
        else this.facing = vy > 0 ? 'down' : 'up';
      } else {
        this.state = 'sit'; this.facing = 'down';
      }
      this.pet.update(dt);
      return;
    }

    if (this.waypoints.length === 0) return;
    const wp = this.waypoints[this.waypointIndex];
    const dx = wp.x - this.x;
    const dy = wp.y - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 5) {
      const vx = (dx / dist) * this.speed;
      const vy = (dy / dist) * this.speed;
      if (GameMap.isWalkable(this.x + vx, this.y + vy)) {
        this.x += vx; this.y += vy;
      } else {
        this.waypointIndex = (this.waypointIndex + 1) % this.waypoints.length;
      }
      
      if (Math.abs(vx) > Math.abs(vy)) {
        this.facing = vx > 0 ? 'right' : 'left';
      } else {
        this.facing = vy > 0 ? 'down' : 'up';
      }
      this.state = 'walk';
    } else {
      this.waypointIndex = (this.waypointIndex + 1) % this.waypoints.length;
    }

    this.pet.update(dt);
  }

  getSpriteKey() {
    if (this.state === 'sit') return 'sit';
    let stateStr = (this.state === 'walkToSit') ? 'walk' : this.state;
    let dir = this.facing;
    if (dir === 'left' || dir === 'right') dir = 'side';
    return `${dir}_${stateStr}`;
  }

  render(ctx, camera) {
    const sx = this.x - camera.x;
    const sy = this.y - camera.y;

    if (sx < -50 || sx > camera.w + 50 || sy < -50 || sy > camera.h + 50) return;

    PixelArt.drawShadow(ctx, sx, sy, 14, 6);

    const key = this.getSpriteKey();
    const sprites = OWNER_SPRITES[key] || OWNER_SPRITES.down_idle;
    const frame = sprites[this.animFrame % sprites.length];

    const colored = frame.map(row => row.map(c => {
      if (c === PAL.SHIRT_BLUE) return this.shirtColor;
      if (c === '#5599cc') return this.shirtColor; // Bh 高光也换色
      return c;
    }));

    // 12x20 sprite at scale 3 = 36x60 px
    if (this.facing === 'left') {
      PixelArt.drawFlipped(ctx, colored, sx - 18, sy - 57);
    } else {
      PixelArt.draw(ctx, colored, sx - 18, sy - 57);
    }

    this._renderLeash(ctx, camera);
    this.pet.render(ctx, camera);
  }

  _renderLeash(ctx, camera) {
    ctx.strokeStyle = PAL.LEASH;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x - camera.x, this.y - camera.y - 10);
    const mx = (this.x + this.pet.x) / 2;
    const my = (this.y + this.pet.y) / 2 + 5;
    ctx.quadraticCurveTo(mx - camera.x, my - camera.y, this.pet.x - camera.x, this.pet.y - camera.y - 6);
    ctx.stroke();
  }
}

class NPCGrandpa {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.state = 'idle';
    this.speed = 0.5;
    this.facing = 'down';
    this.talked = false;
    this.talkBubble = null;
    this.talkTimer = 0;
  }
  update(dt) {
    if (this.talkBubble) {
      this.talkTimer += dt;
      if (this.talkTimer > 3000) {
        this.talkBubble = null;
        this.talkTimer = 0;
      }
    }
  }
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

    PixelArt.drawShadow(ctx, sx, sy, 14, 6);

    PixelArt.draw(ctx, NPC_GRANDPA_SPRITE.down_idle[0], sx - 18, sy - 57);

    if (this.talkBubble) {
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = '10px monospace';
      const tw = ctx.measureText(this.talkBubble).width;
      const bx = sx - tw / 2 - 4;
      const by = sy - 67;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.roundRect(bx, by, tw + 8, 16, 4);
      ctx.fill();
      ctx.fillStyle = '#333';
      ctx.fillText(this.talkBubble, bx + 4, by + 11);
    }
  }
}

class ButterflyEntity {
  constructor(x, y) {
    this.x = x; this.y = y; this.startX = x; this.startY = y;
    this.alive = true; this.life = 12000; this.timer = 0;
    this.wingPhase = 0;
    this.colors = [
      ['#ff9ff3', '#f368e0'], ['#54a0ff', '#2e86de'], ['#feca57', '#ff9f43'], ['#5f27cd', '#341f97'],
    ][Math.floor(Math.random() * 4)];
  }
  update(dt) {
    this.timer += dt; this.life -= dt;
    if (this.life <= 0) { this.alive = false; return; }
    const t = this.timer / 1000;
    this.x = this.startX + Math.sin(t * 0.8) * 60 + Math.sin(t * 2.1) * 15;
    this.y = this.startY + Math.cos(t * 0.6) * 30 - t * 8;
    this.wingPhase = Math.sin(this.timer / 80);
    if (this.y < -50 || this.x < -50 || this.x > GameMap.WIDTH + 50) this.alive = false;
  }
  render(ctx, cam) {
    const sx = this.x - cam.x; const sy = this.y - cam.y;
    if (sx < -20 || sx > cam.w + 20 || sy < -20 || sy > cam.h + 20) return;
    const alpha = Math.min(1, this.life / 1000);
    ctx.globalAlpha = alpha;
    const wingW = 4 * Math.abs(this.wingPhase);
    ctx.fillStyle = this.colors[0];
    ctx.beginPath(); ctx.ellipse(sx - wingW, sy, wingW + 1, 3, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = this.colors[1];
    ctx.beginPath(); ctx.ellipse(sx + wingW, sy, wingW + 1, 3, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#333'; ctx.fillRect(sx - 0.5, sy - 2, 1, 5);
    ctx.globalAlpha = 1;
  }
}

class FrisbeeEntity {
  constructor(x, y) {
    this.x = x; this.y = y; this.alive = true; this.life = 15000; this.timer = 0;
    this.bobPhase = Math.random() * Math.PI * 2;
  }
  update(dt) {
    this.timer += dt; this.life -= dt;
    if (this.life <= 0) { this.alive = false; return; }
    this.bobPhase += dt * 0.003;
  }
  render(ctx, cam) {
    const sx = this.x - cam.x; const sy = this.y - cam.y + Math.sin(this.bobPhase) * 2;
    if (sx < -20 || sx > cam.w + 20 || sy < -20 || sy > cam.h + 20) return;
    const alpha = Math.min(1, this.life / 1000);
    ctx.globalAlpha = alpha;
    const glow = 0.3 + Math.sin(this.timer / 300) * 0.15;
    ctx.fillStyle = `rgba(231,76,60,${glow})`;
    ctx.beginPath(); ctx.arc(sx, sy, 10, 0, Math.PI * 2); ctx.fill();
    PixelArt.drawShadow(ctx, sx, sy + 8, 8, 4);
    PixelArt.draw(ctx, ITEM_SPRITES.frisbee, sx - 10, sy - 7, 3);
    ctx.globalAlpha = 1;
  }
}