// 回合调度：Boss 意图生成、连招预判、交替结算计划生成。

export function buildSettlementOrder(bossCount, playerCount) {
  const order = [];
  let boss = 0;
  let player = 0;
  while (boss < bossCount || player < playerCount) {
    if (boss < bossCount) {
      order.push({ actor: 'boss', index: boss });
      boss += 1;
    }
    if (player < playerCount) {
      order.push({ actor: 'player', index: player });
      player += 1;
    }
  }
  return order;
}

export class TurnController {
  constructor({ bossAI, comboSystem, bossConfig }) {
    this.bossAI = bossAI;
    this.comboSystem = comboSystem;
    this.bossConfig = bossConfig;
  }

  generateIntent(battleState) {
    return this.bossAI.createIntent({
      turn: battleState.turn,
      hp: battleState.boss.hp,
      maxHp: battleState.boss.maxHp,
    });
  }

  // PRE_CHECK：玩家连招按队列判定；Boss 连招仅启用当前阶段 comboIds。
  preCheck({ intent, commands, bossId }) {
    const phase = this.bossConfig.phases.find((item) => item.id === intent?.phaseId);
    const enabledComboIds = phase?.comboIds ?? [];
    const playerResult = this.comboSystem.matchPlayer(commands, { bossId });
    const bossResult = this.comboSystem.matchBoss(intent?.items ?? [], {
      bossId,
      enabledComboIds,
    });
    return {
      playerBonuses: playerResult.bonuses,
      bossBonuses: bossResult.bonuses,
      comboEvents: [...playerResult.events, ...bossResult.events],
    };
  }

  buildPlan(intent, commands) {
    return buildSettlementOrder(intent?.items?.length ?? 0, commands.length);
  }
}
