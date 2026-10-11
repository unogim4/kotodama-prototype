/**
 * 코드로 찍는 도트 도구.
 * 스프라이트는 문자 격자(팔레트 키)로 정의하고, 캔버스에 1픽셀 단위로 그린다.
 */

/** 언령 팔레트 */
export const PAL = {
  K: '#1b1626', // 먹 (외곽선)
  H: '#2e2640', // 머리
  S: '#f6cfa6', // 피부
  s: '#d9a07a', // 피부 그림자
  L: '#fffaf0', // 한지 밝음
  W: '#f0e2c0', // 한지
  w: '#d6c08e', // 한지 그림자
  v: '#b39a68', // 한지 어둠
  R: '#d8432e', // 주홍
  r: '#8f2a20', // 주홍 어둠
  G: '#f0b84a', // 금
  g: '#b9802a', // 금 어둠
  B: '#8a5530', // 나무
  b: '#b9773f', // 나무 밝음
  d: '#5a3420', // 나무 어둠
  N: '#3b4f8f', // 남색
  n: '#26335f', // 남색 어둠
  x: 'rgba(0,0,0,0.28)', // 그림자
} as const;

export type PalKey = keyof typeof PAL;
export type Grid = readonly string[];

export function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}

export function px(g: CanvasRenderingContext2D, x: number, y: number, key: string): void {
  const col = PAL[key as PalKey];
  if (!col) return; // '.' 등은 투명
  g.fillStyle = col;
  g.fillRect(x, y, 1, 1);
}

export function rect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, key: PalKey): void {
  g.fillStyle = PAL[key];
  g.fillRect(x, y, w, h);
}

export function blit(g: CanvasRenderingContext2D, grid: Grid, ox = 0, oy = 0): void {
  grid.forEach((row, y) => [...row].forEach((k, x) => px(g, ox + x, oy + y, k)));
}

export function gridCanvas(grid: Grid): HTMLCanvasElement {
  const [c, g] = canvas(grid[0].length, grid.length);
  blit(g, grid);
  return c;
}
