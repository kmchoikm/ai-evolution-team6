/**
 * lifespanService 단위 테스트
 * 외부 의존성 없는 순수 계산 로직 — mock 불필요
 *
 * 검증 항목:
 * 1. total_km 입력 경로
 * 2. weekly_km 입력 경로 (날짜 고정)
 * 3. 카본 플레이트 신발 수명 재정의
 * 4. DB 수명 데이터 없을 때 기본값(500~800) 적용
 * 5. verdict 경계값 (50%/80%/100%/101%)
 * 6. 입력 없을 때 예외 throw
 */

const { calcLifespan } = require('../../../services/lifespanService');

// ============================================================
// 테스트용 신발 픽스처
// ============================================================

/** 일반 신발: lifespan 700~900, has_carbon_plate: false */
const shoeNormal = {
  goods_name: '아식스 젤-카야노 31',
  brand: 'ASICS',
  lifespan_km_min: 700,
  lifespan_km_max: 900,
  has_carbon_plate: false,
};

/** 카본 플레이트 신발: DB 수명 있지만 카본 기준(300~500)으로 재정의 */
const shoeCarbon = {
  goods_name: '나이키 줌 플라이 5',
  brand: 'Nike',
  lifespan_km_min: 500,
  lifespan_km_max: 700,
  has_carbon_plate: true,
};

/** 수명 DB 데이터 없는 신발: 기본값(500~800) 적용 */
const shoeNoLifespan = {
  goods_name: '무명 러닝화',
  brand: 'Unknown',
  lifespan_km_min: 0,
  lifespan_km_max: 0,
  has_carbon_plate: false,
};

/** verdict 경계 테스트용: avgLifespan = 100km으로 퍼센트 계산이 정확해짐 */
const shoeForVerdictTest = {
  goods_name: '테스트화',
  brand: 'Test',
  lifespan_km_min: 100,
  lifespan_km_max: 100,
  has_carbon_plate: false,
};

// ============================================================
// total_km 경로
// ============================================================

describe('calcLifespan — total_km 입력 경로', () => {
  it('total_km 기준으로 usage_rate를 계산한다', () => {
    // avgLifespan = (700+900)/2 = 800
    // usageRate = round(400/800 * 100) = 50 → verdict: 'good'
    const result = calcLifespan(shoeNormal, '2024-01', null, 400);

    expect(result.estimated_total_km).toBe(400);
    expect(result.usage_rate).toBe(50);
    expect(result.verdict).toBe('good');
    expect(result.remaining_km).toBe(400); // max(0, 800-400)
  });

  it('신발 정보(이름, 브랜드)를 결과에 포함한다', () => {
    const result = calcLifespan(shoeNormal, '2024-01', null, 400);

    expect(result.goods_name).toBe('아식스 젤-카야노 31');
    expect(result.brand).toBe('ASICS');
    expect(result.lifespan_km_min).toBe(700);
    expect(result.lifespan_km_max).toBe(900);
  });

  it('수명 초과 시 remaining_km은 0이다', () => {
    const result = calcLifespan(shoeNormal, '2024-01', null, 1000);

    expect(result.remaining_km).toBe(0);
    expect(result.verdict).toBe('replace_required');
  });
});

// ============================================================
// weekly_km 경로
// ============================================================

describe('calcLifespan — weekly_km 입력 경로', () => {
  beforeEach(() => {
    // 날짜를 고정: 2025-01-01 기준
    // 구매일: 2024-07-01 → 약 26주 경과
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-01'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('weekly_km × 경과 주 수로 누적 거리를 추정한다', () => {
    // 2024-07-01 → 2025-01-01: 약 26.14주
    // weekly_km=10 → estimated = round(26.14 * 10) ≈ 261km
    const result = calcLifespan(shoeNormal, '2024-07', 10, null);

    expect(result.estimated_total_km).toBeGreaterThan(0);
    expect(typeof result.usage_rate).toBe('number');
    expect(result.verdict).toBeDefined();
  });
});

// ============================================================
// 카본 플레이트 신발
// ============================================================

describe('calcLifespan — 카본 플레이트 신발', () => {
  it('has_carbon_plate=true이면 lifespan이 300~500으로 재정의된다', () => {
    // avgLifespan = (300+500)/2 = 400
    // total_km=400 → usageRate=100 → verdict: 'replace_recommended'
    const result = calcLifespan(shoeCarbon, '2024-01', null, 400);

    expect(result.lifespan_km_min).toBe(300);
    expect(result.lifespan_km_max).toBe(500);
    expect(result.usage_rate).toBe(100);
    expect(result.verdict).toBe('replace_recommended');
  });
});

// ============================================================
// DB 수명 데이터 없는 신발
// ============================================================

describe('calcLifespan — 수명 DB 데이터 없음', () => {
  it('lifespan_km_min/max가 0이면 기본값(500~800)을 적용한다', () => {
    // avgLifespan = (500+800)/2 = 650
    const result = calcLifespan(shoeNoLifespan, '2024-01', null, 325);

    expect(result.lifespan_km_min).toBe(500);
    expect(result.lifespan_km_max).toBe(800);
    // 325/650 * 100 = 50 → verdict: 'good'
    expect(result.verdict).toBe('good');
  });
});

// ============================================================
// verdict 경계값 테스트
// shoeForVerdictTest: avgLifespan=100, km = usageRate%
// ============================================================

describe('calcLifespan — verdict 경계값', () => {
  it('usage_rate 50% → verdict: good', () => {
    const result = calcLifespan(shoeForVerdictTest, '2024-01', null, 50);
    expect(result.verdict).toBe('good');
    expect(result.message).toMatch('충분히 쓸 수 있어요');
  });

  it('usage_rate 51% → verdict: caution', () => {
    const result = calcLifespan(shoeForVerdictTest, '2024-01', null, 51);
    expect(result.verdict).toBe('caution');
    expect(result.message).toMatch('교체를 고려');
  });

  it('usage_rate 80% → verdict: caution', () => {
    const result = calcLifespan(shoeForVerdictTest, '2024-01', null, 80);
    expect(result.verdict).toBe('caution');
  });

  it('usage_rate 81% → verdict: replace_recommended', () => {
    const result = calcLifespan(shoeForVerdictTest, '2024-01', null, 81);
    expect(result.verdict).toBe('replace_recommended');
    expect(result.message).toMatch('교체를 권장');
  });

  it('usage_rate 100% → verdict: replace_recommended', () => {
    const result = calcLifespan(shoeForVerdictTest, '2024-01', null, 100);
    expect(result.verdict).toBe('replace_recommended');
  });

  it('usage_rate 101% → verdict: replace_required', () => {
    const result = calcLifespan(shoeForVerdictTest, '2024-01', null, 101);
    expect(result.verdict).toBe('replace_required');
    expect(result.message).toMatch('부상 위험');
  });
});

// ============================================================
// 예외 처리
// ============================================================

describe('calcLifespan — 예외 처리', () => {
  it('weekly_km도 total_km도 없으면 Error를 throw한다', () => {
    expect(() => calcLifespan(shoeNormal, '2024-01', null, null)).toThrow(
      'weekly_km 또는 total_km 중 하나는 필수입니다'
    );
  });
});
