import Phaser from 'phaser';
import { UILayer } from '../ui/UILayer';
import { HD, registerHd } from '../art/hd/register';
import { sandboxGround, SANDBOX_W, SANDBOX_H } from '../art/hd/world';
import { createMoveKeys, readMove, MoveKeys } from '../systems/movement';
import { HitFx } from '../fx/HitFx';
import { settings } from '../systems/settings';

/** 리마스터 규격: 카메라 확대 없이 32px 캐릭터 (도트 밀도 2배) */
const PLAYER_SPEED = 120;
const SHOT_SPEED = 300;
const SHOT_RANGE = 230;
const FIRE_MS = 560;
const CRIT_CHANCE = 0.15;

interface Obstacle {
  img: Phaser.GameObjects.Image;
  /** 발밑 충돌 타원 */
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

interface Foe {
  sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;
  kind: 'hitodama' | 'dummy';
  hp: number;
  maxHp: number;
  vx: number;
  vy: number;
  radius: number;
}

interface Shot {
  img: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  life: number;
}

/**
 * 🧪 전투 샘플 — 본편 전투 리마스터 미리보기.
 * 32px 도트 · 넓은 아레나 + 장애물 · 시전 모션 · 데미지 숫자 · 넉백 먼지 · 타격 정지.
 */
export class SandboxScene extends Phaser.Scene {
  private keys!: MoveKeys;
  private fx!: HitFx;
  private player!: Phaser.GameObjects.Sprite;
  private shadow!: Phaser.GameObjects.Ellipse;
  private obstacles: Obstacle[] = [];
  private foes: Foe[] = [];
  private shots: Shot[] = [];
  private fireAcc = 0;
  private spawnAcc = 0;
  private casting = false;
  private invulnUntil = 0;
  private facing = 1;

  constructor() {
    super('Sandbox');
  }

  create(): void {
    registerHd(this);
    this.fx = new HitFx(this);
    this.obstacles = [];
    this.foes = [];
    this.shots = [];
    this.fireAcc = 0;
    this.spawnAcc = 0;
    this.casting = false;

    if (!this.textures.exists('sandbox-ground')) this.textures.addCanvas('sandbox-ground', sandboxGround());
    this.add.image(0, 0, 'sandbox-ground').setOrigin(0);

    this.placeObstacles();

    this.shadow = this.add.ellipse(SANDBOX_W / 2, SANDBOX_H / 2 + 120, 18, 6, 0x000000, 0.3);
    this.player = this.add.sprite(SANDBOX_W / 2, SANDBOX_H / 2 + 120, HD.player, 0).setOrigin(0.5, 1);
    this.player.play('p-idle');
    this.player.on(Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + 'p-cast', () => (this.casting = false));

    // 과녁 허수아비
    for (const [x, y] of [[860, 520], [1060, 520], [960, 420], [800, 660], [1120, 660]]) {
      const img = this.add.image(x, y, HD.makiwara).setOrigin(0.5, 1);
      this.foes.push({ sprite: img, kind: 'dummy', hp: Infinity, maxHp: Infinity, vx: 0, vy: 0, radius: 8 });
    }

    const cam = this.cameras.main;
    cam.setZoom(1);
    cam.setBounds(0, 0, SANDBOX_W, SANDBOX_H);
    cam.startFollow(this.player, true, 0.12, 0.12);
    cam.fadeIn(300, 12, 10, 18);

    this.keys = createMoveKeys(this);

    const ui = new UILayer(this);
    ui.el('div', 'sb-title', '🧪 전투 샘플 <small>본편 리마스터 미리보기</small>');
    ui.el(
      'div',
      'sb-legend',
      '<b>WASD</b> 이동 · 부적 자동 시전<br>흰 숫자 = 일반 · <span class="gold">금색 = 강타</span> (멈칫!)<br>허수아비·혼불을 때려 보세요',
    );
    const back = ui.button('챕터 선택으로', () => this.scene.start('Title'), '', ui.root);
    back.classList.add('sb-back');
  }

