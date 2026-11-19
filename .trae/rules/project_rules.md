# 项目规则（Project Rules）

## 1. 当前范围

- 本项目当前**只开发战斗节点（Battle Node）**。
- 禁止创建主菜单、肉鸽路线图、事件节点及对应入口。
- 战斗模块必须可独立启动调试，也必须能被未来外层系统以参数唤醒。

## 2. 技术栈约束

- 原生 HTML / CSS / JavaScript（ES Module），无框架、无打包器。
- 不引入 npm 运行时依赖，不使用仅特定浏览器支持的 API。
- 必须通过 HTTP 静态服务器访问（配置走 `fetch`，不能 `file://` 直接打开）。
- 响应式 + 触屏优先：可点击区域不小于 44px，禁止只依赖 hover 的操作。

## 3. 分层与依赖方向

```
ui  →  game  →  state / data
game  ✗→ DOM / window / document
game  ✗→ ui
```

- `src/game/`：纯逻辑，可脱离浏览器单测；禁止 import `ui/`，禁止访问 DOM。
- `src/ui/`：只读状态快照、只发玩家意图；唯一双向桥是 `ui/bridge/BattlePresenter.js`。
- `src/state/`：`RunState`（局内持久化状态）、`BattleState`（单场战斗）、`SaveManager`（IndexedDB）。
- `src/data/`：`ConfigLoader`（fetch + 深冻结）、`Validator`（启动即校验）。
- `config/`：纯数据、只读；不得写入表达式、函数或任何逻辑。

## 4. 模块契约

- 唯一对外门面 `BattleModule`：
  - `start({ bossId, scaling, playerSavedData })`
  - `onResult(cb)`，输出 `{ result, playerSavedData, drops, battleLog }`
  - `abort()`
- 外部不得直接调用 `BattleEngine`、`BossAI` 等内部模块。
- 玩家持久状态（装备、升级、铸魂、药品、饰品、升级点、铸魂次数）由 `RunState` 持有，不得塞进单场战斗状态。

## 5. 数据驱动

- 所有数值、文案、权重、动画时长来自 `config/*.json`，代码中禁止硬编码业务数值（0/1 等边界值除外）。
- 新机制先加配置字段，再写逻辑。
- 配置缺失或引用断裂时启动即报错，不静默兜底。

## 6. 表现层约定

- 角色立绘用 `<img>` 加载 GIF，切换 `src` 强制重播，切换前预加载。
- 动画完成回调由可注入的 Scheduler（默认 setTimeout）提供，逻辑层不直接计时、不操作 DOM。
- 行动方高亮、对方变暗、当前操作图标闪烁、受击白闪，均由 `BattlePresenter` 依逻辑事件驱动。
- 所有数值统一显示 1 位小数（`toFixed(1)`），内部计算统一 `round1`。

## 7. 存档

- 使用 IndexedDB，单存档位，由 `SaveManager` 封装，支持导出/导入 JSON。
- 存档带 `saveVersion` 与 `schemaVersion`，结构变更时必须写迁移函数。

## 8. 代码风格

- ES Module + 具名导出；类文件 PascalCase，工具文件 camelCase。
- 纯函数优先；随机数必须来自注入的 `Rng`，禁止裸 `Math.random()`。
- 注释使用中文，只解释“为什么”，不复述代码。
- 未实现的能力用 `// 预留:` 标注；禁止把占位逻辑伪装成已完成。

## 9. 禁止事项

- 禁止写成单文件游戏。
- 禁止在 UI 层计算伤害、杀气、连招。
- 禁止硬编码武器 / Boss / 连招 / 面板按钮数据。
- 禁止用 `localStorage` 承载存档（仅允许存 UI 偏好）。
