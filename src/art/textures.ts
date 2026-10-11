import Phaser from 'phaser';
import { gridCanvas } from './pixel';
import { PLAYER, SCROLL_SEALED, stand, hangingScrollFrames, glow, spark } from './sprites';

export const TEX = {
  player: 'player',
  scrollSealed: 'scroll-sealed',
  stand: 'stand',
  hang: (i: number) => `scroll-hang-${i}`,
  glow: 'glow',
  spark: 'spark',
} as const;

export const HANG_FRAME_COUNT = 5;

function add(scene: Phaser.Scene, key: string, c: HTMLCanvasElement): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, c);
}

/** 코드로 찍은 도트를 Phaser 텍스처로 등록 */
export function registerTextures(scene: Phaser.Scene): void {
  add(scene, TEX.player, gridCanvas(PLAYER));
  add(scene, TEX.scrollSealed, gridCanvas(SCROLL_SEALED));
  add(scene, TEX.stand, stand());
  hangingScrollFrames().forEach((c, i) => add(scene, TEX.hang(i), c));
  add(scene, TEX.glow, glow());
  add(scene, TEX.spark, spark());
}
