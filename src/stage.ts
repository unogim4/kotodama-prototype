import Phaser from 'phaser';

/** 기준 해상도. 모든 배치는 이 좌표계를 기준으로 한다. */
export const GAME_W = 640;
export const GAME_H = 360;

/**
 * 창 크기에 맞춰 정수배로 확대한다 (도트가 흐려지지 않도록).
 * 창이 기준 해상도보다 작을 때만 소수 배율로 축소한다.
 * DOM UI 레이어(#ui)도 같은 배율로 transform 한다.
 */
export function fitStage(game: Phaser.Game): void {
  const stage = document.getElementById('stage')!;
  const ui = document.getElementById('ui')!;

  const fit = () => {
    const raw = Math.min(window.innerWidth / GAME_W, window.innerHeight / GAME_H);
    const zoom = raw >= 1 ? Math.floor(raw) : raw;
    stage.style.width = `${GAME_W * zoom}px`;
    stage.style.height = `${GAME_H * zoom}px`;
    ui.style.transform = `scale(${zoom})`;
    game.scale.setZoom(zoom);
  };

  window.addEventListener('resize', fit);
  fit();
}
