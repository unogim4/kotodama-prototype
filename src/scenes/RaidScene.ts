import Phaser from 'phaser';
import { UILayer } from '../ui/UILayer';
import { LevelUpPanel } from '../ui/LevelUpPanel';
import { WEAPONS, WeaponDef } from '../data/weapons';
import { rollUpgrades } from '../data/upgrades';
import { ROW_A } from '../data/kana';
import { TEX } from '../art/textures';
import { arenaBackground, ARENA_W, ARENA_H, ARENA_WALL_Y, TORII, TORII_GATE } from '../art/sprites';
import { run, resetRaid, resetRun } from '../systems/run';
import { createMoveKeys, readMove, MoveKeys } from '../systems/movement';
import { makeQuiz } from '../systems/quiz';
import { tts } from '../systems/tts';
import { WeaponSystem, Target } from '../combat/WeaponSystem';
import { settings } from '../systems/settings';

const ZOOM = 2;
const ROOMS = 3;
/** 한 습격을 버텨야 하는 시간 */
const ROOM_MS = 45_000;
/** 습격 단계별 요괴 밀도: 처음 출현 간격(ms) · 동시에 있을 수 있는 최대 수 */
const ROOM_SPAWN = [
  { interval: 950, cap: 28 },
  { interval: 700, cap: 42 },
  { interval: 500, cap: 58 },
];
const PLAYER_SPEED = 80;
const BOUNDS = { minX: 8, maxX: ARENA_W - 8, minY: ARENA_WALL_Y + 12, maxY: ARENA_H - 4 };
/** 결계가 풀린 토리이 안으로 이만큼 올라가면 다음 방 */
const GATE_ENTER_Y = ARENA_WALL_Y + 4;
const BG_KEY = 'arena-bg';
/** 레벨업에 필요한 구슬 수 */
const xpNeed = (level: number) => 3 + level * 2;

type EnemyKind = 'hitodama' | 'kasa';
const ENEMY_DEFS: Record<EnemyKind, { hp: number; speed: number; damage: number; frameMs: number; radius: number }> = {
  hitodama: { hp: 10, speed: 34, damage: 8, frameMs: 260, radius: 6 },
  kasa: { hp: 26, speed: 26, damage: 12, frameMs: 180, radius: 7 },
};

interface Enemy extends Target {
  kind: EnemyKind;
  speed: number;
  /** 넉백 속도 */
  kx: number;
  ky: number;
  flashUntil: number;
  age: number;
}

interface Gem {
  sprite: Phaser.GameObjects.Image;
  pulled: boolean;
  speed: number;
}

type State = 'play' | 'paused' | 'cleared' | 'dead' | 'leaving';

export class RaidScene extends Phaser.Scene {
  private ui!: UILayer;
  private keys!: MoveKeys;
  private weapon!: WeaponDef;
  private state: State = 'play';
  private player!: Phaser.GameObjects.Image;
  private shadow!: Phaser.GameObjects.Ellipse;
  private enemies: Enemy[] = [];
  private gems: Gem[] = [];
  private weapons!: WeaponSystem;
  private barrier!: Phaser.GameObjects.Rectangle;
  private kills = 0;
  /** 이번 습격에서 버틴 시간 (레벨업으로 멈춘 시간은 빼고) */
  private elapsed = 0;
  private spawnAcc = 0;
  private invulnUntil = 0;
  private walkTime = 0;
  private pendingLevels = 0;
  private ttsOk = false;
  private levelPanel!: LevelUpPanel;
  private hud!: { hp: HTMLElement; hpText: HTMLElement; xp: HTMLElement; lv: HTMLElement; kills: HTMLElement };
  private hudCache = '';

  constructor() {
    super('Raid');
  }

