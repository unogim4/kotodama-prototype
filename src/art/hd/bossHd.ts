import { PixelGrid } from './grid';
import { canvas, rect, px } from '../pixel';

/**
 * 야마비코 80×80 (리마스터 보스). 발끝 y=79.
 * pose: idle · shout(입을 크게, 손을 입가로) · windup(두 팔을 머리 위로)
 */
export type BossPose = 'idle' | 'shout' | 'windup';

export function yamabikoHd(pose: BossPose): PixelGrid {
  const g = new PixelGrid(80, 80);

  // 귀
  for (const ex of [19, 61]) {
    g.ellipse(ex, 13, 8, 9, 'B');
    g.ellipse(ex, 14, 4.5, 5.5, 's');
  }
  // 다리
  g.ellipse(27, 72, 10, 7, 'd');
  g.ellipse(53, 72, 10, 7, 'd');
  g.rect(18, 76, 18, 3, 'd').rect(44, 76, 18, 3, 'd');
  // 몸통
  g.ellipse(40, 52, 27, 20, 'B');
  g.ellipse(40, 58, 15, 12, 'b');

  // 팔 (자세별)
  const arm = (sx: number, hx: number, hy: number) => {
    g.poly([[sx - 6, 42], [sx + 6, 42], [hx + 6, hy], [hx - 6, hy]], 'B');
    g.ellipse(hx, hy, 7.5, 6, 'd');
  };
  if (pose === 'idle') {
    arm(16, 12, 64);
    arm(64, 68, 64);
  } else if (pose === 'shout') {
    arm(16, 25, 38);
    arm(64, 55, 38);
  } else {
    arm(16, 10, 14);
    arm(64, 70, 14);
  }

  // 머리
  g.ellipse(40, 28, 23, 19, 'B');
  // 털 결 (빗금 무늬)
  g.paintOver((x, y, k) => {
    if (k !== 'B') return null;
    if ((x * 3 + y * 2) % 9 === 0) return 'b';
    if ((x + y * 3) % 13 === 0) return 'd';
    return null;
  });
  // 얼굴
  g.ellipse(40, 32, 15.5, 12.5, 'S');
  g.ellipse(40, 38.5, 10, 6.5, 's');
  // 눈썹 (짙은 털)
  g.rect(27, 22, 9, 2, 'd').rect(44, 22, 9, 2, 'd');
  // 눈
  for (const ex of [30, 46]) {
    g.rect(ex, 25, 4, 5, 'K');
    g.rect(ex + 1, 26, 2, 3, 'G');
    g.set(ex + 1, 26, 'L');
  }
  // 코
  g.rect(38, 33, 4, 2, 'd');
  // 입
  if (pose === 'shout') {
    g.ellipse(40, 42, 7, 7, 'K');
    g.ellipse(40, 43, 5, 5, 'r');
    g.ellipse(40, 46, 3.5, 2, 'R');
    g.rect(36, 37, 8, 1, 'L');
  } else {
    g.rect(33, 41, 14, 2, 'K');
    g.rect(35, 41, 10, 1, 'r');
    g.set(36, 42, 'L').set(43, 42, 'L');
  }
  // 볼 털
  g.ellipse(25, 38, 3, 3, 'b').ellipse(55, 38, 3, 3, 'b');

  g.outline('K');
  return g;
}

// ── 메아리 탄 10×10 ────────────────────────────────────
export function echoBullet(): PixelGrid {
  const g = new PixelGrid(10, 10);
  g.ellipse(5, 5, 4.5, 4.5, 'P');
  g.ellipse(5, 5, 3, 3, 'L');
  g.set(4, 4, 'W');
  g.outline('p');
  return g;
}

// ── 던지는 바위 28×22 ──────────────────────────────────
export function boulder(): PixelGrid {
  const g = new PixelGrid(28, 22);
  g.ellipse(14, 12, 12.5, 9, 'y');
  g.ellipse(12, 10, 8, 6, 'Y');
  g.ellipse(10, 8, 3, 2, 'W');
  g.line(16, 7, 20, 14, 'K');
  g.outline('K');
  return g;
}

// ── 보스 시험장 바닥: 산속 돌마당 1280×720 (화면 4배 넓이) ─────────
export const LAB_W = 1280;
export const LAB_H = 720;

export function labGround(): HTMLCanvasElement {
  const [c, g] = canvas(LAB_W, LAB_H);
  rect(g, 0, 0, LAB_W, LAB_H, 'v');
  let seed = 21;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  // 돌판 격자 (줄마다 어긋나게)
  for (let y = 0; y < LAB_H; y += 32) {
    rect(g, 0, y, LAB_W, 1, 'y');
    const off = (y / 32) % 2 ? 24 : 0;
    for (let x = off; x < LAB_W; x += 48) rect(g, x, y, 1, 32, 'y');
  }
  // 돌 표면 얼룩 · 이끼
  for (let i = 0; i < 9000; i++) {
    const x = Math.floor(rnd() * LAB_W);
    const y = Math.floor(rnd() * LAB_H);
    const r = rnd();
    px(g, x, y, r < 0.5 ? 'w' : r < 0.85 ? 'Y' : 'e');
  }
  // 금 간 자국
  for (let i = 0; i < 40; i++) {
    let x = rnd() * LAB_W;
    let y = rnd() * LAB_H;
    for (let s = 0; s < 14; s++) {
      px(g, Math.floor(x), Math.floor(y), 'y');
      x += rnd() * 3 - 1;
      y += rnd() * 3 - 1;
    }
  }
  const edge = g.createRadialGradient(LAB_W / 2, LAB_H / 2, 200, LAB_W / 2, LAB_H / 2, 760);
  edge.addColorStop(0, 'rgba(0,0,0,0)');
  edge.addColorStop(1, 'rgba(12,10,18,0.6)');
  g.fillStyle = edge;
  g.fillRect(0, 0, LAB_W, LAB_H);
  return c;
}
