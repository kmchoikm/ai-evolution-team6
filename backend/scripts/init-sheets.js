/**
 * Google Sheets DDL 초기화 스크립트 (v2.0)
 * 실행: npm run init-sheets
 *
 * 수행 작업:
 *   1. Shoes   — v2.0 컬럼 추가 (main_color, accent_color, lifespan 3종 + has_carbon_plate)
 *   2. Logs    — 기존 구조 유지
 *   3. Celebs  — 신규 생성 (Feature 1)
 *   4. RaceWinners — 신규 생성 (Feature 4)
 *   5. Races   — 신규 생성 (Feature 5, 국내 25개 + 세계 7대)
 *   6. SizeGuide  — 신규 생성 (Feature D)
 */

require('dotenv').config();
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

// ============================================================
// 스키마 정의
// ============================================================

const SHOES_HEADERS = [
  'goods_no', 'goods_name', 'brand', 'price', 'url', 'thumbnail',
  'width', 'cushion', 'weight', 'distance',
  'breathability', 'fit', 'summary', 'review_count_used', 'confidence',
  'main_color', 'accent_color', 'lifespan_km_min', 'lifespan_km_max', 'has_carbon_plate',
];

const LOGS_HEADERS = [
  'log_id', 'timestamp',
  'running_distance', 'frequency', 'foot_width', 'preferred_cushion',
  'priorities', 'budget', 'free_text',
  'recommended_goods_no',
];

const CELEBS_HEADERS = [
  'celeb_id', 'celeb_name', 'celeb_type', 'celeb_image_url', 'goods_no', 'source_url',
];

const RACE_WINNERS_HEADERS = [
  'winner_id', 'race_name', 'race_year', 'winner_name', 'winner_nationality',
  'course_type', 'result_time', 'goods_no', 'source_url',
];

const RACES_HEADERS = [
  'race_id', 'race_name', 'country', 'city', 'course_type', 'typical_month',
  'avg_temp_celsius', 'surface_type', 'elevation_gain_m', 'difficulty',
  'course_summary', 'shoe_priority_hint', 'is_world_major', 'is_active',
];

const SIZE_GUIDE_HEADERS = [
  'size_guide_id', 'brand', 'model_name', 'sizing_tendency',
  'width_tendency', 'size_adjust_mm', 'fit_note',
];

// ============================================================
// 샘플 데이터
// ============================================================

