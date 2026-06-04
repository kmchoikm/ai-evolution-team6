/**
 * GET /health 통합 테스트
 */

const request = require('supertest');
const app = require('../../../app');

describe('GET /health', () => {
  it('200 OK와 { status: "ok", timestamp }을 반환한다', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.timestamp).toBe('string');
    // ISO 8601 형식 검증
    expect(new Date(res.body.timestamp).toISOString()).toBe(res.body.timestamp);
  });
});

describe('GET /unknown-route', () => {
  it('404와 에러 메시지를 반환한다', async () => {
    const res = await request(app).get('/api/not-exist');

    expect(res.status).toBe(404);
    expect(res.body.status).toBe('error');
    expect(res.body.message).toBeTruthy();
  });
});
