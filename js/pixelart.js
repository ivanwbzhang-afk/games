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
  TREE_TRUNK: '#6b4226', TREE_TRUNK_L: '#7d5535',
  TREE_LEAVES: '#3a7a2e', TREE_LEAVES2: '#2e6a22', TREE_LEAVES3: '#4a8a3e',
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

// ===== 主人角色 12x18 =====
const OWNER_SPRITES = {
  idle: [[
    [_,_,_,_,H,H,H,H,_,_,_,_],
    [_,_,_,H,H,H,H,H,H,_,_,_],
    [_,_,H,H,S,S,S,S,H,H,_,_],
    [_,_,H,S,S,S,S,S,S,H,_,_],
    [_,_,_,S,E,S,S,E,S,_,_,_],
    [_,_,_,S,S,Ss,Ss,S,S,_,_,_],
    [_,_,_,_,S,S,S,S,_,_,_,_],
    [_,_,_,B,B,B,B,B,B,_,_,_],
    [_,_,B,B,B,B,B,B,B,B,_,_],
    [_,S,B,B,Bs,B,B,Bs,B,B,S,_],
    [_,S,_,B,B,B,B,B,B,_,S,_],
    [_,_,_,B,B,B,B,B,B,_,_,_],
    [_,_,_,_,Pn,Pn,Pn,Pn,_,_,_,_],
    [_,_,_,_,Pn,Pl,Pl,Pn,_,_,_,_],
    [_,_,_,Pn,Pn,_,_,Pn,Pn,_,_,_],
    [_,_,_,Pn,Pn,_,_,Pn,Pn,_,_,_],
    [_,_,_,Sh,Sl,_,_,Sh,Sl,_,_,_],
    [_,_,_,Sh,Sh,_,_,Sh,Sh,_,_,_],
  ]],
  walk: [
    [
      [_,_,_,_,H,H,H,H,_,_,_,_],
      [_,_,_,H,H,H,H,H,H,_,_,_],
      [_,_,H,H,S,S,S,S,H,H,_,_],
      [_,_,H,S,S,S,S,S,S,H,_,_],
      [_,_,_,S,E,S,S,E,S,_,_,_],
      [_,_,_,S,S,Ss,Ss,S,S,_,_,_],
      [_,_,_,_,S,S,S,S,_,_,_,_],
      [_,_,_,B,B,B,B,B,B,_,_,_],
      [_,_,B,B,B,B,B,B,B,B,_,_],
      [_,S,B,B,Bs,B,B,Bs,B,B,S,_],
      [_,S,_,B,B,B,B,B,B,_,S,_],
      [_,_,_,B,B,B,B,B,B,_,_,_],
      [_,_,_,Pn,Pn,_,_,Pn,Pn,_,_,_],
      [_,_,Pn,Pn,_,_,_,_,Pn,Pn,_,_],
      [_,_,Pn,Pn,_,_,_,_,Pn,Pn,_,_],
      [_,_,_,Pn,_,_,_,Pn,_,_,_,_],
      [_,_,Sh,Sl,_,_,_,_,Sh,Sl,_,_],
      [_,_,Sh,Sh,_,_,_,_,Sh,Sh,_,_],
    ],
    [
      [_,_,_,_,H,H,H,H,_,_,_,_],
      [_,_,_,H,H,H,H,H,H,_,_,_],
      [_,_,H,H,S,S,S,S,H,H,_,_],
      [_,_,H,S,S,S,S,S,S,H,_,_],
      [_,_,_,S,E,S,S,E,S,_,_,_],
      [_,_,_,S,S,Ss,Ss,S,S,_,_,_],
      [_,_,_,_,S,S,S,S,_,_,_,_],
      [_,_,_,B,B,B,B,B,B,_,_,_],
      [_,_,B,B,B,B,B,B,B,B,_,_],
      [_,S,B,B,Bs,B,B,Bs,B,B,S,_],
      [_,S,_,B,B,B,B,B,B,_,S,_],
      [_,_,_,B,B,B,B,B,B,_,_,_],
      [_,_,_,_,Pn,Pn,Pn,Pn,_,_,_,_],
      [_,_,_,_,Pn,Pn,Pn,Pn,_,_,_,_],
      [_,_,_,Pn,_,_,_,_,Pn,_,_,_],
      [_,_,Pn,Pn,_,_,_,_,Pn,Pn,_,_],
      [_,_,_,Sh,Sl,_,_,Sh,Sl,_,_,_],
      [_,_,_,Sh,Sh,_,_,Sh,Sh,_,_,_],
    ]
  ],
  sit: [[
    [_,_,_,_,H,H,H,H,_,_,_,_],
    [_,_,_,H,H,H,H,H,H,_,_,_],
    [_,_,H,H,S,S,S,S,H,H,_,_],
    [_,_,H,S,S,S,S,S,S,H,_,_],
    [_,_,_,S,E,S,S,E,S,_,_,_],
    [_,_,_,S,S,Ss,Ss,S,S,_,_,_],
    [_,_,_,_,S,S,S,S,_,_,_,_],
    [_,_,_,B,B,B,B,B,B,_,_,_],
    [_,_,B,B,B,B,B,B,B,B,_,_],
    [_,S,B,B,Bs,B,B,Bs,B,B,S,_],
    [_,_,_,B,B,B,B,B,B,_,_,_],
    [_,_,Pn,Pn,Pn,Pn,Pn,Pn,Pn,Pn,_,_],
    [_,_,Pn,Pn,Pn,Pn,Pn,Pn,Pn,Pn,_,_],
    [_,_,_,Sh,Sh,_,_,Sh,Sh,_,_,_],
  ]]
};

