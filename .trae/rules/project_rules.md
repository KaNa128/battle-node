# 项目规则（Project Rules）

## 1. 项目范围

- 项目分为两层：**战斗节点（Battle Scene）** 与 **肉鸽外层（Meta）**。
- 外层能力包括：游戏首页、杀戮尖塔式路线图、顶部 HUD、全局背包、事件、宝箱、商店、技能树、设置、局内存档。
- **场景只有三个**：`home`、`map`、`battle`。
- 事件、宝箱、商店、背包、技能树、设置一律是**全局弹窗浮层（Overlay）**，由 `OverlayManager` 管理；不注册为 Scene，不参与路由与转场，底层场景保持挂载。
- 战斗模块必须可独立启动调试，也必须作为普通场景被外层以参数唤醒。
- 战斗失败即本局失败：停在战斗结算层并显示「返回首页」，点击后清空本局回首页；胜利回路线图。
- **只有击败该层 Boss 才进入下一层**；普通战斗胜利只完成当前节点，楼层不变。
- 图鉴本期不做，首页只保留不可用入口，代码标注 `// 预留:`。
- 每个场景都必须预留背景层：路径来自 `config/scenes.json`，缺图时由样式兜底；弹窗由遮罩 + 面板构成，不要求背景图。

## 2. 技术栈约束

- 原生 HTML / CSS / JavaScript（ES Module），无框架、无打包器。
- 不引入 npm 运行时依赖，不使用仅特定浏览器支持的 API。
- 必须通过 HTTP 静态服务器访问（配置走 `fetch`，不能 `file://` 直接打开）。
- 响应式 + 触屏优先：可点击区域不小于 44px，禁止只依赖 hover 的操作。

## 3. 分层与依赖方向

```
scenes         → meta → state / data
scenes         → ui / styles
scenes/overlays→ meta / ui / styles
ui             → 只读快照
game           ✗→ DOM / ui / meta / scenes
meta           ✗→ ui / scenes（场景工厂与渲染宿主由 main.js 注入）
```

- `src/meta/`：外层逻辑（SceneManager、RunController、MapGenerator、EventResolver、ChestResolver、ShopService、SkillTree、StatsCalculator、RewardSystem），不访问 DOM，不 import `scenes/` 与 `ui/`。
- `src/scenes/`：只有 `SceneShell` 与 `HomeScene / MapScene / BattleScene`；场景内不放事件、宝箱、商店、背包、技能树、设置的实现。
- `src/scenes/overlays/`：`OverlayManager` 与六个浮层容器（`inventory / event / chest / shop / skills / settings`），只负责挂载、焦点、开关与意图转发，不计算数值。
- `src/game/`：纯战斗逻辑，可脱离浏览器单测；禁止 import `ui/`、`scenes/`、`meta/`，禁止访问 DOM。
- `src/ui/`：只读状态快照、只发玩家意图；包含战斗组件、`hud/`、`modals/`；战斗唯一双向桥是 `ui/bridge/BattlePresenter.js`。
- `src/state/`：`RunState`（局内持久化状态）、`BattleState`（单场战斗）、`SaveManager`（IndexedDB）。
- `src/data/`：`ConfigLoader`（fetch + 深冻结）、`Validator`（启动即校验）。
- `src/main.js`：组合根，唯一同时 import data / state / meta / scenes / ui / game 的位置。
- `config/`：纯数据、只读；不得写入表达式、函数或任何逻辑。
- 属性汇总（血量上限、杀气上限、攻击力等）由 `src/meta/` 计算，UI 只读快照，不得自行推导。

## 4. 模块契约

### 4.1 场景与路由

