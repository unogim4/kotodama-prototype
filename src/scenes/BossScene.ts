import Phaser from 'phaser';
import { UILayer } from '../ui/UILayer';
import { BossQuizPanel } from '../ui/BossQuizPanel';
import { WEAPONS, WeaponDef } from '../data/weapons';
import { ROW_A, Kana } from '../data/kana';
import { TEX } from '../art/textures';
import { bossBackground, BOSS_W, BOSS_H, BOSS_FLOOR } from '../art/sprites';
import { run, resetRaid, resetRun } from '../systems/run';
import { createMoveKeys, readMove, MoveKeys } from '../systems/movement';
import { makeQuiz, recordAnswer } from '../systems/quiz';
import { tts } from '../systems/tts';
import { WeaponSystem, Target } from '../combat/WeaponSystem';
import { HangulSyllableTyper } from '../util/hangulKeys';
import { settings } from '../systems/settings';

/** 보스방은 카메라 고정 2배 (월드 320×180 → 화면 640×360) */
const ZOOM = 2;
const screen = (v: number) => v * ZOOM;
const BG_KEY = 'boss-bg';
const PLAYER_SPEED = 80;
/** 패턴을 충분히 보도록 넉넉하게 (무기만으로 몰아붙이기 어렵게) */
const BOSS_MAX_HP = 3000;
/** 야마비코가 서는 자리 (발 위치) */
const HOME = { x: 160, y: 72 };
/** 몸통 중심이 발보다 얼마나 위인지 */
const BOSS_CORE_DY = 22;
const BOSS_RADIUS = 16;
/** 페이즈별 체력 바닥 (이 아래로는 깎이지 않고 다음 페이즈로) */
const PHASE_FLOOR: Record<number, number> = { 1: 0.6, 2: 0.3, 3: 0.1 };
const PHASE_NAMES: Record<number, string> = { 1: '1페이즈 · 메아리 외침', 2: '2페이즈 · 메아리 바닥', 3: '3페이즈 · 언령 대결' };
/** 퀴즈 사이 간격 (전투 시간 기준) */
const QUIZ_GAP: Record<number, number> = { 1: 7000, 2: 6000, 3: 6000 };
const QUIZ_LIMIT = 8000;
const RAGE_LIMIT = 5000;
const RAGE_STEPS = 5;
/** 메아리 바닥 돌판 위치 (발 기준) */
const TILES = [
  { x: 52, y: 100 },
  { x: 102, y: 126 },
  { x: 160, y: 134 },
  { x: 218, y: 126 },
  { x: 268, y: 100 },
];
/** 퀴즈 패널 윗변 (월드 y). 언령사가 이보다 아래면 패널을 반투명하게 */
const PANEL_TOP_Y = 144;
const SLOW = 0.2;

type State = 'intro' | 'fight' | 'quiz' | 'transition' | 'dead' | 'won';
type QuizKind = 'shout' | 'floor' | 'A' | 'B';
type BossMode = 'walk' | 'tele' | 'charge';

interface Quiz {
  kind: QuizKind;
  answer: Kana;
  choices: Kana[];
  limit: number;
  left: number;
  done: boolean;
  rage: boolean;
  /** 메아리 바닥: 같은 돌판 위에 가만히 선 시간 */
  standTile: number;
  standMs: number;
}

interface Minion extends Target {
  vx: number;
  vy: number;
  age: number;
  flashUntil: number;
}

interface Bullet {
  sprite: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  life: number;
}

export class BossScene extends Phaser.Scene {
  private ui!: UILayer;
  private panel!: BossQuizPanel;
  private keys!: MoveKeys;
  private weapon!: WeaponDef;
  private weapons!: WeaponSystem;
  private typer = new HangulSyllableTyper();
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;

  private state: State = 'intro';
  private phase = 1;
  private phaseDue = false;
  private rage = false;
  private rageStep = 0;
  private quiz: Quiz | null = null;
  private duelNext: 'A' | 'B' = 'A';
  private stats = { correct: 0, total: 0 };

  private player!: Phaser.GameObjects.Image;
  private shadow!: Phaser.GameObjects.Ellipse;
  private boss!: Phaser.GameObjects.Image;
  private bossShadow!: Phaser.GameObjects.Ellipse;
  private bossTarget!: Target;
  private bossHp = BOSS_MAX_HP;
  private bossMode: BossMode = 'walk';
  private bossModeMs = 0;
  private chargeDir = { x: 0, y: 0 };
  private bossInvulnUntil = 0;
  private minions: Minion[] = [];
  private bullets: Bullet[] = [];
  private tiles: { img: Phaser.GameObjects.Image; label: HTMLElement; kana: Kana }[] = [];

  private worldScale = 1;
  private worldTarget = 1;
  private slowVeil!: Phaser.GameObjects.Rectangle;
  private quizIn = 0;
  private chargeIn = 0;
  private volleyIn = 0;
  private summonIn = 0;
  private invulnUntil = 0;
  private walkTime = 0;
  private ttsOk = false;

  private hud!: { hp: HTMLElement; hpText: HTMLElement; bossBar: HTMLElement; bossHeal: HTMLElement; phase: HTMLElement };
  private hudCache = '';

