/**
 * RunFit 결과 페이지 — 2-Phase 스트리밍 추천
 *
 * Phase 1: POST /api/recommend/quick  — DB 스코어링만 (~1~2초), 오버레이 제거 후 카드 #1 즉시 표출
 * Phase 2: POST /api/recommend/ai-reasons — Claude AI 이유 생성 (~8~15초), 백그라운드 실행
 *          → 카드 #1 reason 업데이트 후 #2, #3… 순차 등장 (350ms 간격)
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

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ============================================================
// 개발자 테스트 패널 (localhost 전용)
// ============================================================

const IS_LOCAL = ['localhost', '127.0.0.1', ''].includes(window.location.hostname);

function initDevPanel() {
  if (!IS_LOCAL) return;
  const panel = document.getElementById('dev-panel');
  if (panel) panel.style.display = 'block';
}

function getTestShoes() {
  const mode = document.querySelector('input[name="test-mode"]:checked')?.value;
  if (mode === 'case-a') return [];
  if (mode === 'case-b') {
    return [
      { goods_no: 'TEST001', brand: '나이키', goods_name: '페가수스 41 (테스트)', price: 500000, width: '보통', cushion: 4, weight: 3, distance: '전거리', breathability: 4, fit: 4, toe_fit: 'all', summary: 'Case B 테스트용 — 예산 초과 신발' },
      { goods_no: 'TEST002', brand: '아식스', goods_name: '젤 카야노 31 (테스트)', price: 500000, width: '보통', cushion: 4, weight: 4, distance: '장거리', breathability: 3, fit: 5, toe_fit: 'egyptian', summary: 'Case B 테스트용 — 예산 초과 신발' },
      { goods_no: 'TEST003', brand: '호카', goods_name: '클리프턴 9 (테스트)', price: 500000, width: '넓음', cushion: 5, weight: 2, distance: '전거리', breathability: 4, fit: 5, toe_fit: 'roman,germanic', summary: 'Case B 테스트용 — 예산 초과 신발' },
    ];
  }
  return null;
}

async function devRetest() {
  const mode = document.querySelector('input[name="test-mode"]:checked')?.value;
  const badge = document.getElementById('dev-mode-badge');
  const labels = { normal: '✅ 정상 DB', 'case-a': '🔴 Case A: DB 없음', 'case-b': '🟡 Case B: 예산 초과' };
  if (badge) badge.textContent = `실행 중: ${labels[mode] || '?'}`;

  const raw = sessionStorage.getItem('user_profile');
  let profile;
  try { profile = JSON.parse(raw); } catch { return; }

  // dev 패널은 기존 단일 API 사용 (Case A/B 시나리오 포함)
  await fetchAndRenderRecommendations(profile, getTestShoes());

  if (badge) badge.textContent = `완료: ${labels[mode] || '?'}`;
}

// ============================================================
// 메인 초기화
// ============================================================

async function init() {
  const profileRaw = sessionStorage.getItem('user_profile');
  if (!profileRaw) { location.href = 'index.html'; return; }

  let profile;
  try { profile = JSON.parse(profileRaw); }
  catch { location.href = 'index.html'; return; }

  initDevPanel();
  renderProfileSummary(profile);
  await runPhase1(profile);
}

// ============================================================
// Phase 1 — DB 스코어링 (오버레이 제거 후 카드 #1 즉시 표출)
// ============================================================

async function runPhase1(profile) {
  showLoading(true, '맞는 러닝화를 찾고 있어요...');

  let data;
  try {
    const res = await fetch(`${API_BASE}/api/recommend/quick`, {
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

  const recs = data.recommendations;
  currentRecommendations = [...recs];

  // 카드 #1 즉시 표출
  renderFirstCard(recs[0]);
  highlightCelebRef();
  document.getElementById('size-link-section').style.display = 'block';

  // Top1 양말 자동 표출
  const top1 = recs[0];
  if (top1?.main_color && top1?.goods_no) {
    requestAnimationFrame(() => {
      const inlineSection = document.getElementById(`inline-socks-${top1.goods_no}`);
      const iconBtn = document.getElementById(`sock-icon-${top1.goods_no}`);
      if (inlineSection) inlineSection.style.display = 'block';
      if (iconBtn) iconBtn.classList.add('active');
      fetchAndRenderSocks(top1);
    });
  }

  // Phase 2 시작 (백그라운드 — await 없음)
  runPhase2(profile, recs).catch((err) => {
    console.error('[Phase2] 미처리 오류:', err);
    showAiProgress(false);
  });
}

// ============================================================
// Phase 2 — AI 추천 이유 생성 (백그라운드, 비차단)
// ============================================================

async function runPhase2(profile, recs) {
  showAiProgress(true);

  let data;
  try {
    const res = await fetch(`${API_BASE}/api/recommend/ai-reasons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_profile: profile, candidates: recs }),
    });
    data = await res.json();
    if (!res.ok) throw new Error(data.message);
  } catch (err) {
    // AI 실패 — DB summary 텍스트로 카드별 개별 이유 표출 (동일 텍스트 반복 방지)
    showAiProgress(false);
    if (recs[0]?.summary) updateCardReason(recs[0].goods_no, recs[0].summary);
    for (let i = 1; i < recs.length; i++) {
      await delay(350);
      appendCard({ ...recs[i], reason: recs[i].summary || recs[i].reason }, i + 1);
    }
    finalizeCards(recs);
    return;
  }

  showAiProgress(false);

  // goods_no → AI reason 맵
  const reasonMap = {};
  (data.reasons || []).forEach((r) => { if (r.goods_no) reasonMap[r.goods_no] = r.reason; });

  // 카드 #1 reason 업데이트 (AI reason으로 fade 교체)
  const top1 = recs[0];
  if (reasonMap[top1.goods_no]) {
    updateCardReason(top1.goods_no, reasonMap[top1.goods_no]);
    currentRecommendations[0] = { ...top1, reason: reasonMap[top1.goods_no], is_fallback: false };
  }

  // 카드 #2~ 순차 등장 (350ms 간격)
  for (let i = 1; i < recs.length; i++) {
    await delay(350);
    const enriched = {
      ...recs[i],
      reason: reasonMap[recs[i].goods_no] || recs[i].reason,
      is_fallback: !reasonMap[recs[i].goods_no],
    };
    currentRecommendations[i] = enriched;
    appendCard(enriched, i + 1);
  }

  finalizeCards(recs);
}

// ============================================================
// 카드 렌더링 헬퍼
// ============================================================

/** Phase 1 완료 후 컨테이너를 초기화하고 카드 #1과 제목을 렌더 */
function renderFirstCard(rec) {
  const container = document.getElementById('results-container');
  if (!container) return;
  container.innerHTML = `
    <h2 class="section-title" id="results-title">🏆 최고 추천 러닝화</h2>
    ${renderRecommendationCard(rec, 1)}
  `;
}

