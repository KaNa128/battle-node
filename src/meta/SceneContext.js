// 场景能力集合：场景只能通过这里读快照、发跳转、请求全局背包。
// 不持有 DOM；所有 DOM 行为由 main.js 注入的渲染宿主实现。

export function createSceneContext({
  manager,
  runController,
  config,
  createBattle,
  openInventory,
  closeInventory,
}) {
  return Object.freeze({
    config,
    texts: config.ui.texts,

    navigate: (sceneId, params, options) => manager.navigate(sceneId, params, options),
    back: (params) => manager.back(params),
    current: () => manager.current(),
    onChange: (listener) => manager.onChange(listener),

    getRunSnapshot: () => runController.getSnapshot(),
    getInventorySnapshot: () => runController.getInventorySnapshot(),
    getBattleInput: (params) => runController.getBattleInput(params),
    applyBattleResult: (payload) => runController.applyBattleResult(payload),
    startRun: (options) => runController.startRun(options),

    createBattle,
    openInventory,
    closeInventory,
  });
}
