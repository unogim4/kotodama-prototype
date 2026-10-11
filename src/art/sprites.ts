import { Grid, PalKey, canvas, rect, px } from './pixel';
import type { BossLook } from '../data/bosses';

// ── 언령사 (플레이어) 16×16 ─────────────────────────────
export const PLAYER: Grid = [
  '................',
  '.....KKKKKK.....',
  '....KHHHHHHK....',
  '...KHHHHHHHHK...',
  '...KHHHHHHHHK...',
  '...KHSSHHSSHK...',
  '...KHSSSSSSHK...',
  '...KHSKSSKSHK...',
  '...KHSKSSKSHK...',
  '....KsSSSSsK....',
  '...KLLLRRLLLK...',
  '..KSKLLLLLLKSK..',
  '..KKKRRRRRRKKK..',
  '...KRRRrrRRRK...',
  '...KRRK..KRRK...',
  '....KK....KK....',
];

// ── 봉인된 두루마리 22×11 ───────────────────────────────
export const SCROLL_SEALED: Grid = [
  '......................',
  '...KKKKKKKKKKKKKKKK...',
  '...KLLLLLRRRRLLLLLK...',
  'KKKKWWWWWRRRRWWWWWKKKK',
  'KbBKWWWWWRRRRWWWWWKBbK',
  'KbBKWWWWWRGGRWWWWWKBbK',
  'KbBKwwwwwRGGRwwwwwKBbK',
  'KbBKwwwwwrRRrwwwwwKBbK',
  'KKKKwwwwwrrrrwwwwwKKKK',
  '...KvvvvvrrrrvvvvvK...',
  '...KKKKKKKKKKKKKKKK...',
];

// ── 두루마리 받침대 28×12 ──────────────────────────────
export function stand(): HTMLCanvasElement {
  const [c, g] = canvas(28, 12);
  rect(g, 0, 0, 28, 4, 'K');
  rect(g, 1, 0, 26, 2, 'R');
  rect(g, 1, 2, 26, 1, 'r');
  rect(g, 2, 4, 3, 7, 'K');
  rect(g, 23, 4, 3, 7, 'K');
  rect(g, 3, 4, 1, 6, 'd');
  rect(g, 24, 4, 1, 6, 'd');
  rect(g, 1, 11, 26, 1, 'x');
  return c;
}

// ── 펼쳐진 족자 30×44 (글자는 DOM으로 겹쳐 그린다) ─────────
export const HANG_W = 30;
export const HANG_H = 44;
/** 족자 안 한지 영역의 중심 (글자 위치) */
export const HANG_PAPER_CENTER = { x: 15, y: 20 };

function hangingScrollFull(): HTMLCanvasElement {
  const W = HANG_W;
  const [c, g] = canvas(W, HANG_H);
  // 위 축 + 걸이 끈
  rect(g, 0, 1, W, 4, 'K');
  rect(g, 1, 2, W - 2, 2, 'B');
  rect(g, 1, 2, W - 2, 1, 'b');
  rect(g, 0, 1, 2, 4, 'd');
  rect(g, W - 2, 1, 2, 4, 'd');
  rect(g, 13, 0, 4, 1, 'R');
  // 표구(남색 테두리) + 한지
  rect(g, 3, 5, 24, 33, 'K');
  rect(g, 4, 5, 22, 32, 'n');
  rect(g, 5, 5, 20, 31, 'N');
  rect(g, 6, 7, 18, 27, 'W');
  rect(g, 6, 7, 1, 27, 'L');
  rect(g, 6, 33, 18, 1, 'w');
  // 낙관(붉은 도장)
  rect(g, 19, 28, 3, 3, 'R');
  px(g, 20, 29, 'r');
  // 아래 축
  rect(g, 1, 37, W - 2, 4, 'K');
  rect(g, 2, 38, W - 4, 2, 'B');
  rect(g, 2, 38, W - 4, 1, 'b');
  rect(g, 0, 37, 3, 4, 'd');
  rect(g, W - 3, 37, 3, 4, 'd');
  rect(g, 3, 42, W - 6, 1, 'x');
  return c;
}

/**
 * 족자가 펼쳐지는 프레임. reveal 0 = 말려 있음, 1 = 다 펼침.
 * 위쪽 한지를 reveal 만큼 보여주고, 아래 축을 그 끝에 붙인다.
 */
