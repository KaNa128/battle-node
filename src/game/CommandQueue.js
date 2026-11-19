// 指令队列：LIFO，入队瞬间生成不可变快照；撤回不重排 seq。
// 结算只读快照字段，禁止回读当前面板。

import { deepFreeze, deepClone } from '../utils/deepClone.js';

let commandCounter = 0;

function nextOpId() {
  commandCounter += 1;
  return `cmd_${commandCounter.toString(16).padStart(8, '0')}`;
}

export class CommandQueue {
  constructor() {
    this.structure = 'lifo';
    this.items = [];
    this.nextSeq = 1;
  }

  push(command) {
    if (!command || typeof command !== 'object') {
      throw new Error('CommandQueue.push: 指令必须是对象');
    }
    const snapshot = deepFreeze({
      opId: command.opId || nextOpId(),
      seq: this.nextSeq,
      kind: command.kind,
      panelKey: command.panelKey,
      weaponId: command.weaponId ?? null,
      attackType: command.attackType ?? null,
      sourceId: command.sourceId ?? null,
      resolved: { ...command.resolved },
      effects: [...(command.effects || [])],
    });
    this.items.push(snapshot);
    this.nextSeq += 1;
    return snapshot;
  }

  undo() {
    if (this.items.length === 0) return null;
    return this.items.pop();
  }

  clear() {
    this.items = [];
  }

  get length() {
    return this.items.length;
  }

  snapshot() {
    return deepClone(this.items);
  }
}
