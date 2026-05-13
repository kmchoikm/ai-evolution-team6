/**
 * RunFit Google Sheets DML 시드 스크립트
 * 실행 (backend/ 폴더에서):
 *   npm run db:dml             ← 개발 DB (데이터 없는 시트에만 삽입)
 *   npm run db:dml -- --prod   ← 상용 DB (--prod 플래그 필수)
 *   npm run db:dml -- --force  ← 기존 데이터 유무와 무관하게 샘플 데이터 추가
 *
 * 핵심 원칙:
 *   - 기존 데이터를 절대 삭제하거나 덮어쓰지 않는다 (addRows만 사용)
 *   - 데이터가 이미 있는 시트는 건너뜀 (--force 시 추가 삽입)
 *   - 시트가 없으면 DDL을 먼저 실행하도록 안내
 *
 * ⚠️  ERD 변경 시 필수:
 *   SPEC.md §7 → 이 파일 하단 SCHEMA + SAMPLE_* 객체 → npm run db:seed 순으로 동기화
 *
 * 관리 시트 목록 (SPEC.md §7 기준):
 *   Sheet 1: Shoes       — 러닝화 메타데이터 (10개)
 *   Sheet 2: Logs        — 앱 자동 생성, 시드 대상 아님
 *   Sheet 3: Celebs      — 셀럽 착용 신발 (10개)
 *   Sheet 4: RaceWinners — 대회 우승자 착용 신발 (10개)
 *   Sheet 5: Races       — 대회 코스 정보 (30개)
 *   Sheet 6: SizeGuide   — 브랜드별 사이즈 가이드 (10개)
 */

'use strict';
require('dotenv').config();
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

// ============================================================
// SCHEMA 정의 — SPEC.md §7 ERD와 항상 동기화 유지
// ddl.js의 SCHEMA 객체와 동일하게 유지해야 함
// ============================================================

const SCHEMA = {
  Shoes: [
    'goods_no', 'goods_name', 'brand', 'price', 'url', 'thumbnail',
    'width', 'cushion', 'weight', 'distance',
    'breathability', 'fit', 'summary', 'review_count_used', 'confidence',
    'main_color', 'accent_color',
    'lifespan_km_min', 'lifespan_km_max', 'has_carbon_plate',
  ],
  Celebs: [
    'celeb_id', 'celeb_name', 'celeb_type', 'celeb_image_url', 'goods_no', 'source_url',
  ],
  RaceWinners: [
    'winner_id', 'race_name', 'race_year', 'winner_name',
    'winner_nationality', 'course_type', 'result_time', 'goods_no', 'source_url',
  ],
  Races: [
    'race_id', 'race_name', 'country', 'city', 'course_type',
    'typical_month', 'avg_temp_celsius', 'surface_type', 'elevation_gain_m',
    'difficulty', 'course_summary', 'shoe_priority_hint',
    'is_world_major', 'is_active',
  ],
  SizeGuide: [
    'size_guide_id', 'brand', 'model_name',
    'sizing_tendency', 'width_tendency', 'size_adjust_mm', 'fit_note',
  ],
};

// ============================================================
// Sheet 1: Shoes — 러닝화 메타데이터 (10개)
// SPEC.md §7.1 기준. main_color·accent_color는 팀이 직접 채우는 경우 빈 문자열 허용
// ============================================================

