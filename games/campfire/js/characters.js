/* ========== Pixel Character System (俯视近景) ========== */
const Characters = {
  list: [],
  player: null,

  palettes: [
    { hair: '#3a2a15', skin: '#e8c090', shirt: '#4a6a9a', pants: '#2a3a5a' },
    { hair: '#1a1a2a', skin: '#d4a878', shirt: '#8a4a4a', pants: '#3a2828' },
    { hair: '#8a5a30', skin: '#f0d0a0', shirt: '#4a8a5a', pants: '#2a4a2a' },
    { hair: '#d4a050', skin: '#e8c898', shirt: '#7a5a8a', pants: '#3a2a4a' },
    { hair: '#5a2020', skin: '#dab890', shirt: '#c87030', pants: '#4a3020' },
    { hair: '#2a3a4a', skin: '#f0c8a0', shirt: '#5a8a8a', pants: '#2a4a4a' },
  ],

  npcNames: ['小林', '阿星', '一只猫', '半夏', '远山', '不倒翁', '暮色', '流萤', '轻风', '无名'],
  idleAnims: ['sit', 'sit', 'sit', 'sit_lean', 'rub_hands', 'poke_fire', 'look_up'],

  init(canvasWidth, canvasHeight) {
    this.w = canvasWidth;
    this.h = canvasHeight;
    this.groundY = canvasHeight * 0.18;
    this.fireCx = canvasWidth / 2;
    this.fireCy = canvasHeight * 0.52;
    this.list = [];
    this.player = this._createCharacter('你', 0, true);
    this.list.push(this.player);
    const npcCount = Utils.randInt(3, 6);
    for (let i = 0; i < npcCount; i++) {
      this.list.push(this._createCharacter(this.npcNames[i % this.npcNames.length], (i+1) % this.palettes.length, false));
    }
    this._assignSeats();
  },

  _createCharacter(name, paletteIdx, isPlayer) {
    return {
      name, palette: this.palettes[paletteIdx], isPlayer,
      x: 0, y: 0, seatX: 0, seatY: 0, seatAngle: 0,
      animState: 'sit', animTimer: 0, animFrame: 0,
      nextAnimChange: Utils.randFloat(3, 12),
      hasAddedWood: false, isCooking: false, cookingFood: null, cookingTimer: 0,
      isWritingNote: false, showAction: null, facing: 1,
      chatBubble: null,
      // 移动系统
      moveTask: null, // { phase:'walk_to'|'action'|'walk_back', targetX, targetY, actionType, actionTimer, actionDuration, callback }
      isWalking: false, walkFrame: 0,
    };
  },

  _assignSeats() {
    const radiusX = 160, radiusY = 110;
    const cx = this.fireCx, cy = this.fireCy;
    this.list.forEach((char, i) => {
      const angle = (i / this.list.length) * Math.PI * 2 + Math.PI * 0.1;
      char.seatAngle = angle;
      char.seatX = cx + Math.cos(angle) * radiusX;
      char.seatY = cy + Math.sin(angle) * radiusY;
      char.x = char.seatX;
      char.y = char.seatY;
      char.facing = char.x > cx ? -1 : 1;
    });
  },

  // 让角色走到篝火旁执行动作再走回
  sendToFire(charName, actionType, duration, callback) {
    const char = this.list.find(c => c.name === charName);
    if (!char || char.moveTask) return;
    // 目标点：篝火附近（偏向角色方向）
    const angle = Math.atan2(char.seatY - this.fireCy, char.seatX - this.fireCx);
    const nearDist = 45; // 离火堆中心的距离
    const targetX = this.fireCx + Math.cos(angle) * nearDist;
    const targetY = this.fireCy + Math.sin(angle) * nearDist;
    char.moveTask = {
      phase: 'walk_to', targetX, targetY,
      actionType, actionTimer: 0, actionDuration: duration,
      callback: callback || null
    };
    char.isWalking = true;
    char.facing = char.x > this.fireCx ? -1 : 1;
  },

  // 让玩家角色移动到画面上的指定位置
  moveToPosition(targetX, targetY) {
    const char = this.player;
    if (!char || char.moveTask) return;
    // 限制移动范围在画面内
    targetX = Math.max(30, Math.min(this.w - 30, targetX));
    targetY = Math.max(this.h * 0.25, Math.min(this.h - 20, targetY));
    // 更新座位位置为新位置
    char.seatX = targetX;
    char.seatY = targetY;
    char.moveTask = {
      phase: 'walk_to', targetX, targetY,
      actionType: 'idle_arrive', actionTimer: 0, actionDuration: 0.01,
      callback: () => {
        char.facing = char.x > this.fireCx ? -1 : 1;
      }
    };
    char.isWalking = true;
    char.facing = targetX > char.x ? 1 : -1;
  },

  // 让角色走到另一个角色身旁执行动作再走回
  sendToChar(charName, targetChar, actionType, duration, callback) {
    const char = this.list.find(c => c.name === charName);
    if (!char || char.moveTask) return;
    const dx = targetChar.x - char.x;
    const nearDist = 25;
    const targetX = targetChar.x - Math.sign(dx) * nearDist;
    const targetY = targetChar.y;
    char.moveTask = {
      phase: 'walk_to', targetX, targetY,
      actionType, actionTimer: 0, actionDuration: duration,
      callback: callback || null
    };
    char.isWalking = true;
    char.facing = dx > 0 ? 1 : -1;
  },

  // 让角色走到指定坐标执行动作（砍树等完成后就地坐下）
  sendToPosition(charName, targetX, targetY, actionType, duration, callback) {
    const char = this.list.find(c => c.name === charName);
    if (!char || char.moveTask) return;
    // 更新座位位置为目标位置，砍完后就地坐下
    char.seatX = targetX;
    char.seatY = targetY;
    char.moveTask = {
      phase: 'walk_to', targetX, targetY,
      actionType, actionTimer: 0, actionDuration: duration,
      callback: callback || null
    };
    char.isWalking = true;
    char.facing = targetX > char.x ? 1 : -1;
  },

  showChatBubble(charName, text, isWhisper) {
    const char = this.list.find(c => c.name === charName);
    if (char) {
      char.chatBubble = {
        text: isWhisper ? '......' : (text.length > 12 ? text.substring(0, 12) + '...' : text),
        timer: isWhisper ? 3 : Math.min(5, 2 + text.length * 0.15),
        isWhisper
      };
    }
  },

  update(dt, time) {
    this.list.forEach(char => {
      // 移动任务
      if (char.moveTask) {
        const task = char.moveTask;
        if (task.phase === 'walk_to') {
          // 走向火堆
          const dx = task.targetX - char.x;
          const dy = task.targetY - char.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          const speed = 80; // px/s
          if (dist < 3) {
            char.x = task.targetX;
            char.y = task.targetY;
            task.phase = 'action';
            task.actionTimer = 0;
            char.isWalking = false;
            // 砍树时保持走路朝向（面向树），其他动作面向篝火
            if (task.actionType !== 'chopWood') {
              char.facing = char.x > this.fireCx ? -1 : 1;
            }
          } else {
            char.x += (dx/dist) * speed * dt;
            char.y += (dy/dist) * speed * dt;
            char.walkFrame += dt * 6;
            char.facing = dx > 0 ? 1 : -1;
          }
        } else if (task.phase === 'action') {
          // 执行动作
          task.actionTimer += dt;
          char.animState = task.actionType === 'idle_arrive' ? 'sit' : task.actionType;
          if (task.actionTimer >= task.actionDuration) {
            if (task.callback) task.callback();
            if (task.actionType === 'idle_arrive' || task.actionType === 'chopWood') {
              // 就地坐下，不走回
              char.moveTask = null;
              char.isWalking = false;
              char.animState = 'sit';
              char.facing = char.x > this.fireCx ? -1 : 1;
            } else {
              task.phase = 'walk_back';
              char.isWalking = true;
              char.facing = char.seatX > char.x ? 1 : -1;
            }
          }
        } else if (task.phase === 'walk_back') {
          // 走回座位
          const dx = char.seatX - char.x;
          const dy = char.seatY - char.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          const speed = 80;
          if (dist < 3) {
            char.x = char.seatX;
            char.y = char.seatY;
            char.moveTask = null;
            char.isWalking = false;
            char.animState = 'sit';
            char.facing = char.x > this.fireCx ? -1 : 1;
          } else {
            char.x += (dx/dist) * speed * dt;
            char.y += (dy/dist) * speed * dt;
            char.walkFrame += dt * 6;
            char.facing = dx > 0 ? 1 : -1;
          }
        }
      } else {
        // 正常idle
        char.animTimer += dt;
        if (char.animTimer > char.nextAnimChange) {
          char.animTimer = 0;
          char.nextAnimChange = Utils.randFloat(4, 15);
          if (!char.isCooking && !char.isWritingNote) {
            char.animState = Utils.pick(this.idleAnims);
            char.animFrame = 0;
          }
        }
      }
      char.animFrame += dt * 2;

      if (char.isCooking) {
        char.cookingTimer += dt;
        if (char.cookingTimer > 30) {
          char.isCooking = false;
          char.cookingTimer = 0;
          if (char.isPlayer) { Utils.notify('🍢 食物烤好了！'); Fire.stats.foodCooked++; }
        }
      }
      if (char.showAction) { char.showAction.timer -= dt; if (char.showAction.timer <= 0) char.showAction = null; }
      if (char.chatBubble) { char.chatBubble.timer -= dt; if (char.chatBubble.timer <= 0) char.chatBubble = null; }
    });
  },

  draw(ctx, time, fireIntensity, ambient) {
    const ps = 5;
    const sorted = [...this.list].sort((a, b) => a.y - b.y);
    sorted.forEach(char => this._drawCharacter(ctx, char, time, ps, fireIntensity, ambient));
  },

  drawBehindFire(ctx, time, fireIntensity, fireCy, ambient) {
    const ps = 5;
    const behind = [...this.list].filter(c => c.y < fireCy).sort((a, b) => a.y - b.y);
    behind.forEach(char => this._drawCharacter(ctx, char, time, ps, fireIntensity, ambient));
  },

  drawInFrontOfFire(ctx, time, fireIntensity, fireCy, ambient) {
    const ps = 5;
    const front = [...this.list].filter(c => c.y >= fireCy).sort((a, b) => a.y - b.y);
    front.forEach(char => this._drawCharacter(ctx, char, time, ps, fireIntensity, ambient));
  },

  _drawCharacter(ctx, char, time, ps, fireIntensity, ambient) {
    const x = Math.floor(char.x), y = Math.floor(char.y);
    const pal = char.palette, f = char.facing;
    const dx = char.x - this.fireCx, dy = char.y - this.fireCy;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const fireLightAlpha = Math.max(0, (1 - dist / 280)) * fireIntensity * 0.4;
    const bodyY = y;
    const task = char.moveTask;
    const isAction = task && task.phase === 'action';
    const actionProgress = isAction ? task.actionTimer / task.actionDuration : 0;

    // 阴影系统：白天=太阳方向，夜间=篝火方向，混合过渡
    const br = ambient ? ambient.brightness : 0.5;
    let shadowOffX, shadowOffY, baseShadowAlpha, shadowStretch;

    if (br > 0.3 && ambient) {
      // 白天太阳阴影：太阳在上方，阴影向反方向投射到地面
      const sunScreenX = ambient.sunNx * this.w;
      const sunScreenY = ambient.sunNy * this.h;
      const toSunX = sunScreenX - x;
      const toSunY = sunScreenY - y;
      const toSunDist = Math.sqrt(toSunX * toSunX + toSunY * toSunY);
      const sunDirX = toSunDist > 1 ? toSunX / toSunDist : 0;
      const sunDirY = toSunDist > 1 ? toSunY / toSunDist : -1;
      // 阴影反向太阳方向
      shadowStretch = 1.2 + (1 - Math.abs(ambient.sunNy)) * 0.8; // 太阳越低影子越长
      shadowOffX = -sunDirX * 8 * shadowStretch;
      shadowOffY = Math.max(3, -sunDirY * 5 * shadowStretch + 3);
      baseShadowAlpha = 0.12 + br * 0.1;
    } else {
      // 夜间篝火阴影
      const fireDx = x - this.fireCx;
      const fireDy = y - this.fireCy;
      const fireDist = Math.sqrt(fireDx * fireDx + fireDy * fireDy);
      const fireDir = fireDist > 1 ? { x: fireDx / fireDist, y: fireDy / fireDist } : { x: 0, y: 1 };
      shadowStretch = (1 + fireIntensity * 1.2) * Math.min(1.5, 200 / Math.max(80, fireDist));
      shadowOffX = fireDir.x * 6 * shadowStretch;
      shadowOffY = Math.max(2, fireDir.y * 4 * shadowStretch + 2);
      baseShadowAlpha = 0.1 + fireIntensity * 0.15;
    }

    // 混合：黄昏/黎明时两种阴影混合
    ctx.save();
    const shadowCx = x + 2 + shadowOffX;
    const shadowCy = bodyY + ps * 3.5 + shadowOffY;
    const shadowRx = ps * 3.2 + shadowStretch * 2;
    const shadowRy = ps * 1.5 + shadowStretch * 0.6;
    const shadowGrad = ctx.createRadialGradient(shadowCx, shadowCy, 0, shadowCx, shadowCy, shadowRx);
    shadowGrad.addColorStop(0, `rgba(0, 0, 0, ${baseShadowAlpha})`);
    shadowGrad.addColorStop(0.6, `rgba(0, 0, 0, ${baseShadowAlpha * 0.5})`);
    shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(shadowCx, shadowCy, shadowRx, shadowRy, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 身体前倾（执行动作时）
    let torsoOffsetY = 0;
    if (isAction) {
      torsoOffsetY = Math.sin(actionProgress * Math.PI) * 8;
    }

    // 坐下时身体整体下沉
    const isSitting = !char.isWalking && !isAction;
    const sitDrop = isSitting ? 10 : 0; // 坐下时身体下移10像素

    // 腿 - 走路时交替迈步，坐着时盘腿（水平展开）
    ctx.fillStyle = pal.pants;
    if (char.isWalking) {
      // 站立行走——双腿在身体正下方交替
      const step = Math.sin(char.walkFrame) * 5;
      ctx.fillRect(x - 4, bodyY + 2 + step, ps, ps * 2.5);
      ctx.fillRect(x + 2, bodyY + 2 - step, ps, ps * 2.5);
      // 鞋子
      ctx.fillStyle = '#2a2218';
      ctx.fillRect(x - 5, bodyY + 2 + ps * 2.5 + step, ps + 2, 3);
      ctx.fillRect(x + 1, bodyY + 2 + ps * 2.5 - step, ps + 2, 3);
    } else {
      // 盘腿坐下——腿水平展开，比站立矮很多
      const legY = bodyY + sitDrop;
      // 左腿横向盘出
      ctx.fillRect(x - 12 * f, legY + 2, ps * 3, ps);
      ctx.fillRect(x - 14 * f, legY + ps, ps * 2, ps);
      // 右腿横向盘出
      ctx.fillRect(x + 5 * f, legY + 2, ps * 3, ps);
      ctx.fillRect(x + 8 * f, legY + ps, ps * 2, ps);
    }

    // 躯干——坐下时下沉
    ctx.fillStyle = pal.shirt;
    const trunkY = bodyY - (isSitting ? ps * 3 - sitDrop : ps * 3) - torsoOffsetY;
    ctx.fillRect(x - ps, trunkY, ps * 3, ps * 3);
    ctx.fillRect(x - ps - 2, trunkY + ps, ps * 3 + 4, ps * 2);

    // 手臂 - armY 基于躯干位置
    const armY = trunkY + ps;
    if (isAction && task.actionType === 'addWood') {
      const reach = Math.sin(actionProgress * Math.PI) * 20;
      ctx.fillStyle = pal.skin;
      ctx.fillRect(x + f * (8 + reach), armY + 4, ps, ps);
      ctx.fillRect(x + f * (6 + reach), armY + 6, ps, ps);
      if (actionProgress < 0.5) {
        ctx.fillStyle = '#5a3a18';
        ctx.fillRect(x + f * (12 + reach), armY, ps*4, ps);
        ctx.fillStyle = '#4a2a10';
        ctx.fillRect(x + f * (12 + reach), armY + 1, ps*4, 3);
      }
    } else if (isAction && task.actionType === 'throwNote') {
      // 扔纸条到篝火
      const arc = Math.sin(actionProgress * Math.PI);
      ctx.fillStyle = pal.skin;
      ctx.fillRect(x + f * (8 + arc * 20), armY + 4 - arc * 12, ps, ps);
      if (actionProgress < 0.45) {
        ctx.fillStyle = '#fef9e0';
        ctx.fillRect(x + f * (12 + arc * 20), armY + 2 - arc * 12, 7, 5);
      } else {
        const fly = (actionProgress - 0.45) / 0.55;
        const nx = Utils.lerp(x, this.fireCx, fly);
        const ny = Utils.lerp(armY - 10, this.fireCy - 10, fly) - Math.sin(fly * Math.PI) * 20;
        ctx.fillStyle = `rgba(254, 249, 224, ${1 - fly})`;
        ctx.fillRect(nx, ny, 7 * (1-fly*0.5), 5 * (1-fly*0.5));
      }
      ctx.fillStyle = pal.skin;
      ctx.fillRect(x - f * 10, armY + 6, ps, ps);
    } else if (isAction && task.actionType === 'giveNote') {
      // 递纸条给别人 — 手向前伸出递交
      const reach = Math.sin(actionProgress * Math.PI) * 18;
      ctx.fillStyle = pal.skin;
      ctx.fillRect(x + f * (8 + reach), armY + 2, ps, ps);
      ctx.fillRect(x + f * (6 + reach), armY + 4, ps, ps);
      if (actionProgress < 0.7) {
        ctx.fillStyle = '#fef9e0';
        ctx.fillRect(x + f * (12 + reach), armY + 1, 7, 5);
      }
      ctx.fillStyle = pal.skin;
      ctx.fillRect(x - f * 8, armY + 6, ps, ps);
    } else if (isAction && task.actionType === 'startCook') {
      const reach = Math.sin(actionProgress * Math.PI) * 15;
      ctx.fillStyle = pal.skin;
      ctx.fillRect(x + f * (10 + reach), armY + 5, ps, ps);
      ctx.fillRect(x - f * 8, armY + 6, ps, ps);
    } else if (isAction && task.actionType === 'digAsh') {
      const dig = Math.sin(actionProgress * Math.PI * 3) * 6;
      ctx.fillStyle = pal.skin;
      ctx.fillRect(x + f * 6 + dig, armY + 12, ps, ps);
      ctx.fillRect(x - f * 2 - dig, armY + 12, ps, ps);
    } else if (isAction && task.actionType === 'chopWood') {
      // 砍树：双手举起劈下的循环动作
      const chop = Math.sin(actionProgress * Math.PI * 6); // 多次挥砍
      const armUp = Math.max(0, chop) * 18;
      ctx.fillStyle = pal.skin;
      ctx.fillRect(x + f * 8, armY - armUp, ps, ps);
      ctx.fillRect(x + f * 6, armY + 2 - armUp, ps, ps);
      // 另一只手握住
      ctx.fillRect(x + f * 4, armY + 4 - armUp * 0.5, ps, ps);
    } else if (char.isWalking) {
      const swing = Math.sin(char.walkFrame) * 4;
      ctx.fillStyle = pal.skin;
      ctx.fillRect(x - 10 - swing, armY + 6, ps, ps);
      ctx.fillRect(x + 8 + swing, armY + 6, ps, ps);
    } else if (char.animState === 'rub_hands') {
      const rub = Math.sin(char.animFrame * 6) * 3;
      ctx.fillStyle = pal.skin;
      ctx.fillRect(x - 3 + rub, armY + 8, ps*2, ps);
    } else if (char.animState === 'poke_fire') {
      ctx.fillStyle = pal.skin;
      ctx.fillRect(x + f * 14, armY + 6, ps, ps);
      ctx.fillStyle = '#5a4030';
      ctx.fillRect(x + f * 18, armY + 5, ps*3, 2);
    } else {
      ctx.fillStyle = pal.skin;
      ctx.fillRect(x - 12, armY + 6, ps, ps);
      ctx.fillRect(x + 9, armY + 6, ps, ps);
    }

    // 头
    const headY = trunkY - ps * 2 - 2;
    ctx.fillStyle = pal.skin;
    ctx.fillRect(x - ps, headY, ps*3, ps*2);
    ctx.fillRect(x - 3, headY - ps + 2, ps*2 + 1, ps);

    // 头发
    ctx.fillStyle = pal.hair;
    ctx.fillRect(x - ps - 2, headY - ps + 2, ps*3 + 4, ps);
    ctx.fillRect(x - ps - 2, headY, ps, ps*2);
    if (f === 1) ctx.fillRect(x + ps*2 + 2, headY + 2, ps, ps);
    else ctx.fillRect(x - ps - 3, headY + 2, ps, ps);

    // 眼睛
    const blink = Math.sin(time * 0.001 + char.seatAngle * 3) > 0.95;
    if (!blink) {
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(x, headY + ps - 2, 2, 2);
      ctx.fillRect(x + ps + 1, headY + ps - 2, 2, 2);
    }

    // 火光叠加
    if (fireLightAlpha > 0) {
      ctx.fillStyle = `rgba(255, 140, 40, ${fireLightAlpha})`;
      ctx.fillRect(x - ps - 2, headY - ps + 2, ps*3 + 6, trunkY + ps * 3 - headY + ps);
    }

    // 烤食物
    if (char.isCooking && !isAction) {
      const foodEmoji = this._getCookEmoji(char.cookingFood);
      const fx = x + f * 18, fy = armY + 4;
      ctx.font = '14px serif';
      ctx.fillText(foodEmoji, fx, fy);
      const progress = Math.min(1, char.cookingTimer / 30);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(fx - 2, fy + 6, 22, 4);
      ctx.fillStyle = progress < 0.8 ? '#ff9933' : '#ff3333';
      ctx.fillRect(fx - 2, fy + 6, 22 * progress, 4);
    }

    // 状态图标
    if (char.showAction && !char.chatBubble) {
      const bx = x, by = headY - ps * 2;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.beginPath(); ctx.arc(bx+5, by, 14, 0, Math.PI*2); ctx.fill();
      ctx.font = '14px sans-serif'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
      ctx.fillText(char.showAction.type === 'note' ? '✍️' : '💭', bx+5, by+5);
      ctx.textAlign = 'left';
    }

    // 聊天气泡
    if (char.chatBubble) this._drawChatBubble(ctx, char, x, headY - ps - 4);

    // 名字
    ctx.font = '12px sans-serif';
    ctx.fillStyle = char.isPlayer ? 'rgba(255, 220, 120, 0.85)' : 'rgba(200, 200, 200, 0.55)';
    ctx.textAlign = 'center';
    ctx.fillText(char.name, x + 3, bodyY + sitDrop + ps * 2 + 14);
    ctx.textAlign = 'left';
  },

  _getCookEmoji(food) {
    const map = { marshmallow:'🍡', sweetpotato:'🍠', sausage:'🌭', corn:'🌽', shrimp:'🦐', chicken:'🍗', mushroom:'🍄', squid:'🦑' };
    return map[food] || '🍢';
  },

  _drawChatBubble(ctx, char, cx, topY) {
    const text = char.chatBubble.text;
    const isWhisper = char.chatBubble.isWhisper;
    const fadeAlpha = Math.min(1, char.chatBubble.timer * 2);
    ctx.font = '11px sans-serif';
    const tw = ctx.measureText(text).width;
    const padX = 8, padY = 5, bw = tw + padX*2, bh = 18 + padY;
    const bx = cx - bw/2 + 3, by = topY - bh - 4;
    ctx.globalAlpha = fadeAlpha;
    ctx.fillStyle = isWhisper ? 'rgba(100,70,150,0.8)' : 'rgba(0,0,0,0.65)';
    const r = 8;
    ctx.beginPath();
    ctx.moveTo(bx+r,by); ctx.lineTo(bx+bw-r,by);
    ctx.quadraticCurveTo(bx+bw,by,bx+bw,by+r); ctx.lineTo(bx+bw,by+bh-r);
    ctx.quadraticCurveTo(bx+bw,by+bh,bx+bw-r,by+bh); ctx.lineTo(bx+r,by+bh);
    ctx.quadraticCurveTo(bx,by+bh,bx,by+bh-r); ctx.lineTo(bx,by+r);
    ctx.quadraticCurveTo(bx,by,bx+r,by); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx,topY-2); ctx.lineTo(cx-5,by+bh); ctx.lineTo(cx+5,by+bh); ctx.fill();
    ctx.fillStyle = isWhisper ? 'rgba(200,180,255,0.9)' : '#fff';
    ctx.textAlign = 'center'; ctx.fillText(text, cx+3, by+bh-padY-1); ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  },

  getNeighbors() {
    if (!this.player) return [];
    return this.list.filter(c => {
      if (c === this.player) return false;
      const dx = c.x - this.player.x, dy = c.y - this.player.y;
      return Math.sqrt(dx*dx + dy*dy) < 140;
    });
  }
};
