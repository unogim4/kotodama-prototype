import Phaser from 'phaser';
import './style.css';
import { GAME_W, GAME_H, fitStage } from './stage';
import { BootScene } from './scenes/BootScene';
import { LibraryScene } from './scenes/LibraryScene';
import { WeaponSelectScene } from './scenes/WeaponSelectScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'stage',
  width: GAME_W,
  height: GAME_H,
  backgroundColor: '#0c0a12',
  pixelArt: true,
  roundPixels: true,
  scale: { mode: Phaser.Scale.NONE, autoCenter: Phaser.Scale.NO_CENTER },
  scene: [BootScene, LibraryScene, WeaponSelectScene],
});

fitStage(game);

// 개발 중 콘솔에서 상태를 확인할 수 있도록 노출
if (import.meta.env.DEV) (window as unknown as { game: Phaser.Game }).game = game;