/** Phase 2에서 카드를 AI writing bar 앞에 슬라이드-인으로 삽입 */
function appendCard(rec, rank) {
  const container = document.getElementById('results-container');
  if (!container) return;

  const wrapper = document.createElement('div');
  wrapper.innerHTML = renderRecommendationCard(rec, rank).trim();
  const card = wrapper.firstElementChild;
  if (!card) return;

  card.classList.add('rec-card--enter');

  const bar = document.getElementById('ai-writing-bar');
  if (bar && container.contains(bar)) {
    container.insertBefore(card, bar);
  } else {
    container.appendChild(card);
  }

  // 두 번의 rAF로 transition이 정상 발동되게 보장
  requestAnimationFrame(() => requestAnimationFrame(() => card.classList.add('rec-card--visible')));
}

/** 카드의 추천 이유 텍스트를 fade로 AI reason으로 교체 */
function updateCardReason(goodsNo, reason) {
  if (!reason) return;
  const card = document.querySelector(`.rec-card[data-goods-no="${goodsNo}"]`);
  if (!card) return;
  const el = card.querySelector('.rec-reason');
  if (!el) return;

  el.style.transition = 'opacity 0.3s ease';
  el.style.opacity = '0';
  setTimeout(() => {
    el.textContent = `💬 ${reason}`;
    el.style.opacity = '1';
    el.classList.add('rec-reason--updated');
  }, 320);
}

/** AI writing bar 표시/제거 (DOM 동적 삽입) */
function showAiProgress(on) {
  const container = document.getElementById('results-container');
  let bar = document.getElementById('ai-writing-bar');

  if (on) {
    if (!bar && container) {
      bar = document.createElement('div');
      bar.id = 'ai-writing-bar';
      bar.className = 'ai-writing-bar';
      bar.innerHTML = `
        <div class="ai-writing-spinner"></div>
        <span>AI가 추천 이유를 작성하고 있어요...</span>
      `;
      container.appendChild(bar);
    }
  } else {
    if (bar) bar.remove();
  }
}

