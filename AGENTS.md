# AGENTS.md

## 项目概述

- 项目：**2D 回合制武侠肉鸽**，包含战斗节点（Battle Scene）与肉鸽外层（Meta）。
- 形态：纯前端 H5（HTML / CSS / 原生 ES Module），无框架、无打包器。
- 当前阶段：战斗 V0.1 已完成；外围系统进入 P1 契约与配置阶段。
- **场景只有三个**：`home`、`map`、`battle`；事件、宝箱、商店、背包、技能树、设置均为全局浮层。
- 战斗模块作为普通场景嵌入外层，由 `SceneManager` 调度。
- 每个场景都必须预留背景层，后续可直接替换背景照片。
- 沟通与代码注释语言：中文。

## 文档位置

- 企划书原件（只读参考）：`e:\2026上  作业\AI辅助应用开发\作业\完整企划书（战斗模块阶段）.docx`
- 数据结构契约（战斗 + 外层 + 快照的唯一事实源）：`SCHEMA.md`
- 目录、路由与数据流：`PROJECT-STRUCTURE.md`
- 规则单一事实源：`.trae/rules/`
  - `project_rules.md`：范围、技术栈、分层、场景 / 浮层契约、HUD、代码风格
  - `combat_rules.md`：全部战斗数值与流程，改规则先改这里
  - `data_rules.md`：JSON 配置、引用完整性、结算顺序、存档
  - `collaboration_rules.md`：4 人目录隔离、Git 分支、AI 使用边界、P0~P5 开发顺序

**开始任何实现前，先读这四份规则；规则与口头描述冲突时，以规则为准并提示用户。**

## 当前状态

- **V0.1 战斗竖切已实现**：战斗核心、无框尖塔式 UI、背包界面、逻辑测试（`tests/index.html`）。
- **P0~P3 页面骨架已落地**：场景收敛为 `home / map / battle`；`EventScene` / `ChestScene` 已删除；`OverlayManager` 与六个浮层容器（背包 / 事件 / 宝箱 / 商店 / 技能树 / 设置）可用；HUD、路线图、战斗胜负分流、失败回首页清档已串通。
- **已补最小配置**：`map.json`、`events.json`、`chests.json`、`shop.json`、`skills.json`、`upgrades.json`，可支撑一局从首页走到 Boss。
- **待实现 / 待扩充**：独立 Resolver 拆分、IndexedDB 存档与迁移、职业化内容与数值平衡、正式美术与音频；六个浮层当前为可交互骨架，内容需各负责人按目录归属扩充。
- **本期不做**：图鉴、武器异变 / 武器升级树、饰品、铸魂、正式美术与音频。

已确认的产品规则：

1. 面板：`1.x` 第一把普通武器、`2.x` 第二把普通武器、切换只在两者间互换；`3.1/3.2` 为巨斧/弓箭且常驻；`4.x` 药品。
2. 特殊武器**只有普攻**；特殊攻击次数为全局共享池。
3. 杀气 `≤ 0` 即视为归零（余额不足同样处理）；防御减半不取整；数值统一显示 1 位小数。
4. HUD 仅顶部栏，除首页外所有场景显示；杀气条固定显示上限，血量显示当前值。
5. 全局只有一个背包浮层，不再分战斗内 / 外；战斗中强化、换装置灰。
6. 强化是装备强化等级，每级消耗 1 次对应类别次数，单件上限 30 级；事件与商店可产出次数。
7. 路线图自下而上分叉，底部固定初始特殊事件，顶部唯一 Boss；只有 Boss 胜利才升层。
8. 事件 / 宝箱 / 商店 / 技能树 / 设置都是浮层，不注册为场景。
9. 金币仅用于商店；战斗失败即本局失败，停在结算页并可返回首页清档。
10. 普通战斗胜利 +1 技能点，Boss 战 +3；图鉴本期不做。

## 目标目录结构

