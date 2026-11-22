// 组合根：加载配置 → 校验 → 创建 RunController / SceneShell / SceneManager → 启动首个场景。
// 只有这里可以同时 import data / state / meta / scenes / game，并由它注入场景工厂与战斗门面。

import { loadConfig } from './data/ConfigLoader.js';
import { validateConfig } from './data/Validator.js';
import { Rng } from './game/Rng.js';
import { BattleModule } from './game/BattleModule.js';
import { RunController } from './meta/RunController.js';
import { SceneManager } from './meta/SceneManager.js';
import { createSceneContext } from './meta/SceneContext.js';
import { SceneShell } from './scenes/SceneShell.js';
import { createHomeScene } from './scenes/HomeScene.js';
import { createMapScene } from './scenes/MapScene.js';
import { createBattleScene } from './scenes/BattleScene.js';
import { createEventScene } from './scenes/EventScene.js';
import { createChestScene } from './scenes/ChestScene.js';

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

    const query = new URLSearchParams(window.location.search);
    const seed = Number(query.get('seed')) || 20261118;
    const floor = Math.max(1, Number(query.get('floor')) || 1);
    const transitionMs = config.scenes.transition?.durationMs ?? 320;

    const runController = new RunController({ config, seed: seed });
    const shell = new SceneShell({ root, config, transitionMs });

    const manager = new SceneManager({
      host: shell,
      scenes: {
        home: createHomeScene,
        map: createMapScene,
        battle: createBattleScene,
        event: createEventScene,
        chest: createChestScene,
      },
      loadingText: config.ui.texts['scene.loading'],
      transitionMs,
    });

    // 每场战斗使用独立 Rng，避免同一次会话内重复同一套 Boss 意图。
    let battleCount = 0;
    const context = createSceneContext({
      manager,
      runController,
      config,
      createBattle: () => {
        battleCount += 1;
        return new BattleModule({ config, rng: new Rng(seed + battleCount) });
      },
      openInventory: (options) => shell.openInventory(options),
      closeInventory: () => shell.closeInventory(),
    });

    manager.setContext(context);
    shell.setContext(context);

    // 调试入口：?scene=battle 直接进战斗，?scene=map 直接进路线图。
    const requested = query.get('scene');
    if (requested === 'battle' || requested === 'map') {
      runController.startRun({ floor });
    }

    await manager.start(requested ?? 'home', {
      bossId: query.get('boss') ?? undefined,
      nodeId: requested ? `debug_${requested}` : undefined,
    });

    // 预留: 供控制台调试与自动化验收使用。
    window.game = { manager, runController, shell };
  } catch (error) {
    console.error(error);
    showBootError(root, error);
  }
}

boot();
