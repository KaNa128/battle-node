// 战斗主视图：只读快照渲染与事件回放，不计算任何战斗数值。

import { toFixed1 } from '../utils/math.js';
import { StatusBars } from './StatusBars.js';
import { BuffBar } from './BuffBar.js';
import { SequenceBar } from './SequenceBar.js';
import { ActionPanel } from './ActionPanel.js';
import { InventoryView } from './InventoryView.js';
import { FeedbackLayer } from './FeedbackLayer.js';
import { GifPlayer } from './anim/GifPlayer.js';

export class BattleView {
  constructor({ root, config, onKey, onInventory = null }) {
    this.root = root;
    this.config = config;
    this.onKey = onKey;
    // 外层提供 onInventory 时复用全局背包；否则退回战斗内自带实例。
    this.onInventory = onInventory;
    this.texts = config.ui.texts;
    this.interactive = false;
    this.lastSnapshot = null;

    this.weaponMap = new Map(config.weapons.weapons.map((weapon) => [weapon.id, weapon]));
    this.bossMap = new Map(config.bosses.bosses.map((boss) => [boss.id, boss]));
    this.itemMap = new Map(config.items.items.map((item) => [item.id, item]));
    this.attackMap = new Map();
    for (const weapon of config.weapons.weapons) {
      for (const attack of Object.values(weapon.attacks)) {
        this.attackMap.set(attack.id, attack);
      }
    }

    this.flashTimers = new Map();
    this.build();
  }

  t(key, vars = {}) {
    let template = this.texts[key] ?? key;
    for (const [name, value] of Object.entries(vars)) {
      template = template.replaceAll(`{${name}}`, String(value));
    }
    return template;
  }

