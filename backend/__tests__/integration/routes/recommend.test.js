/**
 * POST /api/recommend, /race, /socks, /outfit 통합 테스트
 * sheetsService + claudeService는 jest.mock()으로 완전 목킹
 *
 * 검증 항목:
 * [POST /api/recommend]
 * 1. user_profile 누락 → 400
 * 2. running_distance 누락 → 400
 * 3. foot_width 누락 → 400
 * 4. 성공 경로 — 추천 결과 반환
 * 5. 결과 없음(no_match) → 200 status=no_match
 * 6. Sheets 조회 실패 → 503
 *
 * [POST /api/recommend/race]
 * 7. race_id 누락 → 400
 * 8. 잘못된 course_type → 400
 * 9. 성공 경로 — race 정보 + 추천 결과 반환
 * 10. 존재하지 않는 race_id → 404
 * 11. Sheets 조회 실패 → 503
 *
 * [POST /api/recommend/socks]
 * 12. goods_no 누락 → 400
 * 13. main_color 누락 → 400
 * 14. 성공 경로 — 양말 색상 3개 반환
 *
 * [POST /api/recommend/outfit]
 * 15. 필수 필드 누락 → 400
 * 16. 성공 경로 — 코디 3개 반환
 */

const request = require('supertest');

jest.mock('../../../services/sheetsService');
jest.mock('../../../services/claudeService');

const sheetsService = require('../../../services/sheetsService');
const claudeService = require('../../../services/claudeService');

const app = require('../../../app');
const {
  mockAllShoes,
  mockAllRaces,
  mockRaceFull,
  mockUserProfileLong,
} = require('../../helpers/fixtures');

// ============================================================
// POST /api/recommend — 입력 유효성 검사
// ============================================================

describe('POST /api/recommend — 입력 유효성 검사', () => {
  it('user_profile 누락 시 400을 반환한다', async () => {
    const res = await request(app).post('/api/recommend').send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch('user_profile');
  });

  it('running_distance 누락 시 400을 반환한다', async () => {
    const res = await request(app)
      .post('/api/recommend')
      .send({ user_profile: { foot_width: 'normal' } });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch('running_distance');
  });

  it('foot_width 누락 시 400을 반환한다', async () => {
    const res = await request(app)
      .post('/api/recommend')
      .send({ user_profile: { running_distance: 'long' } });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch('foot_width');
  });
});

// ============================================================
// POST /api/recommend — 성공 경로
// ============================================================

describe('POST /api/recommend — 성공 경로', () => {
  it('추천 결과를 반환한다', async () => {
    sheetsService.getAllShoes.mockResolvedValue(mockAllShoes);
    sheetsService.saveLog.mockResolvedValue(undefined);

    // recommendService 내부에서 claudeService.getAiRecommendations 호출
    claudeService.getAiRecommendations.mockResolvedValue([
      { rank: 1, goods_no: 'SHOE001', reason: '장거리에 최적' },
    ]);

    const res = await request(app)
      .post('/api/recommend')
      .send({ user_profile: mockUserProfileLong });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.recommendations).toBeInstanceOf(Array);
    expect(res.body.recommendations.length).toBeGreaterThan(0);
  });

  it('조건에 맞는 신발이 없으면 200 status=no_match를 반환한다', async () => {
    // 모든 신발을 예산 초과로 설정
    const expensiveShoes = mockAllShoes.map((s) => ({ ...s, price: 500000 }));
    sheetsService.getAllShoes.mockResolvedValue(expensiveShoes);

    const res = await request(app)
      .post('/api/recommend')
      .send({ user_profile: { ...mockUserProfileLong, budget: 'low' } });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('no_match');
    expect(res.body.recommendations).toEqual([]);
  });
});

// ============================================================
// POST /api/recommend — Sheets 실패
// ============================================================

