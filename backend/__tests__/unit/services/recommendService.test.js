/**
 * recommendService 단위 테스트
 * claudeService는 jest.mock()으로 완전 목킹
 *
 * 검증 항목:
 * 1. filterCandidates: 예산 필터
 * 2. filterCandidates: 발볼 극단 필터 (wide ↔ narrow)
 * 3. filterCandidates: 3개 미만이면 발볼 필터 제거
 * 4. recommend: Claude 성공 경로 — 결과 병합
 * 5. recommend: Claude 실패 → 폴백(점수 기반 상위 5개)
 * 6. recommend: 후보 없음 → 빈 배열
 */

jest.mock('../../../services/claudeService');

const { recommend } = require('../../../services/recommendService');
const { getAiRecommendations } = require('../../../services/claudeService');
const {
  mockAllShoes,
  mockUserProfileLong,
  mockUserProfileShortWide,
  mockUserProfileFlat,
  mockUserProfileHighArch,
  mockShoeStability,
  mockShoeNeutralArch,
} = require('../../helpers/fixtures');

// ============================================================
// filterCandidates — 예산 필터
// ============================================================

describe('recommend — 예산 필터링', () => {
  it('예산 low(7만원 이하) 초과 신발은 제외된다', async () => {
    // mockAllShoes 중 가격 65,000원인 SHOE004만 'low' 예산 통과
    const lowBudgetProfile = { ...mockUserProfileLong, budget: 'low', foot_width: 'normal' };

    // Claude mock: 통과된 후보 중 첫 번째를 그대로 반환
    getAiRecommendations.mockResolvedValue([
      { rank: 1, goods_no: 'SHOE004', reason: '가성비 최고' },
    ]);

    const result = await recommend(lowBudgetProfile, mockAllShoes);

    // Claude에 전달된 candidates는 SHOE004만 포함해야 함
    const calledCandidates = getAiRecommendations.mock.calls[0][1];
    expect(calledCandidates.every((s) => s.price <= 70000)).toBe(true);
    expect(result[0].goods_no).toBe('SHOE004');
  });
});

// ============================================================
// filterCandidates — 발볼 필터
// ============================================================

describe('recommend — 발볼 필터링', () => {
  it('wide 사용자에게 좁음 신발은 제외된다', async () => {
    getAiRecommendations.mockResolvedValue([
      { rank: 1, goods_no: 'SHOE001', reason: '보통 발볼' },
    ]);

    await recommend(mockUserProfileShortWide, mockAllShoes);

    const calledCandidates = getAiRecommendations.mock.calls[0][1];
    const hasNarrow = calledCandidates.some((s) => s.width === '좁음');
    expect(hasNarrow).toBe(false);
  });
});

// ============================================================
// recommend — Claude 성공 경로
// ============================================================

describe('recommend — Claude 성공 경로', () => {
  it('Claude 결과와 신발 메타데이터를 병합하여 반환한다', async () => {
    getAiRecommendations.mockResolvedValue([
      { rank: 1, goods_no: 'SHOE001', reason: '장거리에 최적' },
      { rank: 2, goods_no: 'SHOE002', reason: '카본 플레이트로 속도 향상' },
    ]);

    const result = await recommend(mockUserProfileLong, mockAllShoes);

    // 반환값에 신발 메타 + Claude reason + is_fallback 포함 여부 확인
    expect(result[0].rank).toBe(1);
    expect(result[0].goods_no).toBe('SHOE001');
    expect(result[0].goods_name).toBe('아식스 젤-카야노 31');
    expect(result[0].reason).toBe('장거리에 최적');
    expect(result[0].is_fallback).toBe(false);
    expect(typeof result[0].match_score).toBe('number');
  });

  it('Claude가 존재하지 않는 goods_no를 반환하면 해당 항목은 제거된다', async () => {
    getAiRecommendations.mockResolvedValue([
      { rank: 1, goods_no: 'SHOE001', reason: '정상 항목' },
      { rank: 2, goods_no: 'SHOE_NOT_EXIST', reason: '없는 신발' },
    ]);

    const result = await recommend(mockUserProfileLong, mockAllShoes);

    expect(result.length).toBe(1);
    expect(result[0].goods_no).toBe('SHOE001');
  });
});

// ============================================================
// recommend — Claude 실패 시 폴백
// ============================================================

describe('recommend — Claude 실패 폴백', () => {
  it('Claude API 실패 시 점수 상위 5개를 is_fallback:true로 반환한다', async () => {
    getAiRecommendations.mockRejectedValue(new Error('CLAUDE_TIMEOUT'));

    const result = await recommend(mockUserProfileLong, mockAllShoes);

    expect(result.length).toBeGreaterThan(0);
    expect(result.every((r) => r.is_fallback === true)).toBe(true);
    expect(result[0].reason).toBeTruthy(); // 폴백 reason 존재
  });

  it('폴백 결과는 match_score 내림차순으로 정렬된다', async () => {
    getAiRecommendations.mockRejectedValue(new Error('API Error'));

    const result = await recommend(mockUserProfileLong, mockAllShoes);

    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].match_score).toBeGreaterThanOrEqual(result[i + 1].match_score);
    }
  });
});

// ============================================================
// recommend — 후보 없음
// ============================================================

describe('recommend — 후보 없음', () => {
  it('모든 신발이 예산 초과면 빈 배열을 반환한다', async () => {
    const ultraLowBudgetProfile = {
      ...mockUserProfileLong,
      budget: 'low',
      foot_width: 'normal',
    };

    // 모든 신발이 예산(7만원) 초과인 경우를 시뮬레이션
    const expensiveShoes = mockAllShoes.map((s) => ({ ...s, price: 200000 }));

    const result = await recommend(ultraLowBudgetProfile, expensiveShoes);

    expect(result).toEqual([]);
    // Claude는 호출되지 않아야 함
    expect(getAiRecommendations).not.toHaveBeenCalled();
  });
});

