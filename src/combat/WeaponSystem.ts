import Phaser from 'phaser';
import { TEX } from '../art/textures';
import type { WeaponDef } from '../data/weapons';
import { run } from '../systems/run';

/** 무기가 때릴 수 있는 대상 (요괴·보스 공용) */
export interface Target {
  sprite: Phaser.GameObjects.Image;
  hp: number;
  /** 몸통 반지름 (충돌) */
  radius: number;
  /** 여우불에 마지막으로 맞은 시각 */
  orbHitAt: number;
}

export type HitFn = (t: Target, damage: number, fromX: number, fromY: number, knock: number) => void;

interface Shot {
  sprite: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  life: number;
  pierce: number;
  hit: Set<Target>;
}

/**
 * 부적·방울·여우불의 자동 공격. 습격 방과 보스방이 함께 쓴다.
 * 맞았을 때 처리(피해·넉백·처치)는 장면이 onHit으로 정한다.
 */
export class WeaponSystem {
  private shots: Shot[] = [];
  private orbs: Phaser.GameObjects.Image[] = [];
  private orbAngle = 0;
  private acc = 0;
  /** 몸통 중심이 발보다 얼마나 위인지 */
  private readonly aimY = 8;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly weapon: WeaponDef,
    private readonly player: Phaser.GameObjects.Image,
    private readonly targets: () => Target[],
    private readonly onHit: HitFn,
  ) {}

  /** active가 false면 공격하지 않는다 (여우불은 계속 돌기만) */
  update(dt: number, active: boolean): void {
    if (active) this.fire(dt);
    this.updateShots(dt);
    this.updateOrbs(dt, active);
  }

  private get damage(): number {
    return this.weapon.base.damage * run.build.damage;
  }

  private fire(dt: number): void {
    if (this.weapon.id === 'kitsunebi') return; // 여우불은 늘 돈다
    const cd = this.weapon.base.cooldownMs * run.build.cooldown;
    this.acc += dt;
    if (this.acc < cd) return;
    if (this.weapon.id === 'ofuda') {
      if (this.throwOfuda()) this.acc = 0;
    } else {
      this.acc = 0;
      for (let i = 0; i < run.build.count; i++) this.scene.time.delayedCall(i * 200, () => this.ringPulse());
    }
  }

  /** 가까운 대상부터 count장. 사거리 안에 없으면 던지지 않는다 */
  private throwOfuda(): boolean {
    const p = this.player;
    const sx = p.x;
    const sy = p.y - this.aimY;
    const range = this.weapon.base.range;
    const list = this.targets()
      .filter((t) => t.hp > 0)
      .map((t) => ({ t, d: Phaser.Math.Distance.Between(sx, sy, t.sprite.x, t.sprite.y) - t.radius }))
      .filter((x) => x.d <= range)
      .sort((a, b) => a.d - b.d)
      .slice(0, run.build.count);
    if (list.length === 0) return false;
    // 대상이 count보다 적으면 가장 가까운 대상에게 조금씩 벌려서 여러 장
    for (let i = 0; i < run.build.count; i++) {
      const t = list[i % list.length].t;
      const spread = i >= list.length ? (i - list.length + 1) * 0.15 : 0;
      const a = Phaser.Math.Angle.Between(sx, sy, t.sprite.x, t.sprite.y) + spread;
      const sprite = this.scene.add.image(sx, sy, TEX.shotOfuda).setRotation(a + Math.PI / 2).setDepth(500);
      const speed = 230;
      this.shots.push({ sprite, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: 900, pierce: run.build.pierce, hit: new Set() });
    }
    return true;
  }

  private updateShots(dt: number): void {
    const targets = this.targets();
    for (const shot of this.shots) {
      shot.sprite.x += (shot.vx * dt) / 1000;
      shot.sprite.y += (shot.vy * dt) / 1000;
      shot.life -= dt;
      for (const t of targets) {
        if (shot.life <= 0 || t.hp <= 0 || shot.hit.has(t)) continue;
        if (Phaser.Math.Distance.Between(shot.sprite.x, shot.sprite.y, t.sprite.x, t.sprite.y) < t.radius + 3) {
          shot.hit.add(t);
          this.onHit(t, this.damage, shot.sprite.x, shot.sprite.y, 60);
          if (shot.pierce-- <= 0) shot.life = 0;
        }
      }
    }
    this.shots = this.shots.filter((s) => {
      if (s.life > 0) return true;
      s.sprite.destroy();
      return false;
    });
  }

  /** 방울: 주변을 한꺼번에 치는 원형 음파 */
  private ringPulse(): void {
    const p = this.player;
    const cx = p.x;
    const cy = p.y - 6;
    const r = this.weapon.base.range * run.build.area;
    for (const t of [...this.targets()]) {
      if (t.hp > 0 && Phaser.Math.Distance.Between(cx, cy, t.sprite.x, t.sprite.y) <= r + t.radius) this.onHit(t, this.damage, cx, cy, 90);
    }
    const g = this.scene.add.graphics().setDepth(499);
    const st = { r: 4, a: 1 };
    this.scene.tweens.add({
      targets: st,
      r,
      a: 0,
      duration: 280,
      ease: 'Cubic.easeOut',
      onUpdate: () => {
        g.clear();
        g.lineStyle(3, 0xf0b84a, st.a * 0.4).strokeCircle(cx, cy, st.r + 1.5);
        g.lineStyle(1.5, 0xfffaf0, st.a).strokeCircle(cx, cy, st.r);
      },
      onComplete: () => g.destroy(),
    });
  }

  /** 여우불: count개가 몸 주위를 돌며 닿는 대상을 태운다 */
  private updateOrbs(dt: number, active: boolean): void {
    if (this.weapon.id !== 'kitsunebi') return;
    while (this.orbs.length < run.build.count) this.orbs.push(this.scene.add.image(0, 0, TEX.orbKitsunebi));
    const radius = this.weapon.base.range * run.build.area;
    const hitGap = this.weapon.base.cooldownMs * run.build.cooldown;
    this.orbAngle += (dt / 1400) * Math.PI * 2 * run.build.orbitSpeed;
    const p = this.player;
    const now = this.scene.time.now;
    this.orbs.forEach((orb, k) => {
      const a = this.orbAngle + (Math.PI * 2 * k) / this.orbs.length;
      orb.setPosition(p.x + Math.cos(a) * radius, p.y - this.aimY + Math.sin(a) * radius * 0.85);
      orb.setDepth(orb.y + 8);
      if (!active) return;
      for (const t of [...this.targets()]) {
        if (t.hp <= 0 || now - t.orbHitAt < hitGap) continue;
        if (Phaser.Math.Distance.Between(orb.x, orb.y, t.sprite.x, t.sprite.y) < t.radius + 7) {
          t.orbHitAt = now;
          this.onHit(t, this.damage, p.x, p.y - 6, 130);
        }
      }
    });
  }
}
