/**
 * RunFit 결과 페이지 렌더링 로직
 * result.html 전용 — /api/recommend, /api/recommend/socks, /api/recommend/outfit 연동
 */

const API_BASE = (window.location.protocol === 'file:' ||
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1')
  ? 'http://localhost:3000'
  : 'https://ai-evolution-team6-production.up.railway.app';

const PROFILE_LABELS = {
  running_distance: {
    short: '5km 이하 조깅', medium: '5~10km 일반 훈련',
    long: '10~21km 장거리 훈련', marathon: '21km+ 마라톤',
  },
  foot_width: { wide: '넓음', normal: '보통', narrow: '좁음' },
  budget: { low: '~7만원', mid: '7~12만원', high: '12~20만원', premium: '20만원+' },
  priorities: {
    speed: '속도감/경량', protection: '부상 방지',
    comfort: '편안함', breathability: '통기성', design: '디자인',
  },
};

let currentRecommendations = [];
let selectedSockColor = null;

// ============================================================
// 메인 초기화
// ============================================================

async function init() {
  const profileRaw = sessionStorage.getItem('user_profile');
  if (!profileRaw) { location.href = 'index.html'; return; }

  let profile;
  try { profile = JSON.parse(profileRaw); }
  catch { location.href = 'index.html'; return; }

  renderProfileSummary(profile);
  await fetchAndRenderRecommendations(profile);
}

// ============================================================
// 추천 API 호출
// ============================================================

async function fetchAndRenderRecommendations(profile) {
  showLoading(true, 'AI가 최적의 러닝화를 찾고 있어요...');

  let data;
  try {
    const res = await fetch(`${API_BASE}/api/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_profile: profile }),
    });
    data = await res.json();
    if (!res.ok) throw new Error(data.message || `서버 오류 (HTTP ${res.status})`);
  } catch (err) {
    showLoading(false);
    renderError(err.message || '추천을 불러올 수 없습니다.');
    return;
  }

  showLoading(false);

  if (data.status === 'no_match') { renderNoMatch(data.message); return; }
  if (data.status !== 'success' || !data.recommendations?.length) {
    renderError(data.message || '추천 결과를 받지 못했습니다.'); return;
  }

  currentRecommendations = data.recommendations;
  renderResults(currentRecommendations);

  if (currentRecommendations[0]?.is_fallback) {
    showToast('AI 분석 서버가 지연되어 빠른 추천 결과를 표시했습니다.', 4000);
  }
}

// ============================================================
// 로딩 토글
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

// ============================================================
// 프로필 요약 태그
// ============================================================

function renderProfileSummary(profile) {
  const el = document.getElementById('profile-summary');
  if (!el) return;
  const dist = PROFILE_LABELS.running_distance[profile.running_distance] || '?';
  const width = PROFILE_LABELS.foot_width[profile.foot_width] || '?';
  const budget = PROFILE_LABELS.budget[profile.budget] || '상관없음';
  const priorities = (profile.priorities || []).map((p) => PROFILE_LABELS.priorities[p]).join(' ');
  el.innerHTML = `
    <h2>당신의 러닝 프로필</h2>
    <div class="profile-tags">
      <span class="tag">🏃 ${dist}</span>
      <span class="tag">👣 발볼 ${width}</span>
      <span class="tag">🛠️ 쿠션 ${profile.preferred_cushion || 3}/5</span>
      <span class="tag">💰 ${budget}</span>
      ${priorities ? `<span class="tag">${priorities}</span>` : ''}
    </div>
  `;
}

// ============================================================
// 추천 결과 렌더링
// ============================================================

function renderResults(recs) {
  const container = document.getElementById('results-container');
  if (!container) return;

  const goodMatches = recs.filter((r) => r.match_score >= 30);
  if (goodMatches.length === 0) {
    renderNoMatch('매칭 점수 30점 미만 — 조건을 조정해 보세요'); return;
  }

  container.innerHTML =
    `<h2 class="section-title">최고 추천 러닝화 TOP ${goodMatches.length}</h2>` +
    goodMatches.map((shoe, i) => renderRecommendationCard(shoe, i + 1)).join('');

  if (goodMatches.length >= 2) {
    const btn = document.getElementById('compare-btn');
    if (btn) { btn.style.display = 'inline-block'; btn.onclick = () => openCompareModal(goodMatches); }
  }

  // 양말 색상 섹션 활성화 (TOP 1에 색상 데이터가 있을 때)
  const top1 = goodMatches[0];
  if (top1?.main_color) {
    document.getElementById('socks-section').style.display = 'block';
    fetchAndRenderSocks(top1);
  }

  // 사이즈 가이드 링크 노출
  document.getElementById('size-link-section').style.display = 'block';
}

function renderRecommendationCard(shoe, rank) {
  const price = Number(shoe.price || 0).toLocaleString();
  const confidenceBadge = shoe.confidence === 'high'
    ? '<span class="badge badge-high">신뢰도 높음</span>'
    : shoe.confidence === 'medium'
    ? '<span class="badge badge-medium">신뢰도 보통</span>'
    : '<span class="badge badge-low">신뢰도 낮음</span>';

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
          ${shoe.width ? `<span class="feature-tag">발볼 ${shoe.width}</span>` : ''}
          ${shoe.cushion ? `<span class="feature-tag">쿠션 ${shoe.cushion}/5</span>` : ''}
          ${shoe.weight ? `<span class="feature-tag">무게 ${shoe.weight}/5</span>` : ''}
          ${shoe.distance ? `<span class="feature-tag">${shoe.distance}</span>` : ''}
          ${confidenceBadge}
        </div>
        <p class="rec-reason">💬 ${shoe.reason || ''}</p>
        <div class="rec-footer">
          <span class="rec-price">₩${price}</span>
          ${shoe.url ? `<a href="${shoe.url}" target="_blank" class="btn-musinsa">무신사에서 보기 →</a>` : ''}
        </div>
      </div>
    </article>
  `;
}

// ============================================================
// 양말 색상 추천
// ============================================================

async function fetchAndRenderSocks(shoe) {
  const container = document.getElementById('socks-container');
  if (!container) return;
  container.innerHTML = '<div class="socks-loading">양말 색상 분석 중...</div>';

  let data;
  try {
    const res = await fetch(`${API_BASE}/api/recommend/socks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        goods_no: shoe.goods_no,
        main_color: shoe.main_color,
        accent_color: shoe.accent_color || '',
      }),
    });
    data = await res.json();
    if (!res.ok || data.status !== 'success') throw new Error(data.message);
  } catch (err) {
    container.innerHTML = `<p class="socks-error">양말 색상 추천을 불러올 수 없습니다.</p>`;
    return;
  }

  container.innerHTML = `
    <div class="socks-grid">
      ${data.socks.map((sock) => `
        <button class="color-card" onclick="selectSock('${sock.color_name}', '${sock.hex_code}', '${shoe.goods_no}', '${shoe.main_color}', '${shoe.accent_color || ''}', this)">
          <div class="color-circle" style="background:${sock.hex_code};"></div>
          <p class="color-name">${sock.color_name}</p>
          <p class="color-reason">${sock.reason}</p>
        </button>
      `).join('')}
    </div>
    <p class="socks-hint">색상을 선택하면 전체 코디를 추천해드립니다 👆</p>
  `;
}

function selectSock(sockColor, sockHex, goodsNo, mainColor, accentColor, btnEl) {
  // 선택 표시
  document.querySelectorAll('.color-card').forEach((el) => el.classList.remove('selected'));
  btnEl.classList.add('selected');
  selectedSockColor = sockColor;

  fetchAndRenderOutfit(goodsNo, mainColor, accentColor, sockColor);
}

// ============================================================
// 러닝 코디 추천
// ============================================================

async function fetchAndRenderOutfit(goodsNo, mainColor, accentColor, sockColor) {
  const section = document.getElementById('outfit-section');
  const container = document.getElementById('outfit-container');
  const sub = document.getElementById('outfit-sub');
  if (!section || !container) return;

  section.style.display = 'block';
  if (sub) sub.textContent = `선택된 양말: ${sockColor}`;
  container.innerHTML = '<div class="socks-loading">코디 조합 분석 중...</div>';
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });

  let data;
  try {
    const res = await fetch(`${API_BASE}/api/recommend/outfit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goods_no: goodsNo, main_color: mainColor, accent_color: accentColor || '', sock_color: sockColor }),
    });
    data = await res.json();
    if (!res.ok || data.status !== 'success') throw new Error(data.message);
  } catch (err) {
    container.innerHTML = `<p class="socks-error">코디 추천을 불러올 수 없습니다.</p>`;
    return;
  }

  container.innerHTML = data.outfit.map((item) => `
    <div class="outfit-item">
      <h3 class="outfit-item-title">${item.item}</h3>
      <div class="socks-grid">
        ${item.suggestions.map((s) => `
          <div class="color-card">
            <div class="color-circle" style="background:${s.hex_code};"></div>
            <p class="color-name">${s.color_name}</p>
            <p class="color-reason">${s.reason}</p>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

// ============================================================
// 비교 모달
// ============================================================

function openCompareModal(recs) {
  const tableEl = document.getElementById('compare-table');
  if (tableEl) tableEl.innerHTML = renderCompareTable(recs[0], recs[1]);
  const modal = document.getElementById('compare-modal');
  if (modal) modal.style.display = 'flex';
}

function closeModal() {
  const modal = document.getElementById('compare-modal');
  if (modal) modal.style.display = 'none';
}

function renderCompareTable(a, b) {
  if (!a || !b) return '<p>비교할 신발이 부족합니다</p>';
  const rows = [
    ['브랜드', a.brand, b.brand],
    ['모델', a.goods_name, b.goods_name],
    ['매칭 점수', `${a.match_score}%`, `${b.match_score}%`],
    ['가격', `₩${Number(a.price).toLocaleString()}`, `₩${Number(b.price).toLocaleString()}`],
    ['발볼', a.width || '-', b.width || '-'],
    ['쿠션감', a.cushion ? `${a.cushion}/5` : '-', b.cushion ? `${b.cushion}/5` : '-'],
    ['무게감', a.weight ? `${a.weight}/5` : '-', b.weight ? `${b.weight}/5` : '-'],
    ['적합 거리', a.distance || '-', b.distance || '-'],
    ['통기성', a.breathability ? `${a.breathability}/5` : '-', b.breathability ? `${b.breathability}/5` : '-'],
    ['착화감', a.fit ? `${a.fit}/5` : '-', b.fit ? `${b.fit}/5` : '-'],
  ];
  return `
    <table class="compare-table">
      <thead><tr><th>속성</th><th class="col-a">#1 ${a.brand}</th><th class="col-b">#2 ${b.brand}</th></tr></thead>
      <tbody>
        ${rows.map(([label, va, vb]) => `
          <tr>
            <th>${label}</th>
            <td class="${va !== vb ? 'diff' : ''}">${va}</td>
            <td class="${va !== vb ? 'diff' : ''}">${vb}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

const modal = document.getElementById('compare-modal');
if (modal) modal.addEventListener('click', (e) => { if (e.target.id === 'compare-modal') closeModal(); });

// ============================================================
// 에러 / 빈 상태 / 토스트
// ============================================================

function renderError(message) {
  const c = document.getElementById('results-container');
  if (!c) return;
  c.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">⚠️</div>
      <h2>일시적인 오류가 발생했습니다</h2>
      <p>${message}</p>
      <button onclick="location.reload()" class="btn-primary">다시 시도</button>
    </div>`;
}

function renderNoMatch(message) {
  const c = document.getElementById('results-container');
  if (!c) return;
  c.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">🔍</div>
      <h2>맞는 추천이 없습니다</h2>
      <p>${message}</p>
      <ul class="hint-list">
        <li>예산 범위를 넓혀 보세요</li>
        <li>발볼 유형을 '보통'으로 바꿔 보세요</li>
        <li>중요 요소를 1~2개로 줄여 보세요</li>
      </ul>
      <button onclick="location.href='diagnosis.html'" class="btn-primary">다시 진단하기</button>
    </div>`;
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