  constructor() {
    super('Boss');
  }

  /** data.phase: 사용자 설정 모드에서 원하는 페이즈부터 시작 */
  create(data?: { phase?: 1 | 2 | 3 | 'rage' }): void {
    if (!run.weapon) {
      run.weapon = 'ofuda';
      resetRaid();
    }
    this.weapon = WEAPONS.find((w) => w.id === run.weapon)!;
    // 보스 앞에서 한숨 돌린다: 체력 가득
    run.hp = run.build.maxHp;

    this.state = 'intro';
    this.phase = 1;
    this.phaseDue = false;
    this.rage = false;
    this.rageStep = 0;
    this.quiz = null;
    this.stats = { correct: 0, total: 0 };
    this.bossHp = BOSS_MAX_HP;
    this.bossMode = 'walk';
    this.minions = [];
    this.bullets = [];
    this.tiles = [];
    this.worldScale = 1;
    this.worldTarget = 1;
    this.invulnUntil = 0;
    this.bossInvulnUntil = 0;
    this.hudCache = '';
    this.resetTimers();

    if (!this.textures.exists(BG_KEY)) this.textures.addCanvas(BG_KEY, bossBackground());
    this.add.image(0, 0, BG_KEY).setOrigin(0);
    this.slowVeil = this.add.rectangle(0, 0, BOSS_W, BOSS_H, 0x26335f, 0.28).setOrigin(0).setDepth(900).setAlpha(0);

    this.bossShadow = this.add.ellipse(HOME.x, HOME.y, 34, 8, 0x000000, 0.35);
    this.boss = this.add.image(HOME.x, HOME.y, TEX.yamabiko(false)).setOrigin(0.5, 1);
    const core = this.add.image(HOME.x, HOME.y - BOSS_CORE_DY, TEX.spark).setVisible(false);
    this.bossTarget = { sprite: core, hp: 1, radius: BOSS_RADIUS, orbHitAt: 0 };

    this.shadow = this.add.ellipse(160, 126, 14, 4, 0x000000, 0.3);
    this.player = this.add.image(160, 126, TEX.player).setOrigin(0.5, 1);

    this.weapons = new WeaponSystem(
      this,
      this.weapon,
      this.player,
      () => (this.bossVulnerable() ? [this.bossTarget, ...this.minions] : this.minions),
      (t, dmg, fx, fy, knock) => (t === this.bossTarget ? this.hitBoss(dmg, false) : this.hitMinion(t as Minion, dmg, fx, fy, knock)),
    );

    const cam = this.cameras.main;
    cam.setZoom(ZOOM);
    cam.centerOn(BOSS_W / 2, BOSS_H / 2);
    cam.fadeIn(500, 12, 10, 18);

    this.keys = createMoveKeys(this);
    this.ui = new UILayer(this);
    this.panel = new BossQuizPanel(this.ui);
    this.createHud();
    void tts.isAvailable().then((ok) => (this.ttsOk = ok));

    this.keyHandler = (e) => this.onKey(e);
    window.addEventListener('keydown', this.keyHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.keyHandler) window.removeEventListener('keydown', this.keyHandler);
      speechSynthesis.cancel();
    });

    // 등장
    this.boss.setAlpha(0).y = HOME.y - 30;
    this.tweens.add({ targets: this.boss, alpha: 1, y: HOME.y, duration: 700, delay: 300, ease: 'Bounce.easeOut' });
    this.banner('👺 야마비코 <span class="jp">山彦</span>', '메아리 요괴가 길을 막는다 — 외치는 소리를 알아들어라');
    this.time.delayedCall(2200, () => {
      if (this.state === 'intro') this.state = 'fight';
    });

    // 사용자 설정 모드: 원하는 페이즈부터
    const start = data?.phase ?? 1;
    if (start !== 1) {
      this.phase = start === 'rage' ? 3 : start;
      this.bossHp = BOSS_MAX_HP * (this.phase === 2 ? 0.6 : 0.3);
      this.boss.setPosition(HOME.x, HOME.y);
      this.resetTimers();
      if (this.phase === 2) this.time.delayedCall(400, () => this.createTiles());
      if (start === 'rage') {
        this.bossHp = BOSS_MAX_HP * 0.1;
        this.time.delayedCall(2300, () => this.startRage());
      }
    }
  }

  private resetTimers(): void {
    this.quizIn = QUIZ_GAP[this.phase] * 0.6;
    this.chargeIn = 3500;
    this.volleyIn = 2500;
    this.summonIn = 4000;
  }

  // ── HUD ──────────────────────────────────────────────

  private createHud(): void {
    const left = this.ui.el('div', 'raid-hud-left');
    this.ui.el('div', 'raid-room', '👺 あ행 보스', left);
    const hpBar = this.ui.el('div', 'bar hp', '', left);
    const hp = this.ui.el('i', '', '', hpBar);
    const hpText = this.ui.el('span', '', '', hpBar);

    const boss = this.ui.el('div', 'boss-hud');
    this.ui.el('div', 'boss-name', '야마비코 <span class="jp">山彦</span>', boss);
    const bar = this.ui.el('div', 'bar boss', '', boss);
    const bossHeal = this.ui.el('i', 'heal', '', bar);
    const bossBar = this.ui.el('i', '', '', bar);
    for (const m of [0.6, 0.3, 0.1]) {
      const mark = this.ui.el('b', 'mark', '', bar);
      mark.style.left = `${m * 100}%`;
    }
    const phase = this.ui.el('div', 'boss-phase', '', boss);
    this.hud = { hp, hpText, bossBar, bossHeal, phase };
    this.updateHud();
  }

  private updateHud(): void {
    const key = `${Math.ceil(run.hp)}|${Math.round(this.bossHp)}|${this.phase}|${this.rage}`;
    if (key === this.hudCache) return;
    this.hudCache = key;
    const b = run.build;
    this.hud.hp.style.width = `${Math.max(0, (run.hp / b.maxHp) * 100)}%`;
    this.hud.hpText.textContent = `${Math.max(0, Math.ceil(run.hp))} / ${b.maxHp}`;
    const pct = Math.max(0, this.bossHp / BOSS_MAX_HP) * 100;
    this.hud.bossBar.style.width = `${pct}%`;
    this.hud.bossHeal.style.width = `${pct}%`;
    this.hud.phase.textContent = this.rage ? '발악 · 마지막 언령' : PHASE_NAMES[this.phase];
  }

  private banner(title: string, sub: string, ms = 2200): void {
    const b = this.ui.el('div', 'raid-banner');
    b.innerHTML = `<b>${title}</b><span>${sub}</span>`;
    this.time.delayedCall(ms, () => b.remove());
  }

  // ── 매 프레임 ─────────────────────────────────────────

  update(time: number, rawDelta: number): void {
    if (this.state === 'dead' || this.state === 'won') return;
    const dt = Math.min(rawDelta, 50);
    // 언령 집중: 세계는 느려지고 언령사와 제한시간은 그대로
    this.worldScale += (this.worldTarget - this.worldScale) * Math.min(1, dt / 120);
    const wdt = dt * this.worldScale;

    const typing = this.quiz?.kind === 'A' && !this.quiz.done;
    if (!typing) this.movePlayer(time, dt);
    const fighting = this.state === 'fight' || this.state === 'quiz';
    this.weapons.update(wdt, fighting);
    this.updateBoss(wdt);
    this.updateMinions(wdt);
    this.updateBullets(wdt);
    if (fighting) this.checkContact(time);

    if (this.state === 'fight') {
      if (this.phaseDue) {
        this.advancePhase();
      } else {
        this.quizIn -= wdt;
        if (this.quizIn <= 0) this.startPhaseQuiz();
      }
    }
    if (this.state === 'quiz' && this.quiz && !this.quiz.done) this.updateQuiz(dt);
    this.panel.setBehind(this.player.y > PANEL_TOP_Y);

    const core = this.bossTarget.sprite;
    core.setPosition(this.boss.x, this.boss.y - BOSS_CORE_DY);
    this.bossTarget.hp = this.bossHp;
    this.updateHud();
  }

  private inFloor(x: number, y: number): boolean {
    const f = BOSS_FLOOR;
    const dx = (x - f.cx) / (f.rx - 6);
    const dy = (y - f.cy) / (f.ry - 3);
    return dx * dx + dy * dy <= 1;
  }

  private movePlayer(time: number, dt: number): void {
    const dir = readMove(this.keys);
    const p = this.player;
    if (dir.x === 0 && dir.y === 0) {
      p.scaleY = 1 + Math.sin(time / 350) * 0.03;
    } else {
      const step = (PLAYER_SPEED * run.build.moveSpeed * dt) / 1000;
      const nx = p.x + dir.x * step;
      const ny = p.y + dir.y * step;
      if (this.inFloor(nx, p.y)) p.x = nx;
      if (this.inFloor(p.x, ny)) p.y = ny;
      if (dir.x !== 0) p.setFlipX(dir.x < 0);
      this.walkTime += dt;
      p.scaleY = 1 - Math.abs(Math.sin(this.walkTime / 70)) * 0.08;
    }
    p.setAlpha(time < this.invulnUntil && Math.floor(time / 80) % 2 === 0 ? 0.35 : 1);
    p.setDepth(p.y);
    this.shadow.setPosition(p.x, p.y).setDepth(p.y - 0.5);
  }

  // ── 야마비코 ─────────────────────────────────────────

  private bossVulnerable(): boolean {
    return (this.state === 'fight' || this.state === 'quiz') && !this.rage && this.time.now >= this.bossInvulnUntil;
  }

  private updateBoss(wdt: number): void {
    const b = this.boss;
    const fighting = this.state === 'fight' || this.state === 'quiz';
    const shouting = this.state === 'quiz' && (this.quiz?.kind === 'shout' || this.quiz?.kind === 'floor');

    if (this.phase === 1 && fighting && !shouting) {
      this.bossModeMs -= wdt;
      if (this.bossMode === 'walk') {
        this.moveBossToward(this.player.x, this.player.y - 6, 16, wdt);
        this.chargeIn -= wdt;
        if (this.chargeIn <= 0) {
          this.bossMode = 'tele';
          this.bossModeMs = 650;
        }
      } else if (this.bossMode === 'tele') {
        // 돌진 예고: 붉게 깜빡
        b.setTint(Math.floor(this.bossModeMs / 90) % 2 ? 0xff8a7a : 0xffffff);
        if (this.bossModeMs <= 0) {
          b.clearTint();
          const dx = this.player.x - b.x;
          const dy = this.player.y - b.y;
          const d = Math.hypot(dx, dy) || 1;
          this.chargeDir = { x: dx / d, y: dy / d };
          this.bossMode = 'charge';
          this.bossModeMs = 700;
        }
      } else if (this.bossMode === 'charge') {
        const nx = b.x + this.chargeDir.x * 120 * (wdt / 1000);
        const ny = b.y + this.chargeDir.y * 120 * (wdt / 1000);
        if (this.inFloor(nx, ny)) b.setPosition(nx, ny);
        else this.bossModeMs = 0;
        if (this.bossModeMs <= 0) {
          this.bossMode = 'walk';
          this.chargeIn = 4500;
        }
      }
    } else if (this.phase >= 2 || this.state === 'transition') {
      this.moveBossToward(HOME.x, HOME.y, 50, wdt);
    }

    if (fighting && this.phase >= 2) {
      this.volleyIn -= wdt;
      if (this.volleyIn <= 0) {
        this.volley(this.phase === 2 ? 10 : 12, this.phase === 2 ? 45 : 52);
        this.volleyIn = this.phase === 2 ? 3400 : 4000;
      }
    }
    if (fighting && this.phase !== 2 && !this.rage) {
      this.summonIn -= wdt;
      if (this.summonIn <= 0) {
        this.summon(2);
        this.summonIn = this.phase === 1 ? 6000 : 7000;
      }
    }

    b.setTexture(TEX.yamabiko(shouting || this.rage || this.bossMode === 'tele'));
    b.setFlipX(this.player.x < b.x);
    b.setDepth(b.y);
    this.bossShadow.setPosition(b.x, b.y).setDepth(b.y - 0.5);
  }

  private moveBossToward(x: number, y: number, speed: number, wdt: number): void {
    const b = this.boss;
    const dx = x - b.x;
    const dy = y - b.y;
    const d = Math.hypot(dx, dy);
    if (d < 1) return;
    const step = Math.min(d, (speed * wdt) / 1000);
    const nx = b.x + (dx / d) * step;
    const ny = b.y + (dy / d) * step;
    if (this.inFloor(nx, ny) || this.phase >= 2) b.setPosition(nx, ny);
  }

  /** 메아리 탄: 사방으로 퍼지는 보랏빛 탄 */
  private volley(n: number, speed: number): void {
    const cx = this.boss.x;
    const cy = this.boss.y - BOSS_CORE_DY;
    const off = Math.random() * Math.PI;
    for (let i = 0; i < n; i++) {
      const a = off + (Math.PI * 2 * i) / n;
      const sprite = this.add.image(cx, cy, TEX.echoShot).setDepth(600);
      this.bullets.push({ sprite, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: 7000 });
    }
  }

  private updateBullets(wdt: number): void {
    for (const b of this.bullets) {
      b.sprite.x += (b.vx * wdt) / 1000;
      b.sprite.y += (b.vy * wdt) / 1000;
      b.life -= wdt;
      if (b.sprite.x < -8 || b.sprite.x > BOSS_W + 8 || b.sprite.y < -8 || b.sprite.y > BOSS_H + 8) b.life = 0;
    }
    this.bullets = this.bullets.filter((b) => {
      if (b.life > 0) return true;
      b.sprite.destroy();
      return false;
    });
  }

  private summon(n: number): void {
    const f = BOSS_FLOOR;
    for (let i = 0; i < n && this.minions.length < 10; i++) {
      const a = Math.random() * Math.PI * 2;
      const x = f.cx + Math.cos(a) * (f.rx - 10);
      const y = f.cy + Math.sin(a) * (f.ry - 6);
      const sprite = this.add.image(x, y, TEX.hitodama(0)).setOrigin(0.5, 0.75).setAlpha(0);
      this.tweens.add({ targets: sprite, alpha: 1, duration: 300 });
      this.minions.push({ sprite, hp: 10, radius: 6, orbHitAt: 0, vx: 0, vy: 0, age: Math.random() * 1000, flashUntil: 0 });
    }
  }

  private updateMinions(wdt: number): void {
    const p = this.player;
    const s = wdt / 1000;
    for (const m of this.minions) {
      m.age += wdt;
      const dx = p.x - m.sprite.x;
      const dy = p.y - 4 - m.sprite.y;
      const d = Math.hypot(dx, dy) || 1;
      m.sprite.x += ((dx / d) * 30 + m.vx) * s;
      m.sprite.y += ((dy / d) * 30 + m.vy) * s;
      m.vx *= 0.85;
      m.vy *= 0.85;
      m.sprite.setTexture(TEX.hitodama(Math.floor(m.age / 260) % 2));
      m.sprite.setDepth(m.sprite.y + 4);
      if (m.flashUntil && this.time.now > m.flashUntil) {
        m.sprite.clearTint();
        m.flashUntil = 0;
      }
    }
  }

  private hitMinion(m: Minion, dmg: number, fx: number, fy: number, knock: number): void {
    if (m.hp <= 0) return;
    m.hp -= dmg;
    m.sprite.setTintFill(0xffffff);
    m.flashUntil = this.time.now + 60;
    const dx = m.sprite.x - fx;
    const dy = m.sprite.y - fy;
    const d = Math.hypot(dx, dy) || 1;
    m.vx += (dx / d) * knock;
    m.vy += (dy / d) * knock;
    if (m.hp <= 0) {
      this.minions = this.minions.filter((x) => x !== m);
      this.sparks(m.sprite.x, m.sprite.y - 4, 4, 10);
      m.sprite.destroy();
    }
  }

  /** 무기·퀴즈로 야마비코를 깎는다. 페이즈 바닥 아래로는 깎이지 않는다 */
  private hitBoss(amount: number, fromQuiz: boolean): void {
    if (this.rage || this.phaseDue) return;
    if (!fromQuiz && !this.bossVulnerable()) return;
    const floor = PHASE_FLOOR[this.phase] * BOSS_MAX_HP;
    this.bossHp = Math.max(floor, this.bossHp - amount);
    this.boss.setTintFill(0xffffff);
    this.time.delayedCall(60, () => this.boss.clearTint());
    if (this.bossHp <= floor) this.phaseDue = true;
  }

  /** 체력 회복 (페이즈 안에서만) */
  private healBoss(fraction: number): void {
    const cap = (this.phase === 3 ? 0.3 : 1) * BOSS_MAX_HP;
    this.bossHp = Math.min(cap, this.bossHp + fraction * BOSS_MAX_HP);
    this.hud.bossHeal.parentElement?.classList.add('healing');
    this.time.delayedCall(500, () => this.hud.bossHeal.parentElement?.classList.remove('healing'));
  }

  private advancePhase(): void {
    this.phaseDue = false;
    if (this.phase === 3) {
      this.startRage();
      return;
    }
    this.phase++;
    this.state = 'transition';
    this.bossInvulnUntil = this.time.now + 1800;
    this.bossMode = 'walk';
    this.bullets.forEach((b) => (b.life = 0));
    this.cameras.main.shake(300, 0.006);
    if (this.phase === 2) {
      this.banner('2페이즈 · 메아리 바닥', '외친 글자가 새겨진 돌판 위에 서라');
      this.time.delayedCall(900, () => this.createTiles());
    } else {
      this.banner('3페이즈 · 언령 대결', '글자는 발음으로, 발음은 글자로 — 틀리면 야마비코가 회복한다');
      this.removeTiles();
    }
    this.time.delayedCall(1900, () => {
      if (this.state !== 'transition') return;
      this.state = 'fight';
      this.resetTimers();
    });
  }

  // ── 메아리 바닥 돌판 ─────────────────────────────────

  private createTiles(): void {
    this.removeTiles();
    this.tiles = TILES.map((t, i) => {
      const img = this.add.image(t.x, t.y, TEX.tile('idle')).setDepth(2).setAlpha(0);
      this.tweens.add({ targets: img, alpha: 1, duration: 400 });
      const label = this.ui.el('div', 'glyph tile-glyph', ROW_A[i].kana);
      this.ui.place(label, screen(t.x), screen(t.y - 1));
      return { img, label, kana: ROW_A[i] };
    });
  }

  /** 매번 돌판 글자 배치를 섞는다 (위치로 외우지 못하게) */
  private shuffleTiles(): void {
    const order = Phaser.Utils.Array.Shuffle([...ROW_A]);
    this.tiles.forEach((t, i) => {
      t.kana = order[i];
      t.label.textContent = order[i].kana;
      t.img.setTexture(TEX.tile('idle'));
    });
  }

  private removeTiles(): void {
    for (const t of this.tiles) {
      this.tweens.add({ targets: t.img, alpha: 0, duration: 300, onComplete: () => t.img.destroy() });
      t.label.remove();
    }
    this.tiles = [];
  }

  private tileUnderPlayer(): number {
    return this.tiles.findIndex((t) => Math.abs(this.player.x - t.img.x) < 14 && Math.abs(this.player.y - t.img.y) < 9);
  }

  // ── 퀴즈 ─────────────────────────────────────────────

  private startPhaseQuiz(): void {
    if (this.phase === 1) this.startQuiz('shout');
    else if (this.phase === 2) this.startQuiz('floor');
    else {
      this.startQuiz(this.duelNext);
      this.duelNext = this.duelNext === 'A' ? 'B' : 'A';
    }
  }

  private startQuiz(kind: QuizKind, rage = false): void {
    const base = makeQuiz(false);
    const limit = rage ? RAGE_LIMIT : QUIZ_LIMIT;
    const q: Quiz = { kind, answer: base.answer, choices: base.choices, limit, left: limit, done: false, rage, standTile: -1, standMs: 0 };
    this.quiz = q;
    this.state = 'quiz';
    this.worldTarget = SLOW;
    this.tweens.add({ targets: this.slowVeil, alpha: 1, duration: 250 });
    this.typer.reset();

    const title = rage ? '발악 · 마지막 언령' : kind === 'shout' ? '메아리 외침' : kind === 'floor' ? '메아리 바닥' : '언령 대결';
    const step = rage ? `${this.rageStep + 1} / ${RAGE_STEPS}` : undefined;
    const kanaChoices = q.choices.map((k) => ({ html: `<span class="jp">${k.kana}</span>`, correct: k === q.answer }));

    if (kind === 'shout' || kind === 'floor') {
      this.shout(q.answer);
      const how = '외친 소리';
      const replay = this.ttsOk ? ' <small>Space 다시 듣기</small>' : '';
      if (kind === 'shout') {
        this.panel.show({ title, prompt: `야마비코가 ${how}의 글자는?${replay}`, choices: kanaChoices }, (i) => this.resolve(q.choices[i] === q.answer, i));
      } else {
        this.shuffleTiles();
        this.panel.show({ title, prompt: `${how}의 글자가 새겨진 돌판 위에 서라! <small>WASD 이동</small>${replay}` });
      }
    } else if (kind === 'A') {
      this.panel.show({ title, step, big: { text: q.answer.kana, jp: true }, prompt: '발음을 한글로 입력 <small>예: 아 — 한/영 상관없이</small>', typing: true });
    } else {
      this.panel.show({ title, step, big: { text: q.answer.ko, jp: false }, prompt: '이 발음의 글자를 고르세요', choices: kanaChoices }, (i) =>
        this.resolve(q.choices[i] === q.answer, i),
      );
    }
  }

  /** 야마비코가 글자를 외친다 (일본어 음성이 없으면 말풍선에 한글로) */
  private shout(kana: Kana): void {
    this.cameras.main.shake(150, 0.003);
    const bubble = this.ui.el('div', 'boss-bubble', this.ttsOk ? '♪ ! ♪' : `「${kana.ko}!」`);
    // 머리 오른쪽 (위쪽 보스 체력바와 겹치지 않게)
    this.ui.place(bubble, screen(this.boss.x + 36), screen(this.boss.y - 26));
    this.time.delayedCall(this.ttsOk ? 900 : 2600, () => bubble.remove());
    if (this.ttsOk) void tts.speak(kana.kana, 0.9);
  }

  private updateQuiz(dt: number): void {
    const q = this.quiz!;
    q.left -= dt;
    this.panel.setTime(q.left / q.limit);
    if (q.kind === 'floor') {
      // 같은 돌판 위에 0.5초 가만히 서면 확정
      const tile = this.tileUnderPlayer();
      const still = readMove(this.keys);
      if (tile >= 0 && tile === q.standTile && still.x === 0 && still.y === 0) q.standMs += dt;
      else q.standMs = 0;
      q.standTile = tile;
      this.tiles.forEach((t, i) => t.img.setTexture(TEX.tile(i === tile ? 'good' : 'idle')).setAlpha(i === tile ? 1 : 0.85));
      // 소리를 들을 시간(1.2초)이 지난 뒤부터 확정
      if (q.standMs >= 500 && q.limit - q.left > 1200) return this.resolveFloor(tile);
      if (q.left <= 0) return this.resolveFloor(tile);
      return;
    }
    if (q.left <= 0) this.resolve(false, -1, '시간 초과!');
  }

  private resolveFloor(tile: number): void {
    const q = this.quiz!;
    const correct = tile >= 0 && this.tiles[tile].kana === q.answer;
    this.tiles.forEach((t) => t.img.setTexture(TEX.tile(t.kana === q.answer ? 'good' : 'bad')).setAlpha(1));
    this.resolve(correct, -1, tile < 0 ? '돌판 위에 서지 못했다!' : undefined);
  }

  private onKey(e: KeyboardEvent): void {
    if (this.sys.isPaused()) return; // 사용자 설정 창이 열려 있음
    const q = this.quiz;
    if (!q || q.done || this.state !== 'quiz') return;
    if (q.kind === 'A') {
      const handled = this.typer.handle(
        e,
        (preview) => this.panel.setTyped(preview),
        (syl) => this.resolve(syl === q.answer.ko, -1, syl === q.answer.ko ? undefined : `입력: ${syl}`),
      );
      if (handled) e.preventDefault();
      return;
    }
    if (e.key === ' ' && (q.kind === 'shout' || q.kind === 'floor') && this.ttsOk) void tts.speak(q.answer.kana, 0.9);
    const n = Number(e.key);
    if (n >= 1 && n <= 5 && (q.kind === 'shout' || q.kind === 'B')) this.panel.pick(n - 1);
  }

  private resolve(correct: boolean, picked = -1, note?: string): void {
    const q = this.quiz;
    if (!q || q.done) return;
    q.done = true;
    recordAnswer(q.answer, correct);
    this.stats.total++;
    if (correct) this.stats.correct++;

    const answerHtml = `<span class="jp">${q.answer.kana}</span> <b>[${q.answer.ko}]</b>`;
    let msg: string;
    if (correct) {
      msg = q.rage ? `언령 적중! (${this.rageStep + 1}/${RAGE_STEPS})` : '언령 반격!';
      this.counterBeam();
    } else if (q.rage || this.phase === 3) {
      msg = `${note ? `${note} ` : ''}정답은 ${answerHtml} — 메아리가 되돌아온다`;
    } else {
      msg = `${note ? `${note} ` : ''}정답은 ${answerHtml} — 메아리 충격파!`;
    }
    this.panel.feedback(correct, msg, picked);

    if (q.rage) {
      if (correct) {
        this.bossHp = Math.max(0, this.bossHp - 0.02 * BOSS_MAX_HP);
        this.rageStep++;
      } else {
        this.healBoss(0.1);
        this.rage = false;
      }
    } else if (correct) {
      this.hitBoss(0.1 * BOSS_MAX_HP, true);
    } else if (this.phase === 3) {
      this.healBoss(0.1);
    } else {
      this.shockwave();
    }
    this.time.delayedCall(correct ? 800 : 1300, () => this.finishQuiz(q, correct));
  }

  private finishQuiz(q: Quiz, correct: boolean): void {
    if (this.state === 'dead' || this.state === 'won') return;
    this.panel.close();
    this.quiz = null;
    if (q.kind === 'floor') this.tiles.forEach((t) => t.img.setTexture(TEX.tile('idle')).setAlpha(1));

    if (q.rage) {
      if (correct && this.rageStep >= RAGE_STEPS) return this.victory();
      if (correct) return this.startQuiz(Math.random() < 0.5 ? 'A' : 'B', true);
      this.banner('메아리가 되돌아왔다…', '다시 몰아붙여 발악을 끌어내라');
    }
    this.worldTarget = 1;
    this.tweens.add({ targets: this.slowVeil, alpha: 0, duration: 250 });
    this.state = 'fight';
    this.quizIn = QUIZ_GAP[this.phase];
  }

  private startRage(): void {
    this.rage = true;
    this.rageStep = 0;
    this.state = 'transition';
    for (const m of this.minions) {
      m.hp = 0;
      m.sprite.destroy();
    }
    this.minions = [];
    this.bullets.forEach((b) => (b.life = 0));
    this.cameras.main.shake(400, 0.008);
    this.banner('야마비코의 발악!', `다섯 언령을 연달아 맞혀라 — 하나라도 틀리면 회복한다`, 2000);
    this.time.delayedCall(1800, () => this.startQuiz(Math.random() < 0.5 ? 'A' : 'B', true));
  }

  // ── 연출 ─────────────────────────────────────────────

  /** 정답: 언령사에게서 야마비코로 금빛 언령이 꽂힌다 */
  private counterBeam(): void {
    const g = this.add.graphics().setDepth(800);
    const from = { x: this.player.x, y: this.player.y - 8 };
    const to = { x: this.boss.x, y: this.boss.y - BOSS_CORE_DY };
    const st = { a: 1 };
    this.tweens.add({
      targets: st,
      a: 0,
      duration: 450,
      onUpdate: () => {
        g.clear();
        g.lineStyle(5, 0xf0b84a, st.a * 0.4).lineBetween(from.x, from.y, to.x, to.y);
        g.lineStyle(2, 0xfffaf0, st.a).lineBetween(from.x, from.y, to.x, to.y);
      },
      onComplete: () => g.destroy(),
    });
    this.sparks(to.x, to.y, 12, 26);
    this.cameras.main.flash(150, 240, 184, 74);
    this.boss.setTintFill(0xffffff);
    this.time.delayedCall(120, () => this.boss.clearTint());
  }

  /** 오답 (1·2페이즈): 야마비코의 충격파가 언령사를 덮친다 */
  private shockwave(): void {
    const cx = this.boss.x;
    const cy = this.boss.y - 10;
    const g = this.add.graphics().setDepth(800);
    const st = { r: 6, a: 1 };
    const maxR = Phaser.Math.Distance.Between(cx, cy, this.player.x, this.player.y) + 12;
    this.tweens.add({
      targets: st,
      r: maxR,
      a: 0.2,
      duration: 380,
      onUpdate: () => {
        g.clear();
        g.lineStyle(3, 0xd8432e, st.a).strokeCircle(cx, cy, st.r);
      },
      onComplete: () => {
        g.destroy();
        this.damagePlayer(15, true);
      },
    });
  }

  private sparks(x: number, y: number, n: number, dist: number): void {
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.3;
      const s = this.add.image(x, y, TEX.spark).setDepth(850);
      this.tweens.add({
        targets: s,
        x: x + Math.cos(a) * dist,
        y: y + Math.sin(a) * dist,
        alpha: 0,
        duration: 450,
        onComplete: () => s.destroy(),
      });
    }
  }

  // ── 피격 · 결과 ──────────────────────────────────────

  private checkContact(time: number): void {
    if (time < this.invulnUntil) return;
    const px = this.player.x;
    const py = this.player.y - 6;
    if (Phaser.Math.Distance.Between(px, py, this.boss.x, this.boss.y - BOSS_CORE_DY) < BOSS_RADIUS + 4) {
      this.knockPlayer(this.boss.x, this.boss.y - BOSS_CORE_DY, 26);
      return this.damagePlayer(this.bossMode === 'charge' ? 20 : 15);
    }
    for (const m of this.minions) {
      if (Phaser.Math.Distance.Between(px, py, m.sprite.x, m.sprite.y - 3) < m.radius + 5) return this.damagePlayer(8);
    }
    for (const b of this.bullets) {
      if (Phaser.Math.Distance.Between(px, py, b.sprite.x, b.sprite.y) < 7) {
        b.life = 0;
        return this.damagePlayer(8);
      }
    }
  }

  /** 야마비코에게 부딪히면 튕겨 나간다 (계속 겹쳐서 녹는 것 방지) */
  private knockPlayer(fromX: number, fromY: number, dist: number): void {
    const p = this.player;
    const dx = p.x - fromX;
    const dy = p.y - 6 - fromY;
    const d = Math.hypot(dx, dy) || 1;
    let tx = p.x + (dx / d) * dist;
    let ty = p.y + (dy / d) * dist;
    // 마당 밖으로는 밀려나지 않게 안쪽으로 당긴다
    for (let i = 0; i < 6 && !this.inFloor(tx, ty); i++) {
      tx = (tx + BOSS_FLOOR.cx) / 2;
      ty = (ty + BOSS_FLOOR.cy) / 2;
    }
    this.tweens.add({ targets: p, x: tx, y: ty, duration: 160, ease: 'Cubic.easeOut' });
  }

  private damagePlayer(n: number, ignoreInvuln = false): void {
    const now = this.time.now;
    if (this.state === 'dead' || this.state === 'won') return;
    if (!ignoreInvuln && now < this.invulnUntil) return;
    if (settings.god) return;
    run.hp -= n;
    this.invulnUntil = now + 700;
    this.cameras.main.shake(120, 0.004);
    if (run.hp <= 0) this.die();
  }

  private wrongChips(parent: HTMLElement): void {
    const wrong = ROW_A.filter((k) => run.wrong[k.kana]).sort((a, b) => run.wrong[b.kana] - run.wrong[a.kana]);
    if (wrong.length === 0) {
      this.ui.el('p', '', '틀린 글자는 없었다!', parent);
      return;
    }
    this.ui.el('p', '', '틀린 글자 — 눌러서 다시 듣기', parent);
    const row = this.ui.el('div', 'row', '', parent);
    for (const k of wrong) {
      const chip = this.ui.el('div', 'wrong-chip', '', row);
      chip.innerHTML = `<span class="kana">${k.kana}</span><b>${k.ko}</b><small>×${run.wrong[k.kana]}</small>`;
      chip.addEventListener('click', () => void tts.speak(k.kana));
    }
  }

  private endQuizUi(): void {
    this.panel.close();
    this.quiz = null;
    this.removeTiles();
    this.worldTarget = 1;
    this.slowVeil.setAlpha(0);
  }

  private die(): void {
    this.state = 'dead';
    run.hp = 0;
    this.updateHud();
    this.endQuizUi();
    this.tweens.add({ targets: this.player, alpha: 0.2, angle: 90, duration: 500 });
    this.time.delayedCall(700, () => {
      this.ui.root.classList.add('dimmed');
      const panel = this.ui.el('div', 'panel fade-in defeat');
      this.ui.el('h2', '', '쓰러졌다…', panel);
      this.wrongChips(panel);
      const btns = this.ui.el('div', 'row', '', panel);
      btns.style.marginBottom = '0';
      this.ui.button('보스부터 다시', () => this.scene.restart(), '', btns);
      this.ui.button('서고부터 다시', () => {
        resetRun();
        this.scene.start('Library');
      }, 'primary', btns);
    });
  }

  private victory(): void {
    this.state = 'won';
    this.bossHp = 0;
    this.updateHud();
    this.endQuizUi();
    this.minions.forEach((m) => m.sprite.destroy());
    this.bullets.forEach((b) => b.sprite.destroy());
    this.minions = [];
    this.bullets = [];
    // 마지막 일격: 言う
    this.cameras.main.flash(400, 255, 250, 240);
    this.sparks(this.boss.x, this.boss.y - BOSS_CORE_DY, 20, 50);
    this.tweens.add({ targets: [this.boss, this.bossShadow], alpha: 0, scaleX: 1.4, scaleY: 0.2, duration: 900, ease: 'Cubic.easeIn' });
    if (this.ttsOk) this.time.delayedCall(500, () => void tts.speak('いう'));

    this.time.delayedCall(1400, () => {
      this.ui.root.classList.add('dimmed');
      const panel = this.ui.el('div', 'panel fade-in victory');
      this.ui.el('h2', '', 'あ행 돌파!', panel);
      const word = this.ui.el('div', 'final-word', '', panel);
      word.innerHTML = `<span class="jp">いう</span><em><span class="jp">言う</span> · 말하다</em>`;
      word.addEventListener('click', () => void tts.speak('いう'));
      this.ui.el('p', '', `마지막 언령은 <b>いう</b> — 언령(<span class="jp">言霊</span>)의 '<span class="jp">言</span>'.<br>보스 퀴즈 정답 <b>${this.stats.correct} / ${this.stats.total}</b>`, panel);
      this.wrongChips(panel);
      const btns = this.ui.el('div', 'row', '', panel);
      btns.style.marginBottom = '0';
      const next = this.ui.button('か행 (준비 중)', () => undefined, '', btns);
      next.disabled = true;
      this.ui.button('서고부터 다시', () => {
        resetRun();
        this.scene.start('Library');
      }, 'primary', btns);
    });
  }
}