export function hangingScrollFrames(steps = [0, 0.25, 0.5, 0.75, 1]): HTMLCanvasElement[] {
  const full = hangingScrollFull();
  const PAPER = 32; // 한지(표구 포함) 높이: y 5 ~ 36
  const BOTTOM_Y = 37;
  const BOTTOM_H = HANG_H - BOTTOM_Y;
  return steps.map((r) => {
    const ph = Math.round(PAPER * r);
    const [c, g] = canvas(HANG_W, HANG_H);
    g.drawImage(full, 0, 0, HANG_W, 5 + ph, 0, 0, HANG_W, 5 + ph);
    g.drawImage(full, 0, BOTTOM_Y, HANG_W, BOTTOM_H, 0, 5 + ph, HANG_W, BOTTOM_H);
    return c;
  });
}

// ── 금빛 (펼칠 때 뒤에서 퍼지는 빛) 64×64 ────────────────
export function glow(): HTMLCanvasElement {
  const [c, g] = canvas(64, 64);
  const rings: [number, number][] = [[32, 0.1], [24, 0.14], [16, 0.2]];
  for (const [r, a] of rings) {
    g.fillStyle = `rgba(240,184,74,${a})`;
    g.beginPath();
    g.arc(32, 32, r, 0, Math.PI * 2);
    g.fill();
  }
  return c;
}

export function spark(): HTMLCanvasElement {
  const [c, g] = canvas(3, 3);
  px(g, 1, 0, 'G');
  px(g, 0, 1, 'G');
  px(g, 1, 1, 'L');
  px(g, 2, 1, 'G');
  px(g, 1, 2, 'G');
  return c;
}

// ── 서고 배경 320×180 (카메라 2배 줌으로 640×360을 채운다) ─────
export const LIB_W = 320;
export const LIB_H = 180;
export const LIB_FLOOR_Y = 84;

export interface DoorRect { x: number; y: number; w: number; h: number }

export function libraryBackground(hookXs: number[], hookY: number, door: DoorRect): HTMLCanvasElement {
  const [c, g] = canvas(LIB_W, LIB_H);

  // 벽
  rect(g, 0, 0, LIB_W, LIB_FLOOR_Y, 'N');
  rect(g, 0, 0, LIB_W, 8, 'n');
  for (let x = 0; x < LIB_W; x += 8) rect(g, x, 8, 1, LIB_FLOOR_Y - 8, 'n');
  // 나게시(장식 들보)
  rect(g, 0, 12, LIB_W, 5, 'K');
  rect(g, 0, 13, LIB_W, 3, 'B');
  rect(g, 0, 13, LIB_W, 1, 'b');
  // 기둥
  for (const x of [0, 38, 278, 314]) {
    rect(g, x, 0, 6, LIB_FLOOR_Y, 'K');
    rect(g, x + 1, 0, 4, LIB_FLOOR_Y, 'B');
    rect(g, x + 1, 0, 1, LIB_FLOOR_Y, 'b');
  }

  // 양쪽 책장
  for (const sx of [6]) {
    rect(g, sx, 20, 32, 64, 'd');
    rect(g, sx + 1, 21, 30, 62, 'K');
    for (let s = 0; s < 4; s++) {
      const sy = 22 + s * 15;
      rect(g, sx + 1, sy + 13, 30, 2, 'B');
      for (let k = 0; k < 5; k++) {
        const kx = sx + 3 + k * 6;
        const tone = (k + s + sx) % 3 ? 'w' : 'v';
        rect(g, kx, sy + 3, 4, 10, tone);
        rect(g, kx, sy + 6, 4, 1, 'r');
      }
    }
  }

  // 오른쪽 문간: 상인방 + 어두운 안쪽 (장지문은 따로 그려 움직인다)
  rect(g, door.x - 2, door.y - 5, door.w + 4, 5, 'K');
  rect(g, door.x - 1, door.y - 4, door.w + 2, 3, 'B');
  rect(g, door.x - 1, door.y - 4, door.w + 2, 1, 'b');
  rect(g, door.x, door.y, door.w, door.h, 'K');
  for (let i = 0; i < 4; i++) rect(g, door.x + 3 + i * 2, door.y + 30 + i * 7, door.w - 6 - i * 4, 1, 'n');

  // 족자 걸이(금 고리)
  for (const x of hookXs) {
    rect(g, x - 1, hookY - 2, 2, 2, 'g');
    px(g, x - 1, hookY - 2, 'G');
  }

  // 걸레받이
  rect(g, 0, LIB_FLOOR_Y - 2, LIB_W, 2, 'K');

  // 마루
  rect(g, 0, LIB_FLOOR_Y, LIB_W, LIB_H - LIB_FLOOR_Y, 'B');
  for (let y = LIB_FLOOR_Y, o = 0; y < LIB_H; y += 8, o = (o + 29) % 48) {
    rect(g, 0, y, LIB_W, 1, 'd');
    rect(g, 0, y + 1, LIB_W, 1, 'b');
    for (let x = o; x < LIB_W; x += 48) rect(g, x, y, 1, 8, 'd');
  }
  // 벽 아래 그림자
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.fillRect(0, LIB_FLOOR_Y, LIB_W, 3);

  // 중앙 붉은 깔개
  rect(g, 136, 130, 48, 50, 'r');
  rect(g, 138, 130, 44, 50, 'R');
  for (let y = 134; y < LIB_H; y += 6) rect(g, 140, y, 40, 1, 'r');

  return c;
}


