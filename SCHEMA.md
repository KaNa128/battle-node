# SCHEMA.md — 数据结构契约（唯一事实来源）

> 本文件是**战斗数据、外层路线图、全局弹窗、HUD 快照**的字段级契约。
> 结构变更只改本文件；数值调整只改 `config/*.json`。两者冲突时，以本文件为准。
> 战斗规则语义见 `.trae/rules/combat_rules.md`，加载与存档规范见 `.trae/rules/data_rules.md`。
> 所有示例为合法 JSON，不含注释。

## 1. 通用约定

| 约定 | 规则 |
|---|---|
| 编码 | UTF-8，无 BOM |
| 版本字段 | 每个配置文件顶层必须带 `schemaVersion`（整数） |
| id | `snake_case`，全局唯一；跨文件引用使用 `xxxId` / `xxxIds` |
| 字段名 | 配置字段 camelCase；`id` 的值 snake_case |
| 数值 | 直接写 JSON number，不写字符串与单位 |
| 精度 | 杀气、伤害最多 1 位小数；内部统一 `round1`，显示 `toFixed(1)` |
| 百分比 | 一律写小数（`0.08` 表示 8%），禁止写 `"8%"` |
| 权重 | 非负整数，同一列表内相对比例，不要求和为 100 |
| 时间 | 毫秒整数（`animDurationMs`、`hitAtMs`） |
| 路径 | 相对项目根，正斜杠，如 `assets/gifs/player/player_idle.gif` |
| 未知字段 | 校验器告警（不阻断）；类型错误与引用断裂报错并终止启动 |

## 2. `weapons.json`

### 2.1 顶层

```json
{
  "schemaVersion": 1,
  "weapons": []
}
```

### 2.2 Weapon

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | string | 是 | 唯一 id，如 `sword_single` |
| `name` | string | 是 | 显示名，取 `ui.json` 同 key 文案 |
| `category` | `"normal"` \| `"special"` | 是 | 普通武器 / 特殊武器 |
| `enabled` | boolean | 否 | 默认 `true`；`false` 时不进入面板与校验引用 |
| `art` | ArtSet | 是 | 立绘与动画路径 |
| `attacks` | object | 是 | 普通武器含 `normal` + `special`；特殊武器**仅含 `normal`** |
| `upgradeTreeId` | string \| null | 否 | 指向 `upgrades.json` 的树 id |
| `soulForgeId` | string \| null | 否 | 指向 `soulforge.json` 的武器条目 |
| `comboIds` | string[] | 否 | 该武器可触发的连招，默认 `[]` |

### 2.3 ArtSet

```json
{
  "idle": "assets/gifs/player/player_idle.gif",
  "attack": "assets/gifs/player/player_attack.gif",
  "hurt": "assets/gifs/player/player_hurt.gif"
}
```

### 2.4 Attack

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | string | 是 | 全局唯一，如 `sword_single_normal` |
| `name` | string | 是 | 显示名 |
| `opType` | `"normal"` \| `"special"` | 是 | 与所在键一致，用于连招匹配 |
| `rageCost` | number | 是 | 杀气消耗，≥ 0，1 位小数 |
| `damage` | number | 是 | 基础伤害（未含任何加成） |
| `bossRageCut` | number | 是 | 削减 Boss 杀气的基础值 |
| `effects` | string[] | 否 | `effects.json` 中 effect id，默认 `[]` |
| `anim` | string | 是 | 动画键，对应 ArtSet 的键 |
| `animDurationMs` | integer | 是 | 动画时长 |
| `hitAtMs` | integer | 否 | 命中判定时点，默认 `animDurationMs / 2` |

> 特殊攻击的**次数不属于武器**，由 `battle.config.json.specialUses` 全局池管理。

### 2.5 示例（四把武器）

