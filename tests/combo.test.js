import { ComboSystem } from '../src/game/ComboSystem.js';
import { test, assertEqual, assert } from './runner.js';

const baseCombo = {
  id: 'combo_basic',
  name: '基础连招',
  owner: 'player',
  scope: 'global',
  weaponId: null,
  bossId: null,
  pattern: ['normal', 'special', 'normal'],
  match: { consecutive: true, interruptOn: ['defend', 'item', 'switch'], breakMode: 'reset' },
  bonus: { damageMultiplier: 1.1, extraBossRageCut: 4 },
  applyTo: 'patternLastOp',
  unlock: { type: 'none', id: null },
};

function command(kind, attackType, seq) {
  return {
    seq,
    kind,
    attackType,
    weaponId: 'sword_single',
  };
}

test('普攻 → 特殊 → 普攻 触发连招且加成落在最后一条', () => {
  const system = new ComboSystem({ combos: [baseCombo] });
  const result = system.matchPlayer(
    [command('attack', 'normal', 1), command('attack', 'special', 2), command('attack', 'normal', 3)],
    { bossId: 'boss_01' },
  );
  assertEqual(result.bonuses.size, 1, '应有一处加成');
  const bonus = result.bonuses.get(2);
  assert(bonus, '加成应落在下标 2');
  assertEqual(bonus.damageMultiplier, 1.1, '伤害倍率');
  assertEqual(bonus.extraBossRageCut, 4, '额外削杀气');
  assertEqual(result.events[0].applyAtSeq, 3, '标记落点 seq');
});

test('插入防御后断连', () => {
  const system = new ComboSystem({ combos: [baseCombo] });
  const result = system.matchPlayer(
    [
      command('attack', 'normal', 1),
      command('defend', null, 2),
      command('attack', 'special', 3),
      command('attack', 'normal', 4),
    ],
    { bossId: 'boss_01' },
  );
  assertEqual(result.bonuses.size, 0, '防御应断连');
});

test('interruptOn 置空后不断连', () => {
  const noInterrupt = {
    ...baseCombo,
    match: { consecutive: true, interruptOn: [], breakMode: 'reset' },
  };
  const system = new ComboSystem({ combos: [noInterrupt] });
  const result = system.matchPlayer(
    [
      command('attack', 'normal', 1),
      command('defend', null, 2),
      command('attack', 'special', 3),
      command('attack', 'normal', 4),
    ],
    { bossId: 'boss_01' },
  );
  assertEqual(result.bonuses.size, 1, '置空 interruptOn 后应继续匹配');
});

test('Boss 阶段未启用连招时不触发', () => {
  const bossCombo = {
    ...baseCombo,
    id: 'combo_boss_double',
    owner: 'boss',
    scope: 'boss',
    bossId: 'boss_01',
    pattern: ['b_slash', 'b_heavy'],
    match: { consecutive: true, interruptOn: [], breakMode: 'reset' },
    bonus: { damageMultiplier: 1.15, extraBossRageCut: 0 },
  };
  const system = new ComboSystem({ combos: [bossCombo] });
  const items = [
    { seq: 1, actionId: 'b_slash' },
    { seq: 2, actionId: 'b_heavy' },
  ];
  const disabled = system.matchBoss(items, { bossId: 'boss_01', enabledComboIds: [] });
  assertEqual(disabled.bonuses.size, 0, '未启用时不触发');
  const enabled = system.matchBoss(items, { bossId: 'boss_01', enabledComboIds: ['combo_boss_double'] });
  assertEqual(enabled.bonuses.size, 1, '启用后触发');
});
