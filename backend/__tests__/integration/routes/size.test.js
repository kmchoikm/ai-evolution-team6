/**
 * POST /api/size/convert 통합 테스트
 * sheetsService는 jest.mock()으로 완전 목킹
 *
 * 검증 항목:
 * 1. 필수 파라미터 누락 → 400
 * 2. from_size_mm가 숫자가 아님 → 400
 * 3. 성공 경로 — high confidence (두 모델 정확 매칭)
 * 4. 성공 경로 — medium confidence (한쪽만 정확 매칭)
 * 5. 성공 경로 — no guide data → 현재 사이즈 그대로 추천
 * 6. 와이드 핏 경고 메시지 포함
 * 7. Sheets 실패 → 503
 */

const request = require('supertest');

jest.mock('../../../services/sheetsService');
const sheetsService = require('../../../services/sheetsService');

const app = require('../../../app');
const {
  mockSizeGuideAsics,
  mockSizeGuideNike,
  mockSizeGuideNikeWildcard,
  mockAllSizeGuides,
} = require('../../helpers/fixtures');

// ============================================================
// 입력 유효성 검사
// ============================================================

describe('POST /api/size/convert — 입력 유효성 검사', () => {
  it('필수 파라미터 누락 시 400을 반환한다', async () => {
    const res = await request(app)
      .post('/api/size/convert')
      .send({ from_brand: 'ASICS', from_size_mm: 270 });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
    expect(res.body.message).toMatch('필수');
  });

  it('from_size_mm가 숫자가 아니면 400을 반환한다', async () => {
    const res = await request(app)
      .post('/api/size/convert')
      .send({
        from_brand: 'ASICS',
        from_model: '젤-카야노 31',
        from_size_mm: 'ABC',
        to_brand: 'Nike',
        to_model: '줌 플라이 5',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch('숫자');
  });
});

// ============================================================
// 성공 경로 — high confidence
// ============================================================

describe('POST /api/size/convert — high confidence', () => {
  it('두 모델 모두 정확 매칭이면 confidence=high를 반환한다', async () => {
    // ASICS 젤-카야노(adjust=0) → Nike 줌 플라이(adjust=+5)
    // recommended = 270 - 0 + 5 = 275
    sheetsService.getSizeGuide.mockResolvedValue([mockSizeGuideAsics, mockSizeGuideNike]);

    const res = await request(app)
      .post('/api/size/convert')
      .send({
        from_brand: 'ASICS',
        from_model: '젤-카야노 31',
        from_size_mm: 270,
        to_brand: 'Nike',
        to_model: '줌 플라이 5',
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.confidence).toBe('high');
    expect(res.body.recommended_size_mm).toBe(275);
  });
});

// ============================================================
// 성공 경로 — medium confidence (와일드카드 사용)
// ============================================================

describe('POST /api/size/convert — medium confidence', () => {
  it('한쪽이 와일드카드(*) 매칭이면 confidence=medium을 반환한다', async () => {
    // from: ASICS 젤-카야노(exact, adjust=0)
    // to: Nike * (wildcard, adjust=5)
    sheetsService.getSizeGuide.mockResolvedValue([mockSizeGuideAsics, mockSizeGuideNikeWildcard]);

    const res = await request(app)
      .post('/api/size/convert')
      .send({
        from_brand: 'ASICS',
        from_model: '젤-카야노 31',
        from_size_mm: 270,
        to_brand: 'Nike',
        to_model: '알 수 없는 모델',
      });

    expect(res.status).toBe(200);
    expect(res.body.confidence).toBe('medium');
  });
});

// ============================================================
// 성공 경로 — 가이드 데이터 없음
// ============================================================

describe('POST /api/size/convert — 가이드 데이터 없음', () => {
  it('두 브랜드 모두 가이드가 없으면 현재 사이즈를 그대로 추천한다', async () => {
    sheetsService.getSizeGuide.mockResolvedValue([]);

    const res = await request(app)
      .post('/api/size/convert')
      .send({
        from_brand: 'UNKNOWN_A',
        from_model: '모델A',
        from_size_mm: 270,
        to_brand: 'UNKNOWN_B',
        to_model: '모델B',
      });

    expect(res.status).toBe(200);
    expect(res.body.recommended_size_mm).toBe(270);
    expect(res.body.confidence).toBe('low');
    expect(res.body.fit_note).toMatch('데이터가 없어');
  });
});

// ============================================================
// 와이드 핏 경고
// ============================================================

describe('POST /api/size/convert — 와이드 핏 경고', () => {
  it('to 신발이 와이드 핏 경향이면 width_note를 반환한다', async () => {
    const wideGuide = { ...mockSizeGuideNike, width_tendency: 'wide', model_name: '넓은모델' };
    sheetsService.getSizeGuide.mockResolvedValue([mockSizeGuideAsics, wideGuide]);

    const res = await request(app)
      .post('/api/size/convert')
      .send({
        from_brand: 'ASICS',
        from_model: '젤-카야노 31',
        from_size_mm: 270,
        to_brand: 'Nike',
        to_model: '넓은모델',
      });

    expect(res.status).toBe(200);
    expect(res.body.width_note).toMatch('와이드 핏');
  });
});

// ============================================================
// Sheets 실패
// ============================================================

describe('POST /api/size/convert — Sheets 실패', () => {
  it('Sheets 조회 실패 시 503을 반환한다', async () => {
    sheetsService.getSizeGuide.mockRejectedValue(new Error('Sheets 연결 실패'));

    const res = await request(app)
      .post('/api/size/convert')
      .send({
        from_brand: 'ASICS',
        from_model: '젤-카야노 31',
        from_size_mm: 270,
        to_brand: 'Nike',
        to_model: '줌 플라이 5',
      });

    expect(res.status).toBe(503);
    expect(res.body.status).toBe('error');
  });
});
