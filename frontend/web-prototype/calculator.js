/**
 * 러닝화 교체 시기 계산기 로직 (Feature B)
 * calculator.html에서 사용
 */

const API_BASE = (window.location.protocol === 'file:' ||
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1')
  ? 'http://localhost:3000'
  : 'https://ai-evolution-team6-production.up.railway.app';

let allShoes = [];
let kmMode = 'weekly';

// ============================================================
// 초기화
// ============================================================

async function init() {
  fillYearOptions();
  await loadShoes();

  // localStorage에 저장된 마지막 추천 신발이 있으면 자동 선택
  try {
    const saved = localStorage.getItem('runfit_last_recommendation');
    if (saved) {
      const data = JSON.parse(saved);
      const sel = document.getElementById('shoe-select');
      if (sel && data.goods_no) {
        // 로드 완료 후 선택 (DOM 이벤트 기반이므로 timeout 필요)
        setTimeout(() => {
          for (const opt of sel.options) {
            if (opt.value === data.goods_no) {
              sel.value = data.goods_no;
              break;
            }
          }
        }, 100);
      }
    }
  } catch { /* 무시 */ }
}

function fillYearOptions() {
  const sel = document.getElementById('purchase-year');
  const currentYear = new Date().getFullYear();
  for (let y = currentYear; y >= currentYear - 5; y--) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = `${y}년`;
    sel.appendChild(opt);
  }
}

async function loadShoes() {
  try {
    const res = await fetch(`${API_BASE}/api/shoes`);
    const data = await res.json();
    if (data.status === 'success') {
      allShoes = data.shoes;
      populateShoeSelect(allShoes);
    } else {
      showShoeSelectError();
    }
  } catch (err) {
    showShoeSelectError();
  }
}

function populateShoeSelect(shoes) {
  const sel = document.getElementById('shoe-select');
  // 브랜드별로 그룹핑
  const byBrand = {};
  shoes.forEach((s) => {
    if (!byBrand[s.brand]) byBrand[s.brand] = [];
    byBrand[s.brand].push(s);
  });

  Object.entries(byBrand).sort(([a], [b]) => a.localeCompare(b)).forEach(([brand, items]) => {
    const group = document.createElement('optgroup');
    group.label = brand;
    items.forEach((s) => {
      const opt = document.createElement('option');
      opt.value = s.goods_no;
      opt.textContent = s.goods_name;
      opt.dataset.lifespanMin = s.lifespan_km_min;
      opt.dataset.lifespanMax = s.lifespan_km_max;
      opt.dataset.carbon = s.has_carbon_plate;
      group.appendChild(opt);
    });
    sel.appendChild(group);
  });
}

function showShoeSelectError() {
  const sel = document.getElementById('shoe-select');
  const opt = document.createElement('option');
  opt.value = '';
  opt.textContent = '⚠️ 신발 데이터를 불러올 수 없습니다';
  opt.disabled = true;
  sel.insertBefore(opt, sel.firstChild);
}

// ============================================================
// km 입력 모드 전환
// ============================================================

function setKmMode(mode) {
  kmMode = mode;
  document.getElementById('mode-weekly').classList.toggle('active', mode === 'weekly');
  document.getElementById('mode-total').classList.toggle('active', mode === 'total');
  document.getElementById('weekly-input').style.display = mode === 'weekly' ? 'flex' : 'none';
  document.getElementById('total-input').style.display  = mode === 'total'  ? 'flex' : 'none';
}

// ============================================================
// 유효성 검사
// ============================================================

function validate() {
  const errors = [];
  if (!document.getElementById('shoe-select').value) {
    errors.push('신발을 선택해 주세요.');
  }
  if (!document.getElementById('purchase-year').value || !document.getElementById('purchase-month').value) {
    errors.push('구매 연도와 월을 선택해 주세요.');
  }
  if (kmMode === 'weekly') {
    const v = Number(document.getElementById('weekly-km').value);
    if (!v || v <= 0) errors.push('주간 평균 거리를 입력해 주세요. (0km 초과)');
    if (v > 300) errors.push('주간 평균 거리는 300km 이하로 입력해 주세요.');
  } else {
    const v = Number(document.getElementById('total-km').value);
    if (v == null || v < 0) errors.push('총 누적 거리를 입력해 주세요. (0km 이상)');
  }
  return errors;
}

