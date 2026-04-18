/**
 * Reference codes for MBTI and POSE categories.
 * These are used by the AI to compare student submissions.
 */

export const referenceCodes = {
  MBTI: {
    description: "고등학교 급식 성향 MBTI 테스트 웹사이트. 12개 문항, 결과 페이지, 애니메이션 포함.",
    files: {
      "index.html": `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>고등학교 급식 만족도 연구 | MBTI 테스트</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <main class="app">
    <section id="start-screen" class="screen active">
      <h1>우리 학교 급식 성향은?<br><span>MBTI 만족도 연구</span></h1>
      <button id="start-btn" class="primary-btn">테스트 시작하기</button>
    </section>
    <section id="question-screen" class="screen">
      <div id="progress-fill"></div>
      <h2 id="question-text">질문...</h2>
      <div id="answer-buttons"></div>
    </section>
    <section id="result-screen" class="screen">
      <h3 id="result-type">TYPE</h3>
      <h2 id="result-title">나의 급식 성향 결과</h2>
      <p id="result-description">결과 설명...</p>
      <button id="restart-btn">다시 하기</button>
    </section>
  </main>
  <script src="script.js"></script>
</body>
</html>`,
      "script.js": `const questions = [/* 12 items */];
const results = { ISTJ: { ... }, ... };
// Function showScreen, startTest, renderQuestion, handleAnswer, showResult
// Uses scores object to track E/I, S/N, T/F, J/P`,
      "style.css": `:root { --primary-color: #0052FF; }
.screen { display: none; border-radius: 24px; padding: 48px; }
.screen.active { display: flex; animation: fadeIn 0.5s ease-out; }`
    }
  },
  POSE: {
    description: "Teachable Machine Pose 모델을 활용한 웹 게임. 캠 제어, 포즈 인식, 게임 로직 포함.",
    baselines: {
      airplane: {
        title: "Pose Flyer (비행기 게임)",
        features: ["장애물 회피", "점수/목숨 시스템", "Canvas 기반 비행기 애니메이션", "Teachable Machine 연동"],
        structure: "requestAnimationFrame 루프, CustomEvent('pose:direction') 활용 방향 제어"
      },
      car: {
        title: "Pose Racer (자동차 레이싱)",
        features: ["차선 변경 로직", "장애물(적 차) 스폰", "3개 차선 고정", "Left/Right 포즈 중심 제어"],
        structure: "laneX 함수를 통한 좌표 계산, 쿨다운 시스템(canChangeLane)"
      },
      snake: {
        title: "Pose Snake (스네이크 게임)",
        features: ["그리드 기반 이동", "먹이 스폰", "자기 충돌 검사", "4방향 포즈 제어"],
        structure: "setInterval 또는 setTimeout 기반 고정 속도 루프"
      }
    },
    evaluation_rules: "제출된 코드가 위 3가지 베이스라인 샘플(airplane_game.html, car_racing_game.html, snake_game.html)과 내용이 거의 동일하거나 아무런 수정 없이 그대로 제출된 경우, '독창성' 감점 요인으로 반영하고 낮은 등급(C~D)을 부여할 것. 창의적인 UI 변경, 새로운 기능 추가, 로직 개선이 있을 경우에만 높은 점수를 부여함."
  }
};
