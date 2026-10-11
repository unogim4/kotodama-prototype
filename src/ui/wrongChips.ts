import type { UILayer } from './UILayer';
import { run } from '../systems/run';
import { learnedKana } from '../systems/quiz';
import { tts } from '../systems/tts';

/** 이번 판에 틀린 글자 정리 (눌러서 다시 듣기) */
export function wrongChips(ui: UILayer, parent: HTMLElement): void {
  const wrong = learnedKana()
    .filter((k) => run.wrong[k.kana])
    .sort((a, b) => run.wrong[b.kana] - run.wrong[a.kana])
    .slice(0, 8);
  if (wrong.length === 0) {
    ui.el('p', '', '틀린 글자는 없었다!', parent);
    return;
  }
  ui.el('p', '', '틀린 글자 — 눌러서 다시 듣기', parent);
  const row = ui.el('div', 'row', '', parent);
  for (const k of wrong) {
    const chip = ui.el('div', 'wrong-chip', '', row);
    chip.innerHTML = `<span class="kana">${k.kana}</span><b>${k.ko}</b><small>×${run.wrong[k.kana]}</small>`;
    chip.addEventListener('click', () => void tts.speak(k.kana));
  }
}