const SAMPLE_SHOES = [
  { goods_no: '5005842', goods_name: '맥시마이저 26 (오프 화이트)', brand: '미즈노',   price: 59000,  url: 'https://www.musinsa.com/products/5005842', thumbnail: '', width: '보통', cushion: 4, weight: 2, distance: '중거리', breathability: 4, fit: 5, summary: '가성비 좋은 데일리 러닝화, 쿠션감 우수',       review_count_used: 20, confidence: 'high',   main_color: '흰색',   accent_color: '회색',         lifespan_km_min: 500, lifespan_km_max: 800, has_carbon_plate: false },
  { goods_no: '3990544', goods_name: 'W480SK5',                        brand: '뉴발란스', price: 75000,  url: 'https://www.musinsa.com/products/3990544', thumbnail: '', width: '보통', cushion: 3, weight: 2, distance: '단거리', breathability: 4, fit: 4, summary: '가벼운 입문용 러닝화',                       review_count_used: 20, confidence: 'high',   main_color: '흰색',   accent_color: '파란색',       lifespan_km_min: 500, lifespan_km_max: 700, has_carbon_plate: false },
  { goods_no: '4521387', goods_name: '페가수스 41',                    brand: '나이키',   price: 159000, url: 'https://www.musinsa.com/products/4521387', thumbnail: '', width: '보통', cushion: 4, weight: 3, distance: '전거리', breathability: 4, fit: 4, summary: '범용 데일리 트레이너, 안정적 쿠션',         review_count_used: 20, confidence: 'high',   main_color: '검정',   accent_color: '흰색',         lifespan_km_min: 500, lifespan_km_max: 800, has_carbon_plate: false },
  { goods_no: '5123456', goods_name: '마파테 스피드 2',                brand: '호카',     price: 239000, url: 'https://www.musinsa.com/products/5123456', thumbnail: '', width: '넓음', cushion: 5, weight: 3, distance: '장거리', breathability: 3, fit: 5, summary: '구름 같은 쿠션, 마라톤·장거리 최적',       review_count_used: 18, confidence: 'high',   main_color: '노란색', accent_color: '검정',         lifespan_km_min: 300, lifespan_km_max: 500, has_carbon_plate: true  },
  { goods_no: '4789123', goods_name: '엔돌핀 스피드 4',                brand: '사코니',   price: 199000, url: 'https://www.musinsa.com/products/4789123', thumbnail: '', width: '보통', cushion: 3, weight: 1, distance: '중거리', breathability: 5, fit: 4, summary: '초경량 반발력 카본 플레이트',               review_count_used: 15, confidence: 'high',   main_color: '흰색',   accent_color: '형광 노랑',    lifespan_km_min: 300, lifespan_km_max: 500, has_carbon_plate: true  },
  { goods_no: '4456789', goods_name: '노바블라스트 4',                 brand: '아식스',   price: 149000, url: 'https://www.musinsa.com/products/4456789', thumbnail: '', width: '넓음', cushion: 5, weight: 3, distance: '장거리', breathability: 3, fit: 4, summary: '푹신한 쿠션, 장거리 부상 방지',             review_count_used: 20, confidence: 'high',   main_color: '파란색', accent_color: '흰색',         lifespan_km_min: 500, lifespan_km_max: 800, has_carbon_plate: false },
  { goods_no: '4112233', goods_name: '젤 카야노 31',                   brand: '아식스',   price: 189000, url: 'https://www.musinsa.com/products/4112233', thumbnail: '', width: '보통', cushion: 4, weight: 4, distance: '장거리', breathability: 3, fit: 5, summary: '안정성 최고, 평발 러너에게 추천',           review_count_used: 20, confidence: 'high',   main_color: '검정',   accent_color: '은색',         lifespan_km_min: 600, lifespan_km_max: 900, has_carbon_plate: false },
  { goods_no: '5234567', goods_name: '클리프턴 9',                     brand: '호카',     price: 169000, url: 'https://www.musinsa.com/products/5234567', thumbnail: '', width: '넓음', cushion: 5, weight: 2, distance: '전거리', breathability: 4, fit: 5, summary: '가벼우면서 푹신, 발볼 넓은 분께',           review_count_used: 20, confidence: 'high',   main_color: '흰색',   accent_color: '형광 그린',    lifespan_km_min: 500, lifespan_km_max: 800, has_carbon_plate: false },
  { goods_no: '4998877', goods_name: '라이드 17',                      brand: '사코니',   price: 139000, url: 'https://www.musinsa.com/products/4998877', thumbnail: '', width: '좁음', cushion: 3, weight: 2, distance: '중거리', breathability: 4, fit: 3, summary: '발볼 좁은 분께 적합, 균형형',               review_count_used: 12, confidence: 'high',   main_color: '흰색',   accent_color: '빨간색',       lifespan_km_min: 500, lifespan_km_max: 800, has_carbon_plate: false },
  { goods_no: '4665544', goods_name: '글라이드라이드 3',               brand: '아식스',   price: 129000, url: 'https://www.musinsa.com/products/4665544', thumbnail: '', width: '보통', cushion: 4, weight: 4, distance: '장거리', breathability: 3, fit: 4, summary: '에너지 세이빙 장거리 트레이너',             review_count_used: 8,  confidence: 'medium', main_color: '검정',   accent_color: '흰색',         lifespan_km_min: 500, lifespan_km_max: 800, has_carbon_plate: false },
];

