# AGENTS.md

## 项目概述

- 项目：**2D 回合制战斗模块（Battle Node）**，中式武侠题材。
- 形态：纯前端 H5（HTML / CSS / 原生 ES Module），无框架、无打包器。
- 当前阶段：**只做战斗节点**，不包含主菜单、肉鸽路线图、事件节点。
- 战斗模块需高内聚低耦合，未来作为节点嵌入外层游戏循环。
- 沟通与代码注释语言：中文。

## 文档位置

- 企划书原件（只读参考）：`e:\2026上  作业\AI辅助应用开发\作业\完整企划书（战斗模块阶段）.docx`
- 数据结构契约（武器 / Boss / 操作序列的唯一事实源）：`SCHEMA.md`
- 规则单一事实源：`.trae/rules/`
  - `project_rules.md`：范围、技术栈、分层、模块契约、代码风格
  - `combat_rules.md`：全部战斗数值与流程，改规则先改这里
  - `data_rules.md`：JSON 配置、引用完整性、加成结算顺序、存档

**开始任何实现前，先读这三份规则；规则与口头描述冲突时，以规则为准并提示用户。**

## 当前状态

- **V0.1 极简竖切已实现**：7 个配置、配置校验、战斗核心、最简 UI 与演出、逻辑测试（`tests/index.html`，27 项全绿）。
- 尚未落地：升级树、铸魂、饰品、掉落、无尽层数、IndexedDB 存档、背包、多 Boss、正式美术。
- 已确认的设计修正：
  1. 面板：`1.x` 第一把普通武器、`2.x` 第二把普通武器、切换只在两者间互换；`3.1/3.2` 为巨斧/弓箭且常驻；`4.x` 药品。
  2. 特殊武器**只有普攻**。
  3. 杀气 `≤ 0` 即视为归零（余额不足同样处理）。
  4. 防御减半不取整，数值统一显示 1 位小数。
  5. 特殊攻击次数为全局共享池。
  6. 连招遇到防御/药品/切换会断连，但需预留“不断连”扩展位。

## 目标目录结构

```
/
├─ index.html
├─ config/                  # 纯 JSON 数据，逻辑层只读
├─ assets/{gifs,icons,audio}/
├─ src/
│  ├─ main.js               # 启动装配
│  ├─ game/                 # 纯逻辑，禁止 DOM
│  ├─ state/                # RunState / BattleState / SaveManager
│  ├─ data/                 # ConfigLoader / Validator
│  ├─ ui/                   # 渲染层 + bridge/BattlePresenter
│  ├─ styles/
│  └─ utils/
└─ tests/                   # 纯逻辑单测
```

## 命令

```powershell
npx serve . -l 5173      # 启动静态服务器（推荐）
# 或
python -m http.server 5173
```

打开 `http://localhost:5173`。禁止用 `file://` 打开页面，否则 JSON 无法加载。

## 硬性规则（摘要）

1. 不开发地图、主菜单、事件节点。
2. 所有数值与文案来自 `config/*.json`，代码中禁止硬编码业务数值；数据结构变更先改 `SCHEMA.md`。
3. `src/game/` 不得 import `src/ui/`，不得访问 DOM。
4. 只有 `BattleModule` 对外暴露；输入 `{ bossId, scaling, playerSavedData }`，输出 `{ result, playerSavedData, drops, battleLog }`。
5. 指令入队即快照，结算只读快照，不得读当前面板状态。
6. 玩家持久状态归 `RunState`，不得写入单场 `battleState`。
7. 随机数必须走注入的 `Rng`，禁止裸 `Math.random()`。
8. 数值内部 `round1`，显示 `toFixed(1)`。
9. 存档使用 IndexedDB，结构变更需迁移。
10. 未实现能力标注 `// 预留:`，不得伪装完成。

## 工作流

1. 读 `.trae/rules/` 与相关现有代码，确认改动边界。
2. 涉及规则变化时，先更新 `combat_rules.md` / `data_rules.md`，再改代码。
3. 按模块顺序实现：配置与校验 → 回合状态机 → 指令队列 → 结算 → UI 渲染 → 演出动画。
4. 逻辑层改动必须能通过 `tests/` 下的纯逻辑测试（无 DOM）。
5. 完成前自查：
   - [ ] 无硬编码数值 / 文案
   - [ ] 逻辑层无 DOM 依赖
   - [ ] 新字段已写入配置与存档结构
   - [ ] 数值显示为 1 位小数
   - [ ] 规则文件与代码一致

## 外部阻塞

- Boss 攻击伤害为占位值（普攻 6 / 特殊 10），用户可随时调整。
- 美术资源（GIF 立绘、图标）尚未提供，使用占位路径与缺省样式，不阻塞逻辑开发。
