// 序列条：玩家指令队列 / Boss 意图，以方块图标 + 序号角标展示。
// 悬停显示 Tooltip，结算回放时当前操作高亮闪烁。

import { attachTooltip, hideTooltip } from './Tooltip.js';

export class SequenceBar {
  constructor({ container, title, emptyText }) {
    this.emptyText = emptyText;

    this.root = document.createElement('div');
    this.root.className = 'sequence';

    this.title = document.createElement('div');
    this.title.className = 'sequence__title';
    this.title.textContent = title;

    this.list = document.createElement('div');
    this.list.className = 'sequence__list';

    this.root.append(this.title, this.list);
    container.appendChild(this.root);
  }

  render(items = []) {
    hideTooltip();
    this.list.innerHTML = '';
    if (items.length === 0) {
      const empty = document.createElement('span');
      empty.className = 'sequence__empty';
      empty.textContent = this.emptyText;
      this.list.appendChild(empty);
      return;
    }

    for (const item of items) {
      const chip = document.createElement('div');
      chip.className = `sequence-chip sequence-chip--${item.tone || 'plain'}`;
      chip.tabIndex = 0;
      if (item.opId) chip.dataset.opid = item.opId;

      const icon = document.createElement('span');
      icon.className = 'sequence-chip__icon';
      icon.textContent = item.glyph || '·';

      const seq = document.createElement('span');
      seq.className = 'sequence-chip__seq';
      seq.textContent = String(item.seq);

      chip.append(icon, seq);
      if (item.tooltip) attachTooltip(chip, () => item.tooltip);
      this.list.appendChild(chip);
    }
  }

  // 结算回放时闪烁当前正在执行的操作图标。
  highlight(opId) {
    if (!opId) return;
    for (const chip of this.list.querySelectorAll('.sequence-chip')) {
      chip.classList.toggle('is-current', chip.dataset.opid === opId);
    }
  }
}
