/**
 * pixelart.js - 像素艺术绘制工具 + 全部精灵定义
 * 统一渲染比例 scale=2, PX=1
 * 人物 ~12x18, 宠物 ~14x10, 比例协调
 */

// roundRect polyfill
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    if (typeof r === 'number') r = [r, r, r, r];
    const [tl, tr, br, bl] = r;
    this.moveTo(x + tl, y);
    this.lineTo(x + w - tr, y);
    this.arcTo(x + w, y, x + w, y + tr, tr);
    this.lineTo(x + w, y + h - br);
    this.arcTo(x + w, y + h, x + w - br, y + h, br);
    this.lineTo(x + bl, y + h);
    this.arcTo(x, y + h, x, y + h - bl, bl);
    this.lineTo(x, y + tl);
    this.arcTo(x, y, x + tl, y, tl);
    this.closePath();
    return this;
  };
}

const PixelArt = {
  PX: 1,
  SCALE: 2, // 统一渲染倍率

  draw(ctx, matrix, x, y, scale) {
    const s = scale || this.SCALE;
    const px = this.PX * s;
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        const color = matrix[r][c];
        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(x + c * px, y + r * px, px, px);
        }
      }
    }
  },

  drawFlipped(ctx, matrix, x, y, scale) {
    const s = scale || this.SCALE;
    const px = this.PX * s;
    const w = matrix[0].length;
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        const color = matrix[r][c];
        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(x + (w - 1 - c) * px, y + r * px, px, px);
        }
      }
    }
  },

  getSize(matrix, scale) {
    const s = scale || this.SCALE;
    const px = this.PX * s;
    return { w: matrix[0].length * px, h: matrix.length * px };
  },

  createSprite(matrix, scale) {
    const size = this.getSize(matrix, scale);
    const cv = document.createElement('canvas');
    cv.width = size.w; cv.height = size.h;
    this.draw(cv.getContext('2d'), matrix, 0, 0, scale);
    return cv;
  },

  createSpriteFlipped(matrix, scale) {
    const size = this.getSize(matrix, scale);
    const cv = document.createElement('canvas');
    cv.width = size.w; cv.height = size.h;
    this.drawFlipped(cv.getContext('2d'), matrix, 0, 0, scale);
    return cv;
  }
};

// ===== 调色板 =====
const PAL = {
  WHITE: '#f0f0f0', CREAM: '#f5deb3', BROWN: '#8B5E3C', DARK_BROWN: '#5C3A21',
  BLACK: '#2a2a2a', ORANGE: '#e8913a', GRAY: '#888888', LIGHT_GRAY: '#bbbbbb',
  GOLDEN: '#daa520', SPOTTED: '#c8a882',
  SKIN: '#f4c89a', SKIN_S: '#e0b080',
  HAIR_BLACK: '#333', HAIR_BROWN: '#6b4226',
  SHIRT_BLUE: '#4a90d9', SHIRT_BLUE_S: '#3a78c0',
  SHIRT_RED: '#d94a4a', SHIRT_GREEN: '#4ad97a', SHIRT_PURPLE: '#9b59b6',
  PANTS: '#3a3a5c', PANTS_L: '#4a4a6c', SHOE: '#444', SHOE_L: '#555',
  GRASS1: '#5b8c3e', GRASS2: '#4a7a32', GRASS3: '#6b9c4e',
  PATH: '#c8b896', PATH_DARK: '#b0a07e',
  WATER: '#4a8db7', WATER_LIGHT: '#6bb5d9', WATER_DARK: '#3a7da7',
  TREE_TRUNK: '#2a1a10', TREE_TRUNK_L: '#3d2518',
  TREE_LEAVES: '#1a4a20', TREE_LEAVES2: '#142e16', TREE_LEAVES3: '#256630',
  BENCH_WOOD: '#a0784a', BENCH_DARK: '#7a5a32',
  STONE: '#8a8a8a', STONE_DARK: '#6a6a6a',
  REED: '#7a9a5a', REED_TOP: '#9ab87a',
  FLOWER_RED: '#e74c3c', FLOWER_YELLOW: '#f1c40f', FLOWER_BLUE: '#5dade2', FLOWER_PINK: '#ff9ff3',
  GOLD: '#f1c40f', LEASH: '#8B5E3C',
};

