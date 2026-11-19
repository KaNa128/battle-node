# 战斗节点 V0.1（极简竖切）Spec

## Why

先用最小闭环验证核心玩法与架构是否成立：一个 Boss、四把武器、一套完整的回合流程。养成、掉落、存档、背包全部推迟，避免首版被外围系统拖慢。

## What Changes

- 新增 7 个配置文件：`battle.config.json`、`weapons.json`、`bosses.json`、`combos.json`、`effects.json`、`items.json`、`ui.json`
- 新增配置加载与校验（只校验实际存在的文件）
- 新增纯逻辑战斗核心：回合状态机、指令队列、杀气、防御、连招、Boss AI、交替结算
- 新增最简可玩界面：血/杀气条、序列与意图、10 个操作按钮、置灰、撤回、切换
- 新增基础演出：行动高亮、受击白闪、数值过渡
- **不包含**：升级树、铸魂、饰品、掉落、无尽层数、IndexedDB 存档、背包、多 Boss、正式美术

## 交付标准

浏览器打开页面，能用 4 把武器与 1 个 Boss 完整打完一局，胜负正确，规则符合 `combat_rules.md`。

## Impact

- 受影响代码：`config/`（7 个）、`src/game/`、`src/state/`、`src/data/`、`src/ui/`、`src/styles/`、`tests/`
- 参考文档：`SCHEMA.md`、`.trae/rules/combat_rules.md`
- 与完整目标的差异：`SCHEMA.md` 中升级/铸魂/饰品/掉落相关字段在本版不落地，字段结构保留

## ADDED Requirements

### Requirement: 配置与校验

系统 SHALL 从 7 个 JSON 读取全部数值、权重、文案与路径，启动时校验结构与引用；引用断裂必须终止启动并输出路径。

#### Scenario: 引用断裂
- **WHEN** `bosses.json` 的 `actionWeights` 引用不存在的 `actionId`
- **THEN** 启动失败，控制台指出文件与字段

#### Scenario: 面板驱动
- **WHEN** 修改 `battle.config.json` 的 `panel` 键位
- **THEN** 按钮布局随之变化，代码无需修改

### Requirement: 回合状态机

系统 SHALL 按 `BOSS_INTENT → PLAYER_PLANNING → PRE_CHECK → SETTLEMENT → TURN_END` 推进，Boss 先行交替结算。

#### Scenario: 一方耗尽
- **WHEN** 玩家队列先执行完
- **THEN** 玩家停止行动，Boss 继续执行剩余操作

#### Scenario: 破防
- **WHEN** Boss 杀气归零
- **THEN** 本回合剩余操作跳过，下回合整回合轮空，轮空后杀气回满

### Requirement: 指令与面板

系统 SHALL 在入队瞬间生成不可变快照，撤回遵循 LIFO，面板顺序由 `baseOrder` 与队列中的切换指令推导。

#### Scenario: 快照隔离
- **WHEN** 入队 `1.1` 后切换武器
- **THEN** 已入队指令的伤害、耗气、武器 id 不变

#### Scenario: 撤回切换
- **WHEN** 撤回唯一的切换指令
- **THEN** 面板立即回到 `baseOrder` 顺序

### Requirement: 杀气与防御

系统 SHALL 实现玩家杀气 ≤ 0 跳过当前操作并每回合回满一次、Boss 损耗保留与破防；防御完整格挡、Boss 削减减半（0.5 / 1.0）并反弹原值（1.0 / 2.0）。

#### Scenario: 格挡普攻
- **WHEN** 玩家对 Boss 普攻执行格挡
- **THEN** 玩家 0 伤害、杀气 -0.5，Boss 杀气 -1.0

#### Scenario: 显示精度
- **WHEN** 渲染任何数值
- **THEN** 固定 1 位小数

### Requirement: 连招

系统 SHALL 支持配置化 pattern 与断连；基础连招为 `普攻 → 特殊 → 普攻`，额外削 4 杀气、伤害 ×1.1。

#### Scenario: 断连
- **WHEN** 序列中插入 `防御 / 药品 / 切换`
- **THEN** 连招重置，不触发

#### Scenario: 不断连预留
- **WHEN** `interruptOn` 配置为空数组
- **THEN** 断连消失，逻辑无需修改

### Requirement: Boss AI

系统 SHALL 按阶段权重生成 2~3 条意图：HP > 50 为 70/30，HP ≤ 50 为 40/60。

#### Scenario: 阶段边界
- **WHEN** 回合开始时 Boss 血量为 50
- **THEN** 使用第二阶段权重

### Requirement: 最简 UI

系统 SHALL 渲染左右布局、血/杀气条、序列与意图、10 个操作按钮（`1.1~4.2` + 格挡 + 切换）与撤回，并实现行动高亮、受击白闪。

#### Scenario: 置灰
- **WHEN** 杀气不足或特殊次数耗尽
- **THEN** 对应按钮禁用且不可入队

### Requirement: 模块门面

系统 SHALL 仅通过 `BattleModule` 对外提供 `start / abort / onResult`。

#### Scenario: 战后输出
- **WHEN** 战斗结束
- **THEN** 返回 `{ result, playerSavedData, drops, battleLog }`，本版 `drops` 恒为空数组

## Out of Scope（后续批次）

- 升级树、铸魂、饰品、特殊攻击次数之外的养成
- 掉落结算、无尽层数、多 Boss、关卡序列
- IndexedDB 存档、导出/导入、背包与换装
- 正式 GIF 立绘与音效（使用占位样式）
