/**
 * 무신사 인기 러닝화 Top 5 위젯
 *
 * - 로딩: skeleton card 5개 (레이아웃 점프 방지)
 * - 에러: brief 메시지 — 무음 제거(display:none)는 레이아웃 버그처럼 보여 지양
 * - 전체 카드 <a> — 모바일 전체 영역 탭 가능
 * - window.API_BASE: index.html 인라인 스크립트에서 노출됨 (이 파일보다 먼저 실행)
 */

(function () {
  const LIST_ID = 'musinsa-ranking-list';

  // index.html에서 window.API_BASE가 노출되지 않은 경우를 위한 폴백
  function getApiBase() {
    if (window.API_BASE) return window.API_BASE;
    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:3000'
      : 'https://ai-evolution-team6-production.up.railway.app';
  }

  // 브랜드명 기반 해시로 아바타 배경색 결정
  function brandColor(brand) {
    const palette = ['#4A90D9', '#E57373', '#81C784', '#FFB74D', '#AB47BC', '#26C6DA'];
    const hash = [...(brand || '?')].reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return palette[hash % palette.length];
  }

  function renderSkeleton(list) {
    list.innerHTML = Array.from({ length: 5 })
      .map(
        () => `
      <div class="musinsa-card musinsa-skeleton" aria-hidden="true">
        <div class="musinsa-rank">&nbsp;</div>
        <div class="skeleton-box"></div>
        <div class="musinsa-card-info">
          <div class="skeleton-line" style="width:35%"></div>
          <div class="skeleton-line" style="width:70%"></div>
          <div class="skeleton-line" style="width:45%"></div>
        </div>
      </div>`
      )
      .join('');
  }

  function renderError(list) {
    list.innerHTML =
      '<p class="musinsa-error-msg">지금은 랭킹을 불러올 수 없어요.<br>잠시 후 다시 시도해 주세요.</p>';
  }

  function renderItems(list, items) {
    list.innerHTML = items
      .map((item) => {
        const initial = (item.brand || '?')[0];
        const avatarBg = brandColor(item.brand);
        const priceHtml = item.price
          ? `<span class="musinsa-price">₩${item.price.toLocaleString()}${
              item.discountRatio > 0 ? ` (${item.discountRatio}% 할인)` : ''
            }</span>`
          : '';

        return `
        <a href="${item.url}"
           target="_blank"
           rel="noopener noreferrer"
           class="musinsa-card"
           aria-label="${item.brand} ${item.name} — 무신사에서 보기">
          <div class="musinsa-rank">${item.rank}</div>
          <div class="musinsa-card-img-wrap">
            <img
              src="${item.thumbnail}"
              alt="${item.brand} ${item.name}"
              class="musinsa-card-img"
              loading="lazy"
              onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"
            />
            <div class="musinsa-avatar"
                 style="background:${avatarBg};display:none"
                 aria-hidden="true">${initial}</div>
          </div>
          <div class="musinsa-card-info">
            <span class="musinsa-brand">${item.brand}</span>
            <span class="musinsa-name">${item.name}</span>
            ${priceHtml}
          </div>
          <span class="musinsa-cta" aria-hidden="true">무신사 보기 →</span>
        </a>`;
      })
      .join('');
  }

  async function init() {
    const list = document.getElementById(LIST_ID);
    if (!list) return;

    renderSkeleton(list);

    try {
      const res = await fetch(`${getApiBase()}/api/musinsa/ranking?limit=5`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data.items) || data.items.length === 0) {
        throw new Error('빈 결과');
      }
      renderItems(list, data.items);
    } catch {
      renderError(list);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
