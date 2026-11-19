// Buff 展示位：横向图标占位区，空态显示虚线提示。
// 本轮只做展示与说明，Buff 的施加与计时仍由后续 EffectSystem 负责。

import { attachTooltip } from './Tooltip.js';

export class BuffBar {
  constructor({ container, title, emptyText, emptyTooltip, texts }) {
    this.emptyText = emptyText;
    this.emptyTooltip = emptyTooltip;
    this.texts = texts;

    this.root = document.createElement('div');
    this.root.className = 'buff-bar';

    this.titleEl = document.createElement('span');
    this.titleEl.className = 'buff-bar__title';
    this.titleEl.textContent = title;

    this.list = document.createElement('div');
    this.list.className = 'buff-bar__list';

    this.root.append(this.titleEl, this.list);
    container.appendChild(this.root);
  }

  render(buffs = []) {
    this.list.innerHTML = '';

    if (buffs.length === 0) {
      const empty = document.createElement('span');
      empty.className = 'buff-bar__empty';
      empty.textContent = this.emptyText;
      empty.tabIndex = 0;
      attachTooltip(empty, () => this.emptyTooltip);
      this.list.appendChild(empty);
      return;
    }

    for (const buff of buffs) {
      const chip = document.createElement('div');
      chip.className = 'buff-chip';
      chip.tabIndex = 0;
      chip.textContent = (buff.name ?? '?').slice(0, 1);
      attachTooltip(chip, () => this.describe(buff));
      this.list.appendChild(chip);
    }
  }

  describe(buff) {
    const lines = [buff.name ?? ''];
    if (buff.description) lines.push(buff.description);
    if (typeof buff.remainingTurns === 'number') {
      lines.push(
        (this.texts['tooltip.buffRemaining'] ?? '剩余 {n} 回合').replace(
          '{n}',
          String(buff.remainingTurns),
        ),
      );
    }
    return lines.filter(Boolean).join('\n');
  }
}
