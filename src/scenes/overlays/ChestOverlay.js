// 宝箱浮层容器：读取宝箱快照并转交视觉组件。

import { ChestModal } from '../../ui/modals/ChestModal.js';

export function createChestOverlay({ config, texts }) {
  return {
    id: 'chest',
    title: texts['overlay.chest.title'],
    defaultCloseResult: null,
    render(body, params, api) {
      const modal = new ChestModal({ config, texts });
      modal.mount(body, api.ctx.getChestSnapshot(params.nodeId), api);
      return modal;
    },
  };
}
