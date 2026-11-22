// 事件节点空壳：保留路由与返回能力，内容由 EventResolver 与 events.json 接入。

import { buildScenePage } from './scenePage.js';

export function createEventScene() {
  let ctx;
  let page;
  let nodeId = null;

  return {
    id: 'event',

    mount(container, context) {
      ctx = context;
      page = buildScenePage({
        container,
        title: ctx.texts['scene.event.title'],
        subtitle: ctx.texts['scene.event.placeholder'],
        actions: [
          {
            key: 'back',
            label: ctx.texts['scene.event.back'],
            variant: 'primary',
            onClick: () => ctx.navigate('map', { nodeId }),
          },
        ],
      });
    },

    init(params = {}) {
      nodeId = params.nodeId ?? null;
      page.setSubtitle(ctx.texts['scene.event.placeholder']);
    },

    leave() {},

    destroy() {
      page?.root.remove();
    },
  };
}
