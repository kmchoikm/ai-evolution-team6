/**
 * GET /api/race-winners 통합 테스트
 * sheetsService는 jest.mock()으로 완전 목킹
 *
 * 검증 항목:
 * 1. 성공 경로 — 우승자 목록 반환
 * 2. race_name 부분 일치 필터
 * 3. race_year 필터
 * 4. course_type 필터
 * 5. 결과 없음 → 200 status=no_match
 * 6. Sheets 조회 실패 → 503
 */

const request = require('supertest');

jest.mock('../../../services/sheetsService');
const sheetsService = require('../../../services/sheetsService');

const app = require('../../../app');
const { mockAllWinners, mockRaceWinner } = require('../../helpers/fixtures');

describe('GET /api/race-winners — 성공 경로', () => {
  beforeEach(() => {
    sheetsService.getAllShoes.mockResolvedValue([]);
  });

  it('우승자 목록을 반환한다', async () => {
    sheetsService.getRaceWinners.mockResolvedValue(mockAllWinners);

    const res = await request(app).get('/api/race-winners');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.winners).toHaveLength(1);
    expect(res.body.winners[0].winner_id).toBe('WIN001');
  });

  it('race_name 부분 일치로 필터링한다', async () => {
    sheetsService.getRaceWinners.mockResolvedValue(mockAllWinners);

    const res = await request(app).get('/api/race-winners?race_name=서울');

    expect(res.status).toBe(200);
    expect(res.body.winners.every((w) => w.race_name.includes('서울'))).toBe(true);
  });

  it('race_year로 필터링한다', async () => {
    sheetsService.getRaceWinners.mockResolvedValue(mockAllWinners);

    const res = await request(app).get('/api/race-winners?race_year=2024');

    expect(res.status).toBe(200);
    expect(res.body.winners.every((w) => w.race_year === 2024)).toBe(true);
  });

  it('course_type으로 필터링한다', async () => {
    sheetsService.getRaceWinners.mockResolvedValue(mockAllWinners);

    const res = await request(app).get('/api/race-winners?course_type=full');

    expect(res.status).toBe(200);
    expect(res.body.winners.every((w) => w.course_type === 'full')).toBe(true);
  });

  it('shoes 조인 결과가 응답에 포함된다', async () => {
    const mockShoe = { goods_no: 'G001', goods_name: '테스트 신발', brand: '나이키', price: 100000, url: 'https://musinsa.com', thumbnail: '' };
    sheetsService.getRaceWinners.mockResolvedValue([{ ...mockAllWinners[0], goods_no: 'G001' }]);
    sheetsService.getAllShoes.mockResolvedValue([mockShoe]);

    const res = await request(app).get('/api/race-winners');

    expect(res.status).toBe(200);
    expect(res.body.winners[0].shoe).toBeDefined();
    expect(res.body.winners[0].shoe.goods_name).toBe('테스트 신발');
  });

  it('goods_no가 Shoes에 없으면 shoe는 null이다', async () => {
    sheetsService.getRaceWinners.mockResolvedValue(mockAllWinners);
    sheetsService.getAllShoes.mockResolvedValue([]);

    const res = await request(app).get('/api/race-winners');

    expect(res.status).toBe(200);
    expect(res.body.winners[0].shoe).toBeNull();
  });
});

describe('GET /api/race-winners — 결과 없음', () => {
  it('조건에 맞는 우승자가 없으면 200 status=no_match를 반환한다', async () => {
    sheetsService.getRaceWinners.mockResolvedValue(mockAllWinners);
    sheetsService.getAllShoes.mockResolvedValue([]);

    const res = await request(app).get('/api/race-winners?race_year=1900');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('no_match');
    expect(res.body.winners).toEqual([]);
  });
});

describe('GET /api/race-winners — Sheets 실패', () => {
  it('Sheets 조회 실패 시 503을 반환한다', async () => {
    sheetsService.getRaceWinners.mockRejectedValue(new Error('Sheets 연결 실패'));

    const res = await request(app).get('/api/race-winners');

    expect(res.status).toBe(503);
    expect(res.body.status).toBe('error');
  });
});
