// 数值工具：所有战斗数值统一按 1 位小数收敛，展示统一 toFixed(1)。

export function round1(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    throw new Error(`round1 收到非法数值：${value}`);
  }
  // 加 EPSILON 抵消浮点误差，避免 1.15 * 10 落在 11.4999…
  return Math.round((n + (n >= 0 ? 1 : -1) * Number.EPSILON) * 10) / 10;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function toFixed1(value) {
  return round1(value).toFixed(1);
}

export function percent(value, total) {
  if (!total) return 0;
  return clamp(value / total, 0, 1);
}