// ── 무기 아이콘 16×16 ──────────────────────────────────
export const ICON_OFUDA: Grid = [
  '................',
  '.....KKKKKK.....',
  '.....KLLLLK.....',
  '.....KWRRWK.....',
  '.....KWWWWK.....',
  '.....KWRRWK.....',
  '.....KWWRWK.....',
  '.....KWRRWK.....',
  '.....KWRWWK.....',
  '.....KWRRWK.....',
  '.....KWWWWK.....',
  '.....KWGGWK.....',
  '.....KWGGWK.....',
  '.....KwwwwK.....',
  '.....KKKKKK.....',
  '................',
];

export const ICON_SUZU: Grid = [
  '......RRRR......',
  '......R..R......',
  '.....KKKKKK.....',
  '...KKGGGGGGKK...',
  '..KGGLLGGGGGgK..',
  '.KGGLGGGGGGGGgK.',
  '.KGGGGGGGGGGGgK.',
  '.KGGGGGGGGGGGgK.',
  '.KgGGGGGGGGGggK.',
  '.KgKKKKKKKKKKgK.',
  '.KggGGGGGGGgggK.',
  '..KggggggggggK..',
  '...KKggggggKK...',
  '.....KKKKKK.....',
  '................',
  '................',
];

export const ICON_KITSUNEBI: Grid = [
  '........K.......',
  '.......KCK......',
  '......KCCK......',
  '......KCLCK.....',
  '.....KCLLCK.....',
  '....KCCLLCCK....',
  '...KcCLLLLCCK...',
  '...KcCLLLLLCK...',
  '..KccCLLLLLCcK..',
  '..KcCCLLLLCCcK..',
  '..KccCCLLCCccK..',
  '...KccCCCCccK...',
  '....KKccccKK....',
  '......KKKK......',
  '................',
  '................',
];

// ── 무기 투사체 ───────────────────────────────────────
export const SHOT_OFUDA: Grid = [
  'KKKKK',
  'KWRWK',
  'KWWWK',
  'KWRWK',
  'KWRWK',
  'KWWWK',
  'KKKKK',
];

export const ORB_KITSUNEBI: Grid = [
  '...KK...',
  '..KCCK..',
  '.KCLLCK.',
  'KCLLLLCK',
  'KCLLLLCK',
  '.KcCCcK.',
  '..KccK..',
  '...KK...',
];

// ── 허수아비 (무기 미리보기용 과녁) 16×16 ──────────────────
export const DUMMY: Grid = [
  '................',
  '......KKKK......',
  '.....KGGGgK.....',
  '.....KGgGgK.....',
  '.....KrrrrK.....',
  '.....KGGGgK.....',
  '.....KGgGgK.....',
  '.....KGGGgK.....',
  '.....KrrrrK.....',
  '.....KGgGgK.....',
  '.....KGGGgK.....',
  '......KddK......',
  '......KBdK......',
  '......KBdK......',
  '....KKKKKKKK....',
  '....xxxxxxxx....',
];

// ── 서고 문: 장지문 한 짝 15×60 ─────────────────────────
export function doorPanel(): HTMLCanvasElement {
  const W = 15, H = 60;
  const [c, g] = canvas(W, H);
  rect(g, 0, 0, W, H, 'd');
  rect(g, 1, 1, W - 2, H - 2, 'W');
  rect(g, 1, 1, 1, H - 2, 'L');
  // 살(格子)
  for (const x of [5, 9]) rect(g, x, 1, 1, 46, 'B');
  for (let y = 10; y < 47; y += 9) rect(g, 1, y, W - 2, 1, 'B');
  // 아래 널판
  rect(g, 1, 47, W - 2, 12, 'B');
  rect(g, 1, 47, W - 2, 1, 'd');
  rect(g, 2, 49, W - 4, 1, 'b');
  // 손잡이 홈 (문이 만나는 쪽)
  rect(g, W - 4, 28, 2, 4, 'K');
  return c;
}

