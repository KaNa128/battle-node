# Tasks

> 范围：极简竖切 V0.1。目标是用最少任务跑通“一个 Boss + 四把武器”的完整一局。
> 每个任务只产出一个可验证能力；未列出的能力本版不做。
> 规则来源：`SCHEMA.md` 与 `.trae/rules/combat_rules.md`。

## Task 1 骨架与最小配置集

- [x] 1.1 建立目录：`config/`、`src/{game,state,data,ui,styles,utils}/`、`tests/`、`assets/`
- [x] 1.2 `index.html`：viewport、样式挂载、`src/main.js` 模块入口
- [x] 1.3 落地 7 个 JSON：`battle.config`、`weapons`、`bosses`、`combos`、`effects`、`items`、`ui`
- [x] 1.4 数值按 `combat_rules.md` 填写，字段按 `SCHEMA.md`

**验收**：静态服务器打开无脚本错误；7 个 JSON 均可 fetch。

## Task 2 配置加载与校验

- [x] 2.1 `ConfigLoader`：并行 fetch、深冻结、统一出口
- [x] 2.2 `Validator`：必填 / 类型 / 枚举
- [x] 2.3 引用校验：attack id 唯一、actionId、comboIds、panel weaponId / itemId
- [x] 2.4 错误包含文件与字段路径

**验收**：制造一处错误引用，启动即失败并定位；恢复后正常。

**依赖**：Task 1

## Task 3 数值工具与注入随机

- [x] 3.1 `math.js`：`round1`、`clamp`
- [x] 3.2 `deepClone.js`：快照复制
- [x] 3.3 `Rng.js`：种子化、可注入

**验收**：`round1(0.1 + 0.2) === 0.3`；同种子同序列；无裸 `Math.random()`。

**依赖**：Task 1

## Task 4 最小状态容器

- [x] 4.1 `RunState`：血量、两把普通武器、两把特殊武器、药品剩余次数
- [x] 4.2 `BattleState`：bossId、回合、阶段、双方运行时、意图、Buff、队列
- [x] 4.3 初始化接收 `playerSavedData`，缺字段报错

**验收**：两棵树互不引用；初始值来自配置。

**依赖**：Task 2

## Task 5 指令队列与快照

- [x] 5.1 入队生成不可变 `PlayerCommand`
- [x] 5.2 `seq` / `nextSeq`
- [x] 5.3 LIFO 撤回，不重排

**验收**：连续撤回顺序正确；快照字段完整（伤害、耗气、武器 id、次数标记）。

**依赖**：Task 4

## Task 6 面板派生与入队判定

- [x] 6.1 `PanelState`：`baseOrder` + 队列中的 switch 逐条交换
- [x] 6.2 杀气累计预扣
- [x] 6.3 特殊次数 / 药品次数 / 切换冷却
- [x] 6.4 `canEnqueue(panelKey)`

**验收**：撤回 switch 后面板回退；超发或次数耗尽返回 false。

**依赖**：Task 5

## Task 7 杀气系统

- [x] 7.1 玩家回合开始回满
- [x] 7.2 ≤ 0 跳过当前操作并回满，每回合限 1 次
- [x] 7.3 二次归零跳过剩余耗气操作
- [x] 7.4 Boss 损耗保留、归零破防、轮空后回满

**验收**：表驱动覆盖 10.0 / 0.5 / 0.0 / 30.0 与二次归零。

**依赖**：Task 4

## Task 8 防御与反弹

- [x] 8.1 完全格挡配对操作伤害
- [x] 8.2 Boss 削减减半：1 → 0.5、2 → 1.0
- [x] 8.3 反弹原值：1.0 / 2.0

**验收**：格挡普攻后玩家 0 伤害、杀气 -0.5，Boss 杀气 -1.0。

**依赖**：Task 7

## Task 9 连招系统

- [x] 9.1 连续 pattern 匹配
- [x] 9.2 断连：`defend / item / switch`
- [x] 9.3 加成落在 pattern 最后一个操作
- [x] 9.4 `interruptOn` 置空即可不断连

**验收**：`普攻→特殊→普攻` 触发；插入防御不触发；置空后不断连。

