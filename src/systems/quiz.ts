import { ROW_A, Kana } from '../data/kana';
import { run } from './run';

/**
 * sound: 소리를 듣고 글자 고르기 / read: 글자를 보고 한글 발음 고르기
 */
export type QuizKind = 'sound' | 'read';

export interface Quiz {
  kind: QuizKind;
  answer: Kana;
  /** 보기 (정답 포함, 섞임) */
  choices: Kana[];
}

/** 익힌 글자 풀 (서고를 거치지 않았으면 あ행 전체) */
function pool(): Kana[] {
  const learned = ROW_A.filter((k) => run.learned.includes(k.kana));
  return learned.length >= 2 ? learned : ROW_A;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 틀린 글자일수록 더 자주 나온다 (가중치 1 + 틀린 횟수 × 2) */
function pickAnswer(kanas: Kana[]): Kana {
  const weights = kanas.map((k) => 1 + (run.wrong[k.kana] ?? 0) * 2);
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < kanas.length; i++) {
    r -= weights[i];
    if (r <= 0) return kanas[i];
  }
  return kanas[kanas.length - 1];
}

/** soundAvailable이 false면(일본어 음성 없음) 글자→발음 문제만 낸다 */
export function makeQuiz(soundAvailable: boolean): Quiz {
  const kanas = pool();
  const answer = pickAnswer(kanas);
  const kind: QuizKind = soundAvailable && Math.random() < 0.5 ? 'sound' : 'read';
  // 보기는 최대 5개 (あ행은 전부)
  const others = shuffle(kanas.filter((k) => k !== answer)).slice(0, 4);
  return { kind, answer, choices: shuffle([answer, ...others]) };
}

export function recordAnswer(kana: Kana, correct: boolean): void {
  if (!correct) run.wrong[kana.kana] = (run.wrong[kana.kana] ?? 0) + 1;
}
