/**
 * 신발 라우터
 * GET  /api/shoes            — 신발 목록 조회 + 검색 (§6.11)
 * POST /api/shoes/lifespan   — 교체 시기 계산 (§6.5)
 */

const express = require('express');
const router = express.Router();
const { getAllShoes, getShoeByNo } = require('../services/sheetsService');
const { calcLifespan } = require('../services/lifespanService');

// GET /api/shoes
router.get('/', async (req, res) => {
  const { brand, keyword } = req.query;

  try {
    let shoes;
    try {
      shoes = await getAllShoes();
    } catch (err) {
      console.error('[Shoes] Sheets 조회 실패:', err.message);
      return res.status(503).json({
        status: 'error',
        message: '신발 데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
      });
    }

    let result = shoes;

    // 브랜드 정확 일치 필터
    if (brand) {
      result = result.filter((s) => s.brand === brand);
    }

    // 모델명 부분 일치 검색
    if (keyword) {
      const kw = keyword.toLowerCase();
      result = result.filter((s) => s.goods_name && s.goods_name.toLowerCase().includes(kw));
    }

    if (result.length === 0) {
      return res.status(200).json({
        status: 'no_match',
        message: '검색 조건에 맞는 신발이 없습니다.',
        shoes: [],
      });
    }

    // 교체 계산기·사이즈 가이드에 필요한 필드만 반환
    const simplified = result.map((s) => ({
      goods_no: s.goods_no,
      goods_name: s.goods_name,
      brand: s.brand,
      has_carbon_plate: s.has_carbon_plate,
      lifespan_km_min: s.lifespan_km_min,
      lifespan_km_max: s.lifespan_km_max,
    }));

    return res.status(200).json({ status: 'success', shoes: simplified });
  } catch (err) {
    console.error('[Shoes] 처리 중 예외:', err);
    return res.status(500).json({
      status: 'error',
      message: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
    });
  }
});

// POST /api/shoes/lifespan
router.post('/lifespan', async (req, res) => {
  const { goods_no, purchase_year_month, weekly_km, total_km } = req.body || {};

  if (!goods_no) {
    return res.status(400).json({ status: 'error', message: 'goods_no는 필수입니다.' });
  }
  if (!purchase_year_month || !/^\d{4}-\d{2}$/.test(purchase_year_month)) {
    return res.status(400).json({
      status: 'error',
      message: "purchase_year_month는 필수이며 'YYYY-MM' 형식이어야 합니다.",
    });
  }
  if (weekly_km == null && total_km == null) {
    return res.status(400).json({
      status: 'error',
      message: 'weekly_km 또는 total_km 중 하나는 필수입니다.',
    });
  }

  try {
    let shoe;
    try {
      shoe = await getShoeByNo(goods_no);
    } catch (err) {
      console.error('[Lifespan] Sheets 조회 실패:', err.message);
      return res.status(503).json({
        status: 'error',
        message: '신발 데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
      });
    }

    if (!shoe) {
      return res.status(404).json({ status: 'error', message: '해당 goods_no의 신발을 찾을 수 없습니다.' });
    }

    const result = calcLifespan(
      shoe,
      purchase_year_month,
      weekly_km != null ? Number(weekly_km) : null,
      total_km != null ? Number(total_km) : null
    );

    return res.status(200).json({ status: 'success', ...result });
  } catch (err) {
    console.error('[Lifespan] 처리 중 예외:', err);
    return res.status(500).json({
      status: 'error',
      message: '교체 시기 계산 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
    });
  }
});

module.exports = router;