// ── 서고 문 봉인: 금줄 + 시데 + 부적 34×20 ─────────────────
export function doorSeal(): HTMLCanvasElement {
  const W = 34, H = 20;
  const [c, g] = canvas(W, H);
  // 꼬인 금줄
  rect(g, 0, 2, W, 4, 'K');
  for (let x = 1; x < W - 1; x++) {
    px(g, x, 3, x % 3 === 0 ? 'g' : 'G');
    px(g, x, 4, x % 3 === 1 ? 'g' : 'G');
  }
  // 시데(번개 모양 종이)
  for (const sx of [5, 26]) {
    const zig = [[0, 6], [0, 7], [1, 8], [2, 9], [2, 10], [1, 11], [0, 12], [0, 13], [1, 14]];
    for (const [dx, y] of zig) {
      rect(g, sx + dx, y, 3, 1, 'L');
      px(g, sx + dx + 3, y, 'K');
    }
  }
  // 가운데 부적
  rect(g, 14, 4, 6, 15, 'K');
  rect(g, 15, 5, 4, 13, 'W');
  rect(g, 16, 6, 2, 2, 'R');
  rect(g, 16, 9, 2, 1, 'R');
  rect(g, 16, 11, 1, 3, 'R');
  rect(g, 17, 14, 1, 2, 'R');
  return c;
}

// ── 요괴: 히토다마(人魂) 16×16, 2프레임 ──────────────────
export const HITODAMA: Grid[] = [
  [
    '................',
    '.........p......',
    '........pP......',
    '.......pPLp.....',
    '......pPLLPp....',
    '.....pPLLLLPp...',
    '....pPLLLLLLPp..',
    '...pPLLLLLLLLPp.',
    '...pPLKKLLKKLPp.',
    '...pPLKKLLKKLPp.',
    '...pPLLLLLLLLPp.',
    '....pPLLLLLLPp..',
    '.....pPPLLPPp...',
    '......ppPPpp....',
    '................',
    '................',
  ],
  [
    '................',
    '.......p........',
    '.......Pp.......',
    '......pLPp......',
    '.....pPLLPp.....',
    '.....pPLLLLPp...',
    '....pPLLLLLLPp..',
    '...pPLLLLLLLLPp.',
    '...pPLKKLLKKLPp.',
    '...pPLKKLLKKLPp.',
    '...pPLLLLLLLLPp.',
    '....pPLLLLLLPp..',
    '.....pPPLLPPp...',
    '......ppPPpp....',
    '................',
    '................',
  ],
];

// ── 요괴: 가라카사(唐傘お化け) 16×16, 2프레임 (깡충) ─────────
export const KASA: Grid[] = [
  [
    '.......KK.......',
    '......KRRK......',
    '.....KRRRRK.....',
    '....KRRRRRRK....',
    '...KRRLLLRRRK...',
    '..KRRLLKKLRRRK..',
    '.KRRRLLKKLRRRRK.',
    '.KRRRRLLLRRRRRK.',
    'KrRrRrRRRRrRrRrK',
    '.KK.KK.KK.KK.KK.',
    '.......KdK......',
    '.......KdK......',
    '.......KdK......',
    '.......KdK......',
    '......KKKKK.....',
    '......KdddK.....',
  ],
  [
    '................',
    '.......KK.......',
    '......KRRK......',
    '.....KRRRRK.....',
    '....KRRRRRRK....',
    '...KRRLLLRRRK...',
    '..KRRLLKKLRRRK..',
    '.KRRRLLKKLRRRRK.',
    '.KRRRRLLLRRRRRK.',
    'KrRrRrRRRRrRrRrK',
    '.KK.KK.KK.KK.KK.',
    '.......KdK......',
    '.......KdK......',
    '......KKKKK.....',
    '......KdddK.....',
    '................',
  ],
];

// ── 언령 구슬 (경험치) 6×6 ─────────────────────────────
export const GEM: Grid = [
  '..KK..',
  '.KGGK.',
  'KGLGgK',
  'KGGggK',
  '.KggK.',
  '..KK..',
];

