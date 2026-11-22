// 宝箱浮层视觉：中央宝箱图，点击开箱后展示获得物清单。

import { effectLabel } from './text.js';

export class ChestModal {
  constructor({ config, texts }) {
    this.config = config;
    this.texts = texts;
  }

  mount(container, snapshot, api) {
    this.api = api;
    this.nodeId = snapshot.nodeId;
    this.chest = snapshot.chest;
    this.container = container;
    this.rewards = [];
    this.render(snapshot.opened);
  }

  render(opened) {
    this.container.innerHTML = '';
    this.container.classList.add('chest-modal');

    const stage = document.createElement('div');
    stage.className = 'chest-modal__stage';
    const image = document.createElement('img');
    image.className = 'chest-modal__image';
    image.alt = this.chest.name;
    image.src = this.chest.gif;
    image.addEventListener('error', () => stage.classList.add('is-missing'));
    const glyph = document.createElement('span');
    glyph.className = 'chest-modal__glyph';
    glyph.textContent = '箱';
    stage.append(image, glyph);

    const name = document.createElement('p');
    name.className = 'chest-modal__name';
    name.textContent = this.chest.name;

    this.container.append(stage, name);

    if (opened) {
      this.renderRewards(this.rewards);
      return;
    }

    const openButton = document.createElement('button');
    openButton.type = 'button';
    openButton.className = 'overlay-button overlay-button--primary';
    openButton.textContent = this.texts['overlay.chest.open'];
    openButton.addEventListener('click', () => this.openBox(openButton));
    this.container.appendChild(openButton);
  }

  openBox(button) {
    button.disabled = true;
    button.textContent = this.texts['overlay.chest.opened'];
    const result = this.api.ctx.openChest(this.nodeId);
    this.rewards = result.rewards ?? [];
    this.container.querySelector('.chest-modal__stage')?.classList.add('is-open');
    this.renderRewards(this.rewards);
  }

  renderRewards(rewards) {
    let list = this.container.querySelector('.chest-modal__rewards');
    if (list) list.remove();

    list = document.createElement('div');
    list.className = 'chest-modal__rewards';
    const title = document.createElement('h4');
    title.textContent = this.texts['overlay.chest.rewards'];
    list.appendChild(title);

    if (rewards.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'overlay-muted';
      empty.textContent = this.texts['overlay.chest.empty'];
      list.appendChild(empty);
    } else {
      const ul = document.createElement('ul');
      for (const effect of rewards) {
        const item = document.createElement('li');
        item.textContent = effectLabel(this.texts, this.config, effect);
        ul.appendChild(item);
      }
      list.appendChild(ul);
    }

    const take = document.createElement('button');
    take.type = 'button';
    take.className = 'overlay-button';
    take.textContent = this.texts['overlay.chest.take'];
    take.addEventListener('click', () => this.api.close({ completed: true }));
    list.appendChild(take);

    this.container.appendChild(list);
  }
}
