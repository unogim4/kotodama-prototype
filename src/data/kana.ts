export interface Kana {
  /** 히라가나 */
  kana: string;
  /** 로마자 표기 */
  romaji: string;
  /** 한글 발음 (퀴즈 정답) */
  ko: string;
  /** 한글 입력에서 함께 인정하는 발음 */
  alt?: string[];
  /** 서고에서 보여주는 발음 팁 */
  tip?: string;
  /** 한글 한 음절로 입력할 수 없는 글자 (ん) — 입력 문제에서 제외 */
  noType?: boolean;
}

export interface Row {
  /** 0부터 */
  index: number;
  /** 'あ행' */
  name: string;
  kana: Kana[];
}

const k = (kana: string, romaji: string, ko: string, extra: Partial<Kana> = {}): Kana => ({ kana, romaji, ko, ...extra });

/** 기본 히라가나 46자, 10행 */
export const ROWS: Row[] = [
  { name: 'あ행', kana: [k('あ', 'a', '아'), k('い', 'i', '이'), k('う', 'u', '우', { tip: '입술을 둥글게 내밀지 않는 "우" — "으"에 가까워요' }), k('え', 'e', '에'), k('お', 'o', '오')] },
  { name: 'か행', kana: [k('か', 'ka', '카'), k('き', 'ki', '키'), k('く', 'ku', '쿠'), k('け', 'ke', '케'), k('こ', 'ko', '코')] },
  { name: 'さ행', kana: [k('さ', 'sa', '사'), k('し', 'shi', '시', { tip: '"si"가 아니라 "shi" — 혀를 살짝 뒤로 당긴 "시"' }), k('す', 'su', '스'), k('せ', 'se', '세'), k('そ', 'so', '소')] },
  {
    name: 'た행',
    kana: [
      k('た', 'ta', '타'),
      k('ち', 'chi', '치', { tip: '"ti"가 아니라 "chi" — 우리말 "치"와 비슷해요' }),
      k('つ', 'tsu', '츠', { alt: ['쓰'], tip: '"츠"와 "쓰" 사이 — 혀끝을 윗니 뒤에 대고 "ㅊ"' }),
      k('て', 'te', '테'),
      k('と', 'to', '토'),
    ],
  },
  { name: 'な행', kana: [k('な', 'na', '나'), k('に', 'ni', '니'), k('ぬ', 'nu', '누'), k('ね', 'ne', '네'), k('の', 'no', '노')] },
  {
    name: 'は행',
    kana: [
      k('は', 'ha', '하', { tip: '조사로 쓸 때는 "와"로 읽어요 (こんにちは)' }),
      k('ひ', 'hi', '히'),
      k('ふ', 'fu', '후', { tip: '입술을 살짝만 모으고 바람을 내보내는 "후"' }),
      k('へ', 'he', '헤', { tip: '조사로 쓸 때는 "에"로 읽어요' }),
      k('ほ', 'ho', '호'),
    ],
  },
  { name: 'ま행', kana: [k('ま', 'ma', '마'), k('み', 'mi', '미'), k('む', 'mu', '무'), k('め', 'me', '메'), k('も', 'mo', '모')] },
  { name: 'や행', kana: [k('や', 'ya', '야'), k('ゆ', 'yu', '유'), k('よ', 'yo', '요')] },
  { name: 'ら행', kana: [k('ら', 'ra', '라'), k('り', 'ri', '리'), k('る', 'ru', '루'), k('れ', 're', '레'), k('ろ', 'ro', '로')] },
  {
    name: 'わ행',
    kana: [
      k('わ', 'wa', '와'),
      k('を', 'wo', '오', { tip: 'お와 같은 "오" — 조사 "~을/를"로만 써요' }),
      k('ん', 'n', '응', { noType: true, tip: '혼자서는 음절이 안 되는 받침 소리 — 뒤 글자에 따라 ㄴ·ㅁ·ㅇ' }),
    ],
  },
].map((r, index) => ({ ...r, index }));

/** あ행 (예전 코드 호환) */
export const ROW_A = ROWS[0].kana;

export const ALL_KANA: Kana[] = ROWS.flatMap((r) => r.kana);

export function findKana(kana: string): Kana | undefined {
  return ALL_KANA.find((x) => x.kana === kana);
}

/** 한글 입력이 정답인지 (대체 발음 포함) */
export function matchesKo(k: Kana, typed: string): boolean {
  return typed === k.ko || (k.alt ?? []).includes(typed);
}
