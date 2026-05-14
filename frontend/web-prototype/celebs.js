/**
 * 셀럽 / 우승자 착용 신발 페이지 로직
 * celebs.html 전용 — GET /api/celebs, /api/celebs/:id, /api/race-winners 연동
 */

const API_BASE = (window.location.protocol === 'file:' ||
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1')
  ? 'http://localhost:3000'
  : 'https://ai-evolution-team6-production.up.railway.app';

let allCelebs = [];
let allWinners = [];
let currentTab = 'celebs';
let currentCelebFilter = '';

// ============================================================
// 초기화
// ============================================================

async function init() {
  await Promise.all([fetchCelebs(), fetchWinners()]);
}

// ============================================================
// 탭 전환
// ============================================================

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  document.getElementById('celebs-panel').style.display = tab === 'celebs' ? 'block' : 'none';
  document.getElementById('winners-panel').style.display = tab === 'winners' ? 'block' : 'none';
}

// ============================================================
// 셀럽 API 호출 및 렌더링
// ============================================================

async function fetchCelebs() {
  showLoading(true, '셀럽 정보를 불러오는 중...');
  try {
    const res = await fetch(`${API_BASE}/api/celebs`);
    const data = await res.json();
    if (!res.ok || data.status === 'error') throw new Error(data.message);
    allCelebs = data.celebs || [];
    renderCelebList(allCelebs);
  } catch (err) {
    document.getElementById('celebs-list-container').innerHTML = renderErrorState(err.message, 'fetchCelebs()');
  } finally {
    showLoading(false);
  }
}

function filterCelebs(type) {
  currentCelebFilter = type;
  document.querySelectorAll('.filter-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.type === type);
  });
  document.getElementById('celeb-shoes-container').innerHTML = '';
  const filtered = type ? allCelebs.filter((c) => c.celeb_type === type) : allCelebs;
  renderCelebList(filtered);
}

const CELEB_TYPE_KO = { athlete: '운동선수', influencer: '인플루언서', youtuber: '유튜버', actor: '배우' };

function renderCelebList(celebs) {
  const container = document.getElementById('celebs-list-container');
  if (celebs.length === 0) {
    container.innerHTML = '<p class="empty-msg">해당 유형의 셀럽 데이터가 없습니다.</p>'; return;
  }
  container.innerHTML = `
    <div class="celeb-grid">
      ${celebs.map((c) => `
        <button class="celeb-card" onclick="fetchCelebShoes('${c.celeb_id}', this)">
          <div class="celeb-avatar">
            ${c.celeb_image_url
              ? `<img src="${c.celeb_image_url}" alt="${c.celeb_name}" onerror="this.parentElement.innerHTML='👤'" />`
              : '<span class="celeb-avatar-placeholder">👤</span>'}
          </div>
          <p class="celeb-name">${c.celeb_name}</p>
          <p class="celeb-type">${CELEB_TYPE_KO[c.celeb_type] || c.celeb_type}</p>
        </button>
      `).join('')}
    </div>`;
}

async function fetchCelebShoes(celebId, btnEl) {
  document.querySelectorAll('.celeb-card').forEach((el) => el.classList.remove('selected'));
  btnEl.classList.add('selected');

  const container = document.getElementById('celeb-shoes-container');
  container.innerHTML = '<div class="socks-loading">착용 신발 정보를 불러오는 중...</div>';
  container.scrollIntoView({ behavior: 'smooth', block: 'start' });

  try {
    const res = await fetch(`${API_BASE}/api/celebs/${celebId}`);
    const data = await res.json();
    if (!res.ok || data.status === 'error') throw new Error(data.message);

    if (data.status === 'no_match' || !data.shoes?.length) {
      container.innerHTML = '<p class="empty-msg">착용 신발 데이터가 없습니다.</p>'; return;
    }

    container.innerHTML = `
      <h2 class="section-title">${data.celeb.celeb_name}의 러닝화</h2>
      ${data.shoes.map((shoe) => `
        <article class="rec-card">
          <div class="rec-body" style="width:100%;">
            <div class="rec-header">
              <h3>${shoe.brand} <span class="rec-name">${shoe.goods_name}</span></h3>
              ${shoe.price ? `<span class="rec-price">₩${Number(shoe.price).toLocaleString()}</span>` : ''}
            </div>
            <div class="rec-footer" style="margin-top:12px;">
              ${shoe.source_url ? `<a href="${shoe.source_url}" target="_blank" class="btn-secondary" style="font-size:12px;">출처 보기</a>` : ''}
              ${shoe.url ? `<a href="${shoe.url}" target="_blank" class="btn-musinsa">무신사에서 보기 →</a>` : ''}
            </div>
          </div>
        </article>`).join('')}`;
  } catch (err) {
    container.innerHTML = renderErrorState(err.message, `fetchCelebShoes('${celebId}', document.querySelector('.celeb-card.selected'))`);
  }
}

// ============================================================
// 우승자 API 호출 및 렌더링
// ============================================================

async function fetchWinners() {
  showLoading(true, '우승자 정보를 불러오는 중...');
  try {
    const res = await fetch(`${API_BASE}/api/race-winners`);
    const data = await res.json();
    if (!res.ok || data.status === 'error') throw new Error(data.message);
    allWinners = data.winners || [];
    renderWinnerList(allWinners);
  } catch (err) {
    document.getElementById('winners-list-container').innerHTML = renderErrorState(err.message, 'fetchWinners()');
  } finally {
    showLoading(false);
  }
}

function filterWinners() {
  const keyword = document.getElementById('winner-search').value.trim().toLowerCase();
  const filtered = keyword
    ? allWinners.filter((w) => w.race_name?.toLowerCase().includes(keyword) || w.winner_name?.toLowerCase().includes(keyword))
    : allWinners;
  renderWinnerList(filtered);
}

function renderWinnerList(winners) {
  const container = document.getElementById('winners-list-container');
  if (winners.length === 0) {
    container.innerHTML = '<p class="empty-msg">해당 조건의 우승자 데이터가 없습니다.</p>'; return;
  }
  container.innerHTML = `
    <div class="winner-list">
      ${winners.map((w) => `
        <div class="winner-card">
          <div class="winner-info">
            <h3>${w.race_name} <span class="winner-year">${w.race_year}</span></h3>
            <p>${w.winner_name} · ${w.winner_nationality} · ${w.course_type === 'full' ? '풀' : '하프'}</p>
            ${w.result_time ? `<p class="winner-time">⏱ ${w.result_time}</p>` : ''}
          </div>
          <div class="winner-shoe">
            <span class="badge badge-high">착용 신발</span>
            <p class="winner-goods-no">No. ${w.goods_no || '-'}</p>
            ${w.source_url ? `<a href="${w.source_url}" target="_blank" class="btn-secondary" style="font-size:12px;margin-top:4px;">출처</a>` : ''}
          </div>
        </div>`).join('')}
    </div>`;
}

// ============================================================
// 공통 유틸
// ============================================================

function renderErrorState(message, retryFn) {
  return `
    <div class="empty-state">
      <div class="empty-icon">⚠️</div>
      <h2>데이터를 불러올 수 없습니다</h2>
      <p>${message}</p>
      <button onclick="${retryFn}" class="btn-primary">다시 시도</button>
    </div>`;
}

function showLoading(on, message) {
  const overlay = document.getElementById('loading-overlay');
  if (!overlay) return;
  overlay.style.display = on ? 'flex' : 'none';
  if (message) {
    const msg = document.getElementById('loading-message');
    if (msg) msg.textContent = message;
  }
}

init();
