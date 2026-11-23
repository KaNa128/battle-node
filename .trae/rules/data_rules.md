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
| `accessories.json` | 饰品与独立升级（待建） |
| `upgrades.json` | 升级树占位 + 装备强化规则（`enhancement` 段） |
| `soulforge.json` | 铸魂分支与全局次数池（待建） |
| `drops.json` | 掉落池 |
| `levels.json` | 无尽层数缩放与普通战斗敌人池 |
| `scenes.json` | 场景注册（仅 home / map / battle）、背景路径、转场时长 |
| `map.json` | 路线图生成：层数、分叉、节点类型权重（待建） |
| `events.json` | 事件文案、配图与选项效果（待建） |
| `chests.json` | 宝箱奖励与开箱表现（待建） |
| `shop.json` | 商店三栏、商品池、价格与刷新规则（待建） |
| `skills.json` | 技能树节点、前置、消耗与效果（待建） |
| `ui.json` | 文案 / Tooltip / HUD 与弹窗标签 |

> 武器、Boss、操作序列、地图、事件、宝箱、商店、技能树、强化的字段级契约以根目录 `SCHEMA.md` 为准；本文件只补充通用规范、引用、结算顺序与存档要求。

## 2. 通用字段规范

- 每个文件必须带 `schemaVersion`。
- `id` 使用 snake_case 且全局唯一；引用字段统一命名为 `xxxId` / `xxxIds`。
- 数值直接写数字，不写字符串、不写单位；杀气/伤害最多 1 位小数。
- 金币、价格、强化次数必须是整数；禁止出现负价格或负次数。
- 禁止在 JSON 中写公式或表达式；加成一律用 `{ stat, value, condition }` 描述。
- 面板按钮由 `battle.config.json` 的 `panel` 决定，UI 不得写死键位。
- 商店价格写在 `shop.json`，强化上限与每级消耗写在 `upgrades.json.enhancement`，技能点消耗写在 `skills.json`。

## 3. 引用完整性

- `weapons.upgradeTreeId` / `soulForgeId` / `comboIds` 必须存在。
- `bosses.phases[].actionWeights[].actionId` 必须存在于同 Boss 的 `actions`。
- `bosses.reward.dropPoolId` 必须存在于 `drops.json`。
- `combos.weaponId` / `bossId` 必须存在。
- `scenes.scenes[*].id` 只能是 `home` / `map` / `battle`；`background` 必须是 `assets/backgrounds/` 下的相对路径；文件缺失时由样式兜底，但键不得缺失。
- `map.nodeTypes[].id` 必须属于 `battle / event / chest / shop / boss`；权重为非负整数且总和大于 0，必须包含 `battle`。
- `events[].choices[].effects[]` 使用 `{ kind, value, itemId?, enhanceCategory? }`；`kind` 只能是 `gold / hp / skillPoint / enhanceCount / item`，`itemId` / `enhanceCategory` 必须存在；选项数量固定为 3，`image` 必须在 `assets/events/` 下。
- `chests[].rewards[]` 使用与事件相同的 Effect 结构；`gif` 必须是 `assets/chests/` 下的相对路径。
- `shop.columns[].offers[].weaponId` / `itemId` / `enhanceCategory` 必须存在；`kind` 必须与栏位匹配（`weapons → weapon`、`items → item`、`enhance → enhance`），每栏至少 1 个 offer。
- `shop.columns[].refresh.baseCost` / `costStep` 为非负整数；刷新涨价规则由这两项表达，不写公式。
- `skills[].prerequisiteIds` 必须存在且无环；必须存在且仅存在 1 个无前置的 `root` 节点，`branch` 只能是 `root / purple / cyan / red`。
- `upgrades.enhancement.categories[].id` 只能是 `normalWeapon / specialWeapon / item`。
- `Validator` 在启动时校验，失败即抛错并输出具体路径。

## 4. 加成模型与结算顺序

