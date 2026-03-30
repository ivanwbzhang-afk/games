/**
 * ai.js - 宠物AI行为系统
 * 控制宠物的自主行为决策
 */

const PetAI = {
  /**
   * 检测两只宠物是否可以互动
   */
  checkPetEncounter(pet1, pet2, range = 80) {
    const dist = Math.hypot(pet1.x - pet2.x, pet1.y - pet2.y);
    return dist < range && !pet1.interacting && !pet2.interacting;
  },

  /**
   * 让宠物"注意到"另一只宠物 - 竖耳朵看过去
   */
  triggerNotice(pet, targetPet) {
    pet.excitement = 60;
    pet.facing = targetPet.x > pet.x ? 'right' : 'left';
    // 尾巴摇起来 - 通过animFrame体现
    pet.animFrame = 1;
  },

  /**
   * 开始双狗互动
   */
  startPlaySession(pet1, pet2) {
    pet1.state = 'play';
    pet1.playPartner = pet2;
    pet1.interacting = true;
    pet1.playTimer = 0;
    pet1.excitement = 100;

    pet2.state = 'play';
    pet2.playPartner = pet1;
    pet2.interacting = true;
    pet2.playTimer = 0;
    pet2.excitement = 100;
  },

  /**
   * 结束互动
   */
  endPlaySession(pet1, pet2) {
    pet1._cleanPlayState();
    pet1.state = 'idle';
    pet1.playPartner = null;
    pet1.interacting = false;
    pet1.excitement = 30;
    pet1.happiness = Math.min(100, pet1.happiness + 20);
    pet1.speed = 1.8;
    pet1._playAnimSpeed = 350;

    pet2._cleanPlayState();
    pet2.state = 'idle';
    pet2.playPartner = null;
    pet2.interacting = false;
    pet2.excitement = 30;
    pet2.happiness = Math.min(100, pet2.happiness + 20);
    pet2.speed = 1.8;
    pet2._playAnimSpeed = 350;
  },

  /**
   * 生成互动文字描述（根据当前玩耍阶段）
   */
  getPlayDescription(pet1, pet2) {
    const phase = pet1._playPhase || 'chase';
    const pool = this._descriptionsByPhase[phase] || this._descriptionsByPhase._generic;
    // 从对应池里随机一条，替换名字
    const template = pool[Math.floor(Math.random() * pool.length)];
    return template.replace(/\{1\}/g, pet1.name).replace(/\{2\}/g, pet2.name);
  },

  _descriptionsByPhase: {
    sniff_greet: [
      '{1}小心翼翼地凑过去，鼻子抵着{2}的鼻子',
      '它们互相嗅了嗅，好像在说"你好呀"',
      '{2}伸长脖子闻了闻{1}，尾巴晃了两下',
      '{1}歪着头打量{2}，嗅了嗅耳朵后面',
      '两个小家伙鼻子碰在一起，空气里全是好奇',
      '{2}围着{1}转了一圈，从头闻到尾巴',
    ],
    chase: [
      '{1}突然撒开腿跑了！{2}立刻追上去',
      '{2}在后面追，{1}回头看了一眼，跑得更快了',
      '它们你追我赶，草皮都被踩出了一条小路',
      '{1}绕过树桩甩掉了{2}...但{2}抄近道追上了',
      '两团毛球在草地上飞奔，快乐得像两道闪电',
      '{2}追着{1}跑了三圈，舌头都伸出来了',
      '{1}假装跑不动了，{2}一追近它又加速了',
    ],
    circle: [
      '它们绕着彼此转圈圈，像在跳一支默契的舞',
      '{1}和{2}头尾相接，转了好几个圈',
      '两个小家伙转着转着突然停下来，面对面看了一眼',
      '它们绕啊绕，看得人都有点晕了',
      '{2}绕到{1}身后嗅了嗅尾巴，{1}扭头看它',
    ],
    tug: [
      '它们咬住同一根树枝，谁也不肯松口！',
      '{1}用力往后拽，{2}四脚蹬地寸步不让',
      '树枝在两张嘴之间来回拉锯，看得人忍不住笑',
      '{2}猛地一拽，{1}被拖着滑了两步',
      '拔了半天河，树枝"啪"地断了，两只都愣住了',
      '{1}叼着战利品得意洋洋，{2}在旁边不服气地蹦',
    ],
    fake_fall: [
      '{1}突然往地上一歪——假装摔倒了！',
      '{2}赶紧跑过来嗅了嗅...{1}猛地跳起来！{2}吓了一跳',
      '{1}躺在地上四脚朝天，{2}不确定地用鼻子碰碰它',
      '假摔高手{1}又开始表演了，{2}每次都上当',
      '{1}在地上打了个滚，{2}在旁边歪着头：你干嘛呢？',
      '{2}试探地舔了舔趴着的{1}，结果被突然弹起的{1}撞了一下',
    ],
    pounce: [
      '{1}后腿蓄力——扑！直接压在{2}身上了',
      '{2}被扑倒，在地上翻了个滚，爬起来甩甩毛',
      '{1}像猫一样扭着屁股，然后猛扑过去',
      '一记完美的突袭！{2}懵了一秒才反应过来',
      '{1}扑了个空，{2}灵巧地闪开了，回头看它：太慢了',
    ],
    rest: [
      '跑累了，两只并排趴下来，呼哧呼哧喘气',
      '{1}打了个大哈欠，{2}也被传染了',
      '它们肩并肩看着远方，风吹过耳朵上的毛',
      '短暂的休战时间。{1}舔了舔爪子，{2}闭上了眼睛',
      '两个小家伙安安静静地趴着，享受阳光',
      '{2}把头靠在{1}背上，眯了一小会儿',
      '虽然趴着不动，尾巴还在地上慢悠悠地扫来扫去',
    ],
    zoomies: [
      '疯了疯了！两只同时发疯一样满地跑',
      '{1}转了八个圈还没停，{2}跟着一起转',
      '它们的爪子几乎不着地，像两颗弹力球在弹',
      '这就是传说中的"狗子发疯时间"！',
      '{2}跑出一个完美的8字形，{1}紧随其后',
      '草地上尘土飞扬，两个小毛球疯狂地兜圈子',
      '{1}冲刺了一圈又一圈，仿佛永远不会累',
    ],
    nudge: [
      '{1}用鼻子轻轻碰了碰{2}的脸',
      '两个鼻子碰在一起，好温柔',
      '{2}蹭了蹭{1}的下巴，{1}也蹭了回去',
      '鼻尖对鼻尖，世界安静了一秒',
      '{1}用额头顶了顶{2}，像在说"你还好吗"',
      '{2}轻轻舔了一下{1}的耳朵',
    ],
    _generic: [
      '它们玩得不亦乐乎',
      '{1}和{2}形影不离',
      '快乐在空气中弥漫',
      '这两个小家伙，真是太有意思了',
      '{1}看着{2}，眼睛里全是开心',
    ]
  },

  /**
   * 生成NPC老爷爷的对话
   */
  getGrandpaTalk(petName) {
    const talks = [
      `你家${petName}真精神啊！`,
      `哎呀，好可爱的${petName}~`,
      `这只${petName}毛色真好看`,
      `来来来，给${petName}一块小零食`,
    ];
    return talks[Math.floor(Math.random() * talks.length)];
  },

  /**
   * 随机事件生成
   */
  generateRandomEvent() {
    const events = [
      { type: 'frisbee', text: '草坪上突然出现一个飞盘！', prob: 0.002 },
      { type: 'butterfly', text: '一只蝴蝶飞过...', prob: 0.005 },
      { type: 'wind', text: '一阵微风吹过，树叶沙沙作响', prob: 0.003 },
    ];

    for (const evt of events) {
      if (Math.random() < evt.prob) return evt;
    }
    return null;
  }
};
