// Tooltip：单例浮动说明层，只在 UI 层使用，不参与任何战斗计算。
// 支持鼠标悬停与键盘聚焦，定位固定夹取在视口内。

let layer = null;
let visible = false;

function ensureLayer() {
  if (layer) return layer;
  layer = document.createElement('div');
  layer.className = 'tooltip';
  document.body.appendChild(layer);
  return layer;
}

function renderContent(text) {
  const node = ensureLayer();
  node.textContent = '';
  for (const line of String(text).split('\n')) {
    const row = document.createElement('div');
    row.className = 'tooltip__line';
    row.textContent = line;
    node.appendChild(row);
  }
}

function place(target) {
  const node = ensureLayer();
  const gap = 8;
  const rect = target.getBoundingClientRect();

  // 先隐藏再测量，避免浮层自身影响布局。
  node.style.visibility = 'hidden';
  node.classList.add('is-visible');
  const box = node.getBoundingClientRect();

  let top = rect.top - box.height - gap;
  if (top < 4) top = rect.bottom + gap;
  let left = rect.left + rect.width / 2 - box.width / 2;
  left = Math.max(4, Math.min(left, window.innerWidth - box.width - 4));

  node.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
  node.style.visibility = '';
}

function showFor(target, text) {
  if (!text) return;
  renderContent(text);
  place(target);
  visible = true;
}

export function hideTooltip() {
  if (!layer || !visible) return;
  layer.classList.remove('is-visible');
  visible = false;
}

export function attachTooltip(el, getContent) {
  const show = () => {
    const text = getContent();
    if (text) showFor(el, text);
  };
  el.addEventListener('mouseenter', show);
  el.addEventListener('mouseleave', hideTooltip);
  el.addEventListener('focus', show);
  el.addEventListener('blur', hideTooltip);
}