// ── 습격 아레나: 신사 경내 480×270 ────────────────────────
export const ARENA_W = 480;
export const ARENA_H = 270;
/** 담장 아래 (마당이 시작되는 y) */
export const ARENA_WALL_Y = 46;
/** 토리이 48×46, 마당 위쪽 가운데 */
export const TORII = { x: 216, y: 4, w: 48, h: 46 };
/** 토리이 기둥 사이 (출구) */
export const TORII_GATE = { x: TORII.x + 14, w: 20 };

export function arenaBackground(): HTMLCanvasElement {
  const [c, g] = canvas(ARENA_W, ARENA_H);
  // 자갈 마당 + 갈퀴 무늬
  rect(g, 0, 0, ARENA_W, ARENA_H, 'v');
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let y = ARENA_WALL_Y + 4; y < ARENA_H; y += 6) {
    for (let x = 0; x < ARENA_W; x++) if ((x + y) % 3 !== 0) px(g, x, y, 'w');
  }
  for (let i = 0; i < 1600; i++) px(g, Math.floor(rnd() * ARENA_W), ARENA_WALL_Y + Math.floor(rnd() * (ARENA_H - ARENA_WALL_Y)), rnd() < 0.5 ? 'W' : 'g');

  // 담장 (나무 울타리 + 기와)
  rect(g, 0, 0, ARENA_W, ARENA_WALL_Y, 'n');
  rect(g, 0, 0, ARENA_W, 6, 'K');
  rect(g, 0, 6, ARENA_W, 2, 'N');
  for (let x = 2; x < ARENA_W; x += 8) {
    rect(g, x, 10, 4, ARENA_WALL_Y - 12, 'B');
    rect(g, x, 10, 1, ARENA_WALL_Y - 12, 'b');
  }
  rect(g, 0, 18, ARENA_W, 2, 'd');
  rect(g, 0, 34, ARENA_W, 2, 'd');
  rect(g, 0, ARENA_WALL_Y - 2, ARENA_W, 2, 'K');
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.fillRect(0, ARENA_WALL_Y, ARENA_W, 4);

  // 토리이 뒤 통로 (어둠)
  rect(g, TORII_GATE.x, 6, TORII_GATE.w, ARENA_WALL_Y - 6, 'K');

  // 토리이
  const t = TORII;
  rect(g, t.x - 2, t.y, t.w + 4, 4, 'K');
  rect(g, t.x - 1, t.y + 1, t.w + 2, 2, 'R');
  rect(g, t.x + 2, t.y + 4, t.w - 4, 3, 'K');
  rect(g, t.x + 3, t.y + 5, t.w - 6, 1, 'r');
  rect(g, t.x + 4, t.y + 14, t.w - 8, 4, 'K');
  rect(g, t.x + 5, t.y + 15, t.w - 10, 2, 'R');
  rect(g, t.x + 21, t.y + 7, 6, 7, 'K');
  rect(g, t.x + 22, t.y + 8, 4, 5, 'G');
  for (const px0 of [t.x + 8, t.x + 34]) {
    rect(g, px0, t.y + 4, 6, t.h - 4, 'K');
    rect(g, px0 + 1, t.y + 4, 4, t.h - 4, 'R');
    rect(g, px0 + 4, t.y + 4, 1, t.h - 4, 'r');
    rect(g, px0 - 1, t.y + t.h - 6, 8, 6, 'K');
    rect(g, px0, t.y + t.h - 5, 6, 4, 'd');
  }

  // 석등 두 개
  for (const lx of [150, 322]) {
    rect(g, lx, 52, 12, 3, 'K');
    rect(g, lx + 1, 55, 10, 6, 'w');
    rect(g, lx + 4, 56, 4, 4, 'G');
    rect(g, lx - 1, 51, 14, 2, 'v');
    rect(g, lx + 4, 61, 4, 8, 'w');
    rect(g, lx + 2, 69, 8, 3, 'v');
    rect(g, lx + 1, 72, 10, 1, 'x');
  }
  return c;
}

// ── 보스: 야마비코(山彦) 48×48 ────────────────────────────
function fillEllipse(g: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, key: PalKey): void {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) px(g, x, y, key);
    }
  }
}

/** 외곽선 1px을 두른 타원 */
function outlinedEllipse(g: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, key: PalKey): void {
  fillEllipse(g, cx, cy, rx + 1, ry + 1, 'K');
  fillEllipse(g, cx, cy, rx, ry, key);
}

/** 다각형(삼각형 등) 채우기 — 뿔·뾰족귀·불꽃용 */
function fillPoly(g: CanvasRenderingContext2D, pts: [number, number][], key: PalKey): void {
  const ys = pts.map((p) => p[1]);
  for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
    for (let x = 0; x < 48; x++) {
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i];
        const [xj, yj] = pts[j];
        if (yi > y + 0.5 !== yj > y + 0.5 && x + 0.5 < ((xj - xi) * (y + 0.5 - yi)) / (yj - yi) + xi) inside = !inside;
      }
      if (inside) px(g, x, y, key);
    }
  }
}

