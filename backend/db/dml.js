/**
 * RunFit Google Sheets DML 시드 스크립트
 * 실행: npm run db:seed           ← Shoes에 데이터가 없을 때만 삽입
 *        npm run db:seed -- --force ← 기존 데이터와 무관하게 샘플 데이터 추가
 *
 * - 구글시트가 마스터 데이터 → 기본값은 데이터가 있으면 건너뜀 (멱등성 보장)
 * - --force: 기존 데이터 삭제 없이 샘플 행만 추가 (테스트 목적)
 */

require('dotenv').config();
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

// ============================================================
// 샘플 데이터 (product_profiles 기반 초기 러닝화 10종)
// ============================================================

const SHOES_HEADERS = [
  'goods_no', 'goods_name', 'brand', 'price', 'url', 'thumbnail',
  'width', 'cushion', 'weight', 'distance',
  'breathability', 'fit', 'summary', 'review_count_used', 'confidence',
];

const SAMPLE_SHOES = [
  { goods_no: '5005842', goods_name: '맥시마이저 26 (오프 화이트)', brand: '미즈노',   price: 59000,  url: 'https://www.musinsa.com/products/5005842', thumbnail: '', width: '보통', cushion: 4, weight: 2, distance: '중거리', breathability: 4, fit: 5, summary: '가성비 좋은 데일리 러닝화, 쿠션감 우수',       review_count_used: 20, confidence: 'high'   },
  { goods_no: '3990544', goods_name: 'W480SK5',                        brand: '뉴발란스', price: 75000,  url: 'https://www.musinsa.com/products/3990544', thumbnail: '', width: '보통', cushion: 3, weight: 2, distance: '단거리', breathability: 4, fit: 4, summary: '가벼운 입문용 러닝화',                       review_count_used: 20, confidence: 'high'   },
  { goods_no: '4521387', goods_name: '페가수스 41',                    brand: '나이키',   price: 159000, url: 'https://www.musinsa.com/products/4521387', thumbnail: '', width: '보통', cushion: 4, weight: 3, distance: '전거리', breathability: 4, fit: 4, summary: '범용 데일리 트레이너, 안정적 쿠션',         review_count_used: 20, confidence: 'high'   },
  { goods_no: '5123456', goods_name: '마파테 스피드 2',                brand: '호카',     price: 239000, url: 'https://www.musinsa.com/products/5123456', thumbnail: '', width: '넓음', cushion: 5, weight: 3, distance: '장거리', breathability: 3, fit: 5, summary: '구름 같은 쿠션, 마라톤·장거리 최적',       review_count_used: 18, confidence: 'high'   },
  { goods_no: '4789123', goods_name: '엔돌핀 스피드 4',                brand: '사코니',   price: 199000, url: 'https://www.musinsa.com/products/4789123', thumbnail: '', width: '보통', cushion: 3, weight: 1, distance: '중거리', breathability: 5, fit: 4, summary: '초경량 반발력 카본 플레이트',               review_count_used: 15, confidence: 'high'   },
  { goods_no: '4456789', goods_name: '노바블라스트 4',                 brand: '아식스',   price: 149000, url: 'https://www.musinsa.com/products/4456789', thumbnail: '', width: '넓음', cushion: 5, weight: 3, distance: '장거리', breathability: 3, fit: 4, summary: '푹신한 쿠션, 장거리 부상 방지',             review_count_used: 20, confidence: 'high'   },
  { goods_no: '4112233', goods_name: '젤 카야노 31',                   brand: '아식스',   price: 189000, url: 'https://www.musinsa.com/products/4112233', thumbnail: '', width: '보통', cushion: 4, weight: 4, distance: '장거리', breathability: 3, fit: 5, summary: '안정성 최고, 평발 러너에게 추천',           review_count_used: 20, confidence: 'high'   },
  { goods_no: '5234567', goods_name: '클리프턴 9',                     brand: '호카',     price: 169000, url: 'https://www.musinsa.com/products/5234567', thumbnail: '', width: '넓음', cushion: 5, weight: 2, distance: '전거리', breathability: 4, fit: 5, summary: '가벼우면서 푹신, 발볼 넓은 분께',           review_count_used: 20, confidence: 'high'   },
  { goods_no: '4998877', goods_name: '라이드 17',                      brand: '사코니',   price: 139000, url: 'https://www.musinsa.com/products/4998877', thumbnail: '', width: '좁음', cushion: 3, weight: 2, distance: '중거리', breathability: 4, fit: 3, summary: '발볼 좁은 분께 적합, 균형형',               review_count_used: 12, confidence: 'high'   },
  { goods_no: '4665544', goods_name: '글라이드라이드 3',               brand: '아식스',   price: 129000, url: 'https://www.musinsa.com/products/4665544', thumbnail: '', width: '보통', cushion: 4, weight: 4, distance: '장거리', breathability: 3, fit: 4, summary: '에너지 세이빙 장거리 트레이너',             review_count_used: 8,  confidence: 'medium' },
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

// ============================================================
// 메인
// ============================================================

async function main() {
  const isForce = process.argv.includes('--force');
  console.log(`\n🌱 RunFit Google Sheets DML 시드 시작 ${isForce ? '(--force 모드)' : ''}\n`);

  validateEnv();

  const PROD_ID = '1xtcYmcHy6HnyBdRtKtZ0Redunu5DrHPJ-SwNrrVUZ-4';
  const isProd = process.env.SPREADSHEET_ID === PROD_ID;
  console.log(`⚠️  대상 DB: ${isProd ? '🔴 상용(PRODUCTION)' : '🟢 개발(DEVELOPMENT)'}`);
  console.log(`   SPREADSHEET_ID: ${process.env.SPREADSHEET_ID}\n`);
  if (isProd) {
    console.error('❌ 상용 DB에 DML 시드를 실행할 수 없습니다. 중단합니다.');
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

  const shoesSheet = doc.sheetsByTitle['Shoes'];
  if (!shoesSheet) {
    console.error('❌ Shoes 시트가 없습니다. 먼저 npm run db:ddl 을 실행하세요.');
    process.exit(1);
  }

  // 헤더 중복 등 시트 구조 이상 시 getRows()가 throw할 수 있으므로 방어 처리
  let existingRowCount = 0;
  try {
    const existingRows = await shoesSheet.getRows();
    existingRowCount = existingRows.length;
  } catch {
    // 헤더 파싱 실패 = 시트가 이미 팀원에 의해 커스텀 설정됨 → 건드리지 않음
    console.log('  ⏭️  Shoes 시트 헤더 파싱 불가 (커스텀 구조). 건너뜁니다.\n');
    console.log('✅ DML 완료 (삽입 없음)');
    return;
  }

  if (existingRowCount > 0 && !isForce) {
    console.log(`  ⏭️  Shoes 시트에 이미 ${existingRowCount}개 행이 있습니다. 건너뜁니다.`);
    console.log('     강제 삽입이 필요하면: npm run db:seed -- --force\n');
    console.log('✅ DML 완료 (삽입 없음)');
    return;
  }

  const rows = SAMPLE_SHOES.map((shoe) =>
    SHOES_HEADERS.map((col) => shoe[col] ?? '')
  );
  await shoesSheet.addRows(rows);
  console.log(`  ✓ 샘플 데이터 ${SAMPLE_SHOES.length}개 삽입 완료\n`);

  console.log('✅ DML 완료!');
  console.log(`👉 확인: https://docs.google.com/spreadsheets/d/${process.env.SPREADSHEET_ID}\n`);
}

main().catch((err) => {
  console.error('\n❌ DML 실패:', err.message);
  process.exit(1);
});