  create(): void {
    if (!run.weapon) {
      // 개발 중 바로 들어온 경우
      run.weapon = 'ofuda';
      resetRaid();
    }
    this.weapon = WEAPONS.find((w) => w.id === run.weapon)!;
    this.state = 'play';
    this.enemies = [];
    this.gems = [];
    this.kills = 0;
    this.spawnAcc = 0;
    this.invulnUntil = 0;
    this.pendingLevels = 0;
    this.hudCache = '';
    this.elapsed = 0;

    if (!this.textures.exists(BG_KEY)) this.textures.addCanvas(BG_KEY, arenaBackground());
    this.add.image(0, 0, BG_KEY).setOrigin(0);

    // 토리이 결계 (클리어 전까지 출구를 막는다)
    this.barrier = this.add.rectangle(TORII_GATE.x, 6, TORII_GATE.w, ARENA_WALL_Y - 4, 0x7a62b8, 0.55).setOrigin(0).setDepth(1);
    this.tweens.add({ targets: this.barrier, fillAlpha: 0.3, duration: 900, yoyo: true, repeat: -1 });

    this.shadow = this.add.ellipse(ARENA_W / 2, 210, 14, 4, 0x000000, 0.3);
    this.player = this.add.image(ARENA_W / 2, 210, TEX.player).setOrigin(0.5, 1);
    this.weapons = new WeaponSystem(this, this.weapon, this.player, () => this.enemies, (t, dmg, fx, fy, knock) =>
      this.damage(t as Enemy, dmg, fx, fy, knock),
    );

    const cam = this.cameras.main;
    cam.setZoom(ZOOM);
    cam.setBounds(0, 0, ARENA_W, ARENA_H);
    cam.startFollow(this.player, true, 0.15, 0.15);
    cam.fadeIn(350, 12, 10, 18);

    this.keys = createMoveKeys(this);
    this.ui = new UILayer(this);
    this.levelPanel = new LevelUpPanel(this.ui);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.levelPanel.close());
    this.createHud();
    void tts.isAvailable().then((ok) => (this.ttsOk = ok));

