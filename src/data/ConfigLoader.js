// 配置加载：并行 fetch 全部 JSON，深冻结后作为只读配置注入。
// 路径基于本文件位置推导，保证根页面与 /tests/ 页面都能加载。

import { deepFreeze } from '../utils/deepClone.js';

const CONFIG_FILES = {
  battleConfig: 'battle.config.json',
  weapons: 'weapons.json',
  bosses: 'bosses.json',
  combos: 'combos.json',
  effects: 'effects.json',
  items: 'items.json',
  scenes: 'scenes.json',
  ui: 'ui.json',
  map: 'map.json',
  events: 'events.json',
  chests: 'chests.json',
  shop: 'shop.json',
  skills: 'skills.json',
  upgrades: 'upgrades.json',
};

const CONFIG_BASE_URL = new URL('../../config/', import.meta.url);

async function fetchJson(name, url) {
  let response;
  try {
    response = await fetch(url);
  } catch (error) {
    throw new Error(`配置加载失败：${name}（${url}）无法访问，请通过 HTTP 静态服务器打开页面。`, {
      cause: error,
    });
  }
  if (!response.ok) {
    throw new Error(`配置加载失败：${name}（${url}）返回 ${response.status}`);
  }
  try {
    return await response.json();
  } catch (error) {
    throw new Error(`配置解析失败：${name}（${url}）不是合法 JSON。`, { cause: error });
  }
}

export async function loadConfig() {
  const entries = await Promise.all(
    Object.entries(CONFIG_FILES).map(async ([key, file]) => {
      const url = new URL(file, CONFIG_BASE_URL);
      const json = await fetchJson(file, url.href);
      return [key, deepFreeze(json)];
    }),
  );
  return Object.fromEntries(entries);
}

export { CONFIG_FILES };
