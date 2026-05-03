/**
 * RunFit 결과 페이지 렌더링 로직
 * result.html에서 사용 — 백엔드 /api/recommend 연동
 */

// 백엔드 URL: 로컬 개발이면 localhost:3000, 프로덕션이면 실제 서버 주소로 변경
// 로컬 개발: localhost:3000, 프로덕션: Railway 백엔드
const API_BASE = (window.location.protocol === 'file:' ||
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1')
  ? 'http://localhost:3000'
  : 'https://ai-evolution-team6-production.up.railway.app';

const PROFILE_LABELS = {
  running_distance: {
    short: '5km 이하 조깅',
    medium: '5~10km 일반 훈련',
    long: '10~21km 장거리 훈련',
    marathon: '21km+ 마라톤',
  },
  foot_width: { wide: '넓음', normal: '보통', narrow: '좁음' },
  budget: {
    low: '~7만원',
    mid: '7~12만원',
    high: '12~20만원',
    premium: '20만원+',
  },
  priorities: {
    speed: '속도감/경량',
    protection: '부상 방지',
    comfort: '편안함',
    breathability: '통기성',
    design: '디자인',
  },
};

let currentRecommendations = [];

// ============================================================
// 메인 초기화
// ============================================================

async function init() {
  const profileRaw = sessionStorage.getItem('user_profile');
  if (!profileRaw) {
    location.href = 'index.html';
    return;
  }

  let profile;
  try {
    profile = JSON.parse(profileRaw);
  } catch {
    location.href = 'index.html';
    return;
  }

  renderProfileSummary(profile);
  await fetchAndRenderRecommendations(profile);
}

// ============================================================
// 백엔드 API 호출
// ============================================================

async function fetchAndRenderRecommendations(profile) {
  showLoading(true);

  let data;
  try {
    const res = await fetch(`${API_BASE}/api/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_profile: profile }),
    });

    data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || `서버 오류 (HTTP ${res.status})`);
    }
  } catch (err) {
    showLoading(false);
    renderError(err.message || '추천을 불러올 수 없습니다');
    return;
  }

  showLoading(false);

  if (data.status === 'no_match') {
    renderNoMatch(data.message);
    return;
  }

  if (data.status !== 'success' || !data.recommendations?.length) {
    renderError(data.message || '추천 결과를 받지 못했습니다');
    return;
  }

  currentRecommendations = data.recommendations;
  renderResults(currentRecommendations);

  // 폴백 여부 안내 (D1 투명성)
  if (currentRecommendations[0]?.is_fallback) {
    showToast('AI 분석 서버가 지연되어 빠른 추천 결과를 표시했습니다.', 4000);
  }
}

// ============================================================
// 로딩 토글
// ============================================================

function showLoading(on) {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.style.display = on ? 'flex' : 'none';
}

// ============================================================
// 프로필 요약
// ============================================================

function renderProfileSummary(profile) {
  const el = document.getElementById('profile-summary');
  if (!el) return;

  const dist = PROFILE_LABELS.running_distance[profile.running_distance] || '?';
  const width = PROFILE_LABELS.foot_width[profile.foot_width] || '?';
  const budget = PROFILE_LABELS.budget[profile.budget] || '상관없음';
  const priorities = (profile.priorities || [])
    .map((p) => PROFILE_LABELS.priorities[p])
    .join(' ');

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
// 결과 렌더링
// ============================================================

function renderResults(recs) {
  const container = document.getElementById('results-container');
  if (!container) return;

  const goodMatches = recs.filter((r) => r.match_score >= 30);

  if (goodMatches.length === 0) {
    renderNoMatch('매칭 점수 30점 미만 — 조건을 조정해 보세요');
    return;
  }

  container.innerHTML =
    `<h2 class="section-title">최고 추천 러닝화 TOP ${goodMatches.length}</h2>` +
    goodMatches.map((shoe, i) => renderRecommendationCard(shoe, i + 1)).join('');

  if (goodMatches.length >= 2) {
    const btn = document.getElementById('compare-btn');
    if (btn) {
      btn.style.display = 'inline-block';
      btn.onclick = () => openCompareModal(goodMatches);
    }
  }
}

function renderRecommendationCard(shoe, rank) {
  const price = parseInt(shoe.price).toLocaleString();
  const confidenceBadge =
    shoe.confidence === 'high'
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
          <a href="${shoe.url}" target="_blank" class="btn-musinsa">무신사에서 보기 →</a>
        </div>
      </div>
    </article>
  `;
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
    ['가격', `₩${parseInt(a.price).toLocaleString()}`, `₩${parseInt(b.price).toLocaleString()}`],
    ['발볼', a.width || '-', b.width || '-'],
    ['쿠션감', a.cushion ? `${a.cushion}/5` : '-', b.cushion ? `${b.cushion}/5` : '-'],
    ['무게감', a.weight ? `${a.weight}/5` : '-', b.weight ? `${b.weight}/5` : '-'],
    ['적합 거리', a.distance || '-', b.distance || '-'],
    ['통기성', a.breathability ? `${a.breathability}/5` : '-', b.breathability ? `${b.breathability}/5` : '-'],
    ['착화감', a.fit ? `${a.fit}/5` : '-', b.fit ? `${b.fit}/5` : '-'],
  ];

  return `
    <table class="compare-table">
      <thead>
        <tr>
          <th>속성</th>
          <th class="col-a">#1 ${a.brand}</th>
          <th class="col-b">#2 ${b.brand}</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(([label, va, vb]) => `
          <tr>
            <th>${label}</th>
            <td class="${va !== vb ? 'diff' : ''}">${va}</td>
            <td class="${va !== vb ? 'diff' : ''}">${vb}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

const modal = document.getElementById('compare-modal');
if (modal) {
  modal.addEventListener('click', (e) => {
    if (e.target.id === 'compare-modal') closeModal();
  });
}

// ============================================================
// 에러 / 매칭 없음 / 토스트
// ============================================================

function renderError(message) {
  const container = document.getElementById('results-container');
  if (!container) return;
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">⚠️</div>
      <h2>일시적인 오류가 발생했습니다</h2>
      <p>${message}</p>
      <button onclick="location.reload()" class="btn-primary">다시 시도</button>
    </div>
  `;
}

function renderNoMatch(message) {
  const container = document.getElementById('results-container');
  if (!container) return;
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">🔍</div>
      <h2>맞는 추천이 없습니다</h2>
      <p>${message}</p>
      <ul class="hint-list">
        <li>예산 범위를 넓혀 보세요</li>
        <li>발볼 유형을 '보통'으로 바꿔 보세요</li>
        <li>중요 요소를 1~2개로 줄여 보세요</li>
      </ul>
      <button onclick="location.href='index.html'" class="btn-primary">다시 진단하기</button>
    </div>
  `;
}

function showToast(message, duration = 2000) {
  let toast = document.getElementById('toast-message');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast-message';
    toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:10px 20px;border-radius:8px;font-size:14px;z-index:9999;';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, duration);
}

// 시작
init();
