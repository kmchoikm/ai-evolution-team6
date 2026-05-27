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
// v2.1 족형(foot_arch) — calcScore 스코어링
// ============================================================

describe('recommend — 족형 calcScore 스코어링 (폴백 경로)', () => {
  /**
   * 폴백(Claude 실패) 경로에서 match_score가 실제 calcScore 결과이므로
   * 이 경로를 통해 족형 보너스/패널티를 검증한다.
   *
   * 기대 점수 (mockUserProfileFlat 기준):
   *   stability 신발: +40(발볼) +0(쿠션) +20(거리) +10(예산) +15(arch) = 85
   *   neutral   신발: +40(발볼) +0(쿠션) +20(거리) +10(예산) -10(arch) = 60
   */
  it('평발(flat) + stability 신발이 neutral 신발보다 match_score가 최소 15점 높다', async () => {
    getAiRecommendations.mockRejectedValue(new Error('forced_fallback'));

    const result = await recommend(
      mockUserProfileFlat,
      [mockShoeStability, mockShoeNeutralArch]
    );

    const stabResult = result.find((r) => r.goods_no === 'SHOE_STAB');
    const neutResult = result.find((r) => r.goods_no === 'SHOE_NEUT');

    expect(stabResult).toBeDefined();
    expect(neutResult).toBeDefined();
    expect(stabResult.match_score - neutResult.match_score).toBeGreaterThanOrEqual(15);
  });

  /**
   * 오목발(high) 기준:
   *   neutral  신발: +40 +0 +20 +10 +15(arch) = 85
   *   stability신발: +40 +0 +20 +10  +0(arch) = 70
   */
  it('오목발(high) + neutral 신발이 stability 신발보다 높은 match_score를 받는다', async () => {
    getAiRecommendations.mockRejectedValue(new Error('forced_fallback'));

    const result = await recommend(
      mockUserProfileHighArch,
      [mockShoeStability, mockShoeNeutralArch]
    );

    const neutResult = result.find((r) => r.goods_no === 'SHOE_NEUT');
    const stabResult = result.find((r) => r.goods_no === 'SHOE_STAB');

    expect(neutResult.match_score).toBeGreaterThan(stabResult.match_score);
  });

  it('족형 미입력(null) 시 arch 보너스/패널티가 없어 족형 입력보다 낮은 점수를 받는다', async () => {
    getAiRecommendations.mockRejectedValue(new Error('forced_fallback'));

    const profileNoArch = { ...mockUserProfileFlat, foot_arch: null };
    const profileWithArch = { ...mockUserProfileFlat, foot_arch: 'flat' };

    const resultNoArch = await recommend(profileNoArch, [mockShoeStability]);
    const resultWithArch = await recommend(profileWithArch, [mockShoeStability]);

    // foot_arch=null 은 보너스 없음(70점), foot_arch=flat은 +15(85점)
    expect(resultNoArch[0].match_score).toBeLessThan(resultWithArch[0].match_score);
  });
});

// ============================================================
// v2.1 족형(foot_arch) — fallbackReason 메시지
// ============================================================

describe('recommend — fallbackReason 족형 메시지', () => {
  it('평발(flat) + stability 신발 → 폴백 reason에 평발/과내전 문구 포함', async () => {
    getAiRecommendations.mockRejectedValue(new Error('forced_fallback'));

    const result = await recommend(mockUserProfileFlat, [mockShoeStability]);

    expect(result[0].is_fallback).toBe(true);
    expect(result[0].reason).toMatch(/평발|과내전/);
  });

  it('오목발(high) + neutral 신발 → 폴백 reason에 오목발 문구 포함', async () => {
    getAiRecommendations.mockRejectedValue(new Error('forced_fallback'));

    const result = await recommend(mockUserProfileHighArch, [mockShoeNeutralArch]);

    expect(result[0].is_fallback).toBe(true);
    expect(result[0].reason).toMatch(/오목발/);
  });
});

// ============================================================
// v2.1 족형(foot_arch) — filterCandidates 처리
// ============================================================

describe('recommend — foot_arch 포함 프로파일 처리', () => {
  it('foot_arch 포함 user_profile로 오류 없이 추천 결과를 반환한다', async () => {
    getAiRecommendations.mockResolvedValue([
      { rank: 1, goods_no: 'SHOE_STAB', reason: '평발에 적합한 안정화' },
    ]);

    await expect(
      recommend(mockUserProfileFlat, [mockShoeStability])
    ).resolves.not.toThrow();
  });

  it('알 수 없는 foot_arch 값이 들어와도 오류 없이 처리된다 (방어 처리)', async () => {
    getAiRecommendations.mockRejectedValue(new Error('forced_fallback'));

    const profileUnknownArch = { ...mockUserProfileFlat, foot_arch: 'invalid_value' };

    await expect(
      recommend(profileUnknownArch, [mockShoeStability])
    ).resolves.not.toThrow();
  });
});
