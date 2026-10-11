import Phaser from 'phaser';
import { UILayer } from '../ui/UILayer';
import { WEAPONS } from '../data/weapons';
import { TEX } from '../art/textures';
import { run } from '../systems/run';

/**
 * 습격 방 — 아직 제작 전.
 * 지금은 프로토타입의 끝: 고른 무기를 보여주고 "제작 예정"으로 마무리한다.
 */
export class RaidScene extends Phaser.Scene {
  constructor() {
    super('Raid');
  }

  create(): void {
    this.cameras.main.fadeIn(400, 12, 10, 18);
    const ui = new UILayer(this);
    const weapon = WEAPONS.find((w) => w.id === run.weapon);

    if (weapon) {
      const glow = this.add.image(320, 112, TEX.glow).setScale(2).setAlpha(0.7);
      this.tweens.add({ targets: glow, scale: 2.3, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      const icon = this.add.image(320, 112, TEX.icon(weapon.id)).setScale(4);
      this.tweens.add({ targets: icon, y: 108, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    const box = ui.el('div', 'raid-end fade-up');
    ui.el('div', 'raid-title', '👹 습격 — 제작 예정', box);
    ui.el(
      'p',
      '',
      `고른 무기 <b>${weapon ? `${weapon.name} <span class="jp">${weapon.jp}</span>` : '없음'}</b>` +
        ` · 익힌 글자 <b class="jp">${run.learned.join(' ') || '-'}</b><br>` +
        '여기까지가 현재 프로토타입이에요. 습격 방은 다음 단계에서 만들어요.',
      box,
    );
    const row = ui.el('div', 'row', '', box);
    ui.button('무기 다시 고르기', () => this.scene.start('WeaponSelect'), '', row);
    ui.button('서고부터 다시', () => {
      run.weapon = null;
      run.learned = [];
      this.scene.start('Library');
    }, 'primary', row);
  }
}
