// 一局生命周期的唯一写入口：持有 RunState，负责战斗输入与结果合并。
// P0 只做内存态；存档在 SaveManager 接入后由这里统一落盘。

import { RunState } from '../state/RunState.js';
import { deepClone } from '../utils/deepClone.js';

export class RunController {
  constructor({ config, seed = 20261118 }) {
    this.config = config;
    this.seed = seed;
    this.floor = 1;
    this.nodeId = null;
    this.runState = null;
  }

  startRun({ seed, floor = 1 } = {}) {
    if (seed !== undefined) this.seed = seed;
    this.floor = Math.max(1, floor);
    this.nodeId = null;
    this.runState = new RunState({ config: this.config });
    return this.getSnapshot();
  }

  ensureRun() {
    if (!this.runState) this.startRun();
    return this.runState;
  }

  getSnapshot() {
    const run = this.ensureRun();
    // 预留: 接入 SaveManager 后在此读取存档并补全 mapNodes / completedNodeIds。
    return deepClone({
      seed: this.seed,
      floor: this.floor,
      nodeId: this.nodeId,
      hp: run.hp,
      maxHp: run.maxHp,
      normalWeapons: run.normalWeapons,
      specialWeapons: run.specialWeapons,
      items: { ...run.items },
    });
  }

  // 背包只读快照：字段形状与战斗快照的 equipment / items 保持一致。
  getInventorySnapshot() {
    const run = this.ensureRun();
    return {
      equipment: {
        normalWeapons: [...run.normalWeapons],
        specialWeapons: [...run.specialWeapons],
      },
      items: this.config.items.items.map((item) => ({
        id: item.id,
        name: item.name,
        heal: item.heal,
        usesPerBattle: item.usesPerBattle,
        remaining: run.getItemRemaining(item.id),
      })),
    };
  }

  getBattleInput(overrides = {}) {
    const run = this.ensureRun();
    const bossId = overrides.bossId ?? this.config.bosses.bosses[0]?.id;
    if (!bossId) throw new Error('RunController.getBattleInput: 配置中没有任何 Boss');

    if (overrides.nodeId !== undefined) this.nodeId = overrides.nodeId;
    return {
      bossId,
      scaling: overrides.scaling ?? { floor: this.floor },
      playerSavedData: run.toSavedData(),
    };
  }

  applyBattleResult(payload, meta = {}) {
    if (!payload?.playerSavedData) {
      throw new Error('RunController.applyBattleResult: 缺少 playerSavedData');
    }
    this.runState = new RunState({ config: this.config, savedData: payload.playerSavedData });
    if (meta.nodeId !== undefined) this.nodeId = meta.nodeId;
    if (payload.result === 'win') this.floor += 1;
    return this.getSnapshot();
  }
}
