import Phaser from 'phaser';

/** 이동 키: WASD + 방향키 */
export type MoveKeys = Record<'W' | 'A' | 'S' | 'D' | 'UP' | 'DOWN' | 'LEFT' | 'RIGHT', Phaser.Input.Keyboard.Key>;

export function createMoveKeys(scene: Phaser.Scene): MoveKeys {
  return scene.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT') as MoveKeys;
}

/** 입력 방향 (대각선도 길이 1로 정규화). 입력이 없으면 {0,0} */
export function readMove(keys: MoveKeys): { x: number; y: number } {
  const x = Number(keys.D.isDown || keys.RIGHT.isDown) - Number(keys.A.isDown || keys.LEFT.isDown);
  const y = Number(keys.S.isDown || keys.DOWN.isDown) - Number(keys.W.isDown || keys.UP.isDown);
  if (x !== 0 && y !== 0) return { x: x * Math.SQRT1_2, y: y * Math.SQRT1_2 };
  return { x, y };
}
