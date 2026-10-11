import Phaser from 'phaser';
import { settings, saveSettings } from '../systems/settings';
import { run, resetRaid, resetRun } from '../systems/run';
import { WEAPONS, WeaponId } from '../data/weapons';
import { rollUpgrades } from '../data/upgrades';
import { ROWS } from '../data/kana';
import { learnedKana } from '../systems/quiz';

/** 바로 이동할 수 있는 지점 */
interface Jump {
  label: string;
  group: string;
  go: () => [scene: string, data?: object];
}

const JUMPS: Jump[] = [
  { group: '서고', label: '챕터 선택', go: () => ['Title'] },
  { group: '서고', label: '🧪 전투 샘플', go: () => ['Sandbox'] },
  { group: '서고', label: '서고 (처음부터)', go: () => ['Library'] },
  { group: '서고', label: '무기 선택', go: () => ['WeaponSelect'] },
  { group: '습격', label: '습격 1', go: () => ['Raid', room(1)] },
  { group: '습격', label: '습격 2', go: () => ['Raid', room(2)] },
  { group: '습격', label: '습격 3', go: () => ['Raid', room(3)] },
  { group: '보스', label: '1페이즈', go: () => ['Boss', { phase: 1 }] },
  { group: '보스', label: '2페이즈', go: () => ['Boss', { phase: 2 }] },
  { group: '보스', label: '3페이즈', go: () => ['Boss', { phase: 3 }] },
  { group: '보스', label: '발악', go: () => ['Boss', { phase: 'rage' }] },
];

function room(n: number): object {
  run.room = n;
  return {};
}

/**
 * ⚙ 사용자 설정 모드 — 원하는 지점으로 바로 이동, 무기·강화·무적 설정.
 * 어느 장면에서나 F2 또는 오른쪽 아래 ⚙ 버튼으로 연다.
 */
export class SettingsPanel {
  private readonly toggle: HTMLButtonElement;
  private panel: HTMLElement | null = null;
  private paused: Phaser.Scene[] = [];

  constructor(private readonly game: Phaser.Game) {
    const ui = document.getElementById('ui')!;
    this.toggle = document.createElement('button');
    this.toggle.className = 'settings-toggle';
    this.toggle.addEventListener('click', () => this.flip());
    ui.appendChild(this.toggle);
    this.refreshToggle();

    window.addEventListener('keydown', (e) => {
      if (e.key === 'F2') {
        e.preventDefault();
        this.flip();
      } else if (e.key === 'Escape' && this.panel) {
        e.stopImmediatePropagation();
        this.close();
      }
    }, true);
  }

  private refreshToggle(): void {
    this.toggle.innerHTML = `⚙${settings.god ? '<b>무적</b>' : ''}`;
    this.toggle.title = '사용자 설정 (F2)';
  }

  private flip(): void {
    if (this.panel) this.close();
    else this.open();
  }

  private open(): void {
    // 진행 중인 장면을 멈춘다
    this.paused = this.game.scene.getScenes(true).filter((s) => s.scene.key !== 'Boot');
    this.paused.forEach((s) => s.scene.pause());

    const ui = document.getElementById('ui')!;
    const p = document.createElement('div');
    p.className = 'settings-panel fade-in';
    this.panel = p;
    ui.appendChild(p);
    this.render();
  }

