// 路线图棋盘：自下而上的树状布局 + SVG 连线，底部固定起始节点、顶部固定 Boss。
// 只负责渲染与点击意图；节点是否连通由调用方注入 isAvailable，避免复制导航规则。

const TYPE_GLYPH_KEY = {
  battle: 'scene.map.node.battle',
  event: 'scene.map.node.event',
  chest: 'scene.map.node.chest',
  shop: 'scene.map.node.shop',
  boss: 'scene.map.node.boss',
};

// 圆形象征战斗，方形象征非战斗，沿用原深色金的配色。
const CIRCLE_TYPES = new Set(['battle', 'boss']);

// 虚拟坐标系的宽高只用于布局比例，不参与任何数值结算。
const BOARD_WIDTH = 720;
const ROW_GAP = 72;
const PAD_Y = 44;
// 左右留白约占棋盘宽度的 30%，让树状图集中在中间窄列，和参考图一致。
const PAD_X_PCT = 30;
const JITTER_X = 12;
const JITTER_Y = 3;
// 节点半径 + 呼吸空间的安全像素：贴近边框的节点至少留出这段距离，窄屏时换算成百分比。
const NODE_SAFE_HALF = 44;

export class MapBoardView {
  constructor({ texts }) {
    this.texts = texts;
    this.resizeObserver = null;
    this.observedContainer = null;
    this.redrawEdges = null;
  }

  render(container, snapshot, { isAvailable, onSelect }) {
    container.innerHTML = '';
    container.classList.add('map-board');

    const rowCount =
      snapshot.nodes.reduce((max, node) => Math.max(max, node.row), 0) + 1;
    const height = (rowCount - 1) * ROW_GAP + PAD_Y * 2;
    // 高度交给 CSS 控制，宽度可以铺开；不再用宽高比把两者绑死。
    container.style.removeProperty('aspect-ratio');

    const coords = this.computeCoords(
      snapshot.nodes,
      rowCount,
      height,
      snapshot.seed,
      container.clientWidth || BOARD_WIDTH,
    );
    const availability = new Map(
      snapshot.nodes.map((node) => [node.id, Boolean(isAvailable(node))]),
    );

    // 先挂节点再画线：连线需要按节点实际尺寸裁剪到边框，避免穿进图标与文字。
    const elements = snapshot.nodes.map((node) => ({
      node,
      el: this.buildNode(
        node,
        coords.get(node.id),
        snapshot,
        availability.get(node.id),
        onSelect,
      ),
    }));
    for (const { el } of elements) container.appendChild(el);

    const radiusOf = new Map();
    for (const { node, el } of elements) {
      radiusOf.set(node.id, (el.offsetWidth || 44) / 2);
    }

    const svg = this.buildEdges(snapshot, coords, availability, {
      width: container.clientWidth || BOARD_WIDTH,
      height: container.clientHeight || height,
      radiusOf,
    });
    container.insertBefore(svg, container.firstChild);

    // 场景在转场遮罩下 init，此时容器可能还没有尺寸，连线会被按兜底比例裁剪。
    // 用 ResizeObserver 在真正拿到宽高后重画一次连线，保证端点正好落在边框上。
    this.redrawEdges = () => {
      const width = container.clientWidth;
      const heightPx = container.clientHeight;
      if (!width || !heightPx) return;
      const nextRadius = new Map();
      for (const { node, el } of elements) {
        nextRadius.set(node.id, (el.offsetWidth || 44) / 2);
      }
      const nextSvg = this.buildEdges(snapshot, coords, availability, {
        width,
        height: heightPx,
        radiusOf: nextRadius,
      });
      container.querySelector('.map-board__lines')?.replaceWith(nextSvg);
    };
    this.observeResize(container);
  }

  observeResize(container) {
    if (typeof ResizeObserver === 'undefined') return;
    if (!this.resizeObserver) {
      this.resizeObserver = new ResizeObserver(() => this.redrawEdges?.());
    }
    if (this.observedContainer !== container) {
      this.resizeObserver.disconnect();
      this.resizeObserver.observe(container);
      this.observedContainer = container;
    }
  }

  destroy() {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.observedContainer = null;
    this.redrawEdges = null;
  }

