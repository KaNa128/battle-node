// 战斗场景：把现有 BattleView / BattlePresenter / BattleModule 包装成标准场景。
// 只通过 BattleModule 门面接入战斗；结果交回 RunController 后按胜负分流。
// 失败停在结算页，点击「返回首页」才清档回首页；胜利回到路线图。

import { BattleView } from '../ui/BattleView.js';
import { BattlePresenter } from '../ui/bridge/BattlePresenter.js';

export function createBattleScene() {
  let ctx;
  let view;
  let presenter = null;
  let module = null;
  let params = {};
  let resultHandled = false;
  let result = null;
  let returnButton = null;

  function setupReturnButton() {
    if (returnButton || !view?.resultRetry) return;
    // 克隆节点以移除 BattleView 自带的「刷新页面」监听，改为按胜负分流。
    const button = view.resultRetry.cloneNode(false);
    view.resultRetry.replaceWith(button);
    view.resultRetry = button;
    button.classList.add('hidden');
    button.addEventListener('click', () => {
      if (result === 'lose') {
        ctx.abandonRun();
        ctx.navigate('home', {}, { replace: true });
        return;
      }
      ctx.navigate('map', { nodeId: params.nodeId });
    });
    returnButton = button;
  }

  function handleResult(payload) {
    if (resultHandled) return;
    resultHandled = true;
    result = payload.result;
    try {
      ctx.applyBattleResult(payload, {
        nodeId: params.nodeId,
        nodeType: params.nodeType,
      });
    } catch (error) {
      console.error('战斗结果写回失败', error);
    }

    if (returnButton) {
      returnButton.textContent =
        result === 'lose'
          ? ctx.texts['scene.battle.returnHome']
          : ctx.texts['scene.battle.returnMap'];
      returnButton.classList.remove('hidden');
    }
  }

  return {
    id: 'battle',

    mount(container, context) {
      ctx = context;
      view = new BattleView({
        root: container,
        config: ctx.config,
        onKey: (key) => presenter?.handleKey(key),
        // 战斗内背包统一走全局浮层，避免两套背包。
        onInventory: () => ctx.openOverlay('inventory'),
      });
      setupReturnButton();
    },

    init(nextParams = {}) {
      params = nextParams;
      resultHandled = false;
      result = null;

      view.overlay.classList.add('hidden');
      returnButton?.classList.add('hidden');

      module = ctx.createBattle();
      presenter = new BattlePresenter({ module, view, config: ctx.config });
      module.onResult((payload) => handleResult(payload));

      const input = ctx.getBattleInput({
        nodeId: params.nodeId,
        bossId: params.bossId,
        scaling: params.scaling,
      });
      presenter.start(input);
    },

    leave() {
      presenter?.destroy();
      module?.abort();
      presenter = null;
      module = null;
    },

    destroy() {
      view?.root.replaceChildren();
      presenter = null;
      module = null;
    },
  };
}
