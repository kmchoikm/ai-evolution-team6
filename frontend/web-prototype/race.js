/**
 * 대회 코스 기반 러닝화 추천 페이지 로직
 * race.html 전용 — GET /api/races, POST /api/recommend/race 연동
 */

const API_BASE = (window.location.protocol === 'file:' ||
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1')
  ? 'http://localhost:3000'
  : 'https://ai-evolution-team6-production.up.railway.app';

let allRaces = [];
let selectedRace = null;
let currentTab = 'domestic';

// ============================================================
// 초기화
// ============================================================

async function init() {
  // 라디오/체크박스 선택 스타일 처리
  document.querySelectorAll('.option-btn input').forEach((input) => {
    input.addEventListener('change', () => {
      const name = input.name;
      document.querySelectorAll(`.option-btn input[name="${name}"]`)
        .forEach((el) => el.closest('.option-btn').classList.remove('selected'));
      input.closest('.option-btn').classList.add('selected');
    });
  });

  await fetchRaces();
}

// ============================================================
// 대회 목록 API 호출
// ============================================================

async function fetchRaces() {
  showLoading(true, '대회 정보를 불러오는 중...');
  try {
    const res = await fetch(`${API_BASE}/api/races`);
    const data = await res.json();
    if (!res.ok || data.status === 'error') throw new Error(data.message);
    allRaces = data.races || [];
    renderRaceList(currentTab);
  } catch (err) {
    document.getElementById('race-list-container').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <h2>대회 정보를 불러올 수 없습니다</h2>
        <p>${err.message}</p>
        <button onclick="fetchRaces()" class="btn-primary">다시 시도</button>
      </div>`;
  } finally {
    showLoading(false);
  }
}

// ============================================================
// 탭 전환
// ============================================================

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  resetRaceSelection();
  renderRaceList(tab);
}

// ============================================================
// 대회 목록 렌더링
// ============================================================

function renderRaceList(tab) {
  const container = document.getElementById('race-list-container');
  const filtered = allRaces.filter((r) =>
    tab === 'world' ? r.is_world_major : r.country === 'KR'
  );

  if (filtered.length === 0) {
    container.innerHTML = '<p class="empty-msg">해당 대회 데이터가 없습니다.</p>';
    return;
  }

  container.innerHTML = `
    <div class="race-grid">
      ${filtered.map((race) => `
        <button class="race-card" onclick="selectRace('${race.race_id}')">
          <div class="race-card-top">
            <span class="race-flag">${countryFlag(race.country)}</span>
            <span class="race-badge ${race.is_world_major ? 'badge-world' : 'badge-domestic'}">
              ${race.is_world_major ? '세계 메이저' : '국내'}
            </span>
          </div>
          <h3 class="race-name">${race.race_name}</h3>
          <p class="race-meta">${race.city} · ${race.typical_month}월 · ${difficultyLabel(race.difficulty)}</p>
          <p class="race-hint">${race.shoe_priority_hint || ''}</p>
        </button>
      `).join('')}
    </div>`;
}

function countryFlag(country) {
  const flags = { KR: '🇰🇷', JP: '🇯🇵', DE: '🇩🇪', US: '🇺🇸', GB: '🇬🇧', FR: '🇫🇷', AU: '🇦🇺' };
  return flags[country] || '🏳️';
}

function difficultyLabel(d) {
  const labels = ['', '★☆☆☆☆ 쉬움', '★★☆☆☆ 보통', '★★★☆☆ 중간', '★★★★☆ 어려움', '★★★★★ 매우 어려움'];
  return labels[d] || '';
}

// ============================================================
// 대회 선택
// ============================================================

function selectRace(raceId) {
  selectedRace = allRaces.find((r) => r.race_id === raceId);
  if (!selectedRace) return;

  // 카드 선택 표시
  document.querySelectorAll('.race-card').forEach((el) => el.classList.remove('selected'));
  event.currentTarget.classList.add('selected');

  // 코스 정보 카드 표시
  const infoCard = document.getElementById('race-info-card');
  infoCard.innerHTML = `
    <h3>${selectedRace.race_name}</h3>
    <div class="race-info-grid">
      <div class="race-info-item"><span class="info-label">🌡 기온</span><span>${selectedRace.avg_temp_celsius}°C</span></div>
      <div class="race-info-item"><span class="info-label">🛣 노면</span><span>${surfaceLabel(selectedRace.surface_type)}</span></div>
      <div class="race-info-item"><span class="info-label">⛰ 고도</span><span>${selectedRace.elevation_gain_m}m</span></div>
      <div class="race-info-item"><span class="info-label">🎯 난이도</span><span>${difficultyLabel(selectedRace.difficulty)}</span></div>
    </div>
    <p class="race-course-summary">${selectedRace.course_summary}</p>
    <p class="race-hint-text">권장 키워드: <strong>${selectedRace.shoe_priority_hint}</strong></p>
  `;

  document.getElementById('race-detail').style.display = 'block';
  document.getElementById('race-detail').scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.getElementById('race-results-container').innerHTML = '';
  document.getElementById('race-actions').style.display = 'none';
}

function surfaceLabel(s) {
  return { asphalt: '아스팔트', mixed: '혼합', trail: '트레일' }[s] || s;
}

// ============================================================
// 대회 기반 추천 API 호출
// ============================================================

async function fetchRaceRecommendations() {
  if (!selectedRace) return;

  const courseType = document.querySelector('input[name="course_type"]:checked')?.value;
  if (!courseType) { showToast('코스 유형(하프/풀)을 선택해 주세요.'); return; }

  const btn = document.getElementById('recommend-race-btn');
  btn.disabled = true; btn.textContent = '분석 중...';

  showLoading(true, 'AI가 코스에 맞는 신발을 분석 중...');

  // 선택적 개인 조건
  const footWidth = document.querySelector('input[name="foot_width"]:checked')?.value;
  const budget = document.querySelector('input[name="race_budget"]:checked')?.value;
  const userProfile = footWidth ? { foot_width: footWidth, budget: budget || null } : null;

  let data;
  try {
    const res = await fetch(`${API_BASE}/api/recommend/race`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        race_id: selectedRace.race_id,
        course_type: courseType,
        user_profile: userProfile,
      }),
    });
    data = await res.json();
    if (!res.ok) throw new Error(data.message || `서버 오류 (HTTP ${res.status})`);
  } catch (err) {
    showLoading(false);
    document.getElementById('race-results-container').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <h2>추천을 불러올 수 없습니다</h2>
        <p>${err.message}</p>
        <button onclick="fetchRaceRecommendations()" class="btn-primary">다시 시도</button>
      </div>`;
    btn.disabled = false; btn.textContent = '이 코스에 맞는 신발 추천받기 →';
    return;
  }

  showLoading(false);
  btn.disabled = false; btn.textContent = '이 코스에 맞는 신발 추천받기 →';

  if (data.status === 'no_match') {
    document.getElementById('race-results-container').innerHTML = `
      <div class="empty-state"><div class="empty-icon">🔍</div>
        <h2>맞는 신발이 없습니다</h2><p>${data.message}</p></div>`;
    return;
  }

  renderRaceResults(data.recommendations);
  document.getElementById('race-actions').style.display = 'flex';
  document.getElementById('race-results-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderRaceResults(recs) {
  const container = document.getElementById('race-results-container');
  container.innerHTML =
    `<h2 class="section-title">코스 최적 러닝화 TOP ${recs.length}</h2>` +
    recs.map((shoe, i) => `
      <article class="rec-card rank-${i + 1}">
        <div class="rec-rank">#${i + 1}</div>
        <div class="rec-body">
          <div class="rec-header">
            <h3>${shoe.brand} <span class="rec-name">${shoe.goods_name}</span></h3>
            <div class="rec-score">매칭 ${shoe.match_score}%</div>
          </div>
          <div class="rec-tags">
            ${shoe.width ? `<span class="feature-tag">발볼 ${shoe.width}</span>` : ''}
            ${shoe.cushion ? `<span class="feature-tag">쿠션 ${shoe.cushion}/5</span>` : ''}
            ${shoe.weight ? `<span class="feature-tag">무게 ${shoe.weight}/5</span>` : ''}
            ${shoe.is_fallback ? '<span class="badge badge-medium">빠른 추천</span>' : ''}
          </div>
          <p class="rec-reason">💬 ${shoe.reason || ''}</p>
          <div class="rec-footer">
            <span class="rec-price">₩${Number(shoe.price || 0).toLocaleString()}</span>
            ${shoe.url ? `<a href="${shoe.url}" target="_blank" class="btn-musinsa">무신사에서 보기 →</a>` : ''}
          </div>
        </div>
      </article>`).join('');
}

// ============================================================
// 리셋
// ============================================================

function resetRaceSelection() {
  selectedRace = null;
  document.getElementById('race-detail').style.display = 'none';
  document.getElementById('race-results-container').innerHTML = '';
  document.getElementById('race-actions').style.display = 'none';
  document.querySelectorAll('.race-card').forEach((el) => el.classList.remove('selected'));
}

// ============================================================
// 공통 유틸
// ============================================================

function showLoading(on, message) {
  const overlay = document.getElementById('loading-overlay');
  if (!overlay) return;
  overlay.style.display = on ? 'flex' : 'none';
  if (message) {
    const msg = document.getElementById('loading-message');
    if (msg) msg.textContent = message;
  }
}

function showToast(message, duration = 2000) {
  let toast = document.getElementById('toast-message');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast-message';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, duration);
}

init();
