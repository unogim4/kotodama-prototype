import Phaser from 'phaser';
import { ROW_A, Kana } from '../data/kana';
import { tts } from '../systems/tts';
import { run } from '../systems/run';
import { UILayer } from '../ui/UILayer';
import { TEX, HANG_FRAME_COUNT } from '../art/textures';
import { libraryBackground, LIB_W, LIB_H, HANG_W, HANG_H, HANG_PAPER_CENTER } from '../art/sprites';

/** 서고는 2배로 가까이 본다 (월드 320×180 → 화면 640×360) */
const ZOOM = 2;
const STAND_XS = [60, 110, 160, 210, 260];
/** 받침대 윗면 y */
const STAND_Y = 124;
/** 벽 족자 걸이 y */
const HOOK_Y = 22;
/** 펼침 화면의 족자 배율과 위치 (월드 좌표) */
const REVEAL_SCALE = 2;
const REVEAL_TOP = 34;
const BG_KEY = 'library-bg';
/** 오른쪽 벽의 문 (다음 방 = 무기 선택) */
const DOOR = { x: 284, y: 22, w: 30, h: 60 };
const DOOR_CX = DOOR.x + DOOR.w / 2;
const PLAYER_X = 160;
const PLAYER_Y = 168;
/** 걷는 속도 (월드 px/초) */
const WALK_SPEED = 80;

interface Slot {
  kana: Kana;
  x: number;
  sealed: Phaser.GameObjects.Image;
  hung?: Phaser.GameObjects.Image;
  /** 벽 족자 위의 글자 (DOM) */
  label?: HTMLElement;
  opened: boolean;
}

interface Reveal {
  slot: Slot;
  dim: Phaser.GameObjects.Rectangle;
  hang: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Image;
  dom: HTMLElement[];
  ready: boolean;
}

interface Door {
  left: Phaser.GameObjects.Image;
  right: Phaser.GameObjects.Image;
  seal: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Image;
  open: boolean;
}

/** 월드 좌표 → 640×360 화면 좌표 */
const screen = (v: number) => v * ZOOM;

export class LibraryScene extends Phaser.Scene {
  private ui!: UILayer;
  private slots: Slot[] = [];
  private reveal: Reveal | null = null;
  private completed = false;
  private pips: HTMLElement[] = [];
  private hint!: HTMLElement;
  private tooltip!: HTMLElement;
  private player!: Phaser.GameObjects.Image;
  private shadow!: Phaser.GameObjects.Ellipse;
  private playerBob!: Phaser.Tweens.Tween;
  private door!: Door;
  private panel: HTMLElement | null = null;
  private leaving = false;

  constructor() {
    super('Library');
  }

  create(): void {
    this.slots = [];
    this.reveal = null;
    this.completed = false;
    this.panel = null;
    this.leaving = false;

    const cam = this.cameras.main;
    cam.setZoom(ZOOM);
    cam.centerOn(LIB_W / 2, LIB_H / 2);

    if (!this.textures.exists(BG_KEY)) this.textures.addCanvas(BG_KEY, libraryBackground(STAND_XS, HOOK_Y, DOOR));
    this.add.image(0, 0, BG_KEY).setOrigin(0);

    this.ui = new UILayer(this);
    this.createDoor();
    ROW_A.forEach((kana, i) => this.createSlot(kana, i));
    this.createPlayer();
    this.createHud();

    const kb = this.input.keyboard!;
    kb.on('keydown-SPACE', () => this.reveal?.ready && this.speak(this.reveal.slot.kana));
    kb.on('keydown-ENTER', () => {
      if (this.reveal?.ready) this.closeReveal();
      else if (this.panel) this.closePanel();
    });
    kb.on('keydown-ESC', () => this.reveal?.ready && this.closeReveal());
  }

  // ── 배치 ─────────────────────────────────────────────

