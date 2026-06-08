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

function getCachedData(key) {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function setCacheData(key, data) {
  try { sessionStorage.setItem(key, JSON.stringify(data)); } catch {}
}

// ============================================================
// 초기화
// ============================================================

async function init() {
  await fetchRaces();
}

// ============================================================
// 대회 목록 API 호출
// ============================================================

async function fetchRaces() {
  const cached = getCachedData('races_cache');
  if (cached) {
    allRaces = cached.races || [];
    renderRaceList(currentTab);
    return;
  }
  showLoading(true, '대회 정보를 불러오는 중...');
  try {
    const res = await fetch(`${API_BASE}/api/races`);
    const data = await res.json();
    if (!res.ok || data.status === 'error') throw new Error(data.message);
    allRaces = data.races || [];
    setCacheData('races_cache', data); // 세션 내 재방문 시 즉시 렌더링
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
    <div class="race-list">
      ${filtered.map((race) => `
        <button class="race-card" onclick="selectRace('${race.race_id}', this)">
          <span class="race-flag">${countryFlag(race.country)}</span>
          <div class="race-card-content">
            <div class="race-card-row">
              <span class="race-name">${race.race_name}</span>
              <span class="race-badge ${race.is_world_major ? 'badge-world' : 'badge-domestic'}">
                ${race.is_world_major ? '세계 메이저' : '국내'}
              </span>
            </div>
            <p class="race-meta">${race.city} · ${race.typical_month}월 · ${difficultyLabel(race.difficulty)}</p>
            <p class="race-hint">${race.shoe_priority_hint || ''}</p>
          </div>
          <span class="race-chevron">›</span>
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

function selectRace(raceId, cardEl) {
  // 기존 인라인 패널 제거
  document.querySelectorAll('.race-detail-panel').forEach((el) => el.remove());

  // 같은 카드 재클릭 → 토글 닫기
  if (selectedRace && selectedRace.race_id === raceId) {
    selectedRace = null;
    document.querySelectorAll('.race-card').forEach((el) => el.classList.remove('selected'));
    return;
  }

  selectedRace = allRaces.find((r) => r.race_id === raceId);
  if (!selectedRace) return;

  // 카드 선택 표시
  document.querySelectorAll('.race-card').forEach((el) => el.classList.remove('selected'));
  cardEl.classList.add('selected');

  // 인라인 패널 생성 후 카드 바로 다음에 삽입
  const panel = document.createElement('div');
  panel.className = 'race-detail-panel';
  panel.innerHTML = buildDetailPanelHTML(selectedRace);
  cardEl.insertAdjacentElement('afterend', panel);

  // 패널 내 라디오 change 이벤트 바인딩
  panel.querySelectorAll('.option-btn input').forEach((input) => {
    input.addEventListener('change', () => {
      const name = input.name;
      panel.querySelectorAll(`.option-btn input[name="${name}"]`)
        .forEach((el) => el.closest('.option-btn').classList.remove('selected'));
      input.closest('.option-btn').classList.add('selected');
    });
  });

}

function buildDetailPanelHTML(race) {
  return `
    <div class="race-info-card">
      <h3>${race.race_name}</h3>
      <div class="race-info-grid">
        <div class="race-info-item"><span class="info-label">🌡 기온</span><span>${race.avg_temp_celsius}°C</span></div>
        <div class="race-info-item"><span class="info-label">🛣 노면</span><span>${surfaceLabel(race.surface_type)}</span></div>
        <div class="race-info-item"><span class="info-label">⛰ 고도</span><span>${race.elevation_gain_m}m</span></div>
        <div class="race-info-item"><span class="info-label">🎯 난이도</span><span>${difficultyLabel(race.difficulty)}</span></div>
      </div>
      <p class="race-course-summary">${race.course_summary}</p>
      <p class="race-hint-text">권장 키워드: <strong>${race.shoe_priority_hint}</strong></p>
    </div>

    <div class="question" style="margin-top:16px;">
      <h3>코스 유형 선택 <span class="required">*</span></h3>
      <div class="option-grid grid-2">
        <label class="option-btn">
          <input type="radio" name="course_type" value="half" />
          <span>🏃 하프 마라톤<br><small>21.0975km</small></span>
        </label>
        <label class="option-btn">
          <input type="radio" name="course_type" value="full" />
          <span>🏅 풀 마라톤<br><small>42.195km</small></span>
        </label>
      </div>
    </div>

    <details class="personal-toggle">
      <summary>내 발 조건도 함께 반영하기 (선택)</summary>
      <div class="personal-form">
        <div class="question">
          <h3>발볼 너비</h3>
          <div class="option-grid grid-3">
            <label class="option-btn"><input type="radio" name="foot_width" value="wide" /><span>넓음</span></label>
            <label class="option-btn"><input type="radio" name="foot_width" value="normal" /><span>보통</span></label>
            <label class="option-btn"><input type="radio" name="foot_width" value="narrow" /><span>좁음</span></label>
          </div>
        </div>
        <div class="question">
          <h3>예산 범위</h3>
          <div class="option-grid grid-4">
            <label class="option-btn"><input type="radio" name="race_budget" value="low" /><span>~7만원</span></label>
            <label class="option-btn"><input type="radio" name="race_budget" value="mid" /><span>7~12만원</span></label>
            <label class="option-btn"><input type="radio" name="race_budget" value="high" /><span>12~20만원</span></label>
            <label class="option-btn"><input type="radio" name="race_budget" value="premium" /><span>20만원+</span></label>
          </div>
        </div>
      </div>
    </details>

    <button id="recommend-race-btn" class="btn-submit" onclick="fetchRaceRecommendations()">
      이 코스에 맞는 신발 추천받기 →
    </button>

    <div id="inline-race-results"></div>

    <div id="inline-race-actions" class="actions" style="display:none;">
      <button onclick="resetRaceSelection()" class="btn-secondary">다른 대회 선택</button>
      <button onclick="location.href='diagnosis.html'" class="btn-secondary">내 맞춤 추천받기</button>
    </div>
  `;
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

  const resultsEl = document.getElementById('inline-race-results');
  const actionsEl = document.getElementById('inline-race-actions');

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
    if (resultsEl) resultsEl.innerHTML = `
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
    if (resultsEl) resultsEl.innerHTML = `
      <div class="empty-state"><div class="empty-icon">🔍</div>
        <h2>맞는 신발이 없습니다</h2><p>${data.message}</p></div>`;
    return;
  }

  renderRaceResults(data.recommendations);
  if (actionsEl) actionsEl.style.display = 'flex';
  if (resultsEl) resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function buildInstagramTags(shoe) {
  const tags = [];
  if (shoe.brand) tags.push(shoe.brand.replace(/\s+/g, ''));
  if (shoe.goods_name) {
    const firstWord = shoe.goods_name.split(/[\s\-\/\(]/)[0];
    if (firstWord && firstWord.length >= 2) tags.push(firstWord);
  }
  tags.push('러닝화');
  tags.push('러닝화추천');
  const distMap = { '단거리': '스피드러닝', '중거리': '중거리러닝', '장거리': '장거리러닝', '전거리': '데일리러닝', '마라톤': '마라톤' };
  if (shoe.distance && distMap[shoe.distance]) tags.push(distMap[shoe.distance]);
  if (shoe.has_carbon_plate) tags.push('카본플레이트');
  if (shoe.cushion >= 4) tags.push('쿠션화');
  if (shoe.weight <= 2) tags.push('경량화');
  return [...new Set(tags)].slice(0, 6);
}

function renderRaceResults(recs) {
  const container = document.getElementById('inline-race-results');
  container.innerHTML =
    `<h2 class="section-title">코스 최적 러닝화 TOP ${recs.length}</h2>` +
    recs.map((shoe, i) => {
      const rank = i + 1;
      const price = Number(shoe.price || 0).toLocaleString();

      const igTagsHtml = buildInstagramTags(shoe)
        .map((tag) => {
          const url = `https://www.instagram.com/explore/tags/${encodeURIComponent(tag)}/`;
          return `<a href="${url}" target="_blank" rel="noopener" class="feature-tag feature-tag--ig">#${tag}</a>`;
        }).join('');

      const thumbHtml = shoe.thumbnail
        ? `<img src="${shoe.thumbnail}" alt="${shoe.brand} ${shoe.goods_name}" class="rec-thumb-img"
             onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />
           <div class="rec-thumb-fallback" style="display:none">👟</div>`
        : `<div class="rec-thumb-fallback">👟</div>`;

      const fallbackBadge = shoe.is_fallback ? '<span class="badge badge-medium">빠른 추천</span>' : '';

      return `
        <article class="rec-card rank-${rank}">
          <div class="rec-rank">#${rank}</div>
          <div class="rec-body">
            <div class="rec-header">
              <div class="rec-header-text">
                <div class="rec-title-row">
                  <h3>${shoe.brand} <span class="rec-name">${shoe.goods_name}</span></h3>
                  <div class="rec-score">매칭 ${shoe.match_score}%</div>
                </div>
              </div>
              <div class="rec-thumbnail">${thumbHtml}</div>
            </div>
            <div class="rec-tags">
              ${shoe.width ? `<span class="feature-tag">발볼 ${shoe.width}</span>` : ''}
              ${shoe.cushion ? `<span class="feature-tag">쿠션 ${shoe.cushion}/5</span>` : ''}
              ${shoe.weight ? `<span class="feature-tag">무게 ${shoe.weight}/5</span>` : ''}
              ${shoe.distance ? `<span class="feature-tag">${shoe.distance}</span>` : ''}
              ${fallbackBadge}
            </div>
            <div class="rec-ig-tags">${igTagsHtml}</div>
            <p class="rec-reason">💬 ${shoe.reason || ''}</p>
            <div class="rec-footer">
              <span class="rec-price">₩${price}</span>
              ${shoe.url ? `<a href="${shoe.url}" target="_blank" class="btn-musinsa">무신사에서 보기 →</a>` : ''}
            </div>
          </div>
        </article>`;
    }).join('');
}

// ============================================================
// 리셋
// ============================================================

function resetRaceSelection() {
  selectedRace = null;
  document.querySelectorAll('.race-detail-panel').forEach((el) => el.remove());
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