// ===== NPC老爷爷 12x18 =====
const NPC_GRANDPA_SPRITE = [
  [_,_,_,_,'#ddd','#ddd','#ddd','#ddd',_,_,_,_],
  [_,_,_,'#ddd','#ddd','#ddd','#ddd','#ddd','#ddd',_,_,_],
  [_,_,'#ddd','#ddd',S,S,S,S,'#ddd','#ddd',_,_],
  [_,_,'#ddd',S,S,S,S,S,S,'#ddd',_,_],
  [_,_,_,S,E,S,S,E,S,_,_,_],
  [_,_,_,S,S,Ss,Ss,S,S,_,_,_],
  [_,_,_,_,S,S,S,S,_,_,_,_],
  [_,_,_,'#5a7a5a','#5a7a5a','#5a7a5a','#5a7a5a','#5a7a5a','#5a7a5a',_,_,_],
  [_,_,'#5a7a5a','#5a7a5a','#5a7a5a','#5a7a5a','#5a7a5a','#5a7a5a','#5a7a5a','#5a7a5a',_,_],
  [_,S,'#5a7a5a','#5a7a5a','#4a6a4a','#5a7a5a','#5a7a5a','#4a6a4a','#5a7a5a','#5a7a5a',S,_],
  [_,_,_,'#5a7a5a','#5a7a5a','#5a7a5a','#5a7a5a','#5a7a5a','#5a7a5a',_,_,_],
  [_,_,_,'#5a7a5a','#5a7a5a','#5a7a5a','#5a7a5a','#5a7a5a','#5a7a5a',_,_,_],
  [_,_,_,_,'#4a4a4a','#4a4a4a',_,'#4a4a4a','#4a4a4a',_,_,_],
  [_,_,_,_,'#4a4a4a','#4a4a4a',_,'#4a4a4a','#4a4a4a',_,_,_],
  [_,_,_,'#4a4a4a','#4a4a4a',_,_,_,'#4a4a4a','#4a4a4a',_,_],
  [_,_,_,'#555','#555',_,_,_,'#555','#555',_,_],
];

// ===== 宠物精灵 - 每种独立设计 14x10 =====
// 辅助: G=灰 GG=深灰 Gd=金 Db=深棕 Wb=白偏暖
const G = PAL.GRAY, GD = '#666', Gd = PAL.GOLDEN, Gl = '#eec860';
const Db = PAL.DARK_BROWN, Dl = '#7a4e2c';

