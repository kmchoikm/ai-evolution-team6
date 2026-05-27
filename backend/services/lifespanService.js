/**
 * 러닝화 교체 시기 계산기 + D-Day 시뮬레이터 서비스 (LLM 미사용, 순수 계산 로직)
 * SPEC §5.9/§6.5 (교체 계산기), §1.9/§6.6 (D-Day 시뮬레이터) 기준
 */

// 카본 플레이트 신발은 수명이 더 짧음
const CARBON_LIFESPAN_MIN = 300;
const CARBON_LIFESPAN_MAX = 500;

// 대회 전 새 신발 길들이기(break-in) 최소 기간
const BREAK_IN_WEEKS = 3;

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

// ============================================================
// D-Day 러닝화 컨디션 시뮬레이터
// ============================================================

/**
 * 날짜 문자열(YYYY-MM-DD)을 Date 객체로 변환
 * @param {string} dateStr
 * @returns {Date}
 */
function parseDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * 날짜를 'M월 D일' 형식으로 포맷
 * @param {Date} date
 * @returns {string}
 */
function formatDate(date) {
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

/**
 * D-Day 러닝화 컨디션 시뮬레이터 계산
 *
 * @param {object} shoe - Shoes 시트 데이터 (lifespan_km_min/max, has_carbon_plate 포함)
 * @param {object} race - Races 시트 데이터 (race_name, race_date 포함)
 * @param {number} currentKm - 현재 누적 주행 거리 (km)
 * @param {number} weeklyKm - 주간 훈련 거리 (km/주)
 * @returns {object} 시뮬레이션 결과
 */
function calcDdaySimulator(shoe, race, currentKm, weeklyKm) {
  if (!race.race_date) {
    throw new Error(`"${race.race_name}" 대회의 정확한 날짜(race_date)가 등록되지 않았습니다.`);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const raceDate = parseDate(race.race_date);
  const msToRace = raceDate - today;

  if (msToRace <= 0) {
    throw new Error('이미 지난 대회입니다. 다른 대회를 선택해 주세요.');
  }

  const daysToRace = Math.ceil(msToRace / (1000 * 60 * 60 * 24));
  const weeksToRace = daysToRace / 7;

  // 수명 범위 결정 (카본 플레이트 신발 별도)
  let lifespanMin = shoe.lifespan_km_min || 500;
  let lifespanMax = shoe.lifespan_km_max || 800;

  if (shoe.has_carbon_plate) {
    lifespanMin = CARBON_LIFESPAN_MIN;
    lifespanMax = CARBON_LIFESPAN_MAX;
  }

  const lifespanAvg = (lifespanMin + lifespanMax) / 2;
  const threshold80pct = Math.round(lifespanAvg * 0.8);

  // 대회 당일 예상 누적 거리
  const projectedKmOnRaceDay = Math.round(currentKm + weeksToRace * weeklyKm);
  const projectedUsagePct = Math.round((projectedKmOnRaceDay / lifespanAvg) * 100);

  // 교체 권장 기준일: 대회일 - 3주
  const replaceDeadline = new Date(raceDate);
  replaceDeadline.setDate(replaceDeadline.getDate() - BREAK_IN_WEEKS * 7);

  // 80% 임계값 도달 시점 계산
  let thresholdReachedDate = null;
  let thresholdReachedWeek = null;
  if (weeklyKm > 0 && currentKm < threshold80pct) {
    const kmToThreshold = threshold80pct - currentKm;
    const weeksToThreshold = kmToThreshold / weeklyKm;
    thresholdReachedDate = new Date(today);
    thresholdReachedDate.setDate(today.getDate() + Math.round(weeksToThreshold * 7));
    thresholdReachedWeek = weeksToThreshold;
  } else if (currentKm >= threshold80pct) {
    // 이미 80% 초과 상태
    thresholdReachedDate = today;
    thresholdReachedWeek = 0;
  }

  // 판정
  let verdict;
  let message;

  if (projectedKmOnRaceDay <= threshold80pct) {
    verdict = 'ok';
    message = `현재 훈련 페이스라면 대회 당일 누적 ${projectedKmOnRaceDay.toLocaleString()}km(수명의 ${projectedUsagePct}%)로 안전합니다. 현재 신발로 대회를 완주할 수 있어요.`;
  } else {
    // 대회 전 80% 초과 예상
    const deadlineStr = formatDate(replaceDeadline);
    const projStr = projectedKmOnRaceDay.toLocaleString();
    const pctStr = projectedUsagePct;

    if (currentKm >= threshold80pct) {
      verdict = 'replace_now';
      message = `이미 수명의 80% 이상 사용했습니다. 대회 3주 전인 ${deadlineStr}까지 새 신발로 교체하고 길들이기를 시작해야 합니다.`;
    } else {
      verdict = 'replace_needed';
      const threshStr = thresholdReachedDate ? formatDate(thresholdReachedDate) : '';
      message = `대회 3주 전인 ${deadlineStr}까지 새 신발로 교체하고 길들이기를 시작해야 합니다. 현재 페이스라면 대회 당일 ${projStr}km(수명의 ${pctStr}%)에 도달합니다.`;
      if (threshStr) {
        message += ` 80% 임계값(${threshold80pct}km)은 ${threshStr}경 도달 예정입니다.`;
      }
    }
  }

  // 타임라인 데이터 생성: 주 단위(최대 24포인트)
  const stepWeeks = weeksToRace > 24 ? Math.ceil(weeksToRace / 24) : 1;
  const timelinePoints = [];
  for (let w = 0; w <= weeksToRace; w += stepWeeks) {
    const kmAtWeek = Math.round(currentKm + w * weeklyKm);
    const date = new Date(today);
    date.setDate(today.getDate() + Math.round(w * 7));
    timelinePoints.push({
      week: Math.round(w),
      date: date.toISOString().slice(0, 10),
      km: kmAtWeek,
      usage_pct: Math.round((kmAtWeek / lifespanAvg) * 100),
    });
  }
  // 레이스 당일 포인트가 마지막에 없으면 추가
  const lastPoint = timelinePoints[timelinePoints.length - 1];
  if (!lastPoint || lastPoint.date !== race.race_date) {
    timelinePoints.push({
      week: Math.round(weeksToRace),
      date: race.race_date,
      km: projectedKmOnRaceDay,
      usage_pct: projectedUsagePct,
    });
  }

  return {
    race_name: race.race_name,
    race_date: race.race_date,
    days_until_race: daysToRace,
    weeks_until_race: Math.round(weeksToRace * 10) / 10,
    shoe_name: shoe.goods_name,
    brand: shoe.brand,
    has_carbon_plate: shoe.has_carbon_plate,
    current_km: currentKm,
    weekly_km: weeklyKm,
    projected_km_on_race_day: projectedKmOnRaceDay,
    projected_usage_pct: projectedUsagePct,
    lifespan_km_min: lifespanMin,
    lifespan_km_max: lifespanMax,
    lifespan_avg: lifespanAvg,
    threshold_80pct_km: threshold80pct,
    threshold_reached_date: thresholdReachedDate ? thresholdReachedDate.toISOString().slice(0, 10) : null,
    replace_deadline_date: replaceDeadline.toISOString().slice(0, 10),
    verdict,
    message,
    timeline: timelinePoints,
  };
}

module.exports = { calcLifespan, calcDdaySimulator };
