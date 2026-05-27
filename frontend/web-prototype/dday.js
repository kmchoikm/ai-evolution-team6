/**
 * D-Day 러닝화 컨디션 시뮬레이터 페이지 로직
 * dday.html 전용 — GET /api/races, GET /api/shoes, POST /api/shoes/dday-simulator 연동
 */

const API_BASE = (window.location.protocol === 'file:' ||
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1')
  ? 'http://localhost:3000'
  : 'https://ai-evolution-team6-production.up.railway.app';

let allRaces = [];
let allShoes = [];
let searchDebounceTimer = null;

// ============================================================
// 초기화
// ============================================================

async function init() {
  // 외부 클릭 시 드롭다운 닫기
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.autocomplete-wrap')) {
      document.getElementById('autocomplete-dropdown').style.display = 'none';
    }
  });

  // 폼 제출 이벤트
  document.getElementById('dday-form').addEventListener('submit', handleSubmit);

  // 데이터 병렬 로드
  await Promise.all([fetchRaces(), fetchAllShoes()]);
}

// ============================================================
// 대회 목록 로드
// ============================================================

async function fetchRaces() {
  const loading = document.getElementById('race-loading');
  const select = document.getElementById('race-select');

  try {
    const res = await fetch(`${API_BASE}/api/races`);
    const data = await res.json();

    if (!res.ok || !data.races) throw new Error(data.message || '대회 목록을 불러올 수 없습니다.');

    // race_date가 있는 대회만 필터링 (D-Day 계산 가능한 대회)
    allRaces = data.races.filter((r) => r.race_date);

    if (allRaces.length === 0) {
      loading.textContent = '⚠️ 일정이 등록된 대회가 없습니다. DB 업데이트가 필요합니다.';
      return;
    }

    // 대회 날짜 오름차순 정렬 후 드롭다운 구성
    allRaces.sort((a, b) => a.race_date.localeCompare(b.race_date));

    select.innerHTML = '<option value="">대회를 선택해 주세요</option>';
    allRaces.forEach((r) => {
      const dday = calcDaysUntil(r.race_date);
      const ddayStr = dday > 0 ? `D-${dday}` : '종료';
      const label = `[${ddayStr}] ${r.race_name} (${r.race_date} / ${r.course_type === 'full' ? '풀코스' : '하프'})`;
      const opt = document.createElement('option');
      opt.value = r.race_id;
      opt.textContent = label;
      if (dday <= 0) opt.disabled = true;
      select.appendChild(opt);
    });

    loading.style.display = 'none';
    select.style.display = 'block';
  } catch (err) {
    loading.textContent = `⚠️ 대회 목록 로드 실패: ${err.message}`;
  }
}

function calcDaysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

function handleRaceSelect() {
  const raceId = document.getElementById('race-select').value;
  const card = document.getElementById('race-info-card');
  if (!raceId) { card.style.display = 'none'; return; }

  const race = allRaces.find((r) => r.race_id === raceId);
  if (!race) return;

  const dday = calcDaysUntil(race.race_date);
  const courseLabel = race.course_type === 'full' ? '풀코스' : '하프';
  const diffLabel = ['', '★☆☆☆☆', '★★☆☆☆', '★★★☆☆', '★★★★☆', '★★★★★'][race.difficulty] || '';

  card.innerHTML = `
    <div class="race-info-row">
      <span class="race-info-badge">D-${dday}</span>
      <strong>${race.race_name}</strong>
    </div>
    <div class="race-info-meta">
      📅 ${race.race_date} &nbsp;|&nbsp;
      🏁 ${courseLabel} &nbsp;|&nbsp;
      🌡 ${race.avg_temp_celsius}℃ &nbsp;|&nbsp;
      난이도 ${diffLabel}
    </div>
    <p class="race-info-summary">${race.course_summary}</p>
    <p class="race-info-hint">💡 추천 포인트: ${race.shoe_priority_hint}</p>
  `;
  card.style.display = 'block';
}

// ============================================================
// 신발 목록 로드 (자동완성)
// ============================================================

async function fetchAllShoes() {
  try {
    const res = await fetch(`${API_BASE}/api/shoes`);
    const data = await res.json();
    if (res.ok && data.status === 'success') allShoes = data.shoes || [];
  } catch {
    // 자동완성 실패는 무시
  }
}

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

  dropdown.innerHTML = shoes.map((s) => {
    const lifespanInfo = s.lifespan_km_min && s.lifespan_km_max
      ? `<span class="ac-meta">${s.lifespan_km_min}~${s.lifespan_km_max}km</span>`
      : '';
    const carbonBadge = s.has_carbon_plate ? '<span class="ac-carbon">카본</span>' : '';
    return `
      <button type="button" class="autocomplete-item" onclick="selectShoe('${s.goods_no}', '${s.brand} ${s.goods_name}')">
        <span class="ac-brand">${s.brand}</span> ${s.goods_name}
        ${carbonBadge}${lifespanInfo}
      </button>`;
  }).join('');
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
// 폼 제출 / 유효성 검사
// ============================================================

