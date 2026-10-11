import Phaser from 'phaser';
import { HD } from '../art/hd/register';

/**
 * 타격감 묶음: 데미지 숫자 · 하얀 번쩍임 · 찌그러짐 · 넉백 먼지 · 파편 · 타격 정지.
 * 장면 하나에 하나씩 만들어 쓴다.
 */
export class HitFx {
  /** 이 시각까지 전투 갱신을 멈춘다 (타격 정지) */
  private stopUntil = 0;

  constructor(private readonly scene: Phaser.Scene) {}

  get stopped(): boolean {
    return this.scene.time.now < this.stopUntil;
  }

  /** 강한 한 방에 잠깐 멈칫 */
  hitStop(ms: number): void {
    this.stopUntil = Math.max(this.stopUntil, this.scene.time.now + ms);
  }

  /** 맞은 자리에서 튀어 오르는 숫자. kind: normal / crit(금색·큼) / boss(보라) / heal(초록) */
  number(x: number, y: number, value: number, kind: 'normal' | 'crit' | 'boss' | 'heal' | 'hurt' = 'normal'): void {
    const style = {
      normal: { font: 'Galmuri11', size: 12, color: '#fffaf0' },
      crit: { font: 'Galmuri14', size: 15, color: '#f0b84a' },
      boss: { font: 'Galmuri11', size: 12, color: '#e6c9ff' },
      heal: { font: 'Galmuri11', size: 12, color: '#9be3b0' },
      hurt: { font: 'Galmuri11', size: 12, color: '#ff8a7a' },
    }[kind];
    const text = kind === 'crit' ? `${Math.round(value)}!` : `${Math.round(value)}`;
    const t = this.scene.add
      .text(x + Phaser.Math.Between(-4, 4), y, text, {
        fontFamily: style.font,
        fontSize: `${style.size}px`,
        color: style.color,
        stroke: '#1b1626',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 1)
      .setDepth(5000)
      .setScale(kind === 'crit' ? 1.6 : 1.25);
    this.scene.tweens.add({ targets: t, scale: 1, duration: 120, ease: 'Back.easeOut' });
    this.scene.tweens.add({ targets: t, y: y - (kind === 'crit' ? 22 : 16), duration: 520, ease: 'Cubic.easeOut' });
    this.scene.tweens.add({ targets: t, alpha: 0, delay: 380, duration: 220, onComplete: () => t.destroy() });
  }

  /** 하얗게 번쩍 + 찌그러졌다 돌아오기 (발 기준 origin이면 바닥에 붙은 채로) */
  flash(target: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite, strong = false): void {
    target.setTintFill(0xffffff);
    this.scene.time.delayedCall(strong ? 80 : 50, () => target.active && target.clearTint());
    const sx = target.scaleX;
    const sy = target.scaleY;
    this.scene.tweens.killTweensOf(target);
    target.setScale(sx * (strong ? 1.35 : 1.22), sy * (strong ? 0.7 : 0.8));
    this.scene.tweens.add({ targets: target, scaleX: sx, scaleY: sy, duration: strong ? 160 : 120, ease: 'Back.easeOut' });
  }

  /** 넉백 방향 반대쪽으로 튀는 먼지 (발밑) */
  dust(x: number, y: number, dirX: number, dirY: number, n = 5, color = 'w'): void {
    for (let i = 0; i < n; i++) {
      const a = Math.atan2(-dirY, -dirX) + Phaser.Math.FloatBetween(-0.9, 0.9);
      const d = Phaser.Math.Between(6, 14);
      const p = this.scene.add.image(x, y, HD.dust(color)).setDepth(y + 1);
      this.scene.tweens.add({
        targets: p,
        x: x + Math.cos(a) * d,
        y: y + Math.sin(a) * d * 0.5 - Phaser.Math.Between(1, 5),
        alpha: 0,
        duration: Phaser.Math.Between(220, 360),
        ease: 'Cubic.easeOut',
        onComplete: () => p.destroy(),
      });
    }
  }

  /** 타격 지점의 작은 불꽃 */
  spark(x: number, y: number, color = 'L'): void {
    for (let i = 0; i < 4; i++) {
      const a = (Math.PI / 2) * i + Math.PI / 4;
      const p = this.scene.add.image(x, y, HD.dust(color)).setDepth(4000);
      this.scene.tweens.add({ targets: p, x: x + Math.cos(a) * 7, y: y + Math.sin(a) * 7, alpha: 0, duration: 160, onComplete: () => p.destroy() });
    }
  }

  /** 처치: 몸이 흩어지는 조각 */
  burst(x: number, y: number, colors: string[], n = 10): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = Phaser.Math.Between(8, 22);
      const p = this.scene.add.image(x, y, HD.dust(colors[i % colors.length])).setDepth(4000).setScale(Phaser.Math.Between(1, 2));
      this.scene.tweens.add({
        targets: p,
        x: x + Math.cos(a) * d,
        y: y + Math.sin(a) * d - 6,
        alpha: 0,
        duration: Phaser.Math.Between(300, 500),
        ease: 'Cubic.easeOut',
        onComplete: () => p.destroy(),
      });
    }
  }
}
