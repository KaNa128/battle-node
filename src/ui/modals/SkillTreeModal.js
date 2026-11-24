// 技能树浮层视觉：左上点数、右上返回；根节点向下分紫 / 青 / 红三枝。
// 只展示快照与发起点亮意图，前置校验与扣点由 meta 完成。

import { formatText } from './text.js';

// 非根节点的最大偏移量：让技能点像黑神话那样松散排布，但每一次打开位置都相同。
const NODE_SHIFT_X = 20;
const NODE_SHIFT_Y = 10;

// 由技能 id 派生的稳定比例（-1 ~ 1），不用随机数，重开界面位置不会变。
function hashRatio(id, salt) {
  let hash = 0;
  const text = `${id}#${salt}`;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) | 0;
  }
  // 再做一次位混合：技能 id 只差一个数字时也能得到明显不同的偏移。
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 0x2c1b3c6d);
  hash ^= hash >>> 12;
  const ratio = ((hash >>> 0) % 1000) / 1000;
  return ratio * 2 - 1;
}

export class SkillTreeModal {
  constructor({ texts }) {
    this.texts = texts;
    this.observer = null;
  }

  mount(container, snapshot, api) {
    this.api = api;
    this.container = container;
    this.snapshot = snapshot;
    this.message = null;
    this.render();
  }

  destroy() {
    this.observer?.disconnect();
    this.observer = null;
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

    // 记住每个技能节点对应的按钮，连线需要按它们的实际位置与尺寸裁剪端点。
    this.nodeEls = new Map();

    for (let row = 0; row <= maxRow; row += 1) {
      for (let col = 0; col <= maxCol; col += 1) {
        const skill = bySlot.get(`${row}:${col}`);
        const cell = document.createElement('div');
        cell.className = 'skills-modal__cell';
        if (skill) {
          const node = this.buildNode(skill);
          this.nodeEls.set(skill.id, node);
          cell.appendChild(node);
        }
        grid.appendChild(cell);
      }
    }

    this.grid = grid;

    // 右侧留白：悬停技能点时在这里显示名称之外的费用、状态与描述。
    this.detail = document.createElement('aside');
    this.detail.className = 'skills-modal__detail';
    this.detail.setAttribute('aria-live', 'polite');

    const board = document.createElement('div');
    board.className = 'skills-modal__board';
    board.append(grid, this.detail);

    this.container.appendChild(board);
    this.observeResize();
    this.drawLinks();
  }

  showDetail(skill) {
    if (!this.detail) return;
    this.detail.replaceChildren();

    const name = document.createElement('strong');
    name.className = 'skills-detail__name';
    name.textContent = skill.name;

    const meta = document.createElement('span');
    meta.className = 'skills-detail__meta';
    meta.textContent = this.statusText(skill);

    const desc = document.createElement('span');
    desc.className = 'skills-detail__desc';
    desc.textContent = skill.description;

    this.detail.append(name, meta, desc);
  }

  hideDetail() {
    this.detail?.replaceChildren();
  }

  statusText(skill) {
    const owned = this.snapshot.unlockedSkillIds.includes(skill.id);
    const missing = skill.prerequisiteIds.some(
      (id) => !this.snapshot.unlockedSkillIds.includes(id),
    );
    if (owned) return this.texts['overlay.skills.owned'];
    if (missing) return this.texts['overlay.skills.locked'];
    return formatText(this.texts, 'overlay.skills.need', { cost: skill.cost });
  }

  observeResize() {
    if (typeof ResizeObserver === 'undefined' || !this.grid) return;
    if (!this.observer) {
      this.observer = new ResizeObserver(() => this.drawLinks());
    }
    this.observer.disconnect();
    this.observer.observe(this.grid);
  }