  /** 석등 · 바위 · 소나무를 흩어 놓는다 (발밑 충돌) */
  private placeObstacles(): void {
    const put = (key: string, x: number, y: number, rx: number, ry: number) => {
      const img = this.add.image(x, y, key).setOrigin(0.5, 1).setDepth(y);
      this.obstacles.push({ img, cx: x, cy: y - ry, rx, ry });
    };
    let seed = 9;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 26; i++) {
      const x = 80 + rnd() * (SANDBOX_W - 160);
      const y = 120 + rnd() * (SANDBOX_H - 200);
      // 가운데 넓은 마당은 비워 둔다
      if (Math.abs(x - SANDBOX_W / 2) < 260 && Math.abs(y - SANDBOX_H / 2) < 200) continue;
      const r = rnd();
      if (r < 0.35) put(HD.pine, x, y, 7, 4);
      else if (r < 0.65) put(HD.rock, x, y, 13, 6);
      else put(HD.lantern, x, y, 9, 4);
    }
    // 디딤돌 길 양옆 석등
    for (const y of [300, 560, 820]) {
      put(HD.lantern, 900, y, 9, 4);
      put(HD.lantern, 1020, y, 9, 4);
    }
  }

  private blocked(x: number, y: number, pad = 5): boolean {
    if (x < 12 || y < 24 || x > SANDBOX_W - 12 || y > SANDBOX_H - 6) return true;
    return this.obstacles.some((o) => {
      const dx = (x - o.cx) / (o.rx + pad);
      const dy = (y - o.cy) / (o.ry + pad * 0.6);
      return dx * dx + dy * dy < 1;
    });
  }

  update(time: number, rawDelta: number): void {
    const dt = Math.min(rawDelta, 50);
    // 타격 정지 중엔 전투가 멈칫한다 (연출 트윈은 계속)
    if (this.fx.stopped) return;

    this.movePlayer(time, dt);
    this.autoFire(dt);
    this.updateShots(dt);
    this.spawn(dt);
    this.updateFoes(time, dt);
  }

  private movePlayer(time: number, dt: number): void {
    const dir = readMove(this.keys);
    const p = this.player;
    const moving = dir.x !== 0 || dir.y !== 0;
    if (moving) {
      const step = (PLAYER_SPEED * dt) / 1000;
      if (!this.blocked(p.x + dir.x * step, p.y)) p.x += dir.x * step;
      if (!this.blocked(p.x, p.y + dir.y * step)) p.y += dir.y * step;
      if (dir.x !== 0) this.facing = Math.sign(dir.x);
    }
    if (!this.casting && time >= this.invulnUntil) p.play(moving ? 'p-walk' : 'p-idle', true);
    p.setFlipX(this.facing < 0);
    p.setAlpha(time < this.invulnUntil && Math.floor(time / 70) % 2 === 0 ? 0.4 : 1);
    p.setDepth(p.y);
    this.shadow.setPosition(p.x, p.y).setDepth(p.y - 0.5);
  }

  // ── 부적: 시전 모션 → 던지기 ──────────────────────────

  private autoFire(dt: number): void {
    this.fireAcc += dt;
    if (this.fireAcc < FIRE_MS) return;
    const p = this.player;
    const target = this.foes
      .map((f) => ({ f, d: Phaser.Math.Distance.Between(p.x, p.y - 16, f.sprite.x, f.sprite.y - 12) }))
      .filter((t) => t.d < SHOT_RANGE)
      .sort((a, b) => a.d - b.d)[0]?.f;
    if (!target) return;
    this.fireAcc = 0;
    this.facing = target.sprite.x >= p.x ? 1 : -1;
    this.casting = true;
    p.play('p-cast', true);
    // 두 번째 프레임(앞으로 뻗기)에 맞춰 손에서 날아간다
    this.time.delayedCall(70, () => {
      const hx = p.x + this.facing * 13;
      const hy = p.y - 15;
      const a = Phaser.Math.Angle.Between(hx, hy, target.sprite.x, target.sprite.y - 12);
      const img = this.add.image(hx, hy, HD.ofuda).setRotation(a + Math.PI / 2).setDepth(4500);
      this.shots.push({ img, vx: Math.cos(a) * SHOT_SPEED, vy: Math.sin(a) * SHOT_SPEED, life: 900 });
    });
  }

  private updateShots(dt: number): void {
    for (const s of this.shots) {
      s.img.x += (s.vx * dt) / 1000;
      s.img.y += (s.vy * dt) / 1000;
      s.life -= dt;
      if (s.life <= 0) continue;
      for (const f of this.foes) {
        if (Phaser.Math.Distance.Between(s.img.x, s.img.y, f.sprite.x, f.sprite.y - 12) < f.radius + 5) {
          this.hit(f, s.vx, s.vy);
          s.life = 0;
          break;
        }
      }
    }
    this.shots = this.shots.filter((s) => {
      if (s.life > 0) return true;
      s.img.destroy();
      return false;
    });
  }

