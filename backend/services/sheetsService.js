/**
 * Google Sheets DB 접근 모듈 (v2.0)
 * 지원 시트: Shoes / Logs / Celebs / RaceWinners / Races / SizeGuide
 */

require('dotenv').config();
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

function createAuth() {
  const rawKey = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/^["']|["']$/g, '');
  const privateKey = rawKey.replace(/\\n/g, '\n');
  return new JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

async function loadDoc() {
  const doc = new GoogleSpreadsheet(process.env.SPREADSHEET_ID, createAuth());
  await doc.loadInfo();
  return doc;
}

// ============================================================
// Shoes
// ============================================================

async function getAllShoes() {
  const doc = await loadDoc();
  const sheet = doc.sheetsByTitle['Shoes'];
  if (!sheet) throw new Error('Shoes 시트를 찾을 수 없습니다');

  const rows = await sheet.getRows();
  return rows.map((r) => ({
    goods_no:           r.get('goods_no'),
    goods_name:         r.get('goods_name'),
    brand:              r.get('brand'),
    price:              Number(r.get('price')) || 0,
    url:                r.get('url'),
    thumbnail:          r.get('thumbnail') || '',
    width:              r.get('width'),
    cushion:            Number(r.get('cushion')) || 3,
    weight:             Number(r.get('weight')) || 3,
    distance:           r.get('distance'),
    breathability:      Number(r.get('breathability')) || 3,
    fit:                Number(r.get('fit')) || 3,
    summary:            r.get('summary') || '',
    review_count_used:  Number(r.get('review_count_used')) || 0,
    confidence:         r.get('confidence') || 'low',
    main_color:         r.get('main_color') || '',
    accent_color:       r.get('accent_color') || '',
    lifespan_km_min:    Number(r.get('lifespan_km_min')) || 500,
    lifespan_km_max:    Number(r.get('lifespan_km_max')) || 800,
    has_carbon_plate:   r.get('has_carbon_plate') === 'true',
  }));
}

// ============================================================
// Logs
// ============================================================

async function saveLog(userProfile, recommendedGoodsNos) {
  try {
    const doc = await loadDoc();
    const sheet = doc.sheetsByTitle['Logs'];
    if (!sheet) return;

    const { v4: uuidv4 } = require('uuid');
    const now = new Date();
    const timestamp = now.toISOString().replace('T', ' ').slice(0, 19);

    await sheet.addRow({
      log_id:               uuidv4(),
      timestamp,
      running_distance:     userProfile.running_distance || '',
      frequency:            userProfile.frequency || '',
      foot_width:           userProfile.foot_width || '',
      preferred_cushion:    userProfile.preferred_cushion ?? '',
      priorities:           (userProfile.priorities || []).join(','),
      budget:               userProfile.budget || '',
      free_text:            userProfile.free_text || '',
      recommended_goods_no: recommendedGoodsNos.join(','),
    });
  } catch (err) {
    console.error('[Sheets] 로그 저장 실패:', err.message);
  }
}

// ============================================================
// Celebs
// ============================================================

async function getAllCelebs(typeFilter) {
  const doc = await loadDoc();
  const sheet = doc.sheetsByTitle['Celebs'];
  if (!sheet) throw new Error('Celebs 시트를 찾을 수 없습니다');

  const rows = await sheet.getRows();
  const celebs = rows.map((r) => ({
    celeb_id:        r.get('celeb_id'),
    celeb_name:      r.get('celeb_name'),
    celeb_type:      r.get('celeb_type'),
    celeb_image_url: r.get('celeb_image_url') || '',
    goods_no:        r.get('goods_no'),
    source_url:      r.get('source_url') || '',
  }));

  if (typeFilter) {
    return celebs.filter((c) => c.celeb_type === typeFilter);
  }
  return celebs;
}

async function getCelebWithShoes(celebId) {
  const doc = await loadDoc();

  const celebsSheet = doc.sheetsByTitle['Celebs'];
  if (!celebsSheet) throw new Error('Celebs 시트를 찾을 수 없습니다');

  const celebRows = await celebsSheet.getRows();
  const celebRow = celebRows.find((r) => r.get('celeb_id') === celebId);
  if (!celebRow) return null;

  const celeb = {
    celeb_id:        celebRow.get('celeb_id'),
    celeb_name:      celebRow.get('celeb_name'),
    celeb_type:      celebRow.get('celeb_type'),
    celeb_image_url: celebRow.get('celeb_image_url') || '',
    goods_no:        celebRow.get('goods_no'),
    source_url:      celebRow.get('source_url') || '',
  };

  // goods_no로 Shoes 시트에서 신발 정보 조회
  const shoesSheet = doc.sheetsByTitle['Shoes'];
  if (!shoesSheet) return { celeb, shoe: null };

  const shoeRows = await shoesSheet.getRows();
  const shoeRow = shoeRows.find((r) => r.get('goods_no') === celeb.goods_no);
  const shoe = shoeRow
    ? {
        goods_no:   shoeRow.get('goods_no'),
        goods_name: shoeRow.get('goods_name'),
        brand:      shoeRow.get('brand'),
        price:      Number(shoeRow.get('price')) || 0,
        url:        shoeRow.get('url'),
        thumbnail:  shoeRow.get('thumbnail') || '',
        width:      shoeRow.get('width'),
        cushion:    Number(shoeRow.get('cushion')) || 3,
        weight:     Number(shoeRow.get('weight')) || 3,
        distance:   shoeRow.get('distance'),
        summary:    shoeRow.get('summary') || '',
        confidence: shoeRow.get('confidence') || 'low',
      }
    : null;

  return { celeb, shoe };
}

// ============================================================
// RaceWinners
// ============================================================

async function getRaceWinners({ raceName, raceYear, courseType } = {}) {
  const doc = await loadDoc();
  const sheet = doc.sheetsByTitle['RaceWinners'];
  if (!sheet) throw new Error('RaceWinners 시트를 찾을 수 없습니다');

  const shoesSheet = doc.sheetsByTitle['Shoes'];
  const shoeRows = shoesSheet ? await shoesSheet.getRows() : [];

  const rows = await sheet.getRows();
  let winners = rows.map((r) => {
    const goods_no = r.get('goods_no');
    const shoeRow = shoeRows.find((s) => s.get('goods_no') === goods_no);
    return {
      winner_id:           r.get('winner_id'),
      race_name:           r.get('race_name'),
      race_year:           Number(r.get('race_year')) || 0,
      winner_name:         r.get('winner_name'),
      winner_nationality:  r.get('winner_nationality'),
      course_type:         r.get('course_type'),
      result_time:         r.get('result_time'),
      goods_no,
      source_url:          r.get('source_url') || '',
      shoe: shoeRow
        ? {
            goods_no,
            goods_name: shoeRow.get('goods_name'),
            brand:      shoeRow.get('brand'),
            price:      Number(shoeRow.get('price')) || 0,
            url:        shoeRow.get('url'),
            thumbnail:  shoeRow.get('thumbnail') || '',
            summary:    shoeRow.get('summary') || '',
            cushion:    Number(shoeRow.get('cushion')) || 3,
            weight:     Number(shoeRow.get('weight')) || 3,
          }
        : null,
    };
  });

  if (raceName)   winners = winners.filter((w) => w.race_name.includes(raceName));
  if (raceYear)   winners = winners.filter((w) => w.race_year === Number(raceYear));
  if (courseType) winners = winners.filter((w) => w.course_type === courseType);

  return winners;
}

// ============================================================
// Races
// ============================================================

async function getAllRaces({ country, isWorldMajor, courseType } = {}) {
  const doc = await loadDoc();
  const sheet = doc.sheetsByTitle['Races'];
  if (!sheet) throw new Error('Races 시트를 찾을 수 없습니다');

  const rows = await sheet.getRows();
  let races = rows
    .filter((r) => r.get('is_active') !== 'false')
    .map((r) => ({
      race_id:           r.get('race_id'),
      race_name:         r.get('race_name'),
      country:           r.get('country'),
      city:              r.get('city'),
      course_type:       r.get('course_type'),
      typical_month:     Number(r.get('typical_month')) || 0,
      avg_temp_celsius:  Number(r.get('avg_temp_celsius')) || 15,
      surface_type:      r.get('surface_type'),
      elevation_gain_m:  Number(r.get('elevation_gain_m')) || 0,
      difficulty:        Number(r.get('difficulty')) || 3,
      course_summary:    r.get('course_summary') || '',
      shoe_priority_hint:r.get('shoe_priority_hint') || '',
      is_world_major:    r.get('is_world_major') === 'true',
      is_active:         r.get('is_active') !== 'false',
    }));

  if (country)       races = races.filter((r) => r.country === country);
  if (isWorldMajor !== undefined) {
    races = races.filter((r) => r.is_world_major === (isWorldMajor === 'true' || isWorldMajor === true));
  }
  if (courseType)    races = races.filter((r) => r.course_type === courseType);

  return races;
}

async function getRaceById(raceId) {
  const races = await getAllRaces();
  return races.find((r) => r.race_id === raceId) || null;
}

// ============================================================
// SizeGuide
// ============================================================

async function getAllSizeGuides() {
  const doc = await loadDoc();
  const sheet = doc.sheetsByTitle['SizeGuide'];
  if (!sheet) throw new Error('SizeGuide 시트를 찾을 수 없습니다');

  const rows = await sheet.getRows();
  return rows.map((r) => ({
    size_guide_id:     r.get('size_guide_id'),
    brand:             r.get('brand'),
    model_name:        r.get('model_name'),
    sizing_tendency:   r.get('sizing_tendency'),
    width_tendency:    r.get('width_tendency'),
    size_adjust_mm:    Number(r.get('size_adjust_mm')) || 0,
    fit_note:          r.get('fit_note') || '',
  }));
}

module.exports = {
  getAllShoes,
  saveLog,
  getAllCelebs,
  getCelebWithShoes,
  getRaceWinners,
  getAllRaces,
  getRaceById,
  getAllSizeGuides,
};
