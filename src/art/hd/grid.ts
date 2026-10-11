import { PAL, PalKey } from '../pixel';

type Cell = PalKey | null;

/**
 * 촘촘한 도트(32px~)용 격자.
 * 부품을 색으로 칠해 쌓은 뒤 outline()으로 바깥 테두리를 자동으로 두른다.
 */
export class PixelGrid {
  private readonly cells: Cell[][];

  constructor(readonly w: number, readonly h: number) {
    this.cells = Array.from({ length: h }, () => Array<Cell>(w).fill(null));
  }

  get(x: number, y: number): Cell {
    return this.cells[y]?.[x] ?? null;
  }

  set(x: number, y: number, k: PalKey | null): this {
    x = Math.round(x);
    y = Math.round(y);
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.cells[y][x] = k;
    return this;
  }

  rect(x: number, y: number, w: number, h: number, k: PalKey | null): this {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, k);
    return this;
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, k: PalKey | null): this {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.set(x, y, k);
      }
    }
    return this;
  }

  /** 볼록·오목 다각형 채우기 */
  poly(pts: [number, number][], k: PalKey | null): this {
    const ys = pts.map((p) => p[1]);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
      for (let x = 0; x < this.w; x++) {
        let inside = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const [xi, yi] = pts[i];
          const [xj, yj] = pts[j];
          if (yi > y + 0.5 !== yj > y + 0.5 && x + 0.5 < ((xj - xi) * (y + 0.5 - yi)) / (yj - yi) + xi) inside = !inside;
        }
        if (inside) this.set(x, y, k);
      }
    }
    return this;
  }

  line(x0: number, y0: number, x1: number, y1: number, k: PalKey): this {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) this.set(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, k);
    return this;
  }

  /** 이미 칠해진 칸만 다시 칠한다 (음영·무늬용) */
  paintOver(test: (x: number, y: number, k: PalKey) => PalKey | null): this {
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const k = this.cells[y][x];
        if (!k) continue;
        const next = test(x, y, k);
        if (next) this.cells[y][x] = next;
      }
    }
    return this;
  }

  /** 바깥 테두리: 비어 있는 칸 중 칠해진 칸과 맞닿은 곳을 외곽선 색으로 */
  outline(k: PalKey = 'K'): this {
    const marks: [number, number][] = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.cells[y][x]) continue;
        const near = [this.get(x - 1, y), this.get(x + 1, y), this.get(x, y - 1), this.get(x, y + 1)];
        if (near.some((c) => c && c !== 'x' && c !== k)) marks.push([x, y]);
      }
    }
    marks.forEach(([x, y]) => (this.cells[y][x] = k));
    return this;
  }

  /** 좌우 뒤집은 복사본 */
  flipped(): PixelGrid {
    const g = new PixelGrid(this.w, this.h);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) g.cells[y][this.w - 1 - x] = this.cells[y][x];
    return g;
  }

  toCanvas(): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = this.w;
    c.height = this.h;
    const g = c.getContext('2d')!;
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const k = this.cells[y][x];
        if (!k) continue;
        g.fillStyle = PAL[k];
        g.fillRect(x, y, 1, 1);
      }
    }
    return c;
  }
}

/** 여러 프레임을 가로로 이어 붙인 스프라이트 시트 */
export function sheet(frames: PixelGrid[]): HTMLCanvasElement {
  const w = frames[0].w;
  const h = frames[0].h;
  const c = document.createElement('canvas');
  c.width = w * frames.length;
  c.height = h;
  const g = c.getContext('2d')!;
  frames.forEach((f, i) => g.drawImage(f.toCanvas(), i * w, 0));
  return c;
}
