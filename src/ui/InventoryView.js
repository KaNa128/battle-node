// 背包视图：两栏布局（左库存 / 右当前装备），支持类型筛选、悬停详情、右键菜单。
// 战斗中只读：装备与退还不能执行，升级树与铸魂状态仅可查看。
// 该组件只渲染快照，不修改任何战斗或局内状态。

import { toFixed1 } from '../utils/math.js';
import { attachTooltip, hideTooltip } from './Tooltip.js';

const SLOT_DEFS = [
  { key: 'normal1', group: 'normal', index: 0, labelKey: 'inventory.slot.normal1' },
  { key: 'normal2', group: 'normal', index: 1, labelKey: 'inventory.slot.normal2' },
  { key: 'special1', group: 'special', index: 0, labelKey: 'inventory.slot.special1' },
  { key: 'special2', group: 'special', index: 1, labelKey: 'inventory.slot.special2' },
];

const FILTERS = [
  { key: 'all', labelKey: 'inventory.filter.all' },
  { key: 'normal', labelKey: 'inventory.filter.normal' },
  { key: 'special', labelKey: 'inventory.filter.special' },
  { key: 'item', labelKey: 'inventory.filter.item' },
  { key: 'accessory', labelKey: 'inventory.filter.accessory' },
];

export class InventoryView {
  constructor({ container, config, texts, inBattle = true }) {
    this.config = config;
    this.texts = texts;
    this.inBattle = inBattle;
    this.weapons = config.weapons.weapons;
    this.items = config.items.items;
    this.accessories = config.accessories?.accessories ?? [];

    this.snapshot = null;
    this.filter = 'all';
    this.selectedKey = null;
    this.detailTab = 'detail';
    this.menuEntry = null;

    this.build(container);
    this.bindGlobalEvents();
  }

  t(key, vars = {}) {
    let template = this.texts[key] ?? key;
    for (const [name, value] of Object.entries(vars)) {
      template = template.replaceAll(`{${name}}`, String(value));
    }
    return template;
  }

  // ---- 构建 ---------------------------------------------------------

  build(container) {
    this.overlay = document.createElement('div');
    this.overlay.className = 'inventory-overlay hidden';
    this.overlay.innerHTML = `
      <div class="inventory-panel" role="dialog" aria-modal="true">
        <header class="inventory-header">
          <div class="inventory-header__title">
            <h2></h2>
            <span class="inventory-header__hint"></span>
          </div>
          <button type="button" class="inventory-close"></button>
        </header>
        <div class="inventory-body">
          <section class="inventory-column inventory-column--stock">
            <div class="inventory-filters"></div>
            <ul class="inventory-list"></ul>
          </section>
          <section class="inventory-column inventory-column--equip">
            <h3 class="inventory-section-title"></h3>
            <div class="inventory-equipment"></div>
            <div class="inventory-accessories">
              <h4 class="inventory-subtitle"></h4>
              <div class="inventory-accessory-list"></div>
            </div>
            <div class="inventory-detail">
              <div class="inventory-tabs"></div>
              <div class="inventory-detail__body"></div>
            </div>
          </section>
        </div>
      </div>
    `;
    container.appendChild(this.overlay);

    this.menu = document.createElement('div');
    this.menu.className = 'inventory-menu hidden';
    document.body.appendChild(this.menu);

    this.overlay.querySelector('.inventory-header h2').textContent = this.texts['inventory.title'];
    this.hintEl = this.overlay.querySelector('.inventory-header__hint');
    this.hintEl.textContent = this.texts['inventory.battleHint'];
    this.closeButton = this.overlay.querySelector('.inventory-close');
    this.closeButton.textContent = this.texts['inventory.close'];
    this.closeButton.setAttribute('aria-label', this.texts['inventory.close']);
    this.closeButton.addEventListener('click', () => this.close());

    this.filtersEl = this.overlay.querySelector('.inventory-filters');
    this.listEl = this.overlay.querySelector('.inventory-list');
    this.equipmentEl = this.overlay.querySelector('.inventory-equipment');
    this.accessoriesEl = this.overlay.querySelector('.inventory-accessory-list');
    this.tabsEl = this.overlay.querySelector('.inventory-tabs');
    this.detailEl = this.overlay.querySelector('.inventory-detail__body');
    this.overlay.querySelector('.inventory-column--equip .inventory-section-title').textContent =
      this.texts['inventory.current'];
    this.overlay.querySelector('.inventory-subtitle').textContent =
      this.texts['inventory.filter.accessory'];

    this.buildFilters();
    this.buildTabs();

    this.overlay.addEventListener('click', (event) => {
      if (event.target === this.overlay) this.close();
    });
    this.overlay.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  buildFilters() {
    for (const filter of FILTERS) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'inventory-filter';
      button.dataset.filter = filter.key;
      button.textContent = this.texts[filter.labelKey];
      button.addEventListener('click', () => {
        this.filter = filter.key;
        const visible = this.buildEntries().filter(
          (entry) => filter.key === 'all' || entry.type === filter.key,
        );
        if (!visible.some((entry) => entry.key === this.selectedKey)) {
          this.selectedKey = visible[0]?.key ?? null;
          this.detailTab = 'detail';
        }
        this.render();
      });
      this.filtersEl.appendChild(button);
    }
  }

