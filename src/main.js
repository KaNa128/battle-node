// 启动装配：加载配置 → 校验 → 构建模块 → 绑定 UI。
// 只允许通过 BattleModule 门面驱动战斗。

import { loadConfig } from './data/ConfigLoader.js';
import { validateConfig } from './data/Validator.js';
import { Rng } from './game/Rng.js';
import { BattleModule } from './game/BattleModule.js';
import { RunState } from './state/RunState.js';
import { BattleView } from './ui/BattleView.js';
import { BattlePresenter } from './ui/bridge/BattlePresenter.js';

function showBootError(root, error) {
  root.innerHTML = '';
  const box = document.createElement('div');
  box.className = 'boot-error';

  const title = document.createElement('h1');
  title.textContent = '启动失败';
  const detail = document.createElement('pre');
  detail.textContent = `${error?.message ?? error}`;

  box.append(title, detail);
  root.appendChild(box);
}

async function boot() {
  const root = document.getElementById('app');
  try {
    const config = await loadConfig();
    validateConfig(config);

    const params = new URLSearchParams(window.location.search);
    const seed = Number(params.get('seed')) || 20261118;
    const floor = Math.max(1, Number(params.get('floor')) || 1);
    const bossId = params.get('boss') ?? config.bosses.bosses[0]?.id;

    const rng = new Rng(seed);
    const module = new BattleModule({ config, rng });
    const initialRun = new RunState({ config });

    let presenter = null;
    const view = new BattleView({
      root,
      config,
      onKey: (key) => presenter?.handleKey(key),
    });
    presenter = new BattlePresenter({ module, view, config });
    presenter.start({
      bossId,
      scaling: { floor },
      playerSavedData: initialRun.toSavedData(),
    });

    // 预留: 外层系统通过此实例唤醒战斗节点
    window.battleModule = module;
  } catch (error) {
    console.error(error);
    showBootError(root, error);
  }
}

boot();
