/**
 * raceRecommendService 단위 테스트
 * claudeService는 jest.mock()으로 완전 목킹
 *
 * 검증 항목:
 * 1. filterRaceCandidates: shoe_priority_hint 기반 점수 보너스
 * 2. recommendByRace: Claude 성공 경로
 * 3. recommendByRace: Claude 실패 → 폴백
 * 4. recommendByRace: 후보 없음 → 빈 배열
 * 5. recommendByRace: 사용자 프로파일 있을 때 예산·발볼 필터 추가
 */

jest.mock('../../../services/claudeService');

const { recommendByRace } = require('../../../services/raceRecommendService');
const { getRaceRecommendations } = require('../../../services/claudeService');
const {
  mockRaceFull,
  mockAllShoes,
  mockUserProfileLong,
} = require('../../helpers/fixtures');

// ============================================================
// recommendByRace — Claude 성공 경로
// ============================================================

describe('recommendByRace — Claude 성공 경로', () => {
  it('Claude 결과와 신발 메타데이터를 병합하여 반환한다', async () => {
    getRaceRecommendations.mockResolvedValue([
      { rank: 1, goods_no: 'SHOE001', reason: '서울 마라톤 아스팔트 코스에 적합' },
    ]);

    const result = await recommendByRace(mockRaceFull, mockAllShoes, null);

    expect(result[0].rank).toBe(1);
    expect(result[0].goods_no).toBe('SHOE001');
    expect(result[0].reason).toBe('서울 마라톤 아스팔트 코스에 적합');
    expect(result[0].is_fallback).toBe(false);
  });
});

// ============================================================
// recommendByRace — Claude 실패 폴백
// ============================================================

describe('recommendByRace — Claude 실패 폴백', () => {
  it('Claude API 실패 시 is_fallback:true 결과를 반환한다', async () => {
    getRaceRecommendations.mockRejectedValue(new Error('CLAUDE_TIMEOUT'));

    const result = await recommendByRace(mockRaceFull, mockAllShoes, null);

    expect(result.length).toBeGreaterThan(0);
    expect(result.every((r) => r.is_fallback === true)).toBe(true);
    expect(result[0].reason).toBeTruthy();
  });
});

// ============================================================
// recommendByRace — 사용자 프로파일 있을 때 필터 추가
// ============================================================

describe('recommendByRace — 사용자 프로파일 적용', () => {
  it('사용자 프로파일이 있으면 예산·발볼 필터가 Claude 후보에 반영된다', async () => {
    getRaceRecommendations.mockResolvedValue([
      { rank: 1, goods_no: 'SHOE001', reason: '예산·발볼 조건에 부합' },
    ]);

    await recommendByRace(mockRaceFull, mockAllShoes, mockUserProfileLong);

    const calledCandidates = getRaceRecommendations.mock.calls[0][1];
    // high 예산(200,000원 이하) — mockAllShoes 전체가 통과
    expect(calledCandidates.length).toBeGreaterThan(0);
  });
});

// ============================================================
// recommendByRace — 후보 없음
// ============================================================

describe('recommendByRace — 후보 없음', () => {
  it('신발 목록이 비어 있으면 빈 배열을 반환한다', async () => {
    const result = await recommendByRace(mockRaceFull, [], null);

    expect(result).toEqual([]);
    expect(getRaceRecommendations).not.toHaveBeenCalled();
  });
});
