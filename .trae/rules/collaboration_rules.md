# 4 人协作与目录隔离规范（Collaboration Rules）

> 本文件是 4 人团队使用 GitHub + AI 协作时的强制规则。目录归属以本文件为准；与口头分工冲突时，先改本文件再改代码。

## 1. 核心原则

- **一个物理目录只有一个主责人**，其他人只读。
- **一个 PR 只改一个层**，跨层改动拆成多个 PR，由集成负责人串联。
- **接口先行**：先冻结接口与配置字段，再并行开发。
- **AI 只在本人的目录内工作**，提示词必须写明允许修改的路径。
- **冲突不靠事后合并解决，靠目录隔离避免。**
- **内容与数值分离**：内容负责人可以新建条目并临时填数值，数值负责人负责定稿与平衡；临时数值不得当作最终结论。

## 2. 目录与文件归属

| 成员 | 独占写入 | 只读依赖 |
|---|---|---|
| 1 号位（战斗） | `src/game/`；`src/scenes/BattleScene.js`；战斗表现 `src/ui/` 下的 `BattleView.js`、`SequenceBar.js`、`ActionPanel.js`、`StatusBars.js`、`BuffBar.js`、`FeedbackLayer.js`、`Tooltip.js`、`InventoryView.js`、`bridge/`、`anim/`；`src/styles/battle.css`；`src/state/BattleState.js`；`assets/gifs/player/`、`assets/gifs/bosses/`；`tests/` 中的 `engine / combo / rage / panel / turn-order` 用例；`.trae/rules/combat_rules.md` | 战斗数值 `config/`、`SCHEMA.md`、`RunState` 快照、`RunController` 接口 |
| 2 号位（外围场景与地图） | `src/meta/`；`src/scenes/`（除 `BattleScene.js`，含 `overlays/`）；`src/ui/hud/`、`src/ui/modals/`、`src/ui/map/`；`src/styles/`（除 `battle.css`）；`src/state/RunState.js`、`src/state/SaveManager.js`；`src/data/`；`src/main.js`；`index.html`；`assets/{backgrounds,ui,skills,icons,audio}/`；`tests/runner.js`、`tests/index.html` 与 meta / UI 用例；`AGENTS.md`、`PROJECT-STRUCTURE.md`、`.trae/rules/project_rules.md`、`.trae/rules/collaboration_rules.md` | `BattleModule`、`BattleState` 快照、`config/`、`SCHEMA.md` |
| 3 号位（节点内容） | `config/events.json`、`config/chests.json`、`config/shop.json`、`config/items.json`；`assets/events/`、`assets/chests/` | `SCHEMA.md`、`.trae/rules/data_rules.md`、`src/meta/` 的结算与快照接口、`config/ui.json` |
| 4 号位（数据与数值） | `config/` 其余文件（`battle.config.json`、`weapons.json`、`combos.json`、`bosses.json`、`effects.json`、`upgrades.json`、`map.json`、`scenes.json`、`skills.json`、`ui.json`）；`SCHEMA.md`；`.trae/rules/data_rules.md`；`tests/` 的 `config-validation` 与 `tests/data/` | `src/` 全部（只读） |

补充说明：

