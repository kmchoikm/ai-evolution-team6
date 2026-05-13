/**
 * 셀럽 / 마라톤 우승자 신발 탐색 로직 (Feature 1 + Feature 4)
 * winners.html에서 사용
 */

const API_BASE = (window.location.protocol === 'file:' ||
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1')
  ? 'http://localhost:3000'
  : 'https://ai-evolution-team6-production.up.railway.app';

const TYPE_LABEL = {
  athlete:    '선수',
  actor:      '배우',
  influencer: '인플루언서',
  youtuber:   '유튜버',
};
const TYPE_CLASS = {
  athlete:    'type-athlete',
  actor:      'type-actor',
  influencer: 'type-influencer',
  youtuber:   'type-youtuber',
};

let allCelebs = [];
let allWinners = [];
let currentCelebFilter = 'all';
let currentWinnerFilter = 'all';
let selectedCelebId = null;

// ============================================================
// 초기화
// ============================================================

async function init() {
  showLoading(true);
  await Promise.all([loadCelebs(), loadWinners()]);
  showLoading(false);
}

async function loadCelebs() {
  try {
    const res = await fetch(`${API_BASE}/api/celebs`);
    const data = await res.json();
    if (data.status === 'success') {
      allCelebs = data.celebs;
      renderCelebGrid(allCelebs);
    } else {
      renderCelebError();
    }
  } catch {
    renderCelebError();
  }
}

async function loadWinners() {
  try {
    const res = await fetch(`${API_BASE}/api/race-winners`);
    const data = await res.json();
    if (data.status === 'success') {
      allWinners = data.winners;
      renderWinnerFilters(allWinners);
      renderWinnersList(allWinners);
    } else {
      renderWinnersError();
    }
  } catch {
    renderWinnersError();
  }
}

// ============================================================
// 탭 전환
// ============================================================

function switchTab(tab) {
  document.getElementById('tab-celeb').classList.toggle('active', tab === 'celeb');
  document.getElementById('tab-winners').classList.toggle('active', tab === 'winners');
  document.getElementById('section-celeb').classList.toggle('active', tab === 'celeb');
  document.getElementById('section-winners').classList.toggle('active', tab === 'winners');
}

// ============================================================
// 셀럽 탭
// ============================================================

function filterCelebs(type, btn) {
  currentCelebFilter = type;

  // 필터 칩 스타일 업데이트
  document.querySelectorAll('#celeb-filters .filter-chip').forEach((el) => el.classList.remove('active'));
  btn.classList.add('active');

  const filtered = type === 'all' ? allCelebs : allCelebs.filter((c) => c.celeb_type === type);
  renderCelebGrid(filtered);

  // 상세 닫기
  document.getElementById('celeb-detail').style.display = 'none';
  selectedCelebId = null;
}

function renderCelebGrid(celebs) {
  const grid = document.getElementById('celeb-grid');
  if (celebs.length === 0) {
    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--text-light);padding:24px 0;">해당 분류의 셀럽이 없습니다.</p>';
    return;
  }

  grid.innerHTML = celebs.map((c) => {
    const initial = c.celeb_name.charAt(0);
    const typeLabel = TYPE_LABEL[c.celeb_type] || c.celeb_type;
    const typeCls   = TYPE_CLASS[c.celeb_type] || '';
    return `
      <div class="celeb-card${selectedCelebId === c.celeb_id ? ' active' : ''}"
           id="cc-${c.celeb_id}" onclick="selectCeleb('${c.celeb_id}')">
        <div class="celeb-avatar">${initial}</div>
        <div class="celeb-name">${c.celeb_name}</div>
        <span class="celeb-type-badge ${typeCls}">${typeLabel}</span>
      </div>`;
  }).join('');
}

