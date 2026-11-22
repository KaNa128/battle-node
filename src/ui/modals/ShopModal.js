// 商店浮层视觉：三栏商品，每件限购 1 次，每栏底部独立刷新。

import { formatText } from './text.js';

export class ShopModal {
  constructor({ config, texts }) {
    this.config = config;
    this.texts = texts;
  }

  mount(container, snapshot, api) {
    this.api = api;
    this.container = container;
    this.snapshot = snapshot;
    this.message = null;
    this.render();
  }

  offerLabel(offer) {
    if (offer.kind === 'weapon') {
      const weapon = this.config.weapons.weapons.find((entry) => entry.id === offer.weaponId);
      return weapon?.name ?? offer.weaponId;
    }
    if (offer.kind === 'item') {
      const item = this.config.items.items.find((entry) => entry.id === offer.itemId);
      return item?.name ?? offer.itemId;
    }
    const category = this.config.upgrades.enhancement.categories.find(
      (entry) => entry.id === offer.enhanceCategory,
    );
    return `${this.texts[category?.labelKey] ?? offer.enhanceCategory} ×${offer.amount ?? 1}`;
  }

  render() {
    this.container.innerHTML = '';
    this.container.classList.add('shop-modal');

    const head = document.createElement('div');
    head.className = 'shop-modal__head';
    const gold = document.createElement('span');
    gold.className = 'shop-modal__gold';
    gold.textContent = formatText(this.texts, 'overlay.shop.gold', { gold: this.snapshot.gold });
    head.appendChild(gold);
    if (this.message) {
      const message = document.createElement('span');
      message.className = 'overlay-muted';
      message.textContent = this.message;
      head.appendChild(message);
    }

    const grid = document.createElement('div');
    grid.className = 'shop-modal__columns';

    for (const column of this.snapshot.columns) {
      const section = document.createElement('section');
      section.className = 'shop-modal__column';

      const title = document.createElement('h4');
      title.textContent = this.texts[column.titleKey] ?? column.id;
      section.appendChild(title);

      const list = document.createElement('div');
      list.className = 'shop-modal__offers';

      for (const offer of column.offers) {
        const card = document.createElement('div');
        card.className = 'shop-offer';

        const name = document.createElement('span');
        name.className = 'shop-offer__name';
        name.textContent = this.offerLabel(offer);
        card.appendChild(name);

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'overlay-button';
        const owned = offer.owned;
        const disabled = offer.purchased || owned || this.snapshot.gold < offer.price;
        button.disabled = disabled;
        button.textContent = offer.purchased
          ? this.texts['overlay.shop.bought']
          : owned
            ? this.texts['overlay.shop.owned']
            : formatText(this.texts, 'overlay.shop.buy', { price: offer.price });
        button.addEventListener('click', () => this.buy(column.id, offer.id));
        card.appendChild(button);
        list.appendChild(card);
      }

      section.appendChild(list);

      const refresh = document.createElement('button');
      refresh.type = 'button';
      refresh.className = 'overlay-button shop-modal__refresh';
      refresh.disabled = this.snapshot.gold < column.refreshCost;
      refresh.textContent = formatText(this.texts, 'overlay.shop.refresh', {
        price: column.refreshCost,
      });
      refresh.addEventListener('click', () => this.refresh(column.id));
      section.appendChild(refresh);

      grid.appendChild(section);
    }

    this.container.append(head, grid);
  }

  buy(columnId, offerId) {
    const result = this.api.ctx.buyShopOffer(columnId, offerId);
    if (result.ok) {
      this.snapshot = result.snapshot;
      this.message = null;
    } else {
      this.message =
        result.reason === 'gold' ? this.texts['overlay.shop.noGold'] : this.texts['overlay.shop.bought'];
    }
    this.render();
  }

  refresh(columnId) {
    const result = this.api.ctx.refreshShopColumn(columnId);
    if (result.ok) {
      this.snapshot = result.snapshot;
      this.message = null;
    } else {
      this.message = this.texts['overlay.shop.noGold'];
    }
    this.render();
  }
}
