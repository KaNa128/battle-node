# 4 人协作与目录隔离规范（Collaboration Rules）

> 本文件是 4 人团队使用 GitHub + AI 协作时的强制规则。目录归属以本文件为准；与口头分工冲突时，先改本文件再改代码。

## 1. 核心原则

- **一个物理目录只有一个主责人**，其他人只读。
- **一个 PR 只改一个层**，跨层改动拆成多个 PR，由集成负责人串联。
- **接口先行**：先冻结接口与配置字段，再并行开发。
- **AI 只在本人的目录内工作**，提示词必须写明允许修改的路径。
- **冲突不靠事后合并解决，靠目录隔离避免。**

## 2. 目录与文件归属

| 成员 | 独占写入 | 只读依赖 |
|---|---|---|
| 1 号位 | `src/game/`、`src/state/`、`tests/game/`、`.trae/rules/combat_rules.md` | `config/`、`SCHEMA.md`、`src/data/` |
| 2 号位 | `src/ui/`（含 `hud/`、`modals/`）、`src/styles/`、`assets/`、`tests/ui/` | 状态快照、`config/ui.json`、`scenes.json` |
| 3 号位 | `src/meta/`、`src/scenes/`（含 `overlays/`）、`src/data/`、`src/main.js`、`index.html`、`AGENTS.md`、`PROJECT-STRUCTURE.md`、`.trae/rules/project_rules.md`、`.trae/rules/collaboration_rules.md`、`tests/runner.js`、`tests/index.html`、`tests/meta/` | `src/game/BattleModule`、`src/state/`、`config/` |
| 4 号位 | `config/`、`tests/data/`、`SCHEMA.md`、`.trae/rules/data_rules.md` | `src/` 全部（只读） |

补充说明：

- `tests/` 整体由 4 号位负责规范与入口；为避免排队，测试用例按二级目录下放写入权：`tests/game/` → 1 号，`tests/meta/` → 3 号，`tests/ui/` → 2 号，`tests/data/` 与 `runner.js`、`index.html` → 4 号。不得改他人子目录。
- 现状：测试文件平铺在 `tests/` 根目录（`engine / combo / rage / panel / turn-order / config-validation`），尚未建立二级目录；拆分前按“谁负责被测算模块谁维护对应用例”执行，拆分后再按上面的子目录归属落位。
- `assets/` 由 2 号位独占；背景图文件名由 4 号位在 `scenes.json` 中登记，事件 / 宝箱 / 技能树 / HUD 图标路径分别在 `events.json`、`chests.json`、`skills.json`、`ui.json` 登记，3 号位只引用路径。
- `config/ui.json` 由 4 号位独占；2 号位与 3 号位需要新文案时，提交文案键需求，由 4 号位落盘。
- 根目录的 `AGENTS.md`、`PROJECT-STRUCTURE.md` 由 3 号位维护；`SCHEMA.md` 由 4 号位维护；规则文件按上表分文件归属。
- **弹窗拆分**：`src/scenes/overlays/`（浮层容器、`OverlayManager`、开关与焦点）归 3 号位；`src/ui/modals/`（背包 / 事件 / 宝箱 / 商店 / 技能树 / 设置的视觉组件）归 2 号位。两侧通过快照与意图函数对接，不得互相 import 内部实现。
- **HUD 拆分**：`src/ui/hud/`（顶部栏渲染）归 2 号位；`SceneShell` 的 HUD 挂载点与显隐规则归 3 号位；HUD 数据由 3 号位的 `RunController.getHudSnapshot()` 提供。

## 3. 文件级规则

1. 不得修改他人独占目录中的任何文件，包括格式化、重命名、批量替换。
2. 需要他人目录改动时，开 Issue 或 PR 评论说明「文件、原因、期望接口」，由主责人实现。
3. 共享契约文件（`SCHEMA.md`、`scenes.json`、`ui.json`）只由归属人落盘；其他人在 PR 中提出字段需求。
4. 接口变更（`BattleModule` 入参 / 出参、`RunController` 方法、Scene 生命周期）必须先合并契约 PR，再改实现。
5. 发现别人目录里有 bug：不要直接修，提交复现步骤与日志，由主责人修复。

