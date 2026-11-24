// 路线图：自下而上分叉，底部固定起始事件，顶部唯一 Boss。
// 只读 MapSnapshot，点击已连通的节点发起跳转或打开浮层。
// 棋盘渲染交给 ui/map/MapBoardView，本文件只保留导航规则。

import { MapBoardView } from '../ui/map/MapBoardView.js';

export function createMapScene() {
  let ctx;
  let root;
  let subtitle;
  let board;
  let boardView;
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
    boardView = new MapBoardView({ texts: ctx.texts });

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

    boardView.render(board, snapshot, {
      isAvailable,
      onSelect: handleNode,
    });
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
      boardView?.destroy();
      root?.remove();
    },
  };
}
