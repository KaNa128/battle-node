import { RageSystem } from '../src/game/RageSystem.js';
import { test, assert, assertEqual, assertClose } from './runner.js';

const config = {
  battleConfig: {
    player: {
      zeroRage: { threshold: 0, refillPerTurn: 1 },
    },
  },
};

function makeState(rage = 10) {
  return {
    player: { rage, maxRage: 10, zeroRageRefills: 0, rageLocked: false },
    boss: { rage: 30, maxRage: 30, rageZeroThisTurn: false, breaking: false },
  };
}

test('正常支付杀气', () => {
  const state = makeState();
  const system = new RageSystem({ config, battleState: state });
  const result = system.payPlayerRage(3);
  assertEqual(result.status, 'paid', '支付状态');
  assertClose(state.player.rage, 7, '剩余杀气');
});

test('首次归零跳过并立刻回满', () => {
  const state = makeState();
  const system = new RageSystem({ config, battleState: state });
  const result = system.payPlayerRage(11);
  assertEqual(result.status, 'refill', '首次不足应回满');
  assertClose(state.player.rage, 10, '回满后杀气');
  assertEqual(state.player.zeroRageRefills, 1, '回满次数');
});

test('二次归零锁定本回合剩余耗气操作', () => {
  const state = makeState();
  const system = new RageSystem({ config, battleState: state });
  system.payPlayerRage(11);
  const second = system.payPlayerRage(11);
  assertEqual(second.status, 'locked', '二次归零应锁定');
  assertClose(state.player.rage, 0, '锁定后杀气');
  const third = system.payPlayerRage(1);
  assertEqual(third.status, 'locked', '锁定后仍不可支付');
});

test('回合开始重置杀气与锁定', () => {
  const state = makeState(0);
  state.player.rageLocked = true;
  const system = new RageSystem({ config, battleState: state });
  system.startTurn();
  assertClose(state.player.rage, 10, '回合开始回满');
  assertEqual(state.player.rageLocked, false, '解除锁定');
  assertEqual(state.player.zeroRageRefills, 0, '归零次数重置');
});

test('Boss 杀气损耗永久保留并可归零', () => {
  const state = makeState();
  const system = new RageSystem({ config, battleState: state });
  const cut = system.cutBossRage(22);
  assertEqual(cut.zeroed, false, '未归零');
  assertClose(state.boss.rage, 8, '剩余 Boss 杀气');
  const zero = system.cutBossRage(9);
  assertEqual(zero.zeroed, true, '应归零');
  assertClose(state.boss.rage, 0, 'Boss 杀气归零');
  assertEqual(state.boss.rageZeroThisTurn, true, '标记本回合归零');
});

test('round1 收敛一位小数', async () => {
  const { round1 } = await import('../src/utils/math.js');
  assertEqual(round1(0.1 + 0.2), 0.3, '浮点误差收敛');
  assertEqual(round1(1.15), 1.2, '四舍五入');
  assertEqual(round1(2.04), 2, '截断一位小数');
});
