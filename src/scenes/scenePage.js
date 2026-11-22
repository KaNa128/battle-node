// 场景空壳的公共骨架：标题 + 说明 + 按钮列。后续各场景可替换为正式布局。

export function buildScenePage({ container, title, subtitle, actions = [] }) {
  const page = document.createElement('section');
  page.className = 'scene-page';

  const head = document.createElement('header');
  head.className = 'scene-page__head';

  const titleEl = document.createElement('h1');
  titleEl.className = 'scene-page__title';
  titleEl.textContent = title;

  const subtitleEl = document.createElement('p');
  subtitleEl.className = 'scene-page__subtitle';
  subtitleEl.textContent = subtitle ?? '';

  head.append(titleEl, subtitleEl);

  const actionList = document.createElement('div');
  actionList.className = 'scene-page__actions';

  const buttons = new Map();
  for (const action of actions) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `scene-action ${action.variant ? `scene-action--${action.variant}` : ''}`.trim();
    button.textContent = action.label;
    button.addEventListener('click', () => action.onClick?.());
    actionList.appendChild(button);
    buttons.set(action.key, button);
  }

  page.append(head, actionList);
  container.appendChild(page);

  return {
    root: page,
    titleEl,
    subtitleEl,
    buttons,
    setSubtitle(text) {
      subtitleEl.textContent = text ?? '';
    },
    setVisible(key, visible) {
      buttons.get(key)?.classList.toggle('hidden', !visible);
    },
  };
}
