/* ========== Game Logic ========== */
const Game = {
  playerWoodUsed: false,
  leaveWood: 0,
  previousMessages: [],
  _npcTarget: null,

  // 烧烤系统
  cookingActive: false,
  cookProgress: 0, // 0~1
  cookSpeed: 0,
  cookFood: null,
  // 每种食物的最佳区间 [min, max]，speed 模拟真实烧烤时间
  cookZones: {
    marshmallow: { min: 0.3, max: 0.55, speed: 0.006,  emoji: '🍡', name: '棉花糖' },   // ~30s 棉花糖烤得快
    sweetpotato: { min: 0.4, max: 0.65, speed: 0.002,  emoji: '🍠', name: '红薯' },     // ~90s 红薯需要慢烤
    sausage:     { min: 0.35, max: 0.6,  speed: 0.004,  emoji: '🌭', name: '香肠' },     // ~45s
    corn:        { min: 0.35, max: 0.6,  speed: 0.003,  emoji: '🌽', name: '玉米' },     // ~60s
    shrimp:      { min: 0.3, max: 0.5,  speed: 0.005,  emoji: '🦐', name: '大虾' },     // ~35s 虾容易老
    chicken:     { min: 0.4, max: 0.7,  speed: 0.0025, emoji: '🍗', name: '鸡腿' },     // ~70s 鸡腿要烤透
    mushroom:    { min: 0.25, max: 0.55, speed: 0.005,  emoji: '🍄', name: '蘑菇' },     // ~35s
    squid:       { min: 0.3, max: 0.55, speed: 0.004,  emoji: '🦑', name: '鱿鱼' },     // ~45s
  },

  init() {
    this._bindSceneActions();
    this._bindCanvasClick();
    this._bindCookHud();
    this._bindNpcPanel();
  },

  _bindSceneActions() {
    // 添柴面板事件（由点击篝火触发）
    document.getElementById('wood-cancel').addEventListener('click', () => {
      document.getElementById('wood-panel').classList.add('hidden');
    });
    document.getElementById('wood-confirm').addEventListener('click', () => {
      document.getElementById('wood-panel').classList.add('hidden');
      AudioManager.ensureContext();
      const woods = Backpack.getWoodItems();
      if (woods.length === 0) { Utils.notify('背包里没有柴火了'); return; }
      Backpack.removeItem(woods[0].id);
      if (Characters.player.isDancing) Characters.stopDancing('你');
      Chat.addSystemMessage('你站起身，拿了一根柴走向篝火...');
      Characters.sendToFire('你', 'addWood', 1.8, () => {
        Fire.addWood('你');
        AudioManager.playAddWood();
        AudioManager.startFireCrackle(Fire.intensity);
        if (Fire.stats.totalWood === 1) {
          Chat.addSystemMessage('🔥 你点燃了篝火！火焰在黑暗中跳动起来。');
          Utils.notify('你成为了这堆火的"点火人"🔥');
          this._showPreviousNotes();
          setTimeout(() => {
            const npc = Utils.pick(Characters.list.filter(c => !c.isPlayer));
            if (npc) Chat.addMessage(npc.name, '哇，火燃起来了！', 'other');
          }, 2000);
        } else {
          Chat.addSystemMessage('🪵 你往篝火里添了一根柴，火焰更旺了。');
        }
      });
    });

    // 写纸条 — 只有篝火燃烧时才能写
    document.getElementById('btn-write-note').addEventListener('click', () => {
      if (Fire.state !== 'burning') { Utils.notify('篝火没有燃烧，写了也烧不了'); return; }
      document.getElementById('note-panel').classList.remove('hidden');
      Characters.player.isWritingNote = true;
      Characters.player.showAction = { type: 'note', timer: 999 };
      Chat.addSystemMessage('你正在写一张小纸条...');
    });
    document.getElementById('note-cancel').addEventListener('click', () => {
      document.getElementById('note-panel').classList.add('hidden');
      Characters.player.isWritingNote = false;
      Characters.player.showAction = null;
    });
    document.getElementById('note-burn').addEventListener('click', () => {
      const text = document.getElementById('note-input').value.trim();
      if (!text) { Utils.notify('写点什么吧...'); return; }
      document.getElementById('note-panel').classList.add('hidden');
      document.getElementById('note-input').value = '';
      Characters.player.isWritingNote = false;
      Characters.player.showAction = null;
      if (Characters.player.moveTask) return;
      Chat.addSystemMessage('你拿着纸条走向篝火...');
      Characters.sendToFire('你', 'throwNote', 1.5, () => {
        Interactions.triggerBurnNote(Fire.cx, Fire.cy - 15);
        AudioManager.playBurnNote();
        Fire.stats.notesBurned++;
        Chat.addSystemMessage('📝 纸条丢进了火里... 火焰微微变色，星火飘起。');
        Utils.notify('纸条化为灰烬，心事随烟散去');
      });
    });

    // 烤食物 - 从背包选择食材
    document.getElementById('btn-cook').addEventListener('click', () => {
      if (Fire.state !== 'burning') { Utils.notify('篝火没有燃烧'); return; }
      if (this.cookingActive) { Utils.notify('你正在烤食物...'); return; }
      if (Characters.player.moveTask) { Utils.notify('你正在忙...'); return; }
      if (Backpack.getFoodItems().length === 0) {
        Utils.notify('背包里没有食材，等小动物送来吧！');
        return;
      }
      Backpack.open('cook');
    });

    // 跳舞
    document.getElementById('btn-dance').addEventListener('click', () => {
      const player = Characters.player;
      if (player.isDancing) {
        // 已在跳舞，停止
        Characters.stopDancing('你');
        Chat.addSystemMessage('你停下了舞步，坐回原处。');
        Utils.notify('💃 休息一下~');
        return;
      }
      if (player.moveTask || player.isCooking) { Utils.notify('你正在忙...'); return; }
      Characters.startDancing('你');
      Chat.addSystemMessage('💃 你站起身，开始围着篝火跳舞！');
      Chat.addMessage('你', '💃 来跳舞呀！', 'self');
      // 随机1~2个NPC加入跳舞
      setTimeout(() => {
        const idle = Characters.list.filter(c => !c.isPlayer && !c.isDancing && !c.moveTask && !c.isCooking);
        const joinCount = Math.min(idle.length, Utils.randInt(1, 2));
        for (let i = 0; i < joinCount; i++) {
          const npc = idle[i];
          Characters.startDancing(npc.name);
          Chat.addMessage(npc.name, Utils.pick(['哈哈，我也来！', '跳起来！', '转圈圈～']), 'other');
        }
        if (joinCount > 0) Chat.addSystemMessage(`🎶 ${joinCount}位伙伴加入了跳舞！`);
      }, 1500);
    });

    // 点歌
    document.getElementById('btn-music').addEventListener('click', () => {
      AudioManager.ensureContext();
      const songs = ['一首安静的歌', '篝火旁的旋律', '星空下的小调', '温暖的哼唱', '远方的歌'];
      const song = Utils.pick(songs);
      Chat.addMessage('你', `🎵 点了一首《${song}》`, 'self');
      Utils.notify(`🎵 《${song}》正在播放...`);
      this._playSimpleMelody();
    });

    // 篝火故事
    document.getElementById('btn-leave-wood').addEventListener('click', () => {
      this.leaveWood++;
      Utils.notify('你留下了一根柴 🪵');
      document.getElementById('btn-leave-wood').classList.add('disabled');
    });
    document.getElementById('btn-leave-msg').addEventListener('click', () => {
      const msg = document.getElementById('leave-message').value.trim();
      if (msg) this.previousMessages.push({ text: msg, time: Date.now() });
      document.getElementById('story-popup').classList.add('hidden');
      Chat.addSystemMessage('你起身离开了篝火旁。');
      setTimeout(() => this._resetForNewRound(), 3000);
    });
    document.getElementById('treasure-close').addEventListener('click', () => {
      document.getElementById('treasure-popup').classList.add('hidden');
    });
    document.getElementById('animal-popup-close').addEventListener('click', () => {
      document.getElementById('animal-popup').classList.add('hidden');
    });

    // 退出按钮
    document.getElementById('btn-leave').addEventListener('click', () => {
      document.getElementById('app').classList.add('hidden');
      document.getElementById('lobby').classList.remove('hidden');
    });
  },

  // 烧烤系统
  _startCooking(food) {
    const zone = this.cookZones[food];
    this.cookingActive = true;
    this.cookProgress = 0;
    this.cookSpeed = zone.speed;
    this.cookFood = food;

    // 显示 HUD
    document.getElementById('cook-hud').classList.remove('hidden');
    document.getElementById('cook-hud-emoji').textContent = zone.emoji;
    const zoneEl = document.getElementById('cook-hud-zone');
    zoneEl.style.left = (zone.min * 100) + '%';
    zoneEl.style.width = ((zone.max - zone.min) * 100) + '%';
    document.getElementById('cook-hud-fill').style.width = '0%';

    AudioManager.startCooking();
    Chat.addSystemMessage(`开始烤${zone.name}... 注意进度条，在绿色区间取出最完美！`);

    // 角色留在篝火旁（不走回）
    Characters.player.isCooking = true;
    Characters.player.cookingFood = food;
  },

  _bindCookHud() {
    document.getElementById('btn-cook-done').addEventListener('click', () => {
      if (!this.cookingActive) return;
      this._finishCooking();
    });
  },

  _finishCooking() {
    const food = this.cookFood;
    const zone = this.cookZones[food];
    const progress = this.cookProgress;

    this.cookingActive = false;
    document.getElementById('cook-hud').classList.add('hidden');
    AudioManager.stopCooking();
    Characters.player.isCooking = false;
    Fire.stats.foodCooked++;

    // 判断烤制水平
    let result, emoji, quality;
    if (progress < zone.min * 0.6) {
      result = '还是生的...'; emoji = '🥶'; quality = '生的';
    } else if (progress < zone.min) {
      result = '有点夹生'; emoji = '😐'; quality = '夹生';
    } else if (progress <= zone.max) {
      result = '烤得完美！金黄酥脆！'; emoji = '🤩'; quality = '完美';
    } else if (progress < zone.max + 0.15) {
      result = '稍微有点焦，但还能吃'; emoji = '😅'; quality = '微焦';
    } else {
      result = '烤糊了...变成炭了'; emoji = '💀'; quality = '烤糊了';
    }

    // 烤好的食物存入背包
    Backpack.addItem({
      type: 'cooked', name: `${zone.name}(${quality})`, emoji: zone.emoji,
      desc: `${result}`, quality
    });

    Chat.addSystemMessage(`${zone.emoji} ${zone.name}取出来了！${emoji} ${result} — 已存入背包`);
    Utils.notify(`${emoji} ${result}`);

    // NPC 反应
    setTimeout(() => {
      const npc = Utils.pick(Characters.list.filter(c => !c.isPlayer));
      if (npc) {
        const reactions = progress <= zone.max && progress >= zone.min
          ? ['看起来好好吃！', '完美的烤色！', '给我也来一口！']
          : ['呃...这个...', '下次会更好的', '我闻到了焦味'];
        Chat.addMessage(npc.name, Utils.pick(reactions), 'other');
      }
    }, 1500);
  },

  // 每帧更新烧烤进度
  updateCooking(dt) {
    if (!this.cookingActive) return;
    this.cookProgress += this.cookSpeed * dt * 60; // 归一化到 60fps
    if (this.cookProgress > 1) this.cookProgress = 1;
    document.getElementById('cook-hud-fill').style.width = (this.cookProgress * 100) + '%';
    // 烤糊自动停止
    if (this.cookProgress >= 1) {
      this._finishCooking();
    }
  },

  // Canvas 点击处理（翻灰烬 + 小动物）
  _bindCanvasClick() {
    const canvas = document.getElementById('scene-canvas');
    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      // 关闭打开的面板
      document.getElementById('npc-panel').classList.add('hidden');

      // 检查小动物点击
      const drop = Interactions.checkAnimalClick(clickX, clickY);
      if (drop) {
        document.getElementById('animal-popup-icon').textContent = drop.emoji;
        document.getElementById('animal-popup-text').textContent = drop.desc;
        document.getElementById('animal-popup').classList.remove('hidden');
        // 存入背包
        const bpItem = { type: drop.type, name: drop.name, emoji: drop.emoji, desc: drop.desc };
        // 食材类需要带 cookKey 以便烧烤
        if (drop.type === 'food') {
          const foodKeyMap = {
            '野蘑菇': 'mushroom', '松果': 'sweetpotato', '野莓': 'mushroom',
            '小坚果': 'corn'
          };
          bpItem.cookKey = foodKeyMap[drop.name] || 'marshmallow';
        }
        Backpack.addItem(bpItem);
        Chat.addSystemMessage(`${drop.emoji} 你获得了：${drop.name} — 已存入背包`);
        return;
      }

      // 点击正在跳舞的角色 — 加入跳舞
      const player = Characters.player;
      if (!player.isDancing && !player.moveTask && !player.isCooking) {
        const dancers = Characters.getDancers();
        if (dancers.length > 0) {
          const ps = 5;
          for (const dancer of dancers) {
            const dcx = Math.floor(dancer.x), dcy = Math.floor(dancer.y);
            if (clickX >= dcx - 20 && clickX <= dcx + 25 &&
                clickY >= dcy - 35 && clickY <= dcy + 20) {
              Characters.startDancing('你');
              Chat.addSystemMessage(`💃 你加入了 ${dancer.name} 的舞蹈！`);
              Chat.addMessage(dancer.name, Utils.pick(['欢迎加入！', '一起跳！', '太棒了！']), 'other');
              return;
            }
          }
        }
      }

      // 点击篝火区域 — 弹出加柴面板
      const dx = clickX - Fire.cx;
      const dy = clickY - Fire.cy;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < 65) {
        if (Characters.player.moveTask) return;

        // 篝火状态描述
        const iconEl = document.getElementById('wood-fire-icon');
        const statusEl = document.getElementById('wood-fire-status');
        const timeEl = document.getElementById('wood-fire-time');

        if (Fire.state === 'ash') {
          iconEl.textContent = '🪹';
          statusEl.textContent = '篝火已经熄灭了';
          // 上次燃烧时间
          const lastTime = Fire.lastDiedTime || Fire.stats.startTime;
          if (lastTime) {
            const ago = Math.floor((Date.now() - lastTime) / 1000);
            if (ago < 60) timeEl.textContent = `${ago} 秒前熄灭`;
            else if (ago < 3600) timeEl.textContent = `${Math.floor(ago / 60)} 分钟前熄灭`;
            else timeEl.textContent = `${Math.floor(ago / 3600)} 小时前熄灭`;
          } else {
            timeEl.textContent = '还没有人点燃过这堆篝火';
          }
        } else if (Fire.state === 'burning') {
          iconEl.textContent = '🔥';
          const m = Math.floor(Fire.remainingTime / 60);
          const s = Math.floor(Fire.remainingTime % 60);
          statusEl.textContent = '篝火正在燃烧';
          timeEl.textContent = `剩余燃烧时间 ${m}:${s.toString().padStart(2, '0')}`;
        } else {
          iconEl.textContent = '🕯️';
          statusEl.textContent = '篝火即将熄灭...';
          timeEl.textContent = '快添柴火！';
        }

        // 柴火数量
        const woods = Backpack.getWoodItems();
        const countEl = document.getElementById('wood-count-text');
        if (woods.length > 0) {
          countEl.textContent = `你有 ${woods.length} 根柴火，要添一根吗？`;
        } else {
          countEl.textContent = '你没有柴火了，去砍树吧';
        }
        document.getElementById('wood-confirm').style.display = woods.length > 0 ? '' : 'none';
        document.getElementById('wood-panel').classList.remove('hidden');
        return;
      }

      // 点击树木 — 走到树旁边再砍树获取柴火
      const treeHit = Sky.checkTreeClick(clickX, clickY);
      if (treeHit && !Characters.player.moveTask && !Characters.player.isCooking) {
        Chat.addSystemMessage('🪓 你朝一棵树走去...');
        Characters.sendToPosition('你', treeHit.walkX, treeHit.walkY, 'chopWood', 3, () => {
          Backpack.addItem({ type: 'wood', name: '柴火', emoji: '🪵', desc: '你从树上砍下的一根柴。' });
          Utils.notify('🪵 获得了一根柴火！');
          Chat.addSystemMessage('🪵 砍好了一根柴火 — 已存入背包');
          AudioManager.ensureContext();
          AudioManager.playAddWood();
        });
        return;
      }

      // 点击NPC — 弹出互动面板
      const npc = this._checkNpcClick(clickX, clickY);
      if (npc) {
        this._openNpcPanel(npc);
        return;
      }

      // 点击空地 - 玩家角色走到点击位置
      if (!Characters.player.moveTask && !Characters.player.isCooking) {
        if (Characters.player.isDancing) {
          Characters.stopDancing('你');
        }
        Characters.moveToPosition(clickX, clickY);
      }
    });
  },

  onFireDied() {
    AudioManager.stopFireCrackle();
    AudioManager.stopCooking();
    if (this.cookingActive) this._finishCooking();
    // 停止所有跳舞
    Characters.list.forEach(c => { if (c.isDancing) Characters.stopDancing(c.name); });
    Chat.addSystemMessage('🕯️ 篝火慢慢暗下去了...');
    setTimeout(() => {
      Chat.addSystemMessage('💡 点击灰烬堆可以翻找宝藏...');
      document.getElementById('story-text').innerHTML = Fire.generateStory();
      document.getElementById('story-popup').classList.remove('hidden');
    }, 3000);
  },

  _resetForNewRound() {
    Fire.stats = { lighter: null, woodAdders: [], totalWood: 0, notesBurned: 0, meteorsSeen: 0, foodCooked: 0, animalVisits: 0, startTime: null };
    Chat.addSystemMessage('灰烬沉默着，等待下一个点火的人。');
    if (this.previousMessages.length > 0) {
      setTimeout(() => {
        const msg = Utils.pick(this.previousMessages);
        Chat.addSystemMessage(`💬 留言板上写着："${msg.text}"`);
      }, 5000);
    }
  },

  // NPC纸条回复
  _npcNoteReply(name) {
    Characters.showChatBubble(name, '', true);
    setTimeout(() => {
      const replies = ['谢谢你的纸条 ☺️', '收到了...', '看到了，嘿嘿', '纸条好温暖', '（小心收好了）'];
      const msg = Utils.pick(replies);
      Chat.addMessage(name, msg, 'other');
      Characters.showChatBubble(name, msg, false);
    }, 2000);
  },

  // 点燃篝火时展示上次留言
  _showPreviousNotes() {
    if (this.previousMessages.length === 0) return;
    // 延迟一点展示，给点燃动画一些时间
    const msgs = this.previousMessages.slice(-3); // 最多展示3条
    msgs.forEach((msg, i) => {
      setTimeout(() => {
        Chat.addSystemMessage(`📜 上次留下的纸条：「${msg.text}」`);
      }, 3000 + i * 2000);
    });
  },

  // 从背包发起烧烤
  _startCookFromBackpack(foodKey) {
    const zone = this.cookZones[foodKey];
    if (!zone) { Utils.notify('未知食材'); return; }
    Chat.addSystemMessage(`你拿起${zone.name}走向篝火...`);
    Characters.sendToFire('你', 'startCook', 1.0, () => {
      this._startCooking(foodKey);
    });
  },

  // NPC 互动面板
  _bindNpcPanel() {
    document.getElementById('npc-panel-close').addEventListener('click', () => {
      document.getElementById('npc-panel').classList.add('hidden');
    });
    // 说悄悄话
    document.getElementById('npc-whisper').addEventListener('click', () => {
      document.getElementById('npc-panel').classList.add('hidden');
      const name = this._npcTarget;
      const target = Characters.list.find(c => c.name === name);
      if (!target) return;
      if (Characters.player.moveTask) { Utils.notify('你正在忙...'); return; }
      Chat.addSystemMessage(`你走向 ${name}，凑近了些...`);
      // 走到NPC身边
      Characters.sendToChar('你', target, 'idle_arrive', 0.01, () => {
        // 到达后开始悄悄话模式
        Chat.whisperMode = true;
        Chat.whisperTarget = target;
        const input = document.getElementById('chat-input');
        input.placeholder = `对 ${name} 耳语...`;
        input.focus();
        Chat.addSystemMessage(`你和${name}凑在了一起...`);
      });
    });
    document.getElementById('npc-send-note').addEventListener('click', () => {
      document.getElementById('npc-panel').classList.add('hidden');
      const name = this._npcTarget;
      document.getElementById('npc-note-to').textContent = `写给 ${name}`;
      document.getElementById('npc-note-input').value = '';
      document.getElementById('npc-note-panel').classList.remove('hidden');
    });
    document.getElementById('npc-give-food').addEventListener('click', () => {
      document.getElementById('npc-panel').classList.add('hidden');
      const cooked = Backpack.getCookedItems();
      if (cooked.length === 0) { Utils.notify('你还没烤好任何食物'); return; }
      Backpack.open('give', this._npcTarget);
    });
    document.getElementById('npc-give-item').addEventListener('click', () => {
      document.getElementById('npc-panel').classList.add('hidden');
      const gifts = Backpack.getGiftableItems();
      if (gifts.length === 0) { Utils.notify('没有可赠送的物品'); return; }
      Backpack.open('give', this._npcTarget);
    });
    // 纸条面板
    document.getElementById('npc-note-cancel').addEventListener('click', () => {
      document.getElementById('npc-note-panel').classList.add('hidden');
    });
    document.getElementById('npc-note-send').addEventListener('click', () => {
      const text = document.getElementById('npc-note-input').value.trim();
      if (!text) { Utils.notify('写点什么吧...'); return; }
      document.getElementById('npc-note-panel').classList.add('hidden');
      const name = this._npcTarget;
      const target = Characters.list.find(c => c.name === name);
      if (!target || Characters.player.moveTask) {
        Chat.addSystemMessage(`你悄悄递了一张纸条给 ${name}...`);
        this._npcNoteReply(name);
        return;
      }
      // 走到NPC身边递纸条
      Chat.addSystemMessage(`你拿着纸条走向 ${name}...`);
      Characters.sendToChar('你', target, 'giveNote', 1.2, () => {
        Chat.addSystemMessage(`📝 你把纸条递给了 ${name}`);
        this._npcNoteReply(name);
      });
    });
  },

  // 送物品给NPC
  _giveItemToNPC(npcName, item, note) {
    const noteText = note ? ` 并留言：「${note}」` : '';
    Chat.addSystemMessage(`你把${item.emoji} ${item.name}递给了 ${npcName}${noteText}`);
    Utils.notify(`${item.emoji} 送出了 ${item.name}`);
    Characters.showChatBubble(npcName, '', false);
    setTimeout(() => {
      const reactions = note
        ? [`${item.emoji} 收到了！你说的话我记住了`, '好感动... 谢谢你的心意', `谢谢！「${note}」我会记住的`]
        : [`哇，${item.name}！太谢谢了！`, '这也太好了吧！', '真的给我吗？谢谢！', '好感动... 谢谢你', `${item.emoji} 我好喜欢！`];
      const msg = Utils.pick(reactions);
      Chat.addMessage(npcName, msg, 'other');
      Characters.showChatBubble(npcName, msg, false);
    }, 1500);
  },

  // 点击NPC角色检测
  _checkNpcClick(clickX, clickY) {
    const ps = 5;
    for (const char of Characters.list) {
      if (char.isPlayer) continue;
      const cx = Math.floor(char.x), cy = Math.floor(char.y);
      // 角色碰撞框
      if (clickX >= cx - 15 && clickX <= cx + 20 &&
          clickY >= cy - 35 && clickY <= cy + 20) {
        return char;
      }
    }
    return null;
  },

  _openNpcPanel(npc) {
    this._npcTarget = npc.name;
    document.getElementById('npc-panel-name').textContent = `${npc.name}`;
    document.getElementById('npc-panel').classList.remove('hidden');
  },

  _playSimpleMelody() {
    AudioManager.ensureContext();
    const ctx = AudioManager.ctx; const now = ctx.currentTime;
    const notes = [
      {freq:392,time:0,dur:0.4},{freq:440,time:0.5,dur:0.3},{freq:494,time:0.9,dur:0.5},
      {freq:440,time:1.5,dur:0.3},{freq:392,time:1.9,dur:0.6},{freq:330,time:2.6,dur:0.5},
      {freq:349,time:3.2,dur:0.3},{freq:392,time:3.6,dur:0.8}
    ];
    const mg = ctx.createGain(); mg.gain.value = 0.12; mg.connect(AudioManager.masterGain);
    notes.forEach(n => {
      const o = ctx.createOscillator(); o.type='sine'; o.frequency.value=n.freq;
      const g = ctx.createGain(); const t = now+n.time;
      g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(0.3,t+0.05);
      g.gain.linearRampToValueAtTime(0.2,t+n.dur*0.5); g.gain.exponentialRampToValueAtTime(0.001,t+n.dur);
      o.connect(g); g.connect(mg); o.start(t); o.stop(t+n.dur+0.1);
    });
  }
};
