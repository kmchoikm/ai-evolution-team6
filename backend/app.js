/**
 * Express 앱 팩토리
 * - server.js: app.listen()으로 실제 서버 실행
 * - 테스트: supertest(app)으로 HTTP 레이어 직접 검증 (포트 점유 없음)
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const recommendRouter   = require('./routes/recommend');
const racesRouter       = require('./routes/races');
const raceWinnersRouter = require('./routes/raceWinners');
const celebsRouter      = require('./routes/celebs');
const shoesRouter       = require('./routes/shoes');
const sizeRouter        = require('./routes/size');
const musinsaRouter     = require('./routes/musinsa');

const app = express();

// ============================================================
// 미들웨어
// ============================================================

app.use(cors());
app.use(express.json());

// ============================================================
// 헬스체크
// ============================================================

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================================
// API 라우터 마운트
// ============================================================

app.use('/api/recommend',    recommendRouter);   // POST /api/recommend, /race, /socks, /outfit
app.use('/api/races',        racesRouter);        // GET  /api/races
app.use('/api/race-winners', raceWinnersRouter);  // GET  /api/race-winners
app.use('/api/celebs',       celebsRouter);       // GET  /api/celebs, /api/celebs/:id
app.use('/api/shoes',        shoesRouter);        // GET  /api/shoes, POST /api/shoes/lifespan
app.use('/api/size',         sizeRouter);         // POST /api/size/convert
app.use('/api/musinsa',      musinsaRouter);      // GET  /api/musinsa/ranking

// ============================================================
// 404 처리
// ============================================================

app.use((_req, res) => {
  res.status(404).json({ status: 'error', message: '존재하지 않는 API 엔드포인트입니다.' });
});

module.exports = app;
