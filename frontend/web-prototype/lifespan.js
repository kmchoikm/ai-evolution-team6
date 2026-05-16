/**
 * 러닝화 교체 시기 계산기 페이지 로직
 * lifespan.html 전용 — GET /api/shoes(자동완성), POST /api/shoes/lifespan 연동
 */

const API_BASE = (window.location.protocol === 'file:' ||
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1')
  ? 'http://localhost:3000'
  : 'https://ai-evolution-team6-production.up.railway.app';

let allShoes = [];
let searchDebounceTimer = null;

// ============================================================
// 초기화
// ============================================================

function init() {
  // 라디오 선택 스타일
  document.querySelectorAll('.option-btn input').forEach((input) => {
    input.addEventListener('change', () => {
      const name = input.name;
      document.querySelectorAll(`.option-btn input[name="${name}"]`)
        .forEach((el) => el.closest('.option-btn').classList.remove('selected'));
      input.closest('.option-btn').classList.add('selected');
    });
  });

  // 년도 선택지 채우기
  const yearSelect = document.getElementById('purchase-year');
  const now = new Date();
  for (let y = now.getFullYear(); y >= now.getFullYear() - 10; y--) {
    yearSelect.innerHTML += `<option value="${y}">${y}년</option>`;
  }

  // 월 선택지 채우기
  const monthSelect = document.getElementById('purchase-month');
  for (let m = 1; m <= 12; m++) {
    monthSelect.innerHTML += `<option value="${String(m).padStart(2,'0')}">${m}월</option>`;
  }

  // 신발 목록 사전 로드 (자동완성용)
  fetchAllShoes();

  // 폼 제출
  document.getElementById('lifespan-form').addEventListener('submit', handleSubmit);

  // 외부 클릭 시 드롭다운 닫기
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.autocomplete-wrap')) {
      document.getElementById('autocomplete-dropdown').style.display = 'none';
    }
  });
}

// ============================================================
// 신발 목록 로드
// ============================================================

async function fetchAllShoes() {
  try {
    const res = await fetch(`${API_BASE}/api/shoes`);
    const data = await res.json();
    if (res.ok && data.status === 'success') allShoes = data.shoes || [];
  } catch {
    // 자동완성 실패는 무시 — 직접 입력으로 진행 가능
  }
}

// ============================================================
// 자동완성 드롭다운
// ============================================================

function handleShoeSearch() {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    const keyword = document.getElementById('shoe-search-input').value.trim().toLowerCase();
    if (!keyword) { document.getElementById('autocomplete-dropdown').style.display = 'none'; return; }

    const matched = allShoes.filter((s) =>
      s.goods_name?.toLowerCase().includes(keyword) || s.brand?.toLowerCase().includes(keyword)
    ).slice(0, 8);

    renderAutocomplete(matched);
  }, 200);
}

function renderAutocomplete(shoes) {
  const dropdown = document.getElementById('autocomplete-dropdown');
  if (shoes.length === 0) { dropdown.style.display = 'none'; return; }

  dropdown.innerHTML = shoes.map((s) => `
    <button type="button" class="autocomplete-item" onclick="selectShoe('${s.goods_no}', '${s.brand} ${s.goods_name}')">
      <span class="ac-brand">${s.brand}</span> ${s.goods_name}
    </button>`).join('');
  dropdown.style.display = 'block';
}

function selectShoe(goodsNo, label) {
  document.getElementById('selected-goods-no').value = goodsNo;
  document.getElementById('shoe-search-input').value = label;
  document.getElementById('autocomplete-dropdown').style.display = 'none';
  const labelEl = document.getElementById('selected-shoe-label');
  labelEl.textContent = `✓ 선택됨: ${label}`;
  labelEl.style.display = 'block';
}

// ============================================================
// km 입력 방식 전환
// ============================================================

function switchKmMode(mode) {
  document.getElementById('weekly-km-section').style.display = mode === 'weekly' ? 'block' : 'none';
  document.getElementById('total-km-section').style.display = mode === 'total' ? 'block' : 'none';
}

// ============================================================
// 폼 제출 / 유효성 검사
// ============================================================