```json
{
  "schemaVersion": 1,
  "weapons": [
    {
      "id": "sword_single",
      "name": "单手剑",
      "category": "normal",
      "enabled": true,
      "art": {
        "idle": "assets/gifs/player/player_idle.gif",
        "attack": "assets/gifs/player/player_attack.gif",
        "hurt": "assets/gifs/player/player_hurt.gif"
      },
      "attacks": {
        "normal": {
          "id": "sword_single_normal",
          "name": "普攻",
          "opType": "normal",
          "rageCost": 1,
          "damage": 5,
          "bossRageCut": 1,
          "effects": [],
          "anim": "attack",
          "animDurationMs": 600,
          "hitAtMs": 300
        },
        "special": {
          "id": "sword_single_special",
          "name": "特殊攻击",
          "opType": "special",
          "rageCost": 2,
          "damage": 7,
          "bossRageCut": 2,
          "effects": [],
          "anim": "attack",
          "animDurationMs": 850,
          "hitAtMs": 420
        }
      },
      "upgradeTreeId": "tree_sword_single",
      "soulForgeId": "soul_sword_single",
      "comboIds": ["combo_basic"]
    },
    {
      "id": "two_hand_blade",
      "name": "双手剑",
      "category": "normal",
      "enabled": true,
      "art": {
        "idle": "assets/gifs/player/player_idle.gif",
        "attack": "assets/gifs/player/player_attack.gif",
        "hurt": "assets/gifs/player/player_hurt.gif"
      },
      "attacks": {
        "normal": {
          "id": "two_hand_blade_normal",
          "name": "普攻",
          "opType": "normal",
          "rageCost": 2,
          "damage": 7,
          "bossRageCut": 3,
          "effects": [],
          "anim": "attack",
          "animDurationMs": 750,
          "hitAtMs": 360
        },
        "special": {
          "id": "two_hand_blade_special",
          "name": "特殊攻击",
          "opType": "special",
          "rageCost": 3,
          "damage": 10,
          "bossRageCut": 5,
          "effects": [],
          "anim": "attack",
          "animDurationMs": 1000,
          "hitAtMs": 500
        }
      },
      "upgradeTreeId": "tree_two_hand_blade",
      "soulForgeId": "soul_two_hand_blade",
      "comboIds": ["combo_basic"]
    },
    {
      "id": "axe",
      "name": "巨斧",
      "category": "special",
      "enabled": true,
      "art": {
        "idle": "assets/gifs/player/player_idle.gif",
        "attack": "assets/gifs/player/player_attack.gif",
        "hurt": "assets/gifs/player/player_hurt.gif"
      },
      "attacks": {
        "normal": {
          "id": "axe_normal",
          "name": "劈砍",
          "opType": "normal",
          "rageCost": 3,
          "damage": 9,
          "bossRageCut": 2,
          "effects": [],
          "anim": "attack",
          "animDurationMs": 900,
          "hitAtMs": 450
        }
      },
      "upgradeTreeId": "tree_axe",
      "soulForgeId": "soul_axe",
      "comboIds": []
    },
    {
      "id": "bow",
      "name": "弓箭",
      "category": "special",
      "enabled": true,
      "art": {
        "idle": "assets/gifs/player/player_idle.gif",
        "attack": "assets/gifs/player/player_attack.gif",
        "hurt": "assets/gifs/player/player_hurt.gif"
      },
      "attacks": {
        "normal": {
          "id": "bow_normal",
          "name": "射击",
          "opType": "normal",
          "rageCost": 1,
          "damage": 3,
          "bossRageCut": 2,
          "effects": [],
          "anim": "attack",
          "animDurationMs": 700,
          "hitAtMs": 350
        }
      },
      "upgradeTreeId": "tree_bow",
      "soulForgeId": "soul_bow",
      "comboIds": []
    }
  ]
}
```

## 3. `bosses.json`

### 3.1 顶层

```json
{
  "schemaVersion": 1,
  "bosses": []
}
```

### 3.2 Boss

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | string | 是 | 如 `boss_01` |
| `name` | string | 是 | 显示名 |
| `maxHp` | number | 是 | 基础血量（缩放前） |
| `maxRage` | number | 是 | 杀气上限，不随回合回满 |
| `art` | BossArtSet | 是 | 含 `break` 破防立绘 |
| `phases` | Phase[] | 是 | 至少 1 个，按 `hpRange` 覆盖 `[0, maxHp]` |
| `actions` | BossAction[] | 是 | 该 Boss 所有可用行为 |
| `scaling` | Scaling | 是 | 无尽模式层数缩放 |
| `reward` | object | 否 | `{ "dropPoolId": "drop_pool_01" }` |

### 3.3 Phase

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | string | 是 | 如 `phase_1` |
| `hpRange` | `{ min, max }` | 是 | 闭区间，判定用**回合开始时**的 Boss 血量 |
| `opsPerTurn` | `{ min, max }` | 是 | 每回合操作数，整数，`1 ≤ min ≤ max ≤ 5` |
| `actionWeights` | `{ actionId, weight }[]` | 是 | 至少 1 项，权重和 > 0 |
| `comboIds` | string[] | 否 | 该阶段启用的 Boss 连招，默认 `[]` |

### 3.4 BossAction

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | string | 是 | 在同一 Boss 内唯一 |
| `name` | string | 是 | 显示名 |
| `opType` | `"normal"` \| `"special"` | 是 | 影响玩家防御时的杀气减半与连招匹配 |
| `damage` | number | 是 | 对玩家伤害 |
| `playerRageCut` | number | 是 | 对玩家杀气削减，普攻 1.0 / 特殊 2.0 |
| `effects` | string[] | 否 | 命中的 effect id，默认 `[]` |
| `anim` | string | 是 | `attack` / `break` 等 |
| `animDurationMs` | integer | 是 | 动画时长 |
| `hitAtMs` | integer | 否 | 默认 `animDurationMs / 2` |

### 3.5 BossArtSet / Scaling

```json
{
  "idle": "assets/gifs/bosses/boss_01_idle.gif",
  "attack": "assets/gifs/bosses/boss_01_attack.gif",
  "hurt": "assets/gifs/bosses/boss_01_hurt.gif",
  "break": "assets/gifs/bosses/boss_01_break.gif"
}
```

```json
{
  "hpPerFloor": 0.15,
  "damagePerFloor": 0.10,
  "ragePerFloor": 0.0
}
```

缩放公式（唯一口径）：

```text
effective = base * (1 + perFloor * (floor - 1))
result   = round1(effective)
```

### 3.6 示例

