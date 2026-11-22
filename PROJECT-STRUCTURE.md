# PROJECT-STRUCTURE.md

> 本文件描述项目的目录骨架、分层边界、场景与浮层路由、数据流。规则约束见 `.trae/rules/`，战斗数值见 `combat_rules.md`，协作与目录归属见 `collaboration_rules.md`。
> 当前阶段：战斗节点（Battle Scene）+ 肉鸽外层（Meta）扩展。场景收敛为 `home / map / battle`，事件、宝箱、商店、背包、技能树、设置统一为全局浮层。

## 1. 根目录树

```text
d:\AICode\
├─ index.html                        # 唯一页面入口，加载 src/main.js（type="module"）
├─ AGENTS.md                         # AI 协作说明
├─ PROJECT-STRUCTURE.md              # 本文件：目录、路由、数据流
├─ SCHEMA.md                         # 武器 / Boss / 操作序列字段契约
├─ .trae/
│  └─ rules/
│     ├─ project_rules.md            # 范围 / 分层 / 契约 / 风格
│     ├─ combat_rules.md             # 战斗规则唯一事实源
│     ├─ data_rules.md               # 配置与存档规范
│     └─ collaboration_rules.md      # 4 人目录隔离 / Git / AI 使用边界
│
├─ config/                           # 纯数据层（只读，运行时 fetch）
│  ├─ battle.config.json             # 回合、杀气、防御、切换、连招、面板、显示精度
│  ├─ weapons.json                   # 4 把武器：数值 / 动画 / 升级与铸魂引用
│  ├─ combos.json                    # 连招 pattern 与加成
│  ├─ bosses.json                    # Boss 数值 / 阶段权重 / 行为 / 缩放
│  ├─ effects.json                   # 治疗 / Buff / Debuff 原子效果
│  ├─ items.json                     # 药品与每场次数
│  ├─ accessories.json               # 饰品与独立升级（待建）
│  ├─ upgrades.json                  # 强化规则 enhancement + 升级树占位
│  ├─ soulforge.json                  # 铸魂分支 + 全局次数池（待建）
│  ├─ drops.json                     # 掉落池（待建）
│  ├─ levels.json                    # 层数缩放与普通战斗敌人池（待建）
│  ├─ scenes.json                    # 仅 home / map / battle 的背景与转场
│  ├─ map.json                       # 路线图生成：层数 / 分叉 / 节点权重（待建）
│  ├─ events.json                    # 事件文案、配图与选项效果（待建）
│  ├─ chests.json                    # 宝箱奖励与开箱表现（待建）
│  ├─ shop.json                      # 商店三栏、价格与刷新规则（待建）
│  ├─ skills.json                    # 技能树节点、前置、消耗与效果（待建）
│  └─ ui.json                        # 文案 / Tooltip / HUD 与浮层标签

├─ assets/
│  ├─ backgrounds/                   # 场景背景图（仅 home / map / battle）
│  │  ├─ home.jpg                    # 首页
│  │  ├─ map.jpg                     # 路线图
│  │  └─ battle_default.jpg          # 战斗默认背景
│  ├─ events/                        # 事件配图（预留）
│  ├─ chests/                        # 宝箱合盖图与开箱 GIF（预留）
│  ├─ skills/                        # 技能树节点图标（预留）
│  ├─ ui/                            # HUD 图标：金币 / 强化次数 / 设置（预留）
│  ├─ gifs/
│  │  ├─ player/                     # player_idle.gif / player_attack.gif / player_hurt.gif
│  │  └─ bosses/                     # boss_01_idle.gif / boss_01_attack.gif / boss_01_hurt.gif
│  ├─ icons/
│  │  ├─ actions/                    # op_normal.svg / op_special.svg / op_defend.svg
│  │  ├─ weapons/                    # weapon_sword_single.png / weapon_two_hand.png
│  │  ├─ items/                      # item_potion_heal.png
│  │  └─ map/                        # node_battle.svg / node_event.svg / node_chest.svg / node_shop.svg
│  └─ audio/                         # BGM / SFX（预留）
│
├─ src/
│  ├─ main.js                        # 组合根：加载配置 → 建状态 → 注册场景 → 启动 SceneManager
│  │
│  ├─ meta/                          # 外层逻辑：无 DOM，不 import scenes / ui
│  │  ├─ SceneManager.js             # 场景路由、生命周期、参数传递、转场编排
│  │  ├─ RunController.js            # 一局生命周期的唯一写入口（含 HUD / 属性快照）
│  │  ├─ MapGenerator.js             # 杀戮尖塔式路线生成（纯函数 + 注入 Rng）
│  │  ├─ EventResolver.js            # 事件选项结算
│  │  ├─ ChestResolver.js            # 宝箱奖励结算
│  │  ├─ ShopService.js              # 商店栏位、购买、独立刷新与涨价
│  │  ├─ SkillTree.js                # 技能树前置校验与点亮
│  │  ├─ StatsCalculator.js          # 血量 / 杀气 / 攻击力汇总
│  │  ├─ RewardSystem.js             # 掉落 → RunState 合并
│  │  └─ SceneContext.js             # 构造场景可用能力（navigate / snapshot / config）
│  │
│  ├─ scenes/                        # 场景 UI：只读快照、只发意图
│  │  ├─ SceneShell.js               # 外壳：背景层 + HUD 挂载点 + 内容层 + 转场遮罩
│  │  ├─ HomeScene.js                # 首页：新游戏 / 读取存档 / 图鉴（预留）/ 退出
│  │  ├─ MapScene.js                 # 路线图：节点、连线、当前层
│  │  ├─ BattleScene.js              # 战斗场景：包装 BattleModule + 结算页
│  │  └─ overlays/                   # 全局浮层：不参与 Scene 路由
│  │     ├─ OverlayManager.js        # 单例浮层管理：open / close / current
│  │     ├─ InventoryOverlay.js      # 背包
│  │     ├─ EventOverlay.js          # 事件
│  │     ├─ ChestOverlay.js          # 宝箱
│  │     ├─ ShopOverlay.js           # 商店
│  │     ├─ SkillTreeOverlay.js      # 技能树
│  │     └─ SettingsOverlay.js       # 设置
│  │
│  ├─ game/                          # 纯逻辑层：禁止 DOM、禁止 import ui / scenes / meta
│  │  ├─ BattleModule.js             # 对外唯一门面 start / abort / onResult
│  │  ├─ BattleEngine.js             # 回合状态机主循环与事件派发
│  │  ├─ TurnController.js           # 意图 → 排布 → 预判 → 交替结算
│  │  ├─ CombatResolver.js           # 单条操作结算
│  │  ├─ RageSystem.js               # 杀气、归零、破防
│  │  ├─ ComboSystem.js              # 连招匹配与加成
│  │  ├─ BossAI.js                   # 阶段权重 + 随机序列
│  │  ├─ CommandQueue.js             # LIFO 队列与快照
│  │  ├─ EffectSystem.js             # Buff / Debuff
│  │  └─ Rng.js                      # 可注入随机源
│  │
│  ├─ state/
│  │  ├─ RunState.js                 # 局内持久化状态（含楼层、地图、节点进度）
│  │  ├─ BattleState.js              # 单场战斗状态
│  │  └─ SaveManager.js              # IndexedDB + 导出 / 导入 + 版本迁移
│  │
│  ├─ data/
│  │  ├─ ConfigLoader.js             # 并行 fetch 全部 JSON，深冻结
│  │  └─ Validator.js                # 结构与引用校验
│  │
│  ├─ ui/                            # 表现层 + 通用组件：只读快照
│  │  ├─ BattleView.js
│  │  ├─ SequenceBar.js
│  │  ├─ ActionPanel.js
│  │  ├─ StatusBars.js
│  │  ├─ BuffBar.js
│  │  ├─ FeedbackLayer.js
│  │  ├─ Tooltip.js
│  │  ├─ hud/
│  │  │  └─ HudView.js               # 顶部栏：背包 / 头像 / 血量 / 杀气 / 金币 / 强化次数 / 设置
│  │  ├─ modals/                     # 浮层视觉组件（容器与开关归 scenes/overlays）
│  │  │  ├─ InventoryModal.js        # 左装备 / 中槽位 / 右属性
│  │  │  ├─ EventModal.js            # 左图 + 标题 + 描述 + 三个选项
│  │  │  ├─ ChestModal.js            # 宝箱图 + 开箱 GIF + 获得物清单
│  │  │  ├─ ShopModal.js             # 三栏商品 + 每栏刷新
│  │  │  ├─ SkillTreeModal.js        # 根节点 + 紫 / 青 / 红三枝
│  │  │  └─ SettingsModal.js         # 标准设置项
│  │  ├─ bridge/
│  │  │  └─ BattlePresenter.js
│  │  └─ anim/
│  │     ├─ GifPlayer.js
│  │     └─ Scheduler.js
│  │
│  ├─ styles/
│  │  ├─ base.css                    # reset、变量、字体
│  │  ├─ battle.css                  # 战斗布局与组件
│  │  ├─ scenes.css                  # SceneShell / 背景层 / 转场 / 通用场景容器
│  │  ├─ hud.css                     # 顶部栏
│  │  ├─ modals.css                  # 浮层遮罩、面板、背包 / 事件 / 宝箱 / 商店 / 技能树 / 设置
│  │  ├─ home.css                    # 首页
│  │  ├─ map.css                     # 路线图
│  │  └─ responsive.css              # 触屏 / 窄屏断点
│  │
│  └─ utils/
│     ├─ EventBus.js
│     ├─ math.js
│     └─ deepClone.js
│
└─ tests/                            # 浏览器内纯逻辑测试
   ├─ index.html                     # 入口（4 号位维护）
   ├─ runner.js                      # 断言器（4 号位维护）
   ├─ game/                          # 1 号位：战斗核心
   ├─ meta/                          # 3 号位：路由 / 地图 / 结算
   ├─ data/                          # 4 号位：配置校验 / 数据
   └─ ui/                            # 2 号位：快照渲染冒烟（无 DOM 计算）
```

