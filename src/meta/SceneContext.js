// 场景能力集合：场景只能通过这里读快照、发跳转、开关浮层。
// 不持有 DOM；所有 DOM 行为由 main.js 注入的渲染宿主实现。

export function createSceneContext({ manager, runController, config, createBattle, overlayManager }) {
  const openOverlay = (id, params) => overlayManager.open(id, params);

  return Object.freeze({
    config,
    texts: config.ui.texts,

    navigate: (sceneId, params, options) => manager.navigate(sceneId, params, options),
    back: (params) => manager.back(params),
    current: () => manager.current(),
    onChange: (listener) => manager.onChange(listener),

    hasRun: () => runController.hasRun(),
    getRunSnapshot: () => runController.getSnapshot(),
    getHudSnapshot: () => runController.getHudSnapshot(),
    getStatsSnapshot: () => runController.getStatsSnapshot(),
    getInventorySnapshot: () => ({
      ...runController.getInventorySnapshot(),
      inBattle: manager.current() === 'battle',
    }),
    getMapSnapshot: () => runController.getMapSnapshot(),
    completeNode: (nodeId) => runController.completeNode(nodeId),

    getEventSnapshot: (nodeId) => runController.getEventSnapshot(nodeId),
    resolveEventChoice: (nodeId, choiceId) => runController.resolveEventChoice(nodeId, choiceId),
    getChestSnapshot: (nodeId) => runController.getChestSnapshot(nodeId),
    openChest: (nodeId) => runController.openChest(nodeId),
    getShopSnapshot: () => runController.getShopSnapshot(),
    buyShopOffer: (columnId, offerId) => runController.buyShopOffer(columnId, offerId),
    refreshShopColumn: (columnId) => runController.refreshShopColumn(columnId),
    getSkillTreeSnapshot: () => runController.getSkillTreeSnapshot(),
    unlockSkill: (skillId) => runController.unlockSkill(skillId),
    enhanceWeapon: (weaponId) => runController.enhanceWeapon(weaponId),

    getBattleInput: (params) => runController.getBattleInput(params),
    applyBattleResult: (payload, meta) => runController.applyBattleResult(payload, meta),
    startRun: (options) => runController.startRun(options),
    abandonRun: () => runController.resetRun(),

    createBattle,
    openOverlay,
    closeOverlay: (result) => overlayManager.close(result),
    openInventory: () => openOverlay('inventory'),
    closeInventory: () => overlayManager.close(null),
  });
}
