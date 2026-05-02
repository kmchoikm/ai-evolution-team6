/**
 * RunFit — 결과 페이지 렌더링
 * result.html에서 사용
 */

const PROFILE_LABELS = {
  running_distance: {
    short: '5km 이하 조깅',
    medium: '5~10km 일반 훈련',
    long: '10~21km 장거리',
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
    speed: '⚡ 속도감',
    protection: '🛡️ 부상 방지',
    comfort: '💆 편안함',
    breathability: '🌬️ 통기성',
    design: '✨ 디자인',
  },
};

let currentRecommendations = [];

// ============================================================
// 메인 흐름
// ============================================================
async function init() {
  const profileRaw = sessionStorage.getItem('user_profile');
  if (!profileRaw) {
    location.href = 'index.html';
    return;
  }
  const profile = JSON.parse(profileRaw);

  renderProfileSummary(profile);

  // CEO Critical Fix #2: fetch 실패 처리
  let products;
  try {
    const response = await fetch('product_profiles.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    products = await response.json();
  } catch (err) {
    renderError(`상품 데이터를 불러올 수 없어요. (${err.message})`);
    return;
  }

  if (!products || products.length === 0) {
    renderError('상품 데이터가 비어있어요.');
    return;
  }

  currentRecommendations = getRecommendations(profile, products);
  renderResults(currentRecommendations, profile);
}

// ============================================================
// 프로필 요약
// ============================================================
function renderProfileSummary(profile) {
  const el = document.getElementById('profile-summary');
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
      <span class="tag">☁️ 쿠션 ${profile.preferred_cushion}/5</span>
      <span class="tag">💰 ${budget}</span>
      ${priorities ? `<span class="tag">${priorities}</span>` : ''}
    </div>
  `;
}

// ============================================================
// 결과 렌더 (CEO 빈 상태 UI 포함)
// ============================================================
function renderResults(recs, profile) {
  const container = document.getElementById('results-container');

  // 모든 점수가 30 미만이면 매칭 실패로 간주
  const goodMatches = recs.filter((r) => r.match_score >= 30);

  if (goodMatches.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🤔</div>
        <h2>딱 맞는 추천이 없어요</h2>
        <p>조건을 조금 완화해서 다시 시도해 보시겠어요?</p>
        <ul class="hint-list">
          <li>예산 범위를 넓혀 보세요</li>
          <li>발볼 유형을 '보통'으로 시도해 보세요</li>
          <li>중요 요소를 1~2개로 줄여 보세요</li>
        </ul>
        <button onclick="location.href='index.html'" class="btn-primary">다시 진단하기</button>
      </div>
    `;
    return;
  }

  container.innerHTML =
    '<h2 class="section-title">🎯 추천 러닝화 TOP ' + goodMatches.length + '</h2>' +
    goodMatches.map((shoe, i) => renderRecommendationCard(shoe, i + 1)).join('');

  // 비교 버튼 표시 (TOP2 이상 있을 때)
  if (goodMatches.length >= 2) {
    document.getElementById('compare-btn').style.display = 'inline-block';
    document.getElementById('compare-btn').onclick = () => openCompareModal(goodMatches);
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
          <div class="rec-score">매칭 ${shoe.match_score}점</div>
        </div>
        <p class="rec-summary">${shoe.summary || ''}</p>
        <div class="rec-tags">
          ${shoe.width ? `<span class="feature-tag">발볼 ${shoe.width}</span>` : ''}
          ${shoe.cushion ? `<span class="feature-tag">쿠션 ${shoe.cushion}/5</span>` : ''}
          ${shoe.weight ? `<span class="feature-tag">무게 ${shoe.weight}/5</span>` : ''}
          ${shoe.distance ? `<span class="feature-tag">${shoe.distance}</span>` : ''}
          ${confidenceBadge}
        </div>
        <p class="rec-reason">💡 ${shoe.reason}</p>
        <div class="rec-footer">
          <span class="rec-price">${price}원</span>
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
  const a = recs[0];
  const b = recs[1];
  const tableEl = document.getElementById('compare-table');
  tableEl.innerHTML = renderCompareTable(a, b);
  document.getElementById('compare-modal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('compare-modal').style.display = 'none';
}

function renderCompareTable(a, b) {
  // 방어 처리: b가 없을 때
  if (!a || !b) return '<p>비교할 신발이 부족해요.</p>';

  const rows = [
    ['브랜드', a.brand, b.brand],
    ['모델', a.goods_name, b.goods_name],
    ['매칭 점수', `${a.match_score}점`, `${b.match_score}점`],
    ['가격', `${parseInt(a.price).toLocaleString()}원`, `${parseInt(b.price).toLocaleString()}원`],
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

// 모달 배경 클릭 시 닫기
document.getElementById('compare-modal').addEventListener('click', (e) => {
  if (e.target.id === 'compare-modal') closeModal();
});

// ============================================================
// 오류
// ============================================================
function renderError(message) {
  const container = document.getElementById('results-container');
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">⚠️</div>
      <h2>일시적인 오류가 발생했어요</h2>
      <p>${message}</p>
      <button onclick="location.reload()" class="btn-primary">다시 시도</button>
    </div>
  `;
}

// 시작
init();
