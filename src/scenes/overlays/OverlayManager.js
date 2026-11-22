// 浮层单例：遮罩、面板、标题、Esc / 点击遮罩关闭、焦点与结果 Promise。
// 浮层内容由 ui/modals 提供，容器只负责开关与意图转发，不计算数值。

export class OverlayManager {
  constructor({ host, overlays = {}, onClose = null }) {
    if (!host) throw new Error('OverlayManager: host 必填');
    this.host = host;
    this.overlays = overlays;
    this.onClose = onClose;
    this.context = null;

    this.mask = null;
    this.overlay = null;
    this.instance = null;
    this.resolve = null;
    this.currentId = null;
    this.onKeydown = null;
  }

  setContext(context) {
    this.context = context;
    return this;
  }

  open(id, params = {}) {
    const overlay = this.overlays[id];
    if (!overlay) return Promise.reject(new Error(`OverlayManager: 未注册的浮层 ${id}`));

    // 同一时刻只允许一个浮层：旧浮层以 null 结束。
    if (this.currentId) this.teardown(null);

    const result = new Promise((resolve) => {
      this.resolve = resolve;
    });

    const mask = document.createElement('div');
    mask.className = `overlay-mask overlay-mask--${id}`;

    const panel = document.createElement('div');
    panel.className = 'overlay-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');

    const header = document.createElement('header');
    header.className = 'overlay-header';
    const title = document.createElement('h2');
    title.className = 'overlay-title';
    title.textContent = typeof overlay.title === 'function' ? overlay.title() : overlay.title ?? '';
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'overlay-close';
    closeButton.textContent = this.context.texts['overlay.close'];
    closeButton.setAttribute('aria-label', this.context.texts['overlay.close']);
    closeButton.addEventListener('click', () => this.close(undefined));
    header.append(title, closeButton);

    const body = document.createElement('div');
    body.className = 'overlay-body';

    panel.append(header, body);
    mask.appendChild(panel);
    mask.addEventListener('click', (event) => {
      if (event.target === mask) this.close(undefined);
    });
    this.host.appendChild(mask);

    this.mask = mask;
    this.overlay = overlay;
    this.currentId = id;

    const api = {
      close: (value) => this.close(value),
      ctx: this.context,
      config: this.context.config,
      texts: this.context.texts,
    };
    this.instance = overlay.render(body, params, api) ?? null;

    this.onKeydown = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      this.close(undefined);
    };
    document.addEventListener('keydown', this.onKeydown);
    closeButton.focus();

    return result;
  }

  close(result) {
    if (!this.currentId) return;
    const overlay = this.overlay;
    const finalResult = result === undefined ? overlay.defaultCloseResult ?? null : result;
    this.teardown(finalResult);
  }

  teardown(result) {
    const resolve = this.resolve;
    if (this.onKeydown) document.removeEventListener('keydown', this.onKeydown);
    this.instance?.destroy?.();
    this.mask?.remove();

    this.mask = null;
    this.overlay = null;
    this.instance = null;
    this.resolve = null;
    this.currentId = null;
    this.onKeydown = null;

    if (resolve) resolve(result);
    this.onClose?.();
  }

  current() {
    return this.currentId;
  }

  destroy() {
    this.teardown(null);
  }
}
