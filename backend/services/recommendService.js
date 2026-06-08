/**
 * 추천 오케스트레이션 모듈
 * 1단계: 예산·발볼 기반 1차 필터링
 * 2단계: Claude API 맞춤 추천 이유 생성
 * 폴백: Claude 실패 시 점수 기반 상위 5개 즉시 반환
 */

const { getAiRecommendations, getAiRecommendationsFromKnowledge } = require('./claudeService');

// 예산 코드 → 최대 가격 매핑
const BUDGET_MAX = {
  low: 70_000,
  mid: 120_000,
  high: 200_000,
  premium: Infinity,
};

// 거리 코드 → 한국어 매핑 (필터 비교용)
const DISTANCE_MAP = {
  short: '단거리',
  medium: '중거리',
  long: '장거리',
  marathon: '장거리',
};

const WIDTH_MAP = { wide: '넓음', normal: '보통', narrow: '좁음' };

/**
 * 족형(foot_shape) → 발볼 선호도 매핑
 *
 * 이집트형: 엄지 최장, 내전 경향 — 넓은 발볼 선호
 * 로마형:   앞 3발가락 동일 길이 — 넓은 앞발부 필요
 * 그리스형: 두 번째 발가락 최장 — 발볼 기준은 보통, 발가락 길이 공간 중요
 * 게르만형: 모든 발가락 비슷, 직사각형 — 넓은 발볼 필요
 * 켈트형:   혼합형 — 보통 발볼
 */
const SHAPE_WIDTH_PREF = {
  egyptian:  'wide',    // 발볼 넓음 선호
  roman:     'wide',    // 발볼 넓음 선호
  greek:     'normal',  // 발볼은 보통, 발가락 길이 공간 중요
  germanic:  'wide',    // 발볼 넓음 선호
  celtic:    'normal',  // 발볼 보통
};

// ============================================================
// 점수 계산 (폴백 및 정렬용)
// ============================================================

