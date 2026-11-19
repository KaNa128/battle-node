// 演出排程：逻辑层不直接计时，所有动画完成回调都通过可注入的 Scheduler。

export class Scheduler {
  wait(ms) {
    if (!ms || ms <= 0) return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