## 4. Git 分支与 PR 规范

### 4.1 分支命名

| 类型 | 格式 | 示例 |
|---|---|---|
| 功能 | `feature/<area>-<topic>` | `feature/meta-scene-router` |
| 修复 | `fix/<area>-<topic>` | `fix/battle-rage-zero` |
| 文档 | `docs/<topic>` | `docs/collaboration-guide` |
| 测试 | `test/<area>-<topic>` | `test/meta-map-generator` |
| 杂项 | `chore/<topic>` | `chore/gitignore` |

`area` 取值：`battle`、`ui`、`meta`、`data`。

### 4.2 分支纪律

- `main` 受保护，禁止直接 push，禁止 force push。
- 一人一分支，不共用个人分支；集成分支由 3 号位创建并按需删除。
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

### 5.1 1 号位（战斗核心逻辑）

**可以让 AI 做**

- `src/game/` 的纯逻辑、状态机、结算、单元测试。
- 快照生成、事件派发、随机源注入、边界条件测试。

**绝对不能让 AI 做**

- 访问 DOM、`window`、`document`，或 import `ui/`、`scenes/`、`meta/`。
- 在代码里写死伤害、杀气、权重、文案；缺配置时必须报错，不得给默认值。
- 把玩家持久状态写进 `BattleState`。
- 用 `Math.random()` 代替注入的 `Rng`。
- 修改 `config/`、`src/ui/`、`src/scenes/`、`src/meta/`。

**推荐提示词**

```text
只允许修改 src/game/ 与 tests/game/。
所有数值从注入的 config 读取，缺失即抛错，不要写默认值。
禁止 DOM / window / document，禁止 import ui、scenes、meta。
随机数必须使用注入的 Rng。改完列出修改文件与新增测试。
```

### 5.2 2 号位（战斗表现与全局 UI）

**可以让 AI 做**

- `src/ui/`、`src/styles/`、`assets/` 的组件、布局、动画、响应式与视觉验收。
- 根据快照渲染、绑定点击意图、Tooltip、转场与背景样式。
- `src/ui/hud/HudView.js` 与 `src/ui/modals/` 下的背包 / 事件 / 宝箱 / 商店 / 技能树 / 设置视觉组件。

**绝对不能让 AI 做**

- 计算伤害、杀气、连招、命中、胜负、属性加成、金币结算或强化结果。
- import `src/game/` 内部模块（只能通过 `BattlePresenter` 与快照）。
- 修改 `RunState` / `BattleState`，或直接调用 `BattleEngine`。
- 修改 `config/`、`src/meta/`、`src/scenes/`、`src/scenes/overlays/`、`src/game/`。
- 在 JS 里写死数值或文案；数值只从 snapshot 读，文案只从 `ui.json` 读。
- 在场景或弹窗里写 `style="background-image: ..."`；背景路径由配置与 `SceneShell` 负责。
- 在弹窗组件内自己实现遮罩、层级、Esc 关闭；这些由 `OverlayManager` 统一负责。

**推荐提示词**

```text
只允许修改 src/ui/（含 hud/、modals/）、src/styles/、assets/。
不得 import src/game/ 内部模块，不得实现任何数值公式。
所有数值从 snapshot 读取，文案从 config/ui.json 读取。
只负责渲染与交互意图，不修改任何状态；遮罩与开关交给 OverlayManager。
```

### 5.3 3 号位（外围场景与集成）

**可以让 AI 做**

- `SceneManager`、`SceneShell`、三个场景、`OverlayManager` 与浮层容器、路由、`RunController`、地图生成、事件 / 宝箱 / 商店 / 技能树结算。
- `main.js` 装配、`ConfigLoader` / `Validator` 扩展。
- 场景背景层接入、HUD 挂载点与转场编排。