/** 모든 카드 등장 완료 후 제목·비교 버튼 확정 */
function finalizeCards(recs) {
  const title = document.getElementById('results-title');
  if (title) title.textContent = `🏆 최고 추천 러닝화 TOP ${recs.length}`;

  if (currentRecommendations.length >= 2) {
    const btn = document.getElementById('compare-btn');
    if (btn) {
      btn.style.display = 'inline-block';
      btn.onclick = () => openCompareModal(currentRecommendations);
    }
  }
}

// ============================================================
// 기존 단일 API 호출 (devRetest 전용 — Case A/B 시나리오 지원)
// ============================================================

async function fetchAndRenderRecommendations(profile, testShoes = null) {
  // 이전 결과 초기화
  const container = document.getElementById('results-container');
  if (container) container.innerHTML = '';
  showAiProgress(false);

  showLoading(true, 'AI가 최적의 러닝화를 찾고 있어요...');

  const reqBody = { user_profile: profile };
  if (testShoes !== null) reqBody._test_shoes = testShoes;

  let data;
  try {
    const res = await fetch(`${API_BASE}/api/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqBody),
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
  highlightCelebRef();

}

// ============================================================
// 로딩 오버레이 토글
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
// 추천 결과 전체 렌더링 (devRetest 전용)
// ============================================================

function renderResults(recs) {
  const container = document.getElementById('results-container');
  if (!container) return;

  const goodMatches = recs.filter((r) => r.is_db_recommendation === false || r.match_score >= 30);
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

  const top1 = goodMatches[0];
  if (top1?.main_color && top1?.goods_no) {
    requestAnimationFrame(() => {
      const inlineSection = document.getElementById(`inline-socks-${top1.goods_no}`);
      const iconBtn = document.getElementById(`sock-icon-${top1.goods_no}`);
      if (inlineSection) inlineSection.style.display = 'block';
      if (iconBtn) iconBtn.classList.add('active');
      fetchAndRenderSocks(top1);
    });
  }

  document.getElementById('size-link-section').style.display = 'block';
}

// ============================================================
// 추천 카드 HTML 생성
// ============================================================

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

function renderRecommendationCard(shoe, rank) {
  const isKnowledgeBased = shoe.is_db_recommendation === false;
  const priceDisplay = isKnowledgeBased
    ? (shoe.price_estimate || '가격 미상')
    : `₩${Number(shoe.price || 0).toLocaleString()}`;
  const scoreDisplay = isKnowledgeBased ? 'AI 지식 기반' : `매칭 ${shoe.match_score}%`;
  const knowledgeBadge = isKnowledgeBased ? '<span class="badge badge-medium">AI 지식 기반 추천</span>' : '';

  const confidenceBadge = isKnowledgeBased ? '' : (shoe.confidence === 'high'
    ? '<span class="badge badge-high">신뢰도 높음</span>'
    : shoe.confidence === 'medium'
    ? '<span class="badge badge-medium">신뢰도 보통</span>'
    : '<span class="badge badge-low">신뢰도 낮음</span>');

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

  const hasSockFeature = !!(shoe.main_color && shoe.goods_no);
  const sockIconHtml = hasSockFeature ? `
    <button class="sock-icon-btn"
      id="sock-icon-${shoe.goods_no}"
      data-goods-no="${shoe.goods_no}"
      data-main-color="${(shoe.main_color || '').replace(/"/g, '&quot;')}"
      data-accent-color="${(shoe.accent_color || '').replace(/"/g, '&quot;')}"
      onclick="toggleSocksInCard(this)"
      title="양말 색상 추천">양말 색상 추천</button>` : '';

  const inlineSocksHtml = hasSockFeature ? `
    <div id="inline-socks-${shoe.goods_no}" class="inline-socks-section" style="display:none;">
      <div class="inline-socks-header">
        <h3>🧦 어울리는 양말 색상</h3>
        <p class="section-sub">신발 색상 기반 AI 추천</p>
      </div>
      <div id="socks-container-${shoe.goods_no}"></div>
      <div id="outfit-section-${shoe.goods_no}" class="inline-outfit-section" style="display:none;">
        <div class="inline-socks-header" style="margin-top:16px;">
          <h3>👕 러닝 코디 추천</h3>
          <p class="section-sub" id="outfit-sub-${shoe.goods_no}"></p>
        </div>
        <div id="outfit-container-${shoe.goods_no}"></div>
      </div>
    </div>` : '';

  return `
    <article class="rec-card rank-${rank}" data-goods-no="${shoe.goods_no || ''}">
      <div class="rec-rank">#${rank}</div>
      <div class="rec-body">
        <div class="rec-header">
          <div class="rec-header-text">
            <div class="rec-title-row">
              <h3>${shoe.brand} <span class="rec-name">${shoe.goods_name}</span></h3>
              <div class="rec-score">${scoreDisplay}</div>
            </div>
          </div>
          <div class="rec-thumbnail-wrap">
            <div class="rec-thumbnail">${thumbHtml}</div>
            ${sockIconHtml}
          </div>
        </div>
        <p class="rec-summary">${shoe.summary || ''}</p>
        ${knowledgeBadge}
        <div class="rec-tags">
          ${shoe.width ? `<span class="feature-tag">발볼 ${shoe.width}</span>` : ''}
          ${shoe.cushion ? `<span class="feature-tag">쿠션 ${shoe.cushion}/5</span>` : ''}
          ${shoe.weight ? `<span class="feature-tag">무게 ${shoe.weight}/5</span>` : ''}
          ${shoe.distance ? `<span class="feature-tag">${shoe.distance}</span>` : ''}
          ${confidenceBadge}
        </div>
        <div class="rec-ig-tags">${igTagsHtml}</div>
        <p class="rec-reason">💬 ${shoe.reason || ''}</p>
        <div class="rec-footer">
          <span class="rec-price">${priceDisplay}</span>
          ${shoe.url ? `<a href="${shoe.url}" target="_blank" class="btn-musinsa">무신사에서 보기 →</a>` : ''}
        </div>
        ${inlineSocksHtml}
      </div>
    </article>
  `;
}

// ============================================================
// 양말 색상 추천
// ============================================================

async function fetchAndRenderSocks(shoe) {
  const container = document.getElementById(`socks-container-${shoe.goods_no}`);
  if (!container) return;
  container.innerHTML = '<div class="socks-loading">양말 색상 분석 중...</div>';

  let data;
  try {
    const res = await fetch(`${API_BASE}/api/recommend/socks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goods_no: shoe.goods_no, main_color: shoe.main_color, accent_color: shoe.accent_color || '' }),
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
  const socksContainer = document.getElementById(`socks-container-${goodsNo}`);
  if (socksContainer) {
    socksContainer.querySelectorAll('.color-card').forEach((el) => el.classList.remove('selected'));
  }
  btnEl.classList.add('selected');
  selectedSockColor = sockColor;
  fetchAndRenderOutfit(goodsNo, mainColor, accentColor, sockColor);
}