```json
{
  "schemaVersion": 1,
  "bosses": [
    {
      "id": "boss_01",
      "name": "无名武者",
      "maxHp": 100,
      "maxRage": 30,
      "art": {
        "idle": "assets/gifs/bosses/boss_01_idle.gif",
        "attack": "assets/gifs/bosses/boss_01_attack.gif",
        "hurt": "assets/gifs/bosses/boss_01_hurt.gif",
        "break": "assets/gifs/bosses/boss_01_break.gif"
      },
      "phases": [
        {
          "id": "phase_1",
          "hpRange": { "min": 51, "max": 100 },
          "opsPerTurn": { "min": 2, "max": 3 },
          "actionWeights": [
            { "actionId": "b_slash", "weight": 70 },
            { "actionId": "b_heavy", "weight": 30 }
          ],
          "comboIds": []
        },
        {
          "id": "phase_2",
          "hpRange": { "min": 0, "max": 50 },
          "opsPerTurn": { "min": 2, "max": 3 },
          "actionWeights": [
            { "actionId": "b_slash", "weight": 40 },
            { "actionId": "b_heavy", "weight": 60 }
          ],
          "comboIds": ["combo_boss_double"]
        }
      ],
      "actions": [
        {
          "id": "b_slash",
          "name": "斩击",
          "opType": "normal",
          "damage": 6,
          "playerRageCut": 1,
          "effects": [],
          "anim": "attack",
          "animDurationMs": 600,
          "hitAtMs": 300
        },
        {
          "id": "b_heavy",
          "name": "重斩",
          "opType": "special",
          "damage": 10,
          "playerRageCut": 2,
          "effects": [],
          "anim": "attack",
          "animDurationMs": 900,
          "hitAtMs": 450
        }
      ],
      "scaling": { "hpPerFloor": 0.15, "damagePerFloor": 0.10, "ragePerFloor": 0.0 },
      "reward": { "dropPoolId": "drop_pool_01" }
    }
  ]
}
```

## 4. 操作序列（运行时结构）

> 本节结构**只存在于内存与存档**，不对应独立配置文件。
> 序列的数值来源：`weapons.json`、`bosses.json`、`battle.config.json`。

### 4.1 操作类型枚举

| `kind` | 含义 | 是否耗杀气 | 是否有次数限制 |
|---|---|---|---|
| `attack` | 武器攻击（`attackType` 区分 normal / special） | 是 | 特殊攻击受全局次数池限制 |
| `defend` | 格挡 | 否 | 否 |
| `item` | 使用药品 | 否 | 受药品每场次数限制 |
| `switch` | 切换普通武器 | 否 | 受 2 操作冷却限制 |

### 4.2 玩家指令快照 PlayerCommand

入队瞬间生成，**不可变**。结算阶段只读此结构，禁止回读面板。

| 字段 | 类型 | 说明 |
|---|---|---|
| `opId` | string | 运行时唯一，格式 `cmd_<8位hex>` |
| `seq` | integer | 队列内序号，从 1 开始 |
| `kind` | OperationKind | 见 4.1 |
| `panelKey` | string | 触发按钮：`1.1`~`4.2` / `defend` / `switch` |
| `weaponId` | string \| null | `attack` 与 `switch` 必填（switch 为切换前的当前武器） |
| `attackType` | `"normal"` \| `"special"` \| null | 仅 `attack` 有效 |
| `sourceId` | string \| null | 攻击为 attack id；药品为 item id；防御 / 切换为 `null` |
| `resolved` | ResolvedStats | 入队时已结算的固定值 |
| `effects` | string[] | 攻击附带 effect id 的副本 |

**ResolvedStats**

| 字段 | 类型 | 说明 |
|---|---|---|
| `damage` | number | 已含升级 / 铸魂 / 饰品 / 常驻 Buff，未含连招与预判期 Buff |
| `rageCost` | number | 实际扣减的杀气 |
| `bossRageCut` | number | 实际削减的 Boss 杀气 |
| `consumesSpecialUse` | boolean | 是否消耗全局特殊攻击次数 |
| `heal` | number \| null | 仅 `item` |

示例：

```json
{
  "opId": "cmd_7f3a91c2",
  "seq": 2,
  "kind": "attack",
  "panelKey": "1.2",
  "weaponId": "sword_single",
  "attackType": "special",
  "sourceId": "sword_single_special",
  "resolved": {
    "damage": 7.7,
    "rageCost": 2,
    "bossRageCut": 2,
    "consumesSpecialUse": true,
    "heal": null
  },
  "effects": []
}
```

### 4.3 玩家指令队列 CommandQueue

| 字段 | 类型 | 说明 |
|---|---|---|
| `structure` | `"lifo"` | 固定值 |
| `items` | PlayerCommand[] | 按执行顺序排列，`seq` 严格递增 |
| `nextSeq` | integer | 下一个可用序号 |

约束：

- `undo` 移除 `items` 最后一项，其余 `seq` 不重排。
- 新入队项的 `seq = nextSeq`，随后 `nextSeq += 1`。
- 排布期按已入队攻击的 `rageCost` 累计预扣，累计值超过当前杀气时对应按钮置灰（不允许超发）。
- 特殊攻击在入队时即校验全局剩余次数，置灰逻辑与结算扣减保持一致。

### 4.4 面板派生 PanelState

| 字段 | 类型 | 说明 |
|---|---|---|
| `baseOrder` | string[2] | 战斗开始时两把普通武器的固定顺序 |
| `currentOrder` | string[2] | 当前顺序，由队列推导 |
| `specialOrder` | string[2] | 巨斧 / 弓箭，固定 |
| `switchCooldownRemaining` | integer | 剩余可切换所需操作数 |

推导规则（唯一实现口径）：

```text
currentOrder = baseOrder
for each switch 指令 in queue（按 seq 升序）:
    swap(currentOrder[0], currentOrder[1])
```

- 因此撤回切换指令后，面板**自动回退**，不额外存状态。
- `switchCooldownRemaining` 只由**已执行**的切换操作改变，撤回不影响。

