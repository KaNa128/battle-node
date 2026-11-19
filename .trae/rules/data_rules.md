# 配置与数据规范

## 1. 配置文件清单

| 文件 | 作用 |
|---|---|
| `battle.config.json` | 全局规则常量：回合、杀气、防御、切换、连招、面板、显示 |
| `weapons.json` | 武器数值、动画、升级/铸魂/连招引用 |
| `combos.json` | 连招 pattern 与加成 |
| `bosses.json` | Boss 数值、阶段权重、行为、缩放 |
| `effects.json` | 治疗 / Buff / Debuff 原子效果 |
| `items.json` | 药品与每场次数 |
| `accessories.json` | 饰品与独立升级 |
| `upgrades.json` | 全局升级点池与各武器升级树 |
| `soulforge.json` | 铸魂分支与全局次数池 |
| `drops.json` | 掉落池 |
| `levels.json` | 无尽层数缩放与节点池 |
| `ui.json` | 文案与 Tooltip |

> 武器、Boss、操作序列的字段级契约以根目录 `SCHEMA.md` 为准；本文件只补充通用规范、结算顺序与存档要求。

## 2. 通用字段规范

- 每个文件必须带 `schemaVersion`。
- `id` 使用 snake_case 且全局唯一；引用字段统一命名为 `xxxId` / `xxxIds`。
- 数值直接写数字，不写字符串、不写单位；杀气/伤害最多 1 位小数。
- 禁止在 JSON 中写公式或表达式；加成一律用 `{ stat, value, condition }` 描述。
- 面板按钮由 `battle.config.json` 的 `panel` 决定，UI 不得写死键位。

## 3. 引用完整性

- `weapons.upgradeTreeId` / `soulForgeId` / `comboIds` 必须存在。
- `bosses.phases[].actionWeights[].actionId` 必须存在于同 Boss 的 `actions`。
- `bosses.reward.dropPoolId` 必须存在于 `drops.json`。
- `combos.weaponId` / `bossId` 必须存在。
- `Validator` 在启动时校验，失败即抛错并输出具体路径。

## 4. 加成模型与结算顺序

- 统计字段（stat）统一命名：`damagePercent`、`damageFlat`、`comboRageCutPercent`、`rageCutFlat`、`defensePercent`、`damagePercentAfterBlock`。
- 结算顺序固定为：
  1. 基础值（武器快照）
  2. 升级树
  3. 铸魂
  4. 饰品
  5. Buff / Debuff
  6. 连招
  7. `round1`
- percent 类加成为加法叠加，最后统一乘算一次；避免逐层四舍五入。

## 5. 存档结构

- `runState`：楼层、血量、装备、升级点、升级等级、铸魂、铸魂次数、饰品、药品。
- `battleState`：`battleId`、`bossId`、`scaling`、回合数、阶段、玩家/ Boss 运行时、意图、Boss 游标、Buff。
- 两棵树必须分离；`battleState` 可整体丢弃而不影响 `runState`。
- 存档写入前做一次 `round1` 归一化。

## 6. 禁止事项

- 不把玩家持久状态塞进 `battleState`。
- 不在 config 中写像素、颜色、CSS 类名（表现参数归 `src/styles/`）。
- 不在代码里复制一份配置默认值；缺配置就报错。
