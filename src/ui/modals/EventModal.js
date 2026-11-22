// 事件浮层视觉：左图 + 标题 + 可滚动描述 + 三个选项；结算后展示结果与离开按钮。

import { effectLabel } from './text.js';

export class EventModal {
  constructor({ config, texts }) {
    this.config = config;
    this.texts = texts;
  }

  mount(container, snapshot, api) {
    this.api = api;
    this.nodeId = snapshot.nodeId;
    this.event = snapshot.event;
    this.container = container;
    this.renderChoices();
  }

  renderChoices() {
    this.container.innerHTML = '';
    this.container.classList.add('event-modal');

    const figure = document.createElement('div');
    figure.className = 'event-modal__figure';
    const image = document.createElement('img');
    image.alt = this.event.title;
    image.src = this.event.image;
    image.addEventListener('error', () => figure.classList.add('is-missing'));
    figure.appendChild(image);

    const content = document.createElement('div');
    content.className = 'event-modal__content';
    const title = document.createElement('h3');
    title.className = 'event-modal__title';
    title.textContent = this.event.title;
    const desc = document.createElement('p');
    desc.className = 'event-modal__desc';
    desc.textContent = this.event.description;
    content.append(title, desc);

    const hint = document.createElement('p');
    hint.className = 'event-modal__hint';
    hint.textContent = this.texts['overlay.event.choose'];

    const choices = document.createElement('div');
    choices.className = 'event-modal__choices';
    for (const choice of this.event.choices) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'overlay-button';
      button.textContent = choice.label;
      button.addEventListener('click', () => this.choose(choice.id));
      choices.appendChild(button);
    }

    content.append(hint, choices);
    this.container.append(figure, content);
  }

  choose(choiceId) {
    const result = this.api.ctx.resolveEventChoice(this.nodeId, choiceId);
    this.container.innerHTML = '';
    this.container.classList.add('event-modal');

    const content = document.createElement('div');
    content.className = 'event-modal__content event-modal__content--result';

    const title = document.createElement('h3');
    title.className = 'event-modal__title';
    title.textContent = this.event.title;

    const desc = document.createElement('p');
    desc.className = 'event-modal__desc';
    desc.textContent = result.result;

    const list = document.createElement('ul');
    list.className = 'event-modal__effects';
    for (const effect of result.effects) {
      const item = document.createElement('li');
      item.textContent = effectLabel(this.texts, this.config, effect);
      list.appendChild(item);
    }

    const leave = document.createElement('button');
    leave.type = 'button';
    leave.className = 'overlay-button overlay-button--primary';
    leave.textContent = this.texts['overlay.event.leave'];
    leave.addEventListener('click', () => this.api.close({ completed: true }));

    content.append(title, desc);
    if (result.effects.length > 0) content.appendChild(list);
    content.appendChild(leave);
    this.container.appendChild(content);
  }
}
