# PROJECT-STRUCTURE.md

> 本文件描述项目的目录骨架与文件职责。规则约束见 `.trae/rules/`，战斗数值见 `combat_rules.md`。
> 当前阶段只实现战斗节点（Battle Node），不含主菜单、地图、事件节点。

## 1. 根目录树

```text
d:\AICode\
├─ index.html                        # 唯一页面入口，加载 src/main.js（type="module"）
├─ AGENTS.md                         # AI 协作说明
├─ PROJECT-STRUCTURE.md              # 本文件：目录与职责
├─ SCHEMA.md                         # 武器 / Boss / 操作序列字段契约（唯一事实源）
├─ .trae/
│  └─ rules/
│     ├─ project_rules.md            # 范围 / 分层 / 契约 / 风格
│     ├─ combat_rules.md             # 战斗规则唯一事实源
│     └─ data_rules.md               # 配置与存档规范
│
├─ config/                           # 纯数据层（只读，运行时 fetch）
│  ├─ battle.config.json             # 回合、杀气、防御、切换、连招、面板、显示精度
│  ├─ weapons.json                   # 4 把武器：数值 / 动画 / 升级与铸魂引用
│  ├─ combos.json                    # 连招 pattern 与加成
│  ├─ bosses.json                    # Boss 数值 / 阶段权重 / 行为 / 缩放
│  ├─ effects.json                   # 治疗 / Buff / Debuff 原子效果
│  ├─ items.json                     # 药品与每场次数
│  ├─ accessories.json               # 3 个饰品与独立升级
│  ├─ upgrades.json                  # 全局升级点池 + 各武器升级树
│  ├─ soulforge.json                 # 铸魂分支 + 全局次数池
│  ├─ drops.json                     # 掉落池
│  ├─ levels.json                    # 无尽层数缩放与节点池
│  └─ ui.json                        # 文案 / Tooltip
│
├─ assets/
│  ├─ gifs/
│  │  ├─ player/                     # player_idle.gif / player_attack.gif / player_hurt.gif
│  │  └─ bosses/                     # boss_01_idle.gif / boss_01_attack.gif / boss_01_hurt.gif / boss_01_break.gif
│  ├─ icons/
│  │  ├─ actions/                    # op_normal.svg / op_special.svg / op_defend.svg / op_item.svg / op_switch.svg
│  │  ├─ weapons/                    # weapon_sword_single.png / weapon_two_hand.png / weapon_axe.png / weapon_bow.png
│  │  └─ items/                      # item_potion_heal.png
│  └─ audio/                         # 预留，当前为空
│
├─ src/
│  ├─ main.js                        # 启动装配：加载配置 → 校验 → 建状态 → 启动战斗 → 绑定 UI
│  │
│  ├─ game/                          # 纯逻辑层：禁止 DOM、禁止 import ui
│  │  ├─ BattleModule.js             # 对外唯一门面 start/abort/onResult
│  │  ├─ BattleEngine.js             # 回合状态机主循环与事件派发
│  │  ├─ TurnController.js           # 意图生成 → 排布 → 预判 → 交替结算的调度
│  │  ├─ CombatResolver.js           # 单条操作结算：伤害、格挡、反弹、目标更新
│  │  ├─ RageSystem.js               # 双方杀气、归零跳过、每回合一次、破防轮空
│  │  ├─ ComboSystem.js              # 连招匹配、断连、加成落点
│  │  ├─ BossAI.js                   # 阶段权重 + 随机序列生成
│  │  ├─ CommandQueue.js             # LIFO 队列、入队快照、撤回、切换冷却
│  │  ├─ EffectSystem.js             # Buff/Debuff 挂载、持续时间、结算修正
│  │  └─ Rng.js                      # 可注入随机源（种子化，便于复现）
│  │
│  ├─ state/
│  │  ├─ RunState.js                 # 局内持久化状态：装备/升级/铸魂/药品/饰品/点数池
│  │  ├─ BattleState.js              # 单场战斗状态：回合、阶段、双方运行时、意图、Buff
│  │  └─ SaveManager.js              # IndexedDB 封装 + 导出/导入 JSON + 版本迁移
│  │
│  ├─ data/
│  │  ├─ ConfigLoader.js             # 并行 fetch 全部 JSON，深冻结后注入
│  │  └─ Validator.js                # 结构与引用校验，失败即抛错并给出路径
│  │
│  ├─ ui/                            # 渲染层：只读快照、只发意图
│  │  ├─ BattleView.js               # 战斗主视图容器与布局
│  │  ├─ SequenceBar.js              # 头顶指令序列 + Boss 意图（Hover）
│  │  ├─ ActionPanel.js              # 1.1~4.2、格挡、切换、撤回；置灰逻辑
│  │  ├─ StatusBars.js               # 血条 / 杀气条（双层过渡、数字、向左削减）
│  │  ├─ BuffBar.js                  # Buff 区与 Tooltip
│  │  ├─ FeedbackLayer.js            # 中央大反馈区 + 受击白闪
│  │  ├─ InventoryView.js            # 两栏背包 + 右键菜单（战斗中置灰）
│  │  ├─ Tooltip.js                  # 统一 Hover 提示
│  │  ├─ bridge/
│  │  │  └─ BattlePresenter.js       # 逻辑事件 → UI 状态；唯一双向耦合点
│  │  └─ anim/
│  │     ├─ GifPlayer.js             # <img> src 重置播放 + 预加载
│  │     └─ Scheduler.js             # 演出排程与完成回调（默认 setTimeout）
│  │
│  ├─ styles/
│  │  ├─ base.css                    # reset、变量、字体、通用工具类
│  │  ├─ battle.css                  # 战斗布局与组件样式
│  │  ├─ inventory.css               # 背包与右键菜单
│  │  └─ responsive.css              # 触屏 / 窄屏断点
│  │
│  └─ utils/
│     ├─ EventBus.js                 # 逻辑层事件总线
│     ├─ math.js                     # round1 / clamp / percentage
│     └─ deepClone.js                # 快照与存档序列化辅助
│
└─ tests/                            # 浏览器内运行的纯逻辑测试
   ├─ index.html                     # 测试入口（ES Module）
   ├─ runner.js                      # 极简断言器
   ├─ rage.test.js
   ├─ combo.test.js
   ├─ turn-order.test.js
   └─ config-validation.test.js
```

