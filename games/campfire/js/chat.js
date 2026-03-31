/* ========== Chat System ========== */
const Chat = {
  messages: [],
  whisperMode: false,
  whisperTarget: null,
  topicMode: false,

  // NPC 聊天内容池
  npcChats: [
    '今晚的星星好多啊',
    '这火烧得真旺',
    '有人要烤棉花糖吗？',
    '刚才那颗流星看到了吗？',
    '安静真好',
    '坐在这里什么都不想做也挺好的',
    '火快灭了，有人添柴吗',
    '远处好像有什么声音',
    '红薯烤好了，谁要？',
    '我觉得我可以坐到天亮',
    '这里感觉很安全',
    '有时候沉默也是一种交流',
    '风好像变大了',
    '看那边，是不是有只小狐狸？',
    '我小时候也经常烤火',
    '帮我看一下红薯糊了没',
    '今天的月亮好圆',
    '谁刚才烧了纸条？',
  ],

  // 话题池
  topics: [
    '你记忆中最美的夜晚是什么样的？',
    '如果可以对过去的自己说一句话',
    '最近有什么让你感到温暖的小事',
    '你觉得篝火最像什么？',
    '如果这堆火能听懂我们说话',
    '你最想念的声音是什么',
  ],

  npcChatTimer: 0,
  npcTopicTimer: 0,

  init() {
    this.messages = [];
    this.npcChatTimer = Utils.randFloat(5, 15);
    this.npcTopicTimer = Utils.randFloat(60, 120);

    this._bindEvents();

    // 欢迎消息
    this.addSystemMessage('你来到了篝火旁，找了个位置坐下。');
    setTimeout(() => {
      if (Fire.state === 'ash') {
        this.addSystemMessage('篝火已经熄灭了。灰烬还有些温热。添一根柴，重新点燃它？');
      }
    }, 2000);
  },

  _bindEvents() {
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send');
    const topicBtn = document.getElementById('btn-topic');

    const send = () => {
      const text = input.value.trim();
      if (!text) return;

      if (this.whisperMode) {
        this.addMessage('你', text, 'self', 'whisper');
        const target = this.whisperTarget;
        if (target) {
          setTimeout(() => {
            this.addMessage(target.name, Utils.pick([
              '嗯...',
              '我也是这么想的',
              '只有我们知道',
              '谢谢你告诉我',
              '真的吗？',
            ]), 'other', 'whisper');
            Characters.showChatBubble(target.name, '......', true);
          }, Utils.randFloat(1500, 3000));
          this.addSystemMessage(`你和${target.name}凑在一起说了些什么...`);
        }
        this.whisperMode = false;
        input.placeholder = '说点什么...';
      } else if (this.topicMode) {
        this.addMessage('你', `💬 发起话题：${text}`, 'self', 'topic');
        this.topicMode = false;
        topicBtn.classList.remove('active');
        input.placeholder = '说点什么...';
        this._npcRespondToTopic(text);
      } else {
        this.addMessage('你', text, 'self');
        this._maybeNpcReply(text);
      }

      input.value = '';
    };

    sendBtn.addEventListener('click', send);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') send();
    });

    topicBtn.addEventListener('click', () => {
      this.topicMode = !this.topicMode;
      this.whisperMode = false;
      topicBtn.classList.toggle('active');
      input.placeholder = this.topicMode ? '发起一个话题...' : '说点什么...';
    });
  },

  update(dt) {
    // NPC 自动聊天
    this.npcChatTimer -= dt;
    if (this.npcChatTimer <= 0) {
      this.npcChatTimer = Utils.randFloat(8, 25);
      const npc = Utils.pick(Characters.list.filter(c => !c.isPlayer));
      if (npc) {
        this.addMessage(npc.name, Utils.pick(this.npcChats), 'other');
      }
    }

    // NPC 偶尔发起话题
    this.npcTopicTimer -= dt;
    if (this.npcTopicTimer <= 0) {
      this.npcTopicTimer = Utils.randFloat(90, 180);
      const npc = Utils.pick(Characters.list.filter(c => !c.isPlayer));
      if (npc) {
        const topic = Utils.pick(this.topics);
        this.addMessage(npc.name, `💬 发起话题：${topic}`, 'other', 'topic');
        this._npcRespondToTopic(topic, npc.name);
      }
    }
  },

  addMessage(name, text, type = 'other', style = '') {
    const msg = { name, text, type, style, time: Date.now() };
    this.messages.push(msg);
    this._renderMessage(msg);

    // 同步显示角色头顶气泡（系统消息除外）
    if (type !== 'system' && name) {
      const isWhisper = style === 'whisper';
      Characters.showChatBubble(name, text, isWhisper);
    }

    // 多人同步：自己发的消息广播到云端
    if (type === 'self' && typeof Network !== 'undefined' && Network.ready) {
      Network.sendMessage({ name: Network.userName, text, type: 'other', style });
    }
  },

  // 收到远程消息（来自其他玩家）
  addRemoteMessage(msgData) {
    const msg = { name: msgData.name, text: msgData.text, type: 'other', style: msgData.style || '', time: msgData.timestamp };
    this.messages.push(msg);
    this._renderMessage(msg);
    if (msgData.name) {
      Characters.showChatBubble(msgData.name, msgData.text, msgData.style === 'whisper');
    }
  },

  addSystemMessage(text) {
    this.addMessage('', text, 'system');
  },

  _renderMessage(msg) {
    const container = document.getElementById('chat-messages');
    const el = document.createElement('div');
    el.className = `chat-msg ${msg.type}`;

    if (msg.type === 'system') {
      el.innerHTML = `<div class="msg-bubble">${msg.text}</div>`;
    } else {
      const avatarEmoji = msg.type === 'self' ? '🔥' : '👤';
      const bubbleClass = msg.style ? `msg-bubble ${msg.style}` : 'msg-bubble';
      el.innerHTML = `
        <div class="msg-avatar">${avatarEmoji}</div>
        <div class="msg-body">
          <div class="msg-name">${msg.name}</div>
          <div class="${bubbleClass}">${msg.text}</div>
        </div>
      `;
    }

    container.appendChild(el);
    container.scrollTop = container.scrollHeight;
  },

  _maybeNpcReply(playerText) {
    if (Math.random() < 0.4) {
      const npc = Utils.pick(Characters.list.filter(c => !c.isPlayer));
      if (npc) {
        const replies = [
          '哈哈',
          '说得对',
          '嗯嗯',
          '有道理',
          '😊',
          '我也觉得',
          '然后呢？',
          '真的吗',
          '好温暖',
        ];
        setTimeout(() => {
          this.addMessage(npc.name, Utils.pick(replies), 'other');
        }, Utils.randFloat(2000, 5000));
      }
    }
  },

  _npcRespondToTopic(topic, excludeName = '') {
    const npcs = Characters.list.filter(c => !c.isPlayer && c.name !== excludeName);
    const responders = npcs.slice(0, Utils.randInt(1, 3));

    const responses = [
      '这个话题好有意思...',
      '让我想想...',
      '我记得有一次...',
      '说不上来，但心里暖暖的',
      '每次想到这个就觉得很平静',
      '可能是某个安静的下午吧',
      '有些事情只能在篝火旁说',
      '你们说的我都有同感',
    ];

    responders.forEach((npc, i) => {
      setTimeout(() => {
        this.addMessage(npc.name, Utils.pick(responses), 'other');
      }, Utils.randFloat(3000, 8000) + i * 3000);
    });
  }
};
