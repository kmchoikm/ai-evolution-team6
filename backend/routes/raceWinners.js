/**
 * 대회 우승자 라우터
 * GET /api/race-winners — 우승자 목록 조회 (§6.4)
 */

const express = require('express');
const router = express.Router();
const { getRaceWinners } = require('../services/sheetsService');

// GET /api/race-winners
router.get('/', async (req, res) => {
  const { race_name, race_year, course_type } = req.query;

  try {
    let winners;
    try {
      winners = await getRaceWinners();
    } catch (err) {
      console.error('[RaceWinners] Sheets 조회 실패:', err.message);
      return res.status(503).json({
        status: 'error',
        message: '우승자 데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
      });
    }

    let result = winners;

    // 대회명 부분 일치 검색
    if (race_name) {
      result = result.filter((w) => w.race_name && w.race_name.includes(race_name));
    }
    if (race_year) {
      result = result.filter((w) => w.race_year === Number(race_year));
    }
    if (course_type) {
      result = result.filter((w) => w.course_type === course_type);
    }

    if (result.length === 0) {
      return res.status(200).json({
        status: 'no_match',
        message: '해당 조건의 우승자 데이터가 없습니다.',
        winners: [],
      });
    }

    return res.status(200).json({ status: 'success', winners: result });
  } catch (err) {
    console.error('[RaceWinners] 처리 중 예외:', err);
    return res.status(500).json({
      status: 'error',
      message: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
    });
  }
});

module.exports = router;