const SAMPLE_CELEBS = [
  { celeb_id: 'celeb_001', celeb_name: '기성용',     celeb_type: 'athlete',    celeb_image_url: '', goods_no: '4521387', source_url: '' },
  { celeb_id: 'celeb_002', celeb_name: '추성훈',     celeb_type: 'athlete',    celeb_image_url: '', goods_no: '4456789', source_url: '' },
  { celeb_id: 'celeb_003', celeb_name: '강다니엘',   celeb_type: 'actor',      celeb_image_url: '', goods_no: '5234567', source_url: '' },
  { celeb_id: 'celeb_004', celeb_name: '런더너TV',   celeb_type: 'youtuber',   celeb_image_url: '', goods_no: '4789123', source_url: '' },
  { celeb_id: 'celeb_005', celeb_name: '가빈정',     celeb_type: 'influencer', celeb_image_url: '', goods_no: '5123456', source_url: '' },
  { celeb_id: 'celeb_006', celeb_name: '박지성',     celeb_type: 'athlete',    celeb_image_url: '', goods_no: '4112233', source_url: '' },
];

const SAMPLE_RACE_WINNERS = [
  { winner_id: 'winner_001', race_name: '베를린 마라톤',      race_year: 2023, winner_name: 'Eliud Kipchoge',        winner_nationality: '케냐',     course_type: 'full', result_time: '2:02:42', goods_no: '4789123', source_url: '' },
  { winner_id: 'winner_002', race_name: '시카고 마라톤',      race_year: 2023, winner_name: 'Kelvin Kiptum',         winner_nationality: '케냐',     course_type: 'full', result_time: '2:00:35', goods_no: '4789123', source_url: '' },
  { winner_id: 'winner_003', race_name: '도쿄 마라톤',        race_year: 2024, winner_name: 'Benson Kibarus',        winner_nationality: '케냐',     course_type: 'full', result_time: '2:02:16', goods_no: '4789123', source_url: '' },
  { winner_id: 'winner_004', race_name: '런던 마라톤',        race_year: 2024, winner_name: 'Alexander Munyao',      winner_nationality: '케냐',     course_type: 'full', result_time: '2:03:00', goods_no: '4789123', source_url: '' },
  { winner_id: 'winner_005', race_name: '보스턴 마라톤',      race_year: 2024, winner_name: 'Sisay Lemma',           winner_nationality: '에티오피아', course_type: 'full', result_time: '2:06:17', goods_no: '5123456', source_url: '' },
  { winner_id: 'winner_006', race_name: '뉴욕 마라톤',        race_year: 2023, winner_name: 'Tamirat Tola',          winner_nationality: '에티오피아', course_type: 'full', result_time: '2:04:58', goods_no: '5123456', source_url: '' },
  { winner_id: 'winner_007', race_name: '동아 서울 마라톤',   race_year: 2024, winner_name: 'Haile Dejene',          winner_nationality: '에티오피아', course_type: 'full', result_time: '2:05:59', goods_no: '4456789', source_url: '' },
  { winner_id: 'winner_008', race_name: 'JTBC 서울 마라톤',  race_year: 2023, winner_name: 'Berhane Gebremeskel',   winner_nationality: '에티오피아', course_type: 'full', result_time: '2:07:14', goods_no: '4456789', source_url: '' },
  { winner_id: 'winner_009', race_name: '춘천 마라톤',        race_year: 2023, winner_name: '이승제',               winner_nationality: '한국',     course_type: 'full', result_time: '2:18:44', goods_no: '4112233', source_url: '' },
  { winner_id: 'winner_010', race_name: '시드니 마라톤',      race_year: 2024, winner_name: 'Gabriel Geay',          winner_nationality: '탄자니아',  course_type: 'full', result_time: '2:05:34', goods_no: '5123456', source_url: '' },
];

