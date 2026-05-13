/**
 * RunFit Google Sheets DDL 스크립트
 * 실행: npm run db:ddl
 *
 * - 시트(테이블)가 없을 때만 생성 + 헤더(컬럼) 설정
 * - 이미 존재하는 시트는 절대 건드리지 않음 → 기존 데이터 보존
 */

require('dotenv').config();
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

// ============================================================
// 스키마 정의 (컬럼 추가/변경 시 여기만 수정)
// ============================================================

const SHOES_HEADERS = [
  'goods_no', 'goods_name', 'brand', 'price', 'url', 'thumbnail',
  'width', 'cushion', 'weight', 'distance',
  'breathability', 'fit', 'summary', 'review_count_used', 'confidence',
];

const LOGS_HEADERS = [
  'log_id', 'timestamp',
  'running_distance', 'frequency', 'foot_width', 'preferred_cushion',
  'priorities', 'budget', 'free_text',
  'recommended_goods_no',
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

// 시트가 없을 때만 생성 — 있으면 데이터/헤더 그대로 보존
async function ensureSheet(doc, title, headers) {
  if (doc.sheetsByTitle[title]) {
    console.log(`  ✓ "${title}" 시트 이미 존재 — 건드리지 않음`);
    return;
  }
  const sheet = await doc.addSheet({ title });
  await sheet.setHeaderRow(headers);
  console.log(`  ✓ "${title}" 시트 새로 생성 + 헤더 설정 완료`);
}

// ============================================================
// 메인
// ============================================================

async function main() {
  console.log('\n🏗️  RunFit Google Sheets DDL 시작\n');

  validateEnv();

  const PROD_ID = '1xtcYmcHy6HnyBdRtKtZ0Redunu5DrHPJ-SwNrrVUZ-4';
  const isProd = process.env.SPREADSHEET_ID === PROD_ID;
  console.log(`⚠️  대상 DB: ${isProd ? '🔴 상용(PRODUCTION)' : '🟢 개발(DEVELOPMENT)'}`);
  console.log(`   SPREADSHEET_ID: ${process.env.SPREADSHEET_ID}\n`);
  if (isProd) {
    console.error('❌ 상용 DB에 DDL을 실행할 수 없습니다. 중단합니다.');
    process.exit(1);
  }

  const auth = new JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const doc = new GoogleSpreadsheet(process.env.SPREADSHEET_ID, auth);
  await doc.loadInfo();
  console.log(`📄 스프레드시트: "${doc.title}"\n`);

  console.log('[1/2] Shoes 시트 확인 중...');
  await ensureSheet(doc, 'Shoes', SHOES_HEADERS);

  console.log('[2/2] Logs 시트 확인 중...');
  await ensureSheet(doc, 'Logs', LOGS_HEADERS);

  console.log('\n✅ DDL 완료!');
  console.log(`👉 확인: https://docs.google.com/spreadsheets/d/${process.env.SPREADSHEET_ID}\n`);
}

main().catch((err) => {
  console.error('\n❌ DDL 실패:', err.message);
  process.exit(1);
});