async function handleSubmit(e) {
  e.preventDefault();

  const raceId = document.getElementById('race-select').value;
  const goodsNo = document.getElementById('selected-goods-no').value;
  const currentKm = document.getElementById('current-km').value;
  const weeklyKm = document.getElementById('weekly-km').value;

  const errors = [];
  if (!raceId) errors.push('출전 대회를 선택해 주세요.');
  if (!goodsNo) errors.push('사용 중인 신발을 선택해 주세요.');
  if (!currentKm || Number(currentKm) < 0) errors.push('현재 누적 주행 거리를 입력해 주세요.');
  if (!weeklyKm || Number(weeklyKm) <= 0) errors.push('주간 훈련 거리를 입력해 주세요.');

  if (errors.length > 0) {
    const errEl = document.getElementById('errors');
    errEl.innerHTML = '<ul>' + errors.map((e) => `<li>${e}</li>`).join('') + '</ul>';
    errEl.style.display = 'block';
    errEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  document.getElementById('errors').style.display = 'none';
  document.getElementById('result-container').innerHTML = '';

  const btn = document.getElementById('simulate-btn');
  btn.disabled = true;
  btn.textContent = '계산 중...';
  showLoading(true);

  try {
    const res = await fetch(`${API_BASE}/api/shoes/dday-simulator`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        goods_no: goodsNo,
        race_id: raceId,
        current_km: Number(currentKm),
        weekly_km: Number(weeklyKm),
      }),
    });
    const data = await res.json();
    showLoading(false);
    btn.disabled = false;
    btn.textContent = '시뮬레이션 시작 →';

    if (!res.ok || data.status !== 'success') {
      throw new Error(data.message || '시뮬레이션 중 오류가 발생했습니다.');
    }
    renderResult(data);
  } catch (err) {
    showLoading(false);
    btn.disabled = false;
    btn.textContent = '시뮬레이션 시작 →';
    document.getElementById('result-container').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <h2>시뮬레이션 오류</h2>
        <p>${err.message}</p>
      </div>`;
  }
}

// ============================================================
// 결과 렌더링
// ============================================================

const VERDICT_CONFIG = {
  ok: {
    icon: '✅',
    color: '#2e7d32',
    bg: '#e8f5e9',
    borderColor: '#00C4A5',
    label: '안전',
    desc: '현재 신발로 대회를 완주할 수 있어요',
  },
  replace_needed: {
    icon: '🔶',
    color: '#e65100',
    bg: '#fff3e0',
    borderColor: '#FF9500',
    label: '교체 필요',
    desc: '대회 전 신발 교체가 필요합니다',
  },
  replace_now: {
    icon: '🚨',
    color: '#c62828',
    bg: '#ffebee',
    borderColor: '#FF3B30',
    label: '즉시 교체',
    desc: '이미 수명의 80%를 초과했습니다',
  },
};

function formatDateKo(dateStr) {
  if (!dateStr) return '-';
  const [, m, d] = dateStr.split('-');
  return `${parseInt(m, 10)}월 ${parseInt(d, 10)}일`;
}

function renderResult(data) {
  const cfg = VERDICT_CONFIG[data.verdict] || VERDICT_CONFIG.ok;
  const raceDateKo = formatDateKo(data.race_date);
  const deadlineKo = formatDateKo(data.replace_deadline_date);
  const thresholdKo = data.threshold_reached_date ? formatDateKo(data.threshold_reached_date) : null;

  // 진행바: 현재 사용률
  const currentPct = Math.min(100, Math.round((data.current_km / data.lifespan_avg) * 100));
  const projectedPct = Math.min(100, data.projected_usage_pct);

  // 타임라인 시각화
  const timelineHtml = renderTimeline(data);

  const replaceSection = (data.verdict === 'replace_needed' || data.verdict === 'replace_now')
    ? `
      <div class="dday-alert-box">
        <div class="dday-alert-title">📌 교체 권장 기준일</div>
        <div class="dday-alert-date">${deadlineKo} <span class="dday-alert-sub">(대회 3주 전)</span></div>
        ${thresholdKo ? `<p class="dday-alert-note">80% 임계값 도달 예상: <strong>${thresholdKo}</strong> (${data.threshold_80pct_km}km)</p>` : ''}
        <a href="index.html" class="btn-submit btn-sm" style="display:block;text-align:center;text-decoration:none;margin-top:12px;">
          지금 새 러닝화 추천받기 →
        </a>
      </div>`
    : '';

  document.getElementById('result-container').innerHTML = `
    <div class="dday-result" style="border-top: 4px solid ${cfg.borderColor};">

      <!-- 판정 헤더 -->
      <div class="dday-verdict-header" style="background:${cfg.bg};">
        <span class="dday-verdict-icon">${cfg.icon}</span>
        <div>
          <div class="dday-verdict-label" style="color:${cfg.color};">${cfg.label}</div>
          <div class="dday-verdict-sub">${cfg.desc}</div>
        </div>
      </div>

      <!-- 대회/신발 요약 -->
      <div class="dday-summary-row">
        <div class="dday-summary-item">
          <span class="dday-summary-label">대회</span>
          <span class="dday-summary-value">${data.race_name}</span>
        </div>
        <div class="dday-summary-item">
          <span class="dday-summary-label">대회일</span>
          <span class="dday-summary-value">${raceDateKo} <small>(D-${data.days_until_race})</small></span>
        </div>
        <div class="dday-summary-item">
          <span class="dday-summary-label">신발</span>
          <span class="dday-summary-value">${data.brand} ${data.shoe_name}</span>
        </div>
      </div>

      <!-- 수명 예측 바 -->
      <div class="dday-lifespan-section">
        <div class="dday-lifespan-title">신발 수명 예측</div>
        <div class="dday-bar-wrap">
          <!-- 현재 위치 -->
          <div class="dday-bar-track">
            <div class="dday-bar-fill dday-bar-current" style="width:${currentPct}%;"></div>
            <div class="dday-bar-fill dday-bar-projected" style="width:${projectedPct}%;"></div>
            <div class="dday-bar-threshold" style="left:80%;"></div>
          </div>
          <div class="dday-bar-labels">
            <span>0km</span>
            <span class="dday-threshold-label">80%<br><small>${data.threshold_80pct_km}km</small></span>
            <span>${data.lifespan_km_max}km</span>
          </div>
        </div>
        <div class="dday-bar-legend">
          <span class="legend-dot legend-dot-current"></span> 현재 (${data.current_km}km · ${currentPct}%)
          &nbsp;&nbsp;
          <span class="legend-dot legend-dot-projected"></span> 대회 당일 예상 (${data.projected_km_on_race_day}km · ${projectedPct}%)
        </div>
      </div>

      <!-- 핵심 수치 -->
      <div class="dday-stats">
        <div class="dday-stat">
          <span class="stat-label">현재 누적</span>
          <span class="stat-value">${data.current_km.toLocaleString()}km</span>
        </div>
        <div class="dday-stat">
          <span class="stat-label">대회 당일 예상</span>
          <span class="stat-value">${data.projected_km_on_race_day.toLocaleString()}km</span>
        </div>
        <div class="dday-stat">
          <span class="stat-label">권장 수명</span>
          <span class="stat-value">${data.lifespan_km_min}~${data.lifespan_km_max}km</span>
        </div>
        <div class="dday-stat">
          <span class="stat-label">사용률 (대회일)</span>
          <span class="stat-value" style="color:${cfg.color};">${projectedPct}%</span>
        </div>
      </div>

      <!-- AI 메시지 -->
      <div class="dday-message">${data.message}</div>

      <!-- 교체 권장 박스 (교체 필요 시) -->
      ${replaceSection}

      <!-- 타임라인 -->
      <div class="dday-timeline-section">
        <div class="dday-section-title">📈 수명 소진 타임라인</div>
        ${timelineHtml}
      </div>

    </div>`;

  document.getElementById('result-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderTimeline(data) {
  if (!data.timeline || data.timeline.length === 0) return '';

  const threshold = data.threshold_80pct_km;
  const lifespanAvg = data.lifespan_avg;

  // 최대 8개 포인트로 샘플링
  const points = data.timeline;
  const step = Math.max(1, Math.floor(points.length / 8));
  const sampled = [];
  for (let i = 0; i < points.length; i += step) sampled.push(points[i]);
  if (sampled[sampled.length - 1] !== points[points.length - 1]) {
    sampled.push(points[points.length - 1]);
  }

  const bars = sampled.map((pt, idx) => {
    const pct = Math.min(100, pt.usage_pct);
    const isLast = idx === sampled.length - 1;
    const barColor = pct >= 100 ? '#c62828' : pct >= 80 ? '#e65100' : pct >= 50 ? '#f57c00' : '#00C4A5';
    const dateLabel = formatDateKo(pt.date);
    const raceMarker = isLast ? '🏁' : '';

    return `
      <div class="tl-item">
        <div class="tl-bar-wrap">
          <div class="tl-bar" style="height:${Math.max(4, pct)}%; background:${barColor};"></div>
          ${pt.km >= threshold && idx > 0 && sampled[idx - 1].km < threshold
            ? '<div class="tl-threshold-marker">⚠</div>' : ''}
        </div>
        <div class="tl-label">
          <div class="tl-pct">${pct}%</div>
          <div class="tl-km">${pt.km}km</div>
          <div class="tl-date">${raceMarker}${dateLabel}</div>
        </div>
      </div>`;
  }).join('');

  return `<div class="tl-container">${bars}</div>
    <div class="tl-legend">
      <span style="color:#00C4A5;">■</span> 안전 (0~50%)
      <span style="color:#f57c00;margin-left:8px;">■</span> 주의 (50~80%)
      <span style="color:#e65100;margin-left:8px;">■</span> 교체 권장 (80~100%)
      <span style="color:#c62828;margin-left:8px;">■</span> 교체 필수 (100%+)
    </div>`;
}

// ============================================================
// 공통 유틸
// ============================================================

function showLoading(on) {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.style.display = on ? 'flex' : 'none';
}

init();