示例：

```json
{
  "baseOrder": ["sword_single", "two_hand_blade"],
  "currentOrder": ["two_hand_blade", "sword_single"],
  "specialOrder": ["axe", "bow"],
  "switchCooldownRemaining": 0
}
```

### 4.5 Boss 意图 BossIntent

| 字段 | 类型 | 说明 |
|---|---|---|
| `turn` | integer | 所属回合 |
| `phaseId` | string | 生成时命中的阶段 |
| `revealed` | boolean | 是否已公开 |
| `items` | BossIntentItem[] | 顺序即执行顺序 |
| `cursor` | integer | 下一条待执行的下标，从 0 开始 |

**BossIntentItem**

| 字段 | 类型 | 说明 |
|---|---|---|
| `seq` | integer | 从 1 开始 |
| `actionId` | string | 对应 `bosses.json.actions[].id` |
| `name` | string | 冗余显示名 |
| `opType` | `"normal"` \| `"special"` | 冗余，便于 UI 直接渲染 |
| `damage` | number | 已应用层数缩放 |
| `playerRageCut` | number | 已应用层数缩放 |
| `effects` | string[] | 冗余副本 |
| `anim` | string | 动画键 |
| `animDurationMs` | integer | 动画时长 |

示例：

```json
{
  "turn": 3,
  "phaseId": "phase_2",
  "revealed": true,
  "items": [
    {
      "seq": 1,
      "actionId": "b_slash",
      "name": "斩击",
      "opType": "normal",
      "damage": 6,
      "playerRageCut": 1,
      "effects": [],
      "anim": "attack",
      "animDurationMs": 600
    },
    {
      "seq": 2,
      "actionId": "b_heavy",
      "name": "重斩",
      "opType": "special",
      "damage": 10,
      "playerRageCut": 2,
      "effects": [],
      "anim": "attack",
      "animDurationMs": 900
    }
  ],
  "cursor": 0
}
```

### 4.6 结算计划 SettlementPlan

| 字段 | 类型 | 说明 |
|---|---|---|
| `turn` | integer | 所属回合 |
| `order` | `{ actor, index }[]` | 交替顺序，`actor` 为 `player` / `boss` |
| `cursor` | `{ boss, player }` | 双方各自的执行下标 |

生成规则：

1. Boss 固定先行。
2. 交替生成：`boss[0] → player[0] → boss[1] → player[1] …`
3. 一方条目耗尽即停止追加该方，另一方继续。
4. 因杀气归零被跳过的操作仍占用一个条目，结算时派发 `skip` 事件。

```json
{
  "turn": 3,
  "order": [
    { "actor": "boss", "index": 0 },
    { "actor": "player", "index": 0 },
    { "actor": "boss", "index": 1 },
    { "actor": "player", "index": 1 }
  ],
  "cursor": { "boss": 0, "player": 0 }
}
```

### 4.7 结算事件 SettlementEvent

逻辑层 → UI 的唯一事件载荷。

| 字段 | 类型 | 说明 |
|---|---|---|
| `type` | EventType | 见下表 |
| `turn` | integer | 所属回合 |
| `actor` | `"player"` \| `"boss"` \| null | 发起方 |
| `target` | `"player"` \| `"boss"` \| null | 承受方 |
| `sourceOpId` | string \| null | 玩家指令 id 或 Boss 意图 seq 标识 |
| `value` | number \| null | 主数值（伤害 / 杀气变化 / 治疗量） |
| `meta` | object | 事件附加信息，见下表 |

| EventType | 触发点 | `meta` 关键字段 |
|---|---|---|
| `turnStart` | 回合开始 | `turn` |
| `intentRevealed` | Boss 意图公开 | `items` |
| `queueChanged` | 队列增删 | `queue` |
| `switch` | 切换执行 | `fromWeaponId`, `toWeaponId` |
| `damage` | 造成伤害 | `hpBefore`, `hpAfter` |
| `block` | 格挡成功，伤害减半 | `blockedDamage`（原始伤害）, `reducedDamage`, `damageScale`, `reflectedRageCut` |
| `heal` | 药品生效 | `hpBefore`, `hpAfter` |
| `rageChange` | 杀气变动 | `side`, `before`, `after`, `reason` |
| `specialUsesChange` | 特殊次数变动 | `before`, `after` |
| `skip` | 操作被跳过 | `reason`: `rageZero` \| `break` |
| `combo` | 连招触发 | `comboId`, `applyAtSeq` |
| `breakStart` | Boss 进入破防 | `turn` |
| `breakEnd` | 破防结束 | `turn` |
| `turnEnd` | 回合结束 | `turn` |
| `battleEnd` | 战斗结束 | `result`: `win` \| `lose` |

示例：

```json
{
  "type": "damage",
  "turn": 3,
  "actor": "player",
  "target": "boss",
  "sourceOpId": "cmd_7f3a91c2",
  "value": 7.7,
  "meta": { "hpBefore": 61, "hpAfter": 53.3 }
}
```

### 4.8 回合阶段枚举

| 值 | 含义 |
|---|---|
| `BOSS_INTENT` | 生成并公开 Boss 意图 |
| `PLAYER_PLANNING` | 玩家排布、撤回、切换 |
| `PRE_CHECK` | 连招与 Boss 特殊效果判定，标记加成落点 |
| `SETTLEMENT` | 交替逐条结算 |
| `TURN_END` | 回满杀气、冷却递减、Buff 计时 |
| `BREAK_TURN` | Boss 破防轮空回合 |
| `BATTLE_END` | 战斗结束 |