**依赖**：Task 5

## Task 10 Boss AI

- [x] 10.1 按回合开始血量选阶段
- [x] 10.2 权重抽取 2~3 条，允许重复
- [x] 10.3 生成并公开意图

**验收**：固定种子分布合理；HP 50 进入第二阶段；条数在 2~3。

**依赖**：Task 2、Task 4

## Task 11 单条操作结算器

- [x] 11.1 攻击：伤害、削杀气
- [x] 11.2 防御：调用 Task 8
- [x] 11.3 药品：治疗与次数扣减
- [x] 11.4 切换：只改面板与冷却
- [x] 11.5 产出 `SettlementEvent`

**验收**：单条结算产生的事件字段符合 `SCHEMA.md` §4.7。

**依赖**：Task 8、Task 9

## Task 12 回合调度与交替计划

- [x] 12.1 `PRE_CHECK`：连招判定与落点标记
- [x] 12.2 `SettlementPlan`：Boss 先行交替
- [x] 12.3 一方耗尽后另一方继续
- [x] 12.4 跳过操作占位并派发 `skip`

**验收**：顺序为 `boss1 → player1 → boss2 → player2`；玩家先耗尽时 Boss 连续执行。

**依赖**：Task 10、Task 11

## Task 13 战斗引擎与胜负

- [x] 13.1 阶段循环至 `TURN_END`
- [x] 13.2 破防回合处理
- [x] 13.3 胜负判定与 `BATTLE_END`
- [x] 13.4 回合清理：回满杀气、冷却递减

**验收**：完整一局事件序列正确；任一方血量归零即结束。

**依赖**：Task 12

## Task 14 BattleModule 门面

- [x] 14.1 `start({ bossId, scaling, playerSavedData })`
- [x] 14.2 `abort()`
- [x] 14.3 `onResult(cb)` 输出 `{ result, playerSavedData, drops, battleLog }`

**验收**：外部只能访问门面；`drops` 为空数组；输出可序列化。

**依赖**：Task 13

## Task 15 UI 布局与状态展示

- [x] 15.1 左右双方布局、序列区、角色占位、状态区
- [x] 15.2 `StatusBars`：血/杀气双条、向左削减、1 位小数
- [x] 15.3 `SequenceBar`：玩家序列 + Boss 意图
- [x] 15.4 响应式：窄屏不溢出，点击区 ≥ 44px

**验收**：375px 宽无横向滚动；数值均为 1 位小数。

**依赖**：Task 14

## Task 16 操作面板与交互

- [x] 16.1 按配置渲染 `1.1~4.2` + 格挡 + 切换 + 撤回
- [x] 16.2 接入 `canEnqueue` 置灰
- [x] 16.3 撤回与切换的面板联动
- [x] 16.4 UI 只发意图，不计算结果

**验收**：置灰按钮不可入队；撤回 switch 后面板回退；UI 层无伤害计算。

**依赖**：Task 6、Task 15

## Task 17 基础演出

- [x] 17.1 行动方高亮、对方变暗
- [x] 17.2 当前操作图标闪烁
- [x] 17.3 受击白闪
- [x] 17.4 数值过渡动画

**验收**：逻辑先结算、表现回放；动画不阻塞逻辑。

**依赖**：Task 16

## Task 18 测试与端到端验收

- [x] 18.1 `tests/index.html` + 极简断言器
- [x] 18.2 覆盖杀气、防御、连招、结算顺序、面板派生
- [x] 18.3 手测：胜利、失败、破防、二次归零
- [x] 18.4 自查：无硬编码数值、`src/game/` 无 DOM

**验收**：测试页全绿；一局完整跑通；`checklist.md` 全部通过。

**依赖**：Task 17

# Task Dependencies

```text
1 → 2 → 4 → 5 → 6
      ↘ 3 ↗        ↓
4 → 7 → 8 → 11 → 12 → 13 → 14 → 15 → 16 → 17 → 18
5 → 9 ↗
2,4 → 10 ↗
```

- Task 3 可与 Task 2 并行
- Task 9、Task 10 可在 Task 5/7 完成后并行
- Task 15 可在 Task 14 前先用假数据开发样式
