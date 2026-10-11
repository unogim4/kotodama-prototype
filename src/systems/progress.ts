import { settings } from './settings';

/** 챕터(행) 돌파 기록 — 브라우저에 저장 */
const KEY = 'kotodama-progress';
const cleared = new Set<number>();
/** 스토리로 처음 해금한 무기 (이후 런에선 레벨업 선택지에 등장) */
const arms = new Set<string>(['ofuda']);

export function loadProgress(): void {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}') as { cleared?: number[]; arms?: string[] };
    (saved.cleared ?? []).forEach((i) => cleared.add(i));
    (saved.arms ?? []).forEach((a) => arms.add(a));
  } catch {
    // 저장소를 못 쓰면 기록 없이
  }
}

function save(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ cleared: [...cleared], arms: [...arms] }));
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

export function unlockArms(id: string): void {
  arms.add(id);
  save();
}

export function unlockedArms(): string[] {
  return [...arms];
}

export function clearedCount(): number {
  return cleared.size;
}