/** 외곽선 1px을 두른 다각형 */
function outlinedPoly(g: CanvasRenderingContext2D, pts: [number, number][], key: PalKey): void {
  const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length;
  const cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
  fillPoly(g, pts.map(([x, y]) => [x + Math.sign(x - cx), y + Math.sign(y - cy)] as [number, number]), 'K');
  fillPoly(g, pts, key);
}

/** 눈·코·입 (공통 얼굴). cy = 얼굴 중심 y */
function face(g: CanvasRenderingContext2D, L: BossLook, shout: boolean, cy: number): void {
  if (L.eyes === 'one') {
    fillEllipse(g, 24, cy - 4, 4, 4, 'K');
    fillEllipse(g, 24, cy - 4, 3, 3, 'L');
    rect(g, 23, cy - 5, 2, 2, 'K');
  } else {
    for (const ex of [19, 29]) {
      rect(g, ex - 1, cy - 5, 3, 3, 'K');
      px(g, ex, cy - 4, 'G');
    }
  }
  if (L.nose === 'beak') {
    outlinedEllipse(g, 24, cy + 3, 5, shout ? 4 : 2.5, 'G');
    rect(g, 20, cy + 3, 9, 1, shout ? 'r' : 'g');
  } else if (shout) {
    fillEllipse(g, 24, cy + 4, 5, 5, 'K');
    fillEllipse(g, 24, cy + 5, 3.5, 3.5, 'r');
    rect(g, 22, cy + 1, 5, 1, 'L');
  } else {
    rect(g, 21, cy + 4, 7, 2, 'K');
    rect(g, 22, cy + 4, 5, 1, 'r');
  }
  if (L.nose === 'long') {
    // 텐구의 긴 코: 얼굴 가운데서 아래로 길게
    rect(g, 22, cy - 3, 5, 9, 'K');
    rect(g, 23, cy - 3, 3, 8, L.face);
    fillEllipse(g, 24.5, cy + 6, 2.5, 2, L.faceShade);
  }
}