// 缩写
const _ = null;
const S = PAL.SKIN, Ss = PAL.SKIN_S, H = PAL.HAIR_BLACK;
const B = PAL.SHIRT_BLUE, Bs = PAL.SHIRT_BLUE_S;
const Pn = PAL.PANTS, Pl = PAL.PANTS_L, Sh = PAL.SHOE, Sl = PAL.SHOE_L;
const O = PAL.ORANGE, C = PAL.CREAM, E = '#222', N = '#1a1a1a', W = '#fff';
const Tl = PAL.TREE_LEAVES, T2 = PAL.TREE_LEAVES2, T3 = PAL.TREE_LEAVES3, Tk = PAL.TREE_TRUNK, Tl2 = PAL.TREE_TRUNK_L;

// ===== 主人角色 6x13（迷你风格）=====
const OWNER_SPRITES = {
  idle: [[
    [_,_,S,S,_,_],
    [_,S,S,S,S,_],
    [_,S,E,E,S,_],
    [_,_,S,S,_,_],
    [_,B,B,B,B,_],
    [_,B,B,B,B,_],
    [S,B,B,B,B,S],
    [_,B,B,B,B,_],
    [_,_,Pn,Pn,_,_],
    [_,_,Pn,Pn,_,_],
    [_,Pn,_,_,Pn,_],
    [_,Sh,_,_,Sh,_],
    [_,Sh,_,_,Sh,_],
  ]],
  walk: [
    [
      [_,_,S,S,_,_],
      [_,S,S,S,S,_],
      [_,S,E,E,S,_],
      [_,_,S,S,_,_],
      [_,B,B,B,B,_],
      [_,B,B,B,B,_],
      [S,B,B,B,B,S],
      [_,B,B,B,B,_],
      [_,Pn,_,Pn,_,_],
      [Pn,Pn,_,_,Pn,_],
      [Pn,_,_,_,_,Pn],
      [Sh,_,_,_,_,Sh],
      [_,_,_,_,_,_],
    ],
    [
      [_,_,S,S,_,_],
      [_,S,S,S,S,_],
      [_,S,E,E,S,_],
      [_,_,S,S,_,_],
      [_,B,B,B,B,_],
      [_,B,B,B,B,_],
      [S,B,B,B,B,S],
      [_,B,B,B,B,_],
      [_,_,Pn,Pn,_,_],
      [_,Pn,_,_,Pn,_],
      [Pn,_,_,_,_,Pn],
      [_,Sh,_,_,Sh,_],
      [_,_,_,_,_,_],
    ]
  ],
  sit: [[
    [_,_,S,S,_,_],
    [_,S,S,S,S,_],
    [_,S,E,E,S,_],
    [_,_,S,S,_,_],
    [_,B,B,B,B,_],
    [_,B,B,B,B,_],
    [S,B,B,B,B,S],
    [_,Pn,Pn,Pn,Pn,_],
    [_,Pn,Pn,Pn,Pn,_],
    [_,_,Sh,Sh,_,_],
  ]]
};

// ===== NPC老爷爷 6x13（迷你风格）=====
const NPC_GRANDPA_SPRITE = [
  [_,_,'#ddd','#ddd',_,_],
  [_,'#ddd','#ddd','#ddd','#ddd',_],
  [_,'#ddd',S,S,'#ddd',_],
  [_,_,S,S,_,_],
  [_,'#5a7a5a','#5a7a5a','#5a7a5a','#5a7a5a',_],
  [_,'#5a7a5a','#5a7a5a','#5a7a5a','#5a7a5a',_],
  [S,'#5a7a5a','#5a7a5a','#5a7a5a','#5a7a5a',S],
  [_,'#5a7a5a','#5a7a5a','#5a7a5a','#5a7a5a',_],
  [_,_,'#4a4a4a','#4a4a4a',_,_],
  [_,_,'#4a4a4a','#4a4a4a',_,_],
  [_,'#4a4a4a',_,_,'#4a4a4a',_],
  [_,'#555',_,_,'#555',_],
  [_,'#555',_,_,'#555',_],
];

// ===== 宠物精灵 - 迷你风格 8x7 =====
const G = PAL.GRAY, GD = '#666', Gd = PAL.GOLDEN, Gl = '#eec860';
const Db = PAL.DARK_BROWN, Dl = '#7a4e2c';

