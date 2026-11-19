// 逻辑与 UI 的唯一双向桥：订阅逻辑事件、按顺序回放、转发玩家意图。
// 这里不计算伤害 / 杀气 / 连招，只搬运事件与快照。

import { Scheduler } from '../anim/Scheduler.js';

const EVENT_DURATION = {
  turnStart: 220,
  intentRevealed: 320,
  combo: 420,
  damage: 520,
  block: 480,
  heal: 380,
  rageChange: 120,
  skip: 420,
  breakStart: 600,
  breakEnd: 480,
  switch: 360,
  specialUsesChange: 160,
  turnEnd: 120,
  battleEnd: 700,
};

export class BattlePresenter {
  constructor({ module, view, config, scheduler = new Scheduler() }) {
    this.module = module;
    this.view = view;
    this.config = config;
    this.scheduler = scheduler;
    this.pending = [];
    this.playing = false;
    this.unsubscribe = null;
    this.resultPayload = null;
  }

  start({ bossId, scaling, playerSavedData }) {
    this.unsubscribe = this.module.subscribe((event) => this.handleEvent(event));
    this.module.onResult((payload) => {
      this.resultPayload = payload;
    });

    this.view.setInteractive(false);
    const snapshot = this.module.start({ bossId, scaling, playerSavedData });
    this.view.render(snapshot);
    this.pump();
    return snapshot;
  }

  handleEvent(event) {
    if (event.type === 'queueChanged') {
      // 排布期立即刷新；结算回放期间忽略，播放结束后统一渲染快照
      if (!this.playing) this.view.render(this.module.getSnapshot());
      return;
    }
    this.pending.push(event);
    this.pump();
  }

  async pump() {
    if (this.playing) return;
    this.playing = true;
    this.view.setInteractive(false);

    while (this.pending.length > 0) {
      const event = this.pending.shift();
      this.view.applyEvent(event);
      await this.scheduler.wait(this.durationFor(event));
    }

    this.playing = false;
    const snapshot = this.module.getSnapshot();
    this.view.render(snapshot);

    if (!snapshot.result && snapshot.phase === 'PLAYER_PLANNING') {
      this.view.setInteractive(true);
    } else {
      this.view.setInteractive(false);
    }
  }

  durationFor(event) {
    const fallback = EVENT_DURATION[event.type] ?? 200;
    const animated = event.meta?.animDurationMs;
    return Math.min(animated ? Math.max(animated, 200) : fallback, 700);
  }

  handleKey(key) {
    if (this.playing) return;

    const panel = this.config.battleConfig.panel;
    if (key === panel.submitKey) {
      const snapshot = this.module.getSnapshot();
      if (snapshot.result || snapshot.phase !== 'PLAYER_PLANNING') return;
      this.view.setInteractive(false);
      this.module.submitPlan();
      return;
    }

    if (key === panel.undoKey) {
      this.module.undo();
      this.view.render(this.module.getSnapshot());
      return;
    }

    const result = this.module.enqueue(key);
    if (result.ok) {
      this.view.render(this.module.getSnapshot());
    }
  }

  destroy() {
    this.unsubscribe?.();
    this.pending = [];
  }
}