function _petFrames(body, belly, eye, nose, accent) {
  // 生成标准5动画帧集（idle×2, walk×2, sniff, dig, sit）
  // body=主色, belly=腹色, eye=眼色, nose=鼻色, accent=点缀色
  const b=body, c=belly, e=eye, n=nose, a=accent||body;
  return {
    idle: [
      [
        [_,_,b,b,_,_,b,b,_,_,_,_,_,_],
        [_,b,c,c,b,b,c,c,b,_,_,_,_,_],
        [_,b,W,e,c,c,e,W,b,_,_,_,_,_],
        [_,_,b,c,n,c,c,b,_,_,_,_,_,_],
        [_,_,_,b,b,b,b,b,b,b,b,_,_,_],
        [_,_,b,b,c,c,c,c,b,a,a,b,_,_],
        [_,_,b,c,c,c,c,c,c,b,_,b,_,_],
        [_,_,_,b,b,_,_,b,b,_,_,_,_,_],
        [_,_,_,b,b,_,_,b,b,_,_,_,_,_],
        [_,_,b,b,_,_,_,_,b,b,_,_,_,_],
      ],
      [
        [_,_,b,b,_,_,b,b,_,_,_,_,_,_],
        [_,b,c,c,b,b,c,c,b,_,_,_,_,_],
        [_,b,W,e,c,c,e,W,b,_,_,_,_,_],
        [_,_,b,c,n,c,c,b,_,_,_,_,_,_],
        [_,_,_,b,b,b,b,b,b,b,b,b,_,_],
        [_,_,b,b,c,c,c,c,b,a,_,b,_,_],
        [_,_,b,c,c,c,c,c,c,b,_,_,b,_],
        [_,_,_,b,b,_,_,b,b,_,_,_,_,_],
        [_,_,_,b,b,_,_,b,b,_,_,_,_,_],
        [_,_,b,b,_,_,_,_,b,b,_,_,_,_],
      ]
    ],
    walk: [
      [
        [_,_,b,b,_,_,b,b,_,_,_,_,_,_],
        [_,b,c,c,b,b,c,c,b,_,_,_,_,_],
        [_,b,W,e,c,c,e,W,b,_,_,_,_,_],
        [_,_,b,c,n,c,c,b,_,_,_,_,_,_],
        [_,_,_,b,b,b,b,b,b,b,b,_,_,_],
        [_,_,b,b,c,c,c,c,b,a,a,b,_,_],
        [_,_,b,c,c,c,c,c,c,b,_,_,_,_],
        [_,_,b,b,_,_,_,_,b,b,_,_,_,_],
        [_,b,b,_,_,_,_,_,_,b,b,_,_,_],
        [_,b,_,_,_,_,_,_,_,_,b,_,_,_],
      ],
      [
        [_,_,b,b,_,_,b,b,_,_,_,_,_,_],
        [_,b,c,c,b,b,c,c,b,_,_,_,_,_],
        [_,b,W,e,c,c,e,W,b,_,_,_,_,_],
        [_,_,b,c,n,c,c,b,_,_,_,_,_,_],
        [_,_,_,b,b,b,b,b,b,b,b,b,_,_],
        [_,_,b,b,c,c,c,c,b,a,_,b,_,_],
        [_,_,b,c,c,c,c,c,c,b,_,_,_,_],
        [_,_,_,_,b,b,_,b,b,_,_,_,_,_],
        [_,_,_,b,b,_,_,_,b,b,_,_,_,_],
        [_,_,b,b,_,_,_,_,_,b,b,_,_,_],
      ]
    ],
    sniff: [[
      [_,_,_,b,b,_,b,b,_,_,_,_,_,_],
      [_,_,b,c,c,b,c,c,b,_,_,_,_,_],
      [_,b,W,e,c,c,e,W,b,_,_,_,_,_],
      [b,c,c,n,c,b,_,_,_,_,_,_,_,_],
      [_,b,b,b,b,b,b,b,b,b,_,_,_,_],
      [_,_,b,c,c,c,c,b,a,a,b,_,_,_],
      [_,_,b,c,c,c,c,c,b,_,b,_,_,_],
      [_,_,_,b,b,_,_,b,b,_,_,_,_,_],
      [_,_,_,b,b,_,_,b,b,_,_,_,_,_],
      [_,_,b,b,_,_,_,_,b,b,_,_,_,_],
    ]],
    dig: [[
      [_,_,_,_,b,b,b,b,_,_,_,_,_,_],
      [_,_,_,b,c,c,c,c,b,_,_,_,_,_],
      [_,_,b,W,e,c,e,W,b,_,_,_,_,_],
      [_,b,c,n,c,b,_,_,_,_,_,_,_,_],
      [_,_,b,b,b,b,b,b,b,b,_,_,_,_],
      [_,_,b,c,c,c,b,a,a,b,b,_,_,_],
      [_,_,b,_,_,_,_,_,_,b,_,_,_,_],
      [_,b,_,_,_,_,_,_,_,_,b,_,_,_],
      ['#8B7355','#8B7355',_,_,_,_,_,_,_,_,_,_,_,_],
    ]],
    sit: [[
      [_,_,b,b,_,_,b,b,_,_,_,_,_,_],
      [_,b,c,c,b,b,c,c,b,_,_,_,_,_],
      [_,b,W,e,c,c,e,W,b,_,_,_,_,_],
      [_,_,b,c,n,c,c,b,_,_,_,_,_,_],
      [_,_,_,b,b,b,b,b,b,_,_,_,_,_],
      [_,_,b,c,c,c,c,b,a,_,_,_,_,_],
      [_,_,b,c,c,c,c,c,b,_,_,_,_,_],
      [_,_,b,b,b,b,b,b,b,_,_,_,_,_],
      [_,_,_,b,b,_,b,b,_,_,_,_,_,_],
    ]]
  };
}

