/**
 * 셀럽 / 우승자 착용 신발 + 룩북 페이지 로직
 * celebs.html 전용 — GET /api/celebs, /api/celebs/:id, /api/race-winners 연동
 * v2.9: 룩북 패널 + SNS 링크 + Winners 룩북 + AI 진단 CTA
 */

const API_BASE = (window.location.protocol === 'file:' ||
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1')
  ? 'http://localhost:3000'
  : 'https://ai-evolution-team6-production.up.railway.app';

let allCelebs = [];
let allWinners = [];

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
  document.querySelectorAll('.filter-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.type === type);
  });
  closeLookbook();
  const filtered = type ? allCelebs.filter((c) => c.celeb_type === type) : allCelebs;
  renderCelebList(filtered);
}

const CELEB_TYPE_KO = { celeb: '셀럽', athlete: '운동선수', influencer: '인플루언서', youtuber: '유튜버' };

function renderCelebList(celebs) {
  const container = document.getElementById('celebs-list-container');
  if (celebs.length === 0) {
    container.innerHTML = '<p class="empty-msg">해당 유형의 셀럽 데이터가 없습니다.</p>'; return;
  }
  container.innerHTML = `
    <div class="celeb-grid">
      ${celebs.map((c) => `
        <button class="celeb-card" onclick="fetchCelebLookbook('${c.celeb_id}', this)">
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

// ============================================================
// 셀럽 룩북 패널
// ============================================================

async function fetchCelebLookbook(celebId, btnEl) {
  document.querySelectorAll('.celeb-card').forEach((el) => el.classList.remove('selected'));
  if (btnEl) btnEl.classList.add('selected');

  const panel = document.getElementById('celeb-lookbook-panel');
  panel.innerHTML = '<div class="socks-loading">룩북 정보를 불러오는 중...</div>';
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });

  try {
    const res = await fetch(`${API_BASE}/api/celebs/${celebId}`);
    const data = await res.json();
    if (!res.ok || data.status === 'error') throw new Error(data.message);
    renderLookbook(data.celeb, data.outfit || {}, data.shoes || [], { showSNS: true, showCTA: true });
  } catch (err) {
    panel.innerHTML = renderErrorState(err.message, `fetchCelebLookbook('${celebId}', document.querySelector('.celeb-card.selected'))`);
  }
}

function closeLookbook() {
  const panel = document.getElementById('celeb-lookbook-panel');
  if (panel) panel.innerHTML = '';
  document.querySelectorAll('.celeb-card').forEach((el) => el.classList.remove('selected'));
}

/**
 * 룩북 패널 렌더링 (셀럽/우승자 공용)
 * @param {object} celeb - { celeb_name, celeb_type, celeb_image_url, instagram_url?, youtube_url? }
 * @param {object} outfit - { thumbnail, top, bottom, socks, hat, sunglasses, etc }
 * @param {object[]} shoes - 착용 신발 배열
 * @param {object} options - { showSNS, showCTA, panelId }
 */
