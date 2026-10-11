import type { WeaponId } from '../data/weapons';

/** 업그레이드로 커지는 능력치 (배율은 1 = 기본) */
export interface Build {
  /** 무기 피해 배율 */
  damage: number;
  /** 무기 재사용 대기 배율 (작을수록 빠름) */
  cooldown: number;
  /** 부적 장수 · 방울 연속 울림 · 여우불 개수 */
  count: number;
  /** 부적 관통 횟수 */
  pierce: number;
  /** 방울 범위 · 여우불 회전 반경 배율 */
  area: number;
  /** 여우불 회전 속도 배율 */
  orbitSpeed: number;
  /** 이동 속도 배율 */
  moveSpeed: number;
  /** 구슬 흡수 범위 배율 */
  magnet: number;
  maxHp: number;
}

export function freshBuild(weapon: WeaponId | null): Build {
  return {
    damage: 1,
    cooldown: 1,
    count: weapon === 'kitsunebi' ? 2 : 1,
    pierce: 0,
    area: 1,
    orbitSpeed: 1,
    moveSpeed: 1,
    magnet: 1,
    maxHp: 100,
  };
}

/** 한 판(런) 동안 유지되는 상태 */
export const run = {
  /** 지금 도전 중인 챕터 (행 번호, 0 = あ행) */
  chapter: 0,
  /** 고른 최초 무기 */
  weapon: null as WeaponId | null,
  /** 서고에서 익힌 글자 */
  learned: [] as string[],
  /** 퀴즈에서 틀린 글자와 횟수 (같은 런에서 더 자주 출제) */
  wrong: {} as Record<string, number>,
  /** 습격 방 번호 (1부터) */
  room: 1,
  level: 1,
  xp: 0,
  hp: 100,
  build: freshBuild(null),
  /** 받은 업그레이드 id 목록 */
  upgrades: [] as string[],
};

/** 습격 1부터 다시: 무기·익힌 글자·틀린 기록은 남기고 전투 상태만 초기화 */
export function resetRaid(): void {
  run.room = 1;
  run.level = 1;
  run.xp = 0;
  run.build = freshBuild(run.weapon);
  run.hp = run.build.maxHp;
  run.upgrades = [];
}

/** 서고부터 완전히 새로 */
export function resetRun(): void {
  run.weapon = null;
  run.learned = [];
  run.wrong = {};
  resetRaid();
}