function _petFrames(body, belly, eye, nose, accent) {
  const b=body, c=belly, e=eye, n=nose, a=accent||body;
  return {
    idle: [
      [
        [_,b,b,_,_,_,_,_],
        [b,c,c,b,_,_,_,_],
        [b,e,c,e,b,b,b,_],
        [_,b,n,b,c,c,b,a],
        [_,_,b,c,c,c,b,_],
        [_,_,b,_,_,b,_,_],
        [_,b,b,_,_,b,b,_],
      ],
      [
        [_,b,b,_,_,_,_,_],
        [b,c,c,b,_,_,_,_],
        [b,e,c,e,b,b,b,_],
        [_,b,n,b,c,c,b,_],
        [_,_,b,c,c,c,b,a],
        [_,_,b,_,_,b,_,_],
        [_,b,b,_,_,b,b,_],
      ]
    ],
    walk: [
      [
        [_,b,b,_,_,_,_,_],
        [b,c,c,b,_,_,_,_],
        [b,e,c,e,b,b,b,_],
        [_,b,n,b,c,c,b,a],
        [_,_,b,c,c,c,b,_],
        [_,b,_,_,_,_,b,_],
        [b,_,_,_,_,_,_,b],
      ],
      [
        [_,b,b,_,_,_,_,_],
        [b,c,c,b,_,_,_,_],
        [b,e,c,e,b,b,b,_],
        [_,b,n,b,c,c,b,a],
        [_,_,b,c,c,c,b,_],
        [_,_,_,b,_,b,_,_],
        [_,_,b,_,_,_,b,_],
      ]
    ],
    sniff: [[
      [_,_,b,b,_,_,_,_],
      [_,b,c,c,b,_,_,_],
      [b,e,c,e,b,b,b,_],
      [b,n,b,c,c,c,b,a],
      [_,b,b,c,c,c,b,_],
      [_,_,b,_,_,b,_,_],
      [_,b,b,_,_,b,b,_],
    ]],
    dig: [[
      [_,_,_,b,b,_,_,_],
      [_,_,b,c,c,b,_,_],
      [_,b,e,c,e,b,b,_],
      [b,n,b,c,c,b,a,_],
      [_,b,_,_,_,_,b,_],
      [b,_,_,_,_,_,_,b],
      ['#8B7355','#8B7355',_,_,_,_,_,_],
    ]],
    sit: [[
      [_,b,b,_,_,_,_,_],
      [b,c,c,b,_,_,_,_],
      [b,e,c,e,b,b,_,_],
      [_,b,n,b,c,b,a,_],
      [_,_,b,c,c,b,_,_],
      [_,_,b,b,b,b,_,_],
      [_,_,_,b,b,_,_,_],
    ]]
  };
}

const PET_SPRITES = {
  shiba: Object.assign({ name: '柴犬', trait: '活泼好动', color: O },
    _petFrames(O, C, E, N, O)),

  husky: Object.assign({ name: '哈士奇', trait: '调皮捣蛋', color: G },
    _petFrames(G, W, '#4af', N, G)),

  golden: Object.assign({ name: '金毛', trait: '温柔友善', color: Gd },
    _petFrames(Gd, Gl, E, N, Gd)),

  dalmatian: Object.assign({ name: '斑点狗', trait: '精力充沛', color: PAL.WHITE },
    _petFrames(W, W, E, N, '#333')),

  labrador: Object.assign({ name: '拉布拉多', trait: '忠诚可靠', color: Db },
    _petFrames(Db, Dl, E, N, Db)),

  samoyed: Object.assign({ name: '萨摩耶', trait: '微笑天使', color: '#f5f5f5' },
    _petFrames('#f5f5f5', '#fafafa', E, N, '#f5f5f5')),
};

const PARTICLE_COLORS = ['#f1c40f', '#f39c12', '#e67e22', '#d4ac0d'];