// ── Races 데이터 (세계 7대 + 국내 25개 = 32개) ──────────────
const SAMPLE_RACES = [
  // 세계 7대 메이저
  { race_id: 'tokyo_full',    race_name: '도쿄 마라톤',             country: 'JP', city: '도쿄',      course_type: 'full', typical_month: 3,  avg_temp_celsius: 10, surface_type: 'asphalt', elevation_gain_m: 75,  difficulty: 1, course_summary: '도심 평탄, 저온, 세계기록급 고속 코스',                                    shoe_priority_hint: '경량, 반발력, 카본 플레이트', is_world_major: true,  is_active: true },
  { race_id: 'boston_full',   race_name: '보스턴 마라톤',           country: 'US', city: '보스턴',    course_type: 'full', typical_month: 4,  avg_temp_celsius: 12, surface_type: 'asphalt', elevation_gain_m: 137, difficulty: 5, course_summary: '전반 내리막 → 후반 Heartbreak Hill 고난도',                               shoe_priority_hint: '쿠션, 안정성, 내구성',        is_world_major: true,  is_active: true },
  { race_id: 'london_full',   race_name: '런던 마라톤',             country: 'GB', city: '런던',      course_type: 'full', typical_month: 4,  avg_temp_celsius: 13, surface_type: 'asphalt', elevation_gain_m: 54,  difficulty: 2, course_summary: '템즈강변 평탄, 서늘한 날씨',                                               shoe_priority_hint: '경량, 반발력',                is_world_major: true,  is_active: true },
  { race_id: 'berlin_full',   race_name: '베를린 마라톤',           country: 'DE', city: '베를린',    course_type: 'full', typical_month: 9,  avg_temp_celsius: 16, surface_type: 'asphalt', elevation_gain_m: 65,  difficulty: 1, course_summary: '세계 최고속 코스, 초평탄, 세계기록 최다 배출',                              shoe_priority_hint: '경량, 카본 플레이트, 반발력',  is_world_major: true,  is_active: true },
  { race_id: 'chicago_full',  race_name: '시카고 마라톤',           country: 'US', city: '시카고',    course_type: 'full', typical_month: 10, avg_temp_celsius: 12, surface_type: 'asphalt', elevation_gain_m: 67,  difficulty: 2, course_summary: '도심 루프형 평탄, 강풍 변수',                                              shoe_priority_hint: '경량, 쿠션',                  is_world_major: true,  is_active: true },
  { race_id: 'newyork_full',  race_name: '뉴욕 마라톤',             country: 'US', city: '뉴욕',      course_type: 'full', typical_month: 11, avg_temp_celsius: 10, surface_type: 'asphalt', elevation_gain_m: 294, difficulty: 4, course_summary: '다리 5개 통과, 고저차 있음, 고난도',                                        shoe_priority_hint: '쿠션, 안정성, 내구성',        is_world_major: true,  is_active: true },
  { race_id: 'sydney_full',   race_name: '시드니 마라톤',           country: 'AU', city: '시드니',    course_type: 'full', typical_month: 9,  avg_temp_celsius: 16, surface_type: 'asphalt', elevation_gain_m: 320, difficulty: 4, course_summary: '오페라하우스 피니시, 지속적인 오르막과 내리막, 고난도',                     shoe_priority_hint: '쿠션, 안정성, 그립',          is_world_major: true,  is_active: true },
  // 국내 25개
  { race_id: 'donga_full',    race_name: '동아 서울 마라톤',        country: 'KR', city: '서울',      course_type: 'full', typical_month: 3,  avg_temp_celsius: 8,  surface_type: 'asphalt', elevation_gain_m: 50,  difficulty: 2, course_summary: '광화문~잠실, 도심 평탄, 국내 최고 권위 및 기록 산실',                       shoe_priority_hint: '경량, 반발력, 안정성',        is_world_major: false, is_active: true },
  { race_id: 'jtbc_full',     race_name: 'JTBC 서울 마라톤',       country: 'KR', city: '서울',      course_type: 'full', typical_month: 11, avg_temp_celsius: 12, surface_type: 'asphalt', elevation_gain_m: 85,  difficulty: 2, course_summary: '상암~잠실, 전반 평탄 후반 완만 오르막, 한강변 및 잠실교 통과',             shoe_priority_hint: '쿠션, 안정성, 경량',          is_world_major: false, is_active: true },
  { race_id: 'chuncheon_full',race_name: '춘천 마라톤',             country: 'KR', city: '강원 춘천', course_type: 'full', typical_month: 10, avg_temp_celsius: 14, surface_type: 'asphalt', elevation_gain_m: 120, difficulty: 3, course_summary: '의암호 순환, 가을 서늘한 기온, 잔잔한 업다운이 반복되는 롤링 코스',         shoe_priority_hint: '쿠션, 안정성',                is_world_major: false, is_active: true },
  { race_id: 'gyeongju_full', race_name: '경주 마라톤',             country: 'KR', city: '경북 경주', course_type: 'full', typical_month: 10, avg_temp_celsius: 15, surface_type: 'mixed',   elevation_gain_m: 90,  difficulty: 2, course_summary: '유적지 순환, 완만한 기복, 일부 구간 노면 불규칙 및 직선 주로 위주',       shoe_priority_hint: '안정성, 쿠션',                is_world_major: false, is_active: true },
  { race_id: 'daegu_full',    race_name: '대구 마라톤',             country: 'KR', city: '대구',      course_type: 'full', typical_month: 4,  avg_temp_celsius: 18, surface_type: 'asphalt', elevation_gain_m: 60,  difficulty: 2, course_summary: '도심 루프형 코스, 대체로 평탄하나 분지 특유의 높은 기온이 변수',           shoe_priority_hint: '통기성, 경량, 쿠션',          is_world_major: false, is_active: true },
  { race_id: 'gongju_full',   race_name: '공주 백제 마라톤',        country: 'KR', city: '충남 공주', course_type: 'full', typical_month: 9,  avg_temp_celsius: 20, surface_type: 'asphalt', elevation_gain_m: 30,  difficulty: 1, course_summary: '금강변 국도 주로, 고저차가 거의 없는 초평탄 코스',                         shoe_priority_hint: '경량, 반발력',                is_world_major: false, is_active: true },
  { race_id: 'gunsan_half',   race_name: '군산 새만금 국제 마라톤', country: 'KR', city: '전북 군산', course_type: 'half', typical_month: 4,  avg_temp_celsius: 14, surface_type: 'asphalt', elevation_gain_m: 20,  difficulty: 2, course_summary: '새만금 방조제 직진 코스, 평탄하나 바다 한가운데의 강력한 맞바람 주의',     shoe_priority_hint: '안정성, 경량',                is_world_major: false, is_active: true },
  { race_id: 'incheon_half',  race_name: '인천 송도 국제 마라톤',  country: 'KR', city: '인천',      course_type: 'half', typical_month: 10, avg_temp_celsius: 15, surface_type: 'asphalt', elevation_gain_m: 40,  difficulty: 1, course_summary: '송도 도심 및 해안도로, 직선 위주의 단조로운 코스와 해풍 영향',             shoe_priority_hint: '경량, 안정성',                is_world_major: false, is_active: true },
  { race_id: 'busan_full',    race_name: '부산 바다 마라톤',        country: 'KR', city: '부산',      course_type: 'full', typical_month: 10, avg_temp_celsius: 18, surface_type: 'asphalt', elevation_gain_m: 180, difficulty: 4, course_summary: '광안대교 등 해상 교량 위주, 지속적인 오르막/내리막과 강한 바닷바람',       shoe_priority_hint: '쿠션, 안정성, 그립',          is_world_major: false, is_active: true },
  { race_id: 'jeju_half',     race_name: '제주 감귤 국제 마라톤',  country: 'KR', city: '제주',      course_type: 'half', typical_month: 11, avg_temp_celsius: 16, surface_type: 'mixed',   elevation_gain_m: 200, difficulty: 4, course_summary: '해안 및 중산간 도로, 기복이 심하며 제주 특유의 돌풍과 기상 변화 심함',   shoe_priority_hint: '쿠션, 안정성',                is_world_major: false, is_active: true },
  { race_id: 'cheorwon_half', race_name: '철원 DMZ 평화 마라톤',   country: 'KR', city: '강원 철원', course_type: 'half', typical_month: 9,  avg_temp_celsius: 22, surface_type: 'asphalt', elevation_gain_m: 45,  difficulty: 2, course_summary: '민통선 내부 통과, 탁 트인 벌판으로 고저차는 적으나 그늘이 없음',          shoe_priority_hint: '통기성, 경량',                is_world_major: false, is_active: true },
  { race_id: 'miryang_full',  race_name: '밀양 아리랑 마라톤',     country: 'KR', city: '경남 밀양', course_type: 'full', typical_month: 2,  avg_temp_celsius: 5,  surface_type: 'asphalt', elevation_gain_m: 55,  difficulty: 2, course_summary: '시즌 오픈 대회, 초봄 쌀쌀한 날씨, 국도 중심의 평탄한 코스',             shoe_priority_hint: '안정성, 쿠션',                is_world_major: false, is_active: true },
  { race_id: 'hapcheon_half', race_name: '합천 벚꽃 마라톤',       country: 'KR', city: '경남 합천', course_type: 'half', typical_month: 4,  avg_temp_celsius: 16, surface_type: 'asphalt', elevation_gain_m: 110, difficulty: 3, course_summary: '황강변 벚꽃길 주로, 풍광은 좋으나 미세한 업다운이 지속됨',               shoe_priority_hint: '쿠션, 안정성',                is_world_major: false, is_active: true },
  { race_id: 'jinju_half',    race_name: '진주 남강 마라톤',       country: 'KR', city: '경남 진주', course_type: 'half', typical_month: 3,  avg_temp_celsius: 10, surface_type: 'asphalt', elevation_gain_m: 35,  difficulty: 1, course_summary: '남강변 순환, 기복이 적어 기록 달성에 유리하며 쾌적한 봄 기후',            shoe_priority_hint: '경량, 반발력',                is_world_major: false, is_active: true },
  { race_id: 'suncheon_full', race_name: '순천 남승룡 마라톤',     country: 'KR', city: '전남 순천', course_type: 'full', typical_month: 11, avg_temp_celsius: 12, surface_type: 'asphalt', elevation_gain_m: 50,  difficulty: 2, course_summary: '순천만 습지 인근 주로, 평탄하지만 일부 구간 코스 폭이 좁음',             shoe_priority_hint: '안정성, 쿠션',                is_world_major: false, is_active: true },
  { race_id: 'goseong_half',  race_name: '고성 공룡 마라톤',       country: 'KR', city: '경남 고성', course_type: 'half', typical_month: 4,  avg_temp_celsius: 15, surface_type: 'asphalt', elevation_gain_m: 150, difficulty: 3, course_summary: '해안도로 중심, 굴곡진 해안선에 따른 고저차와 바닷바람 영향',             shoe_priority_hint: '쿠션, 안정성',                is_world_major: false, is_active: true },
  { race_id: 'cheongju_half', race_name: '청주 대청호 마라톤',     country: 'KR', city: '충북 청주', course_type: 'half', typical_month: 9,  avg_temp_celsius: 22, surface_type: 'asphalt', elevation_gain_m: 280, difficulty: 5, course_summary: '대청호반 순환, 지속적인 급경사와 내리막이 반복되는 최고 난이도 코스',     shoe_priority_hint: '쿠션, 안정성, 그립',          is_world_major: false, is_active: true },
  { race_id: 'pohang_half',   race_name: '포항 해변 마라톤',       country: 'KR', city: '경북 포항', course_type: 'half', typical_month: 4,  avg_temp_celsius: 16, surface_type: 'asphalt', elevation_gain_m: 50,  difficulty: 2, course_summary: '영일대 해안도로 중심, 평탄하나 기온 상승과 맞바람이 주요 변수',           shoe_priority_hint: '통기성, 경량',                is_world_major: false, is_active: true },
  { race_id: 'yeosu_half',    race_name: '여수 마라톤',            country: 'KR', city: '전남 여수', course_type: 'half', typical_month: 1,  avg_temp_celsius: 5,  surface_type: 'asphalt', elevation_gain_m: 190, difficulty: 4, course_summary: '한겨울 시즌 오픈 대회, 강한 해풍과 교량 통과 언덕이 많은 고난도',         shoe_priority_hint: '쿠션, 안정성',                is_world_major: false, is_active: true },
  { race_id: 'seoul_half',    race_name: '서울 하프 마라톤',       country: 'KR', city: '서울',      course_type: 'half', typical_month: 4,  avg_temp_celsius: 14, surface_type: 'asphalt', elevation_gain_m: 55,  difficulty: 2, course_summary: '광화문~상암, 도심 주요 구간 통제, 넓은 도로와 쾌적한 평탄 위주',         shoe_priority_hint: '경량, 반발력',                is_world_major: false, is_active: true },
  { race_id: 'boseong_half',  race_name: '보성 녹차 마라톤',       country: 'KR', city: '전남 보성', course_type: 'half', typical_month: 5,  avg_temp_celsius: 22, surface_type: 'mixed',   elevation_gain_m: 170, difficulty: 3, course_summary: '메타세쿼이아 길 통과, 5월의 높은 기온과 잦은 언덕 구간 존재',             shoe_priority_hint: '통기성, 쿠션',                is_world_major: false, is_active: true },
  { race_id: 'suwon_full',    race_name: '수원 화성 마라톤',       country: 'KR', city: '경기 수원', course_type: 'full', typical_month: 4,  avg_temp_celsius: 14, surface_type: 'asphalt', elevation_gain_m: 100, difficulty: 2, course_summary: '화성행궁 및 외곽 도로, 완만한 구릉지가 섞인 전형적인 도심/국도 코스',     shoe_priority_hint: '안정성, 쿠션',                is_world_major: false, is_active: true },
  { race_id: 'jeongeup_half', race_name: '정읍 내장산 단풍 마라톤',country: 'KR', city: '전북 정읍', course_type: 'half', typical_month: 10, avg_temp_celsius: 15, surface_type: 'mixed',   elevation_gain_m: 220, difficulty: 4, course_summary: '내장산 인근 주로, 산악 지대 인접으로 고저차가 뚜렷한 후반부 주의',       shoe_priority_hint: '쿠션, 안정성, 그립',          is_world_major: false, is_active: true },
  { race_id: 'yangpyeong_full',race_name: '양평 남한강 마라톤',    country: 'KR', city: '경기 양평', course_type: 'full', typical_month: 6,  avg_temp_celsius: 26, surface_type: 'asphalt', elevation_gain_m: 70,  difficulty: 2, course_summary: '남한강변 자전거길 및 국도, 6월 초여름의 높은 습도와 더위가 최대 관건',   shoe_priority_hint: '통기성, 경량, 쿠션',          is_world_major: false, is_active: true },
  { race_id: 'paju_full',     race_name: '파주 평화 마라톤',       country: 'KR', city: '경기 파주', course_type: 'full', typical_month: 10, avg_temp_celsius: 14, surface_type: 'asphalt', elevation_gain_m: 55,  difficulty: 1, course_summary: '임진각 및 통일대교 통과, 도로가 넓고 평탄하여 가을철 기록 단축에 용이', shoe_priority_hint: '경량, 반발력',                is_world_major: false, is_active: true },
];

