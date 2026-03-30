/**
 * pixelart.js - 星露谷风格像素艺术绘制工具 + 全部精灵定义
 * 采用 16-bit RPG 风格，具有明确的上下左右方向、阴影和层次感。
 * 统一渲染比例 scale=3, PX=1
 */

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
  SCALE: 3, // 星露谷风格放大倍数

  draw(ctx, matrix, x, y, scale) {
    if (!matrix || !matrix.length) return;
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
    if (!matrix || !matrix.length) return;
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

  drawShadow(ctx, x, y, w, h) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
    ctx.fill();
  }
};

// ===== 调色板 =====
const PAL = {
  WHITE: '#ffffff', CREAM: '#fdf3e7', BROWN: '#7d4a2b', DARK_BROWN: '#4f2d19',
  BLACK: '#1a1a1a', ORANGE: '#d97621', GRAY: '#8c8c8c', LIGHT_GRAY: '#c2c2c2',
  GOLDEN: '#d49b28', SPOTTED: '#b38259',
  SKIN: '#f2c19e', SKIN_S: '#d9a37e',
  HAIR_BLACK: '#2b2b2b', HAIR_BROWN: '#5e3820',
  SHIRT_BLUE: '#3b70ad', SHIRT_BLUE_S: '#2a5587',
  SHIRT_RED: '#b53131', SHIRT_GREEN: '#3b8c4d', SHIRT_PURPLE: '#7a3e91',
  PANTS: '#383e57', PANTS_L: '#4a5373', SHOE: '#362922', SHOE_L: '#4d3a30',
  GRASS1: '#4a8522', GRASS2: '#3b6e19', GRASS3: '#549c25',
  PATH: '#c29d61', PATH_DARK: '#9c7b48', PATH_LIGHT: '#d6b278',
  WATER: '#3b7ba1', WATER_LIGHT: '#509bd1', WATER_DARK: '#295b7a',
  TREE_TRUNK: '#5c3924', TREE_TRUNK_L: '#7a4e32', TREE_TRUNK_D: '#3d2517',
  TREE_LEAVES: '#2e6b36', TREE_LEAVES2: '#1d4a23', TREE_LEAVES3: '#3b8745',
  BENCH_WOOD: '#9c6b3e', BENCH_DARK: '#6b4728',
  STONE: '#858b91', STONE_DARK: '#5f656b', STONE_LIGHT: '#aeb5bd',
  REED: '#5e8c44', REED_TOP: '#a0b37f',
  FLOWER_RED: '#db3b3b', FLOWER_YELLOW: '#e6bd22', FLOWER_BLUE: '#3883d6', FLOWER_PINK: '#db67b2',
  GOLD: '#f5c327', LEASH: '#7a4928',
};

// 缩写
const _ = null;
const S = PAL.SKIN, Ss = PAL.SKIN_S, H = PAL.HAIR_BROWN;
const Hh = '#7a4a30'; // 头发高光
const W = '#ffffff', Ew = '#3366aa'; // 眼白、蓝色瞳孔
const Eh = '#aaddff'; // 眼睛高光
const B = PAL.SHIRT_BLUE, Bs = PAL.SHIRT_BLUE_S, Bh = '#5599cc'; // 衬衫高光
const Pn = PAL.PANTS, Pl = PAL.PANTS_L, Sh = PAL.SHOE, Sl = PAL.SHOE_L;
const Ns = '#d4956a'; // 鼻子/嘴的肤色暗部

