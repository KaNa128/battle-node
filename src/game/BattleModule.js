// 对外唯一门面：外部只能通过 BattleModule 启动、提交与接收结果。
// 额外暴露给 UI 的 subscribe / enqueue / undo / submitPlan / getSnapshot 仍属于门面，
// 不直接暴露 BattleEngine、BossAI 等内部模块。

import { EventBus } from '../utils/EventBus.js';
import { deepClone } from '../utils/deepClone.js';
import { Rng } from './Rng.js';
import { RunState } from '../state/RunState.js';
import { BattleState } from '../state/BattleState.js';
import { BattleEngine } from './BattleEngine.js';

export class BattleModule {
  constructor({ config, rng = new Rng(), bus = new EventBus() }) {
    this.config = config;
    this.rng = rng;
    this.bus = bus;
    this.resultHandlers = new Set();
    this.engine = null;
    this.runState = null;
    this.battleState = null;
    this.aborted = false;
  }

  start({ bossId, scaling, playerSavedData }) {
    if (!bossId) throw new Error('BattleModule.start: bossId 必填');
    const bossConfig = this.config.bosses.bosses.find((boss) => boss.id === bossId);
    if (!bossConfig) throw new Error(`BattleModule.start: 未知 bossId：${bossId}`);

    this.aborted = false;
    this.runState = new RunState({ config: this.config, savedData: playerSavedData ?? null });
    this.battleState = new BattleState({
      config: this.config,
      bossConfig,
      runState: this.runState,
      scaling,
    });
    this.engine = new BattleEngine({
      config: this.config,
      runState: this.runState,
      battleState: this.battleState,
      bossConfig,
      rng: this.rng,
      bus: this.bus,
      onFinish: (result, events) => this.finish(result, events),
    });
    this.engine.start();
    return this.getSnapshot();
  }

  // 战后输出：drops 本版恒为空数组。
  finish(result, events) {
    if (this.aborted) return;
    this.runState.hp = this.battleState.player.hp;
    const payload = {
      result,
      playerSavedData: this.runState.toSavedData(),
      drops: [],
      battleLog: events.map((event) => deepClone(event)),
    };
    for (const handler of [...this.resultHandlers]) {
      handler(deepClone(payload));
    }
  }

  onResult(handler) {
    this.resultHandlers.add(handler);
    return () => this.resultHandlers.delete(handler);
  }

  abort() {
    this.aborted = true;
    this.engine?.abort();
    this.bus.clear();
  }

  // ---- UI 桥接（仍由门面转发，UI 不接触内部模块） ----

  subscribe(handler) {
    return this.bus.on('event', handler);
  }

  enqueue(panelKey) {
    return this.engine.enqueue(panelKey);
  }

  undo() {
    return this.engine.undo();
  }

  submitPlan() {
    return this.engine.submitPlan();
  }

  getSnapshot() {
    return this.engine.getSnapshot();
  }
}
