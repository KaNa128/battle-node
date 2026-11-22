// 路线图：P0 用三个节点按钮验证路由与转场，正式地图由 MapGenerator 接管。

import { buildScenePage } from './scenePage.js';

export function createMapScene() {
  let ctx;
  let page;
  let floor = 1;

  const nodeId = (kind) => `floor_${floor}_${kind}`;

  return {
    id: 'map',

    mount(container, context) {
      ctx = context;
      page = buildScenePage({
        container,
        title: ctx.texts['scene.map.title'],
        subtitle: '',
        actions: [
          {
            key: 'battle',
            label: ctx.texts['scene.map.battle'],
            variant: 'primary',
            onClick: () => ctx.navigate('battle', { nodeId: nodeId('battle') }),
          },
          {
            key: 'event',
            label: ctx.texts['scene.map.event'],
            onClick: () => ctx.navigate('event', { nodeId: nodeId('event') }),
          },
          {
            key: 'chest',
            label: ctx.texts['scene.map.chest'],
            onClick: () => ctx.navigate('chest', { nodeId: nodeId('chest') }),
          },
          {
            key: 'home',
            label: ctx.texts['scene.map.home'],
            onClick: () => ctx.navigate('home', {}, { replace: true }),
          },
        ],
      });
    },

    init() {
      floor = ctx.getRunSnapshot().floor;
      page.setSubtitle(ctx.texts['scene.map.floor'].replace('{floor}', String(floor)));
    },

    leave() {},

    destroy() {
      page?.root.remove();
    },
  };
}
