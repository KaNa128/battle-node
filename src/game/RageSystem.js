// 杀气系统：玩家每回合回满、归零跳过与二次归零锁定；Boss 损耗保留与破防标记。

import { round1 } from '../utils/math.js';

export class RageSystem {
  constructor({ config, battleState }) {
    this.config = config;
    this.state = battleState;
  }

  // 回合开始：玩家回满，清零每回合的归零计数与锁定。
  startTurn() {
    const player = this.state.player;
    player.rage = player.maxRage;
    player.zeroRageRefills = 0;
    player.rageLocked = false;
    this.state.boss.rageZeroThisTurn = false;
  }

  // 支付攻击耗气。返回 paid / refill / locked 三种结果。
  // 余额不足或杀气 ≤ 阈值都按「归零」处理；本回合首次归零立刻回满并跳过当前操作。
  payPlayerRage(cost) {
    const player = this.state.player;
    const threshold = this.config.battleConfig.player.zeroRage.threshold;
    const refillLimit = this.config.battleConfig.player.zeroRage.refillPerTurn;
    const before = player.rage;

    if (!player.rageLocked && player.rage > threshold && player.rage >= cost) {
      player.rage = round1(player.rage - cost);
      return { status: 'paid', before, after: player.rage };
    }

    if (!player.rageLocked && player.zeroRageRefills < refillLimit) {
      player.zeroRageRefills += 1;
      player.rage = player.maxRage;
      return { status: 'refill', before, after: player.rage };
    }

    player.rageLocked = true;
    player.rage = 0;
    return { status: 'locked', before, after: player.rage };
  }

  cutBossRage(amount) {
    const boss = this.state.boss;
    const before = boss.rage;
    if (amount > 0) {
      boss.rage = round1(Math.max(0, round1(boss.rage - amount)));
    }
    const zeroed = boss.rage <= 0;
    if (zeroed) {
      boss.rage = 0;
      boss.rageZeroThisTurn = true;
    }
    return { before, after: boss.rage, zeroed };
  }

  cutPlayerRage(amount) {
    const player = this.state.player;
    const before = player.rage;
    player.rage = round1(Math.max(0, round1(player.rage - amount)));
    return { before, after: player.rage };
  }
}
