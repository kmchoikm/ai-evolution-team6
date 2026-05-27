/**
 * claudeService 단위 테스트
 * @anthropic-ai/sdk는 jest.mock()으로 완전 목킹
 *
 * 검증 항목:
 * 1. getAiRecommendations: 정상 응답 파싱
 * 2. getAiRecommendations: 코드블록(```json```) 래핑된 응답 파싱
 * 3. getAiRecommendations: AbortError(타임아웃) → CLAUDE_TIMEOUT 에러
 * 4. getSocksRecommendation: 정상 응답 파싱
 * 5. getOutfitRecommendation: 정상 응답 파싱
 */

jest.mock('@anthropic-ai/sdk');

const Anthropic = require('@anthropic-ai/sdk');
const {
  getAiRecommendations,
  getSocksRecommendation,
  getOutfitRecommendation,
} = require('../../../services/claudeService');
const { mockAllShoes, mockUserProfileLong } = require('../../helpers/fixtures');

// Claude API 응답을 흉내내는 mock 팩토리
function mockClaudeResponse(text) {
  return {
    content: [{ text }],
  };
}

// ============================================================
// getAiRecommendations — 정상 응답
// ============================================================

describe('getAiRecommendations — 정상 응답', () => {
  it('JSON 배열을 올바르게 파싱하여 반환한다', async () => {
    const aiResponse = JSON.stringify([
      { rank: 1, goods_no: 'SHOE001', reason: '발볼과 쿠션이 일치합니다.' },
      { rank: 2, goods_no: 'SHOE002', reason: '경량으로 속도에 유리합니다.' },
    ]);

    const mockCreate = jest.fn().mockResolvedValue(mockClaudeResponse(aiResponse));
    Anthropic.mockImplementation(() => ({
      messages: { create: mockCreate },
    }));

    const candidates = mockAllShoes.slice(0, 3);
    const result = await getAiRecommendations(mockUserProfileLong, candidates);

    expect(result).toHaveLength(2);
    expect(result[0].rank).toBe(1);
    expect(result[0].goods_no).toBe('SHOE001');
    expect(result[0].reason).toBe('발볼과 쿠션이 일치합니다.');
  });
});

// ============================================================
// getAiRecommendations — 코드블록 래핑 응답
// ============================================================

describe('getAiRecommendations — 코드블록 래핑 응답', () => {
  it('```json ... ``` 래핑을 제거하고 JSON을 파싱한다', async () => {
    const wrappedResponse =
      '```json\n[{"rank":1,"goods_no":"SHOE001","reason":"테스트"}]\n```';

    const mockCreate = jest.fn().mockResolvedValue(mockClaudeResponse(wrappedResponse));
    Anthropic.mockImplementation(() => ({
      messages: { create: mockCreate },
    }));

    const result = await getAiRecommendations(mockUserProfileLong, mockAllShoes.slice(0, 2));

    expect(result[0].goods_no).toBe('SHOE001');
  });
});

// ============================================================
// getAiRecommendations — AbortError (타임아웃)
// ============================================================

describe('getAiRecommendations — 타임아웃', () => {
  it('AbortError 발생 시 CLAUDE_TIMEOUT 에러를 throw한다', async () => {
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';

    const mockCreate = jest.fn().mockRejectedValue(abortError);
    Anthropic.mockImplementation(() => ({
      messages: { create: mockCreate },
    }));

    await expect(
      getAiRecommendations(mockUserProfileLong, mockAllShoes.slice(0, 2))
    ).rejects.toThrow('CLAUDE_TIMEOUT');
  });
});

// ============================================================
// getSocksRecommendation — 정상 응답
// ============================================================

describe('getSocksRecommendation — 정상 응답', () => {
  it('양말 색상 3개를 파싱하여 반환한다', async () => {
    const socksResponse = JSON.stringify([
      { color_name: '흰색', hex_code: '#FFFFFF', reason: '모든 신발에 어울림' },
      { color_name: '검정', hex_code: '#000000', reason: '대비 효과' },
      { color_name: '하늘색', hex_code: '#87CEEB', reason: '포인트 컬러' },
    ]);

    const mockCreate = jest.fn().mockResolvedValue(mockClaudeResponse(socksResponse));
    Anthropic.mockImplementation(() => ({
      messages: { create: mockCreate },
    }));

    const result = await getSocksRecommendation('White', 'Black');

    expect(result).toHaveLength(3);
    expect(result[0].color_name).toBe('흰색');
    expect(result[0].hex_code).toBe('#FFFFFF');
    expect(result[0].reason).toBeTruthy();
  });
});

// ============================================================
// getOutfitRecommendation — 정상 응답
// ============================================================

describe('getOutfitRecommendation — 정상 응답', () => {
  it('상의/하의/모자 코디 3개를 파싱하여 반환한다', async () => {
    const outfitResponse = JSON.stringify([
      {
        item: '상의',
        suggestions: [{ color_name: '흰색', hex_code: '#FFFFFF', reason: '깔끔함' }],
      },
      {
        item: '하의',
        suggestions: [{ color_name: '검정', hex_code: '#000000', reason: '슬림해 보임' }],
      },
      {
        item: '모자',
        suggestions: [{ color_name: '회색', hex_code: '#808080', reason: '무난함' }],
      },
    ]);

    const mockCreate = jest.fn().mockResolvedValue(mockClaudeResponse(outfitResponse));
    Anthropic.mockImplementation(() => ({
      messages: { create: mockCreate },
    }));

    const result = await getOutfitRecommendation('White', 'Black', 'White');

    expect(result).toHaveLength(3);
    expect(result.map((r) => r.item)).toEqual(['상의', '하의', '모자']);
  });
});
