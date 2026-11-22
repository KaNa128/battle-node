// 设置浮层视觉：仅写 localStorage 的 UI 偏好，不影响局内进度。

const STORAGE_KEY = 'wuxia.uiSettings';

function loadSettings() {
  try {
    return { motion: true, sound: true, confirm: false, ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') };
  } catch {
    return { motion: true, sound: true, confirm: false };
  }
}

export class SettingsModal {
  constructor({ texts }) {
    this.texts = texts;
    this.settings = loadSettings();
  }

  mount(container, _snapshot, api) {
    this.api = api;
    this.container = container;
    this.render();
  }

  render() {
    this.container.innerHTML = '';
    this.container.classList.add('settings-modal');

    const rows = [
      { key: 'motion', labelKey: 'overlay.settings.motion' },
      { key: 'sound', labelKey: 'overlay.settings.sound' },
      { key: 'confirm', labelKey: 'overlay.settings.confirm' },
    ];

    for (const row of rows) {
      const line = document.createElement('div');
      line.className = 'settings-modal__row';
      const label = document.createElement('span');
      label.textContent = this.texts[row.labelKey];
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'overlay-button';
      toggle.classList.toggle('is-on', Boolean(this.settings[row.key]));
      toggle.textContent = this.texts[
        this.settings[row.key] ? 'overlay.settings.on' : 'overlay.settings.off'
      ];
      toggle.addEventListener('click', () => this.toggle(row.key));
      line.append(label, toggle);
      this.container.appendChild(line);
    }
  }

  toggle(key) {
    this.settings[key] = !this.settings[key];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    this.render();
  }
}
