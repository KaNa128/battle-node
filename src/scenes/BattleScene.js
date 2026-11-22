// 战斗场景：把现有 BattleView / BattlePresenter / BattleModule 包装成标准场景。
// 只通过 BattleModule 门面接入战斗；结果交回 RunController 后回到路线图。

import { BattleView } from '../ui/BattleView.js';
import { BattlePresenter } from '../ui/bridge/BattlePresenter.js';

export function createBattleScene() {
  let ctx;
  let view;
  let presenter = null;
  let module = null;
  let params = {};
  let resultHandled = false;
  let returnButton = null;

  function ensureReturnButton(card) {
    if (returnButton || !card) return;
    returnButton = document.createElement('button');
    returnButton.type = 'button';
    returnButton.className = 'result-retry';
    returnButton.setAttribute('data-battle-return', '');
    returnButton.textContent = ctx.texts['scene.battle.return'];
    returnButton.addEventListener('click', () => {
      ctx.navigate('map', { nodeId: params.nodeId });
    });
    card.appendChild(returnButton);
  }

  function handleResult(payload) {
    if (resultHandled) return;
    resultHandled = true;
    try {
      ctx.applyBattleResult(payload, { nodeId: params.nodeId });
    } catch (error) {
      console.error('战斗结果写回失败', error);
    }
    returnButton?.classList.remove('hidden');
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
        onInventory: (snapshot) => ctx.openInventory({ snapshot, inBattle: true }),
      });
      ensureReturnButton(view.overlay.querySelector('.result-card'));
    },

    init(nextParams = {}) {
      params = nextParams;
      resultHandled = false;

      view.overlay.classList.add('hidden');
      view.resultRetry.classList.add('hidden');
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
