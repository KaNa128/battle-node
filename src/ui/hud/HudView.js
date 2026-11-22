// 顶部 HUD：背包 / 头像（技能树）/ 血量 / 杀气 / 金币 / 三类强化次数 / 设置。
// 只渲染 RunController 提供的快照，不计算任何属性或结算。

export class HudView {
  constructor({ container, texts, onAction }) {
    this.texts = texts;
    this.onAction = onAction;
    this.build(container);
  }

  t(key, vars = {}) {
    let template = this.texts[key] ?? key;
    for (const [name, value] of Object.entries(vars)) {
      template = template.replaceAll(`{${name}}`, String(value));
    }
    return template;
  }

  build(container) {
    this.root = document.createElement('div');
    this.root.className = 'hud';
    this.root.innerHTML = `
      <button type="button" class="hud__button hud__bag" data-hud-action="inventory"></button>
      <button type="button" class="hud__avatar" data-hud-action="skills"></button>
      <div class="hud__bars">
        <div class="hud__bar hud__bar--hp">
          <span class="hud__bar-label"></span>
          <span class="hud__bar-track"><span class="hud__bar-fill" data-hud="hp-fill"></span></span>
          <span class="hud__bar-value" data-hud="hp-value"></span>
        </div>
        <div class="hud__bar hud__bar--rage">
          <span class="hud__bar-label"></span>
          <span class="hud__bar-track"><span class="hud__bar-fill" data-hud="rage-fill"></span></span>
          <span class="hud__bar-value" data-hud="rage-value"></span>
        </div>
      </div>
      <div class="hud__gold">
        <span class="hud__gold-label"></span>
        <strong data-hud="gold"></strong>
      </div>
      <div class="hud__enhance" data-hud="enhance"></div>
      <button type="button" class="hud__button hud__settings" data-hud-action="settings"></button>
    `;
    container.appendChild(this.root);

    this.root.querySelector('.hud__bag').textContent = this.texts['hud.inventory'];
    this.root.querySelector('.hud__avatar').textContent = this.texts['player.name'].slice(0, 1);
    this.root.querySelector('.hud__settings').textContent = this.texts['hud.settings'];
    this.root.querySelector('.hud__bar--hp .hud__bar-label').textContent = this.texts['hud.hp'];
    this.root.querySelector('.hud__bar--rage .hud__bar-label').textContent = this.texts['hud.rage'];
    this.root.querySelector('.hud__gold-label').textContent = this.texts['hud.gold'];

    this.hpFill = this.root.querySelector('[data-hud="hp-fill"]');
    this.hpValue = this.root.querySelector('[data-hud="hp-value"]');
    this.rageFill = this.root.querySelector('[data-hud="rage-fill"]');
    this.rageValue = this.root.querySelector('[data-hud="rage-value"]');
    this.goldValue = this.root.querySelector('[data-hud="gold"]');
    this.enhanceEl = this.root.querySelector('[data-hud="enhance"]');

    for (const button of this.root.querySelectorAll('[data-hud-action]')) {
      button.addEventListener('click', () => this.onAction?.(button.dataset.hudAction));
    }
    this.buildEnhanceChips();
  }

  buildEnhanceChips() {
    const categories = [
      { key: 'normalWeapon', labelKey: 'hud.enhance.normal' },
      { key: 'specialWeapon', labelKey: 'hud.enhance.special' },
      { key: 'item', labelKey: 'hud.enhance.item' },
    ];
    this.enhanceEl.innerHTML = '';
    this.enhanceValues = new Map();
    for (const category of categories) {
      const chip = document.createElement('span');
      chip.className = `hud__chip hud__chip--${category.key}`;
      const label = document.createElement('span');
      label.className = 'hud__chip-label';
      label.textContent = this.texts[category.labelKey];
      const value = document.createElement('strong');
      value.className = 'hud__chip-value';
      chip.append(label, value);
      this.enhanceEl.appendChild(chip);
      this.enhanceValues.set(category.key, value);
    }
  }

  render(snapshot) {
    if (!snapshot) return;
    const hpRatio = snapshot.maxHp > 0 ? snapshot.hp / snapshot.maxHp : 0;
    this.hpFill.style.width = `${Math.max(0, Math.min(1, hpRatio)) * 100}%`;
    this.hpValue.textContent = `${snapshot.hp.toFixed(0)} / ${snapshot.maxHp.toFixed(0)}`;

    // 杀气条固定显示上限，战斗外按满条渲染。
    this.rageFill.style.width = '100%';
    this.rageValue.textContent = snapshot.maxRage.toFixed(1);

    this.goldValue.textContent = String(snapshot.gold);
    for (const [key, element] of this.enhanceValues) {
      element.textContent = String(snapshot.enhanceCounts?.[key] ?? 0);
    }
  }
}
