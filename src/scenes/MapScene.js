// 路线图：自下而上分叉，底部固定起始事件，顶部唯一 Boss。
// 只读 MapSnapshot，点击已连通的节点发起跳转或打开浮层。

const TYPE_GLYPH_KEY = {
  battle: 'scene.map.node.battle',
  event: 'scene.map.node.event',
  chest: 'scene.map.node.chest',
  shop: 'scene.map.node.shop',
  boss: 'scene.map.node.boss',
};

export function createMapScene() {
  let ctx;
  let root;
  let subtitle;
  let board;
  let snapshot = null;

  function nodeById(id) {
    return snapshot?.nodes.find((node) => node.id === id) ?? null;
  }

  function isAvailable(node) {
    if (snapshot.completedNodeIds.includes(node.id)) return false;
    if (!snapshot.currentNodeId) return node.row === 0;
    const current = nodeById(snapshot.currentNodeId);
    return Boolean(current?.nextIds.includes(node.id));
  }

  function build(container) {
    root = document.createElement('section');
    root.className = 'map-scene';

    const head = document.createElement('header');
    head.className = 'map-scene__head';
    const title = document.createElement('h1');
    title.className = 'map-scene__title';
    title.textContent = ctx.texts['scene.map.title'];
    subtitle = document.createElement('p');
    subtitle.className = 'map-scene__subtitle';
    head.append(title, subtitle);

    const hint = document.createElement('p');
    hint.className = 'map-scene__hint';
    hint.textContent = ctx.texts['scene.map.hint'];

    board = document.createElement('div');
    board.className = 'map-scene__board';

    const footer = document.createElement('div');
    footer.className = 'map-scene__footer';
    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'scene-action';
    back.textContent = ctx.texts['scene.map.home'];
    back.addEventListener('click', () => ctx.navigate('home', {}, { replace: true }));
    footer.appendChild(back);

    root.append(head, hint, board, footer);
    container.appendChild(root);
  }

  function render() {
    snapshot = ctx.getMapSnapshot();
    subtitle.textContent = ctx.texts['scene.map.floor'].replace(
      '{floor}',
      String(snapshot.floor),
    );

    board.innerHTML = '';
    const byRow = new Map();
    for (const node of snapshot.nodes) {
      if (!byRow.has(node.row)) byRow.set(node.row, []);
      byRow.get(node.row).push(node);
    }

    const rows = [...byRow.keys()].sort((a, b) => b - a);
    for (const row of rows) {
      const rowEl = document.createElement('div');
      rowEl.className = 'map-scene__row';
      const nodes = byRow.get(row).sort((a, b) => a.col - b.col);
      for (const node of nodes) {
        rowEl.appendChild(buildNode(node));
      }
      board.appendChild(rowEl);
    }
  }

  function buildNode(node) {
    const completed = snapshot.completedNodeIds.includes(node.id);
    const available = isAvailable(node);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `map-node map-node--${node.type}`;
    button.classList.toggle('is-available', available);
    button.classList.toggle('is-completed', completed);
    button.classList.toggle('is-current', snapshot.currentNodeId === node.id);
    button.disabled = completed || !available;

    const glyph = document.createElement('span');
    glyph.className = 'map-node__glyph';
    glyph.textContent = ctx.texts[TYPE_GLYPH_KEY[node.type]] ?? '?';
    button.appendChild(glyph);

    if (snapshot.currentNodeId === node.id) {
      const badge = document.createElement('span');
      badge.className = 'map-node__badge';
      badge.textContent = ctx.texts['scene.map.current'];
      button.appendChild(badge);
    }

    button.addEventListener('click', () => handleNode(node));
    return button;
  }

  async function handleNode(node) {
    if (node.type === 'battle' || node.type === 'boss') {
      ctx.navigate('battle', { nodeId: node.id, nodeType: node.type });
      return;
    }

    const result = await ctx.openOverlay(node.type, { nodeId: node.id });
    if (result?.completed) {
      ctx.completeNode(node.id);
      render();
    }
  }

  return {
    id: 'map',

    mount(container, context) {
      ctx = context;
      build(container);
    },

    init() {
      render();
    },

    leave() {},

    destroy() {
      root?.remove();
    },
  };
}