- **同目录文件级拆分**：`src/scenes/` 只有 `BattleScene.js` 归 1 号位，`SceneShell.js`、`HomeScene.js`、`MapScene.js`、`overlays/` 归 2 号位；`src/styles/` 只有 `battle.css` 归 1 号位；`src/ui/` 只有上表列出的战斗组件归 1 号位。
- **状态文件拆分**：`BattleState.js` 归 1 号位；`RunState.js`、`SaveManager.js` 归 2 号位。`RunState` 结构变更需 1 号位与 4 号位确认。
- `tests/` 现状为平铺：`engine / combo / rage / panel / turn-order` 归 1 号位维护，`config-validation` 归 4 号位维护，`runner.js` 与 `index.html` 归 2 号位维护。后续拆分二级目录时，`tests/game/` → 1 号，`tests/meta/` 与 `tests/ui/` → 2 号，`tests/data/` → 4 号；不得改他人用例。
- `assets/` 按用途拆分：玩家 / Boss 战斗 GIF 归 1 号位；背景、HUD、技能、图标、音频归 2 号位；事件与宝箱配图归 3 号位。事件 / 宝箱路径由 3 号位在自己负责的 JSON 中登记，其余路径由 4 号位登记，其他位只引用。
- `config/ui.json` 由 4 号位独占；2 号位与 3 号位需要新文案键时提交需求，由 4 号位落盘。
- `config/events.json`、`chests.json`、`shop.json`、`items.json` 的**结构、id 与文案**由 3 号位落盘；其中的**数值字段**由 4 号位定稿。3 号位新建道具 / 商品条目时允许填写临时数值，但必须在 PR 中标注“临时数值”，由 4 号位在数值 PR 中替换。
- 根目录的 `AGENTS.md`、`PROJECT-STRUCTURE.md` 以及 `project_rules.md`、`collaboration_rules.md` 由 2 号位维护；`SCHEMA.md`、`data_rules.md` 由 4 号位维护。
- **浮层不再拆到两人**：`src/scenes/overlays/`（容器、`OverlayManager`、开关与焦点）与 `src/ui/modals/`（视觉组件）统一归 2 号位；不得在浮层里计算战斗数值。
- **HUD**：`src/ui/hud/HudView.js`、`SceneShell` 的 HUD 挂载点与显隐规则均归 2 号位；HUD 数据由 `RunController.getHudSnapshot()` 提供。
- **战斗接入**：`BattleScene` 只通过 `BattleModule` 门面启动 / 接收结果，不得直接 import `BattleEngine`、`BossAI` 等内部模块。

## 3. 文件级规则

1. 不得修改他人独占目录中的任何文件，包括格式化、重命名、批量替换。
2. 需要他人目录改动时，开 Issue 或 PR 评论说明「文件、原因、期望接口」，由主责人实现。
3. 共享契约文件（`SCHEMA.md`、`scenes.json`、`ui.json`、`map.json`、`skills.json`、`upgrades.json`、`weapons.json`、`bosses.json`）只由 4 号位落盘；`events.json` / `chests.json` / `shop.json` / `items.json` 的结构与文案由 3 号位落盘，数值字段由 4 号位定稿。其他人在 PR 中提出字段需求。
4. 接口变更（`BattleModule` 入参 / 出参、`RunController` 方法、Scene 生命周期、`OverlayManager`）必须先合并契约 PR，再改实现。
5. 发现别人目录里有 bug：不要直接修，提交复现步骤与日志，由主责人修复。
6. 3 号位新建道具、商品或奖励条目时可以暂填数值，但必须满足类型与范围（非负、整数或 1 位小数），不得留 `null`；PR 标题或描述需标注“临时数值”，并 @ 4 号位定稿。

## 4. Git 分支与 PR 规范

### 4.1 分支命名

| 类型 | 格式 | 示例 |
|---|---|---|
| 功能 | `feature/<area>-<topic>` | `feature/meta-scene-router` |
| 修复 | `fix/<area>-<topic>` | `fix/battle-rage-zero` |
| 文档 | `docs/<topic>` | `docs/collaboration-guide` |
| 测试 | `test/<area>-<topic>` | `test/meta-map-generator` |
| 杂项 | `chore/<topic>` | `chore/gitignore` |

`area` 取值：`battle`、`ui`、`meta`、`content`、`data`。

### 4.2 分支纪律

- `main` 受保护，禁止直接 push，禁止 force push。
- 一人一分支，不共用个人分支；集成分支由 2 号位创建并按需删除。
- 分支生命周期尽量短，完成即 PR；长期分支必须每天同步 `main`。
- 合并方式统一使用 Squash Merge，保持主干线性。

### 4.3 PR 要求

- 标题：`[area] 简短说明`，例如 `[meta] 收敛为三个场景并增加 OverlayManager`。
- 描述必须包含：改动范围、为什么改、如何验证、影响接口、截图（UI 改动）。
- 单个 PR 尽量不超过 400 行；跨层改动拆分为多个 PR。
- 至少 1 名受影响层的主责人 Approve；跨层接口改动需要双方 Approve。
- 作者不能自行合并未评审的 PR。

### 4.4 提交信息

使用 `feat / fix / docs / test / refactor / chore` 前缀，说明「为什么」而不是复述代码。

