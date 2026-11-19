# 战斗 UI 规范对齐修正 Spec

## Why

当前 UI 有三处偏离 `combat_rules.md` 与企划书：

1. 操作面板同时渲染武器 1 与武器 2 的按钮，违背“面板只显示当前手持武器、切换只改面板”的规则。
2. 角色区缺少 Buff 展示位，未来 Buff 接入时无落点。
3. 序列区用纯文字表示操作，缺少图标语义与悬停数值说明，当前执行操作难以识别。

本 spec 只修正这三处，不改任何战斗数值、结算顺序与存档结构。

## 现状与根因

| 问题 | 现状 | 根因 |
|---|---|---|
| 面板双武器 | [ActionPanel.js](file:///d:/AICode/src/ui/ActionPanel.js) 按 `panel.normalGroup` 循环创建两组按钮 | 误把“两组键位”当成“两组按钮”，且绑定读取 `currentOrder[slot-1]` |
| 无 Buff 区 | [BattleView.js](file:///d:/AICode/src/ui/BattleView.js) 只有 `StatusBars` 与 `SequenceBar` | 没有 Buff 容器组件 |
| 序列纯文字 | [SequenceBar.js](file:///d:/AICode/src/ui/SequenceBar.js) 输出 `seq + label` 文本 chip | 没有 glyph 与 Tooltip 层 |

## What Changes

### 1. 面板：固定装备位绑定 + 单手持渲染

**键位语义（与 `combat_rules.md` §8 对齐）**

- `1.1 / 1.2` 永远绑定 `runState.normalWeapons[0]`（第一把普通武器）。
- `2.1 / 2.2` 永远绑定 `runState.normalWeapons[1]`（第二把普通武器）。
- 切换只在两把普通武器之间互换 `panelOrder`，**键位不漂移**。

**“当前手持”派生**

- `PanelState.derivePanelState()` 保留原有 `currentOrder` 推导逻辑（`baseOrder` 逐条应用队列中的 `switch`），新增：

```js
const activeWeaponId = currentOrder[0];
const activeIndex = baseOrder.indexOf(activeWeaponId);
const activeSlot = activeIndex === 1 ? 2 : 1;
// 返回 { baseOrder, currentOrder, specialOrder, switchCooldownRemaining,
//        activeSlot, activeWeaponId }
```

**引擎绑定修正**

- `BattleEngine.resolvePanelBinding(panelKey)`：

```js
for (const group of panel.normalGroup) {
  // 改：固定装备位，不再读 currentOrder[slot - 1]
  const weaponId = this.runState.normalWeapons[group.slot - 1];
  if (group.keys.normal === panelKey) return { kind: 'attack', weaponId, attackType: 'normal' };
  if (group.keys.special === panelKey) return { kind: 'attack', weaponId, attackType: 'special' };
}
```

- `BattleEngine.getAvailability()` 中普通武器组同样改为 `this.runState.normalWeapons[group.slot - 1]`；两组键位仍然都计算，供快照使用。
- `getSnapshot().panel` 输出：

```js
panel: {
  ...this.getPanelState(),
  normalWeapons: [...this.runState.normalWeapons],
}
```

**ActionPanel 重构**

- 只创建一组普通武器按钮（普攻 / 特殊），其余特殊武器、药品、格挡、切换、撤回、出招结构不变。
- 按钮不预绑定固定键位；点击时读取当时的 `dataset.key`：

```js
button.addEventListener('click', () => this.onKey(button.dataset.key));
```

- `render(snapshot)` 按 `snapshot.panel.activeSlot` 找到对应 `panel.normalGroup` 条目：

```js
const group = panel.normalGroup.find((entry) => entry.slot === snapshot.panel.activeSlot);
const weaponId = snapshot.panel.activeWeaponId;
this.normalButton.dataset.key = group.keys.normal;
this.specialButton.dataset.key = group.keys.special;
// 标题："{slot} · {weaponName}"
// 文案："1.1 普攻" / "1.2 特殊 (剩余次数)"
```

- 可用性刷新遍历所有按钮时使用 `button.dataset.key` 查 `snapshot.availability`，不再依赖构造时的键。

**布局（对齐企划线框图）**

- 操作区改为四列网格：
  1. 当前手持普通武器：`1.1` 在上、`1.2` 在下，中间一行放「切换」（胶囊）+「格挡」（实心高亮）。
  2. 特殊武器：`3.1` / `3.2` 纵向排列。
  3. 药品：`4.1` / `4.2` 纵向排列。
  4. 功能：`撤回` / `出招` 纵向排列。
- 窄屏：≤860px 保持四列压缩；≤480px 降为两列（正常一列 + 特殊一列 / 药品一列 + 功能一列）。
- 线框图中的 BAG（背包）不在本阶段范围，不渲染占位按钮。

**行为矩阵**

| 队列内容 | `currentOrder` | `activeSlot` | 操作区按钮 |
|---|---|---|---|
| 空 | `[w1, w2]` | 1 | `1.1 普攻`、`1.2 特殊` |
| `[switch]` | `[w2, w1]` | 2 | `2.1 普攻`、`2.2 特殊`（绑定 w2） |
| 撤回 switch | `[w1, w2]` | 1 | `1.1 普攻`、`1.2 特殊` |

### 2. Buff 占位区 + Hover Tooltip

**状态与快照**

- `BattleState.buffs` 由 `[]` 改为 `{ player: [], boss: [] }`（仍标注 `// 预留:`）。
- `getSnapshot()` 增加 `buffs: deepClone(state.buffs)`。

**组件契约**

新增 `src/ui/Tooltip.js`：

```js
export function attachTooltip(el, getContent)
// getContent: () => string | null；按 "\n" 拆行渲染纯文本
```

- 单例浮层 `.tooltip` 挂到 `document.body`，`position: fixed`，`pointer-events: none`，`z-index: 60`。
- 事件：`mouseenter / mouseleave`、`focus / blur`。
- 定位：元素矩形上方 `8px`，越界改为下方；左右夹取在视口内。

新增 `src/ui/BuffBar.js`：

```js
new BuffBar({ container, title, emptyText })
render(buffs = [])
// buff: { id, name, description, remainingTurns? }
```

- 结构：`.buff-bar` > `.buff-bar__title` + `.buff-bar__list`。
- 空数组：`.buff-bar__empty` 虚线占位，文案 `label.noBuff`，悬停显示 `tooltip.buffEmpty`。
- 非空：每个 Buff 一个 `.buff-chip`，glyph 取 `buff.name` 首字；悬停显示名称、说明、`剩余 N 回合`（有 `remainingTurns` 时）。

**挂载位置**

`BattleView` 在 `[data-player-bars]`、`[data-boss-bars]` 之后各插入一个容器并实例化 `BuffBar`，`render()` 时调用 `render(snapshot.buffs.player / .boss)`。

### 3. 序列方块图标 + Tooltip + 执行高亮

**SequenceBar 契约**

```js
render(items) // item: { seq, opId, glyph, tone, tooltip }
```

- chip 结构：`.sequence-chip` > `.sequence-chip__icon`（glyph）+ `.sequence-chip__seq`（序号角标）。
- `tone` 沿用 `normal / special / defend / item / switch`，复用现有配色。
- 有 `tooltip` 时调用 `attachTooltip(chip, () => item.tooltip)`。
- 保留 `dataset.opid` 与 `highlight(opId)`，`is-current` 闪烁动画不变。

**文案与图标（写入 `config/ui.json`）**

| 键 | 值 |
|---|---|
| `icon.attack.normal` | 普 |
| `icon.attack.special` | 特 |
| `icon.defend` | 防 |
| `icon.item` | 药 |
| `icon.switch` | 换 |
| `icon.boss.normal` | 斩 |
| `icon.boss.special` | 重 |
| `label.buffs` | 状态 |
| `label.noBuff` | 暂无 Buff |
| `tooltip.attackTitle` | `{weapon} · {attack}` |
| `tooltip.bossTitle` | `Boss · {name}` |
| `tooltip.itemTitle` | `{name}` |
| `tooltip.damage` | `伤害 {value}` |
| `tooltip.rageCost` | `耗气 {value}` |
| `tooltip.bossRageCut` | `削敌杀气 {value}` |
| `tooltip.playerRageCut` | `削我杀气 {value}` |
| `tooltip.specialUse` | 消耗特殊次数 |
| `tooltip.heal` | `回复 {value}` |
| `tooltip.defend` | 格挡配对操作 |
| `tooltip.switch` | 切换手持武器 |
| `tooltip.buffEmpty` | 本场暂无 Buff |
| `tooltip.buffRemaining` | `剩余 {n} 回合` |

**BattleView 组装规则**

- 玩家攻击（队列快照）：标题取武器名 + 攻击名；追加伤害、耗气、削敌杀气；`resolved.consumesSpecialUse` 为真时追加 `tooltip.specialUse`。
- 玩家药品：名称 + `tooltip.heal`。
- 玩家格挡 / 切换：`tooltip.defend` / `tooltip.switch`。
- Boss 意图：标题 + 伤害 + 削我杀气（数值已在 `BossAI` 按层数缩放并 `round1`）。
- 所有数值经 `toFixed1()` 输出 1 位小数。
- `intentRevealed` 事件回放复用同一个 `buildIntentItem(item)`，避免两套格式化。

### 4. 样式

`src/styles/battle.css` 新增并调整：

- `.tooltip`：深色浮层、1px 边、圆角 8px、`max-width: 240px`、行高 1.5、`font-size: 12px`。
- `.buff-bar`：横向、gap 6px、`min-height: 30px`；`.buff-bar__empty` 虚线框；`.buff-chip` 30×30 方块。
- `.sequence-chip`：改为 34×34 方块（原胶囊样式移除），`.sequence-chip__icon` 居中 glyph，`.sequence-chip__seq` 绝对定位右上角小角标。
- 响应式：沿用现有 720px 断点，Buff 区允许换行，不产生横向滚动。

## Impact

- 修改：`src/game/PanelState.js`、`src/game/BattleEngine.js`、`src/state/BattleState.js`、`src/ui/ActionPanel.js`、`src/ui/BattleView.js`、`src/ui/SequenceBar.js`、`src/styles/battle.css`、`config/ui.json`、`tests/panel.test.js`
- 新增：`src/ui/Tooltip.js`、`src/ui/BuffBar.js`
- 不变：全部战斗数值、`combat_rules.md`、`data_rules.md`、`SCHEMA.md`、结算顺序、存档结构

## ADDED Requirements

### Requirement: 面板单手持展示

系统 SHALL 在操作区只显示当前手持普通武器的一对按钮，键位绑定固定装备位。

#### Scenario: 默认手持

- **WHEN** 战斗进入排布阶段且队列中没有切换
- **THEN** 操作区仅显示 `1.1 普攻` 与 `1.2 特殊`，不出现任何 `2.x` 按钮

#### Scenario: 切换入队

- **WHEN** 点击“切换”入队
- **THEN** 同一对按钮原地变为 `2.1 普攻` 与 `2.2 特殊`，点击 `2.1` 入队的 `weaponId` 为第二把普通武器

#### Scenario: 撤回切换

- **WHEN** 撤回队列中的切换指令
- **THEN** 按钮立即恢复为 `1.1 / 1.2`，点击入队的是第一把普通武器

#### Scenario: 快照隔离

- **WHEN** 入队 `1.1` 后再切换并撤回
- **THEN** 已入队指令的伤害、耗气、武器 id 保持不变

### Requirement: Buff 展示位

系统 SHALL 在玩家与 Boss 杀气条下方各提供横向 Buff 占位区，并对 Buff 提供悬停说明。

#### Scenario: 空 Buff

- **WHEN** 双方均无 Buff
- **THEN** 两侧各显示虚线占位“暂无 Buff”，布局不塌陷

#### Scenario: 悬停说明

- **WHEN** 鼠标悬停或键盘聚焦某个 Buff chip
- **THEN** 浮层显示名称、说明与剩余回合，且不遮挡触发元素

### Requirement: 序列图标与说明

系统 SHALL 以方块图标表示玩家指令与 Boss 意图，并提供悬停 Tooltip；当前执行操作高亮闪烁。

#### Scenario: 悬停玩家指令

- **WHEN** 悬停一个已入队的攻击图标
- **THEN** Tooltip 显示名称、伤害、耗气、削敌杀气，数值为 1 位小数

#### Scenario: 悬停 Boss 意图

- **WHEN** 悬停一条 Boss 意图图标
- **THEN** Tooltip 显示名称、伤害与削我杀气

#### Scenario: 执行高亮

- **WHEN** 结算回放推进到某条操作
- **THEN** 对应 chip 呈闪烁高亮态，其余 chip 取消高亮

## Verification

1. 启动 `npx serve . -l 5173`，打开 `http://localhost:5173`。
2. 默认排布阶段：操作区只有 `1.1/1.2`。
3. 点“切换”：按钮原地变 `2.1/2.2`；点 `2.1` 后队列首条快照为 `two_hand_blade`。
4. 点“撤回”撤掉 `2.1` 再撤回切换：按钮恢复 `1.1/1.2`。
5. 玩家与 Boss 杀气条下方各出现“状态 / 暂无 Buff”横向占位区；悬停占位出现提示浮层。
6. 悬停玩家攻击方块：显示名称、伤害、耗气、削敌杀气；悬停 Boss 意图方块：显示名称、伤害、削我杀气。
7. 出招结算时当前操作方块闪烁，其余停止闪烁。
8. 打开 `http://localhost:5173/tests/index.html`，28 条用例全绿（原 27 条 + 新增 1 条）。
9. 窄屏 375px 无横向滚动。

## Out of Scope

- 真实 Buff / Debuff 的施加、叠加与计时（仍标注 `// 预留:`）
- 战斗数值、结算顺序、配置结构与存档结构变更
- 美术资源替换与音效