const SAMPLE_SHOES = [
  {
    goods_no: '5005842', goods_name: '맥시마이저 26 (오프 화이트)', brand: '미즈노',
    price: 59000, url: 'https://www.musinsa.com/products/5005842', thumbnail: '',
    width: '보통', cushion: 4, weight: 2, distance: '중거리',
    breathability: 4, fit: 5, summary: '가성비 좋은 데일리 러닝화, 쿠션감 우수',
    review_count_used: 20, confidence: 'high',
    main_color: '화이트', accent_color: '실버',
    lifespan_km_min: 600, lifespan_km_max: 800, has_carbon_plate: false,
  },
  {
    goods_no: '3990544', goods_name: 'W480SK5', brand: '뉴발란스',
    price: 75000, url: 'https://www.musinsa.com/products/3990544', thumbnail: '',
    width: '보통', cushion: 3, weight: 2, distance: '단거리',
    breathability: 4, fit: 4, summary: '가벼운 입문용 러닝화',
    review_count_used: 20, confidence: 'high',
    main_color: '그레이', accent_color: '네이비',
    lifespan_km_min: 500, lifespan_km_max: 700, has_carbon_plate: false,
  },
  {
    goods_no: '4521387', goods_name: '페가수스 41', brand: '나이키',
    price: 159000, url: 'https://www.musinsa.com/products/4521387', thumbnail: '',
    width: '보통', cushion: 4, weight: 3, distance: '전거리',
    breathability: 4, fit: 4, summary: '범용 데일리 트레이너, 안정적 쿠션',
    review_count_used: 20, confidence: 'high',
    main_color: '블랙', accent_color: '화이트',
    lifespan_km_min: 600, lifespan_km_max: 800, has_carbon_plate: false,
  },
  {
    goods_no: '5123456', goods_name: '마파테 스피드 2', brand: '호카',
    price: 239000, url: 'https://www.musinsa.com/products/5123456', thumbnail: '',
    width: '넓음', cushion: 5, weight: 3, distance: '장거리',
    breathability: 3, fit: 5, summary: '구름 같은 쿠션, 마라톤·장거리 최적',
    review_count_used: 18, confidence: 'high',
    main_color: '블루', accent_color: '오렌지',
    lifespan_km_min: 600, lifespan_km_max: 800, has_carbon_plate: false,
  },
  {
    goods_no: '4789123', goods_name: '엔돌핀 스피드 4', brand: '사코니',
    price: 199000, url: 'https://www.musinsa.com/products/4789123', thumbnail: '',
    width: '보통', cushion: 3, weight: 1, distance: '중거리',
    breathability: 5, fit: 4, summary: '초경량 반발력 카본 플레이트',
    review_count_used: 15, confidence: 'high',
    main_color: '화이트', accent_color: '그린',
    lifespan_km_min: 300, lifespan_km_max: 500, has_carbon_plate: true,
  },
  {
    goods_no: '4456789', goods_name: '노바블라스트 4', brand: '아식스',
    price: 149000, url: 'https://www.musinsa.com/products/4456789', thumbnail: '',
    width: '넓음', cushion: 5, weight: 3, distance: '장거리',
    breathability: 3, fit: 4, summary: '푹신한 쿠션, 장거리 부상 방지',
    review_count_used: 20, confidence: 'high',
    main_color: '블루', accent_color: '옐로우',
    lifespan_km_min: 600, lifespan_km_max: 800, has_carbon_plate: false,
  },
  {
    goods_no: '4112233', goods_name: '젤 카야노 31', brand: '아식스',
    price: 189000, url: 'https://www.musinsa.com/products/4112233', thumbnail: '',
    width: '보통', cushion: 4, weight: 4, distance: '장거리',
    breathability: 3, fit: 5, summary: '안정성 최고, 평발 러너에게 추천',
    review_count_used: 20, confidence: 'high',
    main_color: '네이비', accent_color: '실버',
    lifespan_km_min: 700, lifespan_km_max: 900, has_carbon_plate: false,
  },
  {
    goods_no: '5234567', goods_name: '클리프턴 9', brand: '호카',
    price: 169000, url: 'https://www.musinsa.com/products/5234567', thumbnail: '',
    width: '넓음', cushion: 5, weight: 2, distance: '전거리',
    breathability: 4, fit: 5, summary: '가벼우면서 푹신, 발볼 넓은 분께',
    review_count_used: 20, confidence: 'high',
    main_color: '화이트', accent_color: '스카이블루',
    lifespan_km_min: 600, lifespan_km_max: 800, has_carbon_plate: false,
  },
  {
    goods_no: '4998877', goods_name: '라이드 17', brand: '사코니',
    price: 139000, url: 'https://www.musinsa.com/products/4998877', thumbnail: '',
    width: '좁음', cushion: 3, weight: 2, distance: '중거리',
    breathability: 4, fit: 3, summary: '발볼 좁은 분께 적합, 균형형',
    review_count_used: 12, confidence: 'high',
    main_color: '그레이', accent_color: '블루',
    lifespan_km_min: 500, lifespan_km_max: 700, has_carbon_plate: false,
  },
  {
    goods_no: '4665544', goods_name: '글라이드라이드 3', brand: '아식스',
    price: 129000, url: 'https://www.musinsa.com/products/4665544', thumbnail: '',
    width: '보통', cushion: 4, weight: 4, distance: '장거리',
    breathability: 3, fit: 4, summary: '에너지 세이빙 장거리 트레이너',
    review_count_used: 8, confidence: 'medium',
    main_color: '블랙', accent_color: '레드',
    lifespan_km_min: 600, lifespan_km_max: 800, has_carbon_plate: false,
  },
];

