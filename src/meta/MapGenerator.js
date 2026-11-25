// 路线图生成：纯函数 + 注入种子。自下而上分叉，底部固定起始事件，顶部唯一 Boss。
// 相邻行按连续区间连线，保证任意两条边不交叉；节点数由配置决定。
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

  // 相邻两行按连续区间分配连线：源节点从左到右只连向不交叉的目标区间，
  // 同时保证每个目标都有入边、每个源都有出边。
  for (let row = 0; row < totalRows - 1; row += 1) {
    connectRows(rows[row], rows[row + 1]);
  }

  return {
    floor,
    seed,
    rows: rows.map((rowNodes) => rowNodes.map((node) => node.id)),
    nodes,
    completedNodeIds: [],
  };
}

// 把目标行切成若干连续区间，源节点 i 连接 [start, end]。
// 区间随源下标单调不减，因此所有边从下往上都不会交叉。
function connectRows(sources, targets) {
  const sourceCount = sources.length;
  const targetCount = targets.length;
  if (sourceCount === 0 || targetCount === 0) return;

  for (let i = 0; i < sourceCount; i += 1) {
    const start = Math.floor((i * targetCount) / sourceCount);
    const end = Math.ceil(((i + 1) * targetCount) / sourceCount) - 1;
    const from = Math.max(0, Math.min(targetCount - 1, start));
    const to = Math.max(from, Math.min(targetCount - 1, end));
    for (let k = from; k <= to; k += 1) {
      sources[i].nextIds.push(targets[k].id);
    }
  }
}
