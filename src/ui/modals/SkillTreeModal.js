// 技能树浮层视觉：左上点数、右上返回；根节点向下分紫 / 青 / 红三枝。
// 只展示快照与发起点亮意图，前置校验与扣点由 meta 完成。

import { formatText } from './text.js';

export class SkillTreeModal {
  constructor({ texts }) {
    this.texts = texts;
  }

  mount(container, snapshot, api) {
    this.api = api;
    this.container = container;
    this.snapshot = snapshot;
    this.message = null;
    this.render();
  }

  render() {
    this.container.innerHTML = '';
    this.container.classList.add('skills-modal');

    const head = document.createElement('div');
    head.className = 'skills-modal__head';
    const points = document.createElement('span');
    points.className = 'skills-modal__points';
    points.textContent = formatText(this.texts, 'overlay.skills.points', {
      points: this.snapshot.points,
    });
    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'overlay-button';
    back.textContent = this.texts['overlay.skills.back'];
    back.addEventListener('click', () => this.api.close(null));
    head.append(points, back);
    this.container.appendChild(head);

    if (this.message) {
      const message = document.createElement('p');
      message.className = 'overlay-muted';
      message.textContent = this.message;
      this.container.appendChild(message);
    }

    const maxRow = Math.max(...this.snapshot.skills.map((skill) => skill.row));
    const maxCol = Math.max(...this.snapshot.skills.map((skill) => skill.col));
    const grid = document.createElement('div');
    grid.className = 'skills-modal__grid';
    grid.style.setProperty('--skill-rows', String(maxRow + 1));
    grid.style.setProperty('--skill-cols', String(maxCol + 1));

    const bySlot = new Map(
      this.snapshot.skills.map((skill) => [`${skill.row}:${skill.col}`, skill]),
    );

    for (let row = 0; row <= maxRow; row += 1) {
      for (let col = 0; col <= maxCol; col += 1) {
        const skill = bySlot.get(`${row}:${col}`);
        const cell = document.createElement('div');
        cell.className = 'skills-modal__cell';
        if (skill) cell.appendChild(this.buildNode(skill));
        grid.appendChild(cell);
      }
    }

    this.container.appendChild(grid);
  }

  buildNode(skill) {
    const owned = this.snapshot.unlockedSkillIds.includes(skill.id);
    const missing = skill.prerequisiteIds.some(
      (id) => !this.snapshot.unlockedSkillIds.includes(id),
    );
    const affordable = this.snapshot.points >= skill.cost;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = `skill-node skill-node--${skill.branch}`;
    button.classList.toggle('is-owned', owned);
    button.classList.toggle('is-locked', missing && !owned);
    button.disabled = owned || missing || !affordable;

    const name = document.createElement('strong');
    name.textContent = skill.name;
    const meta = document.createElement('span');
    meta.className = 'skill-node__meta';
    if (owned) meta.textContent = this.texts['overlay.skills.owned'];
    else if (missing) meta.textContent = this.texts['overlay.skills.locked'];
    else meta.textContent = formatText(this.texts, 'overlay.skills.need', { cost: skill.cost });
    const desc = document.createElement('span');
    desc.className = 'skill-node__desc';
    desc.textContent = skill.description;
    button.append(name, meta, desc);

    button.addEventListener('click', () => this.unlock(skill.id));
    return button;
  }

  unlock(skillId) {
    const result = this.api.ctx.unlockSkill(skillId);
    if (result.ok) {
      this.snapshot = result.snapshot;
      this.message = null;
    } else if (result.reason === 'points') {
      this.message = this.texts['overlay.skills.noPoints'];
    } else if (result.reason === 'locked') {
      this.message = this.texts['overlay.skills.locked'];
    }
    this.render();
  }
}