## 2. 目录职责与边界

| 目录 | 职责 | 禁止 |
|---|---|---|
| `config/` | 数值、权重、文案、资源路径 | 表达式、函数、颜色、像素值 |
| `src/meta/` | 路由、一局生命周期、地图生成、属性汇总、事件 / 宝箱 / 商店 / 技能树结算 | DOM、import `scenes/` 或 `ui/`、直接改 UI 状态 |
| `src/scenes/` | 三个场景的 DOM、布局、场景内交互；HUD 挂载点 | 计算战斗数值与属性、直接改 `RunState`、写样式文件、实现弹窗内容 |
| `src/scenes/overlays/` | 浮层容器、`OverlayManager`、开关与焦点 | 计算数值、实现视觉细节、注册成 Scene |
| `src/game/` | 战斗规则与状态流转 | DOM、`window`、`ui/`、`scenes/`、`meta/` |
| `src/state/` | 状态容器、存档 | 直接操作界面 |
| `src/data/` | 配置加载与校验 | 承载业务规则 |
| `src/ui/` | 战斗渲染、HUD、浮层视觉、输入、演出 | 计算伤害 / 杀气 / 连招 / 属性 / 金币、改逻辑状态 |
| `src/styles/` | 视觉表现、背景裁切与遮罩、浮层样式 | JSON 数据、脚本 |
| `assets/backgrounds/` | 场景背景图（home / map / battle） | 脚本、配置 |
| `assets/{events,chests,skills,ui}/` | 浮层配图、开箱 GIF、技能图标、HUD 图标 | 脚本、配置 |
| `tests/` | 纯逻辑回归 | 依赖 DOM 的业务计算 |

