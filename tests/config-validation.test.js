import { loadConfig } from '../src/data/ConfigLoader.js';
import { validateConfig } from '../src/data/Validator.js';
import { deepClone } from '../src/utils/deepClone.js';
import { test, assert, assertEqual } from './runner.js';

test('7 个配置文件均可加载并通过校验', async () => {
  const config = await loadConfig();
  const keys = ['battleConfig', 'weapons', 'bosses', 'combos', 'effects', 'items', 'ui'];
  for (const key of keys) assert(config[key], `缺少配置：${key}`);
  validateConfig(config);
  assertEqual(config.weapons.weapons.length, 4, '武器数量');
  assertEqual(config.bosses.bosses.length, 1, 'Boss 数量');
  assertEqual(config.items.items.length, 1, '药品数量');
});

test('引用断裂时校验失败并给出字段路径', async () => {
  const config = await loadConfig();
  const broken = deepClone(config);
  broken.bosses.bosses[0].phases[0].actionWeights[0].actionId = 'missing_action';

  let message = '';
  try {
    validateConfig(broken);
  } catch (error) {
    message = error.message;
  }
  assert(message.includes('actionWeights[0].actionId'), `错误信息应包含字段路径，实际：${message}`);
  assert(message.includes('missing_action'), '错误信息应包含非法引用值');
});
