import Phaser from 'phaser';
import { UILayer } from '../ui/UILayer';
import { WeaponPreview } from '../ui/WeaponPreview';
import { WEAPONS, STAT_LABELS, WeaponDef } from '../data/weapons';
import { TEX } from '../art/textures';
import { run } from '../systems/run';
import { withRo } from '../util/korean';

const CARD_W = 180;
const CARD_H = 266;
const CARD_TOP = 54;
const CARD_XS = [30, 230, 430];
/** 카드 안 미리보기 상자 (카드 기준) */
const PREVIEW = { x: 8, y: 46, w: 164, h: 96 };

interface Card {
  def: WeaponDef;
  el: HTMLElement;
  canvasParts: Phaser.GameObjects.GameObject[];
  preview: WeaponPreview;
}

/** 최초 무기 선택 — 서고(あ행) 완료 보상 */
export class WeaponSelectScene extends Phaser.Scene {
  private ui!: UILayer;
  private cards: Card[] = [];
  private selected: Card | null = null;
  private goButton!: HTMLButtonElement;
  private confirmed = false;

  constructor() {
    super('WeaponSelect');
  }

  create(): void {
    this.cards = [];
    this.selected = null;
    this.confirmed = false;
    this.ui = new UILayer(this);

    // 배경: 서고를 어둡게 깔아 이어지는 느낌을 준다
    if (this.textures.exists('library-bg')) this.add.image(0, 0, 'library-bg').setOrigin(0).setScale(2);
    this.add.rectangle(0, 0, 640, 360, 0x0c0a12, 0.82).setOrigin(0);

    this.ui.el('div', 'ws-title', '첫 무기를 고르세요');
    this.ui.el('div', 'ws-sub', 'あ행의 언령이 무기에 깃든다');

    WEAPONS.forEach((def, i) => this.createCard(def, CARD_XS[i], i));

    this.goButton = this.ui.button('무기를 골라 주세요', () => this.confirm(), 'primary ws-go');
    this.goButton.disabled = true;

    const kb = this.input.keyboard!;
    ['ONE', 'TWO', 'THREE'].forEach((k, i) => kb.on(`keydown-${k}`, () => this.select(this.cards[i])));
    kb.on('keydown-LEFT', () => this.step(-1));
    kb.on('keydown-RIGHT', () => this.step(1));
    kb.on('keydown-ENTER', () => this.confirm());
  }

  update(_time: number, delta: number): void {
    this.cards.forEach((c) => c.preview.update(delta));
  }

  private createCard(def: WeaponDef, x: number, index: number): void {
    // 캔버스: 카드 바탕 · 아이콘 · 미리보기 상자
    const g = this.add.graphics();
    g.fillStyle(0x1b1626, 0.96).fillRect(x, CARD_TOP, CARD_W, CARD_H);
    g.fillStyle(0x26335f, 1).fillRect(x + PREVIEW.x, CARD_TOP + PREVIEW.y, PREVIEW.w, PREVIEW.h);
    g.fillStyle(0x3b4f8f, 0.35);
    for (let yy = 12; yy < PREVIEW.h; yy += 12) g.fillRect(x + PREVIEW.x, CARD_TOP + PREVIEW.y + yy, PREVIEW.w, 1);
    const icon = this.add.image(x + 26, CARD_TOP + 24, TEX.icon(def.id)).setScale(2);
    const preview = new WeaponPreview(this, def.id, {
      x: x + PREVIEW.x,
      y: CARD_TOP + PREVIEW.y,
      w: PREVIEW.w,
      h: PREVIEW.h,
    });

    // DOM: 글자와 테두리 (배경은 투명 — 캔버스가 비친다)
    const el = this.ui.el('div', 'wcard clickable');
    this.ui.place(el, x, CARD_TOP);
    this.ui.el('div', 'wname', def.name, el);
    this.ui.el('div', 'wjp', `<span class="jp">${def.jp}</span> ${def.reading}`, el);
    this.ui.el('div', 'wtag', def.tag, el);
    this.ui.el('div', 'wdesc', def.desc, el);
    const stats = this.ui.el('div', 'wstats', '', el);
    for (const { key, label } of STAT_LABELS) {
      const row = this.ui.el('div', 'wstat', `<span>${label}</span>`, stats);
      const bar = this.ui.el('div', 'wbar', '', row);
      for (let n = 1; n <= 5; n++) this.ui.el('i', n <= def.stats[key] ? 'on' : '', '', bar);
    }
    this.ui.el('div', 'wkey', `[${index + 1}] 선택`, el);

    const card: Card = { def, el, canvasParts: [g, icon, preview.container], preview };
    el.addEventListener('click', () => (this.selected === card ? this.confirm() : this.select(card)));
    this.cards.push(card);
  }

  private step(dir: number): void {
    const i = this.selected ? this.cards.indexOf(this.selected) : dir > 0 ? -1 : this.cards.length;
    this.select(this.cards[Phaser.Math.Wrap(i + dir, 0, this.cards.length)]);
  }

  private select(card: Card | undefined): void {
    if (!card || this.confirmed) return;
    this.selected = card;
    for (const c of this.cards) {
      const on = c === card;
      c.el.classList.toggle('selected', on);
      c.preview.setSpeed(on ? 1.4 : 1);
    }
    this.goButton.disabled = false;
    this.goButton.innerHTML = `${withRo(card.def.name)} 출발 ▶<small>Enter</small>`;
  }

  private confirm(): void {
    const card = this.selected;
    if (!card || this.confirmed) return;
    this.confirmed = true;
    run.weapon = card.def.id;

    this.goButton.disabled = true;
    for (const c of this.cards) {
      if (c === card) {
        c.el.classList.add('chosen');
      } else {
        c.el.classList.add('faded');
        this.tweens.add({ targets: c.canvasParts, alpha: 0.2, duration: 250 });
      }
    }
    this.cameras.main.flash(250, 240, 184, 74);
    this.time.delayedCall(800, () => this.cameras.main.fadeOut(300, 12, 10, 18));
    this.time.delayedCall(1150, () => this.scene.start('Raid'));
  }
}
