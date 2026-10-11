/**
 * 두벌식 자판 위치(KeyboardEvent.code)로 한글을 조합한다.
 * 한/영 상태와 상관없이 같은 키를 누르면 같은 글자가 된다 (영문 상태 dn = 우).
 * 입력란에 포커스를 두지 않으므로 운영체제 입력기(IME)를 거치지 않는다.
 */

const KEY_TO_JAMO: Record<string, string> = {
  KeyQ: 'ㅂ', KeyW: 'ㅈ', KeyE: 'ㄷ', KeyR: 'ㄱ', KeyT: 'ㅅ', KeyY: 'ㅛ', KeyU: 'ㅕ', KeyI: 'ㅑ', KeyO: 'ㅐ', KeyP: 'ㅔ',
  KeyA: 'ㅁ', KeyS: 'ㄴ', KeyD: 'ㅇ', KeyF: 'ㄹ', KeyG: 'ㅎ', KeyH: 'ㅗ', KeyJ: 'ㅓ', KeyK: 'ㅏ', KeyL: 'ㅣ',
  KeyZ: 'ㅋ', KeyX: 'ㅌ', KeyC: 'ㅊ', KeyV: 'ㅍ', KeyB: 'ㅠ', KeyN: 'ㅜ', KeyM: 'ㅡ',
};

const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
const JUNG = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ';

/** 초성 + 중성 한 글자를 받는 조합기 (あ~ん 발음은 모두 받침 없는 한 음절) */
export class HangulSyllableTyper {
  private cho: string | null = null;

  /** 처리한 키면 true. 음절이 완성되면 onSyllable 호출 */
  handle(e: KeyboardEvent, onChange: (preview: string) => void, onSyllable: (syllable: string) => void): boolean {
    if (e.code === 'Backspace') {
      this.cho = null;
      onChange('');
      return true;
    }
    const jamo = KEY_TO_JAMO[e.code];
    if (!jamo) return false;
    // Shift로 된소리 (ㄲ ㄸ ㅃ ㅆ ㅉ)
    const shifted = e.shiftKey ? ({ ㄱ: 'ㄲ', ㄷ: 'ㄸ', ㅂ: 'ㅃ', ㅅ: 'ㅆ', ㅈ: 'ㅉ' } as Record<string, string>)[jamo] ?? jamo : jamo;

    if (CHO.includes(shifted)) {
      this.cho = shifted;
      onChange(shifted);
      return true;
    }
    // 모음: 초성이 없으면 'ㅇ'으로 본다 (아·이·우·에·오)
    const cho = CHO.indexOf(this.cho ?? 'ㅇ');
    const jung = JUNG.indexOf(shifted);
    this.cho = null;
    const syllable = String.fromCharCode(0xac00 + (cho * 21 + jung) * 28);
    onChange(syllable);
    onSyllable(syllable);
    return true;
  }

  reset(): void {
    this.cho = null;
  }
}
