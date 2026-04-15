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
    files: {
      "airplane_game.html": `<!-- Pose Fly Game with Canvas -->
<script src="https://cdn.jsdelivr.net/npm/@teachablemachine/pose@0.8/dist/teachablemachine-pose.min.js"></script>
<script>
  async function loadModel() { ... }
  async function startPoseCamera() { ... }
  function gameUpdate() { ... } // Canvas animation loop
  // Pose Controller Module + Game Logic
</script>`,
      "car_racing_game.html": `<!-- Top-view Car Racing Game -->
// Similar to airplane_game but with lane changing logic (Left/Right poses only)`
    }
  }
};
