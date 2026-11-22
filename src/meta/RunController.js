// 一局生命周期的唯一写入口：持有 RunState 与路线图，负责战斗结果、节点、事件、宝箱、商店、技能树结算。
// 当前为骨架版本：存档接入 SaveManager 前只保留内存态，结算逻辑在 P4 按 Resolver 拆分。

import { RunState, weaponEnhanceCategory } from '../state/RunState.js';
import { deepClone } from '../utils/deepClone.js';
import { generateMap } from './MapGenerator.js';
import { computeStats } from './StatsCalculator.js';

function seedFromString(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  }
  return hash >>> 0;
}

export class RunController {
  constructor({ config, seed = 20261118 }) {
    this.config = config;
    this.seed = seed;
    this.floor = 1;
    this.floorSeed = seedFromString(`${seed}:1`);
    this.nodeId = null;
    this.runState = null;
    this.map = null;
    this.shopSession = null;
    this.openedChests = new Set();
  }

  startRun({ seed, floor = 1 } = {}) {
    if (seed !== undefined) this.seed = seed;
    this.floor = Math.max(1, floor);
    this.floorSeed = seedFromString(`${this.seed}:${this.floor}`);
    this.nodeId = null;
    this.runState = new RunState({ config: this.config });
    this.map = generateMap({ floor: this.floor, seed: this.floorSeed, config: this.config });
    this.shopSession = null;
    this.openedChests.clear();
    return this.getSnapshot();
  }

  resetRun() {
    this.runState = null;
    this.map = null;
    this.nodeId = null;
    this.floor = 1;
    this.floorSeed = seedFromString(`${this.seed}:1`);
    this.shopSession = null;
    this.openedChests.clear();
  }

  hasRun() {
    return Boolean(this.runState);
  }

  ensureRun() {
    if (!this.runState) this.startRun();
    return this.runState;
  }

  ensureMap() {
    this.ensureRun();
    if (!this.map) {
      this.map = generateMap({ floor: this.floor, seed: this.floorSeed, config: this.config });
    }
    return this.map;
  }

  findNode(nodeId) {
    if (!nodeId) return null;
    return this.ensureMap().nodes.find((node) => node.id === nodeId) ?? null;
  }

  // ---- 快照 ---------------------------------------------------------

  getSnapshot() {
    const run = this.ensureRun();
    this.ensureMap();
    return deepClone({
      seed: this.seed,
      floor: this.floor,
      nodeId: this.nodeId,
      hp: run.hp,
      maxHp: run.maxHp,
      gold: run.gold,
      skillPoints: run.skillPoints,
      normalWeapons: run.normalWeapons,
      specialWeapons: run.specialWeapons,
      items: { ...run.items },
      enhanceCounts: { ...run.enhanceCounts },
    });
  }

  getHudSnapshot() {
    const run = this.ensureRun();
    return deepClone({
      floor: this.floor,
      hp: run.hp,
      maxHp: run.maxHp,
      maxRage: this.config.battleConfig.player.maxRage,
      gold: run.gold,
      skillPoints: run.skillPoints,
      enhanceCounts: { ...run.enhanceCounts },
    });
  }

  getStatsSnapshot() {
    return computeStats({ config: this.config, runState: this.ensureRun() });
  }

  getInventorySnapshot() {
    const run = this.ensureRun();
    const weaponById = new Map(this.config.weapons.weapons.map((weapon) => [weapon.id, weapon]));
    return {
      equipment: {
        normalWeapons: [...run.normalWeapons],
        specialWeapons: [...run.specialWeapons],
      },
      weapons: run.ownedWeaponIds
        .map((weaponId) => weaponById.get(weaponId))
        .filter(Boolean)
        .map((weapon) => ({
          id: weapon.id,
          name: weapon.name,
          category: weapon.category,
          attacks: deepClone(weapon.attacks),
          enhanceLevel: run.getEnhanceLevel(weapon.id),
        })),
      items: this.config.items.items.map((item) => ({
        id: item.id,
        name: item.name,
        heal: item.heal,
        usesPerBattle: item.usesPerBattle,
        remaining: run.getItemRemaining(item.id),
        enhanceLevel: run.getEnhanceLevel(item.id),
      })),
      enhanceCounts: { ...run.enhanceCounts },
      enhanceMax: this.config.upgrades.enhancement.maxLevel,
      gold: run.gold,
      stats: this.getStatsSnapshot(),
    };
  }

  getMapSnapshot() {
    const map = this.ensureMap();
    return deepClone({
      floor: this.floor,
      seed: this.floorSeed,
      rows: map.rows,
      nodes: map.nodes,
      currentNodeId: this.nodeId,
      completedNodeIds: map.completedNodeIds,
    });
  }

