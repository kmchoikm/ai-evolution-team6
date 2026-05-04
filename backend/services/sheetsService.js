/**
 * Google Sheets DB 접근 모듈
 * Shoes 시트 조회 / Logs 시트 기록
 */

require('dotenv').config();
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

function createAuth() {
  return new JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

/**
 * Shoes 시트 전체 데이터 조회
 * @returns {Promise<object[]>} 러닝화 배열
 */
async function getAllShoes() {
  const doc = new GoogleSpreadsheet(process.env.SPREADSHEET_ID, createAuth());
  await doc.loadInfo();
  const sheet = doc.sheetsByTitle['Shoes'];
  if (!sheet) throw new Error('Shoes 시트를 찾을 수 없습니다');

  const rows = await sheet.getRows();
  return rows.map((r) => ({
    goods_no: r.get('goods_no'),
    goods_name: r.get('goods_name'),
    brand: r.get('brand'),
    price: Number(r.get('price')) || 0,
    url: r.get('url'),
    thumbnail: r.get('thumbnail') || '',
    width: r.get('width'),
    cushion: Number(r.get('cushion')) || 3,
    weight: Number(r.get('weight')) || 3,
    distance: r.get('distance'),
    breathability: Number(r.get('breathability')) || 3,
    fit: Number(r.get('fit')) || 3,
    summary: r.get('summary') || '',
    review_count_used: Number(r.get('review_count_used')) || 0,
    confidence: r.get('confidence') || 'low',
  }));
}

/**
 * Logs 시트에 추천 이력 비동기 저장
 * 실패해도 메인 응답에 영향 없음
 */
async function saveLog(userProfile, recommendedGoodsNos) {
  try {
    const doc = new GoogleSpreadsheet(process.env.SPREADSHEET_ID, createAuth());
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['Logs'];
    if (!sheet) return;

    const { v4: uuidv4 } = require('uuid');
    const now = new Date();
    const timestamp = now.toISOString().replace('T', ' ').slice(0, 19);

    await sheet.addRow({
      log_id: uuidv4(),
      timestamp,
      running_distance: userProfile.running_distance || '',
      frequency: userProfile.frequency || '',
      foot_width: userProfile.foot_width || '',
      preferred_cushion: userProfile.preferred_cushion ?? '',
      priorities: (userProfile.priorities || []).join(','),
      budget: userProfile.budget || '',
      free_text: userProfile.free_text || '',
      recommended_goods_no: recommendedGoodsNos.join(','),
    });
  } catch (err) {
    // 로그 저장 실패는 무시 — 추천 결과에 영향 없음
    console.error('[Sheets] 로그 저장 실패:', err.message);
  }
}

module.exports = { getAllShoes, saveLog };