## 5. AI 使用边界（按成员）

> 通用要求：每次让 AI 改代码前，先在提示词中写明「只允许修改哪些目录」；让 AI 先列出将要修改的文件；改完必须人工检查跨层 import、硬编码数值与配置默认值。

### 5.1 1 号位（战斗逻辑与战斗表现）

**可以让 AI 做**

- `src/game/` 的回合状态机、结算、连招、杀气、Boss AI、指令队列与单元测试。
- `BattleScene.js` 及 `BattleView / SequenceBar / ActionPanel / StatusBars / BuffBar / FeedbackLayer / Tooltip / InventoryView / bridge / anim` 的渲染与演出。
- `styles/battle.css` 的战斗布局与动画样式。
- 战斗快照生成、事件派发、随机源注入、边界条件测试。

**绝对不能让 AI 做**

- 在 `src/game/` 访问 DOM、`window`、`document`，或 import `ui/`、`scenes/`、`meta/`。
- 在代码里写死伤害、杀气、权重、文案；缺配置时必须报错，不得给默认值。
- 把玩家持久状态写进 `BattleState`。
- 用 `Math.random()` 代替注入的 `Rng`。
- 修改非战斗 UI（`hud/`、`modals/`、`map/`）、`src/meta/`、`SceneShell`、`HomeScene`、`MapScene`、`overlays/`，或 `battle.css` 之外的样式。
- 修改 `config/` 数值；战斗数值需求提交给 4 号位。

**推荐提示词**

```text
只允许修改 src/game/、src/scenes/BattleScene.js、src/ui/ 下的战斗组件、
src/styles/battle.css、src/state/BattleState.js 与战斗测试。
所有数值从注入的 config 读取，缺失即抛错，不要写默认值。
src/game/ 禁止 DOM / window / document，禁止 import ui、scenes、meta。
随机数必须使用注入的 Rng；战斗表现只读快照。改完列出修改文件与新增测试。
```

### 5.2 2 号位（外围场景 UI 与地图随机）

**可以让 AI 做**

- `SceneManager`、`SceneContext`、`RunController`、`MapGenerator`、`StatsCalculator`。
- `SceneShell`、`HomeScene`、`MapScene`、`src/scenes/overlays/` 与 `src/ui/{hud,modals,map}/`。
- 非战斗样式、响应式、背景层、转场、焦点与触屏交互。
- `RunState`、`SaveManager`、`ConfigLoader`、`Validator`、`main.js`、`index.html`。
- 地图随机逻辑：`seed → Rng → MapGraph`，节点类型权重、分叉与连线。
- 根据快照渲染、绑定点击意图、Tooltip。

**绝对不能让 AI 做**

- 计算伤害、杀气、连招、命中、胜负、属性加成、金币结算或强化结果。
- 修改 `src/game/`、`BattleScene.js`、战斗 UI、`battle.css`、`BattleState`。
- import `src/game/` 内部模块（只能通过 `BattleModule` 门面与快照）。
- 修改 `config/` 数值（向 4 号位提需求）或 `events / chests / shop / items` 内容（向 3 号位提需求）。
- 让 `meta/` import `scenes/` 或 `ui/`；场景工厂与浮层管理器只能由 `main.js` 注入。
- 把事件、宝箱、商店、背包、技能树、设置注册成 Scene。
- 场景或浮层直接改写 `RunState` 字段；必须走 `RunController`。
- 在 JS 里写死数值或文案；数值只从 snapshot 读，文案只从 `ui.json` 读。
- 用 `Math.random()` 生成地图或任何随机结果。

**推荐提示词**

```text
只允许修改 src/meta/、src/scenes/（除 BattleScene.js，含 overlays/）、
src/ui/{hud,modals,map}/、src/styles/（除 battle.css）、src/state/{RunState,SaveManager}.js、
src/data/、main.js、index.html 与 meta / UI 测试。
不得实现任何战斗数值公式，不得 import src/game/ 内部模块。
地图随机必须使用注入的 Rng；场景与浮层只读快照，通过 RunController 意图改状态。
事件 / 宝箱 / 商店 / 背包 / 技能树 / 设置一律做浮层。文案读 ui.json，不写内联样式。
```

