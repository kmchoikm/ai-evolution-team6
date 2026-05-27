/**
 * GET /api/shoes, POST /api/shoes/lifespan 통합 테스트
 * sheetsService는 jest.mock()으로 완전 목킹
 *
 * 검증 항목:
 * [GET /api/shoes]
 * 1. 성공 경로 — 신발 목록 반환 (간소화된 필드)
 * 2. brand 쿼리 필터
 * 3. keyword 쿼리 필터 (대소문자 무시)
 * 4. 결과 없음 → 200 status=no_match
 * 5. Sheets 실패 → 503
 *
 * [POST /api/shoes/lifespan]
 * 6. goods_no 누락 → 400
 * 7. purchase_year_month 형식 오류 → 400
 * 8. weekly_km, total_km 모두 누락 → 400
 * 9. 성공 경로 (total_km) — verdict 포함
 * 10. 존재하지 않는 goods_no → 404
 * 11. Sheets 실패 → 503
 */

const request = require('supertest');

jest.mock('../../../services/sheetsService');
const sheetsService = require('../../../services/sheetsService');

const app = require('../../../app');
const { mockAllShoes, mockShoeNormal, mockShoeCarbonPlate } = require('../../helpers/fixtures');

// ============================================================
// GET /api/shoes
// ============================================================

describe('GET /api/shoes — 성공 경로', () => {
  it('신발 목록을 간소화된 필드로 반환한다', async () => {
    sheetsService.getAllShoes.mockResolvedValue(mockAllShoes);

    const res = await request(app).get('/api/shoes');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.shoes).toHaveLength(mockAllShoes.length);
    // 간소화 필드만 포함: goods_no, goods_name, brand, has_carbon_plate, lifespan_km_*
    const shoe = res.body.shoes[0];
    expect(shoe.goods_no).toBeDefined();
    expect(shoe.goods_name).toBeDefined();
    expect(shoe.brand).toBeDefined();
    // 내부 필드(weight, cushion 등)는 노출되지 않음
    expect(shoe.cushion).toBeUndefined();
    expect(shoe.weight).toBeUndefined();
  });

  it('brand 쿼리로 정확히 일치하는 신발만 반환한다', async () => {
    sheetsService.getAllShoes.mockResolvedValue(mockAllShoes);

    const res = await request(app).get('/api/shoes?brand=ASICS');

    expect(res.status).toBe(200);
    expect(res.body.shoes.every((s) => s.brand === 'ASICS')).toBe(true);
  });

  it('keyword 쿼리로 모델명 부분 일치 검색을 한다', async () => {
    sheetsService.getAllShoes.mockResolvedValue(mockAllShoes);

    // '카야노'는 '아식스 젤-카야노 31'에 포함됨
    const res = await request(app).get('/api/shoes?keyword=카야노');

    expect(res.status).toBe(200);
    expect(res.body.shoes.length).toBeGreaterThan(0);
    expect(res.body.shoes.every((s) => s.goods_name.includes('카야노'))).toBe(true);
  });

  it('조건에 맞는 신발이 없으면 200 status=no_match를 반환한다', async () => {
    sheetsService.getAllShoes.mockResolvedValue(mockAllShoes);

    const res = await request(app).get('/api/shoes?brand=UNKNOWN_BRAND');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('no_match');
    expect(res.body.shoes).toEqual([]);
  });

  it('Sheets 조회 실패 시 503을 반환한다', async () => {
    sheetsService.getAllShoes.mockRejectedValue(new Error('Sheets 연결 실패'));

    const res = await request(app).get('/api/shoes');

    expect(res.status).toBe(503);
    expect(res.body.status).toBe('error');
  });
});

// ============================================================
// POST /api/shoes/lifespan — 입력 유효성 검사
// ============================================================

describe('POST /api/shoes/lifespan — 입력 유효성 검사', () => {
  it('goods_no 누락 시 400을 반환한다', async () => {
    const res = await request(app)
      .post('/api/shoes/lifespan')
      .send({ purchase_year_month: '2024-01', total_km: 200 });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
    expect(res.body.message).toMatch('goods_no');
  });

  it("purchase_year_month가 'YYYY-MM' 형식이 아니면 400을 반환한다", async () => {
    const res = await request(app)
      .post('/api/shoes/lifespan')
      .send({ goods_no: 'SHOE001', purchase_year_month: '2024/01', total_km: 200 });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch('YYYY-MM');
  });

  it('weekly_km과 total_km 모두 없으면 400을 반환한다', async () => {
    const res = await request(app)
      .post('/api/shoes/lifespan')
      .send({ goods_no: 'SHOE001', purchase_year_month: '2024-01' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch('weekly_km');
  });
});

// ============================================================
// POST /api/shoes/lifespan — 성공 경로
// ============================================================

describe('POST /api/shoes/lifespan — 성공 경로', () => {
  it('total_km 기준으로 교체 시기를 계산하여 반환한다', async () => {
    sheetsService.getShoeByNo.mockResolvedValue(mockShoeNormal);

    const res = await request(app)
      .post('/api/shoes/lifespan')
      .send({
        goods_no: 'SHOE001',
        purchase_year_month: '2024-01',
        total_km: 400,
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.verdict).toBeDefined();
    expect(res.body.usage_rate).toBeDefined();
    expect(res.body.remaining_km).toBeDefined();
    expect(res.body.message).toBeDefined();
  });

  it('카본 플레이트 신발은 300~500km 수명을 기준으로 계산한다', async () => {
    sheetsService.getShoeByNo.mockResolvedValue(mockShoeCarbonPlate);

    const res = await request(app)
      .post('/api/shoes/lifespan')
      .send({
        goods_no: 'SHOE002',
        purchase_year_month: '2024-01',
        total_km: 400,
      });

    expect(res.status).toBe(200);
    // 카본: avgLifespan=400, usageRate=100 → replace_recommended
    expect(res.body.lifespan_km_min).toBe(300);
    expect(res.body.lifespan_km_max).toBe(500);
    expect(res.body.verdict).toBe('replace_recommended');
  });
});

// ============================================================
// POST /api/shoes/lifespan — 에러 케이스
// ============================================================

describe('POST /api/shoes/lifespan — 에러 케이스', () => {
  it('존재하지 않는 goods_no이면 404를 반환한다', async () => {
    sheetsService.getShoeByNo.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/shoes/lifespan')
      .send({
        goods_no: 'SHOE_NOT_EXIST',
        purchase_year_month: '2024-01',
        total_km: 200,
      });

    expect(res.status).toBe(404);
    expect(res.body.status).toBe('error');
    expect(res.body.message).toMatch('찾을 수 없습니다');
  });

  it('Sheets 조회 실패 시 503을 반환한다', async () => {
    sheetsService.getShoeByNo.mockRejectedValue(new Error('Sheets 연결 실패'));

    const res = await request(app)
      .post('/api/shoes/lifespan')
      .send({
        goods_no: 'SHOE001',
        purchase_year_month: '2024-01',
        total_km: 200,
      });

    expect(res.status).toBe(503);
    expect(res.body.status).toBe('error');
  });
});