// ===== 场景元素 =====
const SCENE_SPRITES = {
  tree: [
    [_,_,_,_,_,_,Tl,Tl,Tl,_,_,_,_,_,_],
    [_,_,_,_,Tl,Tl,T2,Tl,Tl,Tl,_,_,_,_,_],
    [_,_,_,Tl,Tl,T3,Tl,T2,Tl,Tl,Tl,_,_,_,_],
    [_,_,Tl,T2,Tl,Tl,T3,Tl,Tl,T2,Tl,Tl,_,_,_],
    [_,Tl,Tl,Tl,T3,Tl,Tl,Tl,T2,Tl,Tl,Tl,Tl,_,_],
    [_,Tl,T2,Tl,Tl,Tl,T2,Tl,Tl,T3,Tl,T2,Tl,_,_],
    [_,_,Tl,Tl,T3,Tl,Tl,Tl,Tl,Tl,T2,Tl,_,_,_],
    [_,_,_,Tl,Tl,Tl,Tl,Tl,Tl,Tl,Tl,_,_,_,_],
    [_,_,_,_,_,_,Tk,Tk,_,_,_,_,_,_,_],
    [_,_,_,_,_,_,Tk,Tk,_,_,_,_,_,_,_],
    [_,_,_,_,_,Tk,Tk,Tk,Tk,_,_,_,_,_,_],
    [_,_,_,_,_,Tk,Tl2,Tl2,Tk,_,_,_,_,_,_],
  ],
  crookedTree: [
    [_,_,_,_,_,_,_,Tl,Tl,Tl,_,_,_,_,_],
    [_,_,_,_,_,Tl,Tl,T2,Tl,Tl,Tl,_,_,_,_],
    [_,_,_,_,Tl,T3,Tl,Tl,T2,Tl,Tl,Tl,_,_,_],
    [_,_,_,Tl,Tl,Tl,T2,Tl,Tl,T3,Tl,_,_,_,_],
    [_,_,_,_,Tl,Tl,Tl,Tl,Tl,Tl,_,_,_,_,_],
    [_,_,_,_,_,_,Tk,Tk,_,_,_,_,_,_,_],
    [_,_,_,_,_,Tk,Tk,_,_,_,_,_,_,_,_],
    [_,_,_,_,Tk,Tk,_,_,_,_,_,_,_,_,_],
    [_,_,_,_,Tk,_,_,_,_,_,_,_,_,_,_],
    [_,_,_,_,Tk,Tk,_,_,_,_,_,_,_,_,_],
  ],
  bench: [
    [_,_,PAL.BENCH_DARK,PAL.BENCH_DARK,PAL.BENCH_DARK,PAL.BENCH_DARK,PAL.BENCH_DARK,PAL.BENCH_DARK,PAL.BENCH_DARK,PAL.BENCH_DARK,PAL.BENCH_DARK,PAL.BENCH_DARK,_,_],
    [_,PAL.BENCH_WOOD,PAL.BENCH_WOOD,PAL.BENCH_WOOD,PAL.BENCH_WOOD,PAL.BENCH_WOOD,PAL.BENCH_WOOD,PAL.BENCH_WOOD,PAL.BENCH_WOOD,PAL.BENCH_WOOD,PAL.BENCH_WOOD,PAL.BENCH_WOOD,PAL.BENCH_WOOD,_],
    [_,PAL.BENCH_WOOD,PAL.BENCH_WOOD,PAL.BENCH_WOOD,PAL.BENCH_WOOD,PAL.BENCH_WOOD,PAL.BENCH_WOOD,PAL.BENCH_WOOD,PAL.BENCH_WOOD,PAL.BENCH_WOOD,PAL.BENCH_WOOD,PAL.BENCH_WOOD,PAL.BENCH_WOOD,_],
    [_,_,PAL.BENCH_DARK,_,_,_,_,_,_,_,_,PAL.BENCH_DARK,_,_],
    [_,_,PAL.BENCH_DARK,_,_,_,_,_,_,_,_,PAL.BENCH_DARK,_,_],
    [_,_,PAL.BENCH_DARK,_,_,_,_,_,_,_,_,PAL.BENCH_DARK,_,_],
  ],
  stump: [
    [_,_,Tk,Tk,Tk,Tk,_,_],
    [_,Tk,'#8B7355','#8B7355','#8B7355','#8B7355',Tk,_],
    [_,Tk,'#8B7355','#6b5335','#6b5335','#8B7355',Tk,_],
    [_,Tk,'#8B7355','#8B7355','#8B7355','#8B7355',Tk,_],
    [_,_,Tk,Tk,Tk,Tk,_,_],
  ],
  reed: [
    [_,PAL.REED_TOP,_,_,_,PAL.REED_TOP,_],
    [_,PAL.REED,_,_,_,PAL.REED,_],
    [_,PAL.REED,_,PAL.REED_TOP,_,PAL.REED,_],
    [_,PAL.REED,_,PAL.REED,_,PAL.REED,_],
    [_,PAL.REED,_,PAL.REED,_,_,_],
    [_,PAL.REED,_,PAL.REED,_,_,_],
    [_,PAL.REED,_,PAL.REED,_,_,_],
  ],
  flower: [
    [_,PAL.FLOWER_RED,_,PAL.FLOWER_RED,_],
    [PAL.FLOWER_RED,PAL.FLOWER_YELLOW,PAL.FLOWER_RED,PAL.FLOWER_YELLOW,PAL.FLOWER_RED],
    [_,PAL.FLOWER_RED,_,PAL.FLOWER_RED,_],
    [_,_,'#3a7a2e',_,_],
    [_,_,'#3a7a2e',_,_],
  ],
  flowerBlue: [
    [_,PAL.FLOWER_BLUE,_,PAL.FLOWER_BLUE,_],
    [PAL.FLOWER_BLUE,PAL.WHITE,PAL.FLOWER_BLUE,PAL.WHITE,PAL.FLOWER_BLUE],
    [_,PAL.FLOWER_BLUE,_,PAL.FLOWER_BLUE,_],
    [_,_,'#3a7a2e',_,_],
    [_,_,'#3a7a2e',_,_],
  ],
  flowerPink: [
    [_,PAL.FLOWER_PINK,_,PAL.FLOWER_PINK,_],
    [PAL.FLOWER_PINK,PAL.FLOWER_YELLOW,PAL.FLOWER_PINK,PAL.FLOWER_YELLOW,PAL.FLOWER_PINK],
    [_,PAL.FLOWER_PINK,_,PAL.FLOWER_PINK,_],
    [_,_,'#3a7a2e',_,_],
    [_,_,'#3a7a2e',_,_],
  ],
  stone: [
    [_,_,PAL.STONE,PAL.STONE,PAL.STONE,_,_],
    [_,PAL.STONE,PAL.STONE,PAL.STONE,PAL.STONE,PAL.STONE,_],
    [PAL.STONE_DARK,PAL.STONE,PAL.STONE,PAL.STONE,PAL.STONE,PAL.STONE,PAL.STONE_DARK],
    [_,PAL.STONE_DARK,PAL.STONE_DARK,PAL.STONE_DARK,PAL.STONE_DARK,PAL.STONE_DARK,_],
  ],
};