## 3. 依赖方向

```text
index.html
  └→ main.js（组合根）
       ├→ data/ConfigLoader → data/Validator
       ├→ state/SaveManager → state/RunState
       ├→ meta/SceneManager ← 场景工厂表（来自 scenes/）
       ├→ meta/RunController → state/RunState → SaveManager
       ├→ scenes/SceneShell（作为 SceneManager 的渲染宿主）
       └→ scenes/*（注册工厂，由 SceneManager 按需实例化）

运行时：
scenes            → meta → state / data
scenes            → ui（BattleView / HudView，只读快照）
scenes/overlays   → meta（RunController 意图）/ ui（modals 视觉）
ui                → 无反向依赖
game              → 无反向依赖
```

硬性约束：

- `src/meta/` 不访问 DOM、不 import `src/scenes/`、不 import `src/ui/`。
- `src/scenes/` 与 `src/scenes/overlays/` 不 import `src/game/` 的内部模块，只能使用 `BattleModule` 门面。
- `src/game/` 不 import `src/meta/`、`src/scenes/`、`src/ui/`，不访问 DOM。
- 只有 `main.js` 同时 import 各层，负责注入依赖、场景工厂与浮层管理器。

## 4. SceneManager 与场景契约

### 4.1 职责拆分

| 模块 | 职责 |
|---|---|
| `meta/SceneManager.js` | 路由状态机：当前场景、切换、参数、返回栈、生命周期调用；不创建 DOM |
| `scenes/SceneShell.js` | 渲染宿主：背景层、HUD 挂载点、内容容器、转场遮罩、浮层宿主、`data-scene` 标记 |
| `meta/SceneContext.js` | 场景能力集合：`navigate`、`getRunSnapshot`、`getHudSnapshot`、`openOverlay`、`openInventory`、`config`、`texts` |
| `scenes/overlays/OverlayManager.js` | 浮层单例：`open` / `close` / `current`、遮罩与焦点、Esc 关闭 |
| `main.js` | 组装根：注册三个场景工厂、创建 Shell / Manager / RunController / OverlayManager、启动首个场景 |