// ===== 星露谷风格 主人角色 (12x20) 大头2头身 =====
const OWNER_SPRITES = {
  down_idle: [[
    [_,_,_,H,H,H,H,H,H,_,_,_],
    [_,_,H,H,H,Hh,H,H,H,H,_,_],
    [_,H,H,H,Hh,Hh,H,H,H,H,H,_],
    [_,H,H,H,H,H,H,H,H,H,H,_],
    [_,H,S,S,S,S,S,S,S,S,H,_],
    [_,H,S,W,Ew,S,S,W,Ew,S,H,_],
    [_,_,S,S,S,S,S,S,S,S,_,_],
    [_,_,S,S,S,Ns,S,S,S,_,_,_],
    [_,_,_,S,S,S,S,S,_,_,_,_],
    [_,_,_,_,Bs,Bs,Bs,Bs,_,_,_,_],
    [_,_,_,B,B,B,B,B,B,_,_,_],
    [_,_,B,B,B,Bh,Bh,B,B,B,_,_],
    [_,S,B,B,B,B,B,B,B,B,S,_],
    [_,S,B,B,B,B,B,B,B,B,S,_],
    [_,_,_,B,B,B,B,B,B,_,_,_],
    [_,_,_,Pn,Pn,_,_,Pn,Pn,_,_,_],
    [_,_,_,Pn,Pn,_,_,Pn,Pn,_,_,_],
    [_,_,_,Pn,Pl,_,_,Pn,Pl,_,_,_],
    [_,_,_,Sh,Sh,_,_,Sh,Sh,_,_,_],
    [_,_,Sh,Sh,Sl,_,_,Sh,Sh,Sl,_,_],
  ]],
  down_walk: [
    [
      [_,_,_,H,H,H,H,H,H,_,_,_],
      [_,_,H,H,H,Hh,H,H,H,H,_,_],
      [_,H,H,H,Hh,Hh,H,H,H,H,H,_],
      [_,H,H,H,H,H,H,H,H,H,H,_],
      [_,H,S,S,S,S,S,S,S,S,H,_],
      [_,H,S,W,Ew,S,S,W,Ew,S,H,_],
      [_,_,S,S,S,S,S,S,S,S,_,_],
      [_,_,S,S,S,Ns,S,S,S,_,_,_],
      [_,_,_,S,S,S,S,S,_,_,_,_],
      [_,_,_,_,Bs,Bs,Bs,Bs,_,_,_,_],
      [_,_,_,B,B,B,B,B,B,_,_,_],
      [_,_,B,B,B,Bh,Bh,B,B,B,_,_],
      [_,S,B,B,B,B,B,B,B,B,S,_],
      [_,S,B,B,B,B,B,B,B,B,S,_],
      [_,_,_,B,B,B,B,B,B,_,_,_],
      [_,_,_,Pn,Pn,_,_,Pn,Pn,_,_,_],
      [_,_,_,Pn,Pn,_,_,Pn,Pn,_,_,_],
      [_,_,Pn,Pl,_,_,_,_,Pn,Pl,_,_],
      [_,_,Sh,Sh,_,_,_,_,_,Sh,_,_],
      [_,_,Sh,Sl,_,_,_,_,Sh,Sh,_,_],
    ],
    [
      [_,_,_,H,H,H,H,H,H,_,_,_],
      [_,_,H,H,H,Hh,H,H,H,H,_,_],
      [_,H,H,H,Hh,Hh,H,H,H,H,H,_],
      [_,H,H,H,H,H,H,H,H,H,H,_],
      [_,H,S,S,S,S,S,S,S,S,H,_],
      [_,H,S,W,Ew,S,S,W,Ew,S,H,_],
      [_,_,S,S,S,S,S,S,S,S,_,_],
      [_,_,S,S,S,Ns,S,S,S,_,_,_],
      [_,_,_,S,S,S,S,S,_,_,_,_],
      [_,_,_,_,Bs,Bs,Bs,Bs,_,_,_,_],
      [_,_,_,B,B,B,B,B,B,_,_,_],
      [_,_,B,B,B,Bh,Bh,B,B,B,_,_],
      [_,S,B,B,B,B,B,B,B,B,S,_],
      [_,S,B,B,B,B,B,B,B,B,S,_],
      [_,_,_,B,B,B,B,B,B,_,_,_],
      [_,_,_,Pn,Pn,_,_,Pn,Pn,_,_,_],
      [_,_,_,Pn,Pn,_,_,Pn,Pn,_,_,_],
      [_,_,_,Pn,Pl,_,_,Pn,Pl,_,_,_],
      [_,_,_,Sh,_,_,_,Sh,Sh,_,_,_],
      [_,_,Sh,Sh,_,_,_,_,Sh,Sl,_,_],
    ]
  ],
  up_idle: [[
    [_,_,_,H,H,H,H,H,H,_,_,_],
    [_,_,H,H,H,Hh,Hh,H,H,H,_,_],
    [_,H,H,H,Hh,Hh,H,H,H,H,H,_],
    [_,H,H,H,H,H,H,H,H,H,H,_],
    [_,H,H,H,H,H,H,H,H,H,H,_],
    [_,H,H,H,H,H,H,H,H,H,H,_],
    [_,_,H,H,H,H,H,H,H,H,_,_],
    [_,_,_,Ss,Ss,Ss,Ss,Ss,_,_,_,_],
    [_,_,_,S,S,S,S,S,_,_,_,_],
    [_,_,_,_,Bs,Bs,Bs,Bs,_,_,_,_],
    [_,_,_,B,B,B,B,B,B,_,_,_],
    [_,_,B,B,B,B,B,B,B,B,_,_],
    [_,S,B,B,B,B,B,B,B,B,S,_],
    [_,S,B,B,B,B,B,B,B,B,S,_],
    [_,_,_,B,B,B,B,B,B,_,_,_],
    [_,_,_,Pn,Pn,_,_,Pn,Pn,_,_,_],
    [_,_,_,Pn,Pn,_,_,Pn,Pn,_,_,_],
    [_,_,_,Pn,Pl,_,_,Pn,Pl,_,_,_],
    [_,_,_,Sh,Sh,_,_,Sh,Sh,_,_,_],
    [_,_,Sh,Sh,Sl,_,_,Sh,Sh,Sl,_,_],
  ]],
  up_walk: [
    [
      [_,_,_,H,H,H,H,H,H,_,_,_],
      [_,_,H,H,H,Hh,Hh,H,H,H,_,_],
      [_,H,H,H,Hh,Hh,H,H,H,H,H,_],
      [_,H,H,H,H,H,H,H,H,H,H,_],
      [_,H,H,H,H,H,H,H,H,H,H,_],
      [_,H,H,H,H,H,H,H,H,H,H,_],
      [_,_,H,H,H,H,H,H,H,H,_,_],
      [_,_,_,Ss,Ss,Ss,Ss,Ss,_,_,_,_],
      [_,_,_,S,S,S,S,S,_,_,_,_],
      [_,_,_,_,Bs,Bs,Bs,Bs,_,_,_,_],
      [_,_,_,B,B,B,B,B,B,_,_,_],
      [_,_,B,B,B,B,B,B,B,B,_,_],
      [_,S,B,B,B,B,B,B,B,B,S,_],
      [_,S,B,B,B,B,B,B,B,B,S,_],
      [_,_,_,B,B,B,B,B,B,_,_,_],
      [_,_,_,Pn,Pn,_,_,Pn,Pn,_,_,_],
      [_,_,Pn,Pl,_,_,_,_,Pn,Pl,_,_],
      [_,_,Sh,Sh,_,_,_,_,_,Sh,_,_],
      [_,_,Sh,Sl,_,_,_,_,Sh,Sh,_,_],
      [_,_,_,_,_,_,_,_,Sh,Sl,_,_],
    ],
    [
      [_,_,_,H,H,H,H,H,H,_,_,_],
      [_,_,H,H,H,Hh,Hh,H,H,H,_,_],
      [_,H,H,H,Hh,Hh,H,H,H,H,H,_],
      [_,H,H,H,H,H,H,H,H,H,H,_],
      [_,H,H,H,H,H,H,H,H,H,H,_],
      [_,H,H,H,H,H,H,H,H,H,H,_],
      [_,_,H,H,H,H,H,H,H,H,_,_],
      [_,_,_,Ss,Ss,Ss,Ss,Ss,_,_,_,_],
      [_,_,_,S,S,S,S,S,_,_,_,_],
      [_,_,_,_,Bs,Bs,Bs,Bs,_,_,_,_],
      [_,_,_,B,B,B,B,B,B,_,_,_],
      [_,_,B,B,B,B,B,B,B,B,_,_],
      [_,S,B,B,B,B,B,B,B,B,S,_],
      [_,S,B,B,B,B,B,B,B,B,S,_],
      [_,_,_,B,B,B,B,B,B,_,_,_],
      [_,_,_,Pn,Pn,_,_,Pn,Pn,_,_,_],
      [_,_,_,Pn,Pl,_,_,Pn,Pl,_,_,_],
      [_,_,_,Sh,_,_,_,Sh,Sh,_,_,_],
      [_,_,Sh,Sh,_,_,_,_,Sh,Sl,_,_],
      [_,_,Sh,Sl,_,_,_,_,_,_,_,_],
    ]
  ],
  side_idle: [[
    [_,_,_,_,H,H,H,H,H,_,_,_],
    [_,_,_,H,H,H,Hh,H,H,H,_,_],
    [_,_,H,H,H,Hh,Hh,H,H,H,H,_],
    [_,_,H,H,H,H,H,H,H,H,H,_],
    [_,_,H,S,S,S,S,S,S,S,_,_],
    [_,_,H,S,W,Ew,S,S,S,S,_,_],
    [_,_,_,S,S,S,S,S,S,_,_,_],
    [_,_,_,S,S,Ns,S,S,_,_,_,_],
    [_,_,_,_,S,S,S,_,_,_,_,_],
    [_,_,_,_,Bs,Bs,Bs,Bs,_,_,_,_],
    [_,_,_,B,B,B,B,B,B,_,_,_],
    [_,_,_,B,B,Bh,Bh,B,B,_,_,_],
    [_,_,_,B,B,B,B,B,B,S,_,_],
    [_,_,_,B,B,B,B,B,B,S,_,_],
    [_,_,_,_,B,B,B,B,_,_,_,_],
    [_,_,_,_,Pn,Pn,Pn,Pn,_,_,_,_],
    [_,_,_,_,Pn,Pn,Pn,Pn,_,_,_,_],
    [_,_,_,_,Pn,Pl,Pn,Pl,_,_,_,_],
    [_,_,_,_,Sh,Sh,Sh,Sh,_,_,_,_],
    [_,_,_,Sh,Sh,Sl,Sh,Sh,Sl,_,_,_],
  ]],
  side_walk: [
    [
      [_,_,_,_,H,H,H,H,H,_,_,_],
      [_,_,_,H,H,H,Hh,H,H,H,_,_],
      [_,_,H,H,H,Hh,Hh,H,H,H,H,_],
      [_,_,H,H,H,H,H,H,H,H,H,_],
      [_,_,H,S,S,S,S,S,S,S,_,_],
      [_,_,H,S,W,Ew,S,S,S,S,_,_],
      [_,_,_,S,S,S,S,S,S,_,_,_],
      [_,_,_,S,S,Ns,S,S,_,_,_,_],
      [_,_,_,_,S,S,S,_,_,_,_,_],
      [_,_,_,_,Bs,Bs,Bs,Bs,_,_,_,_],
      [_,_,_,B,B,B,B,B,B,_,_,_],
      [_,_,_,B,B,Bh,Bh,B,B,_,_,_],
      [_,_,_,B,B,B,B,B,B,S,_,_],
      [_,_,_,B,B,B,B,B,B,S,_,_],
      [_,_,_,_,B,B,B,B,_,_,_,_],
      [_,_,_,_,Pn,Pn,Pn,Pn,_,_,_,_],
      [_,_,_,Pn,Pl,_,_,Pn,Pl,_,_,_],
      [_,_,_,Sh,Sh,_,_,_,Sh,_,_,_],
      [_,_,Sh,Sh,Sl,_,_,Sh,Sh,_,_,_],
      [_,_,_,_,_,_,_,Sh,Sl,_,_,_],
    ],
    [
      [_,_,_,_,H,H,H,H,H,_,_,_],
      [_,_,_,H,H,H,Hh,H,H,H,_,_],
      [_,_,H,H,H,Hh,Hh,H,H,H,H,_],
      [_,_,H,H,H,H,H,H,H,H,H,_],
      [_,_,H,S,S,S,S,S,S,S,_,_],
      [_,_,H,S,W,Ew,S,S,S,S,_,_],
      [_,_,_,S,S,S,S,S,S,_,_,_],
      [_,_,_,S,S,Ns,S,S,_,_,_,_],
      [_,_,_,_,S,S,S,_,_,_,_,_],
      [_,_,_,_,Bs,Bs,Bs,Bs,_,_,_,_],
      [_,_,_,B,B,B,B,B,B,_,_,_],
      [_,_,_,B,B,Bh,Bh,B,B,_,_,_],
      [_,_,_,B,B,B,B,B,B,S,_,_],
      [_,_,_,B,B,B,B,B,B,S,_,_],
      [_,_,_,_,B,B,B,B,_,_,_,_],
      [_,_,_,_,Pn,Pn,Pn,Pn,_,_,_,_],
      [_,_,_,_,Pn,Pl,_,Pn,Pl,_,_,_],
      [_,_,_,_,Sh,_,_,Sh,Sh,_,_,_],
      [_,_,_,Sh,Sh,_,_,_,Sh,Sl,_,_],
      [_,_,_,Sh,Sl,_,_,_,_,_,_,_],
    ]
  ],
  sit: [[
    [_,_,_,H,H,H,H,H,H,_,_,_],
    [_,_,H,H,H,Hh,H,H,H,H,_,_],
    [_,H,H,H,Hh,Hh,H,H,H,H,H,_],
    [_,H,H,H,H,H,H,H,H,H,H,_],
    [_,H,S,S,S,S,S,S,S,S,H,_],
    [_,H,S,W,Ew,S,S,W,Ew,S,H,_],
    [_,_,S,S,S,S,S,S,S,S,_,_],
    [_,_,S,S,S,Ns,S,S,S,_,_,_],
    [_,_,_,S,S,S,S,S,_,_,_,_],
    [_,_,_,_,Bs,Bs,Bs,Bs,_,_,_,_],
    [_,_,_,B,B,B,B,B,B,_,_,_],
    [_,_,B,B,B,Bh,Bh,B,B,B,_,_],
    [_,S,B,B,B,B,B,B,B,B,S,_],
    [_,S,B,B,B,B,B,B,B,B,S,_],
    [_,_,_,Pn,Pn,Pn,Pn,Pn,Pn,_,_,_],
    [_,_,_,Pn,Pn,Pn,Pn,Pn,Pn,_,_,_],
    [_,_,_,Sh,Sh,_,_,Sh,Sh,_,_,_],
  ]]
};