  // 按前置关系画连线：布局完全由 row / col 决定，不含随机。
  // 两端都按节点矩形裁到边框上，连线不会压到卡片文字。
  drawLinks() {
    const grid = this.grid;
    if (!grid || !this.nodeEls) return;

    const width = grid.scrollWidth;
    const height = grid.scrollHeight;
    if (!width || !height) return;

    // 用实际渲染矩形取位置：节点带 translate 偏移，offsetLeft 不含 transform。
    const gridRect = grid.getBoundingClientRect();
    const rects = new Map();
    for (const [id, el] of this.nodeEls) {
      const box = el.getBoundingClientRect();
      const x = box.left - gridRect.left + grid.scrollLeft;
      const y = box.top - gridRect.top + grid.scrollTop;
      const w = box.width;
      const h = box.height;
      rects.set(id, { x, y, w, h, cx: x + w / 2, cy: y + h / 2 });
    }

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'skills-modal__links');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');
    // 窄屏下网格可横向滚动，画布要覆盖整个可滚动区域。
    svg.style.width = `${width}px`;
    svg.style.height = `${height}px`;

    for (const skill of this.snapshot.skills) {
      const to = rects.get(skill.id);
      if (!to) continue;
      const owned = this.snapshot.unlockedSkillIds.includes(skill.id);
      for (const prereqId of skill.prerequisiteIds ?? []) {
        const from = rects.get(prereqId);
        if (!from) continue;

        const start = this.edgePoint(from, to);
        const end = this.edgePoint(to, from);
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', (start.x / width) * 100);
        line.setAttribute('y1', (start.y / height) * 100);
        line.setAttribute('x2', (end.x / width) * 100);
        line.setAttribute('y2', (end.y / height) * 100);
        line.setAttribute('vector-effect', 'non-scaling-stroke');
        line.setAttribute(
          'class',
          `skills-link skills-link--${skill.branch}${owned ? ' is-lit' : ''}`,
        );
        svg.appendChild(line);
      }
    }

    grid.querySelector('.skills-modal__links')?.remove();
    grid.insertBefore(svg, grid.firstChild);
  }

  // 圆形节点：连线端点落在圆周上，而不是外接矩形的边框。
  edgePoint(rect, toward) {
    const dx = toward.cx - rect.cx;
    const dy = toward.cy - rect.cy;
    const dist = Math.hypot(dx, dy);
    if (!dist) return { x: rect.cx, y: rect.cy };
    const radius = Math.min(rect.w, rect.h) / 2;
    return { x: rect.cx + (dx / dist) * radius, y: rect.cy + (dy / dist) * radius };
  }

  buildNode(skill) {
    const owned = this.snapshot.unlockedSkillIds.includes(skill.id);
    const missing = skill.prerequisiteIds.some(
      (id) => !this.snapshot.unlockedSkillIds.includes(id),
    );
    const affordable = this.snapshot.points >= skill.cost;
    const blocked = owned || missing || !affordable;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = `skill-node skill-node--${skill.branch}`;
    button.classList.toggle('is-owned', owned);
    button.classList.toggle('is-locked', missing && !owned);
    // 不用 disabled：禁用的按钮在部分浏览器收不到鼠标事件，会导致详情无法悬停查看。
    button.setAttribute('aria-disabled', String(blocked));

    // 根节点保持居中，其余节点做少量固定偏移，避免整整齐齐的网格感。
    const shift = this.nodeOffset(skill);
    button.style.transform = `translate(${shift.x.toFixed(1)}px, ${shift.y.toFixed(1)}px)`;

    const name = document.createElement('strong');
    name.textContent = skill.name;
    button.appendChild(name);

    button.addEventListener('pointerenter', () => this.showDetail(skill));
    button.addEventListener('pointerleave', () => this.hideDetail());
    button.addEventListener('focus', () => this.showDetail(skill));
    button.addEventListener('blur', () => this.hideDetail());
    button.addEventListener('click', () => {
      this.showDetail(skill);
      if (!blocked) this.unlock(skill.id);
    });
    return button;
  }

  // 根节点居中，其余节点按 id 生成固定偏移。
  nodeOffset(skill) {
    if (skill.branch === 'root') return { x: 0, y: 0 };
    return {
      x: hashRatio(skill.id, 'x') * NODE_SHIFT_X,
      y: hashRatio(skill.id, 'y') * NODE_SHIFT_Y,
    };
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