// ============================================================
// Sheet 3: Celebs — 셀럽 착용 신발 (10개)
// SPEC.md §7.3 기준. goods_no는 Shoes 시트의 PK와 논리적 조인
// ============================================================

const SAMPLE_CELEBS = [
  { celeb_id: 'celeb_001', celeb_name: '이봉주',   celeb_type: 'athlete',    celeb_image_url: '', goods_no: '4456789', source_url: '' }, // 아식스 노바블라스트 4
  { celeb_id: 'celeb_002', celeb_name: '류현진',   celeb_type: 'athlete',    celeb_image_url: '', goods_no: '4521387', source_url: '' }, // 나이키 페가수스 41
  { celeb_id: 'celeb_003', celeb_name: '손흥민',   celeb_type: 'athlete',    celeb_image_url: '', goods_no: '4521387', source_url: '' }, // 나이키 페가수스 41
  { celeb_id: 'celeb_004', celeb_name: '이동호',   celeb_type: 'athlete',    celeb_image_url: '', goods_no: '4789123', source_url: '' }, // 사코니 엔돌핀 스피드 4
  { celeb_id: 'celeb_005', celeb_name: '러닝덕',   celeb_type: 'youtuber',   celeb_image_url: '', goods_no: '5123456', source_url: '' }, // 호카 마파테 스피드 2
  { celeb_id: 'celeb_006', celeb_name: '마라톤TV', celeb_type: 'youtuber',   celeb_image_url: '', goods_no: '4112233', source_url: '' }, // 아식스 젤 카야노 31
  { celeb_id: 'celeb_007', celeb_name: '김가람',   celeb_type: 'youtuber',   celeb_image_url: '', goods_no: '5005842', source_url: '' }, // 미즈노 맥시마이저 26
  { celeb_id: 'celeb_008', celeb_name: '양정아',   celeb_type: 'influencer', celeb_image_url: '', goods_no: '5234567', source_url: '' }, // 호카 클리프턴 9
  { celeb_id: 'celeb_009', celeb_name: '박지윤',   celeb_type: 'influencer', celeb_image_url: '', goods_no: '3990544', source_url: '' }, // 뉴발란스 W480SK5
  { celeb_id: 'celeb_010', celeb_name: '정진우',   celeb_type: 'influencer', celeb_image_url: '', goods_no: '4456789', source_url: '' }, // 아식스 노바블라스트 4
];

// ============================================================
// Sheet 4: RaceWinners — 대회 우승자 착용 신발 (10개)
// SPEC.md §7.4 기준. goods_no는 Shoes 시트의 PK와 논리적 조인
// ============================================================

const SAMPLE_RACE_WINNERS = [
  { winner_id: 'winner_001', race_name: '도쿄 마라톤',        race_year: 2024, winner_name: '알렉산더 무타이',   winner_nationality: 'KE', course_type: 'full', result_time: '2:02:27', goods_no: '4789123', source_url: '' },
  { winner_id: 'winner_002', race_name: '베를린 마라톤',      race_year: 2023, winner_name: '에리아스 킵라가트', winner_nationality: 'KE', course_type: 'full', result_time: '2:01:53', goods_no: '4789123', source_url: '' },
  { winner_id: 'winner_003', race_name: '보스턴 마라톤',      race_year: 2024, winner_name: '시라즈 아사파',     winner_nationality: 'ET', course_type: 'full', result_time: '2:06:42', goods_no: '5123456', source_url: '' },
  { winner_id: 'winner_004', race_name: '뉴욕 마라톤',        race_year: 2023, winner_name: '알베르트 코스게이', winner_nationality: 'KE', course_type: 'full', result_time: '2:08:11', goods_no: '5123456', source_url: '' },
  { winner_id: 'winner_005', race_name: '시카고 마라톤',      race_year: 2023, winner_name: '세이폼 아센파',     winner_nationality: 'ET', course_type: 'full', result_time: '2:03:17', goods_no: '4789123', source_url: '' },
  { winner_id: 'winner_006', race_name: '대전 서울 마라톤',   race_year: 2024, winner_name: '김민호',            winner_nationality: 'KR', course_type: 'full', result_time: '2:11:34', goods_no: '4456789', source_url: '' },
  { winner_id: 'winner_007', race_name: '춘천 마라톤',        race_year: 2023, winner_name: '박상혁',            winner_nationality: 'KR', course_type: 'full', result_time: '2:18:45', goods_no: '4112233', source_url: '' },
  { winner_id: 'winner_008', race_name: 'JTBC 서울 마라톤',  race_year: 2023, winner_name: '이재원',            winner_nationality: 'KR', course_type: 'half', result_time: '1:04:22', goods_no: '4789123', source_url: '' },
  { winner_id: 'winner_009', race_name: '경주 마라톤',        race_year: 2023, winner_name: '정우진',            winner_nationality: 'KR', course_type: 'full', result_time: '2:22:11', goods_no: '4665544', source_url: '' },
  { winner_id: 'winner_010', race_name: '대구 마라톤',        race_year: 2024, winner_name: '한동수',            winner_nationality: 'KR', course_type: 'full', result_time: '2:25:33', goods_no: '4456789', source_url: '' },
];

