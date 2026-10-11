import Phaser from 'phaser';
import { UILayer } from '../ui/UILayer';

/** 최초 무기 선택 — 다음 단계에서 구현 (지금은 연결만) */
export class WeaponSelectScene extends Phaser.Scene {
  constructor() {
    super('WeaponSelect');
  }

  create(): void {
    const ui = new UILayer(this);
    const panel = ui.el('div', 'panel fade-in');
    ui.el('h2', '', '🗡️ 최초 무기 선택', panel);
    ui.el('p', '', '부적 · 방울 · 여우불<br>다음 단계에서 만들 예정이에요.', panel);
    const row = ui.el('div', 'row', '', panel);
    row.style.marginBottom = '0';
    ui.button('서고로 돌아가기', () => this.scene.start('Library'), '', row);
  }
}