// ===== NPC老爷爷（灰白头发+绿衣+灰裤） =====
const _gpHair = '#c0c0c0', _gpHairH = '#d8d8d8';
const _gpShirt = '#5a7a5a', _gpShirtH = '#6e946e', _gpShirtS = '#486648';
const _gpPants = '#4a4a4a', _gpPantsL = '#5a5a5a';
const NPC_GRANDPA_SPRITE = {
  down_idle: [[
    [_,_,_,_gpHair,_gpHair,_gpHair,_gpHair,_gpHair,_gpHair,_,_,_],
    [_,_,_gpHair,_gpHair,_gpHairH,_gpHairH,_gpHair,_gpHair,_gpHair,_gpHair,_,_],
    [_,_gpHair,_gpHair,_gpHairH,_gpHairH,_gpHair,_gpHair,_gpHair,_gpHair,_gpHair,_gpHair,_],
    [_,_gpHair,_gpHair,_gpHair,_gpHair,_gpHair,_gpHair,_gpHair,_gpHair,_gpHair,_gpHair,_],
    [_,_gpHair,S,S,S,S,S,S,S,S,_gpHair,_],
    [_,_gpHair,S,W,Ew,S,S,W,Ew,S,_gpHair,_],
    [_,_,S,S,S,S,S,S,S,S,_,_],
    [_,_,S,S,S,Ns,S,S,S,_,_,_],
    [_,_,_,S,S,S,S,S,_,_,_,_],
    [_,_,_,_,_gpShirtS,_gpShirtS,_gpShirtS,_gpShirtS,_,_,_,_],
    [_,_,_,_gpShirt,_gpShirt,_gpShirt,_gpShirt,_gpShirt,_gpShirt,_,_,_],
    [_,_,_gpShirt,_gpShirt,_gpShirt,_gpShirtH,_gpShirtH,_gpShirt,_gpShirt,_gpShirt,_,_],
    [_,S,_gpShirt,_gpShirt,_gpShirt,_gpShirt,_gpShirt,_gpShirt,_gpShirt,_gpShirt,S,_],
    [_,S,_gpShirt,_gpShirt,_gpShirt,_gpShirt,_gpShirt,_gpShirt,_gpShirt,_gpShirt,S,_],
    [_,_,_,_gpShirt,_gpShirt,_gpShirt,_gpShirt,_gpShirt,_gpShirt,_,_,_],
    [_,_,_,_gpPants,_gpPants,_,_,_gpPants,_gpPants,_,_,_],
    [_,_,_,_gpPants,_gpPants,_,_,_gpPants,_gpPants,_,_,_],
    [_,_,_,_gpPants,_gpPantsL,_,_,_gpPants,_gpPantsL,_,_,_],
    [_,_,_,Sh,Sh,_,_,Sh,Sh,_,_,_],
    [_,_,Sh,Sh,Sl,_,_,Sh,Sh,Sl,_,_],
  ]]
};