// ============================================================
// 러닝 코디 추천
// ============================================================

async function fetchAndRenderOutfit(goodsNo, mainColor, accentColor, sockColor) {
  const section = document.getElementById(`outfit-section-${goodsNo}`);
  const container = document.getElementById(`outfit-container-${goodsNo}`);
  const sub = document.getElementById(`outfit-sub-${goodsNo}`);
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

async function toggleSocksInCard(btnEl) {
  const goodsNo = btnEl.dataset.goodsNo;
  const section = document.getElementById(`inline-socks-${goodsNo}`);
  if (!section) return;

  const isOpen = section.style.display !== 'none';
  if (isOpen) {
    section.style.display = 'none';
    btnEl.classList.remove('active');
    return;
  }

  section.style.display = 'block';
  btnEl.classList.add('active');

  const container = document.getElementById(`socks-container-${goodsNo}`);
  if (container?.querySelector('.socks-grid')) return;

  const shoe = currentRecommendations.find((s) => s.goods_no === goodsNo);
  if (shoe) await fetchAndRenderSocks(shoe);
}

function highlightCelebRef() {
  let ref;
  try {
    const raw = sessionStorage.getItem('celeb_ref');
    if (!raw) return;
    ref = JSON.parse(raw);
    sessionStorage.removeItem('celeb_ref');
  } catch { return; }

  if (!ref?.goods_no) return;

  const card = document.querySelector(`.rec-card[data-goods-no="${ref.goods_no}"]`);
  if (!card) return;

  const banner = document.createElement('div');
  banner.className = 'celeb-ref-banner';
  banner.innerHTML = `⭐ <strong>${ref.celeb_name}</strong>이(가) 실제 착용한 신발이에요 — ${ref.shoe_name}`;
  card.prepend(banner);
  card.classList.add('rec-card--celeb-ref');

  setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
}

init();