  build() {
    this.root.innerHTML = `
      <div class="battle-shell">
        <header class="battle-header">
          <div class="battle-header__title">
            <h1 class="battle-title"></h1>
            <span class="battle-phase"></span>
          </div>
          <div class="battle-header__meta">
            <span class="battle-turn"></span>
          </div>
        </header>
        <main class="battle-arena">
          <section class="fighter fighter--player" data-side="player">
            <div class="portrait portrait--player">
              <img class="portrait__img" alt="" />
              <span class="portrait__fallback">侠</span>
            </div>
            <div class="fighter__panel">
              <div class="fighter__head">
                <span class="fighter__name"></span>
                <span class="badge badge--break hidden" data-player-break></span>
              </div>
              <div class="fighter__bars" data-player-bars></div>
              <div class="fighter__buffs" data-player-buffs></div>
              <div class="fighter__sequence" data-player-sequence></div>
            </div>
          </section>
          <section class="fighter fighter--boss" data-side="boss">
            <div class="fighter__intent" data-boss-sequence></div>
            <div class="portrait portrait--boss">
              <img class="portrait__img" alt="" />
              <span class="portrait__fallback">敌</span>
            </div>
            <div class="fighter__panel">
              <div class="fighter__head">
                <span class="fighter__name"></span>
                <span class="badge badge--break hidden" data-boss-break></span>
              </div>
              <div class="fighter__bars" data-boss-bars></div>
              <div class="fighter__buffs" data-boss-buffs></div>
            </div>
          </section>
        </main>
        <div class="feedback-layer" data-feedback></div>
        <div class="action-shell" data-action></div>
        <div class="result-overlay hidden" data-result>
          <div class="result-card">
            <h2 class="result-title"></h2>
            <p class="result-desc"></p>
            <button type="button" class="result-retry"></button>
          </div>
        </div>
      </div>
    `;

    this.shell = this.root.querySelector('.battle-shell');
    this.playerEl = this.root.querySelector('[data-side="player"]');
    this.bossEl = this.root.querySelector('[data-side="boss"]');
    this.playerNameEl = this.playerEl.querySelector('.fighter__name');
    this.bossNameEl = this.bossEl.querySelector('.fighter__name');
    this.playerBreakBadge = this.root.querySelector('[data-player-break]');
    this.bossBreakBadge = this.root.querySelector('[data-boss-break]');
    this.playerImg = this.playerEl.querySelector('.portrait__img');
    this.bossImg = this.bossEl.querySelector('.portrait__img');
    this.turnEl = this.root.querySelector('.battle-turn');
    this.phaseEl = this.root.querySelector('.battle-phase');
    this.titleEl = this.root.querySelector('.battle-title');
    this.overlay = this.root.querySelector('[data-result]');
    this.resultTitle = this.root.querySelector('.result-title');
    this.resultDesc = this.root.querySelector('.result-desc');
    this.resultRetry = this.root.querySelector('.result-retry');

    this.titleEl.textContent = this.texts['battle.title'];
    this.resultRetry.textContent = this.texts['status.retry'];
    this.resultRetry.addEventListener('click', () => window.location.reload());

    this.playerBars = new StatusBars({
      container: this.root.querySelector('[data-player-bars]'),
      labels: { hp: this.texts['player.hp'], rage: this.texts['player.rage'] },
    });
    this.bossBars = new StatusBars({
      container: this.root.querySelector('[data-boss-bars]'),
      labels: { hp: this.texts['boss.hp'], rage: this.texts['boss.rage'] },
    });

    this.playerBuffs = new BuffBar({
      container: this.root.querySelector('[data-player-buffs]'),
      title: this.texts['label.buffs'],
      emptyText: this.texts['label.noBuff'],
      emptyTooltip: this.texts['tooltip.buffEmpty'],
      texts: this.texts,
    });
    this.bossBuffs = new BuffBar({
      container: this.root.querySelector('[data-boss-buffs]'),
      title: this.texts['label.buffs'],
      emptyText: this.texts['label.noBuff'],
      emptyTooltip: this.texts['tooltip.buffEmpty'],
      texts: this.texts,
    });

    this.playerSequence = new SequenceBar({
      container: this.root.querySelector('[data-player-sequence]'),
      title: this.texts['label.queue'],
      emptyText: this.texts['label.emptyQueue'],
    });
    this.bossSequence = new SequenceBar({
      container: this.root.querySelector('[data-boss-sequence]'),
      title: this.texts['label.intent'],
      emptyText: this.texts['label.emptyQueue'],
    });

    this.actionPanel = new ActionPanel({
      container: this.root.querySelector('[data-action]'),
      config: this.config,
      texts: this.texts,
      onKey: this.onKey,
      onInventory: () => {
        if (!this.lastSnapshot || this.lastSnapshot.result) return;
        if (this.onInventory) {
          this.onInventory(this.lastSnapshot);
          return;
        }
        this.inventory?.open(this.lastSnapshot);
      },
    });

    this.feedback = new FeedbackLayer({ container: this.root.querySelector('[data-feedback]') });
    this.playerGif = new GifPlayer(this.playerImg);
    this.bossGif = new GifPlayer(this.bossImg);

    this.inventory = this.onInventory
      ? null
      : new InventoryView({
          container: this.shell,
          config: this.config,
          texts: this.texts,
          inBattle: true,
        });
  }

  render(snapshot) {
    this.lastSnapshot = snapshot;

    const playerWeapon = this.weaponMap.get(snapshot.panel.currentOrder[0]);
    this.playerArt = playerWeapon?.art ?? null;
    const bossConfig = this.bossMap.get(snapshot.bossId);
    this.bossArt = bossConfig?.art ?? null;

    this.playerNameEl.textContent = this.texts['player.name'];
    this.bossNameEl.textContent = snapshot.bossName;
    this.turnEl.textContent = this.t('battle.turn', { turn: snapshot.turn });
    this.phaseEl.textContent = this.texts['label.phase'][snapshot.phase] ?? snapshot.phase;

    this.playerBars.render(snapshot.player);
    this.bossBars.render(snapshot.boss);
    this.playerBuffs.render(snapshot.buffs?.player ?? []);
    this.bossBuffs.render(snapshot.buffs?.boss ?? []);

    const breaking = Boolean(snapshot.boss.breaking);
    this.bossBreakBadge.classList.toggle('hidden', !breaking);
    this.bossBreakBadge.textContent = this.texts['status.breaking'];
    this.playerBreakBadge.classList.add('hidden');

    // replaySame=false：排布期间频繁重渲染时不打断待机动画。
    if (this.playerArt) this.playerGif.show(this.playerArt.idle, false);
    if (this.bossArt) this.bossGif.show(breaking ? this.bossArt.break : this.bossArt.idle, false);

    this.playerSequence.render(this.buildQueueItems(snapshot));
    this.bossSequence.render(this.buildIntentItems(snapshot));
    this.actionPanel.render(snapshot);

    if (snapshot.result) this.showResult(snapshot.result);
  }

