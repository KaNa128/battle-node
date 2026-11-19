// GIF 播放：切换 src 强制重播，切换前预加载；资源缺失时显示占位样式。

export class GifPlayer {
  constructor(img) {
    this.img = img;
    this.fallback = img.parentElement?.querySelector('.portrait__fallback') ?? null;
    this.preloaded = new Set();

    img.addEventListener('error', () => {
      img.classList.add('is-missing');
      this.fallback?.classList.add('is-visible');
    });
    img.addEventListener('load', () => {
      img.classList.remove('is-missing');
      this.fallback?.classList.remove('is-visible');
    });
  }

  show(path, replaySame = true) {
    if (!path) return;
    if (this.current === path && !replaySame) return;
    this.current = path;
    if (!this.preloaded.has(path)) {
      this.preloaded.add(path);
      const probe = new Image();
      probe.src = path;
    }
    if (this.img.getAttribute('src') === path) {
      this.img.removeAttribute('src');
      void this.img.offsetWidth;
    }
    this.img.src = path;
  }
}