### 4.2 场景接口

每个场景导出一个工厂函数，返回统一对象：

```js
export function createHomeScene() {
  return {
    id: 'home',
    mount(container, ctx) {},        // 只执行一次：创建 DOM、绑定事件
    async init(params) {},           // 每次进入：刷新快照；可异步，完成后才揭开转场遮罩
    leave() {},                      // 离开前：停止计时器、清理临时状态
    destroy() {},                    // 卸载：移除监听器、释放资源
  };
}
```

约束：

- 场景只有 `home / map / battle`；事件、宝箱、商店、背包、技能树、设置不得注册为 Scene。
- 场景内不能直接 `new` 另一个场景，只能 `ctx.navigate(sceneId, params)`。
- 场景不持有 `RunState` 引用，只通过 `ctx.getRunSnapshot()` / `ctx.getHudSnapshot()` 读快照。
- 场景改状态只能调用 `ctx` 暴露的意图方法（见 §5）。
- `mount` 内的 DOM 必须挂到传入的 `container`，不得直接操作 `document.body`。
- 跳转时 `SceneShell` 先盖上 `Loading...` 遮罩，`SceneManager` 等待新场景 `init()` 完成后才淡出。
- 打开浮层不触发转场，底层场景保持挂载。

### 4.3 SceneManager API

```js
new SceneManager({ scenes, host, loadingText, transitionMs });
manager.setContext(context);

await manager.start('home');                        // 首个场景
await manager.navigate('map', { floor: 1 });        // 普通跳转
await manager.navigate('battle', params, { replace: true });
manager.back();                                     // 返回上一场景（有栈时）
manager.current();                                  // 当前 sceneId
manager.onChange(({ from, to, params }) => {});     // 路由变化订阅
```

`host`（由 `SceneShell` 实现）提供：

```js
{
  async cover(text),          // 盖上遮罩并显示 Loading 文案
  async uncover(),            // 淡出遮罩
  createLayer(sceneId),       // 创建该场景独占的挂载层
  async show({ sceneId, element }), // 切换背景与内容层
  clear(),                    // 清空所有场景层
}
```

### 4.4 跳转与浮层触发表

| 起点 | 目标 | 参数 | 说明 |
|---|---|---|---|
| 启动 | `home` | — | 无存档「新游戏」，有存档「读取存档」 |
| `home` | `map` | `{ seed }` | 新开一局，`RunController.startRun` |
| `home` | `map` | `{}` | 继续已有 `runState` |
| `home` | 无 | — | 图鉴本期不做，入口置灰 |
| `map` | `battle` | `{ nodeId, bossId, scaling }` | 普通战斗或 Boss 节点 |
| `map` | 浮层 `event` | `{ nodeId, eventId }` | `ctx.openOverlay('event', params)` |
| `map` | 浮层 `chest` | `{ nodeId, chestId }` | `ctx.openOverlay('chest', params)` |
| `map` | 浮层 `shop` | `{ nodeId }` | `ctx.openOverlay('shop', params)` |
| `battle` | `map` | `{ nodeId }` | 先 `applyBattleResult` 再跳转；普通胜利不升层 |
| `battle` | `home` | — | 失败结算页点「返回首页」，先清档 |
| 任意场景 | 浮层 `inventory` | — | HUD 背包按钮 |
| 任意场景 | 浮层 `skills` | — | HUD 头像 |
| 任意场景 | 浮层 `settings` | — | HUD 齿轮 |
| `map` | `map` | `{ floor }` | Boss 节点完成 → `advanceFloor` 生成下一层 |

