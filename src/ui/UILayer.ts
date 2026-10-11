import Phaser from 'phaser';

/**
 * 장면별 DOM UI. 640×360 좌표계로 배치하고, 장면이 끝나면 자동으로 제거된다.
 * 학습 글자처럼 선명해야 하는 텍스트는 캔버스가 아닌 여기에 그린다.
 */
export class UILayer {
  readonly root: HTMLDivElement;

  constructor(scene: Phaser.Scene) {
    this.root = document.createElement('div');
    this.root.className = 'scene-ui';
    document.getElementById('ui')!.appendChild(this.root);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.root.remove());
  }

  el<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', html = '', parent: HTMLElement = this.root): HTMLElementTagNameMap[K] {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (html) e.innerHTML = html;
    parent.appendChild(e);
    return e;
  }

  /** 640×360 좌표로 배치 */
  place(e: HTMLElement, x: number, y: number): HTMLElement {
    e.style.left = `${x}px`;
    e.style.top = `${y}px`;
    return e;
  }

  button(label: string, onClick: () => void, className = '', parent: HTMLElement = this.root): HTMLButtonElement {
    const b = this.el('button', `btn ${className}`.trim(), label, parent);
    b.addEventListener('click', (ev) => {
      ev.stopPropagation();
      onClick();
    });
    return b;
  }
}
