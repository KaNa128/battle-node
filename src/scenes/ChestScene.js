// 宝箱节点空壳：保留路由与返回能力，奖励由 ChestResolver 与 chests.json 接入。

import { buildScenePage } from './scenePage.js';

export function createChestScene() {
  let ctx;
  let page;
  let nodeId = null;

  return {
    id: 'chest',

    mount(container, context) {
      ctx = context;
      page = buildScenePage({
        container,
        title: ctx.texts['scene.chest.title'],
        subtitle: ctx.texts['scene.chest.placeholder'],
        actions: [
          {
            key: 'back',
            label: ctx.texts['scene.chest.back'],
            variant: 'primary',
            onClick: () => ctx.navigate('map', { nodeId }),
          },
        ],
      });
    },

    init(params = {}) {
      nodeId = params.nodeId ?? null;
      page.setSubtitle(ctx.texts['scene.chest.placeholder']);
    },

    leave() {},

    destroy() {
      page?.root.remove();
    },
  };
}
