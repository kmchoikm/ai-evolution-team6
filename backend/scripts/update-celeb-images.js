/**
 * 개발 DB Celebs 시트의 celeb_image_url 컬럼을
 * 네이버 sstatic 이미지 URL로 일괄 교체
 *
 * 실행: cd backend && node scripts/update-celeb-images.js
 * 대상: backend/.env 의 SPREADSHEET_ID (개발 DB 전용)
 */

require('dotenv').config();
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

// ── 교체할 URL 매핑 ──────────────────────────────────────────
const NAVER_URLS = {
  '권화운':    'http://sstatic.naver.net/people/167/20230525181604801.png',
  '기안84':    'http://sstatic.naver.net/people/portrait/202303/20230327110526765.png',
  '고한민':    'http://sstatic.naver.net/people/profileImg/278a1a02-7c46-4d63-88d0-8d3b00303c87.png',
  '샤이니 민호': 'http://sstatic.naver.net/people/profileImg/111217ef-a6f8-482c-bb8d-8b1da44e8c60.jpg',
  '션':        'http://sstatic.naver.net/people/70/201504161937426771.jpg',
  '이영표':    'http://sstatic.naver.net/people/11/201404091628559971.jpg',
  '박보검':    'http://sstatic.naver.net/people/89/202302171549367401.jpg',
  '임시완':    'http://sstatic.naver.net/people/profileImg/65ba4f7b-8671-4b72-b727-90816909b418.jpg',
  '최시원':    'http://sstatic.naver.net/people/profileImg/be610825-0f6e-4844-8783-235c3cb52b95.jpg',
  '이시영':    'http://sstatic.naver.net/people/portrait/202004/20200414114944558.jpg',
  '다니엘':    'http://sstatic.naver.net/people/profileImg/e585b4f7-7cea-4bd1-bfd9-407e034d3e7c.jpg',
  '이은지':    'http://sstatic.naver.net/people/profileImg/6f5f6850-f67c-4c78-bd93-dd135d0ede3d.jpg',
  '차은우':    'http://sstatic.naver.net/people/portrait/202301/20230127132729112.jpg',
  '혜리':      'http://sstatic.naver.net/people/profileImg/f312c1b7-068f-487f-9397-57d83c685e32.jpg',
  '황영조':    'http://sstatic.naver.net/people/85/201208161151039351.jpg',
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
  console.log(`총 ${rows.length}개 행 로드 완료\n`);

  let updated = 0;
  let skipped = 0;
  let notFound = 0;

  for (const row of rows) {
    const name = (row.get('celeb_name') || '').trim();
    const newUrl = NAVER_URLS[name];

    if (!newUrl) {
      console.log(`⚠️  매핑 없음: "${name}"`);
      notFound++;
      continue;
    }

    const current = row.get('celeb_image_url') || '';
    if (current === newUrl) {
      console.log(`⏭️  변경 불필요: ${name}`);
      skipped++;
      continue;
    }

    row.set('celeb_image_url', newUrl);
    await row.save();
    console.log(`✅ 업데이트: ${name}`);
    updated++;
  }

  console.log(`\n───────────────────────────────`);
  console.log(`업데이트: ${updated}개 | 스킵(동일): ${skipped}개 | 매핑없음: ${notFound}개`);
  console.log(`완료`);
}

main().catch((err) => {
  console.error('❌ 오류:', err.message);
  process.exit(1);
});