- 战斗统计字段（stat）统一命名：`damagePercent`、`damageFlat`、`comboRageCutPercent`、`rageCutFlat`、`defensePercent`、`damagePercentAfterBlock`。
- 外层属性字段统一命名：`maxHpFlat`、`maxRageFlat`、`attackPowerFlat`、`attackPowerPercent`、`healPercent`、`goldPercent`。
- 战斗结算顺序固定为：
  1. 基础值（武器快照）
  2. 装备强化
  3. 升级树（预留）
  4. 铸魂
  5. 饰品
  6. Buff / Debuff
  7. 连招
  8. `round1`
- 外层属性结算顺序固定为：基础值 → 装备强化 → 技能树 → 饰品（预留）→ `round1`。
- percent 类加成为加法叠加，最后统一乘算一次；避免逐层四舍五入。
- HUD 只展示 meta 计算后的结果，禁止 UI 二次叠加。

## 5. 存档结构

`saveVersion` 与 `schemaVersion` 必须同时写入；结构变更时提升 `saveVersion` 并补迁移函数。

`SaveRecord`（`SaveManager` 单存档位落盘结构）：

| 字段 | 类型 | 说明 |
|---|---|---|
| `saveVersion` / `schemaVersion` | integer | 存档结构版本 / 配置契约版本 |
| `savedAt` | integer | 写入时间戳 |
| `seed` | integer | 本局总种子 |
| `floor` | integer | 当前楼层，从 1 开始 |
| `floorSeed` | integer | 当前层地图种子，升层时重算 |
| `nodeId` | string \| null | 当前所在节点 |
| `player` | object | `RunState.toSavedData()` 输出 |
| `map` | MapGraph \| null | 当前层地图，缺失时按种子重建 |

`player`（`runState`）字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `hp` | number | 当前血量 |
| `maxHp` | number | 血量上限 |
| `gold` | integer | 金币，非负 |
| `skillPoints` | integer | 可用技能点 |
| `unlockedSkillIds` | string[] | 已点亮技能节点 |
| `normalWeapons` | string[2] | 两把普通武器 |
| `specialWeapons` | string[2] | 巨斧 / 弓箭 |
| `ownedWeaponIds` | string[] | 已拥有武器，用于商店去重 |
| `items` | object | 药品 id → 剩余次数 |
| `enhanceCounts` | object | `normalWeapon / specialWeapon / item` → 剩余强化次数 |
| `enhanceLevels` | object | 装备 id → 强化等级（0~30） |

约束：

- `battleState`：`battleId`、`bossId`、`scaling`、回合数、阶段、玩家/ Boss 运行时、意图、Boss 游标、Buff。
- 两棵树必须分离；`battleState` 可整体丢弃而不影响 `runState`。
- 场景参数只用于当次跳转，不写入存档；场景结果由 `RunController` 合并进 `runState` 后再存档。
- 商店购买记录、每栏刷新次数属于当次会话状态，不写入存档；关闭商店即丢弃。
- 节点完成、升层、失败清理后必须立即写档。
- 存档写入前做一次 `round1` 归一化；金币与次数保持整数。

## 6. 存档迁移

- 新增字段必须提升 `saveVersion`，并写迁移函数补齐安全初始值（`0`、空数组、空对象）。
- 迁移只做结构补齐，不改变既有数值语义；无法识别的高版本存档直接拒绝读取并提示。
- 删除或重命名 `runState` 字段必须同时提升 `schemaVersion`，并同步更新 `SCHEMA.md`。
- 战斗失败或主动放弃：删除存档并重置 `RunState`，不得留下半局残留。

## 7. 禁止事项

- 不把玩家持久状态塞进 `battleState`。
- 不在 config 中写像素、颜色、CSS 类名（表现参数归 `src/styles/`）。
- 不在代码里复制一份配置默认值；缺配置就报错。
- 不在代码里写死商店价格、刷新涨幅、强化上限、技能点消耗。
- 不在 UI 层计算属性加成、金币结算或强化结果。
