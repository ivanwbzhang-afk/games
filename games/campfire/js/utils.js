/* ========== Utils ========== */
const Utils = {
  // 随机整数 [min, max]
  randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  // 随机浮点 [min, max)
  randFloat(min, max) {
    return Math.random() * (max - min) + min;
  },

  // 随机选择
  pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  },

  // 线性插值
  lerp(a, b, t) {
    return a + (b - a) * t;
  },

  // 颜色插值 (hex)
  lerpColor(c1, c2, t) {
    const r1 = parseInt(c1.slice(1,3),16), g1 = parseInt(c1.slice(3,5),16), b1 = parseInt(c1.slice(5,7),16);
    const r2 = parseInt(c2.slice(1,3),16), g2 = parseInt(c2.slice(3,5),16), b2 = parseInt(c2.slice(5,7),16);
    const r = Math.round(r1 + (r2-r1)*t), g = Math.round(g1 + (g2-g1)*t), b = Math.round(b1 + (b2-b1)*t);
    return `rgb(${r},${g},${b})`;
  },

  // 缓动函数
  easeInOut(t) {
    return t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t;
  },

  // 获取当前一天中的进度 [0, 1]  0=午夜, 0.5=正午
  getDayProgress() {
    const now = new Date();
    return (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) / 86400;
  },

  // 判断是否为夜晚
  isNight() {
    const p = this.getDayProgress();
    return p < 0.25 || p > 0.80; // 0:00-6:00 or 19:12-24:00
  },

  // 显示通知
  notify(text, duration = 2500) {
    const el = document.getElementById('notification');
    el.textContent = text;
    el.classList.remove('hidden');
    el.style.opacity = '1';
    clearTimeout(el._timer);
    el._timer = setTimeout(() => {
      el.style.opacity = '0';
      setTimeout(() => el.classList.add('hidden'), 400);
    }, duration);
  },

  // 像素块绘制工具
  drawPixelBlock(ctx, x, y, size, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.floor(x), Math.floor(y), size, size);
  },

  // 绘制像素矩阵（二维数组 + 调色板）
  drawPixelMatrix(ctx, matrix, palette, x, y, pixelSize) {
    for (let row = 0; row < matrix.length; row++) {
      for (let col = 0; col < matrix[row].length; col++) {
        const colorIdx = matrix[row][col];
        if (colorIdx === 0) continue; // 透明
        ctx.fillStyle = palette[colorIdx] || '#ff00ff';
        ctx.fillRect(
          Math.floor(x + col * pixelSize),
          Math.floor(y + row * pixelSize),
          pixelSize, pixelSize
        );
      }
    }
  }
};