### 5.3 3 号位（节点内容）

**可以让 AI 做**

- `config/events.json`、`chests.json`、`shop.json`、`items.json` 的事件文案、三个选项、奖励、商品与道具条目。
- `assets/events/`、`assets/chests/` 的配图选择与路径填写。
- 新建道具 / 商品 / 奖励条目时填写临时数值，并在 PR 中标注。

**绝对不能让 AI 做**

- 修改 `src/` 下任何代码。
- 修改他人配置：`battle.config.json`、`weapons.json`、`combos.json`、`bosses.json`、`effects.json`、`upgrades.json`、`map.json`、`scenes.json`、`skills.json`、`ui.json`。
- 在 JSON 中写公式、表达式、函数、颜色或像素。
- 编造不存在的 `kind`、`itemId`、`weaponId`、`skillId`。
- 修改 `SCHEMA.md` / `data_rules.md`；字段需求提交给 4 号位。
- 把临时数值当作最终平衡结论，或让数值留空 / `null`。

**推荐提示词**

```text
只允许修改 config/events.json、config/chests.json、config/shop.json、config/items.json
与 assets/events/、assets/chests/。
所有引用必须指向已存在的 id；新增道具可暂填合法数值，并在 PR 标注“临时数值”。
不得写公式、颜色、像素；不得改 src/ 与其他配置文件。
输出新增 / 修改的条目清单与引用检查结果。
```

### 5.4 4 号位（数据与数值）

**可以让 AI 做**

- `config/` 其余文件：战斗、武器、连招、Boss、效果、强化、地图、场景、技能树、UI 文案。
- `events / chests / shop / items` 中数值字段的定稿与平衡。
- `SCHEMA.md`、`data_rules.md`、`tests/data/`、`config-validation` 用例。
- 权重分布、价格曲线、掉落期望与引用完整性分析。

**绝对不能让 AI 做**

- 修改 `src/` 下任何代码。
- 修改 3 号位内容文件的结构、id 与文案；需要新增字段时先提契约 PR，由 3 号位落数据。
- 在 JSON 中写公式、表达式、函数、颜色或像素。
- 未写入 `SCHEMA.md` / `data_rules.md` 就新增字段。
- 编造不存在的 `actionId`、`comboId`、`dropPoolId`、`itemId`。
- 在代码里要求默认值兜底；配置缺失应报错。
- 定稿数值时静默覆盖 3 号位的临时数值；必须在 PR 中列出替换清单并通知 3 号位。

**推荐提示词**

```text
只允许修改 config/（除 events / chests / shop / items 的结构、id、文案）、
SCHEMA.md、data_rules.md 与 tests/data/。
新增字段先写契约再写数据；不得写公式；引用必须可校验。
3 号位内容文件只改数值字段，并输出替换清单与校验结果。
```

## 6. 接口冻结与跨层变更

以下接口变更必须先合并契约 PR：

| 接口 | 归属 | 影响方 |
|---|---|---|
| `BattleModule.start / onResult` | 1 号 | 2 号 |
| `BattleScene` 入参与结果回写 | 1 号 | 2 号 |
| `RunController` 方法与 `RunState` 快照（含 `getHudSnapshot` / `getStatsSnapshot` / 商店与技能树意图） | 2 号（状态结构需 1 号、4 号确认） | 1 号、3 号、4 号 |
| Scene 生命周期与 `SceneContext` | 2 号 | 1 号 |
| `OverlayManager.open / close` 与浮层 id 集合 | 2 号 | 1 号、3 号 |
| `MapGenerator.generateMap` 输出 `MapGraph` | 2 号 | 4 号 |
| `scenes.json` / `ui.json` / `map.json` / `skills.json` 字段 | 4 号 | 1 号、2 号、3 号 |
| `events.json` / `chests.json` / `shop.json` / `items.json` 结构 | 4 号 | 3 号、2 号 |
| `SCHEMA.md` 全量字段 | 4 号 | 1 号、2 号、3 号 |

跨层变更流程：

1. 提 Issue 或契约 PR，写清新字段、默认行为、兼容方式。
2. 归属人合并契约。
3. 各层分别提 PR 实现。
4. 2 号位做集成 PR，跑完整验收。

