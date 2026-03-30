/**
 * chat.js - 聊天AIO系统
 * 上下分屏结构，宠物玩耍时开启
 */

const ChatAIO = {
  active: false,
  npcOwner: null,
  meetCount: 0,

  // NPC自动回复库
  _npcReplies: [
    '哈哈，它们玩得真开心',
    '你家狗是什么品种呀？',
    '天气真好，最适合遛狗了',
    '它好像很喜欢这片草坪',
    '每次来这个公园都能遇到有趣的狗',
    '你看，它们在抢那根树枝',
    '我家这只特别喜欢追飞盘',
    '下次也来这遛吧，说不定还能碰到',
    '哇，好默契啊它俩',
    '拍个照吧，太可爱了',
  ],

  _npcRepeatReplies: [
    '又遇到啦！它们好像记得对方',
    '这俩成老朋友了',
    '看来它们很有缘分呢',
    '感觉比上次更开心了',
    '老朋友见面，格外亲切',
  ],

  /**
   * 打开聊天界面
   */
  open(npcOwner, meetCount) {
    this.active = true;
    this.npcOwner = npcOwner;
    this.meetCount = meetCount || 1;

    const chatEl = document.getElementById('chatAIO');
    chatEl.classList.add('active');

    // 隐藏场域输入栏、摇杆、背包按钮
    document.getElementById('worldInputBar').classList.add('hidden');
    document.getElementById('joystick').style.display = 'none';
    document.getElementById('bagBtn').style.display = 'none';

    document.getElementById('chatTitle').textContent =
      `与${npcOwner.pet.name}的主人聊天`;

    // 清空消息
    const messages = document.getElementById('chatMessages');
    messages.innerHTML = '';

    // 系统消息
    this.addSystemMessage(`${Game.playerPet.name} 和 ${npcOwner.pet.name} 开始玩耍了！`);

    if (meetCount >= 2) {
      this.addSystemMessage(`这是你们第${meetCount}次相遇，它们显得格外兴奋`);
    }

    // NPC主动打招呼
    setTimeout(() => {
      if (meetCount >= 2) {
        this.addNPCMessage(this._npcRepeatReplies[Math.floor(Math.random() * this._npcRepeatReplies.length)]);
      } else {
        this.addNPCMessage('嗨！它们好像很合得来呀');
      }
    }, 1500);

    // 调整canvas大小
    Game.resizeCanvas();

    this._bindInput();
  },

  /**
   * 关闭聊天界面
   */
  close() {
    this.active = false;
    this.npcOwner = null;

    const chatEl = document.getElementById('chatAIO');
    chatEl.classList.remove('active');
    chatEl.style.height = ''; // 清除内联样式

    // 恢复场域输入栏、摇杆、背包按钮
    document.getElementById('worldInputBar').classList.remove('hidden');
    document.getElementById('joystick').style.display = 'block';
    document.getElementById('bagBtn').style.display = '';

    this.addSystemMessage('散步继续...');

    // 恢复canvas大小
    setTimeout(() => Game.resizeCanvas(), 100);
  },

  _bindInput() {
    const input = document.getElementById('chatInput');
    const sendBtn = document.getElementById('chatSendBtn');
    const closeBtn = document.getElementById('chatCloseBtn');

    const sendMessage = () => {
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      this.addPlayerMessage(text);

      // NPC 自动回复
      setTimeout(() => {
        const reply = this._npcReplies[Math.floor(Math.random() * this._npcReplies.length)];
        this.addNPCMessage(reply);
      }, 1000 + Math.random() * 2000);
    };

    sendBtn.onclick = sendMessage;
    input.onkeydown = (e) => {
      if (e.key === 'Enter') sendMessage();
    };

    closeBtn.onclick = () => {
      Interaction.endPlaySession();
    };

    // 拍照按钮 → 展示卡片
    const photoBtn = document.getElementById('photoBtn');
    photoBtn.onclick = () => {
      const gameCanvas = Game.canvas;
      const photoCanvas = document.getElementById('photoCanvas');
      photoCanvas.width = gameCanvas.width;
      photoCanvas.height = gameCanvas.height;
      const pctx = photoCanvas.getContext('2d');

      // 闪白
      const gctx = gameCanvas.getContext('2d');
      gctx.save();
      gctx.fillStyle = 'rgba(255,255,255,0.8)';
      gctx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
      gctx.restore();

      setTimeout(() => {
        pctx.drawImage(gameCanvas, 0, 0);

        // 填充卡片信息
        const pet1 = Game.playerPet;
        const pet2 = pet1.playPartner;
        const npcKey = pet2 ? (pet2.type + pet2.name) : '';
        const meets = Interaction.meetingCount[npcKey] || 1;
        const elapsed = Math.floor(Interaction.playSessionTimer / 1000);
        const min = Math.floor(elapsed / 60);
        const sec = elapsed % 60;

        document.getElementById('photoCardPets').innerHTML =
          `🐕 <b>${pet1.name}</b>（你的宠物）<br>` +
          (pet2 ? `🐕 <b>${pet2.name}</b>（新朋友）` : '');

        document.getElementById('photoCardStats').innerHTML =
          `⏱ 已玩耍 ${min}分${sec}秒 &nbsp;｜&nbsp; 🤝 第${meets}次相遇<br>` +
          `❤️ ${pet1.name}快乐值 ${Math.floor(pet1.happiness)}` +
          (pet2 ? ` &nbsp;｜&nbsp; ❤️ ${pet2.name}快乐值 ${Math.floor(pet2.happiness)}` : '');

        // 显示卡片
        document.getElementById('photoCard').classList.add('show');

        // 保存按钮
        document.getElementById('photoSaveBtn').onclick = () => {
          photoCanvas.toBlob((blob) => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `遛狗公园_${Date.now()}.png`;
            a.click();
            URL.revokeObjectURL(url);
            Game.showNotification('📷 已保存到相册！');
          }, 'image/png');
        };

        document.getElementById('photoCloseBtn').onclick = () => {
          document.getElementById('photoCard').classList.remove('show');
        };

        this.addSystemMessage('📸 记录下了这个美好瞬间');
      }, 150);
    };
  },

  addSystemMessage(text) {
    this._addMsg('system', text);
  },

  addActionMessage(text) {
    this._addMsg('action', text);
  },

  addNPCMessage(text) {
    this._addMsg('npc', text);
  },

  addPlayerMessage(text) {
    this._addMsg('player', text);
  },

  _addMsg(type, text) {
    const messages = document.getElementById('chatMessages');
    if (!messages) return;
    const div = document.createElement('div');
    div.className = `chat-msg ${type}`;
    div.textContent = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }
};