  /** 맞았다: 숫자 · 번쩍 · 찌그러짐 · 넉백 + 먼지 · (강타면) 멈칫 */
  private hit(f: Foe, vx: number, vy: number): void {
    const crit = Math.random() < CRIT_CHANCE;
    const dmg = Phaser.Math.Between(8, 12) * (crit ? 2.2 : 1);
    const d = Math.hypot(vx, vy) || 1;
    const nx = vx / d;
    const ny = vy / d;
    this.fx.number(f.sprite.x, f.sprite.y - (f.kind === 'dummy' ? 30 : 22), dmg, crit ? 'crit' : 'normal');
    this.fx.flash(f.sprite, crit);
    this.fx.spark(f.sprite.x - nx * 6, f.sprite.y - 12 - ny * 6, crit ? 'G' : 'L');
    if (crit) {
      this.fx.hitStop(55);
      this.cameras.main.shake(70, 0.003);
    }

    if (f.kind === 'dummy') {
      // 허수아비는 밀리지 않고 휘청인다
      this.tweens.add({ targets: f.sprite, angle: nx * (crit ? 16 : 9), duration: 70, yoyo: true, ease: 'Sine.easeOut' });
      this.fx.dust(f.sprite.x, f.sprite.y, nx, ny, crit ? 6 : 3);
      return;
    }

    const knock = crit ? 260 : 170;
    f.vx += nx * knock;
    f.vy += ny * knock;
    this.fx.dust(f.sprite.x, f.sprite.y, nx, ny, crit ? 7 : 4, 'P');
    f.hp -= dmg;
    if (f.hp <= 0) {
      this.fx.burst(f.sprite.x, f.sprite.y - 10, ['P', 'L', 'W'], 12);
      this.fx.hitStop(35);
      f.sprite.destroy();
      this.foes = this.foes.filter((x) => x !== f);
    }
  }

  // ── 혼불 ─────────────────────────────────────────────

  private spawn(dt: number): void {
    this.spawnAcc += dt;
    if (this.spawnAcc < 1100) return;
    this.spawnAcc = 0;
    if (this.foes.filter((f) => f.kind === 'hitodama').length >= 14) return;
    const a = Math.random() * Math.PI * 2;
    const x = Phaser.Math.Clamp(this.player.x + Math.cos(a) * 340, 20, SANDBOX_W - 20);
    const y = Phaser.Math.Clamp(this.player.y + Math.sin(a) * 220, 40, SANDBOX_H - 20);
    if (this.blocked(x, y)) return;
    const s = this.add.sprite(x, y, HD.hitodama, 0).setOrigin(0.5, 0.85).setAlpha(0);
    s.play('hitodama-float');
    this.tweens.add({ targets: s, alpha: 1, duration: 300 });
    this.foes.push({ sprite: s, kind: 'hitodama', hp: 30, maxHp: 30, vx: 0, vy: 0, radius: 8 });
  }

  private updateFoes(time: number, dt: number): void {
    const p = this.player;
    const sec = dt / 1000;
    for (const f of this.foes) {
      if (f.kind === 'dummy') {
        f.sprite.setDepth(f.sprite.y);
        continue;
      }
      const dx = p.x - f.sprite.x;
      const dy = p.y - 6 - f.sprite.y;
      const d = Math.hypot(dx, dy) || 1;
      const nx = f.sprite.x + ((dx / d) * 46 + f.vx) * sec;
      const ny = f.sprite.y + ((dy / d) * 46 + f.vy) * sec;
      if (!this.blocked(nx, f.sprite.y, 2)) f.sprite.x = nx;
      else f.vx *= -0.3;
      if (!this.blocked(f.sprite.x, ny, 2)) f.sprite.y = ny;
      else f.vy *= -0.3;
      // 넉백은 빠르게 잦아든다
      f.vx *= 0.86;
      f.vy *= 0.86;
      f.sprite.setFlipX(dx < 0);
      f.sprite.setDepth(f.sprite.y + 2);

      if (d < 14 && time > this.invulnUntil && !settings.god) {
        this.invulnUntil = time + 800;
        p.play('p-hurt', true);
        this.fx.flash(p as unknown as Phaser.GameObjects.Sprite);
        this.fx.number(p.x, p.y - 34, 8, 'boss');
        this.cameras.main.shake(100, 0.004);
        f.vx -= (dx / d) * 220;
        f.vy -= (dy / d) * 220;
      }
    }
  }
}
