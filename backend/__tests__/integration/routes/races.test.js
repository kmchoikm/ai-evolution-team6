/**
 * GET /api/races 통합 테스트
 * sheetsService는 jest.mock()으로 완전 목킹
 *
 * 검증 항목:
 * 1. 성공 경로 — 활성 대회만 반환
 * 2. country 쿼리 필터
 * 3. is_world_major 쿼리 필터
 * 4. course_type 쿼리 필터
 * 5. 결과 없음 → 200 status=no_match
 * 6. Sheets 조회 실패 → 503
 */

const request = require('supertest');

// sheetsService 전체 mock — getRaces만 사용
jest.mock('../../../services/sheetsService');
const sheetsService = require('../../../services/sheetsService');

const app = require('../../../app');
const { mockAllRaces, mockRaceFull, mockRaceHalf } = require('../../helpers/fixtures');

// ============================================================
// 성공 경로
// ============================================================

describe('GET /api/races — 성공 경로', () => {
  it('활성(is_active=true) 대회만 반환한다', async () => {
    // mockAllRaces = [RACE001(active), RACE002(active), RACE003(inactive)]
    sheetsService.getRaces.mockResolvedValue(mockAllRaces);

    const res = await request(app).get('/api/races');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    // 비활성(RACE003)은 제외
    expect(res.body.races.every((r) => r.is_active !== false)).toBe(true);
    expect(res.body.races.length).toBe(2);
  });

  it('country 쿼리로 필터링한다', async () => {
    sheetsService.getRaces.mockResolvedValue(mockAllRaces);

    const res = await request(app).get('/api/races?country=Korea');

    expect(res.status).toBe(200);
    expect(res.body.races.every((r) => r.country === 'Korea')).toBe(true);
  });

  it('is_world_major=true 쿼리로 필터링한다', async () => {
    const worldMajorRace = { ...mockRaceFull, is_world_major: true };
    sheetsService.getRaces.mockResolvedValue([worldMajorRace, mockRaceHalf]);

    const res = await request(app).get('/api/races?is_world_major=true');

    expect(res.status).toBe(200);
    expect(res.body.races.every((r) => r.is_world_major === true)).toBe(true);
  });

  it('course_type=full 쿼리로 필터링한다', async () => {
    sheetsService.getRaces.mockResolvedValue([mockRaceFull, mockRaceHalf]);

    const res = await request(app).get('/api/races?course_type=full');

    expect(res.status).toBe(200);
    expect(res.body.races.every((r) => r.course_type === 'full')).toBe(true);
  });
});

// ============================================================
// 결과 없음
// ============================================================

describe('GET /api/races — 결과 없음', () => {
  it('조건에 맞는 대회가 없으면 200 status=no_match를 반환한다', async () => {
    sheetsService.getRaces.mockResolvedValue([mockRaceFull]);

    const res = await request(app).get('/api/races?country=Japan');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('no_match');
    expect(res.body.races).toEqual([]);
  });
});

// ============================================================
// Sheets 실패
// ============================================================

describe('GET /api/races — Sheets 실패', () => {
  it('Sheets 조회 실패 시 503을 반환한다', async () => {
    sheetsService.getRaces.mockRejectedValue(new Error('Google Sheets 연결 실패'));

    const res = await request(app).get('/api/races');

    expect(res.status).toBe(503);
    expect(res.body.status).toBe('error');
    expect(res.body.message).toMatch('잠시 후 다시 시도');
  });
});
