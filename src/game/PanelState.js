// 面板派生：currentOrder = 起点顺序逐条应用队列中的 switch 指令。
// 撤回 switch 后面板自动回退，不额外保存面板状态。
// activeSlot 表示当前手持的是第几把普通武器：键位 1.x / 2.x 固定绑定装备位。

export function derivePanelState({ baseOrder, specialOrder, queue, switchCooldownRemaining }) {
  const currentOrder = [...baseOrder];
  for (const command of queue.items) {
    if (command.kind === 'switch') {
      [currentOrder[0], currentOrder[1]] = [currentOrder[1], currentOrder[0]];
    }
  }

  const activeWeaponId = currentOrder[0] ?? null;
  const activeSlot = baseOrder.indexOf(activeWeaponId) === 1 ? 2 : 1;

  return {
    baseOrder: [...baseOrder],
    currentOrder,
    specialOrder: [...specialOrder],
    switchCooldownRemaining,
    activeSlot,
    activeWeaponId,
  };
}
