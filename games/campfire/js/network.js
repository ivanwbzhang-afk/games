/* ========== Network Sync Module (CloudBase) ========== */
const Network = {
  app: null,
  db: null,
  auth: null,
  userId: null,    // CloudBase 分配的匿名用户 ID
  userName: null,   // 玩家昵称
  userColor: 0,     // 调色板索引
  ready: false,

  // 实时监听器
  _watchers: [],

  // 房间 ID（单房间模式，所有人在同一个篝火）
  ROOM_ID: 'campfire_main',
  ENV_ID: 'campfire-0gwkbne34f09acaf',

  // ==================== 初始化 ====================
  async init() {
    try {
      this.app = cloudbase.init({ env: this.ENV_ID });
      this.auth = this.app.auth({ persistence: 'local' });
      this.db = this.app.database();

      // 匿名登录
      let loginState = await this.auth.getLoginState();
      if (!loginState) {
        await this.auth.signInAnonymously();
        loginState = await this.auth.getLoginState();
      }

      if (!loginState || !loginState.user) {
        throw new Error('登录失败');
      }

      this.userId = loginState.user.uid;
      console.log('[Network] 匿名登录成功, uid:', this.userId);

      // 检查/创建用户资料
      await this._ensureUserProfile();

      this.ready = true;
      return true;
    } catch (err) {
      console.error('[Network] 初始化失败:', err);
      return false;
    }
  },

  // ==================== 用户资料 ====================
  async _ensureUserProfile() {
    const result = await this.db.collection('users').doc(this.userId).get();
    if (result.data && result.data.length > 0) {
      const user = result.data[0];
      this.userName = user.name;
      this.userColor = user.colorIdx || 0;
    } else {
      // 新用户 — 随机昵称和颜色
      const names = ['旅人', '路过的人', '无名客', '夜行者', '拾柴人', '守火人', '风来客', '星光'];
      this.userName = names[Math.floor(Math.random() * names.length)] + Math.floor(Math.random() * 100);
      this.userColor = Math.floor(Math.random() * 6);
      await this.db.collection('users').doc(this.userId).set({
        name: this.userName,
        colorIdx: this.userColor,
        createdAt: new Date(),
        assets: { wood: 1 },  // 初始资产：1根柴火
      });
    }
  },

  // ==================== 篝火状态同步 ====================
  async syncFireState(fireData) {
    if (!this.ready) return;
    try {
      await this.db.collection('rooms').doc(this.ROOM_ID).set({
        fire: {
          state: fireData.state,
          intensity: fireData.intensity,
          remainingTime: fireData.remainingTime,
          totalWood: fireData.totalWood,
          lighter: fireData.lighter,
          charcoalHeat: fireData.charcoalHeat,
          lastUpdate: Date.now(),
          updatedBy: this.userId,
        }
      });
    } catch (err) {
      console.error('[Network] 同步篝火状态失败:', err);
    }
  },

  // 监听篝火状态变化
  watchFireState(callback) {
    if (!this.ready) return;
    const watcher = this.db.collection('rooms')
      .doc(this.ROOM_ID)
      .watch({
        onChange: (snapshot) => {
          if (snapshot.docs && snapshot.docs.length > 0) {
            const room = snapshot.docs[0];
            if (room.fire && room.fire.updatedBy !== this.userId) {
              callback(room.fire);
            }
          }
        },
        onError: (err) => {
          console.error('[Network] 篝火监听出错:', err);
        }
      });
    this._watchers.push(watcher);
  },

  // ==================== 玩家位置同步 ====================
  async updatePlayerState(playerData) {
    if (!this.ready) return;
    try {
      await this.db.collection('players').doc(this.userId).set({
        roomId: this.ROOM_ID,
        name: this.userName,
        colorIdx: this.userColor,
        x: playerData.x,
        y: playerData.y,
        animState: playerData.animState,
        facing: playerData.facing,
        isDancing: playerData.isDancing,
        isWalking: playerData.isWalking,
        lastSeen: Date.now(),
      });
    } catch (err) {
      // 静默失败，不阻塞游戏
    }
  },

  // 监听同房间其他玩家
  watchPlayers(callback) {
    if (!this.ready) return;
    const _ = this.db.command;
    const watcher = this.db.collection('players')
      .where({
        roomId: this.ROOM_ID,
      })
      .watch({
        onChange: (snapshot) => {
          // 过滤掉自己，只返回其他玩家
          const others = (snapshot.docs || []).filter(p => p._id !== this.userId);
          callback(others);
        },
        onError: (err) => {
          console.error('[Network] 玩家监听出错:', err);
        }
      });
    this._watchers.push(watcher);
  },

  // 玩家离开时清除自己的数据
  async removePlayer() {
    if (!this.ready) return;
    try {
      await this.db.collection('players').doc(this.userId).remove();
    } catch (err) {
      // 静默
    }
  },

  // ==================== 聊天消息同步 ====================
  async sendMessage(msg) {
    if (!this.ready) return;
    try {
      await this.db.collection('messages').add({
        roomId: this.ROOM_ID,
        userId: this.userId,
        name: msg.name,
        text: msg.text,
        type: msg.type || 'other',
        style: msg.style || '',
        timestamp: Date.now(),
      });
    } catch (err) {
      console.error('[Network] 发送消息失败:', err);
    }
  },

  // 监听新消息（只监听最近的消息，避免拉取全部历史）
  watchMessages(callback) {
    if (!this.ready) return;
    const _ = this.db.command;
    const watcher = this.db.collection('messages')
      .where({
        roomId: this.ROOM_ID,
        timestamp: _.gt(Date.now() - 60000), // 只监听最近1分钟的消息
      })
      .orderBy('timestamp', 'asc')
      .watch({
        onChange: (snapshot) => {
          const changes = snapshot.docChanges || [];
          changes.forEach(change => {
            // 只处理新增消息，且不是自己发的
            if ((change.dataType === 'add' || change.dataType === 'init') && change.doc) {
              if (change.doc.userId !== this.userId) {
                callback(change.doc);
              }
            }
          });
        },
        onError: (err) => {
          console.error('[Network] 消息监听出错:', err);
        }
      });
    this._watchers.push(watcher);
  },

  // ==================== 心跳 + 清理 ====================
  _heartbeatTimer: null,

  startHeartbeat() {
    // 每 5 秒更新玩家位置
    this._heartbeatTimer = setInterval(() => {
      if (!this.ready) return;
      const p = Characters.player;
      if (p) {
        this.updatePlayerState({
          x: p.x, y: p.y,
          animState: p.animState,
          facing: p.facing,
          isDancing: p.isDancing,
          isWalking: p.isWalking,
        });
      }
    }, 5000);

    // 每 10 秒同步篝火状态（只有正在燃烧时）
    this._fireTimer = setInterval(() => {
      if (!this.ready || Fire.state === 'ash') return;
      this.syncFireState({
        state: Fire.state,
        intensity: Fire.intensity,
        remainingTime: Fire.remainingTime,
        totalWood: Fire.stats.totalWood,
        lighter: Fire.stats.lighter,
        charcoalHeat: Fire.charcoalHeat,
      });
    }, 10000);
  },

  stopHeartbeat() {
    if (this._heartbeatTimer) { clearInterval(this._heartbeatTimer); this._heartbeatTimer = null; }
    if (this._fireTimer) { clearInterval(this._fireTimer); this._fireTimer = null; }
  },

  // ==================== 清理 ====================
  async cleanup() {
    this.stopHeartbeat();
    this._watchers.forEach(w => { try { w.close(); } catch(e){} });
    this._watchers = [];
    await this.removePlayer();
  },

  // ==================== 事件广播（添柴、跳舞等重要事件立即同步）====================
  async broadcastEvent(eventType, data) {
    if (!this.ready) return;
    // 篝火事件立即同步
    if (eventType === 'addWood') {
      await this.syncFireState({
        state: Fire.state,
        intensity: Fire.intensity,
        remainingTime: Fire.remainingTime,
        totalWood: Fire.stats.totalWood,
        lighter: Fire.stats.lighter,
        charcoalHeat: Fire.charcoalHeat,
      });
    }
    // 玩家位置事件立即同步
    if (eventType === 'dance' || eventType === 'move') {
      const p = Characters.player;
      if (p) {
        await this.updatePlayerState({
          x: p.x, y: p.y,
          animState: p.animState,
          facing: p.facing,
          isDancing: p.isDancing,
          isWalking: p.isWalking,
        });
      }
    }
  }
};
