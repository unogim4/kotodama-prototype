export type WeaponId = 'ofuda' | 'suzu' | 'kitsunebi';

export interface WeaponDef {
  id: WeaponId;
  /** 한국어 이름 */
  name: string;
  /** 일본어 표기 */
  jp: string;
  /** 일본어 읽기 (한글) */
  reading: string;
  /** 공격 유형 태그 */
  tag: string;
  /** 카드 설명 (HTML) */
  desc: string;
  /** 카드에 표시하는 비교용 수치 (1~5) */
  stats: { power: number; speed: number; reach: number };
  /** 전투 기본값 (습격 방 제작 때 조정) */
  base: { damage: number; cooldownMs: number; range: number };
}

export const WEAPONS: WeaponDef[] = [
  {
    id: 'ofuda',
    name: '부적',
    jp: 'お札',
    reading: '오후다',
    tag: '원거리',
    desc: '가장 가까운 요괴에게<br>부적을 날린다.',
    stats: { power: 3, speed: 3, reach: 5 },
    base: { damage: 10, cooldownMs: 700, range: 160 },
  },
  {
    id: 'suzu',
    name: '방울',
    jp: '鈴',
    reading: '스즈',
    tag: '범위',
    desc: '맑은 방울 소리가 퍼져<br>주변 요괴를 한꺼번에 친다.',
    stats: { power: 2, speed: 2, reach: 3 },
    base: { damage: 7, cooldownMs: 1000, range: 48 },
  },
  {
    id: 'kitsunebi',
    name: '여우불',
    jp: '狐火',
    reading: '기쓰네비',
    tag: '근접 회전',
    desc: '푸른 여우불이 몸 주위를 돌며<br>닿는 요괴를 태운다.',
    stats: { power: 4, speed: 4, reach: 1 },
    base: { damage: 10, cooldownMs: 350, range: 24 },
  },
];

export const STAT_LABELS: { key: keyof WeaponDef['stats']; label: string }[] = [
  { key: 'power', label: '위력' },
  { key: 'speed', label: '속도' },
  { key: 'reach', label: '사거리' },
];
