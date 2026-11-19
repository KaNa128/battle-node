// 战斗引擎：回合状态机主循环、事件派发、指令入队与面板可用性。
// 纯逻辑层，不访问 DOM，不 import ui。

import { round1 } from '../utils/math.js';
import { deepClone } from '../utils/deepClone.js';
import { CommandQueue } from './CommandQueue.js';
import { RageSystem } from './RageSystem.js';
import { ComboSystem } from './ComboSystem.js';
import { BossAI } from './BossAI.js';
import { TurnController } from './TurnController.js';
import { CombatResolver } from './CombatResolver.js';
import { derivePanelState } from './PanelState.js';

const EMPTY_RESOLVED = {
  damage: 0,
  rageCost: 0,
  bossRageCut: 0,
  consumesSpecialUse: false,
  heal: null,
};

export class BattleEngine {
  constructor({ config, runState, battleState, bossConfig, rng, bus, onFinish }) {
    this.config = config;
    this.runState = runState;
    this.battleState = battleState;
    this.rng = rng;
    this.bus = bus;
    this.onFinish = onFinish;
    this.events = [];
    this.aborted = false;

    this.weaponsById = new Map(config.weapons.weapons.map((weapon) => [weapon.id, weapon]));
    this.itemsById = new Map(config.items.items.map((item) => [item.id, item]));

    this.commandQueue = new CommandQueue();
    this.rageSystem = new RageSystem({ config, battleState });
    this.comboSystem = new ComboSystem({ combos: config.combos.combos });
    this.bossAI = new BossAI({ bossConfig, config, rng });
    this.bossAI.setScaling(battleState.scaling);
    this.turnController = new TurnController({
      bossAI: this.bossAI,
      comboSystem: this.comboSystem,
      bossConfig,
    });
    this.resolver = new CombatResolver({
      config,
      battleState,
      runState,
      rageSystem: this.rageSystem,
      emit: (type, payload) => this.emit(type, payload),
    });
  }

  start() {
    this.beginTurn();
  }

  abort() {
    this.aborted = true;
  }

  emit(type, payload = {}) {
    if (this.aborted) return;
    const event = {
      type,
      turn: this.battleState.turn,
      actor: payload.actor ?? null,
      target: payload.target ?? null,
      sourceOpId: payload.sourceOpId ?? null,
      value: payload.value ?? null,
      meta: payload.meta ?? {},
    };
    this.events.push(event);
    this.bus.emit('event', event);
  }

  // ---- 回合流程 -------------------------------------------------------

  beginTurn() {
    const state = this.battleState;
    state.turn += 1;
    this.rageSystem.startTurn();
    this.emit('turnStart', { meta: { turn: state.turn } });

    state.phase = 'BOSS_INTENT';

    if (state.boss.breakPending) {
      state.boss.breaking = true;
      state.boss.breakPending = false;
      state.phase = 'BREAK_TURN';
      state.intent = { turn: state.turn, phaseId: null, revealed: true, items: [], cursor: 0 };
      state.phaseId = null;
      this.emit('breakStart', { meta: { turn: state.turn } });
    } else {
      state.phase = 'BOSS_INTENT';
      state.intent = this.turnController.generateIntent(state);
      state.phaseId = state.intent.phaseId;
      this.emit('intentRevealed', {
        meta: { phaseId: state.intent.phaseId, items: deepClone(state.intent.items) },
      });
    }

    state.phase = 'PLAYER_PLANNING';
  }

  submitPlan() {
    const state = this.battleState;
    if (state.result) return;
    if (state.phase !== 'PLAYER_PLANNING') {
      throw new Error(`BattleEngine.submitPlan: 当前阶段 ${state.phase} 不可提交`);
    }

    const commands = this.commandQueue.snapshot();

    state.phase = 'PRE_CHECK';
    const check = this.turnController.preCheck({
      intent: state.intent,
      commands,
      bossId: state.bossId,
    });
    for (const combo of check.comboEvents) {
      this.emit('combo', {
        actor: combo.owner,
        meta: { comboId: combo.comboId, name: combo.name, applyAtSeq: combo.applyAtSeq },
      });
    }

    state.phase = 'SETTLEMENT';
    this.settle(commands, check.playerBonuses, check.bossBonuses);

    if (state.result) {
      state.phase = 'BATTLE_END';
      this.commandQueue.clear();
      this.emit('queueChanged', { meta: { queue: [] } });
      this.emit('battleEnd', { meta: { result: state.result } });
      this.onFinish?.(state.result, this.events);
      return;
    }

    this.turnEnd();
    this.commandQueue.clear();
    this.emit('queueChanged', { meta: { queue: [] } });
    this.beginTurn();
  }