// ===== 星露谷风格 宠物精灵 4方向 =====
function _petFramesFull(body, belly, eye, nose, accent) {
  const b=body, c=belly, e=eye, n=nose, a=accent||body;
  return {
    down_idle: [[
      [_,_,b,b,_,b,b,_,_],
      [_,b,b,b,b,b,b,b,_],
      [_,b,c,e,c,e,c,b,_],
      [_,b,c,c,n,c,c,b,_],
      [_,b,b,c,c,c,b,b,_],
      [_,_,b,b,b,b,b,_,_],
      [_,_,b,_,_,_,b,_,_],
      [_,b,b,_,_,_,b,b,_],
    ]],
    down_walk: [
      [
        [_,_,b,b,_,b,b,_,_],
        [_,b,b,b,b,b,b,b,_],
        [_,b,c,e,c,e,c,b,_],
        [_,b,c,c,n,c,c,b,_],
        [_,b,b,c,c,c,b,b,_],
        [_,_,b,b,b,b,b,_,_],
        [_,_,_,_,_,_,b,_,_],
        [_,b,b,_,_,_,b,b,_],
      ],
      [
        [_,_,b,b,_,b,b,_,_],
        [_,b,b,b,b,b,b,b,_],
        [_,b,c,e,c,e,c,b,_],
        [_,b,c,c,n,c,c,b,_],
        [_,b,b,c,c,c,b,b,_],
        [_,_,b,b,b,b,b,_,_],
        [_,_,b,_,_,_,_,_,_],
        [_,b,b,_,_,_,b,b,_],
      ]
    ],
    up_idle: [[
      [_,_,b,b,_,b,b,_,_],
      [_,b,b,b,b,b,b,b,_],
      [_,b,b,b,b,b,b,b,_],
      [_,b,b,b,b,b,b,b,_],
      [_,b,b,b,b,b,b,b,_],
      [_,_,b,b,b,b,b,_,_],
      [_,_,b,_,_,_,b,_,_],
      [_,b,b,_,_,_,b,b,_],
    ]],
    up_walk: [
      [
        [_,_,b,b,_,b,b,_,_],
        [_,b,b,b,b,b,b,b,_],
        [_,b,b,b,b,b,b,b,_],
        [_,b,b,b,b,b,b,b,_],
        [_,b,b,b,b,b,b,b,_],
        [_,_,b,b,b,b,b,_,_],
        [_,_,_,_,_,_,b,_,_],
        [_,b,b,_,_,_,b,b,_],
      ],
      [
        [_,_,b,b,_,b,b,_,_],
        [_,b,b,b,b,b,b,b,_],
        [_,b,b,b,b,b,b,b,_],
        [_,b,b,b,b,b,b,b,_],
        [_,b,b,b,b,b,b,b,_],
        [_,_,b,b,b,b,b,_,_],
        [_,_,b,_,_,_,_,_,_],
        [_,b,b,_,_,_,b,b,_],
      ]
    ],
    side_idle: [[
      [_,_,b,b,b,_,_,_,_],
      [_,b,b,b,b,b,_,_,_],
      [_,b,b,c,e,b,b,_,_],
      [_,b,b,c,c,b,n,_,_],
      [a,b,b,c,c,c,b,_,_],
      [_,a,b,b,b,b,_,_,_],
      [_,_,b,_,_,b,_,_,_],
      [_,b,b,_,b,b,_,_,_],
    ]],
    side_walk: [
      [
        [_,_,b,b,b,_,_,_,_],
        [_,b,b,b,b,b,_,_,_],
        [_,b,b,c,e,b,b,_,_],
        [_,b,b,c,c,b,n,_,_],
        [a,b,b,c,c,c,b,_,_],
        [_,a,b,b,b,b,_,_,_],
        [_,_,_,_,_,b,_,_,_],
        [_,b,b,_,b,b,_,_,_],
      ],
      [
        [_,_,b,b,b,_,_,_,_],
        [_,b,b,b,b,b,_,_,_],
        [_,b,b,c,e,b,b,_,_],
        [_,b,b,c,c,b,n,_,_],
        [a,b,b,c,c,c,b,_,_],
        [_,a,b,b,b,b,_,_,_],
        [_,_,b,_,_,_,_,_,_],
        [_,b,b,_,b,b,_,_,_],
      ]
    ],
    sniff: [[
      [_,_,_,b,b,b,_,_,_],
      [_,_,b,b,b,b,b,_,_],
      [a,b,b,c,e,b,b,_,_],
      [_,a,b,c,c,c,b,n,_],
      [_,b,b,c,c,c,b,_,_],
      [_,_,b,b,b,b,_,_,_],
      [_,_,b,_,_,b,_,_,_],
      [_,b,b,_,b,b,_,_,_],
    ]],
    dig: [[
      [_,_,_,b,b,b,_,_,_],
      [_,a,b,b,b,b,b,_,_],
      [a,b,b,c,e,b,b,_,_],
      [_,b,b,c,c,c,b,n,_],
      [_,_,b,b,b,b,_,_,_],
      [_,b,b,_,_,b,b,_,_],
      ['#8B7355','#8B7355','#8B7355',_,_,_,_,_,_],
    ]],
    sit: [[
      [_,_,b,b,_,b,b,_,_],
      [_,b,b,b,b,b,b,b,_],
      [_,b,c,e,c,e,c,b,_],
      [_,b,c,c,n,c,c,b,_],
      [_,_,b,c,c,c,b,_,_],
      [_,_,b,b,b,b,b,a,_],
      [_,b,b,b,b,b,b,a,_],
      [_,b,b,_,_,b,b,_,_],
    ]]
  };
}