/** 털짐승형 요괴 (야마비코·갓파·사토리·텐구·바케네코·오니·야마우바·라이쥬) */
function beastBoss(g: CanvasRenderingContext2D, L: BossLook, shout: boolean): void {
  const hair: PalKey = L.furLight === 'W' ? 'L' : 'K';
  // 등 뒤: 날개 · 꼬리 · 번개
  if (L.extra === 'wings') {
    for (const wx of [7, 41]) {
      outlinedEllipse(g, wx, 28, 7, 14, 'K');
      for (let i = 0; i < 4; i++) rect(g, wx - 3, 20 + i * 5, 6, 1, 'n');
    }
  }
  if (L.extra === 'tails') {
    for (const [tx, ty] of [[40, 40], [43, 34], [44, 27], [37, 38], [38, 31], [36, 24]] as const) outlinedEllipse(g, tx, ty, 3, 3, L.fur);
    fillEllipse(g, 44, 26, 2, 2, L.furLight);
    fillEllipse(g, 36, 23, 2, 2, L.furLight);
  }
  if (L.extra === 'bolt') {
    outlinedPoly(g, [[36, 40], [46, 30], [41, 30], [47, 20], [37, 32], [42, 32]], 'G');
  }
  // 귀
  if (L.ears === 'round') {
    for (const ex of [11, 37]) {
      fillEllipse(g, ex, 9, 5, 6, 'K');
      fillEllipse(g, ex, 9, 4, 5, L.fur);
      fillEllipse(g, ex, 10, 2, 3, 's');
    }
  } else if (L.ears === 'pointy') {
    outlinedPoly(g, [[9, 14], [12, 1], [19, 9]], L.fur);
    outlinedPoly(g, [[39, 14], [36, 1], [29, 9]], L.fur);
    fillPoly(g, [[11, 12], [12, 5], [16, 10]], 's');
    fillPoly(g, [[37, 12], [36, 5], [32, 10]], 's');
  }
  // 발 · 몸통
  outlinedEllipse(g, 15, 44, 5, 3, L.furDark);
  outlinedEllipse(g, 33, 44, 5, 3, L.furDark);
  outlinedEllipse(g, 24, 32, 17, 12, L.fur);
  for (let i = 0; i < 40; i++) px(g, 9 + ((i * 7) % 30), 24 + ((i * 11) % 18), i % 3 ? L.furLight : L.furDark);
  fillEllipse(g, 24, 35, 9, 7, L.furLight);
  // 머리
  outlinedEllipse(g, 24, 17, 15, 12, L.fur);
  for (let i = 0; i < 18; i++) px(g, 11 + ((i * 5) % 26), 7 + ((i * 3) % 6), L.furLight);
  // 머리카락 · 접시 · 뿔
  if (L.extra === 'hair') {
    fillEllipse(g, 24, 9, 15, 6, hair);
    for (let i = 0; i < 7; i++) fillPoly(g, [[10 + i * 4, 8], [12 + i * 4, 1 + (i % 2) * 2], [14 + i * 4, 8]], hair);
    if (hair === 'L') {
      rect(g, 8, 10, 4, 18, hair);
      rect(g, 36, 10, 4, 18, hair);
    }
  }
  if (L.extra === 'plate') {
    for (let i = 0; i < 9; i++) fillPoly(g, [[10 + i * 3.5, 9], [12 + i * 3.5, 4], [14 + i * 3.5, 9]], L.furDark);
    outlinedEllipse(g, 24, 5, 8, 2.5, 'W');
    fillEllipse(g, 24, 5, 6, 1.5, 'L');
  }
  if (L.horns === 2) {
    outlinedPoly(g, [[13, 8], [11, -1], [18, 6]], 'W');
    outlinedPoly(g, [[35, 8], [37, -1], [30, 6]], 'W');
  } else if (L.horns === 1) {
    outlinedPoly(g, [[21, 6], [24, -2], [27, 6]], 'W');
  }
  // 얼굴
  fillEllipse(g, 24, 20, 10, 8, L.face);
  fillEllipse(g, 24, 23, 8, 4, L.faceShade);
  face(g, L, shout, 20);
  // 손 (외칠 땐 입가로)
  const hy = shout ? 23 : 33;
  const hx = shout ? 11 : 7;
  outlinedEllipse(g, hx, hy, 4, 3.5, L.furDark);
  outlinedEllipse(g, 48 - hx, hy, 4, 3.5, L.furDark);
}

/** 누리카베: 거대한 벽 */
function wallBoss(g: CanvasRenderingContext2D, L: BossLook, shout: boolean): void {
  rect(g, 3, 4, 42, 41, 'K');
  rect(g, 4, 5, 40, 39, L.fur);
  for (let y = 11; y < 44; y += 7) {
    rect(g, 4, y, 40, 1, L.furDark);
    for (let x = 4 + (Math.floor(y / 7) % 2) * 6; x < 44; x += 12) rect(g, x, y - 6, 1, 6, L.furDark);
  }
  rect(g, 4, 5, 40, 2, L.furLight);
  // 짧은 팔다리
  outlinedEllipse(g, 2, 30, 2.5, 4, L.furDark);
  outlinedEllipse(g, 46, 30, 2.5, 4, L.furDark);
  outlinedEllipse(g, 14, 45, 4, 2, L.furDark);
  outlinedEllipse(g, 34, 45, 4, 2, L.furDark);
  fillEllipse(g, 24, 22, 12, 9, L.faceShade);
  fillEllipse(g, 24, 21, 11, 8, L.face);
  face(g, L, shout, 21);
}

/** 와뉴도: 불타는 수레바퀴 속 얼굴 */
function wheelBoss(g: CanvasRenderingContext2D, L: BossLook, shout: boolean): void {
  // 위쪽 불꽃
  for (let i = 0; i < 9; i++) {
    const a = Math.PI + (Math.PI * i) / 8;
    const fx = 24 + Math.cos(a) * 19;
    const fy = 26 + Math.sin(a) * 18;
    fillPoly(g, [[fx - 4, fy + 2], [fx + Math.cos(a) * 9, fy + Math.sin(a) * 9 - 2], [fx + 4, fy + 2]], i % 2 ? 'R' : 'G');
  }
  outlinedEllipse(g, 24, 27, 20, 19, L.furDark);
  fillEllipse(g, 24, 27, 17, 16, 'K');
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI * 2 * i) / 8;
    for (let r = 10; r < 17; r++) rect(g, Math.round(24 + Math.cos(a) * r), Math.round(27 + Math.sin(a) * r), 2, 2, L.fur);
  }
  outlinedEllipse(g, 24, 27, 11, 10, L.face);
  fillEllipse(g, 24, 30, 8, 4, L.faceShade);
  // 굵은 눈썹
  rect(g, 16, 20, 6, 2, 'K');
  rect(g, 27, 20, 6, 2, 'K');
  face(g, L, shout, 28);
}

