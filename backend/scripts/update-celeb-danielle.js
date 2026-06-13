/**
 * 개발 DB Celebs 시트의 celeb_010 (강다니엘 → 뉴진스 다니엘) 데이터 업데이트
 *
 * 변경 내용:
 *   celeb_name:      다니엘                 → 뉴진스 다니엘
 *   celeb_image_url: 강다니엘 이미지         → 뉴진스 다니엘 Wikimedia Commons 이미지
 *                    (Naver sstatic URL 필요 시: search.naver.com에서 "다니엘 마쉬" 검색 →
 *                     인물 패널 이미지 우클릭 → 이미지 주소 복사 후 아래 URL 대체)
 *   source_url:      강다니엘 인스타         → https://www.instagram.com/dazzibelle/
 *   instagram_url:   강다니엘 인스타         → https://www.instagram.com/dazzibelle/
 *   youtube_url:     @KANGDANIEL            → https://www.youtube.com/@Dazzibelle
 *
 * 실행: cd backend && node scripts/update-celeb-danielle.js
 * 대상: backend/.env 의 SPREADSHEET_ID (개발 DB 전용)
 */

require('dotenv').config();
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const TARGET_CELEB_ID = 'celeb_010';

const NEW_DATA = {
  celeb_name: '뉴진스 다니엘',
  // Naver 검색 결과에서 확인된 공식 프로필 이미지 (Wikipedia Commons, Marie Claire Korea 2024)
  // Naver sstatic URL 확보 시 아래 URL 대체 가능
  celeb_image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Danielle_Marsh_for_Marie_Claire_Korea_April_2024_F.png/250px-Danielle_Marsh_for_Marie_Claire_Korea_April_2024_F.png',
  source_url:     'https://www.instagram.com/dazzibelle/',
  instagram_url:  'https://www.instagram.com/dazzibelle/',
  youtube_url:    'https://www.youtube.com/@Dazzibelle',
};

async function main() {
  const spreadsheetId = process.env.SPREADSHEET_ID;
  if (!spreadsheetId) {
    console.error('❌ SPREADSHEET_ID 환경변수가 없습니다. backend/.env 파일을 확인하세요.');
    process.exit(1);
  }

  console.log(`\n📋 대상 스프레드시트: ${spreadsheetId}`);

  const rawKey = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/^["']|["']$/g, '');
  const privateKey = rawKey.replace(/\\n/g, '\n');
  const auth = new JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const doc = new GoogleSpreadsheet(spreadsheetId, auth);
  await doc.loadInfo();
  console.log(`✅ 시트 접속: ${doc.title}\n`);

  const sheet = doc.sheetsByTitle['Celebs'];
  if (!sheet) {
    console.error('❌ Celebs 시트를 찾을 수 없습니다.');
    process.exit(1);
  }

  const rows = await sheet.getRows();
  console.log(`총 ${rows.length}개 행 로드\n`);

  const targetRow = rows.find((r) => (r.get('celeb_id') || '').trim() === TARGET_CELEB_ID);
  if (!targetRow) {
    console.error(`❌ celeb_id = "${TARGET_CELEB_ID}" 행을 찾을 수 없습니다.`);
    process.exit(1);
  }

  console.log('── 변경 전 ──────────────────────');
  for (const key of Object.keys(NEW_DATA)) {
    console.log(`  ${key}: ${targetRow.get(key)}`);
  }

  for (const [key, val] of Object.entries(NEW_DATA)) {
    targetRow.set(key, val);
  }
  await targetRow.save();

  console.log('\n── 변경 후 ──────────────────────');
  for (const [key, val] of Object.entries(NEW_DATA)) {
    console.log(`  ${key}: ${val}`);
  }

  console.log(`\n✅ ${TARGET_CELEB_ID} 업데이트 완료`);
}

main().catch((err) => {
  console.error('❌ 오류:', err.message);
  process.exit(1);
});
