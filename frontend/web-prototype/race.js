/**
 * 대회 코스 맞춤 추천 페이지 로직 (Feature 5)
 * race.html에서 사용
 */

const API_BASE = (window.location.protocol === 'file:' ||
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1')
  ? 'http://localhost:3000'
  : 'https://ai-evolution-team6-production.up.railway.app';

const COUNTRY_FLAG = { KR: '🇰🇷', JP: '🇯🇵', US: '🇺🇸', GB: '🇬🇧', DE: '🇩🇪', AU: '🇦🇺' };
const MONTH_KO = ['', '1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

let allRaces = [];
let selectedRace = null;
let selectedCourseType = null;
let personalizeEnabled = false;
let currentTab = 'KR';

// ============================================================
// 초기화
// ============================================================

async function init() {
  try {
    const res = await fetch(`${API_BASE}/api/races`);
    const data = await res.json();
    if (data.status === 'success') {
      allRaces = data.races;
    } else {
      showGridError('대회 목록을 불러오지 못했습니다.');
      return;
    }
  } catch (err) {
    showGridError('서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.');
    return;
  }

  // URL 파라미터로 대회 미리 선택
  const params = new URLSearchParams(window.location.search);
  const preselect = params.get('id');

  renderRaceGrid(currentTab);

  if (preselect) {
    const target = allRaces.find((r) => r.race_id === preselect);
    if (target) selectRace(target);
  }

  // 이전 Q1~Q7 프로필 확인
  const savedProfile = sessionStorage.getItem('user_profile');
  const toggle = document.getElementById('toggle-sub');
  if (!savedProfile && toggle) {
    toggle.textContent = '이전 Q1~Q7 답변이 없습니다 — 순수 코스 기반으로 추천합니다';
    document.getElementById('personalize-toggle').style.opacity = '0.5';
    document.getElementById('personalize-toggle').style.pointerEvents = 'none';
  }
}

// ============================================================
// 탭 전환
// ============================================================

function switchTab(tab) {
  currentTab = tab;
  document.getElementById('tab-kr').classList.toggle('active', tab === 'KR');
  document.getElementById('tab-world').classList.toggle('active', tab === 'WORLD');
  renderRaceGrid(tab);
  // 대회 재선택 초기화
  selectedRace = null;
  document.getElementById('course-section').style.display = 'none';
  document.getElementById('results-section').style.display = 'none';
}

// ============================================================
// 대회 그리드 렌더링
// ============================================================

function renderRaceGrid(tab) {
  const grid = document.getElementById('race-grid');
  let races;
  if (tab === 'WORLD') {
    races = allRaces.filter((r) => r.is_world_major);
  } else {
    races = allRaces.filter((r) => !r.is_world_major);
  }

  if (races.length === 0) {
    grid.innerHTML = '<p style="color:var(--text-light);font-size:14px;padding:16px 0;">데이터가 없습니다.</p>';
    return;
  }

  grid.innerHTML = races.map((race) => {
    const flag = COUNTRY_FLAG[race.country] || '🌐';
    const dots = [1,2,3,4,5].map((d) =>
      `<span class="diff-dot${d <= race.difficulty ? ' filled' : ''}"></span>`
    ).join('');
    const typeLabel = race.course_type === 'full' ? '풀' : '하프';
    return `
      <div class="race-card${selectedRace?.race_id === race.race_id ? ' active' : ''}"
           id="rc-${race.race_id}" onclick='selectRace(${JSON.stringify(race)})'>
        <span class="rc-flag">${flag}</span>
        <div class="rc-name">${race.race_name}</div>
        <div class="rc-meta">
          <span>${race.city}</span>
          <span>${MONTH_KO[race.typical_month]}</span>
          <span>${typeLabel}</span>
        </div>
        <div class="rc-diff-bar">${dots}</div>
      </div>`;
  }).join('');
}

// ============================================================
// 대회 선택
// ============================================================

function selectRace(race) {
  if (typeof race === 'string') race = JSON.parse(race);

  // 이전 선택 카드 비활성화
  if (selectedRace) {
    const prev = document.getElementById(`rc-${selectedRace.race_id}`);
    if (prev) prev.classList.remove('active');
  }

  selectedRace = race;
  selectedCourseType = race.course_type; // 기본값

  const card = document.getElementById(`rc-${race.race_id}`);
  if (card) card.classList.add('active');

  renderCourseDetail(race);
  document.getElementById('course-section').style.display = 'block';
  document.getElementById('results-section').style.display = 'none';

  // 부드럽게 스크롤
  document.getElementById('course-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ============================================================
// 코스 상세 렌더링
// ============================================================

function renderCourseDetail(race) {
  const flag = COUNTRY_FLAG[race.country] || '🌐';
  const diffLabel = ['', '매우 쉬움', '쉬움', '보통', '어려움', '매우 어려움'][race.difficulty] || '보통';
  const surfaceLabel = race.surface_type === 'asphalt' ? '아스팔트' : '혼합 노면';

  const hints = (race.shoe_priority_hint || '').split(',').map((s) =>
    `<span class="hint-tag">${s.trim()}</span>`
  ).join('');

  document.getElementById('course-detail').innerHTML = `
    <h3>${flag} ${race.race_name}</h3>
    <div class="course-stats">
      <div class="stat-item">
        <div class="stat-val">${race.avg_temp_celsius}°C</div>
        <div class="stat-lbl">평균 기온</div>
      </div>
      <div class="stat-item">
        <div class="stat-val">${race.elevation_gain_m}m</div>
        <div class="stat-lbl">누적 고도</div>
      </div>
      <div class="stat-item">
        <div class="stat-val">${diffLabel}</div>
        <div class="stat-lbl">난이도 (${race.difficulty}/5)</div>
      </div>
    </div>
    <div class="course-stats">
      <div class="stat-item">
        <div class="stat-val" style="font-size:14px;">${surfaceLabel}</div>
        <div class="stat-lbl">노면</div>
      </div>
      <div class="stat-item">
        <div class="stat-val" style="font-size:14px;">${MONTH_KO[race.typical_month]}</div>
        <div class="stat-lbl">개최 시기</div>
      </div>
      <div class="stat-item">
        <div class="stat-val" style="font-size:14px;">${race.course_type === 'full' ? '42.195km' : '21.0975km'}</div>
        <div class="stat-lbl">거리</div>
      </div>
    </div>
    <div class="course-summary-text">${race.course_summary}</div>
    <div style="font-size:12px;color:var(--text-light);margin-bottom:8px;">신발 선택 시 우선 고려</div>
    <div class="hint-tags">${hints}</div>
  `;

  // 코스 타입 선택 버튼 (기본적으로 시트의 course_type, 풀/하프 모두 지원 불가하면 비활성화)
  const ctRow = document.getElementById('course-type-row');
  ctRow.innerHTML = `
    <button class="ct-btn${race.course_type === 'full' || race.course_type === 'both' ? ' active' : ' active'}"
            id="ct-full" onclick="setCourseType('full')">
      풀코스 <small>(42km)</small>
    </button>
    <button class="ct-btn"
            id="ct-half" onclick="setCourseType('half')">
      하프코스 <small>(21km)</small>
    </button>
  `;

  // 기본 선택 반영
  setCourseType(race.course_type === 'half' ? 'half' : 'full');
}

function setCourseType(type) {
  selectedCourseType = type;
  document.getElementById('ct-full').classList.toggle('active', type === 'full');
  document.getElementById('ct-half').classList.toggle('active', type === 'half');
}

// ============================================================
// 개인화 토글
// ============================================================

function togglePersonalize() {
  const savedProfile = sessionStorage.getItem('user_profile');
  if (!savedProfile) return;
  personalizeEnabled = !personalizeEnabled;
  document.getElementById('toggle-switch').classList.toggle('on', personalizeEnabled);
}

// ============================================================
// 추천 API 호출
// ============================================================

async function fetchRaceRecommendation() {
  if (!selectedRace) return;

  const btn = document.getElementById('recommend-btn');
  btn.disabled = true;
  btn.textContent = '분석 중...';

  showLoading(true);

  let userProfile = null;
  if (personalizeEnabled) {
    try {
      const raw = sessionStorage.getItem('user_profile');
      if (raw) userProfile = JSON.parse(raw);
    } catch { /* 무시 */ }
  }

  const body = {
    race_id:     selectedRace.race_id,
    course_type: selectedCourseType,
    user_profile: userProfile,
  };

  let data;
  try {
    const res = await fetch(`${API_BASE}/api/recommend/race`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    data = await res.json();
    if (!res.ok) throw new Error(data.message || `서버 오류 (HTTP ${res.status})`);
  } catch (err) {
    showLoading(false);
    btn.disabled = false;
    btn.textContent = '이 코스에 맞는 신발 추천받기 →';
    renderResultError(err.message);
    return;
  }

  showLoading(false);
  btn.disabled = false;
  btn.textContent = '이 코스에 맞는 신발 추천받기 →';

  if (data.status === 'no_match') {
    renderResultNoMatch(data.message);
    return;
  }
  if (data.status !== 'success' || !data.recommendations?.length) {
    renderResultError(data.message || '추천 결과를 받지 못했습니다');
    return;
  }

  renderResults(data.recommendations, data.race);
}

// ============================================================
// 결과 렌더링
// ============================================================

function renderResults(recs, race) {
  const section = document.getElementById('results-section');
  const container = document.getElementById('results-container');

  container.innerHTML =
    `<h3>🏁 ${race.race_name} 추천 신발 TOP ${recs.length}</h3>` +
    recs.map((shoe, i) => renderCard(shoe, i + 1)).join('');

  section.style.display = 'block';
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });

  if (recs[0]?.is_fallback) {
    showToast('AI 분석 서버가 지연되어 코스 기반 추천 결과를 표시했습니다.', 4000);
  }
}

function renderCard(shoe, rank) {
  const price = parseInt(shoe.price).toLocaleString();
  const confidenceBadge =
    shoe.confidence === 'high'   ? '<span class="badge badge-high">신뢰도 높음</span>'   :
    shoe.confidence === 'medium' ? '<span class="badge badge-medium">신뢰도 보통</span>' :
                                   '<span class="badge badge-low">신뢰도 낮음</span>';
  return `
    <article class="rec-card rank-${rank}">
      <div class="rec-rank">#${rank}</div>
      <div class="rec-body">
        <div class="rec-header">
          <h3>${shoe.brand} <span class="rec-name">${shoe.goods_name}</span></h3>
          <div class="rec-score">매칭 ${shoe.match_score}%</div>
        </div>
        <p class="rec-summary">${shoe.summary || ''}</p>
        <div class="rec-tags">
          ${shoe.width        ? `<span class="feature-tag">발볼 ${shoe.width}</span>`          : ''}
          ${shoe.cushion      ? `<span class="feature-tag">쿠션 ${shoe.cushion}/5</span>`      : ''}
          ${shoe.weight       ? `<span class="feature-tag">무게 ${shoe.weight}/5</span>`       : ''}
          ${shoe.breathability? `<span class="feature-tag">통기성 ${shoe.breathability}/5</span>` : ''}
          ${confidenceBadge}
        </div>
        <p class="rec-reason">💬 ${shoe.reason || ''}</p>
        <div class="rec-footer">
          <span class="rec-price">₩${price}</span>
          <a href="${shoe.url}" target="_blank" class="btn-musinsa">무신사에서 보기 →</a>
        </div>
      </div>
    </article>`;
}

function renderResultError(message) {
  const section = document.getElementById('results-section');
  document.getElementById('results-container').innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">⚠️</div>
      <h2>일시적인 오류가 발생했습니다</h2>
      <p>${message}</p>
      <button onclick="fetchRaceRecommendation()" class="btn-primary">다시 시도</button>
    </div>`;
  section.style.display = 'block';
}

function renderResultNoMatch(message) {
  const section = document.getElementById('results-section');
  document.getElementById('results-container').innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">🔍</div>
      <h2>맞는 추천이 없습니다</h2>
      <p>${message}</p>
      <button onclick="location.href='index.html'" class="btn-primary">Q1~Q7로 직접 찾기</button>
    </div>`;
  section.style.display = 'block';
}

function showGridError(message) {
  document.getElementById('race-grid').innerHTML = `
    <div style="grid-column:1/-1;padding:20px 0;text-align:center;color:var(--text-light);font-size:14px;">
      ⚠️ ${message}
    </div>`;
}

function showLoading(on) {
  document.getElementById('loading-overlay').style.display = on ? 'flex' : 'none';
}

function showToast(message, duration = 2000) {
  let toast = document.getElementById('rf-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'rf-toast';
    toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:10px 20px;border-radius:8px;font-size:14px;z-index:9999;';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, duration);
}

init();