  // 按行归一化列位置：单节点行居中，多节点行铺满左右可用的横向区间。
  // 边距按棋盘实际宽度换算，窄屏时自动加大百分比，保证节点不被裁掉；
  // 中间行附加小幅浮动，首尾行保持固定，浮动本身即打破左右对称。
  computeCoords(nodes, rowCount, height, seed, boardWidth) {
    const byRow = new Map();
    for (const node of nodes) {
      if (!byRow.has(node.row)) byRow.set(node.row, []);
      byRow.get(node.row).push(node);
    }

    // 横向可用的百分比边界取「配置留白」与「节点安全边距」的较大值；
    // 窄屏下收窄留白，否则 4 个节点会被挤到几乎相碰。
    const sidePct = boardWidth < 620 ? 18 : PAD_X_PCT;
    const minPct = Math.min(
      30,
      Math.max(sidePct, (NODE_SAFE_HALF / boardWidth) * 100),
    );
    const maxPct = 100 - minPct;

    const coords = new Map();
    for (const [row, rowNodes] of byRow) {
      const sorted = [...rowNodes].sort((a, b) => a.col - b.col);
      const fixed = row === 0 || row === rowCount - 1;
      const baseY = PAD_Y + (rowCount - 1 - row) * ROW_GAP;
      sorted.forEach((node, index) => {
        const ratio = sorted.length === 1 ? 0.5 : index / (sorted.length - 1);
        const baseX = minPct + ratio * (maxPct - minPct);
        const rawX = fixed
          ? baseX
          : baseX + (this.jitterOf(node.id, seed, 0x9e3779b9, JITTER_X) / BOARD_WIDTH) * 100;
        const x = Math.max(minPct, Math.min(maxPct, rawX));
        const y = fixed
          ? baseY
          : baseY + this.jitterOf(node.id, seed, 0x85ebca6b, JITTER_Y);
        coords.set(node.id, { xPct: x, yPct: (y / height) * 100 });
      });
    }
    return coords;
  }

  // 用节点 id、种子与盐值生成稳定的偏移；横向与纵向使用不同盐值，避免同步摆动。
  jitterOf(id, seed, salt, amplitude) {
    let hash = (seed ^ salt) | 0;
    for (let i = 0; i < id.length; i += 1) {
      hash = (hash * 31 + id.charCodeAt(i)) | 0;
    }
    const ratio = (((hash % 1000) + 1000) % 1000) / 1000;
    return (ratio * 2 - 1) * amplitude;
  }

  // 连线画在节点下层，两端按节点半径裁到边框上，不穿进图标与文字。
  buildEdges(snapshot, coords, availability, { width, height, radiusOf }) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'map-board__lines');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');

    const currentNodeId = snapshot.currentNodeId ?? null;

    for (const node of snapshot.nodes) {
      const from = coords.get(node.id);
      if (!from) continue;
      for (const nextId of node.nextIds ?? []) {
        const to = coords.get(nextId);
        if (!to) continue;

        const live = currentNodeId
          ? node.id === currentNodeId && availability.get(nextId)
          : node.row === 0 && availability.get(nextId);

        // 在像素空间里求方向，按半径截掉两端；x/y 百分比尺度不同，必须先换算。
        const dx = ((to.xPct - from.xPct) / 100) * width;
        const dy = ((to.yPct - from.yPct) / 100) * height;
        const length = Math.hypot(dx, dy) || 1;
        const startTrim = Math.min(0.45, (radiusOf.get(node.id) ?? 22) / length);
        const endTrim = Math.min(0.45, (radiusOf.get(nextId) ?? 22) / length);

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', from.xPct + (to.xPct - from.xPct) * startTrim);
        line.setAttribute('y1', from.yPct + (to.yPct - from.yPct) * startTrim);
        line.setAttribute('x2', from.xPct + (to.xPct - from.xPct) * (1 - endTrim));
        line.setAttribute('y2', from.yPct + (to.yPct - from.yPct) * (1 - endTrim));
        line.setAttribute('vector-effect', 'non-scaling-stroke');
        line.setAttribute('class', `map-board__line${live ? ' is-live' : ''}`);
        svg.appendChild(line);
      }
    }
    return svg;
  }

  buildNode(node, coord, snapshot, available, onSelect) {
    const completed = snapshot.completedNodeIds.includes(node.id);
    const current = snapshot.currentNodeId === node.id;
    const shape = CIRCLE_TYPES.has(node.type) ? 'circle' : 'square';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = `map-node map-node--${node.type} map-node--${shape}`;
    button.style.left = `${coord.xPct}%`;
    button.style.top = `${coord.yPct}%`;
    button.classList.toggle('is-available', available && !completed);
    button.classList.toggle('is-completed', completed);
    button.classList.toggle('is-current', current);
    button.disabled = completed || !available;
    button.setAttribute(
      'aria-label',
      this.texts[TYPE_GLYPH_KEY[node.type]] ?? node.type,
    );

    const glyph = document.createElement('span');
    glyph.className = 'map-node__glyph';
    glyph.textContent = this.texts[TYPE_GLYPH_KEY[node.type]] ?? '?';
    button.appendChild(glyph);

    if (current) {
      const badge = document.createElement('span');
      badge.className = 'map-node__badge';
      badge.textContent = this.texts['scene.map.current'];
      button.appendChild(badge);
    }

    if (available && !completed) {
      button.addEventListener('click', () => onSelect(node));
    }
    return button;
  }
}
