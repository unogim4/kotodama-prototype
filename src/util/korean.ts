/** 받침 번호 (0 = 받침 없음, 8 = ㄹ). 한글 음절이 아니면 0 */
function finalConsonant(word: string): number {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return 0;
  return code % 28;
}

/** 조사 '으로/로': 받침이 없거나 ㄹ이면 '로' (방울로), 그 외는 '으로' (부적으로) */
export function withRo(word: string): string {
  const f = finalConsonant(word);
  return word + (f === 0 || f === 8 ? '로' : '으로');
}
