/**
 * 추천 관련 라우터
 * POST /api/recommend         — AI 러닝화 추천 (§6.1)
 * POST /api/recommend/race    — 대회 코스 기반 추천 (§6.3)
 * POST /api/recommend/socks   — 양말 색상 추천 (§6.8)
 * POST /api/recommend/outfit  — 러닝 코디 추천 (§6.10)
 */

const express = require('express');
const router = express.Router();
const { getAllShoes, getRaces, saveLog } = require('../services/sheetsService');
const { recommend } = require('../services/recommendService');
const { recommendByRace } = require('../services/raceRecommendService');
const { getSocksRecommendation, getOutfitRecommendation } = require('../services/claudeService');

// ============================================================
// POST /api/recommend — AI 러닝화 추천
// ============================================================

router.post('/', async (req, res) => {
  const userProfile = req.body?.user_profile;

  if (!userProfile) {
    return res.status(400).json({ status: 'error', message: 'user_profile이 필요합니다.' });
  }
  if (!userProfile.running_distance) {
    return res.status(400).json({ status: 'error', message: "running_distance는 필수 항목입니다. (short/medium/long/marathon)" });
  }
  if (!userProfile.foot_width) {
    return res.status(400).json({ status: 'error', message: "foot_width는 필수 항목입니다. (wide/normal/narrow)" });
  }

  try {
    let allShoes;
    try {
      allShoes = await getAllShoes();
    } catch (err) {
      console.error('[Recommend] Sheets 조회 실패:', err.message);
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

    // 로그 저장 (비동기 — 응답을 막지 않음)
    const recommendedNos = recommendations.map((r) => r.goods_no).filter(Boolean);
    saveLog(userProfile, recommendedNos);

    return res.status(200).json({ status: 'success', recommendations });
  } catch (err) {
    console.error('[Recommend] 처리 중 예외:', err);
    return res.status(500).json({
      status: 'error',
      message: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
    });
  }
});

// ============================================================
// POST /api/recommend/race — 대회 코스 기반 추천
// ============================================================

router.post('/race', async (req, res) => {
  const { race_id, course_type, user_profile } = req.body || {};

  if (!race_id) {
    return res.status(400).json({ status: 'error', message: 'race_id는 필수입니다.' });
  }
  if (!course_type || !['half', 'full'].includes(course_type)) {
    return res.status(400).json({ status: 'error', message: "course_type은 'half' 또는 'full'이어야 합니다." });
  }

  try {
    let races, allShoes;
    try {
      [races, allShoes] = await Promise.all([getRaces(), getAllShoes()]);
    } catch (err) {
      console.error('[RaceRecommend] Sheets 조회 실패:', err.message);
      return res.status(503).json({
        status: 'error',
        message: '데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
      });
    }

    const race = races.find((r) => r.race_id === race_id && r.is_active !== false);
    if (!race) {
      return res.status(404).json({ status: 'error', message: '해당 대회를 찾을 수 없습니다.' });
    }

    // course_type으로 대회 정보 보강 (Races 시트에 course_type이 half/full 단일인 경우 사용자 선택 우선)
    const raceWithCourseType = { ...race, course_type };

    const recommendations = await recommendByRace(raceWithCourseType, allShoes, user_profile || null);

    if (recommendations.length === 0) {
      return res.status(200).json({
        status: 'no_match',
        message: '해당 코스 조건에 맞는 러닝화가 없습니다.',
        race: { race_name: race.race_name, course_type, course_summary: race.course_summary },
        recommendations: [],
      });
    }

    return res.status(200).json({
      status: 'success',
      race: {
        race_name: race.race_name,
        course_type,
        course_summary: race.course_summary,
        difficulty: race.difficulty,
        avg_temp_celsius: race.avg_temp_celsius,
        surface_type: race.surface_type,
        elevation_gain_m: race.elevation_gain_m,
      },
      recommendations,
    });
  } catch (err) {
    console.error('[RaceRecommend] 처리 중 예외:', err);
    return res.status(500).json({
      status: 'error',
      message: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
    });
  }
});

// ============================================================
// POST /api/recommend/socks — 양말 색상 추천
// ============================================================

router.post('/socks', async (req, res) => {
  const { goods_no, main_color, accent_color } = req.body || {};

  if (!goods_no) {
    return res.status(400).json({ status: 'error', message: 'goods_no는 필수입니다.' });
  }
  if (!main_color) {
    return res.status(400).json({ status: 'error', message: 'main_color는 필수입니다.' });
  }

  try {
    const socks = await getSocksRecommendation(main_color, accent_color || null);
    return res.status(200).json({ status: 'success', socks });
  } catch (err) {
    console.error('[Socks] 처리 중 예외:', err);
    return res.status(500).json({
      status: 'error',
      message: '양말 색상 추천 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
    });
  }
});

// ============================================================
// POST /api/recommend/outfit — 러닝 코디 추천
// ============================================================

router.post('/outfit', async (req, res) => {
  const { goods_no, main_color, accent_color, sock_color } = req.body || {};

  if (!goods_no) {
    return res.status(400).json({ status: 'error', message: 'goods_no는 필수입니다.' });
  }
  if (!main_color) {
    return res.status(400).json({ status: 'error', message: 'main_color는 필수입니다.' });
  }
  if (!sock_color) {
    return res.status(400).json({ status: 'error', message: 'sock_color는 필수입니다.' });
  }

  try {
    const outfit = await getOutfitRecommendation(main_color, accent_color || null, sock_color);
    return res.status(200).json({ status: 'success', outfit });
  } catch (err) {
    console.error('[Outfit] 처리 중 예외:', err);
    return res.status(500).json({
      status: 'error',
      message: '코디 추천 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
    });
  }
});

module.exports = router;
