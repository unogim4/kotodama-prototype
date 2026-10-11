import Phaser from 'phaser';
import { registerTextures } from '../art/textures';

/** 텍스처 생성과 폰트 로딩이 끝나면 서고로 넘어간다 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    registerTextures(this);

    const fonts = ['10px Galmuri9', '12px Galmuri11', '15px Galmuri14', '600 16px "Klee One"'];
    Promise.all(fonts.map((f) => document.fonts.load(f, 'あ가')))
      .catch(() => undefined)
      .then(() => this.scene.start('Library'));
  }
}
