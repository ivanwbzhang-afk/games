/**
 * interaction.js - 玩家与NPC的互动系统
 * 邀请机制、发现物品、奖励等
 */

const Interaction = {
  // 互动状态
  playSessionActive: false,
  playSessionTimer: 0,
  playSessionDuration: 300000, // 5分钟
  playDescTimer: 0,
  playDescInterval: 6000, // 5分钟内约50条，间隔6秒
  meetingCount: {}, // 记录与NPC宠物相遇次数

  /**
   * 触发发现物品弹窗
   */
  showDiscovery(spot) {
    const popup = document.getElementById('discoveryPopup');
    const overlay = document.getElementById('popupOverlay');
    const canvas = document.getElementById('discItemCanvas');
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, 48, 48);
    const sprite = ITEM_SPRITES[spot.item];
    if (sprite) {
      PixelArt.draw(ctx, sprite, 6, 8, 3);
    }

    document.getElementById('discTitle').textContent = `发现了 ${spot.name}！`;
    document.getElementById('discDesc').textContent = spot.desc;

    overlay.classList.add('show');
    popup.classList.add('show');

    document.getElementById('discBtn').onclick = () => {
      popup.classList.remove('show');
      overlay.classList.remove('show');
      Game.addToInventory({ id: spot.item, type: 'collect', name: spot.name, icon: '✨', desc: spot.desc });
      Game.showNotification(`${spot.name} 已收入背包`);
    };
  },

  /**
   * 触发宠物对视邀请
   */
  showInvite(npcOwner) {
    const popup = document.getElementById('invitePopup');
    const overlay = document.getElementById('popupOverlay');
    const petName = npcOwner.pet.name;

    document.getElementById('inviteTitle').textContent = `${Game.playerPet.name} 和 ${petName} 对视了！`;
    document.getElementById('inviteDesc').textContent = '它们的尾巴开始摇动，似乎想一起玩...';

    overlay.classList.add('show');
    popup.classList.add('show');

    document.getElementById('inviteYes').onclick = () => {
      popup.classList.remove('show');
      overlay.classList.remove('show');
      this.startPlaySession(npcOwner);
    };

    document.getElementById('inviteNo').onclick = () => {
      popup.classList.remove('show');
      overlay.classList.remove('show');
    };
  },

  /**
   * 开始双狗玩耍
   */
  startPlaySession(npcOwner) {
    this.playSessionActive = true;
    this.playSessionTimer = 0;
    this.playDescTimer = 0;

    const npcPet = npcOwner.pet;
    const npcKey = npcOwner.pet.type + npcOwner.pet.name;

    // 记录相遇次数
    this.meetingCount[npcKey] = (this.meetingCount[npcKey] || 0) + 1;
    const count = this.meetingCount[npcKey];

    // 如果是第二次相遇 — 实际效果
    if (count >= 2) {
      Game.showNotification(`它们好像认识对方！${Game.playerPet.name}跑得更快了`);
      // 实际加速
      Game.playerPet.speed = 2.5;
      npcPet.speed = 2.5;
      // 尾巴摇更快（动画间隔缩短）
      Game.playerPet._playAnimSpeed = 200;
      npcPet._playAnimSpeed = 200;
    } else {
      Game.playerPet.speed = 1.8;
      npcPet.speed = 1.8;
      Game.playerPet._playAnimSpeed = 350;
      npcPet._playAnimSpeed = 350;
    }

    // 开始玩耍
    PetAI.startPlaySession(Game.playerPet, npcPet);

    // 拉近镜头 - 宠物特写
    Game.targetZoom = 2.5;

    // 主人平滑走向最近的长椅坐下（不瞬移）
    const bench = GameMap.getNearestBench(
      (Game.playerOwner.x + npcOwner.x) / 2,
      (Game.playerOwner.y + npcOwner.y) / 2
    );
    if (bench) {
      Game.playerOwner.walkToAndSit(bench.x - 5, bench.y - 5);
      npcOwner.walkToAndSit(bench.x + 25, bench.y - 5);
    } else {
      Game.playerOwner.walkToAndSit(Game.playerOwner.x, Game.playerOwner.y);
      npcOwner.walkToAndSit(npcOwner.x, npcOwner.y);
    }

    // 打开聊天界面
    ChatAIO.open(npcOwner, count);
  },

  /**
   * 更新互动
   */
  update(dt) {
    if (!this.playSessionActive) return;

    this.playSessionTimer += dt;
    this.playDescTimer += dt;

    // 更新聊天栏倒计时
    const timerEl = document.getElementById('chatTimer');
    if (timerEl) {
      const remaining = Math.max(0, this.playSessionDuration - this.playSessionTimer);
      const totalSec = Math.ceil(remaining / 1000);
      const min = Math.floor(totalSec / 60);
      const sec = totalSec % 60;
      timerEl.textContent = `${min}:${sec.toString().padStart(2, '0')}`;
      timerEl.classList.remove('warn', 'danger');
      if (totalSec <= 30) timerEl.classList.add('danger');
      else if (totalSec <= 60) timerEl.classList.add('warn');
    }

    // 定期生成互动文字
    if (this.playDescTimer > this.playDescInterval) {
      this.playDescTimer = 0;
      const desc = PetAI.getPlayDescription(Game.playerPet, Game.playerPet.playPartner);
      ChatAIO.addActionMessage(desc);
    }

    // 互动结束
    if (this.playSessionTimer > this.playSessionDuration) {
      this.endPlaySession();
    }
  },

  /**
   * 结束互动
   */
  endPlaySession() {
    if (!this.playSessionActive) return;
    this.playSessionActive = false;

    const partner = Game.playerPet.playPartner;
    PetAI.endPlaySession(Game.playerPet, partner);

    // 恢复镜头
    Game.targetZoom = 1;

    // 主人站起来，平滑走回原位
    Game.playerOwner.standUpAndReturn();
    for (const npc of Game.npcOwners) {
      if (npc.state === 'sit' || npc.state === 'walkToSit') {
        npc.standUpAndReturn();
      }
    }

    // 奖励
    const rewards = ['默契值 +1', '快乐值 +20'];
    const npcKey = partner?.type + partner?.name;
    if (this.meetingCount[npcKey] >= 2) {
      rewards.push('友谊徽章 ×1');
    }

    Game.showNotification(`玩耍结束！获得：${rewards.join('、')}`);

    // 关闭聊天
    setTimeout(() => ChatAIO.close(), 1500);
  },

  /**
   * NPC老爷爷互动
   */
  handleGrandpaInteraction(grandpa) {
    const talk = PetAI.getGrandpaTalk(Game.playerPet.name);
    grandpa.talkBubble = talk;
    grandpa.talkTimer = 0;
    Game.showNotification(`老爷爷：${talk}`);

    // 给一块零食
    Game.addToInventory({ id: 'snack', type: 'food', name: '小零食', icon: '🍖', desc: '老爷爷给的' });
    setTimeout(() => {
      Game.showNotification('获得了一块小零食！');
    }, 2000);
  }
};