const PET_SPRITES = {
  // 柴犬：三角竖耳 + 卷尾
  shiba: Object.assign({ name: '柴犬', trait: '活泼好动', color: O },
    _petFrames(O, C, E, N, O)),

  // 哈士奇：大三角耳 + 竖直粗尾，蓝眼 → 独特头部
  husky: {
    name: '哈士奇', trait: '调皮捣蛋', color: G,
    idle: [
      [
        [_,G,G,G,_,_,G,G,G,_,_,_,_,_],
        [_,G,W,W,G,G,W,W,G,_,_,_,_,_],
        [_,G,W,'#4af',W,W,'#4af',W,G,_,_,_,_,_],
        [_,_,G,W,N,W,W,G,_,_,_,_,_,_],
        [_,_,_,G,G,G,G,G,G,G,G,_,_,_],
        [_,_,G,G,W,W,W,W,G,G,G,G,_,_],
        [_,_,G,W,W,W,W,W,W,G,_,G,_,_],
        [_,_,_,G,G,_,_,G,G,_,_,G,_,_],
        [_,_,_,G,G,_,_,G,G,_,_,G,_,_],
        [_,_,G,G,_,_,_,_,G,G,_,_,_,_],
      ],
      [
        [_,G,G,G,_,_,G,G,G,_,_,_,_,_],
        [_,G,W,W,G,G,W,W,G,_,_,_,_,_],
        [_,G,W,'#4af',W,W,'#4af',W,G,_,_,_,_,_],
        [_,_,G,W,N,W,W,G,_,_,_,_,_,_],
        [_,_,_,G,G,G,G,G,G,G,G,G,_,_],
        [_,_,G,G,W,W,W,W,G,G,_,G,_,_],
        [_,_,G,W,W,W,W,W,W,G,_,_,G,_],
        [_,_,_,G,G,_,_,G,G,_,_,G,_,_],
        [_,_,_,G,G,_,_,G,G,_,G,_,_,_],
        [_,_,G,G,_,_,_,_,G,G,_,_,_,_],
      ]
    ],
    walk: null, sniff: null, dig: null, sit: null
  },

  // 金毛：圆耳 + 长毛蓬松尾
  golden: {
    name: '金毛', trait: '温柔友善', color: Gd,
    idle: [
      [
        [_,_,Gd,Gd,Gd,Gd,Gd,Gd,_,_,_,_,_,_],
        [_,Gd,Gl,Gl,Gd,Gd,Gl,Gl,Gd,_,_,_,_,_],
        [_,Gd,W,E,Gl,Gl,E,W,Gd,_,_,_,_,_],
        [_,_,Gd,Gl,N,Gl,Gl,Gd,_,_,_,_,_,_],
        [_,_,_,Gd,Gd,Gd,Gd,Gd,Gd,Gd,Gd,_,_,_],
        [_,_,Gd,Gd,Gl,Gl,Gl,Gl,Gd,Gd,Gd,Gd,_,_],
        [_,_,Gd,Gl,Gl,Gl,Gl,Gl,Gl,Gd,Gd,Gd,Gd,_],
        [_,_,_,Gd,Gd,_,_,Gd,Gd,_,_,Gd,Gd,_],
        [_,_,_,Gd,Gd,_,_,Gd,Gd,_,_,_,_,_],
        [_,_,Gd,Gd,_,_,_,_,Gd,Gd,_,_,_,_],
      ],
      [
        [_,_,Gd,Gd,Gd,Gd,Gd,Gd,_,_,_,_,_,_],
        [_,Gd,Gl,Gl,Gd,Gd,Gl,Gl,Gd,_,_,_,_,_],
        [_,Gd,W,E,Gl,Gl,E,W,Gd,_,_,_,_,_],
        [_,_,Gd,Gl,N,Gl,Gl,Gd,_,_,_,_,_,_],
        [_,_,_,Gd,Gd,Gd,Gd,Gd,Gd,Gd,Gd,Gd,_,_],
        [_,_,Gd,Gd,Gl,Gl,Gl,Gl,Gd,Gd,_,Gd,_,_],
        [_,_,Gd,Gl,Gl,Gl,Gl,Gl,Gl,Gd,_,Gd,Gd,_],
        [_,_,_,Gd,Gd,_,_,Gd,Gd,_,_,_,Gd,_],
        [_,_,_,Gd,Gd,_,_,Gd,Gd,_,_,_,_,_],
        [_,_,Gd,Gd,_,_,_,_,Gd,Gd,_,_,_,_],
      ]
    ],
    walk: null, sniff: null, dig: null, sit: null
  },

  // 斑点狗：长耳下垂 + 细尾
  dalmatian: {
    name: '斑点狗', trait: '精力充沛', color: PAL.WHITE,
    idle: [
      [
        [_,_,W,W,_,_,W,W,_,_,_,_,_,_],
        [_,W,W,W,W,W,W,W,W,_,_,_,_,_],
        [W,W,W,E,W,W,E,W,W,W,_,_,_,_],
        [W,_,W,W,N,W,W,W,_,W,_,_,_,_],
        [_,_,_,W,W,W,W,W,W,W,W,_,_,_],
        [_,_,W,W,W,'#333',W,W,W,'#333',W,W,_,_],
        [_,_,W,W,'#333',W,W,W,W,W,_,W,_,_],
        [_,_,_,W,W,_,_,W,W,_,_,_,_,_],
        [_,_,_,W,W,_,_,W,W,_,_,_,_,_],
        [_,_,W,W,_,_,_,_,W,W,_,_,_,_],
      ],
      [
        [_,_,W,W,_,_,W,W,_,_,_,_,_,_],
        [_,W,W,W,W,W,W,W,W,_,_,_,_,_],
        [W,W,W,E,W,W,E,W,W,W,_,_,_,_],
        [W,_,W,W,N,W,W,W,_,W,_,_,_,_],
        [_,_,_,W,W,W,W,W,W,W,W,W,_,_],
        [_,_,W,'#333',W,W,W,'#333',W,W,_,W,_,_],
        [_,_,W,W,W,'#333',W,W,W,W,_,_,W,_],
        [_,_,_,W,W,_,_,W,W,_,_,_,_,_],
        [_,_,_,W,W,_,_,W,W,_,_,_,_,_],
        [_,_,W,W,_,_,_,_,W,W,_,_,_,_],
      ]
    ],
    walk: null, sniff: null, dig: null, sit: null
  },

  // 拉布拉多：圆头 + 垂尾 + 壮实
  labrador: {
    name: '拉布拉多', trait: '忠诚可靠', color: Db,
    idle: [
      [
        [_,_,Db,Db,Db,Db,Db,Db,_,_,_,_,_,_],
        [_,Db,Dl,Dl,Db,Db,Dl,Dl,Db,_,_,_,_,_],
        [_,Db,Dl,E,Dl,Dl,E,Dl,Db,_,_,_,_,_],
        [_,_,Db,Dl,N,Dl,Dl,Db,_,_,_,_,_,_],
        [_,_,_,Db,Db,Db,Db,Db,Db,Db,Db,_,_,_],
        [_,_,Db,Db,Dl,Dl,Dl,Dl,Db,Db,Db,Db,_,_],
        [_,_,Db,Dl,Dl,Dl,Dl,Dl,Dl,Db,Db,_,_,_],
        [_,_,_,Db,Db,_,_,Db,Db,_,Db,_,_,_],
        [_,_,_,Db,Db,_,_,Db,Db,_,_,_,_,_],
        [_,_,Db,Db,_,_,_,_,Db,Db,_,_,_,_],
      ],
      [
        [_,_,Db,Db,Db,Db,Db,Db,_,_,_,_,_,_],
        [_,Db,Dl,Dl,Db,Db,Dl,Dl,Db,_,_,_,_,_],
        [_,Db,Dl,E,Dl,Dl,E,Dl,Db,_,_,_,_,_],
        [_,_,Db,Dl,N,Dl,Dl,Db,_,_,_,_,_,_],
        [_,_,_,Db,Db,Db,Db,Db,Db,Db,Db,Db,_,_],
        [_,_,Db,Db,Dl,Dl,Dl,Dl,Db,Db,_,Db,_,_],
        [_,_,Db,Dl,Dl,Dl,Dl,Dl,Dl,Db,_,_,Db,_],
        [_,_,_,Db,Db,_,_,Db,Db,_,_,Db,_,_],
        [_,_,_,Db,Db,_,_,Db,Db,_,_,_,_,_],
        [_,_,Db,Db,_,_,_,_,Db,Db,_,_,_,_],
      ]
    ],
    walk: null, sniff: null, dig: null, sit: null
  },

  // 萨摩耶：蓬松圆脸 + 卷尾 + 微笑
  samoyed: {
    name: '萨摩耶', trait: '微笑天使', color: '#f5f5f5',
    idle: [
      [
        [_,'#f5f5f5','#f5f5f5','#f5f5f5','#f5f5f5','#f5f5f5','#f5f5f5','#f5f5f5','#f5f5f5',_,_,_,_,_],
        [_,'#f5f5f5','#fafafa','#fafafa','#f5f5f5','#f5f5f5','#fafafa','#fafafa','#f5f5f5',_,_,_,_,_],
        [_,'#f5f5f5',W,E,'#fafafa','#fafafa',E,W,'#f5f5f5',_,_,_,_,_],
        [_,_,'#f5f5f5','#fafafa',N,'#fafafa','#fafafa','#f5f5f5',_,_,_,_,_,_],
        [_,_,_,'#f5f5f5','#f5f5f5','#f5f5f5','#f5f5f5','#f5f5f5','#f5f5f5','#f5f5f5','#f5f5f5',_,_,_],
        [_,_,'#f5f5f5','#f5f5f5','#fafafa','#fafafa','#fafafa','#fafafa','#f5f5f5','#f5f5f5','#f5f5f5','#f5f5f5',_,_],
        [_,_,'#f5f5f5','#fafafa','#fafafa','#fafafa','#fafafa','#fafafa','#fafafa','#f5f5f5',_,'#f5f5f5','#f5f5f5',_],
        [_,_,_,'#f5f5f5','#f5f5f5',_,_,'#f5f5f5','#f5f5f5',_,_,_,_,_],
        [_,_,_,'#f5f5f5','#f5f5f5',_,_,'#f5f5f5','#f5f5f5',_,_,_,_,_],
        [_,_,'#f5f5f5','#f5f5f5',_,_,_,_,'#f5f5f5','#f5f5f5',_,_,_,_],
      ],
      [
        [_,'#f5f5f5','#f5f5f5','#f5f5f5','#f5f5f5','#f5f5f5','#f5f5f5','#f5f5f5','#f5f5f5',_,_,_,_,_],
        [_,'#f5f5f5','#fafafa','#fafafa','#f5f5f5','#f5f5f5','#fafafa','#fafafa','#f5f5f5',_,_,_,_,_],
        [_,'#f5f5f5',W,E,'#fafafa','#fafafa',E,W,'#f5f5f5',_,_,_,_,_],
        [_,_,'#f5f5f5','#fafafa',N,'#fafafa','#fafafa','#f5f5f5',_,_,_,_,_,_],
        [_,_,_,'#f5f5f5','#f5f5f5','#f5f5f5','#f5f5f5','#f5f5f5','#f5f5f5','#f5f5f5','#f5f5f5','#f5f5f5',_,_],
        [_,_,'#f5f5f5','#f5f5f5','#fafafa','#fafafa','#fafafa','#fafafa','#f5f5f5','#f5f5f5',_,'#f5f5f5',_,_],
        [_,_,'#f5f5f5','#fafafa','#fafafa','#fafafa','#fafafa','#fafafa','#fafafa','#f5f5f5',_,_,'#f5f5f5',_],
        [_,_,_,'#f5f5f5','#f5f5f5',_,_,'#f5f5f5','#f5f5f5',_,_,_,_,_],
        [_,_,_,'#f5f5f5','#f5f5f5',_,_,'#f5f5f5','#f5f5f5',_,_,_,_,_],
        [_,_,'#f5f5f5','#f5f5f5',_,_,_,_,'#f5f5f5','#f5f5f5',_,_,_,_],
      ]
    ],
    walk: null, sniff: null, dig: null, sit: null
  },
};

