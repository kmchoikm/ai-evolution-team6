/**
 * RunFit 백엔드 API 서버
 * POST /api/recommend — 러닝화 추천 엔드포인트
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { getAllShoes, saveLog } = require('./services/sheetsService');
const { recommend } = require('./services/recommendService');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// 미들웨어
// ============================================================

app.use(cors());
app.use(express.json());

// 서버 상태 확인용
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================================
// POST /api/recommend
// ============================================================

app.post('/api/recommend', async (req, res) => {
  const userProfile = req.body?.user_profile;

  // 입력 유효성 검사
  if (!userProfile) {
    return res.status(400).json({ status: 'error', message: 'user_profile이 필요합니다' });
  }
  if (!userProfile.running_distance || !userProfile.foot_width) {
    return res.status(400).json({
      status: 'error',
      message: 'running_distance와 foot_width는 필수 항목입니다',
    });
  }

  try {
    // 1. Google Sheets에서 전체 러닝화 데이터 조회
    let allShoes;
    try {
      allShoes = await getAllShoes();
    } catch (sheetsErr) {
      console.error('[Server] Sheets 조회 실패:', sheetsErr.message, sheetsErr.stack);
      return res.status(503).json({
        status: 'error',
        message: '상품 데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
      });
    }

    // 2. 1차 필터링 + Claude 추천 (폴백 내장)
    const recommendations = await recommend(userProfile, allShoes);

    if (recommendations.length === 0) {
      return res.status(200).json({
        status: 'no_match',
        message: '입력하신 조건에 맞는 러닝화가 없습니다. 예산 범위나 발볼 조건을 조정해 보세요.',
        recommendations: [],
      });
    }

    // 3. 로그 저장 (비동기 — 응답을 막지 않음)
    const recommendedNos = recommendations.map((r) => r.goods_no).filter(Boolean);
    saveLog(userProfile, recommendedNos); // await 하지 않음

    return res.status(200).json({
      status: 'success',
      recommendations,
    });
  } catch (err) {
    console.error('[Server] 추천 처리 중 예외:', err);
    return res.status(500).json({
      status: 'error',
      message: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
    });
  }
});

// ============================================================
// 시작
// ============================================================

app.listen(PORT, () => {
  console.log(`✅ RunFit 서버 실행 중 — http://localhost:${PORT}`);
  console.log(`   환경: ${process.env.NODE_ENV || 'development'}`);
});
