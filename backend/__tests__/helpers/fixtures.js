/**
 * 테스트 공통 픽스처 (mock 데이터)
 * 모든 테스트 파일에서 import하여 재사용
 */

// ============================================================
// 신발 (Shoes)
// ============================================================

const mockShoeNormal = {
  goods_no: 'SHOE001',
  goods_name: '아식스 젤-카야노 31',
  brand: 'ASICS',
  price: 160000,
  url: 'https://example.com/shoe001',
  thumbnail: 'https://example.com/shoe001.jpg',
  width: '보통',
  cushion: 4,
  weight: 3,
  distance: '장거리',
  breathability: 4,
  fit: 4,
  summary: '안정성과 쿠션이 뛰어난 장거리 트레이닝화',
  review_count_used: 120,
  confidence: 'high',
  main_color: 'Blue',
  accent_color: 'White',
  lifespan_km_min: 700,
  lifespan_km_max: 900,
  has_carbon_plate: false,
};

const mockShoeCarbonPlate = {
  goods_no: 'SHOE002',
  goods_name: '나이키 줌 플라이 5',
  brand: 'Nike',
  price: 230000,
  url: 'https://example.com/shoe002',
  thumbnail: 'https://example.com/shoe002.jpg',
  width: '보통',
  cushion: 3,
  weight: 1,
  distance: '전거리',
  breathability: 3,
  fit: 3,
  summary: '카본 플레이트 레이스화',
  review_count_used: 80,
  confidence: 'high',
  main_color: 'White',
  accent_color: 'Black',
  lifespan_km_min: 300,
  lifespan_km_max: 500,
  has_carbon_plate: true,
};

const mockShoeWide = {
  goods_no: 'SHOE003',
  goods_name: '뉴발란스 860v14',
  brand: 'New Balance',
  price: 130000,
  url: 'https://example.com/shoe003',
  thumbnail: 'https://example.com/shoe003.jpg',
  width: '넓음',
  cushion: 4,
  weight: 3,
  distance: '중거리',
  breathability: 3,
  fit: 4,
  summary: '넓은 발볼을 위한 트레이닝화',
  review_count_used: 60,
  confidence: 'medium',
  main_color: 'Gray',
  accent_color: 'Blue',
  lifespan_km_min: 600,
  lifespan_km_max: 800,
  has_carbon_plate: false,
};

const mockShoeLowPrice = {
  goods_no: 'SHOE004',
  goods_name: '아디다스 울트라부스트 라이트',
  brand: 'Adidas',
  price: 65000,
  url: 'https://example.com/shoe004',
  thumbnail: 'https://example.com/shoe004.jpg',
  width: '보통',
  cushion: 3,
  weight: 3,
  distance: '단거리',
  breathability: 4,
  fit: 3,
  summary: '가성비 입문용 러닝화',
  review_count_used: 30,
  confidence: 'low',
  main_color: 'Black',
  accent_color: 'White',
  lifespan_km_min: 500,
  lifespan_km_max: 700,
  has_carbon_plate: false,
};

// ============================================================
// 대회 (Races)
// ============================================================

const mockRaceFull = {
  race_id: 'RACE001',
  race_name: '서울 마라톤',
  country: 'Korea',
  city: 'Seoul',
  course_type: 'full',
  typical_month: 3,
  avg_temp_celsius: 10,
  surface_type: 'asphalt',
  elevation_gain_m: 50,
  difficulty: 2,
  course_summary: '평탄한 도심 코스로 PB 도전에 적합',
  shoe_priority_hint: '경량,쿠션',
  is_world_major: false,
  is_active: true,
};

const mockRaceHalf = {
  race_id: 'RACE002',
  race_name: '부산 하프마라톤',
  country: 'Korea',
  city: 'Busan',
  course_type: 'half',
  typical_month: 10,
  avg_temp_celsius: 18,
  surface_type: 'asphalt',
  elevation_gain_m: 30,
  difficulty: 1,
  course_summary: '해안도로를 따라 달리는 평탄한 코스',
  shoe_priority_hint: '통기성,경량',
  is_world_major: false,
  is_active: true,
};