const PET_SPRITES = {
  shiba: Object.assign({ name: '柴犬', trait: '活泼好动', color: PAL.ORANGE },
    _petFramesFull(PAL.ORANGE, PAL.CREAM, PAL.BLACK, '#1a1a1a', PAL.ORANGE)),

  husky: Object.assign({ name: '哈士奇', trait: '调皮捣蛋', color: PAL.GRAY },
    _petFramesFull(PAL.GRAY, PAL.WHITE, '#4af', '#1a1a1a', PAL.GRAY)),

  golden: Object.assign({ name: '金毛', trait: '温柔友善', color: PAL.GOLDEN },
    _petFramesFull(PAL.GOLDEN, '#f0d080', PAL.BLACK, '#1a1a1a', PAL.GOLDEN)),

  dalmatian: Object.assign({ name: '斑点狗', trait: '精力充沛', color: PAL.WHITE },
    _petFramesFull(PAL.WHITE, PAL.WHITE, PAL.BLACK, '#1a1a1a', '#333')),

  labrador: Object.assign({ name: '拉布拉多', trait: '忠诚可靠', color: PAL.DARK_BROWN },
    _petFramesFull(PAL.DARK_BROWN, '#7a4e2c', PAL.BLACK, '#1a1a1a', PAL.DARK_BROWN)),

  samoyed: Object.assign({ name: '萨摩耶', trait: '微笑天使', color: '#f5f5f5' },
    _petFramesFull('#f5f5f5', '#fafafa', PAL.BLACK, '#1a1a1a', '#f5f5f5')),
};

