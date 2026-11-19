# Tasks

> 范围：仅修正操作面板手持逻辑、Buff 占位区、序列图标与 Tooltip。
> 规则来源：`combat_rules.md` §8、`project_rules.md` §5/§6、`data_rules.md`。
> 每个任务完成后只做本任务验收，不提前改下一个任务的文件。

## Task 1 面板语义与快照字段

- [x] 1.1 `src/game/PanelState.js`：`derivePanelState()` 返回值增加 `activeWeaponId = currentOrder[0]`、`activeSlot = baseOrder.indexOf(activeWeaponId) === 1 ? 2 : 1`
- [x] 1.2 `src/game/BattleEngine.js`：`resolvePanelBinding()` 普通组改用 `this.runState.normalWeapons[group.slot - 1]`
- [x] 1.3 `src/game/BattleEngine.js`：`getAvailability()` 普通组同步改用固定装备位
- [x] 1.4 `src/game/BattleEngine.js`：`getSnapshot().panel` 追加 `normalWeapons: [...this.runState.normalWeapons]`（其余字段来自 `getPanelState()`）

**验收**：入队 `switch` 后 `enqueue('2.1').command.weaponId === 'two_hand_blade'`；撤回后 `enqueue('1.1').command.weaponId === 'sword_single'`。

## Task 2 ActionPanel 单手持渲染

- [x] 2.1 `src/ui/ActionPanel.js`：只创建一对普通按钮（普攻 / 特殊），`dataset.key` 留空
- [x] 2.2 点击回调改为读取 `button.dataset.key` 后再调用 `onKey`
- [x] 2.3 `render()`：按 `snapshot.panel.activeSlot` 取 `panel.normalGroup` 条目，写入两个按钮的 `dataset.key` 与文案
- [x] 2.4 `render()`：标题使用 `{slot} · {activeWeaponId 对应武器名}`
- [x] 2.5 可用性刷新改为遍历所有按钮并用 `button.dataset.key` 查 `snapshot.availability`
- [x] 2.6 特殊武器 / 药品 / 格挡 / 切换 / 撤回 / 出招逻辑保持不变
- [x] 2.7 操作区改为四列网格：普通武器 `1.1` 上 / `1.2` 下，切换与格挡居中；`3.x`、`4.x`、功能各占一列

**验收**：操作区任意时刻最多一对普通武器按钮；切换、撤回联动与 spec 行为矩阵一致。

## Task 3 Buff 占位区与 Tooltip

- [x] 3.1 `src/state/BattleState.js`：`this.buffs = { player: [], boss: [] }`（保留 `// 预留:` 注释）
- [x] 3.2 `src/game/BattleEngine.js`：`getSnapshot()` 增加 `buffs: deepClone(state.buffs)`
- [x] 3.3 新增 `src/ui/Tooltip.js`：`attachTooltip(el, getContent)`，单例 `.tooltip`，hover + focus，fixed 定位并夹取视口
- [x] 3.4 新增 `src/ui/BuffBar.js`：`render(buffs)`，空态 `.buff-bar__empty`，非空 `.buff-chip` + Tooltip
- [x] 3.5 `src/ui/BattleView.js`：构造 `playerBuffBar` / `bossBuffBar`，渲染时传入 `snapshot.buffs.player` / `.boss`
- [x] 3.6 `config/ui.json`：增加 `label.buffs`、`label.noBuff`、`tooltip.buffEmpty`、`tooltip.buffRemaining`

**验收**：双方杀气条下方各出现横向占位区；空态可悬停出“本场暂无 Buff”。

## Task 4 序列方块图标与 Tooltip

- [x] 4.1 `config/ui.json`：增加 spec 表格中的 `icon.*`、`tooltip.*` 文案
- [x] 4.2 `src/ui/SequenceBar.js`：chip 改为 `.sequence-chip__icon` + `.sequence-chip__seq`，接入 `attachTooltip`
- [x] 4.3 `src/ui/BattleView.js`：`buildQueueItems()` 输出 `{ seq, opId, glyph, tone, tooltip }`
- [x] 4.4 `src/ui/BattleView.js`：抽出 `buildIntentItem(item)`，`buildIntentItems()` 与 `intentRevealed` 回放共用
- [x] 4.5 保留 `data-opid` 与 `highlight(opId)` 的闪烁逻辑

**验收**：玩家攻击悬停显示名称/伤害/耗气/削敌杀气；Boss 意图悬停显示名称/伤害/削我杀气；数值 1 位小数。

## Task 5 样式

- [x] 5.1 `src/styles/battle.css`：新增 `.tooltip` 浮层
- [x] 5.2 `src/styles/battle.css`：新增 `.buff-bar`、`.buff-bar__title`、`.buff-bar__list`、`.buff-bar__empty`、`.buff-chip`
- [x] 5.3 `src/styles/battle.css`：`.sequence-chip` 改为 34×34 方块，序号角标绝对定位，保留 tone 配色与 `chip-pulse`
- [x] 5.4 720px 断点下 Buff 区与序列区可换行、不横向溢出

**验收**：375px 宽无横向滚动；按钮点击区仍 ≥ 44px。

## Task 6 测试与验收

- [x] 6.1 `tests/panel.test.js` 新增用例：

```js
test('切换后 2.x 绑定第二把武器，撤回后恢复', async () => {
  const { module } = await createModule();
  assert(module.enqueue('switch').ok, '切换入队');
  const snapshot = module.getSnapshot();
  assertEqual(snapshot.panel.activeSlot, 2, '当前手持变为第二把');
  assertEqual(snapshot.panel.activeWeaponId, 'two_hand_blade', '当前手持武器');

  const cmd = module.enqueue('2.1');
  assert(cmd.ok, '2.1 可入队');
  assertEqual(cmd.command.weaponId, 'two_hand_blade', '2.1 绑定第二把武器');

  module.undo();
  module.undo();
  assertEqual(module.getSnapshot().panel.activeSlot, 1, '撤回切换后恢复第一把');
  assertEqual(module.enqueue('1.1').command.weaponId, 'sword_single', '1.1 绑定第一把武器');
});
```

- [x] 6.2 运行 `tests/index.html`，原 27 条 + 新增 1 条全绿
- [x] 6.3 浏览器手测 spec 的 9 步验证
- [x] 6.4 自查：无硬编码业务数值、`src/game/` 无 DOM / 无 ui import

**验收**：测试页 28 条全绿；三处 UI 行为符合 `combat_rules.md`。

# Task Dependencies

```text
1 → 2
1 → 6
3 → 5
4 → 5
2, 3, 4, 5 → 6
```

- Task 3 与 Task 4 可并行
- Task 5 依赖 Task 3、Task 4 的 DOM 结构
- Task 6 依赖全部实现完成