## 2. 目录职责与边界

| 目录 | 职责 | 禁止 |
|---|---|---|
| `config/` | 所有数值、权重、文案、路径 | 表达式、函数、样式、像素值 |
| `src/game/` | 规则计算与状态流转 | DOM、`window`、`document`、`ui/` |
| `src/state/` | 状态容器与持久化 | 直接操作界面 |
| `src/data/` | 配置加载与校验 | 承载业务规则 |
| `src/ui/` | 渲染、输入、演出 | 计算伤害/杀气、直接改逻辑状态 |
| `src/ui/bridge/` | 逻辑与 UI 的唯一通道 | 存放业务规则 |
| `src/styles/` | 视觉表现 | JSON 数据、脚本 |
| `tests/` | 纯逻辑回归 | 依赖 DOM 的用例 |

## 3. 依赖方向

```text
main.js
  ├→ data/ConfigLoader → data/Validator
  ├→ state/RunState ─→ state/SaveManager
  ├→ game/BattleModule ─→ game/*（Engine / TurnController / Resolver / Rage / Combo / BossAI / Queue / Effect）
  └→ ui/BattleView ─→ ui/bridge/BattlePresenter ─→（订阅 game 事件）

依赖只允许：ui → game → state/data
反向依赖（game → ui、state → ui）一律视为错误。
```

## 4. 运行时数据流

```text
启动：
index.html → main.js
  → ConfigLoader.fetchAll()（并行读取 config/*.json）
  → Validator.validate()（引用完整性，失败即终止）
  → SaveManager.load() → RunState
  → new BattleModule({ config, rng, runState })
  → BattlePresenter 订阅事件并挂载 BattleView
  → BattleModule.start({ bossId, scaling, playerSavedData })

回合：
BossAI 生成意图 → BattleEngine 派发 BOSS_INTENT
  → ActionPanel 收集玩家操作 → CommandQueue 生成快照
  → PRE_CHECK：ComboSystem / EffectSystem 标记加成落点
  → SETTLEMENT：CombatResolver 逐条结算，RageSystem 处理归零与破防
  → 事件流 → BattlePresenter → 各 UI 组件
  → TURN_END：回满杀气、冷却递减、Buff 计时
  → 战斗结束：BattleModule 输出 { result, playerSavedData, drops, battleLog }
```

## 5. 文件命名约定

| 类型 | 规则 | 示例 |
|---|---|---|
| 类 / 组件文件 | PascalCase | `BattleEngine.js` |
| 工具 / 实例文件 | camelCase | `configLoader.js`（若新增） |
| 测试文件 | `*.test.js` | `rage.test.js` |
| CSS 文件 | kebab-case | `responsive.css` |
| 配置字段 | camelCase | `rageCost`、`bossRageCut` |
| 配置 / 数据 id 值 | snake_case | `sword_single`、`boss_01` |
| 资源文件 | `<类型>_<标识>_<状态>.<ext>` | `boss_01_attack.gif`、`op_defend.svg` |

## 6. 明确不创建（当前阶段）

- `src/main-menu/`、`src/map/`、`src/events/` 及任何肉鸽外层入口
- `package.json`、`node_modules/`、构建脚本（保持零依赖、零构建）
- 服务端代码、账号系统、联网对战

## 7. 启动与验证

```powershell
npx serve . -l 5173        # 根目录启动静态服务器
# 浏览器打开 http://localhost:5173
# 逻辑测试打开 http://localhost:5173/tests/index.html
```

## 8. 首次实现顺序

1. `config/` 全部 JSON 与 `data/ConfigLoader`、`data/Validator`
2. `state/RunState`、`state/BattleState`
3. `game/Rng` → `game/CommandQueue` → `game/RageSystem` → `game/ComboSystem`
4. `game/BossAI` → `game/CombatResolver` → `game/TurnController` → `game/BattleEngine`
5. `game/BattleModule`
6. `ui/bridge/BattlePresenter` → `ui/StatusBars`、`ActionPanel`、`SequenceBar`
7. `ui/anim` 演出 → `FeedbackLayer`
8. `state/SaveManager` → `InventoryView`