describe('POST /api/recommend — Sheets 실패', () => {
  it('Sheets 조회 실패 시 503을 반환한다', async () => {
    sheetsService.getAllShoes.mockRejectedValue(new Error('Sheets 연결 실패'));

    const res = await request(app)
      .post('/api/recommend')
      .send({ user_profile: mockUserProfileLong });

    expect(res.status).toBe(503);
    expect(res.body.status).toBe('error');
    expect(res.body.message).toMatch('잠시 후 다시 시도');
  });
});

// ============================================================
// POST /api/recommend/race — 입력 유효성 검사
// ============================================================

describe('POST /api/recommend/race — 입력 유효성 검사', () => {
  it('race_id 누락 시 400을 반환한다', async () => {
    const res = await request(app)
      .post('/api/recommend/race')
      .send({ course_type: 'full' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch('race_id');
  });

  it("course_type이 'half' 또는 'full'이 아니면 400을 반환한다", async () => {
    const res = await request(app)
      .post('/api/recommend/race')
      .send({ race_id: 'RACE001', course_type: 'quarter' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch('course_type');
  });
});

// ============================================================
// POST /api/recommend/race — 성공 경로
// ============================================================

describe('POST /api/recommend/race — 성공 경로', () => {
  it('race 정보와 추천 결과를 함께 반환한다', async () => {
    sheetsService.getRaces.mockResolvedValue(mockAllRaces);
    sheetsService.getAllShoes.mockResolvedValue(mockAllShoes);

    claudeService.getRaceRecommendations.mockResolvedValue([
      { rank: 1, goods_no: 'SHOE001', reason: '서울 마라톤 코스에 적합' },
    ]);

    const res = await request(app)
      .post('/api/recommend/race')
      .send({ race_id: 'RACE001', course_type: 'full' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.race.race_name).toBe('서울 마라톤');
    expect(res.body.recommendations).toBeInstanceOf(Array);
  });

  it('존재하지 않는 race_id이면 404를 반환한다', async () => {
    sheetsService.getRaces.mockResolvedValue(mockAllRaces);
    sheetsService.getAllShoes.mockResolvedValue(mockAllShoes);

    const res = await request(app)
      .post('/api/recommend/race')
      .send({ race_id: 'RACE_NOT_EXIST', course_type: 'full' });

    expect(res.status).toBe(404);
    expect(res.body.status).toBe('error');
  });

  it('비활성 대회(is_active=false)이면 404를 반환한다', async () => {
    sheetsService.getRaces.mockResolvedValue(mockAllRaces); // RACE003는 is_active=false
    sheetsService.getAllShoes.mockResolvedValue(mockAllShoes);

    const res = await request(app)
      .post('/api/recommend/race')
      .send({ race_id: 'RACE003', course_type: 'full' });

    expect(res.status).toBe(404);
  });
});

// ============================================================
// POST /api/recommend/race — Sheets 실패
// ============================================================

describe('POST /api/recommend/race — Sheets 실패', () => {
  it('Sheets 조회 실패 시 503을 반환한다', async () => {
    sheetsService.getRaces.mockRejectedValue(new Error('Sheets 연결 실패'));

    const res = await request(app)
      .post('/api/recommend/race')
      .send({ race_id: 'RACE001', course_type: 'full' });

    expect(res.status).toBe(503);
    expect(res.body.status).toBe('error');
  });
});

// ============================================================
// POST /api/recommend/socks
// ============================================================

describe('POST /api/recommend/socks', () => {
  it('goods_no 누락 시 400을 반환한다', async () => {
    const res = await request(app)
      .post('/api/recommend/socks')
      .send({ main_color: 'White' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch('goods_no');
  });

  it('main_color 누락 시 400을 반환한다', async () => {
    const res = await request(app)
      .post('/api/recommend/socks')
      .send({ goods_no: 'SHOE001' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch('main_color');
  });

  it('양말 색상 3개를 반환한다', async () => {
    claudeService.getSocksRecommendation.mockResolvedValue([
      { color_name: '흰색', hex_code: '#FFFFFF', reason: '어울림' },
      { color_name: '검정', hex_code: '#000000', reason: '대비' },
      { color_name: '하늘색', hex_code: '#87CEEB', reason: '포인트' },
    ]);

    const res = await request(app)
      .post('/api/recommend/socks')
      .send({ goods_no: 'SHOE001', main_color: 'White', accent_color: 'Black' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.socks).toHaveLength(3);
    expect(res.body.socks[0].hex_code).toMatch(/^#[0-9A-F]{6}$/i);
  });
});

// ============================================================
// POST /api/recommend — v2.7 족형(foot_shape) 처리
// ============================================================

describe('POST /api/recommend — 족형(foot_shape) 처리', () => {
  it('foot_shape: egyptian 포함 시 200 성공 및 추천 반환', async () => {
    sheetsService.getAllShoes.mockResolvedValue(mockAllShoes);
    sheetsService.saveLog.mockResolvedValue(undefined);
    claudeService.getAiRecommendations.mockResolvedValue([
      { rank: 1, goods_no: 'SHOE001', reason: '이집트형에 적합한 넓은 toe box 구조' },
    ]);

    const res = await request(app)
      .post('/api/recommend')
      .send({ user_profile: { ...mockUserProfileLong, foot_shape: 'egyptian' } });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.recommendations).toBeInstanceOf(Array);
  });

  it('foot_shape: null 포함 시 200 성공 (족형 미제공)', async () => {
    sheetsService.getAllShoes.mockResolvedValue(mockAllShoes);
    sheetsService.saveLog.mockResolvedValue(undefined);
    claudeService.getAiRecommendations.mockResolvedValue([
      { rank: 1, goods_no: 'SHOE001', reason: '일반 추천' },
    ]);

    const res = await request(app)
      .post('/api/recommend')
      .send({ user_profile: { ...mockUserProfileLong, foot_shape: null } });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
  });

  it('foot_shape 필드 자체가 없어도 200 성공 (하위 호환 — 이전 클라이언트)', async () => {
    sheetsService.getAllShoes.mockResolvedValue(mockAllShoes);
    sheetsService.saveLog.mockResolvedValue(undefined);
    claudeService.getAiRecommendations.mockResolvedValue([
      { rank: 1, goods_no: 'SHOE001', reason: '일반 추천' },
    ]);

    const res = await request(app)
      .post('/api/recommend')
      .send({ user_profile: mockUserProfileLong }); // foot_shape 필드 없음

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
  });

  it('foot_shape: 알 수 없는 값이어도 200 성공 (방어 처리)', async () => {
    sheetsService.getAllShoes.mockResolvedValue(mockAllShoes);
    sheetsService.saveLog.mockResolvedValue(undefined);
    claudeService.getAiRecommendations.mockResolvedValue([
      { rank: 1, goods_no: 'SHOE001', reason: '기본 추천' },
    ]);

    const res = await request(app)
      .post('/api/recommend')
      .send({ user_profile: { ...mockUserProfileLong, foot_shape: 'invalid_value' } });

    expect(res.status).toBe(200);
  });
});

// ============================================================
// POST /api/recommend/outfit
// ============================================================

describe('POST /api/recommend/outfit', () => {
  it('필수 필드 누락 시 400을 반환한다', async () => {
    const res = await request(app)
      .post('/api/recommend/outfit')
      .send({ goods_no: 'SHOE001', main_color: 'White' }); // sock_color 누락

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch('sock_color');
  });

  it('상의/하의/모자 코디 3개를 반환한다', async () => {
    claudeService.getOutfitRecommendation.mockResolvedValue([
      { item: '상의', suggestions: [{ color_name: '흰색', hex_code: '#FFFFFF', reason: '깔끔' }] },
      { item: '하의', suggestions: [{ color_name: '검정', hex_code: '#000000', reason: '날씬' }] },
      { item: '모자', suggestions: [{ color_name: '회색', hex_code: '#808080', reason: '무난' }] },
    ]);

    const res = await request(app)
      .post('/api/recommend/outfit')
      .send({ goods_no: 'SHOE001', main_color: 'White', sock_color: 'White' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.outfit).toHaveLength(3);
    expect(res.body.outfit.map((o) => o.item)).toEqual(['상의', '하의', '모자']);
  });
});
