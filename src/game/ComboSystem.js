// 连招系统：配置化 pattern + 断连规则；加成落在 pattern 最后一个操作。
// interruptOn 为空数组即「不断连」，无需改代码。

import { round1 } from '../utils/math.js';

export class ComboSystem {
  constructor({ combos }) {
    this.combos = combos;
  }

  matchPlayer(commands, { bossId, enabledComboIds = null }) {
    const sequence = commands.map((command, index) => ({
      index,
      seq: command.seq,
      token: command.kind === 'attack' ? command.attackType : command.kind,
      weaponId: command.weaponId,
      isAttack: command.kind === 'attack',
    }));
    return this.matchSequence(sequence, { owner: 'player', bossId, enabledComboIds });
  }

  matchBoss(intentItems, { bossId, enabledComboIds = null }) {
    const sequence = intentItems.map((item, index) => ({
      index,
      seq: item.seq,
      token: item.actionId,
      weaponId: null,
      isAttack: true,
    }));
    return this.matchSequence(sequence, { owner: 'boss', bossId, enabledComboIds });
  }

  matchSequence(sequence, { owner, bossId, enabledComboIds }) {
    const bonuses = new Map();
    const events = [];

    for (const combo of this.combos) {
      if (combo.owner !== owner) continue;
      if (enabledComboIds && !enabledComboIds.includes(combo.id)) continue;
      if (combo.scope === 'boss' && combo.bossId !== bossId) continue;
      if (!Array.isArray(combo.pattern) || combo.pattern.length === 0) continue;

      // 预留: match.consecutive === false 的「非连续匹配」尚未实现，
      // 当前仅支持连续序列；所有现有配置均为 consecutive: true。
      const interruptOn = combo.match?.interruptOn ?? [];
      const breakMode = combo.match?.breakMode ?? 'reset';
      const pattern = combo.pattern;
      let history = [];

      for (const entry of sequence) {
        if (interruptOn.includes(entry.token)) {
          if (breakMode === 'reset') history = [];
          continue;
        }
        // 不属于 pattern 的操作（如药品 / 切换）在未列入 interruptOn 时不参与匹配，
        // 这样把 interruptOn 置空即可实现「不断连」，无需改代码。
        if (!pattern.includes(entry.token)) continue;
        history.push(entry);
        if (history.length < pattern.length) continue;

        const window = history.slice(-pattern.length);
        const matched = window.every((item, index) => item.token === pattern[index]);
        if (!matched) continue;

        if (combo.scope === 'weapon') {
          const ending = window[window.length - 1];
          if (ending.weaponId !== combo.weaponId) continue;
        }

        const targets = combo.applyTo === 'patternAllOps' ? window : [window[window.length - 1]];
        for (const target of targets) {
          const previous = bonuses.get(target.index);
          bonuses.set(target.index, {
            comboId: combo.id,
            name: combo.name,
            damageMultiplier: Math.max(previous?.damageMultiplier ?? 1, combo.bonus?.damageMultiplier ?? 1),
            extraBossRageCut: round1((previous?.extraBossRageCut ?? 0) + (combo.bonus?.extraBossRageCut ?? 0)),
          });
        }

        const last = window[window.length - 1];
        events.push({
          owner,
          comboId: combo.id,
          name: combo.name,
          applyAtSeq: last.seq,
        });

        // 已触发的连招不跨段重复计算
        if (breakMode === 'reset') history = [];
      }
    }

    return { bonuses, events };
  }
}
