/**
 * 대회 코스 기반 러닝화 추천 오케스트레이션
 * SPEC §5.8, §6.3, §8.2 기준
 *
 * 1단계: 대회 shoe_priority_hint 기반 1차 필터링
 * 2단계: Claude API로 맞춤 추천 (폴백 내장)
 */

const { getRaceRecommendations } = require('./claudeService');

// shoe_priority_hint 키워드 → Shoes 컬럼 매핑 (점수 보너스용)
const HINT_SCORE_RULES = {
  경량: (shoe) => (shoe.weight <= 2 ? 15 : 0),
  반발력: (shoe) => (shoe.cushion >= 3 ? 10 : 0),
  쿠션: (shoe) => (shoe.cushion >= 4 ? 15 : shoe.cushion >= 3 ? 8 : 0),
  안정성: (shoe) => (shoe.fit >= 4 ? 12 : 0),
  통기성: (shoe) => (shoe.breathability >= 4 ? 10 : 0),
  내구성: (shoe) => (shoe.distance === '장거리' || shoe.distance === '전거리' ? 10 : 0),
};

const WIDTH_MAP = { wide: '넓음', normal: '보통', narrow: '좁음' };
const BUDGET_MAX = {
  low: 70_000,
  mid: 120_000,
  high: 200_000,
  premium: Infinity,
};

/**
 * 대회 코스에 적합한 1차 후보 신발 선정
 * @param {object} race
 * @param {object[]} allShoes
 * @param {object|null} userProfile
 * @returns {object[]} 점수 정렬된 상위 10개
 */
function filterRaceCandidates(race, allShoes, userProfile) {
  const hints = (race.shoe_priority_hint || '')
    .split(/[,，、\s]+/)
    .map((h) => h.trim())
    .filter(Boolean);

  let filtered = allShoes;

  // 사용자 프로파일이 있으면 예산·발볼 필터 추가 적용
  if (userProfile) {
    const cap = BUDGET_MAX[userProfile.budget] ?? Infinity;
    const userWidth = WIDTH_MAP[userProfile.foot_width];
    filtered = filtered.filter((s) => {
      if (s.price > cap) return false;
      if (userProfile.foot_width === 'wide' && s.width === '좁음') return false;
      if (userProfile.foot_width === 'narrow' && s.width === '넓음') return false;
      return true;
    });
    if (filtered.length < 3) {
      filtered = allShoes.filter((s) => s.price <= cap);
    }
  }

  // hint 기반 보너스 점수 계산 후 상위 10개 선정
  return filtered
    .map((shoe) => {
      let score = 50; // 기본 점수
      for (const hint of hints) {
        const rule = HINT_SCORE_RULES[hint];
        if (rule) score += rule(shoe);
      }
      // 사용자 발볼 매칭 보너스
      if (userProfile) {
        const userWidth = WIDTH_MAP[userProfile.foot_width];
        if (shoe.width === userWidth) score += 20;
        else if (shoe.width === '보통') score += 10;
      }
      return { ...shoe, _score: Math.min(100, score) };
    })
    .sort((a, b) => b._score - a._score)
    .slice(0, 10);
}

/**
 * 폴백 추천 이유 생성 (Claude 실패 시)
 */
function fallbackRaceReason(race, shoe) {
  const hints = (race.shoe_priority_hint || '').split(/[,，、\s]+/).filter(Boolean);
  const parts = [];
  if (hints.includes('경량') && shoe.weight <= 2) parts.push('경량 설계로 레이스 페이스 유지에 유리');
  if (hints.includes('쿠션') && shoe.cushion >= 4) parts.push('충분한 쿠션으로 장거리 충격 흡수');
  if (hints.includes('안정성') && shoe.fit >= 4) parts.push('높은 착화감으로 장시간 안정적 착용 가능');
  return parts.length ? `${race.race_name} 코스에서 ${parts.join(', ')}.` : '코스 특성에 종합 적합한 신발';
}

/**
 * 대회 코스 기반 러닝화 추천 메인 함수
 * @param {object} race - Races 시트 레코드
 * @param {object[]} allShoes
 * @param {object|null} userProfile - Q1~Q7 선택적 프로파일
 * @returns {Promise<object[]>}
 */
async function recommendByRace(race, allShoes, userProfile) {
  const candidates = filterRaceCandidates(race, allShoes, userProfile);

  if (candidates.length === 0) return [];

  let aiResults;
  try {
    aiResults = await getRaceRecommendations(race, candidates, userProfile);
  } catch (err) {
    console.warn('[RaceRecommend] Claude API 실패, 폴백 사용:', err.message);
    return candidates.slice(0, 5).map((shoe, i) => ({
      rank: i + 1,
      ...shoe,
      match_score: shoe._score,
      reason: fallbackRaceReason(race, shoe),
      is_fallback: true,
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
      };
    })
    .filter(Boolean);
}

module.exports = { recommendByRace };