const SAMPLE_SIZE_GUIDE = [
  { size_guide_id: 'sg_001', brand: '아식스',   model_name: '젤 카야노 31',    sizing_tendency: 'true',  width_tendency: 'normal', size_adjust_mm: 0,  fit_note: '한국인 발형 기준에 가장 가까운 기준 모델' },
  { size_guide_id: 'sg_002', brand: '아식스',   model_name: '노바블라스트 4',  sizing_tendency: 'true',  width_tendency: 'wide',   size_adjust_mm: 0,  fit_note: '발볼이 넓게 설계되어 와이드 발에 특히 적합' },
  { size_guide_id: 'sg_003', brand: '아식스',   model_name: '글라이드라이드 3',sizing_tendency: 'true',  width_tendency: 'normal', size_adjust_mm: 0,  fit_note: '표준 핏, 아식스 기준 동일' },
  { size_guide_id: 'sg_004', brand: '뉴발란스', model_name: 'W480SK5',         sizing_tendency: 'true',  width_tendency: 'wide',   size_adjust_mm: 0,  fit_note: '발볼 넓음, 와이드 핏 옵션 많음' },
  { size_guide_id: 'sg_005', brand: '나이키',   model_name: '페가수스 41',     sizing_tendency: 'small', width_tendency: 'narrow', size_adjust_mm: -5, fit_note: '0.5사이즈 업 권장, 발볼 좁음 — 5mm 큰 사이즈 선택' },
  { size_guide_id: 'sg_006', brand: '호카',     model_name: '클리프턴 9',      sizing_tendency: 'large', width_tendency: 'wide',   size_adjust_mm: 5,  fit_note: '내부 공간 여유 있음, 0.5사이즈 작게도 가능 — 5mm 작은 사이즈 선택' },
  { size_guide_id: 'sg_007', brand: '호카',     model_name: '마파테 스피드 2', sizing_tendency: 'large', width_tendency: 'wide',   size_adjust_mm: 5,  fit_note: '앞발 공간 넉넉하게 설계 — 5mm 작은 사이즈 선택' },
  { size_guide_id: 'sg_008', brand: '사코니',   model_name: '엔돌핀 스피드 4', sizing_tendency: 'true',  width_tendency: 'normal', size_adjust_mm: 0,  fit_note: '표준 핏, 모델별 편차 있음' },
  { size_guide_id: 'sg_009', brand: '사코니',   model_name: '라이드 17',       sizing_tendency: 'true',  width_tendency: 'narrow', size_adjust_mm: 0,  fit_note: '발볼 좁은 분께 적합, 좁은 발에 편안한 홀드감' },
  { size_guide_id: 'sg_010', brand: '미즈노',   model_name: '맥시마이저 26',   sizing_tendency: 'true',  width_tendency: 'normal', size_adjust_mm: 0,  fit_note: '한국인 발형 잘 맞음, 표준 핏' },
];

