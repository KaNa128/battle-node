// 商店浮层容器：读取商店会话快照并转交视觉组件。

import { ShopModal } from '../../ui/modals/ShopModal.js';

export function createShopOverlay({ config, texts }) {
  return {
    id: 'shop',
    title: texts['overlay.shop.title'],
    // 商店可随时离开，关闭即视为完成该节点。
    defaultCloseResult: { completed: true },
    render(body, _params, api) {
      const modal = new ShopModal({ config, texts });
      modal.mount(body, api.ctx.getShopSnapshot(), api);
      return modal;
    },
  };
}