## 5. `combos.json`（序列判定结构）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | string | 是 | 唯一 |
| `name` | string | 是 | 显示名 |
| `owner` | `"player"` \| `"boss"` | 是 | 归属方 |
| `scope` | `"global"` \| `"weapon"` \| `"boss"` | 是 | 全局 / 指定武器 / 指定 Boss |
| `weaponId` | string \| null | 条件 | `scope = "weapon"` 必填 |
| `bossId` | string \| null | 条件 | `scope = "boss"` 必填 |
| `pattern` | string[] | 是 | 玩家为 `"normal"` / `"special"`；Boss 为 actionId |
| `match.consecutive` | boolean | 是 | 是否要求连续 |
| `match.interruptOn` | string[] | 是 | 断连操作类型，可为空数组（即不断连） |
| `match.breakMode` | `"reset"` \| `"ignore"` | 是 | 断连后重置计数 / 忽略断连 |
| `bonus.damageMultiplier` | number | 是 | 乘算，`1.0` 表示无加成 |
| `bonus.extraBossRageCut` | number | 是 | 额外削减 Boss 杀气 |
| `applyTo` | `"patternLastOp"` \| `"patternAllOps"` | 是 | 加成落点 |
| `unlock.type` | `"none"` \| `"upgradeNode"` | 是 | 解锁方式 |
| `unlock.id` | string \| null | 条件 | `upgradeNode` 时为节点 id |

```json
{
  "schemaVersion": 1,
  "combos": [
    {
      "id": "combo_basic",
      "name": "基础连招",
      "owner": "player",
      "scope": "global",
      "weaponId": null,
      "bossId": null,
      "pattern": ["normal", "special", "normal"],
      "match": {
        "consecutive": true,
        "interruptOn": ["defend", "item", "switch"],
        "breakMode": "reset"
      },
      "bonus": { "damageMultiplier": 1.1, "extraBossRageCut": 4 },
      "applyTo": "patternLastOp",
      "unlock": { "type": "none", "id": null }
    },
    {
      "id": "combo_boss_double",
      "name": "Boss 双连",
      "owner": "boss",
      "scope": "boss",
      "weaponId": null,
      "bossId": "boss_01",
      "pattern": ["b_slash", "b_heavy"],
      "match": { "consecutive": true, "interruptOn": [], "breakMode": "reset" },
      "bonus": { "damageMultiplier": 1.15, "extraBossRageCut": 0 },
      "applyTo": "patternLastOp",
      "unlock": { "type": "none", "id": null }
    }
  ]
}
```

## 6. 与操作序列相关的全局常量（`battle.config.json`）

| 键 | 类型 | 含义 |
|---|---|---|
| `turn.bossOps.min` / `.max` | integer | Boss 每回合操作数范围 |
| `turn.firstActor` | `"boss"` \| `"player"` | 固定 `"boss"` |
| `turn.mode` | `"alternate"` | 固定交替结算 |
| `queue.structure` | `"lifo"` | 队列结构 |
| `queue.undoCount` | integer | 每次撤回条数，固定 1 |
| `switch.cooldownOps` | integer | 切换后需执行的操作数 |
| `switch.cooldownAcrossTurns` | boolean | 冷却是否跨回合 |
| `specialUses.shared` | boolean | 固定 `true` |
| `specialUses.initial` | integer | 全局次数池初始值 |
| `specialUses.refill` | `"none"` | 战斗内不恢复 |
| `player.zeroRage.threshold` | number | 固定 `0`，判定 `<=` |
| `player.zeroRage.refillPerTurn` | integer | 固定 `1` |
| `boss.break.skipAllOps` | boolean | 破防回合跳过全部操作 |
| `defense.rageCost` | number | 格挡消耗杀气，固定 `0` |
| `defense.damageScale` | number | 格挡时受到伤害的乘数，取值 0 ~ 1 |
| `defense.bossRageCutScale` | number | 格挡时 Boss 削减玩家杀气的乘数 |
| `defense.reflectOriginalCut` | boolean | 反弹给 Boss 的是否为原始削减量 |
| `combo.checkAt` | `"preSettlement"` | 连招判定时点 |
| `display.decimals` | integer | 固定 1 |

## 7. 面板键位绑定（`battle.config.json.panel`）

```json
{
  "normalGroup": [
    {
      "slot": 1,
      "keys": { "normal": "1.1", "special": "1.2" }
    },
    {
      "slot": 2,
      "keys": { "normal": "2.1", "special": "2.2" }
    }
  ],
  "specialGroup": [
    { "key": "3.1", "weaponId": "axe" },
    { "key": "3.2", "weaponId": "bow" }
  ],
  "itemGroup": [
    { "key": "4.1", "itemId": "potion_heal" },
    { "key": "4.2", "itemId": null }
  ],
  "defendKey": "defend",
  "switchKey": "switch",
  "undoKey": "undo"
}
```

- `normalGroup` 的 `slot` 对应 `PanelState.baseOrder` 的下标（0 基），武器 id 由 `RunState` 装备决定，不写死在配置里。
- `specialGroup` 的 `weaponId` 必须指向 `category = "special"` 的武器。
- `itemGroup` 的 `itemId = null` 时按钮渲染为禁用占位。
- 按钮映射变更只改此配置，UI 不得硬编码键位。

## 8. 校验清单（Validator 必须覆盖）

