// BattleState：单场战斗运行时状态，可整体丢弃而不影响 RunState。

import { round1 } from '../utils/math.js';

export class BattleState {
  constructor({ config, bossConfig, runState, scaling }) {
    const floor = Math.max(1, scaling?.floor ?? 1);
    const hpScale = 1 + bossConfig.scaling.hpPerFloor * (floor - 1);
    const damageScale = 1 + bossConfig.scaling.damagePerFloor * (floor - 1);
    const rageScale = 1 + bossConfig.scaling.ragePerFloor * (floor - 1);

    const bossMaxHp = round1(bossConfig.maxHp * hpScale);
    const bossMaxRage = round1(bossConfig.maxRage * rageScale);
    const playerConfig = config.battleConfig.player;

    this.bossId = bossConfig.id;
    this.bossName = bossConfig.name;
    this.turn = 0;
    this.phase = 'BOSS_INTENT';
    this.phaseId = bossConfig.phases[0]?.id ?? null;
    this.scaling = { floor, damageScale, rageScale };

    this.player = {
      hp: runState.hp,
      maxHp: runState.maxHp,
      rage: playerConfig.maxRage,
      maxRage: playerConfig.maxRage,
      zeroRageRefills: 0,
      rageLocked: false,
    };

    this.boss = {
      hp: bossMaxHp,
      maxHp: bossMaxHp,
      rage: bossMaxRage,
      maxRage: bossMaxRage,
      breaking: false,
      breakPending: false,
      rageZeroThisTurn: false,
    };

    this.specialUses = {
      remaining: config.battleConfig.specialUses.initial,
      initial: config.battleConfig.specialUses.initial,
    };

    this.intent = null;
    this.panelOrder = [...runState.normalWeapons];
    this.specialOrder = [...runState.specialWeapons];
    this.switchCooldownRemaining = 0;
    this.buffs = { player: [], boss: [] }; // 预留: Buff / Debuff 在后续批次接入 EffectSystem
    this.result = null;
  }
}
