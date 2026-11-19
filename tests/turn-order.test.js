import { buildSettlementOrder } from '../src/game/TurnController.js';
import { test, assertDeepEqual } from './runner.js';

test('双方等长时 Boss 先行交替', () => {
  assertDeepEqual(
    buildSettlementOrder(2, 2),
    [
      { actor: 'boss', index: 0 },
      { actor: 'player', index: 0 },
      { actor: 'boss', index: 1 },
      { actor: 'player', index: 1 },
    ],
    '交替顺序',
  );
});

test('玩家先耗尽时 Boss 连续执行', () => {
  assertDeepEqual(
    buildSettlementOrder(3, 1),
    [
      { actor: 'boss', index: 0 },
      { actor: 'player', index: 0 },
      { actor: 'boss', index: 1 },
      { actor: 'boss', index: 2 },
    ],
    '玩家耗尽后 Boss 继续',
  );
});

test('Boss 耗尽时玩家继续', () => {
  assertDeepEqual(
    buildSettlementOrder(1, 3),
    [
      { actor: 'boss', index: 0 },
      { actor: 'player', index: 0 },
      { actor: 'player', index: 1 },
      { actor: 'player', index: 2 },
    ],
    'Boss 耗尽后玩家继续',
  );
});
