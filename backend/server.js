/**
 * RunFit 백엔드 API 서버
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const recommendRouter  = require('./routes/recommend');
const racesRouter      = require('./routes/races');
const raceWinnersRouter = require('./routes/raceWinners');
const celebsRouter     = require('./routes/celebs');
const shoesRouter      = require('./routes/shoes');
const sizeRouter       = require('./routes/size');

const app = express();
const PORT = process.env.PORT || 3000;

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

// ============================================================
// 404 처리
// ============================================================

app.use((_req, res) => {
  res.status(404).json({ status: 'error', message: '존재하지 않는 API 엔드포인트입니다.' });
});

// ============================================================
// 시작
// ============================================================

app.listen(PORT, () => {
  console.log(`✅ RunFit 서버 실행 중 — http://localhost:${PORT}`);
  console.log(`   환경: ${process.env.NODE_ENV || 'development'}`);
});
