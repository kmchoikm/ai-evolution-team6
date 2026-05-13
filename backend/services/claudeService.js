/**
 * Claude API 연동 모듈 (v2.0)
 * - getAiRecommendations     : 기본 Q1~Q7 기반 추천
 * - getAiRaceRecommendations : 대회 코스 기반 추천 (Feature 5)
 * - getAiSocksRecommendations: 양말 색상 추천 (Feature 2)
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

function buildCandidateList(candidates) {
  return candidates
    .map(
      (s, i) =>
        `[${i + 1}] goods_no: ${s.goods_no} | ${s.brand} ${s.goods_name} | ` +
        `가격: ${s.price.toLocaleString()}원 | 발볼: ${s.width} | 쿠션: ${s.cushion}/5 | ` +
        `무게: ${s.weight}/5 | 거리: ${s.distance} | 통기성: ${s.breathability}/5 | ` +
        `착화감: ${s.fit}/5 | 한줄요약: ${s.summary}`
    )
    .join('\n');
}

async function callClaude(prompt, maxTokens = 1024) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const message = await client.messages.create(
      {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      },
      { signal: controller.signal }
    );
    clearTimeout(timer);
    const raw = message.content[0].text.trim();
    const jsonStr = raw.replace(/^```[a-z]*\n?/i, '').replace(/```$/i, '').trim();
    return JSON.parse(jsonStr);
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') throw new Error('CLAUDE_TIMEOUT');
    throw err;
  }
}

// ============================================================
// Feature: Q1~Q7 기반 추천
// ============================================================

async function getAiRecommendations(userProfile, candidates) {
  const prompt = `당신은 데이터 기반 러닝화 전문 추천 AI입니다. 아래 사용자 프로파일과 후보 러닝화 목록을 분석하여 가장 적합한 상위 3개를 선정하고, 각각에 대해 개인화된 추천 이유를 작성하세요.

## 사용자 프로파일
${buildUserSummary(userProfile)}

## 후보 러닝화 (총 ${candidates.length}개)
${buildCandidateList(candidates)}

## 출력 규칙
- 반드시 JSON 배열만 출력하세요 (코드블록, 설명 텍스트 없이)
- 배열 요소 수: 정확히 3개 (후보가 3개 미만이면 전체)
- 각 요소 형식: {"rank": 1, "goods_no": "...", "reason": "..."}
- reason: 사용자 프로파일(발볼, 쿠션, 거리, 우선순위, 메모)을 근거로 2~3문장, 한국어로 작성
- 부상 방지 관점을 반드시 포함하세요
- 뻔한 홍보 문구("이 제품은 훌륭합니다") 금지`;

  return callClaude(prompt, 1024);
}

// ============================================================
// Feature 5: 대회 코스 기반 추천
// ============================================================

async function getAiRaceRecommendations(race, candidates, userProfile) {
  const raceSummary = [
    `- 대회명: ${race.race_name}`,
    `- 코스 유형: ${race.course_type === 'full' ? '풀코스 (42.195km)' : '하프코스 (21.0975km)'}`,
    `- 평균 기온: ${race.avg_temp_celsius}°C`,
    `- 노면: ${race.surface_type === 'asphalt' ? '아스팔트' : '혼합 노면'}`,
    `- 누적 고도: ${race.elevation_gain_m}m`,
    `- 코스 난이도: ${race.difficulty}/5`,
    `- 코스 특징: ${race.course_summary}`,
    `- 신발 선택 시 우선 고려: ${race.shoe_priority_hint}`,
  ].join('\n');

  const userSection = userProfile
    ? `\n## 사용자 개인 프로필 (추가 개인화)\n${buildUserSummary(userProfile)}`
    : '';

  const prompt = `당신은 마라톤 코스 분석 전문 러닝화 추천 AI입니다. 아래 대회 코스 정보를 분석하여 해당 코스에 가장 적합한 상위 3개 러닝화를 선정하고, 코스 특성을 근거로 한 추천 이유를 작성하세요.

## 대회 코스 정보
${raceSummary}${userSection}

## 후보 러닝화 (총 ${candidates.length}개)
${buildCandidateList(candidates)}

## 출력 규칙
- 반드시 JSON 배열만 출력하세요 (코드블록, 설명 텍스트 없이)
- 배열 요소 수: 정확히 3개 (후보가 3개 미만이면 전체)
- 각 요소 형식: {"rank": 1, "goods_no": "...", "reason": "..."}
- reason: 코스 특성(고도, 기온, 노면, 난이도)을 근거로 2~3문장, 한국어로 작성
- 부상 방지 관점 및 코스 특화 이유 반드시 명시
- 뻔한 홍보 문구 금지`;

  return callClaude(prompt, 1024);
}

// ============================================================
// Feature 2: 양말 색상 추천
// ============================================================

async function getAiSocksRecommendations(shoeData) {
  const prompt = `당신은 색상 이론과 러닝 패션 전문가입니다. 아래 러닝화 색상 정보를 기반으로 어울리는 양말 색상 3가지를 추천해 주세요.

## 러닝화 정보
- 브랜드 / 모델: ${shoeData.brand} ${shoeData.goods_name}
- 주조색: ${shoeData.main_color || '정보 없음'}
- 포인트 색상: ${shoeData.accent_color || '정보 없음'}

## 출력 규칙
- 반드시 JSON 배열만 출력하세요 (코드블록 없이)
- 배열 요소 수: 정확히 3개
- 각 요소 형식: {"color_name": "...", "hex_code": "#RRGGBB", "reason": "..."}
- reason: 색상 이론 근거로 1~2문장, 한국어로 작성
- 세 가지 색상은 각각 무채색 / 보색 / 유사색 등 서로 다른 스타일로 제안`;

  return callClaude(prompt, 512);
}

module.exports = { getAiRecommendations, getAiRaceRecommendations, getAiSocksRecommendations };
