// 血条 / 杀气条：数值固定 1 位小数，宽度过渡表现削减。

import { toFixed1, percent } from '../utils/math.js';

export class StatusBars {
  constructor({ container, labels }) {
    this.maxHp = 1;
    this.maxRage = 1;

    this.root = document.createElement('div');
    this.root.className = 'status-bars';

    const hp = this.createRow('hp', labels.hp);
    const rage = this.createRow('rage', labels.rage);
    this.root.append(hp.row, rage.row);
    container.appendChild(this.root);

    this.hpFill = hp.fill;
    this.hpText = hp.text;
    this.rageFill = rage.fill;
    this.rageText = rage.text;
  }

  createRow(kind, label) {
    const row = document.createElement('div');
    row.className = `stat stat--${kind}`;

    const name = document.createElement('span');
    name.className = 'stat__label';
    name.textContent = label;

    const track = document.createElement('div');
    track.className = 'stat__track';

    const fill = document.createElement('div');
    fill.className = `stat__fill stat__fill--${kind}`;
    track.appendChild(fill);

    const text = document.createElement('span');
    text.className = 'stat__value';

    row.append(name, track, text);
    return { row, fill, text };
  }

  render({ hp, maxHp, rage, maxRage }) {
    this.maxHp = Math.max(1, maxHp);
    this.maxRage = Math.max(1, maxRage);
    this.setHp(hp);
    this.setRage(rage);
  }

  setHp(value) {
    this.hpFill.style.width = `${percent(value, this.maxHp) * 100}%`;
    this.hpText.textContent = `${toFixed1(value)} / ${toFixed1(this.maxHp)}`;
  }

  setRage(value) {
    this.rageFill.style.width = `${percent(value, this.maxRage) * 100}%`;
    this.rageText.textContent = `${toFixed1(value)} / ${toFixed1(this.maxRage)}`;
  }
}
