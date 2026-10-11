/**
 * 브라우저 내장 음성 합성(Web Speech API)으로 일본어를 읽는다.
 * 프로토타입용이며, 이후 AI 보이스 녹음 파일로 교체할 예정.
 */

// 자연스러운 순서대로 선호하는 음성 (Edge의 Nanami가 가장 자연스럽다)
const PREFERRED = [/Nanami/i, /Google/i, /Keita|Aoi|Daichi|Mayu|Naoki|Shiori/i, /Haruka|Ayumi|Ichiro|Sayaka/i];

class Speaker {
  private voice: SpeechSynthesisVoice | null = null;
  private readonly ready: Promise<void>;

  constructor() {
    this.ready = this.loadVoice();
  }

  private loadVoice(): Promise<void> {
    if (!('speechSynthesis' in window)) return Promise.resolve();

    return new Promise((resolve) => {
      const pick = (): boolean => {
        const voices = speechSynthesis.getVoices();
        if (voices.length === 0) return false;
        const ja = voices.filter((v) => v.lang.replace('_', '-').toLowerCase().startsWith('ja'));
        this.voice = PREFERRED.map((re) => ja.find((v) => re.test(v.name))).find(Boolean) ?? ja[0] ?? null;
        resolve();
        return true;
      };
      if (pick()) return;
      speechSynthesis.addEventListener('voiceschanged', () => pick());
      // 음성 목록이 끝내 오지 않는 환경 대비
      setTimeout(resolve, 2000);
    });
  }

  /** 일본어 음성이 있으면 true (loadVoice 이후 의미 있음) */
  async isAvailable(): Promise<boolean> {
    await this.ready;
    return this.voice !== null;
  }

  async voiceName(): Promise<string | null> {
    await this.ready;
    return this.voice?.name ?? null;
  }

  /** 읽기에 성공하면 true, 일본어 음성이 없으면 false */
  async speak(text: string, rate = 0.8): Promise<boolean> {
    await this.ready;
    if (!this.voice) return false;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.voice = this.voice;
    u.lang = this.voice.lang;
    u.rate = rate;
    speechSynthesis.speak(u);
    return true;
  }
}

export const tts = new Speaker();