**绝对不能让 AI 做**

- 在场景、弹窗或 meta 里实现战斗公式、计算伤害 / 杀气 / 连招。
- 直接修改 `src/game/`、`src/state/` 的内部实现；只能调用公开方法。
- 修改 `config/` 的数值（向 4 号位提需求）。
- 修改 `src/ui/` 或 `src/styles/`（向 2 号位提样式类需求）。
- 让 `meta/` import `scenes/` 或 `ui/`；场景工厂与浮层管理器只能由 `main.js` 注入。
- 把事件、宝箱、商店、背包、技能树、设置注册成 Scene。
- 场景或弹窗直接改写 `RunState` 字段；必须走 `RunController`。

**推荐提示词**

```text
只允许修改 src/meta/、src/scenes/（含 overlays/）、src/data/、main.js 与 tests/meta/。
不得实现战斗数值逻辑，不得修改 src/game/ 或 src/state/ 内部。
事件 / 宝箱 / 商店 / 背包 / 技能树 / 设置一律做浮层，不注册为场景。
场景与浮层只读 RunController 快照，通过 navigate / open 触发。
所有配置从 config 读取，缺失即报错。不要写内联样式。
```

### 5.4 4 号位（数值策划与数据）

**可以让 AI 做**

- `config/*.json`、`SCHEMA.md`、`tests/data/`、校验规则与数值分析。
- 批量检查引用完整性、权重分布、掉落期望。

**绝对不能让 AI 做**

- 修改 `src/` 下任何代码。
- 在 JSON 中写公式、表达式、函数、颜色或像素。
- 未写入 `SCHEMA.md` / `data_rules.md` 就新增字段。
- 编造不存在的 `actionId`、`comboId`、`dropPoolId`。
- 在代码里要求默认值兜底；配置缺失应报错。

**推荐提示词**

```text
只允许修改 config/、tests/data/、SCHEMA.md、data_rules.md。
所有新增字段先写契约再写数据；不得写公式；引用必须可校验。
输出修改后的字段清单与校验结果。
```

## 6. 接口冻结与跨层变更

以下接口变更必须先合并契约 PR：

| 接口 | 归属 | 影响方 |
|---|---|---|
| `BattleModule.start / onResult` | 1 号 | 3 号、2 号 |
| `RunController` 方法与 `RunState` 快照（含 `getHudSnapshot` / `getStatsSnapshot` / 商店与技能树意图） | 3 号（状态结构需 1 号确认） | 2 号、4 号 |
| Scene 生命周期与 `SceneContext` | 3 号 | 2 号、1 号 |
| `OverlayManager.open / close` 与浮层 id 集合 | 3 号 | 2 号 |
| `MapGenerator.generateMap` 输出 `MapGraph` | 3 号 | 4 号、2 号 |
| `scenes.json` / `ui.json` 字段 | 4 号 | 2 号、3 号 |
| `map.json` / `events.json` / `chests.json` / `shop.json` / `skills.json` 字段 | 4 号 | 2 号、3 号 |
| `SCHEMA.md` 战斗与外围字段 | 4 号 | 1 号、2 号、3 号 |

跨层变更流程：

1. 提 Issue 或契约 PR，写清新字段、默认行为、兼容方式。
2. 归属人合并契约。
3. 各层分别提 PR 实现。
4. 3 号位做集成 PR，跑完整验收。

## 7. 外围系统开发顺序