### 4.5 浮层（Overlay）契约

```js
overlayManager.open('shop', { nodeId });   // Promise<result>；关闭时 resolve
overlayManager.close(result);              // 主动关闭
overlayManager.current();                  // { id, params } | null
```

- 同一时刻只允许一个浮层；打开新浮层会先关闭旧浮层（旧 Promise `resolve(null)`）。
- 浮层由 `SceneShell` 的浮层宿主渲染遮罩与面板，`OverlayManager` 负责层级、焦点与 Esc。
- 浮层容器位于 `src/scenes/overlays/`，视觉组件位于 `src/ui/modals/`，两侧通过快照 + 意图函数对接。
- 浮层不参与 `SceneManager` 路由，不触发 `Loading...` 转场，底层场景不卸载。
- 浮层只能通过 `ctx` 意图方法改状态；战斗结算页不是浮层，属于 `BattleScene` 内部状态。

## 5. 数据流：RunState 如何跨场景与浮层传递

### 5.1 唯一写入口

`RunController` 持有一局唯一的 `RunState`，并负责存档；场景只读快照、只发意图。

```js
// 一局生命周期
runController.startRun({ seed });
runController.getSnapshot();               // 深拷贝只读快照
runController.save();
runController.abortRun();                  // 放弃本局：清档 + 回首页
runController.failRun();                   // 战斗失败：清档 + 回首页

// 快照（UI 只读）
runController.getHudSnapshot();            // HUD 顶部栏
runController.getStatsSnapshot();          // 血量 / 杀气 / 攻击力
runController.getInventorySnapshot();      // 背包三栏

// 地图与节点
runController.getMapSnapshot();            // MapGraph + 完成状态
runController.startFloor();                // 生成当前层并写入 mapNodes / floorSeed
runController.selectNode(nodeId);          // 校验连通性
runController.completeNode(nodeId);        // 记录完成
runController.advanceFloor();              // 仅 Boss 节点完成后调用

// 战斗
runController.getBattleInput(nodeId);      // { bossId, scaling, playerSavedData }
runController.applyBattleResult(result);   // 合并奖励、金币、技能点

// 浮层结算
runController.resolveEvent(eventId, choiceId);
runController.openChest(chestId);
runController.openShop(nodeId);            // 创建 ShopSession
runController.purchase(columnId, instanceId);
runController.refreshShop(columnId);
runController.closeShop();
runController.unlockSkill(skillId);
runController.enhanceEquipment(equipmentId);
runController.equip(equipmentId);
```

### 5.2 启动流程

```text
index.html → main.js
  → ConfigLoader.fetchAll() → Validator.validate()
  → SaveManager.load() → RunController（持有 RunState 或空局）
  → 创建 SceneShell、SceneManager、OverlayManager、HudView
  → 注册场景工厂：home / map / battle
  → SceneManager.start('home')
```

### 5.3 一局循环

```text
home
  → 新游戏 startRun(seed) → map
  → 继续 loadSave() → map
  → 选择节点（只允许与当前位置连通的上一层）
      ├→ battle：BattleScene 用 getBattleInput() 启动 BattleModule
      │    → onResult
      │        ├ win：applyBattleResult → completeNode → save
      │        │      ├ 普通战斗：回 map，楼层不变
      │        │      └ Boss：advanceFloor → 生成下一层 → map
      │        └ lose：failRun → 清档 → 结算页「返回首页」→ home
      ├→ event：打开 event 浮层 → resolveEvent → completeNode → save → map
      ├→ chest：打开 chest 浮层 → openChest → completeNode → save → map
      └→ shop：打开 shop 浮层 → 购买 / 刷新 → closeShop → completeNode → save → map
  → 本层 Boss 完成 → advanceFloor → 生成下一层 map
  → 放弃本局 → abortRun → 清档 → home
```

### 5.4 战斗场景的数据边界