  private createPlayer(): void {
    this.shadow = this.add.ellipse(PLAYER_X, PLAYER_Y, 14, 4, 0x000000, 0.3);
    this.player = this.add.image(PLAYER_X, PLAYER_Y, TEX.player).setOrigin(0.5, 1);
    this.playerBob = this.tweens.add({ targets: this.player, y: PLAYER_Y - 1, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  /** 오른쪽 장지문. 두루마리를 모두 펼치기 전엔 금줄로 봉인되어 있다 */
  private createDoor(): void {
    const glow = this.add.image(DOOR_CX, DOOR.y + DOOR.h / 2, TEX.glow).setAlpha(0).setScale(0.6);
    const left = this.add.image(DOOR.x, DOOR.y, TEX.doorPanel).setOrigin(0);
    const right = this.add.image(DOOR.x + DOOR.w / 2, DOOR.y, TEX.doorPanel).setOrigin(0).setFlipX(true);
    // 문짝은 문간 밖으로 미끄러져 사라진다
    const mask = this.make.graphics({}, false).fillRect(DOOR.x, DOOR.y, DOOR.w, DOOR.h).createGeometryMask();
    left.setMask(mask);
    right.setMask(mask);
    const seal = this.add.image(DOOR_CX, DOOR.y + 16, TEX.doorSeal);
    this.door = { left, right, seal, glow, open: false };

    const zone = this.add.zone(DOOR.x - 2, DOOR.y - 4, DOOR.w + 4, DOOR.h + 10).setOrigin(0).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () =>
      this.showTooltipAt(DOOR.x + DOOR.w, DOOR.y + DOOR.h + 13, this.door.open ? '다음 방으로 ▶' : '봉인된 문 · 두루마리를 모두 펼치면 열린다', 'right'),
    );
    zone.on('pointerout', () => this.hideTooltip());
    zone.on('pointerdown', () => (this.door.open ? this.enterDoor() : this.rattleSeal()));
  }

  private createSlot(kana: Kana, i: number): void {
    const x = STAND_XS[i];
    this.add.image(x, STAND_Y, TEX.stand).setOrigin(0.5, 0);
    const sealed = this.add.image(x, STAND_Y + 1, TEX.scrollSealed).setOrigin(0.5, 1).setInteractive({ useHandCursor: true });
    this.tweens.add({ targets: sealed, y: STAND_Y - 1, duration: 900 + i * 90, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const slot: Slot = { kana, x, sealed, opened: false };
    sealed.on('pointerover', () => this.showTooltip(slot, '봉인된 두루마리'));
    sealed.on('pointerout', () => this.hideTooltip());
    sealed.on('pointerdown', () => this.openReveal(slot));
    this.slots.push(slot);
  }

  private createHud(): void {
    this.ui.el('div', 'hud-title', '⛩️ あ행 서고');
    const progress = this.ui.el('div', 'hud-progress', '<span>두루마리</span>');
    this.pips = ROW_A.map(() => this.ui.el('div', 'pip', '', progress));
    this.hint = this.ui.el('div', 'hint', '봉인된 두루마리를 눌러 펼쳐 보세요');
    this.tooltip = this.ui.el('div', 'tooltip');
    this.tooltip.style.display = 'none';
  }

  private showTooltip(slot: Slot, text: string): void {
    const y = slot.opened ? HOOK_Y + HANG_H + 2 : STAND_Y - 22;
    this.showTooltipAt(slot.x, y, text);
  }

  /** align 'right'면 x가 툴팁의 오른쪽 끝 (화면 가장자리용) */
  private showTooltipAt(x: number, y: number, text: string, align: 'center' | 'right' = 'center'): void {
    if (this.reveal || this.panel || this.leaving) return;
    this.tooltip.textContent = text;
    this.tooltip.style.display = '';
    this.tooltip.style.transform = align === 'right' ? 'translate(-100%, 0)' : '';
    this.ui.place(this.tooltip, screen(x), screen(y));
  }

  private hideTooltip(): void {
    this.tooltip.style.display = 'none';
  }

  // ── 펼침 ─────────────────────────────────────────────

  private openReveal(slot: Slot): void {
    if (this.reveal || this.panel || this.leaving) return;
    this.hideTooltip();
    this.hint.style.opacity = '0';
    this.ui.root.classList.add('dimmed');
    this.coverWallLabels(true);

    const dim = this.add.rectangle(0, 0, LIB_W, LIB_H, 0x0c0a12, 0.78).setOrigin(0).setDepth(10).setAlpha(0).setInteractive();
    dim.on('pointerdown', () => this.reveal?.ready && this.closeReveal());
    this.tweens.add({ targets: dim, alpha: 1, duration: 250 });

    const cx = LIB_W / 2;
    const glow = this.add.image(cx, REVEAL_TOP + (HANG_H * REVEAL_SCALE) / 2, TEX.glow).setDepth(11).setScale(0).setAlpha(0);
    const hang = this.add.image(cx, REVEAL_TOP, TEX.hang(0)).setOrigin(0.5, 0).setScale(REVEAL_SCALE).setDepth(12).setVisible(false);
    this.reveal = { slot, dim, hang, glow, dom: [], ready: false };

    if (slot.opened) {
      // 이미 펼친 두루마리는 바로 보여준다 (복습)
      hang.setTexture(TEX.hang(HANG_FRAME_COUNT - 1)).setVisible(true).setAlpha(0);
      this.tweens.add({ targets: hang, alpha: 1, duration: 200, onComplete: () => this.onRevealed() });
      return;
    }

    // 받침대의 두루마리가 화면 가운데로 떠오른다
    slot.sealed.setVisible(false);
    const fly = this.add.image(slot.x, STAND_Y - 5, TEX.scrollSealed).setDepth(12);
    this.tweens.add({
      targets: fly,
      x: cx,
      y: REVEAL_TOP + 6,
      scale: REVEAL_SCALE,
      duration: 380,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        fly.destroy();
        this.unroll(hang);
      },
    });
  }

  /**
   * 벽 글자는 캔버스 위 DOM이라 펼침 화면의 족자보다 앞에 그려진다.
   * 펼침 족자와 겹치는 글자는 완전히 숨긴다 (나머지는 dimmed로 흐리게).
   */
  private coverWallLabels(cover: boolean): void {
    const reach = (HANG_W * REVEAL_SCALE + HANG_W) / 2;
    for (const s of this.slots) {
      s.label?.classList.toggle('covered', cover && Math.abs(s.x - LIB_W / 2) < reach);
    }
  }

  /** 족자 프레임을 차례로 넘겨 아래로 펼친다 */
  private unroll(hang: Phaser.GameObjects.Image): void {
    hang.setVisible(true);
    let frame = 0;
    this.time.addEvent({
      delay: 110,
      repeat: HANG_FRAME_COUNT - 2,
      callback: () => {
        frame++;
        hang.setTexture(TEX.hang(frame));
        if (frame === HANG_FRAME_COUNT - 1) this.onRevealed();
      },
    });
  }

  private onRevealed(): void {
    const r = this.reveal;
    if (!r) return;
    const { kana } = r.slot;

    // 금빛 + 불꽃
    this.tweens.add({ targets: r.glow, scale: 2.2, alpha: 1, duration: 300, ease: 'Back.easeOut' });
    this.tweens.add({ targets: r.glow, scale: 2, duration: 1200, yoyo: true, repeat: -1, delay: 300, ease: 'Sine.easeInOut' });
    if (!r.slot.opened) this.burstSparks(r.glow.x, r.glow.y);

    // 교과서체 글자 (한지 중앙)
    const glyphX = LIB_W / 2 - (HANG_W * REVEAL_SCALE) / 2 + HANG_PAPER_CENTER.x * REVEAL_SCALE;
    const glyphY = REVEAL_TOP + HANG_PAPER_CENTER.y * REVEAL_SCALE;
    const glyph = this.ui.el('div', 'glyph fade-in', kana.kana);
    glyph.style.fontSize = '58px';
    this.ui.place(glyph, screen(glyphX), screen(glyphY));

    const caption = this.ui.el('div', 'reveal-caption', `발음 <b>${kana.ko}</b> · ${kana.romaji}`);
    const buttons = this.ui.el('div', 'reveal-buttons');
    this.ui.button('🔊 다시 듣기<small>Space</small>', () => this.speak(kana), '', buttons);
    this.ui.button('확인<small>Enter</small>', () => this.closeReveal(), 'primary', buttons);
    r.dom.push(glyph, caption, buttons);

    requestAnimationFrame(() => {
      caption.style.opacity = '1';
      buttons.style.opacity = '1';
    });

    this.time.delayedCall(180, () => this.speak(kana));
    r.ready = true;
  }

  private async speak(kana: Kana): Promise<void> {
    const ok = await tts.speak(kana.kana);
    if (ok || !this.reveal || this.reveal.dom.some((e) => e.classList.contains('notice'))) return;
    const notice = this.ui.el('div', 'notice', '일본어 음성을 찾지 못했어요 · Edge 브라우저에서 가장 잘 들려요');
    this.reveal.dom.push(notice);
  }

  private burstSparks(x: number, y: number): void {
    for (let i = 0; i < 10; i++) {
      const a = (Math.PI * 2 * i) / 10 + Math.random() * 0.3;
      const d = 40 + Math.random() * 20;
      const s = this.add.image(x, y, TEX.spark).setDepth(13);
      this.tweens.add({
        targets: s,
        x: x + Math.cos(a) * d,
        y: y + Math.sin(a) * d,
        alpha: 0,
        duration: 600 + Math.random() * 300,
        ease: 'Cubic.easeOut',
        onComplete: () => s.destroy(),
      });
    }
  }

  private closeReveal(): void {
    const r = this.reveal;
    if (!r) return;
    speechSynthesis.cancel();
    r.dom.forEach((e) => e.remove());
    this.tweens.killTweensOf(r.glow);
    this.tweens.add({
      targets: [r.dim, r.hang, r.glow],
      alpha: 0,
      duration: 200,
      onComplete: () => [r.dim, r.hang, r.glow].forEach((o) => o.destroy()),
    });
    this.ui.root.classList.remove('dimmed');
    this.coverWallLabels(false);

    if (!r.slot.opened) this.hangOnWall(r.slot);
    this.reveal = null;

    if (!this.completed && this.slots.every((s) => s.opened)) {
      this.completed = true;
      this.time.delayedCall(450, () => this.showComplete());
    }
  }

  /** 봉인이 풀린 두루마리는 받침대 위 벽에 족자로 걸린다 */
  private hangOnWall(slot: Slot): void {
    slot.opened = true;
    slot.sealed.destroy();

    const hung = this.add.image(slot.x, HOOK_Y - 6, TEX.hang(HANG_FRAME_COUNT - 1)).setOrigin(0.5, 0).setAlpha(0);
    hung.setInteractive({ useHandCursor: true });
    hung.on('pointerover', () => this.showTooltip(slot, '다시 보기'));
    hung.on('pointerout', () => this.hideTooltip());
    hung.on('pointerdown', () => this.openReveal(slot));
    slot.hung = hung;

    const label = this.ui.el('div', 'glyph wall-glyph', slot.kana.kana);
    label.style.fontSize = '28px';
    this.ui.place(label, screen(slot.x), screen(HOOK_Y + HANG_PAPER_CENTER.y));
    slot.label = label;

    this.tweens.add({
      targets: hung,
      y: HOOK_Y,
      alpha: 1,
      duration: 300,
      ease: 'Back.easeOut',
      onComplete: () => label.classList.add('shown'),
    });

    const i = this.slots.indexOf(slot);
    this.pips[i].classList.add('on');
    this.pips[i].textContent = slot.kana.kana;
  }

  // ── 완료 · 문 ───────────────────────────────────────

  private showComplete(): void {
    run.learned = this.slots.map((sl) => sl.kana.kana);
    this.ui.root.classList.add('dimmed');
    const panel = this.ui.el('div', 'panel fade-in');
    this.ui.el('h2', '', '봉인 해제 완료', panel);
    this.ui.el('p', '', 'あ행의 언령 다섯 개를 손에 넣었다.<br>오른쪽 문의 봉인이 풀린다.', panel);
    const row = this.ui.el('div', 'row', '', panel);
    ROW_A.forEach((k) => this.ui.el('div', 'kana', k.kana, row));
    const btns = this.ui.el('div', 'row', '', panel);
    btns.style.marginBottom = '0';
    this.ui.button('확인<small>Enter</small>', () => this.closePanel(), 'primary', btns);
    this.panel = panel;
  }

  private closePanel(): void {
    if (!this.panel) return;
    this.panel.remove();
    this.panel = null;
    this.ui.root.classList.remove('dimmed');
    this.unlockDoor();
  }

  /** 봉인 전에 문을 누르면 금줄이 흔들린다 */
  private rattleSeal(): void {
    const { seal } = this.door;
    this.tweens.killTweensOf(seal);
    seal.x = DOOR_CX;
    this.tweens.add({ targets: seal, x: DOOR_CX + 1, duration: 50, yoyo: true, repeat: 3, onComplete: () => (seal.x = DOOR_CX) });
  }

  /** 금줄이 타올라 사라지고 장지문이 양옆으로 열린다 */
  private unlockDoor(): void {
    const d = this.door;
    this.tweens.add({ targets: d.seal, y: d.seal.y - 6, alpha: 0, duration: 400, ease: 'Cubic.easeIn' });
    this.burstSparks(DOOR_CX, d.seal.y);
    this.tweens.add({ targets: d.left, x: DOOR.x - DOOR.w / 2, duration: 600, delay: 350, ease: 'Cubic.easeInOut' });
    this.tweens.add({ targets: d.right, x: DOOR.x + DOOR.w, duration: 600, delay: 350, ease: 'Cubic.easeInOut' });
    this.tweens.add({
      targets: d.glow,
      alpha: 0.85,
      scale: 0.7,
      duration: 500,
      delay: 600,
      onComplete: () => {
        d.open = true;
        this.tweens.add({ targets: d.glow, scale: 0.6, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        const arrow = this.ui.el('div', 'door-arrow', '▲');
        this.ui.place(arrow, screen(DOOR_CX), screen(DOOR.y + DOOR.h + 4));
        this.hint.textContent = '오른쪽 문을 눌러 다음 방으로';
        this.hint.style.opacity = '1';
      },
    });
  }

  /** 언령사가 문까지 걸어가 들어간다 → 무기 선택 */
  private enterDoor(): void {
    if (this.leaving || this.reveal || this.panel) return;
    this.leaving = true;
    this.hideTooltip();
    this.hint.style.opacity = '0';
    this.ui.root.querySelector('.door-arrow')?.remove();
    this.playerBob.stop();
    this.player.y = PLAYER_Y;

    const walk = (x: number, y: number, onComplete: () => void) => {
      const ms = (Phaser.Math.Distance.Between(this.player.x, this.player.y, x, y) / WALK_SPEED) * 1000;
      this.tweens.add({ targets: this.player, x, y, duration: ms, onComplete });
      this.tweens.add({ targets: this.shadow, x, y, duration: ms });
      // 걸음마다 살짝 통통
      this.tweens.add({ targets: this.player, scaleY: 0.92, duration: 110, yoyo: true, repeat: Math.max(0, Math.floor(ms / 220) - 1) });
    };

    walk(DOOR_CX, PLAYER_Y, () =>
      walk(DOOR_CX, DOOR.y + DOOR.h + 6, () => {
        this.tweens.add({ targets: [this.player, this.shadow], y: DOOR.y + DOOR.h - 4, alpha: 0, duration: 300 });
        this.cameras.main.fadeOut(450, 12, 10, 18);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('WeaponSelect'));
      }),
    );
  }
}