async function handleSubmit(e) {
  e.preventDefault();

  const goodsNo = document.getElementById('selected-goods-no').value;
  const year = document.getElementById('purchase-year').value;
  const month = document.getElementById('purchase-month').value;
  const kmMode = document.querySelector('input[name="km-mode"]:checked')?.value;
  const weeklyKm = document.getElementById('weekly-km').value;
  const totalKm = document.getElementById('total-km').value;

  const errors = [];
  if (!goodsNo) errors.push('신발 모델을 선택해 주세요.');
  if (!year || !month) errors.push('구매 시점을 선택해 주세요.');
  if (!kmMode) errors.push('누적 거리 입력 방식을 선택해 주세요.');
  if (kmMode === 'weekly' && !weeklyKm) errors.push('주간 평균 거리를 입력해 주세요.');
  if (kmMode === 'total' && !totalKm) errors.push('총 누적 거리를 입력해 주세요.');

  if (errors.length > 0) {
    const errEl = document.getElementById('errors');
    errEl.innerHTML = '<ul>' + errors.map((e) => `<li>${e}</li>`).join('') + '</ul>';
    errEl.style.display = 'block';
    errEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  document.getElementById('errors').style.display = 'none';

  const btn = document.getElementById('calc-btn');
  btn.disabled = true; btn.textContent = '계산 중...';
  showLoading(true);

  const body = {
    goods_no: goodsNo,
    purchase_year_month: `${year}-${month}`,
    ...(kmMode === 'weekly' ? { weekly_km: Number(weeklyKm) } : { total_km: Number(totalKm) }),
  };

  try {
    const res = await fetch(`${API_BASE}/api/shoes/lifespan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    showLoading(false);
    btn.disabled = false; btn.textContent = '계산하기 →';

    if (!res.ok || data.status !== 'success') {
      throw new Error(data.message || '계산 중 오류가 발생했습니다.');
    }
    renderResult(data);
  } catch (err) {
    showLoading(false);
    btn.disabled = false; btn.textContent = '계산하기 →';
    document.getElementById('result-container').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <h2>계산 중 오류가 발생했습니다</h2>
        <p>${err.message}</p>
      </div>`;
  }
}

// ============================================================
// 결과 렌더링
// ============================================================

const VERDICT_STYLE = {
  good:                { icon: '✅', color: '#2e7d32', bg: '#e8f5e9', label: '양호' },
  caution:             { icon: '⚠️', color: '#f57c00', bg: '#fff8e1', label: '주의' },
  replace_recommended: { icon: '🔶', color: '#e65100', bg: '#fff3e0', label: '교체 권장' },
  replace_required:    { icon: '🚨', color: '#c62828', bg: '#ffebee', label: '교체 필수' },
};

function renderResult(data) {
  const style = VERDICT_STYLE[data.verdict] || VERDICT_STYLE.caution;
  const usageBar = Math.min(100, data.usage_rate);

  document.getElementById('result-container').innerHTML = `
    <div class="lifespan-result" style="border-left: 4px solid ${style.color}; background:${style.bg};">
      <div class="lifespan-result-header">
        <span class="lifespan-verdict-icon">${style.icon}</span>
        <div>
          <h2 class="lifespan-verdict-label" style="color:${style.color};">${style.label}</h2>
          <p class="lifespan-shoe-name">${data.brand} ${data.goods_name}</p>
        </div>
      </div>

      <div class="lifespan-bar-wrap">
        <div class="lifespan-bar-bg">
          <div class="lifespan-bar-fill" style="width:${usageBar}%; background:${style.color};"></div>
        </div>
        <span class="lifespan-bar-label">${data.usage_rate}% 사용</span>
      </div>

      <div class="lifespan-stats">
        <div class="lifespan-stat">
          <span class="stat-label">누적 주행</span>
          <span class="stat-value">${data.estimated_total_km.toLocaleString()} km</span>
        </div>
        <div class="lifespan-stat">
          <span class="stat-label">권장 수명</span>
          <span class="stat-value">${data.lifespan_km_min}~${data.lifespan_km_max} km</span>
        </div>
        <div class="lifespan-stat">
          <span class="stat-label">남은 수명</span>
          <span class="stat-value">${data.remaining_km > 0 ? data.remaining_km.toLocaleString() + ' km' : '초과'}</span>
        </div>
      </div>

      <p class="lifespan-message">${data.message}</p>

      ${data.verdict === 'replace_required' || data.verdict === 'replace_recommended'
        ? `<a href="diagnosis.html" class="btn-submit" style="display:block;text-align:center;text-decoration:none;margin-top:16px;">
             지금 바로 추천받기 →
           </a>`
        : ''}
    </div>`;

  document.getElementById('result-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ============================================================
// 공통 유틸
// ============================================================

function showLoading(on) {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.style.display = on ? 'flex' : 'none';
}

init();