1. `weapons[].attacks.special` 只允许出现在 `category = "normal"` 的武器上。
2. 所有 `attack.id` 跨武器唯一。
3. `specialGroup` 引用的武器必须存在且 `category = "special"`。
4. `phases[].hpRange` 互不重叠，并完整覆盖 `[0, maxHp]`。
5. `phases[].actionWeights[].actionId` 必须存在于同一 Boss 的 `actions`。
6. `phases[].opsPerTurn.min ≤ max`，且 `max ≤ 5`。
7. `combo.pattern` 中玩家 token 只能是 `"normal"` / `"special"`；Boss token 必须是有效 actionId。
8. `combo.weaponId` / `bossId` / `unlock.id` / `effects[]` / `dropPoolId` 引用必须存在。
9. `ResolvedStats` 所有数值 ≤ 1 位小数，且 `rageCost ≥ 0`。
10. `PanelState.currentOrder` 必须能由 `baseOrder` + 队列中的 switch 指令推导得出。
11. `map.nodeTypes[].id` 只能是 `battle / event / chest / shop / boss`；`boss` 权重为 0 且 `isBoss = true`。
12. `MapGraph` 底部只有 1 个节点、顶部只有 1 个 Boss 节点，且为有向无环图。
13. `events[].choices` 固定 3 项；`effects[].type` 与所需引用字段匹配。
14. `chests[].image` / `openGif` 位于 `assets/chests/`；`rewards` 非空。
15. `shop.columns[].offers` 非空；`price` / `refresh.baseCost` / `costStep` 为非负整数；`pickCount ≤ offers.length`。
16. `skills.root` 唯一且 `cost = 0`；`prerequisiteIds` 无环；`upgrades.enhancement.maxLevel` 与 `categories` 完整。

## 9. 外层与全局系统契约

> 本节覆盖路线图、事件、宝箱、商店、技能树、装备强化与 HUD 快照。
> 这些系统不使用 Scene 路由：事件 / 宝箱 / 商店 / 背包 / 技能树 / 设置均为浮层。

### 9.1 `map.json` 与 `MapGraph`

顶层：

```json
{
  "schemaVersion": 1,
  "floor": {
    "layers": 8,
    "startNodeType": "event",
    "bossNodeType": "boss"
  },
  "branch": {
    "minPaths": 2,
    "maxPaths": 3,
    "minNodesPerLayer": 1,
    "maxNodesPerLayer": 3
  },
  "nodeTypes": [
    { "id": "battle", "weight": 45, "sceneId": "battle" },
    { "id": "event", "weight": 20, "overlayId": "event" },
    { "id": "chest", "weight": 15, "overlayId": "chest" },
    { "id": "shop", "weight": 20, "overlayId": "shop" },
    { "id": "boss", "weight": 0, "sceneId": "battle", "isBoss": true }
  ]
}
```

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `floor.layers` | integer | 是 | 总层数，含底部起始层与顶部 Boss 层 |
| `floor.startNodeType` | string | 是 | 底部唯一节点类型，固定为 `event` |
| `floor.bossNodeType` | string | 是 | 顶部唯一节点类型，固定为 `boss` |
| `branch.minPaths` / `.maxPaths` | integer | 是 | 每层分叉路径数范围 |
| `branch.minNodesPerLayer` / `.maxNodesPerLayer` | integer | 是 | 中间层节点数范围 |
| `nodeTypes[].id` | string | 是 | `battle` / `event` / `chest` / `shop` / `boss` |
| `nodeTypes[].weight` | integer | 是 | 中间层抽取权重，`boss` 固定 0 |
| `nodeTypes[].sceneId` | string | 条件 | 战斗类节点必填，`battle` |
| `nodeTypes[].overlayId` | string | 条件 | 浮层类节点必填，`event` / `chest` / `shop` |
| `nodeTypes[].isBoss` | boolean | 否 | 仅 `boss` 为 `true` |

`MapGraph`（运行时，写入 `runState.mapNodes`）：

| 字段 | 类型 | 说明 |
|---|---|---|
| `floor` | integer | 所属楼层 |
| `seed` | integer | 本层种子，写入 `runState.floorSeed` |
| `layers` | MapLayer[] | 下标 0 为底部起始层，末项为 Boss 层 |

**MapLayer**

| 字段 | 类型 | 说明 |
|---|---|---|
| `index` | integer | 层号，0 基 |
| `nodes` | MapNode[] | 该层节点 |

**MapNode**

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | string | 全局唯一，格式 `f<floor>_l<layer>_n<seq>` |
| `type` | string | `battle` / `event` / `chest` / `shop` / `boss` |
| `layer` | integer | 所在层 |
| `column` | integer | 该层横向序号，用于绘制分叉 |
| `nextIds` | string[] | 连通的上一层节点 id；Boss 层为 `[]` |
| `payloadId` | string \| null | `eventId` / `chestId` / `bossId`；商店为 `null` |

约束：

- 底部层只有 1 个 `event` 节点；顶部层只有 1 个 `boss` 节点。
- 除顶部层外每个节点至少 1 个 `nextIds`；图是有向无环图。
- 每层生成后立即写入 `runState`，当层内不再重算；升层时用新的 `floorSeed` 重新生成。
- 节点完成状态不入 `MapNode`，统一记在 `runState.completedNodeIds`。

### 9.2 `events.json`

