/**
 * 사이즈 핏 가이드 페이지 로직
 * size.html 전용 — GET /api/shoes(자동완성), POST /api/size/convert 연동
 */

const API_BASE = (window.location.protocol === 'file:' ||
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1')
  ? 'http://localhost:3000'
  : 'https://ai-evolution-team6-production.up.railway.app';

let allShoes = [];
let fromSearchTimer = null;
let toSearchTimer = null;

// ============================================================
// 초기화
// ============================================================

function init() {
  fetchAllShoes();
  document.getElementById('size-form').addEventListener('submit', handleSubmit);

  // 외부 클릭 시 드롭다운 닫기
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.autocomplete-wrap')) {
      document.querySelectorAll('.autocomplete-dropdown').forEach((d) => {
        d.style.display = 'none';
      });
    }
  });
}

// ============================================================
// 신발 목록 로드 (자동완성용)
// ============================================================

async function fetchAllShoes() {
  try {
    const res = await fetch(`${API_BASE}/api/shoes`);
    const data = await res.json();
    if (res.ok && data.status === 'success') allShoes = data.shoes || [];
  } catch {
    // 자동완성 실패는 무시 — 수동 입력으로 대체 가능
  }
}

// ============================================================
// 자동완성 — 현재 신발 (from)
// ============================================================

function handleFromSearch() {
  clearTimeout(fromSearchTimer);
  fromSearchTimer = setTimeout(() => {
    const keyword = document.getElementById('from-shoe-input').value.trim().toLowerCase();
    if (!keyword) { document.getElementById('from-autocomplete').style.display = 'none'; return; }
    const matched = allShoes.filter((s) =>
      s.goods_name?.toLowerCase().includes(keyword) || s.brand?.toLowerCase().includes(keyword)
    ).slice(0, 8);
    renderDropdown('from-autocomplete', matched, (s) => selectFrom(s));
  }, 200);
}

function selectFrom(shoe) {
  document.getElementById('from-brand').value = shoe.brand;
  document.getElementById('from-model').value = shoe.goods_name;
  document.getElementById('from-shoe-input').value = `${shoe.brand} ${shoe.goods_name}`;
  document.getElementById('from-autocomplete').style.display = 'none';
  const label = document.getElementById('from-selected-label');
  label.textContent = `✓ ${shoe.brand} ${shoe.goods_name}`;
  label.style.display = 'block';
}

// ============================================================
// 자동완성 — 변환할 신발 (to)
// ============================================================

function handleToSearch() {
  clearTimeout(toSearchTimer);
  toSearchTimer = setTimeout(() => {
    const keyword = document.getElementById('to-shoe-input').value.trim().toLowerCase();
    if (!keyword) { document.getElementById('to-autocomplete').style.display = 'none'; return; }
    const matched = allShoes.filter((s) =>
      s.goods_name?.toLowerCase().includes(keyword) || s.brand?.toLowerCase().includes(keyword)
    ).slice(0, 8);
    renderDropdown('to-autocomplete', matched, (s) => selectTo(s));
  }, 200);
}

function selectTo(shoe) {
  document.getElementById('to-brand').value = shoe.brand;
  document.getElementById('to-model').value = shoe.goods_name;
  document.getElementById('to-shoe-input').value = `${shoe.brand} ${shoe.goods_name}`;
  document.getElementById('to-autocomplete').style.display = 'none';
  const label = document.getElementById('to-selected-label');
  label.textContent = `✓ ${shoe.brand} ${shoe.goods_name}`;
  label.style.display = 'block';
}

// ============================================================
// 공통 드롭다운 렌더
// ============================================================

function renderDropdown(dropdownId, shoes, onSelect) {
  const dropdown = document.getElementById(dropdownId);
  if (shoes.length === 0) { dropdown.style.display = 'none'; return; }
  dropdown.innerHTML = shoes.map((s) => `
    <button type="button" class="autocomplete-item" onclick='(${onSelect.toString()})(${JSON.stringify(s)})'>
      <span class="ac-brand">${s.brand}</span> ${s.goods_name}
    </button>`).join('');
  dropdown.style.display = 'block';
}

// ============================================================
// 폼 제출
// ============================================================

