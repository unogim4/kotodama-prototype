import Phaser from 'phaser';
import { UILayer } from '../ui/UILayer';
import { WEAPONS } from '../data/weapons';
import { TEX } from '../art/textures';
import { run, resetRaid, resetRun } from '../systems/run';

/**
 * 프로토타입의 현재 끝 — 습격 3을 돌파하면 여기로 온다.
 * 보스(야마비코)는 제작 예정.
 */
export class ComingSoonScene extends Phaser.Scene {
  constructor() {
    super('ComingSoon');
  }

  create(): void {
    this.cameras.main.fadeIn(400, 12, 10, 18);
    const ui = new UILayer(this);
    const weapon = WEAPONS.find((w) => w.id === run.weapon);

    if (weapon) {
      const glow = this.add.image(320, 100, TEX.glow).setScale(2).setAlpha(0.7);
      this.tweens.add({ targets: glow, scale: 2.3, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      const icon = this.add.image(320, 100, TEX.icon(weapon.id)).setScale(4);
      this.tweens.add({ targets: icon, y: 96, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    const wrongCount = Object.values(run.wrong).reduce((a, b) => a + b, 0);
    const box = ui.el('div', 'raid-end fade-up');
    ui.el('div', 'raid-title', '👺 あ행 보스 · 야마비코 — 제작 예정', box);
    ui.el(
      'p',
      '',
      `습격 3개 돌파! 무기 <b>${weapon ? `${weapon.name} <span class="jp">${weapon.jp}</span>` : '-'}</b> · <b>Lv ${run.level}</b> · 퀴즈 오답 <b>${wrongCount}</b>회<br>` +
        '여기까지가 현재 프로토타입이에요. 보스전은 다음 단계에서 만들어요.',
      box,
    );
    const row = ui.el('div', 'row', '', box);
    ui.button('습격 1부터 다시', () => {
      resetRaid();
      this.scene.start('Raid');
    }, '', row);
    ui.button('서고부터 다시', () => {
      resetRun();
      this.scene.start('Library');
    }, 'primary', row);
  }
}
