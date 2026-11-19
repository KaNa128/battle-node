import { loadConfig } from '../src/data/ConfigLoader.js';
import { validateConfig } from '../src/data/Validator.js';
import { BattleModule } from '../src/game/BattleModule.js';
import { Rng } from '../src/game/Rng.js';
import { derivePanelState } from '../src/game/PanelState.js';
import { test, assert, assertEqual, assertDeepEqual } from './runner.js';

async function createModule(seed = 7) {
  const config = await loadConfig();
  validateConfig(config);
  const module = new BattleModule({ config, rng: new Rng(seed) });
  module.start({ bossId: config.bosses.bosses[0].id, scaling: { floor: 1 }, playerSavedData: null });
  return { module, config };
}

test('面板由队列中的 switch 指令推导', () => {
  const panel = derivePanelState({
    baseOrder: ['sword_single', 'two_hand_blade'],
    specialOrder: ['axe', 'bow'],
    queue: { items: [{ kind: 'switch' }] },
    switchCooldownRemaining: 0,
  });
  assertDeepEqual(panel.currentOrder, ['two_hand_blade', 'sword_single'], '应用一次切换');
});

test('撤回唯一的 switch 后面板回退', async () => {
  const { module } = await createModule();
  const before = module.getSnapshot().panel.currentOrder;
  assertDeepEqual(before, ['sword_single', 'two_hand_blade'], '初始顺序');

  const pushed = module.enqueue('switch');
  assert(pushed.ok, '切换应可入队');
  assertDeepEqual(module.getSnapshot().panel.currentOrder, ['two_hand_blade', 'sword_single'], '切换后顺序');

  module.undo();
  assertDeepEqual(module.getSnapshot().panel.currentOrder, before, '撤回后顺序回退');
});

test('入队即快照，切换不影响已入队指令', async () => {
  const { module } = await createModule();
  assert(module.enqueue('1.1').ok, '1.1 入队');
  const first = module.getSnapshot().queue[0];
  assertEqual(first.weaponId, 'sword_single', '快照武器');
  assertEqual(first.resolved.damage, 5, '快照伤害');

  assert(module.enqueue('switch').ok, '切换入队');
  const snapshot = module.getSnapshot();
  assertEqual(snapshot.queue[0].weaponId, 'sword_single', '已入队武器不变');
  assertEqual(snapshot.queue[0].resolved.damage, 5, '已入队伤害不变');
});

test('杀气累计预扣：超过当前杀气不可入队', async () => {
  const { module } = await createModule();
  assert(module.enqueue('2.2').ok, '第一次特殊攻击');
  assert(module.enqueue('2.2').ok, '第二次特殊攻击');
  assert(module.enqueue('2.2').ok, '第三次特殊攻击');

  let snapshot = module.getSnapshot();
  assertEqual(snapshot.specialUses.remaining, 3, '入队不扣次数池');
  assertEqual(snapshot.availability['1.2'], false, '特殊次数耗尽后按钮置灰');
  assertEqual(snapshot.availability['1.1'], true, '剩余 1 点杀气仍可普攻');

  assert(module.enqueue('1.1').ok, '普攻补满 10 点');
  snapshot = module.getSnapshot();
  assertEqual(snapshot.availability['3.2'], false, '累计 10 点后不可再入队');
  assertEqual(module.enqueue('3.2').ok, false, '超发应被拒绝');
});

test('药品次数按 items.json 扣减入队额度', async () => {
  const { module, config } = await createModule();
  const uses = config.items.items[0].usesPerBattle;
  for (let index = 0; index < uses; index += 1) {
    assert(module.enqueue('4.1').ok, `第 ${index + 1} 次药品`);
  }
  assertEqual(module.getSnapshot().availability['4.1'], false, '药品次数耗尽后置灰');
  assertEqual(module.enqueue('4.1').ok, false, '超用药品应被拒绝');
});

test('切换冷却期间不可再次切换', async () => {
  const { module } = await createModule();
  assert(module.enqueue('switch').ok, '首次切换');
  assertEqual(module.getSnapshot().availability.switch, false, '同回合不可再切');
});

test('切换后 2.x 绑定第二把武器，撤回后恢复', async () => {
  const { module } = await createModule();
  assert(module.enqueue('switch').ok, '切换入队');

  const switched = module.getSnapshot();
  assertEqual(switched.panel.activeSlot, 2, '当前手持变为第二把');
  assertEqual(switched.panel.activeWeaponId, 'two_hand_blade', '当前手持武器');

  const second = module.enqueue('2.1');
  assert(second.ok, '2.1 可入队');
  assertEqual(second.command.weaponId, 'two_hand_blade', '2.1 绑定第二把武器');

  module.undo();
  module.undo();
  const restored = module.getSnapshot();
  assertEqual(restored.panel.activeSlot, 1, '撤回切换后恢复第一把');
  assertEqual(restored.panel.activeWeaponId, 'sword_single', '恢复第一把武器');
  assertEqual(module.enqueue('1.1').command.weaponId, 'sword_single', '1.1 绑定第一把武器');
});

test('撤回为 LIFO', async () => {
  const { module } = await createModule();
  module.enqueue('1.1');
  module.enqueue('switch');
  module.enqueue('2.1');
  const seqs = module.getSnapshot().queue.map((command) => command.seq);
  assertDeepEqual(seqs, [1, 2, 3], '入队序号');

  module.undo();
  assertDeepEqual(module.getSnapshot().queue.map((command) => command.seq), [1, 2], '撤回最后一条');
  module.undo();
  assertDeepEqual(module.getSnapshot().queue.map((command) => command.seq), [1], '不重排序号');
});
