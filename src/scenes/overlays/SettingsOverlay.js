// 设置浮层容器：仅写 UI 偏好。

import { SettingsModal } from '../../ui/modals/SettingsModal.js';

export function createSettingsOverlay({ texts }) {
  return {
    id: 'settings',
    title: texts['overlay.settings.title'],
    render(body, _params, api) {
      const modal = new SettingsModal({ texts });
      modal.mount(body, null, api);
      return modal;
    },
  };
}
