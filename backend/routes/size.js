/**
 * 사이즈 변환 라우터
 * POST /api/size/convert — 브랜드 간 사이즈 변환 (§6.9)
 */

const express = require('express');
const router = express.Router();
const { getSizeGuide } = require('../services/sheetsService');

/**
 * 브랜드+모델 기준 사이즈 가이드 레코드 조회
 * 모델 정확 매칭 → 없으면 브랜드 전체 기준값('*') 폴백
 */
function findGuide(guides, brand, modelName) {
  // 브랜드 + 모델 정확 일치
  const exact = guides.find(
    (g) => g.brand === brand && g.model_name === modelName
  );
  if (exact) return exact;

  // 브랜드 전체 기준값 ('*' = 브랜드 전체 경향)
  return guides.find((g) => g.brand === brand && g.model_name === '*') || null;
}

// POST /api/size/convert
router.post('/convert', async (req, res) => {
  const { from_brand, from_model, from_size_mm, to_brand, to_model } = req.body || {};

  if (!from_brand || !from_model || from_size_mm == null || !to_brand || !to_model) {
    return res.status(400).json({
      status: 'error',
      message: 'from_brand, from_model, from_size_mm, to_brand, to_model은 모두 필수입니다.',
    });
  }
  if (isNaN(Number(from_size_mm))) {
    return res.status(400).json({ status: 'error', message: 'from_size_mm은 숫자여야 합니다.' });
  }

  try {
    let guides;
    try {
      guides = await getSizeGuide();
    } catch (err) {
      console.error('[Size] SizeGuide Sheets 조회 실패:', err.message);
      return res.status(503).json({
        status: 'error',
        message: '사이즈 데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
      });
    }

    const fromGuide = findGuide(guides, from_brand, from_model);
    const toGuide = findGuide(guides, to_brand, to_model);

    if (!fromGuide && !toGuide) {
      return res.status(200).json({
        status: 'success',
        recommended_size_mm: Number(from_size_mm),
        confidence: 'low',
        fit_note: '해당 브랜드/모델의 사이즈 데이터가 없어 현재 사이즈를 그대로 추천합니다.',
        width_note: null,
      });
    }

    // 아식스를 기준(0mm)으로 삼은 size_adjust_mm 상대 변환
    // 권장 사이즈 = from_size_mm - from_adjust + to_adjust
    const fromAdjust = fromGuide ? fromGuide.size_adjust_mm : 0;
    const toAdjust = toGuide ? toGuide.size_adjust_mm : 0;
    const recommendedSizeMm = Math.round(Number(from_size_mm) - fromAdjust + toAdjust);

    // 신뢰도: 두 가이드 모두 모델 정확 매칭이면 high, 하나라도 '*'이면 medium, 둘 다 없으면 low
    const fromIsExact = fromGuide && fromGuide.model_name !== '*';
    const toIsExact = toGuide && toGuide.model_name !== '*';
    const confidence = fromIsExact && toIsExact ? 'high' : fromGuide || toGuide ? 'medium' : 'low';

    // fit_note: to 신발의 핏 특이사항
    const fit_note = toGuide?.fit_note || null;

    // width_note: to 신발의 발볼 경향이 특이한 경우 안내
    let width_note = null;
    if (toGuide?.width_tendency === 'wide') {
      width_note = `${to_brand}는 와이드 핏이 기본이므로 발볼이 좁은 분께는 핏이 헐거울 수 있습니다.`;
    } else if (toGuide?.width_tendency === 'narrow') {
      width_note = `${to_brand}는 내로우 핏 경향이 있어 발볼이 넓은 분께는 불편할 수 있습니다.`;
    }

    return res.status(200).json({
      status: 'success',
      recommended_size_mm: recommendedSizeMm,
      confidence,
      fit_note,
      width_note,
    });
  } catch (err) {
    console.error('[Size] 처리 중 예외:', err);
    return res.status(500).json({
      status: 'error',
      message: '사이즈 변환 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
    });
  }
});

module.exports = router;
