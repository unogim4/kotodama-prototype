import Phaser from 'phaser';
import { UILayer } from '../ui/UILayer';
import { ROWS } from '../data/kana';
import { BOSSES } from '../data/bosses';
import { TEX } from '../art/textures';
import { libraryBackground } from '../art/sprites';
import { run, resetRun } from '../systems/run';
import { isCleared, isUnlocked, clearedCount } from '../systems/progress';

/**
 * 챕터 선택 — 히라가나 10행.
 * 한 판 = 한 행 (서고 → 무기 → 습격 ×3 → 보스). 앞 행을 돌파하면 다음 행이 열린다.
 */
export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create(): void {
    this.cameras.main.fadeIn(300, 12, 10, 18);
    // 배경: 서고를 어둡게
    if (!this.textures.exists('library-bg-5')) {
      this.textures.addCanvas('library-bg-5', libraryBackground([60, 110, 160, 210, 260], 22, { x: 284, y: 22, w: 30, h: 60 }));
    }
    this.add.image(0, 0, 'library-bg-5').setOrigin(0).setScale(2);
    this.add.rectangle(0, 0, 640, 360, 0x0c0a12, 0.86).setOrigin(0);

    const ui = new UILayer(this);
    const head = ui.el('div', 'title-head');
    head.innerHTML = `<b>언령 <span class="jp">言霊</span> 로그라이크</b><span>히라가나 46자 · 돌파 ${clearedCount()} / ${ROWS.length}</span>`;

    const grid = ui.el('div', 'chapter-grid');
    ROWS.forEach((row, i) => {
      const boss = BOSSES[i];
      const open = isUnlocked(i);
      const done = isCleared(i);
      const card = ui.el('button', `chapter-card${open ? ' clickable' : ' locked'}${done ? ' done' : ''}`, '', grid);
      card.innerHTML =
        `<span class="ch-name">${row.name}</span>` +
        `<span class="ch-kana jp">${row.kana.map((k) => k.kana).join('')}</span>` +
        `<span class="ch-boss">${open ? `👺 ${boss.name}` : '🔒 잠김'}</span>` +
        `<span class="ch-state">${done ? '✅ 돌파' : open ? '도전 가능' : `${ROWS[i - 1]?.name ?? ''} 돌파 시`}</span>`;
      if (open) card.addEventListener('click', () => this.startChapter(i));
    });

    // 카드 뒤 보스 미리보기 (캔버스 — 카드 배경은 투명)
    ROWS.forEach((_, i) => {
      if (!isUnlocked(i)) return;
      const col = i % 5;
      const rowN = Math.floor(i / 5);
      const x = 80 + col * 120;
      const y = 112 + rowN * 128;
      // 카드(112×120) 위쪽 칸에 서 있게
      this.add.image(x, y - 2, TEX.boss(BOSSES[i].id, false)).setOrigin(0.5, 1).setAlpha(isCleared(i) ? 0.55 : 1);
    });

    ui.el('div', 'title-foot', '카드를 눌러 시작 · <b>F2</b> 사용자 설정');
  }

  private startChapter(i: number): void {
    run.chapter = i;
    resetRun();
    this.cameras.main.fadeOut(300, 12, 10, 18);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('Library'));
  }
}
