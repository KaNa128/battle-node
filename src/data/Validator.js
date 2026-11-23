// 配置校验：启动即校验必填、类型、枚举与引用完整性。
// 任一致命问题都会抛出带「文件 + 字段路径」的错误，禁止静默兜底。

const WEAPON_CATEGORIES = ['normal', 'special'];
const OP_TYPES = ['normal', 'special'];
const OWNERS = ['player', 'boss'];
const SCOPES = ['global', 'weapon', 'boss'];
const BREAK_MODES = ['reset', 'ignore'];
const APPLY_TOS = ['patternLastOp', 'patternAllOps'];
const UNLOCK_TYPES = ['none', 'upgradeNode'];

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function isInteger(value) {
  return Number.isInteger(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.length > 0;
}

function hasOneDecimal(value) {
  return Math.abs(value * 10 - Math.round(value * 10)) < 1e-9;
}

class ConfigValidator {
  constructor(config) {
    this.config = config;
    this.errors = [];
    this.warnings = [];
    this.weaponsById = new Map();
    this.attacksById = new Map();
    this.bossesById = new Map();
    this.itemsById = new Map();
    this.combosById = new Map();
    this.effectIds = new Set();
  }

  fail(path, message) {
    this.errors.push(`${path}: ${message}`);
  }

  check(condition, path, message) {
    if (!condition) this.fail(path, message);
    return condition;
  }

  validateFile(root, path) {
    this.check(isPlainObject(root), path, '必须是对象');
    if (!isPlainObject(root)) return false;
    this.check(isInteger(root.schemaVersion), `${path}.schemaVersion`, '必须是整数');
    return true;
  }

  validate() {
    if (!isPlainObject(this.config)) {
      throw new Error('配置校验失败：配置根节点必须是对象');
    }

    this.validateWeapons();
    this.validateEffects();
    this.validateCombos();
    this.validateBosses();
    this.validateItems();
    this.validateScenes();
    this.validateUi();
    this.validateBattleConfig();

    if (this.errors.length > 0) {
      const detail = this.errors.map((line) => `  - ${line}`).join('\n');
      const error = new Error(`配置校验失败（${this.errors.length} 处）：\n${detail}`);
      error.validationErrors = this.errors;
      throw error;
    }
    return this.warnings;
  }

  validateWeapons() {
    const root = this.config.weapons;
    if (!this.validateFile(root, 'weapons.json')) return;
    if (!this.check(Array.isArray(root.weapons), 'weapons.json.weapons', '必须是数组')) return;

    root.weapons.forEach((weapon, index) => {
      const path = `weapons.json.weapons[${index}]`;
      if (!isPlainObject(weapon)) {
        this.fail(path, '必须是对象');
        return;
      }
      this.check(isNonEmptyString(weapon.id), `${path}.id`, '必填非空字符串');
      this.check(isNonEmptyString(weapon.name), `${path}.name`, '必填非空字符串');
      this.check(WEAPON_CATEGORIES.includes(weapon.category), `${path}.category`, `必须是 ${WEAPON_CATEGORIES.join(' / ')}`);

      if (isNonEmptyString(weapon.id)) {
        if (this.weaponsById.has(weapon.id)) {
          this.fail(`${path}.id`, `武器 id 重复：${weapon.id}`);
        }
        this.weaponsById.set(weapon.id, weapon);
      }

      if (weapon.enabled !== undefined) {
        this.check(typeof weapon.enabled === 'boolean', `${path}.enabled`, '必须是布尔值');
      }

      if (this.check(isPlainObject(weapon.art), `${path}.art`, '必须是对象')) {
        ['idle', 'attack', 'hurt'].forEach((key) => {
          this.check(isNonEmptyString(weapon.art[key]), `${path}.art.${key}`, '必须是资源路径字符串');
        });
      }

      if (!this.check(isPlainObject(weapon.attacks), `${path}.attacks`, '必须是对象')) return;

      if (weapon.category === 'normal') {
        this.check(isPlainObject(weapon.attacks.normal), `${path}.attacks.normal`, '普通武器必须包含普攻');
        this.check(isPlainObject(weapon.attacks.special), `${path}.attacks.special`, '普通武器必须包含特殊攻击');
      } else if (weapon.category === 'special') {
        this.check(isPlainObject(weapon.attacks.normal), `${path}.attacks.normal`, '特殊武器必须包含普攻');
        this.check(!weapon.attacks.special, `${path}.attacks.special`, '特殊武器不允许包含特殊攻击');
      }

      for (const key of Object.keys(weapon.attacks)) {
        if (!OP_TYPES.includes(key)) {
          this.fail(`${path}.attacks.${key}`, '攻击键只能是 normal / special');
          continue;
        }
        this.validateAttack(weapon.attacks[key], `${path}.attacks.${key}`, key);
      }

      if (weapon.comboIds !== undefined) {
        if (this.check(Array.isArray(weapon.comboIds), `${path}.comboIds`, '必须是数组')) {
          weapon.comboIds.forEach((comboId, comboIndex) => {
            if (!isNonEmptyString(comboId)) {
              this.fail(`${path}.comboIds[${comboIndex}]`, '必须是非空字符串');
            }
          });
        }
      }
    });

    // attack id 在全部武器间唯一
    const seenAttackIds = new Set();
    root.weapons.forEach((weapon, weaponIndex) => {
      if (!isPlainObject(weapon.attacks)) return;
      for (const key of Object.keys(weapon.attacks)) {
        const attack = weapon.attacks[key];
        if (!isPlainObject(attack) || !isNonEmptyString(attack.id)) continue;
        if (seenAttackIds.has(attack.id)) {
          this.fail(`weapons.json.weapons[${weaponIndex}].attacks.${key}.id`, `攻击 id 重复：${attack.id}`);
        }
        seenAttackIds.add(attack.id);
      }
    });
  }

  validateAttack(attack, path, expectedOpType) {
    if (!this.check(isPlainObject(attack), path, '必须是对象')) return;
    this.check(isNonEmptyString(attack.id), `${path}.id`, '必填非空字符串');
    this.check(isNonEmptyString(attack.name), `${path}.name`, '必填非空字符串');
    this.check(attack.opType === expectedOpType, `${path}.opType`, `必须与所在键一致（${expectedOpType}）`);
    this.check(isNumber(attack.rageCost) && attack.rageCost >= 0, `${path}.rageCost`, '必须 ≥ 0 的数字');
    this.check(isNumber(attack.damage) && attack.damage >= 0, `${path}.damage`, '必须 ≥ 0 的数字');
    this.check(isNumber(attack.bossRageCut) && attack.bossRageCut >= 0, `${path}.bossRageCut`, '必须 ≥ 0 的数字');
    this.check(isNonEmptyString(attack.anim), `${path}.anim`, '必填非空字符串');
    this.check(isInteger(attack.animDurationMs) && attack.animDurationMs > 0, `${path}.animDurationMs`, '必须是正整数');
    if (attack.hitAtMs !== undefined) {
      this.check(isInteger(attack.hitAtMs) && attack.hitAtMs >= 0, `${path}.hitAtMs`, '必须是非负整数');
    }
    [attack.rageCost, attack.damage, attack.bossRageCut].forEach((value, index) => {
      if (isNumber(value)) {
        this.check(hasOneDecimal(value), `${path}.${['rageCost', 'damage', 'bossRageCut'][index]}`, '最多 1 位小数');
      }
    });
    if (attack.effects !== undefined) {
      if (this.check(Array.isArray(attack.effects), `${path}.effects`, '必须是数组')) {
        attack.effects.forEach((effectId, index) => {
          this.check(isNonEmptyString(effectId), `${path}.effects[${index}]`, '必须是非空字符串');
        });
      }
    }
  }

  validateEffects() {
    const root = this.config.effects;
    if (!this.validateFile(root, 'effects.json')) return;
    if (!this.check(Array.isArray(root.effects), 'effects.json.effects', '必须是数组')) return;

    root.effects.forEach((effect, index) => {
      const path = `effects.json.effects[${index}]`;
      if (!isPlainObject(effect)) {
        this.fail(path, '必须是对象');
        return;
      }
      if (!this.check(isNonEmptyString(effect.id), `${path}.id`, '必填非空字符串')) return;
      if (this.effectIds.has(effect.id)) {
        this.fail(`${path}.id`, `effect id 重复：${effect.id}`);
      }
      this.effectIds.add(effect.id);
    });
  }

  validateCombos() {
    const root = this.config.combos;
    if (!this.validateFile(root, 'combos.json')) return;
    if (!this.check(Array.isArray(root.combos), 'combos.json.combos', '必须是数组')) return;

    root.combos.forEach((combo, index) => {
      const path = `combos.json.combos[${index}]`;
      if (!isPlainObject(combo)) {
        this.fail(path, '必须是对象');
        return;
      }
      if (!this.check(isNonEmptyString(combo.id), `${path}.id`, '必填非空字符串')) return;
      if (this.combosById.has(combo.id)) {
        this.fail(`${path}.id`, `连招 id 重复：${combo.id}`);
      }
      this.combosById.set(combo.id, combo);

      this.check(isNonEmptyString(combo.name), `${path}.name`, '必填非空字符串');
      this.check(OWNERS.includes(combo.owner), `${path}.owner`, `必须是 ${OWNERS.join(' / ')}`);
      this.check(SCOPES.includes(combo.scope), `${path}.scope`, `必须是 ${SCOPES.join(' / ')}`);
      if (combo.scope === 'weapon') {
        this.check(isNonEmptyString(combo.weaponId), `${path}.weaponId`, 'scope=weapon 时必须填写');
      }
      if (combo.scope === 'boss') {
        this.check(isNonEmptyString(combo.bossId), `${path}.bossId`, 'scope=boss 时必须填写');
      }

      if (this.check(Array.isArray(combo.pattern) && combo.pattern.length > 0, `${path}.pattern`, '必须是非空数组')) {
        combo.pattern.forEach((token, tokenIndex) => {
          this.check(isNonEmptyString(token), `${path}.pattern[${tokenIndex}]`, '必须是非空字符串');
        });
      }

      if (this.check(isPlainObject(combo.match), `${path}.match`, '必须是对象')) {
        this.check(typeof combo.match.consecutive === 'boolean', `${path}.match.consecutive`, '必须是布尔值');
        if (this.check(Array.isArray(combo.match.interruptOn), `${path}.match.interruptOn`, '必须是数组')) {
          combo.match.interruptOn.forEach((token, tokenIndex) => {
            this.check(isNonEmptyString(token), `${path}.match.interruptOn[${tokenIndex}]`, '必须是非空字符串');
          });
        }
        this.check(BREAK_MODES.includes(combo.match.breakMode), `${path}.match.breakMode`, `必须是 ${BREAK_MODES.join(' / ')}`);
      }

      if (this.check(isPlainObject(combo.bonus), `${path}.bonus`, '必须是对象')) {
        this.check(isNumber(combo.bonus.damageMultiplier) && combo.bonus.damageMultiplier >= 1, `${path}.bonus.damageMultiplier`, '必须 ≥ 1 的数字');
        this.check(isNumber(combo.bonus.extraBossRageCut) && combo.bonus.extraBossRageCut >= 0, `${path}.bonus.extraBossRageCut`, '必须 ≥ 0 的数字');
      }

      this.check(APPLY_TOS.includes(combo.applyTo), `${path}.applyTo`, `必须是 ${APPLY_TOS.join(' / ')}`);

      if (this.check(isPlainObject(combo.unlock), `${path}.unlock`, '必须是对象')) {
        this.check(UNLOCK_TYPES.includes(combo.unlock.type), `${path}.unlock.type`, `必须是 ${UNLOCK_TYPES.join(' / ')}`);
        if (combo.unlock.type === 'upgradeNode') {
          this.check(isNonEmptyString(combo.unlock.id), `${path}.unlock.id`, 'upgradeNode 时必须填写节点 id');
        }
      }
    });
  }

  validateBosses() {
    const root = this.config.bosses;
    if (!this.validateFile(root, 'bosses.json')) return;
    if (!this.check(Array.isArray(root.bosses), 'bosses.json.bosses', '必须是数组')) return;

    root.bosses.forEach((boss, index) => {
      const path = `bosses.json.bosses[${index}]`;
      if (!isPlainObject(boss)) {
        this.fail(path, '必须是对象');
        return;
      }
      if (!this.check(isNonEmptyString(boss.id), `${path}.id`, '必填非空字符串')) return;
      if (this.bossesById.has(boss.id)) {
        this.fail(`${path}.id`, `Boss id 重复：${boss.id}`);
      }
      this.bossesById.set(boss.id, boss);

      this.check(isNonEmptyString(boss.name), `${path}.name`, '必填非空字符串');
      this.check(isNumber(boss.maxHp) && boss.maxHp > 0, `${path}.maxHp`, '必须是正数');
      this.check(isNumber(boss.maxRage) && boss.maxRage > 0, `${path}.maxRage`, '必须是正数');

      if (this.check(isPlainObject(boss.art), `${path}.art`, '必须是对象')) {
        ['idle', 'attack', 'hurt', 'break'].forEach((key) => {
          this.check(isNonEmptyString(boss.art[key]), `${path}.art.${key}`, '必须是资源路径字符串');
        });
      }

      if (this.check(isPlainObject(boss.scaling), `${path}.scaling`, '必须是对象')) {
        ['hpPerFloor', 'damagePerFloor', 'ragePerFloor'].forEach((key) => {
          this.check(isNumber(boss.scaling[key]) && boss.scaling[key] >= 0, `${path}.scaling.${key}`, '必须 ≥ 0 的数字');
        });
      }

      const actionIds = new Set();
      if (this.check(Array.isArray(boss.actions) && boss.actions.length > 0, `${path}.actions`, '必须是非空数组')) {
        boss.actions.forEach((action, actionIndex) => {
          const actionPath = `${path}.actions[${actionIndex}]`;
          if (!isPlainObject(action)) {
            this.fail(actionPath, '必须是对象');
            return;
          }
          if (!this.check(isNonEmptyString(action.id), `${actionPath}.id`, '必填非空字符串')) return;
          if (actionIds.has(action.id)) {
            this.fail(`${actionPath}.id`, `同一 Boss 内 action id 重复：${action.id}`);
          }
          actionIds.add(action.id);

          this.check(isNonEmptyString(action.name), `${actionPath}.name`, '必填非空字符串');
          this.check(OP_TYPES.includes(action.opType), `${actionPath}.opType`, `必须是 ${OP_TYPES.join(' / ')}`);
          this.check(isNumber(action.damage) && action.damage >= 0, `${actionPath}.damage`, '必须 ≥ 0 的数字');
          this.check(isNumber(action.playerRageCut) && action.playerRageCut >= 0, `${actionPath}.playerRageCut`, '必须 ≥ 0 的数字');
          this.check(isNonEmptyString(action.anim), `${actionPath}.anim`, '必填非空字符串');
          this.check(isInteger(action.animDurationMs) && action.animDurationMs > 0, `${actionPath}.animDurationMs`, '必须是正整数');
          if (action.effects !== undefined) {
            if (this.check(Array.isArray(action.effects), `${actionPath}.effects`, '必须是数组')) {
              action.effects.forEach((effectId, effectIndex) => {
                this.check(isNonEmptyString(effectId), `${actionPath}.effects[${effectIndex}]`, '必须是非空字符串');
              });
            }
          }
        });
      }

      if (!this.check(Array.isArray(boss.phases) && boss.phases.length > 0, `${path}.phases`, '必须是非空数组')) return;

      const ranges = [];
      boss.phases.forEach((phase, phaseIndex) => {
        const phasePath = `${path}.phases[${phaseIndex}]`;
        if (!isPlainObject(phase)) {
          this.fail(phasePath, '必须是对象');
          return;
        }
        this.check(isNonEmptyString(phase.id), `${phasePath}.id`, '必填非空字符串');

        if (this.check(isPlainObject(phase.hpRange), `${phasePath}.hpRange`, '必须是对象')) {
          const { min, max } = phase.hpRange;
          this.check(isInteger(min) && isInteger(max) && min >= 0 && min <= max, `${phasePath}.hpRange`, '必须是 0 ≤ min ≤ max 的整数');
          if (isInteger(min) && isInteger(max)) ranges.push({ min, max, path: phasePath });
        }

        if (this.check(isPlainObject(phase.opsPerTurn), `${phasePath}.opsPerTurn`, '必须是对象')) {
          const { min, max } = phase.opsPerTurn;
          this.check(isInteger(min) && isInteger(max) && min >= 1 && min <= max && max <= 5, `${phasePath}.opsPerTurn`, '必须是 1 ≤ min ≤ max ≤ 5');
        }

        if (this.check(Array.isArray(phase.actionWeights) && phase.actionWeights.length > 0, `${phasePath}.actionWeights`, '必须是非空数组')) {
          phase.actionWeights.forEach((weightItem, weightIndex) => {
            const weightPath = `${phasePath}.actionWeights[${weightIndex}]`;
            if (!isPlainObject(weightItem)) {
              this.fail(weightPath, '必须是对象');
              return;
            }
            this.check(isNonEmptyString(weightItem.actionId), `${weightPath}.actionId`, '必填非空字符串');
            this.check(isInteger(weightItem.weight) && weightItem.weight >= 0, `${weightPath}.weight`, '必须是非负整数');
            if (isNonEmptyString(weightItem.actionId) && !actionIds.has(weightItem.actionId)) {
              this.fail(`${weightPath}.actionId`, `引用了不存在的 Boss 行为：${weightItem.actionId}`);
            }
          });
        }

        if (phase.comboIds !== undefined) {
          if (this.check(Array.isArray(phase.comboIds), `${phasePath}.comboIds`, '必须是数组')) {
            phase.comboIds.forEach((comboId, comboIndex) => {
              this.check(isNonEmptyString(comboId), `${phasePath}.comboIds[${comboIndex}]`, '必须是非空字符串');
            });
          }
        }
      });

      // 阶段区间必须互不重叠且完整覆盖 [0, maxHp]
      ranges.sort((a, b) => a.min - b.min);
      if (ranges.length > 0 && isNumber(boss.maxHp)) {
        this.check(ranges[0].min === 0, `${ranges[0].path}.hpRange.min`, '阶段必须覆盖 0');
        this.check(ranges[ranges.length - 1].max === boss.maxHp, `${ranges[ranges.length - 1].path}.hpRange.max`, `阶段必须覆盖 maxHp（${boss.maxHp}）`);
        for (let i = 1; i < ranges.length; i += 1) {
          this.check(ranges[i].min === ranges[i - 1].max + 1, `${ranges[i].path}.hpRange.min`, `阶段区间不连续或重叠（上一段结束于 ${ranges[i - 1].max}）`);
        }
      }
    });
  }

  validateItems() {
    const root = this.config.items;
    if (!this.validateFile(root, 'items.json')) return;
    if (!this.check(Array.isArray(root.items), 'items.json.items', '必须是数组')) return;

    root.items.forEach((item, index) => {
      const path = `items.json.items[${index}]`;
      if (!isPlainObject(item)) {
        this.fail(path, '必须是对象');
        return;
      }
      if (!this.check(isNonEmptyString(item.id), `${path}.id`, '必填非空字符串')) return;
      if (this.itemsById.has(item.id)) {
        this.fail(`${path}.id`, `物品 id 重复：${item.id}`);
      }
      this.itemsById.set(item.id, item);

      this.check(isNonEmptyString(item.name), `${path}.name`, '必填非空字符串');
      this.check(isNumber(item.heal) && item.heal >= 0, `${path}.heal`, '必须 ≥ 0 的数字');
      this.check(isInteger(item.usesPerBattle) && item.usesPerBattle >= 1, `${path}.usesPerBattle`, '必须 ≥ 1 的整数');
      this.check(isInteger(item.animDurationMs) && item.animDurationMs > 0, `${path}.animDurationMs`, '必须是正整数');
    });
  }

  validateScenes() {
    const root = this.config.scenes;
    if (!this.validateFile(root, 'scenes.json')) return;

    if (root.transition !== undefined && this.check(isPlainObject(root.transition), 'scenes.json.transition', '必须是对象')) {
      this.check(
        isInteger(root.transition.durationMs) && root.transition.durationMs >= 0,
        'scenes.json.transition.durationMs',
        '必须是非负整数',
      );
    }

    if (!this.check(Array.isArray(root.scenes) && root.scenes.length > 0, 'scenes.json.scenes', '必须是非空数组')) return;

    const ids = new Set();
    root.scenes.forEach((scene, index) => {
      const path = `scenes.json.scenes[${index}]`;
      if (!isPlainObject(scene)) {
        this.fail(path, '必须是对象');
        return;
      }
      if (!this.check(isNonEmptyString(scene.id), `${path}.id`, '必填非空字符串')) return;
      if (ids.has(scene.id)) this.fail(`${path}.id`, `场景 id 重复：${scene.id}`);
      ids.add(scene.id);

      this.check(isNonEmptyString(scene.title), `${path}.title`, '必填非空字符串');
      if (this.check(isNonEmptyString(scene.background), `${path}.background`, '必填非空字符串')) {
        this.check(
          scene.background.startsWith('assets/backgrounds/'),
          `${path}.background`,
          '必须是 assets/backgrounds/ 下的相对路径',
        );
      }
    });
  }

  validateUi() {
    const root = this.config.ui;
    if (!this.validateFile(root, 'ui.json')) return;
    this.check(isPlainObject(root.texts), 'ui.json.texts', '必须是对象');
    if (isPlainObject(root.texts)) {
      this.check(Object.keys(root.texts).length > 0, 'ui.json.texts', '不能为空');
    }
  }

  validateBattleConfig() {
    const root = this.config.battleConfig;
    if (!this.validateFile(root, 'battle.config.json')) return;

    if (this.check(isPlainObject(root.turn), 'battle.config.json.turn', '必须是对象')) {
      this.check(root.turn.firstActor === 'boss', 'battle.config.json.turn.firstActor', '必须是 boss');
      this.check(root.turn.mode === 'alternate', 'battle.config.json.turn.mode', '必须是 alternate');
      if (this.check(isPlainObject(root.turn.bossOps), 'battle.config.json.turn.bossOps', '必须是对象')) {
        const { min, max } = root.turn.bossOps;
        this.check(isInteger(min) && isInteger(max) && min >= 1 && min <= max && max <= 5, 'battle.config.json.turn.bossOps', '必须是 1 ≤ min ≤ max ≤ 5');
      }
    }

    if (this.check(isPlainObject(root.player), 'battle.config.json.player', '必须是对象')) {
      this.check(isNumber(root.player.maxHp) && root.player.maxHp > 0, 'battle.config.json.player.maxHp', '必须是正数');
      this.check(isNumber(root.player.maxRage) && root.player.maxRage > 0, 'battle.config.json.player.maxRage', '必须是正数');

      if (this.check(isPlainObject(root.player.defaultLoadout), 'battle.config.json.player.defaultLoadout', '必须是对象')) {
        this.validateLoadout(root.player.defaultLoadout);
      }

      if (this.check(isPlainObject(root.player.zeroRage), 'battle.config.json.player.zeroRage', '必须是对象')) {
        this.check(isNumber(root.player.zeroRage.threshold), 'battle.config.json.player.zeroRage.threshold', '必须是数字');
        this.check(isInteger(root.player.zeroRage.refillPerTurn) && root.player.zeroRage.refillPerTurn >= 1, 'battle.config.json.player.zeroRage.refillPerTurn', '必须是 ≥ 1 的整数');
      }
    }

    if (this.check(isPlainObject(root.defense), 'battle.config.json.defense', '必须是对象')) {
      this.check(isNumber(root.defense.rageCost) && root.defense.rageCost >= 0, 'battle.config.json.defense.rageCost', '必须 ≥ 0');
      this.check(isNumber(root.defense.damageScale) && root.defense.damageScale >= 0 && root.defense.damageScale <= 1, 'battle.config.json.defense.damageScale', '必须在 0 ~ 1');
      this.check(isNumber(root.defense.bossRageCutScale) && root.defense.bossRageCutScale >= 0 && root.defense.bossRageCutScale <= 1, 'battle.config.json.defense.bossRageCutScale', '必须在 0 ~ 1');
      this.check(typeof root.defense.reflectOriginalCut === 'boolean', 'battle.config.json.defense.reflectOriginalCut', '必须是布尔值');
    }

    if (this.check(isPlainObject(root.switch), 'battle.config.json.switch', '必须是对象')) {
      this.check(isInteger(root.switch.cooldownOps) && root.switch.cooldownOps >= 0, 'battle.config.json.switch.cooldownOps', '必须是 ≥ 0 的整数');
      this.check(typeof root.switch.cooldownAcrossTurns === 'boolean', 'battle.config.json.switch.cooldownAcrossTurns', '必须是布尔值');
    }

    if (this.check(isPlainObject(root.queue), 'battle.config.json.queue', '必须是对象')) {
      this.check(root.queue.structure === 'lifo', 'battle.config.json.queue.structure', '必须是 lifo');
      this.check(isInteger(root.queue.undoCount) && root.queue.undoCount >= 1, 'battle.config.json.queue.undoCount', '必须是 ≥ 1 的整数');
    }

    if (this.check(isPlainObject(root.specialUses), 'battle.config.json.specialUses', '必须是对象')) {
      this.check(root.specialUses.shared === true, 'battle.config.json.specialUses.shared', '必须是 true');
      this.check(isInteger(root.specialUses.initial) && root.specialUses.initial >= 0, 'battle.config.json.specialUses.initial', '必须是 ≥ 0 的整数');
      this.check(root.specialUses.refill === 'none', 'battle.config.json.specialUses.refill', '必须是 none');
    }

    if (this.check(isPlainObject(root.combo), 'battle.config.json.combo', '必须是对象')) {
      this.check(root.combo.checkAt === 'preSettlement', 'battle.config.json.combo.checkAt', '必须是 preSettlement');
    }

    if (this.check(isPlainObject(root.panel), 'battle.config.json.panel', '必须是对象')) {
      this.validatePanel(root.panel);
    } else {
      return;
    }

    if (this.check(isPlainObject(root.display), 'battle.config.json.display', '必须是对象')) {
      this.check(root.display.decimals === 1, 'battle.config.json.display.decimals', '当前版本固定为 1');
    }
  }

  validateLoadout(loadout) {
    const path = 'battle.config.json.player.defaultLoadout';
    const normalIds = loadout.normalWeapons;
    const specialIds = loadout.specialWeapons;

    if (this.check(Array.isArray(normalIds) && normalIds.length === 2, `${path}.normalWeapons`, '必须是长度为 2 的数组')) {
      normalIds.forEach((weaponId, index) => {
        const weaponPath = `${path}.normalWeapons[${index}]`;
        if (!isNonEmptyString(weaponId)) {
          this.fail(weaponPath, '必须是非空字符串');
          return;
        }
        const weapon = this.weaponsById.get(weaponId);
        if (!weapon) {
          this.fail(weaponPath, `引用了不存在的武器：${weaponId}`);
        } else {
          this.check(weapon.category === 'normal', weaponPath, `必须是普通武器：${weaponId}`);
        }
      });
    }

    if (this.check(Array.isArray(specialIds) && specialIds.length === 2, `${path}.specialWeapons`, '必须是长度为 2 的数组')) {
      specialIds.forEach((weaponId, index) => {
        const weaponPath = `${path}.specialWeapons[${index}]`;
        if (!isNonEmptyString(weaponId)) {
          this.fail(weaponPath, '必须是非空字符串');
          return;
        }
        const weapon = this.weaponsById.get(weaponId);
        if (!weapon) {
          this.fail(weaponPath, `引用了不存在的武器：${weaponId}`);
        } else {
          this.check(weapon.category === 'special', weaponPath, `必须是特殊武器：${weaponId}`);
        }
      });
    }
  }

  validatePanel(panel) {
    const path = 'battle.config.json.panel';
    const keys = new Set();
    const registerKey = (key, keyPath) => {
      if (!isNonEmptyString(key)) {
        this.fail(keyPath, '必须是非空字符串');
        return;
      }
      if (keys.has(key)) this.fail(keyPath, `面板键位重复：${key}`);
      keys.add(key);
    };

    if (this.check(Array.isArray(panel.normalGroup) && panel.normalGroup.length === 2, `${path}.normalGroup`, '必须是长度为 2 的数组')) {
      panel.normalGroup.forEach((group, index) => {
        const groupPath = `${path}.normalGroup[${index}]`;
        this.check(group.slot === index + 1, `${groupPath}.slot`, `必须是 ${index + 1}`);
        if (this.check(isPlainObject(group.keys), `${groupPath}.keys`, '必须是对象')) {
          registerKey(group.keys.normal, `${groupPath}.keys.normal`);
          registerKey(group.keys.special, `${groupPath}.keys.special`);
        }
      });
    }

    if (this.check(Array.isArray(panel.specialGroup) && panel.specialGroup.length === 2, `${path}.specialGroup`, '必须是长度为 2 的数组')) {
      panel.specialGroup.forEach((group, index) => {
        const groupPath = `${path}.specialGroup[${index}]`;
        if (!isPlainObject(group)) {
          this.fail(groupPath, '必须是对象');
          return;
        }
        registerKey(group.key, `${groupPath}.key`);
        if (!isNonEmptyString(group.weaponId)) {
          this.fail(`${groupPath}.weaponId`, '必须是非空字符串');
          return;
        }
        const weapon = this.weaponsById.get(group.weaponId);
        if (!weapon) {
          this.fail(`${groupPath}.weaponId`, `引用了不存在的武器：${group.weaponId}`);
        } else {
          this.check(weapon.category === 'special', `${groupPath}.weaponId`, `必须是特殊武器：${group.weaponId}`);
        }
      });
    }

    if (this.check(Array.isArray(panel.itemGroup), `${path}.itemGroup`, '必须是数组')) {
      panel.itemGroup.forEach((group, index) => {
        const groupPath = `${path}.itemGroup[${index}]`;
        if (!isPlainObject(group)) {
          this.fail(groupPath, '必须是对象');
          return;
        }
        registerKey(group.key, `${groupPath}.key`);
        if (group.itemId !== null) {
          if (!isNonEmptyString(group.itemId)) {
            this.fail(`${groupPath}.itemId`, '必须是 null 或非空字符串');
          } else if (!this.itemsById.has(group.itemId)) {
            this.fail(`${groupPath}.itemId`, `引用了不存在的物品：${group.itemId}`);
          }
        }
      });
    }

    registerKey(panel.defendKey, `${path}.defendKey`);
    registerKey(panel.switchKey, `${path}.switchKey`);
    registerKey(panel.undoKey, `${path}.undoKey`);
    registerKey(panel.submitKey, `${path}.submitKey`);
  }
}

export function validateConfig(config) {
  const context = new ConfigValidator(config);
  const result = context.validate();
  validateCrossReferences(context);
  return result;
}

// 需要等所有索引建立后才能做的跨文件引用校验。
function validateCrossReferences(context) {
  const { config } = context;

  config.weapons.weapons.forEach((weapon, weaponIndex) => {
    const path = `weapons.json.weapons[${weaponIndex}]`;
    if (weapon.comboIds) {
      weapon.comboIds.forEach((comboId, comboIndex) => {
        if (!context.combosById.has(comboId)) {
          context.fail(`${path}.comboIds[${comboIndex}]`, `引用了不存在的连招：${comboId}`);
        }
      });
    }
    if (isPlainObject(weapon.attacks)) {
      for (const key of Object.keys(weapon.attacks)) {
        const attack = weapon.attacks[key];
        if (!isPlainObject(attack) || !Array.isArray(attack.effects)) continue;
        attack.effects.forEach((effectId, effectIndex) => {
          if (!context.effectIds.has(effectId)) {
            context.fail(`${path}.attacks.${key}.effects[${effectIndex}]`, `引用了不存在的效果：${effectId}`);
          }
        });
      }
    }
  });

  config.bosses.bosses.forEach((boss, bossIndex) => {
    const path = `bosses.json.bosses[${bossIndex}]`;
    if (Array.isArray(boss.actions)) {
      boss.actions.forEach((action, actionIndex) => {
        if (!isPlainObject(action) || !Array.isArray(action.effects)) return;
        action.effects.forEach((effectId, effectIndex) => {
          if (!context.effectIds.has(effectId)) {
            context.fail(`${path}.actions[${actionIndex}].effects[${effectIndex}]`, `引用了不存在的效果：${effectId}`);
          }
        });
      });
    }
    if (Array.isArray(boss.phases)) {
      boss.phases.forEach((phase, phaseIndex) => {
        if (!isPlainObject(phase) || !Array.isArray(phase.comboIds)) return;
        phase.comboIds.forEach((comboId, comboIndex) => {
          if (!context.combosById.has(comboId)) {
            context.fail(`${path}.phases[${phaseIndex}].comboIds[${comboIndex}]`, `引用了不存在的连招：${comboId}`);
          }
        });
      });
    }
  });

  config.combos.combos.forEach((combo, comboIndex) => {
    const path = `combos.json.combos[${comboIndex}]`;
    if (combo.scope === 'weapon' && isNonEmptyString(combo.weaponId) && !context.weaponsById.has(combo.weaponId)) {
      context.fail(`${path}.weaponId`, `引用了不存在的武器：${combo.weaponId}`);
    }
    if (combo.scope === 'boss' && isNonEmptyString(combo.bossId) && !context.bossesById.has(combo.bossId)) {
      context.fail(`${path}.bossId`, `引用了不存在的 Boss：${combo.bossId}`);
    }
    if (!Array.isArray(combo.pattern)) return;
    if (combo.owner === 'player') {
      combo.pattern.forEach((token, tokenIndex) => {
        if (!['normal', 'special'].includes(token)) {
          context.fail(`${path}.pattern[${tokenIndex}]`, `玩家连招 token 只能是 normal / special，实际为 ${token}`);
        }
      });
    } else if (combo.owner === 'boss' && isNonEmptyString(combo.bossId)) {
      const boss = context.bossesById.get(combo.bossId);
      const actionIds = new Set((boss.actions || []).map((action) => action.id));
      combo.pattern.forEach((token, tokenIndex) => {
        if (!actionIds.has(token)) {
          context.fail(`${path}.pattern[${tokenIndex}]`, `Boss 连招 token 必须是对应 Boss 的 actionId：${token}`);
        }
      });
    }
  });

  if (context.errors.length > 0) {
    const detail = context.errors.map((line) => `  - ${line}`).join('\n');
    const error = new Error(`配置校验失败（${context.errors.length} 处）：\n${detail}`);
    error.validationErrors = context.errors;
    throw error;
  }
}