// ============================================================
// Sheet 5: Races — 대회 코스 정보 (30개)
// SPEC.md §7.5 기준. 세계 주요 7개 + 국내 23개
// ============================================================

const SAMPLE_RACES = [
  // ── 세계 주요 마라톤 (7개) ──────────────────────────────────
  { race_id: 'tokyo_full',   race_name: '도쿄 마라톤',   country: 'JP', city: '도쿄',   course_type: 'full', typical_month: 3,  avg_temp_celsius: 7,  surface_type: 'asphalt', elevation_gain_m: 85,  difficulty: 2, course_summary: '도심 평탄 코스, 저온, 세계기록급 속도 코스',             shoe_priority_hint: '경량, 반발력',      is_world_major: true,  is_active: true },
  { race_id: 'boston_full',  race_name: '보스턴 마라톤', country: 'US', city: '보스턴', course_type: 'full', typical_month: 4,  avg_temp_celsius: 10, surface_type: 'asphalt', elevation_gain_m: 165, difficulty: 4, course_summary: '전반 내리막 → 후반 Heartbreak Hill, 고도차 주의',     shoe_priority_hint: '안정성, 쿠션, 경량', is_world_major: true,  is_active: true },
  { race_id: 'paris_full',   race_name: '파리 마라톤',   country: 'FR', city: '파리',   course_type: 'full', typical_month: 4,  avg_temp_celsius: 13, surface_type: 'asphalt', elevation_gain_m: 68,  difficulty: 2, course_summary: '센강변 평탄, 선선한 날씨, 관광지 통과',               shoe_priority_hint: '경량, 쿠션',        is_world_major: true,  is_active: true },
  { race_id: 'berlin_full',  race_name: '베를린 마라톤', country: 'DE', city: '베를린', course_type: 'full', typical_month: 9,  avg_temp_celsius: 14, surface_type: 'asphalt', elevation_gain_m: 45,  difficulty: 1, course_summary: '세계 최고 속도 코스, 완전 평탄, 세계기록 최다 배출', shoe_priority_hint: '경량, 반발력',      is_world_major: true,  is_active: true },
  { race_id: 'chicago_full', race_name: '시카고 마라톤', country: 'US', city: '시카고', course_type: 'full', typical_month: 10, avg_temp_celsius: 12, surface_type: 'asphalt', elevation_gain_m: 32,  difficulty: 1, course_summary: '도심 루프형 평탄, 강한 바람 변수',                   shoe_priority_hint: '경량, 안정성',      is_world_major: true,  is_active: true },
  { race_id: 'newyork_full', race_name: '뉴욕 마라톤',   country: 'US', city: '뉴욕',   course_type: 'full', typical_month: 11, avg_temp_celsius: 9,  surface_type: 'asphalt', elevation_gain_m: 283, difficulty: 3, course_summary: '다리 5개 통과, 고저차 있음, 고도 누적 높음',         shoe_priority_hint: '안정성, 쿠션, 경량', is_world_major: true,  is_active: true },
  { race_id: 'sydney_full',  race_name: '시드니 마라톤', country: 'AU', city: '시드니', course_type: 'full', typical_month: 9,  avg_temp_celsius: 16, surface_type: 'mixed',   elevation_gain_m: 132, difficulty: 2, course_summary: '오페라하우스 피니시, 지속적인 오르막과 내리막',       shoe_priority_hint: '안정성, 쿠션',      is_world_major: false, is_active: true },
  // ── 국내 마라톤 (23개) ─────────────────────────────────────
  { race_id: 'seoul_full',      race_name: '대전 서울 마라톤',        country: 'KR', city: '서울',      course_type: 'full', typical_month: 3,  avg_temp_celsius: 8,  surface_type: 'asphalt', elevation_gain_m: 42,  difficulty: 1, course_summary: '광화문~잠수, 도심 평탄, 국내 최고 권위 및 기록 우수',   shoe_priority_hint: '경량, 반발력',      is_world_major: false, is_active: true },
  { race_id: 'jtbc_half',       race_name: 'JTBC 서울 마라톤',       country: 'KR', city: '서울',      course_type: 'half', typical_month: 11, avg_temp_celsius: 12, surface_type: 'asphalt', elevation_gain_m: 85,  difficulty: 2, course_summary: '상암~잠수, 전반 평탄 하반 완만 오르막, 한강변 포함', shoe_priority_hint: '쿠션, 안정성',      is_world_major: false, is_active: true },
  { race_id: 'chuncheon_full',  race_name: '춘천 마라톤',             country: 'KR', city: '강원 춘천', course_type: 'full', typical_month: 10, avg_temp_celsius: 13, surface_type: 'mixed',   elevation_gain_m: 156, difficulty: 3, course_summary: '의암호 순환, 가을 선선한 기온, 아름다운 단풍',       shoe_priority_hint: '쿠션, 안정성',      is_world_major: false, is_active: true },
  { race_id: 'gyeongju_full',   race_name: '경주 마라톤',             country: 'KR', city: '경북 경주', course_type: 'full', typical_month: 10, avg_temp_celsius: 15, surface_type: 'asphalt', elevation_gain_m: 105, difficulty: 2, course_summary: '역사 유적지 인근, 완만한 기복, 일부 구간 비포장',   shoe_priority_hint: '쿠션, 안정성',      is_world_major: false, is_active: true },
  { race_id: 'daegu_full',      race_name: '대구 마라톤',             country: 'KR', city: '대구',      course_type: 'full', typical_month: 4,  avg_temp_celsius: 16, surface_type: 'asphalt', elevation_gain_m: 78,  difficulty: 2, course_summary: '도심 루프형 코스, 봄 기온, 기록 단축에 용이',       shoe_priority_hint: '경량, 안정성',      is_world_major: false, is_active: true },
  { race_id: 'gongju_full',     race_name: '공주 백제 마라톤',        country: 'KR', city: '충남 공주', course_type: 'full', typical_month: 9,  avg_temp_celsius: 22, surface_type: 'asphalt', elevation_gain_m: 89,  difficulty: 2, course_summary: '금강변 국내 주로, 이른 가을 다소 더운 기온',       shoe_priority_hint: '쿠션, 통기성',      is_world_major: false, is_active: true },
  { race_id: 'gunsan_full',     race_name: '군산 새만금 국제 마라톤', country: 'KR', city: '전북 군산', course_type: 'full', typical_month: 4,  avg_temp_celsius: 12, surface_type: 'asphalt', elevation_gain_m: 28,  difficulty: 1, course_summary: '새만금 방조제 직선 코스, 강한 바닷바람 주의',       shoe_priority_hint: '경량, 안정성',      is_world_major: false, is_active: true },
  { race_id: 'incheon_full',    race_name: '인천 송도 국제 마라톤',   country: 'KR', city: '인천',      course_type: 'full', typical_month: 10, avg_temp_celsius: 14, surface_type: 'asphalt', elevation_gain_m: 52,  difficulty: 1, course_summary: '송도 도심 및 해안도로, 직선로 위주의 단조로운 코스', shoe_priority_hint: '경량, 쿠션',        is_world_major: false, is_active: true },
  { race_id: 'busan_full',      race_name: '부산 바다 마라톤',        country: 'KR', city: '부산',      course_type: 'full', typical_month: 10, avg_temp_celsius: 17, surface_type: 'asphalt', elevation_gain_m: 168, difficulty: 3, course_summary: '광안대교 등 해안 교량 위주, 고저차와 강한 바닷바람', shoe_priority_hint: '안정성, 쿠션',      is_world_major: false, is_active: true },
  { race_id: 'jeju_full',       race_name: '제주 감귤 국제 마라톤',   country: 'KR', city: '제주',      course_type: 'full', typical_month: 11, avg_temp_celsius: 14, surface_type: 'mixed',   elevation_gain_m: 178, difficulty: 3, course_summary: '해안 및 중산간 도로, 기복이 있으며 기온 변화 있음', shoe_priority_hint: '안정성, 쿠션',      is_world_major: false, is_active: true },
  { race_id: 'cheorwon_full',   race_name: '철원 DMZ 한탄강 마라톤', country: 'KR', city: '강원 철원', course_type: 'full', typical_month: 9,  avg_temp_celsius: 18, surface_type: 'mixed',   elevation_gain_m: 225, difficulty: 4, course_summary: '민통선 내부 통과, 한탄강 협곡 지역, 고저차 있음', shoe_priority_hint: '안정성, 쿠션',      is_world_major: false, is_active: true },
  { race_id: 'miryang_full',    race_name: '밀양 아리랑 마라톤',      country: 'KR', city: '경남 밀양', course_type: 'full', typical_month: 2,  avg_temp_celsius: 5,  surface_type: 'asphalt', elevation_gain_m: 62,  difficulty: 2, course_summary: '겨울 비수기 대회, 이른 봄 완연한 날씨, 국도 평탄', shoe_priority_hint: '경량, 쿠션',        is_world_major: false, is_active: true },
  { race_id: 'hapcheon_full',   race_name: '합천 벚꽃 마라톤',        country: 'KR', city: '경남 합천', course_type: 'full', typical_month: 4,  avg_temp_celsius: 13, surface_type: 'mixed',   elevation_gain_m: 96,  difficulty: 2, course_summary: '합강변 벚꽃길 주로, 봄날씨에 미세한 오르막 지속', shoe_priority_hint: '쿠션, 안정성',      is_world_major: false, is_active: true },
  { race_id: 'jinju_full',      race_name: '진주 남강 마라톤',        country: 'KR', city: '경남 진주', course_type: 'full', typical_month: 3,  avg_temp_celsius: 9,  surface_type: 'asphalt', elevation_gain_m: 71,  difficulty: 1, course_summary: '남강변 위주, 기복 적어 기록 달성에 유리',           shoe_priority_hint: '경량, 쿠션',        is_world_major: false, is_active: true },
  { race_id: 'goseong_full',    race_name: '고성 공룡 마라톤',        country: 'KR', city: '경남 고성', course_type: 'full', typical_month: 4,  avg_temp_celsius: 13, surface_type: 'asphalt', elevation_gain_m: 118, difficulty: 3, course_summary: '해안도로 중심, 굴곡진 해안의 고저차와 바닷바람',   shoe_priority_hint: '안정성, 쿠션',      is_world_major: false, is_active: true },
  { race_id: 'cheongju_full',   race_name: '청주 대청호 마라톤',      country: 'KR', city: '충북 청주', course_type: 'full', typical_month: 9,  avg_temp_celsius: 22, surface_type: 'mixed',   elevation_gain_m: 248, difficulty: 5, course_summary: '대청호반, 지속적인 급경사와 내리막 반복, 최고 난이도', shoe_priority_hint: '안정성, 쿠션',    is_world_major: false, is_active: true },
  { race_id: 'pohang_full',     race_name: '포항 해변 마라톤',        country: 'KR', city: '경북 포항', course_type: 'full', typical_month: 5,  avg_temp_celsius: 17, surface_type: 'asphalt', elevation_gain_m: 78,  difficulty: 2, course_summary: '동해안 해변도로, 5월 더운 기온과 바닷바람 교차',   shoe_priority_hint: '통기성, 경량',      is_world_major: false, is_active: true },
  { race_id: 'hangang_half',    race_name: '서울 한강 마라톤',        country: 'KR', city: '서울',      course_type: 'half', typical_month: 4,  avg_temp_celsius: 14, surface_type: 'asphalt', elevation_gain_m: 38,  difficulty: 1, course_summary: '한강 자전거도로, 평탄 코스, 기록 달성에 유리',     shoe_priority_hint: '경량, 반발력',      is_world_major: false, is_active: true },
  { race_id: 'boseong_half',    race_name: '보성 비차 마라톤',        country: 'KR', city: '전남 보성', course_type: 'half', typical_month: 5,  avg_temp_celsius: 18, surface_type: 'asphalt', elevation_gain_m: 93,  difficulty: 2, course_summary: '메밀꽃밭 인근 주로, 5월 더운 날씨',               shoe_priority_hint: '통기성, 쿠션',      is_world_major: false, is_active: true },
  { race_id: 'anseong_half',    race_name: '안성 팜성 마라톤',        country: 'KR', city: '경기 안성', course_type: 'half', typical_month: 4,  avg_temp_celsius: 13, surface_type: 'asphalt', elevation_gain_m: 82,  difficulty: 2, course_summary: '한천 인근 국도, 완만한 코스',                     shoe_priority_hint: '경량, 쿠션',        is_world_major: false, is_active: true },
  { race_id: 'hantangang_half', race_name: '한탄강 마라톤',           country: 'KR', city: '경기',      course_type: 'half', typical_month: 10, avg_temp_celsius: 15, surface_type: 'mixed',   elevation_gain_m: 198, difficulty: 4, course_summary: '한탄강 인근 산간 지역, 오르막과 내리막 반복',     shoe_priority_hint: '안정성, 쿠션',      is_world_major: false, is_active: true },
  { race_id: 'jeonju_half',     race_name: '전주 마라톤',             country: 'KR', city: '전북 전주', course_type: 'half', typical_month: 10, avg_temp_celsius: 16, surface_type: 'asphalt', elevation_gain_m: 55,  difficulty: 2, course_summary: '전주천변 및 구도심, 평탄 코스에 가을 기온',       shoe_priority_hint: '경량, 쿠션',        is_world_major: false, is_active: true },
  { race_id: 'daejeon_half',    race_name: '대전 마라톤',             country: 'KR', city: '대전',      course_type: 'half', typical_month: 4,  avg_temp_celsius: 14, surface_type: 'asphalt', elevation_gain_m: 48,  difficulty: 1, course_summary: '도심 순환로, 평탄한 코스',                       shoe_priority_hint: '경량, 반발력',      is_world_major: false, is_active: true },
];

