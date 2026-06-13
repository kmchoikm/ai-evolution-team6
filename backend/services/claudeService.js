/**
 * Claude API 연동 모듈
 * - 러닝화 추천 이유 생성
 * - 대회 코스 기반 추천 이유 생성
 * - 양말 색상 추천
 * - 러닝 코디 추천
 *
 * 타임아웃: 30초 (PREMORTEM D1 대응 — Sonnet 4.6 후보 10개 처리 여유)
 */

const Anthropic = require('@anthropic-ai/sdk');

const TIMEOUT_MS = 30_000;
const MODEL = 'claude-sonnet-4-6';

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
// v2.7 족형(발 모양) 한국어 매핑
const SHAPE_KO = {
  egyptian: '이집트형 (엄지발가락 최장, 발가락이 순차적으로 짧아짐 — 내전 경향, 넓은 발볼·안정화 구조 권장)',
  roman:    '로마형 (앞 3발가락 길이 유사 — 넓은 앞발부, 발볼 여유 필요)',
  greek:    '그리스형 (두 번째 발가락 최장 — 발가락 높이 공간 중요, 크기 여유 권장)',
  germanic: '게르만형 (모든 발가락 길이 비슷, 직사각형 앞발부 — 넓고 각진 toe box 필요)',
  celtic:   '켈트형 (이집트·그리스 혼합 형태 — 일반 발볼 적합)',
};

// ============================================================
// 공통 유틸
// ============================================================

/** SDK 네이티브 타임아웃 기반 Claude API 호출 */
async function callClaude(prompt, maxTokens = 1024) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  try {
    const message = await client.messages.create(
      {
        model: MODEL,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      },
      { timeout: TIMEOUT_MS }
    );
    return message.content[0].text.trim();
  } catch (err) {
    // SDK가 타임아웃·중단 시 던지는 에러 타입을 모두 포괄
    if (
      err instanceof Anthropic.APIConnectionTimeoutError ||
      err instanceof Anthropic.APIUserAbortError ||
      err.name === 'AbortError'
    ) {
      throw new Error('CLAUDE_TIMEOUT');
    }
    throw err;
  }
}

/** Claude 응답에서 JSON 파싱 — 코드블록·설명 텍스트·trailing text 방어 */
function parseJson(raw) {
  let cleaned = raw.trim();

  // 1순위: 코드블록 내부 추출
  const blockMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/i);
  if (blockMatch) cleaned = blockMatch[1].trim();

  // 2순위: 직접 파싱 시도
  try { return JSON.parse(cleaned); } catch {}

  // 3순위: 균형 괄호 탐색으로 첫 번째 완전한 JSON 배열 추출
  // (greedy 정규식은 trailing text의 ] 까지 포함해 오파싱할 수 있으므로 직접 탐색)
  const start = cleaned.indexOf('[');
  if (start !== -1) {
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = start; i < cleaned.length; i++) {
      const c = cleaned[i];
      if (escape)             { escape = false; continue; }
      if (c === '\\' && inString) { escape = true; continue; }
      if (c === '"')          { inString = !inString; continue; }
      if (inString)           { continue; }
      if (c === '[')          { depth++; }
      if (c === ']')          { depth--; if (depth === 0) return JSON.parse(cleaned.slice(start, i + 1)); }
    }
  }

  throw new SyntaxError('Claude 응답에서 JSON 배열을 찾을 수 없습니다');
}

// ============================================================
// 러닝화 추천
// ============================================================