  getBattleInput(overrides = {}) {
    const run = this.ensureRun();
    const bossId = overrides.bossId ?? this.config.bosses.bosses[0]?.id;
    if (!bossId) throw new Error('RunController.getBattleInput: 配置中没有任何 Boss');

    if (overrides.nodeId !== undefined) this.nodeId = overrides.nodeId;
    return {
      bossId,
      scaling: overrides.scaling ?? { floor: this.floor },
      playerSavedData: run.toSavedData(),
    };
  }

  applyBattleResult(payload, meta = {}) {
    if (!payload?.playerSavedData) {
      throw new Error('RunController.applyBattleResult: 缺少 playerSavedData');
    }
    const previous = this.getNodeType(meta.nodeId);
    this.runState = new RunState({ config: this.config, savedData: payload.playerSavedData });

    if (meta.nodeId !== undefined) this.nodeId = meta.nodeId;
    if (payload.result === 'win') {
      const nodeType = meta.nodeType ?? previous;
      // 调试入口的伪节点不在路线图中，只写回玩家状态，不推进地图。
      if (meta.nodeId && this.findNode(meta.nodeId)) this.completeNode(meta.nodeId);
      // 普通战斗 +1 技能点，Boss 战 +3。
      this.runState.skillPoints += nodeType === 'boss' ? 3 : 1;
    }
    return this.getSnapshot();
  }

  // ---- 路线图 -------------------------------------------------------

  getNodeType(nodeId) {
    return this.findNode(nodeId)?.type ?? null;
  }

  completeNode(nodeId) {
    const map = this.ensureMap();
    const node = map.nodes.find((entry) => entry.id === nodeId);
    if (!node) throw new Error(`RunController.completeNode: 未知节点 ${nodeId}`);

    if (!map.completedNodeIds.includes(nodeId)) map.completedNodeIds.push(nodeId);
    this.nodeId = nodeId;
    this.shopSession = null;

    // 只有 Boss 节点完成才进入下一层。
    if (node.type === 'boss') this.advanceFloor();
    return this.getSnapshot();
  }

  advanceFloor() {
    this.floor += 1;
    this.floorSeed = seedFromString(`${this.seed}:${this.floor}`);
    this.nodeId = null;
    this.shopSession = null;
    this.map = generateMap({ floor: this.floor, seed: this.floorSeed, config: this.config });
  }

  // ---- 事件 / 宝箱 ---------------------------------------------------

  pickEntry(collectionKey, nodeId) {
    const list = this.config[collectionKey]?.[collectionKey === 'events' ? 'events' : 'chests'];
    if (!Array.isArray(list) || list.length === 0) {
      throw new Error(`RunController: config/${collectionKey}.json 没有可用条目`);
    }
    const index = seedFromString(`${this.floorSeed}:${nodeId}`) % list.length;
    return list[index];
  }

  getEventSnapshot(nodeId) {
    return deepClone({ nodeId, event: this.pickEntry('events', nodeId) });
  }

  resolveEventChoice(nodeId, choiceId) {
    const event = this.pickEntry('events', nodeId);
    const choice = event.choices.find((entry) => entry.id === choiceId);
    if (!choice) throw new Error(`RunController.resolveEventChoice: 未知选项 ${choiceId}`);
    return {
      nodeId,
      choiceId,
      result: choice.result,
      effects: this.applyEffects(choice.effects ?? []),
    };
  }

  getChestSnapshot(nodeId) {
    return deepClone({
      nodeId,
      chest: this.pickEntry('chests', nodeId),
      opened: this.openedChests.has(nodeId),
    });
  }

  openChest(nodeId) {
    if (this.openedChests.has(nodeId)) return { nodeId, rewards: [], alreadyOpened: true };
    const chest = this.pickEntry('chests', nodeId);
    const rewards = this.applyEffects(chest.rewards ?? []);
    this.openedChests.add(nodeId);
    return { nodeId, rewards, alreadyOpened: false };
  }

  // 效果统一走这里，保证 UI 只拿到结构化结果，不自行计算。
  applyEffects(effects) {
    const run = this.ensureRun();
    const applied = [];
    for (const effect of effects) {
      const value = effect.value ?? 0;
      switch (effect.kind) {
        case 'gold':
          run.gold = Math.max(0, run.gold + value);
          break;
        case 'hp':
          run.hp = Math.min(run.maxHp, run.hp + value);
          break;
        case 'skillPoint':
          run.skillPoints = Math.max(0, run.skillPoints + value);
          break;
        case 'enhanceCount':
          run.addEnhanceCount(effect.enhanceCategory, value);
          break;
        case 'item':
          run.addItem(effect.itemId, value);
          break;
        default:
          throw new Error(`RunController.applyEffects: 未知效果类型 ${effect.kind}`);
      }
      applied.push(deepClone(effect));
    }
    return applied;
  }

  // ---- 商店 ---------------------------------------------------------

  ensureShopSession() {
    if (!this.shopSession) this.shopSession = { refreshCounts: {}, purchased: {} };
    return this.shopSession;
  }

  offerKey(columnId, offerId) {
    return `${columnId}::${offerId}`;
  }

