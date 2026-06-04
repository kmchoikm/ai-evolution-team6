/**
 * sheetsService 단위 테스트
 * google-spreadsheet, google-auth-library는 jest.mock()으로 완전 목킹
 *
 * 검증 항목:
 * 1. getAllShoes: 행 데이터를 올바른 타입으로 변환
 * 2. getShoeByNo: goods_no로 신발을 찾거나 null 반환
 * 3. getRaces: 행 데이터를 올바른 타입으로 변환
 * 4. getCelebs: 행 데이터를 올바른 타입으로 변환
 * 5. getRaceWinners: 행 데이터를 올바른 타입으로 변환
 * 6. getSizeGuide: 행 데이터를 올바른 타입으로 변환
 * 7. saveLog: 성공 경로 및 실패 시 무시
 */

jest.mock('google-spreadsheet');
jest.mock('google-auth-library');

const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const {
  getAllShoes,
  getShoeByNo,
  getRaces,
  getCelebs,
  getRaceWinners,
  getSizeGuide,
  saveLog,
} = require('../../../services/sheetsService');

// ============================================================
// Mock 헬퍼
// ============================================================

/** 스프레드시트 행 mock — r.get(field) 패턴 */
function mockRow(data) {
  return { get: (field) => data[field] };
}

/** openDoc() mock 설정 — 각 시트별 getRows 반환값을 지정 */
function setupMockDoc(sheetData) {
  JWT.mockImplementation(() => ({}));
  GoogleSpreadsheet.mockImplementation(() => ({
    loadInfo: jest.fn().mockResolvedValue(undefined),
    sheetsByTitle: Object.fromEntries(
      Object.entries(sheetData).map(([title, rows]) => [
        title,
        {
          getRows: jest.fn().mockResolvedValue(rows.map(mockRow)),
          addRow: jest.fn().mockResolvedValue(undefined),
        },
      ])
    ),
  }));
}

// ============================================================
// getAllShoes
// ============================================================

describe('getAllShoes', () => {
  const rawShoeRow = {
    goods_no: 'SHOE001',
    goods_name: '아식스 젤-카야노 31',
    brand: 'ASICS',
    price: '160000',
    url: 'https://example.com/shoe001',
    thumbnail: 'https://example.com/shoe001.jpg',
    width: '보통',
    cushion: '4',
    weight: '3',
    distance: '장거리',
    breathability: '4',
    fit: '4',
    summary: '안정성 트레이닝화',
    review_count_used: '120',
    confidence: 'high',
    main_color: 'Blue',
    accent_color: 'White',
    lifespan_km_min: '700',
    lifespan_km_max: '900',
    has_carbon_plate: 'false',
  };

  beforeEach(() => {
    setupMockDoc({ Shoes: [rawShoeRow] });
  });

  it('숫자 필드를 Number 타입으로 변환한다', async () => {
    const shoes = await getAllShoes();
    expect(shoes[0].price).toBe(160000);
    expect(typeof shoes[0].price).toBe('number');
    expect(shoes[0].cushion).toBe(4);
    expect(shoes[0].lifespan_km_min).toBe(700);
  });

  it('has_carbon_plate 문자열을 boolean으로 변환한다', async () => {
    const shoes = await getAllShoes();
    expect(shoes[0].has_carbon_plate).toBe(false);
    expect(typeof shoes[0].has_carbon_plate).toBe('boolean');
  });

  it('has_carbon_plate="true"이면 true로 변환한다', async () => {
    setupMockDoc({ Shoes: [{ ...rawShoeRow, has_carbon_plate: 'true' }] });
    const shoes = await getAllShoes();
    expect(shoes[0].has_carbon_plate).toBe(true);
  });

  it('Shoes 시트가 없으면 Error를 throw한다', async () => {
    setupMockDoc({});
    await expect(getAllShoes()).rejects.toThrow('Shoes 시트를 찾을 수 없습니다');
  });
});

// ============================================================
// getShoeByNo
// ============================================================

describe('getShoeByNo', () => {
  beforeEach(() => {
    setupMockDoc({
      Shoes: [
        {
          goods_no: 'SHOE001', goods_name: '아식스 젤-카야노 31', brand: 'ASICS',
          price: '160000', url: '', thumbnail: '', width: '보통', cushion: '4', weight: '3',
          distance: '장거리', breathability: '4', fit: '4', summary: '', review_count_used: '0',
          confidence: 'high', main_color: '', accent_color: '', lifespan_km_min: '700',
          lifespan_km_max: '900', has_carbon_plate: 'false',
        },
      ],
    });
  });

  it('존재하는 goods_no를 조회하면 해당 신발을 반환한다', async () => {
    const shoe = await getShoeByNo('SHOE001');
    expect(shoe).not.toBeNull();
    expect(shoe.goods_no).toBe('SHOE001');
    expect(shoe.brand).toBe('ASICS');
  });

  it('존재하지 않는 goods_no이면 null을 반환한다', async () => {
    const shoe = await getShoeByNo('SHOE_NOT_EXIST');
    expect(shoe).toBeNull();
  });
});

// ============================================================
// getRaces
// ============================================================

