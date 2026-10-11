export interface Kana {
  /** 히라가나 */
  kana: string;
  /** 로마자 표기 */
  romaji: string;
  /** 한글 발음 */
  ko: string;
}

/** あ행 */
export const ROW_A: Kana[] = [
  { kana: 'あ', romaji: 'a', ko: '아' },
  { kana: 'い', romaji: 'i', ko: '이' },
  { kana: 'う', romaji: 'u', ko: '우' },
  { kana: 'え', romaji: 'e', ko: '에' },
  { kana: 'お', romaji: 'o', ko: '오' },
];
