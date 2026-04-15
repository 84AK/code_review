/**
 * aiEvaluator.js
 * Interface for Google Gemini 3.1 API to analyze and grade code.
 */

export async function evaluateCode(apiKey, category, referenceCode, studentCode) {
  const model = "gemini-2.5-flash"; // Stable version requested by user
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const systemPrompt = `당신은 시니어 프론트엔드 개발자이자 교육 전문가입니다. 
학생이 제출한 코드를 [정답 코드]와 비교하여 정밀하게 분석하고 피드백을 제공하세요.

[분석 기준]
1. 메인 코드 판단: 제출된 파일 중 가장 완성도가 높거나 최신본으로 보이는 '메인 코드'를 스스로 식별하여 분석하세요. (예: index.html이 포함된 최신 버전의 폴더 등)
2. 완성도: 모든 필수 기능(화면 전환, 게임 로직 등)이 구현되었는가?
3. 코드 품질: 자바스크립트 로직이 효율적인가? (변수 명명, 함수 분리 등)
4. UI/UX: 정답 코드의 디자인을 얼마나 잘 재현했거나, 더 발전시켰는가?
5. 기능성: 에러 없이 실제로 잘 작동하는가?

[결과 포맷]
반드시 아래와 같은 JSON 형식으로만 응답하세요.
{
  "score": 100점 만점 점수 (숫자),
  "grade": "A", "B", "C", "D" 중 하나,
  "analysis": "분석 결과 요약 (한국어)",
  "feedback": "학생에게 주는 구체적인 피드백 (한국어, 마크다운 지원)",
  "improvements": ["개선점 1", "개선점 2"]
}`;

  const userPrompt = `카테고리: ${category}

[정답 코드 (참고용)]
${JSON.stringify(referenceCode)}

[학생 제출 코드]
${JSON.stringify(studentCode)}

분석을 시작해주세요.`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: systemPrompt + "\n\n" + userPrompt
        }]
      }],
      generationConfig: {
        response_mime_type: "application/json"
      }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "AI 분석 중 오류가 발생했습니다.");
  }

  const data = await response.json();
  const resultText = data.candidates[0].content.parts[0].text;
  return JSON.parse(resultText);
}
