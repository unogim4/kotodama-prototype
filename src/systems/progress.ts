import { settings } from './settings';

/** 챕터(행) 돌파 기록 — 브라우저에 저장 */
const KEY = 'kotodama-progress';
const cleared = new Set<number>();

export function loadProgress(): void {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}') as { cleared?: number[] };
    (saved.cleared ?? []).forEach((i) => cleared.add(i));
  } catch {
    // 저장소를 못 쓰면 기록 없이
  }
}

function save(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ cleared: [...cleared] }));
  } catch {
    // 무시
  }
}

export function markCleared(chapter: number): void {
  cleared.add(chapter);
  save();
}

export function isCleared(chapter: number): boolean {
  return cleared.has(chapter);
}

/** 첫 챕터는 늘 열려 있고, 앞 챕터를 깨면 다음이 열린다 */
export function isUnlocked(chapter: number): boolean {
  return chapter === 0 || settings.unlockAll || cleared.has(chapter - 1);
}

export function clearedCount(): number {
  return cleared.size;
}