const PARTICLE_COLORS = ['#f5c327', '#d97621', '#db3b3b', '#3b8c4d'];

// ===== 场景元素 (精致化 16-bit 风格) =====
const Tl = PAL.TREE_LEAVES, T2 = PAL.TREE_LEAVES2, T3 = PAL.TREE_LEAVES3;
const Tk = PAL.TREE_TRUNK, TkL = PAL.TREE_TRUNK_L, TkD = PAL.TREE_TRUNK_D;

const SCENE_SPRITES = {
  // 星露谷风格大树
  bigTree: [
    [_,_,_,_,_,_,_,_,_,T2,T2,T2,T2,T2,_,_,_,_,_,_,_,_],
    [_,_,_,_,_,_,_,T2,T2,Tl,Tl,Tl,Tl,Tl,T2,T2,_,_,_,_,_,_],
    [_,_,_,_,_,T2,T2,Tl,Tl,Tl,T3,T3,Tl,Tl,Tl,T2,T2,_,_,_,_,_],
    [_,_,_,_,T2,Tl,Tl,Tl,T3,T3,T3,T3,T3,Tl,Tl,Tl,T2,_,_,_,_,_],
    [_,_,_,T2,Tl,Tl,T3,T3,T3,T3,T3,T3,T3,T3,Tl,Tl,T2,_,_,_,_],
    [_,_,T2,Tl,Tl,T3,T3,T3,T3,T3,T3,T3,T3,T3,T3,Tl,Tl,T2,_,_,_],
    [_,_,T2,Tl,T3,T3,T3,T3,T2,T2,T2,T2,T3,T3,T3,T3,Tl,T2,_,_,_],
    [_,T2,Tl,T3,T3,T3,T2,T2,T2,T2,T2,T2,T2,T3,T3,T3,Tl,T2,_,_],
    [_,T2,Tl,T3,T3,T2,T2,T2,T2,T2,T2,T2,T2,T2,T3,T3,Tl,T2,_,_],
    [T2,Tl,T3,T3,T2,T2,T2,T2,T2,T2,T2,T2,T2,T2,T2,T3,T3,Tl,T2,_],
    [T2,Tl,T3,T3,T2,T2,T2,T2,T2,T2,T2,T2,T2,T2,T2,T3,T3,Tl,T2,_],
    [T2,Tl,Tl,T3,T2,T2,T2,T2,T2,T2,T2,T2,T2,T2,T2,T3,Tl,Tl,T2,_],
    [_,T2,Tl,Tl,T3,T2,T2,T2,T2,T2,T2,T2,T2,T2,T3,Tl,Tl,T2,_,_],
    [_,T2,T2,Tl,Tl,T3,T3,T2,T2,T2,T2,T2,T3,T3,Tl,Tl,T2,T2,_,_],
    [_,_,T2,T2,Tl,Tl,Tl,T3,T3,T3,T3,T3,T3,Tl,Tl,Tl,T2,T2,_,_,_],
    [_,_,_,T2,T2,T2,Tl,Tl,Tl,Tl,Tl,Tl,Tl,Tl,T2,T2,T2,_,_,_,_],
    [_,_,_,_,_,T2,T2,T2,T2,T2,T2,T2,T2,T2,T2,T2,_,_,_,_,_,_],
    [_,_,_,_,_,_,_,_,_,TkD,TkL,Tk,TkD,_,_,_,_,_,_,_,_,_],
    [_,_,_,_,_,_,_,_,_,TkD,TkL,Tk,TkD,_,_,_,_,_,_,_,_,_],
    [_,_,_,_,_,_,_,_,_,TkD,TkL,Tk,TkD,_,_,_,_,_,_,_,_,_],
    [_,_,_,_,_,_,_,_,TkD,TkD,TkL,Tk,TkD,TkD,_,_,_,_,_,_,_,_],
    [_,_,_,_,_,_,_,TkD,TkD,TkL,TkL,Tk,Tk,TkD,TkD,_,_,_,_,_,_,_]
  ],
  roundTree: [
    [_,_,_,_,_,T2,T2,T2,T2,T2,_,_,_,_,_],
    [_,_,_,T2,T2,Tl,Tl,Tl,Tl,T2,T2,_,_,_],
    [_,_,T2,Tl,Tl,Tl,T3,T3,Tl,Tl,T2,_,_],
    [_,T2,Tl,Tl,T3,T3,T3,T3,T3,Tl,Tl,T2,_],
    [_,T2,Tl,T3,T3,T2,T2,T2,T3,T3,Tl,T2,_],
    [T2,Tl,T3,T3,T2,T2,T2,T2,T2,T3,T3,Tl,T2],
    [T2,Tl,T3,T2,T2,T2,T2,T2,T2,T2,T3,Tl,T2],
    [_,T2,Tl,T3,T2,T2,T2,T2,T2,T3,Tl,T2,_],
    [_,T2,T2,Tl,T3,T3,T3,T3,T3,Tl,T2,T2,_],
    [_,_,T2,T2,Tl,Tl,Tl,Tl,Tl,Tl,T2,T2,_,_],
    [_,_,_,T2,T2,T2,T2,T2,T2,T2,T2,_,_,_],
    [_,_,_,_,_,_,TkD,TkL,Tk,TkD,_,_,_,_,_],
    [_,_,_,_,_,_,TkD,TkL,Tk,TkD,_,_,_,_,_],
    [_,_,_,_,_,TkD,TkD,TkL,Tk,TkD,TkD,_,_,_,_],
  ],
  bush: [
    [_,_,_,T2,T2,T2,T2,T2,T2,_,_,_],
    [_,_,T2,Tl,Tl,Tl,Tl,Tl,T2,_,_],
    [_,T2,Tl,Tl,T3,T3,T3,Tl,Tl,T2,_],
    [T2,Tl,T3,T3,T2,T2,T2,T3,T3,Tl,T2],
    [T2,Tl,T3,T2,T2,T2,T2,T2,T3,Tl,T2],
    [_,T2,T2,T2,T2,T2,T2,T2,T2,T2,_]
  ],
  tree: [
    [_,_,_,_,_,_,_,T2,T2,T2,_,_,_,_,_,_],
    [_,_,_,_,_,T2,T2,Tl,Tl,T2,T2,_,_,_,_],
    [_,_,_,_,T2,Tl,Tl,T3,T3,Tl,T2,_,_,_,_],
    [_,_,_,T2,Tl,T3,T3,T2,T2,T3,Tl,T2,_,_,_],
    [_,_,T2,Tl,T3,T2,T2,T2,T2,T3,Tl,T2,_,_],
    [_,T2,Tl,T3,T2,T2,T2,T2,T2,T2,T3,Tl,T2,_],
    [_,T2,Tl,T3,T3,T2,T2,T2,T2,T3,T3,Tl,T2,_],
    [_,_,T2,Tl,Tl,T3,T3,T3,T3,Tl,Tl,T2,_,_],
    [_,_,_,T2,T2,Tl,Tl,Tl,Tl,T2,T2,_,_,_,_],
    [_,_,_,_,_,T2,T2,T2,T2,T2,_,_,_,_,_],
    [_,_,_,_,_,_,TkD,TkL,Tk,TkD,_,_,_,_,_],
    [_,_,_,_,_,_,TkD,TkL,Tk,TkD,_,_,_,_,_],
    [_,_,_,_,_,_,TkD,TkL,Tk,TkD,_,_,_,_,_],
    [_,_,_,_,_,TkD,TkD,TkL,Tk,TkD,TkD,_,_,_,_],
  ],
  crookedTree: [
    [_,_,_,_,_,_,_,_,T2,T2,T2,_,_,_,_],
    [_,_,_,_,_,_,T2,T2,Tl,Tl,T2,T2,_,_],
    [_,_,_,_,_,T2,Tl,Tl,T3,T3,Tl,T2,_,_],
    [_,_,_,_,T2,Tl,T3,T3,T2,T2,T3,Tl,T2,_],
    [_,_,_,T2,Tl,T3,T2,T2,T2,T2,T3,Tl,T2,_],
    [_,_,T2,Tl,T3,T2,T2,T2,T2,T3,T3,Tl,T2,_],
    [_,_,_,T2,Tl,Tl,T3,T3,T3,Tl,Tl,T2,_,_],
    [_,_,_,_,T2,T2,T2,T2,T2,T2,T2,_,_,_],
    [_,_,_,_,_,TkD,TkL,Tk,TkD,_,_,_,_,_],
    [_,_,_,_,TkD,TkL,Tk,TkD,_,_,_,_,_,_],
    [_,_,_,TkD,TkL,Tk,TkD,_,_,_,_,_,_,_],
    [_,_,_,TkD,TkL,Tk,TkD,_,_,_,_,_,_,_],
    [_,_,TkD,TkD,TkL,Tk,TkD,TkD,_,_,_,_,_,_],
  ],
  bench: [
    [_,PAL.BENCH_DARK,PAL.BENCH_DARK,PAL.BENCH_DARK,PAL.BENCH_DARK,PAL.BENCH_DARK,PAL.BENCH_DARK,PAL.BENCH_DARK,PAL.BENCH_DARK,PAL.BENCH_DARK,PAL.BENCH_DARK,PAL.BENCH_DARK,PAL.BENCH_DARK,PAL.BENCH_DARK,PAL.BENCH_DARK,_],
    [PAL.BENCH_DARK,PAL.BENCH_WOOD,PAL.BENCH_WOOD,PAL.BENCH_WOOD,PAL.BENCH_WOOD,PAL.BENCH_WOOD,PAL.BENCH_WOOD,PAL.BENCH_WOOD,PAL.BENCH_WOOD,PAL.BENCH_WOOD,PAL.BENCH_WOOD,PAL.BENCH_WOOD,PAL.BENCH_WOOD,PAL.BENCH_WOOD,PAL.BENCH_WOOD,PAL.BENCH_DARK],
    [PAL.BENCH_DARK,PAL.BENCH_WOOD,PAL.BENCH_WOOD,PAL.BENCH_WOOD,PAL.BENCH_WOOD,PAL.BENCH_WOOD,PAL.BENCH_WOOD,PAL.BENCH_WOOD,PAL.BENCH_WOOD,PAL.BENCH_WOOD,PAL.BENCH_WOOD,PAL.BENCH_WOOD,PAL.BENCH_WOOD,PAL.BENCH_WOOD,PAL.BENCH_WOOD,PAL.BENCH_DARK],
    [PAL.BENCH_DARK,PAL.BENCH_DARK,PAL.BENCH_DARK,PAL.BENCH_DARK,PAL.BENCH_DARK,PAL.BENCH_DARK,PAL.BENCH_DARK,PAL.BENCH_DARK,PAL.BENCH_DARK,PAL.BENCH_DARK,PAL.BENCH_DARK,PAL.BENCH_DARK,PAL.BENCH_DARK,PAL.BENCH_DARK,PAL.BENCH_DARK,PAL.BENCH_DARK],
    [_,PAL.BENCH_DARK,_,_,_,_,_,_,_,_,_,_,_,_,PAL.BENCH_DARK,_],
    [_,PAL.BENCH_DARK,_,_,_,_,_,_,_,_,_,_,_,_,PAL.BENCH_DARK,_],
    [_,PAL.BENCH_DARK,_,_,_,_,_,_,_,_,_,_,_,_,PAL.BENCH_DARK,_],
  ],
  stump: [
    [_,_,_,TkD,TkD,TkD,TkD,TkD,_,_,_],
    [_,_,TkD,'#a88462','#b89574','#b89574','#a88462',TkD,_,_],
    [_,TkD,'#a88462','#c9a785','#b89574','#a88462','#8f6c4c',TkD,_],
    [_,TkD,'#a88462','#b89574','#a88462','#8f6c4c','#8f6c4c',TkD,_],
    [_,_,TkD,TkD,TkD,TkD,TkD,TkD,_,_],
    [_,_,TkD,TkD,TkL,Tk,TkD,TkD,_,_],
    [_,TkD,TkD,TkL,Tk,Tk,TkD,TkD,TkD,_],
  ],
  stone: [
    [_,_,PAL.STONE_DARK,PAL.STONE_DARK,PAL.STONE_DARK,PAL.STONE_DARK,_,_],
    [_,PAL.STONE_DARK,PAL.STONE_LIGHT,PAL.STONE_LIGHT,PAL.STONE,PAL.STONE_DARK,_],
    [PAL.STONE_DARK,PAL.STONE_LIGHT,PAL.STONE,PAL.STONE,PAL.STONE,PAL.STONE,PAL.STONE_DARK],
    [PAL.STONE_DARK,PAL.STONE,PAL.STONE,PAL.STONE_DARK,PAL.STONE_DARK,PAL.STONE_DARK,PAL.STONE_DARK],
    [_,PAL.STONE_DARK,PAL.STONE_DARK,PAL.STONE_DARK,PAL.STONE_DARK,PAL.STONE_DARK,_,_],
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
};

// ===== 道具精灵 =====
const ITEM_SPRITES = {
  bone: [
    [_,PAL.WHITE,PAL.WHITE,_,_,_,PAL.WHITE,PAL.WHITE,_],
    [PAL.WHITE,PAL.WHITE,PAL.WHITE,PAL.WHITE,PAL.WHITE,PAL.WHITE,PAL.WHITE,PAL.WHITE,PAL.WHITE],
    [_,PAL.WHITE,PAL.WHITE,_,_,_,PAL.WHITE,PAL.WHITE,_],
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
  ]
};
