import type { WeaponId } from '../data/weapons';

/** 한 판(런) 동안 유지되는 상태 */
export const run = {
  /** 고른 최초 무기 */
  weapon: null as WeaponId | null,
  /** 서고에서 익힌 글자 */
  learned: [] as string[],
};
