# 언령(言霊) 로그라이크 — kotodama-roguelike

한국인 학습자를 위한 일본어 학습 로그라이크.
학습(서고) → 복습(전투) → 시험(보스)으로 구성된 던전을 돌파하며 일본어를 익힌다.

- 참고 게임: Hades, Vampire Survivors
- 현재 단계: 히라가나 46자 10행 챕터 — 챕터마다 서고 → 무기 → 습격 ×3 → 보스 (F2 사용자 설정으로 바로 이동)
- **본편 기획서**: [본편기획서.md](본편기획서.md) — 스토리·지역 맵·언령술/가호/무기 진화
- **스토리**: [스토리.md](스토리.md) — 문자가 사라진 세계, 1부 히라가나 · 2부 카타카나
- 프로토타입 기획서: [기획서.md](기획서.md)
- 제작도 (진행 현황 트리): [제작도.md](제작도.md)

## 바로 플레이

👉 **https://unogim4.github.io/kotodama-roguelike/** (main에 푸시하면 자동 배포)

## 실행 방법

```bash
npm install
npm run dev
```

브라우저에서 http://localhost:5173 을 연다.
일본어 음성(TTS)은 **Edge**(Nanami 음성) 또는 **Chrome**(Google 日本語)에서 가장 잘 나온다.

## 기술 스택

- Phaser 3 + TypeScript + Vite
- 도트는 코드로 찍어 런타임에 텍스처로 생성 (`src/art`)
- 학습 글자: Klee One(교과서체), UI: Galmuri — 모두 OFL 라이선스