function showErrors(errors) {
  const el = document.getElementById('calc-errors');
  el.innerHTML = '<strong>입력 확인 필요</strong><ul>' +
    errors.map((e) => `<li>${e}</li>`).join('') + '</ul>';
  el.style.display = 'block';
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ============================================================
// 계산 실행
// ============================================================

async function calculate() {
  document.getElementById('calc-errors').style.display = 'none';

  const errors = validate();
  if (errors.length > 0) {
    showErrors(errors);
    return;
  }

  const btn = document.getElementById('calc-btn');
  btn.disabled = true;
  btn.textContent = '계산 중...';
  document.getElementById('loading-overlay').style.display = 'flex';

  const goods_no = document.getElementById('shoe-select').value;
  const year  = document.getElementById('purchase-year').value;
  const month = document.getElementById('purchase-month').value;
  const purchase_year_month = `${year}-${String(month).padStart(2, '0')}`;

  const body = { goods_no, purchase_year_month };
  if (kmMode === 'weekly') {
    body.weekly_km = Number(document.getElementById('weekly-km').value);
  } else {
    body.total_km = Number(document.getElementById('total-km').value);
  }

  let data;
  try {
    const res = await fetch(`${API_BASE}/api/shoes/lifespan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    data = await res.json();
    if (!res.ok) throw new Error(data.message || `서버 오류 (HTTP ${res.status})`);
  } catch (err) {
    document.getElementById('loading-overlay').style.display = 'none';
    btn.disabled = false;
    btn.textContent = '교체 시기 계산하기 →';
    showErrors([`계산 중 오류가 발생했습니다: ${err.message}`]);
    return;
  }

  document.getElementById('loading-overlay').style.display = 'none';
  btn.disabled = false;
  btn.textContent = '교체 시기 계산하기 →';

  if (data.status === 'success') {
    renderResult(data.result);

    // localStorage에 마지막 신발 저장 (홈 개인화 CTA용)
    try {
      const shoe = allShoes.find((s) => s.goods_no === goods_no);
      if (shoe) {
        const existing = JSON.parse(localStorage.getItem('runfit_last_recommendation') || '{}');
        localStorage.setItem('runfit_last_recommendation', JSON.stringify({
          ...existing,
          goods_no:       shoe.goods_no,
          goods_name:     shoe.goods_name,
          recommend_date: existing.recommend_date || new Date().toISOString(),
          weekly_km_avg:  body.weekly_km || Math.round((body.total_km || 0) / 26),
        }));
      }
    } catch { /* 무시 */ }
  } else {
    showErrors([data.message || '계산에 실패했습니다.']);
  }
}

// ============================================================
// 결과 렌더링
// ============================================================

function renderResult(r) {
  const STATUS_CONFIG = {
    good:         { icon: '✅', label: '양호',      cls: 'status-good',         fillCls: 'fill-good'        },
    caution:      { icon: '⚠️', label: '주의',      cls: 'status-caution',      fillCls: 'fill-caution'     },
    replace_soon: { icon: '🔴', label: '교체 권장', cls: 'status-replace_soon', fillCls: 'fill-replace_soon' },
    replace_now:  { icon: '🚨', label: '교체 필요', cls: 'status-replace_now',  fillCls: 'fill-replace_now' },
  };

  const cfg = STATUS_CONFIG[r.condition] || STATUS_CONFIG.good;
  const pct = Math.min(100, r.usage_percent);

  const carbonWarn = r.has_carbon_plate
    ? `<div class="carbon-warn">⚡ 카본 플레이트 신발은 일반 쿠션화보다 수명이 짧습니다 (300~500km). 쿠션 성능 저하를 더 빨리 체크하세요.</div>`
    : '';

  const replaceAction = (r.condition === 'replace_soon' || r.condition === 'replace_now')
    ? `<button class="btn-primary" style="width:100%;margin-bottom:10px;" onclick="location.href='index.html'">지금 바로 추천받기 →</button>`
    : '';

  document.getElementById('result-area').innerHTML = `
    <div class="result-card">
      <div class="result-shoe-name">${r.goods_name}</div>
      <div class="result-brand">${r.brand}</div>

      <div class="progress-wrap">
        <div class="progress-header">
          <span>사용률</span>
          <span><strong>${pct}%</strong></span>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill ${cfg.fillCls}" id="pbar" style="width:0%"></div>
        </div>
      </div>

      <span class="status-badge ${cfg.cls}">${cfg.icon} ${cfg.label}</span>

      <div class="result-message">${r.message}</div>

      ${carbonWarn}

      <div class="result-stats">
        <div class="rs-item">
          <div class="rs-val">${r.accumulated_km.toLocaleString()}km</div>
          <div class="rs-lbl">누적 주행</div>
        </div>
        <div class="rs-item">
          <div class="rs-val">${r.remaining_km > 0 ? r.remaining_km.toLocaleString() + 'km' : '초과'}</div>
          <div class="rs-lbl">잔여 수명</div>
        </div>
        <div class="rs-item">
          <div class="rs-val">${r.lifespan_min}~${r.lifespan_max}km</div>
          <div class="rs-lbl">권장 수명</div>
        </div>
      </div>

      ${replaceAction}
    </div>
  `;

  document.getElementById('result-area').style.display = 'block';
  document.getElementById('result-actions').style.display = 'flex';

  // 프로그레스 바 애니메이션
  setTimeout(() => {
    document.getElementById('pbar').style.width = `${pct}%`;
  }, 100);

  document.getElementById('result-area').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

init();
