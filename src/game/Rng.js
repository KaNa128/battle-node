// 可注入随机源：种子化后同种子同序列，便于测试复现。
// 禁止在业务代码里使用裸 Math.random()。

function mulberry32(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Rng {
  constructor(seed = 0x1a2b3c4d) {
    this.seed = seed >>> 0;
    this.next = mulberry32(this.seed);
  }

  reset(seed = this.seed) {
    this.seed = seed >>> 0;
    this.next = mulberry32(this.seed);
  }

  // 闭区间整数
  int(min, max) {
    if (max < min) throw new Error(`Rng.int 范围非法：${min} ~ ${max}`);
    return min + Math.floor(this.next() * (max - min + 1));
  }

  // 按权重抽取，items 形如 [{ weight }]
  pickWeighted(items) {
    const total = items.reduce((sum, item) => sum + (item.weight || 0), 0);
    if (total <= 0) throw new Error('Rng.pickWeighted 权重之和必须大于 0');

    let roll = this.next() * total;
    for (const item of items) {
      roll -= item.weight || 0;
      if (roll < 0) return item;
    }
    return items[items.length - 1];
  }
}
