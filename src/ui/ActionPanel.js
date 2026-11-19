// 操作面板：完全按 battle.config.json.panel 渲染；只发键位意图，不计算数值。
// 普通武器只渲染当前手持的一对按钮：1.1 在上、1.2 在下，
// 切换入队后同一对按钮原地变为 2.1 / 2.2，撤回后恢复。

export class ActionPanel {
  constructor({ container, config, texts, onKey, onInventory }) {
    this.config = config;
    this.texts = texts;
    this.onKey = onKey;
    this.onInventory = onInventory;
    this.buttons = [];
    this.staticButtons = new Map();
    this.interactive = false;
    this.weaponMap = new Map(config.weapons.weapons.map((weapon) => [weapon.id, weapon]));
    this.itemMap = new Map(config.items.items.map((item) => [item.id, item]));

    this.root = document.createElement('div');
    this.root.className = 'action-panel';
    this.build();
    container.appendChild(this.root);
  }

  createButton(key, extraClass = '') {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `action-button ${extraClass}`.trim();
    button.dataset.key = key ?? '';
    // 普通武器键位会在切换时原地变化，点击时读取当前键位。
    button.addEventListener('click', () => {
      const currentKey = button.dataset.key;
      if (currentKey) this.onKey(currentKey);
    });
    this.buttons.push(button);
    if (key) this.staticButtons.set(key, button);
    return button;
  }

  build() {
    const panel = this.config.battleConfig.panel;

    // 第一列：当前手持普通武器 + 切换 / 格挡
    const normalSection = document.createElement('div');
    normalSection.className = 'panel-section panel-section--normal';

    this.normalTitle = document.createElement('div');
    this.normalTitle.className = 'panel-slot__title';

    this.normalButton = this.createButton('', 'action-button--normal');
    this.specialButton = this.createButton('', 'action-button--special');

    const weaponRow = document.createElement('div');
    weaponRow.className = 'panel-weapon__row';
    this.switchButton = this.createButton(panel.switchKey, 'action-button--switch');
    this.defendButton = this.createButton(panel.defendKey, 'action-button--defend');
    weaponRow.append(this.switchButton, this.defendButton);

    normalSection.append(this.normalTitle, this.normalButton, weaponRow, this.specialButton);

    // 背包入口固定在操作区左下角，与线框图一致；不属于战斗指令，不参与可用性判定。
    this.bagButton = document.createElement('button');
    this.bagButton.type = 'button';
    this.bagButton.className = 'action-button action-button--bag';
    this.bagButton.textContent = this.texts['label.inventory'];
    this.bagButton.addEventListener('click', () => this.onInventory?.());
    normalSection.appendChild(this.bagButton);

    // 第二列：特殊武器（常驻，仅普攻）
    const specialSection = document.createElement('div');
    specialSection.className = 'panel-section panel-section--special';
    const specialStack = document.createElement('div');
    specialStack.className = 'panel-stack';
    for (const group of panel.specialGroup) {
      specialStack.appendChild(this.createButton(group.key, 'action-button--special'));
    }
    specialSection.appendChild(specialStack);

    // 第三列：药品
    const itemSection = document.createElement('div');
    itemSection.className = 'panel-section panel-section--item';
    const itemStack = document.createElement('div');
    itemStack.className = 'panel-stack';
    for (const group of panel.itemGroup) {
      itemStack.appendChild(this.createButton(group.key, 'action-button--item'));
    }
    itemSection.appendChild(itemStack);

    // 第四列：撤回 / 出招
    const utilSection = document.createElement('div');
    utilSection.className = 'panel-section panel-section--util';
    const utilStack = document.createElement('div');
    utilStack.className = 'panel-stack';
    utilStack.append(
      this.createButton(panel.undoKey, 'action-button--undo'),
      this.createButton(panel.submitKey, 'action-button--submit'),
    );
    utilSection.appendChild(utilStack);

    this.root.append(normalSection, specialSection, itemSection, utilSection);
  }

  setInteractive(interactive) {
    this.interactive = interactive;
  }

  setButtonLabel(button, text) {
    button.textContent = text;
  }

  render(snapshot) {
    const panel = this.config.battleConfig.panel;
    const { activeSlot, activeWeaponId, switchCooldownRemaining } = snapshot.panel;

    // 只渲染当前手持武器的一对按钮；切换入队后 activeSlot 变化，按钮原地换键位。
    const group =
      panel.normalGroup.find((entry) => entry.slot === activeSlot) ?? panel.normalGroup[0];
    const weapon = this.weaponMap.get(activeWeaponId);
    this.normalTitle.textContent = this.texts['panel.slot']
      .replace('{key}', String(group.slot))
      .replace('{name}', weapon?.name ?? '—');

    this.normalButton.dataset.key = group.keys.normal;
    this.specialButton.dataset.key = group.keys.special;
    this.setButtonLabel(this.normalButton, `${group.keys.normal} ${this.texts['panel.normal']}`);
    this.setButtonLabel(
      this.specialButton,
      `${group.keys.special} ${this.texts['panel.special']} (${snapshot.specialUses.remaining})`,
    );

    for (const groupEntry of panel.specialGroup) {
      const weaponEntry = this.weaponMap.get(groupEntry.weaponId);
      const button = this.staticButtons.get(groupEntry.key);
      if (button) {
        this.setButtonLabel(
          button,
          `${groupEntry.key} ${weaponEntry?.name ?? groupEntry.weaponId}`,
        );
      }
    }

    for (const groupEntry of panel.itemGroup) {
      const button = this.staticButtons.get(groupEntry.key);
      if (!button) continue;
      if (!groupEntry.itemId) {
        this.setButtonLabel(button, `${groupEntry.key} ${this.texts['panel.itemEmpty']}`);
        continue;
      }
      const item = this.itemMap.get(groupEntry.itemId);
      const runtime = snapshot.items.find((entry) => entry.id === groupEntry.itemId);
      const remaining = runtime?.remaining ?? 0;
      this.setButtonLabel(button, `${groupEntry.key} ${item?.name ?? groupEntry.itemId} (${remaining})`);
    }

    if (this.switchButton) {
      const cooldown = switchCooldownRemaining > 0 ? ` (${switchCooldownRemaining})` : '';
      this.setButtonLabel(this.switchButton, `${this.texts['panel.switch']}${cooldown}`);
    }
    if (this.defendButton) this.setButtonLabel(this.defendButton, this.texts['panel.defend']);
    const undoButton = this.staticButtons.get(panel.undoKey);
    if (undoButton) this.setButtonLabel(undoButton, this.texts['panel.undo']);
    const submitButton = this.staticButtons.get(panel.submitKey);
    if (submitButton) this.setButtonLabel(submitButton, this.texts['panel.submit']);

    for (const button of this.buttons) {
      const key = button.dataset.key;
      const available = Boolean(key && snapshot.availability[key]);
      const enabled = this.interactive && available;
      button.disabled = !enabled;
      button.classList.toggle('is-disabled', !enabled);
    }
  }
}
