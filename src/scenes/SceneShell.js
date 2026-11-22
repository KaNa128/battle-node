// 场景外壳：背景层 + 内容层 + 转场遮罩 + 全局背包。
// 这里是唯一创建场景层级 DOM 的位置，SceneManager 只负责调用顺序。

import { InventoryView } from '../ui/InventoryView.js';

export class SceneShell {
  constructor({ root, config, transitionMs = 320 }) {
    if (!root) throw new Error('SceneShell: root 必填');
    this.root = root;
    this.config = config;
    this.texts = config.ui.texts;
    this.transitionMs = transitionMs;
    this.context = null;

    this.sceneMap = new Map((config.scenes?.scenes ?? []).map((scene) => [scene.id, scene]));
    this.build();
  }

  setContext(context) {
    this.context = context;
    return this;
  }

  build() {
    this.root.innerHTML = `
      <div class="scene-shell" data-scene="">
        <div class="scene-bg" data-scene-bg></div>
        <div class="scene-bg__veil"></div>
        <div class="scene-topbar">
          <button type="button" class="scene-bag-button" data-scene-bag></button>
        </div>
        <div class="scene-layer-host" data-scene-layer-host></div>
        <div class="scene-transition hidden" data-scene-transition aria-hidden="true">
          <div class="scene-transition__inner">
            <span class="scene-transition__spinner"></span>
            <span class="scene-transition__text" data-scene-transition-text></span>
          </div>
        </div>
      </div>
    `;

    this.shell = this.root.querySelector('.scene-shell');
    this.shell.style.setProperty('--scene-transition-ms', `${this.transitionMs}ms`);
    this.bg = this.root.querySelector('[data-scene-bg]');
    this.layerHost = this.root.querySelector('[data-scene-layer-host]');
    this.transition = this.root.querySelector('[data-scene-transition]');
    this.transitionText = this.root.querySelector('[data-scene-transition-text]');
    this.bagButton = this.root.querySelector('[data-scene-bag]');

    this.transitionText.textContent = this.texts['scene.loading'];
    this.bagButton.textContent = this.texts['scene.bag'];
    this.bagButton.addEventListener('click', () => this.openInventory());

    this.inventory = new InventoryView({
      container: this.shell,
      config: this.config,
      texts: this.texts,
      inBattle: false,
    });
  }

  // ---- SceneManager 宿主接口 ----------------------------------------

  async cover(text) {
    this.transitionText.textContent = text || this.texts['scene.loading'];
    this.transition.setAttribute('aria-hidden', 'false');
    this.transition.classList.remove('hidden');
    // 强制 reflow，保证从 hidden 切到可见时 opacity 过渡真正生效。
    void this.transition.offsetWidth;
    this.transition.classList.add('is-visible');
  }

  async uncover() {
    this.transition.classList.remove('is-visible');
    this.transition.setAttribute('aria-hidden', 'true');
    await this.waitTransitionEnd();
    if (!this.transition.classList.contains('is-visible')) {
      this.transition.classList.add('hidden');
    }
  }

  waitTransitionEnd() {
    return new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        this.transition.removeEventListener('transitionend', onEnd);
        resolve();
      };
      const onEnd = (event) => {
        if (event.target === this.transition && event.propertyName === 'opacity') finish();
      };
      this.transition.addEventListener('transitionend', onEnd);
      // 兜底：过渡被系统禁用或页面在后台时不依赖 transitionend。
      setTimeout(finish, this.transitionMs + 80);
    });
  }

  createLayer(sceneId) {
    const layer = document.createElement('div');
    layer.className = 'scene-layer';
    layer.dataset.scene = sceneId;
    this.layerHost.appendChild(layer);
    return layer;
  }

  async show({ sceneId, element }) {
    const sceneConfig = this.sceneMap.get(sceneId);
    this.shell.dataset.scene = sceneId;
    this.shell.dataset.sceneTitle = sceneConfig?.title ?? sceneId;

    // 背景在遮罩未揭开前先加载，避免转场结束后再闪一次。
    await this.loadBackground(sceneConfig?.background);

    for (const layer of this.layerHost.children) {
      layer.classList.toggle('is-active', layer === element);
    }
    element.classList.add('is-active');
  }

  async loadBackground(background) {
    this.bg.style.backgroundImage = '';
    if (!background) return;

    await new Promise((resolve) => {
      const image = new Image();
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        resolve();
      };
      image.onload = finish;
      image.onerror = finish;
      image.src = background;
      if (image.complete) finish();
      setTimeout(finish, 1000);
    });

    this.bg.style.backgroundImage = `url("${background}")`;
  }

  clear() {
    this.layerHost.innerHTML = '';
  }

  // ---- 全局背包 ------------------------------------------------------

  openInventory(options = {}) {
    const snapshot = options.snapshot ?? this.context?.getInventorySnapshot?.();
    if (!snapshot) return;

    const inBattle = Boolean(options.inBattle);
    this.inventory.open(snapshot, {
      inBattle,
      hint: this.texts[inBattle ? 'inventory.battleHint' : 'inventory.outsideHint'],
    });
  }

  closeInventory() {
    this.inventory.close();
  }

  destroy() {
    this.inventory.overlay.remove();
    this.inventory.menu.remove();
    this.root.innerHTML = '';
  }
}
