// 场景路由：只负责切换顺序、生命周期与转场编排，不接触 DOM。
// 渲染宿主（SceneShell）由 main.js 注入，DOM 的创建与背景切换都留在 scenes 层。
//
// 生命周期：mount(container, ctx) → init(params) → leave() → destroy()
// init 允许返回 Promise；转场遮罩会在 init 完成前保持显示。

export class SceneManager {
  constructor({
    scenes,
    host,
    context = null,
    loadingText = 'Loading...',
    transitionMs = 320,
  }) {
    if (!scenes || typeof scenes !== 'object') {
      throw new Error('SceneManager: scenes 必须是场景工厂表');
    }
    if (!host) {
      throw new Error('SceneManager: host 必填');
    }

    this.scenes = scenes;
    this.host = host;
    this.context = context;
    this.loadingText = loadingText;
    this.transitionMs = transitionMs;

    this.instances = new Map();
    this.stack = [];
    this.currentSceneId = null;
    this.navigating = null;
    this.listeners = new Set();
  }

  setContext(context) {
    this.context = context;
    // 已 mount 的场景不重复 mount；上下文对象本身在主装配完成后才可用。
    return this;
  }

  start(sceneId = 'home', params = {}) {
    return this.navigate(sceneId, params, { replace: true });
  }

  // 同一时刻只允许一次跳转；重复点击直接复用进行中的 Promise，避免遮罩抖动。
  navigate(sceneId, params = {}, options = {}) {
    if (!this.scenes[sceneId]) {
      return Promise.reject(new Error(`SceneManager: 未注册的场景 ${sceneId}`));
    }
    if (this.navigating) return this.navigating;

    this.navigating = this.runTransition(sceneId, params, Boolean(options.replace)).finally(() => {
      this.navigating = null;
    });
    return this.navigating;
  }

  async runTransition(sceneId, params, replace) {
    await this.host.cover(this.loadingText);
    try {
      const from = this.currentSceneId;
      this.currentScene()?.leave?.();

      const { scene, layer } = this.ensureScene(sceneId);
      await scene.init?.(params);
      await this.host.show({ sceneId, element: layer });

      if (from && from !== sceneId && !replace) this.stack.push(from);
      this.currentSceneId = sceneId;
      this.emitChange({ from, to: sceneId, params });
      return sceneId;
    } finally {
      await this.host.uncover();
    }
  }

  // 场景实例只创建一次；重复进入复用同一实例与同一 DOM 层。
  ensureScene(sceneId) {
    const cached = this.instances.get(sceneId);
    if (cached) return cached;

    const factory = this.scenes[sceneId];
    const scene = factory();
    if (!scene || typeof scene !== 'object') {
      throw new Error(`SceneManager: 场景工厂 ${sceneId} 必须返回场景对象`);
    }
    if (scene.id && scene.id !== sceneId) {
      throw new Error(`SceneManager: 场景 id 不一致（${scene.id} ≠ ${sceneId}）`);
    }

    const layer = this.host.createLayer(sceneId);
    scene.mount?.(layer, this.context);
    const entry = { scene, layer };
    this.instances.set(sceneId, entry);
    return entry;
  }

  current() {
    return this.currentSceneId;
  }

  currentScene() {
    return this.instances.get(this.currentSceneId)?.scene ?? null;
  }

  back(params = {}) {
    const target = this.stack.pop();
    if (!target) return Promise.resolve(this.currentSceneId);
    return this.navigate(target, params, { replace: true });
  }

  onChange(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emitChange(payload) {
    for (const listener of [...this.listeners]) listener(payload);
  }

  destroy() {
    for (const { scene } of this.instances.values()) {
      scene.destroy?.();
    }
    this.instances.clear();
    this.stack = [];
    this.currentSceneId = null;
    this.host.clear?.();
  }
}
