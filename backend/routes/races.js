/**
 * 대회 코스 라우터
 * GET /api/races — 대회 목록 조회 (§6.2)
 */

const express = require('express');
const router = express.Router();
const { getRaces } = require('../services/sheetsService');

// GET /api/races
router.get('/', async (req, res) => {
  const { country, is_world_major, course_type } = req.query;

  try {
    let races;
    try {
      races = await getRaces();
    } catch (err) {
      console.error('[Races] Sheets 조회 실패:', err.message);
      return res.status(503).json({
        status: 'error',
        message: '대회 데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
      });
    }

    // 비활성 대회 제외
    let result = races.filter((r) => r.is_active !== false);

    // 쿼리 파라미터 필터링
    if (country) {
      result = result.filter((r) => r.country === country);
    }
    if (is_world_major !== undefined) {
      const flag = is_world_major === 'true';
      result = result.filter((r) => r.is_world_major === flag);
    }
    if (course_type) {
      result = result.filter((r) => r.course_type === course_type);
    }

    if (result.length === 0) {
      return res.status(200).json({
        status: 'no_match',
        message: '해당 조건의 대회 데이터가 없습니다.',
        races: [],
      });
    }

    return res.status(200).json({ status: 'success', races: result });
  } catch (err) {
    console.error('[Races] 처리 중 예외:', err);
    return res.status(500).json({
      status: 'error',
      message: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
    });
  }
});

module.exports = router;
