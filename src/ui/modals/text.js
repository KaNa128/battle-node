// 浮层文案格式化：所有浮层共用，避免各自重复实现占位符替换。

export function formatText(texts, key, vars = {}) {
  let template = texts[key] ?? key;
  for (const [name, value] of Object.entries(vars)) {
    template = template.replaceAll(`{${name}}`, String(value));
  }
  return template;
}

export function effectLabel(texts, config, effect) {
  if (effect.kind === 'item') {
    const item = config.items.items.find((entry) => entry.id === effect.itemId);
    return formatText(texts, 'overlay.effect.item', {
      name: item?.name ?? effect.itemId,
      value: effect.value,
    });
  }
  return formatText(texts, `overlay.effect.${effect.kind}`, { value: effect.value });
}
