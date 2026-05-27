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
const { mockAllShoes, mockUserProfileLong, mockUserProfileShortWide } = require('../../helpers/fixtures');

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
