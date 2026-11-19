// 单条操作结算：攻击 / 防御 / 药品 / 切换，产出 SettlementEvent。
// 只读指令快照与当前战斗状态，不访问 DOM。

import { round1 } from '../utils/math.js';

export class CombatResolver {
  constructor({ config, battleState, runState, rageSystem, emit }) {
    this.config = config;
    this.state = battleState;
    this.runState = runState;
    this.rageSystem = rageSystem;
    this.emit = emit;
    this.itemsById = new Map(config.items.items.map((item) => [item.id, item]));
    this.attacksById = new Map();
    for (const weapon of config.weapons.weapons) {
      for (const attack of Object.values(weapon.attacks)) {
        this.attacksById.set(attack.id, attack);
      }
    }
  }

  tickSwitchCooldown() {
    if (this.state.switchCooldownRemaining > 0) {
      this.state.switchCooldownRemaining -= 1;
    }
  }

  resolveBossAction(item, pairedCommand, bonus) {
    const boss = this.state.boss;
    const player = this.state.player;
    const defense = this.config.battleConfig.defense;
    const blocked = pairedCommand?.kind === 'defend';

    if (blocked) {
      const rageCut = round1(item.playerRageCut * defense.bossRageCutScale);
      const playerRage = this.rageSystem.cutPlayerRage(rageCut);
      this.emit('rageChange', {
        actor: 'player',
        target: 'player',
        value: round1(playerRage.after - playerRage.before),
        meta: { side: 'player', before: playerRage.before, after: playerRage.after, reason: 'block' },
      });

      const reflected = defense.reflectOriginalCut ? item.playerRageCut : rageCut;
      const bossRage = this.rageSystem.cutBossRage(reflected);
      this.emit('rageChange', {
        actor: 'player',
        target: 'boss',
        value: round1(bossRage.after - bossRage.before),
        meta: { side: 'boss', before: bossRage.before, after: bossRage.after, reason: 'reflect' },
      });

      this.emit('block', {
        actor: 'boss',
        target: 'player',
        sourceOpId: `boss_op_${item.seq}`,
        value: 0,
        meta: {
          blockedDamage: item.damage,
          reflectedRageCut: reflected,
          animDurationMs: item.animDurationMs,
        },
      });

      if (bossRage.zeroed && !boss.breaking) boss.breakPending = true;
      return { blocked: true, damage: 0 };
    }

    const damage = round1(item.damage * (bonus?.damageMultiplier ?? 1));
    const hpBefore = player.hp;
    player.hp = round1(Math.max(0, round1(hpBefore - damage)));
    this.emit('damage', {
      actor: 'boss',
      target: 'player',
      sourceOpId: `boss_op_${item.seq}`,
      value: damage,
      meta: { hpBefore, hpAfter: player.hp, animDurationMs: item.animDurationMs },
    });

    const rage = this.rageSystem.cutPlayerRage(item.playerRageCut);
    this.emit('rageChange', {
      actor: 'boss',
      target: 'player',
      value: round1(rage.after - rage.before),
      meta: { side: 'player', before: rage.before, after: rage.after, reason: 'bossAttack' },
    });

    return { blocked: false, damage };
  }

  resolvePlayerCommand(command, bonus, { defended = false } = {}) {
    switch (command.kind) {
      case 'attack':
        return this.resolveAttack(command, bonus);
      case 'defend':
        this.tickSwitchCooldown();
        return { executed: !defended, blockedAnother: defended };
      case 'item':
        return this.resolveItem(command);
      case 'switch':
        return this.resolveSwitch(command);
      default:
        throw new Error(`CombatResolver: 未知指令类型 ${command.kind}`);
    }
  }

  resolveAttack(command, bonus) {
    const player = this.state.player;
    const boss = this.state.boss;
    const rage = this.rageSystem.payPlayerRage(command.resolved.rageCost);

    if (rage.status !== 'paid') {
      this.emit('skip', {
        actor: 'player',
        sourceOpId: command.opId,
        meta: { reason: 'rageZero', panelKey: command.panelKey },
      });
      this.emit('rageChange', {
        actor: 'player',
        target: 'player',
        value: round1(rage.after - rage.before),
        meta: {
          side: 'player',
          before: rage.before,
          after: rage.after,
          reason: rage.status === 'refill' ? 'zeroRefill' : 'rageLocked',
        },
      });
      return { executed: false, skipped: true };
    }

    if (rage.before !== rage.after) {
      this.emit('rageChange', {
        actor: 'player',
        target: 'player',
        value: round1(rage.after - rage.before),
        meta: { side: 'player', before: rage.before, after: rage.after, reason: 'attackCost' },
      });
    }

    if (command.resolved.consumesSpecialUse) {
      const before = this.state.specialUses.remaining;
      this.state.specialUses.remaining = Math.max(0, before - 1);
      this.emit('specialUsesChange', {
        actor: 'player',
        value: this.state.specialUses.remaining,
        meta: { before, after: this.state.specialUses.remaining },
      });
    }

    const attack = this.attacksById.get(command.sourceId);
    const damage = round1(command.resolved.damage * (bonus?.damageMultiplier ?? 1));
    const hpBefore = boss.hp;
    boss.hp = round1(Math.max(0, round1(hpBefore - damage)));
    this.emit('damage', {
      actor: 'player',
      target: 'boss',
      sourceOpId: command.opId,
      value: damage,
      meta: { hpBefore, hpAfter: boss.hp, animDurationMs: attack?.animDurationMs ?? 0 },
    });

    const cut = round1(command.resolved.bossRageCut + (bonus?.extraBossRageCut ?? 0));
    const bossRage = this.rageSystem.cutBossRage(cut);
    if (bossRage.before !== bossRage.after) {
      this.emit('rageChange', {
        actor: 'player',
        target: 'boss',
        value: round1(bossRage.after - bossRage.before),
        meta: { side: 'boss', before: bossRage.before, after: bossRage.after, reason: 'attack' },
      });
    }
    if (bossRage.zeroed && !boss.breaking) boss.breakPending = true;

    this.tickSwitchCooldown();
    return { executed: true, damage, bossRageCut: cut };
  }

  resolveItem(command) {
    const item = this.itemsById.get(command.sourceId);
    if (!item) throw new Error(`CombatResolver: 药品不存在 ${command.sourceId}`);

    const player = this.state.player;
    const healAmount = command.resolved.heal ?? item.heal;
    const hpBefore = player.hp;
    player.hp = round1(Math.min(player.maxHp, round1(hpBefore + healAmount)));
    this.runState.consumeItem(command.sourceId);

    this.emit('heal', {
      actor: 'player',
      target: 'player',
      sourceOpId: command.opId,
      value: round1(player.hp - hpBefore),
      meta: {
        hpBefore,
        hpAfter: player.hp,
        itemId: command.sourceId,
        animDurationMs: item.animDurationMs,
      },
    });

    this.tickSwitchCooldown();
    return { executed: true };
  }

  resolveSwitch(command) {
    const state = this.state;
    const fromWeaponId = state.panelOrder[0];
    [state.panelOrder[0], state.panelOrder[1]] = [state.panelOrder[1], state.panelOrder[0]];
    state.switchCooldownRemaining = this.config.battleConfig.switch.cooldownOps;

    this.emit('switch', {
      actor: 'player',
      sourceOpId: command.opId,
      meta: { fromWeaponId, toWeaponId: state.panelOrder[0] },
    });
    return { executed: true };
  }
}