  buildQueueItems(snapshot) {
    return snapshot.queue.map((command) => {
      const base = { seq: command.seq, opId: command.opId };
      if (command.kind === 'attack') {
        const attack = this.attackMap.get(command.sourceId);
        const weapon = this.weaponMap.get(command.weaponId);
        const lines = [
          this.t('tooltip.attackTitle', {
            weapon: weapon?.name ?? command.weaponId,
            attack: attack?.name ?? command.attackType,
          }),
          this.t('tooltip.damage', { value: toFixed1(command.resolved.damage) }),
          this.t('tooltip.rageCost', { value: toFixed1(command.resolved.rageCost) }),
          this.t('tooltip.bossRageCut', { value: toFixed1(command.resolved.bossRageCut) }),
        ];
        if (command.resolved.consumesSpecialUse) lines.push(this.texts['tooltip.specialUse']);
        return {
          ...base,
          glyph: this.texts[`icon.attack.${command.attackType}`],
          tone: command.attackType,
          tooltip: lines.join('\n'),
        };
      }
      if (command.kind === 'item') {
        const item = this.itemMap.get(command.sourceId);
        return {
          ...base,
          glyph: this.texts['icon.item'],
          tone: 'item',
          tooltip: [
            this.t('tooltip.itemTitle', { name: item?.name ?? command.sourceId }),
            this.t('tooltip.heal', { value: toFixed1(command.resolved.heal ?? 0) }),
          ].join('\n'),
        };
      }
      if (command.kind === 'switch') {
        return {
          ...base,
          glyph: this.texts['icon.switch'],
          tone: 'switch',
          tooltip: this.texts['tooltip.switch'],
        };
      }
      return {
        ...base,
        glyph: this.texts['icon.defend'],
        tone: 'defend',
        tooltip: this.texts['tooltip.defend'],
      };
    });
  }

  buildIntentItem(item) {
    return {
      seq: item.seq,
      opId: `boss_op_${item.seq}`,
      glyph: this.texts[`icon.boss.${item.opType}`],
      tone: item.opType,
      tooltip: [
        this.t('tooltip.bossTitle', { name: item.name }),
        this.t('tooltip.damage', { value: toFixed1(item.damage) }),
        this.t('tooltip.playerRageCut', { value: toFixed1(item.playerRageCut) }),
      ].join('\n'),
    };
  }

  buildIntentItems(snapshot) {
    return (snapshot.intent?.items ?? []).map((item) => this.buildIntentItem(item));
  }

  setInteractive(interactive) {
    this.interactive = interactive;
    this.actionPanel.setInteractive(interactive);
    if (this.lastSnapshot) this.actionPanel.render(this.lastSnapshot);
  }

  setActive(side) {
    this.playerEl.classList.toggle('is-active', side === 'player');
    this.bossEl.classList.toggle('is-active', side === 'boss');
    this.playerEl.classList.toggle('is-dim', side === 'boss');
    this.bossEl.classList.toggle('is-dim', side === 'player');
  }

  flash(side) {
    const el = side === 'player' ? this.playerEl : this.bossEl;
    if (!el) return;
    el.classList.add('is-hit');
    const previous = this.flashTimers.get(side);
    if (previous) clearTimeout(previous);
    const timer = setTimeout(() => el.classList.remove('is-hit'), 320);
    this.flashTimers.set(side, timer);
  }