function calcScore(user, shoe) {
  let score = 0;

  // 발볼 (40점)
  const userWidth = WIDTH_MAP[user.foot_width];
  if (shoe.width === userWidth) score += 40;
  else if (shoe.width === '보통') score += 20;
  else if (user.foot_width === 'wide' && shoe.width === '좁음') score -= 20;
  else if (user.foot_width === 'narrow' && shoe.width === '넓음') score -= 10;

  // 쿠션 (30점)
  const diff = Math.abs(shoe.cushion - (user.preferred_cushion ?? 3));
  score += Math.max(0, 30 - diff * 10);

  // 거리 (20점)
  const userDist = DISTANCE_MAP[user.running_distance];
  if (shoe.distance === userDist) score += 20;
  else if (shoe.distance === '전거리') score += 15;

  // 예산 (10점)
  const cap = BUDGET_MAX[user.budget] ?? Infinity;
  if (shoe.price <= cap) score += 10;

  // 족형(발 모양) 매칭 보너스/패널티 (최대 10점)
  if (user.foot_shape) {
    const prefWidth = SHAPE_WIDTH_PREF[user.foot_shape];
    const toeFitList = (shoe.toe_fit || 'all').split(',').map((s) => s.trim());

    if (toeFitList.includes(user.foot_shape)) {
      // toe_fit 직접 매칭: 이 신발이 해당 족형에 특화 → 보너스, 발볼 패널티 면제
      score += 10;
    } else {
      // toe_fit 비매칭: 발볼 선호도로만 평가
      if (prefWidth === 'wide' && shoe.width === '넓음') score += 5;
      if (prefWidth === 'wide' && shoe.width === '좁음') score -= 10;
    }
  }

  // 우선순위 보너스
  for (const p of user.priorities || []) {
    if (p === 'speed' && shoe.weight <= 2) score += 5;
    if (p === 'protection' && shoe.cushion >= 4) score += 5;
    if (p === 'comfort' && shoe.fit >= 4) score += 5;
    if (p === 'breathability' && shoe.breathability >= 4) score += 5;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * 폴백용 간단 추천 이유 생성
 */
function fallbackReason(user, shoe) {
  const parts = [];
  const userWidth = WIDTH_MAP[user.foot_width];
  if (shoe.width === userWidth) parts.push(`${userWidth} 발볼에 잘 맞음`);
  if (Math.abs(shoe.cushion - (user.preferred_cushion ?? 3)) <= 1) parts.push('선호 쿠션감과 일치');
  if (shoe.distance === DISTANCE_MAP[user.running_distance]) parts.push(`${shoe.distance} 러닝에 최적화`);
  if ((user.priorities || []).includes('protection') && shoe.cushion >= 4)
    parts.push('쿠션이 무릎·발목 충격을 완충하여 부상 위험 감소');
  // 족형(발 모양) 안내 추가
  if (user.foot_shape) {
    const toeFit = shoe.toe_fit || 'all';
    const toeFitList = toeFit.split(',').map((s) => s.trim());
    const SHAPE_KO_SHORT = {
      egyptian: '이집트형', roman: '로마형', greek: '그리스형',
      germanic: '게르만형', celtic: '켈트형',
    };
    const shapeLabel = SHAPE_KO_SHORT[user.foot_shape] || user.foot_shape;
    if (toeFitList.includes(user.foot_shape)) {
      parts.push(`${shapeLabel} 발 모양에 최적화된 toe box 구조`);
    } else if (SHAPE_WIDTH_PREF[user.foot_shape] === 'wide' && shoe.width === '넓음') {
      parts.push(`${shapeLabel}에 맞는 넓은 발볼 공간 확보`);
    }
  }
  return parts.length ? parts.join(' · ') : '종합 스펙 기준 상위 매칭';
}

// ============================================================
// 1차 필터링
// ============================================================

function filterCandidates(user, shoes) {
  const cap = BUDGET_MAX[user.budget] ?? Infinity;
  const userWidth = WIDTH_MAP[user.foot_width];

  let filtered = shoes.filter((s) => {
    // 예산 초과 제외
    if (s.price > cap) return false;
    // 발볼 반대 극단 제외 (wide ↔ narrow)
    if (user.foot_width === 'wide' && s.width === '좁음') return false;
    if (user.foot_width === 'narrow' && s.width === '넓음') return false;
    return true;
  });

  // 필터 후 너무 적으면 예산만 적용한 버전으로 재시도
  if (filtered.length < 3) {
    filtered = shoes.filter((s) => s.price <= cap);
  }

  // 점수 순 정렬 후 상위 10개만 Claude에 전달 (토큰 절약)
  return filtered
    .map((s) => ({ ...s, _score: calcScore(user, s) }))
    .sort((a, b) => b._score - a._score)
    .slice(0, 10);
}

// ============================================================
// 메인 추천 함수
// ============================================================

/**
 * @param {object} userProfile
 * @param {object[]} allShoes - sheetsService.getAllShoes() 결과
 * @returns {Promise<object[]>} recommendations 배열 (rank, match_score, reason 포함)
 */
async function recommend(userProfile, allShoes) {
  const candidates = filterCandidates(userProfile, allShoes);

  if (candidates.length === 0) {
    // ── Case A: DB 자체가 비어있음 → Claude 자체 지식으로 추천 ──
    if (allShoes.length === 0) {
      try {
        const aiResults = await getAiRecommendationsFromKnowledge(userProfile);
        return aiResults.map((ai, i) => ({
          rank: ai.rank ?? i + 1,
          goods_no: null,
          brand: ai.brand,
          goods_name: ai.goods_name,
          price_estimate: ai.price_estimate || null,
          reason: ai.reason,
          is_fallback: false,
          is_db_recommendation: false,
        }));
      } catch (err) {
        console.warn('[Recommend] Claude API 실패 (DB 없음):', err.message);
        return [];
      }
    }

    // ── Case B: DB에 데이터 있으나 필터 결과 0건 → 필터 완화 후 Claude 재호출 ──
    const relaxedCandidates = allShoes
      .map((s) => ({ ...s, _score: calcScore(userProfile, s) }))
      .sort((a, b) => b._score - a._score)
      .slice(0, 10);

    try {
      const aiResults = await getAiRecommendations(userProfile, relaxedCandidates);
      return aiResults
        .map((ai, i) => {
          const shoe = relaxedCandidates.find((s) => s.goods_no === ai.goods_no);
          if (!shoe) return null;
          return {
            rank: ai.rank ?? i + 1,
            ...shoe,
            match_score: shoe._score,
            reason: ai.reason,
            is_fallback: false,
            is_db_recommendation: true,
          };
        })
        .filter(Boolean);
    } catch (err) {
      console.warn('[Recommend] Claude API 실패 (필터 완화), 폴백 사용:', err.message);
      return relaxedCandidates.slice(0, 5).map((shoe, i) => ({
        rank: i + 1,
        ...shoe,
        match_score: shoe._score,
        reason: fallbackReason(userProfile, shoe),
        is_fallback: true,
        is_db_recommendation: true,
      }));
    }
  }

  // ── 정상 경로: 1차 필터 후보 있음 ──
  let aiResults;
  try {
    aiResults = await getAiRecommendations(userProfile, candidates);
  } catch (err) {
    console.warn('[Recommend] Claude API 실패, 폴백 사용:', err.message);
    return candidates.slice(0, 5).map((shoe, i) => ({
      rank: i + 1,
      ...shoe,
      match_score: shoe._score,
      reason: fallbackReason(userProfile, shoe),
      is_fallback: true,
      is_db_recommendation: true,
    }));
  }

  return aiResults
    .map((ai, i) => {
      const shoe = candidates.find((s) => s.goods_no === ai.goods_no);
      if (!shoe) return null;
      return {
        rank: ai.rank ?? i + 1,
        ...shoe,
        match_score: shoe._score,
        reason: ai.reason,
        is_fallback: false,
        is_db_recommendation: true,
      };
    })
    .filter(Boolean);
}

module.exports = { recommend };