  settle(commands, playerBonuses, bossBonuses) {
    const state = this.battleState;
    const intentItems = state.intent?.items ?? [];
    const plan = this.turnController.buildPlan(state.intent, commands);
    const blockedIndices = new Set();

    for (const step of plan) {
      if (state.result) break;

      if (step.actor === 'boss') {
        // Boss 破防或本回合杀气已归零：剩余操作全部跳过
        if (state.boss.breaking || state.boss.rageZeroThisTurn) {
          this.emit('skip', {
            actor: 'boss',
            sourceOpId: `boss_op_${step.index + 1}`,
            meta: { reason: 'break' },
          });
          continue;
        }
        const paired = commands[step.index];
        if (paired?.kind === 'defend') blockedIndices.add(step.index);
        this.resolver.resolveBossAction(intentItems[step.index], paired, bossBonuses.get(step.index));
        this.checkBattleEnd();
      } else {
        const command = commands[step.index];
        this.resolver.resolvePlayerCommand(command, playerBonuses.get(step.index), {
          defended: blockedIndices.has(step.index),
        });
        this.checkBattleEnd();
      }
    }
  }

  turnEnd() {
    const state = this.battleState;
    state.phase = 'TURN_END';

    if (state.boss.breaking) {
      if (this.config.battleConfig.boss.break.refillAfterBreak) {
        const before = state.boss.rage;
        state.boss.rage = state.boss.maxRage;
        this.emit('rageChange', {
          actor: 'boss',
          target: 'boss',
          value: round1(state.boss.rage - before),
          meta: { side: 'boss', before, after: state.boss.rage, reason: 'breakRefill' },
        });
      }
      state.boss.breaking = false;
      state.boss.breakPending = false;
      state.boss.rageZeroThisTurn = false;
      this.emit('breakEnd', { meta: { turn: state.turn } });
    }

    // 预留: Buff / Debuff 计时在 EffectSystem 接入后于此处递减

    this.emit('turnEnd', { meta: { turn: state.turn } });
  }

  checkBattleEnd() {
    const state = this.battleState;
    if (state.boss.hp <= 0) {
      state.result = 'win';
      return true;
    }
    if (state.player.hp <= 0) {
      state.result = 'lose';
      return true;
    }
    return false;
  }

  // ---- 指令入队与面板 -------------------------------------------------

  getPanelState() {
    return derivePanelState({
      baseOrder: this.battleState.panelOrder,
      specialOrder: this.battleState.specialOrder,
      queue: this.commandQueue,
      switchCooldownRemaining: this.battleState.switchCooldownRemaining,
    });
  }

  resolvePanelBinding(panelKey) {
    const panel = this.config.battleConfig.panel;

    // 键位固定绑定装备位：1.x = 第一把普通武器，2.x = 第二把普通武器。
    for (const group of panel.normalGroup) {
      const weaponId = this.runState.normalWeapons[group.slot - 1];
      if (group.keys.normal === panelKey) return { kind: 'attack', weaponId, attackType: 'normal' };
      if (group.keys.special === panelKey) return { kind: 'attack', weaponId, attackType: 'special' };
    }

    const specialGroup = panel.specialGroup.find((group) => group.key === panelKey);
    if (specialGroup) {
      return { kind: 'attack', weaponId: specialGroup.weaponId, attackType: 'normal' };
    }

    const itemGroup = panel.itemGroup.find((group) => group.key === panelKey);
    if (itemGroup) return { kind: 'item', itemId: itemGroup.itemId };

    if (panelKey === panel.defendKey) return { kind: 'defend' };
    if (panelKey === panel.switchKey) return { kind: 'switch' };
    return null;
  }

  buildCommand(binding, panelKey) {
    if (binding.kind === 'attack') {
      const weapon = this.weaponsById.get(binding.weaponId);
      if (!weapon) throw new Error(`面板 ${panelKey} 指向未知武器：${binding.weaponId}`);
      const attack = weapon.attacks[binding.attackType];
      if (!attack) throw new Error(`面板 ${panelKey} 指向不存在的攻击：${binding.attackType}`);
      return {
        kind: 'attack',
        panelKey,
        weaponId: weapon.id,
        attackType: binding.attackType,
        sourceId: attack.id,
        resolved: {
          damage: round1(attack.damage),
          rageCost: round1(attack.rageCost),
          bossRageCut: round1(attack.bossRageCut),
          consumesSpecialUse: binding.attackType === 'special' && weapon.category === 'normal',
          heal: null,
        },
        effects: [...(attack.effects || [])],
      };
    }

    if (binding.kind === 'item') {
      const item = this.itemsById.get(binding.itemId);
      if (!item) throw new Error(`面板 ${panelKey} 指向未知药品：${binding.itemId}`);
      return {
        kind: 'item',
        panelKey,
        weaponId: null,
        attackType: null,
        sourceId: item.id,
        resolved: { ...EMPTY_RESOLVED, heal: round1(item.heal) },
        effects: [],
      };
    }

    if (binding.kind === 'switch') {
      return {
        kind: 'switch',
        panelKey,
        weaponId: this.getPanelState().currentOrder[0],
        attackType: null,
        sourceId: null,
        resolved: { ...EMPTY_RESOLVED },
        effects: [],
      };
    }

    return {
      kind: 'defend',
      panelKey,
      weaponId: null,
      attackType: null,
      sourceId: null,
      resolved: { ...EMPTY_RESOLVED },
      effects: [],
    };
  }

