// 极简浏览器断言器：纯逻辑测试，不依赖 DOM 结构。

const cases = [];

export function test(name, fn) {
  cases.push({ name, fn });
}

export function assert(condition, message = '断言失败') {
  if (!condition) throw new Error(message);
}

export function assertEqual(actual, expected, label = '') {
  if (actual !== expected) {
    throw new Error(`${label} 期望 ${JSON.stringify(expected)}，实际 ${JSON.stringify(actual)}`);
  }
}

export function assertClose(actual, expected, label = '', epsilon = 1e-9) {
  if (Math.abs(actual - expected) > epsilon) {
    throw new Error(`${label} 期望 ${expected}，实际 ${actual}`);
  }
}

export function assertDeepEqual(actual, expected, label = '') {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${label} 期望 ${b}，实际 ${a}`);
}

export async function runAll(container) {
  const summary = document.createElement('div');
  summary.className = 'summary';

  let passed = 0;
  let failed = 0;

  for (const item of cases) {
    const row = document.createElement('div');
    row.className = 'case';

    const title = document.createElement('div');
    title.className = 'case__title';
    title.textContent = item.name;

    const status = document.createElement('div');
    status.className = 'case__status';

    row.append(title, status);
    container.appendChild(row);

    try {
      await item.fn();
      passed += 1;
      row.classList.add('is-pass');
      status.textContent = 'PASS';
    } catch (error) {
      failed += 1;
      row.classList.add('is-fail');
      status.textContent = `FAIL：${error.message}`;
      console.error(`[测试失败] ${item.name}`, error);
    }
  }

  summary.textContent = `共 ${cases.length} 项 · 通过 ${passed} · 失败 ${failed}`;
  summary.classList.add(failed === 0 ? 'is-pass' : 'is-fail');
  container.prepend(summary);
  document.title = failed === 0 ? '测试全部通过' : `测试失败 ${failed} 项`;
  return { passed, failed };
}