function renderLookbook(celeb, outfit, shoes, options) {
  const { showSNS = false, showCTA = false, panelId = 'celeb-lookbook-panel' } = options || {};
  const panel = document.getElementById(panelId);
  if (!panel) return;

  // 아이템 렌더 순서: 모자 → 선글라스 → 상의 → 하의 → 양말 → 기타
  const outfitItems = [
    { icon: '🧢', label: '모자',      value: outfit.hat },
    { icon: '🕶️', label: '선글라스', value: outfit.sunglasses },
    { icon: '👕', label: '상의',      value: outfit.top },
    { icon: '👖', label: '하의',      value: outfit.bottom },
    { icon: '🧦', label: '양말',      value: outfit.socks },
    { icon: '⌚', label: '기타',      value: outfit.etc },
  ].filter((item) => item.value && item.value.trim() !== '');

  // SNS 버튼 (URL 있을 때만)
  const snsButtons = !showSNS ? '' : [
    celeb.instagram_url ? `<a href="${celeb.instagram_url}" target="_blank" rel="noopener noreferrer" class="sns-btn sns-btn--instagram">📸 인스타그램</a>` : '',
    celeb.youtube_url   ? `<a href="${celeb.youtube_url}"   target="_blank" rel="noopener noreferrer" class="sns-btn sns-btn--youtube">▶ 유튜브</a>`      : '',
  ].filter(Boolean).join('');


  // 착용 신발 섹션
  const shoesHtml = shoes.length === 0
    ? '<p class="empty-msg" style="padding:16px 0;">착용 신발 데이터가 없습니다.</p>'
    : shoes.map((shoe) => {
        const thumbHtml = shoe.thumbnail
          ? `<img src="${shoe.thumbnail}" alt="${shoe.brand} ${shoe.goods_name}" class="rec-thumb-img"
               onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />
             <div class="rec-thumb-fallback" style="display:none">👟</div>`
          : `<div class="rec-thumb-fallback">👟</div>`;
        return `
        <article class="rec-card">
          <div class="rec-thumbnail">${thumbHtml}</div>
          <div class="rec-body">
            <div class="rec-header">
              <div class="rec-header-text">
                <h3>${shoe.brand ? shoe.brand + ' ' : ''}<span class="rec-name">${shoe.goods_name}</span></h3>
                ${shoe.price ? `<span class="rec-price">₩${Number(shoe.price).toLocaleString()}</span>` : ''}
              </div>
            </div>
            <div class="rec-footer" style="margin-top:12px;">
              ${shoe.source_url ? `<a href="${shoe.source_url}" target="_blank" rel="noopener noreferrer" class="btn-secondary" style="font-size:12px;">출처 보기</a>` : ''}
              ${shoe.url ? `<a href="${shoe.url}" target="_blank" rel="noopener noreferrer" class="btn-musinsa">무신사에서 보기 →</a>` : ''}
            </div>
          </div>
        </article>`;
      }).join('');

  // AI 진단 CTA
  const ctaHtml = !showCTA ? '' : `
    <div class="lookbook-cta-wrap">
      <a href="diagnosis.html" class="lookbook-cta-btn">🔍 내 발에도 맞는지 진단해보기 →</a>
    </div>`;

  panel.innerHTML = `
    <div class="lookbook-panel lookbook-panel--enter">
      <div class="lookbook-header">
        <button class="lookbook-close-btn" onclick="${panelId === 'celeb-lookbook-panel' ? 'closeLookbook()' : 'closeWinnerLookbook()'}" aria-label="닫기">← 닫기</button>
      </div>
      <div class="lookbook-celeb-header">
        <div class="celeb-avatar" style="width:44px;height:44px;flex-shrink:0;">
          ${celeb.celeb_image_url
            ? `<img src="${celeb.celeb_image_url}" alt="${celeb.celeb_name}" onerror="this.parentElement.innerHTML='👤'" />`
            : '<span class="celeb-avatar-placeholder" style="font-size:22px;">👤</span>'}
        </div>
        <div class="lookbook-celeb-info">
          <p class="lookbook-celeb-name">${celeb.celeb_name}</p>
          <p class="lookbook-celeb-type">${CELEB_TYPE_KO[celeb.celeb_type] || celeb.celeb_type || ''}</p>
        </div>
        ${snsButtons ? `<div class="lookbook-sns-wrap">${snsButtons}</div>` : ''}
      </div>

      ${outfitItems.length > 0 ? `
        <div class="lookbook-outfit-section">
          <h3 class="lookbook-section-title">코디 아이템</h3>
          <ul class="lookbook-outfit-list">
            ${outfitItems.map((item) => `
              <li class="lookbook-outfit-item">
                <span class="lookbook-outfit-icon">${item.icon}</span>
                <span class="lookbook-outfit-label">${item.label}</span>
                <span class="lookbook-outfit-value">${item.value}</span>
              </li>`).join('')}
          </ul>
        </div>` : ''}

      <div class="lookbook-shoes-section">
        <h3 class="lookbook-section-title">착용 신발</h3>
        ${shoesHtml}
      </div>

      ${ctaHtml}
    </div>`;

  // 진입 애니메이션 트리거
  requestAnimationFrame(() => {
    const lp = panel.querySelector('.lookbook-panel');
    if (lp) {
      lp.classList.remove('lookbook-panel--enter');
      lp.classList.add('lookbook-panel--visible');
    }
  });
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
  closeWinnerLookbook();
  renderWinnerList(filtered);
}

function closeWinnerLookbook() {
  document.querySelectorAll('.winner-expand.open').forEach((el) => {
    el.classList.remove('open');
    el.innerHTML = '';
  });
  document.querySelectorAll('.winner-card.selected').forEach((el) => el.classList.remove('selected'));
}