```json
{
  "schemaVersion": 1,
  "events": [
    {
      "id": "event_wanderer",
      "titleKey": "event.wanderer.title",
      "descKey": "event.wanderer.desc",
      "image": "assets/events/event_wanderer.png",
      "choices": [
        {
          "id": "help",
          "textKey": "event.wanderer.choice.help",
          "resultKey": "event.wanderer.result.help",
          "effects": [
            { "type": "gold", "value": 50 },
            { "type": "enhanceCount", "enhanceCategory": "normalWeapon", "value": 1 }
          ]
        }
      ]
    }
  ]
}
```

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | string | 是 | 唯一 |
| `titleKey` / `descKey` | string | 是 | `ui.json` 文案键 |
| `image` | string | 是 | `assets/events/` 下的相对路径 |
| `choices` | EventChoice[] | 是 | 固定 3 项 |
| `choices[].id` | string | 是 | 事件内唯一 |
| `choices[].textKey` / `.resultKey` | string | 是 | 选项文案 / 结算文案键 |
| `choices[].effects` | Effect[] | 是 | 结构化效果，可为空数组 |

**Effect**

| 字段 | 类型 | 说明 |
|---|---|---|
| `type` | string | `gold` / `healFlat` / `healPercent` / `maxHpFlat` / `enhanceCount` / `skillPoint` / `item` / `dropPool` |
| `value` | number | 数值；`dropPool` 时为抽取次数 |
| `enhanceCategory` | string \| null | 仅 `enhanceCount` 使用 |
| `itemId` / `dropPoolId` | string \| null | 仅 `item` / `dropPool` 使用 |

### 9.3 `chests.json`

