/**
 * 추천 오케스트레이션 모듈 (v2.0)
 * - recommend        : Q1~Q7 기반 기본 추천
 * - recommendByRace  : 대회 코스 기반 추천 (Feature 5)
 *
 * 공통 구조: 1차 필터링 → Claude API → 폴백
 */

const { getAiRecommendations, getAiRaceRecommendations } = require('./claudeService');

const BUDGET_MAX = {
  low: 70_000,
  mid: 120_000,
  high: 200_000,
  premium: Infinity,
};

const DISTANCE_MAP = {
  short: '단거리',
  medium: '중거리',
  long: '장거리',
  marathon: '장거리',
};

const WIDTH_MAP = { wide: '넓음', normal: '보통', narrow: '좁음' };

// ============================================================
// Q1~Q7 기반 점수 계산
// ============================================================

function calcScore(user, shoe) {
  let score = 0;

  // 발볼 (40점)
  const userWidth = WIDTH_MAP[user.foot_width];
  if (shoe.width === userWidth) score += 40;
  else if (shoe.width === '보통') score += 20;
  else if (user.foot_width === 'wide'   && shoe.width === '좁음') score -= 20;
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

  // 우선순위 보너스
  for (const p of user.priorities || []) {
    if (p === 'speed'        && shoe.weight <= 2)        score += 5;
    if (p === 'protection'   && shoe.cushion >= 4)       score += 5;
    if (p === 'comfort'      && shoe.fit >= 4)           score += 5;
    if (p === 'breathability'&& shoe.breathability >= 4) score += 5;
  }

  return Math.max(0, Math.min(100, score));
}

function fallbackReason(user, shoe) {
  const parts = [];
  const userWidth = WIDTH_MAP[user.foot_width];
  if (shoe.width === userWidth) parts.push(`${userWidth} 발볼에 잘 맞음`);
  if (Math.abs(shoe.cushion - (user.preferred_cushion ?? 3)) <= 1) parts.push('선호 쿠션감과 일치');
  if (shoe.distance === DISTANCE_MAP[user.running_distance]) parts.push(`${shoe.distance} 러닝에 최적화`);
  if ((user.priorities || []).includes('protection') && shoe.cushion >= 4)
    parts.push('쿠션이 무릎·발목 충격을 완충하여 부상 위험 감소');
  return parts.length ? parts.join(' · ') : '종합 스펙 기준 상위 매칭';
}

// ============================================================
// 1차 필터링 (Q1~Q7)
// ============================================================

function filterCandidates(user, shoes) {
  const cap = BUDGET_MAX[user.budget] ?? Infinity;

  let filtered = shoes.filter((s) => {
    if (s.price > cap) return false;
    if (user.foot_width === 'wide'   && s.width === '좁음') return false;
    if (user.foot_width === 'narrow' && s.width === '넓음') return false;
    return true;
  });

  if (filtered.length < 3) {
    filtered = shoes.filter((s) => s.price <= cap);
  }

  return filtered
    .map((s) => ({ ...s, _score: calcScore(user, s) }))
    .sort((a, b) => b._score - a._score)
    .slice(0, 10);
}

// ============================================================
// 대회 코스 기반 점수 계산 (Feature 5)
// ============================================================

function calcRaceScore(race, shoe) {
  let score = 50;

  // 코스 난이도 → 쿠션·안정성 중시
  if (race.difficulty >= 4) {
    score += (shoe.cushion - 3) * 8;
    score += (shoe.fit - 3) * 5;
  } else if (race.difficulty <= 2) {
    // 빠른 코스 → 경량 중시
    score += (4 - shoe.weight) * 8;
  } else {
    score += (shoe.cushion - 3) * 4;
    score += (4 - shoe.weight) * 4;
  }

  // 고온 → 통기성 중시
  if (race.avg_temp_celsius >= 20) {
    score += (shoe.breathability - 3) * 5;
  }

  // 고도 차이 → 쿠션·착화감 중시
  if (race.elevation_gain_m >= 150) {
    score += (shoe.cushion - 3) * 5;
    score += (shoe.fit - 3) * 3;
  }

  // shoe_priority_hint 키워드 매칭 보너스
  const hints = (race.shoe_priority_hint || '').toLowerCase();
  if (hints.includes('경량') && shoe.weight <= 2)        score += 8;
  if (hints.includes('쿠션') && shoe.cushion >= 4)       score += 8;
  if (hints.includes('안정성') && shoe.fit >= 4)         score += 6;
  if (hints.includes('통기성') && shoe.breathability >= 4) score += 6;
  if (hints.includes('카본') && shoe.has_carbon_plate)   score += 10;
  if (hints.includes('반발력') && shoe.weight <= 2)      score += 6;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function raceFilterCandidates(race, shoes) {
  return shoes
    .map((s) => ({ ...s, _score: calcRaceScore(race, s) }))
    .sort((a, b) => b._score - a._score)
    .slice(0, 10);
}

// ============================================================
// 메인 추천 함수 — Q1~Q7
// ============================================================

async function recommend(userProfile, allShoes) {
  const candidates = filterCandidates(userProfile, allShoes);

  if (candidates.length === 0) return [];

  let aiResults;
  try {
    aiResults = await getAiRecommendations(userProfile, candidates);
  } catch (err) {
    console.warn('[Recommend] Claude API 실패, 폴백 사용:', err.message);
    return candidates.slice(0, 3).map((shoe, i) => ({
      rank: i + 1,
      ...shoe,
      match_score: shoe._score,
      reason: fallbackReason(userProfile, shoe),
      is_fallback: true,
    }));
  }

  return aiResults
    .map((ai, i) => {
      const shoe = candidates.find((s) => s.goods_no === ai.goods_no);
      if (!shoe) return null;
      return { rank: ai.rank ?? i + 1, ...shoe, match_score: shoe._score, reason: ai.reason, is_fallback: false };
    })
    .filter(Boolean);
}

// ============================================================
// 메인 추천 함수 — 대회 코스 (Feature 5)
// ============================================================

async function recommendByRace(race, userProfile, allShoes) {
  const candidates = raceFilterCandidates(race, allShoes);

  if (candidates.length === 0) return [];

  // 사용자 프로필이 있으면 점수에 일부 반영
  const scoredCandidates = userProfile
    ? candidates.map((s) => ({
        ...s,
        _score: Math.round(s._score * 0.7 + calcScore(userProfile, s) * 0.3),
      })).sort((a, b) => b._score - a._score)
    : candidates;

  let aiResults;
  try {
    aiResults = await getAiRaceRecommendations(race, scoredCandidates, userProfile);
  } catch (err) {
    console.warn('[RecommendRace] Claude API 실패, 폴백 사용:', err.message);
    return scoredCandidates.slice(0, 3).map((shoe, i) => ({
      rank: i + 1,
      ...shoe,
      match_score: shoe._score,
      reason: `${race.race_name}(${race.course_summary}) 코스에 최적화된 추천입니다.`,
      is_fallback: true,
    }));
  }

  return aiResults
    .map((ai, i) => {
      const shoe = scoredCandidates.find((s) => s.goods_no === ai.goods_no);
      if (!shoe) return null;
      return { rank: ai.rank ?? i + 1, ...shoe, match_score: shoe._score, reason: ai.reason, is_fallback: false };
    })
    .filter(Boolean);
}

module.exports = { recommend, recommendByRace };