// ============================================================
// Sheet 6: SizeGuide — 브랜드별 사이즈 가이드 (10개)
// SPEC.md §7.6 기준
// ============================================================

const SAMPLE_SIZE_GUIDE = [
  { size_guide_id: 'sg_001', brand: '아식스',   model_name: '*',                          sizing_tendency: 'true',  width_tendency: 'narrow', size_adjust_mm: 0,  fit_note: '한국인 발형 기준에 가장 가까움. 기준값으로 사용' },
  { size_guide_id: 'sg_002', brand: '뉴발란스', model_name: '*',                          sizing_tendency: 'large', width_tendency: 'wide',   size_adjust_mm: 5,  fit_note: '와이드 최적화 모델 많음. 발볼 넓은 분께 유리' },
  { size_guide_id: 'sg_003', brand: '나이키',   model_name: '*',                          sizing_tendency: 'small', width_tendency: 'narrow', size_adjust_mm: -5, fit_note: '0.5사이즈 업 권장. 발볼 좁은 편' },
  { size_guide_id: 'sg_004', brand: '호카',     model_name: '*',                          sizing_tendency: 'large', width_tendency: 'wide',   size_adjust_mm: 5,  fit_note: '내부 공간 여유롭게 설계됨' },
  { size_guide_id: 'sg_005', brand: '사코니',   model_name: '*',                          sizing_tendency: 'true',  width_tendency: 'normal', size_adjust_mm: 0,  fit_note: '모델별 편차 있음. 구매 전 모델별 리뷰 확인 권장' },
  { size_guide_id: 'sg_006', brand: '미즈노',   model_name: '*',                          sizing_tendency: 'true',  width_tendency: 'normal', size_adjust_mm: 0,  fit_note: '한국인 발형에 잘 맞는 편' },
  { size_guide_id: 'sg_007', brand: '나이키',   model_name: '페가수스 41',                sizing_tendency: 'small', width_tendency: 'narrow', size_adjust_mm: -5, fit_note: '일반 나이키 경향과 동일. 하프 사이즈 업 권장' },
  { size_guide_id: 'sg_008', brand: '호카',     model_name: '클리프턴 9',                 sizing_tendency: 'large', width_tendency: 'wide',   size_adjust_mm: 5,  fit_note: '발볼 넓은 분께 동일 사이즈 또는 -5mm 고려' },
  { size_guide_id: 'sg_009', brand: '아식스',   model_name: '젤 카야노 31',               sizing_tendency: 'true',  width_tendency: 'normal', size_adjust_mm: 0,  fit_note: '표준 아식스 핏. 평발·넓은 발볼에도 적합' },
  { size_guide_id: 'sg_010', brand: '뉴발란스', model_name: '페이퍼 슈퍼컴프 엘리트 v4', sizing_tendency: 'large', width_tendency: 'wide',   size_adjust_mm: 5,  fit_note: '내부 공간 여유로움. 5mm 작은 사이즈가 더 잘 맞을 수 있음' },
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

/** 0-based 컬럼 인덱스 → 스프레드시트 열 문자 (0→A, 25→Z, 26→AA ...) */
function colIndexToLetter(idx) {
  let letter = '';
  let n = idx + 1;
  while (n > 0) {
    const mod = (n - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
}

/**
 * 헤더 행의 중복 셀을 빈 문자열로 치환하여 loadHeaderRow() 오류를 방지한다.
 * google-spreadsheet는 빈 헤더 셀을 무시하므로 기존 데이터 컬럼 매핑에 영향 없음.
 */
async function repairDuplicateHeaders(sheet) {
  const readCols = sheet.columnCount;
  await sheet.loadCells(`A1:${colIndexToLetter(readCols - 1)}1`);

  const seen = new Set();
  let fixed = false;

  for (let i = 0; i < readCols; i++) {
    const cell = sheet.getCell(0, i);
    const val = cell.value;
    if (!val) break;
    const key = String(val);
    if (seen.has(key)) {
      cell.value = '';
      fixed = true;
      console.log(`  🔧 "${sheet.title}" 중복 헤더 "${key}" 제거 (열 ${i + 1})`);
    } else {
      seen.add(key);
    }
  }

  if (fixed) await sheet.saveUpdatedCells();
}

/**
 * 시트에 데이터가 없을 때만 삽입 (멱등성 보장).
 * --force 플래그 시 기존 데이터 유무와 무관하게 addRows 실행.
 * 기존 데이터는 절대 삭제하지 않는다.
 */
async function seedSheet(doc, sheetTitle, headers, data, isForce) {
  const sheet = doc.sheetsByTitle[sheetTitle];
  if (!sheet) {
    console.log(`  ⏭️  "${sheetTitle}" 시트 없음 → npm run db:ddl 을 먼저 실행하세요.`);
    return;
  }
  if (data.length === 0) {
    console.log(`  ℹ️  "${sheetTitle}" 샘플 데이터 없음. 건너뜁니다.`);
    return;
  }

  // 중복 헤더가 있으면 제거 후 진행
  await repairDuplicateHeaders(sheet);

  let existingRowCount = 0;
  try {
    const existingRows = await sheet.getRows();
    existingRowCount = existingRows.length;
  } catch (err) {
    console.log(`  ⏭️  "${sheetTitle}" 헤더 파싱 불가: ${err.message}. 건너뜁니다.`);
    return;
  }

  if (existingRowCount > 0 && !isForce) {
    console.log(`  ⏭️  "${sheetTitle}" 이미 ${existingRowCount}개 행 있음. 건너뜁니다. (강제 추가: --force)`);
    return;
  }

  const rows = data.map((item) => headers.map((col) => item[col] ?? ''));
  await sheet.addRows(rows);
  console.log(`  ✅ "${sheetTitle}" ${data.length}개 행 삽입 완료`);
}

// ============================================================
// 메인
// ============================================================

async function main() {
  const isForce = process.argv.includes('--force');
  const isProdFlag = process.argv.includes('--prod');
  const PROD_ID = '1xtcYmcHy6HnyBdRtKtZ0Redunu5DrHPJ-SwNrrVUZ-4';
  const isProdEnv = process.env.SPREADSHEET_ID === PROD_ID;

  console.log(`\n🌱 RunFit Google Sheets DML 시드 시작${isForce ? ' (--force 모드)' : ''}\n`);
  validateEnv();

  // 상용 DB 실행 시 --prod 플래그 필수 (실수 방지)
  if (isProdEnv && !isProdFlag) {
    console.error('❌ 상용 DB에 DML 시드를 실행하려면 --prod 플래그가 필요합니다.');
    console.error('   예: npm run db:seed -- --prod');
    process.exit(1);
  }

  const envLabel = isProdEnv ? '🔴 상용(PRODUCTION)' : '🟢 개발(DEVELOPMENT)';
  console.log(`⚠️  대상 DB: ${envLabel}`);
  console.log(`   SPREADSHEET_ID: ${process.env.SPREADSHEET_ID}\n`);

  const auth = new JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const doc = new GoogleSpreadsheet(process.env.SPREADSHEET_ID, auth);
  await doc.loadInfo();
  console.log(`📄 스프레드시트: "${doc.title}"\n`);

  await seedSheet(doc, 'Shoes',       SCHEMA.Shoes,       SAMPLE_SHOES,        isForce);
  await seedSheet(doc, 'Celebs',      SCHEMA.Celebs,      SAMPLE_CELEBS,       isForce);
  await seedSheet(doc, 'RaceWinners', SCHEMA.RaceWinners, SAMPLE_RACE_WINNERS, isForce);
  await seedSheet(doc, 'Races',       SCHEMA.Races,       SAMPLE_RACES,        isForce);
  await seedSheet(doc, 'SizeGuide',   SCHEMA.SizeGuide,   SAMPLE_SIZE_GUIDE,   isForce);

  console.log('\n✅ DML 완료!');
  console.log(`👉 확인: https://docs.google.com/spreadsheets/d/${process.env.SPREADSHEET_ID}\n`);
}

main().catch((err) => {
  console.error('\n❌ DML 실패:', err.message);
  process.exit(1);
});
