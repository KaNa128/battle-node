// 首页：新开一局、继续当前局、查看背包、图鉴（预留）。

export function createHomeScene() {
  let ctx;
  let page;
  let continueButton;

  function build(container) {
    page = document.createElement('section');
    page.className = 'home-scene';

    const hero = document.createElement('div');
    hero.className = 'home-scene__hero';
    const title = document.createElement('h1');
    title.className = 'home-scene__title';
    title.textContent = ctx.texts['scene.home.title'];
    const subtitle = document.createElement('p');
    subtitle.className = 'home-scene__subtitle';
    subtitle.textContent = ctx.texts['scene.home.subtitle'];
    const tagline = document.createElement('p');
    tagline.className = 'home-scene__tagline';
    tagline.textContent = ctx.texts['scene.home.tagline'];
    hero.append(title, subtitle, tagline);

    const actions = document.createElement('div');
    actions.className = 'home-scene__actions';

    const start = document.createElement('button');
    start.type = 'button';
    start.className = 'scene-action scene-action--primary';
    start.textContent = ctx.texts['scene.home.start'];
    start.addEventListener('click', () => {
      ctx.startRun();
      ctx.navigate('map', {});
    });

    continueButton = document.createElement('button');
    continueButton.type = 'button';
    continueButton.className = 'scene-action';
    continueButton.textContent = ctx.texts['scene.home.continue'];
    continueButton.addEventListener('click', () => {
      if (!ctx.hasRun()) return;
      ctx.navigate('map', {});
    });

    const inventory = document.createElement('button');
    inventory.type = 'button';
    inventory.className = 'scene-action';
    inventory.textContent = ctx.texts['scene.home.inventory'];
    inventory.addEventListener('click', () => ctx.openOverlay('inventory'));

    const codex = document.createElement('button');
    codex.type = 'button';
    codex.className = 'scene-action';
    codex.disabled = true;
    codex.textContent = ctx.texts['scene.home.codex'];

    actions.append(start, continueButton, inventory, codex);
    page.append(hero, actions);
    container.appendChild(page);
  }

  return {
    id: 'home',

    mount(container, context) {
      ctx = context;
      build(container);
    },

    init() {
      const hasRun = ctx.hasRun();
      continueButton.disabled = !hasRun;
      page.classList.toggle('has-run', hasRun);
    },

    leave() {},

    destroy() {
      page?.remove();
    },
  };
}