| 阶段 | 负责人 | 内容 | 验收 |
|---|---|---|---|
| P0（已完成） | 3 号 | SceneManager、SceneShell、`Loading...` 转场、基础场景空壳、全局背包浮层 | 场景可切换，无控制台报错 |
| P1（已完成） | 4 号 | `SCHEMA.md` 补地图 / 事件 / 宝箱 / 商店 / 技能树 / 强化 / HUD 契约；`scenes.json` 收敛为 3 个场景；新增 `map.json`、`events.json`、`chests.json`、`shop.json`、`skills.json`；`upgrades.json.enhancement` | Validator 全绿，引用完整，背景路径齐全 |
| P2（已完成） | 3 号 | 场景收敛为 home / map / battle；`OverlayManager` 与六个浮层容器；HUD 挂载点与显隐；删除 event / chest 场景 | 任意场景可打开 / 关闭六个浮层，无残留计时器 |
| P3（已完成） | 2 号 | `HudView`、背包三栏、事件 / 宝箱 / 商店 / 技能树 / 设置视觉；`styles/modals.css` | 桌面与窄屏可用，触屏可操作，数值全部来自快照 |
| P4 地基（已完成） | 3 号 | `RunController` 新字段与意图方法、`MapGenerator`、事件 / 宝箱 / 商店 / 技能树结算、战斗回写、Boss 升层、失败清档、`SaveManager` 存档与恢复 | 一局可从首页走到 Boss、失败回首页、刷新后可续 |
| P4 收尾（进行中） | 3 号 | 独立 Resolver 拆分、商店会话与强化细节补全、存档边界场景回归 | 无内联重复结算逻辑，回归全绿 |
| P5 内容、平衡与联调 | 全员 | 事件 / 宝箱 / 商店 / 技能树内容、数值平衡、正式资源、回归测试与部署 | 测试全绿，无占位假逻辑，发布说明完成 |

并行前提：

- P1 的契约与配置必须先合并，P2 / P3 / P4 再按契约实现。
- 1 号位在 P1 期间冻结 `BattleModule` 契约，之后只做兼容性修复。
- 2 号位与 3 号位在浮层上的分工固定为：3 号位管容器与开关，2 号位管视觉组件。
- 普通战斗胜利不升层；升层逻辑只在 P4 的 Boss 节点验收。

## 8. 冲突处理

- 合并冲突：先联系对方，确认语义后在**自己的分支**解决；不得直接改对方文件。
- 同一文件被两人需要修改：由归属人统一改，另一人提供补丁说明。
- AI 生成了跨目录改动：立即停止，删除越界改动，改为提需求。
- 紧急修复：可先修后补 PR，但必须当天通知全员并在 PR 中说明原因。

## 9. 提交前检查清单

**1 号位**

- [ ] `tests/game/` 全绿
- [ ] 无 DOM、无 `Math.random()`、无硬编码数值
- [ ] 快照不可变，结算只读快照

**2 号位**

- [ ] 无任何数值计算（含 HUD、背包属性、商店价格、技能效果）
- [ ] 数值来自 snapshot，文案来自 `ui.json`
- [ ] 触屏可操作，无仅 hover 交互
- [ ] 弹窗视觉组件不自建遮罩 / 层级 / Esc 逻辑
- [ ] 未改配置、场景与 `src/scenes/overlays/`

**3 号位**

- [ ] 场景只有 home / map / battle；事件、宝箱、商店、背包、技能树、设置均为浮层
- [ ] 场景与浮层可进入、可离开、无残留计时器
- [ ] meta 无 DOM、无战斗公式
- [ ] 跳转参数与 `RunController` 写回一致
- [ ] 只有 Boss 节点完成才升层；普通战斗胜利不升层
- [ ] 失败清档并回首页；HUD 快照含金币与三类强化次数
- [ ] 背景层存在且缺图不报错

**4 号位**

- [ ] Validator 通过，引用完整
- [ ] 无公式、无颜色 / 像素
- [ ] 新字段已写入 SCHEMA / data_rules
- [ ] `map.json` / `events.json` / `chests.json` / `shop.json` / `skills.json` 与 `upgrades.enhancement` 字段完整
- [ ] 商店价格、刷新涨幅、强化上限、技能点消耗均来自配置
