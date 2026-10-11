import Phaser from 'phaser';
import { gridCanvas } from './pixel';
import {
  PLAYER, SCROLL_SEALED, stand, hangingScrollFrames, glow, spark,
  ICON_OFUDA, ICON_SUZU, ICON_KITSUNEBI, SHOT_OFUDA, ORB_KITSUNEBI, DUMMY,
} from './sprites';

export const TEX = {
  player: 'player',
  scrollSealed: 'scroll-sealed',
  stand: 'stand',
  hang: (i: number) => `scroll-hang-${i}`,
  glow: 'glow',
  spark: 'spark',
  icon: (id: string) => `icon-${id}`,
  shotOfuda: 'shot-ofuda',
  orbKitsunebi: 'orb-kitsunebi',
  dummy: 'dummy',
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
  add(scene, TEX.icon('ofuda'), gridCanvas(ICON_OFUDA));
  add(scene, TEX.icon('suzu'), gridCanvas(ICON_SUZU));
  add(scene, TEX.icon('kitsunebi'), gridCanvas(ICON_KITSUNEBI));
  add(scene, TEX.shotOfuda, gridCanvas(SHOT_OFUDA));
  add(scene, TEX.orbKitsunebi, gridCanvas(ORB_KITSUNEBI));
  add(scene, TEX.dummy, gridCanvas(DUMMY));
}
