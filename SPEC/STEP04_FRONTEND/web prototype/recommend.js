/**
 * RunFit — 추천 매칭 엔진
 * 순수 JS, 백엔드 없이 동작 (GitHub Pages 호환)
 */

const WIDTH_MAP = { wide: '넓음', normal: '보통', narrow: '좁음' };
const DISTANCE_MAP = {
  short: '단거리',
  medium: '중거리',
  long: '장거리',
  marathon: '장거리',
};
const BUDGET_MAX = {
  low: 70000,
  mid: 120000,
  high: 200000,
  premium: Infinity,
};

/**
 * 사용자 프로필 + 신발 속성 → 매칭 점수 (0-100)
 *
 * 가중치:
 *   width    — 40점 (가장 중요)
 *   cushion  — 30점
 *   distance — 20점
 *   budget   — 10점
 */
function calculateMatchScore(user, shoe) {
  let score = 0;

  // ── 발볼 (40점) ──
  // CEO Critical Fix #5: narrow foot + 넓음 신발에도 페널티 (대칭)
  const userWidth = WIDTH_MAP[user.foot_width];
  if (shoe.width === userWidth) {
    score += 40;
  } else if (shoe.width === '보통') {
    score += 20;
  } else if (user.foot_width === 'wide' && shoe.width === '좁음') {
    score -= 20; // 발볼 넓은데 좁은 신발 → 페널티
  } else if (user.foot_width === 'narrow' && shoe.width === '넓음') {
    score -= 20; // 발볼 좁은데 넓은 신발 → 페널티 (대칭)
  }

  // ── 쿠션 (30점) ──
  const userCushion = user.preferred_cushion ?? 3;
  const shoeCushion = shoe.cushion ?? 3;
  const cushionDiff = Math.abs(shoeCushion - userCushion);
  score += Math.max(0, 30 - cushionDiff * 10);

  // ── 거리 (20점) ──
  const userDist = DISTANCE_MAP[user.running_distance];
  if (shoe.distance === userDist) {
    score += 20;
  } else if (shoe.distance === '전거리') {
    score += 15;
  }

  // ── 예산 (10점) ──
  const budgetCap = BUDGET_MAX[user.budget] ?? Infinity;
  const price = parseInt(shoe.price) || 0;
  if (price <= budgetCap) score += 10;

  return Math.max(0, Math.min(100, score));
}

/**
 * 우선순위(priorities) 기반 보너스 점수
 * 최대 3개 우선순위 × 5점 = 15점 추가 가능
 */
function priorityBonus(user, shoe) {
  let bonus = 0;
  for (const p of user.priorities || []) {
    if (p === 'speed' && (shoe.weight ?? 3) <= 2) bonus += 5;
    if (p === 'protection' && (shoe.cushion ?? 3) >= 4) bonus += 5;
    if (p === 'comfort' && (shoe.fit ?? 3) >= 4) bonus += 5;
    if (p === 'breathability' && (shoe.breathability ?? 3) >= 4) bonus += 5;
    // 'design'은 데이터로 평가 불가, 보너스 없음
  }
  return bonus;
}

/**
 * 추천 이유 한국어 생성
 */
function generateReason(user, shoe) {
  const reasons = [];
  const userWidth = WIDTH_MAP[user.foot_width];

  if (shoe.width === userWidth) {
    reasons.push(`${userWidth} 발볼에 잘 맞음`);
  }

  const cushionDiff = Math.abs((shoe.cushion ?? 3) - (user.preferred_cushion ?? 3));
  if (cushionDiff <= 1) {
    reasons.push('원하시는 쿠션감과 일치');
  }

  const userDist = DISTANCE_MAP[user.running_distance];
  if (shoe.distance === userDist) {
    reasons.push(`${userDist} 러닝에 최적화`);
  } else if (shoe.distance === '전거리') {
    reasons.push('범용 데일리 트레이너');
  }

  if (user.priorities?.includes('speed') && (shoe.weight ?? 3) <= 2) {
    reasons.push('가벼운 무게');
  }
  if (user.priorities?.includes('protection') && (shoe.cushion ?? 3) >= 4) {
    reasons.push('충분한 쿠션으로 부상 방지');
  }
  if (user.priorities?.includes('breathability') && (shoe.breathability ?? 3) >= 4) {
    reasons.push('통기성 우수');
  }

  return reasons.length > 0 ? reasons.join(' · ') : '균형 잡힌 선택지';
}

/**
 * 메인 추천 함수
 * @param {object} userProfile - 폼 입력
 * @param {array} products - product_profiles.json 로드 결과
 * @returns {array} 매칭 점수 내림차순, 상위 5개
 */
function getRecommendations(userProfile, products) {
  const scored = products
    .map((shoe) => {
      const baseScore = calculateMatchScore(userProfile, shoe);
      const bonus = priorityBonus(userProfile, shoe);
      const total = Math.min(100, baseScore + bonus);
      return {
        ...shoe,
        match_score: total,
        reason: generateReason(userProfile, shoe),
      };
    })
    .sort((a, b) => b.match_score - a.match_score);

  return scored.slice(0, 5);
}
