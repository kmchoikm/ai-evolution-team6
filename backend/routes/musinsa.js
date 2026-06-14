/**
 * 무신사 러닝화 랭킹 프록시 라우터
 * GET /api/musinsa/ranking?limit=5
 *
 * 무신사 비공개 내부 API를 백엔드에서 호출 후 인메모리 캐싱하여 반환.
 * 프론트엔드(Vercel)에서 직접 호출 시 CORS 차단으로 불가.
 */

const express = require('express');
const router = express.Router();

const MUSINSA_API_URL =
  'https://api.musinsa.com/api2/hm/v5/pans/ranking' +
  '?storeCode=player&subPan=product&sectionId=214' +
  '&categoryCode=017040006&gf=A&ageBand=AGE_BAND_ALL';

const CACHE_TTL_MS = 60 * 60 * 1000; // 1시간

// 인메모리 캐시 (서버 재시작 시 초기화됨)
const cache = {
  data: null,      // { items: [], cachedAt: string }
  expiresAt: 0,    // epoch ms
  inflight: null,  // 진행 중인 Promise — 동시 요청 stampede 방지
};

/**
 * 무신사 API 호출 → 파싱 → 캐시 저장
 * 이미 진행 중인 요청이 있으면 동일 Promise를 반환하여 중복 호출 방지
 */
async function fetchFromMusinsa() {
  if (cache.inflight) return cache.inflight;

  cache.inflight = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000); // 5초 타임아웃

    try {
      const res = await fetch(MUSINSA_API_URL, {
        signal: controller.signal,
        headers: {
          Referer: 'https://www.musinsa.com/',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });
      clearTimeout(timer); // 성공 시 타이머 정리

      if (!res.ok) throw new Error(`무신사 HTTP ${res.status}`);

      const json = await res.json();

      // 무신사 응답 실제 구조 (실측):
      //   json.data.modules[] — 각 모듈은 THREECOLUMN 타입
      //   THREECOLUMN.items[] — 각 아이템은 PRODUCT_COLUMN 타입
      //   rank: item.image.rank / thumbnail: item.image.url
      const topModules = json?.data?.modules ?? [];

      if (!Array.isArray(topModules) || topModules.length === 0) {
        throw new Error('응답에서 modules 배열을 파싱할 수 없음');
      }

      // THREECOLUMN 모듈 하위 PRODUCT_COLUMN 아이템 평탄화
      const rawItems = [];
      for (const mod of topModules) {
        if (mod.type === 'THREECOLUMN' && Array.isArray(mod.items)) {
          for (const item of mod.items) {
            if (item.type === 'PRODUCT_COLUMN') rawItems.push(item);
          }
        }
      }

      const items = rawItems
        .sort((a, b) => (a.image?.rank ?? 999) - (b.image?.rank ?? 999))
        .map((m) => ({
          rank: m.image?.rank,
          brand: m.info?.brandName ?? '',
          name: m.info?.productName ?? '',
          price: m.info?.finalPrice ?? 0,
          discountRatio: m.info?.discountRatio ?? 0,
          thumbnail: m.image?.url ?? '',
          url: m.onClick?.url ?? (m.id ? `https://www.musinsa.com/products/${m.id}` : null),
        }))
        .filter((item) => item.url); // 링크 없는 항목 제외

      if (items.length === 0) {
        throw new Error('파싱된 PRODUCT_COLUMN 항목이 0개');
      }

      cache.data = { items, cachedAt: new Date().toISOString() };
      cache.expiresAt = Date.now() + CACHE_TTL_MS;
      return cache.data;
    } finally {
      clearTimeout(timer); // 타이머 누수 방지 (성공/실패 무관)
      cache.inflight = null;
    }
  })();

  return cache.inflight;
}

// GET /api/musinsa/ranking?limit=5
router.get('/ranking', async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 5, 1), 10);

  try {
    let data;
    if (Date.now() < cache.expiresAt && cache.data) {
      data = cache.data; // 캐시 히트
    } else {
      data = await fetchFromMusinsa(); // 캐시 미스 또는 만료
    }

    return res.json({
      cached: Date.now() < cache.expiresAt,
      cachedAt: data.cachedAt,
      items: data.items.slice(0, limit),
    });
  } catch (err) {
    console.error('[Musinsa] 랭킹 조회 실패:', err.message);
    return res.status(503).json({
      status: 'error',
      message: '무신사 랭킹을 불러올 수 없습니다.',
    });
  }
});

module.exports = router;