const mockRaceInactive = {
  race_id: 'RACE003',
  race_name: '제주 마라톤',
  country: 'Korea',
  city: 'Jeju',
  course_type: 'full',
  typical_month: 5,
  avg_temp_celsius: 20,
  surface_type: 'mixed',
  elevation_gain_m: 200,
  difficulty: 4,
  course_summary: '험난한 제주 자연 코스',
  shoe_priority_hint: '안정성,내구성',
  is_world_major: false,
  is_active: false,
};

// ============================================================
// 대회 우승자 (RaceWinners)
// ============================================================

const mockRaceWinner = {
  winner_id: 'WIN001',
  race_name: '서울 마라톤',
  race_year: 2024,
  winner_name: '홍길동',
  winner_nationality: 'Korea',
  course_type: 'full',
  result_time: '2:08:30',
  goods_no: 'SHOE002',
  source_url: 'https://example.com/result',
};

// ============================================================
// 셀럽 (Celebs)
// ============================================================

const mockCelebAthlete = {
  celeb_id: 'CELEB001',
  celeb_name: '손흥민',
  celeb_type: 'athlete',
  celeb_image_url: 'https://example.com/celeb001.jpg',
  goods_no: 'SHOE001',
  source_url: 'https://example.com/celeb001-source',
};

const mockCelebInfluencer = {
  celeb_id: 'CELEB002',
  celeb_name: '러닝인플루언서',
  celeb_type: 'influencer',
  celeb_image_url: 'https://example.com/celeb002.jpg',
  goods_no: 'SHOE002',
  source_url: 'https://example.com/celeb002-source',
};

// ============================================================
// 사이즈 가이드 (SizeGuide)
// ============================================================

const mockSizeGuideAsics = {
  size_guide_id: 'SG001',
  brand: 'ASICS',
  model_name: '젤-카야노 31',
  sizing_tendency: 'true_to_size',
  width_tendency: 'normal',
  size_adjust_mm: 0,
  fit_note: '아식스 표준 사이즈 기준',
};

const mockSizeGuideNike = {
  size_guide_id: 'SG002',
  brand: 'Nike',
  model_name: '줌 플라이 5',
  sizing_tendency: 'runs_small',
  width_tendency: 'narrow',
  size_adjust_mm: 5,
  fit_note: '나이키는 일반적으로 5mm 크게 구매 권장',
};

const mockSizeGuideNikeWildcard = {
  size_guide_id: 'SG003',
  brand: 'Nike',
  model_name: '*',
  sizing_tendency: 'runs_small',
  width_tendency: 'narrow',
  size_adjust_mm: 5,
  fit_note: '나이키 전반적으로 5mm 크게 권장',
};

// ============================================================
// 족형(foot_shape) 테스트 전용 신발
// ============================================================

/**
 * calcScore 족형(foot_shape) 점수 검증용 픽스처
 *
 * 기준 사용자 (mockUserProfileFlat, foot_shape:'egyptian', foot_width:'narrow'):
 *   running_distance: 'short'  → DISTANCE_MAP → '단거리'
 *   foot_width: 'narrow'       → WIDTH_MAP    → '좁음'
 *   preferred_cushion: 5
 *   budget: null               → BUDGET_MAX[null] → Infinity
 *   foot_shape: 'egyptian'
 *
 * 두 신발은 width='좁음'으로 동일하여 발볼 점수를 격리 — toe_fit 차이만 검증
 *
 * 예상 점수 (mockUserProfileFlat 기준):
 *   SHOE_STAB (toe_fit=egyptian, width=좁음):
 *     발볼(+40) + 쿠션(0) + 거리(+20) + 예산(+10) + toe_fit보너스(+10) + 발볼패널티(-10) = 70
 *   SHOE_NEUT (toe_fit=all, width=좁음):
 *     발볼(+40) + 쿠션(0) + 거리(+20) + 예산(+10) + toe_fit보너스(0) + 발볼패널티(-10) = 60
 *   → 이집트형 특화 신발이 10점 높음
 */
