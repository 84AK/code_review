/**
 * aiEvaluator.js
 * Interface for Google Gemini 3.1 API to analyze and grade code.
 */

export async function evaluateCode(apiKey, category, referenceCode, studentCode) {
  const model = "gemini-3.1-flash"; 
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const systemPrompt = `당신은 시니어 프론트엔드 개발자이자 교육 전문가입니다. 
학생이 제출한 코드를 [정답 및 베이스라인 코드]와 비교하여 정밀하게 분석하고 피드백을 제공하세요.

[분석 기준]
1. 메인 코드 판단: 제출된 파일 중 가장 완성도가 높거나 최신본으로 보이는 '메인 코드'를 스스로 식별하여 분석하세요.
2. 독창성 및 샘플 복제 확인 (중요): 
   - POSE 게임의 경우, 제공된 3가지 베이스라인 샘플(Airplane, Car, Snake)과 코드가 완전히 일치하는지 확인하세요.
   - 만약 변수명, 주석, 로직, UI 디자인 등이 샘플과 거의 변화 없이 그대로 제출되었다면 '단순 복제'로 간주하여 점수를 크게 감점(C~D 등급)하십시오.
   - 창의적인 UI 수정, 새로운 게임 규칙 추가, 로직 최적화 등이 있을 경우 높은 가산점을 부여하세요.
3. 완성도: 모든 필수 기능(AI 모델 연동, 게임 로직)이 구현되었는가?
4. 코드 품질: 자바스크립트 로직이 효율적인가?
5. UI/UX: 디자인이 세련되었으며 사용자 편의성을 고려했는가?

[결과 포맷]
반드시 아래와 같은 JSON 형식으로만 응답하세요.
{
  "score": 100점 만점 점수 (숫자),
  "grade": "A", "B", "C", "D" 중 하나,
  "analysis": "분석 결과 요약 (한국어)",
  "feedback": "학생에게 주는 구체적인 피드백 (한국어, 마크다운 지원). 특히 샘플 복제인 경우 이에 대한 교육적 조언을 포함하세요.",
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
