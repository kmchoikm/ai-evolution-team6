/**
 * 셀럽 라우터
 * GET /api/celebs          — 셀럽 목록 조회 (§6.6)
 * GET /api/celebs/:celeb_id — 셀럽 착용 신발 조회 (§6.7)
 */

const express = require('express');
const router = express.Router();
const { getCelebs, getAllShoes } = require('../services/sheetsService');

// GET /api/celebs
router.get('/', async (req, res) => {
  const { celeb_type } = req.query;

  try {
    let rows;
    try {
      rows = await getCelebs();
    } catch (err) {
      console.error('[Celebs] Sheets 조회 실패:', err.message);
      return res.status(503).json({
        status: 'error',
        message: '셀럽 데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
      });
    }

    // celeb_type 필터
    let result = rows;
    if (celeb_type) {
      result = result.filter((c) => c.celeb_type === celeb_type);
    }

    // celeb_id 기준으로 중복 제거하여 셀럽 목록만 반환 (M:N 행 분리 구조 대응)
    const seen = new Set();
    const celebs = result
      .filter((c) => {
        if (seen.has(c.celeb_id)) return false;
        seen.add(c.celeb_id);
        return true;
      })
      .map(({ celeb_id, celeb_name, celeb_type, celeb_image_url }) => ({
        celeb_id,
        celeb_name,
        celeb_type,
        celeb_image_url,
      }));

    if (celebs.length === 0) {
      return res.status(200).json({
        status: 'no_match',
        message: '해당 유형의 셀럽 데이터가 없습니다.',
        celebs: [],
      });
    }

    return res.status(200).json({ status: 'success', celebs });
  } catch (err) {
    console.error('[Celebs] 처리 중 예외:', err);
    return res.status(500).json({
      status: 'error',
      message: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
    });
  }
});

// GET /api/celebs/:celeb_id
router.get('/:celeb_id', async (req, res) => {
  const { celeb_id } = req.params;

  try {
    let celebRows, allShoes;
    try {
      [celebRows, allShoes] = await Promise.all([getCelebs(), getAllShoes()]);
    } catch (err) {
      console.error('[Celebs/:id] Sheets 조회 실패:', err.message);
      return res.status(503).json({
        status: 'error',
        message: '데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
      });
    }

    // 해당 celeb_id 행 전체 (한 셀럽이 여러 신발을 착용한 경우 여러 행)
    const celebRows_filtered = celebRows.filter((c) => c.celeb_id === celeb_id);

    if (celebRows_filtered.length === 0) {
      return res.status(404).json({ status: 'error', message: '해당 셀럽을 찾을 수 없습니다.' });
    }

    // 셀럽 기본 정보 (첫 행에서 추출)
    const { celeb_name, celeb_type, celeb_image_url } = celebRows_filtered[0];
    const celeb = { celeb_id, celeb_name, celeb_type, celeb_image_url };

    // goods_no로 Shoes 시트와 논리 조인
    const shoes = celebRows_filtered
      .map((row) => {
        const shoe = allShoes.find((s) => s.goods_no === row.goods_no);
        if (!shoe) return null;
        return {
          goods_no: shoe.goods_no,
          goods_name: shoe.goods_name,
          brand: shoe.brand,
          price: shoe.price,
          url: shoe.url,
          thumbnail: shoe.thumbnail,
          source_url: row.source_url,
        };
      })
      .filter(Boolean);

    if (shoes.length === 0) {
      return res.status(200).json({
        status: 'no_match',
        message: '해당 셀럽의 착용 신발 데이터가 없습니다.',
        celeb,
        shoes: [],
      });
    }

    return res.status(200).json({ status: 'success', celeb, shoes });
  } catch (err) {
    console.error('[Celebs/:id] 처리 중 예외:', err);
    return res.status(500).json({
      status: 'error',
      message: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
    });
  }
});

module.exports = router;
