// 属性汇总：只在 meta 计算，UI 只读快照。
// 当前版本只汇总基础值与装备面板，强化 / 技能树加成在 P4 接入。

import { round1 } from '../utils/math.js';

export function computeStats({ config, runState }) {
  const weaponMap = new Map(config.weapons.weapons.map((weapon) => [weapon.id, weapon]));

  let attackPower = 0;
  for (const weaponId of runState.normalWeapons) {
    attackPower += weaponMap.get(weaponId)?.attacks?.normal?.damage ?? 0;
  }
  for (const weaponId of runState.specialWeapons) {
    attackPower += weaponMap.get(weaponId)?.attacks?.normal?.damage ?? 0;
  }

  return {
    maxHp: round1(runState.maxHp),
    maxRage: round1(config.battleConfig.player.maxRage),
    attackPower: round1(attackPower),
    gold: runState.gold,
    skillPoints: runState.skillPoints,
  };
}
