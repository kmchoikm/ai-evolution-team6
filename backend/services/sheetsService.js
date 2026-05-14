/**
 * Google Sheets DB 접근 모듈
 * - Shoes, Logs, Races, Celebs, RaceWinners, SizeGuide 시트 읽기/쓰기
 */

require('dotenv').config();
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

function createAuth() {
  // Railway UI에서 따옴표 포함 붙여넣기 시 자동 제거
  const rawKey = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/^["']|["']$/g, '');
  const privateKey = rawKey.replace(/\\n/g, '\n');
  return new JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

/** Google Spreadsheet 인스턴스를 loadInfo까지 완료한 상태로 반환 */
async function openDoc() {
  const doc = new GoogleSpreadsheet(process.env.SPREADSHEET_ID, createAuth());
  await doc.loadInfo();
  return doc;
}

// ============================================================
// Shoes 시트
// ============================================================

/**
 * Shoes 시트 전체 데이터 조회 (v2.0 컬럼 포함)
 * @returns {Promise<object[]>}
 */
async function getAllShoes() {
  const doc = await openDoc();
  const sheet = doc.sheetsByTitle['Shoes'];
  if (!sheet) throw new Error('Shoes 시트를 찾을 수 없습니다');

  const rows = await sheet.getRows();
  return rows.map((r) => ({
    goods_no: r.get('goods_no'),
    goods_name: r.get('goods_name'),
    brand: r.get('brand'),
    price: Number(r.get('price')) || 0,
    url: r.get('url') || '',
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
    // v2.0 컬럼
    main_color: r.get('main_color') || '',
    accent_color: r.get('accent_color') || '',
    lifespan_km_min: Number(r.get('lifespan_km_min')) || 0,
    lifespan_km_max: Number(r.get('lifespan_km_max')) || 0,
    has_carbon_plate: String(r.get('has_carbon_plate')).toLowerCase() === 'true',
  }));
}

/**
 * goods_no로 단일 신발 조회
 * @param {string} goodsNo
 * @returns {Promise<object|null>}
 */
async function getShoeByNo(goodsNo) {
  const shoes = await getAllShoes();
  return shoes.find((s) => s.goods_no === goodsNo) || null;
}

// ============================================================
// Logs 시트
// ============================================================

/**
 * Logs 시트에 추천 이력 비동기 저장
 * 실패해도 메인 응답에 영향 없음
 */
async function saveLog(userProfile, recommendedGoodsNos) {
  try {
    const doc = await openDoc();
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

// ============================================================
// Races 시트
// ============================================================

/**
 * Races 시트 전체 조회
 * @returns {Promise<object[]>}
 */
async function getRaces() {
  const doc = await openDoc();
  const sheet = doc.sheetsByTitle['Races'];
  if (!sheet) throw new Error('Races 시트를 찾을 수 없습니다');

  const rows = await sheet.getRows();
  return rows.map((r) => ({
    race_id: r.get('race_id'),
    race_name: r.get('race_name'),
    country: r.get('country'),
    city: r.get('city'),
    course_type: r.get('course_type'),
    typical_month: Number(r.get('typical_month')) || null,
    avg_temp_celsius: Number(r.get('avg_temp_celsius')) || null,
    surface_type: r.get('surface_type'),
    elevation_gain_m: Number(r.get('elevation_gain_m')) || 0,
    difficulty: Number(r.get('difficulty')) || 1,
    course_summary: r.get('course_summary') || '',
    shoe_priority_hint: r.get('shoe_priority_hint') || '',
    is_world_major: String(r.get('is_world_major')).toLowerCase() === 'true',
    is_active: String(r.get('is_active')).toLowerCase() !== 'false',
  }));
}

// ============================================================
// Celebs 시트
// ============================================================

/**
 * Celebs 시트 전체 조회
 * @returns {Promise<object[]>}
 */
async function getCelebs() {
  const doc = await openDoc();
  const sheet = doc.sheetsByTitle['Celebs'];
  if (!sheet) throw new Error('Celebs 시트를 찾을 수 없습니다');

  const rows = await sheet.getRows();
  return rows.map((r) => ({
    celeb_id: r.get('celeb_id'),
    celeb_name: r.get('celeb_name'),
    celeb_type: r.get('celeb_type'),
    celeb_image_url: r.get('celeb_image_url') || '',
    goods_no: r.get('goods_no'),
    source_url: r.get('source_url') || '',
  }));
}

// ============================================================
// RaceWinners 시트
// ============================================================

/**
 * RaceWinners 시트 전체 조회
 * @returns {Promise<object[]>}
 */
async function getRaceWinners() {
  const doc = await openDoc();
  const sheet = doc.sheetsByTitle['RaceWinners'];
  if (!sheet) throw new Error('RaceWinners 시트를 찾을 수 없습니다');

  const rows = await sheet.getRows();
  return rows.map((r) => ({
    winner_id: r.get('winner_id'),
    race_name: r.get('race_name'),
    race_year: Number(r.get('race_year')) || null,
    winner_name: r.get('winner_name'),
    winner_nationality: r.get('winner_nationality'),
    course_type: r.get('course_type'),
    result_time: r.get('result_time'),
    goods_no: r.get('goods_no'),
    source_url: r.get('source_url') || '',
  }));
}

// ============================================================
// SizeGuide 시트
// ============================================================

/**
 * SizeGuide 시트 전체 조회
 * @returns {Promise<object[]>}
 */
async function getSizeGuide() {
  const doc = await openDoc();
  const sheet = doc.sheetsByTitle['SizeGuide'];
  if (!sheet) throw new Error('SizeGuide 시트를 찾을 수 없습니다');

  const rows = await sheet.getRows();
  return rows.map((r) => ({
    size_guide_id: r.get('size_guide_id'),
    brand: r.get('brand'),
    model_name: r.get('model_name'),
    sizing_tendency: r.get('sizing_tendency'),
    width_tendency: r.get('width_tendency'),
    size_adjust_mm: Number(r.get('size_adjust_mm')) || 0,
    fit_note: r.get('fit_note') || '',
  }));
}

module.exports = {
  getAllShoes,
  getShoeByNo,
  saveLog,
  getRaces,
  getCelebs,
  getRaceWinners,
  getSizeGuide,
};
