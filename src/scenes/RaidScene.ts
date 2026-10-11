import Phaser from 'phaser';
import { UILayer } from '../ui/UILayer';
import { WEAPONS } from '../data/weapons';
import { run } from '../systems/run';

/** 습격 방 — 다음 단계에서 구현 (지금은 고른 무기만 확인) */
export class RaidScene extends Phaser.Scene {
  constructor() {
    super('Raid');
  }

  create(): void {
    this.cameras.main.fadeIn(250, 12, 10, 18);
    const ui = new UILayer(this);
    const weapon = WEAPONS.find((w) => w.id === run.weapon);
    const panel = ui.el('div', 'panel fade-in');
    ui.el('h2', '', '👹 습격 방 1', panel);
    ui.el(
      'p',
      '',
      `고른 무기: <b>${weapon ? `${weapon.name} <span class="jp">${weapon.jp}</span>` : '없음'}</b><br>습격 방은 다음 단계에서 만들 예정이에요.`,
      panel,
    );
    const row = ui.el('div', 'row', '', panel);
    row.style.marginBottom = '0';
    ui.button('무기 다시 고르기', () => this.scene.start('WeaponSelect'), '', row);
    ui.button('서고로 돌아가기', () => this.scene.start('Library'), '', row);
  }
}