```json
{
  "schemaVersion": 1,
  "openDurationMs": 1200,
  "chests": [
    {
      "id": "chest_common",
      "nameKey": "chest.common.name",
      "image": "assets/chests/chest_common.png",
      "openGif": "assets/chests/chest_common_open.gif",
      "rewards": [
        { "type": "gold", "value": 50 },
        { "type": "enhanceCount", "enhanceCategory": "item", "value": 1 }
      ]
    }
  ]
}
```

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` / `nameKey` | string | 是 | 唯一 id 与文案键 |
| `image` / `openGif` | string | 是 | 合盖图与开箱 GIF，位于 `assets/chests/` |
| `rewards` | Effect[] | 是 | 固定奖励清单，全部生效并按 `nameKey` 展示 |
| `openDurationMs` | integer | 是 | 开箱动画时长，播放完再展示清单 |

- 需要随机奖励时使用 `type: "dropPool"`，从 `drops.json` 抽取；抽取结果同样写入清单。
- 奖励先由 `ChestResolver` 合并进 `RunState`，再关闭浮层。

### 9.4 `shop.json` 与 `ShopSession`

```json
{
  "schemaVersion": 1,
  "purchaseLimit": 1,
  "columns": [
    {
      "id": "weapons",
      "titleKey": "shop.column.weapons",
      "slots": 3,
      "refresh": { "baseCost": 50, "costStep": 50 },
      "offers": [
        { "id": "offer_sword_single", "weaponId": "sword_single", "price": 120 },
        { "id": "offer_axe", "weaponId": "axe", "price": 150 }
      ]
    },
    {
      "id": "items",
      "titleKey": "shop.column.items",
      "slots": 2,
      "refresh": { "baseCost": 50, "costStep": 50 },
      "offers": [
        { "id": "offer_potion_heal", "itemId": "potion_heal", "price": 60 }
      ]
    },
    {
      "id": "enhance",
      "titleKey": "shop.column.enhance",
      "slots": 2,
      "pickCount": 2,
      "refresh": { "baseCost": 50, "costStep": 50 },
      "offers": [
        { "id": "offer_enhance_normal", "enhanceCategory": "normalWeapon", "amount": 1, "price": 80 },
        { "id": "offer_enhance_special", "enhanceCategory": "specialWeapon", "amount": 1, "price": 80 },
        { "id": "offer_enhance_item", "enhanceCategory": "item", "amount": 1, "price": 80 }
      ]
    }
  ]
}
```

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `purchaseLimit` | integer | 是 | 每个商品实例的限购次数，固定 1 |
| `columns[].id` | string | 是 | `weapons` / `items` / `enhance` |
| `columns[].slots` | integer | 是 | 单次展示商品数 |
| `columns[].pickCount` | integer | 否 | 从 offers 中随机抽取的数量，仅 `enhance` 使用 |
| `columns[].refresh.baseCost` | integer | 是 | 首次刷新价格 |
| `columns[].refresh.costStep` | integer | 是 | 每次刷新后的涨价幅度 |
| `offers[].id` | string | 是 | 商品模板 id |
| `offers[].price` | integer | 是 | 金币价格 |
| `offers[].weaponId` / `itemId` / `enhanceCategory` | string | 条件 | 三选一，按栏位类型填写 |
| `offers[].amount` | integer | 条件 | 仅 `enhance` 使用，表示一次购买获得的强化次数 |

**ShopSession**（运行时，不存档）

| 字段 | 类型 | 说明 |
|---|---|---|
| `nodeId` | string | 对应路线图节点 |
| `columns` | ShopColumnState[] | 三栏独立状态 |

**ShopColumnState**

| 字段 | 类型 | 说明 |
|---|---|---|
| `columnId` | string | 栏位 id |
| `offers` | ShopOfferInstance[] | 当前展示的商品实例 |
| `refreshCount` | integer | 本栏已刷新次数 |
| `lastRefreshCost` | integer \| null | 最近一次刷新花费 |

**ShopOfferInstance**

| 字段 | 类型 | 说明 |
|---|---|---|
| `instanceId` | string | 本次展示唯一，刷新后重新生成 |
| `offerId` | string | 模板 id |
| `price` | integer | 本次售价 |
| `purchased` | boolean | 是否已购买 |

约束：

- 刷新价格 = `baseCost + costStep × refreshCount`，由 meta 计算，UI 只显示。
- 三栏刷新互不影响；刷新后 `offers` 全部替换且 `purchased` 重置为 `false`。
- 商品实例限购 1 次；购买后置灰但保留在栏内直到下次刷新。
- 金币不足时购买与刷新按钮置灰。
- `ShopSession` 关闭即丢弃，不写入存档。

### 9.5 `skills.json`

```json
{
  "schemaVersion": 1,
  "root": "skill_root",
  "nodes": [
    {
      "id": "skill_root",
      "nameKey": "skill.root.name",
      "branch": "root",
      "cost": 0,
      "prerequisiteIds": [],
      "effects": []
    },
    {
      "id": "skill_sword_mastery",
      "nameKey": "skill.sword_mastery.name",
      "branch": "purple",
      "cost": 1,
      "prerequisiteIds": ["skill_root"],
      "effects": [{ "stat": "attackPowerPercent", "value": 0.05 }]
    }
  ]
}
```

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `root` | string | 是 | 根节点 id，唯一且 `cost = 0` |
| `nodes[].id` | string | 是 | 唯一 |
| `nodes[].branch` | string | 是 | `root` / `purple` / `cyan` / `red`；颜色由样式决定 |
| `nodes[].cost` | integer | 是 | 点亮消耗技能点，非负 |
| `nodes[].prerequisiteIds` | string[] | 是 | 前置节点，必须全部已点亮 |
| `nodes[].effects` | object[] | 是 | `{ stat, value }`，stat 取值见 `data_rules.md` §4 |

- 技能点来源：普通战斗胜利 +1，Boss 战胜利 +3，事件可额外产出。
- 点亮是永久状态，写入 `runState.unlockedSkillIds`。
- 前置未全部点亮或点数不足时，节点置灰，不可点击。

### 9.6 `upgrades.json.enhancement`

```json
{
  "schemaVersion": 1,
  "upgrades": [],
  "enhancement": {
    "maxLevel": 30,
    "categories": [
      { "id": "normalWeapon", "chargesPerLevel": 1, "statPerLevel": { "damagePercent": 0.02 } },
      { "id": "specialWeapon", "chargesPerLevel": 1, "statPerLevel": { "damagePercent": 0.02 } },
      { "id": "item", "chargesPerLevel": 1, "statPerLevel": { "healPercent": 0.02 } }
    ]
  }
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `enhancement.maxLevel` | integer | 单件装备强化上限，固定 30 |
| `categories[].id` | string | `normalWeapon` / `specialWeapon` / `item` |
| `categories[].chargesPerLevel` | integer | 每升 1 级消耗的强化次数 |
| `categories[].statPerLevel` | object | 每级提供的属性加成，按 `stat` 累加 |

- 强化等级写入 `runState.enhanceLevels[equipmentId]`，剩余次数写入 `runState.enhanceCounts[category]`。
- 战斗中禁止强化与换装；UI 依据 `InventorySnapshot.editable` 置灰。
- 武器异变 / 升级树本期不做，`upgrades` 保留空数组。

### 9.7 快照契约

**HudSnapshot**（`RunController.getHudSnapshot()`）

```json
{
  "sceneId": "map",
  "show": true,
  "inBattle": false,
  "hp": { "current": 42, "max": 50 },
  "rage": { "current": 10, "max": 10 },
  "gold": 320,
  "enhanceCounts": { "normalWeapon": 2, "specialWeapon": 1, "item": 3 }
}
```

- `rage.current` 在战斗外固定等于 `rage.max`；战斗中由战斗快照覆盖。
- `hp.current` 始终是当前剩余血量。
- `show` 由 `sceneId !== "home"` 决定，SceneShell 用它控制显隐。
- HUD 不计算任何字段，只渲染。

**StatsSnapshot**（`RunController.getStatsSnapshot()`）

```json
{
  "maxHp": 50,
  "maxRage": 10,
  "attackPower": 5.4,
  "defense": 0
}
```

**InventorySnapshot**（`RunController.getInventorySnapshot()`）

| 字段 | 类型 | 说明 |
|---|---|---|
| `equipment` | object | 已装备的普通 / 特殊武器与药品 |
| `enhanceLevels` | object | 装备 id → 等级 |
| `enhanceCounts` | object | 三类剩余次数 |
| `stats` | StatsSnapshot | 综合属性 |
| `editable` | boolean | 战斗外为 `true`，战斗中为 `false` |

- `editable = false` 时，强化、换装、使用按钮置灰；筛选、悬停、查看保持可用。
- 背包为全局唯一浮层，所有场景共用同一份快照与同一组意图方法。

## 10. 版本策略

| 变更类型 | 处理 |
|---|---|
| 新增可选字段 | 保持 `schemaVersion`，更新本文件 |
| 新增必填字段 / 改语义 | `schemaVersion + 1`，配置同步迁移 |
| 删除或重命名字段 | `schemaVersion + 1`，写迁移函数 |
| 仅数值调整 | 不动版本，只改 `config/` |
| 运行时结构变更 | 同时提升 `saveVersion`，避免旧存档解析错误 |