  showHurt(side) {
    const art = side === 'player' ? this.playerArt : this.bossArt;
    const gif = side === 'player' ? this.playerGif : this.bossGif;
    if (!art) return;
    gif.show(art.hurt);
    const timer = setTimeout(() => {
      const snapshot = this.lastSnapshot;
      if (!snapshot) return;
      if (side === 'boss') {
        gif.show(snapshot.boss.breaking ? art.break : art.idle);
      } else {
        gif.show(art.idle);
      }
    }, 600);
    this.flashTimers.set(`${side}-gif`, timer);
  }

  showAttack(side) {
    const art = side === 'player' ? this.playerArt : this.bossArt;
    const gif = side === 'player' ? this.playerGif : this.bossGif;
    if (art) gif.show(art.attack);
  }

  applyEvent(event) {
    switch (event.type) {
      case 'turnStart':
        this.turnEl.textContent = this.t('battle.turn', { turn: event.turn });
        this.phaseEl.textContent = this.texts['label.phase'].BOSS_INTENT;
        this.setActive(null);
        break;
      case 'intentRevealed':
        this.setActive('boss');
        this.phaseEl.textContent = this.texts['label.phase'].PLAYER_PLANNING;
        this.bossSequence.render(
          (event.meta.items ?? []).map((item) => this.buildIntentItem(item)),
        );
        break;
      case 'damage':
        this.setActive(event.actor);
        this.showAttack(event.actor);
        this.showHurt(event.target);
        this.flash(event.target);
        this.playerSequence.highlight(event.sourceOpId);
        this.bossSequence.highlight(event.sourceOpId);
        if (event.target === 'player') this.playerBars.setHp(event.meta.hpAfter);
        if (event.target === 'boss') this.bossBars.setHp(event.meta.hpAfter);
        this.feedback.toast(`-${toFixed1(event.value)}`, 'damage');
        break;
      case 'block':
        this.setActive(event.actor);
        this.flash(event.target);
        this.bossSequence.highlight(event.sourceOpId);
        this.feedback.toast(this.texts['toast.block'], 'block');
        break;
      case 'heal':
        if (event.target === 'player') this.playerBars.setHp(event.meta.hpAfter);
        this.playerSequence.highlight(event.sourceOpId);
        this.feedback.toast(`+${toFixed1(event.value)}`, 'heal');
        break;
      case 'rageChange':
        if (event.meta.side === 'player') this.playerBars.setRage(event.meta.after);
        if (event.meta.side === 'boss') this.bossBars.setRage(event.meta.after);
        break;
      case 'skip':
        this.playerSequence.highlight(event.sourceOpId);
        this.bossSequence.highlight(event.sourceOpId);
        this.feedback.toast(
          event.meta.reason === 'break' ? this.texts['skip.break'] : this.texts['skip.rageZero'],
          'skip',
        );
        break;
      case 'combo':
        this.feedback.toast(`${event.meta.name} · ${this.texts['combo.trigger']}`, 'combo');
        break;
      case 'switch':
        this.playerSequence.highlight(event.sourceOpId);
        this.feedback.toast(this.texts['toast.switch'], 'switch');
        break;
      case 'breakStart':
        this.bossBreakBadge.classList.remove('hidden');
        this.bossBreakBadge.textContent = this.texts['status.breaking'];
        if (this.bossArt) this.bossGif.show(this.bossArt.break);
        this.feedback.toast(this.texts['status.breaking'], 'break');
        break;
      case 'breakEnd':
        this.bossBreakBadge.classList.add('hidden');
        if (this.bossArt) this.bossGif.show(this.bossArt.idle);
        break;
      case 'turnEnd':
        this.setActive(null);
        break;
      case 'battleEnd':
        this.showResult(event.meta.result);
        break;
      default:
        break;
    }
  }

  showResult(result) {
    const bossName = this.lastSnapshot?.bossName ?? '';
    this.overlay.classList.remove('hidden');
    this.resultTitle.textContent = result === 'win' ? this.texts['status.win'] : this.texts['status.lose'];
    this.resultDesc.textContent =
      result === 'win'
        ? this.t('result.winDesc', { boss: bossName })
        : this.t('result.loseDesc', { boss: bossName });
    this.setInteractive(false);
  }
}
