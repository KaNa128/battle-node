// 路线图生成：纯函数 + 注入种子。自下而上分叉，底部固定起始事件，顶部唯一 Boss。
// 输出结构写入 RunState，当层内固定不变；重进路线图只读快照。

import { Rng } from '../game/Rng.js';

export function generateMap({ floor, seed, config }) {
  const mapConfig = config.map;
  if (!mapConfig) throw new Error('MapGenerator: 缺少 config/map.json');

  const rng = new Rng(seed);
  const totalRows = mapConfig.rows;
  const rows = [];
  const nodes = [];

  for (let row = 0; row < totalRows; row += 1) {
    let count;
    if (row === 0 || row === totalRows - 1) count = 1;
    else count = rng.int(mapConfig.columns.min, mapConfig.columns.max);

    const rowNodes = [];
    for (let col = 0; col < count; col += 1) {
      let type;
      if (row === 0) type = mapConfig.startType;
      else if (row === totalRows - 1) type = mapConfig.bossType;
      else type = rng.pickWeighted(mapConfig.nodeTypes).id;

      const node = { id: `f${floor}_r${row}_c${col}`, row, col, type, nextIds: [] };
      rowNodes.push(node);
      nodes.push(node);
    }
    rows.push(rowNodes);
  }

  // 相邻两行按归一化列位置就近连线：每个节点出度 1~2，且保证每个节点都有入边。
  for (let row = 0; row < totalRows - 1; row += 1) {
    const current = rows[row];
    const next = rows[row + 1];

    current.forEach((node, index) => {
      const ratio = current.length === 1 ? 0.5 : index / (current.length - 1);
      const center = Math.round(ratio * (next.length - 1));
      const candidates = [center, center - 1, center + 1]
        .filter((value, i, list) => value >= 0 && value < next.length && list.indexOf(value) === i)
        .slice(0, rng.int(1, 2));
      node.nextIds = candidates.map((i) => next[i].id);
    });

    for (const target of next) {
      const hasIncoming = current.some((node) => node.nextIds.includes(target.id));
      if (hasIncoming) continue;
      const ratio = next.length === 1 ? 0.5 : target.col / (next.length - 1);
      const nearestIndex = Math.round(ratio * (current.length - 1));
      current[nearestIndex].nextIds.push(target.id);
    }
  }

  return {
    floor,
    seed,
    rows: rows.map((rowNodes) => rowNodes.map((node) => node.id)),
    nodes,
    completedNodeIds: [],
  };
}