function buildUserSummary(profile) {
  const dist = DISTANCE_KO[profile.running_distance] || profile.running_distance;
  const width = WIDTH_KO[profile.foot_width] || profile.foot_width;
  const budget = BUDGET_KO[profile.budget] || '상관없음';
  const priorities = (profile.priorities || []).map((p) => PRIORITY_KO[p] || p).join(', ') || '없음';
  const cushion = profile.preferred_cushion ?? 3;

  const shape = profile.foot_shape ? (SHAPE_KO[profile.foot_shape] || profile.foot_shape) : null;
  let summary = `- 달리는 거리: ${dist}\n- 발볼 너비: ${width}\n- 선호 쿠션감: ${cushion}/5\n- 예산: ${budget}\n- 중요 요소: ${priorities}`;
  if (shape) summary += `\n- 족형(발 모양 유형): ${shape}`;
  if (profile.free_text) summary += `\n- 추가 메모: ${profile.free_text}`;
  return summary;
}

/**
 * 러닝화 추천 — Claude API 호출하여 상위 최대 5개 추천 + 이유 반환
 * @param {object} userProfile
 * @param {object[]} candidates - 1차 필터링된 후보 신발 (최대 10개)
 * @returns {Promise<{rank: number, goods_no: string, reason: string}[]>}
 */
async function getAiRecommendations(userProfile, candidates) {
  const candidateList = candidates
    .map(
      (s, i) =>
        `[${i + 1}] goods_no: ${s.goods_no} | ${s.brand} ${s.goods_name} | ` +
        `가격: ${s.price.toLocaleString()}원 | 발볼: ${s.width} | 쿠션: ${s.cushion}/5 | ` +
        `무게: ${s.weight}/5 | 거리: ${s.distance} | 통기성: ${s.breathability}/5 | ` +
        `착화감: ${s.fit}/5 | 발모양호환: ${s.toe_fit || 'all'} | 한줄요약: ${s.summary}`
    )
    .join('\n');

  const count = Math.min(candidates.length, 5);
  const prompt = `당신은 데이터 기반 러닝화 전문 추천 AI입니다. 아래 사용자 프로파일과 후보 러닝화 목록을 분석하여 가장 적합한 상위 ${count}개를 선정하고, 각각에 대해 개인화된 추천 이유를 작성하세요.

## 사용자 프로파일
${buildUserSummary(userProfile)}

## 후보 러닝화 (총 ${candidates.length}개)
${candidateList}

## 출력 규칙
- 반드시 JSON 배열만 출력하세요 (코드블록, 설명 텍스트 없이)
- 배열 요소 수: 정확히 ${count}개 (후보가 ${count}개 미만이면 전체)
- 각 요소 형식: {"rank": 1, "goods_no": "...", "reason": "..."}
- reason: 사용자 프로파일(발볼, 쿠션, 거리, 우선순위, 메모)을 근거로 2~3문장, 한국어로 작성
- 부상 방지 관점을 반드시 포함하세요
- 뻔한 홍보 문구("이 제품은 훌륭합니다") 금지
- 동일 브랜드·모델명의 제품은 색상이 달라도 중복 선정 금지 (가장 적합한 1개만 선정)`;

  const raw = await callClaude(prompt);
  return parseJson(raw);
}

// ============================================================
// 대회 코스 기반 추천
// ============================================================

/**
 * 대회 코스 기반 러닝화 추천
 * @param {object} race - Races 시트의 대회 정보
 * @param {object[]} candidates - 1차 필터링된 후보 신발
 * @param {object|null} userProfile - 선택적 개인화 프로파일
 * @returns {Promise<{rank: number, goods_no: string, reason: string}[]>}
 */