// ============================================================
// 유틸
// ============================================================

function validateEnv() {
  const required = ['SPREADSHEET_ID', 'GOOGLE_CLIENT_EMAIL', 'GOOGLE_PRIVATE_KEY'];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(`필수 환경변수 누락: ${missing.join(', ')}\nbackend/.env 파일을 확인하세요.`);
  }
}

async function getOrCreateSheet(doc, title) {
  let sheet = doc.sheetsByTitle[title];
  if (sheet) {
    console.log(`  ✓ "${title}" 시트 기존 존재 — 초기화 후 재설정`);
    await sheet.clear();
  } else {
    sheet = await doc.addSheet({ title });
    console.log(`  ✓ "${title}" 시트 새로 생성`);
  }
  return sheet;
}

async function setupSheet(doc, title, headers, rows) {
  const sheet = await getOrCreateSheet(doc, title);
  await sheet.setHeaderRow(headers);
  if (rows && rows.length > 0) {
    const rowData = rows.map((item) => headers.map((col) => item[col] ?? ''));
    await sheet.addRows(rowData);
    console.log(`  ✓ ${rows.length}개 데이터 삽입 완료\n`);
  } else {
    console.log('  ✓ 헤더 설정 완료 (데이터는 백엔드 운영 중 자동 기록)\n');
  }
}

