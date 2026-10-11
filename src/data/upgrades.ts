import type { WeaponId } from './weapons';
import type { Build } from '../systems/run';

export interface UpgradeDef {
  id: string;
  name: string;
  desc: string;
  icon: string;
  /** 이 무기일 때만 등장 (없으면 공통) */
  weapon?: WeaponId;
  /** 최대 획득 횟수 */
  max: number;
  apply: (b: Build, heal: (amount: number) => void) => void;
}

export const UPGRADES: UpgradeDef[] = [
  // 공통
  { id: 'power', name: '언령 강화', desc: '무기 피해 +25%', icon: '💥', max: 5, apply: (b) => (b.damage *= 1.25) },
  { id: 'haste', name: '빠른 영창', desc: '공격 간격 -15%', icon: '⚡', max: 5, apply: (b) => (b.cooldown *= 0.85) },
  { id: 'swift', name: '가벼운 발걸음', desc: '이동 속도 +12%', icon: '👣', max: 4, apply: (b) => (b.moveSpeed *= 1.12) },
  {
    id: 'vigor',
    name: '단단한 몸',
    desc: '최대 체력 +20, 20 회복',
    icon: '❤️',
    max: 5,
    apply: (b, heal) => {
      b.maxHp += 20;
      heal(20);
    },
  },
  { id: 'magnet', name: '언령 끌림', desc: '구슬 흡수 범위 +40%', icon: '🧲', max: 3, apply: (b) => (b.magnet *= 1.4) },
  // 부적
  { id: 'ofuda-count', name: '부적 한 장 더', desc: '한 번에 던지는 부적 +1', icon: '📜', weapon: 'ofuda', max: 4, apply: (b) => (b.count += 1) },
  { id: 'ofuda-pierce', name: '꿰뚫는 부적', desc: '부적이 요괴 1마리 더 관통', icon: '🎯', weapon: 'ofuda', max: 3, apply: (b) => (b.pierce += 1) },
  // 방울
  { id: 'suzu-area', name: '넓은 울림', desc: '방울 범위 +20%', icon: '🔔', weapon: 'suzu', max: 4, apply: (b) => (b.area *= 1.2) },
  { id: 'suzu-echo', name: '메아리', desc: '방울이 한 번 더 울린다', icon: '〰️', weapon: 'suzu', max: 2, apply: (b) => (b.count += 1) },
  // 여우불
  { id: 'fox-count', name: '여우불 하나 더', desc: '도는 여우불 +1', icon: '🦊', weapon: 'kitsunebi', max: 4, apply: (b) => (b.count += 1) },
  {
    id: 'fox-spin',
    name: '회오리 여우불',
    desc: '회전 속도 +25%, 반경 +10%',
    icon: '🌀',
    weapon: 'kitsunebi',
    max: 3,
    apply: (b) => {
      b.orbitSpeed *= 1.25;
      b.area *= 1.1;
    },
  },
];

/** 다 받은 업그레이드가 많을 때 채워 넣는 회복 */
export const HEAL_UPGRADE: UpgradeDef = {
  id: 'heal',
  name: '정화',
  desc: '체력 30 회복',
  icon: '🍵',
  max: Infinity,
  apply: (_b, heal) => heal(30),
};

/** 지금 받을 수 있는 업그레이드 중 n개를 무작위로 */
export function rollUpgrades(weapon: WeaponId | null, taken: string[], n: number): UpgradeDef[] {
  const count = (id: string) => taken.filter((t) => t === id).length;
  const pool = UPGRADES.filter((u) => (!u.weapon || u.weapon === weapon) && count(u.id) < u.max);
  const picks: UpgradeDef[] = [];
  while (picks.length < n && pool.length > 0) {
    picks.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  while (picks.length < n) picks.push(HEAL_UPGRADE);
  return picks;
}