  getShopSnapshot() {
    const run = this.ensureRun();
    const session = this.ensureShopSession();
    const columns = this.config.shop.columns.map((column) => {
      const refreshCount = session.refreshCounts[column.id] ?? 0;
      return {
        id: column.id,
        titleKey: column.titleKey,
        refreshCount,
        refreshCost: column.refresh.baseCost + column.refresh.costStep * refreshCount,
        offers: column.offers.map((offer) => ({
          ...deepClone(offer),
          purchased: Boolean(session.purchased[this.offerKey(column.id, offer.id)]),
          owned: offer.kind === 'weapon' && run.ownedWeaponIds.includes(offer.weaponId),
        })),
      };
    });
    return { gold: run.gold, columns };
  }

  buyShopOffer(columnId, offerId) {
    const run = this.ensureRun();
    const column = this.config.shop.columns.find((entry) => entry.id === columnId);
    const offer = column?.offers.find((entry) => entry.id === offerId);
    if (!column || !offer) throw new Error(`RunController.buyShopOffer: 未知道具 ${columnId}/${offerId}`);

    const session = this.ensureShopSession();
    const key = this.offerKey(columnId, offerId);
    if (session.purchased[key]) return { ok: false, reason: 'purchased' };

    if (offer.kind === 'weapon' && run.ownedWeaponIds.includes(offer.weaponId)) {
      return { ok: false, reason: 'owned' };
    }
    if (run.gold < offer.price) return { ok: false, reason: 'gold' };

    run.gold -= offer.price;
    this.applyOffer(offer);
    session.purchased[key] = true;
    return { ok: true, snapshot: this.getShopSnapshot() };
  }

  applyOffer(offer) {
    const run = this.ensureRun();
    if (offer.kind === 'weapon') {
      if (!run.ownedWeaponIds.includes(offer.weaponId)) run.ownedWeaponIds.push(offer.weaponId);
      return;
    }
    if (offer.kind === 'item') {
      run.addItem(offer.itemId, 1);
      return;
    }
    if (offer.kind === 'enhance') {
      run.addEnhanceCount(offer.enhanceCategory, offer.amount ?? 1);
      return;
    }
    throw new Error(`RunController.applyOffer: 未知商品类型 ${offer.kind}`);
  }

  refreshShopColumn(columnId) {
    const run = this.ensureRun();
    const session = this.ensureShopSession();
    const column = this.config.shop.columns.find((entry) => entry.id === columnId);
    if (!column) throw new Error(`RunController.refreshShopColumn: 未知栏位 ${columnId}`);

    const refreshCount = session.refreshCounts[columnId] ?? 0;
    const cost = column.refresh.baseCost + column.refresh.costStep * refreshCount;
    if (run.gold < cost) return { ok: false, reason: 'gold' };

    run.gold -= cost;
    session.refreshCounts[columnId] = refreshCount + 1;
    for (const offer of column.offers) {
      delete session.purchased[this.offerKey(columnId, offer.id)];
    }
    return { ok: true, snapshot: this.getShopSnapshot() };
  }

  // ---- 技能树 -------------------------------------------------------

  getSkillTreeSnapshot() {
    const run = this.ensureRun();
    return deepClone({
      points: run.skillPoints,
      unlockedSkillIds: run.unlockedSkillIds,
      skills: this.config.skills.skills,
    });
  }

  unlockSkill(skillId) {
    const run = this.ensureRun();
    const skill = this.config.skills.skills.find((entry) => entry.id === skillId);
    if (!skill) throw new Error(`RunController.unlockSkill: 未知技能 ${skillId}`);
    if (run.unlockedSkillIds.includes(skillId)) return { ok: false, reason: 'owned' };

    const missing = skill.prerequisiteIds.filter(
      (prerequisiteId) => !run.unlockedSkillIds.includes(prerequisiteId),
    );
    if (missing.length > 0) return { ok: false, reason: 'locked', missing };
    if (run.skillPoints < skill.cost) return { ok: false, reason: 'points' };

    run.skillPoints -= skill.cost;
    run.unlockedSkillIds.push(skillId);
    return { ok: true, snapshot: this.getSkillTreeSnapshot() };
  }

  // ---- 背包装备强化 ---------------------------------------------------

  enhanceWeapon(weaponId) {
    const run = this.ensureRun();
    const weapon = this.config.weapons.weapons.find((entry) => entry.id === weaponId);
    if (!weapon) return { ok: false, reason: 'unknown' };
    if (!run.ownedWeaponIds.includes(weaponId)) return { ok: false, reason: 'notOwned' };

    const maxLevel = this.config.upgrades.enhancement.maxLevel;
    if (run.getEnhanceLevel(weaponId) >= maxLevel) return { ok: false, reason: 'max' };

    const category = weaponEnhanceCategory(weapon);
    if (!run.consumeEnhanceCount(category)) return { ok: false, reason: 'count' };

    run.addEnhanceLevel(weaponId, 1);
    return { ok: true, snapshot: this.getInventorySnapshot() };
  }
}
