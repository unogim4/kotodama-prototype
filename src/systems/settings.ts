import type { WeaponId } from '../data/weapons';

/** 사용자 설정 모드 (테스트·연습용). 브라우저에 기억해 둔다 */
export const settings = {
  /** 무적: 피해를 받지 않는다 */
  god: false,
  /** 바로 이동할 때 쓸 무기 */
  weapon: 'ofuda' as WeaponId,
  /** 바로 이동할 때 미리 받아 둘 강화 수 */
  upgrades: 0,
};

const KEY = 'kotodama-settings';

export function loadSettings(): void {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    Object.assign(settings, saved);
  } catch {
    // 저장소를 못 쓰는 환경이면 기본값
  }
}

export function saveSettings(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // 무시
  }
}
