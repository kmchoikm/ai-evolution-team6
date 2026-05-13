/**
 * RunFit 백엔드 API 서버 (v2.0)
 *
 * 엔드포인트 목록:
 *   GET  /health
 *   POST /api/recommend            — Q1~Q7 기반 추천 (기존)
 *   GET  /api/shoes                — 전체 신발 목록 (교체 계산기용)
 *   GET  /api/races                — 대회 목록 (Feature 5)
 *   POST /api/recommend/race       — 대회 코스 기반 추천 (Feature 5)
 *   GET  /api/race-winners         — 마라톤 우승자 목록 (Feature 4)
 *   GET  /api/celebs               — 셀럽 목록 (Feature 1)
 *   GET  /api/celebs/:celeb_id     — 셀럽 착용 신발 상세 (Feature 1)
 *   POST /api/shoes/lifespan       — 교체 시기 계산 (Feature B)
 *   POST /api/recommend/socks      — 양말 색상 추천 (Feature 2)
 *   POST /api/size/convert         — 사이즈 변환 (Feature D)
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const {
  getAllShoes,
  saveLog,
  getAllCelebs,
  getCelebWithShoes,
  getRaceWinners,
  getAllRaces,
  getRaceById,
  getAllSizeGuides,
} = require('./services/sheetsService');
const { recommend, recommendByRace } = require('./services/recommendService');
const { getAiSocksRecommendations } = require('./services/claudeService');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ============================================================
// 헬스체크
// ============================================================

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================================
// POST /api/recommend — Q1~Q7 기반 추천 (기존)
// ============================================================

app.post('/api/recommend', async (req, res) => {
  const userProfile = req.body?.user_profile;

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
    let allShoes;
    try {
      allShoes = await getAllShoes();
    } catch (sheetsErr) {
      console.error('[Server] Sheets 조회 실패:', sheetsErr.message);
      return res.status(503).json({
        status: 'error',
        message: '상품 데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
      });
    }

    const recommendations = await recommend(userProfile, allShoes);

    if (recommendations.length === 0) {
      return res.status(200).json({
        status: 'no_match',
        message: '입력하신 조건에 맞는 러닝화가 없습니다. 예산 범위나 발볼 조건을 조정해 보세요.',
        recommendations: [],
      });
    }

    const recommendedNos = recommendations.map((r) => r.goods_no).filter(Boolean);
    saveLog(userProfile, recommendedNos);

    return res.status(200).json({ status: 'success', recommendations });
  } catch (err) {
    console.error('[Server] 추천 처리 중 예외:', err);
    return res.status(500).json({
      status: 'error',
      message: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
    });
  }
});

// ============================================================
// GET /api/shoes — 전체 신발 목록 (교체 계산기 자동완성용)
// ============================================================

app.get('/api/shoes', async (_req, res) => {
  try {
    const shoes = await getAllShoes();
    return res.status(200).json({ status: 'success', shoes });
  } catch (err) {
    console.error('[Server] /api/shoes 오류:', err.message);
    return res.status(503).json({ status: 'error', message: '신발 데이터를 불러올 수 없습니다.' });
  }
});

// ============================================================
// GET /api/races — 대회 목록 (Feature 5)
// ============================================================

app.get('/api/races', async (req, res) => {
  try {
    const { country, is_world_major, course_type } = req.query;
    const races = await getAllRaces({ country, isWorldMajor: is_world_major, courseType: course_type });
    return res.status(200).json({ status: 'success', races });
  } catch (err) {
    console.error('[Server] /api/races 오류:', err.message);
    return res.status(503).json({ status: 'error', message: '대회 데이터를 불러올 수 없습니다.' });
  }
});

// ============================================================
// POST /api/recommend/race — 대회 코스 기반 추천 (Feature 5)
// ============================================================

app.post('/api/recommend/race', async (req, res) => {
  const { race_id, course_type, user_profile } = req.body || {};

  if (!race_id || !course_type) {
    return res.status(400).json({ status: 'error', message: 'race_id와 course_type은 필수입니다' });
  }

  try {
    const race = await getRaceById(race_id);
    if (!race) {
      return res.status(404).json({ status: 'error', message: '해당 대회를 찾을 수 없습니다.' });
    }

    let allShoes;
    try {
      allShoes = await getAllShoes();
    } catch (sheetsErr) {
      console.error('[Server] Shoes 조회 실패:', sheetsErr.message);
      return res.status(503).json({
        status: 'error',
        message: '상품 데이터를 불러오는 중 오류가 발생했습니다.',
      });
    }

    const recommendations = await recommendByRace(race, user_profile || null, allShoes);

    if (recommendations.length === 0) {
      return res.status(200).json({
        status: 'no_match',
        message: '해당 코스에 맞는 추천 결과가 없습니다.',
        race,
        recommendations: [],
      });
    }

    return res.status(200).json({ status: 'success', race, recommendations });
  } catch (err) {
    console.error('[Server] /api/recommend/race 오류:', err);
    return res.status(500).json({ status: 'error', message: '서버 내부 오류가 발생했습니다.' });
  }
});

// ============================================================
// GET /api/race-winners — 마라톤 우승자 목록 (Feature 4)
// ============================================================

app.get('/api/race-winners', async (req, res) => {
  try {
    const { race_name, race_year, course_type } = req.query;
    const winners = await getRaceWinners({ raceName: race_name, raceYear: race_year, courseType: course_type });
    return res.status(200).json({ status: 'success', winners });
  } catch (err) {
    console.error('[Server] /api/race-winners 오류:', err.message);
    return res.status(503).json({ status: 'error', message: '우승자 데이터를 불러올 수 없습니다.' });
  }
});

// ============================================================
// GET /api/celebs — 셀럽 목록 (Feature 1)
// ============================================================

app.get('/api/celebs', async (req, res) => {
  try {
    const { celeb_type } = req.query;
    const celebs = await getAllCelebs(celeb_type);
    return res.status(200).json({ status: 'success', celebs });
  } catch (err) {
    console.error('[Server] /api/celebs 오류:', err.message);
    return res.status(503).json({ status: 'error', message: '셀럽 데이터를 불러올 수 없습니다.' });
  }
});

// ============================================================
// GET /api/celebs/:celeb_id — 셀럽 착용 신발 상세 (Feature 1)
// ============================================================

app.get('/api/celebs/:celeb_id', async (req, res) => {
  try {
    const result = await getCelebWithShoes(req.params.celeb_id);
    if (!result) {
      return res.status(404).json({ status: 'error', message: '해당 셀럽을 찾을 수 없습니다.' });
    }
    return res.status(200).json({ status: 'success', ...result });
  } catch (err) {
    console.error('[Server] /api/celebs/:id 오류:', err.message);
    return res.status(503).json({ status: 'error', message: '셀럽 데이터를 불러올 수 없습니다.' });
  }
});

// ============================================================
// POST /api/shoes/lifespan — 교체 시기 계산 (Feature B)
// ============================================================

app.post('/api/shoes/lifespan', async (req, res) => {
  const { goods_no, purchase_year_month, weekly_km, total_km } = req.body || {};

  if (!goods_no || !purchase_year_month) {
    return res.status(400).json({
      status: 'error',
      message: 'goods_no와 purchase_year_month(YYYY-MM)는 필수입니다',
    });
  }
  if (weekly_km == null && total_km == null) {
    return res.status(400).json({
      status: 'error',
      message: 'weekly_km 또는 total_km 중 하나를 입력해야 합니다',
    });
  }

  try {
    const shoes = await getAllShoes();
    const shoe = shoes.find((s) => s.goods_no === goods_no);
    if (!shoe) {
      return res.status(404).json({ status: 'error', message: '해당 신발을 찾을 수 없습니다.' });
    }

    // 총 누적 거리 계산
    let accumulated = 0;
    if (total_km != null) {
      accumulated = Number(total_km);
    } else {
      const [year, month] = purchase_year_month.split('-').map(Number);
      const purchaseDate = new Date(year, month - 1, 1);
      const now = new Date();
      const weeksElapsed = Math.max(0, (now - purchaseDate) / (7 * 24 * 60 * 60 * 1000));
      accumulated = Math.round(weeksElapsed * Number(weekly_km));
    }

    const lifespanMin = shoe.lifespan_km_min || (shoe.has_carbon_plate ? 300 : 500);
    const lifespanMax = shoe.lifespan_km_max || (shoe.has_carbon_plate ? 500 : 800);
    const lifespanMid = Math.round((lifespanMin + lifespanMax) / 2);
    const usageRatio = accumulated / lifespanMid;
    const remainingKm = Math.max(0, lifespanMax - accumulated);

    let status, message;
    if (usageRatio < 0.5) {
      status = 'good';
      message = `아직 충분히 쓸 수 있어요. 약 ${remainingKm.toLocaleString()}km 남았습니다.`;
    } else if (usageRatio < 0.8) {
      status = 'caution';
      message = `슬슬 교체를 고려할 시기입니다. 다음 대회 전 점검하세요. (약 ${remainingKm.toLocaleString()}km 남음)`;
    } else if (usageRatio < 1.0) {
      status = 'replace_soon';
      message = `쿠션 성능이 저하되었을 수 있습니다. 교체를 권장합니다. (약 ${remainingKm.toLocaleString()}km 남음)`;
    } else {
      status = 'replace_now';
      message = `부상 위험 구간입니다. 즉시 교체를 권장합니다. (${Math.abs(remainingKm).toLocaleString()}km 초과)`;
    }

    return res.status(200).json({
      status: 'success',
      result: {
        goods_no,
        goods_name:      shoe.goods_name,
        brand:           shoe.brand,
        accumulated_km:  accumulated,
        lifespan_min:    lifespanMin,
        lifespan_max:    lifespanMax,
        remaining_km:    remainingKm,
        usage_percent:   Math.min(100, Math.round(usageRatio * 100)),
        condition:       status,
        message,
        has_carbon_plate: shoe.has_carbon_plate,
      },
    });
  } catch (err) {
    console.error('[Server] /api/shoes/lifespan 오류:', err);
    return res.status(500).json({ status: 'error', message: '서버 내부 오류가 발생했습니다.' });
  }
});

// ============================================================
// POST /api/recommend/socks — 양말 색상 추천 (Feature 2)
// ============================================================

app.post('/api/recommend/socks', async (req, res) => {
  const { goods_no } = req.body || {};

  if (!goods_no) {
    return res.status(400).json({ status: 'error', message: 'goods_no는 필수입니다' });
  }

  try {
    const shoes = await getAllShoes();
    const shoe = shoes.find((s) => s.goods_no === goods_no);
    if (!shoe) {
      return res.status(404).json({ status: 'error', message: '해당 신발을 찾을 수 없습니다.' });
    }
    if (!shoe.main_color) {
      return res.status(400).json({ status: 'error', message: '해당 신발의 색상 정보가 없습니다.' });
    }

    const socksColors = await getAiSocksRecommendations(shoe);
    return res.status(200).json({ status: 'success', shoe: { goods_no, goods_name: shoe.goods_name, brand: shoe.brand, main_color: shoe.main_color, accent_color: shoe.accent_color }, socks_colors: socksColors });
  } catch (err) {
    console.error('[Server] /api/recommend/socks 오류:', err);
    return res.status(500).json({ status: 'error', message: '양말 색상 추천 중 오류가 발생했습니다.' });
  }
});

// ============================================================
// POST /api/size/convert — 사이즈 변환 (Feature D)
// ============================================================

app.post('/api/size/convert', async (req, res) => {
  const { from_brand, from_model, from_size_mm, to_brand, to_model } = req.body || {};

  if (!from_brand || !from_size_mm || !to_brand) {
    return res.status(400).json({
      status: 'error',
      message: 'from_brand, from_size_mm, to_brand는 필수입니다',
    });
  }

  try {
    const guides = await getAllSizeGuides();

    const fromGuide = guides.find(
      (g) => g.brand === from_brand && (!from_model || g.model_name === from_model)
    );
    const toGuide = guides.find(
      (g) => g.brand === to_brand && (!to_model || g.model_name === to_model)
    );

    // 아식스 기준 mm 환산: from → 아식스 기준 → to
    const fromAdj = fromGuide ? fromGuide.size_adjust_mm : 0;
    const toAdj   = toGuide   ? toGuide.size_adjust_mm   : 0;
    const asicsBase = Number(from_size_mm) - fromAdj;
    const recommended_size_mm = asicsBase + toAdj;

    // 신뢰도 판단
    const confidence = (fromGuide && toGuide) ? 'high' : fromGuide || toGuide ? 'medium' : 'low';

    const fitNote = toGuide ? toGuide.fit_note : '해당 모델의 상세 핏 데이터가 없습니다.';
    const widthNote = toGuide
      ? toGuide.width_tendency === 'wide'
        ? '이 모델은 발볼이 넓게 설계되어 있어 여유로운 착용감을 제공합니다.'
        : toGuide.width_tendency === 'narrow'
        ? '이 모델은 발볼이 좁게 설계되어 있어 발볼이 넓은 분은 주의가 필요합니다.'
        : '표준 발볼 설계입니다.'
      : '';

    return res.status(200).json({
      status: 'success',
      recommended_size_mm,
      confidence,
      fit_note: fitNote,
      width_note: widthNote,
    });
  } catch (err) {
    console.error('[Server] /api/size/convert 오류:', err);
    return res.status(500).json({ status: 'error', message: '사이즈 변환 중 오류가 발생했습니다.' });
  }
});

// ============================================================
// 시작
// ============================================================

app.listen(PORT, () => {
  console.log(`✅ RunFit 서버 실행 중 — http://localhost:${PORT}`);
  console.log(`   환경: ${process.env.NODE_ENV || 'development'}`);
});