async function getRaceRecommendations(race, candidates, userProfile) {
  const candidateList = candidates
    .map(
      (s, i) =>
        `[${i + 1}] goods_no: ${s.goods_no} | ${s.brand} ${s.goods_name} | ` +
        `가격: ${s.price.toLocaleString()}원 | 쿠션: ${s.cushion}/5 | 무게: ${s.weight}/5 | ` +
        `발볼: ${s.width} | 거리: ${s.distance} | 통기성: ${s.breathability}/5`
    )
    .join('\n');

  const userSection = userProfile
    ? `\n## 추가 개인 조건\n${buildUserSummary(userProfile)}`
    : '';

  const count = Math.min(candidates.length, 5);
  const prompt = `당신은 마라톤 대회 코스 분석 전문 AI입니다. 아래 대회 코스 정보를 바탕으로 가장 적합한 러닝화 ${count}개를 선정하고 추천 이유를 작성하세요.

## 대회 코스 정보
- 대회명: ${race.race_name}
- 코스 구분: ${race.course_type === 'full' ? '풀 마라톤' : '하프 마라톤'}
- 평균 기온: ${race.avg_temp_celsius}°C
- 노면: ${race.surface_type}
- 누적 고도: ${race.elevation_gain_m}m
- 난이도: ${race.difficulty}/5
- 코스 요약: ${race.course_summary}
- 권장 신발 키워드: ${race.shoe_priority_hint}
${userSection}

## 후보 러닝화 (총 ${candidates.length}개)
${candidateList}

## 출력 규칙
- 반드시 JSON 배열만 출력하세요 (코드블록 없이)
- 배열 요소 수: 정확히 ${count}개
- 각 요소 형식: {"rank": 1, "goods_no": "...", "reason": "..."}
- reason: 코스 특성(기온·노면·난이도·고도)과 신발 스펙을 연결한 2~3문장 한국어
- 부상 방지 관점 필수 포함`;

  const raw = await callClaude(prompt);
  return parseJson(raw);
}

// ============================================================
// 양말 색상 추천
// ============================================================

/**
 * 신발 색상 기반 양말 색상 3가지 추천
 * @param {string} mainColor - 신발 주조색
 * @param {string} accentColor - 신발 포인트색 (선택)
 * @returns {Promise<{color_name: string, hex_code: string, reason: string}[]>}
 */
async function getSocksRecommendation(mainColor, accentColor) {
  const accentSection = accentColor ? `- 포인트색: ${accentColor}` : '';
  const prompt = `당신은 패션 색상 이론 전문가입니다. 아래 러닝화 색상에 가장 잘 어울리는 양말 색상 3가지를 추천하세요.

## 러닝화 색상
- 주조색: ${mainColor}
${accentSection}

## 출력 규칙
- 반드시 JSON 배열만 출력하세요 (코드블록 없이)
- 배열 요소 수: 정확히 3개
- 각 요소 형식: {"color_name": "색상명(한국어)", "hex_code": "#XXXXXX", "reason": "추천 이유 1~2문장 한국어"}
- 색상 이론(보색, 유사색, 무채색 조화 등)을 근거로 설명
- hex_code는 실제 색상 코드로 정확히 작성`;

  const raw = await callClaude(prompt, 512);
  return parseJson(raw);
}

// ============================================================
// 러닝 코디 추천
// ============================================================

/**
 * 신발·양말 색상 기반 러닝 코디 추천
 * @param {string} mainColor - 신발 주조색
 * @param {string} accentColor - 신발 포인트색 (선택)
 * @param {string} sockColor - 선택된 양말 색상
 * @returns {Promise<{item: string, suggestions: {color_name, hex_code, reason}[]}[]>}
 */
async function getOutfitRecommendation(mainColor, accentColor, sockColor) {
  const accentSection = accentColor ? `- 포인트색: ${accentColor}` : '';
  const prompt = `당신은 러닝 스타일링 전문가입니다. 아래 러닝화·양말 색상 조합을 바탕으로 상의·하의·모자 코디를 추천하세요.

## 색상 조합
- 신발 주조색: ${mainColor}
${accentSection}
- 양말 색상: ${sockColor}

## 출력 규칙
- 반드시 JSON 배열만 출력하세요 (코드블록 없이)
- 배열 요소 수: 정확히 3개 (상의, 하의, 모자 순서)
- 각 요소 형식:
  {
    "item": "상의",
    "suggestions": [
      {"color_name": "색상명(한국어)", "hex_code": "#XXXXXX", "reason": "이유 1~2문장"}
    ]
  }
- 상의·하의: 각 2~3가지, 모자: 1~2가지 suggestions
- 색상 이론과 스타일링 관점으로 설명, hex_code 정확히 작성`;

  const raw = await callClaude(prompt, 2048);
  return parseJson(raw);
}

