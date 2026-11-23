import { loadConfig } from '../src/data/ConfigLoader.js';
import { validateConfig } from '../src/data/Validator.js';
import { BattleModule } from '../src/game/BattleModule.js';
import { Rng } from '../src/game/Rng.js';
import { BossAI } from '../src/game/BossAI.js';
import { test, assert, assertEqual } from './runner.js';

async function setup(seed = 3) {
  const config = await loadConfig();
  validateConfig(config);
  const module = new BattleModule({ config, rng: new Rng(seed) });
  const events = [];
  module.subscribe((event) => events.push(event));
  let payload = null;
  module.onResult((result) => {
    payload = result;
  });
  module.start({
    bossId: config.bosses.bosses[0].id,
    scaling: { floor: 1 },
    playerSavedData: null,
  });
  return { config, module, events, getPayload: () => payload };
}

test('格挡：玩家伤害减半、杀气减半、Boss 反弹原值', async () => {
  const { config, module, events } = await setup();
  const damageScale = config.battleConfig.defense.damageScale;
  assert(module.enqueue('defend').ok, '格挡入队');
  module.submitPlan();

  const block = events.find((event) => event.type === 'block');
  assert(block, '应产生 block 事件');
  assert(block.meta.blockedDamage > 0, '被格挡伤害应大于 0');
  const expectedCut = block.meta.blockedDamage === 6 ? 1 : 2;
  assertEqual(block.meta.reflectedRageCut, expectedCut, 'Boss 反弹原削减量');

  const blockedDamage = events.find(
    (event) => event.type === 'damage' && event.target === 'player' && event.meta.blocked,
  );
  assert(blockedDamage, '格挡应产生伤害事件');
  const expectedDamage = Math.round(block.meta.blockedDamage * damageScale * 10) / 10;
  assertEqual(blockedDamage.value, expectedDamage, '格挡后伤害应减半');
  assert(blockedDamage.value < block.meta.blockedDamage, '格挡后伤害应小于原始伤害');

  assertEqual(events[0].type, 'turnStart', '回合开始事件在最前');
});

test('结算顺序 Boss 先行', async () => {
  const { module, events } = await setup(11);
  module.enqueue('defend');
  module.enqueue('1.1');
  module.submitPlan();

  const actions = events.filter((event) => ['damage', 'block'].includes(event.type));
  assert(actions.length > 0, '应产生结算动作');
  assertEqual(actions[0].actor, 'boss', '第一条动作来自 Boss');
});

test('Boss 阶段：回合开始血量 50 进入第二阶段', async () => {
  const config = await loadConfig();
  const bossConfig = config.bosses.bosses[0];
  const rng = { int: () => 2, pickWeighted: (items) => items[0] };
  const ai = new BossAI({ bossConfig, config, rng });
  ai.setScaling({ damageScale: 1, rageScale: 1 });

  const phaseOne = ai.createIntent({ turn: 1, hp: 51, maxHp: 100 });
  assertEqual(phaseOne.phaseId, 'phase_1', 'HP 51 属于第一阶段');
  const phaseTwo = ai.createIntent({ turn: 2, hp: 50, maxHp: 100 });
  assertEqual(phaseTwo.phaseId, 'phase_2', 'HP 50 属于第二阶段');
  assertEqual(phaseOne.items.length >= 2, true, '意图条数至少 2');
});

test('完整一局：不行动则败北', async () => {
  const { module, getPayload } = await setup(5);

  let guard = 0;
  while (!getPayload() && guard < 30) {
    guard += 1;
    module.submitPlan();
  }

  const payload = getPayload();
  assert(payload, '战斗应结束并输出结果');
  assertEqual(payload.result, 'lose', '空队列应被 Boss 击败');
  assertEqual(getPayload().drops.length, 0, '失败时 drops 仍为空数组');
});

test('完整一局：胜利、破防与门面输出', async () => {
  const { module, events, getPayload } = await setup(20261118);

  let guard = 0;
  while (!getPayload() && guard < 60) {
    guard += 1;
    const snapshot = module.getSnapshot();
    if (snapshot.result) break;

    module.enqueue('defend');
    if (snapshot.player.hp <= 30 && snapshot.availability['4.1']) module.enqueue('4.1');
    for (const key of ['2.2', '1.2', '3.1', '1.1', '3.2', '2.1']) {
      module.enqueue(key);
    }
    module.submitPlan();
  }

  const payload = getPayload();
  assert(payload, '战斗应结束并输出结果');
  assertEqual(payload.result, 'win', '该策略应获胜');
  assertEqual(Array.isArray(payload.drops) && payload.drops.length === 0, true, 'drops 恒为空数组');
  assert(payload.battleLog.length > 0, '战斗日志非空');
  assert(payload.playerSavedData.normalWeapons.length === 2, '输出玩家存档');
  assert(
    events.some((event) => event.type === 'breakStart'),
    '应触发过 Boss 破防轮空',
  );
  assert(
    events.some((event) => event.type === 'battleEnd' && event.meta.result === 'win'),
    '结束事件携带胜负',
  );
});
