/**
 * GET /api/celebs, GET /api/celebs/:celeb_id 통합 테스트
 * sheetsService는 jest.mock()으로 완전 목킹
 *
 * 검증 항목:
 * 1. GET /api/celebs — 중복 제거된 셀럽 목록 반환
 * 2. GET /api/celebs — celeb_type 필터
 * 3. GET /api/celebs — 결과 없음 → 200 status=no_match
 * 4. GET /api/celebs — Sheets 실패 → 503
 * 5. GET /api/celebs/:id — 셀럽 정보 + 신발 목록 반환
 * 6. GET /api/celebs/:id — 존재하지 않는 id → 404
 * 7. GET /api/celebs/:id — Sheets 실패 → 503
 */

const request = require('supertest');

jest.mock('../../../services/sheetsService');
const sheetsService = require('../../../services/sheetsService');

const app = require('../../../app');
const {
  mockAllCelebs,
  mockCelebAthlete,
  mockCelebInfluencer,
  mockAllShoes,
  mockShoeNormal,
} = require('../../helpers/fixtures');

// ============================================================
// GET /api/celebs — 목록
// ============================================================

describe('GET /api/celebs — 목록', () => {
  it('celeb_id 기준으로 중복 제거된 셀럽 목록을 반환한다', async () => {
    // 같은 셀럽이 두 신발을 착용한 경우 (행 2개, 셀럽 1명)
    const duplicateCelebRows = [
      { ...mockCelebAthlete, goods_no: 'SHOE001' },
      { ...mockCelebAthlete, goods_no: 'SHOE002' },
      mockCelebInfluencer,
    ];
    sheetsService.getCelebs.mockResolvedValue(duplicateCelebRows);

    const res = await request(app).get('/api/celebs');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    // celeb_id 중복 제거 → CELEB001 1회 + CELEB002 1회 = 2명
    expect(res.body.celebs).toHaveLength(2);
  });

  it('celeb_type=athlete로 필터링한다', async () => {
    sheetsService.getCelebs.mockResolvedValue(mockAllCelebs);

    const res = await request(app).get('/api/celebs?celeb_type=athlete');

    expect(res.status).toBe(200);
    expect(res.body.celebs.every((c) => c.celeb_type === 'athlete')).toBe(true);
  });

  it('조건에 맞는 셀럽이 없으면 200 status=no_match를 반환한다', async () => {
    sheetsService.getCelebs.mockResolvedValue(mockAllCelebs);

    const res = await request(app).get('/api/celebs?celeb_type=musician');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('no_match');
    expect(res.body.celebs).toEqual([]);
  });

  it('Sheets 조회 실패 시 503을 반환한다', async () => {
    sheetsService.getCelebs.mockRejectedValue(new Error('Sheets 연결 실패'));

    const res = await request(app).get('/api/celebs');

    expect(res.status).toBe(503);
    expect(res.body.status).toBe('error');
  });
});

// ============================================================
// GET /api/celebs/:celeb_id
// ============================================================

describe('GET /api/celebs/:celeb_id — 상세', () => {
  it('셀럽 기본 정보와 착용 신발 목록을 반환한다', async () => {
    sheetsService.getCelebs.mockResolvedValue([
      { ...mockCelebAthlete, goods_no: 'SHOE001' },
    ]);
    // mockShoeNormal.goods_no === 'SHOE001'
    sheetsService.getAllShoes.mockResolvedValue([mockShoeNormal]);

    const res = await request(app).get('/api/celebs/CELEB001');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.celeb.celeb_id).toBe('CELEB001');
    expect(res.body.celeb.celeb_name).toBe('손흥민');
    expect(res.body.shoes).toHaveLength(1);
    expect(res.body.shoes[0].goods_no).toBe('SHOE001');
    // 반환 필드: goods_no, goods_name, brand, price, url, thumbnail, source_url
    expect(res.body.shoes[0].goods_name).toBe('아식스 젤-카야노 31');
  });

  it('존재하지 않는 celeb_id이면 404를 반환한다', async () => {
    sheetsService.getCelebs.mockResolvedValue(mockAllCelebs);
    sheetsService.getAllShoes.mockResolvedValue(mockAllShoes);

    const res = await request(app).get('/api/celebs/CELEB_NOT_EXIST');

    expect(res.status).toBe(404);
    expect(res.body.status).toBe('error');
  });

  it('Sheets 조회 실패 시 503을 반환한다', async () => {
    sheetsService.getCelebs.mockRejectedValue(new Error('Sheets 연결 실패'));

    const res = await request(app).get('/api/celebs/CELEB001');

    expect(res.status).toBe(503);
    expect(res.body.status).toBe('error');
  });
});