/** 보스 요괴 48×48. shout: 입을 크게 벌린 '외침' 프레임 */
export function yokaiBoss(L: BossLook, shout: boolean): HTMLCanvasElement {
  const [c, g] = canvas(48, 48);
  if (L.body === 'wall') wallBoss(g, L, shout);
  else if (L.body === 'wheel') wheelBoss(g, L, shout);
  else beastBoss(g, L, shout);
  return c;
}

// ── 메아리 탄 7×7 ─────────────────────────────────────
export const ECHO_SHOT: Grid = [
  '..KKK..',
  '.KPPPK.',
  'KPLLLPK',
  'KPLWLPK',
  'KPLLLPK',
  '.KPPPK.',
  '..KKK..',
];

// ── 메아리 바닥 돌판 28×18 (상태별 테두리 색) ──────────────
export function floorTile(edge: PalKey): HTMLCanvasElement {
  const [c, g] = canvas(28, 18);
  rect(g, 0, 2, 28, 16, 'x');
  rect(g, 0, 0, 28, 16, 'K');
  rect(g, 1, 1, 26, 14, edge);
  rect(g, 3, 3, 22, 10, 'w');
  rect(g, 3, 3, 22, 1, 'W');
  rect(g, 3, 12, 22, 1, 'v');
  return c;
}

// ── 보스 아레나: 산속 신사 마당 320×180 (카메라 고정 2배) ────────
export const BOSS_W = 320;
export const BOSS_H = 180;
/** 언령사가 다닐 수 있는 타원형 돌마당 */
export const BOSS_FLOOR = { cx: 160, cy: 114, rx: 146, ry: 58 };

export function bossBackground(): HTMLCanvasElement {
  const [c, g] = canvas(BOSS_W, BOSS_H);
  // 밤하늘
  rect(g, 0, 0, BOSS_W, BOSS_H, 'n');
  rect(g, 0, 0, BOSS_W, 18, 'K');
  for (let y = 18; y < 40; y += 3) for (let x = (y * 7) % 5; x < BOSS_W; x += 5) px(g, x, y, 'K');
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 40; i++) px(g, Math.floor(rnd() * BOSS_W), Math.floor(rnd() * 40), rnd() < 0.3 ? 'G' : 'L');
  // 둥근 달
  fillEllipse(g, 262, 20, 9, 9, 'W');
  fillEllipse(g, 265, 18, 7, 7, 'L');
  // 산 능선
  for (let x = 0; x < BOSS_W; x++) {
    const h1 = 44 + Math.sin(x / 23) * 8 + Math.sin(x / 9) * 3;
    rect(g, x, Math.floor(h1), 1, BOSS_H, 'K');
  }
  // 돌마당 (타원)
  const f = BOSS_FLOOR;
  fillEllipse(g, f.cx, f.cy + 2, f.rx + 10, f.ry + 10, 'K');
  fillEllipse(g, f.cx, f.cy, f.rx + 8, f.ry + 8, 'v');
  fillEllipse(g, f.cx, f.cy, f.rx + 2, f.ry + 2, 'w');
  // 돌 이음매
  for (let y = f.cy - f.ry; y < f.cy + f.ry; y += 8) {
    for (let x = f.cx - f.rx; x < f.cx + f.rx; x++) {
      const dx = (x - f.cx) / f.rx;
      const dy = (y - f.cy) / f.ry;
      if (dx * dx + dy * dy < 1) px(g, x, y, 'v');
    }
  }
  for (let y = f.cy - f.ry; y < f.cy + f.ry; y += 8) {
    for (let x = f.cx - f.rx + ((y / 8) % 2) * 8; x < f.cx + f.rx; x += 16) {
      const dx = (x - f.cx) / f.rx;
      const dy = (y + 4 - f.cy) / f.ry;
      if (dx * dx + dy * dy < 1) rect(g, x, y, 1, 8, 'v');
    }
  }
  // 양쪽 석등
  for (const lx of [10, 298]) {
    rect(g, lx, 78, 12, 3, 'K');
    rect(g, lx + 1, 81, 10, 7, 'v');
    rect(g, lx + 4, 82, 4, 5, 'G');
    rect(g, lx + 4, 88, 4, 12, 'v');
    rect(g, lx + 2, 100, 8, 3, 'K');
  }
  return c;
}
