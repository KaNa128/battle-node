// 技能树浮层容器：从 HUD 头像进入。

import { SkillTreeModal } from '../../ui/modals/SkillTreeModal.js';

export function createSkillTreeOverlay({ texts }) {
  return {
    id: 'skills',
    title: texts['overlay.skills.title'],
    render(body, _params, api) {
      const modal = new SkillTreeModal({ texts });
      modal.mount(body, api.ctx.getSkillTreeSnapshot(), api);
      return modal;
    },
  };
}