  getAvailability() {
    const panel = this.config.battleConfig.panel;
    const availability = {};
    const allKeys = [
      ...panel.normalGroup.flatMap((group) => [group.keys.normal, group.keys.special]),
      ...panel.specialGroup.map((group) => group.key),
      ...panel.itemGroup.map((group) => group.key),
      panel.defendKey,
      panel.switchKey,
      panel.undoKey,
      panel.submitKey,
    ];
    for (const key of allKeys) availability[key] = false;

    const state = this.battleState;
    const planning = state.phase === 'PLAYER_PLANNING' && !state.result;
    if (!planning) return availability;

    const queued = this.commandQueue.items;
    const plannedRage = queued
      .filter((command) => command.kind === 'attack')
      .reduce((sum, command) => round1(sum + command.resolved.rageCost), 0);
    const plannedSpecial = queued.filter(
      (command) => command.kind === 'attack' && command.resolved.consumesSpecialUse,
    ).length;
    const plannedItems = {};
    for (const command of queued) {
      if (command.kind === 'item') {
        plannedItems[command.sourceId] = (plannedItems[command.sourceId] || 0) + 1;
      }
    }

    const canAttack = (weaponId, attackType) => {
      const weapon = this.weaponsById.get(weaponId);
      if (!weapon) return false;
      const attack = weapon.attacks[attackType];
      if (!attack) return false;
      if (round1(plannedRage + attack.rageCost) > round1(state.player.rage)) return false;
      if (attackType === 'special' && weapon.category === 'normal') {
        if (state.specialUses.remaining - plannedSpecial <= 0) return false;
      }
      return true;
    };

    for (const group of panel.normalGroup) {
      const weaponId = this.runState.normalWeapons[group.slot - 1];
      availability[group.keys.normal] = canAttack(weaponId, 'normal');
      availability[group.keys.special] = canAttack(weaponId, 'special');
    }
    for (const group of panel.specialGroup) {
      availability[group.key] = canAttack(group.weaponId, 'normal');
    }
    for (const group of panel.itemGroup) {
      if (!group.itemId) continue;
      const remaining = this.runState.getItemRemaining(group.itemId);
      availability[group.key] = remaining - (plannedItems[group.itemId] || 0) > 0;
    }

    const hasSwitchQueued = queued.some((command) => command.kind === 'switch');
    availability[panel.defendKey] = true;
    availability[panel.switchKey] = state.switchCooldownRemaining === 0 && !hasSwitchQueued;
    availability[panel.undoKey] = queued.length > 0;
    availability[panel.submitKey] = true;
    return availability;
  }

  enqueue(panelKey) {
    const state = this.battleState;
    if (state.result || state.phase !== 'PLAYER_PLANNING') {
      return { ok: false, reason: '当前不在排布阶段' };
    }
    const availability = this.getAvailability();
    if (!availability[panelKey]) {
      return { ok: false, reason: '按钮当前不可用' };
    }
    const binding = this.resolvePanelBinding(panelKey);
    if (!binding) return { ok: false, reason: '面板键位不存在' };

    const command = this.commandQueue.push(this.buildCommand(binding, panelKey));
    this.emit('queueChanged', { meta: { queue: this.commandQueue.snapshot() } });
    return { ok: true, command };
  }

  undo() {
    const state = this.battleState;
    if (state.result || state.phase !== 'PLAYER_PLANNING') {
      return { ok: false, reason: '当前不在排布阶段' };
    }
    const removed = this.commandQueue.undo();
    this.emit('queueChanged', { meta: { queue: this.commandQueue.snapshot() } });
    return { ok: Boolean(removed), command: removed };
  }

  getSnapshot() {
    const state = this.battleState;
    return {
      turn: state.turn,
      phase: state.phase,
      bossId: state.bossId,
      bossName: state.bossName,
      phaseId: state.phaseId,
      result: state.result,
      player: {
        hp: state.player.hp,
        maxHp: state.player.maxHp,
        rage: state.player.rage,
        maxRage: state.player.maxRage,
      },
      boss: {
        hp: state.boss.hp,
        maxHp: state.boss.maxHp,
        rage: state.boss.rage,
        maxRage: state.boss.maxRage,
        breaking: state.boss.breaking,
      },
      intent: deepClone(state.intent),
      queue: this.commandQueue.snapshot(),
      panel: {
        ...this.getPanelState(),
        normalWeapons: [...this.runState.normalWeapons],
      },
      equipment: {
        normalWeapons: [...this.runState.normalWeapons],
        specialWeapons: [...this.runState.specialWeapons],
      },
      buffs: deepClone(state.buffs),
      specialUses: { ...state.specialUses },
      items: this.config.items.items.map((item) => ({
        id: item.id,
        name: item.name,
        heal: item.heal,
        usesPerBattle: item.usesPerBattle,
        remaining: this.runState.getItemRemaining(item.id),
      })),
      availability: this.getAvailability(),
      scaling: { ...state.scaling },
    };
  }
}
