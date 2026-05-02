/**
 * RunFit ??寃곌낵 ?섏씠吏 ?뚮뜑留? * result.html?먯꽌 ?ъ슜
 */

const PROFILE_LABELS = {
  running_distance: {
    short: '5km ?댄븯 議곌퉭',
    medium: '5~10km ?쇰컲 ?덈젴',
    long: '10~21km ?κ굅由?,
    marathon: '21km+ 留덈씪??,
  },
  foot_width: { wide: '?볦쓬', normal: '蹂댄넻', narrow: '醫곸쓬' },
  budget: {
    low: '~7留뚯썝',
    mid: '7~12留뚯썝',
    high: '12~20留뚯썝',
    premium: '20留뚯썝+',
  },
  priorities: {
    speed: '???띾룄媛?,
    protection: '?썳截?遺??諛⑹?',
    comfort: '?뭷 ?몄븞??,
    breathability: '?뙩截??듦린??,
    design: '???붿옄??,
  },
};

let currentRecommendations = [];

// ============================================================
// 硫붿씤 ?먮쫫
// ============================================================
async function init() {
  const profileRaw = sessionStorage.getItem('user_profile');
  if (!profileRaw) {
    location.href = 'index.html';
    return;
  }
  const profile = JSON.parse(profileRaw);

  renderProfileSummary(profile);

  // CEO Critical Fix #2: fetch ?ㅽ뙣 泥섎━
  let products;
  try {
    const response = await fetch('product_profiles.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    products = await response.json();
  } catch (err) {
    renderError(`?곹뭹 ?곗씠?곕? 遺덈윭?????놁뼱?? (${err.message})`);
    return;
  }

  if (!products || products.length === 0) {
    renderError('?곹뭹 ?곗씠?곌? 鍮꾩뼱?덉뼱??');
    return;
  }

  currentRecommendations = getRecommendations(profile, products);
  renderResults(currentRecommendations, profile);
}

// ============================================================
// ?꾨줈???붿빟
// ============================================================
function renderProfileSummary(profile) {
  const el = document.getElementById('profile-summary');
  const dist = PROFILE_LABELS.running_distance[profile.running_distance] || '?';
  const width = PROFILE_LABELS.foot_width[profile.foot_width] || '?';
  const budget = PROFILE_LABELS.budget[profile.budget] || '?곴??놁쓬';
  const priorities = (profile.priorities || [])
    .map((p) => PROFILE_LABELS.priorities[p])
    .join(' ');

  el.innerHTML = `
    <h2>?뱀떊???щ떇 ?꾨줈??/h2>
    <div class="profile-tags">
      <span class="tag">?룂 ${dist}</span>
      <span class="tag">?몿 諛쒕낵 ${width}</span>
      <span class="tag">?곻툘 荑좎뀡 ${profile.preferred_cushion}/5</span>
      <span class="tag">?뮥 ${budget}</span>
      ${priorities ? `<span class="tag">${priorities}</span>` : ''}
    </div>
  `;
}

// ============================================================
// 寃곌낵 ?뚮뜑 (CEO 鍮??곹깭 UI ?ы븿)
// ============================================================
function renderResults(recs, profile) {
  const container = document.getElementById('results-container');

  // 紐⑤뱺 ?먯닔媛 30 誘몃쭔?대㈃ 留ㅼ묶 ?ㅽ뙣濡?媛꾩＜
  const goodMatches = recs.filter((r) => r.match_score >= 30);

  if (goodMatches.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">?쨺</div>
        <h2>??留욌뒗 異붿쿇???놁뼱??/h2>
        <p>議곌굔??議곌툑 ?꾪솕?댁꽌 ?ㅼ떆 ?쒕룄??蹂댁떆寃좎뼱??</p>
        <ul class="hint-list">
          <li>?덉궛 踰붿쐞瑜??볧? 蹂댁꽭??/li>
          <li>諛쒕낵 ?좏삎??'蹂댄넻'?쇰줈 ?쒕룄??蹂댁꽭??/li>
          <li>以묒슂 ?붿냼瑜?1~2媛쒕줈 以꾩뿬 蹂댁꽭??/li>
        </ul>
        <button onclick="location.href='index.html'" class="btn-primary">?ㅼ떆 吏꾨떒?섍린</button>
      </div>
    `;
    return;
  }

  container.innerHTML =
    '<h2 class="section-title">?렞 異붿쿇 ?щ떇??TOP ' + goodMatches.length + '</h2>' +
    goodMatches.map((shoe, i) => renderRecommendationCard(shoe, i + 1)).join('');

  // 鍮꾧탳 踰꾪듉 ?쒖떆 (TOP2 ?댁긽 ?덉쓣 ??
  if (goodMatches.length >= 2) {
    document.getElementById('compare-btn').style.display = 'inline-block';
    document.getElementById('compare-btn').onclick = () => openCompareModal(goodMatches);
  }
}

function renderRecommendationCard(shoe, rank) {
  const price = parseInt(shoe.price).toLocaleString();
  const confidenceBadge =
    shoe.confidence === 'high'
      ? '<span class="badge badge-high">?좊ː???믪쓬</span>'
      : shoe.confidence === 'medium'
      ? '<span class="badge badge-medium">?좊ː??蹂댄넻</span>'
      : '<span class="badge badge-low">?좊ː????쓬</span>';

  return `
    <article class="rec-card rank-${rank}">
      <div class="rec-rank">#${rank}</div>
      <div class="rec-body">
        <div class="rec-header">
          <h3>${shoe.brand} <span class="rec-name">${shoe.goods_name}</span></h3>
          <div class="rec-score">留ㅼ묶 ${shoe.match_score}??/div>
        </div>
        <p class="rec-summary">${shoe.summary || ''}</p>
        <div class="rec-tags">
          ${shoe.width ? `<span class="feature-tag">諛쒕낵 ${shoe.width}</span>` : ''}
          ${shoe.cushion ? `<span class="feature-tag">荑좎뀡 ${shoe.cushion}/5</span>` : ''}
          ${shoe.weight ? `<span class="feature-tag">臾닿쾶 ${shoe.weight}/5</span>` : ''}
          ${shoe.distance ? `<span class="feature-tag">${shoe.distance}</span>` : ''}
          ${confidenceBadge}
        </div>
        <p class="rec-reason">?뮕 ${shoe.reason}</p>
        <div class="rec-footer">
          <span class="rec-price">${price}??/span>
          <a href="${shoe.url}" target="_blank" class="btn-musinsa">臾댁떊?ъ뿉??蹂닿린 ??/a>
        </div>
      </div>
    </article>
  `;
}

// ============================================================
// 鍮꾧탳 紐⑤떖
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
  // 諛⑹뼱 泥섎━: b媛 ?놁쓣 ??  if (!a || !b) return '<p>鍮꾧탳???좊컻??遺議깊빐??</p>';

  const rows = [
    ['釉뚮옖??, a.brand, b.brand],
    ['紐⑤뜽', a.goods_name, b.goods_name],
    ['留ㅼ묶 ?먯닔', `${a.match_score}??, `${b.match_score}??],
    ['媛寃?, `${parseInt(a.price).toLocaleString()}??, `${parseInt(b.price).toLocaleString()}??],
    ['諛쒕낵', a.width || '-', b.width || '-'],
    ['荑좎뀡媛?, a.cushion ? `${a.cushion}/5` : '-', b.cushion ? `${b.cushion}/5` : '-'],
    ['臾닿쾶媛?, a.weight ? `${a.weight}/5` : '-', b.weight ? `${b.weight}/5` : '-'],
    ['?곹빀 嫄곕━', a.distance || '-', b.distance || '-'],
    ['?듦린??, a.breathability ? `${a.breathability}/5` : '-', b.breathability ? `${b.breathability}/5` : '-'],
    ['李⑺솕媛?, a.fit ? `${a.fit}/5` : '-', b.fit ? `${b.fit}/5` : '-'],
  ];

  return `
    <table class="compare-table">
      <thead>
        <tr>
          <th>?띿꽦</th>
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

// 紐⑤떖 諛곌꼍 ?대┃ ???リ린
document.getElementById('compare-modal').addEventListener('click', (e) => {
  if (e.target.id === 'compare-modal') closeModal();
});

// ============================================================
// ?ㅻ쪟
// ============================================================
function renderError(message) {
  const container = document.getElementById('results-container');
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">?좑툘</div>
      <h2>?쇱떆?곸씤 ?ㅻ쪟媛 諛쒖깮?덉뼱??/h2>
      <p>${message}</p>
      <button onclick="location.reload()" class="btn-primary">?ㅼ떆 ?쒕룄</button>
    </div>
  `;
}

// ?쒖옉
init();
