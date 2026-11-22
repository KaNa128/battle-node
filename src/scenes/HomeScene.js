// 首页：新开一局、继续当前局、打开全局背包。
// P0 只提供入口，不实现存档读取；继续依赖内存中的 RunController。

import { buildScenePage } from './scenePage.js';

export function createHomeScene() {
  let ctx;
  let page;

  return {
    id: 'home',

    mount(container, context) {
      ctx = context;
      page = buildScenePage({
        container,
        title: ctx.texts['scene.home.title'],
        subtitle: ctx.texts['scene.home.subtitle'],
        actions: [
          {
            key: 'start',
            label: ctx.texts['scene.home.start'],
            variant: 'primary',
            onClick: () => {
              ctx.startRun();
              ctx.navigate('map', {});
            },
          },
          {
            key: 'continue',
            label: ctx.texts['scene.home.continue'],
            onClick: () => ctx.navigate('map', {}),
          },
          {
            key: 'inventory',
            label: ctx.texts['scene.home.inventory'],
            onClick: () => ctx.openInventory(),
          },
        ],
      });
    },

    init() {
      const snapshot = ctx.getRunSnapshot();
      page.setVisible('continue', snapshot.floor > 1);
      page.setSubtitle(
        ctx.texts['scene.map.floor'].replace('{floor}', String(snapshot.floor)),
      );
    },

    leave() {},

    destroy() {
      page?.root.remove();
    },
  };
}