## 7. 当前分工与开发顺序

| 阶段 | 负责人 | 内容 | 验收 |
|---|---|---|---|
| P0~P4 地基（已完成） | 历史分工，见 git 记录 | 场景收敛、外层契约与最小配置、浮层容器、HUD、一局闭环、存档 | 已完成 |
| P4 收尾（进行中） | 2 号位 | 独立 Resolver 拆分、商店会话与强化细节补全、存档边界回归 | 无内联重复结算逻辑，回归全绿 |
| 战斗打磨（进行中） | 1 号位 | 战斗规则与表现、战斗测试、`BattleModule` 稳定性 | 战斗用例全绿，无 DOM / 硬编码数值 |
| 外围与地图（进行中） | 2 号位 | 非战斗场景 UI、六个浮层、`MapGenerator`、HUD、存档 | 全流程可用，无控制台报错 |
| 内容填充（进行中） | 3 号位 | 事件、宝箱、商店、道具内容 | `Validator` 通过，无占位假逻辑 |
| 数值与契约（持续） | 4 号位 | `SCHEMA.md`、数值平衡、校验规则 | 校验全绿，临时数值全部定稿 |
| 发布前联调 | 2 号位集成，全员参与 | 回归测试、正式资源、部署 | 测试全绿，发布说明完成 |

并行前提：

- 字段契约先由 4 号位合并，1 / 2 / 3 号位再按契约实现。
- 1 号位冻结 `BattleModule` 与 `BattleScene` 结果结构，2 号位只通过门面接入。
- 3 号位的内容依赖 `SCHEMA.md` 中的 Effect 与字段定义；临时数值可先落，但不得作为平衡结论。
- 战斗数值由 4 号位定稿，1 号位不得在代码里写死。
- 普通战斗胜利不升层；升层只由 Boss 节点完成触发。

## 8. 冲突处理

- 合并冲突：先联系对方，确认语义后在**自己的分支**解决；不得直接改对方文件。
- 同一文件被两人需要修改：由归属人统一改，另一人提供补丁说明。
- AI 生成了跨目录改动：立即停止，删除越界改动，改为提需求。
- 紧急修复：可先修后补 PR，但必须当天通知全员并在 PR 中说明原因。

## 9. 提交前检查清单

**1 号位**

- [ ] 战斗用例全绿（`engine / combo / rage / panel / turn-order`）
- [ ] `src/game/` 无 DOM、无 `Math.random()`、无硬编码数值
- [ ] `BattleScene` 只通过 `BattleModule` 启动 / 收结果，表现只读快照
- [ ] 未改非战斗 UI、`src/meta/`、非 `battle.css` 样式与 `config/`

**2 号位**

- [ ] `meta/` 无 DOM，不 import `scenes/` 或 `ui/`
- [ ] 场景只有 home / map / battle；事件、宝箱、商店、背包、技能树、设置均为浮层
- [ ] 无任何战斗数值计算；数值来自 snapshot，文案来自 `ui.json`
- [ ] 地图与随机结果全部走注入的 `Rng`，无 `Math.random()`
- [ ] 触屏可操作，无仅 hover 交互；背景缺图不报错
- [ ] 未改 `src/game/`、`BattleScene`、战斗 UI / `battle.css`、`BattleState`
- [ ] 未改 `config/` 数值与 `events / chests / shop / items` 内容（只提需求）

**3 号位**

- [ ] 事件、宝箱、商店、道具条目引用完整，`effect.kind` 合法
- [ ] 新增条目无 `null` 数值，临时数值已在 PR 中标注并 @ 4 号位
- [ ] 未改 `src/`、`SCHEMA.md`、`data_rules.md` 与他人配置文件
- [ ] 选项数量、奖励结构、商品栏位符合 `SCHEMA.md`
- [ ] 未把临时数值当作最终平衡结论

**4 号位**

- [ ] `Validator` 通过，引用完整
- [ ] 无公式、无颜色 / 像素
- [ ] 新字段已写入 `SCHEMA.md` / `data_rules.md`
- [ ] `config/` 全部文件字段完整，权重与价格合法
- [ ] 3 号位内容文件只改数值字段，替换清单已通知 3 号位
- [ ] 未改 `src/` 下任何代码
