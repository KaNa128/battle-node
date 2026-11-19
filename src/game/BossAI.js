// Boss AI：按回合开始血量选阶段，按权重抽取 2~3 条意图，允许重复。

import { round1 } from '../utils/math.js';

export class BossAI {
  constructor({ bossConfig, config, rng }) {
    this.bossConfig = bossConfig;
    this.config = config;
    this.rng = rng;
    this.actionsById = new Map(bossConfig.actions.map((action) => [action.id, action]));
  }

  // 层数缩放后按血量比例映射回基础血量，保证阶段区间仍然适用。
  selectPhase(hp, maxHp) {
    const ratio = maxHp > 0 ? hp / maxHp : 0;
    const baseHp = ratio * this.bossConfig.maxHp;
    const phases = this.bossConfig.phases;
    return (
      phases.find((phase) => baseHp >= phase.hpRange.min && baseHp <= phase.hpRange.max) ??
      phases[phases.length - 1]
    );
  }

  createIntent({ turn, hp, maxHp }) {
    const phase = this.selectPhase(hp, maxHp);
    const globalRange = this.config.battleConfig.turn.bossOps;
    const min = Math.max(globalRange.min, phase.opsPerTurn.min);
    const max = Math.min(globalRange.max, phase.opsPerTurn.max);
    const count = this.rng.int(min, max);

    const weights = phase.actionWeights.filter((item) => (item.weight || 0) > 0);
    const items = [];
    for (let index = 0; index < count; index += 1) {
      const picked = this.rng.pickWeighted(weights);
      const action = this.actionsById.get(picked.actionId);
      if (!action) {
        throw new Error(`BossAI: 行为不存在 ${picked.actionId}`);
      }
      items.push({
        seq: index + 1,
        actionId: action.id,
        name: action.name,
        opType: action.opType,
        damage: round1(action.damage * this.stateDamageScale()),
        playerRageCut: round1(action.playerRageCut * this.stateRageScale()),
        effects: [...(action.effects || [])],
        anim: action.anim,
        animDurationMs: action.animDurationMs,
      });
    }

    return {
      turn,
      phaseId: phase.id,
      revealed: true,
      items,
      cursor: 0,
    };
  }

  setScaling({ damageScale, rageScale }) {
    this.damageScale = damageScale ?? 1;
    this.rageScale = rageScale ?? 1;
  }

  stateDamageScale() {
    return this.damageScale ?? 1;
  }

  stateRageScale() {
    return this.rageScale ?? 1;
  }
}