// ============================================================
// DB 데이터 없을 때 Claude 자체 지식 기반 추천
// ============================================================

/**
 * Shoes DB가 비어있을 때 Claude 자체 지식으로 러닝화 추천
 * goods_no 없이 brand·goods_name·price_estimate·reason 반환
 * @param {object} userProfile
 * @returns {Promise<{rank: number, brand: string, goods_name: string, price_estimate: string, reason: string}[]>}
 */
async function getAiRecommendationsFromKnowledge(userProfile) {
  const prompt = `당신은 러닝화 전문 추천 AI입니다. 현재 추천 DB에 데이터가 없어 AI 지식 기반으로 추천합니다.
아래 사용자 프로파일에 가장 적합한 시판 러닝화 최대 3개를 추천하고 맞춤형 이유를 작성하세요.

## 사용자 프로파일
${buildUserSummary(userProfile)}

## 출력 규칙
- 반드시 JSON 배열만 출력하세요 (코드블록, 설명 텍스트 없이)
- 배열 요소 수: 최대 3개
- 각 요소 형식: {"rank": 1, "brand": "브랜드명", "goods_name": "모델명", "price_estimate": "약 X~Y만원", "reason": "..."}
- reason: 사용자 프로파일(발볼, 쿠션, 거리, 우선순위)을 근거로 2~3문장, 한국어
- 부상 방지 관점 필수 포함
- 실제 시판 중인 모델만 추천할 것`;

  const raw = await callClaude(prompt);
  return parseJson(raw);
}

/**
 * Shoes DB가 비어있을 때 Claude 자체 지식으로 대회 코스 기반 러닝화 추천
 * @param {object} race - Races 시트의 대회 정보
 * @param {object|null} userProfile
 * @returns {Promise<{rank: number, brand: string, goods_name: string, price_estimate: string, reason: string}[]>}
 */
async function getRaceRecommendationsFromKnowledge(race, userProfile) {
  const userSection = userProfile
    ? `\n## 추가 개인 조건\n${buildUserSummary(userProfile)}`
    : '';

  const prompt = `당신은 마라톤 대회 코스 분석 전문 AI입니다. 현재 추천 DB에 데이터가 없어 AI 지식 기반으로 추천합니다.
아래 대회 코스 정보에 가장 적합한 시판 러닝화 최대 3개를 추천하고 추천 이유를 작성하세요.

## 대회 코스 정보
- 대회명: ${race.race_name}
- 코스 구분: ${race.course_type === 'full' ? '풀 마라톤' : '하프 마라톤'}
- 평균 기온: ${race.avg_temp_celsius}°C
- 노면: ${race.surface_type}
- 누적 고도: ${race.elevation_gain_m}m
- 난이도: ${race.difficulty}/5
- 코스 요약: ${race.course_summary}
- 권장 신발 키워드: ${race.shoe_priority_hint}
${userSection}

## 출력 규칙
- 반드시 JSON 배열만 출력하세요 (코드블록 없이)
- 배열 요소 수: 최대 3개
- 각 요소 형식: {"rank": 1, "brand": "브랜드명", "goods_name": "모델명", "price_estimate": "약 X~Y만원", "reason": "..."}
- reason: 코스 특성(기온·노면·난이도·고도)과 신발 스펙을 연결한 2~3문장 한국어
- 부상 방지 관점 필수 포함
- 실제 시판 중인 모델만 추천할 것`;

  const raw = await callClaude(prompt);
  return parseJson(raw);
}

module.exports = {
  getAiRecommendations,
  getRaceRecommendations,
  getSocksRecommendation,
  getOutfitRecommendation,
  getAiRecommendationsFromKnowledge,
  getRaceRecommendationsFromKnowledge,
};
