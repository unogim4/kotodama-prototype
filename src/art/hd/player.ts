import { PixelGrid } from './grid';

/**
 * 언령사 32×32 (오른쪽을 보는 3/4 정면). 발끝이 y=31.
 * 프레임: 대기 2 · 걷기 4 · 시전 2 · 피격 1
 */
interface Pose {
  /** 상체가 내려앉는 정도 (숨쉬기·걸음) */
  bob: number;
  /** 뒷발·앞발 x 오프셋과 들림 */
  back: [number, number];
  front: [number, number];
  /** 소매 흔들림 */
  sway: number;
  /** 0 = 평소, 1 = 팔을 들어 부적을 쥠, 2 = 앞으로 던짐 */
  cast: 0 | 1 | 2;
  hurt?: boolean;
}

function draw(p: Pose): PixelGrid {
  const g = new PixelGrid(32, 32);
  const b = p.bob;
  const lean = p.hurt ? -1 : 0;

  // ── 뒷소매 ──
  g.rect(7 + lean, 15 + b + p.sway, 4, 8, 'w');
  g.rect(7 + lean, 15 + b + p.sway, 4, 1, 'W');

  // ── 포니테일 (머리 뒤) ──
  g.ellipse(7.5 + lean, 10 + b, 2.6, 4.5, 'H');
  g.ellipse(8.5 + lean, 14 + b, 1.6, 2, 'H');

  // ── 발 (버선 + 짚신) ──
  const foot = (x: number, lift: number) => {
    g.rect(x, 29 - lift, 4, 1, 'W');
    g.rect(x, 30 - lift, 4, 1, 'd');
  };
  foot(11 + p.back[0], p.back[1]);
  foot(17 + p.front[0], p.front[1]);

  // ── 하카마 (붉은 바지치마) ──
  g.poly(
    [
      [10 + lean, 19 + b],
      [22 + lean, 19 + b],
      [23 + p.front[0] * 0.5, 29],
      [9 + p.back[0] * 0.5, 29],
    ],
    'R',
  );
  // 가랑이 틈 (걸음에 따라)
  g.rect(15 + Math.round((p.back[0] + p.front[0]) / 2), 26, 2, 3, null);
  // 주름
  for (const px of [13, 16, 19]) g.line(px + lean, 21 + b, px + (px - 16) * 0.2, 27, 'r');
  // 허리끈
  g.rect(10 + lean, 19 + b, 12, 2, 'r');
  g.rect(19 + lean, 19 + b, 2, 3, 'R');

  // ── 상의 (흰 기모노) ──
  g.rect(10 + lean, 14 + b, 12, 5, 'W');
  g.rect(10 + lean, 14 + b, 1, 5, 'w');
  // 깃: 목 아래 붉은 속깃이 살짝 보이고, 겉깃 여밈선이 허리끈까지
  g.set(15 + lean, 14 + b, 'R').set(16 + lean, 14 + b, 'R').set(17 + lean, 14 + b, 'R');
  g.set(16 + lean, 15 + b, 'R');
  g.line(14 + lean, 14 + b, 17 + lean, 18 + b, 'w');

  // ── 앞소매 · 팔 ──
  if (p.cast === 0) {
    g.rect(20 + lean, 15 + b - p.sway, 5, 8, 'W');
    g.rect(24 + lean, 15 + b - p.sway, 1, 8, 'w');
    g.rect(21 + lean, 22 + b - p.sway, 3, 1, 'w');
    g.rect(22 + lean, 21 + b - p.sway, 2, 2, 'S');
  } else if (p.cast === 1) {
    // 팔을 들어 부적을 쥔다
    g.poly([[19, 15 + b], [24, 11 + b], [27, 12 + b], [23, 18 + b], [19, 19 + b]], 'W');
    g.rect(25, 10 + b, 2, 2, 'S');
    g.rect(25, 5 + b, 3, 5, 'W');
    g.rect(26, 6 + b, 1, 3, 'R');
  } else {
    // 앞으로 쭉 뻗어 던진다
    g.poly([[19, 15 + b], [28, 14 + b], [28, 17 + b], [19, 20 + b]], 'W');
    g.rect(27, 17 + b, 1, 3, 'w');
    g.rect(28, 15 + b, 2, 2, 'S');
  }

  // ── 머리 ──
  const hx = 16 + lean;
  const hy = 8 + b;
  g.ellipse(hx, hy, 8, 7, 'H');
  g.ellipse(hx + 0.5, hy + 2.5, 6, 5, 'S');
  // 앞머리 (들쭉날쭉)
  g.rect(hx - 6, hy - 2, 13, 2, 'H');
  for (const [dx, dy] of [[-4, 0], [-1, 1], [2, 0], [5, 1]]) g.rect(hx + dx, hy + dy, 2, 1, 'H');
  // 옆머리
  g.rect(hx - 8, hy, 2, 6, 'H');
  g.rect(hx + 6, hy, 2, 5, 'H');
  // 머리 끈 (붉은 리본)
  g.rect(hx - 9, hy - 4, 3, 3, 'R');
  g.set(hx - 10, hy - 3, 'r');

  // ── 얼굴 ──
  const ey = hy + 2;
  if (p.hurt) {
    // > < 눈
    for (const ex of [hx - 3, hx + 3]) {
      const d = ex < hx ? 1 : -1;
      g.set(ex - d, ey - 1, 'K').set(ex, ey, 'K').set(ex - d, ey + 1, 'K');
    }
    g.rect(hx, ey + 3, 2, 2, 'r');
  } else {
    for (const ex of [hx - 3, hx + 2]) {
      g.rect(ex, ey - 1, 2, 3, 'K');
      g.set(ex + 1, ey - 1, 'L');
    }
    g.rect(hx, ey + 3, 2, 1, 'r');
  }
  // 볼터치
  g.set(hx - 4, ey + 2, 's').set(hx + 5, ey + 2, 's');

  g.outline('K');
  // 머리카락 하이라이트 (외곽선 뒤에)
  g.rect(hx - 3, hy - 5, 4, 1, 'n');
  return g;
}

/** 프레임 이름 → 순서 (스프라이트 시트 인덱스) */
export const PLAYER_FRAMES = {
  idle: [0, 1],
  walk: [2, 3, 4, 5],
  cast: [6, 7],
  hurt: [8],
} as const;

export function playerFrames(): PixelGrid[] {
  const base = { back: [0, 0] as [number, number], front: [0, 0] as [number, number], sway: 0, cast: 0 as const };
  return [
    draw({ ...base, bob: 0 }),
    draw({ ...base, bob: 1 }),
    draw({ bob: 0, back: [-1, 0], front: [1, 1], sway: 1, cast: 0 }),
    draw({ bob: 1, back: [0, 0], front: [0, 0], sway: 0, cast: 0 }),
    draw({ bob: 0, back: [1, 1], front: [-1, 0], sway: -1, cast: 0 }),
    draw({ bob: 1, back: [0, 0], front: [0, 0], sway: 0, cast: 0 }),
    draw({ ...base, bob: 0, cast: 1 }),
    draw({ ...base, bob: 1, cast: 2 }),
    draw({ ...base, bob: 0, hurt: true }),
  ];
}
