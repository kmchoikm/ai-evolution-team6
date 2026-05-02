/**
 * Claude API 연동 모듈
 * 필터링된 후보군 + 사용자 프로파일 → 맞춤형 추천 이유 생성
 *
 * 타임아웃: 10초 (PREMORTEM D1 대응)
 */

const Anthropic = require('@anthropic-ai/sdk');

const TIMEOUT_MS = 10_000;

const DISTANCE_KO = {
  short: '5km 이하 단거리',
  medium: '5~10km 중거리',
  long: '10~21km 장거리',
  marathon: '21km+ 마라톤',
};
const WIDTH_KO = { wide: '넓음', normal: '보통', narrow: '좁음' };
const BUDGET_KO = {
  low: '7만원 이하',
  mid: '7~12만원',
  high: '12~20만원',
  premium: '20만원 이상',
};
const PRIORITY_KO = {
  speed: '속도감/경량',
  protection: '부상 방지',
  comfort: '편안함',
  breathability: '통기성',
  design: '디자인',
};

/**
 * 사용자 프로파일 요약 텍스트 생성 (프롬프트 주입용)
 */
function buildUserSummary(profile) {
  const dist = DISTANCE_KO[profile.running_distance] || profile.running_distance;
  const width = WIDTH_KO[profile.foot_width] || profile.foot_width;
  const budget = BUDGET_KO[profile.budget] || '상관없음';
  const priorities = (profile.priorities || []).map((p) => PRIORITY_KO[p] || p).join(', ') || '없음';
  const cushion = profile.preferred_cushion ?? 3;

  let summary = `- 달리는 거리: ${dist}\n- 발볼 너비: ${width}\n- 선호 쿠션감: ${cushion}/5\n- 예산: ${budget}\n- 중요 요소: ${priorities}`;
  if (profile.free_text) {
    summary += `\n- 추가 메모: ${profile.free_text}`;
  }
  return summary;
}

/**
 * Claude API 호출하여 상위 3개 추천 + 이유 반환
 * @param {object} userProfile
 * @param {object[]} candidates - 1차 필터링된 후보 신발 (최대 10개)
 * @returns {Promise<object[]>} rank, goods_no, reason 포함 배열
 */
async function getAiRecommendations(userProfile, candidates) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const candidateList = candidates
    .map(
      (s, i) =>
        `[${i + 1}] goods_no: ${s.goods_no} | ${s.brand} ${s.goods_name} | ` +
        `가격: ${s.price.toLocaleString()}원 | 발볼: ${s.width} | 쿠션: ${s.cushion}/5 | ` +
        `무게: ${s.weight}/5 | 거리: ${s.distance} | 통기성: ${s.breathability}/5 | ` +
        `착화감: ${s.fit}/5 | 한줄요약: ${s.summary}`
    )
    .join('\n');

  const prompt = `당신은 데이터 기반 러닝화 전문 추천 AI입니다. 아래 사용자 프로파일과 후보 러닝화 목록을 분석하여 가장 적합한 상위 3개를 선정하고, 각각에 대해 개인화된 추천 이유를 작성하세요.

## 사용자 프로파일
${buildUserSummary(userProfile)}

## 후보 러닝화 (총 ${candidates.length}개)
${candidateList}

## 출력 규칙
- 반드시 JSON 배열만 출력하세요 (코드블록, 설명 텍스트 없이)
- 배열 요소 수: 정확히 3개 (후보가 3개 미만이면 전체)
- 각 요소 형식:
  {"rank": 1, "goods_no": "...", "reason": "..."}
- reason: 사용자 프로파일(발볼, 쿠션, 거리, 우선순위, 메모)을 근거로 2~3문장, 한국어로 작성
- 부상 방지 관점을 반드시 포함하세요
- 뻔한 홍보 문구("이 제품은 훌륭합니다") 금지`;

  // 10초 타임아웃 적용
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const message = await client.messages.create(
      {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      },
      { signal: controller.signal }
    );

    clearTimeout(timer);

    const raw = message.content[0].text.trim();
    // JSON 파싱 — 코드블록 래퍼 제거 방어
    const jsonStr = raw.replace(/^```[a-z]*\n?/i, '').replace(/```$/i, '').trim();
    return JSON.parse(jsonStr);
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      throw new Error('CLAUDE_TIMEOUT');
    }
    throw err;
  }
}

module.exports = { getAiRecommendations };
