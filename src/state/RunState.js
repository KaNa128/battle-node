// RunState：局内持久化状态（血量、金币、装备、强化、技能点、药品剩余次数）。
// 与单场 BattleState 严格分离，不写入回合/意图等临时数据。

import { deepClone } from '../utils/deepClone.js';

const REQUIRED_FIELDS = ['hp', 'maxHp', 'normalWeapons', 'specialWeapons', 'items'];

// 武器类别 → 强化次数类别（配置 categories[].id 使用同一套命名）。
export function weaponEnhanceCategory(weapon) {
  return weapon?.category === 'special' ? 'specialWeapon' : 'normalWeapon';
}

export class RunState {
  constructor({ config, savedData }) {
    this.maxHp = config.battleConfig.player.maxHp;
    this.defaultEnhanceCounts = defaultEnhanceCounts(config);

    if (savedData) {
      this.hydrate(savedData, config);
    } else {
      const loadout = config.battleConfig.player.defaultLoadout;
      this.hp = this.maxHp;
      this.normalWeapons = [...loadout.normalWeapons];
      this.specialWeapons = [...loadout.specialWeapons];
      this.ownedWeaponIds = [...loadout.normalWeapons, ...loadout.specialWeapons];
      this.items = {};
      for (const item of config.items.items) {
        this.items[item.id] = item.usesPerBattle;
      }
      this.gold = 0;
      this.skillPoints = 0;
      this.unlockedSkillIds = [];
      this.enhanceCounts = { ...this.defaultEnhanceCounts };
      this.enhanceLevels = {};
    }
  }

  // 外部传入的存档字段缺失或结构错误时立即报错，不做静默补全。
  // 外围新增字段允许缺省：旧存档缺字段时补安全初始值，结构兼容由 saveVersion 负责。
  hydrate(savedData, config) {
    if (savedData === null || typeof savedData !== 'object' || Array.isArray(savedData)) {
      throw new Error('playerSavedData: 必须是对象');
    }
    for (const field of REQUIRED_FIELDS) {
      if (!(field in savedData)) {
        throw new Error(`playerSavedData.${field}: 缺少必填字段`);
      }
    }
    if (typeof savedData.hp !== 'number' || !Number.isFinite(savedData.hp)) {
      throw new Error('playerSavedData.hp: 必须是数字');
    }
    if (!Array.isArray(savedData.normalWeapons) || savedData.normalWeapons.length !== 2) {
      throw new Error('playerSavedData.normalWeapons: 必须是长度为 2 的数组');
    }
    if (!Array.isArray(savedData.specialWeapons) || savedData.specialWeapons.length !== 2) {
      throw new Error('playerSavedData.specialWeapons: 必须是长度为 2 的数组');
    }
    if (savedData.items === null || typeof savedData.items !== 'object' || Array.isArray(savedData.items)) {
      throw new Error('playerSavedData.items: 必须是对象');
    }

    this.hp = savedData.hp;
    this.maxHp = typeof savedData.maxHp === 'number' ? savedData.maxHp : this.maxHp;
    this.normalWeapons = [...savedData.normalWeapons];
    this.specialWeapons = [...savedData.specialWeapons];
    this.items = { ...savedData.items };
    this.gold = Number.isInteger(savedData.gold) ? savedData.gold : 0;
    this.skillPoints = Number.isInteger(savedData.skillPoints) ? savedData.skillPoints : 0;
    this.unlockedSkillIds = Array.isArray(savedData.unlockedSkillIds)
      ? [...savedData.unlockedSkillIds]
      : [];
    this.ownedWeaponIds = Array.isArray(savedData.ownedWeaponIds)
      ? [...savedData.ownedWeaponIds]
      : [...this.normalWeapons, ...this.specialWeapons];
    this.enhanceCounts = {
      ...this.defaultEnhanceCounts,
      ...(savedData.enhanceCounts && typeof savedData.enhanceCounts === 'object'
        ? savedData.enhanceCounts
        : {}),
    };
    this.enhanceLevels =
      savedData.enhanceLevels && typeof savedData.enhanceLevels === 'object'
        ? { ...savedData.enhanceLevels }
        : {};

    // 装备必须真实存在且类别匹配，避免 UI 拿到未知武器。
    const weaponIds = new Set(config.weapons.weapons.map((weapon) => weapon.id));
    for (const weaponId of this.normalWeapons) {
      if (!weaponIds.has(weaponId)) {
        throw new Error(`playerSavedData.normalWeapons: 未知武器 ${weaponId}`);
      }
    }
    for (const weaponId of this.specialWeapons) {
      if (!weaponIds.has(weaponId)) {
        throw new Error(`playerSavedData.specialWeapons: 未知武器 ${weaponId}`);
      }
    }
  }

  getItemRemaining(itemId) {
    return this.items[itemId] ?? 0;
  }

  consumeItem(itemId) {
    if (this.getItemRemaining(itemId) <= 0) return false;
    this.items[itemId] -= 1;
    return true;
  }

  addItem(itemId, amount = 1) {
    this.items[itemId] = this.getItemRemaining(itemId) + amount;
  }

  getEnhanceLevel(equipmentId) {
    return this.enhanceLevels[equipmentId] ?? 0;
  }

  addEnhanceLevel(equipmentId, amount = 1) {
    this.enhanceLevels[equipmentId] = this.getEnhanceLevel(equipmentId) + amount;
  }

  getEnhanceCount(category) {
    return this.enhanceCounts[category] ?? 0;
  }

  addEnhanceCount(category, amount = 1) {
    this.enhanceCounts[category] = this.getEnhanceCount(category) + amount;
  }

  consumeEnhanceCount(category) {
    if (this.getEnhanceCount(category) <= 0) return false;
    this.enhanceCounts[category] -= 1;
    return true;
  }

  toSavedData() {
    return deepClone({
      hp: this.hp,
      maxHp: this.maxHp,
      normalWeapons: this.normalWeapons,
      specialWeapons: this.specialWeapons,
      items: this.items,
      gold: this.gold,
      skillPoints: this.skillPoints,
      unlockedSkillIds: this.unlockedSkillIds,
      ownedWeaponIds: this.ownedWeaponIds,
      enhanceCounts: this.enhanceCounts,
      enhanceLevels: this.enhanceLevels,
    });
  }
}

function defaultEnhanceCounts(config) {
  const categories = config.upgrades?.enhancement?.categories ?? [];
  return Object.fromEntries(categories.map((category) => [category.id, category.initialCount ?? 0]));
}
