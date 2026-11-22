// 事件浮层容器：读取事件快照并转交视觉组件。

import { EventModal } from '../../ui/modals/EventModal.js';

export function createEventOverlay({ config, texts }) {
  return {
    id: 'event',
    title: texts['overlay.event.title'],
    defaultCloseResult: null,
    render(body, params, api) {
      const modal = new EventModal({ config, texts });
      modal.mount(body, api.ctx.getEventSnapshot(params.nodeId), api);
      return modal;
    },
  };
}
