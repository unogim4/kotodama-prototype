import Phaser from 'phaser';
import { TEX } from '../art/textures';
import type { WeaponId } from '../data/weapons';

/** 미리보기 스프라이트 배율 (16px → 32px) */
const S = 2;

/**
 * 무기 카드 안에서 공격 방식을 보여주는 작은 연출.
 * 언령사 + 허수아비만으로 무기마다 다른 패턴을 반복 재생한다.
 */
export class WeaponPreview {
  readonly container: Phaser.GameObjects.Container;
  private readonly dummies: Phaser.GameObjects.Image[] = [];
  private readonly orbs: Phaser.GameObjects.Image[] = [];
  private readonly lastHit = new Map<Phaser.GameObjects.Image, number>();
  private readonly cx: number;
  private readonly cy: number;
  private speed = 1;
  private orbitAngle = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly weapon: WeaponId,
    /** 미리보기 상자 (화면 좌표) */
    box: { x: number; y: number; w: number; h: number },
  ) {
    this.container = scene.add.container(box.x, box.y);
    this.cx = weapon === 'ofuda' ? 30 : box.w / 2;
    this.cy = box.h / 2 + 4;

    const mask = scene.make.graphics({}, false).fillRect(box.x, box.y, box.w, box.h);
    this.container.setMask(mask.createGeometryMask());

    const player = scene.add.image(this.cx, this.cy, TEX.player).setScale(S);
    this.container.add(player);
    scene.tweens.add({ targets: player, y: this.cy - 1, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.setup();
  }

  /** 선택된 카드는 조금 빠르게 */
  setSpeed(speed: number): void {
    this.speed = speed;
  }

  private addDummy(x: number, y: number): void {
    const d = this.scene.add.image(x, y, TEX.dummy).setScale(S);
    this.container.add(d);
    this.dummies.push(d);
  }

  private hit(d: Phaser.GameObjects.Image): void {
    const now = this.scene.time.now;
    if (now - (this.lastHit.get(d) ?? 0) < 250) return;
    this.lastHit.set(d, now);
    d.setTintFill(0xffffff);
    this.scene.time.delayedCall(70, () => d.clearTint());
    const x = d.x;
    this.scene.tweens.add({ targets: d, x: x + 2, duration: 40, yoyo: true, repeat: 1, onComplete: () => (d.x = x) });
  }

  private setup(): void {
    switch (this.weapon) {
      case 'ofuda': {
        this.addDummy(112, 28);
        this.addDummy(140, 66);
        this.addDummy(96, 74);
        let i = 0;
        this.loop(700, () => this.throwOfuda(this.dummies[i++ % this.dummies.length]));
        break;
      }
      case 'suzu': {
        this.addDummy(this.cx - 46, this.cy - 14);
        this.addDummy(this.cx + 44, this.cy + 10);
        this.addDummy(this.cx + 8, this.cy + 36);
        this.loop(1100, () => this.ring());
        break;
      }
      case 'kitsunebi': {
        this.addDummy(this.cx + 32, this.cy - 6);
        this.addDummy(this.cx - 30, this.cy + 14);
        this.addDummy(this.cx + 12, this.cy - 30);
        for (let k = 0; k < 2; k++) {
          const orb = this.scene.add.image(this.cx, this.cy, TEX.orbKitsunebi).setScale(S);
          this.container.add(orb);
          this.orbs.push(orb);
        }
        break;
      }
    }
  }

  /** 속도 배율을 반영하는 반복 타이머 */
  private loop(intervalMs: number, fn: () => void): void {
    let acc = intervalMs * 0.6;
    const tick = (_t: number, dt: number) => {
      acc += dt * this.speed;
      if (acc >= intervalMs) {
        acc -= intervalMs;
        fn();
      }
    };
    // 장면 이벤트는 장면을 다시 시작해도 남으므로 종료 시 직접 해제한다
    this.scene.events.on(Phaser.Scenes.Events.UPDATE, tick);
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scene.events.off(Phaser.Scenes.Events.UPDATE, tick));
  }

  private throwOfuda(target: Phaser.GameObjects.Image): void {
    const shot = this.scene.add.image(this.cx + 8, this.cy - 4, TEX.shotOfuda).setScale(S);
    shot.setRotation(Phaser.Math.Angle.Between(shot.x, shot.y, target.x, target.y) + Math.PI / 2);
    this.container.add(shot);
    this.scene.tweens.add({
      targets: shot,
      x: target.x,
      y: target.y - 4,
      duration: 260 / this.speed,
      onComplete: () => {
        shot.destroy();
        this.hit(target);
      },
    });
  }

  private ring(): void {
    const g = this.scene.add.graphics();
    this.container.add(g);
    const state = { r: 6, a: 1 };
    const maxR = 50;
    const hitDone = new Set<Phaser.GameObjects.Image>();
    this.scene.tweens.add({
      targets: state,
      r: maxR,
      a: 0,
      duration: 520 / this.speed,
      ease: 'Cubic.easeOut',
      onUpdate: () => {
        g.clear();
        g.lineStyle(4, 0xf0b84a, state.a * 0.35).strokeCircle(this.cx, this.cy, state.r + 2);
        g.lineStyle(2, 0xfffaf0, state.a).strokeCircle(this.cx, this.cy, state.r);
        for (const d of this.dummies) {
          if (hitDone.has(d)) continue;
          if (Phaser.Math.Distance.Between(this.cx, this.cy, d.x, d.y) <= state.r + 8) {
            hitDone.add(d);
            this.hit(d);
          }
        }
      },
      onComplete: () => g.destroy(),
    });
  }

  /** 여우불 회전 (매 프레임) */
  update(dt: number): void {
    if (this.orbs.length === 0) return;
    this.orbitAngle += (dt / 1400) * Math.PI * 2 * this.speed;
    this.orbs.forEach((orb, k) => {
      const a = this.orbitAngle + (Math.PI * 2 * k) / this.orbs.length;
      orb.setPosition(this.cx + Math.cos(a) * 30, this.cy + Math.sin(a) * 30);
      for (const d of this.dummies) {
        if (Phaser.Math.Distance.Between(orb.x, orb.y, d.x, d.y) < 14) this.hit(d);
      }
    });
  }
}
