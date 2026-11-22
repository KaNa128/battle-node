// 背包浮层容器：全局唯一背包，战斗内外共用。

import { InventoryModal } from '../../ui/modals/InventoryModal.js';

export function createInventoryOverlay({ texts }) {
  return {
    id: 'inventory',
    title: texts['inventory.title'],
    render(body, _params, api) {
      const modal = new InventoryModal({ texts });
      modal.mount(body, api.ctx.getInventorySnapshot(), api);
      return modal;
    },
  };
}