// ============================================================
// v2.7 족형(foot_shape) — calcScore 스코어링
// ============================================================

describe('recommend — 족형 calcScore 스코어링 (폴백 경로)', () => {
  /**
   * 폴백(Claude 실패) 경로에서 match_score가 실제 calcScore 결과이므로
   * 이 경로를 통해 족형 보너스/패널티를 검증한다.
   *
   * mockUserProfileFlat = { foot_shape: 'egyptian', foot_width: 'narrow', ... }
   * mockShoeStability   = { width: '좁음', toe_fit: 'egyptian' }  ← egyptian 특화
   * mockShoeNeutralArch = { width: '좁음', toe_fit: 'all' }       ← 범용
   * 두 신발 모두 width='좁음' → 발볼 점수 동일, toe_fit 차이만 검증
   *
   * 예상 점수 (mockUserProfileFlat 기준):
   *   SHOE_STAB: +40(발볼) +0(쿠션) +20(거리) +10(예산) +10(toe_fit) -10(발볼패널티) = 70
   *   SHOE_NEUT: +40(발볼) +0(쿠션) +20(거리) +10(예산) +0(toe_fit)  -10(발볼패널티) = 60
   *   → 이집트형 특화 신발이 10점 높음
   */
  it('이집트형(egyptian) 특화 신발이 범용 신발보다 match_score가 높다', async () => {
    getAiRecommendations.mockRejectedValue(new Error('forced_fallback'));

    const result = await recommend(
      mockUserProfileFlat,
      [mockShoeStability, mockShoeNeutralArch]
    );

    const stabResult = result.find((r) => r.goods_no === 'SHOE_STAB');
    const neutResult = result.find((r) => r.goods_no === 'SHOE_NEUT');

    expect(stabResult).toBeDefined();
    expect(neutResult).toBeDefined();
    expect(stabResult.match_score).toBeGreaterThan(neutResult.match_score);
  });

  /**
   * 그리스형(greek): SHAPE_WIDTH_PREF['greek'] = 'normal'
   * 넓은 발볼 선호가 없으므로 좁은 신발(toe_fit=all)이 감점 없이 높은 발볼 점수
   * 이집트형 특화 신발보다 범용 신발이 더 높거나 비슷해야 함
   */
  it('그리스형(greek) 사용자에게 이집트형 특화 신발 감점이 없다 (범용 신발이 더 높음)', async () => {
    getAiRecommendations.mockRejectedValue(new Error('forced_fallback'));

    const result = await recommend(
      mockUserProfileHighArch,  // foot_shape: 'greek'
      [mockShoeStability, mockShoeNeutralArch]
    );

    const stabResult = result.find((r) => r.goods_no === 'SHOE_STAB');
    const neutResult = result.find((r) => r.goods_no === 'SHOE_NEUT');

    // greek은 발볼 wide 선호 없음 → 좁은 발볼 신발(SHOE_NEUT)이 발볼 점수 +40
    // 이집트형 특화 신발(SHOE_STAB)은 toe_fit 미매칭 + 발볼 보너스 없음 → SHOE_NEUT가 유리
    expect(neutResult.match_score).toBeGreaterThanOrEqual(stabResult.match_score);
  });

  it('족형 미입력(null) 시 족형 보너스/패널티가 없어 족형 입력보다 낮은 점수를 받는다', async () => {
    getAiRecommendations.mockRejectedValue(new Error('forced_fallback'));

    const profileNoShape = { ...mockUserProfileFlat, foot_shape: null };
    const profileWithShape = { ...mockUserProfileFlat, foot_shape: 'egyptian' };

    const resultNoShape = await recommend(profileNoShape, [mockShoeStability]);
    const resultWithShape = await recommend(profileWithShape, [mockShoeStability]);

    // foot_shape=null 은 족형 보너스 없음, foot_shape=egyptian은 toe_fit+발볼 보너스 있음
    expect(resultNoShape[0].match_score).toBeLessThan(resultWithShape[0].match_score);
  });
});

// ============================================================
// v2.7 족형(foot_shape) — fallbackReason 메시지
// ============================================================

describe('recommend — fallbackReason 족형 메시지', () => {
  it('이집트형(egyptian) + toe_fit=egyptian 신발 → 폴백 reason에 이집트형 관련 문구 포함', async () => {
    getAiRecommendations.mockRejectedValue(new Error('forced_fallback'));

    const result = await recommend(mockUserProfileFlat, [mockShoeStability]);

    expect(result[0].is_fallback).toBe(true);
    expect(result[0].reason).toMatch(/이집트형|toe box/);
  });
});

// ============================================================
// v2.7 족형(foot_shape) — filterCandidates 처리
// ============================================================

describe('recommend — foot_shape 포함 프로파일 처리', () => {
  it('foot_shape 포함 user_profile로 오류 없이 추천 결과를 반환한다', async () => {
    getAiRecommendations.mockResolvedValue([
      { rank: 1, goods_no: 'SHOE_STAB', reason: '이집트형에 적합한 신발' },
    ]);

    await expect(
      recommend(mockUserProfileFlat, [mockShoeStability])
    ).resolves.not.toThrow();
  });

  it('알 수 없는 foot_shape 값이 들어와도 오류 없이 처리된다 (방어 처리)', async () => {
    getAiRecommendations.mockRejectedValue(new Error('forced_fallback'));

    const profileUnknownShape = { ...mockUserProfileFlat, foot_shape: 'invalid_value' };

    await expect(
      recommend(profileUnknownShape, [mockShoeStability])
    ).resolves.not.toThrow();
  });
});