- `SceneManager` 是唯一场景切换入口，位于 `src/meta/SceneManager.js`，不访问 DOM。
- `SceneManager` 由 `main.js` 注入：场景工厂表（仅 `home / map / battle`）、渲染宿主（`SceneShell`）、`SceneContext`。
- 场景只能通过 `ctx.navigate(sceneId, params, options)` 请求跳转，不得直接实例化其他场景。
- 场景生命周期固定为：`mount(container, ctx)` → `init(params)` → `leave()` → `destroy()`；`mount` 只执行一次。
- `init(params)` 允许返回 Promise；转场期间 `SceneShell` 保持 `Loading...` 遮罩，直到 `init` 完成才淡出。
- 任意场景都可通过 `ctx.openInventory()` 打开全局背包浮层，不得各自实现第二套背包。
- `main.js` 是组合根，负责把场景工厂、数据、状态、渲染宿主与浮层管理器组装起来；`meta` 不得 import `scenes/`。

### 4.2 战斗门面

- 唯一对外门面 `BattleModule`：
  - `start({ bossId, scaling, playerSavedData })`
  - `onResult(cb)`，输出 `{ result, playerSavedData, drops, battleLog }`
  - `abort()`
- 外部不得直接调用 `BattleEngine`、`BossAI` 等内部模块；`BattleScene` 只通过 `BattleModule` 接入战斗。
- 玩家持久状态（装备、强化、升级、铸魂、药品、饰品、金币、技能点）由 `RunState` 持有，不得塞进单场战斗状态。
- 战斗只接收 `playerSavedData` 快照，结束后交回新的快照；`RunController` 负责合并与存档。
- 战斗胜利只完成节点；是否进入下一层由 `RunController` 依据节点类型（Boss / 普通）决定。

### 4.3 全局弹窗（Overlay）

- `OverlayManager` 位于 `src/scenes/overlays/OverlayManager.js`，由 `main.js` 创建并注入 `SceneContext`。
- 接口固定为：`open(id, params) → Promise<result>`、`close(result?)`、`current()`。
- 同一时刻只允许一个弹窗；打开新弹窗先关闭旧弹窗（旧弹窗 `resolve(null)`）。
- 弹窗不触发 `SceneManager` 的转场，不叠加 `Loading...` 遮罩；底层场景不卸载、不重置。
- 弹窗只能通过 `ctx` 暴露的意图方法改写状态，不得直接改 `RunState` 字段。
- 弹窗必须支持 `Esc` / 右上角关闭（除战斗结算页），关闭前有确认的弹窗需二次确认。
- 战斗结算页（胜利 / 失败）属于 `BattleScene` 内部状态，不是弹窗。

弹窗清单：

| id | 触发点 | 说明 |
|---|---|---|
| `inventory` | HUD 背包按钮 | 全局唯一背包，三栏布局 |
| `event` | 路线图事件节点 | 左图 + 标题 + 可滚动描述 + 三个选项 |
| `chest` | 路线图宝箱节点 | 点击开箱 GIF，图片下方列出获得物 |
| `shop` | 路线图商店节点 | 三栏商品 + 每栏独立刷新 |
| `skills` | HUD 头像 | 技能树，左上点数、右上返回 |
| `settings` | HUD 齿轮 | 设置项，仅写 UI 偏好 |

### 4.4 HUD

- HUD 仅指顶部栏，除 `home` 外所有场景显示（含 `battle`）。
- 从左到右固定顺序：背包按钮、人物头像（打开技能树）、血量条、杀气条、金币、普通武器强化次数、特殊武器强化次数、药品强化次数、设置齿轮。
- 数据全部来自 `ctx.getHudSnapshot()`；HUD 不自行计算任何数值。
- 杀气条固定显示杀气**上限**（战斗外按满条渲染），血量条显示**当前剩余值**。
- HUD 由 `ui/hud/HudView.js` 渲染，`SceneShell` 提供挂载点；点击只发意图。
- 战斗中删除独立背包按钮，统一由 HUD 背包打开同一个浮层。

### 4.5 背包、属性与强化

- 全局唯一背包弹窗：左侧全部装备列表（含类别筛选），中间已装备槽位，右侧综合属性（血量 / 杀气 / 攻击力等）。
- 战斗外可强化、换装、使用；战斗中将强化、换装等**修改类操作置灰**，筛选、悬停、查看保持可用。
- 强化是装备强化等级：每强化一次消耗 1 次对应类别次数，单件上限 30 级；次数分普通武器 / 特殊武器 / 药品三类，可由事件与商店产出。
- 强化等级与剩余次数写入 `RunState` 并纳入存档。
- 属性汇总（`maxHp`、`maxRage`、`attackPower` 等）由 meta 的 `StatsCalculator` 统一计算并输出快照；UI 不得自行叠加加成。
- 「武器升级树 / 武器异变」本期不做，只保留 `// 预留:` 与配置引用位。