```text
BattleScene
  → ctx.runController.getBattleInput()
  → BattleModule.start({ bossId, scaling, playerSavedData })
  → onResult({ result, playerSavedData, drops, battleLog })
      ├ win → ctx.runController.applyBattleResult(result)
      │        → completeNode → （Boss 时 advanceFloor）→ navigate('map')
      └ lose → 停留结算页 → 点击「返回首页」→ ctx.runController.failRun() → navigate('home')
```

- 战斗模块不接收 `RunState` 实例，只接收快照。
- 战斗结束不直接跳场景，先写回再跳转，避免存档丢失。
- `BattleState` 永远不进入存档。

### 5.5 HUD 与属性数据流

```text
RunController（唯一计算方）
  ├ getHudSnapshot()    → SceneShell / HudView：血量、杀气、金币、三类强化次数
  ├ getStatsSnapshot()  → InventoryModal：maxHp / maxRage / attackPower
  └ getInventorySnapshot() → InventoryModal：装备、强化等级、editable

HudView 点击
  ├ 背包 → ctx.openInventory()
  ├ 头像 → ctx.openOverlay('skills')
  └ 齿轮 → ctx.openOverlay('settings')
```

- HUD 只渲染，不计算；杀气条战斗外固定满条，血量显示当前值。
- 战斗中 `editable = false`，强化 / 换装置灰，浏览与筛选保留。

### 5.6 地图生成数据流

```text
MapGenerator.generate({ floor, seed, config })
  → MapGraph（layers / nodes / nextIds / payloadId）
  → RunController.startFloor()：写入 mapNodes、floorSeed、currentNodeId
  → MapScene 渲染（只读 getMapSnapshot）
  → 节点完成 completeNode → 仅 Boss 完成时 advanceFloor → 新 floorSeed → 重新生成
```

### 5.7 强化与技能树数据流

```text
InventoryModal 强化按钮
  → ctx.enhanceEquipment(equipmentId)
  → RunController 校验：非战斗、等级 < 30、对应类别次数 > 0
  → 扣 1 次 → enhanceLevels +1 → StatsCalculator 重算 → save

SkillTreeModal 节点点击
  → ctx.unlockSkill(skillId)
  → RunController 校验：前置全亮、skillPoints ≥ cost
  → skillPoints -= cost → unlockedSkillIds 增加 → StatsCalculator 重算 → save
```

## 6. 场景背景预留规范

每个场景都必须有背景层，即使暂时没有图片。

### 6.1 统一结构

```html
<div class="scene-shell" data-scene="map">
  <div class="scene-bg">
    <img class="scene-bg__image" alt="" />
    <div class="scene-bg__overlay"></div>
  </div>
  <div class="scene-hud"><!-- HudView 挂载点；home 隐藏 --></div>
  <div class="scene-content"><!-- 场景内容 --></div>
  <div class="overlay-layer"><!-- 浮层宿主：遮罩 + 面板 --></div>
  <div class="scene-transition"></div>
</div>
```

### 6.2 配置

`config/scenes.json` 注册三个场景与背景路径：

```json
{
  "schemaVersion": 1,
  "transition": { "durationMs": 320 },
  "scenes": [
    { "id": "home",   "title": "江湖行", "background": "assets/backgrounds/home.jpg" },
    { "id": "map",    "title": "路线图", "background": "assets/backgrounds/map.jpg" },
    { "id": "battle", "title": "战斗",   "background": "assets/backgrounds/battle_default.jpg" }
  ]
}
```

### 6.3 规则

- 背景路径属于数据，写在 `scenes.json`；裁切、遮罩、暗角属于 `styles/`。
- 图片统一放 `assets/backgrounds/`，推荐 1920×1080，`object-fit: cover`。
- 缺图时 `SceneShell` 保留背景层并显示 `[data-scene]` 对应的渐变兜底，不允许出现空白或报错。
- 战斗场景可按 Boss 覆盖背景：`bosses[*].background` 优先于 `scenes.battle.background`，未配置则用默认。
- 事件 / 宝箱 / 商店 / 背包 / 技能树 / 设置不注册 `scenes.json`，由 `OverlayManager` + `styles/modals.css` 统一渲染。
- 新场景上线前必须同时提交：场景空壳、`scenes.json` 条目、背景占位样式；新浮层只需提交浮层容器与配置，不动 `scenes.json`。

