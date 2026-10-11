import type { PalKey } from '../art/pixel';

/** 보스 외형 (코드로 찍는 48×48 요괴의 재료) */
export interface BossLook {
  /** beast: 털짐승형 / wall: 누리카베 / wheel: 와뉴도 */
  body: 'beast' | 'wall' | 'wheel';
  fur: PalKey;
  furLight: PalKey;
  furDark: PalKey;
  face: PalKey;
  faceShade: PalKey;
  ears: 'round' | 'pointy' | 'none';
  horns: 0 | 1 | 2;
  nose: 'none' | 'long' | 'beak';
  eyes: 'two' | 'one';
  extra: 'none' | 'plate' | 'wings' | 'tails' | 'hair' | 'bolt' | 'fire';
}

export interface BossDef {
  id: string;
  name: string;
  jp: string;
  /** 등장 문구 */
  intro: string;
  look: BossLook;
  /** 처치 시 마지막 언령 (이 행까지 배운 글자로 만든 단어) */
  finalWord: { kana: string; kanji: string; meaning: string; note: string };
}

/** 행 순서대로 10종 — 퀴즈 구조(3페이즈 + 발악)는 공통 */
export const BOSSES: BossDef[] = [
  {
    id: 'yamabiko',
    name: '야마비코',
    jp: '山彦',
    intro: '메아리 요괴가 길을 막는다 — 외치는 소리를 알아들어라',
    look: { body: 'beast', fur: 'B', furLight: 'b', furDark: 'd', face: 'S', faceShade: 's', ears: 'round', horns: 0, nose: 'none', eyes: 'two', extra: 'none' },
    finalWord: { kana: 'いう', kanji: '言う', meaning: '말하다', note: "언령(言霊)의 '言'" },
  },
  {
    id: 'kappa',
    name: '갓파',
    jp: '河童',
    intro: '머리 접시에 물을 담은 물가의 요괴',
    look: { body: 'beast', fur: 'E', furLight: 'E', furDark: 'e', face: 'E', faceShade: 'e', ears: 'none', horns: 0, nose: 'beak', eyes: 'two', extra: 'plate' },
    finalWord: { kana: 'こえ', kanji: '声', meaning: '목소리', note: '말은 목소리에 실려 힘이 된다' },
  },
  {
    id: 'satori',
    name: '사토리',
    jp: '覚',
    intro: '마음을 읽는 산속 요괴 — 머뭇거림까지 꿰뚫어 본다',
    look: { body: 'beast', fur: 'Y', furLight: 'W', furDark: 'y', face: 'S', faceShade: 's', ears: 'pointy', horns: 0, nose: 'none', eyes: 'two', extra: 'hair' },
    finalWord: { kana: 'うそ', kanji: '嘘', meaning: '거짓말', note: '사토리 앞에선 거짓말이 통하지 않는다' },
  },
  {
    id: 'tengu',
    name: '텐구',
    jp: '天狗',
    intro: '긴 코의 산신 — 높은 곳에서 내려다본다',
    look: { body: 'beast', fur: 'n', furLight: 'N', furDark: 'K', face: 'R', faceShade: 'r', ears: 'none', horns: 0, nose: 'long', eyes: 'two', extra: 'wings' },
    finalWord: { kana: 'たかい', kanji: '高い', meaning: '높다', note: '텐구의 콧대만큼' },
  },
  {
    id: 'nurikabe',
    name: '누리카베',
    jp: '塗壁',
    intro: '밤길을 가로막는 보이지 않는 벽',
    look: { body: 'wall', fur: 'Y', furLight: 'W', furDark: 'y', face: 'Y', faceShade: 'y', ears: 'none', horns: 0, nose: 'none', eyes: 'two', extra: 'none' },
    finalWord: { kana: 'あな', kanji: '穴', meaning: '구멍', note: '벽에 구멍이 뚫렸다' },
  },
  {
    id: 'bakeneko',
    name: '바케네코',
    jp: '化け猫',
    intro: '꼬리가 둘로 갈라진 둔갑 고양이',
    look: { body: 'beast', fur: 'P', furLight: 'L', furDark: 'p', face: 'L', faceShade: 'W', ears: 'pointy', horns: 0, nose: 'none', eyes: 'two', extra: 'tails' },
    finalWord: { kana: 'ねこ', kanji: '猫', meaning: '고양이', note: '둔갑이 풀리면 그냥 고양이' },
  },
  {
    id: 'oni',
    name: '오니',
    jp: '鬼',
    intro: '뿔 달린 붉은 도깨비 — 쇠몽둥이를 휘두른다',
    look: { body: 'beast', fur: 'R', furLight: 'R', furDark: 'r', face: 'R', faceShade: 'r', ears: 'none', horns: 2, nose: 'none', eyes: 'two', extra: 'hair' },
    finalWord: { kana: 'まめ', kanji: '豆', meaning: '콩', note: '세쓰분에는 콩을 던져 오니를 쫓는다' },
  },
  {
    id: 'yamauba',
    name: '야마우바',
    jp: '山姥',
    intro: '깊은 산에 사는 백발의 노파',
    look: { body: 'beast', fur: 'w', furLight: 'W', furDark: 'v', face: 's', faceShade: 'd', ears: 'none', horns: 0, nose: 'none', eyes: 'two', extra: 'hair' },
    finalWord: { kana: 'やま', kanji: '山', meaning: '산', note: '야마우바는 산으로 돌아간다' },
  },
  {
    id: 'raiju',
    name: '라이쥬',
    jp: '雷獣',
    intro: '번개와 함께 떨어지는 천둥 짐승',
    look: { body: 'beast', fur: 'G', furLight: 'L', furDark: 'g', face: 'W', faceShade: 'w', ears: 'pointy', horns: 0, nose: 'none', eyes: 'two', extra: 'bolt' },
    finalWord: { kana: 'そら', kanji: '空', meaning: '하늘', note: '라이쥬는 하늘로 돌아간다' },
  },
  {
    id: 'wanyudo',
    name: '와뉴도',
    jp: '輪入道',
    intro: '불타는 수레바퀴에 박힌 거대한 얼굴',
    look: { body: 'wheel', fur: 'B', furLight: 'b', furDark: 'd', face: 'S', faceShade: 's', ears: 'none', horns: 0, nose: 'none', eyes: 'two', extra: 'fire' },
    finalWord: { kana: 'ほん', kanji: '本', meaning: '책', note: '모든 언령은 다시 서고의 책으로' },
  },
];