async function handleSubmit(e) {
  e.preventDefault();

  const fromBrand = document.getElementById('from-brand').value || document.getElementById('from-shoe-input').value.trim();
  const fromModel = document.getElementById('from-model').value || '*';
  const fromSizeMm = document.getElementById('from-size-mm').value;
  const toBrand = document.getElementById('to-brand').value || document.getElementById('to-shoe-input').value.trim();
  const toModel = document.getElementById('to-model').value || '*';

  const errors = [];
  if (!fromBrand) errors.push('현재 신발 브랜드/모델을 입력해 주세요.');
  if (!fromSizeMm) errors.push('현재 사이즈(mm)를 입력해 주세요.');
  if (!toBrand) errors.push('변환할 신발 브랜드/모델을 입력해 주세요.');

  if (errors.length > 0) {
    const errEl = document.getElementById('errors');
    errEl.innerHTML = '<ul>' + errors.map((e) => `<li>${e}</li>`).join('') + '</ul>';
    errEl.style.display = 'block';
    errEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  document.getElementById('errors').style.display = 'none';
  const btn = document.getElementById('convert-btn');
  btn.disabled = true; btn.textContent = '계산 중...';
  showLoading(true);

  try {
    const res = await fetch(`${API_BASE}/api/size/convert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from_brand: fromBrand, from_model: fromModel,
        from_size_mm: Number(fromSizeMm),
        to_brand: toBrand, to_model: toModel,
      }),
    });
    const data = await res.json();
    showLoading(false);
    btn.disabled = false; btn.textContent = '변환하기 →';

    if (!res.ok || data.status !== 'success') throw new Error(data.message || '변환 중 오류가 발생했습니다.');
    renderResult(data, fromBrand, fromModel, fromSizeMm, toBrand, toModel);
  } catch (err) {
    showLoading(false);
    btn.disabled = false; btn.textContent = '변환하기 →';
    document.getElementById('result-container').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <h2>변환 중 오류가 발생했습니다</h2>
        <p>${err.message}</p>
      </div>`;
  }
}

// ============================================================
// 결과 렌더링
// ============================================================

const CONFIDENCE_STYLE = {
  high:   { label: '높음', color: '#2e7d32', bg: '#e8f5e9' },
  medium: { label: '보통', color: '#f57c00', bg: '#fff8e1' },
  low:    { label: '낮음', color: '#c62828', bg: '#ffebee' },
};

function renderResult(data, fromBrand, fromModel, fromSizeMm, toBrand, toModel) {
  const conf = CONFIDENCE_STYLE[data.confidence] || CONFIDENCE_STYLE.medium;
  document.getElementById('result-container').innerHTML = `
    <div class="size-result">
      <div class="size-result-from">
        <span class="size-arrow-label">${fromBrand}</span>
        <span class="size-mm">${fromSizeMm}mm</span>
      </div>
      <div class="size-arrow">→</div>
      <div class="size-result-to">
        <span class="size-arrow-label">${toBrand}</span>
        <span class="size-mm-recommended">${data.recommended_size_mm}mm</span>
      </div>
    </div>

    <div class="size-meta" style="border-left:4px solid ${conf.color}; background:${conf.bg};">
      <p class="size-confidence">데이터 신뢰도: <strong style="color:${conf.color};">${conf.label}</strong></p>
      ${data.fit_note ? `<p class="size-note">💡 ${data.fit_note}</p>` : ''}
      ${data.width_note ? `<p class="size-note">👣 ${data.width_note}</p>` : ''}
    </div>

    <div class="actions" style="margin-top:20px;">
      <button onclick="document.getElementById('size-form').reset(); document.getElementById('result-container').innerHTML=''; resetFields();" class="btn-secondary">
        다시 변환하기
      </button>
      <a href="diagnosis.html" class="btn-primary" style="text-decoration:none;">내 러닝화 추천받기</a>
    </div>`;

  document.getElementById('result-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetFields() {
  ['from-brand','from-model','from-shoe-input','to-brand','to-model','to-shoe-input'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  ['from-selected-label','to-selected-label'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
}

// ============================================================
// 공통 유틸
// ============================================================

function showLoading(on) {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.style.display = on ? 'flex' : 'none';
}

init();