## 7. 目录归属（摘要）

详细规则与 AI 边界见 `.trae/rules/collaboration_rules.md`。

| 成员 | 物理目录 / 文件 |
|---|---|
| 1 号位 | `src/game/`、`src/state/`、`tests/game/`、`combat_rules.md` |
| 2 号位 | `src/ui/`（含 `hud/`、`modals/`）、`src/styles/`、`assets/`、`tests/ui/` |
| 3 号位 | `src/meta/`、`src/scenes/`（含 `overlays/`）、`src/data/`、`src/main.js`、`index.html`、`AGENTS.md`、`PROJECT-STRUCTURE.md`、`project_rules.md`、`collaboration_rules.md`、`tests/meta/` |
| 4 号位 | `config/`、`tests/`（入口与 `tests/data/`）、`SCHEMA.md`、`data_rules.md` |

## 8. 文件命名约定

| 类型 | 规则 | 示例 |
|---|---|---|
| 类 / 组件文件 | PascalCase | `SceneManager.js`、`MapScene.js` |
| 工具 / 实例文件 | camelCase | `configLoader.js` |
| 测试文件 | `*.test.js` | `map-generator.test.js` |
| CSS 文件 | kebab-case | `map.css` |
| 配置字段 | camelCase | `rageCost`、`background` |
| 配置 / 数据 id | snake_case | `sword_single`、`boss_01` |
| 场景 id | camelCase | `home`、`map`、`battle` |
| 浮层 id | camelCase | `inventory`、`event`、`chest`、`shop`、`skills`、`settings` |
| 浮层文件 | `<Name>Overlay.js` / `<Name>Modal.js` | `ShopOverlay.js`、`ShopModal.js` |
| 背景图 | `<sceneId>_<variant>.jpg` | `home.jpg`、`battle_default.jpg` |

## 9. 明确不创建

- 事件 / 宝箱 / 商店 / 背包 / 技能树 / 设置的 Scene 文件（一律做浮层）。
- 第二套背包、战斗内独立背包按钮。
- `package.json`、`node_modules/`、构建脚本（保持零依赖、零构建）。
- 前端框架、第三方路由库（路由由 `SceneManager` 自己实现）。
- 服务端代码、账号系统、联网对战。

## 10. 启动与验证

```powershell
npx serve . -l 5173        # 根目录启动静态服务器
# 游戏：http://localhost:5173
# 逻辑测试：http://localhost:5173/tests/index.html
# 战斗场景独立调试：http://localhost:5173/?scene=battle&bossId=boss_01
```

## 11. 外围系统开发顺序（摘要）

| 阶段 | 负责人 | 内容 | 验收 |
|---|---|---|---|
| P0（已完成） | 3 号 | `SceneManager`、`SceneShell`、`Loading...` 转场、基础场景空壳、全局背包浮层 | 场景可切换，无控制台报错 |
| P1 契约与配置 | 4 号 | `SCHEMA.md` 补外层契约；`scenes.json` 收敛为 3 个场景；新增 `map.json`、`events.json`、`chests.json`、`shop.json`、`skills.json`；`upgrades.json.enhancement` | Validator 全绿，引用完整 |
| P2 场景收敛与浮层骨架 | 3 号 | 场景收敛为 home / map / battle；`OverlayManager` 与六个浮层容器；HUD 挂载与显隐；删除 event / chest 场景 | 六个浮层可开可关，无残留计时器 |
| P3 HUD 与弹窗 UI | 2 号 | `HudView`、背包三栏、事件 / 宝箱 / 商店 / 技能树 / 设置视觉；`styles/hud.css`、`styles/modals.css` | 桌面与窄屏可用，数值全部来自快照 |
| P4 一局闭环 | 3 号 | `RunController` 新字段与意图、`MapGenerator`、事件 / 宝箱 / 商店 / 技能树结算、战斗回写、Boss 升层、失败清档 | 一局可走到 Boss，失败回首页，存档可续 |
| P5 内容、平衡与联调 | 全员 | 内容填充、数值平衡、存档迁移、回归测试与部署 | 测试全绿，无占位假逻辑 |

详细排期、接口冻结与 AI 使用边界见 `.trae/rules/collaboration_rules.md`。