### 4.6 路线图

- `MapGenerator` 是纯函数 + 注入 `Rng`，输入 `{ floor, seed, config }`，输出 `MapGraph`。
- 每层从底部固定的初始特殊事件出发向上分叉；战斗、事件、宝箱、商店按权重随机安插；顶部为该层唯一 Boss。
- 每层生成后立即写入 `RunState`，当层内节点固定不变；重进路线图读存档，不重新生成。
- 玩家只能选择与当前节点连通的下一层节点。
- 节点完成后记录到 `completedNodeIds`；**只有 Boss 节点完成才调用 `advanceFloor()`**。

## 5. 数据驱动

- 所有数值、文案、权重、动画时长来自 `config/*.json`，代码中禁止硬编码业务数值（0/1 等边界值除外）。
- 新机制先加配置字段，再写逻辑。
- 配置缺失或引用断裂时启动即报错，不静默兜底。
- 金币只由战斗胜利、Boss 战、宝箱、事件产出；唯一消耗途径是商店购买与刷新。

## 6. 表现层约定

- 角色立绘用 `<img>` 加载 GIF，切换 `src` 强制重播，切换前预加载。
- 动画完成回调由可注入的 Scheduler（默认 setTimeout）提供，逻辑层不直接计时、不操作 DOM。
- 行动方高亮、对方变暗、当前操作图标闪烁、受击白闪，均由 `BattlePresenter` 依逻辑事件驱动。
- 所有数值统一显示 1 位小数（`toFixed(1)`），内部计算统一 `round1`。
- 每个场景统一由 `SceneShell` 渲染背景层（`.scene-bg`），路径来自 `config/scenes.json`；缺图时显示样式兜底，不允许场景各自写死 `background-image`。
- 弹窗统一由 `SceneShell` 的浮层宿主渲染遮罩与面板容器，样式集中在 `styles/modals.css`；弹窗内容不得各自实现遮罩与层级。
- 背景图的裁切、遮罩、暗角属于 `styles/`，不得写入 JSON。

## 7. 存档

- 使用 IndexedDB，单存档位，由 `SaveManager` 封装，支持导出/导入 JSON。
- 存档带 `saveVersion` 与 `schemaVersion`，结构变更时必须写迁移函数。
- 节点结算后、离开场景前写档；商店购买与刷新属于当次会话状态，不写入存档。
- 战斗失败：清空局内存档并回到首页；「继续」入口在无存档时置灰。
- `localStorage` 仅允许保存 UI 偏好与设置项，不得承载局内进度。

## 8. 代码风格

- ES Module + 具名导出；类文件 PascalCase，工具文件 camelCase。
- 纯函数优先；随机数必须来自注入的 `Rng`，禁止裸 `Math.random()`。
- 注释使用中文，只解释“为什么”，不复述代码。
- 未实现的能力用 `// 预留:` 标注；禁止把占位逻辑伪装成已完成。

## 9. 禁止事项

- 禁止写成单文件游戏。
- 禁止在 UI 层计算伤害、杀气、连招、属性加成、金币结算。
- 禁止硬编码武器 / Boss / 连招 / 面板按钮 / 商店价格 / 技能树数据。
- 禁止把事件、宝箱、商店、背包、技能树、设置注册成 Scene。
- 禁止保留第二套战斗内背包或战斗内独立背包按钮。
- 禁止用 `localStorage` 承载存档（仅允许存 UI 偏好）。
- 禁止场景或弹窗直接改写 `RunState` 字段，必须通过 `RunController` 的意图方法。
- 禁止普通战斗胜利后升层；升层只由 Boss 节点完成触发。
- 禁止跨成员物理目录直接改文件；目录归属见 `collaboration_rules.md`。