  buildTabs() {
    const tabs = [
      { key: 'detail', labelKey: 'inventory.section.detail' },
      { key: 'upgrade', labelKey: 'inventory.section.upgrade' },
      { key: 'soulforge', labelKey: 'inventory.section.soulforge' },
    ];
    for (const tab of tabs) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'inventory-tab';
      button.dataset.tab = tab.key;
      button.textContent = this.texts[tab.labelKey];
      button.addEventListener('click', () => {
        this.detailTab = tab.key;
        this.renderDetail();
      });
      this.tabsEl.appendChild(button);
    }
  }

  bindGlobalEvents() {
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      if (!this.menu.classList.contains('hidden')) {
        this.closeMenu();
        return;
      }
      if (this.isOpen()) this.close();
    });
    document.addEventListener('pointerdown', (event) => {
      if (this.menu.classList.contains('hidden')) return;
      if (!this.menu.contains(event.target)) this.closeMenu();
    });
    window.addEventListener('resize', () => this.closeMenu());
  }

  // ---- 数据 ---------------------------------------------------------

  buildEntries() {
    const equipped = this.equippedMap();
    const entries = [];

    for (const weapon of this.weapons) {
      const slot = equipped.get(weapon.id) ?? null;
      entries.push({
        key: `weapon:${weapon.id}`,
        type: weapon.category,
        id: weapon.id,
        name: weapon.name,
        data: weapon,
        slot,
      });
    }

    const remainingById = new Map(
      (this.snapshot?.items ?? []).map((item) => [item.id, item.remaining]),
    );
    for (const item of this.items) {
      entries.push({
        key: `item:${item.id}`,
        type: 'item',
        id: item.id,
        name: item.name,
        data: item,
        remaining: remainingById.get(item.id) ?? 0,
        slot: null,
      });
    }

    for (const accessory of this.accessories) {
      entries.push({
        key: `accessory:${accessory.id}`,
        type: 'accessory',
        id: accessory.id,
        name: accessory.name,
        data: accessory,
        slot: null,
      });
    }

    return entries;
  }

  equippedMap() {
    const map = new Map();
    const equipment = this.snapshot?.equipment ?? {};
    for (const slot of SLOT_DEFS) {
      const list = equipment[`${slot.group}Weapons`] ?? [];
      const weaponId = list[slot.index];
      if (weaponId) map.set(weaponId, slot);
    }
    return map;
  }

  entryByKey(key) {
    return this.buildEntries().find((entry) => entry.key === key) ?? null;
  }

  // ---- 打开 / 关闭 ---------------------------------------------------

  // options.inBattle / options.hint 由外层场景决定：同一份背包实例可服务战斗内外。
  open(snapshot, options = {}) {
    if (options.inBattle !== undefined) this.inBattle = Boolean(options.inBattle);
    if (options.hint !== undefined) this.hintEl.textContent = options.hint;
    this.snapshot = snapshot;
    this.filter = 'all';
    this.detailTab = 'detail';
    const first = this.buildEntries().find((entry) => entry.type === 'normal');
    this.selectedKey = first?.key ?? null;
    this.overlay.classList.remove('hidden');
    document.body.classList.add('inventory-open');
    this.render();
    this.closeButton.focus();
  }

  close() {
    this.closeMenu();
    hideTooltip();
    this.overlay.classList.add('hidden');
    document.body.classList.remove('inventory-open');
  }

  isOpen() {
    return !this.overlay.classList.contains('hidden');
  }

  // ---- 渲染 ---------------------------------------------------------

  render() {
    if (!this.snapshot) return;
    hideTooltip();
    this.closeMenu();
    this.renderFilters();
    this.renderList();
    this.renderEquipment();
    this.renderAccessories();
    this.renderTabs();
    this.renderDetail();
  }

  renderFilters() {
    for (const button of this.filtersEl.querySelectorAll('.inventory-filter')) {
      button.classList.toggle('is-active', button.dataset.filter === this.filter);
    }
  }

  renderList() {
    this.listEl.innerHTML = '';
    const entries = this.buildEntries().filter(
      (entry) => this.filter === 'all' || entry.type === this.filter,
    );

    if (entries.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'inventory-empty';
      empty.textContent = this.texts['inventory.filterEmpty'];
      this.listEl.appendChild(empty);
      return;
    }

    for (const entry of entries) {
      const item = document.createElement('li');
      item.className = 'inventory-item';
      item.dataset.key = entry.key;
      item.classList.toggle('is-equipped', Boolean(entry.slot));
      item.classList.toggle('is-selected', entry.key === this.selectedKey);
      item.tabIndex = 0;

      const glyph = document.createElement('span');
      glyph.className = 'inventory-item__glyph';
      glyph.textContent = entry.name.slice(0, 1);

      const main = document.createElement('div');
      main.className = 'inventory-item__main';
      const name = document.createElement('span');
      name.className = 'inventory-item__name';
      name.textContent = entry.name;
      const meta = document.createElement('span');
      meta.className = 'inventory-item__meta';
      meta.textContent = this.entryMeta(entry);
      main.append(name, meta);

      const actions = document.createElement('button');
      actions.type = 'button';
      actions.className = 'inventory-item__menu';
      actions.textContent = '⋯';
      actions.setAttribute('aria-label', this.texts['inventory.menuLabel']);
      actions.addEventListener('click', (event) => {
        event.stopPropagation();
        const rect = actions.getBoundingClientRect();
        this.openMenu(entry, rect.left, rect.bottom + 4);
      });

      item.append(glyph, main, actions);

      const tooltip = this.entryTooltip(entry);
      if (tooltip) attachTooltip(item, () => tooltip);

      item.addEventListener('click', () => {
        this.selectedKey = entry.key;
        this.detailTab = 'detail';
        this.render();
      });
      item.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        this.selectedKey = entry.key;
        this.detailTab = 'detail';
        this.render();
      });
      item.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.selectedKey = entry.key;
        this.detailTab = 'detail';
        this.render();
        this.openMenu(entry, event.clientX, event.clientY);
      });

      this.listEl.appendChild(item);
    }
  }

  renderEquipment() {
    this.equipmentEl.innerHTML = '';
    const equipped = this.equippedMap();
    const bySlot = new Map();
    for (const [weaponId, slot] of equipped) {
      const weapon = this.weapons.find((entry) => entry.id === weaponId);
      if (weapon) bySlot.set(slot.key, weapon);
    }

    for (const slot of SLOT_DEFS) {
      const weapon = bySlot.get(slot.key);
      const entry = weapon ? this.entryByKey(`weapon:${weapon.id}`) : null;
      const card = document.createElement('div');
      card.className = 'inventory-slot';
      card.tabIndex = 0;

      const label = document.createElement('span');
      label.className = 'inventory-slot__label';
      label.textContent = this.texts[slot.labelKey];

      const value = document.createElement('span');
      value.className = 'inventory-slot__value';
      value.textContent = weapon?.name ?? this.texts['panel.itemEmpty'];

      card.append(label, value);
      if (entry) {
        card.classList.toggle('is-selected', entry.key === this.selectedKey);
        const tooltip = this.entryTooltip(entry);
        if (tooltip) attachTooltip(card, () => tooltip);
        card.addEventListener('click', () => {
          this.selectedKey = entry.key;
          this.detailTab = 'detail';
          this.render();
        });
        card.addEventListener('contextmenu', (event) => {
          event.preventDefault();
          this.selectedKey = entry.key;
          this.detailTab = 'detail';
          this.render();
          this.openMenu(entry, event.clientX, event.clientY);
        });
      }
      this.equipmentEl.appendChild(card);
    }
  }

  renderAccessories() {
    this.accessoriesEl.innerHTML = '';
    if (this.accessories.length === 0) {
      const empty = document.createElement('span');
      empty.className = 'inventory-accessory-empty';
      empty.textContent = this.texts['inventory.accessoryEmpty'];
      this.accessoriesEl.appendChild(empty);
      return;
    }
    for (const accessory of this.accessories) {
      const chip = document.createElement('span');
      chip.className = 'inventory-accessory-chip';
      chip.textContent = accessory.name;
      this.accessoriesEl.appendChild(chip);
    }
  }

  renderTabs() {
    const entry = this.entryByKey(this.selectedKey);
    const weaponSelected = entry?.type === 'normal' || entry?.type === 'special';
    if (!weaponSelected && this.detailTab !== 'detail') this.detailTab = 'detail';
    for (const button of this.tabsEl.querySelectorAll('.inventory-tab')) {
      const isWeaponTab = button.dataset.tab !== 'detail';
      button.classList.toggle('is-active', button.dataset.tab === this.detailTab);
      button.disabled = isWeaponTab && !weaponSelected;
    }
  }

  renderDetail() {
    const entry = this.entryByKey(this.selectedKey);
    this.tabsEl.classList.toggle('hidden', !entry);
    this.detailEl.innerHTML = '';
    if (!entry) {
      const empty = document.createElement('p');
      empty.className = 'inventory-empty';
      empty.textContent = this.texts['inventory.empty'];
      this.detailEl.appendChild(empty);
      return;
    }

    const head = document.createElement('div');
    head.className = 'inventory-detail__head';
    const name = document.createElement('strong');
    name.textContent = entry.name;
    const meta = document.createElement('span');
    meta.textContent = this.categoryLabel(entry);
    head.append(name, meta);
    this.detailEl.appendChild(head);

    if (this.detailTab === 'upgrade' || this.detailTab === 'soulforge') {
      const note = document.createElement('p');
      note.className = 'inventory-detail__note';
      note.textContent =
        this.detailTab === 'upgrade'
          ? this.texts['inventory.upgradeEmpty']
          : this.texts['inventory.soulforgeEmpty'];
      this.detailEl.appendChild(note);
      return;
    }

    for (const line of this.detailLines(entry)) {
      const row = document.createElement('p');
      row.className = 'inventory-detail__line';
      row.textContent = line;
      this.detailEl.appendChild(row);
    }
  }

  // ---- 右键菜单 -----------------------------------------------------

  openMenu(entry, x, y) {
    this.menuEntry = entry;
    this.menu.innerHTML = '';

    const options = [
      { key: 'equip', labelKey: 'inventory.menu.equip' },
      { key: 'upgrade', labelKey: 'inventory.menu.upgrade' },
      { key: 'soulforge', labelKey: 'inventory.menu.soulforge' },
      { key: 'unequip', labelKey: 'inventory.menu.unequip' },
    ];

    for (const option of options) {
      const state = this.menuOptionState(entry, option.key);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'inventory-menu__item';
      button.textContent = this.texts[option.labelKey];
      button.disabled = !state.enabled;
      if (!state.enabled && state.reason) button.title = state.reason;
      button.addEventListener('click', () => {
        if (!state.enabled) return;
        this.closeMenu();
        this.runMenuAction(entry, option.key);
      });
      this.menu.appendChild(button);
    }

    this.menu.classList.remove('hidden');
    const rect = this.menu.getBoundingClientRect();
    const left = Math.max(8, Math.min(x, window.innerWidth - rect.width - 8));
    const top = Math.max(8, Math.min(y, window.innerHeight - rect.height - 8));
    this.menu.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
  }

  closeMenu() {
    this.menu.classList.add('hidden');
    this.menuEntry = null;
  }

  menuOptionState(entry, action) {
    const isWeapon = entry.type === 'normal' || entry.type === 'special';
    if (action === 'upgrade' || action === 'soulforge') {
      return {
        enabled: isWeapon,
        reason: this.texts['inventory.reason.notWeapon'],
      };
    }
    if (action === 'equip') {
      if (!isWeapon) return { enabled: false, reason: this.texts['inventory.reason.notWeapon'] };
      if (entry.slot) return { enabled: false, reason: this.texts['inventory.equipped'] };
      if (this.inBattle) return { enabled: false, reason: this.texts['inventory.reason.battle'] };
      return { enabled: false, reason: this.texts['inventory.reason.unavailable'] };
    }
    // 退还
    if (!isWeapon) return { enabled: false, reason: this.texts['inventory.reason.notWeapon'] };
    if (!entry.slot) return { enabled: false, reason: this.texts['inventory.reason.notEquipped'] };
    return {
      enabled: false,
      reason: this.inBattle
        ? this.texts['inventory.reason.battle']
        : this.texts['inventory.reason.unavailable'],
    };
  }

  runMenuAction(entry, action) {
    this.selectedKey = entry.key;
    if (action === 'upgrade') {
      this.detailTab = 'upgrade';
      this.render();
      return;
    }
    if (action === 'soulforge') {
      this.detailTab = 'soulforge';
      this.render();
    }
  }

  // ---- 文案 ---------------------------------------------------------

  entryMeta(entry) {
    if (entry.type === 'item') {
      return this.t('inventory.uses', { n: entry.remaining });
    }
    if (entry.slot) return this.texts['inventory.equipped'];
    return this.texts['inventory.notEquipped'];
  }

  categoryLabel(entry) {
    return this.texts[`inventory.category.${entry.type}`] ?? entry.type;
  }

  attackLines(weapon) {
    const lines = [];
    for (const [type, labelKey] of [
      ['normal', 'inventory.attack.normal'],
      ['special', 'inventory.attack.special'],
    ]) {
      const attack = weapon.attacks?.[type];
      if (!attack) continue;
      lines.push(
        this.t('inventory.attackLine', {
          name: this.texts[labelKey],
          cost: toFixed1(attack.rageCost),
          damage: toFixed1(attack.damage),
          cut: toFixed1(attack.bossRageCut),
        }),
      );
    }
    return lines;
  }

  detailLines(entry) {
    if (entry.type === 'normal' || entry.type === 'special') {
      const lines = [];
      if (entry.slot) {
        lines.push(this.t('inventory.equipSlot', { slot: this.texts[entry.slot.labelKey] }));
      }
      return lines.concat(this.attackLines(entry.data));
    }
    if (entry.type === 'item') {
      return [
        this.t('inventory.heal', { value: toFixed1(entry.data.heal ?? 0) }),
        this.t('inventory.uses', { n: entry.remaining }),
        this.t('inventory.usesPerBattle', { n: entry.data.usesPerBattle ?? 0 }),
      ];
    }
    return [entry.data.description ?? this.texts['inventory.accessoryEmpty']];
  }

  entryTooltip(entry) {
    const lines = [entry.name, this.categoryLabel(entry)];
    if (entry.type === 'item') {
      lines.push(this.t('inventory.heal', { value: toFixed1(entry.data.heal ?? 0) }));
      lines.push(this.t('inventory.uses', { n: entry.remaining }));
    } else if (entry.type === 'accessory') {
      if (entry.data.description) lines.push(entry.data.description);
    } else {
      if (entry.slot) lines.push(this.t('inventory.equipSlot', { slot: this.texts[entry.slot.labelKey] }));
      lines.push(...this.attackLines(entry.data));
    }
    return lines.filter(Boolean).join('\n');
  }
}