function renderWinnerList(winners) {
  const container = document.getElementById('winners-list-container');
  if (winners.length === 0) {
    container.innerHTML = '<p class="empty-msg">해당 조건의 우승자 데이터가 없습니다.</p>'; return;
  }
  container.innerHTML = `
    <div class="winner-list">
      ${winners.map((w, idx) => `
        <div class="winner-item">
          <button class="winner-card" data-idx="${idx}" onclick="toggleWinnerExpand(${idx}, this)">
            <div class="winner-info">
              <h3>${w.race_name} <span class="winner-year">${w.race_year}</span></h3>
              <p class="winner-name-row">${w.winner_name} · ${w.winner_nationality} · ${w.course_type === 'full' ? '풀코스' : '하프코스'}</p>
              ${w.result_time ? `<p class="winner-time">⏱ ${w.result_time}</p>` : ''}
            </div>
            <span class="winner-chevron">›</span>
          </button>
          <div class="winner-expand" id="winner-expand-${idx}"></div>
        </div>`).join('')}
    </div>`;
}

function toggleWinnerExpand(idx, btnEl) {
  const panel = document.getElementById(`winner-expand-${idx}`);
  const isOpen = panel.classList.contains('open');

  // 다른 열린 패널 모두 닫기
  closeWinnerLookbook();

  // 이미 열려 있던 항목이면 닫기만 하고 종료
  if (isOpen) return;

  // 선택 표시 및 패널 열기
  if (btnEl) btnEl.classList.add('selected');

  const winner = allWinners[idx];
  if (!winner) return;

  const shoes = winner.shoe
    ? [{ goods_name: winner.shoe.goods_name, brand: winner.shoe.brand, price: winner.shoe.price, url: winner.shoe.url, thumbnail: winner.shoe.thumbnail, source_url: winner.source_url || '' }]
    : winner.goods_no
      ? [{ goods_name: `착용 신발 No. ${winner.goods_no}`, brand: '', price: null, url: '', thumbnail: '', source_url: winner.source_url || '' }]
      : [];

  const outfitItems = [
    { icon: '🧢', label: '모자', value: winner.outfit_hat },
    { icon: '👕', label: '상의', value: winner.outfit_top },
    { icon: '👖', label: '하의', value: winner.outfit_bottom },
    { icon: '🧦', label: '양말', value: winner.outfit_socks },
    { icon: '⌚', label: '기타', value: winner.outfit_etc },
  ].filter((item) => item.value && item.value.trim() !== '');

  const shoesHtml = shoes.length === 0
    ? '<p class="empty-msg" style="padding:8px 0;">착용 신발 데이터가 없습니다.</p>'
    : shoes.map((shoe) => {
        const thumbHtml = shoe.thumbnail
          ? `<img src="${shoe.thumbnail}" alt="${shoe.brand} ${shoe.goods_name}" class="rec-thumb-img"
               onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />
             <div class="rec-thumb-fallback" style="display:none">👟</div>`
          : `<div class="rec-thumb-fallback">👟</div>`;
        return `
        <article class="rec-card">
          <div class="rec-thumbnail">${thumbHtml}</div>
          <div class="rec-body">
            <div class="rec-header-text">
              <h3>${shoe.brand ? shoe.brand + ' ' : ''}<span class="rec-name">${shoe.goods_name}</span></h3>
              ${shoe.price ? `<span class="rec-price">₩${Number(shoe.price).toLocaleString()}</span>` : ''}
            </div>
            <div class="rec-footer" style="margin-top:12px;">
              ${shoe.source_url ? `<a href="${shoe.source_url}" target="_blank" rel="noopener noreferrer" class="btn-secondary" style="font-size:12px;">출처 보기</a>` : ''}
              ${shoe.url ? `<a href="${shoe.url}" target="_blank" rel="noopener noreferrer" class="btn-musinsa">무신사에서 보기 →</a>` : ''}
            </div>
          </div>
        </article>`;
      }).join('');

  panel.innerHTML = `
    <div class="winner-expand-inner">
      ${outfitItems.length > 0 ? `
        <ul class="lookbook-outfit-list" style="margin-bottom:12px;">
          ${outfitItems.map((item) => `
            <li class="lookbook-outfit-item">
              <span class="lookbook-outfit-icon">${item.icon}</span>
              <span class="lookbook-outfit-label">${item.label}</span>
              <span class="lookbook-outfit-value">${item.value}</span>
            </li>`).join('')}
        </ul>` : ''}
      <div class="winner-shoes-section">
        <h4 class="winner-shoes-title">착용 신발</h4>
        ${shoesHtml}
      </div>
    </div>`;

  panel.classList.add('open');
  // 카드 바로 밑에 펼쳐지므로 카드가 화면 위쪽에 있도록 스크롤
  btnEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
