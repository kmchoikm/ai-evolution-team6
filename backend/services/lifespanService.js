/**
 * 러닝화 교체 시기 계산기 서비스 (LLM 미사용, 순수 계산 로직)
 * SPEC §5.9, §6.5 기준
 */

// 카본 플레이트 신발은 수명이 더 짧음
const CARBON_LIFESPAN_MIN = 300;
const CARBON_LIFESPAN_MAX = 500;

/**
 * 구매 시점 문자열(YYYY-MM)부터 현재까지 경과한 주(週) 수 계산
 * @param {string} purchaseYearMonth - "YYYY-MM"
 * @returns {number} 경과 주 수 (소수점 포함)
 */
function calcWeeksSincePurchase(purchaseYearMonth) {
  const [year, month] = purchaseYearMonth.split('-').map(Number);
  const purchaseDate = new Date(year, month - 1, 1);
  const now = new Date();
  const msElapsed = now - purchaseDate;
  return msElapsed / (1000 * 60 * 60 * 24 * 7);
}

/**
 * 사용률(%) 기반 판정
 * @param {number} usageRate
 * @returns {{ verdict: string, message: string }}
 */
function calcVerdict(usageRate) {
  if (usageRate <= 50) {
    return {
      verdict: 'good',
      message: '아직 충분히 쓸 수 있어요.',
    };
  }
  if (usageRate <= 80) {
    return {
      verdict: 'caution',
      message: '교체를 고려할 시기입니다. 다음 대회 전 점검하세요.',
    };
  }
  if (usageRate <= 100) {
    return {
      verdict: 'replace_recommended',
      message: '쿠션 성능이 저하됐을 수 있습니다. 교체를 권장합니다.',
    };
  }
  return {
    verdict: 'replace_required',
    message: '부상 위험 구간입니다. 즉시 교체를 권장합니다.',
  };
}

/**
 * 러닝화 교체 시기 계산
 * @param {object} shoe - Shoes 시트 데이터 (lifespan_km_min/max, has_carbon_plate 포함)
 * @param {string} purchaseYearMonth - "YYYY-MM"
 * @param {number|null} weeklyKm - Option A: 주간 평균 거리
 * @param {number|null} totalKm - Option B: 총 누적 거리
 * @returns {object} 계산 결과
 */
function calcLifespan(shoe, purchaseYearMonth, weeklyKm, totalKm) {
  // 총 누적 거리 결정
  let estimatedTotalKm;
  if (totalKm != null) {
    estimatedTotalKm = totalKm;
  } else if (weeklyKm != null) {
    const weeks = calcWeeksSincePurchase(purchaseYearMonth);
    estimatedTotalKm = Math.round(weeks * weeklyKm);
  } else {
    throw new Error('weekly_km 또는 total_km 중 하나는 필수입니다');
  }

  // 수명 범위 결정 (카본 플레이트 신발 별도)
  let lifespanMin = shoe.lifespan_km_min;
  let lifespanMax = shoe.lifespan_km_max;

  if (shoe.has_carbon_plate) {
    lifespanMin = CARBON_LIFESPAN_MIN;
    lifespanMax = CARBON_LIFESPAN_MAX;
  }

  // DB에 수명 데이터가 없으면 일반 기본값 적용
  if (!lifespanMin || !lifespanMax) {
    lifespanMin = 500;
    lifespanMax = 800;
  }

  const avgLifespan = (lifespanMin + lifespanMax) / 2;
  const usageRate = Math.round((estimatedTotalKm / avgLifespan) * 100);
  const remainingKm = Math.max(0, Math.round(avgLifespan - estimatedTotalKm));

  const { verdict, message } = calcVerdict(usageRate);

  return {
    goods_name: shoe.goods_name,
    brand: shoe.brand,
    estimated_total_km: estimatedTotalKm,
    lifespan_km_min: lifespanMin,
    lifespan_km_max: lifespanMax,
    usage_rate: usageRate,
    verdict,
    message,
    remaining_km: remainingKm,
  };
}

module.exports = { calcLifespan };
