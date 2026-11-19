// 极简事件总线：逻辑层事件的唯一出口，禁止在此承载业务规则。

export class EventBus {
  constructor() {
    this.handlers = new Map();
  }

  on(type, handler) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type).add(handler);
    return () => this.off(type, handler);
  }

  off(type, handler) {
    const set = this.handlers.get(type);
    if (!set) return;
    set.delete(handler);
  }

  emit(type, payload) {
    const set = this.handlers.get(type);
    if (!set) return;
    for (const handler of [...set]) {
      handler(payload);
    }
  }

  clear() {
    this.handlers.clear();
  }
}