    const banner = this.ui.el('div', 'raid-banner');
    banner.innerHTML = `<b>습격 ${run.room}</b><span>${ROOM_MS / 1000}초 동안 버텨라</span>`;
    this.time.delayedCall(2200, () => banner.remove());
  }

  // ── HUD ──────────────────────────────────────────────

  private createHud(): void {
    const left = this.ui.el('div', 'raid-hud-left');
    this.ui.el('div', 'raid-room', `👹 습격 ${run.room}/${ROOMS}`, left);
    const hpBar = this.ui.el('div', 'bar hp', '', left);
    const hp = this.ui.el('i', '', '', hpBar);
    const hpText = this.ui.el('span', '', '', hpBar);
    const xpBar = this.ui.el('div', 'bar xp raid-xp');
    const xp = this.ui.el('i', '', '', xpBar);
    const lv = this.ui.el('div', 'raid-lv');
    const kills = this.ui.el('div', 'raid-kills');
    this.hud = { hp, hpText, xp, lv, kills };
    this.updateHud();
  }

  private updateHud(): void {
    const b = run.build;
    const left = Math.max(0, Math.ceil((ROOM_MS - this.elapsed) / 1000));
    const key = `${Math.ceil(run.hp)}|${b.maxHp}|${run.xp}|${run.level}|${this.kills}|${left}`;
    if (key === this.hudCache) return;
    this.hudCache = key;
    this.hud.hp.style.width = `${Math.max(0, (run.hp / b.maxHp) * 100)}%`;
    this.hud.hpText.textContent = `${Math.max(0, Math.ceil(run.hp))} / ${b.maxHp}`;
    this.hud.xp.style.width = `${(run.xp / xpNeed(run.level)) * 100}%`;
    this.hud.lv.textContent = `Lv ${run.level}`;
    const clock = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
    this.hud.kills.innerHTML = `<span class="raid-clock${left <= 10 && this.state === 'play' ? ' hurry' : ''}">⏳ ${clock}</span><small>처치 ${this.kills}</small>`;
  }

  // ── 매 프레임 ─────────────────────────────────────────

  update(time: number, rawDelta: number): void {
    if (this.state === 'paused' || this.state === 'dead' || this.state === 'leaving') return;
    const dt = Math.min(rawDelta, 50);

    this.movePlayer(time, dt);
    if (this.state === 'play') {
      this.elapsed += dt;
      if (this.elapsed >= ROOM_MS) this.clearRoom();
    }
    if (this.state === 'play') this.spawn(dt);
    this.weapons.update(dt, this.state === 'play');
    this.updateEnemies(time, dt);
    this.updateGems(dt);
    if (this.state === 'play') this.checkContact(time);
    if (this.state === 'cleared') this.checkGate();
    this.updateHud();

    if (this.pendingLevels > 0 && (this.state === 'play' || this.state === 'cleared')) this.levelUp();
  }

  private movePlayer(time: number, dt: number): void {
    const dir = readMove(this.keys);
    const p = this.player;
    if (dir.x === 0 && dir.y === 0) {
      p.scaleY = 1 + Math.sin(time / 350) * 0.03;
    } else {
      const step = (PLAYER_SPEED * run.build.moveSpeed * dt) / 1000;
      const inGate = this.state === 'cleared' && p.x > TORII_GATE.x + 3 && p.x < TORII_GATE.x + TORII_GATE.w - 3;
      const minY = inGate ? ARENA_WALL_Y - 2 : BOUNDS.minY;
      p.x = Phaser.Math.Clamp(p.x + dir.x * step, BOUNDS.minX, BOUNDS.maxX);
      p.y = Phaser.Math.Clamp(p.y + dir.y * step, minY, BOUNDS.maxY);
      if (dir.x !== 0) p.setFlipX(dir.x < 0);
      this.walkTime += dt;
      p.scaleY = 1 - Math.abs(Math.sin(this.walkTime / 70)) * 0.08;
    }
    // 무적 시간엔 깜빡
    p.setAlpha(time < this.invulnUntil && Math.floor(time / 80) % 2 === 0 ? 0.35 : 1);
    p.setDepth(p.y);
    this.shadow.setPosition(p.x, p.y).setDepth(p.y - 0.5);
  }

  // ── 요괴 ─────────────────────────────────────────────

  private spawn(dt: number): void {
    // 단계가 높을수록 촘촘하고, 한 습격 안에서도 시간이 갈수록 35%까지 빨라진다
    const cfg = ROOM_SPAWN[Math.min(run.room, ROOM_SPAWN.length) - 1];
    const progress = Math.min(1, this.elapsed / ROOM_MS);
    const interval = cfg.interval * (1 - progress * 0.35);
    const cap = cfg.cap;
    this.spawnAcc += dt;
    while (this.spawnAcc >= interval) {
      this.spawnAcc -= interval;
      if (this.enemies.length < cap) this.spawnEnemy();
    }
  }

  private spawnEnemy(): void {
    const kasaChance = 0.15 + (run.room - 1) * 0.1 + (this.elapsed > ROOM_MS / 2 ? 0.1 : 0);
    const kind: EnemyKind = Math.random() < kasaChance ? 'kasa' : 'hitodama';
    const def = ENEMY_DEFS[kind];
    // 화면 밖(언령사에서 충분히 먼 곳)에서 나타난다
    let x = 0;
    let y = 0;
    for (let tries = 0; tries < 8; tries++) {
      const a = Math.random() * Math.PI * 2;
      const d = 190 + Math.random() * 60;
      x = Phaser.Math.Clamp(this.player.x + Math.cos(a) * d, BOUNDS.minX, BOUNDS.maxX);
      y = Phaser.Math.Clamp(this.player.y + Math.sin(a) * d, BOUNDS.minY, BOUNDS.maxY);
      if (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) > 130) break;
    }
    const sprite = this.add.image(x, y, kind === 'kasa' ? TEX.kasa(0) : TEX.hitodama(0)).setOrigin(0.5, 0.75);
    sprite.setAlpha(0);
    this.tweens.add({ targets: sprite, alpha: 1, duration: 250 });
    this.enemies.push({
      kind,
      sprite,
      hp: def.hp * (1 + (run.room - 1) * 0.25),
      speed: def.speed * (1 + (run.room - 1) * 0.08) * (0.9 + Math.random() * 0.2),
      radius: def.radius,
      kx: 0,
      ky: 0,
      flashUntil: 0,
      orbHitAt: 0,
      age: Math.random() * 1000,
    });
  }

  private updateEnemies(time: number, dt: number): void {
    const p = this.player;
    const s = dt / 1000;
    for (const e of this.enemies) {
      const def = ENEMY_DEFS[e.kind];
      e.age += dt;
      const dx = p.x - e.sprite.x;
      const dy = p.y - 4 - e.sprite.y;
      const d = Math.hypot(dx, dy) || 1;
      // 가라카사는 깡충깡충: 뛸 때만 빠르다
      const hop = e.kind === 'kasa' ? 0.35 + Math.abs(Math.sin((e.age / 360) * Math.PI)) * 1.1 : 1;
      let vx = (dx / d) * e.speed * hop;
      let vy = (dy / d) * e.speed * hop;
      if (this.state === 'cleared') {
        vx = -vx * 2;
        vy = -vy * 2;
      }
      e.sprite.x += (vx + e.kx) * s;
      e.sprite.y += (vy + e.ky) * s;
      e.kx *= 0.85;
      e.ky *= 0.85;

      const frame = Math.floor(e.age / def.frameMs) % 2;
      e.sprite.setTexture(e.kind === 'kasa' ? TEX.kasa(frame) : TEX.hitodama(frame));
      e.sprite.setFlipX(dx < 0);
      e.sprite.setDepth(e.sprite.y + 4);
      if (e.flashUntil && time > e.flashUntil) {
        e.sprite.clearTint();
        e.flashUntil = 0;
      }
    }

    // 서로 겹치지 않게 살짝 밀어낸다
    for (let i = 0; i < this.enemies.length; i++) {
      const a = this.enemies[i].sprite;
      for (let j = i + 1; j < this.enemies.length; j++) {
        const b = this.enemies[j].sprite;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > 0 && d2 < 110) {
          const d = Math.sqrt(d2);
          const push = ((10.5 - d) / d) * 0.5;
          a.x -= dx * push;
          a.y -= dy * push;
          b.x += dx * push;
          b.y += dy * push;
        }
      }
    }
  }

  private damage(e: Enemy, amount: number, fromX: number, fromY: number, knock: number): void {
    if (e.hp <= 0) return;
    e.hp -= amount;
    e.sprite.setTintFill(0xffffff);
    e.flashUntil = this.time.now + 60;
    const dx = e.sprite.x - fromX;
    const dy = e.sprite.y - fromY;
    const d = Math.hypot(dx, dy) || 1;
    e.kx += (dx / d) * knock;
    e.ky += (dy / d) * knock;
    if (e.hp <= 0) this.kill(e, true);
  }

  private kill(e: Enemy, drop: boolean): void {
    this.enemies = this.enemies.filter((x) => x !== e);
    this.puff(e.sprite.x, e.sprite.y - 4);
    if (drop) {
      this.dropGem(e.sprite.x, e.sprite.y);
      this.kills++;
    }
    e.sprite.destroy();
  }

  private puff(x: number, y: number): void {
    for (let i = 0; i < 4; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = this.add.image(x, y, TEX.spark).setDepth(y + 10);
      this.tweens.add({
        targets: s,
        x: x + Math.cos(a) * 10,
        y: y + Math.sin(a) * 10,
        alpha: 0,
        duration: 300,
        onComplete: () => s.destroy(),
      });
    }
  }

  // ── 언령 구슬 · 레벨업 ─────────────────────────────────

  private dropGem(x: number, y: number): void {
    const sprite = this.add.image(x, y - 2, TEX.gem).setDepth(y - 1);
    this.gems.push({ sprite, pulled: this.state === 'cleared', speed: 40 });
  }

  private updateGems(dt: number): void {
    const p = this.player;
    const magnet = 28 * run.build.magnet;
    for (const g of this.gems) {
      const d = Phaser.Math.Distance.Between(g.sprite.x, g.sprite.y, p.x, p.y - 6);
      if (!g.pulled && d < magnet) g.pulled = true;
      if (!g.pulled) continue;
      g.speed = Math.min(g.speed + dt * 0.5, 260);
      const step = (g.speed * dt) / 1000;
      if (d <= step + 4) {
        g.sprite.destroy();
        g.sprite = null as unknown as Phaser.GameObjects.Image;
        this.gainXp(1);
        continue;
      }
      g.sprite.x += ((p.x - g.sprite.x) / d) * step;
      g.sprite.y += ((p.y - 6 - g.sprite.y) / d) * step;
    }
    this.gems = this.gems.filter((g) => g.sprite);
  }

  private gainXp(n: number): void {
    run.xp += n;
    while (run.xp >= xpNeed(run.level)) {
      run.xp -= xpNeed(run.level);
      run.level++;
      this.pendingLevels++;
    }
  }

  /** 시간이 멈추고 퀴즈 → 업그레이드 */
  private levelUp(): void {
    this.pendingLevels--;
    const resumeTo = this.state;
    this.state = 'paused';
    this.tweens.pauseAll();
    this.time.paused = true;
    this.ui.root.classList.add('dimmed');

    const quiz = makeQuiz(this.ttsOk);
    const offers = rollUpgrades(run.weapon, run.upgrades, 3);
    void this.levelPanel.open(quiz, run.level, offers).then(({ upgrade }) => {
      upgrade.apply(run.build, (amount) => (run.hp = Math.min(run.build.maxHp, run.hp + amount)));
      run.upgrades.push(upgrade.id);
      this.ui.root.classList.remove('dimmed');
      this.tweens.resumeAll();
      this.time.paused = false;
      this.state = resumeTo;
      this.hudCache = '';
    });
  }

  // ── 피격 · 패배 ──────────────────────────────────────

  private checkContact(time: number): void {
    if (time < this.invulnUntil || settings.god) return;
    const p = this.player;
    for (const e of this.enemies) {
      if (Phaser.Math.Distance.Between(p.x, p.y - 6, e.sprite.x, e.sprite.y - 3) < ENEMY_DEFS[e.kind].radius + 5) {
        run.hp -= ENEMY_DEFS[e.kind].damage;
        this.invulnUntil = time + 700;
        this.cameras.main.shake(120, 0.004);
        if (run.hp <= 0) this.die();
        return;
      }
    }
  }

  private die(): void {
    this.state = 'dead';
    run.hp = 0;
    this.updateHud();
    this.tweens.add({ targets: this.player, alpha: 0.2, angle: 90, duration: 500 });
    this.time.delayedCall(700, () => {
      this.ui.root.classList.add('dimmed');
      const panel = this.ui.el('div', 'panel fade-in defeat');
      this.ui.el('h2', '', '쓰러졌다…', panel);
      const wrong = ROW_A.filter((k) => run.wrong[k.kana]).sort((a, b) => run.wrong[b.kana] - run.wrong[a.kana]);
      if (wrong.length > 0) {
        this.ui.el('p', '', '이번에 틀린 글자 — 다시 한 번 눈에 익혀 두자', panel);
        const row = this.ui.el('div', 'row', '', panel);
        for (const k of wrong) {
          const chip = this.ui.el('div', 'wrong-chip', '', row);
          chip.innerHTML = `<span class="kana">${k.kana}</span><b>${k.ko}</b><small>×${run.wrong[k.kana]}</small>`;
          chip.addEventListener('click', () => void tts.speak(k.kana));
        }
      } else {
        this.ui.el('p', '', '틀린 글자는 없었다. 요괴를 피하는 연습을 해 보자!', panel);
      }
      const btns = this.ui.el('div', 'row', '', panel);
      btns.style.marginBottom = '0';
      this.ui.button('습격 1부터 다시', () => {
        resetRaid();
        this.scene.restart();
      }, '', btns);
      this.ui.button('서고부터 다시', () => {
        resetRun();
        this.scene.start('Library');
      }, 'primary', btns);
    });
  }

  // ── 클리어 · 다음 방 ─────────────────────────────────

  private clearRoom(): void {
    this.state = 'cleared';
    // 남은 요괴는 흩어지고, 구슬은 모두 끌려온다
    for (const e of [...this.enemies]) {
      this.tweens.add({ targets: e.sprite, alpha: 0, duration: 500, onComplete: () => this.kill(e, false) });
    }
    this.gems.forEach((g) => (g.pulled = true));
    this.tweens.killTweensOf(this.barrier);
    this.tweens.add({ targets: this.barrier, fillAlpha: 0, duration: 700, onComplete: () => this.barrier.setVisible(false) });
    const glow = this.add.image(TORII_GATE.x + TORII_GATE.w / 2, TORII.y + 28, TEX.glow).setScale(0.4).setAlpha(0).setDepth(2);
    this.tweens.add({ targets: glow, alpha: 0.9, scale: 0.6, duration: 600 });

    const banner = this.ui.el('div', 'raid-banner');
    const last = run.room >= ROOMS;
    banner.innerHTML = `<b>습격 ${run.room} 돌파!</b><span>결계가 풀렸다 — <em>WASD</em>로 토리이를 지나가자</span>`;
    this.time.delayedCall(3000, () => banner.remove());
    const hint = this.ui.el('div', 'hint', `<b>WASD</b>로 위쪽 토리이를 지나 ${last ? '야마비코에게' : '다음 습격으로'}`);
    hint.style.opacity = '1';
  }

  private checkGate(): void {
    const p = this.player;
    const inGate = p.x > TORII_GATE.x + 3 && p.x < TORII_GATE.x + TORII_GATE.w - 3;
    if (!inGate || p.y > GATE_ENTER_Y) return;
    this.state = 'leaving';
    this.tweens.add({ targets: [p, this.shadow], y: ARENA_WALL_Y - 10, alpha: 0, duration: 300 });
    this.cameras.main.fadeOut(450, 12, 10, 18);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      if (run.room < ROOMS) {
        run.room++;
        this.scene.restart();
      } else {
        this.scene.start('Boss');
      }
    });
  }
}