const mockShoeStability = {
  goods_no: 'SHOE_STAB',
  goods_name: '아식스 족형테스트-이집트형맞춤',
  brand: 'ASICS',
  price: 100000,
  url: 'https://example.com/shoe_stab',
  thumbnail: 'https://example.com/shoe_stab.jpg',
  width: '좁음',
  cushion: 1,
  weight: 3,
  distance: '단거리',
  breathability: 3,
  fit: 3,
  summary: '이집트형 족형 테스트 픽스처 (좁은 발볼, toe_fit=egyptian)',
  review_count_used: 10,
  confidence: 'medium',
  main_color: 'White',
  accent_color: null,
  lifespan_km_min: 500,
  lifespan_km_max: 700,
  has_carbon_plate: false,
  toe_fit: 'egyptian',
};

/** mockShoeStability와 toe_fit만 다름 (all) — 같은 발볼(좁음)로 점수 격리 */
const mockShoeNeutralArch = {
  ...mockShoeStability,
  goods_no: 'SHOE_NEUT',
  goods_name: '뉴발란스 족형테스트-범용',
  brand: 'New Balance',
  toe_fit: 'all',
  summary: '범용 족형 테스트 픽스처 (좁은 발볼, toe_fit=all)',
};

// ============================================================
// 사용자 프로파일 (UserProfile)
// ============================================================

const mockUserProfileLong = {
  running_distance: 'long',
  frequency: 'weekly',
  foot_width: 'normal',
  preferred_cushion: 4,
  priorities: ['protection', 'comfort'],
  budget: 'high',
  free_text: '마라톤 준비 중',
};

const mockUserProfileShortWide = {
  running_distance: 'short',
  frequency: 'daily',
  foot_width: 'wide',
  preferred_cushion: 3,
  priorities: ['speed'],
  budget: 'mid',
  free_text: '',
};

/**
 * 족형 테스트 전용 프로파일 — 이집트형
 * mockShoeStability(넓음, toe_fit=egyptian) / mockShoeNeutralArch(좁음, toe_fit=all)와
 * 조합하여 점수 차이 검증
 */
const mockUserProfileFlat = {
  running_distance: 'short',
  frequency: 'casual',
  foot_width: 'narrow',
  preferred_cushion: 5,
  priorities: [],
  budget: null,
  free_text: '',
  foot_shape: 'egyptian',
};

/** 족형 테스트 전용 프로파일 — 그리스형 */
const mockUserProfileHighArch = {
  ...mockUserProfileFlat,
  foot_shape: 'greek',
};

// ============================================================
// exports
// ============================================================

module.exports = {
  // 신발
  mockShoeNormal,
  mockShoeCarbonPlate,
  mockShoeWide,
  mockShoeLowPrice,
  mockAllShoes: [mockShoeNormal, mockShoeCarbonPlate, mockShoeWide, mockShoeLowPrice],
  // 족형 테스트 전용 신발
  mockShoeStability,
  mockShoeNeutralArch,
  // 대회
  mockRaceFull,
  mockRaceHalf,
  mockRaceInactive,
  mockAllRaces: [mockRaceFull, mockRaceHalf, mockRaceInactive],
  // 우승자
  mockRaceWinner,
  mockAllWinners: [mockRaceWinner],
  // 셀럽
  mockCelebAthlete,
  mockCelebInfluencer,
  mockAllCelebs: [mockCelebAthlete, mockCelebInfluencer],
  // 사이즈 가이드
  mockSizeGuideAsics,
  mockSizeGuideNike,
  mockSizeGuideNikeWildcard,
  mockAllSizeGuides: [mockSizeGuideAsics, mockSizeGuideNike, mockSizeGuideNikeWildcard],
  // 사용자 프로파일
  mockUserProfileLong,
  mockUserProfileShortWide,
  mockUserProfileFlat,
  mockUserProfileHighArch,
};