  private render(): void {
    const p = this.panel!;
    p.innerHTML = '';
    const h = (tag: string, cls: string, html: string, parent: HTMLElement = p) => {
      const e = document.createElement(tag);
      if (cls) e.className = cls;
      e.innerHTML = html;
      parent.appendChild(e);
      return e;
    };
    const btn = (label: string, on: boolean, fn: () => void, parent: HTMLElement, cls = '') => {
      const b = h('button', `btn ${cls}${on ? ' on' : ''}`, label, parent) as HTMLButtonElement;
      b.addEventListener('click', fn);
      return b;
    };

    h('h2', '', '⚙ 사용자 설정');
    h('p', 'settings-sub', '원하는 지점을 누르면 그곳에서 바로 시작해요');

    // 챕터 · 무기 · 강화 · 무적 (바로 이동할 때 적용)
    const opts = h('div', 'settings-opts', '');
    const cRow = h('div', 'settings-row chapters', '<span>챕터</span>', opts);
    for (const r of ROWS) btn(`<span class="jp">${r.kana[0].kana}</span>`, settings.chapter === r.index, () => this.set({ chapter: r.index }), cRow, 'tiny');

    const wRow = h('div', 'settings-row', '<span>무기</span>', opts);
    for (const w of WEAPONS) {
      btn(w.name, settings.weapon === w.id, () => this.set({ weapon: w.id as WeaponId }), wRow, 'small');
    }
    const uRow = h('div', 'settings-row', '<span>강화</span>', opts);
    for (const n of [0, 3, 6, 10]) btn(`${n}개`, settings.upgrades === n, () => this.set({ upgrades: n }), uRow, 'small');
    const gRow = h('div', 'settings-row', '<span>무적</span>', opts);
    btn('끔', !settings.god, () => this.set({ god: false }), gRow, 'small');
    btn('켬', settings.god, () => this.set({ god: true }), gRow, 'small');
    h('span', 'settings-gap', '', gRow);
    btn(`모든 챕터 열기 ${settings.unlockAll ? '켬' : '끔'}`, settings.unlockAll, () => this.set({ unlockAll: !settings.unlockAll }), gRow, 'small');

    // 바로 이동
    const groups = [...new Set(JUMPS.map((j) => j.group))];
    for (const g of groups) {
      const row = h('div', 'settings-row jumps', `<span>${g}</span>`);
      for (const j of JUMPS.filter((x) => x.group === g)) btn(j.label, false, () => this.jump(j), row, 'primary small');
    }

    const foot = h('div', 'settings-foot', '');
    btn('닫기<small>Esc · F2</small>', false, () => this.close(), foot);
  }

  private set(patch: Partial<typeof settings>): void {
    Object.assign(settings, patch);
    saveSettings();
    this.refreshToggle();
    this.render();
  }

  /** 설정한 무기·강화로 런 상태를 꾸리고 그 지점부터 시작 */
  private jump(j: Jump): void {
    run.chapter = settings.chapter;
    if (j.label.startsWith('서고') || j.label === '챕터 선택') {
      resetRun();
    } else {
      run.weapon = j.label === '무기 선택' ? null : settings.weapon;
      run.learned = learnedKana().map((k) => k.kana);
      resetRaid();
      for (let i = 0; i < settings.upgrades; i++) {
        const u = rollUpgrades(run.weapon, run.upgrades, 1)[0];
        u.apply(run.build, (amount) => (run.hp = Math.min(run.build.maxHp, run.hp + amount)));
        run.upgrades.push(u.id);
        run.level++;
      }
      run.hp = run.build.maxHp;
    }
    const [scene, data] = j.go();
    this.closePanelOnly();
    const sm = this.game.scene;
    const target = sm.getScene(scene);
    const running = (s: Phaser.Scene) => s.scene.isActive() || s.scene.isPaused();
    sm.getScenes(false)
      .filter((s) => s.scene.key !== 'Boot' && s !== target && running(s))
      .forEach((s) => s.scene.stop());
    this.paused = [];
    // 같은 장면으로 이동하면 멈췄다 켜는 대신 다시 시작
    if (running(target)) target.scene.restart(data);
    else sm.start(scene, data);
  }

  private closePanelOnly(): void {
    this.panel?.remove();
    this.panel = null;
  }

  private close(): void {
    this.closePanelOnly();
    this.paused.forEach((s) => s.scene.isPaused() && s.scene.resume());
    this.paused = [];
  }
}