async function selectCeleb(celebId) {
  if (selectedCelebId === celebId) {
    selectedCelebId = null;
    document.getElementById('celeb-detail').style.display = 'none';
    document.querySelectorAll('.celeb-card').forEach((el) => el.classList.remove('active'));
    return;
  }

  selectedCelebId = celebId;
  document.querySelectorAll('.celeb-card').forEach((el) => el.classList.remove('active'));
  const card = document.getElementById(`cc-${celebId}`);
  if (card) card.classList.add('active');

  const detailEl = document.getElementById('celeb-detail');
  detailEl.style.display = 'block';
  detailEl.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-light);">
    <div class="spinner" style="margin:0 auto 10px;"></div>착용 신발을 불러오는 중...</div>`;
  detailEl.scrollIntoView({ behavior: 'smooth', block: 'start' });

  try {
    const res = await fetch(`${API_BASE}/api/celebs/${celebId}`);
    const data = await res.json();
    if (data.status === 'success') {
      renderCelebDetail(data.celeb, data.shoe);
    } else {
      detailEl.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${data.message || '불러올 수 없습니다.'}</p></div>`;
    }
  } catch {
    detailEl.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>서버에 연결할 수 없습니다.</p></div>`;
  }
}

function renderCelebDetail(celeb, shoe) {
  const initial   = celeb.celeb_name.charAt(0);
  const typeLabel = TYPE_LABEL[celeb.celeb_type] || celeb.celeb_type;
  const typeCls   = TYPE_CLASS[celeb.celeb_type] || '';

  const shoeHtml = shoe
    ? `
      <article class="rec-card rank-1" style="margin-top:16px;">
        <div class="rec-rank">👟</div>
        <div class="rec-body">
          <div class="rec-header">
            <h3>${shoe.brand} <span class="rec-name">${shoe.goods_name}</span></h3>
          </div>
          <p class="rec-summary">${shoe.summary || ''}</p>
          <div class="rec-tags">
            ${shoe.width   ? `<span class="feature-tag">발볼 ${shoe.width}</span>` : ''}
            ${shoe.cushion ? `<span class="feature-tag">쿠션 ${shoe.cushion}/5</span>` : ''}
            ${shoe.weight  ? `<span class="feature-tag">무게 ${shoe.weight}/5</span>` : ''}
            ${shoe.distance? `<span class="feature-tag">${shoe.distance}</span>` : ''}
          </div>
          <div class="rec-footer">
            <span class="rec-price">₩${parseInt(shoe.price).toLocaleString()}</span>
            <a href="${shoe.url}" target="_blank" class="btn-musinsa">무신사에서 보기 →</a>
          </div>
        </div>
      </article>`
    : '<p style="color:var(--text-light);font-size:14px;margin-top:12px;">신발 정보가 등록되지 않았습니다.</p>';

  document.getElementById('celeb-detail').innerHTML = `
    <div class="celeb-shoe-detail">
      <div class="celeb-shoe-header">
        <div class="celeb-avatar-lg">${initial}</div>
        <div>
          <div style="font-size:17px;font-weight:800;">${celeb.celeb_name}</div>
          <span class="celeb-type-badge ${typeCls}" style="margin-top:4px;display:inline-block;">${typeLabel}</span>
        </div>
      </div>
      <div style="font-size:13px;color:var(--text-light);margin-bottom:4px;">착용 신발</div>
      ${shoeHtml}
      ${celeb.source_url ? `<a href="${celeb.source_url}" target="_blank" style="font-size:12px;color:var(--primary);display:block;margin-top:10px;">📎 출처 보기</a>` : ''}
    </div>`;
}

function renderCelebError() {
  document.getElementById('celeb-grid').innerHTML = `
    <div style="grid-column:1/-1;text-align:center;padding:24px;color:var(--text-light);">
      ⚠️ 셀럽 데이터를 불러올 수 없습니다.
    </div>`;
}

// ============================================================
// 우승자 탭
// ============================================================

function renderWinnerFilters(winners) {
  const races = [...new Set(winners.map((w) => w.race_name))].slice(0, 6);
  const filterBar = document.getElementById('winner-filters');
  filterBar.innerHTML =
    `<button class="filter-chip active" onclick="filterWinners('all', this)">전체</button>` +
    races.map((r) =>
      `<button class="filter-chip" onclick="filterWinners('${r.replace(/'/g, "\\'")}', this)">${r}</button>`
    ).join('');
}

function filterWinners(raceName, btn) {
  document.querySelectorAll('#winner-filters .filter-chip').forEach((el) => el.classList.remove('active'));
  btn.classList.add('active');
  const filtered = raceName === 'all' ? allWinners : allWinners.filter((w) => w.race_name === raceName);
  renderWinnersList(filtered);
}

function renderWinnersList(winners) {
  const el = document.getElementById('winners-list');
  if (winners.length === 0) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">🔍</div><p>조건에 맞는 우승자가 없습니다.</p></div>';
    return;
  }

  el.innerHTML = winners.map((w) => {
    const shoeHtml = w.shoe
      ? `
        <div style="border-top:1px solid var(--border);margin-top:12px;padding-top:12px;">
          <div style="font-size:12px;color:var(--text-light);margin-bottom:8px;">착용 신발</div>
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
            <div>
              <div style="font-size:15px;font-weight:700;">${w.shoe.brand} ${w.shoe.goods_name}</div>
              <div style="font-size:12px;color:var(--text-light);margin-top:2px;">${w.shoe.summary || ''}</div>
            </div>
            <a href="${w.shoe.url}" target="_blank" class="btn-musinsa" style="flex-shrink:0;">무신사 →</a>
          </div>
        </div>`
      : '';

    return `
      <div class="winner-card">
        <div class="winner-header">
          <div class="winner-race">${w.race_name}</div>
          <span class="winner-year">${w.race_year}</span>
        </div>
        <div class="winner-info">
          <span class="winner-chip">👤 ${w.winner_name}</span>
          <span class="winner-chip">🌏 ${w.winner_nationality}</span>
          <span class="winner-chip">${w.course_type === 'full' ? '풀코스' : '하프코스'}</span>
        </div>
        <div class="winner-time">⏱ ${w.result_time}</div>
        ${shoeHtml}
      </div>`;
  }).join('');
}

function renderWinnersError() {
  document.getElementById('winners-list').innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">⚠️</div>
      <p>우승자 데이터를 불러올 수 없습니다.</p>
    </div>`;
}

function showLoading(on) {
  document.getElementById('loading-overlay').style.display = on ? 'flex' : 'none';
}

init();
