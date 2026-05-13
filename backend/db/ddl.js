/**
 * RunFit Google Sheets DDL 스크립트
 * 실행 (backend/ 폴더에서):
 *   npm run db:ddl             ← 개발 DB
 *   npm run db:ddl -- --prod   ← 상용 DB (--prod 플래그 필수)
 *
 * 동작 원칙:
 *   - 시트가 없으면 신규 생성 + 헤더 설정
 *   - 시트가 이미 있으면 누락 컬럼만 우측에 추가 (기존 데이터·컬럼 절대 수정 안 함)
 *
 * ⚠️  ERD 변경 시 필수:
 *   SPEC.md §7 → 이 파일 하단 SCHEMA 객체 → npm run db:ddl 순으로 동기화
 */

'use strict';
require('dotenv').config();
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

// ============================================================
// SCHEMA 정의 — SPEC.md §7 ERD와 항상 동기화 유지
// 컬럼 추가·변경 시 이 객체만 수정 후 npm run db:ddl 재실행
// ============================================================

const SCHEMA = {

  // §7.1 Sheet 1: Shoes (러닝화 메타데이터)
  Shoes: [
    'goods_no', 'goods_name', 'brand', 'price', 'url', 'thumbnail',
    'width', 'cushion', 'weight', 'distance',
    'breathability', 'fit', 'summary', 'review_count_used', 'confidence',
    // v2.0 추가 컬럼
    'main_color', 'accent_color',
    'lifespan_km_min', 'lifespan_km_max', 'has_carbon_plate',
  ],

  // §7.2 Sheet 2: Logs (사용자 이용 이력) — 앱이 자동 생성, 시드 대상 아님
  Logs: [
    'log_id', 'timestamp',
    'running_distance', 'frequency', 'foot_width', 'preferred_cushion',
    'priorities', 'budget', 'free_text',
    'recommended_goods_no',
  ],

  // §7.3 Sheet 3: Celebs (셀럽 착용 신발) — v2.0
  Celebs: [
    'celeb_id', 'celeb_name', 'celeb_type', 'celeb_image_url', 'goods_no', 'source_url',
  ],

  // §7.4 Sheet 4: RaceWinners (대회 우승자 착용 신발) — v2.0
  RaceWinners: [
    'winner_id', 'race_name', 'race_year', 'winner_name',
    'winner_nationality', 'course_type', 'result_time', 'goods_no', 'source_url',
  ],

  // §7.5 Sheet 5: Races (대회 코스 정보) — v2.0
  Races: [
    'race_id', 'race_name', 'country', 'city', 'course_type',
    'typical_month', 'avg_temp_celsius', 'surface_type', 'elevation_gain_m',
    'difficulty', 'course_summary', 'shoe_priority_hint',
    'is_world_major', 'is_active',
  ],

  // §7.6 Sheet 6: SizeGuide (브랜드별 사이즈 가이드) — v2.0
  SizeGuide: [
    'size_guide_id', 'brand', 'model_name',
    'sizing_tendency', 'width_tendency', 'size_adjust_mm', 'fit_note',
  ],
};

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
 * 시트가 없으면 생성, 있으면 누락 컬럼만 우측 추가.
 * 기존 데이터·컬럼 순서는 절대 변경하지 않는다.
 *
 * loadHeaderRow() 대신 loadCells()로 raw 접근 —
 * 기존 시트에 중복 헤더가 있어도 오류 없이 처리함.
 */
async function ensureSheet(doc, title, expectedHeaders) {
  let sheet = doc.sheetsByTitle[title];

  if (!sheet) {
    sheet = await doc.addSheet({ title });
    await sheet.setHeaderRow(expectedHeaders);
    console.log(`  ✅ "${title}" 시트 신규 생성 + 헤더 ${expectedHeaders.length}개 설정`);
    return;
  }

  // 기존 시트: raw cell 접근으로 헤더 행 읽기 (중복 헤더 오류 우회)
  const readCols = sheet.columnCount;
  await sheet.loadCells(`A1:${colIndexToLetter(readCols - 1)}1`);

  const existing = [];
  for (let i = 0; i < readCols; i++) {
    const val = sheet.getCell(0, i).value;
    if (!val) break;
    existing.push(String(val));
  }

  // 중복 제거 기준으로 누락 컬럼 계산
  const uniqueExisting = [...new Set(existing)];
  const missing = expectedHeaders.filter((h) => !uniqueExisting.includes(h));

  if (missing.length === 0) {
    console.log(`  ✓  "${title}" 컬럼 최신 상태 (${uniqueExisting.length}개) — 변경 없음`);
    return;
  }

  // 누락 컬럼 추가: 시트 열 수 부족 시 resize 후 재로드
  const startCol = existing.length;
  const neededCols = startCol + missing.length;

  if (neededCols > sheet.columnCount) {
    await sheet.resize({ columnCount: neededCols });
    await sheet.loadCells(`A1:${colIndexToLetter(neededCols - 1)}1`);
  }

  for (let i = 0; i < missing.length; i++) {
    sheet.getCell(0, startCol + i).value = missing[i];
  }
  await sheet.saveUpdatedCells();
  console.log(`  ✅ "${title}" 컬럼 ${missing.length}개 추가: ${missing.join(', ')}`);
}

// ============================================================
// 메인
// ============================================================

async function main() {
  const isProdFlag = process.argv.includes('--prod');
  const PROD_ID = '1xtcYmcHy6HnyBdRtKtZ0Redunu5DrHPJ-SwNrrVUZ-4';
  const isProdEnv = process.env.SPREADSHEET_ID === PROD_ID;

  console.log('\n🏗️  RunFit Google Sheets DDL 시작\n');
  validateEnv();

  // 상용 DB 실행 시 --prod 플래그 필수 (실수 방지)
  if (isProdEnv && !isProdFlag) {
    console.error('❌ 상용 DB에 DDL을 실행하려면 --prod 플래그가 필요합니다.');
    console.error('   예: npm run db:ddl -- --prod');
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

  const sheetNames = Object.keys(SCHEMA);
  for (let i = 0; i < sheetNames.length; i++) {
    const name = sheetNames[i];
    console.log(`[${i + 1}/${sheetNames.length}] ${name} 시트 확인 중...`);
    await ensureSheet(doc, name, SCHEMA[name]);
  }

  console.log('\n✅ DDL 완료!');
  console.log(`👉 확인: https://docs.google.com/spreadsheets/d/${process.env.SPREADSHEET_ID}\n`);
}

main().catch((err) => {
  console.error('\n❌ DDL 실패:', err.message);
  process.exit(1);
});
