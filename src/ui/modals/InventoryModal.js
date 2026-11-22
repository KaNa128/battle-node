// 背包浮层视觉：左侧装备 / 药品列表与筛选，中间已装备槽位，右侧综合属性。
// 只渲染快照；强化只发意图，数值与扣次数由 meta 完成。

import { toFixed1 } from '../../utils/math.js';
import { formatText } from './text.js';

const FILTERS = [
  { key: 'all', labelKey: 'inventory.filter.all' },
  { key: 'normal', labelKey: 'inventory.filter.normal' },
  { key: 'special', labelKey: 'inventory.filter.special' },
  { key: 'item', labelKey: 'inventory.filter.item' },
];

const SLOTS = [
  { key: 'normal1', group: 'normal', index: 0, labelKey: 'inventory.slot.normal1' },
  { key: 'normal2', group: 'normal', index: 1, labelKey: 'inventory.slot.normal2' },
  { key: 'special1', group: 'special', index: 0, labelKey: 'inventory.slot.special1' },
  { key: 'special2', group: 'special', index: 1, labelKey: 'inventory.slot.special2' },
];

export class InventoryModal {
  constructor({ texts }) {
    this.texts = texts;
    this.filter = 'all';
    this.selectedKey = null;
  }

  mount(container, snapshot, api) {
    this.api = api;
    this.container = container;
    this.snapshot = snapshot;
    this.selectedKey =
      snapshot.weapons.find((weapon) => weapon.category === 'normal')?.id ??
      snapshot.weapons[0]?.id ??
      snapshot.items[0]?.id ??
      null;
    this.render();
  }

  t(key, vars) {
    return formatText(this.texts, key, vars);
  }

  entries() {
    const equipped = this.equippedMap();
    return [
      ...this.snapshot.weapons.map((weapon) => ({
        key: weapon.id,
        type: weapon.category,
        name: weapon.name,
        slot: equipped.get(weapon.id) ?? null,
        weapon,
      })),
      ...this.snapshot.items.map((item) => ({
        key: item.id,
        type: 'item',
        name: item.name,
        slot: null,
        item,
      })),
    ];
  }

  equippedMap() {
    const map = new Map();
    for (const slot of SLOTS) {
      const list = this.snapshot.equipment[`${slot.group}Weapons`] ?? [];
      if (list[slot.index]) map.set(list[slot.index], slot);
    }
    return map;
  }

  entrySelected() {
    return this.entries().find((entry) => entry.key === this.selectedKey) ?? null;
  }

  render() {
    this.container.innerHTML = '';
    this.container.classList.add('inventory-modal');

    this.container.append(
      this.buildListColumn(),
      this.buildEquipColumn(),
      this.buildStatsColumn(),
    );
  }

  buildListColumn() {
    const column = document.createElement('section');
    column.className = 'inventory-modal__col';

    if (this.snapshot.inBattle) {
      const hint = document.createElement('p');
      hint.className = 'overlay-muted';
      hint.textContent = this.texts['inventory.battleHint'];
      column.appendChild(hint);
    }

    const filters = document.createElement('div');
    filters.className = 'inventory-modal__filters';
    for (const filter of FILTERS) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'overlay-button inventory-modal__filter';
      button.classList.toggle('is-active', filter.key === this.filter);
      button.textContent = this.texts[filter.labelKey];
      button.addEventListener('click', () => {
        this.filter = filter.key;
        this.render();
      });
      filters.appendChild(button);
    }
    column.appendChild(filters);