// ===== 道具精灵 =====
const ITEM_SPRITES = {
  bone: [
    [_,W,W,_,_,_,W,W,_],
    [W,W,W,W,W,W,W,W,W],
    [_,W,W,_,_,_,W,W,_],
  ],
  badge: [
    [_,_,_,PAL.GOLD,PAL.GOLD,PAL.GOLD,_,_,_],
    [_,_,PAL.GOLD,PAL.GOLD,'#c0392b',PAL.GOLD,PAL.GOLD,_,_],
    [_,PAL.GOLD,'#c0392b','#e74c3c','#e74c3c','#e74c3c','#c0392b',PAL.GOLD,_],
    [_,_,PAL.GOLD,PAL.GOLD,'#c0392b',PAL.GOLD,PAL.GOLD,_,_],
    [_,_,_,PAL.GOLD,PAL.GOLD,PAL.GOLD,_,_,_],
  ],
  frisbee: [
    [_,_,'#e74c3c','#e74c3c','#e74c3c',_,_],
    [_,'#e74c3c','#f5555a','#fff','#f5555a','#e74c3c',_],
    ['#e74c3c','#f5555a','#fff','#fff','#fff','#f5555a','#e74c3c'],
    [_,'#e74c3c','#f5555a','#fff','#f5555a','#e74c3c',_],
    [_,_,'#e74c3c','#e74c3c','#e74c3c',_,_],
  ],
  cookie: [
    [_,'#c89a5a','#c89a5a','#c89a5a',_],
    ['#c89a5a','#dab07a','#8B5E3C','#dab07a','#c89a5a'],
    ['#c89a5a','#8B5E3C','#dab07a','#dab07a','#c89a5a'],
    [_,'#c89a5a','#c89a5a','#c89a5a',_],
  ],
  snack: [
    [_,'#e8913a','#e8913a',_],
    ['#e8913a','#f5deb3','#f5deb3','#e8913a'],
    ['#e8913a','#f5deb3','#f5deb3','#e8913a'],
    [_,'#e8913a','#e8913a',_],
  ]
};