// ============================================================
// 메인
// ============================================================

async function main() {
  console.log('\n🚀 RunFit Google Sheets 초기화 시작 (v2.0)\n');

  validateEnv();

  const auth = new JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const doc = new GoogleSpreadsheet(process.env.SPREADSHEET_ID, auth);
  await doc.loadInfo();
  console.log(`📄 스프레드시트: "${doc.title}"\n`);

  console.log('[1/6] Shoes 시트 설정 중...');
  await setupSheet(doc, 'Shoes', SHOES_HEADERS, SAMPLE_SHOES);

  console.log('[2/6] Logs 시트 설정 중...');
  await setupSheet(doc, 'Logs', LOGS_HEADERS, null);

  console.log('[3/6] Celebs 시트 설정 중...');
  await setupSheet(doc, 'Celebs', CELEBS_HEADERS, SAMPLE_CELEBS);

  console.log('[4/6] RaceWinners 시트 설정 중...');
  await setupSheet(doc, 'RaceWinners', RACE_WINNERS_HEADERS, SAMPLE_RACE_WINNERS);

  console.log('[5/6] Races 시트 설정 중...');
  await setupSheet(doc, 'Races', RACES_HEADERS, SAMPLE_RACES);

  console.log('[6/6] SizeGuide 시트 설정 중...');
  await setupSheet(doc, 'SizeGuide', SIZE_GUIDE_HEADERS, SAMPLE_SIZE_GUIDE);

  console.log('✅ 초기화 완료! (시트 6개, 러닝화 10개, 대회 32개)');
  console.log(`👉 확인: https://docs.google.com/spreadsheets/d/${process.env.SPREADSHEET_ID}\n`);
}

main().catch((err) => {
  console.error('\n❌ 초기화 실패:', err.message);
  process.exit(1);
});