describe('getRaces', () => {
  const rawRaceRow = {
    race_id: 'RACE001',
    race_name: '서울 마라톤',
    country: 'Korea',
    city: 'Seoul',
    course_type: 'full',
    typical_month: '3',
    avg_temp_celsius: '10',
    surface_type: 'asphalt',
    elevation_gain_m: '50',
    difficulty: '2',
    course_summary: '평탄한 도심 코스',
    shoe_priority_hint: '경량,쿠션',
    is_world_major: 'false',
    is_active: 'true',
  };

  beforeEach(() => {
    setupMockDoc({ Races: [rawRaceRow] });
  });

  it('숫자 필드를 Number 타입으로 변환한다', async () => {
    const races = await getRaces();
    expect(races[0].difficulty).toBe(2);
    expect(races[0].elevation_gain_m).toBe(50);
    expect(races[0].typical_month).toBe(3);
  });

  it('is_world_major / is_active를 boolean으로 변환한다', async () => {
    const races = await getRaces();
    expect(races[0].is_world_major).toBe(false);
    expect(races[0].is_active).toBe(true);
  });

  it('Races 시트가 없으면 Error를 throw한다', async () => {
    setupMockDoc({});
    await expect(getRaces()).rejects.toThrow('Races 시트를 찾을 수 없습니다');
  });
});

// ============================================================
// getCelebs
// ============================================================

describe('getCelebs', () => {
  const rawCelebRow = {
    celeb_id: 'CELEB001',
    celeb_name: '손흥민',
    celeb_type: 'athlete',
    celeb_image_url: 'https://example.com/celeb001.jpg',
    goods_no: 'SHOE001',
    source_url: 'https://example.com/source',
  };

  beforeEach(() => {
    setupMockDoc({ Celebs: [rawCelebRow] });
  });

  it('셀럽 행을 올바른 형태로 변환한다', async () => {
    const celebs = await getCelebs();
    expect(celebs[0].celeb_id).toBe('CELEB001');
    expect(celebs[0].celeb_name).toBe('손흥민');
    expect(celebs[0].goods_no).toBe('SHOE001');
  });

  it('Celebs 시트가 없으면 Error를 throw한다', async () => {
    setupMockDoc({});
    await expect(getCelebs()).rejects.toThrow('Celebs 시트를 찾을 수 없습니다');
  });
});

// ============================================================
// getRaceWinners
// ============================================================

describe('getRaceWinners', () => {
  const rawWinnerRow = {
    winner_id: 'WIN001',
    race_name: '서울 마라톤',
    race_year: '2024',
    winner_name: '홍길동',
    winner_nationality: 'Korea',
    course_type: 'full',
    result_time: '2:08:30',
    goods_no: 'SHOE002',
    source_url: 'https://example.com/result',
  };

  beforeEach(() => {
    setupMockDoc({ RaceWinners: [rawWinnerRow] });
  });

  it('race_year를 Number로 변환한다', async () => {
    const winners = await getRaceWinners();
    expect(winners[0].race_year).toBe(2024);
    expect(typeof winners[0].race_year).toBe('number');
  });

  it('RaceWinners 시트가 없으면 Error를 throw한다', async () => {
    setupMockDoc({});
    await expect(getRaceWinners()).rejects.toThrow('RaceWinners 시트를 찾을 수 없습니다');
  });
});

// ============================================================
// getSizeGuide
// ============================================================

describe('getSizeGuide', () => {
  const rawGuideRow = {
    size_guide_id: 'SG001',
    brand: 'ASICS',
    model_name: '젤-카야노 31',
    sizing_tendency: 'true_to_size',
    width_tendency: 'normal',
    size_adjust_mm: '0',
    fit_note: '아식스 표준',
  };

  beforeEach(() => {
    setupMockDoc({ SizeGuide: [rawGuideRow] });
  });

  it('size_adjust_mm을 Number로 변환한다', async () => {
    const guides = await getSizeGuide();
    expect(guides[0].size_adjust_mm).toBe(0);
    expect(typeof guides[0].size_adjust_mm).toBe('number');
  });

  it('SizeGuide 시트가 없으면 Error를 throw한다', async () => {
    setupMockDoc({});
    await expect(getSizeGuide()).rejects.toThrow('SizeGuide 시트를 찾을 수 없습니다');
  });
});

// ============================================================
// saveLog
// ============================================================

describe('saveLog', () => {
  it('정상적으로 Logs 시트에 행을 추가한다', async () => {
    const mockAddRow = jest.fn().mockResolvedValue(undefined);
    JWT.mockImplementation(() => ({}));
    GoogleSpreadsheet.mockImplementation(() => ({
      loadInfo: jest.fn().mockResolvedValue(undefined),
      sheetsByTitle: {
        Logs: { addRow: mockAddRow },
      },
    }));

    const profile = { running_distance: 'long', foot_width: 'normal', priorities: ['comfort'] };
    await saveLog(profile, ['SHOE001', 'SHOE002']);

    expect(mockAddRow).toHaveBeenCalledTimes(1);
    const savedRow = mockAddRow.mock.calls[0][0];
    expect(savedRow.recommended_goods_no).toBe('SHOE001,SHOE002');
  });

  it('Logs 시트 저장 실패 시 예외를 throw하지 않는다 (무시)', async () => {
    JWT.mockImplementation(() => ({}));
    GoogleSpreadsheet.mockImplementation(() => ({
      loadInfo: jest.fn().mockRejectedValue(new Error('Sheets 연결 실패')),
      sheetsByTitle: {},
    }));

    // throw 없이 완료되어야 함
    await expect(
      saveLog({ running_distance: 'long', foot_width: 'normal', priorities: [] }, ['SHOE001'])
    ).resolves.toBeUndefined();
  });
});