```
/
├─ index.html
├─ config/                  # 纯 JSON 数据，逻辑层只读
├─ assets/
│  ├─ backgrounds/          # home / map / battle 背景
│  ├─ {events,chests,skills,ui}/
│  └─ {gifs,icons,audio}/
├─ src/
│  ├─ main.js               # 组合根：配置 → 状态 → 场景 / 浮层注册
│  ├─ meta/                 # 外层逻辑：SceneManager / RunController / MapGenerator / Resolvers
│  ├─ scenes/               # 三个场景 + SceneShell
│  │  └─ overlays/          # OverlayManager + 六个浮层容器
│  ├─ game/                 # 纯战斗逻辑，禁止 DOM
│  ├─ state/                # RunState / BattleState / SaveManager
│  ├─ data/                 # ConfigLoader / Validator
│  ├─ ui/                   # 战斗渲染 + hud/ + modals/
│  ├─ styles/
│  └─ utils/
└─ tests/                   # 纯逻辑单测（按 game / meta / data / ui 分区）
```

## 命令

```powershell
npx serve . -l 5173      # 启动静态服务器（推荐）
# 或
python -m http.server 5173
```

打开 `http://localhost:5173`。禁止用 `file://` 打开页面，否则 JSON 无法加载。

## 硬性规则（摘要）

1. 场景只有 `home / map / battle`；事件、宝箱、商店、背包、技能树、设置必须是浮层，不得注册为 Scene。
2. 所有数值与文案来自 `config/*.json`，代码中禁止硬编码业务数值；数据结构变更先改 `SCHEMA.md`。
3. `src/game/` 不得 import `src/ui/`、`src/scenes/`、`src/meta/`，不得访问 DOM。
4. 只有 `BattleModule` 对外暴露；输入 `{ bossId, scaling, playerSavedData }`，输出 `{ result, playerSavedData, drops, battleLog }`。
5. 指令入队即快照，结算只读快照，不得读当前面板状态。
6. 玩家持久状态归 `RunState`，不得写入单场 `battleState`；场景与浮层只能通过 `RunController` 改写。
7. 属性汇总（血量 / 杀气 / 攻击力）只在 meta 计算，UI 只读 `HudSnapshot` / `StatsSnapshot` / `InventorySnapshot`。
8. 全局背包只有一个浮层；战斗中 `editable = false`，修改类操作置灰。
9. 只有 Boss 节点完成才升层；普通战斗胜利只完成节点。
10. 战斗失败必须停在结算页，点「返回首页」后清档回首页。
11. 随机数必须走注入的 `Rng`，禁止裸 `Math.random()`。
12. 数值内部 `round1`，显示 `toFixed(1)`。
13. 存档使用 IndexedDB，结构变更需迁移；`localStorage` 仅存 UI 偏好。
14. 每个场景预留背景层，路径来自 `config/scenes.json`；缺图时样式兜底。
15. 只改自己负责的物理目录；目录归属与 AI 边界见 `collaboration_rules.md`。
16. 未实现能力标注 `// 预留:`，不得伪装完成。

## 工作流

1. 读 `.trae/rules/` 与相关现有代码，确认改动边界与目录归属。
2. 涉及规则变化时，先更新 `project_rules.md` / `data_rules.md` / `SCHEMA.md`，再改代码。
3. 外围系统按 P0~P5 推进：契约与配置 → 场景收敛与浮层骨架 → HUD 与弹窗 UI → 一局闭环 → 内容与联调。
4. 逻辑层改动必须能通过 `tests/` 下对应分区的纯逻辑测试（无 DOM）。
5. 完成前自查：
   - [ ] 无硬编码数值 / 文案
   - [ ] 逻辑层无 DOM 依赖
   - [ ] 场景与浮层边界正确，未新增多余 Scene
   - [ ] 新字段已写入配置与存档结构
   - [ ] 数值显示为 1 位小数
   - [ ] 规则文件与代码一致
   - [ ] 未跨目录修改他人文件

## 外部阻塞

- Boss 攻击伤害为占位值（普攻 6 / 特殊 10），用户可随时调整。
- 美术资源（GIF 立绘、图标、场景背景、事件配图、宝箱 GIF、技能图标、音频）尚未提供，使用占位路径与缺省样式，不阻塞逻辑开发。
- `map.json`、`events.json`、`chests.json`、`shop.json`、`skills.json` 尚未落地，P1 先补契约与配置。
