// 组合根：加载配置 → 校验 → 创建 RunController / SceneShell / OverlayManager / SceneManager → 启动首个场景。
// 只有这里可以同时 import data / state / meta / scenes / game，并由它注入场景工厂与战斗门面。

import { loadConfig } from './data/ConfigLoader.js';
import { validateConfig } from './data/Validator.js';
import { Rng } from './game/Rng.js';
import { BattleModule } from './game/BattleModule.js';
import { RunController } from './meta/RunController.js';
import { SaveManager } from './state/SaveManager.js';
import { SceneManager } from './meta/SceneManager.js';
import { createSceneContext } from './meta/SceneContext.js';
import { SceneShell } from './scenes/SceneShell.js';
import { createHomeScene } from './scenes/HomeScene.js';
import { createMapScene } from './scenes/MapScene.js';
import { createBattleScene } from './scenes/BattleScene.js';
import { OverlayManager } from './scenes/overlays/OverlayManager.js';
import { createInventoryOverlay } from './scenes/overlays/InventoryOverlay.js';
import { createEventOverlay } from './scenes/overlays/EventOverlay.js';
import { createChestOverlay } from './scenes/overlays/ChestOverlay.js';
import { createShopOverlay } from './scenes/overlays/ShopOverlay.js';
import { createSkillTreeOverlay } from './scenes/overlays/SkillTreeOverlay.js';
import { createSettingsOverlay } from './scenes/overlays/SettingsOverlay.js';

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
    const querySeed = Number(query.get('seed'));
    const debugSeed = Number.isInteger(querySeed) && querySeed > 0 ? querySeed : undefined;
    const seed = debugSeed ?? 20261118;
    const floor = Math.max(1, Number(query.get('floor')) || 1);
    const transitionMs = config.scenes.transition?.durationMs ?? 320;
    const texts = config.ui.texts;

    const saveManager = new SaveManager({
      schemaVersion: config.battleConfig.schemaVersion ?? 1,
    });
    const runController = new RunController({ config, seed, saveManager });
    // 读取失败（含高版本存档）只提示，不清理用户存档。
    try {
      const saved = await saveManager.load();
      if (saved) runController.restore(saved);
    } catch (error) {
      console.warn('读取存档失败，本次按新开局处理：', error);
    }
    const shell = new SceneShell({ root, config, transitionMs });

    const overlays = {
      inventory: createInventoryOverlay({ config, texts }),
      event: createEventOverlay({ config, texts }),
      chest: createChestOverlay({ config, texts }),
      shop: createShopOverlay({ config, texts }),
      skills: createSkillTreeOverlay({ config, texts }),
      settings: createSettingsOverlay({ config, texts }),
    };
    const overlayManager = new OverlayManager({
      host: shell.overlayHost,
      overlays,
      // 浮层关闭后刷新 HUD，保证金币 / 强化次数 / 技能点立即同步。
      onClose: () => shell.hud.render(runController.getHudSnapshot()),
    });

    const manager = new SceneManager({
      host: shell,
      scenes: {
        home: createHomeScene,
        map: createMapScene,
        battle: createBattleScene,
      },
      loadingText: texts['scene.loading'],
      transitionMs,
    });

    // 每场战斗使用独立 Rng，避免同一次会话内重复同一套 Boss 意图。
    let battleCount = 0;
    const context = createSceneContext({
      manager,
      runController,
      config,
      overlayManager,
      createBattle: () => {
        battleCount += 1;
        return new BattleModule({ config, rng: new Rng(seed + battleCount) });
      },
    });

    manager.setContext(context);
    shell.setContext(context);
    overlayManager.setContext(context);

    // 调试入口：?scene=battle 直接进战斗，?scene=map 直接进路线图。
    const requested = query.get('scene');
    if (requested === 'battle' || requested === 'map') {
      if (!runController.hasRun()) runController.startRun({ floor, seed: debugSeed });
    }

    await manager.start(requested ?? 'home', {
      bossId: query.get('boss') ?? undefined,
      nodeId: requested ? `debug_${requested}` : undefined,
      nodeType: requested === 'battle' ? 'battle' : undefined,
    });

    // 预留: 供控制台调试与自动化验收使用。
    window.game = { manager, runController, shell, overlayManager, saveManager };
  } catch (error) {
    console.error(error);
    showBootError(root, error);
  }
}

boot();