// 为有独立 idle 但没有其他动画的犬种，从柴犬模板换色补全
function generatePetSprites() {
  const shibaData = PET_SPRITES.shiba;
  Object.keys(PET_SPRITES).forEach(key => {
    if (key === 'shiba') return;
    const pet = PET_SPRITES[key];
    // 需要从该犬种自己的 idle 帧推断主色和腹色
    const frame0 = pet.idle?.[0];
    if (!frame0) return;

    // 收集颜色集合（找出主色和腹色）
    const colorMap = {};
    frame0.forEach(row => row.forEach(c => { if (c && c !== W && c !== E && c !== N && c !== '#4af' && c !== '#333' && c !== '#8B7355') colorMap[c] = (colorMap[c]||0)+1; }));
    const sorted = Object.entries(colorMap).sort((a,b) => b[1]-a[1]);
    const mainC = sorted[0]?.[0];
    const bellyC = sorted[1]?.[0] || mainC;

    // 用柴犬作为基础，替换颜色生成缺失动画
    function remap(matrix) {
      return matrix.map(row => row.map(c => {
        if (c === O) return mainC;
        if (c === C) return bellyC;
        if (c === E) return key === 'husky' ? '#4af' : E;
        return c;
      }));
    }

    ['walk','sniff','dig','sit'].forEach(anim => {
      if (!pet[anim] && shibaData[anim]) {
        pet[anim] = shibaData[anim].map(f => remap(f));
      }
    });
  });
}

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

const PARTICLE_COLORS = ['#f1c40f', '#f39c12', '#e67e22', '#d4ac0d'];

generatePetSprites();