    const list = document.createElement('ul');
    list.className = 'inventory-modal__list';
    const entries = this.entries().filter(
      (entry) => this.filter === 'all' || entry.type === this.filter,
    );
    if (entries.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'overlay-muted';
      empty.textContent = this.texts['inventory.filterEmpty'];
      list.appendChild(empty);
    }
    for (const entry of entries) {
      const item = document.createElement('li');
      item.className = 'inventory-modal__item';
      item.classList.toggle('is-selected', entry.key === this.selectedKey);
      item.classList.toggle('is-equipped', Boolean(entry.slot));
      item.tabIndex = 0;

      const name = document.createElement('span');
      name.className = 'inventory-modal__item-name';
      name.textContent = entry.name;
      const meta = document.createElement('span');
      meta.className = 'overlay-muted';
      meta.textContent = entry.type === 'item'
        ? this.t('inventory.uses', { n: entry.item.remaining })
        : entry.slot
          ? this.texts['inventory.equipped']
          : this.texts['inventory.notEquipped'];
      item.append(name, meta);

      item.addEventListener('click', () => {
        this.selectedKey = entry.key;
        this.render();
      });
      item.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        this.selectedKey = entry.key;
        this.render();
      });
      list.appendChild(item);
    }
    column.appendChild(list);
    return column;
  }

  buildEquipColumn() {
    const column = document.createElement('section');
    column.className = 'inventory-modal__col';

    const title = document.createElement('h4');
    title.textContent = this.texts['inventory.current'];
    column.appendChild(title);

    const slots = document.createElement('div');
    slots.className = 'inventory-modal__slots';
    const byId = new Map(this.snapshot.weapons.map((weapon) => [weapon.id, weapon]));
    for (const slot of SLOTS) {
      const list = this.snapshot.equipment[`${slot.group}Weapons`] ?? [];
      const weapon = byId.get(list[slot.index]);
      const card = document.createElement('div');
      card.className = 'inventory-modal__slot';
      const label = document.createElement('span');
      label.className = 'overlay-muted';
      label.textContent = this.texts[slot.labelKey];
      const value = document.createElement('strong');
      value.textContent = weapon?.name ?? this.texts['panel.itemEmpty'];
      card.append(label, value);
      slots.appendChild(card);
    }
    column.appendChild(slots);

    column.appendChild(this.buildDetail());
    return column;
  }

  buildDetail() {
    const detail = document.createElement('div');
    detail.className = 'inventory-modal__detail';
    const entry = this.entrySelected();
    if (!entry) {
      const empty = document.createElement('p');
      empty.className = 'overlay-muted';
      empty.textContent = this.texts['inventory.empty'];
      detail.appendChild(empty);
      return detail;
    }

    const head = document.createElement('div');
    head.className = 'inventory-modal__detail-head';
    const name = document.createElement('strong');
    name.textContent = entry.name;
    const category = document.createElement('span');
    category.className = 'overlay-muted';
    category.textContent = this.texts[`inventory.category.${entry.type}`] ?? entry.type;
    head.append(name, category);
    detail.appendChild(head);

    if (entry.weapon) {
      for (const [type, labelKey] of [
        ['normal', 'inventory.attack.normal'],
        ['special', 'inventory.attack.special'],
      ]) {
        const attack = entry.weapon.attacks[type];
        if (!attack) continue;
        const line = document.createElement('p');
        line.className = 'inventory-modal__line';
        line.textContent = this.t('inventory.attackLine', {
          name: this.texts[labelKey],
          cost: toFixed1(attack.rageCost),
          damage: toFixed1(attack.damage),
          cut: toFixed1(attack.bossRageCut),
        });
        detail.appendChild(line);
      }
      detail.appendChild(this.buildEnhance(entry.weapon));
      return detail;
    }

    const heal = document.createElement('p');
    heal.className = 'inventory-modal__line';
    heal.textContent = this.t('inventory.heal', { value: toFixed1(entry.item.heal) });
    const uses = document.createElement('p');
    uses.className = 'inventory-modal__line';
    uses.textContent = this.t('inventory.uses', { n: entry.item.remaining });
    detail.append(heal, uses);
    return detail;
  }

  buildEnhance(weapon) {
    const wrap = document.createElement('div');
    wrap.className = 'inventory-modal__enhance';

    const level = document.createElement('span');
    level.textContent = this.t('inventory.enhanceLevel', { level: weapon.enhanceLevel });
    wrap.appendChild(level);

    const category = weapon.category === 'special' ? 'specialWeapon' : 'normalWeapon';
    const count = this.snapshot.enhanceCounts[category] ?? 0;
    const countEl = document.createElement('span');
    countEl.className = 'overlay-muted';
    countEl.textContent = this.t('inventory.enhanceCount', { n: count });
    wrap.appendChild(countEl);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'overlay-button';
    button.textContent = this.texts['inventory.enhance'];
    const maxed = weapon.enhanceLevel >= this.snapshot.enhanceMax;
    button.disabled = this.snapshot.inBattle || maxed || count <= 0;
    if (this.snapshot.inBattle) button.title = this.texts['inventory.battleLocked'];
    else if (maxed) button.title = this.texts['inventory.enhanceMax'];
    else if (count <= 0) button.title = this.texts['inventory.noCount'];
    button.addEventListener('click', () => this.enhance(weapon.id));
    wrap.appendChild(button);
    return wrap;
  }

  enhance(weaponId) {
    const result = this.api.ctx.enhanceWeapon(weaponId);
    if (result.ok) {
      this.snapshot = this.api.ctx.getInventorySnapshot();
      this.selectedKey = weaponId;
    }
    this.render();
  }

  buildStatsColumn() {
    const column = document.createElement('section');
    column.className = 'inventory-modal__col';

    const title = document.createElement('h4');
    title.textContent = this.texts['inventory.stats'];
    column.appendChild(title);

    const stats = this.snapshot.stats;
    const rows = [
      { labelKey: 'inventory.hp', value: stats.maxHp.toFixed(0) },
      { labelKey: 'inventory.rage', value: stats.maxRage.toFixed(1) },
      { labelKey: 'inventory.attack', value: stats.attackPower.toFixed(1) },
      { labelKey: 'inventory.gold', value: String(stats.gold) },
      { labelKey: 'inventory.skillPoints', value: String(stats.skillPoints) },
    ];
    const list = document.createElement('dl');
    list.className = 'inventory-modal__stats';
    for (const row of rows) {
      const label = document.createElement('dt');
      label.textContent = this.texts[row.labelKey];
      const value = document.createElement('dd');
      value.textContent = row.value;
      list.append(label, value);
    }
    column.appendChild(list);
    return column;
  }
}
